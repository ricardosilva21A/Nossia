import { activeSeasonFor, isIdeaInSeason, seasons } from "./seasons";
import type { DateIdea, Mood } from "./types";
import { activityOf } from "./activities";
import type { Activity } from "./activities";
import { activityWeatherAdvice, activityWeatherReason } from "./weather";
import type { DailyWeather } from "./weather";

import { isHiddenByCouple, preferenceEffect } from "./preferences";
import type { CoupleSignals } from "./preferences";

export type SuggestionContext = {
  date: string;
  forecast: DailyWeather | undefined;
  // Longest stretch both are free that day, or null when unknown.
  freeMinutes: number | null;
  categoryCounts: Map<Activity, number>;
  signals?: CoupleSignals;
};

export type ScoredIdea = { idea: DateIdea; score: number; reasons: string[] };

type FreeDayLike = { day: Date; key: string; windows: Array<{ start: number; end: number }>; dates: unknown[]; commitments?: Array<{ starts_at: string | null }> };

const shortestUsefulWindow = 120;

export function longestWindow(windows: FreeDayLike["windows"]) {
  return windows.reduce((longest, window) => Math.max(longest, window.end - window.start), 0);
}

// Ideas not done or planned yet that make sense on this date.
export function ideasForDate(ideas: DateIdea[], date: string) {
  return ideas.filter((idea) => idea.status === "idea" && isIdeaInSeason(idea.seasons, date));
}

export function completedCategoryCounts(ideas: DateIdea[]) {
  const counts = new Map<Activity, number>();
  for (const idea of ideas) {
    if (idea.status === "completed") counts.set(activityOf(idea), (counts.get(activityOf(idea)) ?? 0) + 1);
  }
  return counts;
}

export function scoreIdea(idea: DateIdea, context: SuggestionContext): ScoredIdea {
  const advice = activityWeatherAdvice(idea, context.forecast);
  const reasons: string[] = [];
  let score = context.forecast ? advice.score : 60;

  const season = activeSeasonFor(idea.seasons, context.date);
  if (season) {
    score += seasons[season].event ? 35 : 8;
    reasons.push(seasons[season].reason);
  }

  if (context.forecast) {
    const firstReason = advice.reasons[0];
    const rainLikely = context.forecast.precipitationProbability >= 40;
    if (advice.label === "indoor" && rainLikely) reasons.push("Deve chover, e isto é em interior");
    else if ((advice.label === "great" || advice.label === "good") && firstReason) reasons.push(activityWeatherReason(firstReason));
  }

  if (context.freeMinutes !== null && idea.duration_minutes !== null) {
    if (idea.duration_minutes > context.freeMinutes) score -= 50;
    else {
      score += 5;
      reasons.push("Cabe no tempo livre dos dois");
    }
  }

  score += Math.min(10, (context.categoryCounts.get(activityOf(idea)) ?? 0) * 2);
  if (context.signals) {
    const effect = preferenceEffect(idea, context.signals);
    score += effect.adjustment;
    if (effect.reason) reasons.unshift(effect.reason);
  }
  return { idea, score, reasons: reasons.slice(0, 3) };
}

export function rankIdeas(ideas: DateIdea[], context: SuggestionContext) {
  return ideas
    .filter((idea) => !context.signals || !isHiddenByCouple(idea.idea_id, context.signals))
    .map((idea, index) => ({ scored: scoreIdea(idea, context), index }))
    .sort((first, second) => second.scored.score - first.scored.score || first.index - second.index)
    .map(({ scored }) => scored);
}

// Random, but better ideas are much more likely, so a draw still feels like a surprise.
export function pickWeighted(ranked: ScoredIdea[], random = Math.random) {
  const weights = ranked.map(({ score }) => Math.max(score, 1) ** 2);
  let choice = random() * weights.reduce((total, weight) => total + weight, 0);
  for (let index = 0; index < ranked.length; index += 1) {
    choice -= weights[index];
    if (choice < 0) return ranked[index];
  }
  return ranked[ranked.length - 1];
}

// The next good day to suggest for: a free weekend day first, then any free day.
export function chooseSuggestionDay<Day extends FreeDayLike>(freeDays: Day[]) {
  const usable = freeDays.filter((freeDay) => freeDay.dates.length === 0 && !freeDay.commitments?.some((commitment) => !commitment.starts_at) && longestWindow(freeDay.windows) >= shortestUsefulWindow);
  return usable.find((freeDay) => freeDay.day.getDay() === 6 || freeDay.day.getDay() === 0)
    ?? usable[0]
    ?? freeDays.find((freeDay) => freeDay.day.getDay() === 6)
    ?? freeDays[0];
}

export function durationLabel(minutes: number | null, fallback = "") {
  if (minutes === null) return fallback;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours}h${String(rest).padStart(2, "0")}`;
}

export function budgetLabel(euros: number | null | undefined) {
  if (euros === null || euros === undefined) return "A definir";
  if (euros === 0) return "Grátis";
  return euros <= 10 ? "€" : euros <= 30 ? "€€" : "€€€";
}

export const moodLabels: Record<Mood, string> = {
  Romantic: "Romântico",
  Fun: "Divertido",
  Relaxing: "Relaxante",
  Adventure: "Aventura",
  Creative: "Criativo",
  "Surprise me": "Surpreendam-me",
};
