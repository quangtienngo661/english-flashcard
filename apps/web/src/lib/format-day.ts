/** `2026-11-10` as `10/11/2026`: a calendar day, so no time zone is involved. */
export function formatDay(day: string): string {
  const [year, month, date] = day.split('-');
  return `${date}/${month}/${year}`;
}
