# Project Delivery History (Bước 0–8 & Launch Rounds)

> Archived from `CLAUDE.md` (24/11/2026, DOC-04) so `CLAUDE.md` stays focused on current state, rules, and commands.

## Earlier Phases Summary

- **14/11/2026:** The new learner UI (PR #250–#272), the production deploy path (PR #273), and UI copy round 2 (PR #274) reached `dev` and `main` (PR #275+). Gate G1 passed on the VPS on 14/11; runbook: `docs/deliveries/deploy-production-runbook.md`.
- **09/11/2026:** Improvement round C built and merged into `dev` (Học / Ôn and study streak; UK / US IPA and pre-made Google TTS audio; last merge PR #245, `defcf5b1`). Before it, session synonyms and launch prep rounds A (M1–M3) and B (M0–M4) were merged into `dev`.
- **29/10/2026:** Bước 8 (Google sign-in, account deletion, cancel plan; API, web, admin) built and merged into `dev` (PR #172–#181).
- **28/10/2026:** Bước 0–7, learner web UI (`apps/web` `/vi/app`, `/en/app`) and admin UI (24 screens in `apps/admin`) implemented.
- **Historical implementation branches (Bước 0):**
  - `feat/buoc-0-backend-foundation` — Bước 0 built on Drizzle ORM (10 tasks, 5 unit + 23 e2e tests).
  - `feat/migrate-drizzle-to-prisma` — re-implemented on Prisma ORM (6-task migration, 5 unit + 24 e2e tests). Current ORM; locking uses `pg_try_advisory_xact_lock`. See `docs/superpowers/plans/2026-10-06-migrate-drizzle-to-prisma.md`.

## Per-Step & Round Notes

- **Bước 0:** `docs/deliveries/buoc-0.md` (05–06/10/2026; 5 unit + 24 e2e).
- **Bước 1:** `docs/deliveries/buoc-1.md` (07/10/2026; 339 unit + 182 e2e).
- **Bước 2:** `docs/deliveries/buoc-2.md` (12–13/10/2026; PR #16; 575 unit + 457 e2e). Test flow: `docs/deliveries/buoc-2-test-flow.md`.
- **Bước 2.5:** `docs/deliveries/buoc-2-5.md` (14–15/10/2026; PR #17–#20; admin 219 unit + 67 mocked e2e + 7 real-stack e2e). UI refresh B (PR #22–#24, `docs/deliveries/ui-refresh-b.md`) finalized direction B (AD2, 27/10/2026). Test flow: `docs/deliveries/buoc-2-5-test-flow.md`. Figma `coVHzJwTFgMbooUrty7sOq`.
- **Bước 3 (system part):** `docs/deliveries/buoc-3.md` (17–18/10/2026; PR #28–#44; API 681 unit + 688 e2e). Q-A–Q-D decided in `docs/superpowers/decisions/2026-10-16-buoc-3-learning-decisions.md` (D1, D5, D6, D8, D9, D12). Manual CEFR-J run: `docs/deliveries/buoc-3-test-flow.md`.
- **Bước 4 (Practice non-AI, API only):** `docs/deliveries/buoc-4.md` (18–19/10/2026; PR #47–#58; API 772 unit; backend e2e removed per D38; `pnpm smoke:buoc-4`).
- **Bước 5 (Entitlements, API only):** `docs/deliveries/buoc-5.md` (19/10/2026; PR #62–#78; API 1338 unit; `smoke:buoc-5` in both `fetchState` modes). Since Bước 5 every account defaults to Free (3 sessions/day); admin grants Pro/custom limits (D9).
- **Bước 6 (AI Integration gateway, API only):** `docs/deliveries/buoc-6.md` (20/10/2026; PR #82, #84–#94; API 1896 unit; `smoke:buoc-6`). OpenAI + Anthropic official SDKs + fake provider; `OPENAI_CUSTOM_HEADERS` / `ANTHROPIC_CUSTOM_HEADERS` must remain unset (D29).
- **Sửa thiếu sót Bước 0–3:** `docs/deliveries/buoc-0-3-fixes.md` (20–21/10/2026; PR #98–#102; API 2096 unit, admin 329 unit). Added names, birth date (13+), terms consent (`TERMS_VERSION`), account lock, admin user list, content audit columns.
- **Bước 7 (Practice AI + Content AI, API only):** `docs/deliveries/buoc-7.md` (21/10/2026; PR #104–#116; API 2402 unit; `smoke:buoc-7`). AI question types, `check_private_word`, `/v1/lookup/ai`, report reasons, refunds, unknown forms.
- **Đợt giao diện (mockups Bước 3–7):** `docs/deliveries/dot-giao-dien.md` (21–22/10/2026; Figma `7HcPAKLrWu32C27qYMJUOA`; copy in `docs/mockups/2026-10-21/ban-chu-giao-dien.md`).
- **Giao diện người học (v1):** `docs/deliveries/giao-dien-nguoi-hoc.md` (22–26/10/2026; PR #123–#128, M1–M5b).
- **Đợt giao diện admin (24 screens):** `docs/deliveries/giao-dien-admin.md` (27–28/10/2026; PR #144–#169, #171).
- **Bước 8 (Google sign-in, account deletion, cancel plan):** `docs/deliveries/buoc-8.md` (29/10/2026; PR #172–#181; API 3134 unit, web 723, admin 905; `smoke:buoc-8`).
- **Đợt cải thiện nhóm A:** `docs/deliveries/dot-cai-thien-a.md` (26–31/10/2026; PR #133–#137, #140, #158).
- **Nhóm B (AI quality, eval, judge, retention):** `docs/deliveries/nhom-b.md` (29–31/10/2026; PR #191–#198).
- **Chính sách bảo mật & Điều khoản (admin `/legal`):** `docs/deliveries/legal-documents.md` (03/11/2026).
- **Landing redesign:** `docs/deliveries/landing-redesign.md` (03–04/11/2026; PR #205, #208; removed waitlist and D1 DB).
- **Chuẩn bị launch đợt A & B:** `docs/deliveries/chuan-bi-launch-a.md` (Turnstile, headers, Free AI, trial off; PR #211–#215) and `docs/deliveries/chuan-bi-launch-b.md` (payOS VietQR, house ad, CSP nonce; PR #218–#221 + `feat/launch-b-m2-m4-to-dev`).
- **Nguồn dữ liệu công khai (`/sources`):** `docs/deliveries/nguon-du-lieu.md` (05/11/2026).
- **Từ đồng nghĩa trong phiên (AI cloze):** `docs/deliveries/session-synonyms.md` (07/11/2026; PR #228–#231).
- **Đợt cải thiện C (Học/Ôn, streaks, Wiktionary IPA, Google TTS → R2):** `docs/deliveries/dot-cai-thien-c.md` (07–09/11/2026; PR #236–#246).
- **Câu điền từ `own_then_ai` & `ai_count`:** `docs/deliveries/cloze-own-then-ai.md`, `docs/deliveries/practice-ai-count.md` (09/11/2026).
- **Giao diện mới (`apps/web`, Figma `JKnyUUtGjpGpfKK4PqBfdY`):** `docs/deliveries/giao-dien-moi.md` (10–13/11/2026; PR #250–#272; old UI archived at tag `archive/giao-dien-cu-2026-11`).
- **Sửa bảo mật trước launch:** `docs/deliveries/pre-launch-fixes.md` (12/11/2026; `login_failures` table, Turnstile scoped to login/register).
- **Đường deploy production (VPS + Caddy + scripts):** `docs/deliveries/prod-deploy.md` (13–14/11/2026; PR #273; TypedSQL dropped; G1 passed 14/11).
- **Sửa chữ giao diện vòng 2 & Giao diện email (17 HTML emails):** `docs/deliveries/ui-copy-round-2.md`, `docs/deliveries/email-giao-dien.md` (14/11/2026).
- **Restore safety (time-based `orderCode`, WAL-G 60s archiving, split DB roles, R2 Deletion Journal):** `docs/deliveries/restore-safety.md` (18/11/2026; PR #303–#307).
- **Landing live plans (client-side price/FAQ refresh):** `docs/deliveries/landing-live-plans.md` (19/11/2026; PR #312).

## Resolved Brainstorm Notes (12/10/2026)

- **Irregular forms (Bước 7, D15):** managed in Content (`content.edit`) from the unknown-forms list.
- **AI cost/dashboard permissions:** `settings.manage` (`admin` only) for AI settings, costs, and calls; `ai.view` (`admin` and `editor`) for `/v1/admin/ai/dashboard`, `/v1/admin/practice/ai-quality`, `/v1/admin/entitlements/ai-usage/*`, `/v1/admin/learning/retention`, and `/v1/admin/learning/pilot-metrics`.
- **`entitlements.grant` (Bước 5 D6–D8, D33):** `editor` grants standard Pro plans only (no custom AI units); `admin` grants/revokes custom limits.
- **Schema review (17/10/2026):** resolved in Bước 0–3 fixes (PR #99–#100).

## Execution Note: Codex Review Workflow

For Bước 0's Prisma migration, Claude wrote/reviewed the plan, Codex implemented and reviewed diffs in two models, and Claude ran final independent verification with real Docker/npm access. See `docs/superpowers/plans/2026-10-06-migrate-drizzle-to-prisma.md`.
