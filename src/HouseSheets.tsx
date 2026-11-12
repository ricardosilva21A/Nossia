import { useState } from "react";
import { Avatar } from "./Avatar";
import { Mascot as PetArt } from "./Mascot";
import { accessoryOptions, petLook } from "./mascots";
import type { Accessory, AvatarLook, Pet } from "./mascots";
import { affections } from "./affections";
import type { AffectionKind } from "./affections";

// Small sheets that open from the house: what you can do with the other person, and the animal's clothes.

function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="welcome-backdrop house-sheet-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="welcome-sheet house-sheet" role="dialog" aria-modal="true" aria-label={label}>
        <button type="button" className="zoom-close" aria-label="Fechar" onClick={onClose}>×</button>
        {children}
      </section>
    </div>
  );
}

export function AffectionSheet({ name, look, notified = null, onSend, onClose }: { name: string; look: AvatarLook | null; notified?: boolean | null; onSend: (kind: AffectionKind) => Promise<boolean>; onClose: () => void }) {
  const [sent, setSent] = useState<AffectionKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function send(kind: AffectionKind) {
    setBusy(true);
    setError("");
    const ok = await onSend(kind);
    setBusy(false);
    if (!ok) {
      setError("Não foi possível enviar. Tenta outra vez.");
      return;
    }
    setSent(kind);
    window.setTimeout(onClose, 1300);
  }
  const chosen = affections.find((item) => item.kind === sent);
  return (
    <Sheet label={`Mandar carinho a ${name}`} onClose={onClose}>
      <div className="welcome-mascot">{look && <Avatar look={look} size={84} />}{chosen && <span className="affection-fly" aria-hidden="true">{chosen.emoji}</span>}</div>
      <h2>{chosen ? `Enviado a ${name}` : `Mandar a ${name}…`}</h2>
      {!chosen && <div className="affection-grid">
        {affections.map((item) => <button type="button" key={item.kind} className="affection-option" disabled={busy} onClick={() => void send(item.kind)}><span aria-hidden="true">{item.emoji}</span>{item.label}</button>)}
      </div>}
      {notified === false && <p className="sheet-note">{name} ainda não tem as notificações ligadas: vê quando abrir a app.</p>}
      {error && <p className="error-alert" role="alert">{error}</p>}
    </Sheet>
  );
}

export function WardrobeSheet({ pet, onSave, onClose }: { pet: Pet; onSave: (accessory: Accessory) => Promise<boolean>; onClose: () => void }) {
  const [accessory, setAccessory] = useState<Accessory>(pet.accessory ?? "none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setBusy(true);
    setError("");
    const ok = await onSave(accessory);
    setBusy(false);
    if (ok) onClose();
    else setError("Não foi possível guardar. Tenta outra vez.");
  }
  return (
    <Sheet label={`O armário de ${pet.name}`} onClose={onClose}>
      <div className="welcome-mascot"><PetArt look={petLook({ ...pet, accessory })} size={104} /></div>
      <h2>O que veste {pet.name}?</h2>
      <div className="chip-row wardrobe-row" role="group" aria-label="Acessório">
        {accessoryOptions.map((option) => <button type="button" key={option.value} className={`chip ${accessory === option.value ? "selected" : ""}`} aria-pressed={accessory === option.value} onClick={() => setAccessory(option.value)}>{option.label}</button>)}
      </div>
      {error && <p className="error-alert" role="alert">{error}</p>}
      <div className="panel-actions welcome-actions"><button type="button" className="button button-ghost" onClick={onClose}>Cancelar</button><button type="button" className="button button-primary" disabled={busy} onClick={() => void save()}>Vestir</button></div>
    </Sheet>
  );
}
