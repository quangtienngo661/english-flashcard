import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { SettingsService } from '../../settings/index.js';
import type { AdapterOutcome, AdapterRequest } from '../adapters/ai-adapter.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
import { AI_SCHEMA_VERSION, MIN_RETRY_BUDGET_MS, RESULT_TTL_MS } from '../ai.constants.js';
import type { AiMeta, AiOperation, AiPurpose, AiResult, CallOutcome, GatewayOperation } from '../ai.types.js';
import { LiveConfigReader } from '../configs/live-config.reader.js';
import { GATEWAY_DEFINITIONS, OPERATIONS, parseOutput, type OutputCheck } from '../operations/operations.js';
import { assembleInstructions, type PromptExample } from '../prompts/prompt-rules.js';
import { CallLedger } from './call-ledger.service.js';
import { CallQueue, ConcurrencyLimit } from './call-queue.js';
import { callCost } from './cost.js';
import { fingerprint } from './fingerprint.js';
import { OperationsRepository, type OperationRow } from './operations.repository.js';
import { ReadinessService } from './readiness.service.js';
import { callOutcome, classify, decideExisting, decideRetry, drawJitterMs } from './run-rules.js';
import type { Selection } from './selection.js';

type Prompt = { instructions: string; examples: PromptExample[]; revision: number | null };

export type ExecuteInput =
  | { purpose: 'learner'; operation: AiOperation; data: unknown; operationId: string; userId: string; deadlineMs?: number }
  | {
      purpose: 'test' | 'eval';
      operation: AiOperation;
      data: unknown;
      actorId: string;
      callOperationId: string;
      selection?: Selection;
      prompt?: Prompt;
    }
  // A judge has no live config: its revision brings both (nhóm B M3, E3).
  | {
      purpose: 'judge';
      operation: 'judge';
      data: unknown;
      actorId: string;
      callOperationId: string;
      selection: Selection;
      prompt: Prompt;
    };

export type CallSummary = {
  attempt: 1 | 2; outcome: CallOutcome; latency_ms: number; cost_usd: string | null; http_status: number | null;
  /** The `ai_calls` row of this attempt, so a judge score can name its call. */
  call_id: string;
};

export type RunReport = { result: AiResult; calls: CallSummary[]; rawOutput: string | null };

/** What the provider calls of one run came to (design §8.1 steps 5–7). */
type Calls =
  | { kind: 'busy' }
  | { kind: 'out-of-time' }
  | { kind: 'answered'; outcome: AdapterOutcome; check: OutputCheck | null };

type CallContext = {
  operation: GatewayOperation;
  data: unknown;
  selection: Selection;
  prompt: Prompt;
  purpose: AiPurpose;
  callOperationId: string;
  aiOperationId: string | null;
  userId: string;
  deadline: number;
  retentionDays: number;
};

/**
 * One run of one operation (design §8.1). The learner path keeps `ai_operations` so one operation id gives at most one provider
 * call at a time and replays its result for 24 h; the test and eval paths of an admin skip that table, the switch and the cap.
 * Every write is a single statement: nothing holds a transaction while a provider is called (R9). Elapsed time is
 * `performance.now()`; stored times come from `Clock`.
 */
