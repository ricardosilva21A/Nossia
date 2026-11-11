import { useEffect, useMemo, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { Avatar } from "./Avatar";
import { Mascot as PetArt } from "./Mascot";
import { avatarOf, defaultAvatar, petLook } from "./mascots";
import type { Accessory, Mascot, Pet } from "./mascots";
import type { AffectionKind } from "./affections";
import { AffectionSheet, WardrobeSheet } from "./HouseSheets";
import { decidePetMode } from "./house";
import type { CalendarData, HouseScene, PetMode, SeasonalObject, TripPin, WindowView } from "./house";
import { WallCalendar } from "./WallCalendar";
import { WallMap } from "./WallMap";
import { WorldMapArt } from "./WorldMapArt";
import { ZoomOverlay } from "./ZoomOverlay";
import type { HomePartner } from "./types";

// A placeholder room. Marta's image replaces the <svg> below; the shortcuts are placed in
// percentages so they keep working on top of it.
const sky: Record<WindowView, string> = { sun: "#bfe3f5", clouds: "#d5dde3", rain: "#9fb0bd", fog: "#e3e3df", night: "#26304f" };
const seasonalEmoji: Record<SeasonalObject, string> = { tree: "🎄", chestnuts: "🌰", basil: "🌿", mask: "🎭" };
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
  pins?: TripPin[];
  calendar: CalendarData;
  today?: Date;
  bubble: ReactNode;
  onOpenAgenda: () => void;
  onPlanTrip: () => void;
  onOpenWorldMap: () => void;
  onOpenWindow: () => void;
} & HouseActions;

// What the people and the animal in the house do when tapped.
export type HouseActions = {
  mySlot: HomePartner | null;
  onOpenProfile: () => void;
  onSendAffection: (kind: AffectionKind) => Promise<boolean>;
  onSavePetAccessory: (accessory: Accessory) => Promise<boolean>;
};

