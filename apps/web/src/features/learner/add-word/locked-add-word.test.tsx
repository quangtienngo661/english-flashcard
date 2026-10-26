// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { problem, type Call } from '@/app-shell/session/test-support';
import { ToastRegion } from '@/app-ui/Toast';
import { renderApp } from '@/app-ui/test-utils';
import { AddWordProvider, useAddWord, useAddWordScope } from './add-word-context';
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
const deck = (id: string, name: string) => ({ id, name, version: 1, total: 3, today: { priority: 0, due: 0, new: 0 }, cells: [], backlog: 0 });
const GO = {
  sense_id: uuid(1), entry_id: uuid(11), scope: 'catalog', lemma: 'go', pos: 'verb', level: 'A1', context_label: null,
  meaning: { text: 'đi', language: 'vi', translation_missing: false }, definition_en: null, examples: [], topics: [], form_of: null, ai_suggested: false,
};
const OTHER = { ...GO, sense_id: uuid(2), meaning: { ...GO.meaning, text: 'hoạt động' } };
const card = (sense = GO) => ({
  item_id: uuid(80), sense_id: sense.sense_id, level: 0, due_date: '2030-11-15', priority: false, section: 'new',
  content: { ...sense, sentences: [] },
});
const pool = { limit: 100, used: 4, remaining: 96, resets_at: '2030-11-15T00:00:00Z' };
const ENT = {
  plan: 'pro', sources: [], trial_eligible: false, ai_available: { enabled: true, cap_reached: false },
  pools: { practice_sessions: pool, ai_practice: pool, ai_lookup: pool },
  features: { 'ai.practice': { allowed: true, reason: null }, 'ai.lookup': { allowed: true, reason: null } },
};
const routes = (extra = {}) => ({
  'GET /v1/groups': () => Response.json({ items: [deck(TRAVEL, 'Du lịch'), deck(TECH, 'Công nghệ')] }),
  [`GET /v1/groups/${TRAVEL}/queue?mode=all`]: () => Response.json({ cards: [] }),
  [`GET /v1/groups/${TECH}/queue?mode=all`]: () => Response.json({ cards: [] }),
  'GET /v1/me/app-config': () => Response.json({ learning: { backlog_after_days: 60, groups_per_user: 100 } }),
  'GET /v1/me/entitlements': () => Response.json(ENT),
  'GET /v1/topics': () => Response.json({ items: [] }),
  'GET /v1/lookup?q=go': () => Response.json({ senses: [GO], via_inflection: [] }),
  'GET /v1/lookup?q=rizz': () => Response.json({ senses: [], via_inflection: [] }),
  'POST /v1/lookup/ai': () => Response.json({
    suggestion: { part_of_speech: 'noun', lemma: 'rizz', meaning: { text: 'sức hút', language: 'vi' }, definition_en: 'charm', examples: [] },
    catalog_senses: [],
  }),
  'POST /v1/quick-add': () => Response.json({ item_id: uuid(90), sense_id: GO.sense_id, created_item: true, created_word: false, sentence_id: null }, { status: 201 }),
  ...extra,
});
const quickAdds = (calls: Call[]) => calls.filter((c) => c.method === 'POST' && c.path === '/v1/quick-add');
const slow = { timeout: 5000 };

function openLocked(extra = {}, word = 'go', locale: 'vi' | 'en' = 'vi') {
  const onClose = vi.fn();
  function Sheet() {
    const [open, setOpen] = useState(true);
    return open && <AddWordSheet initialWord={word} lockedGroupId={TRAVEL} onClose={() => { onClose(); setOpen(false); }} />;
  }
  return { ...renderApp(<><Sheet /><ToastRegion /></>, { routes: routes(extra), locale }), onClose };
}

function Scope({ id }: { id: string | null }) {
  useAddWordScope(id);
  return null;
}

function OpenButton() {
  const { open } = useAddWord();
  return <><button onClick={() => open()}>Open</button><button onClick={() => open('go', { groupId: TECH })}>Open tech</button></>;
}

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem(LAST_GROUP_KEY, TECH);
});

