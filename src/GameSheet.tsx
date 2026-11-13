import { useEffect, useState } from "react";
import { Sheet } from "./HouseSheets";
import { answersFor, decks, outcomeOf, promptFor, reaction } from "./games";
import type { GameAnswer, GameQuestion, ReactionKind } from "./games";
import type { HomePartner } from "./types";

// One game question: answer it, wait for the other, then see both answers with a reaction
// that is loud when you get it right and louder when you don't.

type Props = {
  question: GameQuestion;
  answers: GameAnswer[];
  userId: string;
  mySlot: HomePartner;
  myName: string;
  partnerName: string;
  // The other one already answered: say so, it makes answering more fun.
  partnerWaiting: boolean;
  onAnswer: (values: { self: string; guess?: string }) => Promise<boolean>;
  onSeen: (questionId: string) => void;
  // Another question from the same deck, when there is one.
  onNext: (() => void) | null;
  onClose: () => void;
};

function Reaction({ kind, seed, big = false, label }: { kind: ReactionKind; seed: string; big?: boolean; label?: string }) {
  const { emoji, text } = reaction(kind, seed);
  const loud = kind === "miss" || kind === "differ" || kind === "disagree";
  return (
    <p className={`game-reaction ${big ? "is-big" : ""} ${loud ? "is-loud" : "is-happy"}`} role={big ? "status" : undefined}>
      <span className="game-reaction-emoji" aria-hidden="true">{emoji}</span><strong>{label ?? text}</strong>
    </p>
  );
}

