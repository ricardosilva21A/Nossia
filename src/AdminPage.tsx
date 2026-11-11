import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { authErrorMessage } from "./authErrors";
import { AdminEvents } from "./AdminEvents";
import { supabase } from "./lib/supabase";
import { seasons } from "./seasons";
import { budgetLabel, durationLabel } from "./suggestions";
import type { Idea, SeasonKey, WeatherSetting } from "./types";
import { activities, activityLabel, activityOf, isSpecial, legacyFields } from "./activities";
import type { Activity } from "./activities";

type Overview = {
  accounts: number;
  accounts_last_7_days: number;
  signed_in_last_30_days: number;
  couples: number;
  couples_with_both: number;
  active_couples_30_days: number;
  dates_planned: number;
  dates_completed: number;
  public_ideas: number;
  couple_ideas: number;
  signups_by_week: Array<{ week: string; count: number }>;
};

type Draft = {
  id: string | null;
  title: string;
  description: string;
  emoji: string;
  activity: Activity;
  special: boolean;
  duration_minutes: string;
  budget_eur: string;
  at_home: boolean;
  weather_setting: WeatherSetting;
  repeatable: boolean;
  seasons: SeasonKey[];
};

const weatherOptions: Array<[WeatherSetting, string]> = [["any", "Qualquer tempo"], ["indoor", "Interior"], ["outdoor", "Exterior"]];
const seasonKeys = Object.keys(seasons) as SeasonKey[];

const emptyDraft: Draft = { id: null, title: "", description: "", emoji: "💌", activity: "comer", special: false, duration_minutes: "120", budget_eur: "0", at_home: false, weather_setting: "any", repeatable: false, seasons: [] };

function draftFrom(idea: Idea): Draft {
  return {
    id: idea.id,
    title: idea.title,
    description: idea.description,
    emoji: idea.emoji,
    activity: activityOf(idea),
    special: isSpecial(idea),
    duration_minutes: idea.duration_minutes?.toString() ?? "",
    budget_eur: idea.budget_eur?.toString() ?? "",
    at_home: idea.at_home,
    weather_setting: idea.weather_setting,
    repeatable: idea.repeatable,
    seasons: idea.seasons ?? [],
  };
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) setError(authErrorMessage(signInError.message));
    setBusy(false);
  }

  return (
    <main className="admin-center">
      <form className="admin-card" onSubmit={(event) => void submit(event)}>
        <h1>Nossia · Administração</h1>
        <label className="form-label">Email<input className="form-input" type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="form-label">Palavra-passe<input className="form-input" type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <p className="error-alert" role="alert">{error}</p>}
        <button className="button button-primary admin-wide" type="submit" disabled={busy}>{busy ? "A entrar…" : "Entrar"}</button>
      </form>
    </main>
  );
}

