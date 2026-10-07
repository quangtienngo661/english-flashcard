import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { inject } from 'vitest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { Clock, FakeClock } from '../../src/common/clock/clock.js';
import type { AppConfig } from '../../src/common/config/app-config.js';
import { PRISMA_CLIENT } from '../../src/common/db/prisma.module.js';
import { LOG_SINK, type LogEntry, type LogSink } from '../../src/common/logging/app-logger.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { testConfig } from './test-config.js';

export type TestApp = {
  app: NestExpressApplication;
  http(): ReturnType<typeof request>;
  clock: FakeClock;
  prisma: PrismaClient;
  logs: LogEntry[];
  drainMail(): Promise<void>;
  onClose(hook: () => Promise<void>): void;
  close(): Promise<void>;
};

export async function createTestApp(opts?: {
  config?: Partial<AppConfig>;
  databaseUrl?: string;
}): Promise<TestApp> {
  const config = testConfig({
    ...opts?.config,
    databaseUrl: opts?.databaseUrl ?? opts?.config?.databaseUrl ?? inject('databaseUrl'),
  });
  const clock = new FakeClock();
  const logs: LogEntry[] = [];
  const sink: LogSink = { write: (entry) => { logs.push(entry); } };
  const moduleRef = await Test.createTestingModule({ imports: [AppModule.forRoot(config)] })
    .overrideProvider(Clock).useValue(clock)
    .overrideProvider(LOG_SINK).useValue(sink)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });
  const prisma = moduleRef.get<PrismaClient>(PRISMA_CLIENT);
  configureApp(app, config);
  await app.init();
  const hooks: Array<() => Promise<void>> = [];
  return {
    app,
    http: () => request(app.getHttpServer()),
    clock,
    prisma,
    logs,
    async drainMail() {}, // Task 6 wires the mail dispatcher.
    onClose: (hook) => { hooks.push(hook); },
    async close() {
      // Run every hook even if one fails, then always release Prisma and the app.
      const failures: unknown[] = [];
      for (const hook of hooks) {
        try {
          await hook();
        } catch (err) {
          failures.push(err);
        }
      }
      try {
        await prisma.$disconnect();
      } finally {
        await app.close();
      }
      if (failures.length > 0) {
        throw new AggregateError(failures, `${failures.length} close hook(s) failed`);
      }
    },
  };
}
