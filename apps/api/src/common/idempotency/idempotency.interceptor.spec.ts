import { createHash } from 'node:crypto';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppLogger, type LogEntry } from '../logging/app-logger.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { IdempotencyInterceptor } from './idempotency.interceptor.js';
import { Idempotent } from './idempotent.decorator.js';
import { runIdempotent } from './idempotency.service.js';

vi.mock('./idempotency.service.js', () => ({ runIdempotent: vi.fn() }));
const run = vi.mocked(runIdempotent);

class Controller {
  @Idempotent({ timeoutSeconds: 7 })
  custom() {}
  @Idempotent()
  plain() {}
}

const logs: LogEntry[] = [];

function call(
  handler: () => void,
  request: Record<string, unknown>,
) {
  const interceptor = new IdempotencyInterceptor({} as PrismaClient, new Reflector(), new AppLogger({ write: (entry) => logs.push(entry) }));
  const response = { statusCode: 201, setHeader: vi.fn() };
  const context = {
    getHandler: () => handler,
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
  } as unknown as ExecutionContext;
  const next: CallHandler = { handle: () => of({ ok: true }) };
  return () => firstValueFrom(interceptor.intercept(context, next) as never);
}

const base = { headers: { 'idempotency-key': 'k1' }, user: { userId: 'u1' }, path: '/v1/sample' };

beforeEach(() => { logs.length = 0; run.mockReset().mockResolvedValue({ kind: 'proceed', status: 201, body: {} } as never); });
const hashOf = (request: Record<string, unknown>) => {
  run.mockResolvedValue({ kind: 'replay', status: 201, body: {} } as never);
  return call(Controller.prototype.plain, request)().then(() => run.mock.calls.at(-1)![1].payloadHash);
};

describe('IdempotencyInterceptor', () => {
  it('a missing or empty Idempotency-Key is a 400 Problem Details error and the service is not called', () => {
    for (const headers of [{}, { 'idempotency-key': '' }]) {
      expect(() => call(Controller.prototype.plain, { ...base, headers })()).toThrow(
        expect.objectContaining({ problemTitle: 'Idempotency-Key required' }),
      );
    }
    expect(run).not.toHaveBeenCalled();
  });

  it('@Idempotent({ timeoutSeconds }) reaches the service as leaseSeconds; the default is 30', async () => {
    await hashOf(base).catch(() => undefined);
    expect(run.mock.calls[0][3]).toEqual({ leaseSeconds: 30, onReleaseFailed: expect.any(Function) });
    run.mockResolvedValue({ kind: 'replay', status: 201, body: {} } as never);
    await call(Controller.prototype.custom, base)();
    expect(run.mock.calls[1][3]).toEqual({ leaseSeconds: 7, onReleaseFailed: expect.any(Function) });
  });

  it('B1-9: a failed release is logged with the endpoint and the error name, never the key', async () => {
    await call(Controller.prototype.plain, base)();
    const options = run.mock.calls[0][3] as { onReleaseFailed: (error: unknown) => void };
    options.onReleaseFailed(Object.assign(new Error('connection lost for k1'), { code: 'ECONNRESET' }));
    expect(logs).toEqual([{ level: 'error', event: 'idempotency_release_failed', endpoint: '/v1/sample', error: { name: 'Error', code: 'ECONNRESET' } }]);
  });

  it('a JSON-only body keeps the pre-multipart digest, pinned to a fixed value', async () => {
    const body = { a: 1, nested: { items: ['one', 'two'] }, empty: null };
    const hash = await hashOf({ ...base, body });
    expect(hash).toBe(createHash('sha256').update(JSON.stringify(body)).digest('hex'));
    expect(hash).toBe('1b15a339dd39417a8bf2b28b5ff9143899732b2045a62a723fc2f29d3e1d1798');
  });

  it('a multipart file adds sha256(bytes) and the field name to the digest', async () => {
    const file = (bytes: string, fieldname = 'file') => ({ buffer: Buffer.from(bytes), fieldname });
    const body = { a: 1 };
    const json = await hashOf({ ...base, body });
    const one = await hashOf({ ...base, body, file: file('aaa') });
    expect(one).not.toBe(json);
    expect(await hashOf({ ...base, body, file: file('aaa') })).toBe(one);
    expect(await hashOf({ ...base, body, file: file('bbb') })).not.toBe(one);
    expect(await hashOf({ ...base, body, file: file('aaa', 'other') })).not.toBe(one);
  });
});
