import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Bookmark, CalendarPlus, ExternalLink, LocateFixed, MapPin, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "./lib/supabase";
import { cuisineFilters, mapsUrl, rankPlaces, searchPlaces, theForkUrl } from "./osmPlaces";
import type { OsmPlace } from "./osmPlaces";
import type { CouplePlace, DateIdea, PlaceKind } from "./types";

type PlacesCouple = { id: string; partner_one_name: string; partner_two_name: string; weather_latitude: number | null; weather_longitude: number | null; weather_location_name: string | null };

export type PlaceToPlan = { placeId: string; name: string; kind: PlaceKind; latitude: number | null; longitude: number | null };

const distances = [
  { km: 1.2, label: "A pé" },
  { km: 6, label: "Até 15 min" },
  { km: 20, label: "Até 30 min" },
];
const kinds: Array<{ value: PlaceKind; label: string; emoji: string }> = [
  { value: "restaurant", label: "Jantar", emoji: "🍽️" },
  { value: "cafe", label: "Café / brunch", emoji: "☕" },
  { value: "bar", label: "Bar", emoji: "🍸" },
];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function PlanForm({ onPlan, busy }: { onPlan: (date: string, time: string) => void; busy: boolean }) {
  const now = new Date();
  const choices = [
    { key: dateKey(now), label: "Hoje" },
    { key: dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)), label: "Amanhã" },
    { key: dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((6 - now.getDay() + 7) % 7 || 7))), label: "Sábado" },
  ].filter((choice, index, all) => all.findIndex((other) => other.key === choice.key) === index);
  const [day, setDay] = useState(choices[choices.length - 1].key);
  const [time, setTime] = useState("20:00");
  return <form className="place-plan-form" onSubmit={(event) => { event.preventDefault(); if (day) onPlan(day, time); }}>
    <div className="chip-row">{choices.map((choice) => <button type="button" key={choice.key} className={`chip ${day === choice.key ? "selected" : ""}`} aria-pressed={day === choice.key} onClick={() => setDay(choice.key)}>{choice.label}</button>)}</div>
    <div className="quick-add-row"><input className="form-input" type="date" aria-label="Dia" value={day} min={dateKey(now)} onChange={(event) => setDay(event.target.value)} /><input className="form-input" type="time" aria-label="Hora" value={time} onChange={(event) => setTime(event.target.value)} /></div>
    <button className="button button-primary" type="submit" disabled={busy || !day}>Marcar date</button>
  </form>;
}

