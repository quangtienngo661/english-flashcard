// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/app-ui/test-utils';
import { BacklogPage } from './BacklogPage';

const G = '22222222-2222-4222-8222-222222222222';
vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/group/backlog',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams({ id: '22222222-2222-4222-8222-222222222222' }),
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: vi.fn(), isLeaving: () => false }));
vi.setConfig({ testTimeout: 20_000 });

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const row = (n: number) => ({
  item_id: uuid(n), sense_id: `s${n}`, level: 2, due_date: '2026-08-01', days_overdue: 60 + n,
  content: { lemma: `word${n}`, pos: 'noun', meaning: { text: `nghĩa ${n}`, language: 'vi', translation_missing: false }, examples: [] },
});
// 150 long-overdue words over two pages.
const page1 = Array.from({ length: 100 }, (_, i) => row(i + 1));
const page2 = Array.from({ length: 50 }, (_, i) => row(i + 101));
const routes = (extra = {}) => ({
  [`GET /v1/groups/${G}`]: () => Response.json({ id: G, name: 'IELTS', version: 1, item_count: 200, removable_items: 0, created_at: '', updated_at: '' }),
  'GET /v1/groups': () => Response.json({ items: [{ id: G, name: 'IELTS', version: 1, total: 200, today: { priority: 0, due: 0, new: 0 }, cells: [], backlog: 150 }] }),
  [`GET /v1/groups/${G}/backlog?page_size=100`]: () => Response.json({ items: page1, next_page_token: 'p2' }),
  [`GET /v1/groups/${G}/backlog?page_size=100&page_token=p2`]: () => Response.json({ items: page2, next_page_token: null }),
  'GET /v1/me/app-config': () => Response.json({ learning: { backlog_after_days: 60, groups_per_user: 100 } }),
  'GET /v1/me/entitlements': () => Response.json({ plan: 'free', pools: {}, sources: [] }),
  'POST /v1/items/relearn': () => Response.json({ relearned: 1 }),
  ...extra,
});

describe('BacklogPage (K/15)', () => {
  it('one yellow button relearns every word, in batches of 100 ids', async () => {
    const { calls } = renderApp(<BacklogPage />, { routes: routes() });
    await userEvent.click(await screen.findByRole('button', { name: 'Học lại cả 150 từ' }));
    await waitFor(() => expect(calls.filter((c) => c.path === '/v1/items/relearn')).toHaveLength(2));
    const batches = calls.filter((c) => c.path === '/v1/items/relearn').map((c) => (c.body as { item_ids: string[] }).item_ids.length);
    expect(batches).toEqual([100, 50]);
    expect(calls.find((c) => c.path === '/v1/items/relearn')!.headers['Idempotency-Key']).toBeTruthy();
  });

  it('selecting rows gives a normal "Học lại 2 từ" button that sends only those', async () => {
    const { calls } = renderApp(<BacklogPage />, { routes: routes() });
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Chọn word1' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Chọn word2' }));
    expect(screen.getByText('Đã chọn 2 từ')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Học lại 2 từ' }));
    await waitFor(() => expect(calls.find((c) => c.path === '/v1/items/relearn')?.body).toEqual({ item_ids: [uuid(1), uuid(2)] }));
  });

  it('"Bỏ khỏi việc học" asks first', async () => {
    const { count } = renderApp(<BacklogPage />, {
      routes: routes({ [`DELETE /v1/items/${uuid(1)}`]: () => new Response(null, { status: 204 }) }),
    });
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Chọn word1' }));
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ khỏi việc học' }));
    const dialog = await screen.findByRole('dialog', { name: 'Bỏ 1 từ khỏi việc học?' });
    expect(count('DELETE', `/v1/items/${uuid(1)}`)).toBe(0);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Bỏ 1 từ' }));
    await waitFor(() => expect(count('DELETE', `/v1/items/${uuid(1)}`)).toBe(1));
  });

  it('the explainer uses the admin number of days', async () => {
    renderApp(<BacklogPage />, { routes: routes() });
    expect(await screen.findByText(/quá hạn hơn 60 ngày sẽ rời phần cần ôn/)).toBeInTheDocument();
    expect(screen.getByText('Nhóm IELTS · 150 từ quá hạn hơn 60 ngày')).toBeInTheDocument();
  });
});
