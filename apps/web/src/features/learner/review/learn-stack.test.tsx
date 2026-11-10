// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/app-ui/test-utils';
import type { Route } from '@/app-shell/session/test-support';
import type { Card } from '../groups/groups-api';
import { ReviewSession } from './ReviewSession';

// M5.8: Học as a dissolving card stack (Figma 80:3228, prototype chong-the-mo.html); QM5-2 = (a): the card leaves at once and the
// review is saved behind it, one at a time; a lost save brings the card back with the same review_id.
const G = '22222222-2222-4222-8222-222222222222';
vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/review',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams({ group: G }),
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: vi.fn(), isLeaving: () => false }));
vi.setConfig({ testTimeout: 30_000 });

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const card = (n: number, lemma: string): Card => ({
  item_id: uuid(n), sense_id: uuid(100 + n), level: 1, due_date: '2026-11-11', priority: false, section: 'due',
  content: {
    sense_id: uuid(100 + n), scope: 'catalog', lemma, pos: 'verb', level: 'B1', context_label: null,
    meaning: { text: `nghĩa ${lemma}`, language: 'vi', translation_missing: false }, definition_en: null,
    examples: [], form_of: null, sentences: [],
  },
});
const CARDS = [card(1, 'deploy'), card(2, 'cache'), card(3, 'merge')];
const routes = (extra: Record<string, Route> = {}): Record<string, Route> => ({
  [`GET /v1/groups/${G}`]: () => Response.json({ id: G, name: 'Công nghệ', version: 1, item_count: 3, removable_items: 0, created_at: '', updated_at: '' }),
  [`GET /v1/groups/${G}/queue?mode=due`]: () => Response.json({ cards: CARDS }),
  'GET /v1/words/deploy': () => Response.json({ inflections: [] }),
  'GET /v1/words/cache': () => Response.json({ inflections: [] }),
  'GET /v1/words/merge': () => Response.json({ inflections: [] }),
  'POST /v1/reviews': () => Response.json({ level: 2 }),
  ...extra,
});
const reviews = (calls: Array<{ method: string; path: string; body: unknown }>) =>
  calls.filter((c) => c.method === 'POST' && c.path === '/v1/reviews').map((c) => c.body as { item_id: string; answer: string; review_id: string });
const top = (n: number) => screen.findByRole('group', { name: `Thẻ ${n} trên 3` });

describe('Học, the card stack (M5.8)', () => {
  it('Space turns the card over and Space again turns it back ("Xem mặt trước")', async () => {
    renderApp(<ReviewSession />, { routes: routes() });
    const first = await top(1);
    await userEvent.keyboard(' ');
    expect(first).toHaveAttribute('data-flipped', 'true');
    expect(screen.getByRole('button', { name: /Xem mặt trước/ })).toBeInTheDocument();
    await userEvent.keyboard(' ');
    expect(first).toHaveAttribute('data-flipped', 'false');
    expect(screen.getByRole('button', { name: /Lật thẻ/ })).toBeInTheDocument();
  });

  it('2 before turning the card over sends nothing and says to turn it first; the answers are aria-disabled', async () => {
    const { calls } = renderApp(<ReviewSession />, { routes: routes() });
    await top(1);
    expect(screen.getByRole('button', { name: /Đã biết/ })).toHaveAttribute('aria-disabled', 'true');
    await userEvent.keyboard('2');
    expect(await screen.findByText('Lật thẻ để xem nghĩa trước đã.')).toBeInTheDocument();
    expect(reviews(calls)).toHaveLength(0);
    expect(await top(1)).toBeInTheDocument();
  });

  it('→ after turning sends known once and moves on; ← sends review', async () => {
    const { calls } = renderApp(<ReviewSession />, { routes: routes() });
    await top(1);
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{ArrowRight}');
    await top(2);
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{ArrowLeft}');
    await top(3);
    await waitFor(() => expect(reviews(calls).map((b) => [b.item_id, b.answer])).toEqual([[uuid(1), 'known'], [uuid(2), 'review']]));
  });

  it('QM5-2 (a): the next card is up before the save returns; saves go one at a time, one per card', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let first = true;
    const { calls } = renderApp(<ReviewSession />, {
      routes: routes({
        'POST /v1/reviews': async () => {
          if (first) {
            first = false;
            await gate;
          }
          return Response.json({ level: 2 });
        },
      }),
    });
    await top(1);
    await userEvent.keyboard(' ');
    await userEvent.keyboard('2');
    // The first save is still open, yet card 2 is on top and can be answered.
    await top(2);
    await userEvent.keyboard(' ');
    await userEvent.keyboard('2');
    await top(3);
    expect(reviews(calls)).toHaveLength(1);
    release();
    await waitFor(() => expect(reviews(calls)).toHaveLength(2));
    expect(reviews(calls).map((b) => b.item_id)).toEqual([uuid(1), uuid(2)]);
  });

  it('Esc while a save is open waits for it before the summary (final review I1, R107)', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const { calls } = renderApp(<ReviewSession />, {
      routes: routes({ 'POST /v1/reviews': async () => { await gate; return Response.json({ level: 2 }); } }),
    });
    await top(1);
    await userEvent.keyboard(' ');
    await userEvent.keyboard('2');
    await top(2);
    await userEvent.keyboard('{Escape}');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('heading', { name: /^Xong/ })).not.toBeInTheDocument();
    release();
    expect(await screen.findByRole('heading', { name: /^Xong/ })).toBeInTheDocument();
    expect(reviews(calls)).toHaveLength(1);
  });

  it('QM5-2 (a): a lost save brings the card back, turned over, with the error; the retry sends the same review_id', async () => {
    let fail = true;
    const { calls } = renderApp(<ReviewSession />, {
      routes: routes({
        'POST /v1/reviews': () => {
          if (fail) {
            fail = false;
            throw new TypeError('Failed to fetch');
          }
          return Response.json({ level: 2 });
        },
      }),
    });
    await top(1);
    await userEvent.keyboard(' ');
    await userEvent.keyboard('2');
    expect(await screen.findByText('Chưa lưu được câu trả lời. Kiểm tra mạng rồi bấm lại.')).toBeInTheDocument();
    expect(await top(1)).toHaveAttribute('data-flipped', 'true');
    expect(within(screen.getByRole('region', { name: 'Đã biết' })).queryByText('deploy')).not.toBeInTheDocument();
    await userEvent.keyboard('2');
    await top(2);
    await waitFor(() => expect(reviews(calls)).toHaveLength(2));
    expect(reviews(calls)[1].review_id).toBe(reviews(calls)[0].review_id);
  });

  it('the piles show the words; the summary lists the words of "Cần ôn lại"', async () => {
    renderApp(<ReviewSession />, { routes: routes() });
    await top(1);
    for (const key of ['1', '2', '1']) {
      await userEvent.keyboard(' ');
      await userEvent.keyboard(key);
    }
    expect(await screen.findByRole('heading', { name: 'Xong 3 thẻ.' })).toBeInTheDocument();
    const review = screen.getByRole('list', { name: 'Cần ôn lại · 2 thẻ' });
    expect(within(review).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['deploy', 'merge']);
    expect(within(screen.getByRole('list', { name: 'Đã biết · 1 thẻ' })).getByText('cache')).toBeInTheDocument();
  });
});
