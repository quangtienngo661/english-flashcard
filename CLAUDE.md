# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Always also check the global CLAUDE.md at `~/.claude/CLAUDE.md` — it defines behavioral rules
(`~/.claude/rules/*.md`) that apply across all projects.

## Overview

English vocabulary learning app (level- and topic-based) for web (Next.js) and mobile (Flutter), with staff
roles (`admin`, `editor`) authoring and approving content (originally a single owner; changed in Bước 1, D6). V1 adds: accounts; a curated catalog plus learners'
private words; quick-add of words encountered elsewhere; word groups, flashcards, and an automatic review
schedule; non-AI definition quizzes; AI-generated fill-in-the-blank practice graded by rule; tier-based
entitlements and quotas.

**Current phase (29/10/2026): Bước 8 (Google sign-in, account deletion, cancel plan; API, web, admin) is built and merged into `dev` (PR #172–#181, 29/10/2026; real Google not yet tried, see the section "Bước 8" below). Before that (28/10/2026): Bước 0, 1 (Identity core), 2 (Content + Pipeline), 2.5 (admin web, `apps/admin`), 3 (Learning +
the Content pieces deferred from Bước 2, system part only), 4 (Practice, API only), 5 (Entitlements, API only), 6 (AI Integration,
API only) and 7 (Practice AI + Content AI, API only) implemented; the learner web UI for Bước 3–7 (`apps/web` `/vi/app`, `/en/app`) is built
(section "Giao diện người học" below), blocked on production until Deploy; the admin UI round (24 screens in `apps/admin`) is built (section "Đợt giao diện admin" below).** Real code is
under `apps/api` and `apps/admin`. Historical implementation branches:
- `feat/buoc-0-backend-foundation` — Bước 0 built on **Drizzle ORM** (10 tasks, 5 unit + 23 e2e tests).
- `feat/migrate-drizzle-to-prisma` (branched from the above) — the same Bước 0 re-implemented on
  **Prisma ORM** (6-task migration, 5 unit + 24 e2e tests). This is the current/preferred ORM — the
  original reason to exclude Prisma (couldn't express row-locking) turned out to be stale once the
  locking mechanism itself changed to `pg_try_advisory_xact_lock`, which Prisma handles fine via TypedSQL.
  See `docs/superpowers/plans/2026-10-06-migrate-drizzle-to-prisma.md` for the full migration and why.

`main` holds Bước 0–3 (Bước 0–1 via PR #1–#5, the rest via the `dev` → `main` PR #45 of 18/10/2026; GitHub remote
`english-flashcard`, CI required before merge). **Bước 4–8 are on `dev` only** (PR #47–#58, #62–#78, #82, #84–#94 and #104–#116, 19–21/10/2026; Bước 8: PR #172–#181, 29/10/2026); no `dev` → `main` PR yet
(owner 19/10/2026: not needed yet; it opens only when the owner asks). As-built per Bước: sections below and `docs/deliveries/`.
- **Bước 2.5** (admin web: login, admin page, role granting, CSV flow; PR #17–#20, 15/10/2026). The owner's 15/10 note that the admin UI would be refactored is closed
  (owner AD2, 27/10/2026): UI refresh B (PR #22–#24) was that refactor, so the admin look is direction B and no longer provisional; B25E30 was fixed there
  (`docs/deliveries/ui-refresh-b.md`).
- **Bước 3** (system part: API, worker, DB; PR #28–#44; the owner confirmed the system part done 18/10/2026). The learner app
  (`apps/web` under `/vi/app`, `/en/app`) and the admin settings page ("Cài đặt hệ thống", which replaced the planned "Thông báo & giới hạn" page) were built later
  (sections below); UI decisions and mockups: `docs/mockups/2026-10-16/UI-CONTEXT.md`.
- **Bước 4** (Practice, API only, D24 Bước 4; PR #47–#58). Its learner and admin UI came in later rounds (sections below).
- **Bước 5** (Entitlements, API only, D2 Bước 5; PR #62–#78): plans Free / Trial / Pro, Free practice 3 sessions a day, the AI unit ledger
  with a system-wide daily cap and an on/off switch, staff grants, a provider-neutral billing gateway with a **fake** provider only (no real
  payment provider yet; auto-renewing subscriptions only, D35), trial and renewal emails, ad settings served by the API (no ad SDK). **Since
  Bước 5 every account is Free** (3 practice sessions a day), the owner's and test accounts included; an `admin` grants Pro or custom
  numbers when needed (D9). Its learner and admin UI came in later rounds (sections below).
- **Bước 6** (AI Integration, API only, D8 Bước 6; PR #82, #84–#94): one gateway module `ai` with three operations (`generate_cloze`,
  `lookup_word`, `translate_sentence`); OpenAI and Anthropic adapters on the official SDKs (**never called for real yet** as of 20/10/2026, D19) and a fake
  provider; admin APIs for models, per-operation choices (model, effort, thinking, max output tokens), prompts with history and a test run,
  an example set run in the worker (`ai-eval` queue), status, costs and calls; 10 s per call with one quick retry, 24 h replay per operation
  id, a daily provider-call cap, content kept 7 days. Locally `AI_FAKE_ENABLED=true` and both keys empty; `OPENAI_CUSTOM_HEADERS` /
  `ANTHROPIC_CUSTOM_HEADERS` must stay unset or the app refuses to start (D29). Its admin screens are built (M1a, M1b of the admin round).
- **Bước 0–3 fixes** (API + admin session layer only, D8 of its design; PR #98–#102, 21/10/2026) are on `dev`: accounts with names, birth
  date (13+) and terms consent (`TERMS_VERSION` now required), account lock, admin user list, who reviewed/published/hid each sense, revert and
  re-upload safety, practice masking and single-answer fixes, admin session handling when the API is briefly down; their admin screens (user list and account lock, who reviewed/published each sense) came with the admin round.
- **Bước 7** (Practice AI + Content AI, API only, D2 Bước 7; PR #104–#116): three AI question types inside the normal practice session
  (`cloze` from AI, `meaning_in_sentence`, `mcq_sentence`) and `cloze` from the learner's saved sentences, for Trial/Pro; AI units checked
  when a session opens, K questions made ahead (`POST /v1/practice/sessions/:id/prepare`, setting `practice.ai_prefetch_count`), a pending
  slot so a slot is generated and charged once, fallback to a non-AI type when AI fails; private words checked by AI
  (`check_private_word`); `POST /v1/lookup/ai` and saving its suggestion as a private word; admin-managed report reasons, refunds of
  confirmed AI errors, a staff list of AI forms the tables do not know. The three new AI operations (`generate_meaning_question`,
  `generate_sentence_mcq`, `check_private_word`) are seeded with **no model** (`model_ref NULL`), like Bước 6's: an admin chooses a model for
  each (and for `generate_cloze`, `lookup_word`) before learners get AI questions or lookups. **No real AI call yet** as of 21/10/2026 (D3 Bước 7). Its learner and admin UI came in later rounds (sections below).

**Next (21/10/2026; Bước 8 has since been built, 29/10/2026):** in the fixed build order, Bước 8 (Identity remainder: Google login, account deletion) came next; design Bước 7
§19 lists what account deletion must also remove. A first real AI call with the owner's own keys is worth doing early (design Bước 6 §19,
Bước 7 §20: AI question quality and the rule rejection rate are not measured yet). *(Update 28/10/2026: the learner UI for Bước 3–7 and the admin UI (24 screens, `docs/deliveries/giao-dien-admin.md`) are built; the work still open, and the first real AI call the owner reported on 28/10/2026, are in
`docs/preparation/IMPROVEMENT_PLAN_2026-10-28.md`.)* **Deploy** (hosting, durable Postgres/Redis, real SMTP, secrets, backup; design 2.5 §14) moved to **when the whole app is
complete, before launch** (D3 round 3 of Bước 3, 18/10/2026): until then the owner tries the app locally (reminder emails land in
Mailpit), `/app/*` stays blocked on production, and design Bước 3 §14 (things only checkable once deployed) is checked just before
launch; the items to do before launch are collected in `docs/deliveries/deploy-checklist.md`. There is no pilot after Bước 3 any more: real users are sought once the app is complete (D12 Bước 3).

**Q-A–Q-D** (end of `docs/preparation/PROJECT_ASSESSMENT_2026-10-15.md`) were decided in Bước 3's brainstorm
(`docs/superpowers/decisions/2026-10-16-buoc-3-learning-decisions.md`): **Q-A** full Bước 3 (D1); **Q-B** AI drafts the content as
CSV outside the app, the owner reviews and imports, a 20-word trial first (D5; target 8.812 words, D6); **Q-C** automatic
reminders, email only in Bước 3 (D8, D9; changes K25); **Q-D** no extra survey, step order unchanged until the app is complete,
success thresholds moved to before launch (D12). **UI refresh B** (owner 15/10/2026; PR #22–#24, 16/10/2026) is merged;
learner-facing web screens reuse its shared tokens (`packages/design-tokens`).

All 8 V1 specs (docs/specs/) are written and independently verified; treat
them as an initial skeleton only, not a source of truth to keep in sync (owner, 12/10/2026) — the design doc
for the step in question is authoritative. Read `docs/HANDOFF_2026-10-05_BUOC_0.md` for the original Bước 0
kickoff context, and `docs/superpowers/specs/2026-10-05-buoc-0-design.md` (now annotated with the Prisma
switch) for the as-built design.

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
  `fix-request`, …). For cloud sessions without the plugin, the superpowers skills are vendored as project
  skills in `.claude/skills/` (`superpowers:brainstorming` → `brainstorming`); see `.claude/skills/SUPERPOWERS.md`.
- **Git:** commit locally on a topic branch (`feat/*`, `fix/*`, `docs/*`, or the session's `claude/*` branch) as normal;
  **push, opening a PR into `dev`, and merging a PR once its CI is green need no approval** (owner: push/PR
  15/10/2026, merge 16/10/2026). A
  `dev` → `main` PR is the QA gate and opens only when the owner asks. Never PR or push straight to `main` from a
  topic branch: follow the branching model below. Scan for secrets before every push.

### Branching model (owner, 12/10/2026)

Goal: experimental versions never reach `main`; `main` only receives work that passed QA/QC.

| Branch | Holds | Topic branches PR into it | Reaches `main` when |
|---|---|---|---|
| `main` | Stable, accepted state. Only `main` deploys the landing (`deploy-web.yml`) | — | — |
| `dev` | Integration branch for **everything**: code (`apps/**`, migrations, CI) **and** documents (`docs/**`, `CLAUDE.md`); where QA/QC runs | `feat/*`, `fix/*`, `docs/*`, `claude/*` | QA/QC passes: CI green (`ci.yml`) **and**, for code, the design's "Xong khi" manual run; then the owner asks for a `dev` → `main` PR |

- A separate `documents` branch existed briefly (12/10/2026) and was dropped by the owner the same day: documents now go
  through `dev` like code. It was fully merged into `dev` (PR #12) before it was dropped.
- After any merge into `main`, merge `main` back into `dev`.
- A session's `claude/*` branch stays the working branch for that session and its PR targets `dev`.
- **CI/CD (owner, 12/10/2026):** `ci.yml` runs on **pull requests only** and does not re-run when a PR is merged. Since
  Bước 4 (D38–D41, 18/10/2026) `apps/api` has **no e2e suite**: job `api` = lint, typecheck, build, unit, schema drift
  (`prisma migrate diff`); jobs `web`, `admin` and `admin-e2e-real` (admin against the real API, Postgres, Redis, Mailpit)
  are unchanged. `deploy-web.yml` runs on push to `main` and only builds and deploys (no tests, not gated on CI).
  So a change is tested exactly once, on its PR, and a green CI on the PR is the only gate before `main`.
- Not done yet (owner action in GitHub settings): branch protection on `main` and `dev` — require a PR, require the `CI`
  check green, forbid direct pushes (a direct push to `main` would deploy untested code), and ideally "require branches to
  be up to date before merging" so the PR run tested the exact merge result.
- **The design doc is the official build document; `docs/specs/` is only the initial skeleton** (owner, 12/10/2026).
  Design docs may diverge from the specs as decisions change during analysis. Review a design doc on its own merits
  (consistency, buildability, fit with the owner's workflow), **not** against the specs; spec IDs (CR#, PR#, …) in a
  design doc are provenance only, and a divergence does not require editing the spec.
- **After brainstorming a design doc**, write a decision record in `docs/superpowers/decisions/` (rule
  `~/.claude/rules/decision-records.md`).
- Ask open decisions **one question at a time**, each with a concrete proposal and a label: owner-decided
  (chốt) / proposed (đề xuất) / `ASSUMPTION`. **Since Bước 3 the proposal comes after the owner's own answer** (next bullet).
- **The owner thinks first (owner, 15/10/2026 for Bước 3; kept in Bước 4, D27 Bước 4).** Goal: the owner keeps
  understanding the system and the code, not only approving them.
  - *Owner answers first, Claude proposes after* — for every open decision put to the owner. Claude asks with the context
    and constraints only: no proposal, no option marked "(Recommended)"; if options must be listed, none is favoured. After
    the owner answers, Claude gives its own proposal, says where it agrees or differs and why, and the owner decides
    (keeping their own answer is fine). Owner says "bỏ qua" / "không biết" for a question → Claude proposes as before, and
    the decision record says so; if the owner wants Claude's proposal first, they say so in that question (D27 Bước 4).
    Factual questions (a library's version, how existing code works) are not decisions: answer them, verified.
  - *Owner-written core piece* — set 15/10/2026 but **not applied so far**: Bước 3 had none (D14 Bước 3: "Claude handle hết,
    mình chỉ review"), nor did Bước 4 (D27 Bước 4: the owner reviews, writes no code). Instead the owner approves behaviour
    through an example table (Bước 3 design §6.4) rather than reading code. If a Bước brings it back: the plan marks one task
    owner-written; Claude does not write that code, only reviews it and explains or points the direction when the owner is
    stuck (no finished code unless explicitly asked); the plan decides who writes its tests.
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

Bước 0–7 are implemented (Bước 3 system part only, Bước 4–7 API only; see `docs/deliveries/`). Step 8 is still
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
  Content + Pipeline (admin side + read-only search only) → 2.5 web UI (login, admin page, role
  granting, CSV flow — done, design `docs/superpowers/specs/2026-10-14-buoc-2-5-admin-web-design.md`)
  → **UI refresh B** (landing + admin in direction B; done, PR #22–#24; design `docs/superpowers/specs/2026-10-15-ui-refresh-b-design.md`,
  deliveries `docs/deliveries/ui-refresh-b.md`, `docs/deliveries/admin-refresh-keepalive.md`)
  → **3 Learning**, plus the Content pieces deferred from Bước 2 (private words, context sentences, lookup chain), email
  reminders, admin-editable settings, inflections (system part done, PR #28–#44; its learner UI and admin screens came in later rounds) → **4 Practice non-AI** (API only;
  done, PR #47–#58) → **5 Entitlements** (API only; done, PR #62–#78) → **6 AI Integration gateway** (API only; done, PR #82–#94) → **7 Practice AI + Content AI** (incl. fill-in-the-blank from learners'
  sentences and the "sentence with the word, then choose" type, both moved from Bước 4; API only; done, PR #104–#116) → 8 Identity remainder (Google login,
  account deletion; forgot password already shipped in Bước 1) → **Deploy API + admin** (when the whole app is complete, before
  launch; D3 round 3 of Bước 3).
- Cross-cutting API conventions (system-spec SR7–SR14): `/v1` prefix, additive-only within v1; errors as
  `application/problem+json` (RFC 9457) with `type, status, title, detail, instance, operation_id`;
  pagination via `page_size` (default 20, max 100) + opaque `page_token`; `Idempotency-Key` scoped to
  (user, endpoint) — same key + same payload replays the stored result, transient failure releases the
  key, in-flight returns 409, different payload is rejected; logs carry `operation_id` and never contain
  passwords/OTP/tokens/raw answers/context sentences; timestamps stored UTC, day boundaries by the user's
  IANA timezone; per-user write rate limiting with 429 + retry-after.
- Background jobs: **BullMQ + Redis, for real background work only** (batch content authoring/import) —
  user-facing flows (question generation, answer grading) call AI directly in-request, not via queue.
- AI access goes through one gateway module `ai` with a provider port (`AiAdapter`): **OpenAI and Anthropic** through their
  official SDKs, plus a fake provider for tests and the smoke. No model is fixed in code: the admin adds models and chooses the
  model, effort and max output tokens per operation (`generate_cloze`, `lookup_word`, `translate_sentence`); no automatic switch
  between providers (Bước 6 design, D2, D6, D7, D13, D16, D21, D22, D25).
- Identity: email+password (self-built) and Google OAuth 2.0; OTP via Google SMTP for email verification
  and password reset only (never for login); per-device logout.
- Entitlements are per-feature (no single `is_pro` flag); entitlement ("allowed at all") is separate from
  quota ("how many uses left"); AI entitlement is checked at content *creation*, not at rule-based grading.

Still open and explicitly **not** blocking Step 0 (HANDOFF §6): ~~AI quota structure (K18)~~ decided in Bước 5 (D10–D14, D18);
external dictionary provider (K20); inflected-form/lemma data source (CR16, PRC7); personal-Gmail
SMTP viability; all capacity/cost numbers are estimates.

## Bước 0 — as-built

Moved to `docs/deliveries/buoc-0.md` (resolved 05–06/10/2026; 5 unit + 24 e2e tests).

## Bước 1 — as-built

Moved to `docs/deliveries/buoc-1.md` (07/10/2026; 339 unit + 182 e2e tests; includes the "Open decisions"
notes from that session).

## Bước 2 — plan & as-built

Moved to `docs/deliveries/buoc-2.md` (plan tóm tắt 12/10/2026; as-built 12–13/10/2026; 575 unit + 457 e2e
tests; PR #16 merged into `dev`).

## Bước 2.5 — plan & as-built

`docs/deliveries/buoc-2-5.md` (plan tóm tắt 14/10/2026; as-built 15/10/2026; PR #17–#20 merged into `dev`; admin 219 unit + 67 mocked e2e + 7 real-stack e2e). Test flow (gate, manual
"Xong khi" run, findings): `docs/deliveries/buoc-2-5-test-flow.md`. Design, decisions (D1–D28) and plan:
`docs/superpowers/{specs,decisions,plans}/2026-10-14-buoc-2-5-admin-web*.md`. Figma file `coVHzJwTFgMbooUrty7sOq`.

## Bước 3 — plan & as-built

`docs/deliveries/buoc-3.md` (plan tóm tắt 17/10/2026; as-built of the system part 18/10/2026; PR #28–#44; API 681 unit + 688 e2e
at the time). Manual run on a fresh DB with the real CEFR-J file and its findings (P1, P2): `docs/deliveries/buoc-3-test-flow.md`.
Design `docs/superpowers/specs/2026-10-16-buoc-3-learning-design.md`, decisions (D1–D48)
`docs/superpowers/decisions/2026-10-16-buoc-3-learning-decisions.md`, plan `docs/superpowers/plans/2026-10-17-buoc-3-learning.md`.

## Bước 4 — plan & as-built

`docs/deliveries/buoc-4.md` (plan tóm tắt 18/10/2026; as-built 19/10/2026; Practice, API only; PR #47–#58 merged into `dev`;
API 772 unit, backend e2e removed (D38); "Xong khi" = CI green on every PR + `pnpm smoke:buoc-4` on a fresh DB). Design, decisions
(D1–D42) and plan: `docs/superpowers/{specs,decisions,plans}/2026-10-18-buoc-4-practice*.md`.

## Bước 5 — plan & as-built

`docs/deliveries/buoc-5.md` (plan tóm tắt and as-built 19/10/2026; Entitlements, API only; PR #62–#78 merged into `dev`; API 1338 unit;
"Xong khi" = CI green on every PR + `pnpm smoke:buoc-5` on a fresh DB in both fetchState modes + `pnpm smoke:buoc-4`; outputs in
`docs/deliveries/buoc-5-smoke-output.txt`). Design, decisions (D1–D40) and plan: `docs/superpowers/{specs,decisions,plans}/2026-10-19-buoc-5-entitlements*.md`;
D39–D40 were decided while implementing. Run the smoke against a real API and worker started with `BILLING_FAKE_ENABLED=true` and
`BILLING_FAKE_FETCH_STATE=<true|false>`, then `SMOKE_FETCH_STATE=<same> pnpm smoke:buoc-5` (it stops when its own environment or `.env`
says another mode, but cannot see the running API's); `smoke:buoc-4` now
grants its learner 200 sessions a day first, since its learner is Free.

## Bước 6 — plan & as-built

`docs/deliveries/buoc-6.md` (plan tóm tắt and as-built 20/10/2026; AI Integration, API only; PR #82, #84–#94 merged into `dev`; API 1896
unit; "Xong khi" = CI green on every PR + `pnpm smoke:buoc-6` twice, each on a fresh DB; output in `docs/deliveries/buoc-6-smoke-output.txt`;
no real provider call, D19). Design, decisions (D1–D29) and plan: `docs/superpowers/{specs,decisions,plans}/2026-10-20-buoc-6-ai-integration*.md`;
D29 was decided while implementing. Run the smoke against a real API and worker started with `AI_FAKE_ENABLED=true`, no
`OPENAI_API_KEY` / `ANTHROPIC_API_KEY` and `JOB_QUEUE_PREFIX=wordmet-b6-smoke` on a fresh `english_learning_smoke_b6`, then `pnpm smoke:buoc-6`
(it stops when its own environment or `.env` says otherwise; B6#30 stops and starts the shared `redis` container). Learner calls in the smoke
go through `pnpm ai:fake-call`.

## Sửa thiếu sót Bước 0–3 — plan & as-built

`docs/deliveries/buoc-0-3-fixes.md` (plan tóm tắt 20/10/2026, as-built 21/10/2026; PR #98–#102 into `dev`; API 2096 unit, admin 329 unit; "Xong khi" =
CI green on every PR + the runtime gate of each milestone + `pnpm smoke:buoc-0-3-fixes` on a fresh DB, output in `docs/deliveries/buoc-0-3-fixes-smoke-output.txt`).
Design, decisions (D1–D17) and plan: `docs/superpowers/{specs,decisions,plans}/2026-10-20-buoc-0-3-fixes*.md`. Every local `apps/api/.env` needs `TERMS_VERSION`.

## Bước 7 — plan & as-built

`docs/deliveries/buoc-7.md` (plan tóm tắt and as-built 21/10/2026; Practice AI + Content AI, API only; PR #104–#116 merged into `dev`, #115 a
fix found by the smoke; API 2402 unit; "Xong khi" = CI green on every PR + `pnpm smoke:buoc-7` twice, each on a fresh DB, plus `smoke:buoc-4`,
`smoke:buoc-5` in both fetchState modes and `smoke:buoc-6`; output in `docs/deliveries/buoc-7-smoke-output.txt`; no real provider call, D3).
Design (as-built notes at the end of §2), decisions (D1–D34) and plan: `docs/superpowers/{specs,decisions,plans}/2026-10-21-buoc-7-practice-ai-content-ai*.md`;
Q&A log `docs/superpowers/reviews/2026-10-21-buoc-7-qa-log.md`, design review `docs/superpowers/reviews/2026-10-21-buoc-7-design-review.md`, code facts
`docs/preparation/BUOC_7_PLAN_CODE_FACTS_2026-10-21.md`. Run the smoke against a real API and worker started with `AI_FAKE_ENABLED=true`, no
`OPENAI_API_KEY` / `ANTHROPIC_API_KEY` and `JOB_QUEUE_PREFIX=wordmet-b7-smoke` on a fresh `english_learning_smoke_b7`, then `pnpm smoke:buoc-7`
(it chooses the fake models itself; registers 4 accounts, within the 5-per-IP-per-hour limit).

## Đợt giao diện (mockup Bước 3–7) — plan & as-built

`docs/deliveries/dot-giao-dien.md` (plan tóm tắt 21/10/2026, as-built 22/10/2026; Figma `7HcPAKLrWu32C27qYMJUOA` only, no code: web page 08, phone page 09,
admin page 04 at wireframe level, Dark samples, prototype flows "Web Bước 7: 1/2/3"). Design (D1–D17), decisions and plan:
`docs/superpowers/{specs,decisions,plans}/2026-10-21-dot-giao-dien*.md`; copy of every screen `docs/mockups/2026-10-21/ban-chu-giao-dien.md`; design §10 lists the
API additions the screens assume (staff emails in admin responses, `group_id` for weak words, `sense_ids[]` for bulk add).

## Giao diện người học (apps/web `/vi/app`, `/en/app`) — plan & as-built

`docs/deliveries/giao-dien-nguoi-hoc.md` (plan tóm tắt 22/10/2026; as-built per milestone, M1 23/10/2026); owner's manual test flow and Windows
setup `docs/deliveries/giao-dien-nguoi-hoc-test-flow.md`. Design (D1–D22), decisions and plan: `docs/superpowers/{specs,decisions,plans}/2026-10-22-giao-dien-nguoi-hoc*.md`.
One branch per milestone `feat/giao-dien-nguoi-hoc-<m1|m2|…>` from `origin/dev`. On Windows `pnpm dev:app` runs the app in a Linux container on :3001.
**Handoff: read `docs/deliveries/giao-dien-nguoi-hoc-handoff-2026-10-23.md` first (§0b is the latest state)** (method, conventions, rulings, what only runs on
the owner's Windows machine); the executing-plans ledger is `docs/deliveries/giao-dien-nguoi-hoc-ledger.md`. M1–M4 merged (PR #123–#126); M4b (Task 35–40,
transaction history: API `billing_transactions`, `/v1/me/transactions`, `/v1/admin/transactions`, learner `/app/settings/transactions`, admin `/transactions`)
merged (PR #127); M5a (Task 41–45, practice with AI questions) merged (PR #128); M5b (Task 46–48: AI lookup in Thêm từ, edit before saving, the
learner's own word page with [Sửa] [Xóa từ]) is the last PR of the round (26/10/2026); as-built of every milestone and the round's close-out (CSP fallback D20,
Worker size when the app is on; the "over the Free plan" note there is stale, see `deploy-checklist.md`, corrected 26/10/2026) at the end of `docs/deliveries/giao-dien-nguoi-hoc.md`. Owner 23/10/2026: no more stops for image or Figma
approval ("cứ triển khai mà làm"). Still left after the round: the owner's own pass through the test flow (D4). The admin screens other than "Giao dịch" were built later, in the admin round (next section).
Improvement ideas to weigh **after** the learner UI for Bước 3–7 is done (owner 23/10/2026; not decided): `docs/preparation/IMPROVEMENT_IDEAS_2026-10-23.md` (product C1–C10, overall assessment, how the project is run P1–P5).

## Đợt giao diện admin (apps/admin) — plan & as-built

`docs/deliveries/giao-dien-admin.md` (plan tóm tắt 27/10/2026; as-built per milestone and of the whole round, closed 28/10/2026; PR #144–#156 and #161 for the milestones, then #157, #159, #162–#165,
#169; CI green on every PR). 24 admin screens, every item of `apps/admin/src/app/nav.ts` (none shows "Sắp có" any more): AI (status, models, operations, prompts, example set, costs, calls),
system settings, reports / report reasons / refunds / unknown forms, users and grants, words / senses / topics. Added after the plan: AI dashboard at `/dashboard` (`ai.view`), bulk import of
eval examples (limit per operation now 1000), edit and delete for sources, eval runs, publish jobs and unused words (`docs/preparation/ADMIN_CRUD_SURVEY_2026-10-28.md`). Design, decisions (AD1–AD18) and
plan: `docs/superpowers/{specs,decisions,plans}/2026-10-27-giao-dien-admin*.md`; owner's test flow `docs/deliveries/giao-dien-admin-test-flow.md`. Not done: the dashboard's two missing numbers,
group B of the AI work (`docs/preparation/IMPROVEMENT_PLAN_2026-10-28.md` §4), Bước 8, Deploy.

## Bước 8 — plan & as-built

`docs/deliveries/buoc-8.md` (plan tóm tắt and as-built 29/10/2026; Google sign-in + account deletion + "Hủy gói"; API, web, admin). Design, decisions (D1–D33), review and plan: `docs/superpowers/{specs,decisions,reviews,plans}/2026-10-2{8,9}-buoc-8-*`.
Seven chained branches `feat/buoc-8-m1`…`m7` (PR #173–#179, after `docs/buoc-8-brainstorm`, PR #172), the docs branch `docs/buoc-8-as-built` (PR #180) and `fix/buoc-8-minors` (PR #181): **all merged into `dev` on 29/10/2026** at the owner's request, CI green on each PR first (`dev` at aacd0f4 after #181). API 3134 unit, web 723, admin 905; an independent final review found 1 Critical + 3 Important (fixed) and 8 Minor (R21 in `docs/deliveries/buoc-8-rulings.md`: M4, M6, M8 fixed in PR #181 `fix/buoc-8-minors`, M3 and M1 in `deploy-checklist.md`, M2, M5, M7 dropped); `pnpm smoke:buoc-8` passed twice on fresh DBs
(`docs/deliveries/buoc-8-smoke-output.txt`). **Not yet done:** real Google sign-in rounds 1 and 2 (D32; two `ASSUMPTION`s in design §19 unconfirmed; web Task 23 was made provisionally, ruling R13) and the browser pass with screenshots. Owner test flow (fake Google first, then real):
`docs/deliveries/buoc-8-test-flow.md`; every decision made while building: `docs/deliveries/buoc-8-rulings.md`; before launch: section "Bước 8" of `docs/deliveries/deploy-checklist.md`. Every local API environment file also needs `OAUTH_COOKIE_KEY` and `GOOGLE_REDIRECT_URI` when Google (real or `GOOGLE_FAKE_ENABLED=true`) is on.

## Đợt cải thiện nhóm A — plan & as-built

`docs/deliveries/dot-cai-thien-a.md` (plan tóm tắt 26/10/2026). Design, decisions (A0–A14) and plan: `docs/superpowers/{specs,decisions,plans}/2026-10-26-dot-cai-thien-a*.md`;
questions and answers `docs/superpowers/reviews/2026-10-26-dot-cai-thien-questions.md`; code facts `docs/preparation/DOT_CAI_THIEN_A_CODE_FACTS_2026-10-26.md`. Group B
(real AI call by Postman, eval, judge, prompt lifecycle) gets its own design after the first real AI call.

## Nhóm B (chất lượng AI) — plan & as-built

`docs/deliveries/nhom-b.md` (plan tóm tắt 29–30/10/2026, as-built per milestone M1–M6 và báo cáo cuối 31/10/2026; PR #191 docs, #192–#195, #197 và #198). Việc cần chủ dự án xem: `docs/deliveries/nhom-b-open-items.md`; smoke cuối: `docs/deliveries/nhom-b-smoke-output.txt`; chạy thật với model thật (C-T3) là việc của chủ dự án.

## Việc phải phân tích khi tới bước tương ứng (ghi 12/10/2026, từ brainstorm Bước 2)

Các điểm dưới đây phát sinh khi rà quyền của `admin`/`editor` (bảng D6) với các spec Bước 3–8. Chưa chốt, **không chặn Bước 2**;
đọc lại khi brainstorm bước ghi bên cạnh.

- **Bước 7 — danh sách dạng bất quy tắc (PRC7, QE5, Defense Analysis của Practice).** **Đã rõ ở Bước 7 (D15, 21/10/2026):** danh sách
  dạng chia bổ sung theo chữ ở Content, `admin` và `editor` (`content.edit`) nhận hoặc bỏ qua từ danh sách dạng AI dùng mà bảng chưa biết. Ghi chú cũ: Chuyển về Bước 7 (design Bước 4 §15):
  Bước 4 không có câu AI, và đã có bảng dạng chia AGID (D46 Bước 3). Kiểm rule câu AI sinh dạng chia bằng quy tắc cố định
  (`-s`, `-ed`, `-ing`…); dạng bất quy tắc (`go` → `went`, `gone`) không sinh được, nên câu AI đúng bị loại, sinh lại một lần
  và tốn thêm một lần gọi AI. Spec ghi "owner duy trì danh sách" nhưng **chưa gán quyền**. Đề xuất (chưa chốt): `questions.moderate`, vì dữ liệu thuộc Practice và người xử lý câu xấu là người thấy các câu bị loại nhầm.
  `content.edit` chỉ hợp cho dạng được chấp nhận theo từng sense (CR22, thuộc Content). Cần phân tích khi tới bước: danh sách
  lưu ở đâu (Practice sở hữu), thêm theo lemma hay theo sense, có nạp sẵn danh sách ban đầu không.
- **Bước 5–6 — xem chi phí AI và báo cáo đối soát** (AI Integration AR6, Entitlements): **chủ dự án chốt 12/10/2026** thuộc
  `ai.settings` (chỉ `admin`). **Đã rõ ở Bước 5 (19/10/2026, ⚠8 và D6 của design Bước 5):** bỏ quyền `ai.settings`, mọi con số hạn mức,
  tham số trial/Pro, công tắc và trần AI dùng lại `settings.manage` (chỉ `admin`). **Đã rõ ở Bước 6 (20/10/2026):** mọi API AI của admin,
  gồm tình trạng, chi phí và các lần gọi, cần `settings.manage` (chỉ `admin`; design Bước 6 §12.1, B6#25). **Ngoại lệ (chủ dự án 28/10/2026):** dashboard AI (`/v1/admin/ai/dashboard`, `/v1/admin/practice/ai-quality`,
  `/v1/admin/entitlements/ai-usage/days`) cần quyền `ai.view`, cả `admin` và `editor` đọc được; mọi cài đặt AI, chi phí và các lần gọi vẫn `settings.manage`.
- ~~**Bước 5 — `entitlements.grant` so với D6 ("editor không đụng chi phí AI").**~~ **Đã rõ ở Bước 5 (D6–D8, D33):** `editor` cấp gói Pro
  bình thường (kèm lượt AI cố định của gói) nhưng **không** đặt con số lượt AI tùy ý, chỉ cấp và thu hồi cho người học thường, không thu hồi
  được lần cấp có con số lượt AI; `admin` xem lịch sử cấp của editor và thu hồi. Trần AI toàn hệ thống mỗi ngày là `ai_daily_cap`.
- ~~**Sau Bước 3 — rà nghiệp vụ schema DB (chủ dự án 17/10/2026; chưa chốt, chưa sửa code).** DB1 `users` không có họ tên,
  ngày sinh (chủ động giới hạn theo IR21; chủ dự án muốn thêm); DB2 không lưu ai đã review/publish/gỡ/retire một nghĩa; DB3
  đăng ký không lưu việc đồng ý điều khoản và tuổi tối thiểu. DB2–DB3 nên xong trước pilot. Chi tiết, bằng chứng và câu còn
  mở: `docs/superpowers/reviews/2026-10-17-db-schema-business-review.md`.~~ **Đã rõ ở đợt sửa thiếu sót Bước 0–3 (21/10/2026, PR #99,
  #100):** DB1 họ, tên, ngày sinh (từ 13 tuổi); DB2 cột người review / publish / gỡ / retire, chỉ lần gần nhất (D9); DB3 thời điểm và phiên bản
  đồng ý điều khoản (D5). As-built: `docs/deliveries/buoc-0-3-fixes.md`.
- ~~**Giao diện cấp vai trò:**~~ **Đã rõ 13/10/2026:** chốt thành Bước 2.5 (D9, design Bước 2 mục 15) — giao diện
  web (đăng nhập, trang admin, cấp vai trò) ngay sau Bước 2, trước Bước 3. Xem bảng ở HANDOFF §2. Đã xong 15/10/2026
  (as-built ở `docs/deliveries/buoc-2-5.md`).

## Landing (apps/web) - as-built (08-09/10/2026)

- Stack: Next `16.4.3` (App Router), next-intl `4.14.9`, `@opennextjs/cloudflare` `1.20.13`, wrangler `4.153.0` (`apps/web`; `apps/admin` keeps wrangler `4.145.0`).
- Cloudflare Workers (`wordmet-web`) + D1 waitlist (`wordmet-waitlist`, binding `DB`); local data in `.wrangler/state`.
- Windows Worker build/e2e/static checks: `pnpm cf:docker` in a `node:24.11.0-bookworm` Linux container; WSL planned later.
- Next and `eslint-config-next` were held at `16.3.8` because OpenNext 1.20.7–1.20.9 broke Next `16.4` on the Worker; raised to `16.4.3`
  on 29/10/2026 (OpenNext `1.20.12`+ accepts Next `>=16.4.1`) to fix GHSA-2464-fhr4-w9xw, GHSA-673q-mjm6-r5xr (critical) and GHSA-p3m5-59mp-jv5r.
- Tooling: Node `24.11.0`, pnpm `11.6.0`, Vitest `4.1.11`, Playwright `1.63.0`.
- Design: `docs/superpowers/specs/2026-10-08-landing-deploy-design.md`.
- Plan: `docs/superpowers/plans/2026-10-08-landing-deploy.md`.
- Decisions: `docs/superpowers/decisions/2026-10-08-landing-deploy-decisions.md`.
- Status: Tasks 1-3 done; 4-7 in progress.

## Local setup (PowerShell)

From the repo root, start the local Postgres, Redis and Mailpit services, then prepare the API environment:

```powershell
docker compose up -d
Set-Location apps/api
Copy-Item .env.example .env
node scripts/gen-secret.mjs
```

Replace each secret placeholder in `.env` with a separate output from `node scripts/gen-secret.mjs`.
Keep `k1:` before the JWT secret. `.env.example` already has `REDIS_URL=redis://localhost:6380` (Bước 2);
Mailpit needs no SMTP credentials; its UI is at `http://localhost:8025`. Postgres listens on host port
**5434**, Redis on **6380** (5432/5433 and 6379 are used by other local projects on this machine). Then,
from `apps/api`:

```powershell
pnpm db:setup
```

`prisma.config.ts` loads `.env` when it exists. `db:setup` deploys migrations, then runs `prisma generate --sql`, which
emits both the Prisma client and TypedSQL (a second plain `prisma generate` wipes TypedSQL on Linux — seen in CI). The backend
e2e suite is gone (D38, Bước 4); the only Testcontainers run left is `pnpm test:scale`, the two load measurements kept as a
hand-run script, not in CI (D42), whose global setup runs the same sequence against a fresh Postgres container.

Running the API alone (`pnpm start`) does not process background jobs (CSV import, bulk publish) — it only
produces them. Run a separate worker process alongside it (after `pnpm build`, since it runs the compiled
`dist/worker.js`, not a `ts-node`-style watch mode):

```powershell
pnpm build
pnpm start:worker
```

`pnpm run:dev` (after `pnpm build`) runs the built API and worker together. The admin web (`apps/admin`, Bước 2.5)
runs with `pnpm dev` in `apps/admin` on **5173**, with `VITE_API_BASE_URL=http://localhost:3000`; the API's `.env`
needs `http://localhost:5173` in `CORS_ORIGINS` and `ADMIN_APP_URL=http://localhost:5173` (both in `.env.example`).
First admin: register through the API, verify with the OTP from Mailpit, then `pnpm admin:grant <email>` in `apps/api`.
Alternative to the steps above: `pnpm bootstrap` at the repo root runs the API, worker, admin and learner web in Docker; see `docs/deliveries/docker-bootstrap.md`.

## Machine state (verified 2026-10-05–07)

Node 24.11.0, pnpm 11.6.0, Docker client 28.5.1 available. **No `psql`.** Docker Desktop must be running
(it does not auto-start after a reboot); host ports 5432/5433 are taken by other local projects, so this repo's
Postgres uses **5434**. Docker daemon confirmed running
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

- As-built delivery records per Bước: `docs/deliveries/buoc-0.md`, `docs/deliveries/buoc-1.md`,
  `docs/deliveries/buoc-2.md` (includes its plan tóm tắt too), `docs/deliveries/buoc-2-5.md` (plan tóm tắt + as-built), `docs/deliveries/buoc-2-5-test-flow.md` (Bước 2.5 gate + manual run),
  `docs/deliveries/ui-refresh-b.md` (UI refresh B: plan tóm tắt + landing and admin as-built), `docs/deliveries/buoc-3.md` +
  `docs/deliveries/buoc-3-test-flow.md` (Bước 3 system part), `docs/deliveries/buoc-4.md` (Bước 4, Practice API),
  `docs/deliveries/buoc-5.md` + `docs/deliveries/buoc-5-smoke-output.txt` (Bước 5, Entitlements API),
  `docs/deliveries/buoc-6.md` + `docs/deliveries/buoc-6-smoke-output.txt` (Bước 6, AI Integration API),
  `docs/deliveries/buoc-7.md` + `docs/deliveries/buoc-7-smoke-output.txt` (Bước 7, Practice AI + Content AI API),
  `docs/deliveries/buoc-0-3-fixes.md` + `docs/deliveries/buoc-0-3-fixes-smoke-output.txt` (Bước 0–3 fixes),
  `docs/deliveries/deploy-checklist.md` (what to do before launch).
- Bước 2 test flow (automated gate, `pnpm smoke:buoc-2`, manual steps): `docs/deliveries/buoc-2-test-flow.md`.
- Spec index and status: `docs/specs/README.md`.
- Spec/design-doc writing convention (edge cases must be derived per-doc, not just cited): `docs/specs/SPEC_WRITING_CONVENTIONS.md`.
- Full project context, product decisions, and evidence log: `docs/preparation/PROJECT_CONTEXT.md`.
- Session handoff / current status (read first): `docs/HANDOFF_2026-10-05_BUOC_0.md`.
- Bước 0 design (as-built, with the Prisma-switch correction note): `docs/superpowers/specs/2026-10-05-buoc-0-design.md`.
- Bước 0 implementation plan (Drizzle, historical — tasks 3/7/9/10 superseded): `docs/superpowers/plans/2026-10-05-buoc-0-backend-foundation.md`.
- Drizzle→Prisma migration plan (current ORM, full rationale + review history): `docs/superpowers/plans/2026-10-06-migrate-drizzle-to-prisma.md`.
