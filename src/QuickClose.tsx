import { useState } from "react";
import { useDialog } from "./useDialog";
import { Camera, Check } from "lucide-react";
import { verdicts } from "./verdicts";

// Closing a date in three taps: how it went, a photo if they want, done. The full memory
// (notes, place, would you repeat) stays one tap away for whoever wants to write more.


type Props = {
  title: string;
  emoji: string;
  onSave: (rating: number, photo: File | null) => Promise<boolean>;
  onWriteMore: () => void;
  onClose: () => void;
};

export function QuickClose({ title, emoji, onSave, onWriteMore, onClose }: Props) {
  const dialogRef = useDialog<HTMLElement>(onClose);
  const [rating, setRating] = useState<number | null>(null);
  const [step, setStep] = useState<"rating" | "photo" | "done">("rating");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function finish(photo: File | null) {
    if (rating === null) return;
    setBusy(true);
    setError("");
    const ok = await onSave(rating, photo);
    setBusy(false);
    if (ok) setStep("done");
    else setError("Não foi possível guardar. Tenta outra vez.");
  }

  return (
    <div className="welcome-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget && step !== "photo") onClose(); }}>
      <section ref={dialogRef} className="welcome-sheet quick-close" role="dialog" aria-modal="true" aria-labelledby="quick-close-title">
        <button type="button" className="zoom-close" aria-label="Fechar" onClick={onClose}>×</button>
        <p className="quick-close-step" aria-hidden="true">{step === "rating" ? "1" : step === "photo" ? "2" : "3"} de 3</p>
        {step === "rating" && <>
          <h2 id="quick-close-title">Como correu {emoji} {title}?</h2>
          <div className="quick-close-verdicts">
            {verdicts.map((verdict) => <button type="button" key={verdict.rating} className="quick-close-verdict" onClick={() => { setRating(verdict.rating); setStep("photo"); }}><span aria-hidden="true">{verdict.emoji}</span>{verdict.label}</button>)}
          </div>
        </>}
        {step === "photo" && <>
          <h2 id="quick-close-title">Uma fotografia?</h2>
          <p className="modal-copy">Fica no álbum deste date. Podem juntar mais depois.</p>
          <div className="panel-actions welcome-actions">
            <button type="button" className="button button-ghost" disabled={busy} onClick={() => void finish(null)}>Sem foto</button>
            <label className={`button button-primary${busy ? " is-busy" : ""}`}><Camera size={16} aria-hidden="true" />{busy ? "A guardar…" : "Escolher foto"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void finish(file); }} /></label>
          </div>
        </>}
        {step === "done" && <>
          <div className="quick-close-done" aria-hidden="true"><Check size={32} /></div>
          <h2 id="quick-close-title">Guardado nas memórias</h2>
          <p className="modal-copy">Querem contar mais? Notas, o sítio e se repetiam.</p>
          <div className="panel-actions welcome-actions"><button type="button" className="button button-ghost" onClick={onWriteMore}>Escrever mais</button><button type="button" className="button button-primary" onClick={onClose}>Feito</button></div>
        </>}
        {error && <p className="error-alert" role="alert">{error}</p>}
      </section>
    </div>
  );
}
