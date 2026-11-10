import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { addDays, describeOpportunity, findOpportunities, findVacationWindows } from "./holidays";
import type { VacationRules, WorkBlock } from "./holidays";

const shortDay = (day: string) => new Intl.DateTimeFormat("pt-PT", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${day}T12:00:00`));

export function Opportunities({ today, blocks, municipality, rules, names, busy, onCreateTrip }: {
  today: string;
  blocks: WorkBlock[];
  municipality: string | null;
  rules: VacationRules;
  names: { partner_one: string; partner_two: string };
  busy: boolean;
  onCreateTrip: (title: string, start: string, end: string) => Promise<boolean>;
}) {
  const [openStart, setOpenStart] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const list = useMemo(() => {
    const until = addDays(today, 365);
    const windows = findVacationWindows(today, until, blocks, municipality, rules);
    // A holiday inside someone's holidays is already part of that window.
    const bridges = findOpportunities(today, until, blocks, municipality, rules).filter((item) => !windows.some((window) => item.start <= window.end && item.end >= window.start));
    return [...windows, ...bridges].sort((first, second) => first.start.localeCompare(second.start)).slice(0, 5);
  }, [blocks, municipality, rules, today]);
  if (!list.length) return null;

  return (
    <section className="panel opportunities" aria-label="Próximas oportunidades">
      <p className="panel-label"><Sparkles size={16} aria-hidden="true" /> Próximas oportunidades</p>
      <ul>{list.map((item) => <li key={item.start}>
        <p>{describeOpportunity(item, names)}</p>
        <small>{shortDay(item.start)} a {shortDay(item.end)}</small>
        {openStart === item.start ? <form className="opportunity-form" onSubmit={(event) => { event.preventDefault(); if (city.trim()) void onCreateTrip(city.trim(), item.start, item.end).then((saved) => { if (saved) { setOpenStart(null); setCity(""); } }); }}>
          <input className="form-input" required maxLength={120} aria-label="Para onde" placeholder="Para onde? ex.: Lisboa" value={city} onChange={(event) => setCity(event.target.value)} />
          <button className="button button-primary" type="submit" disabled={busy}>Criar viagem</button>
        </form> : <button type="button" className="button button-ghost" onClick={() => { setOpenStart(item.start); setCity(""); }}>Planear escapadinha</button>}
      </li>)}</ul>
      <p className="schedule-hint">Conta com os horários de cada um na Semana, as férias nas Definições e o feriado do vosso concelho.</p>
    </section>
  );
}
