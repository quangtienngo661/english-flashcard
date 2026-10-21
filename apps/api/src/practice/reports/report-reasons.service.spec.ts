import { describe, expect, it, vi } from 'vitest';
import type { Clock } from '../../common/clock/clock.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { fitsKind, learnerReasons, ReportReasonsService, type ReportReasonRow } from './report-reasons.service.js';

const NOW = new Date('2026-10-22T08:00:00Z');
const reason = (code: string, position: number, extra: Partial<ReportReasonRow> = {}): ReportReasonRow => ({
  code, labelVi: `vi ${code}`, labelEn: `en ${code}`, detailHintVi: null, detailHintEn: null, appliesTo: 'all', noteRequired: false,
  refundable: false, active: true, position, createdAt: NOW, updatedAt: NOW, updatedBy: null, ...extra,
});
const ROWS = [
  reason('ai_more_than_one_answer', 6, { appliesTo: 'ai', refundable: true, detailHintVi: 'Từ nào khác cũng đúng?', detailHintEn: 'Which other word also fits?' }),
  reason('other', 4),
  reason('meaning_wrong', 1),
  reason('rule_only', 5, { appliesTo: 'non_ai', noteRequired: true }),
  reason('old', 2, { active: false }),
];

describe('learnerReasons (design §9.2)', () => {
  it('kind ai: active reasons for ai or all, by position, in Vietnamese', () => {
    expect(learnerReasons(ROWS, 'ai', 'vi')).toEqual([
      { code: 'meaning_wrong', label: 'vi meaning_wrong', detail_hint: null, note_required: false },
      { code: 'other', label: 'vi other', detail_hint: null, note_required: false },
      { code: 'ai_more_than_one_answer', label: 'vi ai_more_than_one_answer', detail_hint: 'Từ nào khác cũng đúng?', note_required: false },
    ]);
  });

  it('kind non_ai: the ai reason is hidden, the non_ai one shown; English labels and hints', () => {
    expect(learnerReasons(ROWS, 'non_ai', 'en')).toEqual([
      { code: 'meaning_wrong', label: 'en meaning_wrong', detail_hint: null, note_required: false },
      { code: 'other', label: 'en other', detail_hint: null, note_required: false },
      { code: 'rule_only', label: 'en rule_only', detail_hint: null, note_required: true },
    ]);
  });

  it('an inactive reason is never shown', () => {
    expect(learnerReasons(ROWS, 'ai', 'vi').map(({ code }) => code)).not.toContain('old');
    expect(learnerReasons(ROWS, 'non_ai', 'vi').map(({ code }) => code)).not.toContain('old');
  });

  it('equal positions fall back to the code', () => {
    expect(learnerReasons([reason('b', 1), reason('a', 1)], 'ai', 'vi').map(({ code }) => code)).toEqual(['a', 'b']);
  });
});

describe('fitsKind', () => {
  it.each([
    ['all', true, 'ai', true], ['all', true, 'non_ai', true], ['ai', true, 'ai', true], ['ai', true, 'non_ai', false],
    ['non_ai', true, 'non_ai', true], ['non_ai', true, 'ai', false], ['all', false, 'ai', false],
  ] as const)('applies_to %s, active %s, kind %s → %s', (appliesTo, active, kind, expected) => {
    expect(fitsKind(reason('x', 1, { appliesTo, active }), kind)).toBe(expected);
  });
});

describe('ReportReasonsService', () => {
  const make = () => {
    const prisma = {
      practiceReportReason: {
        findMany: vi.fn(async () => ROWS), findUnique: vi.fn(async (): Promise<ReportReasonRow | null> => null),
        create: vi.fn(async ({ data }: { data: Partial<ReportReasonRow> }) => reason(data.code!, data.position!, data)),
        update: vi.fn(async ({ data }: { data: Partial<ReportReasonRow> }) => reason('other', 4, data)),
      },
    };
    const clock = { now: () => NOW } as Clock;
    return { prisma, service: new ReportReasonsService(prisma as unknown as PrismaClient, clock) };
  };
  const body = {
    code: 'new_reason', label_vi: 'Mới', label_en: 'New', applies_to: 'ai' as const, note_required: true, refundable: true, position: 8,
  };

  it('the admin list has every reason, inactive ones too, by position, in snake_case', async () => {
    const { service } = make();
    const { items } = await service.adminList();
    expect(items.map(({ code }) => code)).toEqual(['meaning_wrong', 'old', 'other', 'rule_only', 'ai_more_than_one_answer']);
    expect(items[4]).toEqual({
      code: 'ai_more_than_one_answer', label_vi: 'vi ai_more_than_one_answer', label_en: 'en ai_more_than_one_answer',
      detail_hint_vi: 'Từ nào khác cũng đúng?', detail_hint_en: 'Which other word also fits?', applies_to: 'ai', note_required: false,
      refundable: true, active: true, position: 6, updated_at: NOW.toISOString(), updated_by: null,
    });
  });

  it('create stores the actor and the time; missing hints are null', async () => {
    const { prisma, service } = make();
    const view = await service.create('actor-1', body);
    expect(prisma.practiceReportReason.create).toHaveBeenCalledWith({ data: {
      code: 'new_reason', labelVi: 'Mới', labelEn: 'New', detailHintVi: null, detailHintEn: null, appliesTo: 'ai', noteRequired: true,
      refundable: true, position: 8, createdAt: NOW, updatedAt: NOW, updatedBy: 'actor-1',
    } });
    expect(view.code).toBe('new_reason');
  });

  it('create of an existing code → 409 report-reason-exists', async () => {
    const { prisma, service } = make();
    prisma.practiceReportReason.create.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    await expect(service.create('actor-1', body)).rejects.toMatchObject({ problemType: 'report-reason-exists', status: 409 });
  });

  it('update changes only the fields sent, plus who and when', async () => {
    const { prisma, service } = make();
    await service.update('actor-1', 'other', { active: false, detail_hint_en: null });
    expect(prisma.practiceReportReason.update).toHaveBeenCalledWith({
      where: { code: 'other' }, data: { active: false, detailHintEn: null, updatedAt: NOW, updatedBy: 'actor-1' },
    });
  });

  it('update of an unknown code → 404 not-found', async () => {
    const { prisma, service } = make();
    prisma.practiceReportReason.update.mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'P2025' }));
    await expect(service.update('actor-1', 'nope', { active: true })).rejects.toMatchObject({ problemType: 'not-found', status: 404 });
  });

  it('forItem returns the reason only when it is active and fits the kind (B7E71)', async () => {
    const { prisma, service } = make();
    const ai = ROWS[0];
    prisma.practiceReportReason.findUnique.mockResolvedValue(ai);
    expect(await service.forItem(prisma as never, 'ai_more_than_one_answer', 'ai')).toBe(ai);
    expect(await service.forItem(prisma as never, 'ai_more_than_one_answer', 'non_ai')).toBeNull();
    prisma.practiceReportReason.findUnique.mockResolvedValue(ROWS[4]);
    expect(await service.forItem(prisma as never, 'old', 'ai')).toBeNull();
    prisma.practiceReportReason.findUnique.mockResolvedValue(null);
    expect(await service.forItem(prisma as never, 'nope', 'ai')).toBeNull();
  });
});
