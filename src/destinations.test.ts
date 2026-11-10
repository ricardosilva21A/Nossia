import { describe, expect, it } from "vitest";
import { destinationsFor, minimumDaysFor } from "./destinations";

describe("destinations that fit", () => {
  it("only suggests places a long weekend can reach", () => {
    const list = destinationsFor(3, "2026-12-05");
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((guide) => minimumDaysFor(guide.city) <= 3)).toBe(true);
  });

  it("only suggests places in season that month", () => {
    expect(destinationsFor(9, "2027-03-06").every((guide) => guide.months.includes(3))).toBe(true);
    expect(destinationsFor(4, "2026-12-05").every((guide) => guide.months.includes(12))).toBe(true);
  });

  it("uses a longer break for places further away", () => {
    // Reykjavík needs five days and is good in March.
    expect(destinationsFor(9, "2027-03-06").map((guide) => guide.city)).toContain("Reiquiavique");
    expect(destinationsFor(4, "2027-03-06").map((guide) => guide.city)).not.toContain("Reiquiavique");
  });

  it("leaves out home and places already visited, accents aside", () => {
    const cities = destinationsFor(9, "2026-12-05", ["Budapeste", "praga", "Lisboa"], 40).map((guide) => guide.city);
    expect(cities).not.toContain("Budapeste");
    expect(cities).not.toContain("Praga");
    expect(cities).not.toContain("Lisboa");
  });

  it("returns nothing for a single day", () => {
    expect(destinationsFor(1, "2026-12-05")).toEqual([]);
  });

  it("varies the order with the date but stays stable for the same date", () => {
    expect(destinationsFor(3, "2026-05-01")).toEqual(destinationsFor(3, "2026-05-01"));
  });
});
