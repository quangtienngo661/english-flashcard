# Migrate apps/api from Drizzle to Prisma — Implementation Plan

> **For agentic workers:** this plan is executed by Codex (`gpt-6.1-sol`), one task at a time, each task
> reviewed by Codex (`gpt-6-astra`) before the next task starts, with a final human-directed review by
> Claude on the whole branch. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Drizzle ORM with Prisma ORM across `apps/api`, preserving every existing behavior and
test case (23 e2e + 5 unit, currently passing on Drizzle) — this is a like-for-like swap of the data-access
layer, not a redesign of `runIdempotent`, the rate-limit guard, or any HTTP-facing interface.

**Why now:** the original reason to exclude Prisma (its ORM client and typed SQL builder cannot express a
`FOR UPDATE`/`SKIP LOCKED` row-locking clause — confirmed via `prisma/orm#30531`) turned out not to apply
to this project's actual mechanism. After Codex found a race in the original `INSERT ... ON CONFLICT` +
`SELECT ... FOR UPDATE SKIP LOCKED` design, the claim algorithm was rewritten around
`pg_try_advisory_xact_lock()` — a plain SQL function call, not a locking clause — and `prisma/orm#30531`
explicitly lists advisory locks as **out of scope** for the gap it describes. Prisma's **TypedSQL**
(`.sql` files + `$queryRawTyped`, shipped since v5.19) gives that one function call the same type safety
Drizzle has; every other query in this codebase is plain CRUD that Prisma Client expresses natively. See
`docs/superpowers/specs/2026-10-05-buoc-0-design.md`'s B0R2 correction note (06/10/2026) for the full
history — this plan does not re-argue it, only implements the switch.

**Architecture:** unchanged — NestJS (ESM), one `PrismaClient` behind a global Nest module (mirrors the
old `DrizzleModule.forRoot()`), a `@prisma/adapter-pg` driver adapter over the same Testcontainers
Postgres. `runIdempotent()`'s external signature, `RunIdempotentResult<T>`, the `@Idempotent()` /
`@RateLimit()` decorators, and every controller/interceptor/guard's public shape stay identical — only
what sits behind `PRISMA_CLIENT` vs `DRIZZLE_DB` changes.

**Tech Stack:** `prisma`, `@prisma/client`, `@prisma/adapter-pg` — pin exact `7.10.0` (verified via
`pnpm view prisma versions`: the npm `latest` dist-tag currently resolves to `8.0.0-rc.20`, a prerelease;
`7.10.0` is the newest **stable** release). Remove `drizzle-orm`, `drizzle-kit` entirely.

**Spec:** [`docs/superpowers/specs/2026-10-05-buoc-0-design.md`](../specs/2026-10-05-buoc-0-design.md) and
[`docs/superpowers/plans/2026-10-05-buoc-0-backend-foundation.md`](2026-10-05-buoc-0-backend-foundation.md)
(the plan this one supersedes for ORM-specific tasks 3, 7, 9, 10 — their test *behavior* is the acceptance
bar for this migration; their Drizzle-specific *code* is being replaced).

## Execution method (already decided — do not re-ask)

Per task, in order:
1. Claude hands this task's Files/Interfaces/Steps to Codex (`gpt-6.1-sol`, write-capable) to implement.
2. Codex (`gpt-6-astra`) reviews that task's diff against this plan before the next task starts.
3. After all tasks: Claude reviews the whole branch once more against the full test suite.

## Global Constraints

- `prisma`, `@prisma/client`, `@prisma/adapter-pg` pinned to **exact** `7.10.0` (no `^`/`~`) — same
  pinning discipline as Drizzle, for the same reason: the registry's `latest` tag is currently a
  pre-1.0-equivalent prerelease (`8.0.0-rc.20`) for this package, not a release to float on.
- No behavior change: every `it(...)` currently in the 6 touched test files must still exist, with the
  same assertions, after migration — only the DB-client setup inside each test changes. Do not add, drop,
  or loosen an assertion while porting.
- `schema.prisma` model field names/`@map()` must match the **existing** Postgres column names exactly
  (`idempotency_keys`, `rate_limit_counters` and their columns, as created by the Drizzle migrations being
  replaced) — this is a drop-in swap of the access layer, not a schema change.
