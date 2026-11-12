// State and side effects the main screen used to carry inline: the clock the house follows,
// who gets notifications, affection between the two, links shared into the app and taps on
// notifications. Each hook does one thing and owns its own effects.

import { useEffect, useState } from "react";
import { track } from "./usage";
import { supabase } from "./lib/supabase";
import { devicePushStatus } from "./push";
import type { PushStatus } from "./push";
import type { AffectionKind } from "./affections";
import type { Shared } from "./ShareSheet";
import { firstUrl } from "./share";
import type { HomePartner } from "./types";

// Calls one of the app's own endpoints as the signed-in person. Network failures are swallowed:
// these calls are bonuses (a notification, a page title) on top of what is already saved.
export async function callApi(path: string, init: RequestInit = {}) {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  try {
    return await fetch(path, { ...init, headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers, Authorization: `Bearer ${data.session.access_token}` } });
  } catch {
    return null;
  }
}

export async function notifyPartner(path: string, body: Record<string, string>) {
  await callApi(path, { method: "POST", body: JSON.stringify(body) });
}

export async function readLinkTitle(url: string) {
  const response = await callApi(`/api/link-preview?url=${encodeURIComponent(url)}`);
  return response?.ok ? await response.json() as { title: string | null; url: string } : null;
}

// The house follows the clock: who is at work, asleep or out changes without anyone touching the app.
export function useClock() {
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => { if (!document.hidden) setClock(Date.now()); };
    const timer = window.setInterval(tick, 60000);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, []);
  return clock;
}

// Who gets notifications: this phone, and the other one on any of theirs.
export function usePushStatus(coupleId: string | undefined, refresh: unknown) {
  const [myPush, setMyPush] = useState<PushStatus | null>(null);
  const [partnerHasPush, setPartnerHasPush] = useState<boolean | null>(null);
  useEffect(() => {
    if (!supabase || !coupleId) return;
    let active = true;
    void devicePushStatus().then((status) => { if (active) setMyPush(status); });
    void supabase.rpc("partner_has_push").then(({ data, error }) => { if (active) setPartnerHasPush(error ? null : Boolean(data)); });
    return () => { active = false; };
  }, [coupleId, refresh]);
  return { myPush, partnerHasPush };
}

// A kiss, hug or wave: the latest one this person hasn't seen, and sending one to the other.
export function useAffections(coupleId: string | undefined, mySlot: HomePartner | null, refresh: unknown) {
  const [incoming, setIncoming] = useState<{ id: string; kind: AffectionKind } | null>(null);
  useEffect(() => {
    if (!supabase || !coupleId || !mySlot) return;
    let active = true;
    void supabase.from("couple_affections").select("id, kind, created_at").eq("to_slot", mySlot).is("seen_at", null)
      .gte("created_at", new Date(Date.now() - 3 * 86400000).toISOString()).order("created_at", { ascending: false }).limit(1)
      .then(({ data }) => { if (active) setIncoming(((data ?? [])[0] as { id: string; kind: AffectionKind } | undefined) ?? null); });
    return () => { active = false; };
  }, [coupleId, mySlot, refresh]);

  async function send(kind: AffectionKind) {
    if (!supabase || !coupleId || !mySlot) return false;
    const { data, error } = await supabase.from("couple_affections").insert({ couple_id: coupleId, to_slot: mySlot === "partner_one" ? "partner_two" : "partner_one", kind }).select("id").single();
    if (error || !data) return false;
    track("affection:sent");
    // The notification is a bonus: if it fails, the other one still sees it when they open the app.
    void notifyPartner("/api/affection", { id: data.id as string });
    return true;
  }

  async function markSeen() {
    if (!supabase || !incoming) return;
    const id = incoming.id;
    setIncoming(null);
    await supabase.from("couple_affections").update({ seen_at: new Date().toISOString() }).eq("id", id);
  }

  return { incoming, send, markSeen };
}

// Something shared into the app from another one (Instagram, TikTok, WhatsApp, Maps): it arrives
// at /partilhar; it's kept in state and the address goes back to the house.
export function useSharedIntake() {
  const [shared, setShared] = useState<Shared | null>(() => {
    if (window.location.pathname.replace(/\/+$/, "") !== "/partilhar") return null;
    const params = new URLSearchParams(window.location.search);
    const value = { title: params.get("title"), text: params.get("text"), url: firstUrl(params.get("url"), params.get("text"), params.get("title")) };
    return value.url || value.text || value.title ? value : null;
  });
  useEffect(() => {
    if (window.location.pathname.replace(/\/+$/, "") === "/partilhar") window.history.replaceState(window.history.state, "", "/hoje");
  }, []);
  return [shared, setShared] as const;
}

// A notification tapped while the app is open: the service worker passes the address on, and the
// app goes there without reloading.
export function useNotificationTaps(onOpen: (url: string) => void) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | null;
      if (data?.type === "nossia-open" && typeof data.url === "string" && data.url.startsWith("/")) onOpen(data.url);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
