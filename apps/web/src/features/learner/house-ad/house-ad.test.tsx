// @vitest-environment jsdom
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ENTITLEMENTS_KEY } from '@/app-shell/queries';
import { makeMe } from '@/app-shell/session/test-support';
import { renderApp } from '@/app-ui/test-utils';
import { HouseAd } from './HouseAd';
import { houseAdKey } from './house-ad-counter';

const nav = vi.hoisted(() => ({ path: '/vi/app', listeners: new Set<() => void>() }));
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

const CONFIG = (prices: Record<string, number> = { '1': 79000, '3': 199000, '12': 599000 }) => ({
  practice: { max_questions_per_session: 20, default_questions_per_session: 10 }, reminders: { send_time: '20:00' },
  learning: { backlog_after_days: 60, groups_per_user: 90 },
  plans: { free: { practice_sessions_per_day: 3 }, trial: { ai_practice_per_cycle: 100, ai_lookup_per_cycle: 30 }, pro: { practice_sessions_per_day: 30, ai_practice_per_cycle: 300, ai_lookup_per_cycle: 100, prices } },
});
const pool = { limit: 3, used: 0, remaining: 3, resets_at: null };
const ent = (ads: Record<string, unknown> | null = { show: true, interstitial_per_day: 3, min_interval_minutes: 10 }) => ({
  plan: 'free', sources: [], pools: { practice_sessions: pool, ai_practice: pool, ai_lookup: pool }, features: {},
  trial_eligible: false, ai_available: { enabled: true, cap_reached: false }, ...(ads === null ? {} : { ads }),
});
const routes = (entitlements: unknown = ent(), config: unknown = CONFIG()) => ({
  'GET /v1/me/entitlements': () => Response.json(entitlements),
  'GET /v1/me/app-config': () => Response.json(config),
});

async function mount(opts: Parameters<typeof renderApp>[1] = {}, ui = <HouseAd />) {
  const view = renderApp(ui, { routes: routes(), ...opts });
  // The two reads the dialog needs have landed before the first navigation of a test.
  await waitFor(() => {
    expect(view.calls.filter((c) => c.method === 'GET' && c.path === '/v1/me/entitlements')).toHaveLength(1);
    expect(view.calls.filter((c) => c.method === 'GET' && c.path === '/v1/me/app-config')).toHaveLength(1);
  });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
  return view;
}
const dialog = () => screen.queryByRole('dialog', { name: 'Học nhiều hơn với Pro' });
/** The texts of the dialog's paragraphs, spaces made plain (money has a no-break space). */
const paragraphs = () => within(screen.getByRole('dialog')).getAllByRole('paragraph').map((p) => (p.textContent ?? '').replace(/\s/g, ' '));
const stored = (userId = 'u1') => JSON.parse(localStorage.getItem(houseAdKey(userId)) ?? 'null');