@Injectable()
export class RunnerService {
  constructor(
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(OperationsRepository) private readonly operations: OperationsRepository,
    @Inject(ReadinessService) private readonly readiness: ReadinessService,
    @Inject(LiveConfigReader) private readonly liveConfigs: LiveConfigReader,
    @Inject(AiAdapterRegistry) private readonly registry: AiAdapterRegistry,
    @Inject(CallLedger) private readonly ledger: CallLedger,
    @Inject(CallQueue) private readonly queue: CallQueue,
    @Inject(ConcurrencyLimit) private readonly limit: ConcurrencyLimit,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  execute(input: ExecuteInput): Promise<RunReport> {
    return input.purpose === 'learner' ? this.learner(input) : this.admin(input);
  }

  private async learner(input: Extract<ExecuteInput, { purpose: 'learner' }>): Promise<RunReport> {
    const { operation, data, operationId, userId } = input;
    const { ai } = await this.settings.get();
    this.limit.value = ai.maxConcurrentCalls;
    const budget = Math.min(ai.callTimeoutSeconds * 1000, input.deadlineMs ?? Number.POSITIVE_INFINITY);
    const deadline = performance.now() + budget;
    const startedAt = this.clock.now();
    const deadlineAt = new Date(startedAt.getTime() + budget);
    const attemptId = randomUUID();
    const print = fingerprint(operation, data);
    const only = (result: AiResult): RunReport => ({ result, calls: [], rawOutput: null });

    // (1) The row of this id, if any.
    let rowId: string | null = null;
    const existing = await this.operations.find(userId, operationId, startedAt);
    const decision = decideExisting({ row: existing, fingerprint: print, now: startedAt });
    if (decision.action === 'reclaim') {
      if (!(await this.operations.reclaim((existing as OperationRow).id, decision.oldAttemptId, attemptId, startedAt, deadlineAt))) {
        return only({ status: 'in_progress', operation_id: operationId });
      }
      rowId = (existing as OperationRow).id;
    } else if (decision.action !== 'claim') {
      return only(this.answerExisting(decision.action, existing as OperationRow, operationId));
    }

    // (2) The input rules of the operation: a bad input is final and kept 24 h.
    if (!OPERATIONS[operation].validateInput(data).ok) {
      const result: AiResult = { status: 'permanent_failure', operation_id: operationId, reason: 'bad-input' };
      const finishedAt = this.clock.now();
      const expiresAt = new Date(finishedAt.getTime() + RESULT_TTL_MS);
      if (rowId) {
        await this.keep(rowId, attemptId, { status: 'permanent_failure', result, meta: null, finishedAt, expiresAt }, operationId);
      } else {
        await this.operations.storeFinal({
          userId, operationId, operation, fingerprint: print, attemptId, startedAt, deadlineAt, result, finishedAt, expiresAt,
        });
      }
      return only(result);
    }

    // (3) Switch, model, provider, daily cap; never stored.
    const ready = await this.readiness.check(operation, 'learner', startedAt);
    if (!ready.ready) {
      if (rowId) await this.release(rowId, attemptId, operationId);
      const { reason, retry_after_seconds } = ready;
      return only({
        status: 'unavailable', operation_id: operationId, reason, ...(retry_after_seconds === undefined ? {} : { retry_after_seconds }),
      });
    }
    const { prompt } = ready;

    // (4) Claim the id unless step 1 reclaimed it; a caller that claimed first wins.
    if (!rowId) {
      rowId = await this.operations.claim({ userId, operationId, operation, fingerprint: print, attemptId, startedAt, deadlineAt });
      if (!rowId) {
        const again = await this.operations.find(userId, operationId, startedAt);
        const next = decideExisting({ row: again, fingerprint: print, now: startedAt });
        if (next.action === 'replay' || next.action === 'input-mismatch') {
          return only(this.answerExisting(next.action, again as OperationRow, operationId));
        }
        return only({ status: 'in_progress', operation_id: operationId });
      }
    }

    // (5)–(7) Queue, calls, shape.
    const summaries: CallSummary[] = [];
    let rawOutput: string | null = null;
    const calls = await this.callProvider({
      operation, data, selection: ready.selection, prompt, purpose: 'learner', callOperationId: operationId, aiOperationId: rowId,
      userId, deadline, retentionDays: ai.contentRetentionDays,
    }, summaries, (text) => { rawOutput = text; });
    const result = this.toResult(calls, operationId, ready.selection, prompt);

    // (8) Keep a success or a failure that depends on the data; drop the rest so the next call runs again.
    const keepIt = result.status === 'succeeded'
      || (calls.kind === 'answered' && result.status === 'permanent_failure' && this.classifyAnswered(calls).store);
    if (keepIt) {
      const finishedAt = this.clock.now();
      await this.keep(rowId, attemptId, {
        status: result.status as 'succeeded' | 'permanent_failure',
        result: result.status === 'succeeded' ? { ...result, meta: undefined } : result,
        meta: result.status === 'succeeded' ? result.meta : null,
        finishedAt,
        expiresAt: new Date(finishedAt.getTime() + RESULT_TTL_MS),
      }, operationId);
    } else {
      await this.release(rowId, attemptId, operationId);
    }
    return { result, calls: summaries, rawOutput };
  }

  private async admin(input: Extract<ExecuteInput, { purpose: 'test' | 'eval' | 'judge' }>): Promise<RunReport> {
    const { operation, data, callOperationId } = input;
    const only = (result: AiResult): RunReport => ({ result, calls: [], rawOutput: null });
    if (!GATEWAY_DEFINITIONS[operation].validateInput(data).ok) {
      return only({ status: 'permanent_failure', operation_id: callOperationId, reason: 'bad-input' });
    }
    const { ai } = await this.settings.get();
    this.limit.value = ai.maxConcurrentCalls;
    const deadline = performance.now() + ai.callTimeoutSeconds * 1000;
    // The live config is read once, and only for what the caller did not bring (a config run brings both).
    const live = input.purpose === 'judge' || (input.selection && input.prompt) ? null : await this.liveConfigs.load(input.operation);
    const selection = input.selection ?? live?.selection ?? null;
    if (!selection) return only({ status: 'unavailable', operation_id: callOperationId, reason: 'model-not-set' });
    if (!this.registry.get(selection.provider)) {
      return only({ status: 'unavailable', operation_id: callOperationId, reason: 'provider-not-configured' });
    }
    const prompt = input.prompt ?? live!.prompt;
    const summaries: CallSummary[] = [];
    let rawOutput: string | null = null;
    const calls = await this.callProvider({
      operation, data, selection, prompt, purpose: input.purpose, callOperationId, aiOperationId: null, userId: input.actorId,
      deadline, retentionDays: ai.contentRetentionDays,
    }, summaries, (text) => { rawOutput = text; });
    return { result: this.toResult(calls, callOperationId, selection, prompt), calls: summaries, rawOutput };
  }

  /** The slot is held across both attempts and released once (design §8.4); each call is recorded before the retry decision. */
  private async callProvider(context: CallContext, summaries: CallSummary[], onText: (text: string | null) => void): Promise<Calls> {
    const adapter = this.registry.get(context.selection.provider);
    const release = adapter ? await this.queue.acquire(context.deadline) : null;
    if (!adapter || !release) return { kind: 'busy' };
    try {
      if (context.deadline - performance.now() < MIN_RETRY_BUDGET_MS) return { kind: 'busy' };
      const { selection, prompt, operation } = context;
      const instructions = assembleInstructions(prompt.instructions, prompt.examples);
      const schema = GATEWAY_DEFINITIONS[operation].outputSchema;
      for (const attempt of [1, 2] as const) {
        const leftMs = Math.floor(context.deadline - performance.now());
        if (leftMs < 1) return { kind: 'out-of-time' };
        const request: AdapterRequest = {
          model: selection.modelId, instructions, data: context.data, schema, effort: selection.effort, thinking: selection.thinking,
          maxOutputTokens: selection.maxOutputTokens, timeoutMs: leftMs,
        };
        const sentAt = performance.now();
        const outcome = await adapter.call(request, AbortSignal.timeout(leftMs));
        const latencyMs = Math.round(performance.now() - sentAt);
        const check = outcome.kind === 'ok' ? parseOutput(operation, outcome.text) : null;
        const text = outcome.kind === 'error' ? null : outcome.text;
        onText(text);
        const usage = outcome.kind === 'error' ? null : outcome.usage;
        const recorded = callOutcome(outcome, check === null || check.ok ? 'ok' : 'invalid');
        const callId = await this.ledger.record({
          operationId: context.callOperationId, aiOperationId: context.aiOperationId, attempt, purpose: context.purpose, operation,
          provider: selection.provider, model: selection.modelId, effort: selection.effort, thinking: selection.thinking,
          maxOutputTokens: selection.maxOutputTokens, promptRevision: prompt.revision, outcome: recorded,
          httpStatus: outcome.kind === 'error' ? outcome.httpStatus : null,
          providerErrorCode: outcome.kind === 'error' ? outcome.providerErrorCode : null, latencyMs, usage,
          providerRequestId: outcome.providerRequestId, userId: context.userId, price: selection.price,
        }, {
          request: {
            instructions, data: context.data, schema_name: schema.name, effort: selection.effort, thinking: selection.thinking,
            max_output_tokens: selection.maxOutputTokens,
          },
          response: text,
        }, context.retentionDays, this.clock.now());
        summaries.push({
          attempt, outcome: recorded, latency_ms: latencyMs, cost_usd: callCost(usage, selection.price).costUsd,
          http_status: outcome.kind === 'error' ? outcome.httpStatus : null, call_id: callId,
        });
        if (outcome.kind === 'error' && outcome.error === 'provider_quota') {
          this.logger.warn('ai_provider_quota', { provider: selection.provider, model: selection.modelId });
        }
        const retry = decideRetry({
          outcome, attempt, elapsedMs: latencyMs, remainingMs: context.deadline - performance.now(), jitterMs: drawJitterMs(),
        });
        if (!retry.retry) return { kind: 'answered', outcome, check };
        await sleep(retry.waitMs);
      }
      return { kind: 'out-of-time' };
    } finally {
      release();
    }
  }

  private classifyAnswered(calls: Extract<Calls, { kind: 'answered' }>) {
    const { outcome } = calls;
    if (outcome.kind === 'ok') return classify({ kind: 'invalid-shape' });
    return classify(outcome);
  }

  private toResult(calls: Calls, operationId: string, selection: Selection, prompt: Prompt): AiResult {
    if (calls.kind === 'busy') return { status: 'transient_failure', operation_id: operationId, reason: 'busy' };
    if (calls.kind === 'out-of-time') return { status: 'transient_failure', operation_id: operationId, reason: 'timeout' };
    if (calls.outcome.kind === 'ok' && calls.check?.ok) {
      const meta: AiMeta = {
        operation: selection.operation, provider: selection.provider, model: selection.modelId, effort: selection.effort,
        prompt_revision: prompt.revision, schema_version: AI_SCHEMA_VERSION, replayed: false,
      };
      return { status: 'succeeded', operation_id: operationId, result: calls.check.value, meta };
    }
    const failure = this.classifyAnswered(calls);
    return { status: failure.status, operation_id: operationId, reason: failure.reason } as AiResult;
  }

  /** A stored result (replay) or the id's other data (input-mismatch); `in-progress` for anything else. */
  private answerExisting(action: 'replay' | 'input-mismatch' | 'in-progress', row: OperationRow, operationId: string): AiResult {
    if (action === 'input-mismatch') return { status: 'permanent_failure', operation_id: operationId, reason: 'input-mismatch' };
    if (action === 'in-progress') return { status: 'in_progress', operation_id: operationId };
    const stored = row.result as AiResult;
    if (stored.status !== 'succeeded') return stored;
    return { ...stored, meta: { ...(row.meta as AiMeta), replayed: true } };
  }

  private async keep(
    rowId: string,
    attemptId: string,
    done: Parameters<OperationsRepository['finish']>[2],
    operationId: string,
  ): Promise<void> {
    if (!(await this.operations.finish(rowId, attemptId, done))) this.lost(operationId);
  }

  private async release(rowId: string, attemptId: string, operationId: string): Promise<void> {
    if (!(await this.operations.drop(rowId, attemptId))) this.lost(operationId);
  }

  /** Another caller reclaimed the row meanwhile: its write wins (B6E80). */
  private lost(operationId: string): void {
    this.logger.warn('ai_operation_lost', { ai_op: operationId });
  }
}
