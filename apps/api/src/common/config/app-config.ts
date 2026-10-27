import { isIP } from 'node:net';
import { z } from 'zod';

export const APP_CONFIG = 'APP_CONFIG';

export type RateLimitRuleName =
  | 'sample.create'
  | 'auth.register.ip'
  | 'auth.login.ip'
  | 'auth.verify.ip'
  | 'auth.otp.ip'
  | 'auth.otp.email.cooldown'
  | 'auth.otp.email.hourly'
  | 'auth.refresh.ip'
  | 'auth.refresh.chain'
  | 'auth.logout.ip'
  | 'auth.reset.ip'
  | 'mail.ip.daily'
  | 'user.write'
  | 'learning.review'
  | 'practice.answer'
  | 'ai.test'
  | 'entitlements.lookup';

export interface RateLimitRuleConfig {
  by: 'user' | 'ip' | 'email' | 'chain';
  max: number;
  windowSeconds: number;
}

export interface AppConfig {
  databaseUrl: string;
  /** Connection pool of the Prisma client: the size, and how long a request waits for a free connection (T16). */
  database: { poolMax: number; poolTimeoutMs: number };
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
  /** Version of the Terms/Privacy text a learner accepts at registration. */
  termsVersion: string;
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
  reminders: {
    /** How often the worker's reminder tick runs (design 8.1: every 15 minutes). */
    tickSeconds: number;
    /** The worker process starts the reminder scheduler. Tests turn it off unless they test reminders. */
    runScheduler: boolean;
    /** First retry delay of a reminder send after a transient SMTP error; doubles per attempt (L15). */
    retryBackoffMs: number;
  };
  /** Billing gateway (design §9.1). The fake provider never runs in production (R17). */
  billing: {
    production: boolean;
    fakeEnabled: boolean;
    fakeSecret: Buffer | null;
    /** Off lets the smoke run the path of a provider without `fetchState` (R10). */
    fakeFetchState: boolean;
  };
  /** AI gateway (Bước 6, design §13). A key is `null` when that provider is not configured; keys are never logged. */
  ai: {
    openaiApiKey: string | null;
    anthropicApiKey: string | null;
    /** The fake provider (models `fake:*`) never runs in production (B6E45). */
    fakeEnabled: boolean;
  };
  limits: Record<RateLimitRuleName, RateLimitRuleConfig>;
}

export const DEFAULT_LIMITS: Record<RateLimitRuleName, RateLimitRuleConfig> = {
  'sample.create': { by: 'user', max: 10, windowSeconds: 60 },
  'auth.register.ip': { by: 'ip', max: 5, windowSeconds: 3600 },
  'auth.login.ip': { by: 'ip', max: 20, windowSeconds: 60 },
  // ASSUMPTION number, design 4.2.
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
  // Flashcard answers: a fast session goes well past 30 a minute.
  'learning.review': { by: 'user', max: 120, windowSeconds: 60 },
  // Practice next/hint/answer/skip/review: a quick multiple-choice session writes 2–3 times per question (Bước 4 R1).
  'practice.answer': { by: 'user', max: 120, windowSeconds: 60 },
  // Admin test calls of the AI gateway (Bước 6 design §12.1).
  'ai.test': { by: 'user', max: 20, windowSeconds: 3600 },
  // Staff look a learner up by email before a grant (design §5.2): 60 an hour, per staff account.
  'entitlements.lookup': { by: 'user', max: 60, windowSeconds: 3600 },
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
  DATABASE_POOL_MAX: positiveInteger.default(20),
  DATABASE_POOL_TIMEOUT_MS: positiveInteger.default(5000),
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
  TERMS_VERSION: nonEmpty,
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
  REMINDER_TICK_SECONDS: positiveInteger.default(900),
  REMINDER_RETRY_BACKOFF_MS: positiveInteger.default(60_000),
  BILLING_PRODUCTION: booleanString.default(false),
  BILLING_FAKE_ENABLED: booleanString.default(false),
  BILLING_FAKE_SECRET: secretSchema().optional(),
  BILLING_FAKE_FETCH_STATE: booleanString.default(true),
  AI_FAKE_ENABLED: booleanString.default(false),
  OPENAI_API_KEY: z.string().optional().transform((value) => value?.trim() || null),
  ANTHROPIC_API_KEY: z.string().optional().transform((value) => value?.trim() || null),
  // Read by the AI SDKs themselves, which add these headers to every provider call; no client option turns them off (D29).
  OPENAI_CUSTOM_HEADERS: z.string().optional(),
  ANTHROPIC_CUSTOM_HEADERS: z.string().optional(),
}).superRefine((values, ctx) => {
  // Empty or blank counts as unset, as the SDKs' own readEnv does.
  for (const name of ['OPENAI_CUSTOM_HEADERS', 'ANTHROPIC_CUSTOM_HEADERS'] as const) {
    if (values[name]?.trim()) {
      ctx.addIssue({ code: 'custom', path: [name], message: 'must be unset: the AI SDK would add these headers to every provider call (D29)' });
    }
  }
  if (values.BILLING_PRODUCTION && values.BILLING_FAKE_ENABLED) {
    const message = 'The fake billing provider is not allowed in production';
    ctx.addIssue({ code: 'custom', path: ['BILLING_PRODUCTION'], message });
    ctx.addIssue({ code: 'custom', path: ['BILLING_FAKE_ENABLED'], message });
  }
  if (values.BILLING_PRODUCTION && values.AI_FAKE_ENABLED) {
    const message = 'The fake AI provider is not allowed in production';
    ctx.addIssue({ code: 'custom', path: ['BILLING_PRODUCTION'], message });
    ctx.addIssue({ code: 'custom', path: ['AI_FAKE_ENABLED'], message });
  }
  if (values.BILLING_FAKE_ENABLED && values.BILLING_FAKE_SECRET === undefined) {
    ctx.addIssue({ code: 'custom', path: ['BILLING_FAKE_SECRET'], message: 'Required when BILLING_FAKE_ENABLED=true' });
  }
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
    database: { poolMax: values.DATABASE_POOL_MAX, poolTimeoutMs: values.DATABASE_POOL_TIMEOUT_MS },
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
    termsVersion: values.TERMS_VERSION,
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
    reminders: { tickSeconds: values.REMINDER_TICK_SECONDS, runScheduler: true, retryBackoffMs: values.REMINDER_RETRY_BACKOFF_MS },
    billing: {
      production: values.BILLING_PRODUCTION,
      fakeEnabled: values.BILLING_FAKE_ENABLED,
      fakeSecret: values.BILLING_FAKE_SECRET ?? null,
      fakeFetchState: values.BILLING_FAKE_FETCH_STATE,
    },
    ai: {
      openaiApiKey: values.OPENAI_API_KEY,
      anthropicApiKey: values.ANTHROPIC_API_KEY,
      fakeEnabled: values.AI_FAKE_ENABLED,
    },
    limits: structuredClone(DEFAULT_LIMITS),
  };
}
