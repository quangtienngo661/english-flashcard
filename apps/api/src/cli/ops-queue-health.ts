import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { existsSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EVAL_QUEUE } from '../ai/eval/eval-queue.service.js';
import { loadConfig } from '../common/config/app-config.js';
import { TTS_QUEUE } from '../content/audio/tts-queue.service.js';
import type { JobQueueName } from '../content-pipeline/jobs/job-types.js';
import { REMINDER_QUEUE } from '../notifications/scheduler/reminder-queue.service.js';

const PIPELINE_QUEUES: readonly JobQueueName[] = ['content-import', 'content-publish', 'content-inflections'];

export const MONITORED_QUEUES: readonly string[] = [
  ...PIPELINE_QUEUES,
  TTS_QUEUE,
  REMINDER_QUEUE,
  EVAL_QUEUE,
];

/** Returns floored seconds since the oldest waiting job timestamp, or null when empty. */
export function oldestWaitingSeconds(timestampsMs: number[], nowMs: number): number | null {
  if (timestampsMs.length === 0) return null;
  let min = timestampsMs[0];
  for (let i = 1; i < timestampsMs.length; i++) {
    if (timestampsMs[i] < min) min = timestampsMs[i];
  }
  return Math.max(0, Math.floor((nowMs - min) / 1000));
}

export async function runOpsQueueHealth(): Promise<void> {
  if (existsSync('.env')) process.loadEnvFile('.env');
  const config = loadConfig(process.env);
  const prefix = config.pipeline.queuePrefix;
  const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
  const queues: Queue[] = [];
  try {
    const nowMs = Date.now();
    const results: Array<{ name: string; waiting: number; oldestWaitingSeconds: number | null }> = [];
    for (const name of MONITORED_QUEUES) {
      const q = new Queue(name, { connection: redis, prefix });
      queues.push(q);
      const jobs = await q.getJobs(['waiting'], 0, -1, true);
      const timestamps = jobs.map((j) => j.timestamp).filter((t): t is number => typeof t === 'number' && Number.isFinite(t));
      results.push({
        name,
        waiting: jobs.length,
        oldestWaitingSeconds: oldestWaitingSeconds(timestamps, nowMs),
      });
    }
    const maintenanceLastRunAt = await redis.get(`${prefix}:maintenance:last_run_at`);
    console.log(JSON.stringify({ queues: results, maintenanceLastRunAt }));
  } finally {
    await Promise.allSettled(queues.map((q) => q.close()));
    await redis.quit().catch(() => { redis.disconnect(); });
  }
}

const isMain =
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));

if (isMain) {
  runOpsQueueHealth().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  });
}
