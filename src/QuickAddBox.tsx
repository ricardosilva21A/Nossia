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

function weekdayName(key: string) {
  const name = new Intl.DateTimeFormat("pt-PT", { weekday: "long" }).format(new Date(`${key}T12:00:00`));
  return name.charAt(0).toLocaleUpperCase("pt-PT") + name.slice(1);
}

function longDay(key: string) {
  return new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${key}T12:00:00`));
}

const kinds: Array<{ value: QuickKind; label: string; button: string }> = [
  { value: "date", label: "Date", button: "Marcar date" },
  { value: "commitment", label: "Compromisso", button: "Guardar compromisso" },
  { value: "idea", label: "Ideia para depois", button: "Guardar ideia" },
  { value: "done", label: "Já fizemos", button: "Guardar e contar como foi" },
];

const previewKinds: Record<QuickKind, string> = { date: "Date", commitment: "Compromisso", idea: "Ideia", done: "Já feito" };

// One box for everything: type a sentence and the day, time and kind are worked out from it.
export function QuickAddBox({ partnerOneName, partnerTwoName, busy, defaultKind = "date", fixedKind, freeDay, initialDay = null, autoFocus = false, onSubmit, onSaved, onMoreDetails, onOpenPlaces }: {
  partnerOneName: string;
  partnerTwoName: string;
  busy: boolean;
  defaultKind?: QuickKind;
  // When set, the kind is already chosen (from the Hoje buttons) and its chips are hidden.
  fixedKind?: QuickKind;
  // The next day both are free, offered as a choice beside Hoje and Amanhã.
  freeDay?: string | null;
  // A day already picked (on the wall calendar).
  initialDay?: string | null;
  autoFocus?: boolean;
  onSubmit: (value: QuickAddValue) => Promise<boolean>;
  onSaved?: () => void;
  onMoreDetails?: (title: string) => void;
  onOpenPlaces?: () => void;
}) {
  const now = new Date();
  const today = dateKey(now);
  const tomorrow = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const saturday = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((6 - now.getDay() + 7) % 7 || 7)));
  const suggestedDay = freeDay && freeDay > tomorrow ? freeDay : saturday;
  const [text, setText] = useState("");
  const [chosenKind, setChosenKind] = useState<QuickKind | null>(null);
  const [chosenDay, setChosenDay] = useState<string | null>(initialDay);
  const [otherDay, setOtherDay] = useState(false);
  const [chosenTime, setChosenTime] = useState<string | null>(null);
  const [forPartner, setForPartner] = useState<HomePartner | null>(null);
  const [message, setMessage] = useState("");

  const parsed = useMemo(() => parseQuickText(text), [text]);
  const hasLink = /https?:\/\//i.test(text);
  const kind = fixedKind ?? chosenKind ?? (defaultKind === "commitment" ? "commitment" : defaultKind === "idea" && !parsed.date ? "idea" : parsed.kind);
  const day = kind === "idea" ? null : chosenDay ?? parsed.date ?? (otherDay ? null : kind === "done" ? today : suggestedDay);
  const time = chosenTime ?? parsed.startTime ?? "";
  const yesterday = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const dayChoices = kind === "done" ? [
    { key: today, label: "Hoje" },
    { key: yesterday, label: "Ontem" },
  ] : [
    { key: today, label: "Hoje" },
    { key: tomorrow, label: "Amanhã" },
    ...(suggestedDay !== tomorrow && suggestedDay !== today ? [{ key: suggestedDay, label: weekdayName(suggestedDay) }] : []),
  ];
  const onChip = dayChoices.some((choice) => choice.key === day);
  const showDateInput = otherDay || (day !== null && !onChip);
  const dayWord = (key: string) => key === today ? "hoje" : key === tomorrow ? "amanhã" : longDay(key);
  const submitLabel = kind === "date" && day ? `Marcar para ${dayWord(day)}${time ? ` às ${time.slice(0, 5)}` : ""}` : kinds.find((item) => item.value === kind)?.button ?? "Guardar";
  const canSubmit = !busy && (hasLink || (parsed.title.length > 0 && (kind === "idea" || day !== null)));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    const saved = await onSubmit({
      // A pasted link goes through untouched; the app turns it into a shared post.
      kind: hasLink ? "idea" : kind,
      title: hasLink ? text.trim() : parsed.title,
      date: day,
      startTime: kind === "idea" ? null : time || null,
      endTime: kind === "commitment" && chosenTime === null ? parsed.endTime : null,
      forPartner: kind === "commitment" ? forPartner : null,
    });
    if (!saved) return;
    if (onSaved) {
      onSaved();
      return;
    }
    setMessage(kind === "done" ? "" : kind === "idea" ? `“${parsed.title}” ficou nas vossas ideias.` : `“${parsed.title}” ficou marcado para ${day ? longDay(day) : "mais tarde"}.`);
    setText("");
    setChosenKind(null);
    setChosenDay(null);
    setOtherDay(false);
    setChosenTime(null);
    setForPartner(null);
  }

  return (
    <form className="quick-add" onSubmit={(event) => void submit(event)}>
      <input className="form-input quick-add-input" required maxLength={hasLink ? 1000 : 160} autoFocus={autoFocus} aria-label={fixedKind === "commitment" ? "Que compromisso" : fixedKind === "idea" ? "Que ideia" : "O que querem marcar"} placeholder={fixedKind === "commitment" ? "ex.: Dentista" : fixedKind === "idea" ? "ex.: Aula de cerâmica, ou cola um link" : "ex.: Jantar sushi"} value={text} onChange={(event) => { setText(event.target.value); setMessage(""); }} />
      {parsed.title && <p className="quick-preview" role="status"><strong>{previewKinds[kind]}</strong>{day && kind !== "idea" ? ` · ${longDay(day)}` : ""}{time && kind !== "idea" ? ` · ${time}` : ""}{kind === "commitment" ? ` · ${forPartner === "partner_one" ? partnerOneName : forPartner === "partner_two" ? partnerTwoName : "os dois"}` : ""}</p>}
      {!fixedKind && <div className="chip-row" role="group" aria-label="Tipo">
        {kinds.map((item) => <button type="button" key={item.value} className={`chip ${kind === item.value ? "selected" : ""}`} aria-pressed={kind === item.value} onClick={() => setChosenKind(item.value)}>{item.label}</button>)}
      </div>}
      {kind !== "idea" && <>
        <div className="chip-row" role="group" aria-label="Dia">
          {dayChoices.map((choice) => <button type="button" key={choice.key} className={`chip ${!showDateInput && day === choice.key ? "selected" : ""}`} aria-pressed={!showDateInput && day === choice.key} onClick={() => { setOtherDay(false); setChosenDay(choice.key); }}>{choice.label}</button>)}
          <button type="button" className={`chip ${showDateInput ? "selected" : ""}`} aria-pressed={showDateInput} onClick={() => { setOtherDay(true); setChosenDay(null); }}>Outro dia</button>
        </div>
        <div className="quick-add-row">
          {showDateInput && <input className="form-input" type="date" required min={kind === "done" ? undefined : today} max={kind === "done" ? today : undefined} aria-label="Dia" value={day ?? ""} onChange={(event) => setChosenDay(event.target.value || null)} />}
          <input className="form-input" type="time" aria-label="Hora (opcional)" value={time} onChange={(event) => setChosenTime(event.target.value)} />
        </div>
      </>}
      {kind === "commitment" && <div className="chip-row" role="group" aria-label="Para quem">
        {([[null, "Os dois"], ["partner_one", partnerOneName], ["partner_two", partnerTwoName]] as const).map(([value, label]) => <button type="button" key={label} className={`chip ${forPartner === value ? "selected" : ""}`} aria-pressed={forPartner === value} onClick={() => setForPartner(value)}>{label}</button>)}
      </div>}
      <div className="panel-actions quick-add-actions">
        <button className="button button-primary" type="submit" disabled={!canSubmit}>{submitLabel}</button>
        {kind === "date" && onOpenPlaces && <button type="button" className="link-button quick-add-places" onClick={onOpenPlaces}>Ou escolham um restaurante perto →</button>}
        {kind === "idea" && onMoreDetails && <button type="button" className="button button-ghost" onClick={() => onMoreDetails(parsed.title)}>Mais detalhes</button>}
      </div>
      {message && <p className="quick-add-message" role="status">{message}</p>}
    </form>
  );
}
