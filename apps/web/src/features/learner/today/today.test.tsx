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
const group = (id: string, name: string, today: { priority: number; due: number; new: number }, total = 18, backlog = 0) => ({
  id, name, version: 1, total, today, cells, backlog,
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
        { sense_id: 's3', lemma: 'invoice', pos: 'noun', meaning: 'hóa đơn' },
        { sense_id: 's4', lemma: 'profit', pos: 'noun', meaning: 'lợi nhuận' },
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

describe('TodayPage (K/10, K/10b, K/94)', () => {
  it('the deck with priority cards leads; its counts come from today{priority,due,new}', async () => {
    renderApp(<TodayPage />, { routes: routes(GROUPS) });
    const hero = await screen.findByRole('region', { name: 'Công nghệ' });
    expect(within(hero).getByText('Ôn tiếp · có thẻ ưu tiên')).toBeInTheDocument();
    expect(within(hero).getByText('10 thẻ chờ hôm nay · nhóm có 18 từ')).toBeInTheDocument();
    expect(within(hero).getByRole('link', { name: 'Ôn 10 thẻ' })).toHaveAttribute('href', '/vi/app/review?group=g-tech');
    expect(within(hero).getByRole('link', { name: 'Hoặc học tất cả 18 từ' })).toHaveAttribute('href', '/vi/app/review?group=g-tech&mode=all');
  });

  it('deck cards: waiting decks first (most cards first), done-today decks last', async () => {
    renderApp(<TodayPage />, { routes: routes(GROUPS) });
    const list = await screen.findByRole('list', { name: 'Nhóm của bạn' });
    const names = within(list).getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(names).toEqual(['Công nghệ', 'IELTS', 'Du lịch', 'Ẩm thực A2']);
    expect(within(list).getByText('Xong hôm nay')).toBeInTheDocument();
    expect(within(list).getByRole('link', { name: 'Học lại cả nhóm' })).toHaveAttribute('href', '/vi/app/review?group=g-food&mode=all');
  });

  it('K/10b: the ⋯ menu of a card offers rename, study all N words, delete', async () => {
    renderApp(<TodayPage />, { routes: routes(GROUPS) });
    await userEvent.click(await screen.findByRole('button', { name: 'Tùy chọn nhóm IELTS' }));
    const menu = await screen.findByRole('menu');
    expect(within(menu).getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['Đổi tên nhóm', 'Học tất cả 80 từ', 'Xóa nhóm']);
  });

  it('the side column says how many words wait too long, with the admin number of days', async () => {
    renderApp(<TodayPage />, { routes: routes(GROUPS) });
    expect(await screen.findByText('40 từ lâu chưa ôn')).toBeInTheDocument();
    expect(screen.getByText('Nhóm IELTS, quá hạn hơn 60 ngày')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem' })).toHaveAttribute('href', '/vi/app/group/backlog?id=g-ielts');
  });

  it('K/94: no deck yet → the empty block and topic cards with 4 sample words', async () => {
    renderApp(<TodayPage />, { routes: routes([]) });
    expect(await screen.findByText('Chưa có nhóm nào')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tạo nhóm đầu tiên' })).toBeInTheDocument();
    const card = await screen.findByRole('region', { name: 'Kinh doanh · B1' });
    expect(within(card).getByText('52 từ')).toBeInTheDocument();
    expect(within(card).getAllByRole('listitem')).toHaveLength(4);
    expect(within(card).getByRole('link', { name: 'Xem thêm và chọn từ' })).toHaveAttribute('href', '/vi/app/topic?code=business&level=B1');
  });

  it('GH3: no suggestion → the topic block is hidden', async () => {
    renderApp(<TodayPage />, { routes: routes([], { items: [] }) });
    await screen.findByText('Chưa có nhóm nào');
    expect(screen.queryByText('Tạo nhóm nhanh theo chủ đề')).not.toBeInTheDocument();
  });

  it('the quick-add box is not there before M3', async () => {
    renderApp(<TodayPage />, { routes: routes(GROUPS) });
    await screen.findByRole('region', { name: 'Công nghệ' });
    expect(screen.queryByText('Thêm từ vừa gặp')).not.toBeInTheDocument();
  });
});
