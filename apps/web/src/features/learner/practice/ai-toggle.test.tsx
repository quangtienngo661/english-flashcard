// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/app-ui/test-utils';
import type { Route } from '@/app-shell/session/test-support';
import { PracticePage } from './PracticePage';
import { readOwnSentencesOn, writeOwnSentencesOn } from './OwnSentencesToggle';

const hardReplace = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/practice',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: (path: string) => hardReplace(path), isLeaving: () => false }));
vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => {
  hardReplace.mockReset();
  localStorage.clear();
});

const KEY = 'wordmet-web.ai-types';
const OWN_KEY = 'wordmet-web.own-sentences';
const TECH = '11111111-1111-4111-8111-111111111111';
const GROUPS = [{ id: TECH, name: 'Công nghệ', version: 1, total: 18, today: { priority: 3, due: 12, new: 3 }, cells: [], backlog: 0 }];
const RESETS = '2026-10-23T17:00:00.000Z';
const LATER = '2026-11-14T17:00:00.000Z'; // 0:00 on 15/11 in Asia/Ho_Chi_Minh
const pool = (limit: number, used: number, resets_at: string | null) => ({ limit, used, remaining: Math.max(0, limit - used), resets_at });
const entitlements = (plan: 'free' | 'pro') => ({
  plan, sources: [], trial_eligible: false, ai_available: { enabled: true, cap_reached: false },
  features: {
    'ai.practice': plan === 'free' ? { allowed: false, reason: 'plan-required' } : { allowed: true, reason: null },
    'ai.lookup': plan === 'free' ? { allowed: false, reason: 'plan-required' } : { allowed: true, reason: null },
  },
  pools: {
    practice_sessions: pool(plan === 'free' ? 3 : 30, 1, RESETS),
    ai_practice: plan === 'free' ? pool(0, 0, null) : pool(300, 13, LATER),
    ai_lookup: plan === 'free' ? pool(0, 0, null) : pool(100, 4, LATER),
  },
});
const CONFIG = {
  practice: { max_questions_per_session: 20, default_questions_per_session: 12 },
  reminders: { send_time: '20:00' }, learning: { backlog_after_days: 60, groups_per_user: 100 },
  plans: { free: { practice_sessions_per_day: 3 }, trial: { ai_practice_per_cycle: 100, ai_lookup_per_cycle: 30 }, pro: { practice_sessions_per_day: 30, ai_practice_per_cycle: 300, ai_lookup_per_cycle: 100 } },
};
const problem = (status: number, slug: string, extra: Record<string, unknown> = {}): Route => () =>
  new Response(JSON.stringify({ type: `http://api.test/problems/${slug}`, status, title: slug, ...extra }), {
    status, headers: { 'content-type': 'application/problem+json' },
  });
const noSession: Route = () => Response.json({ type: 'http://x/problems/not-found', status: 404, title: 'n' }, { status: 404 });
const routes = (plan: 'free' | 'pro', over: Record<string, Route> = {}): Record<string, Route> => ({
  'GET /v1/groups': () => Response.json({ items: GROUPS }),
  'GET /v1/me/app-config': () => Response.json(CONFIG),
  'GET /v1/me/entitlements': () => Response.json(entitlements(plan)),
  'GET /v1/practice/sessions/current': noSession,
  'GET /v1/practice/weak-words/groups': () => Response.json({ total: 0, items: [] }),
  'GET /v1/practice/weak-words?page_size=2': () => Response.json({ items: [], next_page_token: null }),
  'GET /v1/practice/history?page_size=3': () => Response.json({ items: [], next_page_token: null }),
  'POST /v1/practice/sessions': () => Response.json({ session: {} }, { status: 201 }),
  ...over,
});
const starts = (calls: Array<{ method: string; path: string; body: unknown }>) =>
  calls.filter((c) => c.method === 'POST' && c.path === '/v1/practice/sessions');
const AI = ['Điền từ vào câu', 'Chọn nghĩa trong câu', 'Trắc nghiệm theo câu'];

