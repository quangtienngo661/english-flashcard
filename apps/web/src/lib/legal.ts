import { cache } from 'react';
import { serverApiBaseUrl } from '@/app-shell/config';

/** `GET /v1/legal/current`: the Privacy Policy and the Terms of Use an admin published (Markdown). `en` is `null` without an English text. */
export type PublicLegal = {
  version: string;
  effective_date: string | null;
  privacy: { vi: string; en: string | null };
  terms: { vi: string; en: string | null };
};

type Texts = { vi: string; en: string | null };

const isTexts = (value: unknown): value is Texts =>
  typeof value === 'object' && value !== null && typeof (value as Texts).vi === 'string'
  && ((value as Texts).en === null || typeof (value as Texts).en === 'string');

function isPublicLegal(value: unknown): value is PublicLegal {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as PublicLegal;
  return typeof body.version === 'string' && (body.effective_date === null || typeof body.effective_date === 'string')
    && isTexts(body.privacy) && isTexts(body.terms);
}

const TIMEOUT_MS = 2500;

/**
 * Read on the server at each request (no cache: an admin publishes without a deploy). `null` while nothing is published, and also
 * when the API cannot be reached: the pages then show the draft notice instead of an error.
 */
export async function fetchLegal(): Promise<PublicLegal | null> {
  try {
    const response = await fetch(`${serverApiBaseUrl()}/v1/legal/current`, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return isPublicLegal(body) ? body : null;
  } catch {
    return null;
  }
}

/** One read per request, shared by the page and its metadata. */
export const getLegal = cache(fetchLegal);

/** The English text on `/en` when the admin wrote one, the Vietnamese text otherwise. */
export function pickLanguage(texts: Texts, locale: string): string {
  return locale === 'en' && texts.en !== null && texts.en.trim() !== '' ? texts.en : texts.vi;
}
