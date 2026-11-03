import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchLegal, pickLanguage, type PublicLegal } from './legal';

const legal: PublicLegal = {
  version: '3', effective_date: '2026-11-10',
  privacy: { vi: '# Chính sách', en: '# Privacy' }, terms: { vi: '# Điều khoản', en: null },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('fetchLegal (the published privacy policy and terms, read from the API on the server)', () => {
  it('reads GET /v1/legal/current without caching, with a time limit', async () => {
    const fetchMock = vi.fn(async () => Response.json(legal));
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchLegal()).toEqual(legal);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/v1\/legal\/current$/);
    expect(init.cache).toBe('no-store');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('reads the API at its internal address when one is set (a container cannot reach the browser\'s localhost)', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:3000');
    vi.stubEnv('API_INTERNAL_BASE_URL', 'http://api:3000');
    const fetchMock = vi.fn(async () => Response.json(legal));
    vi.stubGlobal('fetch', fetchMock);
    await fetchLegal();
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe('http://api:3000/v1/legal/current');
  });

  it('is null while nothing is published (404), on any other failure, and when the API is unreachable', async () => {
    for (const answer of [new Response(null, { status: 404 }), new Response('boom', { status: 500 })]) {
      vi.stubGlobal('fetch', async () => answer);
      expect(await fetchLegal()).toBeNull();
    }
    vi.stubGlobal('fetch', async () => { throw new TypeError('fetch failed'); });
    expect(await fetchLegal()).toBeNull();
  });

  it('is null for a body that is not the expected shape', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ version: 3 }));
    expect(await fetchLegal()).toBeNull();
  });
});

describe('pickLanguage', () => {
  it('uses the English text for /en when there is one, the Vietnamese text otherwise', () => {
    expect(pickLanguage(legal.privacy, 'en')).toBe('# Privacy');
    expect(pickLanguage(legal.terms, 'en')).toBe('# Điều khoản');
    expect(pickLanguage({ vi: '# A', en: '   ' }, 'en')).toBe('# A');
    expect(pickLanguage(legal.privacy, 'vi')).toBe('# Chính sách');
  });
});
