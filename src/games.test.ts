import { describe, expect, it } from "vitest";
import { answersFor, dailyQuestion, decks, factsOf, gameTastes, knowScore, nextInDeck, outcomeOf, promptFor, questionById, questions, reaction, sameAnswer, toJudge } from "./games";
import type { GameAnswer, GameRole } from "./games";
import { activityValues } from "./activities";

const row = (user_id: string, question_id: string, answer: string, role: GameRole = "self"): GameAnswer => ({ user_id, question_id, answer, role, created_at: "2026-11-25T10:00:00Z" });

describe("couple games", () => {
  it("has questions with unique ids, valid decks and a guess that names the other", () => {
    expect(questions.length).toBeGreaterThan(120);
    expect(new Set(questions.map((question) => question.id)).size).toBe(questions.length);
    questions.forEach((question) => {
      expect(question.id).toMatch(/^[a-z][0-9]{2,3}$/);
      expect(decks.some((deck) => deck.key === question.deck)).toBe(true);
      if (question.kind === "pair" && question.tastes) question.tastes.forEach((taste) => expect(activityValues).toContain(taste));
      if (question.kind === "know") {
        expect(question.guess).toContain("{n}");
        if (question.options) expect(new Set(question.options).size).toBe(question.options.length);
      }
    });
  });

  it("asks the guess first, naming the other one", () => {
    expect(promptFor(questionById("c01")!, "guess", "Marta")).toBe("Que comida é que Marta prefere?");
    expect(promptFor(questionById("c01")!, "self")).toBe("E tu, qual preferes?");
    expect(promptFor(questionById("q01")!)).toBe("Quem é mais provável de se perder mesmo com GPS?");
  });

  it("scores tapped guesses both ways", () => {
    const all = [row("me", "c01", "Japonesa"), row("me", "c01", "Italiana", "guess"), row("you", "c01", "Italiana"), row("you", "c01", "Portuguesa", "guess")];
    const { mine, theirs, bothAnswered } = answersFor(all, "c01", "me");
    expect(bothAnswered).toBe(true);
    expect(outcomeOf(questionById("c01")!, mine, theirs)).toEqual({ kind: "know", mine: "hit", theirs: "miss", iMustJudge: false });
    expect(knowScore(all, "me")).toEqual({ me: 1, partner: 0, rounds: 1 });
  });

  it("lets the one a written answer is about judge the guess, unless it's plainly the same", () => {
    expect(sameAnswer("O Titanic", "titanic!")).toBe(true);
    expect(sameAnswer("Titanic", "Avatar")).toBe(false);
    const all = [row("me", "t01", "Interstellar"), row("me", "t01", "titanic", "guess"), row("you", "t01", "O Titanic"), row("you", "t01", "Inception", "guess")];
    const { mine, theirs } = answersFor(all, "t01", "me");
    // My guess matched on its own; theirs waits for me.
    expect(outcomeOf(questionById("t01")!, mine, theirs)).toEqual({ kind: "know", mine: "hit", theirs: "pending", iMustJudge: true });
    expect(toJudge(all, "me")).toEqual(["t01"]);
    const judged = [...all, row("me", "t01", "close", "verdict")];
    const after = answersFor(judged, "t01", "me");
    expect(outcomeOf(questionById("t01")!, after.mine, after.theirs)).toMatchObject({ theirs: "close", iMustJudge: false });
    expect(toJudge(judged, "me")).toEqual([]);
    expect(knowScore(judged, "me")).toEqual({ me: 1, partner: 0.5, rounds: 1 });
  });

  it("gives the same daily question to both until one answers it", () => {
    const first = dailyQuestion("c1", "2026-11-25", new Set());
    expect(dailyQuestion("c1", "2026-11-25", new Set())).toEqual(first);
    expect(dailyQuestion("c1", "2026-11-25", new Set([first!.id]))?.id).not.toBe(first!.id);
  });

  it("plays first what the other is waiting on", () => {
    expect(nextInDeck("quem", new Set(), new Set(["q07"]))?.id).toBe("q07");
    expect(nextInDeck("quem", new Set(["q01"]), new Set())?.id).toBe("q02");
  });

  it("turns picks into tastes and self answers into gift hints", () => {
    const all = [row("me", "p02", "Spa"), row("you", "p02", "Escape room"), row("you", "c16", "Girassóis"), row("you", "c16", "Rosas", "guess"), row("you", "c01", "Italiana")];
    expect(gameTastes(all)).toEqual(["descansar", "jogar"]);
    expect(factsOf(all, "me", "partner", "gift")).toEqual([{ id: "c16", question: "As flores preferidas", answer: "Girassóis" }]);
  });

  it("picks reactions steadily", () => {
    expect(reaction("miss", "c01")).toEqual(reaction("miss", "c01"));
    expect(reaction("close", "t01").text.length).toBeGreaterThan(0);
  });
});
