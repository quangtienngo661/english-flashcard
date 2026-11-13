// @vitest-environment jsdom
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test-utils/render-app';
import type { Route } from '@/app-shell/session/test-support';
import { PracticePage } from './PracticePage';

// M5.3: Tùy chỉnh phiên, round 14 (Figma 131:3890, 140:4049, 141:4147, states 131:4522), with the AI count of #249.
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

const TECH = '11111111-1111-4111-8111-111111111111';
const IELTS = '22222222-2222-4222-8222-222222222222';
const cells = (counts: number[]) => counts.map((total, level) => ({ level, total, due: 0 }));
const GROUPS = [
  { id: TECH, name: 'Công nghệ', version: 1, total: 48, today: { priority: 4, due: 16, new: 4 }, cells: cells([6, 12, 10, 8, 7, 5]), backlog: 0 },
  { id: IELTS, name: 'IELTS', version: 1, total: 22, today: { priority: 0, due: 3, new: 0 }, cells: cells([2, 4, 4, 4, 4, 4]), backlog: 0 },
];
const LATER = '2026-11-30T17:00:00.000Z'; // 0:00 on 1/12 in Asia/Ho_Chi_Minh
const pool = (limit: number, used: number, resets_at: string | null) => ({ limit, used, remaining: Math.max(0, limit - used), resets_at });
// 'free' has AI switched off (both allowances 0); 'free-ai' 15 a month, 3 used; 'low' 3 left; 'out' none left; 'pro' 300, 20 used.
type Plan = 'free' | 'free-ai' | 'low' | 'out' | 'pro';
const entitlements = (plan: Plan) => {
  const ai = { free: pool(0, 0, null), 'free-ai': pool(15, 3, LATER), low: pool(15, 12, LATER), out: pool(15, 15, LATER), pro: pool(300, 20, LATER) }[plan];
  return {
    plan: plan === 'pro' ? 'pro' : 'free', sources: [], trial_eligible: false, ai_available: { enabled: true, cap_reached: false },
    features: {
      'ai.practice': plan === 'free' ? { allowed: false, reason: 'plan-required' } : { allowed: true, reason: null },
      'ai.lookup': { allowed: false, reason: 'plan-required' },
    },
    pools: { practice_sessions: pool(30, 2, '2026-11-10T17:00:00.000Z'), ai_practice: ai, ai_lookup: pool(0, 0, null) },
  };
};
type Practice = Record<string, unknown>;
const config = (practice: Practice = {}) => ({
  practice: {
    max_questions_per_session: 20, default_questions_per_session: 12, session_max_mode: 'fixed', ai_max_mode: 'percent', ai_max_fixed: 5,
    ai_max_percent: 50, ai_placement: 'even', scope_questions_max: 100, ...practice,
  },
  reminders: { send_time: '20:00' }, learning: { backlog_after_days: 60, groups_per_user: 100 },
  plans: { free: { practice_sessions_per_day: 3, ai_practice_per_cycle: 15, ai_lookup_per_cycle: 5 }, trial: { ai_practice_per_cycle: 100, ai_lookup_per_cycle: 30 }, pro: { practice_sessions_per_day: 30, ai_practice_per_cycle: 300, ai_lookup_per_cycle: 100 } },
});
const problem = (status: number, slug: string, extra: Record<string, unknown> = {}): Route => () =>
  new Response(JSON.stringify({ type: `http://api.test/problems/${slug}`, status, title: slug, ...extra }), {
    status, headers: { 'content-type': 'application/problem+json' },
  });
