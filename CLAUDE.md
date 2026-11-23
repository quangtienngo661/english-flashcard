# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Always also check the global CLAUDE.md at `~/.claude/CLAUDE.md` — it defines behavioral rules (`~/.claude/rules/*.md`) that apply across all projects.

## Overview & Current State

Wordmet is an English vocabulary learning app (CEFR A1–C2 and topic-based) for web (`apps/web`, Next.js on Cloudflare Workers), admin (`apps/admin`, Vite/React on Cloudflare Workers), and API/worker (`apps/api`, NestJS + Prisma + PostgreSQL 17 + BullMQ/Redis 7.4 on one VPS behind Caddy). A Flutter mobile app will share the same `/v1` API later.

**Current phase (24/11/2026): production is live on `main` (`d39b5a17`), preparing for public pilot launch.**
- **Live services:** API & worker on VPS (`/srv/wordmet`, Caddy `2.11.9`, Postgres 17 with `wordmet_app`/`wordmet_migrator` roles and 60s WAL-G archiving to R2, Redis 7.4), Cloudflare Workers (`wordmet.com` + `admin.wordmet.com`), R2 TTS (`audio.wordmet.com`, 9,481 ready), Resend SMTP, UptimeRobot on `/v1/health/ready`, legal v1 published, 9,806 published senses, payOS VietQR live.
- **Pre-launch checklist:** `docs/deliveries/deploy-checklist.md`.
- **Full architecture:** `docs/ARCHITECTURE.md`.
- **Operations & recovery:** `deploy/README.md`, `docs/deliveries/deploy-production-runbook.md`, `docs/deliveries/runbook-vps-loss.md`.
- **Historical per-step notes (Bước 0–8 & launch rounds):** `docs/deliveries/HISTORY.md`.

## Directory Structure

- `apps/api/` — NestJS modular monolith (`/v1`) + BullMQ worker + Prisma models (`apps/api/prisma/models/`).
- `apps/web/` — Next.js `16.4.3` landing page + learner app (`/vi/app`, `/en/app`) on Cloudflare Workers (`@opennextjs/cloudflare`).
- `apps/admin/` — Vite + React staff app (`admin` / `editor`) on Cloudflare Workers.
- `packages/design-tokens/` — shared Tailwind v4 `@theme` colour/font tokens (design direction B).
- `deploy/` — production `compose.prod.yml`, Caddyfile, and operational scripts (`deploy/scripts/`).
- `scripts/` — root helper scripts (`bootstrap.mjs`, `check-docs.mjs`).
- `docs/superpowers/{specs,decisions,plans,reviews}/` — authoritative design docs, decision records, and plans per milestone.
- `docs/deliveries/` — as-built records, smoke outputs, checklists, and `HISTORY.md`.
- `docs/specs/` — original V1 skeleton specs (provenance only; not kept in sync; design docs are authoritative).
- `docs/preparation/` — discovery, surveys, competitor notes, and pilot guides.

## Working Rules

- **Design before code:** no code, scaffold, or dependency installs until the owner approves a design doc and plan. Reading/writing docs is fine.
- **Superpowers workflow:** use `brainstorming` → `writing-plans` → `test-driven-development` → `verification-before-completion` (vendored in `.claude/skills/` when running without the plugin).
- **Owner thinks first:** for open design decisions, present context and constraints without a favoured option; propose only after the owner answers (unless they say "bỏ qua" / ask for a proposal first). Write a decision record in `docs/superpowers/decisions/` after brainstorming.
- **Edge cases:** any spec or design doc citing a system-spec rule (`K#`/`SR#`/`S#`/`SE#`) must write its own concrete When → Then edge cases (`docs/specs/SPEC_WRITING_CONVENTIONS.md`).
- **Verify facts:** check current docs or run commands in-session rather than relying on memory.
- **Reports:** short, decision-sufficient, in Vietnamese with English technical terms kept as-is.
- **Secret hygiene:** scan diffs for secrets/PII before every push; never read or print VPS `.env`, `ops.env`, or `walg.env`.

### Branching & CI/CD

| Branch | Holds | Topic branches PR into it | Reaches `main` when |
|---|---|---|---|
| `main` | Live production state; pushes trigger `deploy-web.yml` (unless `DEPLOY_PAUSED=true` or docs-only) | — | — |
| `dev` | Integration branch for code and docs | `feat/*`, `fix/*`, `docs/*`, `claude/*` | CI green + manual "Xong khi" gate; `dev` → `main` PR opens only when the owner asks |

- Pushing a topic branch, opening a PR into `dev`, and merging into `dev` once CI is green need no extra approval unless the owner overrides it in-session; never PR or push straight to `main` from a topic branch. After merging into `main`, merge `main` back into `dev`.
- **CI (`.github/workflows/ci.yml`)** runs on pull requests only (never re-runs on merge):
  - `api`: lint, typecheck, build, unit tests, schema drift (`prisma migrate diff`), migration safety (`check-migrations.mjs`), documentation check (`pnpm test:docs`).
  - `api-integration`: real Postgres + Redis tests via Testcontainers (`pnpm test:integration`).
  - `web`: lint, typecheck, unit, build, Playwright + axe e2e.
  - `admin`: lint, typecheck, unit, build, mocked e2e.
  - `admin-e2e-real`: admin against real API, worker, Postgres, Redis, Mailpit.
- **Branch protection:** `main` is protected by ruleset `validate-before-merge-main`.

## Architecture & Key Conventions

