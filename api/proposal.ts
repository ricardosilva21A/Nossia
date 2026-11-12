// Tells the other one about a date: proposed, moved to another day, or accepted.
// The app saves the change itself (RLS checks it); this only sends the notification, once per change.

import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { proposalMessage } from "../src/proposals.js";
import type { ProposalEvent } from "../src/proposals.js";

declare const process: { env: Record<string, string | undefined> };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

type PushDevice = { endpoint: string; user_id: string; p256dh: string; auth: string };
const events: ProposalEvent[] = ["proposed", "moved", "accepted"];

export async function POST(request: Request) {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey = process.env.VITE_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!supabaseUrl || !anonKey || !serviceKey || !publicKey || !privateKey) return json({ error: "not_configured" }, 503);

  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const who = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authorization } });
  if (!who.ok) return json({ error: "unauthorized" }, 401);
  const userId = (await who.json() as { id: string }).id;

  const body = await request.json().catch(() => null) as { id?: unknown; event?: unknown } | null;
  const event = events.find((item) => item === body?.event);
  if (typeof body?.id !== "string" || !event) return json({ error: "bad_request" }, 400);

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: date } = await db.from("couple_dates").select("id, couple_id, status, planned_for, planned_start_time, proposal, proposed_by, ideas(title)").eq("id", body.id).maybeSingle();
  if (!date || date.status !== "planned" || !date.planned_for) return json({ error: "not_found" }, 404);

  const { data: members } = await db.from("couple_members").select("user_id, partner_slot").eq("couple_id", date.couple_id);
  const sender = members?.find((member) => member.user_id === userId);
  const recipient = members?.find((member) => member.user_id !== userId);
  if (!sender) return json({ error: "not_found" }, 404);
  if (!recipient) return json({ sent: 0 });

  // The date has to be in the state the event claims, so nobody can send a made-up one.
  const fits = event === "accepted" ? date.proposal === "confirmed" : date.proposal === "proposed" && date.proposed_by === userId;
  if (!fits) return json({ sent: 0 });

  const { data: settings } = await db.from("notification_settings").select("dates").eq("user_id", recipient.user_id).maybeSingle();
  if (settings && settings.dates === false) return json({ sent: 0 });

  // One notification per change; claimed before sending so a second call can't repeat it.
  const key = `proposal:${date.id}:${event}:${date.planned_for}:${date.planned_start_time ?? ""}`;
  const { data: claimed } = await db.from("notification_log").upsert({ user_id: recipient.user_id, key }, { onConflict: "user_id,key", ignoreDuplicates: true }).select("key");
  if (!claimed?.length) return json({ sent: 0 });
  // The hourly job would otherwise also say "marcou um date" about the same one.
  if (event === "proposed") await db.from("notification_log").upsert({ user_id: recipient.user_id, key: `date-added:${date.id}` }, { onConflict: "user_id,key", ignoreDuplicates: true });

  const { data: couple } = await db.from("couples").select("partner_one_name, partner_two_name").eq("id", date.couple_id).single();
  const name = sender.partner_slot === "partner_one" ? couple?.partner_one_name : couple?.partner_two_name;
  const idea = date.ideas as unknown as { title: string } | { title: string }[] | null;
  const title = (Array.isArray(idea) ? idea[0]?.title : idea?.title) ?? "Date";
  const message = proposalMessage(event, name ?? "O teu par", title, date.planned_for, date.planned_start_time);

  const { data: devices } = await db.from("push_subscriptions").select("*").eq("user_id", recipient.user_id);
  webpush.setVapidDetails("https://nossia.vercel.app", publicKey, privateKey);
  let sent = 0;
  await Promise.all(((devices ?? []) as PushDevice[]).map(async (device) => {
    try {
      await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, JSON.stringify({ ...message, url: "/hoje", tag: `proposal-${date.id}` }), { TTL: 12 * 3600 });
      sent += 1;
    } catch (caught) {
      const statusCode = (caught as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) await db.from("push_subscriptions").delete().eq("endpoint", device.endpoint);
    }
  }));
  return json({ sent });
}
