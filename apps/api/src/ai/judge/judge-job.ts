import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { EVAL_JOB_CONCURRENCY } from '../ai.constants.js';
import { inPool, oneLine } from '../eval/eval-job.js';
import { RunnerService, type RunReport } from '../runner/runner.service.js';
import { toSelection } from '../runner/to-selection.js';
import { scoresFromOutput } from './judge-output.js';
import { JudgePassesRepository, type PassItemRow, type PassToRun, type RevisionToRun } from './judge-passes.repository.js';
import type { JudgeAnswer, JudgeData } from './judge.types.js';

/** The runner stopped before a provider attempt because admin spend reached today's cap. */
const isAdminCap = (report: RunReport): boolean => report.result.status === 'unavailable' && report.result.reason === 'admin-usd-cap';

/** Why an answer is unusable: the failure's own reason, or its status when it has none. */
const failureOf = (report: RunReport): string => ('reason' in report.result ? report.result.reason : report.result.status);

/** What the item's calls cost: the known costs added up; a call of unknown cost adds nothing (null when there was no call). */
function costOf(report: RunReport): string | null {
  if (report.calls.length === 0) return null;
  return report.calls.reduce((sum, call) => sum + (call.cost_usd === null ? 0 : Number(call.cost_usd)), 0).toFixed(8);
}

/**
 * One judge pass (nhóm B design §5.4, D14): the snapshot items of the pass that have no score yet, up to `EVAL_JOB_CONCURRENCY` at once, each
 * a `judge` call that sees only the input, the output, the criteria and the context (D3). A pass reaching today's usd cap fails alone: the run
 * it belongs to is never touched (B19). Every item is written as soon as it is done, so a resumed pass pays only for what is missing.
 */
@Injectable()
export class JudgeJob {
  constructor(
    @Inject(Clock) private readonly clock: Clock,
    @Inject(JudgePassesRepository) private readonly passes: JudgePassesRepository,
    @Inject(RunnerService) private readonly runner: RunnerService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  async run(passId: string): Promise<void> {
    const pass = await this.passes.start(passId, this.clock.now());
    if (!pass) return;
    try {
      const revision = await this.passes.revisionOf(pass.judgeRevisionId);
      if (!revision?.model) return await this.passes.fail(pass.id, 'model-not-set', this.clock.now());
      const selection = toSelection('judge', revision, revision.model);
      if (selection.price === null) return await this.passes.fail(pass.id, 'model-price-missing', this.clock.now());
      const pending = await this.passes.pendingItems(pass.id);
      let stopped = false;
      let capped = false;
      await inPool(pending, EVAL_JOB_CONCURRENCY, async (item) => {
        // A pass cancelled (or closed as stalled) meanwhile is no longer `running`: no further paid call, nothing written.
        if (!stopped && !(await this.passes.isRunning(pass.id))) stopped = true;
        if (stopped) return;
        const report = await this.judge(pass, revision, selection, item);
        // Today's admin usd cap: this item is not written (it stays to judge) and no further call starts; items already written stay (B19).
        if (isAdminCap(report)) {
          stopped = true;
          capped = true;
          return;
        }
        const succeeded = report.result.status === 'succeeded';
        const rows = scoresFromOutput(
          revision.criteria, succeeded ? (report.result as { result: unknown }).result as JudgeAnswer : null, succeeded ? null : failureOf(report),
        );
        await this.passes.writeScores(
          { id: pass.id, judgeRevisionId: pass.judgeRevisionId }, { id: item.id, subjectKind: item.subjectKind, subjectId: item.subjectId }, rows,
          report.calls.at(-1)?.call_id ?? null, costOf(report), this.clock.now(),
        );
      });
      if (capped) await this.passes.fail(pass.id, 'admin-usd-cap', this.clock.now());
      // `finish` is guarded by `status = 'running'` as well; skipping it just spares a statement.
      else if (!stopped) await this.passes.finish(pass.id, this.clock.now());
    } catch (error) {
      const message = oneLine(error);
      this.logger.warn('ai_judge_pass_failed', { pass_id: pass.id, error: message });
      await this.passes.fail(pass.id, message, this.clock.now());
    }
  }

  /**
   * The data are exactly `{ target_operation, input, output, criteria, context }`: no model, provider, config number, run id or `operation_id` (D3).
   * The call id names the pass and the item, so the calls page can tell whose output a call judged (M3-T13).
   */
  private judge(pass: PassToRun, revision: RevisionToRun, selection: ReturnType<typeof toSelection>, item: PassItemRow): Promise<RunReport> {
    const data: JudgeData = {
      target_operation: pass.operation, input: item.input, output: item.output, criteria: revision.criteria, context: item.context,
    };
    return this.runner.execute({
      purpose: 'judge', operation: 'judge', data, actorId: pass.startedBy, callOperationId: `judge-${pass.id}-${item.id}`, selection,
      prompt: { instructions: revision.instructions, examples: revision.examples, revision: revision.revision },
    });
  }
}
