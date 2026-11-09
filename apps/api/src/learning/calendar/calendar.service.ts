import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { dateString, dateValue } from '../../common/time/local-date.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { PRACTICE_DAY_COUNTS, type PracticeDayCounts } from '../practice-day-counts.port.js';
import { aggregateMonth, type CalendarMonthView, monthBounds, type ReviewRow } from './calendar.js';
import { type ReviewRowSql, reviewRowsQuery } from './calendar.queries.js';

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
}
