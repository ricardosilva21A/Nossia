import type { Category } from "./types";

export type LocalEvent = {
  id: string;
  title: string;
  description: string;
  starts_on: string;
  ends_on: string;
  start_time: string | null;
  venue: string;
  municipality: string;
  latitude: number | null;
  longitude: number | null;
  category: Category;
  price_for_two: number | null;
  indoor: boolean;
  url: string | null;
  image_url: string | null;
  tags: string[];
  featured: boolean;
  reach: "local" | "regional" | "national";
  status: "pending" | "approved" | "rejected";
};

export type Origin = { municipality: string | null; latitude: number; longitude: number };

export const nearbyKm = 60;
export const regionalKm = 150;
// Beyond this, a day out becomes a trip with a night away.
export const tripKm = 150;

export function distanceKm(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(to.latitude - from.latitude);
  const dLon = radians(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const plainName = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

// Events that haven't ended, in the couple's municipality or close enough, soonest first.
export function eventsNear(events: LocalEvent[], origin: Origin | null, today: string) {
  return events
    .filter((event) => event.status === "approved" && event.ends_on >= today)
    .map((event) => ({
      event,
      km: origin && event.latitude !== null && event.longitude !== null ? distanceKm(origin, { latitude: event.latitude, longitude: event.longitude }) : null,
      sameMunicipality: Boolean(origin?.municipality && event.municipality && plainName(origin.municipality) === plainName(event.municipality)),
    }))
    .filter(({ km, sameMunicipality }) => !origin || sameMunicipality || (km !== null && km <= nearbyKm))
    .sort((first, second) => first.event.starts_on.localeCompare(second.event.starts_on) || (first.event.start_time ?? "").localeCompare(second.event.start_time ?? ""));
}

export type FarEvent = { event: LocalEvent; km: number | null; driveMinutes: number | null; freeDay: string | null };

// Big events further away, only when they fit a day both are free. Days beyond what the
// schedule covers count as possible.
export function eventsWorthTheTrip(events: LocalEvent[], origin: Origin | null, today: string, freeDays: Set<string>, horizonEnd: string): FarEvent[] {
  return events
    .filter((event) => event.status === "approved" && event.ends_on >= today && event.reach !== "local")
    .map((event) => {
      const km = origin && event.latitude !== null && event.longitude !== null ? distanceKm(origin, { latitude: event.latitude, longitude: event.longitude }) : null;
      return { event, km, driveMinutes: km === null ? null : driveMinutes(km), freeDay: firstFreeDay(event, today, freeDays, horizonEnd) };
    })
    .filter(({ event, km, freeDay }) => freeDay !== null && km !== null && km > nearbyKm && (event.reach === "national" || km <= regionalKm))
    .sort((first, second) => first.event.starts_on.localeCompare(second.event.starts_on));
}

// Roads are about a fifth longer than the crow flies, mostly motorway at around 95 km/h on average.
export function driveMinutes(km: number) {
  return Math.round((km * 1.2) / 95 * 60 / 15) * 15;
}

export function driveLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `≈${rest} min de carro`;
  return `≈${hours}h${rest ? String(rest).padStart(2, "0") : ""} de carro`;
}

function addDay(key: string) {
  const day = new Date(`${key}T12:00:00`);
  day.setDate(day.getDate() + 1);
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
}

export function firstFreeDay(event: Pick<LocalEvent, "starts_on" | "ends_on">, today: string, freeDays: Set<string>, horizonEnd: string) {
  for (let day = firstAvailableDay(event, today); day <= event.ends_on; day = addDay(day)) {
    if (day > horizonEnd || freeDays.has(day)) return day;
  }
  return null;
}

// The first day the couple can still go.
export function firstAvailableDay(event: Pick<LocalEvent, "starts_on" | "ends_on">, today: string) {
  return event.starts_on >= today ? event.starts_on : today;
}

export function priceLabel(price: number | null) {
  if (price === null) return "Preço por confirmar";
  return price === 0 ? "Grátis" : `${price.toLocaleString("pt-PT", { maximumFractionDigits: 2 })} € para dois`;
}
