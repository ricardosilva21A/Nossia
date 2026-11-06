import type { Category, Mood, WeatherSetting } from "./types";

export type QuickKind = "date" | "commitment" | "idea";

export type ParsedQuickText = {
  title: string;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  kind: QuickKind;
};

export type GuessedIdea = {
  emoji: string;
  category: Category;
  mood: Mood;
  durationMinutes: number;
  atHome: boolean;
  weatherSetting: WeatherSetting;
};

const weekdays: Record<string, number> = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
const months: Record<string, number> = { janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 };
const commitmentWords = /\b(dentista|medic[oa]|medicina|consulta|exame|analises|reuniao|oficina|inspecao|cabeleireir[oa]|barbeiro|finan[cç]as|tribunal|entrevista|escola|ginasio|casa d[aoe]s?|anos d[aoe]s?|aniversario d[aoe]s?|batizado|casamento|funeral|voo|aeroporto|comboio)\b/;
const leadingWords = "(?:para |pra |ate )?(?:n[ao] |ao |a |d[ao] |est[ae] |proxim[ao] )*";

// Accents off and lowercase, one character for one, so positions match the original text.
function plain(text: string) {
  return Array.from(text, (character) => {
    if (character.length !== 1) return character;
    const base = character.normalize("NFD")[0].toLocaleLowerCase("pt-PT");
    return base.length === 1 ? base : character;
  }).join("");
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function clock(hours: number, minutes: number) {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function addDays(now: Date, days: number) {
  return dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days));
}

// A day and month without a year: this year, or next year if it has passed.
function nextDayMonth(day: number, month: number, now: Date) {
  const thisYear = new Date(now.getFullYear(), month - 1, day);
  if (thisYear.getMonth() !== month - 1) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return dateKey(thisYear >= today ? thisYear : new Date(now.getFullYear() + 1, month - 1, day));
}

function nextDayOfMonth(day: number, now: Date) {
  for (let offset = 0; offset < 12; offset += 1) {
    const candidate = new Date(now.getFullYear(), now.getMonth() + offset, day);
    const sameMonth = candidate.getDate() === day;
    if (sameMonth && (offset > 0 || day >= now.getDate())) return dateKey(candidate);
  }
  return null;
}

function hourFor(rawHour: number, period: string | undefined, title: string) {
  if (period === "tarde" || period === "noite") {
    if (period === "noite" && rawHour === 12) return 0;
    return rawHour < 12 ? rawHour + 12 : rawHour;
  }
  if (period === "manha") return rawHour;
  // "às 3" almost always means the afternoon, and dinner is never at 8 in the morning.
  if (rawHour >= 1 && rawHour <= 7) return rawHour + 12;
  if (rawHour < 12 && /\b(jantar|ceia|concerto|bar|copo)\b/.test(title)) return rawHour + 12;
  return rawHour;
}

