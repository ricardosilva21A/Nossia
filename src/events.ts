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
  status: "pending" | "approved" | "rejected";
};

export type Origin = { municipality: string | null; latitude: number; longitude: number };

export const nearbyKm = 60;

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

// The first day the couple can still go.
export function firstAvailableDay(event: Pick<LocalEvent, "starts_on" | "ends_on">, today: string) {
  return event.starts_on >= today ? event.starts_on : today;
}

export function priceLabel(price: number | null) {
  if (price === null) return "Preço por confirmar";
  return price === 0 ? "Grátis" : `${price.toLocaleString("pt-PT", { maximumFractionDigits: 2 })} € para dois`;
}