- The advisory-lock call stays a `pg_try_advisory_xact_lock(...)` function call via Prisma **TypedSQL**
  (`prisma/sql/*.sql` + `$queryRawTyped`), never a bare untyped `$queryRaw`. TypedSQL uses Postgres
  positional parameters (`$1`, `$2`, `$3`, optionally documented with a `-- @param {Type} $1:name`
  comment) — **not** JS template-literal interpolation — and the `generator client` block still needs
  `previewFeatures = ["typedSql"]` (verified against current Prisma 7 docs: still preview, not GA).
- `runIdempotent()`'s signature and `RunIdempotentResult<T>` carry over unchanged in shape. Its timeout
  mechanism is **two layers, not one**: the existing client-side `Promise.race` (B0E8 — deliberately not a
  Postgres-side `transaction_timeout`, see the design doc's note on why that crashed the process) stays as
  the primary, already-proven-safe enforcement; additionally, `prisma.$transaction(fn, { timeout:
  timeoutSeconds * 1000, maxWait: 10_000 })` must be passed explicitly — **Prisma's own interactive
  transaction defaults to `timeout: 5000`ms, `maxWait: 2000`ms** (confirmed in Prisma 7's own reference
  docs), which would silently cut a transaction short before the `Promise.race` ever fires if left at the
  default, changing behavior for any handler slower than 5s even when `timeoutSeconds` is 30.
- Rate limit's atomic increment must remain a **single round trip** (B0E2) — Prisma's `upsert` with an
  `increment` update compiles to one `INSERT ... ON CONFLICT ... DO UPDATE` on Postgres, same as the
  existing raw SQL; do not replace it with a separate read-then-write. Verify this with the generated SQL
  (e.g. Prisma's query log), not by assumption — if the postgres connector ever needs two round trips here,
  fall back to `$queryRawTyped` with an explicit `ON CONFLICT ... DO UPDATE ... RETURNING count` instead of
  silently accepting a non-atomic version.
- Migration history starts fresh under `prisma/migrations/` (one initial migration creating both tables)
  — do not attempt to reconcile Drizzle's old `apps/api/drizzle/` migration history with Prisma's; delete
  the old folder once the new one is proven equivalent (Task 6). **No real populated database exists for
  this project yet** (local Testcontainers only) — "works on a populated dev DB" is a forward-looking
  guarantee, not something this plan can exercise today. Task 1 documents the baselining procedure
  (`prisma migrate resolve --applied <initial-migration-name>` against a database that already has the
  two tables, e.g. one a developer created by hand before this migration existed) as a written runbook
  step, not an executable test — do not claim it is verified.
- Where the new Prisma schema's nullability differs from the current Drizzle DDL (Task 1, Step 1), that is
  a **deliberate, narrow fix, not scope creep**: `idempotency_keys`/`rate_limit_counters` were created
  nullable-everywhere by an earlier oversight (no `.notNull()` in the original Drizzle schema), every
  existing write path already always supplies these columns, and no real data exists anywhere to be
  broken by tightening them now. Document this explicitly in Task 1 rather than silently matching or
  silently diverging from the old DDL.
- "No behavior change" (above) means: **every existing assertion stays, unweakened.** It does not forbid
  adding new regression tests for Prisma-specific risks this review surfaced (the 5s transaction-timeout
  default, the lock-acquisition race in B0#1's test setup) — those are additions the migration itself
  requires, not scope creep.
- `apps/api/package.json` gets an explicit, ordered setup script covering what a clean checkout needs
  before tests/build can run: start Postgres → `prisma migrate deploy` → `prisma generate --sql` →
  `prisma generate` → run tests. TypedSQL's `--sql` generation step needs a **live** database connection
  to infer result types (confirmed in Prisma's TypedSQL docs) — document this explicitly so a future
  session doesn't try to `generate` without a running DB and get a confusing error. Generated client/SQL
  output (`apps/api/generated/` or wherever `generator client { output = ... }` points) is build output,
  not source — add it to `.gitignore`, do not commit it, regenerate it via the setup script.

## Review Focus

1. The two already-known correctness-critical regression tests — B0#1 (conflict resolves immediately, not
   blocking on a live holder) and Review Focus #1 (handler runs exactly once under genuine concurrency) —
   must still pass unchanged after the port. These are the exact cases Codex's original Drizzle
   implementation got wrong once already; a careless port could silently reintroduce either bug under a
   different client library.
2. The B0E8 timeout test (a handler slower than its configured timeout aborts via `Promise.race` without
   crashing the process) must still pass — confirm no Prisma-side connection-pool error listener gap
   reintroduces the same unhandled-exception failure mode found with `pg.Pool` during the Drizzle version.
3. `schema.prisma`'s column mappings must match the existing Drizzle migrations' table/column
   names and types **except** for the deliberate `NOT NULL` tightening on `key`/`userId`/`endpoint`/
   `status`/`payloadHash` (Global Constraints) — Task 1's own review step diffs the generated SQL and
   confirms every other difference is unintentional and must be fixed.
4. Nothing drizzle-specific (`drizzle-orm`, `drizzle-kit`, `apps/api/drizzle/`) survives in the final
   `package.json`, `pnpm-lock.yaml`, or working tree (Task 6).
5. `AppModule` still does not import the fake `RequestUser` middleware (B0E6) — re-verify this did not
   regress while swapping `DrizzleModule.forRoot()` for `PrismaModule.forRoot()` in `app.module.ts`.
6. The B0#1 test's "live holder" setup actually confirms the holder's advisory lock is acquired before
   `runIdempotent()` is called — not just that the holder transaction has started (gpt-6-astra's review of
   the plan found this exact race in the current Drizzle test; porting it unchanged would carry the race
   into the Prisma version instead of fixing it).
7. A handler that runs longer than Prisma's own interactive-transaction default (`5s`) but shorter than
   `runIdempotent`'s configured `timeoutSeconds` (default `30s`) completes normally — proving the explicit
   `{ timeout, maxWait }` passed to `$transaction` actually overrides Prisma's default rather than the
   default silently winning first.

---

### Task 1: Prisma schema + client module

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma.config.ts` (Prisma 7 moved datasource `url` here — it is **not** set inside
  `schema.prisma`'s `datasource` block anymore; verified against current Prisma 7 docs)
- Create: `apps/api/src/common/db/prisma.module.ts`
- Delete: `apps/api/drizzle.config.ts`
- Create: `apps/api/test/prisma-connectivity.e2e-spec.ts` (replaces `drizzle-connectivity.e2e-spec.ts`,
  same smoke-test intent: resolve the client from a Nest testing module, run one trivial query against
  the Testcontainers Postgres)
- Modify: `apps/api/package.json` (remove `drizzle-orm`, `drizzle-kit`; add `prisma`, `@prisma/client`,
  `@prisma/adapter-pg` pinned `7.10.0`; add a `db:setup` script — see Step 5)
- Modify: `apps/api/.gitignore` (add the `generator client { output = ... }` directory — generated code,
  never committed)

**Interfaces:**
- Produces: `PRISMA_CLIENT` injection token; `PrismaModule.forRoot({ connectionString: string }):
  DynamicModule` registers a `PrismaClient` (constructed with `new PrismaPg({ connectionString })` as its
  adapter) under that token, `global: true` — same shape as the old `DrizzleModule.forRoot()`.

- [ ] **Step 1: Write `schema.prisma`**. `key`, `userId`, `endpoint`, `status`, `payloadHash` are
  **`NOT NULL`** (no `?`) — this is a deliberate, narrow fix over the current Drizzle DDL, which left
  every column nullable by an earlier oversight (Global Constraints explains why this is safe: no real
  data exists anywhere yet). `responseStatus`/`responseBody` stay optional (genuinely unset until a
  request succeeds):
  ```prisma
  generator client {
    provider        = "prisma-client"
    output          = "../src/generated/prisma"
    previewFeatures = ["typedSql"]
  }
  datasource db {
    provider = "postgresql"
  }

  model IdempotencyKey {
    key            String
    userId         String   @map("user_id") @db.Uuid
    endpoint       String
    status         String
    payloadHash    String   @map("payload_hash")
    responseStatus Int?     @map("response_status")
    responseBody   Json?    @map("response_body")
    createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz
    updatedAt      DateTime @default(now()) @map("updated_at") @db.Timestamptz

    @@unique([key, userId, endpoint])
    @@map("idempotency_keys")
  }

  model RateLimitCounter {
    userId      String   @map("user_id") @db.Uuid
    windowStart DateTime @map("window_start") @db.Timestamptz
    count       Int      @default(0)

    @@unique([userId, windowStart])
    @@map("rate_limit_counters")
  }
  ```
  Cross-check every field name/type against `apps/api/src/common/idempotency/idempotency.schema.ts` and
  `apps/api/src/common/rate-limit/rate-limit.schema.ts` (the Drizzle versions, not yet deleted at this
  point) before moving on — every difference from them must be either the deliberate `NOT NULL` tightening
  above or a mistake to fix (Review Focus #3).
- [ ] **Step 2: Write `prisma.config.ts`** at `apps/api/` root:
  ```ts
  import { defineConfig, env } from 'prisma/config';

  export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: { path: 'prisma/migrations' },
    datasource: { url: env('DATABASE_URL') },
  });
  ```
- [ ] **Step 3: Implement `prisma.module.ts`** — `PrismaModule.forRoot({ connectionString })` builds
  `new PrismaPg({ connectionString })` and passes it as the `adapter` option to `new PrismaClient({
  adapter })`, exported under `PRISMA_CLIENT`.
- [ ] **Step 4: Generate the initial migration** — with `DATABASE_URL` pointed at a throwaway local
  Postgres (or the same Testcontainers approach used elsewhere), run
  `pnpm exec prisma migrate dev --name init --create-only`, then diff the generated SQL under
  `prisma/migrations/` against `apps/api/drizzle/0000_rate_limit_counters.sql` and
  `0001_idempotency_keys.sql` — the column list and types must match except the deliberate `NOT NULL`
  tightening (Review Focus #3). Commit the migration folder.
- [ ] **Step 5: Add the setup script and ordering doc.** In `package.json`:
  `"db:setup": "prisma migrate deploy && prisma generate --sql && prisma generate"` (TypedSQL's `--sql`
  generation needs a **live** database connection to infer result types — confirmed in Prisma's own
  TypedSQL docs — so it must run after `migrate deploy`, never before, and never in an environment with
  no reachable Postgres). Add a one-line comment at the top of `prisma.config.ts` stating this exact
  order, so a future session hitting a confusing `generate --sql` failure checks "is the DB running and
  migrated" first. Add the Prisma `generator client { output = ... }` directory to `.gitignore` — it is
  build output, regenerated by `db:setup`, never committed.
- [ ] **Step 6: Document the baseline-an-existing-database runbook** (written guidance, not an executable
  step — no such database exists for this project yet, Global Constraints): a `README` note or a comment
  block in `prisma.config.ts` stating that a database which already has `idempotency_keys`/
  `rate_limit_counters` from the old Drizzle migrations must be baselined with
  `prisma migrate resolve --applied <the Step 4 migration's folder name>` before `prisma migrate deploy`
  will treat it as up to date — never claim this path is tested by this plan.
- [ ] **Step 7: Write the failing test** — `prisma-connectivity.e2e-spec.ts`: boot a Nest testing module
  importing `PrismaModule.forRoot({ connectionString: inject('databaseUrl') })`, resolve `PRISMA_CLIENT`,
  run `prisma.$queryRaw\`SELECT 1 AS ok\`` (or equivalent), assert the result.
- [ ] **Step 8: Wire migrations into the test harness** — update
  `apps/api/test/setup/postgres-global-setup.ts` to run Prisma's migrations instead of Drizzle's
  (`execSync('pnpm exec prisma migrate deploy', { env: { ...process.env, DATABASE_URL: connectionString } })`
  or the programmatic equivalent) before `project.provide('databaseUrl', ...)`. Keep the same B0E5
  guarantee for the empty-test-DB half; the populated-dev-DB half is Step 6's documented runbook, not
  tested here).
