import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { SETTINGS_DEFAULTS } from '../../settings/settings.definitions.js';
import type { AnswerKey } from '../practice.types.js';
import { RealJudgeService } from './real-judge.service.js';
import type { RealJudgeFilters } from './real-judge.types.js';
import type { RealQuestionRow } from './real-questions.js';

const NOW = new Date('2026-11-08T03:00:00.000Z');
const ADMIN = 'a0000000-0000-4000-8000-000000000001';
const JUDGE = 'b0000000-0000-4000-8000-000000000001';
const R2 = 'c0000000-0000-4000-8000-000000000002';
const FILTERS: RealJudgeFilters = { judge_id: JUDGE, operation: 'generate_cloze', config: null, test_accounts_only: false };

const DATA = (word: string) => ({ word, part_of_speech: 'verb', level: 'B1', meaning_vi: 'x', context_label: null });
const KEY = (optionPrivate = false): AnswerKey => ({
  kind: 'mcq', correct_index: 0, option_private: [false, optionPrivate, false, false], reveal: { lemma: 'beat', meaning: 'đánh', definition_en: null }, asked_private: false,
});
const row = (id: string, over: Partial<RealQuestionRow> & { call?: string | null; data?: unknown } = {}): RealQuestionRow => {
  const { call, data, ...rest } = over;
  return {
    id, userId: `user-${id}`, senseId: `sense-${id}`, createdAt: new Date(NOW.getTime() - 1000),
    aiMeta: { operation: 'generate_cloze', provider: 'fake', model: 'fake:ok', prompt_revision: 4, ...(call === null ? {} : { call_operation_id: call ?? `r${id.slice(1)}` }) },
    answerKey: KEY(), aiInput: { senseRevisionId: 'rev', contentKey: null, type: 'cloze', data: (data ?? DATA(`word-${id}`)) as never },
    sessionSenseIds: [`sense-${id}`], ...rest,
  };
};
const OUT = (word: string) => JSON.stringify({ sentence: `We ___ ${word}.`, accepted_answers: [word], translation_vi: 'y' });

/** Newest first: q1 ok, q2 private option, q3 no stored input, q4 judged already, q5 made by the second call, q6 content gone, q7 an answer that is not JSON. */
const WINDOW = (): RealQuestionRow[] => [
  row('q1', { sessionSenseIds: ['sense-q1', 'sense-mate'] }),
  row('q2', { answerKey: KEY(true) }),
  row('q3', { aiInput: null }),
  row('q4'),
  row('q5', { call: 'r5#2' }),
  row('q6'),
  row('q7'),
];

