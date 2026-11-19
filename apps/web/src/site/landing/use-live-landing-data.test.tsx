// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { FALLBACK_LANDING_DATA } from './landing-data.fallback';
import { useLiveLandingData } from './use-live-landing-data';

// Owner 19/11/2026: the landing stays prerendered with the build's numbers; the browser then reads prices, sessions per day and the FAQ again.
const BASE = 'http://api.test';
const BUILD = FALLBACK_LANDING_DATA;
const PRICES = { currency: 'VND', prices: { '1': 89000, '3': 240000, '12': 699000 }, practice_sessions_per_day: { free: 5, pro: 40 } };
const FAQ = { items: [{ question: 'Câu mới?', answer: 'Trả lời mới.' }] };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function stubFetch(routes: Record<string, () => Promise<Response>>) {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const path = String(input).slice(BASE.length);
    const route = routes[path];
    if (!route) throw new Error(`unexpected fetch ${String(input)}`);
    return route();
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('useLiveLandingData', () => {
  it('starts with the build data, then shows the prices, sessions and FAQ the API gives', async () => {
    stubFetch({ '/v1/public/prices': async () => json(PRICES), '/v1/public/faq': async () => json(FAQ) });
    const { result } = renderHook(() => useLiveLandingData(BUILD, 'vi', BASE));
    expect(result.current).toEqual(BUILD);
    await waitFor(() => expect(result.current.prices).toEqual(PRICES.prices));
    expect(result.current.sessions).toEqual({ free: 5, pro: 40 });
    expect(result.current.faq).toEqual(FAQ.items);
  });

  it('a failed or badly shaped answer keeps that part of the build data; the other part still updates', async () => {
    stubFetch({ '/v1/public/prices': async () => json({}, 500), '/v1/public/faq': async () => json(FAQ) });
    const { result } = renderHook(() => useLiveLandingData(BUILD, 'vi', BASE));
    await waitFor(() => expect(result.current.faq).toEqual(FAQ.items));
    expect(result.current.prices).toEqual(BUILD.prices);
    expect(result.current.sessions).toEqual(BUILD.sessions);
  });

  it('a network error and a FAQ item without an answer change nothing', async () => {
    const fetchMock = stubFetch({
      '/v1/public/prices': async () => {
        throw new TypeError('Failed to fetch');
      },
      '/v1/public/faq': async () => json({ items: [{ question: 'Q?' }] }),
    });
    const { result } = renderHook(() => useLiveLandingData(BUILD, 'vi', BASE));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.current).toEqual(BUILD);
  });

  it('an older API without sessions per day keeps the build sessions and takes its prices', async () => {
    stubFetch({ '/v1/public/prices': async () => json({ currency: 'VND', prices: PRICES.prices }), '/v1/public/faq': async () => json(FAQ) });
    const { result } = renderHook(() => useLiveLandingData(BUILD, 'vi', BASE));
    await waitFor(() => expect(result.current.prices).toEqual(PRICES.prices));
    expect(result.current.sessions).toEqual(BUILD.sessions);
  });

  it('an empty published FAQ empties the FAQ (the section then hides)', async () => {
    stubFetch({ '/v1/public/prices': async () => json(PRICES), '/v1/public/faq': async () => json({ items: [] }) });
    const { result } = renderHook(() => useLiveLandingData(BUILD, 'vi', BASE));
    await waitFor(() => expect(result.current.faq).toEqual([]));
  });

  it('English reads the prices only: its FAQ is fixed English text', async () => {
    const fetchMock = stubFetch({ '/v1/public/prices': async () => json(PRICES) });
    const { result } = renderHook(() => useLiveLandingData(BUILD, 'en', BASE));
    await waitFor(() => expect(result.current.sessions).toEqual({ free: 5, pro: 40 }));
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([`${BASE}/v1/public/prices`]);
  });

  it('no API address in the build: no request at all', () => {
    const fetchMock = stubFetch({});
    const { result } = renderHook(() => useLiveLandingData(BUILD, 'vi', undefined));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current).toEqual(BUILD);
  });
});