function IdeaForm({ draft, busy, onChange, onSave, onCancel }: { draft: Draft; busy: boolean; onChange: (draft: Draft) => void; onSave: () => void; onCancel: () => void }) {
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => onChange({ ...draft, [key]: value });
  return (
    <form className="admin-form" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
      <h3>{draft.id ? "Editar ideia" : "Nova ideia"}</h3>
      <div className="admin-form-row"><label className="form-label admin-emoji">Emoji<input className="form-input" required maxLength={8} value={draft.emoji} onChange={(event) => set("emoji", event.target.value)} /></label><label className="form-label admin-grow">Título<input className="form-input" required maxLength={200} value={draft.title} onChange={(event) => set("title", event.target.value)} /></label></div>
      <label className="form-label">Descrição<textarea className="form-input admin-textarea" maxLength={1000} value={draft.description} onChange={(event) => set("description", event.target.value)} /></label>
      <div className="admin-form-row">
        <label className="form-label admin-grow">Tipo<select className="form-input" value={draft.activity} onChange={(event) => set("activity", event.target.value as Activity)}>{activities.map((item) => <option key={item.value} value={item.value}>{item.emoji} {item.label}</option>)}</select></label>
        <label className="form-label admin-grow">Tempo<select className="form-input" value={draft.weather_setting} onChange={(event) => set("weather_setting", event.target.value as WeatherSetting)}>{weatherOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <div className="admin-form-row">
        <label className="form-label admin-grow">Duração (minutos)<input className="form-input" type="number" min={1} value={draft.duration_minutes} onChange={(event) => set("duration_minutes", event.target.value)} /></label>
        <label className="form-label admin-grow">Custo (€)<input className="form-input" type="number" min={0} step="0.5" value={draft.budget_eur} onChange={(event) => set("budget_eur", event.target.value)} /></label>
      </div>
      <div className="admin-checks">
        <label><input type="checkbox" checked={draft.at_home} onChange={(event) => set("at_home", event.target.checked)} /> Em casa</label>
        <label><input type="checkbox" checked={draft.repeatable} onChange={(event) => set("repeatable", event.target.checked)} /> Repetível</label>
        <label><input type="checkbox" checked={draft.special} onChange={(event) => set("special", event.target.checked)} /> Especial (aniversários e ocasiões)</label>
      </div>
      <div className="chip-row" role="group" aria-label="Épocas">{seasonKeys.map((key) => <button type="button" key={key} className={`chip ${draft.seasons.includes(key) ? "selected" : ""}`} aria-pressed={draft.seasons.includes(key)} onClick={() => set("seasons", draft.seasons.includes(key) ? draft.seasons.filter((item) => item !== key) : [...draft.seasons, key])}>{seasons[key].label}</button>)}</div>
      <div className="panel-actions"><button className="button button-primary" type="submit" disabled={busy}>Guardar</button><button type="button" className="button button-ghost" onClick={onCancel}>Cancelar</button></div>
    </form>
  );
}

function AdminDashboard({ email }: { email: string }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"catalog" | "events">("catalog");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadOverview = useCallback(async () => {
    if (!supabase) return;
    const { data, error: loadError } = await supabase.rpc("admin_overview");
    if (loadError) setError(`Não foi possível carregar os números: ${loadError.message}`);
    else setOverview(data as Overview);
  }, []);

  useEffect(() => {
    void loadOverview();
    if (!supabase) return;
    void supabase.from("ideas").select("*").is("created_by_couple_id", null).order("title").then(({ data, error: loadError }) => {
      if (loadError) setError(`Não foi possível carregar o catálogo: ${loadError.message}`);
      else setIdeas((data ?? []) as Idea[]);
    });
  }, [loadOverview]);

  const shown = useMemo(() => {
    const text = search.trim().toLocaleLowerCase("pt-PT");
    return text ? ideas.filter((idea) => idea.title.toLocaleLowerCase("pt-PT").includes(text)) : ideas;
  }, [ideas, search]);

  async function saveDraft() {
    if (!supabase || !draft) return;
    setBusy(true);
    setError("");
    const durationMinutes = draft.duration_minutes ? Number(draft.duration_minutes) : null;
    const budgetEur = draft.budget_eur ? Number(draft.budget_eur) : null;
    const row = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      emoji: draft.emoji.trim(),
      ...legacyFields(draft.activity, draft.special),
      activity: draft.activity,
      special: draft.special,
      duration: durationLabel(durationMinutes),
      duration_minutes: durationMinutes,
      budget: budgetLabel(budgetEur),
      budget_eur: budgetEur,
      at_home: draft.at_home,
      weather_setting: draft.weather_setting,
      repeatable: draft.repeatable,
      seasons: draft.seasons,
    };
    const query = draft.id ? supabase.from("ideas").update(row).eq("id", draft.id) : supabase.from("ideas").insert({ ...row, created_by_couple_id: null });
    const { data, error: saveError } = await query.select("*").single();
    if (saveError) setError(saveError.code === "23505" ? "Já existe uma ideia com este título e descrição." : `Não foi possível guardar: ${saveError.message}`);
    else {
      const saved = data as Idea;
      setIdeas((current) => (draft.id ? current.map((idea) => idea.id === saved.id ? saved : idea) : [...current, saved]).sort((first, second) => first.title.localeCompare(second.title, "pt-PT")));
      setDraft(null);
      void loadOverview();
    }
    setBusy(false);
  }

  async function removeIdea(id: string) {
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { error: deleteError } = await supabase.from("ideas").delete().eq("id", id);
    if (deleteError) setError(deleteError.code === "23503" ? "Esta ideia não pode ser apagada porque já há casais com dates feitos a partir dela." : `Não foi possível apagar: ${deleteError.message}`);
    else {
      setIdeas((current) => current.filter((idea) => idea.id !== id));
      void loadOverview();
    }
    setConfirmDelete(null);
    setBusy(false);
  }

  const tiles: Array<[string, number | undefined, string?]> = [
    ["Contas", overview?.accounts, overview ? `+${overview.accounts_last_7_days} nos últimos 7 dias` : undefined],
    ["Entraram em 30 dias", overview?.signed_in_last_30_days],
    ["Casais", overview?.couples, overview ? `${overview.couples_with_both} com os dois na app` : undefined],
    ["Casais ativos em 30 dias", overview?.active_couples_30_days],
    ["Dates marcados", overview?.dates_planned],
    ["Dates feitos", overview?.dates_completed],
    ["Ideias públicas", overview?.public_ideas],
    ["Ideias dos casais", overview?.couple_ideas],
  ];
  const biggestWeek = Math.max(1, ...(overview?.signups_by_week ?? []).map((week) => week.count));

  return (
    <div className="admin-page">
      <header className="admin-header"><h1>Nossia · Administração</h1><div className="admin-account"><span>{email}</span><button type="button" className="button button-ghost" onClick={() => void supabase?.auth.signOut()}>Sair</button></div></header>
      {error && <p className="error-alert" role="alert">{error}</p>}
      <section aria-label="Números gerais">
        <p className="admin-note">Só totais. Esta área não tem acesso a nomes, fotografias, notas, memórias ou planos dos casais.</p>
        <div className="admin-tiles">{tiles.map(([label, value, detail]) => <article className="admin-tile" key={label}><strong>{value ?? "—"}</strong><span>{label}</span>{detail && <small>{detail}</small>}</article>)}</div>
        {overview && <div className="admin-weeks"><h2>Novas contas por semana</h2><ol>{overview.signups_by_week.map((week) => <li key={week.week}><span className="admin-week-label">{week.week.slice(8)}/{week.week.slice(5, 7)}</span><span className="admin-week-bar" style={{ width: `${(week.count / biggestWeek) * 100}%` }} /><span>{week.count}</span></li>)}</ol></div>}
      </section>
      <div className="chip-row" role="tablist" aria-label="Gerir">{([["catalog", "Catálogo de ideias"], ["events", "Eventos"]] as const).map(([value, label]) => <button type="button" role="tab" key={value} aria-selected={tab === value} className={`chip ${tab === value ? "selected" : ""}`} onClick={() => setTab(value)}>{label}</button>)}</div>
      {tab === "events" ? <AdminEvents /> : <section className="admin-catalog" aria-label="Catálogo">
        <div className="admin-catalog-head"><h2>Catálogo ({ideas.length})</h2><input className="form-input" type="search" placeholder="Procurar ideia" aria-label="Procurar ideia" value={search} onChange={(event) => setSearch(event.target.value)} /><button type="button" className="button button-primary" onClick={() => setDraft(emptyDraft)}><Plus size={16} aria-hidden="true" />Nova ideia</button></div>
        {draft && !draft.id && <IdeaForm draft={draft} busy={busy} onChange={setDraft} onSave={() => void saveDraft()} onCancel={() => setDraft(null)} />}
        <ul className="admin-ideas">{shown.map((idea) => <li key={idea.id}>
          {draft?.id === idea.id ? <IdeaForm draft={draft} busy={busy} onChange={setDraft} onSave={() => void saveDraft()} onCancel={() => setDraft(null)} /> : <div className="admin-idea-row">
            <span className="admin-idea-emoji" aria-hidden="true">{idea.emoji}</span>
            <div className="admin-grow"><strong>{idea.title}</strong><small>{activityLabel(activityOf(idea))}{isSpecial(idea) ? " · Especial" : ""}{idea.repeatable ? " · Repetível" : ""}{idea.seasons?.length ? ` · ${idea.seasons.map((key) => seasons[key]?.label ?? key).join(", ")}` : ""}</small></div>
            {confirmDelete === idea.id ? <div className="panel-actions"><button type="button" className="button button-primary" disabled={busy} onClick={() => void removeIdea(idea.id)}>Confirmar</button><button type="button" className="button button-ghost" onClick={() => setConfirmDelete(null)}>Cancelar</button></div> : <div className="row-actions"><button type="button" aria-label={`Editar ${idea.title}`} onClick={() => setDraft(draftFrom(idea))}><Pencil size={16} aria-hidden="true" /></button><button type="button" aria-label={`Apagar ${idea.title}`} onClick={() => setConfirmDelete(idea.id)}><Trash2 size={16} aria-hidden="true" /></button></div>}
          </div>}
        </li>)}</ul>
      </section>}
    </div>
  );
}

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!supabase) return <main className="admin-center"><p>O Supabase não está configurado.</p></main>;
  if (!ready) return <main className="admin-center"><p>A abrir…</p></main>;
  if (!session) return <AdminLogin />;
  if (session.user.app_metadata.catalog_admin !== true) {
    return <main className="admin-center"><div className="admin-card"><h1>Sem acesso</h1><p>Esta conta não é de administração.</p><button type="button" className="button button-primary admin-wide" onClick={() => void supabase?.auth.signOut()}>Sair</button></div></main>;
  }
  return <AdminDashboard email={session.user.email ?? ""} />;
}
