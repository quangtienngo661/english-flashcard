// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test-utils/render-app';
import { testRoute } from '@/test-utils/route-locale';
import type { Route } from '@/app-shell/session/test-support';
import { makeMe } from '@/app-shell/session/test-support';
import { PracticeSession } from './PracticeSession';

const hardReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: testRoute.locale }),
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
const base = { round: 1, position: 4, prompt_style: 'sentence', hint_level: 0, state: 'unanswered', tries: 0, reportable: true, private_word: false, ai: true };
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
/** The rows of the alternative card: the one list without a name (the key legend is named "Phím"). */
const altList = () => screen.getAllByRole('list').find((l) => !l.hasAttribute('aria-label'))!;
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
  it('K/78a cloze: "câu AI", the blank is the input; Enter sends the typed word and the word takes the blank (P.13)', async () => {
    const r = renderApp(<PracticeSession />, { session: true, routes: routes(cloze(), { 'POST /v1/practice/items/it-c/answer': () => Response.json(result()) }) });
    const blank = await screen.findByRole('textbox', { name: 'Missing word' });
    // The input sits inside the sentence, where the blank was.
    const sentence = screen.getByText('We use Docker to the app to the production server.');
    expect(sentence).toContainElement(blank);
    expect(screen.getByText('AI sentence')).toBeInTheDocument();
    expect(screen.getByText('Fill in the blank')).toBeInTheDocument();
    // QM9-9: the chip names the kind; the instruction line under it is gone.
    expect(screen.queryByText(/Type the missing word/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    await userEvent.type(blank, 'deploy{Enter}');
    await waitFor(() => expect(posts(r.calls, '/v1/practice/items/it-c/answer')[0]?.body).toEqual({ text: 'deploy' }));
    await screen.findByText('Right');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('We use Docker to the app to the production server.')).toHaveTextContent('We use Docker to deploy the app to the production server.');
  });

  it('P.13: a wrong typed word is struck in the sentence, the answer beside it', async () => {
    renderApp(<PracticeSession />, { session: true, routes: routes(cloze(), {
      'POST /v1/practice/items/it-c/answer': () => Response.json(result({ result: 'wrong', show_known: false, highlight_needs_review: true })),
    }) });
    await userEvent.type(await screen.findByRole('textbox', { name: 'Missing word' }), 'deplay{Enter}');
    await screen.findAllByText('Not quite');
    const sentence = screen.getByText('We use Docker to the app to the production server.');
    expect(within(sentence).getByRole('deletion')).toHaveTextContent('deplay');
    expect(sentence).toHaveTextContent('We use Docker to deplay deploy the app to the production server.');
    expect(within(sentence).queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('K/78a: [Xem đáp án] before any try skips the question', async () => {
    const r = renderApp(<PracticeSession />, { session: true, routes: routes(cloze(), { 'POST /v1/practice/items/it-c/skip': () => Response.json(result({ result: 'wrong', skipped: true, show_known: false, highlight_needs_review: true })) }) });
    await userEvent.click(await screen.findByRole('button', { name: 'Show answer' }));
    await waitFor(() => expect(posts(r.calls, '/v1/practice/items/it-c/skip')).toHaveLength(1));
  });

  it('A16: [Xem đáp án] gives case 4: Still learning is primary', async () => {
    const r = renderApp(<PracticeSession />, { session: true, routes: routes(cloze(), {
      'POST /v1/practice/items/it-c/skip': () => Response.json(result({ result: 'wrong', skipped: true, show_known: false, highlight_needs_review: true })),
      'POST /v1/practice/items/it-c/review': () => Response.json({ action: 'needs_review', item_id: 'it-c', level: 1 }),
      [`POST /v1/practice/sessions/${SESSION}/next`]: () => Response.json({ state: 'question', session: view(), item: meaning }),
    }) });
    await userEvent.click(await screen.findByRole('button', { name: 'Show answer' }));
    const primary = await screen.findByRole('button', { name: /Review again/ });
    expect(primary).toHaveTextContent(/^Review again$/);
    expect(screen.getByRole('button', { name: 'Next' })).toHaveTextContent(/^Next$/);
    expect(document.querySelector('button kbd')).toBeNull();
    expect(screen.queryByRole('button', { name: /Know/ })).not.toBeInTheDocument();
    await userEvent.keyboard('{Enter}');
    await screen.findByText('deployed', { selector: 'strong' });
    expect(posts(r.calls, '/v1/practice/items/it-c/review').map((c) => c.body)).toEqual([{ action: 'needs_review' }]);
    expect(posts(r.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(1);
  });

  it('K/78b meaning in sentence: the asked word is bold; key 1 chooses the first meaning', async () => {
    const r = renderApp(<PracticeSession />, { session: true, routes: routes(meaning, { 'POST /v1/practice/items/it-m/answer': () => Response.json(result()) }) });
    expect(await screen.findByText('deployed', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('Meaning in the sentence')).toBeInTheDocument();
    expect(screen.queryByText('What does the bold word mean here?')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^[1-4]/ }).map((b) => b.textContent)).toEqual(['1triển khai (phần mềm)', '2giao hàng', '3bảo vệ', '4trì hoãn']);
    await userEvent.keyboard('1');
    await waitFor(() => expect(posts(r.calls, '/v1/practice/items/it-m/answer')[0]?.body).toEqual({ choice: 0 }));
  });

  it('K/78c sentence MCQ: the "Sentence multiple choice" chip and the four words', async () => {
    renderApp(<PracticeSession />, { session: true, routes: routes(sentenceMcq) });
    expect(await screen.findByText('We ___ the app to the server yesterday.')).toBeInTheDocument();
    expect(screen.getByText('Sentence multiple choice')).toBeInTheDocument();
    expect(screen.queryByText('Choose the word that fills the gap')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^1deployed/ })).toBeInTheDocument();
  });

  it('F.14: a wrong sentence-MCQ pick is struck in the sentence, before the right word', async () => {
    renderApp(<PracticeSession />, { session: true, routes: routes(sentenceMcq, {
      'POST /v1/practice/items/it-s/answer': () => Response.json(result({
        result: 'wrong', show_known: false, highlight_needs_review: true, correct: { lemma: 'deploy', text: 'deployed', choice_index: 0, is_true: null },
      })),
    }) });
    await screen.findByText('We ___ the app to the server yesterday.');
    await userEvent.keyboard('4');
    await screen.findAllByText('Not quite');
    const sentence = screen.getByText('We the app to the server yesterday.');
    expect(within(sentence).getByRole('deletion')).toHaveTextContent('delayed');
    expect(sentence).toHaveTextContent('We delayed deployed the app to the server yesterday.');
  });

  it('F.14: a right sentence-MCQ pick fills the blank with no struck word', async () => {
    renderApp(<PracticeSession />, { session: true, routes: routes(sentenceMcq, {
      'POST /v1/practice/items/it-s/answer': () => Response.json(result({ correct: { lemma: 'deploy', text: 'deployed', choice_index: 0, is_true: null } })),
    }) });
    await screen.findByText('We ___ the app to the server yesterday.');
    await userEvent.keyboard('1');
    await screen.findByText('Right');
    const sentence = screen.getByText('We the app to the server yesterday.');
    expect(within(sentence).queryByRole('deletion')).not.toBeInTheDocument();
    expect(sentence).toHaveTextContent('We deployed the app to the server yesterday.');
  });

  it('copy doc §15 row 10: [Gợi ý] opens hint 1 in the numbered list with progress, then [Mở gợi ý 2]', async () => {
    renderApp(<PracticeSession />, { session: true, routes: routes(cloze(), {
      'POST /v1/practice/items/it-c/hint': () => Response.json({ level: 1, hint: { kind: 'first_letter', text: 'd' } }),
    }) });
    await screen.findByRole('textbox', { name: 'Missing word' });
    // The cloze field has the focus, so H types a letter there; the button opens the hint.
    await userEvent.click(screen.getByRole('button', { name: /^Hint/ }));
    expect(await screen.findByText('d___')).toBeInTheDocument();
    // Mockup L352-361: one row per hint (number, name, content); "Show hint 2" sits in the second row's content.
    const box = screen.getByRole('region', { name: 'Hint 1 of 3' });
    const rows = within(box).getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText('First letter')).toBeInTheDocument();
    expect(within(rows[0]).getByText('d___')).toBeInTheDocument();
    expect(within(rows[1]).getByRole('button', { name: /Show hint 2/ })).toBeInTheDocument();
  });

  it('CS20: hint 1 of a cloze shows the first letter and three underscores, whatever the length of the word', async () => {
    renderApp(<PracticeSession />, { session: true, routes: routes(cloze(), {
      'POST /v1/practice/items/it-c/hint': () => Response.json({ level: 1, hint: { kind: 'first_letter', text: 'c' } }),
    }) });
    await screen.findByRole('textbox', { name: 'Missing word' });
    await userEvent.click(screen.getByRole('button', { name: /^Hint/ }));
    expect(await screen.findByText('c___')).toBeInTheDocument();
    expect(screen.queryByText('c')).not.toBeInTheDocument();
  });

  it('F.13: a legacy hint {first_letter, length} shows l___ to the eye and l… · 4 letters to a screen reader', async () => {
    renderApp(<PracticeSession />, { session: true, routes: routes(cloze(), {
      'POST /v1/practice/items/it-c/hint': () => Response.json({ level: 1, hint: { first_letter: 'l', length: 4 } }),
    }) });
    await screen.findByRole('textbox', { name: 'Missing word' });
    await userEvent.click(screen.getByRole('button', { name: /^Hint/ }));
    expect(await screen.findByText('l___')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('l… · 4 letters')).not.toHaveAttribute('aria-hidden');
  });

  it('F.13: a legacy hint of length 1 shows only the letter', async () => {
    renderApp(<PracticeSession />, { session: true, routes: routes(cloze(), {
      'POST /v1/practice/items/it-c/hint': () => Response.json({ level: 1, hint: { first_letter: 'a', length: 1 } }),
    }) });
    await screen.findByRole('textbox', { name: 'Missing word' });
    await userEvent.click(screen.getByRole('button', { name: /^Hint/ }));
    expect(await screen.findByText('a', { selector: '[aria-hidden="true"]' })).toBeInTheDocument();
    expect(screen.queryByText('a_')).not.toBeInTheDocument();
  });

  it('a hint that is not a first letter is shown as the API sends it', async () => {
    renderApp(<PracticeSession />, { session: true, routes: routes(cloze({ hint_level: 2 }), {
      'POST /v1/practice/items/it-c/hint': (call) => Response.json((call.body as { level: number }).level === 1
        ? { level: 1, hint: { kind: 'first_letter', text: 'c' } } : { level: 2, hint: { kind: 'definition', text: 'very important' } }),
    }) });
    await screen.findByRole('textbox', { name: 'Missing word' });
    expect(await screen.findByText('very important')).toBeInTheDocument();
    expect(await screen.findByText('c___')).toBeInTheDocument();
  });

  describe('a try-again says why (session synonyms design §3.1)', () => {
    const typeAndCheck = async (reply: unknown) => {
      renderApp(<PracticeSession />, { session: true, routes: routes(cloze(), { 'POST /v1/practice/items/it-c/answer': () => Response.json(reply) }) });
      await userEvent.type(await screen.findByRole('textbox', { name: 'Missing word' }), 'habit{Enter}');
    };

    it('CS3: a session-word try-again says only "Chưa đúng": no line under it, not the spelling text (owner, 07/11/2026)', async () => {
      await typeAndCheck({ result: 'try_again', tries: 1, reason: 'session_word' });
      // Once on the page and once in the live region for screen readers.
      expect(await screen.findAllByText('Not quite')).toHaveLength(2);
      expect(screen.queryByText(/another word from this session/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Check the spelling/)).not.toBeInTheDocument();
      expect(document.querySelector('[data-live="result"]')).toHaveTextContent(/^Not quite$/);
    });

    it('CS4: a try-again with reason null keeps the spelling text', async () => {
      await typeAndCheck({ result: 'try_again', tries: 1, reason: null });
      expect(await screen.findByText(/Check the spelling and try again/)).toBeInTheDocument();
      // F.14: the wrong ticket with no answer; the footer reads reveal, Hint, Try again.
      const panel = screen.getByText(/Check the spelling/).closest<HTMLElement>('[data-feedback]')!;
      expect(panel).toHaveTextContent(/^Not quite\s*Check the spelling and try again\. The answer stays hidden\.\s*A right answer on a retry/);
      expect(panel).not.toHaveTextContent('deploy');
      expect(within(panel).getAllByRole('button').map((b) => b.textContent)).toEqual(['Show answer', 'Hint', 'Try again']);
      expect(screen.queryByText(/another word from this session/)).not.toBeInTheDocument();
    });

    it('CS4: an older API sends no reason: the spelling text', async () => {
      await typeAndCheck({ result: 'try_again', tries: 1 });
      expect(await screen.findByText(/Check the spelling and try again/)).toBeInTheDocument();
    });

    it('the English copy', async () => {
      renderApp(<PracticeSession />, { session: true, locale: 'en', routes: routes(cloze(), {
        'POST /v1/practice/items/it-c/answer': () => Response.json({ result: 'try_again', tries: 1, reason: 'session_word' }),
      }) });
      await userEvent.type(await screen.findByRole('textbox', { name: 'Missing word' }), 'habit{Enter}');
      expect(await screen.findAllByText('Not quite')).toHaveLength(2);
      expect(screen.queryByText(/another word from this session/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Check the spelling/)).not.toBeInTheDocument();
    });
  });

  it('K/79a, P.13: a Vietnamese route shows the "AI translation" block under the sentence, inside the question card', async () => {
    renderApp(<PracticeSession />, { session: true, routes: routes(meaning, { 'POST /v1/practice/items/it-m/answer': () => Response.json(result()) }) });
    const card = (await screen.findByText('deployed', { selector: 'strong' })).closest('section')!;
    expect(screen.queryByRole('region', { name: 'AI translation' })).not.toBeInTheDocument();
    await userEvent.keyboard('1');
    const block = await within(card).findByRole('region', { name: 'AI translation' });
    expect(within(block).getByText('AI translation')).toBeInTheDocument();
    expect(within(block).getByText('Chúng tôi dùng Docker để triển khai ứng dụng lên máy chủ chính thức.')).toBeInTheDocument();
    expect(screen.getAllByText('Chúng tôi dùng Docker để triển khai ứng dụng lên máy chủ chính thức.')).toHaveLength(1);
  });

  it('E41: an English learner has no translation block', async () => {
    renderApp(<PracticeSession />, {
      session: true,
      locale: 'en', me: makeMe({ native_language: 'en' }),
      routes: routes(meaning, { 'POST /v1/practice/items/it-m/answer': () => Response.json(result()) }),
    });
    await screen.findByText('deployed', { selector: 'strong' });
    await userEvent.keyboard('1');
    await screen.findByText('Right');
    expect(screen.queryByText(/Chúng tôi dùng Docker/)).toBeNull();
    expect(screen.queryByRole('region', { name: 'AI translation' })).toBeNull();
  });

  it('K/80: an AI question reports with the AI reasons and the credit line', async () => {
    const r = renderApp(<PracticeSession />, { session: true, routes: routes(sentenceMcq, { 'POST /v1/practice/items/it-s/report': () => Response.json({ id: 'r1' }, { status: 201 }) }) });
    await screen.findByText('We ___ the app to the server yesterday.');
    await userEvent.click(screen.getByRole('button', { name: 'Report' }));
    const dialog = await screen.findByRole('dialog', { name: 'Report this question' });
    expect(within(dialog).getAllByRole('radio').map((x) => x.closest('label')?.textContent)).toEqual(['Nghĩa sai', 'Câu sai ngữ pháp hoặc không tự nhiên', 'Khác']);
    expect(within(dialog).getByText(/If AI wrote the question wrong, you get 1 AI credit back\./)).toBeInTheDocument();
    expect(within(dialog).queryByText(/The Wordmet team will see/)).toBeNull();
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Nghĩa sai' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send report' }));
    await waitFor(() => expect(posts(r.calls, '/v1/practice/items/it-s/report')).toHaveLength(1));
  });

  it('K/81 (D12): a question about the learner\'s own word has no consent box, says the team will see the word, sends no share_private_word', async () => {
    const own = { ...sentenceMcq, private_word: true };
    const r = renderApp(<PracticeSession />, { session: true, routes: routes(own, {
      'POST /v1/practice/items/it-s/answer': () => Response.json(result({ correct: { lemma: 'rizz', text: 'rizz', choice_index: 0, is_true: null } })),
      'POST /v1/practice/items/it-s/report': () => Response.json({ id: 'r1' }, { status: 201 }),
    }) });
    await screen.findByText('We ___ the app to the server yesterday.');
    await userEvent.keyboard('1');
    await screen.findByText('Right');
    await userEvent.click(screen.getByRole('button', { name: 'Report' }));
    const dialog = await screen.findByRole('dialog', { name: 'Report this question' });
    expect(within(dialog).getByText('The Wordmet team will see “rizz”, a word you added, to check it.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('checkbox')).toBeNull();
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Nghĩa sai' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send report' }));
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
    const r = renderApp(<PracticeSession />, { session: true, routes: routes(sleep, {
      'POST /v1/practice/items/it-a/answer': () => Response.json(reply),
      'POST /v1/practice/items/it-a/review': () => Response.json({ action: 'known', item_id: 'it-a', sense_id: CRUCIAL, level: 2 }),
      [`POST /v1/practice/sessions/${SESSION}/next`]: () => Response.json(nextQuestion),
      ...over,
    }) });
    await userEvent.type(await screen.findByRole('textbox', { name: 'Missing word' }), 'crucial{Enter}');
    await screen.findByText('Alternative answer');
    return r;
  };

  it('CS2: shows "Đáp án thay thế", the sentence with vital filled in, the reveal line and one row per word', async () => {
    await open();
    expect(screen.queryByText('Right')).not.toBeInTheDocument();
    expect(screen.getByText('vital', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('vital', { selector: 'strong' }).parentElement).toHaveTextContent('Sleep is vital for good health.');
    expect(screen.getByText('vital · thiết yếu')).toBeInTheDocument();
    expect(screen.getByText('Giấc ngủ rất quan trọng cho sức khỏe.')).toBeInTheDocument();
    const items = within(altList()).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    // Each row names its role as its own label above the word (UI polish, 07/11/2026).
    expect(within(items[0]).getByText('The word you typed')).toBeInTheDocument();
    expect(within(items[0]).getByText('crucial')).toBeInTheDocument();
    expect(within(items[1]).getByText("This sentence's word")).toBeInTheDocument();
    expect(within(items[1]).getByText('vital')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Know: crucial' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review again: crucial' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review again: vital' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Know: vital' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('crucial');
  });

  it('CS6: Know on crucial posts known for crucial only and stays on the card', async () => {
    const r = await open();
    await userEvent.click(screen.getByRole('button', { name: 'Know: crucial' }));
    await waitFor(() => expect(posts(r.calls, '/v1/practice/items/it-a/review')).toHaveLength(1));
    expect(posts(r.calls, '/v1/practice/items/it-a/review')[0].body).toEqual({ action: 'known', sense_id: CRUCIAL });
    expect(posts(r.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(0);
    const items = within(altList()).getAllByRole('listitem');
    await waitFor(() => expect(within(items[0]).queryByRole('button')).not.toBeInTheDocument());
    expect(within(items[0]).getByText('Know')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review again: vital' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });

  it('each row is pressed on its own: both can be, and nothing moves on', async () => {
    const r = await open();
    await userEvent.click(screen.getByRole('button', { name: 'Review again: vital' }));
    await waitFor(() => expect(within(within(altList()).getAllByRole('listitem')[1]).queryByRole('button')).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Review again: crucial' }));
    await waitFor(() => expect(posts(r.calls, '/v1/practice/items/it-a/review')).toHaveLength(2));
    expect(posts(r.calls, '/v1/practice/items/it-a/review').map((c) => c.body)).toEqual([
      { action: 'needs_review', sense_id: VITAL }, { action: 'needs_review', sense_id: CRUCIAL },
    ]);
    expect(posts(r.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(0);
  });

  it('a row already pressed in the reply shows its action instead of its buttons', async () => {
    await open(alternative({ alternative: { typed: 'crucial', rows: rows([{ action: 'needs_review', show_known: false }]) } }));
    const first = within(altList()).getAllByRole('listitem')[0];
    expect(within(first).queryByRole('button')).not.toBeInTheDocument();
    expect(first).toHaveTextContent('Added to priority');
  });

  it('CS5: Enter, 1 and 2 do nothing on this card', async () => {
    const r = await open();
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard('{Enter}1{Enter}2');
    expect(r.calls.filter((c) => c.method === 'POST' && /\/(review|next)$/.test(c.path))).toHaveLength(0);
    expect(screen.getByText('Alternative answer')).toBeInTheDocument();
    // Focus left in the read-only answer field changes nothing either.
    screen.getByRole('textbox').focus();
    await userEvent.keyboard('{Enter}1{Enter}2');
    expect(r.calls.filter((c) => c.method === 'POST' && /\/(review|next)$/.test(c.path))).toHaveLength(0);
    expect(screen.queryByText('deployed', { selector: 'strong' })).not.toBeInTheDocument();
  });

  it('a button reached with Tab and pressed with Enter works', async () => {
    const r = await open();
    const next = screen.getByRole('button', { name: 'Next' });
    next.focus();
    expect(next).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(posts(r.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(1));
    await screen.findByText('deployed', { selector: 'strong' });
  });

  it('the Next button moves on without any review', async () => {
    const r = await open();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(posts(r.calls, `/v1/practice/sessions/${SESSION}/next`)).toHaveLength(1));
    expect(posts(r.calls, '/v1/practice/items/it-a/review')).toHaveLength(0);
  });

  it('the result is announced as an alternative answer with the reveal line', async () => {
    await open();
    expect(document.querySelector('[data-live="result"]')).toHaveTextContent('Alternative answer. vital · thiết yếu');
  });

  it('a plain right answer keeps today\'s card', async () => {
    renderApp(<PracticeSession />, { session: true, routes: routes(sleep, { 'POST /v1/practice/items/it-a/answer': () => Response.json(result({ alternative: null })) }) });
    await userEvent.type(await screen.findByRole('textbox', { name: 'Missing word' }), 'vital{Enter}');
    expect(await screen.findByText('Right')).toBeInTheDocument();
    expect(screen.queryByText('Alternative answer')).not.toBeInTheDocument();
    expect(screen.queryByText('The word you typed')).not.toBeInTheDocument();
  });

  it('the English copy', async () => {
    renderApp(<PracticeSession />, { session: true, locale: 'en', routes: routes(sleep, { 'POST /v1/practice/items/it-a/answer': () => Response.json(alternative()) }) });
    await userEvent.type(await screen.findByRole('textbox', { name: 'Missing word' }), 'crucial{Enter}');
    expect(await screen.findByText('Alternative answer')).toBeInTheDocument();
    const items = within(altList()).getAllByRole('listitem');
    expect(within(items[0]).getByText('The word you typed')).toBeInTheDocument();
    expect(within(items[1]).getByText("This sentence's word")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Know: crucial' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review again: vital' })).toBeInTheDocument();
  });
});
