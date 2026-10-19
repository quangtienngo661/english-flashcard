// Plain-text entitlement emails (design §8 (1), §14, K4). No amount until a real adapter sends one (ASSUMPTION); no word,
// payload or card data.
import type { NoticeKind } from '../entitlements.types.js';

type Language = 'vi' | 'en';

const DEFAULT_ZONE = 'Asia/Ho_Chi_Minh';

function formatDate(date: Date, language: Language, timeZone: string): string {
  return language === 'vi'
    ? new Intl.DateTimeFormat('vi-VN', { timeZone, day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
    : new Intl.DateTimeFormat('en-US', { timeZone, month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}

const CANCEL = {
  vi: 'Muốn hủy, hãy tắt tự gia hạn trong trang quản lý gói của nơi bạn đã đăng ký (App Store, Google Play hoặc trang thanh toán).',
  en: 'To cancel, turn off auto-renewal on the subscription page of the place you subscribed (App Store, Google Play or the payment page).',
};

const COPY: Record<NoticeKind, Record<Language, { subject: string; body: (date: string) => string }>> = {
  trial_started: {
    vi: {
      subject: 'Bạn đã bắt đầu dùng thử Wordmet Pro',
      body: (date) => `Bản dùng thử Wordmet Pro của bạn kéo dài tới ngày ${date}. Nếu bạn không hủy, kỳ trả phí đầu tiên sẽ được tự động trừ tiền vào ngày ${date}.`,
    },
    en: {
      subject: 'Your Wordmet Pro trial has started',
      body: (date) => `Your Wordmet Pro trial lasts until ${date}. Unless you cancel, the first paid period is charged automatically on ${date}.`,
    },
  },
  trial_reminder: {
    vi: {
      subject: 'Bản dùng thử Wordmet Pro sắp kết thúc',
      body: (date) => `Bản dùng thử Wordmet Pro của bạn kết thúc vào ngày ${date}. Nếu bạn không hủy trước ngày đó, kỳ trả phí đầu tiên sẽ được tự động trừ tiền.`,
    },
    en: {
      subject: 'Your Wordmet Pro trial ends soon',
      body: (date) => `Your Wordmet Pro trial ends on ${date}. Unless you cancel before then, the first paid period is charged automatically.`,
    },
  },
  renewal_notice: {
    vi: {
      subject: 'Gói Wordmet Pro sắp tự gia hạn',
      body: (date) => `Gói Wordmet Pro của bạn sẽ tự gia hạn và trừ tiền kỳ mới vào ngày ${date}.`,
    },
    en: {
      subject: 'Your Wordmet Pro plan renews soon',
      body: (date) => `Your Wordmet Pro plan renews automatically and the new period is charged on ${date}.`,
    },
  },
};

export function entitlementMail(
  kind: NoticeKind,
  language: Language,
  data: { trialEndsAt?: Date; periodEnd?: Date; timeZone?: string },
): { subject: string; text: string } {
  const copy = COPY[kind][language];
  const when = (kind === 'renewal_notice' ? data.periodEnd : data.trialEndsAt) ?? new Date(NaN);
  const date = formatDate(when, language, data.timeZone ?? DEFAULT_ZONE);
  return { subject: copy.subject, text: `${copy.body(date)}\n\n${CANCEL[language]}\n` };
}
