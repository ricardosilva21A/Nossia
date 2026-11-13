// Decides what the couple's house shows right now. It knows nothing about drawing, so the same
// answer can drive a placeholder, layered images or a Rive state machine.

import { isSeasonActive } from "./seasons";
import type { CoupleCommitment, CoupleDate, HomePartner, WorkScheduleBlock } from "./types";
import type { DailyWeather } from "./weather";

export type WindowView = "sun" | "clouds" | "rain" | "fog" | "night";
export type Outfit = "coat" | "sweater" | "normal" | "tshirt";
export type SeasonalObject = "tree" | "chestnuts" | "basil" | "mask";
export type Pose = "sofa" | "away" | "sleeping" | "getting_ready" | "celebrating" | "out" | "breakfast" | "cooking" | "tidying";
// The house has rooms, one per part of the app: Hoje is the living room, Agenda the kitchen
// (where the calendar hangs), Nós the bedroom, and Explorar the garden outside.
export type Room = "sala" | "cozinha" | "quarto" | "jardim";

export type HouseScene = {
  window: WindowView;
  outfit: Outfit;
  fan: boolean;
  seasonal: SeasonalObject | null;
  poses: Record<HomePartner, Pose>;
  // Where each one is in the house, or null when out (work, a commitment, a date).
  rooms: Record<HomePartner, Room | null>;
  // What each one is doing, in a few words, or null when they're just at home.
  doing: Record<HomePartner, string | null>;
  together: boolean;
  // The date they're on now, or getting ready for.
  dateNow: { title: string; time: string } | null;
  // A date from today that should be over and hasn't been marked as done yet.
  backFromDate: { id: string; title: string } | null;
};

export type HouseInput = {
  now: Date;
  weather: DailyWeather | null;
  blocks: Array<Pick<WorkScheduleBlock, "partner_slot" | "weekday" | "starts_at" | "ends_at">>;
  commitments: Array<Pick<CoupleCommitment, "event_date" | "starts_at" | "ends_at" | "for_partner"> & { title?: string }>;
  dates: Array<Pick<CoupleDate, "planned_for" | "planned_start_time" | "completed_at"> & { status: string; id?: string; title?: string }>;
};

const dateOutMinutes = 180;
const gettingReadyMinutes = 60;
const defaultCommitmentMinutes = 60;
const breakfastMinutes = 60;
const bedtime = 23 * 60;
// Without work that day they get up at 8; on a work day, an hour before work (7 at the latest).
const lazyWake = 8 * 60;
const workWake = 7 * 60;
const choreMinutes = 45;

export function roomOf(pose: Pose): Room | null {
  if (pose === "away" || pose === "out") return null;
  if (pose === "sleeping" || pose === "getting_ready") return "quarto";
  if (pose === "breakfast" || pose === "cooking") return "cozinha";
  return "sala";
}

