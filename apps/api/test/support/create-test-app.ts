import type { DynamicModule, InjectionToken, Type } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { Clock, FakeClock } from '../../src/common/clock/clock.js';
import type { AppConfig } from '../../src/common/config/app-config.js';
import { PRISMA_CLIENT } from '../../src/common/db/prisma.module.js';
import { LOG_SINK, type LogEntry, type LogSink } from '../../src/common/logging/app-logger.js';
import { JobHandlerRegistry } from '../../src/content-pipeline/jobs/job-handler.registry.js';
import { JobReconcilerService } from '../../src/content-pipeline/jobs/job-reconciler.service.js';
import { JobRunnerService } from '../../src/content-pipeline/jobs/job-runner.service.js';
import type { JobHandler } from '../../src/content-pipeline/jobs/job-types.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { IdentityModule } from '../../src/identity/identity.module.js';
import { ReminderQueueService } from '../../src/notifications/scheduler/reminder-queue.service.js';
import { ROLE_PERMISSIONS, type Permission, type StaffRole } from '../../src/identity/identity.types.js';
import { FakeMailer } from '../../src/common/mail/fake-mailer.js';
import { MailDispatcher } from '../../src/common/mail/mail-dispatcher.service.js';
import { Mailer } from '../../src/common/mail/mailer.js';
import { AccountStatusReader, type AccountState } from '../../src/identity/sessions/account-status.reader.js';
import { ROLE_PERMISSIONS_TOKEN } from '../../src/identity/staff/role-permissions.token.js';
import { InFlightInterceptor } from './in-flight.interceptor.js';
import { testConfig } from './test-config.js';

/** Stands in for the one-read-per-request account check: every caller is an active password session unless a test sets `state`. */
export class FakeAccountStatusReader extends AccountStatusReader {
  state: AccountState | null | ((userId: string, chainId: string) => AccountState | null) = {
    status: 'active', authMethod: 'password', revoked: false,
  };

  async read(userId: string, chainId: string): Promise<AccountState | null> {
    return typeof this.state === 'function' ? this.state(userId, chainId) : this.state;
  }
}

/** Holds the `providers` option; global, so a port no production module provides (injected with @Optional()) reaches every module. */
class TestProvidersModule {}

export type TestApp = {
  app: NestExpressApplication;
  http(): ReturnType<typeof request>;
  clock: FakeClock;
  prisma: PrismaClient;
  rolePermissions: Record<StaffRole, readonly Permission[]>;
  logs: LogEntry[];
  mailer: FakeMailer;
  accountStatus: FakeAccountStatusReader;
  drainMail(): Promise<void>;
  onClose(hook: () => Promise<void>): void;
  close(): Promise<void>;
};

export async function createTestApp(opts?: {
  config?: Partial<AppConfig>;
  databaseUrl?: string;
  redisUrl?: string;
  pipeline?: Partial<AppConfig['pipeline']>;
  jobHandlers?: JobHandler[];
  controllers?: Type<unknown>[];
  rolePermissions?: Record<StaffRole, readonly Permission[]>;
  /** A port or a fake service: provided globally and overriding any production provider of the same token. */
  providers?: Array<{ provide: InjectionToken; useValue: unknown }>;
}): Promise<TestApp> {
  const defaults = testConfig();
  const config: AppConfig = {
    ...defaults,
    ...opts?.config,
    databaseUrl: opts?.databaseUrl ?? opts?.config?.databaseUrl ?? inject('databaseUrl'),
    redisUrl: opts?.redisUrl ?? opts?.config?.redisUrl ?? defaults.redisUrl,
    pipeline: {
      ...defaults.pipeline,
      queuePrefix: `wordmet-test-${randomUUID()}`,
      ...opts?.config?.pipeline,
      ...opts?.pipeline,
    },
  };
  const clock = new FakeClock();
  const logs: LogEntry[] = [];
  const sink: LogSink = { write: (entry) => { logs.push(entry); } };
  const mailer = new FakeMailer();
  const accountStatus = new FakeAccountStatusReader();
  const rolePermissions = structuredClone(opts?.rolePermissions ?? ROLE_PERMISSIONS);
  let handlerRegistry: JobHandlerRegistry;
  const extra = opts?.providers ?? [];
  const testProviders: DynamicModule = {
    module: TestProvidersModule, global: true, providers: extra, exports: extra.map(({ provide }) => provide),
  };
  let builder = Test.createTestingModule({
    imports: [AppModule.forRoot(config), IdentityModule, DiscoveryModule, testProviders], controllers: opts?.controllers ?? [],
    providers: [{
      provide: 'TEST_JOB_HANDLERS',
      useValue: {
        // The root module initializes after imported production modules, before worker bootstrap.
        // Keep explicit test overrides from being replaced by real handlers' onModuleInit hooks.
        onModuleInit() { for (const handler of opts?.jobHandlers ?? []) handlerRegistry.register(handler); },
      },
    }],
  })
    .overrideProvider(Clock).useValue(clock)
    .overrideProvider(LOG_SINK).useValue(sink)
    .overrideProvider(Mailer).useValue(mailer)
    .overrideProvider(AccountStatusReader).useValue(accountStatus)
    .overrideProvider(ROLE_PERMISSIONS_TOKEN).useValue(rolePermissions);
  for (const { provide, useValue } of extra) builder = builder.overrideProvider(provide).useValue(useValue);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });
  const prisma = moduleRef.get<PrismaClient>(PRISMA_CLIENT);
  handlerRegistry = moduleRef.get(JobHandlerRegistry);
  const dispatcher = moduleRef.get(MailDispatcher);
  configureApp(app, config);
  const inFlight = new InFlightInterceptor();
  app.useGlobalInterceptors(inFlight);
  await app.init();
  const hooks: Array<() => Promise<void>> = [
    () => moduleRef.get(JobReconcilerService).onModuleDestroy(),
    () => moduleRef.get(JobRunnerService).onModuleDestroy(),
    () => moduleRef.get(ReminderQueueService).onModuleDestroy(),
    () => dispatcher.drain(),
  ];
  return {
    app,
    http: () => request(app.getHttpServer()),
    clock,
    prisma,
    rolePermissions,
    logs,
    mailer,
    accountStatus,
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
