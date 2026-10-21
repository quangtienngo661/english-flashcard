import { describe, expect, it, vi } from 'vitest';
import type { Clock } from '../../common/clock/clock.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { SettingsService } from '../../settings/index.js';
import { PRIVATE_MEANING_MASK } from '../practice.constants.js';
import type { AnswerKey, Prompt } from '../practice.types.js';
import { ReportReasonsService, type ReportReasonRow } from './report-reasons.service.js';
import { ReportsService } from './reports.service.js';

const NOW = new Date('2026-10-22T08:00:00Z');
const USER = '11111111-1111-4111-8111-111111111111';
const ITEM = '22222222-2222-4222-8222-222222222222';
const SENSE = '33333333-3333-4333-8333-333333333333';
const reveal = { lemma: 'deploy', meaning: 'triển khai', definition_en: 'to put software into use' };
const reason = (code: string, extra: Partial<ReportReasonRow> = {}): ReportReasonRow => ({
  code, labelVi: `vi ${code}`, labelEn: `en ${code}`, detailHintVi: null, detailHintEn: null, appliesTo: 'all', noteRequired: false,
  refundable: false, active: true, position: 1, createdAt: NOW, updatedAt: NOW, updatedBy: null, ...extra,
});
const REASONS: Record<string, ReportReasonRow> = {
  meaning_wrong: reason('meaning_wrong'),
  ai_more_than_one_answer: reason('ai_more_than_one_answer', { appliesTo: 'ai', refundable: true }),
  rule_only: reason('rule_only', { appliesTo: 'non_ai' }),
  needs_note: reason('needs_note', { noteRequired: true }),
  off: reason('off', { active: false }),
};

const aiPrompt: Prompt = {
  kind: 'meaning_in_sentence', sentence: 'We deploy on Fridays.', highlight: 'deploy', meaning_language: 'vi',
  options: ['buổi họp đứng', 'triển khai', 'hợp nhất', 'gộp'],
};
const aiKey = (askedPrivate: boolean): AnswerKey => ({
  reveal, asked_private: askedPrivate, translation_vi: null, kind: 'mcq', correct_index: 1, option_private: [true, askedPrivate, false, false],
});
const AI_META = { provider: 'fake', model: 'fake:ok', prompt_revision: 1, call_operation_id: 'req-1#2' };
type Question = { type: string; prompt: Prompt; answerKey: AnswerKey; hints: unknown; source: string; aiRequestId: string | null;
  aiMeta: unknown; aiCharged: boolean };
const aiQuestion = (askedPrivate = false, aiCharged = true): Question => ({
  type: 'meaning_in_sentence', prompt: aiPrompt, answerKey: aiKey(askedPrivate), hints: { level1: null, level2: null },
  source: 'ai', aiRequestId: 'req-1', aiMeta: AI_META, aiCharged,
});
const ruleQuestion = (askedPrivate = false, source = 'rule'): Question => ({
  type: 'type_word', prompt: { kind: 'type_sentence', sentence: 'We ___ it.' },
  answerKey: { reveal, asked_private: askedPrivate, kind: 'type_word', main: 'deploy', accepted: ['deploy'] },
  hints: { level1: null, level2: null }, source, aiRequestId: null, aiMeta: null, aiCharged: false,
});