- [ ] **Step 9: Run the test to verify it passes** — `pnpm --filter api test:e2e` (expect this one new
  test file to pass; the Drizzle-dependent files will still fail at this point — expected, fixed in later
  tasks).
- [ ] **Step 10: Commit**
  ```bash
  git add apps/api/prisma apps/api/prisma.config.ts apps/api/.gitignore apps/api/src/common/db/prisma.module.ts apps/api/test/prisma-connectivity.e2e-spec.ts apps/api/test/setup/postgres-global-setup.ts apps/api/package.json pnpm-lock.yaml
  git rm apps/api/drizzle.config.ts
  git commit -m "feat(api): add Prisma schema and client module (pinned 7.10.0)"
  ```

---

### Task 2: TypedSQL advisory lock + `runIdempotent` port

**Files:**
- Create: `apps/api/prisma/sql/tryAdvisoryLock.sql`
- Modify: `apps/api/src/common/idempotency/idempotency.service.ts`
- Delete: `apps/api/src/common/idempotency/idempotency.schema.ts`
- Modify: `apps/api/src/common/idempotency/idempotency.service.e2e-spec.ts`

**Interfaces:**
- Consumes: `PRISMA_CLIENT` (Task 1).
- Produces: `runIdempotent<T>(prisma, params, handler, options?): Promise<RunIdempotentResult<T>>`, same
  `RunIdempotentResult<T>` union as the Drizzle version. Callers (the interceptor, Task 3) do not change
  their call sites, only the type of the client they pass in.