const noSession: Route = () => Response.json({ type: 'http://x/problems/not-found', status: 404, title: 'n' }, { status: 404 });
const routes = (plan: Plan, practice: Practice = {}, over: Record<string, Route> = {}): Record<string, Route> => ({
  'GET /v1/groups': () => Response.json({ items: GROUPS }),
  'GET /v1/me/app-config': () => Response.json(config(practice)),
  'GET /v1/me/entitlements': () => Response.json(entitlements(plan)),
  'GET /v1/practice/sessions/current': noSession,
  'GET /v1/practice/weak-words/groups': () => Response.json({ total: 6, items: [{ group_id: TECH, name: 'Công nghệ', count: 4 }] }),
  'GET /v1/practice/weak-words?page_size=2': () => Response.json({ items: [], next_page_token: null }),
  'GET /v1/practice/history?page_size=3': () => Response.json({ items: [], next_page_token: null }),
  'POST /v1/practice/sessions': () => Response.json({ session: {} }, { status: 201 }),
  ...over,
});
const starts = (calls: Array<{ method: string; path: string; body: unknown }>) => calls.filter((c) => c.method === 'POST' && c.path === '/v1/practice/sessions');

async function open(source: string, plan: Plan = 'pro', practice: Practice = {}, over: Record<string, Route> = {}) {
  const view = renderApp(<PracticePage />, { routes: routes(plan, practice, over) });
  const list = await screen.findByRole('list', { name: 'Luyện theo nguồn khác' });
  await userEvent.click(within(list).getByRole('button', { name: `Tùy chỉnh: ${source}` }));
  const dialog = await screen.findByRole('dialog', { name: /Tùy chỉnh phiên/ });
  // The AI part reads the entitlements: wait until the caption is there.
  await within(dialog).findByText(/câu AI|Dành cho gói Pro|Hết lượt/);
  return { view, dialog };
}
const press = async (dialog: HTMLElement, name: string, times = 1) => {
  for (let i = 0; i < times; i++) await userEvent.click(within(dialog).getByRole('button', { name }));
};
const startButton = (dialog: HTMLElement) => within(dialog).getByRole('button', { name: /^Bắt đầu/ });

describe('Tùy chỉnh phiên: words', () => {
  it('Theo nhóm: one group from the list, the word filter, the types, the count and the order go into the start body', async () => {
    const { view, dialog } = await open('Theo nhóm');
    const list = within(dialog).getByRole('radiogroup', { name: 'Nhóm' });
    expect(within(list).getAllByRole('radio').map((r) => r.getAttribute('aria-label'))).toEqual(['Công nghệ · 48 từ', 'IELTS · 22 từ']);
    await userEvent.click(within(list).getByRole('radio', { name: 'IELTS · 22 từ' }));
    expect(within(dialog).getByText('22 từ')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Cần ôn 3' }));
    expect(within(dialog).getByText('3 từ')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Đúng/sai' }));
    await press(dialog, 'Số câu: bớt 1');
    await userEvent.click(within(dialog).getByRole('button', { name: /Thứ tự/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Ngẫu nhiên' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Bắt đầu 11 câu' }));
    await waitFor(() => expect(starts(view.calls)).toHaveLength(1));
    expect(starts(view.calls)[0].body).toEqual({
      source: 'group', group_id: IELTS, group_filter: 'due', types: ['mcq_definition', 'type_word'], prompt_style: 'mixed', count: 11, sort: 'random', ai_count: 0,
    });
  });

  it('"Chỉ một bậc": Bậc 2 shows 10 từ and sends group_filter 2; the word filter goes back to Mọi từ', async () => {
    const { view, dialog } = await open('Theo nhóm');
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Ưu tiên 4' }));
    await userEvent.click(within(dialog).getByRole('button', { name: /Chỉ một bậc/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Bậc 2 · 10' }));
    expect(within(dialog).getByText('10 từ')).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: 'Ưu tiên 4' })).not.toBeChecked();
    await userEvent.click(startButton(dialog));
    await waitFor(() => expect(starts(view.calls)).toHaveLength(1));
    expect(starts(view.calls)[0].body).toMatchObject({ group_filter: '2' });
  });

  it('Từ hay sai: the list starts with all groups and counts weak words; a group goes along as group_id', async () => {
    const { view, dialog } = await open('Từ hay sai');
    const list = within(dialog).getByRole('radiogroup', { name: 'Nhóm' });
    expect(within(list).getByRole('radio', { name: 'Tất cả nhóm · 6' })).toBeChecked();
    await userEvent.click(within(list).getByRole('radio', { name: 'Công nghệ · 4 từ' }));
    await userEvent.click(startButton(dialog));
    await waitFor(() => expect(starts(view.calls)).toHaveLength(1));
    expect(starts(view.calls)[0].body).toMatchObject({ source: 'weak', group_id: TECH });
  });

  it('the count stops at max_questions_per_session in the fixed mode', async () => {
    const { dialog } = await open('Luyện tất cả');
    await press(dialog, 'Số câu: thêm 1', 10);
    expect(within(dialog).getByRole('textbox', { name: 'Số câu' })).toHaveValue('20');
    expect(within(dialog).getByRole('button', { name: 'Số câu: thêm 1' })).toBeDisabled();
    expect(within(dialog).queryByText(/^tối đa/)).not.toBeInTheDocument();
  });

  it('"Theo số từ" (scope_words): Ưu tiên with 4 words gives "tối đa 4" and the count follows', async () => {
    const { dialog } = await open('Theo nhóm', 'pro', { session_max_mode: 'scope_words' });
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Ưu tiên 4' }));
    expect(within(dialog).getByText('tối đa 4')).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: 'Số câu' })).toHaveValue('4');
    expect(within(dialog).getByRole('button', { name: 'Số câu: thêm 1' })).toBeDisabled();
    expect(startButton(dialog)).toHaveTextContent('Bắt đầu 4 câu');
  });
});

