import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import { notifyPartner } from "./coupleHooks";
import { track } from "./usage";
import { answersFor, isWritten, outcomeOf, questionById, toJudge } from "./games";
import type { GameAnswer, GameQuestion, Verdict } from "./games";

// The couple's game answers this person can see (theirs, and the other's once revealed),
// which questions the other one is waiting on, which written guesses about me I still have to
// judge, and which reveals were already seen here.

// v2: the questions were rewritten and the old answers cleared, so old "seen" marks no longer apply.
const seenKey = (userId: string) => `nossia-game-seen-v2-${userId}`;
const columns = "question_id, user_id, role, answer, created_at";

function readSeen(userId: string) {
  try {
    return new Set<string>(JSON.parse(window.localStorage.getItem(seenKey(userId)) ?? "[]") as string[]);
  } catch {
    return new Set<string>();
  }
}

export function useGames(coupleId: string | undefined, userId: string | undefined, refresh: unknown) {
  const [answers, setAnswers] = useState<GameAnswer[]>([]);
  const [waiting, setWaiting] = useState<Set<string>>(new Set());
  const [seen, setSeen] = useState<Set<string>>(() => (userId ? readSeen(userId) : new Set()));

  const reload = useCallback(async () => {
    if (!supabase || !coupleId) return;
    const [list, pending] = await Promise.all([
      supabase.from("game_answers").select(columns).eq("couple_id", coupleId),
      supabase.rpc("game_waiting"),
    ]);
    if (!list.error) setAnswers((list.data ?? []) as GameAnswer[]);
    if (!pending.error) setWaiting(new Set((pending.data ?? []) as string[]));
  }, [coupleId]);

  useEffect(() => {
    let active = true;
    void (async () => { if (active) await reload(); })();
    return () => { active = false; };
  }, [reload, refresh]);

  const answered = useMemo(() => new Set(answers.filter((answer) => answer.user_id === userId && answer.role !== "verdict").map((answer) => answer.question_id)), [answers, userId]);

  // Something new to see: both answered and I haven't looked yet ("<id>"), or the other one has
  // just said whether my written guess was right ("<id>:v").
  const reveals = useMemo(() => {
    if (!userId) return [];
    const ids = [...new Set(answers.map((answer) => answer.question_id))];
    return ids.flatMap((id) => {
      const { mine, theirs, bothAnswered } = answersFor(answers, id, userId);
      if (!bothAnswered) return [];
      if (!seen.has(id)) return [id];
      const question = questionById(id);
      if (question && isWritten(question) && theirs.verdict !== undefined && !seen.has(`${id}:v`)) {
        const outcome = outcomeOf(question, mine, theirs);
        if (outcome.kind === "know" && outcome.mine !== "pending") return [`${id}:v`];
      }
      return [];
    });
  }, [answers, seen, userId]);

  const judging = useMemo(() => (userId ? toJudge(answers, userId) : []), [answers, userId]);

  const markSeen = useCallback((key: string) => {
    if (!userId) return;
    setSeen((current) => {
      if (current.has(key)) return current;
      const next = new Set(current).add(key);
      try { window.localStorage.setItem(seenKey(userId), JSON.stringify([...next].slice(-600))); } catch { /* shows again next time */ }
      return next;
    });
  }, [userId]);

  const answer = useCallback(async (question: GameQuestion, values: { self: string; guess?: string }) => {
    if (!supabase || !coupleId || !userId) return false;
    const rows = [
      { couple_id: coupleId, question_id: question.id, role: "self", answer: values.self.trim() },
      ...(values.guess ? [{ couple_id: coupleId, question_id: question.id, role: "guess", answer: values.guess.trim() }] : []),
    ];
    const { error } = await supabase.from("game_answers").insert(rows);
    if (error) return false;
    track(`game:${question.deck}`);
    // Reload: the other one's answer becomes readable now that this one is in.
    await reload();
    void notifyPartner("/api/game", { question_id: question.id });
    return true;
  }, [coupleId, userId, reload]);

  // Whether the other one's written guess about me was right.
  const judge = useCallback(async (question: GameQuestion, verdict: Verdict) => {
    if (!supabase || !coupleId || !userId) return false;
    const { error } = await supabase.from("game_answers").insert({ couple_id: coupleId, question_id: question.id, role: "verdict", answer: verdict });
    if (error) return false;
    track("game:judged");
    await reload();
    void notifyPartner("/api/game", { question_id: question.id });
    return true;
  }, [coupleId, userId, reload]);

  return { answers, answered, waiting, reveals, judging, markSeen, answer, judge };
}
