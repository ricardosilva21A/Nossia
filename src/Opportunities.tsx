import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { addDays, describeOpportunity, findOpportunities } from "./holidays";
import type { WorkBlock } from "./holidays";

const shortDay = (day: string) => new Intl.DateTimeFormat("pt-PT", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${day}T12:00:00`));

export function Opportunities({ today, blocks, municipality, names, busy, onCreateTrip }: {
  today: string;
  blocks: WorkBlock[];
  municipality: string | null;
  names: { partner_one: string; partner_two: string };
  busy: boolean;
  onCreateTrip: (title: string, start: string, end: string) => Promise<boolean>;
}) {
  const [openStart, setOpenStart] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const list = useMemo(() => findOpportunities(today, addDays(today, 365), blocks, municipality).slice(0, 4), [blocks, municipality, today]);
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
      <p className="schedule-hint">Conta com os horários de cada um na Semana e com o feriado do vosso concelho.</p>
    </section>
  );
}