describe('Tùy chỉnh phiên: question types', () => {
  it('turning off every type says "Chọn ít nhất một kiểu câu." and disables the start', async () => {
    const { dialog } = await open('Luyện tất cả');
    for (const name of ['Trắc nghiệm', 'Đúng/sai', 'Gõ từ']) await userEvent.click(within(dialog).getByRole('checkbox', { name }));
    expect(within(dialog).getByText('Chọn ít nhất một kiểu câu.')).toBeInTheDocument();
    expect(startButton(dialog)).toBeDisabled();
  });

  it('T22: the start button is described by the line that says why it is off, and that line sits in a status', async () => {
    const { dialog } = await open('Luyện tất cả');
    expect(startButton(dialog)).not.toHaveAccessibleDescription(/Chọn ít nhất/);
    for (const name of ['Trắc nghiệm', 'Đúng/sai', 'Gõ từ']) await userEvent.click(within(dialog).getByRole('checkbox', { name }));
    expect(startButton(dialog)).toHaveAccessibleDescription('Chọn ít nhất một kiểu câu.');
    expect(within(dialog).getAllByRole('status').some((s) => s.textContent === 'Chọn ít nhất một kiểu câu.')).toBe(true);
  });

  it('T22: AI on with both AI rows off says why in the description too; every normal type off adds that line', async () => {
    const { dialog } = await open('Luyện tất cả');
    await press(dialog, 'Câu AI viết: thêm 1', 3);
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Điền từ vào câu' }));
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Trắc nghiệm theo câu' }));
    expect(startButton(dialog)).toHaveAccessibleDescription('Chọn ít nhất một kiểu câu AI.');
    for (const name of ['Trắc nghiệm', 'Đúng/sai', 'Gõ từ']) await userEvent.click(within(dialog).getByRole('checkbox', { name }));
    expect(startButton(dialog)).toHaveAccessibleDescription(/Chọn ít nhất một kiểu câu\./);
    expect(startButton(dialog)).toHaveAccessibleDescription(/Chọn ít nhất một kiểu câu AI\./);
  });

  it('the prompt style sits on the Gõ từ row; with Gõ từ off it stays there, locked (owner 10/11/2026)', async () => {
    const { view, dialog } = await open('Luyện tất cả');
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Theo câu' }));
    await userEvent.click(startButton(dialog));
    await waitFor(() => expect(starts(view.calls)).toHaveLength(1));
    expect(starts(view.calls)[0].body).toMatchObject({ prompt_style: 'sentence' });
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Gõ từ' }));
    const prompt = within(dialog).getByRole('radiogroup', { name: 'Kiểu đề' });
    for (const radio of within(prompt).getAllByRole('radio')) expect(radio).toBeDisabled();
    // The AI row's own choice is locked the same way while there is no AI question.
    for (const radio of within(within(dialog).getByRole('radiogroup', { name: 'Kiểu trắc nghiệm theo câu' })).getAllByRole('radio')) expect(radio).toBeDisabled();
  });

  it('saved sentences on, no AI: cloze with cloze_source own; the choice is remembered on this device', async () => {
    const { view, dialog } = await open('Luyện tất cả');
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Điền từ vào câu bạn đã lưu' }));
    expect(localStorage.getItem('wordmet-web.own-sentences')).toBe('on');
    await userEvent.click(startButton(dialog));
    await waitFor(() => expect(starts(view.calls)).toHaveLength(1));
    expect(starts(view.calls)[0].body).toMatchObject({ types: ['mcq_definition', 'true_false_definition', 'type_word', 'cloze'], cloze_source: 'own', ai_count: 0 });
  });
});

