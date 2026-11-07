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
      'POST /v1/practice/items/it-c/hint': () => Response.json({ level: 1, hint: { kind: 'first_letter', text: 'd' } }),
    }) });
    await screen.findByText('We use Docker to ___ the app to the production server.');
    // The cloze field has the focus, so H types a letter there; the button opens the hint.
    await userEvent.click(screen.getByRole('button', { name: /^Gợi ý/ }));
    expect(await screen.findByText('d___')).toBeInTheDocument();
    expect(screen.getByText('Gợi ý 1/3')).toBeInTheDocument();
    expect(screen.getByText('Chữ cái đầu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mở gợi ý 2/ })).toBeInTheDocument();
  });

  it('CS20: hint 1 of a cloze shows the first letter and three underscores, whatever the length of the word', async () => {
    renderApp(<PracticeSession />, { routes: routes(cloze(), {
      'POST /v1/practice/items/it-c/hint': () => Response.json({ level: 1, hint: { kind: 'first_letter', text: 'c' } }),
    }) });
    await screen.findByText('We use Docker to ___ the app to the production server.');
    await userEvent.click(screen.getByRole('button', { name: /^Gợi ý/ }));
    expect(await screen.findByText('c___')).toBeInTheDocument();
    expect(screen.queryByText('c')).not.toBeInTheDocument();
  });

  it('a hint that is not a first letter is shown as the API sends it', async () => {
    renderApp(<PracticeSession />, { routes: routes(cloze({ hint_level: 2 }), {
      'POST /v1/practice/items/it-c/hint': (call) => Response.json((call.body as { level: number }).level === 1
        ? { level: 1, hint: { kind: 'first_letter', text: 'c' } } : { level: 2, hint: { kind: 'definition', text: 'very important' } }),
    }) });
    await screen.findByText('We use Docker to ___ the app to the production server.');
    expect(await screen.findByText('very important')).toBeInTheDocument();
    expect(await screen.findByText('c___')).toBeInTheDocument();
  });

  describe('a try-again says why (session synonyms design §3.1)', () => {
    const typeAndCheck = async (reply: unknown) => {
      renderApp(<PracticeSession />, { routes: routes(cloze(), { 'POST /v1/practice/items/it-c/answer': () => Response.json(reply) }) });
      await screen.findByText('We use Docker to ___ the app to the production server.');
      await userEvent.type(screen.getByRole('textbox'), 'habit');
      await userEvent.click(screen.getByRole('button', { name: /Kiểm tra/ }));
    };

    // Owner, 07/11/2026: a try-again shows no box at all. The red field and "Lần 1" say it; "Chưa đúng" is only for screen readers.
    it('CS3: a session-word try-again shows no box and no line; only the live region says "Chưa đúng"', async () => {
      await typeAndCheck({ result: 'try_again', tries: 1, reason: 'session_word' });
      expect(await screen.findByText('Lần 1')).toBeInTheDocument();
      expect(screen.getByText('Chưa đúng')).toHaveAttribute('data-live', 'result');
      expect(screen.queryByText(/một từ khác trong phiên/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Kiểm tra chính tả/)).not.toBeInTheDocument();
    });

    it('CS4: a try-again with reason null shows no line either', async () => {
      await typeAndCheck({ result: 'try_again', tries: 1, reason: null });
      expect(await screen.findByText('Lần 1')).toBeInTheDocument();
      expect(screen.getByText('Chưa đúng')).toHaveAttribute('data-live', 'result');
      expect(screen.queryByText(/Kiểm tra chính tả/)).not.toBeInTheDocument();
    });

    it('CS4: an older API sends no reason: the same', async () => {
      await typeAndCheck({ result: 'try_again', tries: 1 });
      expect(await screen.findByText('Lần 1')).toBeInTheDocument();
      expect(screen.queryByText(/Kiểm tra chính tả/)).not.toBeInTheDocument();
    });

    it('the English copy', async () => {
      renderApp(<PracticeSession />, { locale: 'en', routes: routes(cloze(), {
        'POST /v1/practice/items/it-c/answer': () => Response.json({ result: 'try_again', tries: 1, reason: 'session_word' }),
      }) });
      await screen.findByText('We use Docker to ___ the app to the production server.');
      await userEvent.type(screen.getByRole('textbox'), 'habit');
      await userEvent.click(screen.getByRole('button', { name: /Check/ }));
      expect(await screen.findByText('Try 1')).toBeInTheDocument();
      expect(screen.getByText('Not quite')).toHaveAttribute('data-live', 'result');
      expect(screen.queryByText(/another word from this session/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Check the spelling/)).not.toBeInTheDocument();
    });
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
    await screen.findByText('deploy · triển khai (phần mềm)');
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
    await screen.findByText('rizz · triển khai (phần mềm)');
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

// The "Alternative answer" card (session synonyms design §3.2): Lan typed `crucial` into the `vital` sentence.
describe('Alternative answer card', () => {
  const CRUCIAL = 'sense-crucial';
  const VITAL = 'sense-vital';
  const sleep = cloze({ item_id: 'it-a', prompt: { kind: 'cloze', sentence: 'Sleep is ___ for good health.' } });
  const rows = (over: Array<Record<string, unknown>> = []) => [
    { sense_id: CRUCIAL, lemma: 'crucial', meaning: 'quan trọng', role: 'typed', show_known: true, action: null, ...over[0] },
    { sense_id: VITAL, lemma: 'vital', meaning: 'thiết yếu', role: 'asked', show_known: false, action: null, ...over[1] },
  ];
  const alternative = (over: Record<string, unknown> = {}) => result({
    correct: { lemma: 'vital', text: 'vital', choice_index: null, is_true: null }, meaning: 'thiết yếu', definition_en: null,
    show_known: false, highlight_needs_review: false, translation: 'Giấc ngủ rất quan trọng cho sức khỏe.',
    alternative: { typed: 'crucial', rows: rows() }, ...over,
  });
  const nextQuestion = { state: 'question', session: view(), item: meaning };
  const open = async (reply: unknown = alternative(), over: Record<string, Route> = {}) => {
    const r = renderApp(<PracticeSession />, { routes: routes(sleep, {
      'POST /v1/practice/items/it-a/answer': () => Response.json(reply),
      'POST /v1/practice/items/it-a/review': () => Response.json({ action: 'known', item_id: 'it-a', sense_id: CRUCIAL, level: 2 }),
      [`POST /v1/practice/sessions/${SESSION}/next`]: () => Response.json(nextQuestion),
      ...over,
    }) });
    await screen.findByText('Sleep is ___ for good health.');
    await userEvent.type(screen.getByRole('textbox'), 'crucial');
    await userEvent.click(screen.getByRole('button', { name: /Kiểm tra/ }));
    await screen.findByText('vital · thiết yếu');
    return r;
  };

  it('CS2: shows the sentence with vital filled in, the reveal line and one row per word; no box title (owner, 07/11/2026)', async () => {
    await open();
    expect(screen.queryByText('Đáp án thay thế')).not.toBeInTheDocument();
    expect(screen.queryByText('Đúng rồi')).not.toBeInTheDocument();
    expect(screen.getByText('vital', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('vital', { selector: 'strong' }).parentElement).toHaveTextContent('Sleep is vital for good health.');
    expect(screen.getByText('vital · thiết yếu')).toBeInTheDocument();
    expect(screen.getByText('Giấc ngủ rất quan trọng cho sức khỏe.')).toBeInTheDocument();
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    // Each row names its role as its own label above the word (UI polish, 07/11/2026).
    expect(within(items[0]).getByText('Từ bạn gõ')).toBeInTheDocument();
    expect(within(items[0]).getByText('crucial')).toBeInTheDocument();
    expect(within(items[1]).getByText('Từ của câu này')).toBeInTheDocument();
    expect(within(items[1]).getByText('vital')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đã biết: crucial' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cần ôn lại: crucial' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cần ôn lại: vital' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đã biết: vital' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('crucial');
  });

  it('CS6: Đã biết on crucial posts known for crucial only and stays on the card', async () => {
    const r = await open();
    await userEvent.click(screen.getByRole('button', { name: 'Đã biết: crucial' }));
    await waitFor(() => expect(posts(r.calls, '/v1/practice/items/it-a/review')).toHaveLength(1));
    expect(posts(r.calls, '/v1/practice/items/it-a/review')[0].body).toEqual({ action: 'known', sense_id: CRUCIAL });
    expect(posts(r.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(0);
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    await waitFor(() => expect(within(items[0]).queryByRole('button')).not.toBeInTheDocument());
    expect(within(items[0]).getByText('Đã biết')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cần ôn lại: vital' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Câu tiếp' })).toBeInTheDocument();
  });

  it('each row is pressed on its own: both can be, and nothing moves on', async () => {
    const r = await open();
    await userEvent.click(screen.getByRole('button', { name: 'Cần ôn lại: vital' }));
    await waitFor(() => expect(within(within(screen.getByRole('list')).getAllByRole('listitem')[1]).queryByRole('button')).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Cần ôn lại: crucial' }));
    await waitFor(() => expect(posts(r.calls, '/v1/practice/items/it-a/review')).toHaveLength(2));
    expect(posts(r.calls, '/v1/practice/items/it-a/review').map((c) => c.body)).toEqual([
      { action: 'needs_review', sense_id: VITAL }, { action: 'needs_review', sense_id: CRUCIAL },
    ]);
    expect(posts(r.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(0);
  });

  it('a row already pressed in the reply shows its action instead of its buttons', async () => {
    await open(alternative({ alternative: { typed: 'crucial', rows: rows([{ action: 'needs_review', show_known: false }]) } }));
    const first = within(screen.getByRole('list')).getAllByRole('listitem')[0];
    expect(within(first).queryByRole('button')).not.toBeInTheDocument();
    expect(first).toHaveTextContent('Đã đưa vào ưu tiên');
  });

  it('CS5: Enter, 1 and 2 do nothing on this card', async () => {
    const r = await open();
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard('{Enter}1{Enter}2');
    expect(r.calls.filter((c) => c.method === 'POST' && /\/(review|next)$/.test(c.path))).toHaveLength(0);
    expect(screen.getByText('vital · thiết yếu')).toBeInTheDocument();
    // Focus left in the read-only answer field changes nothing either.
    screen.getByRole('textbox').focus();
    await userEvent.keyboard('{Enter}1{Enter}2');
    expect(r.calls.filter((c) => c.method === 'POST' && /\/(review|next)$/.test(c.path))).toHaveLength(0);
    expect(screen.queryByText('deployed', { selector: 'strong' })).not.toBeInTheDocument();
  });

  it('a button reached with Tab and pressed with Enter works', async () => {
    const r = await open();
    const next = screen.getByRole('button', { name: 'Câu tiếp' });
    next.focus();
    expect(next).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(posts(r.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(1));
    await screen.findByText('deployed', { selector: 'strong' });
  });

  it('the Câu tiếp button moves on without any review', async () => {
    const r = await open();
    await userEvent.click(screen.getByRole('button', { name: 'Câu tiếp' }));
    await waitFor(() => expect(posts(r.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(1));
    expect(posts(r.calls, '/v1/practice/items/it-a/review')).toHaveLength(0);
  });

  it('the result is announced as an alternative answer with the reveal line', async () => {
    await open();
    expect(document.querySelector('[data-live="result"]')).toHaveTextContent('Đáp án thay thế. vital · thiết yếu');
  });

  it('a plain right answer keeps today\'s card', async () => {
    renderApp(<PracticeSession />, { routes: routes(sleep, { 'POST /v1/practice/items/it-a/answer': () => Response.json(result({ alternative: null })) }) });
    await screen.findByText('Sleep is ___ for good health.');
    await userEvent.type(screen.getByRole('textbox'), 'vital');
    await userEvent.click(screen.getByRole('button', { name: /Kiểm tra/ }));
    expect(await screen.findByText('deploy · triển khai (phần mềm)')).toBeInTheDocument();
    expect(document.querySelector('[data-live="result"]')).toHaveTextContent('Đúng rồi. deploy · triển khai (phần mềm)');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('the English copy', async () => {
    renderApp(<PracticeSession />, { locale: 'en', routes: routes(sleep, { 'POST /v1/practice/items/it-a/answer': () => Response.json(alternative()) }) });
    await screen.findByText('Sleep is ___ for good health.');
    await userEvent.type(screen.getByRole('textbox'), 'crucial');
    await userEvent.click(screen.getByRole('button', { name: /Check/ }));
    expect(await screen.findByText('vital · thiết yếu')).toBeInTheDocument();
    expect(screen.queryByText('Alternative answer')).not.toBeInTheDocument();
    expect(document.querySelector('[data-live="result"]')).toHaveTextContent('Alternative answer. vital · thiết yếu');
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(within(items[0]).getByText('The word you typed')).toBeInTheDocument();
    expect(within(items[1]).getByText("This sentence's word")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Know: crucial' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Still learning: vital' })).toBeInTheDocument();
  });
});
