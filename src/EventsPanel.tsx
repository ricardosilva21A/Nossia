import { useState } from "react";
import { CalendarPlus, Clock, ExternalLink, MapPin } from "lucide-react";
import { driveLabel, eventsNear, eventsWorthTheTrip, firstAvailableDay, priceLabel, tripKm } from "./events";
import type { LocalEvent, Origin } from "./events";

function eventDays(event: LocalEvent) {
  const format = (key: string) => new Intl.DateTimeFormat("pt-PT", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${key}T12:00:00`));
  return event.starts_on === event.ends_on ? format(event.starts_on) : `${format(event.starts_on)} a ${format(event.ends_on)}`;
}

export function EventsPanel({ events, origin, today, busy, plannedEventIds, freeDays, horizonEnd, onPlan, onPlanTrip, onOpenSettings }: {
  events: LocalEvent[];
  origin: Origin | null;
  today: string;
  busy: boolean;
  plannedEventIds: Set<string>;
  freeDays: Set<string>;
  horizonEnd: string;
  onPlan: (event: LocalEvent, date: string) => Promise<boolean>;
  onPlanTrip: (event: LocalEvent, date: string) => Promise<boolean>;
  onOpenSettings: () => void;
}) {
  const [planningId, setPlanningId] = useState<string | null>(null);
  const [day, setDay] = useState("");
  const [range, setRange] = useState<"near" | "far">("near");
  const near = eventsNear(events, origin, today);
  const far = origin ? eventsWorthTheTrip(events, origin, today, freeDays, horizonEnd) : [];
  const list = range === "near" ? near.map((item) => ({ ...item, driveMinutes: null as number | null, freeDay: null as string | null })) : far.map((item) => ({ ...item, sameMunicipality: false }));

  return (
    <section className="events-page" aria-label="Eventos">
      {!origin && <div className="panel"><p className="panel-copy">Digam o concelho onde vivem para verem só os eventos perto de vocês.</p><div className="panel-actions"><button type="button" className="button button-secondary" onClick={onOpenSettings}>Escolher concelho</button></div></div>}
      {origin && <div className="chip-row" role="tablist" aria-label="Distância">{([["near", "Perto"], ["far", "Vale a viagem"]] as const).map(([value, label]) => <button type="button" role="tab" key={value} aria-selected={range === value} className={`chip ${range === value ? "selected" : ""}`} onClick={() => { setRange(value); setPlanningId(null); }}>{label}</button>)}</div>}
      {list.length === 0 ? <p className="panel-copy saved-empty">{range === "near" ? "Ainda não há eventos perto de vocês. Vamos juntando os das agendas da vossa zona." : "Não há eventos grandes que caibam nos vossos dias livres. Vamos juntando os do país inteiro."}</p> : <ul className="event-list">{list.map(({ event, km, sameMunicipality, driveMinutes, freeDay }) => <li key={event.id} className="panel event-card">
        {event.featured && <span className="event-featured">Destaque</span>}
        {event.image_url && <img className="event-image" src={event.image_url} alt="" loading="lazy" />}
        <h2>{event.title}</h2>
        <p className="today-meta"><Clock size={16} aria-hidden="true" />{eventDays(event)}{event.start_time ? ` · ${event.start_time.slice(0, 5)}` : ""}</p>
        {(event.venue || event.municipality) && <p className="today-meta"><MapPin size={16} aria-hidden="true" />{[event.venue, event.municipality].filter(Boolean).join(", ")}{km !== null && !sameMunicipality ? ` · ${driveMinutes !== null ? driveLabel(driveMinutes) : `${Math.round(km)} km`}` : ""}</p>}
        {freeDay && <p className="event-fits">Estão os dois livres {new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${freeDay}T12:00:00`))}</p>}
        <p className="event-price">{priceLabel(event.price_for_two)}</p>
        {event.description && <p className="panel-copy">{event.description}</p>}
        <div className="panel-actions">
          {plannedEventIds.has(event.id) ? <span className="event-planned">Já está na Agenda</span> : <button type="button" className="button button-primary" onClick={() => { setPlanningId(planningId === event.id ? null : event.id); setDay(freeDay ?? firstAvailableDay(event, today)); }}><CalendarPlus size={16} aria-hidden="true" />{km !== null && km > tripKm ? "Planear como viagem" : "Marcar"}</button>}
          {event.url && <a className="button button-ghost" href={event.url} target="_blank" rel="noopener noreferrer">Bilhetes e info<ExternalLink size={14} aria-hidden="true" /></a>}
        </div>
        {planningId === event.id && <form className="event-plan" onSubmit={(formEvent) => { formEvent.preventDefault(); void (km !== null && km > tripKm ? onPlanTrip : onPlan)(event, day).then((saved) => { if (saved) setPlanningId(null); }); }}>
          {event.starts_on !== event.ends_on && <label className="form-label">Que dia<input className="form-input" type="date" required min={firstAvailableDay(event, today)} max={event.ends_on} value={day} onChange={(changeEvent) => setDay(changeEvent.target.value)} /></label>}
          {km !== null && km > tripKm && <p className="schedule-hint">É longe para ir e voltar no mesmo dia, por isso fica como uma viagem de dois dias, com o evento no plano.</p>}
          <button className="button button-primary" type="submit" disabled={busy}>{km !== null && km > tripKm ? "Criar viagem a partir de" : "Marcar para"} {new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${day}T12:00:00`))}</button>
        </form>}
      </li>)}</ul>}
    </section>
  );
}
