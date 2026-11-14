import { getMessages } from 'next-intl/server';
import type vi from '../../../messages/vi.json';

/** The `Landing` message tree (M8 Figma A §7). Sections receive their own slice as props; `en` keeps the Vietnamese text (L4). */
export type LandingCopy = (typeof vi)['Landing'];

export async function getLandingCopy(): Promise<LandingCopy> {
  const messages = (await getMessages()) as unknown as { Landing: LandingCopy };
  return messages.Landing;
}

/** Fills `{name}` placeholders; an unknown name stays as written. */
export function fill(message: string, values: Record<string, string | number>): string {
  return message.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));
}

// The same Intl call as createFormat(...).money in app-shell/format.ts (Gói học). That module is 'use client', so a server component
// cannot call it (R202); landing.test.tsx pins that both write the same string ("66.300 ₫", with a no-break space).
const VND = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

export function formatVnd(amount: number): string {
  return VND.format(amount);
}
