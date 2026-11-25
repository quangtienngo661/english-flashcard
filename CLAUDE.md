# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Always also check the global CLAUDE.md at `~/.claude/CLAUDE.md` — it defines behavioral rules (`~/.claude/rules/*.md`) that apply across all projects.

## Overview & Current State

Wordmet is an English vocabulary learning app (CEFR A1–C2 and topic-based) for web (`apps/web`, Next.js on Cloudflare Workers), admin (`apps/admin`, Vite/React on Cloudflare Workers), and API/worker (`apps/api`, NestJS + Prisma + PostgreSQL 17 + BullMQ/Redis 7.4 on one VPS behind Caddy). A Flutter mobile app will share the same `/v1` API later.

**Current phase (24/11/2026): production is live on `main` (`d39b5a17`), preparing for public pilot launch.**
- **Live services:** API & worker on VPS (`/srv/wordmet`, Caddy `2.11.9`, Postgres 17 with `wordmet_app`/`wordmet_migrator` roles and 60s WAL-G archiving to R2, Redis 7.4), Cloudflare Workers (`wordmet.com` + `admin.wordmet.com`), R2 TTS (`audio.wordmet.com`, 9,481 ready), Resend SMTP, UptimeRobot on `/v1/health/ready`, legal v1 published, 9,806 published senses, payOS VietQR live.
- **Seeded AI operations:** every seeded AI operation has **no model** (`model_ref NULL`) until an admin picks one per operation before learners get AI questions or lookups.
- **Branch protection:** `main` is protected by ruleset `validate-before-merge-main` (4 required checks `api`/`web`/`admin`/`admin-e2e-real`, strict, no bypass) and `dev` is covered by the same ruleset through `~DEFAULT_BRANCH`.
- **Google sign-in:** real Google sign-in rounds 1–2 are still pending (Bước 8 design §19 `ASSUMPTION`s).
- **Remaining pre-pilot items:** tracked in `docs/deliveries/deploy-checklist.md`.
- **Key pointers:** `docs/HANDOFF_2026-10-05_BUOC_0.md` (original kickoff & binding rules), `docs/preparation/PROJECT_CONTEXT.md` (product context & evidence log), `docs/specs/README.md` (initial V1 skeleton specs, not kept in sync; design docs are authoritative), `docs/mockups/2026-10-16/UI-CONTEXT.md` (UI context), `docs/preparation/IMPROVEMENT_PLAN_2026-10-28.md` (open improvement plan), `docs/ARCHITECTURE.md` (full architecture), `deploy/README.md`, `docs/deliveries/deploy-production-runbook.md`, `docs/deliveries/runbook-vps-loss.md`, and `docs/deliveries/HISTORY.md` (per-Bước history).

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

These come directly from the project owner (`docs/HANDOFF_2026-10-05_BUOC_0.md` §3) and are binding until they say otherwise:

- **No code, no scaffold, no dependency installs** until the owner has approved a design doc and a plan for the piece of work in question. Reading and writing docs is fine.
- Use the **superpowers** skill chain (`brainstorming` → `writing-plans` → `test-driven-development`, …) for this project's workflow, **not** the harness's own workflows (`build-feature`, `write-spec`, `fix-request`, …). For cloud sessions without the plugin, the superpowers skills are vendored as project skills in `.claude/skills/` (`superpowers:brainstorming` → `brainstorming`); see `.claude/skills/SUPERPOWERS.md`.
- **Git:** commit locally on a topic branch (`feat/*`, `fix/*`, `docs/*`, or the session's `claude/*` branch) as normal; **push, opening a PR into `dev`, and merging a PR once its CI is green need no approval** (owner: push/PR 15/10/2026, merge 16/10/2026). A `dev` → `main` PR is the QA gate and opens only when the owner asks. Never PR or push straight to `main` from a topic branch: follow the branching model below. Scan for secrets before every push.
- **After brainstorming a design doc**, write a decision record in `docs/superpowers/decisions/` (rule `~/.claude/rules/decision-records.md`).
- Ask open decisions **one question at a time**, each with a concrete proposal and a label: owner-decided (chốt) / proposed (đề xuất) / `ASSUMPTION`. **Since Bước 3 the proposal comes after the owner's own answer** (next bullet).
- **The owner thinks first (owner, 15/10/2026 for Bước 3; kept in Bước 4, D27 Bước 4).** Goal: the owner keeps understanding the system and the code, not only approving them.
  - *Owner answers first, Claude proposes after* — for every open decision put to the owner. Claude asks with the context and constraints only: no proposal, no option marked "(Recommended)"; if options must be listed, none is favoured. After the owner answers, Claude gives its own proposal, says where it agrees or differs and why, and the owner decides (keeping their own answer is fine). Owner says "bỏ qua" / "không biết" for a question → Claude proposes as before, and the decision record says so; if the owner wants Claude's proposal first, they say so in that question (D27 Bước 4). Factual questions (a library's version, how existing code works) are not decisions: answer them, verified.
