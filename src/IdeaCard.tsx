import { CalendarDays, Check, Clock, Pencil, Trash2 } from "lucide-react";
import { activityLabel, activityOf, isSpecial } from "./activities";
import { formatDate } from "./dateUtils";
import { isProposal, waitingOnPartner } from "./proposals";
import { activeSeasonFor, seasons as seasonDetails } from "./seasons";
import { siteName } from "./share";
import { budgetLabel, durationLabel } from "./suggestions";
import type { DateIdea } from "./types";
import { verdictOf } from "./verdicts";

// One card in the ideas, planned and memories lists. What it offers depends on where the date is:
// an idea to plan, a planned date (or a proposal to answer), or a memory with its album.

export type IdeaCardActions = {
  onPlan: (idea: DateIdea) => void;
  onEditPlan: (idea: DateIdea) => void;
  onEditMemory: (idea: DateIdea) => void;
  onEditIdea: (idea: DateIdea) => void;
  onDelete: (idea: DateIdea) => void;
  onAccept: (id: string) => Promise<boolean>;
  onDecline: (id: string) => Promise<boolean>;
  onDone: (id: string) => void;
  onAlbum: (idea: DateIdea) => Promise<void> | void;
  onHome: (idea: DateIdea) => void;
};

type Props = {
  idea: DateIdea;
  index: number;
  view: string;
  todayDate: string;
  busy: boolean;
  myUserId: string;
  partnerName: string;
  partnerHasPush: boolean | null;
  photoCount: number;
  actions: IdeaCardActions;
};

export function IdeaCard({ idea, index, view, todayDate, busy, myUserId, partnerName, partnerHasPush, photoCount, actions }: Props) {
  return (
    <article className="idea-card" style={{ animationDelay: `${index * 45}ms` }}>
                  <div className={`idea-art art-${index % 6}`}><span className="idea-emoji">{idea.emoji}</span><span className="category-label">{activityLabel(activityOf(idea))}{isSpecial(idea) ? " · ✨" : ""}</span>{idea.status === "idea" && activeSeasonFor(idea.seasons, todayDate) && <span className="season-label">{seasonDetails[activeSeasonFor(idea.seasons, todayDate)!].label}</span>}{idea.status === "planned" && <span className="planned-label">PLANEADO</span>}{idea.status === "completed" && <span className="completed-label">FEITO</span>}</div>
                  <div className="idea-body"><div className="idea-title-row"><h3>{idea.title}</h3>{(idea.status !== "idea" || idea.is_own_idea) && <div className="idea-management"><button type="button" aria-label={`Editar ${idea.title}`} title={idea.status === "idea" ? "Editar ideia" : "Alterar"} onClick={() => idea.status === "planned" ? actions.onEditPlan(idea) : idea.status === "completed" ? actions.onEditMemory(idea) : actions.onEditIdea(idea)}><Pencil size={15} aria-hidden="true" /></button><button type="button" aria-label={`Apagar ${idea.title}`} title={"Apagar"} onClick={() => actions.onDelete(idea)}><Trash2 size={15} aria-hidden="true" /></button></div>}</div><p className="idea-description">{idea.description}</p>{idea.source_url && <a className="idea-source" href={idea.source_url} target="_blank" rel="noreferrer">Ver no {siteName(idea.source_url)}</a>}{idea.planned_for && <p className="planned-date"><CalendarDays size={15} aria-hidden="true" />{formatDate(idea.planned_for)}{idea.planned_start_time ? ` · ${idea.planned_start_time.slice(0, 5)}` : ""}</p>}{idea.status === "planned" && isProposal(idea) && (waitingOnPartner(idea, myUserId)
                      ? <p className="proposal-tag">À espera de {partnerName}{partnerHasPush === false ? " · vê quando abrir a app" : ""}</p>
                      : <div className="proposal-card-actions"><p className="proposal-tag">Proposta de {partnerName}</p><div><button type="button" className="card-action" disabled={busy} onClick={() => void actions.onAccept(idea.id)}>Aceitar</button><button type="button" className="card-action" disabled={busy} onClick={() => actions.onEditPlan(idea)}>Outro dia</button><button type="button" className="card-action undo-action" disabled={busy} onClick={() => void actions.onDecline(idea.id)}>Agora não</button></div></div>)}
                    {view === "memories" && (idea.memory || idea.location_name || verdictOf(idea) || idea.watched_title || idea.food_notes) && <div className="memory-details">{verdictOf(idea) && <span className={verdictOf(idea)!.wouldRepeat ? "repeat-yes" : "repeat-no"}>{verdictOf(idea)!.emoji} {verdictOf(idea)!.label}</span>}{idea.watched_title && <span>🎬 {idea.watched_title}</span>}{idea.food_notes && <span>🍽️ {idea.food_notes}</span>}{idea.location_name && <span>⌖ {idea.location_name}</span>}{idea.memory && <p>{idea.memory}</p>}</div>}
                    <div className="idea-footer"><div className="idea-meta"><Clock size={14} aria-hidden="true" /><span>{durationLabel(idea.duration_minutes, idea.duration)}</span><i /><span>{budgetLabel(idea.budget_eur)}</span></div>{idea.status === "idea" ? <button className="card-action" disabled={busy} onClick={() => actions.onPlan(idea)}>Marcar</button> : idea.status === "planned" ? <button className="card-action done-action" disabled={busy} onClick={() => actions.onDone(idea.id)}><Check size={15} aria-hidden="true" />Já fizemos</button> : <div className="memory-card-actions"><button className="card-action album-action" disabled={busy} onClick={() => void actions.onAlbum(idea)}>{"Álbum"} ({photoCount})</button><button className="card-action" disabled={busy} onClick={() => actions.onHome(idea)}>{idea.home_partner ? "Alterar casa" : "Definir casa"}</button><button className="card-action undo-action" disabled={busy} onClick={() => actions.onPlan(idea)}>Repetir</button></div>}</div>
                  </div>
                </article>
  );
}
