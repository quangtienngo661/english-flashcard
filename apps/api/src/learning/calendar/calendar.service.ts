import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { decodeBoundToken, encodeBoundToken } from '../../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { dateString, dateValue } from '../../common/time/local-date.js';
import { ContentService, type Learner } from '../../content/index.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { PRACTICE_DAY_COUNTS, type PracticeDayCounts } from '../practice-day-counts.port.js';
import {
  aggregateDay,
  aggregateMonth,
  type CalendarMonthView,
  type DayCursor,
  type DayKind,
  monthBounds,
  pageAfter,
  type ReviewRow,
} from './calendar.js';
import { type ReviewRowSql, reviewRowsQuery } from './calendar.queries.js';
import type { CalendarDayQuery } from './calendar.schemas.js';

export type CalendarDayView = {
  date: string;
  counts: {
    learned: number;
    reviewed: number;
    reviewed_known: number;
    reviewed_again: number;
    learned_groups: number;
    practice_questions: number;
  };
  items: {
    kind: DayKind;
    item_id: string;
    lemma: string | null;
    group_id: string | null;
    result: 'known' | 'again' | null;
    times: number;
  }[];
  practice_sessions: {
    session_id: string;
    first_position: number;
    last_position: number;
    questions: number;
    correct: number;
  }[];
  next_page_token: string | null;
};

// The same 400 as the practice history's bad token (`history.service.ts`); Learning cannot import Practice, so it is copied.
const invalidInput = () =>
  new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });

function cursorOf(payload: Record<string, string | number> | null): DayCursor | null {
  if (payload === null) return null;
  const { at, id, k } = payload;
  if (typeof at !== 'string' || typeof id !== 'string' || (k !== 'learned' && k !== 'reviewed')) return null;
  if (Number.isNaN(new Date(at).getTime())) return null;
  return { at, id, k };
}

export function toReviewRow(row: ReviewRowSql): ReviewRow {
  return {
    localDate: dateString(row.local_date),
    itemId: row.item_id,
    senseId: row.sense_id,
    groupId: row.group_id,
    levelBefore: row.level_before,
    levelAfter: row.level_after,
    rating: row.rating,
    at: row.at,
  };
}

/** The study calendar (design giao diện mới §10.2): Learning's log, plus Practice counts through its port. */
@Injectable()
export class CalendarService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    // Not @Optional(): without Practice's provider the app must not start (a calendar of zeros would look true).
    @Inject(PRACTICE_DAY_COUNTS) private readonly practice: PracticeDayCounts,
    @Inject(ContentService) private readonly content: ContentService,
  ) {}

  async month(userId: string, month: string): Promise<CalendarMonthView> {
    const { from, to } = monthBounds(month);
    const [rows, practice, studyDays] = await Promise.all([
      this.prisma.$queryRaw<ReviewRowSql[]>(reviewRowsQuery(userId, from, to)),
      this.practice.countByLocalDate(userId, from, to),
      this.prisma.learningActivityDay.count({
        where: { userId, studied: true, localDate: { gte: dateValue(from), lte: dateValue(to) } },
      }),
    ]);
    return aggregateMonth(month, rows.map(toReviewRow), practice, studyDays);
  }

  /** One day: whole-day counts whatever `kind` is, one page of items, and the day's practice sessions (§10.2, §10.5). */
  async day(learner: Learner, date: string, query: CalendarDayQuery): Promise<CalendarDayView> {
    const binding = `${date}|${query.kind}`;
    let cursor: DayCursor | null = null;
    if (query.page_token !== undefined) {
      cursor = cursorOf(decodeBoundToken(query.page_token, binding));
      if (cursor === null) throw invalidInput();
    }
    const [rows, sessions] = await Promise.all([
      this.prisma.$queryRaw<ReviewRowSql[]>(reviewRowsQuery(learner.userId, date, date)),
      this.practice.sessionsOfDay(learner.userId, date),
    ]);
    const { counts, items } = aggregateDay(rows.map(toReviewRow));
    const { page, next } = pageAfter(items, query.kind, cursor, query.page_size);
    const senseIds = [...new Set(page.map((i) => i.senseId))];
    const cards =
      senseIds.length === 0
        ? new Map<string, { lemma: string }>()
        : await this.content.cardContent(learner.userId, senseIds, learner.nativeLanguage);
    return {
      date,
      counts: { ...counts, practice_questions: sessions.reduce((sum, s) => sum + s.questions, 0) },
      items: page.map((i) => ({
        kind: i.kind,
        item_id: i.itemId,
        lemma: cards.get(i.senseId)?.lemma ?? null,
        group_id: i.groupId,
        result: i.result,
        times: i.times,
      })),
      practice_sessions: sessions.map((s) => ({
        session_id: s.sessionId,
        first_position: s.firstPosition,
        last_position: s.lastPosition,
        questions: s.questions,
        correct: s.correct,
      })),
      next_page_token: next ? encodeBoundToken(next, binding) : null,
    };
  }
}
