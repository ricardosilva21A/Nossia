// Portuguese holidays and the long weekends they make. Shared by the app and the reminders.

// No imports, so the reminders function can use this file as it is.

type Slot = "partner_one" | "partner_two";
export type Holiday = { date: string; name: string };
export type WorkBlock = { partner_slot: Slot; weekday: number };
// Each person's holidays: fixed periods they're away, and months a flexible person can't take leave.
export type VacationRules = {
  away?: Partial<Record<Slot, Array<{ starts_on: string; ends_on: string }>>>;
  avoidMonths?: Partial<Record<Slot, number[]>>;
};

export type Opportunity = {
  holiday: Holiday | null;
  awayFor?: Slot;
  awkward?: Slot[];
  start: string;
  end: string;
  days: number;
  leave: Array<{ date: string; who: Slot[] }>;
};

const maxLeaveDays = 2;

export function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}


function key(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addDays(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return key(date);
}

const plain = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

// Municipal holidays of the larger municipalities. Others simply don't get one.
const municipal: Record<string, [number, number, string]> = {
  lisboa: [6, 13, "Santo António"],
  porto: [6, 24, "São João"],
  braga: [6, 24, "São João"],
  guimaraes: [6, 24, "São João"],
  "vila nova de gaia": [6, 24, "São João"],
  coimbra: [7, 4, "Rainha Santa Isabel"],
  aveiro: [5, 12, "Santa Joana"],
  leiria: [5, 22, "Dia do Município"],
  evora: [6, 29, "São Pedro"],
  setubal: [9, 15, "Bocage"],
  faro: [9, 7, "Dia do Município"],
  viseu: [9, 21, "São Mateus"],
  "viana do castelo": [8, 20, "Senhora da Agonia"],
  funchal: [8, 21, "Dia da Cidade"],
};

export function holidaysFor(year: number, municipality?: string | null): Holiday[] {
  const easter = easterSunday(year);
  const fromEaster = (days: number) => {
    const date = new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + days);
    return key(date);
  };
  const fixed = (month: number, day: number) => `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const list: Holiday[] = [
    { date: fixed(1, 1), name: "Ano Novo" },
    { date: fromEaster(-2), name: "Sexta-feira Santa" },
    { date: fromEaster(0), name: "Páscoa" },
    { date: fixed(4, 25), name: "25 de Abril" },
    { date: fixed(5, 1), name: "Dia do Trabalhador" },
    { date: fromEaster(60), name: "Corpo de Deus" },
    { date: fixed(6, 10), name: "Dia de Portugal" },
    { date: fixed(8, 15), name: "Assunção de Nossa Senhora" },
    { date: fixed(10, 5), name: "Implantação da República" },
    { date: fixed(11, 1), name: "Todos os Santos" },
    { date: fixed(12, 1), name: "Restauração da Independência" },
    { date: fixed(12, 8), name: "Imaculada Conceição" },
    { date: fixed(12, 25), name: "Natal" },
  ];
  const local = municipality ? municipal[plain(municipality)] : undefined;
  if (local) list.push({ date: fixed(local[0], local[1]), name: local[2] });
  return list.sort((first, second) => first.date.localeCompare(second.date));
}

// Who works that day. Without any hours set, assume Monday to Friday.
const isAway = (slot: Slot, day: string, rules: VacationRules) => (rules.away?.[slot] ?? []).some((period) => period.starts_on <= day && period.ends_on >= day);
const avoids = (slot: Slot, day: string, rules: VacationRules) => (rules.avoidMonths?.[slot] ?? []).includes(Number(day.slice(5, 7)));

function workers(day: string, blocks: WorkBlock[], holidays: Set<string>, rules: VacationRules = {}): Slot[] {
  if (holidays.has(day)) return [];
  const weekday = new Date(`${day}T12:00:00`).getDay() || 7;
  return (["partner_one", "partner_two"] as Slot[]).filter((slot) => {
    if (isAway(slot, day, rules)) return false;
    const own = blocks.filter((block) => block.partner_slot === slot);
    return own.length ? own.some((block) => block.weekday === weekday) : weekday <= 5;
  });
}

// Long weekends and bridges from holidays between two days, at most two days of leave each.
export function findOpportunities(from: string, until: string, blocks: WorkBlock[], municipality?: string | null, rules: VacationRules = {}): Opportunity[] {
  const years = [Number(from.slice(0, 4)), Number(until.slice(0, 4))];
  const holidays = [...new Set(years)].flatMap((year) => holidaysFor(year, municipality));
  const holidayDays = new Set(holidays.map((holiday) => holiday.date));
  const off = (day: string) => workers(day, blocks, holidayDays, rules).length === 0;
  // A day of leave in a month someone can't take it doesn't count as possible.
  const canTake = (day: string) => workers(day, blocks, holidayDays, rules).every((slot) => !avoids(slot, day, rules));
  const found: Opportunity[] = [];

  for (const holiday of holidays) {
    if (holiday.date < from || holiday.date > until || !off(holiday.date)) continue;
    let start = holiday.date;
    let end = holiday.date;
    while (off(addDays(start, -1))) start = addDays(start, -1);
    while (off(addDays(end, 1))) end = addDays(end, 1);
    const baseDays = daysBetween(start, end) + 1;

    // Reach the next free stretch on each side by taking a day or two of leave.
    const reach = (edge: string, step: 1 | -1) => {
      const leave: string[] = [];
      let day = addDays(edge, step);
      while (!off(day) && leave.length < maxLeaveDays) {
        if (!canTake(day)) return null;
        leave.push(day);
        day = addDays(day, step);
      }
      if (!off(day)) return null;
      let far = day;
      while (off(addDays(far, step))) far = addDays(far, step);
      return { leave, far };
    };
    const left = reach(start, -1);
    const right = reach(end, 1);
    const options = [
      { start, end, leave: [] as string[] },
      ...(left ? [{ start: left.far, end, leave: left.leave }] : []),
      ...(right ? [{ start, end: right.far, leave: right.leave }] : []),
      ...(left && right && left.leave.length + right.leave.length <= maxLeaveDays ? [{ start: left.far, end: right.far, leave: [...left.leave, ...right.leave] }] : []),
    ].map((option) => ({ ...option, days: daysBetween(option.start, option.end) + 1 }))
      // Leave is only worth it when each day taken brings more than one day off.
      .filter((option) => option.leave.length === 0 ? option.days >= 3 : option.days - baseDays > option.leave.length);
    const best = options.sort((first, second) => second.days - first.days || first.leave.length - second.leave.length)[0];
    if (!best || found.some((item) => item.start === best.start && item.end === best.end)) continue;
    found.push({ holiday, start: best.start, end: best.end, days: best.days, leave: best.leave.sort().map((date) => ({ date, who: workers(date, blocks, holidayDays, rules) })) });
  }
  return found;
}

// When one partner has fixed holidays, what the other would need to take to join them.
export function findVacationWindows(from: string, until: string, blocks: WorkBlock[], municipality: string | null | undefined, rules: VacationRules): Opportunity[] {
  const years = [Number(from.slice(0, 4)), Number(until.slice(0, 4))];
  const holidayDays = new Set([...new Set(years)].flatMap((year) => holidaysFor(year, municipality)).map((holiday) => holiday.date));
  const found: Opportunity[] = [];
  for (const slot of ["partner_one", "partner_two"] as Slot[]) {
    for (const period of rules.away?.[slot] ?? []) {
      if (period.ends_on < from || period.starts_on > until) continue;
      const other: Slot = slot === "partner_one" ? "partner_two" : "partner_one";
      const leaveDays: string[] = [];
      for (let day = period.starts_on < from ? from : period.starts_on; day <= period.ends_on; day = addDays(day, 1)) {
        if (workers(day, blocks, holidayDays, rules).includes(other)) leaveDays.push(day);
      }
      // Stretch to the free days either side, usually the weekends.
      const offForBoth = (day: string) => workers(day, blocks, holidayDays, rules).length === 0;
      let start = period.starts_on < from ? from : period.starts_on;
      let end = period.ends_on;
      while (offForBoth(addDays(start, -1)) && addDays(start, -1) >= from) start = addDays(start, -1);
      while (offForBoth(addDays(end, 1))) end = addDays(end, 1);
      if (found.some((item) => item.start === start && item.end === end)) continue;
      const awkward = leaveDays.some((day) => avoids(other, day, rules)) ? [other] : [];
      found.push({ holiday: null, awayFor: slot, awkward, start, end, days: daysBetween(start, end) + 1, leave: leaveDays.map((date) => ({ date, who: [other] })) });
    }
  }
  return found;
}

export function daysBetween(first: string, second: string) {
  return Math.round((new Date(`${second}T12:00:00`).getTime() - new Date(`${first}T12:00:00`).getTime()) / 86400000);
}

const weekdayName = (day: string) => new Intl.DateTimeFormat("pt-PT", { weekday: "long" }).format(new Date(`${day}T12:00:00`));
const shortDate = (day: string) => new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long" }).format(new Date(`${day}T12:00:00`));

const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function describeOpportunity(opportunity: Opportunity, names: Record<Slot, string>) {
  const { holiday, leave, days } = opportunity;
  if (!holiday) {
    const away = opportunity.awayFor as Slot;
    const range = `de ${shortDate(opportunity.start)} a ${shortDate(opportunity.end)}`;
    if (!leave.length) return `Estão os dois de férias ${range}: ${days} dias seguidos.`;
    const other = leave[0].who[0];
    const note = opportunity.awkward?.length ? ` Atenção: ${monthNames[Number(leave[0].date.slice(5, 7)) - 1]} é um mês difícil para ${names[other]}.` : "";
    return `${names[away]} tem férias. Se ${names[other]} tirar ${leave.length} ${leave.length === 1 ? "dia" : "dias"}, têm ${days} dias seguidos, ${range}.${note}`;
  }
  const when = `${shortDate(holiday.date)} (${holiday.name}) é ${weekdayName(holiday.date)}`;
  if (!leave.length) return `${when}: têm ${days} dias seguidos sem tirar férias.`;
  const both = leave.every((day) => day.who.length === 2);
  const who = both ? "" : ` (${[...new Set(leave.flatMap((day) => day.who))].map((slot) => names[slot]).join(" e ")})`;
  const taken = leave.length === 1 ? weekdayName(leave[0].date) : leave.map((day) => weekdayName(day.date)).join(" e ");
  return `${when}: tirando ${taken}${who}, têm ${days} dias seguidos.`;
}
