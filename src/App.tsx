import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { CalendarView, LocationSearch } from "./CalendarMap";
import { previewIdeaImport } from "./ideaImport";
import type { ImportPreview } from "./ideaImport";
import type { Category, DateIdea, FeelingAnswers, GeocodedPlace, Mood } from "./types";

type View = "discover" | "favorites" | "planned" | "memories" | "calendar" | "map" | "insights";
type AuthMode = "sign-in" | "sign-up";
type AuthFlow = AuthMode | "reset-request" | "password-update";
type DiscoveryMode = "random" | "feeling";
type Language = "en" | "pt";
type AppModal = "new" | "edit" | "import" | "global-import" | "delete" | "plan" | "memory" | "draw" | "feeling" | "album" | "location" | null;
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
type SeedIdea = Omit<DateIdea, "id" | "couple_id" | "planned_for" | "completed_at" | "memory" | "rating" | "location_name" | "latitude" | "longitude" | "source_template_id">;
type DateIdeaTemplate = ImportPreview["valid"][number] & { id: string; created_at: string };
const moodOptions: Mood[] = ["Romantic", "Fun", "Relaxing", "Adventure", "Creative", "Surprise me"];

const categories: Array<Category | "All"> = ["All", "Romantic", "Adventure", "Food & drink", "Creative", "Relaxing", "Culture"];
const fallbackIdeas: SeedIdea[] = [
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
  { view: "planned", label: "Planned dates", icon: "▦" },
  { view: "memories", label: "Our memories", icon: "⌁" },
  { view: "calendar", label: "Calendar", icon: "▦" },
  { view: "favorites", label: "Our favourites", icon: "♡" },
  { view: "map", label: "Date map", icon: "⌖" },
  { view: "insights", label: "Our stats", icon: "◷" },
];

function translateImportMessage(language: Language, message: string) {
  if (language === "en") return message;
  const fileSizeMessage = message.match(/^Choose a file smaller than (\d+) MB\.$/);
  if (fileSizeMessage) return `Escolha um ficheiro com menos de ${fileSizeMessage[1]} MB.`;
  const importCountMessage = message.match(/^Import up to (\d+) ideas at a time\.$/);
  if (importCountMessage) return `Importe até ${importCountMessage[1]} ideias de cada vez.`;
  const translations: Record<string, string> = {
    "Choose an .xlsx or .csv file.": "Escolha um ficheiro .xlsx ou .csv.",
    "The file must contain a header row and at least one idea.": "O ficheiro tem de incluir uma linha de cabeçalhos e pelo menos uma ideia.",
    "The CSV file has an unclosed quoted field.": "O ficheiro CSV contém um campo entre aspas que não foi fechado.",
    "title is required": "o título é obrigatório",
    "description is required": "a descrição é obrigatória",
    "mood is missing or invalid": "o mood está em falta ou é inválido",
    "duration_minutes must be a positive whole number": "duration_minutes tem de ser um número inteiro positivo",
    "budget_eur must be zero or greater": "budget_eur tem de ser zero ou superior",
    "at_home must be true or false": "at_home tem de ser true ou false",
    "travel_minutes must be a non-negative whole number or blank": "travel_minutes tem de ser um inteiro não negativo ou ficar vazio",
    "category is invalid": "a categoria é inválida",
  };
  return message.split("; ").map((part) => translations[part] ?? "Não foi possível ler o ficheiro.").join("; ");
}

function formatDate(date: string, language: Language, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  return new Intl.DateTimeFormat(language === "pt" ? "pt-PT" : "en-GB", options).format(new Date(`${date.slice(0, 10)}T12:00:00`));
}

