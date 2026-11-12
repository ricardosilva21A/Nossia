import { weatherEmoji, weatherLabel } from "./weather";
import type { DailyWeather } from "./weather";

const dayName = new Intl.DateTimeFormat("pt-PT", { weekday: "long" });
const shortDate = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short" });

// Looking out of the window: today big, then the next days in a row each.
export function WallWeather({ forecast, place, onChangePlace }: { forecast: DailyWeather[]; place: string | null; onChangePlace: () => void }) {
  const [today, ...next] = forecast;
  const label = (date: string, index: number) => {
    if (index === 0) return "Amanhã";
    const name = dayName.format(new Date(`${date}T12:00:00`));
    return name.charAt(0).toUpperCase() + name.slice(1);
  };
  return (
    <div className="wall-weather">
      {today && <div className="weather-today">
        <span className="weather-today-emoji" aria-hidden="true">{weatherEmoji(today.weatherCode)}</span>
        <div>
          <p className="panel-label">Hoje{place ? ` · ${place}` : ""}</p>
          <strong>{Math.round(today.temperatureMax)}° <small>/ {Math.round(today.temperatureMin)}°</small></strong>
          <p className="panel-copy">{weatherLabel(today)}{today.precipitationProbability >= 20 ? ` · ${today.precipitationProbability}% de chuva` : ""}</p>
        </div>
      </div>}
      <ul className="weather-days">
        {next.slice(0, 6).map((day, index) => (
          <li key={day.date}>
            <span className="weather-day-name">{label(day.date, index)}<small>{shortDate.format(new Date(`${day.date}T12:00:00`)).replace(".", "")}</small></span>
            <span aria-hidden="true">{weatherEmoji(day.weatherCode)}</span>
            <span className="weather-day-rain">{day.precipitationProbability >= 20 ? `${day.precipitationProbability}%` : ""}</span>
            <span className="weather-day-temp"><strong>{Math.round(day.temperatureMax)}°</strong> {Math.round(day.temperatureMin)}°</span>
          </li>
        ))}
      </ul>
      <div className="panel-actions wall-actions"><button type="button" className="button button-ghost" onClick={onChangePlace}>Mudar localização</button></div>
    </div>
  );
}
