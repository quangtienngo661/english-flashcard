import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { userRef, type UserRef } from '../../common/user-ref.js';
import { decodePageToken, encodePageToken } from '../../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
import { AI_SYSTEM_ACTOR_ID, TEST_EXAMPLES_MAX } from '../ai.constants.js';
import type { AiOperation } from '../ai.types.js';
import { OPERATIONS } from '../operations/operations.js';
import { RunnerService } from '../runner/runner.service.js';
import { SelectionReader } from '../runner/selection.js';
import { PROMPT_GUARD, promptViolations, type PromptExample } from './prompt-rules.js';
import { PromptsRepository } from './prompts.repository.js';
import { testInputs, toTestItem, type TestItem } from './test-inputs.js';

/** Body of `PUT /v1/admin/ai/prompts/{op}` (design §7.3); the content rules run in the service so every error has a path. */
export const savePromptSchema = z.strictObject({
  expected_revision: z.number().int().min(0),
  instructions: z.string(),
  examples: z.array(z.unknown()),
});
export type SavePromptBody = z.infer<typeof savePromptSchema>;

/** Body of `POST /v1/admin/ai/prompts/{op}/test` (design §7.4). */
export const testPromptSchema = z.strictObject({
  instructions: z.string(),
  examples: z.array(z.unknown()),
  example_ids: z.array(z.uuid().transform((value) => value.toLowerCase())).max(TEST_EXAMPLES_MAX).optional(),
});
export type TestPromptBody = { instructions: string; examples: unknown[]; example_ids?: string[] };

export type PromptView = {
  operation: AiOperation;
  instructions: string;
  examples: PromptExample[];
  revision: number;
  input_fields: string[];
  updated_at: string;
  updated_by: string;
  updated_by_user: UserRef;
  guard: string;
};

export type PromptRevisionView = { revision: number; instructions: string; examples: PromptExample[]; saved_by: string; saved_at: string; saved_by_user: UserRef };

export type { TestItem };

const invalid = (violations: string[]) => new ProblemDetailsException({
  status: 400, type: 'validation-failed', title: 'Validation failed', extensions: { violations },
});
const conflict = () => new ProblemDetailsException({ status: 409, type: 'prompt-revision-conflict', title: 'Prompt changed' });
const isUniqueViolation = (error: unknown) => error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2002';

const SYSTEM_IDS: ReadonlySet<string> = new Set([AI_SYSTEM_ACTOR_ID]);

/** The admin side of prompts (design §7.3–7.4, §12.1 #9–#12). */
@Injectable()
export class PromptsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(PromptsRepository) private readonly prompts: PromptsRepository,
    @Inject(RunnerService) private readonly runner: RunnerService,
    @Inject(SelectionReader) private readonly selections: SelectionReader,
    @Inject(AiAdapterRegistry) private readonly registry: AiAdapterRegistry,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(RateLimiter) private readonly limiter: RateLimiter,
  ) {}

  async get(op: AiOperation): Promise<PromptView> {
    const row = await this.prisma.aiPrompt.findUniqueOrThrow({ where: { operation: op } });
    const emails = await this.identity.emailsOf([row.updatedBy]);
    return {
      operation: op, instructions: row.instructions, examples: row.examples as PromptExample[], revision: row.revision,
      input_fields: [...OPERATIONS[op].inputFields], updated_at: row.updatedAt.toISOString(), updated_by: row.updatedBy,
      updated_by_user: userRef(row.updatedBy, emails, SYSTEM_IDS), guard: PROMPT_GUARD,
    };
  }

  /** Checks in the design's order: the revision, then the content; the prompt and its revision row change together. */
  async save(actorId: string, op: AiOperation, body: SavePromptBody): Promise<PromptView> {
    const now = this.clock.now();
    try {
      await this.prisma.$transaction(async (tx) => {
        const row = await tx.aiPrompt.findUnique({ where: { operation: op } });
        if (!row || row.revision !== body.expected_revision) throw conflict();
        const violations = promptViolations(op, body);
        if (violations.length > 0) throw invalid(violations);
        const examples = body.examples as Prisma.InputJsonArray;
        const { count } = await tx.aiPrompt.updateMany({
          where: { operation: op, revision: body.expected_revision },
          data: { instructions: body.instructions, examples, revision: { increment: 1 }, updatedBy: actorId, updatedAt: now },
        });
        if (count === 0) throw conflict();
        await tx.aiPromptRevision.create({ data: {
          operation: op, revision: body.expected_revision + 1, instructions: body.instructions, examples, savedBy: actorId, savedAt: now,
        } });
      });
    } catch (error) {
      // Two saves of the same revision race on (operation, revision): the loser saw it too late.
      if (isUniqueViolation(error)) throw conflict();
      throw error;
    }
    return this.get(op);
  }

  async revisions(
    op: AiOperation,
    pageSize: number,
    pageToken?: string,
  ): Promise<{ items: PromptRevisionView[]; next_page_token: string | null }> {
    let before: number | undefined;
    if (pageToken !== undefined) {
      const cursor = decodePageToken(pageToken);
      const row = cursor ? await this.prisma.aiPromptRevision.findUnique({ where: { id: cursor.id } }) : null;
      if (!row || row.operation !== op) throw invalid(['page_token: Invalid page token']);
      before = row.revision;
    }
    const rows = await this.prisma.aiPromptRevision.findMany({
      where: { operation: op, ...(before === undefined ? {} : { revision: { lt: before } }) },
      orderBy: { revision: 'desc' },
      take: pageSize + 1,
    });
    const page = rows.slice(0, pageSize);
    const emails = await this.identity.emailsOf(page.map((row) => row.savedBy));
    return {
      items: page.map((row) => ({
        revision: row.revision, instructions: row.instructions, examples: row.examples as PromptExample[], saved_by: row.savedBy,
        saved_at: row.savedAt.toISOString(), saved_by_user: userRef(row.savedBy, emails, SYSTEM_IDS),
      })),
      next_page_token: rows.length > pageSize ? encodePageToken({ id: page[page.length - 1].id }) : null,
    };
  }

  /** Runs the draft at once on up to five inputs with the operation's current choice; nothing is saved to the prompt. */
  async test(actorId: string, op: AiOperation, body: TestPromptBody): Promise<{ items: TestItem[] }> {
    const selection = await this.selections.load(op);
    if (!selection) throw new ProblemDetailsException({ status: 409, type: 'model-not-set', title: 'No model chosen' });
    if (!this.registry.get(selection.provider)) {
      throw new ProblemDetailsException({ status: 409, type: 'provider-not-configured', title: 'Provider not configured' });
    }
    const violations = promptViolations(op, body);
    if (violations.length > 0) throw invalid(violations);
    const inputs = await testInputs(this.prisma, op, body);
    const prompt = { instructions: body.instructions, examples: body.examples as PromptExample[], revision: null };
    // Counted only now: a test refused above (no model, bad draft, no example) costs nothing; the provider is called after.
    await this.limiter.hit('ai.test', actorId);
    const items = await Promise.all(inputs.map(async (input): Promise<TestItem> => toTestItem(input, await this.runner.execute({
      purpose: 'test', operation: op, data: input, actorId, callOperationId: `test-${randomUUID()}`, selection, prompt,
    }))));
    return { items };
  }
}
