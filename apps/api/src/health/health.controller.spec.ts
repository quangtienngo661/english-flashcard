import { describe, expect, it, vi } from 'vitest';
import { HealthController } from './health.controller.js';
import type { ReadinessChecks } from './readiness.service.js';

function ready(checks: ReadinessChecks) {
  const response = { status: vi.fn() };
  const controller = new HealthController({ check: vi.fn(async () => checks) } as never);
  return { response, body: controller.ready(response as never) };
}

describe('HealthController', () => {
  it('GET /v1/health stays a plain liveness answer', () => {
    expect(new HealthController({ check: vi.fn() } as never).check()).toEqual({ status: 'ok' });
  });

  it('GET /v1/health/ready: both checks ok → 200 with the checks', async () => {
    const { response, body } = ready({ database: 'ok', redis: 'ok' });
    expect(await body).toEqual({ status: 'ok', checks: { database: 'ok', redis: 'ok' } });
    expect(response.status).toHaveBeenCalledExactlyOnceWith(200);
  });

  it('GET /v1/health/ready: Redis down → 503, status unavailable, the failing check named', async () => {
    const { response, body } = ready({ database: 'ok', redis: 'fail' });
    expect(await body).toEqual({ status: 'unavailable', checks: { database: 'ok', redis: 'fail' } });
    expect(response.status).toHaveBeenCalledExactlyOnceWith(503);
  });

  it('GET /v1/health/ready: database down → 503', async () => {
    const { response, body } = ready({ database: 'fail', redis: 'ok' });
    expect((await body).status).toBe('unavailable');
    expect(response.status).toHaveBeenCalledExactlyOnceWith(503);
  });
});
