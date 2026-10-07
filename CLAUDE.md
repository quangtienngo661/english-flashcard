# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Always also check the global CLAUDE.md at `~/.claude/CLAUDE.md` — it defines behavioral rules
(`~/.claude/rules/*.md`) that apply across all projects.

## Overview

English vocabulary learning app (level- and topic-based) for web (Next.js) and mobile (Flutter), with a
single owner/admin authoring and approving content. V1 adds: accounts; a curated catalog plus learners'
private words; quick-add of words encountered elsewhere; word groups, flashcards, and an automatic review
schedule; non-AI definition quizzes; AI-generated fill-in-the-blank practice graded by rule; tier-based
entitlements and quotas.

**Current phase: Bước 0 and Bước 1 (Identity core) implemented.** Real code
is under `apps/api`. Historical implementation branches:
- `feat/buoc-0-backend-foundation` — Bước 0 built on **Drizzle ORM** (10 tasks, 5 unit + 23 e2e tests).
- `feat/migrate-drizzle-to-prisma` (branched from the above) — the same Bước 0 re-implemented on
  **Prisma ORM** (6-task migration, 5 unit + 24 e2e tests). This is the current/preferred ORM — the
  original reason to exclude Prisma (couldn't express row-locking) turned out to be stale once the
  locking mechanism itself changed to `pg_try_advisory_xact_lock`, which Prisma handles fine via TypedSQL.
  See `docs/superpowers/plans/2026-10-06-migrate-drizzle-to-prisma.md` for the full migration and why.

Bước 0, the Bước 1 design and decision record are on `main` (PR #1–#3); Bước 1 implementation is complete
on `feat/buoc-1-identity-impl` (not yet merged/pushed). All 8 V1 specs (docs/specs/) are
written and independently verified; the project owner has said "keep this order, start step 0" (accepting
the plan). Read `docs/HANDOFF_2026-10-05_BUOC_0.md` for the original Bước 0 kickoff context, and
`docs/superpowers/specs/2026-10-05-buoc-0-design.md` (now annotated with the Prisma switch) for the
as-built design.

## Directory Structure

- `docs/specs/` — the accepted V1 specs: `system-spec.md` (cross-module conventions) plus one
  `module-spec-*.md` per module (Identity & Access, Vocabulary Content, Learning, Content Pipeline,
  Entitlements & Usage, AI Integration, Practice). `docs/specs/README.md` is the index and status table.
  `DECISIONS_2026-10-04.md` holds the numbered decisions (K#) specs cite; `SPEC_PLAN_AND_DECISIONS_2026-10-04.md`
  holds the defaults/proposals (F#, N#) and the reasoning behind them.
- `docs/tasks/v1-specs/` — the run data behind the specs: `research.md` (R# findings), `plan.md`,
  `verification-opus.md` / `verification-response.md` (independent-review findings and how each was
  resolved), `citation-sweep.md`.
- `docs/preparation/` — earlier discovery/research (survey, competitor analysis, data/cost/license
  research, architecture pattern research, draft schema/grading/user-flow docs). These are inputs, not
  accepted specs — where they conflict with `docs/specs/` or the HANDOFF file, the newer file wins.

## Working Rules for This Repo

These come directly from the project owner (`docs/HANDOFF_2026-10-05_BUOC_0.md` §3) and are binding until
they say otherwise:

- **No code, no scaffold, no dependency installs** until the owner has approved a design doc and a plan
  for the piece of work in question. Reading and writing docs is fine.
- Use the **superpowers** skill chain (`brainstorming` → `writing-plans` → `test-driven-development`, …)
  for this project's workflow, **not** the harness's own workflows (`build-feature`, `write-spec`,
  `fix-request`, …).
- **No `git init`, no commit, no push** without being explicitly asked — the directory is not yet a git
  repo; `git init` itself is a decision for the owner to make (see the open repo-layout question in
  HANDOFF §5.1).
- Ask open decisions **one question at a time**, each with a concrete proposal and a label: owner-decided
  (chốt) / proposed (đề xuất) / `ASSUMPTION`.
- Reports: short, decision-sufficient, in Vietnamese with English technical terms kept as-is (`endpoint`,
  `deploy`, `rollback`).
- Before asserting a fact about a library or its version, check current docs (context7) or verify by
  running it in-session — do not rely on memory.
- **Any spec or design doc that cites a higher-level rule (system-spec's K#/SR#/S#/SE#) must also write
  its own When → Then edge cases for how its specific tech/scope implements that rule** — citation alone
  hides ambiguity (e.g. what `SKIP LOCKED` returning 0 rows means) and missing cases (e.g. a crash leaving
  an orphaned `in_progress` row) that only surface once you write out the concrete mechanism. See
  `docs/specs/SPEC_WRITING_CONVENTIONS.md`.

## Architecture & Key Decisions (accepted, `docs/specs/system-spec.md`)

Bước 0 (below) is now scaffolded and implemented (see "Bước 0 — as-built" section). Steps 1–8 are still
decided-but-not-scaffolded:

- Backend: **NestJS modular monolith + PostgreSQL**. 7 V1 modules, each owning its own write path:
  Identity & Access, Vocabulary Content, Learning, Content Pipeline, Entitlements & Usage, AI Integration,
  Practice. Cross-module write ownership is mapped in system-spec's "Bản đồ ghi dữ liệu" table.
  Billing Integration is interface-only in V1.
  Clients: Next.js (web) and Flutter (mobile) share the same API.
- **Module boundaries (D3):** each module owns `apps/api/prisma/models/<module>.prisma`; only its code
  queries its tables. Other modules call its exported service. No Prisma `@relation` crosses module
  boundaries; cross-module references are plain UUID columns. Only `src/identity/**` touches Identity
  tables; other modules call `IdentityService`. `src/common/**` never imports from `src/identity/**`.
  This is a review convention, not enforced by tooling.
- Build order is fixed (owner-confirmed, HANDOFF §2): **Step 0** foundation (scaffold, Docker + Postgres,
  Problem Details, pagination, `Idempotency-Key`, IDs, logging, test harness) → 1 Identity core → 2
  Content + Pipeline → 3 Learning (earliest pilot milestone) → 4 Practice non-AI → 5 Entitlements → 6 AI
  Integration gateway → 7 Practice AI + Content AI → 8 Identity remainder (Google login, forgot password,
  account deletion).
- Cross-cutting API conventions (system-spec SR7–SR14): `/v1` prefix, additive-only within v1; errors as
  `application/problem+json` (RFC 9457) with `type, status, title, detail, instance, operation_id`;
  pagination via `page_size` (default 20, max 100) + opaque `page_token`; `Idempotency-Key` scoped to
  (user, endpoint) — same key + same payload replays the stored result, transient failure releases the
  key, in-flight returns 409, different payload is rejected; logs carry `operation_id` and never contain
  passwords/OTP/tokens/raw answers/context sentences; timestamps stored UTC, day boundaries by the user's
  IANA timezone; per-user write rate limiting with 429 + retry-after.
- Background jobs: **BullMQ + Redis, for real background work only** (batch content authoring/import) —
  user-facing flows (question generation, answer grading) call AI directly in-request, not via queue.
- AI access goes through a provider port/adapter (`AiProvider`) so the provider can change later; no
  provider is chosen yet.
- Identity: email+password (self-built) and Google OAuth 2.0; OTP via Google SMTP for email verification
  and password reset only (never for login); per-device logout.
- Entitlements are per-feature (no single `is_pro` flag); entitlement ("allowed at all") is separate from
  quota ("how many uses left"); AI entitlement is checked at content *creation*, not at rule-based grading.

Still open and explicitly **not** blocking Step 0 (HANDOFF §6): AI quota structure (K18, only blocks from
step 5); external dictionary provider (K20); inflected-form/lemma data source (CR16, PRC7); personal-Gmail
SMTP viability; all capacity/cost numbers are estimates.

## Bước 0 — as-built (resolved 05–06/10/2026)

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

## Bước 1 — as-built (07/10/2026)

Design `docs/superpowers/specs/2026-10-07-buoc-1-identity-core-design.md` (D1–D16, criteria `B1#1–B1#38`,
edge cases `B1E1–B1E34`), decisions `docs/superpowers/decisions/2026-10-07-buoc-1-identity-core-decisions.md`,
plan `docs/superpowers/plans/2026-10-07-buoc-1-identity-core.md` (14 tasks), reviews in
`docs/superpowers/reviews/`. Implemented on `feat/buoc-1-identity-impl`:

- `src/common/`: `CommonModule` (global) with `AppConfig`/`loadConfig` (zod, fail-fast), `Clock`/`FakeClock`,
  `AppLogger` (levels, redaction, `operation_id` via AsyncLocalStorage), named-rule `RateLimiter` (fixes the
  Bước 0 shared-counter bug), Problem Details for body-parser errors (400/413/415), `MaintenanceScheduler`
  (hourly cleanup jobs). `configureApp()` is shared by `main.ts` and every e2e test.
- `src/identity/`: register/login with lockout, OTP (verify email, reset password, 24 h lock after 20
  failures), rotating refresh-token session chains (10 s grace, reuse detection, 90/365 d expiry, 10 active
  devices), web cookie + CSRF header, password change/reset, profile + `IdentityService` (the only export),
  staff roles `admin`/`editor` with `@RequirePermission`, `pnpm admin:grant <email>` (needs `pnpm build`).
  Every security write runs under a per-user advisory lock and commits before the HTTP error (design §4b);
  mail is sent after commit and after the response closes.
- Tests: 338 unit + 182 e2e (real Postgres + Mailpit via Testcontainers); suites that depend on global state
  use `createIsolatedDatabase()`. A manual run against the built API (register → OTP from Mailpit → verify
  → refresh → password change → logout → admin:grant → admin endpoint) passed on 07/10.
- Execution: Codex `gpt-6.1-sol` implemented, `gpt-6-astra` (medium effort) reviewed each task; Tasks 13–14
  were self-reviewed by Claude while Codex was over its usage limit (no independent review for those two).

Bước 1 open items: all rate-limit/lockout/budget numbers are `ASSUMPTION` (configurable); same-user lock
contention can exhaust the 10-connection pool (accepted at pilot scale); Gmail-personal SMTP limits still
unsourced; spec updates listed in the design's §11 are not yet applied to `docs/specs/`.

### Open decisions for the next session (read before doing anything else)

Bước 0, the Bước 1 design and decision record are on `main` (PR #1–#3); Bước 1 implementation is complete
on `feat/buoc-1-identity-impl`, awaiting the owner's go-ahead to push and open a PR. The module-boundary convention is chốt as D3
(see Architecture & Key Decisions above).

1. **B0E1 (orphaned `Idempotency-Key` after a crash, treated as a transient failure and retried)** is
   `ASSUMPTION` — not covered by system-spec's own SE2 — needs the owner's explicit confirmation.
2. **This plan's own choices, not yet put to the owner:** `Idempotency-Key` header is mandatory when
   `@Idempotent()` is used (400 if missing); default timeout `30s`, enforced client-side via
   `Promise.race` (deliberately not a Postgres-side timeout — see the design doc's B0E8 note on why that
   crashed the process).
3. **Prisma pinned to `7.10.0`** (exact, no `^`) because the npm `latest` tag currently points at a `8.0.0-rc`
   prerelease — re-check when Prisma 8 reaches a real stable release.

## Local setup (PowerShell)

From the repo root, start the local Postgres and Mailpit services, then prepare the API environment:

```powershell
docker compose up -d
Set-Location apps/api
Copy-Item .env.example .env
node scripts/gen-secret.mjs
```

Replace each secret placeholder in `.env` with a separate output from `node scripts/gen-secret.mjs`.
Keep `k1:` before the JWT secret. Mailpit needs no SMTP credentials; its UI is at
`http://localhost:8025`. Postgres listens on host port **5434** (5432/5433 are used by other local
projects on this machine). Then, from `apps/api`:

```powershell
pnpm db:setup
```

`prisma.config.ts` loads `.env` when it exists. `db:setup` deploys migrations, then runs `prisma generate --sql`, which
emits both the Prisma client and TypedSQL (a second plain `prisma generate` wipes TypedSQL on Linux — seen in CI). The e2e global setup runs the same sequence against
its fresh Testcontainers Postgres database.

## Machine state (verified 2026-10-05–06)

Node 24.11.0, pnpm 11.6.0, Docker client 28.5.1 available. **No `psql`.** Docker daemon confirmed running
(used directly by the Testcontainers-based e2e suite throughout Bước 0's implementation).

## Execution note: Codex review workflow

Bước 0's Prisma migration was executed with Claude writing/reviewing the plan, **Codex (`gpt-6.1-sol`)**
implementing each task, **Codex (`gpt-6-astra`)** reviewing each task's diff before the next one started,
and Claude doing a final independent re-verification (fresh build + test run) at the end. Codex's sandbox
could not reach Docker or the npm registry in this environment — Claude always had to pick up
install/generate/test-run/commit after Codex wrote the files. This combination (Codex implements + reviews
in two different models, Claude verifies with real tool access) is the user's preferred flow for
Codex-delegated implementation work on this project; see `docs/superpowers/plans/2026-10-06-migrate-drizzle-to-prisma.md`
for a concrete example of the loop catching real bugs each round.

## Other Notes

- Spec index and status: `docs/specs/README.md`.
- Spec/design-doc writing convention (edge cases must be derived per-doc, not just cited): `docs/specs/SPEC_WRITING_CONVENTIONS.md`.
- Full project context, product decisions, and evidence log: `docs/preparation/PROJECT_CONTEXT.md`.
- Session handoff / current status (read first): `docs/HANDOFF_2026-10-05_BUOC_0.md`.
- Bước 0 design (as-built, with the Prisma-switch correction note): `docs/superpowers/specs/2026-10-05-buoc-0-design.md`.
- Bước 0 implementation plan (Drizzle, historical — tasks 3/7/9/10 superseded): `docs/superpowers/plans/2026-10-05-buoc-0-backend-foundation.md`.
- Drizzle→Prisma migration plan (current ORM, full rationale + review history): `docs/superpowers/plans/2026-10-06-migrate-drizzle-to-prisma.md`.
