import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
    TERMS_VERSION: '2026-10-20',
    TURNSTILE_MODE: 'off',
  };
}

// A production-grade bot check: BILLING_PRODUCTION=true refuses `fake` and `off` (LA1#10), so the billing and AI tests below use this.
const turnstileReal = { TURNSTILE_MODE: 'real', TURNSTILE_SECRET_KEY: 's', TURNSTILE_ALLOWED_HOSTNAMES: 'wordmet.com' };

describe('Google sign-in configuration (Bước 8)', () => {
  const key = () => randomBytes(32).toString('base64url');
  const real = () => ({ ...validEnv(), GOOGLE_CLIENT_ID: 'id.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'secret',
    GOOGLE_REDIRECT_URI: 'https://api.example.com/v1/auth/google/callback', OAUTH_COOKIE_KEY: key() });

  it('is off by default and needs none of the Google variables', () => {
    expect(loadConfig(validEnv()).google).toEqual({ mode: 'off', clientId: null, clientSecret: null, redirectUri: null, apiOrigin: null, cookieKey: null });
  });

  it('a client id makes it real: the secret, the redirect URI and the cookie key are then required; apiOrigin comes from the redirect URI', () => {
    const config = loadConfig(real());
    expect(config.google).toMatchObject({ mode: 'real', clientId: 'id.apps.googleusercontent.com', clientSecret: 'secret',
      redirectUri: 'https://api.example.com/v1/auth/google/callback', apiOrigin: 'https://api.example.com' });
    expect(config.google.cookieKey).toHaveLength(32);
    for (const name of ['GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI', 'OAUTH_COOKIE_KEY']) {
      const env = real();
      delete (env as Record<string, string | undefined>)[name];
      expect(() => loadConfig(env), name).toThrow(new RegExp(name));
    }
  });

  it('a blank client id counts as unset (an empty line in .env)', () => {
    expect(loadConfig({ ...validEnv(), GOOGLE_CLIENT_ID: '  ', GOOGLE_CLIENT_SECRET: '' }).google.mode).toBe('off');
  });

  it('the fake needs a redirect URI and a cookie key but no client; it wins over a client id (P18)', () => {
    const fake = { ...validEnv(), GOOGLE_FAKE_ENABLED: 'true', GOOGLE_REDIRECT_URI: 'http://localhost:3000/v1/auth/google/callback', OAUTH_COOKIE_KEY: key() };
    expect(loadConfig(fake).google).toMatchObject({ mode: 'fake', apiOrigin: 'http://localhost:3000' });
    expect(loadConfig({ ...fake, GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 's' }).google.mode).toBe('fake');
    const noUri = { ...fake } as Record<string, string | undefined>;
    delete noUri.GOOGLE_REDIRECT_URI;
    expect(() => loadConfig(noUri)).toThrow(/GOOGLE_REDIRECT_URI/);
  });

  it('B8E38: the fake together with BILLING_PRODUCTION=true refuses to start', () => {
    const env = { ...validEnv(), GOOGLE_FAKE_ENABLED: 'true', BILLING_PRODUCTION: 'true', GOOGLE_REDIRECT_URI: 'http://localhost:3000/cb', OAUTH_COOKIE_KEY: key() };
    expect(() => loadConfig(env)).toThrow(/GOOGLE_FAKE_ENABLED/);
  });

  it('the cookie key must be a 32-byte secret', () => {
    expect(() => loadConfig({ ...real(), OAUTH_COOKIE_KEY: 'short' })).toThrow(/OAUTH_COOKIE_KEY/);
  });
});

