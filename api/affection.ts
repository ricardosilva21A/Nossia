// Tells the other person's phone that they got a kiss, a hug or a wave. The app saves the
// affection itself (RLS checks it); this only sends the notification for a fresh one, once.

import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { affectionMessage, isAffectionKind } from "../src/affections.js";

declare const process: { env: Record<string, string | undefined> };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

type PushDevice = { endpoint: string; user_id: string; p256dh: string; auth: string };

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

  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  if (typeof body?.id !== "string") return json({ error: "bad_request" }, 400);

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: affection } = await db.from("couple_affections").select("*").eq("id", body.id).maybeSingle();
  if (!affection || affection.from_user !== userId || !isAffectionKind(affection.kind)) return json({ error: "not_found" }, 404);
  if (affection.pushed_at || Date.now() - Date.parse(affection.created_at) > 5 * 60000) return json({ sent: 0 });

  // A burst of taps shouldn't become a burst of notifications.
  const { count } = await db.from("couple_affections").select("id", { count: "exact", head: true })
    .eq("from_user", userId).gte("pushed_at", new Date(Date.now() - 10 * 60000).toISOString());
  if ((count ?? 0) >= 5) return json({ sent: 0, limited: true });

  // Claim it first, so a second call can't send it again.
  const { data: claimed } = await db.from("couple_affections").update({ pushed_at: new Date().toISOString() }).eq("id", affection.id).is("pushed_at", null).select("id");
  if (!claimed?.length) return json({ sent: 0 });

  const [{ data: couple }, { data: members }] = await Promise.all([
    db.from("couples").select("partner_one_name, partner_two_name").eq("id", affection.couple_id).single(),
    db.from("couple_members").select("user_id, partner_slot").eq("couple_id", affection.couple_id),
  ]);
  const sender = members?.find((member) => member.user_id === userId);
  const recipient = members?.find((member) => member.partner_slot === affection.to_slot);
  if (!couple || !sender || !recipient || recipient.user_id === userId) return json({ sent: 0 });

  const { data: settings } = await db.from("notification_settings").select("affection").eq("user_id", recipient.user_id).maybeSingle();
  if (settings && settings.affection === false) return json({ sent: 0 });

  const name = sender.partner_slot === "partner_one" ? couple.partner_one_name : couple.partner_two_name;
  const message = affectionMessage(affection.kind, name);
  const { data: devices } = await db.from("push_subscriptions").select("*").eq("user_id", recipient.user_id);
  webpush.setVapidDetails("https://nossia.vercel.app", publicKey, privateKey);
  let sent = 0;
  await Promise.all(((devices ?? []) as PushDevice[]).map(async (device) => {
    try {
      await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, JSON.stringify({ title: `${message.emoji} ${message.text}`, body: "Toca para responder.", url: "/hoje", tag: `affection-${affection.id}` }), { TTL: 3600 });
      sent += 1;
    } catch (caught) {
      const statusCode = (caught as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) await db.from("push_subscriptions").delete().eq("endpoint", device.endpoint);
    }
  }));
  return json({ sent });
}
