import { describe, expect, it } from "vitest";
import { buildDeck, isHiddenByCouple, noSignals, preferenceEffect } from "./preferences";
import type { Vote } from "./preferences";
import type { DateIdea } from "./types";

const now = new Date(2026, 9, 7, 12, 0);
const today = "2026-10-07";
const idea = (id: string, extra: Partial<DateIdea> = {}) => ({ id, idea_id: id, status: "idea", seasons: [], tags: [], ...extra }) as unknown as DateIdea;
const many = (count: number) => Array.from({ length: count }, (_, index) => idea(`i${index}`));
const votes = (count: number, when = "2026-10-06T12:00:00Z"): Vote[] => Array.from({ length: count }, (_, index) => ({ idea_id: `v${index}`, vote: "like", updated_at: when }));

describe("what the couple's votes do", () => {
  it("hides only what both passed", () => {
    const signals = { ideas: { a: "both_pass", b: "less" } as const, avoided_tags: [] };
    expect(isHiddenByCouple("a", signals)).toBe(true);
    expect(isHiddenByCouple("b", signals)).toBe(false);
  });

  it("promotes what both want and says why", () => {
    const effect = preferenceEffect(idea("a"), { ideas: { a: "both_like" }, avoided_tags: [] });
    expect(effect.adjustment).toBeGreaterThan(0);
    expect(effect.reason).toBe("Vocês os dois querem isto");
  });

  it("lowers one person's pass and a type they keep passing", () => {
    expect(preferenceEffect(idea("a"), { ideas: { a: "less" }, avoided_tags: [] }).adjustment).toBeLessThan(0);
    expect(preferenceEffect(idea("a", { tags: ["museu"] }), { ideas: {}, avoided_tags: ["museu"] }).adjustment).toBeLessThan(0);
  });

  it("leaves everything else alone", () => {
    expect(preferenceEffect(idea("a", { tags: ["praia"] }), noSignals).adjustment).toBe(0);
  });
});

describe("the deck", () => {
  it("starts with fifteen cards and continues an unfinished first deck", () => {
    expect(buildDeck(many(40), [], today, now)).toHaveLength(15);
    expect(buildDeck(many(40), votes(10), today, now)).toHaveLength(5);
  });

  it("then offers nothing until a week has passed, and five after", () => {
    expect(buildDeck(many(40), votes(15), today, now)).toHaveLength(0);
    expect(buildDeck(many(40), votes(15, "2026-09-29T12:00:00Z"), today, now)).toHaveLength(5);
  });

  it("never repeats an idea already voted on or anything already planned", () => {
    const deck = buildDeck([idea("v0"), idea("new"), idea("planned", { status: "planned" })], votes(1), today, now);
    expect(deck.map((item) => item.idea_id)).toEqual(["new"]);
  });

  it("puts this season first and leaves out other seasons", () => {
    const deck = buildDeck([idea("plain"), idea("xmas", { seasons: ["natal"] }), idea("autumn", { seasons: ["outono"] })], [], today, now);
    expect(deck.map((item) => item.idea_id)).toEqual(["autumn", "plain"]);
  });

  it("shows places just found around home before anything else", () => {
    const deck = buildDeck([idea("plain"), idea("autumn", { seasons: ["outono"] }), idea("found", { tags: ["descoberto", "osm:node/1"] })], [], today, now);
    expect(deck.map((item) => item.idea_id)).toEqual(["found", "autumn", "plain"]);
  });

  it("ends when there is nothing new", () => {
    expect(buildDeck([idea("v0")], votes(1), today, now)).toHaveLength(0);
  });
});
