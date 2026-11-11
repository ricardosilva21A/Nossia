import { describe, expect, it } from "vitest";
import { calendarMarks, decideHouse, decidePetMode, monthCells, tripPins } from "./house";
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

describe("the animal", () => {
  it("waits at the door when both are out and sleeps in its bed when both sleep", () => {
    expect(decidePetMode({ partner_one: "away", partner_two: "out" }, 0.5)).toBe("door");
    expect(decidePetMode({ partner_one: "sleeping", partner_two: "sleeping" }, 0.5)).toBe("bed");
  });

  it("does something different otherwise, and only takes the sofa when both are on it", () => {
    const modes = new Set([0, 0.2, 0.4, 0.6, 0.8, 0.99].map((roll) => decidePetMode({ partner_one: "sofa", partner_two: "sofa" }, roll)));
    expect(modes).toEqual(new Set(["sofa", "bed", "ball", "running", "sitting"]));
    expect([0, 0.3, 0.6, 0.99].map((roll) => decidePetMode({ partner_one: "away", partner_two: "sofa" }, roll))).not.toContain("sofa");
  });
});

describe("wall map", () => {
  it("places each trip on the map and tells past from coming", () => {
    const trips = [
      { id: "b", title: "Barcelona", start_date: "2026-08-16", end_date: "2026-08-21", latitude: 41.38, longitude: 2.18 },
      { id: "l", title: "Lisboa ", start_date: "2026-12-11", end_date: "2026-12-13", latitude: null, longitude: null },
    ];
    expect(tripPins(trips, "2026-11-11")).toEqual([
      { id: "b", title: "Barcelona", start_date: "2026-08-16", end_date: "2026-08-21", past: true, x: 364, y: 85 },
      { id: "l", title: "Lisboa", start_date: "2026-12-11", end_date: "2026-12-13", past: false, x: null, y: null },
    ]);
  });
});

describe("wall calendar", () => {
  it("starts the weeks on Monday", () => {
    const cells = monthCells(2026, 10);
    expect(cells.slice(0, 7)).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(cells.length % 7).toBe(0);
    expect(cells.filter(Boolean)).toHaveLength(30);
  });

  it("marks dates, commitments and every day of a trip inside the page", () => {
    const marks = calendarMarks({
      dates: [{ title: "Jantar", planned_for: "2026-11-14T20:00:00" }, { title: "Sem dia", planned_for: null }],
      commitments: [{ title: "Dentista", event_date: "2026-11-14" }],
      trips: [{ title: "Lisboa", start_date: "2026-11-29", end_date: "2026-12-02" }],
    }, "2026-11-01", "2026-11-30");
    expect(marks.get("2026-11-14")?.map((mark) => mark.kind)).toEqual(["date", "commitment"]);
    expect(marks.get("2026-11-29")).toEqual([{ kind: "trip", title: "Lisboa" }]);
    expect(marks.get("2026-11-30")).toHaveLength(1);
    expect(marks.has("2026-12-01")).toBe(false);
  });
});
