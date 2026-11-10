// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/app-ui/test-utils';
import { LookupPage } from './LookupPage';

const nav = vi.hoisted(() => ({ params: new URLSearchParams(), replace: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/lookup',
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
  useSearchParams: () => nav.params,
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: vi.fn(), isLeaving: () => false }));
vi.setConfig({ testTimeout: 20_000 });

const row = (lemma: string, over = {}) => ({ lemma, pos_list: ['noun'], level: 'A2', meaning_preview: `nghĩa ${lemma}`, has_private: false, ...over });
const base = (extra = {}) => ({
  'GET /v1/topics': () => Response.json({ items: [{ code: 'food', name: 'Ẩm thực' }, { code: 'travel', name: 'Du lịch' }] }),
  'GET /v1/me/app-config': () => Response.json({ learning: { backlog_after_days: 60, groups_per_user: 100 } }),
  'GET /v1/me/entitlements': () => Response.json({ plan: 'free', pools: {}, sources: [] }),
  'GET /v1/groups': () => Response.json({ items: [] }),
  ...extra,
});
const lastUrl = (spy: ReturnType<typeof vi.fn>) => new URL(String(spy.mock.calls.at(-1)?.[0]), 'http://x');

beforeEach(() => {
  nav.params = new URLSearchParams();
  nav.replace.mockClear();
  nav.push.mockClear();
});

describe('LookupPage (K/30, M/40)', () => {
  it('reads the query and every filter from the URL and sends them to GET /v1/words', async () => {
    nav.params = new URLSearchParams({ q: 'go', level: 'A2', topic: 'food', pos: 'verb', mine: 'true' });
    const { calls } = renderApp(<LookupPage />, {
      routes: base({ 'GET /v1/words?page_size=20&q=go&level=A2&topic=food&pos=verb&mine=true': () => Response.json({ items: [row('go', { pos_list: ['verb'] })], next_page_token: null }) }),
    });
    expect(await screen.findByRole('link', { name: 'go' })).toHaveAttribute('href', '/vi/app/word?w=go');
    expect(calls.some((c) => c.path === '/v1/words?page_size=20&q=go&level=A2&topic=food&pos=verb&mine=true')).toBe(true);
    expect(screen.getByRole('button', { name: /Trình độ: A2/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Chủ đề: Ẩm thực/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Chỉ từ của tôi' })).toBeChecked();
  });

  it('a filter change writes the URL; "Chỉ từ của tôi" adds mine=true; "Xóa lọc" keeps only the query', async () => {
    nav.params = new URLSearchParams({ q: 'go', level: 'A2' });
    renderApp(<LookupPage />, {
      routes: base({ 'GET /v1/words?page_size=20&q=go&level=A2': () => Response.json({ items: [row('go')], next_page_token: null }) }),
    });
    await screen.findByRole('link', { name: 'go' });
    await userEvent.click(screen.getByRole('button', { name: /Chủ đề: tất cả/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Du lịch' }));
    expect(Object.fromEntries(lastUrl(nav.replace).searchParams)).toEqual({ q: 'go', level: 'A2', topic: 'travel' });
    await userEvent.click(screen.getByRole('checkbox', { name: 'Chỉ từ của tôi' }));
    expect(lastUrl(nav.replace).searchParams.get('mine')).toBe('true');
    await userEvent.click(screen.getByRole('button', { name: 'Xóa lọc' }));
    expect(lastUrl(nav.replace).pathname).toBe('/vi/app/lookup');
    expect(Object.fromEntries(lastUrl(nav.replace).searchParams)).toEqual({ q: 'go' });
  });

  it('"Xem thêm" loads the next page', async () => {
    nav.params = new URLSearchParams({ q: 'de' });
    renderApp(<LookupPage />, {
      routes: base({
        'GET /v1/words?page_size=20&q=de': () => Response.json({ items: [row('delicious')], next_page_token: 't2' }),
        'GET /v1/words?page_size=20&q=de&page_token=t2': () => Response.json({ items: [row('dessert')], next_page_token: null }),
      }),
    });
    await screen.findByRole('link', { name: 'delicious' });
    await userEvent.click(screen.getByRole('button', { name: 'Xem thêm' }));
    expect(await screen.findByRole('link', { name: 'dessert' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xem thêm' })).not.toBeInTheDocument();
  });

  it('a private word carries a "Của tôi" tag', async () => {
    nav.params = new URLSearchParams({ q: 'rizz' });
    renderApp(<LookupPage />, {
      routes: base({ 'GET /v1/words?page_size=20&q=rizz': () => Response.json({ items: [row('rizz', { has_private: true, level: null })], next_page_token: null }) }),
    });
    const item = await screen.findByRole('listitem', { name: 'rizz' });
    expect(within(item).getByText('Của tôi')).toBeInTheDocument();
  });

  it('nothing found → "Không tìm thấy từ này" with [Thêm từ này]', async () => {
    nav.params = new URLSearchParams({ q: 'rizz' });
    renderApp(<LookupPage />, {
      routes: base({ 'GET /v1/words?page_size=20&q=rizz': () => Response.json({ items: [], next_page_token: null }) }),
    });
    expect(await screen.findByText('Không tìm thấy từ này')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm từ này' })).toBeInTheDocument();
  });
});
