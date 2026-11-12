import { useEffect, useMemo } from "react";
import { divIcon, latLngBounds } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// The one map of the couple: trips as photo pins, dates as hearts, on the same tiles.

export type TripPin = { id: string; title: string; latitude: number; longitude: number; coverUrl: string | null; emoji: string };
export type DatePin = { id: string; title: string; latitude: number; longitude: number; when: string; place: string | null };

function tripIcon(pin: TripPin) {
  const element = document.createElement("span");
  element.className = "trip-pin";
  if (pin.coverUrl) {
    const image = document.createElement("img");
    image.src = pin.coverUrl;
    image.alt = "";
    element.append(image);
  } else {
    element.textContent = pin.emoji;
  }
  return divIcon({ className: "trip-pin-holder", html: element, iconSize: [58, 58], iconAnchor: [29, 58] });
}

const heart = divIcon({ className: "map-heart-marker", html: "<span>♥</span>", iconSize: [32, 32], iconAnchor: [16, 16] });

// Frame whatever is shown: one place up close, several all at once, nothing as the whole world.
function FitTo({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  const key = points.map((point) => point.join(",")).join(";");
  useEffect(() => {
    if (points.length === 0) map.setView([28, 12], window.innerWidth < 600 ? 1 : 2);
    else if (points.length === 1) map.setView(points[0], 11);
    else map.fitBounds(latLngBounds(points), { padding: [40, 40], maxZoom: 11 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

export function TripWorldMap({ pins, datePins = [], onOpen }: { pins: TripPin[]; datePins?: DatePin[]; onOpen: (id: string) => void }) {
  const icons = useMemo(() => new Map(pins.map((pin) => [pin.id, tripIcon(pin)])), [pins]);
  const points = [...pins, ...datePins].map((pin) => [pin.latitude, pin.longitude] as [number, number]);
  return (
    <MapContainer className="trip-world-map" center={[28, 12]} zoom={window.innerWidth < 600 ? 1 : 2} minZoom={1} maxZoom={16} worldCopyJump scrollWheelZoom={false}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitTo points={points} />
      {pins.map((pin) => <Marker key={`trip-${pin.id}`} position={[pin.latitude, pin.longitude]} icon={icons.get(pin.id)} title={pin.title} alt={pin.title} eventHandlers={{ click: () => onOpen(pin.id) }} />)}
      {datePins.map((pin) => <Marker key={`date-${pin.id}`} position={[pin.latitude, pin.longitude]} icon={heart} title={pin.title} alt={pin.title}>
        <Popup><strong>{pin.title}</strong>{pin.place && <><br />{pin.place}</>}<br />{pin.when}</Popup>
      </Marker>)}
    </MapContainer>
  );
}
