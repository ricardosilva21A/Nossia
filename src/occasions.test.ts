import { describe, expect, it } from "vitest";
import { weekendFor, weekFor } from "./OccasionPlanner";

describe("planning a special date", () => {
  it("finds the weekend: the Saturday before, or the weekend itself", () => {
    expect(weekendFor("2026-12-02")).toBe("2026-11-28"); // a Wednesday
    expect(weekendFor("2026-12-05")).toBe("2026-12-05"); // a Saturday
    expect(weekendFor("2026-12-06")).toBe("2026-12-05"); // a Sunday
  });

  it("takes Monday to Sunday for the whole week", () => {
    expect(weekFor("2026-12-02")).toEqual({ start: "2026-11-30", end: "2026-12-06" });
    expect(weekFor("2026-12-06")).toEqual({ start: "2026-11-30", end: "2026-12-06" });
  });
});