function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function nextAnniversary(relationshipDate: string, today = new Date()) {
  const [, month, day] = relationshipDate.slice(0, 10).split("-").map(Number);
  const thisYear = new Date(today.getFullYear(), month - 1, day);
  const target = thisYear < new Date(today.getFullYear(), today.getMonth(), today.getDate())
    ? new Date(today.getFullYear() + 1, month - 1, day)
    : thisYear;
  const days = Math.round((Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86_400_000);
  return { date: localDateString(target), days, years: target.getFullYear() - Number(relationshipDate.slice(0, 4)) };
}

function categoryForMood(mood: Mood): Category {
  if (mood === "Romantic") return "Romantic";
  if (mood === "Relaxing") return "Relaxing";
  if (mood === "Adventure") return "Adventure";
  if (mood === "Creative") return "Creative";
  return "Food & drink";
}

function categoryLabel(category: Category, language: Language) {
  return language === "pt"
    ? ({ Romantic: "Romântico", Adventure: "Aventura", "Food & drink": "Comida e bebida", Creative: "Criativo", Relaxing: "Relaxante", Culture: "Cultura" } as Record<Category, string>)[category]
    : category;
}

async function syncDefaultIdeas(client: NonNullable<typeof supabase>, coupleId: string, templates: DateIdeaTemplate[], existingIdeas: DateIdea[]) {
  const linkedIds = new Set(existingIdeas.map((idea) => idea.source_template_id).filter((id): id is string => typeof id === "string"));
  const missing = templates.filter((template) => !linkedIds.has(template.id));
  const added: DateIdea[] = [];
  for (let offset = 0; offset < missing.length; offset += 250) {
    const batch = missing.slice(offset, offset + 250).map((template) => ({
      couple_id: coupleId,
      source_template_id: template.id,
      title: template.title,
      description: template.description,
      category: template.category,
      duration: template.duration,
      budget: template.budget,
      emoji: template.emoji,
      mood: template.mood,
      duration_minutes: template.duration_minutes,
      budget_eur: template.budget_eur,
      travel_minutes: template.travel_minutes,
      at_home: template.at_home,
      status: "idea" as const,
      favorite: false,
    }));
    const { data, error } = await client.from("date_ideas").insert(batch).select("*");
    if (error) return { added, error: error.message };
    added.push(...data as DateIdea[]);
  }
  return { added, error: null };
}

function AuthScreen({ language, onLanguageChange, recovery = false, onRecoveryComplete }: { language: Language; onLanguageChange: (language: Language) => void; recovery?: boolean; onRecoveryComplete?: () => void }) {
  const [mode, setMode] = useState<AuthFlow>(recovery ? "password-update" : "sign-in");
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
      setError(language === "pt" ? "O Supabase ainda não está configurado. Adicione o URL do projeto e a chave anónima às definições de implementação." : "Supabase is not configured yet. Add the project URL and anonymous key to your deployment environment.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      if (mode === "password-update") {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setMessage(language === "pt" ? "Palavra-passe atualizada. Já podem continuar a usar a Nossia." : "Password updated. You can continue using Nossia.");
        onRecoveryComplete?.();
      } else if (mode === "reset-request") {
        const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
        if (recoveryError) throw recoveryError;
        setMessage(language === "pt" ? "Se existir uma conta com esse email, receberão uma ligação para definir uma nova palavra-passe." : "If an account exists for that email, you’ll receive a link to set a new password.");
      } else if (mode === "sign-up") {
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
          setMessage(language === "pt" ? "A conta de casal está pronta. Confirmem o email na caixa de entrada e iniciem sessão." : "Your couple account is ready. Check your inbox to confirm your email, then sign in together.");
        } else {
          setMessage(language === "pt" ? "A conta de casal está pronta. Bem-vindos à Nossia!" : "Your couple account is ready. Welcome to Nossia!");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : language === "pt" ? "Não foi possível concluir o pedido. Tente novamente." : "We couldn't complete that request. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const today = localDateString();

  return (
    <div className="auth-shell">
      <aside className="auth-side">
        <a className="brand" href="#"><span className="brand-mark">n<span>♡</span></span><span className="brand-name">nossia</span></a>
        <div className="auth-quote"><span>✦ {language === "pt" ? "MAIS UM POUCO DE NÓS" : "A LITTLE MORE US"}</span><h1>{language === "pt" ? <>Criem tempo<br />para vocês.</> : <>Make time for<br />us.</>}</h1><p>{language === "pt" ? "Planeiem os dates. Guardem as memórias. Celebrem as pequenas coisas que fazem de vocês, vocês." : "Plan the dates. Keep the memories. Celebrate all the little things that make you, you."}</p><span className="auth-heart">♡</span></div>
        <span className="auth-footer">{language === "pt" ? "FEITO COM CARINHO, PARA VOCÊS OS DOIS" : "MADE WITH LOVE, FOR THE TWO OF YOU"}</span>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-language-switch language-switch" role="group" aria-label={language === "pt" ? "Escolher idioma" : "Choose language"}><button type="button" className={language === "pt" ? "selected" : ""} aria-pressed={language === "pt"} onClick={() => onLanguageChange("pt")}>PT</button><button type="button" className={language === "en" ? "selected" : ""} aria-pressed={language === "en"} onClick={() => onLanguageChange("en")}>EN</button></div>
          <p className="section-kicker">{mode === "sign-up" ? language === "pt" ? "O VOSSO CANTINHO" : "YOUR VERY OWN LITTLE CORNER" : mode === "reset-request" ? language === "pt" ? "RECUPERAR ACESSO" : "ACCOUNT RECOVERY" : mode === "password-update" ? language === "pt" ? "NOVA PALAVRA-PASSE" : "NEW PASSWORD" : language === "pt" ? "BEM-VINDOS DE VOLTA" : "WELCOME BACK, LOVEBIRDS"}</p>
          <h2>{mode === "sign-up" ? language === "pt" ? "Comecem a vossa história juntos" : "Start your story together" : mode === "reset-request" ? language === "pt" ? "Esqueceram-se da palavra-passe?" : "Forgot your password?" : mode === "password-update" ? language === "pt" ? "Criem uma nova palavra-passe" : "Create a new password" : language === "pt" ? "É bom ter-vos de volta" : "Good to have you back"}</h2>
          <p className="auth-intro">{mode === "sign-up" ? language === "pt" ? "Uma conta partilhada para os dois. As vossas memórias são só vossas." : "One shared account for the two of you. Your memories stay yours." : mode === "reset-request" ? language === "pt" ? "Indiquem o email da conta e enviamos uma ligação para redefinir a palavra-passe." : "Enter your account email and we’ll send a link to reset your password." : mode === "password-update" ? language === "pt" ? "Escolham uma palavra-passe com pelo menos 8 caracteres." : "Choose a password with at least 8 characters." : language === "pt" ? "Iniciem sessão e continuem de onde ficaram." : "Sign in to pick up right where the two of you left off."}</p>
          <form onSubmit={submit}>
            {mode === "sign-up" && <>
              <div className="form-grid">
                <label className="form-label">{language === "pt" ? "O vosso nome" : "Your name"}<input className="form-input" autoComplete="given-name" required maxLength={80} value={partnerOneName} onChange={(event) => setPartnerOneName(event.target.value)} placeholder={language === "pt" ? "ex.: Alex" : "e.g. Alex"} /></label>
                <label className="form-label">{language === "pt" ? "Nome da pessoa parceira" : "Your partner's name"}<input className="form-input" autoComplete="off" required maxLength={80} value={partnerTwoName} onChange={(event) => setPartnerTwoName(event.target.value)} placeholder={language === "pt" ? "ex.: Sam" : "e.g. Sam"} /></label>
                <label className="form-label">{language === "pt" ? "A vossa data de nascimento" : "Your birthday"} <span>{language === "pt" ? "(opcional)" : "(optional)"}</span><input className="form-input" type="date" max={today} value={partnerOneBirthDate} onChange={(event) => setPartnerOneBirthDate(event.target.value)} /></label>
                <label className="form-label">{language === "pt" ? "Data de nascimento da pessoa parceira" : "Your partner's birthday"} <span>{language === "pt" ? "(opcional)" : "(optional)"}</span><input className="form-input" type="date" max={today} value={partnerTwoBirthDate} onChange={(event) => setPartnerTwoBirthDate(event.target.value)} /></label>
              </div>
              <div className="milestone-fields">
                <p className="form-section-label">{language === "pt" ? "DATAS IMPORTANTES" : "YOUR IMPORTANT DATES"}</p>
                <label className="form-label">{language === "pt" ? "Aniversário de namoro" : "Your anniversary"} <span className="required-label">{language === "pt" ? "obrigatório" : "required"}</span><input className="form-input" type="date" required max={today} value={relationshipDate} onChange={(event) => setRelationshipDate(event.target.value)} /></label>
                <div className="form-grid optional-dates">
                  <label className="form-label">{language === "pt" ? "O dia em que se conheceram" : "The day you met"} <span>{language === "pt" ? "(opcional)" : "(optional)"}</span><input className="form-input" type="date" max={today} value={firstMetDate} onChange={(event) => setFirstMetDate(event.target.value)} /></label>
                  <label className="form-label">{language === "pt" ? "A primeira mensagem" : "Your first message"} <span>{language === "pt" ? "(opcional)" : "(optional)"}</span><input className="form-input" type="date" max={today} value={firstMessageDate} onChange={(event) => setFirstMessageDate(event.target.value)} /></label>
                  <label className="form-label">{language === "pt" ? "O primeiro date" : "Your first date"} <span>{language === "pt" ? "(opcional)" : "(optional)"}</span><input className="form-input" type="date" max={today} value={firstDateDate} onChange={(event) => setFirstDateDate(event.target.value)} /></label>
                </div>
              </div>
            </>}
            {mode !== "password-update" && <label className="form-label">{language === "pt" ? "Email" : "Email address"}<input className="form-input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>}
            {mode !== "reset-request" && <label className="form-label">{language === "pt" ? "Palavra-passe" : "Password"}<input className="form-input" type="password" autoComplete={mode === "sign-up" || mode === "password-update" ? "new-password" : "current-password"} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={language === "pt" ? "Pelo menos 8 caracteres" : "At least 8 characters"} /></label>}
            {error && <p className="form-alert error-alert" role="alert">{error}</p>}
            {message && <p className="form-alert success-alert" role="status">{message}</p>}
            {!isSupabaseConfigured && <p className="form-alert config-alert">{language === "pt" ? "Ligue um projeto Supabase para ativar contas privadas e sincronizar dates. Consulte os passos de configuração no README." : "Connect a Supabase project to enable private accounts and cloud-synced dates. See the setup steps in the README."}</p>}
            <button className="modal-submit auth-submit" type="submit" disabled={loading || !isSupabaseConfigured}>{loading ? language === "pt" ? "Um momento…" : "One moment…" : mode === "sign-up" ? language === "pt" ? "Criar conta de casal" : "Create your couple account" : mode === "reset-request" ? language === "pt" ? "Enviar ligação de recuperação" : "Send recovery link" : mode === "password-update" ? language === "pt" ? "Atualizar palavra-passe" : "Update password" : language === "pt" ? "Iniciar sessão" : "Sign in"} <span>→</span></button>
          </form>
          {mode === "sign-in" && <button className="auth-forgot-button" type="button" onClick={() => { setMode("reset-request"); setError(""); setMessage(""); }}>{language === "pt" ? "Esqueci-me da palavra-passe" : "Forgot password?"}</button>}
          {mode !== "password-update" && <p className="auth-switch">{mode === "sign-up" ? language === "pt" ? "Já têm uma conta?" : "Already have an account?" : language === "pt" ? "Ainda não têm conta?" : "New around here?"} <button onClick={() => { setMode(mode === "sign-up" || mode === "reset-request" ? "sign-in" : "sign-up"); setError(""); setMessage(""); }}>{mode === "sign-up" || mode === "reset-request" ? language === "pt" ? "Iniciar sessão" : "Sign in" : language === "pt" ? "Criar conta" : "Create your account"}</button></p>}
          {mode === "password-update" && <p className="auth-switch"><button onClick={() => { setMode("sign-in"); setError(""); setMessage(""); }}>{language === "pt" ? "Voltar ao início de sessão" : "Back to sign in"}</button></p>}
        </div>
      </main>
    </div>
  );
}

function App() {
  const [language, setLanguage] = useState<Language>(() => window.localStorage.getItem("nossia-language") === "pt" ? "pt" : "en");
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [ideas, setIdeas] = useState<DateIdea[]>([]);
  const [photos, setPhotos] = useState<DatePhoto[]>([]);
  const [view, setView] = useState<View>("discover");
  const [visibleIdeaLimit, setVisibleIdeaLimit] = useState(60);
  const [category, setCategory] = useState<Category | "All">("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<AppModal>(null);
  const [activeIdeaId, setActiveIdeaId] = useState<string | null>(null);
  const [drawnIdeaIds, setDrawnIdeaIds] = useState<string[]>([]);
  const [randomDrawCount, setRandomDrawCount] = useState(0);
  const [anniversaryPlanDate, setAnniversaryPlanDate] = useState<string | null>(null);
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
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("Romantic");
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importTarget, setImportTarget] = useState<"couple" | "global">("couple");
  const [importError, setImportError] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [memoryNote, setMemoryNote] = useState("");
  const [rating, setRating] = useState(0);
  const [locationName, setLocationName] = useState("");
  const [locationLatitude, setLocationLatitude] = useState<number | null>(null);
  const [locationLongitude, setLocationLongitude] = useState<number | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [dataError, setDataError] = useState("");
  const [catalogAvailable, setCatalogAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const isCatalogAdmin = session?.user.app_metadata.catalog_admin === true;

  const loadCoupleData = useCallback(async (currentSession: Session) => {
    if (!supabase) return;
    setDataError("");
    const { data: profile, error: profileError } = await supabase.from("couples").select("*").single();
    if (profileError) {
      setDataError(`We couldn't load your couple profile: ${profileError.message}`);
      return;
    }
    setCouple(profile as Couple);
    const savedIdeas: DateIdea[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from("date_ideas").select("*")
        .order("created_at", { ascending: true }).order("id", { ascending: true })
        .range(offset, offset + 499);
      if (error) {
        setDataError(language === "pt" ? `Não foi possível carregar os vossos dates: ${error.message}` : `We couldn't load your dates: ${error.message}`);
        return;
      }
      savedIdeas.push(...data as DateIdea[]);
      if (data.length < 500) break;
    }
    let coupleIdeas = savedIdeas;
    const templates: DateIdeaTemplate[] = [];
    let templatesError: string | null = null;
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from("date_idea_templates").select("*")
        .order("created_at", { ascending: true }).order("id", { ascending: true })
        .range(offset, offset + 499);
      if (error) {
        templatesError = error.message;
        break;
      }
      templates.push(...data as DateIdeaTemplate[]);
      if (data.length < 500) break;
    }
    if (templatesError) {
      setCatalogAvailable(false);
      setDataError(language === "pt" ? `Não foi possível carregar as ideias predefinidas. Aplique a migration do catálogo no Supabase: ${templatesError}` : `The default idea catalog is unavailable. Apply the catalog migration in Supabase: ${templatesError}`);
      if (coupleIdeas.length === 0) {
        const { data: seededIdeas, error: seedError } = await supabase.from("date_ideas")
          .insert(fallbackIdeas.map((idea) => ({ ...idea, couple_id: profile.id }))).select("*");
        if (seedError) {
          setDataError(language === "pt" ? `Não foi possível carregar as ideias predefinidas nem criar as sugestões iniciais: ${seedError.message}` : `We couldn't load the default ideas or create the starter ideas: ${seedError.message}`);
        } else {
          coupleIdeas = seededIdeas as DateIdea[];
        }
      }
    } else {
      setCatalogAvailable(true);
      const synced = await syncDefaultIdeas(supabase, profile.id, templates, coupleIdeas);
      coupleIdeas = [...coupleIdeas, ...synced.added];
      if (synced.error) setDataError(language === "pt" ? `As ideias foram carregadas, mas não foi possível adicionar todas as sugestões à vossa lista: ${synced.error}` : `The catalog loaded, but we couldn't add all its suggestions to your list: ${synced.error}`);
    }
    setIdeas(coupleIdeas);
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, updatedSession) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
        setSession(updatedSession);
        setAuthReady(true);
        if (updatedSession) void loadCoupleData(updatedSession);
        return;
      }
      if (updatedSession) {
        setAuthReady(false);
        window.setTimeout(() => {
          if (active) void loadCoupleData(updatedSession).finally(() => { if (active) setAuthReady(true); });
        }, 0);
      } else {
        setPasswordRecovery(false);
        setSession(null);
        setCouple(null);
        setIdeas([]);
        setPhotos([]);
        setCatalogAvailable(false);
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
  const anniversary = couple ? nextAnniversary(couple.relationship_date) : null;

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    window.localStorage.setItem("nossia-language", nextLanguage);
  }

  function openImport(target: "couple" | "global") {
    setImportTarget(target);
    setImportError("");
    setImportMessage("");
    setImportPreview(null);
    setModal(target === "global" ? "global-import" : "import");
  }

  async function selectImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setImportError("");
    setImportMessage("");
    setImportPreview(null);
    try {
      const globalImport = importTarget === "global";
      setImportPreview(await previewIdeaImport(file, globalImport ? 5000 : 200, globalImport ? 10 : 2));
    } catch (caught) {
      setImportError(translateImportMessage(language, caught instanceof Error ? caught.message : "The file could not be read."));
    }
  }

  function downloadImportTemplate() {
    const csv = "title,description,mood,duration_minutes,budget_eur,at_home,travel_minutes,category,emoji\r\nPicnic in the park,Pack a simple picnic and enjoy the afternoon outdoors,Relaxing,120,20,false,20,Relaxing,🧺\r\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "nossia-date-ideas-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importIdeas() {
    if (!importPreview?.valid.length || !supabase || !couple) return;
    setBusy(true);
    setImportError("");
    if (importTarget === "global") {
      if (!isCatalogAdmin) {
        setImportError(language === "pt" ? "Apenas administradores podem carregar ideias predefinidas." : "Only catalog admins can upload default ideas.");
        setBusy(false);
        return;
      }
      const templates: DateIdeaTemplate[] = [];
      for (let offset = 0; offset < importPreview.valid.length; offset += 250) {
        const batch = importPreview.valid.slice(offset, offset + 250);
        const { data, error } = await supabase.from("date_idea_templates")
          .upsert(batch, { onConflict: "title,description", ignoreDuplicates: true })
          .select("*");
        if (error) {
          setImportError(language === "pt"
            ? `${templates.length} ideias foram adicionadas ao catálogo antes de ocorrer um erro: ${error.message}`
            : `${templates.length} ideas were added to the catalog before an error occurred: ${error.message}`);
          setBusy(false);
          return;
        }
        templates.push(...data as DateIdeaTemplate[]);
      }
      const synced = await syncDefaultIdeas(supabase, couple.id, templates, ideas);
      setIdeas((current) => [...current, ...synced.added]);
      const skipped = importPreview.invalid.length;
      setImportMessage(language === "pt"
        ? `${templates.length} novas ideias predefinidas adicionadas para todos os casais${skipped ? `; ${skipped} linhas inválidas ignoradas` : ""}.`
        : `${templates.length} new default ideas added for all couples${skipped ? `; skipped ${skipped} invalid ${skipped === 1 ? "row" : "rows"}` : ""}.`);
      if (synced.error) setImportError(language === "pt"
        ? `O catálogo global foi atualizado, mas não foi possível adicionar algumas ideias à vossa lista: ${synced.error}`
        : `The global catalog was updated, but we couldn't add some ideas to your list: ${synced.error}`);
      setImportPreview(null);
      setBusy(false);
      return;
    }
    const { data, error } = await supabase.from("date_ideas").insert(importPreview.valid.map((idea) => ({
      ...idea,
      couple_id: couple.id,
      status: "idea",
      favorite: false,
    }))).select("*");
    if (error) {
      setImportError(language === "pt" ? `Não foi possível importar as ideias: ${error.message}` : `We couldn't import the ideas: ${error.message}`);
      setBusy(false);
      return;
    }
    setIdeas((current) => [...current, ...data as DateIdea[]]);
    const skipped = importPreview.invalid.length;
    setImportMessage(language === "pt"
      ? `${data.length} ${data.length === 1 ? "ideia importada" : "ideias importadas"}${skipped ? `; ${skipped} linhas inválidas ignoradas` : ""}.`
      : `${data.length} ${data.length === 1 ? "idea imported" : "ideas imported"}${skipped ? `; skipped ${skipped} invalid ${skipped === 1 ? "row" : "rows"}` : ""}.`);
    setImportPreview(null);
    setBusy(false);
  }

  useEffect(() => {
    document.documentElement.lang = language === "pt" ? "pt-PT" : "en";
  }, [language]);

  useEffect(() => {
    setVisibleIdeaLimit(60);
  }, [category, search, view]);

  function startAnniversaryPlanning() {
    if (!anniversary) return;
    setAnniversaryPlanDate(anniversary.date);
    setCategory("All");
    setView("discover");
    drawRandomIdea(true, "All");
  }

  function drawRandomIdea(startNewRound = false, selectedCategory: Category | "All" = category) {
    const availableIdeas = ideas.filter((idea) => idea.status === "idea" && (selectedCategory === "All" || idea.category === selectedCategory));
    const previousDraws = startNewRound ? [] : drawnIdeaIds;
    const drawCount = startNewRound ? 0 : randomDrawCount;
    if (drawCount >= 3) {
      setDrawMessage(language === "pt" ? "Já usaram os três sorteios. Escolham uma das ideias anteriores ou experimentem o modo feeling." : "You've used your three draws. Choose one of the ideas above or try Feeling.");
      return;
    }
    if (availableIdeas.length === 0) {
      setActiveIdeaId(null);
      setDrawMessage(selectedCategory === "All"
        ? language === "pt" ? "Não há mais ideias novas para sortear. Adicionem uma ideia ou escolham um date anterior para repetir." : "There are no new ideas left to draw. Add a new idea or choose one of your past dates to repeat."
        : language === "pt" ? `Não há ideias de ${selectedCategory.toLocaleLowerCase("pt-PT")} disponíveis para sortear.` : `There are no ${selectedCategory.toLocaleLowerCase("en-GB")} ideas available to draw right now.`);
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
    setDrawMessage(unseenIdeas.length === 0 && previousDraws.length > 0 ? language === "pt" ? "Já viram todas as ideias diferentes. Aqui vai mais um sorteio!" : "You've seen every different idea available. Here's another spin!" : "");
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
      setDrawMessage(language === "pt" ? "Ainda não há ideias que correspondam a todas as respostas. Alterem uma ou duas respostas ou acrescentem mais detalhes às ideias." : "No ideas match every answer yet. Try changing one or two answers, or add more detail to your date ideas.");
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
    if (error) setDataError(language === "pt" ? `Não foi possível guardar as alterações: ${error.message}` : `We couldn't save that change: ${error.message}`);
    else setIdeas((current) => current.map((idea) => idea.id === id ? data as DateIdea : idea));
    setBusy(false);
    return !error;
  }

  async function toggleFavorite(id: string) {
    const idea = ideas.find((item) => item.id === id);
    if (idea) await updateIdea(id, { favorite: !idea.favorite });
  }

  function openPlan(idea: DateIdea) {
    setAnniversaryPlanDate(null);
    setActiveIdeaId(idea.id);
    setRepeatIdea(idea.status === "completed");
    setPlannedDate("");
    setPlannedLocation(idea.status === "completed" ? idea.location_name ?? "" : "");
    setPlannedLatitude(idea.status === "completed" ? idea.latitude : null);
    setPlannedLongitude(idea.status === "completed" ? idea.longitude : null);
    setModal("plan");
  }

  function openEditIdea(idea: DateIdea) {
    setEditingIdeaId(idea.id);
    setNewTitle(idea.title);
    setNewDescription(idea.description);
    setNewCategory(idea.category);
    setNewMood(idea.mood);
    setNewDuration(String(idea.duration_minutes ?? 60));
    setNewBudget(String(idea.budget_eur ?? 0));
    setNewTravel(idea.travel_minutes === null ? "" : String(idea.travel_minutes));
    setNewAtHome(idea.at_home);
    setModal("edit");
  }

  function openNewIdea() {
    setEditingIdeaId(null);
    setNewTitle("");
    setNewDescription("");
    setNewCategory("Romantic");
    setNewMood("Romantic");
    setNewDuration("120");
    setNewBudget("30");
    setNewTravel("");
    setNewAtHome(false);
    setModal("new");
  }

  async function deleteActiveIdea() {
    if (!activeIdea || !supabase) return;
    setBusy(true);
    setDataError("");
    const relatedPhotos = photos.filter((photo) => photo.date_idea_id === activeIdea.id);
    const { error } = await supabase.from("date_ideas").delete().eq("id", activeIdea.id);
    if (error) {
      setDataError(language === "pt" ? `Não foi possível apagar o date: ${error.message}` : `We couldn't delete the date: ${error.message}`);
      setBusy(false);
      return;
    }
    setIdeas((current) => current.filter((idea) => idea.id !== activeIdea.id));
    setPhotos((current) => current.filter((photo) => photo.date_idea_id !== activeIdea.id));
    setModal(null);
    setActiveIdeaId(null);
    if (relatedPhotos.length) {
      const { error: storageError } = await supabase.storage.from("date-photos").remove(relatedPhotos.map((photo) => photo.storage_path));
      if (storageError) setDataError(language === "pt" ? `O date foi apagado, mas não foi possível remover algumas fotografias do armazenamento: ${storageError.message}` : `The date was deleted, but we couldn't remove some stored photos: ${storageError.message}`);
    }
    setBusy(false);
  }

  async function planForToday(idea: DateIdea) {
    if (idea.status !== "idea") return;
    const saved = await updateIdea(idea.id, { status: "planned", planned_for: localDateString() });
    if (saved) {
      setAnniversaryPlanDate(null);
      setView("planned");
    }
  }

  async function planForAnniversary(idea: DateIdea) {
    if (!anniversaryPlanDate || idea.status !== "idea") return;
    const saved = await updateIdea(idea.id, { status: "planned", planned_for: anniversaryPlanDate });
    if (saved) {
      setAnniversaryPlanDate(null);
      setModal(null);
      setView("planned");
    }
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
        setDataError(language === "pt" ? `Não foi possível planear outro date: ${error.message}` : `We couldn't plan another date: ${error.message}`);
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
      setPhotoError(language === "pt" ? `Não foi possível abrir as fotografias: ${error.message}` : `We couldn't open the photos: ${error.message}`);
    } else {
      if (data.some((photo) => !photo.signedUrl)) {
        setPhotoError(language === "pt" ? "Não foi possível criar uma ligação para ver uma ou mais fotografias do álbum." : "We couldn't create a view link for one or more album photos.");
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
        setPhotoError(language === "pt" ? `${file.name} não é um formato de imagem suportado. Escolha ficheiros JPG, PNG, WEBP ou GIF.` : `${file.name} isn't a supported image. Choose JPG, PNG, WEBP or GIF files.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setPhotoError(language === "pt" ? `${file.name} excede o limite de 10 MB.` : `${file.name} is larger than the 10 MB limit.`);
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
        setPhotoError(language === "pt" ? `Não foi possível carregar ${file.name}: ${uploadError.message}` : `We couldn't upload ${file.name}: ${uploadError.message}`);
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
          ? language === "pt" ? `Não foi possível guardar ${file.name} no álbum (${photoError.message}) nem remover o ficheiro carregado (${cleanupError.message}).` : `We couldn't save ${file.name} to the album (${photoError.message}) or remove its uploaded file (${cleanupError.message}).`
          : language === "pt" ? `Não foi possível guardar ${file.name} no álbum: ${photoError.message}` : `We couldn't save ${file.name} to the album: ${photoError.message}`);
        continue;
      }

      const { data: signedPhoto, error: signedPhotoError } = await supabase.storage.from("date-photos").createSignedUrl(storagePath, 3600);
      if (signedPhotoError) {
        setPhotoError(language === "pt" ? `A fotografia foi carregada, mas não foi possível apresentá-la: ${signedPhotoError.message}` : `The photo was uploaded, but we couldn't display it: ${signedPhotoError.message}`);
      }
      uploadedPhotos.push({ ...photo, signed_url: signedPhoto?.signedUrl ?? null } as DatePhoto);
    }

    if (uploadedPhotos.length) setPhotos((current) => [...current, ...uploadedPhotos]);
    setBusy(false);
  }

  async function savePinnedLocation() {
    if (!activeIdeaId || !locationName.trim() || locationLatitude === null || locationLongitude === null) {
      setDataError(language === "pt" ? "Pesquise um local e escolha um resultado antes de guardar a localização no mapa." : "Search for a place and choose a result before saving its map pin.");
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
    const description = newDescription.trim();
    const durationMinutes = Number(newDuration);
    const budgetEuros = Number(newBudget);
    const travelMinutes = newTravel.trim() ? Number(newTravel) : newAtHome ? 0 : null;
    if (!title || !description || !Number.isInteger(durationMinutes) || durationMinutes <= 0 || !Number.isFinite(budgetEuros) || budgetEuros < 0 || (travelMinutes !== null && (!Number.isInteger(travelMinutes) || travelMinutes < 0))) return;
    const ideaFields = {
      title,
      description,
      category: newCategory,
      mood: newMood,
      duration: `${durationMinutes >= 240 ? "4+" : durationMinutes / 60} hour${durationMinutes === 60 ? "" : "s"}`,
      duration_minutes: durationMinutes,
      budget: budgetEuros === 0 ? "Free" : `€${budgetEuros > 10 ? "€" : ""}${budgetEuros > 30 ? "€" : ""}`,
      budget_eur: budgetEuros,
      travel_minutes: travelMinutes,
      at_home: newAtHome,
    };
    setBusy(true);
    setDataError("");
    if (editingIdeaId) {
      const saved = await updateIdea(editingIdeaId, catalogAvailable ? { ...ideaFields, source_template_id: null } : ideaFields);
      if (!saved) return;
    } else {
      const { data, error } = await supabase.from("date_ideas").insert({
        couple_id: couple.id,
        ...ideaFields,
        emoji: "💌",
        status: "idea",
        favorite: false,
      }).select("*").single();
      if (error) {
        setDataError(language === "pt" ? `Não foi possível adicionar a ideia: ${error.message}` : `We couldn't add that date idea: ${error.message}`);
        setBusy(false);
        return;
      }
      setIdeas((current) => [...current, data as DateIdea]);
    }
    setModal(null);
    setEditingIdeaId(null);
    setView("discover");
    setCategory("All");
    setBusy(false);
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setDataError(`We couldn't sign you out: ${error.message}`);
  }

  const pageHeading: Record<View, [string, string]> = language === "pt" ? {
    discover: [`${couple?.partner_one_name} & ${couple?.partner_two_name}, o que vos apetece hoje?`, "Criem tempo para estarem juntos."],
    favorites: ["Pequenos momentos especiais", "As ideias que guardaram para fazer juntos."],
    planned: ["Há algo especial no calendário", "Os vossos próximos momentos, num só lugar."],
    memories: ["Agora faz parte da vossa história", "Cada date é mais uma memória para guardar."],
    calendar: ["Os vossos dates, dia a dia", "Vejam o que planearam e as memórias que criaram."],
    map: ["Todos os lugares por onde passaram", "Explore os lugares ligados aos vossos dates e memórias."],
    insights: ["A vossa história", "Descubram o que os vossos dates dizem sobre aquilo que gostam de fazer juntos."],
  } : {
    discover: [`${couple?.partner_one_name} & ${couple?.partner_two_name}, what do you feel like today?`, "Make time for us."],
    favorites: ["Little things, lovely moments", "The ideas you saved to enjoy together."],
    planned: ["Something lovely is on the calendar", "Your upcoming moments, all in one place."],
    memories: ["It's part of your story now", "Every date you've shared is another memory to keep."],
    calendar: ["Our dates, day by day", "See what you've planned and the memories you've made."],
    map: ["All the places we've been", "Explore the places tied to your dates and memories."],
    insights: ["The story of us", "See what your dates say about the things you love doing together."],
  };
  const navLabels: Record<View, string> = language === "pt"
    ? { discover: "Ideias de dates", favorites: "Favoritos", planned: "Dates planeados", memories: "Memórias", calendar: "Calendário", map: "Mapa", insights: "Estatísticas" }
    : { discover: "Date ideas", favorites: "Our favourites", planned: "Planned dates", memories: "Our memories", calendar: "Calendar", map: "Date map", insights: "Our stats" };
  const isGlobalImport = modal === "global-import";

  if (!authReady) return <div className="loading-screen"><span className="brand-mark">n<span>♡</span></span><p>{language === "pt" ? "A abrir o vosso cantinho…" : "Opening your little corner…"}</p></div>;
  if (passwordRecovery && session) return <AuthScreen language={language} recovery onRecoveryComplete={() => setPasswordRecovery(false)} onLanguageChange={changeLanguage} />;
  if (!session || !couple) return <><AuthScreen language={language} onLanguageChange={changeLanguage} />{dataError && <p className="auth-global-error" role="alert">{dataError}</p>}</>;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setView("discover"); }} aria-label="Nossia home"><span className="brand-mark">n<span>♡</span></span><span className="brand-name">nossia</span></a>
        <div className="couple-chip"><span className="avatar-pair">{couple.partner_one_name.slice(0, 1)}<span>+</span>{couple.partner_two_name.slice(0, 1)}</span><span>{couple.partner_one_name} & {couple.partner_two_name}</span><span className="online-dot" /></div>
        <p className="nav-caption">{language === "pt" ? "O VOSSO ESPAÇO" : "YOUR SHARED SPACE"}</p>
        <nav className="side-nav" aria-label={language === "pt" ? "Navegação principal" : "Main navigation"}>
          {navItems.map((item) => <button className={`nav-link ${view === item.view ? "active" : ""}`} key={item.view} onClick={() => { setView(item.view); setCategory("All"); setMobileMoreOpen(false); }}><span className="nav-icon">{item.icon}</span>{navLabels[item.view]}{item.view === "planned" && counts.planned > 0 && <span className="nav-count">{counts.planned}</span>}</button>)}
          <button type="button" className={`mobile-more-button ${mobileMoreOpen ? "active" : ""}`} aria-expanded={mobileMoreOpen} onClick={() => setMobileMoreOpen((open) => !open)}><span className="nav-icon">···</span>{language === "pt" ? "Mais" : "More"}</button>
          {mobileMoreOpen && <div className="mobile-more-menu">{navItems.slice(4).map((item) => <button type="button" key={item.view} className={view === item.view ? "active" : ""} onClick={() => { setView(item.view); setCategory("All"); setMobileMoreOpen(false); }}><span>{item.icon}</span>{navLabels[item.view]}</button>)}</div>}
        </nav>
        <div className="sidebar-note"><span className="note-sparkle">✦</span><p>{language === "pt" ? "Os melhores planos são aqueles que fazem juntos." : "The best plans are the ones you make together."}</p><span>{language === "pt" ? "— um lembrete para hoje" : "— a little reminder for today"}</span></div>
        <button className="sign-out-button" onClick={() => void signOut()}>{language === "pt" ? "Terminar sessão" : "Sign out"} <span>↗</span></button>
        <div className="sidebar-bottom"><span className="tiny-heart">♥</span> {language === "pt" ? "Feito para vos aproximar" : "Made to bring you closer"}</div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">{language === "pt" ? "O VOSSO ESPAÇO" : "YOUR SHARED SPACE"} <span>/</span> <strong>{navLabels[view].toLocaleUpperCase(language === "pt" ? "pt-PT" : "en-GB")}</strong></div>
          <div className="topbar-right"><span className="today-label">{new Intl.DateTimeFormat(language === "pt" ? "pt-PT" : "en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span><div className="language-switch" role="group" aria-label={language === "pt" ? "Escolher idioma" : "Choose language"}><button type="button" className={language === "pt" ? "selected" : ""} aria-pressed={language === "pt"} onClick={() => changeLanguage("pt")}>PT</button><button type="button" className={language === "en" ? "selected" : ""} aria-pressed={language === "en"} onClick={() => changeLanguage("en")}>EN</button></div><span className="top-avatar">{couple.partner_one_name.slice(0, 1)}<span>{couple.partner_two_name.slice(0, 1)}</span></span></div>
        </header>

        <div className="content">
          <section className="welcome-row"><div><p className="eyebrow"><span /> {language === "pt" ? "MAIS UM POUCO DE NÓS" : "A LITTLE MORE US"}</p><h1>{pageHeading[view][0]}</h1><p className="welcome-copy">{pageHeading[view][1]}</p></div><div className="welcome-actions">{isCatalogAdmin && catalogAvailable && <button className="import-button global-import-button" onClick={() => openImport("global")}>{language === "pt" ? "Carregar ideias globais" : "Upload default ideas"}</button>}<button className="import-button" onClick={() => openImport("couple")}>{language === "pt" ? "Importar ideias" : "Import ideas"}</button><button className="add-button" onClick={openNewIdea}><span>＋</span> {language === "pt" ? "Nova ideia" : "New idea"}</button></div></section>

          {dataError && <p className="data-alert" role="alert">{dataError}</p>}

          {view === "discover" && <>
            <section className="feature-banner">
              <div className="banner-copy"><span className="banner-kicker">NOSSIA · {language === "pt" ? "CRIEM TEMPO PARA VOCÊS" : "MAKE TIME FOR US"}</span><h2>{language === "pt" ? "Criem tempo para vocês." : "Make time for us."}</h2><p>{language === "pt" ? "O que vos apetece fazer hoje?" : "What do you feel like doing today?"}</p></div>
              <div className="banner-art" aria-hidden="true"><span className="art-sun" /><span className="art-orbit orbit-one" /><span className="art-orbit orbit-two" /><span className="art-heart">♥</span><span className="art-caption">{language === "pt" ? "melhor, juntos" : "better, together"}</span></div><span className="banner-decoration">♡</span>
            </section>
            <section className="discovery-options" aria-label={language === "pt" ? "Escolher como encontrar um date" : "Choose how to find a date"}>
              <button className="discovery-option random-option" onClick={() => drawRandomIdea(true)}>
                <span className="discovery-option-icon">✳</span><span className="discovery-option-copy"><strong>{language === "pt" ? "Surpreendam-nos" : "Surprise us"}</strong><small>{language === "pt" ? "Sortear uma ideia de date" : "Draw a random date idea"}</small></span><span className="discovery-option-arrow">→</span>
              </button>
              <button className="discovery-option feeling-option" onClick={beginFeeling}>
                <span className="discovery-option-icon">♡</span><span className="discovery-option-copy"><strong>{language === "pt" ? "Escolher pelo feeling" : "Choose by feeling"}</strong><small>{language === "pt" ? "Respondam a algumas perguntas" : "Answer a few quick questions"}</small></span><span className="discovery-option-arrow">→</span>
              </button>
            </section>
            <section className="proposal-card">
              <span className="proposal-icon">💌</span>
              <div><span className="banner-kicker">{language === "pt" ? "UMA PERGUNTA PEQUENA, UM GRANDE SIM" : "A LITTLE QUESTION, A BIG YES"}</span><h2>{language === "pt" ? "Ainda não lhe perguntaste?" : "Haven't asked them to be yours yet?"}</h2><p>{language === "pt" ? "Hoje pode ser o dia. Preparámos algo especial para ajudar." : "Make today the day. We made a little something to help you ask."}</p></div>
              <a className="proposal-button" href="https://ricardosilva21a.github.io/valentine_marta/" target="_blank" rel="noopener noreferrer">{language === "pt" ? "Pergunta agora" : "Ask them now"} <span>↗</span></a>
            </section>
            <section className="milestones-card" aria-label={language === "pt" ? "Datas importantes" : "Your important dates"}>
              <div className="milestones-heading"><span className="section-kicker">{language === "pt" ? "DATAS QUE SIGNIFICAM MUITO" : "THE LITTLE DATES THAT MEAN A LOT"}</span><h2>{language === "pt" ? "A vossa história até agora" : "Your story so far"}</h2></div>
              {anniversary && <article className="anniversary-feature">
                <div className="anniversary-heart" aria-hidden="true">♥</div>
                <div className="anniversary-copy"><span className="anniversary-label">{language === "pt" ? "ANIVERSÁRIO DE NAMORO" : "YOUR ANNIVERSARY"}</span><h3>{anniversary.days === 0 ? (language === "pt" ? "Feliz aniversário de namoro!" : "Happy anniversary!") : anniversary.days === 1 ? (language === "pt" ? "É já amanhã!" : "It’s tomorrow!") : language === "pt" ? `Faltam ${anniversary.days} dias` : `${anniversary.days} days to go`}</h3><p>{formatDate(anniversary.date, language)}{anniversary.days === 0 ? "" : ` · ${anniversary.years} ${language === "pt" ? "anos juntos" : anniversary.years === 1 ? "year together" : "years together"}`}</p></div>
                <button type="button" className="anniversary-plan-button" onClick={startAnniversaryPlanning}>{language === "pt" ? "Planear date" : "Plan our date"} <span>→</span></button>
              </article>}
              <div className="milestones-list">
                {couple.first_met_date && <article className="milestone-card"><i>✦</i><span>{language === "pt" ? "Conheceram-se" : "First met"}</span><strong>{formatDate(couple.first_met_date, language)}</strong></article>}
                {couple.first_message_date && <article className="milestone-card"><i>✉</i><span>{language === "pt" ? "Primeira mensagem" : "First message"}</span><strong>{formatDate(couple.first_message_date, language)}</strong></article>}
                {couple.first_date_date && <article className="milestone-card"><i>♡</i><span>{language === "pt" ? "Primeiro date" : "First date"}</span><strong>{formatDate(couple.first_date_date, language)}</strong></article>}
                {couple.partner_one_birth_date && <article className="milestone-card"><i>✿</i><span>{language === "pt" ? `Aniversário de ${couple.partner_one_name}` : `${couple.partner_one_name}'s birthday`}</span><strong>{formatDate(couple.partner_one_birth_date, language, { day: "numeric", month: "long" })}</strong></article>}
                {couple.partner_two_birth_date && <article className="milestone-card"><i>✿</i><span>{language === "pt" ? `Aniversário de ${couple.partner_two_name}` : `${couple.partner_two_name}'s birthday`}</span><strong>{formatDate(couple.partner_two_birth_date, language, { day: "numeric", month: "long" })}</strong></article>}
              </div>
            </section>
          </>}

          <section className="stats-row" aria-label={language === "pt" ? "Resumo dos vossos dates" : "Your date summary"}><div className="stat-card"><span className="stat-icon lavender">✳</span><div><strong>{counts.ideas}</strong><span>{language === "pt" ? "ideias para experimentar" : "ideas to try"}</span></div><span className="stat-arrow">↗</span></div><div className="stat-card"><span className="stat-icon peach">▦</span><div><strong>{counts.planned}</strong><span>{language === "pt" ? "dates planeados" : "dates planned"}</span></div><span className="stat-arrow">↗</span></div><div className="stat-card"><span className="stat-icon green">♡</span><div><strong>{counts.completed}</strong><span>{language === "pt" ? "momentos vividos" : "moments lived"}</span></div><span className="stat-arrow">↗</span></div></section>

          {(view === "calendar" || view === "map") && <div className="date-view-filters">
            <label className="search-box"><span aria-hidden="true">⌕</span><input aria-label={language === "pt" ? "Pesquisar dates" : "Search dates"} placeholder={language === "pt" ? "Procurar date ou local..." : "Find a date or place..."} value={search} onChange={(event) => setSearch(event.target.value)} /></label>
            <div className="filters" aria-label={language === "pt" ? "Filtrar dates por categoria" : "Filter dates by category"}>{categories.map((item) => <button key={item} className={`filter-chip ${category === item ? "selected" : ""}`} onClick={() => setCategory(item)}>{item === "All" && <span className="filter-sparkle">✳</span>}{language === "pt" ? ({ All: "Todos", Romantic: "Romântico", Adventure: "Aventura", "Food & drink": "Comida e bebida", Creative: "Criativo", Relaxing: "Relaxante", Culture: "Cultura" } as Record<Category | "All", string>)[item] : item}</button>)}</div>
          </div>}

          {view === "calendar" && <CalendarView ideas={visibleIdeas} language={language} />}
          {view === "map" && <Suspense fallback={<div className="map-loading">{language === "pt" ? "A abrir o mapa…" : "Opening the map…"}</div>}><LazyMapView
            ideas={visibleIdeas}
            language={language}
            onPinLocation={(idea) => {
              setActiveIdeaId(idea.id);
              setLocationName(idea.location_name ?? "");
              setLocationLatitude(idea.latitude);
              setLocationLongitude(idea.longitude);
              setModal("location");
            }}
          /></Suspense>}

          {view === "insights" && <section className="insights-panel" aria-label={language === "pt" ? "Estatísticas dos dates" : "Couple date statistics"}>
            <div className="insights-total"><span className="stat-icon green">♡</span><div><strong>{completedMoodStats.total}</strong><span>{language === "pt" ? "dates feitos juntos" : "dates completed together"}</span></div></div>
            {completedMoodStats.total < 5
              ? <div className="insights-empty"><span className="section-kicker">{language === "pt" ? "O VOSSO PERFIL DE CASAL" : "YOUR COUPLE PROFILE"}</span><h2>{language === "pt" ? "A vossa história está a começar" : "Your story is just getting started"}</h2><p>{language === "pt" ? `Façam mais ${5 - completedMoodStats.total} ${5 - completedMoodStats.total === 1 ? "date" : "dates"} para desbloquear o perfil de casal. Vamos mostrar os dois moods mais frequentes.` : `Complete ${5 - completedMoodStats.total} more ${5 - completedMoodStats.total === 1 ? "date" : "dates"} to unlock your couple profile. We’ll look at the moods of your completed dates and show your top two.`}</p><div className="insights-progress" role="progressbar" aria-label={language === "pt" ? "Dates até desbloquear o perfil de casal" : "Dates until your couple profile is available"} aria-valuenow={completedMoodStats.total} aria-valuemin={0} aria-valuemax={5}><span style={{ width: `${Math.min(completedMoodStats.total / 5 * 100, 100)}%` }} /></div><span className="insights-progress-label">{completedMoodStats.total} {language === "pt" ? "de" : "of"} 5 {language === "pt" ? "dates" : "dates"}</span></div>
              : <div className="insights-profile"><span className="section-kicker">{language === "pt" ? "O VOSSO PERFIL DE CASAL" : "YOUR COUPLE PROFILE"}</span><h2>{language === "pt" ? `São um casal ${completedMoodStats.top.map((stat) => ({ Romantic: "romântico", Fun: "divertido", Relaxing: "tranquilo", Adventure: "aventureiro", Creative: "criativo" })[stat.mood as Exclude<Mood, "Surprise me">]).join(" e ")}` : `You’re a ${completedMoodStats.top.map((stat) => stat.mood).join(" & ")} couple`}</h2><p>{language === "pt" ? `Com base nos vossos ${completedMoodStats.total} dates concluídos, estes são os vossos moods mais frequentes:` : `Based on your ${completedMoodStats.total} completed dates, you’ve shared these kinds of moments the most:`}</p><div className="insights-moods">{completedMoodStats.moods.map((stat) => <div className="insights-mood" key={stat.mood}><div><strong>{language === "pt" ? ({ Romantic: "Romântico", Fun: "Divertido", Relaxing: "Relaxante", Adventure: "Aventura", Creative: "Criativo", "Surprise me": "Surpreendam-nos" } as Record<Mood, string>)[stat.mood] : stat.mood}</strong><span>{stat.count} {language === "pt" ? stat.count === 1 ? "date" : "dates" : stat.count === 1 ? "date" : "dates"}</span></div><div className="insights-progress" aria-hidden="true"><span style={{ width: `${stat.count / completedMoodStats.total * 100}%` }} /></div></div>)}</div></div>}
          </section>}

          {view !== "calendar" && view !== "map" && view !== "insights" && <section className="ideas-section">
            <div className="section-heading"><div><p className="section-kicker">{view === "planned" ? language === "pt" ? "A CAMINHO" : "COMING UP" : view === "memories" ? language === "pt" ? "O VOSSO ÁLBUM" : "YOUR LITTLE ALBUM" : language === "pt" ? "ESCOLHIDO A PENSAR NOS DOIS" : "PICKED WITH THE TWO OF YOU IN MIND"}</p><h2>{view === "planned" ? language === "pt" ? "Os vossos próximos dates" : "Your upcoming dates" : view === "memories" ? language === "pt" ? "Momentos que viveram juntos" : "Moments you've shared" : view === "favorites" ? language === "pt" ? "Guardados com carinho" : "Saved with love" : language === "pt" ? "Ideias para desfrutarem juntos" : "Ideas to enjoy together"} <span className="heading-count">{visibleIdeas.length}</span></h2></div><label className="search-box"><span aria-hidden="true">⌕</span><input aria-label={language === "pt" ? "Pesquisar ideias de date" : "Search date ideas"} placeholder={language === "pt" ? "Encontrar uma ideia..." : "Find an idea..."} value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>⌘ K</kbd></label></div>
            <div className="filters" aria-label={language === "pt" ? "Filtrar por categoria" : "Filter by category"}>{categories.map((item) => <button key={item} className={`filter-chip ${category === item ? "selected" : ""}`} onClick={() => setCategory(item)}>{item === "All" && <span className="filter-sparkle">✳</span>}{language === "pt" ? ({ All: "Todos", Romantic: "Romântico", Adventure: "Aventura", "Food & drink": "Comida e bebida", Creative: "Criativo", Relaxing: "Relaxante", Culture: "Cultura" } as Record<Category | "All", string>)[item] : item}</button>)}</div>

            {visibleIdeas.length > 0 ? <><div className="idea-grid">
              {visibleIdeas.slice(0, visibleIdeaLimit).map((idea, index) => <article className="idea-card" key={idea.id} style={{ animationDelay: `${index * 45}ms` }}>
                <div className={`idea-art art-${index % 6}`}><span className="idea-emoji">{idea.emoji}</span><span className="category-label">{language === "pt" ? ({ Romantic: "Romântico", Adventure: "Aventura", "Food & drink": "Comida e bebida", Creative: "Criativo", Relaxing: "Relaxante", Culture: "Cultura" } as Record<Category, string>)[idea.category] : idea.category}</span>{idea.source_template_id && <span className="default-idea-label">{language === "pt" ? "PREDEFINIDA" : "DEFAULT"}</span>}<button className={`favorite-button ${idea.favorite ? "is-favorite" : ""}`} aria-label={idea.favorite ? language === "pt" ? "Remover dos favoritos" : "Remove from favourites" : language === "pt" ? "Adicionar aos favoritos" : "Add to favourites"} onClick={() => void toggleFavorite(idea.id)}>{idea.favorite ? "♥" : "♡"}</button>{idea.status === "planned" && <span className="planned-label">{language === "pt" ? "PLANEADO" : "PLANNED"}</span>}{idea.status === "completed" && <span className="completed-label">{language === "pt" ? "FEITO ✓" : "LIVED ✓"}</span>}</div>
                <div className="idea-body"><div className="idea-title-row"><h3>{idea.title}</h3>{!idea.source_template_id && <div className="idea-management"><button type="button" aria-label={language === "pt" ? `Editar ${idea.title}` : `Edit ${idea.title}`} title={language === "pt" ? "Editar ideia" : "Edit idea"} onClick={() => openEditIdea(idea)}>✎</button><button type="button" aria-label={language === "pt" ? `Apagar ${idea.title}` : `Delete ${idea.title}`} title={language === "pt" ? "Apagar ideia" : "Delete idea"} onClick={() => { setActiveIdeaId(idea.id); setModal("delete"); }}>×</button></div>}</div><p className="idea-description">{idea.description}</p>{idea.planned_for && <p className="planned-date">▦ {formatDate(idea.planned_for, language)}</p>}
                  {view === "memories" && (idea.memory || idea.location_name || idea.rating) && <div className="memory-details">{idea.rating && <span aria-label={`${idea.rating} out of 5 stars`}>{"★".repeat(idea.rating)}{"☆".repeat(5 - idea.rating)}</span>}{idea.location_name && <span>⌖ {idea.location_name}</span>}{idea.memory && <p>{idea.memory}</p>}</div>}
                  <div className="idea-footer"><div className="idea-meta"><span>◷ {idea.duration}</span><i /><span>{idea.budget}</span></div>{idea.status === "idea" ? <button className="card-action" disabled={busy} onClick={() => void planForToday(idea)}>{language === "pt" ? "Planear para hoje" : "Plan for today"} <span>＋</span></button> : idea.status === "planned" ? <button className="card-action done-action" disabled={busy} onClick={() => void markCompleted(idea.id)}>{language === "pt" ? "Fizemos!" : "We did it"} <span>✓</span></button> : <div className="memory-card-actions"><button className="card-action album-action" disabled={busy} onClick={() => void openAlbum(idea)}>{language === "pt" ? "Álbum" : "Album"} ({photos.filter((photo) => photo.date_idea_id === idea.id).length})</button><button className="card-action undo-action" disabled={busy} onClick={() => openPlan(idea)}>{language === "pt" ? "Planear de novo" : "Plan again"} <span>↗</span></button></div>}</div>
                </div>
              </article>)}
            </div>{visibleIdeas.length > visibleIdeaLimit && <button type="button" className="show-more-ideas" onClick={() => setVisibleIdeaLimit((limit) => limit + 60)}>{language === "pt" ? `Mostrar mais ideias (${visibleIdeas.length - visibleIdeaLimit} restantes)` : `Show more ideas (${visibleIdeas.length - visibleIdeaLimit} left)`}</button>}</> : <div className="empty-state"><span>♡</span><h3>{language === "pt" ? "Ainda não há dates por aqui" : "No dates here just yet"}</h3><p>{view === "favorites" ? language === "pt" ? "Guardem as vossas ideias favoritas para as encontrarem aqui." : "Save your favourite ideas and they'll be waiting here." : language === "pt" ? "Experimentem outra categoria ou adicionem uma ideia." : "Try another category or add an idea of your own."}</p><button className="add-button" onClick={() => setModal("new")}>＋ {language === "pt" ? "Adicionar ideia" : "Add an idea"}</button></div>}
          </section>}
          <footer className="page-footer"><span>{language === "pt" ? "Feito com carinho, para vocês os dois" : "Made with love, for the two of you"} <span className="tiny-heart">♥</span></span><span>{language === "pt" ? "UM DIA DE CADA VEZ · SEMPRE JUNTOS" : "ONE DAY AT A TIME · ALWAYS TOGETHER"}</span></footer>
        </div>
      </main>

      {modal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) { setModal(null); setAnniversaryPlanDate(null); } }}><section className={`modal-card ${modal === "draw" ? "draw-modal" : ""} ${modal === "album" ? "album-modal" : ""} ${modal === "feeling" ? "feeling-modal" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" aria-label={language === "pt" ? "Fechar" : "Close"} disabled={busy} onClick={() => { setModal(null); setAnniversaryPlanDate(null); }}>×</button><span className="modal-icon">{modal === "plan" ? "♡" : modal === "memory" ? "✧" : modal === "draw" ? "✳" : modal === "album" ? "▧" : modal === "location" ? "⌖" : modal === "feeling" ? "♡" : "✳"}</span>
        <p className="section-kicker">{language === "pt" ? modal === "global-import" ? "CATÁLOGO GLOBAL DE IDEIAS" : modal === "import" ? "IMPORTAR IDEIAS" : modal === "plan" ? "UM PLANO SÓ PARA VOCÊS" : modal === "memory" ? "GUARDAR ESTE MOMENTO" : modal === "draw" ? discoveryMode === "feeling" ? "A VOSSA SUGESTÃO PERSONALIZADA" : "O DATE DE HOJE ESTÁ DECIDIDO" : modal === "feeling" ? "ESCOLHER PELO FEELING" : modal === "album" ? "O VOSSO ÁLBUM PRIVADO" : modal === "location" ? "ADICIONAR ESTE LOCAL AO MAPA" : "MAIS UMA IDEIA ESPECIAL" : modal === "global-import" ? "GLOBAL DATE IDEA CATALOG" : modal === "import" ? "IMPORT DATE IDEAS" : modal === "plan" ? "A PLAN JUST FOR THE TWO OF YOU" : modal === "memory" ? "SAVE THIS LITTLE MOMENT" : modal === "draw" ? discoveryMode === "feeling" ? "YOUR FEELING MATCH" : "YOUR DATE NIGHT, DECIDED" : modal === "feeling" ? "CHOOSE BY FEELING" : modal === "album" ? "YOUR PRIVATE PHOTO ALBUM" : modal === "location" ? "ADD THIS PLACE TO YOUR MAP" : "ANOTHER LOVELY IDEA"}</p>
        <h2 id="modal-title">{language === "pt" ? modal === "global-import" ? "Adicionar ideias para todos os casais" : modal === "import" ? "Importar ideias para o vosso casal" : modal === "plan" ? `Vamos combinar um date${activeIdea ? `: ${activeIdea.title}` : ""}?` : modal === "memory" ? "Como foi o vosso date?" : modal === "draw" ? activeIdea ? discoveryMode === "feeling" ? "Uma ideia à vossa medida" : "A vossa próxima aventura" : "Vamos encontrar uma ideia" : modal === "feeling" ? "O que vos apetece hoje?" : modal === "album" ? activeIdea ? `Álbum: ${activeIdea.title}` : "Álbum do date" : modal === "location" ? "Onde aconteceu?" : "O que gostariam de fazer?" : modal === "global-import" ? "Upload ideas for every couple" : modal === "import" ? "Import ideas for your couple" : modal === "plan" ? `Shall we make a date of it${activeIdea ? `: ${activeIdea.title}` : ""}?` : modal === "memory" ? "How was your date?" : modal === "draw" ? activeIdea ? discoveryMode === "feeling" ? "A date idea for the two of you" : "Your next little adventure" : "Let’s find an idea" : modal === "feeling" ? "What do you feel like today?" : modal === "album" ? activeIdea ? `${activeIdea.title} album` : "Date album" : modal === "location" ? "Where did it happen?" : "What would you love to do?"}</h2>
        {(modal === "import" || modal === "global-import") ? <div className="import-content"><h3>{language === "pt" ? isGlobalImport ? "Carregar ideias predefinidas" : "Importar ideias de dates" : isGlobalImport ? "Upload default ideas" : "Import date ideas"}</h3><p className="modal-copy">{language === "pt" ? isGlobalImport ? "Estas ideias ficam disponíveis para todos os casais. Cada casal recebe a sua própria cópia, onde os planos e memórias permanecem privados." : "Carreguem um ficheiro CSV ou Excel (.xlsx). Revemos as linhas antes de guardar; só as ideias válidas serão importadas para o vosso casal." : isGlobalImport ? "These ideas become available to every couple. Each couple gets its own copy, keeping plans and memories private." : "Choose a CSV or Excel (.xlsx) file. Review the rows before saving; only valid ideas will be imported for your couple."}</p><p className="import-limits">{language === "pt" ? isGlobalImport ? "Máximo: 10 MB e 5000 ideias por ficheiro." : "Máximo: 2 MB e 200 ideias por ficheiro." : isGlobalImport ? "Maximum: 10 MB and 5,000 ideas per file." : "Maximum: 2 MB and 200 ideas per file."}</p><button type="button" className="import-template-button" onClick={downloadImportTemplate}>{language === "pt" ? "Descarregar modelo CSV" : "Download CSV template"}</button><label className="import-file-button">{language === "pt" ? "Escolher ficheiro CSV ou XLSX" : "Choose CSV or XLSX file"}<input type="file" accept=".csv,.xlsx" onChange={(event) => void selectImportFile(event)} /></label>{importError && <p className="form-alert error-alert" role="alert">{importError}</p>}{importMessage && <p className="form-alert config-alert" role="status">{importMessage}</p>}{importPreview && <><p className="import-summary">{language === "pt" ? `${importPreview.valid.length} válidas · ${importPreview.invalid.length} inválidas` : `${importPreview.valid.length} valid · ${importPreview.invalid.length} invalid`}</p><div className="import-preview-list">{importPreview.valid.slice(0, 5).map((idea, index) => <div key={`${idea.title}-${index}`}><strong>{idea.title}</strong><span>{idea.mood} · {idea.duration} · {idea.budget}</span></div>)}{importPreview.valid.length > 5 && <p>{language === "pt" ? `e mais ${importPreview.valid.length - 5} ideias válidas` : `and ${importPreview.valid.length - 5} more valid ideas`}</p>}{importPreview.invalid.slice(0, 100).map((item) => <p className="import-invalid-row" key={item.row}>{language === "pt" ? `Linha ${item.row}: ${translateImportMessage(language, item.reason)}` : `Row ${item.row}: ${item.reason}`}</p>)}{importPreview.invalid.length > 100 && <p className="import-invalid-row">{language === "pt" ? `e mais ${importPreview.invalid.length - 100} linhas inv?lidas` : `and ${importPreview.invalid.length - 100} more invalid rows`}</p>}</div><button type="button" className="modal-submit" disabled={busy || importPreview.valid.length === 0} onClick={() => void importIdeas()}>{busy ? language === "pt" ? "A importar…" : "Importing…" : language === "pt" ? `Importar ${importPreview.valid.length} ideias válidas${isGlobalImport ? " para todos" : ""}` : `Import ${importPreview.valid.length} valid ideas${isGlobalImport ? " for everyone" : ""}`} <span>→</span></button></>}</div>
          : modal === "delete" ? <div className="delete-content"><h3>{language === "pt" ? "Apagar esta ideia?" : "Delete this idea?"}</h3><p className="modal-copy">{language === "pt" ? `“${activeIdea?.title ?? ""}” será removida permanentemente, incluindo as fotografias associadas.` : `“${activeIdea?.title ?? ""}” will be permanently removed, including its attached photos.`}</p><button type="button" className="modal-submit delete-confirm-button" disabled={busy} onClick={() => void deleteActiveIdea()}>{busy ? language === "pt" ? "A apagar…" : "Deleting…" : language === "pt" ? "Apagar permanentemente" : "Delete permanently"}</button></div>
          : modal === "draw" ? <>{activeIdea ? <div className="draw-result"><span className="draw-emoji">{activeIdea.emoji}</span><span className="category-label">{language === "pt" ? ({ Romantic: "Romântico", Adventure: "Aventura", "Food & drink": "Comida e bebida", Creative: "Criativo", Relaxing: "Relaxante", Culture: "Cultura" } as Record<Category, string>)[activeIdea.category] : activeIdea.category}</span><h3>{activeIdea.title}</h3><p>{activeIdea.description}</p><div className="idea-meta"><span>◷ {activeIdea.duration}</span><i /><span>{activeIdea.budget}</span></div></div> : <p className="modal-copy">{drawMessage}</p>}{drawMessage && activeIdea && <p className="draw-message">{drawMessage}</p>}
          {discoveryMode === "random" && drawnIdeaIds.length > 0 && <div className="suggestion-history"><span>{language === "pt" ? "SUGESTÕES ANTERIORES" : "PREVIOUS DRAWS"}</span><div>{drawnIdeaIds.map((id, index) => { const idea = ideas.find((item) => item.id === id); return idea ? <button type="button" key={`${id}-${index}`} className={activeIdeaId === id ? "selected-suggestion" : ""} onClick={() => setActiveIdeaId(id)} aria-label={`${language === "pt" ? "Escolher sugestão" : "Choose suggestion"} ${index + 1}: ${idea.title}`}>{index + 1}</button> : null; })}</div></div>}
          {activeIdea && <div className="draw-actions">{discoveryMode === "random" && randomDrawCount < 3 && <button className="draw-again-button" onClick={() => drawRandomIdea()}>{language === "pt" ? `Sortear outra vez (${3 - randomDrawCount} restantes)` : `Draw again (${3 - randomDrawCount} left)`} <span>⟳</span></button>}{discoveryMode === "random" && randomDrawCount >= 3 && <button className="draw-again-button" onClick={beginFeeling}>{language === "pt" ? "Experimentar o modo feeling" : "Try feeling mode"} <span>→</span></button>}{discoveryMode === "feeling" && <button className="draw-again-button" onClick={() => setModal("feeling")}>{language === "pt" ? "Alterar respostas" : "Change answers"} <span>↻</span></button>}{anniversaryPlanDate ? <button className="draw-plan-today" disabled={busy} onClick={() => void planForAnniversary(activeIdea)}>{language === "pt" ? "Planear para o aniversário" : "Plan this date for our anniversary"} <span>♥</span></button> : <button className="draw-plan-today" disabled={busy} onClick={() => void planForToday(activeIdea)}>{language === "pt" ? "Este date é para hoje" : "This date is for today"} <span>✓</span></button>}<button className="draw-plan-later" onClick={() => openPlan(activeIdea)}>{language === "pt" ? "Planear para outro dia" : "Plan for another day"}</button></div>}
            {!activeIdea && <div className="draw-actions"><button className="draw-again-button" onClick={beginFeeling}>{language === "pt" ? "Experimentar o modo feeling" : "Try feeling mode"} <span>→</span></button><button className="modal-submit" onClick={openNewIdea}>{language === "pt" ? "Adicionar ideia" : "Add an idea"} <span>→</span></button></div>}</>
          : modal === "feeling" ? <form onSubmit={chooseFeelingSuggestion}><p className="modal-copy">{language === "pt" ? "Quatro respostas rápidas para encontrar uma ideia que combine com o vosso momento." : "Four quick answers to find an idea that fits the moment."}</p>{drawMessage && <p className="form-alert config-alert" role="status">{drawMessage}</p>}
            <label className="form-label" htmlFor="feeling-mood">{language === "pt" ? "1. Qual é o vosso mood hoje?" : "1. What’s your mood today?"}<select className="form-input" id="feeling-mood" value={feelingAnswers.mood} onChange={(event) => setFeelingAnswers((current) => ({ ...current, mood: event.target.value as Mood }))}>{moodOptions.map((mood) => <option key={mood} value={mood}>{language === "pt" ? ({ Romantic: "Romântico", Fun: "Divertido", Relaxing: "Relaxante", Adventure: "Aventura", Creative: "Criativo", "Surprise me": "Surpreendam-nos" } as Record<Mood, string>)[mood] : mood}</option>)}</select></label>
            <label className="form-label" htmlFor="feeling-duration">{language === "pt" ? "2. Quanto tempo têm?" : "2. How much time do you have?"}<select className="form-input" id="feeling-duration" value={feelingAnswers.duration} onChange={(event) => setFeelingAnswers((current) => ({ ...current, duration: event.target.value as FeelingAnswers["duration"] }))}><option value="1">{language === "pt" ? "Até 1 hora" : "Up to 1 hour"}</option><option value="2">{language === "pt" ? "1–2 horas" : "1–2 hours"}</option><option value="3">{language === "pt" ? "2–4 horas" : "2–4 hours"}</option><option value="4">{language === "pt" ? "Meio dia ou mais" : "Half a day or more"}</option></select></label>
            <label className="form-label" htmlFor="feeling-budget">{language === "pt" ? "3. Qual é o orçamento para os dois?" : "3. What’s your budget for two?"}<select className="form-input" id="feeling-budget" value={feelingAnswers.budget} onChange={(event) => setFeelingAnswers((current) => ({ ...current, budget: event.target.value as FeelingAnswers["budget"] }))}><option value="1">{language === "pt" ? "Gratuito ou até 10 €" : "Free or up to €10"}</option><option value="2">{language === "pt" ? "10–30 €" : "€10–30"}</option><option value="3">{language === "pt" ? "30–60 €" : "€30–60"}</option><option value="4">{language === "pt" ? "Sem limite definido" : "No set limit"}</option></select></label>
            <label className="form-label" htmlFor="feeling-distance">{language === "pt" ? "4. Até onde querem ir?" : "4. How far would you like to go?"}<select className="form-input" id="feeling-distance" value={feelingAnswers.distance} onChange={(event) => setFeelingAnswers((current) => ({ ...current, distance: event.target.value as FeelingAnswers["distance"] }))}><option value="1">{language === "pt" ? "Em casa" : "At home"}</option><option value="2">{language === "pt" ? "Perto (até 30 min)" : "Nearby (up to 30 min)"}</option><option value="3">{language === "pt" ? "Até 1 hora de viagem" : "Up to 1 hour away"}</option><option value="4">{language === "pt" ? "Sem limite" : "No limit"}</option></select></label>
            <label className="form-label" htmlFor="feeling-avoid">{language === "pt" ? "Há algo que queiram evitar?" : "Anything you’d like to avoid?"} <span>{language === "pt" ? "(opcional; separar por vírgulas)" : "(optional; separate with commas)"}</span><input className="form-input" id="feeling-avoid" value={feelingAnswers.avoid} onChange={(event) => setFeelingAnswers((current) => ({ ...current, avoid: event.target.value }))} placeholder={language === "pt" ? "ex.: multidões, caminhadas longas" : "e.g. crowds, long walks"} maxLength={120} /></label>
            <p className="feeling-note">{language === "pt" ? "A meteorologia ainda não está ligada. As sugestões usam os detalhes de cada ideia." : "Weather data isn’t connected yet. Suggestions are matched using the details saved with each idea."}</p><button className="modal-submit" type="submit">{language === "pt" ? "Encontrar o nosso date" : "Find our date"} <span>→</span></button></form>
          : modal === "plan" ? <><p className="modal-copy">{repeatIdea ? language === "pt" ? "Isto cria um novo plano e mantém a memória original. Para hoje, escolha “Este date é para hoje” na sugestão." : "This creates a new plan and keeps the original memory. To plan for today, choose “This date is for today” on the suggestion." : language === "pt" ? "Escolham uma data diferente para este date." : "Choose a different day for this date."}</p><label className="form-label" htmlFor="planned-date">{language === "pt" ? "Data" : "Date"}<input className="form-input" id="planned-date" type="date" required value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} /></label><label className="form-label">{language === "pt" ? "Onde vão?" : "Where will you go?"} <LocationSearch language={language} value={plannedLocation} onChange={(value) => { setPlannedLocation(value); setPlannedLatitude(null); setPlannedLongitude(null); }} onSelect={(place: GeocodedPlace) => { setPlannedLocation(place.displayName.slice(0, 160)); setPlannedLatitude(place.latitude); setPlannedLongitude(place.longitude); }} /></label><button className="modal-submit" disabled={busy || !plannedDate} onClick={() => void savePlan()}>{busy ? language === "pt" ? "A guardar…" : "Saving…" : language === "pt" ? "Guardar nos dates planeados" : "Save to planned dates"} <span>→</span></button></>
          : modal === "album" ? <><p className="modal-copy">{language === "pt" ? "As fotografias são privadas e só estão disponíveis na vossa conta. Adicionem imagens JPG, PNG, WEBP ou GIF (até 10 MB cada)." : "Photos are private to your shared account. Add JPG, PNG, WEBP or GIF images (up to 10 MB each)."}</p>{photoError && <p className="form-alert error-alert" role="alert">{photoError}</p>}{busy && <p className="album-loading">{language === "pt" ? "A carregar o álbum…" : "Loading your album…"}</p>}<div className="album-grid">{photos.filter((photo) => photo.date_idea_id === activeIdeaId).map((photo) => photo.signed_url ? <a className="album-photo" key={photo.id} href={photo.signed_url} target="_blank" rel="noopener noreferrer"><img src={photo.signed_url} alt={`${activeIdea?.title ?? "Date"} memory`} loading="lazy" /></a> : <div className="album-photo-unavailable" key={photo.id}>{language === "pt" ? "Pré-visualização indisponível" : "Photo preview unavailable"}</div>)}</div><label className="photo-upload-button">＋ {language === "pt" ? "Adicionar fotografias" : "Add photos"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple disabled={busy} onChange={(event) => void uploadPhotos(event)} /></label></>
          : modal === "location" ? <><p className="modal-copy">{language === "pt" ? "Pesquisem o local e escolham o resultado correto para o adicionar ao mapa." : "Search for the place, then select the right result to pin it on your map."}</p><LocationSearch language={language} value={locationName} onChange={(value) => { setLocationName(value); setLocationLatitude(null); setLocationLongitude(null); }} onSelect={(place: GeocodedPlace) => { setLocationName(place.displayName.slice(0, 160)); setLocationLatitude(place.latitude); setLocationLongitude(place.longitude); }} /><button className="modal-submit" disabled={busy || locationLatitude === null || locationLongitude === null} onClick={() => void savePinnedLocation()}>{busy ? language === "pt" ? "A guardar…" : "Saving…" : language === "pt" ? "Guardar no mapa" : "Save map pin"} <span>→</span></button></>
          : modal === "memory" ? <form onSubmit={(event) => void saveMemory(event)}><p className="modal-copy">{language === "pt" ? "Adicionem uma nota, uma avaliação ou o local que visitaram. Tudo é opcional. Podem adicionar fotografias agora ou mais tarde no álbum." : "Add a little note, a rating or where you went. Every detail is optional. You can add photos now or later from the album."}</p><label className="form-label">{language === "pt" ? "A vossa memória" : "Your memory"} <textarea className="form-input memory-input" maxLength={1000} placeholder={language === "pt" ? "Qual foi a vossa parte favorita?" : "What was your favourite part?"} value={memoryNote} onChange={(event) => setMemoryNote(event.target.value)} /></label><label className="form-label">{language === "pt" ? "Onde foram?" : "Where did you go?"} <LocationSearch language={language} value={locationName} onChange={(value) => { setLocationName(value); setLocationLatitude(null); setLocationLongitude(null); }} onSelect={(place: GeocodedPlace) => { setLocationName(place.displayName.slice(0, 160)); setLocationLatitude(place.latitude); setLocationLongitude(place.longitude); }} /></label><label className="form-label">{language === "pt" ? "Como avaliam o date?" : "How would you rate it?"}</label><div className="rating-picker" aria-label={language === "pt" ? "Escolher uma classificação de um a cinco" : "Choose a rating from one to five"}>{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} aria-label={`${value} stars`} aria-pressed={rating === value} className={value <= rating ? "chosen" : ""} onClick={() => setRating(value)}>★</button>)}</div><label className="photo-upload-button memory-photo-upload">＋ {language === "pt" ? "Adicionar fotografias" : "Add photos"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple disabled={busy} onChange={(event) => void uploadPhotos(event)} /></label>{photoError && <p className="form-alert error-alert" role="alert">{photoError}</p>}{photos.some((photo) => photo.date_idea_id === activeIdeaId) && <div className="memory-upload-previews">{photos.filter((photo) => photo.date_idea_id === activeIdeaId && photo.signed_url).map((photo) => <img key={photo.id} src={photo.signed_url ?? ""} alt={language === "pt" ? "Fotografia do date enviada" : "Uploaded date memory"} />)}</div>}<button className="modal-submit" type="submit" disabled={busy}>{busy ? language === "pt" ? "A guardar…" : "Saving…" : language === "pt" ? "Guardar nas memórias" : "Save to our memories"} <span>→</span></button></form>
            : <form onSubmit={(event) => void addIdea(event)}><p className="modal-copy">{language === "pt" ? modal === "edit" ? "Atualizem os detalhes desta ideia." : "Adicionem uma ideia com os detalhes que a Nossia usa para encontrar boas sugestões." : modal === "edit" ? "Update the details for this date idea." : "Add a date idea with the details Nossia uses to find a good match."}</p><label className="form-label" htmlFor="idea-title">{language === "pt" ? "A vossa ideia" : "Your idea"}<input className="form-input" id="idea-title" autoFocus placeholder={language === "pt" ? "ex.: Ver as estrelas numa noite de verão" : "e.g. Stargazing on a summer night"} value={newTitle} onChange={(event) => setNewTitle(event.target.value)} required maxLength={70} /></label><label className="form-label" htmlFor="idea-description">{language === "pt" ? "Descrição" : "Description"}<textarea className="form-input idea-description-input" id="idea-description" value={newDescription} onChange={(event) => setNewDescription(event.target.value)} required maxLength={500} /></label><label className="form-label" htmlFor="idea-mood">{language === "pt" ? "Estado de espírito" : "Mood"}<select className="form-input" id="idea-mood" value={newMood} onChange={(event) => { const mood = event.target.value as Mood; setNewMood(mood); if (!editingIdeaId) setNewCategory(categoryForMood(mood)); }}>{moodOptions.map((mood) => <option key={mood} value={mood}>{language === "pt" ? ({ Romantic: "Romântico", Fun: "Divertido", Relaxing: "Relaxante", Adventure: "Aventura", Creative: "Criativo", "Surprise me": "Surpreendam-nos" } as Record<Mood, string>)[mood] : mood}</option>)}</select></label><label className="form-label" htmlFor="idea-category">{language === "pt" ? "Categoria" : "Category"}<select className="form-input" id="idea-category" value={newCategory} onChange={(event) => setNewCategory(event.target.value as Category)}>{categories.filter((item): item is Category => item !== "All").map((item) => <option key={item} value={item}>{categoryLabel(item, language)}</option>)}</select></label><div className="form-grid idea-detail-grid"><label className="form-label" htmlFor="idea-duration">{language === "pt" ? "Duração" : "Duration"}<select className="form-input" id="idea-duration" value={newDuration} onChange={(event) => setNewDuration(event.target.value)}><option value="60">{language === "pt" ? "Até 1 hora" : "Up to 1 hour"}</option><option value="90">1–2 {language === "pt" ? "horas" : "hours"}</option><option value="180">2–4 {language === "pt" ? "horas" : "hours"}</option><option value="300">{language === "pt" ? "Meio dia ou mais" : "Half a day or more"}</option></select></label><label className="form-label" htmlFor="idea-budget">{language === "pt" ? "Orçamento para dois" : "Budget for two"}<select className="form-input" id="idea-budget" value={newBudget} onChange={(event) => setNewBudget(event.target.value)}><option value="0">{language === "pt" ? "Gratuito" : "Free"}</option><option value="10">{language === "pt" ? "Até 10 €" : "Up to €10"}</option><option value="30">{language === "pt" ? "Até 30 €" : "Up to €30"}</option><option value="60">{language === "pt" ? "Até 60 €" : "Up to €60"}</option></select></label></div><label className="form-label" htmlFor="idea-travel">{language === "pt" ? "Tempo de viagem (ida)" : "Travel time (one way)"}<select className="form-input" id="idea-travel" value={newTravel} onChange={(event) => setNewTravel(event.target.value)} disabled={newAtHome}><option value="">{language === "pt" ? "Desconhecido / sem limite" : "Unknown / no limit"}</option><option value="15">{language === "pt" ? "Até 15 min" : "Up to 15 min"}</option><option value="30">{language === "pt" ? "Até 30 min" : "Up to 30 min"}</option><option value="60">{language === "pt" ? "Até 1 hora" : "Up to 1 hour"}</option><option value="120">{language === "pt" ? "Mais de 1 hora" : "Over 1 hour"}</option></select></label><label className="home-date-option"><input type="checkbox" checked={newAtHome} onChange={(event) => { setNewAtHome(event.target.checked); if (event.target.checked) setNewTravel("0"); else if (newTravel === "0") setNewTravel(""); }} />{language === "pt" ? "Esta ideia pode ser feita em casa" : "This idea can be done at home"}</label><button className="modal-submit" type="submit" disabled={busy}>{busy ? language === "pt" ? "A guardar…" : "Saving…" : language === "pt" ? modal === "edit" ? "Guardar alterações" : "Guardar esta ideia" : modal === "edit" ? "Save changes" : "Save this idea"} <span>→</span></button></form>}
      </section></div>}
    </div>
  );
}

export default App;
