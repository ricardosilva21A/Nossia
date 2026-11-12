import { Mascot as PetArt } from "./Mascot";
import { useDialog } from "./useDialog";
import { petLook } from "./mascots";
import type { Pet } from "./mascots";

// The pop-ups shown after someone creates their mascot, one at a time:
// first the swipes ("Summer quer conhecer-te"), then what is still missing in the profile.
export type WelcomeStep = "swipes" | "profile";

type Props = {
  step: WelcomeStep;
  pet: Pet;
  deckSize: number;
  missing: string[];
  onStart: () => void;
  onLater: () => void;
};

export function WelcomeSteps({ step, pet, deckSize, missing, onStart, onLater }: Props) {
  const dialogRef = useDialog<HTMLElement>(onLater);
  const title = step === "swipes" ? `${pet.name} quer conhecer-te` : "Falta pouco para o perfil ficar completo";
  return (
    <div className="welcome-backdrop" role="presentation">
      <section ref={dialogRef} className="welcome-sheet" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <div className="welcome-mascot"><PetArt look={petLook(pet)} size={96} /></div>
        <h2 id="welcome-title">{title}</h2>
        {step === "swipes" ? <>
          <p className="modal-copy">Diz-lhe do que gostas: {deckSize} {deckSize === 1 ? "ideia" : "ideias"} rápidas, uma de cada vez. Desliza para a direita se te apetece, para a esquerda se não. O teu par não vê as tuas escolhas, só o que gostam os dois.</p>
          <div className="panel-actions welcome-actions"><button type="button" className="button button-ghost" onClick={onLater}>Agora não</button><button type="button" className="button button-primary" onClick={onStart}>Vamos lá</button></div>
        </> : <>
          <p className="modal-copy">Com isto, as sugestões passam a contar com o sítio onde vivem, o tempo e as horas em que estão livres.</p>
          <ul className="welcome-missing">{missing.map((item) => <li key={item}>{item}</li>)}</ul>
          <div className="panel-actions welcome-actions"><button type="button" className="button button-ghost" onClick={onLater}>Mais tarde</button><button type="button" className="button button-primary" onClick={onStart}>Completar perfil</button></div>
        </>}
      </section>
    </div>
  );
}

const storageKey = (userId: string) => `nossia-welcome-${userId}`;

export function readSeenWelcome(userId: string): WelcomeStep[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey(userId)) ?? "[]");
    return Array.isArray(saved) ? saved.filter((item): item is WelcomeStep => item === "swipes" || item === "profile") : [];
  } catch {
    return [];
  }
}

export function saveSeenWelcome(userId: string, seen: WelcomeStep[]) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(seen));
  } catch {
    // Private mode or blocked storage: the pop-up may show again next visit, which is harmless.
  }
}
