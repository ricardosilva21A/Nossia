import type { DateIdea } from "./types";

export type WeatherCondition = "unknown" | "rain" | "cold" | "hot" | "clear";

export type DailyWeather = {
  date: string;
  weatherCode: number;
  temperatureMax: number;
  temperatureMin: number;
  precipitationProbability: number;
  apparentTemperatureMax: number | null;
  apparentTemperatureMin: number | null;
  windSpeedMax: number | null;
  uvIndexMax: number | null;
  sunshineHours: number | null;
  daylightHours: number | null;
};

type OpenMeteoResponse = {
  daily?: {
    time?: unknown;
    weather_code?: unknown;
    temperature_2m_max?: unknown;
    temperature_2m_min?: unknown;
    precipitation_probability_max?: unknown;
    apparent_temperature_max?: unknown;
    apparent_temperature_min?: unknown;
    wind_speed_10m_max?: unknown;
    uv_index_max?: unknown;
    sunshine_duration?: unknown;
    daylight_duration?: unknown;
  };
};

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number" && Number.isFinite(item));
}

function optionalNumberAt(value: unknown, index: number, divisor = 1): number | null {
  if (!isNumberArray(value)) return null;
  const number = value[index];
  return number === undefined ? null : number / divisor;
}

export async function fetchDailyWeather(latitude: number, longitude: number, signal?: AbortSignal): Promise<DailyWeather[]> {
  const query = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,apparent_temperature_max,apparent_temperature_min,wind_speed_10m_max,uv_index_max,sunshine_duration,daylight_duration",
    forecast_days: "7",
    timezone: "auto",
    wind_speed_unit: "kmh",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query.toString()}`, { signal });
  if (!response.ok) throw new Error(`Weather forecast request failed (${response.status}).`);
  const payload: OpenMeteoResponse = await response.json();
  const daily = payload.daily;
  const dates = daily?.time;
  const codes = daily?.weather_code;
  const highs = daily?.temperature_2m_max;
  const lows = daily?.temperature_2m_min;
  const precipitation = daily?.precipitation_probability_max;
  if (
    !Array.isArray(dates) ||
    !dates.every((date) => typeof date === "string") ||
    !isNumberArray(codes) ||
    !isNumberArray(highs) ||
    !isNumberArray(lows) ||
    !isNumberArray(precipitation) ||
    dates.length !== codes.length ||
    dates.length !== highs.length ||
    dates.length !== lows.length ||
    dates.length !== precipitation.length
  ) {
    throw new Error("The weather service returned an incomplete forecast.");
  }
  return dates.map((date, index) => ({
    date,
    weatherCode: codes[index],
    temperatureMax: highs[index],
    temperatureMin: lows[index],
    precipitationProbability: precipitation[index],
    apparentTemperatureMax: optionalNumberAt(daily?.apparent_temperature_max, index),
    apparentTemperatureMin: optionalNumberAt(daily?.apparent_temperature_min, index),
    windSpeedMax: optionalNumberAt(daily?.wind_speed_10m_max, index),
    uvIndexMax: optionalNumberAt(daily?.uv_index_max, index),
    sunshineHours: optionalNumberAt(daily?.sunshine_duration, index, 3600),
    daylightHours: optionalNumberAt(daily?.daylight_duration, index, 3600),
  }));
}

export type ActivityWeatherAdvice = {
  score: number;
  label: "great" | "good" | "mixed" | "indoor";
  reasons: string[];
};

export function activityWeatherLabel(advice: ActivityWeatherAdvice, language: "en" | "pt") {
  if (language === "en") {
    return {
      great: "Great fit for this activity",
      good: "Weather looks comfortable",
      mixed: "Check the conditions for this activity",
      indoor: "This activity is indoors",
    }[advice.label];
  }
  return {
    great: "Ótimo para esta atividade",
    good: "Tempo confortável para esta atividade",
    mixed: "Atenção às condições para esta atividade",
    indoor: "Esta atividade é em espaço interior",
  }[advice.label];
}

export function activityWeatherReason(reason: string, language: "en" | "pt") {
  if (language === "en") return reason;
  const translations: Record<string, string> = {
    "This activity is indoors, so the forecast matters less.": "Esta atividade é em espaço interior; a previsão tem menos impacto.",
    "Rain is likely; consider a sheltered option.": "É provável que chova; considerem uma opção abrigada.",
    "There may be showers.": "Pode haver aguaceiros.",
    "Little chance of rain.": "Pouca probabilidade de chuva.",
    "Warm conditions suit a beach or swimming date.": "O tempo quente é adequado para praia ou natação.",
    "It may be too cool for a beach date.": "Pode estar fresco demais para um date de praia.",
    "Comfortable temperatures for a picnic.": "Temperatura confortável para um piquenique.",
    "It may feel too cold to sit outside.": "Pode estar frio demais para estar sentado ao ar livre.",
    "Heat may make a picnic uncomfortable.": "O calor pode tornar o piquenique desconfortável.",
    "Consider shade during the warmer hours.": "Considerem ficar à sombra nas horas mais quentes.",
    "Comfortable temperatures for a walk.": "Temperatura confortável para uma caminhada.",
    "Cold conditions may make the trail harder.": "O frio pode tornar o trilho mais exigente.",
    "Heat may make a long walk uncomfortable.": "O calor pode tornar uma caminhada longa desconfortável.",
    "Dress warmly for the low feels-like temperature.": "A sensação térmica é baixa; vistam roupa quente.",
    "Plan shade and water for the heat.": "Planeiem sombra e água para lidar com o calor.",
    "Comfortable temperatures for being outside.": "Temperatura confortável para estar ao ar livre.",
    "Strong wind may make this less comfortable.": "O vento forte pode tornar a atividade menos confortável.",
    "Wind may affect a picnic or photography.": "O vento pode afetar o piquenique ou as fotografias.",
    "UV is high; plan shade and sun protection.": "O índice UV está alto; planeiem sombra e proteção solar.",
    "Cloud cover can give softer light for photos.": "As nuvens podem dar uma luz mais suave para fotografias.",
    "Limited daylight may not suit a long hike.": "Há poucas horas de luz para uma caminhada longa.",
  };
  return translations[reason] ?? reason;
}

function normalizedIdeaText(idea: DateIdea) {
  return `${idea.title} ${idea.description} ${idea.category}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en-GB");
}

