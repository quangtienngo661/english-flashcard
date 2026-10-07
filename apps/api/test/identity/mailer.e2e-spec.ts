import { Controller, Get, Inject, Res } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { get, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { AppLogger } from '../../src/common/logging/app-logger.js';
import { getOperationId } from '../../src/common/logging/request-context.js';
import { FakeMailer } from '../../src/identity/mailer/fake-mailer.js';
import { MailBudget } from '../../src/identity/mailer/mail-budget.service.js';
import { MailDispatcher, sendPrepared } from '../../src/identity/mailer/mail-dispatcher.service.js';
import { Mailer } from '../../src/identity/mailer/mailer.js';
import { SmtpMailer } from '../../src/identity/mailer/smtp-mailer.js';
import { Public } from '../../src/identity/sessions/public.decorator.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { listMailpitMessages, startMailpit } from '../support/mailpit.js';
import { testConfig } from '../support/test-config.js';

const message = { to: 'a@example.com', subject: 'test', text: 'mail body' };

@Public()
@Controller('_mail-test')
class MailTestController {
  closed?: Promise<void>;

  constructor(
    @Inject(ModuleRef) private readonly moduleRef: ModuleRef,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  // Test controllers resolve Identity's private providers without widening D3's
  // production module exports merely to support test-only HTTP routes.
  private get dispatcher(): MailDispatcher {
    return this.moduleRef.get(MailDispatcher, { strict: false });
  }

  private get mailer(): FakeMailer {
    return this.moduleRef.get(Mailer, { strict: false });
  }

  @Get()
  send(@Res({ passthrough: true }) res: Response) {
    this.dispatcher.afterResponse(res, [sendPrepared(message)]);
    res.setHeader('X-Mail-Sent-In-Handler', String(this.mailer.sent.length));
    return { operation_id: getOperationId() };
  }

  @Get('log')
  log(@Res({ passthrough: true }) res: Response) {
    this.dispatcher.afterResponse(res, [async () => {
      await Promise.resolve();
      this.logger.info('mail_test_job');
      throw Object.assign(new Error('private email a@example.com and OTP 123456'), { code: 'ETEST' });
    }]);
    return { operation_id: getOperationId() };
  }

  @Get('abort')
  abort(@Res() res: Response) {
    this.dispatcher.afterResponse(res, [sendPrepared(message)]);
    this.closed = new Promise<void>((resolve) => { res.once('close', resolve); });
    res.write('response intentionally left open');
  }
}

describe('Mail infrastructure (e2e)', () => {
  const apps: TestApp[] = [];
  const keys = new WeakMap<TestApp, string>();

  async function setup(budget = 10) {
    const mailBudgetKey = randomUUID();
    const app = await createTestApp({
      config: { mailDailyBudget: budget, mailBudgetKey }, controllers: [MailTestController],
    });
    keys.set(app, mailBudgetKey);
    app.clock.set(new Date('2026-10-07T23:59:59.000Z'));
    apps.push(app);
    return app;
  }

  afterEach(async () => {
    for (const app of apps.splice(0)) await app.close();
  });

  it('B1E34: SmtpMailer delivers the complete message to Mailpit', async () => {
    const mailpit = await startMailpit();
    const mailer = new SmtpMailer(testConfig({ smtp: {
      host: mailpit.smtpHost, port: mailpit.smtpPort, from: 'no-reply@localhost', secure: false,
    } }));
    try {
      await mailer.send(message);
      // SMTP transport terminates the body with a line break; compare the body without it.
      const received = await listMailpitMessages(mailpit.apiUrl);
      expect(received.map((m) => ({ ...m, text: m.text.trimEnd() }))).toEqual([message]);
    } finally {
      await mailpit.stop();
    }
  }, 60_000);

  it('B1#30: assertAvailable returns 503 mail-unavailable once the persisted bucket is full', async () => {
    const app = await setup(2);
    const budget = app.app.get(MailBudget);
    await budget.assertAvailable();
    await budget.tryConsume();
    await budget.assertAvailable();
    await budget.tryConsume();
    await expect(budget.assertAvailable()).rejects.toMatchObject({ status: 503, problemType: 'mail-unavailable' });
    expect(await app.prisma.mailBudgetBucket.findUnique({
      where: { bucket: `${keys.get(app)}:2026-10-07` },
    })).toEqual({ bucket: `${keys.get(app)}:2026-10-07`, sent: 2 });
  });

  it('B1#30: mail_budget_80 is logged exactly once at warn with budget five', async () => {
    const app = await setup(5);
    const budget = app.app.get(MailBudget);
    await Promise.all(Array.from({ length: 10 }, () => budget.tryConsume()));
    expect(app.logs.filter((entry) => entry.event === 'mail_budget_80'))
      .toEqual([expect.objectContaining({ level: 'warn' })]);
  });

  it('B1E15: ten real concurrent increments with budget three admit exactly three', async () => {
    const app = await setup(3);
    const budget = app.app.get(MailBudget);
    const results = await Promise.all(Array.from({ length: 10 }, () => budget.tryConsume()));
    expect(results.filter(Boolean)).toHaveLength(3);
    // Fresh DB reads prove the increments survived, without a read/update race.
    expect(await app.prisma.mailBudgetBucket.findUnique({
      where: { bucket: `${keys.get(app)}:2026-10-07` },
    })).toEqual({ bucket: `${keys.get(app)}:2026-10-07`, sent: 10 });
  });

  it('B1E16/IE6: a failing mailer logs name/code only and drain resolves', async () => {
    const app = await setup();
    app.mailer.failNext(Object.assign(new Error('a@example.com password OTP 123456'), { code: 'ETEST' }));
    app.app.get(MailDispatcher).runNow([sendPrepared(message)]);
    await expect(app.drainMail()).resolves.toBeUndefined();
    expect(app.mailer.sent).toEqual([]);
    const failed = app.logs.filter((entry) => entry.event === 'mail_send_failed');
    expect(failed).toEqual([expect.objectContaining({ error: { name: 'Error', code: 'ETEST' } })]);
    expect(JSON.stringify(failed)).not.toContain('a@example.com');
    expect(JSON.stringify(failed)).not.toContain('123456');
  });

  it('B1#38: afterResponse sends nothing before the response closes', async () => {
    const app = await setup();
    const res = await app.http().get('/v1/_mail-test');
    expect(res.status).toBe(200);
    expect(res.headers['x-mail-sent-in-handler']).toBe('0');
    await app.drainMail();
    expect(app.mailer.sent).toEqual([message]);
  });

  it('B1E16: destroying the client socket mid-response still runs the batch', async () => {
    const app = await setup();
    await app.app.listen(0, '127.0.0.1');
    const server = app.app.getHttpServer() as Server;
    const { port } = server.address() as AddressInfo;
    const response = await new Promise<import('node:http').IncomingMessage>((resolve, reject) => {
      get(`http://127.0.0.1:${port}/v1/_mail-test/abort`, resolve).on('error', reject);
    });
    response.on('error', () => {});
    expect(app.mailer.sent).toEqual([]);
    response.destroy();
    await app.app.get(MailTestController).closed;
    await app.drainMail();
    expect(app.mailer.sent).toEqual([message]);
  });

  it('B1#32: two concurrent HTTP requests keep their own operation_id in job and failure logs', async () => {
    const app = await setup();
    const responses = await Promise.all([
      app.http().get('/v1/_mail-test/log'), app.http().get('/v1/_mail-test/log'),
    ]);
    await app.drainMail();
    const ids = responses.map((res) => res.body.operation_id).sort();
    expect(ids[0]).not.toBe(ids[1]);
    for (const event of ['mail_test_job', 'mail_send_failed']) {
      expect(app.logs.filter((entry) => entry.event === event).map((entry) => entry.operation_id).sort())
        .toEqual(ids);
    }
  });

  it('B1#38: a null job consumes no budget and sends nothing', async () => {
    const app = await setup();
    app.app.get(MailDispatcher).runNow([sendPrepared(null)]);
    await app.drainMail();
    expect(app.mailer.sent).toEqual([]);
    expect(app.logs).toEqual([]);
    expect(await app.prisma.mailBudgetBucket.count({
      where: { bucket: { startsWith: `${keys.get(app)}:` } },
    })).toBe(0);
  });

  it('B1#30: advancing FakeClock into a new UTC day opens a new budget', async () => {
    const app = await setup(1);
    const budget = app.app.get(MailBudget);
    await budget.tryConsume();
    await expect(budget.assertAvailable()).rejects.toMatchObject({ problemType: 'mail-unavailable' });
    app.clock.advance(1000);
    await budget.assertAvailable();
    expect(await budget.tryConsume()).toBe(true);
    expect(await app.prisma.mailBudgetBucket.findMany({
      where: { bucket: { startsWith: `${keys.get(app)}:` } }, orderBy: { bucket: 'asc' },
    })).toEqual([
      { bucket: `${keys.get(app)}:2026-10-07`, sent: 1 },
      { bucket: `${keys.get(app)}:2026-10-08`, sent: 1 },
    ]);
  });

  it('B1#38: close stops open HTTP responses, drains their mail, then disconnects Prisma', async () => {
    const app = await setup();
    await app.app.listen(0, '127.0.0.1');
    const server = app.app.getHttpServer() as Server;
    const { port } = server.address() as AddressInfo;
    const response = await new Promise<import('node:http').IncomingMessage>((resolve, reject) => {
      get(`http://127.0.0.1:${port}/v1/_mail-test/abort`, resolve).on('error', reject);
    });
    response.on('error', () => {}); // Shutdown intentionally aborts this incomplete response.
    app.onClose(async () => {
      expect(server.listening).toBe(false);
      expect(app.mailer.sent).toEqual([message]);
      await app.prisma.mailBudgetBucket.count(); // The DB is still connected during close hooks.
    });
    await app.close();
    apps.splice(apps.indexOf(app), 1);
    expect(app.mailer.sent).toEqual([message]);
  });
});
