# Bước 5 — Entitlements & Usage Implementation Plan (API only)

> **Status 19/10/2026:** written after the design was approved (D1–D30) and updated after the independent review (D31–D34,
> R1–R25; PR #60 and #61 merged into `dev`). **API only** (D2): no `apps/web`, no `apps/admin` screen, no ad SDK.
> **Execution (D27):** parallel sessions, every task implemented by Claude, one coordinator session; no Codex loop. **Owner
> 19/10/2026: 4–5 sessions at most** → three implementing sessions plus the coordinator, which also runs the gate (4 in all). Who
> does what: "Sessions and tracks". What the coordinator does: "Brief for the coordinator session".
> **Split (design §17.6):** one plan, four milestones. M1–M2 are the core ("5a": plans, ledger, grants, Settings, Practice and the
> limits, read APIs); M3 is billing and email ("5b"); M4 is the gate.
> **Updated 19/10/2026 after the plan review** ([`../reviews/2026-10-19-buoc-5-plan-review.md`](../reviews/2026-10-19-buoc-5-plan-review.md),
> 21 findings; owner: "sửa đi"): every technical fix is in; of the four product questions, Q2 became D37, Q3 became D35 and Q4
> became D36 and Q1 became D38 (all applied below); no question is open — see "Waiting for the owner" after the plan choices. "Plan review #N" in a task points to finding N.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every account has a plan (Free / Trial / Pro) that decides which features it may use and how much; staff grant plans or
custom numbers; AI units are reserved, confirmed or released in a ledger under a per-user quota and a system-wide daily cap; a
provider-neutral billing gateway (with a fake provider) turns signed provider events into Pro; trial and renewal emails go out
through the existing mail budget.

**Architecture:** The placeholder **Entitlements** module (Bước 4) becomes real. It owns six tables plus one table of the fake
provider (`prisma/models/entitlements.prisma`), computes "what this user has now" from subscriptions and grants on every call (no
cache, no counter table: D28), and keeps the ledger as rows counted under advisory locks. Pure rule files (cycles, plan resolution,
the subscription state machine, the grant rules, the event order) carry the logic and are unit-tested by table; thin services do
the SQL. Practice calls it at session start and in its answer transaction; Learning and Content read their limits from Settings;
the hourly `MaintenanceScheduler` runs the billing and email jobs.

**Tech Stack:** unchanged — NestJS `12.1.2`, Prisma `7.10.0` (TypedSQL preview), Postgres 17, Vitest 4, zod `4.6.5`. **No new
dependency.** No backend e2e (Bước 4 D38): unit tests + `pnpm smoke:buoc-5`.

**Spec:** [`docs/superpowers/specs/2026-10-19-buoc-5-entitlements-design.md`](../specs/2026-10-19-buoc-5-entitlements-design.md) —
read the section named in each task. Decisions: [`../decisions/2026-10-19-buoc-5-entitlements-decisions.md`](../decisions/2026-10-19-buoc-5-entitlements-decisions.md).
Design review: [`../reviews/2026-10-19-buoc-5-design-review.md`](../reviews/2026-10-19-buoc-5-design-review.md). A test that proves
a design criterion starts with its `B5#`/`B5E#` (or `D#`/`R#`) and asserts every clause of that criterion's Then; other tests are
named by the behaviour they pin.

**Branches:** this plan lives on `docs/buoc-5-plan`, merged into `dev` before implementation starts (coordinator step 1).
Implementation: four sessions — the owner opens **step-5-coordinator**, which starts **step-5-A**, **step-5-B**, **step-5-C** as its
own side sessions (cross-session `start_session`, owner 19/10/2026) — each in its own git worktree, and one branch per **PR**
(`feat/buoc-5-<pr>`, e.g. `feat/buoc-5-c1`), each PR merged into `dev` once CI is green. A session cuts its next PR branch from
the latest `dev` once its previous PR is merged; if that PR is not merged yet and the next one builds on it, it cuts from the
previous branch and merges `dev` before opening the PR. A PR that waits for another session's PR merges `dev` after that PR is
merged.

## Sessions and tracks (checked 19/10/2026 against each task's Files and Interfaces)

A **track** is a group of tasks and the PRs it opens; a **session** runs several tracks one after another (owner 19/10/2026: 4–5
sessions at most).

| Session | Runs, in order | Starts | Waits for |
|---|---|---|---|
| step-5-A — Foundations, then Practice | Task 4 → **PR C1** (merged first: step-5-B and step-5-C wait for it); 1 → 2 → **PR A1**; 3 → **PR B1**; later 11 → **PR F1** | day one | 11: PR E1 |
| step-5-B — Core | 5 → 6 → **PR C2**; 9 → 10 → **PR E1**; 12 → 13 → 14 → **PR E2** | after PR C1 | 9: PR A1; 12: PR B1, PR D1; 14: PR G1 |
| step-5-C — Billing and email | 7 → 8 → **PR D1**; 15 → 16 → **PR G1**; 17 → 18 → **PR G2**; 19 → **PR H1** | after PR C1 | 17: PR A1; 18: PR C2 |
| step-5-coordinator | merges every PR; then 20 → 21 → **PR Z1** | day one | 20: every other PR merged |

step-5-A is the lightest (four small tasks, then Task 11 once PR E1 is merged); step-5-B and step-5-C carry seven tasks each. If the owner prefers the
gate in its own session, Tasks 20–21 move to a fourth implementing session (5 in all); nothing else changes.

The tracks (the units the dependencies are checked on):

| Track | Tasks, in order | Starts | Waits for |
|---|---|---|---|
| A — Settings and limits | 1 → 2, **PR A1** | day one | nothing |
| B — Identity | 3, **PR B1** | day one | nothing |
| C — Data and rules | 4, **PR C1**; 5 → 6, **PR C2** | day one | nothing |
| D — Billing rules | 7 → 8, **PR D1** | after PR C1 | nothing |
| E — Core services | 9 → 10, **PR E1**; 12 → 13 → 14, **PR E2** | after PR A1 and PR C2 | 12: PR B1, PR D1; 14: PR G1 |
| F — Practice | 11, **PR F1** | after PR E1 | — |
| G — Billing runtime | 15 → 16, **PR G1**; 17 → 18, **PR G2** | after PR D1 | 17: PR A1; 18: PR C2 |
| H — Email | 19, **PR H1** | after PR G2 | — |
| Z — Gate | 20 → 21, **PR Z1** | every PR merged | — |

Why (from the Interfaces blocks):
- **A** touches only `src/settings/**`, the four limit call sites in `src/learning/**` and `src/content/**`, and `content.module.ts`.
- **B** touches only `src/identity/**` (the permission table) and the tests that pin the table.
- **C** adds the schema, the shared types (`entitlements.types.ts`), the constants and the lock helpers in PR C1 (Task 4, small,
  merged first so D can start), then the pure rule files; its rules take plain inputs (`PlanNumbers`, `SubscriptionSource`,
  `GrantSource`), not `AppSettings`, so they need no other track.
- **D** is pure: the state machine, the event order, the normalized event types, the adapter port and registry, and the fake
  provider's signature and normalizer. It reads no table; it needs only C1's shared types.
- **E** needs Settings (A1), the schema and rules (C1); grants (Task 12) need `entitlements.grant` (B1) and the adapter registry
  (D1, for D32's `cancelAtPeriodEnd`); the fake-AI CLI (Task 14) reads `config.billing.fakeEnabled` (G1, Task 15).
- **F** only edits `src/practice/**`, against Task 9's `checkQuota` and `recordPracticeSession`.
- **G** stores, orders and applies events (C1 schema and locks, D1 machine); the applier reads `grace_days` (A1); the time job
  uses `effectiveStatus` (C2).
- **H** sends what G produces (the `trial_started` notice rows) and plans the trial and renewal emails; it reads Settings (A1, merged
  before G2). No cap-alert email any more (D36), so it needs neither E1's `capUsed` nor an Identity admin list.

Files edited by more than one track (one-line conflicts, resolved by hand when merging): `src/entitlements/entitlements.module.ts`
and `src/entitlements/index.ts` (D, E, G, H add providers or exports), `apps/api/package.json` scripts (Tasks 14, 16, 21). Edited
by one track only: `src/common/config/app-config.ts`, `.env.example`, `test/support/test-config.ts`, `src/app.setup.ts` (all
track G); `src/common/mail/**` and `src/notifications/scheduler/**` (track H). **Only Task 4 adds a migration**, so no folder
rename is expected; if another task needs a column, it adds a new migration and follows the rename rule (Global Constraints).

Critical path: Task 4 (step-5-A) → step-5-B (5 → 6 → 9 → 10) → Task 11 (step-5-A) and step-5-B (12 → 13 → 14); Task 4 → step-5-C
(7 → 8 → 15 → … → 19) → Z. Three implementing sessions run at once at most (only step-5-A on day one until PR C1 is merged).

## Brief for the coordinator session (D27)

The coordinator implements no task. It:
1. Commits the docs on `docs/buoc-5-plan` (this plan, `docs/deliveries/buoc-5.md`, the design and decision record updates D35–D38,
   the plan review, `docs/preparation/EARLY_MANUAL_RENEWAL_RESEARCH_2026-10-19.md`, `CLAUDE.md`), pushes, opens a PR into `dev`, merges
   it once CI is green (owner rule 16/10/2026), so every session reads this plan and the design from `dev`. Then it **starts step-5-A**
   as a side session (`start_session`, its own worktree, from `dev`); it starts **step-5-B and step-5-C** once PR C1 is merged. A
   session started this way may still be cut from `main` (seen in Bước 4), so each brief tells it to cut every PR branch from
   `origin/dev`. Side sessions report to the coordinator when they end a turn; the coordinator answers with `SendMessage`.
2. Each implementing session prepares its own worktree and **its own local database** (one Postgres container, service `postgres`, host port 5434): `docker compose -p
   english-learning exec postgres createdb -U dev english_learning_b5_<a|b|c>` — always with `-p english-learning` (the compose file
   sets no `name:`, so from a worktree folder compose would look for another project). In the worktree `apps/api`: `pnpm install`,
   copy `.env` from `.env.example` with fresh secrets (`node scripts/gen-secret.mjs`, CLAUDE.md "Local setup") and `DATABASE_URL`
   pointing at that database, then `pnpm db:setup`. The coordinator checks that each session did this before its first PR.
   Every implementing session follows: "Read Global Constraints and Review Focus first; commit after every task; open each PR when
   its last task is green; never edit a file another track owns except the conflicts listed in Sessions and tracks; when you wait
   for another PR, say so and stop until the coordinator tells you it is merged."
3. Merges each PR when its session reports CI green (the session binds its PR and fixes red CI itself; the coordinator does not poll
   CI), in an order the dependencies allow (C1 first — it is small and unblocks D —, A1, B1; then
   C2, D1; E1, G1; F1, E2, G2; H1; Z1). From the merge of PR F1 until PR Z1 (Task 20), `pnpm smoke:buoc-4` fails on `dev` (its
   learner is Free, 3 sessions a day): say so to any session that runs it meanwhile (plan review #16).
   When a PR touching `entitlements.module.ts` or `index.ts` meets another, it resolves the one-line conflicts and re-runs
   `pnpm build; pnpm test` on the merged result.
4. Tells a waiting session when the PR it waits for is merged, so it merges `dev` and goes on.
5. Answers a track's question only when the plan and design already decide it; a question that changes behaviour goes to the owner
   (owner answers first, Claude proposes after — D1), and the answer is written into the design and decision record before the
   track goes on.
6. Runs track Z (Tasks 20–21) itself once every other PR is merged, then reports to the owner: the PR list, the numbers, both
   smoke outputs, open risks (design §19).

## Verified on 19/10/2026 (`origin/dev` @ `f3e4572`)

| Check | Result |
|---|---|
| Entitlements today | `src/entitlements/entitlements.service.ts`: `type Feature = 'practice.basic'`; `check()` always `{ allowed: true }`; module provides and exports only the service; `index.ts` exports `EntitlementsModule`, `EntitlementsService`, `type Feature`; one spec (`D25`). |
| Practice | `sessions.service.ts`: `start` takes `withPracticeLock` then `assertEntitled` (`:68-69`), closes the open session with `updateMany` (`:95-97`) and creates the new one in the same transaction; `assertEntitled` (`:198-200`) throws 403 `entitlement-required` (`:42-43`); `next` calls it again (`:277`); voiding an item is a separate `updateMany` (`:314`). `answers.service.ts`: `writeFinal(tx, item, final)` (`:112-121`) is the only place a final result is written (answer `:78`, skip `:92`) and writes `local_date` in the profile zone; `locked()` takes the session row then the item row `FOR UPDATE` (`:141-153`). No Practice spec fakes `EntitlementsService` today. |
| Limits | `GROUPS_MAX`/`GROUP_ITEMS_MAX` (`learning.constants.ts:6-7`) used at `groups.service.ts:49` (409 `group-limit-reached`), `items.service.ts:63` (409 `group-full`), `:83` (bulk free slots); `PRIVATE_WORDS_MAX`/`SENTENCES_PER_SENSE_MAX` (`content.constants.ts:30,34`) at `private-words.service.ts:134` and `sentences.service.ts:38`; `content/index.ts:3` re-exports the two Content constants and nothing imports them. Learning already injects `SettingsService`; `ContentModule` imports only `IdentityModule` (`content.module.ts:30`) and `SettingsModule` imports only `IdentityModule`, so Content importing Settings makes no cycle. |
| Settings | Sections `reminders`, `learning`, `practice` (`settings.definitions.ts:4-18`); key list `FIELDS` (`:89-106`); `toApiValues` builds a fixed object of sections (`:113`); nullable keys = `.nullable()` + `nullable: true` in bounds; one cross-field list (`:131-138`); history rows store `null` as `Prisma.JsonNull` (`settings.service.ts`). |
| Identity | `Permission` union and `ROLE_PERMISSIONS` (`identity.types.ts:4-11`), pinned literally by `identity.types.spec.ts:5-11` and the profile/permission specs; `Profile` has `staff_role` and a NOT NULL `timezone` (`identity.prisma:7`), so "no zone → UTC" (design §12.1) only applies when the profile is missing; `verifiedEmails` (`identity.service.ts:79-86`). `apps/admin` types permissions as a cast that already lacks `settings.manage` (`session-store.ts:5`), so a new permission string is harmless there. |
| Mail | `MailBudget.tryConsume({ ceiling })` increments only below `floor(ceiling × budget)` in one statement; `REMINDER_MAIL_SHARE = 0.8` (`mail-budget.service.ts:10`); `Mailer.send({ to, subject, text })`; reminders keep a delivery row (`sending`/`sent`/`failed`) and classify send errors with `classifyMailError` (`notifications/scheduler/mail-error.ts`). |
| Jobs | `MaintenanceScheduler.register(name, job)`, hourly in the API process; its comment assumes concurrent runs are harmless (`maintenance.scheduler.ts:10-14`), so every new job that sends or changes state claims rows with `FOR UPDATE SKIP LOCKED`. `pnpm maintenance:run` runs every job once (`src/cli/run-maintenance.ts`); the smoke uses it. |
| HTTP | `NestFactory.create(…, { bodyParser: false })` (`main.ts`); `app.useBodyParser('json', { limit: '100kb' })` (`app.setup.ts:10`); body-parser's 413 maps to `payload-too-large` (`problem-details.filter.ts:55-56`). Routes are authenticated unless `@Public()` (`identity/sessions/public.decorator.ts`). Controller unit tests run `createTestApp` with a mocked Prisma and supertest (`profile.controller.spec.ts`); `listRoutes` reads each route's permissions (`test/support/list-routes.ts`). `ProblemDetailsException` takes `retryAfterSeconds`. Post-response work: `MailDispatcher.afterResponse(res, jobs)` + drain on shutdown (`mail-dispatcher.service.ts:25-46`). |
| SQL idioms | Advisory lock = `pg_advisory_xact_lock(hashtextextended(key, 0))` (`practice-lock.ts:8`); `INSERT … ON CONFLICT DO NOTHING` in raw SQL (`entries.service.ts:49,58`); partial unique indexes and CHECKs live only in migrations and `prisma migrate diff` in CI (`ci.yml:56`) passes with them (`learning.prisma:51`, `practice.prisma:2`). Pagination: `encodePageToken`/`decodePageToken`, bound tokens `encodeBoundToken` (`page-token.util.ts`). |
| Config | The env schema has **no production flag** (`app-config.ts`), so R17 needs one (Task 15 adds `BILLING_PRODUCTION`). `user.write` = 30 per 60 s per user (`app-config.ts:98`). |
| Smoke | `scripts/smoke-buoc-4.mjs` (520 lines) has `api` (waits out 429), `want`, `wantProblem`, `psql` (`docker compose -p english-learning exec -T postgres psql`), `registerAdmin`, `registerLearner`, `otpCodeFor` (Mailpit); it opens far more than 3 sessions a day for one learner, so it breaks once Free is limited (R5). |
| Body parsers | Installed `body-parser@2.3.0` (Express 5 under `@nestjs/platform-express` 12) skips a request whose body was already read: `read.js:40-44` checks `onFinished.isFinished(req)` (not `req._body`, which is 1.x). So a raw parser registered first reads the webhook body and the JSON parser after it does nothing. `useBodyParser(parser, options)` passes `options` (a function `type` included) to `express[parser]` (`express-adapter.js:252-256`); an oversized body becomes 413 `payload-too-large` (`problem-details.filter.ts:53-55`). Task 16's first test still proves it end to end. |
| DB pool | `PrismaPg({ connectionString })` (`prisma.module.ts:21`) builds a `pg.Pool` with the default `max` 10 (`pg-pool/index.js:89`) and no connection timeout (`:206`). `SettingsService.get()` and `IdentityService.getProfile()` use the shared client, not a `tx` (`settings.service.ts:41`, `identity.service.ts:53`). Hence the "no second connection inside a locked transaction" rule (Global Constraints). |
| **Not verified** | The cost of the global `entitlements.ai_daily` lock under load (not measured, design §19). |

## Global Constraints

- Paths are under `apps/api/` unless they start with `docs/`. Commands run from `apps/api/` in **PowerShell**; Docker Desktop must
  be running. No task edits `apps/web` or `apps/admin`.
- API conventions as Bước 4: ESM imports end in `.js`; JSON `snake_case`; routes under `/v1`; `z.strictObject` bound with
  `@Body({ schema })`/`@Query({ schema })`/`@Param({ schema })`; ids are lower-cased uuids; bad input is 400 `validation-failed`,
  never 500. Times in responses are ISO-8601 UTC strings; dates `YYYY-MM-DD`.
- **Module boundaries (D3):** new model file `prisma/models/entitlements.prisma`; Entitlements imports Identity only through
  `IdentityService`, Settings only through `src/settings/index.ts`; Practice imports Entitlements only through
  `src/entitlements/index.ts`; **Entitlements imports neither Practice, Learning nor Content** (R15); no Prisma `@relation` across
  modules; cross-module references are plain uuid columns.
- **Problem slugs (design §12.5):** 403 `entitlement-required` (refusal `plan-required`), 403 `quota-exhausted` (extension
  `resets_at`), 503 `ai-unavailable` (`Retry-After` when the cap is hit; none when the switch is off), 409 `grant-not-allowed`
  (extension `reason`: `target-is-staff` | `self-grant` | `ai-limits-admin-only` | `target-is-admin` |
  `target-has-paid-subscription`), 409 `grant-not-active`, 400 `validation-failed`, 404 `not-found`, 403 `forbidden`, 429
  `rate-limited`, 413 `payload-too-large`. Refusals reach HTTP only through `refusalProblem()` (Task 9).
- **Lock order (avoids deadlocks):** inside one transaction, never backwards —
  (1) `billing_events` row `FOR UPDATE SKIP LOCKED` (applier only) → (2) `entitlements.user:<userId>` (applier, grant create and
  revoke) → (3) `subscriptions` row `FOR UPDATE`. Ledger: (a) `entitlements.pool:<userId>:<pool>` → (b) `entitlements.ai_daily`
  (AI pools only). Practice keeps its own order (practice lock → session rows → item rows) and calls Entitlements only for reads
  and the `recordPracticeSession` insert, which takes no lock. Jobs claim rows with `FOR UPDATE SKIP LOCKED` and take no advisory
  lock. **Never call an adapter or send mail while holding a lock** (R6): adapter calls (`fetchState`, `endTrialNow`,
  `cancelAtPeriodEnd`) and sends run after the transaction commits. A route with `@Idempotent()` is still inside the
  interceptor's open transaction (30 s, `idempotency.service.ts:18, 30, 68`) when its handler calls an adapter, so every adapter
  call is bounded by `BILLING_ADAPTER_TIMEOUT_MS` and a timeout counts as "not supported" / "fetch failed", never a throw.
- **No second connection inside a locked transaction** (connection pool = 10, `pg-pool` default; `prisma.module.ts:21`): a
  transaction that holds an Entitlements lock (`lockUser`, `lockPool`, `lockAiDaily`) runs every query through its `tx`.
  Settings, profiles and anything read through the shared client (`SettingsService.get()`, `IdentityService.getProfile()`) are
  read **before** the transaction opens. Otherwise ten callers waiting on the same lock hold all ten connections while the holder
  waits for an eleventh (plan review #2).
- **Fixed numbers (design §13 "cố định trong code", all `ASSUMPTION`)** live in `src/entitlements/entitlements.constants.ts` (Task 4):
  `RESERVATION_TTL_MS = 120_000`, `AI_DAY_ZONE = 'Asia/Ho_Chi_Minh'`, `BILLING_MAX_ATTEMPTS = 5`, `BILLING_PENDING_RETRY_MS =
  300_000`, `RAW_PAYLOAD_RETENTION_DAYS = 90`, `WEBHOOK_BODY_LIMIT = '64kb'`, `GRANT_START_SKEW_MS = 300_000`, `GRANT_REASON_MAX =
  300`, `BILLING_ADAPTER_TIMEOUT_MS = 5_000`; `PAYMENT_MAIL_SHARE = 0.95` sits
  next to `REMINDER_MAIL_SHARE` (Task 19).
  Every other number comes from `SettingsService.get().entitlements` (Task 1) — never a literal.
- **Privacy (SR10):** logs carry ids, `operation_id`, types and states only — never an email, a card fingerprint, a payload or
  `raw_payload`, a grant `reason`, or a signature. The logger only masks keys matching `password|otp|code|token|cookie|
  authorization|answer|contextSentence` (`app-logger.ts:16`), so a field named `email`, `reason` or `fingerprint` is written as
  is: never pass one. Tasks 12, 16, 17 and 19 each have a `B5E62` test on the captured log entries.
- **Time:** `Clock.now()` only. A learner's "today" = `localDate(profile.timezone, now)`; the cap's day = `localDate(AI_DAY_ZONE,
  now)`; AI cycles are computed in UTC from the anchor (Task 5).
- **Writes:** `POST /v1/admin/entitlements/grants` carries `@Idempotent()` + `IdempotencyInterceptor`; revoke and the date change
  (`PATCH …/grants/{id}`, D38) are idempotent by their own state; all three carry `@RateLimit('user.write')`. The webhook has no user and no rate limit; the signature is checked first.
- **Tests:** unit `*.spec.ts` next to the code (`pnpm test <path>`); pure rule files are tested by table, one `it` per row of the
  design table they implement. Services that are mostly SQL get a thin spec on their decisions and are proven by the smoke (design
  §19: mocks cannot catch SQL errors). Test zones as Bước 3/4: `Asia/Ho_Chi_Minh`, `Pacific/Kiritimati`, `Etc/GMT+12`.
- **Before a PR:** `pnpm lint; pnpm exec tsc --noEmit -p tsconfig.json; pnpm build; pnpm test`; with a migration also
  `pnpm db:setup; pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma --exit-code --script` (CI's drift check).
- **Migrations on parallel tracks:** before a track's PR merges, any new migration folder is renamed to a timestamp later than the
  newest on `dev`; the track then drops and recreates its own database before `pnpm db:setup`.
- **Git:** commit after every task on the track branch, Conventional Commits (`feat(entitlements): …`, lower case, imperative)
  ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push and open a PR into `dev` without asking; merge once CI
  is green; never `main`. Scan for secrets before every push (the fake secret in `.env.example` is a placeholder).

**Plan choices** (not fixed by the design; written into the design as-built by Task 21):
1. `BILLING_PRODUCTION=true|false` (default `false`) tells the API it is production (R17); `true` together with
   `BILLING_FAKE_ENABLED=true` is a config error.
2. Practice calls `recordPracticeSession` on **every** final write; `ON CONFLICT DO NOTHING` keeps the first, which is exactly
   "the first final result of the session" (design §4) without Practice counting items.
3. Three columns beyond design §6: `subscriptions.current_transaction_id` (which transaction paid the current period, for D34's
   "refund of the current period"), `billing_events.external_subscription_id` and `billing_events.app_user_id` (the raw user id of
   the event, so `user_id` keeps the design's meaning "recognised user"); and the fake provider's own table
   `fake_billing_subscriptions` (design 9.1).
4. The webhook reads its raw body through a route-scoped raw parser registered before the JSON parser (Task 16).
5. `entitlements:fake-ai` is a CLI that boots the Nest application context and calls `EntitlementsService` against the real
   database (like `maintenance:run`); no test endpoint is opened (design 9.1 spirit).
6. `classifyMailError` moves from `src/notifications/scheduler/` to `src/common/mail/` so Entitlements can use it without importing
   Notifications (Task 19).
7. ~~AI cap alerts are created by the hourly email job~~ — **removed by D36**: no cap-alert email; `GET /v1/admin/entitlements/ai-usage`
   returns `alert_reached`, computed when read, and the admin screen (UI round) turns yellow.

**Waiting for the owner** (plan review, "Câu cần chủ dự án quyết"; the owner answers first, Claude proposes after — D1). All four are
decided (19/10/2026) and written into the design, the decision record and the tasks:
- ~~**Q1**~~ **decided → D38**: staff change the dates of an existing grant (new `PATCH` route, with a change history) instead of
  creating a follow-on grant; a new Pro grant whose `starts_at` is in the future revokes nothing (only a grant that starts now
  replaces the active one, D32). Already applied to Tasks 4, 6, 12, 13, 21.
- ~~**Q2**~~ **decided 19/10/2026 → D37**: adapters must send the transaction id of every charge (`subscription_started` without a
  trial, `plan_changed` with an immediate charge, `renewed`); a refund while `current_transaction_id` is still null is only recorded
  and logged, never a cut. Already applied to Tasks 7, 8, 17 (and Task 21's B5#33, below).
- ~~**Q3**~~ **decided 19/10/2026 → D35**: only auto-renewing subscriptions; the "app renewal" model (the user pays each period by
  hand) is gone from the core. Already applied to Tasks 1, 4, 6, 7, 8, 9, 12, 16, 17, 18, 19 (no `payment_succeeded`, no
  `subscriptions.renewal`, no `app:<user_id>`, no `expiry_notice`).
- ~~**Q4**~~ **decided 19/10/2026 → D36**: no cap-alert email at all; `ai-usage` returns `alert_reached` for the admin screen to turn
  yellow (UI round). Already applied to Tasks 3, 4, 13, 19, 21 (no `adminRecipients`, no `ai_cap_alert` notice).

## Review Focus

1. **The last unit under concurrency** — ten parallel `reserve` calls when one unit is left for a user (B5E1), or one unit is left
   in the system cap across users (B5E11), and a session start racing the first answer of the previous session (B5E73) — must give
   exactly one success and never a fourth session. Unit tests cannot show this (no backend e2e): Task 21 runs each race with 10
   parallel requests; Tasks 10 and 11 pin the lock order and the call order.
2. **Provider events replayed, late or out of order** — the same event twice, an old `expired` after a newer `renewed`, a refund
   of a transaction that is not the current period (Apple upgrade), `renewed` after the job already wrote `expired` — must converge
   on the provider's truth; Tasks 7, 16, 17 (B5E42, B5E43, B5E66, B5E87).
3. **Calendar edges** — anchors on the 29th–31st, a leap day, 23:59/00:01 around Vietnam midnight for the cap, learners in
   `Pacific/Kiritimati` and `Etc/GMT+12`, a DST zone on its change day — cycles and `resets_at` stay right; Task 5 (and Task 9 for
   `resets_at`).
4. **Staff mistakes** — an editor granting to themselves, an admin, another editor, setting or revoking AI numbers; a grant for a
   paying user without the confirmation flag; `starts_at` six minutes in the past; `ends_at` before `starts_at`; limits of 0 or
   above range — refused with the right reason and nothing saved; Task 12 (B5E33–B5E36, B5E79, B5E82–B5E85).
5. **Missing or wrong provider data** — an event with missing fields, `fetchState` off or failing, a subscription past its period
   with no event (D31), an unknown `app_user_id`, a `sandbox` event on production — never a crash, never a silent Pro forever;
   Tasks 17, 18 (B5E45, B5E67, B5E68, B5E72).

---

# Milestone M1 — Foundations (tracks A, B, C, D)

### Task 1: Settings — the `entitlements` and `content` groups, two `learning` limits (track A)

Design §13. **Files:** Modify `src/settings/settings.definitions.ts`, `src/settings/settings.definitions.spec.ts`.

**Interfaces:**
- Produces `AppSettings.entitlements` (stored camelCase ↔ API snake_case; default; bounds):

  | Stored | API key | Default | Bounds |
  |---|---|---|---|
  | `freePracticeSessionsPerDay` | `free_practice_sessions_per_day` | 3 | 1–50 |
  | `proPracticeSessionsPerDay` | `pro_practice_sessions_per_day` | 30 | 1–200 |
  | `proAiPracticePerCycle` / `proAiLookupPerCycle` | `pro_ai_practice_per_cycle` / `pro_ai_lookup_per_cycle` | 300 / 100 | 0–5000 |
  | `trialAiPracticePerCycle` / `trialAiLookupPerCycle` | `trial_ai_practice_per_cycle` / `trial_ai_lookup_per_cycle` | 300 / 100 | 0–5000 |
  | `graceDays` | `grace_days` | 7 | 0–16 |
  | `trialReminderDaysBefore` | `trial_reminder_days_before` | 2 | 1–6 |
  | `renewalNoticeDaysBefore` | `renewal_notice_days_before` | `null` | 1–30, nullable |
  | `aiEnabled` | `ai_enabled` | `true` | boolean |
  | `aiDailyCap` | `ai_daily_cap` | 1000 | 0–100000 |
  | `aiCapAlertPercent` | `ai_cap_alert_percent` | 75 | 50–95, nullable |
  | `adsEnabled` | `ads_enabled` | `false` | boolean |
  | `adsInterstitialPerDay` | `ads_interstitial_per_day` | 3 | 0–20 |
  | `adsMinIntervalMinutes` | `ads_min_interval_minutes` | 10 | 1–240 |

- `AppSettings.learning` gains `groupsPerUser` (`groups_per_user`, 100, 10–1000) and `itemsPerGroup` (`items_per_group`, 2000,
  100–10000). New `AppSettings.content = { privateWordsPerUser: number; sentencesPerSense: number }` (`private_words_per_user`
  10000, 1000–100000; `sentences_per_sense` 20, 5–100). `toApiValues` returns all five sections; `settingsValuesPatchSchema`
  accepts the two new groups (each optional, strict). New cross-field rule, violation text
  `values.entitlements.pro_practice_sessions_per_day: Expected at least free_practice_sessions_per_day`. (`expiry_notice_days_before`
  is not added: D35 removed the "app renewal" email it served; 15 keys.)

- [ ] **Step 1: Failing tests** in `settings.definitions.spec.ts`: `D18: defaults are 3, 30, 300, 100, 300, 100, 7, 2, null, true,
  1000, 75, false, 3, 10; learning 100/2000; content 10000/20`; `withDefaults fills the new keys for JSON stored before Bước 5 and
  keeps a stored null for the two nullable keys`; `toApiValues names every new key in snake_case`; table-driven `patch schema
  rejects min − 1 and max + 1 for every new numeric key`, `accepts null only for renewal_notice_days_before and
  ai_cap_alert_percent`, `rejects a non-boolean ai_enabled`; `crossFieldViolations: pro 2 with free 3 →
  the violation; pro 3 with free 3 → none`; `changedFields reports entitlements.ai_enabled true → false`.
- [ ] **Step 2:** `pnpm test src/settings` → FAIL.
- [ ] **Step 3: Implement** per the interfaces (extend `FIELDS`, the bounds, the schema, the cross-field list).
- [ ] **Step 4:** Re-run → PASS; `pnpm exec tsc --noEmit -p tsconfig.json`.
- [ ] **Step 5: Commit** `feat(settings): add the entitlements and content settings`.

### Task 2: Learning and Content read their limits from Settings (track A)

Design §13 (last paragraph), D17, B5E64. **Files:** Modify `src/learning/groups/groups.service.ts`, `src/learning/items/items.service.ts`,
`src/learning/learning.constants.ts` (drop `GROUPS_MAX`, `GROUP_ITEMS_MAX`), `src/content/private/private-words.service.ts`,
`src/content/sentences/sentences.service.ts`, `src/content/content.constants.ts` (drop `PRIVATE_WORDS_MAX`,
`SENTENCES_PER_SENSE_MAX`), `src/content/index.ts` (drop their re-export), `src/content/content.module.ts` (import `SettingsModule`).
Create `groups.service.spec.ts`, `items.service.spec.ts`, `private-words.service.spec.ts`, `sentences.service.spec.ts` next to
each service.

**Interfaces:**
- Consumes `SettingsService.get()` → `learning.groupsPerUser`, `learning.itemsPerGroup`, `content.privateWordsPerUser`,
  `content.sentencesPerSense` (Task 1). `GroupsService`, `ItemsService` (two call sites: `linkInTx`, `bulkAdd`),
  `PrivateWordsService` and `SentencesService` gain `SettingsService` as a
  constructor dependency. Read the setting **before** the count, outside the advisory lock where the method owns the
  transaction (`create`, `bulkAdd`); inside `linkInTx`, `createPrivateSense`, `addSentence` read it at the top of the method.
- Errors unchanged: 409 `group-limit-reached`, 409 `group-full`, `PrivateWordLimitError`, `SentenceLimitError`. Existing rows above a
  lowered limit stay (only new adds are refused).

- [ ] **Step 1: Failing tests** with a fake transaction client whose `count` returns N and a stub `SettingsService`: for each of the
  four call sites, `B5E64: count = limit → refused; count = limit − 1 → passes the check` with limits taken from the stub (e.g.
  `groupsPerUser: 2`, not 100), and for `bulkAdd` `free slots = itemsPerGroup − count`.
- [ ] **Step 2:** `pnpm test src/learning src/content` → FAIL.
- [ ] **Step 3: Implement**; delete the four constants and the `index.ts` re-export (nothing imports them).
- [ ] **Step 4:** Re-run → PASS; `pnpm build`.
- [ ] **Step 5: Commit** `feat(learning,content): read group, word and sentence limits from settings`. Open **PR A1** (Tasks 1–2).

### Task 3: Identity — the `entitlements.grant` permission (track B)

Design §4 Identity row, §10, R20. **Files:** Modify `src/identity/identity.types.ts`, `src/identity/identity.types.spec.ts`, and
every spec that pins the permission lists (`profile.controller.spec.ts`, `permission.guard.spec.ts`, `identity.module.spec.ts`,
`test/support/list-routes.spec.ts` if it asserts a list).

**Interfaces:**
- Produces `Permission` += `'entitlements.grant'`; `ROLE_PERMISSIONS.admin` = the current six + `'entitlements.grant'` (last);
  `ROLE_PERMISSIONS.editor` = the current four + `'entitlements.grant'`. No `ai.settings` (⚠8).
- No admin e-mail list: it only served the cap-alert email, which D36 removed.

- [ ] **Step 1: Failing tests:** `identity.types.spec`: `D6: admin and editor both have entitlements.grant; learners have none`
  (update the literal lists).
- [ ] **Step 2:** `pnpm test src/identity test/support` → FAIL.
- [ ] **Step 3: Implement**; update the other pinned lists.
- [ ] **Step 4:** Re-run → PASS.
- [ ] **Step 5: Commit** `feat(identity): add the entitlements.grant permission`. Open **PR B1**.

### Task 4: Entitlements schema, migration and constants (track C)

Design §6 (+ plan choice 3). **Files:** Create `prisma/models/entitlements.prisma`, `prisma/migrations/<ts>_entitlements/migration.sql`,
`src/entitlements/entitlements.constants.ts`, `src/entitlements/entitlements.types.ts`, `src/entitlements/entitlements.locks.ts`,
`entitlements.locks.spec.ts`.

**Interfaces** (Prisma models, camelCase fields with `@map` to the snake_case columns; every `user_id` a plain `@db.Uuid`; times
`@db.Timestamptz`; dates `@db.Date`):
- `EntitlementGrant` → `entitlement_grants`: `id`, `userId`, `kind` (`plan`|`limits`), `plan` (`pro`|null), `limits` (Json|null:
  keys `practice_sessions_per_day`, `ai_practice_per_cycle`, `ai_lookup_per_cycle`), `startsAt`, `endsAt`, `reason`, `grantedBy`,
  `grantedByRole` (`admin`|`editor`), `revokedAt?`, `revokedBy?`, `revokeReason?`, `paidRenewalAction?`
  (`turned_off`|`not_supported`), `createdAt`. CHECKs: `ends_at > starts_at`; `kind = 'plan'` ⇔ `plan = 'pro' AND limits IS NULL`;
  `kind = 'limits'` ⇔ `plan IS NULL AND limits IS NOT NULL`. Indexes `(user_id, ends_at)`, `(granted_by, created_at)`.
- `EntitlementGrantChange` → `entitlement_grant_changes` (D38): `id`, `grantId` (`@relation` to `EntitlementGrant`, same module),
  `changedBy`, `changedByRole` (`admin`|`editor`), `oldStartsAt`, `newStartsAt`, `oldEndsAt`, `newEndsAt`, `reason`, `createdAt`.
  Index `(grant_id, created_at)`.
- `Subscription` → `subscriptions`: `id`, `userId`, `provider`, `environment` (`sandbox`|`production`), `externalSubscriptionId`,
  `interval` (`month`|`year`), `status` (`trialing`|`active`|`grace`|`on_hold`|`expired`|`revoked`) (no `renewal` column: every
  subscription renews automatically, D35),
  `trialEndsAt?`, `trialDenied` (default false), `paymentFingerprint?`, `currentPeriodStart?`, `currentPeriodEnd?`, `graceEndsAt?`,
  `cancelAtPeriodEnd` (default false), `pendingInterval?`, `quotaAnchorAt?`, `currentTransactionId?`, `lastEventAt?`, `createdAt`,
  `updatedAt`. Unique `(provider, environment, external_subscription_id)`; index `(user_id, status)`, `(status, current_period_end)`.
- `BillingEvent` → `billing_events`: `id`, `provider`, `environment`, `dedupeKey` (unique), `externalEventId`,
  `externalSubscriptionId?`, `type`, `kind` (`state`|`additive`), `transactionId?`, `occurredAt`, `receivedAt`, `appUserId?`
  (`@db.Uuid`; the event's `app_user_id` when it is a lower-case uuid, else null), `userId?` (set by the applier once the user is
  recognised, design §6), `subscriptionId?`, `payload?` (Json; **null when a §9.3 field is missing**, the applier's signal for
  "missing fields"), `rawPayload?` (Json), `status` (`pending`|`applied`|`stale`|`ignored`|`failed`), `error?`, `attempts` (default
  0), `processedAt?`. Index `(status, received_at)`, `(provider, environment, transaction_id)`.
- `TrialHistory` → `trial_history`: `id`, `userId` (unique), `provider`, `paymentFingerprint?`, `startedAt`; partial unique
  `(provider, payment_fingerprint) WHERE payment_fingerprint IS NOT NULL` (migration only).
- `UsageRecord` → `usage_records`: `id`, `userId`, `pool` (`practice_sessions`|`ai_practice`|`ai_lookup`), `operationId`, `kind`
  (`use`|`credit`), `status` (`reserved`|`confirmed`|`released`; a `credit` row is `confirmed`), `releaseReason?`
  (`caller`|`expired`|`late-confirm-free`), `localDate?`, `systemDate?`, `reservedAt?`, `expiresAt?`, `confirmedAt?`, `releasedAt?`,
  `creditedAt?`, `note?`, `createdAt`. Migration-only partial uniques: `(user_id, pool, operation_id) WHERE kind = 'use' AND status
  IN ('reserved','confirmed')` and `(user_id, pool, operation_id) WHERE kind = 'credit'`; indexes `(user_id, pool, confirmed_at)`,
  `(pool, system_date)`, `(status, expires_at) WHERE status = 'reserved'`.
- `EntitlementNotice` → `entitlement_notices`: `id`, `userId?`, `recipientUserId`, `kind`
  (`trial_started`|`trial_reminder`|`renewal_notice`), `subjectKey`, `periodKey`, `state`
  (`pending`|`sending`|`sent`|`failed`|`skipped`), `dueAt`, `windowEndsAt`, `attempts` (default 0), `lastErrorAt?`, `sentAt?`. Unique
  `(kind, subject_key, period_key, recipient_user_id)`; index `(state, due_at)`.
- `FakeBillingSubscription` → `fake_billing_subscriptions` (the fake provider's own state, design 9.1): `externalSubscriptionId`
  (id), `userId`, `status`, `interval`, `currentPeriodStart?`, `currentPeriodEnd?`, `trialEndsAt?`, `cancelAtPeriodEnd`,
  `lastOccurredAt`, `endTrialCalledAt?`, `cancelCalledAt?`, `updatedAt`.
- CHECKs on every enum column (precedent `practice.prisma:2`). `entitlements.constants.ts` holds the fixed numbers of Global
  Constraints.
- `entitlements.types.ts` (shared by tracks C, D, E, G, H): `Pool = 'practice_sessions' | 'ai_practice' | 'ai_lookup'`;
  `AiPool = Exclude<Pool, 'practice_sessions'>`; `LimitKey = 'practice_sessions_per_day' | 'ai_practice_per_cycle' |
  'ai_lookup_per_cycle'` with `POOL_OF_LIMIT: Record<LimitKey, Pool>`; `SubscriptionStatus = 'trialing' | 'active' | 'grace' |
  'on_hold' | 'expired' | 'revoked'`; `Interval = 'month' | 'year'`; `BillingEnvironment = 'sandbox' | 'production'`;
  `NoticeKind = 'trial_started' | 'trial_reminder' | 'renewal_notice'`.
- `entitlements.locks.ts`: `lockUser(tx, userId)`, `lockPool(tx, userId, pool)`, `lockAiDaily(tx)` — `pg_advisory_xact_lock(
  hashtextextended(key, 0))` with keys `entitlements.user:<id>`, `entitlements.pool:<id>:<pool>`, `entitlements.ai_daily`.

- [ ] **Step 1:** Write the model file and the migration (`prisma migrate dev --create-only` against the track database, then add
  the CHECKs and partial indexes by hand, as `20261018150000_practice` does).
- [ ] **Step 2:** `pnpm db:setup` → migrations apply; then the drift command from Global Constraints → exit 0.
- [ ] **Step 3:** One SQL sanity check by hand (`docker compose -p english-learning exec -T postgres psql -U dev -d
  english_learning_b5_a`): a second `use` row with the same `(user, pool, operation_id)` while the first is `reserved` → unique
  violation; the same after setting the first to `released` → accepted. Paste the two outputs into the commit body.
- [ ] **Step 4:** `entitlements.locks.spec.ts`: `B5E4: the user and pool keys include the user id, so two users with the same
  operation id never share a lock` (fake `tx.$executeRaw` capturing the key); `pnpm test src/entitlements; pnpm build`.
- [ ] **Step 5: Commit** `feat(entitlements): add the entitlements schema`. Open **PR C1** (merge it first: D waits for it).

### Task 5: Cycles and days (track C)

Design §5.5, §7.3, §7.4. **Files:** Create `src/entitlements/rules/cycle.ts`, `cycle.spec.ts`; Modify `src/common/time/local-date.ts`
and its spec.

**Interfaces:**
- Produces in `local-date.ts`: `zonedMidnight(timeZone: string, date: string): Date` — the UTC instant of 00:00 of `date` in
  `timeZone` (first instant of that date on a DST day); `nextLocalMidnight(timeZone: string, now: Date): Date` =
  `zonedMidnight(tz, addDays(localDate(tz, now), 1))`.
- Produces in `cycle.ts`: `addMonthsClamped(anchor: Date, k: number): Date` — same UTC day and time as `anchor` in month `k`
  after it, the day clamped to that month's last day; `cycleAt(anchor: Date, now: Date): { start: Date; end: Date }` — the cycle
  `[addMonthsClamped(anchor, k), addMonthsClamped(anchor, k + 1))` that contains `now` (`k = 0` when `now < anchor`);
  `aiDay(now: Date): string` = `localDate(AI_DAY_ZONE, now)`; `nextAiDayStart(now: Date): Date` =
  `nextLocalMidnight(AI_DAY_ZONE, now)`.

- [ ] **Step 1: Failing tests:** `D13: anchor 31/01 10:00 gives cycles starting 28/02, 31/03, 30/04 at 10:00 (the anchor does not
  drift)`; `anchor 29/02/2028 → 28/02/2029, 29/03/2029`; `now exactly at a cycle start belongs to the new cycle`; `anchor 23:30 UTC
  on the 31st`; `B5E13: aiDay is the Vietnam date (16:59:59 UTC → day d, 17:00 UTC → day d+1)`; `zonedMidnight for
  Asia/Ho_Chi_Minh, Pacific/Kiritimati, Etc/GMT+12, and America/New_York on 2026-03-08 and 2026-11-01`;
  `nextLocalMidnight from 23:58 local is two minutes later`.
- [ ] **Step 2:** `pnpm test src/entitlements/rules src/common/time` → FAIL.
- [ ] **Step 3: Implement** (`zonedMidnight`: guess `date`T00:00Z, correct by the zone's offset at that instant, re-check once for
  DST; `Intl.DateTimeFormat` as `local-date.ts` already does).
- [ ] **Step 4:** Re-run → PASS.
- [ ] **Step 5: Commit** `feat(entitlements): add quota cycles and local midnights`.

### Task 6: Plan resolution — sources, plan, anchor, limits (track C)

Design §5.2–§5.5, D19, D31, D32, the time-transition table of §9.4. **Files:** Create `src/entitlements/rules/plan-rules.ts`,
`plan-rules.spec.ts`.

**Interfaces:**
- Consumes `Pool`, `AiPool`, `LimitKey`, `SubscriptionStatus`, `Interval` (Task 4).
- Produces types: `PlanNumbers = { free: Record<Pool, number>; pro: Record<Pool, number>; trial: Record<AiPool, number> }` (Free AI
  is always 0);
  `SubscriptionSource = { id: string; provider: string; externalSubscriptionId: string; status: SubscriptionStatus; trialDenied:
  boolean;
  cancelAtPeriodEnd: boolean; trialEndsAt: Date | null; currentPeriodEnd: Date | null; graceEndsAt: Date | null; quotaAnchorAt:
  Date | null; interval: Interval; pendingInterval: Interval | null }`;
  `GrantSource = { id: string; kind: 'plan' | 'limits'; limits: Partial<Record<LimitKey, number>> | null; startsAt: Date; endsAt:
  Date; revokedAt: Date | null; createdAt: Date }`.
- Produces `effectiveStatus(sub: SubscriptionSource, now: Date, graceDays: number): { status: SubscriptionStatus; overdue: boolean }`
  — the §9.4 time table: `trialing`/`active`, not cancelled, past its end (`trialEndsAt` for trialing, else `currentPeriodEnd`) →
  same status, `overdue: true` while `now < end + graceDays`, then `on_hold` (D31); `grace` past `graceEndsAt` → `on_hold`;
  `cancelAtPeriodEnd` past its end → `expired`; others unchanged (every subscription renews automatically, D35).
- Produces `resolve(input: { subscriptions: SubscriptionSource[]; grants: GrantSource[]; numbers: PlanNumbers; graceDays: number;
  now: Date }): Resolved` with `Resolved = { plan: 'free' | 'trial' | 'pro'; anchor: Date | null; limits: Record<Pool, number>;
  limitFrom: Record<Pool, { kind: 'plan' } | { kind: 'grant'; grantId: string }>; proSources: Array<{ kind: 'subscription' |
  'grant'; id: string; anchor: Date }> }`. Rules (design §5.4, §5.5): a grant counts when `startsAt ≤ now < endsAt` and not revoked;
  a subscription counts as Pro when its effective status is `active` or `grace` (overdue included), as trial when `trialing` and
  not `trialDenied`; plan = `pro` if any Pro source, else `trial` if any trial source, else `free`; **anchor = the latest anchor
  among counting sources** (subscription → `quotaAnchorAt`; plan grant → `startsAt`; a limits grant with an `ai_*` key > 0 →
  `startsAt` only when there is no Pro or trial source); base limits from the plan (trial: Pro's `practice_sessions`, trial AI
  numbers); each pool overridden by the active limits grant with that key and the **latest `createdAt`**.

- [ ] **Step 1: Failing tests**, one `it` per row: every row of the §9.4 time table for `effectiveStatus` (B5E50, B5E67, B5E68,
  `grace` → `on_hold` at `graceEndsAt`); `resolve`: `B5#1 no sources → free, 3/0/0`; `trial → practice 30, AI 300/100 from
  trial numbers`; `trial_denied subscription → free (D30)`; `B5E29: Pro + limits grant ai_practice 500 → 500, back to 300 after
  ends_at`; `B5E30: two limits grants on one pool → the later createdAt wins; revoking it restores the earlier`; `B5E31: Pro +
  ai_practice 0 → 0`; `B5E32: Free + ai_practice 500 → plan free, limit 500, anchor = grant startsAt`; `B5E84: a grant with
  startsAt in the future does not count`; `B5E99 (D38): plan grant to 30/11 and plan grant 1/12–31/12 → Pro on 15/11, 15/12;
  anchor 1/11 before 1/12, 1/12 from 1/12`; `B5E95 (D38): a plan grant whose endsAt moved from 30/11 to 31/12 keeps anchor
  startsAt`; every row of the §5.5 example table (anchors 15/11, 15/11, none, 20/11, 15/11 then 1/11 —
  B5E28, B5E58, B5E81); `B5E83: practice_sessions_per_day 0 → limit 0`.
- [ ] **Step 2:** `pnpm test src/entitlements/rules` → FAIL.
- [ ] **Step 3: Implement** both functions (pure, no I/O).
- [ ] **Step 4:** Re-run → PASS.
- [ ] **Step 5: Commit** `feat(entitlements): resolve plans, anchors and limits from sources`. Open **PR C2** (Tasks 5–6).

### Task 7: Subscription state machine and event order (track D)

Design §9.2 ("Thứ tự"), §9.3, §9.4, D23–D25, D31, D34, D35, R1–R3. **Files:** Create `src/entitlements/billing/billing.types.ts`,
`src/entitlements/billing/subscription-machine.ts`, `subscription-machine.spec.ts`, `src/entitlements/billing/event-order.ts`,
`event-order.spec.ts`.

**Interfaces:**
- Consumes `SubscriptionStatus`, `Interval`, `BillingEnvironment` (Task 4).
- Produces in `billing.types.ts`: `EventType` (the 13 types of §9.3; no `payment_succeeded`, D35);
  `ADDITIVE_TYPES = ['renewed', 'refunded'] as const`; `eventKind(type: EventType): 'state' | 'additive'`;
  `NormalizedEvent` = common fields `{ provider: string; environment: BillingEnvironment; externalEventId: string;
  externalSubscriptionId: string; appUserId: string | null; occurredAt: Date }` & one variant per type with the §9.3 "thêm bắt buộc"
  fields (camelCase: `interval`, `currentPeriodStart`, `currentPeriodEnd`, `trialEndsAt`, `paymentFingerprint`, `transactionId`,
  `graceEndsAt`, `amount`). **D37:** `transactionId` is **required** on `renewed`, on `subscription_started` without
  `trialEndsAt` (the first charge) and on `plan_changed` (the charge for the new period); it stays absent on a trial start;
  `SubscriptionState` = the mutable columns of `subscriptions` (Task 4) as a plain object;
  `FetchedState = { status: SubscriptionStatus; interval: 'month' | 'year'; currentPeriodStart: Date | null; currentPeriodEnd: Date |
  null; trialEndsAt: Date | null; cancelAtPeriodEnd: boolean }`.
- Produces `applyEvent(state: SubscriptionState | null, event: NormalizedEvent, ctx: { now: Date; graceDays: number; trialAllowed:
  boolean }): { next: SubscriptionState | null; outcome: 'changed' | 'recorded'; anchorReset: boolean; log: string | null }` — exactly
  the §9.4 matrix ("Ghi" = `recorded`, state unchanged); details the matrix leaves to the code: `renewed` sets `current_period_end
  = max(old, event)`, `current_transaction_id = event.transactionId`, applies a `pending_interval`; `subscription_started` without a
  trial (new row or reactivation) and `plan_changed` also set `current_transaction_id = event.transactionId` (D37); `renewal_failed`
  sets `grace_ends_at = event.graceEndsAt ?? max(event.occurredAt, currentPeriodEnd) + graceDays`; `refunded` revokes when
  `event.transactionId = current_transaction_id` (D34), records when it is another transaction, and when `current_transaction_id`
  is null records with `log = 'billing_refund_unmatched'` and **does not revoke** (D37, B5E93);
  `refund_reversed` from `revoked` with the current transaction → `active` if `now < current_period_end` else `expired`; a trial
  start or reactivation into `trialing` sets `trialDenied = !ctx.trialAllowed`; "Mốc mới" cells set `quota_anchor_at` (to
  `currentPeriodStart` for `renewed`, `occurredAt` for `subscription_started`) and return `anchorReset: true`.
- Produces `startsTrial(state: SubscriptionState | null, event: NormalizedEvent): boolean` — true only when the cell that
  `applyEvent` will use **creates** a trialing row or **reactivates** one into `trialing`: `subscription_started` with
  `trialEndsAt` and `state` null, `expired` or `revoked`. A `subscription_started` on a `trialing`/`active`/`grace`/`on_hold` row
  is "Ghi" and starts no trial (plan review #3). Task 17 calls it before touching `trial_history`.
- Produces `applyFetched(state: SubscriptionState, fetched: FetchedState): SubscriptionState` — overwrites exactly `status`,
  `interval`, `currentPeriodStart`, `currentPeriodEnd`, `trialEndsAt`, `cancelAtPeriodEnd` (design 9.2 "fetchState"); used by
  Tasks 17 and 18.
- Produces `orderDecision(kind: 'state' | 'additive', occurredAt: Date, lastEventAt: Date | null): 'apply' | 'stale'` (state older
  than `lastEventAt` → stale; equal → apply; additive → always apply) and `nextLastEventAt(lastEventAt: Date | null, occurredAt:
  Date): Date` (= max).

- [ ] **Step 1: Failing tests:** `subscription-machine.spec`: one `it.each` row **per cell** of the §9.4 matrix (13 events × 7
  columns = 91 rows, each asserting `status`, the touched columns, `outcome`, `anchorReset`); plus `B5E47: renewal_failed 15/11
  with grace 7 → grace_ends_at 22/11`; `B5E53: plan_change_scheduled then renewed → interval month, anchor kept`; `B5E54:
  plan_changed keeps the anchor`; `B5E70: renewed
  after cancel_scheduled keeps cancel_at_period_end`; `B5E86: partial refund of the current transaction → revoked`; `B5E87: refund
  of another transaction → recorded, still active`; `B5E87 (D37): subscription_started month with tx m1, plan_changed year with tx
  y1, refunded m1 → recorded, still active; refunded y1 → revoked`; `B5E93: refunded while current_transaction_id is null →
  recorded, log billing_refund_unmatched, still active`; `subscription_started without a trial sets current_transaction_id`; `startsTrial: true for subscription_started with a trial on none, expired,
  revoked; false on trialing, active, grace, on_hold, and without trialEndsAt`; `applyFetched overwrites the six columns and
  nothing else`. `event-order.spec`: `B5E43: state event older than last_event_at → stale`;
  `B5E71: equal occurred_at → apply`; `additive never stale`; `nextLastEventAt is the max`.
- [ ] **Step 2:** `pnpm test src/entitlements/billing` → FAIL.
- [ ] **Step 3: Implement** (pure; a lookup table keyed by `[event.type][status | 'none']` keeps the 91 cells readable).
- [ ] **Step 4:** Re-run → PASS.
- [ ] **Step 5: Commit** `feat(entitlements): add the subscription state machine and event order`.

### Task 8: Adapter port, registry and the fake provider's wire format (track D)

Design §9.1, §9.2 step 1–2, R10, R16. **Files:** Create `src/entitlements/billing/billing-adapter.ts`,
`src/entitlements/billing/billing-adapter.registry.ts`, `src/entitlements/billing/fake/fake-wire.ts`, `fake-wire.spec.ts`; Modify
`src/entitlements/entitlements.module.ts` (provide and export the registry).

**Interfaces:**
- Produces `BillingRequest = { method: 'GET' | 'POST'; headers: Record<string, string | string[] | undefined>; query:
  Record<string, unknown>; rawBody: Buffer }`; `ParsedEvent = { externalEventId: string; type: EventType; environment:
  BillingEnvironment; externalSubscriptionId: string; appUserId: string | null; occurredAt: Date; transactionId: string | null;
  event: NormalizedEvent | null; missing: string[]; raw: unknown }` (`event = null` when a §9.3 field is missing; `missing` names
  them; `appUserId` is null unless the value is a lower-case uuid, so a garbage id ends as "unknown user", never as a DB error);
  `abstract class BillingAdapter { abstract readonly provider: string; abstract verify(req: BillingRequest): Promise<{ ok: true;
  events: ParsedEvent[]; skipped: number } | { ok: false }>` (`ok: false` = **signature** wrong only; a signed entry of a type
  Wordmet does not use is counted in `skipped`, not stored, and still acked — providers resend anything that gets a 4xx);
  `abstract ack(result: { received: number }): { status: number;
  body?: unknown }; fetchState?(externalSubscriptionId: string): Promise<FetchedState | null>; endTrialNow?(externalSubscriptionId:
  string): Promise<void>; cancelAtPeriodEnd?(externalSubscriptionId: string): Promise<void> }`.
- Produces `BillingAdapterRegistry` (`@Injectable`): `register(adapter: BillingAdapter): void`, `get(provider: string):
  BillingAdapter | undefined` — adapters register themselves in `onModuleInit` (precedent `JobHandlerRegistry`).
- Produces in `fake-wire.ts` (pure): `fakeSign(secret: Buffer, body: Buffer): string` (`sha256=` + hex HMAC-SHA256);
  `fakeVerifySignature(secret: Buffer, body: Buffer, header: string | undefined): boolean` (constant-time compare);
  `fakeParse(body: Buffer): { events: ParsedEvent[]; skipped: number } | null` — body is JSON `{ "events": [ { "id", "type",
  "environment", "subscription_id", "app_user_id", "occurred_at", …the type's fields in snake_case } ] }`; `null` only when the
  body is not that shape (not JSON, no `events` array); an entry with an unknown `type` is skipped and counted. Header
  name `X-Fake-Signature`. GET form: query `payload` (base64url of the same JSON) and `signature` (signature of the decoded bytes).
  `dedupeKey(provider, environment, externalEventId)` = `provider:environment:externalEventId`.

- [ ] **Step 1: Failing tests** (`fake-wire.spec`): `B5E44: a body signed with another secret, or with one byte changed, fails`;
  `the GET form verifies the same as POST`; `each of the 13 types parses into its NormalizedEvent`; `payment_succeeded is an
  unknown type (skipped and counted, D35)`; `a renewed without
  transaction_id parses with event null and missing ['transactionId']`; `B5E94 (D37): the same for a subscription_started without
  trial_ends_at and for a plan_changed, each without transaction_id; a subscription_started with trial_ends_at and no
  transaction_id parses`; `a non-JSON body or one without an events array → null`;
  `an entry of unknown type is skipped and counted, the others parse`; `app_user_id "abc" or an upper-case uuid → appUserId null`;
  `dedupeKey format`.
- [ ] **Step 2:** `pnpm test src/entitlements/billing` → FAIL.
- [ ] **Step 3: Implement**; register `BillingAdapterRegistry` in `EntitlementsModule` (exported inside the module only, not from
  `index.ts`).
- [ ] **Step 4:** Re-run → PASS; `pnpm build`.
- [ ] **Step 5: Commit** `feat(entitlements): add the billing adapter port and the fake wire format`. Open **PR D1** (Tasks 7–8).

---

# Milestone M2 — Core (tracks E, F)

### Task 9: Entitlements service — sources, check, session quota, snapshot (track E)

Design §4 (Practice changes), §5.4, §7.2 (counting), §7.4, §11, §12.1, §12.4, §12.5. **Files:** Rewrite
`src/entitlements/entitlements.service.ts` and its spec; Create `src/entitlements/refusal.ts`,
`src/entitlements/sources/sources.repository.ts`, `src/entitlements/usage/usage.queries.ts`; Modify `entitlements.module.ts`
(imports `IdentityModule`, `SettingsModule`), `src/entitlements/index.ts`.

**Interfaces:**
- Consumes `resolve`, `effectiveStatus`, `PlanNumbers` (Task 6), `cycleAt`, `nextLocalMidnight`, `aiDay` (Task 5),
  `SettingsService.get().entitlements` (Task 1), `IdentityService.getProfile`, `isEmailVerified`.
- Produces `refusal.ts`: `type Refusal = { reason: 'plan-required' } | { reason: 'quota-exhausted'; resets_at: string | null } |
  { reason: 'ai-unavailable'; retry_after_seconds: number | null }`; `refusalProblem(refusal: Refusal): ProblemDetailsException`
  (403 `entitlement-required` / 403 `quota-exhausted` with extension `resets_at` / 503 `ai-unavailable` with `retryAfterSeconds`).
- Produces `SourcesRepository.load(db: PrismaClient | Prisma.TransactionClient, userId: string, now: Date): Promise<{
  subscriptions: SubscriptionSource[]; grants: GrantSource[] }>` — subscriptions whose stored status is not `expired`/`revoked`
  (time transitions are applied by `effectiveStatus`), grants with `revoked_at IS NULL AND ends_at > now`.
- Produces `UsageQueries`: `aiUsed(db, userId, pool: AiPool, cycle: { start: Date; end: Date }, now: Date): Promise<number>` (design
  7.2: confirmed `use` with `confirmed_at` in the cycle + `reserved` with `expires_at > now` − `credit` with `credited_at` in the
  cycle, floored at 0); `confirmedInCycle(db, userId, pool, cycle): Promise<number>` and `creditsInCycle(…)` (for refunds);
  `practiceUsed(db, userId, localDate: string): Promise<number>`; `capUsed(db, day: string, now: Date): Promise<{ confirmed: number;
  reserved: number }>` (both AI pools, `system_date = day`, reserved only when unexpired).
- Produces on `EntitlementsService` (exported types from `index.ts`: `Feature`, `Pool`, `AiPool`, `Refusal`, `EntitlementsSnapshot`,
  plus `refusalProblem`):
  - `type Feature = 'practice.basic' | 'ai.practice' | 'ai.lookup'`;
  - `check(userId: string, feature: Feature): Promise<{ allowed: true } | ({ allowed: false } & Refusal)>` — `practice.basic`
    always allowed (D4); `ai.*` allowed when that pool's limit > 0, else `plan-required`;
  - `checkQuota(userId: string, pool: 'practice_sessions', tx?: Prisma.TransactionClient): Promise<{ allowed: true } |
    ({ allowed: false } & Refusal)>` — limit 0 → `plan-required` (R12, no `resets_at`); `practiceUsed(today) ≥ limit` →
    `quota-exhausted` with `resets_at = nextLocalMidnight(profile.timezone, now)`; reads through `tx` when given so it runs after
    Practice's `updateMany` (R4);
  - `recordPracticeSession(tx: Prisma.TransactionClient, userId: string, sessionId: string, localDate: string): Promise<void>` — one
    raw `INSERT INTO usage_records … ('practice_sessions', operation_id = sessionId, kind 'use', status 'confirmed', local_date,
    confirmed_at = now) ON CONFLICT DO NOTHING` (R14);
  - `snapshot(userId: string): Promise<EntitlementsSnapshot | null>` (`null` when `getProfile` finds no user; Task 13 maps it to
    404, and `/v1/me/entitlements` never sees `null` because its caller is signed in) with `EntitlementsSnapshot = { plan: 'free' | 'trial' | 'pro';
    sources: Array<{ kind: 'subscription' | 'grant_plan' | 'grant_limits'; id: string; status: SubscriptionStatus | null; ends_at:
    string | null; renews_at: string | null; cancel_at_period_end: boolean | null; pending_interval: 'month' | 'year' | null;
    limits: Partial<Record<LimitKey, number>> | null }>; pools: Record<Pool, { limit: number; used: number; remaining: number;
    resets_at: string | null }>; features: Record<'ai.practice' | 'ai.lookup', { allowed: boolean; reason: 'plan-required' | null }>;
    ai_available: { enabled: boolean; cap_reached: boolean }; ads: { show: boolean; interstitial_per_day: number;
    min_interval_minutes: number }; trial_eligible: boolean }` — `renews_at` = `current_period_end` of a
    not-cancelled subscription; AI `resets_at` = cycle end (null without anchor); `ads.show = adsEnabled && plan === 'free'`;
    `trial_eligible` = verified email and no `trial_history` row; `cap_reached = confirmed + reserved ≥ aiDailyCap`.
  - `planNumbers(settings: AppSettings['entitlements']): PlanNumbers` (exported from the service file for Tasks 10, 13).

- [ ] **Step 1: Failing tests** in `entitlements.service.spec.ts` with stub `SourcesRepository`, `UsageQueries`, `SettingsService`,
  `IdentityService` and a `FakeClock`: `B5#1: a new user's snapshot is free, practice 3/day, AI 0, both features plan-required,
  ads.show false, trial_eligible true when verified`; `B5#2/B5E21: practiceUsed 3 → quota-exhausted, resets_at = next midnight in
  the profile zone (Asia/Ho_Chi_Minh, Pacific/Kiritimati, Etc/GMT+12)`; `B5E83: limit 0 → plan-required without resets_at`;
  `B5#23: free_practice_sessions_per_day 5 lets the 4th and 5th session through`; `B5#25: ads.show true only for free when
  ads_enabled`; `B5E41/B5E91: a staff user without grants is free`; `practice.basic is allowed for every user (D4)`; `B5E17:
  limit lowered to 100 with 150 used → remaining 0, never negative`; `B5E24: "today" follows the profile's current zone`; `B5#20/B5E31:
  ai.practice limit 0 → plan-required`; `refusalProblem maps each refusal to its status, slug, extension and Retry-After`.
- [ ] **Step 2:** `pnpm test src/entitlements` → FAIL.
- [ ] **Step 3: Implement**; delete the Bước 4 placeholder spec (its D25 assertion is replaced by the D4 test).
- [ ] **Step 4:** Re-run → PASS; `pnpm build`.
- [ ] **Step 5: Commit** `feat(entitlements): compute plans, session quotas and the entitlements snapshot`.

### Task 10: AI ledger — reserve, confirm, release, refund, cap and switch (track E)

Design §7.1, §7.2 (refund), §7.3, R6, R7, R21. **Files:** Create `src/entitlements/usage/ledger-rules.ts`, `ledger-rules.spec.ts`,
`src/entitlements/usage/usage-ledger.service.ts`, `src/entitlements/usage/usage-expire.job.ts`; Modify `entitlements.service.ts`
(delegates), `entitlements.module.ts`.

**Interfaces:**
- Consumes Task 9's `UsageQueries`, `SourcesRepository`; `resolve` (Task 6); `lockPool`, `lockAiDaily` (Task 4); `aiDay`,
  `nextAiDayStart`, `cycleAt` (Task 5).
- Produces in `ledger-rules.ts` (pure), in two steps so the global lock is taken only when needed (plan review #2):
  `decideReserve(input: { existing: { status: 'reserved' | 'confirmed'; expiresAt: Date | null } | null; now: Date; aiEnabled:
  boolean; limit: number; used: number; cycleEnd: Date | null; cap: number }): { action: 'return-existing'; state: 'reserved' |
  'confirmed' } | { action: 'release-expired-then-continue' } | { action: 'refuse'; refusal: Refusal } | { action: 'check-cap' }`
  in the §7.1 order (existing → switch → limit 0 → remaining 0 → `check-cap`; `ai_daily_cap = 0` refuses like the switch, B5E65,
  with no `Retry-After`); then `decideCap(input: { capUsed: number; cap: number; now: Date }): { action: 'refuse'; refusal: Refusal }
  | { action: 'insert' }` (`capUsed ≥ cap` → `ai-unavailable` with `retry_after_seconds`); `decideConfirm(input: { latest: { status; releaseReason; expiresAt } | null;
  now: Date; remainingWithoutRow: number; otherActive: boolean }): 'confirm' | 'late-confirm' | 'late-free' | 'keep-released' |
  'already-confirmed' | 'not-found'` — the R7 table row by row.
- Produces on `EntitlementsService`: `reserve(userId: string, pool: AiPool, operationId: string): Promise<ReserveResult>` with
  `ReserveResult = { state: 'reserved'; expires_at: string } | { state: 'confirmed' } | ({ state: 'refused' } & Refusal)`;
  `confirm(userId, pool, operationId): Promise<{ state: 'confirmed' | 'released' | 'not-found' }>`; `release(userId, pool,
  operationId): Promise<{ state: 'released' | 'confirmed' | 'not-found' }>` (sets `release_reason = caller`; on a confirmed row it
  changes nothing); `refund(userId: string, pool: AiPool, operationId: string, reportId: string): Promise<{ refunded: boolean }>`
  (R21; a second call for the same operation returns `{ refunded: true }` without a second row). Each call reads
  `SettingsService.get()` **before** opening its transaction, then runs **its own short transaction** (`{ timeout: 10_000,
  maxWait: 5_000 }`) in which every query goes through `tx` (Global Constraints, "No second connection"): `lockPool`; the
  latest row of the operation `FOR UPDATE`; sources (`SourcesRepository.load(tx, …)`) and `aiUsed(tx, …)`; `decideReserve`; only on
  `check-cap`: `lockAiDaily`, `capUsed(tx, …)`, `decideCap`, insert. `system_date = aiDay(now)`; cap refusal
  `retry_after_seconds = ceil((nextAiDayStart(now) − now) / 1000)`; `not-found` is logged (`usage_confirm_not_found`). Inserts that
  may collide use `ON CONFLICT DO NOTHING`. `confirm` and `release` also lock the row they change (`FOR UPDATE`), so the expire job
  and a late `confirm` never both decide on the same row.
- Produces job `entitlements-usage-expire` (registered in `MaintenanceScheduler`): one `UPDATE usage_records SET status =
  'released', release_reason = 'expired', released_at = now WHERE status = 'reserved' AND expires_at <= now` (idempotent; no claim
  needed).

- [ ] **Step 1: Failing tests** (`ledger-rules.spec`): `B5E2: an unexpired reserved row is returned`; `confirmed row → state
  confirmed (lượt đã trừ)`; `B5E3: a released row → insert`; `an expired reserved row → release then continue`; `B5#17/B5E14:
  switch off → ai-unavailable, retry_after null`; `B5E65: cap 0 → ai-unavailable`; `limit 0 → plan-required`; `remaining 0 →
  quota-exhausted with resets_at = cycle end`; `all user checks pass → check-cap (never insert directly)`; `B5E12 (decideCap):
  cap 1000, capUsed 1000 (3 of them reserved) → ai-unavailable with retry_after to Vietnam midnight`; `B5E9: reserved before the plan ended → confirm still accepted`; each R7 row for
  `decideConfirm` (`B5E6`, `B5E7`, `B5E8`, `B5E75`, `B5E76`, not-found). Service spec with stubs: `refund with 0 confirmed in the
  cycle → refunded false (B5E18, B5E88)`; `B5E19/B5#22: second refund → true, one insert attempted`; `B5E20: refund of a unit
  used last cycle counts against the current cycle`; `reserve takes lockPool before lockAiDaily` (call-order array); `a reserve
  refused for the user (switch, limit 0, remaining 0) never takes lockAiDaily`; `reserve, confirm, release and refund issue no
  query on the shared client while a lock is held` (the shared-client stub throws once `lockPool` has been called; settings are
  read before); `B5E5: the
  expire job's statement releases only reserved rows past expires_at`. B5E74 (a caller reserving twice inside one transaction) is
  pinned in Bước 7 where callers exist; Bước 5's functions take no transaction, so each always commits on its own.
- [ ] **Step 2:** `pnpm test src/entitlements/usage` → FAIL.
- [ ] **Step 3: Implement** (services do the SQL and call the deciders).
- [ ] **Step 4:** Re-run → PASS; `pnpm build`.
- [ ] **Step 5: Commit** `feat(entitlements): add the AI unit ledger, cap and switch`. Open **PR E1** (Tasks 9–10).

### Task 11: Practice — session quota at start, record the session on the first final result (track F)

Design §4 (Sửa Practice), §7.4, R4, B5E21–B5E27, B5E73, B5E77. **Files:** Modify `src/practice/sessions/sessions.service.ts`,
`src/practice/answers/answers.service.ts`; Create `src/practice/sessions/sessions.service.spec.ts`,
`src/practice/answers/answers.service.spec.ts`.

**Interfaces:**
- Consumes `EntitlementsService.check`, `checkQuota`, `recordPracticeSession`, `refusalProblem` (Task 9) from `src/entitlements/index.ts`.
- `SessionsService.start`: right **after** the `updateMany` that closes the open session (`:95-97`) and before `create`: `const quota
  = await this.entitlements.checkQuota(learner.userId, 'practice_sessions', tx); if (!quota.allowed) throw refusalProblem(quota);`
  (the transaction rolls back, the open session stays). This is the check that counts (R4). Before the transaction (before the
  availability walk, which may take seconds under the practice lock) `start` also calls `checkQuota(learner.userId,
  'practice_sessions')` without `tx` and throws the same refusal, so a learner who has used every session is told at once and before
  `practice-no-words` (plan review #15); a learner who passes this early check can still be refused by the one after `updateMany`.
  `assertEntitled` throws `refusalProblem(result)` instead of the local
  `entitlementRequired()` (drop the orphaned helper). `next` keeps only `check('practice.basic')` (B5E26).
- `AnswersService` injects `EntitlementsService`; `writeFinal` calls `recordPracticeSession(tx, item.userId, item.sessionId,
  localDate)` with the same `localDate` it writes on the item (plan choice 2). Voiding (`sessions.service.ts:314`) records nothing.

- [ ] **Step 1: Failing tests** with fakes (`$transaction(fn) → fn(tx)`, a shared call-order array): `B5E73/R4: start calls
  checkQuota after updateMany and before create, passing the transaction`; `B5#2: a refusal → 403 quota-exhausted with resets_at,
  create never called`; `an exhausted learner is refused by the early check before the availability walk (builder.availability
  never called), even for an empty group`; `B5E83: plan-required → 403 entitlement-required`; `B5E26: next never calls checkQuota`; `writeFinal
  records the session with the item's local_date (B5E23: answered 00:01 local after a 23:58 start → the new date)`; `B5E77: a
  second final write calls recordPracticeSession again (the insert ignores it)`; `B5E27: recordPracticeSession throwing makes
  writeFinal reject`; `B5E22: starting a session records nothing`; `B5E25: voiding an item does not call recordPracticeSession`.
- [ ] **Step 2:** `pnpm test src/practice` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Re-run → PASS; `pnpm build`.
- [ ] **Step 5: Commit** `feat(practice): limit sessions per day and record them on the first result`. Open **PR F1**.

### Task 12: Grants — rules, create, revoke, list (track E)

Design §10, §12.2 rows 2–4 and 3b, D6–D9, D19, D20, D32, D33, D38, R12. **Files:** Create `src/entitlements/grants/grant-rules.ts`,
`grant-rules.spec.ts`, `src/entitlements/grants/grants.schemas.ts`, `src/entitlements/grants/grants.service.ts`,
`grants.service.spec.ts`, `src/entitlements/grants/admin-grants.controller.ts`, `admin-grants.controller.spec.ts`; Modify
`entitlements.module.ts` (controller; `IdempotencyInterceptor` provider as in `SettingsModule`).

**Interfaces:**
- Consumes `lockUser`, `BILLING_ADAPTER_TIMEOUT_MS` (Task 4), `SourcesRepository` (Task 9), `effectiveStatus` and
  `SubscriptionSource.provider`/`externalSubscriptionId` (Task 6), `BillingAdapterRegistry` (Task 8), `IdentityService.getProfile`,
  `Permission 'entitlements.grant'` (Task 3).
- Produces `grantRefusal(input: { action: 'create' | 'revoke' | 'update'; actorId: string; actorRole: 'admin' | 'editor'; targetId: string;
  targetRole: 'admin' | 'editor' | null; touchesAiLimits: boolean }): GrantRefusalReason | null` — admin: always null; editor, in
  this order: `self-grant`, `target-is-admin`, `target-is-staff`, `ai-limits-admin-only` (D6, D8, D33; `touchesAiLimits` = the
  body's `limits` (create) or the stored grant's `limits` (revoke, update) has an `ai_*` key, **even 0**; a `kind = plan` grant
  never touches AI limits, D7; `update` follows the revoke rules, D38).
- Produces `grants.schemas.ts`: `createGrantSchema` = strict `{ user_id: uuid; kind: 'plan' | 'limits'; plan?: 'pro'; limits?:
  { practice_sessions_per_day?: 0–200; ai_practice_per_cycle?: 0–5000; ai_lookup_per_cycle?: 0–5000 } (≥ 1 key); starts_at?: ISO;
  ends_at: ISO; reason: 1–300 chars after trim; confirm_turn_off_paid_renewal?: boolean }` with `kind`/`plan`/`limits` consistency;
  `revokeGrantSchema = { reason: 1–300 }`; `updateGrantSchema` = strict `{ starts_at?: ISO; ends_at?: ISO; reason: 1–300 }` with at
  least one date (D38); `listGrantsQuery = { user_id?; granted_by?; active?: 'true' | 'false';
  expiring_within_days?: 1–365; page_size 1–100 default 20; page_token? }`.
- Produces `GrantView` (snake_case of every Task 4 column; the single-grant answers of `update` and Task 13's user view add
  `changes: GrantChangeView[]`, newest first, snake_case of `entitlement_grant_changes`) and on `GrantsService`:
  - `create(actorId: string, body: CreateGrantBody): Promise<GrantView>` — **before the transaction** (shared client, Global
    Constraints "No second connection"): target profile (404 `not-found`, B5E85); actor profile role; `grantRefusal` → 409; dates
    (`starts_at ≥ now − GRANT_START_SKEW_MS`, `ends_at > max(starts_at, now)` → else 400, B5E36); `graceDays` from settings. **Then
    one transaction**, every query through `tx`: `lockUser(target)`; sources (`SourcesRepository.load(tx, …)`); for `kind = plan`:
    the target's not-cancelled subscriptions (all renew automatically, D35) whose effective status is `trialing`/`active`/`grace` → without
    `confirm_turn_off_paid_renewal: true` → 409 `target-has-paid-subscription` and nothing saved (B5E79); **only when the new grant
    starts now** (`starts_at` absent or ≤ now): revoke the target's active plan grants with `revoke_reason = 'replaced'`,
    `revoked_by = actorId` (D32, B5E78); a new grant whose `starts_at` is in the future revokes nothing (D38, B5E99); insert the grant
    (`granted_by_role` = actor role). **After commit**, for each paid
    subscription found: `registry.get(sub.provider)?.cancelAtPeriodEnd(sub.externalSubscriptionId)` bounded by
    `BILLING_ADAPTER_TIMEOUT_MS`. `paid_renewal_action` = `turned_off` when every call succeeded; `not_supported` when any adapter or
    method is missing, a call throws or times out (log `paid_renewal_not_cancelled` with the subscription id only, B5E80); write it
    on the grant and return the view. The route is `@Idempotent()`, so this still runs inside the interceptor's transaction: the
    timeout keeps the whole request well under its 30 s.
  - `revoke(actorId: string, grantId: string, reason: string): Promise<GrantView>` — before the transaction: read the grant
    (missing → 404) and its target's **current** role; then one transaction: `lockUser(target)`; re-read the grant `FOR UPDATE`;
    already revoked → the stored view (natural idempotency); `ends_at ≤ now` → 409 `grant-not-active` (B5E39); `grantRefusal('revoke',
    …)` with that role (B5E38, B5E82); set `revoked_at`, `revoked_by`, `revoke_reason`.
  - `update(actorId: string, grantId: string, body: UpdateGrantBody): Promise<GrantView>` (D38) — before the transaction: read the
    grant (missing → 404) and its target's **current** role, actor role; then one transaction, queries through `tx`:
    `lockUser(target)`; re-read the grant `FOR UPDATE`; revoked or `ends_at ≤ now` → 409 `grant-not-active` (B5E98);
    `grantRefusal('update', …)` (B5E97); `starts_at` given and different: allowed only while `starts_at > now` (else 400, B5E96), new
    value `≥ now − GRANT_START_SKEW_MS`; resulting `ends_at > max(resulting starts_at, now)` (else 400, B5E101); nothing differs →
    return the view unchanged, no change row (B5E100); else update the grant and insert one `entitlement_grant_changes` row (old
    and new dates, actor, role, reason). No adapter call (`cancelAtPeriodEnd` stays a creation-time step).
  - `list(query): Promise<{ items: GrantView[]; next_page_token: string | null }>` — newest first (`created_at desc, id desc`),
    `active` = not revoked and `ends_at > now`, `expiring_within_days` = active and `ends_at ≤ now + N days`; page token bound to
    the filters (`encodeBoundToken`).
- Produces routes on `@Controller('admin/entitlements/grants') @RequirePermission('entitlements.grant')`: `POST /` (201,
  `@Idempotent()`, `IdempotencyInterceptor`, `@RateLimit('user.write')`), `POST /:id/revoke` (200, `@RateLimit('user.write')`),
  `PATCH /:id` (200, `@RateLimit('user.write')`, idempotent by its own content, D38), `GET /`.

- [ ] **Step 1: Failing tests:** `grant-rules.spec` — every row of the §10 table for both roles, and `B5E33` (the three editor
  reasons), `B5E34`, `B5E82`, `editor self-grant of AI limits → self-grant wins`. `grants.service.spec` (stubs, `FakeClock`):
  `B5#18: admin grants Pro to a free learner → row saved`; `B5E35: editor grants Pro 30 days → granted_by_role editor`;
  `B5E36: missing ends_at / ends_at in the past / ends_at before starts_at / starts_at 6 minutes ago → 400, nothing saved`; `R12:
  limits 0 accepted, 201 sessions or 5001 AI units refused, kind limits with no key refused`; `B5E78`; `B5E79`; `B5#31/B5E28:
  with the flag → cancelAtPeriodEnd called after commit, paid_renewal_action turned_off`; `B5E80: adapter without the method →
  not_supported`; `an adapter call that times out → not_supported, the grant still created`; `two paid subscriptions, one
  adapter without the method → not_supported`; `cancelAtPeriodEnd receives the provider's subscription id, not our row id`;
  `B5E84: future starts_at can be revoked before it starts`; `B5E39`; `B5E38`; `revoking twice returns the same view`; `B5E99: a
  plan grant with a future starts_at revokes nothing; one starting now revokes the active plan grant`; `B5E95: update ends_at
  30/11 → 31/12 → saved, one change row with old and new dates`; `B5E96`; `B5E97`; `B5E98`; `B5E100: the same dates again → no
  change row`; `B5E101`; `update of a not-yet-started grant moves starts_at`; `no shared-client query while lockUser is held`;
  `B5E62: create, revoke and update logs carry ids and operation_id, never the reason text or an email`.
  `admin-grants.controller.spec` (`createTestApp`, mocked service): `B5E40: a learner gets 403 forbidden on all four routes`;
  `B5E37: same Idempotency-Key and body replays; a different body is refused`; `bad bodies → 400 validation-failed (PATCH with no
  date too)`; `listRoutes shows entitlements.grant on the four routes`; `B5#21: the list passes granted_by and expiring_within_days`.
- [ ] **Step 2:** `pnpm test src/entitlements/grants` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Re-run → PASS; `pnpm build`.
- [ ] **Step 5: Commit** `feat(entitlements): add staff grants`.

### Task 13: Read APIs — my entitlements, one user, AI usage (track E)

Design §12.1, §12.2 rows 5–6, R15. **Files:** Create `src/entitlements/api/me-entitlements.controller.ts`,
`src/entitlements/api/admin-entitlements.controller.ts`, `src/entitlements/api/entitlements-api.controller.spec.ts`; Modify
`entitlements.module.ts`.

**Interfaces:**
- Consumes `snapshot` (Task 9), `GrantsService.list` (Task 12), `UsageQueries.capUsed`, `aiDay`, settings.
- Produces `GET /v1/me/entitlements` → `EntitlementsSnapshot` (authenticated only; **no** `@LearnerContent()`, R15).
- Produces `GET /v1/admin/entitlements/users/:user_id` (`entitlements.grant`) → `EntitlementsSnapshot & { grants: GrantView[] }`
  (every grant of the user, newest first, at most 100, each with its `changes`, D38); unknown user (`snapshot` returns `null`) → 404
  `not-found`.
- Produces `GET /v1/admin/entitlements/ai-usage?date=YYYY-MM-DD` (`settings.manage`; default today in `AI_DAY_ZONE`) → `{ date:
  string; used: number; confirmed: number; reserved: number; cap: number; alert_percent: number | null; alert_reached: boolean;
  enabled: boolean }` — `used` = confirmed + unexpired reserved; `alert_reached` (D36, the admin screen turns yellow in the UI round)
  = `alert_percent` not null **and** `cap > 0` **and** `used ≥ ceil(cap × alert_percent / 100)`; computed on read, nothing stored.

- [ ] **Step 1: Failing tests** (`createTestApp`, stubbed service): `B5E91: an account without native_language and a staff account
  both get 200 from /v1/me/entitlements`; `B5E63: the route writes nothing (only snapshot is called)`; `user view 404 for an
  unknown id`; `B5#27: an editor gets 403 forbidden on ai-usage`; `ai-usage defaults date to the Vietnam day and rejects
  2026-13-01`; `D36: alert_reached — cap 1000, percent 75: used 749 → false, 750 → true; percent null → false; cap 0 → false; cap 2,
  used 2 → true`; `listRoutes: users/:user_id needs entitlements.grant, ai-usage needs settings.manage`.
- [ ] **Step 2:** `pnpm test src/entitlements/api` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Re-run → PASS; `pnpm build`.
- [ ] **Step 5: Commit** `feat(entitlements): add the entitlements read apis`.

### Task 14: `pnpm entitlements:fake-ai` (track E)

Design §3, §17 item 2, B5#14–B5#17, B5#22. **Files:** Create `src/cli/fake-ai.ts`, `src/cli/fake-ai.spec.ts`; Modify
`package.json` (`"entitlements:fake-ai": "node dist/cli/fake-ai.js"`).

**Interfaces:**
- Consumes `EntitlementsService.reserve`, `confirm`, `release`, `refund` (Task 10); `config.billing.fakeEnabled` (Task 15, PR G1:
  this task waits for it, see "Sessions and tracks"); bootstraps like `src/cli/run-maintenance.ts`.
- Produces the command `pnpm entitlements:fake-ai <reserve|confirm|release|refund> (--user <uuid> | --users <uuid,uuid,…>) --pool
  <ai_practice|ai_lookup> --op <string> [--parallel N] [--report <id>]`: prints one JSON line per call (`{ "user": …, "op": …,
  "result": … }`); `--parallel N` (1–50) runs N calls at once **in this one process** with operation ids `<op>:1 … <op>:N`; with
  `--users`, call `i` goes to user `i mod n`, so calls of different users overlap in time (B5E11, plan review #7); refuses to start
  (exit 1, message) unless `config.billing.fakeEnabled` (never on production, plan choice 1); bad arguments → exit 2 with usage.
  Calls rely on Task 10's "no second connection" rule: N calls waiting on one lock hold at most N of the 10 pool connections and
  the holder needs none more.

- [ ] **Step 1: Failing tests** for the argument parser (exported `parseFakeAiArgs(argv: string[])`): valid forms, `--parallel 0`
  and `51` refused, unknown pool refused, `refund` without `--report` refused, `--user` and `--users` together refused, `--users`
  with a non-uuid refused, `--users a,b,c --parallel 6` maps calls to a, b, c, a, b, c.
- [ ] **Step 2:** `pnpm test src/cli` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Re-run → PASS; `pnpm build`; against the track database with a granted user: `pnpm entitlements:fake-ai reserve
  --user <id> --pool ai_practice --op t1 --parallel 3` prints three results; `--parallel 10` on a user with one unit left prints
  exactly one `reserved` and returns (no hang).
- [ ] **Step 5: Commit** `feat(entitlements): add the fake ai cli`. Open **PR E2** (Tasks 12–14).

---

# Milestone M3 — Billing and email (tracks G, H)

### Task 15: Billing config and the stateful fake adapter (track G)

Design §9.1, R10, R17. **Files:** Modify `src/common/config/app-config.ts`, `app-config.spec.ts`, `.env.example`,
`test/support/test-config.ts`; Create `src/entitlements/billing/fake/fake-billing.adapter.ts`, `fake-billing.adapter.spec.ts`;
Modify `entitlements.module.ts`.

**Interfaces:**
- Produces `AppConfig.billing = { production: boolean; fakeEnabled: boolean; fakeSecret: Buffer | null; fakeFetchState: boolean }`
  from `BILLING_PRODUCTION` (default `false`), `BILLING_FAKE_ENABLED` (default `false`), `BILLING_FAKE_SECRET` (`secretSchema()`,
  required when enabled), `BILLING_FAKE_FETCH_STATE` (default `true`); `loadConfig` throws when production and fake are both on.
  `.env.example` enables the fake with a placeholder secret (replaced by `node scripts/gen-secret.mjs` like the others).
- Produces `FakeBillingAdapter extends BillingAdapter` (`provider = 'fake'`), registered in the registry only when
  `config.billing.fakeEnabled`: `verify` = `fakeVerifySignature` + `fakeParse` (Task 8), then upserts `fake_billing_subscriptions`
  from each parsed event **only when its `occurredAt ≥ lastOccurredAt`** (the fake plays the provider's latest truth);
  `ack` → 200 `{ received: n }`; `fetchState` reads that table (the method is absent when `fakeFetchState` is false);
  `endTrialNow` sets `end_trial_called_at` and `status = 'active'`; `cancelAtPeriodEnd` sets `cancel_called_at` and
  `cancel_at_period_end = true`.

- [ ] **Step 1: Failing tests:** `app-config.spec`: defaults; `production + fake → error naming both`; `fake enabled without a
  secret → error`. `fake-billing.adapter.spec` (mocked Prisma): `an older event does not overwrite the fake state (B5#10 setup)`;
  `fetchState absent when BILLING_FAKE_FETCH_STATE=false (R10)`; `endTrialNow and cancelAtPeriodEnd stamp their columns`.
- [ ] **Step 2:** `pnpm test src/common/config src/entitlements/billing` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Re-run → PASS; `pnpm build`.
- [ ] **Step 5: Commit** `feat(entitlements): add billing config and the stateful fake provider`.

### Task 16: Webhook — raw body, inbox, ack; `pnpm billing:fake-event` (track G)

Design §9.2 steps 1–3, R16, B5E42, B5E44, B5E45 (the "store" half). **Files:** Modify `src/app.setup.ts`; Create
`src/entitlements/billing/billing-inbox.service.ts`, `src/entitlements/billing/webhook.controller.ts`, `webhook.controller.spec.ts`,
`scripts/billing-fake-event.mjs`; Modify `entitlements.module.ts`, `package.json` (`"billing:fake-event": "node
scripts/billing-fake-event.mjs"`).

**Interfaces:**
- `app.setup.ts`: **before** the JSON parser, `app.useBodyParser('raw', { type: (req) => req.url?.startsWith('/v1/billing/webhooks/')
  ?? false, limit: WEBHOOK_BODY_LIMIT })`.
- Produces `BillingInbox.store(provider: string, events: ParsedEvent[]): Promise<string[]>` — one transaction inserting each event
  (`dedupe_key`, `kind = eventKind(type)`, `app_user_id` = `appUserId`, `payload` = the normalized event or **null when `event` is
  null** (missing fields), `raw_payload` = `raw`, `status = 'pending'`) with `ON CONFLICT (dedupe_key) DO NOTHING RETURNING id`;
  returns the ids of new rows only (duplicates are "already received").
- Produces `@Public() @Controller('billing/webhooks')` with `@Post(':provider')` and `@Get(':provider')`: unknown provider → 404
  `not-found`; `verify` `ok: false` → 400 `validation-failed`, nothing stored, log `billing_signature_invalid` (provider only);
  else `store`, log `billing_event_skipped` with the count when `skipped > 0`, reply with `adapter.ack`, and hand the new ids to
  `BillingEventApplier.applyMany` (Task 17) **after the response**,
  the `MailDispatcher.afterResponse` way (start on `res` close, drain on shutdown). The hand-off goes through a token
  `BILLING_APPLY_PORT` of type `{ applyMany(ids: string[]): Promise<void> }`, provided here by a no-op; Task 17 rebinds it to the
  real applier.
- Produces `scripts/billing-fake-event.mjs`: `export async function sendFakeEvent({ baseUrl, secret, events, method = 'POST',
  badSignature = false }): Promise<{ status: number; body: unknown }>` plus a CLI (`pnpm billing:fake-event --type <t> --sub <id>
  --user <uuid> [--event-id] [--occurred-at] [--environment] [--interval] [--period-start] [--period-end] [--trial-ends]
  [--fingerprint] [--tx] [--amount] [--grace-ends] [--get] [--bad-signature]`) reading `BILLING_FAKE_SECRET` from env
  or `.env`.

- [ ] **Step 1: Failing tests** (`createTestApp` with a mocked inbox and the fake adapter): `R16: a 70 KB body → 413
  payload-too-large`; `a 60 KB signed body reaches verify with the exact bytes`; `another JSON route still parses its body and still
  rejects 101 KB (the raw parser is route-scoped)`; `B5#26/B5E44: bad signature → 400, store not called`; `GET with payload and
  signature is accepted`; `B5E42: a duplicate (store returns []) still gets the provider's ack`; `unknown provider → 404`;
  `both webhook routes answer without a token (never 401)`; `a signed batch with one unknown type → the provider's ack, the other
  events stored`; `B5E45 (store half): a renewed without transaction_id is stored with payload null, not rejected`; `B5E44/B5E62:
  the bad-signature log has the provider and operation_id only (no body, no header value)`.
- [ ] **Step 2:** `pnpm test src/entitlements/billing` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Re-run → PASS; `pnpm build`; with `pnpm run:dev` on the track database: `pnpm billing:fake-event --type
  subscription_started --sub s1 --user <id> --interval month --period-start … --period-end …` → 200 and one `billing_events` row
  (psql); the same command again → 200 and still one row.
- [ ] **Step 5: Commit** `feat(entitlements): receive billing webhooks`. Open **PR G1** (Tasks 15–16).

### Task 17: Event applier — order, trial rule, environment, user (track G)

Design §8 (D30, R25), §9.2 steps 4, "Môi trường", "Nhận ra người dùng", "Thứ tự", "fetchState", §9.4, D34. **Files:** Create
`src/entitlements/billing/event-applier.service.ts`, `event-applier.service.spec.ts`; Modify `entitlements.module.ts` (rebind
`BILLING_APPLY_PORT` to the real applier with `useExisting`, replacing Task 16's no-op).

**Interfaces:**
- Consumes `applyEvent`, `startsTrial`, `applyFetched`, `orderDecision`, `nextLastEventAt` (Task 7), `BillingAdapterRegistry`
  (Task 8), `lockUser`, `BILLING_ADAPTER_TIMEOUT_MS` (Task 4), `config.billing.production` (Task 15), `IdentityService.getProfile`,
  `SettingsService.get().entitlements.graceDays`.
- Produces `BillingEventApplier.apply(eventId: string): Promise<'applied' | 'stale' | 'ignored' | 'failed' | 'skipped'>` and
  `applyMany(ids: string[]): Promise<void>` (sequential). Three phases per event, so **no adapter call happens while a lock is held**
  (Global Constraints, R6; plan review #1):
  - **Before** (shared client, no lock): read the event row (status not `pending`/`failed` → `skipped`); `settings.get()`
    (`graceDays`); `getProfile(app_user_id)` when `app_user_id` is not null.
  - **Transaction 1**, every query through `tx`:
    1. claim the row `status IN ('pending','failed') FOR UPDATE SKIP LOCKED` (none → `skipped`);
    2. production and `environment = 'sandbox'` → `ignored`, `error = 'sandbox-in-production'` (B5E72);
    3. `app_user_id` null or no profile → `ignored`, `error = 'unknown-user'`, log (B5E45);
    4. `lockUser`; load the subscription by `(provider, environment, external_subscription_id)` `FOR UPDATE`; set the event's
       `user_id`;
    5. `payload` null (missing fields) → `ignored`, `error = 'missing-fields'`, log `billing_event_incomplete`; mark "refetch" when
       the adapter has `fetchState` and the subscription row exists;
    6. additive: an `applied` event with the same `(provider, environment, type, transaction_id)` → `ignored`,
       `error = 'duplicate-transaction'`;
    7. state: `orderDecision` stale → `stale`; mark "refetch" when the adapter has `fetchState`;
    8. trial: only when `startsTrial(state, event)` (Task 7: a new row or a reactivation, **never** a "Ghi" cell; plan review #3):
       `INSERT INTO trial_history … ON CONFLICT DO NOTHING RETURNING id` (no target: catches the user and the card uniques); no
       row → `trialAllowed = false`, log `trial_reuse_detected` with the user id only (B5E55, B5E89); verified email is **not**
       required (R25, B5E90);
    9. `applyEvent`; write the subscription (`last_event_at = nextLastEventAt`, `updated_at = now`), the event (`applied`,
       `subscription_id`, `processed_at`); a trial started and allowed → insert the `trial_started` notice (`subject_key` =
       subscription id, `period_key` = `trial_ends_at` ISO, `due_at` = now, `window_ends_at` = `trial_ends_at`, `ON CONFLICT DO
       NOTHING`). Remember the row's `updated_at` as written.
  - **After commit** (no lock): "refetch" → `fetchState(externalSubscriptionId)` bounded by `BILLING_ADAPTER_TIMEOUT_MS`. It
    throws, times out or returns `null` → the event keeps `stale` / `ignored` from transaction 1 (design 9.2: "lỗi … → rơi về luật
    thứ tự"), log `billing_state_refetch_failed`, never `failed`. Otherwise **transaction 2**: `lockUser`, the row `FOR UPDATE`;
    write `applyFetched(row, fetched)` only if the row's `updated_at` is still the one transaction 1 saw (else drop it: a newer event
    already wrote); log `billing_state_refetched`. Then, only when transaction 1 wrote `trial_denied = true` and the adapter has
    `endTrialNow`, call it (same timeout; failure → log `billing_end_trial_failed`).
  Any error in transaction 1 → outside the transaction set `failed`, `attempts + 1`, `error` (message only); reaching
  `BILLING_MAX_ATTEMPTS` → log `billing_event_stuck` (B5E46). B5E59 ("account being deleted") waits for Bước 8, which adds that state;
  nothing to check yet.

- [ ] **Step 1: Failing tests** (mocked transaction client recording calls; real `applyEvent`): `B5#9/B5E42: a second apply of an
  applied row is skipped`; `B5E43/B5#10: stale state event with fetchState → marked stale, fetched state written in a second
  transaction; without → only marked stale`; `fetchState is never called while lockUser is held` (call-order array); `fetchState
  throws or times out → event stays stale, not failed, no retry`; `the fetched state is dropped when updated_at changed between the
  two transactions`; `B5E45: no app_user_id, a non-uuid one (stored null) or no profile → ignored unknown-user`; `B5E72 (production
  flag)`; `missing fields (payload null) with and without fetchState`; `B5E94: a plan_changed stored without transaction_id → ignored
  missing-fields (refetch when fetchState exists)`; `duplicate transaction ignored`; `B5E55/B5#28: trial for a
  user with history → trial_denied, endTrialNow after commit, no trial_started notice`; `a second subscription_started with a trial
  on a trialing row → recorded, no trial_history insert, no endTrialNow`; `B5E89: card conflict → denied`; `B5E90: unverified email
  still gets the trial and a history row`; `B5E46: the fifth failure logs billing_event_stuck`; `B5E66/B5#30: renewed after expired → active, anchor reset`; `B5E62: no log entry of the applier carries the
  payload, the fingerprint or an email`.
- [ ] **Step 2:** `pnpm test src/entitlements/billing` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Re-run → PASS; `pnpm build`; by hand on the track database: a fake `subscription_started` with a trial →
  `GET /v1/me/entitlements` shows `plan = trial`.
- [ ] **Step 5: Commit** `feat(entitlements): apply billing events to subscriptions`.

### Task 18: Billing jobs — retry, time transitions, overdue refetch, payload cleanup (track G)

Design §4 (Bảo trì row), §9.2 step 4, §9.4 "Chuyển theo thời gian", D31, R19, R23. **Files:** Create
`src/entitlements/billing/billing-jobs.service.ts`, `billing-jobs.service.spec.ts`; Modify `entitlements.module.ts`.

**Interfaces:**
- Consumes `BillingEventApplier.apply` (Task 17), `effectiveStatus` (Task 6), `applyFetched` (Task 7),
  `BILLING_ADAPTER_TIMEOUT_MS` (Task 4), the registry, `graceDays`.
- Produces three jobs registered in `MaintenanceScheduler`:
  - `billing-events-retry`: ids with `status = 'failed' AND attempts < BILLING_MAX_ATTEMPTS`, or `status = 'pending' AND received_at
    < now − BILLING_PENDING_RETRY_MS`, oldest first, at most 100 → `apply(id)` each (apply claims with `SKIP LOCKED`).
  - `subscriptions-time`: candidates `status IN ('trialing','active','grace')` past `trial_ends_at`/`current_period_end`/
    `grace_ends_at`, read with their `updated_at`; `graceDays` read before; for overdue not-cancelled ones (D31) whose adapter
    has `fetchState`, call it **without a lock** first (bounded by `BILLING_ADAPTER_TIMEOUT_MS`; a throw, timeout or `null` for one
    subscription is logged and that subscription goes on without a fetched state — never stops the job). Then per subscription one
    transaction, queries through `tx`: row `FOR UPDATE SKIP LOCKED` (none → skip); **re-read the row under the lock**; if its
    `updated_at` is still the candidate's, write `applyFetched` (Task 7) when there is a fetched state; then compute
    `effectiveStatus` **from the row as read (and fetched) under the lock** and write it, with `updated_at = now`, when it differs.
    `updated_at`, not `last_event_at`, is the guard: an additive event applied meanwhile with an older `occurred_at` leaves
    `last_event_at` unchanged but changes `updated_at` (plan review #4).
  - `billing-raw-payload-cleanup`: `UPDATE billing_events SET raw_payload = NULL WHERE raw_payload IS NOT NULL AND received_at < now −
    RAW_PAYLOAD_RETENTION_DAYS` (B5E92).

- [ ] **Step 1: Failing tests** (stubs): `retry picks failed rows under the attempt limit and pending rows older than 5 minutes,
  not younger`; `B5E50: cancelled past period end → expired written`; `B5E67/B5#29: active 3 days past the end, no event → stays;
  9 days → on_hold`; `fetchState is called before the row lock and its state is dropped when updated_at changed meanwhile`; `an
  additive renewed applied between the candidate read and the lock (older occurred_at, same last_event_at) → the job writes
  nothing`; `fetchState throwing for one subscription does not stop the others`; `B5E60: a row locked by another run is skipped`;
  `B5E92: cleanup statement uses 90 days`.
- [ ] **Step 2:** `pnpm test src/entitlements/billing` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Re-run → PASS; `pnpm build`.
- [ ] **Step 5: Commit** `feat(entitlements): add billing maintenance jobs`. Open **PR G2** (Tasks 17–18).

### Task 19: Entitlement emails — plan, send, copy (track H)

Design §8 (emails), §14, D22, D29, D36 (no cap-alert email), R9, R18, R19, B5E60, B5E61. **Files:** Move
`src/notifications/scheduler/mail-error.ts` (+ spec) to `src/common/mail/mail-error.ts` and update its import in
`reminder-send.service.ts`; Modify `src/common/mail/mail-budget.service.ts` (`PAYMENT_MAIL_SHARE`); Create
`src/entitlements/notices/entitlement-mail.ts`, `entitlement-mail.spec.ts`, `src/entitlements/notices/notice-planner.service.ts`,
`src/entitlements/notices/notice-sender.service.ts`, `notices.spec.ts`; Modify `entitlements.module.ts`.

**Interfaces:**
- Consumes `IdentityService.verifiedEmails`, `getProfile` (existing); settings; `MailBudget.tryConsume`, `Mailer.send`,
  `classifyMailError`.
- Produces `PAYMENT_MAIL_SHARE = 0.95`.
- Produces `entitlementMail(kind: NoticeKind, language: 'vi' | 'en', data: { trialEndsAt?: Date; periodEnd?: Date }): { subject:
  string; text: string }` — plain text in Vietnamese and English for the three kinds;
  trial emails state the charge date and how to cancel at the provider's page (design §8 (1)); no amount until a real adapter
  sends one (`ASSUMPTION`); no word, payload or card data.
- Produces **one** job `entitlement-notices` (registered once in `MaintenanceScheduler`) that runs `plan(now)` then `send(now)`, so
  one `pnpm maintenance:run` both creates and sends a due email (`runAll` runs jobs one by one in registration order, which the
  plan does not otherwise fix; `maintenance.scheduler.ts:39-50`).
- `NoticePlanner.plan(now)` creates `pending` rows (`createMany({ skipDuplicates: true })`), keys `(subject_key, period_key)`:
  `trial_reminder` = (subscription id, `trial_ends_at` ISO) for `trialing`, not `trial_denied`, `trial_ends_at −
  trial_reminder_days_before ≤ now < trial_ends_at`, `window_ends_at` = `trial_ends_at`; `renewal_notice` = (subscription id,
  `current_period_end` ISO) only when the setting is not null, for `active` not-cancelled, `current_period_end − days ≤ now <
  current_period_end`, window to `current_period_end`. No `expiry_notice` (D35) and no cap alert (D36: Task 13's `alert_reached`
  replaces it).
- `NoticeSender.send(now)`: up to 50 times, **one row at a time** (plan review #5): a short transaction `SELECT … WHERE state IN
  ('pending','failed') AND due_at ≤ now ORDER BY due_at LIMIT 1 FOR UPDATE SKIP LOCKED`; past `window_ends_at` → `skipped`; trial
  kinds on a `trial_denied` subscription → `skipped`; otherwise set `sending`; commit. Then, outside any transaction: no verified
  address → `skipped`; `tryConsume({ ceiling: PAYMENT_MAIL_SHARE })` false → `failed`, `attempts + 1` (B5E61); send; success →
  `sent`, `sent_at`; error by `classifyMailError`: `unknown` → stays `sending` (never resent, as reminders), `transient` →
  `failed`, `attempts + 1`, `last_error_at`; `permanent` → `skipped`. A crash loses at most the one row in `sending`, as reminders
  do (`reminder-send.service.ts:56-61`). Language = recipient's `native_language`, `vi` when none. Logs carry the notice id, kind,
  state and the error **kind** only (never the address or the error object's message).

- [ ] **Step 1: Failing tests:** `entitlement-mail.spec`: each kind × language has a subject and the date it promises;
  `notices.spec` (stubs, `FakeClock`): `B5#5: trial ending in 2 days → one trial_reminder row; a second plan run adds none`;
  `D29: renewal_notice is never planned while the setting is null`; `renewal_notice with the setting at 9 → one row 9 days before
  current_period_end, none for a cancelled subscription`; `B5E61: budget refused → failed and retried next run inside the window`; `window passed → skipped`;
  `trial_denied → skipped`; `B5E60: rows already claimed are not sent twice`; `unknown send error leaves sending`; `a row is set
  sending only right before its own send (a throw after the first send leaves the other due rows pending)`; `one job run plans
  and then sends a due trial reminder`; `B5E62: send and failure logs carry the notice id and the error kind, never the address`.
- [ ] **Step 2:** `pnpm test src/entitlements/notices src/common/mail src/notifications` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Re-run → PASS; `pnpm build`.
- [ ] **Step 5: Commit** `feat(entitlements): send trial and renewal emails`. Open **PR H1**.

---

# Milestone M4 — Gate (track Z)

### Task 20: Keep `smoke:buoc-4` passing (track Z)

Design §17 item 4, R5, B5#34. **Files:** Modify `scripts/smoke-buoc-4.mjs`.

**Interfaces:** Consumes `POST /v1/admin/entitlements/grants` (Task 12).
- Right after "Register admin and learner", the admin grants the learner `{ kind: 'limits', limits: { practice_sessions_per_day:
  200 }, ends_at: now + 1 day, reason: 'smoke:buoc-4' }` with an `Idempotency-Key`; the step prints the grant id. Nothing else
  changes.

- [ ] **Step 1:** On a fresh database (`english_learning_smoke_b5`, created as in the coordinator brief), without the change:
  `pnpm build; pnpm run:dev` then `pnpm smoke:buoc-4` → FAIL at the 4th session with 403 `quota-exhausted` (paste the line).
- [ ] **Step 2:** Add the grant step.
- [ ] **Step 3:** Recreate the database, re-run → exit 0.
- [ ] **Step 4:** Commit `test(practice): grant session headroom in the bước 4 smoke`.

### Task 21: `pnpm smoke:buoc-5`, as-built (track Z)

Design §16 (B5#1–B5#35), §17. **Files:** Create `scripts/smoke-buoc-5.mjs`; Modify `package.json` (`"smoke:buoc-5": "node
scripts/smoke-buoc-5.mjs"`), `docs/deliveries/buoc-5.md` (as-built), the design (as-built notes: plan choices 1–7, any slug added),
`docs/deliveries/buoc-5-smoke-output.txt` (new).

**Interfaces:**
- Consumes every API above, `sendFakeEvent` (Task 16), `pnpm entitlements:fake-ai` (Task 14), `pnpm maintenance:run`, Mailpit, and
  `psql` as `smoke-buoc-4.mjs` does (copy its helpers). The API runs with `BILLING_FAKE_ENABLED=true`.
- **Configuration of the child processes** (plan review #6): `maintenance:run` and `entitlements:fake-ai` are separate processes
  that read `.env`, and a variable already in their environment wins over `.env` (`process.loadEnvFile`; checked 19/10/2026). The
  D31 refetch runs inside `maintenance:run`, not in the API. So the mode is set **in `.env`** (`BILLING_FAKE_FETCH_STATE`), the API is
  restarted after each change, and the script passes `BILLING_FAKE_ENABLED=true` and `BILLING_FAKE_FETCH_STATE=<SMOKE_FETCH_STATE>`
  in the `env` of every child it starts, and fails at start if `.env` disagrees with `SMOKE_FETCH_STATE`.
- **Time travel helper** `travel(subscriptionId, columns)`: every `UPDATE` of `subscriptions` period columns (design §17 item 2)
  also updates the same columns of `fake_billing_subscriptions` for that subscription, so a fetched state never undoes a back-date in
  the `true` mode. Each billing scenario that ends a subscription uses its own fake subscription id.
- Steps (each prints `ok — …` or throws), sessions first on a fresh learner: **B5#3 before B5#2** (five open-and-abandon while
  nothing is counted, then open three and answer the first question of each, fourth → 403; plan review #21), B5#23, then the billing
  chain (B5#4 → B5#13, B5#28 → B5#30, B5#33; every fake event that stands for a charge — `renewed`, `subscription_started` without
  a trial, `plan_changed` — carries `--tx` (D37), and B5#33 refunds that same `--tx`; "time passes" through `travel` or `psql` on the
  other columns of design §17 item 2,
  then one `pnpm maintenance:run`, which also sends due emails since Task 19 registers a single notices job), the ledger (B5#14 with
  `--parallel 10` and a limit of 1 → exactly one `reserved`; B5#15 by back-dating `expires_at`; B5#16 with `ai_daily_cap = 2`
  across three learners, then `GET /v1/admin/entitlements/ai-usage` shows `alert_reached: true` (D36: no email); B5#17;
  B5#20; B5#22), grants (B5#18, B5#19, B5#21, B5#31, B5#32, B5#35: `PATCH` the grant's `ends_at`
  one month later, read back `/v1/me/entitlements` and the user view's `changes`), B5#24 (10,001 private words inserted by SQL, then
  `private_words_per_user` lowered), B5#25, B5#26, B5#27.
- **Races** (Review Focus 1, plan review #7), each read back with `psql`:
  - B5E1: `fake-ai reserve --user <u> --parallel 10` with one unit left → exactly one `reserved`, nine `quota-exhausted`.
  - B5E11: ten learners with AI units, `ai_daily_cap` set so one unit of the cap is left, `fake-ai reserve --users <ten ids>
    --parallel 10` (one process, calls overlap) → exactly one `reserved`, nine `ai-unavailable`.
  - B5E73: 10 rounds on one learner. Each round: `psql` resets the learner to exactly 2 counted sessions today; `POST
    /v1/practice/sessions`; `POST /v1/practice/sessions/:id/next` for the first item; then `POST /v1/practice/sessions` and `POST
    /v1/practice/items/:id/answer` (each with its own `Idempotency-Key`) fired together with
    `Promise.all` over plain `fetch` (not the helper that waits out 429, which would break the overlap). Assert after each round:
    exactly one of the two succeeded (201 start, or 200 answer), and the learner never has more than 3 counted sessions today. Each
    round spends two `user.write` calls (30 per 60 s per user): wait 60 s before the rounds, or use two learners.
- The script reads `SMOKE_FETCH_STATE` (`true`/`false`) and prints the mode; expectations are the same in both modes.

- [ ] **Step 1:** Write the script; set `BILLING_FAKE_FETCH_STATE=true` in `.env`, start the API, run it on a fresh
  `english_learning_smoke_b5` with `SMOKE_FETCH_STATE=true` → fix until exit 0.
- [ ] **Step 2:** Recreate the database, set `BILLING_FAKE_FETCH_STATE=false` in `.env`, restart the API, run with
  `SMOKE_FETCH_STATE=false` → exit 0.
- [ ] **Step 3:** Recreate the database, run `pnpm smoke:buoc-4` (Task 20) → exit 0; CI green on every PR (list them).
- [ ] **Step 4:** Save both smoke outputs to `docs/deliveries/buoc-5-smoke-output.txt`; write the as-built section of
  `docs/deliveries/buoc-5.md` (PRs, test counts, smoke result, deviations, open risks from design §19); add the plan choices to the
  design as as-built notes.
- [ ] **Step 5: Commit** `feat(entitlements): add the bước 5 smoke and record the as-built`. Open **PR Z1**.
