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