const make = (question: Question, options: { recent?: number; existing?: boolean } = {}) => {
  const created: Record<string, unknown>[] = [];
  const tx = {
    $executeRaw: vi.fn(async () => 1),
    practiceSessionItem: { findFirst: vi.fn(async () => ({
      id: ITEM, userId: USER, senseId: SENSE, answerRaw: '0', answersTried: [], result: 'wrong', hintLevel: 0, question,
    })) },
    practiceReportReason: { findUnique: vi.fn(async ({ where }: { where: { code: string } }) => REASONS[where.code] ?? null) },
    practiceReport: {
      findUnique: vi.fn(async () => options.existing ? { id: 'r-0', itemId: ITEM, senseId: SENSE, reason: 'other', reasonLabel: 'Khác',
        note: null, status: 'open', refunded: null, createdAt: NOW, resolvedAt: null } : null),
      findMany: vi.fn(async () => Array.from({ length: options.recent ?? 0 }, () => ({ createdAt: new Date(NOW.getTime() - 60_000) }))),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        created.push(data);
        return { id: 'r-1', refunded: null, resolvedAt: null, status: 'open', ...data };
      }),
    },
  };
  const prisma = {
    $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    practiceReport: { findMany: vi.fn(async () => [] as unknown[]) },
  };
  const settings = { get: async () => ({ practice: { reportsPerHour: 5 } }) } as unknown as SettingsService;
  const clock = { now: () => NOW } as Clock;
  const service = new ReportsService(prisma as unknown as PrismaClient, clock, settings, new ReportReasonsService(prisma as never, clock));
  return { service, tx, prisma, created };
};
const vi_ = { userId: USER, nativeLanguage: 'vi' as const };
const en = { userId: USER, nativeLanguage: 'en' as const };
const input = (reasonCode: string, extra: { note?: string | null; sharePrivateWord?: boolean } = {}) =>
  ({ reason: reasonCode, note: extra.note ?? null, sharePrivateWord: extra.sharePrivateWord ?? false });

describe('ReportsService.create (design §9.2)', () => {
  it('B7E70: an AI question reported with an ai reason is stored open with its label, source, operation id, meta and charge', async () => {
    const { service, created } = make(aiQuestion());
    const view = await service.create(vi_, ITEM, input('ai_more_than_one_answer'));
    expect(created[0]).toMatchObject({
      userId: USER, itemId: ITEM, senseId: SENSE, reason: 'ai_more_than_one_answer', reasonLabel: 'vi ai_more_than_one_answer',
      questionSource: 'ai', aiOperationId: 'req-1', aiMeta: AI_META, aiCharged: true, note: null, createdAt: NOW,
    });
    expect(view).toMatchObject({ id: 'r-1', status: 'open', reason: 'ai_more_than_one_answer', reason_label: 'vi ai_more_than_one_answer' });
  });

  it('the label is taken in the learner language', async () => {
    const { service, created } = make(ruleQuestion());
    await service.create(en, ITEM, input('meaning_wrong'));
    expect(created[0]).toMatchObject({ reasonLabel: 'en meaning_wrong', questionSource: 'rule', aiOperationId: null, aiCharged: false });
    expect(created[0]).not.toHaveProperty('aiMeta');
  });

  it.each([
    ['a non_ai reason on an AI question', aiQuestion(), 'rule_only'],
    ['an ai reason on a rule question', ruleQuestion(), 'ai_more_than_one_answer'],
    ['an inactive reason', aiQuestion(), 'off'],
    ['an unknown reason', ruleQuestion(), 'nope'],
  ])('B7E71: %s → 400 validation-failed, nothing stored', async (_name, question, code) => {
    const { service, created } = make(question);
    await expect(service.create(vi_, ITEM, input(code))).rejects.toMatchObject({ problemType: 'validation-failed', status: 400 });
    expect(created).toEqual([]);
  });

  it('B7E72: a note_required reason without a note → 400 validation-failed; with one it is stored', async () => {
    const { service, created } = make(ruleQuestion());
    await expect(service.create(vi_, ITEM, input('needs_note'))).rejects.toMatchObject({ problemType: 'validation-failed' });
    expect(created).toEqual([]);
    await service.create(vi_, ITEM, input('needs_note', { note: 'run is also right' }));
    expect(created[0]).toMatchObject({ note: 'run is also right' });
  });

  it('B7E79: an AI question about a private word without share_private_word → 400 share-consent-required', async () => {
    const { service, created } = make(aiQuestion(true));
    await expect(service.create(vi_, ITEM, input('ai_more_than_one_answer')))
      .rejects.toMatchObject({ problemType: 'share-consent-required', status: 400 });
    expect(created).toEqual([]);
  });

  it('B7E80: with consent the snapshot keeps the asked private word and masks the other private option', async () => {
    const { service, created } = make(aiQuestion(true));
    await service.create(vi_, ITEM, input('ai_more_than_one_answer', { sharePrivateWord: true }));
    const snapshot = created[0].questionSnapshot as { prompt: { options: string[] }; correct: { lemma: string } };
    expect(snapshot.prompt.options).toEqual([PRIVATE_MEANING_MASK, 'triển khai', 'hợp nhất', 'gộp']);
    expect(snapshot.correct.lemma).toBe('deploy');
  });

  it('B7E81: a non-AI question about a private word → 409 report-not-available, even with consent', async () => {
    const { service } = make(ruleQuestion(true));
    await expect(service.create(vi_, ITEM, input('meaning_wrong', { sharePrivateWord: true })))
      .rejects.toMatchObject({ problemType: 'report-not-available', status: 409 });
  });

  it('B7E82: a cloze from the learner\'s own sentence → 409 report-not-available', async () => {
    const { service } = make(ruleQuestion(false, 'own_sentence'));
    await expect(service.create(vi_, ITEM, input('meaning_wrong'))).rejects.toMatchObject({ problemType: 'report-not-available' });
  });

  it('a second report of the item is 409 report-exists before the reason is checked', async () => {
    const { service } = make(aiQuestion(), { existing: true });
    await expect(service.create(vi_, ITEM, input('nope'))).rejects.toMatchObject({ problemType: 'report-exists', status: 409 });
  });

  it('reports_per_hour still applies', async () => {
    const { service } = make(aiQuestion(), { recent: 5 });
    await expect(service.create(vi_, ITEM, input('ai_more_than_one_answer'))).rejects.toMatchObject({ problemType: 'rate-limited', status: 429 });
  });
});

