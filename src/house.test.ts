import { describe, expect, it } from "vitest";
import { calendarMarks, decideHouse, decidePet, lastArrival, monthCells, petPlaceFor, roomOf, seasonOf, tripPins } from "./house";
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

describe("the animal follows you", () => {
  const home = { poses: { partner_one: "sofa", partner_two: "away" }, rooms: { partner_one: "sala", partner_two: null } } as const;
  it("eats in the kitchen, rests in the bedroom and plays in the garden", () => {
    expect(petPlaceFor(home, 0.5, "cozinha")).toEqual({ mode: "eating", room: "cozinha" });
    expect(petPlaceFor(home, 0.5, "quarto")).toEqual({ mode: "resting", room: "quarto" });
    expect(petPlaceFor(home, 0.5, "jardim")).toEqual({ mode: "ball", room: "jardim" });
    expect(petPlaceFor(home, 0.5, "sala").room).toBe("sala");
  });

  it("stays at the door or asleep instead", () => {
    expect(petPlaceFor({ poses: { partner_one: "away", partner_two: "away" }, rooms: { partner_one: null, partner_two: null } }, 0.5, "jardim").mode).toBe("door");
    expect(petPlaceFor({ poses: { partner_one: "sleeping", partner_two: "away" }, rooms: { partner_one: "quarto", partner_two: null } }, 0.5, "cozinha")).toEqual({ mode: "bed", room: "quarto" });
  });
});

describe("the three of them together", () => {
  it("make dinner together, and only whoever plays sits at the computer", () => {
    const dinner = decideHouse({ ...base, now: new Date(2026, 9, 7, 20, 0) });
    expect(dinner.poses).toEqual({ partner_one: "cooking", partner_two: "cooking" });
    expect(dinner.doing.partner_one).toBe("a fazer o jantar juntos");
    const evenings = (gamers: Array<"partner_one" | "partner_two">) => Array.from({ length: 60 }, (_, day) => [17, 18, 21, 22].flatMap((hour) => [0, 45].map((minute) => decideHouse({ ...base, gamers, now: new Date(2026, 9, 1 + day, hour, minute) }).poses))).flat();
    expect(evenings([]).some((poses) => poses.partner_one === "gaming" || poses.partner_two === "gaming")).toBe(false);
    const ricardo = evenings(["partner_one"]);
    expect(ricardo.some((poses) => poses.partner_one === "gaming" && poses.partner_two === "bed_rest")).toBe(true);
    // The other one joins in now and then, but never plays alone.
    expect(ricardo.some((poses) => poses.partner_two === "gaming" && poses.partner_one === "gaming")).toBe(true);
    expect(ricardo.some((poses) => poses.partner_two === "gaming" && poses.partner_one !== "gaming")).toBe(false);
    const together = ricardo.filter((poses) => poses.partner_two === "gaming").length;
    expect(together).toBeLessThan(ricardo.filter((poses) => poses.partner_one === "gaming").length / 4);
  });

  it("lies at the gamer's feet", () => {
    expect(decidePet({ poses: { partner_one: "gaming", partner_two: "away" }, rooms: { partner_one: "quarto", partner_two: null } }, 0.5)).toEqual({ mode: "feet", room: "quarto" });
  });

  it("the animal cuddles on the bed, waits at the door before someone's home, and takes the big bed on weekends", () => {
    expect(decidePet({ poses: { partner_one: "gaming", partner_two: "bed_rest" }, rooms: { partner_one: "quarto", partner_two: "quarto" } }, 0.5)).toEqual({ mode: "cuddle", room: "quarto" });
    const soon = decideHouse({ ...base, now: new Date(2026, 9, 7, 17, 55), blocks: [{ partner_slot: "partner_one", weekday: 3, starts_at: "09:00:00", ends_at: "18:00:00" }] });
    expect(soon.arrivingSoon).toBe("partner_one");
    expect(petPlaceFor(soon, 0.5, "cozinha")).toEqual({ mode: "door", room: "sala" });
    const saturdayNight = decideHouse({ ...base, now: new Date(2026, 9, 10, 23, 30) });
    expect(decidePet(saturdayNight, 0.5)).toEqual({ mode: "footbed", room: "quarto" });
    expect(decidePet(decideHouse({ ...base, now: new Date(2026, 9, 7, 23, 30) }), 0.5).mode).toBe("bed");
  });

  it("replays the latest arrival home since the app was last open", () => {
    const blocks = [{ partner_slot: "partner_two" as const, weekday: 3, ends_at: "17:00:00" }];
    const arrival = lastArrival(blocks, new Date(2026, 9, 7, 12, 0), new Date(2026, 9, 7, 18, 0));
    expect(arrival?.slot).toBe("partner_two");
    expect(arrival?.at.getHours()).toBe(17);
    expect(lastArrival(blocks, new Date(2026, 9, 7, 17, 30), new Date(2026, 9, 7, 18, 0))).toBeNull();
  });
});

describe("garden", () => {
  it("knows the season and Christmas", () => {
    expect([seasonOf(3), seasonOf(7), seasonOf(10), seasonOf(0)]).toEqual(["spring", "summer", "autumn", "winter"]);
    expect(decideHouse({ ...base, now: new Date(2026, 11, 20, 15, 0) }).christmas).toBe(true);
    expect(decideHouse({ ...base, weather: weather(73, 1) }).sky).toBe("snow");
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
