export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addMonths(iso: string, months: number): string {
  const d = new Date(`${iso}T00:00:00`);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, maxDay));
  return d.toISOString().slice(0, 10);
}

export function addYears(iso: string, years: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

export function nextOccurrence(freq: string, from: string): string {
  switch (freq) {
    case "daily":
      return addDays(from, 1);
    case "weekly":
      return addDays(from, 7);
    case "biweekly":
      return addDays(from, 14);
    case "monthly":
      return addMonths(from, 1);
    case "quarterly":
      return addMonths(from, 3);
    case "yearly":
      return addYears(from, 1);
    default:
      return from;
  }
}

export function monthsBetween(a: string, b: string): number {
  const d1 = new Date(`${a}T00:00:00`);
  const d2 = new Date(`${b}T00:00:00`);
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function daysAgoISO(days: number): string {
  return addDays(todayISO(), -days);
}