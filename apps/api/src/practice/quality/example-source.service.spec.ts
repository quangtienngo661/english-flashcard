import { describe, expect, it, vi } from 'vitest';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { PracticeSense } from '../../content/index.js';
import type { StoredAiInput } from '../ai/ai-question-generator.service.js';
import type { AnswerKey } from '../practice.types.js';
import { candidate, deploy } from '../testing/ai-senses.js';
import { ExampleSourceService } from './example-source.service.js';
import type { SourceRow } from './real-questions.repository.js';

const ADMIN = 'a0000000-0000-4000-8000-000000000001';
const OWNER = 'b0000000-0000-4000-8000-000000000002';
const FORMS = ['deploy', 'deployed', 'deploying', 'deploys'];
const CLOZE_DATA = { word: 'deploy', part_of_speech: 'verb', level: 'B1' as const, meaning_vi: 'triển khai', context_label: null };
const KEY = (over: Partial<{ option_private: boolean[]; asked_private: boolean }> = {}): AnswerKey => ({
  kind: 'mcq', correct_index: 0, option_private: over.option_private ?? [false, false, false, false],
  reveal: { lemma: 'deploy', meaning: 'triển khai', definition_en: null }, asked_private: over.asked_private ?? false,
});
const CLOZE_INPUT: StoredAiInput = { senseRevisionId: 'rev', contentKey: null, type: 'cloze', data: CLOZE_DATA };
const META = (operation = 'generate_cloze') => ({ operation, provider: 'fake', model: 'fake:ok', prompt_revision: 4, call_operation_id: 'r1' });

const source = (over: Partial<SourceRow> = {}): SourceRow => ({
  senseId: 'sense-1', ownerId: OWNER, aiMeta: META(), questionSource: 'ai', reportStatus: 'confirmed', snapshot: { prompt: { kind: 'cloze', sentence: 'We ___ it.' } },
  answerKey: KEY(), aiInput: CLOZE_INPUT, ...over,
});

function setup(init: { row?: SourceRow | null; visibleTo?: string; sense?: PracticeSense; others?: PracticeSense[]; randoms?: ReturnType<typeof candidate>[]; forms?: string[] | null } = {}) {
  const sense = init.sense ?? deploy({ sense_id: 'sense-1' });
  const repo = { source: vi.fn(async (_ref: unknown): Promise<SourceRow | null> => (init.row === undefined ? source() : init.row)) };
  const content = {
    // A private sense is visible only to its owner (the learner who was asked), a catalog sense to everybody.
    practiceSenses: vi.fn(async (viewer: string, ids: string[], _language: string) => (viewer === (init.visibleTo ?? OWNER) ? new Map(ids.map((id) => [id, sense])) : new Map())),
    catalogPracticeSensesByLemma: vi.fn(async (_lemma: string, _pos: string | null, _language: string) => init.others ?? [sense]),
    practiceRandomMeanings: vi.fn(async (_viewer: string, _exclude: string[], count: number, _language: string) => (init.randoms ?? []).slice(0, count)),
    practiceLemmaMeanings: vi.fn(async () => new Map()),
  };
  const rules = { formsOf: vi.fn(async (_word: string, _pos: string): Promise<string[] | null> => (init.forms === undefined ? FORMS : init.forms)) };
  const ai = { createEvalExample: vi.fn(async (_args: unknown) => ({ id: 'ex1' })) };
  const service = new ExampleSourceService(repo as never, content as never, rules as never, ai as never);
  return { service, repo, content, rules, ai };
}

async function problemOf(promise: Promise<unknown>) {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ProblemDetailsException);
  const problem = error as ProblemDetailsException;
  return { status: problem.getStatus(), type: problem.problemType, extensions: problem.extensions ?? {} };
}
const notEligible = (reason: string) => ({ status: 409, type: 'source-not-eligible', extensions: { reason } });

