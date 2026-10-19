import { Body, Controller, Post } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { Prisma } from '../../generated/prisma/client.js';
import { Public } from '../../identity/sessions/public.decorator.js';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import type { ParsedEvent } from './billing-adapter.js';
import { BillingInbox, NOOP_APPLY_PORT } from './billing-inbox.service.js';
import { fakeParse, fakeSign } from './fake/fake-wire.js';

const SECRET = randomBytes(32);
const USER = '6f1c2a4e-0b7d-4c1e-9a55-3d2f8e7b6a10';

@Public()
@Controller('test-echo')
class EchoController {
  @Post()
  echo(@Body() body: unknown) {
    return { body };
  }
}

const entry = (id: string, fields: Record<string, unknown> = {}) => ({
  id,
  type: 'expired',
  environment: 'sandbox',
  subscription_id: 'sub-1',
  app_user_id: USER,
  occurred_at: '2026-11-15T10:00:00.000Z',
  ...fields,
});
const batch = (...entries: unknown[]) => Buffer.from(JSON.stringify({ events: entries }));

describe('billing webhook (design §9.2 steps 1–3, R16)', () => {
  let ctx: TestApp;
  const prisma = {
    fakeBillingSubscription: { findUnique: vi.fn(), createMany: vi.fn(), updateMany: vi.fn() },
    $disconnect: async () => {},
  };
  const inbox = { store: vi.fn(), afterResponse: vi.fn() };

  const post = (body: Buffer, signature = fakeSign(SECRET, body)) =>
    ctx.http().post('/v1/billing/webhooks/fake').set('Content-Type', 'application/json').set('X-Fake-Signature', signature).send(body.toString('utf8'));

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({
      databaseUrl: 'unused',
      config: { billing: { production: false, fakeEnabled: true, fakeSecret: SECRET, fakeFetchState: true } },
      controllers: [EchoController],
      providers: [{ provide: BillingInbox, useValue: inbox }],
    });
  });
  beforeEach(() => {
    prisma.fakeBillingSubscription.findUnique.mockReset().mockResolvedValue(null);
    inbox.store.mockReset().mockImplementation(async (_provider: string, events: ParsedEvent[]) => events.map((_, i) => `id-${i}`));
    inbox.afterResponse.mockReset();
    ctx.logs.length = 0;
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('R16: a 70 KB body → 413 payload-too-large, nothing stored', async () => {
    const body = batch(entry('evt-big', { pad: 'x'.repeat(70 * 1024) }));
    const res = await post(body);
    expect(res.status).toBe(413);
    expect(res.body.type).toMatch(/payload-too-large$/);
    expect(inbox.store).not.toHaveBeenCalled();
  });

  it('R16: a 60 KB signed body reaches verify with the exact bytes', async () => {
    const body = batch(entry('evt-60', { pad: 'y'.repeat(60 * 1024) }));
    const res = await post(body);
    expect(res.status).toBe(200);
    expect(inbox.store).toHaveBeenCalledWith('fake', [expect.objectContaining({ externalEventId: 'evt-60', raw: expect.objectContaining({ pad: 'y'.repeat(60 * 1024) }) })]);
  });

  it('R16: another JSON route still parses its body and still rejects 101 KB (the raw parser is route-scoped)', async () => {
    const ok = await ctx.http().post('/v1/test-echo').send({ hello: 'world' });
    expect(ok.status).toBe(201);
    expect(ok.body).toEqual({ body: { hello: 'world' } });
    const big = await ctx.http().post('/v1/test-echo').send({ pad: 'z'.repeat(101 * 1024) });
    expect(big.status).toBe(413);
  });

  it('B5#26/B5E44: a bad signature → 400 validation-failed, store not called', async () => {
    const body = batch(entry('evt-bad'));
    const res = await post(body, fakeSign(randomBytes(32), body));
    expect(res.status).toBe(400);
    expect(res.body.type).toMatch(/validation-failed$/);
    expect(inbox.store).not.toHaveBeenCalled();
    expect(inbox.afterResponse).not.toHaveBeenCalled();
  });

  it('B5E44/B5E62: the bad-signature log has the provider and operation_id only (no body, no header value)', async () => {
    const body = batch(entry('evt-secret', { email: 'lan@example.com' }));
    const signature = fakeSign(randomBytes(32), body);
    await post(body, signature);
    const logged = ctx.logs.filter((log) => log.event === 'billing_signature_invalid');
    expect(logged).toHaveLength(1);
    expect(Object.keys(logged[0]).sort()).toEqual(['event', 'level', 'operation_id', 'provider']);
    expect(logged[0].provider).toBe('fake');
    expect(JSON.stringify(ctx.logs)).not.toContain('lan@example.com');
    expect(JSON.stringify(ctx.logs)).not.toContain(signature.slice(7));
  });

  it('the GET form with payload and signature is accepted', async () => {
    const body = batch(entry('evt-get'));
    const res = await ctx.http().get('/v1/billing/webhooks/fake')
      .query({ payload: body.toString('base64url'), signature: fakeSign(SECRET, body) });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: 1 });
    expect(inbox.store).toHaveBeenCalledWith('fake', [expect.objectContaining({ externalEventId: 'evt-get' })]);
  });

  it('B5E42: a duplicate (store returns no new id) still gets the provider ack, and nothing is handed to the applier', async () => {
    inbox.store.mockResolvedValue([]);
    const res = await post(batch(entry('evt-dup')));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: 1 });
    expect(inbox.afterResponse).toHaveBeenCalledWith(expect.anything(), []);
  });

  it('new ids are handed to the applier after the response', async () => {
    await post(batch(entry('evt-a'), entry('evt-b')));
    expect(inbox.afterResponse).toHaveBeenCalledWith(expect.anything(), ['id-0', 'id-1']);
  });

  it('an unknown provider → 404 not-found', async () => {
    const res = await ctx.http().post('/v1/billing/webhooks/stripe').set('Content-Type', 'application/json').send(batch(entry('e')).toString('utf8'));
    expect(res.status).toBe(404);
    expect(res.body.type).toMatch(/not-found$/);
  });

  it('both webhook routes answer without a token (never 401)', async () => {
    const body = batch(entry('evt-anon'));
    expect((await post(body)).status).toBe(200);
    expect((await ctx.http().get('/v1/billing/webhooks/fake')).status).toBe(400);
  });

  it('a signed batch with one unknown type → the provider ack, the other events stored, the skip logged', async () => {
    const res = await post(batch(entry('evt-1'), entry('evt-2', { type: 'payment_succeeded' })));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: 1 });
    expect(inbox.store).toHaveBeenCalledWith('fake', [expect.objectContaining({ externalEventId: 'evt-1' })]);
    expect(ctx.logs).toContainEqual(expect.objectContaining({ event: 'billing_event_skipped', provider: 'fake', skipped: 1 }));
  });

  it('B5E45 (store half): a renewed without transaction_id is handed to the inbox, not rejected', async () => {
    const res = await post(batch(entry('evt-r', { type: 'renewed', interval: 'month',
      current_period_start: '2026-11-15T10:00:00.000Z', current_period_end: '2026-12-15T10:00:00.000Z' })));
    expect(res.status).toBe(200);
    expect(inbox.store).toHaveBeenCalledWith('fake', [expect.objectContaining({ event: null, missing: ['transactionId'] })]);
  });
});

