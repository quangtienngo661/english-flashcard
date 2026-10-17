import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { loadConfig } from './app-config.js';

function validEnv(): NodeJS.ProcessEnv {
  return {
    DATABASE_URL: 'postgresql://dev:dev@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6380',
    JWT_KEYS: `k1:${randomBytes(32).toString('base64url')}`,
    JWT_ISSUER: 'test-issuer',
    JWT_AUDIENCE: 'test-audience',
    OTP_HMAC_KEY: randomBytes(32).toString('base64url'),
    RATE_LIMIT_HMAC_KEY: randomBytes(32).toString('base64url'),
    REFRESH_GRACE_KEY: randomBytes(32).toString('base64url'),
    SMTP_HOST: 'localhost',
    SMTP_PORT: '1025',
    SMTP_FROM: 'no-reply@localhost',
    CORS_ORIGINS: 'https://app.example.com,https://admin.example.com',
    PROBLEM_TYPE_BASE: 'https://api.example.com/problems/',
    ADMIN_APP_URL: 'https://admin.example.com',
    LEARNER_APP_URL: 'https://wordmet.example.com',
  };
}

describe('loadConfig', () => {
  it('Task 20 (config): a missing LEARNER_APP_URL fails fast naming it; it must be an http(s) origin and is exposed as learnerAppUrl', () => {
    expect(loadConfig(validEnv()).learnerAppUrl).toBe('https://wordmet.example.com');
    expect(loadConfig({ ...validEnv(), LEARNER_APP_URL: 'http://localhost:3001' }).learnerAppUrl).toBe('http://localhost:3001');
    const missing = validEnv();
    delete missing.LEARNER_APP_URL;
    expect(() => loadConfig(missing)).toThrow(/LEARNER_APP_URL/);
    for (const bad of ['not a url', 'https://wordmet.example.com/', 'https://wordmet.example.com/vi/app', 'ftp://wordmet.example.com']) {
      expect(() => loadConfig({ ...validEnv(), LEARNER_APP_URL: bad }), bad).toThrow(/LEARNER_APP_URL/);
    }
  });

  it('Task 21 (config): REMINDER_TICK_SECONDS defaults to 900 (15 minutes) and must be a positive integer', () => {
    expect(loadConfig(validEnv()).reminders).toEqual({ tickSeconds: 900 });
    expect(loadConfig({ ...validEnv(), REMINDER_TICK_SECONDS: '60' }).reminders.tickSeconds).toBe(60);
    for (const bad of ['0', '-5', '1.5', 'often']) {
      expect(() => loadConfig({ ...validEnv(), REMINDER_TICK_SECONDS: bad }), bad).toThrow(/REMINDER_TICK_SECONDS/);
    }
  });

  it('B25#23 (config): ADMIN_APP_URL is required, must be a URL, and is exposed as adminAppUrl', () => {
    expect(loadConfig(validEnv()).adminAppUrl).toBe('https://admin.example.com');
    const missing = validEnv();
    delete missing.ADMIN_APP_URL;
    expect(() => loadConfig(missing)).toThrow(/ADMIN_APP_URL/);
    expect(() => loadConfig({ ...validEnv(), ADMIN_APP_URL: 'not a url' })).toThrow(/ADMIN_APP_URL/);
  });

  it('B2#4 (config): missing REDIS_URL fails fast and names the variable', () => {
    const env = validEnv();
    delete env.REDIS_URL;
    expect(() => loadConfig(env)).toThrow(/REDIS_URL/);
  });

  it.each(['0', 'abc'])('B2#4 (config): IMPORT_MAX_ROWS=%s fails fast and names the variable', (value) => {
    expect(() => loadConfig({ ...validEnv(), IMPORT_MAX_ROWS: value })).toThrow(/IMPORT_MAX_ROWS/);
  });

  it('B2#4 (config): optional pipeline variables use the documented defaults', () => {
    const config = loadConfig(validEnv());
    expect(config.redisUrl).toBe('redis://localhost:6380');
    expect(config.pipeline).toEqual({
      importMaxRows: 20_000,
      importMaxBytes: 10_485_760,
      exportMaxRows: 5_000,
      leaseSeconds: 60,
      heartbeatSeconds: 20,
      reconcileSeconds: 30,
      rowRetries: 3,
      jobAttempts: 3,
      fileRetentionDays: 30,
      queuePrefix: 'wordmet',
      runWorkers: false,
      jobBackoffMs: 5_000,
      rowRetryBaseMs: 200,
    });
  });

  it('B2#4 (config): JOB_QUEUE_PREFIX defaults to wordmet', () => {
    expect(loadConfig(validEnv()).pipeline.queuePrefix).toBe('wordmet');
  });

  it('B2#4 (config): parses explicit pipeline values with workers disabled', () => {
    expect(loadConfig({
      ...validEnv(),
      IMPORT_MAX_ROWS: '100',
      IMPORT_MAX_BYTES: '1024',
      EXPORT_MAX_ROWS: '50',
      IMPORT_LEASE_SECONDS: '6',
      IMPORT_HEARTBEAT_SECONDS: '2',
      IMPORT_RECONCILE_SECONDS: '3',
      IMPORT_ROW_RETRIES: '2',
      IMPORT_JOB_ATTEMPTS: '2',
      IMPORT_FILE_RETENTION_DAYS: '7',
      JOB_QUEUE_PREFIX: 'custom-prefix',
      IMPORT_JOB_BACKOFF_MS: '10',
      IMPORT_ROW_RETRY_BASE_MS: '10',
    }).pipeline).toEqual({
      importMaxRows: 100,
      importMaxBytes: 1024,
      exportMaxRows: 50,
      leaseSeconds: 6,
      heartbeatSeconds: 2,
      reconcileSeconds: 3,
      rowRetries: 2,
      jobAttempts: 2,
      fileRetentionDays: 7,
      queuePrefix: 'custom-prefix',
      runWorkers: false,
      jobBackoffMs: 10,
      rowRetryBaseMs: 10,
    });
  });

  it('B2#45a (config): publishMaxItems defaults to 500 and accepts an explicit positive integer', () => {
    expect(loadConfig(validEnv()).content.publishMaxItems).toBe(500);
    expect(loadConfig({ ...validEnv(), PUBLISH_MAX_ITEMS: '25' }).content.publishMaxItems).toBe(25);
  });

  it.each(['abc', '0', '-1', '1.5', '9007199254740992'])('B2#45a (config): PUBLISH_MAX_ITEMS=%s fails fast and names the variable', (value) => {
    expect(() => loadConfig({ ...validEnv(), PUBLISH_MAX_ITEMS: value })).toThrow(/PUBLISH_MAX_ITEMS/);
  });

  it('rejects a missing JWT_KEYS and names it', () => {
    const env = validEnv();
    delete env.JWT_KEYS;
    expect(() => loadConfig(env)).toThrow(/JWT_KEYS/);
  });

  it('rejects a 31-byte OTP_HMAC_KEY', () => {
    expect(() => loadConfig({ ...validEnv(), OTP_HMAC_KEY: randomBytes(31).toString('base64url') }))
      .toThrow(/OTP_HMAC_KEY/);
  });

  it('rejects a 48-byte REFRESH_GRACE_KEY', () => {
    expect(() => loadConfig({ ...validEnv(), REFRESH_GRACE_KEY: randomBytes(48).toString('base64url') }))
      .toThrow(/REFRESH_GRACE_KEY/);
  });

  it('B1E32: rejects TRUST_PROXY=true', () => {
    expect(() => loadConfig({ ...validEnv(), TRUST_PROXY: 'true' })).toThrow(/TRUST_PROXY/);
  });

  it('applies every documented default', () => {
    const config = loadConfig(validEnv());
    expect(config).toMatchObject({
      jwt: { accessTtlSeconds: 900 },
      smtp: { secure: false },
      mailDailyBudget: 1500,
      mailBudgetKey: 'global',
      trustProxy: false,
      maintenanceEnabled: true,
      corsOrigins: ['https://app.example.com', 'https://admin.example.com'],
    });
    expect(config.limits).toEqual({
      'sample.create': { by: 'user', max: 10, windowSeconds: 60 },
      'auth.register.ip': { by: 'ip', max: 5, windowSeconds: 3600 },
      'auth.login.ip': { by: 'ip', max: 20, windowSeconds: 60 },
      'auth.otp.ip': { by: 'ip', max: 20, windowSeconds: 3600 },
      'auth.otp.email.cooldown': { by: 'email', max: 1, windowSeconds: 60 },
      'auth.otp.email.hourly': { by: 'email', max: 5, windowSeconds: 3600 },
      'auth.refresh.ip': { by: 'ip', max: 60, windowSeconds: 60 },
      'auth.refresh.chain': { by: 'chain', max: 10, windowSeconds: 60 },
      'auth.logout.ip': { by: 'ip', max: 60, windowSeconds: 60 },
      'auth.reset.ip': { by: 'ip', max: 20, windowSeconds: 3600 },
      'mail.ip.daily': { by: 'ip', max: 20, windowSeconds: 86400 },
      'user.write': { by: 'user', max: 30, windowSeconds: 60 },
    });
  });

  it('parses JWT_KEYS "k1:..,k0:.." in order', () => {
    const first = randomBytes(32);
    const second = randomBytes(48);
    const config = loadConfig({
      ...validEnv(),
      JWT_KEYS: `k1:${first.toString('base64url')},k0:${second.toString('base64url')}`,
    });
    expect(config.jwt.keys).toEqual([
      { kid: 'k1', secret: first },
      { kid: 'k0', secret: second },
    ]);
  });

  it('accepts a non-empty JWT kid containing punctuation', () => {
    const env = validEnv();
    env.JWT_KEYS = `signing.key.v1:${randomBytes(32).toString('base64url')}`;
    expect(loadConfig(env).jwt.keys[0].kid).toBe('signing.key.v1');
  });

  it('names every missing or invalid variable in one error without exposing secrets', () => {
    const env: NodeJS.ProcessEnv = { ...validEnv(), SMTP_PORT: 'invalid', OTP_HMAC_KEY: 'private-invalid-secret' };
    delete env.JWT_KEYS;
    let message = '';
    try {
      loadConfig(env);
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain('JWT_KEYS');
    expect(message).toContain('SMTP_PORT');
    expect(message).toContain('OTP_HMAC_KEY');
    expect(message).not.toContain('private-invalid-secret');
  });

  it.each(['!!!', randomBytes(31).toString('base64url')])('rejects invalid JWT secrets: %s', (secret) => {
    expect(() => loadConfig({ ...validEnv(), JWT_KEYS: `k1:${secret}` })).toThrow(/JWT_KEYS/);
  });

  it('parses explicit optional values and trusted proxy addresses', () => {
    expect(loadConfig({
      ...validEnv(), SMTP_SECURE: 'true', SMTP_USER: 'user', SMTP_PASS: 'pass',
      MAIL_DAILY_BUDGET: '42', MAIL_BUDGET_KEY: 'provider', TRUST_PROXY: 'loopback, 10.0.0.0/8',
      MAINTENANCE_ENABLED: 'false', ACCESS_TOKEN_TTL_SECONDS: '60',
    })).toMatchObject({
      smtp: { secure: true, user: 'user', pass: 'pass' },
      mailDailyBudget: 42, mailBudgetKey: 'provider', trustProxy: 'loopback, 10.0.0.0/8',
      maintenanceEnabled: false, jwt: { accessTtlSeconds: 60 },
    });
  });
});
