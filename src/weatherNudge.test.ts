import { describe, expect, it } from "vitest";
import { isoWeek, weatherNudge } from "./weatherNudge";

const day = (date: string, weatherCode: number, precipitationProbability: number, temperatureMax = 18) => ({ date, weatherCode, precipitationProbability, temperatureMax });

describe("weather that changes a plan", () => {
  it("counts weeks the ISO way", () => {
    expect(isoWeek("2026-11-12")).toBe("2026-W46");
    expect(isoWeek("2027-01-01")).toBe("2026-W53");
  });

  it("warns about rain on an outdoor date in the next two days", () => {
    const nudge = weatherNudge({ today: "2026-11-12", forecast: [day("2026-11-14", 61, 80)], dates: [{ title: "Piquenique no Bom Jesus", planned_for: "2026-11-14", weather_setting: "outdoor" }], outdoorIdeas: [], isFree: () => true });
    expect(nudge).toEqual({ key: "weather:2026-W46", title: "Vai chover no sábado", body: "Piquenique no Bom Jesus é ao ar livre. Mudam o dia ou trocam por algo em casa?", url: "/planned" });
  });

  it("says nothing about rain on an indoor date, or a dry day", () => {
    expect(weatherNudge({ today: "2026-11-12", forecast: [day("2026-11-13", 61, 90)], dates: [{ title: "Cinema", planned_for: "2026-11-13", weather_setting: "indoor" }], outdoorIdeas: [], isFree: () => true })).toBeNull();
    expect(weatherNudge({ today: "2026-11-12", forecast: [day("2026-11-13", 1, 10)], dates: [{ title: "Caminhada", planned_for: "2026-11-13", weather_setting: "outdoor" }], outdoorIdeas: [], isFree: () => true })).toBeNull();
  });

  it("suggests an outdoor idea for a sunny, free weekend, only on Thursday and only if nothing is planned", () => {
    const base = { forecast: [day("2026-11-14", 0, 5, 19), day("2026-11-15", 3, 30)], outdoorIdeas: ["Caminhada no Gerês"], isFree: () => true };
    expect(weatherNudge({ ...base, today: "2026-11-12", dates: [] })?.body).toBe("Sábado vai estar sol e estão os dois livres. Que tal Caminhada no Gerês?");
    expect(weatherNudge({ ...base, today: "2026-11-11", dates: [] })).toBeNull();
    expect(weatherNudge({ ...base, today: "2026-11-12", dates: [{ title: "Jantar", planned_for: "2026-11-15" }] })).toBeNull();
    expect(weatherNudge({ ...base, today: "2026-11-12", dates: [], isFree: () => false })).toBeNull();
  });
});
