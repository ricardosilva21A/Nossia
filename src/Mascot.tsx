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
    <svg className="mascot" viewBox="0 -18 120 152" width={size} height={size * 1.27} role="img" aria-label={look.name}>
      <path d={earShapes[look.ears]} fill={look.color} />
      <ellipse cx="60" cy="72" rx="44" ry="42" fill={look.color} />
      {look.pattern === "spots" && <g fill="#000" opacity=".14"><circle cx="34" cy="60" r="7" /><circle cx="86" cy="52" r="5" /><circle cx="78" cy="94" r="8" /><circle cx="42" cy="96" r="5" /></g>}
      {look.pattern === "stripes" && <g stroke="#000" strokeOpacity=".14" strokeWidth="6" strokeLinecap="round"><path d="M46 34v14M60 32v14M74 34v14" /></g>}
      <ellipse cx="60" cy="84" rx="24" ry="20" fill="#fff" opacity=".55" />
      {eye ? <path d={eye.d} fill="none" stroke="#231815" strokeWidth="3.5" strokeLinecap="round" /> : <g fill="#231815"><circle cx="48" cy="60" r="5" /><circle cx="72" cy="60" r="5" /></g>}
      {look.accessory === "gorro" && <g><path d="M16 50c0-30 20-44 44-44s44 14 44 44z" fill="#4D0E12" /><rect x="14" y="42" width="92" height="12" rx="6" fill="#A5BCD6" /><circle cx="60" cy="4" r="9" fill="#F5EFC6" /></g>}
      {look.accessory === "chapeu" && <g><path d="M60-8 42 34h36z" fill="#E3C07A" /><path d="M51 13h18M47 24h26" stroke="#4D0E12" strokeWidth="3" /><circle cx="60" cy="-9" r="6" fill="#A5BCD6" /></g>}
      {look.accessory === "laco" && <g fill="#A5BCD6" stroke="#3D5A7A" strokeWidth="2"><path d="M86 30 70 20v20zM86 30l16-10v20z" /><circle cx="86" cy="30" r="5" fill="#3D5A7A" /></g>}
      {look.accessory === "oculos" && <g><rect x="34" y="51" width="26" height="18" rx="8" fill="#231815" /><rect x="62" y="51" width="26" height="18" rx="8" fill="#231815" /><path d="M58 56h6M34 56l-8-4M88 56l8-4" stroke="#231815" strokeWidth="3" /><path d="M39 56h8" stroke="#ffffff66" strokeWidth="3" strokeLinecap="round" /></g>}
      {look.accessory === "lenco" && <g fill="#4D0E12"><path d="M24 100q36 22 72 0l-3 10q-33 18-66 0z" /><path d="M48 114l12 16 12-16z" /><circle cx="56" cy="117" r="1.6" fill="#F5EFC6" /><circle cx="64" cy="117" r="1.6" fill="#F5EFC6" /></g>}
      {look.ears === "dog" || look.ears === "cat" || look.ears === "rabbit" ? <><ellipse cx="60" cy="72" rx="6" ry="4.5" fill="#231815" /><path d="M54 80q6 5 12 0" fill="none" stroke="#231815" strokeWidth="3" strokeLinecap="round" /></> : <path d="M54 74q6 6 12 0" fill="none" stroke="#231815" strokeWidth="3" strokeLinecap="round" />}
    </svg>
  );
}
