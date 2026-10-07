import { randomUUID } from 'node:crypto';
import type { Server, ServerResponse } from 'node:http';
import argon2 from 'argon2';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { OtpService } from '../../src/identity/auth/otp.service.js';
import { PasswordHasher } from '../../src/identity/auth/password-hasher.service.js';
import { withUserLock } from '../../src/identity/user-lock.js';
import { cookieFrom, seedUser } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { testConfig } from '../support/test-config.js';

const options = { timeout: 10_000, maxWait: 5_000 };
const problem = (slug: string) => `https://api.example.com/problems/${slug}`;
function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}
async function waitForGate(ready: ReturnType<typeof gate>, pending: Promise<unknown>): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      ready.promise,
      pending.then(() => { throw new Error('Requests completed before reaching the gate'); }),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => { reject(new Error('Requests did not reach the gate within five seconds')); }, 5000);
      }),
    ]);
  } finally { clearTimeout(timer); }
}
function generic(body: Record<string, unknown>) {
  const { operation_id: _operation, instance: _instance, ...rest } = body;
  return rest;
}

describe('registration and password login (e2e)', () => {
  let ctx: TestApp;
  let email: string;
  const password = 'Password1!';
  const registerBody = () => ({ email, password, timezone: 'Asia/Ho_Chi_Minh', client: 'mobile', device_label: 'Phone' });
  const register = (changes = {}) => ctx.http().post('/v1/auth/register').send({ ...registerBody(), ...changes });
  const login = (changes = {}) => ctx.http().post('/v1/auth/login').send({ email, password, client: 'mobile', ...changes });
  const user = () => ctx.prisma.user.findUniqueOrThrow({ where: { email }, include: { passwordCredential: true } });
  const chains = (userId: string) => ctx.prisma.sessionChain.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  async function seed() { return seedUser(ctx.prisma, { email, password }); }
  beforeAll(async () => { ctx = await createTestApp(); });
  beforeEach(() => {
    ctx.clock.set(new Date('2026-10-07T12:00:00Z')); email = `${randomUUID()}@example.com`;
    ctx.mailer.sent.length = 0; ctx.logs.length = 0;
  });
  afterEach(async () => { await ctx.drainMail(); vi.restoreAllMocks(); });
  afterAll(async () => { await ctx?.close(); });

  function tokens(body: Record<string, unknown>, mobile = true) {
    expect(body.access_token).toEqual(expect.any(String)); expect(body.token_type).toBe('Bearer'); expect(body.expires_in).toBe(900);
    if (mobile) expect(body.refresh_token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    else expect(body).not.toHaveProperty('refresh_token');
  }

  it('B1#1/I1: mobile register creates an unverified learner and sends a six-digit OTP after drain', async () => {
    const res = await register(); expect(res.status).toBe(201); tokens(res.body);
    expect(res.headers['set-cookie']).toBeUndefined();
    const account = await user();
    expect(account).toMatchObject({ emailVerifiedAt: null, nativeLanguage: null, staffRole: null, timezone: 'Asia/Ho_Chi_Minh' });
    expect(await ctx.app.get(PasswordHasher).verify(account.passwordCredential!.hash, password)).toBe(true);
    expect(await chains(account.id)).toEqual([expect.objectContaining({ clientType: 'mobile', deviceLabel: 'Phone', revokedAt: null })]);
    await ctx.drainMail(); expect(ctx.mailer.otpFor(email)).toMatch(/^\d{6}$/); expect(ctx.mailer.sent).toHaveLength(1);
  });
  it('B1#1: web register sets a secure cookie and omits the refresh token from the body', async () => {
    const res = await register({ client: 'web' }); expect(res.status).toBe(201); tokens(res.body, false);
    expect(cookieFrom(res)).toMatch(/^refresh_token=[A-Za-z0-9_-]{43}$/);
    for (const attr of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/v1/auth']) expect(res.headers['set-cookie'][0]).toContain(attr);
  });
  it('B1#2/I2/B1E20: normalized duplicate and successful-registration retry return 409 with one row and one mail', async () => {
    expect((await register()).status).toBe(201); await ctx.drainMail();
    for (const address of [`  ${email.toUpperCase()} `, email]) {
      const res = await register({ email: address }); expect(res.status).toBe(409); expect(res.body.type).toBe(problem('email-taken'));
    }
    expect(await ctx.prisma.user.count({ where: { email } })).toBe(1);
    expect(await chains((await user()).id)).toHaveLength(1); await ctx.drainMail(); expect(ctx.mailer.sent).toHaveLength(1);
  });
  it('B1#3/I3: weak registration password returns all violations and creates no account', async () => {
    const res = await register({ password: 'abc' }); expect(res.status).toBe(400); expect(res.body.type).toBe(problem('validation-failed'));
    expect(res.body.violations).toEqual(['min_length', 'uppercase', 'digit', 'special']);
    expect(await ctx.prisma.user.count({ where: { email } })).toBe(0); await ctx.drainMail(); expect(ctx.mailer.sent).toEqual([]);
  });
  it('B1E23: preserves a valid timezone alias and rejects an invalid timezone before creating an account', async () => {
    expect((await register({ timezone: 'Mars/Base' })).status).toBe(400);
    expect(await ctx.prisma.user.count({ where: { email } })).toBe(0);
    expect((await register()).status).toBe(201); expect((await user()).timezone).toBe('Asia/Ho_Chi_Minh');
  });
  it('B1#30: zero mail budget returns 503 with no account or mail', async () => {
    const limited = await createTestApp({ config: { mailDailyBudget: 0 } });
    try {
      const res = await limited.http().post('/v1/auth/register').send(registerBody());
      expect(res.status).toBe(503); expect(res.body.type).toBe(problem('mail-unavailable'));
      expect(await limited.prisma.user.count({ where: { email } })).toBe(0);
      await limited.drainMail(); expect(limited.mailer.sent).toEqual([]);
    } finally { await limited.close(); }
  });
  it('B1#2: two simultaneous registrations yield exactly 201 and 409, one account and one mail (Review Focus #2)', async () => {
    const hasher = ctx.app.get(PasswordHasher); const hash = hasher.hash.bind(hasher);
    const ready = gate(); const release = gate(); let reached = 0;
    vi.spyOn(hasher, 'hash').mockImplementation(async (pw) => {
      const value = await hash(pw); if (++reached === 2) ready.resolve(); await release.promise; return value;
    });
    const requests = [register().then((res) => res), register().then((res) => res)];
    const settled = Promise.allSettled(requests);
    const pending = Promise.all(requests);
    try { await waitForGate(ready, pending); } finally { release.resolve(); await settled; }
    const responses = await pending; expect(responses.map((res) => res.status).sort()).toEqual([201, 409]);
    expect(responses.find((res) => res.status === 409)!.body.type).toBe(problem('email-taken'));
    expect(await ctx.prisma.user.count({ where: { email } })).toBe(1); expect(await chains((await user()).id)).toHaveLength(1);
    await ctx.drainMail(); expect(ctx.mailer.sent).toHaveLength(1);
  });
  it('B1#1: malformed registration bodies return validation-failed and persist nothing (Review Focus #3)', async () => {
    const { password: _password, ...missing } = registerBody();
    for (const body of [{ ...registerBody(), email: 42 }, missing, { ...registerBody(), extra: true }]) {
      const res = await ctx.http().post('/v1/auth/register').send(body);
      expect(res.status).toBe(400); expect(res.body.type).toBe(problem('validation-failed'));
    }
    const invalidJson = await ctx.http().post('/v1/auth/register').set('Content-Type', 'application/json').send('{');
    expect(invalidJson.status).toBe(400); expect(invalidJson.body.type).toBe(problem('validation-failed'));
    expect(await ctx.prisma.user.count({ where: { email } })).toBe(0);
  });
  it('B1#1/B1#11: NUL in stored email or device label returns 400 and writes no account or session (Review Focus #3)', async () => {
    for (const body of [{ ...registerBody(), email: `bad\u0000${email}` }, { ...registerBody(), device_label: 'Phone\u0000' }]) {
      const res = await ctx.http().post('/v1/auth/register').send(body);
      expect(res.status).toBe(400); expect(res.body.type).toBe(problem('validation-failed'));
    }
    expect(await ctx.prisma.user.count({ where: { email } })).toBe(0);
    const { userId } = await seed();
    const res = await login({ device_label: 'Phone\u0000' });
    expect(res.status).toBe(400); expect(res.body.type).toBe(problem('validation-failed'));
    expect(await chains(userId)).toHaveLength(0); expect((await user()).failedLoginCount).toBe(0);
    await ctx.drainMail(); expect(ctx.mailer.sent).toEqual([]);
  });
  it('B1#11: successful login issues tokens and clears the persisted failure counter', async () => {
    const { userId } = await seed();
    await ctx.prisma.$transaction(async (tx) => { await withUserLock(tx, userId); await tx.user.update({ where: { id: userId }, data: { failedLoginCount: 4 } }); }, options);
    const res = await login(); expect(res.status).toBe(200); tokens(res.body); expect((await user()).failedLoginCount).toBe(0);
    expect(await chains(userId)).toHaveLength(1);
  });
  it('B1#11/IE8: trimmed uppercase login email resolves the registered normalized email (Review Focus #1)', async () => {
    await seed(); const res = await login({ email: `  ${email.toUpperCase()} ` }); expect(res.status).toBe(200); tokens(res.body);
  });
  it('B1#12/I10: unknown, wrong and locked logins have identical 401 bodies and each verify once', async () => {
    const { userId } = await seed(); const verify = vi.spyOn(argon2, 'verify');
    const responses = [];
    for (const changes of [{ email: `${randomUUID()}@example.com` }, { password: 'Wrong1!' }]) {
      verify.mockClear(); responses.push(await login(changes)); expect(verify).toHaveBeenCalledTimes(1);
    }
    const lockedUntil = new Date(ctx.clock.now().getTime() + 900_000);
    await ctx.prisma.$transaction(async (tx) => { await withUserLock(tx, userId); await tx.user.update({ where: { id: userId }, data: { loginLockedUntil: lockedUntil } }); }, options);
    verify.mockClear(); responses.push(await login()); expect(verify).toHaveBeenCalledTimes(1);
    for (const res of responses) { expect(res.status).toBe(401); expect(res.body.type).toBe(problem('invalid-credentials')); expect(generic(res.body)).toEqual(generic(responses[0].body)); }
    expect((await user()).failedLoginCount).toBe(1); expect((await user()).loginLockedUntil).toEqual(lockedUntil); expect(await chains(userId)).toHaveLength(0);
  });
  it('B1E2: a 200-code-point login password returns 401 without Argon2', async () => {
    await seed(); const verify = vi.spyOn(argon2, 'verify');
    const res = await login({ password: '😀'.repeat(200) }); expect(res.status).toBe(401); expect(verify).not.toHaveBeenCalled();
    expect((await user()).failedLoginCount).toBe(0); expect(await chains((await user()).id)).toHaveLength(0);
  });
  it('B1#13/I11/B1#34/B1E3: ten failures persist a fifteen-minute lock; requests during it cannot extend it', async () => {
    await seed();
    for (let i = 1; i <= 10; i++) {
      expect((await login({ password: 'Wrong1!' })).status).toBe(401);
      expect((await user()).failedLoginCount).toBe(i === 10 ? 0 : i);
    }
    const lockedUntil = new Date(ctx.clock.now().getTime() + 900_000); expect((await user()).loginLockedUntil).toEqual(lockedUntil);
    expect((await login()).status).toBe(401); ctx.clock.advance(60_000);
    expect((await login({ password: 'Wrong1!' })).status).toBe(401);
    expect((await user()).loginLockedUntil).toEqual(lockedUntil); expect((await user()).failedLoginCount).toBe(0);
    expect(await chains((await user()).id)).toHaveLength(0);
    ctx.clock.advance(840_000); expect((await login()).status).toBe(200); expect((await user()).failedLoginCount).toBe(0);
  });

  // All verification barriers are outside transactions: no connections are held
  // while waiting. Ten requests may then use the ten-connection pool without an
  // extra holder/observer connection that would deadlock the test.
  async function concurrentLogins(count: number, pw: string) {
    const hasher = ctx.app.get(PasswordHasher); const verify = hasher.verify.bind(hasher);
    const ready = gate(); const release = gate(); let reached = 0;
    vi.spyOn(hasher, 'verify').mockImplementation(async (hash, password) => {
      const matched = await verify(hash, password); if (++reached === count) ready.resolve(); await release.promise; return matched;
    });
    const requests = Array.from({ length: count }, () => login({ password: pw }).then((res) => res));
    const settled = Promise.allSettled(requests);
    const pending = Promise.all(requests);
    try { await waitForGate(ready, pending); } finally { release.resolve(); await settled; }
    return pending;
  }
  it('B1#13: ten overlapping wrong logins produce one lock and a persisted counter of zero', async () => {
    const { userId } = await seed();
    expect((await concurrentLogins(10, 'Wrong1!')).map((res) => res.status)).toEqual(Array(10).fill(401));
    expect((await user()).failedLoginCount).toBe(0); expect((await user()).loginLockedUntil).toEqual(new Date(ctx.clock.now().getTime() + 900_000));
    expect(ctx.logs.filter((entry) => entry.event === 'login_locked')).toHaveLength(1); expect(await chains(userId)).toHaveLength(0);
  });
  it('B1E33: a reset committed after verification makes login stale without a chain or counted failure', async () => {
    const { userId } = await seed(); const hasher = ctx.app.get(PasswordHasher); const verify = hasher.verify.bind(hasher);
    const newHash = await hasher.hash('NewPassword1!'); const ready = gate(); const release = gate();
    vi.spyOn(hasher, 'verify').mockImplementation(async (hash, pw) => { const matched = await verify(hash, pw); ready.resolve(); await release.promise; return matched; });
    const pending = login().then((res) => res);
    try {
      await waitForGate(ready, pending);
      // Task 11 is deliberately not implemented: reproduce its committed hash
      // replacement using the same lock, with hashing completed beforehand.
      await ctx.prisma.$transaction(async (tx) => {
        await withUserLock(tx, userId); await tx.passwordCredential.update({ where: { userId }, data: { hash: newHash } });
      }, options);
    } finally { release.resolve(); await pending; }
    const res = await pending;
    expect(res.status).toBe(401); expect(res.body.type).toBe(problem('invalid-credentials'));
    expect((await user()).passwordCredential!.hash).toBe(newHash);
    expect((await user()).failedLoginCount).toBe(0); expect(await chains(userId)).toHaveLength(0);
  });
  it('B1#11/D16: five overlapping correct logins succeed without any hash rewrite', async () => {
    const { userId } = await seed(); const before = (await user()).passwordCredential!;
    const hash = vi.spyOn(ctx.app.get(PasswordHasher), 'hash');
    const responses = await concurrentLogins(5, password);
    expect(responses.map((res) => res.status)).toEqual(Array(5).fill(200));
    for (const res of responses) tokens(res.body);
    expect((await user()).passwordCredential).toEqual(before); expect(hash).not.toHaveBeenCalled(); expect(await chains(userId)).toHaveLength(5);
  });
  it('B1#21: web login returns the refresh cookie without a body refresh token', async () => {
    await seed(); const res = await login({ client: 'web' }); expect(res.status).toBe(200); tokens(res.body, false);
    expect(cookieFrom(res)).toMatch(/^refresh_token=[A-Za-z0-9_-]{43}$/);
  });
  it('B1#19: the eleventh login revokes the least recently used chain and retains ten active chains', async () => {
    const { userId } = await seed(); const ids: string[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await login(); expect(res.status).toBe(200); ctx.clock.advance(1000);
      ids.push((await chains(userId)).at(-1)!.id);
    }
    const rows = await chains(userId); expect(rows).toHaveLength(11); expect(rows.filter((row) => row.revokedAt === null)).toHaveLength(10);
    expect(rows.find((row) => row.id === ids[0])).toMatchObject({ revokeReason: 'device_cap', revokedAt: expect.any(Date) });
  });
  it.each(['loopback', false] as const)('B1E24/B1E25/B1E32: forwarded IP limits obey trustProxy=%s', async (trustProxy) => {
    const config = testConfig(); config.limits['auth.register.ip'].max = 2;
    const limited = await createTestApp({ config: { limits: config.limits, trustProxy } });
    const attempt = (ip: string) => limited.http().post('/v1/auth/register').set('X-Forwarded-For', ip).send({ ...registerBody(), email: `${randomUUID()}@example.com` });
    try {
      expect((await attempt('203.0.113.7')).status).toBe(201); expect((await attempt('203.0.113.7')).status).toBe(201);
      const denied = await attempt('203.0.113.7'); expect(denied.status).toBe(429); expect(denied.headers['retry-after']).toBeDefined();
      expect((await attempt('203.0.113.8')).status).toBe(trustProxy ? 201 : 429);
    } finally { await limited.close(); }
  });
  it('B1#1/B1#38: registration OTP creation and mail sending both run after response close', async () => {
    const markers: string[] = []; const otp = ctx.app.get(OtpService); const issue = otp.issueInTx.bind(otp); const send = ctx.mailer.send.bind(ctx.mailer);
    vi.spyOn(otp, 'issueInTx').mockImplementation((...args) => { markers.push('issue'); return issue(...args); });
    vi.spyOn(ctx.mailer, 'send').mockImplementation((...args) => { markers.push('send'); return send(...args); });
    (ctx.app.getHttpServer() as Server).prependOnceListener('request', (_req, res: ServerResponse) => { res.once('close', () => { markers.push('response'); }); });
    expect((await register()).status).toBe(201); await ctx.drainMail(); expect(markers).toEqual(['response', 'issue', 'send']);
  });
});