// Finds a day, a time and what is left as the title in text like "sábado às 9 dentista".
export function parseQuickText(text: string, now = new Date()): ParsedQuickText {
  const original = text.normalize("NFC");
  const source = plain(original);
  const taken: Array<[number, number]> = [];
  const free = (start: number, end: number) => taken.every(([from, to]) => end <= from || start >= to);
  const take = (match: RegExpExecArray) => taken.push([match.index, match.index + match[0].length]);
  const find = (pattern: RegExp) => {
    const matches = source.matchAll(new RegExp(pattern.source, "g"));
    for (const match of matches) {
      if (free(match.index, match.index + match[0].length)) return match as RegExpExecArray;
    }
    return null;
  };

  let date: string | null = null;
  const dateRules: Array<[RegExp, (match: RegExpExecArray) => string | null]> = [
    [new RegExp(`\\b${leadingWords}depois de amanha\\b`), () => addDays(now, 2)],
    [new RegExp(`\\b${leadingWords}amanha\\b`), () => addDays(now, 1)],
    [new RegExp(`\\b${leadingWords}hoje\\b`), () => addDays(now, 0)],
    [new RegExp(`\\b${leadingWords}fim de semana\\b`), () => addDays(now, (6 - now.getDay() + 7) % 7)],
    [new RegExp(`\\b${leadingWords}(?:dia )?(\\d{1,2})\\/(\\d{1,2})(?:\\/(\\d{4}))?\\b`), (match) => match[3]
      ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`
      : nextDayMonth(Number(match[1]), Number(match[2]), now)],
    [new RegExp(`\\b${leadingWords}(?:dia )?(\\d{1,2}) de (${Object.keys(months).join("|")})\\b`), (match) => nextDayMonth(Number(match[1]), months[match[2]], now)],
    [new RegExp(`\\b${leadingWords}dia (\\d{1,2})\\b`), (match) => nextDayOfMonth(Number(match[1]), now)],
    [new RegExp(`\\b${leadingWords}(${Object.keys(weekdays).join("|")})(?:-feira)?\\b`), (match) => addDays(now, (weekdays[match[1]] - now.getDay() + 7) % 7 || 7)],
  ];
  for (const [pattern, resolve] of dateRules) {
    const match = find(pattern);
    const resolved = match ? resolve(match) : null;
    if (match && resolved) {
      date = resolved;
      take(match);
      break;
    }
  }

  let startTime: string | null = null;
  let endTime: string | null = null;
  const part = "(\\d{1,2})(?:[h:](\\d{2})?)?";
  const range = find(new RegExp(`\\b(?:das|de) ${part} (?:as|a|ate) ${part}\\b`));
  if (range && Number(range[1]) < 24 && Number(range[3]) < 24) {
    const hour = hourFor(Number(range[1]), undefined, source);
    const endHour = hourFor(Number(range[3]), undefined, source);
    startTime = clock(hour, Number(range[2] ?? 0));
    if (endHour * 60 + Number(range[4] ?? 0) > hour * 60 + Number(range[2] ?? 0)) endTime = clock(endHour, Number(range[4] ?? 0));
    take(range);
  } else {
    const named = find(/\b(?:a |ao |as |pelas |pelo )?(meio[- ]dia|meia[- ]noite)\b/);
    const withWord = find(new RegExp(`\\b(?:as|pelas|a|para as) ${part}(?: (?:da|de) (manha|tarde|noite))?(?![\\d/])`));
    const bare = find(/\b(\d{1,2})(?:h(\d{2})?|:(\d{2}))(?: (?:da|de) (manha|tarde|noite))?\b/);
    if (named) {
      startTime = named[1].startsWith("meio") ? "12:00" : "00:00";
      take(named);
    } else if (withWord && Number(withWord[1]) < 24 && (/[h:]/.test(withWord[0]) || !withWord[0].startsWith("a ") || withWord[3])) {
      startTime = clock(hourFor(Number(withWord[1]), withWord[3], source), Number(withWord[2] ?? 0));
      take(withWord);
    } else if (bare && Number(bare[1]) < 24) {
      startTime = clock(bare[4] ? hourFor(Number(bare[1]), bare[4], source) : Number(bare[1]), Number(bare[2] ?? bare[3] ?? 0));
      take(bare);
    }
  }

  let title = "";
  let position = 0;
  for (const [from, to] of [...taken].sort((first, second) => first[0] - second[0])) {
    title += `${original.slice(position, from)} `;
    position = to;
  }
  title += original.slice(position);
  title = title.replace(/\s+/g, " ").replace(/\s+([,.;])/g, "$1").trim()
    .replace(/^[,.;:\-–\s]+|[,.;:\-–\s]+$/g, "")
    .replace(/\s+(?:para|pra|na|no|ao|à|às|as|a|dia|de|em|pelas)$/i, "")
    .replace(/^(?:para|pra|na|no|ao|às|as)\s+/i, "");
  title = title ? title[0].toLocaleUpperCase("pt-PT") + title.slice(1) : "";

  return { title, date, startTime, endTime, kind: commitmentWords.test(plain(title)) ? "commitment" : "date" };
}

const ideaGuesses: Array<[RegExp, Partial<GuessedIdea> & { emoji: string; category: Category; mood: Mood }]> = [
  [/\b(praia|mar|surf|piscina)\b/, { emoji: "🏖️", category: "Relaxing", mood: "Relaxing", durationMinutes: 240, weatherSetting: "outdoor" }],
  [/\b(caminhada|trilho|passeio|serra|miradouro|bicicleta)\b/, { emoji: "🥾", category: "Adventure", mood: "Adventure", durationMinutes: 150, weatherSetting: "outdoor" }],
  [/\b(piquenique|parque|jardim)\b/, { emoji: "🧺", category: "Relaxing", mood: "Relaxing", durationMinutes: 120, weatherSetting: "outdoor" }],
  [/\b(viagem|escapadinha|road trip|fim de semana fora)\b/, { emoji: "🚗", category: "Adventure", mood: "Adventure", durationMinutes: 480 }],
  [/\b(jantar|almoco|restaurante|sushi|pizza|tasca|petiscos)\b/, { emoji: "🍽️", category: "Food & drink", mood: "Romantic", durationMinutes: 120, weatherSetting: "indoor" }],
  [/\b(brunch|pequeno[- ]almoco|cafe|lanche|pastelaria)\b/, { emoji: "☕", category: "Food & drink", mood: "Relaxing", durationMinutes: 75, weatherSetting: "indoor" }],
  [/\b(bar|copo|cocktail|vinho|cerveja)\b/, { emoji: "🍸", category: "Food & drink", mood: "Fun", durationMinutes: 120, weatherSetting: "indoor" }],
  [/\b(cozinhar|receita|bolo|bolachas)\b/, { emoji: "🍳", category: "Food & drink", mood: "Fun", durationMinutes: 90, atHome: true, weatherSetting: "indoor" }],
  [/\b(cinema|filme|filmes|serie|series)\b/, { emoji: "🎬", category: "Culture", mood: "Relaxing", durationMinutes: 150, weatherSetting: "indoor" }],
  [/\b(museu|exposicao|galeria|teatro)\b/, { emoji: "🏛️", category: "Culture", mood: "Creative", durationMinutes: 120, weatherSetting: "indoor" }],
  [/\b(concerto|festival|musica|karaoke)\b/, { emoji: "🎶", category: "Culture", mood: "Fun", durationMinutes: 150 }],
  [/\b(jogo|jogos|bowling|padel|mini-golf|escape)\b/, { emoji: "🎲", category: "Culture", mood: "Fun", durationMinutes: 90 }],
  [/\b(spa|massagem|termas)\b/, { emoji: "💆", category: "Relaxing", mood: "Relaxing", durationMinutes: 120, weatherSetting: "indoor" }],
  [/\b(pintar|pintura|ceramica|workshop|desenhar)\b/, { emoji: "🎨", category: "Creative", mood: "Creative", durationMinutes: 120, weatherSetting: "indoor" }],
];

// A sensible starting point from the words alone; every value can be changed afterwards.
export function guessIdea(title: string): GuessedIdea {
  const text = plain(title);
  const guess = ideaGuesses.find(([pattern]) => pattern.test(text))?.[1];
  const atHome = /\bem casa\b/.test(text) || (guess?.atHome ?? false);
  return {
    emoji: guess?.emoji ?? "📅",
    category: guess?.category ?? "Romantic",
    mood: guess?.mood ?? "Surprise me",
    durationMinutes: guess?.durationMinutes ?? 120,
    atHome,
    weatherSetting: atHome ? "indoor" : guess?.weatherSetting ?? "any",
  };
}
