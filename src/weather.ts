export type WeatherCondition = "unknown" | "rain" | "cold" | "hot" | "clear";

export type DailyWeather = {
  date: string;
  weatherCode: number;
  temperatureMax: number;
  temperatureMin: number;
  precipitationProbability: number;
};

type OpenMeteoResponse = {
  daily?: {
    time?: unknown;
    weather_code?: unknown;
    temperature_2m_max?: unknown;
    temperature_2m_min?: unknown;
    precipitation_probability_max?: unknown;
  };
};

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number" && Number.isFinite(item));
}

export async function fetchDailyWeather(latitude: number, longitude: number, signal?: AbortSignal): Promise<DailyWeather[]> {
  const query = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    forecast_days: "7",
    timezone: "auto",
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
  }));
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