describe('BillingInbox.store', () => {
  const NOW = new Date('2026-11-20T08:00:00.000Z');

  function setup(returned: Array<{ id: string }> = []) {
    const createManyAndReturn = vi.fn().mockResolvedValue(returned);
    const prisma = { billingEvent: { createManyAndReturn } };
    const port = { applyMany: vi.fn().mockResolvedValue(undefined) };
    const logger = { warn: vi.fn(), error: vi.fn() };
    const inbox = new BillingInbox(prisma as never, { now: () => NOW } as never, port, logger as never);
    return { inbox, createManyAndReturn, port, logger };
  }

  const parsed = fakeParse(batch(
    entry('evt-1', { type: 'renewed', transaction_id: 'tx-1', interval: 'month',
      current_period_start: '2026-11-15T10:00:00.000Z', current_period_end: '2026-12-15T10:00:00.000Z' }),
    entry('evt-2', { type: 'renewed', interval: 'month', app_user_id: 'nobody',
      current_period_start: '2026-11-15T10:00:00.000Z', current_period_end: '2026-12-15T10:00:00.000Z' }),
  ))!.events;

  it('B5E42/B5E45: one insert that skips duplicates; a missing-fields event is stored with payload NULL; returns the new ids only', async () => {
    const { inbox, createManyAndReturn } = setup([{ id: 'new-1' }]);
    expect(await inbox.store('fake', parsed)).toEqual(['new-1']);
    expect(createManyAndReturn).toHaveBeenCalledTimes(1);
    const args = createManyAndReturn.mock.calls[0][0];
    expect(args.skipDuplicates).toBe(true);
    expect(args.select).toEqual({ id: true });
    expect(args.data[0]).toMatchObject({
      provider: 'fake',
      environment: 'sandbox',
      dedupeKey: 'fake:sandbox:evt-1',
      externalEventId: 'evt-1',
      externalSubscriptionId: 'sub-1',
      type: 'renewed',
      kind: 'additive',
      transactionId: 'tx-1',
      occurredAt: new Date('2026-11-15T10:00:00.000Z'),
      receivedAt: NOW,
      appUserId: USER,
      status: 'pending',
      rawPayload: parsed[0].raw,
    });
    expect(args.data[0].payload).toMatchObject({ type: 'renewed', transactionId: 'tx-1', occurredAt: '2026-11-15T10:00:00.000Z' });
    expect(args.data[1]).toMatchObject({ dedupeKey: 'fake:sandbox:evt-2', appUserId: null, transactionId: null, payload: Prisma.DbNull });
  });

  it('an empty batch inserts nothing', async () => {
    const { inbox, createManyAndReturn } = setup([]);
    expect(await inbox.store('fake', [])).toEqual([]);
    expect(createManyAndReturn).not.toHaveBeenCalled();
  });

});

