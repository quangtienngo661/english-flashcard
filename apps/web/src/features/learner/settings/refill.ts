/** Today's date (`YYYY-MM-DD`) in `timeZone`. */
function localDay(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

/**
 * D15: a refill today or tomorrow (in the learner's zone) is told by the clock ("mở lại lúc 0:00"), a later one by the date
 * ("mới có vào 15/11").
 */
export function refillKind(resetsAt: string, now: Date, timeZone: string): 'time' | 'date' {
  const tomorrow = localDay(new Date(now.getTime() + 24 * 60 * 60 * 1000), timeZone);
  return localDay(new Date(resetsAt), timeZone) <= tomorrow ? 'time' : 'date';
}
