import { writeFileSync } from 'node:fs';
import type { ReadinessService } from './readiness.service.js';

export const DEFAULT_HEARTBEAT_PATH = '/tmp/worker-heartbeat';
export const DEFAULT_HEARTBEAT_INTERVAL_MS = 20_000;

/**
 * Periodically verifies Postgres + Redis readiness and touches `filePath` so Docker's healthcheck
 * can detect a hung event loop or lost backing connections without opening a network port (F-09).
 */
export function startWorkerHeartbeat(
  readiness: Pick<ReadinessService, 'check'>,
  filePath = DEFAULT_HEARTBEAT_PATH,
  intervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS,
): { stop: () => void } {
  let stopped = false;
  let running = false;

  const tick = async (): Promise<void> => {
    if (stopped || running) return;
    running = true;
    try {
      const checks = await readiness.check();
      if (!stopped && checks.database === 'ok' && checks.redis === 'ok') {
        writeFileSync(filePath, String(Date.now()), 'utf8');
      }
    } catch {
      // Leave the heartbeat file untouched so it ages past the 60 s healthcheck threshold.
    } finally {
      running = false;
    }
  };

  void tick();
  const timer = setInterval(() => { void tick(); }, intervalMs);
  timer.unref();

  return {
    stop() {
      stopped = true;
      clearInterval(timer);
    },
  };
}
