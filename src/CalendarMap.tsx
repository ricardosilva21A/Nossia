import { useMemo, useState } from "react";
import type { Category, CoupleCommitment, CoupleTrip, DateIdea, GeocodedPlace } from "./types";

export type CalendarMapIdea = Pick<DateIdea, "id" | "title" | "category" | "status" | "planned_for" | "completed_at" | "location_name" | "latitude" | "longitude">;
let lastPlaceSearchAt = 0;

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function displayCategory(category: Category) {
  return {
    Romantic: "Romântico",
    Adventure: "Aventura",
    "Food & drink": "Comida e bebida",
    Creative: "Criativo",
    Relaxing: "Relaxante",
    Culture: "Cultura",
  }[category];
}

function displayDate(date: string | null) {
  return date
    ? new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`))
    : "Data por decidir";
}

export function LocationSearch({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: GeocodedPlace) => void;
  
}) {
  const [results, setResults] = useState<GeocodedPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  async function searchLocation() {
    const query = value.trim();
    if (query.length < 3) {
      setError("Introduza pelo menos 3 caracteres para pesquisar um local.");
      setResults([]);
      return;
    }

    setSearching(true);
    setError("");
    setResults([]);
    try {
      const delay = Math.max(0, 1000 - (Date.now() - lastPlaceSearchAt));
      if (delay) await new Promise((resolve) => window.setTimeout(resolve, delay));
      lastPlaceSearchAt = Date.now();
      const params = new URLSearchParams({ q: query, format: "jsonv2", limit: "5" });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
      if (!response.ok) throw new Error(`OpenStreetMap search failed (${response.status}).`);
      const data: Array<{ display_name: string; lat: string; lon: string }> = await response.json();
      const places = data.map((place) => ({
        displayName: place.display_name,
        latitude: Number(place.lat),
        longitude: Number(place.lon),
      })).filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude));
      setResults(places);
      if (places.length === 0) setError("Não foram encontrados locais. Experimente uma rua, cidade ou estabelecimento próximo.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível pesquisar no OpenStreetMap. Tente novamente.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="location-search">
      <div className="location-search-row">
        <input
          className="form-input"
          value={value}
          maxLength={160}
          onChange={(event) => { onChange(event.target.value); setResults([]); setError(""); }}
          placeholder={"Local, cidade ou estabelecimento"}
          aria-label={"Local do date"}
        />
        <button type="button" className="location-search-button" onClick={() => void searchLocation()} disabled={searching}>
          {searching ? "A pesquisar…" : "Ver no mapa"}
        </button>
      </div>
      {error && <p className="location-search-message" role="status">{error}</p>}
      {results.length > 0 && <ul className="location-results" aria-label="Matching places">
        {results.map((place) => <li key={`${place.latitude},${place.longitude},${place.displayName}`}>
          <button type="button" onClick={() => { onSelect(place); setResults([]); setError(""); }}>
            <span>{place.displayName}</span><small>{"Escolher este local"}</small>
          </button>
        </li>)}
      </ul>}
      <p className="map-attribution-note">{"Pesquisa de locais e mapa por OpenStreetMap contributors."}</p>
    </div>
  );
}

export function CalendarView({ ideas, commitments = [], trips = [] }: { ideas: CalendarMapIdea[]; commitments?: CoupleCommitment[]; trips?: CoupleTrip[];  }) {
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(new Date()));
  const eventsByDate = useMemo(() => {
    const events = new Map<string, CalendarMapIdea[]>();
    ideas.forEach((idea) => {
      const date = idea.status === "completed" ? idea.completed_at : idea.planned_for;
      if (!date) return;
      const dayEvents = events.get(date) ?? [];
      dayEvents.push(idea);
      events.set(date, dayEvents);
    });
    return events;
  }, [ideas]);

  const firstWeekday = (month.getDay() + 6) % 7;
  const gridStart = new Date(month.getFullYear(), month.getMonth(), 1 - firstWeekday);
  const days = Array.from({ length: 42 }, (_, index) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index));
  const selectedIdeas = eventsByDate.get(selectedDate) ?? [];
  const selectedTrips = trips.filter((trip) => trip.start_date <= selectedDate && trip.end_date >= selectedDate);
  const selectedCommitments = commitments.filter((commitment) => commitment.event_date === selectedDate).sort((first, second) => (first.starts_at ?? "").localeCompare(second.starts_at ?? ""));
  const unscheduledIdeas = ideas.filter((idea) => idea.status === "planned" && !idea.planned_for);

  function changeMonth(amount: number) {
    const nextMonth = new Date(month.getFullYear(), month.getMonth() + amount, 1);
    setMonth(nextMonth);
    setSelectedDate(localDateKey(nextMonth));
  }

  return (
    <section className="calendar-panel" aria-label="Date calendar">
      <div className="calendar-toolbar">
        <div>
          <p className="section-kicker">{"O VOSSO DIÁRIO"}</p>
          <h2>{new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" }).format(month)}</h2>
        </div>
        <div className="calendar-controls">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">←</button>
          <button type="button" onClick={() => { const today = new Date(); setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(localDateKey(today)); }}>{"Hoje"}</button>
          <button type="button" onClick={() => changeMonth(1)} aria-label="Next month">→</button>
        </div>
      </div>
      <div className="calendar-grid" role="grid" aria-label={new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" }).format(month)}>
        {(["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]).map((weekday) => <span className="calendar-weekday" key={weekday}>{weekday}</span>)}
        {days.map((day) => {
          const dateKey = localDateKey(day);
          const dayEvents = eventsByDate.get(dateKey) ?? [];
          const hasCommitment = commitments.some((commitment) => commitment.event_date === dateKey);
          const hasTrip = trips.some((trip) => trip.start_date <= dateKey && trip.end_date >= dateKey);
          return <button
            type="button"
            role="gridcell"
            key={dateKey}
            className={`calendar-day ${hasTrip ? "trip-day" : ""} ${day.getMonth() !== month.getMonth() ? "outside-month" : ""} ${dateKey === selectedDate ? "selected-day" : ""} ${dateKey === localDateKey(new Date()) ? "today-day" : ""}`}
            onClick={() => setSelectedDate(dateKey)}
            aria-label={`${displayDate(dateKey)}${dayEvents.length ? `, ${dayEvents.length} ${"dates"}` : ""}`}
            aria-pressed={dateKey === selectedDate}
          >
            <span>{day.getDate()}</span>
            {(dayEvents.length > 0 || hasCommitment) && <span className="calendar-event-dots" aria-hidden="true">{hasCommitment && <i className="commitment-dot" />}{dayEvents.slice(0, 3).map((idea) => <i className={idea.status === "completed" ? "memory-dot" : ""} key={idea.id} />)}{dayEvents.length > 3 && <small>+{dayEvents.length - 3}</small>}</span>}
          </button>;
        })}
      </div>
      <div className="calendar-day-details">
        <h3>{displayDate(selectedDate)}</h3>
        {selectedTrips.map((trip) => <article className="calendar-event" key={trip.id}>
          <span className="calendar-event-marker trip-marker" />
          <div><strong>{trip.title}</strong><span>{displayDate(trip.start_date)} a {displayDate(trip.end_date)}</span></div>
          <small>Viagem</small>
        </article>)}
        {selectedCommitments.map((commitment) => <article className="calendar-event" key={commitment.id}>
          <span className="calendar-event-marker commitment-marker" />
          <div><strong>{commitment.title}</strong><span>{commitment.starts_at ? commitment.starts_at.slice(0, 5) : "Sem hora"}</span></div>
          <small>Compromisso</small>
        </article>)}
        {selectedIdeas.length > 0 ? selectedIdeas.map((idea) => <article className="calendar-event" key={idea.id}>
          <span className={idea.status === "completed" ? "calendar-event-marker completed-marker" : "calendar-event-marker"} />
          <div><strong>{idea.title}</strong><span>{displayCategory(idea.category)}{idea.location_name ? ` · ${idea.location_name}` : ""}</span></div>
          <small>{idea.status === "completed" ? "Memória" : "Planeado"}</small>
        </article>) : selectedCommitments.length > 0 || selectedTrips.length > 0 ? null : <p className="calendar-empty">{"Ainda não há nada planeado para este dia. Escolha outra data ou planeie um date a partir das ideias."}</p>}
      </div>
      {unscheduledIdeas.length > 0 && <div className="unscheduled-dates">
        <h3>{"Dates por agendar"}</h3>
        {unscheduledIdeas.map((idea) => <p key={idea.id}><span>{idea.title}</span><small>{idea.location_name || ("Sem local definido")}</small></p>)}
      </div>}
    </section>
  );
}
