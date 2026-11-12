import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
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
import { ZoomOverlay } from "./ZoomOverlay";
import { WallMap } from "./WallMap";
import { HouseGuide } from "./HouseGuide";
// The country outlines are heavy (about 77 KB): they arrive just after the room is drawn.
const WorldMapArt = lazy(() => import("./WorldMapArt").then((module) => ({ default: module.WorldMapArt })));
import { WallWeather } from "./WallWeather";
import { weatherEmoji, weatherLabel } from "./weather";
import type { DailyWeather } from "./weather";
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
  onPlanDay?: (day: string) => void;
  onPlanTrip: () => void;
  onOpenWorldMap: () => void;
  onOpenWindow: () => void;
  // The next days' weather where they live; the window shows today and opens the rest.
  forecast?: DailyWeather[];
  weatherPlace?: string | null;
} & HouseActions;

// What the people and the animal in the house do when tapped.
export type HouseActions = {
  mySlot: HomePartner | null;
  // The first-visit guide: shown once the house is on screen, until they finish or skip it.
  showGuide?: boolean;
  onGuideDone?: () => void;
  // false when the other one has no notifications on: what you send waits until they open the app.
  partnerHasPush?: boolean | null;
  onOpenProfile: () => void;
  onSendAffection: (kind: AffectionKind) => Promise<boolean>;
  onSavePetAccessory: (accessory: Accessory) => Promise<boolean>;
};