async function open(plan: 'free' | 'pro', over: Record<string, Route> = {}) {
  const view = renderApp(<PracticePage />, { routes: routes(plan, over) });
  const list = await screen.findByRole('list', { name: 'Luyện theo nguồn khác' });
  await userEvent.click(within(list).getByRole('button', { name: 'Tùy chỉnh: Luyện tất cả' }));
  const dialog = await screen.findByRole('dialog', { name: /Tùy chỉnh phiên/ });
  return { view, dialog };
}
const aiSwitch = (dialog: HTMLElement) => within(dialog).getByRole('switch', { name: /Kiểu câu có AI/ });
const ownSwitch = (dialog: HTMLElement) => within(dialog).getByRole('switch', { name: 'Điền từ vào câu bạn đã lưu' });

describe('Kiểu câu có AI in Tùy chỉnh phiên (K/70, K/70b, K/71, K/72; D10)', () => {
  it('K/70b Free: the switch is shown dimmed with the Pro label; pressing it tells why and never shows the AI types', async () => {
    const { dialog } = await open('free');
    await waitFor(() => expect(aiSwitch(dialog)).toHaveAttribute('aria-disabled', 'true'));
    expect(within(dialog).getByText('Pro')).toBeInTheDocument();
    await userEvent.click(aiSwitch(dialog));
    expect(within(dialog).getByText('Dành cho gói Pro. Gói Pro chưa mở bán.')).toBeInTheDocument();
    for (const name of AI) expect(within(dialog).queryByRole('checkbox', { name })).toBeNull();
  });

  it('K/70 Pro: AI on shows ticked types and usage; with own off, start sends AI types without cloze_source', async () => {
    const { view, dialog } = await open('pro');
    await waitFor(() => expect(aiSwitch(dialog)).not.toBeChecked());
    for (const name of AI) expect(within(dialog).queryByRole('checkbox', { name })).toBeNull();
    await userEvent.click(aiSwitch(dialog));
    for (const name of AI) expect(within(dialog).getByRole('checkbox', { name })).toBeChecked();
    // ceil(12 × 3 AI types ÷ 6 types) = 6; 300 − 13 = 287 left.
    expect(within(dialog).getByText('Phiên này dùng tối đa 6 lượt câu AI · còn 287')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Trắc nghiệm theo câu' }));
    expect(within(dialog).getByText('Phiên này dùng tối đa 5 lượt câu AI · còn 287')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Bắt đầu 12 câu' }));
    await waitFor(() => expect(starts(view.calls)).toHaveLength(1));
    expect(starts(view.calls)[0].body).toEqual({
      source: 'all', types: ['mcq_definition', 'true_false_definition', 'type_word', 'cloze', 'meaning_in_sentence'], prompt_style: 'mixed', count: 12,
    });
  });

  it('E21: the switch is remembered on this device; an unreadable storage leaves it off and the app works', async () => {
    const first = await open('pro');
    await waitFor(() => expect(aiSwitch(first.dialog)).not.toBeChecked());
    await userEvent.click(aiSwitch(first.dialog));
    expect(localStorage.getItem(KEY)).toBe('on');
    first.view.unmount();
    const second = await open('pro');
    await waitFor(() => expect(aiSwitch(second.dialog)).toBeChecked());
    second.view.unmount();
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const third = await open('pro');
    await waitFor(() => expect(aiSwitch(third.dialog)).not.toBeChecked());
    spy.mockRestore();
  });

  it('K/71: 403 ai-quota-insufficient says what is needed, what is left and when it refills; [Bỏ kiểu câu có AI] turns the switch off', async () => {
    localStorage.setItem(KEY, 'on');
    const { dialog } = await open('pro', {
      'POST /v1/practice/sessions': problem(403, 'ai-quota-insufficient', { remaining: 2, needed: 5, resets_at: LATER }),
    });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Bắt đầu 12 câu' }));
    const box = await within(dialog).findByRole('alert');
    expect(within(box).getByText('Không đủ lượt câu AI')).toBeInTheDocument();
    expect(within(box).getByText('Phiên này cần 5 lượt câu AI, bạn còn 2. Lượt câu AI mới có vào 15/11.')).toBeInTheDocument();
    expect(within(box).getByText('Giảm số câu, hoặc bỏ kiểu câu có AI rồi bắt đầu lại.')).toBeInTheDocument();
    await userEvent.click(within(box).getByRole('button', { name: 'Bỏ kiểu câu có AI' }));
    expect(aiSwitch(dialog)).not.toBeChecked();
    expect(within(dialog).queryByRole('alert')).toBeNull();
    for (const name of AI) expect(within(dialog).queryByRole('checkbox', { name })).toBeNull();
  });

  it('K/72, E28, D11: 503 ai-unavailable gives the one general line, never the cause', async () => {
    localStorage.setItem(KEY, 'on');
    const { dialog } = await open('pro', { 'POST /v1/practice/sessions': problem(503, 'ai-unavailable', { reason: 'model-not-set' }) });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Bắt đầu 12 câu' }));
    const box = await within(dialog).findByRole('alert');
    expect(within(box).getByText('Hệ thống đang gặp lỗi, chưa dùng được kiểu câu có AI. Bỏ kiểu câu AI để bắt đầu, hoặc thử lại sau.')).toBeInTheDocument();
    expect(within(box).queryByText(/model/i)).toBeNull();
    await userEvent.click(within(box).getByRole('button', { name: 'Bỏ kiểu câu có AI' }));
    expect(aiSwitch(dialog)).not.toBeChecked();
  });

  it('E24: 403 entitlement-required turns the switch off and locked, tells why and reads the plan again', async () => {
    localStorage.setItem(KEY, 'on');
    let plan: 'free' | 'pro' = 'pro';
    const { view, dialog } = await open('pro', {
      'GET /v1/me/entitlements': () => Response.json(entitlements(plan)),
      'POST /v1/practice/sessions': () => {
        plan = 'free';
        return problem(403, 'entitlement-required', { feature: 'ai.practice' })(undefined as never);
      },
    });
    await waitFor(() => expect(aiSwitch(dialog)).toBeChecked());
    const before = view.count('GET', '/v1/me/entitlements');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Bắt đầu 12 câu' }));
    expect(await within(dialog).findByText('Dành cho gói Pro. Gói Pro chưa mở bán.')).toBeInTheDocument();
    await waitFor(() => expect(view.count('GET', '/v1/me/entitlements')).toBeGreaterThan(before));
    await waitFor(() => expect(aiSwitch(dialog)).toHaveAttribute('aria-disabled', 'true'));
    for (const name of AI) expect(within(dialog).queryByRole('checkbox', { name })).toBeNull();
  });
});

describe('Saved sentences in Tùy chỉnh phiên (A3, C3)', () => {
  it('A3-1 Free: the own switch is enabled; start sends types with cloze and cloze_source own', async () => {
    const { view, dialog } = await open('free');
    expect(ownSwitch(dialog)).toBeEnabled();
    expect(ownSwitch(dialog)).not.toBeChecked();
    expect(within(dialog).getByText('Chỉ dùng cho từ có câu bạn đã lưu. Không tốn lượt AI.')).toBeInTheDocument();
    await userEvent.click(ownSwitch(dialog));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Bắt đầu 12 câu' }));
    await waitFor(() => expect(starts(view.calls)).toHaveLength(1));
    expect(starts(view.calls)[0].body).toEqual({
      source: 'all', types: ['mcq_definition', 'true_false_definition', 'type_word', 'cloze'],
      cloze_source: 'own', prompt_style: 'mixed', count: 12,
    });
  });

  it('A3-2 Free: only own on enables start; 409 no-word-fits-types shows the existing message', async () => {
    const { view, dialog } = await open('free', {
      'POST /v1/practice/sessions': problem(409, 'practice-no-words', { reason: 'no-word-fits-types' }),
    });
    for (const box of within(dialog).getAllByRole('checkbox')) await userEvent.click(box);
    const start = within(dialog).getByRole('button', { name: 'Bắt đầu 12 câu' });
    expect(start).toBeDisabled();
    await userEvent.click(ownSwitch(dialog));
    expect(start).toBeEnabled();
    await userEvent.click(start);
    await waitFor(() => expect(starts(view.calls)).toHaveLength(1));
    expect(starts(view.calls)[0].body).toEqual({ source: 'all', types: ['cloze'], cloze_source: 'own', count: 12 });
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Không từ nào làm được kiểu câu đã chọn. Chọn thêm kiểu câu khác.');
  });

  it('A3-3 Pro: AI and own on disables AI cloze, sends cloze once, and counts only AI types in usage', async () => {
    const { view, dialog } = await open('pro');
    await userEvent.click(aiSwitch(dialog));
    await userEvent.click(ownSwitch(dialog));
    const cloze = within(dialog).getByRole('checkbox', { name: AI[0] });
    expect(cloze).not.toBeChecked();
    expect(cloze).toBeDisabled();
    for (const name of AI.slice(1)) {
      expect(within(dialog).getByRole('checkbox', { name })).toBeChecked();
      expect(within(dialog).getByRole('checkbox', { name })).toBeEnabled();
    }
    expect(within(dialog).getByText('Điền từ dùng câu bạn đã lưu thay cho câu AI.')).toBeInTheDocument();
    // ceil(12 × 2 AI types ÷ 6 total types) = 4; own cloze uses no AI credit.
    expect(within(dialog).getByText('Phiên này dùng tối đa 4 lượt câu AI · còn 287')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Bắt đầu 12 câu' }));
    await waitFor(() => expect(starts(view.calls)).toHaveLength(1));
    expect(starts(view.calls)[0].body).toEqual({
      source: 'all', types: ['mcq_definition', 'true_false_definition', 'type_word', 'cloze', 'meaning_in_sentence', 'mcq_sentence'],
      cloze_source: 'own', prompt_style: 'mixed', count: 12,
    });
  });

  it.each([true, false])('own off restores the learner\'s earlier AI cloze choice (%s), without cloze_source', async (chosen) => {
    const { view, dialog } = await open('pro');
    await userEvent.click(aiSwitch(dialog));
    const cloze = within(dialog).getByRole('checkbox', { name: AI[0] });
    if (!chosen) await userEvent.click(cloze);
    await userEvent.click(ownSwitch(dialog));
    expect(cloze).not.toBeChecked();
    expect(cloze).toBeDisabled();
    await userEvent.click(ownSwitch(dialog));
    expect(cloze).toBeEnabled();
    if (chosen) expect(cloze).toBeChecked();
    else expect(cloze).not.toBeChecked();
    expect(within(dialog).queryByText('Điền từ dùng câu bạn đã lưu thay cho câu AI.')).toBeNull();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Bắt đầu 12 câu' }));
    await waitFor(() => expect(starts(view.calls)).toHaveLength(1));
    expect(starts(view.calls)[0].body).toEqual({
      source: 'all', types: ['mcq_definition', 'true_false_definition', 'type_word', ...(chosen ? ['cloze'] : []), 'meaning_in_sentence', 'mcq_sentence'],
      prompt_style: 'mixed', count: 12,
    });
  });

  it('the own switch is remembered on this device; unreadable storage leaves it off', async () => {
    const first = await open('free');
    await userEvent.click(ownSwitch(first.dialog));
    expect(localStorage.getItem(OWN_KEY)).toBe('on');
    first.view.unmount();
    const second = await open('free');
    expect(ownSwitch(second.dialog)).toBeChecked();
    await userEvent.click(ownSwitch(second.dialog));
    expect(localStorage.getItem(OWN_KEY)).toBe('off');
    second.view.unmount();
    localStorage.setItem(OWN_KEY, 'on');
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    try {
      expect(readOwnSentencesOn()).toBe(false);
      const third = await open('free');
      expect(ownSwitch(third.dialog)).not.toBeChecked();
    } finally {
      spy.mockRestore();
    }
  });

  it('a failed storage write is ignored and the own switch still works', async () => {
    const { dialog } = await open('free');
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    try {
      expect(() => writeOwnSentencesOn(true)).not.toThrow();
      await userEvent.click(ownSwitch(dialog));
      expect(ownSwitch(dialog)).toBeChecked();
    } finally {
      spy.mockRestore();
    }
  });
});
