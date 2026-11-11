import { useState } from "react";
import { WorldMapArt } from "./WorldMapArt";
import type { TripPin } from "./house";

const shortDate = new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" });
const when = (pin: TripPin) => shortDate.format(new Date(`${pin.start_date}T12:00:00`));

// The map on the wall, up close: a pin for every trip, and the way to plan the next one.
export function WallMap({ pins, onPlanTrip, onOpenWorldMap }: { pins: TripPin[]; onPlanTrip: () => void; onOpenWorldMap: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const past = pins.filter((pin) => pin.past);
  const coming = pins.filter((pin) => !pin.past);
  const pick = (id: string) => setSelected((current) => (current === id ? null : id));
  const row = (pin: TripPin) => (
    <li key={pin.id}>
      <button type="button" className={`wall-trip ${selected === pin.id ? "selected" : ""}`} aria-pressed={selected === pin.id} onClick={() => pick(pin.id)}>
        <i className={pin.past ? "is-past" : "is-next"} aria-hidden="true" /><strong>{pin.title}</strong><small>{when(pin)}{pin.x === null ? " · sem sítio no mapa" : ""}</small>
      </button>
    </li>
  );
  return (
    <div className="wall-map">
      <div className="wall-map-frame"><WorldMapArt pins={pins} pinScale={2.4} selected={selected} onPick={pick} /></div>
      <p className="wall-map-count">{past.length === 0 ? "Ainda sem pins: a primeira viagem fica aqui marcada." : past.length === 1 ? "1 sítio onde já estiveram juntos." : `${past.length} sítios onde já estiveram juntos.`}</p>
      {past.length > 0 && <><p className="form-label">Onde já foram</p><ul className="wall-trips">{[...past].reverse().map(row)}</ul></>}
      {coming.length > 0 && <><p className="form-label">Próximas</p><ul className="wall-trips">{coming.map(row)}</ul></>}
      <div className="panel-actions wall-actions">
        <button type="button" className="button button-ghost" onClick={onOpenWorldMap}>Ver mapa das viagens</button>
        <button type="button" className="button button-primary" onClick={onPlanTrip}>Marcar viagem</button>
      </div>
    </div>
  );
}
