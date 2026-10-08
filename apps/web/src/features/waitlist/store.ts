import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { AppLocale } from '@/i18n/routing';
import { createD1Store } from './d1-store';

export type WaitlistState = {
  status: 'idle' | 'invalid_email' | 'missing_consent' | 'success' | 'error';
  email?: string;
};

export interface WaitlistStore {
  add(email: string, locale: AppLocale): Promise<'created' | 'exists'>;
}

export function storeFromEnv(env: Partial<CloudflareEnv>): WaitlistStore {
  if (!env.DB) throw new Error('waitlist: missing DB binding');
  return createD1Store(env.DB);
}

export async function getWaitlistStore(): Promise<WaitlistStore> {
  return storeFromEnv((await getCloudflareContext({ async: true })).env);
}
