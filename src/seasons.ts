import type { SeasonKey } from "./types";

type Season = { reason: string; label: string; event: boolean };

export const seasons: Record<SeasonKey, Season> = {
  sao_martinho: { label: "São Martinho", reason: "É época de São Martinho", event: true },
  natal_preparar: { label: "Prendas de Natal", reason: "Está na altura de preparar o Natal", event: true },
  natal: { label: "Natal", reason: "É época de Natal", event: true },
  passagem_de_ano: { label: "Passagem de ano", reason: "O Ano Novo está a chegar", event: true },
  reis: { label: "Dia de Reis", reason: "É época de Reis", event: true },
  namorados: { label: "Dia dos Namorados", reason: "O Dia dos Namorados está a chegar", event: true },
  carnaval: { label: "Carnaval", reason: "É época de Carnaval", event: true },
  pascoa: { label: "Páscoa", reason: "É época de Páscoa", event: true },
  santos_populares: { label: "Santos Populares", reason: "São os Santos Populares", event: true },
  halloween: { label: "Halloween", reason: "O Halloween está a chegar", event: true },
  primavera: { label: "Primavera", reason: "Boa ideia para a primavera", event: false },
  verao: { label: "Verão", reason: "Boa ideia para o verão", event: false },
  outono: { label: "Outono", reason: "Boa ideia para o outono", event: false },
  inverno: { label: "Inverno", reason: "Boa ideia para o inverno", event: false },
};

// Fixed windows as MM-DD, both ends included. A start after the end crosses into the next year.
const fixedWindows: Partial<Record<SeasonKey, [string, string]>> = {
  sao_martinho: ["11-01", "11-11"],
  natal_preparar: ["11-01", "12-24"],
  natal: ["11-25", "12-26"],
  passagem_de_ano: ["12-27", "01-01"],
  reis: ["01-02", "01-06"],
  namorados: ["02-01", "02-14"],
  santos_populares: ["06-01", "06-30"],
  halloween: ["10-15", "10-31"],
  primavera: ["03-01", "05-31"],
  verao: ["06-01", "09-15"],
  outono: ["09-16", "11-30"],
  inverno: ["12-01", "02-29"],
};

// Days around Easter Sunday: Carnaval ends on Shrove Tuesday, 47 days before.
const easterWindows: Partial<Record<SeasonKey, [number, number]>> = {
  carnaval: [-60, -47],
  pascoa: [-14, 1],
};

// Anonymous Gregorian algorithm; returns Easter Sunday as a UTC date.
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

function isoOffset(base: Date, days: number) {
  return new Date(base.getTime() + days * 86400000).toISOString().slice(0, 10);
}

export function isSeasonActive(season: SeasonKey, date: string) {
  const fixed = fixedWindows[season];
  if (fixed) {
    const monthDay = date.slice(5);
    const [start, end] = fixed;
    return start <= end ? monthDay >= start && monthDay <= end : monthDay >= start || monthDay <= end;
  }
  const relative = easterWindows[season];
  if (!relative) return false;
  const easter = easterSunday(Number(date.slice(0, 4)));
  return date >= isoOffset(easter, relative[0]) && date <= isoOffset(easter, relative[1]);
}

// Ideas with no seasons work all year; seasonal ones only during one of their seasons.
export function isIdeaInSeason(ideaSeasons: SeasonKey[], date: string) {
  return ideaSeasons.length === 0 || ideaSeasons.some((season) => isSeasonActive(season, date));
}

// The season to mention for an idea on a date: special occasions before times of year.
export function activeSeasonFor(ideaSeasons: SeasonKey[], date: string) {
  const active = ideaSeasons.filter((season) => isSeasonActive(season, date));
  return active.find((season) => seasons[season].event) ?? active[0] ?? null;
}
