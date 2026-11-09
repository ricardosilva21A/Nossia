// Decides what the couple's house shows right now. It knows nothing about drawing, so the same
// answer can drive a placeholder, layered images or a Rive state machine.

import { isSeasonActive } from "./seasons";
import type { CoupleCommitment, CoupleDate, HomePartner, WorkScheduleBlock } from "./types";
import type { DailyWeather } from "./weather";

export type WindowView = "sun" | "clouds" | "rain" | "fog" | "night";
export type Outfit = "coat" | "sweater" | "normal" | "tshirt";
export type SeasonalObject = "tree" | "chestnuts" | "basil" | "mask";
export type Pose = "sofa" | "away" | "sleeping" | "getting_ready" | "celebrating" | "out";

export type HouseScene = {
  window: WindowView;
  outfit: Outfit;
  fan: boolean;
  seasonal: SeasonalObject | null;
  poses: Record<HomePartner, Pose>;
  together: boolean;
};

export type HouseInput = {
  now: Date;
  weather: DailyWeather | null;
  blocks: Array<Pick<WorkScheduleBlock, "partner_slot" | "weekday" | "starts_at" | "ends_at">>;
  commitments: Array<Pick<CoupleCommitment, "event_date" | "starts_at" | "ends_at" | "for_partner">>;
  dates: Array<Pick<CoupleDate, "status" | "planned_for" | "planned_start_time" | "completed_at">>;
};

const dateOutMinutes = 180;
const gettingReadyMinutes = 60;
const defaultCommitmentMinutes = 60;

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

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
  const together = timedDates.some((date) => minute >= startsOf(date) && minute < startsOf(date) + dateOutMinutes);
  const gettingReady = timedDates.some((date) => minute >= startsOf(date) - gettingReadyMinutes && minute < startsOf(date));
  const celebrating = dates.some((date) => date.status === "completed" && date.completed_at === today);
  const asleep = now.getHours() >= 23 || now.getHours() < 7;

  const isAway = (slot: HomePartner) =>
    blocks.some((block) => block.partner_slot === slot && block.weekday === weekday && minute >= minutesOf(block.starts_at) && minute < minutesOf(block.ends_at))
    || commitments.some((commitment) => {
      if (commitment.event_date !== today || !commitment.starts_at || (commitment.for_partner && commitment.for_partner !== slot)) return false;
      const start = minutesOf(commitment.starts_at);
      const end = commitment.ends_at ? minutesOf(commitment.ends_at) : start + defaultCommitmentMinutes;
      return minute >= start && minute < end;
    });

  const poseOf = (slot: HomePartner): Pose => {
    if (together) return "out";
    if (isAway(slot)) return "away";
    if (gettingReady) return "getting_ready";
    if (asleep) return "sleeping";
    return celebrating ? "celebrating" : "sofa";
  };

  return {
    window: windowFor(now.getHours(), weather),
    outfit: outfitFor(feelsLike),
    fan: feelsLike !== null && feelsLike > 30,
    seasonal: seasonalFor(now, today),
    poses: { partner_one: poseOf("partner_one"), partner_two: poseOf("partner_two") },
    together,
  };
}
