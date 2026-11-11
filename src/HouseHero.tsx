import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Avatar } from "./Avatar";
import { Mascot as PetArt } from "./Mascot";
import { avatarOf, defaultAvatar, petLook } from "./mascots";
import type { Mascot, Pet } from "./mascots";
import { decidePetMode } from "./house";
import type { HouseScene, PetMode, SeasonalObject, WindowView } from "./house";
import type { HomePartner } from "./types";

// A placeholder room. Marta's image replaces the <svg> below; the shortcuts are placed in
// percentages so they keep working on top of it.
const sky: Record<WindowView, string> = { sun: "#bfe3f5", clouds: "#d5dde3", rain: "#9fb0bd", fog: "#e3e3df", night: "#26304f" };
const seasonalEmoji: Record<SeasonalObject, string> = { tree: "🎄", chestnuts: "🌰", basil: "🌿", mask: "🎭" };
const magnetColors = ["#4D0E12", "#A5BCD6", "#D9A86C", "#4A2E27", "#93ABC8"];
const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const petLines: Record<PetMode, string> = {
  door: "à vossa espera",
  bed: "a dormir na caminha",
  sofa: "no meio de vocês",
  ball: "a brincar com a bola",
  running: "a correr pela sala",
  sitting: "por perto",
};

type Props = {
  scene: HouseScene;
  mascots: Mascot[];
  pet: Pet | null;
  names: Record<HomePartner, string>;
  magnets?: string[];
  today?: Date;
  bubble: ReactNode;
  onOpenFridge: () => void;
  onOpenCalendar: () => void;
  onOpenWindow: () => void;
};

