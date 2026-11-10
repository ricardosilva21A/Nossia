import { describe, expect, it } from "vitest";
import { describeOpportunity, findOpportunities, holidaysFor } from "./holidays";
import type { WorkBlock } from "./holidays";

const weekdays = (slot: WorkBlock["partner_slot"], days = [1, 2, 3, 4, 5]): WorkBlock[] => days.map((weekday) => ({ partner_slot: slot, weekday }));
const names = { partner_one: "Ricardo", partner_two: "Marta" };

describe("holidays", () => {
  it("includes the movable ones for the year", () => {
    const dates = holidaysFor(2027).map((holiday) => holiday.date);
    expect(dates).toContain("2027-03-26"); // Sexta-feira Santa
    expect(dates).toContain("2027-03-28"); // Páscoa
    expect(dates).toContain("2027-05-27"); // Corpo de Deus
    expect(dates).toHaveLength(13);
  });

  it("adds the municipal holiday, accents aside", () => {
    expect(holidaysFor(2027, "Guimaraes").some((holiday) => holiday.date === "2027-06-24")).toBe(true);
    expect(holidaysFor(2027, "Lisboa").some((holiday) => holiday.date === "2027-06-13")).toBe(true);
    expect(holidaysFor(2027, "Montalegre")).toHaveLength(13);
  });
});

describe("opportunities", () => {
  it("offers one day of leave for a Tuesday holiday", () => {
    // 8 December 2026 is a Tuesday.
    const [found] = findOpportunities("2026-12-07", "2026-12-09", []);
    expect(found).toMatchObject({ start: "2026-12-05", end: "2026-12-08", days: 4 });
    expect(found.leave).toEqual([{ date: "2026-12-07", who: ["partner_one", "partner_two"] }]);
    expect(describeOpportunity(found, names)).toBe("8 de dezembro (Imaculada Conceição) é terça-feira: tirando segunda-feira, têm 4 dias seguidos.");
  });

  it("spots a long weekend with no leave", () => {
    // 1 May 2026 is a Friday.
    const [found] = findOpportunities("2026-04-30", "2026-05-02", []);
    expect(found).toMatchObject({ start: "2026-05-01", end: "2026-05-03", days: 3, leave: [] });
    expect(describeOpportunity(found, names)).toContain("têm 3 dias seguidos sem tirar férias");
  });

  it("names who needs the day off when only one works it", () => {
    const blocks = [...weekdays("partner_one"), ...weekdays("partner_two", [2, 3, 4, 5])];
    const [found] = findOpportunities("2026-12-07", "2026-12-09", blocks);
    expect(found.leave).toEqual([{ date: "2026-12-07", who: ["partner_one"] }]);
    expect(describeOpportunity(found, names)).toContain("tirando segunda-feira (Ricardo)");
  });

  it("knows when someone works weekends", () => {
    const blocks = [...weekdays("partner_one"), ...weekdays("partner_two", [3, 4, 5, 6, 7])];
    // With the partner working Saturday and Sunday, there's no free weekend to join.
    expect(findOpportunities("2026-12-07", "2026-12-09", blocks)).toEqual([]);
  });

  it("skips holidays that fall on a day off already", () => {
    // 5 October 2025 is a Sunday.
    expect(findOpportunities("2025-10-04", "2025-10-06", [])).toEqual([]);
  });

  it("offers two days for a Wednesday holiday", () => {
    // 10 June 2026 is a Wednesday.
    const [found] = findOpportunities("2026-06-09", "2026-06-11", []);
    expect(found.days).toBe(5);
    expect(found.leave).toHaveLength(2);
  });
});
