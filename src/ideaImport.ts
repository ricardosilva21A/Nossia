import { readSheet } from "read-excel-file/browser";
import type { Category, DateIdea, Mood, WeatherSetting } from "./types";

export type ImportedIdea = Pick<
  DateIdea,
  "title" | "description" | "category" | "mood" | "duration" | "duration_minutes" | "budget" | "budget_eur" | "travel_minutes" | "at_home" | "weather_setting" | "emoji"
>;

export type ImportPreview = {
  valid: ImportedIdea[];
  invalid: Array<{ row: number; reason: string }>;
};

const moodByLabel: Record<string, Mood> = {
  romantic: "Romantic",
  romântico: "Romantic",
  romantico: "Romantic",
  fun: "Fun",
  divertido: "Fun",
  divertida: "Fun",
  relaxing: "Relaxing",
  relaxante: "Relaxing",
  adventure: "Adventure",
  aventura: "Adventure",
  creative: "Creative",
  criativo: "Creative",
  criativa: "Creative",
  "surprise me": "Surprise me",
  "surpreendam-nos": "Surprise me",
};

const categoryByLabel: Record<string, Category> = {
  romantic: "Romantic",
  romântico: "Romantic",
  romantico: "Romantic",
  adventure: "Adventure",
  aventura: "Adventure",
  "food & drink": "Food & drink",
  "food and drink": "Food & drink",
  "comida e bebida": "Food & drink",
  creative: "Creative",
  criativo: "Creative",
  criativa: "Creative",
  relaxing: "Relaxing",
  relaxante: "Relaxing",
  culture: "Culture",
  cultura: "Culture",
};

const weatherSettingByLabel: Record<string, WeatherSetting> = {
  any: "any",
  flexible: "any",
  "all weather": "any",
  interior: "indoor",
  indoor: "indoor",
  exterior: "outdoor",
  outdoor: "outdoor",
};

function normalizeHeader(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase().replace(/[\s-]+/g, "_");
}

function cellText(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function parseCsv(text: string): unknown[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
    } else if (character === '"' && value.length === 0) {
      quoted = true;
    } else if (character === delimiter) {
      row.push(value);
      value = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  if (quoted) throw new Error("The CSV file has an unclosed quoted field.");
  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

function categoryForMood(mood: Mood): Category {
  if (mood === "Romantic") return "Romantic";
  if (mood === "Relaxing") return "Relaxing";
  if (mood === "Adventure") return "Adventure";
  if (mood === "Creative") return "Creative";
  return "Food & drink";
}

function parseNumber(value: unknown) {
  const text = cellText(value).replace(",", ".");
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : NaN;
}

function parseBoolean(value: unknown) {
  const text = cellText(value).toLocaleLowerCase();
  if (["true", "yes", "y", "1", "sim", "s"].includes(text)) return true;
  if (["false", "no", "n", "0", "não", "nao"].includes(text)) return false;
  return null;
}

function field(row: unknown[], headers: Map<string, number>, ...names: string[]) {
  for (const name of names) {
    const index = headers.get(name);
    if (index !== undefined) return row[index];
  }
  return null;
}

function displayDuration(minutes: number) {
  if (minutes >= 240) return "4+ hours";
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hour${hours === 1 ? "" : "s"}`;
}

function displayBudget(euros: number) {
  return euros === 0 ? "Free" : `€${euros > 10 ? "€" : ""}${euros > 30 ? "€" : ""}`;
}

export async function previewIdeaImport(file: File, maxIdeas = 200, maxFileSizeMb = 2): Promise<ImportPreview> {
  if (file.size > maxFileSizeMb * 1024 * 1024) throw new Error(`Choose a file smaller than ${maxFileSizeMb} MB.`);
  const extension = file.name.split(".").pop()?.toLocaleLowerCase();
  let rows: unknown[][];
  if (extension === "csv") {
    rows = parseCsv(await file.text());
  } else if (extension === "xlsx") {
    rows = await readSheet(file, 1);
  } else {
    throw new Error("Choose an .xlsx or .csv file.");
  }

  if (rows.length < 2) throw new Error("The file must contain a header row and at least one idea.");
  if (rows.length > maxIdeas + 1) throw new Error(`Import up to ${maxIdeas} ideas at a time.`);

  const headers = new Map<string, number>();
  rows[0].forEach((header, index) => headers.set(normalizeHeader(header), index));
  const valid: ImportedIdea[] = [];
  const invalid: ImportPreview["invalid"] = [];

  rows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    const title = cellText(field(row, headers, "title", "idea", "ideia", "nome"));
    const description = cellText(field(row, headers, "description", "details", "descricao", "descrição"));
    const moodText = cellText(field(row, headers, "mood", "feeling", "estado_de_espirito")).toLocaleLowerCase();
    const mood = moodByLabel[moodText];
    const duration = parseNumber(field(row, headers, "duration_minutes", "duration", "duracao_minutos", "duracao"));
    const budget = parseNumber(field(row, headers, "budget_eur", "budget", "orcamento_eur", "orcamento"));
    const atHome = parseBoolean(field(row, headers, "at_home", "at_home?", "em_casa", "em_casa?"));
    const weatherSettingText = cellText(field(row, headers, "weather_setting", "weather", "ambiente", "interior_exterior")).toLocaleLowerCase();
    const weatherSetting = weatherSettingText ? weatherSettingByLabel[weatherSettingText] : atHome ? "indoor" : "any";
    const travelValue = field(row, headers, "travel_minutes", "travel_time_minutes", "tempo_viagem_minutos", "tempo_de_viagem");
    const travel = parseNumber(travelValue);
    const categoryText = cellText(field(row, headers, "category", "categoria")).toLocaleLowerCase();
    const category = categoryText ? categoryByLabel[categoryText] : mood ? categoryForMood(mood) : undefined;
    const problems: string[] = [];

    if (!title) problems.push("title is required");
    if (!description) problems.push("description is required");
    if (!mood) problems.push("mood is missing or invalid");
    if (duration === null || Number.isNaN(duration) || !Number.isInteger(duration) || duration <= 0) problems.push("duration_minutes must be a positive whole number");
    if (budget === null || Number.isNaN(budget) || budget < 0) problems.push("budget_eur must be zero or greater");
    if (atHome === null) problems.push("at_home must be true or false");
    if (travelValue !== null && cellText(travelValue) !== "" && (travel === null || Number.isNaN(travel) || !Number.isInteger(travel) || travel < 0)) problems.push("travel_minutes must be a non-negative whole number or blank");
    if (categoryText && !category) problems.push("category is invalid");
    if (weatherSettingText && !weatherSetting) problems.push("weather_setting must be any, indoor, or outdoor");

    if (problems.length || !mood || duration === null || budget === null || atHome === null) {
      invalid.push({ row: rowNumber, reason: problems.join("; ") });
      return;
    }

    const durationMinutes = duration;
    const budgetEuros = budget;
    const travelMinutes = travel;
    valid.push({
      title,
      description,
      category: category ?? categoryForMood(mood),
      mood,
      duration: displayDuration(durationMinutes),
      duration_minutes: durationMinutes,
      budget: displayBudget(budgetEuros),
      budget_eur: budgetEuros,
      travel_minutes: atHome ? 0 : travelMinutes,
      at_home: atHome,
      weather_setting: weatherSetting ?? "any",
      emoji: cellText(field(row, headers, "emoji", "icon")) || "💌",
    });
  });

  return { valid, invalid };
}
