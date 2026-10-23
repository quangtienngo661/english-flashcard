// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { problem } from '@/app-shell/session/test-support';
import { ToastRegion } from '@/app-ui/Toast';
import { renderApp } from '@/app-ui/test-utils';
import { AddWordSheet } from './AddWordSheet';
import { LAST_GROUP_KEY } from './last-group';

vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: vi.fn(), isLeaving: () => false }));
vi.setConfig({ testTimeout: 20_000 });

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const TRAVEL = uuid(201);
const TECH = uuid(202);
const deck = (id: string, name: string, total = 3) => ({ id, name, version: 1, total, today: { priority: 0, due: 0, new: 0 }, cells: [], backlog: 0 });
const goSense = {
  sense_id: uuid(1), entry_id: uuid(11), scope: 'catalog', lemma: 'go', pos: 'verb', level: 'A1', context_label: null,
  meaning: { text: 'đi', language: 'vi', translation_missing: false }, definition_en: null, examples: [], topics: [], form_of: null, ai_suggested: false,
};
const OK = { item_id: uuid(90), sense_id: uuid(1), created_item: true, created_word: false, sentence_id: null };
const routes = (extra = {}, decks = [deck(TRAVEL, 'Du lịch'), deck(TECH, 'Công nghệ')]) => ({
  'GET /v1/groups': () => Response.json({ items: decks }),
  'GET /v1/me/app-config': () => Response.json({ learning: { backlog_after_days: 60, groups_per_user: 100 } }),
  'GET /v1/me/entitlements': () => Response.json({ plan: 'free', pools: {}, sources: [] }),
  'GET /v1/lookup?q=went': () => Response.json({ senses: [], via_inflection: [{ kind: 'past', base: { entry_id: uuid(11), lemma: 'go', pos: 'verb' }, senses: [goSense] }] }),
  'GET /v1/lookup?q=deployed': () => Response.json({ senses: [], via_inflection: [{ kind: 'past', base: { entry_id: uuid(12), lemma: 'deploy', pos: 'verb' }, senses: [] }] }),
  'GET /v1/lookup?q=rizz': () => Response.json({ senses: [], via_inflection: [] }),
  'POST /v1/quick-add': () => Response.json(OK, { status: 201 }),
  ...extra,
});
const quickAdds = (calls: Array<{ method: string; path: string; body: unknown; headers: Record<string, string> }>) => calls.filter((c) => c.method === 'POST' && c.path === '/v1/quick-add');
const open = (word: string, options: Parameters<typeof renderApp>[1]) =>
  renderApp(
    <>
      <AddWordSheet initialWord={word} onClose={() => {}} />
      <ToastRegion />
    </>,
    options,
  );

beforeEach(() => window.localStorage.clear());