export function GameSheet({ question, answers, userId, mySlot, myName, partnerName, partnerWaiting, onAnswer, onSeen, onNext, onClose }: Props) {
  const { mine, theirs, iAnswered, bothAnswered } = answersFor(answers, question.id, userId);
  const [self, setSelf] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const deck = decks.find((item) => item.key === question.deck)!;
  const otherSlot: HomePartner = mySlot === "partner_one" ? "partner_two" : "partner_one";
  const nameOf = (slot: string) => (slot === mySlot ? myName : partnerName);

  useEffect(() => { if (bothAnswered) onSeen(question.id); }, [bothAnswered, onSeen, question.id]);

  async function send(values: { self: string; guess?: string }) {
    setBusy(true);
    setError("");
    const ok = await onAnswer(values);
    setBusy(false);
    if (!ok) setError("Não foi possível guardar. Tenta outra vez.");
  }

  let body: React.ReactNode;
  if (!iAnswered) {
    if (question.kind === "know") {
      const guessing = self !== null;
      body = <>
        <p className="game-step">{guessing ? `2 de 2 · agora adivinha ${partnerName}` : "1 de 2 · sobre ti"}</p>
        <h2>{guessing ? promptFor(question, "guess", partnerName) : question.self}</h2>
        <div className="game-options">{question.options.map((option) => <button type="button" key={option} className="game-option" disabled={busy} onClick={() => (guessing ? void send({ self, guess: option }) : setSelf(option))}>{option}</button>)}</div>
        {guessing && <button type="button" className="link-button" onClick={() => setSelf(null)}>Voltar à minha resposta</button>}
      </>;
    } else if (question.kind === "pair") {
      body = <>
        <p className="game-step">{question.text}</p>
        <div className="game-pair">{question.options.map((option, index) => <button type="button" key={option} className="game-option is-big" disabled={busy} onClick={() => void send({ self: option })}>{option}{index === 0 && <span className="game-or" aria-hidden="true">ou</span>}</button>)}</div>
      </>;
    } else if (question.kind === "who") {
      body = <>
        <p className="game-step">Quem é mais provável de…</p>
        <h2>{question.text}?</h2>
        <div className="game-pair">{[mySlot, otherSlot].map((slot) => <button type="button" key={slot} className="game-option is-big" disabled={busy} onClick={() => void send({ self: slot })}>{slot === mySlot ? `Eu (${myName})` : partnerName}</button>)}</div>
      </>;
    } else {
      body = <form onSubmit={(event) => { event.preventDefault(); if (text.trim()) void send({ self: text }); }}>
        <h2>{question.text}</h2>
        <textarea className="form-input game-text" maxLength={300} rows={3} value={text} autoFocus placeholder="Escreve à vontade…" onChange={(event) => setText(event.target.value)} />
        <div className="panel-actions"><button type="submit" className="button button-primary" disabled={busy || !text.trim()}>Responder</button></div>
      </form>;
    }
  } else if (!bothAnswered) {
    body = <>
      <h2>{question.kind === "know" ? promptFor(question, "guess", partnerName) : promptFor(question)}</h2>
      <p className="game-waiting"><span aria-hidden="true">⏳</span>Respondido! Quando {partnerName} responder, vês as respostas{question.kind === "know" ? " e se acertaste" : ""}.</p>
    </>;
  } else {
    const outcome = outcomeOf(question, mine, theirs);
    if (outcome.kind === "know" && question.kind === "know") {
      body = <>
        <Reaction big kind={outcome.myGuessHit ? "hit" : "miss"} seed={`${question.id}:me`} />
        <div className="game-reveal">
          <div><small>{promptFor(question, "guess", partnerName)}</small><p>Disseste <strong>{mine.guess}</strong> · {partnerName} disse <strong>{theirs.self}</strong></p></div>
          <div><small>E {partnerName} sobre ti</small><p>Adivinhou <strong>{theirs.guess}</strong> · tu disseste <strong>{mine.self}</strong></p><Reaction kind={outcome.theirGuessHit ? "hit" : "miss"} seed={`${question.id}:them`} label={outcome.theirGuessHit ? `${partnerName} acertou` : `${partnerName} falhou 😂`} /></div>
        </div>
      </>;
    } else if (outcome.kind === "pair") {
      body = <>
        <Reaction big kind={outcome.same ? "same" : "differ"} seed={question.id} />
        <div className="game-reveal is-side"><div><small>Tu</small><p><strong>{mine.self}</strong></p></div><div><small>{partnerName}</small><p><strong>{theirs.self}</strong></p></div></div>
      </>;
    } else if (outcome.kind === "who") {
      body = <>
        <Reaction big kind={outcome.same ? "agree" : "disagree"} seed={question.id} label={outcome.same ? (outcome.mine === mySlot ? "Concordam: és tu 😂" : `Concordam: é ${partnerName} 😂`) : undefined} />
        <h2 className="game-reveal-question">{promptFor(question)}</h2>
        <div className="game-reveal is-side"><div><small>Tu apontaste</small><p><strong>{nameOf(outcome.mine)}</strong></p></div><div><small>{partnerName} apontou</small><p><strong>{nameOf(outcome.theirs)}</strong></p></div></div>
      </>;
    } else {
      body = <>
        <Reaction big kind="open" seed={question.id} />
        <h2 className="game-reveal-question">{promptFor(question)}</h2>
        <div className="game-reveal"><div><small>Tu</small><p>{mine.self}</p></div><div><small>{partnerName}</small><p>{theirs.self}</p></div></div>
      </>;
    }
  }

  return (
    <Sheet label={deck.title} onClose={onClose}>
      <p className="game-deck"><span aria-hidden="true">{deck.emoji}</span>{deck.title}</p>
      {!iAnswered && partnerWaiting && <p className="game-nudge">{partnerName} já respondeu. Responde para veres!</p>}
      <div className="game-body">{body}</div>
      {error && <p className="error-alert" role="alert">{error}</p>}
      {iAnswered && <div className="panel-actions welcome-actions">
        <button type="button" className="button button-ghost" onClick={onClose}>Fechar</button>
        {onNext && <button type="button" className="button button-primary" autoFocus onClick={() => { setSelf(null); setText(""); onNext(); }}>Mais uma</button>}
      </div>}
    </Sheet>
  );
}
