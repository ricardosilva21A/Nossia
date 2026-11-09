import { isSeasonActive } from "./seasons";
import type { DateIdea, SeasonKey } from "./types";

export type Vote = { idea_id: string; vote: "like" | "pass"; updated_at: string };
export type CoupleSignals = { ideas: Record<string, "both_like" | "both_pass" | "less">; avoided_tags: string[] };

export const noSignals: CoupleSignals = { ideas: {}, avoided_tags: [] };

const firstDeckSize = 15;
const weeklyDeckSize = 5;
const weekMs = 7 * 24 * 60 * 60 * 1000;

const bothLikeBonus = 40;
const lessPenalty = 15;
const avoidedTagPenalty = 25;

export function isHiddenByCouple(ideaId: string, signals: CoupleSignals) {
  return signals.ideas[ideaId] === "both_pass";
}

export function preferenceEffect(idea: Pick<DateIdea, "idea_id" | "tags">, signals: CoupleSignals) {
  const status = signals.ideas[idea.idea_id];
  if (status === "both_like") return { adjustment: bothLikeBonus, reason: "Vocês os dois querem isto" };
  const avoided = (idea.tags ?? []).some((tag) => signals.avoided_tags.includes(tag));
  return { adjustment: 0 - (status === "less" ? lessPenalty : 0) - (avoided ? avoidedTagPenalty : 0), reason: null };
}

function shuffle<T>(items: T[], random: () => number) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

// Which cards to offer now: a first set, then a few a week.
export function buildDeck(ideas: DateIdea[], votes: Vote[], today: string, now: Date, random = Math.random) {
  const voted = new Set(votes.map((vote) => vote.idea_id));
  const seen = new Set<string>();
  const unseen = ideas.filter((idea) => {
    if (idea.status !== "idea" || voted.has(idea.idea_id) || seen.has(idea.idea_id)) return false;
    seen.add(idea.idea_id);
    return true;
  });
  const inSeason = (idea: DateIdea) => idea.seasons.some((season: SeasonKey) => isSeasonActive(season, today));
  const outOfSeason = (idea: DateIdea) => idea.seasons.length > 0 && !inSeason(idea);
  const ordered = [...shuffle(unseen.filter(inSeason), random), ...shuffle(unseen.filter((idea) => !inSeason(idea) && !outOfSeason(idea)), random)];

  let size: number;
  if (votes.length < firstDeckSize) size = firstDeckSize - votes.length;
  else {
    const latest = Math.max(...votes.map((vote) => new Date(vote.updated_at).getTime()));
    size = now.getTime() - latest >= weekMs ? weeklyDeckSize : 0;
  }
  return ordered.slice(0, size);
}
