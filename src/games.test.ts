import { describe, expect, it } from "vitest";
import { answersFor, dailyQuestion, decks, factsOf, gameTastes, knowScore, nextInDeck, outcomeOf, promptFor, questionById, questions, reaction } from "./games";
import type { GameAnswer } from "./games";
import { activityValues } from "./activities";

const row = (user_id: string, question_id: string, answer: string, role: "self" | "guess" = "self"): GameAnswer => ({ user_id, question_id, answer, role, created_at: "2026-11-13T10:00:00Z" });

describe("couple games", () => {
  it("has 150 questions with unique ids, valid decks and short-id format", () => {
    expect(questions).toHaveLength(150);
    expect(new Set(questions.map((question) => question.id)).size).toBe(150);
    questions.forEach((question) => {
      expect(question.id).toMatch(/^[a-z][0-9]{2,3}$/);
      expect(decks.some((deck) => deck.key === question.deck)).toBe(true);
      if (question.kind === "pair" && question.tastes) question.tastes.forEach((taste) => expect(activityValues).toContain(taste));
      if (question.kind === "know") {
        expect(question.guess).toContain("{n}");
        expect(new Set(question.options).size).toBe(question.options.length);
      }
    });
  });

  it("writes the guess half with the other's name", () => {
    expect(promptFor(questionById("k01")!, "guess", "Marta")).toBe("Qual é a comida preferida de Marta?");
    expect(promptFor(questionById("q01")!)).toBe("Quem é mais provável de se perder mesmo com GPS?");
  });

  it("scores guesses both ways", () => {
    const all = [row("me", "k01", "Sushi"), row("me", "k01", "Pizza", "guess"), row("you", "k01", "Pizza"), row("you", "k01", "Massa", "guess")];
    const { mine, theirs, bothAnswered } = answersFor(all, "k01", "me");
    expect(bothAnswered).toBe(true);
    expect(outcomeOf(questionById("k01")!, mine, theirs)).toEqual({ kind: "know", myGuessHit: true, theirGuessHit: false });
    expect(knowScore(all, "me")).toEqual({ me: 1, partner: 0, rounds: 1 });
  });

  it("gives the same daily question to both until one answers it", () => {
    const first = dailyQuestion("c1", "2026-11-13", new Set());
    expect(dailyQuestion("c1", "2026-11-13", new Set())).toEqual(first);
    expect(dailyQuestion("c1", "2026-11-13", new Set([first!.id]))?.id).not.toBe(first!.id);
  });

  it("plays first what the other is waiting on", () => {
    expect(nextInDeck("quem", new Set(), new Set(["q07"]))?.id).toBe("q07");
    expect(nextInDeck("quem", new Set(["q01"]), new Set())?.id).toBe("q02");
  });

  it("turns picks into tastes and self answers into gift hints", () => {
    const all = [row("me", "p02", "Spa"), row("you", "p02", "Escape room"), row("you", "k03", "Girassóis"), row("you", "k03", "Rosas", "guess"), row("you", "k01", "Pizza")];
    expect(gameTastes(all)).toEqual(["descansar", "jogar"]);
    expect(factsOf(all, "me", "partner", "gift")).toEqual([{ id: "k03", question: "Que flores preferes?", answer: "Girassóis" }]);
  });

  it("picks reactions steadily", () => {
    expect(reaction("miss", "k01")).toEqual(reaction("miss", "k01"));
    expect(reaction("miss", "k01").text.length).toBeGreaterThan(0);
  });
});