function setup(init: {
  rows?: RealQuestionRow[]; limit?: number; retention?: number; staff?: string[]; judgeOperations?: string[]; judgeActive?: boolean; target?: unknown;
  contents?: Record<string, string | null>; judged?: string[]; cost?: number | null; pairs?: unknown[]; usdCap?: number | null;
  passList?: unknown; passDetail?: unknown; existing?: Map<string, unknown>;
} = {}) {
  const settings = { ...SETTINGS_DEFAULTS, ai: { ...SETTINGS_DEFAULTS.ai, realJudgeLimit: init.limit ?? 3, contentRetentionDays: init.retention ?? 7, adminDailyUsdCap: init.usdCap === undefined ? 2 : init.usdCap } };
  const contents = init.contents ?? { r1: OUT('word-q1'), 'r5#2': OUT('word-q5'), r7: 'nope' };
  const ai = {
    realJudgeTarget: vi.fn(async (_judgeId: string): Promise<unknown> => (init.target === undefined
      ? { judgeId: JUDGE, name: 'Chỉ một đáp án', operations: init.judgeOperations ?? ['generate_cloze'], active: init.judgeActive ?? true, revisionId: R2, revision: 2 } : init.target)),
    judgeCostPerSubject: vi.fn(async (_revisionId: string): Promise<number | null> => (init.cost === undefined ? 0.0004 : init.cost)),
    judgedSubjects: vi.fn(async (_revisionId: string, ids: string[]) => new Set(ids.filter((id) => (init.judged ?? ['q4']).includes(id)))),
    callContents: vi.fn(async (ids: string[]) => new Map(ids.filter((id) => id in contents).map((id) => [id, { request: {}, response: contents[id]! }]))),
    startJudgePass: vi.fn(async (_args: unknown) => ({ passId: 'pass-1' })),
    realJudgePasses: vi.fn(async (_size: number, _token?: string): Promise<unknown> => init.passList ?? { items: [], next_page_token: null }),
    realJudgePass: vi.fn(async (_id: string): Promise<unknown> => (init.passDetail === undefined ? null : init.passDetail)),
  };
  const identity = {
    staffUserIds: vi.fn(async (): Promise<string[]> => init.staff ?? ['e1']),
    emailsOf: vi.fn(async (ids: string[]) => new Map(ids.filter((id) => id === 'a1').map((id) => [id, 'admin@x.test']))),
  };
  const content = {
    practiceCandidates: vi.fn(async (_viewer: string, ids: string[], _language: string) => new Map(ids.filter((id) => id === 'sense-mate').map((id) => [id, { lemma: 'beat', scope: 'catalog' }]))),
  };
  const repo = {
    window: vi.fn(async (_args: unknown) => init.rows ?? WINDOW()),
    pairs: vi.fn(async (_args: unknown) => init.pairs ?? [{ config_number: 4, model: 'fake:ok', questions: 7 }]),
    questions: vi.fn(async (_ids: string[]) => init.existing ?? new Map()),
  };
  const service = new RealJudgeService(
    ai as never, identity as never, content as never, { get: async () => settings } as never, repo as never, new FakeClock(NOW),
  );
  return { service, ai, identity, content, repo };
}

async function problemOf(promise: Promise<unknown>) {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ProblemDetailsException);
  const problem = error as ProblemDetailsException;
  return { status: problem.getStatus(), type: problem.problemType, extensions: problem.extensions ?? {} };
}

