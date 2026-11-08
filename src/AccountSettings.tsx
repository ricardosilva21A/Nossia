import { useState } from "react";
import type { FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { supabase } from "./lib/supabase";

export const airports = [
  { code: "OPO", name: "Porto" },
  { code: "LIS", name: "Lisboa" },
  { code: "FAO", name: "Faro" },
  { code: "FNC", name: "Funchal" },
  { code: "PXO", name: "Porto Santo" },
  { code: "PDL", name: "Ponta Delgada" },
  { code: "TER", name: "Terceira" },
];

export function AirportPicker({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const known = airports.some((airport) => airport.code === value);
  const [other, setOther] = useState(!known);
  return (
    <div className="airport-picker">
      <label className="form-label">Aeroporto de partida
        <select className="form-input" value={other ? "other" : value} onChange={(event) => {
          if (event.target.value === "other") setOther(true);
          else {
            setOther(false);
            onChange(event.target.value);
          }
        }}>
          {airports.map((airport) => <option key={airport.code} value={airport.code}>{airport.name} ({airport.code})</option>)}
          <option value="other">Outro</option>
        </select>
      </label>
      {other && <label className="form-label">Código do aeroporto (3 letras)
        <input className="form-input" maxLength={3} autoCapitalize="characters" placeholder="ex.: MAD" defaultValue={known ? "" : value} onChange={(event) => {
          const code = event.target.value.toUpperCase();
          if (/^[A-Z]{3}$/.test(code)) onChange(code);
        }} />
      </label>}
    </div>
  );
}

export function AccountSettings({ airport, onAirportChange, onSignedOut }: { airport: string; onAirportChange: (code: string) => void; onSignedOut: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || confirmation !== "APAGAR") return;
    setBusy(true);
    setError("");
    const { data } = await supabase.auth.getSession();
    const response = await fetch("/api/delete-account", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify({ confirm: confirmation }),
    }).catch(() => null);
    if (!response?.ok) {
      setError("Não foi possível apagar a conta. Nada foi apagado ou o processo ficou a meio; tenta outra vez.");
      setBusy(false);
      return;
    }
    await supabase.auth.signOut({ scope: "local" });
    onSignedOut();
  }

  return (
    <>
      <article className="schedule-card">
        <h2>Voos</h2>
        <p className="schedule-hint">De onde costumam partir. As pesquisas de voos começam neste aeroporto.</p>
        <AirportPicker value={airport} onChange={onAirportChange} />
      </article>
      <article className="schedule-card">
        <h2>Ajuda e privacidade</h2>
        <div className="panel-actions"><a className="button button-ghost" href="/ajuda">Guia de utilização</a><a className="button button-ghost" href="/privacidade">Política de privacidade</a></div>
      </article>
      <article className="schedule-card">
        <h2>Apagar conta</h2>
        <p className="schedule-hint">Se o teu par tiver conta, os dados do casal ficam com essa pessoa. Se fores só tu, apagamos tudo: dates, memórias, viagens e fotografias. Não dá para desfazer.</p>
        {!deleting ? <button type="button" className="button button-ghost" onClick={() => setDeleting(true)}><Trash2 size={16} aria-hidden="true" />Apagar a minha conta</button> : <form onSubmit={(event) => void deleteAccount(event)}>
          <label className="form-label">Escreve APAGAR para confirmar<input className="form-input" autoComplete="off" autoCapitalize="characters" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
          {error && <p className="error-alert" role="alert">{error}</p>}
          <div className="panel-actions"><button className="button button-primary" type="submit" disabled={busy || confirmation !== "APAGAR"}>{busy ? "A apagar…" : "Apagar para sempre"}</button><button type="button" className="button button-ghost" disabled={busy} onClick={() => { setDeleting(false); setConfirmation(""); setError(""); }}>Cancelar</button></div>
        </form>}
      </article>
    </>
  );
}
