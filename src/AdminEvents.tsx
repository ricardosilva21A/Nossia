import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "./lib/supabase";
import type { LocalEvent } from "./events";
import type { Category } from "./types";

type Draft = Omit<LocalEvent, "id" | "price_for_two" | "latitude" | "longitude" | "tags" | "url" | "image_url" | "start_time"> & { id: string | null; price_for_two: string; start_time: string; url: string; image_url: string; tags: string };

const categories: Array<[Category, string]> = [["Culture", "Cultura"], ["Creative", "Criativo"], ["Food & drink", "Comida e bebida"], ["Adventure", "Aventura"], ["Relaxing", "Relaxante"], ["Romantic", "Romântico"]];
const reachLabels: Record<LocalEvent["reach"], string> = { local: "Local (até 60 km)", regional: "Regional (até 150 km)", national: "Nacional (vale a viagem)" };
const statusLabels: Record<LocalEvent["status"], string> = { pending: "À espera", approved: "Aprovado", rejected: "Recusado" };
const today = () => new Date().toISOString().slice(0, 10);
const emptyDraft = (): Draft => ({ id: null, title: "", description: "", starts_on: today(), ends_on: today(), start_time: "", venue: "", municipality: "", category: "Culture", price_for_two: "", indoor: false, url: "", image_url: "", tags: "", featured: false, reach: "local", status: "approved" });

