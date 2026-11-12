// A weather notification only when it changes a plan: rain on an outdoor date in the next two
// days, or a sunny weekend when both are free and have an outdoor idea saved. At most one a week
// (the key is the week), so it never turns into a daily forecast.

export type NudgeDay = { date: string; weatherCode: number; precipitationProbability: number; temperatureMax: number };
export type WeatherNudge = { key: string; title: string; body: string; url: string };

const rainCodes = [51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];
const dayNames = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

function addDays(date: string, days: number) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}

function weekdayOf(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

// ISO week, e.g. "2026-W46": the one-a-week limit.
export function isoWeek(date: string) {
  const day = new Date(`${date}T12:00:00Z`);
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((day.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

const isRainy = (day: NudgeDay) => day.precipitationProbability >= 60 || rainCodes.includes(day.weatherCode);
const isSunny = (day: NudgeDay) => day.weatherCode <= 2 && day.precipitationProbability < 20 && day.temperatureMax >= 14;

export function weatherNudge(input: {
  today: string;
  forecast: NudgeDay[];
  dates: Array<{ title: string; planned_for: string; weather_setting?: string | null }>;
  outdoorIdeas: string[];
  isFree: (date: string) => boolean;
}): WeatherNudge | null {
  const key = `weather:${isoWeek(input.today)}`;
  const forecastOn = (date: string) => input.forecast.find((day) => day.date === date);

  // Rain on an outdoor date tomorrow or the day after.
  for (const offset of [1, 2]) {
    const date = addDays(input.today, offset);
    const day = forecastOn(date);
    const outdoor = input.dates.find((item) => item.planned_for === date && item.weather_setting === "outdoor");
    if (day && outdoor && isRainy(day)) {
      const when = offset === 1 ? "amanhã" : `na ${dayNames[weekdayOf(date)]}`.replace("na sábado", "no sábado").replace("na domingo", "no domingo");
      return { key, title: `Vai chover ${when}`, body: `${outdoor.title} é ao ar livre. Mudam o dia ou trocam por algo em casa?`, url: "/planned" };
    }
  }

  // Thursday: a sunny weekend day with both free, nothing planned, and an outdoor idea to suggest.
  if (weekdayOf(input.today) === 4 && input.outdoorIdeas.length) {
    const weekend = [addDays(input.today, 2), addDays(input.today, 3)];
    const planned = input.dates.some((item) => weekend.includes(item.planned_for));
    const sunny = weekend.find((date) => {
      const day = forecastOn(date);
      return day && isSunny(day) && input.isFree(date);
    });
    if (!planned && sunny) {
      const name = weekdayOf(sunny) === 6 ? "Sábado" : "Domingo";
      return { key, title: "Fim de semana de sol", body: `${name} vai estar sol e estão os dois livres. Que tal ${input.outdoorIdeas[0]}?`, url: "/hoje" };
    }
  }
  return null;
}

// Just what the note needs, from Open-Meteo, for the server (the app has its own richer fetch).
export async function fetchNudgeForecast(latitude: number, longitude: number): Promise<NudgeDay[]> {
  const query = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), daily: "weather_code,temperature_2m_max,precipitation_probability_max", forecast_days: "5", timezone: "Europe/Lisbon" });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`);
  if (!response.ok) throw new Error(`forecast ${response.status}`);
  const daily = (await response.json() as { daily?: { time?: string[]; weather_code?: number[]; temperature_2m_max?: number[]; precipitation_probability_max?: number[] } }).daily;
  return (daily?.time ?? []).map((date, index) => ({
    date,
    weatherCode: daily?.weather_code?.[index] ?? 0,
    temperatureMax: daily?.temperature_2m_max?.[index] ?? 0,
    precipitationProbability: daily?.precipitation_probability_max?.[index] ?? 0,
  }));
}