- **Modular monolith:** 12 modules under `apps/api/src/` (`identity`, `content`, `content-pipeline`, `learning`, `practice`, `entitlements`, `ai`, `settings`, `notifications`, `legal`, `faq`, `common`). Each owns its Prisma model file in `apps/api/prisma/models/`; no cross-module `@relation` (plain UUID columns; call exported services).
- **API conventions:** `/v1` prefix; RFC 9457 `application/problem+json` errors with `operation_id`; cursor pagination (`page_size`, `page_token`); `Idempotency-Key` scoped to `(user, endpoint)`; UTC timestamps with per-user IANA timezone day boundaries; per-user/IP rate limits returning 429 + `Retry-After`.
- **Request vs. background:** AI question generation, rule-based grading, and payment webhooks run in-request; CSV import, bulk publish, TTS → R2, reminder emails, and AI evals run in BullMQ queues in the worker.
- **AI gateway:** single `ai` module with OpenAI, Anthropic, and fake adapters; no model hardcoded (configured per operation in admin); AI never grades learner answers.
- **Payments & entitlements:** per-feature entitlements separate from quotas; payOS VietQR prepaid 1/3/12-month periods (no auto-renewal); fake provider for local/tests.

## Local Setup & Common Commands (PowerShell)

**Quick start (full stack in Docker):**
```powershell
pnpm install
pnpm bootstrap         # starts Postgres, Redis, Mailpit, API, worker, web, admin
pnpm bootstrap seed    # sample catalog + admin & Pro learner accounts
```

**Host development:**
```powershell
docker compose up -d                    # Postgres :5434, Redis :6380, Mailpit :8025
Set-Location apps/api
Copy-Item .env.example .env             # fill secrets via `node scripts/gen-secret.mjs` (keep `k1:` on JWT secret)
pnpm db:setup                           # migrate + prisma generate
pnpm build
pnpm run:dev                            # API :3000 + worker (or `pnpm start` + `pnpm start:worker`)
```
- **Admin:** `Set-Location apps/admin; pnpm dev` (`http://localhost:5173`; grant first admin with `pnpm admin:grant <email>` in `apps/api`).
- **Web:** `Set-Location apps/web; pnpm dev` (landing) or `pnpm dev:app` (learner app in Linux container on `:3001`; Worker build/e2e on Windows via `pnpm cf:docker`).
- **Tests:**
  - Root docs check: `pnpm test:docs`
  - API: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm test:integration` (real Postgres via Testcontainers), `pnpm test:scale` (manual)
  - Web: `pnpm lint`, `pnpm typecheck`, `pnpm test`
  - Admin: `pnpm lint`, `pnpm typecheck`, `pnpm test`
- **Machine notes:** Node `24.11.0`, pnpm `11.6.0`, Docker Desktop required (no local `psql`; Postgres on host port `5434`, Redis on `6380`).

## Delivery Records Index

See `docs/deliveries/HISTORY.md` for detailed phase summaries. One-line pointers to key delivery records:

- `docs/deliveries/buoc-0.md`, `docs/deliveries/buoc-1.md`, `docs/deliveries/buoc-2.md` — Foundation, Identity core, Content + Pipeline.
- `docs/deliveries/buoc-2-5.md`, `docs/deliveries/ui-refresh-b.md` — Initial Admin web UI and direction B refresh.
- `docs/deliveries/buoc-3.md`, `docs/deliveries/buoc-4.md`, `docs/deliveries/buoc-5.md` — Learning, Practice non-AI, Entitlements APIs.
- `docs/deliveries/buoc-6.md`, `docs/deliveries/buoc-0-3-fixes.md`, `docs/deliveries/buoc-7.md` — AI gateway, Bước 0–3 fixes, Practice/Content AI APIs.
- `docs/deliveries/dot-giao-dien.md`, `docs/deliveries/giao-dien-nguoi-hoc.md`, `docs/deliveries/giao-dien-admin.md` — Mockups, Learner Web UI v1, 24-screen Admin UI.
- `docs/deliveries/buoc-8.md` — Google sign-in, account deletion, cancel plan.
- `docs/deliveries/dot-cai-thien-a.md`, `docs/deliveries/nhom-b.md`, `docs/deliveries/dot-cai-thien-c.md` — Improvement rounds A, B (AI quality/eval/retention), and C (Học/Ôn, streaks, IPA, Google TTS → R2).
- `docs/deliveries/legal-documents.md`, `docs/deliveries/landing-redesign.md`, `docs/deliveries/nguon-du-lieu.md` — Admin-managed legal docs, landing redesign, public `/sources` page.
- `docs/deliveries/chuan-bi-launch-a.md`, `docs/deliveries/chuan-bi-launch-b.md` — Launch prep A (Turnstile, Free AI, trial off) and B (payOS VietQR, CSP nonce).
- `docs/deliveries/session-synonyms.md`, `docs/deliveries/cloze-own-then-ai.md`, `docs/deliveries/practice-ai-count.md` — Cloze session synonyms, `own_then_ai`, learner-chosen `ai_count`.
- `docs/deliveries/giao-dien-moi.md`, `docs/deliveries/ui-copy-round-2.md`, `docs/deliveries/email-giao-dien.md` — New learner UI, copy round 2, 17 HTML email templates.
- `docs/deliveries/pre-launch-fixes.md`, `docs/deliveries/prod-deploy.md`, `docs/deliveries/restore-safety.md`, `docs/deliveries/landing-live-plans.md` — Security fixes, VPS production deploy, WAL-G/restore safety, live landing prices.
- `docs/deliveries/deploy-checklist.md`, `docs/deliveries/deploy-production-runbook.md`, `docs/deliveries/runbook-vps-loss.md`, `docs/deliveries/audit-fixes-a11y-checklist.md` — Pre-launch checklist, VPS runbooks, pilot a11y checklist.
