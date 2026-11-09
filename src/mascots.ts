import type { HomePartner } from "./types";

export type Ears = "round" | "cat" | "dog" | "rabbit";
export type Pattern = "none" | "spots" | "stripes";
export type MascotLook = { name: string; ears: Ears; color: string; pattern: Pattern };
export type Mascot = MascotLook & { user_id: string; couple_id: string; partner_slot: HomePartner };

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
