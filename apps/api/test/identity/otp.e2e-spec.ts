import { createHmac, randomUUID } from 'node:crypto';
import type { Server, ServerResponse } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { OtpService } from '../../src/identity/auth/otp.service.js';
import type { OtpPurpose } from '../../src/identity/identity.types.js';
import { AccessTokenService } from '../../src/identity/sessions/access-token.service.js';
import { withUserLock } from '../../src/identity/user-lock.js';
import { seedUser } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';

const day = 86_400_000;
const options = { timeout: 10_000, maxWait: 5_000 };
const otpHmacKey = Buffer.alloc(32, 7);
const problem = (slug: string) => `https://api.example.com/problems/${slug}`;
function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('OTP issuance and verification (e2e)', () => {
  let ctx: TestApp;
  let otp: OtpService;
  let userId: string;
  let email: string;
  let token: string;
  const subject = () => ({ userId, sessionChainId: randomUUID() });
  const codes = (purpose: OtpPurpose = 'verify_email') => ctx.prisma.otpCode.findMany({ where: { userId, purpose } });
  const failure = (purpose: OtpPurpose = 'verify_email') => ctx.prisma.otpFailureWindow.findUnique({
    where: { userId_purpose: { userId, purpose } },
  });
  async function sign() { token = await ctx.app.get(AccessTokenService).sign(subject()); }
  const requestVerify = () => ctx.http().post('/v1/auth/otp').set('Authorization', `Bearer ${token}`).send({ purpose: 'verify_email' });
  const reset = (address = email) => ctx.http().post('/v1/auth/otp').send({ purpose: 'reset_password', email: address });
  const verify = (code: string) => ctx.http().post('/v1/auth/verify-email').set('Authorization', `Bearer ${token}`).send({ code });
  async function issue(purpose: OtpPurpose = 'verify_email'): Promise<string> {
    const response = purpose === 'verify_email' ? await requestVerify() : await reset();
    expect(response.status).toBe(202);
    expect(response.body).toEqual({});
    await ctx.drainMail();
    const code = ctx.mailer.otpFor(email);
    expect(code).toMatch(/^\d{6}$/);
    return code!;
  }
  const wrongCode = (code: string) => code === '000000' ? '000001' : '000000';

  beforeAll(async () => {
    ctx = await createTestApp({ config: { otpHmacKey } });
    otp = ctx.app.get(OtpService);
  });
  beforeEach(async () => {
    ctx.clock.set(new Date('2026-10-07T12:00:00Z'));
    ({ userId, email } = await seedUser(ctx.prisma));
    ctx.mailer.sent.length = 0;
    ctx.logs.length = 0;
    await sign();
  });
  afterAll(async () => { await ctx?.close(); });

  async function waitForBlocked(pid: number, count: number) {
    const deadline = performance.now() + 4000;
    while (performance.now() < deadline) {
      const [row] = await ctx.prisma.$queryRaw<{ n: number }[]>`
        SELECT count(*)::int AS n FROM pg_locks
        WHERE locktype = 'advisory' AND NOT granted
          AND ${pid} = ANY(pg_blocking_pids(pid))`;
      if (row.n >= count) return;
    }
    throw new Error(`Expected ${count} blocked OTP transactions`);
  }
  async function holdUser(onRelease?: (tx: Prisma.TransactionClient) => Promise<void>) {
    const ready = gate();
    const release = gate();
    let pid!: number;
    const transaction = ctx.prisma.$transaction(async (tx) => {
      await withUserLock(tx, userId);
      const [row] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`;
      pid = row.pid;
      ready.resolve();
      await release.promise;
      await onRelease?.(tx);
    }, options);
    const settled = transaction.then(() => ({ error: null }), (error: unknown) => ({ error }));
    await Promise.race([ready.promise, transaction]);
    return { pid, release: release.resolve, settled };
  }

  it('B1#4: a second issuance invalidates the first; only the new code is live and the old one fails', async () => {
    const first = await issue();
    const [old] = await codes();
    ctx.clock.advance(60_000);
    const next = await issue();
    const rows = await codes();
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.id === old.id)?.invalidatedAt).toEqual(ctx.clock.now());
    expect(rows.filter((row) => row.invalidatedAt === null && row.consumedAt === null)).toHaveLength(1);
    // A random collision is valid: that string then also names the new live code.
    // The invalidatedAt assertion above proves old-row invalidation in either case.
    expect((await verify(first === next ? wrongCode(next) : first)).status).toBe(400);
    expect((await verify(next)).status).toBe(200);
  });

  it('B1#4: stored code is a 64-hex keyed HMAC, never plaintext', async () => {
    const code = await issue();
    const [row] = await codes();
    expect(row.codeHmac).toMatch(/^[0-9a-f]{64}$/);
    expect(row.codeHmac).toBe(createHmac('sha256', otpHmacKey).update(code).digest('hex'));
    expect(row.codeHmac).not.toBe(code);
    expect(row.expiresAt).toEqual(new Date(ctx.clock.now().getTime() + 600_000));
    expect(row.attempts).toBe(0);
  });

  it('B1#4: two issuances waiting on the same user lock leave exactly one live code', async () => {
    const holder = await holdUser();
    const pending = Promise.allSettled(Array.from({ length: 2 }, () => ctx.prisma.$transaction(async (tx) => {
      await withUserLock(tx, userId);
      return otp.issueInTx(tx, userId, 'verify_email');
    }, options)));
    try { await waitForBlocked(holder.pid, 2); } finally {
      holder.release();
      await Promise.all([holder.settled, pending]);
    }
    expect((await holder.settled).error).toBeNull();
    const results = await pending;
    expect(results.every((result) => result.status === 'fulfilled' && result.value?.to === email)).toBe(true);
    const rows = await codes();
    expect(rows).toHaveLength(2);
    expect(rows.filter((row) => row.invalidatedAt === null && row.consumedAt === null)).toHaveLength(1);
    expect(rows.filter((row) => row.invalidatedAt !== null)).toHaveLength(1);
    expect(ctx.mailer.sent).toEqual([]); // issueInTx only prepares mail.
  });

  it('B1#10: verify issuance waiting on the lock observes a newly committed purpose lock', async () => {
    const lockedUntil = new Date(ctx.clock.now().getTime() + day);
    const holder = await holdUser(async (tx) => {
      await tx.otpFailureWindow.create({ data: {
        userId, purpose: 'verify_email', failures: 21, windowStart: ctx.clock.now(), lockedUntil,
      } });
    });
    const pending = requestVerify().then((res) => res);
    try { await waitForBlocked(holder.pid, 1); } finally {
      holder.release();
      await Promise.all([holder.settled, pending]);
    }
    expect((await holder.settled).error).toBeNull();
    const res = await pending;
    expect(res.status).toBe(429);
    expect(res.body.type).toBe(problem('rate-limited'));
    expect(res.headers['retry-after']).toBe('86400');
    expect((await failure())?.lockedUntil).toEqual(lockedUntil);
    expect(await codes()).toHaveLength(0);
    await ctx.drainMail();
    expect(ctx.mailer.sent).toEqual([]);
  });

  it('B1#5/I8: known and unknown reset emails return identical 202 bodies; only known receives mail', async () => {
    const known = await reset(`  ${email.toUpperCase()} `);
    const unknown = await reset(`${randomUUID()}@example.com`);
    expect(known.status).toBe(202);
    expect(unknown.status).toBe(202);
    expect(known.body).toEqual({});
    expect(unknown.body).toEqual(known.body);
    await ctx.drainMail();
    expect(ctx.mailer.sent).toHaveLength(1);
    expect(ctx.mailer.sent[0].to).toBe(email);
    expect(await codes('reset_password')).toHaveLength(1);
  });

  it.each([true, false])('B1#38: every reset account action occurs after response close (known=%s)', async (known) => {
    const markers: string[] = [];
    const lookup = ctx.prisma.user.findUnique.bind(ctx.prisma.user);
    const issueInTx = otp.issueInTx.bind(otp);
    const send = ctx.mailer.send.bind(ctx.mailer);
    const spies = [
      vi.spyOn(ctx.prisma.user, 'findUnique').mockImplementation((...args) => { markers.push('lookup'); return lookup(...args); }),
      vi.spyOn(otp, 'issueInTx').mockImplementation((...args) => { markers.push('issue'); return issueInTx(...args); }),
      vi.spyOn(ctx.mailer, 'send').mockImplementation((...args) => { markers.push('send'); return send(...args); }),
    ];
    (ctx.app.getHttpServer() as Server).prependOnceListener('request', (_req, res: ServerResponse) => {
      res.once('close', () => { markers.push('response'); });
    });
    try {
      const res = await reset(known ? email : `${randomUUID()}@example.com`);
      expect(res.status).toBe(202);
      await ctx.drainMail();
      expect(markers[0]).toBe('response');
      if (known) {
        for (const marker of ['lookup', 'issue', 'send']) expect(markers.indexOf(marker)).toBeGreaterThan(0);
        expect(ctx.mailer.sent).toHaveLength(1);
        expect(await codes('reset_password')).toHaveLength(1);
      } else {
        expect(markers).toEqual(['response', 'lookup']);
        expect(ctx.mailer.sent).toEqual([]);
      }
    } finally { spies.forEach((spy) => spy.mockRestore()); }
  });

  it.each([true, false])('B1#6/I6: reset cooldown returns 429 and Retry-After even for unknown emails (known=%s)', async (known) => {
    const address = known ? email : `${randomUUID()}@example.com`;
    expect((await reset(address)).status).toBe(202);
    const res = await reset(address);
    expect(res.status).toBe(429);
    expect(res.body.type).toBe(problem('rate-limited'));
    expect(res.headers['retry-after']).toBe('60');
    await ctx.drainMail();
    expect(ctx.mailer.sent).toHaveLength(known ? 1 : 0);
  });

  it('B1#6: verify and reset share the email cooldown', async () => {
    await issue();
    const res = await reset();
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBe('60');
    await ctx.drainMail();
    expect(await codes('reset_password')).toHaveLength(0);
  });

  it('B1#6: sixth email request within one hour returns 429', async () => {
    for (let i = 0; i < 5; i++) { await issue(); ctx.clock.advance(60_000); }
    const res = await requestVerify();
    expect(res.status).toBe(429);
    expect(res.body.type).toBe(problem('rate-limited'));
    expect(res.headers['retry-after']).toBe('3300');
    await ctx.drainMail();
    expect(ctx.mailer.sent).toHaveLength(5);
    expect(await codes()).toHaveLength(5);
  });

  it('B1#7/I4: correct verification consumes the code and persists email verification', async () => {
    const code = await issue();
    const res = await verify(code);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ email_verified: true });
    expect((await ctx.prisma.user.findUniqueOrThrow({ where: { id: userId } })).emailVerifiedAt).toEqual(ctx.clock.now());
    expect((await codes())[0]).toMatchObject({ consumedAt: ctx.clock.now(), attempts: 0 });
    expect(await failure()).toBeNull();
  });

  it('B1#7/D14/B1E22: already verified returns 409 even with an incorrect code and does not check it', async () => {
    const code = await issue();
    expect((await verify(code)).status).toBe(200);
    const check = vi.spyOn(otp, 'checkInTx');
    try {
      const res = await verify(wrongCode(code));
      expect(res.status).toBe(409);
      expect(res.body.type).toBe(problem('email-already-verified'));
      expect(check).not.toHaveBeenCalled();
      expect((await codes())[0].attempts).toBe(0);
    } finally { check.mockRestore(); }
  });

  it('B1#7/D14: two correct verifications queued on the user lock return one 200 and one 409', async () => {
    const code = await issue();
    const holder = await holdUser();
    const pending = Promise.allSettled([verify(code).then((res) => res), verify(code).then((res) => res)]);
    try { await waitForBlocked(holder.pid, 2); } finally {
      holder.release();
      await Promise.all([holder.settled, pending]);
    }
    expect((await holder.settled).error).toBeNull();
    const results = await pending;
    expect(results.every((result) => result.status === 'fulfilled')).toBe(true);
    const responses = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
    expect(responses.map((res) => res.status).sort()).toEqual([200, 409]);
    expect(responses.find((res) => res.status === 409)?.body.type).toBe(problem('email-already-verified'));
    expect((await codes())[0]).toMatchObject({ attempts: 0, consumedAt: ctx.clock.now() });
    expect((await ctx.prisma.user.findUniqueOrThrow({ where: { id: userId } })).emailVerifiedAt).toEqual(ctx.clock.now());
    expect(await failure()).toBeNull();
  });

  it('B1#8/I5/B1#34: five wrong guesses persist five attempts; the right code then fails', async () => {
    const code = await issue();
    for (let i = 0; i < 5; i++) {
      const res = await verify(wrongCode(code));
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(problem('invalid-otp'));
      expect((await codes())[0].attempts).toBe(i + 1);
      expect((await failure())?.failures).toBe(i + 1);
    }
    expect((await verify(code)).status).toBe(400);
    expect((await codes())[0]).toMatchObject({ attempts: 5, consumedAt: null });
    expect((await failure())?.failures).toBe(5);
  });

  it('B1#8: ten wrong submissions in two contended waves persist exactly five attempts and failures', async () => {
    const code = await issue();
    // Five waiters + holder + pg_locks probe stay below the ten-connection pool.
    for (let wave = 0; wave < 2; wave++) {
      const holder = await holdUser();
      const pending = Promise.allSettled(Array.from({ length: 5 }, () => verify(wrongCode(code)).then((res) => res)));
      try { await waitForBlocked(holder.pid, 5); } finally {
        holder.release();
        await Promise.all([holder.settled, pending]);
      }
      expect((await holder.settled).error).toBeNull();
      const results = await pending;
      expect(results.every((res) => res.status === 'fulfilled' && res.value.status === 400)).toBe(true);
    }
    expect((await codes())[0]).toMatchObject({ attempts: 5, consumedAt: null });
    expect((await failure())?.failures).toBe(5);
  });

  it('B1#9/I7: reset-password code cannot verify email and no failure is counted', async () => {
    const code = await issue('reset_password');
    const res = await verify(code);
    expect(res.status).toBe(400);
    expect(res.body.type).toBe(problem('invalid-otp'));
    expect((await codes('reset_password'))[0]).toMatchObject({ attempts: 0, consumedAt: null });
    expect(await failure()).toBeNull();
  });

  it('B1#10/I28: the 21st counted failure returns 429, commits a purpose-only lock and sends one notice', async () => {
    let code = '';
    for (let batch = 0; batch < 5; batch++) {
      if (batch > 0) ctx.clock.advance(60_000);
      code = await issue();
      for (let i = 0; i < (batch === 4 ? 1 : 5); i++) {
        const res = await verify(wrongCode(code));
        expect(res.status).toBe(batch === 4 ? 429 : 400);
        expect(res.body.type).toBe(problem(batch === 4 ? 'rate-limited' : 'invalid-otp'));
        if (batch === 4) expect(res.headers['retry-after']).toBe('86400');
      }
    }
    const lockedUntil = new Date(ctx.clock.now().getTime() + day);
    expect(await failure()).toMatchObject({ failures: 21, lockedUntil });
    expect(await failure('reset_password')).toBeNull();
    await ctx.drainMail();
    const notices = () => ctx.mailer.sent.filter((msg) => msg.subject.includes('temporarily locked'));
    expect(notices()).toHaveLength(1);
    expect(ctx.logs.filter((entry) => entry.event === 'otp_locked')).toEqual([
      expect.objectContaining({ user_id: userId, purpose: 'verify_email', operation_id: expect.any(String) }),
    ]);
    expect((await verify(code)).status).toBe(429);
    await ctx.drainMail();
    expect(notices()).toHaveLength(1);
    expect((await failure())?.lockedUntil).toEqual(lockedUntil);
    // Move into the next hourly window so the purpose lock, rather than the
    // sixth-request email limit, determines this request's Retry-After.
    ctx.clock.advance(3_600_000);
    await sign();
    const denied = await requestVerify();
    expect(denied.status).toBe(429);
    expect(denied.headers['retry-after']).toBe('82800');
    expect(await codes()).toHaveLength(5);
    ctx.clock.advance(60_000);
    await issue('reset_password');
    expect(await codes('reset_password')).toHaveLength(1);
  });

  it('B1#10: lock expires at exactly 24 hours, permits issuing and verifying again', async () => {
    await ctx.prisma.otpFailureWindow.create({ data: {
      userId, purpose: 'verify_email', windowStart: ctx.clock.now(), failures: 21,
      lockedUntil: new Date(ctx.clock.now().getTime() + day),
    } });
    expect((await requestVerify()).status).toBe(429);
    ctx.clock.advance(day);
    await sign();
    expect((await verify(await issue())).status).toBe(200);
  });

  it('B1#10: failures older than 24 hours reset the failure window and clear its old lock', async () => {
    const code = await issue();
    await ctx.prisma.otpFailureWindow.create({ data: {
      userId, purpose: 'verify_email', windowStart: new Date(ctx.clock.now().getTime() - day - 1), failures: 20,
      lockedUntil: new Date(ctx.clock.now().getTime() - 1),
    } });
    expect((await verify(wrongCode(code))).status).toBe(400);
    expect(await failure()).toMatchObject({ failures: 1, windowStart: ctx.clock.now(), lockedUntil: null });
  });

  it('B1#10: no live code and malformed submissions never create a failure window', async () => {
    expect((await verify('123456')).status).toBe(400);
    const code = await issue();
    for (const input of ['12345', 'abcdef', '１２３４５６']) expect((await verify(input)).status).toBe(400);
    expect((await codes())[0].attempts).toBe(0);
    expect(await failure()).toBeNull();
    expect((await verify(code)).status).toBe(200);
  });

  it('B1E17: locked reset requests return 202, issue no code and send no mail', async () => {
    await ctx.prisma.otpFailureWindow.create({ data: {
      userId, purpose: 'reset_password', windowStart: ctx.clock.now(), failures: 21,
      lockedUntil: new Date(ctx.clock.now().getTime() + day),
    } });
    expect((await reset()).status).toBe(202);
    await ctx.drainMail();
    expect(ctx.mailer.sent).toEqual([]);
    expect(await codes('reset_password')).toHaveLength(0);
    expect((await failure('reset_password'))?.failures).toBe(21);
  });

  it('B1E19: trimmed leading-zero code is accepted; five digits are rejected without counting', async () => {
    await ctx.prisma.$transaction(async (tx) => {
      await withUserLock(tx, userId);
      await tx.otpCode.create({ data: { userId, purpose: 'verify_email',
        codeHmac: createHmac('sha256', otpHmacKey).update('012345').digest('hex'),
        expiresAt: new Date(ctx.clock.now().getTime() + 600_000),
      } });
    }, options);
    expect((await verify('12345')).status).toBe(400);
    expect((await codes())[0].attempts).toBe(0);
    expect((await verify(' 012345 ')).status).toBe(200);
    expect((await codes())[0].consumedAt).toEqual(ctx.clock.now());
  });

  it('B1E22: verified user requesting verify_email receives 202 and no new code or mail', async () => {
    await ctx.prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: ctx.clock.now() } });
    expect((await requestVerify()).status).toBe(202);
    await ctx.drainMail();
    expect(ctx.mailer.sent).toEqual([]);
    expect(await codes()).toHaveLength(0);
  });

  it('B1#4: verify_email request without a token returns 401', async () => {
    const res = await ctx.http().post('/v1/auth/otp').send({ purpose: 'verify_email' });
    expect(res.status).toBe(401);
    expect(res.body.type).toBe(problem('invalid-token'));
    expect(await codes()).toHaveLength(0);
  });

  it('B1#30: exhausted budget returns 503 for known and unknown reset emails without account lookup', async () => {
    const exhausted = await createTestApp({ config: { mailDailyBudget: 0 } });
    const lookup = vi.spyOn(exhausted.prisma.user, 'findUnique');
    try {
      for (const address of [email, `${randomUUID()}@example.com`]) {
        const res = await exhausted.http().post('/v1/auth/otp').send({ purpose: 'reset_password', email: address });
        expect(res.status).toBe(503);
        expect(res.body.type).toBe(problem('mail-unavailable'));
      }
      await exhausted.drainMail();
      expect(lookup).not.toHaveBeenCalled();
      expect(exhausted.mailer.sent).toEqual([]);
      expect(await codes('reset_password')).toHaveLength(0);
    } finally { lookup.mockRestore(); await exhausted.close(); }
  });

  it('B1#8: code expires at exactly ten minutes without counting a failure', async () => {
    const code = await issue();
    ctx.clock.advance(600_000);
    const res = await verify(code);
    expect(res.status).toBe(400);
    expect(res.body.type).toBe(problem('invalid-otp'));
    expect((await codes())[0]).toMatchObject({ attempts: 0, consumedAt: null });
    expect(await failure()).toBeNull();
  });

  it('B1#8: expiration uses Clock.now after acquiring the user lock, including the wait', async () => {
    const code = await issue();
    const holder = await holdUser();
    const pending = verify(code).then((res) => res);
    try {
      await waitForBlocked(holder.pid, 1);
      ctx.clock.advance(600_000);
    } finally {
      holder.release();
      await Promise.all([holder.settled, pending]);
    }
    expect((await holder.settled).error).toBeNull();
    const res = await pending;
    expect(res.status).toBe(400);
    expect(res.body.type).toBe(problem('invalid-otp'));
    expect((await codes())[0]).toMatchObject({ attempts: 0, consumedAt: null });
    expect(await failure()).toBeNull();
  });

  it.each([{ purpose: 'x' }, { purpose: 'verify_email', extra: true }, { purpose: 'reset_password', email: 42 }])(
    'B1#4/Review Focus #3: malformed request %j returns 400 validation-failed', async (body) => {
      const res = await ctx.http().post('/v1/auth/otp').send(body);
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(problem('validation-failed'));
      expect(await codes()).toHaveLength(0);
    },
  );
});
