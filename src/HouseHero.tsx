import type { ReactNode } from "react";
import { Avatar } from "./Avatar";
import { Mascot as PetArt } from "./Mascot";
import { avatarOf, defaultAvatar, petLook } from "./mascots";
import type { Mascot, Pet } from "./mascots";
import type { HouseScene, SeasonalObject, WindowView } from "./house";
import type { HomePartner } from "./types";

// A placeholder room. Marta's image replaces the <svg> below; the shortcuts are placed in
// percentages so they keep working on top of it.
const sky: Record<WindowView, string> = { sun: "#bfe3f5", clouds: "#d5dde3", rain: "#9fb0bd", fog: "#e3e3df", night: "#26304f" };
const seasonalEmoji: Record<SeasonalObject, string> = { tree: "🎄", chestnuts: "🌰", basil: "🌿", mask: "🎭" };

type Props = {
  scene: HouseScene;
  mascots: Mascot[];
  pet: Pet | null;
  names: Record<HomePartner, string>;
  bubble: ReactNode;
  onOpenFridge: () => void;
  onOpenCalendar: () => void;
  onOpenWindow: () => void;
};

export function HouseHero({ scene, mascots, pet, names, bubble, onOpenFridge, onOpenCalendar, onOpenWindow }: Props) {
  const seat = (slot: HomePartner) => {
    const mascot = mascots.find((item) => item.partner_slot === slot);
    const pose = scene.poses[slot];
    const doing = scene.doing[slot];
    if (pose === "away") return <div className="house-seat is-away" key={slot}><small><strong>{names[slot]}</strong>{doing}</small></div>;
    if (!mascot) return <div className="house-seat" key={slot}><span className="mascot-waiting" aria-hidden="true">?</span><small>À espera de {names[slot]}</small></div>;
    return <div className={`house-seat pose-${pose}`} key={slot}><Avatar look={avatarOf(mascot) ?? defaultAvatar} outfit={scene.outfit} size={72} asleep={pose === "sleeping"} label={`Avatar de ${names[slot]}`} /><small>{names[slot]}{doing ? ` · ${doing}` : ""}</small></div>;
  };

  return (
    <section className="house" aria-label="A vossa casa">
      <div className="house-room">
        <svg className="house-art" viewBox="0 0 1080 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect width="1080" height="400" fill="#f4e8d4" />
          <rect y="400" width="1080" height="120" fill="#d8bd97" />
          <rect x="430" y="50" width="220" height="170" rx="10" fill={sky[scene.window]} stroke="#fff" strokeWidth="12" />
          <path d="M540 50v170M430 135h220" stroke="#fff" strokeWidth="8" />
          <rect x="60" y="130" width="160" height="290" rx="16" fill="#fbfaf6" stroke="#d9d3c4" strokeWidth="4" />
          <path d="M60 240h160" stroke="#d9d3c4" strokeWidth="4" />
          <rect x="860" y="70" width="150" height="140" rx="8" fill="#fff" stroke="#d9d3c4" strokeWidth="4" />
          <rect x="860" y="70" width="150" height="36" rx="8" fill="#4d0e12" />
          <rect x="310" y="300" width="460" height="130" rx="30" fill="#a5bcd6" />
          <rect x="290" y="340" width="500" height="100" rx="28" fill="#93abc8" />
        </svg>
        {scene.seasonal && <span className="house-seasonal" aria-hidden="true">{seasonalEmoji[scene.seasonal]}</span>}
        {scene.fan && <span className="house-fan" aria-hidden="true">🌀</span>}
        {scene.together && scene.dateNow
          ? <div className="house-seats"><div className="house-seat is-away house-out"><small><strong>Os dois em date</strong>{scene.dateNow.title}</small></div></div>
          : <div className="house-seats">{seat("partner_one")}{seat("partner_two")}</div>}
        {pet && <div className="house-pet" aria-label={`${pet.name}, o animal da casa`}><PetArt look={petLook(pet)} size={56} asleep={scene.poses.partner_one === "sleeping" && scene.poses.partner_two === "sleeping"} /><small>{pet.name}</small></div>}
        <button type="button" className="house-spot spot-fridge" aria-label="Abrir o mapa-mundo das viagens" onClick={onOpenFridge} />
        <button type="button" className="house-spot spot-calendar" aria-label="Abrir o calendário" onClick={onOpenCalendar} />
        <button type="button" className="house-spot spot-window" aria-label="Ver o tempo" onClick={onOpenWindow} />
      </div>
      <div className="house-bubble">{bubble}</div>
    </section>
  );
}
