// @vitest-environment jsdom
import { act, screen, waitFor } from '@testing-library/react';
import { ENTITLEMENTS_KEY } from '@/app-shell/queries';
import { renderApp } from '@/test-utils/render-app';
import { AdsenseLoader } from './AdsenseLoader';

const nav = vi.hoisted(() => ({ path: '/vi/app', listeners: new Set<() => void>() }));
const replace = vi.hoisted(() => vi.fn());
vi.mock('@/app-shell/navigate', () => ({ hardReplace: (path: string) => replace(path), isLeaving: () => false }));
vi.mock('next/navigation', async () => {
  const { useSyncExternalStore } = await import('react');
  const subscribe = (listener: () => void) => { nav.listeners.add(listener); return () => nav.listeners.delete(listener); };
  return {
    usePathname: () => useSyncExternalStore(subscribe, () => nav.path, () => nav.path),
    useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
  };
});
vi.setConfig({ testTimeout: 20_000 });

const go = (to: string) => act(() => { nav.path = to; nav.listeners.forEach((listener) => listener()); });
const CLIENT = 'ca-pub-1234567890123456';
const pool = { limit: 3, used: 0, remaining: 3, resets_at: null };
const ent = (ads: Record<string, unknown> | null = { show: true, interstitial_per_day: 3, min_interval_minutes: 10 }) => ({
  plan: 'free', sources: [], pools: { practice_sessions: pool, ai_practice: pool, ai_lookup: pool }, features: {},
  trial_eligible: false, ai_available: { enabled: true, cap_reached: false }, ...(ads === null ? {} : { ads }),
});
const script = () => document.head.querySelector<HTMLScriptElement>('script[src*="adsbygoogle.js"]');

async function mount(entitlements: unknown = ent(), nonce: string | null = 'bm9uY2U=') {
  const view = renderApp(<AdsenseLoader nonce={nonce ?? undefined} />, { routes: { 'GET /v1/me/entitlements': () => Response.json(entitlements) } });
  await waitFor(() => expect(view.calls.filter((c) => c.method === 'GET' && c.path === '/v1/me/entitlements')).toHaveLength(1));
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
  return view;
}

beforeEach(() => {
  nav.path = '/vi/app';
  replace.mockReset();
  vi.unstubAllEnvs();
  vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT', CLIENT);
  document.head.querySelectorAll('script[src*="adsbygoogle.js"]').forEach((node) => node.remove());
  delete (window as { adsbygoogle?: unknown }).adsbygoogle;
});
afterEach(() => {
  vi.restoreAllMocks();
  document.head.querySelectorAll('script[src*="adsbygoogle.js"]').forEach((node) => node.remove());
});

describe('AdsenseLoader (launch prep B design §5.1, LB3A1, LB3A2, LB3E1–LB3E4, LB3E11, LB3E12)', () => {
  it('LB3A1: on Nhóm, for a learner who may see ads, the Google script is added with the nonce, async, crossorigin anonymous and the client id', async () => {
    nav.path = '/vi/app/groups';
    await mount();
    const added = script();
    expect(added).not.toBeNull();
    expect(added?.src).toBe(`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`);
    expect(added?.async).toBe(true);
    expect(added?.crossOrigin).toBe('anonymous');
    expect(added?.nonce).toBe('bm9uY2U=');
    expect(replace).not.toHaveBeenCalled();
  });

  it('Q-B12: requestNonPersonalizedAds is 1 before the script is added, never after', async () => {
    nav.path = '/vi/app/groups';
    let flagWhenAdded: unknown = 'not added';
    const original = document.head.appendChild.bind(document.head);
    vi.spyOn(document.head, 'appendChild').mockImplementation(((node: Node) => {
      if (node instanceof HTMLScriptElement && node.src.includes('adsbygoogle.js')) flagWhenAdded = (window as { adsbygoogle?: { requestNonPersonalizedAds?: number } }).adsbygoogle?.requestNonPersonalizedAds;
      return original(node);
    }) as never);
    await mount();
    expect(flagWhenAdded).toBe(1);
  });

  it('LB3A2: a soft navigation from Hôm nay to Tra từ adds it on arrival, not before', async () => {
    await mount();
    expect(script()).toBeNull();
    await go('/vi/app/lookup');
    expect(script()).not.toBeNull();
  });

  it('a script without a nonce to give is still added (the policy lets a script added by a trusted script through)', async () => {
    nav.path = '/en/app/lookup';
    await mount(ent(), null);
    expect(script()).not.toBeNull();
    expect(script()?.nonce).toBe('');
  });

  it('LB3E2: the practice session, review, a group page, a word, Hôm nay, plans and settings never get it', async () => {
    await mount();
    for (const path of ['/vi/app/practice/session', '/vi/app/practice', '/vi/app/review', '/vi/app/group', '/vi/app/topic', '/vi/app/word', '/vi/app', '/vi/app/plans', '/vi/app/settings']) {
      await go(path);
      expect(script(), path).toBeNull();
    }
    expect(replace).not.toHaveBeenCalled();
  });

  it('LB3E12: ads.show false (under 16, staff, Pro, the switch off) or an older API with no ads field → no script', async () => {
    for (const entitlements of [ent({ show: false, interstitial_per_day: 3, min_interval_minutes: 10 }), ent(null)]) {
      nav.path = '/vi/app/groups';
      const view = await mount(entitlements);
      expect(script()).toBeNull();
      view.unmount();
    }
  });

  it('no AdSense client at build time → no script (the house ad dialog is used instead)', async () => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT', '');
    nav.path = '/vi/app/groups';
    await mount();
    expect(script()).toBeNull();
  });

  it('moving between the two allowed pages keeps the script: no reload and no second script', async () => {
    nav.path = '/vi/app/groups';
    await mount();
    await go('/vi/app/lookup');
    await go('/vi/app/groups');
    expect(document.head.querySelectorAll('script[src*="adsbygoogle.js"]')).toHaveLength(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it('LB3E1: once the script is there, a navigation to any other page reloads the whole page, so the destination has no script', async () => {
    nav.path = '/vi/app/groups';
    await mount();
    await go('/vi/app/practice');
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith(window.location.href);
  });

  it('LB3E3 and LB3E4: once the script is there, ads.show turning false (Lan bought Pro, the admin switched ads off) reloads the page', async () => {
    nav.path = '/vi/app/groups';
    const view = await mount();
    expect(replace).not.toHaveBeenCalled();
    act(() => { view.client.setQueryData(ENTITLEMENTS_KEY, ent({ show: false, interstitial_per_day: 3, min_interval_minutes: 10 })); });
    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    expect(replace).toHaveBeenCalledWith(window.location.href);
  });

  it('LB3E11: an ad blocker (the script fails to load) is silent: nothing thrown, nothing shown, no second try', async () => {
    nav.path = '/vi/app/groups';
    await mount();
    const added = script();
    expect(added).not.toBeNull();
    expect(() => act(() => { added?.dispatchEvent(new Event('error')); })).not.toThrow();
    expect(screen.queryByRole('alert')).toBeNull();
    await go('/vi/app/lookup');
    expect(document.head.querySelectorAll('script[src*="adsbygoogle.js"]')).toHaveLength(1);
  });

  it('leaving the allowed pages before any script was added does nothing', async () => {
    await mount(ent(null));
    await go('/vi/app/groups');
    await go('/vi/app/practice');
    expect(replace).not.toHaveBeenCalled();
  });
});
