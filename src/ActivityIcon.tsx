import { Bath, Clapperboard, Dices, Landmark, MessageCircle, Mountain, Palette, Plane, UtensilsCrossed } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Activity } from "./activities";

// Line icons for the kinds of date, drawn the same on every phone (emoji change between iPhone
// and Android). Placeholders in the menu's style until Marta draws the Nossia set.
const icons: Record<Activity, LucideIcon> = {
  comer: UtensilsCrossed,
  ver: Clapperboard,
  ar_livre: Mountain,
  criar: Palette,
  cultura: Landmark,
  jogar: Dices,
  descansar: Bath,
  conversar: MessageCircle,
  escapadinha: Plane,
};

export function ActivityIcon({ activity, size = 16, label }: { activity: Activity; size?: number; label?: string }) {
  const Icon = icons[activity];
  return label
    ? <Icon className="activity-icon" size={size} strokeWidth={1.9} role="img" aria-label={label} />
    : <Icon className="activity-icon" size={size} strokeWidth={1.9} aria-hidden="true" />;
}
