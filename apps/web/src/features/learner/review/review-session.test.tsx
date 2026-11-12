// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { installSpeech, makeVoice } from '@/lib/speech/speech-test-support';
import { StreakToast } from '@/ui/StreakToast';
import { renderApp } from '@/test-utils/render-app';
import { STREAK_KEY } from '../calendar/calendar-api';
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
  it('M6.9: Học shows one "Lịch học" in its bar (phone)', async () => {
    renderApp(<ReviewSession />, { routes: routes([DEPLOY, CACHE]) });
    await screen.findByRole('group', { name: 'Thẻ 1 trên 2' });
    expect(screen.getAllByRole('button', { name: 'Lịch học' })).toHaveLength(1);
  });

  it('front shows the word, its part of speech and "Ưu tiên"; Space flips to forms, meaning, example and the saved sentence', async () => {
    renderApp(<ReviewSession />, { routes: routes([DEPLOY, CACHE]) });
    // Both faces stay mounted (1C); the front is its own face.
    const front = (await screen.findByRole('group', { name: 'Thẻ 1 trên 2' })).querySelector<HTMLElement>('[data-face="front"]')!;
    expect(within(front).getByText('deploy')).toBeInTheDocument();
    expect(within(front).getByText('verb')).toBeInTheDocument();
    expect(within(front).getByText('Ưu tiên')).toBeInTheDocument();
    expect(screen.getByText('triển khai').closest('[data-face]')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('còn 2 thẻ')).toBeInTheDocument();

    await userEvent.keyboard(' ');
    expect(await screen.findByText('triển khai')).toBeInTheDocument();
    expect(await screen.findByText('deploys')).toBeInTheDocument();
    expect(screen.getByText('deployed')).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'They deploy updates every week.')).toBeInTheDocument();
    const seen = screen.getByText('Câu bạn đã gặp').parentElement!;
    expect(within(seen).getByRole('strong')).toHaveTextContent(/^deploy$/);
    expect(screen.getByRole('button', { name: /Cần ôn lại/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đã biết/ })).toBeInTheDocument();
  });

  it('3D flip (owner 27/10/2026, 1C): both faces stay mounted, so the card keeps the taller face; the hidden face is inert and aria-hidden', async () => {
    renderApp(<ReviewSession />, { routes: routes([DEPLOY, CACHE]) });
    const card = await screen.findByRole('group', { name: 'Thẻ 1 trên 2' });
    const front = card.querySelector('[data-face="front"]')!;
    const back = card.querySelector('[data-face="back"]')!;
    expect(card).toHaveAttribute('data-flipped', 'false');
    expect(front).not.toHaveAttribute('aria-hidden');
    expect(back).toHaveAttribute('aria-hidden', 'true');
    expect(back).toHaveAttribute('inert');
    await userEvent.keyboard(' ');
    expect(card).toHaveAttribute('data-flipped', 'true');
    expect(front).toHaveAttribute('aria-hidden', 'true');
    expect(front).toHaveAttribute('inert');
    expect(back).not.toHaveAttribute('aria-hidden');
    expect(back).not.toHaveAttribute('inert');
    expect(card.querySelector('[data-face="front"]')).toBe(front);
    // Option C (owner 27/10/2026): one column — the meaning runs the full width at text-title-lg, the example comes below it.
    const meaning = within(back as HTMLElement).getByText('triển khai');
    const example = within(back as HTMLElement).getByText('Câu mẫu');
    expect(meaning.compareDocumentPosition(example) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // M5.8: the card is the top of the Học stack; its arrival is a Web Animation (card-stack.test.tsx), not a CSS class.
    expect(card.closest('.cstack')).not.toBeNull();
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

  it('M5.8: one progress bar counts the cards done; the summary blocks rise 90 ms apart', async () => {
    renderApp(<ReviewSession />, { routes: routes([DEPLOY, CACHE]) });
    await screen.findByRole('group', { name: 'Thẻ 1 trên 2' });
    expect(screen.getByRole('progressbar', { name: 'còn 2 thẻ' })).toHaveAttribute('aria-valuenow', '0');
    await userEvent.keyboard(' ');
    await userEvent.keyboard('2');
    await screen.findByRole('group', { name: 'Thẻ 2 trên 2' });
    expect(screen.getByRole('progressbar', { name: 'còn 1 thẻ' })).toHaveAttribute('aria-valuenow', '1');

    await userEvent.keyboard(' ');
    await userEvent.keyboard('1');
    const heading = await screen.findByRole('heading', { name: 'Xong 2 thẻ.' });
    expect(heading.parentElement).toHaveClass('motion-safe:[animation-delay:90ms]');
    expect(screen.getByTestId('known-count').closest('[class*="animate-summary-in"]')).toHaveClass('motion-safe:[animation-delay:180ms]');
    // The way home sits in the actions row (đợt C: Ôn may stand beside it); the row rises as one block.
    expect(screen.getByRole('link', { name: /Về trang chủ|Về Hôm nay/ }).parentElement).toHaveClass('motion-safe:[animation-delay:270ms]');
  });

  it('after answering, the live region says the new card and focus is on [Lật thẻ] (audit 26/10/2026 #8)', async () => {
    const { container } = renderApp(<ReviewSession />, { routes: routes([DEPLOY, CACHE]) });
    await screen.findByRole('group', { name: 'Thẻ 1 trên 2' });
    const live = container.querySelector('[data-live="result"]')!;
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toHaveTextContent('');
    await userEvent.keyboard(' ');
    await userEvent.click(screen.getByRole('button', { name: /Đã biết/ }));
    await screen.findByRole('group', { name: 'Thẻ 2 trên 2' });
    await waitFor(() => expect(live).toHaveTextContent('Thẻ 2 trên 2'));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Lật thẻ/ }));
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

  it('đợt C DC9: the first flip of the day shows the streak toast; a later one without `streak` shows nothing new', async () => {
    let first = true;
    renderApp(<><ReviewSession /><StreakToast /></>, { routes: routes([DEPLOY, CACHE], {
      'POST /v1/reviews': () => {
        const streak = first ? { days: 13 } : null;
        first = false;
        return Response.json({ item_id: uuid(1), level: 1, due_date: '2026-10-21', priority: false, streak });
      },
    }) });
    await screen.findByRole('group', { name: 'Thẻ 1 trên 2' });
    await userEvent.keyboard(' ');
    await userEvent.keyboard('2');
    expect(await screen.findByText('13 ngày liên tiếp')).toBeInTheDocument();
    expect(screen.getAllByText(/ngày liên tiếp/)).toHaveLength(1);
  });

  it('M6.2: the first flip of the day writes the streak cache; no GET /v1/me/streak follows', async () => {
    const v = renderApp(<ReviewSession />, { routes: routes([DEPLOY, CACHE], {
      'POST /v1/reviews': () => Response.json({ item_id: uuid(1), level: 1, due_date: '2026-10-21', priority: false, streak: { days: 6 } }),
    }) });
    await screen.findByRole('group', { name: 'Thẻ 1 trên 2' });
    await userEvent.keyboard(' ');
    await userEvent.keyboard('2');
    await waitFor(() => expect(v.client.getQueryData(STREAK_KEY)).toEqual({ days: 6, studied_today: true }));
    expect(v.count('GET', '/v1/me/streak')).toBe(0);
  });

  it('đợt C DC25: mode=new asks for the new words only', async () => {
    params.current = new URLSearchParams({ group: G, mode: 'new' });
    const { count } = renderApp(<ReviewSession />, { routes: routes([], { [`GET /v1/groups/${G}/queue?mode=new`]: () => Response.json({ cards: [card(4, 'board', { level: 0, section: 'new' })] }) }) });
    await screen.findByRole('group', { name: 'Thẻ 1 trên 1' });
    expect(count('GET', `/v1/groups/${G}/queue?mode=new`)).toBe(1);
    expect(count('GET', `/v1/groups/${G}/queue?mode=due`)).toBe(0);
  });

  it('đợt C §4.1: after Học, a deck with due words offers Ôn; one without does not', async () => {
    const summary = (due: number) => ({
      id: G, name: 'Công nghệ', version: 1, total: 2, today: { priority: 0, due, new: 0 },
      cells: [0, 2, 0, 0, 0, 0].map((total, level) => ({ level, total, due: 0 })), backlog: 0, available: { due, new: 0 },
    });
    const view = renderApp(<ReviewSession />, { routes: routes([CACHE], { 'GET /v1/groups': () => Response.json({ items: [summary(4)] }) }) });
    await screen.findByRole('group', { name: 'Thẻ 1 trên 1' });
    await userEvent.keyboard(' ');
    await userEvent.keyboard('2');
    expect(await screen.findByRole('link', { name: 'Ôn' })).toHaveAttribute('href', `/vi/app/recall?group=${G}`);
    view.unmount();

    renderApp(<ReviewSession />, { routes: routes([CACHE], { 'GET /v1/groups': () => Response.json({ items: [summary(0)] }) }) });
    await screen.findByRole('group', { name: 'Thẻ 1 trên 1' });
    await userEvent.keyboard(' ');
    await userEvent.keyboard('2');
    expect(await screen.findByRole('heading', { name: 'Xong 1 thẻ.' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ôn' })).not.toBeInTheDocument();
  });

  it('mode=all asks for every card and labels long-overdue ones', async () => {
    params.current = new URLSearchParams({ group: G, mode: 'all' });
    const { count } = renderApp(<ReviewSession />, { routes: routes([card(3, 'leave', { section: 'backlog' })]) });
    const front = (await screen.findByRole('group', { name: 'Thẻ 1 trên 1' })).querySelector<HTMLElement>('[data-face="front"]')!;
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

describe('ReviewSession pronunciation (đợt cải thiện A, C1; review plan I3)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('front: the speak buttons sit outside the flip button; pressing one reads without flipping; Space, 1, 2 on it neither flip nor grade', async () => {
    const synth = installSpeech([makeVoice('en-GB'), makeVoice('en-US')]);
    const { calls } = renderApp(<ReviewSession />, { routes: routes([DEPLOY, CACHE]) });
    const front = await screen.findByRole('group', { name: 'Thẻ 1 trên 2' });
    const uk = within(front).getByRole('button', { name: 'Nghe giọng Anh-Mỹ' });
    const flip = within(front).getAllByRole('button').find((b) => b.textContent?.includes('deploy') && !b.getAttribute('aria-label'))!;
    expect(flip.contains(uk)).toBe(false);
    expect(uk.closest('button')).toBe(uk);
    await userEvent.click(uk);
    expect(synth.speak).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'deploy', lang: 'en-US' }));
    uk.focus();
    await userEvent.keyboard(' 12');
    expect(screen.getByText('triển khai').closest('[data-face]')).toHaveAttribute('aria-hidden', 'true');
    expect(posts(calls)).toHaveLength(0);
    expect(synth.speak).toHaveBeenCalledTimes(2);
  });

  it('đợt C §5.3: both faces show UK and US with their IPA; a ready file plays, a missing one falls back to the browser voice', async () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    const uk = makeVoice('en-GB');
    const synth = installSpeech([uk, makeVoice('en-US')]);
    const luggage = card(5, 'luggage', {}, { pos: 'noun', pronunciation: { uk: 'ˈlʌɡ.ɪdʒ', us: 'ˈlʌɡɪdʒ', custom: null, audio: { uk: null, us: 'https://audio.test/us.mp3' } } });
    renderApp(<ReviewSession />, { routes: routes([luggage]) });
    const front = (await screen.findByRole('group', { name: 'Thẻ 1 trên 1' })).querySelector<HTMLElement>('[data-face="front"]')!;
    expect(within(front).getByText('/ˈlʌɡ.ɪdʒ/')).toBeInTheDocument();
    expect(within(front).getByText('/ˈlʌɡɪdʒ/')).toBeInTheDocument();
    await userEvent.click(within(front).getByRole('button', { name: 'Nghe giọng Anh-Mỹ' }));
    expect(play).toHaveBeenCalledTimes(1);
    await userEvent.click(within(front).getByRole('button', { name: 'Nghe giọng Anh-Anh' }));
    expect(synth.speak).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'luggage', voice: uk }));
    await userEvent.keyboard(' ');
    const back = screen.getByRole('group', { name: 'Thẻ 1 trên 1' }).querySelector<HTMLElement>('[data-face="back"]')!;
    expect(within(back).getByText('/ˈlʌɡ.ɪdʒ/')).toBeInTheDocument();
    play.mockRestore();
  });

  it('back: the speaker icon by the word (US voice), a button by the example and by the saved sentence (local voice)', async () => {
    const synth = installSpeech([makeVoice('en-GB'), makeVoice('en-US')]);
    renderApp(<ReviewSession />, { routes: routes([DEPLOY, CACHE]) });
    await screen.findByRole('group', { name: 'Thẻ 1 trên 2' });
    await userEvent.keyboard(' ');
    const card = await screen.findByRole('group', { name: 'Thẻ 1 trên 2' });
    await within(card).findByText('triển khai');
    expect(within(card).getAllByRole('button', { name: 'Nghe giọng Anh-Mỹ' }).length).toBeGreaterThan(0);
    const sentences = within(card).getAllByRole('button', { name: 'Nghe câu' });
    expect(sentences).toHaveLength(2);
    await userEvent.click(sentences[1]);
    expect(synth.speak).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'We deploy the app every Friday.' }));
  });
});
