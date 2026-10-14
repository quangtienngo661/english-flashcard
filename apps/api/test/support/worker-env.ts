import { randomBytes, randomUUID } from 'node:crypto';

export function workerEnv(databaseUrl: string, redisUrl: string, queuePrefix: string): NodeJS.ProcessEnv {
  const secret = () => randomBytes(32).toString('base64url');
  return {
    ...process.env,
    DATABASE_URL: databaseUrl,
    REDIS_URL: redisUrl,
    JWT_KEYS: `test:${secret()}`,
    JWT_ISSUER: 'test-issuer',
    JWT_AUDIENCE: 'test-audience',
    OTP_HMAC_KEY: secret(),
    RATE_LIMIT_HMAC_KEY: secret(),
    REFRESH_GRACE_KEY: secret(),
    SMTP_HOST: 'localhost',
    SMTP_PORT: '1025',
    SMTP_FROM: 'no-reply@localhost',
    SMTP_SECURE: 'false',
    CORS_ORIGINS: 'http://localhost:3000',
    PROBLEM_TYPE_BASE: 'https://api.example.com/problems/',
    ADMIN_APP_URL: 'http://localhost:5173',
    MAIL_DAILY_BUDGET: '1500',
    MAIL_BUDGET_KEY: randomUUID(),
    TRUST_PROXY: 'false',
    MAINTENANCE_ENABLED: 'false',
    JOB_QUEUE_PREFIX: queuePrefix,
    IMPORT_RECONCILE_SECONDS: '1',
    IMPORT_JOB_ATTEMPTS: '3',
    IMPORT_LEASE_SECONDS: '6',
    IMPORT_HEARTBEAT_SECONDS: '2',
    IMPORT_JOB_BACKOFF_MS: '10',
  };
}
