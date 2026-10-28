import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { userRef, type UserRef } from '../../common/user-ref.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { AI_SYSTEM_ACTOR_ID, EVAL_EXAMPLES_PER_OPERATION_MAX, EVAL_NOTE_MAX } from '../ai.constants.js';
import { AI_OPERATIONS, type AiOperation } from '../ai.types.js';
import { OPERATIONS } from '../operations/operations.js';

const note = z.string().trim().max(EVAL_NOTE_MAX).nullable().optional();

/** Body of `POST /v1/admin/ai/eval/examples`; `input` is checked against the operation's input rules (design §5). */
export const createExampleSchema = z.strictObject({ operation: z.enum(AI_OPERATIONS), input: z.unknown(), note });
export type CreateExampleBody = z.input<typeof createExampleSchema>;

/**
 * Body of `POST /v1/admin/ai/eval/examples/bulk` (owner 28/10/2026): many examples of one operation at once. Rows are checked one by
 * one; the valid ones are stored and the invalid ones come back by row number.
 */
export const bulkExamplesSchema = z.strictObject({
  operation: z.enum(AI_OPERATIONS),
  rows: z.array(z.strictObject({ input: z.unknown(), note: z.unknown().optional() })).min(1).max(EVAL_EXAMPLES_PER_OPERATION_MAX),
});
export type BulkExamplesBody = z.input<typeof bulkExamplesSchema>;

export type BulkExamplesResult = {
  total: number; valid: number; created: number; invalid: Array<{ row: number; violations: string[] }>;
};

export const patchExampleSchema = z.strictObject({ input: z.unknown().optional(), note });
export type PatchExampleBody = z.input<typeof patchExampleSchema>;

export type ExampleView = {
  id: string; operation: AiOperation; input: unknown; note: string | null; created_by: string; created_by_user: UserRef; created_at: string; updated_at: string;
};

type Row = { id: string; operation: string; input: unknown; note: string | null; createdBy: string; createdAt: Date; updatedAt: Date };

const SYSTEM_IDS: ReadonlySet<string> = new Set([AI_SYSTEM_ACTOR_ID]);

const view = (row: Row, emails: ReadonlyMap<string, string>): ExampleView => ({
  id: row.id, operation: row.operation as AiOperation, input: row.input, note: row.note, created_by: row.createdBy,
  created_by_user: userRef(row.createdBy, emails, SYSTEM_IDS),
  created_at: row.createdAt.toISOString(), updated_at: row.updatedAt.toISOString(),
});

const invalid = (violations: string[]) => new ProblemDetailsException({
  status: 400, type: 'validation-failed', title: 'Validation failed', extensions: { violations },
});
const notFound = () => new ProblemDetailsException({ status: 404, type: 'not-found', title: 'Not found' });

function parse<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body);
  if (!result.success) throw invalid(result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
  return result.data;
}

function checkInput(op: AiOperation, input: unknown): void {
  const result = OPERATIONS[op].validateInput(input);
  if (!result.ok) throw invalid(result.violations.map((violation) => `input.${violation}`));
}

/** The example set written by the owner (design §10): at most 1000 per operation, no pagination. */
@Injectable()
export class EvalExamplesService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(IdentityService) private readonly identity: IdentityService,
  ) {}

  async list(op: AiOperation): Promise<{ items: ExampleView[] }> {
    const rows = await this.prisma.aiEvalExample.findMany({
      where: { operation: op }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: EVAL_EXAMPLES_PER_OPERATION_MAX,
    });
    const emails = await this.identity.emailsOf(rows.map((row) => row.createdBy));
    return { items: rows.map((row) => view(row, emails)) };
  }

  async create(actorId: string, body: CreateExampleBody): Promise<ExampleView> {
    const input = parse(createExampleSchema, body);
    checkInput(input.operation, input.input);
    // Plan choice 13: the 101st example is refused; two admins adding at once may pass 100 by one, which harms nothing.
    if (await this.prisma.aiEvalExample.count({ where: { operation: input.operation } }) >= EVAL_EXAMPLES_PER_OPERATION_MAX) {
      throw invalid([`operation: at most ${EVAL_EXAMPLES_PER_OPERATION_MAX} examples`]);
    }
    const row = await this.prisma.aiEvalExample.create({ data: {
      operation: input.operation, input: input.input as Prisma.InputJsonValue, note: input.note ?? null, createdBy: actorId,
    } });
    return view(row, await this.identity.emailsOf([row.createdBy]));
  }

  async createMany(actorId: string, body: BulkExamplesBody): Promise<BulkExamplesResult> {
    const { operation, rows } = parse(bulkExamplesSchema, body);
    // A row's own faults are reported per row, so the note is parsed here and not by the body schema.
    const checkRow = (row: (typeof rows)[number]): { violations: string[]; note: string | null } => {
      const result = OPERATIONS[operation].validateInput(row.input);
      const parsedNote = note.safeParse(row.note);
      return {
        violations: [
          ...(result.ok ? [] : result.violations.map((violation) => `input.${violation}`)),
          ...(parsedNote.success ? [] : parsedNote.error.issues.map((issue) => `note: ${issue.message}`)),
        ],
        note: parsedNote.success ? (parsedNote.data ?? null) : null,
      };
    };
    const rejected: BulkExamplesResult['invalid'] = [];
    const valid: Array<{ input: unknown; note: string | null }> = [];
    rows.forEach((row, index) => {
      const { violations, note: text } = checkRow(row);
      if (violations.length > 0) rejected.push({ row: index + 1, violations });
      else valid.push({ input: row.input, note: text });
    });
    const room = EVAL_EXAMPLES_PER_OPERATION_MAX - await this.prisma.aiEvalExample.count({ where: { operation } });
    if (valid.length > room) {
      throw invalid([`operation: room for ${Math.max(0, room)} more examples, ${valid.length} valid rows sent`]);
    }
    if (valid.length > 0) {
      // One timestamp per row, a millisecond apart: the list and a run read examples by (created_at, id), so the file's order holds.
      const start = Date.now();
      await this.prisma.aiEvalExample.createMany({
        data: valid.map((row, index) => ({
          operation, input: row.input as Prisma.InputJsonValue, note: row.note, createdBy: actorId,
          createdAt: new Date(start + index),
        })),
      });
    }
    return { total: rows.length, valid: valid.length, created: valid.length, invalid: rejected };
  }

  async update(id: string, patch: PatchExampleBody): Promise<ExampleView> {
    const input = parse(patchExampleSchema, patch);
    const row = await this.prisma.aiEvalExample.findUnique({ where: { id } });
    if (!row) throw notFound();
    if (input.input !== undefined) checkInput(row.operation as AiOperation, input.input);
    const data = {
      ...(input.input !== undefined ? { input: input.input as Prisma.InputJsonValue } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
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
}
