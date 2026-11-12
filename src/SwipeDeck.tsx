import { useRef, useState } from "react";
import { useDialog } from "./useDialog";
import type { PointerEvent } from "react";
import { Heart, X } from "lucide-react";
import type { DateIdea } from "./types";

const swipeDistance = 90;

export function SwipeDeck({ deck, onVote, onClose }: { deck: DateIdea[]; onVote: (idea: DateIdea, vote: "like" | "pass") => Promise<boolean>; onClose: () => void }) {
  const dialogRef = useDialog<HTMLDivElement>(onClose);
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const startX = useRef<number | null>(null);
  const idea = deck[index];

  async function vote(choice: "like" | "pass") {
    if (!idea || saving) return;
    setSaving(true);
    setError("");
    const saved = await onVote(idea, choice);
    setSaving(false);
    setDragX(0);
    if (saved) setIndex((current) => current + 1);
    else setError("Não foi possível guardar. Tenta outra vez.");
  }

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    startX.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    if (startX.current !== null) setDragX(event.clientX - startX.current);
  }

  function onPointerUp() {
    if (startX.current === null) return;
    startX.current = null;
    if (Math.abs(dragX) >= swipeDistance) void vote(dragX > 0 ? "like" : "pass");
    else setDragX(0);
  }

  return (
    <div ref={dialogRef} className="onboarding swipe-screen" role="dialog" aria-modal="true" aria-label="Escolher ideias">
      <div className="onboarding-card">
        {idea ? <>
          <div className="swipe-head"><p className="swipe-progress">{index + 1} de {deck.length}</p><button type="button" className="button button-ghost" onClick={onClose}>Agora não</button></div>
          <p className="schedule-hint">Direita se te apetece, esquerda se não é para ti. O teu par nunca vê o que passas.</p>
          <article className="swipe-card" style={{ transform: `translateX(${dragX}px) rotate(${dragX / 22}deg)` }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { startX.current = null; setDragX(0); }}>
            {dragX > 30 && <span className="swipe-badge like">Gosto</span>}
            {dragX < -30 && <span className="swipe-badge pass">Passo</span>}
            <span className="swipe-emoji" aria-hidden="true">{idea.emoji}</span>
            <h2>{idea.title}</h2>
            {idea.description && <p>{idea.description}</p>}
          </article>
          {error && <p className="error-alert" role="alert">{error}</p>}
          <div className="swipe-actions"><button type="button" className="button button-ghost" disabled={saving} onClick={() => void vote("pass")}><X size={20} aria-hidden="true" />Passo</button><button type="button" className="button button-primary" disabled={saving} onClick={() => void vote("like")}><Heart size={20} aria-hidden="true" />Gosto</button></div>
        </> : <>
          <h1>Obrigado!</h1>
          <p className="modal-copy">A casa já vos conhece um pouco melhor. Podem mudar de ideias nas Definições.</p>
          <div className="onboarding-actions panel-actions"><button type="button" className="button button-primary" onClick={onClose}>Voltar</button></div>
        </>}
      </div>
    </div>
  );
}

export function PassedIdeas({ ideas, onRestore }: { ideas: Array<{ idea_id: string; title: string; emoji: string }>; onRestore: (ideaId: string) => void }) {
  return (
    <article className="schedule-card">
      <h2>Ideias que passei</h2>
      {ideas.length === 0 ? <p className="schedule-hint">Quando passares uma ideia, fica aqui para poderes voltar atrás.</p> : <ul className="passed-ideas">{ideas.map((idea) => <li key={idea.idea_id}><span>{idea.emoji} {idea.title}</span><button type="button" className="button button-ghost" onClick={() => onRestore(idea.idea_id)}>Recuperar</button></li>)}</ul>}
    </article>
  );
}
