// The little signs of affection one can send the other from the house.
export type AffectionKind = "beijo" | "abraco" | "aceno" | "saudades" | "pensar";

export const affections: Array<{ kind: AffectionKind; emoji: string; label: string }> = [
  { kind: "beijo", emoji: "💋", label: "Um beijo" },
  { kind: "abraco", emoji: "🤗", label: "Um abraço" },
  { kind: "aceno", emoji: "👋", label: "Um aceno" },
  { kind: "saudades", emoji: "🥺", label: "Tenho saudades" },
  { kind: "pensar", emoji: "💭", label: "Estou a pensar em ti" },
];

// What the other one reads, in the app and in the notification.
export function affectionMessage(kind: AffectionKind, from: string) {
  const emoji = affections.find((item) => item.kind === kind)?.emoji ?? "💌";
  const text: Record<AffectionKind, string> = {
    beijo: `${from} mandou-te um beijo`,
    abraco: `${from} mandou-te um abraço`,
    aceno: `${from} acenou-te`,
    saudades: `${from} tem saudades tuas`,
    pensar: `${from} está a pensar em ti`,
  };
  return { emoji, text: text[kind] };
}

export function isAffectionKind(value: unknown): value is AffectionKind {
  return typeof value === "string" && affections.some((item) => item.kind === value);
}
