import { Inject, Injectable, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Clock } from '../clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { AppLogger } from '../logging/app-logger.js';
import { runWithOperationId } from '../logging/request-context.js';

const HOURLY = 3_600_000;

/**
 * Runs registered cleanup jobs every hour inside the API process (design §7). Each module registers
 * its own job so cleanup of a module's tables stays inside that module (D3). Running the same job on
 * several instances at once is harmless: every job only deletes or nulls expired rows.
 */
@Injectable()
export class MaintenanceScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly jobs = new Map<string, (now: Date) => Promise<unknown>>();
  private timer: NodeJS.Timeout | undefined;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  register(name: string, job: (now: Date) => Promise<unknown>): void {
    this.jobs.set(name, job);
  }

  jobNames(): string[] {
    return [...this.jobs.keys()];
  }

  isRunning(): boolean {
    return this.timer !== undefined;
  }

  /** Runs every job once with the same `now`; a failing job is logged and does not stop the others. */
  async runAll(): Promise<void> {
    const now = this.clock.now();
    for (const [name, job] of this.jobs) {
      await runWithOperationId(randomUUID(), async () => {
        try {
          await job(now);
        } catch (err) {
          this.logger.error('maintenance_job_failed', err, { job: name });
        }
      });
    }
  }

  onApplicationBootstrap(): void {
    if (!this.config.maintenanceEnabled) return;
    this.timer = setInterval(() => { void this.runAll(); }, HOURLY);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }
}
