import { useState } from "react";
import type { DateIdea, GeocodedPlace } from "./types";

export type CalendarMapIdea = Pick<DateIdea, "id" | "title" | "category" | "status" | "planned_for" | "completed_at" | "location_name" | "latitude" | "longitude">;
let lastPlaceSearchAt = 0;

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

