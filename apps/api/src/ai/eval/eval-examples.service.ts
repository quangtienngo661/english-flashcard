import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { EVAL_EXAMPLES_PER_OPERATION_MAX, EVAL_NOTE_MAX } from '../ai.constants.js';
import { AI_OPERATIONS, type AiOperation } from '../ai.types.js';
import { OPERATIONS } from '../operations/operations.js';

const note = z.string().trim().max(EVAL_NOTE_MAX).nullable().optional();

/** Body of `POST /v1/admin/ai/eval/examples`; `input` is checked against the operation's input rules (design §5). */
export const createExampleSchema = z.strictObject({ operation: z.enum(AI_OPERATIONS), input: z.unknown(), note });
export type CreateExampleBody = z.input<typeof createExampleSchema>;

export const patchExampleSchema = z.strictObject({ input: z.unknown().optional(), note });
export type PatchExampleBody = z.input<typeof patchExampleSchema>;

export type ExampleView = {
  id: string; operation: AiOperation; input: unknown; note: string | null; created_by: string; created_at: string; updated_at: string;
};

type Row = { id: string; operation: string; input: unknown; note: string | null; createdBy: string; createdAt: Date; updatedAt: Date };

const view = (row: Row): ExampleView => ({
  id: row.id, operation: row.operation as AiOperation, input: row.input, note: row.note, created_by: row.createdBy,
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

/** The example set written by the owner (design §10): at most 100 per operation, no pagination. */
@Injectable()
export class EvalExamplesService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async list(op: AiOperation): Promise<{ items: ExampleView[] }> {
    const rows = await this.prisma.aiEvalExample.findMany({
      where: { operation: op }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: EVAL_EXAMPLES_PER_OPERATION_MAX,
    });
    return { items: rows.map(view) };
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
    return view(row);
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
      return view(await this.prisma.aiEvalExample.update({ where: { id }, data }));
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