describe('Locked add-word sheet (A14)', () => {
  it('sheet (locked): "Add several words by topic" → pick topic and level → See words → /vi/app/topic?code=…&level=…&group=<id>', async () => {
    openLocked({ 'GET /v1/topics': () => Response.json({ items: [{ code: 'daily-life', name: 'Đời sống' }, { code: 'food & drink', name: 'Ẩm thực' }] }) }, '');
    const disclosure = await screen.findByRole('button', { name: 'Thêm nhiều từ theo chủ đề' }, slow);
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /Chủ đề/ })).not.toBeInTheDocument();
    await userEvent.click(disclosure);
    expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByRole('link', { name: 'Xem từ' })).not.toBeInTheDocument();
    // React Aria's English default placeholder must not show on the Vietnamese page.
    expect(screen.queryByText('Select an item')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Chủ đề/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Đời sống' }, slow));
    expect(screen.queryByRole('link', { name: 'Xem từ' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Trình độ/ }));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
    await userEvent.click(screen.getByRole('option', { name: 'B1' }));
    expect(screen.getByRole('link', { name: 'Xem từ' })).toHaveAttribute('href', `/vi/app/topic?code=daily-life&level=B1&group=${TRAVEL}`);
    await userEvent.click(screen.getByRole('button', { name: /Chủ đề/ }));
    await userEvent.click(screen.getByRole('option', { name: 'Ẩm thực' }));
    expect(screen.getByRole('link', { name: 'Xem từ' })).toHaveAttribute('href', `/vi/app/topic?code=food%20%26%20drink&level=B1&group=${TRAVEL}`);
  });

  it('the topic row is absent in unlocked mode', async () => {
    renderApp(<AddWordSheet onClose={() => {}} />, { routes: routes(), locale: 'en' });
    await screen.findByRole('button', { name: /Save to deck/ }, slow);
    expect(screen.queryByRole('button', { name: 'Add several words by topic' })).not.toBeInTheDocument();
  });

  it('A14-1: locked → quick-add posts group_id of the locked deck; toast; closes', async () => {
    const { calls, onClose } = openLocked();
    expect(await screen.findByText('Lưu vào nhóm: Du lịch', {}, slow)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Lưu vào nhóm/ })).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Lưu go' }, slow));
    expect(await screen.findByText('Đã lưu từ “go” vào nhóm “Du lịch”.', {}, slow)).toBeInTheDocument();
    expect(quickAdds(calls)[0].body).toEqual({ group_id: TRAVEL, sense_id: GO.sense_id });
    expect(window.localStorage.getItem(LAST_GROUP_KEY)).toBe(TRAVEL);
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('A14-2: a sense already in the deck shows "Already in this deck" and cannot be picked', async () => {
    const { calls } = openLocked({
      'GET /v1/lookup?q=go': () => Response.json({ senses: [GO, OTHER], via_inflection: [] }),
      [`GET /v1/groups/${TRAVEL}/queue?mode=all`]: () => Response.json({ cards: [card()] }),
    });
    expect(await screen.findByText('Đã có trong nhóm', {}, slow)).toBeInTheDocument();
    const list = screen.getByRole('radiogroup', { name: 'Chọn nghĩa' });
    expect(within(list).queryByRole('radio', { name: /\bđi\b/ })).not.toBeInTheDocument();
    expect(within(list).getAllByRole('radio')).toHaveLength(1);
    expect(within(list).getByRole('radio', { name: /hoạt động/ })).toBeChecked();
    await userEvent.click(within(list).getByText('đi'));
    expect(within(list).getByRole('radio', { name: /hoạt động/ })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu go' }));
    await waitFor(() => expect(quickAdds(calls)[0]?.body).toEqual({ group_id: TRAVEL, sense_id: OTHER.sense_id }));
  });

  it('A14-2: all senses already in the deck hides Save and keeps manual entry', async () => {
    openLocked({ [`GET /v1/groups/${TRAVEL}/queue?mode=all`]: () => Response.json({ cards: [card()] }) });
    await screen.findByText('Đã có trong nhóm', {}, slow);
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lưu go' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nghĩa khác, tự nhập' })).toBeInTheDocument();
  });

  it('A14-3: AI suggestion → edit before saving shows the fixed deck line, saves to it', async () => {
    const { calls } = openLocked({}, 'rizz');
    await userEvent.click(await screen.findByRole('button', { name: 'Tra bằng AI' }, slow));
    const edit = await screen.findByRole('button', { name: 'Sửa rồi lưu' }, slow);
    expect(screen.getByText('Lưu vào nhóm: Du lịch')).toBeInTheDocument();
    await userEvent.click(edit);
    await screen.findByRole('heading', { name: 'Sửa trước khi lưu' }, slow);
    expect(screen.getByText('Lưu vào nhóm: Du lịch')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Lưu vào nhóm/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu từ' }));
    await waitFor(() => expect(quickAdds(calls)[0]?.body).toMatchObject({ group_id: TRAVEL, new_word: { lemma: 'rizz', ai_suggestion: true } }));
  });

  it('A14: manual entry stays locked even when the deck list is empty', async () => {
    const { calls } = openLocked({ 'GET /v1/groups': () => Response.json({ items: [] }) }, 'rizz');
    await userEvent.click(await screen.findByRole('button', { name: 'Tự nhập nghĩa' }, slow));
    expect(screen.queryByRole('button', { name: 'Thêm nhiều từ theo chủ đề' })).not.toBeInTheDocument();
    expect(screen.getByText('Lưu vào nhóm:', { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Lưu vào nhóm|Tạo nhóm đầu tiên/ })).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: 'Nghĩa' }), 'sức hút');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu từ' }));
    await waitFor(() => expect(quickAdds(calls)[0]?.body).toMatchObject({ group_id: TRAVEL, new_word: { meaning: 'sức hút' } }));
  });

  it('A14-5: group-full keeps the sheet open', async () => {
    const { onClose } = openLocked({ 'POST /v1/quick-add': () => problem(409, 'group-full') });
    await userEvent.click(await screen.findByRole('button', { name: 'Lưu go' }, slow));
    expect(await screen.findByText('Nhóm “Du lịch” đã đầy. Chọn nhóm khác.', {}, slow)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('A14-6: 404 deck → "This deck no longer exists." with close', async () => {
    const { onClose, calls } = openLocked({
      'POST /v1/quick-add': () => problem(404, 'not-found'),
      [`GET /v1/groups/${TRAVEL}`]: () => problem(404, 'not-found'),
    }, 'go', 'en');
    await userEvent.click(await screen.findByRole('button', { name: 'Save go' }, slow));
    expect(await screen.findByText('This deck no longer exists.', {}, slow)).toBeInTheDocument();
    expect(calls.filter((c) => c.method === 'GET' && c.path === `/v1/groups/${TRAVEL}`)).toHaveLength(1);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByRole('button', { name: 'Save go' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Close' }).at(-1)!);
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('A14-6: 404 sense with an existing deck shows the generic error', async () => {
    const { onClose, calls } = openLocked({
      'POST /v1/quick-add': () => problem(404, 'not-found'),
      [`GET /v1/groups/${TRAVEL}`]: () => Response.json({ id: TRAVEL, name: 'Du lịch', version: 1, item_count: 3, removable_items: 3 }),
    }, 'go', 'en');
    await userEvent.click(await screen.findByRole('button', { name: 'Save go' }, slow));
    expect(await screen.findByText('Not found.', {}, slow)).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'GET' && c.path === `/v1/groups/${TRAVEL}`)).toBe(true);
    expect(screen.queryByText('This deck no longer exists.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save go' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('A14-4: with a scope set, key N opens locked', async () => {
    renderApp(<AddWordProvider><Scope id={TRAVEL} /><OpenButton /></AddWordProvider>, { routes: routes() });
    fireEvent.keyDown(document.body, { key: 'n' });
    expect(await screen.findByText('Lưu vào nhóm: Du lịch', {}, slow)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Lưu vào nhóm/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(await screen.findByText('Lưu vào nhóm: Du lịch', {}, slow)).toBeInTheDocument();
  });

  it('without scope: unchanged (last group preselected)', async () => {
    renderApp(<AddWordProvider><OpenButton /></AddWordProvider>, { routes: routes() });
    fireEvent.keyDown(document.body, { key: 'n' });
    expect(await screen.findByRole('button', { name: /Lưu vào nhóm.*Công nghệ/ }, slow)).toBeInTheDocument();
    expect(screen.queryByText('Lưu vào nhóm: Công nghệ')).not.toBeInTheDocument();
  });

  it('A14: explicit group overrides scope', async () => {
    renderApp(<AddWordProvider><Scope id={TRAVEL} /><OpenButton /></AddWordProvider>, { routes: routes() });
    await userEvent.click(screen.getByRole('button', { name: 'Open tech' }));
    expect(await screen.findByText('Lưu vào nhóm: Công nghệ', {}, slow)).toBeInTheDocument();
  });

  it('A14: scope changes and unmount clears only its own scope', async () => {
    function Page() {
      const [id, setId] = useState(TRAVEL);
      const [first, setFirst] = useState(true);
      const [second, setSecond] = useState(false);
      return <AddWordProvider>
        {first && <Scope id={id} />}{second && <Scope id={TRAVEL} />}
        <button onClick={() => setId(TECH)}>Change scope</button>
        <button onClick={() => setSecond(true)}>Second scope</button>
        <button onClick={() => setFirst(false)}>Remove first</button>
        <button onClick={() => setSecond(false)}>Remove second</button>
        <OpenButton />
      </AddWordProvider>;
    }
    renderApp(<Page />, { routes: routes() });
    await userEvent.click(screen.getByRole('button', { name: 'Change scope' }));
    fireEvent.keyDown(document.body, { key: 'n' });
    expect(await screen.findByText('Lưu vào nhóm: Công nghệ', {}, slow)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    await userEvent.click(screen.getByRole('button', { name: 'Second scope' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove first' }));
    fireEvent.keyDown(document.body, { key: 'n' });
    expect(await screen.findByText('Lưu vào nhóm: Du lịch', {}, slow)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove second' }));
    fireEvent.keyDown(document.body, { key: 'n' });
    expect(await screen.findByRole('button', { name: /Lưu vào nhóm.*Công nghệ/ }, slow)).toBeInTheDocument();
  });
});
