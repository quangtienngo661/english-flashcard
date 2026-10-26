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

  it('counts follow the locale: 262962 waiting cards show as "262.962" (audit 26/10/2026 #9)', async () => {
    renderApp(<TodayPage />, { routes: routes([group('g-big', 'Lớn', { priority: 0, due: 262962, new: 0 }, 123456)]) });
    const hero = await screen.findByRole('region', { name: 'Lớn' });
    expect(within(hero).getByText('262.962 thẻ chờ hôm nay · nhóm có 123.456 từ')).toBeInTheDocument();
  });

  it('Today lists 6 decks at most and [Xem tất cả] opens the deck list (owner 27/10/2026)', async () => {
    const many = Array.from({ length: 8 }, (_, i) => group(`g-${i}`, `Nhóm ${i}`, { priority: 0, due: i, new: 0 }));
    renderApp(<TodayPage />, { routes: routes(many) });
    const list = await screen.findByRole('list', { name: 'Nhóm của bạn' });
    expect(within(list).getAllByRole('heading', { level: 3 })).toHaveLength(6);
    expect(screen.getByRole('link', { name: 'Xem tất cả' })).toHaveAttribute('href', '/vi/app/groups');
  });

  it('a deck card opens its deck from anywhere on the card; Ôn N thẻ keeps its own link (owner 27/10/2026)', async () => {
    renderApp(<TodayPage />, { routes: routes(GROUPS) });
    const list = await screen.findByRole('list', { name: 'Nhóm của bạn' });
    const name = within(list).getByRole('link', { name: 'IELTS' });
    expect(name).toHaveAttribute('href', '/vi/app/group?id=g-ielts');
    expect(name.className).toContain('after:inset-0');
    expect(name.closest('li')).toHaveClass('relative');
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

  it('M3: the quick-add box opens the add-word sheet with the typed word', async () => {
    renderApp(<TodayPage />, { routes: { ...routes(GROUPS), 'GET /v1/lookup?q=went': () => Response.json({ senses: [], via_inflection: [] }) } });
    await screen.findByRole('region', { name: 'Công nghệ' });
    const box = screen.getByRole('region', { name: 'Thêm từ vừa gặp' });
    await userEvent.type(within(box).getByRole('textbox', { name: 'Từ' }), 'went');
    await userEvent.click(within(box).getByRole('button', { name: 'Thêm' }));
    const sheet = await screen.findByRole('dialog', { name: 'Bạn vừa gặp từ nào?' });
    expect(within(sheet).getByRole('textbox', { name: 'Từ' })).toHaveValue('went');
  });
});
