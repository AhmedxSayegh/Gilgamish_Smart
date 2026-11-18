export function bookingToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function earliestEnd(start, today) {
  const base = /^\d{4}-\d{2}-\d{2}$/.test(start) && start >= today && Number.isFinite(Date.parse(start)) ? start : today;
  return new Date(Date.parse(base) + 86400000).toISOString().slice(0, 10);
}
