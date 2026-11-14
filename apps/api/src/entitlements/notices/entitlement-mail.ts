// Entitlement emails (design §8 (1), §14, K4; launch prep B design §3.10). The trial and renewal emails name no amount (a provider sends it) and
// stay plain text: nothing sends them at launch (design 2026-11-14-email-giao-dien D1). The receipt of a prepaid purchase and the expiry notice
// are HTML + text; the receipt names the amount, since Wordmet took the money itself. No word, payload or card data.
import type { MailBlock } from '../../common/mail/layout/blocks.js';
import { renderMail } from '../../common/mail/layout/render-mail.js';
import { lastCoveredDay } from '../orders/period-window.js';
import type { NoticeKind } from '../entitlements.types.js';

type Language = 'vi' | 'en';

const DEFAULT_ZONE = 'Asia/Ho_Chi_Minh';

function formatDate(date: Date, language: Language, timeZone: string): string {
  return language === 'vi'
    ? new Intl.DateTimeFormat('vi-VN', { timeZone, day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
    : new Intl.DateTimeFormat('en-US', { timeZone, month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}

/** A calendar day (`YYYY-MM-DD`) as text: noon UTC of that day shown in UTC is that day everywhere. */
const formatDay = (day: string, language: Language) => formatDate(new Date(`${day}T12:00:00Z`), language, 'UTC');

const CANCEL = {
  vi: 'Muốn hủy, hãy tắt tự gia hạn trong trang quản lý gói của nơi bạn đã đăng ký (App Store, Google Play hoặc trang thanh toán).',
  en: 'To cancel, turn off auto-renewal on the subscription page of the place you subscribed (App Store, Google Play or the payment page).',
};

export type ReceiptData = {
  months: 1 | 3 | 12;
  amountMinor: number;
  /** What the payer typed into the transfer: `WM…`. */
  description: string;
  /** The bank's reference of the payment that opened the period. */
  reference: string;
  startsAt: Date;
  endsAt: Date;
};

type Text = {
  /** The day the email promises (trial end, renewal), already formatted. */
  date: string;
};

type TextKind = 'trial_started' | 'trial_reminder' | 'renewal_notice';

const COPY: Record<TextKind, Record<Language, { subject: string; body: (text: Text) => string }>> = {
  trial_started: {
    vi: {
      subject: 'Bạn đã bắt đầu dùng thử Wordmet Pro',
      body: ({ date }) => `Bản dùng thử Wordmet Pro của bạn kéo dài tới ngày ${date}. Nếu bạn không hủy, kỳ trả phí đầu tiên sẽ được tự động trừ tiền vào ngày ${date}.`,
    },
    en: {
      subject: 'Your Wordmet Pro trial has started',
      body: ({ date }) => `Your Wordmet Pro trial lasts until ${date}. Unless you cancel, the first paid period is charged automatically on ${date}.`,
    },
  },
  trial_reminder: {
    vi: {
      subject: 'Bản dùng thử Wordmet Pro sắp kết thúc',
      body: ({ date }) => `Bản dùng thử Wordmet Pro của bạn kết thúc vào ngày ${date}. Nếu bạn không hủy trước ngày đó, kỳ trả phí đầu tiên sẽ được tự động trừ tiền.`,
    },
    en: {
      subject: 'Your Wordmet Pro trial ends soon',
      body: ({ date }) => `Your Wordmet Pro trial ends on ${date}. Unless you cancel before then, the first paid period is charged automatically.`,
    },
  },
  renewal_notice: {
    vi: {
      subject: 'Gói Wordmet Pro sắp tự gia hạn',
      body: ({ date }) => `Gói Wordmet Pro của bạn sẽ tự gia hạn và trừ tiền kỳ mới vào ngày ${date}.`,
    },
    en: {
      subject: 'Your Wordmet Pro plan renews soon',
      body: ({ date }) => `Your Wordmet Pro plan renews automatically and the new period is charged on ${date}.`,
    },
  },
};

const periodName = (months: 1 | 3 | 12, language: Language) => (language === 'vi' ? `${months} tháng` : `${months} month${months === 1 ? '' : 's'}`);
const amountText = (amountMinor: number, language: Language) => `${new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en-US').format(amountMinor)} ₫`;

type MailData = {
  trialEndsAt?: Date; periodEnd?: Date; timeZone?: string;
  /** The learner app origin (no trailing slash) and the plans page; the HTML mails build their footer links and button from them. */
  appUrl?: string; plansUrl?: string; supportEmail?: string; receipt?: ReceiptData;
};

const DEFAULT_SUPPORT = 'support@wordmet.com';

/** Prepaid purchase receipt (HTML + text). The words are the ones approved in docs/mockups/2026-11-14-email/index.html. */
function receiptMail(language: Language, data: MailData, zone: string): { subject: string; text: string; html: string } {
  const receipt = data.receipt;
  if (receipt === undefined) throw new Error('payment_receipt needs the receipt data');
  const vi = language === 'vi';
  const amount = amountText(receipt.amountMinor, language);
  const start = formatDate(receipt.startsAt, language, zone);
  const end = formatDay(lastCoveredDay(receipt.endsAt, zone), language);
  const blocks: MailBlock[] = [
    { kind: 'heading', text: vi ? 'Biên nhận Wordmet Pro' : 'Your Wordmet Pro receipt' },
    { kind: 'paragraph', parts: [vi ? 'Wordmet đã nhận tiền của bạn.' : 'Wordmet received your payment.'] },
    { kind: 'rows', rows: vi ? [
      { label: 'Gói', value: `Wordmet Pro ${periodName(receipt.months, language)}` },
      { label: 'Số tiền', value: amount },
      { label: 'Nội dung chuyển khoản', value: receipt.description },
      { label: 'Mã tham chiếu', value: receipt.reference },
      { label: 'Dùng được', value: `${start} – hết ngày ${end}` },
    ] : [
      { label: 'Plan', value: `Wordmet Pro ${periodName(receipt.months, language)}` },
      { label: 'Amount', value: amount },
      { label: 'Transfer note', value: receipt.description },
      { label: 'Reference', value: receipt.reference },
      { label: 'Valid', value: `${start} – through ${end}` },
    ] },
    { kind: 'muted', parts: [vi ? 'Không hoàn tiền sau khi đã thanh toán. Hết kỳ này, tài khoản về gói Miễn phí.' : 'No refunds after payment. When this period ends, your account goes back to the Free plan.'] },
    { kind: 'button', label: vi ? 'Xem gói của bạn' : 'See your plan', href: data.plansUrl ?? '' },
  ];
  const { html, text } = renderMail({
    language, preheader: vi ? `Wordmet đã nhận ${amount}.` : `Wordmet received ${amount}.`, blocks,
    footer: { kind: 'billing', supportEmail: data.supportEmail ?? DEFAULT_SUPPORT }, appUrl: data.appUrl ?? '',
  });
  return { subject: vi ? 'Biên nhận mua Wordmet Pro' : 'Your Wordmet Pro receipt', text, html };
}

/** The last prepaid period is about to end (HTML + text). The learner's words and schedule stay: nothing deletes them when Pro ends. */
function expiryMail(language: Language, data: MailData, zone: string): { subject: string; text: string; html: string } {
  const vi = language === 'vi';
  const day = formatDay(lastCoveredDay(data.periodEnd ?? new Date(NaN), zone), language);
  const blocks: MailBlock[] = [
    { kind: 'heading', text: vi ? 'Pro sắp hết hạn' : 'Your Pro plan ends soon' },
    { kind: 'paragraph', parts: vi
      ? ['Gói Wordmet Pro của bạn dùng được tới ', { bold: `hết ngày ${day}` }, '. Sau đó tài khoản về gói Miễn phí, các từ và lịch ôn vẫn giữ nguyên.']
      : ['Your Wordmet Pro plan runs ', { bold: `through ${day}` }, '. After that your account goes back to the Free plan; your words and review schedule stay.'] },
    { kind: 'button', label: vi ? 'Mua kỳ mới' : 'Buy a new period', href: data.plansUrl ?? '' },
  ];
  const { html, text } = renderMail({
    language, preheader: vi ? `Dùng được tới hết ngày ${day}.` : `Runs through ${day}.`, blocks,
    footer: { kind: 'billing', supportEmail: data.supportEmail ?? DEFAULT_SUPPORT }, appUrl: data.appUrl ?? '',
  });
  return { subject: vi ? 'Gói Wordmet Pro sắp hết hạn' : 'Your Wordmet Pro plan ends soon', text, html };
}

export function entitlementMail(kind: NoticeKind, language: Language, data: MailData): { subject: string; text: string; html?: string } {
  const zone = data.timeZone ?? DEFAULT_ZONE;
  if (kind === 'payment_receipt') return receiptMail(language, data, zone);
  if (kind === 'expiry_notice') return expiryMail(language, data, zone);
  // The provider emails (trial, renewal): text only, each ending with the provider-cancellation sentence.
  const copy = COPY[kind][language];
  const date = formatDate((kind === 'renewal_notice' ? data.periodEnd : data.trialEndsAt) ?? new Date(NaN), language, zone);
  return { subject: copy.subject, text: `${copy.body({ date })}\n\n${CANCEL[language]}\n` };
}
