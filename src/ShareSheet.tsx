import { useEffect, useState } from "react";
import { useDialog } from "./useDialog";
import { CalendarDays, ExternalLink, Lightbulb } from "lucide-react";
import { guessSharedTitle, siteName } from "./share";

// What opens when something is shared into the app (or a link is pasted): name it, then keep it
// for later or put a day on it straight away. The other one gets it as a proposal.

export type Shared = { title: string | null; text: string | null; url: string | null };
export type SharedPlan = { title: string; url: string | null; date: string | null; time: string | null };

type Props = {
  shared: Shared;
  partnerName: string | null;
  today: string;
  readTitle: (url: string) => Promise<{ title: string | null; url: string } | null>;
  onSave: (plan: SharedPlan) => Promise<boolean>;
  onClose: () => void;
};

export function ShareSheet({ shared, partnerName, today, readTitle, onSave, onClose }: Props) {
  const [url, setUrl] = useState(shared.url);
  const [title, setTitle] = useState(() => guessSharedTitle(shared));
  const [touched, setTouched] = useState(false);
  const [when, setWhen] = useState<{ date: string; time: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useDialog<HTMLElement>(busy ? null : onClose);

  // Ask the page for its name; only fills the title if they haven't typed their own.
  useEffect(() => {
    if (!shared.url) return;
    let active = true;
    void readTitle(shared.url).then((preview) => {
      if (!active || !preview) return;
      setUrl(preview.url);
      if (!touched) setTitle(guessSharedTitle({ ...shared, url: preview.url, pageTitle: preview.title }));
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shared.url]);

  async function save(withDay: boolean) {
    if (!title.trim()) return;
    setBusy(true);
    setError("");
    const ok = await onSave({ title: title.trim(), url, date: withDay && when ? when.date : null, time: withDay && when?.time ? when.time : null });
    setBusy(false);
    if (ok) onClose();
    else setError("Não foi possível guardar. Tenta outra vez.");
  }

  return (
    <div className="welcome-backdrop" role="presentation">
      <section ref={dialogRef} className="welcome-sheet share-sheet" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <button type="button" className="zoom-close" aria-label="Fechar" onClick={onClose}>×</button>
        <h2 id="share-title">Bora fazer isto?</h2>
        {url && <a className="share-source" href={url} target="_blank" rel="noreferrer"><ExternalLink size={14} aria-hidden="true" />{siteName(url)}</a>}
        <label className="form-label">Nome<input className="form-input" maxLength={120} value={title} onChange={(event) => { setTitle(event.target.value); setTouched(true); }} placeholder="ex.: Jantar no Vira" /></label>
        {when ? <div className="share-when">
          <label className="form-label">Dia<input className="form-input" type="date" required min={today} value={when.date} onChange={(event) => setWhen({ ...when, date: event.target.value })} /></label>
          <label className="form-label">Hora<input className="form-input" type="time" value={when.time} onChange={(event) => setWhen({ ...when, time: event.target.value })} /></label>
          <div className="panel-actions"><button type="button" className="button button-ghost" onClick={() => setWhen(null)}>Voltar</button><button type="button" className="button button-primary" disabled={busy || !title.trim() || !when.date} onClick={() => void save(true)}>{partnerName ? `Propor a ${partnerName}` : "Marcar"}</button></div>
        </div> : <div className="share-actions">
          <button type="button" className="share-choice" disabled={busy || !title.trim()} onClick={() => void save(false)}><Lightbulb size={20} aria-hidden="true" /><strong>Guardar para depois</strong><small>Fica nas vossas ideias</small></button>
          <button type="button" className="share-choice" disabled={busy || !title.trim()} onClick={() => setWhen({ date: today, time: "" })}><CalendarDays size={20} aria-hidden="true" /><strong>Marcar um dia</strong><small>{partnerName ? `${partnerName} recebe a proposta` : "Fica na agenda"}</small></button>
        </div>}
        {error && <p className="error-alert" role="alert">{error}</p>}
      </section>
    </div>
  );
}
