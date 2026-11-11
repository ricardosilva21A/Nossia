import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { calendarMarks, monthCells } from "./house";
import type { CalendarData, CalendarMark } from "./house";

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const weekdays = ["S", "T", "Q", "Q", "S", "S", "D"];
const kindLabel: Record<CalendarMark["kind"], string> = { date: "Date", commitment: "Compromisso", trip: "Viagem" };

type Month = { year: number; month: number };
type Data = CalendarData;

type Props = Data & {
  today: Date;
  onOpenAgenda: () => void;
};

const pad = (value: number) => String(value).padStart(2, "0");
const keyOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const shift = ({ year, month }: Month, by: number): Month => {
  const date = new Date(year, month + by, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
};

function marksFor(data: Data, { year, month }: Month) {
  const days = new Date(year, month + 1, 0).getDate();
  return calendarMarks(data, `${year}-${pad(month + 1)}-01`, `${year}-${pad(month + 1)}-${pad(days)}`);
}

function Page({ month, marks, todayKey, className = "", onAnimationEnd }: { month: Month; marks: Map<string, CalendarMark[]>; todayKey: string; className?: string; onAnimationEnd?: () => void }) {
  return (
    <div className={`wall-page ${className}`} onAnimationEnd={onAnimationEnd} aria-hidden={className ? "true" : undefined}>
      <div className="wall-page-head"><strong>{monthNames[month.month]}</strong><span>{month.year}</span></div>
      <div className="wall-grid">
        {weekdays.map((day, index) => <span className="wall-weekday" key={index}>{day}</span>)}
        {[...monthCells(month.year, month.month), ...Array<null>(14).fill(null)].slice(0, 42).map((day, index) => {
          if (!day) return <span className="wall-day is-empty" key={`empty-${index}`} />;
          const dayMarks = marks.get(day) ?? [];
          const kinds = new Set(dayMarks.map((mark) => mark.kind));
          return (
            <span key={day} className={`wall-day${day === todayKey ? " is-today" : ""}${kinds.has("trip") ? " has-trip" : ""}`} title={dayMarks.map((mark) => mark.title).join(", ") || undefined}>
              {Number(day.slice(8))}
              {(kinds.has("date") || kinds.has("commitment")) && <i className="wall-marks">{kinds.has("date") && <b className="mark-date">♥</b>}{kinds.has("commitment") && <b className="mark-commitment" />}</i>}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// The calendar on the wall, up close: one month per page, flipped up and over like a real one.
export function WallCalendar({ today, dates, commitments, trips, onOpenAgenda }: Props) {
  const data = useMemo(() => ({ dates, commitments, trips }), [dates, commitments, trips]);
  const [shown, setShown] = useState<Month>({ year: today.getFullYear(), month: today.getMonth() });
  const [flip, setFlip] = useState<{ dir: "next" | "prev"; to: Month } | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const todayKey = keyOf(today);

  function turn(dir: "next" | "prev") {
    if (flip) return;
    const to = shift(shown, dir === "next" ? 1 : -1);
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) setShown(to);
    else setFlip({ dir, to });
  }

  function settle() {
    if (!flip) return;
    setShown(flip.to);
    setFlip(null);
  }

  const base = flip?.dir === "next" ? flip.to : shown;
  const listMonth = flip?.to ?? shown;
  const listMarks = [...marksFor(data, listMonth).entries()].sort(([first], [second]) => first.localeCompare(second));
  // A trip shows once, on its first day of the month, not on every day.
  const seenTrips = new Set<string>();
  const items = listMarks.flatMap(([day, marks]) => marks.filter((mark) => {
    if (mark.kind !== "trip") return true;
    if (seenTrips.has(mark.title)) return false;
    seenTrips.add(mark.title);
    return true;
  }).map((mark) => ({ day, ...mark })));

  return (
    <div className="wall-calendar">
      <div
        className="wall-stage"
        onPointerDown={(event) => { touch.current = { x: event.clientX, y: event.clientY }; }}
        onPointerUp={(event) => {
          if (!touch.current) return;
          const dx = event.clientX - touch.current.x;
          const dy = event.clientY - touch.current.y;
          touch.current = null;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 40) return;
          const forward = Math.abs(dy) > Math.abs(dx) ? dy < 0 : dx < 0;
          turn(forward ? "next" : "prev");
        }}
      >
        <div className="wall-rings" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</div>
        <Page month={base} marks={marksFor(data, base)} todayKey={todayKey} />
        {flip?.dir === "next" && <Page month={shown} marks={marksFor(data, shown)} todayKey={todayKey} className="flip-away" onAnimationEnd={settle} />}
        {flip?.dir === "prev" && <Page month={flip.to} marks={marksFor(data, flip.to)} todayKey={todayKey} className="flip-back" onAnimationEnd={settle} />}
      </div>
      <div className="wall-nav">
        <button type="button" className="icon-button" aria-label="Mês anterior" onClick={() => turn("prev")}><ChevronLeft size={20} aria-hidden="true" /></button>
        <span aria-live="polite">{monthNames[listMonth.month]} {listMonth.year}</span>
        <button type="button" className="icon-button" aria-label="Mês seguinte" onClick={() => turn("next")}><ChevronRight size={20} aria-hidden="true" /></button>
      </div>
      <ul className="wall-list">
        {items.length ? items.map((item, index) => <li key={`${item.day}-${index}`} className={`is-${item.kind}`}><span>{Number(item.day.slice(8))}</span><strong>{item.title}</strong><small>{kindLabel[item.kind]}</small></li>)
          : <li className="is-empty">Nada marcado neste mês.</li>}
      </ul>
      <div className="panel-actions wall-actions">
        <button type="button" className="button button-primary" onClick={onOpenAgenda}>Abrir a agenda</button>
      </div>
    </div>
  );
}
