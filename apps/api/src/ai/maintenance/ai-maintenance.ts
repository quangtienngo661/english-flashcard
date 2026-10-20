import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { MaintenanceScheduler } from '../../common/maintenance/maintenance.scheduler.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
import { AI_DESCRIBE_TIMEOUT_MS, EVAL_QUEUED_RECOVER_MS, EVAL_RUNNING_STALE_MS, MODEL_REFRESH_AFTER_MS } from '../ai.constants.js';
import type { AiProviderName } from '../ai.types.js';
import { EvalQueue } from '../eval/eval-queue.service.js';

/**
 * The AI module's hourly jobs (design §14). Each statement is conditional, so two processes running them at once is harmless; a
 * provider is called only after a model's refresh is claimed and outside any transaction (design §4.4).
 */
@Injectable()
export class AiMaintenance implements OnModuleInit {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(MaintenanceScheduler) private readonly scheduler: MaintenanceScheduler,
    @Inject(AiAdapterRegistry) private readonly registry: AiAdapterRegistry,
    @Inject(EvalQueue) private readonly queue: EvalQueue,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  onModuleInit(): void {
    this.scheduler.register('ai.operations-expire', (now) => this.prisma.$executeRaw`
      DELETE FROM ai_operations WHERE expires_at <= ${now}
        OR (status = 'running' AND deadline_at + interval '20 seconds' <= ${now})`);
    this.scheduler.register('ai.contents-expire', (now) => this.prisma.$executeRaw`
      DELETE FROM ai_call_contents WHERE expires_at <= ${now}`);
    this.scheduler.register('ai.models-refresh', (now) => this.refreshModels(now));
    this.scheduler.register('ai.eval-runs-recover', (now) => this.recoverEvalRuns(now));
  }

  /** Each model is claimed first, so two processes never describe the same model in the same hour (B6E95). */
  private async refreshModels(now: Date): Promise<void> {
    const rows = await this.prisma.aiModel.findMany({
      where: { infoCheckedAt: { lt: new Date(now.getTime() - MODEL_REFRESH_AFTER_MS) } }, orderBy: { id: 'asc' },
    });
    for (const row of rows) {
      const provider = row.provider as AiProviderName;
      const adapter = this.registry.get(provider);
      if (!adapter) continue;
      // The 24 h are recomputed in SQL: timestamptz keeps microseconds, a JS Date only milliseconds (plan review #15).
      const claimed = await this.prisma.$queryRaw<Array<{ id: string }>>`
        UPDATE ai_models SET info_checked_at = ${now} WHERE id = ${row.id}::uuid AND info_checked_at < ${now}::timestamptz - interval '24 hours' RETURNING id`;
      if (claimed.length === 0) continue;
      try {
        const description = await adapter.describeModel(row.modelId, AbortSignal.timeout(AI_DESCRIBE_TIMEOUT_MS));
        if (description.kind !== 'found') {
          this.logger.warn('ai_model_refresh_failed', { model_ref: row.id, provider, kind: description.kind });
          continue;
        }
        const { info } = description;
        await this.prisma.aiModel.update({ where: { id: row.id }, data: {
          shutdownAt: info.shutdownAt, lifecycle: info.lifecycle, effortLevels: info.effortLevels, thinkingOff: info.thinkingOff,
          structuredOutputs: info.structuredOutputs, maxOutputTokens: info.maxOutputTokens,
        } });
      } catch {
        // An adapter never throws; a database error on one model must not stop the others.
        this.logger.warn('ai_model_refresh_failed', { model_ref: row.id, provider, kind: 'error' });
      }
    }
  }

  /** A run Redis never took is enqueued again (B6E91, job id = run id); a run whose worker died is closed (B6E92). */
  private async recoverEvalRuns(now: Date): Promise<void> {
    const queued = await this.prisma.aiEvalRun.findMany({
      where: { status: 'queued', createdAt: { lt: new Date(now.getTime() - EVAL_QUEUED_RECOVER_MS) } }, select: { id: true },
    });
    for (const run of queued) await this.queue.enqueue(run.id);
    await this.prisma.$executeRaw`
      UPDATE ai_eval_runs SET status = 'failed', error = 'stalled', finished_at = ${now}
      WHERE status = 'running' AND heartbeat_at < ${new Date(now.getTime() - EVAL_RUNNING_STALE_MS)}`;
  }
}
