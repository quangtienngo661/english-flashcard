import type { HistoryItem } from '../practice/practice-api';
import type { CalendarDayView, DayItem, PracticeSessionOfDay } from './calendar-api';

export type DayViewModel = {
  learned: DayItem[];
  known: DayItem[];
  again: DayItem[];
  /** In `practice_sessions[]` order; each session's answers in the API order (newest first). */
  sessions: { session: PracticeSessionOfDay; answers: HistoryItem[] }[];
};

/** The Ngày dialog's lists from the loaded pages of `GET /v1/me/calendar/days/:date` and `GET /v1/practice/history?date=`. */
export function dayView(dayPages: CalendarDayView[], answerPages: HistoryItem[][]): DayViewModel {
  const items = dayPages.flatMap((page) => page.items);
  const answers = answerPages.flat();
  const sessions = dayPages[0]?.practice_sessions ?? [];
  return {
    learned: items.filter((item) => item.kind === 'learned'),
    known: items.filter((item) => item.kind === 'reviewed' && item.result === 'known'),
    again: items.filter((item) => item.kind === 'reviewed' && item.result === 'again'),
    sessions: sessions.map((session) => ({ session, answers: answers.filter((a) => a.session_id === session.session_id) })),
  };
}
