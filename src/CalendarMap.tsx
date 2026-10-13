import { useMemo, useState } from "react";
import type { DateIdea, GeocodedPlace } from "./types";

export type CalendarMapIdea = Pick<DateIdea, "id" | "title" | "category" | "status" | "planned_for" | "completed_at" | "location_name" | "latitude" | "longitude">;
let lastPlaceSearchAt = 0;

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function displayDate(date: string | null) {
  return date
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`))
    : "Date to decide";
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
      setError("Enter at least 3 characters to search for a place.");
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
      if (places.length === 0) setError("No matching places found. Try a nearby street, town or venue.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't search OpenStreetMap. Please try again.");
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
          placeholder="A place, city, or venue"
          aria-label="Date location"
        />
        <button type="button" className="location-search-button" onClick={() => void searchLocation()} disabled={searching}>
          {searching ? "Searching…" : "Find on map"}
        </button>
      </div>
      {error && <p className="location-search-message" role="status">{error}</p>}
      {results.length > 0 && <ul className="location-results" aria-label="Matching places">
        {results.map((place) => <li key={`${place.latitude},${place.longitude},${place.displayName}`}>
          <button type="button" onClick={() => { onSelect(place); setResults([]); setError(""); }}>
            <span>{place.displayName}</span><small>Choose this place</small>
          </button>
        </li>)}
      </ul>}
      <p className="map-attribution-note">Place search and map data by OpenStreetMap contributors.</p>
    </div>
  );
}

export function CalendarView({ ideas }: { ideas: CalendarMapIdea[] }) {
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
          <p className="section-kicker">YOUR SHARED DIARY</p>
          <h2>{new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(month)}</h2>
        </div>
        <div className="calendar-controls">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">←</button>
          <button type="button" onClick={() => { const today = new Date(); setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(localDateKey(today)); }}>Today</button>
          <button type="button" onClick={() => changeMonth(1)} aria-label="Next month">→</button>
        </div>
      </div>
      <div className="calendar-grid" role="grid" aria-label={new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(month)}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((weekday) => <span className="calendar-weekday" key={weekday}>{weekday}</span>)}
        {days.map((day) => {
          const dateKey = localDateKey(day);
          const dayEvents = eventsByDate.get(dateKey) ?? [];
          return <button
            type="button"
            role="gridcell"
            key={dateKey}
            className={`calendar-day ${day.getMonth() !== month.getMonth() ? "outside-month" : ""} ${dateKey === selectedDate ? "selected-day" : ""} ${dateKey === localDateKey(new Date()) ? "today-day" : ""}`}
            onClick={() => setSelectedDate(dateKey)}
            aria-label={`${displayDate(dateKey)}${dayEvents.length ? `, ${dayEvents.length} date${dayEvents.length === 1 ? "" : "s"}` : ""}`}
            aria-pressed={dateKey === selectedDate}
          >
            <span>{day.getDate()}</span>
            {dayEvents.length > 0 && <span className="calendar-event-dots" aria-hidden="true">{dayEvents.slice(0, 3).map((idea) => <i className={idea.status === "completed" ? "memory-dot" : ""} key={idea.id} />)}{dayEvents.length > 3 && <small>+{dayEvents.length - 3}</small>}</span>}
          </button>;
        })}
      </div>
      <div className="calendar-day-details">
        <h3>{displayDate(selectedDate)}</h3>
        {selectedIdeas.length > 0 ? selectedIdeas.map((idea) => <article className="calendar-event" key={idea.id}>
          <span className={idea.status === "completed" ? "calendar-event-marker completed-marker" : "calendar-event-marker"} />
          <div><strong>{idea.title}</strong><span>{idea.category}{idea.location_name ? ` · ${idea.location_name}` : ""}</span></div>
          <small>{idea.status === "completed" ? "Memory" : "Planned"}</small>
        </article>) : <p className="calendar-empty">Nothing planned for this day yet. Pick another date or plan a date from your ideas.</p>}
      </div>
      {unscheduledIdeas.length > 0 && <div className="unscheduled-dates">
        <h3>Dates to decide</h3>
        {unscheduledIdeas.map((idea) => <p key={idea.id}><span>{idea.title}</span><small>{idea.location_name || "No location yet"}</small></p>)}
      </div>}
    </section>
  );
}
