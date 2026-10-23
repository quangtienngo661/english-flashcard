// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { problem } from '@/app-shell/session/test-support';
import { ToastRegion } from '@/app-ui/Toast';
import { renderApp } from '@/app-ui/test-utils';
import { SearchStrip } from '@/app-chrome/SearchStrip';
import { WordPage } from '../word/WordPage';
import { AddSentenceSheet } from './AddSentenceSheet';
import { AddWordSheet } from './AddWordSheet';
import { BulkAddSheet } from './BulkAddSheet';
import { DeckPickerDialog } from './DeckPickerDialog';
import { LAST_GROUP_KEY } from './last-group';

// Reproductions of the M3 review findings (I-1 … I-7, M-2, M-7) and the English definition shown twice.
const nav = vi.hoisted(() => ({ params: new URLSearchParams(), push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/lookup',
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
  useSearchParams: () => nav.params,
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: vi.fn(), isLeaving: () => false }));
vi.setConfig({ testTimeout: 20_000 });

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const TRAVEL = uuid(201);
const deck = (id: string, name: string) => ({ id, name, version: 1, total: 3, today: { priority: 0, due: 0, new: 0 }, cells: [], backlog: 0 });
const goSense = {
  sense_id: uuid(1), entry_id: uuid(11), scope: 'catalog', lemma: 'go', pos: 'verb', level: 'A1', context_label: null,
  meaning: { text: 'đi', language: 'vi', translation_missing: false }, definition_en: null, examples: [], topics: [], form_of: null, ai_suggested: false,
};
const base = (extra = {}, decks = [deck(TRAVEL, 'Du lịch')]) => ({
  'GET /v1/groups': () => Response.json({ items: decks }),
  'GET /v1/topics': () => Response.json({ items: [{ code: 'food', name: 'Ẩm thực' }] }),
  'GET /v1/me/app-config': () => Response.json({ learning: { backlog_after_days: 60, groups_per_user: 100 } }),
  'GET /v1/me/entitlements': () => Response.json({ plan: 'free', pools: {}, sources: [] }),
  'GET /v1/lookup?q=went': () => Response.json({ senses: [], via_inflection: [{ kind: 'past', base: { entry_id: uuid(11), lemma: 'go', pos: 'verb' }, senses: [goSense] }] }),
  'GET /v1/lookup?q=rizz': () => Response.json({ senses: [], via_inflection: [] }),
  ...extra,
});
/** Renders the strip again on demand, as a URL change on the lookup page does. */
function Rerender() {
  const [, setTick] = useState(0);
  return (
    <>
      <button type="button" onClick={() => setTick((n) => n + 1)}>
        tick
      </button>
      <SearchStrip />
    </>
  );
}
const posts = (calls: Array<{ method: string; path: string }>, path: string) => calls.filter((c) => c.method === 'POST' && c.path === path);
const toasts = (ui: React.ReactElement) => (
  <>
    {ui}
    <ToastRegion />
  </>
);

beforeEach(() => {
  window.localStorage.clear();
  nav.params = new URLSearchParams();
  nav.push.mockClear();
});

describe('I-1: "Tạo nhóm và lưu" with no meaning to save', () => {
  it('a word with no known meaning goes to the manual form first; no deck is created', async () => {
    const { calls } = renderApp(<AddWordSheet initialWord="rizz" onClose={() => {}} />, {
      routes: base({ 'POST /v1/groups': () => Response.json({ id: uuid(9), name: 'Slang' }, { status: 201 }) }, []),
    });
    await screen.findByText('Wordmet chưa có từ “rizz”. Tự nhập nghĩa để lưu.');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo nhóm đầu tiên' }));
    await userEvent.type(await screen.findByRole('searchbox', { name: 'Tìm hoặc tạo nhóm…' }), 'Slang');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo nhóm và lưu' }));
    expect(await screen.findByText('Nhập nghĩa của từ.')).toBeInTheDocument();
    expect(posts(calls, '/v1/groups')).toHaveLength(0);
  });

  it('an error while creating from the deck list is shown there', async () => {
    window.localStorage.setItem(LAST_GROUP_KEY, TRAVEL);
    renderApp(<AddWordSheet initialWord="went" onClose={() => {}} />, { routes: base({ 'POST /v1/groups': () => problem(409, 'group-limit-reached') }) });
    await screen.findByText('went là quá khứ của go');
    await userEvent.click(screen.getByRole('button', { name: /Lưu vào nhóm.*Du lịch/ }));
    await userEvent.type(await screen.findByRole('searchbox', { name: 'Tìm hoặc tạo nhóm…' }), 'phỏng vấn');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo nhóm và lưu' }));
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Bạn đã có đủ số nhóm tối đa');
  });
});

