export type Category = "Romantic" | "Adventure" | "Food & drink" | "Creative" | "Relaxing" | "Culture";
export type Status = "idea" | "planned" | "completed";
export type Mood = "Romantic" | "Fun" | "Relaxing" | "Adventure" | "Creative" | "Surprise me";
export type FeelingAnswers = {
  mood: Mood;
  duration: "1" | "2" | "3" | "4";
  budget: "1" | "2" | "3" | "4";
  distance: "1" | "2" | "3" | "4";
  avoid: string;
};

export type DateIdea = {
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
  latitude: number | null;
  longitude: number | null;
  mood: Mood;
  duration_minutes: number | null;
  budget_eur: number | null;
  travel_minutes: number | null;
  at_home: boolean;
  source_template_id: string | null;
};

export type GeocodedPlace = {
  displayName: string;
  latitude: number;
  longitude: number;
};
