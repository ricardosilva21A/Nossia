import { useEffect, useRef, useState } from "react";
import { answerText } from "./titles";
import type { TitleHit, TitleKind } from "./titles";

// A text box that suggests real films, series or songs while you type. Picking one fills the
// box with its exact title, so two people picking the same film match on their own. Typing
// anything else still works: suggestions are a help, never a requirement.

type Props = { id: string; kind: TitleKind; value: string; onChange: (value: string) => void; autoFocus?: boolean };

const placeholder: Record<TitleKind, string> = { film: "Escreve o nome do filme…", series: "Escreve o nome da série…", song: "Escreve a música ou o artista…" };

export function TitleSearch({ id, kind, value, onChange, autoFocus = false }: Props) {
  const [hits, setHits] = useState<TitleHit[]>([]);
  const [loading, setLoading] = useState(false);
  // The value that came from picking a suggestion: no need to search for it again.
  const picked = useRef<string | null>(null);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2 || query === picked.current) { setHits([]); setLoading(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/titles?type=${kind}&q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : { results: [] }))
        .then((data: { results?: TitleHit[] }) => setHits(Array.isArray(data.results) ? data.results : []))
        .catch(() => { if (!controller.signal.aborted) setHits([]); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [kind, value]);

  const listId = `${id}-suggestions`;
  return (
    <div className="title-search">
      <input
        id={id}
        className="form-input game-text-input"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={hits.length > 0}
        aria-controls={listId}
        maxLength={120}
        value={value}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder={placeholder[kind]}
        onChange={(event) => { picked.current = null; onChange(event.target.value); }}
      />
      {loading && !hits.length && <p className="title-search-note" aria-live="polite">A procurar…</p>}
      {hits.length > 0 && <ul id={listId} className="title-search-list" role="listbox" aria-label="Sugestões">
        {hits.map((hit) => <li key={hit.id} role="option" aria-selected={false}>
          <button type="button" onClick={() => { const text = answerText(hit, kind); picked.current = text; setHits([]); onChange(text); }}>
            {hit.image ? <img src={hit.image} alt="" loading="lazy" width={32} height={kind === "song" ? 32 : 46} /> : <span className="title-search-blank" aria-hidden="true" />}
            <span><strong>{hit.title}</strong><small>{[hit.year, hit.detail].filter(Boolean).join(" · ")}</small></span>
          </button>
        </li>)}
      </ul>}
    </div>
  );
}
