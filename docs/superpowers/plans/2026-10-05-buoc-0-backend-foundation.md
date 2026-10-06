# Bước 0 — Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the cross-cutting backend foundation (repo, NestJS scaffold, Drizzle+Postgres, test
harness, Problem Details, pagination, Idempotency-Key, operation_id logging, rate limiting, `RequestUser`
seam) so Bước 1–8 can build on it without renegotiating shared conventions, proven by one sample endpoint
exercising every convention and one command running all tests against a real Postgres.

**Architecture:** NestJS (ESM) single app (`apps/api`) in a pnpm workspace; Drizzle ORM over Postgres for
all DB access, including `FOR UPDATE SKIP LOCKED` row locking; Vitest + Testcontainers for tests against a
real, disposable Postgres; a `RequestUser` seam stands in for the JWT-based identity that arrives in
Bước 1.

**Tech Stack:** Node 24.11.0, pnpm (workspace), NestJS (ESM), Drizzle ORM `0.45.3` (pinned exact),
`drizzle-kit`, Vitest + `unplugin-swc`, `@testcontainers/postgresql`, PostgreSQL.

**Spec:** [`docs/superpowers/specs/2026-10-05-buoc-0-design.md`](../specs/2026-10-05-buoc-0-design.md) —
executors read both; this plan does not restate the spec's reasoning, only the decisions needed to build
it.

## Global Constraints

- Repo: single pnpm workspace at the repo root; `packages: ["apps/*", "packages/*"]` in
  `pnpm-workspace.yaml`; `apps/mobile` (Flutter, future) stays outside the workspace. No Nx/Turborepo.
