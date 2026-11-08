// Restaurants, cafés and bars from OpenStreetMap through Nominatim, which is free and needs no
// key. It has names, and often cuisines and opening hours, but no star ratings or prices.
import type { PlaceKind } from "./types";

export type OsmPlace = {
  ref: string;
  name: string;
  kind: PlaceKind;
  cuisine: string;
  address: string;
  openingHours: string | null;
  website: string | null;
  isChain: boolean;
  latitude: number;
  longitude: number;
  distanceKm: number;
};

export type PlaceSearch = { latitude: number; longitude: number; radiusKm: number; kind: PlaceKind; cuisine: string };

type NominatimResult = {
  place_id: number;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  name?: string;
  type?: string;
  address?: Record<string, string>;
  extratags?: Record<string, string> | null;
};

const cuisineLabels: Record<string, string> = {
  portuguese: "Portuguesa", regional: "Regional", tapas: "Petiscos", italian: "Italiana", pizza: "Pizza", sushi: "Sushi", japanese: "Japonesa",
  burger: "Hambúrgueres", vegetarian: "Vegetariana", vegan: "Vegan", indian: "Indiana", chinese: "Chinesa", thai: "Tailandesa", mexican: "Mexicana",
  brazilian: "Brasileira", seafood: "Marisco", fish: "Peixe", steak_house: "Carnes", coffee_shop: "Café", french: "Francesa", spanish: "Espanhola",
  kebab: "Kebab", asian: "Asiática", korean: "Coreana", greek: "Grega", brunch: "Brunch", breakfast: "Pequeno-almoço", cake: "Bolos", ice_cream: "Gelados",
};

// Tested against the cuisine tag and the name, since many places only say it in their name.
export const cuisineFilters = [
  { value: "", label: "Qualquer" },
  { value: "portuguese|regional|tasca|taberna", label: "Portuguesa" },
  { value: "tapas|petisc", label: "Petiscos" },
  { value: "italian|pizza|trattoria", label: "Italiana" },
  { value: "sushi|japanese|japon", label: "Sushi" },
  { value: "burger|hamb", label: "Hambúrgueres" },
  { value: "vegetarian|vegan", label: "Vegetariana" },
  { value: "indian|indiano", label: "Indiana" },
];

const kindTypes: Record<PlaceKind, string[]> = { restaurant: ["restaurant"], cafe: ["cafe"], bar: ["bar", "pub"] };
// Nominatim returns at most 40 at a time and asks for no more than one request per second.
const pages = 3;
const pauseMs = 1100;

export function distanceKm(fromLatitude: number, fromLongitude: number, toLatitude: number, toLongitude: number) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(toLatitude - fromLatitude);
  const longitudeDelta = radians(toLongitude - fromLongitude);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(fromLatitude)) * Math.cos(radians(toLatitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function buildSearchUrl({ latitude, longitude, radiusKm, kind }: PlaceSearch, excludeIds: number[] = []) {
  const latitudeSpan = radiusKm / 111;
  const longitudeSpan = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", kind);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "40");
  url.searchParams.set("bounded", "1");
  url.searchParams.set("viewbox", `${longitude - longitudeSpan},${latitude + latitudeSpan},${longitude + longitudeSpan},${latitude - latitudeSpan}`);
  url.searchParams.set("extratags", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "pt-PT");
  if (excludeIds.length) url.searchParams.set("exclude_place_ids", excludeIds.join(","));
  return url.toString();
}

function cuisineLabel(raw: string | undefined) {
  if (!raw) return "";
  return raw.split(/[;,]/).map((item) => cuisineLabels[item.trim().toLowerCase()]).filter(Boolean).slice(0, 2).join(" · ");
}

export function parsePlaces(results: NominatimResult[], search: PlaceSearch): OsmPlace[] {
  const cuisine = search.cuisine && search.kind === "restaurant" ? new RegExp(search.cuisine, "i") : null;
  const places: OsmPlace[] = [];
  for (const result of results) {
    const tags = result.extratags ?? {};
    if (!result.name || !kindTypes[search.kind].includes(result.type ?? "")) continue;
    const plainName = result.name.normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (cuisine && !cuisine.test(`${tags.cuisine ?? ""} ${plainName}`)) continue;
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);
    const street = [result.address?.road, result.address?.house_number].filter(Boolean).join(" ");
    const city = result.address?.city ?? result.address?.town ?? result.address?.village ?? "";
    places.push({
      ref: `osm:${result.osm_type}/${result.osm_id}`,
      name: result.name,
      kind: search.kind,
      cuisine: cuisineLabel(tags.cuisine),
      address: [street, city].filter(Boolean).join(", "),
      openingHours: tags.opening_hours ?? null,
      website: tags.website ?? tags["contact:website"] ?? null,
      isChain: Boolean(tags.brand || tags["brand:wikidata"]),
      latitude,
      longitude,
      distanceKm: Math.round(distanceKm(search.latitude, search.longitude, latitude, longitude) * 10) / 10,
    });
  }
  // The same place can appear twice, as separate map objects or across result pages.
  const seen = new Set<string>();
  return places.filter((place) => {
    const key = place.name.trim().toLocaleLowerCase("pt-PT");
    if (place.distanceKm > search.radiusKm || seen.has(place.ref) || seen.has(key)) return false;
    seen.add(place.ref);
    seen.add(key);
    return true;
  });
}

// With no ratings to go on: chains and places you've been to sink, closer places and those with
// better information rise, and the seed varies who makes the top.
export function rankPlaces(places: OsmPlace[], visitedRefs: Set<string>, radiusKm: number, seed: number) {
  const noise = (text: string) => {
    let hash = Math.imul(seed, 2654435761);
    for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 2654435761);
    hash ^= hash >>> 15;
    return (Math.imul(hash, 2246822519) >>> 0) / 4294967296;
  };
  const score = (place: OsmPlace) => (place.cuisine ? 1 : 0) + (place.openingHours ? 1 : 0) + (place.website ? 1 : 0) + (place.address ? 0.5 : 0)
    + (1 - place.distanceKm / radiusKm) * 2 + noise(place.ref) * 3 - (place.isChain ? 6 : 0) - (visitedRefs.has(place.ref) ? 5 : 0);
  return [...places].sort((first, second) => score(second) - score(first));
}

export async function searchPlaces(search: PlaceSearch, fetcher: typeof fetch = fetch, pause = pauseMs) {
  const seen = new Set<number>();
  const results: NominatimResult[] = [];
  for (let page = 0; page < pages; page += 1) {
    if (page > 0) await new Promise((resolve) => setTimeout(resolve, pause));
    const response = await fetcher(buildSearchUrl(search, [...seen]));
    if (!response.ok) {
      if (page === 0) throw new Error(`HTTP ${response.status}`);
      break;
    }
    const batch = await response.json() as NominatimResult[];
    results.push(...batch);
    batch.forEach((result) => seen.add(result.place_id));
    if (batch.length < 40) break;
  }
  return parsePlaces(results, search);
}

export function mapsUrl(name: string, latitude: number | null, longitude: number | null) {
  const where = latitude !== null && longitude !== null ? ` ${latitude},${longitude}` : "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}${where}`)}`;
}

export function theForkUrl(name: string, address: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(`${name} ${address} TheFork`)}`;
}
