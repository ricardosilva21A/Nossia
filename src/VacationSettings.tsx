import { useState } from "react";
import type { FormEvent } from "react";

export type VacationProfile = { user_id: string; couple_id: string; partner_slot: "partner_one" | "partner_two"; mode: "flexible" | "fixed"; days_per_year: number | null; avoid_months: number[] };
export type VacationPeriod = { id: string; user_id: string; couple_id: string; partner_slot: "partner_one" | "partner_two"; starts_on: string; ends_on: string };

const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const shortDate = (day: string) => new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short" }).format(new Date(`${day}T12:00:00`));

export function VacationSettings({ profile, periods, partnerName, partnerProfile, partnerPeriods, today, onSaveProfile, onAddPeriod, onRemovePeriod }: {
  profile: VacationProfile | null;
  periods: VacationPeriod[];
  partnerName: string;
  partnerProfile: VacationProfile | null;
  partnerPeriods: VacationPeriod[];
  today: string;
  onSaveProfile: (patch: Pick<VacationProfile, "mode" | "days_per_year" | "avoid_months">) => Promise<boolean>;
  onAddPeriod: (start: string, end: string) => Promise<boolean>;
  onRemovePeriod: (id: string) => void;
}) {
  const mode = profile?.mode ?? null;
  const avoid = profile?.avoid_months ?? [];
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [days, setDays] = useState(profile?.days_per_year?.toString() ?? "");
  const save = (patch: Partial<Pick<VacationProfile, "mode" | "days_per_year" | "avoid_months">>) => onSaveProfile({ mode: mode ?? "flexible", days_per_year: typedDays(), avoid_months: avoid, ...patch });
  // What is typed counts even before the field loses focus.
  function typedDays() {
    return days === "" ? null : Math.min(60, Math.max(0, Math.round(Number(days)) || 0));
  }
  const upcoming = periods.filter((period) => period.ends_on >= today);

  function addPeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!start || !end) return;
    void onAddPeriod(start, end < start ? start : end).then((saved) => { if (saved) { setStart(""); setEnd(""); } });
  }

  const partnerSummary = partnerProfile
    ? partnerProfile.mode === "fixed"
      ? `${partnerName}: férias marcadas${partnerPeriods.filter((period) => period.ends_on >= today).length ? ` (${partnerPeriods.filter((period) => period.ends_on >= today).map((period) => `${shortDate(period.starts_on)} a ${shortDate(period.ends_on)}`).join(", ")})` : ", ainda sem datas"}.`
      : `${partnerName}: férias flexíveis${partnerProfile.avoid_months.length ? `, evita ${partnerProfile.avoid_months.map((month) => months[month - 1]).join(", ")}` : ""}.`
    : `${partnerName} ainda não disse como tira férias.`;

  return (
    <article className="schedule-card vacation-card">
      <h2>As minhas férias</h2>
      <p className="schedule-hint">Para as pontes e as viagens contarem com os dias que podes tirar.</p>
      <div className="chip-row" role="radiogroup" aria-label="Como tiras férias">{([["flexible", "Quando quero"], ["fixed", "Marcadas pela empresa"]] as const).map(([value, label]) => <button type="button" role="radio" key={value} aria-checked={mode === value} className={`chip ${mode === value ? "selected" : ""}`} onClick={() => void save({ mode: value })}>{label}</button>)}</div>

      {mode === "flexible" && <>
        <label className="form-label">Dias por ano<input className="form-input vacation-days" type="number" min={0} max={60} inputMode="numeric" value={days} onChange={(event) => setDays(event.target.value)} onBlur={() => void save({})} /></label>
        <p className="form-label">Meses em que é difícil tirar férias</p>
        <div className="chip-row" role="group" aria-label="Meses difíceis">{months.map((label, index) => <button type="button" key={label} aria-pressed={avoid.includes(index + 1)} className={`chip ${avoid.includes(index + 1) ? "selected" : ""}`} onClick={() => void save({ avoid_months: avoid.includes(index + 1) ? avoid.filter((month) => month !== index + 1) : [...avoid, index + 1].sort((a, b) => a - b) })}>{label}</button>)}</div>
      </>}

      {mode && <>
        <p className="form-label">{mode === "fixed" ? "Períodos de férias" : "Férias já marcadas (opcional)"}</p>
        {upcoming.length > 0 && <ul className="vacation-periods">{upcoming.map((period) => <li key={period.id}><span>{shortDate(period.starts_on)} a {shortDate(period.ends_on)}</span><button type="button" className="button button-ghost" aria-label={`Apagar férias de ${shortDate(period.starts_on)}`} onClick={() => onRemovePeriod(period.id)}>Apagar</button></li>)}</ul>}
        <form className="vacation-form" onSubmit={addPeriod}>
          <label className="form-label">De<input className="form-input" type="date" required min={today} value={start} onChange={(event) => { setStart(event.target.value); if (end && end < event.target.value) setEnd(event.target.value); }} /></label>
          <label className="form-label">A<input className="form-input" type="date" required min={start || today} value={end} onChange={(event) => setEnd(event.target.value)} /></label>
          <button className="button button-secondary" type="submit" disabled={!start || !end}>Juntar</button>
        </form>
      </>}

      <p className="schedule-hint vacation-partner">{partnerSummary}</p>
    </article>
  );
}
