import { useState } from "react";
import { DialogSection } from "./useDialog";
import type { ReactNode } from "react";
import { ArrowRight, Bell, CalendarDays, Check, Clock, Heart, Lightbulb, MapPin, Pencil, Shuffle } from "lucide-react";
import { HouseHero } from "./HouseHero";
import { waitingOnPartner } from "./proposals";
import type { HouseActions } from "./HouseHero";
import type { DailyWeather } from "./weather";
import type { PushStatus } from "./push";
import { summaryLine } from "./monthSummary";
import type { MonthSummary } from "./monthSummary";
import type { CalendarData, HouseScene, TripPin } from "./house";
import type { Mascot, Pet } from "./mascots";
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

function shortWeekday(key: string) {
  const name = new Intl.DateTimeFormat("pt-PT", { weekday: "short", day: "numeric" }).format(new Date(`${key}T12:00:00`));
  return name.charAt(0).toLocaleUpperCase("pt-PT") + name.slice(1);
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
  pet,
  pins,
  calendar,
  houseActions,
  forecast,
  weatherPlace,
  deckSize,
  onOpenDeck,
  onOpenCalendar,
  onPlanTrip,
  onOpenWorldMap,
  onOpenWindow,
  partnerOneName,
  partnerTwoName,
  commitments,
  nextTrip,
  nextEvent,
  onOpenEvents,
  onQuickAdd,
  onMoreDetails,
  onPlanSuggestion,
  onAnotherSuggestion,
  onMarkDone,
  proposal,
  myUserId,
  onAcceptProposal,
  onMoveProposal,
  onDeclineProposal,
  myPush,
  partnerHasPush,
  onOpenNotifications,
  monthSummary,
  onOpenInsights,
  onEditDate,
  onOpenPlaces,
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
  pet: Pet | null;
  pins: TripPin[];
  houseActions: HouseActions;
  forecast: DailyWeather[];
  weatherPlace: string | null;
  calendar: CalendarData;
  deckSize: number;
  onOpenDeck: () => void;
  onOpenCalendar: () => void;
  onPlanTrip: () => void;
  onOpenWorldMap: () => void;
  onOpenWindow: () => void;
  partnerOneName: string;
  partnerTwoName: string;
  commitments: CoupleCommitment[];
  nextTrip: { title: string; days: number } | null;
  nextEvent: { title: string; date: string } | null;
  onOpenEvents: () => void;
  onQuickAdd: (value: QuickAddValue) => Promise<boolean>;
  onMoreDetails: (title: string) => void;
  onPlanSuggestion: (idea: DateIdea, date: string) => void;
  onAnotherSuggestion: () => void;
  onMarkDone: (id: string) => void;
  // A date the other one proposed that this person still has to answer.
  proposal: DateIdea | null;
  myUserId: string;
  onAcceptProposal: (id: string) => Promise<boolean>;
  onMoveProposal: (id: string, date: string, time: string | null) => Promise<boolean>;
  onDeclineProposal: (id: string) => Promise<boolean>;
  myPush: PushStatus | null;
  partnerHasPush: boolean | null;
  onOpenNotifications: () => void;
  // The month that just ended, shown for the first week of the new one.
  monthSummary: MonthSummary | null;
  onOpenInsights: () => void;
  onEditDate: (id: string) => void;
  onOpenPlaces: () => void;
  onOpenPlanned: () => void;
  onOpenAgenda: () => void;
}) {
  const [adding, setAdding] = useState<"date" | "commitment" | "idea" | null>(null);
  const [planDay, setPlanDay] = useState<string | null>(null);
  if (!adding && planDay) setPlanDay(null);
  const [dismissedBack, setDismissedBack] = useState<string | null>(null);
  const [moving, setMoving] = useState<{ date: string; time: string } | null>(null);
  // A reminder to turn notifications on, until they do (or wave it away for two weeks).
  const [pushHidden, setPushHidden] = useState(() => {
    try { return Number(window.localStorage.getItem("nossia-push-hint") ?? 0) > Date.now(); } catch { return false; }
  });
  const [monthHidden, setMonthHidden] = useState(() => {
    try { return monthSummary ? window.localStorage.getItem("nossia-month-seen") === monthSummary.month : true; } catch { return false; }
  });
  const showMonth = monthSummary && !monthHidden && new Date().getDate() <= 7;
  const hideMonth = () => {
    setMonthHidden(true);
    try { if (monthSummary) window.localStorage.setItem("nossia-month-seen", monthSummary.month); } catch { /* shows again next time */ }
  };
  const pushHint = !pushHidden && (myPush === "off" || myPush === "needs-install" || myPush === "denied");
  const hidePushHint = () => {
    setPushHidden(true);
    try { window.localStorage.setItem("nossia-push-hint", String(Date.now() + 14 * 86400000)); } catch { /* the hint simply shows again next time */ }
  };
  const otherSlot = houseActions.mySlot === "partner_two" ? "partner_one" : "partner_two";
  const otherName = otherSlot === "partner_one" ? partnerOneName : partnerTwoName;
  const now = new Date();
  const today = dateKey(now);
  const [nextDate] = upcomingDates;
  const firstFreeDay = freeDays.find((freeDay) => freeDay.windows.length > 0 && freeDay.dates.length === 0);

  const nextCommitments = commitments.filter((commitment) => commitment.event_date >= today).sort((first, second) => first.event_date.localeCompare(second.event_date) || (first.starts_at ?? "").localeCompare(second.starts_at ?? "")).slice(0, 4);
  const partnerName = (slot: CoupleCommitment["for_partner"]) => slot === "partner_one" ? partnerOneName : slot === "partner_two" ? partnerTwoName : "Os dois";

  // Commitments first; special dates and a nearby event only when they're a week away or less.
  const daysUntil = (key: string) => Math.round((Date.parse(`${key}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000);
  const whenLabel = (key: string) => {
    const days = daysUntil(key);
    return days === 0 ? "Hoje" : days === 1 ? "Amanhã" : shortWeekday(key);
  };
  const soon = [
    ...nextCommitments.map((commitment) => ({ key: `c-${commitment.id}`, days: daysUntil(commitment.event_date), when: `${whenLabel(commitment.event_date)}${commitment.starts_at ? ` · ${commitment.starts_at.slice(0, 5)}` : ""}`, what: `${commitment.title} · ${partnerName(commitment.for_partner)}`, onClick: null as null | (() => void) })),
    ...(nextEvent && daysUntil(nextEvent.date) <= 7 ? [{ key: "event", days: daysUntil(nextEvent.date), when: whenLabel(nextEvent.date), what: `Perto de vocês: ${nextEvent.title}`, onClick: onOpenEvents }] : []),
    ...(nextTrip && nextTrip.days <= 7 ? [{ key: "trip", days: nextTrip.days, when: nextTrip.days === 0 ? "Hoje" : `Daqui a ${nextTrip.days} ${nextTrip.days === 1 ? "dia" : "dias"}`, what: `Viagem a ${nextTrip.title}`, onClick: null }] : []),
    ...(anniversary && anniversary.days <= 7 ? [{ key: "anniversary", days: anniversary.days, when: anniversary.days === 0 ? "Hoje" : `Daqui a ${anniversary.days} ${anniversary.days === 1 ? "dia" : "dias"}`, what: `Aniversário de namoro · ${anniversary.years} ${anniversary.years === 1 ? "ano" : "anos"}`, onClick: null }] : []),
    ...birthdays.filter((birthday) => birthday.days <= 7).map((birthday) => ({ key: `b-${birthday.name}`, days: birthday.days, when: birthday.days === 0 ? "Hoje" : `Daqui a ${birthday.days} ${birthday.days === 1 ? "dia" : "dias"}`, what: `Anos de ${birthday.name}`, onClick: null })),
  ].sort((first, second) => first.days - second.days).slice(0, 3);

  const back = scene.backFromDate && dismissedBack !== scene.backFromDate.id ? scene.backFromDate : null;
  const bubble = proposal ? <>
    <p className="house-bubble-title"><strong>{otherName} propôs {proposal.emoji} {proposal.title}</strong></p>
    <p className="today-meta"><CalendarDays size={16} aria-hidden="true" />{proposal.planned_for ? shortDay(proposal.planned_for) : ""}{proposal.planned_start_time && <><Clock size={16} aria-hidden="true" />{proposal.planned_start_time.slice(0, 5)}</>}</p>
    {moving ? <form className="proposal-move" onSubmit={(event) => { event.preventDefault(); void onMoveProposal(proposal.id, moving.date, moving.time || null).then((ok) => { if (ok) setMoving(null); }); }}>
      <label className="form-label">Dia<input className="form-input" type="date" required min={today} value={moving.date} onChange={(event) => setMoving({ ...moving, date: event.target.value })} /></label>
      <label className="form-label">Hora<input className="form-input" type="time" value={moving.time} onChange={(event) => setMoving({ ...moving, time: event.target.value })} /></label>
      <div className="panel-actions"><button type="button" className="button button-ghost" onClick={() => setMoving(null)}>Voltar</button><button type="submit" className="button button-primary" disabled={busy || !moving.date}>Sugerir a {otherName}</button></div>
    </form>
    : <div className="panel-actions"><button type="button" className="button button-primary" disabled={busy} onClick={() => void onAcceptProposal(proposal.id)}><Check size={16} aria-hidden="true" />Aceitar</button><button type="button" className="button button-ghost" onClick={() => setMoving({ date: proposal.planned_for ?? today, time: proposal.planned_start_time?.slice(0, 5) ?? "" })}>Outro dia</button><button type="button" className="button button-ghost" disabled={busy} onClick={() => void onDeclineProposal(proposal.id)}>Agora não</button></div>}
  </> : back ? <>
    <p className="house-bubble-title"><strong>Já voltaram? Como correu {back.title}?</strong></p>
    <p className="panel-copy">Guardem a memória enquanto está fresca. Fotografias e notas são opcionais.</p>
    <div className="panel-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={() => onMarkDone(back.id)}><Check size={16} aria-hidden="true" />Já fizemos</button><button type="button" className="button button-ghost" onClick={() => setDismissedBack(back.id)}>Ainda não</button></div>
  </> : scene.dateNow ? <>
    <p className="house-bubble-title"><strong>{scene.together ? "Bom date!" : `Às ${scene.dateNow.time} é o vosso date.`}</strong></p>
    <p className="panel-copy">{scene.dateNow.title}{scene.together ? ". Aproveitem, depois contam-me como foi." : ". Já se estão a arranjar?"}</p>
  </> : deckSize > 0 ? <>
    <p className="house-bubble-title"><strong>{pet ? `${pet.name}: ` : ""}Diz-me do que gostas</strong></p>
    <p className="panel-copy">{deckSize} {deckSize === 1 ? "ideia rápida" : "ideias rápidas"}: desliza para a direita se te apetece. Assim as sugestões ficam à vossa medida.</p>
    <div className="panel-actions"><button type="button" className="button button-secondary" onClick={onOpenDeck}>Vamos lá</button></div>
  </> : suggestion ? <>
    <p className="house-bubble-title">{suggestionDate === today ? "Hoje" : shortDay(suggestionDate)}, que tal <strong>{suggestion.idea.emoji} {suggestion.idea.title}</strong>?</p>
    <p className="today-meta"><Clock size={16} aria-hidden="true" />{durationLabel(suggestion.idea.duration_minutes, suggestion.idea.duration)}<span aria-hidden="true">·</span>{budgetLabel(suggestion.idea.budget_eur)}</p>
    {suggestion.reasons[0] && <p className="panel-copy">{suggestion.reasons[0]}</p>}
    {!weatherKnown && <p className="suggestion-hint">Partilhem a localização nas definições para a sugestão contar com o tempo.</p>}
    <div className="panel-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={() => onPlanSuggestion(suggestion.idea, suggestionDate)}>Marcar</button><button type="button" className="button button-ghost" onClick={onAnotherSuggestion}><Shuffle size={16} aria-hidden="true" />Outra</button></div>
  </> : <p className="panel-copy">Já fizeram todas as ideias desta época. Acrescentem novas em Explorar.</p>;

  return (
    <div className="today-grid">
      <HouseHero {...houseActions} scene={scene} mascots={mascots} pet={pet} pins={pins} calendar={calendar} names={{ partner_one: partnerOneName, partner_two: partnerTwoName }} onOpenAgenda={onOpenCalendar} onPlanDay={(day) => { setPlanDay(day); setAdding("date"); }} onPlanTrip={onPlanTrip} onOpenWorldMap={onOpenWorldMap} onOpenWindow={onOpenWindow} forecast={forecast} weatherPlace={weatherPlace} bubble={bubble} />

      {showMonth && monthSummary && <section className="month-card" aria-label={`O vosso ${monthSummary.label}`}>
        <p className="panel-label">O vosso {monthSummary.label}</p>
        <h2>{summaryLine(monthSummary)}</h2>
        {monthSummary.favorite && <p className="panel-copy">O favorito: {monthSummary.favorite.emoji} {monthSummary.favorite.title}</p>}
        <div className="panel-actions"><button type="button" className="button button-ghost" onClick={hideMonth}>Fechar</button><button type="button" className="button button-primary" onClick={() => { hideMonth(); onOpenInsights(); }}>Ver mais</button></div>
      </section>}

      {pushHint && <section className="push-hint" aria-label="Notificações">
        <Bell size={20} aria-hidden="true" />
        <p>{myPush === "needs-install"
          ? <>Põe a Nossia no ecrã principal (Safari › Partilhar › <strong>Adicionar ao ecrã principal</strong>) e abre-a de lá: só assim recebes as propostas e os carinhos de {otherName}.</>
          : myPush === "denied" ? <>As notificações estão bloqueadas neste telemóvel. Liga-as nas definições do telemóvel para saberes quando {otherName} te propõe um date.</>
            : <>Liga as notificações para saberes logo quando {otherName} te propõe um date ou manda um carinho.</>}</p>
        <div className="push-hint-actions">{myPush === "off" && <button type="button" className="button button-primary" onClick={onOpenNotifications}>Ligar</button>}<button type="button" className="button button-ghost" onClick={hidePushHint}>Agora não</button></div>
      </section>}

      {/* One card for what's next: the next date, then whatever else is coming this week. */}
      <section className="panel today-next" aria-label="A seguir">
        <p className="panel-label">Próximo date</p>
        {nextDate ? <>
          <h2>{nextDate.emoji} {nextDate.title}</h2>
          {waitingOnPartner(nextDate, myUserId) && <p className="proposal-tag">À espera de {otherName}{partnerHasPush === false ? " · vê quando abrir a app" : ""}</p>}
          <p className="today-meta"><CalendarDays size={16} aria-hidden="true" />{nextDate.planned_for ? shortDay(nextDate.planned_for) : "Dia por decidir"}{nextDate.planned_start_time && <><Clock size={16} aria-hidden="true" />{nextDate.planned_start_time.slice(0, 5)}</>}</p>
          {nextDate.location_name && <p className="today-meta"><MapPin size={16} aria-hidden="true" />{nextDate.location_name}</p>}
          <div className="panel-actions">{(!nextDate.planned_for || nextDate.planned_for <= today) && <button type="button" className="button button-secondary" disabled={busy} onClick={() => onMarkDone(nextDate.id)}><Check size={16} aria-hidden="true" />Já fizemos</button>}<button type="button" className="button button-ghost" onClick={() => onEditDate(nextDate.id)}><Pencil size={16} aria-hidden="true" />Alterar</button></div>
        </> : <>
          <h2>Nada marcado ainda</h2>
          <p className="panel-copy">{firstFreeDay ? `Estão os dois livres ${shortDay(firstFreeDay.key)}.` : "Marquem algo aqui em baixo, ou vejam a sugestão no balão da casa."}</p>
        </>}
        {soon.length > 0 && <div className="today-soon">
          <p className="panel-label">Em breve</p>
          <ul>{soon.map((item) => <li key={item.key}><span className="today-soon-when">{item.when}</span>{item.onClick ? <button type="button" className="link-button" onClick={item.onClick}>{item.what}</button> : <span>{item.what}</span>}</li>)}</ul>
          <button type="button" className="button button-ghost today-soon-more" onClick={onOpenAgenda}>Agenda<ArrowRight size={16} aria-hidden="true" /></button>
        </div>}
        {overdueCount > 0 && <button type="button" className="link-button today-overdue" onClick={onOpenPlanned}>{overdueCount === 1 ? "1 date já passou" : `${overdueCount} dates já passaram`}: marquem como feito ou apaguem</button>}
      </section>

      <section className="today-add" aria-label="Marcar">
        <p className="panel-label">O que querem marcar?</p>
        <div className="today-add-buttons">
          <button type="button" className="today-add-button" onClick={() => setAdding("date")}><Heart size={20} aria-hidden="true" />Date</button>
          <button type="button" className="today-add-button" onClick={() => setAdding("commitment")}><CalendarDays size={20} aria-hidden="true" />Compromisso</button>
          <button type="button" className="today-add-button" onClick={() => setAdding("idea")}><Lightbulb size={20} aria-hidden="true" />Ideia para depois</button>
        </div>
      </section>

      {adding && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setAdding(null); }}>
        <DialogSection onClose={busy ? null : () => setAdding(null)} className="modal-card today-add-modal" aria-labelledby="today-add-title">
          <button className="modal-close" aria-label="Fechar" disabled={busy} onClick={() => setAdding(null)}>×</button>
          <h2 id="today-add-title">{adding === "date" ? "Novo date" : adding === "commitment" ? "Novo compromisso" : "Ideia para depois"}</h2>
          <QuickAddBox key={adding} partnerOneName={partnerOneName} partnerTwoName={partnerTwoName} busy={busy} fixedKind={adding} freeDay={firstFreeDay?.key ?? null} initialDay={planDay} autoFocus onSubmit={onQuickAdd} onSaved={() => { setAdding(null); setPlanDay(null); }} onMoreDetails={(title) => { setAdding(null); onMoreDetails(title); }} onOpenPlaces={() => { setAdding(null); onOpenPlaces(); }} />
        </DialogSection>
      </div>}

      {weather && <div className="today-weather">{weather}</div>}
    </div>
  );
}
