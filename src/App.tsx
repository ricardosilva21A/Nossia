import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

type Category = "Romantic" | "Adventure" | "Food & drink" | "Creative" | "Relaxing" | "Culture";
type Status = "idea" | "planned" | "completed";
type View = "discover" | "favorites" | "planned" | "memories";
type AuthMode = "sign-in" | "sign-up";
type Couple = {
  id: string;
  partner_one_name: string;
  partner_two_name: string;
  partner_one_birth_date: string | null;
  partner_two_birth_date: string | null;
  relationship_date: string;
  first_met_date: string | null;
  first_message_date: string | null;
  first_date_date: string | null;
};
type DateIdea = {
  id: string;
  couple_id: string;
  title: string;
  description: string;
  category: Category;
  duration: string;
  budget: string;
  emoji: string;
  status: Status;
  favorite: boolean;
  planned_for: string | null;
  completed_at: string | null;
  memory: string | null;
  rating: number | null;
  location_name: string | null;
};
type SeedIdea = Omit<DateIdea, "id" | "couple_id" | "planned_for" | "completed_at" | "memory" | "rating" | "location_name">;

const categories: Array<Category | "All"> = ["All", "Romantic", "Adventure", "Food & drink", "Creative", "Relaxing", "Culture"];
const seedIdeas: SeedIdea[] = [
  { title: "Sunset picnic", description: "Pack a basket with your favourite treats and find a little spot to call your own.", category: "Romantic", duration: "2–3 hours", budget: "€€", emoji: "🧺", status: "idea", favorite: true },
  { title: "Cook something new", description: "Choose a cuisine, put on some music and make dinner together, no rush.", category: "Food & drink", duration: "1–2 hours", budget: "€", emoji: "🍝", status: "idea", favorite: false },
  { title: "Wander without a plan", description: "Pick a direction, put your phones away and discover somewhere new.", category: "Adventure", duration: "2 hours", budget: "Free", emoji: "🚲", status: "idea", favorite: false },
  { title: "A games night for two", description: "A little friendly competition, snacks and the winner picks the next film.", category: "Relaxing", duration: "2 hours", budget: "€", emoji: "🎲", status: "idea", favorite: false },
  { title: "Visit a museum", description: "Choose an exhibition and share the pieces that make you feel something.", category: "Culture", duration: "2–3 hours", budget: "€€", emoji: "🖼️", status: "idea", favorite: false },
  { title: "Try a pottery class", description: "Make something with your hands. Wonky little creations tell stories too.", category: "Creative", duration: "2 hours", budget: "€€€", emoji: "🏺", status: "idea", favorite: true },
  { title: "Breakfast in bed", description: "Start the day slowly with coffee, fruit and a morning just for the two of you.", category: "Romantic", duration: "1 hour", budget: "€", emoji: "🥐", status: "idea", favorite: false },
  { title: "Find a scenic trail", description: "Bring some water, wear comfy shoes and find a beautiful path to explore.", category: "Adventure", duration: "3–4 hours", budget: "Free", emoji: "🥾", status: "idea", favorite: false },
];

const navItems: Array<{ view: View; label: string; icon: string }> = [
  { view: "discover", label: "Date ideas", icon: "✳" },
  { view: "favorites", label: "Our favourites", icon: "♡" },
  { view: "planned", label: "Planned dates", icon: "▦" },
  { view: "memories", label: "Our memories", icon: "⌁" },
];

function formatDate(date: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  return new Intl.DateTimeFormat("en-GB", options).format(new Date(`${date.slice(0, 10)}T12:00:00`));
}

