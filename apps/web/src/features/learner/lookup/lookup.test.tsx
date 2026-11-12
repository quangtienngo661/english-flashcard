// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastRegion } from '@/ui/Toast';
import { renderApp } from '@/test-utils/render-app';
import { LookupPage } from './LookupPage';

// Giao diện mới M4.5: Tra từ "Từ hóa thẻ" (Figma 85:3218 / 85:3667).

const nav = vi.hoisted(() => ({ params: new URLSearchParams(), replace: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/lookup',
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
  useSearchParams: () => nav.params,
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: vi.fn(), isLeaving: () => false }));
vi.setConfig({ testTimeout: 20_000 });

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const WORK = uuid(201);
const WRITING = uuid(202);
const row = (lemma: string, over = {}) => ({
  lemma, pos_list: ['noun'], level: 'B1', meaning_preview: `nghĩa ${lemma}`, has_private: false, ipa: `ipa-${lemma}`, example: `A ${lemma} here.`, ...over,
});
const group = (id: string, name: string, total: number, due: number) => ({
  id, name, version: 1, total, today: { priority: 0, due, new: 0 }, cells: [{ level: 0, total, due }], backlog: 0, available: { due, new: 0 },
});
const sense = (n: number, lemma: string) => ({
  sense_id: uuid(n), entry_id: uuid(n + 50), scope: 'catalog', lemma, pos: 'noun', level: 'B1', context_label: null,
  meaning: { text: `nghĩa ${lemma}`, language: 'vi', translation_missing: false }, definition_en: null, examples: [`A ${lemma} here.`],
  topics: [{ code: 'work', name: 'Công việc' }], form_of: null, ai_suggested: false, sentence_count: 0,
});
const wordPage = (n: number, lemma: string) => () => Response.json({ lemma, inflections: [], sections: [{ pos: 'noun', senses: [sense(n, lemma)] }] });
const PAGE1 = [row('budget'), row('candidate'), row('colleague', { ipa: null, example: null }), row('contract')];
const base = (extra = {}) => ({
  'GET /v1/topics': () => Response.json({ items: [{ code: 'work', name: 'Công việc' }, { code: 'travel', name: 'Du lịch' }] }),
  'GET /v1/me/app-config': () => Response.json({ learning: { backlog_after_days: 60, groups_per_user: 100 } }),
  'GET /v1/me/entitlements': () => Response.json({ plan: 'free', pools: {}, sources: [] }),
  'GET /v1/groups': () => Response.json({ items: [group(WRITING, 'Đề 12 · Writing', 30, 24), group(WORK, 'Công việc · B1', 20, 0)] }),
  'GET /v1/words?page_size=20&level=B1&topic=work': () => Response.json({ items: PAGE1, next_page_token: 'p2', total: 24 }),
  'GET /v1/words?page_size=20&level=B1&topic=work&page_token=p2': () => Response.json({ items: [row('deadline')], next_page_token: null, total: 24 }),
  'GET /v1/words/budget': wordPage(1, 'budget'),
  'GET /v1/words/candidate': wordPage(2, 'candidate'),
  'GET /v1/words/colleague': wordPage(3, 'colleague'),
  'GET /v1/words/contract': wordPage(4, 'contract'),
  'GET /v1/words/deadline': wordPage(5, 'deadline'),
  [`GET /v1/items?sense_ids=${uuid(1)}`]: () =>
    Response.json({ items: [{ sense_id: uuid(1), item_id: uuid(90), level: 3, due_date: '2026-11-12', priority: false, group_ids: [WORK] }] }),
  [`GET /v1/items?sense_ids=${uuid(2)}`]: () => Response.json({ items: [] }),
  ...extra,
});
const lastUrl = (spy: ReturnType<typeof vi.fn>) => new URL(String(spy.mock.calls.at(-1)?.[0]), 'http://x');
const sentence = (text: string) => (_: string, el: Element | null) => el?.tagName === 'P' && el.textContent === text;

beforeEach(() => {
  nav.params = new URLSearchParams({ level: 'B1', topic: 'work' });
  nav.replace.mockClear();
  nav.push.mockClear();
});