export function PlacesPanel({ couple, dates, busy, onPlan }: { couple: PlacesCouple; dates: DateIdea[]; busy: boolean; onPlan: (place: PlaceToPlan, date: string, time: string) => Promise<boolean> }) {
  const [places, setPlaces] = useState<CouplePlace[]>([]);
  const [mode, setMode] = useState<"new" | "approved">("new");
  const [kind, setKind] = useState<PlaceKind>("restaurant");
  const [radiusKm, setRadiusKm] = useState(distances[1].km);
  const [cuisine, setCuisine] = useState("");
  const [origin, setOrigin] = useState<{ latitude: number; longitude: number; label: string } | null>(
    couple.weather_latitude !== null && couple.weather_longitude !== null
      ? { latitude: couple.weather_latitude, longitude: couple.weather_longitude, label: couple.weather_location_name ?? "Localização do casal" }
      : null);
  const [results, setResults] = useState<OsmPlace[] | null>(null);
  const [searchedRadius, setSearchedRadius] = useState(distances[1].km);
  const [seed, setSeed] = useState(1);
  const [offset, setOffset] = useState(0);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [planningId, setPlanningId] = useState<string | null>(null);
  const [savedTab, setSavedTab] = useState<"want" | "liked" | "no">("want");

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.from("couple_places").select("*").order("created_at").then((placeResult) => {
      if (!active) return;
      if (placeResult.error) setMessage(`Não foi possível carregar os vossos sítios: ${placeResult.error.message}`);
      setPlaces((placeResult.data ?? []) as CouplePlace[]);
    });
    return () => { active = false; };
  }, [couple.id]);

  const visitedPlaceIds = useMemo(() => new Set(dates.filter((date) => date.status === "completed" && date.place_id).map((date) => date.place_id as string)), [dates]);
  const savedByRef = useMemo(() => new Map(places.map((place) => [place.place_ref, place])), [places]);
  const visitedRefs = useMemo(() => new Set(places.filter((place) => visitedPlaceIds.has(place.id)).map((place) => place.place_ref)), [places, visitedPlaceIds]);
  // Somewhere new: leave out the places they've already judged.
  const ranked = useMemo(() => rankPlaces((results ?? []).filter((place) => !savedByRef.get(place.ref)?.verdict), visitedRefs, searchedRadius, seed), [results, savedByRef, searchedRadius, seed, visitedRefs]);
  const shown = ranked.slice(offset, offset + 3);
  const approved = useMemo(() => places.filter((place) => place.verdict === "liked" && place.kind === kind), [kind, places]);
  const lastFood = (placeId: string) => dates.filter((date) => date.place_id === placeId && date.food_notes).sort((first, second) => (second.completed_at ?? "").localeCompare(first.completed_at ?? ""))[0]?.food_notes ?? null;

  function locateMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => setOrigin({ latitude: position.coords.latitude, longitude: position.coords.longitude, label: "Onde estou agora" }),
      () => setMessage("Não foi possível obter a localização deste dispositivo."),
      { enableHighAccuracy: false, timeout: 10000 });
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!origin) return;
    setSearching(true);
    setMessage("");
    try {
      const found = await searchPlaces({ latitude: origin.latitude, longitude: origin.longitude, radiusKm, kind, cuisine });
      setResults(found);
      setSearchedRadius(radiusKm);
      setOffset(0);
      setSeed((current) => current + 1);
      if (found.length === 0) setMessage("Nada encontrado com estes filtros. Experimentem aumentar a distância ou escolher outra cozinha.");
    } catch {
      setMessage("A pesquisa de sítios não respondeu. Tentem daqui a pouco.");
    }
    setSearching(false);
  }

  function nextThree() {
    if (offset + 3 < ranked.length) setOffset(offset + 3);
    else {
      setSeed((current) => current + 1);
      setOffset(0);
    }
  }

  async function savePlace(result: OsmPlace) {
    const existing = savedByRef.get(result.ref);
    if (existing || !supabase) return existing ?? null;
    const { data, error } = await supabase.from("couple_places").insert({
      couple_id: couple.id,
      place_ref: result.ref,
      name: result.name,
      address: result.address,
      latitude: result.latitude,
      longitude: result.longitude,
      kind: result.kind,
    }).select("*").single();
    if (error) {
      setMessage(`Não foi possível guardar o sítio: ${error.message}`);
      return null;
    }
    setPlaces((current) => [...current, data as CouplePlace]);
    return data as CouplePlace;
  }

  async function planAt(place: CouplePlace, date: string, time: string) {
    if (await onPlan({ placeId: place.id, name: place.name, kind: place.kind, latitude: place.latitude, longitude: place.longitude }, date, time)) {
      setPlanningId(null);
      setMessage(`Date marcado em ${place.name}.`);
    }
  }

  async function removePlace(place: CouplePlace) {
    if (!supabase) return;
    const { error } = await supabase.from("couple_places").delete().eq("id", place.id);
    if (error) setMessage(`Não foi possível remover: ${error.message}`);
    else setPlaces((current) => current.filter((item) => item.id !== place.id));
  }

  async function setVerdict(place: CouplePlace, verdict: CouplePlace["verdict"]) {
    if (!supabase) return;
    const { error } = await supabase.from("couple_places").update({ verdict }).eq("id", place.id);
    if (error) setMessage(`Não foi possível atualizar: ${error.message}`);
    else setPlaces((current) => current.map((item) => item.id === place.id ? { ...item, verdict } : item));
  }

  const savedList = places.filter((place) => savedTab === "want" ? !place.verdict : place.verdict === savedTab);
  const kindEmoji = (value: PlaceKind) => kinds.find((item) => item.value === value)?.emoji ?? "📍";

  return (
    <section className="places-page" aria-label="Sítios">
      <div className="chip-row places-mode" role="group" aria-label="Que tipo de sítio">{([["new", "Experimentar um novo"], ["approved", "Voltar a um que gostámos"]] as const).map(([value, label]) => <button type="button" key={value} className={`chip ${mode === value ? "selected" : ""}`} aria-pressed={mode === value} onClick={() => setMode(value)}>{label}</button>)}</div>

      {mode === "approved" && <section className="panel places-approved" aria-label="Sítios aprovados">
        <div className="chip-row" role="group" aria-label="Tipo">{kinds.map((item) => <button type="button" key={item.value} className={`chip ${kind === item.value ? "selected" : ""}`} aria-pressed={kind === item.value} onClick={() => setKind(item.value)}>{item.label}</button>)}</div>
        {approved.length === 0 ? <p className="panel-copy saved-empty">Ainda não há sítios aprovados aqui. Quando disserem que querem repetir um date num sítio, ele aparece nesta lista.</p> : <ul className="saved-place-list">{approved.map((place) => <li key={place.id}>
          <div><strong>{kindEmoji(place.kind)} {place.name}</strong>{lastFood(place.id) && <small className="place-food">Da última vez: {lastFood(place.id)}</small>}</div>
          <div className="panel-actions"><button type="button" className="button button-primary" onClick={() => setPlanningId(planningId === place.id ? null : place.id)}><CalendarPlus size={16} aria-hidden="true" />Marcar</button><a className="button button-ghost" href={mapsUrl(place.name, place.latitude, place.longitude)} target="_blank" rel="noopener noreferrer">Maps<ExternalLink size={14} aria-hidden="true" /></a></div>
          {planningId === place.id && <PlanForm busy={busy} onPlan={(date, time) => void planAt(place, date, time)} />}
        </li>)}</ul>}
      </section>}

      {mode === "new" && <form className="panel places-finder" onSubmit={(event) => void search(event)}>
        <p className="panel-label">Encontrar um sítio</p>
        <div className="chip-row" role="group" aria-label="Tipo">{kinds.map((item) => <button type="button" key={item.value} className={`chip ${kind === item.value ? "selected" : ""}`} aria-pressed={kind === item.value} onClick={() => setKind(item.value)}>{item.label}</button>)}</div>
        <div className="finder-grid">
          <label className="form-label">Distância<select className="form-input" value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))}>{distances.map((distance) => <option key={distance.km} value={distance.km}>{distance.label}</option>)}</select></label>
          {kind === "restaurant" && <label className="form-label">Cozinha<select className="form-input" value={cuisine} onChange={(event) => setCuisine(event.target.value)}>{cuisineFilters.map((item) => <option key={item.label} value={item.value}>{item.label}</option>)}</select></label>}
        </div>
        <div className="finder-origin"><MapPin size={16} aria-hidden="true" /><span>{origin ? origin.label : "Sem localização"}</span><button type="button" className="button button-ghost" onClick={locateMe}><LocateFixed size={16} aria-hidden="true" />Usar onde estou</button></div>
        <button className="button button-primary" type="submit" disabled={searching || !origin}>{searching ? "A procurar…" : "Dar-me 3 ideias"}</button>
      </form>}

      {message && <p className="form-alert config-alert" role="status">{message}</p>}

      {mode === "new" && shown.length > 0 && <section aria-label="Sugestões">
        <div className="panel-heading places-results-heading"><h2>3 ideias para vocês</h2><button type="button" className="button button-secondary" onClick={nextThree}><RefreshCw size={16} aria-hidden="true" />Outras 3</button></div>
        <div className="place-grid">
          {shown.map((result) => {
            const saved = savedByRef.get(result.ref);
            return <article className="place-card" key={result.ref}>
              <div className="place-body">
                <h3><span aria-hidden="true">{kindEmoji(result.kind)}</span> {result.name}</h3>
                <p className="place-facts">{result.cuisine && <span>{result.cuisine}</span>}<span>{result.distanceKm} km</span></p>
                {result.address && <p className="place-type">{result.address}</p>}
                {result.openingHours && <p className="place-type">{result.openingHours}</p>}
                {saved && visitedPlaceIds.has(saved.id) && <p className="place-type">Já foram aqui</p>}
                <div className="panel-actions">
                  <button type="button" className="button button-primary" onClick={() => setPlanningId(planningId === result.ref ? null : result.ref)}><CalendarPlus size={16} aria-hidden="true" />Marcar</button>
                  <button type="button" className="button button-secondary" disabled={Boolean(saved)} onClick={() => void savePlace(result)}><Bookmark size={16} fill={saved ? "currentColor" : "none"} aria-hidden="true" />{saved ? "Guardado" : "Guardar"}</button>
                </div>
                <div className="place-links">
                  <a href={mapsUrl(result.name, result.latitude, result.longitude)} target="_blank" rel="noopener noreferrer">Ver avaliações no Maps<ExternalLink size={13} aria-hidden="true" /></a>
                  {result.kind === "restaurant" && <a href={theForkUrl(result.name, result.address)} target="_blank" rel="noopener noreferrer">TheFork<ExternalLink size={13} aria-hidden="true" /></a>}
                </div>
                {planningId === result.ref && <PlanForm busy={busy} onPlan={(date, time) => void savePlace(result).then((place) => place && planAt(place, date, time))} />}
              </div>
            </article>;
          })}
        </div>
        <p className="osm-credit">Dados de sítios © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">contribuidores do OpenStreetMap</a></p>
      </section>}

      <section className="panel saved-places" aria-label="Os vossos sítios">
        <div className="panel-heading"><h2>Os vossos sítios</h2></div>
        <div className="chip-row" role="tablist">{(["want", "liked", "no"] as const).map((tab) => <button type="button" role="tab" key={tab} aria-selected={savedTab === tab} className={`chip ${savedTab === tab ? "selected" : ""}`} onClick={() => setSavedTab(tab)}>{tab === "want" ? "Queremos ir" : tab === "liked" ? "Aprovados" : "Não repetir"}</button>)}</div>
        {savedList.length === 0 ? <p className="panel-copy saved-empty">{savedTab === "want" ? "Guardem sítios a partir das sugestões para os terem aqui." : savedTab === "liked" ? "Os sítios de que gostaram aparecem aqui." : "Os sítios a evitar aparecem aqui."}</p> : <ul className="saved-place-list">
          {savedList.map((place) => {
            const visits = dates.filter((date) => date.status === "completed" && date.place_id === place.id).length;
            return <li key={place.id}>
              <div className="saved-place-main">
                <div><strong>{kindEmoji(place.kind)} {place.name}</strong>{place.address && <small>{place.address}</small>}{visits > 0 && <small>{`${visits} date${visits === 1 ? "" : "s"} aqui`}</small>}</div>
                <div className="saved-place-actions">
                  <button type="button" className="icon-button" aria-label="Marcar date aqui" onClick={() => setPlanningId(planningId === place.id ? null : place.id)}><CalendarPlus size={17} aria-hidden="true" /></button>
                  <a className="icon-button" aria-label="Abrir no Google Maps" href={mapsUrl(place.name, place.latitude, place.longitude)} target="_blank" rel="noopener noreferrer"><ExternalLink size={17} aria-hidden="true" /></a>
                  <button type="button" className="icon-button" aria-label="Remover" onClick={() => void removePlace(place)}><Trash2 size={17} aria-hidden="true" /></button>
                </div>
              </div>
              {lastFood(place.id) && <small className="place-food">Da última vez: {lastFood(place.id)}</small>}
              <div className="chip-row" role="group" aria-label={`Veredito sobre ${place.name}`}><button type="button" className={`chip ${place.verdict === "liked" ? "selected" : ""}`} aria-pressed={place.verdict === "liked"} onClick={() => void setVerdict(place, place.verdict === "liked" ? null : "liked")}>Aprovado</button><button type="button" className={`chip ${place.verdict === "no" ? "selected" : ""}`} aria-pressed={place.verdict === "no"} onClick={() => void setVerdict(place, place.verdict === "no" ? null : "no")}>Não repetir</button></div>
              {planningId === place.id && <PlanForm busy={busy} onPlan={(date, time) => void planAt(place, date, time)} />}
            </li>;
          })}
        </ul>}
      </section>
    </section>
  );
}
