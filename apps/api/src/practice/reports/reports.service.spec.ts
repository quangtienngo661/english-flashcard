import { describe, expect, it, vi } from 'vitest';
import type { Clock } from '../../common/clock/clock.js';
import type { AppLogger } from '../../common/logging/app-logger.js';
import type { EntitlementsService } from '../../entitlements/index.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { IdentityService } from '../../identity/profile/identity.service.js';
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
  const service = new ReportsService(prisma as unknown as PrismaClient, clock, settings, new ReportReasonsService(prisma as never, clock, {} as IdentityService),
    {} as IdentityService, {} as EntitlementsService, {} as AppLogger);
  return { service, tx, prisma, created };
};
const vi_ = { userId: USER, nativeLanguage: 'vi' as const };
const en = { userId: USER, nativeLanguage: 'en' as const };
// `sharePrivateWord` is what a client may still send; the service ignores it (GF2).
const input = (reasonCode: string, extra: { note?: string | null; sharePrivateWord?: boolean } = {}) =>
  ({ reason: reasonCode, note: extra.note ?? null });

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

  it('GF1 (replaces B7E79, D12): an AI question about a private word is reported without share_private_word; the snapshot keeps the asked word', async () => {
    const { service, created } = make(aiQuestion(true));
    await service.create(vi_, ITEM, input('ai_more_than_one_answer'));
    expect(created).toHaveLength(1);
    expect((created[0].questionSnapshot as { correct: { lemma: string } }).correct.lemma).toBe('deploy');
  });

  it('GF2: share_private_word false is ignored, as GF1', async () => {
    const { service, created } = make(aiQuestion(true));
    await service.create(vi_, ITEM, input('ai_more_than_one_answer', { sharePrivateWord: false }));
    expect(created).toHaveLength(1);
  });

  it('GF4: an AI question about a catalog word still masks a private distractor', async () => {
    const { service, created } = make(aiQuestion(false));
    await service.create(vi_, ITEM, input('ai_more_than_one_answer'));
    expect((created[0].questionSnapshot as { prompt: { options: string[] } }).prompt.options[0]).toBe(PRIVATE_MEANING_MASK);
  });

  it('B7E80: the snapshot keeps the asked private word and masks the other private option', async () => {
    const { service, created } = make(aiQuestion(true));
    await service.create(vi_, ITEM, input('ai_more_than_one_answer', { sharePrivateWord: true }));
    const snapshot = created[0].questionSnapshot as { prompt: { options: string[] }; correct: { lemma: string } };
    expect(snapshot.prompt.options).toEqual([PRIVATE_MEANING_MASK, 'triển khai', 'hợp nhất', 'gộp']);
    expect(snapshot.correct.lemma).toBe('deploy');
  });

  it('B7E81/GF3: a non-AI question about a private word → 409 report-not-available, even with consent', async () => {
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

describe('ReportsService.resolve (design §9.3)', () => {
  const STAFF = '44444444-4444-4444-8444-444444444444';
  type Stored = { id: string; userId: string; senseId: string; status: string; questionSource: string; aiOperationId: string | null;
    aiMeta: unknown; aiCharged: boolean; refunded: boolean | null; resolvedBy: string | null; resolvedByRole: string | null;
    resolvedAt: Date | null; reason: string; reasonLabel: string; note: null; questionSnapshot: object; createdAt: Date; itemId: null;
    reasonRef: { refundable: boolean } };
  const stored = (extra: Partial<Stored> = {}): Stored => ({
    id: 'r-1', userId: USER, senseId: SENSE, status: 'open', questionSource: 'ai', aiOperationId: 'req-1', aiMeta: AI_META, aiCharged: true,
    refunded: null, resolvedBy: null, resolvedByRole: null, resolvedAt: null, reason: 'ai_more_than_one_answer',
    reasonLabel: 'Có hơn một đáp án đúng', note: null, questionSnapshot: {}, createdAt: NOW, itemId: null,
    reasonRef: { refundable: true }, ...extra,
  });
  const build = (initial: Stored | null, options: { role?: 'admin' | 'editor'; refund?: () => Promise<{ refunded: boolean }> } = {}) => {
    let row = initial;
    const prisma = {
      practiceReport: {
        findUnique: vi.fn(async () => row),
        // The conditional write: only an open report changes (B7E76).
        updateMany: vi.fn(async ({ where, data }: { where: { status: string }; data: Partial<Stored> }) => {
          if (!row || row.status !== where.status) return { count: 0 };
          row = { ...row, ...data };
          return { count: 1 };
        }),
        update: vi.fn(async ({ data }: { data: Partial<Stored> }) => { row = { ...row!, ...data }; return row; }),
      },
    };
    const ledger = { refund: vi.fn(options.refund ?? (async () => ({ refunded: true }))) };
    const identity = { getProfile: vi.fn(async () => ({ staff_role: options.role ?? 'editor' })),
      emailsOf: vi.fn(async () => new Map([[STAFF, 'staff@example.com']])) };
    const logger = { warn: vi.fn() };
    const service = new ReportsService(prisma as unknown as PrismaClient, { now: () => NOW } as Clock, {} as SettingsService,
      {} as ReportReasonsService, identity as unknown as IdentityService, ledger as unknown as EntitlementsService,
      logger as unknown as AppLogger);
    return { service, prisma, ledger, logger, identity, current: () => row };
  };

  it('B7E73: an editor confirms a charged AI question with a refundable reason → refund after the status write, refunded = true', async () => {
    const { service, prisma, ledger, current } = build(stored());
    const view = await service.resolve(STAFF, 'r-1', 'confirmed');
    expect(ledger.refund).toHaveBeenCalledExactlyOnceWith(USER, 'ai_practice', 'req-1', 'r-1');
    expect(prisma.practiceReport.updateMany.mock.invocationCallOrder[0]).toBeLessThan(ledger.refund.mock.invocationCallOrder[0]);
    expect(current()).toMatchObject({ status: 'confirmed', resolvedBy: STAFF, resolvedByRole: 'editor', resolvedAt: NOW, refunded: true });
    expect(view).toMatchObject({
      status: 'confirmed', refunded: true, resolved_by: STAFF, resolved_by_role: 'editor', question_source: 'ai', ai_operation_id: 'req-1',
      call_operation_id: 'req-1#2', model: 'fake:ok', prompt_revision: 1, ai_charged: true, reason_label: 'Có hơn một đáp án đúng',
    });
  });

  it('the response names who resolved it and says whether the reason is refundable', async () => {
    const { service, prisma, identity } = build(stored());
    const view = await service.resolve(STAFF, 'r-1', 'confirmed');
    expect(view).toMatchObject({ refundable: true, resolved_by_user: { id: STAFF, email: 'staff@example.com', system: false } });
    expect(identity.emailsOf).toHaveBeenCalledTimes(1);
    expect(prisma.practiceReport.findUnique).toHaveBeenLastCalledWith(
      expect.objectContaining({ include: { reasonRef: { select: { refundable: true } } } }));
  });

  it('B7E74: refund says false (no unit used in this cycle) → confirmed, refunded = false', async () => {
    const { service, current } = build(stored(), { refund: async () => ({ refunded: false }) });
    await service.resolve(STAFF, 'r-1', 'confirmed');
    expect(current()).toMatchObject({ status: 'confirmed', refunded: false });
  });

  it.each([
    ['B7E75 / B7E118: the question was given for free', stored({ aiCharged: false })],
    ['the reason is not refundable', stored({ reasonRef: { refundable: false } })],
  ])('%s → confirmed, refunded = false, refund never called', async (_name, initial) => {
    const { service, ledger, current } = build(initial);
    await service.resolve(STAFF, 'r-1', 'confirmed');
    expect(ledger.refund).not.toHaveBeenCalled();
    expect(current()).toMatchObject({ status: 'confirmed', refunded: false });
  });

  it('no_error on an AI question → no refund, refunded stays null', async () => {
    const { service, ledger, current } = build(stored());
    await service.resolve(STAFF, 'r-1', 'no_error');
    expect(ledger.refund).not.toHaveBeenCalled();
    expect(current()).toMatchObject({ status: 'no_error', refunded: null });
  });

  it('B7E76: a second resolve → 409 report-not-open and no second refund', async () => {
    const { service, ledger } = build(stored());
    await service.resolve(STAFF, 'r-1', 'confirmed');
    await expect(service.resolve('someone-else', 'r-1', 'confirmed')).rejects.toMatchObject({ problemType: 'report-not-open', status: 409 });
    expect(ledger.refund).toHaveBeenCalledTimes(1);
  });

  it('B7E77: refund throws after the status write → confirmed, refunded = null, logged by id only, still 200', async () => {
    const { service, logger, current } = build(stored(), { refund: async () => { throw new Error('db down'); } });
    const view = await service.resolve(STAFF, 'r-1', 'confirmed');
    expect(current()).toMatchObject({ status: 'confirmed', refunded: null });
    expect(view).toMatchObject({ status: 'confirmed', refunded: null });
    expect(logger.warn).toHaveBeenCalledWith('practice_refund_failed', { report_id: 'r-1' });
  });

  it.each([
    ['B7E84: confirmed for a rule question', stored({ questionSource: 'rule', aiOperationId: null, aiMeta: null, aiCharged: false }), 'confirmed'],
    ['fixed for an AI question', stored(), 'fixed'],
  ] as const)('%s → 409 resolve-status-not-allowed, nothing written', async (_name, initial, status) => {
    const { service, prisma, ledger } = build(initial);
    await expect(service.resolve(STAFF, 'r-1', status)).rejects.toMatchObject({ problemType: 'resolve-status-not-allowed', status: 409 });
    expect(prisma.practiceReport.updateMany).not.toHaveBeenCalled();
    expect(ledger.refund).not.toHaveBeenCalled();
  });

  it('B7E129: staff resolving their own report is allowed; the admin role is stored', async () => {
    const { service, current } = build(stored({ userId: STAFF }), { role: 'admin' });
    await service.resolve(STAFF, 'r-1', 'confirmed');
    expect(current()).toMatchObject({ status: 'confirmed', resolvedBy: STAFF, resolvedByRole: 'admin', refunded: true });
  });

  it('a rule question keeps Bước 4: fixed, no refund, refunded null', async () => {
    const { service, ledger, current } = build(stored({ questionSource: 'rule', aiOperationId: null, aiMeta: null, aiCharged: false }));
    const view = await service.resolve(STAFF, 'r-1', 'fixed');
    expect(ledger.refund).not.toHaveBeenCalled();
    expect(current()).toMatchObject({ status: 'fixed', refunded: null });
    expect(view).toMatchObject({ call_operation_id: null, model: null, prompt_revision: null });
  });

  it('an unknown report → 404 not-found', async () => {
    const { service } = build(null);
    await expect(service.resolve(STAFF, 'r-1', 'no_error')).rejects.toMatchObject({ problemType: 'not-found', status: 404 });
  });
});

describe('ReportsService.listRefunds (design §9.3, D33)', () => {
  const STAFF = '44444444-4444-4444-8444-444444444444';
  const OTHER = '55555555-5555-4555-8555-555555555555';
  const rows = () => [
    { id: 'r-2', userId: STAFF, resolvedBy: STAFF, resolvedByRole: 'editor', refunded: true, resolvedAt: NOW },
    { id: 'r-1', userId: USER, resolvedBy: STAFF, resolvedByRole: 'editor', refunded: false, resolvedAt: NOW },
  ];
  const build = (found: string | null = null) => {
    const findMany = vi.fn(async (_args: unknown) => rows());
    const identity = {
      emailsOf: vi.fn(async (_ids: string[]) => new Map([[STAFF, 'staff@example.com'], [USER, 'learner@example.com']])),
      findUserIdByEmail: vi.fn(async (_email: string) => found),
    };
    const service = new ReportsService({ practiceReport: { findMany } } as unknown as PrismaClient, { now: () => NOW } as Clock,
      {} as SettingsService, {} as ReportReasonsService, identity as unknown as IdentityService, {} as EntitlementsService, {} as AppLogger);
    return { service, findMany, identity };
  };

  it('confirmed AI reports only, filtered by resolver and time, with self_resolved and both users named by one emailsOf', async () => {
    const { service, findMany, identity } = build();
    const from = new Date('2026-10-01T00:00:00Z'); const to = new Date('2026-11-01T00:00:00Z');
    expect(await service.listRefunds({ resolvedBy: STAFF, from, to, pageSize: 20 })).toEqual({
      items: [
        { report_id: 'r-2', user_id: STAFF, resolved_by: STAFF, resolved_by_role: 'editor', self_resolved: true, refunded: true,
          resolved_at: NOW.toISOString(), user: { id: STAFF, email: 'staff@example.com', system: false },
          resolved_by_user: { id: STAFF, email: 'staff@example.com', system: false } },
        { report_id: 'r-1', user_id: USER, resolved_by: STAFF, resolved_by_role: 'editor', self_resolved: false, refunded: false,
          resolved_at: NOW.toISOString(), user: { id: USER, email: 'learner@example.com', system: false },
          resolved_by_user: { id: STAFF, email: 'staff@example.com', system: false } },
      ],
      next_page_token: null,
    });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'confirmed', questionSource: 'ai', resolvedBy: STAFF, resolvedAt: { gte: from, lt: to } },
      orderBy: [{ resolvedAt: 'desc' }, { id: 'asc' }], take: 21,
    }));
    expect(identity.emailsOf).toHaveBeenCalledTimes(1);
    expect([...identity.emailsOf.mock.calls[0][0]].sort()).toEqual([STAFF, USER].sort());
    expect(identity.findUserIdByEmail).not.toHaveBeenCalled();
  });

  it('an unknown resolved_by_email → empty page without a query', async () => {
    const { service, findMany, identity } = build(null);
    expect(await service.listRefunds({ resolvedByEmail: 'nobody@example.com', pageSize: 20 })).toEqual({ items: [], next_page_token: null });
    expect(identity.findUserIdByEmail).toHaveBeenCalledWith('nobody@example.com');
    expect(findMany).not.toHaveBeenCalled();
  });

  it('a known resolved_by_email filters by that user id', async () => {
    const { service, findMany } = build(STAFF);
    await service.listRefunds({ resolvedByEmail: 'staff@example.com', pageSize: 20 });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'confirmed', questionSource: 'ai', resolvedBy: STAFF },
    }));
  });

  it('resolved_by and resolved_by_email together both apply: an id that is not the email user matches nothing', async () => {
    const { service, findMany } = build(STAFF);
    await service.listRefunds({ resolvedBy: OTHER, resolvedByEmail: 'staff@example.com', pageSize: 20 });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'confirmed', questionSource: 'ai', AND: [{ resolvedBy: OTHER }, { resolvedBy: STAFF }] },
    }));
  });

  it('a page token minted with one email is rejected (400) with another', async () => {
    const { service } = build(STAFF);
    const page = await service.listRefunds({ resolvedByEmail: 'a@example.com', pageSize: 1 });
    expect(page.next_page_token).not.toBeNull();
    await expect(service.listRefunds({ resolvedByEmail: 'b@example.com', pageSize: 1, pageToken: page.next_page_token! }))
      .rejects.toMatchObject({ status: 400, problemType: 'validation-failed' });
    await expect(service.listRefunds({ resolvedByEmail: 'a@example.com', pageSize: 1, pageToken: page.next_page_token! }))
      .resolves.toBeDefined();
  });
});