describe('Tra từ: search and filters', () => {
  it('sends the URL filters and reads "24 từ trình độ B1, chủ đề Công việc, loại từ tất cả."', async () => {
    const { calls } = renderApp(<LookupPage />, { routes: base() });
    expect(await screen.findByText(sentence('24 từ trình độ B1, chủ đề Công việc, loại từ tất cả.'))).toBeInTheDocument();
    expect(calls.some((c) => c.path === '/v1/words?page_size=20&level=B1&topic=work')).toBe(true);
    expect(screen.getByRole('searchbox', { name: 'Tìm từ, ví dụ: mitigate' })).toBeInTheDocument();
  });

  it('choosing A2 from the level menu replaces the URL, keeping the topic', async () => {
    renderApp(<LookupPage />, { routes: base() });
    await userEvent.click(await screen.findByRole('button', { name: 'Trình độ: B1' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'A2' }));
    expect(nav.replace).toHaveBeenCalledTimes(1);
    expect(lastUrl(nav.replace).pathname).toBe('/vi/app/lookup');
    expect(Object.fromEntries(lastUrl(nav.replace).searchParams)).toEqual({ level: 'A2', topic: 'work' });
  });

  it('the three filter values are buttons that keep their names and open their menus', async () => {
    renderApp(<LookupPage />, { routes: base() });
    await userEvent.click(await screen.findByRole('button', { name: 'Chủ đề: Công việc' }));
    expect(await screen.findByRole('menuitem', { name: 'Du lịch' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Loại từ: tất cả' }));
    expect(await screen.findByRole('menuitem', { name: 'noun' })).toBeInTheDocument();
  });

  it('the search box sends its text with the filters on Enter', async () => {
    renderApp(<LookupPage />, { routes: base() });
    await userEvent.type(await screen.findByRole('searchbox', { name: 'Tìm từ, ví dụ: mitigate' }), 'budget{Enter}');
    expect(Object.fromEntries(lastUrl(nav.replace).searchParams)).toEqual({ q: 'budget', level: 'B1', topic: 'work' });
  });

  it('nothing found: the empty state offers "Thêm từ này"', async () => {
    nav.params = new URLSearchParams({ q: 'rizz' });
    renderApp(<LookupPage />, { routes: base({ 'GET /v1/words?page_size=20&q=rizz': () => Response.json({ items: [], next_page_token: null, total: 0 }) }) });
    expect(await screen.findByText('Không tìm thấy từ này')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm từ này' })).toBeInTheDocument();
  });
});

describe('Tra từ: the dictionary page', () => {
  it('groups entries under letter headings, with the running header and "— 1 —"', async () => {
    renderApp(<LookupPage />, { routes: base() });
    expect(await screen.findByRole('heading', { name: 'B' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'C' })).toBeInTheDocument();
    expect(screen.getByText('trang 1')).toBeInTheDocument();
    expect(screen.getByText('— 1 —')).toBeInTheDocument();
  });

  it('an entry without IPA and example shows only the head and the meaning', async () => {
    renderApp(<LookupPage />, { routes: base() });
    const entry = await screen.findByRole('button', { name: /^colleague/ });
    expect(entry.textContent).toBe('colleaguen.B11nghĩa colleague.');
    const budget = screen.getByRole('button', { name: /^budget/ });
    expect(within(budget).getByText('/ipa-budget/')).toBeInTheDocument();
    expect(within(budget).getByRole('strong')).toHaveTextContent(/^budget$/);
  });

  it('a part of speech that was never set ("unspecified") is not printed in an entry', async () => {
    renderApp(<LookupPage />, { routes: base({ 'GET /v1/words?page_size=20&level=B1&topic=work': () => Response.json({ items: [row('budget', { pos_list: ['unspecified'] })], next_page_token: null, total: 1 }) }) });
    const entry = await screen.findByRole('button', { name: /^budget/ });
    expect(entry).toHaveTextContent('budget');
    expect(screen.queryByText(/unspecified/)).not.toBeInTheDocument();
  });

  it('the own word carries "của tôi"', async () => {
    renderApp(<LookupPage />, {
      routes: base({ 'GET /v1/words?page_size=20&level=B1&topic=work': () => Response.json({ items: [row('rizz', { has_private: true })], next_page_token: null, total: 1 }) }),
    });
    expect(within(await screen.findByRole('button', { name: /^rizz/ })).getByText('Của tôi')).toBeInTheDocument();
  });

  it('the first entry is lifted by default; ↓ moves the selection and the card follows', async () => {
    renderApp(<LookupPage />, { routes: base() });
    const card = await screen.findByRole('region', { name: 'Thẻ của từ đang chọn' });
    expect(within(card).getByRole('heading', { name: 'budget' })).toBeInTheDocument();
    expect(await within(card).findByText('Công việc · B1 · Bậc 3')).toBeInTheDocument();
    screen.getByRole('button', { name: /^budget/ }).focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: /^candidate/ })).toHaveFocus();
    expect(within(card).getByRole('heading', { name: 'candidate' })).toBeInTheDocument();
  });

  it('"Trang sau →" asks for page_token=p2; "← Trang trước" goes back without a request', async () => {
    const { calls } = renderApp(<LookupPage />, { routes: base() });
    await userEvent.click(await screen.findByRole('button', { name: 'Trang sau' }));
    expect(await screen.findByRole('button', { name: /^deadline/ })).toBeInTheDocument();
    expect(calls.some((c) => c.path === '/v1/words?page_size=20&level=B1&topic=work&page_token=p2')).toBe(true);
    expect(screen.getByText('— 2 —')).toBeInTheDocument();
    const before = calls.filter((c) => c.path.startsWith('/v1/words?')).length;
    await userEvent.click(screen.getByRole('button', { name: '← Trang trước' }));
    expect(await screen.findByRole('button', { name: /^budget/ })).toBeInTheDocument();
    expect(calls.filter((c) => c.path.startsWith('/v1/words?')).length).toBe(before);
  });
});

describe('Tra từ: group stacks', () => {
  it('a click on a stack adds the card\'s sense once; its caption turns "✓ đã có"', async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const { calls } = renderApp(
      <>
        <LookupPage />
        <ToastRegion />
      </>,
      {
        routes: base({
          [`POST /v1/groups/${WRITING}/items`]: async () => {
            await gate;
            return Response.json({ created: true }, { status: 201 });
          },
        }),
      },
    );
    const stack = await screen.findByRole('button', { name: 'Thêm vào Đề 12 · Writing' });
    await waitFor(() => expect(stack).toBeEnabled());
    expect(within(stack.parentElement!).getByText('+ thêm vào đây')).toBeInTheDocument();
    await userEvent.dblClick(stack);
    release();
    expect(await screen.findByText('Đã thêm “budget” vào nhóm “Đề 12 · Writing”.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem nhóm' })).toHaveAttribute('href', `/vi/app/group?id=${WRITING}`);
    const posts = calls.filter((c) => c.method === 'POST' && c.path === `/v1/groups/${WRITING}/items`);
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toEqual({ sense_id: uuid(1) });
    expect(posts[0].headers['Idempotency-Key']).toBeTruthy();
    expect(within(stack.parentElement!).getByText('✓ đã có')).toBeInTheDocument();
  });

  it('a group that already has the sense reads "✓ đã có" and cannot be pressed', async () => {
    renderApp(<LookupPage />, { routes: base() });
    const stack = await screen.findByRole('button', { name: 'Thêm vào Công việc · B1' });
    expect(await within(stack.parentElement!).findByText('✓ đã có')).toBeInTheDocument();
    expect(stack).toBeDisabled();
  });

  it('"Mở trang từ →" links to the selected word', async () => {
    renderApp(<LookupPage />, { routes: base() });
    expect(await screen.findByRole('link', { name: 'Mở trang từ' })).toHaveAttribute('href', '/vi/app/word?w=budget');
  });
});

