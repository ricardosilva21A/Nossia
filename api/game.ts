// Tells the other one that this person just answered a game question: "your turn" when they
// haven't answered it yet, "see if you got it right" when they have. The app saves the answer
// itself (RLS checks it); this only sends the notification, once per question, a few a day.

import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { promptFor, questionById } from "../src/games.js";

declare const process: { env: Record<string, string | undefined> };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

type PushDevice = { endpoint: string; p256dh: string; auth: string };

const dailyLimit = 3;

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

  const body = await request.json().catch(() => null) as { question_id?: unknown } | null;
  const question = typeof body?.question_id === "string" ? questionById(body.question_id) : null;
  if (!question) return json({ error: "bad_request" }, 400);

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: mine } = await db.from("game_answers").select("id, couple_id, created_at, pushed_at").eq("user_id", userId).eq("question_id", question.id);
  const fresh = (mine ?? []).filter((row) => !row.pushed_at && Date.now() - Date.parse(row.created_at) < 5 * 60000);
  if (!fresh.length) return json({ sent: 0 });
  const coupleId = fresh[0].couple_id as string;

  // A few a day at most: the games shouldn't turn into a stream of notifications.
  const { count } = await db.from("game_answers").select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("role", "self").gte("pushed_at", new Date(Date.now() - 20 * 3600000).toISOString());
  if ((count ?? 0) >= dailyLimit) return json({ sent: 0, limited: true });

  // Claim it first, so a second call can't send it again.
  const { data: claimed } = await db.from("game_answers").update({ pushed_at: new Date().toISOString() }).in("id", fresh.map((row) => row.id)).is("pushed_at", null).select("id");
  if (!claimed?.length) return json({ sent: 0 });

  const [{ data: couple }, { data: members }, { data: theirs }] = await Promise.all([
    db.from("couples").select("partner_one_name, partner_two_name").eq("id", coupleId).single(),
    db.from("couple_members").select("user_id, partner_slot").eq("couple_id", coupleId),
    db.from("game_answers").select("id").eq("couple_id", coupleId).eq("question_id", question.id).neq("user_id", userId).limit(1),
  ]);
  const sender = members?.find((member) => member.user_id === userId);
  const recipient = members?.find((member) => member.user_id !== userId);
  if (!couple || !sender || !recipient) return json({ sent: 0 });

  const { data: settings } = await db.from("notification_settings").select("games").eq("user_id", recipient.user_id).maybeSingle();
  if (settings && settings.games === false) return json({ sent: 0 });

  const name = sender.partner_slot === "partner_one" ? couple.partner_one_name : couple.partner_two_name;
  const answered = Boolean(theirs?.length);
  const title = answered
    ? (question.kind === "know" ? `👀 ${name} respondeu: vê se acertaste` : `👀 ${name} respondeu: vê as respostas`)
    : `🎲 ${name} respondeu a um jogo: é a tua vez`;
  const prompt = question.kind === "know" ? promptFor(question, "guess", name) : promptFor(question);

  const { data: devices } = await db.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", recipient.user_id);
  webpush.setVapidDetails("https://nossia.vercel.app", publicKey, privateKey);
  let sent = 0;
  await Promise.all(((devices ?? []) as PushDevice[]).map(async (device) => {
    try {
      await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, JSON.stringify({ title, body: prompt, url: `/hoje?jogo=${question.id}`, tag: `game-${question.id}` }), { TTL: 6 * 3600 });
      sent += 1;
    } catch (caught) {
      const statusCode = (caught as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) await db.from("push_subscriptions").delete().eq("endpoint", device.endpoint);
    }
  }));
  return json({ sent });
}