describe('payOS configuration (launch prep B, design §3.3)', () => {
  const secret = () => randomBytes(32).toString('base64url');
  const NAMES = ['PAYOS_CLIENT_ID', 'PAYOS_API_KEY', 'PAYOS_CHECKSUM_KEY'] as const;
  const real = (): NodeJS.ProcessEnv => ({ ...validEnv(), PAYOS_CLIENT_ID: 'client-id', PAYOS_API_KEY: 'api-key', PAYOS_CHECKSUM_KEY: 'checksum-key' });
  const fake = (): NodeJS.ProcessEnv => ({ ...validEnv(), PAYOS_FAKE_ENABLED: 'true', BILLING_FAKE_SECRET: secret() });

  it('is off by default and needs none of the variables', () => {
    expect(loadConfig(validEnv()).payos).toEqual({ mode: 'off', clientId: null, apiKey: null, checksumKey: null });
  });

  it('all three variables make it real, in production too', () => {
    expect(loadConfig(real()).payos).toEqual({ mode: 'real', clientId: 'client-id', apiKey: 'api-key', checksumKey: 'checksum-key' });
    expect(loadConfig({ ...real(), ...turnstileReal, BILLING_PRODUCTION: 'true' }).payos.mode).toBe('real');
  });

  it('LB1E42: one or two of the three set refuses to start and names the missing ones, not the set ones', () => {
    for (let mask = 1; mask < 7; mask++) {
      const set = NAMES.filter((_, i) => mask & (1 << i));
      const missing = NAMES.filter((name) => !set.includes(name));
      const env = validEnv();
      for (const name of set) env[name] = 'value';
      let message = '';
      try {
        loadConfig(env);
      } catch (error) {
        message = (error as Error).message;
      }
      for (const name of missing) expect(message, `set ${set.join('+')}`).toContain(name);
      for (const name of set) expect(message, `set ${set.join('+')}`).not.toContain(name);
    }
  });

  it('a blank variable counts as unset (an empty line in .env)', () => {
    expect(loadConfig({ ...validEnv(), PAYOS_CLIENT_ID: '', PAYOS_API_KEY: '  ', PAYOS_CHECKSUM_KEY: '' }).payos.mode).toBe('off');
    expect(() => loadConfig({ ...real(), PAYOS_API_KEY: '  ' })).toThrow(/PAYOS_API_KEY/);
  });

  it('the fake needs no payOS variable but BILLING_FAKE_SECRET, which signs its webhooks; it wins over real values', () => {
    expect(loadConfig(fake()).payos).toEqual({ mode: 'fake', clientId: null, apiKey: null, checksumKey: null });
    expect(loadConfig({ ...fake(), PAYOS_CLIENT_ID: 'id' }).payos.mode).toBe('fake');
    const noSecret = fake() as Record<string, string | undefined>;
    delete noSecret.BILLING_FAKE_SECRET;
    expect(() => loadConfig(noSecret)).toThrow(/BILLING_FAKE_SECRET/);
  });

  it('LB1E41: the fake together with BILLING_PRODUCTION=true refuses to start', () => {
    expect(() => loadConfig({ ...fake(), BILLING_PRODUCTION: 'true' })).toThrow(/PAYOS_FAKE_ENABLED/);
  });
});

