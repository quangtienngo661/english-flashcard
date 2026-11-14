import { getMessages } from 'next-intl/server';
import type vi from '../../../messages/vi.json';
import type { AppLocale } from '@/i18n/routing';

/** The `Landing` message tree (M8 Figma A §7). Sections receive their own slice as props. */
export type LandingCopy = (typeof vi)['Landing'];

export async function getLandingCopy(): Promise<LandingCopy> {
  const messages = (await getMessages()) as unknown as { Landing: LandingCopy };
  return messages.Landing;
}

/** Fills `{name}` placeholders; an unknown name stays as written. */
export function fill(message: string, values: Record<string, string | number>): string {
  return message.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));
}

// The same Intl call as createFormat(...).money in app-shell/format.ts (Gói học / Plans). That module is 'use client', so a server component
// cannot call it (R202); landing.test.tsx pins that both write the same string per locale ("66.300 ₫" with a no-break space; "₫66,300").
const VND: Record<AppLocale, Intl.NumberFormat> = {
  vi: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }),
  en: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }),
};

export function formatVnd(amount: number, locale: AppLocale = 'vi'): string {
  return VND[locale].format(amount);
}
