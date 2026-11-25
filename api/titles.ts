// Suggestions while typing a film, series or song in the games (see src/titles.ts). Done here so
// the phone doesn't talk to IMDb or Apple directly; answers are cached for a day.

import { imdbUrl, itunesUrl, parseImdb, parseItunes } from "../src/titles.js";

function json(body: unknown, status = 200, cache = "no-store") {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": cache } });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = (params.get("q") ?? "").trim();
  const kind = params.get("type");
  if (query.length < 2 || query.length > 60 || (kind !== "film" && kind !== "series" && kind !== "song")) return json({ error: "bad_request" }, 400);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(kind === "song" ? itunesUrl(query) : imdbUrl(query), { signal: controller.signal, headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (Nossia)" } });
    if (!response.ok) return json({ results: [] });
    const data = await response.json().catch(() => null);
    const results = kind === "song" ? parseItunes(data) : parseImdb(data, kind);
    return json({ results }, 200, "public, s-maxage=86400, max-age=3600");
  } catch {
    return json({ results: [] });
  } finally {
    clearTimeout(timer);
  }
}
