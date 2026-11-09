export function formatDate(date: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  return new Intl.DateTimeFormat("pt-PT", options).format(new Date(`${date.slice(0, 10)}T12:00:00`));
}

export function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function nextAnniversary(relationshipDate: string, today = new Date()) {
  const [, month, day] = relationshipDate.slice(0, 10).split("-").map(Number);
  const thisYear = new Date(today.getFullYear(), month - 1, day);
  const target = thisYear < new Date(today.getFullYear(), today.getMonth(), today.getDate())
    ? new Date(today.getFullYear() + 1, month - 1, day)
    : thisYear;
  const days = Math.round((Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86_400_000);
  return { date: localDateString(target), days, years: target.getFullYear() - Number(relationshipDate.slice(0, 4)) };
}

export function nextPersonalBirthday(birthDate: string, today = new Date()) {
  const [, month, day] = birthDate.slice(0, 10).split("-").map(Number);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let target = new Date(today.getFullYear(), month - 1, day);
  if (target < startOfToday) target = new Date(today.getFullYear() + 1, month - 1, day);
  const days = Math.round((Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86_400_000);
  return { date: localDateString(target), days };
}

export function relationshipDuration(relationshipDate: string, today = new Date()) {
  const [startYear, startMonth, startDay] = relationshipDate.slice(0, 10).split("-").map(Number);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.max(0, Math.floor((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(startYear, startMonth - 1, startDay)) / 86_400_000));
  let months = Math.max(0, (end.getFullYear() - startYear) * 12 + end.getMonth() - (startMonth - 1));
  const anniversaryMonth = new Date(startYear, startMonth - 1 + months, 1);
  const lastDayOfMonth = new Date(anniversaryMonth.getFullYear(), anniversaryMonth.getMonth() + 1, 0).getDate();
  anniversaryMonth.setDate(Math.min(startDay, lastDayOfMonth));
  if (anniversaryMonth > end) months -= 1;
  return { days, months: Math.max(0, months), years: Math.max(0, months) / 12 };
}
