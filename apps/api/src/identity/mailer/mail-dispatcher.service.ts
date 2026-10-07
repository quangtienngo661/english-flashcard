import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { AppLogger } from '../../common/logging/app-logger.js';
import { getOperationId, runWithOperationId } from '../../common/logging/request-context.js';
import { MailBudget } from './mail-budget.service.js';
import { Mailer, type MailMessage } from './mailer.js';

export type MailJob = () => Promise<MailMessage | null>;

export function sendPrepared(msg: MailMessage | null): MailJob {
  return async () => msg;
}

@Injectable()
export class MailDispatcher implements OnApplicationShutdown {
  private readonly batches = new Set<Promise<void>>();

  constructor(
    @Inject(Mailer) private readonly mailer: Mailer,
    @Inject(MailBudget) private readonly budget: MailBudget,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  afterResponse(res: Response, jobs: MailJob[]): void {
    if (jobs.length === 0) return;
    const start = this.register(jobs);
    // A client may have disconnected while the caller was committing its work.
    // In that case close has already fired, and the committed mail can run now.
    if (res.closed) start();
    else res.once('close', start);
  }

  runNow(jobs: MailJob[]): void {
    if (jobs.length > 0) this.register(jobs)();
  }

  /** Runs after Nest closed the HTTP server (enableShutdownHooks), so pending batches have started. */
  async onApplicationShutdown(): Promise<void> {
    await this.drain();
  }

  async drain(): Promise<void> {
    // Include batches registered during the wait as well as pending responses.
    while (this.batches.size > 0) await Promise.all([...this.batches]);
  }

  private register(jobs: MailJob[]): () => void {
    const operationId = getOperationId() ?? randomUUID();
    const registeredJobs = [...jobs];
    let resolve!: () => void;
    const settled = new Promise<void>((done) => { resolve = done; });
    this.batches.add(settled);
    const finish = () => {
      this.batches.delete(settled);
      resolve();
    };
    return () => {
      const running = runWithOperationId(operationId, () => this.dispatch(registeredJobs));
      // Both branches settle the batch; even a failing log sink cannot leave an
      // unhandled rejection or prevent shutdown/drain from completing.
      void running.then(finish, finish);
    };
  }

  private async dispatch(jobs: MailJob[]): Promise<void> {
    for (const job of jobs) {
      try {
        const msg = await job();
        if (msg === null) continue;
        if (!await this.budget.tryConsume()) {
          this.logger.error('mail_send_failed', {
            name: 'MailBudgetExceeded', code: 'MAIL_BUDGET_EXHAUSTED',
          });
          continue;
        }
        await this.mailer.send(msg);
      } catch (err) {
        this.logger.error('mail_send_failed', err);
      }
    }
  }
}
