import type { ReactNode } from "react";
import { ArrowRight, CalendarDays, Check, Clock, MapPin, Shuffle } from "lucide-react";
import { QuickAddBox } from "./QuickAddBox";
import type { QuickAddValue } from "./QuickAddBox";
import type { CoupleCommitment, DateIdea } from "./types";
import { budgetLabel, durationLabel } from "./suggestions";
import type { ScoredIdea } from "./suggestions";
import type { sharedFreeDays } from "./SchedulePanel";

type Language = "en" | "pt";
type FreeDay = ReturnType<typeof sharedFreeDays>[number];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shortDay(key: string, language: Language) {
  return new Intl.DateTimeFormat(language === "pt" ? "pt-PT" : "en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${key}T12:00:00`));
}

export function TodayView({
  language,
  upcomingDates,
  overdueCount,
  freeDays,
  suggestion,
  suggestionDate,
  weatherKnown,
  busy,
  anniversary,
  birthdays,
  weather,
  partnerOneName,
  partnerTwoName,
  commitments,
  onQuickAdd,
  onMoreDetails,
  onPlanSuggestion,
  onAnotherSuggestion,
  onMarkDone,
  onOpenIdeas,
  onOpenPlanned,
  onOpenAgenda,
}: {
  language: Language;
  upcomingDates: DateIdea[];
  overdueCount: number;
  freeDays: FreeDay[];
  suggestion: ScoredIdea | null;
  suggestionDate: string;
  weatherKnown: boolean;
  busy: boolean;
  anniversary: { days: number; date: string; years: number } | null;
  birthdays: Array<{ name: string; date: string; days: number }>;
  weather: ReactNode;
  partnerOneName: string;
  partnerTwoName: string;
  commitments: CoupleCommitment[];
  onQuickAdd: (value: QuickAddValue) => Promise<boolean>;
  onMoreDetails: (title: string) => void;
  onPlanSuggestion: (idea: DateIdea, date: string) => void;
  onAnotherSuggestion: () => void;
  onMarkDone: (id: string) => void;
  onOpenIdeas: () => void;
  onOpenPlanned: () => void;
  onOpenAgenda: () => void;
}) {
  const pt = language === "pt";
  const now = new Date();
  const today = dateKey(now);
  const [nextDate, ...laterDates] = upcomingDates;
  const firstFreeDay = freeDays.find((freeDay) => freeDay.windows.length > 0 && freeDay.dates.length === 0);

  const nextCommitments = commitments.filter((commitment) => commitment.event_date >= today).sort((first, second) => first.event_date.localeCompare(second.event_date) || (first.starts_at ?? "").localeCompare(second.starts_at ?? "")).slice(0, 4);
  const partnerName = (slot: CoupleCommitment["for_partner"]) => slot === "partner_one" ? partnerOneName : slot === "partner_two" ? partnerTwoName : "Os dois";

  return (
    <div className="today-grid">
      <section className="panel today-next" aria-label={pt ? "Próximo date" : "Next date"}>
        <p className="panel-label">{pt ? "Próximo date" : "Next date"}</p>
        {overdueCount > 0 && <button type="button" className="overdue-note" onClick={onOpenPlanned}>{pt ? `${overdueCount} date${overdueCount === 1 ? "" : "s"} que já passou — marquem como feito ou apaguem` : `${overdueCount} past date${overdueCount === 1 ? "" : "s"} — mark done or delete`}<ArrowRight size={15} aria-hidden="true" /></button>}
        {nextDate ? <>
          <h2>{nextDate.emoji} {nextDate.title}</h2>
          <p className="today-meta"><CalendarDays size={16} aria-hidden="true" />{nextDate.planned_for ? shortDay(nextDate.planned_for, language) : pt ? "Dia por decidir" : "Day to decide"}{nextDate.planned_start_time && <><Clock size={16} aria-hidden="true" />{nextDate.planned_start_time.slice(0, 5)}</>}</p>
          {nextDate.location_name && <p className="today-meta"><MapPin size={16} aria-hidden="true" />{nextDate.location_name}</p>}
          <div className="panel-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={() => onMarkDone(nextDate.id)}><Check size={16} aria-hidden="true" />{pt ? "Já fizemos" : "We did it"}</button>{laterDates.length > 0 && <button type="button" className="button button-ghost" onClick={onOpenPlanned}>{pt ? `Mais ${laterDates.length} planeado${laterDates.length === 1 ? "" : "s"}` : `${laterDates.length} more planned`}<ArrowRight size={16} aria-hidden="true" /></button>}</div>
        </> : <>
          <h2>{pt ? "Nada marcado ainda" : "Nothing planned yet"}</h2>
          <p className="panel-copy">{firstFreeDay
            ? pt ? `Estão os dois livres ${shortDay(firstFreeDay.key, language)}. Marquem algo já a seguir.` : `You're both free on ${shortDay(firstFreeDay.key, language)}. Plan something alongside.`
            : pt ? "Marquem algo já a seguir, ou vejam as ideias." : "Plan something alongside, or browse ideas."}</p>
        </>}
      </section>

      <section className="panel today-quick-add" aria-label="Marcar">
        <p className="panel-label">O que querem marcar?</p>
        <QuickAddBox partnerOneName={partnerOneName} partnerTwoName={partnerTwoName} busy={busy} onSubmit={onQuickAdd} onMoreDetails={onMoreDetails} />
      </section>

      <section className="panel today-suggestion" aria-label={pt ? "Sugestão" : "Suggestion"}>
        <div className="panel-heading"><p className="panel-label">Sugestão para {suggestionDate === today ? "hoje" : shortDay(suggestionDate, language)}</p><button type="button" className="icon-button" aria-label={pt ? "Outra sugestão" : "Another idea"} onClick={onAnotherSuggestion}><Shuffle size={18} aria-hidden="true" /></button></div>
        {suggestion ? <>
          <h2>{suggestion.idea.emoji} {suggestion.idea.title}</h2>
          {suggestion.idea.description && <p className="panel-copy">{suggestion.idea.description}</p>}
          <p className="today-meta"><Clock size={16} aria-hidden="true" />{durationLabel(suggestion.idea.duration_minutes, suggestion.idea.duration)}<span aria-hidden="true">·</span>{budgetLabel(suggestion.idea.budget_eur)}</p>
          {suggestion.reasons.length > 0 && <ul className="suggestion-reasons">{suggestion.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
          {!weatherKnown && <p className="suggestion-hint">Partilhem a localização mais abaixo para a sugestão ter em conta o tempo.</p>}
          <div className="panel-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={() => onPlanSuggestion(suggestion.idea, suggestionDate)}>Marcar para {suggestionDate === today ? "hoje" : shortDay(suggestionDate, language)}</button><button type="button" className="button button-ghost" onClick={onOpenIdeas}>Ver ideias<ArrowRight size={16} aria-hidden="true" /></button></div>
        </> : <p className="panel-copy">Já fizeram todas as ideias desta época. Acrescentem novas em Ideias.</p>}
      </section>

      {nextCommitments.length > 0 && <section className="panel today-commitments" aria-label="Compromissos">
        <div className="panel-heading"><p className="panel-label">Próximos compromissos</p><button type="button" className="button button-ghost" onClick={onOpenAgenda}>Agenda<ArrowRight size={16} aria-hidden="true" /></button></div>
        <ul className="special-dates">{nextCommitments.map((commitment) => <li key={commitment.id}><strong>{commitment.title}</strong><span>{commitment.event_date === today ? "Hoje" : shortDay(commitment.event_date, language)}{commitment.starts_at ? ` · ${commitment.starts_at.slice(0, 5)}` : ""} · {partnerName(commitment.for_partner)}</span></li>)}</ul>
      </section>}

      {(anniversary || birthdays.length > 0) && <section className="panel today-dates" aria-label={pt ? "Datas especiais" : "Special dates"}>
        <p className="panel-label">{pt ? "Datas especiais" : "Special dates"}</p>
        <ul className="special-dates">
          {anniversary && <li><strong>{anniversary.days === 0 ? pt ? "Hoje" : "Today" : pt ? `${anniversary.days} dias` : `${anniversary.days} days`}</strong><span>{pt ? `Aniversário de namoro · ${anniversary.years} ${anniversary.years === 1 ? "ano" : "anos"}` : `Anniversary · ${anniversary.years} ${anniversary.years === 1 ? "year" : "years"}`}</span></li>}
          {birthdays.map((birthday) => <li key={birthday.name}><strong>{birthday.days === 0 ? pt ? "Hoje" : "Today" : pt ? `${birthday.days} dias` : `${birthday.days} days`}</strong><span>{pt ? `Anos de ${birthday.name}` : `${birthday.name}'s birthday`}</span></li>)}
        </ul>
      </section>}

      {weather && <div className="today-weather">{weather}</div>}
    </div>
  );
}