export function activityWeatherAdvice(idea: DateIdea, day: DailyWeather | undefined): ActivityWeatherAdvice {
  if (!day) return { score: 50, label: "mixed", reasons: [] };

  const text = normalizedIdeaText(idea);
  const indoors = idea.at_home || idea.weather_setting === "indoor" ||
    ["museum", "gallery", "cinema", "theatre", "theater", "restaurant", "cafe", "coffee", "cooking", "pottery", "workshop", "escape room", "bowling", "aquarium", "exhibition", "museu", "galeria", "cinema", "teatro", "restaurante", "cafe", "cozinhar", "ceramica", "oficina", "exposicao"].some((keyword) => text.includes(keyword));
  if (indoors) return {
    score: 82,
    label: "indoor",
    reasons: ["This activity is indoors, so the forecast matters less."],
  };

  const beach = ["beach", "praia", "swim", "swimming", "surf", "seaside", "lago", "pool", "piscina"].some((keyword) => text.includes(keyword));
  const picnic = ["picnic", "piquenique", "park", "parque", "garden", "jardim"].some((keyword) => text.includes(keyword));
  const hike = ["hike", "hiking", "trail", "trek", "walk", "walking", "caminhada", "trilho", "montanha", "mountain"].some((keyword) => text.includes(keyword));
  const photography = ["photo", "photography", "fotografia", "fotograf", "sunset", "sunrise", "por do sol", "nascer do sol"].some((keyword) => text.includes(keyword));
  const outdoors = idea.weather_setting === "outdoor" || beach || picnic || hike || photography ||
    ["outdoor", "outside", "nature", "natureza", "cycling", "bike", "bicycle", "cycling", "passeio", "ciclismo", "passear", "open air", "ar livre"].some((keyword) => text.includes(keyword));
  if (!outdoors) return { score: 65, label: "good", reasons: [] };

  let score = 78;
  const reasons: string[] = [];
  const rainCodes = [51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];
  const rainy = rainCodes.includes(day.weatherCode);
  if (day.precipitationProbability >= 70 || [65, 67, 82, 95, 96, 99].includes(day.weatherCode)) {
    score -= beach || picnic || photography ? 28 : 38;
    reasons.push("Rain is likely; consider a sheltered option.");
  } else if (day.precipitationProbability >= 40 || rainy) {
    score -= beach || picnic || photography ? 15 : 22;
    reasons.push("There may be showers.");
  } else if (day.precipitationProbability <= 15 && !rainy) {
    score += 7;
    reasons.push("Little chance of rain.");
  }

  const feelsLow = day.apparentTemperatureMin ?? day.temperatureMin;
  const feelsHigh = day.apparentTemperatureMax ?? day.temperatureMax;
  const feelsMid = (feelsLow + feelsHigh) / 2;
  if (beach) {
    if (feelsHigh >= 24 && day.precipitationProbability < 40) {
      score += 16;
      reasons.push("Warm conditions suit a beach or swimming date.");
    } else if (feelsHigh < 19) {
      score -= 24;
      reasons.push("It may be too cool for a beach date.");
    }
  } else if (picnic) {
    if (feelsMid >= 16 && feelsMid <= 27) {
      score += 12;
      reasons.push("Comfortable temperatures for a picnic.");
    } else if (feelsMid < 10 || feelsMid > 32) {
      score -= 20;
      reasons.push(feelsMid < 10 ? "It may feel too cold to sit outside." : "Heat may make a picnic uncomfortable.");
    } else if (feelsMid > 27) {
      score -= 8;
      reasons.push("Consider shade during the warmer hours.");
    }
  } else if (hike) {
    if (feelsMid >= 8 && feelsMid <= 24) {
      score += 9;
      reasons.push("Comfortable temperatures for a walk.");
    } else if (feelsMid < 2 || feelsMid > 32) {
      score -= 18;
      reasons.push(feelsMid < 2 ? "Cold conditions may make the trail harder." : "Heat may make a long walk uncomfortable.");
    }
  } else if (feelsMid < 2 || feelsMid > 34) {
    score -= 18;
    reasons.push(feelsMid < 2 ? "Dress warmly for the low feels-like temperature." : "Plan shade and water for the heat.");
  } else if (feelsMid >= 12 && feelsMid <= 27) {
    score += 8;
    reasons.push("Comfortable temperatures for being outside.");
  }

  if (day.windSpeedMax !== null && day.windSpeedMax >= 40) {
    score -= beach ? 8 : 16;
    reasons.push("Strong wind may make this less comfortable.");
  } else if (day.windSpeedMax !== null && day.windSpeedMax >= 25 && (picnic || photography)) {
    score -= 8;
    reasons.push("Wind may affect a picnic or photography.");
  }

  if (day.uvIndexMax !== null && day.uvIndexMax >= 8) {
    score -= beach || hike ? 8 : 4;
    reasons.push("UV is high; plan shade and sun protection.");
  }

  if (photography && day.weatherCode === 3 && day.precipitationProbability < 40) {
    score += 9;
    reasons.push("Cloud cover can give softer light for photos.");
  }
  if (hike && day.daylightHours !== null && day.daylightHours < 8 && (idea.duration_minutes ?? 0) >= 180) {
    score -= 12;
    reasons.push("Limited daylight may not suit a long hike.");
  }

  const boundedScore = Math.max(5, Math.min(100, score));
  return {
    score: boundedScore,
    label: boundedScore >= 82 ? "great" : boundedScore >= 65 ? "good" : "mixed",
    reasons: reasons.slice(0, 2),
  };
}

