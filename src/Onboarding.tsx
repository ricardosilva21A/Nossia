import { useState } from "react";
import { supabase } from "./lib/supabase";
import { Avatar } from "./Avatar";
import { Mascot as PetArt } from "./Mascot";
import { avatarOf, defaultAvatar, hairColorOptions, hairOptions, patternOptions, petColorOptions, petLook, skinOptions, speciesOptions } from "./mascots";
import type { AvatarLook, Hair, Mascot, Pattern, Pet, Species } from "./mascots";
import type { HomePartner } from "./types";

type Step = "avatar" | "pet" | "birthday" | "invite";

type Props = {
  coupleId: string;
  userId: string;
  slot: HomePartner;
  defaultName: string;
  existing: Mascot | null;
  pet: Pet | null;
  // "pet" opens straight on the animal (from the settings); otherwise it starts with the avatar.
  startStep?: "avatar" | "pet";
  editing: boolean;
  askInvite: boolean;
  birthDate: string | null;
  onSaveBirthday: (date: string) => Promise<boolean>;
  onSaved: (mascot: Mascot) => void;
  onPetSaved: (pet: Pet) => void;
  onDone: () => void;
};

export function Onboarding({ coupleId, userId, slot, defaultName, existing, pet, startStep = "avatar", editing, askInvite, birthDate, onSaveBirthday, onSaved, onPetSaved, onDone }: Props) {
  const [step, setStep] = useState<Step>(startStep);
  const [birthday, setBirthday] = useState("");
  const [look, setLook] = useState<AvatarLook>(avatarOf(existing) ?? defaultAvatar);
  const [petDraft, setPetDraft] = useState<Pet>(pet ?? { couple_id: coupleId, species: "dog", name: "", color: petColorOptions[0], pattern: "none" });
  const [inviteLink, setInviteLink] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof AvatarLook>(key: K, value: AvatarLook[K]) => setLook((current) => ({ ...current, [key]: value }));
  const setPet = <K extends keyof Pet>(key: K, value: Pet[K]) => setPetDraft((current) => ({ ...current, [key]: value }));

  function afterAvatar() {
    if (editing) onDone();
    else if (!pet) setStep("pet");
    else afterPet();
  }

  function afterPet() {
    if (editing) onDone();
    else if (!birthDate) setStep("birthday");
    else afterBirthday();
  }

  function afterBirthday() {
    if (askInvite) setStep("invite");
    else onDone();
  }

  async function saveAvatar() {
    if (!supabase) return;
    setBusy(true);
    setError("");
    // The old mascot fields are still required by the table; they no longer show anywhere.
    const { data, error: saveError } = await supabase.from("couple_mascots").upsert({
      user_id: userId,
      couple_id: coupleId,
      partner_slot: slot,
      name: existing?.name ?? defaultName,
      ears: existing?.ears ?? "round",
      color: existing?.color ?? "#D9D4C7",
      pattern: existing?.pattern ?? "none",
      ...look,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" }).select("*").single();
    setBusy(false);
    if (saveError) {
      setError(`Não foi possível guardar o avatar: ${saveError.message}`);
      return;
    }
    onSaved(data as Mascot);
    afterAvatar();
  }

  async function savePet() {
    if (!supabase || !petDraft.name.trim()) return;
    setBusy(true);
    setError("");
    const { data, error: saveError } = await supabase.from("couple_pets").upsert({
      couple_id: coupleId,
      species: petDraft.species,
      name: petDraft.name.trim(),
      color: petDraft.color,
      pattern: petDraft.pattern,
      updated_at: new Date().toISOString(),
    }, { onConflict: "couple_id" }).select("*").single();
    setBusy(false);
    if (saveError) {
      setError(`Não foi possível guardar o animal: ${saveError.message}`);
      return;
    }
    onPetSaved(data as Pet);
    afterPet();
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

  const speaker = pet ?? (petDraft.name.trim() ? petDraft : null);

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        {step === "avatar" ? <>
          <h1>{editing ? "O teu avatar" : "Cria o teu avatar"}</h1>
          {!editing && <p className="modal-copy">É a mini-versão de ti que vive na vossa casa. Vai trabalhar quando tu vais, veste-se conforme o tempo e sai contigo para os dates.</p>}
          <div className="onboarding-preview"><Avatar look={look} size={132} label={`Avatar de ${defaultName}`} /></div>
          <p className="form-label">Tom de pele</p>
          <div className="swatches" role="group" aria-label="Tom de pele">{skinOptions.map((color) => <button type="button" key={color} className={`swatch ${look.skin === color ? "selected" : ""}`} style={{ background: color }} aria-label={`Tom ${color}`} aria-pressed={look.skin === color} onClick={() => set("skin", color)} />)}</div>
          <p className="form-label">Cabelo</p>
          <div className="chip-row" role="group" aria-label="Cabelo">{hairOptions.map((option) => <button type="button" key={option.value} className={`chip ${look.hair === option.value ? "selected" : ""}`} aria-pressed={look.hair === option.value} onClick={() => set("hair", option.value as Hair)}>{option.label}</button>)}</div>
          {look.hair !== "bald" && <><p className="form-label">Cor do cabelo</p>
          <div className="swatches" role="group" aria-label="Cor do cabelo">{hairColorOptions.map((color) => <button type="button" key={color} className={`swatch ${look.hair_color === color ? "selected" : ""}`} style={{ background: color }} aria-label={`Cor ${color}`} aria-pressed={look.hair_color === color} onClick={() => set("hair_color", color)} />)}</div></>}
          <div className="chip-row" role="group" aria-label="Acessórios">
            <button type="button" className={`chip ${look.glasses ? "selected" : ""}`} aria-pressed={look.glasses} onClick={() => set("glasses", !look.glasses)}>Óculos</button>
            <button type="button" className={`chip ${look.beard ? "selected" : ""}`} aria-pressed={look.beard} onClick={() => set("beard", !look.beard)}>Barba</button>
          </div>
          {error && <p className="error-alert" role="alert">{error}</p>}
          <div className="panel-actions onboarding-actions">{editing && <button type="button" className="button button-ghost" onClick={onDone}>Cancelar</button>}<button type="button" className="button button-primary" disabled={busy} onClick={() => void saveAvatar()}>{editing ? "Guardar" : "Continuar"}</button></div>
        </> : step === "pet" ? <>
          <h1>{pet ? `${pet.name}, o animal da casa` : "Falta o animal da casa"}</h1>
          <p className="modal-copy">{pet ? "É dos dois: qualquer um pode mudar o nome ou o aspeto." : "É de vocês os dois e é quem fala na casa: sugere dates, pergunta como correram e dá dicas."}</p>
          <div className="onboarding-preview"><PetArt look={petLook({ ...petDraft, name: petDraft.name || "Animal" })} size={120} /></div>
          <label className="form-label">Nome<input className="form-input" required maxLength={40} value={petDraft.name} placeholder="ex.: Summer" onChange={(event) => setPet("name", event.target.value)} /></label>
          <div className="chip-row" role="group" aria-label="Espécie">{speciesOptions.map((option) => <button type="button" key={option.value} className={`chip ${petDraft.species === option.value ? "selected" : ""}`} aria-pressed={petDraft.species === option.value} onClick={() => setPet("species", option.value as Species)}>{option.label}</button>)}</div>
          <p className="form-label">Cor</p>
          <div className="swatches" role="group" aria-label="Cor">{petColorOptions.map((color) => <button type="button" key={color} className={`swatch ${petDraft.color === color ? "selected" : ""}`} style={{ background: color }} aria-label={`Cor ${color}`} aria-pressed={petDraft.color === color} onClick={() => setPet("color", color)} />)}</div>
          <div className="chip-row" role="group" aria-label="Padrão">{patternOptions.map((option) => <button type="button" key={option.value} className={`chip ${petDraft.pattern === option.value ? "selected" : ""}`} aria-pressed={petDraft.pattern === option.value} onClick={() => setPet("pattern", option.value as Pattern)}>{option.label}</button>)}</div>
          {error && <p className="error-alert" role="alert">{error}</p>}
          <div className="panel-actions onboarding-actions">{editing && <button type="button" className="button button-ghost" onClick={onDone}>Cancelar</button>}<button type="button" className="button button-primary" disabled={busy || !petDraft.name.trim()} onClick={() => void savePet()}>{editing ? "Guardar" : "Continuar"}</button></div>
        </> : step === "birthday" ? <>
          <div className="onboarding-preview">{speaker ? <PetArt look={petLook(speaker)} size={96} /> : <Avatar look={look} size={96} />}</div>
          <h1>Quando fazes anos?</h1>
          <p className="modal-copy">{speaker ? `${speaker.name} quer saber` : "Queremos saber"}, para se lembrar do teu dia e ajudar o teu par a prepará-lo.</p>
          <label className="form-label">Data de nascimento<input className="form-input" type="date" max={new Date().toISOString().slice(0, 10)} value={birthday} onChange={(event) => setBirthday(event.target.value)} /></label>
          {error && <p className="error-alert" role="alert">{error}</p>}
          <div className="panel-actions onboarding-actions"><button type="button" className="button button-ghost" onClick={afterBirthday}>Agora não</button><button type="button" className="button button-primary" disabled={busy || !birthday} onClick={() => void saveBirthday()}>Continuar</button></div>
        </> : <>
          <h1>Convida a tua cara-metade</h1>
          <p className="modal-copy">O teu avatar já tem casa. Falta a outra metade: cada um tem a sua conta e veem os mesmos planos e memórias.</p>
          <div className="onboarding-preview"><Avatar look={look} size={104} /><span className="mascot-waiting" aria-hidden="true">?</span></div>
          {inviteLink ? <><input className="form-input" readOnly aria-label="Ligação de convite" value={inviteLink} onFocus={(event) => event.target.select()} /><div className="panel-actions onboarding-actions"><button type="button" className="button button-secondary" onClick={() => void shareInvite()}>Enviar ligação</button><button type="button" className="button button-primary" onClick={onDone}>Entrar em casa</button></div></> : <div className="panel-actions onboarding-actions"><button type="button" className="button button-ghost" onClick={onDone}>Mais tarde</button><button type="button" className="button button-primary" disabled={busy} onClick={() => void createInvite()}>Criar convite</button></div>}
          {note && <p className="schedule-hint" role="status">{note}</p>}
        </>}
      </div>
    </div>
  );
}
