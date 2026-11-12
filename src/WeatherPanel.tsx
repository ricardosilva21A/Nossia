import { useEffect, useState } from "react";
import { LocationSearch } from "./CalendarMap";
import type { GeocodedPlace } from "./types";
import { fetchDailyWeather, weatherConditionFor, weatherEmoji, weatherLabel } from "./weather";
import type { DailyWeather, WeatherCondition } from "./weather";
type SavedWeatherLocation = {
  name: string | null;
  latitude: number | null;
  longitude: number | null;
};

export function WeatherPanel({
  location,
  onSaveLocation,
  onConditionChange,
  onForecastChange,
  locationOnly = false,
}: {
  // In the settings only the place is chosen; the forecast itself lives in the house window.
  locationOnly?: boolean;
  location: SavedWeatherLocation;
  onSaveLocation: (name: string, latitude: number, longitude: number) => Promise<boolean>;
  onConditionChange: (condition: WeatherCondition) => void;
  onForecastChange: (forecast: DailyWeather[]) => void;
}) {
  const [forecast, setForecast] = useState<DailyWeather[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(() =>
    !location.name && window.localStorage.getItem("nossia-weather-location-prompt") !== "dismissed"
  );
  const [showLocationEditor, setShowLocationEditor] = useState(false);

  useEffect(() => {
    if (typeof location.latitude !== "number" || typeof location.longitude !== "number") {
      setForecast([]);
      onForecastChange([]);
      onConditionChange("unknown");
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void fetchDailyWeather(location.latitude, location.longitude, controller.signal)
      .then((days) => {
        setForecast(days);
        onForecastChange(days);
        onConditionChange(weatherConditionFor(days[0]));
      })
      .catch((caught: unknown) => {
        if (caught instanceof Error && caught.name === "AbortError") return;
        setForecast([]);
        onForecastChange([]);
        onConditionChange("unknown");
        setError(caught instanceof Error ? caught.message : "Não foi possível obter a previsão meteorológica.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [location.latitude, location.longitude, onConditionChange, onForecastChange]);

  async function savePlace(place: GeocodedPlace) {
    setError("");
    try {
      const saved = await onSaveLocation(place.displayName, place.latitude, place.longitude);
      if (saved) {
        setQuery(place.displayName);
        setShowLocationEditor(false);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível guardar esta localização.");
    }
  }

  function useCurrentLocation() {
    window.localStorage.setItem("nossia-weather-location-prompt", "dismissed");
    setShowLocationPrompt(false);
    if (!navigator.geolocation) {
      setShowLocationEditor(true);
      setError("Este navegador não disponibiliza geolocalização. Pesquise uma cidade.");
      return;
    }
    setGpsLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void savePlace({
          displayName: "Localização atual",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }).finally(() => setGpsLoading(false));
      },
      (positionError) => {
        setGpsLoading(false);
        setShowLocationEditor(true);
        setError(positionError.code === positionError.PERMISSION_DENIED
          ? "A permissão de localização foi recusada. Pode pesquisar uma cidade manualmente."
          : "Não foi possível obter a localização. Pesquise uma cidade manualmente.");
      },
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 },
    );
  }

  function dismissLocationPrompt() {
    window.localStorage.setItem("nossia-weather-location-prompt", "dismissed");
    setShowLocationPrompt(false);
  }

  const today = forecast[0];
  const condition = weatherConditionFor(today);

  return (
    <section className="weather-panel" aria-label={"Meteorologia e localização"}>
      <div className="weather-panel-heading">
        <div><span className="section-kicker">{locationOnly ? "TEMPO" : "A IDEIA CERTA, AO AR LIVRE OU NÃO"}</span><h2>{locationOnly ? "Onde vivem" : "O tempo para os vossos dates"}</h2></div>
        {location.name && <button className="weather-edit-button" type="button" onClick={() => setShowLocationEditor((visible) => !visible)}>{showLocationEditor ? "Fechar" : "Alterar local"}</button>}
      </div>
      {showLocationPrompt && <div className="weather-location-prompt">
        <p>{"Querem partilhar a localização deste dispositivo para ver o tempo local e receber sugestões de dates mais adequadas? A localização escolhida fica guardada no perfil partilhado do casal."}</p>
        <div>
          <button className="weather-share-button" type="button" onClick={useCurrentLocation} disabled={gpsLoading}>{gpsLoading ? "A obter localização…" : "Partilhar localização"}</button>
          <button className="weather-edit-button" type="button" onClick={dismissLocationPrompt}>{"Agora não"}</button>
        </div>
      </div>}
      {showLocationEditor ? <div className="weather-location-editor">
        <p>{"Escolham uma cidade ou usem o GPS. A localização só é guardada se a escolherem."}</p>
        <LocationSearch
          value={query}
          onChange={setQuery}
          onSelect={(place) => void savePlace(place)}
        />
        <button className="weather-gps-button" type="button" onClick={useCurrentLocation} disabled={gpsLoading}>{gpsLoading ? "A obter localização…" : "◎ Usar a minha localização"}</button>
      </div> : location.name ? <div className="weather-summary"><span>⌖ {location.name}</span>{loading && <small>{"A carregar previsão…"}</small>}</div> : null}
      {!location.name && !showLocationPrompt && !showLocationEditor && <button className="weather-edit-button weather-set-location" type="button" onClick={() => setShowLocationEditor(true)}>{"Escolher localização"}</button>}
      {error && <p className="weather-error" role="status">{error}</p>}
      {today && !locationOnly && <>
        <div className="weather-today"><span className="weather-symbol">{weatherEmoji(today.weatherCode)}</span><div><strong>{weatherLabel(today)}</strong><span>{Math.round(today.temperatureMin)}° / {Math.round(today.temperatureMax)}° · {`Chuva ${today.precipitationProbability}%`}</span></div><span className={`weather-condition condition-${condition}`}>{"Adequação avaliada por atividade"}</span></div>
        <p className="weather-context-note">{"Um dia sem chuva não é automaticamente um bom dia para todas as atividades. A app considera os fatores relevantes para cada ideia."}</p>
        <div className="weather-factors" aria-label={"Fatores da previsão"}>
          <span>{"Sensação"} <strong>{today.apparentTemperatureMin !== null && today.apparentTemperatureMax !== null ? `${Math.round(today.apparentTemperatureMin)}°–${Math.round(today.apparentTemperatureMax)}°` : `${Math.round(today.temperatureMin)}°–${Math.round(today.temperatureMax)}°`}</strong></span>
          <span>{"Vento"} <strong>{today.windSpeedMax === null ? "—" : `${Math.round(today.windSpeedMax)} km/h`}</strong></span>
          <span>UV <strong>{today.uvIndexMax === null ? "—" : today.uvIndexMax.toFixed(1)}</strong></span>
          <span>{"Luz do dia"} <strong>{today.daylightHours === null ? "—" : `${Math.round(today.daylightHours)}h`}</strong></span>
          {today.sunshineHours !== null && <span>{"Sol"} <strong>{today.sunshineHours.toFixed(1)}h</strong></span>}
        </div>
      </>}
      {forecast.length > 1 && !locationOnly && <div className="weather-week">{forecast.slice(1, 5).map((day) => <div className="weather-day" key={day.date}><span>{new Intl.DateTimeFormat("pt-PT", { weekday: "short" }).format(new Date(`${day.date}T12:00:00`))}</span><span>{weatherEmoji(day.weatherCode)}</span><strong>{Math.round(day.temperatureMax)}°</strong><small>{day.precipitationProbability}% ☂</small></div>)}</div>}
      <p className="weather-attribution">{"Previsão fornecida por Open-Meteo. Se não estiver disponível, as sugestões continuam sem filtro meteorológico."}</p>
    </section>
  );
}
