import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { loadConfig } from './app-config.js';

function validEnv(): NodeJS.ProcessEnv {
  return {
    DATABASE_URL: 'postgresql://dev:dev@localhost:5432/test',
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
  };
}

describe('loadConfig', () => {
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
