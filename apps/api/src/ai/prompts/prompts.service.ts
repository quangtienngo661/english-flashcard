import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { userRef, type UserRef } from '../../common/user-ref.js';
import { decodePageToken, encodePageToken } from '../../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
import { AI_SYSTEM_ACTOR_ID, TEST_EXAMPLES_MAX } from '../ai.constants.js';
import type { AiOperation } from '../ai.types.js';
import { OPERATIONS } from '../operations/operations.js';
import { AdminSpend } from '../runner/admin-spend.service.js';
import { RunnerService } from '../runner/runner.service.js';
import { SelectionReader } from '../runner/selection.js';
import { PROMPT_GUARD, promptViolations, type PromptExample } from './prompt-rules.js';
import { PromptsRepository } from './prompts.repository.js';
import { testInputs, toTestItem, type TestItem } from './test-inputs.js';

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

const SYSTEM_IDS: ReadonlySet<string> = new Set([AI_SYSTEM_ACTOR_ID]);

/** The admin side of prompts (design §7.3–7.4, §12.1 #9–#12). */
@Injectable()
export class PromptsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(PromptsRepository) private readonly prompts: PromptsRepository,
    @Inject(RunnerService) private readonly runner: RunnerService,
    @Inject(SelectionReader) private readonly selections: SelectionReader,
    @Inject(AiAdapterRegistry) private readonly registry: AiAdapterRegistry,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(RateLimiter) private readonly limiter: RateLimiter,
    @Inject(AdminSpend) private readonly spend: AdminSpend,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  /** The prompt in use: the live config's text, `revision` = its number, updated when and by whom it was published (nhóm B M2). */
  async get(op: AiOperation): Promise<PromptView> {
    const live = await this.prisma.aiLiveConfig.findUnique({ where: { operation: op }, include: { config: true } });
    if (!live) throw new ProblemDetailsException({ status: 404, type: 'not-found', title: 'Not found' });
    const { config } = live;
    const updatedBy = config.publishedBy ?? config.createdBy;
    const emails = await this.identity.emailsOf([updatedBy]);
    return {
      operation: op, instructions: config.instructions, examples: config.examples as PromptExample[], revision: config.number,
      input_fields: [...OPERATIONS[op].inputFields], updated_at: (config.publishedAt ?? config.createdAt).toISOString(), updated_by: updatedBy,
      updated_by_user: userRef(updatedBy, emails, SYSTEM_IDS), guard: PROMPT_GUARD,
    };
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
    // An unpriced model (E14) or today's usd cap (B20) refuses before the slot is used.
    await this.spend.assertCanStart(selection.price, this.clock.now());
    // Counted only now: a test refused above (no model, bad draft, no example) costs nothing; the provider is called after.
    await this.limiter.hit('ai.test', actorId);
    const items = await Promise.all(inputs.map(async (input): Promise<TestItem> => toTestItem(input, await this.runner.execute({
      purpose: 'test', operation: op, data: input, actorId, callOperationId: `test-${randomUUID()}`, selection, prompt,
    }))));
    return { items };
  }
}
