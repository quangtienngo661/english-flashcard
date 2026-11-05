import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { MailBudget, PAYMENT_MAIL_SHARE } from '../../common/mail/mail-budget.service.js';
import { classifyMailError } from '../../common/mail/mail-error.js';
import { Mailer } from '../../common/mail/mailer.js';
import { MaintenanceScheduler } from '../../common/maintenance/maintenance.scheduler.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import type { NoticeKind } from '../entitlements.types.js';
import { coveredBeyond } from '../orders/period-window.js';
import { proSpans } from '../rules/pro-spans.js';
import { SourcesRepository } from '../sources/sources.repository.js';
import { entitlementMail, type ReceiptData } from './entitlement-mail.js';
import { NoticePlanner } from './notice-planner.service.js';

const SEND_BATCH = 50;

type Claimed = {
  id: string;
  kind: NoticeKind;
  subject_key: string;
  recipient_user_id: string;
  period_key: string;
  window_ends_at: Date;
};

/**
 * Sends due entitlement emails one row at a time (design §14, R9, plan review #5): a short transaction claims one row
 * `FOR UPDATE SKIP LOCKED` and marks it `sending`, then the send runs outside any transaction, as the Bước 3 reminders do.
 * A crash loses at most the one row in `sending`; an `unknown` send error is never retried (losing an email beats sending
 * it twice). Logs carry the notice id, kind, state and error kind only — never the address (SR10).
 */
@Injectable()
export class NoticeSender implements OnModuleInit {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(NoticePlanner) private readonly planner: NoticePlanner,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(MailBudget) private readonly budget: MailBudget,
    @Inject(Mailer) private readonly mailer: Mailer,
    @Inject(MaintenanceScheduler) private readonly scheduler: MaintenanceScheduler,
    @Inject(AppLogger) private readonly logger: AppLogger,
    @Inject(SourcesRepository) private readonly sources: SourcesRepository,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** One job, so one `pnpm maintenance:run` both plans and sends a due email. */
  onModuleInit(): void {
    this.scheduler.register('entitlement-notices', async (now) => {
      await this.planner.plan(now);
      await this.send(now);
    });
  }

  async send(now: Date): Promise<void> {
    for (let i = 0; i < SEND_BATCH; i += 1) {
      const notice = await this.claim(now);
      if (notice === null) return;
      if (notice !== 'skipped') await this.deliver(notice, now);
    }
  }

  /**
   * Claims the next due row; a row past its window, a trial email on a denied trial, or an expiry email for a period that was revoked or that
   * Pro now goes on after (launch prep B design §3.10) is closed as `skipped` here. A receipt has no condition of its own beyond its window.
   */
  private async claim(now: Date): Promise<Claimed | 'skipped' | null> {
    return this.prisma.$transaction(async (tx) => {
      // A row failed in this run has last_error_at = now: it waits for the next run.
      const rows = await tx.$queryRaw<Claimed[]>`
        SELECT id, kind, subject_key, recipient_user_id, period_key, window_ends_at FROM entitlement_notices
        WHERE due_at <= ${now}
          AND (state = 'pending' OR (state = 'failed' AND (last_error_at IS NULL OR last_error_at < ${now})))
        ORDER BY due_at LIMIT 1 FOR UPDATE SKIP LOCKED`;
      if (rows.length === 0) return null;
      const notice = rows[0];
      const skip = async (reason: string) => {
        await tx.entitlementNotice.update({ where: { id: notice.id }, data: { state: 'skipped' } });
        this.logger.info('entitlement_notice_skipped', { notice_id: notice.id, kind: notice.kind, reason });
        return 'skipped' as const;
      };
      if (now >= notice.window_ends_at) return skip('window-passed');
      if (notice.kind === 'trial_started' || notice.kind === 'trial_reminder') {
        const sub = await tx.subscription.findUnique({ where: { id: notice.subject_key }, select: { trialDenied: true } });
        if (sub === null || sub.trialDenied) return skip('trial-denied');
      } else if (notice.kind === 'expiry_notice') {
        const period = await tx.prepaidPeriod.findUnique({ where: { id: notice.subject_key }, select: { endsAt: true, revokedAt: true } });
        if (period === null || period.revokedAt !== null) return skip('period-gone');
        const loaded = await this.sources.load(tx, notice.recipient_user_id, now);
        if (coveredBeyond(proSpans(loaded.grants, loaded.prepaidPeriods), period.endsAt, now)) return skip('covered');
      }
      await tx.entitlementNotice.update({ where: { id: notice.id }, data: { state: 'sending' } });
      return notice;
    });
  }

