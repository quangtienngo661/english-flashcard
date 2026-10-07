import { randomUUID } from 'node:crypto';
import type { Response } from 'supertest';
import { normalizeEmail } from '../../src/common/email/normalize-email.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { PasswordHasher } from '../../src/identity/auth/password-hasher.service.js';
import type { ClientType, StaffRole, SupportedLanguage } from '../../src/identity/identity.types.js';
import { SessionService, type IssuedSession } from '../../src/identity/sessions/session.service.js';
import { withUserLock } from '../../src/identity/user-lock.js';
import type { TestApp } from './create-test-app.js';

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };

export async function seedUser(prisma: PrismaClient, opts?: {
  email?: string; password?: string; verified?: boolean; staffRole?: StaffRole; nativeLanguage?: SupportedLanguage;
}): Promise<{ userId: string; email: string; password: string }> {
  const userId = randomUUID();
  const email = normalizeEmail(opts?.email ?? `${randomUUID()}@example.com`);
  if (!email) throw new Error('Invalid seed email');
  const password = opts?.password ?? 'Password1!';
  // Hashing happens before the transaction, just like the production auth flows.
  const hash = await new PasswordHasher().hash(password);
  await prisma.$transaction(async (tx) => {
    await withUserLock(tx, userId);
    await tx.user.create({
      data: {
        id: userId, email, timezone: 'Asia/Ho_Chi_Minh',
        emailVerifiedAt: opts?.verified ? new Date('2026-10-07T00:00:00Z') : null,
        staffRole: opts?.staffRole, nativeLanguage: opts?.nativeLanguage,
        passwordCredential: { create: { hash } },
      },
    });
  }, transactionOptions);
  return { userId, email, password };
}

export function startSession(t: TestApp, userId: string, client: ClientType = 'mobile'): Promise<IssuedSession> {
  const sessions = t.app.get(SessionService);
  return t.prisma.$transaction(async (tx) => {
    await withUserLock(tx, userId);
    return sessions.startChain(tx, { userId, client });
  }, transactionOptions);
}

export function cookieFrom(res: Pick<Response, 'headers'>): string | undefined {
  const header: unknown = res.headers['set-cookie'];
  const cookies = typeof header === 'string' ? [header] : Array.isArray(header) ? header : [];
  const cookie = cookies.find((value: unknown): value is string =>
    typeof value === 'string' && value.startsWith('refresh_token='));
  return cookie?.split(';')[0];
}
