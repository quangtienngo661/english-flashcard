import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { dayRange } from '../../common/time/day-range.js';
import { addDays, dateString, localDate, zonedMidnight } from '../../common/time/local-date.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { RETENTION_DAY_ZONE, RETENTION_DEFAULT_DAYS } from '../learning.constants.js';
import { isActivated, recallByLevel, weekRows, type PilotWeekRow, type RecallLevelRow } from './pilot-metrics.js';
import { weekStart } from './retention.js';

export type PilotMetricsView = {
  from: string;
  to: string;
  members: number;
  activated: number;
  weeks: PilotWeekRow[];
  ai_sessions: { sessions: number; with_ai: number };
  recall_by_level: RecallLevelRow[];
};

@Injectable()
export class PilotMetricsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(IdentityService) private readonly identity: IdentityService,
  ) {}

  async report(query: { from?: string; to?: string }, now: Date): Promise<PilotMetricsView> {
    const zone = RETENTION_DAY_ZONE;
    const range = dayRange(query, zone, now, RETENTION_DEFAULT_DAYS);
    const firstWeek = weekStart(range.from);
    const lastWeek = weekStart(range.to);
    const rangeStart = zonedMidnight(zone, range.from);
    const rangeEnd = zonedMidnight(zone, addDays(range.to, 1));
    const weeksStart = zonedMidnight(zone, firstWeek);
    const weeksEnd = zonedMidnight(zone, addDays(lastWeek, 7));

    const [registered, staffIds, orders, totalSessions, aiSessions, reviewLogs] = await Promise.all([
      this.identity.registrations(weeksStart, weeksEnd),
      this.identity.staffUserIds(),
      this.prisma.billingOrder.findMany({
        where: { createdAt: { gte: weeksStart, lt: weeksEnd } },
        select: { createdAt: true, status: true },
      }),
      this.prisma.practiceSession.count({
        where: { startedAt: { gte: rangeStart, lt: rangeEnd } },
      }),
      this.prisma.practiceSession.count({
        where: { startedAt: { gte: rangeStart, lt: rangeEnd }, aiPlanned: { gt: 0 } },
      }),
      this.prisma.learningLogEntry.findMany({
        where: {
          kind: 'review',
          wasDue: true,
          at: { gte: rangeStart, lt: rangeEnd },
          levelBefore: { not: null },
          levelAfter: { not: null },
        },
        select: { userId: true, levelBefore: true, levelAfter: true },
      }),
    ]);

    const staff = new Set(staffIds);
    const weekMembers = registered
      .filter((person) => person.emailVerified && !person.staff)
      .map((person) => ({ userId: person.userId, regDay: localDate(zone, person.createdAt) }));
    const inRangeMembers = weekMembers.filter((m) => m.regDay >= range.from && m.regDay <= range.to);

    let activated = 0;
    if (inRangeMembers.length > 0) {
      const firstStudyRows = await this.prisma.learningActivityDay.groupBy({
        by: ['userId'],
        where: { userId: { in: inRangeMembers.map((m) => m.userId) }, studied: true },
        _min: { localDate: true },
      });
      const firstByUser = new Map<string, string>();
      for (const row of firstStudyRows) {
        if (row._min.localDate) firstByUser.set(row.userId, dateString(row._min.localDate));
      }
      for (const member of inRangeMembers) {
        if (isActivated(member.regDay, firstByUser.get(member.userId) ?? null)) activated += 1;
      }
    }

    const weeks = weekRows({
      firstWeek,
      lastWeek,
      members: weekMembers,
      orders: orders.map((o) => ({ day: localDate(zone, o.createdAt), paid: o.status === 'paid' })),
    });

    const memberReviews = reviewLogs
      .filter((row) => !staff.has(row.userId) && row.levelBefore !== null && row.levelAfter !== null)
      .map((row) => ({ levelBefore: row.levelBefore!, levelAfter: row.levelAfter! }));

    return {
      from: range.from,
      to: range.to,
      members: inRangeMembers.length,
      activated,
      weeks,
      ai_sessions: { sessions: totalSessions, with_ai: aiSessions },
      recall_by_level: recallByLevel(memberReviews),
    };
  }
}
