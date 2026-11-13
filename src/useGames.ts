import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import { notifyPartner } from "./coupleHooks";
import { track } from "./usage";
import { answersFor } from "./games";
import type { GameAnswer, GameQuestion } from "./games";

// The couple's game answers this person can see (theirs, and the other's once revealed),
// which questions the other one is waiting on, and which reveals were already seen here.

const seenKey = (userId: string) => `nossia-game-seen-${userId}`;

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

  useEffect(() => {
    if (!supabase || !coupleId) return;
    let active = true;
    void Promise.all([
      supabase.from("game_answers").select("question_id, user_id, role, answer, created_at").eq("couple_id", coupleId),
      supabase.rpc("game_waiting"),
    ]).then(([list, pending]) => {
      if (!active) return;
      if (!list.error) setAnswers((list.data ?? []) as GameAnswer[]);
      if (!pending.error) setWaiting(new Set((pending.data ?? []) as string[]));
    });
    return () => { active = false; };
  }, [coupleId, refresh]);

  const answered = useMemo(() => new Set(answers.filter((answer) => answer.user_id === userId).map((answer) => answer.question_id)), [answers, userId]);
  // Both answered, and this person hasn't seen how it went yet.
  const reveals = useMemo(() => {
    if (!userId) return [];
    const ids = [...new Set(answers.map((answer) => answer.question_id))];
    return ids.filter((id) => !seen.has(id) && answersFor(answers, id, userId).bothAnswered);
  }, [answers, seen, userId]);

  const markSeen = useCallback((questionId: string) => {
    if (!userId) return;
    setSeen((current) => {
      if (current.has(questionId)) return current;
      const next = new Set(current).add(questionId);
      try { window.localStorage.setItem(seenKey(userId), JSON.stringify([...next].slice(-400))); } catch { /* shows again next time */ }
      return next;
    });
  }, [userId]);

  const answer = useCallback(async (question: GameQuestion, values: { self: string; guess?: string }) => {
    if (!supabase || !coupleId || !userId) return false;
    const rows = [
      { couple_id: coupleId, question_id: question.id, role: "self", answer: values.self.trim() },
      ...(values.guess ? [{ couple_id: coupleId, question_id: question.id, role: "guess", answer: values.guess }] : []),
    ];
    const { error } = await supabase.from("game_answers").insert(rows);
    if (error) return false;
    track(`game:${question.deck}`);
    // Reload: the other one's answer becomes readable now that this one is in.
    const [{ data }, pending] = await Promise.all([
      supabase.from("game_answers").select("question_id, user_id, role, answer, created_at").eq("couple_id", coupleId),
      supabase.rpc("game_waiting"),
    ]);
    setAnswers((data ?? []) as GameAnswer[]);
    if (!pending.error) setWaiting(new Set((pending.data ?? []) as string[]));
    void notifyPartner("/api/game", { question_id: question.id });
    return true;
  }, [coupleId, userId]);

  return { answers, answered, waiting, reveals, markSeen, answer };
}