describe('I-2, I-7: a second press while a sentence is saving', () => {
  it('sends nothing, says nothing and keeps the sheet; a refusal then shows', async () => {
    let answer!: (r: Response) => void;
    const onClose = vi.fn();
    const sense = { sense_id: uuid(2), lemma: 'left', pos: 'adverb', meaning: { text: 'về phía bên trái' }, sentence_count: 0 };
    const { calls } = renderApp(toasts(<AddSentenceSheet sense={sense} onClose={onClose} />), {
      routes: base({ [`POST /v1/senses/${uuid(2)}/sentences`]: () => new Promise<Response>((r) => (answer = r)) }),
    });
    const field = screen.getByRole('textbox', { name: 'Câu' });
    await userEvent.type(field, 'Turn left.{Enter}');
    await userEvent.type(field, '{Enter}');
    expect(posts(calls, `/v1/senses/${uuid(2)}/sentences`)).toHaveLength(1);
    expect(screen.queryByText('Đã lưu câu.')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    answer(problem(409, 'sentence-limit-reached'));
    expect(await screen.findByText('Nghĩa này đã đủ số câu tối đa. Xóa bớt một câu để thêm câu mới.')).toBeInTheDocument();
  });
});

describe('I-7: one write per press', () => {
  it('bulk add', async () => {
    let release!: () => void;
    const { calls } = renderApp(<BulkAddSheet filter={{ level: 'A2' }} onClose={() => {}} />, {
      routes: base({
        'POST /v1/groups': () => Response.json({ id: uuid(9), name: 'A2' }, { status: 201 }),
        [`POST /v1/groups/${uuid(9)}/items/bulk`]: () =>
          new Promise<Response>((r) => (release = () => r(Response.json({ added: 1, already_in_group: 0, skipped_function_words: 0, skipped_group_full: 0, skipped_not_found: 0 })))),
      }),
    });
    await userEvent.dblClick(await screen.findByRole('button', { name: 'Thêm cả loạt' }));
    await waitFor(() => expect(posts(calls, `/v1/groups/${uuid(9)}/items/bulk`)).toHaveLength(1));
    release();
    expect(posts(calls, '/v1/groups')).toHaveLength(1);
  });

  it('the deck picker of the word page', async () => {
    window.localStorage.setItem(LAST_GROUP_KEY, TRAVEL);
    let release!: () => void;
    const { calls } = renderApp(<DeckPickerDialog sense={{ sense_id: uuid(1), lemma: 'go', pos: 'verb', meaning: { text: 'đi' } }} onClose={() => {}} />, {
      routes: base({ [`POST /v1/groups/${TRAVEL}/items`]: () => new Promise<Response>((r) => (release = () => r(Response.json({ created: true })))) }),
    });
    await userEvent.dblClick(await screen.findByRole('button', { name: 'Lưu vào Du lịch' }));
    expect(posts(calls, `/v1/groups/${TRAVEL}/items`)).toHaveLength(1);
    release();
  });
});

describe('I-3, M-2: hostile or long word in the URL', () => {
  it('"." is not found and never reaches the word list route', async () => {
    nav.params = new URLSearchParams({ w: '.' });
    const { calls } = renderApp(<WordPage />, { routes: base() });
    expect(await screen.findByText('Không tìm thấy từ “.”')).toBeInTheDocument();
    expect(calls.some((c) => c.path.startsWith('/v1/words'))).toBe(false);
  });

  it('a very long word is cut to 100 characters in the title, and the title may wrap', async () => {
    nav.params = new URLSearchParams({ w: 'x'.repeat(400) });
    renderApp(<WordPage />, { routes: base() });
    const title = await screen.findByRole('heading', { name: `Không tìm thấy từ “${'x'.repeat(100)}”` });
    expect(title.className).toMatch(/break-words|wrap-anywhere/);
  });
});

describe('I-4: saving a word refreshes the deck it went to', () => {
  it('the deck page cache of the target deck is invalidated', async () => {
    window.localStorage.setItem(LAST_GROUP_KEY, TRAVEL);
    const { client } = renderApp(<AddWordSheet initialWord="went" onClose={() => {}} />, {
      routes: base({ 'POST /v1/quick-add': () => Response.json({ item_id: uuid(90), sense_id: uuid(1), created_item: true, created_word: false, sentence_id: null }, { status: 201 }) }),
    });
    client.setQueryData(['group', TRAVEL], { id: TRAVEL });
    await userEvent.click(await screen.findByRole('button', { name: 'Lưu went' }));
    await waitFor(() => expect(client.getQueryState(['group', TRAVEL])?.isInvalidated).toBe(true));
  });
});

describe('I-5: the search strip follows the URL of the lookup page', () => {
  it('a level cleared by "Xóa lọc" is cleared in the strip too', async () => {
    nav.params = new URLSearchParams({ q: 'go', level: 'B1' });
    renderApp(<Rerender />, { routes: base() });
    expect(screen.getByRole('button', { name: /B1/ })).toBeInTheDocument();
    nav.params = new URLSearchParams({ q: 'go' });
    await userEvent.click(screen.getByRole('button', { name: 'tick' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /B1/ })).not.toBeInTheDocument());
  });

  it('a search from the lookup page keeps its topic, part of speech and "mine" filters', async () => {
    nav.params = new URLSearchParams({ q: 'go', topic: 'food', pos: 'verb', mine: 'true' });
    renderApp(<SearchStrip />, { routes: base() });
    const box = screen.getByRole('searchbox');
    await userEvent.clear(box);
    await userEvent.type(box, 'eat{Enter}');
    const url = new URL(String(nav.push.mock.calls.at(-1)?.[0]), 'http://x');
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: 'eat', topic: 'food', pos: 'verb', mine: 'true' });
  });
});