describe('RealJudgeService.estimate (design §7.1, B38)', () => {
  it('reads the window of 7 days, leaves out private, unreadable and judged questions, and counts them', async () => {
    const { service, ai, repo, content } = setup();
    const estimate = await service.estimate(ADMIN, FILTERS);
    expect(repo.window).toHaveBeenCalledExactlyOnceWith({ since: new Date('2026-11-01T03:00:00.000Z'), operation: 'generate_cloze', config: null, userIds: null });
    // The rows that can be judged at all: not private, with their stored input.
    expect(ai.judgedSubjects).toHaveBeenCalledExactlyOnceWith(R2, ['q1', 'q4', 'q5', 'q6', 'q7']);
    // The call ids in chunks of the limit (3): the second call of q5 is the one whose content is judged.
    expect(ai.callContents.mock.calls).toEqual([[['r1', 'r5#2', 'r6']], [['r7']]]);
    expect(estimate).toEqual({
      judge_revision: 2, selected: 2, remaining: 0, limit: 3, skipped: { private_word: 1, no_content: 3, already_judged: 1 },
      estimate_usd: 0.0008, admin_usd_cap: 2, reason: null, retention_days: 7, pairs: [{ config_number: 4, model: 'fake:ok', questions: 7 }],
    });
    expect(content.practiceCandidates).not.toHaveBeenCalled();
  });

  it('no pass of this revision has a cost yet → estimate_usd null ("chưa ước tính được")', async () => {
    const { service } = setup({ cost: null });
    expect((await service.estimate(ADMIN, FILTERS)).estimate_usd).toBeNull();
  });

  it('a limit reached early: the rest of the eligible questions are counted as remaining and not read', async () => {
    const { service, ai } = setup({ limit: 1 });
    const estimate = await service.estimate(ADMIN, FILTERS);
    expect(ai.callContents.mock.calls).toEqual([[['r1']]]);
    expect(estimate).toMatchObject({ selected: 1, remaining: 3, limit: 1, estimate_usd: 0.0004, skipped: { private_word: 1, no_content: 1, already_judged: 1 } });
  });

  it('a question whose meta has no call id has no content to judge', async () => {
    const { service, ai } = setup({ rows: [row('q1', { call: null }), row('q2')], contents: { r2: OUT('word-q2') } });
    const estimate = await service.estimate(ADMIN, FILTERS);
    expect(ai.callContents.mock.calls).toEqual([[['r2']]]);
    expect(estimate).toMatchObject({ selected: 1, skipped: { no_content: 1 } });
  });

  it('a content kept without a response is no content either', async () => {
    const { service } = setup({ rows: [row('q1')], contents: { r1: null } });
    expect(await service.estimate(ADMIN, FILTERS)).toMatchObject({ selected: 0, skipped: { no_content: 1 } });
  });

  it('the config pair and the test accounts narrow the window; the pairs of the window come back for the picker', async () => {
    const { service, repo } = setup();
    const filters: RealJudgeFilters = { ...FILTERS, config: { number: 4, model: 'fake:ok' }, test_accounts_only: true };
    await service.estimate(ADMIN, filters);
    expect(repo.window).toHaveBeenCalledWith(expect.objectContaining({ config: { number: 4, model: 'fake:ok' }, userIds: ['e1'] }));
    expect(repo.pairs).toHaveBeenCalledExactlyOnceWith({ since: new Date('2026-11-01T03:00:00.000Z'), operation: 'generate_cloze', userIds: ['e1'] });
  });

  it('B38: content_retention_days 0 → nothing is read: selected 0, reason retention-off', async () => {
    const { service, repo, ai } = setup({ retention: 0 });
    expect(await service.estimate(ADMIN, FILTERS)).toEqual({
      judge_revision: 2, selected: 0, remaining: 0, limit: 3, skipped: { private_word: 0, no_content: 0, already_judged: 0 }, estimate_usd: null,
      admin_usd_cap: 2, reason: 'retention-off', retention_days: 0, pairs: [],
    });
    expect(repo.window).not.toHaveBeenCalled();
    expect(ai.callContents).not.toHaveBeenCalled();
  });

  it('B40: only test accounts and no staff account → no read, no AI call, reason no-staff', async () => {
    const { service, repo, ai } = setup({ staff: [] });
    const estimate = await service.estimate(ADMIN, { ...FILTERS, test_accounts_only: true });
    expect(estimate).toMatchObject({ selected: 0, reason: 'no-staff', pairs: [] });
    expect(repo.window).not.toHaveBeenCalled();
    expect(ai.judgedSubjects).not.toHaveBeenCalled();
    expect(ai.callContents).not.toHaveBeenCalled();
    expect(ai.startJudgePass).not.toHaveBeenCalled();
  });

  it('the staff list is not asked for when the filter is off', async () => {
    const { service, identity } = setup();
    await service.estimate(ADMIN, FILTERS);
    expect(identity.staffUserIds).not.toHaveBeenCalled();
  });

  it('an unknown judge → 404 not-found', async () => {
    expect(await problemOf(setup({ target: null }).service.estimate(ADMIN, FILTERS))).toMatchObject({ status: 404, type: 'not-found' });
  });

  it('an operation the judge does not score → 400 with the violation; an inactive judge → 400', async () => {
    const { service } = setup({ judgeOperations: ['generate_cloze'] });
    expect(await problemOf(service.estimate(ADMIN, { ...FILTERS, operation: 'generate_meaning_question' })))
      .toMatchObject({ status: 400, type: 'validation-failed', extensions: { violations: ['operation: not judged by this judge'] } });
    expect(await problemOf(setup({ judgeActive: false }).service.estimate(ADMIN, FILTERS)))
      .toMatchObject({ status: 400, type: 'validation-failed', extensions: { violations: ['judge_id: judge is not active'] } });
  });
});