export function HouseHero({ scene, mascots, pet, names, pins = [], calendar, today = new Date(), bubble, onOpenAgenda, onPlanTrip, onOpenWorldMap, onOpenWindow, mySlot, onOpenProfile, onSendAffection, onSavePetAccessory }: Props) {
  // What is open up close, and where on the wall it was, so the zoom starts from there.
  const [closeUp, setCloseUp] = useState<{ what: "map" | "calendar"; origin: DOMRect } | null>(null);
  const open = (what: "map" | "calendar") => (event: MouseEvent<HTMLButtonElement>) => setCloseUp({ what, origin: event.currentTarget.getBoundingClientRect() });
  const placedPast = pins.filter((pin) => pin.past && pin.x !== null);
  // A new roll each time the house opens, so the animal is doing something different.
  const [roll] = useState(() => Math.random());
  const mode = useMemo(() => decidePetMode(scene.poses, roll), [roll, scene.poses]);
  const [happy, setHappy] = useState(false);
  useEffect(() => {
    if (!happy) return;
    const timer = window.setTimeout(() => setHappy(false), 1600);
    return () => window.clearTimeout(timer);
  }, [happy]);

  const [sheet, setSheet] = useState<"affection" | "wardrobe" | null>(null);
  const partnerSlot: HomePartner | null = mySlot ? (mySlot === "partner_one" ? "partner_two" : "partner_one") : null;
  const partnerLook = partnerSlot ? avatarOf(mascots.find((item) => item.partner_slot === partnerSlot) ?? null) : null;
  // Tapping yourself opens your profile; tapping the other one sends them something.
  const tapPerson = (slot: HomePartner) => {
    if (slot === mySlot) onOpenProfile();
    else setSheet("affection");
  };
  const personLabel = (slot: HomePartner, where: string) => slot === mySlot ? `${names[slot]}, ${where}. Abrir o teu perfil` : `${names[slot]}, ${where}. Mandar-lhe um carinho`;
  const short = (doing: string) => doing.replace("a trabalhar até às", "trabalho até").replace(" até às ", " até ");

  const seat = (slot: HomePartner) => {
    const mascot = mascots.find((item) => item.partner_slot === slot);
    const pose = scene.poses[slot];
    const doing = scene.doing[slot];
    if (pose === "away") return null;
    if (!mascot) return <div className="house-seat" key={slot}><span className="mascot-waiting" aria-label={`À espera de ${names[slot]}`}>?</span></div>;
    return (
      <button type="button" className={`house-seat pose-${pose}`} key={slot} aria-label={personLabel(slot, doing || "em casa")} onClick={() => tapPerson(slot)}>
        <Avatar look={avatarOf(mascot) ?? defaultAvatar} outfit={scene.outfit} size={72} asleep={pose === "sleeping"} label={`Avatar de ${names[slot]}`} />
        {doing && <small>{short(doing)}</small>}
      </button>
    );
  };
  const away = (["partner_one", "partner_two"] as HomePartner[]).filter((slot) => scene.poses[slot] === "away");

  const petButton = pet && (
    <button type="button" className={`house-pet pet-${mode}${happy ? " pet-happy" : ""}`} aria-label={`${pet.name}, ${petLines[mode]}. Escolher o que veste`} onClick={() => { setHappy(true); window.setTimeout(() => setSheet("wardrobe"), 450); }}>
      {happy && <span className="pet-says" aria-hidden="true">Au!</span>}
      <PetArt look={petLook(pet)} size={mode === "sofa" ? 48 : 56} asleep={mode === "bed" && !happy} />
      {mode === "ball" && <span className="pet-toy" aria-hidden="true" />}
    </button>
  );

  return (
    <section className="house" aria-label="A vossa casa">
      <div className="house-room">
        <svg className="house-art" viewBox="0 0 1080 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect width="1080" height="400" fill="#f4e8d4" />
          <rect y="400" width="1080" height="120" fill="#d8bd97" />
          {/* Window, in the left corner */}
          <rect x="80" y="60" width="200" height="160" rx="10" fill={sky[scene.window]} stroke="#fff" strokeWidth="12" />
          <path d="M180 60v160M80 140h200" stroke="#fff" strokeWidth="8" />
          <rect x="66" y="222" width="228" height="12" rx="4" fill="#e9dcc3" />
          {/* A plant under the window */}
          <path d="M160 330c-30-30-34-62-18-76 10 22 16 46 18 76zM172 330c4-36 18-62 40-70 0 30-16 54-40 70zM166 330c-6-40-2-70 8-84 8 26 4 56-8 84z" fill="#6B8F71" />
          <path d="M138 328h60l-8 70h-44z" fill="#C97B63" />
          {/* World map in a wooden frame, with a pin for every trip */}
          <rect x="356" y="58" width="308" height="152" rx="8" fill="#6B4A35" />
          <rect x="368" y="70" width="284" height="128" rx="3" fill="#EADBBE" />
          <path d="M368 102h284M368 134h284M368 166h284" stroke="#DCC9A6" strokeWidth="2" />
          <WorldMapArt x={374} y={76} width={272} height={116} pins={pins} pinScale={2.2} />
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
          ? <div className="house-away"><span className="away-pill">♥ Os dois em date · {scene.dateNow.title}</span></div>
          : <>
            <div className="house-seats">{seat("partner_one")}{mode === "sofa" && petButton}{seat("partner_two")}</div>
            {away.length > 0 && <div className="house-away">{away.map((slot) => <button type="button" key={slot} className="away-pill" aria-label={personLabel(slot, scene.doing[slot] || "fora")} onClick={() => tapPerson(slot)}><strong>{names[slot]}</strong> {scene.doing[slot] ? short(scene.doing[slot]) : "fora"}</button>)}</div>}
          </>}
        {mode !== "sofa" && petButton}
        <button type="button" className="house-spot spot-map" aria-label={placedPast.length ? `Mapa-mundo com pins em ${placedPast.map((pin) => pin.title).join(", ")}. Ver de perto` : "Mapa-mundo das viagens. Ver de perto"} onClick={open("map")} />
        <button type="button" className="house-spot spot-calendar" aria-label="Ver o calendário de perto" onClick={open("calendar")} />
        <button type="button" className="house-spot spot-window" aria-label="Ver o tempo" onClick={onOpenWindow} />
      </div>
      <div className="house-bubble">{bubble}</div>
      {sheet === "affection" && partnerSlot && <AffectionSheet name={names[partnerSlot]} look={partnerLook} onSend={onSendAffection} onClose={() => setSheet(null)} />}
      {sheet === "wardrobe" && pet && <WardrobeSheet pet={pet} onSave={onSavePetAccessory} onClose={() => setSheet(null)} />}
      {closeUp?.what === "map" && <ZoomOverlay origin={closeUp.origin} label="Mapa das viagens" className="zoom-map" onClose={() => setCloseUp(null)}>
        {(close) => <WallMap pins={pins} onPlanTrip={() => { close(); window.setTimeout(onPlanTrip, 470); }} onOpenWorldMap={() => { close(); window.setTimeout(onOpenWorldMap, 470); }} />}
      </ZoomOverlay>}
      {closeUp?.what === "calendar" && <ZoomOverlay origin={closeUp.origin} label="Calendário" className="zoom-calendar" onClose={() => setCloseUp(null)}>
        {(close) => <WallCalendar today={today} {...calendar} onOpenAgenda={() => { close(); window.setTimeout(onOpenAgenda, 470); }} />}
      </ZoomOverlay>}
    </section>
  );
}
