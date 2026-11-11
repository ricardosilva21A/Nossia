import { useEffect, useRef, useState } from "react";
import { Mascot as PetArt } from "./Mascot";
import { petLook } from "./mascots";
import type { Pet } from "./mascots";

// The house animal, loose in the rest of the app: it wanders between cards, sometimes pops up
// somewhere else, runs to wherever you click and jumps when you give it a pet.
// It lives in a fixed layer that never blocks clicks; only the animal itself can be tapped.

const size = 52;
const speed = 160; // px per second when walking
type Spot = { x: number; y: number };

function reducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function bounds() {
  const bottomBar = window.innerWidth < 900 ? 96 : 16; // stay clear of the phone's bottom menu
  return { minX: 8, maxX: window.innerWidth - size - 8, minY: 72, maxY: window.innerHeight - size - bottomBar };
}

function clamp(spot: Spot): Spot {
  const box = bounds();
  return { x: Math.min(box.maxX, Math.max(box.minX, spot.x)), y: Math.min(box.maxY, Math.max(box.minY, spot.y)) };
}

// Somewhere worth going: on top of a card that is on screen, or a free spot.
function pickSpot(): Spot {
  const candidates = [...document.querySelectorAll<HTMLElement>(".content .panel, .content .idea-card, .content .place-card, .content .schedule-card, .content .companion-card")]
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 60 && rect.top > 80 && rect.top < window.innerHeight - 140);
  if (candidates.length && Math.random() < 0.75) {
    const rect = candidates[Math.floor(Math.random() * candidates.length)];
    // Sit on the top edge of it, somewhere along its width.
    return clamp({ x: rect.left + Math.random() * Math.max(0, rect.width - size), y: rect.top - size + 6 });
  }
  const box = bounds();
  return { x: box.minX + Math.random() * (box.maxX - box.minX), y: box.minY + Math.random() * (box.maxY - box.minY) };
}

export function RoamingPet({ pet }: { pet: Pet }) {
  const [spot, setSpot] = useState<Spot>(() => clamp({ x: window.innerWidth - size - 24, y: window.innerHeight - size - 120 }));
  const [walk, setWalk] = useState({ ms: 0, moving: false, left: false });
  const [popping, setPopping] = useState(false);
  const [happy, setHappy] = useState(false);
  const here = useRef(spot);
  const timers = useRef<number[]>([]);
  const lastClick = useRef(0);

  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  function walkTo(target: Spot) {
    const from = here.current;
    const to = clamp(target);
    if (reducedMotion()) {
      here.current = to;
      setSpot(to);
      return;
    }
    const ms = Math.max(350, (Math.hypot(to.x - from.x, to.y - from.y) / speed) * 1000);
    here.current = to;
    setWalk({ ms, moving: true, left: to.x < from.x });
    setSpot(to);
    later(() => setWalk((current) => ({ ...current, moving: false })), ms);
  }

  // Disappear and pop up somewhere else, like it slipped behind the furniture.
  function popTo(target: Spot) {
    setPopping(true);
    later(() => {
      const to = clamp(target);
      here.current = to;
      setWalk((current) => ({ ...current, ms: 0, moving: false }));
      setSpot(to);
      later(() => setPopping(false), 40);
    }, 260);
  }

  useEffect(() => {
    let alive = true;
    const wander = () => {
      if (!alive) return;
      // Chasing something you clicked comes first: wander again only once it has had a moment there.
      if (!document.hidden && Date.now() - lastClick.current > 6000) {
        if (Math.random() < 0.3 || reducedMotion()) popTo(pickSpot());
        else walkTo(pickSpot());
      }
      later(wander, 7000 + Math.random() * 7000);
    };
    later(wander, 2500);
    // Runs after whatever you click (a thrown toy), unless you clicked the animal itself.
    const onClick = (event: MouseEvent) => {
      if ((event.target as HTMLElement | null)?.closest(".roaming-pet, input, textarea, select")) return;
      lastClick.current = Date.now();
      walkTo({ x: event.clientX - size / 2, y: event.clientY - size + 8 });
    };
    const onResize = () => { const to = clamp(here.current); here.current = to; setSpot(to); };
    window.addEventListener("click", onClick);
    window.addEventListener("resize", onResize);
    const pending = timers.current;
    return () => {
      alive = false;
      pending.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("click", onClick);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!happy) return;
    const timer = window.setTimeout(() => setHappy(false), 1400);
    return () => window.clearTimeout(timer);
  }, [happy]);

  return (
    <div className="roaming-layer" aria-hidden={false}>
      <button
        type="button"
        className={`roaming-pet${walk.moving ? " is-walking" : ""}${walk.left ? " faces-left" : ""}${popping ? " is-popping" : ""}${happy ? " pet-happy" : ""}`}
        style={{ transform: `translate(${spot.x}px, ${spot.y}px)`, transitionDuration: `${walk.ms}ms, 260ms` }}
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
