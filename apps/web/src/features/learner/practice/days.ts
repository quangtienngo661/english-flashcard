/** The local date (`YYYY-MM-DD`) of `at` in `timeZone` (the learner's zone, Review Focus 3). */
export function localDay(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}
