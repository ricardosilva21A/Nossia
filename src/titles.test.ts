import { describe, expect, it } from "vitest";
import { answerText, imdbUrl, itunesUrl, parseImdb, parseItunes } from "./titles";

describe("title suggestions", () => {
  it("asks IMDb under the query's first letter", () => {
    expect(imdbUrl(" Interstel ")).toBe("https://v3.sg.media-imdb.com/suggestion/i/interstel.json");
    expect(imdbUrl("ÉLITE")).toBe("https://v3.sg.media-imdb.com/suggestion/x/%C3%A9lite.json");
    expect(itunesUrl("bohemian")).toContain("entity=song");
  });

  it("keeps films for films and series for series, skipping people", () => {
    const data = { d: [
      { id: "tt0816692", l: "Interstellar", qid: "movie", y: 2014, s: "Matthew McConaughey", i: { imageUrl: "https://m.media-amazon.com/x.jpg" } },
      { id: "nm0000190", l: "Matthew McConaughey", s: "Actor" },
      { id: "tt0903747", l: "Breaking Bad", qid: "tvSeries", y: 2008 },
    ] };
    expect(parseImdb(data, "film")).toEqual([{ id: "tt0816692", title: "Interstellar", detail: "Matthew McConaughey", year: 2014, image: "https://m.media-amazon.com/x.jpg" }]);
    expect(parseImdb(data, "series").map((hit) => hit.title)).toEqual(["Breaking Bad"]);
    expect(parseImdb(null, "film")).toEqual([]);
  });

  it("reads songs once each and saves them with the artist", () => {
    const data = { results: [
      { trackId: 1, trackName: "Bohemian Rhapsody", artistName: "Queen", releaseDate: "1975-10-31T07:00:00Z" },
      { trackId: 2, trackName: "Bohemian Rhapsody", artistName: "Queen", releaseDate: "1975-10-31T07:00:00Z" },
    ] };
    const hits = parseItunes(data);
    expect(hits).toHaveLength(1);
    expect(hits[0].year).toBe(1975);
    expect(answerText(hits[0], "song")).toBe("Bohemian Rhapsody · Queen");
  });
});
