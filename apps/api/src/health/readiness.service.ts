import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { PRISMA_CLIENT } from '../common/db/prisma.module.js';
import type { PrismaClient } from '../generated/prisma/client.js';

/** A Redis connection of its own for the readiness check (built in AppModule), so a stuck queue connection cannot hide a dead Redis. */
export const READINESS_REDIS = 'READINESS_REDIS';

export type CheckResult = 'ok' | 'fail';
export type ReadinessChecks = { database: CheckResult; redis: CheckResult };

/** Each dependency gets this long to answer; a hung one is a fail, so the endpoint answers within about 2 s (deploy runbook M2). */
const CHECK_TIMEOUT_MS = 2_000;

@Injectable()
export class ReadinessService implements OnModuleDestroy {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: Pick<PrismaClient, '$queryRaw'>,
    @Inject(READINESS_REDIS) private readonly redis: Pick<Redis, 'ping' | 'quit'>,
  ) {}

  async check(): Promise<ReadinessChecks> {
    const [database, redis] = await Promise.all([
      within(() => this.prisma.$queryRaw`SELECT 1`),
      within(() => this.redis.ping()),
    ]);
    return { database, redis };
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }
}

async function within(probe: () => PromiseLike<unknown>): Promise<CheckResult> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<CheckResult>((resolve) => { timer = setTimeout(() => resolve('fail'), CHECK_TIMEOUT_MS); });
  try {
    return await Promise.race([Promise.resolve(probe()).then((): CheckResult => 'ok', (): CheckResult => 'fail'), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
