import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { userRef, type UserRef } from '../../common/user-ref.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { SettingsService } from '../../settings/index.js';
import { AI_SYSTEM_ACTOR_ID, EVAL_EXAMPLES_PER_OPERATION_MAX, EVAL_NOTE_MAX } from '../ai.constants.js';
import { AI_OPERATIONS, type AiOperation } from '../ai.types.js';
import { OPERATIONS } from '../operations/operations.js';
import { EvalRulesRegistry } from './eval-rules.port.js';
import { EVAL_SPLITS, type EvalSplit, type ExampleSource } from './eval.types.js';
import { expectedViolations, normalizeExpected } from './expected.js';
import { nextSplit } from './split.js';

const note = z.string().trim().max(EVAL_NOTE_MAX).nullable().optional();

/**
 * Body of `POST /v1/admin/ai/eval/examples`; `input` is checked against the operation's input rules (design §5), `expected` against
 * the operation's expected-answer rules (nhóm B design §5.1).
 */
export const createExampleSchema = z.strictObject({ operation: z.enum(AI_OPERATIONS), input: z.unknown(), note, expected: z.unknown().optional() });
export type CreateExampleBody = z.input<typeof createExampleSchema>;

/**
 * Body of `POST /v1/admin/ai/eval/examples/bulk` (owner 28/10/2026): many examples of one operation at once. Rows are checked one by
 * one; the valid ones are stored and the invalid ones come back by row number. A row may carry its own `split` (D8.2).
 */
export const bulkExamplesSchema = z.strictObject({
  operation: z.enum(AI_OPERATIONS),
  rows: z.array(z.strictObject({
    input: z.unknown(), note: z.unknown().optional(), expected: z.unknown().optional(), split: z.unknown().optional(),
  })).min(1).max(EVAL_EXAMPLES_PER_OPERATION_MAX),
});
export type BulkExamplesBody = z.input<typeof bulkExamplesSchema>;

export type BulkExamplesResult = {
  total: number; valid: number; created: number; invalid: Array<{ row: number; violations: string[] }>;
};

export const patchExampleSchema = z.strictObject({ input: z.unknown().optional(), note, expected: z.unknown().optional() });
export type PatchExampleBody = z.input<typeof patchExampleSchema>;

export type ExampleView = {
  id: string; operation: AiOperation; input: unknown; note: string | null; split: 'dev'; expected: unknown; source: ExampleSource;
  source_ref: string | null; revealed_at: string | null; created_by: string; created_by_user: UserRef; created_at: string; updated_at: string;
};

/** A held-out example before it is revealed: nothing but its id (design §5.1, R7). */
export type HeldOutExampleView = { id: string; split: 'held_out' };

/** A held-out example after it was opened: from then on it is a dev example (D10). `deleted` = it only exists in a frozen version. */
export type RevealedExample = {
  id: string; operation: AiOperation; split: 'dev'; input: unknown; expected: unknown; note: string | null; revealed_at: string; deleted: boolean;
};

/** An example made by another module or by a report (contract §4): always a dev example, with where it came from. */
export type ExampleFromSource = {
  operation: AiOperation; input: Record<string, unknown>; expected: Record<string, unknown> | null; note: string | null;
  source: ExampleSource; sourceRef: string | null; actorId: string;
};

type Row = {
  id: string; operation: string; input: unknown; note: string | null; split: string; expected: unknown; source: string; sourceRef: string | null;
  revealedAt: Date | null; createdBy: string; createdAt: Date; updatedAt: Date;
};

const SYSTEM_IDS: ReadonlySet<string> = new Set([AI_SYSTEM_ACTOR_ID]);

const view = (row: Row, emails: ReadonlyMap<string, string>): ExampleView => ({
  id: row.id, operation: row.operation as AiOperation, input: row.input, note: row.note, split: 'dev', expected: row.expected,
  source: row.source as ExampleSource, source_ref: row.sourceRef, revealed_at: row.revealedAt?.toISOString() ?? null,
  created_by: row.createdBy, created_by_user: userRef(row.createdBy, emails, SYSTEM_IDS),
  created_at: row.createdAt.toISOString(), updated_at: row.updatedAt.toISOString(),
});

const invalid = (violations: string[]) => new ProblemDetailsException({
  status: 400, type: 'validation-failed', title: 'Validation failed', extensions: { violations },
});
const expectedInvalid = (violations: string[]) => new ProblemDetailsException({
  status: 422, type: 'expected-invalid', title: 'Expected answer is not valid', extensions: { violations },
});
const notFound = () => new ProblemDetailsException({ status: 404, type: 'not-found', title: 'Not found' });
const heldOut = () => new ProblemDetailsException({ status: 409, type: 'example-held-out', title: 'A held-out example cannot be edited' });
const notHeldOut = () => new ProblemDetailsException({ status: 409, type: 'example-not-held-out', title: 'The example is not held-out' });

function parse<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body);
  if (!result.success) throw invalid(result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
  return result.data;
}

function checkInput(op: AiOperation, input: unknown): void {
  const result = OPERATIONS[op].validateInput(input);
  if (!result.ok) throw invalid(result.violations.map((violation) => `input.${violation}`));
}