  private async deliver(notice: Claimed, now: Date): Promise<void> {
    const set = (data: { state: string; sentAt?: Date; lastErrorAt?: Date; attempts?: { increment: number } }) =>
      this.prisma.entitlementNotice.update({ where: { id: notice.id }, data });
    const address = (await this.identity.verifiedEmails([notice.recipient_user_id])).get(notice.recipient_user_id);
    if (address === undefined) {
      await set({ state: 'skipped' });
      this.logger.info('entitlement_notice_skipped', { notice_id: notice.id, kind: notice.kind, reason: 'no-verified-email' });
      return;
    }
    // A receipt is written from the payment it names, read now: a payment or period that is gone (the account was erased) is no email.
    const receipt = notice.kind === 'payment_receipt' ? await this.receiptOf(notice.subject_key) : null;
    if (notice.kind === 'payment_receipt' && receipt === null) {
      await set({ state: 'skipped' });
      this.logger.info('entitlement_notice_skipped', { notice_id: notice.id, kind: notice.kind, reason: 'payment-gone' });
      return;
    }
    if (!(await this.budget.tryConsume({ ceiling: PAYMENT_MAIL_SHARE }))) {
      await set({ state: 'failed', attempts: { increment: 1 }, lastErrorAt: now });
      this.logger.warn('entitlement_notice_failed', { notice_id: notice.id, kind: notice.kind, error_kind: 'budget' });
      return;
    }
    const profile = await this.identity.getProfile(notice.recipient_user_id);
    const language = profile?.native_language ?? 'vi';
    const date = new Date(notice.period_key);
    const plansUrl = `${this.config.learnerAppUrl.replace(/\/+$/, '')}/${language}/app/plans`;
    const mail = entitlementMail(notice.kind, language, {
      trialEndsAt: date, periodEnd: date, timeZone: profile?.timezone, plansUrl, ...(receipt === null ? {} : { receipt }),
    });
    try {
      await this.mailer.send({ to: address, ...mail });
    } catch (error) {
      const kind = classifyMailError(error);
      if (kind === 'unknown') {
        // The server may already have it: stay `sending`, never resent.
        this.logger.warn('entitlement_notice_outcome_unknown', { notice_id: notice.id, kind: notice.kind });
      } else if (kind === 'transient') {
        await set({ state: 'failed', attempts: { increment: 1 }, lastErrorAt: now });
        this.logger.warn('entitlement_notice_failed', { notice_id: notice.id, kind: notice.kind, error_kind: kind });
      } else {
        await set({ state: 'skipped' });
        this.logger.warn('entitlement_notice_failed', { notice_id: notice.id, kind: notice.kind, error_kind: kind });
      }
      return;
    }
    await set({ state: 'sent', sentAt: this.clock.now() });
    this.logger.info('entitlement_notice_sent', { notice_id: notice.id, kind: notice.kind });
  }

  /** What the receipt says: the payment that opened a period, its order and the period; null when any is gone. */
  private async receiptOf(paymentId: string): Promise<ReceiptData | null> {
    const payment = await this.prisma.billingOrderPayment.findUnique({
      where: { id: paymentId },
      select: {
        reference: true,
        order: { select: { periodMonths: true, amountMinor: true, description: true } },
        period: { select: { startsAt: true, endsAt: true } },
      },
    });
    if (payment === null || payment.period === null) return null;
    return {
      months: payment.order.periodMonths as 1 | 3 | 12, amountMinor: Number(payment.order.amountMinor), description: payment.order.description,
      reference: payment.reference, startsAt: payment.period.startsAt, endsAt: payment.period.endsAt,
    };
  }
}
