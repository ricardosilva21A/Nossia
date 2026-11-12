import { describe, expect, it } from "vitest";
import { monthSummary, previousMonth, summaryLine } from "./monthSummary";

const date = (id: string, completed_at: string | null, rating: number | null, location_name: string | null = null, status = "completed") => ({ id, title: `Date ${id}`, emoji: "🍝", status, completed_at, rating, location_name });

describe("the month in review", () => {
  it("knows which month just ended", () => {
    expect(previousMonth("2026-11-01")).toBe("2026-10");
    expect(previousMonth("2027-01-15")).toBe("2026-12");
  });

  it("counts dates, loved ones, places, trips and photos of that month only", () => {
    const summary = monthSummary("2026-10", [
      date("a", "2026-10-03", 5, "Vira"),
      date("b", "2026-10-20", 5, "vira "),
      date("c", "2026-10-25", 4, "Porto"),
      date("d", "2026-09-30", 5),
      date("e", null, null, null, "planned"),
    ], [{ title: "Barcelona", end_date: "2026-10-12" }, { title: "Lisboa", end_date: "2026-12-13" }], new Map([["a", 2], ["d", 5]]));
    expect(summary).toEqual({ month: "2026-10", label: "outubro", done: 3, loved: 2, favorite: { title: "Date b", emoji: "🍝" }, places: 2, trips: ["Barcelona"], photos: 2 });
    expect(summaryLine(summary!)).toBe("3 dates, 2 😍 e uma viagem a Barcelona");
  });

  it("has nothing to say about an empty month", () => {
    expect(monthSummary("2026-08", [date("a", "2026-10-03", 5)], [], new Map())).toBeNull();
  });
});