describe('Tùy chỉnh phiên: Câu AI viết', () => {
  it('starts at 0 with the AI rows off; the caption gives the most and the units left', async () => {
    const { dialog } = await open('Luyện tất cả');
    expect(within(dialog).getByRole('textbox', { name: 'Câu AI viết' })).toHaveValue('0');
    // 50% of 12 questions = 6; 300 − 20 = 280 left.
    expect(within(dialog).getByText('Tối đa 6 câu AI · còn 280 lượt')).toBeInTheDocument();
    expect(within(dialog).getByRole('checkbox', { name: 'Điền từ vào câu' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Câu AI viết: bớt 1' })).toBeDisabled();
  });

  it('3 AI questions: the AI types and ai_count go into the body; the footer says "Trong đó 3 câu AI, rải đều."', async () => {
    const { view, dialog } = await open('Luyện tất cả');
    await press(dialog, 'Câu AI viết: thêm 1', 3);
    expect(within(dialog).getByRole('checkbox', { name: 'Điền từ vào câu' })).toBeEnabled();
    expect(within(dialog).getByText(/Trong đó 3 câu AI, rải đều\./)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Chọn từ' }));
    await userEvent.click(startButton(dialog));
    await waitFor(() => expect(starts(view.calls)).toHaveLength(1));
    expect(starts(view.calls)[0].body).toEqual({
      source: 'all', types: ['mcq_definition', 'true_false_definition', 'type_word', 'cloze', 'mcq_sentence'], prompt_style: 'mixed', count: 12, ai_count: 3,
    });
  });

  it('the AI count never passes the cap of the session: 7 questions at 50% → 3', async () => {
    const { dialog } = await open('Luyện tất cả');
    await press(dialog, 'Số câu: bớt 1', 5);
    expect(within(dialog).getByText('Tối đa 3 câu AI · còn 280 lượt')).toBeInTheDocument();
    await press(dialog, 'Câu AI viết: thêm 1', 3);
    expect(within(dialog).getByRole('button', { name: 'Câu AI viết: thêm 1' })).toBeDisabled();
    await press(dialog, 'Số câu: bớt 1', 2);
    // 5 questions → 2: the chosen 3 comes down with it.
    expect(within(dialog).getByRole('textbox', { name: 'Câu AI viết' })).toHaveValue('2');
  });

  it('saved sentences and AI fill-in both on: cloze_source own_then_ai, cloze once, and the "?" by the row explains it', async () => {
    const { view, dialog } = await open('Luyện tất cả');
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Điền từ vào câu bạn đã lưu' }));
    const help = within(dialog).getByRole('button', { name: 'Điền từ vào câu bạn đã lưu là gì?' });
    // React Aria opens a tooltip on keyboard focus too (jsdom has no real hover): a key press, then focus the "?".
    const showTip = async () => {
      for (let i = 0; i < 40 && document.activeElement !== help; i++) await userEvent.tab();
      return screen.findByRole('tooltip', { hidden: true });
    };
    expect(await showTip()).toHaveTextContent('Chỉ hỏi từ đã có câu bạn lưu. Không tốn lượt câu AI.');
    act(() => help.blur());
    await press(dialog, 'Câu AI viết: thêm 1', 2);
    // Owner 10/11/2026: the explanation sits behind the "?" on hover, not as a line under the rows.
    expect(within(dialog).queryByText('Từ nào đã có câu bạn lưu thì dùng câu đó, từ khác do AI viết.')).not.toBeInTheDocument();
    expect(await showTip()).toHaveTextContent('Từ nào đã có câu bạn lưu thì dùng câu đó, từ khác do AI viết.');
    act(() => help.blur());
    await userEvent.click(startButton(dialog));
    await waitFor(() => expect(starts(view.calls)).toHaveLength(1));
    expect(starts(view.calls)[0].body).toMatchObject({
      types: ['mcq_definition', 'true_false_definition', 'type_word', 'cloze', 'meaning_in_sentence', 'mcq_sentence'], cloze_source: 'own_then_ai', ai_count: 2,
    });
  });

  it('AI on with both AI rows off, then every normal type off: the two lines of round 14', async () => {
    const { dialog } = await open('Luyện tất cả');
    await press(dialog, 'Câu AI viết: thêm 1', 3);
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Điền từ vào câu' }));
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Trắc nghiệm theo câu' }));
    expect(within(dialog).getByText('Chọn ít nhất một kiểu câu AI.')).toBeInTheDocument();
    expect(startButton(dialog)).toBeDisabled();
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Điền từ vào câu' }));
    for (const name of ['Trắc nghiệm', 'Đúng/sai', 'Gõ từ']) await userEvent.click(within(dialog).getByRole('checkbox', { name }));
    expect(within(dialog).getByText('Chọn ít nhất một kiểu câu không cần AI cho 9 câu còn lại.')).toBeInTheDocument();
    expect(startButton(dialog)).toBeDisabled();
  });

  it('"Để người học chọn": Xếp câu AI shows once there is an AI question, and Ngẫu nhiên goes as ai_placement', async () => {
    const { view, dialog } = await open('Luyện tất cả', 'pro', { ai_placement: 'learner' });
    expect(within(dialog).queryByRole('radiogroup', { name: 'Xếp câu AI' })).not.toBeInTheDocument();
    await press(dialog, 'Câu AI viết: thêm 1', 2);
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Ngẫu nhiên' }));
    expect(within(dialog).getByText(/Trong đó 2 câu AI, xếp ngẫu nhiên\./)).toBeInTheDocument();
    await userEvent.click(startButton(dialog));
    await waitFor(() => expect(starts(view.calls)).toHaveLength(1));
    expect(starts(view.calls)[0].body).toMatchObject({ ai_count: 2, ai_placement: 'random' });
  });

  it('Free with the monthly allowance: AI is usable, no lock', async () => {
    const { dialog } = await open('Luyện tất cả', 'free-ai');
    expect(within(dialog).getByText('Tối đa 6 câu AI · còn 12 lượt')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Câu AI viết: thêm 1' })).toBeEnabled();
    expect(within(dialog).queryByText('Dành cho gói Pro.')).not.toBeInTheDocument();
  });

  it('3 units left: the count stops at 3 and says why', async () => {
    const { dialog } = await open('Luyện tất cả', 'low');
    expect(within(dialog).getByText('Tối đa 3 câu AI, vì bạn còn 3 lượt')).toBeInTheDocument();
    await press(dialog, 'Câu AI viết: thêm 1', 3);
    expect(within(dialog).getByRole('button', { name: 'Câu AI viết: thêm 1' })).toBeDisabled();
  });

  it('no unit left: the count is locked at 0; a Free learner gets "Xem gói Pro"', async () => {
    const { dialog } = await open('Luyện tất cả', 'out');
    expect(within(dialog).getByText(/Hết lượt câu AI tháng này\./)).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Xem gói Pro' })).toHaveAttribute('href', '/vi/app/plans');
    expect(within(dialog).getByRole('button', { name: 'Câu AI viết: thêm 1' })).toBeDisabled();
  });

  it('AI switched off for the plan (both allowances 0): the AI part is locked and says why', async () => {
    const { dialog } = await open('Luyện tất cả', 'free');
    expect(within(dialog).getByText('Dành cho gói Pro.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Câu AI viết: thêm 1' })).toBeDisabled();
  });

  it('403 ai-quota-insufficient: "Không đủ lượt câu AI", the start is off; "Bỏ kiểu câu có AI" sets the count to 0 and turns it back on', async () => {
    const { view, dialog } = await open('Luyện tất cả', 'pro', {}, {
      'POST /v1/practice/sessions': problem(403, 'ai-quota-insufficient', { needed: 5, remaining: 3, resets_at: LATER }),
    });
    await press(dialog, 'Câu AI viết: thêm 1', 5);
    await userEvent.click(startButton(dialog));
    const alert = await within(dialog).findByRole('alert');
    expect(alert).toHaveTextContent('Không đủ lượt câu AI');
    expect(alert).toHaveTextContent('Phiên này cần 5 lượt câu AI, bạn còn 3. Lượt câu AI mới vào 1/12.');
    expect(startButton(dialog)).toBeDisabled();
    await userEvent.click(within(alert).getByRole('button', { name: 'Bỏ kiểu câu có AI' }));
    expect(within(dialog).getByRole('textbox', { name: 'Câu AI viết' })).toHaveValue('0');
    expect(startButton(dialog)).toBeEnabled();
    expect(starts(view.calls)).toHaveLength(1);
  });

  it('review I1: after 403 with 3 units really left, the AI count stops at 3, 3 starts, and the units are read again', async () => {
    const { view, dialog } = await open('Luyện tất cả', 'pro', {}, {
      'POST /v1/practice/sessions': problem(403, 'ai-quota-insufficient', { needed: 5, remaining: 3, resets_at: LATER }),
    });
    const reads = view.calls.filter((c) => c.path === '/v1/me/entitlements').length;
    await press(dialog, 'Câu AI viết: thêm 1', 5);
    await userEvent.click(startButton(dialog));
    await within(dialog).findByRole('alert');
    await press(dialog, 'Câu AI viết: bớt 1', 2);
    expect(within(dialog).getByRole('textbox', { name: 'Câu AI viết' })).toHaveValue('3');
    expect(within(dialog).getByRole('button', { name: 'Câu AI viết: thêm 1' })).toBeDisabled();
    expect(startButton(dialog)).toBeEnabled();
    await waitFor(() => expect(view.calls.filter((c) => c.path === '/v1/me/entitlements').length).toBeGreaterThan(reads));
  });

  it('503 ai-unavailable gives the one general line', async () => {
    const { dialog } = await open('Luyện tất cả', 'pro', {}, { 'POST /v1/practice/sessions': problem(503, 'ai-unavailable') });
    await press(dialog, 'Câu AI viết: thêm 1');
    await userEvent.click(startButton(dialog));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Hệ thống đang gặp lỗi, chưa dùng được kiểu câu có AI.');
  });
});

describe('Tùy chỉnh phiên: footer', () => {
  it('the line under the start tells how many sessions are left today', async () => {
    const { dialog } = await open('Đang ưu tiên');
    expect(within(dialog).getByText('Dùng 1 trong 28 phiên còn lại hôm nay.')).toBeInTheDocument();
  });

  it('409 practice-no-words with no-word-fits-types is told inside the dialog', async () => {
    const { dialog } = await open('Luyện tất cả', 'pro', {}, {
      'POST /v1/practice/sessions': () => Response.json({ type: 'http://x/problems/practice-no-words', status: 409, title: 'n', reason: 'no-word-fits-types' }, { status: 409 }),
    });
    await userEvent.click(startButton(dialog));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Không từ nào làm được kiểu câu đã chọn. Chọn thêm kiểu câu khác.');
  });
});
