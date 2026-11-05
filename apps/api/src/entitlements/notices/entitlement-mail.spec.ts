import { describe, expect, it } from 'vitest';
import { entitlementMail } from './entitlement-mail.js';

// 25/11/2026 00:30 in Vietnam is still 24/11 in UTC: the date shown follows the learner's zone.
const END = new Date('2026-11-24T17:30:00.000Z');

describe('entitlementMail (design §8 (1), §14)', () => {
  it.each([
    ['trial_started', 'vi', 'Bạn đã bắt đầu dùng thử Wordmet Pro', '25/11/2026'],
    ['trial_started', 'en', 'Your Wordmet Pro trial has started', 'November 25, 2026'],
    ['trial_reminder', 'vi', 'Bản dùng thử Wordmet Pro sắp kết thúc', '25/11/2026'],
    ['trial_reminder', 'en', 'Your Wordmet Pro trial ends soon', 'November 25, 2026'],
    ['renewal_notice', 'vi', 'Gói Wordmet Pro sắp tự gia hạn', '25/11/2026'],
    ['renewal_notice', 'en', 'Your Wordmet Pro plan renews soon', 'November 25, 2026'],
  ] as const)('%s in %s has its subject and the date it promises', (kind, language, subject, date) => {
    const data = kind === 'renewal_notice' ? { periodEnd: END } : { trialEndsAt: END };
    const mail = entitlementMail(kind, language, { ...data, timeZone: 'Asia/Ho_Chi_Minh' });
    expect(mail.subject).toBe(subject);
    expect(mail.text).toContain(date);
  });

  it.each(['trial_started', 'trial_reminder'] as const)('D8 (1): the %s email says how to cancel at the provider and names no amount', (kind) => {
    for (const language of ['vi', 'en'] as const) {
      const text = entitlementMail(kind, language, { trialEndsAt: END, timeZone: 'Asia/Ho_Chi_Minh' }).text;
      expect(text).toMatch(language === 'vi' ? /tắt tự gia hạn/ : /turn off auto-renewal/);
      expect(text).not.toMatch(/\d+[.,]\d{2}|₫|VND|USD|\$/);
    }
  });

  it('without a zone the date is shown in Vietnam time', () => {
    expect(entitlementMail('trial_reminder', 'vi', { trialEndsAt: END }).text).toContain('25/11/2026');
  });
});

describe('expiry_notice and payment_receipt (design §3.10)', () => {
  // The period ends 06/12 at 00:00 in Vietnam, so the last day it covers is 05/12 (design §3.7).
  const PERIOD_END = new Date('2026-12-05T17:00:00.000Z');
  const PLANS_URL = 'https://app.wordmet.com/vi/app/plans';
  const STORES = /App Store|Google Play|tự gia hạn|auto-renew|renews/i;
  const receipt = (months: 1 | 3 | 12 = 3) => ({
    months, amountMinor: 199000, description: 'WM0XSNJGK', reference: 'FT26309ABC',
    startsAt: new Date('2026-11-05T03:02:00.000Z'), endsAt: PERIOD_END,
  });

  it.each([
    ['vi', 'Gói Wordmet Pro sắp hết hạn', '05/12/2026'],
    ['en', 'Your Wordmet Pro plan ends soon', 'December 5, 2026'],
  ] as const)('LB1A7: expiry_notice in %s names the last covered day, links to the plans page and says nothing of stores or auto-renewal', (language, subject, day) => {
    const mail = entitlementMail('expiry_notice', language, { periodEnd: PERIOD_END, timeZone: 'Asia/Ho_Chi_Minh', plansUrl: PLANS_URL });
    expect(mail.subject).toBe(subject);
    expect(mail.text).toContain(day);
    expect(mail.text).not.toContain('06/12/2026');
    expect(mail.text).toContain(PLANS_URL);
    expect(mail.text).not.toMatch(STORES);
  });

  it.each([
    ['vi', 'Biên nhận mua Wordmet Pro', ['3 tháng', '199.000 ₫', 'WM0XSNJGK', 'FT26309ABC', '05/11/2026', '05/12/2026', 'Không hoàn tiền']],
    ['en', 'Your Wordmet Pro receipt', ['3 months', '199,000 ₫', 'WM0XSNJGK', 'FT26309ABC', 'November 5, 2026', 'December 5, 2026', 'No refunds']],
  ] as const)('payment_receipt in %s has the period, amount, transfer note, reference, both days and the no-refund sentence', (language, subject, parts) => {
    const mail = entitlementMail('payment_receipt', language, { receipt: receipt(), timeZone: 'Asia/Ho_Chi_Minh', plansUrl: PLANS_URL });
    expect(mail.subject).toBe(subject);
    for (const part of parts) expect(mail.text, part).toContain(part);
    expect(mail.text).not.toMatch(STORES);
  });

  it('the period is named in the singular for one month and the plural otherwise', () => {
    const text = (months: 1 | 3 | 12, language: 'vi' | 'en') =>
      entitlementMail('payment_receipt', language, { receipt: receipt(months), timeZone: 'Asia/Ho_Chi_Minh', plansUrl: PLANS_URL }).text;
    expect(text(1, 'vi')).toContain('1 tháng');
    expect(text(12, 'vi')).toContain('12 tháng');
    expect(text(1, 'en')).toContain('1 month');
    expect(text(1, 'en')).not.toContain('1 months');
    expect(text(12, 'en')).toContain('12 months');
  });

  it('neither new email carries the provider-cancellation sentence the trial emails end with', () => {
    for (const language of ['vi', 'en'] as const) {
      expect(entitlementMail('expiry_notice', language, { periodEnd: PERIOD_END, plansUrl: PLANS_URL }).text).not.toMatch(/tắt tự gia hạn|turn off auto-renewal/);
      expect(entitlementMail('payment_receipt', language, { receipt: receipt(), plansUrl: PLANS_URL }).text).not.toMatch(/tắt tự gia hạn|turn off auto-renewal/);
    }
  });
});
