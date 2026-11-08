import { useEffect, useState } from "react";
import { AirportPicker } from "./AccountSettings";
import { supabase } from "./lib/supabase";

type Step = "hello" | "partner" | "airport" | "phone";

export function Welcome({ airport, onAirportChange, onDone }: { airport: string; onAirportChange: (code: string) => void; onDone: () => void }) {
  const [needsPartner, setNeedsPartner] = useState(false);
  const [step, setStep] = useState<Step>("hello");
  const [inviteLink, setInviteLink] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase?.from("couple_members").select("user_id").then(({ data }) => setNeedsPartner((data ?? []).length < 2));
  }, []);

  const steps: Step[] = needsPartner ? ["hello", "partner", "airport", "phone"] : ["hello", "airport", "phone"];
  const position = steps.indexOf(step);
  const last = position === steps.length - 1;

  async function createInvite() {
    if (!supabase) return;
    setBusy(true);
    setNote("");
    const { data, error } = await supabase.rpc("create_couple_invite");
    if (error) setNote("Não foi possível criar o convite. Podem fazê-lo mais tarde em Nós, Definições.");
    else setInviteLink(`${window.location.origin}/join/${data as string}`);
    setBusy(false);
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setNote("Ligação copiada.");
    } catch {
      setNote("Não foi possível copiar. Selecionem a ligação e copiem-na.");
    }
  }

  async function finish() {
    setBusy(true);
    await supabase?.auth.updateUser({ data: { onboarded: true } });
    setBusy(false);
    onDone();
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-card welcome-card" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <p className="section-kicker">{position + 1} DE {steps.length}</p>
        {step === "hello" && <>
          <h2 id="welcome-title">Bem-vindos à Nossia</h2>
          <p className="modal-copy">O vosso espaço para dois.</p>
          <ul className="welcome-list">
            <li><strong>Hoje</strong> mostra o próximo date e deixa marcar algo numa frase.</li>
            <li><strong>Ideias</strong> tem sugestões e restaurantes.</li>
            <li><strong>Agenda</strong> junta planos, horários e tarefas.</li>
            <li><strong>Viagens</strong> organiza o que aí vem e o que já fizeram.</li>
            <li><strong>Nós</strong> guarda as memórias e as definições.</li>
          </ul>
        </>}
        {step === "partner" && <>
          <h2 id="welcome-title">Convida o teu par</h2>
          <p className="modal-copy">Cada um tem a sua conta e veem os mesmos planos e memórias.</p>
          {inviteLink ? <><input className="form-input" readOnly aria-label="Ligação de convite" value={inviteLink} onFocus={(event) => event.target.select()} /><div className="panel-actions welcome-inline"><button type="button" className="button button-secondary" onClick={() => void copyInvite()}>Copiar ligação</button></div></> : <div className="panel-actions welcome-inline"><button type="button" className="button button-secondary" disabled={busy} onClick={() => void createInvite()}>Criar ligação de convite</button></div>}
          {note && <p className="schedule-hint" role="status">{note}</p>}
        </>}
        {step === "airport" && <>
          <h2 id="welcome-title">De onde costumam voar?</h2>
          <p className="modal-copy">Usamos isto para procurar voos nas vossas viagens.</p>
          <AirportPicker value={airport} onChange={onAirportChange} />
        </>}
        {step === "phone" && <>
          <h2 id="welcome-title">Põe a Nossia no telemóvel</h2>
          <ol className="welcome-list">
            <li>No iPhone, abre este site no Safari.</li>
            <li>Toca em Partilhar e depois em <strong>Adicionar ao ecrã principal</strong>.</li>
            <li>Abre a Nossia a partir do novo ícone.</li>
            <li>Em Nós, Definições, liga as notificações e o calendário.</li>
          </ol>
          <p className="schedule-hint">O guia completo fica em Nós, Definições.</p>
        </>}
        <div className="panel-actions welcome-actions">
          {position > 0 && <button type="button" className="button button-ghost" onClick={() => setStep(steps[position - 1])}>Voltar</button>}
          <button type="button" className="button button-primary" disabled={busy} onClick={() => last ? void finish() : setStep(steps[position + 1])}>{last ? "Começar" : "Continuar"}</button>
        </div>
      </section>
    </div>
  );
}
