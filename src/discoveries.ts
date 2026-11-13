// New ideas without typing them: real places around the couple's home from OpenStreetMap
// (viewpoints, parks, river beaches, museums, castles, theatres, spas...), each turned into a date
// idea, picked by what the couple likes and by the time of year. Free, no keys.

import type { Activity } from "./activities";

export type FeatureKind = "viewpoint" | "park" | "beach" | "peak" | "nature" | "museum" | "gallery" | "historic" | "theatre" | "cinema" | "spa";
export type Feature = { ref: string; name: string; kind: FeatureKind; latitude: number; longitude: number; distanceKm: number };
export type DiscoveredIdea = {
  ref: string;
  title: string;
  description: string;
  emoji: string;
  activity: Activity;
  weather_setting: "indoor" | "outdoor" | "any";
  duration_minutes: number;
  budget_eur: number;
  travel_minutes: number;
  source_url: string;
};

type Template = { label: string; emoji: string; activity: Activity; weather: DiscoveredIdea["weather_setting"]; minutes: number; euros: number; note: string; months?: number[] };

// Neutral wording ("Pôr do sol · Miradouro X") so it reads well whatever the place is called.
const templates: Record<FeatureKind, Template> = {
  viewpoint: { label: "Pôr do sol", emoji: "🌅", activity: "ar_livre", weather: "outdoor", minutes: 90, euros: 0, note: "Levem algo para beber e cheguem meia hora antes do pôr do sol." },
  park: { label: "Piquenique", emoji: "🧺", activity: "ar_livre", weather: "outdoor", minutes: 150, euros: 10, note: "Uma manta, petiscos e nada marcado para depois.", months: [4, 5, 6, 7, 8, 9, 10] },
  beach: { label: "Tarde de praia", emoji: "🏖️", activity: "ar_livre", weather: "outdoor", minutes: 180, euros: 0, note: "Praia fluvial ou de mar, para uma tarde sem pressa.", months: [6, 7, 8, 9] },
  peak: { label: "Subida", emoji: "⛰️", activity: "ar_livre", weather: "outdoor", minutes: 180, euros: 0, note: "Calçado confortável e água. A vista lá de cima é o prémio." },
  nature: { label: "Caminhada", emoji: "🥾", activity: "ar_livre", weather: "outdoor", minutes: 180, euros: 0, note: "Escolham um trilho à vossa medida e parem para lanchar." },
  museum: { label: "Visita", emoji: "🏛️", activity: "cultura", weather: "indoor", minutes: 120, euros: 8, note: "Vejam antes o horário e se há exposições temporárias." },
  gallery: { label: "Exposição", emoji: "🖼️", activity: "cultura", weather: "indoor", minutes: 90, euros: 0, note: "Vejam o que está em exposição e acabem num café perto." },
  historic: { label: "Passeio", emoji: "🏰", activity: "cultura", weather: "any", minutes: 90, euros: 0, note: "Um passeio com história, sem pressa." },
  theatre: { label: "Espetáculo", emoji: "🎭", activity: "ver", weather: "indoor", minutes: 150, euros: 15, note: "Vejam a programação e reservem os bilhetes." },
  cinema: { label: "Cinema", emoji: "🎬", activity: "ver", weather: "indoor", minutes: 150, euros: 14, note: "Escolham o filme juntos, pipocas incluídas." },
  spa: { label: "Termas", emoji: "♨️", activity: "descansar", weather: "indoor", minutes: 180, euros: 30, note: "Reservem com antecedência e levem roupa de banho." },
};

// Rain and cold make indoor plans better, warm months make outdoor ones better.
function seasonFactor(kind: FeatureKind, month: number) {
  const template = templates[kind];
  if (template.months && !template.months.includes(month)) return 0;
  const cold = [11, 12, 1, 2].includes(month);
  if (template.weather === "outdoor") return cold ? 0.6 : 1.2;
  if (template.weather === "indoor") return cold ? 1.3 : 0.9;
  return 1;
}

export function overpassQuery(latitude: number, longitude: number, radiusKm: number) {
  const around = `(around:${Math.round(radiusKm * 1000)},${latitude},${longitude})`;
  const selectors = [
    'node["tourism"="viewpoint"]', 'nwr["leisure"="park"]["name"]', 'nwr["leisure"="beach_resort"]', 'nwr["natural"="beach"]["name"]',
    'node["natural"="peak"]["name"]', 'nwr["leisure"="nature_reserve"]', 'nwr["boundary"="protected_area"]["name"]',
    'nwr["tourism"="museum"]', 'nwr["tourism"="gallery"]', 'nwr["historic"~"^(castle|monument|ruins|archaeological_site)$"]["name"]',
    'nwr["amenity"="theatre"]', 'nwr["amenity"="cinema"]', 'nwr["leisure"="spa"]', 'nwr["amenity"="public_bath"]["name"]',
  ];
  return `[out:json][timeout:25];(${selectors.map((selector) => `${selector}${around};`).join("")});out tags center 400;`;
}

