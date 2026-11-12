import { describe, expect, it } from "vitest";
import { firstUrl, guessSharedTitle, siteName } from "./share";

describe("sharing into the app", () => {
  it("finds the link inside a shared message", () => {
    expect(firstUrl(null, "Bora? https://www.instagram.com/p/abc123/?igsh=x).")).toBe("https://www.instagram.com/p/abc123/?igsh=x");
    expect(firstUrl("sem link")).toBeNull();
  });

  it("names the site", () => {
    expect(siteName("https://www.instagram.com/p/abc")).toBe("Instagram");
    expect(siteName("https://vm.tiktok.com/xyz")).toBe("TikTok");
    expect(siteName("https://maps.app.goo.gl/abc")).toBe("Google Maps");
    expect(siteName("https://www.restaurantevira.pt/menu")).toBe("restaurantevira.pt");
  });

  it("guesses a title from what was shared", () => {
    expect(guessSharedTitle({ text: "Temos de ir aqui https://www.instagram.com/p/abc", url: "https://www.instagram.com/p/abc" })).toBe("Temos de ir aqui");
    expect(guessSharedTitle({ url: "https://www.google.com/maps/place/Vira+Braga/@41.5,-8.4" })).toBe("Vira Braga");
    expect(guessSharedTitle({ url: "https://www.tiktok.com/@x/video/1", pageTitle: "Sunset em Ponte de Lima" })).toBe("Sunset em Ponte de Lima");
    expect(guessSharedTitle({ url: "https://www.instagram.com/reel/abc" })).toBe("Ideia do Instagram");
  });
});
