// @vitest-environment node
import { readLandingData, readLandingDataOnce } from './read-landing-data.mjs';

// Giao diện mới M8.3 (design §10.6, §10.7): prices and FAQ are read once, at `next build`, and inlined into the landing.
const BASE = 'http://api.test';
const PRICES = { currency: 'VND', prices: { '1': 79000, '3': 199000, '12': 599000 } };
const FAQ = {
  items: [
    { question: 'Gói Pro có tự gia hạn không?', answer: 'Không.' },
    { question: 'Có được hoàn tiền không?', answer: 'Không tự động.' },
  ],
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/** A fake fetch that answers by path; a function value runs instead (for errors and hangs). */
function fakeFetch(routes: Record<string, Response | ((signal?: AbortSignal | null) => Promise<Response>)>) {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const path = url.slice(BASE.length);
    const route = routes[path];
    if (route === undefined) throw new Error(`unexpected fetch ${url}`);
    return typeof route === 'function' ? route(init?.signal) : route.clone();
  });
}

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  warn.mockRestore();
});

describe('readLandingData (M8.3)', () => {
  it('both endpoints answer 200 with the right shape: the exact JSON string, no warning', async () => {
    const fetchImpl = fakeFetch({ '/v1/public/prices': json(PRICES), '/v1/public/faq': json(FAQ) });
    const data = await readLandingData({ baseUrl: BASE, required: false, offline: false, fetchImpl });
    expect(data).toBe(
      '{"prices":{"1":79000,"3":199000,"12":599000},"faq":[{"question":"Gói Pro có tự gia hạn không?","answer":"Không."},{"question":"Có được hoàn tiền không?","answer":"Không tự động."}]}',
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(warn).not.toHaveBeenCalled();
  });

  it('an empty published FAQ is valid data: faq []', async () => {
    const fetchImpl = fakeFetch({ '/v1/public/prices': json(PRICES), '/v1/public/faq': json({ items: [] }) });
    expect(await readLandingData({ baseUrl: BASE, required: false, offline: false, fetchImpl })).toBe(
      '{"prices":{"1":79000,"3":199000,"12":599000},"faq":[]}',
    );
  });

  it('prices answer 500: undefined and exactly one warning naming /v1/public/prices', async () => {
    const fetchImpl = fakeFetch({ '/v1/public/prices': json({}, 500), '/v1/public/faq': json(FAQ) });
    expect(await readLandingData({ baseUrl: BASE, required: false, offline: false, fetchImpl })).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain(`${BASE}/v1/public/prices`);
    expect(String(warn.mock.calls[0]?.[0])).toContain('HTTP 500');
  });

  it('the FAQ does not answer within timeoutMs: undefined, one warning naming /v1/public/faq', async () => {
    const hang = (signal?: AbortSignal | null) =>
      new Promise<Response>((_resolve, reject) => signal?.addEventListener('abort', () => reject(signal.reason)));
    const fetchImpl = fakeFetch({ '/v1/public/prices': json(PRICES), '/v1/public/faq': hang });
    const started = Date.now();
    expect(await readLandingData({ baseUrl: BASE, required: false, offline: false, timeoutMs: 50, fetchImpl })).toBeUndefined();
    expect(Date.now() - started).toBeLessThan(2000);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain(`${BASE}/v1/public/faq`);
  });

  it('required and a network error: rejects with the URL and the reason', async () => {
    const down = async () => {
      throw new TypeError('fetch failed');
    };
    const fetchImpl = fakeFetch({ '/v1/public/prices': down, '/v1/public/faq': json(FAQ) });
    await expect(readLandingData({ baseUrl: BASE, required: true, offline: false, fetchImpl })).rejects.toThrow(
      'Landing data required but unavailable: http://api.test/v1/public/prices (fetch failed)',
    );
  });

  it('offline: undefined without any fetch', async () => {
    const fetchImpl = fakeFetch({});
    expect(await readLandingData({ baseUrl: BASE, required: false, offline: true, fetchImpl })).toBeUndefined();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('a FAQ item missing its answer is a bad shape: undefined and a warning naming /v1/public/faq', async () => {
    const fetchImpl = fakeFetch({ '/v1/public/prices': json(PRICES), '/v1/public/faq': json({ items: [{ question: 'Q?' }] }) });
    expect(await readLandingData({ baseUrl: BASE, required: false, offline: false, fetchImpl })).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain(`${BASE}/v1/public/faq`);
  });

  it.each([
    ['a price is a string', { prices: { '1': '79000', '3': 199000, '12': 599000 } }],
    ['the 12-month price is missing', { prices: { '1': 79000, '3': 199000 } }],
    ['a price is 0', { prices: { '1': 0, '3': 199000, '12': 599000 } }],
    ['there is no prices object', { currency: 'VND' }],
  ])('%s: a bad price shape gives undefined', async (_name, body) => {
    const fetchImpl = fakeFetch({ '/v1/public/prices': json(body), '/v1/public/faq': json(FAQ) });
    expect(await readLandingData({ baseUrl: BASE, required: false, offline: false, fetchImpl })).toBeUndefined();
    expect(String(warn.mock.calls[0]?.[0])).toContain(`${BASE}/v1/public/prices`);
  });

  it('a trailing slash on the base URL does not double the slash', async () => {
    const fetchImpl = fakeFetch({ '/v1/public/prices': json(PRICES), '/v1/public/faq': json(FAQ) });
    await readLandingData({ baseUrl: `${BASE}/`, required: false, offline: false, fetchImpl });
    expect(fetchImpl.mock.calls.map(([url]) => String(url))).toEqual([`${BASE}/v1/public/prices`, `${BASE}/v1/public/faq`]);
  });
});

// `next build` evaluates next.config.ts in more than one process (the build and its compile worker, seen in cf:docker on 11/11/2026):
// the first read is kept in the environment, which the later processes inherit, so the API is read once and warned about once.
describe('readLandingDataOnce (M8.3)', () => {
  it('the first call reads and stores the result; a later call with the same environment reuses it without fetching', async () => {
    const env: Record<string, string | undefined> = {};
    const fetchImpl = fakeFetch({ '/v1/public/prices': json(PRICES), '/v1/public/faq': json({ items: [] }) });
    const options = { baseUrl: BASE, required: false, offline: false, fetchImpl };
    const first = await readLandingDataOnce(env, options);
    expect(first).toBe('{"prices":{"1":79000,"3":199000,"12":599000},"faq":[]}');
    expect(env.WORDMET_LANDING_DATA_READ).toBe(first);
    expect(await readLandingDataOnce(env, options)).toBe(first);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('no API: one warning over two calls, and both give undefined', async () => {
    const env: Record<string, string | undefined> = {};
    const fetchImpl = fakeFetch({ '/v1/public/prices': json({}, 503), '/v1/public/faq': json(FAQ) });
    const options = { baseUrl: BASE, required: false, offline: false, fetchImpl };
    expect(await readLandingDataOnce(env, options)).toBeUndefined();
    expect(await readLandingDataOnce(env, options)).toBeUndefined();
    expect(env.WORDMET_LANDING_DATA_READ).toBe('');
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
