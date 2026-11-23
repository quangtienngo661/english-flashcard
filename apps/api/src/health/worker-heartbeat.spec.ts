import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReadinessChecks, ReadinessService } from './readiness.service.js';
import { startWorkerHeartbeat } from './worker-heartbeat.js';

const dirs: string[] = [];
afterEach(() => {
  vi.useRealTimers();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('startWorkerHeartbeat (F-09, OPS-04)', () => {
  it('writes heartbeat file when readiness succeeds and all workers run, skips on fail or rejection, and stop() clears timer', async () => {
    vi.useFakeTimers();
    const dir = mkdtempSync(join(tmpdir(), 'wm-hb-'));
    dirs.push(dir);
    const file = join(dir, 'worker-heartbeat');

    const check = vi.fn<() => Promise<ReadinessChecks>>()
      .mockResolvedValueOnce({ database: 'ok', redis: 'ok' })
      .mockResolvedValueOnce({ database: 'ok', redis: 'fail' })
      .mockRejectedValueOnce(new Error('boom'));
    const liveness = { notRunning: () => [] };

    const hb = startWorkerHeartbeat({ check } as unknown as Pick<ReadinessService, 'check'>, liveness, file, 1_000);
    await vi.advanceTimersByTimeAsync(0);
    expect(check).toHaveBeenCalledTimes(1);
    const firstContent = readFileSync(file, 'utf8');
    expect(Number(firstContent)).toBeGreaterThan(0);
    const firstMtime = statSync(file).mtimeMs;

    await vi.advanceTimersByTimeAsync(1_000);
    expect(check).toHaveBeenCalledTimes(2);
    expect(readFileSync(file, 'utf8')).toBe(firstContent);
    expect(statSync(file).mtimeMs).toBe(firstMtime);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(check).toHaveBeenCalledTimes(3);
    expect(readFileSync(file, 'utf8')).toBe(firstContent);

    hb.stop();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(check).toHaveBeenCalledTimes(3);
  });

  it('does not write heartbeat when readiness is ok but a worker is not running', async () => {
    vi.useFakeTimers();
    const dir = mkdtempSync(join(tmpdir(), 'wm-hb-dead-'));
    dirs.push(dir);
    const file = join(dir, 'worker-heartbeat');

    const check = vi.fn<() => Promise<ReadinessChecks>>().mockResolvedValue({ database: 'ok', redis: 'ok' });
    const liveness = { notRunning: () => ['tts'] };

    const hb = startWorkerHeartbeat({ check } as unknown as Pick<ReadinessService, 'check'>, liveness, file, 1_000);
    await vi.advanceTimersByTimeAsync(0);
    expect(check).toHaveBeenCalledTimes(1);
    expect(existsSync(file)).toBe(false);
    hb.stop();
  });
});
