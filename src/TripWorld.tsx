import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { DialogSection } from "./useDialog";
import type { ChangeEvent, FormEvent } from "react";
import { ImagePlus, Plus, Star, Trash2, X } from "lucide-react";
import { supabase } from "./lib/supabase";
import { destinationGuides, findGuide } from "./destinations";
import type { CoupleTrip, DateIdea, TripPhoto } from "./types";

export type MapFilter = "all" | "dates" | "trips";
type MapDate = Pick<DateIdea, "id" | "title" | "status" | "planned_for" | "completed_at" | "location_name" | "latitude" | "longitude">;

const LazyTripWorldMap = lazy(() => import("./TripWorldMap").then((module) => ({ default: module.TripWorldMap })));

type ShownPhoto = TripPhoto & { url: string | null };

function dayKey(offset = 0) {
  const now = new Date();
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
}

function longDate(date: string) {
  return new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

const imageExtensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

// The couple's map: past trips (with their photos and memories) and the places of their dates,
// in one map with one layout. The filter picks what shows.
export function TripWorld({ coupleId, trips, dates = [], filter = "all", onFilter, onPinDate, openTripId, onOpenTrip, onTripsChange }: { coupleId: string; trips: CoupleTrip[]; dates?: MapDate[]; filter?: MapFilter; onFilter?: (filter: MapFilter) => void; onPinDate?: (id: string) => void; openTripId: string | null; onOpenTrip: (id: string | null) => void; onTripsChange: (update: (current: CoupleTrip[]) => CoupleTrip[]) => void }) {
  const [photos, setPhotos] = useState<ShownPhoto[]>([]);
  const [city, setCity] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState("");
  const [confirmingPhoto, setConfirmingPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const located = useRef(new Set<string>());
  const yesterday = dayKey(-1);

  const past = useMemo(() => trips.filter((trip) => trip.end_date <= yesterday).sort((first, second) => second.start_date.localeCompare(first.start_date)), [trips, yesterday]);
  const open = trips.find((trip) => trip.id === openTripId) ?? null;
  const openPhotos = photos.filter((photo) => photo.trip_id === openTripId);
  const urlOf = (path: string | null) => photos.find((photo) => photo.storage_path === path)?.url ?? null;

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    void (async () => {
      const { data, error: loadError } = await client.from("trip_photos").select("*").order("created_at");
      if (!active) return;
      if (loadError) {
        setError(`Não foi possível carregar as fotografias: ${loadError.message}`);
        return;
      }
      const rows = (data ?? []) as TripPhoto[];
      if (rows.length === 0) return;
      const { data: signed } = await client.storage.from("date-photos").createSignedUrls(rows.map((photo) => photo.storage_path), 3600);
      if (active) setPhotos(rows.map((photo, index) => ({ ...photo, url: signed?.[index]?.signedUrl ?? null })));
    })();
    return () => { active = false; };
  }, [coupleId]);

  // Past trips are placed on the map by looking up their city, one at a time as Nominatim asks.
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const missing = past.filter((trip) => trip.latitude === null && !located.current.has(`${trip.id}:${trip.title}`));
    if (missing.length === 0) return;
    let active = true;
    void (async () => {
      for (const trip of missing) {
        if (!active) return;
        located.current.add(`${trip.id}:${trip.title}`);
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=pt-PT&q=${encodeURIComponent(trip.title)}`);
          const [match] = response.ok ? await response.json() as Array<{ lat: string; lon: string }> : [];
          if (match) {
            const position = { latitude: Number(match.lat), longitude: Number(match.lon) };
            const { error: saveError } = await client.from("couple_trips").update(position).eq("id", trip.id);
            if (!saveError) onTripsChange((current) => current.map((item) => item.id === trip.id ? { ...item, ...position } : item));
          }
        } catch {
          located.current.delete(`${trip.id}:${trip.title}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
    })();
    return () => { active = false; };
  }, [onTripsChange, past]);

  useEffect(() => {
    setNote(open?.memory ?? "");
    setConfirmingPhoto(null);
  }, [open?.id, open?.memory]);

  const pins = useMemo(() => past.flatMap((trip) => trip.latitude !== null && trip.longitude !== null ? [{
    id: trip.id,
    title: trip.title,
    latitude: trip.latitude,
    longitude: trip.longitude,
    coverUrl: photos.find((photo) => photo.storage_path === trip.cover_photo_path)?.url ?? null,
    emoji: findGuide(trip.title)?.flag ?? "✈️",
  }] : []), [past, photos]);

  const datedList = useMemo(() => dates
    .filter((date) => date.status === "planned" || date.status === "completed")
    .map((date) => ({ ...date, day: date.status === "completed" ? date.completed_at : date.planned_for }))
    .sort((first, second) => (second.day ?? "").localeCompare(first.day ?? "")), [dates]);
  const datePins = useMemo(() => datedList.flatMap((date) => date.latitude !== null && date.longitude !== null ? [{
    id: date.id,
    title: date.title,
    latitude: date.latitude,
    longitude: date.longitude,
    when: date.day ? longDate(date.day) : "Dia por decidir",
    place: date.location_name,
  }] : []), [datedList]);
  const showTrips = filter !== "dates";
  const showDates = filter !== "trips";

  async function addPastTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = (findGuide(city)?.city ?? city).trim();
    if (!supabase || !title || !start || !end) return;
    setBusy(true);
    setError("");
    const { data, error: saveError } = await supabase.from("couple_trips").insert({ couple_id: coupleId, title, start_date: start, end_date: end }).select("*").single();
    if (saveError) setError(`Não foi possível juntar a viagem: ${saveError.message}`);
    else {
      onTripsChange((current) => [...current, data as CoupleTrip]);
      setCity("");
      setStart("");
      setEnd("");
      setAdding(false);
      onOpenTrip((data as CoupleTrip).id);
    }
    setBusy(false);
  }

  async function updateTrip(id: string, patch: Partial<CoupleTrip>) {
    if (!supabase) return false;
    const { error: saveError } = await supabase.from("couple_trips").update(patch).eq("id", id);
    if (saveError) {
      setError(`Não foi possível guardar: ${saveError.message}`);
      return false;
    }
    onTripsChange((current) => current.map((trip) => trip.id === id ? { ...trip, ...patch } : trip));
    return true;
  }

  // Tapping a button does not always blur the text field on iPhone, so closing saves too.
  function closeMemory() {
    if (open && note !== open.memory) void updateTrip(open.id, { memory: note });
    onOpenTrip(null);
  }

  async function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (!supabase || !open || files.length === 0) return;
    setBusy(true);
    setError("");
    let cover = open.cover_photo_path;
    for (const file of files) {
      const extension = imageExtensions[file.type];
      if (!extension || file.size > 10 * 1024 * 1024) {
        setError(`${file.name} não foi adicionada: tem de ser JPG, PNG, WEBP ou GIF, até 10 MB.`);
        continue;
      }
      const path = `${coupleId}/trips/${open.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("date-photos").upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        setError(`Não foi possível carregar ${file.name}: ${uploadError.message}`);
        continue;
      }
      const { data, error: rowError } = await supabase.from("trip_photos").insert({ couple_id: coupleId, trip_id: open.id, storage_path: path }).select("*").single();
      if (rowError) {
        await supabase.storage.from("date-photos").remove([path]);
        setError(`Não foi possível guardar ${file.name}: ${rowError.message}`);
        continue;
      }
      const { data: signed } = await supabase.storage.from("date-photos").createSignedUrl(path, 3600);
      setPhotos((current) => [...current, { ...(data as TripPhoto), url: signed?.signedUrl ?? null }]);
      if (!cover) {
        cover = path;
        await updateTrip(open.id, { cover_photo_path: path });
      }
    }
    setBusy(false);
  }

  async function removePhoto(photo: ShownPhoto) {
    if (!supabase || !open) return;
    setBusy(true);
    setError("");
    const { error: rowError } = await supabase.from("trip_photos").delete().eq("id", photo.id);
    if (rowError) setError(`Não foi possível apagar a fotografia: ${rowError.message}`);
    else {
      await supabase.storage.from("date-photos").remove([photo.storage_path]);
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
      if (open.cover_photo_path === photo.storage_path) {
        await updateTrip(open.id, { cover_photo_path: openPhotos.find((item) => item.id !== photo.id)?.storage_path ?? null });
      }
    }
    setConfirmingPhoto(null);
    setBusy(false);
  }

  return (
    <section className="trip-world" aria-label="O vosso mapa">
      {error && <p className="form-alert error-alert" role="alert">{error}</p>}
      {onFilter && <div className="map-switch" role="group" aria-label="O que mostrar no mapa">
        {([["all", "Tudo"], ["dates", `Dates · ${datePins.length}`], ["trips", `Viagens · ${pins.length}`]] as Array<[MapFilter, string]>).map(([value, label]) => <button type="button" key={value} className={filter === value ? "active" : ""} aria-pressed={filter === value} onClick={() => onFilter(value)}>{label}</button>)}
      </div>}
      <div className="trip-world-frame">
        <Suspense fallback={<div className="map-loading">A abrir o mapa…</div>}><LazyTripWorldMap pins={showTrips ? pins : []} datePins={showDates ? datePins : []} onOpen={onOpenTrip} /></Suspense>
      </div>

      {showTrips && <>
      {adding ? <form className="panel trip-past-form" onSubmit={(event) => void addPastTrip(event)}>
        <label className="form-label">Para onde foram?<input className="form-input" list="past-trip-guides" required maxLength={120} value={city} onChange={(event) => setCity(event.target.value)} /></label>
        <datalist id="past-trip-guides">{destinationGuides.map((guide) => <option key={guide.city} value={guide.city}>{guide.country}</option>)}</datalist>
        <div className="trip-dates-form">
          <label className="form-label">Ida<input className="form-input" type="date" required max={yesterday} value={start} onChange={(event) => { setStart(event.target.value); if (end && end < event.target.value) setEnd(event.target.value); }} /></label>
          <label className="form-label">Volta<input className="form-input" type="date" required min={start} max={yesterday} value={end} onChange={(event) => setEnd(event.target.value)} /></label>
        </div>
        <div className="panel-actions"><button className="button button-primary" type="submit" disabled={busy || !city.trim() || !start || !end}>Juntar ao mapa</button><button type="button" className="button button-ghost" onClick={() => setAdding(false)}>Cancelar</button></div>
      </form> : <button type="button" className="button button-secondary trip-add-past" onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" />Juntar uma viagem que já fizemos</button>}

      {past.length === 0 && !adding && <p className="schedule-hint">Quando uma viagem terminar, aparece aqui no mapa com a fotografia de capa.</p>}

      {past.length > 0 && <ul className="trip-world-list">
        {past.map((trip) => <li key={trip.id}><button type="button" onClick={() => onOpenTrip(trip.id)}>
          <span className="trip-world-thumb">{urlOf(trip.cover_photo_path) ? <img src={urlOf(trip.cover_photo_path) as string} alt="" /> : findGuide(trip.title)?.flag ?? "✈️"}</span>
          <span><strong>{trip.title}</strong><small>{longDate(trip.start_date)}</small></span>
        </button></li>)}
      </ul>}
      </>}

      {showDates && datedList.length > 0 && <ul className="trip-world-list map-dates-list" aria-label="Dates">
        {datedList.map((date) => <li key={date.id}>
          <div className="map-date-row">
            <span className="trip-world-thumb" aria-hidden="true">♥</span>
            <span><strong>{date.title}</strong><small>{date.day ? longDate(date.day) : "Dia por decidir"}{date.location_name ? ` · ${date.location_name}` : ""}</small></span>
            {date.latitude === null && onPinDate ? <button type="button" className="button button-ghost" onClick={() => onPinDate(date.id)}>Pôr no mapa</button> : <small>{date.status === "completed" ? "Memória" : "Planeado"}</small>}
          </div>
        </li>)}
      </ul>}

      {open && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) closeMemory(); }}>
        <DialogSection onClose={busy ? null : closeMemory} className="modal-card trip-memory" aria-labelledby="trip-memory-title">
          <button type="button" className="modal-close" aria-label="Fechar" disabled={busy} onClick={closeMemory}><X size={20} aria-hidden="true" /></button>
          {urlOf(open.cover_photo_path) && <img className="trip-memory-cover" src={urlOf(open.cover_photo_path) as string} alt={`Fotografia de capa de ${open.title}`} />}
          <h2 id="trip-memory-title">{open.title}</h2>
          <p className="welcome-copy">{longDate(open.start_date)}{open.end_date !== open.start_date ? ` a ${longDate(open.end_date)}` : ""}</p>
          <label className="form-label trip-memory-note">O que não querem esquecer<textarea className="form-input" rows={4} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} onBlur={() => { if (note !== open.memory) void updateTrip(open.id, { memory: note }); }} /></label>
          <div className="trip-memory-photos">
            {openPhotos.map((photo) => <figure key={photo.id}>
              {photo.url ? <img src={photo.url} alt="" loading="lazy" /> : <span />}
              <div>
                <button type="button" aria-label="Usar como capa" aria-pressed={open.cover_photo_path === photo.storage_path} disabled={busy} onClick={() => void updateTrip(open.id, { cover_photo_path: photo.storage_path })}><Star size={16} fill={open.cover_photo_path === photo.storage_path ? "currentColor" : "none"} aria-hidden="true" /></button>
                {confirmingPhoto === photo.id
                  ? <button type="button" className="trip-photo-confirm" disabled={busy} onClick={() => void removePhoto(photo)}>Apagar?</button>
                  : <button type="button" aria-label="Apagar fotografia" disabled={busy} onClick={() => setConfirmingPhoto(photo.id)}><Trash2 size={16} aria-hidden="true" /></button>}
              </div>
            </figure>)}
          </div>
          <label className="button button-secondary trip-memory-upload"><ImagePlus size={16} aria-hidden="true" />{busy ? "A guardar…" : "Juntar fotografias"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple disabled={busy} onChange={(event) => void addPhotos(event)} /></label>
        </DialogSection>
      </div>}
    </section>
  );
}
