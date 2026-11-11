// The old history page's addresses (design §10.4). Server code: no client module, so the day check is done here.
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (value: string) =>
  DAY.test(value) && value >= '2026-01-01' && value <= '2100-12-31' && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

/** `?tab=reports` → Báo lỗi của tôi; a valid `?date=` → that day's dialog; anything else → Lịch of the current month. */
export function historyTarget(locale: string, search: URLSearchParams): string {
  if (search.get('tab') === 'reports') return `/${locale}/app/settings/reports`;
  const date = search.get('date');
  return date !== null && isDay(date) ? `/${locale}/app/practice?ngay=${date}` : `/${locale}/app/practice?lich`;
}