function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [partnerOneName, setPartnerOneName] = useState("");
  const [partnerTwoName, setPartnerTwoName] = useState("");
  const [partnerOneBirthDate, setPartnerOneBirthDate] = useState("");
  const [partnerTwoBirthDate, setPartnerTwoBirthDate] = useState("");
  const [relationshipDate, setRelationshipDate] = useState("");
  const [firstMetDate, setFirstMetDate] = useState("");
  const [firstMessageDate, setFirstMessageDate] = useState("");
  const [firstDateDate, setFirstDateDate] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setError("Supabase is not configured yet. Add the project URL and anonymous key to your deployment environment.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      if (mode === "sign-up") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              partner_one_name: partnerOneName.trim(),
              partner_two_name: partnerTwoName.trim(),
              partner_one_birth_date: partnerOneBirthDate || null,
              partner_two_birth_date: partnerTwoBirthDate || null,
              relationship_date: relationshipDate,
              first_met_date: firstMetDate || null,
              first_message_date: firstMessageDate || null,
              first_date_date: firstDateDate || null,
            },
          },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setMessage("Your couple account is ready. Check your inbox to confirm your email, then sign in together.");
        } else {
          setMessage("Your couple account is ready. Welcome to TwoGether!");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't complete that request. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="auth-shell">
      <aside className="auth-side">
        <a className="brand" href="#"><span className="brand-mark">t<span>♡</span></span><span className="brand-name">two<span>gether</span></span></a>
        <div className="auth-quote"><span>✦ A LITTLE MORE US</span><h1>Make room for<br />your story.</h1><p>Plan the dates. Keep the memories. Celebrate all the little things that make you, you.</p><span className="auth-heart">♡</span></div>
        <span className="auth-footer">MADE WITH LOVE, FOR THE TWO OF YOU</span>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <p className="section-kicker">{mode === "sign-up" ? "YOUR VERY OWN LITTLE CORNER" : "WELCOME BACK, LOVEBIRDS"}</p>
          <h2>{mode === "sign-up" ? "Start your story together" : "Good to have you back"}</h2>
          <p className="auth-intro">{mode === "sign-up" ? "One shared account for the two of you. Your memories stay yours." : "Sign in to pick up right where the two of you left off."}</p>
          <form onSubmit={submit}>
            {mode === "sign-up" && <>
              <div className="form-grid">
                <label className="form-label">Your name<input className="form-input" autoComplete="given-name" required maxLength={80} value={partnerOneName} onChange={(event) => setPartnerOneName(event.target.value)} placeholder="e.g. Alex" /></label>
                <label className="form-label">Your partner's name<input className="form-input" autoComplete="off" required maxLength={80} value={partnerTwoName} onChange={(event) => setPartnerTwoName(event.target.value)} placeholder="e.g. Sam" /></label>
                <label className="form-label">Your birthday <span>(optional)</span><input className="form-input" type="date" max={today} value={partnerOneBirthDate} onChange={(event) => setPartnerOneBirthDate(event.target.value)} /></label>
                <label className="form-label">Your partner's birthday <span>(optional)</span><input className="form-input" type="date" max={today} value={partnerTwoBirthDate} onChange={(event) => setPartnerTwoBirthDate(event.target.value)} /></label>
              </div>
              <div className="milestone-fields">
                <p className="form-section-label">YOUR IMPORTANT DATES</p>
                <label className="form-label">Your anniversary <span className="required-label">required</span><input className="form-input" type="date" required max={today} value={relationshipDate} onChange={(event) => setRelationshipDate(event.target.value)} /></label>
                <div className="form-grid optional-dates">
                  <label className="form-label">The day you met <span>(optional)</span><input className="form-input" type="date" max={today} value={firstMetDate} onChange={(event) => setFirstMetDate(event.target.value)} /></label>
                  <label className="form-label">Your first message <span>(optional)</span><input className="form-input" type="date" max={today} value={firstMessageDate} onChange={(event) => setFirstMessageDate(event.target.value)} /></label>
                  <label className="form-label">Your first date <span>(optional)</span><input className="form-input" type="date" max={today} value={firstDateDate} onChange={(event) => setFirstDateDate(event.target.value)} /></label>
                </div>
              </div>
            </>}
            <label className="form-label">Email address<input className="form-input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
            <label className="form-label">Password<input className="form-input" type="password" autoComplete={mode === "sign-up" ? "new-password" : "current-password"} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></label>
            {error && <p className="form-alert error-alert" role="alert">{error}</p>}
            {message && <p className="form-alert success-alert" role="status">{message}</p>}
            {!isSupabaseConfigured && <p className="form-alert config-alert">Connect a Supabase project to enable private accounts and cloud-synced dates. See the setup steps in the README.</p>}
            <button className="modal-submit auth-submit" type="submit" disabled={loading || !isSupabaseConfigured}>{loading ? "One moment…" : mode === "sign-up" ? "Create your couple account" : "Sign in"} <span>→</span></button>
          </form>
          <p className="auth-switch">{mode === "sign-up" ? "Already have an account?" : "New around here?"} <button onClick={() => { setMode(mode === "sign-up" ? "sign-in" : "sign-up"); setError(""); setMessage(""); }}>{mode === "sign-up" ? "Sign in" : "Create your account"}</button></p>
        </div>
      </main>
    </div>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [ideas, setIdeas] = useState<DateIdea[]>([]);
  const [view, setView] = useState<View>("discover");
  const [category, setCategory] = useState<Category | "All">("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"new" | "plan" | "memory" | "draw" | null>(null);
  const [activeIdeaId, setActiveIdeaId] = useState<string | null>(null);
  const [drawnIdeaIds, setDrawnIdeaIds] = useState<string[]>([]);
  const [drawMessage, setDrawMessage] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [repeatIdea, setRepeatIdea] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("Romantic");
  const [memoryNote, setMemoryNote] = useState("");
  const [rating, setRating] = useState(0);
  const [locationName, setLocationName] = useState("");
  const [dataError, setDataError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadCoupleData = useCallback(async (currentSession: Session) => {
    if (!supabase) return;
    setDataError("");
    const { data: profile, error: profileError } = await supabase.from("couples").select("*").single();
    if (profileError) {
      setDataError(`We couldn't load your couple profile: ${profileError.message}`);
      return;
    }
    setCouple(profile as Couple);
    const { data: savedIdeas, error: ideasError } = await supabase.from("date_ideas").select("*").order("created_at", { ascending: true });
    if (ideasError) {
      setDataError(`We couldn't load your dates: ${ideasError.message}`);
      return;
    }
    if (savedIdeas.length === 0) {
      const starterIdeas = seedIdeas.map((idea) => ({ ...idea, couple_id: profile.id }));
      const { data: insertedIdeas, error: seedError } = await supabase.from("date_ideas").insert(starterIdeas).select("*");
      if (seedError) {
        setDataError(`We couldn't add the starter date ideas: ${seedError.message}`);
        return;
      }
      setIdeas(insertedIdeas as DateIdea[]);
    } else {
      setIdeas(savedIdeas as DateIdea[]);
    }
    setSession(currentSession);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    let active = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setDataError(`We couldn't restore your session: ${error.message}`);
        setAuthReady(true);
        return;
      }
      if (data.session) void loadCoupleData(data.session).finally(() => { if (active) setAuthReady(true); });
      else setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, updatedSession) => {
      if (!active) return;
      if (updatedSession) {
        setAuthReady(false);
        window.setTimeout(() => {
          if (active) void loadCoupleData(updatedSession).finally(() => { if (active) setAuthReady(true); });
        }, 0);
      } else {
        setSession(null);
        setCouple(null);
        setIdeas([]);
        setAuthReady(true);
      }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [loadCoupleData]);

  const counts = useMemo(
    () => ({
      ideas: ideas.filter((idea) => idea.status === "idea").length,
      planned: ideas.filter((idea) => idea.status === "planned").length,
      completed: ideas.filter((idea) => idea.status === "completed").length,
    }),
    [ideas],
  );

  const visibleIdeas = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("en-GB");
    return ideas.filter((idea) => {
      const inView =
        view === "favorites" ? idea.favorite
          : view === "planned" ? idea.status === "planned"
            : view === "memories" ? idea.status === "completed"
              : idea.status !== "completed";
      const inCategory = category === "All" || idea.category === category;
      const inSearch = !query || `${idea.title} ${idea.description} ${idea.category}`.toLocaleLowerCase("en-GB").includes(query);
      return inView && inCategory && inSearch;
    });
  }, [category, ideas, search, view]);

  const activeIdea = ideas.find((idea) => idea.id === activeIdeaId);

  function drawRandomIdea(startNewRound = false) {
    const availableIdeas = ideas.filter((idea) => idea.status === "idea" && (category === "All" || idea.category === category));
    if (availableIdeas.length === 0) {
      setActiveIdeaId(null);
      setDrawMessage(category === "All" ? "There are no new ideas left to draw. Add a new idea or choose one of your past dates to repeat." : `There are no ${category.toLocaleLowerCase("en-GB")} ideas available to draw right now.`);
      setModal("draw");
      return;
    }

    const alreadyDrawn = startNewRound ? [] : drawnIdeaIds;
    const unseenIdeas = availableIdeas.filter((idea) => !alreadyDrawn.includes(idea.id));
    const pool = unseenIdeas.length > 0 ? unseenIdeas : availableIdeas;
    const pickedIdea = pool[Math.floor(Math.random() * pool.length)];
    setActiveIdeaId(pickedIdea.id);
    setDrawnIdeaIds(unseenIdeas.length > 0 ? [...alreadyDrawn, pickedIdea.id] : [pickedIdea.id]);
    setDrawMessage(unseenIdeas.length === 0 && alreadyDrawn.length > 0 ? "You've seen every available idea. Here's a fresh spin!" : "");
    setModal("draw");
  }

  async function updateIdea(id: string, patch: Partial<DateIdea>): Promise<boolean> {
    if (!supabase) return false;
    setBusy(true);
    setDataError("");
    const { data, error } = await supabase.from("date_ideas").update(patch).eq("id", id).select("*").single();
    if (error) setDataError(`We couldn't save that change: ${error.message}`);
    else setIdeas((current) => current.map((idea) => idea.id === id ? data as DateIdea : idea));
    setBusy(false);
    return !error;
  }

  async function toggleFavorite(id: string) {
    const idea = ideas.find((item) => item.id === id);
    if (idea) await updateIdea(id, { favorite: !idea.favorite });
  }

  function openPlan(idea: DateIdea) {
    setActiveIdeaId(idea.id);
    setRepeatIdea(idea.status === "completed");
    setPlannedDate("");
    setModal("plan");
  }

  async function savePlan() {
    if (!activeIdeaId || !supabase || !couple) return;
    const currentIdea = ideas.find((idea) => idea.id === activeIdeaId);
    if (repeatIdea && currentIdea) {
      setBusy(true);
      setDataError("");
      const { data, error } = await supabase.from("date_ideas").insert({
        couple_id: couple.id,
        title: currentIdea.title,
        description: currentIdea.description,
        category: currentIdea.category,
        duration: currentIdea.duration,
        budget: currentIdea.budget,
        emoji: currentIdea.emoji,
        status: "planned",
        favorite: currentIdea.favorite,
        planned_for: plannedDate || null,
      }).select("*").single();
      if (error) {
        setDataError(`We couldn't plan another date: ${error.message}`);
        setBusy(false);
        return;
      }
      setIdeas((current) => [...current, data as DateIdea]);
      setBusy(false);
    } else {
      const saved = await updateIdea(activeIdeaId, { status: "planned", planned_for: plannedDate || null });
      if (!saved) return;
    }
    setModal(null);
    setActiveIdeaId(null);
    setRepeatIdea(false);
    setView("planned");
  }

  async function markCompleted(id: string) {
    setActiveIdeaId(id);
    setMemoryNote("");
    setRating(0);
    setLocationName("");
    setModal("memory");
  }

  async function saveMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeIdeaId) return;
    const saved = await updateIdea(activeIdeaId, {
      status: "completed",
      completed_at: new Date().toISOString().slice(0, 10),
      planned_for: null,
      memory: memoryNote.trim() || null,
      rating: rating || null,
      location_name: locationName.trim() || null,
    });
    if (!saved) return;
    setModal(null);
    setActiveIdeaId(null);
    setView("memories");
  }

  async function addIdea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !couple) return;
    const title = newTitle.trim();
    if (!title) return;
    setBusy(true);
    setDataError("");
    const { data, error } = await supabase.from("date_ideas").insert({
      couple_id: couple.id,
      title,
      description: "A little idea to add to your list of shared moments.",
      category: newCategory,
      duration: "To decide",
      budget: "To decide",
      emoji: "💌",
      status: "idea",
      favorite: false,
    }).select("*").single();
    if (error) {
      setDataError(`We couldn't add that date idea: ${error.message}`);
      setBusy(false);
      return;
    }
    setIdeas((current) => [...current, data as DateIdea]);
    setNewTitle("");
    setModal(null);
    setView("discover");
    setCategory("All");
    setBusy(false);
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setDataError(`We couldn't sign you out: ${error.message}`);
  }

  const pageHeading: Record<View, [string, string]> = {
    discover: [`${couple?.partner_one_name} & ${couple?.partner_two_name}, your next story starts here`, "Ideas to break the routine and make a little more time for each other."],
    favorites: ["Little things, lovely moments", "The ideas you saved to enjoy together."],
    planned: ["Something lovely is on the calendar", "Your upcoming moments, all in one place."],
    memories: ["It's part of your story now", "Every date you've shared is another memory to keep."],
  };

  if (!authReady) return <div className="loading-screen"><span className="brand-mark">t<span>♡</span></span><p>Opening your little corner…</p></div>;
  if (!session || !couple) return <><AuthScreen />{dataError && <p className="auth-global-error" role="alert">{dataError}</p>}</>;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setView("discover"); }} aria-label="TwoGether home"><span className="brand-mark">t<span>♡</span></span><span className="brand-name">two<span>gether</span></span></a>
        <div className="couple-chip"><span className="avatar-pair">{couple.partner_one_name.slice(0, 1)}<span>+</span>{couple.partner_two_name.slice(0, 1)}</span><span>{couple.partner_one_name} & {couple.partner_two_name}</span><span className="online-dot" /></div>
        <p className="nav-caption">YOUR SHARED SPACE</p>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item) => <button className={`nav-link ${view === item.view ? "active" : ""}`} key={item.view} onClick={() => { setView(item.view); setCategory("All"); }}><span className="nav-icon">{item.icon}</span>{item.label}{item.view === "planned" && counts.planned > 0 && <span className="nav-count">{counts.planned}</span>}</button>)}
        </nav>
        <div className="sidebar-note"><span className="note-sparkle">✦</span><p>The best plans are the ones you make together.</p><span>— a little reminder for today</span></div>
        <button className="sign-out-button" onClick={() => void signOut()}>Sign out <span>↗</span></button>
        <div className="sidebar-bottom"><span className="tiny-heart">♥</span> Made to bring you closer</div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">YOUR SHARED SPACE <span>/</span> <strong>{navItems.find((item) => item.view === view)?.label.toLocaleUpperCase("en-GB")}</strong></div>
          <div className="topbar-right"><span className="today-label">{new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span><span className="top-avatar">{couple.partner_one_name.slice(0, 1)}<span>{couple.partner_two_name.slice(0, 1)}</span></span></div>
        </header>

        <div className="content">
          <section className="welcome-row"><div><p className="eyebrow"><span /> A LITTLE MORE US</p><h1>{pageHeading[view][0]}</h1><p className="welcome-copy">{pageHeading[view][1]}</p></div><button className="add-button" onClick={() => setModal("new")}><span>＋</span> New idea</button></section>

          {dataError && <p className="data-alert" role="alert">{dataError}</p>}

          {view === "discover" && <>
            <section className="feature-banner">
              <div className="banner-copy"><span className="banner-kicker">AN INVITATION TO BE PRESENT</span><h2>You don't need a special occasion.<br />You already have each other.</h2><p>Pick an idea, save the date and let the rest unfold.</p><button className="banner-button" onClick={() => drawRandomIdea(true)}>Surprise us <span>✳</span></button></div>
              <div className="banner-art" aria-hidden="true"><span className="art-sun" /><span className="art-orbit orbit-one" /><span className="art-orbit orbit-two" /><span className="art-heart">♥</span><span className="art-caption">better, together</span></div><span className="banner-decoration">♡</span>
            </section>
            <section className="proposal-card">
              <span className="proposal-icon">💌</span>
              <div><span className="banner-kicker">A LITTLE QUESTION, A BIG YES</span><h2>Haven't asked them to be yours yet?</h2><p>Make today the day. We made a little something to help you ask.</p></div>
              <a className="proposal-button" href="https://ricardosilva21a.github.io/valentine_marta/" target="_blank" rel="noopener noreferrer">Ask them now <span>↗</span></a>
            </section>
            <section className="milestones-card" aria-label="Your important dates">
              <div className="milestones-heading"><span className="section-kicker">THE LITTLE DATES THAT MEAN A LOT</span><h2>Your story so far</h2></div>
              <div className="milestones-list">
                <span className="milestone-pill"><i>♥</i> Anniversary <strong>{formatDate(couple.relationship_date)}</strong></span>
                {couple.first_met_date && <span className="milestone-pill"><i>✦</i> First met <strong>{formatDate(couple.first_met_date)}</strong></span>}
                {couple.first_message_date && <span className="milestone-pill"><i>✉</i> First message <strong>{formatDate(couple.first_message_date)}</strong></span>}
                {couple.first_date_date && <span className="milestone-pill"><i>♡</i> First date <strong>{formatDate(couple.first_date_date)}</strong></span>}
                {couple.partner_one_birth_date && <span className="milestone-pill"><i>✿</i> {couple.partner_one_name}'s birthday <strong>{formatDate(couple.partner_one_birth_date, { day: "numeric", month: "long" })}</strong></span>}
                {couple.partner_two_birth_date && <span className="milestone-pill"><i>✿</i> {couple.partner_two_name}'s birthday <strong>{formatDate(couple.partner_two_birth_date, { day: "numeric", month: "long" })}</strong></span>}
              </div>
            </section>
          </>}

          <section className="stats-row" aria-label="Your date summary"><div className="stat-card"><span className="stat-icon lavender">✳</span><div><strong>{counts.ideas}</strong><span>ideas to try</span></div><span className="stat-arrow">↗</span></div><div className="stat-card"><span className="stat-icon peach">▦</span><div><strong>{counts.planned}</strong><span>dates planned</span></div><span className="stat-arrow">↗</span></div><div className="stat-card"><span className="stat-icon green">♡</span><div><strong>{counts.completed}</strong><span>moments lived</span></div><span className="stat-arrow">↗</span></div></section>

          <section className="ideas-section">
            <div className="section-heading"><div><p className="section-kicker">{view === "planned" ? "COMING UP" : view === "memories" ? "YOUR LITTLE ALBUM" : "PICKED WITH THE TWO OF YOU IN MIND"}</p><h2>{view === "planned" ? "Your upcoming dates" : view === "memories" ? "Moments you've shared" : view === "favorites" ? "Saved with love" : "Ideas to enjoy together"} <span className="heading-count">{visibleIdeas.length}</span></h2></div><label className="search-box"><span aria-hidden="true">⌕</span><input aria-label="Search date ideas" placeholder="Find an idea..." value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>⌘ K</kbd></label></div>
            <div className="filters" aria-label="Filter by category">{categories.map((item) => <button key={item} className={`filter-chip ${category === item ? "selected" : ""}`} onClick={() => setCategory(item)}>{item === "All" && <span className="filter-sparkle">✳</span>}{item}</button>)}</div>

            {visibleIdeas.length > 0 ? <div className="idea-grid">
              {visibleIdeas.map((idea, index) => <article className="idea-card" key={idea.id} style={{ animationDelay: `${index * 45}ms` }}>
                <div className={`idea-art art-${index % 6}`}><span className="idea-emoji">{idea.emoji}</span><span className="category-label">{idea.category}</span><button className={`favorite-button ${idea.favorite ? "is-favorite" : ""}`} aria-label={idea.favorite ? "Remove from favourites" : "Add to favourites"} onClick={() => void toggleFavorite(idea.id)}>{idea.favorite ? "♥" : "♡"}</button>{idea.status === "planned" && <span className="planned-label">PLANNED</span>}{idea.status === "completed" && <span className="completed-label">LIVED ✓</span>}</div>
                <div className="idea-body"><div className="idea-title-row"><h3>{idea.title}</h3><span className="card-arrow">↗</span></div><p className="idea-description">{idea.description}</p>{idea.planned_for && <p className="planned-date">▦ {formatDate(idea.planned_for)}</p>}
                  {view === "memories" && (idea.memory || idea.location_name || idea.rating) && <div className="memory-details">{idea.rating && <span aria-label={`${idea.rating} out of 5 stars`}>{"★".repeat(idea.rating)}{"☆".repeat(5 - idea.rating)}</span>}{idea.location_name && <span>⌖ {idea.location_name}</span>}{idea.memory && <p>{idea.memory}</p>}</div>}
                  <div className="idea-footer"><div className="idea-meta"><span>◷ {idea.duration}</span><i /><span>{idea.budget}</span></div>{idea.status === "idea" ? <button className="card-action" disabled={busy} onClick={() => openPlan(idea)}>Plan this date <span>＋</span></button> : idea.status === "planned" ? <button className="card-action done-action" disabled={busy} onClick={() => void markCompleted(idea.id)}>We did it <span>✓</span></button> : <button className="card-action undo-action" disabled={busy} onClick={() => openPlan(idea)}>Plan again <span>↗</span></button>}</div>
                </div>
              </article>)}
            </div> : <div className="empty-state"><span>♡</span><h3>No dates here just yet</h3><p>{view === "favorites" ? "Save your favourite ideas and they'll be waiting here." : "Try another category or add an idea of your own."}</p><button className="add-button" onClick={() => setModal("new")}>＋ Add an idea</button></div>}
          </section>
          <footer className="page-footer"><span>Made with love, for the two of you <span className="tiny-heart">♥</span></span><span>ONE DAY AT A TIME · ALWAYS TOGETHER</span></footer>
        </div>
      </main>

      {modal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}><section className={`modal-card ${modal === "draw" ? "draw-modal" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" aria-label="Close" onClick={() => setModal(null)}>×</button><span className="modal-icon">{modal === "plan" ? "♡" : modal === "memory" ? "✧" : modal === "draw" ? "✳" : "✳"}</span>
        <p className="section-kicker">{modal === "plan" ? "A PLAN JUST FOR THE TWO OF YOU" : modal === "memory" ? "SAVE THIS LITTLE MOMENT" : modal === "draw" ? "YOUR DATE NIGHT, DECIDED" : "ANOTHER LOVELY IDEA"}</p>
        <h2 id="modal-title">{modal === "plan" ? `Shall we make a date of it${activeIdea ? `: ${activeIdea.title}` : ""}?` : modal === "memory" ? "How was your date?" : modal === "draw" ? activeIdea ? "Tonight's little adventure" : "Let's find an idea" : "What would you love to do?"}</h2>
        {modal === "draw" ? <>{activeIdea ? <div className="draw-result"><span className="draw-emoji">{activeIdea.emoji}</span><span className="category-label">{activeIdea.category}</span><h3>{activeIdea.title}</h3><p>{activeIdea.description}</p><div className="idea-meta"><span>◷ {activeIdea.duration}</span><i /><span>{activeIdea.budget}</span></div></div> : <p className="modal-copy">{drawMessage}</p>}{drawMessage && activeIdea && <p className="draw-message">{drawMessage}</p>}{activeIdea && <div className="draw-actions"><button className="draw-again-button" onClick={() => drawRandomIdea()}>Draw again <span>⟳</span></button><button className="modal-submit" onClick={() => openPlan(activeIdea)}>Plan this date <span>→</span></button></div>}{!activeIdea && <button className="modal-submit" onClick={() => { setModal(null); setNewTitle(""); setModal("new"); }}>Add a new idea <span>→</span></button>}</>
          : modal === "plan" ? <><p className="modal-copy">{repeatIdea ? "This will add a new date to your plans and keep the original memory safe." : "Pick a date if you know it already. You can decide later, too."}</p><label className="form-label" htmlFor="planned-date">Date (optional)<input className="form-input" id="planned-date" type="date" value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} /></label><button className="modal-submit" disabled={busy} onClick={() => void savePlan()}>{busy ? "Saving…" : "Save to planned dates"} <span>→</span></button></>
          : modal === "memory" ? <form onSubmit={(event) => void saveMemory(event)}><p className="modal-copy">Add a little note, a rating or where you went. Every detail is optional.</p><label className="form-label">Your memory <textarea className="form-input memory-input" maxLength={1000} placeholder="What was your favourite part?" value={memoryNote} onChange={(event) => setMemoryNote(event.target.value)} /></label><label className="form-label">Where did you go? <input className="form-input" maxLength={160} placeholder="A place, a city, or home" value={locationName} onChange={(event) => setLocationName(event.target.value)} /></label><label className="form-label">How would you rate it?</label><div className="rating-picker" aria-label="Choose a rating from one to five">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} aria-label={`${value} stars`} aria-pressed={rating === value} className={value <= rating ? "chosen" : ""} onClick={() => setRating(value)}>★</button>)}</div><button className="modal-submit" type="submit" disabled={busy}>{busy ? "Saving…" : "Save to our memories"} <span>→</span></button></form>
            : <form onSubmit={(event) => void addIdea(event)}><label className="form-label" htmlFor="idea-title">Your idea<input className="form-input" id="idea-title" autoFocus placeholder="e.g. Stargazing on a summer night" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} required maxLength={70} /></label><label className="form-label" htmlFor="idea-category">Category<select className="form-input" id="idea-category" value={newCategory} onChange={(event) => setNewCategory(event.target.value as Category)}>{categories.filter((item): item is Category => item !== "All").map((item) => <option key={item}>{item}</option>)}</select></label><button className="modal-submit" type="submit" disabled={busy}>{busy ? "Saving…" : "Save this idea"} <span>→</span></button></form>}
      </section></div>}
    </div>
  );
}

export default App;
