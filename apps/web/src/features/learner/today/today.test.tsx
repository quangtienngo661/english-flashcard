// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/app-ui/test-utils';
import { TodayPage } from './TodayPage';

vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.setConfig({ testTimeout: 20_000 });

const cells = [5, 9, 12, 6, 0, 0].map((total, level) => ({ level, total, due: Math.min(total, 2) }));
const group = (id: string, name: string, today: { priority: number; due: number; new: number }, total = 18, backlog = 0, extra: Record<string, unknown> = {}) => ({
  id, name, version: 1, total, today, cells, backlog, ...extra,
});
const GROUPS = [
  group('g-food', 'Ẩm thực A2', { priority: 0, due: 0, new: 0 }, 24),
  group('g-travel', 'Du lịch', { priority: 0, due: 3, new: 2 }, 20),
  group('g-tech', 'Công nghệ', { priority: 2, due: 5, new: 3 }, 18),
  group('g-ielts', 'IELTS', { priority: 0, due: 10, new: 2 }, 80, 40),
];
const SUGGESTIONS = {
  items: [
    {
      topic: { code: 'business', name: 'Kinh doanh' }, level: 'B1', count: 52,
      samples: [
        { sense_id: 's1', lemma: 'budget', pos: 'noun', meaning: 'ngân sách' },
        { sense_id: 's2', lemma: 'contract', pos: 'noun', meaning: 'hợp đồng' },
      ],
    },
  ],
};
const routes = (groups: unknown[], suggestions: unknown = SUGGESTIONS) => ({
  'GET /v1/groups': () => Response.json({ items: groups }),
  'GET /v1/topics/suggestions': () => Response.json(suggestions),
  'GET /v1/me/app-config': () => Response.json({ learning: { backlog_after_days: 60, groups_per_user: 100 } }),
  'GET /v1/me/entitlements': () => Response.json({ plan: 'free', pools: {}, sources: [] }),
});
const LAST = {
  id: 'ps-1', group_id: 'g-tech', local_date: '2026-11-07', last_answer_at: '2026-11-07T09:12:00.000Z', finished: true,
  questions: 20, correct: 14, wrong_count: 6, wrong_lemmas: ['deteriorate', 'allocate', 'viable', 'scrutiny'],
};
const problem = (status: number) => () =>
  new Response(JSON.stringify({ type: 'about:blank', title: 'Error', status }), { status, headers: { 'content-type': 'application/problem+json' } });