beforeEach(() => {
  nav.path = '/vi/app';
  localStorage.clear();
  vi.unstubAllEnvs();
  vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT', '');
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('HouseAd (launch prep B design §4.2, LB2A1, LB2A2, LB2E7–LB2E16)', () => {
  it('LB2A1: a soft navigation to Nhóm shows the dialog, counts 1 and points "Xem gói Pro" at the plans page; the price is "từ" the 1-month price', async () => {
    await mount();
    expect(dialog()).toBeNull();
    await go('/vi/app/groups');
    expect(await screen.findByRole('dialog', { name: 'Học nhiều hơn với Pro' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem gói Pro' })).toHaveAttribute('href', '/vi/app/plans');
    // One paragraph: the price sits inside it in large type (M7 Figma B §5.3).
    expect(paragraphs()).toContain('Từ 79.000 ₫ cho 1 tháng');
    expect(stored()).toMatchObject({ count: 1 });
    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    await waitFor(() => expect(dialog()).toBeNull());
  });

  it('"Để sau" closes the dialog and hands focus back to what had it before the dialog opened', async () => {
    await mount({}, <><button type="button">Nhóm</button><HouseAd /></>);
    const opener = screen.getByRole('button', { name: 'Nhóm' });
    act(() => opener.focus());
    await go('/vi/app/groups');
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Học nhiều hơn với Pro' })).getByRole('button', { name: 'Để sau' }));
    await waitFor(() => expect(dialog()).toBeNull());
    // Settled: focus stays where it was given back.
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 100)); });
    expect(opener).toHaveFocus();
  });

  it('Tra từ shows it too, in English as well', async () => {
    nav.path = '/en/app';
    await mount({ locale: 'en' });
    await go('/en/app/lookup');
    expect(await screen.findByRole('dialog', { name: 'Get more with Pro' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See Pro' })).toHaveAttribute('href', '/en/app/plans');
  });

  it('LB2E12: a full page load at /app/groups does not count (only a soft navigation does)', async () => {
    nav.path = '/vi/app/groups';
    await mount();
    expect(dialog()).toBeNull();
    expect(stored()).toBeNull();
  });

  it('LB2E13: Hôm nay, a group, a topic, review, a word, the practice session, plans: never', async () => {
    await mount();
    for (const path of ['/vi/app/group', '/vi/app/topic', '/vi/app/review', '/vi/app/word', '/vi/app', '/vi/app/practice/session', '/vi/app/plans', '/vi/app/settings']) {
      await go(path);
      expect(dialog(), path).toBeNull();
    }
    expect(stored()).toBeNull();
  });

  it('LB2E14: the page staying where it is (a ?q= change keeps the pathname) is not a navigation', async () => {
    nav.path = '/vi/app/lookup';
    await mount();
    await go('/vi/app/lookup');
    expect(dialog()).toBeNull();
  });

  it('LB2E7: a second soft navigation within 10 minutes shows nothing; after 10 minutes it does (second count)', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-10T05:00:00.000Z') });
    await mount();
    await go('/vi/app/groups');
    await userEvent.click(await screen.findByRole('button', { name: 'Đóng' }));
    await waitFor(() => expect(dialog()).toBeNull());
    await go('/vi/app');
    vi.setSystemTime(new Date('2026-11-10T05:09:00.000Z'));
    await go('/vi/app/lookup');
    expect(dialog()).toBeNull();
    await go('/vi/app');
    vi.setSystemTime(new Date('2026-11-10T05:10:30.000Z'));
    await go('/vi/app/lookup');
    expect(await screen.findByRole('dialog', { name: 'Học nhiều hơn với Pro' })).toBeInTheDocument();
    expect(stored()).toMatchObject({ count: 2 });
  });

  it('LB2E8: the fourth time of the day is not shown; after 00:00 in the learner\'s zone it counts again', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-10T05:00:00.000Z') });
    await mount();
    for (const minutes of [0, 11, 22]) {
      vi.setSystemTime(new Date(Date.parse('2026-11-10T05:00:00.000Z') + minutes * 60_000));
      await go('/vi/app');
      await go('/vi/app/groups');
      await userEvent.click(await screen.findByRole('button', { name: 'Đóng' }));
      await waitFor(() => expect(dialog()).toBeNull());
    }
    expect(stored()).toMatchObject({ count: 3 });
    vi.setSystemTime(new Date('2026-11-10T06:00:00.000Z'));
    await go('/vi/app');
    await go('/vi/app/groups');
    expect(dialog()).toBeNull();
    // 00:30 on 11/11 in Vietnam.
    vi.setSystemTime(new Date('2026-11-10T17:30:00.000Z'));
    await go('/vi/app');
    await go('/vi/app/groups');
    expect(await screen.findByRole('dialog', { name: 'Học nhiều hơn với Pro' })).toBeInTheDocument();
    expect(stored()).toMatchObject({ date: '2026-11-11', count: 1 });
  });

  it('LB2E9: ads_interstitial_per_day 0 → never', async () => {
    await mount({ routes: routes(ent({ show: true, interstitial_per_day: 0, min_interval_minutes: 10 })) });
    await go('/vi/app/groups');
    expect(dialog()).toBeNull();
  });

  it('LB2E10: another learner on the same device has a counter of their own', async () => {
    localStorage.setItem(houseAdKey('u1'), JSON.stringify({ date: '2099-01-01', count: 3, last_at: 4_000_000_000_000 }));
    await mount({ me: makeMe({ id: 'u2' }) });
    await go('/vi/app/groups');
    expect(await screen.findByRole('dialog', { name: 'Học nhiều hơn với Pro' })).toBeInTheDocument();
    expect(stored('u2')).toMatchObject({ count: 1 });
  });

  it('LB2E11: storage that throws on read or write → nothing is shown', async () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    await mount();
    await go('/vi/app/groups');
    expect(dialog()).toBeNull();
    get.mockRestore();
    await go('/vi/app');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    await go('/vi/app/groups');
    expect(dialog()).toBeNull();
  });

  it('LB2E15: with an AdSense client set the dialog never shows', async () => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT', 'ca-pub-1234567890');
    await mount();
    await go('/vi/app/groups');
    expect(dialog()).toBeNull();
    expect(stored()).toBeNull();
  });

  it('LB2E16: the price is read from plans.pro.prices (89.000 ₫ when the admin set it)', async () => {
    await mount({ routes: routes(ent(), CONFIG({ '1': 89000, '3': 199000, '12': 599000 })) });
    await go('/vi/app/groups');
    await screen.findByRole('dialog', { name: 'Học nhiều hơn với Pro' });
    expect(paragraphs()).toContain('Từ 89.000 ₫ cho 1 tháng');
  });

  it('giao diện mới M7.11: the tags "Pro" and "có AI"; "Để sau" closes it and the count written when it opened stays', async () => {
    await mount();
    await go('/vi/app/groups');
    const box = await screen.findByRole('dialog', { name: 'Học nhiều hơn với Pro' });
    expect(within(box).getByText('Pro')).toBeInTheDocument();
    expect(within(box).getByText('Có AI')).toBeInTheDocument();
    const opened = stored();
    expect(opened).toMatchObject({ count: 1 });
    await userEvent.click(within(box).getByRole('button', { name: 'Để sau' }));
    await waitFor(() => expect(dialog()).toBeNull());
    expect(stored()).toEqual(opened);
  });

  it('LB2A2: ads.show false (Pro, staff, under 16, the switch off, or an older API with no ads field) → no dialog, no count', async () => {
    for (const entitlements of [ent({ show: false, interstitial_per_day: 3, min_interval_minutes: 10 }), ent(null)]) {
      const view = await mount({ routes: routes(entitlements) });
      await go('/vi/app');
      await go('/vi/app/groups');
      expect(dialog()).toBeNull();
      expect(stored()).toBeNull();
      view.unmount();
    }
  });

  it('LB2A2: when the plan is read again and ads.show turns false (Lan just bought Pro) an open dialog goes away', async () => {
    const view = await mount();
    await go('/vi/app/groups');
    expect(await screen.findByRole('dialog', { name: 'Học nhiều hơn với Pro' })).toBeInTheDocument();
    act(() => { view.client.setQueryData(ENTITLEMENTS_KEY, ent({ show: false, interstitial_per_day: 3, min_interval_minutes: 10 })); });
    await waitFor(() => expect(dialog()).toBeNull());
  });
});
