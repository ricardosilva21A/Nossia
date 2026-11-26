import { useState } from "react";
import { workKinds } from "./mascots";
import type { WorkKind } from "./mascots";

// Settings › Conta: where you work and what you do. On days you're both at work, Hoje shows
// each of you at your desk, with the workplace on the wall and your kind of work on the screen.
export function WorkSettings({ workplace, kind, onSave }: { workplace: string; kind: WorkKind; onSave: (workplace: string, kind: WorkKind) => Promise<boolean> }) {
  const [place, setPlace] = useState(workplace);
  const [what, setWhat] = useState<WorkKind>(kind);
  const [note, setNote] = useState("");
  return (
    <article className="schedule-card">
      <h2>O teu trabalho</h2>
      <p className="schedule-hint">Nos dias em que estão os dois a trabalhar, o Hoje mostra cada um na sua secretária.</p>
      <form className="work-form" onSubmit={(event) => { event.preventDefault(); setNote(""); void onSave(place, what).then((saved) => setNote(saved ? "Guardado." : "")); }}>
        <label className="form-label">Onde trabalhas<input className="form-input" maxLength={40} placeholder="ex.: nome da empresa" value={place} onChange={(event) => { setPlace(event.target.value); setNote(""); }} /></label>
        <fieldset className="work-kinds"><legend className="form-label">O que fazes</legend>
          {workKinds.map((item) => <button type="button" key={item.value} className={`filter-chip${what === item.value ? " selected" : ""}`} aria-pressed={what === item.value} onClick={() => { setWhat(item.value); setNote(""); }}>{item.label}</button>)}
        </fieldset>
        <button className="button button-secondary" type="submit">Guardar</button>
      </form>
      {note && <p className="schedule-hint" role="status">{note}</p>}
    </article>
  );
}
