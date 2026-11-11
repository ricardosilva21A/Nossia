// A placeholder until Marta's drawings exist. Everything that shows a mascot goes through this
// component, so replacing the art doesn't touch the rest of the app.

import type { Ears, MascotLook } from "./mascots";

const earShapes: Record<Ears, string> = {
  round: "M26 34a13 13 0 1 1 18-14zM94 34a13 13 0 1 0-18-14z",
  cat: "M22 44 24 8l26 18zM98 44 96 8 70 26z",
  dog: "M26 24C10 26 8 58 18 70c8-4 14-20 16-38zM94 24c16 2 18 34 8 46-8-4-14-20-16-38z",
  rabbit: "M34 34C24 14 28-6 40-8c10 2 12 22 8 38zM86 34c10-20 6-40-6-42-10 2-12 22-8 38z",
};

export function Mascot({ look, size = 96, asleep = false }: { look: MascotLook; size?: number; asleep?: boolean }) {
  const eye = asleep ? { d: "M44 58q6 5 12 0M64 58q6 5 12 0", fill: "none" } : null;
  return (
    <svg className="mascot" viewBox="0 -12 120 132" width={size} height={size * 1.1} role="img" aria-label={look.name}>
      <path d={earShapes[look.ears]} fill={look.color} />
      <ellipse cx="60" cy="72" rx="44" ry="42" fill={look.color} />
      {look.pattern === "spots" && <g fill="#000" opacity=".14"><circle cx="34" cy="60" r="7" /><circle cx="86" cy="52" r="5" /><circle cx="78" cy="94" r="8" /><circle cx="42" cy="96" r="5" /></g>}
      {look.pattern === "stripes" && <g stroke="#000" strokeOpacity=".14" strokeWidth="6" strokeLinecap="round"><path d="M46 34v14M60 32v14M74 34v14" /></g>}
      <ellipse cx="60" cy="84" rx="24" ry="20" fill="#fff" opacity=".55" />
      {eye ? <path d={eye.d} fill="none" stroke="#231815" strokeWidth="3.5" strokeLinecap="round" /> : <g fill="#231815"><circle cx="48" cy="60" r="5" /><circle cx="72" cy="60" r="5" /></g>}
      {look.ears === "dog" || look.ears === "cat" || look.ears === "rabbit" ? <><ellipse cx="60" cy="72" rx="6" ry="4.5" fill="#231815" /><path d="M54 80q6 5 12 0" fill="none" stroke="#231815" strokeWidth="3" strokeLinecap="round" /></> : <path d="M54 74q6 6 12 0" fill="none" stroke="#231815" strokeWidth="3" strokeLinecap="round" />}
    </svg>
  );
}
