import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { CalendarView, LocationSearch } from "./CalendarMap";
import { SchedulePanel, sharedFreeDays } from "./SchedulePanel";
import { TripsPanel } from "./TripsPanel";
import { TripWorld } from "./TripWorld";
import { PlacesPanel } from "./PlacesPanel";
import type { PlaceToPlan } from "./PlacesPanel";
import { QuickAddBox } from "./QuickAddBox";
import type { QuickAddValue } from "./QuickAddBox";
import { guessIdea, isWatchingAtHome, memoryKind, placeFromTitle, placeKindFromTitle, plain, watchedName } from "./quickParse";
import { AuthScreen } from "./AuthScreen";
import { authFlowFromPath, authPaths } from "./authFlow";
import type { AuthFlow } from "./authFlow";
import { formatDate, localDateString, nextAnniversary, nextPersonalBirthday, relationshipDuration } from "./dateUtils";
import { HomeLocationPicker } from "./HomeLocationPicker";
import { AccountSettings } from "./AccountSettings";
import { Onboarding } from "./Onboarding";
import { WelcomeSteps, readSeenWelcome, saveSeenWelcome } from "./WelcomeSteps";
import type { WelcomeStep } from "./WelcomeSteps";
import { Mascot as MascotArt } from "./Mascot";
import type { Mascot } from "./mascots";
import { decideHouse } from "./house";
import { buildDeck, isHiddenByCouple, noSignals } from "./preferences";
import type { CoupleSignals, Vote } from "./preferences";
import { PassedIdeas, SwipeDeck } from "./SwipeDeck";
import { EventsPanel } from "./EventsPanel";
import { Opportunities } from "./Opportunities";
import { VacationSettings } from "./VacationSettings";
import type { VacationPeriod, VacationProfile } from "./VacationSettings";
import type { VacationRules } from "./holidays";
import { eventsNear } from "./events";
import type { LocalEvent, Origin } from "./events";
import { activeSeasonFor, seasons as seasonDetails } from "./seasons";
import { budgetLabel, chooseSuggestionDay, completedCategoryCounts, durationLabel, ideasForDate, longestWindow, moodLabels, pickWeighted, rankIdeas } from "./suggestions";
import { TodayView } from "./TodayView";
import { activities, activityLabel, activityOf, activityValues, isSpecial, legacyFields } from "./activities";
import type { Activity } from "./activities";
import { ArrowRight, Bookmark, CalendarDays, Check, Clock, Heart, Home, Lightbulb, LogOut, Pencil, Plus, Search, Shuffle, SlidersHorizontal, Trash2, Upload, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { WeatherPanel } from "./WeatherPanel";
import { previewIdeaImport } from "./ideaImport";
import type { ImportPreview } from "./ideaImport";
import type { CouplePlace, CoupleCommitment, CoupleDate, CoupleTrip, DateDetails, DateIdea, FeelingAnswers, GeocodedPlace, HomePartner, Idea, WeatherSetting, WorkScheduleBlock } from "./types";
import { activityWeatherAdvice, activityWeatherLabel, activityWeatherReason, fetchDailyWeather, weatherConditionFor, weatherEmoji, weatherLabel } from "./weather";
import type { DailyWeather, WeatherCondition } from "./weather";

type View = "today" | "events" | "discover" | "favorites" | "planned" | "memories" | "calendar" | "schedule" | "map" | "insights" | "settings" | "trips" | "tripMap" | "places";
type Section = "today" | "explore" | "agenda" | "us";

type DiscoveryMode = "random" | "feeling";
type RelationshipMetric = "days" | "months" | "years";
type AppModal = "new" | "edit" | "import" | "global-import" | "delete" | "plan" | "memory" | "draw" | "feeling" | "album" | "location" | "home-location" | "profile" | null;
// How stale the data may get before returning to the tab refreshes it in the background.
const backgroundRefreshAfterMs = 30 * 1000;
const syncDelayMs = 400;
const LazyMapView = lazy(() => import("./MapView").then((module) => ({ default: module.MapView })));
type DatePhoto = {
  id: string;
  couple_id: string;
  date_id: string;
  storage_path: string;
  created_at: string;
  signed_url: string | null;
};
type Couple = {
  id: string;
  home_airport: string;
  partner_one_name: string;
  partner_two_name: string;
  partner_one_birth_date: string | null;
  partner_two_birth_date: string | null;
  relationship_date: string;
  first_met_date: string | null;
  first_message_date: string | null;
  first_date_date: string | null;
  weather_location_name: string | null;
  weather_latitude: number | null;
  municipality: string | null;
  municipality_latitude: number | null;
  municipality_longitude: number | null;
  weather_longitude: number | null;
  couple_photo_path: string | null;
};


const categories: Array<Activity | "All"> = ["All", ...activityValues];

// Four tabs; pages that belong together sit under one tab as sub-sections. Settings open from the avatar.
const sections: Array<{ id: Section; label: string; Icon: LucideIcon; views: View[] }> = [
  { id: "today", label: "Hoje", Icon: Home, views: ["today"] },
  { id: "explore", label: "Explorar", Icon: Lightbulb, views: ["discover", "events", "places", "favorites"] },
  { id: "agenda", label: "Agenda", Icon: CalendarDays, views: ["planned", "calendar", "schedule", "trips"] },
  { id: "us", label: "Nós", Icon: Heart, views: ["memories", "map", "tripMap", "insights"] },
];
const subviewLabels: Record<View, string> = {
  today: "Hoje",
  discover: "Ideias",
  favorites: "Favoritas",
  planned: "Planeados",
  calendar: "Calendário",
  schedule: "Semana",
  memories: "Memórias",
  map: "Mapa",
  insights: "Números",
  settings: "Definições",
  trips: "Viagens",
  tripMap: "Mapa-mundo",
  places: "Sítios",
  events: "Eventos",
};
const sectionOf = (view: View) => sections.find((section) => section.views.includes(view)) ?? sections[0];


function viewFromPath(pathname: string): View {
  const route = pathname.replace(/^\/+|\/+$/g, "");
  const routes: Record<string, View> = {
    "": "today",
    hoje: "today",
    today: "today",
    dates: "discover",
    ideias: "discover",
    discover: "discover",
    planned: "planned",
    memories: "memories",
    calendar: "calendar",
    agenda: "schedule",
    semana: "schedule",
    definicoes: "settings",
    viagens: "trips",
    "mapa-mundo": "tripMap",
    sitios: "places",
    eventos: "events",
    events: "events",
    trips: "trips",
    settings: "settings",
    favorites: "favorites",
    map: "map",
    insights: "insights",
  };
  return routes[route] ?? "today";
}

function pathForView(view: View) {
  return `/${view === "today" ? "hoje" : view === "discover" ? "dates" : view === "schedule" ? "agenda" : view === "settings" ? "definicoes" : view === "trips" ? "viagens" : view === "tripMap" ? "mapa-mundo" : view === "places" ? "sitios" : view === "events" ? "eventos" : view}`;
}

function translateImportMessage(message: string) {
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
    "weather_setting must be any, indoor, or outdoor": "weather_setting tem de ser any, indoor ou outdoor",
    "category is invalid": "a categoria é inválida",
  };
  return message.split("; ").map((part) => translations[part] ?? "Não foi possível ler o ficheiro.").join("; ");
}


const watchingIdeaTitle = "Ver um filme ou uma série";


const emptyDateDetails: DateDetails = {
  planned_for: null,
  planned_start_time: null,
  completed_at: null,
  memory: null,
  rating: null,
  location_name: null,
  latitude: null,
  longitude: null,
  home_partner: null,
  place_id: null,
  event_id: null,
  would_repeat: null,
  watched_title: null,
  food_notes: null,
};

// Ideas that already have a date appear through that date instead, so completed ideas are
// not suggested again and planned ones are not listed twice.
function buildDateIdeas(catalog: Idea[], dates: CoupleDate[], favoriteIdeaIds: Set<string>, coupleId: string | undefined): DateIdea[] {
  const ideasById = new Map(catalog.map((idea) => [idea.id, idea]));
  const datedIdeaIds = new Set(dates.map((date) => date.idea_id));
  const plannedIdeaIds = new Set(dates.filter((date) => date.status === "planned").map((date) => date.idea_id));
  const fromIdea = (idea: Idea) => ({
    idea_id: idea.id,
    title: idea.title,
    description: idea.description,
    category: idea.category,
    duration: idea.duration,
    budget: idea.budget,
    emoji: idea.emoji,
    mood: idea.mood,
    activity: activityOf(idea),
    special: isSpecial(idea),
    duration_minutes: idea.duration_minutes,
    budget_eur: idea.budget_eur,
    travel_minutes: idea.travel_minutes,
    at_home: idea.at_home,
    weather_setting: idea.weather_setting,
    seasons: idea.seasons ?? [],
    tags: idea.tags ?? [],
    repeatable: idea.repeatable ?? false,
    favorite: favoriteIdeaIds.has(idea.id),
    is_own_idea: idea.created_by_couple_id !== null && idea.created_by_couple_id === coupleId,
  });
  const datedIdeas = dates.flatMap((date) => {
    const idea = ideasById.get(date.idea_id);
    return idea ? [{
      ...fromIdea(idea),
      id: date.id,
      status: date.status,
      planned_for: date.planned_for,
      planned_start_time: date.planned_start_time,
      completed_at: date.completed_at,
      memory: date.memory,
      rating: date.rating,
      location_name: date.location_name,
      latitude: date.latitude,
      longitude: date.longitude,
      home_partner: date.home_partner,
      place_id: date.place_id,
      event_id: date.event_id ?? null,
      would_repeat: date.would_repeat,
      watched_title: date.watched_title,
      food_notes: date.food_notes,
    }] : [];
  });
  const unplannedIdeas = catalog
    .filter((idea) => idea.repeatable ? !plannedIdeaIds.has(idea.id) : !datedIdeaIds.has(idea.id))
    .map((idea) => ({ ...fromIdea(idea), ...emptyDateDetails, id: idea.id, status: "idea" as const }));
  return [...datedIdeas, ...unplannedIdeas];
}

async function loadAllRows<Row>(table: string) {
  const rows: Row[] = [];
  if (!supabase) return { rows, error: null };
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from(table).select("*")
      .order("created_at", { ascending: true }).order("id", { ascending: true })
      .range(offset, offset + 499);
    if (error) return { rows, error: error.message };
    rows.push(...data as Row[]);
    if (data.length < 500) break;
  }
  return { rows, error: null };
}


function filterFeelingIdeas(ideas: DateIdea[], answers: FeelingAnswers, answeredQuestions: number) {
  const avoidTerms = answers.avoid.split(",").map((term) => term.trim().toLocaleLowerCase("en-GB")).filter(Boolean);
  return ideas.filter((idea) => {
    if (idea.status !== "idea") return false;
    if (answers.activity !== "Surprise me" && activityOf(idea) !== answers.activity) return false;
    if (answers.special && !isSpecial(idea)) return false;
    if (answeredQuestions >= 2) {
      const duration = idea.duration_minutes;
      if (duration === null) return false;
      if (answers.duration === "1" && duration > 60) return false;
      if (answers.duration === "2" && (duration <= 60 || duration > 120)) return false;
      if (answers.duration === "3" && (duration <= 120 || duration > 240)) return false;
      if (answers.duration === "4" && duration <= 240) return false;
    }
    if (answeredQuestions >= 3) {
      const budget = idea.budget_eur;
      if (answers.budget !== "4" && budget === null) return false;
      if (budget !== null && answers.budget === "1" && budget > 10) return false;
      if (budget !== null && answers.budget === "2" && (budget <= 10 || budget > 30)) return false;
      if (budget !== null && answers.budget === "3" && (budget <= 30 || budget > 60)) return false;
    }
    if (answeredQuestions >= 4) {
      if (answers.distance === "1" && !idea.at_home) return false;
      if (answers.distance === "2" && !idea.at_home && (idea.travel_minutes === null || idea.travel_minutes > 30)) return false;
      if (answers.distance === "3" && !idea.at_home && (idea.travel_minutes === null || idea.travel_minutes > 60)) return false;
    }
    const searchable = `${idea.title} ${idea.description} ${activityLabel(activityOf(idea))}`.toLocaleLowerCase("pt-PT");
    return !avoidTerms.some((term) => searchable.includes(term));
  });
}



