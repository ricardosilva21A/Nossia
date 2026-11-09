import type { ReactNode } from "react";
import { ArrowRight, CalendarDays, Check, Clock, MapPin, Pencil, Popcorn, Shuffle, UtensilsCrossed } from "lucide-react";
import { HouseHero } from "./HouseHero";
import type { HouseScene } from "./house";
import type { Mascot } from "./mascots";
import { QuickAddBox } from "./QuickAddBox";
import type { QuickAddValue } from "./QuickAddBox";
import type { CoupleCommitment, DateIdea } from "./types";
import { budgetLabel, durationLabel } from "./suggestions";
import type { ScoredIdea } from "./suggestions";
import type { sharedFreeDays } from "./SchedulePanel";
type FreeDay = ReturnType<typeof sharedFreeDays>[number];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shortDay(key: string) {
  return new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${key}T12:00:00`));
}

export function TodayView({
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
  scene,
  mascots,
  deckSize,
  onOpenDeck,
  onOpenFridge,
  onOpenCalendar,
  onOpenWindow,
  partnerOneName,
  partnerTwoName,
  commitments,
  nextTrip,
  onQuickAdd,
  onMoreDetails,
  onPlanSuggestion,
  onAnotherSuggestion,
  onMarkDone,
  onEditDate,
  onOpenPlaces,
  onLogWatched,
  onOpenPlanned,
  onOpenAgenda,
}: {
  
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
  scene: HouseScene;
  mascots: Mascot[];
  deckSize: number;
  onOpenDeck: () => void;
  onOpenFridge: () => void;
  onOpenCalendar: () => void;
  onOpenWindow: () => void;
  partnerOneName: string;
  partnerTwoName: string;
  commitments: CoupleCommitment[];
  nextTrip: { title: string; days: number } | null;
  onQuickAdd: (value: QuickAddValue) => Promise<boolean>;
  onMoreDetails: (title: string) => void;
  onPlanSuggestion: (idea: DateIdea, date: string) => void;
  onAnotherSuggestion: () => void;
  onMarkDone: (id: string) => void;
  onEditDate: (id: string) => void;
  onOpenPlaces: () => void;
  onLogWatched: () => void;
  onOpenPlanned: () => void;
  onOpenAgenda: () => void;
}) {
  const now = new Date();
  const today = dateKey(now);
  const [nextDate, ...laterDates] = upcomingDates;
  const firstFreeDay = freeDays.find((freeDay) => freeDay.windows.length > 0 && freeDay.dates.length === 0);

  const nextCommitments = commitments.filter((commitment) => commitment.event_date >= today).sort((first, second) => first.event_date.localeCompare(second.event_date) || (first.starts_at ?? "").localeCompare(second.starts_at ?? "")).slice(0, 4);
  const partnerName = (slot: CoupleCommitment["for_partner"]) => slot === "partner_one" ? partnerOneName : slot === "partner_two" ? partnerTwoName : "Os dois";

  return (
    <div className="today-grid">
      <HouseHero scene={scene} mascots={mascots} names={{ partner_one: partnerOneName, partner_two: partnerTwoName }} onOpenFridge={onOpenFridge} onOpenCalendar={onOpenCalendar} onOpenWindow={onOpenWindow} bubble={suggestion ? <>
        <p className="house-bubble-title">{suggestionDate === today ? "Hoje" : shortDay(suggestionDate)}, que tal <strong>{suggestion.idea.emoji} {suggestion.idea.title}</strong>?</p>
        <p className="today-meta"><Clock size={16} aria-hidden="true" />{durationLabel(suggestion.idea.duration_minutes, suggestion.idea.duration)}<span aria-hidden="true">·</span>{budgetLabel(suggestion.idea.budget_eur)}</p>
        {suggestion.reasons[0] && <p className="panel-copy">{suggestion.reasons[0]}</p>}
        {!weatherKnown && <p className="suggestion-hint">Partilhem a localização mais abaixo para a sugestão ter em conta o tempo.</p>}
        <div className="panel-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={() => onPlanSuggestion(suggestion.idea, suggestionDate)}>Marcar</button><button type="button" className="button button-ghost" onClick={onAnotherSuggestion}><Shuffle size={16} aria-hidden="true" />Outra</button></div>
      </> : <p className="panel-copy">Já fizeram todas as ideias desta época. Acrescentem novas em Ideias.</p>} />
      <section className="panel today-next" aria-label={"Próximo date"}>
        <p className="panel-label">{"Próximo date"}</p>
        {overdueCount > 0 && <button type="button" className="overdue-note" onClick={onOpenPlanned}>{`${overdueCount} date${overdueCount === 1 ? "" : "s"} que já passou — marquem como feito ou apaguem`}<ArrowRight size={15} aria-hidden="true" /></button>}
        {nextDate ? <>
          <h2>{nextDate.emoji} {nextDate.title}</h2>
          <p className="today-meta"><CalendarDays size={16} aria-hidden="true" />{nextDate.planned_for ? shortDay(nextDate.planned_for) : "Dia por decidir"}{nextDate.planned_start_time && <><Clock size={16} aria-hidden="true" />{nextDate.planned_start_time.slice(0, 5)}</>}</p>
          {nextDate.location_name && <p className="today-meta"><MapPin size={16} aria-hidden="true" />{nextDate.location_name}</p>}
          <div className="panel-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={() => onMarkDone(nextDate.id)}><Check size={16} aria-hidden="true" />{"Já fizemos"}</button><button type="button" className="button button-ghost" onClick={() => onEditDate(nextDate.id)}><Pencil size={16} aria-hidden="true" />Alterar</button>{laterDates.length > 0 && <button type="button" className="button button-ghost" onClick={onOpenPlanned}>{`Mais ${laterDates.length} planeado${laterDates.length === 1 ? "" : "s"}`}<ArrowRight size={16} aria-hidden="true" /></button>}</div>
        </> : <>
          <h2>{"Nada marcado ainda"}</h2>
          <p className="panel-copy">{firstFreeDay
            ? `Estão os dois livres ${shortDay(firstFreeDay.key)}. Marquem algo já a seguir.`
            : "Marquem algo já a seguir, ou vejam as ideias."}</p>
        </>}
      </section>

      <section className="panel today-quick-add" aria-label="Marcar">
        <p className="panel-label">O que querem marcar?</p><div className="today-shortcuts"><button type="button" className="button button-ghost" onClick={onOpenPlaces}><UtensilsCrossed size={16} aria-hidden="true" />Jantar fora</button><button type="button" className="button button-ghost" onClick={onLogWatched}><Popcorn size={16} aria-hidden="true" />Vimos um filme ou série</button></div>
        <QuickAddBox partnerOneName={partnerOneName} partnerTwoName={partnerTwoName} busy={busy} onSubmit={onQuickAdd} onMoreDetails={onMoreDetails} />
      </section>

      {deckSize > 0 && <section className="panel today-swipes" aria-label="Escolher ideias">
        <p className="panel-label">A mascote quer conhecer-te</p>
        <p className="panel-copy">{deckSize} {deckSize === 1 ? "ideia" : "ideias"} para dizeres se te apetece ou não. Assim só recebem sugestões a sério.</p>
        <div className="panel-actions"><button type="button" className="button button-secondary" onClick={onOpenDeck}>Começar</button></div>
      </section>}

      {nextCommitments.length > 0 && <section className="panel today-commitments" aria-label="Compromissos">
        <div className="panel-heading"><p className="panel-label">Próximos compromissos</p><button type="button" className="button button-ghost" onClick={onOpenAgenda}>Agenda<ArrowRight size={16} aria-hidden="true" /></button></div>
        <ul className="special-dates">{nextCommitments.map((commitment) => <li key={commitment.id}><strong>{commitment.title}</strong><span>{commitment.event_date === today ? "Hoje" : shortDay(commitment.event_date)}{commitment.starts_at ? ` · ${commitment.starts_at.slice(0, 5)}` : ""} · {partnerName(commitment.for_partner)}</span></li>)}</ul>
      </section>}

      {(anniversary || birthdays.length > 0 || nextTrip) && <section className="panel today-dates" aria-label={"Datas especiais"}>
        <p className="panel-label">{"Datas especiais"}</p>
        <ul className="special-dates">
          {nextTrip && <li><strong>{nextTrip.days === 0 ? "Hoje" : `${nextTrip.days} ${nextTrip.days === 1 ? "dia" : "dias"}`}</strong><span>Viagem a {nextTrip.title}</span></li>}
          {anniversary && <li><strong>{anniversary.days === 0 ? "Hoje" : `${anniversary.days} dias`}</strong><span>{`Aniversário de namoro · ${anniversary.years} ${anniversary.years === 1 ? "ano" : "anos"}`}</span></li>}
          {birthdays.map((birthday) => <li key={birthday.name}><strong>{birthday.days === 0 ? "Hoje" : `${birthday.days} dias`}</strong><span>{`Anos de ${birthday.name}`}</span></li>)}
        </ul>
      </section>}

      {weather && <div className="today-weather">{weather}</div>}
    </div>
  );
}
