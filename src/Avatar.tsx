// A placeholder mini-person until Marta's drawings exist. Everything that shows a person's avatar
// goes through this component, so replacing the art doesn't touch the rest of the app.
import type { Outfit } from "./house";
import type { AvatarLook, Hair } from "./mascots";

const outfitColors: Record<Outfit, { body: string; extra?: string }> = {
  coat: { body: "#4D0E12", extra: "#A5BCD6" },
  sweater: { body: "#A5BCD6" },
  normal: { body: "#E6DDB0" },
  tshirt: { body: "#FFFDF3" },
};

// Drawn behind and over the head; the face stays the same for every style.
const hairBack: Partial<Record<Hair, string>> = {
  long: "M26 50c0-26 14-38 34-38s34 12 34 38v40H26z",
  curly: "M22 50c-6-18 8-36 20-34 4-10 32-10 36 0 12-2 26 16 20 34z",
};
const hairFront: Record<Hair, string> = {
  short: "M30 48c0-22 14-32 30-32s30 10 30 32c-8-10-20-14-30-14s-22 4-30 14z",
  long: "M30 50c0-22 14-34 30-34s30 12 30 34c-10-12-20-16-30-16s-20 4-30 16z",
  bun: "M30 48c0-22 14-32 30-32s30 10 30 32c-8-10-20-14-30-14s-22 4-30 14zM48 12a12 12 0 1 1 24 0 12 12 0 1 1-24 0z",
  curly: "M30 46c-2-14 8-26 18-26 4-6 20-6 24 0 10 0 20 12 18 26-6-6-14-8-30-8s-24 2-30 8z",
  bald: "",
};

export function Avatar({ look, outfit = "normal", size = 80, asleep = false, label }: { look: AvatarLook; outfit?: Outfit; size?: number; asleep?: boolean; label?: string }) {
  const clothes = outfitColors[outfit];
  return (
    <svg className="avatar" viewBox="0 0 120 132" width={size} height={size * 1.1} role="img" aria-label={label ?? "Avatar"}>
      {hairBack[look.hair] && <path d={hairBack[look.hair]} fill={look.hair_color} />}
      <path d="M22 132c0-26 16-40 38-40s38 14 38 40z" fill={clothes.body} />
      {clothes.extra && <path d="M48 96h24l-4 14H52z" fill={clothes.extra} />}
      <circle cx="60" cy="56" r="30" fill={look.skin} />
      {hairFront[look.hair] && <path d={hairFront[look.hair]} fill={look.hair_color} />}
      {outfit === "coat" && <path d="M28 40c0-24 14-30 32-30s32 6 32 30c-10-6-20-8-32-8s-22 2-32 8z" fill={clothes.extra} />}
      {look.beard && <path d="M36 62c2 18 12 26 24 26s22-8 24-26c-6 8-14 10-24 10s-18-2-24-10z" fill={look.hair_color} />}
      {asleep
        ? <path d="M44 58q5 4 10 0M66 58q5 4 10 0" fill="none" stroke="#231815" strokeWidth="3" strokeLinecap="round" />
        : <g fill="#231815"><circle cx="49" cy="58" r="3.6" /><circle cx="71" cy="58" r="3.6" /></g>}
      {look.glasses && <g fill="none" stroke="#231815" strokeWidth="2.4"><circle cx="49" cy="58" r="8" /><circle cx="71" cy="58" r="8" /><path d="M57 58h6" /></g>}
      {!look.beard && <path d="M53 70q7 6 14 0" fill="none" stroke="#231815" strokeWidth="2.8" strokeLinecap="round" />}
      <circle cx="42" cy="68" r="4" fill="#E8977F" opacity=".35" />
      <circle cx="78" cy="68" r="4" fill="#E8977F" opacity=".35" />
    </svg>
  );
}

// The same person seen from behind: sitting at the desk facing the computer.
export function AvatarBack({ look, outfit = "normal", size = 80, label }: { look: AvatarLook; outfit?: Outfit; size?: number; label?: string }) {
  const clothes = outfitColors[outfit];
  const hair = look.hair === "bald" ? look.skin : look.hair_color;
  return (
    <svg className="avatar avatar-back" viewBox="0 0 120 132" width={size} height={size * 1.1} role="img" aria-label={label ?? "Avatar de costas"}>
      <path d="M22 132c0-26 16-40 38-40s38 14 38 40z" fill={clothes.body} />
      <circle cx="31" cy="58" r="6" fill={look.skin} />
      <circle cx="89" cy="58" r="6" fill={look.skin} />
      <circle cx="60" cy="56" r="30" fill={hair} />
      {look.hair === "long" && <path d="M30 56c0 20 6 36 30 36s30-16 30-36z" fill={look.hair_color} />}
      {look.hair === "bun" && <circle cx="60" cy="24" r="12" fill={look.hair_color} />}
      {look.hair === "bald" && <path d="M40 40q20-12 40 0" fill="none" stroke="#000" strokeOpacity=".08" strokeWidth="6" />}
    </svg>
  );
}
