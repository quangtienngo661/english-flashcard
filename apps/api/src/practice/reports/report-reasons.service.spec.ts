import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
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

// The seven seeded rows (Bước 7) with the data-only migration of the learner UI round applied (design §8.4).
const MIGRATIONS = join(import.meta.dirname, '../../../prisma/migrations');
const migration = (suffix: string) => {
  const folder = readdirSync(MIGRATIONS).find((name) => name.endsWith(suffix));
  if (!folder) throw new Error(`no migration *${suffix}`);
  return readFileSync(join(MIGRATIONS, folder, 'migration.sql'), 'utf8').replace(/\r\n/g, '\n');
};
const literal = (token: string): string | number | boolean | null =>
  token === 'NULL' ? null : token === 'true' ? true : token === 'false' ? false
    : token.startsWith("'") ? token.slice(1, -1).replace(/''/g, "'") : Number(token);
const COLUMNS: Record<string, keyof ReportReasonRow> = { position: 'position', label_en: 'labelEn', label_vi: 'labelVi' };
const seededRows = (): ReportReasonRow[] => {
  const insert = migration('_buoc7_practice_ai').split('INSERT INTO "practice_report_reasons"')[1]!.split(';')[0]!;
  return [...insert.matchAll(/^\s*\((.*)\),?$/gm)].map(([, tuple]) => {
    const [code, labelVi, labelEn, detailHintVi, detailHintEn, appliesTo, noteRequired, refundable, position] =
      tuple!.match(/'(?:[^']|'')*'|NULL|true|false|\d+/g)!.map(literal);
    return reason(code as string, position as number, {
      labelVi: labelVi as string, labelEn: labelEn as string, detailHintVi: detailHintVi as string | null,
      detailHintEn: detailHintEn as string | null, appliesTo: appliesTo as string, noteRequired: noteRequired as boolean,
      refundable: refundable as boolean,
    });
  });
};
/** Applies each `UPDATE … SET "c" = new WHERE "code" = … AND "updated_by" IS NULL AND "c" = old` of the migration to the rows. */
const applyOrderMigration = (rows: ReportReasonRow[]) => {
  const sql = migration('_report_reasons_order_labels');
  const updates = [...sql.matchAll(
    /UPDATE "practice_report_reasons" SET "(\w+)" = ('(?:[^']|'')*'|\d+) WHERE "code" = '(\w+)' AND "updated_by" IS NULL AND "(\w+)" = ('(?:[^']|'')*'|\d+);/g,
  )];
  expect(updates.length).toBe(sql.match(/UPDATE /g)?.length);
  for (const [, column, next, code, guardColumn, previous] of updates) {
    expect(guardColumn, code).toBe(column);
    const key = COLUMNS[column!]!;
    for (const row of rows) {
      if (row.code === code && row.updatedBy === null && row[key] === literal(previous!)) Object.assign(row, { [key]: literal(next!) });
    }
  }
  return rows;
};

describe('report reasons order and English labels migration (design §8.4)', () => {
  it('GD1: on a fresh DB "other" is the last reason for both kinds', () => {
    const rows = applyOrderMigration(seededRows());
    expect(learnerReasons(rows, 'ai', 'vi').map(({ code }) => code)).toEqual([
      'meaning_wrong', 'graded_wrong', 'hint_wrong', 'ai_sentence_unnatural', 'ai_more_than_one_answer', 'ai_wrong_meaning', 'other',
    ]);
    expect(learnerReasons(rows, 'non_ai', 'vi').map(({ code }) => code)).toEqual(['meaning_wrong', 'graded_wrong', 'hint_wrong', 'other']);
    expect(rows.find(({ code }) => code === 'other')?.position).toBe(1000);
  });

  it('GD1: the English labels are the short ones; Vietnamese labels unchanged', () => {
    const rows = applyOrderMigration(seededRows());
    expect(Object.fromEntries(rows.map(({ code, labelEn }) => [code, labelEn]))).toEqual({
      meaning_wrong: 'Wrong meaning', graded_wrong: 'Right answer marked wrong', hint_wrong: 'Wrong hint', other: 'Other',
      ai_sentence_unnatural: 'Ungrammatical or unnatural', ai_more_than_one_answer: 'More than one right answer',
      ai_wrong_meaning: 'Wrong meaning of the word',
    });
    expect(rows.map(({ labelVi }) => labelVi)).toEqual(seededRows().map(({ labelVi }) => labelVi));
  });

  it('GD2: a row the admin edited before the migration stays as it is', () => {
    const seeded = seededRows();
    const edited = seeded.map((row) => row.code === 'other' ? { ...row, updatedBy: 'admin-1' }
      : row.code === 'hint_wrong' ? { ...row, labelEn: 'Hint is off' } : row);
    const rows = applyOrderMigration(edited);
    expect(rows.find(({ code }) => code === 'other')?.position).toBe(4);
    expect(rows.find(({ code }) => code === 'hint_wrong')?.labelEn).toBe('Hint is off');
  });
});
