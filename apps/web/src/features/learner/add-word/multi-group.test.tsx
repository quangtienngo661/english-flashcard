// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { problem } from '@/app-shell/session/test-support';
import { ToastRegion, toastQueue } from '@/ui/Toast';
import { renderApp } from '@/test-utils/render-app';
import { AddWordSheet } from './AddWordSheet';
import { DeckPickerDialog } from './DeckPickerDialog';
import { LAST_GROUP_KEY } from './last-group';

// Part 10, P.12 (owner QP1): one word can be saved into several groups with one request.

vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: vi.fn(), isLeaving: () => false }));
vi.setConfig({ testTimeout: 20_000 });

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const DE12 = uuid(301);
const DE9 = uuid(302);
const DE14 = uuid(303);
const deck = (id: string, name: string, total = 40) => ({ id, name, version: 1, total, today: { priority: 0, due: 0, new: 0 }, cells: [], backlog: 0 });
const goSense = {
  sense_id: uuid(1), entry_id: uuid(11), scope: 'catalog', lemma: 'go', pos: 'verb', level: 'A1', context_label: null,
  meaning: { text: 'đi', language: 'vi', translation_missing: false }, definition_en: null, examples: [], topics: [], form_of: null, ai_suggested: false,
};
const OK = { item_id: uuid(90), sense_id: uuid(1), created_item: true, created_word: false, sentence_id: null };
const routes = (extra = {}) => ({
  'GET /v1/groups': () => Response.json({ items: [deck(DE12, 'Đề 12'), deck(DE9, 'Đề 9'), deck(DE14, 'Đề 14')] }),
  'GET /v1/me/app-config': () => Response.json({ learning: { backlog_after_days: 60, groups_per_user: 100 } }),
  'GET /v1/me/entitlements': () => Response.json({ plan: 'free', pools: {}, sources: [] }),
  'GET /v1/lookup?q=went': () => Response.json({ senses: [], via_inflection: [{ kind: 'past', base: { entry_id: uuid(11), lemma: 'go', pos: 'verb' }, senses: [goSense] }] }),
  'POST /v1/quick-add': () => Response.json(OK, { status: 201 }),
  ...extra,
});
const quickAdds = (calls: Array<{ method: string; path: string; body: unknown }>) => calls.filter((c) => c.method === 'POST' && c.path === '/v1/quick-add');
const sense = { sense_id: uuid(1), lemma: 'go', pos: 'verb', meaning: { text: 'đi' } };
const all = () => screen.findByRole('listbox', { name: 'Tất cả nhóm (3), A–Z' });

beforeEach(() => {
  window.localStorage.clear();
  // The toast queue is module state: a toast from an earlier test must not hide or fake one here.
  for (const toast of [...toastQueue.visibleToasts]) toastQueue.close(toast.key);
});
const noSuccessToast = () => expect(screen.queryByText(/Đã lưu từ|Đã thêm/)).not.toBeInTheDocument();

