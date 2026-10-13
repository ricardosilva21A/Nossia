import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { CalendarView, LocationSearch } from "./CalendarMap";
import type { Category, DateIdea, FeelingAnswers, GeocodedPlace, Mood } from "./types";

type View = "discover" | "favorites" | "planned" | "memories" | "calendar" | "map" | "insights";
type AuthMode = "sign-in" | "sign-up";
type DiscoveryMode = "random" | "feeling";
const LazyMapView = lazy(() => import("./MapView").then((module) => ({ default: module.MapView })));
type DatePhoto = {
  id: string;
  couple_id: string;
  date_idea_id: string;
  storage_path: string;
  created_at: string;
  signed_url: string | null;
};
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
type SeedIdea = Omit<DateIdea, "id" | "couple_id" | "planned_for" | "completed_at" | "memory" | "rating" | "location_name" | "latitude" | "longitude">;
const moodOptions: Mood[] = ["Romantic", "Fun", "Relaxing", "Adventure", "Creative", "Surprise me"];

const categories: Array<Category | "All"> = ["All", "Romantic", "Adventure", "Food & drink", "Creative", "Relaxing", "Culture"];
const seedIdeas: SeedIdea[] = [
  { title: "Sunset picnic", description: "Pack a basket with your favourite treats and find a little spot to call your own.", category: "Romantic", mood: "Romantic", duration: "2–3 hours", duration_minutes: 150, budget: "€€", budget_eur: 30, travel_minutes: null, at_home: false, emoji: "🧺", status: "idea", favorite: true },
  { title: "Cook something new", description: "Choose a cuisine, put on some music and make dinner together, no rush.", category: "Food & drink", mood: "Fun", duration: "1–2 hours", duration_minutes: 90, budget: "€", budget_eur: 10, travel_minutes: 0, at_home: true, emoji: "🍝", status: "idea", favorite: false },
  { title: "Wander without a plan", description: "Pick a direction, put your phones away and discover somewhere new.", category: "Adventure", mood: "Adventure", duration: "2 hours", duration_minutes: 120, budget: "Free", budget_eur: 0, travel_minutes: 15, at_home: false, emoji: "🚲", status: "idea", favorite: false },
  { title: "A games night for two", description: "A little friendly competition, snacks and the winner picks the next film.", category: "Relaxing", mood: "Relaxing", duration: "2 hours", duration_minutes: 120, budget: "€", budget_eur: 10, travel_minutes: 0, at_home: true, emoji: "🎲", status: "idea", favorite: false },
  { title: "Visit a museum", description: "Choose an exhibition and share the pieces that make you feel something.", category: "Culture", mood: "Fun", duration: "2–3 hours", duration_minutes: 150, budget: "€€", budget_eur: 30, travel_minutes: null, at_home: false, emoji: "🖼️", status: "idea", favorite: false },
  { title: "Try a pottery class", description: "Make something with your hands. Wonky little creations tell stories too.", category: "Creative", mood: "Creative", duration: "2 hours", duration_minutes: 120, budget: "€€€", budget_eur: 60, travel_minutes: null, at_home: false, emoji: "🏺", status: "idea", favorite: true },
  { title: "Breakfast in bed", description: "Start the day slowly with coffee, fruit and a morning just for the two of you.", category: "Romantic", mood: "Romantic", duration: "1 hour", duration_minutes: 60, budget: "€", budget_eur: 10, travel_minutes: 0, at_home: true, emoji: "🥐", status: "idea", favorite: false },
  { title: "Find a scenic trail", description: "Bring some water, wear comfy shoes and find a beautiful path to explore.", category: "Adventure", mood: "Adventure", duration: "3–4 hours", duration_minutes: 210, budget: "Free", budget_eur: 0, travel_minutes: null, at_home: false, emoji: "🥾", status: "idea", favorite: false },
];

const navItems: Array<{ view: View; label: string; icon: string }> = [
  { view: "discover", label: "Date ideas", icon: "✳" },
  { view: "favorites", label: "Our favourites", icon: "♡" },
  { view: "planned", label: "Planned dates", icon: "▦" },
  { view: "memories", label: "Our memories", icon: "⌁" },
  { view: "calendar", label: "Calendar", icon: "▦" },
  { view: "map", label: "Date map", icon: "⌖" },
  { view: "insights", label: "Our stats", icon: "◷" },
];

function formatDate(date: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  return new Intl.DateTimeFormat("en-GB", options).format(new Date(`${date.slice(0, 10)}T12:00:00`));
}

