import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Sheet } from "./HouseSheets";
import { TitleSearch } from "./TitleSearch";
import { answersFor, decks, isWritten, outcomeOf, promptFor, reaction } from "./games";
import type { GameAnswer, GameQuestion, ReactionKind, Verdict } from "./games";
import type { HomePartner } from "./types";
import { Avatar } from "./Avatar";
import { Mascot as PetArt } from "./Mascot";
import { defaultAvatar, petLook } from "./mascots";
import type { AvatarLook, Pet } from "./mascots";

// One game question, asked by the house's animal: first guess what the other one would say,
// then say your own. It keeps both secret until the other has answered too, then tells each one
// what the other said, with a reaction that is loud when you get it right and louder when you
// don't. Written answers are judged by the one they're about.

type Props = {
  pet: Pet | null;
  // The two avatars, for the little scene on reveal: "YES!" for a right guess, a pillow for a wrong one.
  looks?: { me: AvatarLook | null; partner: AvatarLook | null };
  question: GameQuestion;
  answers: GameAnswer[];
  userId: string;
  mySlot: HomePartner;
  myName: string;
  partnerName: string;
  // The other one already answered: say so, it makes answering more fun.
  partnerWaiting: boolean;
  onAnswer: (values: { self: string; guess?: string }) => Promise<boolean>;
  onJudge: (verdict: Verdict) => Promise<boolean>;
  onSeen: (key: string) => void;
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

// The animal, talking: every line of the game comes from it.
function Host({ pet, children }: { pet: Pet | null; children: ReactNode }) {
  return (
    <div className="game-host">
      {pet && <span className="game-host-pet" aria-hidden="true"><PetArt look={petLook(pet)} size={52} /></span>}
      <p className="game-host-says"><strong>{pet?.name ?? "A casa"}:</strong> {children}</p>
    </div>
  );
}

export function GameSheet({ pet, looks, question, answers, userId, mySlot, myName, partnerName, partnerWaiting, onAnswer, onJudge, onSeen, onNext, onClose }: Props) {
  const { mine, theirs, iAnswered, bothAnswered } = answersFor(answers, question.id, userId);
  const [guess, setGuess] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const deck = decks.find((item) => item.key === question.deck)!;
  const otherSlot: HomePartner = mySlot === "partner_one" ? "partner_two" : "partner_one";
  const nameOf = (slot: string) => (slot === mySlot ? myName : partnerName);
  const written = isWritten(question);
  const outcome = bothAnswered ? outcomeOf(question, mine, theirs) : null;

  // Seen: the reveal, and (for written answers) the other one's verdict on my guess once it's in.
  const myResult = outcome?.kind === "know" ? outcome.mine : null;
  useEffect(() => {
    if (!bothAnswered) return;
    onSeen(question.id);
    if (myResult && myResult !== "pending") onSeen(`${question.id}:v`);
  }, [bothAnswered, onSeen, question.id, myResult]);

  async function run(action: () => Promise<boolean>) {
    setBusy(true);
    setError("");
    const ok = await action();
    setBusy(false);
    if (!ok) setError("Não foi possível guardar. Tenta outra vez.");
    return ok;
  }

  const textForm = (label: string, onSubmit: (value: string) => void, cta: string) => (
    <form onSubmit={(event) => { event.preventDefault(); if (text.trim()) onSubmit(text.trim()); }}>
      <label className="sr-only" htmlFor="game-text">{label}</label>
      {question.kind === "know" && question.lookup
        ? <TitleSearch key={label} id="game-text" kind={question.lookup} value={text} autoFocus onChange={setText} />
        : <input id="game-text" className="form-input game-text-input" maxLength={120} value={text} autoFocus autoComplete="off" placeholder="Escreve aqui…" onChange={(event) => setText(event.target.value)} />}
      <div className="panel-actions"><button type="submit" className="button button-primary" disabled={busy || !text.trim()}>{cta}</button></div>
    </form>
  );

  let body: ReactNode;
  if (!iAnswered) {
    if (question.kind === "know") {
      const guessing = guess === null;
      const finish = (self: string) => void run(() => onAnswer({ self, guess: guess ?? "" }));
      body = <>
        <Host pet={pet}>{guessing ? <>Quero conhecer-vos melhor! Primeiro, adivinha:</> : <>Guardei o teu palpite 🤫 Agora conta-me de ti.</>}</Host>
        <p className="game-step">{guessing ? `1 de 2 · sobre ${partnerName}` : "2 de 2 · sobre ti"}</p>
        <h2>{guessing ? promptFor(question, "guess", partnerName) : question.self}</h2>
        {question.options
          ? <div className="game-options">{question.options.map((option) => <button type="button" key={option} className="game-option" disabled={busy} onClick={() => (guessing ? setGuess(option) : finish(option))}>{option}</button>)}</div>
          : guessing ? textForm("O teu palpite", (value) => { setGuess(value); setText(""); }, "Seguinte") : textForm("A tua resposta", finish, "Responder")}
        {!guessing && <button type="button" className="link-button" onClick={() => { setText(written ? guess ?? "" : ""); setGuess(null); }}>Mudar o palpite</button>}
      </>;
    } else if (question.kind === "pair") {
      body = <>
        <Host pet={pet}>Isto ou aquilo? Escolhe sem pensar muito.</Host>
        <p className="game-step">{question.text}</p>
        <div className="game-pair">{question.options.map((option, index) => <button type="button" key={option} className="game-option is-big" disabled={busy} onClick={() => void run(() => onAnswer({ self: option }))}>{option}{index === 0 && <span className="game-or" aria-hidden="true">ou</span>}</button>)}</div>
      </>;
    } else if (question.kind === "who") {
      body = <>
        <Host pet={pet}>Diz-me a verdade, eu não conto a ninguém…</Host>
        <p className="game-step">Quem é mais provável de…</p>
        <h2>{question.text}?</h2>
        <div className="game-pair">{[mySlot, otherSlot].map((slot) => <button type="button" key={slot} className="game-option is-big" disabled={busy} onClick={() => void run(() => onAnswer({ self: slot }))}>{slot === mySlot ? `Eu (${myName})` : partnerName}</button>)}</div>
      </>;
    } else {
      body = <>
        <Host pet={pet}>{question.deck === "memorias" ? "Conta-me uma memória vossa:" : "Conta-me um sonho:"}</Host>
        <form onSubmit={(event) => { event.preventDefault(); if (text.trim()) void run(() => onAnswer({ self: text })); }}>
          <h2>{question.text}</h2>
          <label className="sr-only" htmlFor="game-open">A tua resposta</label>
          <textarea id="game-open" className="form-input game-text" maxLength={300} rows={3} value={text} autoFocus placeholder="Escreve à vontade…" onChange={(event) => setText(event.target.value)} />
          <div className="panel-actions"><button type="submit" className="button button-primary" disabled={busy || !text.trim()}>Responder</button></div>
        </form>
      </>;
    }
  } else if (!bothAnswered || !outcome) {
    body = <>
      <Host pet={pet}>Guardei tudo! Quando {partnerName} responder, conto-te o que disse{question.kind === "know" ? " e se acertaste" : ""}. 🤫</Host>
      <h2>{question.kind === "know" ? promptFor(question, "guess", partnerName) : promptFor(question)}</h2>
    </>;
  } else if (outcome.kind === "know" && question.kind === "know") {
    const bubble = (result: string) => (result === "hit" ? "YES!" : result === "close" ? "🤏" : result === "miss" ? "😵" : "⏳");
    body = <>
      {outcome.mine === "pending"
        ? <Reaction big kind="open" seed={question.id} label="Já tenho as respostas!" />
        : <Reaction big kind={outcome.mine} seed={`${question.id}:me`} />}
      <div className="game-duel" aria-hidden="true">
        {([["me", outcome.mine, looks?.me], ["partner", outcome.theirs, looks?.partner]] as const).map(([whoIs, result, look]) => <div key={whoIs} className={`game-duelist ${result === "hit" ? "is-hit" : result === "miss" ? "is-miss" : ""}`}>
          <span className="game-duel-bubble">{bubble(result)}</span>
          {result === "miss" && <span className="game-pillow" />}
          <Avatar look={look ?? defaultAvatar} size={64} />
          <small>{whoIs === "me" ? "Tu" : partnerName}</small>
        </div>)}
      </div>
      <Host pet={pet}>
        {question.topic.charAt(0).toUpperCase() + question.topic.slice(1)} de {partnerName}: <strong>{theirs.self}</strong>. Tu disseste <strong>{mine.guess}</strong>.
        {outcome.mine === "pending" && <> Agora {partnerName} diz-me se acertaste.</>}
      </Host>
      <div className="game-reveal">
        <div>
          <small>E {partnerName} sobre ti</small>
          <p>Adivinhou <strong>{theirs.guess}</strong> · tu disseste <strong>{mine.self}</strong></p>
          {outcome.iMustJudge
            ? <div className="game-judge" role="group" aria-label={`${partnerName} acertou?`}>
              <span>Acertou?</span>
              <button type="button" className="chip" disabled={busy} onClick={() => void run(() => onJudge("hit"))}>Acertou 🎯</button>
              <button type="button" className="chip" disabled={busy} onClick={() => void run(() => onJudge("close"))}>Quase 🤏</button>
              <button type="button" className="chip" disabled={busy} onClick={() => void run(() => onJudge("miss"))}>Falhou 😂</button>
            </div>
            : outcome.theirs !== "pending" && <Reaction kind={outcome.theirs} seed={`${question.id}:them`} label={outcome.theirs === "hit" ? `${partnerName} acertou` : outcome.theirs === "close" ? `${partnerName} quase acertou` : `${partnerName} falhou 😂`} />}
        </div>
      </div>
    </>;
  } else if (outcome.kind === "pair") {
    body = <>
      <Reaction big kind={outcome.same ? "same" : "differ"} seed={question.id} />
      <Host pet={pet}>{outcome.same ? `Escolheram os dois ${mine.self}!` : `${partnerName} escolheu ${theirs.self} e tu ${mine.self}.`}</Host>
    </>;
  } else if (outcome.kind === "who") {
    body = <>
      <Reaction big kind={outcome.same ? "agree" : "disagree"} seed={question.id} label={outcome.same ? (outcome.mine === mySlot ? "Concordam: és tu 😂" : `Concordam: é ${partnerName} 😂`) : undefined} />
      <Host pet={pet}>{promptFor(question)} Tu apontaste <strong>{nameOf(outcome.mine)}</strong>, {partnerName} apontou <strong>{nameOf(outcome.theirs)}</strong>.</Host>
    </>;
  } else {
    body = <>
      <Reaction big kind="open" seed={question.id} />
      <h2 className="game-reveal-question">{promptFor(question)}</h2>
      <div className="game-reveal"><div><small>Tu</small><p>{mine.self}</p></div><div><small>{partnerName}</small><p>{theirs.self}</p></div></div>
    </>;
  }

  return (
    <Sheet label={deck.title} onClose={onClose}>
      <p className="game-deck"><span aria-hidden="true">{deck.emoji}</span>{deck.title}</p>
      {!iAnswered && partnerWaiting && <p className="game-nudge">{partnerName} já respondeu. Responde para saberes o que disse!</p>}
      <div className="game-body">{body}</div>
      {error && <p className="error-alert" role="alert">{error}</p>}
      {iAnswered && <div className="panel-actions welcome-actions">
        <button type="button" className="button button-ghost" onClick={onClose}>Fechar</button>
        {onNext && <button type="button" className="button button-primary" autoFocus onClick={() => { setGuess(null); setText(""); onNext(); }}>Mais uma</button>}
      </div>}
    </Sheet>
  );
}
