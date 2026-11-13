import { ArrowRight } from "lucide-react";
import { activityLabel, activityOf } from "./activities";
import { budgetLabel, durationLabel } from "./suggestions";
import type { DateIdea } from "./types";

// Explorar without the whole catalogue on show: a few short rows of ideas worth a look now.
// Each card opens the plan straight away.

type Row = { key: string; title: string; hint?: string; ideas: DateIdea[] };

export function ExploreRows({ rows, onPick }: { rows: Row[]; onPick: (idea: DateIdea) => void }) {
  const shown = rows.filter((row) => row.ideas.length > 0);
  if (!shown.length) return null;
  return (
    <div className="explore-rows">
      {shown.map((row) => <section key={row.key} className="explore-row" aria-label={row.title}>
        <div className="explore-row-head"><h2>{row.title}</h2>{row.hint && <small>{row.hint}</small>}</div>
        <ul>
          {row.ideas.map((idea) => <li key={idea.id}>
            <button type="button" className="explore-card" onClick={() => onPick(idea)}>
              <span className="explore-card-emoji" aria-hidden="true">{idea.emoji}</span>
              <strong>{idea.title}</strong>
              <small>{activityLabel(activityOf(idea))} · {durationLabel(idea.duration_minutes, idea.duration)} · {budgetLabel(idea.budget_eur)}</small>
              <span className="explore-card-go">Marcar <ArrowRight size={14} aria-hidden="true" /></span>
            </button>
          </li>)}
        </ul>
      </section>)}
    </div>
  );
}
