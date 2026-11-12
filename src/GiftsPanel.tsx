import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Check, ExternalLink, Gift, Lock, Trash2, Undo2 } from "lucide-react";
import { supabase } from "./lib/supabase";
import { giftOccasions } from "./gifts";
import type { GiftIdea } from "./gifts";
import { firstUrl, siteName } from "./share";

// Ideas of gifts for the other one, saved through the year. Only the person who writes them sees
// them (the database enforces it), so the surprise stays a surprise.

type Props = {
  coupleId: string;
  partnerName: string;
  partnerBirthDate: string | null;
  relationshipDate: string | null;
  today: string;
};

const when = (days: number) => (days === 0 ? "Hoje" : days === 1 ? "Amanhã" : `Daqui a ${days} dias`);

export function GiftsPanel({ coupleId, partnerName, partnerBirthDate, relationshipDate, today }: Props) {
  const [gifts, setGifts] = useState<GiftIdea[] | null>(null);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [showBought, setShowBought] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const occasions = giftOccasions({ partnerName, partnerBirthDate, relationshipDate }, today);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.from("gift_ideas").select("*").order("created_at", { ascending: false }).then(({ data, error: loadError }) => {
      if (!active) return;
      if (loadError) setError(`Não foi possível carregar as prendas: ${loadError.message}`);
      setGifts((data ?? []) as GiftIdea[]);
    });
    return () => { active = false; };
  }, [coupleId]);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !title.trim()) return;
    setBusy(true);
    setError("");
    const url = firstUrl(link);
    const { data, error: saveError } = await supabase.from("gift_ideas").insert({ couple_id: coupleId, title: title.trim(), url, note: note.trim() }).select("*").single();
    setBusy(false);
    if (saveError) {
      setError(`Não foi possível guardar: ${saveError.message}`);
      return;
    }
    setGifts((current) => [data as GiftIdea, ...(current ?? [])]);
    setTitle("");
    setLink("");
    setNote("");
  }

  async function update(id: string, patch: Partial<GiftIdea>) {
    if (!supabase) return;
    const { data, error: saveError } = await supabase.from("gift_ideas").update(patch).eq("id", id).select("*").single();
    if (saveError) setError(`Não foi possível guardar: ${saveError.message}`);
    else setGifts((current) => (current ?? []).map((gift) => (gift.id === id ? data as GiftIdea : gift)));
  }

  async function remove(id: string) {
    if (!supabase) return;
    const { error: removeError } = await supabase.from("gift_ideas").delete().eq("id", id);
    if (removeError) setError(`Não foi possível apagar: ${removeError.message}`);
    else setGifts((current) => (current ?? []).filter((gift) => gift.id !== id));
  }

  const open = (gifts ?? []).filter((gift) => !gift.bought_at);
  const bought = (gifts ?? []).filter((gift) => gift.bought_at);

  return (
    <section className="gifts-panel" aria-label={`Prendas para ${partnerName}`}>
      <p className="gifts-private"><Lock size={15} aria-hidden="true" />Só tu vês esta lista. {partnerName} nunca a vê.</p>

      <ul className="gift-occasions" aria-label="Próximas ocasiões">
        {occasions.map((occasion) => <li key={occasion.key} className={occasion.days <= 30 ? "is-soon" : ""}><strong>{occasion.label}</strong><span>{when(occasion.days)}</span></li>)}
      </ul>

      <form className="panel gift-form" onSubmit={(event) => void add(event)}>
        <label className="form-label">Ideia de prenda<input className="form-input" required maxLength={200} value={title} placeholder="ex.: Aquele livro de fotografia" onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="form-label">Link (opcional)<input className="form-input" inputMode="url" maxLength={2048} value={link} placeholder="Cola o link da loja ou do post" onChange={(event) => setLink(event.target.value)} /></label>
        <label className="form-label">Nota (opcional)<input className="form-input" maxLength={1000} value={note} placeholder="ex.: tamanho M, cor azul" onChange={(event) => setNote(event.target.value)} /></label>
        <div className="panel-actions"><button type="submit" className="button button-primary" disabled={busy || !title.trim()}><Gift size={16} aria-hidden="true" />Guardar</button></div>
      </form>

      {error && <p className="error-alert" role="alert">{error}</p>}
      {gifts === null ? <p className="schedule-hint">A carregar…</p>
        : open.length === 0 ? <p className="schedule-hint">Ainda sem ideias. Quando {partnerName} disser "gostava tanto disto", guarda aqui.</p>
          : <ul className="gift-list">
            {open.map((gift) => <li key={gift.id}>
              <div><strong>{gift.title}</strong>{gift.note && <small>{gift.note}</small>}{gift.url && <a href={gift.url} target="_blank" rel="noreferrer"><ExternalLink size={13} aria-hidden="true" />{siteName(gift.url)}</a>}</div>
              <div className="gift-actions">
                <button type="button" className="icon-button" aria-label={`Já comprei: ${gift.title}`} title="Já comprei" onClick={() => void update(gift.id, { bought_at: new Date().toISOString() })}><Check size={18} aria-hidden="true" /></button>
                <button type="button" className="icon-button" aria-label={`Apagar ${gift.title}`} title="Apagar" onClick={() => void remove(gift.id)}><Trash2 size={18} aria-hidden="true" /></button>
              </div>
            </li>)}
          </ul>}

      {bought.length > 0 && <button type="button" className="task-done-toggle" onClick={() => setShowBought((shown) => !shown)}>{showBought ? "Esconder as compradas" : `Já comprei (${bought.length})`}</button>}
      {showBought && <ul className="gift-list is-bought">
        {bought.map((gift) => <li key={gift.id}>
          <div><strong>{gift.title}</strong>{gift.note && <small>{gift.note}</small>}</div>
          <div className="gift-actions"><button type="button" className="icon-button" aria-label={`Voltar a pôr na lista: ${gift.title}`} title="Voltar à lista" onClick={() => void update(gift.id, { bought_at: null })}><Undo2 size={18} aria-hidden="true" /></button></div>
        </li>)}
      </ul>}
    </section>
  );
}