export type OverpassElement = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

function kindOf(tags: Record<string, string>): FeatureKind | null {
  if (tags.tourism === "viewpoint") return "viewpoint";
  if (tags.leisure === "beach_resort" || tags.natural === "beach") return "beach";
  if (tags.natural === "peak") return "peak";
  if (tags.leisure === "nature_reserve" || tags.boundary === "protected_area") return "nature";
  if (tags.leisure === "park") return "park";
  if (tags.tourism === "museum") return "museum";
  if (tags.tourism === "gallery") return "gallery";
  if (tags.historic) return "historic";
  if (tags.amenity === "theatre") return "theatre";
  if (tags.amenity === "cinema") return "cinema";
  if (tags.leisure === "spa" || tags.amenity === "public_bath") return "spa";
  return null;
}

function distance(fromLatitude: number, fromLongitude: number, toLatitude: number, toLongitude: number) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const a = Math.sin(radians(toLatitude - fromLatitude) / 2) ** 2 + Math.cos(radians(fromLatitude)) * Math.cos(radians(toLatitude)) * Math.sin(radians(toLongitude - fromLongitude) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function parseFeatures(elements: OverpassElement[], home: { latitude: number; longitude: number }): Feature[] {
  const seen = new Set<string>();
  return elements.flatMap((element) => {
    const tags = element.tags ?? {};
    const name = (tags["name:pt"] ?? tags.name ?? "").trim();
    const kind = kindOf(tags);
    const latitude = element.lat ?? element.center?.lat;
    const longitude = element.lon ?? element.center?.lon;
    // Unnamed places make poor ideas, and the same name twice is usually the same place.
    if (!name || !kind || latitude === undefined || longitude === undefined || name.length > 70) return [];
    const key = `${kind}:${name.toLocaleLowerCase("pt-PT")}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ ref: `${element.type}/${element.id}`, name, kind, latitude, longitude, distanceKm: Math.round(distance(home.latitude, home.longitude, latitude, longitude) * 10) / 10 }];
  });
}

// Up to `limit` new ideas: weighted by how much they like each kind of activity (likes and dates
// done), by the season, and by closeness; never two of the same kind in a row, never a place
// they already have.
export function pickDiscoveries(features: Feature[], options: { tastes: Partial<Record<Activity, number>>; month: number; knownRefs: Set<string>; limit: number; random?: () => number }): DiscoveredIdea[] {
  const random = options.random ?? Math.random;
  const scored = features
    .filter((feature) => !options.knownRefs.has(feature.ref))
    .map((feature) => {
      const template = templates[feature.kind];
      const taste = 1 + (options.tastes[template.activity] ?? 0);
      const near = 1 / (1 + feature.distanceKm / 10);
      return { feature, score: taste * seasonFactor(feature.kind, options.month) * near * (0.6 + random() * 0.8) };
    })
    .filter((item) => item.score > 0)
    .sort((first, second) => second.score - first.score);

  const picked: Feature[] = [];
  const perKind = new Map<FeatureKind, number>();
  for (const { feature } of scored) {
    if (picked.length >= options.limit) break;
    if ((perKind.get(feature.kind) ?? 0) >= 2) continue;
    perKind.set(feature.kind, (perKind.get(feature.kind) ?? 0) + 1);
    picked.push(feature);
  }

  return picked.map((feature) => {
    const template = templates[feature.kind];
    return {
      ref: feature.ref,
      title: `${template.label} · ${feature.name}`,
      description: `${template.note} Fica a ${feature.distanceKm.toLocaleString("pt-PT")} km de casa.`,
      emoji: template.emoji,
      activity: template.activity,
      weather_setting: template.weather,
      duration_minutes: template.minutes,
      budget_eur: template.euros,
      travel_minutes: Math.max(5, Math.round(feature.distanceKm * 1.6)),
      source_url: `https://www.openstreetmap.org/${feature.ref}`,
    };
  });
}

// How much they like each kind of activity: one point per like and per date done.
export function tasteWeights(liked: Activity[], done: Activity[]) {
  const weights: Partial<Record<Activity, number>> = {};
  for (const activity of [...liked, ...done]) weights[activity] = (weights[activity] ?? 0) + 1;
  const top = Math.max(1, ...Object.values(weights).map((value) => value ?? 0));
  for (const key of Object.keys(weights) as Activity[]) weights[key] = (weights[key] ?? 0) * 3 / top;
  return weights;
}

export async function fetchFeatures(latitude: number, longitude: number, radiusKm = 25): Promise<Feature[]> {
  const response = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: new URLSearchParams({ data: overpassQuery(latitude, longitude, radiusKm) }) });
  if (!response.ok) throw new Error(`overpass ${response.status}`);
  const data = await response.json() as { elements?: OverpassElement[] };
  return parseFeatures(data.elements ?? [], { latitude, longitude });
}
