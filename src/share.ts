// Turning something shared from Instagram, TikTok, WhatsApp or Maps into an idea.

const urlPattern = /https?:\/\/[^\s<>"]+/i;

export function firstUrl(...texts: Array<string | null | undefined>) {
  for (const text of texts) {
    const match = text?.match(urlPattern);
    if (match) return match[0].replace(/[).,;!?]+$/, "");
  }
  return null;
}

const sites: Array<[RegExp, string]> = [
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)tiktok\.com$/, "TikTok"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "YouTube"],
  [/(^|\.)facebook\.com$|(^|\.)fb\.watch$/, "Facebook"],
  [/(^|\.)(maps\.app\.goo\.gl|goo\.gl)$|google\.[a-z.]+$/, "Google Maps"],
  [/(^|\.)booking\.com$/, "Booking"],
  [/(^|\.)airbnb\.[a-z.]+$/, "Airbnb"],
  [/(^|\.)thefork\.[a-z.]+$/, "TheFork"],
];

export function siteName(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return sites.find(([pattern]) => pattern.test(host))?.[1] ?? host;
  } catch {
    return "";
  }
}

// A place name hidden in a Google Maps link (…/maps/place/Vira+Braga/…).
function placeFromMapsUrl(url: string) {
  const match = url.match(/\/maps\/place\/([^/@?]+)/);
  return match ? decodeURIComponent(match[1].replace(/\+/g, " ")).trim() : "";
}

// The best first guess at a title: what they wrote, the page's own title, the place in the link,
// or "Ideia do Instagram". Always short enough to read on a card.
export function guessSharedTitle(input: { title?: string | null; text?: string | null; url?: string | null; pageTitle?: string | null }) {
  const clean = (value: string | null | undefined) => (value ?? "").replace(urlPattern, "").replace(/\s+/g, " ").trim();
  const candidates = [clean(input.text), clean(input.title), clean(input.pageTitle), input.url ? placeFromMapsUrl(input.url) : ""];
  const found = candidates.find((value) => value.length >= 3);
  const title = found ?? (input.url ? `Ideia do ${siteName(input.url) || "link"}` : "");
  return title.length > 80 ? `${title.slice(0, 77).trimEnd()}…` : title;
}
