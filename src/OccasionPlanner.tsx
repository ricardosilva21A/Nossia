import { useState } from "react";
import { Sheet } from "./HouseSheets";

// Planning a birthday or the anniversary: on the day, the day before, the weekend, the whole
// week, or another day. Then either pick something special to do or just mark the day.

export type Occasion = { key: string; title: string; emoji: string; date: string };

type Choice = "day" | "eve" | "weekend" | "week" | "other";

const pad = (value: number) => String(value).padStart(2, "0");
const keyOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const shift = (key: string, days: number) => {
  const date = new Date(`${key}T12:00:00`);
  date.setDate(date.getDate() + days);
  return keyOf(date);
};
const longDay = (key: string) => new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${key}T12:00:00`));

// The Saturday of that weekend: the day itself on a weekend, otherwise the Saturday before.
export function weekendFor(key: string) {
  const day = new Date(`${key}T12:00:00`).getDay();
  if (day === 6) return key;
  if (day === 0) return shift(key, -1);
  return shift(key, -(day + 1));
}

// Monday to Sunday of the week the occasion falls in.
export function weekFor(key: string) {
  const day = new Date(`${key}T12:00:00`).getDay() || 7;
  const start = shift(key, 1 - day);
  return { start, end: shift(start, 6) };
}

type Props = {
  occasion: Occasion;
  today: string;
  busy: boolean;
  onPickIdea: (date: string) => void;
  onJustMark: (date: string, title: string) => Promise<boolean>;
  onWholeWeek: (start: string, end: string, title: string) => Promise<boolean>;
  onClose: () => void;
};

export function OccasionPlanner({ occasion, today, busy, onPickIdea, onJustMark, onWholeWeek, onClose }: Props) {
  const [choice, setChoice] = useState<Choice>("day");
  const [other, setOther] = useState(occasion.date);
  const [done, setDone] = useState("");
  const week = weekFor(occasion.date);
  const options: Array<{ value: Choice; label: string; hint: string; date: string | null }> = [
    { value: "day", label: "No próprio dia", hint: longDay(occasion.date), date: occasion.date },
    { value: "eve", label: "Na véspera", hint: longDay(shift(occasion.date, -1)), date: shift(occasion.date, -1) },
    { value: "weekend", label: "No fim de semana", hint: longDay(weekendFor(occasion.date)), date: weekendFor(occasion.date) },
    { value: "week", label: "A semana toda", hint: `De ${longDay(week.start)} a ${longDay(week.end)}`, date: null },
    { value: "other", label: "Outro dia", hint: "Escolhes tu", date: other },
  ];
  const picked = options.find((option) => option.value === choice)!;
  const date = choice === "other" ? other : picked.date;
  const past = date !== null && date < today;

  async function finish(action: "idea" | "mark") {
    if (choice === "week") {
      const ok = await onWholeWeek(week.start, week.end, `Semana · ${occasion.title}`);
      if (ok) setDone("Semana marcada no calendário. Agora podem pôr dates nesses dias.");
      return;
    }
    if (!date) return;
    if (action === "idea") {
      onPickIdea(date);
      onClose();
      return;
    }
    const ok = await onJustMark(date, `${occasion.title} ${occasion.emoji}`);
    if (ok) setDone(`Marcado para ${longDay(date)}.`);
  }

  return (
    <Sheet label={`Planear: ${occasion.title}`} onClose={onClose}>
      <p className="game-deck"><span aria-hidden="true">{occasion.emoji}</span>{longDay(occasion.date)}</p>
      <h2 className="occasion-title">Planear: {occasion.title}</h2>
      {done ? <>
        <p className="game-waiting"><span aria-hidden="true">✓</span>{done}</p>
        <div className="panel-actions welcome-actions"><button type="button" className="button button-primary" autoFocus onClick={onClose}>Feito</button></div>
      </> : <>
        <div className="occasion-options" role="radiogroup" aria-label="Quando">
          {options.map((option) => <label key={option.value} className={`occasion-option ${choice === option.value ? "selected" : ""}`}>
            <input type="radio" name="occasion-when" checked={choice === option.value} onChange={() => setChoice(option.value)} />
            <span><strong>{option.label}</strong><small>{option.hint}</small></span>
          </label>)}
        </div>
        {choice === "other" && <label className="form-label">Dia<input className="form-input" type="date" min={today} value={other} onChange={(event) => setOther(event.target.value)} /></label>}
        {past && <p className="error-alert" role="alert">Esse dia já passou.</p>}
        <div className="panel-actions welcome-actions">
          {choice === "week"
            ? <button type="button" className="button button-primary" disabled={busy} onClick={() => void finish("mark")}>Marcar a semana</button>
            : <>
              <button type="button" className="button button-ghost" disabled={busy || past || !date} onClick={() => void finish("mark")}>Só marcar o dia</button>
              <button type="button" className="button button-primary" disabled={busy || past || !date} onClick={() => void finish("idea")}>Escolher o que fazer</button>
            </>}
        </div>
      </>}
    </Sheet>
  );
}
