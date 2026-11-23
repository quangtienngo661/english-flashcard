import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../clock/clock.js';
import type { AppConfig } from '../config/app-config.js';
import { AppLogger } from '../logging/app-logger.js';
import { MaintenanceScheduler } from './maintenance.scheduler.js';

describe('MaintenanceScheduler (OPS-04)', () => {
  it('calls onRunFinished listener once with clock.now() after all jobs even when a job throws', async () => {
    const now = new Date('2026-11-23T12:00:00Z');
    const clock = new FakeClock(now);
    const logger = new AppLogger({ write: () => {} });
    const scheduler = new MaintenanceScheduler({ maintenanceEnabled: false } as AppConfig, clock, logger);

    const ran: string[] = [];
    scheduler.register('failing-job', async () => {
      ran.push('failing-job');
      throw new Error('boom');
    });
    scheduler.register('ok-job', async () => {
      ran.push('ok-job');
    });

    const finished = vi.fn();
    scheduler.onRunFinished(finished);

    await scheduler.runAll();

    expect(ran).toEqual(['failing-job', 'ok-job']);
    expect(finished).toHaveBeenCalledTimes(1);
    expect(finished).toHaveBeenCalledWith(now);
  });
});
