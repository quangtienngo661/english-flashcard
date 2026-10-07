import { Controller, Get, Inject, Res } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { EventEmitter } from 'node:events';
import type { Server } from 'node:http';
import type { Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PRISMA_CLIENT, PrismaModule } from '../../src/common/db/prisma.module.js';
import { FakeMailer } from '../../src/identity/mailer/fake-mailer.js';
import { MailDispatcher, sendPrepared } from '../../src/identity/mailer/mail-dispatcher.service.js';
import { Mailer } from '../../src/identity/mailer/mailer.js';
import { Public } from '../../src/identity/sessions/public.decorator.js';
import { createTestApp, type TestApp } from './create-test-app.js';

@Controller('_mail-unit')
class MailHarnessController {
  constructor(@Inject(ModuleRef) private readonly moduleRef: ModuleRef) {}

  mailer(): Mailer {
    return this.moduleRef.get(Mailer, { strict: false });
  }
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

const gate = { entered: deferred(), open: deferred() };

@Public()
@Controller('_gated')
class GatedController {
  constructor(@Inject(ModuleRef) private readonly moduleRef: ModuleRef) {}

  @Get()
  async run(@Res({ passthrough: true }) res: Response): Promise<{ ok: true }> {
    gate.entered.resolve();
    await gate.open.promise;
    this.moduleRef.get(MailDispatcher, { strict: false })
      .afterResponse(res, [sendPrepared({ to: 'late@example.com', subject: 'late', text: 'body' })]);
    return { ok: true };
  }
}

describe('createTestApp mail wiring (mocked database and HTTP shutdown)', () => {
  let app: TestApp | undefined;
  const disconnect = vi.fn(async () => {});
  const upsert = vi.fn(async () => ({ sent: 1 }));

  beforeEach(() => {
    disconnect.mockClear();
    upsert.mockClear();
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({
      module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: {
        mailBudgetBucket: { upsert }, $disconnect: disconnect,
      } }],
      exports: [PRISMA_CLIENT],
    });
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
    vi.restoreAllMocks();
  });

  async function setup() {
    // A supplied URL avoids Vitest's e2e-only injected database context. The
    // Prisma module above is replaced before construction; no connection opens.
    app = await createTestApp({ databaseUrl: 'unused', controllers: [MailHarnessController] });
    return app;
  }

  it('B1#38: exposes the FakeMailer and drainMail without exporting Identity providers', async () => {
    const current = await setup();
    expect(current.mailer).toBeInstanceOf(FakeMailer);
    expect(current.app.get(Mailer)).toBe(current.mailer);
    expect(current.app.get(MailHarnessController).mailer()).toBe(current.mailer);
    const message = { to: 'a@example.com', subject: 'unit', text: 'body' };
    current.app.get(MailDispatcher).runNow([sendPrepared(message)]);
    await current.drainMail();
    expect(current.mailer.sent).toEqual([message]);
    expect(upsert).toHaveBeenCalledOnce();
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('B1#38: HTTP shutdown starts pending batches, hooks see drained mail, then Prisma disconnects', async () => {
    const current = await setup();
    const res = new EventEmitter() as EventEmitter & Response;
    const message = { to: 'a@example.com', subject: 'unit', text: 'body' };
    current.app.get(MailDispatcher).afterResponse(res, [sendPrepared(message)]);
    const server = current.app.getHttpServer() as Server;
    const close = vi.spyOn(server, 'close');
    vi.spyOn(server, 'closeAllConnections').mockImplementation(() => { res.emit('close'); });
    const hook = vi.fn(async () => {
      expect(close).toHaveBeenCalled();
      expect(current.mailer.sent).toEqual([message]);
      expect(disconnect).not.toHaveBeenCalled();
    });
    current.onClose(hook);
    app = undefined;
    await current.close();
    expect(hook).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('close() waits for a handler still running after its socket closed, then drains its mail, then disconnects Prisma', async () => {
    gate.entered = deferred();
    gate.open = deferred();
    app = await createTestApp({ databaseUrl: 'unused', controllers: [GatedController] });
    const current = app;
    const order: string[] = [];
    disconnect.mockImplementation(async () => { order.push('disconnect'); });
    const send = current.mailer.send.bind(current.mailer);
    current.mailer.send = async (message) => { await send(message); order.push('mail'); };
    const pending = current.http().get('/v1/_gated').then(() => undefined, () => undefined);
    await gate.entered.promise;
    app = undefined;
    const closing = current.close();
    setTimeout(() => gate.open.resolve(), 50);
    await closing;
    await pending;
    expect(current.mailer.sent.map((m) => m.to)).toEqual(['late@example.com']);
    expect(order).toEqual(['mail', 'disconnect']);
  });

  it('B1#38: a rejected close hook does not skip later hooks or database/app cleanup', async () => {
    const current = await setup();
    const error = new Error('hook failed');
    const later = vi.fn(async () => {});
    const close = vi.spyOn(current.app, 'close');
    current.onClose(async () => { throw error; });
    current.onClose(later);
    app = undefined;
    await expect(current.close()).rejects.toMatchObject({ errors: [error] });
    expect(later).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });
});
