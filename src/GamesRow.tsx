import { decks, questions } from "./games";
import type { DeckKey } from "./games";

// Explorar's games row: one card per deck, with how far they got and who is winning.
type Props = {
  answered: Set<string>;
  waiting: Set<string>;
  score: { me: number; partner: number; rounds: number };
  partnerName: string;
  onPlay: (deck: DeckKey) => void;
};

export function GamesRow({ answered, waiting, score, partnerName, onPlay }: Props) {
  return (
    <section className="explore-row games-row" aria-label="Jogos de casal">
      <div className="explore-row-head">
        <h2>Jogos de casal</h2>
        <small>{score.rounds > 0 ? `Quanto se conhecem: tu ${score.me} · ${partnerName} ${score.partner}` : "Respondem os dois e só depois veem as respostas"}</small>
      </div>
      <ul>
        {decks.map((deck) => {
          const inDeck = questions.filter((question) => question.deck === deck.key);
          const done = inDeck.filter((question) => answered.has(question.id)).length;
          const theirTurn = inDeck.filter((question) => waiting.has(question.id)).length;
          const finished = done === inDeck.length;
          return <li key={deck.key}>
            <button type="button" className="explore-card game-card" disabled={finished} onClick={() => onPlay(deck.key)}>
              <span className="explore-card-emoji" aria-hidden="true">{deck.emoji}</span>
              <strong>{deck.title}</strong>
              <small>{deck.hint}</small>
              {theirTurn > 0 && <span className="game-card-badge">{partnerName} espera por ti: {theirTurn}</span>}
              <span className="game-card-progress" aria-label={`${done} de ${inDeck.length} respondidas`}><i style={{ width: `${Math.round((done / inDeck.length) * 100)}%` }} /></span>
              <span className="explore-card-go">{finished ? "Tudo respondido" : done ? "Continuar" : "Jogar"}</span>
            </button>
          </li>;
        })}
      </ul>
    </section>
  );
}