describe('AddWordSheet (K/40–K/42c, M/50–M/52c)', () => {
  it('"went" is recognised as a form of go; saving sends the base sense and the sentence to the last-used deck', async () => {
    window.localStorage.setItem(LAST_GROUP_KEY, TRAVEL);
    const { calls } = open('went', { routes: routes() });
    expect(await screen.findByText('went là quá khứ của go')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /đi/ })).toBeChecked();
    expect(await screen.findByRole('button', { name: /Lưu vào nhóm.*Du lịch/ })).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: 'Câu bạn gặp (không bắt buộc)' }), 'I went to the bank yesterday.');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu went' }));
    await waitFor(() => expect(quickAdds(calls)).toHaveLength(1));
    expect(quickAdds(calls)[0].body).toEqual({ group_id: TRAVEL, sense_id: uuid(1), sentence: 'I went to the bank yesterday.' });
    expect(await screen.findByText('Đã lưu từ “went” vào nhóm “Du lịch”.')).toBeInTheDocument();
  });

  it('a form whose base has no meaning yet: the manual form names the base and sends form_of', async () => {
    window.localStorage.setItem(LAST_GROUP_KEY, TECH);
    const { calls } = open('deployed', { routes: routes() });
    await userEvent.click(await screen.findByRole('button', { name: 'Nghĩa khác, tự nhập' }));
    expect(await screen.findByText(/Wordmet nhận ra đây là quá khứ của deploy và đã gắn sẵn/)).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: 'Nghĩa' }), 'đã triển khai');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu từ' }));
    await waitFor(() => expect(quickAdds(calls)).toHaveLength(1));
    expect(quickAdds(calls)[0].body).toEqual({
      group_id: TECH, new_word: { lemma: 'deployed', meaning: 'đã triển khai', form_of: { entry_id: uuid(12), kind: 'past' } },
    });
  });

  it('manual meaning needs only the meaning', async () => {
    window.localStorage.setItem(LAST_GROUP_KEY, TRAVEL);
    const { calls } = open('rizz', { routes: routes() });
    expect(await screen.findByText('Wordmet chưa có từ “rizz”. Tự nhập nghĩa để lưu.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Nghĩa khác, tự nhập' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Lưu từ' }));
    expect(await screen.findByText('Nhập nghĩa của từ.')).toBeInTheDocument();
    expect(quickAdds(calls)).toHaveLength(0);
    await userEvent.type(screen.getByRole('textbox', { name: 'Nghĩa' }), 'sức hút');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu từ' }));
    await waitFor(() => expect(quickAdds(calls)[0]?.body).toEqual({ group_id: TRAVEL, new_word: { lemma: 'rizz', meaning: 'sức hút' } }));
  });

  it('E21: the last-used deck was deleted → "Chọn nhóm", and saving asks for a deck', async () => {
    window.localStorage.setItem(LAST_GROUP_KEY, uuid(999));
    const { calls } = open('went', { routes: routes() });
    expect(await screen.findByRole('button', { name: /Lưu vào nhóm.*Chọn nhóm/ })).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Lưu went' }));
    expect(await screen.findByText('Chọn một nhóm để lưu từ.')).toBeInTheDocument();
    expect(quickAdds(calls)).toHaveLength(0);
  });

  it('K/40b: no deck yet → "Tạo nhóm đầu tiên" and no save button', async () => {
    open('went', { routes: routes({}, []) });
    expect(await screen.findByText('Bạn chưa có nhóm nào. Tạo nhóm đầu tiên để lưu từ này.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tạo nhóm đầu tiên' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lưu went' })).not.toBeInTheDocument();
  });

  it('K/42b, K/42c: typing filters the decks and offers to create one; "Tạo nhóm và lưu" creates, then saves there', async () => {
    window.localStorage.setItem(LAST_GROUP_KEY, TRAVEL);
    const NEW = uuid(203);
    const { calls } = open('went', {
      routes: routes({ 'POST /v1/groups': () => Response.json({ id: NEW, name: 'phỏng vấn', version: 1, item_count: 0, removable_items: 0 }, { status: 201 }) }),
    });
    await userEvent.click(await screen.findByRole('button', { name: /Lưu vào nhóm.*Du lịch/ }));
    const search = await screen.findByRole('searchbox', { name: 'Tìm hoặc tạo nhóm…' });
    await userEvent.type(search, 'du l');
    expect(screen.getByRole('button', { name: 'Tạo nhóm “du l”' })).toBeInTheDocument();
    expect(screen.getByText('Kết quả (1)')).toBeInTheDocument();
    await userEvent.clear(search);
    await userEvent.type(search, 'phỏng vấn');
    expect(screen.getByText('Chưa có nhóm nào tên “phỏng vấn”.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tạo nhóm và lưu' }));
    await waitFor(() => expect(quickAdds(calls)).toHaveLength(1));
    expect(calls.find((c) => c.method === 'POST' && c.path === '/v1/groups')!.body).toEqual({ name: 'phỏng vấn' });
    expect(quickAdds(calls)[0].body).toMatchObject({ group_id: NEW, sense_id: uuid(1) });
    expect(window.localStorage.getItem(LAST_GROUP_KEY)).toBe(NEW);
  });

  it('409 private-word-exists links to the word the learner already has', async () => {
    window.localStorage.setItem(LAST_GROUP_KEY, TRAVEL);
    open('rizz', { routes: routes({ 'POST /v1/quick-add': () => problem(409, 'private-word-exists') }) });
    await userEvent.click(await screen.findByRole('button', { name: 'Nghĩa khác, tự nhập' }));
    await userEvent.type(await screen.findByRole('textbox', { name: 'Nghĩa' }), 'sức hút');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu từ' }));
    expect(await screen.findByText('Bạn đã có từ “rizz” trong Từ của tôi.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mở từ này' })).toHaveAttribute('href', '/vi/app/word?w=rizz');
  });

  it('409 group-full names the deck', async () => {
    window.localStorage.setItem(LAST_GROUP_KEY, TRAVEL);
    open('went', { routes: routes({ 'POST /v1/quick-add': () => problem(409, 'group-full') }) });
    await userEvent.click(await screen.findByRole('button', { name: 'Lưu went' }));
    expect(await screen.findByText('Nhóm “Du lịch” đã đầy. Chọn nhóm khác.')).toBeInTheDocument();
  });

  it('a double click sends one quick add (Review Focus 1); the saved deck becomes the last used', async () => {
    window.localStorage.setItem(LAST_GROUP_KEY, TECH);
    let release!: () => void;
    const { calls } = open('went', {
      routes: routes({ 'POST /v1/quick-add': () => new Promise<Response>((r) => (release = () => r(Response.json(OK, { status: 201 })))) }),
    });
    await screen.findByText('went là quá khứ của go');
    await userEvent.dblClick(await screen.findByRole('button', { name: 'Lưu went' }));
    expect(quickAdds(calls)).toHaveLength(1);
    release();
    await waitFor(() => expect(window.localStorage.getItem(LAST_GROUP_KEY)).toBe(TECH));
    expect(quickAdds(calls)[0].headers['Idempotency-Key']).toBeTruthy();
  });

  it('the deck list shows recently used first, then all decks A–Z with their sizes', async () => {
    window.localStorage.setItem(LAST_GROUP_KEY, TRAVEL);
    open('went', { routes: routes() });
    await userEvent.click(await screen.findByRole('button', { name: /Lưu vào nhóm.*Du lịch/ }));
    const recent = await screen.findByRole('radiogroup', { name: 'Dùng gần đây' });
    expect(within(recent).getAllByRole('radio').map((r) => r.closest('label')?.textContent)).toEqual(['Du lịch3 từ']);
    const all = screen.getByRole('radiogroup', { name: 'Tất cả nhóm (2), A–Z' });
    expect(within(all).getAllByRole('radio').map((r) => r.closest('label')?.textContent)).toEqual(['Công nghệ3 từ', 'Du lịch3 từ']);
  });
});