export function weatherConditionFor(day: DailyWeather | undefined): WeatherCondition {
  if (!day) return "unknown";
  if (day.precipitationProbability >= 50 || [51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(day.weatherCode)) return "rain";
  if (day.temperatureMin <= 0 || [71, 73, 75, 77, 85, 86].includes(day.weatherCode)) return "cold";
  if (day.temperatureMax >= 35) return "hot";
  return "clear";
}

export function weatherLabel(day: DailyWeather, language: "en" | "pt") {
  if ([51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(day.weatherCode) || day.precipitationProbability >= 50) {
    return language === "pt" ? "Possibilidade de chuva" : "Rain is possible";
  }
  if ([71, 73, 75, 77, 85, 86].includes(day.weatherCode)) return language === "pt" ? "Possibilidade de neve" : "Snow is possible";
  if (day.weatherCode === 0) return language === "pt" ? "Céu limpo" : "Clear skies";
  if ([1, 2].includes(day.weatherCode)) return language === "pt" ? "Poucas nuvens" : "Partly cloudy";
  if (day.weatherCode === 3) return language === "pt" ? "Nublado" : "Cloudy";
  if (day.temperatureMin <= 0) return language === "pt" ? "Frio" : "Cold";
  if (day.temperatureMax >= 35) return language === "pt" ? "Muito quente" : "Very hot";
  return language === "pt" ? "Tempo ameno" : "Mild weather";
}

export function weatherEmoji(weatherCode: number) {
  if ([51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(weatherCode)) return "🌧️";
  if (weatherCode === 0) return "☀️";
  if ([1, 2].includes(weatherCode)) return "🌤️";
  if (weatherCode === 3) return "☁️";
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return "❄️";
  return "🌥️";
}
