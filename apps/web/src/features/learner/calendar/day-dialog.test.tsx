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
// M6 Figma A §4: Thursday 05/11, 10 learned in 4 groups, 22 reviews (16 known, 6 again), one session of 20 (17 right; the dialog no longer lists practice, f19).
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
const routes = (over = {}) => ({
  'GET /v1/me/calendar/days/2026-11-05?kind=all&page_size=100': () => Response.json(DAY),
  'GET /v1/groups': () => Response.json({ items: [] }),
  ...over,
});
const props = (over = {}) => ({ date: '2026-11-05', today: '2026-11-08', onDay: vi.fn(), onBack: vi.fn(), onClose: vi.fn(), ...over });

describe('DayDialog (Figma 103:3820 / 103:4248)', () => {
  it('the sample day: date, summary and the Học and Ôn cards, with no practice block and no practice request', async () => {
    const view = renderApp(<DayDialog {...props()} />, { routes: routes() });
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
    expect(within(dialog).queryByRole('region', { name: /^Luyện tập/ })).toBeNull();
    expect(within(dialog).queryByRole('button', { name: /^Luyện/ })).toBeNull();
    expect(view.calls.filter((c) => c.path.startsWith('/v1/practice/history'))).toHaveLength(0);
  });

  it('the filter "Ôn 22" keeps only the Ôn card and the counts', async () => {
    renderApp(<DayDialog {...props()} />, { routes: routes() });
    await screen.findByRole('region', { name: 'Ôn 22 lượt' });
    await userEvent.click(screen.getByRole('button', { name: 'Ôn 22' }));
    expect(screen.getByRole('button', { name: 'Ôn 22' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('region', { name: 'Học 10 từ mới' })).toBeNull();
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
    expect(screen.getByRole('button', { name: 'Ôn 0' })).toBeDisabled();
    expect(screen.getAllByText('Học 1 từ mới')).toHaveLength(2);
  });

  it('the "Tất cả" chip is enabled when the day has activity and disabled when its total is 0', async () => {
    const active = renderApp(<DayDialog {...props()} />, { routes: routes() });
    await screen.findByRole('region', { name: 'Ôn 22 lượt' });
    expect(screen.getByRole('button', { name: /^Tất cả/ })).toBeEnabled();
    active.unmount();
    const empty = { ...DAY, counts: { ...DAY.counts, learned: 0, practice_questions: 0, reviewed: 0, reviewed_known: 0, reviewed_again: 0, learned_groups: 0 }, items: [] };
    // Zero counts with a session still listed is the only way the body (and so the chips) shows with a total of 0; with none, the empty state replaces it.
    renderApp(<DayDialog {...props()} />, { routes: routes({ 'GET /v1/me/calendar/days/2026-11-05?kind=all&page_size=100': () => Response.json(empty) }) });
    expect(await screen.findByRole('button', { name: /^Tất cả/ })).toBeDisabled();
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

  it('"Tất cả" counts learned plus reviewed, not practice', async () => {
    renderApp(<DayDialog {...props()} />, { routes: routes() });
    await screen.findByRole('region', { name: 'Ôn 22 lượt' });
    expect(screen.getByRole('button', { name: 'Tất cả 32' })).toBeEnabled();
  });

  it('a day with practice only shows the summary and "Ngày này không có."', async () => {
    const day = { ...DAY, counts: { learned: 0, reviewed: 0, reviewed_known: 0, reviewed_again: 0, learned_groups: 0, practice_questions: 20 }, items: [] };
    renderApp(<DayDialog {...props()} />, { routes: routes({ 'GET /v1/me/calendar/days/2026-11-05?kind=all&page_size=100': () => Response.json(day) }) });
    expect(await screen.findByText('luyện 20 câu')).toBeInTheDocument();
    expect(screen.getByText('Ngày này không có.')).toBeInTheDocument();
    expect(screen.queryByRole('region')).toBeNull();
    expect(screen.getByRole('button', { name: 'Tất cả 0' })).toBeDisabled();
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
    }) });
    expect(await screen.findByText('Ngày này không có lần học nào.')).toBeInTheDocument();
  });

  it('today: "Ngày sau" disabled, " · hôm nay" after the weekday; arrows and Esc', async () => {
    const p = props({ date: '2026-11-08' });
    renderApp(<DayDialog {...p} />, { routes: routes({
      'GET /v1/me/calendar/days/2026-11-08?kind=all&page_size=100': () => Response.json({ ...DAY, date: '2026-11-08' }),
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
