import { describe, expect, it } from "vitest";
import { decideHouse } from "./house";
import type { HouseInput } from "./house";
import type { DailyWeather } from "./weather";

const base: HouseInput = { now: new Date(2026, 9, 7, 15, 0), weather: null, blocks: [], commitments: [], dates: [] };
const weather = (weatherCode: number, feels: number): DailyWeather => ({ date: "2026-10-07", weatherCode, temperatureMax: feels, temperatureMin: feels, precipitationProbability: 0, apparentTemperatureMax: feels, apparentTemperatureMin: feels, windSpeedMax: null, uvIndexMax: null, sunshineHours: null, daylightHours: null });
const today = "2026-10-07"; // a Wednesday
const planned = (time: string) => ({ status: "planned" as const, planned_for: today, planned_start_time: time, completed_at: null });

describe("window", () => {
  it("follows the forecast by day and shows night after dark", () => {
    expect(decideHouse({ ...base, weather: weather(0, 20) }).window).toBe("sun");
    expect(decideHouse({ ...base, weather: weather(3, 20) }).window).toBe("clouds");
    expect(decideHouse({ ...base, weather: weather(63, 20) }).window).toBe("rain");
    expect(decideHouse({ ...base, weather: weather(45, 20) }).window).toBe("fog");
    expect(decideHouse({ ...base, now: new Date(2026, 9, 7, 21, 0), weather: weather(0, 20) }).window).toBe("night");
  });
});

describe("clothes", () => {
  it("changes at the agreed temperatures", () => {
    expect(decideHouse({ ...base, weather: weather(0, 7.9) }).outfit).toBe("coat");
    expect(decideHouse({ ...base, weather: weather(0, 8) }).outfit).toBe("sweater");
    expect(decideHouse({ ...base, weather: weather(0, 16) }).outfit).toBe("normal");
    expect(decideHouse({ ...base, weather: weather(0, 24.5) }).outfit).toBe("tshirt");
  });

  it("brings out the fan only when it's very hot", () => {
    expect(decideHouse({ ...base, weather: weather(0, 30) }).fan).toBe(false);
    expect(decideHouse({ ...base, weather: weather(0, 31) }).fan).toBe(true);
  });
});

describe("season", () => {
  it("shows a tree in December", () => {
    expect(decideHouse({ ...base, now: new Date(2026, 11, 2, 15, 0) }).seasonal).toBe("tree");
    expect(decideHouse(base).seasonal).toBeNull();
  });
});

describe("mascots", () => {
  it("stay on the sofa by default", () => {
    expect(decideHouse(base).poses).toEqual({ partner_one: "sofa", partner_two: "sofa" });
  });

  it("leaves whoever is working out of the house", () => {
    const scene = decideHouse({ ...base, blocks: [{ partner_slot: "partner_one", weekday: 3, starts_at: "09:00:00", ends_at: "18:00:00" }] });
    expect(scene.poses).toEqual({ partner_one: "away", partner_two: "sofa" });
  });

  it("ignores work on other days", () => {
    expect(decideHouse({ ...base, blocks: [{ partner_slot: "partner_one", weekday: 4, starts_at: "09:00:00", ends_at: "18:00:00" }] }).poses.partner_one).toBe("sofa");
  });

  it("counts a commitment for one person or for both", () => {
    const mine = decideHouse({ ...base, commitments: [{ event_date: today, starts_at: "14:30:00", ends_at: null, for_partner: "partner_two" }] });
    expect(mine.poses).toEqual({ partner_one: "sofa", partner_two: "away" });
    const both = decideHouse({ ...base, commitments: [{ event_date: today, starts_at: "14:30:00", ends_at: "16:00:00", for_partner: null }] });
    expect(both.poses).toEqual({ partner_one: "away", partner_two: "away" });
  });

  it("get ready before a date and leave together", () => {
    expect(decideHouse({ ...base, dates: [planned("15:30:00")] }).poses.partner_one).toBe("getting_ready");
    const out = decideHouse({ ...base, dates: [planned("14:30:00")] });
    expect(out.together).toBe(true);
    expect(out.poses).toEqual({ partner_one: "out", partner_two: "out" });
  });

  it("celebrate a date done today and sleep at night", () => {
    expect(decideHouse({ ...base, dates: [{ status: "completed", planned_for: null, planned_start_time: null, completed_at: today }] }).poses.partner_one).toBe("celebrating");
    expect(decideHouse({ ...base, now: new Date(2026, 9, 7, 2, 0) }).poses.partner_one).toBe("sleeping");
  });
});

describe("what each one is doing", () => {
  it("says who is at work and until when", () => {
    const scene = decideHouse({ ...base, blocks: [{ partner_slot: "partner_one", weekday: 3, starts_at: "09:00:00", ends_at: "18:00:00" }] });
    expect(scene.doing).toEqual({ partner_one: "a trabalhar até às 18:00", partner_two: null });
  });

  it("names the commitment and when it ends", () => {
    const scene = decideHouse({ ...base, commitments: [{ title: "Dentista", event_date: today, starts_at: "14:30:00", ends_at: null, for_partner: "partner_two" }] });
    expect(scene.doing.partner_two).toBe("Dentista até às 15:30");
  });

  it("names the date they're getting ready for and the one they're on", () => {
    const date = { ...planned("15:30:00"), id: "d1", title: "Jantar no Cozinha da Terra" };
    expect(decideHouse({ ...base, dates: [date] }).doing.partner_one).toBe("a arranjar-se para as 15:30");
    const out = decideHouse({ ...base, now: new Date(2026, 9, 7, 16, 0), dates: [date] });
    expect(out.dateNow).toEqual({ title: "Jantar no Cozinha da Terra", time: "15:30" });
    expect(out.doing.partner_one).toBe("em date: Jantar no Cozinha da Terra");
  });

  it("asks how it went once a date from today should be over", () => {
    const date = { ...planned("11:00:00"), id: "d1", title: "Brunch" };
    expect(decideHouse({ ...base, dates: [date] }).backFromDate).toEqual({ id: "d1", title: "Brunch" });
    expect(decideHouse({ ...base, dates: [{ ...date, status: "completed" }] }).backFromDate).toBeNull();
  });
});
