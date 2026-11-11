import { describe, expect, it } from "vitest";
import { activityOf, deriveActivity, isSpecial, legacyFields } from "./activities";

const idea = (title: string, category: "Romantic" | "Adventure" | "Food & drink" | "Creative" | "Relaxing" | "Culture", tags: string[] = [], at_home = false) => ({ title, category, tags, at_home });

describe("activity", () => {
  it("files a Harry Potter marathon at home under Ver e ouvir", () => {
    expect(deriveActivity(idea("Maratona Harry Potter", "Culture", ["cinema"], true))).toBe("ver");
  });

  it("follows what you do, not where the idea came from", () => {
    expect(deriveActivity(idea("Rota de gelados", "Food & drink", ["caminhada", "doces"]))).toBe("comer");
    expect(deriveActivity(idea("Rota de arte urbana", "Culture", ["museu", "caminhada"]))).toBe("cultura");
    expect(deriveActivity(idea("Passeio de bicicleta", "Adventure", ["caminhada", "desporto"]))).toBe("ar_livre");
    expect(deriveActivity(idea("Plantar ervas aromáticas", "Creative", ["natureza"], true))).toBe("criar");
    expect(deriveActivity(idea("Noite de perguntas para casais", "Romantic", ["conversa"], true))).toBe("conversar");
    expect(deriveActivity(idea("Ir às termas", "Relaxing", ["spa"]))).toBe("descansar");
  });

  it("falls back to the old category when there are no tags", () => {
    expect(deriveActivity(idea("Pequeno-almoço na cama", "Food & drink", [], true))).toBe("comer");
    expect(deriveActivity(idea("Ler lado a lado", "Relaxing", [], true))).toBe("descansar");
  });

  it("keeps a saved label over the rules", () => {
    expect(activityOf({ ...idea("Rever fotografias antigas", "Creative", [], true), activity: "conversar" })).toBe("conversar");
  });
});

describe("special", () => {
  it("marks romantic and occasion ideas, and respects a saved choice", () => {
    expect(isSpecial(idea("Jantar à luz das velas em casa", "Food & drink", ["cozinhar"], true))).toBe(true);
    expect(isSpecial(idea("Fazer pizza caseira", "Food & drink", ["cozinhar"], true))).toBe(false);
    expect(isSpecial({ ...idea("Fazer pizza caseira", "Food & drink"), special: true })).toBe(true);
  });

  it("keeps the old columns filled for anything that still reads them", () => {
    expect(legacyFields("ver", false)).toEqual({ category: "Culture", mood: "Relaxing" });
    expect(legacyFields("comer", true).mood).toBe("Romantic");
  });
});