describe('Tra từ: final review findings', () => {
  it('the card and the stacks use the meaning the entry shows, not the first meaning of the word page', async () => {
    nav.params = new URLSearchParams({ level: 'B1', topic: 'work', pos: 'verb' });
    const noun = { ...sense(11, 'record'), meaning: { text: 'hồ sơ', language: 'vi', translation_missing: false } };
    const verb = { ...sense(12, 'record'), pos: 'verb', meaning: { text: 'ghi lại', language: 'vi', translation_missing: false } };
    const { calls } = renderApp(<LookupPage />, {
      routes: base({
        'GET /v1/words?page_size=20&level=B1&topic=work&pos=verb': () =>
          Response.json({ items: [row('record', { pos_list: ['verb'], meaning_preview: 'ghi lại' })], next_page_token: null, total: 1 }),
        'GET /v1/words/record': () => Response.json({ lemma: 'record', inflections: [], sections: [{ pos: 'noun', senses: [noun] }, { pos: 'verb', senses: [verb] }] }),
        [`GET /v1/items?sense_ids=${uuid(12)}`]: () => Response.json({ items: [] }),
        [`POST /v1/groups/${WRITING}/items`]: () => Response.json({ created: true }, { status: 201 }),
      }),
    });
    const card = await screen.findByRole('region', { name: 'Thẻ của từ đang chọn' });
    expect(await within(card).findByText('ghi lại')).toBeInTheDocument();
    const stack = screen.getByRole('button', { name: 'Thêm vào Đề 12 · Writing' });
    await waitFor(() => expect(stack).toBeEnabled());
    await userEvent.click(stack);
    await waitFor(() => expect(calls.filter((c) => c.path === `/v1/groups/${WRITING}/items`)).toHaveLength(1));
    expect(calls.find((c) => c.path === `/v1/groups/${WRITING}/items`)?.body).toEqual({ sense_id: uuid(12) });
  });

  it('moving the mouse over other entries does not change the lifted word', async () => {
    renderApp(<LookupPage />, { routes: base() });
    const card = await screen.findByRole('region', { name: 'Thẻ của từ đang chọn' });
    expect(within(card).getByRole('heading', { name: 'budget' })).toBeInTheDocument();
    await userEvent.hover(screen.getByRole('button', { name: /^candidate/ }));
    expect(within(card).getByRole('heading', { name: 'budget' })).toBeInTheDocument();
  });
});

