# Bước 2.5 — Admin web (`apps/admin`) Implementation Plan

> **Status 14/10/2026:** written, awaiting the owner's review. No code yet.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. If the owner picks the Codex loop (CLAUDE.md "Execution note"): Codex `gpt-6.1-sol` implements each task, Claude reviews the diff, re-runs the real gate and commits.

**Goal:** A browser admin app at `admin.<domain>` (run locally in this step) where staff log in, `admin` grants roles, and staff run the whole CSV content flow; plus three small API changes it needs.

**Architecture:** `apps/admin` is a Vite + React SPA built to static files (a Cloudflare Worker serves them later; no deploy now). The browser calls the NestJS API directly (`admin-api.<domain>`, locally `http://localhost:3000`); the access token lives only in memory, the refresh token is the API's httpOnly cookie. A framework-free `SessionStore` owns tokens, refresh, the gate rule and cross-tab sync; React reads it through a provider; TanStack Query does data fetching and polling. Figma (M0) is drawn and approved before any screen is coded.

**Tech Stack:** Vite `8.3.4`, `@vitejs/plugin-react` `6.1.2`, React/React DOM `19.3.0`, Tailwind `4.3.3` + `@tailwindcss/vite` `4.3.3`, `react-router` `8.4.0`, `@tanstack/react-query` `5.104.2`, `use-intl` `4.14.9`, `react-aria-components` `1.22.1`, `zod` `4.6.5`, `lucide-react` `1.55.0` (ISC; owner 14/10/2026, added at Task 10 — first pinned `1.57.0`, published the same day, which pnpm 11's minimum release age refused and auto-excluded in `pnpm-workspace.yaml`; use a version a few days old and keep no `minimumReleaseAgeExclude` entry); dev: TypeScript `6.0.3`, Vitest `4.1.11`, jsdom `30.1.2`, Testing Library (`react` `16.3.3`, `dom` `10.4.2`, `user-event` `14.6.8`, `jest-dom` `7.0.1`), `msw` `3.0.3`, Playwright `1.63.0`, `@axe-core/playwright` `4.13.0`, ESLint `9.39.5` + `@eslint/js` `9.39.5` + `typescript-eslint` `8.71.2` + `eslint-plugin-react-hooks` `7.1.1` + `globals` `17.13.0`, `wrangler` `4.145.0`. All versions read with `npm view` on 14/10/2026; peer ranges checked (`@tailwindcss/vite` accepts Vite 8; `react-router` needs React ≥ 19.2.7; `typescript-eslint` accepts TS < 6.1).

**Spec:** [`docs/superpowers/specs/2026-10-14-buoc-2-5-admin-web-design.md`](../specs/2026-10-14-buoc-2-5-admin-web-design.md) — read the section named in each task. Decisions D1–D17: [`../decisions/2026-10-14-buoc-2-5-admin-web-decisions.md`](../decisions/2026-10-14-buoc-2-5-admin-web-decisions.md). Every test name starts with the `B25#`/`B25E#` it proves and asserts every clause of that criterion's Then.

**Branches:** this plan is on `docs/buoc-2-5-design`. Implementation: one branch per milestone cut from the latest `dev` — `feat/buoc-2-5-m1-backend` (Tasks 4–6), `feat/buoc-2-5-m2-admin-shell` (7–12), `feat/buoc-2-5-m3-csv-flow` (13–18). M0 (Tasks 1–3) is Figma only and needs no branch. Each parallel track works in its **own git worktree**.

**Order (owner, 14/10/2026):** three tracks start at once — **A:** M0 (Tasks 1→2, 1→3, 3a, then the owner's Figma approval); **B:** M1 (Tasks 4, 5, 6 — independent files — then 6a → 6b); **C:** Tasks 7→8→9→9a (non-visual, no Figma needed). Task 10 starts after the Figma approval **and** Task 9a. Tasks 3a, 6a, 6b, 9a were added on 14/10/2026 when the owner replaced self-registration with admin-created accounts (spec D18–D21). Then sequential: 10 → 11/12 → 13 → 14/15 → 16 → 17 → 18. M1 must be merged into `dev` before Task 17 (the real-stack suite needs the CORS change); it blocks nothing earlier. Tasks done in parallel touch shared files (`messages/*.json`, `src/app/routes.tsx`, `.github/workflows/ci.yml`) — resolve those conflicts by hand when merging.

## Global Constraints

- Paths are under `apps/admin/` unless they start with `apps/api/`, `docs/` or `.github/`. Commands run from the app directory in **PowerShell**; Docker Desktop must be running for API e2e and the real-stack suite.
- New dependencies pinned exactly (`pnpm add -E`), versions from the Tech Stack line. No other runtime dependency without asking the owner.
- API base URL: `VITE_API_BASE_URL`. In `--mode production` the host **must** start with `admin-api.` or the build fails (spec §4). Modes `development`, `test`, `e2e` accept `http://localhost:<port>`. Admin dev and preview both use port **5173** (`--strictPort`); API `CORS_ORIGINS` includes `http://localhost:5173`.
- Tokens: access token only in memory; never `localStorage`/`sessionStorage`. `localStorage` holds only the UI language (`wordmet-admin.locale`).
- Every `fetch` to the API sends `credentials: 'include'`. `POST /v1/auth/refresh` and `/v1/auth/logout` also send `X-CSRF-Protection: 1` and body `{}`. Login sends `client: 'web'`, `device_label: 'Wordmet Admin'`. **No self-registration and no OTP verification screen in the admin app** (spec D5 revised 14/10/2026); staff accounts are created by an admin (spec §6.2, §7.4, D18–D21).
- Problem `type` arrives as `<PROBLEM_TYPE_BASE><slug>` or `about:blank` (`problem-details.filter.ts`); the UI keys on the **slug** (last path segment; `about:blank` → `''`).
- Gate rule (spec §5, revised 14/10/2026): role + `must_change_password` → `/change-password` only; role → app; no role (verified or not) → logout + `/login` notice `no-access`. 403 `forbidden` → refresh first, then `/me` + gate; 403 `password-change-required` → `/me` + gate. Other 403 types never trigger the gate.
- Copy: all UI text from `messages/{vi,en}.json` via `use-intl`; Vietnamese text comes from the approved Figma. Fixed strings: `errors.noAccess` vi "Bạn không có quyền truy cập trang web này" / en "You do not have access to this site"; `notice.expired` vi "Phiên đăng nhập đã hết hạn". (`notice.verified` was removed with self-registration.)
- Contrast: text meets WCAG AA 4.5:1 — `success` `#1f9d55` (3.49:1 on white) and `danger` `#d64545` (4.38:1) are for icons/borders only; text uses `ink`, `muted`, `primary` or `danger-strong`.
- Sizes (D16, spec §9): rem / `clamp()` / `minmax()` / `min()` / container queries only; no px in CSS or class names, no fixed heights; Tailwind arbitrary values and inline `style` forbidden except with a `// raw-ok: <reason>` comment on the line above (same rule and script as `apps/web`).
- Owner decisions at the Figma review (14/10/2026): no page title/description block inside app screens (the topbar carries the page name); icons only from `lucide-react` (names as mapped in the Figma `Icon` component); every list uses one shared state component for empty/loading/error (`ListState` in Figma, `src/ui/ListState.tsx` in code); tables switch to stacked cards when the **content area** is narrower than `40rem` (container query, not viewport).
- Polling: 2,000 ms while `queued`/`running`; stop on `succeeded`/`partial`/`failed`; not while the tab is hidden. "Worker?" hint after a batch has been `queued` for 30 s (`ASSUMPTION`).
- `Idempotency-Key`: `crypto.randomUUID()` per form submission; same key on retry after network error or 409 in-progress; new key when the form's fingerprint changes or after `idempotency-key-abandoned`.
- Real-stack e2e registers only 2 base accounts through `POST /v1/auth/register` (admin, learner; `auth.register.ip` 5/h/IP, not configurable); the editor is created by the admin in the UI. Runs with `retries: 0`.
- Passwords: never in an API response, a log line, a URL or `localStorage`; the generated password appears only in the mail.
- **Git:** commit after every task on the milestone branch, Conventional Commits (`feat(admin): …`, `feat(api): …`, `ci: …`, lower case, imperative) ending with the `Co-Authored-By` line. Never push, open a PR or merge unless the owner asks.

## Review Focus

1. **Windows hands a `.csv` with MIME `application/vnd.ms-excel` or an empty type** — the upload form must accept it by extension, not reject it by MIME; Task 13.
2. **Long content at 390 px** — a 320-character email, a long Vietnamese topic name, a 60-character file name — must wrap or truncate inside the card, never make the page scroll sideways; Tasks 10, 12.
3. **Double-click on a submitting button** (upload, grant role, revert, create publish job) — must send exactly one request; Tasks 12, 13, 14.
4. **Deep link while signed out** (e.g. `/uploads/<id>` opened after the session expired) — after login the user lands on that page, not on the home page; Task 11.
5. **A long real import** (CEFR-J, ~130 s) with the tab hidden and shown again — polling resumes immediately on focus and the page shows the true final status; Task 14.

---

# Milestone M0 — Figma (no branch; owner approval gate)

All three tasks write to https://www.figma.com/design/coVHzJwTFgMbooUrty7sOq through the Figma MCP (`use_figma`), after loading `figma-use` and `figma-generate-design`. Every frame uses auto layout with Fill/Hug and min/max width (no fixed-size frames); sample widths 1440 and 390, stretch-checked at 1024 and 768. Frame names: `<area>/<screen>/<state>/<width>`.

### Task 1: Foundations — variables and base components

**Files:** Figma pages `Cover` and new page `Foundations`.

**Produces:** variable collection `Admin tokens` (one mode, light) with rem values noted in each variable's description (16 px root):
- Colours copied from `apps/web/src/app/globals.css`: `bg #faf8f5`, `surface #ffffff`, `ink #1c1b22`, `muted #5e5b6b`, `border #e7e3dc`, `border-strong #8a8697`, `primary #2f5bea`, `primary-soft #e8eeff`, `on-primary #ffffff`, `success #1f9d55`, `success-soft #e5f6ec`, `danger #d64545`, `danger-strong #b42318`.
- Sizes: `text-ui 0.875rem`, `control 2rem`, `control-touch 2.75rem`, `topbar-min 3.5rem`, `sidebar-min 14rem`, `sidebar-max 16rem`, `auth-card-max 25rem`, `radius-control 0.5rem`, `radius-panel 0.75rem`, `page-pad-min 1rem`, `page-pad-max 2rem`.
- Font Be Vietnam Pro (styles verified present: Regular, Medium, SemiBold, Bold).
- Components (with variants): Button (primary/secondary/danger/ghost × default/hover/disabled/loading), TextField (default/error/disabled), Select, FileDrop, Badge (status: queued/running/succeeded/partial/failed/reverted), Table row + mobile card row, Dialog (confirm/danger), Banner (info/error/offline), Sidebar item, Topbar, Pagination ("Tải thêm").

- [ ] **Step 1:** Read-only `use_figma` inspection of the file (pages, existing variables) — must return the 4 pages created on 14/10/2026 and no variables.
- [ ] **Step 2:** Create the variable collection and text styles; return variable count and names.
- [ ] **Step 3:** Create the components on `Foundations`; one screenshot of the page.
- [ ] **Step 4:** Report the page link to the owner (no approval gate yet).

### Task 2: Account screens

**Files:** Figma page `Tài khoản`.

Frames (each at 1440 and 390): Login (default, field error, `no-access` notice, `expired` notice, `verified` notice, loading); Register (default, password `violations`, `email-taken`, `mail-unavailable`); OTP (default, wrong code, resend countdown, locked countdown); Forgot password step 1 (email) and step 2 (code + new password, with `violations`). Auth card `min(100% - 2rem, 25rem)`, logo on top. Copy in Vietnamese; this copy becomes `messages/vi.json`.

- [ ] **Step 1:** Build the frames from the Task 1 components; screenshot each width once.
- [ ] **Step 2:** Stretch-check one frame at 1024 and 768; fix overflow if any.

### Task 3: Roles and content screens + owner approval

**Files:** Figma pages `Vai trò`, `Nội dung — CSV`, `Shell`.

Frames (each at 1440 and 390): Shell (sidebar + topbar with VI/EN switch and account menu; at 390 the ☰ drawer open and closed); Staff list (filled, empty, loading, error) + search result card + grant/remove dialogs (incl. self-demotion warning); Sources (list, register form); Uploads (list, upload form with level-source select, file too large); Batch detail (`queued`, `queued` > 30 s with worker hint, `running`, `succeeded` with rejected rows, `partial`, `failed`, reverted, revert dialog); Export (filters + download); Publish jobs (list, create form, detail running/succeeded, `nothing-to-publish`). Offline banner and 429 countdown shown once each.

- [ ] **Step 1:** Build the frames; screenshot each page once.
- [ ] **Step 2:** Stretch-check Staff list and Batch detail at 1024 and 768.
- [ ] **Step 3:** Ask the owner to review the Figma file. **Gate:** M2 does not start until the owner approves; record the approval date in the spec's §9.

---

### Task 3a: Account creation and forced password change (added 14/10/2026, D18–D21)

**Files:** Figma pages `Tài khoản`, `Vai trò`.

Frames (each at 1440 and 390): `account/change-password/{default, mismatch, violations (incl. same_as_current), loading}` — current password, new password, confirm, policy checklist, a logout link, no sidebar; `roles/create-account/{dialog-generated, dialog-manual (password + confirm fields shown), confirm-email, success, email-taken, mail-unavailable}` — email, role select (editor default), ☑ "Sinh mật khẩu ngẫu nhiên" (ticked), ☑ "Bắt đổi mật khẩu khi đăng nhập lần đầu" (ticked); success copy from spec §6.2; the generated password is never shown. A "Tạo tài khoản" button on the staff list. Forgot-password copy unchanged. Reuse Foundations components (Dialog, TextField, Banner, Icon).

- [ ] **Step 1:** Build the frames; screenshot each once.
- [ ] **Step 2:** Report to the reviewing session; the owner approves M0 as a whole (gate of Task 3).

# Milestone M1 — Backend (branch `feat/buoc-2-5-m1-backend`, paths under `apps/api/`)

### Task 4: CORS allows `Idempotency-Key` and exposes `Retry-After`

**Files:**
- Modify: `src/app.setup.ts:13-17`, `.env.example` (`CORS_ORIGINS`)
- Test: `test/app-setup.e2e-spec.ts` (extend the D13 test)

- [ ] **Step 1: Write the failing test** `B25#17: preflight allows Idempotency-Key, refuses an unlisted header, and responses expose Retry-After`:
  - `OPTIONS /v1/sample` with `Origin: https://app.example.com`, `Access-Control-Request-Method: POST`, `Access-Control-Request-Headers: idempotency-key` → `access-control-allow-headers` (lower-cased) contains `idempotency-key`.
  - Same with `Access-Control-Request-Headers: x-unlisted` → `access-control-allow-headers` does not contain `x-unlisted`.
  - `GET /v1/health` with that `Origin` → `access-control-expose-headers` equals `Retry-After`.
- [ ] **Step 2:** `pnpm test:e2e -- test/app-setup.e2e-spec.ts` → FAIL on the first assertion.
- [ ] **Step 3:** Set `allowedHeaders: ['Authorization', 'Content-Type', 'X-CSRF-Protection', 'Idempotency-Key']` and `exposedHeaders: ['Retry-After']`; `.env.example` `CORS_ORIGINS=http://localhost:3000,http://localhost:5173`.
- [ ] **Step 4:** Same command → PASS; the existing D13 assertions still pass.
- [ ] **Step 5:** Commit `feat(api): allow idempotency-key and expose retry-after in cors`.

### Task 5: `GET /v1/admin/content/senses/publish-jobs`

**Files:**
- Modify: `src/content-pipeline/publish/publish-jobs.controller.ts`
- Test: `test/pipeline/publish-jobs.e2e-spec.ts` (new `describe` block reusing its `ready`/`create` helpers)

**Interfaces — Produces:** `GET` → `{ items: PublishJobListItem[]; next_page_token: string | null }`, `PublishJobListItem = { id, status, filter, snapshot_count, not_ready_count, counters, created_at, started_at, finished_at }` (ISO strings, `null` when unset). Query `page_size` 1–100 default 20, `page_token` optional. Binding: `sha256(JSON.stringify({ route: 'publish-jobs', filters: {} }))`.

- [ ] **Step 1: Write the failing tests:**
  - `B25#15: three jobs, page_size=2 → newest two + token, then the oldest + null, no repeats` — create 3 jobs with `ctx.clock.set` 1 minute apart (each with its own sense so the snapshot is non-empty); assert ids in order and every field of the first item equals `GET .../:id` of that job.
  - `B25E17: two jobs with the same created_at are ordered by id and split across pages without repeats` — set both jobs' `background_jobs.created_at` equal by Prisma update.
  - `B25E18: a job created between page 1 and page 2 appears on neither page 2 nor twice`.
  - `B25#16: a token minted by GET /v1/admin/content/uploads, a non-base64url string, page_size=0 and 101 → 400 validation-failed`.
  - `route: GET .../publish-jobs returns the list (200 with items), not the senses/:id handler` and a learner (no role) gets 403 `forbidden`.
- [ ] **Step 2:** `pnpm test:e2e -- test/pipeline/publish-jobs.e2e-spec.ts` → the new tests FAIL (404).
- [ ] **Step 3:** Add `@Get()` `list(@Query({ schema: listQuery }) query)` copying the cursor logic of `uploads-read.controller.ts` (`orderBy: [{ job: { createdAt: 'desc' } }, { id: 'asc' }]`, `take: page_size + 1`, `encodeBoundToken`/`decodeBoundToken`). Declare it **before** `@Get(':id')`.
- [ ] **Step 4:** Same command → PASS; whole `publish-jobs.e2e-spec.ts` green.
- [ ] **Step 5:** Commit `feat(api): list publish jobs with keyset pagination`.

### Task 6: `GET /v1/admin/taxonomy/topics`

**Files:**
- Modify: `src/content/taxonomy/topics.controller.ts`, `src/content/taxonomy/topics.service.ts`
- Test: `test/content/sources-topics.e2e-spec.ts`

**Interfaces — Produces:** `TopicsService.listAll(): Promise<{ items: TopicView[] }>` (all topics incl. archived, `orderBy: { code: 'asc' }`, existing `toView`); `GET /v1/admin/taxonomy/topics` → that body. **Consumed by** Tasks 15 and 16.

- [ ] **Step 1: Write the failing test** `B25#17a: an editor without native_language lists every topic, archived ones with archived_at, ordered by code; a learner gets 403 forbidden` — seed topics `food`, `business` (archived), `animals`; assert `items.map(i => i.code)` is `['animals','business','food']`, `business.archived_at` non-null, names `{ vi, en }` as stored.
- [ ] **Step 2:** Run `pnpm test:e2e -- test/content/sources-topics.e2e-spec.ts` → FAIL (404).
- [ ] **Step 3:** Implement `listAll` and the `@Get()` handler in `TopicsController` (inherits `taxonomy.manage`).
- [ ] **Step 4:** Same command → PASS. Then the M1 gate: `pnpm lint`, `pnpm exec tsc --noEmit -p tsconfig.json`, `pnpm build`, `pnpm test`, `pnpm test:e2e` all green.
- [ ] **Step 5:** Commit `feat(api): list all topics for staff`. M1 is ready for a PR into `dev` when the owner asks.

---

### Task 6a: `must_change_password` flag and its API gate (added 14/10/2026, D21)

**Files:**
- Create: `prisma/migrations/<timestamp>_must_change_password/migration.sql`
- Modify: `prisma/models/identity.prisma` (`User.mustChangePassword Boolean @default(false) @map("must_change_password")`), `src/identity/profile/identity.service.ts` (`Profile.must_change_password`), `src/identity/staff/permission.guard.ts`, `src/identity/auth/password.service.ts` (`change`, `reset`), `src/identity/auth/password-policy.ts` or `password.service.ts` (`same_as_current`)
- Test: `test/identity/password.e2e-spec.ts`, `test/identity/profile.e2e-spec.ts`, new `test/identity/must-change-password.e2e-spec.ts`

**Interfaces — Produces:** `GET /v1/me` → `must_change_password: boolean`. `PermissionGuard`: flag true → 403 `password-change-required` on every `@RequirePermission` route (selected in the same query that already reads `staffRole`). `change` and `reset` set the flag false in their existing transaction. `change` with `new_password` equal to the current password → 400 `validation-failed` `violations: ['same_as_current']` (compare with `hasher.verify(currentHash, new_password)` before writing).

- [ ] **Step 1: Write the failing tests:** `B25#26: flagged user → 403 password-change-required on GET /v1/admin/staff, /v1/admin/content/uploads, /v1/admin/taxonomy/topics; /v1/me (200, must_change_password true), POST /v1/auth/refresh, /v1/auth/logout still work`; `B25#26: after POST /v1/auth/password/change the flag is false (read back from DB) and GET /v1/admin/staff is 200 with the new access token`; `B25#26: after a successful reset the flag is false`; `B25#27 (API): change with new_password equal to the current one → 400 violations ['same_as_current'], hash unchanged, sessions not revoked`; `profile: an unflagged user's /me has must_change_password false`.
- [ ] **Step 2:** Run the three files with `pnpm exec vitest run --config ./vitest.config.e2e.ts <files>` → FAIL.
- [ ] **Step 3:** Migration + implementation (`pnpm db:setup` regenerates the client).
- [ ] **Step 4:** Same command → PASS; existing `password`/`profile`/`staff` e2e files still green.
- [ ] **Step 5:** Commit `feat(api): add must change password flag and gate`.

### Task 6b: `POST /v1/admin/users` — admin creates a staff account (added 14/10/2026, D18–D20)

**Files:**
- Create: `src/identity/staff/password-generator.ts` (+ `.spec.ts`)
- Modify: `src/identity/staff/staff.controller.ts`, `staff.service.ts`, `staff.schemas.ts`, `src/identity/mailer/templates.ts` (`staffAccountMail`), `src/common/config/app-config.ts` (`ADMIN_APP_URL` required, `adminAppUrl`), `.env.example`, `test/support/test-config.ts` and `test/support/worker-env.ts` (add the variable)
- Test: `test/identity/staff.e2e-spec.ts`

**Interfaces — Consumes:** Task 6a (`mustChangePassword`). **Produces:** `POST /v1/admin/users` body `{ email: string ≤ 320, staff_role: 'admin' | 'editor', password?: string, must_change_password: boolean, timezone: string ≤ 64 }` (strict) → 201 `StaffUserView`; `generatePassword(): string` (16 chars from `crypto.randomInt`, alphabet without `0 O o 1 l I`, at least one upper, lower, digit and one of `-_.!@#%+=`, positions shuffled); `staffAccountMail(to: string, password: string, adminAppUrl: string, mustChange: boolean): MailMessage` (vi + en like `otpMail`). Flow per spec §7.4: policy check of a typed password → `budget.assertAvailable()` → one transaction creating `users` (`email_verified_at = now`, role, flag) + `password_credentials` → `afterResponse` mail; log `staff_account_created { actor_id, target_id, staff_role, must_change_password }`.

- [ ] **Step 1: Write the failing tests:** unit `generatePassword: 1,000 samples all pass checkPasswordPolicy, are 16 chars, never contain 0 O o 1 l I or a space`; e2e `B25#23: generated + must_change → 201 body has exactly id,email,email_verified,staff_role; Mailpit has one mail to that address whose password passes the policy and logs in (then /me must_change_password true, email_verified true, staff_role as chosen); captured logs contain neither the password nor the email`; `B25#24: typed password failing the policy → 400 violations, no user, no mail; a valid typed password is stored (login works) and appears in the mail`; `B25#25: existing email → 409 email-taken, user unchanged, no mail`; `B25#28: exhausted mail budget → 503 mail-unavailable, no user`; `an editor (no roles.manage) → 403 forbidden`.
- [ ] **Step 2:** Run `pnpm test` (unit) and the staff e2e file → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** → PASS. M1 gate again: `pnpm lint`, `pnpm exec tsc --noEmit -p tsconfig.json`, `pnpm build`, `pnpm test`, `pnpm test:e2e` all green.
- [ ] **Step 5:** Commit `feat(api): let admins create staff accounts`.

# Milestone M2 — Admin shell, session, account, roles (branch `feat/buoc-2-5-m2-admin-shell`)

### Task 7: Scaffold `apps/admin`, config guard, CI job `admin`

**Files:**
- Create: `package.json`, `index.html`, `vite.config.ts`, `vitest.config.ts`, `vitest.setup.ts`, `tsconfig.json`, `eslint.config.mjs`, `wrangler.jsonc`, `.env.example`, `src/main.tsx`, `src/config.ts`, `src/config.test.ts`, `src/styles/globals.css`, `scripts/check-tailwind-raw.mjs` (+ `.test.ts`, copied from `apps/web`)
- Modify: `.github/workflows/ci.yml` (new job `admin`)

**Interfaces — Produces:**
- `resolveApiBaseUrl(mode: string, raw: string | undefined): string` in `src/config.ts` — throws `Error` whose message contains `VITE_API_BASE_URL` when missing, not absolute `http(s)`, or (only in `production`) host not starting with `admin-api.`; returns the URL without trailing slash.
- `apiBaseUrl: string` exported from `src/config.ts` (= `resolveApiBaseUrl(import.meta.env.MODE, import.meta.env.VITE_API_BASE_URL)`).
- Vite plugin `apiBaseUrlGuard()` in `vite.config.ts` calling `resolveApiBaseUrl` in `configResolved` so a bad production build fails before bundling.
- Scripts: `dev` (`vite --port 5173 --strictPort`), `build` (`tsc --noEmit && vite build`), `build:e2e` (`vite build --mode e2e`), `preview` (`vite preview --port 5173 --strictPort`), `lint` (`eslint . && node scripts/check-tailwind-raw.mjs`), `typecheck`, `test` (`vitest run`), `test:e2e` (`playwright test`), `test:e2e:real` (`playwright test -c playwright.real.config.ts`).
- `globals.css`: `@import 'tailwindcss'` + `@theme` with the Task 1 tokens as CSS variables (`--color-*`, `--text-ui`, `--spacing-control`, `--spacing-control-touch`, `--radius-control`, `--radius-panel`, `--breakpoint-shell: 64rem`, …), font Be Vietnam Pro loaded from Google Fonts in `index.html`.
- `wrangler.jsonc` exactly as spec §4 (not deployed).

- [ ] **Step 1: Write the failing tests** in `src/config.test.ts`: `B25#20: production rejects api.wordmet.com, http://localhost:3000 and a missing value with a message naming VITE_API_BASE_URL`; `production accepts https://admin-api.wordmet.com/ and returns it without the trailing slash`; `development, test and e2e accept http://localhost:3000`.
- [ ] **Step 2:** `pnpm test` → FAIL (module missing).
- [ ] **Step 3:** Create the package and files above; ESLint flat config = `@eslint/js` recommended + `typescript-eslint` recommended + `react-hooks` recommended, `globals.browser`, ignores `dist`, `playwright-report`, `test-results`. `main.tsx` renders a placeholder root.
- [ ] **Step 4:** `pnpm install` (root), then in `apps/admin`: `pnpm lint`, `pnpm typecheck`, `pnpm test` PASS; `$env:VITE_API_BASE_URL='http://localhost:3000'; pnpm build` → FAILS with the guard message; `$env:VITE_API_BASE_URL='https://admin-api.wordmet.com'; pnpm build` → succeeds.
- [ ] **Step 5:** Add CI job `admin` (Node 24.11.0, pnpm 11.6.0, `working-directory: apps/admin`): install, lint, typecheck, test, `build` with `VITE_API_BASE_URL=https://admin-api.wordmet.com`, Playwright Chromium install, `build:e2e` with `VITE_API_BASE_URL=http://localhost:3000`, `test:e2e`. (Until Task 10 adds e2e specs, `test:e2e` runs `playwright test --pass-with-no-tests`.)
- [ ] **Step 6:** Commit `feat(admin): scaffold vite app with api base url guard`.

### Task 8: API client, problem mapping, idempotency keys

**Files:**
- Create: `src/api/problem.ts`, `src/api/client.ts`, `src/api/idempotency.ts`, `src/api/download.ts`, tests `*.test.ts` beside each; `messages/vi.json`, `messages/en.json` (keys `errors.*` only for now)

**Interfaces — Produces:**
- `type Problem = { type: string; slug: string; status: number; title: string; detail?: string; operation_id?: string; violations?: string[] }`.
- `class ApiError extends Error { problem: Problem; retryAfterSeconds: number | null }`; `class NetworkError extends Error {}`.
- `problemSlug(type: string): string` (last path segment; `about:blank` → `''`).
- `toApiError(res: Response): Promise<ApiError>` (parses `application/problem+json`, reads `Retry-After` seconds).
- `errorMessageKey(problem: Problem): string` → `errors.<slug>` when the slug is in `KNOWN_ERROR_SLUGS`, `errors.inProgress` for 409 with empty slug, `errors.generic` otherwise.
- `type Transport = (path: string, init: RequestInit) => Promise<Response>` and `createApiClient(opts: { send: Transport }): ApiClient` with `get<T>(path)`, `post<T>(path, body?, opts?: { idempotencyKey?: string })`, `put<T>(path, body)`, `postForm<T>(path, form: FormData, opts: { idempotencyKey: string })`, `getBlob(path): Promise<Blob>`; non-2xx → `ApiError`, `fetch` rejection → `NetworkError`. (The session-aware `send` arrives in Task 9.)
- `useIdempotencyKey(fingerprint: string): { key: string; renew(): void }` — new UUID when `fingerprint` changes or `renew()` is called.
- `saveBlob(blob: Blob, fileName: string): void` (object URL + temporary `<a download>`, revoked after click).
- `KNOWN_ERROR_SLUGS`: every slug thrown in `apps/api/src` (list it by grepping `type: '` at implementation time; at least the 23 of spec §8) — each has a vi and en message.

- [ ] **Step 1: Write the failing tests:** `B25#19: unknown type → errors.generic and the operation_id is kept`; `problemSlug: 'http://localhost:3000/problems/staff-role-rule' → 'staff-role-rule', 'about:blank' → ''`; `409 about:blank with Retry-After: 4 → errors.inProgress, retryAfterSeconds 4`; `messages: every KNOWN_ERROR_SLUGS key exists in vi.json and en.json`; `B25#11 (hook part): same fingerprint keeps the key, a new fingerprint or renew() makes a new one`; `postForm sends Idempotency-Key and no Content-Type header (browser sets the multipart boundary)`.
- [ ] **Step 2:** `pnpm test` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `pnpm test` → PASS.
- [ ] **Step 5:** Commit `feat(admin): add api client with problem details mapping`.

### Task 9: `SessionStore` — tokens, refresh, gate, cross-tab sync

**Files:**
- Create: `src/auth/session-store.ts`, `src/auth/session-store.test.ts`, `src/auth/gate.ts`, `src/auth/gate.test.ts`, `src/auth/session-context.tsx`

**Interfaces — Consumes:** `ApiError`, `NetworkError`, `toApiError` (Task 8). **Produces:**
- `type Me = { id: string; email: string; email_verified: boolean; native_language: 'vi' | 'en' | null; timezone: string; staff_role: 'admin' | 'editor' | null; permissions: Permission[] }`, `type Permission = 'roles.manage' | 'content.edit' | 'content.publish' | 'content.import' | 'taxonomy.manage'`.
- `gate(me: Me): 'app' | 'verify-email' | 'no-access'`.
- `type SessionState = { status: 'loading' } | { status: 'signed-out'; notice: 'no-access' | 'expired' | 'verified' | null } | { status: 'verify-email'; me: Me } | { status: 'signed-in'; me: Me }`.
- `class SessionStore` with constructor `(opts: { baseUrl: string; fetch: typeof fetch; channel: ChannelLike | null })`, `ChannelLike = { postMessage(m: unknown): void; addEventListener(t: 'message', l: (e: { data: unknown }) => void): void; close(): void }`; members `state: SessionState`, `subscribe(l: () => void): () => void`, `bootstrap(): Promise<void>`, `login(email, password): Promise<void>`, `register(email, password, timezone): Promise<void>` (keeps the returned access token, then `recheck()` → `verify-email`), `verifyEmail(code): Promise<void>` (success → logout, notice `verified`), `logout(notice?: 'no-access' | 'expired' | 'verified' | null): Promise<void>`, `recheck(): Promise<void>` (GET `/v1/me` + gate), `send: Transport` (adds `Authorization`; 401 → shared `refresh()` → retry once; 403 slug `forbidden` → `refresh()` then `recheck()`; failed refresh → `logout('expired')`). `refresh()` is single-flight (one in-flight promise reused).
- Channel name `wordmet-admin-auth`; messages `{ type: 'logout' }`, `{ type: 'login' }`. On `logout` from another tab: clear token, state `signed-out` (notice null). On `login`: if `signed-out`, run `bootstrap()`.
- `SessionProvider`, `useSession(): { state, store }`, and `useApi(): ApiClient` (client built with `store.send`) in `session-context.tsx`; `window` `focus` → `store.recheck()` when signed in (B25#7).

- [ ] **Step 1: Write the failing tests** (fake `fetch` returning scripted responses; fake channel pair):
  - `B25#2: login of a verified user without role calls logout with X-CSRF-Protection: 1, keeps no token, state signed-out notice no-access`.
  - `B25#3: login of an unverified user without role → verify-email; verifyEmail(correct) → logout → signed-out notice verified` (superseded by Task 9a).
  - `B25#4: bootstrap with a working refresh → signed-in; with refresh 401 → signed-out notice null`.
  - `B25#5: three requests get 401 at once → exactly one POST /v1/auth/refresh, each request retried once`.
  - `B25#6: 403 forbidden → refresh then /me; me.staff_role null → signed-out no-access; role kept → state me updated with new permissions and the ApiError is rethrown`; `403 profile-incomplete and csrf-header-required are rethrown without refresh or /me`.
  - `B25#6a: 403 forbidden and refresh 401 → signed-out notice expired, /me never called`.
  - `B25#7: focus while signed-in calls GET /v1/me once` (in a `session-context` test with `@testing-library/react`).
  - `B25#8: logout in store A posts {type:'logout'}; store B (same channel pair) becomes signed-out without any fetch`; `B25E13: channel null → logout still works`.
  - `gate: role → app; null+unverified → verify-email; null+verified → no-access`.
- [ ] **Step 2:** `pnpm test` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `pnpm test` → PASS.
- [ ] **Step 5:** Commit `feat(admin): add session store with refresh, gate and tab sync`.

### Task 9a: Session rework for admin-created accounts (added 14/10/2026, D5/D12/D18–D21)

Task 9 was implemented before the owner removed self-registration. This task changes it in place.

**Files:** Modify `src/auth/session-store.ts`, `src/auth/gate.ts`, their tests, `src/auth/test-support.ts`, `messages/{vi,en}.json` (drop `notice.verified`; add `errors.password-change-required`, `errors.same_as_current` violation text).

**Interfaces — Produces (replaces the Task 9 versions):**
- `Me` gains `must_change_password: boolean`.
- `gate(me: Me): 'app' | 'change-password' | 'no-access'` — role + flag → `change-password`; role → `app`; no role → `no-access` (whatever `email_verified` is).
- `SessionState` = `loading` | `signed-out { notice: 'no-access' | 'expired' | null }` | `change-password { me }` | `signed-in { me }`. The `verify-email` state and the `verified` notice are removed.
- `SessionStore`: **remove** `register()` and `verifyEmail()`; **add** `changePassword(current: string, next: string): Promise<void>` → `POST /v1/auth/password/change` through the authorised path, keep the returned `access_token`, then `recheck()`; non-2xx → `ApiError` (state unchanged). `send`: 403 slug `password-change-required` → `recheck()` (no refresh).

- [ ] **Step 1: Write the failing tests** (replacing the register/verify ones): `B25#3: no role and unverified → signed-out notice no-access, logout called (no verify-email state)`; `B25#27 (store): role + must_change_password → change-password; changePassword(ok) stores the new token, /me now false → signed-in`; `changePassword with 400 same_as_current → ApiError with violations, state stays change-password`; `403 password-change-required → recheck → change-password, no refresh call`; `gate: role+flag → change-password; role → app; null (verified or not) → no-access`.
- [ ] **Step 2:** `pnpm test` → FAIL. **Step 3:** Implement; delete the now-dead code and its tests. **Step 4:** `pnpm lint`, `pnpm typecheck`, `pnpm test` → PASS.
- [ ] **Step 5:** Commit `refactor(admin): replace self-registration with forced password change in the session`.

### Task 10: i18n, app shell, routing, mocked e2e harness

**Files:**
- Create: `src/i18n/locale.ts` (+ test), `src/app/App.tsx`, `src/app/routes.tsx`, `src/app/Shell.tsx`, `src/app/nav.ts` (+ test), `src/app/RequireSession.tsx`, `src/ui/*` (Button, TextField, Select, Dialog, Badge, Banner, Icon, ListState, DataList — from the Figma components, on `react-aria-components`; `DataList` renders a table above `40rem` of container width and cards below, and delegates empty/loading/error to `ListState`), `playwright.config.ts`, `e2e/support/mock-api.ts`, `e2e/shell.spec.ts`
- Modify: `messages/{vi,en}.json` (shell copy from Figma)

**Interfaces — Consumes:** `useSession`, `SessionState`, `Permission` (Task 9). **Produces:**
- `readLocale(): 'vi' | 'en'` (localStorage `wordmet-admin.locale`, else `navigator.language` starting `vi` → `vi`, else `en`; storage errors ignored), `writeLocale(l)`.
- `NAV: Array<{ group: string; path: string; labelKey: string; needs: Permission[]; available: boolean; plannedStep?: string }>` — **16 items in 6 groups (spec D23, revised 14/10/2026)**, same order and Lucide icons as the Figma `Sidebar`: TỔNG QUAN Dashboard `/dashboard`; NỘI DUNG Lô nhập `/uploads` [`content.import`], Publish job `/publish-jobs` [`content.publish`], Xuất CSV `/export` [`content.edit`], Nguồn `/sources` [`content.import`], Từ `/words`, Nghĩa `/senses`, Chủ đề `/topics` [`taxonomy.manage`]; LUYỆN TẬP Câu bị báo lỗi `/reported`, Dạng bất quy tắc `/irregular-forms`; NGƯỜI HỌC Người dùng `/users`, Quyền lợi & lượt AI `/entitlements`; AI Cài đặt AI `/ai/settings`, Chi phí & đối soát `/ai/costs`, Bộ ví dụ `/ai/eval-sets` (all three `admin` only); HỆ THỐNG Vai trò & staff `/staff` [`roles.manage`]. `available: true` only for Lô nhập, Publish job, Xuất CSV, Nguồn, Vai trò & staff; every other route renders `ComingSoonPage` (Figma `ComingSoon`: "Tính năng chưa có" + one-line purpose + planned step). `visibleNav(perms)` hides AI and Vai trò & staff from `editor`. `/` and post-login → `/uploads`.
- Routes: public `/login`, `/forgot-password`; `/change-password` (only in state `change-password`; every other path redirects there in that state); protected (inside `Shell`, wrapped by `RequireSession`) `/uploads`, `/uploads/:id`, `/publish-jobs`, `/publish-jobs/:id`, `/export`, `/sources`, `/staff`; `/` → first visible nav path. `RequireSession` keeps the requested path in router state `from` when redirecting to `/login`.
- `e2e/support/mock-api.ts`: `mockApi(page, handlers: Record<string, (req) => MockResponse>)` on `page.route('http://localhost:3000/v1/**')`, plus fixtures `signedInAs(page, role: 'admin' | 'editor')` (refresh 200 + `/me`), `requestCount(page, method, path)`.
- `playwright.config.ts`: projects `desktop` (1440×900) and `mobile` (390×844, `hasTouch`), `webServer` = `pnpm build:e2e && pnpm preview` on 5173, `testDir: './e2e'`.

- [ ] **Step 1: Write the failing tests:** unit `B25#1 (nav): editor permissions hide /staff; admin sees all five`; unit `locale: stored en wins; vi-VN browser → vi; throwing localStorage → browser language`; e2e `B25#1: editor sees no "Vai trò" in the sidebar`; e2e `B25#21: below 64rem the sidebar is behind ☰ and opens as a drawer; axe has no serious/critical violations on the shell at both widths`; e2e `B25#22: switching to EN changes the shell text to messages/en.json and survives reload`; e2e `Review Focus 2: at 390 a 320-character email in the account menu does not make document.scrollingElement.scrollWidth exceed clientWidth`; e2e `offline (spec §8): when a request aborts (NetworkError) the shell shows the offline Banner with "Thử lại", the data already on screen stays, and "Thử lại" refetches`.
- [ ] **Step 2:** `pnpm test`, `pnpm test:e2e` → FAIL.
- [ ] **Step 3:** Implement shell and layout per Figma (`Shell` grid `minmax(var(--sidebar-min), var(--sidebar-max)) 1fr` from `64rem`, drawer below).
- [ ] **Step 4:** `pnpm lint`, `pnpm test`, `pnpm test:e2e` → PASS.
- [ ] **Step 5:** Commit `feat(admin): add shell, navigation by permission and language switch`.

### Task 11: Account screens

**Files:** Create `src/features/account/{LoginPage,ForgotPasswordPage,ChangePasswordPage}.tsx` (+ tests), `e2e/account.spec.ts`; modify `messages/*.json`.

**Interfaces — Consumes:** `SessionStore.login/changePassword/logout`, `useApi`, `errorMessageKey`, `retryAfterSeconds` (Tasks 8, 9, 9a). Endpoints: `POST /v1/auth/otp` `{ purpose: 'reset_password', email }`; `POST /v1/auth/password/reset` `{ email, code, new_password }`.

- [ ] **Step 1: Write the failing tests** (component tests with a fake store; e2e with `mockApi`):
  - `B25#2 (screen): notice no-access shows errors.noAccess text on /login; the login card has no registration link`.
  - `B25#27 (screen): change-password state → any path shows /change-password; confirm mismatch is caught before any request; 400 violations (incl. same_as_current) are listed under the new password; success → app`.
  - `B25E15: resend reset code 429 Retry-After 30 → button disabled with a 30 s countdown`.
  - `B25E23: wrong reset code → invalid-otp message and a link to request a new code`.
  - `reset code input: " 123 456 " is sent as "123456"`.
  - `forgot password: step 1 → step 2 → success → /login`.
  - e2e `Review Focus 4: signed-out deep link /uploads/abc → /login → after login lands on /uploads/abc`.
- [ ] **Step 2:** `pnpm test`, `pnpm test:e2e` → FAIL.
- [ ] **Step 3:** Implement per Figma.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(admin): add login, password reset and forced password change screens`.

### Task 12: Roles screen

**Files:** Create `src/features/staff/StaffPage.tsx`, `src/features/staff/staff-api.ts` (+ tests), `e2e/staff.spec.ts`.

**Interfaces — Consumes:** `useApi`, `useSession`. **Produces:** `listStaff(api, pageToken?) → { items: StaffUser[]; next_page_token }`, `findUser(api, email) → StaffUser` (404 → `null`), `setStaffRole(api, id, role: 'admin' | 'editor' | null) → StaffUser`, `createStaffAccount(api, body: { email; staff_role; password?: string; must_change_password: boolean; timezone: string }) → StaffUser` (`POST /v1/admin/users`, Task 6b; `timezone` = the admin's `Intl.DateTimeFormat().resolvedOptions().timeZone`), `StaffUser = { id; email; email_verified; staff_role }`. After a successful change to the signed-in user's own id → `store.recheck()`. Create-account dialog per spec §6.2 and Figma Task 3a: both checkboxes ticked by default; unticking "Sinh mật khẩu ngẫu nhiên" shows password + confirm (policy checked in the form); confirm step repeats the email.

- [ ] **Step 1: Write the failing tests:** `B25#10: staff-role-rule → specific message and the list is unchanged (no refetch result differs)`; `B25E4: last admin removing own role → "Không thể gỡ admin cuối cùng"`; `B25E5: admin demotes self to editor → recheck, /staff disappears from nav and the page moves to the first visible path`; `staff list: "Tải thêm" fetches next_page_token until null`; `find by email: unknown email → "not found" message, unverified user → grant buttons disabled with the reason`; e2e `Review Focus 3: double-clicking "Xác nhận" in the grant dialog sends exactly one PUT`; e2e `Review Focus 2: a 320-character email in a staff card at 390 does not widen the page`; `create account: defaults send must_change_password true and no password; unticked generation sends the typed password only after it passes the policy and matches the confirmation; success message names the email and never shows a password; B25#25: email-taken suggests "Tìm theo email"; B25E16: mail-unavailable keeps the dialog open with its message`; e2e `Review Focus 3: double-clicking "Tạo tài khoản" sends one POST`.
- [ ] **Step 2:** → FAIL. **Step 3:** Implement per Figma. **Step 4:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` → PASS.
- [ ] **Step 5:** Commit `feat(admin): add staff role management`. M2 ready for a PR into `dev` when the owner asks.

---

### Task 12a: Restyle M2 to the approved Sneat-style Figma, 16-item menu, ComingSoon (added 14/10/2026, F5, F6, D23)

Tasks 10–12 were built on the first Figma. The owner approved a second version the same day. Logic (router, session, i18n, mock-api harness, API calls, page behaviour) stays; styles, shell and `src/ui` change.

**Files:** Modify `src/styles/globals.css`, `src/app/Shell.tsx`, `src/app/nav.ts` (+ test), `src/app/routes.tsx`, `src/ui/*`, `src/features/**` (class names only), `e2e/shell.spec.ts`, `messages/{vi,en}.json`, `package.json` + `pnpm-lock.yaml` (`lucide-react` → `1.55.0`), `pnpm-workspace.yaml` (remove the `minimumReleaseAgeExclude` entry); Create `src/features/coming-soon/ComingSoonPage.tsx` (+ test).

**Source of truth:** Figma https://www.figma.com/design/coVHzJwTFgMbooUrty7sOq — pages `Foundations` (variables `Admin tokens`, effect styles `shadow/card`, `shadow/nav`, components incl. `Sidebar` 29:4193, `ComingSoon` 65:194, `Icon` 15:155), `Shell`, `Tài khoản`, `Vai trò`, `Chưa có (ngoài 2.5)`; the `Mock` page is reference only and is **not** built. Read values with `get_design_context`/`get_variable_defs` after loading `figma-design-to-code`.

**Interfaces — Produces:** tokens `--color-bg: #f5f6fa`, `--color-danger-soft: #fdecec`, radius `0.375rem` for controls and panels, `--shadow-card`, `--shadow-nav`, banner vertical padding `0.75rem`; `NAV` as in Task 10 (16 items, 6 groups, `available`, `plannedStep`); `ComingSoonPage({ item })` rendering icon + "Tính năng chưa có" + the item's one-line purpose + "Dự kiến: …" exactly as the Figma frames on `Chưa có (ngoài 2.5)`; `/` and post-login redirect → `/uploads`; sidebar cards: white, no border, `shadow-nav`, uppercase group titles, active item `primary-soft` + `primary`; topbar is a floating card inset `1rem`; cards borderless with `shadow-card`; table headers uppercase small; mobile lists are separate borderless cards spaced `0.75rem`; sidebar/drawer scroll vertically inside the viewport; dialog fields full width (no `max-width`).

- [ ] **Step 1: Write the failing tests:** `nav: 16 items in 6 groups in Figma order; available only for /uploads, /publish-jobs, /export, /sources, /staff`; `nav: editor sees no AI group and no /staff; admin sees all 16`; `ComingSoonPage: shows "Tính năng chưa có", the purpose line and "Dự kiến: Bước 6" for /ai/costs`; `routes: / → /uploads and every unavailable path renders ComingSoonPage`; e2e `shell: group titles TỔNG QUAN … HỆ THỐNG visible at 1440; at 390 the ☰ drawer lists all items and scrolls`; e2e `axe: no serious/critical violations on a ComingSoon page and on the staff page at both widths`; keep every existing e2e green after updating selectors that depended on the old shell.
- [ ] **Step 2:** `pnpm test`, `pnpm test:e2e` → FAIL.
- [ ] **Step 3:** Implement per Figma. Contrast rule from Global Constraints still applies.
- [ ] **Step 4:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, production build with `VITE_API_BASE_URL=https://admin-api.wordmet.com` → all green; `pnpm install --frozen-lockfile` passes without the release-age exclusion.
- [ ] **Step 5:** Commit `style(admin): apply the approved sneat-style design and full menu`.

# Milestone M3 — CSV flow, real stack, done (branch `feat/buoc-2-5-m3-csv-flow`)

### Task 13: Sources and uploads (list + upload form)

**Files:** Create `src/features/sources/SourcesPage.tsx`, `src/features/uploads/{UploadsPage,UploadForm}.tsx`, `src/features/uploads/csv-header.ts`, `src/features/content/content-api.ts` (+ tests), `e2e/uploads.spec.ts`.

**Interfaces — Produces** (in `content-api.ts`, reused by Tasks 14–16): `listSources(api)`, `createSource(api, body)`, `listUploads(api, pageToken?)`, `createUpload(api, file: File, levelSourceId: string | null, key: string) → { batch_id; status }`, `getUpload(api, id)`, `revertUpload(api, id, key)`, `downloadRejected(api, id) → Blob`, `exportSenses(api, filter) → Blob`, `listTopics(api) → TopicView[]` (`TopicView = { code: string; names: { vi?: string; en?: string }; archived_at: string | null }`, as Task 6 returns), `createPublishJob(api, filter, key) → { job_id }`, `listPublishJobs(api, pageToken?)`, `getPublishJob(api, id)`, `downloadPublishReport(api, id) → Blob`; constants `LEVELS = ['A1','A2','B1','B2','C1','C2']` and `VALID_POS` (15 values, copied from `apps/api/src/content/content.constants.ts`, with that path in a comment). In `csv-header.ts`: `readCsvHeader(file: File): Promise<string[]>` (first line, BOM stripped, separator `,`/`;`/tab like the API) and `hasLevelColumn(headers): boolean` (normalized names `cefr` or `level` — `levelColumns` in `apps/api/src/content-pipeline/upload/columns.ts`; copy that file's header normalization so both sides agree).

- [ ] **Step 1: Write the failing tests:** `B25#11: submitting sends a fresh Idempotency-Key; a network error then "Thử lại" resends the same key; choosing another file or level source makes a new key`; `409 in-progress with Retry-After 2 → "Yêu cầu trước vẫn đang chạy", resent after 2 s with the same key`; `409 idempotency-key-abandoned → new key and a message asking to submit again`; `B25E9: a 10 MB + 1 byte file or a .txt file is blocked before any request`; `Review Focus 1: a .csv with type application/vnd.ms-excel or '' is accepted`; `B25E21: a header with CEFR and no level source selected → selection required, no request`; `B25E22: source-incomplete → message names version and license`; `sources form: version and license marked required when "dùng làm nguồn level" is ticked`; e2e `Review Focus 3: double-clicking "Upload" sends one POST`; e2e `upload success navigates to /uploads/<batch_id>`.
- [ ] **Step 2:** → FAIL. **Step 3:** Implement per Figma. **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(admin): add sources and csv upload`.

### Task 14: Batch detail — polling, rejected rows, publish, revert

**Files:** Create `src/features/uploads/BatchPage.tsx`, `src/features/jobs/usePollingStatus.ts` (+ tests), `e2e/batch.spec.ts`.

**Interfaces — Produces:** `usePollingStatus<T extends { status: JobStatus }>(key: unknown[], fetcher: () => Promise<T>): UseQueryResult<T>` with `refetchInterval: q => isTerminal(q.state.data?.status) ? false : 2000`, `refetchOnWindowFocus: true`; `type JobStatus = 'queued' | 'running' | 'succeeded' | 'partial' | 'failed'`; `isTerminal(s)`; `useQueuedTooLong(status, createdAt, now): boolean` (> 30 s in `queued`). **Consumed by** Task 16.

- [ ] **Step 1: Write the failing tests** (fake timers): `B25#13: queued → running → succeeded: fetches every 2 s and stops after succeeded; partial and failed also stop`; `Review Focus 5: hidden tab does not poll; visibilitychange/focus fetches immediately and shows the final status`; `B25E8: queued for 31 s shows the worker hint, 29 s does not`; `B25E6: a 403 forbidden during polling goes through store.send (logout path covered in Task 9)`; `B25#14 (unit): "Tải rejected.csv" calls saveBlob with rejected-<id>.csv`; `B25E10: nothing-to-publish → its message`; `B25E11: reverted: true hides "Hoàn tác lô"; batch-not-revertable shows its reason`; `publish this batch posts { filter: { batch_id } } with an Idempotency-Key and navigates to /publish-jobs/<job_id>`; e2e `Review Focus 3: double-click on the revert dialog's confirm sends one POST`.
- [ ] **Step 2:** → FAIL. **Step 3:** Implement per Figma. **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(admin): add batch detail with polling, publish and revert`.

### Task 15: Export

**Files:** Create `src/features/export/ExportPage.tsx` (+ test), `e2e/export.spec.ts`.

**Interfaces — Consumes:** `exportSenses`, `listTopics`, `LEVELS`, `VALID_POS`, `listUploads` (Task 13). Query params: `status` (`unpublishable` | `open_draft` | `published`), `level`, `pos`, `topic`, `batch_id`; empty values omitted.

- [ ] **Step 1: Write the failing tests:** `export: chosen filters become the query string, empty ones are omitted, the blob is saved as senses-<yyyy-mm-dd>.csv (local date)`; `topics: names shown in the UI language, falling back to en then code; archived topics marked`; `B25E12: export-too-large → "thu hẹp bộ lọc" message`.
- [ ] **Step 2:** → FAIL. **Step 3:** Implement. **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(admin): add csv export with filters`.

### Task 16: Publish jobs — list, create, detail

**Files:** Create `src/features/publish-jobs/{PublishJobsPage,PublishJobPage}.tsx` (+ tests), `e2e/publish-jobs.spec.ts`.

**Interfaces — Consumes:** `listPublishJobs`, `createPublishJob`, `getPublishJob`, `downloadPublishReport`, `listTopics` (Task 13), `usePollingStatus` (Task 14), `useIdempotencyKey` (Task 8).

- [ ] **Step 1: Write the failing tests:** `list: renders items from GET .../publish-jobs and "Tải thêm" follows next_page_token`; `create: filter level/topic/pos/batch_id posted as { filter }, new key per changed filter, navigates to the job`; `B25E10: nothing-to-publish on create`; `detail: polls until terminal, shows counters published/already_published/refused, "Tải report.csv" saves publish-<id>.csv`; `B25#18: 429 Retry-After 5 on create → button disabled with a 5 s countdown` (e2e with `mockApi`).
- [ ] **Step 2:** → FAIL. **Step 3:** Implement per Figma. **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(admin): add publish job list, creation and detail`.

### Task 17: Real-stack e2e and CI job `admin-e2e-real`

**Files:**
- Create: `playwright.real.config.ts`, `e2e-real/global-setup.ts`, `e2e-real/support/{mailpit,api}.ts`, `e2e-real/admin.real.spec.ts`, `e2e-real/fixtures/small.csv`
- Modify: `.github/workflows/ci.yml` (job `admin-e2e-real`)

**Interfaces:** API at `http://localhost:3000` and Mailpit API at `http://localhost:8025` are started **outside** Playwright (locally: `docker compose up -d`, `pnpm build`, `pnpm run:dev` in `apps/api`; in CI: workflow steps). `webServer` only serves the admin (`pnpm build:e2e && pnpm preview`, `VITE_API_BASE_URL=http://localhost:3000`). `global-setup.ts` waits for `GET /v1/health`, then via API: registers + verifies (OTP read from Mailpit, like `apps/api/scripts/smoke-buoc-2.mjs`) an admin and a learner with run-unique emails, runs `node dist/cli/admin-grant.js <email>` in `apps/api`, writes credentials to `e2e-real/.state.json` (gitignored). Registrations per run: **2** (the editor is created by the admin in the UI). The API needs `ADMIN_APP_URL=http://localhost:5173`. `retries: 0`, one worker, project `desktop` only.

- [ ] **Step 1: Write the tests** (`test.describe.serial`), each asserting its criterion's full Then:
  - `B25#23 + B25#27 + flow 1: the admin creates an editor account in the UI (generated password, must change) → the mail in Mailpit holds a password → the editor logs in → only /change-password is reachable → same password refused (same_as_current) → a new password lands in the app`.
  - `B25#9 + flow 2: admin removes the editor's role and grants it again via "Tìm theo email"; the staff list shows editor; B25#2: the learner logging in sees errors.noAccess`.
  - `B25#12, B25#14 + flow 3: editor registers a source, uploads small.csv (one invalid row) → 202 and batch page; rejected.csv downloads with the bad row; publish this batch → job succeeds and appears in /publish-jobs; revert the batch → reverted`.
  - `B25#4: reload keeps the editor signed in`.
  - `B25#6: admin removes the editor's role while the editor's page is open; the editor's next action ends at /login with errors.noAccess`.
  - `B25#6a: the test changes the admin's password through the API (POST /v1/auth/password/change); the admin tab's next action ends at /login with notice.expired`.
  - `B25#8 + B25E1 + flow 4: two pages of one context reload at the same moment and both stay signed in; logout in page A sends page B to /login with no action in B` (signs in as the admin with the new password from the previous test; tests run in the order listed).
- [ ] **Step 2:** Run locally (API + worker via `pnpm run:dev`, Mailpit via Docker): `pnpm test:e2e:real` → expect FAIL only where M2/M3 code is wrong; fix and re-run until PASS. Record in the commit message body whether B25E1 (concurrent refresh) and B25E2 (`Secure` cookie on `http://localhost`) held — these close two spec `ASSUMPTION`s.
- [ ] **Step 3:** Add CI job `admin-e2e-real`: services `postgres:17` (5434), `redis:7.4-alpine` (6380), `axllent/mailpit` (1025, 8025); in `apps/api`: install, `pnpm db:setup`, `pnpm build`, write env (the variable list of `test/support/worker-env.ts` with secrets from `node scripts/gen-secret.mjs`, `CORS_ORIGINS=http://localhost:5173`, `ADMIN_APP_URL=http://localhost:5173`, `MAINTENANCE_ENABLED=false`), start `node dist/main.js` and `node dist/worker.js` in the background; in `apps/admin`: Playwright Chromium, `pnpm test:e2e:real`; upload `playwright-report` on failure.
- [ ] **Step 4:** Commit `test(admin): add real-stack e2e and ci job`.

### Task 18: M3 gate — manual "Xong khi" run and docs

**Files:** Create `docs/deliveries/buoc-2-5-test-flow.md`; modify `docs/deliveries/buoc-2-5.md` (as-built section), `docs/HANDOFF_2026-10-05_BUOC_0.md` §2, `CLAUDE.md` (Current phase/Next, Bước 2.5 line), spec §15 (close the verified `ASSUMPTION`s).

- [ ] **Step 1:** Full gate: `apps/api` lint/typecheck/build/test/test:e2e; `apps/admin` lint/typecheck/test/build/test:e2e/test:e2e:real — all green, outputs kept for the delivery record.
- [ ] **Step 2:** Manual run exactly as spec §1 "Xong khi" item 3 (fresh DB → `admin:grant` → second browser registers editor → grant → editor uploads the real CEFR-J 1.5 file → report → export `unpublishable` → fill a few rows → re-upload → publish that batch → learner search finds them; learner blocked; editor kicked after role removal; widths 390/768/1024/1440). Write each step and its observed result into `buoc-2-5-test-flow.md`.
- [ ] **Step 3:** Update the docs listed above (HANDOFF: Bước 2.5 done, add the unscheduled "Deploy API + admin" step before the Bước 3 pilot).
- [ ] **Step 4:** Commit `docs: record bước 2.5 as-built and test flow`. M3 ready for a PR into `dev` when the owner asks.
