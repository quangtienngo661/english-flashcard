// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { problem } from '@/app-shell/session/test-support';
import { ToastRegion } from '@/app-ui/Toast';
import { renderApp } from '@/app-ui/test-utils';
import { AddSentenceSheet } from './AddSentenceSheet';
import { BulkAddSheet } from './BulkAddSheet';

vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/word',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: vi.fn(), isLeaving: () => false }));
vi.setConfig({ testTimeout: 20_000 });

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const SENSE = { sense_id: uuid(2), lemma: 'left', pos: 'adverb', meaning: { text: 'về phía bên trái' }, sentence_count: 1 };
const FOOD = uuid(301);
const base = (extra = {}) => ({
  'GET /v1/groups': () => Response.json({ items: [{ id: FOOD, name: 'Ẩm thực', version: 1, total: 12, today: { priority: 0, due: 0, new: 0 }, cells: [], backlog: 0 }] }),
  'GET /v1/topics': () => Response.json({ items: [{ code: 'food', name: 'Ẩm thực' }] }),
  'GET /v1/me/app-config': () => Response.json({ learning: { backlog_after_days: 60, groups_per_user: 100 } }),
  'GET /v1/me/entitlements': () => Response.json({ plan: 'free', pools: {}, sources: [] }),
  ...extra,
});
const withToasts = (ui: React.ReactElement) => (
  <>
    {ui}
    <ToastRegion />
  </>
);

describe('AddSentenceSheet (K/44, K/44b, M/53)', () => {
  it('names the meaning and how many sentences it has; counts to 300 and stops there', async () => {
    renderApp(<AddSentenceSheet sense={SENSE} onClose={() => {}} />, { routes: base() });
    expect(screen.getByText('left, adverb: về phía bên trái · đã có 1 câu')).toBeInTheDocument();
    const field = screen.getByRole('textbox', { name: 'Câu' });
    await userEvent.type(field, 'I turned left at the station.');
    expect(screen.getByText('29/300')).toBeInTheDocument();
    await userEvent.clear(field);
    await userEvent.click(field);
    await userEvent.paste('x'.repeat(301));
    expect(field).toHaveValue('x'.repeat(300));
  });

  it('saves with POST /senses/{id}/sentences and a key per press', async () => {
    const { calls } = renderApp(withToasts(<AddSentenceSheet sense={SENSE} onClose={() => {}} />), {
      routes: base({ [`POST /v1/senses/${uuid(2)}/sentences`]: () => Response.json({ id: uuid(60), created_at: '2026-10-23T03:00:00Z' }, { status: 201 }) }),
    });
    await userEvent.type(screen.getByRole('textbox', { name: 'Câu' }), 'I turned left at the station.');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu câu' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST' && c.path.endsWith('/sentences'))?.body).toEqual({ text: 'I turned left at the station.' }));
    expect(calls.find((c) => c.method === 'POST' && c.path.endsWith('/sentences'))!.headers['Idempotency-Key']).toBeTruthy();
    expect(await screen.findByText('Đã lưu câu.')).toBeInTheDocument();
  });

  it('K/44b: 409 sentence-limit-reached → the message without a number, and [Xem các câu đã gặp]', async () => {
    const onSeeAll = vi.fn();
    renderApp(<AddSentenceSheet sense={SENSE} onClose={() => {}} onSeeAll={onSeeAll} />, {
      routes: base({ [`POST /v1/senses/${uuid(2)}/sentences`]: () => problem(409, 'sentence-limit-reached') }),
    });
    await userEvent.type(screen.getByRole('textbox', { name: 'Câu' }), 'One more.');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu câu' }));
    expect(await screen.findByText('Nghĩa này đã đủ số câu tối đa. Xóa bớt một câu để thêm câu mới.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Xem các câu đã gặp' }));
    expect(onSeeAll).toHaveBeenCalled();
  });
});

describe('BulkAddSheet (K/43, M/44)', () => {
  it('adds the filtered words to a new deck named after the filter and reports every count, function words included', async () => {
    const NEW = uuid(302);
    const { calls } = renderApp(withToasts(<BulkAddSheet filter={{ level: 'A2', topic: 'food' }} onClose={() => {}} />), {
      routes: base({
        'POST /v1/groups': () => Response.json({ id: NEW, name: 'Ẩm thực · A2', version: 1, item_count: 0, removable_items: 0 }, { status: 201 }),
        [`POST /v1/groups/${NEW}/items/bulk`]: () => Response.json({ added: 38, already_in_group: 2, skipped_function_words: 3, skipped_group_full: 0, skipped_not_found: 0 }),
      }),
    });
    expect(await screen.findByText(/^A2, Ẩm thực\. Từ chức năng được bỏ qua/)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Nhóm mới: Ẩm thực · A2/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thêm cả loạt' }));
    await waitFor(() => expect(calls.some((c) => c.path === `/v1/groups/${NEW}/items/bulk`)).toBe(true));
    expect(calls.find((c) => c.path === `/v1/groups/${NEW}/items/bulk`)!.body).toEqual({ level: 'A2', topic: 'food' });
    expect(await screen.findByText('Đã thêm 38 từ vào nhóm “Ẩm thực · A2”. 2 từ đã có trong nhóm, 3 từ chức năng bỏ qua, 0 từ không vừa vì nhóm đã đầy.')).toBeInTheDocument();
  });

  it('can add to an existing deck instead', async () => {
    const { calls } = renderApp(<BulkAddSheet filter={{ pos: 'verb' }} onClose={() => {}} />, {
      routes: base({ [`POST /v1/groups/${FOOD}/items/bulk`]: () => Response.json({ added: 5, already_in_group: 0, skipped_function_words: 0, skipped_group_full: 0, skipped_not_found: 0 }) }),
    });
    await userEvent.click(await screen.findByRole('button', { name: /Vào nhóm/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Ẩm thực' }));
    await userEvent.click(screen.getByRole('button', { name: 'Thêm cả loạt' }));
    await waitFor(() => expect(calls.find((c) => c.path === `/v1/groups/${FOOD}/items/bulk`)?.body).toEqual({ pos: 'verb' }));
    expect(calls.some((c) => c.method === 'POST' && c.path === '/v1/groups')).toBe(false);
  });
});
