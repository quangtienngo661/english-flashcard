import { isIP } from 'node:net';
import { z } from 'zod';

export const APP_CONFIG = 'APP_CONFIG';

export type RateLimitRuleName =
  | 'sample.create'
  | 'auth.register.ip'
  | 'auth.login.ip'
  | 'auth.otp.ip'
  | 'auth.otp.email.cooldown'
  | 'auth.otp.email.hourly'
  | 'auth.refresh.ip'
  | 'auth.refresh.chain'
  | 'auth.logout.ip'
  | 'auth.reset.ip'
  | 'mail.ip.daily'
  | 'user.write'
  | 'learning.review';

export interface RateLimitRuleConfig {
  by: 'user' | 'ip' | 'email' | 'chain';
  max: number;
  windowSeconds: number;
}

export interface AppConfig {
  databaseUrl: string;
  redisUrl: string;
  jwt: {
    keys: Array<{ kid: string; secret: Uint8Array }>;
    issuer: string;
    audience: string;
    accessTtlSeconds: number;
  };
  otpHmacKey: Buffer;
  rateLimitHmacKey: Buffer;
  refreshGraceKey: Buffer;
  smtp: {
    host: string;
    port: number;
    user?: string;
    pass?: string;
    from: string;
    secure: boolean;
  };
  mailDailyBudget: number;
  mailBudgetKey: string;
  trustProxy: string | false;
  corsOrigins: string[];
  problemTypeBase: string;
  adminAppUrl: string;
  /** Origin of the learner app (apps/web); reminder emails link to `<learnerAppUrl>/<language>/app/settings`. */
  learnerAppUrl: string;
  maintenanceEnabled: boolean;
  content: {
    publishMaxItems: number;
  };
  pipeline: {
    importMaxRows: number;
    importMaxBytes: number;
    exportMaxRows: number;
    leaseSeconds: number;
    heartbeatSeconds: number;
    reconcileSeconds: number;
    rowRetries: number;
    jobAttempts: number;
    fileRetentionDays: number;
    queuePrefix: string;
    runWorkers: boolean;
    jobBackoffMs: number;
    rowRetryBaseMs: number;
  };
  limits: Record<RateLimitRuleName, RateLimitRuleConfig>;
}

export const DEFAULT_LIMITS: Record<RateLimitRuleName, RateLimitRuleConfig> = {
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
  // Flashcard answers: a fast session goes well past 30 a minute.
  'learning.review': { by: 'user', max: 120, windowSeconds: 60 },
};

const nonEmpty = z.string().trim().min(1);
const positiveInteger = nonEmpty.regex(/^\d+$/).transform(Number).pipe(z.number().int().positive().safe());
const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

function secretSchema(exactLength?: number) {
  return z.string().regex(/^[A-Za-z0-9_-]+$/)
    .refine((value) => Buffer.from(value, 'base64url').toString('base64url') === value)
    .transform((value) => Buffer.from(value, 'base64url'))
    .refine((value) => exactLength === undefined ? value.length >= 32 : value.length === exactLength);
}

const jwtKeySchema = nonEmpty.transform((value) => value.split(',').map((entry) => {
  const [kid, secret, ...extra] = entry.trim().split(':');
  return { kid, secret, extra };
})).pipe(z.array(z.object({
  kid: nonEmpty,
  secret: secretSchema(),
  extra: z.array(z.string()).length(0),
})).min(1))
  .refine((keys) => new Set(keys.map((key) => key.kid)).size === keys.length)
  .transform((keys) => keys.map(({ kid, secret }) => ({ kid, secret })));

function isTrustedProxy(value: string): boolean {
  return value.split(',').every((entry) => {
    const address = entry.trim();
    if (['loopback', 'linklocal', 'uniquelocal'].includes(address)) return true;
    const [ip, prefix, ...extra] = address.split('/');
    const version = isIP(ip);
    if (!version || extra.length > 0) return false;
    if (prefix === undefined) return true;
    return /^\d+$/.test(prefix) && Number(prefix) <= (version === 4 ? 32 : 128);
  });
}