- `drizzle-orm` and `drizzle-kit` pinned to an **exact** version (no `^`/`~`) — `drizzle-orm: 0.45.3`,
  `drizzle-kit: 0.31.11` (verified in Task 3: `drizzle-kit` versions independently of `drizzle-orm` and
  its latest stable is `0.31.11`, not a matching `0.45.x` — the plan's original assumption of "matching
  minor" was wrong, corrected here after checking `pnpm view drizzle-kit versions`).
- `apps/api` uses **ESM** and **Vitest** (NestJS CLI's current ESM path), with `unplugin-swc` configured
  so `emitDecoratorMetadata` works for Nest's DI.
- DB tests run against a **real** Postgres via `@testcontainers/postgresql`'s `PostgreSqlContainer`, never
  a mock. Container `startupTimeout` must be set explicitly (fails fast if Docker daemon is down — B0E4).
- Every e2e test that writes to `idempotency_keys` or a rate-limit counter uses a randomly generated
  key/user per test (e.g. `randomUUID()`), never a fixed literal — tests run in parallel by default
  (B0E3).
- Global API prefix `/v1` (SR7).
- Pagination: `page_size` default `20`, max `100`; `page_token` opaque; malformed/tampered token → `400`
  Problem Details, never `500` (SR7, S2, S3).
- Errors: `application/problem+json` with `type, status, title, detail, instance, operation_id` (SR7, S1).
- `operation_id` is an opaque UUID (SR2), present on every log line tied to a request (SR10, S13). Logs
  never contain `password`, `otp`, `token`, raw answers, or context sentences (SR10, S13).
- Timestamps stored UTC, ISO 8601 (SR13).
- `Idempotency-Key` scoped to `(key, user_id, endpoint)`; retention ≥ 24h, then treated as a new request
  (SR8, SE2). **Decision for this plan (not yet put to the project owner — flag on review):** the header is
  **required** on any endpoint that opts in via `@Idempotent()`; missing header → `400` Problem Details.
  Each `@Idempotent({ timeoutSeconds })` call bounds how long its handler may run, default `30s` —
  **implemented 06/10/2026 as a client-side `Promise.race`** around `db.transaction(...)`, not a Postgres
  `transaction_timeout`/`idle_in_transaction_session_timeout`: both correctly bound a handler's idle time
  (an external API call, not running any SQL), but Postgres enforces them by terminating the whole
  connection, which surfaced as an unhandled process-level exception in this exact drizzle + node-postgres
  pooling setup during testing — worse than the slow-handler problem itself. The client-side race never
  touches the connection, so it can't crash the process, but an abandoned transaction still commits later
  if the handler eventually finishes. Cleanup of expired rows (B0E7) is folded into the claim query itself
  (see Task 7) — no separate scheduled job in Bước 0.
- Rate limiting: per-user, atomic single-statement counter increment (B0E2), `429` + `Retry-After` header
  (SR14). The sample endpoint in Task 10 uses an illustrative limit (10 requests / 60s fixed window) —
  **not** a product decision, just enough to prove the mechanism.

## Review Focus

1. Two genuinely concurrent requests with the same `Idempotency-Key` and the same payload must never run
   the side-effecting handler twice and must never both be hard-rejected. **Corrected 06/10/2026** (found
   as a real flaky-test failure while implementing, not a hypothetical): do NOT assert the exact
   `['conflict', 'proceed']` pairing — `Promise.all` does not guarantee the two attempts overlap long
   enough to collide, so the first can legitimately finish (commit) before the second's lock attempt even
   runs, in which case the second correctly `replay`s instead of conflicting. Both `{conflict, proceed}`
   and `{proceed, replay}` are correct. Assert the actual invariant instead: the handler runs exactly once,
   neither result is `reject`, and at least one is `proceed`. Covered by Task 7 (service-level) and
   Task 10 (real parallel HTTP calls).
2. A malformed or tampered `page_token` must return `400` Problem Details, never a `500`. Covered by
   Task 5.
3. Log output must never contain a raw secret-like value (password/OTP/token/answer/context sentence) even
   when such a value flows through a request body. Covered by Task 4.
4. Concurrent requests arriving at the rate-limit boundary at the same instant must not let more than the
   configured count through in the window. Covered by Task 9 (service-level) and Task 10 (real parallel
   HTTP calls).
5. The `RequestUser` fake seam must not be registered when the app module is composed without explicitly
   importing the test-only provider — it must not be reachable "by accident" in a production-shaped
   module graph. Covered by Task 6.

---

### Task 1: Workspace scaffold + NestJS ESM app + health endpoint

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json` (root)
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/nest-cli.json`
- Create: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/src/health/health.controller.ts`
- Test: `apps/api/test/health.e2e-spec.ts`

**Interfaces:**
- Produces: `GET /v1/health` → `200 { status: 'ok' }`. `main.ts` calls
  `app.setGlobalPrefix('v1')` before `listen()` — later tasks' global filters/pipes attach here.

- [ ] **Step 1: Write the failing test** — `apps/api/test/health.e2e-spec.ts`:
  ```ts
  it('GET /v1/health returns ok', async () => {
    const res = await request(app.getHttpServer()).get('/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
  ```
- [ ] **Step 2: Run test to verify it fails** — `pnpm --filter api test:e2e` — expected: fails (nothing
  scaffolded yet / module not found).
- [ ] **Step 3: Scaffold** `pnpm-workspace.yaml` (`packages: ["apps/*", "packages/*"]`), root `package.json`
  (`private: true`, workspace scripts delegating to `--filter api`), then run `nest new api` inside `apps/`
  choosing the **ESM** option, confirming it set up Vitest. Add `health.controller.ts` with the handler
  above; set the global prefix in `main.ts`.
- [ ] **Step 4: Run test to verify it passes** — `pnpm --filter api test:e2e` — expected: PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add pnpm-workspace.yaml package.json apps/api
  git commit -m "feat(api): scaffold NestJS ESM app with health endpoint"
  ```

---

### Task 2: Vitest + Testcontainers Postgres harness

**Files:**
- Create: `apps/api/test/setup/postgres-global-setup.ts`
- Modify: `apps/api/vitest.config.e2e.ts` (add `globalSetup`)
- Test: `apps/api/test/db-connectivity.e2e-spec.ts`

**Interfaces:**
- Produces: Vitest `inject('databaseUrl'): string` — every later e2e test that needs a DB connection reads
  this key.

- [ ] **Step 1: Write the failing test** — `apps/api/test/db-connectivity.e2e-spec.ts`:
  ```ts
  it('connects to the Testcontainers Postgres and runs SELECT 1', async () => {
    const client = new pg.Client({ connectionString: inject('databaseUrl') });
    await client.connect();
    const res = await client.query('SELECT 1 AS ok');
    expect(res.rows[0].ok).toBe(1);
    await client.end();
  });
  ```
- [ ] **Step 2: Run test to verify it fails** — expected: FAIL (`inject('databaseUrl')` undefined / no
  global setup).
- [ ] **Step 3: Implement `postgres-global-setup.ts`** — `export async function setup(project)`: starts
  `new PostgreSqlContainer('postgres:17').withStartupTimeout(30_000).start()`, calls
  `project.provide('databaseUrl', container.getConnectionUri())`; `export async function teardown()` stops
  the container. Wire `globalSetup` into `vitest.config.e2e.ts`.
- [ ] **Step 4: Run test to verify it passes** — expected: PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add apps/api/test/setup apps/api/vitest.config.e2e.ts apps/api/test/db-connectivity.e2e-spec.ts
  git commit -m "test(api): add Testcontainers Postgres harness for e2e tests"
  ```

---

### Task 3: Drizzle connection + migration runner

**Files:**
- Create: `apps/api/drizzle.config.ts`
- Create: `apps/api/src/common/db/drizzle.module.ts`
- Test: `apps/api/test/drizzle-connectivity.e2e-spec.ts`

**Interfaces:**
- Consumes: `inject('databaseUrl')` (Task 2).
- Produces: `DRIZZLE_DB` injection token; `DrizzleModule.forRoot()` registers a `NodePgDatabase` instance
  under it. Later tasks inject it via `@Inject(DRIZZLE_DB) private readonly db: NodePgDatabase`.

- [ ] **Step 1: Write the failing test** — `apps/api/test/drizzle-connectivity.e2e-spec.ts`: boot a Nest
  testing module importing `DrizzleModule.forRoot({ connectionString: inject('databaseUrl') })`, resolve
  `DRIZZLE_DB`, run `db.execute(sql`SELECT 1 AS ok`)`, assert `rows[0].ok === 1`.
- [ ] **Step 2: Run test to verify it fails** — expected: FAIL (module doesn't exist).
- [ ] **Step 3: Add exact dependencies** `drizzle-orm@0.45.3` and matching `drizzle-kit` to
  `apps/api/package.json` (exact versions, no `^`). Implement `drizzle.config.ts` (dialect `postgresql`,
  schema glob `src/**/schema.ts`, migrations out dir `drizzle/`) and `DrizzleModule.forRoot()` creating a
  `pg.Pool` from the connection string and wrapping it with `drizzle(pool)`.
- [ ] **Step 4: Run test to verify it passes** — expected: PASS.
- [ ] **Step 5: Document the migration safety constraint** (no runnable test — no long-lived dev DB exists
  yet): add a one-line comment at the top of `drizzle.config.ts` stating migrations in this project must be
  additive (no destructive `DROP`/`ALTER ... NOT NULL` without a separate reviewed step), per B0E5.
- [ ] **Step 6: Commit**
  ```bash
  git add apps/api/drizzle.config.ts apps/api/src/common/db apps/api/package.json apps/api/test/drizzle-connectivity.e2e-spec.ts
  git commit -m "feat(api): wire Drizzle ORM (pinned 0.45.3) over the Testcontainers Postgres"
  ```

---

### Task 4: `operation_id` + redacting logger

**Files:**
- Create: `apps/api/src/common/logging/operation-id.middleware.ts`
- Create: `apps/api/src/common/logging/redacting-logger.service.ts`
- Test: `apps/api/src/common/logging/redacting-logger.service.spec.ts`

**Interfaces:**
- Produces: `operationIdMiddleware` sets `req.operationId: string` (UUID v4) on every request — Task 5's
  filter and Task 7's claim service both read `req.operationId`. `RedactingLoggerService.log(message:
  unknown, context?: string)` — drop-in replacement for Nest's `Logger` used everywhere else in the app.

- [ ] **Step 1: Write the failing test** — `redacting-logger.service.spec.ts`:
  ```ts
  it('redacts password/otp/token/answer/contextSentence fields before logging', () => {
    const sink = vi.fn();
    const logger = new RedactingLoggerService(sink);
    logger.log({ password: 'secret', otp: '123456', token: 'abc', answer: 'cat', contextSentence: 'The cat sat', ok: 1, operationId: 'op-1' });
    const logged = JSON.stringify(sink.mock.calls[0]);
    expect(logged).not.toContain('secret');
    expect(logged).not.toContain('123456');
    expect(logged).not.toContain('abc');
    expect(logged).not.toContain('The cat sat');
    expect(logged).toContain('op-1');
  });
  ```
- [ ] **Step 2: Run test to verify it fails** — expected: FAIL (class doesn't exist).
- [ ] **Step 3: Implement `operation-id.middleware.ts`** (`randomUUID()` from `node:crypto`, attach to
  `req.operationId`) **and `redacting-logger.service.ts`** (`log(message, context?)`: recursively replace
  values for keys matching `/password|otp|token|answer|contextSentence/i` with `'[redacted]'` before
  passing to the sink; default sink is `console.log`, constructor accepts an override sink for testing).
- [ ] **Step 4: Run test to verify it passes** — expected: PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add apps/api/src/common/logging
  git commit -m "feat(api): add operation_id middleware and redacting logger"
  ```

---

### Task 5: Problem Details filter + pagination util

**Files:**
- Create: `apps/api/src/common/problem-details/problem-details.exception.ts`
- Create: `apps/api/src/common/problem-details/problem-details.filter.ts`
- Create: `apps/api/src/common/pagination/page-token.util.ts`
- Test: `apps/api/src/common/problem-details/problem-details.filter.spec.ts`
- Test: `apps/api/src/common/pagination/page-token.util.spec.ts`

**Interfaces:**
- Consumes: `req.operationId` (Task 4).
- Produces: `class ProblemDetailsException extends HttpException` with constructor
  `(opts: { status: number; title: string; type?: string; detail?: string })`; a global
  `ProblemDetailsFilter implements ExceptionFilter<unknown>` registered in `main.ts` via
  `app.useGlobalFilters(new ProblemDetailsFilter())`. `encodePageToken(cursor: { id: string }): string` and
  `decodePageToken(token: string): { id: string } | null` (`null` on malformed input).

- [ ] **Step 1: Write the failing tests**
  ```ts
  // problem-details.filter.spec.ts
  it('formats any thrown error as application/problem+json with operation_id', () => {
    const host = mockArgumentsHost({ operationId: 'op-2' });
    new ProblemDetailsFilter().catch(new ProblemDetailsException({ status: 409, title: 'Conflict' }), host);
    expect(host.response.contentType).toBe('application/problem+json');
    expect(host.response.body).toMatchObject({ status: 409, title: 'Conflict', operation_id: 'op-2' });
  });

  // page-token.util.spec.ts
  it('round-trips a cursor through encode/decode', () => {
    expect(decodePageToken(encodePageToken({ id: 'abc' }))).toEqual({ id: 'abc' });
  });
  it('returns null for a malformed token instead of throwing', () => {
    expect(decodePageToken('not-a-real-token')).toBeNull();
  });
  ```
- [ ] **Step 2: Run tests to verify they fail** — expected: FAIL (files don't exist).
- [ ] **Step 3: Implement.** `encodePageToken`/`decodePageToken`: base64url-encode/decode a JSON string;
  `decodePageToken` wraps `JSON.parse` in `try/catch` and returns `null` on any failure (never throws).
  `ProblemDetailsFilter.catch(exception, host)`: reads `request.operationId`, builds
  `{ type: exception.type ?? 'about:blank', status, title, detail, instance: request.url, operation_id }`,
  sets `Content-Type: application/problem+json`, writes the status/body.
- [ ] **Step 4: Add the pagination end-to-end check** (Review Focus #2) —
  `apps/api/test/pagination.e2e-spec.ts`: a controller using `decodePageToken` on a malformed `page_token`
  query param responds `400`, body `type`/`title` present, never `500`.
- [ ] **Step 5: Run tests to verify they pass** — expected: PASS.
- [ ] **Step 6: Commit**
  ```bash
  git add apps/api/src/common/problem-details apps/api/src/common/pagination apps/api/test/pagination.e2e-spec.ts
  git commit -m "feat(api): add Problem Details filter and opaque page_token util"
  ```

---

### Task 6: `RequestUser` seam

**Files:**
- Create: `apps/api/src/common/request-user/request-user.ts`
- Create: `apps/api/src/common/request-user/fake-request-user.middleware.ts`
- Create: `apps/api/src/common/request-user/current-user.decorator.ts`
- Test: `apps/api/src/common/request-user/fake-request-user.middleware.spec.ts`
- Test: `apps/api/test/request-user-not-wired-by-default.e2e-spec.ts`

**Interfaces:**
- Produces: `interface RequestUser { userId: string }`; `@CurrentUser(): ParameterDecorator` reads
  `req.user as RequestUser`. `fakeRequestUserMiddleware` reads header `X-Test-User-Id`, sets
  `req.user = { userId: <header value> }` — only ever registered by a module that explicitly imports it
  (never auto-applied globally).

- [ ] **Step 1: Write the failing tests**
  ```ts
  // fake-request-user.middleware.spec.ts
  it('sets req.user from the X-Test-User-Id header', () => {
    const req = { headers: { 'x-test-user-id': 'user-123' } } as any;
    fakeRequestUserMiddleware(req, {} as any, () => {});
    expect(req.user).toEqual({ userId: 'user-123' });
  });

  // request-user-not-wired-by-default.e2e-spec.ts
  it('a controller using @CurrentUser() sees no user when the fake middleware is not imported', async () => {
    // boot AppModule as composed by Task 1/5/9 (no fake-request-user module imported)
    const res = await request(app.getHttpServer()).get('/v1/health').set('X-Test-User-Id', 'user-123');
    // health has no @CurrentUser(), so this just proves the header alone does nothing without opt-in wiring
    expect(res.status).toBe(200);
  });
  ```
- [ ] **Step 2: Run tests to verify they fail** — expected: FAIL (files don't exist).
- [ ] **Step 3: Implement** `request-user.ts` (interface only), `fake-request-user.middleware.ts`
  (reads the header, sets `req.user`), `current-user.decorator.ts`
  (`createParamDecorator((_, ctx) => ctx.switchToHttp().getRequest().user as RequestUser)`).
- [ ] **Step 4: Run tests to verify they pass** — expected: PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add apps/api/src/common/request-user apps/api/test/request-user-not-wired-by-default.e2e-spec.ts
  git commit -m "feat(api): add RequestUser seam (fake middleware for tests, real JWT lands in Step 1)"
  ```

---

### Task 7: Idempotency schema + claim service

**Files:**
- Create: `apps/api/src/common/idempotency/idempotency.schema.ts`
- Create: `apps/api/src/common/idempotency/idempotency.service.ts`
- Test: `apps/api/src/common/idempotency/idempotency.service.e2e-spec.ts`

> **Corrected 06/10/2026** (Codex caught this implementing the original version — see design doc §5
> correction note): `INSERT ... ON CONFLICT DO NOTHING` is not non-blocking in Postgres (a racing insert
> waits on an uncommitted conflicting row instead of failing fast), and because that `INSERT` auto-commits
> immediately, no lock survives past `claim()` returning — a second request can reach the same
> "orphaned" branch and also proceed. Fixed by using `pg_try_advisory_xact_lock` (genuinely non-blocking,
> transaction-scoped) and merging `claim`+handler-run+`complete` into one function over one open
> transaction, replacing the two-call `claim()`/`complete()` shape below.

**Interfaces:**
- Consumes: `DRIZZLE_DB` (Task 3).
- Produces: Drizzle table `idempotencyKeys`.
  `runIdempotent<T>(db: NodePgDatabase, params: { key: string; userId: string; endpoint: string;
  payloadHash: string }, handler: () => Promise<{ status: number; body: T }>): Promise<RunIdempotentResult<T>>`
  where
  `type RunIdempotentResult<T> = { kind: 'proceed'; status: number; body: T } | { kind: 'replay'; status:
  number; body: unknown } | { kind: 'conflict'; retryAfterSeconds: number } | { kind: 'reject' }`.
  `handler` runs only for `'proceed'`; `runIdempotent` opens the transaction, acquires the advisory lock,
  decides the branch, and — only when proceeding — awaits `handler()` and writes `status='succeeded'`
  before committing, all inside that one transaction.

- [ ] **Step 1: Define the schema** — `idempotency.schema.ts`: `pgTable('idempotency_keys', { key: text,
  userId: uuid('user_id'), endpoint: text, status: text, payloadHash: text('payload_hash'), responseStatus:
  integer('response_status'), responseBody: jsonb('response_body'), createdAt: timestamp('created_at',
  { withTimezone: true }).defaultNow(), updatedAt: timestamp('updated_at', { withTimezone: true
  }).defaultNow() }, (t) => [unique().on(t.key, t.userId, t.endpoint)])` — **note the extra-config callback
  returns an array**, not an object with named keys (verified against the installed `drizzle-orm@0.45.3`
  type signature in Task 9; an object-shaped return is the older, wrong API for this pinned version).
  Generate the migration (`drizzle-kit generate`) and commit the generated SQL file alongside this task.
  The schema glob in `drizzle.config.ts` is `./src/**/*.schema.ts` (already fixed in Task 9) — file must be
  named `idempotency.schema.ts`, not `schema.ts`.
- [ ] **Step 2: Write the failing tests** — `idempotency.service.e2e-spec.ts` (each `it` uses its own
  random `key`/`userId` per the Global Constraints rule; a trivial `handler` like
  `async () => ({ status: 200, body: { ok: true } })` stands in for real business logic):
  ```ts
  it('B0#2: a never-seen key proceeds and runs the handler', async () => {
    const r = await runIdempotent(db, { key, userId, endpoint: '/v1/sample', payloadHash: 'h1' },
      async () => ({ status: 200, body: { ok: true } }));
    expect(r).toMatchObject({ kind: 'proceed', status: 200, body: { ok: true } });
  });

  it('B0#1: a key whose advisory lock is held by a live, open transaction returns conflict immediately', async () => {
    let released: () => void;
    const holding = new Promise<void>((resolve) => { released = resolve; });
    const holderDone = db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockKeyFor(key, userId, '/v1/sample')})`);
      await holding; // keep the transaction (and the lock) open until the test releases it
    });
    const started = Date.now();
    const r = await runIdempotent(db, { key, userId, endpoint: '/v1/sample', payloadHash: 'h1' },
      async () => ({ status: 200, body: {} }));
    expect(Date.now() - started).toBeLessThan(1000); // non-blocking: must not wait on the holder
    expect(r.kind).toBe('conflict');
    released!();
    await holderDone;
  });

  it('B0#3: a succeeded key with the same payload hash replays without running the handler', async () => {
    await db.insert(idempotencyKeys).values({ key, userId, endpoint: '/v1/sample', status: 'succeeded', payloadHash: 'h1', responseStatus: 200, responseBody: { ok: true } });
    let handlerRan = false;
    const r = await runIdempotent(db, { key, userId, endpoint: '/v1/sample', payloadHash: 'h1' },
      async () => { handlerRan = true; return { status: 200, body: {} }; });
    expect(r).toEqual({ kind: 'replay', status: 200, body: { ok: true } });
    expect(handlerRan).toBe(false);
  });

  it('B0#4: a key with a different payload hash is rejected without running the handler', async () => {
    await db.insert(idempotencyKeys).values({ key, userId, endpoint: '/v1/sample', status: 'succeeded', payloadHash: 'h1', responseStatus: 200, responseBody: {} });
    let handlerRan = false;
    const r = await runIdempotent(db, { key, userId, endpoint: '/v1/sample', payloadHash: 'h2' },
      async () => { handlerRan = true; return { status: 200, body: {} }; });
    expect(r.kind).toBe('reject');
    expect(handlerRan).toBe(false);
  });

  it('B0E1: an orphaned in_progress row (no live holder) is claimed as a new attempt', async () => {
    await db.insert(idempotencyKeys).values({ key, userId, endpoint: '/v1/sample', status: 'in_progress', payloadHash: 'h1' }); // nobody holds the advisory lock on this key
    const r = await runIdempotent(db, { key, userId, endpoint: '/v1/sample', payloadHash: 'h1' },
      async () => ({ status: 200, body: { recovered: true } }));
    expect(r).toMatchObject({ kind: 'proceed', status: 200, body: { recovered: true } });
  });

  it('B0E7: a row past the 24h retention window is claimed as a new request', async () => {
    await db.insert(idempotencyKeys).values({ key, userId, endpoint: '/v1/sample', status: 'succeeded', payloadHash: 'h1', responseStatus: 200, responseBody: {}, createdAt: new Date(Date.now() - 25 * 3600 * 1000) });
    const r = await runIdempotent(db, { key, userId, endpoint: '/v1/sample', payloadHash: 'h1' },
      async () => ({ status: 200, body: { fresh: true } }));
    expect(r).toMatchObject({ kind: 'proceed', status: 200, body: { fresh: true } });
  });

  it('Review Focus #1: two genuinely concurrent runs for the same key run the handler exactly once', async () => {
    // See Review Focus #1's note above: exact conflict/proceed/replay ordering is non-deterministic.
    let handlerRunCount = 0;
    const runOnce = () =>
      runIdempotent(db, { key, userId, endpoint: '/v1/sample', payloadHash: 'h1' }, async () => {
        handlerRunCount += 1;
        return { status: 200, body: { marker: 'x' } };
      });
    const [a, b] = await Promise.all([runOnce(), runOnce()]);
    expect(handlerRunCount).toBe(1);
    expect(a.kind).not.toBe('reject');
    expect(b.kind).not.toBe('reject');
    expect([a.kind, b.kind]).toContain('proceed');
  });
  ```
  (`lockKeyFor` is the same hashing helper `runIdempotent` itself uses — export it from
  `idempotency.service.ts` so the test can reuse it to simulate an externally held lock.)
- [ ] **Step 3: Run tests to verify they fail** — expected: FAIL (service doesn't exist).
- [ ] **Step 4: Implement `runIdempotent()`** per the corrected algorithm:
  1. Compute `lockKey = lockKeyFor(key, userId, endpoint)` — a deterministic bigint, e.g. via Postgres
     `hashtext(key || ':' || userId || ':' || endpoint)` cast to `bigint`, computed in SQL so it matches
     exactly between calls.
  2. Race `db.transaction(async (tx) => { ... })` against a plain `setTimeout`-based rejection at
     `timeoutSeconds` (default `30`, from `options?.timeoutSeconds` — B0E8; a client-side
     `Promise.race`, not a Postgres GUC — see Global Constraints for why). Inside the transaction:
     `SELECT pg_try_advisory_xact_lock(${lockKey}) AS locked`.
  3. If `locked` is `false` → return `{ kind: 'conflict', retryAfterSeconds: 2 }` (the transaction can
     simply end here; nothing was read or written, so commit/rollback doesn't matter).
  4. If `locked` is `true`, `SELECT * FROM idempotency_keys WHERE key=... AND user_id=... AND endpoint=...`
     (a plain read — always safe once we hold the lock, no one else can be mid-write for this key).
     - No row → `INSERT` with `status='in_progress'`, run `handler()`, then `UPDATE` to
       `status='succeeded', response_status, response_body`, commit → `{ kind: 'proceed', status, body }`.
     - Row exists, `createdAt` older than 24h (B0E7) → `DELETE` it, then do the same as "no row" above.
     - Row exists, `status` succeeded/failed_permanent, same `payloadHash` → `{ kind: 'replay', ... }`
       (B0#3), handler not called.
     - Row exists, same statuses, different `payloadHash` → `{ kind: 'reject' }` (B0#4), handler not
       called.
     - Row exists, `status = 'in_progress'` (B0E1 — orphaned, since a live holder would have made step 2
       return `false`) → `UPDATE` the row's `payloadHash` in place, run `handler()`, then `UPDATE` to
       `succeeded`, commit → `proceed`.
  5. If `handler()` throws, let the transaction roll back (status stays whatever it was before the throw —
     for a fresh row that means it stays `in_progress`, correctly becoming B0E1's orphan case for the next
     attempt) and rethrow.
- [ ] **Step 5: Run tests to verify they pass** — expected: PASS.
- [ ] **Step 6: Commit**
  ```bash
  git add apps/api/src/common/idempotency apps/api/drizzle
  git commit -m "feat(api): add idempotency_keys schema and runIdempotent via advisory lock (B0#1-4, B0E1, B0E7, B0E8)"
  ```

---

### Task 8: Idempotency HTTP wiring

**Files:**
- Create: `apps/api/src/common/idempotency/idempotent.decorator.ts`
- Create: `apps/api/src/common/idempotency/idempotency.interceptor.ts`
- Test: `apps/api/src/common/idempotency/idempotency.interceptor.e2e-spec.ts`

**Interfaces:**
- Consumes: `runIdempotent()` (Task 7, corrected shape — wraps the handler call, not a separate
  `claim`/`complete` pair), `@CurrentUser()` (Task 6), `ProblemDetailsException` (Task 5).
- Produces: `@Idempotent()` method decorator any controller handler can apply. The interceptor must call
  `next.handle()` **from inside** the callback passed to `runIdempotent()` (via `firstValueFrom` to bridge
  the Observable to the `Promise` `runIdempotent` expects, then `from()` to bridge the result back) so the
  advisory lock stays held for the real handler's entire execution, not just around the lock check.

- [ ] **Step 1: Write the failing tests** — `idempotency.interceptor.e2e-spec.ts`, against a throwaway
  test controller with one `@Idempotent()` `POST` handler:
  ```ts
  it('missing Idempotency-Key header returns 400', async () => {
    const res = await request(app.getHttpServer()).post('/v1/test-idempotent').send({ a: 1 });
    expect(res.status).toBe(400);
  });

  it('same key + same body replays the first response without re-running the handler', async () => {
    const key = randomUUID();
    const first = await request(app.getHttpServer()).post('/v1/test-idempotent').set('Idempotency-Key', key).send({ a: 1 });
    const second = await request(app.getHttpServer()).post('/v1/test-idempotent').set('Idempotency-Key', key).send({ a: 1 });
    expect(second.body).toEqual(first.body);
    expect(handlerCallCount).toBe(1);
  });

  it('same key + different body returns a Problem Details error', async () => {
    const key = randomUUID();
    await request(app.getHttpServer()).post('/v1/test-idempotent').set('Idempotency-Key', key).send({ a: 1 });
    const res = await request(app.getHttpServer()).post('/v1/test-idempotent').set('Idempotency-Key', key).send({ a: 2 });
    expect(res.status).toBe(400); // S5: Problem Details rejection, not 409 — 409 is reserved for in-flight
  });
  ```
- [ ] **Step 2: Run tests to verify they fail** — expected: FAIL (interceptor doesn't exist).
- [ ] **Step 3: Implement.** `@Idempotent()` sets reflected metadata the interceptor checks. The
  interceptor: reads `Idempotency-Key` header (missing → throw `ProblemDetailsException({status: 400,
  title: 'Idempotency-Key required'})`), reads `userId` from `@CurrentUser()`, computes
  `payloadHash = sha256(JSON.stringify(req.body))`, then calls
  `runIdempotent(db, { key, userId, endpoint: req.route.path, payloadHash }, async () => { const body =
  await firstValueFrom(next.handle()); return { status: response.statusCode, body }; })`. Branch on the
  result: `conflict` → throw `ProblemDetailsException({status: 409, title: 'Request already in progress',
  detail: retryAfterSeconds})` and set a `Retry-After` header; `reject` → throw
  `ProblemDetailsException({status: 400, title: 'Idempotency-Key reused with a different payload'})`;
  `replay`/`proceed` → return `from(Promise.resolve(result.body))` so the Observable the interceptor
  produces carries the right body either way.
- [ ] **Step 4: Run tests to verify they pass** — expected: PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add apps/api/src/common/idempotency/idempotent.decorator.ts apps/api/src/common/idempotency/idempotency.interceptor.ts apps/api/src/common/idempotency/idempotency.interceptor.e2e-spec.ts
  git commit -m "feat(api): wire @Idempotent() decorator and interceptor into the HTTP layer"
  ```

---

### Task 9: Rate limit guard

**Files:**
- Create: `apps/api/src/common/rate-limit/rate-limit.schema.ts`
- Create: `apps/api/src/common/rate-limit/rate-limit.guard.ts`
- Create: `apps/api/src/common/rate-limit/rate-limit.decorator.ts`
- Test: `apps/api/src/common/rate-limit/rate-limit.guard.e2e-spec.ts`

**Interfaces:**
- Consumes: `DRIZZLE_DB` (Task 3), `@CurrentUser()` (Task 6).
- Produces: `@RateLimit({ max: number; windowSeconds: number })` decorator + `RateLimitGuard implements
  CanActivate`.

- [ ] **Step 1: Define the schema** — `rate-limit.schema.ts`: `pgTable('rate_limit_counters', { userId:
  uuid('user_id'), windowStart: timestamp('window_start', { withTimezone: true }), count: integer
  }, (t) => ({ uniq: unique().on(t.userId, t.windowStart) }))`. Generate and commit the migration.
- [ ] **Step 2: Write the failing tests** — `rate-limit.guard.e2e-spec.ts` against a throwaway controller
  with `@RateLimit({ max: 3, windowSeconds: 60 })`:
  ```ts
  it('allows up to max requests, then returns 429 with Retry-After', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await request(app.getHttpServer()).get('/v1/test-rate-limited').set('X-Test-User-Id', userId);
      expect(res.status).toBe(200);
    }
    const fourth = await request(app.getHttpServer()).get('/v1/test-rate-limited').set('X-Test-User-Id', userId);
    expect(fourth.status).toBe(429);
    expect(fourth.headers['retry-after']).toBeDefined();
  });

  it('Review Focus #4: N concurrent requests at the boundary never let more than max through', async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () =>
      request(app.getHttpServer()).get('/v1/test-rate-limited').set('X-Test-User-Id', userId)));
    expect(results.filter((r) => r.status === 200)).toHaveLength(3);
  });
  ```
- [ ] **Step 3: Run tests to verify they fail** — expected: FAIL (guard doesn't exist).
- [ ] **Step 4: Implement.** `RateLimitGuard.canActivate()`: compute `windowStart` by truncating `now()`
  to the configured `windowSeconds` bucket; run the single atomic statement (B0E2):
  `INSERT INTO rate_limit_counters (user_id, window_start, count) VALUES ($1, $2, 1) ON CONFLICT (user_id,
  window_start) DO UPDATE SET count = rate_limit_counters.count + 1 RETURNING count`; if the returned
  `count > max`, throw `ProblemDetailsException({ status: 429, title: 'Rate limit exceeded' })` and set
  `Retry-After` to the seconds remaining in the window.
- [ ] **Step 5: Run tests to verify they pass** — expected: PASS.
- [ ] **Step 6: Commit**
  ```bash
  git add apps/api/src/common/rate-limit
  git commit -m "feat(api): add atomic per-user rate limit guard (B0E2)"
  ```

---

### Task 10: Sample endpoint — ties every convention together

> **Corrected 06/10/2026:** do NOT import the fake `RequestUser` middleware into `app.module.ts`, even
> scoped to just `SampleController` — `AppModule` is the module `main.ts` actually boots, so wiring the
> fake auth there means it is genuinely reachable on a real deployment, which is exactly what B0E6 exists
> to prevent. `AppModule` only imports `DrizzleModule.forRoot()` and `SampleModule` (no fake middleware).
> `sample.e2e-spec.ts` builds its own throwaway test module (`DrizzleModule.forRoot(...)` +
> `SampleModule`) and calls `app.use(operationIdMiddleware, fakeRequestUserMiddleware)` directly on that
> standalone test app instance — the same pattern Tasks 8 and 9 already use — never on `AppModule`.

**Files:**
- Create: `apps/api/src/sample/sample.module.ts`, `apps/api/src/sample/sample.controller.ts`
- Modify: `apps/api/src/app.module.ts` (import `DrizzleModule.forRoot({ connectionString:
  process.env.DATABASE_URL ?? '' })` and `SampleModule` — **not** the fake `RequestUser` middleware)
- Test: `apps/api/test/sample.e2e-spec.ts` (its own test module, see correction note above)

**Interfaces:**
- Produces: `POST /v1/sample` — `@Idempotent()`, `@RateLimit({ max: 10, windowSeconds: 60 })`, reads
  `@CurrentUser()`, returns `{ receivedAt: string (ISO 8601 UTC) }`. `GET /v1/sample?page_size=&page_token=`
  — a trivial paginated list (static in-memory array is fine) proving the pagination util end-to-end.

- [ ] **Step 1: Write the failing tests** — `sample.e2e-spec.ts`:
  ```ts
  it('POST /v1/sample with a bad Idempotency-Key payload mismatch returns Problem Details', async () => {
    const key = randomUUID();
    await request(app.getHttpServer()).post('/v1/sample').set('Idempotency-Key', key).set('X-Test-User-Id', userId).send({ a: 1 });
    const res = await request(app.getHttpServer()).post('/v1/sample').set('Idempotency-Key', key).set('X-Test-User-Id', userId).send({ a: 2 });
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body.operation_id).toBeDefined();
  });

  it('Review Focus #1 end-to-end: two real concurrent POSTs with the same key never double-execute', async () => {
    // See Review Focus #1's note: exact status pairing is non-deterministic; assert the invariant.
    const key = randomUUID();
    const [a, b] = await Promise.all([
      request(app.getHttpServer()).post('/v1/sample').set('Idempotency-Key', key).set('X-Test-User-Id', userId).send({ a: 1 }),
      request(app.getHttpServer()).post('/v1/sample').set('Idempotency-Key', key).set('X-Test-User-Id', userId).send({ a: 1 }),
    ]);
    expect([a.status, b.status].some((s) => s < 300)).toBe(true);
    expect([a.status, b.status]).not.toContain(400);
    if (a.status < 300 && b.status < 300) {
      expect(a.body).toEqual(b.body);
    }
  });

  it('GET /v1/sample with a malformed page_token returns 400 Problem Details', async () => {
    const res = await request(app.getHttpServer()).get('/v1/sample?page_token=not-real');
    expect(res.status).toBe(400);
  });
  ```
- [ ] **Step 2: Run tests to verify they fail** — expected: FAIL (module doesn't exist).
- [ ] **Step 3: Implement `SampleController`** wiring `@Idempotent()`, `@RateLimit()`, `@CurrentUser()`,
  `encodePageToken`/`decodePageToken`, and the `RedactingLoggerService` for its one log line per request
  (logging the request body, to also exercise Review Focus #3 against a real request if the test sends a
  `password` field). Import `FakeRequestUserMiddleware` only inside `SampleModule` (not globally), keeping
  Task 6's isolation guarantee for every other module.
- [ ] **Step 4: Run tests to verify they pass** — expected: PASS.
- [ ] **Step 5: Run the full suite with one command** — `pnpm --filter api test:e2e` — expected: every
  test from Tasks 1–10 passes against a single fresh Testcontainers Postgres (the "test chạy bằng một
  lệnh" done-criterion from the spec's §1).
- [ ] **Step 6: Commit**
  ```bash
  git add apps/api/src/sample apps/api/src/app.module.ts apps/api/test/sample.e2e-spec.ts
  git commit -m "feat(api): add sample endpoint exercising every Bước 0 convention end-to-end"
  ```

---

## Self-Review Notes

- **Spec coverage:** B0#1–4 → Task 7. B0E1 → Task 7. B0E2 → Task 9. B0E3 → Global Constraints (test
  convention, not a standalone task). B0E4 → Task 2. B0E5 → Task 3 (empty-DB half tested; populated-DB
  half documented, not testable without a long-lived dev DB — flagged, not silently dropped). B0E6 → Task
  6. B0E7 → Task 7. B0E8 → Task 7. SR2/SR7/SR10/SR13 (ID, API prefix, logging, time) → Tasks 4–5. S1–S3 →
  Task 5. SE2 → Task 7 (B0E7). SR14 → Task 9. B0R4 (`RequestUser` seam) → Task 6.
- **Open items this plan decided without a fresh ask** (flagged in Global Constraints, surface on plan
  review): Idempotency-Key header is mandatory when `@Idempotent()` is used; claim transaction
  `statement_timeout` is `30s`; retention cleanup is folded into the claim query rather than a scheduled
  job. All three were open questions in the design doc; this plan picked a concrete, reasonable value for
  each so tasks have exact signatures, per this skill's requirement — they are not re-litigated here, only
  surfaced for the project owner's review.