async function locate(venue: string, municipality: string) {
  const query = [venue, municipality, "Portugal"].filter(Boolean).join(", ");
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=pt&accept-language=pt-PT&q=${encodeURIComponent(query)}`);
    const [match] = response.ok ? await response.json() as Array<{ lat: string; lon: string }> : [];
    if (match) return { latitude: Number(match.lat), longitude: Number(match.lon) };
    if (venue) return locate("", municipality);
  } catch {
    // The event is still saved; it just shows without a distance.
  }
  return { latitude: null, longitude: null };
}

export function AdminEvents() {
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase?.from("events").select("*").order("starts_on", { ascending: false }).then(({ data, error: loadError }) => {
      if (loadError) setError(`Não foi possível carregar os eventos: ${loadError.message}`);
      else setEvents((data ?? []) as LocalEvent[]);
    });
  }, []);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => current && { ...current, [key]: value });

  async function save() {
    if (!supabase || !draft) return;
    setBusy(true);
    setError("");
    const original = events.find((event) => event.id === draft.id);
    const moved = !original || original.venue !== draft.venue.trim() || original.municipality !== draft.municipality.trim();
    const position = moved ? await locate(draft.venue.trim(), draft.municipality.trim()) : { latitude: original.latitude, longitude: original.longitude };
    const row = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      starts_on: draft.starts_on,
      ends_on: draft.ends_on < draft.starts_on ? draft.starts_on : draft.ends_on,
      start_time: draft.start_time || null,
      venue: draft.venue.trim(),
      municipality: draft.municipality.trim(),
      ...position,
      category: draft.category,
      price_for_two: draft.price_for_two === "" ? null : Number(draft.price_for_two),
      indoor: draft.indoor,
      url: draft.url.trim() || null,
      image_url: draft.image_url.trim() || null,
      tags: draft.tags.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean),
      featured: draft.featured,
      reach: draft.reach,
      status: draft.status,
    };
    const query = draft.id ? supabase.from("events").update(row).eq("id", draft.id) : supabase.from("events").insert(row);
    const { data, error: saveError } = await query.select("*").single();
    setBusy(false);
    if (saveError) {
      setError(`Não foi possível guardar: ${saveError.message}`);
      return;
    }
    const saved = data as LocalEvent;
    setEvents((current) => [saved, ...current.filter((event) => event.id !== saved.id)].sort((first, second) => second.starts_on.localeCompare(first.starts_on)));
    if (saved.latitude === null) setError("Guardado, mas não encontrámos o local no mapa. Vai aparecer sem distância.");
    setDraft(null);
  }

  async function remove(id: string) {
    if (!supabase) return;
    const { error: deleteError } = await supabase.from("events").delete().eq("id", id);
    if (deleteError) setError(`Não foi possível apagar: ${deleteError.message}`);
    else setEvents((current) => current.filter((event) => event.id !== id));
    setConfirmDelete(null);
  }

  const form = draft && <form className="admin-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
    <h3>{draft.id ? "Editar evento" : "Novo evento"}</h3>
    <label className="form-label">Título<input className="form-input" required maxLength={200} value={draft.title} onChange={(event) => set("title", event.target.value)} /></label>
    <label className="form-label">Descrição<textarea className="form-input admin-textarea" maxLength={2000} value={draft.description} onChange={(event) => set("description", event.target.value)} /></label>
    <div className="admin-form-row">
      <label className="form-label admin-grow">Primeiro dia<input className="form-input" type="date" required value={draft.starts_on} onChange={(event) => set("starts_on", event.target.value)} /></label>
      <label className="form-label admin-grow">Último dia<input className="form-input" type="date" required min={draft.starts_on} value={draft.ends_on} onChange={(event) => set("ends_on", event.target.value)} /></label>
      <label className="form-label admin-grow">Hora<input className="form-input" type="time" value={draft.start_time} onChange={(event) => set("start_time", event.target.value)} /></label>
    </div>
    <div className="admin-form-row">
      <label className="form-label admin-grow">Local<input className="form-input" maxLength={200} placeholder="ex.: Centro Cultural Vila Flor" value={draft.venue} onChange={(event) => set("venue", event.target.value)} /></label>
      <label className="form-label admin-grow">Concelho<input className="form-input" required maxLength={80} placeholder="ex.: Guimarães" value={draft.municipality} onChange={(event) => set("municipality", event.target.value)} /></label>
    </div>
    <div className="admin-form-row">
      <label className="form-label admin-grow">Categoria<select className="form-input" value={draft.category} onChange={(event) => set("category", event.target.value as Category)}>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="form-label admin-grow">Preço para dois (€)<input className="form-input" type="number" min={0} step="0.5" placeholder="vazio se não se sabe" value={draft.price_for_two} onChange={(event) => set("price_for_two", event.target.value)} /></label>
      <label className="form-label admin-grow">Alcance<select className="form-input" value={draft.reach} onChange={(event) => set("reach", event.target.value as LocalEvent["reach"])}>{Object.entries(reachLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="form-label admin-grow">Estado<select className="form-input" value={draft.status} onChange={(event) => set("status", event.target.value as LocalEvent["status"])}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    <label className="form-label">Ligação para bilhetes ou info<input className="form-input" type="url" placeholder="https://" value={draft.url} onChange={(event) => set("url", event.target.value)} /></label>
    <label className="form-label">Imagem (ligação, opcional)<input className="form-input" type="url" placeholder="https://" value={draft.image_url} onChange={(event) => set("image_url", event.target.value)} /></label>
    <label className="form-label">Etiquetas, separadas por vírgulas<input className="form-input" placeholder="ex.: museu, manual" value={draft.tags} onChange={(event) => set("tags", event.target.value)} /></label>
    <div className="admin-checks"><label><input type="checkbox" checked={draft.indoor} onChange={(event) => set("indoor", event.target.checked)} /> Interior</label><label><input type="checkbox" checked={draft.featured} onChange={(event) => set("featured", event.target.checked)} /> Destaque</label></div>
    <div className="panel-actions"><button className="button button-primary" type="submit" disabled={busy}>{busy ? "A guardar…" : "Guardar"}</button><button type="button" className="button button-ghost" onClick={() => setDraft(null)}>Cancelar</button></div>
  </form>;

  return (
    <section className="admin-catalog" aria-label="Eventos">
      <div className="admin-catalog-head"><h2>Eventos ({events.length})</h2><button type="button" className="button button-primary" onClick={() => setDraft(emptyDraft())}><Plus size={16} aria-hidden="true" />Novo evento</button></div>
      <p className="admin-note">Copiem das agendas públicas da vossa zona. O local é procurado no mapa ao guardar, para calcular a distância.</p>
      {error && <p className="error-alert" role="alert">{error}</p>}
      {draft && !draft.id && form}
      <ul className="admin-ideas">{events.map((event) => <li key={event.id}>
        {draft?.id === event.id ? form : <div className="admin-idea-row">
          <div className="admin-grow"><strong>{event.title}</strong><small>{event.starts_on}{event.ends_on !== event.starts_on ? ` a ${event.ends_on}` : ""} · {event.municipality} · {reachLabels[event.reach].split(" (")[0]} · {statusLabels[event.status]}{event.featured ? " · Destaque" : ""}{event.latitude === null ? " · sem mapa" : ""}</small></div>
          {confirmDelete === event.id ? <div className="panel-actions"><button type="button" className="button button-primary" onClick={() => void remove(event.id)}>Confirmar</button><button type="button" className="button button-ghost" onClick={() => setConfirmDelete(null)}>Cancelar</button></div> : <div className="row-actions"><button type="button" aria-label={`Editar ${event.title}`} onClick={() => setDraft({ ...event, id: event.id, price_for_two: event.price_for_two?.toString() ?? "", start_time: event.start_time?.slice(0, 5) ?? "", url: event.url ?? "", image_url: event.image_url ?? "", tags: event.tags.join(", ") })}><Pencil size={16} aria-hidden="true" /></button><button type="button" aria-label={`Apagar ${event.title}`} onClick={() => setConfirmDelete(event.id)}><Trash2 size={16} aria-hidden="true" /></button></div>}
        </div>}
      </li>)}</ul>
    </section>
  );
}