describe('RealJudgeService.start (B40, Review focus 2 and 3)', () => {
  it('hands the pass the chosen questions as snapshots: the stored input, the output of the call that made the question, the session words of the catalog', async () => {
    const { service, ai, content } = setup();
    await expect(service.start(ADMIN, FILTERS)).resolves.toEqual({ pass_id: 'pass-1', selected: 2, skipped: { private_word: 1, no_content: 3, already_judged: 1 } });
    expect(content.practiceCandidates).toHaveBeenCalledExactlyOnceWith(ADMIN, ['sense-q1', 'sense-mate', 'sense-q5'], 'vi');
    expect(ai.startJudgePass).toHaveBeenCalledExactlyOnceWith({
      judgeId: JUDGE, kind: 'real', actorId: ADMIN,
      filters: {
        operation: 'generate_cloze', config: null, test_accounts_only: false, limit: 3, since: '2026-11-01T03:00:00.000Z',
        skipped: { private_word: 1, no_content: 3, already_judged: 1 },
      },
      subjects: [
        { subjectId: 'q1', input: DATA('word-q1'), output: JSON.parse(OUT('word-q1')), context: { session_words: ['beat'] } },
        // Review focus 2: the second call's content, not the answer Practice's rules rejected.
        { subjectId: 'q5', input: DATA('word-q5'), output: JSON.parse(OUT('word-q5')), context: { session_words: [] } },
      ],
    });
  });

  it('carries the config pair and the test-account switch in the filters of the pass', async () => {
    const { service, ai } = setup();
    await service.start(ADMIN, { ...FILTERS, config: { number: 4, model: 'fake:ok' }, test_accounts_only: true });
    expect(ai.startJudgePass).toHaveBeenCalledWith(expect.objectContaining({ filters: expect.objectContaining({ config: { number: 4, model: 'fake:ok' }, test_accounts_only: true }) }));
  });

  it('B38: retention 0 → 409 nothing-to-judge (retention-off), no AI call', async () => {
    const { service, ai } = setup({ retention: 0 });
    expect(await problemOf(service.start(ADMIN, FILTERS))).toMatchObject({ status: 409, type: 'nothing-to-judge', extensions: { reason: 'retention-off' } });
    expect(ai.startJudgePass).not.toHaveBeenCalled();
  });

  it('B40: only test accounts and no staff → 409 nothing-to-judge (no-staff), no AI call', async () => {
    const { service, ai, repo } = setup({ staff: [] });
    expect(await problemOf(service.start(ADMIN, { ...FILTERS, test_accounts_only: true }))).toMatchObject({ status: 409, type: 'nothing-to-judge', extensions: { reason: 'no-staff' } });
    expect(repo.window).not.toHaveBeenCalled();
    expect(ai.startJudgePass).not.toHaveBeenCalled();
  });

  it('every question already judged or unusable → 409 nothing-to-judge (empty) with what was skipped', async () => {
    const { service, ai } = setup({ rows: [row('q1'), row('q2', { answerKey: KEY(true) })], contents: {} });
    expect(await problemOf(service.start(ADMIN, FILTERS))).toMatchObject({
      status: 409, type: 'nothing-to-judge', extensions: { reason: 'empty', skipped: { private_word: 1, no_content: 1, already_judged: 0 } },
    });
    expect(ai.startJudgePass).not.toHaveBeenCalled();
  });

  it('Review focus 3: the test accounts and the retention are read again by start, not taken from the estimate', async () => {
    const { service, identity, ai, repo } = setup();
    identity.staffUserIds.mockResolvedValueOnce(['e1']).mockResolvedValueOnce([]);
    expect(await service.estimate(ADMIN, { ...FILTERS, test_accounts_only: true })).toMatchObject({ selected: 2 });
    expect(await problemOf(service.start(ADMIN, { ...FILTERS, test_accounts_only: true }))).toMatchObject({ type: 'nothing-to-judge', extensions: { reason: 'no-staff' } });
    expect(identity.staffUserIds).toHaveBeenCalledTimes(2);
    expect(repo.window).toHaveBeenCalledTimes(1);
    expect(ai.startJudgePass).not.toHaveBeenCalled();
  });

  it('Review focus 3: retention 7 at the estimate and 0 at start → retention-off', async () => {
    const first = setup();
    const settings = { ...SETTINGS_DEFAULTS, ai: { ...SETTINGS_DEFAULTS.ai, realJudgeLimit: 3, contentRetentionDays: 7 } };
    let current = settings;
    const service = new RealJudgeService(
      first.ai as never, first.identity as never, first.content as never, { get: async () => current } as never, first.repo as never, new FakeClock(NOW),
    );
    expect(await service.estimate(ADMIN, FILTERS)).toMatchObject({ selected: 2 });
    current = { ...settings, ai: { ...settings.ai, contentRetentionDays: 0 } };
    expect(await problemOf(service.start(ADMIN, FILTERS))).toMatchObject({ type: 'nothing-to-judge', extensions: { reason: 'retention-off' } });
  });

  it('an unknown judge → 404; an operation the judge does not score → 400; no pass is started', async () => {
    const unknown = setup({ target: null });
    expect(await problemOf(unknown.service.start(ADMIN, FILTERS))).toMatchObject({ status: 404 });
    const other = setup({ judgeOperations: ['generate_cloze'] });
    expect(await problemOf(other.service.start(ADMIN, { ...FILTERS, operation: 'generate_sentence_mcq' }))).toMatchObject({ status: 400 });
    expect(unknown.ai.startJudgePass).not.toHaveBeenCalled();
    expect(other.ai.startJudgePass).not.toHaveBeenCalled();
  });

  it('a pass of this revision already going: the 409 judge-pass-running of the gateway reaches the caller unchanged', async () => {
    const { service, ai } = setup();
    const refusal = new ProblemDetailsException({ status: 409, type: 'judge-pass-running', title: 'running' });
    ai.startJudgePass.mockRejectedValueOnce(refusal);
    await expect(service.start(ADMIN, FILTERS)).rejects.toBe(refusal);
  });
});

