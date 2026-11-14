import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchSources, type PublicSource } from './sources';

const source: PublicSource = {
  name: 'CEFR-J', version: '1.6', url: 'https://www.cefr-j.org', license: 'Free for commercial use with citation',
  attribution: 'Tono Yukio et al. (2020)',
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('fetchSources (the data sources shown to learners, read from the API on the server)', () => {
  it('reads GET /v1/sources without caching, with a time limit, and returns the items in order', async () => {
    const second: PublicSource = { ...source, name: 'AGID', url: null };
    const fetchMock = vi.fn(async () => Response.json({ items: [source, second] }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchSources()).toEqual([source, second]);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/v1\/sources$/);
    expect(init.cache).toBe('no-store');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('reads the API at its internal address when one is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:3000');
    vi.stubEnv('API_INTERNAL_BASE_URL', 'http://api:3000');
    const fetchMock = vi.fn(async () => Response.json({ items: [] }));
    vi.stubGlobal('fetch', fetchMock);
    await fetchSources();
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe('http://api:3000/v1/sources');
  });

  it('an empty list is an empty array, not null (the API answered: nothing to show)', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ items: [] }));
    expect(await fetchSources()).toEqual([]);
  });

  it('is null on an error status and when the API is unreachable', async () => {
    for (const answer of [new Response(null, { status: 404 }), new Response('boom', { status: 500 })]) {
      vi.stubGlobal('fetch', async () => answer);
      expect(await fetchSources()).toBeNull();
    }
    vi.stubGlobal('fetch', async () => { throw new TypeError('fetch failed'); });
    expect(await fetchSources()).toBeNull();
  });

  it('is null for a body that is not the expected shape: no items array, or an item with a wrong field', async () => {
    for (const body of [{}, { items: 'x' }, { items: [{ ...source, name: 5 }] }, { items: [{ ...source, url: 7 }] }, { items: [{ name: 'x' }] }, null]) {
      vi.stubGlobal('fetch', async () => Response.json(body));
      expect(await fetchSources(), JSON.stringify(body)).toBeNull();
    }
  });
});