function hashOf(text: string) {
  let value = 7;
  for (let index = 0; index < text.length; index += 1) value = (value * 31 + text.charCodeAt(index)) >>> 0;
  return value;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const clock = (minutes: number) => `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

function windowFor(hour: number, weather: DailyWeather | null): WindowView {
  if (hour < 7 || hour >= 20) return "night";
  if (!weather) return "clouds";
  const code = weather.weatherCode;
  if (code === 45 || code === 48) return "fog";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return "rain";
  return code <= 1 ? "sun" : "clouds";
}

function outfitFor(feelsLike: number | null): Outfit {
  if (feelsLike === null) return "normal";
  if (feelsLike < 8) return "coat";
  if (feelsLike < 16) return "sweater";
  return feelsLike <= 24 ? "normal" : "tshirt";
}

function seasonalFor(now: Date, today: string): SeasonalObject | null {
  if (now.getMonth() === 11) return "tree";
  if (isSeasonActive("sao_martinho", today)) return "chestnuts";
  if (isSeasonActive("santos_populares", today)) return "basil";
  return isSeasonActive("carnaval", today) ? "mask" : null;
}

export function decideHouse({ now, weather, blocks, commitments, dates }: HouseInput): HouseScene {
  const today = dayKey(now);
  const minute = now.getHours() * 60 + now.getMinutes();
  const weekday = now.getDay() === 0 ? 7 : now.getDay();
  const feelsLike = weather ? weather.apparentTemperatureMax ?? weather.temperatureMax : null;
  const timedDates = dates.filter((date) => date.status === "planned" && date.planned_for === today && date.planned_start_time);
  const startsOf = (date: (typeof timedDates)[number]) => minutesOf(date.planned_start_time as string);
  const onDate = timedDates.find((date) => minute >= startsOf(date) && minute < startsOf(date) + dateOutMinutes);
  const readyFor = timedDates.find((date) => minute >= startsOf(date) - gettingReadyMinutes && minute < startsOf(date));
  const finished = timedDates.find((date) => minute >= startsOf(date) + dateOutMinutes);
  const together = Boolean(onDate);
  const gettingReady = Boolean(readyFor);
  const celebrating = dates.some((date) => date.status === "completed" && date.completed_at === today);

  const workOf = (slot: HomePartner) => blocks.find((block) => block.partner_slot === slot && block.weekday === weekday && minute >= minutesOf(block.starts_at) && minute < minutesOf(block.ends_at));
  const commitmentOf = (slot: HomePartner) => {
    for (const commitment of commitments) {
      if (commitment.event_date !== today || !commitment.starts_at || (commitment.for_partner && commitment.for_partner !== slot)) continue;
      const start = minutesOf(commitment.starts_at);
      const end = commitment.ends_at ? minutesOf(commitment.ends_at) : start + defaultCommitmentMinutes;
      if (minute >= start && minute < end) return { title: commitment.title?.trim() || "Num compromisso", end };
    }
    return null;
  };
  const isAway = (slot: HomePartner) => Boolean(workOf(slot) || commitmentOf(slot));
  // When each one starts work today: breakfast is the hour before, and they get up for it.
  const workStart = (slot: HomePartner) => {
    const starts = blocks.filter((block) => block.partner_slot === slot && block.weekday === weekday).map((block) => minutesOf(block.starts_at));
    return starts.length ? Math.min(...starts) : null;
  };
  const wakeOf = (slot: HomePartner) => {
    const start = workStart(slot);
    return start === null ? lazyWake : Math.min(workWake, start - breakfastMinutes);
  };
  const asleepOf = (slot: HomePartner) => minute >= bedtime || minute < wakeOf(slot);
  const breakfastOf = (slot: HomePartner) => {
    const start = workStart(slot);
    return start !== null && minute >= start - breakfastMinutes && minute < start;
  };

  const basePose = (slot: HomePartner): Pose => {
    if (together) return "out";
    if (isAway(slot)) return "away";
    if (gettingReady) return "getting_ready";
    if (asleepOf(slot)) return "sleeping";
    if (breakfastOf(slot)) return "breakfast";
    return celebrating ? "celebrating" : "sofa";
  };
  // Home while the other is at work: something to do around the house, changing every 45 minutes.
  const poseOf = (slot: HomePartner): Pose => {
    const pose = basePose(slot);
    const other: HomePartner = slot === "partner_one" ? "partner_two" : "partner_one";
    if (pose !== "sofa" || basePose(other) !== "away") return pose;
    const chores: Pose[] = ["cooking", "tidying", "sofa"];
    return chores[(hashOf(`${today}:${slot}`) + Math.floor(minute / choreMinutes)) % chores.length];
  };

  const doingOf = (slot: HomePartner): string | null => {
    const pose = poseOf(slot);
    if (pose === "out" && onDate) return `em date: ${onDate.title ?? "date"}`;
    if (pose === "away") {
      const commitment = commitmentOf(slot);
      if (commitment) return `${commitment.title} até às ${clock(commitment.end)}`;
      const work = workOf(slot);
      return work ? `a trabalhar até às ${work.ends_at.slice(0, 5)}` : "fora";
    }
    if (pose === "getting_ready" && readyFor) return `a arranjar-se para as ${(readyFor.planned_start_time as string).slice(0, 5)}`;
    if (pose === "sleeping") return "a dormir";
    if (pose === "breakfast") return "a tomar o pequeno-almoço";
    if (pose === "cooking") return minute >= 17 * 60 ? "a fazer o jantar" : "a cozinhar";
    if (pose === "tidying") return "a arrumar a casa";
    if (pose === "celebrating") return "a festejar o date";
    return null;
  };
  const shown = onDate ?? readyFor;

  return {
    doing: { partner_one: doingOf("partner_one"), partner_two: doingOf("partner_two") },
    dateNow: shown ? { title: shown.title ?? "date", time: (shown.planned_start_time as string).slice(0, 5) } : null,
    backFromDate: finished && finished.id ? { id: finished.id, title: finished.title ?? "date" } : null,
    window: windowFor(now.getHours(), weather),
    outfit: outfitFor(feelsLike),
    fan: feelsLike !== null && feelsLike > 30,
    seasonal: seasonalFor(now, today),
    poses: { partner_one: poseOf("partner_one"), partner_two: poseOf("partner_two") },
    rooms: { partner_one: roomOf(poseOf("partner_one")), partner_two: roomOf(poseOf("partner_two")) },
    together,
  };
}

// What the animal is doing when the app opens, and in which room. It waits at the door when
// nobody's home, sleeps in its bed in the bedroom when everyone at home is asleep, and keeps
// whoever is home alone company. With both home it picks something different each time.
export type PetMode = "door" | "bed" | "sofa" | "ball" | "running" | "sitting";

const freeModes: PetMode[] = ["sofa", "ball", "running", "sitting"];

export function decidePet(scene: Pick<HouseScene, "poses" | "rooms">, roll: number): { mode: PetMode; room: Room } {
  const slots: HomePartner[] = ["partner_one", "partner_two"];
  const home = slots.filter((slot) => scene.rooms[slot] !== null);
  const awake = home.filter((slot) => scene.poses[slot] !== "sleeping");
  if (!home.length) return { mode: "door", room: "sala" };
  if (!awake.length) return { mode: "bed", room: "quarto" };
  if (awake.length === 1 || scene.rooms[awake[0]] !== "sala" || scene.rooms[awake[1]] !== "sala") {
    // Follows the one who's up: on the sofa with them, or at their feet in the kitchen.
    const room = scene.rooms[awake[0]] as Room;
    if (room === "cozinha") return { mode: "sitting", room };
    if (room === "quarto") return { mode: "bed", room };
    return { mode: scene.poses[awake[0]] === "tidying" ? "running" : "sofa", room };
  }
  // The sofa needs both of them on it to have a middle; the ball is played outside.
  const modes = scene.poses.partner_one === "sofa" && scene.poses.partner_two === "sofa" ? freeModes : freeModes.filter((mode) => mode !== "sofa");
  const mode = modes[Math.min(modes.length - 1, Math.floor(Math.max(0, roll) * modes.length))];
  return { mode, room: mode === "ball" ? "jardim" : "sala" };
}

// Trips that already happened, newest first, one magnet per place.
// The pins on the wall map: every trip with a place, the past ones in full and the next ones hollow.
export type TripPin = { id: string; title: string; start_date: string; end_date: string; past: boolean; x: number | null; y: number | null };

export function tripPins(trips: Array<{ id: string; title: string; start_date: string; end_date: string; latitude: number | null; longitude: number | null }>, today: string): TripPin[] {
  return [...trips]
    .sort((first, second) => first.start_date.localeCompare(second.start_date))
    .map((trip) => {
      const placed = trip.latitude !== null && trip.longitude !== null;
      return {
        id: trip.id,
        title: trip.title.trim(),
        start_date: trip.start_date,
        end_date: trip.end_date,
        past: trip.end_date < today,
        // Same equirectangular frame as worldPath.ts (720 x 284).
        x: placed ? Math.round(((trip.longitude as number) + 180) * 2) : null,
        y: placed ? Math.round((84 - (trip.latitude as number)) * 2) : null,
      };
    });
}

// A wall-calendar page: weeks start on Monday, empty cells are null.
export function monthCells(year: number, month: number): Array<string | null> {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const pad = (value: number) => String(value).padStart(2, "0");
  const cells: Array<string | null> = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= days; day += 1) cells.push(`${year}-${pad(month + 1)}-${pad(day)}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}