function App() {
  const [authFlow, setAuthFlow] = useState<AuthFlow>(() => authFlowFromPath(window.location.pathname));
  const [relationshipMetric, setRelationshipMetric] = useState<RelationshipMetric>(() => {
    const savedMetric = window.localStorage.getItem("nossia-relationship-metric");
    return savedMetric === "months" || savedMetric === "years" ? savedMetric : "days";
  });
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [couplePhotoUrl, setCouplePhotoUrl] = useState<string | null>(null);
  const [profilePhotoError, setProfilePhotoError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileSaveFailed, setProfileSaveFailed] = useState(false);
  const [profilePartnerOneName, setProfilePartnerOneName] = useState("");
  const [profilePartnerTwoName, setProfilePartnerTwoName] = useState("");
  const [profilePartnerOneBirthday, setProfilePartnerOneBirthday] = useState("");
  const [profilePartnerTwoBirthday, setProfilePartnerTwoBirthday] = useState("");
  const [profileRelationshipDate, setProfileRelationshipDate] = useState("");
  const [profileFirstMetDate, setProfileFirstMetDate] = useState("");
  const [profileFirstMessageDate, setProfileFirstMessageDate] = useState("");
  const [profileFirstDateDate, setProfileFirstDateDate] = useState("");
  const [catalog, setCatalog] = useState<Idea[]>([]);
  const [dates, setDates] = useState<CoupleDate[]>([]);
  const [favoriteIdeaIds, setFavoriteIdeaIds] = useState<Set<string>>(() => new Set());
  const [memberSlots, setMemberSlots] = useState<HomePartner[]>([]);
  const [mySlot, setMySlot] = useState<HomePartner | null>(null);
  const [workBlocks, setWorkBlocks] = useState<WorkScheduleBlock[]>([]);
  const [commitments, setCommitments] = useState<CoupleCommitment[]>([]);
  const [trips, setTrips] = useState<CoupleTrip[]>([]);
  const [memoryTripId, setMemoryTripId] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [suggestionSeed, setSuggestionSeed] = useState(() => Math.floor(Math.random() * 1000));
  const [inviteLink, setInviteLink] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [photos, setPhotos] = useState<DatePhoto[]>([]);
  const [view, setView] = useState<View>(() => viewFromPath(window.location.pathname));
  const [visibleIdeaLimit, setVisibleIdeaLimit] = useState(60);
  const [category, setCategory] = useState<Activity | "All">("All");
  const [placeFilter, setPlaceFilter] = useState<"all" | "home" | "out">("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<AppModal>(null);
  const [activeIdeaId, setActiveIdeaId] = useState<string | null>(null);
  const [drawnIdeaIds, setDrawnIdeaIds] = useState<string[]>([]);
  const [randomDrawCount, setRandomDrawCount] = useState(0);
  const [anniversaryPlanDate, setAnniversaryPlanDate] = useState<string | null>(null);
  const [drawMessage, setDrawMessage] = useState("");
  const [discoveryMode, setDiscoveryMode] = useState<DiscoveryMode>("random");
  const [feelingAnswers, setFeelingAnswers] = useState<FeelingAnswers>({ activity: "Surprise me", duration: "4", budget: "4", distance: "4", avoid: "" });
  const [feelingStep, setFeelingStep] = useState(0);
  const [weatherCondition, setWeatherCondition] = useState<WeatherCondition>("unknown");
  const [weatherForecast, setWeatherForecast] = useState<DailyWeather[]>([]);
  const [newActivity, setNewActivity] = useState<Activity>("comer");
  const [newSpecial, setNewSpecial] = useState(false);
  const [newDuration, setNewDuration] = useState("120");
  const [newBudget, setNewBudget] = useState("30");
  const [newTravel, setNewTravel] = useState("");
  const [newAtHome, setNewAtHome] = useState(false);
  const [newWeatherSetting, setNewWeatherSetting] = useState<WeatherSetting>("any");
  const [plannedDate, setPlannedDate] = useState("");
  const [plannedTime, setPlannedTime] = useState("");
  const [plannedLocation, setPlannedLocation] = useState("");
  const [plannedLatitude, setPlannedLatitude] = useState<number | null>(null);
  const [plannedLongitude, setPlannedLongitude] = useState<number | null>(null);
  const [plannedHomePartner, setPlannedHomePartner] = useState<HomePartner | null>(null);
  const [repeatIdea, setRepeatIdea] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importTarget, setImportTarget] = useState<"couple" | "global">("couple");
  const [importError, setImportError] = useState("");
  const [importMessage, setImportMessage] = useState("");
  // The sub-section last opened in each tab, so going back to a tab returns there.
  const lastViewInSection = useRef<Partial<Record<Section, View>>>({});
  const [memoryNote, setMemoryNote] = useState("");
  const [mascots, setMascots] = useState<Mascot[] | null>(null);
  const [syncTick, setSyncTick] = useState(0);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [signals, setSignals] = useState<CoupleSignals>(noSignals);
  const [openDeck, setOpenDeck] = useState<DateIdea[] | null>(null);
  const [welcomeSeen, setWelcomeSeen] = useState<WelcomeStep[]>([]);
  const welcomeUserId = session?.user.id;
  useEffect(() => {
    if (welcomeUserId) setWelcomeSeen(readSeenWelcome(welcomeUserId));
  }, [welcomeUserId]);
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [vacationProfiles, setVacationProfiles] = useState<VacationProfile[]>([]);
  const [vacationPeriods, setVacationPeriods] = useState<VacationPeriod[]>([]);
  const [partnerJoined, setPartnerJoined] = useState(true);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [editingMascot, setEditingMascot] = useState(false);
  const [memoryDate, setMemoryDate] = useState("");
  const [memoryRepeat, setMemoryRepeat] = useState<boolean | null>(null);
  const [memoryWatched, setMemoryWatched] = useState("");
  const [memoryFood, setMemoryFood] = useState("");
  const [editingMemory, setEditingMemory] = useState(false);
  const [editingPlan, setEditingPlan] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [locationLatitude, setLocationLatitude] = useState<number | null>(null);
  const [locationLongitude, setLocationLongitude] = useState<number | null>(null);
  const [memoryHomePartner, setMemoryHomePartner] = useState<HomePartner | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [dataError, setDataError] = useState("");
  const [catalogAvailable, setCatalogAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const isCatalogAdmin = session?.user.app_metadata.catalog_admin === true;
  const ideas = useMemo(() => buildDateIdeas(catalog, dates, favoriteIdeaIds, couple?.id), [catalog, couple?.id, dates, favoriteIdeaIds]);

  function navigateAuth(nextMode: AuthFlow, replace = false) {
    const path = authPaths[nextMode];
    if (window.location.pathname !== path) {
      window.history[replace ? "replaceState" : "pushState"]({}, "", path);
    }
    setAuthFlow(nextMode);
  }

  function navigateView(nextView: View, replace = false) {
    if (nextView !== "settings") lastViewInSection.current[sectionOf(nextView).id] = nextView;
    const path = pathForView(nextView);
    if (window.location.pathname !== path) {
      window.history[replace ? "replaceState" : "pushState"]({}, "", path);
    }
    setView(nextView);
  }

  const loadedUser = useRef<{ id: string; at: number } | null>(null);

  const loadCoupleData = useCallback(async (currentSession: Session) => {
    if (!supabase) return;
    loadedUser.current = { id: currentSession.user.id, at: Date.now() };
    setDataError("");
    const { data: profile, error: profileError } = await supabase.from("couples").select("*").single();
    if (profileError) {
      loadedUser.current = null;
      setDataError(`Não foi possível carregar o perfil do casal: ${profileError.message}`);
      return;
    }
    setCouple(profile as Couple);
    const coupleProfile = profile as Couple;
    if (coupleProfile.couple_photo_path) {
      const { data: signedPhoto, error: signedPhotoError } = await supabase.storage
        .from("date-photos")
        .createSignedUrl(coupleProfile.couple_photo_path, 60 * 60);
      if (signedPhotoError) {
        setDataError(`Não foi possível carregar a fotografia do casal: ${signedPhotoError.message}`);
      } else {
        setCouplePhotoUrl(signedPhoto.signedUrl);
      }
    } else {
      setCouplePhotoUrl(null);
    }
    const [{ rows: savedIdeas, error: ideasError }, { rows: savedDates, error: datesError }, { data: savedFavorites, error: favoritesError }, { data: savedMembers, error: membersError }, { data: savedBlocks }, { data: savedCommitments }, { data: savedTrips }] = await Promise.all([
      loadAllRows<Idea>("ideas"),
      loadAllRows<CoupleDate>("couple_dates"),
      supabase.from("couple_idea_favorites").select("idea_id"),
      supabase.from("couple_members").select("partner_slot, user_id"),
      supabase.from("work_schedule_blocks").select("*").order("weekday").order("starts_at"),
      supabase.from("couple_commitments").select("*").order("event_date"),
      supabase.from("couple_trips").select("*").order("start_date"),
    ]);
    if (ideasError || datesError) {
      loadedUser.current = null;
      setCatalogAvailable(false);
      setDataError(`Não foi possível carregar os vossos dates. Confirmem que todas as migrations foram aplicadas no Supabase: ${ideasError ?? datesError}`);
      return;
    }
    setCatalogAvailable(true);
    setCatalog(savedIdeas);
    setDates(savedDates);
    if (favoritesError) setDataError(`Não foi possível carregar os favoritos: ${favoritesError.message}`);
    setFavoriteIdeaIds(new Set((savedFavorites ?? []).map((favorite) => favorite.idea_id as string)));
    if (membersError) setDataError(`Não foi possível carregar as contas do casal: ${membersError.message}`);
    setMemberSlots((savedMembers ?? []).map((member) => member.partner_slot as HomePartner));
    setWorkBlocks((savedBlocks ?? []) as WorkScheduleBlock[]);
    setCommitments((savedCommitments ?? []) as CoupleCommitment[]);
    setTrips((savedTrips ?? []) as CoupleTrip[]);
    setMySlot((savedMembers ?? []).find((member) => member.user_id === currentSession.user.id)?.partner_slot as HomePartner | undefined ?? null);
    const { data: savedPhotos, error: photosError } = await supabase.from("date_photos").select("*").order("created_at", { ascending: true });
    if (photosError) {
      setPhotos([]);
      setDataError(`Não foi possível carregar os álbuns: ${photosError.message}`);
    } else if (savedPhotos.length === 0) {
      setPhotos([]);
    } else {
      const { data: signedPhotos, error: signedPhotosError } = await supabase.storage
        .from("date-photos")
        .createSignedUrls(savedPhotos.map((photo) => photo.storage_path), 3600);
      if (signedPhotosError) {
        setPhotos(savedPhotos.map((photo) => ({ ...photo, signed_url: null })) as DatePhoto[]);
        setDataError(`Não foi possível abrir os álbuns: ${signedPhotosError.message}`);
      } else {
        if (signedPhotos.some((photo) => !photo.signedUrl)) {
          setDataError("Não foi possível abrir uma ou mais fotografias do álbum.");
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
        setDataError(`Não foi possível recuperar a sessão: ${error.message}`);
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
        setAuthFlow("password-update");
        navigateAuth("password-update", true);
        setSession(updatedSession);
        setAuthReady(true);
        if (updatedSession) void loadCoupleData(updatedSession);
        return;
      }
      // Supabase also reports SIGNED_IN when the tab regains focus and when a token refreshes.
      // For the same person that's not a new sign-in, so what's on screen stays put.
      if (updatedSession && loadedUser.current?.id === updatedSession.user.id) {
        setSession(updatedSession);
        if (Date.now() - loadedUser.current.at > backgroundRefreshAfterMs) {
          window.setTimeout(() => { if (active) void loadCoupleData(updatedSession); }, 0);
        }
        return;
      }
      if (updatedSession) {
        setAuthReady(false);
        window.setTimeout(() => {
          if (active) void loadCoupleData(updatedSession).finally(() => { if (active) setAuthReady(true); });
        }, 0);
      } else {
        loadedUser.current = null;
        setPasswordRecovery(false);
        setSession(null);
        setCouple(null);
        setCatalog([]);
        setDates([]);
        setFavoriteIdeaIds(new Set());
        setMemberSlots([]);
        setMySlot(null);
        setWorkBlocks([]);
        setCommitments([]);
        setTrips([]);
        setInviteLink("");
        setPhotos([]);
        setCatalogAvailable(false);
        setAuthReady(true);
      }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [loadCoupleData]);

  useEffect(() => {
    const handlePopState = () => {
      setAuthFlow(authFlowFromPath(window.location.pathname));
      setView(viewFromPath(window.location.pathname));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (passwordRecovery && session) {
      navigateAuth("password-update", true);
    } else if (session && couple) {
      navigateView(view, true);
    } else {
      navigateAuth(authFlow === "password-update" ? "sign-in" : authFlow, true);
    }
  }, [authFlow, authReady, couple, passwordRecovery, session, view]);

  useEffect(() => {
    const latitude = couple?.weather_latitude;
    const longitude = couple?.weather_longitude;
    if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) return;
    const controller = new AbortController();
    void fetchDailyWeather(latitude, longitude, controller.signal).then(setWeatherForecast).catch(() => undefined);
    return () => controller.abort();
  }, [couple?.weather_latitude, couple?.weather_longitude]);

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
    const activityCounts = activityValues
      .map((activity) => ({
        activity,
        count: completedIdeas.filter((idea) => activityOf(idea) === activity).length,
      }))
      .filter((stat) => stat.count > 0)
      .sort((a, b) => b.count - a.count || a.activity.localeCompare(b.activity));
    return { total: completedIdeas.length, activities: activityCounts, top: activityCounts.slice(0, 2) };
  }, [ideas]);

  const completedStats = useMemo(() => {
    const completedIdeas = ideas.filter((idea) => idea.status === "completed");
    const uniqueActivities = new Set(completedIdeas.map((idea) => `${idea.title.trim().toLocaleLowerCase("en-GB")}|${idea.description.trim().toLocaleLowerCase("en-GB")}`));
    const categoryCounts = new Map<Activity, number>();
    completedIdeas.forEach((idea) => categoryCounts.set(activityOf(idea), (categoryCounts.get(activityOf(idea)) ?? 0) + 1));
    const topCategory = [...categoryCounts.entries()].sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))[0]?.[0] ?? null;
    const locatedIdeas = completedIdeas.flatMap((idea) => idea.location_name?.trim() ? [idea.location_name.trim().toLocaleLowerCase("en-GB")] : []);
    const today = localDateString();
    const thisMonth = completedIdeas.filter((idea) => idea.completed_at?.slice(0, 7) === today.slice(0, 7)).length;
    return {
      total: completedIdeas.length,
      uniqueActivities: uniqueActivities.size,
      topCategory,
      wouldRepeat: completedIdeas.filter((idea) => idea.would_repeat).length,
      uniquePlaces: new Set(locatedIdeas).size,
      estimatedSpend: completedIdeas.reduce((total, idea) => total + (idea.budget_eur ?? 0), 0),
      thisMonth,
      homeDates: completedIdeas.filter((idea) => idea.home_partner !== null).length,
      homeByPartner: (["partner_one", "partner_two"] as const).map((partner) => ({
        partner,
        count: completedIdeas.filter((idea) => idea.home_partner === partner).length,
      })),
    };
  }, [ideas]);

  const visibleIdeas = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("en-GB");
    const favoriteShown = new Set<string>();
    const today = localDateString();
    const matching = ideas.filter((idea) => {
      if (idea.status === "idea" && isHiddenByCouple(idea.idea_id, signals)) return false;
      // An idea repeated several times is still one favourite.
      if (view === "favorites") {
        if (!idea.favorite || favoriteShown.has(idea.idea_id)) return false;
        favoriteShown.add(idea.idea_id);
      }
      const inView =
        view === "favorites" ? idea.favorite
          : view === "planned" ? idea.status === "planned"
            : view === "memories" ? idea.status === "completed"
              : view === "calendar" || view === "map" ? idea.status === "planned" || idea.status === "completed"
              : idea.status !== "completed";
      if (view === "discover" && !query && idea.status === "idea" && idea.seasons.length > 0 && !activeSeasonFor(idea.seasons, today)) return false;
      const inCategory = category === "All" || activityOf(idea) === category;
      const inPlace = placeFilter === "all" || (placeFilter === "home") === idea.at_home;
      const inSearch = !query || `${idea.title} ${idea.description} ${activityLabel(activityOf(idea))} ${idea.location_name ?? ""}`.toLocaleLowerCase("pt-PT").includes(query);
      return inView && inCategory && inPlace && inSearch;
    });
    if (view !== "discover") return matching;
    const seasonRank = (idea: DateIdea) => {
      const season = idea.status === "idea" ? activeSeasonFor(idea.seasons, today) : null;
      return !season ? 0 : seasonDetails[season].event ? 2 : 1;
    };
    return matching.map((idea, index) => ({ idea, index })).sort((first, second) => seasonRank(second.idea) - seasonRank(first.idea) || first.index - second.index).map(({ idea }) => idea);
  }, [category, ideas, placeFilter, search, view]);

  const todayContext = useMemo(() => {
    const today = localDateString();
    return {
      date: today,
      forecast: weatherForecast.find((day) => day.date === today),
      freeMinutes: null,
      signals,
      categoryCounts: completedCategoryCounts(ideas),
    };
  }, [ideas, weatherForecast]);

  const feelingSuggestions = useMemo(
    () => rankIdeas(filterFeelingIdeas(ideasForDate(ideas, localDateString()), feelingAnswers, feelingStep), todayContext).map(({ idea }) => idea),
    [feelingAnswers, feelingStep, ideas, todayContext],
  );
  const activeIdea = ideas.find((idea) => idea.id === activeIdeaId);
  const plannedDates = useMemo(() => ideas.filter((idea) => idea.status === "planned"), [ideas]);
  const upcomingDates = useMemo(() => plannedDates.filter((date) => !date.planned_for || date.planned_for >= localDateString()).sort((first, second) =>
    (first.planned_for ?? "9999").localeCompare(second.planned_for ?? "9999") || (first.planned_start_time ?? "").localeCompare(second.planned_start_time ?? "")), [plannedDates]);
  const overdueDates = useMemo(() => plannedDates.filter((date) => date.planned_for && date.planned_for < localDateString()), [plannedDates]);
  const freeDays = useMemo(() => sharedFreeDays(workBlocks, plannedDates, commitments, trips), [commitments, plannedDates, trips, workBlocks]);
  const nextTrip = useMemo(() => {
    const today = localDateString();
    const trip = trips.filter((item) => item.start_date >= today).sort((first, second) => first.start_date.localeCompare(second.start_date))[0];
    return trip ? { title: trip.title, days: Math.round((Date.parse(`${trip.start_date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000) } : null;
  }, [trips]);
  const suggestionDay = useMemo(() => chooseSuggestionDay(freeDays), [freeDays]);
  const suggestion = useMemo(() => {
    const ranked = rankIdeas(ideasForDate(ideas, suggestionDay.key), {
      date: suggestionDay.key,
      forecast: weatherForecast.find((day) => day.date === suggestionDay.key),
      freeMinutes: workBlocks.length ? longestWindow(suggestionDay.windows) : null,
      categoryCounts: completedCategoryCounts(ideas),
      signals,
    }).slice(0, 12);
    return ranked.length ? ranked[suggestionSeed % ranked.length] : null;
  }, [ideas, signals, suggestionDay, suggestionSeed, weatherForecast, workBlocks.length]);
  const vacationRules = useMemo<VacationRules>(() => ({
    away: {
      partner_one: vacationPeriods.filter((period) => period.partner_slot === "partner_one"),
      partner_two: vacationPeriods.filter((period) => period.partner_slot === "partner_two"),
    },
    avoidMonths: Object.fromEntries(vacationProfiles.filter((profile) => profile.mode === "flexible").map((profile) => [profile.partner_slot, profile.avoid_months])),
  }), [vacationPeriods, vacationProfiles]);
  const eventOrigin: Origin | null = couple?.municipality_latitude != null && couple.municipality_longitude != null
    ? { municipality: couple.municipality, latitude: couple.municipality_latitude, longitude: couple.municipality_longitude }
    : couple?.weather_latitude != null && couple.weather_longitude != null ? { municipality: null, latitude: couple.weather_latitude, longitude: couple.weather_longitude } : null;
  const nextNearbyEvent = useMemo(() => {
    const today = localDateString();
    const weekAhead = localDateString(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    const found = eventsNear(events, eventOrigin, today).find(({ event }) => event.starts_on <= weekAhead);
    return found ? { title: found.event.title, date: found.event.starts_on < today ? today : found.event.starts_on } : null;
  }, [events, eventOrigin?.latitude, eventOrigin?.longitude, eventOrigin?.municipality]);
  const eventHorizon = useMemo(() => {
    const days = sharedFreeDays(workBlocks, plannedDates, commitments, trips, 60);
    return { free: new Set(days.filter((day) => day.dates.length === 0 && longestWindow(day.windows) >= 360).map((day) => day.key)), end: days[days.length - 1].key };
  }, [commitments, plannedDates, trips, workBlocks]);
  const deckAvailable = useMemo(() => buildDeck(ideas, votes, localDateString(), new Date()), [ideas, votes]);
  const activeIdeaWeatherAdvice = activeIdea ? activityWeatherAdvice(activeIdea, weatherForecast[0]) : null;
  const plannedDateForecast = plannedDate ? weatherForecast.find((day) => day.date === plannedDate) : undefined;
  const anniversary = couple ? nextAnniversary(couple.relationship_date) : null;
  const anniversaryGiftReminder = anniversary !== null && anniversary.days <= 30;
  const relationshipTime = couple ? relationshipDuration(couple.relationship_date) : null;
  const personalBirthdays = couple ? [
    couple.partner_one_birth_date ? { name: couple.partner_one_name, ...nextPersonalBirthday(couple.partner_one_birth_date) } : null,
    couple.partner_two_birth_date ? { name: couple.partner_two_name, ...nextPersonalBirthday(couple.partner_two_birth_date) } : null,
  ].filter((birthday): birthday is { name: string; date: string; days: number } => birthday !== null).sort((first, second) => first.days - second.days) : [];
  const mostFrequentHome = completedStats.homeByPartner.reduce<(typeof completedStats.homeByPartner)[number] | null>(
    (most, current) => current.count > (most?.count ?? 0) ? current : most,
    null,
  );

  function changeRelationshipMetric(metric: RelationshipMetric) {
    setRelationshipMetric(metric);
    window.localStorage.setItem("nossia-relationship-metric", metric);
  }

  function openCoupleProfile() {
    if (!couple) return;
    setProfilePartnerOneName(couple.partner_one_name);
    setProfilePartnerTwoName(couple.partner_two_name);
    setProfilePartnerOneBirthday(couple.partner_one_birth_date ?? "");
    setProfilePartnerTwoBirthday(couple.partner_two_birth_date ?? "");
    setProfileRelationshipDate(couple.relationship_date);
    setProfileFirstMetDate(couple.first_met_date ?? "");
    setProfileFirstMessageDate(couple.first_message_date ?? "");
    setProfileFirstDateDate(couple.first_date_date ?? "");
    setProfilePhotoError("");
    setProfileMessage("");
    setProfileSaveFailed(false);
    setModal("profile");
  }

  async function saveCoupleProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !couple) return;
    const partnerOneName = profilePartnerOneName.trim();
    const partnerTwoName = profilePartnerTwoName.trim();
    if (!partnerOneName || !partnerTwoName || !profileRelationshipDate) {
      setProfileMessage("Preencham os dois nomes e a data de namoro.");
      setProfileSaveFailed(true);
      return;
    }
    setBusy(true);
    setProfileMessage("");
    setProfileSaveFailed(false);
    const { data, error } = await supabase.from("couples").update({
      partner_one_name: partnerOneName,
      partner_two_name: partnerTwoName,
      partner_one_birth_date: profilePartnerOneBirthday || null,
      partner_two_birth_date: profilePartnerTwoBirthday || null,
      relationship_date: profileRelationshipDate,
      first_met_date: profileFirstMetDate || null,
      first_message_date: profileFirstMessageDate || null,
      first_date_date: profileFirstDateDate || null,
    }).eq("id", couple.id).select("*").single();
    if (error) {
      setProfileMessage(`Não foi possível guardar o perfil: ${error.message}`);
      setProfileSaveFailed(true);
      setBusy(false);
      return;
    }
    setCouple(data as Couple);
    setProfileMessage("Perfil atualizado.");
    setBusy(false);
  }

  async function uploadCouplePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || !supabase || !couple) return;
    setProfilePhotoError("");
    const extensions: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const extension = extensions[file.type];
    if (!extension) {
      setProfilePhotoError("Escolham uma imagem JPG, PNG, WEBP ou GIF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setProfilePhotoError("A imagem tem de ter no máximo 10 MB.");
      return;
    }
    const newPath = `${couple.id}/profile/${crypto.randomUUID()}.${extension}`;
    const previousPath = couple.couple_photo_path;
    setBusy(true);
    const { error: uploadError } = await supabase.storage.from("date-photos").upload(newPath, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) {
      setProfilePhotoError(`Não foi possível carregar a foto: ${uploadError.message}`);
      setBusy(false);
      return;
    }
    const { data: updatedProfile, error: updateError } = await supabase.from("couples")
      .update({ couple_photo_path: newPath })
      .eq("id", couple.id)
      .select("*")
      .single();
    if (updateError) {
      const { error: cleanupError } = await supabase.storage.from("date-photos").remove([newPath]);
      setProfilePhotoError(`Não foi possível guardar a foto no perfil: ${updateError.message}${cleanupError ? ` A limpeza do ficheiro também falhou: ${cleanupError.message}` : ""}`);
      setBusy(false);
      return;
    }
    setCouple(updatedProfile as Couple);
    const { data: signedPhoto, error: signedPhotoError } = await supabase.storage.from("date-photos").createSignedUrl(newPath, 60 * 60);
    if (signedPhotoError) {
      setCouplePhotoUrl(null);
      setProfilePhotoError(`A foto foi guardada, mas não foi possível mostrá-la: ${signedPhotoError.message}`);
    } else {
      setCouplePhotoUrl(signedPhoto.signedUrl);
    }
    if (previousPath) {
      const { error: removeError } = await supabase.storage.from("date-photos").remove([previousPath]);
      if (removeError) {
        setProfilePhotoError(`A nova foto foi guardada, mas não foi possível remover a anterior: ${removeError.message}`);
      }
    }
    setBusy(false);
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
      setImportError(translateImportMessage(caught instanceof Error ? caught.message : "The file could not be read."));
    }
  }

  function downloadImportTemplate() {
    const csv = "title,description,mood,duration_minutes,budget_eur,at_home,travel_minutes,category,weather_setting,emoji\r\nPicnic in the park,Pack a simple picnic and enjoy the afternoon outdoors,Relaxing,120,20,false,20,Relaxing,outdoor,🧺\r\n";
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
        setImportError("Apenas administradores podem carregar ideias predefinidas.");
        setBusy(false);
        return;
      }
      const templates: Idea[] = [];
      for (let offset = 0; offset < importPreview.valid.length; offset += 250) {
        const batch = importPreview.valid.slice(offset, offset + 250);
        const { data, error } = await supabase.from("ideas")
          .upsert(batch, { onConflict: "created_by_couple_id,title,description", ignoreDuplicates: true })
          .select("*");
        if (error) {
          setImportError(`${templates.length} ideias foram adicionadas ao catálogo antes de ocorrer um erro: ${error.message}`);
          setBusy(false);
          return;
        }
        templates.push(...data as Idea[]);
      }
      setCatalog((current) => [...current, ...templates]);
      const skipped = importPreview.invalid.length;
      setImportMessage(`${templates.length} novas ideias predefinidas adicionadas para todos os casais${skipped ? `; ${skipped} linhas inválidas ignoradas` : ""}.`);
      setImportPreview(null);
      setBusy(false);
      return;
    }
    const { data, error } = await supabase.from("ideas")
      .upsert(importPreview.valid.map((idea) => ({ ...idea, created_by_couple_id: couple.id })), { onConflict: "created_by_couple_id,title,description", ignoreDuplicates: true })
      .select("*");
    if (error) {
      setImportError(`Não foi possível importar as ideias: ${error.message}`);
      setBusy(false);
      return;
    }
    setCatalog((current) => [...current, ...data as Idea[]]);
    const skipped = importPreview.invalid.length;
    setImportMessage(`${data.length} ${data.length === 1 ? "ideia importada" : "ideias importadas"}${skipped ? `; ${skipped} linhas inválidas ignoradas` : ""}.`);
    setImportPreview(null);
    setBusy(false);
  }

  useEffect(() => {
    document.documentElement.lang = "pt-PT";
  }, []);

  useEffect(() => {
    setVisibleIdeaLimit(60);
  }, [category, search, view]);

  function startAnniversaryPlanning() {
    if (!anniversary) return;
    setAnniversaryPlanDate(anniversary.date);
    setFeelingAnswers({ activity: "Surprise me", special: true, duration: "4", budget: "4", distance: "4", avoid: "" });
    setFeelingStep(0);
    setCategory("All");
    navigateView("discover");
    setDiscoveryMode("feeling");
    setDrawMessage("");
    setModal("feeling");
  }

  function drawRandomIdea(startNewRound = false, selectedCategory: Activity | "All" = category) {
    const categoryIdeas = ideasForDate(ideas, localDateString()).filter((idea) => selectedCategory === "All" || activityOf(idea) === selectedCategory);
    const availableIdeas = categoryIdeas;
    const previousDraws = startNewRound ? [] : drawnIdeaIds;
    const drawCount = startNewRound ? 0 : randomDrawCount;
    if (drawCount >= 3) {
      setDrawMessage("Já usaram os três sorteios. Escolham uma das ideias anteriores ou experimentem o modo feeling.");
      return;
    }
    if (availableIdeas.length === 0) {
      setActiveIdeaId(null);
      setDrawMessage(selectedCategory === "All"
        ? "Não há mais ideias novas para sortear. Adicionem uma ideia ou escolham um date anterior para repetir."
        : `Não há ideias de ${activityLabel(selectedCategory).toLocaleLowerCase("pt-PT")} disponíveis para sortear.`);
      setDiscoveryMode("random");
      setDrawnIdeaIds([]);
      setRandomDrawCount(0);
      setModal("draw");
      return;
    }

    const unseenIdeas = availableIdeas.filter((idea) => !previousDraws.includes(idea.id));
    const pool = unseenIdeas.length > 0 ? unseenIdeas : availableIdeas;
    const pickedIdea = pickWeighted(rankIdeas(pool, todayContext)).idea;
    setActiveIdeaId(pickedIdea.id);
    setDrawnIdeaIds(unseenIdeas.length > 0 || previousDraws.length === 0 ? [...previousDraws, pickedIdea.id] : previousDraws);
    setRandomDrawCount(drawCount + 1);
    setDiscoveryMode("random");
    setDrawMessage(unseenIdeas.length === 0 && previousDraws.length > 0 ? "Já viram todas as ideias diferentes. Aqui vai mais um sorteio!" : "");
    setModal("draw");
  }

  function beginFeeling() {
    if (!anniversaryPlanDate) {
      setFeelingAnswers({ activity: "Surprise me", duration: "4", budget: "4", distance: "4", avoid: "" });
    }
    setFeelingStep(0);
    setDiscoveryMode("feeling");
    setDrawMessage("");
    setModal("feeling");
  }

  function chooseFeelingSuggestion(ideaId: string) {
    const pickedIdea = feelingSuggestions.find((idea) => idea.id === ideaId);
    if (!pickedIdea) return;
    setActiveIdeaId(pickedIdea.id);
    setDrawMessage("");
    setDiscoveryMode("feeling");
    setModal("draw");
  }

  async function updateDate(id: string, patch: Partial<DateDetails> & { status?: CoupleDate["status"] }): Promise<boolean> {
    if (!supabase) return false;
    setBusy(true);
    setDataError("");
    const { data, error } = await supabase.from("couple_dates").update(patch).eq("id", id).select("*").single();
    if (error) setDataError(`Não foi possível guardar as alterações: ${error.message}`);
    else setDates((current) => current.map((date) => date.id === id ? data as CoupleDate : date));
    setBusy(false);
    return !error;
  }

  async function createDate(ideaId: string, details: Partial<DateDetails>): Promise<boolean> {
    if (!supabase || !couple) return false;
    setBusy(true);
    setDataError("");
    const { data, error } = await supabase.from("couple_dates")
      .insert({ ...details, couple_id: couple.id, idea_id: ideaId, status: "planned" })
      .select("*")
      .single();
    if (error) setDataError(`Não foi possível planear o date: ${error.message}`);
    else setDates((current) => [...current, data as CoupleDate]);
    setBusy(false);
    return !error;
  }

  const saveWeatherLocation = useCallback(async (name: string, latitude: number, longitude: number) => {
    if (!supabase || !couple) return false;
    setBusy(true);
    setDataError("");
    const { data, error } = await supabase.from("couples")
      .update({ weather_location_name: name, weather_latitude: latitude, weather_longitude: longitude })
      .eq("id", couple.id)
      .select("*")
      .single();
    if (error) {
      setDataError(`Não foi possível guardar a localização meteorológica: ${error.message}`);
      setBusy(false);
      return false;
    }
    setCouple(data as Couple);
    setBusy(false);
    return true;
  }, [couple]);

  const onWeatherConditionChange = useCallback((condition: WeatherCondition) => {
    setWeatherCondition(condition);
  }, []);

  const onWeatherForecastChange = useCallback((forecast: DailyWeather[]) => {
    setWeatherForecast(forecast);
  }, []);

  async function toggleFavorite(id: string) {
    const idea = ideas.find((item) => item.id === id);
    if (!idea || !supabase || !couple) return;
    setBusy(true);
    setDataError("");
    const { error } = idea.favorite
      ? await supabase.from("couple_idea_favorites").delete().eq("couple_id", couple.id).eq("idea_id", idea.idea_id)
      : await supabase.from("couple_idea_favorites").insert({ couple_id: couple.id, idea_id: idea.idea_id });
    if (error) {
      setDataError(`Não foi possível atualizar os favoritos: ${error.message}`);
    } else {
      setFavoriteIdeaIds((current) => {
        const next = new Set(current);
        if (idea.favorite) next.delete(idea.idea_id);
        else next.add(idea.idea_id);
        return next;
      });
    }
    setBusy(false);
  }

  function openPlan(idea: DateIdea) {
    setAnniversaryPlanDate(null);
    setActiveIdeaId(idea.id);
    setEditingPlan(false);
    setRepeatIdea(idea.status === "completed");
    setPlannedDate("");
    setPlannedTime("");
    const homePartner = idea.status === "completed" ? idea.home_partner : null;
    const partnerName = homePartner === "partner_one" ? couple?.partner_one_name : homePartner === "partner_two" ? couple?.partner_two_name : null;
    setPlannedLocation(homePartner && partnerName ? `Casa de ${partnerName}` : idea.status === "completed" ? idea.location_name ?? "" : "");
    setPlannedLatitude(idea.status === "completed" ? idea.latitude : null);
    setPlannedLongitude(idea.status === "completed" ? idea.longitude : null);
    setPlannedHomePartner(homePartner);
    setModal("plan");
  }

  function openEditPlan(idea: DateIdea) {
    setAnniversaryPlanDate(null);
    setActiveIdeaId(idea.id);
    setEditingPlan(true);
    setRepeatIdea(false);
    setPlannedDate(idea.planned_for ?? "");
    setPlannedTime(idea.planned_start_time?.slice(0, 5) ?? "");
    setPlannedLocation(idea.location_name ?? "");
    setPlannedLatitude(idea.latitude);
    setPlannedLongitude(idea.longitude);
    setPlannedHomePartner(idea.home_partner);
    setModal("plan");
  }

  function openEditIdea(idea: DateIdea) {
    setEditingIdeaId(idea.idea_id);
    setNewTitle(idea.title);
    setNewDescription(idea.description);
    setNewActivity(activityOf(idea));
    setNewSpecial(isSpecial(idea));
    setNewDuration(String(idea.duration_minutes ?? 60));
    setNewBudget(String(idea.budget_eur ?? 0));
    setNewTravel(idea.travel_minutes === null ? "" : String(idea.travel_minutes));
    setNewAtHome(idea.at_home);
    setNewWeatherSetting(idea.weather_setting);
    setModal("edit");
  }

  function openNewIdea() {
    setEditingIdeaId(null);
    setNewTitle("");
    setNewDescription("");
    setNewActivity("comer");
    setNewSpecial(false);
    setNewDuration("120");
    setNewBudget("30");
    setNewTravel("");
    setNewAtHome(false);
    setNewWeatherSetting("any");
    setModal("new");
  }

  async function deleteActiveIdea() {
    if (!activeIdea || !supabase) return;
    setBusy(true);
    setDataError("");
    if (activeIdea.status === "idea") {
      const { error } = await supabase.from("ideas").delete().eq("id", activeIdea.idea_id);
      if (error) setDataError(`Não foi possível apagar a ideia: ${error.message}`);
      else {
        setCatalog((current) => current.filter((idea) => idea.id !== activeIdea.idea_id));
        setModal(null);
        setActiveIdeaId(null);
      }
      setBusy(false);
      return;
    }
    const relatedPhotos = photos.filter((photo) => photo.date_id === activeIdea.id);
    const { error } = await supabase.from("couple_dates").delete().eq("id", activeIdea.id);
    if (error) {
      setDataError(`Não foi possível apagar o date: ${error.message}`);
      setBusy(false);
      return;
    }
    setDates((current) => current.filter((date) => date.id !== activeIdea.id));
    setPhotos((current) => current.filter((photo) => photo.date_id !== activeIdea.id));
    setModal(null);
    setActiveIdeaId(null);
    if (relatedPhotos.length) {
      const { error: storageError } = await supabase.storage.from("date-photos").remove(relatedPhotos.map((photo) => photo.storage_path));
      if (storageError) setDataError(`O date foi apagado, mas não foi possível remover algumas fotografias do armazenamento: ${storageError.message}`);
    }
    setBusy(false);
  }

  async function planForToday(idea: DateIdea) {
    if (idea.status !== "idea") return;
    const saved = await createDate(idea.idea_id, { planned_for: localDateString() });
    if (saved) {
      setAnniversaryPlanDate(null);
      setModal(null);
      setActiveIdeaId(null);
      navigateView("planned");
    }
  }

  async function planForAnniversary(idea: DateIdea) {
    if (!anniversaryPlanDate || idea.status !== "idea") return;
    const saved = await createDate(idea.idea_id, { planned_for: anniversaryPlanDate });
    if (saved) {
      setAnniversaryPlanDate(null);
      setModal(null);
      setActiveIdeaId(null);
      navigateView("planned");
    }
  }

  async function savePlan() {
    const currentIdea = ideas.find((idea) => idea.id === activeIdeaId);
    if (!currentIdea) return;
    const details = {
      planned_for: plannedDate || null,
      planned_start_time: plannedTime || null,
      location_name: plannedLocation.trim() || null,
      latitude: plannedLatitude,
      longitude: plannedLongitude,
      home_partner: plannedHomePartner,
    };
    const saved = editingPlan ? await updateDate(currentIdea.id, details) : await createDate(currentIdea.idea_id, details);
    if (!saved) return;
    setEditingPlan(false);
    setModal(null);
    setActiveIdeaId(null);
    setRepeatIdea(false);
    navigateView("planned");
  }

  // The last thing watched for this idea, so carrying on with a series is one tap.
  function lastWatched(ideaId: string) {
    return [...dates].filter((date) => date.idea_id === ideaId && date.watched_title).sort((first, second) => (second.completed_at ?? "").localeCompare(first.completed_at ?? ""))[0]?.watched_title ?? "";
  }

  function openEditMemory(idea: DateIdea) {
    setActiveIdeaId(idea.id);
    setEditingMemory(true);
    setMemoryDate(idea.completed_at ?? localDateString());
    setMemoryNote(idea.memory ?? "");
    setMemoryRepeat(idea.would_repeat);
    setMemoryWatched(idea.watched_title ?? "");
    setMemoryFood(idea.food_notes ?? "");
    setMemoryHomePartner(idea.home_partner);
    setLocationName(idea.location_name ?? "");
    setLocationLatitude(idea.latitude);
    setLocationLongitude(idea.longitude);
    setModal("memory");
  }

  async function markCompleted(id: string) {
    const idea = ideas.find((item) => item.id === id);
    const today = localDateString();
    setActiveIdeaId(id);
    setEditingMemory(false);
    setMemoryDate(idea?.planned_for && idea.planned_for < today ? idea.planned_for : today);
    setMemoryNote("");
    setMemoryRepeat(null);
    setMemoryWatched(idea ? idea.watched_title || lastWatched(idea.idea_id) : "");
    setMemoryFood("");
    setMemoryHomePartner(idea?.home_partner ?? null);
    setLocationName(idea?.home_partner
      ? `Casa de ${idea.home_partner === "partner_one" ? couple?.partner_one_name : couple?.partner_two_name}`
      : idea?.location_name || (idea && !idea.at_home && memoryKind(idea.title, idea.category, false) === "food" ? placeFromTitle(idea.title) : ""));
    setLocationLatitude(idea?.latitude ?? null);
    setLocationLongitude(idea?.longitude ?? null);
    setModal("memory");
  }

  // A restaurant typed by hand joins the couple's places, or matches one they already have.
  async function findOrCreatePlace(name: string, title: string) {
    if (!supabase || !couple) return null;
    const { data, error } = await supabase.from("couple_places").select("*");
    if (error) {
      setDataError(`Não foi possível guardar o sítio: ${error.message}`);
      return null;
    }
    const found = (data as CouplePlace[]).find((place) => plain(place.name) === plain(name));
    if (found) return found.id;
    const { data: created, error: createError } = await supabase.from("couple_places").insert({
      couple_id: couple.id,
      place_ref: `manual:${plain(name)}`,
      name,
      latitude: locationLatitude,
      longitude: locationLongitude,
      kind: placeKindFromTitle(title),
    }).select("*").single();
    if (createError) {
      setDataError(`Não foi possível guardar o sítio: ${createError.message}`);
      return null;
    }
    return (created as CouplePlace).id;
  }

  async function saveMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeIdeaId) return;
    const current = ideas.find((idea) => idea.id === activeIdeaId);
    const placeName = locationName.trim();
    const atRestaurant = Boolean(current && !current.at_home && !memoryHomePartner && memoryKind(current.title, current.category, Boolean(current.place_id)) === "food");
    let placeId = current?.place_id ?? null;
    if (current && atRestaurant) {
      const samePlace = placeId !== null && plain(placeName) === plain(current.location_name ?? "");
      if (!placeName) placeId = null;
      else if (!samePlace && memoryRepeat !== null) placeId = await findOrCreatePlace(placeName, current.title) ?? placeId;
    }
    const saved = await updateDate(activeIdeaId, {
      place_id: placeId,
      status: "completed",
      completed_at: memoryDate || localDateString(),
      planned_for: null,
      memory: memoryNote.trim() || null,
      would_repeat: memoryRepeat,
      watched_title: memoryWatched.trim() || null,
      food_notes: memoryFood.trim() || null,
      location_name: locationName.trim() || null,
      latitude: locationLatitude,
      longitude: locationLongitude,
      home_partner: memoryHomePartner,
    });
    if (!saved) return;
    // What they thought of the date is what they think of the place.
    if (supabase && placeId && memoryRepeat !== null) {
      const { error } = await supabase.from("couple_places").update({ verdict: memoryRepeat ? "liked" : "no" }).eq("id", placeId);
      if (error) setDataError(`Não foi possível atualizar o sítio: ${error.message}`);
    }
    setModal(null);
    setActiveIdeaId(null);
    if (!editingMemory) navigateView("memories");
    setEditingMemory(false);
  }

  async function undoCompleted() {
    const current = ideas.find((idea) => idea.id === activeIdeaId);
    if (!current) return;
    const saved = await updateDate(current.id, { status: "planned", planned_for: current.completed_at && current.completed_at > localDateString() ? current.completed_at : localDateString(), completed_at: null });
    if (!saved) return;
    setModal(null);
    setActiveIdeaId(null);
    setEditingMemory(false);
    navigateView("planned");
  }

  async function openAlbum(idea: DateIdea) {
    setActiveIdeaId(idea.id);
    setPhotoError("");
    setModal("album");
    const ideaPhotos = photos.filter((photo) => photo.date_id === idea.id);
    if (ideaPhotos.length === 0 || !supabase) return;
    setBusy(true);
    const { data, error } = await supabase.storage.from("date-photos")
      .createSignedUrls(ideaPhotos.map((photo) => photo.storage_path), 3600);
    if (error) {
      setPhotoError(`Não foi possível abrir as fotografias: ${error.message}`);
    } else {
      if (data.some((photo) => !photo.signedUrl)) {
        setPhotoError("Não foi possível criar uma ligação para ver uma ou mais fotografias do álbum.");
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
        setPhotoError(`${file.name} não é um formato de imagem suportado. Escolha ficheiros JPG, PNG, WEBP ou GIF.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setPhotoError(`${file.name} excede o limite de 10 MB.`);
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
        setPhotoError(`Não foi possível carregar ${file.name}: ${uploadError.message}`);
        continue;
      }

      const { data: photo, error: photoError } = await supabase.from("date_photos").insert({
        couple_id: couple.id,
        date_id: activeIdeaId,
        storage_path: storagePath,
      }).select("*").single();
      if (photoError) {
        const { error: cleanupError } = await supabase.storage.from("date-photos").remove([storagePath]);
        setPhotoError(cleanupError
          ? `Não foi possível guardar ${file.name} no álbum (${photoError.message}) nem remover o ficheiro carregado (${cleanupError.message}).`
          : `Não foi possível guardar ${file.name} no álbum: ${photoError.message}`);
        continue;
      }

      const { data: signedPhoto, error: signedPhotoError } = await supabase.storage.from("date-photos").createSignedUrl(storagePath, 3600);
      if (signedPhotoError) {
        setPhotoError(`A fotografia foi carregada, mas não foi possível apresentá-la: ${signedPhotoError.message}`);
      }
      uploadedPhotos.push({ ...photo, signed_url: signedPhoto?.signedUrl ?? null } as DatePhoto);
    }

    if (uploadedPhotos.length) setPhotos((current) => [...current, ...uploadedPhotos]);
    setBusy(false);
  }

  async function savePinnedLocation() {
    if (!activeIdeaId || !locationName.trim() || locationLatitude === null || locationLongitude === null) {
      setDataError("Pesquise um local e escolha um resultado antes de guardar a localização no mapa.");
      return;
    }
    const saved = await updateDate(activeIdeaId, {
      location_name: locationName.trim(),
      latitude: locationLatitude,
      longitude: locationLongitude,
      home_partner: null,
    });
    if (saved) {
      setModal(null);
      setActiveIdeaId(null);
    }
  }

  function editCompletedHomeLocation(idea: DateIdea) {
    setActiveIdeaId(idea.id);
    setMemoryHomePartner(idea.home_partner);
    setModal("home-location");
  }

  async function saveCompletedHomeLocation() {
    if (!activeIdeaId || !couple) return;
    const partnerName = memoryHomePartner === "partner_one"
      ? couple.partner_one_name
      : memoryHomePartner === "partner_two"
        ? couple.partner_two_name
        : null;
    const saved = await updateDate(activeIdeaId, {
      home_partner: memoryHomePartner,
      location_name: partnerName
        ? `Casa de ${partnerName}`
        : null,
      latitude: null,
      longitude: null,
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
    if (!title || !Number.isInteger(durationMinutes) || durationMinutes <= 0 || !Number.isFinite(budgetEuros) || budgetEuros < 0 || (travelMinutes !== null && (!Number.isInteger(travelMinutes) || travelMinutes < 0))) return;
    const ideaFields = {
      title,
      description,
      ...legacyFields(newActivity, newSpecial),
      activity: newActivity,
      special: newSpecial,
      duration: `${durationMinutes >= 240 ? "4+" : durationMinutes / 60} hour${durationMinutes === 60 ? "" : "s"}`,
      duration_minutes: durationMinutes,
      budget: budgetEuros === 0 ? "Free" : `€${budgetEuros > 10 ? "€" : ""}${budgetEuros > 30 ? "€" : ""}`,
      budget_eur: budgetEuros,
      travel_minutes: travelMinutes,
      at_home: newAtHome,
      weather_setting: newAtHome ? "indoor" : newWeatherSetting,
    };
    setBusy(true);
    setDataError("");
    const { data, error } = editingIdeaId
      ? await supabase.from("ideas").update(ideaFields).eq("id", editingIdeaId).select("*").single()
      : await supabase.from("ideas").insert({ ...ideaFields, created_by_couple_id: couple.id, emoji: "💌" }).select("*").single();
    if (error) {
      setDataError(editingIdeaId
        ? `Não foi possível guardar as alterações: ${error.message}`
        : `Não foi possível adicionar a ideia: ${error.message}`);
      setBusy(false);
      return;
    }
    const savedIdea = data as Idea;
    setCatalog((current) => editingIdeaId ? current.map((idea) => idea.id === savedIdea.id ? savedIdea : idea) : [...current, savedIdea]);
    setModal(null);
    setEditingIdeaId(null);
    navigateView("discover");
    setCategory("All");
    setBusy(false);
  }

  // Reuses an idea with the same title, or keeps the words as a private idea with guessed details.
  async function findOrCreateIdea(title: string, details?: Partial<ReturnType<typeof guessIdea>>) {
    if (!supabase || !couple) return null;
    const normalized = title.toLocaleLowerCase("pt-PT");
    const existing = catalog.find((idea) => idea.title.trim().toLocaleLowerCase("pt-PT") === normalized);
    if (existing) return existing.id;
    const guess = { ...guessIdea(title), ...details };
    setBusy(true);
    setDataError("");
    const { data, error } = await supabase.from("ideas").insert({
      created_by_couple_id: couple.id,
      title,
      description: "",
      category: guess.category,
      mood: guess.mood,
      duration: durationLabel(guess.durationMinutes),
      duration_minutes: guess.durationMinutes,
      budget: "A definir",
      emoji: guess.emoji,
      at_home: guess.atHome,
      travel_minutes: guess.atHome ? 0 : null,
      weather_setting: guess.weatherSetting,
      repeatable: guess.repeatable,
    }).select("*").single();
    setBusy(false);
    if (error) {
      setDataError(`Não foi possível guardar a ideia: ${error.message}`);
      return null;
    }
    setCatalog((current) => [...current, data as Idea]);
    return (data as Idea).id;
  }

  async function quickAdd(value: QuickAddValue) {
    if (!supabase || !couple) return false;
    if (value.kind === "commitment") {
      if (!value.date) return false;
      setBusy(true);
      setDataError("");
      const { data, error } = await supabase.from("couple_commitments").insert({
        couple_id: couple.id,
        title: value.title,
        event_date: value.date,
        starts_at: value.startTime,
        ends_at: value.endTime,
        for_partner: value.forPartner,
      }).select("*").single();
      setBusy(false);
      if (error) {
        setDataError(`Não foi possível guardar o compromisso: ${error.message}`);
        return false;
      }
      setCommitments((current) => [...current, data as CoupleCommitment]);
      return true;
    }
    const exact = catalog.some((idea) => plain(idea.title) === plain(value.title));
    const sharedWatching = value.kind !== "idea" && !exact && isWatchingAtHome(value.title) ? catalog.find((idea) => idea.title === watchingIdeaTitle) : undefined;
    const ideaId = sharedWatching?.id ?? await findOrCreateIdea(value.title);
    if (!ideaId) return false;
    if (value.kind === "idea") return true;
    if (value.kind === "done") {
      const { data, error } = await supabase.from("couple_dates").insert({ couple_id: couple.id, idea_id: ideaId, status: "completed", completed_at: value.date ?? localDateString() }).select("*").single();
      if (error) {
        setDataError(`Não foi possível guardar: ${error.message}`);
        return false;
      }
      const saved = data as CoupleDate;
      setDates((current) => [...current, saved]);
      setActiveIdeaId(saved.id);
      setEditingMemory(true);
      setMemoryDate(saved.completed_at ?? localDateString());
      setMemoryNote("");
      setMemoryRepeat(null);
      setMemoryWatched((sharedWatching ? watchedName(value.title) : "") || lastWatched(ideaId));
      setMemoryFood("");
      setMemoryHomePartner(null);
      setLocationName(memoryKind(value.title, "", false) === "food" ? placeFromTitle(value.title) : "");
      setLocationLatitude(null);
      setLocationLongitude(null);
      setQuickAddOpen(false);
      setModal("memory");
      return true;
    }
    return value.date ? createDate(ideaId, { planned_for: value.date, planned_start_time: value.startTime, watched_title: sharedWatching ? watchedName(value.title) || null : null }) : false;
  }

  async function planAtPlace(place: PlaceToPlan, date: string, time: string) {
    const ideaId = await findOrCreateIdea(place.name, { category: "Food & drink", emoji: place.kind === "cafe" ? "☕" : place.kind === "bar" ? "🍸" : "🍽️", weatherSetting: "indoor", durationMinutes: place.kind === "cafe" ? 75 : 120 });
    if (!ideaId) return false;
    return createDate(ideaId, { planned_for: date, planned_start_time: time || null, location_name: place.name, latitude: place.latitude, longitude: place.longitude, place_id: place.placeId });
  }

  async function updateCommitment(id: string, patch: Partial<CoupleCommitment>) {
    if (!supabase) return false;
    const { data, error } = await supabase.from("couple_commitments").update(patch).eq("id", id).select("*").single();
    if (error) {
      setDataError(`Não foi possível guardar o compromisso: ${error.message}`);
      return false;
    }
    setCommitments((current) => current.map((commitment) => commitment.id === id ? data as CoupleCommitment : commitment));
    return true;
  }

  async function removeCommitment(id: string) {
    if (!supabase) return;
    const { error } = await supabase.from("couple_commitments").delete().eq("id", id);
    if (error) setDataError(`Não foi possível apagar o compromisso: ${error.message}`);
    else setCommitments((current) => current.filter((commitment) => commitment.id !== id));
  }

  function openIdeaDetails(title: string) {
    setQuickAddOpen(false);
    openNewIdea();
    setNewTitle(title);
  }

  async function createPartnerInvite() {
    if (!supabase) return;
    setBusy(true);
    setInviteError("");
    const { data, error } = await supabase.rpc("create_couple_invite");
    if (error) setInviteError(`Não foi possível criar o convite: ${error.message}`);
    else setInviteLink(`${window.location.origin}/join/${data as string}`);
    setBusy(false);
  }

  async function copyPartnerInvite() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteError("");
    } catch {
      setInviteError("Não foi possível copiar. Selecionem a ligação e copiem-na manualmente.");
    }
  }

  useEffect(() => {
    if (!supabase || !couple) return;
    let active = true;
    void Promise.all([
      supabase.from("couple_mascots").select("*"),
      supabase.from("couple_members").select("user_id"),
    ]).then(([mascotResult, memberResult]) => {
      if (!active) return;
      if (mascotResult.error) {
        setDataError(`Não foi possível carregar as mascotes: ${mascotResult.error.message}`);
        return;
      }
      setPartnerJoined((memberResult.data ?? []).length >= 2);
      setMascots(mascotResult.data as Mascot[]);
    });
    return () => { active = false; };
  }, [couple?.id, syncTick]);

  // Each phone listens for the couple's change signal and reloads once, however many arrive.
  useEffect(() => {
    if (!supabase || !couple?.id || !session) return;
    const client = supabase;
    const currentSession = session;
    let timer: number | undefined;
    const reload = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void loadCoupleData(currentSession);
        setSyncTick((tick) => tick + 1);
      }, syncDelayMs);
    };
    const channel = client.channel(`couple-sync-${couple.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "couple_sync", filter: `couple_id=eq.${couple.id}` }, (payload) => {
        if ((payload.new as { changed_by?: string | null }).changed_by !== currentSession.user.id) reload();
      })
      .subscribe();
    const onVisible = () => {
      if (document.visibilityState === "visible" && loadedUser.current && Date.now() - loadedUser.current.at > backgroundRefreshAfterMs) reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      void client.removeChannel(channel);
    };
  }, [couple?.id, session?.user.id, loadCoupleData]);

  const loadSignals = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.rpc("couple_idea_signals");
    if (data) setSignals(data as CoupleSignals);
  }, []);

  useEffect(() => {
    if (!supabase || !couple?.id) return;
    let active = true;
    void supabase.from("idea_votes").select("idea_id, vote, updated_at").then(({ data, error }) => {
      if (!active) return;
      if (error) setDataError(`Não foi possível carregar as tuas escolhas: ${error.message}`);
      else setVotes(data as Vote[]);
    });
    void loadSignals();
    return () => { active = false; };
  }, [couple?.id, syncTick, loadSignals]);

  useEffect(() => {
    if (!supabase || !couple?.id) return;
    let active = true;
    void supabase.from("events").select("*").eq("status", "approved").gte("ends_on", localDateString()).order("starts_on").then(({ data }) => {
      if (active && data) setEvents(data as LocalEvent[]);
    });
    return () => { active = false; };
  }, [couple?.id, syncTick]);

  useEffect(() => {
    if (!supabase || !couple?.id) return;
    let active = true;
    void Promise.all([
      supabase.from("vacation_profiles").select("*"),
      supabase.from("vacation_periods").select("*").order("starts_on"),
    ]).then(([profiles, periods]) => {
      if (!active) return;
      if (profiles.data) setVacationProfiles(profiles.data as VacationProfile[]);
      if (periods.data) setVacationPeriods(periods.data as VacationPeriod[]);
    });
    return () => { active = false; };
  }, [couple?.id, syncTick]);

  async function saveVacationProfile(patch: Pick<VacationProfile, "mode" | "days_per_year" | "avoid_months">) {
    if (!supabase || !couple || !session || !mySlot) return false;
    const row = { user_id: session.user.id, couple_id: couple.id, partner_slot: mySlot, ...patch, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("vacation_profiles").upsert(row, { onConflict: "user_id" }).select("*").single();
    if (error) {
      setDataError(`Não foi possível guardar as férias: ${error.message}`);
      return false;
    }
    setVacationProfiles((current) => [...current.filter((item) => item.user_id !== session.user.id), data as VacationProfile]);
    return true;
  }

  async function addVacationPeriod(start: string, end: string) {
    if (!supabase || !couple || !session || !mySlot) return false;
    const { data, error } = await supabase.from("vacation_periods").insert({ user_id: session.user.id, couple_id: couple.id, partner_slot: mySlot, starts_on: start, ends_on: end }).select("*").single();
    if (error) {
      setDataError(`Não foi possível guardar as férias: ${error.message}`);
      return false;
    }
    setVacationPeriods((current) => [...current, data as VacationPeriod].sort((first, second) => first.starts_on.localeCompare(second.starts_on)));
    return true;
  }

  async function removeVacationPeriod(id: string) {
    if (!supabase) return;
    const { error } = await supabase.from("vacation_periods").delete().eq("id", id);
    if (error) setDataError(`Não foi possível apagar: ${error.message}`);
    else setVacationPeriods((current) => current.filter((period) => period.id !== id));
  }

  async function saveMunicipality(name: string) {
    if (!supabase || !couple) return false;
    const trimmed = name.trim();
    let position = { municipality_latitude: null as number | null, municipality_longitude: null as number | null };
    if (trimmed) {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=pt&accept-language=pt-PT&q=${encodeURIComponent(trimmed)}`);
        const [match] = response.ok ? await response.json() as Array<{ lat: string; lon: string }> : [];
        if (!match) {
          setDataError(`Não encontrámos “${trimmed}”. Experimentem o nome do concelho, por exemplo Guimarães.`);
          return false;
        }
        position = { municipality_latitude: Number(match.lat), municipality_longitude: Number(match.lon) };
      } catch {
        setDataError("Sem ligação para encontrar o concelho. Tentem outra vez.");
        return false;
      }
    }
    const patch = { municipality: trimmed || null, ...position };
    const { error } = await supabase.from("couples").update(patch).eq("id", couple.id);
    if (error) {
      setDataError(`Não foi possível guardar o concelho: ${error.message}`);
      return false;
    }
    setCouple({ ...couple, ...patch });
    return true;
  }

  async function planEvent(event: LocalEvent, date: string) {
    const ideaId = await findOrCreateIdea(event.title, { category: event.category, emoji: "🎟️", weatherSetting: event.indoor ? "indoor" : "outdoor" });
    if (!ideaId) return false;
    return createDate(ideaId, {
      planned_for: date,
      planned_start_time: event.start_time,
      location_name: [event.venue, event.municipality].filter(Boolean).join(", ") || null,
      latitude: event.latitude,
      longitude: event.longitude,
      event_id: event.id,
    });
  }

  async function createTripFor(title: string, start: string, end: string) {
    if (!supabase || !couple) return false;
    const { data, error } = await supabase.from("couple_trips").insert({ couple_id: couple.id, title, start_date: start, end_date: end }).select("*").single();
    if (error) {
      setDataError(`Não foi possível criar a viagem: ${error.message}`);
      return false;
    }
    setTrips((current) => [...current, data as CoupleTrip]);
    return true;
  }

  async function planEventTrip(event: LocalEvent, date: string) {
    if (!supabase || !couple) return false;
    const next = new Date(`${date}T12:00:00`);
    next.setDate(next.getDate() + 1);
    const end = localDateString(next);
    const { data, error } = await supabase.from("couple_trips").insert({ couple_id: couple.id, title: event.municipality || event.title, start_date: date, end_date: end }).select("*").single();
    if (error) {
      setDataError(`Não foi possível criar a viagem: ${error.message}`);
      return false;
    }
    const trip = data as CoupleTrip;
    const { error: itemError } = await supabase.from("trip_items").insert({ trip_id: trip.id, couple_id: couple.id, title: `${event.title}${event.start_time ? ` às ${event.start_time.slice(0, 5)}` : ""}`, day: date });
    if (itemError) setDataError(`A viagem foi criada, mas não foi possível juntar o evento ao plano: ${itemError.message}`);
    setTrips((current) => [...current, trip]);
    navigateView("trips");
    return true;
  }

  async function saveVote(idea: DateIdea, vote: "like" | "pass") {
    if (!supabase || !couple || !session) return false;
    const updated_at = new Date().toISOString();
    const { error } = await supabase.from("idea_votes").upsert({ user_id: session.user.id, couple_id: couple.id, idea_id: idea.idea_id, vote, updated_at }, { onConflict: "user_id,idea_id" });
    if (error) return false;
    setVotes((current) => [...current.filter((item) => item.idea_id !== idea.idea_id), { idea_id: idea.idea_id, vote, updated_at }]);
    return true;
  }

  async function restoreVote(ideaId: string) {
    if (!supabase || !session) return;
    const { error } = await supabase.from("idea_votes").delete().eq("user_id", session.user.id).eq("idea_id", ideaId);
    if (error) {
      setDataError(`Não foi possível recuperar a ideia: ${error.message}`);
      return;
    }
    setVotes((current) => current.filter((item) => item.idea_id !== ideaId));
    void loadSignals();
  }

  // Each person gives their own birthday, so it's stored in their slot of the couple.
  async function saveMyBirthday(date: string) {
    if (!supabase || !couple || !mySlot) return false;
    const patch = mySlot === "partner_one" ? { partner_one_birth_date: date } : { partner_two_birth_date: date };
    const { error } = await supabase.from("couples").update(patch).eq("id", couple.id);
    if (error) return false;
    setCouple({ ...couple, ...patch });
    return true;
  }

  async function saveAirport(code: string) {
    if (!supabase || !couple) return;
    const previous = couple.home_airport;
    setCouple({ ...couple, home_airport: code });
    const { error } = await supabase.from("couples").update({ home_airport: code }).eq("id", couple.id);
    if (error) {
      setCouple({ ...couple, home_airport: previous });
      setDataError(`Não foi possível guardar o aeroporto: ${error.message}`);
    }
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setDataError(`Não foi possível terminar a sessão: ${error.message}`);
  }

  const todayHeading = new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const pageHeading: Record<View, [string, string]> = {
    today: [`Olá, ${couple?.partner_one_name} e ${couple?.partner_two_name}`, todayHeading],
    discover: ["Ideias", "Escolham algo para fazer juntos, ou deixem a Nossia escolher."],
    settings: ["Definições", "Perfil, notificações, calendário do iPhone e localização."],
    trips: ["Viagens", "Para onde querem ir, quando ir, e o plano de cada viagem."],
    tripMap: ["Mapa-mundo", "Os sítios onde já estiveram. Toquem numa fotografia para abrir a memória."],
    places: ["Sítios", "Restaurantes, cafés e bares para experimentar, e os que já são vossos."],
    events: ["Eventos", "O que está a acontecer perto de vocês."],
    favorites: ["Favoritos", "As ideias que guardaram para mais tarde."],
    planned: ["Planeados", "O que já está marcado."],
    memories: ["Memórias", "Os dates que já fizeram, com notas e fotografias."],
    calendar: ["Calendário", "Dates planeados e memórias, mês a mês."],
    schedule: ["Agenda", "Horários, tarefas e o tempo livre que têm em comum."],
    map: ["Mapa", "Os sítios dos vossos dates."],
    insights: ["Estatísticas", "A vossa história em números e datas."],
  };
  const isGlobalImport = modal === "global-import";
  const localToday = new Date();
  const todayDate = `${localToday.getFullYear()}-${String(localToday.getMonth() + 1).padStart(2, "0")}-${String(localToday.getDate()).padStart(2, "0")}`;

  if (!authReady) return <div className="loading-screen"><span className="brand-mark">n</span><p>A abrir…</p></div>;
  if (passwordRecovery && session) return <AuthScreen initialMode="password-update" onModeChange={navigateAuth} recovery onRecoveryComplete={() => setPasswordRecovery(false)} />;
  if (!session || !couple) return <><AuthScreen initialMode={authFlow} onModeChange={navigateAuth} />{dataError && <p className="auth-global-error" role="alert">{dataError}</p>}</>;

  // After the mascot exists: one pop-up at a time, swipes first, then what's missing in the profile.
  const myMascot = mascots?.find((item) => item.user_id === session.user.id) ?? null;
  const onboardingVisible = Boolean(mySlot && mascots && (onboardingOpen || editingMascot || !myMascot));
  const profileMissing = [
    !couple.municipality ? "O concelho onde vivem" : null,
    couple.weather_latitude == null ? "A localização para o tempo" : null,
    mySlot && !workBlocks.some((block) => block.partner_slot === mySlot) ? "Os teus horários de trabalho" : null,
  ].filter((item): item is string => item !== null);
  const welcomeStep: WelcomeStep | null = !myMascot || onboardingVisible || openDeck || modal || quickAddOpen ? null
    : votes.length === 0 && deckAvailable.length > 0 && !welcomeSeen.includes("swipes") ? "swipes"
      : profileMissing.length > 0 && !welcomeSeen.includes("profile") ? "profile" : null;
  const markWelcomeSeen = (step: WelcomeStep) => {
    const next = [...welcomeSeen.filter((item) => item !== step), step];
    setWelcomeSeen(next);
    saveSeenWelcome(session.user.id, next);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/hoje" onClick={(event) => { event.preventDefault(); navigateView("today"); }} aria-label="Nossia"><span className="brand-mark">n</span><span className="brand-name">nossia</span></a>
        <div className="couple-chip"><span className={`avatar-pair ${couplePhotoUrl ? "has-photo" : ""}`}>{couplePhotoUrl ? <img src={couplePhotoUrl} alt="" /> : <>{couple.partner_one_name.slice(0, 1)}<span>+</span>{couple.partner_two_name.slice(0, 1)}</>}</span><span>{couple.partner_one_name} & {couple.partner_two_name}</span><span className="online-dot" /></div>
        <nav className="side-nav" aria-label={"Navegação principal"}>
          {sections.map((section) => <button type="button" className={`nav-link ${view !== "settings" && sectionOf(view).id === section.id ? "active" : ""}`} aria-current={view !== "settings" && sectionOf(view).id === section.id ? "page" : undefined} key={section.id} onClick={() => { navigateView(sectionOf(view).id === section.id ? section.views[0] : lastViewInSection.current[section.id] ?? section.views[0]); setCategory("All"); }}><section.Icon className="nav-icon" size={22} strokeWidth={1.9} aria-hidden="true" /><span>{section.label}</span>{section.id === "agenda" && counts.planned > 0 && <span className="nav-count">{counts.planned}</span>}</button>)}
        </nav>
        <button className="sign-out-button" onClick={() => void signOut()}><LogOut size={16} aria-hidden="true" />Terminar sessão</button>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-right"><span className="today-label">{new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span><button type="button" className={`top-avatar ${couplePhotoUrl ? "has-photo" : ""}`} onClick={() => navigateView("settings")} aria-label="Abrir definições" title="Definições">{couplePhotoUrl ? <img src={couplePhotoUrl} alt="" /> : <>{couple.partner_one_name.slice(0, 1)}<span>{couple.partner_two_name.slice(0, 1)}</span></>}</button></div>
        </header>

        <div className="content">
          <section className="welcome-row"><div><h1>{view !== "settings" && sectionOf(view).views.length > 1 ? sectionOf(view).label : pageHeading[view][0]}</h1><p className="welcome-copy">{pageHeading[view][1]}</p></div>{view === "discover" && <div className="welcome-actions">{isCatalogAdmin && catalogAvailable && <button className="button button-ghost" onClick={() => openImport("global")}>Carregar ideias globais</button>}<button className="button button-ghost" onClick={() => openImport("couple")}><Upload size={16} aria-hidden="true" />Importar</button><button className="button button-primary" onClick={() => setQuickAddOpen(true)}><Plus size={16} aria-hidden="true" />Nova ideia</button></div>}</section>

          {view !== "settings" && sectionOf(view).views.length > 1 && <nav className="subnav" aria-label={`Secções de ${sectionOf(view).label}`}>{sectionOf(view).views.map((item) => <button type="button" key={item} className={view === item ? "active" : ""} aria-current={view === item ? "page" : undefined} onClick={() => navigateView(item)}>{subviewLabels[item]}</button>)}</nav>}

          {dataError && <p className="data-alert" role="alert">{dataError}</p>}

          {view === "today" && <TodayView
            upcomingDates={upcomingDates}
            overdueCount={overdueDates.length}
            freeDays={freeDays}
            suggestion={suggestion}
            suggestionDate={suggestionDay.key}
            weatherKnown={couple.weather_latitude !== null}
            scene={decideHouse({ now: new Date(), weather: weatherForecast[0] ?? null, blocks: workBlocks, commitments, dates })}
            mascots={mascots ?? []}
            deckSize={deckAvailable.length}
            onOpenDeck={() => setOpenDeck(deckAvailable)}
            onOpenFridge={() => navigateView("tripMap")}
            onOpenCalendar={() => navigateView("calendar")}
            onOpenWindow={() => navigateView("settings")}
            busy={busy}
            anniversary={anniversary}
            birthdays={personalBirthdays}
            weather={couple.weather_latitude !== null ? null : <WeatherPanel location={{ name: couple.weather_location_name, latitude: couple.weather_latitude, longitude: couple.weather_longitude, }} onSaveLocation={saveWeatherLocation} onConditionChange={onWeatherConditionChange} onForecastChange={onWeatherForecastChange} />}
            partnerOneName={couple.partner_one_name}
            partnerTwoName={couple.partner_two_name}
            commitments={commitments}
            nextTrip={nextTrip}
            nextEvent={nextNearbyEvent}
            onOpenEvents={() => navigateView("events")}
            onQuickAdd={quickAdd}
            onMoreDetails={openIdeaDetails}
            onPlanSuggestion={(idea, date) => void createDate(idea.idea_id, { planned_for: date })}
            onAnotherSuggestion={() => setSuggestionSeed((seed) => seed + 1 + Math.floor(Math.random() * 7))}
            onMarkDone={(id) => void markCompleted(id)}
            onEditDate={(id) => { const idea = ideas.find((item) => item.id === id); if (idea) openEditPlan(idea); }}
            onOpenPlaces={() => navigateView("places")}
            onOpenPlanned={() => navigateView("planned")}
            onOpenAgenda={() => navigateView("schedule")}
          />}
          {view === "discover" && <>
            <section className="discovery-options" aria-label={"Escolher como encontrar um date"}>
              <button className="discovery-option random-option" onClick={() => drawRandomIdea(true)}>
                <span className="discovery-option-icon"><Shuffle size={20} aria-hidden="true" /></span><span className="discovery-option-copy"><strong>Surpreendam-nos</strong><small>Sortear uma ideia de date</small></span><ArrowRight className="discovery-option-arrow" size={18} aria-hidden="true" />
              </button>
              <button className="discovery-option feeling-option" onClick={beginFeeling}>
                <span className="discovery-option-icon"><SlidersHorizontal size={20} aria-hidden="true" /></span><span className="discovery-option-copy"><strong>Escolher pelo feeling</strong><small>Respondam a algumas perguntas</small></span><ArrowRight className="discovery-option-arrow" size={18} aria-hidden="true" />
              </button>
            </section>
          </>}
          {view === "insights" && <>
          <section className="milestones-card" aria-label={"Datas importantes"}>
            <div className="milestones-heading"><span className="section-kicker">DATAS QUE SIGNIFICAM MUITO</span><h2>A vossa história até agora</h2></div>
            {relationshipTime && <div className="relationship-duration">
              <div className="relationship-duration-copy"><strong>{new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 }).format(relationshipMetric === "days" ? relationshipTime.days : relationshipMetric === "months" ? relationshipTime.months : relationshipTime.years)}</strong><span>{relationshipMetric === "days" ? "dias juntos" : relationshipMetric === "months" ? "meses juntos" : "anos juntos"}</span></div>
              <div className="relationship-metric-switch" role="group" aria-label={"Métrica do tempo juntos"}>{(["days", "months", "years"] as const).map((metric) => <button key={metric} type="button" className={relationshipMetric === metric ? "selected" : ""} aria-pressed={relationshipMetric === metric} onClick={() => changeRelationshipMetric(metric)}>{({ days: "Dias", months: "Meses", years: "Anos" } as Record<RelationshipMetric, string>)[metric]}</button>)}</div>
            </div>}
            {anniversary && <article className={`anniversary-feature${anniversaryGiftReminder ? " anniversary-gift-due" : ""}`}>
              <div className="anniversary-heart" aria-hidden="true">♥</div>
              <div className="anniversary-copy"><span className="anniversary-label">ANIVERSÁRIO DE NAMORO · DATA DO CASAL</span><h3>{anniversary.days === 0 ? ("Feliz aniversário de namoro!") : anniversary.days === 1 ? ("É já amanhã!") : `Faltam ${anniversary.days} dias`}</h3><p>{formatDate(anniversary.date)}{anniversary.days === 0 ? "" : ` · ${anniversary.years} ${"anos juntos"}`}</p>
                {anniversaryGiftReminder && <p className="anniversary-gift-line">Está quase. Que tal uma experiência a dois, como um jantar especial ou uma escapadinha? <button type="button" className="link-button" onClick={startAnniversaryPlanning}>Planear o date de aniversário →</button></p>}
              </div>
            </article>}
            {(couple.first_met_date || couple.first_message_date || couple.first_date_date) && <section className="milestone-group">
              <div className="milestone-group-heading"><span className="section-kicker">DATAS DO CASAL</span><span>Momentos importantes da vossa história</span></div>
              <div className="milestones-list">
                {couple.first_met_date && <article className="milestone-card"><i>✦</i><span>Conheceram-se</span><strong>{formatDate(couple.first_met_date)}</strong></article>}
                {couple.first_message_date && <article className="milestone-card"><i>✉</i><span>Primeira mensagem</span><strong>{formatDate(couple.first_message_date)}</strong></article>}
                {couple.first_date_date && <article className="milestone-card"><i>♡</i><span>Primeiro date</span><strong>{formatDate(couple.first_date_date)}</strong></article>}
              </div>
            </section>}
            {personalBirthdays.length > 0 && <section className="milestone-group personal-milestones">
              <div className="milestone-group-heading"><span className="section-kicker">DATAS PESSOAIS</span><span>Aniversários de cada pessoa</span></div>
              <div className="milestones-list">{personalBirthdays.map((birthday) => <article className="milestone-card personal-milestone-card" key={birthday.name}><i>✿</i><span>{`Aniversário de ${birthday.name}`}</span><strong>{formatDate(birthday.date, { day: "numeric", month: "long" })}{birthday.days === 0 ? " · Hoje" : birthday.days <= 30 ? ` · daqui a ${birthday.days} dias` : ""}</strong></article>)}</div>
            </section>}
          </section>
          </>}


          {(view === "calendar" || view === "map") && <div className="date-view-filters">
            <label className="search-box"><Search size={16} aria-hidden="true" /><input aria-label={"Pesquisar dates"} placeholder={"Procurar date ou local..."} value={search} onChange={(event) => setSearch(event.target.value)} /></label>
            <div className="filters" aria-label={"Filtrar dates por categoria"}>{categories.map((item) => <button key={item} className={`filter-chip ${category === item ? "selected" : ""}`} onClick={() => setCategory(item)}>{item === "All" ? "Todos" : activityLabel(item)}</button>)}</div>
          </div>}

          {view === "calendar" && <CalendarView ideas={visibleIdeas} commitments={commitments} trips={trips} />}
          {view === "events" && <EventsPanel events={events} origin={eventOrigin} today={localDateString()} busy={busy} plannedEventIds={new Set(dates.filter((date) => date.status === "planned" && date.event_id).map((date) => date.event_id as string))} freeDays={eventHorizon.free} horizonEnd={eventHorizon.end} onPlan={planEvent} onPlanTrip={planEventTrip} onOpenSettings={() => navigateView("settings")} />}
          {view === "places" && <PlacesPanel couple={couple} dates={ideas} busy={busy} onPlan={planAtPlace} />}
          {view === "trips" && <TripsPanel coupleId={couple.id} airport={couple.home_airport} opportunities={<Opportunities today={localDateString()} blocks={workBlocks} municipality={couple.municipality} rules={vacationRules} visited={trips.filter((trip) => trip.end_date < localDateString()).map((trip) => trip.title)} names={{ partner_one: couple.partner_one_name, partner_two: couple.partner_two_name }} busy={busy} onCreateTrip={createTripFor} />} trips={trips} onTripsChange={setTrips} onOpenMemory={(id) => { setMemoryTripId(id); navigateView("tripMap"); }} />}
          {view === "tripMap" && <TripWorld coupleId={couple.id} trips={trips} openTripId={memoryTripId} onOpenTrip={setMemoryTripId} onTripsChange={setTrips} />}
          {view === "schedule" && <SchedulePanel part="week" couple={couple} userId={session.user.id} mySlot={mySlot} plannedDates={plannedDates} blocks={workBlocks} commitments={commitments} trips={trips} busy={busy} onRemoveCommitment={(id) => void removeCommitment(id)} onUpdateCommitment={updateCommitment} onBlocksChange={setWorkBlocks} onFindDate={() => navigateView("discover")} />}
          {view === "settings" && <section className="settings-page">
            <article className="schedule-card settings-profile"><h2>{couple.partner_one_name} e {couple.partner_two_name}</h2><p className="schedule-hint">Nomes, fotografia, datas importantes e o convite para a conta do par.</p><div className="panel-actions"><button type="button" className="button button-secondary" onClick={openCoupleProfile}><UserRound size={16} aria-hidden="true" />Perfil do casal</button><button type="button" className="button button-ghost" onClick={() => void signOut()}><LogOut size={16} aria-hidden="true" />Terminar sessão</button></div></article><article className="schedule-card settings-mascot"><h2>A minha mascote</h2>{mascots?.find((item) => item.user_id === session.user.id) && <MascotArt look={mascots.find((item) => item.user_id === session.user.id) as Mascot} size={72} />}<div className="panel-actions"><button type="button" className="button button-ghost" onClick={() => setEditingMascot(true)}>Alterar</button></div></article><VacationSettings profile={vacationProfiles.find((profile) => profile.user_id === session.user.id) ?? null} periods={vacationPeriods.filter((period) => period.user_id === session.user.id)} partnerName={mySlot === "partner_two" ? couple.partner_one_name : couple.partner_two_name} partnerProfile={vacationProfiles.find((profile) => profile.user_id !== session.user.id) ?? null} partnerPeriods={vacationPeriods.filter((period) => period.user_id !== session.user.id)} today={localDateString()} onSaveProfile={saveVacationProfile} onAddPeriod={addVacationPeriod} onRemovePeriod={(id) => void removeVacationPeriod(id)} /><PassedIdeas ideas={votes.filter((vote) => vote.vote === "pass").flatMap((vote) => { const idea = catalog.find((item) => item.id === vote.idea_id); return idea ? [{ idea_id: idea.id, title: idea.title, emoji: idea.emoji }] : []; })} onRestore={(ideaId) => void restoreVote(ideaId)} /><AccountSettings municipality={couple.municipality} onMunicipalityChange={saveMunicipality} airport={couple.home_airport} onAirportChange={(code) => void saveAirport(code)} onSignedOut={() => { window.location.href = "/"; }} />
            <SchedulePanel part="settings" couple={couple} userId={session.user.id} mySlot={mySlot} plannedDates={plannedDates} blocks={workBlocks} commitments={commitments} trips={trips} busy={busy} onRemoveCommitment={(id) => void removeCommitment(id)} onUpdateCommitment={updateCommitment} onBlocksChange={setWorkBlocks} onFindDate={() => navigateView("discover")} />
            <WeatherPanel location={{ name: couple.weather_location_name, latitude: couple.weather_latitude, longitude: couple.weather_longitude }} onSaveLocation={saveWeatherLocation} onConditionChange={onWeatherConditionChange} onForecastChange={onWeatherForecastChange} />
          </section>}
          {view === "map" && <Suspense fallback={<div className="map-loading">A abrir o mapa…</div>}><LazyMapView
            ideas={visibleIdeas}
            onPinLocation={(idea) => {
              setActiveIdeaId(idea.id);
              setLocationName(idea.location_name ?? "");
              setLocationLatitude(idea.latitude);
              setLocationLongitude(idea.longitude);
              setModal("location");
            }}
          /></Suspense>}

          {view === "insights" && <section className="insights-panel" aria-label={"Estatísticas dos dates"}>
            <div className="insights-total"><span className="stat-icon green">♡</span><div><strong>{completedMoodStats.total}</strong><span>dates feitos juntos</span></div></div>
            <div className="insights-metrics">
              <article className="insight-metric"><span>✳</span><div><strong>{completedStats.uniqueActivities}</strong><small>atividades diferentes</small></div></article>
              <article className="insight-metric"><span>⌖</span><div><strong>{completedStats.uniquePlaces}</strong><small>locais visitados</small></div></article>
              <article className="insight-metric"><span>↻</span><div><strong>{completedStats.wouldRepeat}</strong><small>dates para repetir</small></div></article>
              <article className="insight-metric"><span>€</span><div><strong>{new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(completedStats.estimatedSpend)}</strong><small>despesa estimada</small></div></article>
              <article className="insight-metric"><span>♡</span><div><strong>{completedStats.thisMonth}</strong><small>dates este mês</small></div></article>
              <article className="insight-metric"><span>⌂</span><div><strong>{completedStats.topCategory ? activityLabel(completedStats.topCategory) : "—"}</strong><small>o que mais fazem</small></div></article>
              <article className="insight-metric"><span>⌂</span><div><strong>{completedStats.homeDates}</strong><small>dates em casa</small></div></article>
              <article className="insight-metric"><span>♡</span><div><strong>{mostFrequentHome && mostFrequentHome.count > 0 ? `Casa de ${mostFrequentHome.partner === "partner_one" ? couple.partner_one_name : couple.partner_two_name}` : "—"}</strong><small>{mostFrequentHome && mostFrequentHome.count > 0 ? `${mostFrequentHome.count} dates · local mais frequente` : "local mais frequente"}</small></div></article>
            </div>
            <p className="insights-estimate-note">A despesa é estimada a partir do orçamento definido em cada ideia; não representa valores reais registados.</p>
            {completedMoodStats.total < 5
              ? <div className="insights-empty"><span className="section-kicker">O VOSSO PERFIL DE CASAL</span><h2>A vossa história está a começar</h2><p>{`Façam mais ${5 - completedMoodStats.total} ${5 - completedMoodStats.total === 1 ? "date" : "dates"} para desbloquear o perfil de casal. Vamos mostrar os dois moods mais frequentes.`}</p><div className="insights-progress" role="progressbar" aria-label={"Dates até desbloquear o perfil de casal"} aria-valuenow={completedMoodStats.total} aria-valuemin={0} aria-valuemax={5}><span style={{ width: `${Math.min(completedMoodStats.total / 5 * 100, 100)}%` }} /></div><span className="insights-progress-label">{completedMoodStats.total} {"de"} 5 {"dates"}</span></div>
              : <div className="insights-profile"><span className="section-kicker">O VOSSO PERFIL DE CASAL</span><h2>{`Gostam sobretudo de ${completedMoodStats.top.map((stat) => (activities.find((item) => item.value === stat.activity)?.label ?? stat.activity).toLocaleLowerCase("pt-PT")).join(" e ")}`}</h2><p>{`Com base nos vossos ${completedMoodStats.total} dates concluídos, isto é o que mais fazem juntos:`}</p><div className="insights-moods">{completedMoodStats.activities.map((stat) => <div className="insights-mood" key={stat.activity}><div><strong>{activityLabel(stat.activity)}</strong><span>{stat.count} {stat.count === 1 ? "date" : "dates"}</span></div><div className="insights-progress" aria-hidden="true"><span style={{ width: `${stat.count / completedMoodStats.total * 100}%` }} /></div></div>)}</div></div>}
          </section>}

          {view !== "today" && view !== "calendar" && view !== "map" && view !== "insights" && view !== "schedule" && view !== "settings" && view !== "trips" && view !== "tripMap" && view !== "places" && <section className="ideas-section">
            <div className="section-heading"><div><p className="section-kicker">{view === "planned" ? "A CAMINHO" : view === "memories" ? "O VOSSO ÁLBUM" : "ESCOLHIDO A PENSAR NOS DOIS"}</p><h2>{view === "planned" ? "Os vossos próximos dates" : view === "memories" ? "Momentos que viveram juntos" : view === "favorites" ? "Guardados com carinho" : "Ideias para desfrutarem juntos"} <span className="heading-count">{visibleIdeas.length}</span></h2></div><label className="search-box"><Search size={16} aria-hidden="true" /><input aria-label={"Pesquisar ideias de date"} placeholder={"Encontrar uma ideia..."} value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
            <div className="filters" aria-label={"Filtrar por tipo"}>{categories.map((item) => <button key={item} className={`filter-chip ${category === item ? "selected" : ""}`} onClick={() => setCategory(item)}>{item === "All" ? "Todos" : activityLabel(item)}</button>)}</div><div className="filters place-filters" aria-label="Em casa ou fora">{([["all", "Em casa e fora"], ["home", "🏠 Em casa"], ["out", "🚶 Fora"]] as const).map(([value, label]) => <button key={value} className={`filter-chip ${placeFilter === value ? "selected" : ""}`} aria-pressed={placeFilter === value} onClick={() => setPlaceFilter(value)}>{label}</button>)}</div>

            {visibleIdeas.length > 0 ? <><div className="idea-grid">
              {visibleIdeas.slice(0, visibleIdeaLimit).map((idea, index) => <article className="idea-card" key={idea.id} style={{ animationDelay: `${index * 45}ms` }}>
                <div className={`idea-art art-${index % 6}`}><span className="idea-emoji">{idea.emoji}</span><span className="category-label">{activityLabel(activityOf(idea))}{isSpecial(idea) ? " · ✨" : ""}</span><button className={`favorite-button ${idea.favorite ? "is-favorite" : ""}`} aria-label={idea.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"} onClick={() => void toggleFavorite(idea.id)}><Bookmark size={17} fill={idea.favorite ? "currentColor" : "none"} aria-hidden="true" /></button>{idea.status === "idea" && activeSeasonFor(idea.seasons, todayDate) && <span className="season-label">{seasonDetails[activeSeasonFor(idea.seasons, todayDate)!].label}</span>}{idea.status === "planned" && <span className="planned-label">PLANEADO</span>}{idea.status === "completed" && <span className="completed-label">FEITO</span>}</div>
                <div className="idea-body"><div className="idea-title-row"><h3>{idea.title}</h3>{(idea.status !== "idea" || idea.is_own_idea) && <div className="idea-management"><button type="button" aria-label={`Editar ${idea.title}`} title={idea.status === "idea" ? "Editar ideia" : "Alterar"} onClick={() => idea.status === "planned" ? openEditPlan(idea) : idea.status === "completed" ? openEditMemory(idea) : openEditIdea(idea)}><Pencil size={15} aria-hidden="true" /></button><button type="button" aria-label={`Apagar ${idea.title}`} title={"Apagar"} onClick={() => { setActiveIdeaId(idea.id); setModal("delete"); }}><Trash2 size={15} aria-hidden="true" /></button></div>}</div><p className="idea-description">{idea.description}</p>{idea.planned_for && <p className="planned-date"><CalendarDays size={15} aria-hidden="true" />{formatDate(idea.planned_for)}{idea.planned_start_time ? ` · ${idea.planned_start_time.slice(0, 5)}` : ""}</p>}
                  {view === "memories" && (idea.memory || idea.location_name || idea.would_repeat !== null || idea.watched_title || idea.food_notes) && <div className="memory-details">{idea.would_repeat !== null && <span className={idea.would_repeat ? "repeat-yes" : "repeat-no"}>{idea.would_repeat ? "Querem repetir" : "Não repetir"}</span>}{idea.watched_title && <span>🎬 {idea.watched_title}</span>}{idea.food_notes && <span>🍽️ {idea.food_notes}</span>}{idea.location_name && <span>⌖ {idea.location_name}</span>}{idea.memory && <p>{idea.memory}</p>}</div>}
                  <div className="idea-footer"><div className="idea-meta"><Clock size={14} aria-hidden="true" /><span>{durationLabel(idea.duration_minutes, idea.duration)}</span><i /><span>{budgetLabel(idea.budget_eur)}</span></div>{idea.status === "idea" ? <button className="card-action" disabled={busy} onClick={() => openPlan(idea)}>Marcar</button> : idea.status === "planned" ? <button className="card-action done-action" disabled={busy} onClick={() => void markCompleted(idea.id)}><Check size={15} aria-hidden="true" />Já fizemos</button> : <div className="memory-card-actions"><button className="card-action album-action" disabled={busy} onClick={() => void openAlbum(idea)}>{"Álbum"} ({photos.filter((photo) => photo.date_id === idea.id).length})</button><button className="card-action" disabled={busy} onClick={() => editCompletedHomeLocation(idea)}>{idea.home_partner ? "Alterar casa" : "Definir casa"}</button><button className="card-action undo-action" disabled={busy} onClick={() => openPlan(idea)}>Repetir</button></div>}</div>
                </div>
              </article>)}
            </div>{visibleIdeas.length > visibleIdeaLimit && <button type="button" className="show-more-ideas" onClick={() => setVisibleIdeaLimit((limit) => limit + 60)}>{`Mostrar mais ideias (${visibleIdeas.length - visibleIdeaLimit} restantes)`}</button>}</> : <div className="empty-state"><span>♡</span><h3>Ainda não há dates por aqui</h3><p>{view === "favorites" ? "Guardem as vossas ideias favoritas para as encontrarem aqui." : "Experimentem outra categoria ou adicionem uma ideia."}</p><button className="add-button" onClick={() => setQuickAddOpen(true)}>＋ Adicionar ideia</button></div>}
          </section>}
        </div>
      </main>

      {view !== "today" && view !== "settings" && !modal && !quickAddOpen && <button type="button" className="fab" aria-label="Adicionar" onClick={() => setQuickAddOpen(true)}><Plus size={26} aria-hidden="true" /></button>}
      {welcomeStep && myMascot && <WelcomeSteps step={welcomeStep} mascot={myMascot} deckSize={deckAvailable.length} missing={profileMissing} onLater={() => markWelcomeSeen(welcomeStep)} onStart={() => { markWelcomeSeen(welcomeStep); if (welcomeStep === "swipes") setOpenDeck(deckAvailable); else navigateView("settings"); }} />}
      {openDeck && <SwipeDeck deck={openDeck} onVote={saveVote} onClose={() => { setOpenDeck(null); void loadSignals(); }} />}
      {quickAddOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setQuickAddOpen(false); }}><section className="modal-card quick-add-modal" role="dialog" aria-modal="true" aria-labelledby="quick-add-title"><button className="modal-close" aria-label="Fechar" disabled={busy} onClick={() => setQuickAddOpen(false)}>×</button><h2 id="quick-add-title">Nova ideia</h2><p className="modal-copy">Basta uma frase. Se escreverem o dia, passa logo a date marcado.</p><QuickAddBox partnerOneName={couple.partner_one_name} partnerTwoName={couple.partner_two_name} busy={busy} defaultKind="idea" autoFocus onSubmit={quickAdd} onMoreDetails={openIdeaDetails} /></section></div>}
      {couple && mySlot && mascots && (onboardingOpen || editingMascot || !mascots.some((item) => item.user_id === session.user.id)) && <Onboarding coupleId={couple.id} userId={session.user.id} slot={mySlot} defaultName={mySlot === "partner_one" ? couple.partner_one_name : couple.partner_two_name} existing={editingMascot ? mascots.find((item) => item.user_id === session.user.id) ?? null : null} askInvite={!editingMascot && !partnerJoined} birthDate={mySlot === "partner_one" ? couple.partner_one_birth_date : couple.partner_two_birth_date} onSaveBirthday={saveMyBirthday} onSaved={(saved) => { setMascots((current) => [...(current ?? []).filter((item) => item.user_id !== saved.user_id), saved]); if (!editingMascot) setOnboardingOpen(true); }} onDone={() => { setOnboardingOpen(false); setEditingMascot(false); }} />}
      {modal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) { setModal(null); setAnniversaryPlanDate(null); } }}><section className={`modal-card ${modal === "new" || modal === "edit" ? "idea-editor-modal" : ""} ${modal === "profile" ? "profile-modal" : ""} ${modal === "draw" ? "draw-modal" : ""} ${modal === "album" ? "album-modal" : ""} ${modal === "feeling" ? "feeling-modal" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" aria-label={"Fechar"} disabled={busy} onClick={() => { setModal(null); setAnniversaryPlanDate(null); }}>×</button><span className="modal-icon">{modal === "plan" ? "♡" : modal === "memory" ? "✧" : modal === "draw" ? "✳" : modal === "album" ? "▧" : modal === "location" ? "⌖" : modal === "feeling" ? "♡" : "✳"}</span>
        <p className="section-kicker">{modal === "profile" ? "O VOSSO CASAL" : modal === "global-import" ? "CATÁLOGO GLOBAL DE IDEIAS" : modal === "import" ? "IMPORTAR IDEIAS" : modal === "plan" ? "UM PLANO SÓ PARA VOCÊS" : modal === "memory" ? "GUARDAR ESTE MOMENTO" : modal === "home-location" ? "ATUALIZAR LOCALIZAÇÃO" : modal === "draw" ? discoveryMode === "feeling" ? "A VOSSA SUGESTÃO PERSONALIZADA" : "O DATE DE HOJE ESTÁ DECIDIDO" : modal === "feeling" ? "ESCOLHER PELO FEELING" : modal === "album" ? "O VOSSO ÁLBUM PRIVADO" : modal === "location" ? "ADICIONAR ESTE LOCAL AO MAPA" : "MAIS UMA IDEIA ESPECIAL"}</p>
        <h2 id="modal-title">{modal === "profile" ? "Perfil do casal" : modal === "global-import" ? "Adicionar ideias para todos os casais" : modal === "import" ? "Importar ideias para o vosso casal" : modal === "plan" ? `Vamos combinar um date${activeIdea ? `: ${activeIdea.title}` : ""}?` : modal === "memory" ? "Como foi o vosso date?" : modal === "home-location" ? `Onde aconteceu ${activeIdea?.title ?? "este date"}?` : modal === "draw" ? activeIdea ? discoveryMode === "feeling" ? "Uma ideia à vossa medida" : "A vossa próxima aventura" : "Vamos encontrar uma ideia" : modal === "feeling" ? "O que vos apetece hoje?" : modal === "album" ? activeIdea ? `Álbum: ${activeIdea.title}` : "Álbum do date" : modal === "location" ? "Onde aconteceu?" : "O que gostariam de fazer?"}</h2>
        {modal === "plan" && plannedDateForecast && <p className="weather-date-hint"><span>{weatherEmoji(plannedDateForecast.weatherCode)}</span><span>{formatDate(plannedDateForecast.date, { weekday: "long", day: "numeric", month: "long" })}: <strong>{weatherLabel(plannedDateForecast)}, {Math.round(plannedDateForecast.temperatureMin)}°–{Math.round(plannedDateForecast.temperatureMax)}°</strong>{activeIdea?.weather_setting === "outdoor" && weatherConditionFor(plannedDateForecast) !== "clear" ? " · Este date é ao ar livre; considerem uma alternativa." : ""}</span></p>}
        {modal === "profile" ? <form className="profile-form" onSubmit={(event) => void saveCoupleProfile(event)}>
          <p className="modal-copy">Atualizem os nomes, a fotografia partilhada e as datas importantes do vosso casal.</p>
          <div className="profile-photo-row"><span className={`profile-photo-preview ${couplePhotoUrl ? "has-photo" : ""}`}>{couplePhotoUrl ? <img src={couplePhotoUrl} alt={"Fotografia do casal"} /> : <>{couple.partner_one_name.slice(0, 1)}{couple.partner_two_name.slice(0, 1)}</>}</span><div><strong>Fotografia do casal</strong><small>JPG, PNG, WEBP ou GIF · máximo 10 MB</small><label className="photo-upload-button">Alterar fotografia<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={(event) => void uploadCouplePhoto(event)} /></label></div></div>
          {profilePhotoError && <p className="form-alert error-alert" role="alert">{profilePhotoError}</p>}
          <div className="profile-photo-row partner-access-row"><span className="profile-photo-preview" aria-hidden="true">{memberSlots.includes("partner_two") ? "✓" : "＋"}</span><div><strong>Contas individuais</strong><small>{memberSlots.includes("partner_two")
            ? `${couple.partner_one_name} e ${couple.partner_two_name} já têm cada um a sua conta.`
            : `Convidem ${couple.partner_two_name} a criar a sua própria conta. Os dates, ideias e memórias continuam partilhados.`}</small>
            {!memberSlots.includes("partner_two") && (inviteLink
              ? <div className="invite-link-row"><input className="form-input" readOnly aria-label={"Ligação de convite"} value={inviteLink} onFocus={(event) => event.currentTarget.select()} /><button type="button" className="photo-upload-button" onClick={() => void copyPartnerInvite()}>Copiar</button></div>
              : <button type="button" className="photo-upload-button" disabled={busy} onClick={() => void createPartnerInvite()}>Criar ligação de convite</button>)}
            {inviteLink && !memberSlots.includes("partner_two") && <small>A ligação funciona uma vez e expira em 14 dias.</small>}
          </div></div>
          {inviteError && <p className="form-alert error-alert" role="alert">{inviteError}</p>}
          <div className="profile-fields-grid">
            <label className="form-label">Nome da pessoa A<input className="form-input" required maxLength={80} value={profilePartnerOneName} onChange={(event) => setProfilePartnerOneName(event.target.value)} /></label>
            <label className="form-label">Nome da pessoa B<input className="form-input" required maxLength={80} value={profilePartnerTwoName} onChange={(event) => setProfilePartnerTwoName(event.target.value)} /></label>
            <label className="form-label">{`Aniversário de ${profilePartnerOneName || ("A")}`}<input className="form-input" type="date" max={todayDate} value={profilePartnerOneBirthday} onChange={(event) => setProfilePartnerOneBirthday(event.target.value)} /></label>
            <label className="form-label">{`Aniversário de ${profilePartnerTwoName || ("B")}`}<input className="form-input" type="date" max={todayDate} value={profilePartnerTwoBirthday} onChange={(event) => setProfilePartnerTwoBirthday(event.target.value)} /></label>
            <label className="form-label">Data de namoro<input className="form-input" type="date" required max={todayDate} value={profileRelationshipDate} onChange={(event) => setProfileRelationshipDate(event.target.value)} /></label>
            <label className="form-label">Quando se conheceram (opcional)<input className="form-input" type="date" max={todayDate} value={profileFirstMetDate} onChange={(event) => setProfileFirstMetDate(event.target.value)} /></label>
            <label className="form-label">Primeira mensagem (opcional)<input className="form-input" type="date" max={todayDate} value={profileFirstMessageDate} onChange={(event) => setProfileFirstMessageDate(event.target.value)} /></label>
            <label className="form-label">Primeiro date (opcional)<input className="form-input" type="date" max={todayDate} value={profileFirstDateDate} onChange={(event) => setProfileFirstDateDate(event.target.value)} /></label>
          </div>
          {profileMessage && <p className={`form-alert ${profileSaveFailed ? "error-alert" : "success-alert"}`} role={profileSaveFailed ? "alert" : "status"}>{profileMessage}</p>}
          <button className="modal-submit" type="submit" disabled={busy}>{busy ? "A guardar…" : "Guardar perfil"} <span>→</span></button>
        </form> : (modal === "import" || modal === "global-import") ? <div className="import-content"><h3>{isGlobalImport ? "Carregar ideias predefinidas" : "Importar ideias de dates"}</h3><p className="modal-copy">{isGlobalImport ? "Estas ideias ficam disponíveis para todos os casais. Os planos, favoritos e memórias de cada casal continuam privados." : "Carreguem um ficheiro CSV ou Excel (.xlsx). Revemos as linhas antes de guardar; só as ideias válidas serão importadas para o vosso casal."}</p><p className="import-limits">{isGlobalImport ? "Máximo: 10 MB e 5000 ideias por ficheiro." : "Máximo: 2 MB e 200 ideias por ficheiro."}</p><button type="button" className="import-template-button" onClick={downloadImportTemplate}>Descarregar modelo CSV</button><label className="import-file-button">Escolher ficheiro CSV ou XLSX<input type="file" accept=".csv,.xlsx" onChange={(event) => void selectImportFile(event)} /></label>{importError && <p className="form-alert error-alert" role="alert">{importError}</p>}{importMessage && <p className="form-alert config-alert" role="status">{importMessage}</p>}{importPreview && <><p className="import-summary">{`${importPreview.valid.length} válidas · ${importPreview.invalid.length} inválidas`}</p><div className="import-preview-list">{importPreview.valid.slice(0, 5).map((idea, index) => <div key={`${idea.title}-${index}`}><strong>{idea.title}</strong><span>{moodLabels[idea.mood]} · {durationLabel(idea.duration_minutes, idea.duration)} · {budgetLabel(idea.budget_eur)}</span></div>)}{importPreview.valid.length > 5 && <p>{`e mais ${importPreview.valid.length - 5} ideias válidas`}</p>}{importPreview.invalid.slice(0, 100).map((item) => <p className="import-invalid-row" key={item.row}>{`Linha ${item.row}: ${translateImportMessage(item.reason)}`}</p>)}{importPreview.invalid.length > 100 && <p className="import-invalid-row">{`e mais ${importPreview.invalid.length - 100} linhas inv?lidas`}</p>}</div><button type="button" className="modal-submit" disabled={busy || importPreview.valid.length === 0} onClick={() => void importIdeas()}>{busy ? "A importar…" : `Importar ${importPreview.valid.length} ideias válidas${isGlobalImport ? " para todos" : ""}`} <span>→</span></button></>}</div>
          : modal === "delete" ? <div className="delete-content"><h3>{activeIdea?.status === "idea" ? "Apagar esta ideia?" : "Apagar este date?"}</h3><p className="modal-copy">{activeIdea?.status === "idea"
            ? `“${activeIdea?.title ?? ""}” será removida permanentemente da vossa lista de ideias.`
            : `Este date de “${activeIdea?.title ?? ""}” será removido permanentemente, incluindo as fotografias associadas. A ideia continua disponível.`}</p><button type="button" className="modal-submit delete-confirm-button" disabled={busy} onClick={() => void deleteActiveIdea()}>{busy ? "A apagar…" : "Apagar permanentemente"}</button></div>
          : modal === "draw" ? <>{activeIdea ? <div className="draw-result"><span className="draw-emoji">{activeIdea.emoji}</span><span className="category-label">{activityLabel(activityOf(activeIdea))}</span><h3>{activeIdea.title}</h3><p>{activeIdea.description}</p><div className="idea-meta"><span>{durationLabel(activeIdea.duration_minutes, activeIdea.duration)}</span><i /><span>{budgetLabel(activeIdea.budget_eur)}</span></div></div> : <p className="modal-copy">{drawMessage}</p>}{activeIdeaWeatherAdvice && weatherForecast[0] && <div className={`draw-weather-advice advice-${activeIdeaWeatherAdvice.label}`}><strong>{activityWeatherLabel(activeIdeaWeatherAdvice)}</strong>{activeIdeaWeatherAdvice.reasons.length > 0 && <p>{activeIdeaWeatherAdvice.reasons.map((reason) => activityWeatherReason(reason)).join(" ")}</p>}{activeIdeaWeatherAdvice.label === "mixed" && <small>O tempo é uma indicação, não uma regra — a escolha continua a ser vossa.</small>}</div>}{drawMessage && activeIdea && <p className="draw-message">{drawMessage}</p>}
          {discoveryMode === "random" && drawnIdeaIds.length > 0 && <div className="suggestion-history"><span>SUGESTÕES ANTERIORES</span><div>{drawnIdeaIds.map((id, index) => { const idea = ideas.find((item) => item.id === id); return idea ? <button type="button" key={`${id}-${index}`} className={activeIdeaId === id ? "selected-suggestion" : ""} onClick={() => setActiveIdeaId(id)} aria-label={`${"Escolher sugestão"} ${index + 1}: ${idea.title}`}>{index + 1}</button> : null; })}</div></div>}
          {activeIdea && <div className="draw-actions">{discoveryMode === "random" && randomDrawCount < 3 && <button className="draw-again-button" onClick={() => drawRandomIdea()}>{`Sortear outra vez (${3 - randomDrawCount} restantes)`} <span>⟳</span></button>}{discoveryMode === "random" && randomDrawCount >= 3 && <button className="draw-again-button" onClick={beginFeeling}>{"Experimentar o modo feeling"} <span>→</span></button>}{discoveryMode === "feeling" && <button className="draw-again-button" onClick={() => setModal("feeling")}>{"Alterar respostas"} <span>↻</span></button>}{anniversaryPlanDate ? <button className="draw-plan-today" disabled={busy} onClick={() => void planForAnniversary(activeIdea)}>{"Planear para o aniversário"} <span>♥</span></button> : <button className="draw-plan-today" disabled={busy} onClick={() => void planForToday(activeIdea)}>{"Este date é para hoje"} <span>✓</span></button>}<button className="draw-plan-later" onClick={() => openPlan(activeIdea)}>Planear para outro dia</button></div>}
            {!activeIdea && <div className="draw-actions"><button className="draw-again-button" onClick={beginFeeling}>{"Experimentar o modo feeling"} <span>→</span></button><button className="modal-submit" onClick={openNewIdea}>{"Adicionar ideia"} <span>→</span></button></div>}</>
          : modal === "feeling" ? <div className="feeling-layout">
            <div className="feeling-question-panel">
              <p className="modal-copy">{anniversaryPlanDate ? "Para o aniversário mostramos só ideias marcadas como Especiais. Escolham o que vos apetece fazer" : "Respondam a uma pergunta de cada vez. As sugestões ao lado atualizam-se à medida que escolhem."}</p>
              {drawMessage && <p className="form-alert config-alert" role="status">{drawMessage}</p>}
              <div className="feeling-progress" role="progressbar" aria-label={"Progresso das perguntas"} aria-valuenow={feelingStep} aria-valuemin={0} aria-valuemax={4}><span style={{ width: `${feelingStep / 4 * 100}%` }} /></div>
              <span className="feeling-step-label">{`${Math.min(feelingStep + 1, 4)} DE 4 PERGUNTAS`}</span>
              {feelingStep < 4 ? <>
                <h3 className="feeling-question-title">{(["O que vos apetece fazer?", "Quanto tempo têm?", "Qual é o orçamento para os dois?", "Até onde querem ir?"] as const)[feelingStep]}</h3>
                <div className="feeling-choice-grid">
                  {feelingStep === 0 && ([...activityValues, "Surprise me"] as const).map((activity) => <button type="button" key={activity} className={`feeling-choice ${feelingAnswers.activity === activity ? "selected" : ""}`} aria-pressed={feelingAnswers.activity === activity} onClick={() => { setFeelingAnswers((current) => ({ ...current, activity })); setFeelingStep(1); }}><span>{activity === "Surprise me" ? "?" : activities.find((item) => item.value === activity)?.emoji}</span>{activity === "Surprise me" ? "Surpreendam-nos" : activities.find((item) => item.value === activity)?.label}</button>)}
                  {feelingStep === 1 && ([["1", "Até 1 hora", "Up to 1 hour"], ["2", "1–2 horas", "1–2 hours"], ["3", "2–4 horas", "2–4 hours"], ["4", "Meio dia ou mais", "Half a day or more"]] as const).map(([value, portuguese]) => <button type="button" key={value} className={`feeling-choice ${feelingAnswers.duration === value ? "selected" : ""}`} aria-pressed={feelingAnswers.duration === value} onClick={() => { setFeelingAnswers((current) => ({ ...current, duration: value })); setFeelingStep(2); }}><span>◷</span>{portuguese}</button>)}
                  {feelingStep === 2 && ([["1", "Gratuito ou até 10 €", "Free or up to €10"], ["2", "10–30 €", "€10–30"], ["3", "30–60 €", "€30–60"], ["4", "Sem limite definido", "No set limit"]] as const).map(([value, portuguese]) => <button type="button" key={value} className={`feeling-choice ${feelingAnswers.budget === value ? "selected" : ""}`} aria-pressed={feelingAnswers.budget === value} onClick={() => { setFeelingAnswers((current) => ({ ...current, budget: value })); setFeelingStep(3); }}><span>€</span>{portuguese}</button>)}
                  {feelingStep === 3 && ([["1", "Em casa", "At home"], ["2", "Perto (até 30 min)", "Nearby (up to 30 min)"], ["3", "Até 1 hora de viagem", "Up to 1 hour away"], ["4", "Sem limite", "No limit"]] as const).map(([value, portuguese]) => <button type="button" key={value} className={`feeling-choice ${feelingAnswers.distance === value ? "selected" : ""}`} aria-pressed={feelingAnswers.distance === value} onClick={() => { setFeelingAnswers((current) => ({ ...current, distance: value })); setFeelingStep(4); }}><span>⌖</span>{portuguese}</button>)}
                </div>
              </> : <div className="feeling-avoid-step">
                <h3 className="feeling-question-title">{"Há algo que queiram evitar?"} <span>Opcional</span></h3>
                <input className="form-input" aria-label={"Coisas a evitar"} value={feelingAnswers.avoid} onChange={(event) => setFeelingAnswers((current) => ({ ...current, avoid: event.target.value }))} placeholder={"ex.: multidões, caminhadas longas"} maxLength={120} />
                <p className="feeling-note">{weatherCondition === "unknown" ? "Sem previsão disponível, as sugestões continuam a usar as vossas respostas. Quando existe previsão, cada atividade é avaliada pelos fatores meteorológicos mais relevantes." : "A meteorologia é avaliada para cada atividade — a chuva não exclui automaticamente os dates ao ar livre."}</p>
              </div>}
              {feelingStep > 0 && <button type="button" className="feeling-back-button" onClick={() => setFeelingStep((step) => Math.max(0, step - 1))}>← {"Pergunta anterior"}</button>}
            </div>
            <aside className="feeling-suggestions-panel" aria-label={"Ideias que correspondem às respostas"}>
              <div className="feeling-suggestions-heading"><div><span className="section-kicker">A AFINAR COM AS VOSSAS RESPOSTAS</span><h3>Ideias para vocês</h3></div><span className="heading-count">{feelingSuggestions.length}</span></div>
              {feelingSuggestions.length ? <div className="feeling-suggestions-list">{feelingSuggestions.slice(0, 12).map((idea) => {
                const advice = activityWeatherAdvice(idea, weatherForecast[0]);
                return <button type="button" className="feeling-suggestion" key={idea.id} onClick={() => chooseFeelingSuggestion(idea.id)}><span className="feeling-suggestion-emoji">{idea.emoji}</span><span className="feeling-suggestion-copy"><strong>{idea.title}</strong><small>{durationLabel(idea.duration_minutes, idea.duration)} · {budgetLabel(idea.budget_eur)}</small>{weatherForecast[0] && <small className="feeling-weather-fit">{activityWeatherLabel(advice)}</small>}</span><span className="feeling-suggestion-arrow">→</span></button>;
              })}</div> : <div className="feeling-no-suggestions"><span>♡</span><p>Nenhuma ideia corresponde por agora. Voltem atrás e alterem uma resposta, ou adicionem mais ideias.</p></div>}
              {feelingSuggestions.length > 12 && <p className="feeling-more-suggestions">{`Mais ${feelingSuggestions.length - 12} ideias disponíveis. Continuem a responder para filtrar.`}</p>}
            </aside>
          </div>
          : modal === "plan" ? <><p className="modal-copy">{editingPlan ? "Mudem o dia, a hora ou o sítio deste date." : repeatIdea ? "Isto cria um novo plano e mantém a memória original. Para hoje, escolha “Este date é para hoje” na sugestão." : "Escolham uma data diferente para este date."}</p><label className="form-label" htmlFor="planned-date">Data<input className="form-input" id="planned-date" type="date" required value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} /></label><label className="form-label" htmlFor="planned-time">{"Hora"} <span>(opcional — aparece no calendário do telemóvel)</span><input className="form-input" id="planned-time" type="time" value={plannedTime} onChange={(event) => setPlannedTime(event.target.value)} /></label><HomeLocationPicker id="planned-home" partnerOneName={couple.partner_one_name} partnerTwoName={couple.partner_two_name} homePartner={plannedHomePartner} value={plannedLocation} onHomePartnerChange={(partner) => { setPlannedHomePartner(partner); setPlannedLatitude(null); setPlannedLongitude(null); setPlannedLocation(partner ? `Casa de ${partner === "partner_one" ? couple.partner_one_name : couple.partner_two_name}` : ""); }} onLocationChange={(value) => { setPlannedLocation(value); setPlannedLatitude(null); setPlannedLongitude(null); }} onPlaceSelect={(place) => { setPlannedLocation(place.displayName.slice(0, 160)); setPlannedLatitude(place.latitude); setPlannedLongitude(place.longitude); }} /><button className="modal-submit" disabled={busy || !plannedDate} onClick={() => void savePlan()}>{busy ? "A guardar…" : editingPlan ? "Guardar alterações" : "Guardar nos dates planeados"} <span>→</span></button></>
          : modal === "album" ? <><p className="modal-copy">As fotografias são privadas e só estão disponíveis na vossa conta. Adicionem imagens JPG, PNG, WEBP ou GIF (até 10 MB cada).</p>{photoError && <p className="form-alert error-alert" role="alert">{photoError}</p>}{busy && <p className="album-loading">A carregar o álbum…</p>}<div className="album-grid">{photos.filter((photo) => photo.date_id === activeIdeaId).map((photo) => photo.signed_url ? <a className="album-photo" key={photo.id} href={photo.signed_url} target="_blank" rel="noopener noreferrer"><img src={photo.signed_url} alt={`${activeIdea?.title ?? "Date"} memory`} loading="lazy" /></a> : <div className="album-photo-unavailable" key={photo.id}>Pré-visualização indisponível</div>)}</div><label className="photo-upload-button">＋ {"Adicionar fotografias"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple disabled={busy} onChange={(event) => void uploadPhotos(event)} /></label></>
          : modal === "home-location" ? <><p className="modal-copy">Escolham em que casa aconteceu. Isto atualiza esta memória e as estatísticas, sem alterar a data nem o resto do registo.</p><label className="form-label" htmlFor="completed-home-location">Local do date<select className="form-input" id="completed-home-location" value={memoryHomePartner ?? "unset"} onChange={(event) => { const value = event.target.value; setMemoryHomePartner(value === "partner_one" || value === "partner_two" ? value : null); }}><option value="unset">Não indicar a casa</option><option value="partner_one">{`Casa de ${couple.partner_one_name}`}</option><option value="partner_two">{`Casa de ${couple.partner_two_name}`}</option></select></label><button className="modal-submit" disabled={busy} onClick={() => void saveCompletedHomeLocation()}>{busy ? "A guardar…" : "Guardar localização"} <span>→</span></button></>
          : modal === "location" ? <><p className="modal-copy">Pesquisem o local e escolham o resultado correto para o adicionar ao mapa.</p><LocationSearch value={locationName} onChange={(value) => { setLocationName(value); setLocationLatitude(null); setLocationLongitude(null); }} onSelect={(place: GeocodedPlace) => { setLocationName(place.displayName.slice(0, 160)); setLocationLatitude(place.latitude); setLocationLongitude(place.longitude); }} /><button className="modal-submit" disabled={busy || locationLatitude === null || locationLongitude === null} onClick={() => void savePinnedLocation()}>{busy ? "A guardar…" : "Guardar no mapa"} <span>→</span></button></>
          : modal === "memory" ? <form onSubmit={(event) => void saveMemory(event)}><p className="modal-copy">Tudo é opcional. Podem juntar fotografias agora ou mais tarde.</p><label className="form-label">Quando foi<input className="form-input" type="date" required max={todayDate} value={memoryDate} onChange={(event) => setMemoryDate(event.target.value)} /></label>{activeIdea && memoryKind(activeIdea.title, activeIdea.category, Boolean(activeIdea.place_id)) === "watch" && <label className="form-label">O que viram?<input className="form-input" list="watched-titles" maxLength={200} placeholder="Nome do filme, série ou anime" value={memoryWatched} onChange={(event) => setMemoryWatched(event.target.value)} /><datalist id="watched-titles">{[...new Set(dates.flatMap((date) => date.watched_title ? [date.watched_title] : []))].map((title) => <option key={title} value={title} />)}</datalist></label>}{activeIdea && memoryKind(activeIdea.title, activeIdea.category, Boolean(activeIdea.place_id)) === "food" && <label className="form-label">O que comeram e beberam?<textarea className="form-input memory-input" maxLength={1000} placeholder="Pratos e bebidas de que se querem lembrar" value={memoryFood} onChange={(event) => setMemoryFood(event.target.value)} /></label>}<label className="form-label">Como foi? <textarea className="form-input memory-input" maxLength={1000} placeholder="Gostaram? O que não querem esquecer?" value={memoryNote} onChange={(event) => setMemoryNote(event.target.value)} /></label><HomeLocationPicker id="memory-home" searchLabel={activeIdea && !activeIdea.at_home && memoryKind(activeIdea.title, activeIdea.category, Boolean(activeIdea.place_id)) === "food" ? "Em que restaurante ou sítio?" : undefined} partnerOneName={couple.partner_one_name} partnerTwoName={couple.partner_two_name} homePartner={memoryHomePartner} value={locationName} onHomePartnerChange={(partner) => { setMemoryHomePartner(partner); setLocationLatitude(null); setLocationLongitude(null); setLocationName(partner ? `Casa de ${partner === "partner_one" ? couple.partner_one_name : couple.partner_two_name}` : ""); }} onLocationChange={(value) => { setLocationName(value); setLocationLatitude(null); setLocationLongitude(null); }} onPlaceSelect={(place) => { setLocationName(place.displayName.slice(0, 160)); setLocationLatitude(place.latitude); setLocationLongitude(place.longitude); }} /><div className="repeat-question"><span className="form-label">Querem repetir?</span><div className="chip-row" role="group" aria-label="Querem repetir?">{([[true, "Sim"], [false, "Não"]] as const).map(([value, label]) => <button type="button" key={label} className={`chip ${memoryRepeat === value ? "selected" : ""}`} aria-pressed={memoryRepeat === value} onClick={() => setMemoryRepeat(memoryRepeat === value ? null : value)}>{label}</button>)}</div></div><label className="photo-upload-button memory-photo-upload">＋ {"Adicionar fotografias"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple disabled={busy} onChange={(event) => void uploadPhotos(event)} /></label>{photoError && <p className="form-alert error-alert" role="alert">{photoError}</p>}{photos.some((photo) => photo.date_id === activeIdeaId) && <div className="memory-upload-previews">{photos.filter((photo) => photo.date_id === activeIdeaId && photo.signed_url).map((photo) => <img key={photo.id} src={photo.signed_url ?? ""} alt={"Fotografia do date enviada"} />)}</div>}<button className="modal-submit" type="submit" disabled={busy}>{busy ? "A guardar…" : editingMemory ? "Guardar alterações" : "Guardar nas memórias"} <span>→</span></button>{editingMemory && <button type="button" className="button button-ghost memory-undo" disabled={busy} onClick={() => void undoCompleted()}>Afinal ainda não fizemos</button>}</form>
            : <form className="idea-editor-form" onSubmit={(event) => void addIdea(event)}><p className="modal-copy">{modal === "edit" ? "Atualizem os detalhes desta ideia." : "Adicionem uma ideia com os detalhes que a Nossia usa para encontrar boas sugestões."}</p><label className="form-label" htmlFor="idea-title">A vossa ideia<input className="form-input" id="idea-title" autoFocus placeholder={"ex.: Ver as estrelas numa noite de verão"} value={newTitle} onChange={(event) => setNewTitle(event.target.value)} required maxLength={70} /></label><label className="form-label" htmlFor="idea-description">Descrição<textarea className="form-input idea-description-input" id="idea-description" value={newDescription} onChange={(event) => setNewDescription(event.target.value)} maxLength={500} /></label><label className="form-label" htmlFor="idea-activity">O que vão fazer<select className="form-input" id="idea-activity" value={newActivity} onChange={(event) => setNewActivity(event.target.value as Activity)}>{activities.map((item) => <option key={item.value} value={item.value}>{item.emoji} {item.label}</option>)}</select></label><label className="idea-special-check"><input type="checkbox" checked={newSpecial} onChange={(event) => setNewSpecial(event.target.checked)} /> Especial: boa para um aniversário ou uma ocasião</label><div className="form-grid idea-detail-grid"><label className="form-label" htmlFor="idea-duration">Duração<select className="form-input" id="idea-duration" value={newDuration} onChange={(event) => setNewDuration(event.target.value)}><option value="60">Até 1 hora</option><option value="90">1–2 {"horas"}</option><option value="180">2–4 {"horas"}</option><option value="300">Meio dia ou mais</option></select></label><label className="form-label" htmlFor="idea-budget">Orçamento para dois<select className="form-input" id="idea-budget" value={newBudget} onChange={(event) => setNewBudget(event.target.value)}><option value="0">Gratuito</option><option value="10">Até 10 €</option><option value="30">Até 30 €</option><option value="60">Até 60 €</option></select></label></div><label className="form-label" htmlFor="idea-travel">Tempo de viagem (ida)<select className="form-input" id="idea-travel" value={newTravel} onChange={(event) => setNewTravel(event.target.value)} disabled={newAtHome}><option value="">Desconhecido / sem limite</option><option value="15">Até 15 min</option><option value="30">Até 30 min</option><option value="60">Até 1 hora</option><option value="120">Mais de 1 hora</option></select></label><label className="home-date-option"><input type="checkbox" checked={newAtHome} onChange={(event) => { setNewAtHome(event.target.checked); if (event.target.checked) { setNewTravel("0"); setNewWeatherSetting("indoor"); } else if (newTravel === "0") { setNewTravel(""); } }} />Esta ideia pode ser feita em casa</label><label className="form-label" htmlFor="idea-weather-setting">Adequação ao tempo<select className="form-input" id="idea-weather-setting" value={newWeatherSetting} onChange={(event) => setNewWeatherSetting(event.target.value as WeatherSetting)}><option value="any">Adequada a qualquer tempo</option><option value="indoor">Interior</option><option value="outdoor">Exterior</option></select></label><button className="modal-submit" type="submit" disabled={busy}>{busy ? "A guardar…" : modal === "edit" ? "Guardar alterações" : "Guardar esta ideia"} <span>→</span></button></form>}
      </section></div>}
    </div>
  );
}

export default App;
