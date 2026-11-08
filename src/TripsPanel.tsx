import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { CalendarPlus, ChevronDown, ExternalLink, Pencil, Plane, Plus, Trash2 } from "lucide-react";
import { supabase } from "./lib/supabase";
import { bestMonthsLabel, destinationGuides, findGuide, flightsUrl, guidesForSoon, monthNames } from "./destinations";
import type { CoupleDestination, CoupleTrip, TripItem } from "./types";

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatDay(date: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  return new Intl.DateTimeFormat("pt-PT", options).format(new Date(`${date}T12:00:00`));
}

function tripRange(trip: CoupleTrip) {
  return trip.start_date === trip.end_date ? formatDay(trip.start_date, { day: "numeric", month: "long" }) : `${formatDay(trip.start_date)} a ${formatDay(trip.end_date)}`;
}

function daysOf(trip: CoupleTrip) {
  const days: string[] = [];
  for (let time = Date.parse(`${trip.start_date}T12:00:00Z`); time <= Date.parse(`${trip.end_date}T12:00:00Z`) && days.length < 60; time += 86400000) days.push(new Date(time).toISOString().slice(0, 10));
  return days;
}

function untilLabel(start: string, today: string) {
  const days = Math.round((Date.parse(`${start}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000);
  if (days === 0) return "Começa hoje";
  if (days === 1) return "Começa amanhã";
  return `Faltam ${days} dias`;
}

function TripDatesForm({ city, busy, onSave, onCancel }: { city: string; busy: boolean; onSave: (start: string, end: string) => void; onCancel: () => void }) {
  const today = todayKey();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  return <form className="trip-dates-form" onSubmit={(event) => { event.preventDefault(); if (start && end) onSave(start, end); }}>
    <label className="form-label">Ida<input className="form-input" type="date" required min={today} value={start} onChange={(event) => { setStart(event.target.value); if (end && end < event.target.value) setEnd(event.target.value); }} /></label>
    <label className="form-label">Volta<input className="form-input" type="date" required min={start || today} value={end} onChange={(event) => setEnd(event.target.value)} /></label>
    <div className="panel-actions"><button className="button button-primary" type="submit" disabled={busy || !start || !end}>Marcar viagem a {city}</button><button type="button" className="button button-ghost" onClick={onCancel}>Cancelar</button></div>
  </form>;
}

export function TripsPanel({ coupleId, trips, onTripsChange, onOpenMemory }: { coupleId: string; trips: CoupleTrip[]; onTripsChange: (update: (current: CoupleTrip[]) => CoupleTrip[]) => void; onOpenMemory: (id: string) => void }) {
  const [destinations, setDestinations] = useState<CoupleDestination[]>([]);
  const [items, setItems] = useState<TripItem[]>([]);
  const [city, setCity] = useState("");
  const [bookingFor, setBookingFor] = useState<string | null>(null);
  const [openTripId, setOpenTripId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState("");
  const [newItemDay, setNewItemDay] = useState("");
  const [showPast, setShowPast] = useState(false);
  const [tripDraft, setTripDraft] = useState<CoupleTrip | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const today = todayKey();

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void Promise.all([
      supabase.from("couple_destinations").select("*").order("created_at"),
      supabase.from("trip_items").select("*").order("created_at"),
    ]).then(([destinationResult, itemResult]) => {
      if (!active) return;
      const loadError = destinationResult.error ?? itemResult.error;
      if (loadError) setError(`Não foi possível carregar as viagens: ${loadError.message}`);
      setDestinations((destinationResult.data ?? []) as CoupleDestination[]);
      setItems((itemResult.data ?? []) as TripItem[]);
    });
    return () => { active = false; };
  }, [coupleId]);

  const upcoming = useMemo(() => trips.filter((trip) => trip.end_date >= today).sort((first, second) => first.start_date.localeCompare(second.start_date)), [today, trips]);
  const past = useMemo(() => trips.filter((trip) => trip.end_date < today).sort((first, second) => second.start_date.localeCompare(first.start_date)), [today, trips]);
  const savedCities = new Set(destinations.map((destination) => destination.city.toLocaleLowerCase("pt-PT")));
  const suggestions = guidesForSoon().filter((guide) => !savedCities.has(guide.city.toLocaleLowerCase("pt-PT"))).slice(0, 6);

  async function run(action: () => PromiseLike<{ error: { message: string } | null }>, message: string) {
    setBusy(true);
    setError("");
    const { error: actionError } = await action();
    if (actionError) setError(`${message}: ${actionError.message}`);
    setBusy(false);
    return !actionError;
  }

  async function addDestination(name: string) {
    const trimmed = name.trim();
    if (!supabase || !trimmed) return;
    const guide = findGuide(trimmed);
    const finalCity = guide?.city ?? trimmed[0].toLocaleUpperCase("pt-PT") + trimmed.slice(1);
    if (savedCities.has(finalCity.toLocaleLowerCase("pt-PT"))) {
      setCity("");
      return;
    }
    setBusy(true);
    setError("");
    const { data, error: saveError } = await supabase.from("couple_destinations").insert({ couple_id: coupleId, city: finalCity, country: guide?.country ?? "" }).select("*").single();
    if (saveError) setError(`Não foi possível guardar o destino: ${saveError.message}`);
    else {
      setDestinations((current) => [...current, data as CoupleDestination]);
      setCity("");
    }
    setBusy(false);
  }

  async function removeDestination(id: string) {
    if (!supabase) return;
    const client = supabase;
    if (await run(() => client.from("couple_destinations").delete().eq("id", id), "Não foi possível remover o destino")) setDestinations((current) => current.filter((destination) => destination.id !== id));
  }

  async function bookTrip(destination: CoupleDestination, start: string, end: string) {
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { data, error: saveError } = await supabase.from("couple_trips").insert({ couple_id: coupleId, destination_id: destination.id, title: destination.city, start_date: start, end_date: end }).select("*").single();
    if (saveError) setError(`Não foi possível marcar a viagem: ${saveError.message}`);
    else {
      const trip = data as CoupleTrip;
      onTripsChange((current) => [...current, trip]);
      setBookingFor(null);
      setOpenTripId(trip.id);
    }
    setBusy(false);
  }

  async function saveTripDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !tripDraft || !tripDraft.title.trim() || tripDraft.end_date < tripDraft.start_date) return;
    setBusy(true);
    setError("");
    const draft = tripDraft;
    // A changed title means a different place, so the map looks it up again.
    const original = trips.find((trip) => trip.id === draft.id);
    const moved = original?.title !== draft.title.trim();
    const patch = { title: draft.title.trim(), start_date: draft.start_date, end_date: draft.end_date, ...(moved ? { latitude: null, longitude: null } : {}) };
    const { error: saveError } = await supabase.from("couple_trips").update(patch).eq("id", draft.id);
    if (saveError) setError(`Não foi possível guardar a viagem: ${saveError.message}`);
    else {
      onTripsChange((current) => current.map((trip) => trip.id === draft.id ? { ...trip, ...patch } : trip));
      const outside = items.filter((item) => item.trip_id === draft.id && item.day && (item.day < draft.start_date || item.day > draft.end_date));
      if (outside.length) {
        const { error: itemsError } = await supabase.from("trip_items").update({ day: null }).in("id", outside.map((item) => item.id));
        if (itemsError) setError(`A viagem mudou, mas alguns planos ficaram fora das novas datas: ${itemsError.message}`);
        else setItems((current) => current.map((item) => outside.some((other) => other.id === item.id) ? { ...item, day: null } : item));
      }
      setTripDraft(null);
    }
    setBusy(false);
  }

  async function removeTrip(id: string) {
    if (!supabase) return;
    const client = supabase;
    if (await run(() => client.from("couple_trips").delete().eq("id", id), "Não foi possível apagar a viagem")) {
      onTripsChange((current) => current.filter((trip) => trip.id !== id));
      setItems((current) => current.filter((item) => item.trip_id !== id));
    }
  }

  async function addItem(trip: CoupleTrip, title: string, day: string | null) {
    const trimmed = title.trim();
    if (!supabase || !trimmed) return;
    setBusy(true);
    setError("");
    const { data, error: saveError } = await supabase.from("trip_items").insert({ trip_id: trip.id, couple_id: coupleId, title: trimmed, day }).select("*").single();
    if (saveError) setError(`Não foi possível adicionar ao plano: ${saveError.message}`);
    else setItems((current) => [...current, data as TripItem]);
    setBusy(false);
  }

  async function toggleItem(item: TripItem) {
    if (!supabase) return;
    const client = supabase;
    if (await run(() => client.from("trip_items").update({ done: !item.done }).eq("id", item.id), "Não foi possível atualizar o plano")) setItems((current) => current.map((other) => other.id === item.id ? { ...other, done: !item.done } : other));
  }

  async function moveItem(item: TripItem, day: string | null) {
    if (!supabase) return;
    const client = supabase;
    if (await run(() => client.from("trip_items").update({ day }).eq("id", item.id), "Não foi possível mudar o dia")) setItems((current) => current.map((other) => other.id === item.id ? { ...other, day } : other));
  }

  async function removeItem(id: string) {
    if (!supabase) return;
    const client = supabase;
    if (await run(() => client.from("trip_items").delete().eq("id", id), "Não foi possível apagar do plano")) setItems((current) => current.filter((item) => item.id !== id));
  }

  function submitItem(event: FormEvent<HTMLFormElement>, trip: CoupleTrip) {
    event.preventDefault();
    void addItem(trip, newItem, newItemDay || null);
    setNewItem("");
  }

  function renderItem(item: TripItem, trip: CoupleTrip) {
    return <li key={item.id} className={item.done ? "trip-item-done" : ""}>
      <input type="checkbox" checked={item.done} aria-label={`Marcar “${item.title}” como feito`} onChange={() => void toggleItem(item)} />
      <span>{item.title}</span>
      <select aria-label={`Dia de “${item.title}”`} value={item.day ?? ""} onChange={(event) => void moveItem(item, event.target.value || null)}><option value="">Por encaixar</option>{daysOf(trip).map((day) => <option key={day} value={day}>{formatDay(day, { weekday: "short", day: "numeric" })}</option>)}</select>
      <button type="button" aria-label={`Apagar “${item.title}”`} onClick={() => void removeItem(item.id)}><Trash2 size={16} aria-hidden="true" /></button>
    </li>;
  }

  function renderTrip(trip: CoupleTrip) {
    const tripItems = items.filter((item) => item.trip_id === trip.id);
    const open = openTripId === trip.id;
    const guide = findGuide(trip.title);
    const unscheduled = tripItems.filter((item) => !item.day);
    const ideas = guide?.todo.filter((todo) => !tripItems.some((item) => item.title === todo)) ?? [];
    return <article className="trip-card" key={trip.id}>
      <button type="button" className="trip-card-header" aria-expanded={open} onClick={() => { setOpenTripId(open ? null : trip.id); setNewItemDay(""); }}>
        <span className="trip-flag" aria-hidden="true">{guide?.flag ?? "✈️"}</span>
        <span className="trip-card-title"><strong>{trip.title}</strong><small>{tripRange(trip)}{trip.start_date >= today ? ` · ${untilLabel(trip.start_date, today)}` : ""}</small></span>
        <ChevronDown className={open ? "trip-chevron open" : "trip-chevron"} size={20} aria-hidden="true" />
      </button>
      {open && <div className="trip-plan">
        {tripDraft?.id === trip.id && <form className="trip-edit-form" onSubmit={(event) => void saveTripDraft(event)}>
          <label className="form-label">Destino<input className="form-input" required maxLength={120} value={tripDraft.title} onChange={(event) => setTripDraft({ ...tripDraft, title: event.target.value })} /></label>
          <div className="trip-dates-form"><label className="form-label">Ida<input className="form-input" type="date" required value={tripDraft.start_date} onChange={(event) => setTripDraft({ ...tripDraft, start_date: event.target.value, end_date: tripDraft.end_date < event.target.value ? event.target.value : tripDraft.end_date })} /></label><label className="form-label">Volta<input className="form-input" type="date" required min={tripDraft.start_date} value={tripDraft.end_date} onChange={(event) => setTripDraft({ ...tripDraft, end_date: event.target.value })} /></label></div>
          <div className="panel-actions"><button className="button button-primary" type="submit" disabled={busy}>Guardar</button><button type="button" className="button button-ghost" onClick={() => setTripDraft(null)}>Cancelar</button></div>
        </form>}
        <form className="trip-item-form" onSubmit={(event) => submitItem(event, trip)}>
          <input className="form-input" required maxLength={200} aria-label="Coisa a fazer" placeholder="Coisa a fazer, reserva, sítio…" value={newItem} onChange={(event) => setNewItem(event.target.value)} />
          <select className="form-input" aria-label="Dia" value={newItemDay} onChange={(event) => setNewItemDay(event.target.value)}><option value="">Por encaixar</option>{daysOf(trip).map((day) => <option key={day} value={day}>{formatDay(day, { weekday: "short", day: "numeric" })}</option>)}</select>
          <button className="button button-primary" type="submit" disabled={busy || !newItem.trim()}><Plus size={16} aria-hidden="true" />Adicionar</button>
        </form>
        {ideas.length > 0 && <div className="trip-ideas"><p>Ideias para {trip.title}</p><div className="chip-row">{ideas.map((todo) => <button type="button" className="chip" key={todo} disabled={busy} onClick={() => void addItem(trip, todo, null)}>+ {todo}</button>)}</div></div>}
        {unscheduled.length > 0 && <section><h4>Por encaixar</h4><ul className="trip-items">{unscheduled.map((item) => renderItem(item, trip))}</ul></section>}
        {daysOf(trip).map((day) => {
          const dayItems = tripItems.filter((item) => item.day === day);
          return dayItems.length > 0 ? <section key={day}><h4>{formatDay(day, { weekday: "long", day: "numeric", month: "long" })}</h4><ul className="trip-items">{dayItems.map((item) => renderItem(item, trip))}</ul></section> : null;
        })}
        {tripItems.length === 0 && <p className="schedule-hint">Ainda não há nada no plano. Acrescentem o que querem fazer, com ou sem dia marcado.</p>}
        <div className="panel-actions">
          {trip.end_date < today && <button type="button" className="button button-primary" onClick={() => onOpenMemory(trip.id)}>Ver memória</button>}
          <a className="button button-ghost" href={flightsUrl(trip.title, monthNames[Number(trip.start_date.slice(5, 7)) - 1])} target="_blank" rel="noopener noreferrer"><Plane size={16} aria-hidden="true" />Ver voos<ExternalLink size={14} aria-hidden="true" /></a>
          <button type="button" className="button button-ghost" onClick={() => setTripDraft(trip)}><Pencil size={16} aria-hidden="true" />Editar</button>
          <button type="button" className="button button-ghost" disabled={busy} onClick={() => void removeTrip(trip.id)}><Trash2 size={16} aria-hidden="true" />Apagar viagem</button>
        </div>
      </div>}
    </article>;
  }

  return (
    <section className="trips-page" aria-label="Viagens">
      {error && <p className="form-alert error-alert" role="alert">{error}</p>}

      {upcoming.length > 0 && <div className="trips-group"><h2>Próximas viagens</h2>{upcoming.map(renderTrip)}</div>}

      <div className="trips-group">
        <h2>Queremos ir</h2>
        <form className="destination-form" onSubmit={(event) => { event.preventDefault(); void addDestination(city); }}>
          <input className="form-input" list="destination-guides" required maxLength={120} aria-label="Cidade" placeholder="Para onde querem ir?" value={city} onChange={(event) => setCity(event.target.value)} />
          <datalist id="destination-guides">{destinationGuides.map((guide) => <option key={guide.city} value={guide.city}>{guide.country}</option>)}</datalist>
          <button className="button button-primary" type="submit" disabled={busy || !city.trim()}><Plus size={16} aria-hidden="true" />Juntar</button>
        </form>

        {destinations.map((destination) => {
          const guide = findGuide(destination.city);
          const hasTrip = upcoming.some((trip) => trip.destination_id === destination.id);
          return <article className="destination-card" key={destination.id}>
            <div className="destination-heading">
              <span className="trip-flag" aria-hidden="true">{guide?.flag ?? "📍"}</span>
              <div><strong>{destination.city}</strong>{destination.country && <small>{destination.country}</small>}</div>
              <button type="button" className="icon-button" aria-label={`Remover ${destination.city}`} disabled={busy} onClick={() => void removeDestination(destination.id)}><Trash2 size={17} aria-hidden="true" /></button>
            </div>
            {guide ? <p className="destination-best"><strong>Melhor altura:</strong> {bestMonthsLabel(guide)}. {guide.why}</p> : <p className="destination-best">Ainda não temos sugestões para esta cidade, mas podem marcar a viagem na mesma.</p>}
            {hasTrip && <p className="destination-booked">Já têm viagem marcada.</p>}
            {bookingFor === destination.id
              ? <TripDatesForm city={destination.city} busy={busy} onSave={(start, end) => void bookTrip(destination, start, end)} onCancel={() => setBookingFor(null)} />
              : <div className="panel-actions"><button type="button" className="button button-secondary" onClick={() => setBookingFor(destination.id)}><CalendarPlus size={16} aria-hidden="true" />Marcar datas</button><a className="button button-ghost" href={flightsUrl(destination.city)} target="_blank" rel="noopener noreferrer"><Plane size={16} aria-hidden="true" />Ver voos<ExternalLink size={14} aria-hidden="true" /></a></div>}
          </article>;
        })}

        {destinations.length === 0 && <p className="schedule-hint">Juntem as cidades que querem conhecer. A Nossia diz qual a melhor altura para ir.</p>}

        {suggestions.length > 0 && <div className="trip-ideas"><p>Boas para os próximos meses</p><div className="chip-row">{suggestions.map((guide) => <button type="button" className="chip" key={guide.city} disabled={busy} onClick={() => void addDestination(guide.city)}>{guide.flag} {guide.city}</button>)}</div></div>}
      </div>

      {past.length > 0 && <div className="trips-group">
        <button type="button" className="task-done-toggle" onClick={() => setShowPast((shown) => !shown)}>{showPast ? "Esconder viagens passadas" : `Ver viagens passadas (${past.length})`}</button>
        {showPast && past.map(renderTrip)}
      </div>}
    </section>
  );
}