export type CalendarMark = { kind: "date" | "commitment" | "trip"; title: string };

export type CalendarData = {
  // A date done shows on the day it was done (planned_for is cleared when it's closed).
  dates: Array<{ title: string; planned_for: string | null; status?: string; completed_at?: string | null }>;
  commitments: Array<{ title: string; event_date: string }>;
  trips: Array<{ title: string; start_date: string; end_date: string }>;
};

export function calendarMarks(input: CalendarData, from: string, to: string): Map<string, CalendarMark[]> {
  const marks = new Map<string, CalendarMark[]>();
  const add = (day: string, mark: CalendarMark) => {
    if (day < from || day > to) return;
    marks.set(day, [...(marks.get(day) ?? []), mark]);
  };
  for (const date of input.dates) {
    const day = date.status === "completed" ? date.completed_at ?? date.planned_for : date.planned_for;
    if (day) add(day.slice(0, 10), { kind: "date", title: date.title });
  }
  for (const item of input.commitments) add(item.event_date, { kind: "commitment", title: item.title });
  for (const trip of input.trips) {
    const cursor = new Date(`${trip.start_date}T12:00:00`);
    const end = new Date(`${trip.end_date}T12:00:00`);
    for (let guard = 0; cursor <= end && guard < 60; guard += 1) {
      add(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`, { kind: "trip", title: trip.title });
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return marks;
}
