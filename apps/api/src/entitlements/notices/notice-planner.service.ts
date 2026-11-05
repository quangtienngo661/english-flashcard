import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { SettingsService } from '../../settings/index.js';
import type { NoticeKind } from '../entitlements.types.js';
import { coveredBeyond } from '../orders/period-window.js';
import { proSpans } from '../rules/pro-spans.js';
import { SourcesRepository } from '../sources/sources.repository.js';

const DAY_MS = 86_400_000;

/**
 * Creates the `pending` rows of the entitlement emails that are due (design §14, R9); the unique
 * `(kind, subject_key, period_key, recipient_user_id)` makes every run idempotent. `trial_started` rows come from the applier, and so do the
 * `payment_receipt` rows of a prepaid purchase. `expiry_notice` (launch prep B design §3.10) is for the last prepaid period of a learner:
 * a period that Pro goes on after (a later period or a grant) gets none. No cap alert (D36).
 */
@Injectable()
export class NoticePlanner {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(SourcesRepository) private readonly sources: SourcesRepository,
  ) {}

  async plan(now: Date): Promise<number> {
    const { trialReminderDaysBefore, renewalNoticeDaysBefore } = (await this.settings.get()).entitlements;
    const rows: Array<{ kind: NoticeKind; id: string; userId: string; end: Date; days: number }> = [];

    const trials = await this.prisma.subscription.findMany({
      where: { status: 'trialing', trialDenied: false, trialEndsAt: { gt: now, lte: addDays(now, trialReminderDaysBefore) } },
      select: { id: true, userId: true, trialEndsAt: true },
    });
    for (const sub of trials) rows.push({ kind: 'trial_reminder', id: sub.id, userId: sub.userId, end: sub.trialEndsAt!, days: trialReminderDaysBefore });

    // Always on since Q8 (owner 02/11/2026; D29 had it off by default).
    const renewals = await this.prisma.subscription.findMany({
      where: { status: 'active', cancelAtPeriodEnd: false, currentPeriodEnd: { gt: now, lte: addDays(now, renewalNoticeDaysBefore) } },
      select: { id: true, userId: true, currentPeriodEnd: true },
    });
    for (const sub of renewals) {
      rows.push({ kind: 'renewal_notice', id: sub.id, userId: sub.userId, end: sub.currentPeriodEnd!, days: renewalNoticeDaysBefore });
    }

    // The setting is shared with the renewal notice (Q-B5). A period still in the future whose end is within the window and that nothing follows.
    const periods = await this.prisma.prepaidPeriod.findMany({
      where: { revokedAt: null, endsAt: { gt: now, lte: addDays(now, renewalNoticeDaysBefore) } },
      select: { id: true, userId: true, endsAt: true },
    });
    if (periods.length > 0) {
      const loaded = await this.sources.loadMany(this.prisma, [...new Set(periods.map((period) => period.userId))], now);
      for (const period of periods) {
        const sources = loaded.get(period.userId);
        if (sources !== undefined && coveredBeyond(proSpans(sources.grants, sources.prepaidPeriods), period.endsAt, now)) continue;
        rows.push({ kind: 'expiry_notice', id: period.id, userId: period.userId, end: period.endsAt, days: renewalNoticeDaysBefore });
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
