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

describe('html emails #16 #17 (design 2026-11-14-email-giao-dien §3)', () => {
  const APP = 'https://app.wordmet.com';
  const END_OF_PERIOD = new Date('2026-12-05T17:00:00.000Z');
  const data = (language: 'vi' | 'en') => ({
    periodEnd: END_OF_PERIOD, timeZone: 'Asia/Ho_Chi_Minh', appUrl: APP, plansUrl: `${APP}/${language}/app/plans`, supportEmail: 'help@example.com',
    receipt: { months: 3 as const, amountMinor: 249000, description: 'WM7K2Q9X', reference: 'FT26318004512',
      startsAt: new Date('2026-11-14T03:00:00.000Z'), endsAt: END_OF_PERIOD },
  });
  const lines = (text: string) => text.split(String.fromCharCode(10));

  it('payment_receipt vi: rows in order, the plans button, the billing footer and a receipt that never says Pro is already on', () => {
    const mail = entitlementMail('payment_receipt', 'vi', data('vi'));
    expect(mail.subject).toBe('Biên nhận mua Wordmet Pro');
    const html = mail.html!;
    const labels = ['Gói', 'Số tiền', 'Nội dung chuyển khoản', 'Mã tham chiếu', 'Dùng được'].map((label) => html.indexOf(`>${label}<`));
    expect(labels.every((at) => at >= 0)).toBe(true);
    expect([...labels].sort((a, b) => a - b)).toEqual(labels);
    expect(lines(mail.text)).toContain('Gói: Wordmet Pro 3 tháng');
    expect(lines(mail.text)).toContain('Số tiền: 249.000 ₫');
    expect(lines(mail.text)).toContain('Dùng được: 14/11/2026 – hết ngày 05/12/2026');
    expect(html).toContain(`href="${APP}/vi/app/plans"`);
    expect(lines(mail.text)).toContain(`Xem gói của bạn: ${APP}/vi/app/plans`);
    expect(html).toContain('href="mailto:help@example.com"');
    expect(html).toContain('<html lang="vi"');
    expect(mail.text).not.toContain('Pro đã bật');
  });

  it('payment_receipt en: English labels, /en links and lang', () => {
    const mail = entitlementMail('payment_receipt', 'en', data('en'));
    expect(mail.subject).toBe('Your Wordmet Pro receipt');
    expect(mail.html).toContain('<html lang="en"');
    expect(lines(mail.text)).toContain('Plan: Wordmet Pro 3 months');
    expect(lines(mail.text)).toContain('Valid: November 14, 2026 – through December 5, 2026');
    expect(mail.html).toContain(`href="${APP}/en/privacy"`);
  });

  it('expiry_notice: the last covered day in bold, what stays, one plans button', () => {
    const vi = entitlementMail('expiry_notice', 'vi', data('vi'));
    expect(vi.subject).toBe('Gói Wordmet Pro sắp hết hạn');
    expect(vi.html).toContain('<strong>hết ngày 05/12/2026</strong>');
    expect(vi.text).toContain('các từ và lịch ôn vẫn giữ nguyên');
    expect(vi.html).toContain(`href="${APP}/vi/app/plans"`);
    const en = entitlementMail('expiry_notice', 'en', data('en'));
    expect(en.subject).toBe('Your Wordmet Pro plan ends soon');
    expect(en.html).toContain('<strong>through December 5, 2026</strong>');
    expect(en.html).toContain('<html lang="en"');
  });

  it('escapes the transfer note and reference in the HTML', () => {
    const mail = entitlementMail('payment_receipt', 'vi', { ...data('vi'), receipt: { ...data('vi').receipt, description: 'WM<1>&', reference: 'R"1' } });
    expect(mail.html).toContain('WM&lt;1&gt;&amp;');
    expect(mail.html).toContain('R&quot;1');
    expect(mail.text).toContain('Nội dung chuyển khoản: WM<1>&');
  });

  it.each(['trial_started', 'trial_reminder', 'renewal_notice'] as const)('%s stays a text-only mail (not shipped as html)', (kind) => {
    for (const language of ['vi', 'en'] as const) {
      const mail = entitlementMail(kind, language, { trialEndsAt: END_OF_PERIOD, periodEnd: END_OF_PERIOD, appUrl: APP, plansUrl: `${APP}/${language}/app/plans` });
      expect(mail.html).toBeUndefined();
    }
  });
});