describe('I-6, M-7: every sheet can be closed without saving; the deck list only chooses', () => {
  it('the add-word sheet has [Hủy] that closes it', async () => {
    const onClose = vi.fn();
    renderApp(<AddWordSheet initialWord="went" onClose={onClose} />, { routes: base() });
    await userEvent.click(await screen.findByRole('button', { name: 'Hủy' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('the deck picker has [Hủy] that closes it', async () => {
    const onClose = vi.fn();
    renderApp(<DeckPickerDialog sense={{ sense_id: uuid(1), lemma: 'go', pos: 'verb', meaning: { text: 'đi' } }} onClose={onClose} />, { routes: base() });
    await userEvent.click(await screen.findByRole('button', { name: 'Hủy' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('inside the add-word sheet the deck list button says "Chọn …", not "Lưu vào …"', async () => {
    window.localStorage.setItem(LAST_GROUP_KEY, TRAVEL);
    renderApp(<AddWordSheet initialWord="went" onClose={() => {}} />, { routes: base() });
    await userEvent.click(await screen.findByRole('button', { name: /Lưu vào nhóm.*Du lịch/ }));
    expect(await screen.findByRole('button', { name: 'Chọn Du lịch' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lưu vào Du lịch' })).not.toBeInTheDocument();
  });
});

describe('English learners: the definition is not shown twice', () => {
  it('a meaning that is the English definition gets no extra definition line', async () => {
    nav.params = new URLSearchParams({ w: 'go' });
    const sense = { ...goSense, meaning: { text: 'to move or travel', language: 'en', translation_missing: false }, definition_en: 'to move or travel', sentence_count: 0 };
    renderApp(<WordPage />, {
      locale: 'en',
      routes: base({
        'GET /v1/words/go': () => Response.json({ lemma: 'go', inflections: [], sections: [{ pos: 'verb', senses: [sense] }] }),
        [`GET /v1/items?sense_ids=${uuid(1)}`]: () => Response.json({ items: [] }),
      }),
    });
    const block = await screen.findByRole('article');
    expect(within(block).getAllByText('to move or travel')).toHaveLength(1);
  });
});
