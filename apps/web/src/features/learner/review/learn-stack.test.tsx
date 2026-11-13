// @vitest-environment jsdom
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test-utils/render-app';
import { testRoute } from '@/test-utils/route-locale';
import type { Route } from '@/app-shell/session/test-support';
import type { Card } from '../groups/groups-api';
import { ReviewSession } from './ReviewSession';

// M5.8: Học as a dissolving card stack (Figma 80:3228, prototype chong-the-mo.html); QM5-2 = (a): the card leaves at once and the
// review is saved behind it, one at a time; a lost save brings the card back with the same review_id.
const G = '22222222-2222-4222-8222-222222222222';
vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: testRoute.locale }),
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
const top = (n: number) => screen.findByRole('group', { name: `Card ${n} of 3` });
/** `useDesktop()` and the motion helpers read matchMedia; jsdom's default answers false (phone). */
const media = window.matchMedia;
const desktop = (on: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: on && query.includes('min-width'), media: query, addEventListener: () => {}, removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
};
afterEach(() => {
  window.matchMedia = media;
});

describe('Học, the card stack (M5.8)', () => {
  it('Space turns the card over and Space again turns it back ("Xem mặt trước")', async () => {
    renderApp(<ReviewSession />, { session: true, routes: routes() });
    const first = await top(1);
    await userEvent.keyboard(' ');
    expect(first).toHaveAttribute('data-flipped', 'true');
    expect(screen.getByRole('button', { name: /See the front/ })).toBeInTheDocument();
    await userEvent.keyboard(' ');
    expect(first).toHaveAttribute('data-flipped', 'false');
    expect(screen.getByRole('button', { name: /Flip card/ })).toBeInTheDocument();
  });

  it('2 before turning the card over sends nothing and says to turn it first; the answers are aria-disabled', async () => {
    const { calls } = renderApp(<ReviewSession />, { session: true, routes: routes() });
    await top(1);
    expect(screen.getByRole('button', { name: /Known/ })).toHaveAttribute('aria-disabled', 'true');
    await userEvent.keyboard('2');
    expect(await screen.findByText('Flip the card to see the meaning first.')).toBeInTheDocument();
    expect(reviews(calls)).toHaveLength(0);
    expect(await top(1)).toBeInTheDocument();
  });

  it('→ after turning sends known once and moves on; ← sends review', async () => {
    const { calls } = renderApp(<ReviewSession />, { session: true, routes: routes() });
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
      session: true,
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
      session: true,
      routes: routes({ 'POST /v1/reviews': async () => { await gate; return Response.json({ level: 2 }); } }),
    });
    await top(1);
    await userEvent.keyboard(' ');
    await userEvent.keyboard('2');
    await top(2);
    await userEvent.keyboard('{Escape}');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('heading', { name: /done$/ })).not.toBeInTheDocument();
    release();
    expect(await screen.findByRole('heading', { name: /done$/ })).toBeInTheDocument();
    expect(reviews(calls)).toHaveLength(1);
  });

  it('QM5-2 (a): a lost save brings the card back, turned over, with the error; the retry sends the same review_id', async () => {
    let fail = true;
    const { calls } = renderApp(<ReviewSession />, {
      session: true,
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
    expect(await screen.findByText("Couldn’t save your answer. Check your connection and try again.")).toBeInTheDocument();
    expect(await top(1)).toHaveAttribute('data-flipped', 'true');
    expect(within(screen.getByRole('region', { name: 'Known' })).queryByText('deploy')).not.toBeInTheDocument();
    await userEvent.keyboard('2');
    await top(2);
    await waitFor(() => expect(reviews(calls)).toHaveLength(2));
    expect(reviews(calls)[1].review_id).toBe(reviews(calls)[0].review_id);
  });

  it('the piles show the words; the summary lists the words of "Needs review"', async () => {
    renderApp(<ReviewSession />, { session: true, routes: routes() });
    await top(1);
    for (const key of ['1', '2', '1']) {
      await userEvent.keyboard(' ');
      await userEvent.keyboard(key);
    }
    expect(await screen.findByRole('heading', { name: '3 cards done' })).toBeInTheDocument();
    const review = screen.getByRole('list', { name: 'Needs review · 2 cards' });
    expect(within(review).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['deploy', 'merge']);
    expect(within(screen.getByRole('list', { name: 'Known · 1 card' })).getByText('cache')).toBeInTheDocument();
  });

  it('Review Focus 5: 2 pressed twice in the same instant after a flip records one answer; no card is left behind', async () => {
    desktop(true);
    const { calls } = renderApp(<ReviewSession />, { session: true, routes: routes() });
    await top(1);
    await userEvent.keyboard(' ');
    // Both presses land before React renders again (well inside 100 ms), so both handlers see card 1 turned over.
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    });
    expect(await top(2)).toHaveAttribute('data-flipped', 'false');
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.getAllByRole('group')).toHaveLength(1);
    expect(within(screen.getByRole('region', { name: 'Known' })).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['deploy']);
    await userEvent.keyboard('{Escape}');
    expect(await screen.findByRole('heading', { name: '1 card done' })).toBeInTheDocument();
    expect(reviews(calls).map((b) => [b.item_id, b.answer])).toEqual([[uuid(1), 'known']]);
  });
});