- **`lockKeyFor` does not carry over.** The Drizzle version returned a Drizzle-specific `SQL<bigint>`
  fragment object (not a plain value) meant to be spliced into another Drizzle query — there is no Prisma
  equivalent of that fragment type, and re-implementing Postgres's `hashtext()` in JavaScript just to get
  a plain numeric value would risk a silent, hard-to-notice mismatch if the port isn't bit-for-bit
  identical. Instead: the real lock key is computed **only inside `tryAdvisoryLock.sql`** (Step 1), from
  the raw `key`/`userId`/`endpoint` strings; nothing outside that file ever needs the numeric value. The
  test's "simulate an external holder" setup (Step 2) gets the identical key by running the **same**
  `hashtext($1 || ':' || $2 || ':' || $3)::bigint` expression inline, with the same three string inputs —
  since Postgres computes both sides, they are guaranteed to produce the same key without either side
  needing to know the numeric result.

- [ ] **Step 1: Write `tryAdvisoryLock.sql`** using Postgres **positional** parameters — TypedSQL does not
  use JS template-literal interpolation:
  ```sql
  -- prisma/sql/tryAdvisoryLock.sql
  -- @param {String} $1:key
  -- @param {String} $2:userId
  -- @param {String} $3:endpoint
  SELECT pg_try_advisory_xact_lock(hashtext($1 || ':' || $2 || ':' || $3)::bigint) AS locked
  ```
  Run `pnpm exec prisma generate --sql` (needs a live DB per Task 1 Step 5) and confirm the generated
  `tryAdvisoryLock(key, userId, endpoint)` function's parameter order matches the `$1`/`$2`/`$3` order
  written here before moving on.
