import { useEffect, useLayoutEffect, useState } from "react";
import { track } from "./usage";
import { Mascot as PetArt } from "./Mascot";
import { petLook } from "./mascots";
import type { Pet } from "./mascots";
import { useDialog } from "./useDialog";

// The first visit to the house: the animal points out what can be tapped, one thing at a time.
// Steps whose thing isn't on screen (the other one hasn't joined, nobody is away) are skipped.

type Step = { target: string; text: (names: { me: string; partner: string; pet: string }) => string };

const steps: Step[] = [
  { target: "me", text: ({ me }) => `Aqui estás tu, ${me}. Toca para abrires o teu perfil.` },
  { target: "partner", text: ({ partner }) => `Aqui está ${partner}. Toca para lhe mandar um beijo, um abraço ou um aceno.` },
  { target: "pet", text: ({ pet }) => `Sou eu, ${pet}! Toca em mim para escolheres o que visto.` },
  { target: "map", text: () => "No mapa ficam as vossas viagens, com um pin por sítio. Toca para ver de perto e marcar a próxima." },
  { target: "calendar", text: () => "O calendário: folheia os meses e toca num dia para marcar um date." },
  { target: "window", text: () => "Pela janela vês o tempo de hoje e dos próximos dias." },
  { target: "bubble", text: ({ pet }) => `E aqui ${pet} dá-vos sugestões, as propostas do teu par e pergunta como correram os dates.` },
];

type Props = { pet: Pet | null; names: { me: string; partner: string }; onDone: () => void };

export function HouseGuide({ pet, names, onDone }: Props) {
  const available = steps.filter((step) => document.querySelector(`[data-guide="${step.target}"]`));
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const dialogRef = useDialog<HTMLDivElement>(onDone);
  const step = available[index];

  useLayoutEffect(() => {
    if (!step) return;
    const element = document.querySelector<HTMLElement>(`[data-guide="${step.target}"]`);
    element?.scrollIntoView({ block: "center", behavior: "auto" });
    setRect(element?.getBoundingClientRect() ?? null);
  }, [step]);

  useEffect(() => {
    const onResize = () => {
      const element = step && document.querySelector<HTMLElement>(`[data-guide="${step.target}"]`);
      setRect(element ? element.getBoundingClientRect() : null);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [step]);

  useEffect(() => {
    if (!available.length) onDone();
  }, [available.length, onDone]);

  if (!step || !rect) return null;
  const last = index === available.length - 1;
  const below = rect.top + rect.height / 2 < window.innerHeight / 2;
  const pad = 6;
  return (
    <div className="guide-layer" role="presentation">
      <div className="guide-spot" style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />
      <div ref={dialogRef} className={`guide-card ${below ? "is-below" : "is-above"}`} style={below ? { top: rect.bottom + 14 } : { bottom: window.innerHeight - rect.top + 14 }} role="dialog" aria-modal="true" aria-label="Guia da casa">
        {pet && <span className="guide-pet" aria-hidden="true"><PetArt look={petLook(pet)} size={44} /></span>}
        <p>{step.text({ ...names, pet: pet?.name ?? "O animal da casa" })}</p>
        <div className="guide-actions">
          <span className="guide-count">{index + 1} de {available.length}</span>
          <button type="button" className="button button-ghost" onClick={() => { track(`guide:skipped_${index + 1}`); onDone(); }}>Saltar</button>
          <button type="button" className="button button-primary" autoFocus onClick={() => { if (last) { track("guide:finished"); onDone(); } else setIndex(index + 1); }}>{last ? "Vamos lá" : "Seguinte"}</button>
        </div>
      </div>
    </div>
  );
}

const storageKey = (userId: string) => `nossia-guide-${userId}`;

export function readGuideSeen(userId: string) {
  try {
    return window.localStorage.getItem(storageKey(userId)) === "done";
  } catch {
    return true;
  }
}

export function saveGuideSeen(userId: string) {
  try {
    window.localStorage.setItem(storageKey(userId), "done");
  } catch {
    // Blocked storage: the guide may show again next visit.
  }
}
