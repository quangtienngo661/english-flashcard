// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test-utils/render-app';
import { DayDialog } from './DayDialog';

vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

const LEARNED = ['inevitable', 'scrutiny', 'deadline', 'schedule', 'implement', 'viable', 'coherent', 'budget', 'ambiguous', 'mitigate'];
const KNOWN = ['prevalent', 'deploy', 'contract', 'comply', 'allocate', 'deteriorate', 'negotiate', 'candidate'];
const AGAIN = ['feasible', 'substantial', 'reluctant', 'colleague', 'profit', 'fluctuate'];
const item = (kind: 'learned' | 'reviewed', lemma: string | null, i: number, result: 'known' | 'again' = 'known') =>
  ({ kind, item_id: `${kind}-${i}`, lemma, group_id: `g${i % 4}`, result, times: 1 });
// M6 Figma A §4: Thursday 05/11, 10 learned in 4 groups, 22 reviews (16 known, 6 again), one session of 20 (17 right).
const DAY = {
  date: '2026-11-05',
  counts: { learned: 10, reviewed: 22, reviewed_known: 16, reviewed_again: 6, learned_groups: 4, practice_questions: 20 },
  items: [
    ...LEARNED.map((lemma, i) => item('learned', lemma, i)),
    ...KNOWN.map((lemma, i) => item('reviewed', lemma, i)),
    ...AGAIN.map((lemma, i) => item('reviewed', lemma, 20 + i, 'again')),
  ],
  practice_sessions: [{ session_id: 's1', first_position: 1, last_position: 20, questions: 20, correct: 17 }],
  next_page_token: null,
};
const answer = (session: string, i: number, over: Record<string, unknown> = {}) => ({
  item_id: `${session}-a${i}`, session_id: session, sense_id: 'x', lemma: `word${i}`, type: 'type_word', prompt_style: 'meaning',
  prompt: { kind: 'type_meaning' }, answer: `word${i}`, correct: { lemma: `word${i}`, text: `word${i}`, choice_index: null, is_true: null },
  result: 'correct', skipped: false, tries: 1, hint_level: 0, review_action: null, alternative: false,
  answered_at: new Date(Date.UTC(2026, 10, 5, 13, 31) - i * 60_000).toISOString(), local_date: '2026-11-05', translation: null, ...over,
});
const ANSWERS = Array.from({ length: 20 }, (_, i) => answer('s1', i, i === 1 ? { result: 'wrong', answer: 'deterorate', correct: { lemma: 'word1', text: 'deteriorate', choice_index: null, is_true: null } } : {}));
const routes = (over = {}) => ({
  'GET /v1/me/calendar/days/2026-11-05?kind=all&page_size=100': () => Response.json(DAY),
  'GET /v1/practice/history?date=2026-11-05&page_size=100': () => Response.json({ items: ANSWERS, next_page_token: null }),
  'GET /v1/groups': () => Response.json({ items: [] }),
  ...over,
});
const props = (over = {}) => ({ date: '2026-11-05', today: '2026-11-08', onDay: vi.fn(), onBack: vi.fn(), onClose: vi.fn(), ...over });

