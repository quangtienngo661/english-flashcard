// Plain-text entitlement emails (design §8 (1), §14, K4; launch prep B design §3.10). The trial and renewal emails name no amount (a provider
// sends it); the receipt of a prepaid purchase does, since Wordmet took the money itself. No word, payload or card data.
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

/** The kinds that end with the provider-cancellation sentence: a prepaid plan has no subscription to cancel (design §3.10). */
const WITH_CANCEL: ReadonlySet<NoticeKind> = new Set<NoticeKind>(['trial_started', 'trial_reminder', 'renewal_notice']);

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
  /** The day the email promises (trial end, renewal, last covered day), already formatted. */
  date: string;
  plansUrl: string;
  receipt: { period: string; amount: string; description: string; reference: string; start: string; end: string } | null;
};

const COPY: Record<NoticeKind, Record<Language, { subject: string; body: (text: Text) => string }>> = {
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
  expiry_notice: {
    vi: {
      subject: 'Gói Wordmet Pro sắp hết hạn',
      body: ({ date, plansUrl }) =>
        `Gói Wordmet Pro của bạn dùng được tới hết ngày ${date}. Sau đó tài khoản về gói Miễn phí. Muốn dùng Pro tiếp, bạn mua kỳ mới tại ${plansUrl}.`,
    },
    en: {
      subject: 'Your Wordmet Pro plan ends soon',
      body: ({ date, plansUrl }) =>
        `Your Wordmet Pro plan runs through ${date}. After that your account goes back to the Free plan. To keep Pro, buy a new period at ${plansUrl}.`,
    },
  },
  payment_receipt: {
    vi: {
      subject: 'Biên nhận mua Wordmet Pro',
      body: ({ plansUrl, receipt }) => [
        'Wordmet đã nhận tiền của bạn. Biên nhận:',
        `- Gói: Wordmet Pro ${receipt?.period}`,
        `- Số tiền: ${receipt?.amount}`,
        `- Nội dung chuyển khoản: ${receipt?.description}`,
        `- Mã tham chiếu: ${receipt?.reference}`,
        `- Dùng được từ ${receipt?.start} tới hết ngày ${receipt?.end}.`,
        '',
        `Không hoàn tiền sau khi đã thanh toán. Hết kỳ này tài khoản về gói Miễn phí; muốn dùng Pro tiếp, bạn mua kỳ mới tại ${plansUrl}.`,
      ].join('\n'),
    },
    en: {
      subject: 'Your Wordmet Pro receipt',
      body: ({ plansUrl, receipt }) => [
        'Wordmet has received your payment. Receipt:',
        `- Plan: Wordmet Pro ${receipt?.period}`,
        `- Amount: ${receipt?.amount}`,
        `- Transfer note: ${receipt?.description}`,
        `- Reference: ${receipt?.reference}`,
        `- Valid from ${receipt?.start} through ${receipt?.end}.`,
        '',
        `No refunds after payment. When this period ends your account goes back to the Free plan; to keep Pro, buy a new period at ${plansUrl}.`,
      ].join('\n'),
    },
  },
};

const periodName = (months: 1 | 3 | 12, language: Language) => (language === 'vi' ? `${months} tháng` : `${months} month${months === 1 ? '' : 's'}`);
const amountText = (amountMinor: number, language: Language) => `${new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en-US').format(amountMinor)} ₫`;

export function entitlementMail(
  kind: NoticeKind,
  language: Language,
  data: { trialEndsAt?: Date; periodEnd?: Date; timeZone?: string; plansUrl?: string; receipt?: ReceiptData },
): { subject: string; text: string } {
  const copy = COPY[kind][language];
  const zone = data.timeZone ?? DEFAULT_ZONE;
  const invalid = new Date(NaN);
  // The prepaid emails promise "through the last day the period covers" (design §3.7), the others the instant they name.
  const date = kind === 'payment_receipt' ? ''
    : kind === 'expiry_notice' ? formatDay(lastCoveredDay(data.periodEnd ?? invalid, zone), language)
      : formatDate((kind === 'renewal_notice' ? data.periodEnd : data.trialEndsAt) ?? invalid, language, zone);
  const receipt = data.receipt === undefined ? null : {
    period: periodName(data.receipt.months, language),
    amount: amountText(data.receipt.amountMinor, language),
    description: data.receipt.description,
    reference: data.receipt.reference,
    start: formatDate(data.receipt.startsAt, language, zone),
    end: formatDay(lastCoveredDay(data.receipt.endsAt, zone), language),
  };
  const body = copy.body({ date, plansUrl: data.plansUrl ?? '', receipt });
  return { subject: copy.subject, text: WITH_CANCEL.has(kind) ? `${body}\n\n${CANCEL[language]}\n` : `${body}\n` };
}