- Reports: short, decision-sufficient, in Vietnamese with English technical terms kept as-is (`endpoint`, `deploy`, `rollback`).
- Before asserting a fact about a library or its version, check current docs (context7) or verify by running it in-session — do not rely on memory.
- **Any spec or design doc that cites a higher-level rule (system-spec's K#/SR#/S#/SE#) must also write its own When → Then edge cases for how its specific tech/scope implements that rule** — see `docs/specs/SPEC_WRITING_CONVENTIONS.md`.
- **Module boundaries (D3):** each module owns `apps/api/prisma/models/<module>.prisma`; only its code queries its tables. Other modules call its exported service. No Prisma `@relation` crosses module boundaries; cross-module references are plain UUID columns. Only `src/identity/**` touches Identity tables; other modules call `IdentityService`. `src/common/**` never imports from `src/identity/**`. This is a review convention, not enforced by tooling.

### Codex review workflow

Bước 0's Prisma migration was executed with Claude writing/reviewing the plan, **Codex (`gpt-6.1-sol`)** implementing each task, **Codex (`gpt-6-astra`)** reviewing each task's diff before the next one started, and Claude doing a final independent re-verification (fresh build + test run) at the end. Codex's sandbox could not reach Docker or the npm registry in this environment — Claude always had to pick up install/generate/test-run/commit after Codex wrote the files. This combination (Codex implements + reviews in two different models, Claude verifies with real tool access) is the user's preferred flow for Codex-delegated implementation work on this project; see `docs/superpowers/plans/2026-10-06-migrate-drizzle-to-prisma.md` for a concrete example of the loop catching real bugs each round.

### Branching & CI/CD

| Branch | Holds | Topic branches PR into it | Reaches `main` when |
|---|---|---|---|
| `main` | Stable, accepted state. Only `main` deploys: API, web and admin (`deploy-web.yml`, workflow Deploy) | — | — |
| `dev` | Integration branch for code and docs | `feat/*`, `fix/*`, `docs/*`, `claude/*` | CI green + manual "Xong khi" gate; `dev` → `main` PR opens only when the owner asks |

- After merging into `main`, merge `main` back into `dev`.
- **CI (`.github/workflows/ci.yml`)** runs on pull requests only (never re-runs on merge):
  - `api`: lint, typecheck, build, unit tests, schema drift (`prisma migrate diff`), migration safety (`check-migrations.mjs`), documentation check (`pnpm test:docs`).
  - `api-integration`: real Postgres + Redis tests via Testcontainers (`pnpm test:integration`).
  - `web`: lint, typecheck, unit, build, Playwright + axe e2e.
  - `admin`: lint, typecheck, unit, build, mocked e2e.
  - `admin-e2e-real`: admin against real API, worker, Postgres, Redis, Mailpit.

## Architecture & Key Conventions

- **Modular monolith:** 12 modules under `apps/api/src/` (`identity`, `content`, `content-pipeline`, `learning`, `practice`, `entitlements`, `ai`, `settings`, `notifications`, `legal`, `faq`, `common`).
- **API conventions:** `/v1` prefix; RFC 9457 `application/problem+json` errors with `operation_id`; cursor pagination (`page_size`, `page_token`); `Idempotency-Key` scoped to `(user, endpoint)`; UTC timestamps with per-user IANA timezone day boundaries; per-user/IP rate limits returning 429 + `Retry-After`.
- **Request vs. background:** AI question generation, rule-based grading, and payment webhooks run in-request; CSV import, bulk publish, TTS → R2, reminder emails, and AI evals run in BullMQ queues in the worker.
- **AI gateway & permissions:** single `ai` module with OpenAI, Anthropic, and fake adapters; no model hardcoded; AI never grades learner answers. AI dashboard permission split (AD19): `ai.view` (`admin` and `editor`) for the dashboard endpoints (`/v1/admin/ai/dashboard`, `/v1/admin/practice/ai-quality`, `/v1/admin/entitlements/ai-usage/*`, `/v1/admin/learning/retention`, `/v1/admin/learning/pilot-metrics`), and `settings.manage` (`admin` only) for AI settings, costs, and calls.
- **Payments & entitlements:** per-feature entitlements separate from quotas; payOS VietQR prepaid 1/3/12-month periods (no auto-renewal); fake provider for local/tests.

## Local Environment & Common Commands (PowerShell)

**Quick start (full stack in Docker):** `pnpm install`, `pnpm bootstrap`, `pnpm bootstrap seed` — see `docs/deliveries/docker-bootstrap.md`.

**Host development:**
```powershell
docker compose up -d                    # Postgres :5434, Redis :6380, Mailpit :8025
Set-Location apps/api
Copy-Item .env.example .env             # fill secrets via `node scripts/gen-secret.mjs` (keep `k1:` on JWT secret)
pnpm db:setup                           # migrate + prisma generate
pnpm build
pnpm run:dev                            # API :3000 + worker (or `pnpm start` + `pnpm start:worker`)
```
- **Required local env keys (`.env` in `apps/api`, template `apps/api/.env.example`):**
  - Every local API `.env` needs `TERMS_VERSION`, plus `OAUTH_COOKIE_KEY` and `GOOGLE_REDIRECT_URI` when Google (real or `GOOGLE_FAKE_ENABLED=true`) is on.
  - Admin dev (`apps/admin` on `5173`, `VITE_API_BASE_URL=http://localhost:3000`) needs `http://localhost:5173` in `CORS_ORIGINS` and `ADMIN_APP_URL=http://localhost:5173`.
  - Local AI uses `AI_FAKE_ENABLED=true` with both `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` empty (`OPENAI_CUSTOM_HEADERS` / `ANTHROPIC_CUSTOM_HEADERS` must stay unset, D29).
- **Smoke run conditions (fresh DB, real API + worker):**
  - `pnpm smoke:buoc-5`: start API and worker with `BILLING_FAKE_ENABLED=true` and `BILLING_FAKE_FETCH_STATE=<true|false>`, then run `SMOKE_FETCH_STATE=<same> pnpm smoke:buoc-5`.
  - `pnpm smoke:buoc-6`: start API and worker with `AI_FAKE_ENABLED=true`, no `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`, and `JOB_QUEUE_PREFIX=wordmet-b6-smoke` on a fresh `english_learning_smoke_b6`.
  - `pnpm smoke:buoc-7`: start API and worker with `AI_FAKE_ENABLED=true`, no `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`, and `JOB_QUEUE_PREFIX=wordmet-b7-smoke` on a fresh `english_learning_smoke_b7`.
- **Admin & Web:** `apps/admin` (`pnpm dev` on `:5173`; first admin via `pnpm admin:grant <email>` in `apps/api`); `apps/web` (`pnpm dev` for landing, `pnpm dev:app` for learner app in Linux container on `:3001`, `pnpm cf:docker` for Worker build/e2e on Windows).
- **Tests:**
  - Root docs check: `pnpm test:docs` (`node --test "scripts/*.test.mjs" && node scripts/check-docs.mjs`)
  - API: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm test:integration` (real Postgres via Testcontainers), `pnpm test:scale` (manual)
  - Web & Admin: `pnpm lint`, `pnpm typecheck`, `pnpm test`
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
- `docs/deliveries/deploy-checklist.md`, `docs/deliveries/deploy-production-runbook.md`, `docs/deliveries/runbook-vps-loss.md`, `docs/deliveries/audit-fixes-a11y-checklist.md`, `docs/deliveries/docker-bootstrap.md` — Pre-launch checklist, VPS runbooks, pilot a11y checklist, Docker bootstrap.