describe('BillingInbox.afterResponse', () => {
  function setup() {
    const port = { applyMany: vi.fn().mockResolvedValue(undefined) };
    const logger = { warn: vi.fn(), error: vi.fn() };
    const inbox = new BillingInbox({} as never, { now: () => new Date() } as never, port, logger as never);
    const res = Object.assign(new EventEmitter(), { closed: false });
    return { inbox, port, logger, res };
  }

  it('hands the ids to the applier once the response has closed, and drain waits for it', async () => {
    const { inbox, port, res } = setup();
    inbox.afterResponse(res as never, ['a', 'b']);
    expect(port.applyMany).not.toHaveBeenCalled();
    res.emit('close');
    await inbox.drain();
    expect(port.applyMany).toHaveBeenCalledWith(['a', 'b']);
  });

  it('runs at once when the response is already closed; an empty list runs nothing', async () => {
    const { inbox, port, res } = setup();
    inbox.afterResponse(res as never, []);
    res.closed = true;
    inbox.afterResponse(res as never, ['c']);
    await inbox.drain();
    expect(port.applyMany).toHaveBeenCalledTimes(1);
    expect(port.applyMany).toHaveBeenCalledWith(['c']);
  });

  it('a failing applier is logged with the count only; the rows stay pending for the retry job', async () => {
    const { inbox, port, logger, res } = setup();
    port.applyMany.mockRejectedValue(new Error('db down'));
    res.closed = true;
    inbox.afterResponse(res as never, ['d']);
    await inbox.drain();
    expect(logger.error).toHaveBeenCalledWith('billing_apply_failed', expect.any(Error), { count: 1 });
  });

  it('the default apply port does nothing (Task 17 binds the applier)', async () => {
    await expect(NOOP_APPLY_PORT.applyMany(['x'])).resolves.toBeUndefined();
  });
});