describe('ReportsService.list / get (admin, authors and refundable)', () => {
  const STAFF = '44444444-4444-4444-8444-444444444444';
  const row = (id: string, extra: Record<string, unknown> = {}) => ({
    id, userId: USER, senseId: SENSE, status: 'open', questionSource: 'ai', aiOperationId: null, aiMeta: null, aiCharged: false,
    refunded: null, resolvedBy: null, resolvedByRole: null, resolvedAt: null, reason: 'x', reasonLabel: 'x', note: null,
    questionSnapshot: {}, createdAt: NOW, itemId: null, reasonRef: { refundable: false }, ...extra,
  });
  const build = (rows: unknown[]) => {
    const findMany = vi.fn(async () => rows);
    const findUnique = vi.fn(async () => (rows[0] as unknown) ?? null);
    const identity = { emailsOf: vi.fn(async () => new Map([[STAFF, 'staff@example.com']])) };
    const service = new ReportsService({ practiceReport: { findMany, findUnique } } as unknown as PrismaClient, { now: () => NOW } as Clock,
      {} as SettingsService, {} as ReportReasonsService, identity as unknown as IdentityService, {} as EntitlementsService,
      {} as AppLogger);
    return { service, findMany, findUnique, identity };
  };

  it('rows carry refundable from the reason and resolved_by_user; one emailsOf per page', async () => {
    const { service, findMany, identity } = build([
      row('r-1', { resolvedBy: STAFF, reasonRef: { refundable: true } }), row('r-2'),
    ]);
    const page = await service.list({ pageSize: 20 });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ include: { reasonRef: { select: { refundable: true } } } }));
    expect(page.items[0]).toMatchObject({
      refundable: true, resolved_by: STAFF, resolved_by_user: { id: STAFF, email: 'staff@example.com', system: false },
    });
    expect(page.items[1]).toMatchObject({ refundable: false, resolved_by_user: null });
    expect(identity.emailsOf).toHaveBeenCalledExactlyOnceWith([STAFF]);
  });

  it('get returns the same view for one report', async () => {
    const { service, findUnique, identity } = build([row('r-1', { resolvedBy: STAFF })]);
    expect(await service.get('r-1')).toMatchObject({ id: 'r-1', refundable: false, resolved_by_user: { email: 'staff@example.com' } });
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'r-1' }, include: { reasonRef: { select: { refundable: true } } } });
    expect(identity.emailsOf).toHaveBeenCalledTimes(1);
  });

  it('get of an unknown report → 404 not-found', async () => {
    const { service } = build([]);
    await expect(service.get('nope')).rejects.toMatchObject({ problemType: 'not-found', status: 404 });
  });
});
