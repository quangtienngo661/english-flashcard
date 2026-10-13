# Bước 1 — as-built (07/10/2026)

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
- Tests: 339 unit + 182 e2e (real Postgres + Mailpit via Testcontainers); suites that depend on global state
  use `createIsolatedDatabase()`. A manual run against the built API (register → OTP from Mailpit → verify
  → refresh → password change → logout → admin:grant → admin endpoint) passed on 07/10.
- Execution: Codex `gpt-6.1-sol` implemented, `gpt-6-astra` (medium effort) reviewed each task; Tasks 13–14
  were self-reviewed by Claude while Codex was over its usage limit (no independent review for those two).

Graceful shutdown (`enableShutdownHooks`) drains pending mail. Merged via PR #4 after CI.

Bước 1 open items: all rate-limit/lockout/budget numbers are `ASSUMPTION` (configurable); same-user lock
contention can exhaust the 10-connection pool (accepted at pilot scale); Gmail-personal SMTP limits still
unsourced; `otp_failure_windows` and `mail_budget_buckets` are never cleaned (grow slowly).

## Open decisions for the next session (read before doing anything else)

Bước 0 and Bước 1 are merged (PR #1–#5). The module-boundary convention is chốt as D3 (see CLAUDE.md's
"Architecture & Key Decisions"). The Bước 1 spec deviations (design §11) were applied to `docs/specs/` on
07/10 — look for "Sửa 07/10/2026 theo Bước 1".

1. **Chốt by the owner (07/10/2026):** B0E1 — an orphaned `in_progress` idempotency row returns 409
   `idempotency-key-abandoned` and the client starts over with a new key (it is not re-run). Note: a real
   crash rolls the row back with the handler's transaction, so a retry after a crash simply runs fresh.
   `Idempotency-Key` stays mandatory on `@Idempotent()` endpoints (400 if missing) with the 30 s default timeout.
2. *(resolved, see 1)*
3. **Prisma pinned to `7.10.0`** (exact, no `^`) because the npm `latest` tag currently points at a `8.0.0-rc`
   prerelease — re-check when Prisma 8 reaches a real stable release.
