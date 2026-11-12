// A date marked by one of them is a proposal until the other says yes, or moves it to another day.

export type ProposalEvent = "proposed" | "moved" | "accepted";
export type Proposable = { id: string; status: string; planned_for: string | null; proposal?: "proposed" | "confirmed"; proposed_by?: string | null };

export function isProposal(date: Proposable) {
  return date.status === "planned" && date.proposal === "proposed";
}

// Proposals the other one made that this person still has to answer, soonest first.
export function proposalsForMe<T extends Proposable>(dates: T[], me: string, today: string): T[] {
  return dates
    .filter((date) => isProposal(date) && date.proposed_by !== me && date.planned_for !== null && date.planned_for >= today)
    .sort((first, second) => (first.planned_for ?? "").localeCompare(second.planned_for ?? ""));
}

// This person proposed it and the other hasn't answered yet.
export function waitingOnPartner(date: Proposable, me: string) {
  return isProposal(date) && date.proposed_by === me;
}

const dayFormat = new Intl.DateTimeFormat("pt-PT", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

export function whenText(date: string, time: string | null) {
  const day = dayFormat.format(new Date(`${date}T12:00:00Z`));
  return time ? `${day}, ${time.slice(0, 5)}` : day;
}

// What the other one reads in the notification.
export function proposalMessage(event: ProposalEvent, from: string, title: string, date: string, time: string | null) {
  const when = whenText(date, time);
  if (event === "proposed") return { title: `💌 ${from} propôs um date`, body: `${title} · ${when}. Aceitas?` };
  if (event === "moved") return { title: `📅 ${from} sugeriu outro dia`, body: `${title} · ${when}. Fica bem?` };
  return { title: `✅ ${from} aceitou o date`, body: `${title} · ${when}` };
}

// When a date is over enough to ask how it went: an hour after it should have ended.
export function askHowItWentAt(date: string, startTime: string | null, durationMinutes: number | null) {
  if (!startTime) return null;
  const [hours, minutes] = startTime.split(":").map(Number);
  return { date, minutes: hours * 60 + minutes + Math.max(durationMinutes ?? 120, 60) + 60 };
}