describe('ExampleSourceService.preview (D27, B39, B42)', () => {
  it('a confirmed report of an AI cloze whose request is still kept: the data sent to the AI, the catalog forms as the expected answer', async () => {
    const { service, repo, rules } = setup();
    await expect(service.preview(ADMIN, { report_id: 'rep1' })).resolves.toEqual({
      operation: 'generate_cloze', source: 'report', source_ref: 'rep1', word: 'deploy', part_of_speech: 'verb', input: CLOZE_DATA, rebuilt: false,
      expected: { forms: FORMS },
    });
    expect(repo.source).toHaveBeenCalledExactlyOnceWith({ report_id: 'rep1' });
    expect(rules.formsOf).toHaveBeenCalledExactlyOnceWith('deploy', 'verb');
  });

  it('a meaning question has forms too; a word the catalog does not know has no expected answer to fill in', async () => {
    const meaning = setup({ row: source({ aiMeta: META('generate_meaning_question'), aiInput: { ...CLOZE_INPUT, type: 'meaning_in_sentence', data: { ...CLOZE_DATA, other_meanings_vi: ['a', 'b', 'c'] }, wrong: [] } }) });
    expect((await meaning.service.preview(ADMIN, { report_id: 'rep1' })).expected).toEqual({ forms: FORMS });
    const unknown = setup({ forms: null });
    expect((await unknown.service.preview(ADMIN, { report_id: 'rep1' })).expected).toBeNull();
  });

  it('an MCQ has no forms to fill in: expected null, and the catalog is not asked', async () => {
    const mcqData = { ...CLOZE_DATA, answer_form: 'deploy', candidates: ['a', 'b', 'c'] };
    const { service, rules } = setup({ row: source({ aiMeta: META('generate_sentence_mcq'), aiInput: { senseRevisionId: 'rev', contentKey: null, type: 'mcq_sentence', data: mcqData, form: { answerForm: 'deploy', candidates: ['a', 'b', 'c'], senses: [] } } }) });
    const preview = await service.preview(ADMIN, { report_id: 'rep1' });
    expect(preview).toMatchObject({ operation: 'generate_sentence_mcq', expected: null, input: mcqData });
    expect(rules.formsOf).not.toHaveBeenCalled();
  });

  it('an unknown report or question → 404 not-found', async () => {
    expect(await problemOf(setup({ row: null }).service.preview(ADMIN, { report_id: 'nope' }))).toMatchObject({ status: 404, type: 'not-found' });
    expect(await problemOf(setup({ row: null }).service.preview(ADMIN, { question_id: 'nope' }))).toMatchObject({ status: 404, type: 'not-found' });
  });

  it('a report that is still open or was closed another way → 409 report-not-confirmed', async () => {
    for (const status of ['open', 'no_error', 'fixed']) {
      expect(await problemOf(setup({ row: source({ reportStatus: status }) }).service.preview(ADMIN, { report_id: 'rep1' })), status).toMatchObject(notEligible('report-not-confirmed'));
    }
  });

  it('a question made by a rule, or without a Practice AI operation in its meta → 409 not-ai', async () => {
    expect(await problemOf(setup({ row: source({ questionSource: 'rule' }) }).service.preview(ADMIN, { report_id: 'rep1' }))).toMatchObject(notEligible('not-ai'));
    expect(await problemOf(setup({ row: source({ aiMeta: null }) }).service.preview(ADMIN, { report_id: 'rep1' }))).toMatchObject(notEligible('not-ai'));
    expect(await problemOf(setup({ row: source({ aiMeta: META('lookup_word') }) }).service.preview(ADMIN, { report_id: 'rep1' }))).toMatchObject(notEligible('not-ai'));
  });

  it('B39: the question is still there and an option is a private word → 409 private-word', async () => {
    const row = source({ answerKey: KEY({ option_private: [false, true, false, false] }) });
    expect(await problemOf(setup({ row }).service.preview(ADMIN, { report_id: 'rep1' }))).toMatchObject(notEligible('private-word'));
    expect(await problemOf(setup({ row: { ...row, reportStatus: null } }).service.preview(ADMIN, { question_id: 'q1' }))).toMatchObject(notEligible('private-word'));
  });

  it('the asked word is private, or a private word was among what was sent to the AI → 409 private-word', async () => {
    expect(await problemOf(setup({ row: source({ answerKey: KEY({ asked_private: true }) }) }).service.preview(ADMIN, { report_id: 'rep1' }))).toMatchObject(notEligible('private-word'));
    expect(await problemOf(setup({ row: source({ aiInput: { ...CLOZE_INPUT, contentKey: 'abc' } }) }).service.preview(ADMIN, { report_id: 'rep1' }))).toMatchObject(notEligible('private-word'));
    const mcq: StoredAiInput = { senseRevisionId: 'rev', contentKey: null, type: 'mcq_sentence', data: { ...CLOZE_DATA, answer_form: 'deploy', candidates: ['a', 'b', 'c'] }, form: { answerForm: 'deploy', candidates: ['a', 'b', 'c'], senses: [candidate({ scope: 'private' })] } };
    expect(await problemOf(setup({ row: source({ answerKey: null, aiMeta: META('generate_sentence_mcq'), aiInput: mcq }) }).service.preview(ADMIN, { report_id: 'rep1' }))).toMatchObject(notEligible('private-word'));
  });

  it('Review focus 4: the question row was cleaned up; the snapshot shows a masked option → 409 private-word, and nothing is read from the catalog', async () => {
    const row = source({ answerKey: null, aiInput: null, snapshot: { prompt: { kind: 'mcq_sentence', options: ['go', '[từ riêng của người học]', 'run', 'see'] } } });
    const { service, content } = setup({ row });
    expect(await problemOf(service.preview(ADMIN, { report_id: 'rep1' }))).toMatchObject(notEligible('private-word'));
    expect(content.practiceSenses).not.toHaveBeenCalled();
  });

  it('Review focus 4: question and request are gone, and the sense is the learner\'s private word → 409 private-word; it is read as the learner, not as the admin', async () => {
    const { service, content } = setup({ row: source({ answerKey: null, aiInput: null }), sense: deploy({ sense_id: 'sense-1', scope: 'private' }), visibleTo: OWNER });
    expect(await problemOf(service.preview(ADMIN, { report_id: 'rep1' }))).toMatchObject(notEligible('private-word'));
    expect(content.practiceSenses).toHaveBeenCalledExactlyOnceWith(OWNER, ['sense-1'], 'vi');
  });

  it('question and request are gone and the sense is not visible to the learner any more → 409 sense-gone', async () => {
    const { service } = setup({ row: source({ answerKey: null, aiInput: null }), visibleTo: 'nobody' });
    expect(await problemOf(service.preview(ADMIN, { report_id: 'rep1' }))).toMatchObject(notEligible('sense-gone'));
  });

  it('B42: the request is gone (older than 7 days) but the sense is in the catalog → rebuilt: the word and part of speech come from the sense, no input yet', async () => {
    const { service, content } = setup({ row: source({ aiInput: null }) });
    await expect(service.preview(ADMIN, { report_id: 'rep1' })).resolves.toEqual({
      operation: 'generate_cloze', source: 'report', source_ref: 'rep1', word: 'deploy', part_of_speech: 'verb', input: null, rebuilt: true, expected: { forms: FORMS },
    });
    expect(content.practiceSenses).toHaveBeenCalledExactlyOnceWith(OWNER, ['sense-1'], 'vi');
  });

  it('a sense without a part of speech is previewed as unspecified', async () => {
    const { service, rules } = setup({ row: source({ aiInput: null }), sense: deploy({ sense_id: 'sense-1', pos: null }) });
    expect(await service.preview(ADMIN, { report_id: 'rep1' })).toMatchObject({ part_of_speech: 'unspecified' });
    expect(rules.formsOf).toHaveBeenCalledExactlyOnceWith('deploy', 'unspecified');
  });

  it('a question id of an AI question: source real_judge with the question id as its reference; no report status to check', async () => {
    const { service, repo } = setup({ row: source({ reportStatus: null }) });
    await expect(service.preview(ADMIN, { question_id: 'q1' })).resolves.toMatchObject({ source: 'real_judge', source_ref: 'q1', operation: 'generate_cloze' });
    expect(repo.source).toHaveBeenCalledExactlyOnceWith({ question_id: 'q1' });
  });
});

