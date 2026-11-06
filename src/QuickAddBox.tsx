import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { parseQuickText } from "./quickParse";
import type { QuickKind } from "./quickParse";
import type { HomePartner } from "./types";

export type QuickAddValue = {
  kind: QuickKind;
  title: string;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  forPartner: HomePartner | null;
};

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function longDay(key: string) {
  return new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${key}T12:00:00`));
}

const kinds: Array<{ value: QuickKind; label: string; button: string }> = [
  { value: "date", label: "Date", button: "Marcar date" },
  { value: "commitment", label: "Compromisso", button: "Guardar compromisso" },
  { value: "idea", label: "Ideia para depois", button: "Guardar ideia" },
];

// One box for everything: type a sentence and the day, time and kind are worked out from it.
export function QuickAddBox({ partnerOneName, partnerTwoName, busy, defaultKind = "date", autoFocus = false, onSubmit, onMoreDetails }: {
  partnerOneName: string;
  partnerTwoName: string;
  busy: boolean;
  defaultKind?: QuickKind;
  autoFocus?: boolean;
  onSubmit: (value: QuickAddValue) => Promise<boolean>;
  onMoreDetails?: (title: string) => void;
}) {
  const now = new Date();
  const today = dateKey(now);
  const tomorrow = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const saturday = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((6 - now.getDay() + 7) % 7 || 7)));
  const [text, setText] = useState("");
  const [chosenKind, setChosenKind] = useState<QuickKind | null>(null);
  const [chosenDay, setChosenDay] = useState<string | null>(null);
  const [otherDay, setOtherDay] = useState(false);
  const [chosenTime, setChosenTime] = useState<string | null>(null);
  const [forPartner, setForPartner] = useState<HomePartner | null>(null);
  const [message, setMessage] = useState("");

  const parsed = useMemo(() => parseQuickText(text), [text]);
  const kind = chosenKind ?? (defaultKind === "commitment" ? "commitment" : defaultKind === "idea" && !parsed.date ? "idea" : parsed.kind);
  const day = kind === "idea" ? null : chosenDay ?? parsed.date ?? (otherDay ? null : saturday);
  const time = chosenTime ?? parsed.startTime ?? "";
  const dayChoices = [
    { key: today, label: "Hoje" },
    { key: tomorrow, label: "Amanhã" },
    ...(saturday !== tomorrow ? [{ key: saturday, label: "Sábado" }] : []),
  ];
  const onChip = dayChoices.some((choice) => choice.key === day);
  const showDateInput = otherDay || (day !== null && !onChip);
  const submitLabel = kinds.find((item) => item.value === kind)?.button ?? "Guardar";
  const canSubmit = !busy && parsed.title.length > 0 && (kind === "idea" || day !== null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    const saved = await onSubmit({
      kind,
      title: parsed.title,
      date: day,
      startTime: kind === "idea" ? null : time || null,
      endTime: kind === "commitment" && chosenTime === null ? parsed.endTime : null,
      forPartner: kind === "commitment" ? forPartner : null,
    });
    if (!saved) return;
    setMessage(kind === "idea" ? `“${parsed.title}” ficou nas vossas ideias.` : `“${parsed.title}” ficou marcado para ${day ? longDay(day) : "mais tarde"}.`);
    setText("");
    setChosenKind(null);
    setChosenDay(null);
    setOtherDay(false);
    setChosenTime(null);
    setForPartner(null);
  }

  return (
    <form className="quick-add" onSubmit={(event) => void submit(event)}>
      <input className="form-input quick-add-input" required maxLength={160} autoFocus={autoFocus} aria-label="O que querem marcar" placeholder="ex.: Jantar italiano sexta às 20h" value={text} onChange={(event) => { setText(event.target.value); setMessage(""); }} />
      <div className="chip-row" role="group" aria-label="Tipo">
        {kinds.map((item) => <button type="button" key={item.value} className={`chip ${kind === item.value ? "selected" : ""}`} aria-pressed={kind === item.value} onClick={() => setChosenKind(item.value)}>{item.label}</button>)}
      </div>
      {kind !== "idea" && <>
        <div className="chip-row" role="group" aria-label="Dia">
          {dayChoices.map((choice) => <button type="button" key={choice.key} className={`chip ${!showDateInput && day === choice.key ? "selected" : ""}`} aria-pressed={!showDateInput && day === choice.key} onClick={() => { setOtherDay(false); setChosenDay(choice.key); }}>{choice.label}</button>)}
          <button type="button" className={`chip ${showDateInput ? "selected" : ""}`} aria-pressed={showDateInput} onClick={() => { setOtherDay(true); setChosenDay(null); }}>Outro dia</button>
        </div>
        <div className="quick-add-row">
          {showDateInput && <input className="form-input" type="date" required min={today} aria-label="Dia" value={day ?? ""} onChange={(event) => setChosenDay(event.target.value || null)} />}
          <input className="form-input" type="time" aria-label="Hora (opcional)" value={time} onChange={(event) => setChosenTime(event.target.value)} />
        </div>
      </>}
      {kind === "commitment" && <div className="chip-row" role="group" aria-label="Para quem">
        {([[null, "Os dois"], ["partner_one", partnerOneName], ["partner_two", partnerTwoName]] as const).map(([value, label]) => <button type="button" key={label} className={`chip ${forPartner === value ? "selected" : ""}`} aria-pressed={forPartner === value} onClick={() => setForPartner(value)}>{label}</button>)}
      </div>}
      {parsed.title && <p className="quick-add-preview"><strong>{parsed.title}</strong>{day ? ` · ${longDay(day)}` : ""}{kind !== "idea" && time ? ` · ${time.slice(0, 5)}` : ""}</p>}
      <div className="panel-actions quick-add-actions">
        <button className="button button-primary" type="submit" disabled={!canSubmit}>{submitLabel}</button>
        {kind === "idea" && onMoreDetails && <button type="button" className="button button-ghost" onClick={() => onMoreDetails(parsed.title)}>Mais detalhes</button>}
      </div>
      {message && <p className="quick-add-message" role="status">{message}</p>}
    </form>
  );
}
