// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/app-ui/test-utils';
import type { Route } from '@/app-shell/session/test-support';
import { makeMe } from '@/app-shell/session/test-support';
import { PracticeSession } from './PracticeSession';

const hardReplace = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/practice/session',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: (path: string) => hardReplace(path), isLeaving: () => false }));
vi.setConfig({ testTimeout: 30_000 });

const SESSION = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const view = () => ({
  id: SESSION, source: 'all', group_id: null, group_filter: null, sort: 'least_practiced',
  types: ['cloze', 'meaning_in_sentence', 'mcq_sentence'], prompt_style: 'mixed', target_count: 10, status: 'active', round: 1,
  asked: 4, words: 10, ai_planned: 10, cloze_source: 'ai',
});
const base = { round: 1, position: 4, prompt_style: 'sentence', hint_level: 0, state: 'unanswered', tries: 0, reportable: true, private_word: false };
const cloze = (over: Record<string, unknown> = {}) => ({
  ...base, item_id: 'it-c', type: 'cloze', hints_available: { level1: true, level2: true, level3: true },
  prompt: { kind: 'cloze', sentence: 'We use Docker to ___ the app to the production server.' }, ...over,
});
const meaning = {
  ...base, item_id: 'it-m', type: 'meaning_in_sentence', hints_available: { level1: true, level2: false, level3: false },
  prompt: { kind: 'meaning_in_sentence', sentence: 'The team deployed the update to all servers.', highlight: 'deployed', meaning_language: 'vi',
    options: ['triển khai (phần mềm)', 'giao hàng', 'bảo vệ', 'trì hoãn'] },
};
const sentenceMcq = {
  ...base, item_id: 'it-s', type: 'mcq_sentence', hints_available: { level1: true, level2: false, level3: false },
  prompt: { kind: 'mcq_sentence', sentence: 'We ___ the app to the server yesterday.', options: ['deployed', 'delivered', 'defended', 'delayed'] },
};
const result = (over: Record<string, unknown> = {}) => ({
  result: 'correct', skipped: false, tries: 1, hint_level: 0,
  correct: { lemma: 'deploy', text: 'deploy', choice_index: null, is_true: null },
  meaning: 'triển khai (phần mềm)', definition_en: 'to move software to a server so that people can use it', show_known: true,
  highlight_needs_review: false, translation: 'Chúng tôi dùng Docker để triển khai ứng dụng lên máy chủ chính thức.', ...over,
});
const AI_REASONS = {
  items: [
    { code: 'meaning_wrong', label: 'Nghĩa sai', detail_hint: null, note_required: false },
    { code: 'ai_sentence_unnatural', label: 'Câu sai ngữ pháp hoặc không tự nhiên', detail_hint: null, note_required: false },
    { code: 'other', label: 'Khác', detail_hint: 'Ghi rõ lỗi', note_required: true },
  ],
};
const ENT = {
  plan: 'pro', sources: [], trial_eligible: false, ai_available: { enabled: true, cap_reached: false },
  features: { 'ai.practice': { allowed: true, reason: null }, 'ai.lookup': { allowed: true, reason: null } },
  pools: {
    practice_sessions: { limit: 30, used: 1, remaining: 29, resets_at: '2026-10-23T17:00:00.000Z' },
    ai_practice: { limit: 300, used: 0, remaining: 300, resets_at: null }, ai_lookup: { limit: 100, used: 0, remaining: 100, resets_at: null },
  },
};
const routes = (item: unknown, over: Record<string, Route> = {}): Record<string, Route> => ({
  'GET /v1/practice/sessions/current': () => Response.json({ session: view(), item, preparing: false }),
  'GET /v1/groups': () => Response.json({ items: [] }),
  'GET /v1/me/entitlements': () => Response.json(ENT),
  [`POST /v1/practice/sessions/${SESSION}/prepare`]: () => Response.json({ prepared: 0, already_ready: 0 }),
  'GET /v1/practice/report-reasons?kind=ai': () => Response.json(AI_REASONS),
  ...over,
});
type Call = { method: string; path: string; body: unknown };
const posts = (calls: Call[], path: string) => calls.filter((c) => c.method === 'POST' && c.path === path);