export function HouseHero({ scene, mascots, pet, names, magnets = [], today = new Date(), bubble, onOpenFridge, onOpenCalendar, onOpenWindow }: Props) {
  // A new roll each time the house opens, so the animal is doing something different.
  const [roll] = useState(() => Math.random());
  const mode = useMemo(() => decidePetMode(scene.poses, roll), [roll, scene.poses]);
  const [happy, setHappy] = useState(false);
  useEffect(() => {
    if (!happy) return;
    const timer = window.setTimeout(() => setHappy(false), 1600);
    return () => window.clearTimeout(timer);
  }, [happy]);

  const seat = (slot: HomePartner) => {
    const mascot = mascots.find((item) => item.partner_slot === slot);
    const pose = scene.poses[slot];
    const doing = scene.doing[slot];
    if (pose === "away") return <div className="house-seat is-away" key={slot}><small><strong>{names[slot]}</strong>{doing}</small></div>;
    if (!mascot) return <div className="house-seat" key={slot}><span className="mascot-waiting" aria-hidden="true">?</span><small>À espera de {names[slot]}</small></div>;
    return <div className={`house-seat pose-${pose}`} key={slot}><Avatar look={avatarOf(mascot) ?? defaultAvatar} outfit={scene.outfit} size={72} asleep={pose === "sleeping"} label={`Avatar de ${names[slot]}`} /><small>{names[slot]}{doing ? ` · ${doing}` : ""}</small></div>;
  };

  const petButton = pet && (
    <button type="button" className={`house-pet pet-${mode}${happy ? " pet-happy" : ""}`} aria-label={`${pet.name}, ${petLines[mode]}. Fazer-lhe uma festa`} onClick={() => setHappy(true)}>
      {happy && <span className="pet-says" aria-hidden="true">Au!</span>}
      <PetArt look={petLook(pet)} size={mode === "sofa" ? 48 : 56} asleep={mode === "bed" && !happy} />
      {mode === "ball" && <span className="pet-toy" aria-hidden="true" />}
      <small>{pet.name}</small>
    </button>
  );

  return (
    <section className="house" aria-label="A vossa casa">
      <div className="house-room">
        <svg className="house-art" viewBox="0 0 1080 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect width="1080" height="400" fill="#f4e8d4" />
          <rect y="400" width="1080" height="120" fill="#d8bd97" />
          <rect x="430" y="50" width="220" height="170" rx="10" fill={sky[scene.window]} stroke="#fff" strokeWidth="12" />
          <path d="M540 50v170M430 135h220" stroke="#fff" strokeWidth="8" />
          {/* Fridge with a magnet for each place they've been */}
          <rect x="90" y="130" width="130" height="290" rx="16" fill="#fbfaf6" stroke="#d9d3c4" strokeWidth="4" />
          <path d="M90 240h130" stroke="#d9d3c4" strokeWidth="4" />
          {magnets.map((name, index) => {
            const y = 150 + index * 50 + (index > 0 ? 20 : 0);
            const label = name.length > 10 ? `${name.slice(0, 9)}…` : name;
            const color = magnetColors[index % magnetColors.length];
            return <g key={name} transform={`rotate(${index % 2 ? 4 : -4} 155 ${y + 17})`}><rect x="99" y={y} width="112" height="34" rx="8" fill={color} /><text x="155" y={y + 23} textAnchor="middle" fontSize="17" fontWeight="700" fontFamily="DM Sans, sans-serif" fill={index % 5 === 1 || index % 5 === 4 ? "#231815" : "#F5EFC6"}>{label}</text></g>;
          })}
          {/* Wall calendar with today's date */}
          <rect x="700" y="70" width="130" height="130" rx="8" fill="#fff" stroke="#d9d3c4" strokeWidth="4" />
          <rect x="700" y="70" width="130" height="34" rx="8" fill="#4d0e12" />
          <text x="765" y="95" textAnchor="middle" fontSize="20" fontWeight="700" fontFamily="DM Sans, sans-serif" fill="#F5EFC6">{months[today.getMonth()]}</text>
          <text x="765" y="168" textAnchor="middle" fontSize="54" fontWeight="700" fontFamily="DM Sans, sans-serif" fill="#231815">{today.getDate()}</text>
          {scene.dateNow && <path d="M808 180c-6-7-16-1-10 7l10 9 10-9c6-8-4-14-10-7z" fill="#4d0e12" />}
          {/* Front door */}
          <rect x="860" y="170" width="110" height="232" rx="6" fill="#8C5A3C" />
          <rect x="872" y="184" width="86" height="90" rx="4" fill="#9c6a4a" />
          <circle cx="950" cy="300" r="7" fill="#E3C07A" />
          {/* The animal's bed */}
          <ellipse cx="300" cy="440" rx="66" ry="22" fill="#4D0E12" />
          <ellipse cx="300" cy="434" rx="52" ry="14" fill="#E4ECF5" />
          {/* Sofa */}
          <rect x="465" y="300" width="330" height="130" rx="30" fill="#a5bcd6" />
          <rect x="445" y="340" width="370" height="100" rx="28" fill="#93abc8" />
        </svg>
        {scene.seasonal && <span className="house-seasonal" aria-hidden="true">{seasonalEmoji[scene.seasonal]}</span>}
        {scene.fan && <span className="house-fan" aria-hidden="true">🌀</span>}
        {scene.together && scene.dateNow
          ? <div className="house-seats"><div className="house-seat is-away house-out"><small><strong>Os dois em date</strong>{scene.dateNow.title}</small></div></div>
          : <div className={`house-seats${scene.poses.partner_one === "away" && scene.poses.partner_two === "away" ? " both-away" : ""}`}>{seat("partner_one")}{mode === "sofa" && petButton}{seat("partner_two")}</div>}
        {mode !== "sofa" && petButton}
        <button type="button" className="house-spot spot-fridge" aria-label={magnets.length ? `Frigorífico com ímanes de ${magnets.join(", ")}. Abrir o mapa-mundo` : "Abrir o mapa-mundo das viagens"} onClick={onOpenFridge} />
        <button type="button" className="house-spot spot-calendar" aria-label="Abrir a agenda" onClick={onOpenCalendar} />
        <button type="button" className="house-spot spot-window" aria-label="Ver o tempo" onClick={onOpenWindow} />
      </div>
      <div className="house-bubble">{bubble}</div>
    </section>
  );
}
