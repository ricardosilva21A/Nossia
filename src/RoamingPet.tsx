import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Mascot as PetArt } from "./Mascot";
import { petLook } from "./mascots";
import type { Pet } from "./mascots";

// The house animal follows you through the menus: it sits by the section you are in and trots
// over to the next one when you change. It only moves when you do, so it costs nothing in between.

const size = 40;
type Spot = { x: number; y: number };

function spotFor(): Spot | null {
  const item = document.querySelector<HTMLElement>(".side-nav .nav-link.active");
  if (!item) return null;
  const rect = item.getBoundingClientRect();
  if (!rect.width) return null;
  // Phone: the menu is a bar at the bottom, so it sits on top of the bar above the button.
  // Computer: the menu is down the side, so it sits just to the right of the button.
  return window.innerWidth <= 760
    ? { x: rect.left + rect.width / 2 - size / 2, y: rect.top - size + 6 }
    : { x: rect.right + 6, y: rect.top + (rect.height - size) / 2 };
}

export function RoamingPet({ pet, section }: { pet: Pet; section: string }) {
  const [spot, setSpot] = useState<Spot | null>(null);
  const [walk, setWalk] = useState({ ms: 0, moving: false, left: false });
  const [happy, setHappy] = useState(false);
  const here = useRef<Spot | null>(null);

  useLayoutEffect(() => {
    const to = spotFor();
    if (!to) return;
    const from = here.current;
    here.current = to;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!from || still) {
      setWalk({ ms: 0, moving: false, left: false });
      setSpot(to);
      return;
    }
    const ms = Math.min(700, Math.max(250, Math.hypot(to.x - from.x, to.y - from.y) * 2.2));
    setWalk({ ms, moving: true, left: to.x < from.x });
    setSpot(to);
    const timer = window.setTimeout(() => setWalk((current) => ({ ...current, moving: false })), ms);
    return () => window.clearTimeout(timer);
  }, [section]);

  useEffect(() => {
    const onResize = () => {
      const to = spotFor();
      if (!to) return;
      here.current = to;
      setWalk({ ms: 0, moving: false, left: false });
      setSpot(to);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!happy) return;
    const timer = window.setTimeout(() => setHappy(false), 1400);
    return () => window.clearTimeout(timer);
  }, [happy]);

  if (!spot) return null;
  return (
    <div className="roaming-layer">
      <button
        type="button"
        className={`roaming-pet${walk.moving ? " is-walking" : ""}${walk.left ? " faces-left" : ""}${happy ? " pet-happy" : ""}`}
        style={{ transform: `translate(${spot.x}px, ${spot.y}px)`, transitionDuration: `${walk.ms}ms` }}
        aria-label={`${pet.name}. Fazer-lhe uma festa`}
        onClick={() => setHappy(true)}
      >
        {happy && <span className="pet-says" aria-hidden="true">Au!</span>}
        <span className="roaming-body"><PetArt look={petLook(pet)} size={size} /></span>
      </button>
    </div>
  );
}

// Per device: some people will want the animal to stay at home.
const roamKey = "nossia-pet-roams";
export function readPetRoams() {
  try {
    return window.localStorage.getItem(roamKey) !== "off";
  } catch {
    return true;
  }
}
export function savePetRoams(on: boolean) {
  try {
    window.localStorage.setItem(roamKey, on ? "on" : "off");
  } catch {
    // Blocked storage: the choice lasts until the page reloads.
  }
}
