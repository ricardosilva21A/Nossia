// Suggestions while typing a film, a series or a song in the games: films and series come from
// IMDb's search suggestions, songs from the iTunes search. No imports: the endpoint loads this too.

export type TitleKind = "film" | "series" | "song";
export type TitleHit = { id: string; title: string; detail: string; year: number | null; image: string | null };

const clean = (text: unknown) => (typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "");

// IMDb files suggestions under the query's first letter.
export function imdbUrl(query: string) {
  const term = query.trim().toLowerCase();
  const letter = /^[a-z0-9]/.test(term) ? term[0] : "x";
  return `https://v3.sg.media-imdb.com/suggestion/${letter}/${encodeURIComponent(term)}.json`;
}

export function itunesUrl(query: string) {
  return `https://itunes.apple.com/search?term=${encodeURIComponent(query.trim())}&entity=song&limit=8&country=PT`;
}

const filmTypes = new Set(["movie", "tvMovie", "short", "video"]);
const seriesTypes = new Set(["tvSeries", "tvMiniSeries"]);

export function parseImdb(data: unknown, kind: "film" | "series"): TitleHit[] {
  const items = (data as { d?: unknown[] } | null)?.d;
  if (!Array.isArray(items)) return [];
  const wanted = kind === "film" ? filmTypes : seriesTypes;
  return items.flatMap((raw) => {
    const item = raw as { id?: unknown; l?: unknown; qid?: unknown; y?: unknown; s?: unknown; i?: { imageUrl?: unknown } };
    const id = clean(item.id);
    const title = clean(item.l);
    if (!id.startsWith("tt") || !title || !wanted.has(clean(item.qid))) return [];
    const image = clean(item.i?.imageUrl);
    return [{ id, title, detail: clean(item.s), year: typeof item.y === "number" ? item.y : null, image: image.startsWith("https://") ? image : null }];
  }).slice(0, 6);
}

export function parseItunes(data: unknown): TitleHit[] {
  const items = (data as { results?: unknown[] } | null)?.results;
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  return items.flatMap((raw) => {
    const item = raw as { trackId?: unknown; trackName?: unknown; artistName?: unknown; releaseDate?: unknown; artworkUrl60?: unknown };
    const title = clean(item.trackName);
    const artist = clean(item.artistName);
    const key = `${title}|${artist}`.toLowerCase();
    if (!title || seen.has(key)) return [];
    seen.add(key);
    const year = Number(clean(item.releaseDate).slice(0, 4));
    const image = clean(item.artworkUrl60);
    return [{ id: String(item.trackId ?? key), title, detail: artist, year: Number.isFinite(year) && year > 1800 ? year : null, image: image.startsWith("https://") ? image : null }];
  }).slice(0, 6);
}

// What gets saved as the answer: the title, and for a song its artist too.
export function answerText(hit: TitleHit, kind: TitleKind) {
  return kind === "song" && hit.detail ? `${hit.title} · ${hit.detail}` : hit.title;
}
