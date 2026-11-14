import { serverApiBaseUrl } from '@/app-shell/config';

/** One item of `GET /v1/sources`: a third-party data set that backs content learners can see (what its licence asks us to credit). */
export type PublicSource = { name: string; version: string; url: string | null; license: string; attribution: string };

const isPublicSource = (value: unknown): value is PublicSource => {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as PublicSource;
  return typeof item.name === 'string' && typeof item.version === 'string' && (item.url === null || typeof item.url === 'string')
    && typeof item.license === 'string' && typeof item.attribution === 'string';
};

const TIMEOUT_MS = 2500;

/**
 * Read on the server at each request (no cache: a source appears or goes when a word is published or retired, without a deploy).
 * `null` when the API cannot be reached or answers something unexpected; `[]` when it answered and no source is shown.
 */
export async function fetchSources(): Promise<PublicSource[] | null> {
  try {
    const response = await fetch(`${serverApiBaseUrl()}/v1/sources`, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null) return null;
    const items = (body as { items?: unknown }).items;
    return Array.isArray(items) && items.every(isPublicSource) ? items : null;
  } catch {
    return null;
  }
}
