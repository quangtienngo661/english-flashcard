import { randomUUID } from 'node:crypto';
import type { Server, ServerResponse } from 'node:http';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PasswordHasher } from '../../src/identity/auth/password-hasher.service.js';
import { passwordChangedMail, passwordResetMail, otpLockedMail } from '../../src/identity/mailer/templates.js';
import { AccessTokenService } from '../../src/identity/sessions/access-token.service.js';
import { SessionService, type IssuedSession } from '../../src/identity/sessions/session.service.js';
import { withUserLock } from '../../src/identity/user-lock.js';
import { cookieFrom, seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';

const options = { timeout: 10_000, maxWait: 5_000 };
const problem = (slug: string) => `https://api.example.com/problems/${slug}`;
const wrongCode = (code: string) => code === '000000' ? '000001' : '000000';
function generic(body: Record<string, unknown>) {
  const { operation_id: _operation, instance: _instance, ...rest } = body;
  return rest;
}
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
      pending.then(() => { throw new Error('Request completed before reaching the gate'); }),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => { reject(new Error('Request did not reach the gate within five seconds')); }, 5000);
      }),
    ]);
  } finally { clearTimeout(timer); }
}

describe('password change and reset (e2e)', () => {
  let ctx: TestApp;
  let userId: string;
  let email: string;
  let caller: IssuedSession;
  const password = 'Password1!';
  const newPassword = 'NewPassword1!';
  const account = () => ctx.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { passwordCredential: true } });
  const chains = () => ctx.prisma.sessionChain.findMany({ where: { userId } });
  const codes = () => ctx.prisma.otpCode.findMany({ where: { userId, purpose: 'reset_password' } });
  const window = () => ctx.prisma.otpFailureWindow.findUnique({ where: { userId_purpose: { userId, purpose: 'reset_password' } } });
  const change = (changes = {}, token = caller.accessToken) => ctx.http().post('/v1/auth/password/change')
    .set('Authorization', `Bearer ${token}`).send({ current_password: password, new_password: newPassword, ...changes });
  const reset = (code: string, changes = {}) => ctx.http().post('/v1/auth/password/reset').send({ email, code, new_password: newPassword, ...changes });
  const login = (pw: string) => ctx.http().post('/v1/auth/login').send({ email, password: pw, client: 'mobile' });
  const refresh = (token: string) => ctx.http().post('/v1/auth/refresh').send({ refresh_token: token });
  const write = (data: { failedLoginCount?: number; loginLockedUntil?: Date; emailVerifiedAt?: Date }) => ctx.prisma.$transaction(async (tx) => {
    await withUserLock(tx, userId); await tx.user.update({ where: { id: userId }, data });
  }, options);
  async function issue(purpose: 'reset_password' | 'verify_email' = 'reset_password') {
    const req = ctx.http().post('/v1/auth/otp');
    const res = purpose === 'reset_password' ? await req.send({ purpose, email })
      : await req.set('Authorization', `Bearer ${caller.accessToken}`).send({ purpose });
    expect(res.status).toBe(202); await ctx.drainMail();
    return ctx.mailer.otpFor(email)!;
  }
  async function assertPassword(pw: string) {
    expect(await ctx.app.get(PasswordHasher).verify((await account()).passwordCredential!.hash, pw)).toBe(true);
  }
  beforeAll(async () => { ctx = await createTestApp(); });
  beforeEach(async () => {
    ctx.clock.set(new Date('2026-10-07T12:00:00Z'));
    ({ userId, email } = await seedUser(ctx.prisma, { password }));
    caller = await startSession(ctx, userId); ctx.mailer.sent.length = 0; ctx.logs.length = 0;
  });
  afterEach(async () => { await ctx.drainMail(); vi.restoreAllMocks(); });
  afterAll(async () => { await ctx?.close(); });

  it('B1#22/I20: change revokes every old chain including the caller and returns a session that refreshes', async () => {
    const other = await startSession(ctx, userId);
    const res = await change(); expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ access_token: expect.any(String), refresh_token: expect.any(String), token_type: 'Bearer', expires_in: 900 });
    const rows = await chains(); expect(rows).toHaveLength(3);
    for (const id of [caller.sessionChainId, other.sessionChainId]) {
      expect(rows.find((row) => row.id === id)).toMatchObject({ revokedAt: ctx.clock.now(), revokeReason: 'password_changed' });
    }
    expect(rows.filter((row) => row.revokedAt === null)).toHaveLength(1);
    expect((await refresh(caller.refreshToken)).status).toBe(401); expect((await refresh(other.refreshToken)).status).toBe(401);
    expect((await refresh(res.body.refresh_token)).status).toBe(200); await assertPassword(newPassword);
  });
  it.each(['mobile', 'web'] as const)('B1#22: a %s change preserves client_type and device_label and uses the correct transport', async (client) => {
    const session = await ctx.prisma.$transaction(async (tx) => {
      await withUserLock(tx, userId);
      return ctx.app.get(SessionService).startChain(tx, { userId, client, deviceLabel: 'My device' });
    }, options);
    const res = await change({}, session.accessToken); expect(res.status).toBe(200);
    const active = (await chains()).filter((row) => row.revokedAt === null);
    expect(active).toEqual([expect.objectContaining({ clientType: client, deviceLabel: 'My device' })]);
    if (client === 'web') {
      expect(res.body).not.toHaveProperty('refresh_token'); expect(cookieFrom(res)).toMatch(/^refresh_token=[A-Za-z0-9_-]{43}$/);
      for (const attr of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/v1/auth']) expect(res.headers['set-cookie'][0]).toContain(attr);
      const fresh = await ctx.http().post('/v1/auth/refresh').set('Cookie', cookieFrom(res)!).set('X-CSRF-Protection', '1').send({});
      expect(fresh.status).toBe(200);
    } else { expect(res.body.refresh_token).toEqual(expect.any(String)); expect(res.headers['set-cookie']).toBeUndefined(); }
  });
  it('B1#22/I26: passwordChangedMail sends after response close and drain', async () => {
    const markers: string[] = []; const send = ctx.mailer.send.bind(ctx.mailer);
    vi.spyOn(ctx.mailer, 'send').mockImplementation((msg) => { markers.push('send'); return send(msg); });
    (ctx.app.getHttpServer() as Server).prependOnceListener('request', (_req, res: ServerResponse) => {
      res.once('close', () => { markers.push('response'); });
    });
    expect((await change()).status).toBe(200); await ctx.drainMail();
    expect(markers).toEqual(['response', 'send']); expect(ctx.mailer.sent).toEqual([passwordChangedMail(email)]);
  });
  it('B1E4/B1#34: the tenth wrong current password returns 400 and persists the login lock; the next returns 429 without extending it', async () => {
    const before = (await account()).passwordCredential;
    for (let i = 1; i <= 10; i++) {
      const res = await change({ current_password: 'Wrong1!' });
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(problem('invalid-current-password'));
      expect(res.headers['retry-after']).toBeUndefined();
      expect((await account()).failedLoginCount).toBe(i === 10 ? 0 : i);
    }
    expect((await account()).loginLockedUntil).toEqual(new Date(ctx.clock.now().getTime() + 900_000));
    const locked = await account();
    expect(ctx.logs.filter((entry) => entry.event === 'login_locked')).toEqual([
      expect.objectContaining({ user_id: userId }),
    ]);
    ctx.clock.advance(60_000);
    const next = await change({ current_password: 'Wrong1!' });
    expect(next.status).toBe(429); expect(next.body.type).toBe(problem('rate-limited'));
    expect(next.headers['retry-after']).toBe('840');
    expect(await account()).toEqual(locked);
    expect(ctx.logs.filter((entry) => entry.event === 'login_locked')).toHaveLength(1);
    expect((await account()).passwordCredential).toEqual(before);
    expect(await chains()).toEqual([expect.objectContaining({ id: caller.sessionChainId, revokedAt: null })]);
    await ctx.drainMail(); expect(ctx.mailer.sent).toEqual([]);
  });
  it('B1E4: change during a login lock returns 429 with Retry-After and leaves the lock unchanged', async () => {
    const until = new Date(ctx.clock.now().getTime() + 900_000); await write({ loginLockedUntil: until });
    const before = await account(); const res = await change();
    expect(res.status).toBe(429); expect(res.body.type).toBe(problem('rate-limited')); expect(res.headers['retry-after']).toBe('900');
    expect(await account()).toEqual(before); expect((await chains())[0].revokedAt).toBeNull();
    await ctx.drainMail(); expect(ctx.mailer.sent).toEqual([]);
  });
  it('B1E21: retrying a successful change with the old access token returns invalid-current-password', async () => {
    expect((await change()).status).toBe(200); const before = (await account()).passwordCredential;
    const res = await change(); expect(res.status).toBe(400); expect(res.body.type).toBe(problem('invalid-current-password'));
    expect((await account()).failedLoginCount).toBe(1); expect((await account()).passwordCredential).toEqual(before);
    expect((await chains()).filter((row) => row.revokedAt === null)).toHaveLength(1);
    await ctx.drainMail(); expect(ctx.mailer.sent).toEqual([passwordChangedMail(email)]);
  });
  it('B1E33/B1#22: reset committing after current-password verification makes change stale without another chain or counted failure', async () => {
    const code = await issue(); ctx.mailer.sent.length = 0;
    const hasher = ctx.app.get(PasswordHasher); const verify = hasher.verify.bind(hasher);
    const ready = gate(); const release = gate();
    // The gate holds no transaction/connection; the reset can commit independently.
    vi.spyOn(hasher, 'verify').mockImplementation(async (hash, pw) => {
      const matched = await verify(hash, pw); ready.resolve(); await release.promise; return matched;
    });
    const pending = change({ new_password: 'ChangedPassword1!' }).then((res) => res);
    const settled = Promise.allSettled([pending]);
    try {
      await waitForGate(ready, pending);
      expect((await reset(code)).status).toBe(204);
    } finally { release.resolve(); await settled; }
    const res = await pending; expect(res.status).toBe(400); expect(res.body.type).toBe(problem('invalid-current-password'));
    expect((await account()).failedLoginCount).toBe(0);
    // Avoid the instrumented verify gate when checking the persisted winning hash.
    expect(await verify((await account()).passwordCredential!.hash, newPassword)).toBe(true);
    expect(await chains()).toEqual([expect.objectContaining({ id: caller.sessionChainId, revokedAt: ctx.clock.now(), revokeReason: 'password_reset' })]);
    await ctx.drainMail(); expect(ctx.mailer.sent).toEqual([passwordResetMail(email)]);
  });
  it('B1#23/I9: reset consumes the code, verifies email and revokes every chain; only the new password logs in', async () => {
    const other = await startSession(ctx, userId); const code = await issue();
    const res = await reset(` ${code} `, { email: `  ${email.toUpperCase()} ` }); expect(res.status).toBe(204); expect(res.text).toBe('');
    const user = await account(); expect(user.emailVerifiedAt).toEqual(ctx.clock.now()); expect(user.failedLoginCount).toBe(0); expect(user.loginLockedUntil).toBeNull();
    expect((await codes())[0].consumedAt).toEqual(ctx.clock.now());
    expect(await chains()).toEqual(expect.arrayContaining([caller.sessionChainId, other.sessionChainId].map((id) =>
      expect.objectContaining({ id, revokedAt: ctx.clock.now(), revokeReason: 'password_reset' }))));
    expect((await chains()).every((row) => row.revokedAt !== null)).toBe(true);
    expect((await refresh(caller.refreshToken)).status).toBe(401); expect((await refresh(other.refreshToken)).status).toBe(401);
    expect((await login(password)).status).toBe(401); expect((await login(newPassword)).status).toBe(200);
  });
  it('B1#23: replaying the same reset code returns 400 and cannot change the password again', async () => {
    const code = await issue(); expect((await reset(code)).status).toBe(204); const before = await account();
    const res = await reset(code, { new_password: 'AnotherPassword1!' }); expect(res.status).toBe(400); expect(res.body.type).toBe(problem('invalid-otp'));
    expect(await account()).toEqual(before); expect((await codes())[0]).toMatchObject({ consumedAt: ctx.clock.now(), attempts: 0 });
    await ctx.drainMail(); expect(ctx.mailer.sent.filter((msg) => msg.subject === passwordResetMail(email).subject)).toHaveLength(1);
  });
  it('B1#23: reset clears a login lock and counter while preserving an existing verification timestamp', async () => {
    const code = await issue(); const verifiedAt = new Date('2026-10-06T00:00:00Z');
    await write({ loginLockedUntil: new Date(ctx.clock.now().getTime() + 900_000), failedLoginCount: 4, emailVerifiedAt: verifiedAt });
    expect((await reset(code)).status).toBe(204);
    expect(await account()).toMatchObject({ failedLoginCount: 0, loginLockedUntil: null, emailVerifiedAt: verifiedAt });
    expect((await login(newPassword)).status).toBe(200);
  });
  it('B1#23/I26: passwordResetMail sends after response close and drain', async () => {
    const code = await issue(); ctx.mailer.sent.length = 0;
    const markers: string[] = []; const send = ctx.mailer.send.bind(ctx.mailer);
    vi.spyOn(ctx.mailer, 'send').mockImplementation((msg) => { markers.push('send'); return send(msg); });
    (ctx.app.getHttpServer() as Server).prependOnceListener('request', (_req, res: ServerResponse) => {
      res.once('close', () => { markers.push('response'); });
    });
    expect((await reset(code)).status).toBe(204); await ctx.drainMail();
    expect(markers).toEqual(['response', 'send']); expect(ctx.mailer.sent).toEqual([passwordResetMail(email)]);
  });
  it('B1#35: two resets queued behind the user lock consume one live code exactly once', async () => {
    const code = await issue(); ctx.mailer.sent.length = 0;
    const ready = gate(); const release = gate(); let holderPid!: number;
    // Holder + two contenders + observer use at most four of the ten connections.
    const holder = ctx.prisma.$transaction(async (tx) => {
      await withUserLock(tx, userId);
      const [row] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`;
      holderPid = row.pid; ready.resolve(); await release.promise;
    }, options);
    const holderSettled = Promise.allSettled([holder]);
    let pending: ReturnType<typeof Promise.allSettled> | undefined;
    let responses: Array<{ status: number; body: Record<string, unknown> }> = [];
    try {
      await Promise.race([ready.promise, holder]);
      const requests = [reset(code).then((res) => res), reset(code, { new_password: 'AnotherPassword1!' }).then((res) => res)];
      pending = Promise.allSettled(requests);
      const deadline = performance.now() + 4000;
      let blocked = false;
      while (performance.now() < deadline) {
        const [row] = await ctx.prisma.$queryRaw<{ n: number }[]>`
          SELECT count(*)::int AS n FROM pg_locks waiter
          JOIN pg_locks holder ON holder.pid = ${holderPid} AND holder.granted
            AND holder.locktype = waiter.locktype AND holder.classid = waiter.classid
            AND holder.objid = waiter.objid AND holder.objsubid = waiter.objsubid
          WHERE waiter.locktype = 'advisory' AND NOT waiter.granted`;
        if (row.n === 2) { blocked = true; break; }
      }
      expect(blocked).toBe(true); release.resolve(); responses = await Promise.all(requests);
    } finally { release.resolve(); await holderSettled; await pending; }
    await holder;
    expect(responses.map((res) => res.status).sort()).toEqual([204, 400]);
    expect(responses.find((res) => res.status === 400)!.body.type).toBe(problem('invalid-otp'));
    const winningPassword = responses[0].status === 204 ? newPassword : 'AnotherPassword1!'; await assertPassword(winningPassword);
    expect((await codes())[0]).toMatchObject({ consumedAt: ctx.clock.now(), attempts: 0 });
    expect((await account()).emailVerifiedAt).toEqual(ctx.clock.now());
    expect((await chains()).every((row) => row.revokedAt !== null && row.revokeReason === 'password_reset')).toBe(true);
    await ctx.drainMail(); expect(ctx.mailer.sent).toEqual([passwordResetMail(email)]);
  });
  it('B1#9: a verify_email code cannot reset the password', async () => {
    const code = await issue('verify_email'); const before = await account();
    const res = await reset(code); expect(res.status).toBe(400); expect(res.body.type).toBe(problem('invalid-otp'));
    expect(await account()).toEqual(before); expect(await window()).toBeNull();
    expect((await ctx.prisma.otpCode.findFirstOrThrow({ where: { userId, purpose: 'verify_email' } })).consumedAt).toBeNull();
  });
  it('B1#23/B1#34: unknown email, invalid email and wrong code have identical 400 bodies; only the wrong live code counts', async () => {
    const code = await issue(); const before = await account();
    const responses = [await reset(code, { email: `${randomUUID()}@example.com` }), await reset(code, { email: 'bad' }), await reset(wrongCode(code))];
    for (const res of responses) { expect(res.status).toBe(400); expect(res.body.type).toBe(problem('invalid-otp')); expect(generic(res.body)).toEqual(generic(responses[0].body)); }
    expect((await codes())[0]).toMatchObject({ attempts: 1, consumedAt: null }); expect((await window())?.failures).toBe(1);
    expect(await account()).toEqual(before); expect((await chains())[0].revokedAt).toBeNull();
  });
  it('B1#3: weak new_password returns all policy violations on both endpoints without changing security state', async () => {
    const code = await issue(); const before = await account();
    for (const res of [await change({ new_password: 'abc' }), await reset(code, { new_password: 'abc' })]) {
      expect(res.status).toBe(400); expect(res.body.type).toBe(problem('validation-failed'));
      expect(res.body.violations).toEqual(['min_length', 'uppercase', 'digit', 'special']);
    }
    expect(await account()).toEqual(before); expect((await codes())[0]).toMatchObject({ attempts: 0, consumedAt: null }); expect(await window()).toBeNull();
  });
  it('B1E17: a locked reset purpose rejects even the right live code with generic 400 and no state changes', async () => {
    const code = await issue(); const before = await account();
    const until = new Date(ctx.clock.now().getTime() + 86_400_000);
    await ctx.prisma.$transaction(async (tx) => {
      await withUserLock(tx, userId);
      await tx.otpFailureWindow.create({ data: { userId, purpose: 'reset_password', failures: 21, windowStart: ctx.clock.now(), lockedUntil: until } });
    }, options);
    ctx.mailer.sent.length = 0; const res = await reset(code);
    expect(res.status).toBe(400); expect(res.body.type).toBe(problem('invalid-otp')); expect(res.headers['retry-after']).toBeUndefined();
    expect(await account()).toEqual(before); expect((await codes())[0]).toMatchObject({ attempts: 0, consumedAt: null });
    expect(await window()).toMatchObject({ failures: 21, lockedUntil: until }); expect((await chains())[0].revokedAt).toBeNull();
    await ctx.drainMail(); expect(ctx.mailer.sent).toEqual([]);
  });
  it('B1#10/B1#34: the 21st counted reset failure commits its lock, returns 400 and sends exactly one otp_locked mail', async () => {
    let code = '';
    for (let round = 0; round < 4; round++) {
      code = await issue();
      for (let i = 0; i < 5; i++) expect((await reset(wrongCode(code))).status).toBe(400);
      ctx.clock.advance(60_000);
    }
    code = await issue(); ctx.mailer.sent.length = 0; const before = await account();
    const res = await reset(wrongCode(code)); expect(res.status).toBe(400); expect(res.body.type).toBe(problem('invalid-otp'));
    expect(res.headers['retry-after']).toBeUndefined();
    expect(await window()).toMatchObject({ failures: 21, lockedUntil: new Date(ctx.clock.now().getTime() + 86_400_000) });
    expect((await codes()).reduce((total, row) => total + row.attempts, 0)).toBe(21);
    expect(await account()).toEqual(before); expect((await chains())[0].revokedAt).toBeNull();
    expect((await reset(code)).status).toBe(400); await ctx.drainMail(); expect(ctx.mailer.sent).toEqual([otpLockedMail(email, 'reset_password')]);
    expect(ctx.logs.filter((entry) => entry.event === 'otp_locked')).toHaveLength(1);
    expect(await ctx.prisma.otpFailureWindow.findUnique({ where: { userId_purpose: { userId, purpose: 'verify_email' } } })).toBeNull();
  });
  it('B1#23: reset creates a credential when the account has none', async () => {
    const code = await issue();
    await ctx.prisma.$transaction(async (tx) => { await withUserLock(tx, userId); await tx.passwordCredential.delete({ where: { userId } }); }, options);
    expect((await reset(code)).status).toBe(204); await assertPassword(newPassword); expect((await login(newPassword)).status).toBe(200);
  });
  it('B1#22/B1#23: missing fields, wrong types and extra fields return validation-failed without changing credentials', async () => {
    const before = await account();
    for (const body of [{ new_password: newPassword }, { current_password: 42, new_password: newPassword },
      { current_password: password, new_password: newPassword, extra: true }]) {
      const res = await ctx.http().post('/v1/auth/password/change').set('Authorization', `Bearer ${caller.accessToken}`).send(body);
      expect(res.status).toBe(400); expect(res.body.type).toBe(problem('validation-failed'));
    }
    for (const body of [{ email, new_password: newPassword }, { email: 42, code: '012345', new_password: newPassword },
      { email, code: '012345', new_password: newPassword, extra: true }]) {
      const res = await ctx.http().post('/v1/auth/password/reset').send(body);
      expect(res.status).toBe(400); expect(res.body.type).toBe(problem('validation-failed'));
    }
    expect(await account()).toEqual(before);
  });
  it('B1#22: an authenticated token without a caller chain cannot replace sessions', async () => {
    const token = await ctx.app.get(AccessTokenService).sign({ userId, sessionChainId: randomUUID() });
    const before = await account(); expect((await change({}, token)).status).toBe(401); expect(await account()).toEqual(before);
  });
});