const PASS_VIEW = {
  id: 'p1', judge: { id: JUDGE, name: 'Chỉ một đáp án' }, revision: 2, revision_id: R2, criteria: [{ code: 'single_answer', question: 'Q' }], judge_model: null,
  status: 'finished', error: null, total: 2, judged: 2, cost_usd: '0.00080000', filters: { operation: 'generate_cloze' }, started_by: 'a1',
  created_at: NOW.toISOString(), finished_at: NOW.toISOString(),
};
const ITEM = (id: string, verdict: string | null) => ({
  subject_id: id, input: DATA(id), output: { sentence: 'x' }, context: { session_words: [] },
  scores: [{ criterion: 'single_answer', verdict, problem: null, reason: verdict === 'fail_major' ? 'Từ "beat" cũng điền vừa.' : null }], labels: [],
});

describe('RealJudgeService.passes and passItems (design §7.1 "Kết quả")', () => {
  it('the passes with the address of whoever started each, from one lookup', async () => {
    const { service, ai, identity } = setup({ passList: { items: [PASS_VIEW], next_page_token: 'next' } });
    const page = await service.passes(20);
    expect(ai.realJudgePasses).toHaveBeenCalledExactlyOnceWith(20, undefined);
    expect(identity.emailsOf).toHaveBeenCalledExactlyOnceWith(['a1']);
    expect(page).toEqual({ items: [{ ...PASS_VIEW, started_by_user: { id: 'a1', email: 'admin@x.test', system: false } }], next_page_token: 'next' });
    await service.passes(5, 'tok');
    expect(ai.realJudgePasses).toHaveBeenLastCalledWith(5, 'tok');
  });

  it('a pass that is unknown or not a real pass → 404 not-found', async () => {
    expect(await problemOf(setup({ passDetail: null }).service.passItems('nope'))).toMatchObject({ status: 404, type: 'not-found' });
  });

  it('Review focus 5: a failed question still there can be added to the examples; one deleted since is listed from its snapshot, last, without the button', async () => {
    const created = new Date('2026-11-07T01:00:00.000Z');
    const { service, repo } = setup({
      passDetail: { pass: PASS_VIEW, items: [ITEM('q2', 'pass'), ITEM('q1', 'fail_major')] },
      // A leak guard: whatever else the repository knows about a question, the learner's id must not reach the response.
      existing: new Map([['q1', { createdAt: created, aiMeta: { operation: 'generate_cloze', provider: 'fake', model: 'fake:ok', prompt_revision: 4, call_operation_id: 'r1' }, userId: 'u-1' }]]),
    });
    const result = await service.passItems('p1');
    expect(repo.questions).toHaveBeenCalledExactlyOnceWith(['q2', 'q1']);
    expect(result.pass).toEqual({ ...PASS_VIEW, started_by_user: { id: 'a1', email: 'admin@x.test', system: false } });
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({
      question_id: 'q1', input: DATA('q1'), output: { sentence: 'x' }, context: { session_words: [] }, created_at: created.toISOString(),
      scores: [{ criterion: 'single_answer', verdict: 'fail_major', problem: null, reason: 'Từ "beat" cũng điền vừa.' }], labels: [],
      config_number: 4, model: 'fake:ok', provider: 'fake', failed: true, can_add_to_examples: true,
    });
    expect(result.items[1]).toEqual({
      question_id: 'q2', input: DATA('q2'), output: { sentence: 'x' }, context: { session_words: [] }, created_at: null,
      scores: [{ criterion: 'single_answer', verdict: 'pass', problem: null, reason: null }], labels: [],
      config_number: null, model: null, provider: null, failed: false, can_add_to_examples: false,
    });
    expect(JSON.stringify(result)).not.toContain('u-1');
  });

  it('a failed question whose row is gone cannot be added; a question that passed, or has no verdict, is not failed', async () => {
    const { service } = setup({ passDetail: { pass: PASS_VIEW, items: [ITEM('q1', 'fail_major'), ITEM('q2', null)] } });
    const { items } = await service.passItems('p1');
    expect(items.map((item) => [item.question_id, item.failed, item.can_add_to_examples])).toEqual([['q1', true, false], ['q2', false, false]]);
  });

  it('items are newest question first, gone questions after them in the order of the pass', async () => {
    const at = (day: number) => new Date(`2026-11-0${day}T01:00:00.000Z`);
    const meta = { operation: 'generate_cloze' };
    const { service } = setup({
      passDetail: { pass: PASS_VIEW, items: [ITEM('a', 'pass'), ITEM('b', 'pass'), ITEM('c', 'pass'), ITEM('d', 'pass')] },
      existing: new Map([['a', { createdAt: at(2), aiMeta: meta }], ['c', { createdAt: at(5), aiMeta: meta }], ['d', { createdAt: at(3), aiMeta: meta }]]),
    });
    expect((await service.passItems('p1')).items.map((item) => item.question_id)).toEqual(['c', 'd', 'a', 'b']);
  });

  it('a pass with no items asks nothing of the questions table', async () => {
    const { service, repo } = setup({ passDetail: { pass: PASS_VIEW, items: [] } });
    expect((await service.passItems('p1')).items).toEqual([]);
    expect(repo.questions).not.toHaveBeenCalled();
  });
});
