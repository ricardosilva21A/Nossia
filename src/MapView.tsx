import { divIcon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import type { CalendarMapIdea } from "./CalendarMap";
import "leaflet/dist/leaflet.css";

function displayDate(date: string | null) {
  return date
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`))
    : "Date to decide";
}

export function MapView({ ideas, onPinLocation }: { ideas: CalendarMapIdea[]; onPinLocation: (idea: CalendarMapIdea) => void }) {
  const datedIdeas = ideas
    .filter((idea) => idea.status === "planned" || idea.status === "completed")
    .sort((a, b) => (a.planned_for ?? a.completed_at ?? "").localeCompare(b.planned_for ?? b.completed_at ?? ""));
  const pinnedIdeas = datedIdeas.filter(
    (idea): idea is CalendarMapIdea & { latitude: number; longitude: number } => idea.latitude !== null && idea.longitude !== null,
  );
  const mapCenter: [number, number] = pinnedIdeas.length
    ? [
        pinnedIdeas.reduce((sum, idea) => sum + idea.latitude, 0) / pinnedIdeas.length,
        pinnedIdeas.reduce((sum, idea) => sum + idea.longitude, 0) / pinnedIdeas.length,
      ]
    : [20, 0];
  const markerIcon = divIcon({ className: "map-heart-marker", html: "<span>♥</span>", iconSize: [32, 32], iconAnchor: [16, 16] });

  return (
    <section className="map-panel" aria-label="Map of your dates">
      <div className="map-heading">
        <div><p className="section-kicker">YOUR PLACES, YOUR STORY</p><h2>Dates on the map <span className="heading-count">{pinnedIdeas.length}</span></h2></div>
        <p>Each pin marks a planned date or a memory with a location.</p>
      </div>
      {pinnedIdeas.length > 0 ? <MapContainer key={pinnedIdeas.map((idea) => idea.id).join(",")} center={mapCenter} zoom={pinnedIdeas.length === 1 ? 12 : 4} scrollWheelZoom={false} className="date-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pinnedIdeas.map((idea) => <Marker key={idea.id} position={[idea.latitude, idea.longitude]} icon={markerIcon}>
          <Popup><strong>{idea.title}</strong><br />{idea.location_name}<br />{displayDate(idea.status === "completed" ? idea.completed_at : idea.planned_for)}</Popup>
        </Marker>)}
      </MapContainer> : <div className="map-empty"><span>⌖</span><h3>No places pinned yet</h3><p>Add a date location and choose a matching place from OpenStreetMap. It will appear here.</p></div>}
      {datedIdeas.length > 0 && <div className="map-date-list">
        {datedIdeas.map((idea) => {
          const date = idea.status === "completed" ? idea.completed_at : idea.planned_for;
          return <article className="map-date-item" key={idea.id}>
            <span className={idea.latitude !== null && idea.longitude !== null ? "map-date-pin is-pinned" : "map-date-pin"}>⌖</span>
            <div><strong>{idea.title}</strong><span>{displayDate(date)}{idea.location_name ? ` · ${idea.location_name}` : " · No location"}</span></div>
            {idea.latitude === null || idea.longitude === null ? <button type="button" onClick={() => onPinLocation(idea)}>Add a pin</button> : <small>{idea.status === "completed" ? "Memory" : "Planned"}</small>}
          </article>;
        })}
      </div>}
    </section>
  );
}
