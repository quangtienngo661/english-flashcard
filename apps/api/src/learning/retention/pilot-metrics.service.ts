import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { dayRange } from '../../common/time/day-range.js';
import { addDays, dateString, localDate, zonedMidnight } from '../../common/time/local-date.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { RETENTION_DAY_ZONE, RETENTION_DEFAULT_DAYS } from '../learning.constants.js';
import { isActivated, weekRows, type PilotWeekRow, type RecallLevelRow } from './pilot-metrics.js';
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

type RecallSqlRow = {
  level: number | bigint;
  due_answers: number | bigint;
  remembered: number | bigint;
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
    const today = localDate(zone, now);
    const firstWeek = weekStart(range.from);
    const lastWeek = weekStart(range.to);
    const rangeStart = zonedMidnight(zone, range.from);
    const rangeEnd = zonedMidnight(zone, addDays(range.to, 1));
    const weeksStart = zonedMidnight(zone, firstWeek);
    const weeksEnd = zonedMidnight(zone, addDays(lastWeek, 7));

    const [registered, staffIds] = await Promise.all([
      this.identity.registrations(weeksStart, weeksEnd),
      this.identity.staffUserIds(),
    ]);

    const weekMembers = registered
      .filter((person) => person.emailVerified && !person.staff)
      .map((person) => ({ userId: person.userId, regDay: localDate(zone, person.createdAt) }));
    const inRangeMembers = weekMembers.filter((m) => m.regDay >= range.from && m.regDay <= range.to);
    // Only members whose day +1 has already finished (Vietnam date) are activation-eligible, so last-day sign-ups do not drag the rate down.
    const activationEligible = inRangeMembers.filter((m) => addDays(m.regDay, 1) < today);
    const memberIds = inRangeMembers.map((m) => m.userId);
    // Exclude staff accounts from orders and practice sessions; the owner's own non-staff test purchases still count.
    const staffFilter = staffIds.length > 0 ? { userId: { notIn: staffIds } } : {};

    const [orders, totalSessions, aiSessions, firstStudyRows, recallRows] = await Promise.all([
      this.prisma.billingOrder.findMany({
        where: { createdAt: { gte: weeksStart, lt: weeksEnd }, ...staffFilter },
        select: { createdAt: true, status: true },
      }),
      this.prisma.practiceSession.count({
        where: { startedAt: { gte: rangeStart, lt: rangeEnd }, ...staffFilter },
      }),
      this.prisma.practiceSession.count({
        where: { startedAt: { gte: rangeStart, lt: rangeEnd }, aiPlanned: { gt: 0 }, ...staffFilter },
      }),
      activationEligible.length > 0
        ? this.prisma.learningActivityDay.groupBy({
            by: ['userId'],
            where: { userId: { in: activationEligible.map((m) => m.userId) }, studied: true },
            _min: { localDate: true },
          })
        : Promise.resolve([]),
      memberIds.length > 0
        ? this.prisma.$queryRaw<RecallSqlRow[]>`
            SELECT
              level_before AS level,
              count(*)::int AS due_answers,
              count(*) FILTER (WHERE level_after > level_before)::int AS remembered
            FROM learning_log
            WHERE kind = 'review'
              AND was_due = true
              AND level_before IS NOT NULL
              AND level_after IS NOT NULL
              AND local_date >= ${range.from}::date
              AND local_date <= ${range.to}::date
              AND user_id = ANY(${memberIds}::uuid[])
            GROUP BY level_before
            ORDER BY level_before ASC
          `
        : Promise.resolve([] as RecallSqlRow[]),
    ]);

    // Member `regDay` is a Vietnam date (Asia/Ho_Chi_Minh), while `learning_activity_days.local_date` is stored in the learner's own zone
    // (matching retention's existing convention; for learners outside UTC+7 the +1 comparison can be off by one day).
    let activated = 0;
    if (activationEligible.length > 0) {
      const firstByUser = new Map<string, string>();
      for (const row of firstStudyRows) {
        if (row._min.localDate) firstByUser.set(row.userId, dateString(row._min.localDate));
      }
      for (const member of activationEligible) {
        if (isActivated(member.regDay, firstByUser.get(member.userId) ?? null)) activated += 1;
      }
    }

    const weeks = weekRows({
      firstWeek,
      lastWeek,
      members: weekMembers,
      orders: orders.map((o) => ({ day: localDate(zone, o.createdAt), paid: o.status === 'paid' })),
    });

    const recall_by_level: RecallLevelRow[] = recallRows.map((row) => ({
      level: Number(row.level),
      due_answers: Number(row.due_answers),
      remembered: Number(row.remembered),
    }));

    return {
      from: range.from,
      to: range.to,
      members: activationEligible.length,
      activated,
      weeks,
      ai_sessions: { sessions: totalSessions, with_ai: aiSessions },
      recall_by_level,
    };
  }
}
