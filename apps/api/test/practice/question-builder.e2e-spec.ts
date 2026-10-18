import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContentService } from '../../src/content/index.js';
import { LearningService } from '../../src/learning/index.js';
import type { QuestionType } from '../../src/practice/practice.types.js';
import { QuestionBuilder } from '../../src/practice/questions/question-builder.service.js';
import { seededRandom } from '../../src/practice/testing/seeded-random.js';
import { SETTINGS_DEFAULTS } from '../../src/settings/index.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { seedPracticeGroup, seedPracticeUser } from '../support/practice-helpers.js';
import { resetCatalog } from '../support/reset-catalog.js';
import { seedPracticeSense, type SeedPracticeSenseOptions } from '../support/seed-practice.js';

const settings = SETTINGS_DEFAULTS.practice;
const all: QuestionType[] = ['mcq_definition', 'true_false_definition', 'type_word'];

describe('question builder (e2e, isolated database)', () => {
  let ctx: TestApp;
  let builder: QuestionBuilder;
  let suffix = 0;
  /** Lemmas must be unique per suite: a counter keeps fillers apart. */
  const sense = (opts: SeedPracticeSenseOptions) => seedPracticeSense(ctx.prisma, opts);
  const fillers = async (count: number, ownerUserId?: string) => {
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      suffix += 1;
      ids.push((await sense({ lemma: `filler${suffix}`, glossVi: `nghĩa ${suffix}`, ownerUserId })).senseId);
    }
    return ids;
  };
  const build = (userId: string, senseId: string, data: Partial<Parameters<QuestionBuilder['build']>[0]> = {}) => builder.build({
    userId, nativeLanguage: 'vi', senseId, chosenTypes: all, promptStyle: 'meaning', previousType: null, avoidDistractors: [],
    settings, random: seededRandom(1), ...data,
  });

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
    builder = ctx.app.get(QuestionBuilder);
  });
  beforeEach(async () => {
    await ctx.prisma.learningItem.deleteMany();
    await ctx.prisma.learningGroup.deleteMany();
    await resetCatalog(ctx.prisma);
    vi.restoreAllMocks();
  });
  afterAll(async () => { await ctx?.close(); });

  it('B4#3: deploy in IT (10 words) → 4 options, exactly one deploy, three from groups holding deploy, none same lemma, form or subsense; the prompt has no part of speech', async () => {
    const userId = await seedPracticeUser(ctx.prisma);
    const deploy = await sense({ lemma: 'deploy', glossVi: 'triển khai (phần mềm)', definitionEn: 'to put software into use' });
    const implement = await sense({ lemma: 'implement', glossVi: 'triển khai, thực hiện' });
    const deployed = await sense({ lemma: 'deployed', glossVi: 'đã được cài', formOfEntryId: deploy.entryId });
    const others = await fillers(7);
    await seedPracticeGroup(ctx.prisma, userId, 'IT', [deploy.senseId, implement.senseId, deployed.senseId, ...others]);
    // A group without deploy: its words never become options.
    const outside = await fillers(5);
    await seedPracticeGroup(ctx.prisma, userId, 'Food', outside);
    const lemmaOf = new Map((await ctx.prisma.entry.findMany({ select: { lemma: true, senses: { select: { id: true } } } }))
      .flatMap(({ lemma, senses }) => senses.map(({ id }) => [id, lemma] as const)));

    for (let seed = 1; seed <= 20; seed++) {
      const question = await build(userId, deploy.senseId, { chosenTypes: ['mcq_definition'], random: seededRandom(seed) });
      if ('skip' in question) throw new Error('skipped');
      expect(question.type).toBe('mcq_definition');
      expect(question.promptStyle).toBe('meaning');
      const prompt = question.prompt;
      if (prompt.kind !== 'mcq') throw new Error('not mcq');
      expect(prompt.options).toHaveLength(4);
      expect(prompt.options.filter((o) => o === 'deploy')).toHaveLength(1);
      expect(prompt).toEqual({ kind: 'mcq', meaning: 'triển khai (phần mềm)', meaning_language: 'vi', context_label: null, options: prompt.options });
      expect(question.answerKey).toMatchObject({ kind: 'mcq', correct_index: prompt.options.indexOf('deploy'), asked_private: false });
      expect(question.distractorSenseIds).toHaveLength(3);
      for (const id of question.distractorSenseIds) expect(others).toContain(id);
      expect(prompt.options.map((o) => o)).not.toContain('implement');
      expect(prompt.options).not.toContain('deployed');
      expect(question.distractorSenseIds.map((id) => lemmaOf.get(id)).sort()).toEqual(prompt.options.filter((o) => o !== 'deploy').sort());
      expect(JSON.stringify(prompt)).not.toMatch(/verb/);
    }
  });

  it('B4#18: a private word in a 10-word group gets multiple choice from that group', async () => {
    const userId = await seedPracticeUser(ctx.prisma);
    const mine = await sense({ lemma: 'workplace', glossVi: 'chỗ làm', ownerUserId: userId });
    const others = await fillers(9);
    await seedPracticeGroup(ctx.prisma, userId, 'Work', [mine.senseId, ...others]);
    const question = await build(userId, mine.senseId, { chosenTypes: ['mcq_definition'] });
    if ('skip' in question || question.prompt.kind !== 'mcq' || question.answerKey.kind !== 'mcq') throw new Error('not mcq');
    expect(question.prompt.options).toContain('workplace');
    expect(question.answerKey.asked_private).toBe(true);
    expect(question.answerKey.option_private[question.answerKey.correct_index]).toBe(true);
    expect(question.answerKey.option_private.filter(Boolean)).toHaveLength(1);
    for (const id of question.distractorSenseIds) expect(others).toContain(id);
  });

  it('Review Focus 5: another learner\'s private word never becomes an option even when it shares a group name', async () => {
    const userId = await seedPracticeUser(ctx.prisma);
    const other = await seedPracticeUser(ctx.prisma);
    const deploy = await sense({ lemma: 'deploy', glossVi: 'triển khai' });
    const shared = await fillers(3);
    const theirs = await fillers(5, other);
    await seedPracticeGroup(ctx.prisma, userId, 'IT', [deploy.senseId, ...shared]);
    await seedPracticeGroup(ctx.prisma, other, 'IT', [deploy.senseId, ...shared, ...theirs]);
    for (let seed = 1; seed <= 20; seed++) {
      const question = await build(userId, deploy.senseId, { random: seededRandom(seed) });
      if ('skip' in question) throw new Error('skipped');
      for (const id of question.distractorSenseIds) expect(theirs).not.toContain(id);
    }
    const availability = await builder.availability({ userId, nativeLanguage: 'vi', senseIds: [deploy.senseId], chosenTypes: ['mcq_definition'] });
    expect(availability.get(deploy.senseId)).toEqual(['mcq_definition']);
    // Without the other learner's words the group holds exactly 3 candidates; one fewer and multiple choice is gone.
    await ctx.prisma.learningItem.deleteMany({ where: { userId, senseId: shared[0] } });
    const fewer = await builder.availability({ userId, nativeLanguage: 'vi', senseIds: [deploy.senseId], chosenTypes: ['mcq_definition'] });
    expect(fewer.get(deploy.senseId)).toEqual([]);
  });

  it('B4#23: style sentence → multiple choice uses the meaning prompt, typing uses "___" with blank deployed; accepted = ["deployed"]', async () => {
    const userId = await seedPracticeUser(ctx.prisma);
    const deploy = await sense({
      lemma: 'deploy', glossVi: 'triển khai', definitionEn: 'to put software into use', variants: ['deploi'],
      examples: ['We deployed the app to the server yesterday.'],
      inflections: [{ form: 'deploys', kind: 'third_person' }, { form: 'deployed', kind: 'past' }],
    });
    await seedPracticeGroup(ctx.prisma, userId, 'IT', [deploy.senseId, ...await fillers(3)]);

    const mcq = await build(userId, deploy.senseId, { chosenTypes: ['mcq_definition'], promptStyle: 'sentence' });
    if ('skip' in mcq) throw new Error('skipped');
    expect(mcq).toMatchObject({ type: 'mcq_definition', promptStyle: 'meaning', prompt: { kind: 'mcq', meaning: 'triển khai' } });

    const typing = await build(userId, deploy.senseId, { chosenTypes: ['type_word'], promptStyle: 'sentence' });
    if ('skip' in typing) throw new Error('skipped');
    expect(typing).toMatchObject({
      type: 'type_word', promptStyle: 'sentence', blank: { text: 'deployed', base: false },
      prompt: { kind: 'type_sentence', sentence: 'We ___ the app to the server yesterday.' },
      answerKey: { kind: 'type_word', main: 'deployed', accepted: ['deployed'], reveal: { lemma: 'deploy', meaning: 'triển khai' } },
      hints: { level1: { kind: 'definition', text: 'to put software into use' }, level2: { first_letter: 'd', length: 8 } },
    });
  });

  it('a base blank accepts the variants too', async () => {
    const userId = await seedPracticeUser(ctx.prisma);
    const analyze = await sense({
      lemma: 'analyze', glossVi: 'phân tích', variants: ['analyse'], acceptedForms: ['Analyze'],
      examples: ['They analyze the data.'],
    });
    await seedPracticeGroup(ctx.prisma, userId, 'Data', [analyze.senseId]);
    const typing = await build(userId, analyze.senseId, { chosenTypes: ['type_word'], promptStyle: 'sentence' });
    if ('skip' in typing || typing.answerKey.kind !== 'type_word') throw new Error('not typing');
    expect(typing.blank).toEqual({ text: 'analyze', base: true });
    expect(typing.answerKey.main).toBe('analyze');
    expect([...typing.answerKey.accepted].sort()).toEqual(['analyse', 'analyze']);
    // A meaning prompt accepts the same set.
    const meaning = await build(userId, analyze.senseId, { chosenTypes: ['type_word'], promptStyle: 'meaning' });
    if ('skip' in meaning || meaning.answerKey.kind !== 'type_word') throw new Error('not typing');
    expect(meaning.prompt).toEqual({ kind: 'type_meaning', meaning: 'phân tích', meaning_language: 'vi', context_label: null });
    expect([...meaning.answerKey.accepted].sort()).toEqual(['analyse', 'analyze']);
    expect(meaning.blank).toBeNull();
  });

  it('an example containing a non-accepted spelling is still masked (from variants) and that blank alone is accepted', async () => {
    const userId = await seedPracticeUser(ctx.prisma);
    const color = await sense({ lemma: 'color', glossVi: 'màu', variants: ['colour'], examples: ['What colour is it?'] });
    await ctx.prisma.entryVariant.updateMany({ where: { entryId: color.entryId }, data: { acceptedAsAnswer: false } });
    await seedPracticeGroup(ctx.prisma, userId, 'Art', [color.senseId]);
    const typing = await build(userId, color.senseId, { chosenTypes: ['type_word'], promptStyle: 'sentence' });
    if ('skip' in typing || typing.answerKey.kind !== 'type_word') throw new Error('not typing');
    expect(typing.prompt).toEqual({ kind: 'type_sentence', sentence: 'What ___ is it?' });
    expect(typing.blank).toEqual({ text: 'colour', base: true });
    expect(typing.answerKey.accepted).toEqual(['colour']);
  });

  it('true/false with percent 100 is always true, with 20 about one in five over 500 seeded draws', async () => {
    const userId = await seedPracticeUser(ctx.prisma);
    const deploy = await sense({ lemma: 'deploy', glossVi: 'triển khai' });
    const others = await fillers(3);
    await seedPracticeGroup(ctx.prisma, userId, 'IT', [deploy.senseId, ...others]);
    const draw = async (percent: number, random: () => number) => {
      const question = await build(userId, deploy.senseId, {
        chosenTypes: ['true_false_definition'], settings: { ...settings, trueFalseTruePercent: percent }, random,
      });
      if ('skip' in question || question.answerKey.kind !== 'true_false' || question.prompt.kind !== 'true_false') throw new Error('not tf');
      return question;
    };
    const random100 = seededRandom(3);
    for (let i = 0; i < 20; i++) {
      const question = await draw(100, random100);
      expect(question.answerKey).toMatchObject({ is_true: true, paired_private: false });
      expect(question.prompt).toMatchObject({ lemma: 'deploy', meaning: 'triển khai' });
      expect(question.distractorSenseIds).toEqual([]);
    }
    const random20 = seededRandom(4);
    let trues = 0;
    for (let i = 0; i < 500; i++) {
      const question = await draw(20, random20);
      if (question.answerKey.kind !== 'true_false' || question.prompt.kind !== 'true_false') throw new Error('not tf');
      if (question.answerKey.is_true) trues += 1;
      else {
        expect(question.distractorSenseIds).toHaveLength(1);
        expect(others).toContain(question.distractorSenseIds[0]);
        expect(question.prompt.meaning).not.toBe('triển khai');
      }
    }
    expect(trues).toBeGreaterThan(70);
    expect(trues).toBeLessThan(130);
  }, 60_000);

  it('a retired sense → skip not-visible', async () => {
    const userId = await seedPracticeUser(ctx.prisma);
    const deploy = await sense({ lemma: 'deploy', glossVi: 'triển khai' });
    await seedPracticeGroup(ctx.prisma, userId, 'IT', [deploy.senseId]);
    await ctx.prisma.sense.update({ where: { id: deploy.senseId }, data: { state: 'retired' } });
    expect(await build(userId, deploy.senseId)).toEqual({ skip: 'not-visible' });
    expect((await builder.availability({ userId, nativeLanguage: 'vi', senseIds: [deploy.senseId], chosenTypes: all })).has(deploy.senseId))
      .toBe(false);
  });

  it('only multiple choice and 2 eligible → skip no-type', async () => {
    const userId = await seedPracticeUser(ctx.prisma);
    const deploy = await sense({ lemma: 'deploy', glossVi: 'triển khai' });
    await seedPracticeGroup(ctx.prisma, userId, 'IT', [deploy.senseId, ...await fillers(2)]);
    expect(await build(userId, deploy.senseId, { chosenTypes: ['mcq_definition'] })).toEqual({ skip: 'no-type' });
    const availability = await builder.availability({ userId, nativeLanguage: 'vi', senseIds: [deploy.senseId], chosenTypes: all });
    expect(availability.get(deploy.senseId)).toEqual(['true_false_definition', 'type_word']);
  });

  it('a private word\'s prompt has context_label null', async () => {
    const userId = await seedPracticeUser(ctx.prisma);
    const mine = await sense({ lemma: 'workplace', glossVi: 'chỗ làm', ownerUserId: userId });
    await ctx.prisma.sense.update({ where: { id: mine.senseId }, data: { contextLabel: 'p2' } });
    await seedPracticeGroup(ctx.prisma, userId, 'Work', [mine.senseId]);
    const question = await build(userId, mine.senseId, { chosenTypes: ['type_word'] });
    if ('skip' in question) throw new Error('skipped');
    expect(question.prompt).toEqual({ kind: 'type_meaning', meaning: 'chỗ làm', meaning_language: 'vi', context_label: null });
    expect(question.hints).toEqual({ level1: null, level2: { first_letter: 'w', length: 9 } });
    expect(question.answerKey).toMatchObject({ asked_private: true });
  });

  it('availability for 50 words makes one group-mates call and one candidates call', async () => {
    const userId = await seedPracticeUser(ctx.prisma);
    const words = await fillers(50);
    await seedPracticeGroup(ctx.prisma, userId, 'Big', words);
    const mates = vi.spyOn(ctx.app.get(LearningService), 'practiceGroupMates');
    const candidates = vi.spyOn(ctx.app.get(ContentService), 'practiceCandidates');
    const availability = await builder.availability({ userId, nativeLanguage: 'vi', senseIds: words, chosenTypes: all });
    expect(mates).toHaveBeenCalledTimes(1);
    expect(candidates).toHaveBeenCalledTimes(1);
    expect(availability.size).toBe(50);
    for (const types of availability.values()) expect(types).toEqual(all);
  });

  it('answer_key and hints are never part of the returned prompt object', async () => {
    const userId = await seedPracticeUser(ctx.prisma);
    const deploy = await sense({ lemma: 'deploy', glossVi: 'triển khai', definitionEn: 'to put software into use' });
    await seedPracticeGroup(ctx.prisma, userId, 'IT', [deploy.senseId, ...await fillers(3)]);
    for (const type of all) {
      const question = await build(userId, deploy.senseId, { chosenTypes: [type] });
      if ('skip' in question) throw new Error('skipped');
      const text = JSON.stringify(question.prompt);
      expect(text).not.toMatch(/answer_key|correct_index|is_true|accepted|level1|level2|to put software into use/);
      if (type === 'type_word') expect(text).not.toContain('deploy');
    }
  });
});
