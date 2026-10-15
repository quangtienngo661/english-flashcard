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

**Current phase: Bước 0, 1 (Identity core), 2 (Content + Pipeline) and 2.5 (admin web, `apps/admin`) implemented;
next is Bước 3 (Learning).** Real code is under `apps/api` and `apps/admin`. Historical implementation branches:
- `feat/buoc-0-backend-foundation` — Bước 0 built on **Drizzle ORM** (10 tasks, 5 unit + 23 e2e tests).
- `feat/migrate-drizzle-to-prisma` (branched from the above) — the same Bước 0 re-implemented on
  **Prisma ORM** (6-task migration, 5 unit + 24 e2e tests). This is the current/preferred ORM — the
  original reason to exclude Prisma (couldn't express row-locking) turned out to be stale once the
  locking mechanism itself changed to `pg_try_advisory_xact_lock`, which Prisma handles fine via TypedSQL.
  See `docs/superpowers/plans/2026-10-06-migrate-drizzle-to-prisma.md` for the full migration and why.

Bước 0 and Bước 1 are on `main` (PR #1–#5; GitHub remote `english-flashcard`, CI required before merge).
Bước 2 is on `dev` (PR #16). **Bước 2.5 (admin web: login, admin page, role granting, CSV flow) is done and on
`dev`** (15/10/2026): M1 backend #17, M2 admin shell #18, M3 CSV flow + real-stack e2e + UI guideline fixes #19,
docs #20; all three "Xong khi" criteria met (CI incl. `admin-e2e-real` green, manual run on a fresh DB with the real
CEFR-J file). As-built and findings: `docs/deliveries/buoc-2-5.md`, `docs/deliveries/buoc-2-5-test-flow.md`. Not yet
on `main` (a `dev` → `main` PR opens only when the owner asks). **Owner note (15/10/2026): the admin UI will probably
be refactored as a whole later** — treat the current visual layer (Sneat-style, Figma approved 14/10) as
provisional; keep the session/API logic and the design's edge cases. Known items left for that refactor: B25E30
(refresh 429 → `/login` without a notice) and the unfixed guideline points listed in `buoc-2-5.md`.

**Next: Bước 3** (Learning + the Content pieces deferred from Bước 2: private words, context sentences, the lookup
chain), the earliest pilot milestone, starting with `superpowers:brainstorming`; build-order table in
`docs/HANDOFF_2026-10-05_BUOC_0.md` §2. A separate **"Deploy API + admin"** step (hosting, durable Postgres/Redis,
real SMTP, secrets, backup; design 2.5 §14) must be done before the pilot; the owner has **not yet chosen** whether
it comes before or after Bước 3 — ask. Content backlog from Bước 2.5 (D26): export the entries that have no sense yet
(CSV export only lists senses), worth weighing in Bước 3's Content part.

**Before Bước 3's scope is set (16/10/2026):** `docs/preparation/PROJECT_ASSESSMENT_2026-10-15.md` (workflow and
feasibility review written for the owner) ends with four owner decisions that shape Bước 3, none recorded as decided
yet: **Q-A** order and scope (full Bước 3 → Deploy → pilot; a thin slice + Deploy + ~300 words → pilot of 5–10 people;
or a no-code trial first), **Q-B** who authors the pilot content (300–500 words with senses; the catalog has 7.799
entries but only 4 senses), **Q-C** reminders during the pilot (K25: none in V1), **Q-D** pilot success thresholds
(metrics exist in `docs/specs/DECISIONS_2026-10-04.md` §8, thresholds do not). Put them to the owner first in Bước 3
brainstorming, owner-first (Working Rules below). **UI refresh B** (owner 15/10/2026) is in review, not merged:
landing PR #22 → `dev`, admin PR #23 stacked on #22, session-on-reload fix PR #24 stacked on #23 (CI green on all
three); merge order #22 → #23 → #24. Learner-facing web screens in Bước 3 should reuse its shared tokens once #22 is on
`dev`.

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
  **push and opening a PR into `dev` need no approval; merge only when the owner asks** (owner, 15/10/2026). A
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
- **CI/CD (owner, 12/10/2026):** `ci.yml` (lint, typecheck, build, unit, e2e) runs on **pull requests only** and does not
  re-run when a PR is merged. `deploy-web.yml` runs on push to `main` and only builds and deploys (no tests, not gated on CI).
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
  (chốt) / proposed (đề xuất) / `ASSUMPTION`. **In Bước 3 the proposal comes after the owner's own answer** (next bullet).
