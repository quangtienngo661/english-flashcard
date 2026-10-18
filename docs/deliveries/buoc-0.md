# Bước 0 — as-built (resolved 05–06/10/2026)

All 4 open questions from `docs/HANDOFF_2026-10-05_BUOC_0.md` §5 are chốt and implemented:

1. **Repo layout:** single repo, pnpm workspace (`apps/api` only so far; `apps/web` and `apps/mobile` not
   yet created). No Nx/Turborepo. `git init` done.
2. **ORM / DB access:** **Prisma ORM, pinned `7.10.0`** (`apps/api/prisma/schema.prisma`,
   `apps/api/prisma.config.ts`, `@prisma/adapter-pg`). Originally built on Drizzle (pinned `0.45.3`,
   still intact on `feat/buoc-0-backend-foundation`), migrated to Prisma on `feat/migrate-drizzle-to-prisma`
   once the row-locking mechanism changed to `pg_try_advisory_xact_lock` (a plain function call Prisma's
   TypedSQL handles fine — see the design doc's §2.2 correction note and
   `docs/superpowers/plans/2026-10-06-migrate-drizzle-to-prisma.md`).
3. **Test strategy:** Vitest + ESM (current NestJS CLI default, not Jest), real Postgres via
   `@testcontainers/postgresql` — no mocks.
4. **Step 0 / Step 1 boundary:** `RequestUser` seam implemented
   (`apps/api/src/common/request-user/fake-request-user.middleware.ts`) — test-only, never wired into the
   real `AppModule` (verified repeatedly; this is the B0E6 isolation guarantee).

Implemented and tested: Problem Details (RFC 9457), opaque `page_token` pagination, `Idempotency-Key` via
`runIdempotent()` (advisory-lock based, see `apps/api/src/common/idempotency/idempotency.service.ts`),
`operation_id` + redacting logger, per-user atomic rate limiting, a sample endpoint exercising all of the
above end-to-end. Current state: 5 unit + 24 e2e tests passing on `feat/migrate-drizzle-to-prisma`.