/** Throws 422 when the expected answer is wrong for the operation; otherwise the answer as it is stored (null = none). */
function checkExpected(op: AiOperation, expected: unknown): Record<string, unknown> | null {
  const violations = expectedViolations(op, expected);
  if (violations.length > 0) throw expectedInvalid(violations);
  return normalizeExpected(op, expected);
}

/** A Json column takes no plain null: the key is left out and the column stays SQL NULL. */
const withExpected = (expected: Record<string, unknown> | null) => (expected ? { expected: expected as Prisma.InputJsonValue } : {});

/** The example set written by the owner (design §10): at most 1000 per operation, no pagination. */
@Injectable()
export class EvalExamplesService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(EvalRulesRegistry) private readonly rules: EvalRulesRegistry,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  async list(op: AiOperation): Promise<{ items: Array<ExampleView | HeldOutExampleView> }> {
    const rows = await this.prisma.aiEvalExample.findMany({
      where: { operation: op }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: EVAL_EXAMPLES_PER_OPERATION_MAX,
    });
    const visible = rows.filter((row) => row.split !== 'held_out');
    const emails = await this.identity.emailsOf(visible.map((row) => row.createdBy));
    return { items: rows.map((row) => (row.split === 'held_out' ? { id: row.id, split: 'held_out' as const } : view(row, emails))) };
  }

  async create(actorId: string, body: CreateExampleBody): Promise<ExampleView | HeldOutExampleView> {
    const parsed = parse(createExampleSchema, body);
    checkInput(parsed.operation, parsed.input);
    const expected = checkExpected(parsed.operation, parsed.expected);
    // Plan choice 13: the 1001st example is refused; two admins adding at once may pass the limit by one, which harms nothing.
    const total = await this.prisma.aiEvalExample.count({ where: { operation: parsed.operation } });
    if (total >= EVAL_EXAMPLES_PER_OPERATION_MAX) throw invalid([`operation: at most ${EVAL_EXAMPLES_PER_OPERATION_MAX} examples`]);
    const held = await this.prisma.aiEvalExample.count({ where: { operation: parsed.operation, split: 'held_out' } });
    const split = nextSplit(held, total, (await this.settings.get()).ai.evalHeldOutRatio);
    const row = await this.prisma.aiEvalExample.create({ data: {
      operation: parsed.operation, input: parsed.input as Prisma.InputJsonValue, note: parsed.note ?? null, createdBy: actorId,
      split, source: 'manual', ...withExpected(expected),
    } });
    // A held-out example is not echoed: the admin web learns only that it went into the hidden part.
    if (row.split === 'held_out') return { id: row.id, split: 'held_out' };
    return view(row, await this.identity.emailsOf([row.createdBy]));
  }

  /** From a report or a judged real question (contract §4, D27.3): the same checks, always a dev example. */
  async createFromSource(args: ExampleFromSource): Promise<{ id: string }> {
    checkInput(args.operation, args.input);
    const expected = checkExpected(args.operation, args.expected);
    const text = note.safeParse(args.note);
    if (!text.success) throw invalid(text.error.issues.map((issue) => `note: ${issue.message}`));
    if (await this.prisma.aiEvalExample.count({ where: { operation: args.operation } }) >= EVAL_EXAMPLES_PER_OPERATION_MAX) {
      throw invalid([`operation: at most ${EVAL_EXAMPLES_PER_OPERATION_MAX} examples`]);
    }
    const row = await this.prisma.aiEvalExample.create({ data: {
      operation: args.operation, input: args.input as Prisma.InputJsonValue, note: text.data ?? null, createdBy: args.actorId,
      split: 'dev', source: args.source, sourceRef: args.sourceRef, ...withExpected(expected),
    } });
    return { id: row.id };
  }

  async createMany(actorId: string, body: BulkExamplesBody): Promise<BulkExamplesResult> {
    const { operation, rows } = parse(bulkExamplesSchema, body);
    // A row's own faults are reported per row, so the note is parsed here and not by the body schema.
    const checkRow = (row: (typeof rows)[number]) => {
      const result = OPERATIONS[operation].validateInput(row.input);
      const parsedNote = note.safeParse(row.note);
      const wrongSplit = row.split !== undefined && row.split !== null && !(EVAL_SPLITS as readonly unknown[]).includes(row.split);
      return {
        violations: [
          ...(result.ok ? [] : result.violations.map((violation) => `input.${violation}`)),
          ...(parsedNote.success ? [] : parsedNote.error.issues.map((issue) => `note: ${issue.message}`)),
          ...expectedViolations(operation, row.expected),
          ...(wrongSplit ? ['split: dev or held_out'] : []),
        ],
        note: parsedNote.success ? (parsedNote.data ?? null) : null,
      };
    };
    const rejected: BulkExamplesResult['invalid'] = [];
    const valid: Array<{ input: unknown; note: string | null; expected: Record<string, unknown> | null; split: EvalSplit | null }> = [];
    rows.forEach((row, index) => {
      const { violations, note: text } = checkRow(row);
      if (violations.length > 0) rejected.push({ row: index + 1, violations });
      else valid.push({
        input: row.input, note: text, expected: normalizeExpected(operation, row.expected),
        split: row.split === undefined || row.split === null ? null : (row.split as EvalSplit),
      });
    });
    const total = await this.prisma.aiEvalExample.count({ where: { operation } });
    const room = EVAL_EXAMPLES_PER_OPERATION_MAX - total;
    if (valid.length > room) {
      throw invalid([`operation: room for ${Math.max(0, room)} more examples, ${valid.length} valid rows sent`]);
    }
    if (valid.length > 0) {
      // Rows without a split take the next one by the ratio, advanced row by row in file order (E10); a row with its own counts too.
      let held = await this.prisma.aiEvalExample.count({ where: { operation, split: 'held_out' } });
      let count = total;
      const ratio = (await this.settings.get()).ai.evalHeldOutRatio;
      const splits = valid.map((row) => {
        const split = row.split ?? nextSplit(held, count, ratio);
        count += 1;
        if (split === 'held_out') held += 1;
        return split;
      });
      // One timestamp per row, a millisecond apart: the list and a run read examples by (created_at, id), so the file's order holds.
      const start = Date.now();
      await this.prisma.aiEvalExample.createMany({
        data: valid.map((row, index) => ({
          operation, input: row.input as Prisma.InputJsonValue, note: row.note, createdBy: actorId,
          createdAt: new Date(start + index), split: splits[index]!, source: 'import', ...withExpected(row.expected),
        })),
      });
    }
    return { total: rows.length, valid: valid.length, created: valid.length, invalid: rejected };
  }

  async update(id: string, patch: PatchExampleBody): Promise<ExampleView> {
    const input = parse(patchExampleSchema, patch);
    const row = await this.prisma.aiEvalExample.findUnique({ where: { id } });
    if (!row) throw notFound();
    // A held-out example stays untouched and unread until it is revealed (design §5.1).
    if (row.split === 'held_out') throw heldOut();
    const op = row.operation as AiOperation;
    if (input.input !== undefined) checkInput(op, input.input);
    // The example as it will be: a patch that leaves `expected` out keeps the stored one, which a migrated example does not have yet.
    const expected = checkExpected(op, input.expected !== undefined ? input.expected : row.expected);
    const data = {
      ...(input.input !== undefined ? { input: input.input as Prisma.InputJsonValue } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
      ...(input.expected !== undefined ? withExpected(expected) : {}),
    };
    try {
      const updated = await this.prisma.aiEvalExample.update({ where: { id }, data });
      return view(updated, await this.identity.emailsOf([updated.createdBy]));
    } catch (error) {
      if (error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2025') throw notFound();
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const { count } = await this.prisma.aiEvalExample.deleteMany({ where: { id } });
    if (count === 0) throw notFound();
  }

  /**
   * Opens a held-out example (the admin web asks first): it becomes a dev example, and every frozen snapshot of it records the moment, so
   * its set version says "1 held-out example was seen". An example already deleted from the working set is read from its latest held-out
   * snapshot.
   */
  async reveal(id: string): Promise<RevealedExample> {
    const now = this.clock.now();
    const row = await this.prisma.aiEvalExample.findUnique({ where: { id } });
    if (row) {
      if (row.split !== 'held_out') throw notHeldOut();
      await this.prisma.$transaction(async (tx) => {
        await tx.aiEvalExample.updateMany({ where: { id, split: 'held_out' }, data: { split: 'dev', revealedAt: now } });
        await tx.aiEvalSetItem.updateMany({ where: { exampleId: id, split: 'held_out', revealedAt: null }, data: { revealedAt: now } });
      });
      return {
        id, operation: row.operation as AiOperation, split: 'dev', input: row.input, expected: row.expected, note: row.note,
        revealed_at: now.toISOString(), deleted: false,
      };
    }
    const snapshot = await this.prisma.aiEvalSetItem.findFirst({
      where: { exampleId: id, split: 'held_out' }, orderBy: { set: { version: 'desc' } }, include: { set: { select: { operation: true } } },
    });
    if (!snapshot) {
      const anySnapshot = await this.prisma.aiEvalSetItem.findFirst({ where: { exampleId: id }, select: { id: true } });
      throw anySnapshot ? notHeldOut() : notFound();
    }
    await this.prisma.aiEvalSetItem.updateMany({ where: { exampleId: id, split: 'held_out', revealedAt: null }, data: { revealedAt: now } });
    return {
      id, operation: snapshot.set.operation as AiOperation, split: 'dev', input: snapshot.input, expected: snapshot.expected, note: null,
      revealed_at: now.toISOString(), deleted: true,
    };
  }

  /** The catalog forms of a word, to fill the expected answer in (design §5.1); `null` without rules or when the catalog lacks the word. */
  async forms(word: string, partOfSpeech: string): Promise<{ forms: string[] | null }> {
    const rules = this.rules.get();
    return { forms: rules ? await rules.formsOf(word, partOfSpeech) : null };
  }
}
