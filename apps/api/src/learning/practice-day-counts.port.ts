export const PRACTICE_DAY_COUNTS = 'LEARNING_PRACTICE_DAY_COUNTS';

/** Graded practice answers (`correct`/`wrong`, sessions of kind `practice`) on one local day. */
export type PracticeDayCount = { date: string; sessions: number; questions: number; correct: number };

/** One practice session's graded answers on one local day. */
export type PracticeDaySession = {
  sessionId: string;
  firstPosition: number;
  lastPosition: number;
  questions: number;
  correct: number;
};

/**
 * Practice supplies this port without Learning importing Practice (design giao diện mới §10.2): the study calendar reads
 * practice counts per local day. Learning injects it without `@Optional()`, so a missing provider stops the app at boot.
 */
export interface PracticeDayCounts {
  countByLocalDate(userId: string, from: string, to: string): Promise<PracticeDayCount[]>;
  sessionsOfDay(userId: string, date: string): Promise<PracticeDaySession[]>;
}
