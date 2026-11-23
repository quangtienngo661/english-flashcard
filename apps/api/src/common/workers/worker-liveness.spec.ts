import { describe, expect, it } from 'vitest';
import { WorkerLiveness } from './worker-liveness.js';

describe('WorkerLiveness (OPS-04)', () => {
  it('returns the names of registered workers that are not running', () => {
    const liveness = new WorkerLiveness();
    liveness.register('tts', { isRunning: () => true });
    liveness.register('reminder', { isRunning: () => false });
    expect(liveness.notRunning()).toEqual(['reminder']);
  });

  it('returns empty array when all registered workers are running', () => {
    const liveness = new WorkerLiveness();
    liveness.register('tts', { isRunning: () => true });
    liveness.register('ai-eval', { isRunning: () => true });
    expect(liveness.notRunning()).toEqual([]);
  });
});
