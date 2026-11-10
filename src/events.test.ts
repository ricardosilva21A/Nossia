import { describe, expect, it } from "vitest";
import { distanceKm, eventsNear, firstAvailableDay, priceLabel } from "./events";
import type { LocalEvent } from "./events";

const guimaraes = { municipality: "Guimarães", latitude: 41.4425, longitude: -8.2918 };
const event = (id: string, extra: Partial<LocalEvent> = {}): LocalEvent => ({
  id, title: id, description: "", starts_on: "2026-11-14", ends_on: "2026-11-14", start_time: null, venue: "", municipality: "",
  latitude: null, longitude: null, category: "Culture", price_for_two: null, indoor: false, url: null, image_url: null, tags: [], featured: false, status: "approved", ...extra,
});

describe("distance", () => {
  it("measures between towns", () => {
    expect(Math.round(distanceKm(guimaraes, { latitude: 41.5454, longitude: -8.4265 }))).toBe(16); // Braga
    expect(Math.round(distanceKm(guimaraes, { latitude: 38.7223, longitude: -9.1393 }))).toBeGreaterThan(300); // Lisboa
  });
});

describe("events near the couple", () => {
  it("keeps the same municipality, accents aside, and anything within 60 km", () => {
    const list = eventsNear([
      event("same", { municipality: "Guimaraes" }),
      event("braga", { latitude: 41.5454, longitude: -8.4265 }),
      event("lisboa", { latitude: 38.7223, longitude: -9.1393 }),
      event("nowhere"),
    ], guimaraes, "2026-11-10");
    expect(list.map((item) => item.event.id)).toEqual(["same", "braga"]);
    expect(Math.round(list[1].km ?? 0)).toBe(16);
  });

  it("leaves out ended and unapproved events and sorts by date and time", () => {
    const list = eventsNear([
      event("later", { starts_on: "2026-11-20", ends_on: "2026-11-20", municipality: "Guimarães" }),
      event("evening", { start_time: "21:00:00", municipality: "Guimarães" }),
      event("morning", { start_time: "10:00:00", municipality: "Guimarães" }),
      event("ended", { starts_on: "2026-11-01", ends_on: "2026-11-02", municipality: "Guimarães" }),
      event("pending", { status: "pending", municipality: "Guimarães" }),
    ], guimaraes, "2026-11-10");
    expect(list.map((item) => item.event.id)).toEqual(["morning", "evening", "later"]);
  });

  it("shows everything upcoming when the couple hasn't said where they live", () => {
    expect(eventsNear([event("a"), event("b", { latitude: 38.7, longitude: -9.1 })], null, "2026-11-10")).toHaveLength(2);
  });
});

describe("booking", () => {
  it("books the first day still available", () => {
    expect(firstAvailableDay({ starts_on: "2026-11-14", ends_on: "2026-11-16" }, "2026-11-10")).toBe("2026-11-14");
    expect(firstAvailableDay({ starts_on: "2026-11-01", ends_on: "2026-11-30" }, "2026-11-10")).toBe("2026-11-10");
  });

  it("describes the price for two", () => {
    expect(priceLabel(0)).toBe("Grátis");
    expect(priceLabel(24)).toBe("24 € para dois");
    expect(priceLabel(null)).toBe("Preço por confirmar");
  });
});