- [ ] **Step 2: Port the failing tests, fixing the known race while porting — do not port it unchanged.**
  Copy every `it(...)` from the current `idempotency.service.e2e-spec.ts` (same names, same assertions:
  B0#1–B0#4, B0E1, B0E7, B0E8, "Review Focus #1" — Global Constraints: nothing dropped or weakened), with
  these changes:
  - `beforeAll` resolves `PRISMA_CLIENT` via `PrismaModule.forRoot({ connectionString:
    inject('databaseUrl') })`; `db.insert(idempotencyKeys).values(...)` becomes
    `prisma.idempotencyKey.create({ data: {...} })`.
  - **B0#1's "live holder" setup must wait for lock acquisition before calling `runIdempotent`** (Review
    Focus #6 — gpt-6-astra's review of this plan found the current Drizzle test starts the holder
    transaction and calls `runIdempotent` on the next line without confirming the holder's
    `pg_advisory_xact_lock` call actually completed first; porting it as-is could make the test flaky
    under different connection/timing behavior instead of fixing the latent race):
    ```ts
    let lockAcquired!: () => void;
    const lockAcquiredPromise = new Promise<void>((resolve) => { lockAcquired = resolve; });
    let released!: () => void;
    const holding = new Promise<void>((resolve) => { released = resolve; });
    const holderDone = prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(hashtext($1 || ':' || $2 || ':' || $3)::bigint)`,
        key, userId, '/v1/sample',
      );
      lockAcquired();
      await holding;
    });
    await lockAcquiredPromise; // only now is the lock actually held
    const started = Date.now();
    const r = await runIdempotent(prisma, { key, userId, endpoint: '/v1/sample', payloadHash: 'h1' }, async () => ({ status: 200, body: {} }));
    expect(Date.now() - started).toBeLessThan(1000);
    expect(r.kind).toBe('conflict');
    released();
    await holderDone;
    ```
    (Also apply this same fix to the still-live Drizzle version of this test on `main` independently of
    this migration — it is a real, currently-latent bug in shipped test code, not something to leave
    behind once this file is deleted in Step 6.)
  - **Add a new test for Review Focus #7**: a handler that `await`s a `6s` delay (longer than Prisma's
    `5s` transaction default, shorter than `runIdempotent`'s `30s` default) completes with `kind:
    'proceed'`, not a timeout error — proving the explicit `{ timeout, maxWait }` passed to
    `$transaction` in Step 4 actually overrides Prisma's default.
- [ ] **Step 3: Run tests to verify they fail** — expected: FAIL (new `runIdempotent` implementation not
  yet written).
- [ ] **Step 4: Implement `runIdempotent()`** — same algorithm as the Drizzle version, Prisma-flavored:
  1. `const timeout = new Promise<RunIdempotentResult<T>>((_, reject) => setTimeout(() => reject(...),
     timeoutSeconds * 1000));`
  2. `const transaction = prisma.$transaction(async (tx) => { ... }, { timeout: timeoutSeconds * 1000,
     maxWait: 10_000 })` — **the explicit `timeout`/`maxWait` here is required, not optional**: Prisma's
     own interactive-transaction defaults are `timeout: 5000`, `maxWait: 2000` (confirmed in Prisma 7's
     reference docs), which would silently cut the transaction short before `timeoutSeconds` or the
     outer `Promise.race` ever get a say.
     - `const [{ locked }] = await tx.$queryRawTyped(tryAdvisoryLock(key, userId, endpoint));` — not
       `locked` → return `{ kind: 'conflict', retryAfterSeconds: 2 }`.
     - `let row = await tx.idempotencyKey.findFirst({ where: { key, userId, endpoint } });` — same
       branching as the Drizzle version (24h-expiry delete-and-retry via `tx.idempotencyKey.delete(...)`,
       succeeded/failed_permanent replay-or-reject by `payloadHash`, orphaned `in_progress` → update in
       place) using `tx.idempotencyKey.create/update/delete`, never raw SQL for these (they are plain
       CRUD, no locking clause involved).
     - Run `handler()`, then `tx.idempotencyKey.update({ where: {...}, data: { status: 'succeeded',
       responseStatus, responseBody } })`, return `{ kind: 'proceed', ... }`.
  3. `return Promise.race([transaction, timeout]);`
- [ ] **Step 5: Run tests to verify they pass** — expected: PASS, including Review Focus #1/#2/#6/#7 from
  this plan's own Review Focus section (regression tests for bugs already found, twice now).
- [ ] **Step 6: Commit**
  ```bash
  git add apps/api/prisma/sql apps/api/src/common/idempotency/idempotency.service.ts apps/api/src/common/idempotency/idempotency.service.e2e-spec.ts
  git rm apps/api/src/common/idempotency/idempotency.schema.ts
  git commit -m "feat(api): port runIdempotent to Prisma + TypedSQL advisory lock"
  ```

---

### Task 3: Idempotency interceptor — swap injected client

**Files:**
- Modify: `apps/api/src/common/idempotency/idempotency.interceptor.ts`
- Modify: `apps/api/src/common/idempotency/idempotency.interceptor.e2e-spec.ts`

**Interfaces:**
- Consumes: `PRISMA_CLIENT` (Task 1), `runIdempotent()` (Task 2, unchanged shape).
- No change to `@Idempotent()`/`IdempotentOptions` — they carry no DB dependency.

- [ ] **Step 1: Port the failing tests** — same `it(...)` list as today (missing-header 400, replay,
  reject, the custom-`timeoutSeconds` slow-handler test), changing only the test `@Module`'s
  `DrizzleModule.forRoot(...)` import to `PrismaModule.forRoot(...)`.
- [ ] **Step 2: Run tests to verify they fail** — expected: FAIL (interceptor still imports
  `DRIZZLE_DB`/`NodePgDatabase`).
- [ ] **Step 3: Implement** — replace `@Inject(DRIZZLE_DB) private readonly db: NodePgDatabase` with
  `@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient`; replace the `runIdempotent(this.db,
  ...)` call site with `runIdempotent(this.prisma, ...)`. No other logic changes.
- [ ] **Step 4: Run tests to verify they pass** — expected: PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add apps/api/src/common/idempotency/idempotency.interceptor.ts apps/api/src/common/idempotency/idempotency.interceptor.e2e-spec.ts
  git commit -m "feat(api): point IdempotencyInterceptor at PrismaClient"
  ```

