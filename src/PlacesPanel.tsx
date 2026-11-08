import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Bookmark, CalendarPlus, ExternalLink, LocateFixed, MapPin, RefreshCw, Star, Trash2 } from "lucide-react";
import { supabase } from "./lib/supabase";
import { cuisineFilters, mapsUrl, rankPlaces, searchPlaces, theForkUrl } from "./osmPlaces";
import type { OsmPlace } from "./osmPlaces";
import type { CouplePlace, DateIdea, HomePartner, PlaceKind, PlaceRating } from "./types";

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

function Stars({ value, onChange, label }: { value: number; onChange?: (value: number) => void; label: string }) {
  return <span className="stars" role={onChange ? "radiogroup" : "img"} aria-label={`${label}: ${value} em 5`}>
    {[1, 2, 3, 4, 5].map((star) => onChange
      ? <button key={star} type="button" role="radio" aria-checked={value === star} aria-label={`${star}`} onClick={() => onChange(star)}><Star size={22} fill={star <= value ? "currentColor" : "none"} aria-hidden="true" /></button>
      : <Star key={star} size={15} fill={star <= value ? "currentColor" : "none"} aria-hidden="true" />)}
  </span>;
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

export function PlacesPanel({ couple, mySlot, dates, busy, onPlan }: { couple: PlacesCouple; mySlot: HomePartner | null; dates: DateIdea[]; busy: boolean; onPlan: (place: PlaceToPlan, date: string, time: string) => Promise<boolean> }) {
  const [places, setPlaces] = useState<CouplePlace[]>([]);
  const [ratings, setRatings] = useState<PlaceRating[]>([]);
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
  const [savedTab, setSavedTab] = useState<"want" | "been">("want");
  const [ratingDraft, setRatingDraft] = useState<{ placeId: string; rating: number; comment: string } | null>(null);
  const partnerName = (slot: HomePartner) => slot === "partner_one" ? couple.partner_one_name : couple.partner_two_name;

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void Promise.all([
      supabase.from("couple_places").select("*").order("created_at"),
      supabase.from("place_ratings").select("*"),
    ]).then(([placeResult, ratingResult]) => {
      if (!active) return;
      const loadError = placeResult.error ?? ratingResult.error;
      if (loadError) setMessage(`Não foi possível carregar os vossos sítios: ${loadError.message}`);
      setPlaces((placeResult.data ?? []) as CouplePlace[]);
      setRatings((ratingResult.data ?? []) as PlaceRating[]);
    });
    return () => { active = false; };
  }, [couple.id]);

  const visitedPlaceIds = useMemo(() => new Set([
    ...dates.filter((date) => date.status === "completed" && date.place_id).map((date) => date.place_id as string),
    ...ratings.map((rating) => rating.place_id),
  ]), [dates, ratings]);
  const savedByRef = useMemo(() => new Map(places.map((place) => [place.place_ref, place])), [places]);
  const visitedRefs = useMemo(() => new Set(places.filter((place) => visitedPlaceIds.has(place.id)).map((place) => place.place_ref)), [places, visitedPlaceIds]);
  const ranked = useMemo(() => rankPlaces(results ?? [], visitedRefs, searchedRadius, seed), [results, searchedRadius, seed, visitedRefs]);
  const shown = ranked.slice(offset, offset + 3);

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

  async function saveRating() {
    if (!supabase || !ratingDraft || !mySlot || ratingDraft.rating < 1) return;
    const { data, error } = await supabase.from("place_ratings").upsert({
      place_id: ratingDraft.placeId,
      partner_slot: mySlot,
      rating: ratingDraft.rating,
      comment: ratingDraft.comment.trim(),
      updated_at: new Date().toISOString(),
    }).select("*").single();
    if (error) {
      setMessage(`Não foi possível guardar a avaliação: ${error.message}`);
      return;
    }
    setRatings((current) => [...current.filter((rating) => !(rating.place_id === ratingDraft.placeId && rating.partner_slot === mySlot)), data as PlaceRating]);
    setRatingDraft(null);
  }

  const savedList = places.filter((place) => savedTab === "been" ? visitedPlaceIds.has(place.id) : !visitedPlaceIds.has(place.id));
  const kindEmoji = (value: PlaceKind) => kinds.find((item) => item.value === value)?.emoji ?? "📍";

  return (
    <section className="places-page" aria-label="Sítios">
      <form className="panel places-finder" onSubmit={(event) => void search(event)}>
        <p className="panel-label">Encontrar um sítio</p>
        <div className="chip-row" role="group" aria-label="Tipo">{kinds.map((item) => <button type="button" key={item.value} className={`chip ${kind === item.value ? "selected" : ""}`} aria-pressed={kind === item.value} onClick={() => setKind(item.value)}>{item.label}</button>)}</div>
        <div className="finder-grid">
          <label className="form-label">Distância<select className="form-input" value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))}>{distances.map((distance) => <option key={distance.km} value={distance.km}>{distance.label}</option>)}</select></label>
          {kind === "restaurant" && <label className="form-label">Cozinha<select className="form-input" value={cuisine} onChange={(event) => setCuisine(event.target.value)}>{cuisineFilters.map((item) => <option key={item.label} value={item.value}>{item.label}</option>)}</select></label>}
        </div>
        <div className="finder-origin"><MapPin size={16} aria-hidden="true" /><span>{origin ? origin.label : "Sem localização"}</span><button type="button" className="button button-ghost" onClick={locateMe}><LocateFixed size={16} aria-hidden="true" />Usar onde estou</button></div>
        <button className="button button-primary" type="submit" disabled={searching || !origin}>{searching ? "A procurar…" : "Dar-me 3 ideias"}</button>
      </form>

      {message && <p className="form-alert config-alert" role="status">{message}</p>}

      {shown.length > 0 && <section aria-label="Sugestões">
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
        <div className="chip-row" role="tablist">{(["want", "been"] as const).map((tab) => <button type="button" role="tab" key={tab} aria-selected={savedTab === tab} className={`chip ${savedTab === tab ? "selected" : ""}`} onClick={() => setSavedTab(tab)}>{tab === "want" ? "Queremos ir" : "Já fomos"}</button>)}</div>
        {savedList.length === 0 ? <p className="panel-copy saved-empty">{savedTab === "want" ? "Guardem sítios a partir das sugestões para os terem aqui." : "Quando fizerem um date num sítio guardado, ou o avaliarem, aparece aqui."}</p> : <ul className="saved-place-list">
          {savedList.map((place) => {
            const placeRatings = ratings.filter((rating) => rating.place_id === place.id);
            const visits = dates.filter((date) => date.status === "completed" && date.place_id === place.id).length;
            const mine = placeRatings.find((rating) => rating.partner_slot === mySlot);
            return <li key={place.id}>
              <div className="saved-place-main">
                <div><strong>{kindEmoji(place.kind)} {place.name}</strong>{place.address && <small>{place.address}</small>}{visits > 0 && <small>{`${visits} date${visits === 1 ? "" : "s"} aqui`}</small>}</div>
                <div className="saved-place-actions">
                  <button type="button" className="icon-button" aria-label="Marcar date aqui" onClick={() => setPlanningId(planningId === place.id ? null : place.id)}><CalendarPlus size={17} aria-hidden="true" /></button>
                  <a className="icon-button" aria-label="Abrir no Google Maps" href={mapsUrl(place.name, place.latitude, place.longitude)} target="_blank" rel="noopener noreferrer"><ExternalLink size={17} aria-hidden="true" /></a>
                  <button type="button" className="icon-button" aria-label="Remover" onClick={() => void removePlace(place)}><Trash2 size={17} aria-hidden="true" /></button>
                </div>
              </div>
              {placeRatings.length > 0 && <div className="saved-place-ratings">{placeRatings.map((rating) => <p key={rating.partner_slot}><span>{partnerName(rating.partner_slot)}</span><Stars value={rating.rating} label={partnerName(rating.partner_slot)} />{rating.comment && <em>“{rating.comment}”</em>}</p>)}</div>}
              {mySlot && (ratingDraft?.placeId === place.id
                ? <div className="rating-form"><Stars value={ratingDraft.rating} label="A tua avaliação" onChange={(rating) => setRatingDraft({ ...ratingDraft, rating })} /><input className="form-input" maxLength={300} placeholder="Comentário (opcional)" value={ratingDraft.comment} onChange={(event) => setRatingDraft({ ...ratingDraft, comment: event.target.value })} /><button type="button" className="button button-primary" disabled={ratingDraft.rating < 1} onClick={() => void saveRating()}>Guardar</button></div>
                : <button type="button" className="button button-ghost rate-button" onClick={() => setRatingDraft({ placeId: place.id, rating: mine?.rating ?? 0, comment: mine?.comment ?? "" })}><Star size={15} aria-hidden="true" />{mine ? "Mudar a tua avaliação" : "Avaliar"}</button>)}
              {planningId === place.id && <PlanForm busy={busy} onPlan={(date, time) => void planAt(place, date, time)} />}
            </li>;
          })}
        </ul>}
      </section>
    </section>
  );
}