describe('ExampleSourceService.rebuildInput (E17)', () => {
  const lemmaOnly = (lemma: string, gloss: string) => candidate({ lemma, gloss_vi: gloss });

  it('a cloze takes the sense as it is now', async () => {
    const { service } = setup();
    await expect(service.rebuildInput('generate_cloze', deploy(), ADMIN)).resolves.toEqual(CLOZE_DATA);
  });

  it('a meaning question: the other catalog senses of the word first, then random catalog meanings, three in all', async () => {
    const sense = deploy({ sense_id: 'sense-1' });
    const other = deploy({ sense_id: 'sense-2', gloss_vi: 'sự triển khai' });
    const { service, content } = setup({ sense, others: [sense, other], randoms: [lemmaOnly('alpha', 'nghĩa A'), lemmaOnly('beta', 'nghĩa B')] });
    const input = await service.rebuildInput('generate_meaning_question', sense, ADMIN, () => 0);
    expect(input).toEqual({ ...CLOZE_DATA, other_meanings_vi: ['sự triển khai', 'nghĩa A', 'nghĩa B'] });
    expect(content.catalogPracticeSensesByLemma).toHaveBeenCalledExactlyOnceWith('deploy', 'verb', 'vi');
    expect(content.practiceRandomMeanings).toHaveBeenCalledExactlyOnceWith(ADMIN, ['deploy'], 3, 'vi');
  });

  it('a meaning question with fewer than three wrong meanings in all → 409 no-input', async () => {
    const sense = deploy({ sense_id: 'sense-1' });
    const { service } = setup({ sense, others: [sense, deploy({ sense_id: 'sense-2', gloss_vi: 'sự triển khai' })], randoms: [lemmaOnly('alpha', 'nghĩa A')] });
    expect(await problemOf(service.rebuildInput('generate_meaning_question', sense, ADMIN, () => 0))).toMatchObject({ status: 409, type: 'source-not-eligible', extensions: { reason: 'no-input' } });
  });

  it('an MCQ: random catalog words in the form of the answer; the answer form and the candidates are stored as the AI would have received them', async () => {
    const sense = deploy({ sense_id: 'sense-1' });
    const randoms = ['alpha', 'beta', 'gamma', 'delta'].map((lemma, index) => lemmaOnly(lemma, `nghĩa ${index}`));
    const { service, content } = setup({ sense, randoms });
    const input = await service.rebuildInput('generate_sentence_mcq', sense, ADMIN, () => 0) as { answer_form: string; candidates: string[] };
    expect(content.practiceRandomMeanings).toHaveBeenCalledExactlyOnceWith(ADMIN, ['deploy'], 12, 'vi');
    expect(input).toMatchObject({ ...CLOZE_DATA, answer_form: 'deploy' });
    expect(input.candidates).toHaveLength(4);
    expect([...input.candidates].sort()).toEqual(['alpha', 'beta', 'delta', 'gamma']);
  });

  it('an MCQ with fewer than three usable words in any form → 409 no-input', async () => {
    const sense = deploy({ sense_id: 'sense-1' });
    const { service } = setup({ sense, randoms: [lemmaOnly('alpha', 'nghĩa 0'), lemmaOnly('beta', 'nghĩa 1')] });
    expect(await problemOf(service.rebuildInput('generate_sentence_mcq', sense, ADMIN, () => 0))).toMatchObject({ status: 409, extensions: { reason: 'no-input' } });
  });

  it('a sense with no Vietnamese meaning cannot make any of the three inputs → 409 no-input', async () => {
    const sense = deploy({ sense_id: 'sense-1', gloss_vi: null });
    const { service } = setup({ sense });
    for (const op of ['generate_cloze', 'generate_meaning_question', 'generate_sentence_mcq'] as const) {
      expect(await problemOf(service.rebuildInput(op, sense, ADMIN, () => 0)), op).toMatchObject({ status: 409, extensions: { reason: 'no-input' } });
    }
  });
});

