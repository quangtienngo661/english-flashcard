import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { SettingsService } from '../../settings/index.js';
import type { NoticeKind } from '../entitlements.types.js';

const DAY_MS = 86_400_000;

/**
 * Creates the `pending` rows of the entitlement emails that are due (design §14, R9); the unique
 * `(kind, subject_key, period_key, recipient_user_id)` makes every run idempotent. `trial_started` rows come from the applier.
 * No `expiry_notice` (D35), no cap alert (D36).
 */
@Injectable()
export class NoticePlanner {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(SettingsService) private readonly settings: SettingsService,
  ) {}

  async plan(now: Date): Promise<number> {
    const { trialReminderDaysBefore, renewalNoticeDaysBefore } = (await this.settings.get()).entitlements;
    const rows: Array<{ kind: NoticeKind; id: string; userId: string; end: Date; days: number }> = [];

    const trials = await this.prisma.subscription.findMany({
      where: { status: 'trialing', trialDenied: false, trialEndsAt: { gt: now, lte: addDays(now, trialReminderDaysBefore) } },
      select: { id: true, userId: true, trialEndsAt: true },
    });
    for (const sub of trials) rows.push({ kind: 'trial_reminder', id: sub.id, userId: sub.userId, end: sub.trialEndsAt!, days: trialReminderDaysBefore });

    // D29: off while the setting is null.
    if (renewalNoticeDaysBefore !== null) {
      const renewals = await this.prisma.subscription.findMany({
        where: { status: 'active', cancelAtPeriodEnd: false, currentPeriodEnd: { gt: now, lte: addDays(now, renewalNoticeDaysBefore) } },
        select: { id: true, userId: true, currentPeriodEnd: true },
      });
      for (const sub of renewals) {
        rows.push({ kind: 'renewal_notice', id: sub.id, userId: sub.userId, end: sub.currentPeriodEnd!, days: renewalNoticeDaysBefore });
      }
    }
    if (rows.length === 0) return 0;

    const created = await this.prisma.entitlementNotice.createMany({
      data: rows.map((row) => ({
        userId: row.userId,
        recipientUserId: row.userId,
        kind: row.kind,
        subjectKey: row.id,
        periodKey: row.end.toISOString(),
        state: 'pending',
        dueAt: addDays(row.end, -row.days),
        windowEndsAt: row.end,
      })),
      skipDuplicates: true,
    });
    return created.count;
  }
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}
