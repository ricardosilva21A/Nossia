// How a date went, in one place: the quick close and the memory form use the same three answers,
// and "would you repeat it" follows from them (it also tells the places list what they thought).

export type Verdict = { rating: number; emoji: string; label: string; wouldRepeat: boolean };

export const verdicts: Verdict[] = [
  { rating: 5, emoji: "😍", label: "Adorámos", wouldRepeat: true },
  { rating: 4, emoji: "🙂", label: "Foi bom", wouldRepeat: true },
  { rating: 3, emoji: "😐", label: "Mais ou menos", wouldRepeat: false },
];

// Memories saved before the emoji only had "repeat: yes / no".
export function verdictOf(date: { rating: number | null; would_repeat: boolean | null }): Verdict | null {
  const exact = verdicts.find((verdict) => verdict.rating === date.rating);
  if (exact) return exact;
  if (date.rating !== null) return date.rating > 3 ? verdicts[1] : verdicts[2];
  if (date.would_repeat === null) return null;
  return date.would_repeat ? verdicts[0] : verdicts[2];
}