const envSchema = z.object({
  DATABASE_URL: z.url().transform((value) => new URL(value))
    .refine((value) => ['postgres:', 'postgresql:'].includes(value.protocol))
    .transform((value) => value.toString()),
  REDIS_URL: z.url().transform((value) => new URL(value))
    .refine((value) => ['redis:', 'rediss:'].includes(value.protocol))
    .transform((value) => value.toString()),
  JWT_KEYS: jwtKeySchema,
  JWT_ISSUER: nonEmpty,
  JWT_AUDIENCE: nonEmpty,
  OTP_HMAC_KEY: secretSchema(),
  RATE_LIMIT_HMAC_KEY: secretSchema(),
  REFRESH_GRACE_KEY: secretSchema(32),
  SMTP_HOST: nonEmpty,
  SMTP_PORT: positiveInteger.refine((value) => value <= 65535),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: nonEmpty,
  SMTP_SECURE: booleanString.default(false),
  MAIL_DAILY_BUDGET: positiveInteger.default(1500),
  MAIL_BUDGET_KEY: nonEmpty.default('global'),
  TRUST_PROXY: nonEmpty.refine((value) => value === 'false' || isTrustedProxy(value))
    .transform((value): string | false => value === 'false' ? false : value).default(false),
  CORS_ORIGINS: nonEmpty.transform((value) => value.split(',').map((origin) => origin.trim()))
    .pipe(z.array(z.url().transform((value) => ({ value, url: new URL(value) }))
      .refine(({ value, url }) => ['http:', 'https:'].includes(url.protocol) && url.origin === value)
      .transform(({ value }) => value)).min(1)),
  PROBLEM_TYPE_BASE: z.url(),
  ADMIN_APP_URL: z.url(),
  LEARNER_APP_URL: z.url().refine((value) => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && url.origin === value;
  }),
  MAINTENANCE_ENABLED: booleanString.default(true),
  ACCESS_TOKEN_TTL_SECONDS: positiveInteger.default(900),
  PUBLISH_MAX_ITEMS: positiveInteger.default(500),
  IMPORT_MAX_ROWS: positiveInteger.default(20_000),
  IMPORT_MAX_BYTES: positiveInteger.default(10_485_760),
  EXPORT_MAX_ROWS: positiveInteger.default(5_000),
  IMPORT_LEASE_SECONDS: positiveInteger.default(60),
  IMPORT_HEARTBEAT_SECONDS: positiveInteger.default(20),
  IMPORT_RECONCILE_SECONDS: positiveInteger.default(30),
  IMPORT_ROW_RETRIES: positiveInteger.default(3),
  IMPORT_JOB_ATTEMPTS: positiveInteger.default(3),
  IMPORT_FILE_RETENTION_DAYS: positiveInteger.default(30),
  JOB_QUEUE_PREFIX: nonEmpty.default('wordmet'),
  IMPORT_JOB_BACKOFF_MS: positiveInteger.default(5_000),
  IMPORT_ROW_RETRY_BASE_MS: positiveInteger.default(200),
});

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
    throw new Error(`Missing or invalid configuration variables: ${names.join(', ')}`);
  }
  const values = result.data;
  return {
    databaseUrl: values.DATABASE_URL,
    redisUrl: values.REDIS_URL,
    jwt: {
      keys: values.JWT_KEYS,
      issuer: values.JWT_ISSUER,
      audience: values.JWT_AUDIENCE,
      accessTtlSeconds: values.ACCESS_TOKEN_TTL_SECONDS,
    },
    otpHmacKey: values.OTP_HMAC_KEY,
    rateLimitHmacKey: values.RATE_LIMIT_HMAC_KEY,
    refreshGraceKey: values.REFRESH_GRACE_KEY,
    smtp: {
      host: values.SMTP_HOST,
      port: values.SMTP_PORT,
      user: values.SMTP_USER || undefined,
      pass: values.SMTP_PASS || undefined,
      from: values.SMTP_FROM,
      secure: values.SMTP_SECURE,
    },
    mailDailyBudget: values.MAIL_DAILY_BUDGET,
    mailBudgetKey: values.MAIL_BUDGET_KEY,
    trustProxy: values.TRUST_PROXY,
    corsOrigins: values.CORS_ORIGINS,
    problemTypeBase: values.PROBLEM_TYPE_BASE,
    adminAppUrl: values.ADMIN_APP_URL,
    learnerAppUrl: values.LEARNER_APP_URL,
    maintenanceEnabled: values.MAINTENANCE_ENABLED,
    content: { publishMaxItems: values.PUBLISH_MAX_ITEMS },
    pipeline: {
      importMaxRows: values.IMPORT_MAX_ROWS,
      importMaxBytes: values.IMPORT_MAX_BYTES,
      exportMaxRows: values.EXPORT_MAX_ROWS,
      leaseSeconds: values.IMPORT_LEASE_SECONDS,
      heartbeatSeconds: values.IMPORT_HEARTBEAT_SECONDS,
      reconcileSeconds: values.IMPORT_RECONCILE_SECONDS,
      rowRetries: values.IMPORT_ROW_RETRIES,
      jobAttempts: values.IMPORT_JOB_ATTEMPTS,
      fileRetentionDays: values.IMPORT_FILE_RETENTION_DAYS,
      queuePrefix: values.JOB_QUEUE_PREFIX,
      runWorkers: false,
      jobBackoffMs: values.IMPORT_JOB_BACKOFF_MS,
      rowRetryBaseMs: values.IMPORT_ROW_RETRY_BASE_MS,
    },
    limits: structuredClone(DEFAULT_LIMITS),
  };
}
