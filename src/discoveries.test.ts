import { describe, expect, it } from "vitest";
import { overpassQuery, parseFeatures, pickDiscoveries, tasteWeights } from "./discoveries";
import type { OverpassElement } from "./discoveries";

const home = { latitude: 41.44, longitude: -8.29 };
const elements: OverpassElement[] = [
  { type: "node", id: 1, lat: 41.55, lon: -8.37, tags: { tourism: "viewpoint", name: "Miradouro do Sameiro" } },
  { type: "way", id: 2, center: { lat: 41.45, lon: -8.30 }, tags: { leisure: "park", name: "Parque da Cidade" } },
  { type: "node", id: 3, lat: 41.44, lon: -8.29, tags: { tourism: "museum", name: "Museu Alberto Sampaio" } },
  { type: "node", id: 4, lat: 41.44, lon: -8.29, tags: { tourism: "viewpoint" } },
  { type: "node", id: 5, lat: 41.6, lon: -8.2, tags: { leisure: "beach_resort", name: "Praia Fluvial X" } },
  { type: "node", id: 6, lat: 41.45, lon: -8.29, tags: { tourism: "museum", name: "museu alberto sampaio" } },
];

describe("new ideas from places around home", () => {
  it("asks OpenStreetMap for the right kinds of places around home", () => {
    const query = overpassQuery(41.44, -8.29, 25);
    expect(query).toContain("around:25000,41.44,-8.29");
    expect(query).toContain('node["tourism"="viewpoint"]');
  });

  it("keeps named places once each, with their kind and distance", () => {
    const features = parseFeatures(elements, home);
    expect(features.map((feature) => [feature.ref, feature.kind])).toEqual([["node/1", "viewpoint"], ["way/2", "park"], ["node/3", "museum"], ["node/5", "beach"]]);
    expect(features[0].distanceKm).toBeGreaterThan(10);
  });

  it("turns them into ideas, by taste and season, skipping places already known", () => {
    const features = parseFeatures(elements, home);
    const november = pickDiscoveries(features, { tastes: tasteWeights(["cultura"], ["cultura"]), month: 11, knownRefs: new Set(["way/2"]), limit: 5, random: () => 0.5 });
    // No beach in November, no park they already have, culture first because they like it.
    expect(november.map((idea) => idea.title)).toEqual(["Visita · Museu Alberto Sampaio", "Pôr do sol · Miradouro do Sameiro"]);
    expect(november[0]).toMatchObject({ activity: "cultura", weather_setting: "indoor", source_url: "https://www.openstreetmap.org/node/3" });
    const august = pickDiscoveries(features, { tastes: {}, month: 8, knownRefs: new Set(), limit: 5, random: () => 0.5 });
    expect(august.map((idea) => idea.emoji)).toContain("🏖️");
  });

  it("weighs tastes against the strongest one", () => {
    expect(tasteWeights(["ar_livre", "ar_livre", "comer"], ["ar_livre"])).toEqual({ ar_livre: 3, comer: 1 });
  });
});
