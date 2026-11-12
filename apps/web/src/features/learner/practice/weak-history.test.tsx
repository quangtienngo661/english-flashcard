// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test-utils/render-app';
import type { Route } from '@/app-shell/session/test-support';
import { WeakWordsPage } from './WeakWordsPage';

let search = new URLSearchParams();
vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/practice/weak',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => search,
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: vi.fn(), isLeaving: () => false }));
vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => {
  search = new URLSearchParams();
});

const TECH = '11111111-1111-4111-8111-111111111111';
const NOW = new Date().toISOString();
const weak = (lemma: string, wrong: number, counted: number, level: number, meaning: string | null = `nghĩa ${lemma}`) => ({
  sense_id: `s-${lemma}`, lemma, wrong, counted, level, last_wrong_at: NOW, meaning,
});
const CONFIG = {
  practice: { max_questions_per_session: 20, default_questions_per_session: 10 },
  reminders: { send_time: '20:00' }, learning: { backlog_after_days: 60, groups_per_user: 100 },
  plans: { free: { practice_sessions_per_day: 3, ai_practice_per_cycle: 15, ai_lookup_per_cycle: 5 }, trial: { ai_practice_per_cycle: 100, ai_lookup_per_cycle: 30 }, pro: { practice_sessions_per_day: 30, ai_practice_per_cycle: 300, ai_lookup_per_cycle: 100 } },
};
const ENT = {
  plan: 'free', sources: [], trial_eligible: false, ai_available: { enabled: true, cap_reached: false },
  features: { 'ai.practice': { allowed: false, reason: 'plan-required' }, 'ai.lookup': { allowed: false, reason: 'plan-required' } },
  pools: {
    practice_sessions: { limit: 3, used: 1, remaining: 2, resets_at: '2026-10-23T17:00:00.000Z' },
    ai_practice: { limit: 0, used: 0, remaining: 0, resets_at: null }, ai_lookup: { limit: 0, used: 0, remaining: 0, resets_at: null },
  },
};
const notFound: Route = () => Response.json({ type: 'http://x/problems/not-found', status: 404, title: 'n' }, { status: 404 });
const base = (over: Record<string, Route> = {}): Record<string, Route> => ({
  'GET /v1/groups': () => Response.json({ items: [{ id: TECH, name: 'Công nghệ', version: 1, total: 18, today: { priority: 0, due: 0, new: 0 }, cells: [], backlog: 0 }] }),
  'GET /v1/me/app-config': () => Response.json(CONFIG),
  'GET /v1/me/entitlements': () => Response.json(ENT),
  'GET /v1/practice/sessions/current': notFound,
  'GET /v1/practice/weak-words/groups': () => Response.json({ total: 6, items: [{ group_id: TECH, name: 'Công nghệ', count: 3 }] }),
  'GET /v1/practice/weak-words?page_size=50': () =>
    Response.json({ items: [weak('cache', 2, 3, 1), weak('deploy', 3, 5, 1), weak('release', 2, 5, 2)], next_page_token: null }),
  [`GET /v1/practice/weak-words?group_id=${TECH}&page_size=50`]: () =>
    Response.json({ items: [weak('cache', 2, 3, 1), weak('deploy', 3, 5, 1), weak('release', 2, 5, 2)], next_page_token: null }),
  'POST /v1/practice/sessions': () => Response.json({ session: {} }, { status: 201 }),
  ...over,
});
const posts = (calls: Array<{ method: string; path: string; body: unknown }>, path: string) => calls.filter((c) => c.method === 'POST' && c.path === path);

describe('WeakWordsPage (K/56)', () => {
  it('all decks first: the count, each word with its meaning, ✓/✗ of the last questions, level and when it was last wrong', async () => {
    renderApp(<WeakWordsPage />, { routes: base() });
    expect(await screen.findByRole('heading', { name: '6 từ hay sai' })).toBeInTheDocument();
    const row = (await screen.findByText('deploy')).closest('li')!;
    expect(within(row).getByText('nghĩa deploy')).toBeInTheDocument();
    // Figma 119:4317: ✓ = counted − wrong, ✗ = wrong (deploy: counted 5, wrong 3).
    expect(within(row).getByRole('img', { name: '2 câu đúng' })).toHaveTextContent('2');
    expect(within(row).getByRole('img', { name: '3 câu sai' })).toHaveTextContent('3');
    expect(within(row).queryByText('sai 3/5')).not.toBeInTheDocument();
    expect(within(row).getByText('Bậc 1')).toBeInTheDocument();
    expect(within(row).getByText(/hôm nay$/)).toBeInTheDocument();
    expect(screen.getByText('Vào: sai 2 lần trong 5 câu gần nhất, ở mọi kiểu câu.')).toBeInTheDocument();
  });

  it('API (b): the deck list counts weak words; a deck narrows the list and the start sends its group_id', async () => {
    const view = renderApp(<WeakWordsPage />, { routes: base() });
    await screen.findByRole('heading', { name: '6 từ hay sai' });
    await userEvent.click(screen.getByRole('button', { name: /Nhóm/ }));
    expect(await screen.findByRole('option', { name: 'Tất cả nhóm · 6' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: 'Công nghệ · 3' }));
    expect(await screen.findByRole('heading', { name: '3 từ trong nhóm Công nghệ' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Luyện 3 từ của nhóm Công nghệ' }));
    await waitFor(() => expect(posts(view.calls, '/v1/practice/sessions')).toHaveLength(1));
    expect(posts(view.calls, '/v1/practice/sessions')[0].body).toEqual({
      source: 'weak', group_id: TECH, types: ['mcq_definition', 'true_false_definition', 'type_word'], count: 10,
    });
  });

  it('no weak word yet: an empty state and no start', async () => {
    renderApp(<WeakWordsPage />, {
      routes: base({
        'GET /v1/practice/weak-words/groups': () => Response.json({ total: 0, items: [] }),
        'GET /v1/practice/weak-words?page_size=50': () => Response.json({ items: [], next_page_token: null }),
      }),
    });
    expect(await screen.findByText('Chưa có từ nào hay sai.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Luyện/ })).not.toBeInTheDocument();
  });

  const viewport = (width: number) => {
    window.matchMedia = ((query: string) => {
      const min = /min-width:\s*(\d+)px/.exec(query);
      return { matches: min ? width >= Number(min[1]) : false, media: query, addEventListener: () => {}, removeEventListener: () => {} };
    }) as unknown as typeof window.matchMedia;
  };
  const originalMedia = window.matchMedia;
  afterEach(() => {
    window.matchMedia = originalMedia;
  });

  it('phones (390 px): the "Luyện" card comes before the first word row in document order', async () => {
    viewport(390);
    renderApp(<WeakWordsPage />, { routes: base() });
    const start = await screen.findByRole('button', { name: 'Luyện 6 từ' });
    const first = (await screen.findByText('cache')).closest('li')!;
    expect(start.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('desktop (1280 px): the list comes before the "Luyện" card, so Tab order matches the screen', async () => {
    viewport(1280);
    renderApp(<WeakWordsPage />, { routes: base() });
    const start = await screen.findByRole('button', { name: 'Luyện 6 từ' });
    const first = (await screen.findByText('cache')).closest('li')!;
    expect(first.compareDocumentPosition(start) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
