import type { HomePartner } from "./types";

export type Ears = "round" | "cat" | "dog" | "rabbit";
export type Pattern = "none" | "spots" | "stripes";
export type Accessory = "none" | "lenco" | "laco" | "chapeu" | "oculos" | "gorro";
export type MascotLook = { name: string; ears: Ears; color: string; pattern: Pattern; accessory?: Accessory };
export type Hair = "short" | "long" | "bun" | "curly" | "bald";
// The human avatar: a mini version of each person. null until they've made it.
export type AvatarLook = { skin: string; hair: Hair; hair_color: string; glasses: boolean; beard: boolean };
export type Mascot = MascotLook & Partial<{ skin: string | null; hair: Hair | null; hair_color: string | null; glasses: boolean; beard: boolean }> & { user_id: string; couple_id: string; partner_slot: HomePartner };

export const skinOptions = ["#F6D7C3", "#EBC2A2", "#D9A47F", "#B97E5A", "#8C5A3C", "#5C3A26"];
export const hairColorOptions = ["#231815", "#4A2E27", "#7A4E2D", "#B5793F", "#E3C07A", "#9C9C9C"];
export const hairOptions: Array<{ value: Hair; label: string }> = [
  { value: "short", label: "Curto" },
  { value: "long", label: "Comprido" },
  { value: "bun", label: "Apanhado" },
  { value: "curly", label: "Encaracolado" },
  { value: "bald", label: "Sem cabelo" },
];
export const defaultAvatar: AvatarLook = { skin: skinOptions[1], hair: "short", hair_color: hairColorOptions[1], glasses: false, beard: false };

export function avatarOf(mascot: Mascot | null | undefined): AvatarLook | null {
  if (!mascot || !mascot.skin || !mascot.hair || !mascot.hair_color) return null;
  return { skin: mascot.skin, hair: mascot.hair, hair_color: mascot.hair_color, glasses: Boolean(mascot.glasses), beard: Boolean(mascot.beard) };
}

// The couple's animal: one per couple, the voice of the house.
export type Species = "dog" | "cat" | "rabbit";
export type Pet = { couple_id: string; species: Species; name: string; color: string; pattern: Pattern; accessory?: Accessory };
export const accessoryOptions: Array<{ value: Accessory; label: string }> = [
  { value: "none", label: "Nada" },
  { value: "lenco", label: "Lenço" },
  { value: "laco", label: "Laço" },
  { value: "chapeu", label: "Chapéu de festa" },
  { value: "oculos", label: "Óculos de sol" },
  { value: "gorro", label: "Gorro" },
];
export const speciesOptions: Array<{ value: Species; label: string }> = [
  { value: "dog", label: "Cão" },
  { value: "cat", label: "Gato" },
  { value: "rabbit", label: "Coelho" },
];
export const petColorOptions = ["#D9A86C", "#F2E2C4", "#8C5A3C", "#3B302B", "#B9A08A", "#E8E1D8"];

// The animal is drawn with the old mascot art: the species picks the ears.
export function petLook(pet: Pet): MascotLook {
  return { name: pet.name, ears: pet.species, color: pet.color, pattern: pet.pattern, accessory: pet.accessory ?? "none" };
}

export const earOptions: Array<{ value: Ears; label: string }> = [
  { value: "round", label: "Redondas" },
  { value: "cat", label: "Gato" },
  { value: "dog", label: "Cão" },
  { value: "rabbit", label: "Coelho" },
];

export const patternOptions: Array<{ value: Pattern; label: string }> = [
  { value: "none", label: "Liso" },
  { value: "spots", label: "Manchas" },
  { value: "stripes", label: "Riscas" },
];

export const colorOptions = ["#E8A87C", "#F2C879", "#9CC5A1", "#8FB8DE", "#C9A0DC", "#EFA0A0", "#B9A08A", "#D9D4C7"];
