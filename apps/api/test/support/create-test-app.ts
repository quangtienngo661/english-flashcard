import type { Type } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { Clock, FakeClock } from '../../src/common/clock/clock.js';
import type { AppConfig } from '../../src/common/config/app-config.js';
import { PRISMA_CLIENT } from '../../src/common/db/prisma.module.js';
import { LOG_SINK, type LogEntry, type LogSink } from '../../src/common/logging/app-logger.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { FakeMailer } from '../../src/identity/mailer/fake-mailer.js';
import { MailDispatcher } from '../../src/identity/mailer/mail-dispatcher.service.js';
import { Mailer } from '../../src/identity/mailer/mailer.js';
import { InFlightInterceptor } from './in-flight.interceptor.js';
import { testConfig } from './test-config.js';

export type TestApp = {
  app: NestExpressApplication;
  http(): ReturnType<typeof request>;
  clock: FakeClock;
  prisma: PrismaClient;
  logs: LogEntry[];
  mailer: FakeMailer;
  drainMail(): Promise<void>;
  onClose(hook: () => Promise<void>): void;
  close(): Promise<void>;
};

export async function createTestApp(opts?: {
  config?: Partial<AppConfig>;
  databaseUrl?: string;
  controllers?: Type<unknown>[];
}): Promise<TestApp> {
  const config = testConfig({
    ...opts?.config,
    databaseUrl: opts?.databaseUrl ?? opts?.config?.databaseUrl ?? inject('databaseUrl'),
  });
  const clock = new FakeClock();
  const logs: LogEntry[] = [];
  const sink: LogSink = { write: (entry) => { logs.push(entry); } };
  const mailer = new FakeMailer();
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.forRoot(config)], controllers: opts?.controllers ?? [],
  })
    .overrideProvider(Clock).useValue(clock)
    .overrideProvider(LOG_SINK).useValue(sink)
    .overrideProvider(Mailer).useValue(mailer)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });
  const prisma = moduleRef.get<PrismaClient>(PRISMA_CLIENT);
  const dispatcher = moduleRef.get(MailDispatcher);
  configureApp(app, config);
  const inFlight = new InFlightInterceptor();
  app.useGlobalInterceptors(inFlight);
  await app.init();
  const hooks: Array<() => Promise<void>> = [() => dispatcher.drain()];
  return {
    app,
    http: () => request(app.getHttpServer()),
    clock,
    prisma,
    logs,
    mailer,
    drainMail: () => dispatcher.drain(),
    onClose: (hook) => { hooks.push(hook); },
    async close() {
      // Stop HTTP first: close (including an aborted response) starts pending mail.
      // Keep Prisma connected until every batch and close hook has settled.
      const failures: unknown[] = [];
      const server = app.getHttpServer() as Server;
      try {
        await new Promise<void>((resolve, reject) => {
          server.close((err?: Error & { code?: string }) => {
            if (err && err.code !== 'ERR_SERVER_NOT_RUNNING') reject(err);
            else resolve();
          });
          server.closeAllConnections();
        });
      } catch (err) {
        failures.push(err);
      }
      // Handlers can outlive their sockets; let them finish (and register mail) before draining.
      await inFlight.idle();
      for (const hook of hooks) {
        try {
          await hook();
        } catch (err) {
          failures.push(err);
        }
      }
      try {
        await prisma.$disconnect();
      } catch (err) {
        failures.push(err);
      }
      try {
        await app.close();
      } catch (err) {
        failures.push(err);
      }
      if (failures.length > 0) {
        throw new AggregateError(failures, `${failures.length} close operation(s) failed`);
      }
    },
  };
}
