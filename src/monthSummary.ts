// The month that just ended, in a few lines: what they did, what they loved, where they went.

const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export type MonthDate = { id: string; title: string; emoji: string; status: string; completed_at: string | null; rating: number | null; location_name: string | null };
export type MonthSummary = {
  month: string;
  label: string;
  done: number;
  loved: number;
  favorite: { title: string; emoji: string } | null;
  places: number;
  trips: string[];
  photos: number;
};

export function previousMonth(today: string) {
  const [year, month] = today.split("-").map(Number);
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
}

export function monthSummary(month: string, dates: MonthDate[], trips: Array<{ title: string; end_date: string }>, photosByDate: Map<string, number>): MonthSummary | null {
  const done = dates.filter((date) => date.status === "completed" && date.completed_at?.startsWith(month));
  const tripsEnded = trips.filter((trip) => trip.end_date.startsWith(month)).map((trip) => trip.title);
  if (done.length === 0 && tripsEnded.length === 0) return null;
  // The favourite is the best rated, and among equals the most recent.
  const favorite = [...done].filter((date) => date.rating !== null).sort((first, second) => (second.rating ?? 0) - (first.rating ?? 0) || (second.completed_at ?? "").localeCompare(first.completed_at ?? ""))[0];
  return {
    month,
    label: monthNames[Number(month.slice(5, 7)) - 1],
    done: done.length,
    loved: done.filter((date) => date.rating === 5).length,
    favorite: favorite ? { title: favorite.title, emoji: favorite.emoji } : null,
    places: new Set(done.flatMap((date) => date.location_name?.trim() ? [date.location_name.trim().toLocaleLowerCase("pt-PT")] : [])).size,
    trips: tripsEnded,
    photos: done.reduce((total, date) => total + (photosByDate.get(date.id) ?? 0), 0),
  };
}

// One line for the notification and the card: "4 dates, 2 😍 e uma viagem a Barcelona".
export function summaryLine(summary: MonthSummary) {
  const parts = [
    summary.done ? `${summary.done} ${summary.done === 1 ? "date" : "dates"}` : "",
    summary.loved ? `${summary.loved} 😍` : "",
    summary.trips.length ? (summary.trips.length === 1 ? `uma viagem a ${summary.trips[0]}` : `${summary.trips.length} viagens`) : "",
  ].filter(Boolean);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}` : parts[0] ?? "";
}