describe('DayDialog (Figma 103:3820 / 103:4248)', () => {
  it('the sample day: date, summary, cards, scores and 5 answer rows', async () => {
    renderApp(<DayDialog {...props()} />, { routes: routes() });
    const dialog = await screen.findByRole('dialog', { name: '05/11' });
    expect(within(dialog).getByText('thứ năm')).toBeInTheDocument();
    expect(await within(dialog).findByText('Học 10 từ mới · ôn 22 lượt · luyện 20 câu')).toBeInTheDocument();
    const learn = within(dialog).getByRole('region', { name: 'Học 10 từ mới' });
    expect(within(learn).getByText('4 nhóm')).toBeInTheDocument();
    expect(within(learn).getAllByRole('link').map((a) => a.textContent)).toEqual(LEARNED);
    expect(within(learn).getByRole('link', { name: 'budget' })).toHaveAttribute('href', '/vi/app/word?w=budget');
    const review = within(dialog).getByRole('region', { name: 'Ôn 22 lượt' });
    expect(within(review).getByText('16')).toBeInTheDocument();
    expect(within(review).getByText('6')).toBeInTheDocument();
    const practice = within(dialog).getByRole('region', { name: 'Luyện tập · 1 phiên' });
    expect(within(practice).getByText('17/20')).toBeInTheDocument();
    expect(within(practice).getByText('câu 1–20')).toBeInTheDocument();
    expect(within(practice).getAllByRole('listitem')).toHaveLength(5);
    expect(within(practice).getByText('bạn trả lời deterorate · đáp án: deteriorate')).toBeInTheDocument();
    expect(within(practice).getByText('20:31')).toBeInTheDocument();
    expect(within(practice).getByRole('button', { name: 'Xem đủ 20 câu' })).toBeInTheDocument();
  });

  it('the filter "Ôn 22" keeps only the Ôn card and the counts', async () => {
    renderApp(<DayDialog {...props()} />, { routes: routes() });
    await screen.findByRole('region', { name: 'Ôn 22 lượt' });
    await userEvent.click(screen.getByRole('button', { name: 'Ôn 22' }));
    expect(screen.getByRole('button', { name: 'Ôn 22' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('region', { name: 'Học 10 từ mới' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Luyện tập · 1 phiên' })).toBeNull();
    expect(screen.getByText('Học 10 từ mới · ôn 22 lượt · luyện 20 câu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Học 10' })).toBeInTheDocument();
  });

  it('a hidden sense reads "Từ không còn trong kho" and is not a link; a filter tab with 0 is disabled', async () => {
    const day = { ...DAY, counts: { ...DAY.counts, learned: 1, practice_questions: 0, reviewed: 0, reviewed_known: 0, reviewed_again: 0, learned_groups: 0 },
      items: [item('learned', null, 1)], practice_sessions: [] };
    renderApp(<DayDialog {...props()} />, { routes: routes({ 'GET /v1/me/calendar/days/2026-11-05?kind=all&page_size=100': () => Response.json(day) }) });
    const learn = await screen.findByRole('region', { name: 'Học 1 từ mới' });
    expect(within(learn).getByText('Từ không còn trong kho')).toBeInTheDocument();
    expect(within(learn).queryByRole('link')).toBeNull();
    expect(screen.getByRole('button', { name: 'Luyện 0' })).toBeDisabled();
    expect(screen.getAllByText('Học 1 từ mới')).toHaveLength(2);
  });

  it('12 learned words show 10 and "+2 từ"; pressing it shows all 12', async () => {
    const words = [...LEARNED, 'extra', 'more'];
    const day = { ...DAY, counts: { ...DAY.counts, learned: 12 }, items: words.map((lemma, i) => item('learned', lemma, i)) };
    renderApp(<DayDialog {...props()} />, { routes: routes({ 'GET /v1/me/calendar/days/2026-11-05?kind=all&page_size=100': () => Response.json(day) }) });
    const learn = await screen.findByRole('region', { name: 'Học 12 từ mới' });
    expect(within(learn).getAllByRole('link')).toHaveLength(10);
    await userEvent.click(within(learn).getByRole('button', { name: '+2 từ' }));
    expect(within(learn).getAllByRole('link')).toHaveLength(12);
  });

  it('a session of 130 answers over two history pages: "Xem đủ 130 câu" loads page 2 and lists 130 rows', async () => {
    const day = { ...DAY, counts: { ...DAY.counts, practice_questions: 130 },
      practice_sessions: [{ session_id: 's1', first_position: 1, last_position: 130, questions: 130, correct: 120 }] };
    const all = Array.from({ length: 130 }, (_, i) => answer('s1', i));
    const view = renderApp(<DayDialog {...props()} />, { routes: routes({
      'GET /v1/me/calendar/days/2026-11-05?kind=all&page_size=100': () => Response.json(day),
      'GET /v1/practice/history?date=2026-11-05&page_size=100': () => Response.json({ items: all.slice(0, 100), next_page_token: 'p2' }),
      'GET /v1/practice/history?date=2026-11-05&page_size=100&page_token=p2': () => Response.json({ items: all.slice(100), next_page_token: null }),
    }) });
    const practice = await screen.findByRole('region', { name: 'Luyện tập · 1 phiên' });
    expect(view.count('GET', '/v1/practice/history?date=2026-11-05&page_size=100&page_token=p2')).toBe(0);
    await userEvent.click(within(practice).getByRole('button', { name: 'Xem đủ 130 câu' }));
    expect(await within(practice).findAllByRole('listitem')).toHaveLength(130);
    expect(view.count('GET', '/v1/practice/history?date=2026-11-05&page_size=100&page_token=p2')).toBe(1);
  });

  it('two sessions in one day: two score blocks in order, each with its own rows', async () => {
    const day = { ...DAY, practice_sessions: [
      { session_id: 's1', first_position: 1, last_position: 2, questions: 2, correct: 1 },
      { session_id: 's2', first_position: 1, last_position: 1, questions: 1, correct: 1 },
    ] };
    const items = [answer('s2', 0, { lemma: 'late' }), answer('s1', 1, { lemma: 'middle' }), answer('s1', 2, { lemma: 'early' })];
    renderApp(<DayDialog {...props()} />, { routes: routes({
      'GET /v1/me/calendar/days/2026-11-05?kind=all&page_size=100': () => Response.json(day),
      'GET /v1/practice/history?date=2026-11-05&page_size=100': () => Response.json({ items, next_page_token: null }),
    }) });
    const practice = await screen.findByRole('region', { name: 'Luyện tập · 2 phiên' });
    const blocks = within(practice).getAllByRole('list');
    expect(blocks.map((list) => within(list).getAllByRole('listitem').map((li) => li.textContent?.match(/late|middle|early/)?.[0]))).toEqual([['middle', 'early'], ['late']]);
    expect(within(practice).getByText('1/2')).toBeInTheDocument();
    expect(within(practice).getByText('1/1')).toBeInTheDocument();
  });

  it('a future day: "Chưa tới ngày này." and no request; "Ngày sau" disabled', async () => {
    const view = renderApp(<DayDialog {...props({ date: '2026-11-09' })} />, { routes: routes() });
    expect(await screen.findByText('Chưa tới ngày này.')).toBeInTheDocument();
    expect(view.calls.filter((c) => c.path.includes('2026-11-09'))).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Ngày sau' })).toBeDisabled();
  });

  it('a day without activity says so', async () => {
    const empty = { ...DAY, counts: { learned: 0, reviewed: 0, reviewed_known: 0, reviewed_again: 0, learned_groups: 0, practice_questions: 0 }, items: [], practice_sessions: [] };
    renderApp(<DayDialog {...props()} />, { routes: routes({
      'GET /v1/me/calendar/days/2026-11-05?kind=all&page_size=100': () => Response.json(empty),
      'GET /v1/practice/history?date=2026-11-05&page_size=100': () => Response.json({ items: [], next_page_token: null }),
    }) });
    expect(await screen.findByText('Ngày này không có lần học nào.')).toBeInTheDocument();
  });

  it('today: "Ngày sau" disabled, " · hôm nay" after the weekday; arrows and Esc', async () => {
    const p = props({ date: '2026-11-08' });
    renderApp(<DayDialog {...p} />, { routes: routes({
      'GET /v1/me/calendar/days/2026-11-08?kind=all&page_size=100': () => Response.json({ ...DAY, date: '2026-11-08' }),
      'GET /v1/practice/history?date=2026-11-08&page_size=100': () => Response.json({ items: [], next_page_token: null }),
    }) });
    expect(await screen.findByText('chủ nhật · hôm nay')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ngày sau' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Ngày trước' }));
    expect(p.onDay).toHaveBeenCalledWith('2026-11-07');
    await userEvent.click(screen.getByRole('button', { name: 'Lịch tháng 11' }));
    expect(p.onBack).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('{Escape}');
    expect(p.onBack).toHaveBeenCalledTimes(2);
  });
});
