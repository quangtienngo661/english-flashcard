import type { Job } from 'bullmq';
import { describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../../common/config/app-config.js';
import type { AppLogger } from '../../common/logging/app-logger.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { BackgroundJobsService } from './background-jobs.service.js';
import type { JobHandlerRegistry } from './job-handler.registry.js';
import { JobRunnerService } from './job-runner.service.js';
import { LeaseLostError, type JobHandler } from './job-types.js';

const JOB = '00000000-0000-4000-8000-0000000000c1';

function setup(options: { lease: { epoch: number; attempts: number } | null; run?: JobHandler['run']; attemptsMade?: number }) {
  const backgroundJobs = {
    acquire: vi.fn(async () => options.lease),
    extend: vi.fn(async () => true),
    finish: vi.fn(async () => true),
    release: vi.fn(async () => true),
  };
  const config = { pipeline: { heartbeatSeconds: 3600 } } as unknown as AppConfig;
  const runner = new JobRunnerService(config, {} as PrismaClient, backgroundJobs as unknown as BackgroundJobsService,
    {} as JobHandlerRegistry, { warn: vi.fn(), info: vi.fn() } as unknown as AppLogger);
  const handler = { queue: 'content-publish', run: vi.fn(options.run ?? (async () => 'succeeded' as const)) } satisfies JobHandler;
  const job = { id: JOB, attemptsMade: options.attemptsMade ?? 0, opts: { attempts: 3 } } as unknown as Job;
  const process = () => (runner as unknown as { process(job: Job, handler: JobHandler): Promise<void> }).process(job, handler);
  return { backgroundJobs, handler, process };
}

describe('JobRunnerService.process and a cancelled job', () => {
  it('control: a handler that finishes normally is recorded as finished by the epoch that ran it', async () => {
    const { backgroundJobs, process } = setup({ lease: { epoch: 4, attempts: 1 } });

    await process();

    expect(backgroundJobs.finish).toHaveBeenCalledWith(JOB, 4, 'succeeded');
  });

  it('cancelled while queued: acquire finds no queued job, so the handler never runs and nothing is written', async () => {
    const { backgroundJobs, handler, process } = setup({ lease: null });

    await expect(process()).resolves.toBeUndefined();

    expect(handler.run).not.toHaveBeenCalled();
    expect(backgroundJobs.finish).not.toHaveBeenCalled();
    expect(backgroundJobs.release).not.toHaveBeenCalled();
  });

  it('cancelled while running: the handler ends with LeaseLostError; the runner neither finishes, releases nor rethrows (BullMQ marks the job done)', async () => {
    const { backgroundJobs, process } = setup({ lease: { epoch: 4, attempts: 1 }, run: async () => { throw new LeaseLostError(JOB); } });

    await expect(process()).resolves.toBeUndefined();

    // A `finish(…, 'failed')` here would overwrite "cancelled"; finish also matches on the epoch, which the cancel bumped.
    expect(backgroundJobs.finish).not.toHaveBeenCalled();
    expect(backgroundJobs.release).not.toHaveBeenCalled();
  });

  it('control: any other handler error on the last attempt is still recorded as a failure', async () => {
    const { backgroundJobs, process } = setup({ lease: { epoch: 4, attempts: 3 }, attemptsMade: 2, run: async () => { throw new Error('boom'); } });

    await expect(process()).rejects.toThrow('boom');

    expect(backgroundJobs.finish).toHaveBeenCalledWith(JOB, 4, 'failed', 'Error: boom');
    expect(backgroundJobs.release).not.toHaveBeenCalled();
  });
});