describe('Tra từ: stacks stay put', () => {
  it('after an add refreshes the groups, every stack keeps its place', async () => {
    let added = false;
    renderApp(<LookupPage />, {
      routes: base({
        // After the add, "Công việc · B1" has more cards waiting and would sort first.
        'GET /v1/groups': () =>
          Response.json({ items: added ? [group(WRITING, 'Đề 12 · Writing', 31, 1), group(WORK, 'Công việc · B1', 20, 50)] : [group(WRITING, 'Đề 12 · Writing', 30, 24), group(WORK, 'Công việc · B1', 20, 0)] }),
        [`POST /v1/groups/${WRITING}/items`]: () => {
          added = true;
          return Response.json({ created: true }, { status: 201 });
        },
      }),
    });
    const names = () => screen.getAllByRole('button', { name: /^Thêm vào / }).map((b) => b.getAttribute('aria-label'));
    const stack = await screen.findByRole('button', { name: 'Thêm vào Đề 12 · Writing' });
    await waitFor(() => expect(stack).toBeEnabled());
    const before = names();
    expect(before).toEqual(['Thêm vào Đề 12 · Writing', 'Thêm vào Công việc · B1']);
    await userEvent.click(stack);
    await waitFor(() => expect(within(screen.getByRole('button', { name: 'Thêm vào Công việc · B1' }).parentElement!).getByText('50')).toBeInTheDocument());
    expect(names()).toEqual(before);
  });
});

describe('Tra từ: "Nhóm khác" waits for the items', () => {
  it('is disabled while the word\'s items load', async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    renderApp(<LookupPage />, {
      routes: base({
        [`GET /v1/items?sense_ids=${uuid(1)}`]: async () => {
          await gate;
          return Response.json({ items: [{ sense_id: uuid(1), item_id: uuid(90), level: 3, due_date: '2026-11-12', priority: false, group_ids: [WORK] }] });
        },
      }),
    });
    const other = await screen.findByRole('button', { name: 'Nhóm khác hoặc tạo nhóm mới' });
    expect(other).toBeDisabled();
    release();
    await waitFor(() => expect(other).toBeEnabled());
  });
});