- **Bước 3 — the owner thinks first (owner, 15/10/2026; decide after Bước 3 whether to keep it).** Goal: the owner keeps
  understanding the system and the code, not only approving them.
  - *Owner answers first, Claude proposes after* — for every open decision put to the owner. Claude asks with the context
    and constraints only: no proposal, no option marked "(Recommended)"; if options must be listed, none is favoured. After
    the owner answers, Claude gives its own proposal, says where it agrees or differs and why, and the owner decides
    (keeping their own answer is fine). Owner says "bỏ qua" / "không biết" for a question → Claude proposes as before, and
    the decision record says so. Factual questions (a library's version, how existing code works) are not decisions:
    answer them, verified.
  - *One core piece per Bước is owner-written* — the plan marks one task as owner-written (Bước 3 candidate: the review
    schedule algorithm; chosen during brainstorming). Claude does not write that code: it reviews it, and when the owner is
    stuck it explains the concept or points the direction, with no finished code unless the owner asks for it explicitly.
    Who writes that task's tests is decided in the plan.
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

Bước 0, 1, 2 and 2.5 are implemented (see `docs/deliveries/`). Steps 3–8 are still
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
  → Deploy API + admin (separate step; must precede the pilot, exact position not chosen yet) → **3 Learning**, plus the Content pieces deferred from
  Bước 2 (private words, context sentences, lookup chain) (earliest pilot milestone) → 4 Practice non-AI
  → 5 Entitlements → 6 AI Integration gateway → 7 Practice AI + Content AI → 8 Identity remainder (Google login, forgot password,
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

## Việc phải phân tích khi tới bước tương ứng (ghi 12/10/2026, từ brainstorm Bước 2)

Các điểm dưới đây phát sinh khi rà quyền của `admin`/`editor` (bảng D6) với các spec Bước 3–8. Chưa chốt, **không chặn Bước 2**;
đọc lại khi brainstorm bước ghi bên cạnh.

- **Bước 4/7 — danh sách dạng bất quy tắc (PRC7, QE5, Defense Analysis của Practice).** Kiểm rule câu AI sinh dạng chia bằng
  quy tắc cố định (`-s`, `-ed`, `-ing`…); dạng bất quy tắc (`go` → `went`, `gone`) không sinh được, nên câu AI đúng bị loại,
  sinh lại một lần và tốn thêm một lần gọi AI. Spec ghi "owner duy trì danh sách" nhưng **chưa gán quyền**. Đề xuất (chưa
  chốt): `questions.moderate`, vì dữ liệu thuộc Practice và người xử lý câu xấu là người thấy các câu bị loại nhầm.
  `content.edit` chỉ hợp cho dạng được chấp nhận theo từng sense (CR22, thuộc Content). Cần phân tích khi tới bước: danh sách
  lưu ở đâu (Practice sở hữu), thêm theo lemma hay theo sense, có nạp sẵn danh sách ban đầu không.
- **Bước 5–6 — xem chi phí AI và báo cáo đối soát** (AI Integration AR6, Entitlements): **chủ dự án chốt 12/10/2026** thuộc
  `ai.settings` (chỉ `admin`). Chưa gán: quyền đổi con số hạn mức và tham số trial/Pro (ER9, K18); đề xuất cùng `ai.settings`.
- **Bước 5 — `entitlements.grant` so với D6 ("editor không đụng chi phí AI").** `editor` có `entitlements.grant` nên cấp được
  lượt AI, tức tiêu tiền thật. Trần chi hằng ngày (ER14) giới hạn rủi ro. Cân nhắc: chuyển `admin` only, hoặc giới hạn số lượt
  mỗi lần cấp.
- **Bước 3/4 — ôn sai: "quên" khác "nhầm" (hướng phát triển, chủ dự án 15/10/2026; chưa phải quyết định chính).** Thay cho
  N8 (`ASSUMPTION`: mọi lần sai về mức 1). Quên → về mức 1, nhớ thì lên dần lại (khớp hộp ôn Leitner gốc và mặc định Anki).
  Nhầm → hạ nhẹ. Vì app không tự biết nhầm hay quên, **để người học chọn**, chỉ cho câu gõ từ (Bước 4): gõ sai lần 1 **chưa
  hiện đáp án** → [Thử lại] (một lần; đúng = "nhầm", sai = "quên") hoặc [Tôi quên rồi] (= "quên"); sau khi hiện đáp án có nút
  tự đánh dấu "cần ôn tập" (K13 vẫn giữ: chỉ người học đặt trạng thái); bỏ ngang thì chưa tính, từ vẫn đến hạn. Trắc nghiệm,
  đúng/sai không áp dụng (thử lại thành đoán). Đụng tới: đổi F40 (không thử lại), thêm kết quả thứ ba "nhầm" từ Practice sang
  Learning (LR6, PRC16), F38 giữ. Bước 3 chỉ cần lịch ôn chừa chỗ cho kết quả này. Còn mở: "nhầm" giữ mức hay hạ một mức
  (Claude đề xuất hạ một); "nhầm" có tính vào "từ hay sai" (PRC19) không.
- ~~**Giao diện cấp vai trò:**~~ **Đã rõ 13/10/2026:** chốt thành Bước 2.5 (D9, design Bước 2 mục 15) — giao diện
  web (đăng nhập, trang admin, cấp vai trò) ngay sau Bước 2, trước Bước 3. Xem bảng ở HANDOFF §2. Đã xong 15/10/2026
  (as-built ở `docs/deliveries/buoc-2-5.md`).

## Landing (apps/web) - as-built (08-09/10/2026)

- Stack: Next `16.3.8` (App Router), next-intl `4.14.9`, `@opennextjs/cloudflare` `1.20.7`, wrangler `4.145.0`.
- Cloudflare Workers (`wordmet-web`) + D1 waitlist (`wordmet-waitlist`, binding `DB`); local data in `.wrangler/state`.
- Windows Worker build/e2e/static checks: `pnpm cf:docker` in a `node:24.11.0-bookworm` Linux container; WSL planned later.
- Keep Next and `eslint-config-next` pinned to `16.3.8` until OpenNext supports Next `16.4`.
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
emits both the Prisma client and TypedSQL (a second plain `prisma generate` wipes TypedSQL on Linux — seen in CI). The e2e global setup runs the same sequence against
its fresh Testcontainers Postgres database.

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
  `docs/deliveries/buoc-2.md` (includes its plan tóm tắt too), `docs/deliveries/buoc-2-5.md` (plan tóm tắt + as-built), `docs/deliveries/buoc-2-5-test-flow.md` (Bước 2.5 gate + manual run).
- Bước 2 test flow (automated gate, `pnpm smoke:buoc-2`, manual steps): `docs/deliveries/buoc-2-test-flow.md`.
- Spec index and status: `docs/specs/README.md`.
- Spec/design-doc writing convention (edge cases must be derived per-doc, not just cited): `docs/specs/SPEC_WRITING_CONVENTIONS.md`.
- Full project context, product decisions, and evidence log: `docs/preparation/PROJECT_CONTEXT.md`.
- Session handoff / current status (read first): `docs/HANDOFF_2026-10-05_BUOC_0.md`.
- Bước 0 design (as-built, with the Prisma-switch correction note): `docs/superpowers/specs/2026-10-05-buoc-0-design.md`.
- Bước 0 implementation plan (Drizzle, historical — tasks 3/7/9/10 superseded): `docs/superpowers/plans/2026-10-05-buoc-0-backend-foundation.md`.
- Drizzle→Prisma migration plan (current ORM, full rationale + review history): `docs/superpowers/plans/2026-10-06-migrate-drizzle-to-prisma.md`.
