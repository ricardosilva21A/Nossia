import { useMemo, useState } from "react";
import type { Category, DateIdea, GeocodedPlace } from "./types";

export type CalendarMapIdea = Pick<DateIdea, "id" | "title" | "category" | "status" | "planned_for" | "completed_at" | "location_name" | "latitude" | "longitude">;
let lastPlaceSearchAt = 0;

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

type Language = "en" | "pt";

function displayCategory(category: Category, language: Language) {
  if (language === "en") return category;
  return {
    Romantic: "Romântico",
    Adventure: "Aventura",
    "Food & drink": "Comida e bebida",
    Creative: "Criativo",
    Relaxing: "Relaxante",
    Culture: "Cultura",
  }[category];
}

function displayDate(date: string | null, language: Language) {
  return date
    ? new Intl.DateTimeFormat(language === "pt" ? "pt-PT" : "en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`))
    : language === "pt" ? "Data por decidir" : "Date to decide";
}

export function LocationSearch({
  value,
  onChange,
  onSelect,
  language = "en",
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: GeocodedPlace) => void;
  language?: Language;
}) {
  const [results, setResults] = useState<GeocodedPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  async function searchLocation() {
    const query = value.trim();
    if (query.length < 3) {
      setError(language === "pt" ? "Introduza pelo menos 3 caracteres para pesquisar um local." : "Enter at least 3 characters to search for a place.");
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
      if (places.length === 0) setError(language === "pt" ? "Não foram encontrados locais. Experimente uma rua, cidade ou estabelecimento próximo." : "No matching places found. Try a nearby street, town or venue.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : language === "pt" ? "Não foi possível pesquisar no OpenStreetMap. Tente novamente." : "Couldn't search OpenStreetMap. Please try again.");
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
          placeholder={language === "pt" ? "Local, cidade ou estabelecimento" : "A place, city, or venue"}
          aria-label={language === "pt" ? "Local do date" : "Date location"}
        />
        <button type="button" className="location-search-button" onClick={() => void searchLocation()} disabled={searching}>
          {searching ? language === "pt" ? "A pesquisar…" : "Searching…" : language === "pt" ? "Ver no mapa" : "Find on map"}
        </button>
      </div>
      {error && <p className="location-search-message" role="status">{error}</p>}
      {results.length > 0 && <ul className="location-results" aria-label="Matching places">
        {results.map((place) => <li key={`${place.latitude},${place.longitude},${place.displayName}`}>
          <button type="button" onClick={() => { onSelect(place); setResults([]); setError(""); }}>
            <span>{place.displayName}</span><small>{language === "pt" ? "Escolher este local" : "Choose this place"}</small>
          </button>
        </li>)}
      </ul>}
      <p className="map-attribution-note">{language === "pt" ? "Pesquisa de locais e mapa por OpenStreetMap contributors." : "Place search and map data by OpenStreetMap contributors."}</p>
    </div>
  );
}

export function CalendarView({ ideas, language = "en" }: { ideas: CalendarMapIdea[]; language?: Language }) {
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
          <p className="section-kicker">{language === "pt" ? "O VOSSO DIÁRIO" : "YOUR SHARED DIARY"}</p>
          <h2>{new Intl.DateTimeFormat(language === "pt" ? "pt-PT" : "en-GB", { month: "long", year: "numeric" }).format(month)}</h2>
        </div>
        <div className="calendar-controls">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">←</button>
          <button type="button" onClick={() => { const today = new Date(); setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(localDateKey(today)); }}>{language === "pt" ? "Hoje" : "Today"}</button>
          <button type="button" onClick={() => changeMonth(1)} aria-label="Next month">→</button>
        </div>
      </div>
      <div className="calendar-grid" role="grid" aria-label={new Intl.DateTimeFormat(language === "pt" ? "pt-PT" : "en-GB", { month: "long", year: "numeric" }).format(month)}>
        {(language === "pt" ? ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]).map((weekday) => <span className="calendar-weekday" key={weekday}>{weekday}</span>)}
        {days.map((day) => {
          const dateKey = localDateKey(day);
          const dayEvents = eventsByDate.get(dateKey) ?? [];
          return <button
            type="button"
            role="gridcell"
            key={dateKey}
            className={`calendar-day ${day.getMonth() !== month.getMonth() ? "outside-month" : ""} ${dateKey === selectedDate ? "selected-day" : ""} ${dateKey === localDateKey(new Date()) ? "today-day" : ""}`}
            onClick={() => setSelectedDate(dateKey)}
            aria-label={`${displayDate(dateKey, language)}${dayEvents.length ? `, ${dayEvents.length} ${language === "pt" ? "dates" : `date${dayEvents.length === 1 ? "" : "s"}`}` : ""}`}
            aria-pressed={dateKey === selectedDate}
          >
            <span>{day.getDate()}</span>
            {dayEvents.length > 0 && <span className="calendar-event-dots" aria-hidden="true">{dayEvents.slice(0, 3).map((idea) => <i className={idea.status === "completed" ? "memory-dot" : ""} key={idea.id} />)}{dayEvents.length > 3 && <small>+{dayEvents.length - 3}</small>}</span>}
          </button>;
        })}
      </div>
      <div className="calendar-day-details">
        <h3>{displayDate(selectedDate, language)}</h3>
        {selectedIdeas.length > 0 ? selectedIdeas.map((idea) => <article className="calendar-event" key={idea.id}>
          <span className={idea.status === "completed" ? "calendar-event-marker completed-marker" : "calendar-event-marker"} />
          <div><strong>{idea.title}</strong><span>{displayCategory(idea.category, language)}{idea.location_name ? ` · ${idea.location_name}` : ""}</span></div>
          <small>{idea.status === "completed" ? language === "pt" ? "Memória" : "Memory" : language === "pt" ? "Planeado" : "Planned"}</small>
        </article>) : <p className="calendar-empty">{language === "pt" ? "Ainda não há nada planeado para este dia. Escolha outra data ou planeie um date a partir das ideias." : "Nothing planned for this day yet. Pick another date or plan a date from your ideas."}</p>}
      </div>
      {unscheduledIdeas.length > 0 && <div className="unscheduled-dates">
        <h3>{language === "pt" ? "Dates por agendar" : "Dates to decide"}</h3>
        {unscheduledIdeas.map((idea) => <p key={idea.id}><span>{idea.title}</span><small>{idea.location_name || (language === "pt" ? "Sem local definido" : "No location yet")}</small></p>)}
      </div>}
    </section>
  );
}
