import { describe, expect, it } from "vitest";
import { verdictOf } from "./verdicts";

describe("how a date went", () => {
  it("reads the emoji from the rating", () => {
    expect(verdictOf({ rating: 5, would_repeat: null })?.emoji).toBe("😍");
    expect(verdictOf({ rating: 3, would_repeat: true })?.emoji).toBe("😐");
    expect(verdictOf({ rating: 2, would_repeat: null })?.label).toBe("Mais ou menos");
  });

  it("falls back to the old repeat answer", () => {
    expect(verdictOf({ rating: null, would_repeat: true })?.emoji).toBe("😍");
    expect(verdictOf({ rating: null, would_repeat: false })?.emoji).toBe("😐");
    expect(verdictOf({ rating: null, would_repeat: null })).toBeNull();
  });
});
