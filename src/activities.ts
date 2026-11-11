// What a date is about, in one concrete word, instead of a feeling.
// "Romântico" or "relaxante" depended on the couple; "Ver e ouvir" or "Ar livre" does not.
// Facts (at home or out, time, price, indoor or outdoor) are filters, and "Especial" marks
// what suits an anniversary or another occasion.
import type { Category, Idea, Mood } from "./types";

export type Activity = "comer" | "ver" | "ar_livre" | "criar" | "cultura" | "jogar" | "descansar" | "conversar" | "escapadinha";

export const activities: Array<{ value: Activity; label: string; emoji: string; examples: string }> = [
  { value: "comer", label: "Comer e beber", emoji: "🍽️", examples: "restaurante, brunch, cozinhar juntos, provas" },
  { value: "ver", label: "Ver e ouvir", emoji: "🎬", examples: "filmes, séries, teatro, concertos, música" },
  { value: "ar_livre", label: "Ar livre", emoji: "🥾", examples: "caminhadas, praia, piquenique, miradouros" },
  { value: "criar", label: "Criar", emoji: "🎨", examples: "workshops, pintar, fotografia, fazer à mão" },
  { value: "cultura", label: "Cultura e passeios", emoji: "🏛️", examples: "museus, feiras, mercados, livrarias" },
  { value: "jogar", label: "Jogar e mexer", emoji: "🎲", examples: "jogos, escape room, bowling, desporto" },
  { value: "descansar", label: "Descansar", emoji: "🧖", examples: "spa, termas, massagem, ler juntos" },
  { value: "conversar", label: "Conversar", emoji: "💬", examples: "perguntas, cartas, sonhos, balanço do ano" },
  { value: "escapadinha", label: "Escapadinha", emoji: "✈️", examples: "fim de semana fora, road trip, comboio" },
];

export const activityValues = activities.map((item) => item.value);

export function activityLabel(activity: Activity) {
  const found = activities.find((item) => item.value === activity);
  return found ? `${found.emoji} ${found.label}` : activity;
}

type Classifiable = Pick<Idea, "title" | "category" | "at_home"> & { tags?: string[] | null; activity?: Activity | null; special?: boolean | null; mood?: Mood };

const has = (tags: string[], ...wanted: string[]) => wanted.some((tag) => tags.includes(tag));

// The same rules as the migration that filled the column, so ideas saved before it still get one.
export function deriveActivity(idea: Classifiable): Activity {
  const tags = idea.tags ?? [];
  if (has(tags, "escapadinha")) return "escapadinha";
  if (has(tags, "spa")) return "descansar";
  if (has(tags, "conversa")) return "conversar";
  if (has(tags, "museu")) return "cultura";
  if (has(tags, "cinema", "espetaculo", "musica")) return "ver";
  if (has(tags, "jogos")) return "jogar";
  if (has(tags, "restaurante", "cozinhar", "doces", "bebidas")) return "comer";
  if (has(tags, "natureza") && idea.at_home) return "criar";
  if (has(tags, "caminhada", "natureza", "praia")) return "ar_livre";
  if (has(tags, "desporto")) return "jogar";
  if (has(tags, "manual")) return "criar";
  if (has(tags, "compras")) return "cultura";
  const byCategory: Record<Category, Activity> = {
    "Food & drink": "comer",
    Culture: "cultura",
    Adventure: "ar_livre",
    Creative: "criar",
    Relaxing: "descansar",
    Romantic: idea.at_home ? "conversar" : "cultura",
  };
  return byCategory[idea.category] ?? "cultura";
}

export function activityOf(idea: Classifiable): Activity {
  return idea.activity && activityValues.includes(idea.activity) ? idea.activity : deriveActivity(idea);
}

const specialTitles = /velas|namorados|primeiro encontro|pôr do sol|na cama|de hotel|fondue|termas|spa|adega|road trip|fotografia de casal|carta para abrir/i;

export function deriveSpecial(idea: Classifiable) {
  return idea.category === "Romantic" || specialTitles.test(idea.title);
}

export function isSpecial(idea: Classifiable) {
  return typeof idea.special === "boolean" ? idea.special : deriveSpecial(idea);
}

// The old columns stay filled for anything that still reads them.
export function legacyFields(activity: Activity, special: boolean): { category: Category; mood: Mood } {
  const category: Record<Activity, Category> = {
    comer: "Food & drink", ver: "Culture", ar_livre: "Adventure", criar: "Creative", cultura: "Culture",
    jogar: "Culture", descansar: "Relaxing", conversar: "Romantic", escapadinha: "Adventure",
  };
  const mood: Record<Activity, Mood> = {
    comer: "Fun", ver: "Relaxing", ar_livre: "Adventure", criar: "Creative", cultura: "Fun",
    jogar: "Fun", descansar: "Relaxing", conversar: "Romantic", escapadinha: "Adventure",
  };
  return { category: category[activity], mood: special ? "Romantic" : mood[activity] };
}
