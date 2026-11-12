import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Pencil } from "lucide-react";
import { supabase } from "./lib/supabase";
import { NotificationSettings } from "./NotificationSettings";
import type { CoupleCommitment, CoupleTask, CoupleTrip, DateIdea, HomePartner, WorkScheduleBlock } from "./types";
type ScheduleCouple = { id: string; partner_one_name: string; partner_two_name: string };
type FreeWindow = { start: number; end: number };

const weekdayLabels = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
// The part of the day worth suggesting time together in.
const dayStart = 8 * 60;
const dayEnd = 23 * 60 + 30;
const shortestFreeWindow = 90;

function minutesOf(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function clock(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isoWeekday(date: Date) {
  return ((date.getDay() + 6) % 7) + 1;
}

// Busy minutes of one day from the weekly blocks; a shift past midnight also fills the next morning.
function busyFromBlocks(blocks: WorkScheduleBlock[], weekday: number) {
  const previousWeekday = weekday === 1 ? 7 : weekday - 1;
  return blocks.flatMap((block) => {
    const start = minutesOf(block.starts_at);
    const end = minutesOf(block.ends_at);
    if (end > start) return block.weekday === weekday ? [{ start, end }] : [];
    return [
      ...(block.weekday === weekday ? [{ start, end: 24 * 60 }] : []),
      ...(block.weekday === previousWeekday ? [{ start: 0, end }] : []),
    ];
  });
}

export function freeWindows(busy: FreeWindow[], from: number) {
  const windows: FreeWindow[] = [];
  let cursor = from;
  for (const interval of [...busy].sort((first, second) => first.start - second.start)) {
    if (interval.start > cursor) windows.push({ start: cursor, end: Math.min(interval.start, dayEnd) });
    cursor = Math.max(cursor, interval.end);
    if (cursor >= dayEnd) break;
  }
  if (cursor < dayEnd) windows.push({ start: cursor, end: dayEnd });
  return windows.filter((window) => window.end - window.start >= shortestFreeWindow);
}

// Shared free time for the next days, from both work schedules and timed planned dates.
export function sharedFreeDays(blocks: WorkScheduleBlock[], plannedDates: DateIdea[], commitments: CoupleCommitment[] = [], trips: CoupleTrip[] = [], length = 7, now = new Date()) {
  return Array.from({ length }, (_, offset) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const key = localDateKey(day);
    const busyIntervals = [
      ...busyFromBlocks(blocks, isoWeekday(day)),
      ...plannedDates.flatMap((date) => date.planned_for === key && date.planned_start_time
        ? [{ start: minutesOf(date.planned_start_time), end: minutesOf(date.planned_start_time) + (date.duration_minutes ?? 120) }]
        : []),
      ...commitments.flatMap((commitment) => commitment.event_date === key && commitment.starts_at
        ? [{ start: minutesOf(commitment.starts_at), end: commitment.ends_at ? minutesOf(commitment.ends_at) : minutesOf(commitment.starts_at) + 60 }]
        : []),
    ];
    const from = offset === 0 ? Math.max(dayStart, Math.ceil((now.getHours() * 60 + now.getMinutes()) / 15) * 15) : dayStart;
    const trip = trips.find((item) => item.start_date <= key && item.end_date >= key) ?? null;
    return { day, key, trip, windows: trip ? [] : freeWindows(busyIntervals, from), dates: plannedDates.filter((date) => date.planned_for === key), commitments: commitments.filter((commitment) => commitment.event_date === key) };
  });
}

export function describeWindows(windows: FreeWindow[]) {
  if (windows.length === 0) return "Sem tempo livre em comum";
  if (windows.length === 1 && windows[0].start === dayStart && windows[0].end === dayEnd) return "Livres o dia todo";
  return windows.map((window) => `${clock(window.start)}–${clock(window.end)}`).join(" · ");
}

export function SchedulePanel({ part, couple, userId, mySlot, plannedDates, blocks, commitments, trips, onRemoveCommitment, onUpdateCommitment, onBlocksChange, onFindDate }: { part: "agenda" | "hours" | "settings" | "tasks"; couple: ScheduleCouple; userId: string; mySlot: HomePartner | null; plannedDates: DateIdea[]; blocks: WorkScheduleBlock[]; commitments: CoupleCommitment[]; trips: CoupleTrip[]; busy: boolean; onRemoveCommitment: (id: string) => void; onUpdateCommitment: (id: string, patch: Partial<CoupleCommitment>) => Promise<boolean>; onBlocksChange: (update: (current: WorkScheduleBlock[]) => WorkScheduleBlock[]) => void;  onFindDate: () => void }) {
  const setBlocks = onBlocksChange;
  const [tasks, setTasks] = useState<CoupleTask[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [blockPartner, setBlockPartner] = useState<HomePartner>(mySlot ?? "partner_one");
  const [blockDays, setBlockDays] = useState("weekdays");
  const [blockStart, setBlockStart] = useState("09:00");
  const [blockEnd, setBlockEnd] = useState("18:00");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [taskAssignee, setTaskAssignee] = useState<HomePartner | "both">("both");
  const [showDone, setShowDone] = useState(false);
  const [commitmentDraft, setCommitmentDraft] = useState<CoupleCommitment | null>(null);
  const [taskDraft, setTaskDraft] = useState<CoupleTask | null>(null);
  const [feedUrl, setFeedUrl] = useState("");
  const [feedMessage, setFeedMessage] = useState("");
  const partnerName = (slot: HomePartner) => slot === "partner_one" ? couple.partner_one_name : couple.partner_two_name;

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.from("couple_tasks").select("*").order("created_at").then((taskResult) => {
      if (!active) return;
      if (taskResult.error) setError(`Não foi possível carregar as tarefas: ${taskResult.error.message}`);
      setTasks((taskResult.data ?? []) as CoupleTask[]);
      setLoaded(true);
    });
    return () => { active = false; };
  }, [couple.id]);

  const nextDays = useMemo(() => sharedFreeDays(blocks, plannedDates, commitments, trips), [blocks, commitments, plannedDates, trips]);
  const upcomingCommitments = useMemo(() => {
    const today = localDateKey(new Date());
    return commitments.filter((commitment) => commitment.event_date >= today).sort((first, second) => first.event_date.localeCompare(second.event_date) || (first.starts_at ?? "").localeCompare(second.starts_at ?? ""));
  }, [commitments]);

  const openTasks = useMemo(() => tasks.filter((task) => !task.done_at).sort((first, second) =>
    (first.due_date ?? "9999") .localeCompare(second.due_date ?? "9999") || (first.due_time ?? "").localeCompare(second.due_time ?? "") || first.created_at.localeCompare(second.created_at)), [tasks]);
  const doneTasks = useMemo(() => tasks.filter((task) => task.done_at).sort((first, second) => (second.done_at ?? "").localeCompare(first.done_at ?? "")).slice(0, 10), [tasks]);

  async function addBlocks(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || blockStart === blockEnd) return;
    const weekdays = blockDays === "weekdays" ? [1, 2, 3, 4, 5] : blockDays === "weekend" ? [6, 7] : [Number(blockDays)];
    setBusy(true);
    setError("");
    const { data, error: saveError } = await supabase.from("work_schedule_blocks")
      .insert(weekdays.map((weekday) => ({ couple_id: couple.id, partner_slot: blockPartner, weekday, starts_at: blockStart, ends_at: blockEnd })))
      .select("*");
    if (saveError) setError(`Não foi possível guardar o horário: ${saveError.message}`);
    else setBlocks((current) => [...current, ...data as WorkScheduleBlock[]]);
    setBusy(false);
  }

  async function removeBlock(id: string) {
    if (!supabase) return;
    setBusy(true);
    const { error: removeError } = await supabase.from("work_schedule_blocks").delete().eq("id", id);
    if (removeError) setError(`Não foi possível remover o horário: ${removeError.message}`);
    else setBlocks((current) => current.filter((block) => block.id !== id));
    setBusy(false);
  }

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = taskTitle.trim();
    if (!supabase || !title) return;
    setBusy(true);
    setError("");
    const { data, error: saveError } = await supabase.from("couple_tasks").insert({
      couple_id: couple.id,
      title,
      due_date: taskDate || null,
      due_time: taskDate && taskTime ? taskTime : null,
      assigned_to: taskAssignee === "both" ? null : taskAssignee,
    }).select("*").single();
    if (saveError) setError(`Não foi possível adicionar a tarefa: ${saveError.message}`);
    else {
      setTasks((current) => [...current, data as CoupleTask]);
      setTaskTitle("");
      setTaskDate("");
      setTaskTime("");
    }
    setBusy(false);
  }

  async function toggleTask(task: CoupleTask) {
    if (!supabase) return;
    const { data, error: saveError } = await supabase.from("couple_tasks")
      .update({ done_at: task.done_at ? null : new Date().toISOString() })
      .eq("id", task.id).select("*").single();
    if (saveError) setError(`Não foi possível atualizar a tarefa: ${saveError.message}`);
    else setTasks((current) => current.map((item) => item.id === task.id ? data as CoupleTask : item));
  }

  async function saveTaskDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !taskDraft || !taskDraft.title.trim()) return;
    const { data, error: saveError } = await supabase.from("couple_tasks").update({
      title: taskDraft.title.trim(),
      due_date: taskDraft.due_date || null,
      due_time: taskDraft.due_date && taskDraft.due_time ? taskDraft.due_time : null,
      assigned_to: taskDraft.assigned_to,
    }).eq("id", taskDraft.id).select("*").single();
    if (saveError) setError(`Não foi possível guardar a tarefa: ${saveError.message}`);
    else {
      setTasks((current) => current.map((task) => task.id === taskDraft.id ? data as CoupleTask : task));
      setTaskDraft(null);
    }
  }

  async function removeTask(id: string) {
    if (!supabase) return;
    const { error: removeError } = await supabase.from("couple_tasks").delete().eq("id", id);
    if (removeError) setError(`Não foi possível apagar a tarefa: ${removeError.message}`);
    else setTasks((current) => current.filter((task) => task.id !== id));
  }

  async function loadFeed(rotate = false) {
    if (!supabase) return;
    setBusy(true);
    setFeedMessage("");
    const { data, error: feedError } = await supabase.rpc("get_calendar_feed_token", { rotate });
    if (feedError) setFeedMessage(`Não foi possível criar a ligação: ${feedError.message}`);
    else {
      setFeedUrl(`${window.location.origin}/api/calendar?token=${data as string}`);
      if (rotate) setFeedMessage("Ligação nova criada. A antiga deixou de funcionar — subscrevam de novo no iPhone.");
    }
    setBusy(false);
  }

  async function copyFeed() {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setFeedMessage("Ligação copiada.");
    } catch {
      setFeedMessage("Não foi possível copiar. Selecionem a ligação e copiem-na manualmente.");
    }
  }

  const formatDay = (day: Date) => new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "short" }).format(day);
  const formatDue = (task: CoupleTask) => task.due_date
    ? `${new Intl.DateTimeFormat("pt-PT", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${task.due_date}T12:00:00`))}${task.due_time ? ` · ${task.due_time.slice(0, 5)}` : ""}`
    : "Sem data";
  const assigneeLabel = (task: CoupleTask) => task.assigned_to ? partnerName(task.assigned_to) : "Os dois";

  return (
    <section className="schedule-page" aria-label={"Agenda do casal"}>
      {error && <p className="form-alert error-alert" role="alert">{error}</p>}

      {part === "agenda" && <>
      <article className="schedule-card free-time-card">
        <div className="schedule-card-heading"><div><p className="section-kicker">{"PRÓXIMOS 7 DIAS"}</p><h2>{"Quando estão os dois livres"}</h2></div><button type="button" className="add-button" onClick={onFindDate}>{"Encontrar um date"}</button></div>
        {loaded && blocks.length === 0 && <p className="schedule-hint">{"Adicionem o horário de trabalho de cada um, aqui em baixo, para verem só o tempo que têm em comum."}</p>}
        <ul className="free-time-list">
          {nextDays.map(({ day, key, trip, windows, dates, commitments: dayCommitments }) => <li key={key}>
            <strong>{formatDay(day)}</strong>
            <span>{trip ? `Em viagem: ${trip.title}` : describeWindows(windows)}</span>
            {dates.map((date) => <em key={date.id}>{date.emoji} {date.title}{date.planned_start_time ? ` · ${date.planned_start_time.slice(0, 5)}` : ""}</em>)}
            {dayCommitments.map((commitment) => <em className="free-time-commitment" key={commitment.id}>{commitment.title}{commitment.starts_at ? ` · ${commitment.starts_at.slice(0, 5)}` : ""}</em>)}
          </li>)}
        </ul>
      </article>

      <article className="schedule-card commitments-card">
        <h2>Compromissos</h2>
        <p className="schedule-hint">Jantar em casa da família, o dentista, uma reunião. Vão para o calendário e contam como tempo ocupado. Adicionem-nos com o botão +.</p>
        {upcomingCommitments.length > 0 && <ul className="commitment-list">
          {upcomingCommitments.map((commitment) => commitmentDraft?.id === commitment.id ? <li key={commitment.id} className="edit-row"><form onSubmit={(event) => { event.preventDefault(); if (commitmentDraft.title.trim() && commitmentDraft.event_date) void onUpdateCommitment(commitment.id, { title: commitmentDraft.title.trim(), event_date: commitmentDraft.event_date, starts_at: commitmentDraft.starts_at || null, ends_at: commitmentDraft.starts_at && commitmentDraft.ends_at && commitmentDraft.ends_at > commitmentDraft.starts_at ? commitmentDraft.ends_at : null, for_partner: commitmentDraft.for_partner }).then((saved) => { if (saved) setCommitmentDraft(null); }); }}>
            <input className="form-input" required maxLength={200} aria-label="Compromisso" value={commitmentDraft.title} onChange={(event) => setCommitmentDraft({ ...commitmentDraft, title: event.target.value })} />
            <div className="edit-row-fields"><input className="form-input" type="date" required aria-label="Dia" value={commitmentDraft.event_date} onChange={(event) => setCommitmentDraft({ ...commitmentDraft, event_date: event.target.value })} /><input className="form-input" type="time" aria-label="Início" value={commitmentDraft.starts_at?.slice(0, 5) ?? ""} onChange={(event) => setCommitmentDraft({ ...commitmentDraft, starts_at: event.target.value || null })} /><input className="form-input" type="time" aria-label="Fim" value={commitmentDraft.ends_at?.slice(0, 5) ?? ""} onChange={(event) => setCommitmentDraft({ ...commitmentDraft, ends_at: event.target.value || null })} /><select className="form-input" aria-label="Para quem" value={commitmentDraft.for_partner ?? "both"} onChange={(event) => setCommitmentDraft({ ...commitmentDraft, for_partner: event.target.value === "both" ? null : event.target.value as HomePartner })}><option value="both">Os dois</option><option value="partner_one">{couple.partner_one_name}</option><option value="partner_two">{couple.partner_two_name}</option></select></div>
            <div className="panel-actions"><button className="button button-primary" type="submit">Guardar</button><button type="button" className="button button-ghost" onClick={() => setCommitmentDraft(null)}>Cancelar</button></div>
          </form></li> : <li key={commitment.id}><div><strong>{commitment.title}</strong><small>{new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${commitment.event_date}T12:00:00`))}{commitment.starts_at ? ` · ${commitment.starts_at.slice(0, 5)}` : ""}{commitment.ends_at ? `–${commitment.ends_at.slice(0, 5)}` : ""} · {commitment.for_partner ? partnerName(commitment.for_partner) : "Os dois"}</small></div><div className="row-actions"><button type="button" aria-label={`Alterar ${commitment.title}`} onClick={() => setCommitmentDraft(commitment)}><Pencil size={16} aria-hidden="true" /></button><button type="button" aria-label={`Apagar ${commitment.title}`} onClick={() => onRemoveCommitment(commitment.id)}>×</button></div></li>)}
        </ul>}
      </article>

      </>}

      {part === "hours" && <article className="schedule-card">
          <p className="section-kicker">{"HORÁRIO DE TRABALHO"}</p>
          <h2>{"A semana de cada um"}</h2>
          {(["partner_one", "partner_two"] as const).map((slot) => {
            const partnerBlocks = blocks.filter((block) => block.partner_slot === slot).sort((first, second) => first.weekday - second.weekday || first.starts_at.localeCompare(second.starts_at));
            return <div className="schedule-partner" key={slot}>
              <h3>{partnerName(slot)}{slot === mySlot && <span>{" (tu)"}</span>}</h3>
              {partnerBlocks.length === 0 ? <p className="schedule-hint">{"Ainda sem horário."}</p> : <ul className="schedule-blocks">
                {partnerBlocks.map((block) => <li key={block.id}><span>{weekdayLabels[block.weekday - 1]}</span><span>{block.starts_at.slice(0, 5)}–{block.ends_at.slice(0, 5)}{minutesOf(block.ends_at) < minutesOf(block.starts_at) ? " (dia seguinte)" : ""}</span><button type="button" disabled={busy} aria-label={"Remover"} onClick={() => void removeBlock(block.id)}>×</button></li>)}
              </ul>}
            </div>;
          })}
          <form className="schedule-form" onSubmit={(event) => void addBlocks(event)}>
            <label className="form-label">{"Quem"}<select className="form-input" value={blockPartner} onChange={(event) => setBlockPartner(event.target.value as HomePartner)}><option value="partner_one">{couple.partner_one_name}</option><option value="partner_two">{couple.partner_two_name}</option></select></label>
            <label className="form-label">{"Dias"}<select className="form-input" value={blockDays} onChange={(event) => setBlockDays(event.target.value)}><option value="weekdays">{"Segunda a sexta"}</option><option value="weekend">{"Fim de semana"}</option>{weekdayLabels.map((label, index) => <option key={label} value={String(index + 1)}>{label}</option>)}</select></label>
            <label className="form-label">{"Entrada"}<input className="form-input" type="time" required value={blockStart} onChange={(event) => setBlockStart(event.target.value)} /></label>
            <label className="form-label">{"Saída"}<input className="form-input" type="time" required value={blockEnd} onChange={(event) => setBlockEnd(event.target.value)} /></label>
            <button className="modal-submit" type="submit" disabled={busy || blockStart === blockEnd}>{"Adicionar horário"}</button>
          </form>
        </article>}

      {/* Tasks: hidden from the app for now (nobody used them); the code stays to bring them back. */}
      {part === "tasks" && <article className="schedule-card">
          <p className="section-kicker">{"COISAS A FAZER"}</p>
          <h2>{"Tarefas do casal"} <span className="heading-count">{openTasks.length}</span></h2>
          <form className="task-form" onSubmit={(event) => void addTask(event)}>
            <input className="form-input task-title-input" required maxLength={200} aria-label={"Nova tarefa"} placeholder={"ex.: Reservar o jantar de sábado"} value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} />
            <div className="task-form-row">
              <input className="form-input" type="date" aria-label={"Data (opcional)"} value={taskDate} onChange={(event) => setTaskDate(event.target.value)} />
              <input className="form-input" type="time" aria-label={"Hora (opcional)"} disabled={!taskDate} value={taskTime} onChange={(event) => setTaskTime(event.target.value)} />
              <select className="form-input" aria-label={"Para quem"} value={taskAssignee} onChange={(event) => setTaskAssignee(event.target.value as HomePartner | "both")}><option value="both">{"Os dois"}</option><option value="partner_one">{couple.partner_one_name}</option><option value="partner_two">{couple.partner_two_name}</option></select>
              <button className="modal-submit" type="submit" disabled={busy || !taskTitle.trim()}>{"Adicionar"}</button>
            </div>
          </form>
          {openTasks.length === 0 ? <p className="schedule-hint">{loaded ? "Nada pendente. 🎉" : "A carregar…"}</p> : <ul className="task-list">
            {openTasks.map((task) => taskDraft?.id === task.id ? <li key={task.id} className="edit-row"><form onSubmit={(event) => void saveTaskDraft(event)}>
              <input className="form-input" required maxLength={200} aria-label="Tarefa" value={taskDraft.title} onChange={(event) => setTaskDraft({ ...taskDraft, title: event.target.value })} />
              <div className="edit-row-fields"><input className="form-input" type="date" aria-label="Dia" value={taskDraft.due_date ?? ""} onChange={(event) => setTaskDraft({ ...taskDraft, due_date: event.target.value || null })} /><input className="form-input" type="time" aria-label="Hora" disabled={!taskDraft.due_date} value={taskDraft.due_time?.slice(0, 5) ?? ""} onChange={(event) => setTaskDraft({ ...taskDraft, due_time: event.target.value || null })} /><select className="form-input" aria-label="Para quem" value={taskDraft.assigned_to ?? "both"} onChange={(event) => setTaskDraft({ ...taskDraft, assigned_to: event.target.value === "both" ? null : event.target.value as HomePartner })}><option value="both">Os dois</option><option value="partner_one">{couple.partner_one_name}</option><option value="partner_two">{couple.partner_two_name}</option></select></div>
              <div className="panel-actions"><button className="button button-primary" type="submit">Guardar</button><button type="button" className="button button-ghost" onClick={() => setTaskDraft(null)}>Cancelar</button></div>
            </form></li> : <li key={task.id}><input type="checkbox" checked={false} aria-label={`Marcar "${task.title}" como feita`} onChange={() => void toggleTask(task)} /><div><strong>{task.title}</strong><small>{formatDue(task)} · {assigneeLabel(task)}</small></div><div className="row-actions"><button type="button" aria-label={`Alterar ${task.title}`} onClick={() => setTaskDraft(task)}><Pencil size={16} aria-hidden="true" /></button><button type="button" aria-label="Apagar tarefa" onClick={() => void removeTask(task.id)}>×</button></div></li>)}
          </ul>}
          {doneTasks.length > 0 && <button type="button" className="task-done-toggle" onClick={() => setShowDone((shown) => !shown)}>{showDone ? "Esconder feitas" : `Ver feitas (${doneTasks.length})`}</button>}
          {showDone && <ul className="task-list done-tasks">
            {doneTasks.map((task) => <li key={task.id}><input type="checkbox" checked aria-label={`Voltar a abrir "${task.title}"`} onChange={() => void toggleTask(task)} /><div><strong>{task.title}</strong><small>{assigneeLabel(task)}</small></div><button type="button" aria-label={"Apagar tarefa"} onClick={() => void removeTask(task.id)}>×</button></li>)}
          </ul>}
        </article>}

      {part === "settings" && <>
      <article className="schedule-card calendar-sync-card">
        <p className="section-kicker">{"CALENDÁRIO DO IPHONE"}</p>
        <h2>{"Ver tudo no calendário do telemóvel"}</h2>
        <p className="schedule-hint">{"Os dates planeados, as tuas tarefas (e as dos dois), o aniversário de namoro e os anos de cada um aparecem sozinhos no Calendário do iPhone. Cada um faz isto no seu telemóvel, com a sua conta."}</p>
        {!feedUrl ? <button type="button" className="modal-submit" disabled={busy || !mySlot} onClick={() => void loadFeed()}>{"Ligar ao calendário do iPhone"}</button> : <>
          <div className="calendar-sync-actions"><a className="modal-submit" href={feedUrl.replace(/^https?:/, "webcal:")}>{"Subscrever no iPhone"}</a><button type="button" className="photo-upload-button" onClick={() => void copyFeed()}>{"Copiar ligação"}</button></div>
          <ol className="calendar-sync-steps">
            <li>{"Abram esta página no iPhone e toquem em “Subscrever no iPhone”, depois em “Subscrever”."}</li>
            <li>{"Ou: Definições → Calendário → Contas → Adicionar conta → Outra → Adicionar calendário subscrito, e colem a ligação."}</li>
            <li>{"O iPhone vai buscar as novidades sozinho, normalmente a cada hora."}</li>
          </ol>
          <input className="form-input" readOnly aria-label={"Ligação do calendário"} value={feedUrl} onFocus={(event) => event.currentTarget.select()} />
          <button type="button" className="task-done-toggle" disabled={busy} onClick={() => void loadFeed(true)}>{"Gerar uma ligação nova (a antiga deixa de funcionar)"}</button>
        </>}
        {feedMessage && <p className="form-alert config-alert" role="status">{feedMessage}</p>}
      </article>
      <NotificationSettings userId={userId} />
      </>}
    </section>
  );
}
