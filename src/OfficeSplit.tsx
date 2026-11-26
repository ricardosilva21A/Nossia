import { Avatar } from "./Avatar";
import { avatarOf, defaultAvatar } from "./mascots";
import type { Mascot, WorkKind } from "./mascots";
import type { HouseScene } from "./house";
import type { HomePartner } from "./types";

// Work days: when both are at work, Hoje splits in two, each one at their own desk. The screen
// shows what they do (code, design or a spreadsheet) and the wall has the name of the workplace.
// Placeholder drawings until Marta draws the offices.

const walls: Record<WorkKind, string> = { tech: "#e3e8ef", design: "#f2e4e8", office: "#ece5d6" };
const skies = { sun: "#bfe3f5", clouds: "#d5dde3", rain: "#9fb0bd", fog: "#e3e3df", night: "#26304f" } as const;

function Screen({ kind }: { kind: WorkKind }) {
  if (kind === "tech") return <g>
    <rect x="58" y="150" width="176" height="104" rx="4" fill="#1f2733" />
    {[["#7fd1b9", 70, 74], ["#e3c07a", 82, 96], ["#9fb8e8", 82, 60], ["#e79c8c", 94, 84], ["#7fd1b9", 82, 44], ["#9fb8e8", 70, 102], ["#e3c07a", 82, 70]].map(([color, x, width], index) => <rect key={index} x={x as number} y={162 + index * 12} width={width as number} height="5" rx="2.5" fill={color as string} />)}
    <rect className="office-cursor" x="156" y="234" width="7" height="9" fill="#fffdf3" />
  </g>;
  if (kind === "design") return <g>
    <rect x="58" y="150" width="176" height="104" rx="4" fill="#fffdf3" />
    <rect x="58" y="150" width="24" height="104" fill="#ebe4d3" />
    {["#4d0e12", "#e3c07a", "#93abc8", "#6b8f71"].map((color, index) => <circle key={color} cx="70" cy={164 + index * 18} r="6" fill={color} />)}
    <circle cx="140" cy="196" r="28" fill="#e3c07a" />
    <rect x="160" y="182" width="52" height="44" rx="8" fill="#93abc8" opacity=".9" />
    <path d="M104 236c18-18 40 6 64-10" stroke="#4d0e12" strokeWidth="4" fill="none" strokeLinecap="round" />
  </g>;
  return <g>
    <rect x="58" y="150" width="176" height="104" rx="4" fill="#fffdf3" />
    <rect x="58" y="150" width="176" height="14" fill="#6b8f71" />
    {Array.from({ length: 5 }, (_, row) => <path key={row} d={`M58 ${180 + row * 15}h176`} stroke="#d9d3c4" strokeWidth="2" />)}
    {[100, 146, 192].map((x) => <path key={x} d={`M${x} 164v90`} stroke="#d9d3c4" strokeWidth="2" />)}
    <rect x="152" y="200" width="34" height="10" fill="#e3c07a" />
  </g>;
}

function Desk({ slot, scene, mascot, name, doing, label, onTap }: { slot: HomePartner; scene: HouseScene; mascot: Mascot | null; name: string; doing: string | null; label?: string; onTap?: () => void }) {
  const kind: WorkKind = mascot?.work_kind ?? "office";
  const place = mascot?.workplace?.trim() || null;
  const until = doing?.replace(/^a trabalhar /, "") ?? null;
  return (
    <button type="button" className={`office-half office-${kind}`} aria-label={label ?? `${name} a trabalhar${place ? ` na ${place}` : ""}${until ? `, ${until}` : ""}`} onClick={onTap} disabled={!onTap}>
      <svg className="office-art" viewBox="0 0 540 380" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="540" height="380" fill={walls[kind]} />
        <rect y="318" width="540" height="62" fill="#c9b79a" />
        {/* Window over the city */}
        <rect x="40" y="36" width="170" height="92" rx="6" fill={skies[scene.window]} stroke="#fff" strokeWidth="8" />
        <path d="M52 128v-34h22v-16h20v50M108 128v-44h26v44M146 128v-28h18v-12h22v40" fill="#9aa7b4" opacity=".75" />
        {/* Chair, behind the person */}
        <rect x="318" y="168" width="104" height="104" rx="18" fill="#3d4654" />
        <path d="M370 290v34M342 330h56" stroke="#3d4654" strokeWidth="8" strokeLinecap="round" />
        {kind === "design" && <path d="M470 120c-14-30-6-56 12-64 4 24-2 46-12 64zM480 120c2-26 14-44 30-48-2 22-14 38-30 48z" fill="#6B8F71" />}
        {kind === "design" && <rect x="462" y="118" width="38" height="40" rx="6" fill="#C97B63" />}
      </svg>
      <span className={`office-person${slot === "partner_two" ? " is-two" : ""}`}><Avatar look={avatarOf(mascot) ?? defaultAvatar} outfit={scene.outfit} size={78} label={`Avatar de ${name}`} /></span>
      <svg className="office-art office-front" viewBox="0 0 540 380" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {/* Monitor on the desk, turned so the screen shows */}
        <rect x="48" y="140" width="196" height="124" rx="10" fill="#2c2c2c" />
        <Screen kind={kind} />
        <path d="M138 264v16M110 282h56" stroke="#2c2c2c" strokeWidth="8" strokeLinecap="round" />
        {/* Desk */}
        <rect x="20" y="282" width="500" height="18" rx="5" fill="#a07a58" />
        <rect x="40" y="300" width="14" height="72" fill="#8a6748" />
        <rect x="486" y="300" width="14" height="72" fill="#8a6748" />
        {kind === "design" ? <rect x="270" y="270" width="78" height="12" rx="4" fill="#3d4654" /> : <rect x="262" y="272" width="96" height="10" rx="3" fill="#e9e4d8" />}
        {kind === "design" && <path d="M352 262l26 18" stroke="#231815" strokeWidth="4" strokeLinecap="round" />}
        <rect x="420" y="256" width="22" height="26" rx="4" fill="#fffdf3" stroke="#c9b79a" strokeWidth="3" />
      </svg>
      {place && <span className="office-sign">{place}</span>}
      <span className="office-label"><strong>{name}</strong>{until ? ` ${until}` : ""}</span>
    </button>
  );
}

// Tapping someone does the same as in the house: yourself opens your profile, the other one gets a kiss, a hug or "saudades".
export function OfficeSplit({ scene, mascots, names, labelFor, onTap }: { scene: HouseScene; mascots: Mascot[]; names: Record<HomePartner, string>; labelFor?: (slot: HomePartner) => string; onTap?: (slot: HomePartner) => void }) {
  const slots: HomePartner[] = ["partner_one", "partner_two"];
  return (
    <section className="office-split" aria-label="Os dois a trabalhar">
      {slots.map((slot) => <Desk key={slot} slot={slot} scene={scene} mascot={mascots.find((item) => item.partner_slot === slot) ?? null} name={names[slot]} doing={scene.doing[slot]} label={labelFor?.(slot)} onTap={onTap ? () => onTap(slot) : undefined} />)}
    </section>
  );
}