describe('TodayPage (Figma 117:4425 / 117:4712)', () => {
  it('the hero is the first deck of the Today order: big waiting count, the three-part bar, Học · Ôn', async () => {
    renderApp(<TodayPage />, { chrome: true, routes: routes(GROUPS) });
    const hero = await screen.findByRole('region', { name: 'Công nghệ' });
    expect(within(hero).getByText('ôn tiếp · có thẻ ưu tiên')).toBeInTheDocument();
    expect(within(hero).getByText('10')).toBeInTheDocument();
    expect(within(hero).getByText('thẻ chờ hôm nay')).toBeInTheDocument();
    expect(within(hero).getByText('nhóm có 18 từ · 0 đã thuộc')).toBeInTheDocument();
    expect(within(hero).getByText('2 ưu tiên')).toBeInTheDocument();
    expect(within(hero).getByText('5 đến hạn')).toBeInTheDocument();
    expect(within(hero).getByText('3 mới')).toBeInTheDocument();
    expect(within(hero).getByRole('link', { name: 'Học' })).toHaveAttribute('href', '/vi/app/review?group=g-tech&mode=new');
    expect(within(hero).getByRole('link', { name: 'Học' })).toHaveAttribute('data-variant', 'secondary');
    const recall = within(hero).getByRole('link', { name: 'Ôn' });
    expect(recall).toHaveAttribute('href', '/vi/app/recall?group=g-tech');
    expect(recall).toHaveAttribute('data-variant', 'primary');
  });

  it('counts follow the locale: 262962 waiting cards show as "262.962"', async () => {
    renderApp(<TodayPage />, { chrome: true, routes: routes([group('g-big', 'Lớn', { priority: 0, due: 262962, new: 0 }, 123456)]) });
    const hero = await screen.findByRole('region', { name: 'Lớn' });
    expect(within(hero).getByText('262.962')).toBeInTheDocument();
    expect(within(hero).getByText('nhóm có 123.456 từ · 0 đã thuộc')).toBeInTheDocument();
  });

  it('sessions/last 200: score, wrong words and the links', async () => {
    renderApp(<TodayPage />, { chrome: true, routes: { ...routes(GROUPS), 'GET /v1/practice/sessions/last': () => Response.json(LAST) } });
    const last = await screen.findByRole('region', { name: 'Lần luyện gần nhất' });
    expect(within(last).getByText('14/20')).toBeInTheDocument();
    expect(within(last).getByText(/20 câu · Công nghệ$/)).toBeInTheDocument();
    expect(within(last).getByText('Sai: deteriorate, allocate, viable, scrutiny')).toBeInTheDocument();
    expect(within(last).getByRole('link', { name: 'Luyện lại từ sai →' })).toHaveAttribute('href', '/vi/app/practice/weak');
    expect(within(last).getByRole('link', { name: 'Mở lịch học' })).toHaveAttribute('href', '/vi/app/practice/history');
  });

  it('sessions/last for a group that is gone and no wrong word: no group name, no "Sai:" line', async () => {
    renderApp(<TodayPage />, {
      chrome: true,
      routes: { ...routes(GROUPS), 'GET /v1/practice/sessions/last': () => Response.json({ ...LAST, group_id: 'g-gone', wrong_lemmas: [] }) },
    });
    const last = await screen.findByRole('region', { name: 'Lần luyện gần nhất' });
    expect(within(last).getByText(/20 câu$/)).toBeInTheDocument();
    expect(within(last).queryByText(/^Sai:/)).toBeNull();
  });

  it('sessions/last 204: no last-practice block, the hero still shows', async () => {
    renderApp(<TodayPage />, { chrome: true, routes: routes(GROUPS) });
    await screen.findByRole('region', { name: 'Công nghệ' });
    expect(screen.queryByText('Lần luyện gần nhất')).toBeNull();
  });

  it('sessions/last 500: the hero still shows and nothing is an alert', async () => {
    renderApp(<TodayPage />, { chrome: true, routes: { ...routes(GROUPS), 'GET /v1/practice/sessions/last': problem(500) } });
    await screen.findByRole('region', { name: 'Công nghệ' });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText('Lần luyện gần nhất')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('8 decks: 4 cards of the other waiting decks, never the hero, and [Xem tất cả 8 nhóm]', async () => {
    const many = Array.from({ length: 8 }, (_, i) => group(`g-${i}`, `Nhóm ${i}`, { priority: 0, due: i + 1, new: 0 }));
    renderApp(<TodayPage />, { chrome: true, routes: routes(many) });
    const list = await screen.findByRole('list', { name: 'Nhóm của bạn' });
    expect(within(list).getAllByRole('link').map((a) => a.textContent)).toEqual(['Nhóm 6', 'Nhóm 5', 'Nhóm 4', 'Nhóm 3']);
    expect(screen.getByRole('region', { name: 'Nhóm 7' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem tất cả 8 nhóm →' })).toHaveAttribute('href', '/vi/app/groups');
  });

  it('a deck card opens its deck; the card face shows the next card', async () => {
    const withNext = GROUPS.map((g) => (g.id === 'g-ielts' ? { ...g, next_lemma: 'commute' } : g));
    renderApp(<TodayPage />, { chrome: true, routes: routes(withNext) });
    const list = await screen.findByRole('list', { name: 'Nhóm của bạn' });
    const name = within(list).getByRole('link', { name: 'IELTS' });
    expect(name).toHaveAttribute('href', '/vi/app/group?id=g-ielts');
    expect(name.closest('li')).toHaveTextContent('tiếp theo commute');
  });

  it('an empty deck is a card after the waiting ones (owner 10/11/2026); decks done today go into one note line; no card menu', async () => {
    const decks = [...GROUPS, group('g-jp', 'Du lịch Nhật', { priority: 0, due: 0, new: 0 }, 0)];
    renderApp(<TodayPage />, { chrome: true, routes: routes(decks) });
    const list = await screen.findByRole('list', { name: 'Nhóm của bạn' });
    expect(within(list).getAllByRole('link').map((a) => a.textContent)).toEqual(['IELTS', 'Du lịch', 'Du lịch Nhật']);
    expect(within(list).getByRole('link', { name: 'Du lịch Nhật' }).closest('li')).toHaveTextContent('Chưa có từ');
    expect(screen.getByText('Xong hôm nay: Ẩm thực A2')).toBeInTheDocument();
    expect(screen.queryByText(/^Chưa có từ:/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Tùy chọn nhóm/ })).toBeNull();
  });

  it('every deck done: the all-done line instead of the hero', async () => {
    renderApp(<TodayPage />, { chrome: true, routes: routes([GROUPS[0]]) });
    expect(await screen.findByText('Xong hết thẻ hôm nay. Mai ôn tiếp.')).toBeInTheDocument();
  });

  it('the side column says how many words wait too long, with the admin number of days', async () => {
    renderApp(<TodayPage />, { chrome: true, routes: routes(GROUPS) });
    const box = await screen.findByRole('region', { name: '40 từ lâu chưa ôn' });
    expect(within(box).getByText('Nhóm IELTS, quá hạn hơn 60 ngày')).toBeInTheDocument();
    expect(within(box).getByRole('link', { name: 'Xem' })).toHaveAttribute('href', '/vi/app/group/backlog?id=g-ielts');
  });

  it('words by stage: due / total per stage', async () => {
    renderApp(<TodayPage />, { chrome: true, routes: routes(GROUPS) });
    const box = await screen.findByRole('region', { name: '128 từ theo ngăn' });
    expect(within(box).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Mới8 / 20', '1 ngày8 / 36', '3 ngày8 / 48', '7 ngày8 / 24', '14 ngày0 / 0', '30 ngày0 / 0',
    ]);
  });

  it('no deck yet → the empty block and topic rows', async () => {
    renderApp(<TodayPage />, { chrome: true, routes: routes([]) });
    expect(await screen.findByText('Chưa có nhóm nào')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tạo nhóm đầu tiên' })).toBeInTheDocument();
    const row = await screen.findByRole('link', { name: /Kinh doanh · B1/ });
    expect(row).toHaveAttribute('href', '/vi/app/topic?code=business&level=B1');
    expect(row).toHaveTextContent('52 từ');
    // The sample words say what the topic holds before opening it.
    expect(row).toHaveTextContent('budget, contract');
    expect(screen.getByRole('link', { name: 'Xem mọi chủ đề trong Tra từ →' })).toHaveAttribute('href', '/vi/app/lookup');
  });

  it('no suggestion → the topic block is hidden', async () => {
    renderApp(<TodayPage />, { chrome: true, routes: routes([], { items: [] }) });
    await screen.findByText('Chưa có nhóm nào');
    expect(screen.queryByText('Tạo nhóm nhanh theo chủ đề')).not.toBeInTheDocument();
  });

  it('the quick-add box opens the add-word sheet with the typed word', async () => {
    renderApp(<TodayPage />, { chrome: true, routes: { ...routes(GROUPS), 'GET /v1/lookup?q=went': () => Response.json({ senses: [], via_inflection: [] }) } });
    await screen.findByRole('region', { name: 'Công nghệ' });
    const box = screen.getByRole('region', { name: 'Thêm từ vừa gặp' });
    await userEvent.type(within(box).getByRole('textbox', { name: 'Từ' }), 'went');
    await userEvent.click(within(box).getByRole('button', { name: 'Thêm' }));
    const sheet = await screen.findByRole('dialog', { name: 'Bạn vừa gặp từ nào?' });
    expect(within(sheet).getByRole('textbox', { name: 'Từ' })).toHaveValue('went');
  });
});
