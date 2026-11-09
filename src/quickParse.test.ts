import { describe, expect, it } from "vitest";
import { guessIdea, isWatchingAtHome, memoryKind, parseQuickText, placeFromTitle, watchedName } from "./quickParse";

// Sunday, 8 November 2026, in the morning.
const now = new Date(2026, 10, 8, 10, 0);

describe("parseQuickText", () => {
  it("understands relative days", () => {
    expect(parseQuickText("jantar hoje", now).date).toBe("2026-11-08");
    expect(parseQuickText("jantar amanhã", now).date).toBe("2026-11-09");
    expect(parseQuickText("vimos anime ontem", now).date).toBe("2026-11-07");
  });

  it("understands a day of the month", () => {
    expect(parseQuickText("dentista dia 20", now).date).toBe("2026-11-20");
    expect(parseQuickText("dentista dia 3", now).date).toBe("2026-12-03");
  });

  it("understands weekdays", () => {
    expect(parseQuickText("jantar sexta", now).date).toBe("2026-11-13");
  });

  it("understands times", () => {
    expect(parseQuickText("cinema amanhã às 21h30", now).startTime).toBe("21:30");
    expect(parseQuickText("jantar sexta às 20h", now).startTime).toBe("20:00");
  });

  it("removes the day and time from the title", () => {
    expect(parseQuickText("jantar italiano sexta às 20h", now).title.toLowerCase()).toBe("jantar italiano");
  });

  it("treats the past as already done and work as a commitment", () => {
    expect(parseQuickText("vimos anime ontem", now).kind).toBe("done");
    expect(parseQuickText("jantar sexta", now).kind).toBe("date");
    expect(parseQuickText("dentista terça às 9h", now).kind).toBe("commitment");
  });
});

describe("what a date is about", () => {
  it("merges watching at home but not the cinema", () => {
    expect(isWatchingAtHome("Vimos anime")).toBe(true);
    expect(isWatchingAtHome("Ir ao cinema")).toBe(false);
  });

  it("finds a title only when one was written", () => {
    expect(watchedName("ver filme Interstellar")).toBe("Interstellar");
    expect(watchedName("ver um filme de terror")).toBe("");
  });

  it("finds the place in a title", () => {
    expect(placeFromTitle("Jantar no Ramiro com a Marta")).toBe("Ramiro");
    expect(placeFromTitle("Almoço na Casa Guedes")).toBe("Casa Guedes");
    expect(placeFromTitle("Jantar em casa")).toBe("");
  });

  it("asks the right question afterwards", () => {
    expect(memoryKind("Ver um filme", "Culture", false)).toBe("watch");
    expect(memoryKind("Ir ao Ramiro", "Adventure", true)).toBe("food");
    expect(memoryKind("Passeio na praia", "Outdoors", false)).toBe("other");
  });

  it("makes watching repeatable", () => {
    expect(guessIdea("anime com a Marta").repeatable).toBe(true);
  });
});
