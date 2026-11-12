// The secret gift list: when the next occasions are, so ideas saved during the year are ready in time.

export type GiftIdea = { id: string; couple_id: string; owner: string; title: string; url: string | null; note: string; bought_at: string | null; created_at: string };
export type Occasion = { key: string; label: string; date: string; days: number };

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000);
}

function nextYearly(monthDay: string, today: string) {
  const year = Number(today.slice(0, 4));
  const thisYear = `${year}-${monthDay}`;
  return thisYear >= today ? thisYear : `${year + 1}-${monthDay}`;
}

// The other one's birthday, the anniversary and Christmas, soonest first.
export function giftOccasions(input: { partnerName: string; partnerBirthDate: string | null; relationshipDate: string | null }, today: string): Occasion[] {
  const occasions: Occasion[] = [];
  if (input.partnerBirthDate) {
    const date = nextYearly(input.partnerBirthDate.slice(5, 10), today);
    occasions.push({ key: "birthday", label: `Anos de ${input.partnerName}`, date, days: daysBetween(today, date) });
  }
  if (input.relationshipDate) {
    const date = nextYearly(input.relationshipDate.slice(5, 10), today);
    occasions.push({ key: "anniversary", label: "Aniversário de namoro", date, days: daysBetween(today, date) });
  }
  const christmas = nextYearly("12-25", today);
  occasions.push({ key: "christmas", label: "Natal", date: christmas, days: daysBetween(today, christmas) });
  return occasions.sort((first, second) => first.days - second.days);
}
