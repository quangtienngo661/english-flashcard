// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/app-ui/test-utils';
import type { Card } from '../groups/groups-api';
import { ReviewSession } from './ReviewSession';

const G = '22222222-2222-4222-8222-222222222222';
const params = { current: new URLSearchParams({ group: G }) };
vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/review',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => params.current,
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: vi.fn(), isLeaving: () => false }));
vi.setConfig({ testTimeout: 20_000 });

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const card = (n: number, lemma: string, over: Partial<Card> = {}, content: Partial<Card['content']> = {}): Card => ({
  item_id: uuid(n), sense_id: uuid(100 + n), level: 1, due_date: '2026-10-20', priority: false, section: 'due',
  content: {
    sense_id: uuid(100 + n), scope: 'catalog', lemma, pos: 'verb', level: 'B1', context_label: null,
    meaning: { text: `nghĩa ${lemma}`, language: 'vi', translation_missing: false }, definition_en: null,
    examples: [`They ${lemma} updates every week.`], form_of: null, sentences: [], ...content,
  },
  ...over,
});
const DEPLOY = card(1, 'deploy', { priority: true, section: 'priority' }, { meaning: { text: 'triển khai', language: 'vi', translation_missing: false }, sentences: ['We deploy the app every Friday.'] });
const CACHE = card(2, 'cache', {}, { pos: 'noun' });

const routes = (cards: Card[], extra = {}) => ({
  [`GET /v1/groups/${G}`]: () => Response.json({ id: G, name: 'Công nghệ', version: 1, item_count: 2, removable_items: 0, created_at: '', updated_at: '' }),
  [`GET /v1/groups/${G}/queue?mode=due`]: () => Response.json({ cards }),
  [`GET /v1/groups/${G}/queue?mode=all`]: () => Response.json({ cards }),
  'GET /v1/words/deploy': () => Response.json({ lemma: 'deploy', inflections: [{ kind: 'third_person', form: 'deploys', has_page: false }, { kind: 'past', form: 'deployed', has_page: false }], sections: [] }),
  'GET /v1/words/cache': () => Response.json({ lemma: 'cache', inflections: [], sections: [] }),
  'POST /v1/reviews': () => Response.json({ item_id: uuid(1), level: 2, due_date: '2026-10-23', priority: false }),
  ...extra,
});
const posts = (calls: Array<{ method: string; path: string; body: unknown }>) =>
  calls.filter((c) => c.method === 'POST' && c.path === '/v1/reviews').map((c) => c.body as { item_id: string; answer: string; review_id: string; group_id: string });

beforeEach(() => {
  params.current = new URLSearchParams({ group: G });
});