describe('ReportsService.listMine (design §9.2, D27)', () => {
  it('lists only the learner\'s reports, newest first, with refunded and resolved_at', async () => {
    const { service, prisma } = make(aiQuestion());
    prisma.practiceReport.findMany.mockResolvedValue([{
      id: 'r-1', itemId: ITEM, senseId: SENSE, reasonLabel: 'Có hơn một đáp án đúng', status: 'confirmed', refunded: true,
      createdAt: NOW, resolvedAt: new Date('2026-10-23T08:00:00Z'),
    }]);
    expect(await service.listMine(USER, { pageSize: 20 })).toEqual({
      items: [{
        id: 'r-1', item_id: ITEM, sense_id: SENSE, reason_label: 'Có hơn một đáp án đúng', status: 'confirmed', refunded: true,
        created_at: NOW.toISOString(), resolved_at: '2026-10-23T08:00:00.000Z',
      }],
      next_page_token: null,
    });
    expect(prisma.practiceReport.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: USER }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 21,
    }));
  });

  it('a page token from another learner or another list is refused', async () => {
    const { service, prisma } = make(aiQuestion());
    prisma.practiceReport.findMany.mockResolvedValue(Array.from({ length: 2 }, (_, index) => ({
      id: `r-${index}`, itemId: null, senseId: SENSE, reasonLabel: 'x', status: 'open', refunded: null, createdAt: NOW, resolvedAt: null,
    })));
    const { next_page_token: token } = await service.listMine(USER, { pageSize: 1 });
    expect(token).not.toBeNull();
    await expect(service.listMine('someone-else', { pageSize: 1, pageToken: token! }))
      .rejects.toMatchObject({ problemType: 'validation-failed' });
    await expect(service.list({ pageSize: 1, pageToken: token! })).rejects.toMatchObject({ problemType: 'validation-failed' });
  });
});
