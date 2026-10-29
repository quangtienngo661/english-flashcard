import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../common/clock/clock.js';
import { PRISMA_CLIENT } from '../common/db/prisma.module.js';
import { Prisma, type PrismaClient } from '../generated/prisma/client.js';
import { OPERATION_ID_PATTERN } from './ai.constants.js';
import type { AiOperation, AiReadiness, AiResult } from './ai.types.js';
import { LiveConfigReader } from './configs/live-config.reader.js';
import { EvalExamplesService, type ExampleFromSource } from './eval/eval-examples.service.js';
import { EvalRulesRegistry, type EvalRules } from './eval/eval-rules.port.js';
import { JudgePassesService } from './judge/judge-passes.service.js';
import { JudgeScoresReader } from './judge/judge-scores.reader.js';
import type { JudgeSubject } from './judge/judge.types.js';
import { JudgesService } from './judge/judges.service.js';
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
    @Inject(EvalRulesRegistry) private readonly evalRules: EvalRulesRegistry,
    @Inject(EvalExamplesService) private readonly evalExamples: EvalExamplesService,
    @Inject(LiveConfigReader) private readonly liveConfigs: LiveConfigReader,
    @Inject(JudgePassesService) private readonly judgePasses: JudgePassesService,
    @Inject(JudgesService) private readonly judges: JudgesService,
    @Inject(JudgeScoresReader) private readonly judgeScores: JudgeScoresReader,
  ) {}

  /** Practice hands its rules and catalog forms to eval runs here (nhóm B design §5.2); `ai` never imports Practice or Content. */
  registerEvalRules(rules: EvalRules): void {
    this.evalRules.register(rules);
  }

  /**
   * Another module puts an example into the eval set (contract §4, D27.3): always a dev example, with where it came from. Refused
   * like any other example: a bad input is a 400, a missing or wrong expected answer a 422.
   */
  createEvalExample(args: ExampleFromSource): Promise<{ id: string }> {
    return this.evalExamples.createFromSource(args);
  }

  /**
   * The number of the config an operation runs now and the model's id, for a caller that records which config made something (contract §4).
   * `null` when the operation has no live config (a deployment before the switch-over).
   */
  async liveConfigNumber(op: AiOperation): Promise<{ number: number; model: string | null } | null> {
    const live = await this.liveConfigs.find(op);
    return live ? { number: live.number, model: live.selection?.modelId ?? null } : null;
  }

  /**
   * Starts a judge pass over real questions a caller chose (contract §4, M4): `filters.operation` names the one operation the judge scores. Subjects the
   * judge's newest revision has already judged are left out; the pass is queued for the worker, and no provider is called here.
   */
  startJudgePass(args: { judgeId: string; kind: 'real'; filters: Record<string, unknown>; subjects: JudgeSubject[]; actorId: string }): Promise<{ passId: string }> {
    return this.judgePasses.createReal(args);
  }

  /** The newest revision of a judge (the one a pass would use now), or null for an unknown judge (contract §4). */
  latestJudgeRevision(judgeId: string): Promise<{ id: string; revision: number } | null> {
    return this.judges.latestRevision(judgeId);
  }

  /** Which of these subjects the judge revision has already judged completely (contract §4). */
  judgedSubjects(judgeRevisionId: string, subjectIds: string[]): Promise<Set<string>> {
    return this.judgeScores.judgedSubjects(judgeRevisionId, subjectIds);
  }

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
  async deleteUserData(userId: string, tx?: Prisma.TransactionClient): Promise<void> {
    if (tx) {
      // Inside the account deletion's transaction, in the same order.
      await tx.$executeRaw`DELETE FROM ai_call_contents c USING ai_calls a WHERE c.call_id = a.id AND a.user_id = ${userId}::uuid`;
      await tx.$executeRaw`DELETE FROM ai_operations WHERE user_id = ${userId}::uuid`;
      await tx.$executeRaw`UPDATE ai_calls SET user_id = NULL WHERE user_id = ${userId}::uuid`;
      return;
    }
    await this.prisma.$transaction([
      this.prisma.$executeRaw`DELETE FROM ai_call_contents c USING ai_calls a WHERE c.call_id = a.id AND a.user_id = ${userId}::uuid`,
      this.prisma.$executeRaw`DELETE FROM ai_operations WHERE user_id = ${userId}::uuid`,
      this.prisma.$executeRaw`UPDATE ai_calls SET user_id = NULL WHERE user_id = ${userId}::uuid`,
    ]);
  }

  /**
   * Per operation, over learner calls whose first valid answer was recorded in `[start, end)` (the AI dashboard): `first_answers` =
   * operation ids with a succeeded call (not a `#2` id); `second_tries` = those that have a call under `<id>#2`. Practice sends `#2`
   * only after its own rules rejected a valid first answer (D11), so `second_tries` counts first-try rejections that were asked
   * again. A rejection whose second call never reached a provider (AI switched off, cap reached or queue busy in between) has no
   * `#2` row and is not counted. Totals only: no id or user leaves this method.
   */
  secondTries(range: { start: Date; end: Date }): Promise<Array<{ operation: AiOperation; first_answers: number; second_tries: number }>> {
    return this.prisma.$queryRaw<Array<{ operation: AiOperation; first_answers: number; second_tries: number }>>(Prisma.sql`
      SELECT f.operation, count(*)::int AS first_answers,
        (count(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM ai_calls r WHERE r.operation_id = f.operation_id || '#2' AND r.purpose = 'learner')))::int AS second_tries
      FROM (
        SELECT DISTINCT operation, operation_id FROM ai_calls
        WHERE purpose = 'learner' AND outcome = 'succeeded' AND operation_id NOT LIKE '%#2'
          AND created_at >= ${range.start} AND created_at < ${range.end}
      ) f
      GROUP BY f.operation ORDER BY f.operation`);
  }

  /** One test call with the current selection and prompt (plan choice 23; the CLI's `--purpose test`). */
  runAdminTest(op: AiOperation, data: unknown, actorId: string): Promise<RunReport> {
    return this.runner.execute({ purpose: 'test', operation: op, data, actorId, callOperationId: `test-${randomUUID()}` });
  }
}
