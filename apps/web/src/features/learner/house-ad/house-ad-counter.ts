// How often the Pro introduction dialog may show (launch prep B design §4.2). The server does not know when it showed, so the browser counts,
// per learner, in localStorage. Pure here: the clock and the zone come in; storage failures are values, not exceptions.

/** The count of one learner on one device: the day (their zone), how many times it showed that day, and when it last showed. */
export type Counter = { date: string; count: number; last_at: number };

export const houseAdKey = (userId: string) => `wordmet-web.house-ad.${userId}`;

/** `YYYY-MM-DD` of the instant in the zone. */
export function localDay(zone: string, at: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

/**
 * Show it when fewer than `perDay` have shown today and the last one was at least `minIntervalMinutes` ago. A counter from another day counts
 * as no show today (the day turns at 00:00 in the learner's zone); `perDay` 0 means never.
 */
export function shouldShowHouseAd(input: { counter: Counter | null; now: Date; zone: string; perDay: number; minIntervalMinutes: number }): boolean {
  const { counter, now, zone, perDay, minIntervalMinutes } = input;
  if (perDay <= 0) return false;
  if (counter === null) return true;
  const shownToday = counter.date === localDay(zone, now) ? counter.count : 0;
  if (shownToday >= perDay) return false;
  return now.getTime() - counter.last_at >= minIntervalMinutes * 60_000;
}

const isCounter = (value: unknown): value is Counter => {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.date === 'string' && typeof record.count === 'number' && typeof record.last_at === 'number';
};

/** `null` when nothing is stored; `'unreadable'` when storage throws or holds something else: better to lose one introduction than to show it every time. */
export function readCounter(userId: string): Counter | null | 'unreadable' {
  try {
    const raw = localStorage.getItem(houseAdKey(userId));
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCounter(parsed) ? parsed : 'unreadable';
  } catch {
    return 'unreadable';
  }
}

/** False when the browser refuses the write (private mode, blocked data, quota). */
export function writeCounter(userId: string, counter: Counter): boolean {
  try {
    localStorage.setItem(houseAdKey(userId), JSON.stringify(counter));
    return true;
  } catch {
    return false;
  }
}
