import { describe, expect, it } from "vitest";
import { calendarMarks, decideHouse, decidePet, monthCells, roomOf, tripPins } from "./house";
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
    expect(scene.poses.partner_one).toBe("away");
    expect(scene.rooms.partner_one).toBeNull();
    // Home alone while the other works: a chore around the house.
    expect(["cooking", "tidying", "sofa"]).toContain(scene.poses.partner_two);
  });

  it("ignores work on other days", () => {
    expect(decideHouse({ ...base, blocks: [{ partner_slot: "partner_one", weekday: 4, starts_at: "09:00:00", ends_at: "18:00:00" }] }).poses.partner_one).toBe("sofa");
  });

  it("counts a commitment for one person or for both", () => {
    const mine = decideHouse({ ...base, commitments: [{ event_date: today, starts_at: "14:30:00", ends_at: null, for_partner: "partner_two" }] });
    expect(mine.poses.partner_two).toBe("away");
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
    const night = decideHouse({ ...base, now: new Date(2026, 9, 7, 2, 0) });
    expect(night.poses.partner_one).toBe("sleeping");
    expect(night.rooms.partner_one).toBe("quarto");
  });

  it("have breakfast in the kitchen the hour before work, each at their own time", () => {
    const blocks = [
      { partner_slot: "partner_one" as const, weekday: 3, starts_at: "06:00:00", ends_at: "14:00:00" },
      { partner_slot: "partner_two" as const, weekday: 3, starts_at: "08:00:00", ends_at: "17:00:00" },
    ];
    const at = (hour: number, minute = 0) => decideHouse({ ...base, blocks, now: new Date(2026, 9, 7, hour, minute) });
    expect(at(5, 15).poses).toEqual({ partner_one: "breakfast", partner_two: "sleeping" });
    expect(at(5, 15).rooms).toEqual({ partner_one: "cozinha", partner_two: "quarto" });
    expect(at(7, 15).poses).toEqual({ partner_one: "away", partner_two: "breakfast" });
    // No work that day: a lie-in until 8.
    expect(decideHouse({ ...base, now: new Date(2026, 9, 7, 7, 30) }).poses.partner_one).toBe("sleeping");
  });
});

describe("what each one is doing", () => {
  it("says who is at work and until when", () => {
    const scene = decideHouse({ ...base, blocks: [{ partner_slot: "partner_one", weekday: 3, starts_at: "09:00:00", ends_at: "18:00:00" }] });
    expect(scene.doing.partner_one).toBe("a trabalhar até às 18:00");
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
  const scene = (poses: Record<"partner_one" | "partner_two", Parameters<typeof decidePet>[0]["poses"]["partner_one"]>) => ({ poses, rooms: { partner_one: roomOf(poses.partner_one), partner_two: roomOf(poses.partner_two) } });
  it("waits at the door when both are out and sleeps in its bed in the bedroom when they sleep", () => {
    expect(decidePet(scene({ partner_one: "away", partner_two: "out" }), 0.5)).toEqual({ mode: "door", room: "sala" });
    expect(decidePet(scene({ partner_one: "sleeping", partner_two: "sleeping" }), 0.5)).toEqual({ mode: "bed", room: "quarto" });
    expect(decidePet(scene({ partner_one: "away", partner_two: "sleeping" }), 0.5)).toEqual({ mode: "bed", room: "quarto" });
  });

  it("keeps whoever is home alone company", () => {
    expect(decidePet(scene({ partner_one: "away", partner_two: "sofa" }), 0.9)).toEqual({ mode: "sofa", room: "sala" });
    expect(decidePet(scene({ partner_one: "breakfast", partner_two: "sleeping" }), 0.9)).toEqual({ mode: "sitting", room: "cozinha" });
  });

  it("does something different with both home, the ball outside, the sofa only with both on it", () => {
    const picks = [0, 0.3, 0.6, 0.99].map((roll) => decidePet(scene({ partner_one: "sofa", partner_two: "sofa" }), roll));
    expect(new Set(picks.map((pick) => pick.mode))).toEqual(new Set(["sofa", "ball", "running", "sitting"]));
    expect(picks.find((pick) => pick.mode === "ball")?.room).toBe("jardim");
    expect([0, 0.3, 0.6, 0.99].map((roll) => decidePet(scene({ partner_one: "celebrating", partner_two: "sofa" }), roll).mode)).not.toContain("sofa");
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
      dates: [{ title: "Jantar", planned_for: "2026-11-14T20:00:00" }, { title: "Sem dia", planned_for: null }, { title: "Feito", planned_for: null, status: "completed", completed_at: "2026-11-03" }],
      commitments: [{ title: "Dentista", event_date: "2026-11-14" }],
      trips: [{ title: "Lisboa", start_date: "2026-11-29", end_date: "2026-12-02" }],
    }, "2026-11-01", "2026-11-30");
    expect(marks.get("2026-11-14")?.map((mark) => mark.kind)).toEqual(["date", "commitment"]);
    expect(marks.get("2026-11-29")).toEqual([{ kind: "trip", title: "Lisboa" }]);
    expect(marks.get("2026-11-30")).toHaveLength(1);
    expect(marks.has("2026-12-01")).toBe(false);
    expect(marks.get("2026-11-03")).toEqual([{ kind: "date", title: "Feito" }]);
  });
});