describe('GroupPicker: several groups (QP1)', () => {
  it('is a multiselectable listbox; rows toggle on click and Space, Enter confirms; the footer counts', async () => {
    const { calls } = renderApp(<DeckPickerDialog sense={sense} inGroups={[]} onClose={() => {}} />, { routes: routes() });
    const list = await all();
    expect(list).toHaveAttribute('aria-multiselectable', 'true');
    expect(screen.getByText('Chưa chọn nhóm nào')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Lưu vào \d+ nhóm/ })).not.toBeInTheDocument();
    await userEvent.click(within(list).getByRole('option', { name: /Đề 12/ }));
    expect(within(list).getByRole('option', { name: /Đề 12/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Đã chọn 1 nhóm')).toBeInTheDocument();
    within(list).getByRole('option', { name: /Đề 9/ }).focus();
    await userEvent.keyboard(' ');
    expect(screen.getByText('Đã chọn 2 nhóm')).toBeInTheDocument();
    await userEvent.click(within(list).getByRole('option', { name: /Đề 12/ }));
    expect(screen.getByText('Đã chọn 1 nhóm')).toBeInTheDocument();
    within(list).getByRole('option', { name: /Đề 9/ }).focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(quickAdds(calls)).toHaveLength(1));
    expect(quickAdds(calls)[0].body).toEqual({ group_ids: [DE9], sense_id: uuid(1) });
  });

  it('"Lưu vào 2 nhóm" sends one quick-add with both ids', async () => {
    const { calls } = renderApp(<><DeckPickerDialog sense={sense} inGroups={[]} onClose={() => {}} /><ToastRegion /></>, { routes: routes() });
    const list = await all();
    await userEvent.click(within(list).getByRole('option', { name: /Đề 12/ }));
    await userEvent.click(within(list).getByRole('option', { name: /Đề 9/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Lưu vào 2 nhóm' }));
    await waitFor(() => expect(quickAdds(calls)).toHaveLength(1));
    expect(quickAdds(calls)[0].body).toEqual({ group_ids: [DE12, DE9], sense_id: uuid(1) });
    expect(JSON.parse(window.localStorage.getItem(LAST_GROUP_KEY)!)).toEqual([DE12, DE9]);
  });

  it('a 409 naming Đề 9 in its group_id extension (not in detail, final review I2) says so and shows no success toast', async () => {
    const onClose = vi.fn();
    window.localStorage.setItem(LAST_GROUP_KEY, JSON.stringify([DE14]));
    renderApp(<><DeckPickerDialog sense={sense} inGroups={[]} onClose={onClose} /><ToastRegion /></>, {
      routes: routes({ 'POST /v1/quick-add': () => problem(409, 'group-full', { group_id: DE9, detail: 'This group is full.' }) }),
    });
    const list = await all();
    await userEvent.click(within(list).getByRole('option', { name: /Đề 12/ }));
    await userEvent.click(within(list).getByRole('option', { name: /Đề 9/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Lưu vào 3 nhóm' }));
    expect(await screen.findByText('Đề 9 đã đầy. Chưa lưu từ.', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Lưu vào 3 nhóm' })).toBeInTheDocument();
    noSuccessToast();
    expect(window.localStorage.getItem(LAST_GROUP_KEY)).toBe(JSON.stringify([DE14]));
  });
});

describe('DeckPickerDialog: the toast names what really changed (final review I3)', () => {
  // The word is already learned (an item exists), so quick add answers created_item: false even when it links a new group.
  const LINKED = { ...OK, created_item: false };
  async function saveTo(names: RegExp[], inGroups: string[]) {
    renderApp(<><DeckPickerDialog sense={sense} inGroups={inGroups} onClose={() => {}} /><ToastRegion /></>, {
      routes: routes({ 'POST /v1/quick-add': () => Response.json(LINKED, { status: 201 }) }),
    });
    const list = await all();
    for (const name of names) await userEvent.click(within(list).getByRole('option', { name }));
    await userEvent.click(screen.getByRole('button', { name: `Lưu vào ${names.length} nhóm` }));
  }

  it('a word in Đề 12 saved to Đề 9 says it was added to Đề 9', async () => {
    await saveTo([/Đề 9/], [DE12]);
    expect(await screen.findByText('Đã thêm “go” vào nhóm “Đề 9”.', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByText(/đã có trong nhóm/)).not.toBeInTheDocument();
  });

  it('saved to Đề 12 and Đề 9 while already in Đề 12, it names only Đề 9 as added', async () => {
    await saveTo([/Đề 12/, /Đề 9/], [DE12]);
    expect(await screen.findByText('Đã thêm “go” vào nhóm “Đề 9”.', {}, { timeout: 5000 })).toBeInTheDocument();
  });

  it('control: saved only to the group it is already in, it says "already in"', async () => {
    await saveTo([/Đề 12/], [DE12]);
    expect(await screen.findByText('“go” đã có trong nhóm “Đề 12”.', {}, { timeout: 5000 })).toBeInTheDocument();
  });
});

describe('AddWordSheet: the groups field (QP1)', () => {
  it('chooses two groups in the picker; the field shows two chips; saving sends group_ids; reopening preselects both', async () => {
    const first = renderApp(<><AddWordSheet initialWord="went" onClose={() => {}} /><ToastRegion /></>, { routes: routes() });
    await userEvent.click(await screen.findByRole('button', { name: /Lưu vào nhóm/ }));
    const list = await all();
    await userEvent.click(within(list).getByRole('option', { name: /Đề 12/ }));
    await userEvent.click(within(list).getByRole('option', { name: /Đề 9/ }));
    expect(screen.getByText('Đã chọn 2 nhóm')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Chọn 2 nhóm' }));
    const field = screen.getByRole('button', { name: /Lưu vào nhóm/ });
    expect(within(field).getByText('Đề 12')).toBeInTheDocument();
    expect(within(field).getByText('Đề 9')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(quickAdds(first.calls)).toHaveLength(1));
    expect(quickAdds(first.calls)[0].body).toEqual({ group_ids: [DE12, DE9], sense_id: uuid(1) });
    first.unmount();
    renderApp(<AddWordSheet initialWord="went" onClose={() => {}} />, { routes: routes() });
    const again = await screen.findByRole('button', { name: /Lưu vào nhóm/ });
    await waitFor(() => expect(within(again).getByText('Đề 12')).toBeInTheDocument());
    expect(within(again).getByText('Đề 9')).toBeInTheDocument();
  });

  it('a stored old single id still preselects one group', async () => {
    window.localStorage.setItem(LAST_GROUP_KEY, DE14);
    const { calls } = renderApp(<AddWordSheet initialWord="went" onClose={() => {}} />, { routes: routes() });
    const field = await screen.findByRole('button', { name: /Lưu vào nhóm/ });
    await waitFor(() => expect(within(field).getByText('Đề 14')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(quickAdds(calls)).toHaveLength(1));
    expect(quickAdds(calls)[0].body).toEqual({ group_ids: [DE14], sense_id: uuid(1) });
  });

  it('a 409 naming Đề 9 shows "Đề 9 đã đầy. Chưa lưu từ." and no success toast', async () => {
    const stored = JSON.stringify([DE12, DE9]);
    window.localStorage.setItem(LAST_GROUP_KEY, stored);
    const onClose = vi.fn();
    renderApp(<><AddWordSheet initialWord="went" onClose={onClose} /><ToastRegion /></>, {
      routes: routes({ 'POST /v1/quick-add': () => problem(409, 'group-full', { group_id: DE9, detail: 'This group is full.' }) }),
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Lưu' }));
    expect(await screen.findByText('Đề 9 đã đầy. Chưa lưu từ.', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    noSuccessToast();
    expect(window.localStorage.getItem(LAST_GROUP_KEY)).toBe(stored);
  });

  it('a 409 naming a group that is not in the list says a group is full, with no blank name', async () => {
    window.localStorage.setItem(LAST_GROUP_KEY, JSON.stringify([DE12]));
    renderApp(<AddWordSheet initialWord="went" onClose={() => {}} />, {
      routes: routes({ 'POST /v1/quick-add': () => problem(409, 'group-full', { group_id: uuid(999), detail: 'This group is full.' }) }),
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Lưu' }));
    expect(await screen.findByText('Một nhóm đã đầy. Chưa lưu từ.', {}, { timeout: 5000 })).toBeInTheDocument();
  });

  it('with 10 groups ticked a new group cannot be added, so the request never goes past the API maximum', async () => {
    const many = Array.from({ length: 11 }, (_, i) => deck(uuid(400 + i), `Đề ${i + 1}`));
    window.localStorage.setItem(LAST_GROUP_KEY, JSON.stringify(many.slice(0, 10).map((g) => g.id)));
    const { calls } = renderApp(<AddWordSheet initialWord="went" onClose={() => {}} />, {
      routes: routes({ 'GET /v1/groups': () => Response.json({ items: many }), 'POST /v1/groups': () => Response.json({ id: uuid(500), name: 'Đề', version: 1 }, { status: 201 }) }),
    });
    await userEvent.click(await screen.findByRole('button', { name: /Lưu vào nhóm/ }));
    await userEvent.type(await screen.findByRole('searchbox', { name: 'Tìm hoặc tạo nhóm…' }), 'Đề');
    const create = await screen.findByRole('button', { name: 'Tạo nhóm “Đề”' });
    expect(create).toBeDisabled();
    await userEvent.click(create);
    expect(calls.filter((c) => c.method === 'POST' && c.path === '/v1/groups')).toHaveLength(0);
  });

  it('opened from a group page: that group is preselected and pinned, and others can be added', async () => {
    const { calls } = renderApp(<AddWordSheet initialWord="went" lockedGroupId={DE12} onClose={() => {}} />, {
      routes: routes({ [`GET /v1/groups/${DE12}/queue?mode=all`]: () => Response.json({ cards: [] }) }),
    });
    expect(await screen.findByText('Lưu vào nhóm: Đề 12')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thêm nhóm khác' }));
    const list = await all();
    expect(within(list).getByRole('option', { name: /Đề 12/ })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(within(list).getByRole('option', { name: /Đề 12/ }));
    expect(within(list).getByRole('option', { name: /Đề 12/ })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(within(list).getByRole('option', { name: /Đề 14/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Chọn 2 nhóm' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(quickAdds(calls)).toHaveLength(1));
    expect(quickAdds(calls)[0].body).toEqual({ group_ids: [DE12, DE14], sense_id: uuid(1) });
  });
});