export function HouseHero({ scene, mascots, pet, names, pins = [], calendar, today = new Date(), bubble, onOpenAgenda, onPlanDay, onPlanTrip, onOpenWorldMap, onOpenWindow, forecast = [], weatherPlace = null, mySlot, showGuide = false, onGuideDone, partnerHasPush = null, onOpenProfile, onSendAffection, onSavePetAccessory }: Props) {
  // What is open up close, and where on the wall it was, so the zoom starts from there.
  const [closeUp, setCloseUp] = useState<{ what: "map" | "calendar" | "weather"; origin: DOMRect } | null>(null);
  const open = (what: "map" | "calendar" | "weather") => (event: MouseEvent<HTMLButtonElement>) => setCloseUp({ what, origin: event.currentTarget.getBoundingClientRect() });
  const placedPast = pins.filter((pin) => pin.past && pin.x !== null);
  // A new roll each time the house opens, so the animal is doing something different.
  const [roll] = useState(() => Math.random());
  const mode = useMemo(() => decidePetMode(scene.poses, roll), [roll, scene.poses]);

  const [sheet, setSheet] = useState<"affection" | "wardrobe" | null>(null);
  // A small sparkle on each thing that can be tapped, until it has been tapped once (per phone).
  const [tapped, setTapped] = useState<Set<string>>(readTapped);
  const hint = (key: string) => (tapped.has(key) ? "" : " has-hint");
  const noteTap = (event: MouseEvent<HTMLElement>) => {
    const key = (event.target as HTMLElement).closest<HTMLElement>("[data-guide]")?.dataset.guide;
    if (!key || tapped.has(key)) return;
    const next = new Set(tapped).add(key);
    setTapped(next);
    saveTapped(next);
  };
  // Wait until the room, the people and the animal are drawn before pointing at them.
  const [guideReady, setGuideReady] = useState(false);
  useEffect(() => {
    if (!showGuide) { setGuideReady(false); return; }
    const timer = window.setTimeout(() => setGuideReady(true), 700);
    return () => window.clearTimeout(timer);
  }, [showGuide]);
  const finishGuide = useCallback(() => { setGuideReady(false); onGuideDone?.(); }, [onGuideDone]);
  // Now and then the animal barks: a few seconds after the house opens, then every half a minute or so.
  const [barking, setBarking] = useState(false);
  useEffect(() => {
    if (!pet) return;
    let timer = 0;
    const bark = (delay: number) => {
      timer = window.setTimeout(() => {
        if (!document.hidden && !sheet) {
          setBarking(true);
          window.setTimeout(() => setBarking(false), 1500);
        }
        bark(25000 + Math.random() * 20000);
      }, delay);
    };
    bark(3500);
    return () => window.clearTimeout(timer);
  }, [pet, sheet]);
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
      <button type="button" data-guide={slot === mySlot ? "me" : "partner"} className={`house-seat pose-${pose}${hint(slot === mySlot ? "me" : "partner")}`} key={slot} aria-label={personLabel(slot, doing || "em casa")} onClick={() => tapPerson(slot)}>
        <Avatar look={avatarOf(mascot) ?? defaultAvatar} outfit={scene.outfit} size={72} asleep={pose === "sleeping"} label={`Avatar de ${names[slot]}`} />
        {doing && <small>{short(doing)}</small>}
      </button>
    );
  };
  const away = (["partner_one", "partner_two"] as HomePartner[]).filter((slot) => scene.poses[slot] === "away");

  const petButton = pet && (
    // One tap, one thing: the wardrobe. The "Au!" comes back with Marta's animations.
    <button type="button" data-guide="pet" className={`house-pet pet-${mode}${hint("pet")}${barking ? " pet-happy" : ""}`} aria-label={`${pet.name}, ${petLines[mode]}. Escolher o que veste`} onClick={() => setSheet("wardrobe")}>
      {barking && <span className="pet-says" aria-hidden="true">{pet.species === "cat" ? "Miau!" : pet.species === "rabbit" ? "♥" : "Au!"}</span>}
      <PetArt look={petLook(pet)} size={mode === "sofa" ? 48 : 56} asleep={mode === "bed"} />
      {mode === "ball" && <span className="pet-toy" aria-hidden="true" />}
    </button>
  );

  return (
    <section className="house" aria-label="A vossa casa">
      <div className={`house-room${guideReady ? " guide-on" : ""}`} onClickCapture={noteTap}>
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
          <Suspense fallback={null}><WorldMapArt x={374} y={76} width={272} height={116} pins={pins} pinScale={2.2} /></Suspense>
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
            {away.length > 0 && <div className="house-away">{away.map((slot) => <button type="button" key={slot} data-guide={slot === mySlot ? "me" : "partner"} className={`away-pill${hint(slot === mySlot ? "me" : "partner")}`} aria-label={personLabel(slot, scene.doing[slot] || "fora")} onClick={() => tapPerson(slot)}><strong>{names[slot]}</strong> {scene.doing[slot] ? short(scene.doing[slot]) : "fora"}</button>)}</div>}
          </>}
        {mode !== "sofa" && petButton}
        <button type="button" data-guide="map" className={`house-spot spot-map${hint("map")}`} aria-label={placedPast.length ? `Mapa-mundo com pins em ${placedPast.map((pin) => pin.title).join(", ")}. Ver de perto` : "Mapa-mundo das viagens. Ver de perto"} onClick={open("map")} />
        <button type="button" data-guide="calendar" className={`house-spot spot-calendar${hint("calendar")}`} aria-label="Ver o calendário de perto" onClick={open("calendar")} />
        {forecast[0] && <span className="house-weather" aria-hidden="true">{weatherEmoji(forecast[0].weatherCode)} {Math.round(forecast[0].temperatureMax)}°</span>}
        <button type="button" data-guide="window" className={`house-spot spot-window${hint("window")}`} aria-label={forecast[0] ? `Hoje: ${weatherLabel(forecast[0]).toLowerCase()}, até ${Math.round(forecast[0].temperatureMax)} graus. Ver os próximos dias` : "Escolher a localização para o tempo"} onClick={forecast[0] ? open("weather") : onOpenWindow} />
      </div>
      <div className="house-bubble" data-guide="bubble">{bubble}</div>
      {guideReady && <HouseGuide pet={pet} names={{ me: mySlot ? names[mySlot] : "", partner: partnerSlot ? names[partnerSlot] : "" }} onDone={finishGuide} />}
      {sheet === "affection" && partnerSlot && <AffectionSheet name={names[partnerSlot]} look={partnerLook} notified={partnerHasPush} onSend={onSendAffection} onClose={() => setSheet(null)} />}
      {sheet === "wardrobe" && pet && <WardrobeSheet pet={pet} onSave={onSavePetAccessory} onClose={() => setSheet(null)} />}
      {closeUp?.what === "weather" && <ZoomOverlay origin={closeUp.origin} label="O tempo" className="zoom-weather" onClose={() => setCloseUp(null)}>
        {(close) => <WallWeather forecast={forecast} place={weatherPlace} onChangePlace={() => { close(); window.setTimeout(onOpenWindow, 470); }} />}
      </ZoomOverlay>}
      {closeUp?.what === "map" && <ZoomOverlay origin={closeUp.origin} label="Mapa das viagens" className="zoom-map" onClose={() => setCloseUp(null)}>
        {(close) => <WallMap pins={pins} onPlanTrip={() => { close(); window.setTimeout(onPlanTrip, 470); }} onOpenWorldMap={() => { close(); window.setTimeout(onOpenWorldMap, 470); }} />}
      </ZoomOverlay>}
      {closeUp?.what === "calendar" && <ZoomOverlay origin={closeUp.origin} label="Calendário" className="zoom-calendar" onClose={() => setCloseUp(null)}>
        {(close) => <WallCalendar today={today} {...calendar} onOpenAgenda={() => { close(); window.setTimeout(onOpenAgenda, 470); }} onPlanDay={onPlanDay ? (day) => { close(); window.setTimeout(() => onPlanDay(day), 470); } : undefined} />}
      </ZoomOverlay>}
    </section>
  );
}

const tappedKey = "nossia-house-tapped";
function readTapped() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(tappedKey) ?? "[]");
    return new Set<string>(Array.isArray(saved) ? saved.filter((item): item is string => typeof item === "string") : []);
  } catch {
    return new Set<string>();
  }
}
function saveTapped(keys: Set<string>) {
  try {
    window.localStorage.setItem(tappedKey, JSON.stringify([...keys]));
  } catch {
    // Blocked storage: the sparkles come back next visit, which is harmless.
  }
}
