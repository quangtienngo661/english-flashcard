'use client';

import { useInfiniteQuery, useQuery, type QueryClient } from '@tanstack/react-query';
import { useApi } from '@/app-shell/session/session-context';
import type { HistoryItem } from '../practice/practice-api';

/** `GET /v1/me/streak` (design §10.2). */
export type Streak = { days: number; studied_today: boolean };

/** `GET /v1/me/calendar?month=` (design §10.2): only days with a count above 0, ascending. */
export type CalendarDay = { date: string; learned: number; reviewed: number; practice_sessions: number };
export type CalendarMonth = {
  month: string;
  days: CalendarDay[];
  totals: { study_days: number; learned: number; reviewed: number; practice_sessions: number };
};

/** One word of a day: `lemma` null when its sense is no longer visible; `group_id` null when the last action was practice. */
export type DayItem = {
  kind: 'learned' | 'reviewed';
  item_id: string;
  lemma: string | null;
  group_id: string | null;
  result: 'known' | 'again' | null;
  times: number;
};
export type PracticeSessionOfDay = { session_id: string; first_position: number; last_position: number; questions: number; correct: number };
/** `GET /v1/me/calendar/days/:date` (design §10.2, §10.5): `counts` are whole-day totals and never change with `kind`. */
export type CalendarDayView = {
  date: string;
  counts: { learned: number; reviewed: number; reviewed_known: number; reviewed_again: number; learned_groups: number; practice_questions: number };
  items: DayItem[];
  practice_sessions: PracticeSessionOfDay[];
  next_page_token: string | null;
};
type HistoryPage = { items: HistoryItem[]; next_page_token: string | null };

export const STREAK_KEY = ['me', 'streak'] as const;
export const calendarMonthKey = (month: string) => ['me', 'calendar', month] as const;
export const calendarDayKey = (date: string) => ['me', 'calendar', 'day', date] as const;
export const dayAnswersKey = (date: string) => ['practice', 'history', date] as const;

const PAGE = 100;
const token = (pageParam: string) => (pageParam ? `&page_token=${encodeURIComponent(pageParam)}` : '');

/** A tab left open past midnight corrects itself on focus (M6 code C R5). */
export function useStreak() {
  const api = useApi();
  return useQuery({ queryKey: STREAK_KEY, queryFn: () => api.get<Streak>('/v1/me/streak'), staleTime: 60_000, refetchOnWindowFocus: true });
}

export function useCalendarMonth(month: string, enabled = true) {
  const api = useApi();
  return useQuery({ queryKey: calendarMonthKey(month), queryFn: () => api.get<CalendarMonth>(`/v1/me/calendar?month=${month}`), enabled });
}

export function useCalendarDay(date: string, enabled = true) {
  const api = useApi();
  return useInfiniteQuery({
    queryKey: calendarDayKey(date),
    queryFn: ({ pageParam }) => api.get<CalendarDayView>(`/v1/me/calendar/days/${date}?kind=all&page_size=${PAGE}${token(pageParam)}`),
    initialPageParam: '',
    getNextPageParam: (last) => last.next_page_token ?? undefined,
    enabled,
  });
}

/** The day's graded practice answers, newest first; the Ngày dialog groups them by `session_id`. */
export function useDayAnswers(date: string, enabled = true) {
  const api = useApi();
  return useInfiniteQuery({
    queryKey: dayAnswersKey(date),
    queryFn: ({ pageParam }) => api.get<HistoryPage>(`/v1/practice/history?date=${date}&page_size=${PAGE}${token(pageParam)}`),
    initialPageParam: '',
    getNextPageParam: (last) => last.next_page_token ?? undefined,
    enabled,
  });
}

/** The answer that started the learner's day carries the streak: write it instead of asking again (design §10.5). */
export function writeStreak(client: QueryClient, days: number) {
  client.setQueryData<Streak>(STREAK_KEY, { days, studied_today: true });
}