describe('ExampleSourceService.create (D27, B42)', () => {
  it('a report whose request is kept: the data sent to the AI go into the example as they are, with the report as its source', async () => {
    const { service, ai } = setup();
    await expect(service.create(ADMIN, { report_id: 'rep1', expected: { forms: ['deploy', 'deployed'] }, note: 'sai nghĩa' })).resolves.toEqual({ id: 'ex1', operation: 'generate_cloze', rebuilt: false });
    expect(ai.createEvalExample).toHaveBeenCalledExactlyOnceWith({
      operation: 'generate_cloze', input: CLOZE_DATA, expected: { forms: ['deploy', 'deployed'] }, note: 'sai nghĩa', source: 'report', sourceRef: 'rep1', actorId: ADMIN,
    });
  });

  it('B42: the request is gone → the input is rebuilt from the sense as it is now, and the answer says it was rebuilt', async () => {
    const { service, ai } = setup({ row: source({ aiInput: null }) });
    await expect(service.create(ADMIN, { report_id: 'rep1', expected: { forms: ['deploy'] }, note: null })).resolves.toEqual({ id: 'ex1', operation: 'generate_cloze', rebuilt: true });
    expect(ai.createEvalExample).toHaveBeenCalledExactlyOnceWith({
      operation: 'generate_cloze', input: CLOZE_DATA, expected: { forms: ['deploy'] }, note: null, source: 'report', sourceRef: 'rep1', actorId: ADMIN,
    });
  });

  it('a real question: source real_judge, the question id as the reference', async () => {
    const { service, ai } = setup({ row: source({ reportStatus: null }) });
    await service.create(ADMIN, { question_id: 'q1', expected: { forms: ['deploy'] }, note: null });
    expect(ai.createEvalExample).toHaveBeenCalledWith(expect.objectContaining({ source: 'real_judge', sourceRef: 'q1' }));
  });

  it('an MCQ example carries no expected answer', async () => {
    const mcqData = { ...CLOZE_DATA, answer_form: 'deploy', candidates: ['a', 'b', 'c'] };
    const { service, ai } = setup({ row: source({ aiMeta: META('generate_sentence_mcq'), aiInput: { senseRevisionId: 'rev', contentKey: null, type: 'mcq_sentence', data: mcqData, form: { answerForm: 'deploy', candidates: ['a', 'b', 'c'], senses: [] } } }) });
    await service.create(ADMIN, { report_id: 'rep1', expected: null, note: null });
    expect(ai.createEvalExample).toHaveBeenCalledWith(expect.objectContaining({ operation: 'generate_sentence_mcq', input: mcqData, expected: null }));
  });

  it('a source that is not eligible creates nothing', async () => {
    const { service, ai } = setup({ row: source({ answerKey: KEY({ option_private: [true, false, false, false] }) }) });
    expect(await problemOf(service.create(ADMIN, { report_id: 'rep1', expected: { forms: ['deploy'] }, note: null }))).toMatchObject(notEligible('private-word'));
    expect(ai.createEvalExample).not.toHaveBeenCalled();
  });

  it('a rebuild that finds no input creates nothing', async () => {
    const mcqRow = source({ aiMeta: META('generate_sentence_mcq'), aiInput: null });
    const { service, ai } = setup({ row: mcqRow, randoms: [] });
    expect(await problemOf(service.create(ADMIN, { report_id: 'rep1', expected: null, note: null }))).toMatchObject({ status: 409, extensions: { reason: 'no-input' } });
    expect(ai.createEvalExample).not.toHaveBeenCalled();
  });

  it('the 422 expected-invalid of the example set reaches the caller unchanged', async () => {
    const { service, ai } = setup();
    const refusal = new ProblemDetailsException({ status: 422, type: 'expected-invalid', title: 'invalid', extensions: { violations: ['expected.forms: at least one form'] } });
    ai.createEvalExample.mockRejectedValueOnce(refusal);
    await expect(service.create(ADMIN, { report_id: 'rep1', expected: { forms: [] }, note: null })).rejects.toBe(refusal);
  });
});
