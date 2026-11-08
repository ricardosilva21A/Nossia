import { useMemo } from "react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type TripPin = { id: string; title: string; latitude: number; longitude: number; coverUrl: string | null; emoji: string };

function pinIcon(pin: TripPin) {
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

export function TripWorldMap({ pins, onOpen }: { pins: TripPin[]; onOpen: (id: string) => void }) {
  const icons = useMemo(() => new Map(pins.map((pin) => [pin.id, pinIcon(pin)])), [pins]);
  const zoom = window.innerWidth < 600 ? 1 : 2;
  return (
    <MapContainer className="trip-world-map" center={[28, 12]} zoom={zoom} minZoom={1} maxZoom={12} worldCopyJump scrollWheelZoom>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {pins.map((pin) => <Marker key={pin.id} position={[pin.latitude, pin.longitude]} icon={icons.get(pin.id)} title={pin.title} alt={pin.title} eventHandlers={{ click: () => onOpen(pin.id) }} />)}
    </MapContainer>
  );
}