describe('loadConfig', () => {
  it('TERMS_VERSION is required and kept verbatim', () => {
    expect(loadConfig(validEnv()).termsVersion).toBe('2026-10-20');
    const missing = validEnv();
    delete missing.TERMS_VERSION;
    expect(() => loadConfig(missing)).toThrow(/TERMS_VERSION/);
  });

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
    expect(loadConfig(validEnv()).reminders).toEqual({ tickSeconds: 900, runScheduler: true, retryBackoffMs: 60_000 });
    expect(loadConfig({ ...validEnv(), REMINDER_TICK_SECONDS: '60' }).reminders.tickSeconds).toBe(60);
    for (const bad of ['0', '-5', '1.5', 'often']) {
      expect(() => loadConfig({ ...validEnv(), REMINDER_TICK_SECONDS: bad }), bad).toThrow(/REMINDER_TICK_SECONDS/);
    }
  });

  it('L15 (config): REMINDER_RETRY_BACKOFF_MS defaults to 60000, separate from the import backoff', () => {
    expect(loadConfig({ ...validEnv(), IMPORT_JOB_BACKOFF_MS: '7' }).reminders.retryBackoffMs).toBe(60_000);
    expect(loadConfig({ ...validEnv(), REMINDER_RETRY_BACKOFF_MS: '120000' }).reminders.retryBackoffMs).toBe(120_000);
    expect(() => loadConfig({ ...validEnv(), REMINDER_RETRY_BACKOFF_MS: '0' })).toThrow(/REMINDER_RETRY_BACKOFF_MS/);
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
      exportMaxRows: 10_000,
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
      'auth.verify.ip': { by: 'ip', max: 20, windowSeconds: 3600 },
      'auth.otp.ip': { by: 'ip', max: 20, windowSeconds: 3600 },
      'auth.otp.email.cooldown': { by: 'email', max: 1, windowSeconds: 60 },
      'auth.otp.email.hourly': { by: 'email', max: 5, windowSeconds: 3600 },
      'auth.refresh.ip': { by: 'ip', max: 60, windowSeconds: 60 },
      'auth.refresh.chain': { by: 'chain', max: 10, windowSeconds: 60 },
      'auth.logout.ip': { by: 'ip', max: 60, windowSeconds: 60 },
      'auth.reset.ip': { by: 'ip', max: 20, windowSeconds: 3600 },
      'mail.ip.daily': { by: 'ip', max: 20, windowSeconds: 86400 },
      'user.write': { by: 'user', max: 30, windowSeconds: 60 },
      'learning.review': { by: 'user', max: 120, windowSeconds: 60 },
      'practice.answer': { by: 'user', max: 120, windowSeconds: 60 },
      'ai.test': { by: 'user', max: 20, windowSeconds: 3600 },
      'entitlements.lookup': { by: 'user', max: 60, windowSeconds: 3600 },
      'auth.google.ip': { by: 'ip', max: 20, windowSeconds: 60 },
      'auth.delete.user': { by: 'user', max: 5, windowSeconds: 3600 },
      'auth.captcha.ip': { by: 'ip', max: 60, windowSeconds: 60 },
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

  it('R17 (config): billing defaults to not production, the fake provider off, no secret, fetchState on', () => {
    expect(loadConfig(validEnv()).billing).toEqual({
      production: false, fakeEnabled: false, fakeSecret: null, fakeFetchState: true,
    });
  });

  it('R17 (config): BILLING_PRODUCTION=true with BILLING_FAKE_ENABLED=true fails naming both', () => {
    const secret = randomBytes(32).toString('base64url');
    const env = { ...validEnv(), ...turnstileReal, BILLING_PRODUCTION: 'true', BILLING_FAKE_ENABLED: 'true', BILLING_FAKE_SECRET: secret };
    expect(() => loadConfig(env)).toThrow(/BILLING_PRODUCTION, BILLING_FAKE_ENABLED/);
    expect(loadConfig({ ...validEnv(), ...turnstileReal, BILLING_PRODUCTION: 'true' }).billing).toMatchObject({ production: true, fakeEnabled: false });
  });

  it('R10 (config): the fake provider enabled without a secret fails naming BILLING_FAKE_SECRET; with one it is bytes', () => {
    expect(() => loadConfig({ ...validEnv(), BILLING_FAKE_ENABLED: 'true' })).toThrow(/BILLING_FAKE_SECRET/);
    expect(() => loadConfig({ ...validEnv(), BILLING_FAKE_ENABLED: 'true', BILLING_FAKE_SECRET: 'short' }))
      .toThrow(/BILLING_FAKE_SECRET/);
    const secret = randomBytes(32);
    const billing = loadConfig({
      ...validEnv(), BILLING_FAKE_ENABLED: 'true', BILLING_FAKE_SECRET: secret.toString('base64url'),
      BILLING_FAKE_FETCH_STATE: 'false',
    }).billing;
    expect(billing).toEqual({ production: false, fakeEnabled: true, fakeSecret: secret, fakeFetchState: false });
  });

  it.each(['BILLING_PRODUCTION', 'BILLING_FAKE_ENABLED', 'BILLING_FAKE_FETCH_STATE'])('%s accepts only true or false', (name) => {
    expect(() => loadConfig({ ...validEnv(), [name]: 'yes' })).toThrow(new RegExp(name));
  });

  it('B6E45: AI_FAKE_ENABLED=true with BILLING_PRODUCTION=true fails naming both variables', () => {
    expect(() => loadConfig({ ...validEnv(), ...turnstileReal, BILLING_PRODUCTION: 'true', AI_FAKE_ENABLED: 'true' }))
      .toThrow(/BILLING_PRODUCTION, AI_FAKE_ENABLED/);
    expect(loadConfig({ ...validEnv(), ...turnstileReal, BILLING_PRODUCTION: 'true', AI_FAKE_ENABLED: 'false' }).ai.fakeEnabled).toBe(false);
    expect(loadConfig({ ...validEnv(), AI_FAKE_ENABLED: 'true' }).ai.fakeEnabled).toBe(true);
    expect(() => loadConfig({ ...validEnv(), AI_FAKE_ENABLED: 'yes' })).toThrow(/AI_FAKE_ENABLED/);
  });

  it('B6E33: an empty or blank OPENAI_API_KEY loads as null', () => {
    for (const blank of ['', '   ']) {
      const ai = loadConfig({ ...validEnv(), OPENAI_API_KEY: blank, ANTHROPIC_API_KEY: blank }).ai;
      expect(ai.openaiApiKey, JSON.stringify(blank)).toBeNull();
      expect(ai.anthropicApiKey, JSON.stringify(blank)).toBeNull();
    }
    expect(loadConfig(validEnv()).ai).toEqual({ openaiApiKey: null, anthropicApiKey: null, fakeEnabled: false });
  });

  it('keys load trimmed', () => {
    const ai = loadConfig({ ...validEnv(), OPENAI_API_KEY: '  sk-open  ', ANTHROPIC_API_KEY: '\tsk-ant\n' }).ai;
    expect([ai.openaiApiKey, ai.anthropicApiKey]).toEqual(['sk-open', 'sk-ant']);
  });

  it('AI_FAKE_ENABLED defaults to false', () => {
    expect(loadConfig(validEnv()).ai.fakeEnabled).toBe(false);
  });

  it('a configuration error never contains a key\'s value', () => {
    const env = { ...validEnv(), OPENAI_API_KEY: 'sk-secret-123', ANTHROPIC_API_KEY: 'sk-secret-456', SMTP_PORT: 'x' };
    let message = '';
    try { loadConfig(env); } catch (error) { message = (error as Error).message; }
    expect(message).toMatch(/SMTP_PORT/);
    expect(message).not.toMatch(/sk-secret/);
  });

  it('ai.test allows 20 per hour per user', () => {
    expect(loadConfig(validEnv()).limits['ai.test']).toEqual({ by: 'user', max: 20, windowSeconds: 3600 });
  });

  it.each(['OPENAI_CUSTOM_HEADERS', 'ANTHROPIC_CUSTOM_HEADERS'])('D29: %s set → refuses to start, naming the variable, never its value', (name) => {
    const env = { ...validEnv(), [name]: 'OpenAI-Organization: org-x' };
    expect(env[name]).toContain('org-x');
    let message = '';
    try {
      loadConfig(env);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain(name);
    expect(message).not.toContain('org-x');
  });

  it.each(['', '   '])('D29: custom-header variables set to %j → starts as if unset', (value) => {
    expect(() => loadConfig({ ...validEnv(), OPENAI_CUSTOM_HEADERS: value, ANTHROPIC_CUSTOM_HEADERS: value })).not.toThrow();
  });

  it('D29: custom-header variables unset → starts', () => {
    const env = validEnv();
    expect(env.OPENAI_CUSTOM_HEADERS).toBeUndefined();
    expect(env.ANTHROPIC_CUSTOM_HEADERS).toBeUndefined();
    expect(() => loadConfig(env)).not.toThrow();
  });

  it('T16: pool defaults are 20 connections and 5000 ms; env overrides them', () => {
    expect(loadConfig(validEnv()).database).toEqual({ poolMax: 20, poolTimeoutMs: 5000 });
    expect(loadConfig({ ...validEnv(), DATABASE_POOL_MAX: '7', DATABASE_POOL_TIMEOUT_MS: '900' }).database)
      .toEqual({ poolMax: 7, poolTimeoutMs: 900 });
  });
});

describe('Turnstile configuration (launch prep A, design 4.2)', () => {
  const envWithout = (name: string) => {
    const env = { ...validEnv() } as Record<string, string | undefined>;
    delete env[name];
    return env;
  };

  it('LA1#8 refuses to start without TURNSTILE_MODE', () => {
    expect(() => loadConfig(envWithout('TURNSTILE_MODE'))).toThrow(/TURNSTILE_MODE/);
  });

  it('TURNSTILE_MODE accepts only real, fake or off', () => {
    expect(() => loadConfig({ ...validEnv(), TURNSTILE_MODE: 'on' })).toThrow(/TURNSTILE_MODE/);
    expect(() => loadConfig({ ...validEnv(), TURNSTILE_MODE: '' })).toThrow(/TURNSTILE_MODE/);
  });

  it('LA1#9 real needs a secret and at least one hostname, and names each missing variable', () => {
    expect(() => loadConfig({ ...validEnv(), TURNSTILE_MODE: 'real' })).toThrow(/TURNSTILE_SECRET_KEY.*TURNSTILE_ALLOWED_HOSTNAMES|TURNSTILE_ALLOWED_HOSTNAMES.*TURNSTILE_SECRET_KEY/);
    expect(() => loadConfig({ ...validEnv(), TURNSTILE_MODE: 'real', TURNSTILE_SECRET_KEY: 's' })).toThrow(/TURNSTILE_ALLOWED_HOSTNAMES/);
    expect(() => loadConfig({ ...validEnv(), TURNSTILE_MODE: 'real', TURNSTILE_ALLOWED_HOSTNAMES: 'wordmet.com' })).toThrow(/TURNSTILE_SECRET_KEY/);
    expect(() => loadConfig({ ...validEnv(), TURNSTILE_MODE: 'real', TURNSTILE_SECRET_KEY: 's', TURNSTILE_ALLOWED_HOSTNAMES: ' , ' })).toThrow(/TURNSTILE_ALLOWED_HOSTNAMES/);
  });

  it('parses the hostname list: trims, drops empty entries', () => {
    const c = loadConfig({ ...validEnv(), TURNSTILE_MODE: 'real', TURNSTILE_SECRET_KEY: 's', TURNSTILE_ALLOWED_HOSTNAMES: 'wordmet.com, www.wordmet.com,admin.wordmet.com,' });
    expect(c.turnstile).toEqual({ mode: 'real', secretKey: 's', allowedHostnames: ['wordmet.com', 'www.wordmet.com', 'admin.wordmet.com'] });
  });

  it('fake and off need neither the secret nor the hostnames', () => {
    expect(loadConfig({ ...validEnv(), TURNSTILE_MODE: 'fake' }).turnstile).toEqual({ mode: 'fake', secretKey: null, allowedHostnames: [] });
    expect(loadConfig(validEnv()).turnstile).toEqual({ mode: 'off', secretKey: null, allowedHostnames: [] });
  });

  it.each(['fake', 'off'])('LA1#10 BILLING_PRODUCTION refuses TURNSTILE_MODE=%s, naming both variables', (mode) => {
    expect(() => loadConfig({ ...validEnv(), BILLING_PRODUCTION: 'true', TURNSTILE_MODE: mode })).toThrow(/BILLING_PRODUCTION, TURNSTILE_MODE/);
  });

  it('BILLING_PRODUCTION accepts TURNSTILE_MODE=real', () => {
    const env = { ...validEnv(), ...turnstileReal, BILLING_PRODUCTION: 'true' };
    expect(loadConfig(env).turnstile.mode).toBe('real');
  });

  // process.loadEnvFile turns a line `KEY=` of apps/api/.env.example into an empty string, not into an unset variable.
  it('an empty TURNSTILE_SECRET_KEY or TURNSTILE_ALLOWED_HOSTNAMES line counts as unset in fake and off modes', () => {
    for (const mode of ['fake', 'off']) {
      const c = loadConfig({ ...validEnv(), TURNSTILE_MODE: mode, TURNSTILE_SECRET_KEY: '', TURNSTILE_ALLOWED_HOSTNAMES: '' });
      expect(c.turnstile).toEqual({ mode, secretKey: null, allowedHostnames: [] });
    }
    expect(loadConfig({ ...validEnv(), TURNSTILE_MODE: 'fake', TURNSTILE_SECRET_KEY: '   ' }).turnstile.secretKey).toBeNull();
  });

  it('real with an empty secret line still refuses to start, naming the variable', () => {
    expect(() => loadConfig({ ...validEnv(), TURNSTILE_MODE: 'real', TURNSTILE_SECRET_KEY: '', TURNSTILE_ALLOWED_HOSTNAMES: 'wordmet.com' })).toThrow(/TURNSTILE_SECRET_KEY/);
  });

  it('adds auth.captcha.ip 60/60s by ip', () => {
    expect(loadConfig(validEnv()).limits['auth.captcha.ip']).toEqual({ by: 'ip', max: 60, windowSeconds: 60 });
  });
});

// The documented default of EXPORT_MAX_ROWS lives in code and in two example env files (apps/api for `pnpm start`, the repo root for
// `pnpm bootstrap`). A copy that disagrees silently caps the words-without-senses export of the Docker stack (7,799 > 5,000).
describe('EXPORT_MAX_ROWS in the example env files (B3-7, review of M2)', () => {
  const valueIn = (file: string) => /^EXPORT_MAX_ROWS=(\d+)\s*$/m.exec(readFileSync(resolve(process.cwd(), file), 'utf8'))?.[1];

  it.each(['.env.example', '../../.env.example'])('%s carries the default of the code', (file) => {
    expect(Number(valueIn(file))).toBe(loadConfig(validEnv()).pipeline.exportMaxRows);
  });
});

// Round C (design §5.4, §5.5): pre-made speech audio. Nothing is required: without the variables the app keeps the browser voice.
describe('speech audio configuration (round C)', () => {
  const credentials = (over: Record<string, unknown> = {}) => Buffer.from(JSON.stringify({
    client_email: 'tts@project.iam.gserviceaccount.com', private_key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
    project_id: 'wordmet-tts', ...over,
  })).toString('base64');
  const r2 = (): NodeJS.ProcessEnv => ({
    ...validEnv(), AUDIO_STORAGE_ENDPOINT: 'https://account.r2.cloudflarestorage.com', AUDIO_STORAGE_BUCKET: 'wordmet-audio',
    AUDIO_STORAGE_ACCESS_KEY_ID: 'key-id', AUDIO_STORAGE_SECRET_ACCESS_KEY: 'key-secret', AUDIO_PUBLIC_BASE_URL: 'https://audio.example.com',
  });

  it('nothing set → no storage, no provider, the voices default, the app starts', () => {
    const config = loadConfig(validEnv());
    expect(config.audio).toMatchObject({ storage: null, publicBaseUrl: null, r2: null });
    expect(config.tts).toMatchObject({ provider: null, credentials: null });
    expect(config.tts.voiceUk).toBe('en-GB-Wavenet-B');
    expect(config.tts.voiceUs).toBe('en-US-Wavenet-D');
  });

  it('voices come from TTS_VOICE_UK and TTS_VOICE_US', () => {
    const config = loadConfig({ ...validEnv(), TTS_VOICE_UK: 'en-GB-Wavenet-C', TTS_VOICE_US: 'en-US-Wavenet-F' });
    expect(config.tts).toMatchObject({ voiceUk: 'en-GB-Wavenet-C', voiceUs: 'en-US-Wavenet-F' });
  });

  it('credentials: base64 of a JSON with client_email, private_key and project_id make the provider google', () => {
    const config = loadConfig({ ...validEnv(), GOOGLE_TTS_CREDENTIALS: credentials() });
    expect(config.tts.provider).toBe('google');
    expect(config.tts.credentials).toEqual({
      clientEmail: 'tts@project.iam.gserviceaccount.com', privateKey: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n', projectId: 'wordmet-tts',
    });
  });

  it('credentials that are not base64 JSON, or lack a field, stop the start and name the variable only', () => {
    for (const bad of ['not-base64-json', Buffer.from('[]').toString('base64'), credentials({ client_email: undefined }),
      credentials({ private_key: '' }), credentials({ project_id: undefined })]) {
      expect(() => loadConfig({ ...validEnv(), GOOGLE_TTS_CREDENTIALS: bad }), bad).toThrow('Missing or invalid configuration variables: GOOGLE_TTS_CREDENTIALS');
    }
  });

  it('a blank credentials line counts as unset', () => {
    expect(loadConfig({ ...validEnv(), GOOGLE_TTS_CREDENTIALS: '  ' }).tts.provider).toBeNull();
  });

  it('the fake provider needs no credentials and wins over real ones', () => {
    expect(loadConfig({ ...validEnv(), TTS_FAKE_ENABLED: 'true' }).tts.provider).toBe('fake');
    expect(loadConfig({ ...validEnv(), TTS_FAKE_ENABLED: 'true', GOOGLE_TTS_CREDENTIALS: credentials() }).tts.provider).toBe('fake');
  });

  it('R2: the four storage variables together make storage r2, with the public base URL', () => {
    const config = loadConfig(r2());
    expect(config.audio).toMatchObject({ storage: 'r2', publicBaseUrl: 'https://audio.example.com', r2: {
      endpoint: 'https://account.r2.cloudflarestorage.com', bucket: 'wordmet-audio', accessKeyId: 'key-id', secretAccessKey: 'key-secret' } });
  });

  it('R2: any one of the four missing → an "all keys together" error naming it', () => {
    for (const name of ['AUDIO_STORAGE_ENDPOINT', 'AUDIO_STORAGE_BUCKET', 'AUDIO_STORAGE_ACCESS_KEY_ID', 'AUDIO_STORAGE_SECRET_ACCESS_KEY']) {
      const env = r2();
      delete (env as Record<string, string | undefined>)[name];
      expect(() => loadConfig(env), name).toThrow(new RegExp(name));
    }
  });

  it('R2 needs the public base URL, which must be an origin-style https or http URL', () => {
    const env = r2();
    delete (env as Record<string, string | undefined>).AUDIO_PUBLIC_BASE_URL;
    expect(() => loadConfig(env)).toThrow(/AUDIO_PUBLIC_BASE_URL/);
    expect(() => loadConfig({ ...r2(), AUDIO_PUBLIC_BASE_URL: 'ftp://x' })).toThrow(/AUDIO_PUBLIC_BASE_URL/);
  });

  it('the public base URL is stored without a trailing slash', () => {
    expect(loadConfig({ ...r2(), AUDIO_PUBLIC_BASE_URL: 'https://audio.example.com/' }).audio.publicBaseUrl).toBe('https://audio.example.com');
  });

  it('the local fake storage needs a public base URL and defaults its folder', () => {
    const fake = { ...validEnv(), AUDIO_STORAGE_FAKE_ENABLED: 'true', AUDIO_PUBLIC_BASE_URL: 'http://localhost:3000/v1/dev/audio' };
    expect(loadConfig(fake).audio).toMatchObject({ storage: 'local', localDir: '.tmp/audio', publicBaseUrl: 'http://localhost:3000/v1/dev/audio' });
    expect(loadConfig({ ...fake, AUDIO_STORAGE_FAKE_DIR: 'out/audio' }).audio.localDir).toBe('out/audio');
    expect(() => loadConfig({ ...validEnv(), AUDIO_STORAGE_FAKE_ENABLED: 'true' })).toThrow(/AUDIO_PUBLIC_BASE_URL/);
  });

  it('the fake storage wins over R2 keys', () => {
    expect(loadConfig({ ...r2(), AUDIO_STORAGE_FAKE_ENABLED: 'true' }).audio.storage).toBe('local');
  });

  it('production refuses both fakes, naming both variables', () => {
    const prod = { ...validEnv(), ...turnstileReal, BILLING_PRODUCTION: 'true' };
    expect(() => loadConfig({ ...prod, TTS_FAKE_ENABLED: 'true' })).toThrow(/BILLING_PRODUCTION, TTS_FAKE_ENABLED/);
    expect(() => loadConfig({ ...prod, AUDIO_STORAGE_FAKE_ENABLED: 'true', AUDIO_PUBLIC_BASE_URL: 'http://localhost/x' }))
      .toThrow(/BILLING_PRODUCTION, AUDIO_STORAGE_FAKE_ENABLED/);
    expect(loadConfig({ ...prod, TTS_FAKE_ENABLED: 'false' }).tts.provider).toBeNull();
  });

  it('.env.example lists every new variable', () => {
    const example = readFileSync(resolve(__dirname, '../../../.env.example'), 'utf8');
    for (const name of ['GOOGLE_TTS_CREDENTIALS', 'TTS_VOICE_UK', 'TTS_VOICE_US', 'TTS_FAKE_ENABLED', 'AUDIO_STORAGE_ENDPOINT', 'AUDIO_STORAGE_BUCKET',
      'AUDIO_STORAGE_ACCESS_KEY_ID', 'AUDIO_STORAGE_SECRET_ACCESS_KEY', 'AUDIO_PUBLIC_BASE_URL', 'AUDIO_STORAGE_FAKE_ENABLED', 'AUDIO_STORAGE_FAKE_DIR']) {
      expect(example, name).toMatch(new RegExp(`^#?\\s*${name}=`, 'm'));
    }
  });
});