describe('ReviewSession (K/20–K/22)', () => {
  it('front shows the word, its part of speech and "Ưu tiên"; Space flips to forms, meaning, example and the saved sentence', async () => {
    renderApp(<ReviewSession />, { routes: routes([DEPLOY, CACHE]) });
    const front = await screen.findByRole('group', { name: 'Thẻ 1 trên 2' });
    expect(within(front).getByText('deploy')).toBeInTheDocument();
    expect(within(front).getByText('verb')).toBeInTheDocument();
    expect(within(front).getByText('Ưu tiên')).toBeInTheDocument();
    expect(screen.queryByText('triển khai')).not.toBeInTheDocument();
    expect(screen.getByText('còn 2 thẻ')).toBeInTheDocument();

    await userEvent.keyboard(' ');
    expect(await screen.findByText('triển khai')).toBeInTheDocument();
    expect(await screen.findByText('deploys')).toBeInTheDocument();
    expect(screen.getByText('deployed')).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'They deploy updates every week.')).toBeInTheDocument();
    const seen = screen.getByText('Câu bạn đã gặp').parentElement!;
    expect(within(seen).getByText('deploy', { selector: 'mark' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cần ôn lại/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đã biết/ })).toBeInTheDocument();
  });

  it('keys 2 and 1 answer Know / Still learning, each press with a new review_id; the summary counts them', async () => {
    const { calls } = renderApp(<ReviewSession />, { routes: routes([DEPLOY, CACHE]) });
    await screen.findByRole('group', { name: 'Thẻ 1 trên 2' });
    await userEvent.keyboard(' ');
    await userEvent.keyboard('2');
    await screen.findByRole('group', { name: 'Thẻ 2 trên 2' });
    await userEvent.keyboard(' ');
    await userEvent.keyboard('1');
    expect(await screen.findByRole('heading', { name: 'Xong 2 thẻ.' })).toBeInTheDocument();

    const sent = posts(calls);
    expect(sent.map((b) => [b.item_id, b.answer, b.group_id])).toEqual([[uuid(1), 'known', G], [uuid(2), 'review', G]]);
    expect(sent[0].review_id).toMatch(UUID);
    expect(sent[1].review_id).toMatch(UUID);
    expect(sent[0].review_id).not.toBe(sent[1].review_id);
    expect(calls.find((c) => c.path === '/v1/reviews')!.headers['Idempotency-Key']).toBeUndefined();
    expect(screen.getByTestId('known-count')).toHaveTextContent('1');
    expect(screen.getByTestId('review-count')).toHaveTextContent('1');
  });

  it('answers only after the card is flipped', async () => {
    const { calls } = renderApp(<ReviewSession />, { routes: routes([DEPLOY, CACHE]) });
    await screen.findByRole('group', { name: 'Thẻ 1 trên 2' });
    await userEvent.keyboard('2');
    expect(posts(calls)).toHaveLength(0);
    expect(screen.getByRole('group', { name: 'Thẻ 1 trên 2' })).toBeInTheDocument();
  });

  it('a lost connection keeps the card; the retry sends the same review_id (E19)', async () => {
    let fail = true;
    const { calls } = renderApp(<ReviewSession />, {
      routes: routes([DEPLOY, CACHE], {
        'POST /v1/reviews': () => {
          if (fail) {
            fail = false;
            throw new TypeError('Failed to fetch');
          }
          return Response.json({ item_id: uuid(1), level: 2, due_date: '2026-10-23', priority: false });
        },
      }),
    });
    await screen.findByRole('group', { name: 'Thẻ 1 trên 2' });
    await userEvent.keyboard(' ');
    await userEvent.click(screen.getByRole('button', { name: /Đã biết/ }));
    expect(await screen.findByText('Chưa lưu được câu trả lời. Kiểm tra mạng rồi bấm lại.')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Thẻ 1 trên 2' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Đã biết/ }));
    await screen.findByRole('group', { name: 'Thẻ 2 trên 2' });
    const sent = posts(calls);
    expect(sent).toHaveLength(2);
    expect(sent[1].review_id).toBe(sent[0].review_id);
  });

  it('after a failure, a different answer is a new press with a new review_id', async () => {
    let fail = true;
    const { calls } = renderApp(<ReviewSession />, {
      routes: routes([DEPLOY, CACHE], {
        'POST /v1/reviews': () => {
          if (fail) {
            fail = false;
            throw new TypeError('Failed to fetch');
          }
          return Response.json({ item_id: uuid(1), level: 1, due_date: '2026-10-22', priority: true });
        },
      }),
    });
    await screen.findByRole('group', { name: 'Thẻ 1 trên 2' });
    await userEvent.keyboard(' ');
    await userEvent.keyboard('2');
    await screen.findByText('Chưa lưu được câu trả lời. Kiểm tra mạng rồi bấm lại.');
    await userEvent.keyboard('1');
    await screen.findByRole('group', { name: 'Thẻ 2 trên 2' });
    const sent = posts(calls);
    expect(sent.map((b) => b.answer)).toEqual(['known', 'review']);
    expect(sent[1].review_id).not.toBe(sent[0].review_id);
  });

  it('Esc ends the session early with what was answered so far', async () => {
    renderApp(<ReviewSession />, { routes: routes([DEPLOY, CACHE]) });
    await screen.findByRole('group', { name: 'Thẻ 1 trên 2' });
    await userEvent.keyboard(' ');
    await userEvent.keyboard('2');
    await screen.findByRole('group', { name: 'Thẻ 2 trên 2' });
    await userEvent.keyboard('{Escape}');
    expect(await screen.findByRole('heading', { name: 'Xong 1 thẻ.' })).toBeInTheDocument();
    expect(screen.getByTestId('known-count')).toHaveTextContent('1');
    expect(screen.getByTestId('review-count')).toHaveTextContent('0');
  });

  it('"Thử lại" on the offline band refetches active queries but the session keeps its cards (review I4)', async () => {
    const { client, count } = renderApp(<ReviewSession />, { routes: routes([DEPLOY, CACHE]) });
    await screen.findByRole('group', { name: 'Thẻ 1 trên 2' });
    await userEvent.keyboard(' ');
    await userEvent.keyboard('2');
    await screen.findByRole('group', { name: 'Thẻ 2 trên 2' });
    await client.refetchQueries({ type: 'active' });
    expect(count('GET', `/v1/groups/${G}/queue?mode=due`)).toBe(1);
    expect(screen.getByRole('group', { name: 'Thẻ 2 trên 2' })).toBeInTheDocument();
  });

  it('mode=all asks for every card and labels long-overdue ones', async () => {
    params.current = new URLSearchParams({ group: G, mode: 'all' });
    const { count } = renderApp(<ReviewSession />, { routes: routes([card(3, 'leave', { section: 'backlog' })]) });
    const front = await screen.findByRole('group', { name: 'Thẻ 1 trên 1' });
    expect(within(front).getByText('Lâu chưa ôn')).toBeInTheDocument();
    expect(count('GET', `/v1/groups/${G}/queue?mode=all`)).toBe(1);
  });

  it('a reload starts again from the queue: nothing about the session is stored in the browser', async () => {
    const first = renderApp(<ReviewSession />, { routes: routes([DEPLOY, CACHE]) });
    await screen.findByRole('group', { name: 'Thẻ 1 trên 2' });
    await userEvent.keyboard(' ');
    await userEvent.keyboard('2');
    await screen.findByRole('group', { name: 'Thẻ 2 trên 2' });
    first.unmount();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    const second = renderApp(<ReviewSession />, { routes: routes([CACHE]) });
    expect(await screen.findByRole('group', { name: 'Thẻ 1 trên 1' })).toBeInTheDocument();
    expect(second.count('GET', `/v1/groups/${G}/queue?mode=due`)).toBe(1);
  });

  it('an empty queue offers to study every word', async () => {
    renderApp(<ReviewSession />, { routes: routes([]) });
    expect(await screen.findByText('Hôm nay nhóm này không còn thẻ nào.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Học tất cả từ' })).toHaveAttribute('href', `/vi/app/review?group=${G}&mode=all`);
  });

  it('an unknown deck shows not found (E17)', async () => {
    params.current = new URLSearchParams({ group: 'nope' });
    renderApp(<ReviewSession />, { routes: {} });
    expect(await screen.findByText('Không tìm thấy nhóm này.')).toBeInTheDocument();
  });
});

describe('ReviewSession waits for answers', () => {
  it('a second press while the answer is in flight sends nothing', async () => {
    let release!: () => void;
    const { calls } = renderApp(<ReviewSession />, {
      routes: routes([DEPLOY, CACHE], {
        'POST /v1/reviews': () => new Promise<Response>((resolve) => {
          release = () => resolve(Response.json({ item_id: uuid(1), level: 2, due_date: '2026-10-23', priority: false }));
        }),
      }),
    });
    await screen.findByRole('group', { name: 'Thẻ 1 trên 2' });
    await userEvent.keyboard(' ');
    await userEvent.keyboard('2');
    await userEvent.keyboard('2');
    await waitFor(() => expect(posts(calls)).toHaveLength(1));
    release();
    await screen.findByRole('group', { name: 'Thẻ 2 trên 2' });
    expect(posts(calls)).toHaveLength(1);
  });
});