function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function categoryForMood(mood: Mood): Category {
  if (mood === "Romantic") return "Romantic";
  if (mood === "Relaxing") return "Relaxing";
  if (mood === "Adventure") return "Adventure";
  if (mood === "Creative") return "Creative";
  return "Food & drink";
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
          setMessage("Your couple account is ready. Welcome to Nossia!");
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
        <a className="brand" href="#"><span className="brand-mark">n<span>♡</span></span><span className="brand-name">nossia</span></a>
        <div className="auth-quote"><span>✦ A LITTLE MORE US</span><h1>Make time for<br />us.</h1><p>Plan the dates. Keep the memories. Celebrate all the little things that make you, you.</p><span className="auth-heart">♡</span></div>
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
  const [photos, setPhotos] = useState<DatePhoto[]>([]);
  const [view, setView] = useState<View>("discover");
  const [category, setCategory] = useState<Category | "All">("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"new" | "plan" | "memory" | "draw" | "feeling" | "album" | "location" | null>(null);
  const [activeIdeaId, setActiveIdeaId] = useState<string | null>(null);
  const [drawnIdeaIds, setDrawnIdeaIds] = useState<string[]>([]);
  const [randomDrawCount, setRandomDrawCount] = useState(0);
  const [drawMessage, setDrawMessage] = useState("");
  const [discoveryMode, setDiscoveryMode] = useState<DiscoveryMode>("random");
  const [feelingAnswers, setFeelingAnswers] = useState<FeelingAnswers>({ mood: "Surprise me", duration: "4", budget: "4", distance: "4", avoid: "" });
  const [newMood, setNewMood] = useState<Mood>("Romantic");
  const [newDuration, setNewDuration] = useState("120");
  const [newBudget, setNewBudget] = useState("30");
  const [newTravel, setNewTravel] = useState("");
  const [newAtHome, setNewAtHome] = useState(false);
  const [plannedDate, setPlannedDate] = useState("");
  const [plannedLocation, setPlannedLocation] = useState("");
  const [plannedLatitude, setPlannedLatitude] = useState<number | null>(null);
  const [plannedLongitude, setPlannedLongitude] = useState<number | null>(null);
  const [repeatIdea, setRepeatIdea] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("Romantic");
  const [memoryNote, setMemoryNote] = useState("");
  const [rating, setRating] = useState(0);
  const [locationName, setLocationName] = useState("");
  const [locationLatitude, setLocationLatitude] = useState<number | null>(null);
  const [locationLongitude, setLocationLongitude] = useState<number | null>(null);
  const [photoError, setPhotoError] = useState("");
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
    const { data: savedPhotos, error: photosError } = await supabase.from("date_photos").select("*").order("created_at", { ascending: true });
    if (photosError) {
      setPhotos([]);
      setDataError(`We couldn't load your photo albums: ${photosError.message}`);
    } else if (savedPhotos.length === 0) {
      setPhotos([]);
    } else {
      const { data: signedPhotos, error: signedPhotosError } = await supabase.storage
        .from("date-photos")
        .createSignedUrls(savedPhotos.map((photo) => photo.storage_path), 3600);
      if (signedPhotosError) {
        setPhotos(savedPhotos.map((photo) => ({ ...photo, signed_url: null })) as DatePhoto[]);
        setDataError(`We couldn't open your private photo albums: ${signedPhotosError.message}`);
      } else {
        if (signedPhotos.some((photo) => !photo.signedUrl)) {
          setDataError("We couldn't create a view link for one or more private album photos.");
        }
        setPhotos(savedPhotos.map((photo, index) => ({
          ...photo,
          signed_url: signedPhotos[index]?.signedUrl ?? null,
        })) as DatePhoto[]);
      }
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
        setPhotos([]);
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

  const completedMoodStats = useMemo(() => {
    const completedIdeas = ideas.filter((idea) => idea.status === "completed");
    const moodCounts = moodOptions
      .filter((mood) => mood !== "Surprise me")
      .map((mood) => ({
        mood,
        count: completedIdeas.filter((idea) => idea.mood === mood).length,
      }))
      .filter((stat) => stat.count > 0)
      .sort((a, b) => b.count - a.count || a.mood.localeCompare(b.mood));
    return { total: completedIdeas.length, moods: moodCounts, top: moodCounts.slice(0, 2) };
  }, [ideas]);

  const visibleIdeas = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("en-GB");
    return ideas.filter((idea) => {
      const inView =
        view === "favorites" ? idea.favorite
          : view === "planned" ? idea.status === "planned"
            : view === "memories" ? idea.status === "completed"
              : view === "calendar" || view === "map" ? idea.status === "planned" || idea.status === "completed"
              : idea.status !== "completed";
      const inCategory = category === "All" || idea.category === category;
      const inSearch = !query || `${idea.title} ${idea.description} ${idea.category} ${idea.location_name ?? ""}`.toLocaleLowerCase("en-GB").includes(query);
      return inView && inCategory && inSearch;
    });
  }, [category, ideas, search, view]);

  const activeIdea = ideas.find((idea) => idea.id === activeIdeaId);

  function drawRandomIdea(startNewRound = false) {
    const availableIdeas = ideas.filter((idea) => idea.status === "idea" && (category === "All" || idea.category === category));
    const previousDraws = startNewRound ? [] : drawnIdeaIds;
    const drawCount = startNewRound ? 0 : randomDrawCount;
    if (drawCount >= 3) {
      setDrawMessage("You've used your three draws. Choose one of the ideas above or try Feeling.");
      return;
    }
    if (availableIdeas.length === 0) {
      setActiveIdeaId(null);
      setDrawMessage(category === "All" ? "There are no new ideas left to draw. Add a new idea or choose one of your past dates to repeat." : `There are no ${category.toLocaleLowerCase("en-GB")} ideas available to draw right now.`);
      setDiscoveryMode("random");
      setDrawnIdeaIds([]);
      setRandomDrawCount(0);
      setModal("draw");
      return;
    }

    const unseenIdeas = availableIdeas.filter((idea) => !previousDraws.includes(idea.id));
    const pool = unseenIdeas.length > 0 ? unseenIdeas : availableIdeas;
    const pickedIdea = pool[Math.floor(Math.random() * pool.length)];
    setActiveIdeaId(pickedIdea.id);
    setDrawnIdeaIds(unseenIdeas.length > 0 || previousDraws.length === 0 ? [...previousDraws, pickedIdea.id] : previousDraws);
    setRandomDrawCount(drawCount + 1);
    setDiscoveryMode("random");
    setDrawMessage(unseenIdeas.length === 0 && previousDraws.length > 0 ? "You've seen every different idea available. Here's another spin!" : "");
    setModal("draw");
  }

  function beginFeeling() {
    setDiscoveryMode("feeling");
    setDrawMessage("");
    setModal("feeling");
  }

  function chooseFeelingSuggestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const avoidTerms = feelingAnswers.avoid.split(",").map((term) => term.trim().toLocaleLowerCase("en-GB")).filter(Boolean);
    const eligibleIdeas = ideas.filter((idea) => {
      if (idea.status !== "idea") return false;
      if (feelingAnswers.mood !== "Surprise me" && idea.mood !== feelingAnswers.mood) return false;
      const duration = idea.duration_minutes;
      if (duration === null) return false;
      if (feelingAnswers.duration === "1" && duration > 60) return false;
      if (feelingAnswers.duration === "2" && (duration <= 60 || duration > 120)) return false;
      if (feelingAnswers.duration === "3" && (duration <= 120 || duration > 240)) return false;
      if (feelingAnswers.duration === "4" && duration <= 240) return false;
      const budget = idea.budget_eur;
      if (feelingAnswers.budget !== "4" && budget === null) return false;
      if (budget !== null && feelingAnswers.budget === "1" && budget > 10) return false;
      if (budget !== null && feelingAnswers.budget === "2" && (budget <= 10 || budget > 30)) return false;
      if (budget !== null && feelingAnswers.budget === "3" && (budget <= 30 || budget > 60)) return false;
      if (feelingAnswers.distance === "1" && !idea.at_home) return false;
      if (feelingAnswers.distance === "2" && !idea.at_home && (idea.travel_minutes === null || idea.travel_minutes > 30)) return false;
      if (feelingAnswers.distance === "3" && !idea.at_home && (idea.travel_minutes === null || idea.travel_minutes > 60)) return false;
      const searchable = `${idea.title} ${idea.description} ${idea.category} ${idea.mood}`.toLocaleLowerCase("en-GB");
      return !avoidTerms.some((term) => searchable.includes(term));
    });

    if (eligibleIdeas.length === 0) {
      setActiveIdeaId(null);
      setDrawMessage("No ideas match every answer yet. Try changing one or two answers, or add more detail to your date ideas.");
      setModal("feeling");
      return;
    }

    const pickedIdea = eligibleIdeas[Math.floor(Math.random() * eligibleIdeas.length)];
    setActiveIdeaId(pickedIdea.id);
    setDrawMessage("");
    setDiscoveryMode("feeling");
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
    setPlannedLocation(idea.status === "completed" ? idea.location_name ?? "" : "");
    setPlannedLatitude(idea.status === "completed" ? idea.latitude : null);
    setPlannedLongitude(idea.status === "completed" ? idea.longitude : null);
    setModal("plan");
  }

  async function planForToday(idea: DateIdea) {
    if (idea.status !== "idea") return;
    const saved = await updateIdea(idea.id, { status: "planned", planned_for: localDateString() });
    if (saved) setView("planned");
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
        mood: currentIdea.mood,
        duration_minutes: currentIdea.duration_minutes,
        budget_eur: currentIdea.budget_eur,
        travel_minutes: currentIdea.travel_minutes,
        at_home: currentIdea.at_home,
        emoji: currentIdea.emoji,
        status: "planned",
        favorite: currentIdea.favorite,
        planned_for: plannedDate,
        location_name: plannedLocation.trim() || null,
        latitude: plannedLatitude,
        longitude: plannedLongitude,
      }).select("*").single();
      if (error) {
        setDataError(`We couldn't plan another date: ${error.message}`);
        setBusy(false);
        return;
      }
      setIdeas((current) => [...current, data as DateIdea]);
      setBusy(false);
    } else {
      const saved = await updateIdea(activeIdeaId, {
        status: "planned",
        planned_for: plannedDate,
        location_name: plannedLocation.trim() || null,
        latitude: plannedLatitude,
        longitude: plannedLongitude,
      });
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
    setLocationLatitude(null);
    setLocationLongitude(null);
    setModal("memory");
  }

  async function saveMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeIdeaId) return;
    const saved = await updateIdea(activeIdeaId, {
      status: "completed",
      completed_at: localDateString(),
      planned_for: null,
      memory: memoryNote.trim() || null,
      rating: rating || null,
      location_name: locationName.trim() || null,
      latitude: locationLatitude,
      longitude: locationLongitude,
    });
    if (!saved) return;
    setModal(null);
    setActiveIdeaId(null);
    setView("memories");
  }

  async function openAlbum(idea: DateIdea) {
    setActiveIdeaId(idea.id);
    setPhotoError("");
    setModal("album");
    const ideaPhotos = photos.filter((photo) => photo.date_idea_id === idea.id);
    if (ideaPhotos.length === 0 || !supabase) return;
    setBusy(true);
    const { data, error } = await supabase.storage.from("date-photos")
      .createSignedUrls(ideaPhotos.map((photo) => photo.storage_path), 3600);
    if (error) {
      setPhotoError(`We couldn't open the photos: ${error.message}`);
    } else {
      if (data.some((photo) => !photo.signedUrl)) {
        setPhotoError("We couldn't create a view link for one or more album photos.");
      }
      setPhotos((current) => current.map((photo) => {
        const photoIndex = ideaPhotos.findIndex((candidate) => candidate.id === photo.id);
        return photoIndex < 0 ? photo : { ...photo, signed_url: data[photoIndex]?.signedUrl ?? null };
      }));
    }
    setBusy(false);
  }

  async function uploadPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (!files.length || !activeIdeaId || !couple || !supabase) return;
    setBusy(true);
    setPhotoError("");
    const supportedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const uploadedPhotos: DatePhoto[] = [];

    for (const file of files) {
      if (!supportedTypes.includes(file.type)) {
        setPhotoError(`${file.name} isn't a supported image. Choose JPG, PNG, WEBP or GIF files.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setPhotoError(`${file.name} is larger than the 10 MB limit.`);
        continue;
      }
      const extension = file.type.split("/")[1];
      const storagePath = `${couple.id}/${activeIdeaId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("date-photos").upload(storagePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) {
        setPhotoError(`We couldn't upload ${file.name}: ${uploadError.message}`);
        continue;
      }

      const { data: photo, error: photoError } = await supabase.from("date_photos").insert({
        couple_id: couple.id,
        date_idea_id: activeIdeaId,
        storage_path: storagePath,
      }).select("*").single();
      if (photoError) {
        const { error: cleanupError } = await supabase.storage.from("date-photos").remove([storagePath]);
        setPhotoError(cleanupError
          ? `We couldn't save ${file.name} to the album (${photoError.message}) or remove its uploaded file (${cleanupError.message}).`
          : `We couldn't save ${file.name} to the album: ${photoError.message}`);
        continue;
      }

      const { data: signedPhoto, error: signedPhotoError } = await supabase.storage.from("date-photos").createSignedUrl(storagePath, 3600);
      if (signedPhotoError) {
        setPhotoError(`The photo was uploaded, but we couldn't display it: ${signedPhotoError.message}`);
      }
      uploadedPhotos.push({ ...photo, signed_url: signedPhoto?.signedUrl ?? null } as DatePhoto);
    }

    if (uploadedPhotos.length) setPhotos((current) => [...current, ...uploadedPhotos]);
    setBusy(false);
  }

  async function savePinnedLocation() {
    if (!activeIdeaId || !locationName.trim() || locationLatitude === null || locationLongitude === null) {
      setDataError("Search for a place and choose a result before saving its map pin.");
      return;
    }
    const saved = await updateIdea(activeIdeaId, {
      location_name: locationName.trim(),
      latitude: locationLatitude,
      longitude: locationLongitude,
    });
    if (saved) {
      setModal(null);
      setActiveIdeaId(null);
    }
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
      mood: newMood,
      duration: `${Number(newDuration) >= 240 ? "4+" : Number(newDuration) / 60} hour${Number(newDuration) === 60 ? "" : "s"}`,
      duration_minutes: Number(newDuration),
      budget: Number(newBudget) === 0 ? "Free" : `€${Number(newBudget) > 10 ? "€" : ""}${Number(newBudget) > 30 ? "€" : ""}`,
      budget_eur: Number(newBudget),
      travel_minutes: newTravel ? Number(newTravel) : newAtHome ? 0 : null,
      at_home: newAtHome,
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
    discover: [`${couple?.partner_one_name} & ${couple?.partner_two_name}, what do you feel like today?`, "Make time for us."],
    favorites: ["Little things, lovely moments", "The ideas you saved to enjoy together."],
    planned: ["Something lovely is on the calendar", "Your upcoming moments, all in one place."],
    memories: ["It's part of your story now", "Every date you've shared is another memory to keep."],
    calendar: ["Our dates, day by day", "See what you've planned and the memories you've made."],
    map: ["All the places we've been", "Explore the places tied to your dates and memories."],
    insights: ["The story of us", "See what your dates say about the things you love doing together."],
  };

  if (!authReady) return <div className="loading-screen"><span className="brand-mark">n<span>♡</span></span><p>Opening your little corner…</p></div>;
  if (!session || !couple) return <><AuthScreen />{dataError && <p className="auth-global-error" role="alert">{dataError}</p>}</>;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setView("discover"); }} aria-label="Nossia home"><span className="brand-mark">n<span>♡</span></span><span className="brand-name">nossia</span></a>
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
              <div className="banner-copy"><span className="banner-kicker">NOSSIA · MAKE TIME FOR US</span><h2>Make time for us.</h2><p>What do you feel like doing today?</p></div>
              <div className="banner-art" aria-hidden="true"><span className="art-sun" /><span className="art-orbit orbit-one" /><span className="art-orbit orbit-two" /><span className="art-heart">♥</span><span className="art-caption">better, together</span></div><span className="banner-decoration">♡</span>
            </section>
            <section className="discovery-options" aria-label="Choose how to find a date">
              <button className="discovery-option random-option" onClick={() => drawRandomIdea(true)}>
                <span className="discovery-option-icon">✳</span><span className="discovery-option-copy"><strong>Surprise us</strong><small>Draw a random date idea</small></span><span className="discovery-option-arrow">→</span>
              </button>
              <button className="discovery-option feeling-option" onClick={beginFeeling}>
                <span className="discovery-option-icon">♡</span><span className="discovery-option-copy"><strong>Choose by feeling</strong><small>Answer a few quick questions</small></span><span className="discovery-option-arrow">→</span>
              </button>
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

          {(view === "calendar" || view === "map") && <div className="date-view-filters">
            <label className="search-box"><span aria-hidden="true">⌕</span><input aria-label="Search dates" placeholder="Find a date or place..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
            <div className="filters" aria-label="Filter dates by category">{categories.map((item) => <button key={item} className={`filter-chip ${category === item ? "selected" : ""}`} onClick={() => setCategory(item)}>{item === "All" && <span className="filter-sparkle">✳</span>}{item}</button>)}</div>
          </div>}

          {view === "calendar" && <CalendarView ideas={visibleIdeas} />}
          {view === "map" && <Suspense fallback={<div className="map-loading">Opening the map…</div>}><LazyMapView
            ideas={visibleIdeas}
            onPinLocation={(idea) => {
              setActiveIdeaId(idea.id);
              setLocationName(idea.location_name ?? "");
              setLocationLatitude(idea.latitude);
              setLocationLongitude(idea.longitude);
              setModal("location");
            }}
          /></Suspense>}

          {view === "insights" && <section className="insights-panel" aria-label="Couple date statistics">
            <div className="insights-total"><span className="stat-icon green">♡</span><div><strong>{completedMoodStats.total}</strong><span>dates completed together</span></div></div>
            {completedMoodStats.total < 5
              ? <div className="insights-empty"><span className="section-kicker">YOUR COUPLE PROFILE</span><h2>Your story is just getting started</h2><p>Complete {5 - completedMoodStats.total} more {5 - completedMoodStats.total === 1 ? "date" : "dates"} to unlock your couple profile. We’ll look at the moods of your completed dates and show your top two.</p><div className="insights-progress" role="progressbar" aria-label="Dates until your couple profile is available" aria-valuenow={completedMoodStats.total} aria-valuemin={0} aria-valuemax={5}><span style={{ width: `${Math.min(completedMoodStats.total / 5 * 100, 100)}%` }} /></div><span className="insights-progress-label">{completedMoodStats.total} of 5 dates</span></div>
              : <div className="insights-profile"><span className="section-kicker">YOUR COUPLE PROFILE</span><h2>You’re a {completedMoodStats.top.map((stat) => stat.mood).join(" & ")} couple</h2><p>Based on your {completedMoodStats.total} completed dates, you’ve shared these kinds of moments the most:</p><div className="insights-moods">{completedMoodStats.moods.map((stat) => <div className="insights-mood" key={stat.mood}><div><strong>{stat.mood}</strong><span>{stat.count} {stat.count === 1 ? "date" : "dates"}</span></div><div className="insights-progress" aria-hidden="true"><span style={{ width: `${stat.count / completedMoodStats.total * 100}%` }} /></div></div>)}</div></div>}
          </section>}

          {view !== "calendar" && view !== "map" && view !== "insights" && <section className="ideas-section">
            <div className="section-heading"><div><p className="section-kicker">{view === "planned" ? "COMING UP" : view === "memories" ? "YOUR LITTLE ALBUM" : "PICKED WITH THE TWO OF YOU IN MIND"}</p><h2>{view === "planned" ? "Your upcoming dates" : view === "memories" ? "Moments you've shared" : view === "favorites" ? "Saved with love" : "Ideas to enjoy together"} <span className="heading-count">{visibleIdeas.length}</span></h2></div><label className="search-box"><span aria-hidden="true">⌕</span><input aria-label="Search date ideas" placeholder="Find an idea..." value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>⌘ K</kbd></label></div>
            <div className="filters" aria-label="Filter by category">{categories.map((item) => <button key={item} className={`filter-chip ${category === item ? "selected" : ""}`} onClick={() => setCategory(item)}>{item === "All" && <span className="filter-sparkle">✳</span>}{item}</button>)}</div>

            {visibleIdeas.length > 0 ? <div className="idea-grid">
              {visibleIdeas.map((idea, index) => <article className="idea-card" key={idea.id} style={{ animationDelay: `${index * 45}ms` }}>
                <div className={`idea-art art-${index % 6}`}><span className="idea-emoji">{idea.emoji}</span><span className="category-label">{idea.category}</span><button className={`favorite-button ${idea.favorite ? "is-favorite" : ""}`} aria-label={idea.favorite ? "Remove from favourites" : "Add to favourites"} onClick={() => void toggleFavorite(idea.id)}>{idea.favorite ? "♥" : "♡"}</button>{idea.status === "planned" && <span className="planned-label">PLANNED</span>}{idea.status === "completed" && <span className="completed-label">LIVED ✓</span>}</div>
                <div className="idea-body"><div className="idea-title-row"><h3>{idea.title}</h3><span className="card-arrow">↗</span></div><p className="idea-description">{idea.description}</p>{idea.planned_for && <p className="planned-date">▦ {formatDate(idea.planned_for)}</p>}
                  {view === "memories" && (idea.memory || idea.location_name || idea.rating) && <div className="memory-details">{idea.rating && <span aria-label={`${idea.rating} out of 5 stars`}>{"★".repeat(idea.rating)}{"☆".repeat(5 - idea.rating)}</span>}{idea.location_name && <span>⌖ {idea.location_name}</span>}{idea.memory && <p>{idea.memory}</p>}</div>}
                  <div className="idea-footer"><div className="idea-meta"><span>◷ {idea.duration}</span><i /><span>{idea.budget}</span></div>{idea.status === "idea" ? <button className="card-action" disabled={busy} onClick={() => void planForToday(idea)}>Plan for today <span>＋</span></button> : idea.status === "planned" ? <button className="card-action done-action" disabled={busy} onClick={() => void markCompleted(idea.id)}>We did it <span>✓</span></button> : <div className="memory-card-actions"><button className="card-action album-action" disabled={busy} onClick={() => void openAlbum(idea)}>Album ({photos.filter((photo) => photo.date_idea_id === idea.id).length})</button><button className="card-action undo-action" disabled={busy} onClick={() => openPlan(idea)}>Plan again <span>↗</span></button></div>}</div>
                </div>
              </article>)}
            </div> : <div className="empty-state"><span>♡</span><h3>No dates here just yet</h3><p>{view === "favorites" ? "Save your favourite ideas and they'll be waiting here." : "Try another category or add an idea of your own."}</p><button className="add-button" onClick={() => setModal("new")}>＋ Add an idea</button></div>}
          </section>}
          <footer className="page-footer"><span>Made with love, for the two of you <span className="tiny-heart">♥</span></span><span>ONE DAY AT A TIME · ALWAYS TOGETHER</span></footer>
        </div>
      </main>

      {modal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setModal(null); }}><section className={`modal-card ${modal === "draw" ? "draw-modal" : ""} ${modal === "album" ? "album-modal" : ""} ${modal === "feeling" ? "feeling-modal" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" aria-label="Close" disabled={busy} onClick={() => setModal(null)}>×</button><span className="modal-icon">{modal === "plan" ? "♡" : modal === "memory" ? "✧" : modal === "draw" ? "✳" : modal === "album" ? "▧" : modal === "location" ? "⌖" : modal === "feeling" ? "♡" : "✳"}</span>
        <p className="section-kicker">{modal === "plan" ? "A PLAN JUST FOR THE TWO OF YOU" : modal === "memory" ? "SAVE THIS LITTLE MOMENT" : modal === "draw" ? discoveryMode === "feeling" ? "YOUR FEELING MATCH" : "YOUR DATE NIGHT, DECIDED" : modal === "feeling" ? "CHOOSE BY FEELING" : modal === "album" ? "YOUR PRIVATE PHOTO ALBUM" : modal === "location" ? "ADD THIS PLACE TO YOUR MAP" : "ANOTHER LOVELY IDEA"}</p>
        <h2 id="modal-title">{modal === "plan" ? `Shall we make a date of it${activeIdea ? `: ${activeIdea.title}` : ""}?` : modal === "memory" ? "How was your date?" : modal === "draw" ? activeIdea ? discoveryMode === "feeling" ? "A date idea for the two of you" : "Your next little adventure" : "Let’s find an idea" : modal === "feeling" ? "What do you feel like today?" : modal === "album" ? activeIdea ? `${activeIdea.title} album` : "Date album" : modal === "location" ? "Where did it happen?" : "What would you love to do?"}</h2>
        {modal === "draw" ? <>{activeIdea ? <div className="draw-result"><span className="draw-emoji">{activeIdea.emoji}</span><span className="category-label">{activeIdea.category}</span><h3>{activeIdea.title}</h3><p>{activeIdea.description}</p><div className="idea-meta"><span>◷ {activeIdea.duration}</span><i /><span>{activeIdea.budget}</span></div></div> : <p className="modal-copy">{drawMessage}</p>}{drawMessage && activeIdea && <p className="draw-message">{drawMessage}</p>}
          {discoveryMode === "random" && drawnIdeaIds.length > 0 && <div className="suggestion-history"><span>PREVIOUS DRAWS</span><div>{drawnIdeaIds.map((id, index) => { const idea = ideas.find((item) => item.id === id); return idea ? <button type="button" key={`${id}-${index}`} className={activeIdeaId === id ? "selected-suggestion" : ""} onClick={() => setActiveIdeaId(id)} aria-label={`Choose suggestion ${index + 1}: ${idea.title}`}>{index + 1}</button> : null; })}</div></div>}
          {activeIdea && <div className="draw-actions">{discoveryMode === "random" && randomDrawCount < 3 && <button className="draw-again-button" onClick={() => drawRandomIdea()}>Draw again ({3 - randomDrawCount} left) <span>⟳</span></button>}{discoveryMode === "random" && randomDrawCount >= 3 && <button className="draw-again-button" onClick={beginFeeling}>Try feeling mode <span>→</span></button>}{discoveryMode === "feeling" && <button className="draw-again-button" onClick={() => setModal("feeling")}>Change answers <span>↻</span></button>}<button className="draw-plan-today" disabled={busy} onClick={() => void planForToday(activeIdea)}>This date is for today <span>✓</span></button><button className="draw-plan-later" onClick={() => openPlan(activeIdea)}>Plan for another day</button></div>}
          {!activeIdea && <div className="draw-actions"><button className="draw-again-button" onClick={beginFeeling}>Try feeling mode <span>→</span></button><button className="modal-submit" onClick={() => { setModal(null); setNewTitle(""); setModal("new"); }}>Add an idea <span>→</span></button></div>}</>
          : modal === "feeling" ? <form onSubmit={chooseFeelingSuggestion}><p className="modal-copy">Four quick answers to find an idea that fits the moment.</p>{drawMessage && <p className="form-alert config-alert" role="status">{drawMessage}</p>}
            <label className="form-label" htmlFor="feeling-mood">1. What’s your mood today?<select className="form-input" id="feeling-mood" value={feelingAnswers.mood} onChange={(event) => setFeelingAnswers((current) => ({ ...current, mood: event.target.value as Mood }))}>{moodOptions.map((mood) => <option key={mood} value={mood}>{mood}</option>)}</select></label>
            <label className="form-label" htmlFor="feeling-duration">2. How much time do you have?<select className="form-input" id="feeling-duration" value={feelingAnswers.duration} onChange={(event) => setFeelingAnswers((current) => ({ ...current, duration: event.target.value as FeelingAnswers["duration"] }))}><option value="1">Up to 1 hour</option><option value="2">1–2 hours</option><option value="3">2–4 hours</option><option value="4">Half a day or more</option></select></label>
            <label className="form-label" htmlFor="feeling-budget">3. What’s your budget for two?<select className="form-input" id="feeling-budget" value={feelingAnswers.budget} onChange={(event) => setFeelingAnswers((current) => ({ ...current, budget: event.target.value as FeelingAnswers["budget"] }))}><option value="1">Free or up to €10</option><option value="2">€10–30</option><option value="3">€30–60</option><option value="4">No set limit</option></select></label>
            <label className="form-label" htmlFor="feeling-distance">4. How far would you like to go?<select className="form-input" id="feeling-distance" value={feelingAnswers.distance} onChange={(event) => setFeelingAnswers((current) => ({ ...current, distance: event.target.value as FeelingAnswers["distance"] }))}><option value="1">At home</option><option value="2">Nearby (up to 30 min)</option><option value="3">Up to 1 hour away</option><option value="4">No limit</option></select></label>
            <label className="form-label" htmlFor="feeling-avoid">Anything you’d like to avoid? <span>(optional; separate with commas)</span><input className="form-input" id="feeling-avoid" value={feelingAnswers.avoid} onChange={(event) => setFeelingAnswers((current) => ({ ...current, avoid: event.target.value }))} placeholder="e.g. crowds, long walks" maxLength={120} /></label>
            <p className="feeling-note">Weather data isn’t connected yet. Suggestions are matched using the details saved with each idea.</p><button className="modal-submit" type="submit">Find our date <span>→</span></button></form>
          : modal === "plan" ? <><p className="modal-copy">{repeatIdea ? "This creates a new plan and keeps the original memory. To plan for today, choose “This date is for today” on the suggestion." : "Choose a different day for this date."}</p><label className="form-label" htmlFor="planned-date">Date<input className="form-input" id="planned-date" type="date" required value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} /></label><label className="form-label">Where will you go? <LocationSearch value={plannedLocation} onChange={(value) => { setPlannedLocation(value); setPlannedLatitude(null); setPlannedLongitude(null); }} onSelect={(place: GeocodedPlace) => { setPlannedLocation(place.displayName.slice(0, 160)); setPlannedLatitude(place.latitude); setPlannedLongitude(place.longitude); }} /></label><button className="modal-submit" disabled={busy || !plannedDate} onClick={() => void savePlan()}>{busy ? "Saving…" : "Save to planned dates"} <span>→</span></button></>
          : modal === "album" ? <><p className="modal-copy">Photos are private to your shared account. Add JPG, PNG, WEBP or GIF images (up to 10 MB each).</p>{photoError && <p className="form-alert error-alert" role="alert">{photoError}</p>}{busy && <p className="album-loading">Loading your album…</p>}<div className="album-grid">{photos.filter((photo) => photo.date_idea_id === activeIdeaId).map((photo) => photo.signed_url ? <a className="album-photo" key={photo.id} href={photo.signed_url} target="_blank" rel="noopener noreferrer"><img src={photo.signed_url} alt={`${activeIdea?.title ?? "Date"} memory`} loading="lazy" /></a> : <div className="album-photo-unavailable" key={photo.id}>Photo preview unavailable</div>)}</div><label className="photo-upload-button">＋ Add photos<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple disabled={busy} onChange={(event) => void uploadPhotos(event)} /></label></>
          : modal === "location" ? <><p className="modal-copy">Search for the place, then select the right result to pin it on your map.</p><LocationSearch value={locationName} onChange={(value) => { setLocationName(value); setLocationLatitude(null); setLocationLongitude(null); }} onSelect={(place: GeocodedPlace) => { setLocationName(place.displayName.slice(0, 160)); setLocationLatitude(place.latitude); setLocationLongitude(place.longitude); }} /><button className="modal-submit" disabled={busy || locationLatitude === null || locationLongitude === null} onClick={() => void savePinnedLocation()}>{busy ? "Saving…" : "Save map pin"} <span>→</span></button></>
          : modal === "memory" ? <form onSubmit={(event) => void saveMemory(event)}><p className="modal-copy">Add a little note, a rating or where you went. Every detail is optional. You can add photos now or later from the album.</p><label className="form-label">Your memory <textarea className="form-input memory-input" maxLength={1000} placeholder="What was your favourite part?" value={memoryNote} onChange={(event) => setMemoryNote(event.target.value)} /></label><label className="form-label">Where did you go? <LocationSearch value={locationName} onChange={(value) => { setLocationName(value); setLocationLatitude(null); setLocationLongitude(null); }} onSelect={(place: GeocodedPlace) => { setLocationName(place.displayName.slice(0, 160)); setLocationLatitude(place.latitude); setLocationLongitude(place.longitude); }} /></label><label className="form-label">How would you rate it?</label><div className="rating-picker" aria-label="Choose a rating from one to five">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} aria-label={`${value} stars`} aria-pressed={rating === value} className={value <= rating ? "chosen" : ""} onClick={() => setRating(value)}>★</button>)}</div><label className="photo-upload-button memory-photo-upload">＋ Add photos<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple disabled={busy} onChange={(event) => void uploadPhotos(event)} /></label>{photoError && <p className="form-alert error-alert" role="alert">{photoError}</p>}{photos.some((photo) => photo.date_idea_id === activeIdeaId) && <div className="memory-upload-previews">{photos.filter((photo) => photo.date_idea_id === activeIdeaId && photo.signed_url).map((photo) => <img key={photo.id} src={photo.signed_url ?? ""} alt="Uploaded date memory" />)}</div>}<button className="modal-submit" type="submit" disabled={busy}>{busy ? "Saving…" : "Save to our memories"} <span>→</span></button></form>
            : <form onSubmit={(event) => void addIdea(event)}><p className="modal-copy">Add a date idea with the details Nossia uses to find a good match.</p><label className="form-label" htmlFor="idea-title">Your idea<input className="form-input" id="idea-title" autoFocus placeholder="e.g. Stargazing on a summer night" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} required maxLength={70} /></label><label className="form-label" htmlFor="idea-mood">Mood<select className="form-input" id="idea-mood" value={newMood} onChange={(event) => { const mood = event.target.value as Mood; setNewMood(mood); setNewCategory(categoryForMood(mood)); }}>{moodOptions.map((mood) => <option key={mood} value={mood}>{mood}</option>)}</select></label><div className="form-grid idea-detail-grid"><label className="form-label" htmlFor="idea-duration">Duration<select className="form-input" id="idea-duration" value={newDuration} onChange={(event) => setNewDuration(event.target.value)}><option value="60">Up to 1 hour</option><option value="90">1–2 hours</option><option value="180">2–4 hours</option><option value="300">Half a day or more</option></select></label><label className="form-label" htmlFor="idea-budget">Budget for two<select className="form-input" id="idea-budget" value={newBudget} onChange={(event) => setNewBudget(event.target.value)}><option value="0">Free</option><option value="10">Up to €10</option><option value="30">Up to €30</option><option value="60">Up to €60</option></select></label></div><label className="form-label" htmlFor="idea-travel">Travel time (one way)<select className="form-input" id="idea-travel" value={newTravel} onChange={(event) => setNewTravel(event.target.value)} disabled={newAtHome}><option value="">Unknown / no limit</option><option value="15">Up to 15 min</option><option value="30">Up to 30 min</option><option value="60">Up to 1 hour</option><option value="120">Over 1 hour</option></select></label><label className="home-date-option"><input type="checkbox" checked={newAtHome} onChange={(event) => { setNewAtHome(event.target.checked); if (event.target.checked) setNewTravel("0"); else if (newTravel === "0") setNewTravel(""); }} />This idea can be done at home</label><button className="modal-submit" type="submit" disabled={busy}>{busy ? "Saving…" : "Save this idea"} <span>→</span></button></form>}
      </section></div>}
    </div>
  );
}

export default App;
