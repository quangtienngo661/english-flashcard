import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { dayRange } from '../../common/time/day-range.js';
import { addDays, dateString, dateValue, localDate, zonedMidnight } from '../../common/time/local-date.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { SettingsService } from '../../settings/index.js';
import { RETENTION_DAY_ZONE, RETENTION_DEFAULT_DAYS } from '../learning.constants.js';
import { cohortRows, todayCounts, weekStart, type CohortRow, type Member } from './retention.js';

export type RetentionView = {
  /** The Monday of the first week listed (the range's `from`, moved back to its Monday). */
  from: string;
  to: string;
  /** *N* of `learning.active_window_days`, as applied to every number below. */
  window_days: number;
  today: { date: string; active: number; stopped: number };
  /** One row per Monday–Sunday registration week from `from`, oldest first; a week nobody registered in has size 0 and nulls. */
  cohorts: CohortRow[];
};

/**
 * How many learners are still learning, and how many registration cohorts kept learning 7 and 30 days after signing up (nhóm B
 * design §10, D36, D39). Everything is computed from rows at read time (E9): nothing is stored per cohort, so a new window
 * setting applies to the past as well. Counts only: no user id, e-mail or personal date leaves this class.
 */
@Injectable()
export class RetentionService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(SettingsService) private readonly settings: SettingsService,
  ) {}

  async report(query: { from?: string; to?: string }, now: Date): Promise<RetentionView> {
    const zone = RETENTION_DAY_ZONE;
    // First: a reversed or too long range is a 400 before anything is read.
    const range = dayRange(query, zone, now, RETENTION_DEFAULT_DAYS);
    const firstWeek = weekStart(range.from);
    const lastWeek = weekStart(range.to);
    const today = localDate(zone, now);
    const [{ learning }, staff] = await Promise.all([this.settings.get(), this.identity.staffUserIds()]);
    const n = learning.activeWindowDays;

    // Members: verified, not staff now (B47). A registration belongs to the Vietnam day of `created_at`, whatever the learner's own zone.
    const registered = await this.identity.registrations(zonedMidnight(zone, firstWeek), zonedMidnight(zone, addDays(lastWeek, 7)));
    const members: Member[] = registered.filter((person) => person.emailVerified && !person.staff)
      .map((person) => ({ userId: person.userId, regDay: localDate(zone, person.createdAt) }));
    const activity = await this.activityOf(members, addDays(firstWeek, 8 - n), addDays(lastWeek, 36));

    const [inWindow, ever] = await Promise.all([
      this.prisma.learningActivityDay.groupBy({
        by: ['userId'], where: { localDate: { gte: dateValue(addDays(today, 1 - n)), lte: dateValue(today) } },
      }),
      this.prisma.learningActivityDay.groupBy({ by: ['userId'] }),
    ]);
    const counts = todayCounts({
      inWindow: inWindow.map((row) => row.userId), ever: ever.map((row) => row.userId), excluded: new Set(staff),
    });
    return {
      from: firstWeek, to: range.to, window_days: n, today: { date: today, ...counts },
      cohorts: cohortRows({ firstWeek, lastWeek, members, activity, today, n }),
    };
  }

  /** The learning days of the members from `from` to `to` (inclusive, `YYYY-MM-DD`): the days D7 and D30 of any member can need. */
  private async activityOf(members: Member[], from: string, to: string): Promise<Map<string, Set<string>>> {
    const activity = new Map<string, Set<string>>();
    if (members.length === 0) return activity;
    const rows = await this.prisma.learningActivityDay.findMany({
      where: { userId: { in: members.map((member) => member.userId) }, localDate: { gte: dateValue(from), lte: dateValue(to) } },
      select: { userId: true, localDate: true },
    });
    for (const row of rows) {
      const days = activity.get(row.userId) ?? new Set<string>();
      days.add(dateString(row.localDate));
      activity.set(row.userId, days);
    }
    return activity;
  }
}
