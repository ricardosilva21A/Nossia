import { useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import { activityOf, legacyFields } from "./activities";
import type { Activity } from "./activities";
import { fetchFeatures, pickDiscoveries, tasteWeights } from "./discoveries";
import type { CoupleSignals, Vote } from "./preferences";
import { budgetLabel, durationLabel } from "./suggestions";
import type { DateIdea, Idea } from "./types";

const weekMs = 7 * 86400000;
export const discoveredTag = "descoberto";

// Once a week, whoever opens the app first looks around home for new places and saves up to five
// as ideas for the couple. They go to the front of the swipes. If OpenStreetMap doesn't answer,
// nothing happens and it tries again the next day.
export function useDiscoveries(input: {
  coupleId: string | undefined;
  location: { latitude: number; longitude: number } | null;
  catalog: Idea[];
  ideas: DateIdea[];
  votes: Vote[];
  signals: CoupleSignals;
  // Activities picked in "this or that": a light extra say in what gets found.
  extraLikes?: Activity[];
  onAdded: (ideas: Idea[]) => void;
}) {
  const running = useRef(false);
  const { coupleId, location, catalog } = input;
  const ready = Boolean(coupleId && location && catalog.length);

  useEffect(() => {
    if (!ready || !supabase || !coupleId || !location || running.current) return;
    const client = supabase;
    const today = new Date().toISOString().slice(0, 10);
    try {
      if (window.localStorage.getItem("nossia-discover-try") === today) return;
    } catch { /* storage blocked: try anyway */ }
    const discovered = catalog.filter((idea) => idea.created_by_couple_id === coupleId && (idea.tags ?? []).includes(discoveredTag));
    const last = Math.max(0, ...discovered.map((idea) => Date.parse(idea.created_at)));
    if (Date.now() - last < weekMs) return;

    running.current = true;
    try { window.localStorage.setItem("nossia-discover-try", today); } catch { /* fine */ }
    void (async () => {
      try {
        const knownRefs = new Set(catalog.flatMap((idea) => (idea.tags ?? []).filter((tag) => tag.startsWith("osm:")).map((tag) => tag.slice(4))));
        const byIdea = new Map(input.ideas.map((idea) => [idea.idea_id, activityOf(idea)]));
        const liked = [
          ...input.votes.filter((vote) => vote.vote === "like").map((vote) => byIdea.get(vote.idea_id)),
          ...Object.entries(input.signals.ideas).filter(([, signal]) => signal === "both_like").map(([id]) => byIdea.get(id)),
          ...(input.extraLikes ?? []),
        ].filter((activity): activity is Activity => Boolean(activity));
        const done = input.ideas.filter((idea) => idea.status === "completed").map((idea) => activityOf(idea));
        const features = await fetchFeatures(location.latitude, location.longitude);
        const picks = pickDiscoveries(features, { tastes: tasteWeights(liked, done), month: new Date().getMonth() + 1, knownRefs, limit: 5 });
        if (!picks.length) return;
        const rows = picks.map((pick) => ({
          created_by_couple_id: coupleId,
          title: pick.title,
          description: pick.description,
          ...legacyFields(pick.activity, false),
          activity: pick.activity,
          special: false,
          duration: durationLabel(pick.duration_minutes),
          duration_minutes: pick.duration_minutes,
          budget: budgetLabel(pick.budget_eur),
          budget_eur: pick.budget_eur,
          emoji: pick.emoji,
          at_home: false,
          travel_minutes: pick.travel_minutes,
          weather_setting: pick.weather_setting,
          repeatable: true,
          tags: [discoveredTag, `osm:${pick.ref}`],
          source_url: pick.source_url,
        }));
        const { data, error } = await client.from("ideas").insert(rows).select("*");
        if (!error && data) input.onAdded(data as Idea[]);
      } catch {
        // Offline or OpenStreetMap busy: tomorrow it tries again.
      } finally {
        running.current = false;
      }
    })();
    // Runs when the catalog first arrives (and after a week); the rest is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, coupleId]);
}
