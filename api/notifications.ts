// Sends reminders to phones. A scheduled job calls this every hour with CRON_SECRET; a signed-in
// person can also call it to send themselves a test notification.

import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

declare const process: { env: Record<string, string | undefined> };

type PartnerSlot = "partner_one" | "partner_two";
type Category = "dates" | "commitments" | "nudges" | "special_dates";

export type Reminder = { key: string; category: Category; title: string; body: string; url: string };

export type ReminderInput = {
  userId: string;
  slot: PartnerSlot;
  couple: { partner_one_name: string; partner_two_name: string; partner_one_birth_date: string | null; partner_two_birth_date: string | null; relationship_date: string };
  dates: Array<{ id: string; title: string; planned_for: string; planned_start_time: string | null; location_name: string | null; created_by: string | null; created_at: string }>;
  commitments: Array<{ id: string; title: string; event_date: string; starts_at: string | null; for_partner: PartnerSlot | null; created_by: string | null; created_at: string }>;
  blocks: Array<{ weekday: number; starts_at: string; ends_at: string }>;
  trips?: Array<{ id: string; title: string; start_date: string; end_date: string }>;
};

const timeZone = "Europe/Lisbon";
const maxPerRun = 3;

// The wall clock in Lisbon, whatever time zone the server runs in.
export function lisbonClock(now: Date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now).map((part) => [part.type, part.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return { date, hour: Number(parts.hour), minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

function addDays(date: string, days: number) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000);
}

function minutesOf(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function weekdayLabel(date: string) {
  return new Intl.DateTimeFormat("pt-PT", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00Z`));
}

function nextYearly(date: string, today: string) {
  const year = Number(today.slice(0, 4));
  const thisYear = `${year}${date.slice(4)}`;
  return thisYear >= today ? thisYear : `${year + 1}${date.slice(4)}`;
}

// Free for at least two hours between 08:00 and 23:30, going by the weekly work schedule.
function hasFreeTime(blocks: ReminderInput["blocks"], date: string) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay() || 7;
  const previous = weekday === 1 ? 7 : weekday - 1;
  const busy = blocks.flatMap((block) => {
    const start = minutesOf(block.starts_at);
    const end = minutesOf(block.ends_at);
    if (end > start) return block.weekday === weekday ? [[start, end]] : [];
    return [...(block.weekday === weekday ? [[start, 1440]] : []), ...(block.weekday === previous ? [[0, end]] : [])];
  }).sort((first, second) => first[0] - second[0]);
  let cursor = 480;
  for (const [start, end] of busy) {
    if (Math.min(start, 1410) - cursor >= 120) return true;
    cursor = Math.max(cursor, end);
  }
  return 1410 - cursor >= 120;
}

// What this person should hear about right now. Keys make each reminder a one-off, so a job
// that runs late or twice only catches up.
export function remindersFor(input: ReminderInput, now: Date): Reminder[] {
  const { date: today, hour, minutes } = lisbonClock(now);
  const tomorrow = addDays(today, 1);
  const yesterday = addDays(today, -1);
  const reminders: Reminder[] = [];
  if (hour < 8 || hour >= 22) return reminders;
  const evening = hour >= 19;
  const morning = hour >= 10;
  const name = (slot: PartnerSlot) => slot === "partner_one" ? input.couple.partner_one_name : input.couple.partner_two_name;
  const otherSlot: PartnerSlot = input.slot === "partner_one" ? "partner_two" : "partner_one";
  const otherName = name(otherSlot);
  const at = (time: string | null) => time ? `às ${time.slice(0, 5)}` : "";
  const soon = (date: string, time: string | null) => {
    if (!time) return false;
    const until = daysBetween(today, date) * 1440 + minutesOf(time) - minutes;
    return until > 0 && until <= 120;
  };
  const recent = (createdAt: string) => now.getTime() - Date.parse(createdAt) < 86400000;

  for (const date of input.dates) {
    const details = [at(date.planned_start_time), date.location_name].filter(Boolean).join(" · ");
    if (soon(date.planned_for, date.planned_start_time)) reminders.push({ key: `date-soon:${date.id}:${date.planned_for}`, category: "dates", title: `Daqui a pouco: ${date.title}`, body: details, url: "/hoje" });
    if (date.planned_for === today && !date.planned_start_time && morning) reminders.push({ key: `date-today:${date.id}:${date.planned_for}`, category: "dates", title: "Hoje há date", body: date.title, url: "/hoje" });
    if (date.planned_for === tomorrow && evening) reminders.push({ key: `date-tomorrow:${date.id}:${date.planned_for}`, category: "dates", title: "Amanhã há date", body: [date.title, details].filter(Boolean).join(" · "), url: "/hoje" });
    if (date.planned_for === yesterday && morning) reminders.push({ key: `date-after:${date.id}:${date.planned_for}`, category: "dates", title: "Como foi o date?", body: `Marquem “${date.title}” como feito e guardem a memória.`, url: "/planned" });
    if (date.created_by && date.created_by !== input.userId && recent(date.created_at) && date.planned_for >= today) reminders.push({ key: `date-added:${date.id}`, category: "dates", title: `${otherName} marcou um date`, body: `${date.title}, ${weekdayLabel(date.planned_for)}`, url: "/planned" });
  }

  for (const commitment of input.commitments) {
    if (commitment.for_partner && commitment.for_partner !== input.slot) continue;
    if (soon(commitment.event_date, commitment.starts_at)) reminders.push({ key: `commitment-soon:${commitment.id}:${commitment.event_date}`, category: "commitments", title: `Daqui a pouco: ${commitment.title}`, body: at(commitment.starts_at), url: "/agenda" });
    if (commitment.event_date === today && !commitment.starts_at && morning) reminders.push({ key: `commitment-today:${commitment.id}:${commitment.event_date}`, category: "commitments", title: `Hoje: ${commitment.title}`, body: "Não se esqueçam.", url: "/agenda" });
    if (commitment.event_date === tomorrow && evening) reminders.push({ key: `commitment-tomorrow:${commitment.id}:${commitment.event_date}`, category: "commitments", title: `Amanhã: ${commitment.title}`, body: at(commitment.starts_at) || "Não se esqueçam.", url: "/agenda" });
    if (commitment.created_by && commitment.created_by !== input.userId && recent(commitment.created_at) && commitment.event_date >= today) reminders.push({ key: `commitment-added:${commitment.id}`, category: "commitments", title: `${otherName} acrescentou um compromisso`, body: `${commitment.title}, ${weekdayLabel(commitment.event_date)}`, url: "/agenda" });
  }

  // Thursday evening, if nothing is planned for the weekend and there is time for it.
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  if (weekday === 4 && hour >= 18) {
    const saturday = addDays(today, 2);
    const sunday = addDays(today, 3);
    const planned = input.dates.some((date) => date.planned_for === saturday || date.planned_for === sunday);
    const blocked = (date: string) => input.commitments.some((commitment) => commitment.event_date === date && !commitment.starts_at)
      || (input.trips ?? []).some((trip) => trip.start_date <= date && trip.end_date >= date);
    const freeDay = [saturday, sunday].find((date) => hasFreeTime(input.blocks, date) && !blocked(date));
    if (!planned && freeDay) reminders.push({ key: `nudge:${saturday}`, category: "nudges", title: "Ainda não há nada marcado para o fim de semana", body: `${freeDay === saturday ? "Sábado" : "Domingo"} estão livres. Vejam a sugestão da Nossia.`, url: "/hoje" });
  }

  if (morning) {
    for (const trip of input.trips ?? []) {
      if (trip.end_date === yesterday) reminders.push({ key: `trip-after:${trip.id}`, category: "dates", title: `Como foi a viagem a ${trip.title}?`, body: "Juntem as fotografias e guardem a memória.", url: "/mapa-mundo" });
      const until = daysBetween(today, trip.start_date);
      if (until === 7 || until === 1) reminders.push({ key: `trip:${trip.id}:${trip.start_date}:${until}`, category: "dates", title: until === 1 ? `Amanhã: viagem a ${trip.title}` : `Falta uma semana para ${trip.title}`, body: "Vejam o plano da viagem.", url: "/viagens" });
    }
    const anniversary = nextYearly(input.couple.relationship_date, today);
    const untilAnniversary = daysBetween(today, anniversary);
    if (untilAnniversary === 7 || untilAnniversary === 1) reminders.push({ key: `anniversary:${anniversary}:${untilAnniversary}`, category: "special_dates", title: untilAnniversary === 1 ? "O aniversário de namoro é amanhã" : "Falta uma semana para o aniversário de namoro", body: "Já têm alguma coisa planeada?", url: "/hoje" });
    // Only the other partner: nobody needs reminding of their own birthday.
    const birthDate = otherSlot === "partner_one" ? input.couple.partner_one_birth_date : input.couple.partner_two_birth_date;
    if (birthDate) {
      const birthday = nextYearly(birthDate, today);
      const untilBirthday = daysBetween(today, birthday);
      if (untilBirthday === 7 || untilBirthday === 1) reminders.push({ key: `birthday:${birthday}:${untilBirthday}`, category: "special_dates", title: untilBirthday === 1 ? `Os anos de ${otherName} são amanhã` : `Falta uma semana para os anos de ${otherName}`, body: "Já tens tudo preparado?", url: "/hoje" });
    }
  }

  return reminders;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

function sameSecret(given: string, expected: string) {
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(given), hash(expected));
}

type PushDevice = { endpoint: string; user_id: string; p256dh: string; auth: string };

export async function POST(request: Request) {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey = process.env.VITE_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const cronSecret = process.env.CRON_SECRET;
  if (!supabaseUrl || !anonKey || !serviceKey || !publicKey || !privateKey || !cronSecret) return json({ error: "not_configured" }, 503);

  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const token = authorization.slice(7);
  const scheduled = sameSecret(token, cronSecret);

  let testUserId: string | null = null;
  if (!scheduled) {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authorization } });
    if (!response.ok) return json({ error: "unauthorized" }, 401);
    testUserId = (await response.json() as { id: string }).id;
  }

  webpush.setVapidDetails("https://nossia.vercel.app", publicKey, privateKey);
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const failures: string[] = [];

  async function send(devices: PushDevice[], payload: Pick<Reminder, "title" | "body" | "url"> & { tag: string }) {
    let delivered = 0;
    await Promise.all(devices.map(async (device) => {
      try {
        await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, JSON.stringify(payload), { TTL: 6 * 3600 });
        delivered += 1;
      } catch (caught) {
        const statusCode = (caught as { statusCode?: number }).statusCode;
        // The phone uninstalled the app or turned notifications off.
        if (statusCode === 404 || statusCode === 410) await db.from("push_subscriptions").delete().eq("endpoint", device.endpoint);
        else failures.push(String(statusCode ?? "error"));
      }
    }));
    return delivered;
  }

  if (testUserId) {
    const { data, error } = await db.from("push_subscriptions").select("*").eq("user_id", testUserId);
    if (error) return json({ error: error.message }, 500);
    const delivered = await send((data ?? []) as PushDevice[], { title: "As notificações estão ligadas", body: "É assim que a Nossia vos vai lembrar dos dates.", url: "/hoje", tag: "test" });
    return json({ delivered, failures });
  }

  const now = new Date();
  const today = lisbonClock(now).date;
  const { data: deviceRows, error: devicesError } = await db.from("push_subscriptions").select("*");
  if (devicesError) return json({ error: devicesError.message }, 500);
  const devices = (deviceRows ?? []) as PushDevice[];
  const userIds = [...new Set(devices.map((device) => device.user_id))];
  if (userIds.length === 0) return json({ users: 0, sent: 0, failures });

  const { data: members, error: membersError } = await db.from("couple_members").select("couple_id, user_id, partner_slot").in("user_id", userIds);
  if (membersError) return json({ error: membersError.message }, 500);
  const coupleIds = [...new Set((members ?? []).map((member) => member.couple_id as string))];
  const dateFloor = addDays(today, -1);
  const [couples, dates, commitments, blocks, settings, trips] = await Promise.all([
    db.from("couples").select("*").in("id", coupleIds),
    db.from("couple_dates").select("id, couple_id, planned_for, planned_start_time, location_name, created_by, created_at, ideas(title)").in("couple_id", coupleIds).eq("status", "planned").gte("planned_for", dateFloor),
    db.from("couple_commitments").select("*").in("couple_id", coupleIds).gte("event_date", today),
    db.from("work_schedule_blocks").select("*").in("couple_id", coupleIds),
    db.from("notification_settings").select("*").in("user_id", userIds),
    db.from("couple_trips").select("*").in("couple_id", coupleIds).gte("end_date", dateFloor),
  ]);
  const loadError = couples.error ?? dates.error ?? commitments.error ?? blocks.error ?? settings.error ?? trips.error;
  if (loadError) return json({ error: loadError.message }, 500);

  let sent = 0;
  for (const member of members ?? []) {
    const couple = couples.data?.find((item) => item.id === member.couple_id);
    if (!couple) continue;
    const preferences = settings.data?.find((item) => item.user_id === member.user_id);
    const due = remindersFor({
      userId: member.user_id,
      slot: member.partner_slot as PartnerSlot,
      couple,
      dates: (dates.data ?? []).filter((date) => date.couple_id === member.couple_id).map((date) => {
        const idea = date.ideas as unknown as { title: string } | { title: string }[] | null;
        return { ...date, title: (Array.isArray(idea) ? idea[0]?.title : idea?.title) ?? "Date" } as ReminderInput["dates"][number];
      }),
      commitments: (commitments.data ?? []).filter((commitment) => commitment.couple_id === member.couple_id) as ReminderInput["commitments"],
      blocks: (blocks.data ?? []).filter((block) => block.couple_id === member.couple_id) as ReminderInput["blocks"],
      trips: (trips.data ?? []).filter((trip) => trip.couple_id === member.couple_id) as ReminderInput["trips"],
    }, now).filter((reminder) => preferences?.[reminder.category] ?? true);

    let sentToUser = 0;
    for (const reminder of due) {
      if (sentToUser >= maxPerRun) break;
      // Claim the key first, so two overlapping runs can't both send it.
      const { data: claimed, error: claimError } = await db.from("notification_log")
        .upsert({ user_id: member.user_id, key: reminder.key }, { onConflict: "user_id,key", ignoreDuplicates: true })
        .select("key");
      if (claimError) {
        failures.push(claimError.message);
        continue;
      }
      if (!claimed?.length) continue;
      const delivered = await send(devices.filter((device) => device.user_id === member.user_id), { title: reminder.title, body: reminder.body, url: reminder.url, tag: reminder.key });
      if (delivered === 0) {
        // Nothing reached a phone, so give the claim back and try again on the next run.
        await db.from("notification_log").delete().eq("user_id", member.user_id).eq("key", reminder.key);
        continue;
      }
      sent += delivered;
      sentToUser += 1;
    }
  }

  await db.from("notification_log").delete().lt("sent_at", new Date(now.getTime() - 90 * 86400000).toISOString());
  return json({ users: userIds.length, sent, failures });
}
