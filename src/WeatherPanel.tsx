import { useEffect, useState } from "react";
import { LocationSearch } from "./CalendarMap";
import type { GeocodedPlace } from "./types";
import { fetchDailyWeather, weatherConditionFor, weatherEmoji, weatherLabel } from "./weather";
import type { DailyWeather, WeatherCondition } from "./weather";

type Language = "en" | "pt";
type SavedWeatherLocation = {
  name: string | null;
  latitude: number | null;
  longitude: number | null;
};

export function WeatherPanel({
  language,
  location,
  onSaveLocation,
  onConditionChange,
  onForecastChange,
}: {
  language: Language;
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
        setError(caught instanceof Error ? caught.message : language === "pt" ? "Não foi possível obter a previsão meteorológica." : "Couldn't load the weather forecast.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [language, location.latitude, location.longitude, onConditionChange, onForecastChange]);

  async function savePlace(place: GeocodedPlace) {
    setError("");
    try {
      const saved = await onSaveLocation(place.displayName, place.latitude, place.longitude);
      if (saved) {
        setQuery(place.displayName);
        setShowLocationEditor(false);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : language === "pt" ? "Não foi possível guardar esta localização." : "Couldn't save this location.");
    }
  }

  function useCurrentLocation() {
    window.localStorage.setItem("nossia-weather-location-prompt", "dismissed");
    setShowLocationPrompt(false);
    if (!navigator.geolocation) {
      setShowLocationEditor(true);
      setError(language === "pt" ? "Este navegador não disponibiliza geolocalização. Pesquise uma cidade." : "This browser doesn't support location access. Search for a city instead.");
      return;
    }
    setGpsLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void savePlace({
          displayName: language === "pt" ? "Localização atual" : "Current location",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }).finally(() => setGpsLoading(false));
      },
      (positionError) => {
        setGpsLoading(false);
        setShowLocationEditor(true);
        setError(positionError.code === positionError.PERMISSION_DENIED
          ? language === "pt" ? "A permissão de localização foi recusada. Pode pesquisar uma cidade manualmente." : "Location permission was denied. You can search for a city instead."
          : language === "pt" ? "Não foi possível obter a localização. Pesquise uma cidade manualmente." : "Couldn't get your location. Search for a city instead.");
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
    <section className="weather-panel" aria-label={language === "pt" ? "Meteorologia e localização" : "Weather and location"}>
      <div className="weather-panel-heading">
        <div><span className="section-kicker">{language === "pt" ? "A IDEIA CERTA, AO AR LIVRE OU NÃO" : "A LITTLE WEATHER CHECK"}</span><h2>{language === "pt" ? "O tempo para os vossos dates" : "Weather for your dates"}</h2></div>
        {location.name && <button className="weather-edit-button" type="button" onClick={() => setShowLocationEditor((visible) => !visible)}>{showLocationEditor ? language === "pt" ? "Fechar" : "Done" : language === "pt" ? "Alterar local" : "Change location"}</button>}
      </div>
      {showLocationPrompt && <div className="weather-location-prompt">
        <p>{language === "pt" ? "Querem partilhar a localização deste dispositivo para ver o tempo local e receber sugestões de dates mais adequadas? A localização escolhida fica guardada no perfil partilhado do casal." : "Would you like to share this device's location to see local weather and get better-matched date ideas? The selected location is saved to the couple's shared profile."}</p>
        <div>
          <button className="weather-share-button" type="button" onClick={useCurrentLocation} disabled={gpsLoading}>{gpsLoading ? language === "pt" ? "A obter localização…" : "Getting location…" : language === "pt" ? "Partilhar localização" : "Share my location"}</button>
          <button className="weather-edit-button" type="button" onClick={dismissLocationPrompt}>{language === "pt" ? "Agora não" : "Not now"}</button>
        </div>
      </div>}
      {showLocationEditor ? <div className="weather-location-editor">
        <p>{language === "pt" ? "Escolham uma cidade ou usem o GPS. A localização só é guardada se a escolherem." : "Search for a city or use GPS. Your location is only saved when you choose it."}</p>
        <LocationSearch
          language={language}
          value={query}
          onChange={setQuery}
          onSelect={(place) => void savePlace(place)}
        />
        <button className="weather-gps-button" type="button" onClick={useCurrentLocation} disabled={gpsLoading}>{gpsLoading ? language === "pt" ? "A obter localização…" : "Getting location…" : language === "pt" ? "◎ Usar a minha localização" : "◎ Use my location"}</button>
      </div> : location.name ? <div className="weather-summary"><span>⌖ {location.name}</span>{loading && <small>{language === "pt" ? "A carregar previsão…" : "Loading forecast…"}</small>}</div> : null}
      {!location.name && !showLocationPrompt && !showLocationEditor && <button className="weather-edit-button weather-set-location" type="button" onClick={() => setShowLocationEditor(true)}>{language === "pt" ? "Escolher localização" : "Set a location"}</button>}
      {error && <p className="weather-error" role="status">{error}</p>}
      {today && <>
        <div className="weather-today"><span className="weather-symbol">{weatherEmoji(today.weatherCode)}</span><div><strong>{weatherLabel(today, language)}</strong><span>{Math.round(today.temperatureMin)}° / {Math.round(today.temperatureMax)}° · {language === "pt" ? `Chuva ${today.precipitationProbability}%` : `${today.precipitationProbability}% rain chance`}</span></div><span className={`weather-condition condition-${condition}`}>{language === "pt" ? "Adequação avaliada por atividade" : "Activity-specific advice"}</span></div>
        <p className="weather-context-note">{language === "pt" ? "Um dia sem chuva não é automaticamente um bom dia para todas as atividades. A app considera os fatores relevantes para cada ideia." : "A dry day isn't automatically right for every activity. Suggestions consider the factors that matter for each idea."}</p>
        <div className="weather-factors" aria-label={language === "pt" ? "Fatores da previsão" : "Forecast factors"}>
          <span>{language === "pt" ? "Sensação" : "Feels like"} <strong>{today.apparentTemperatureMin !== null && today.apparentTemperatureMax !== null ? `${Math.round(today.apparentTemperatureMin)}°–${Math.round(today.apparentTemperatureMax)}°` : `${Math.round(today.temperatureMin)}°–${Math.round(today.temperatureMax)}°`}</strong></span>
          <span>{language === "pt" ? "Vento" : "Wind"} <strong>{today.windSpeedMax === null ? "—" : `${Math.round(today.windSpeedMax)} km/h`}</strong></span>
          <span>UV <strong>{today.uvIndexMax === null ? "—" : today.uvIndexMax.toFixed(1)}</strong></span>
          <span>{language === "pt" ? "Luz do dia" : "Daylight"} <strong>{today.daylightHours === null ? "—" : `${Math.round(today.daylightHours)}h`}</strong></span>
          {today.sunshineHours !== null && <span>{language === "pt" ? "Sol" : "Sunshine"} <strong>{today.sunshineHours.toFixed(1)}h</strong></span>}
        </div>
      </>}
      {forecast.length > 1 && <div className="weather-week">{forecast.slice(1, 5).map((day) => <div className="weather-day" key={day.date}><span>{new Intl.DateTimeFormat(language === "pt" ? "pt-PT" : "en-GB", { weekday: "short" }).format(new Date(`${day.date}T12:00:00`))}</span><span>{weatherEmoji(day.weatherCode)}</span><strong>{Math.round(day.temperatureMax)}°</strong><small>{day.precipitationProbability}% ☂</small></div>)}</div>}
      <p className="weather-attribution">{language === "pt" ? "Previsão fornecida por Open-Meteo. Se não estiver disponível, as sugestões continuam sem filtro meteorológico." : "Forecast by Open-Meteo. Suggestions continue without weather filtering when the forecast is unavailable."}</p>
    </section>
  );
}
