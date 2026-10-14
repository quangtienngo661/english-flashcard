import { randomBytes, randomUUID } from 'node:crypto';
import { DEFAULT_LIMITS, type AppConfig } from '../../src/common/config/app-config.js';

export function testConfig(overrides?: Partial<AppConfig>): AppConfig {
  const limits = structuredClone(DEFAULT_LIMITS);
  for (const rule of Object.values(limits)) {
    if (rule.by === 'ip') rule.max = 10_000;
  }
  return {
    databaseUrl: 'postgresql://dev:dev@localhost:5432/test',
    redisUrl: 'redis://localhost:6379',
    jwt: {
      keys: [{ kid: 'test', secret: randomBytes(32) }],
      issuer: 'test-issuer', audience: 'test-audience', accessTtlSeconds: 900,
    },
    otpHmacKey: randomBytes(32),
    rateLimitHmacKey: randomBytes(32),
    refreshGraceKey: randomBytes(32),
    smtp: { host: 'localhost', port: 1025, from: 'no-reply@localhost', secure: false },
    mailDailyBudget: 1500,
    mailBudgetKey: randomUUID(),
    trustProxy: false,
    corsOrigins: ['http://localhost:3000'],
    problemTypeBase: 'https://api.example.com/problems/',
    adminAppUrl: 'http://localhost:5173',
    maintenanceEnabled: false,
    content: { publishMaxItems: 500 },
    pipeline: {
      importMaxRows: 100,
      importMaxBytes: 10_240,
      exportMaxRows: 50,
      leaseSeconds: 6,
      heartbeatSeconds: 2,
      reconcileSeconds: 1,
      rowRetries: 3,
      jobAttempts: 3,
      fileRetentionDays: 1,
      queuePrefix: 'wordmet-test',
      runWorkers: false,
      jobBackoffMs: 10,
      rowRetryBaseMs: 10,
    },
    limits,
    ...overrides,
  };
}