---

### Task 4: Rate limit guard port

**Files:**
- Modify: `apps/api/src/common/rate-limit/rate-limit.guard.ts`
- Delete: `apps/api/src/common/rate-limit/rate-limit.schema.ts`
- Modify: `apps/api/src/common/rate-limit/rate-limit.guard.e2e-spec.ts`

**Interfaces:**
- Consumes: `PRISMA_CLIENT` (Task 1). `RateLimitGuard`'s public shape (implements `CanActivate`,
  reads `@RateLimit()` metadata) is unchanged.

- [ ] **Step 1: Port the failing tests** — same two `it(...)` (max-then-429-with-Retry-After, N concurrent
  requests never exceed `max` — Review Focus #4 from the original plan), swapping
  `DrizzleModule.forRoot(...)` for `PrismaModule.forRoot(...)` in the test module.
- [ ] **Step 2: Run tests to verify they fail** — expected: FAIL.
- [ ] **Step 3: Implement.** Replace the raw
  `INSERT ... ON CONFLICT (user_id, window_start) DO UPDATE SET count = count + 1 RETURNING count` with:
  ```ts
  const updated = await this.prisma.rateLimitCounter.upsert({
    where: { userId_windowStart: { userId, windowStart } },
    create: { userId, windowStart, count: 1 },
    update: { count: { increment: 1 } },
  });
  const count = updated.count;
  ```
  Confirm (Global Constraints, B0E2) this still compiles to a single `INSERT ... ON CONFLICT ... DO
  UPDATE` round trip on Postgres under Prisma's postgres connector — if Prisma's `upsert` ever needs two
  round trips for this connector, flag it and fall back to `$queryRawTyped` with an explicit
  `ON CONFLICT ... DO UPDATE ... RETURNING count` instead of silently accepting a non-atomic version.
- [ ] **Step 4: Run tests to verify they pass** — expected: PASS, including the real-concurrency test.
- [ ] **Step 5: Commit**
  ```bash
  git add apps/api/src/common/rate-limit/rate-limit.guard.ts apps/api/src/common/rate-limit/rate-limit.guard.e2e-spec.ts
  git rm apps/api/src/common/rate-limit/rate-limit.schema.ts
  git commit -m "feat(api): port RateLimitGuard's atomic increment to Prisma"
  ```

---

### Task 5: `AppModule` + sample endpoint wiring

**Files:**
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/test/sample.e2e-spec.ts`

**Interfaces:** no change to any controller's public routes or bodies.

- [ ] **Step 1: Port the failing test** — same `it(...)` list in `sample.e2e-spec.ts`, swapping
  `DrizzleModule.forRoot(...)` for `PrismaModule.forRoot(...)` in its own standalone test module (it must
  **not** use the real `AppModule` — same B0E6 reasoning as before, unchanged).
- [ ] **Step 2: Run tests to verify they fail** — expected: FAIL.
- [ ] **Step 3: Implement.** In `app.module.ts`, replace `DrizzleModule.forRoot({ connectionString:
  process.env.DATABASE_URL ?? '' })` with `PrismaModule.forRoot({ connectionString: process.env.DATABASE_URL
  ?? '' })`. Re-read `app.module.ts` in full afterward and confirm the fake `RequestUser` middleware is
  still absent from it (Review Focus #5) — do not reintroduce it while editing this file.
- [ ] **Step 4: Run tests to verify they pass** — expected: PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add apps/api/src/app.module.ts apps/api/test/sample.e2e-spec.ts
  git commit -m "feat(api): wire AppModule to PrismaModule"
  ```

---

### Task 6: Remove Drizzle entirely + full-suite verification

**Files:**
- Delete: `apps/api/drizzle/` (the whole folder — old migration history)
- Modify: `docs/superpowers/specs/2026-10-05-buoc-0-design.md` (B0R2 row, Constraints table: Drizzle →
  Prisma, with a dated note pointing at this plan)
- Modify: `docs/superpowers/plans/2026-10-05-buoc-0-backend-foundation.md` (note at the top of Tasks 3, 7,
  9, 10 that their Drizzle-specific code was superseded by this plan — do not rewrite their history, just
  point forward)

- [ ] **Step 1:** `rg -i drizzle apps/api/src apps/api/test apps/api/package.json pnpm-lock.yaml` — every
  remaining hit must be explainable (e.g. a comment citing history) or removed. (Review Focus #4)
- [ ] **Step 2:** `git rm -r apps/api/drizzle`.
- [ ] **Step 3:** Run `pnpm --filter api build` — Vitest's own transform does not run a full `tsc`
  type-check, so a build pass is the only step in this plan that would catch a type error ported
  incorrectly (e.g. a Prisma generated type mismatch). Must pass with zero errors.
- [ ] **Step 4:** Run `pnpm --filter api test` and `pnpm --filter api test:e2e` **five times in a row** —
  all 5 unit + 25 e2e tests (23 original + the two new regression tests from Task 2, Review Focus #6/#7)
  must pass every time (this plan's whole point is zero behavior change; flaky or failing runs here mean
  a task above ported something incorrectly, not a pre-existing issue).
- [ ] **Step 5:** Update the two doc files per the Files list above.
- [ ] **Step 6: Commit**
  ```bash
  git add docs/superpowers/specs/2026-10-05-buoc-0-design.md docs/superpowers/plans/2026-10-05-buoc-0-backend-foundation.md
  git rm -r apps/api/drizzle
  git commit -m "chore(api): remove Drizzle entirely after the Prisma migration"
  ```

## Self-Review Notes

- **Spec coverage:** every Drizzle-touching file from the original plan (Tasks 3, 7, 8, 9, 10) has a
  corresponding task here (1–5); Task 6 is the cleanup/verification pass the original plan's own Task 10
  Step 5 established as the done-criterion ("test chạy bằng một lệnh").
- **Proportion:** this plan ports existing, already-reviewed test cases rather than re-deriving them —
  each task says "port verbatim, change only the client setup" instead of re-quoting all ~23 tests, to
  keep this plan from becoming a transcript of code that already exists and is already correct.
- **gpt-6-astra reviewed this plan once already (06/10/2026) and found 7 real issues** (wrong Prisma 7
  datasource location, wrong TypedSQL parameter syntax, a missing `previewFeatures` flag, Prisma's
  5s/2s transaction defaults silently overriding `runIdempotent`'s own timeout, a schema-nullability
  mismatch, no baselining path for an existing database, no documented clean-checkout generate order, and
  a genuine lock-acquisition race already latent in the current Drizzle test) — all 7 independently
  verified against the actual migration SQL, the actual test file, and current Prisma 7 docs before being
  folded into this version. None were rejected; all seven are now reflected above.
- **Review Focus:** 7 items (5 original + 2 added from gpt-6-astra's review), each tied to a real,
  previously-found bug (the locking race x2, the connection-crash, the module-boundary/B0E6 leak, the
  transaction-timeout default) or a structural invariant (atomic increment, DDL equivalence) — not
  generic concerns.
