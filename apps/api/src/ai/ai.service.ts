import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../common/clock/clock.js';
import { PRISMA_CLIENT } from '../common/db/prisma.module.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import { OPERATION_ID_PATTERN } from './ai.constants.js';
import type { AiOperation, AiReadiness, AiResult } from './ai.types.js';
import { ReadinessService } from './runner/readiness.service.js';
import { RunnerService, type RunReport } from './runner/runner.service.js';

const LOWER_CASE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** What other modules may call (design §12.2). Never call `run` inside a caller's transaction. */
@Injectable()
export class AiService {
  constructor(
    @Inject(RunnerService) private readonly runner: RunnerService,
    @Inject(ReadinessService) private readonly readiness: ReadinessService,
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  async isReady(op: AiOperation): Promise<AiReadiness> {
    const check = await this.readiness.check(op, 'learner', this.clock.now());
    if (check.ready) return { ready: true };
    const { reason, retry_after_seconds } = check;
    return { ready: false, reason, ...(retry_after_seconds === undefined ? {} : { retry_after_seconds }) };
  }

  /** A malformed operation id or user id is a caller bug, not an `AiResult` (plan choice 19). */
  async run(
    op: AiOperation,
    data: unknown,
    options: { operationId: string; userId: string; purpose: 'learner'; deadlineMs?: number },
  ): Promise<AiResult> {
    if (!OPERATION_ID_PATTERN.test(options.operationId)) throw new TypeError('operationId does not match OPERATION_ID_PATTERN');
    if (!LOWER_CASE_UUID.test(options.userId)) throw new TypeError('userId must be a lower-case uuid');
    const report = await this.runner.execute({ ...options, operation: op, data });
    return report.result;
  }

  /** Account deletion (Bước 8; design §12.2, R14): the content, then the replay rows, then the ledger's link to the user. */
  async deleteUserData(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.$executeRaw`DELETE FROM ai_call_contents c USING ai_calls a WHERE c.call_id = a.id AND a.user_id = ${userId}::uuid`,
      this.prisma.$executeRaw`DELETE FROM ai_operations WHERE user_id = ${userId}::uuid`,
      this.prisma.$executeRaw`UPDATE ai_calls SET user_id = NULL WHERE user_id = ${userId}::uuid`,
    ]);
  }

  /** One test call with the current selection and prompt (plan choice 23; the CLI's `--purpose test`). */
  runAdminTest(op: AiOperation, data: unknown, actorId: string): Promise<RunReport> {
    return this.runner.execute({ purpose: 'test', operation: op, data, actorId, callOperationId: `test-${randomUUID()}` });
  }
}
