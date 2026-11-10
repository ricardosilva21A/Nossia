import { useState } from "react";
import { supabase } from "./lib/supabase";
import { Mascot as MascotArt } from "./Mascot";
import { colorOptions, earOptions, patternOptions } from "./mascots";
import type { Ears, Mascot, MascotLook, Pattern } from "./mascots";
import type { HomePartner } from "./types";

type Props = {
  coupleId: string;
  userId: string;
  slot: HomePartner;
  defaultName: string;
  existing: Mascot | null;
  askInvite: boolean;
  birthDate: string | null;
  onSaveBirthday: (date: string) => Promise<boolean>;
  onSaved: (mascot: Mascot) => void;
  onDone: () => void;
};

export function Onboarding({ coupleId, userId, slot, defaultName, existing, askInvite, birthDate, onSaveBirthday, onSaved, onDone }: Props) {
  const [step, setStep] = useState<"mascot" | "birthday" | "invite">("mascot");
  const [birthday, setBirthday] = useState("");
  const [look, setLook] = useState<MascotLook>(existing ?? { name: defaultName, ears: "round", color: colorOptions[0], pattern: "none" });
  const [inviteLink, setInviteLink] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof MascotLook>(key: K, value: MascotLook[K]) => setLook((current) => ({ ...current, [key]: value }));

  async function save() {
    if (!supabase || !look.name.trim()) return;
    setBusy(true);
    setError("");
    const { data, error: saveError } = await supabase.from("couple_mascots").upsert({
      user_id: userId,
      couple_id: coupleId,
      partner_slot: slot,
      name: look.name.trim(),
      ears: look.ears,
      color: look.color,
      pattern: look.pattern,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" }).select("*").single();
    setBusy(false);
    if (saveError) {
      setError(`Não foi possível guardar a mascote: ${saveError.message}`);
      return;
    }
    onSaved(data as Mascot);
    if (existing) onDone();
    else if (!birthDate) setStep("birthday");
    else afterBirthday();
  }

  function afterBirthday() {
    if (askInvite) setStep("invite");
    else onDone();
  }

  async function saveBirthday() {
    if (!birthday) return;
    setBusy(true);
    setError("");
    const saved = await onSaveBirthday(birthday);
    setBusy(false);
    if (saved) afterBirthday();
    else setError("Não foi possível guardar. Tenta outra vez ou salta este passo.");
  }

  async function createInvite() {
    if (!supabase) return;
    setBusy(true);
    setNote("");
    const { data, error: inviteError } = await supabase.rpc("create_couple_invite");
    if (inviteError) setNote("Não foi possível criar o convite. Podes fazê-lo mais tarde nas Definições.");
    else setInviteLink(`${window.location.origin}/join/${data as string}`);
    setBusy(false);
  }

  async function shareInvite() {
    try {
      if (navigator.share) await navigator.share({ title: "Nossia", text: "Junta-te a mim na Nossia", url: inviteLink });
      else {
        await navigator.clipboard.writeText(inviteLink);
        setNote("Ligação copiada.");
      }
    } catch {
      setNote("Seleciona a ligação e copia-a.");
    }
  }

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        {step === "mascot" ? <>
          <h1>{existing ? "A tua mascote" : "Cria a tua mascote"}</h1>
          {!existing && <p className="modal-copy">Vai viver convosco na vossa casa.</p>}
          <div className="onboarding-preview"><MascotArt look={look} size={132} /></div>
          <label className="form-label">Nome<input className="form-input" required maxLength={40} value={look.name} onChange={(event) => set("name", event.target.value)} /></label>
          <p className="form-label">Orelhas</p>
          <div className="chip-row" role="group" aria-label="Orelhas">{earOptions.map((option) => <button type="button" key={option.value} className={`chip ${look.ears === option.value ? "selected" : ""}`} aria-pressed={look.ears === option.value} onClick={() => set("ears", option.value as Ears)}>{option.label}</button>)}</div>
          <p className="form-label">Cor</p>
          <div className="swatches" role="group" aria-label="Cor">{colorOptions.map((color) => <button type="button" key={color} className={`swatch ${look.color === color ? "selected" : ""}`} style={{ background: color }} aria-label={`Cor ${color}`} aria-pressed={look.color === color} onClick={() => set("color", color)} />)}</div>
          <p className="form-label">Padrão</p>
          <div className="chip-row" role="group" aria-label="Padrão">{patternOptions.map((option) => <button type="button" key={option.value} className={`chip ${look.pattern === option.value ? "selected" : ""}`} aria-pressed={look.pattern === option.value} onClick={() => set("pattern", option.value as Pattern)}>{option.label}</button>)}</div>
          {error && <p className="error-alert" role="alert">{error}</p>}
          <div className="panel-actions onboarding-actions">{existing && <button type="button" className="button button-ghost" onClick={onDone}>Cancelar</button>}<button type="button" className="button button-primary" disabled={busy || !look.name.trim()} onClick={() => void save()}>{existing ? "Guardar" : "Continuar"}</button></div>
        </> : step === "birthday" ? <>
          <div className="onboarding-preview"><MascotArt look={look} size={104} /></div>
          <h1>Quando fazes anos?</h1>
          <p className="modal-copy">{look.name.trim() === defaultName.trim() ? "A tua mascote" : look.name} quer conhecer-te. Assim lembra-se do teu dia e ajuda o teu par a prepará-lo.</p>
          <label className="form-label">Data de nascimento<input className="form-input" type="date" max={new Date().toISOString().slice(0, 10)} value={birthday} onChange={(event) => setBirthday(event.target.value)} /></label>
          {error && <p className="error-alert" role="alert">{error}</p>}
          <div className="panel-actions onboarding-actions"><button type="button" className="button button-ghost" onClick={afterBirthday}>Agora não</button><button type="button" className="button button-primary" disabled={busy || !birthday} onClick={() => void saveBirthday()}>Continuar</button></div>
        </> : <>
          <h1>Convida a tua cara-metade</h1>
          <p className="modal-copy">A tua mascote já tem casa. Falta a outra metade: cada um tem a sua conta e veem os mesmos planos e memórias.</p>
          <div className="onboarding-preview"><MascotArt look={look} size={104} /><span className="mascot-waiting" aria-hidden="true">?</span></div>
          {inviteLink ? <><input className="form-input" readOnly aria-label="Ligação de convite" value={inviteLink} onFocus={(event) => event.target.select()} /><div className="panel-actions onboarding-actions"><button type="button" className="button button-secondary" onClick={() => void shareInvite()}>Enviar ligação</button><button type="button" className="button button-primary" onClick={onDone}>Entrar em casa</button></div></> : <div className="panel-actions onboarding-actions"><button type="button" className="button button-ghost" onClick={onDone}>Mais tarde</button><button type="button" className="button button-primary" disabled={busy} onClick={() => void createInvite()}>Criar convite</button></div>}
          {note && <p className="schedule-hint" role="status">{note}</p>}
        </>}
      </div>
    </div>
  );
}
