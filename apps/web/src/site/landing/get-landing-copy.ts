import { getMessages } from 'next-intl/server';
import type { LandingCopy } from './copy';

/** Server only (next-intl/server); kept out of copy.ts so the pricing section can render in the browser too (owner 19/11/2026). */
export async function getLandingCopy(): Promise<LandingCopy> {
  const messages = (await getMessages()) as unknown as { Landing: LandingCopy };
  return messages.Landing;
}