describe('AI question types (K/78a–K/81)', () => {
  it('K/78a cloze: "Câu AI", the sentence with its blank, [Kiểm tra] sends the typed word', async () => {
    const r = renderApp(<PracticeSession />, { routes: routes(cloze(), { 'POST /v1/practice/items/it-c/answer': () => Response.json(result()) }) });
    expect(await screen.findByText('We use Docker to ___ the app to the production server.')).toBeInTheDocument();
    expect(screen.getByText('Câu AI')).toBeInTheDocument();
    expect(screen.getByText('Điền từ vào câu')).toBeInTheDocument();
    expect(screen.getByText('Gõ từ còn thiếu, đúng dạng trong câu')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox'), 'deploy');
    await userEvent.click(screen.getByRole('button', { name: /Kiểm tra/ }));
    await waitFor(() => expect(posts(r.calls, '/v1/practice/items/it-c/answer')[0]?.body).toEqual({ text: 'deploy' }));
  });

  it('K/78a: [Xem đáp án] before any try skips the question', async () => {
    const r = renderApp(<PracticeSession />, { routes: routes(cloze(), { 'POST /v1/practice/items/it-c/skip': () => Response.json(result({ result: 'wrong', skipped: true, show_known: false, highlight_needs_review: true })) }) });
    await userEvent.click(await screen.findByRole('button', { name: 'Xem đáp án' }));
    await waitFor(() => expect(posts(r.calls, '/v1/practice/items/it-c/skip')).toHaveLength(1));
  });

  it('A16: [Xem đáp án] gives case 4: Still learning is primary with Enter', async () => {
    const r = renderApp(<PracticeSession />, { routes: routes(cloze(), {
      'POST /v1/practice/items/it-c/skip': () => Response.json(result({ result: 'wrong', skipped: true, show_known: false, highlight_needs_review: true })),
      'POST /v1/practice/items/it-c/review': () => Response.json({ action: 'needs_review', item_id: 'it-c', level: 1 }),
      [`POST /v1/practice/sessions/${SESSION}/next`]: () => Response.json({ state: 'question', session: view(), item: meaning }),
    }) });
    await userEvent.click(await screen.findByRole('button', { name: 'Xem đáp án' }));
    const primary = await screen.findByRole('button', { name: /Cần ôn lại/ });
    expect(primary).toHaveAttribute('data-variant', 'sticker');
    expect(primary.querySelector('kbd')).toHaveTextContent('Enter');
    expect(screen.getByRole('button', { name: 'Câu tiếp' })).toHaveAttribute('data-variant', 'quiet');
    expect(screen.queryByRole('button', { name: /Đã biết/ })).not.toBeInTheDocument();
    await userEvent.keyboard('{Enter}');
    await screen.findByText('deployed', { selector: 'strong' });
    expect(posts(r.calls, '/v1/practice/items/it-c/review').map((c) => c.body)).toEqual([{ action: 'needs_review' }]);
    expect(posts(r.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(1);
  });

  it('K/78b meaning in sentence: the asked word is bold; key 1 chooses the first meaning', async () => {
    const r = renderApp(<PracticeSession />, { routes: routes(meaning, { 'POST /v1/practice/items/it-m/answer': () => Response.json(result()) }) });
    expect(await screen.findByText('deployed', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('Từ in đậm trong câu này nghĩa là gì?')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^[1-4] / }).map((b) => b.textContent)).toEqual(['1 triển khai (phần mềm)', '2 giao hàng', '3 bảo vệ', '4 trì hoãn']);
    await userEvent.keyboard('1');
    await waitFor(() => expect(posts(r.calls, '/v1/practice/items/it-m/answer')[0]?.body).toEqual({ choice: 0 }));
  });

  it('K/78c sentence MCQ: "Chọn từ điền vào chỗ trống" and the four words', async () => {
    renderApp(<PracticeSession />, { routes: routes(sentenceMcq) });
    expect(await screen.findByText('We ___ the app to the server yesterday.')).toBeInTheDocument();
    expect(screen.getByText('Chọn từ điền vào chỗ trống')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^1 deployed/ })).toBeInTheDocument();
  });

  it('copy doc §15 row 10: [Gợi ý] opens hint 1 in the numbered list with progress, then [Mở gợi ý 2]', async () => {
    renderApp(<PracticeSession />, { routes: routes(cloze(), {
      'POST /v1/practice/items/it-c/hint': () => Response.json({ level: 1, hint: { kind: 'first_letter', text: 'd…' } }),
    }) });
    await screen.findByText('We use Docker to ___ the app to the production server.');
    // The cloze field has the focus, so H types a letter there; the button opens the hint.
    await userEvent.click(screen.getByRole('button', { name: /^Gợi ý/ }));
    expect(await screen.findByText('d…')).toBeInTheDocument();
    expect(screen.getByText('Gợi ý 1/3')).toBeInTheDocument();
    expect(screen.getByText('Chữ cái đầu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mở gợi ý 2/ })).toBeInTheDocument();
  });

  it('K/79a: a Vietnamese learner sees "Bản dịch · AI dịch" with the translated sentence', async () => {
    renderApp(<PracticeSession />, { routes: routes(meaning, { 'POST /v1/practice/items/it-m/answer': () => Response.json(result()) }) });
    await screen.findByText('deployed', { selector: 'strong' });
    await userEvent.keyboard('1');
    const block = (await screen.findByText('Bản dịch')).closest('div')!;
    expect(within(block).getByText('AI dịch')).toBeInTheDocument();
    expect(within(block).getByText('Chúng tôi dùng Docker để triển khai ứng dụng lên máy chủ chính thức.')).toBeInTheDocument();
  });

  it('E41: an English learner has no translation block', async () => {
    renderApp(<PracticeSession />, {
      locale: 'en', me: makeMe({ native_language: 'en' }),
      routes: routes(meaning, { 'POST /v1/practice/items/it-m/answer': () => Response.json(result()) }),
    });
    await screen.findByText('deployed', { selector: 'strong' });
    await userEvent.keyboard('1');
    await screen.findByText('Right');
    expect(screen.queryByText(/Chúng tôi dùng Docker/)).toBeNull();
    expect(screen.queryByText('Translation')).toBeNull();
  });

  it('K/80: an AI question reports with the AI reasons and the credit line', async () => {
    const r = renderApp(<PracticeSession />, { routes: routes(sentenceMcq, { 'POST /v1/practice/items/it-s/report': () => Response.json({ id: 'r1' }, { status: 201 }) }) });
    await screen.findByText('We ___ the app to the server yesterday.');
    await userEvent.click(screen.getByRole('button', { name: 'Báo lỗi' }));
    const dialog = await screen.findByRole('dialog', { name: 'Báo lỗi câu này' });
    expect(within(dialog).getAllByRole('radio').map((x) => x.closest('label')?.textContent)).toEqual(['Nghĩa sai', 'Câu sai ngữ pháp hoặc không tự nhiên', 'Khác']);
    expect(within(dialog).getByText(/Nếu đúng là AI viết sai câu, bạn được trả lại 1 lượt câu AI\./)).toBeInTheDocument();
    expect(within(dialog).queryByText(/Đội Wordmet sẽ thấy từ/)).toBeNull();
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Nghĩa sai' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gửi báo lỗi' }));
    await waitFor(() => expect(posts(r.calls, '/v1/practice/items/it-s/report')).toHaveLength(1));
  });

  it('K/81 (D12): a question about the learner\'s own word has no consent box, says the team will see the word, sends no share_private_word', async () => {
    const own = { ...sentenceMcq, private_word: true };
    const r = renderApp(<PracticeSession />, { routes: routes(own, {
      'POST /v1/practice/items/it-s/answer': () => Response.json(result({ correct: { lemma: 'rizz', text: 'rizz', choice_index: 0, is_true: null } })),
      'POST /v1/practice/items/it-s/report': () => Response.json({ id: 'r1' }, { status: 201 }),
    }) });
    await screen.findByText('We ___ the app to the server yesterday.');
    await userEvent.keyboard('1');
    await screen.findByText('Đúng rồi');
    await userEvent.click(screen.getByRole('button', { name: 'Báo lỗi' }));
    const dialog = await screen.findByRole('dialog', { name: 'Báo lỗi câu này' });
    expect(within(dialog).getByText('Đội Wordmet sẽ thấy từ “rizz” bạn tự thêm để kiểm tra.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('checkbox')).toBeNull();
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Nghĩa sai' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gửi báo lỗi' }));
    await waitFor(() => expect(posts(r.calls, '/v1/practice/items/it-s/report')).toHaveLength(1));
    expect(posts(r.calls, '/v1/practice/items/it-s/report')[0].body).toEqual({ reason: 'meaning_wrong' });
  });
});
