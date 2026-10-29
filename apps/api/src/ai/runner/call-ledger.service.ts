import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { localDate, zonedMidnight } from '../../common/time/local-date.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import type { Usage } from '../adapters/ai-adapter.js';
import { AI_DAY_ZONE } from '../ai.constants.js';
import type { AiProviderName, AiPurpose, CallOutcome, GatewayOperation } from '../ai.types.js';
import { callCost, type Price } from './cost.js';

export type CallRecord = {
  operationId: string;
  aiOperationId: string | null;
  attempt: 1 | 2;
  purpose: AiPurpose;
  operation: GatewayOperation;
  provider: AiProviderName;
  model: string;
  effort: string | null;
  thinking: string | null;
  maxOutputTokens: number | null;
  promptRevision: number | null;
  outcome: CallOutcome;
  httpStatus: number | null;
  providerErrorCode: string | null;
  latencyMs: number;
  usage: Usage | null;
  providerRequestId: string | null;
  userId: string | null;
  price: Price | null;
};

const DAY_MS = 86_400_000;

/** The cost ledger and the 7-day content of each provider call (design §9). Content never reaches a log (SR10). */
@Injectable()
export class CallLedger {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /** Learner provider calls since 00:00 in Vietnam, every outcome: what the daily cap limits (D24; nhóm B M3, B21). */
  countToday(now: Date): Promise<number> {
    const since = zonedMidnight(AI_DAY_ZONE, localDate(AI_DAY_ZONE, now));
    return this.prisma.aiCall.count({ where: { createdAt: { gte: since }, purpose: 'learner' } });
  }

  /** What admin work (test, eval, judge) cost since 00:00 in Vietnam, in USD; calls of unknown cost add nothing (nhóm B M3, B20). */
  async adminSpentToday(now: Date): Promise<number> {
    const since = zonedMidnight(AI_DAY_ZONE, localDate(AI_DAY_ZONE, now));
    const [row] = await this.prisma.$queryRaw<Array<{ spent: string }>>`
      SELECT coalesce(sum(cost_usd), 0)::numeric(20, 8)::text AS spent FROM ai_calls
      WHERE created_at >= ${since} AND purpose IN ('test', 'eval', 'judge')`;
    return Number(row!.spent);
  }

  /** One `ai_calls` row, and its content when `retentionDays > 0`, in one short transaction (after the call, never during it). */
  async record(
    call: CallRecord,
    content: { request: unknown; response: string | null },
    retentionDays: number,
    now: Date,
  ): Promise<string> {
    const id = randomUUID();
    const { costUsd, known } = callCost(call.usage, call.price);
    const writes: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.aiCall.create({
        data: {
          id,
          operationId: call.operationId,
          aiOperationId: call.aiOperationId,
          attempt: call.attempt,
          purpose: call.purpose,
          operation: call.operation,
          provider: call.provider,
          model: call.model,
          effort: call.effort,
          thinking: call.thinking,
          maxOutputTokens: call.maxOutputTokens,
          promptRevision: call.promptRevision,
          outcome: call.outcome,
          httpStatus: call.httpStatus,
          providerErrorCode: call.providerErrorCode,
          latencyMs: call.latencyMs,
          inputTokens: call.usage?.inputTokens ?? null,
          cachedInputTokens: call.usage?.cachedInputTokens ?? null,
          outputTokens: call.usage?.outputTokens ?? null,
          reasoningTokens: call.usage?.reasoningTokens ?? null,
          costUsd,
          costKnown: known,
          providerRequestId: call.providerRequestId,
          userId: call.userId,
          createdAt: now,
        },
      }),
    ];
    if (retentionDays > 0) {
      writes.push(this.prisma.aiCallContent.create({
        data: {
          callId: id,
          request: content.request as Prisma.InputJsonValue,
          response: content.response,
          expiresAt: new Date(now.getTime() + retentionDays * DAY_MS),
        },
      }));
    }
    await this.prisma.$transaction(writes);
    // Field names avoid the logger's redaction pattern (`token`, `code`, …) and `operation_id` (the request's own; plan choice 12).
    this.logger.info('ai_call', {
      ai_op: call.operationId,
      operation: call.operation,
      purpose: call.purpose,
      provider: call.provider,
      model: call.model,
      attempt: call.attempt,
      outcome: call.outcome,
      latency_ms: call.latencyMs,
      usage_in: call.usage?.inputTokens ?? null,
      usage_cached: call.usage?.cachedInputTokens ?? null,
      usage_out: call.usage?.outputTokens ?? null,
      usage_reasoning: call.usage?.reasoningTokens ?? null,
      http_status: call.httpStatus,
      provider_error: call.providerErrorCode,
    });
    return id;
  }
}