describe('Học layout (P.17, mockup L227-304)', () => {
  it('phone: the card comes first, the piles under it; the side buttons are icons named "Needs review" and "Known"; no key hints', async () => {
    desktop(false);
    renderApp(<ReviewSession />, { session: true, routes: routes() });
    const card = await top(1);
    const review = screen.getByRole('region', { name: 'Needs review' });
    const known = screen.getByRole('region', { name: 'Known' });
    expect(card.compareDocumentPosition(review) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(review.compareDocumentPosition(known) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Needs review' })).toHaveTextContent(/^$/);
    expect(screen.getByRole('button', { name: 'Known' })).toHaveTextContent(/^$/);
    expect(screen.getByRole('button', { name: 'Flip card' })).toHaveTextContent(/^Flip card$/);
    expect(document.querySelector('kbd')).toBeNull();
    expect(screen.queryByRole('list', { name: 'Keys' })).not.toBeInTheDocument();
    expect(within(card).getByText('Tap the card to flip')).toBeInTheDocument();
    expect(within(card).queryByText('Click the card or press Space to flip')).not.toBeInTheDocument();
    // No word chips drop into the piles on a phone, only the counts move.
    await userEvent.keyboard(' ');
    await userEvent.keyboard('2');
    await top(2);
    expect(within(known).queryByRole('listitem')).not.toBeInTheDocument();
    expect(within(known).getByText('1')).toBeInTheDocument();
  });

  it('desktop: buttons carry only their label; the legend lists Space, 1/←, 2/→ and Esc; piles show number and label without arrows', async () => {
    desktop(true);
    renderApp(<ReviewSession />, { session: true, routes: routes() });
    const card = await top(1);
    expect(screen.getByRole('button', { name: 'Needs review' })).toHaveTextContent(/^Needs review$/);
    expect(screen.getByRole('button', { name: 'Known' })).toHaveTextContent(/^Known$/);
    expect(screen.getByRole('button', { name: 'Flip card' })).toHaveTextContent(/^Flip card$/);
    expect(document.querySelectorAll('button kbd')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Known' })).toHaveAttribute('aria-keyshortcuts', '2 ArrowRight');
    const legend = screen.getByRole('list', { name: 'Keys' });
    expect(within(legend).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['SpaceFlip card', '1←Needs review', '2→Known', 'EscStop session']);
    expect(within(card).getByText('Click the card or press Space to flip')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Needs review' })).toHaveTextContent(/^0Needs review$/);
    expect(screen.getByRole('region', { name: 'Known' })).toHaveTextContent(/^0Known$/);
  });

  it('above the card a line shows where to drag it: left for Needs review, right for Known (owner 13/11/2026)', async () => {
    renderApp(<ReviewSession />, { session: true, routes: routes() });
    await top(1);
    const hint = screen.getByRole('note', { name: 'Drag the card' });
    expect(hint).toHaveTextContent(/^Needs review\s*Drag the card\s*Known$/);
  });

  it('the X alone ends the session: a button named "Stop" with no text', async () => {
    renderApp(<ReviewSession />, { session: true, routes: routes() });
    await top(1);
    const stop = screen.getByRole('button', { name: 'Close review' });
    expect(stop).toHaveTextContent(/^$/);
    expect(stop).not.toHaveAttribute('title');
    await userEvent.click(stop);
    expect(await screen.findByRole('heading', { name: /done$/ })).toBeInTheDocument();
  });

  it('L-B-2: the back of the card names its level and when it comes back; a new word says "New word"', async () => {
    const fresh = { ...card(4, 'board'), level: 0 };
    renderApp(<ReviewSession />, { session: true, routes: routes({ [`GET /v1/groups/${G}/queue?mode=due`]: () => Response.json({ cards: [CARDS[0], fresh] }), 'GET /v1/words/board': () => Response.json({ inflections: [] }) }) });
    const first = await screen.findByRole('group', { name: 'Card 1 of 2' });
    const back = first.querySelector<HTMLElement>('[data-face="back"]')!;
    expect(within(back).getByText('Level 1 · review in 1 day')).toBeInTheDocument();
    await userEvent.keyboard(' ');
    await userEvent.keyboard('2');
    const second = await screen.findByRole('group', { name: 'Card 2 of 2' });
    expect(within(second.querySelector<HTMLElement>('[data-face="back"]')!).getByText('New word')).toBeInTheDocument();
  });
});
