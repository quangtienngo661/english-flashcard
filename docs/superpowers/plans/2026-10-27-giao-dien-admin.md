# Đợt giao diện admin — Implementation Plan

> **Status 27/10/2026:** written after the owner approved the design and T1–T9 ("Duyệt T6–T9 như đã sửa, chuyển sang viết plan"; main session: "Ok, I2
> chọn (a) trang báo không có quyền, tách M0 khung chung"). The execution method is chosen with the owner when the plan is approved.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement
> this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every "Sắp có" entry of `apps/admin` except Dashboard with the 15 screens of Figma page 04 (AI, system settings, reports, users,
grants, content), in Vietnamese and English, on a data router with leave-page protection, plus the small additive API changes the screens need.

**Architecture:** M0 moves the admin to `createBrowserRouter` and adds the shared pieces (one blocker in `Shell`, a "no permission" view, URL filters,
field-error focus, kept drafts, new `ui/` components, the 24-entry menu, the real-stack test accounts). Each later milestone adds its API fields
(NestJS, one module each, emails only through `IdentityService`) and its screens under `src/features/<area>/` (`<Area>Page.tsx` + `<area>-api.ts`,
data and state apart from rendering). Seven PRs into `dev`, one branch each.

**Tech Stack:** admin: React 19.3.0, react-router 8.4.0, react-aria-components 1.22.1, TanStack Query 5.104.2, use-intl 4.14.9, Tailwind 4, Vitest
4.1.11, Playwright 1.63.0; API: NestJS, Prisma (TypedSQL), zod 4, Vitest.

**Spec:** [`../specs/2026-10-27-giao-dien-admin-design.md`](../specs/2026-10-27-giao-dien-admin-design.md) ("design §N"). Decisions AD0–AD14, T1–T9:
[`../decisions/2026-10-27-giao-dien-admin-decisions.md`](../decisions/2026-10-27-giao-dien-admin-decisions.md). Review: [`../reviews/2026-10-27-giao-dien-admin-design-review.md`](../reviews/2026-10-27-giao-dien-admin-design-review.md).
Code facts (all on `origin/dev` `5a60dce`): `docs/preparation/giao-dien-admin-facts/` — `plan-admin-client.md` ("C§N"), `plan-api-ai.md` ("A§N"),
`plan-api-domain.md` ("D§N"), and the per-frame API tables `ai.md`, `users-reports-grants-settings.md`, `content.md`. Copy (vi):
[`../../mockups/2026-10-21/ban-chu-giao-dien.md`](../../mockups/2026-10-21/ban-chu-giao-dien.md) §8. Frames: Figma `7HcPAKLrWu32C27qYMJUOA` page `04 Admin · Web`, node ids in
[`../../mockups/2026-10-22/figma-node-ids.md`](../../mockups/2026-10-22/figma-node-ids.md).

## Global Constraints

- **No new dependency.** `Tabs`, `Switch`, `NumberField`, `RadioGroup`, `TextArea` come from `react-aria-components` 1.22.1 (already installed; exports
  checked 27/10/2026), imported by name and aliased `as Aria*` like the existing wrappers (C§5).
- API changes only **add**: new fields beside the old ones, new read endpoints, a wider read permission on one endpoint (design §5, SR7, T1). No field is
  renamed or removed. Other modules reach Identity only through `IdentityService` (D3 of the system spec).
- Every user reference added to a response has the shape `{ id: string; email: string | null; system: boolean }` (design §5.1), built once per page
  with `IdentityService.emailsOf`.
- Colours and sizes only from tokens; no Tailwind arbitrary value and no inline `style` without `// raw-ok:` (`scripts/check-tailwind-raw.mjs`, C§5).
- One yellow (primary) button per screen. Text contrast ≥ 4,5:1, icons and input borders ≥ 3:1 (checked by `e2e/a11y.spec.ts`).
- Every string in `messages/vi.json` **and** `messages/en.json` (AD11); vi copy from the copy doc §8, missing copy written in its style ("what happened,
  then what to do") and listed in the delivery record.
- Times shown in `Asia/Ho_Chi_Minh`; date filters are Vietnamese days sent as `YYYY-MM-DDT00:00:00+07:00`, end exclusive (as `transactions-api.ts`, C§4).
- Every write the API marks idempotent goes through `useSubmitAction` (design §4.6). `[Chạy thử]` is never re-sent automatically.
- Lists keep filters in the URL (`useUrlFilters`), never `page_token` (design §4.3). Paging is "Tải thêm" (`useInfiniteQuery`), as Giao dịch (C§4).
- No real AI call in CI or in tests (`AI_FAKE_ENABLED=true`, fake models only).
- TDD: each task writes its failing tests first. A test that proves a design row names it (`§6.4: …`, `§4.6: …`).
- Git: branch `feat/giao-dien-admin-<m0|m1a|m1b|m2|m3|m4|m5>` from `origin/dev` after the previous PR merged; Conventional Commits, one per task;
  push, PR into `dev` and merge on green CI need no approval (CLAUDE.md); scan for secrets before each push.

## Review Focus

1. **Leaving a half-edited form by every route out** (menu link, browser Back, closing a route dialog, reload, session expiry) → asked once when the
   page changes, never when only `?tab=` / filters change, never after a successful save; on session expiry the draft comes back after sign-in. Pinned
   in Task 4 (blocker tests) and Task 5 (draft tests), plus one e2e per form screen.
2. **Retry after a lost response** (network drops after the API wrote) → idempotent writes replay (same key), `expected_revision` writes show "Đã lưu"
   when the new revision equals the text on screen, `[Chạy thử]` is not re-sent. Pinned in Task 2 (`useSubmitAction`), Task 15 and Task 14.
3. **Stale or hand-edited URL** (`/reports?status=foo`, `/reports/<unknown id>`, `/users/<unknown>`, an admin-only path opened by an editor) → invalid
   filter values dropped, not-found text, "Bạn không có quyền xem trang này." — no crash, no 400 banner. Pinned in Task 6 and Task 3.
4. **Long and odd values at 390px** (8.000-character instructions, 300-character reasons, long model ids, long emails) → no horizontal page scroll.
   Pinned by an overflow check added to `e2e/ui-guidelines.spec.ts` for every new page (Task 8 adds the helper).
5. **Permission changes mid-session** (Minh demoted while on Báo lỗi) → 403 text, the menu follows the new permissions (the transport already
   re-checks, C§7), the page shows "no permission". Pinned in Task 3.

---

## Execution model

- **One milestone at a time, one branch and one PR each** (design §3). After a PR merges, the next branch starts from a fresh `origin/dev`.
- **Milestone gate (design §8):** tasks green locally → push → PR → CI green (`api`, `web`, `admin`, `admin-e2e-real`) → real run (API + worker +
  Postgres + Redis + Mailpit, `AI_FAKE_ENABLED=true`) of every screen of the milestone at 1440 and 390, screenshots next to the Figma frame in
  `docs/deliveries/giao-dien-admin.md` → the milestone's section of `docs/deliveries/giao-dien-admin-test-flow.md` → merge. No stop for screenshot
  approval (AD4); the owner's own test-flow pass does not block merge (AD10).
- **Step shorthand:** "Step 2–4" = run the new tests (expect FAIL for the stated reason), implement the Interfaces items, run them (expect PASS) plus
  the package's lint and typecheck. Commands: admin `pnpm --filter admin test | lint | typecheck | test:e2e`; API from `apps/api`:
  `pnpm exec vitest run <spec>`, `pnpm lint`, `pnpm exec tsc --noEmit -p tsconfig.json` (no `typecheck` script, A§0), `pnpm db:setup` once per fresh DB.
- **Existing tests asserted with `toEqual`** break when a field is added (A§1, A§4); each API task lists the ones to update.

## File map (apps/admin, new unless marked)

```
src/app/routes.tsx                 modified: appRoutes: RouteObject[] (createRoutesFromElements), AppRoutes removed
src/app/App.tsx                    modified: createBrowserRouter(appRoutes) + RouterProvider
src/app/nav.ts, nav-icons.ts       modified: 24 entries (design §4.4)
src/app/Shell.tsx                  modified: NoAccess view in place of the redirect; LeaveGuard
src/app/dirty-form.tsx             DirtyFormProvider, useDirtyForm, LeaveGuard (one useBlocker + useBeforeUnload)
src/app/NoAccess.tsx               "Bạn không có quyền xem trang này." [Về trang chủ]
src/app/test-router.tsx            renderRoutes(): createMemoryRouter(appRoutes) for unit tests
src/api/client.ts, problem.ts      modified: patch, delete, put opts; Problem.reason
src/api/use-url-filters.ts         useUrlFilters
src/api/field-errors.ts            violationsToFields, useFocusFirstError
src/api/use-kept-draft.ts          useKeptDraft (sessionStorage)
src/api/user-ref.ts                UserRef type + userLabel()
src/ui/{TextArea,Switch,NumberField,RadioGroup,ConfirmDialog}.tsx (M0); Tabs.tsx (M2); DataList.tsx (selection, M5); TextField.tsx, Select.tsx (id)
src/features/ai/                   ai-api.ts; AiStatusPage, AiModelsPage, AiOperationsPage, AiPromptsPage (M1a); AiEvalPage, AiCostsPage, AiCallsPage (M1b)
src/features/settings/             settings-api.ts, SettingsPage.tsx, SettingsHistoryDialog.tsx (M2)
src/features/reports/              reports-api.ts, ReportsPage.tsx, ReportDetail.tsx, ReportReasonsPage.tsx, RefundsPage.tsx (M3)
src/features/unknown-forms/        unknown-forms-api.ts, UnknownFormsPage.tsx (M3)
src/features/users/                users-api.ts, UsersPage.tsx, UserDetail.tsx (M4)
src/features/entitlements/         entitlements-api.ts, GrantsPage.tsx, GrantDialog.tsx, EditDatesDialog.tsx (M4)
src/features/words/, senses/, topics/   M5 pages (+ content-api.ts additions)
e2e/<area>.spec.ts                 mock e2e per screen; e2e-real/<m>.real.spec.ts per milestone
```

---

## M0 — Khung chung (PR 1)

### Task 1: Data router

**Files:** Modify `apps/admin/src/app/routes.tsx`, `App.tsx`, `src/features/staff/test-utils.tsx`, `src/app/session-loading.test.tsx`; create
`src/app/test-router.tsx`.

**Interfaces:**
- Produces: `export const appRoutes: RouteObject[]` = `createRoutesFromElements(<>…the current tree…</>)` (C§1, unchanged paths and children);
  `App` renders `<RouterProvider router={router} />` with `router = useMemo(() => createBrowserRouter(appRoutes), [])`, inside the same providers,
  `ToastRegion` still outside (design §4.2). `AppRoutes` is deleted (3 importers, C§2).
- `renderRoutes(path: string, providers: (node: ReactNode) => ReactNode): ReturnType<typeof render>` in `test-router.tsx` builds
  `createMemoryRouter(appRoutes, { initialEntries: [path] })`; `renderApp` and `renderWith` use it (11 + 1 test files keep their calls unchanged).

- [ ] **Step 1:** Run `pnpm --filter admin test` on the untouched branch and keep the count (baseline).
- [ ] **Step 2:** Change routes, `App`, the two helpers. **Step 3:** `pnpm --filter admin test && pnpm --filter admin test:e2e` → same count, all PASS.
- [ ] **Step 4: Commit** `refactor(admin): move to a data router`.

### Task 2: API client, problems and error copy

**Files:** Modify `src/api/client.ts` (+ test), `src/api/problem.ts` (+ `problem.test.ts`), `src/features/content/useSubmitAction.ts` (+ test),
`messages/{vi,en}.json`; create `src/i18n/parity.test.ts`.

**Interfaces:**
- `ApiClient` adds `patch<T>(path, body, opts?: { idempotencyKey?: string })`, `delete<T>(path, opts?: { idempotencyKey?: string })`; `put<T>(path,
  body, opts?: { idempotencyKey?: string })` (existing callers unchanged).
- `Problem` adds `reason?: string` read from the top-level body member (API spreads extensions, C§3).
- `useSubmitAction` return adds `problem: Problem | null` (the last `ApiError.problem`), so screens map `violations` and `reason`.
- `KNOWN_ERROR_SLUGS` adds every slug of design §4.5 (not `topic-exists`, already there) with vi and en text.

- [ ] **Step 1: Failing tests:** `client.patch('/x', b, { idempotencyKey: 'k' })` sends `PATCH` and header `Idempotency-Key: k`; `delete` returns
  `undefined` on 204; `toApiError` of `{ type: '…/grant-not-allowed', reason: 'self-grant' }` keeps `reason`; `useSubmitAction` exposes `problem.violations`
  after a 400; `problem.test.ts` (existing loop) covers the new slugs; `parity.test.ts`: the key sets of `vi.json` and `en.json` are equal (AD11).
- [ ] **Step 2–4. Step 5: Commit** `feat(admin): extend the api client and error copy for the new screens`.

### Task 3: Menu of 24 entries and the "no permission" view

**Files:** Modify `src/app/nav.ts` (+ `nav.test.ts`), `nav-icons.ts`, `Shell.tsx`, `routes.tsx`, `features/coming-soon/ComingSoonPage.test.tsx` (purposes),
`features/staff/test-utils.tsx` (`ME_ADMIN` gets `settings.manage`, `entitlements.grant`), `features/transactions/TransactionsPage.test.tsx:36-41`,
`features/staff/StaffPage.test.tsx:142-177`, `e2e/shell.spec.ts:73-77`, `e2e/transactions.spec.ts:54-68`, `e2e/support/mock-api.ts` (if needed),
`messages/*`; create `src/app/NoAccess.tsx` (+ test).

**Interfaces:**
- `NAV` = the 24 rows of design §4.4 in that order (groups `overview, content, practice, learners, ai, system`), new entries `available: false` until
  their milestone flips them; `/reported` → `/reports`, `/irregular-forms` → `/unknown-forms` (group `content`); `/words`, `/senses` need
  `content.edit`; AI entries need `settings.manage`; remove the `ADMIN` stand-in. Every entry has an icon in `NAV_ICONS`.
- `Shell.tsx:132`: when `!canAccess(pathname, perms)` render `<NoAccess />` in place of `<Outlet />` (h1 keeps the entry label, C§1); `/` and sign-in
  still go to `homePath`.
- `NoAccess`: text `noAccess.title` = "Bạn không có quyền xem trang này." / "You don't have access to this page.", `Button` [Về trang chủ] →
  `homePath(perms)` (A/71e).

- [ ] **Step 1: Failing tests:** `nav.test.ts` order = the 24 paths; editor sees exactly Dashboard, Từ, Nghĩa, Chủ đề, Lô nhập, Publish job, Xuất CSV,
  Nguồn, Dạng chia chưa biết, Báo lỗi, Cấp gói và lượt (A/71e sidebar, 11 entries); admin sees 24. `NoAccess` test: editor at `/staff` → h1 "Vai trò &
  staff", text "Bạn không có quyền xem trang này.", button leads to `/uploads`. Rewrite the four redirect tests to assert the NoAccess view; the
  self-demotion test: after the role change the page shows NoAccess. Review Focus 5: a 403 `forbidden` on a query renders `errors.forbidden` and,
  once `recheck` returns editor perms, the sidebar drops the admin entries.
- [ ] **Step 2–4** (unit + `test:e2e`). **Step 5: Commit** `feat(admin): show the full menu and a no-access page`.

### Task 4: Dirty forms and the single blocker (T6)

**Files:** Create `src/app/dirty-form.tsx` (+ `dirty-form.test.tsx`); modify `Shell.tsx` (wrap with `DirtyFormProvider`, render `<LeaveGuard />`),
`messages/*` (`leave.*`).

**Interfaces:**
- `DirtyFormProvider({ children })` holds a ref map `id → pathname`.
- `useDirtyForm(isDirty: boolean): { release(): void }` registers `{ id, pathname: location.pathname }` while `isDirty`; `release()` removes it
  **synchronously** (call it right before a post-save or post-cancel `navigate`).
- `LeaveGuard`: `useBlocker(({ currentLocation, nextLocation }) => hasDirtyOn(currentLocation.pathname) && nextLocation.pathname !== currentLocation.pathname)`;
  when `blocked`, `ConfirmDialog` "Rời trang?" / "Thay đổi chưa lưu sẽ mất." [Ở lại] → `reset()`, [Rời trang] → clear all, `proceed()`;
  `useBeforeUnload((e) => { if (anyDirty) e.preventDefault(); })`.
- `useDialogDirtyClose(isDirty, close: () => void): () => void` returns the handler for [Hủy] / ✕ / Esc: dirty → inline "Bỏ thay đổi?" confirm, then
  `release()` + `close()`.

- [ ] **Step 1: Failing tests** (memory data router): dirty form on `/settings`, click a nav link → dialog, [Ở lại] stays, [Rời trang] goes;
  `navigate('/settings?tab=ai')` while dirty → no dialog (§4.3); `release()` then `navigate('/sources')` → no dialog; history back while dirty →
  dialog; two dirty registrations (page + dialog) → still one dialog; `beforeunload` event is cancelled only while dirty.
- [ ] **Step 2–4. Step 5: Commit** `feat(admin): warn before leaving a form with unsaved changes`.

### Task 5: Kept drafts (session expiry)

**Files:** Create `src/api/use-kept-draft.ts` (+ test), `src/ui/RestoreDraftBanner.tsx`.

**Interfaces:**
- `useKeptDraft<T>(key: string, value: T, isDirty: boolean): { kept: T | null; discard(): void; clear(): void }`; storage key
  `wordmet-admin.draft.<key>` in `sessionStorage`, written on each change while dirty, every access in try/catch (no storage → no-op).
- `RestoreDraftBanner({ onRestore, onDiscard })`: `Banner variant="info"` "Bạn có thay đổi chưa lưu từ lần trước." [Khôi phục] [Bỏ].
- Callers: Prompt (`ai-prompt:<op>`), Settings (`settings`), sense detail (`sense:<id>`). `clear()` after a successful save.

- [ ] **Step 1: Failing tests:** draft written while dirty, removed by `clear()`; a second mount with a stored draft returns it as `kept`; a throwing
  `sessionStorage` gives `kept: null` without error; `discard()` removes it. Review Focus 1: `RequireSession` sign-out mid-edit then sign-in back
  to `from` → banner shown, [Khôi phục] puts the text back.
- [ ] **Step 2–4. Step 5: Commit** `feat(admin): keep unsaved form drafts across a session expiry`.

### Task 6: URL filters and field errors

**Files:** Create `src/api/use-url-filters.ts`, `src/api/field-errors.ts` (+ tests); modify `src/ui/TextField.tsx` and `src/ui/Select.tsx` (both gain `id?: string`,
passed to the field so it can be focused; numbers use `NumberField`, not a TextField type).

**Interfaces:**
- `useUrlFilters<T extends Record<string, string>>(spec: { [K in keyof T]: { default: T[K]; valid: (v: string) => boolean } }): [T, (next: Partial<T>) => void]`
  — reads `useSearchParams`, drops invalid or default values, writes with `setSearchParams` (push), never stores `page_token`.
- `violationsToFields(violations: string[], fieldOf: (path: string) => string | null): { fields: Record<string, string>; form: string[] }` — splits
  `"<path>: <message>"` (C§3) and maps the path to a field id; unmapped → `form`.
- `useFocusFirstError(fields: Record<string, string>, order: string[]): void` — focuses `document.getElementById(order.find(id => fields[id]))` after a
  render with new errors.

- [ ] **Step 1: Failing tests:** `?status=foo&source=ai` with `valid: (v) => ['open',…].includes(v)` → `{ status: 'open' (default), source: 'ai' }` and
  the URL loses `status=foo` (Review Focus 3); writing a filter pushes one history entry; `violationsToFields(['values.practice.default_questions_per_session: Expected at most max_questions_per_session', 'x: y'], …)`
  maps the first to `practice.default_questions_per_session`, the second to `form`; focus lands on the first field in `order`.
- [ ] **Step 2–4. Step 5: Commit** `feat(admin): keep list filters in the url and focus the first invalid field`.

### Task 7: New ui components

**Files:** Create `src/ui/{TextArea,Switch,NumberField,RadioGroup,ConfirmDialog}.tsx`; extend `src/ui/ui.test.tsx`; add the samples to the
`e2e/a11y.spec.ts` fixture page if one exists (else to the first screen that uses them).

**Interfaces:** (props follow `TextField`/`Select`: `label`, `value`, `onChange`, `description?`, `error?`, `isDisabled?`, `id?`)
- `TextArea` + `maxLength?`, `counter?: boolean` (shows "1.234/8.000", red when over, does not block typing, §6.4).
- `Switch({ label, isSelected, onChange, description? })`.
- `NumberField` + `minValue?`, `maxValue?`, `step?`, `isNullable?: boolean` (empty → `null`), value `number | null`.
- `RadioGroup({ label, value, onChange, items: Array<{ id: string; label: string; description?: string }> })`.
- `ConfirmDialog({ isOpen, title, children, confirmLabel, cancelLabel?, tone?: 'primary' | 'danger', isPending?, onConfirm, onCancel })` on `Dialog
  size="sm"`.

- [ ] **Step 1: Failing tests:** each renders its label and reports changes; `NumberField isNullable` cleared → `onChange(null)`; `TextArea counter`
  over `maxLength` has the danger style and still accepts input; `ConfirmDialog` Esc → `onCancel`; axe clean.
- [ ] **Step 2–4. Step 5: Commit** `feat(admin): add switch, number, radio, text area and confirm dialog`.

### Task 8: Real-stack accounts, CI flag, M0 e2e and gate

**Files:** Modify `.github/workflows/ci.yml` (job `admin-e2e-real` env adds `AI_FAKE_ENABLED=true`), `apps/admin/e2e-real/global-setup.ts`,
`e2e-real/support/api.ts`, `e2e/ui-guidelines.spec.ts` (overflow helper), `docs/deliveries/giao-dien-admin.md` (holds the plan summary; as-built
sections go after it); create `e2e-real/m0.real.spec.ts`, `docs/deliveries/giao-dien-admin-test-flow.md`.

**Interfaces:**
- `support/api.ts` adds `apiCall<T>(method, path, token, body?, opts?: { idempotencyKey?: string }): Promise<T>` (adds `X-CSRF-Protection: 1`, D§8)
  and `createAccount(adminToken, email, role: 'editor' | null): Promise<{ id: string; password: string }>` = `POST /v1/admin/users` (`staff_role:
  'editor'`, `must_change_password: false`, password set in the body), then for `null` `PUT /v1/admin/users/:id/staff-role` `{ staff_role: null }`
  and, signed in as that user, `PATCH /v1/me` `{ native_language: 'vi' }` (D§7, D§9 row 4). These use rule `user.write`, not `auth.register.ip`.
- `RealState` adds `editor` (Minh), `lan`, `khoa` (`{ id, email, password }`); registrations stay 2 per run (design §7).
- `expectNoHorizontalScroll(page)` in `ui-guidelines.spec.ts`: `document.documentElement.scrollWidth <= innerWidth` at 390 (Review Focus 4).

- [ ] **Step 1:** `m0.real.spec.ts`: the 8 existing tests still pass on the new router (run the whole real suite); Minh opens `/staff` → NoAccess.
- [ ] **Step 2:** Run the real stack (C§8 configs, runbook in the test-flow doc), screenshots of the old screens and NoAccess next to A/71e into
  `giao-dien-admin.md` (section "M0 — as-built"); test-flow section "M0".
- [ ] **Step 3: Commit** `test(admin): add the real-stack accounts and the m0 checks`; push, PR, CI green, merge.

---

## M1a — AI, cấu hình (PR 2)

### Task 9: API — user refs, prompt authors, prompt guard

**Files:** Create `apps/api/src/common/user-ref.ts` (+ spec); modify `src/ai/prompts/prompts.service.ts` (+ spec, `toEqual` at `:150-154`, `:234`, A§1).

**Interfaces:**
- `export type UserRef = { id: string; email: string | null; system: boolean }`;
  `export function userRef(id: string, emails: ReadonlyMap<string, string>, systemIds: ReadonlySet<string> = new Set()): UserRef` (pure, in `common/`
  so no module imports `identity/` from there, A§9).
- `PromptsService` gets `IdentityService` as 7th constructor arg (A§1). `PromptView` adds `updated_by_user: UserRef`, `guard: string` (=
  `PROMPT_GUARD`); `PromptRevisionView` adds `saved_by_user: UserRef`; `systemIds = new Set([AI_SYSTEM_ACTOR_ID])`; one `emailsOf` per call.

- [ ] **Step 1: Failing tests:** `userRef('u1', new Map([['u1','minh@x']]))` → `{ id:'u1', email:'minh@x', system:false }`; unknown id → `email: null,
  system: false`; `AI_SYSTEM_ACTOR_ID` in `systemIds` → `system: true`. `get(OP)` on the seed → `updated_by_user: { id: SEED_ACTOR, email: null,
  system: true }`, `guard: PROMPT_GUARD`; revisions call `emailsOf` once per page; the `PUT` response carries both fields.
- [ ] **Step 2–4. Step 5: Commit** `feat(api): add author emails and the fixed guard to admin prompts`.

### Task 10: API — test quota and the purpose of the last error

**Files:** Modify `src/common/rate-limit/rate-limiter.service.ts` (+ spec), `src/ai/api/admin-ai-reports.controller.ts` (+ spec, explicit route list
`:39-42`), `src/ai/reports/reports.service.ts` (+ spec `:41`, `:142`, A§4).

**Interfaces:**
- `RateLimiter.peek(rule: RateLimitRuleName, subject: string): Promise<{ limit: number; used: number; resetsAt: Date }>` — same key and window code as
  `hit` (extract a private helper), `findUnique` on `key_windowStart`, missing row → `used: 0`; never writes.
- `GET /v1/admin/ai/test-quota` in `AdminAiReportsController` (class `settings.manage`, actor from `@Req() req.user!.userId`, A§6) →
  `{ limit, remaining: Math.max(0, limit - used), resets_at: resetsAt.toISOString() }` for rule `ai.test`.
- `status()` SQL selects `purpose`; `last_error` = `{ at, outcome, http_status, purpose: AiPurpose }`.

- [ ] **Step 1: Failing tests:** peek after 3 hits → `used: 3`, still 3 after the peek; used 23 (over max 20) → `remaining: 0`; at 12:59:59Z `resetsAt`
  = 13:00:00Z; route listed with `settings.manage`, an editor gets 403; `last_error.purpose === 'test'` for a test-run failure.
- [ ] **Step 2–4. Step 5: Commit** `feat(api): report the test-run quota and the purpose of the last ai error`.

### Task 11: AI client module

**Files:** Create `apps/admin/src/features/ai/ai-api.ts` (+ test), `src/api/user-ref.ts` (+ test).

**Interfaces:**
- Types mirror `ai.md` and Tasks 9–10: `AiOperation` (6, order of `AI_OPERATIONS`), `AI_OPERATION_ORDER`, `AiStatus`, `AiModel`, `AiOperationSetting`,
  `PromptView`, `PromptRevision`, `TestResult`, `TestQuota`.
- Functions (`api: ApiClient` first arg): `getStatus`, `listModels`, `createModel(body)`, `updateModel(id, body)`, `refreshModel(id)`, `deleteModel(id)`,
  `listOperations`, `saveOperation(op, body)`, `getPrompt(op)`, `listRevisions(op, pageToken?)`, `savePrompt(op, body)`, `runTest(op, body)`,
  `getTestQuota()`; query keys `['ai', …]`.
- `sortByOperationOrder<T extends { operation: AiOperation }>(rows: T[]): T[]`; `effortChoicesFor(setting, models)`; `userLabel(ref: UserRef, t)` →
  email, `t('common.system')` ("Hệ thống") when `system`, `t('common.unknownUser')` when `email` is null.

- [ ] **Step 1: Failing tests:** paths and methods per function; `sortByOperationOrder` puts `generate_cloze` first though the API returns a→z
  (§6.3); `userLabel` three cases.
- [ ] **Step 2–4. Step 5: Commit** `feat(admin): add the ai api client`.

### Task 12: Tình trạng (A/84, A/84b)

**Files:** Create `src/features/ai/AiStatusPage.tsx` (+ test), `e2e/ai-status.spec.ts`; modify `routes.tsx` (`ai/status`), `nav.ts` (`available: true`),
`messages/*` (`ai.status.*`, `ai.operations.names.*`, `ai.reasons.*`).

- [ ] **Step 1: Failing tests** = design §6.1 table: fresh DB → 6 rows "Chưa sẵn sàng · Chưa chọn model", each with [Chọn model] → `/ai/operations`;
  `ai_enabled: false` → every row "AI đang tắt" and the head links to `/settings?tab=ai`; `today.cap: null` → "Lời gọi hôm nay: 1.240"; a
  `model_warning` with `shutdown_at` 30/11/2026 → warning badge "Ngừng ngày 30/11/2026"; last error shows "· chạy thử" for `purpose: 'test'` and the
  note under the table; the 4 reason codes map to the 4 texts.
- [ ] **Step 2–4. Step 5: Commit** `feat(admin): add the ai status page`.

### Task 13: Model (A/80, A/80b)

**Files:** Create `src/features/ai/AiModelsPage.tsx`, `ModelDialog.tsx` (+ tests), `e2e/ai-models.spec.ts`; modify `routes.tsx` (`ai/models`, child `new`,
`:id`), `nav.ts`, `messages/*`.

- [ ] **Step 1: Failing tests:** list columns (provider · model id, prices or "Chưa có giá", estimate or "—", used by, lifecycle, last check); add form
  offers only providers with `providers[p] === true`; `model-exists`, `provider-not-configured`, `model-not-found`, `model-not-supported`,
  `provider-unavailable` show the design §6.2 texts; delete in use → 409 → "Model đang được thao tác dùng, chưa xóa được." + names from the row's
  `used_by`; delete through `ConfirmDialog`; edit prices (PATCH) with `useDirtyForm` in the dialog; invalid price → field error focused.
- [ ] **Step 2–4. Step 5: Commit** `feat(admin): add the ai models page`.

### Task 14: Thao tác (A/81)

**Files:** Create `src/features/ai/AiOperationsPage.tsx` (+ test), `e2e/ai-operations.spec.ts`; modify `routes.tsx`, `nav.ts`, `messages/*`.

**Interfaces:** one editable row per operation (model select incl. "Không có model", effort, thinking, max output tokens), each with its own [Lưu] sending
`PUT …/operations/{op}` with `expected_version`; page dirty while any row differs from the server row.

- [ ] **Step 1: Failing tests** = design §6.3: model switch to one without the chosen effort → effort "Mặc định" + hint "Model này không có mức <x>";
  model without `thinking_off_available` hides "Tắt"; violation strings `thinking: this model cannot turn thinking off` / `thinking: off needs effort
  high or below` → their copy under the Thinking field (unit test keeps both strings, design §4.5); 409 `operation-settings-conflict` → copy + [Tải
  lại], fields kept; Review Focus 2: 409 after a network error where the reloaded row equals the row on screen → "Đã lưu"; save → toast "Đã lưu. Áp
  từ lần gọi sau."; dirty row + nav link → leave dialog.
- [ ] **Step 2–4. Step 5: Commit** `feat(admin): add the ai operation settings page`.

### Task 15: Prompt (A/82)

**Files:** Create `src/features/ai/AiPromptsPage.tsx`, `PromptHistory.tsx`, `TestRunPanel.tsx` (+ tests), `e2e/ai-prompts.spec.ts`; modify `routes.tsx`
(`ai/prompts`, `?op=` filter), `nav.ts`, `messages/*`.

**Interfaces:** operation picker in the URL (`useUrlFilters`, default `generate_cloze`); editor = `TextArea counter maxLength={8000}`, examples (≤ 10
pairs, inputs built from `input_fields`), read-only guard, revision number, [Lưu] (`expected_revision`), `useDirtyForm`, `useKeptDraft('ai-prompt:'+op)`;
[Chạy thử] sends the editor content + `example_ids` (≤ 5, picker reads `GET /eval/examples?operation=` which exists already); quota line from
`getTestQuota()` on mount and after every run, success or error; history list with [Xem] (read-only) and [Chép vào ô sửa].

- [ ] **Step 1: Failing tests** = design §6.4: `model-not-set` → copy + link to Thao tác; 429 → "Đã dùng hết 20 lần chạy thử trong giờ này. Thử lại
  lúc 15:00." from `Retry-After`; `prompt-revision-conflict` keeps the text and offers [Tải bản mới]; the self-save case → "Đã lưu" (§4.6); over 8.000
  → counter red, API 400 field error focused; one failed sample shows its status and reason while the others show output; the "Chạy với:" line for
  selected / first five / prompt examples; network error on [Chạy thử] → no second request (Review Focus 2); author shown via `userLabel` ("Hệ
  thống" for the seed); kept draft restored after a forced sign-out.
- [ ] **Step 2–4. Step 5: Commit** `feat(admin): add the ai prompt page with test runs`.

### Task 16: M1a e2e, test flow and gate

- [ ] **Step 1:** add the four pages to `e2e/a11y.spec.ts` (`pages` list + mocks, C§8) and `e2e/ui-guidelines.spec.ts` (overflow at 390 with an
  8.000-character prompt and a 100-character model id).
- [ ] **Step 2:** `e2e-real/m1a.real.spec.ts` (design §7): add model `fake` (provider `fake`), choose it for `generate_cloze`, Tình trạng shows
  "Sẵn sàng", edit the instructions, save, run a test → result rows.
- [ ] **Step 3:** real run, screenshots next to A/80–A/84b, test-flow "M1a" (including how to add the owner's own model and key locally);
  commit `test(admin): add the m1a e2e and test flow`; push, PR, CI green, merge.

---

## M1b — AI, đo (PR 3)

### Task 17: API — eval authors

**Files:** Modify `src/ai/eval/eval-examples.service.ts`, `eval-runs.service.ts` (+ specs; new stub for a found run, A§3).

**Interfaces:** `ExampleView` adds `created_by_user: UserRef` (list, POST, PATCH responses); run summary and detail add `started_by_user: UserRef`;
both services get `IdentityService`; one `emailsOf` per page.

- [ ] **Step 1: Failing tests:** list of 2 examples by 2 authors → one `emailsOf` call with both ids; `get(id)` of a found run has `started_by_user`;
  unknown author → `email: null`. **Step 2–4. Step 5: Commit** `feat(api): add author emails to ai examples and runs`.

### Task 18: Bộ ví dụ (A/83)

**Files:** Modify `src/features/jobs/usePollingStatus.ts` (+ test); create `src/features/ai/AiEvalPage.tsx`, `ExampleDialog.tsx`, `EvalRunPanel.tsx`
(+ tests), `e2e/ai-eval.spec.ts`; modify `ai-api.ts` (`listExamples`, `createExample`, `updateExample`, `deleteExample`, `startRun`, `listRuns`,
`getRun`), `AiPromptsPage.tsx` ([Chạy bộ ví dụ với bản này] → `startRun({ operation, prompt: { instructions, examples } })` then
`navigate('/ai/eval/runs/'+run_id)`), `routes.tsx` (`ai/eval`, children `new`, `runs/:id`), `nav.ts`, `messages/*`.

**Interfaces:**
- `usePollingStatus<T extends { status: string }>(key, fetcher, done: (s: string) => boolean = isTerminal)` (default = the existing `isTerminal`);
  old callers unchanged.
- Runs: `done = (s) => s === 'finished' || s === 'failed'`; "Chưa có worker…" via `useQueuedTooLong` (30 s). `startRun` through
  `useSubmitAction` (Idempotency-Key). Cost in ₫ = `cost_usd × values.ai.usd_vnd_rate` from `GET /v1/admin/settings`, labelled "theo tỷ giá hôm nay".

- [ ] **Step 1: Failing tests** = design §6.5: 101st example → "Mỗi thao tác tối đa 100 ví dụ."; `model-not-set` copy; a `running` run polls every 2 s
  and stops at `finished`; queued 31 s → worker hint; `failed` shows `error`, no auto re-run; `prompt_revision: null` → "Bản nháp"; network error on
  [Chạy bộ ví dụ] then [Thử lại] → same `Idempotency-Key`; example form fields from `input_fields`; started-by email.
- [ ] **Step 2–4. Step 5: Commit** `feat(admin): add the ai example set and runs`.

### Task 19: Chi phí (A/85), Các lần gọi (A/86)

**Files:** Create `src/features/ai/AiCostsPage.tsx`, `AiCallsPage.tsx` (+ tests), `e2e/ai-costs.spec.ts`; modify `ai-api.ts` (`getCosts(from,to,groupBy)`,
`listCalls(operationId)`), `routes.tsx`, `nav.ts`, `e2e/a11y.spec.ts` (`/ai/costs` stops being a static page, C§8), `messages/*`.

- [ ] **Step 1: Failing tests** = design §6.6: range > 366 days or from > to → field error before any request; API 400 also mapped to the field;
  5 group-by choices and the total row; `?operation_id=<x>` filled from the URL; empty → "Không có lời gọi nào với mã này."; content kept →
  "Còn tới 25/10" + [Xem], `null` → "Không còn nội dung".
- [ ] **Step 2–4. Step 5: Commit** `feat(admin): add the ai costs and calls pages`.

### Task 20: M1b e2e, test flow and gate

- [ ] **Step 1:** a11y + overflow for the three pages. **Step 2:** `e2e-real/m1b.real.spec.ts`: add an example, run the set, run reaches "Xong",
  Chi phí has a row, Các lần gọi finds the run's `operation_id`. **Step 3:** real run, screenshots A/83–A/86; test-flow "M1b" with the **first real AI
  call** steps for the owner (add model with own key, choose per operation, set `daily_provider_calls_cap`, run the example set; AD1, design §7);
  commit, push, PR, CI green, merge.

---

## M2 — Cài đặt hệ thống (PR 4)

### Task 21: API — setting defaults

**Files:** Modify `apps/api/src/settings/admin-settings.controller.ts`; create `admin-settings.controller.spec.ts` (none exists, A§7; direct construction
as `me-app-config.controller.spec.ts:11-17`).

**Interfaces:** `GET /v1/admin/settings` adds `defaults: toApiValues(SETTINGS_DEFAULTS)`.

- [ ] **Step 1: Failing test:** `read().defaults.practice.max_questions_per_session === 20`, `defaults.ai.usd_vnd_rate === 26100`, same keys as
  `values`. **Step 2–4. Step 5: Commit** `feat(api): return setting defaults to the admin`.

### Task 22: Cài đặt hệ thống (A/70a–A/70f)

**Files:** Create `src/ui/Tabs.tsx` (+ `ui.test.tsx` cases), `src/features/settings/settings-api.ts`, `SettingsPage.tsx`, `SettingsField.tsx`,
`SettingsHistoryDialog.tsx` (+ tests), `e2e/settings.spec.ts`; modify `routes.tsx` (`settings`), `nav.ts`, `messages/*` (`settings.*`: label and meaning per key, 41 keys, copy doc §8.2).

**Interfaces:**
- `Tabs({ items: Array<{ id: string; label: string; marked?: boolean }>, selected: string, onSelect: (id: string) => void, children: (id: string) =>
  ReactNode })` on `react-aria-components` `Tabs`; `marked` shows the dot (§6.7); arrow keys move the selection.
- `SETTINGS_LAYOUT: Record<Section, Array<{ key: string; kind: 'bool' | 'int' | 'time' }>>` in the order of the copy doc; tabs `reminders, learning,
  practice, entitlements, content, ai` in the URL (`?tab=`, `useUrlFilters`).
- `changedValues(server: Values, draft: Values): Patch` (only changed keys; a value set back to the server value is not changed); `PUT` `{ version,
  values: patch }` through `useSubmitAction`; `Tabs` items `marked` when the tab has a changed key.
- Field hint "`<khóa>` · khoảng <min>–<max> · mặc định <d>" from `bounds` and `defaults`; nullable keys show their own empty meaning (design §6.7).
- Head of tab `entitlements`: `GET /v1/admin/entitlements/ai-usage` block (A/70d).
- `useDirtyForm`, `useKeptDraft('settings')`.

- [ ] **Step 1: Failing tests** = design §6.7: changes on two tabs → one `PUT` with both keys, toast, dots gone; switching tab while dirty → no leave
  dialog; a key set back to its old value → no dot, no leave dialog; violation `values.practice.default_questions_per_session: …` → switches to tab
  Luyện tập and focuses that field; `version-conflict` → copy + [Tải lại] asking first; empty nullable → `null` sent; history dialog: key, old → new,
  email, time, "Tải thêm"; kept draft restored after a forced sign-out.
- [ ] **Step 2–4. Step 5: Commit** `feat(admin): add the system settings page`.

### Task 23: M2 e2e, test flow and gate

- [ ] **Step 1:** a11y + overflow. **Step 2:** `e2e-real/m2.real.spec.ts`: change one field on two tabs, save, history shows two rows with the admin's
  email. **Step 3:** real run, screenshots A/70a–A/70f, test-flow "M2"; commit, push, PR, CI green, merge.

---

## M3 — Báo lỗi (PR 5)

### Task 24: API — reports: authors, refundable, one report, chosen option

**Files:** Modify `apps/api/src/practice/reports/reports.service.ts` (+ spec), `admin-reports.controller.ts` (+ spec, route table `:41-47`),
`snapshot.ts` (+ `snapshot.spec.ts`, every mcq `toEqual`, D§3).

**Interfaces:**
- `staffView(row, emails: ReadonlyMap<string, string>)` adds `resolved_by_user: UserRef | null` (null when `resolved_by` is null) and `refundable:
  boolean` (current `reasonRef.refundable`); `list` adds `include: { reasonRef: { select: { refundable: true } } }` (`:179`), the re-read in `resolve`
  (`:223`) the same; one `emailsOf` per page, outside any transaction.
- `ReportsService.get(id: string)` → the same view, 404 `not-found`; route `GET admin/practice/reports/:id` reusing `params` (`:12`), class `content.edit`.
- `buildSnapshot` mcq branch adds `learner.option_index: number | null` (`answer_raw === null ? null : Number(answer_raw)`); other kinds unchanged.

- [ ] **Step 1: Failing tests:** `list` (new tests, D§1): rows carry `refundable` from the reason and `resolved_by_user` with its email, one
  `emailsOf` per page; `get(unknown)` → 404; route table has `GET /v1/admin/practice/reports/:id` with `content.edit`; the `resolve` response has
  `refundable` and `resolved_by_user`; snapshot mcq answer `'1'` → `option_index: 1`, skipped → `null`.
- [ ] **Step 2–4. Step 5: Commit** `feat(api): add authors, refundable and a single read to admin reports`.

### Task 25: API — refunds by email, reasons readable by editors

**Files:** Modify `reports.service.ts` (`listRefunds`), `admin-reports.controller.ts` (`refundsQuery`, spec `:68-70`), `report-reasons.service.ts`
(+ spec; 3rd constructor arg, also `reports.service.spec.ts:74`), `admin-report-reasons.controller.ts` (+ `report-reasons.controller.spec.ts:52-59`).

**Interfaces:**
- `refundView` adds `user: UserRef`, `resolved_by_user: UserRef | null`; `refundsQuery` adds `resolved_by_email: z.string().max(320).optional()`,
  resolved with `findUserIdByEmail` (unknown → `{ items: [], next_page_token: null }`), the email in the page-token binding (as
  `TransactionsService.forAdmin`, D§1).
- `adminView` adds `updated_by_user: UserRef | null`; `ReportReasonsService(prisma, clock, identity)`.
- `@Get() list()` gets `@RequirePermission('content.edit')`; `POST`, `PATCH` keep the class `settings.manage` (design §5.3).

- [ ] **Step 1: Failing tests:** route table: `GET …/report-reasons` → `['content.edit']`, POST / PATCH → `['settings.manage']`; an editor token gets 200
  on GET and 403 on POST; refunds by an unknown email → empty, no `findMany`; a known email filters by its id; a token minted with one email is
  rejected with another (400).
- [ ] **Step 2–4. Step 5: Commit** `feat(api): let editors read report reasons and filter refunds by email`.

### Task 26: Báo lỗi (A/73, A/73e, A/74, A/74b, A/74c)

**Files:** Create `apps/admin/src/features/reports/reports-api.ts`, `ReportsPage.tsx`, `ReportDetail.tsx` (+ tests), `e2e/reports.spec.ts`; modify
`routes.tsx` (`reports`, child `:id`), `nav.ts`, `messages/*` (`reports.*`).

**Interfaces:** filters `status` (default `open`), `reason`, `source` in the URL; reason options from `GET /v1/admin/practice/report-reasons`; columns
Từ = `question_snapshot.correct.lemma`, Kiểu câu = `question_snapshot.type`, Lý do = `reason_label` (+ the admin-language label when different); detail
panel at `/reports/:id` from `GET …/reports/:id`; buttons by `question_source`; refund line when `ai_charged && ai_operation_id && refundable`;
`resolve` through `useSubmitAction`; the [Đã sửa] line links to `/senses?q=<lemma>`; the AI block links to `/ai/calls?operation_id=<call_operation_id>`.

- [ ] **Step 1: Failing tests** = design §6.8: the default request has `status=open`, empty text "Không còn báo lỗi chưa xử lý."; `report-not-open` →
  "Báo lỗi này đã được xử lý." and the report is refetched; confirmed with `refunded: null` → "Chưa trả được, hệ thống thử lại mỗi giờ", `false` →
  "Không trả lượt"; two masked options without `option_index` → "Không rõ lựa chọn nào", with `option_index` the right option is marked;
  `resolve-status-not-allowed` → generic copy; unknown id → "Không tìm thấy báo lỗi này." + link; a retry after a network error keeps the key;
  the editor sees the reason filter and the refund line; no "Người học đồng ý…" label (AD5).
- [ ] **Step 2–4. Step 5: Commit** `feat(admin): add the reports page`.

### Task 27: Lý do báo lỗi (A/75, A/75b)

**Files:** Create `src/features/reports/ReportReasonsPage.tsx`, `ReasonDialog.tsx` (+ tests), `e2e/report-reasons.spec.ts`; modify `reports-api.ts`,
`routes.tsx` (`report-reasons`, `new`, `:code`), `nav.ts`, `messages/*`.

- [ ] **Step 1: Failing tests** = design §6.9: rows in API order (`position`, no client re-sort); code hint "Bắt đầu bằng chữ, 2–40 ký tự a–z, 0–9, _"
  and a client check `^[a-z][a-z0-9_]{1,39}$`; `report-reason-exists` → "Đã có lý do mã này." on the code field; the "Đang dùng" switch sends `PATCH
  { active }`; note under the table "Báo lỗi cũ giữ tên lúc gửi"; the dialog uses `useDialogDirtyClose`; `updated_by_user` shown.
- [ ] **Step 2–4. Step 5: Commit** `feat(admin): add the report reasons page`.

### Task 28: Trả lượt (A/76)

**Files:** Create `src/features/reports/RefundsPage.tsx` (+ test), `e2e/refunds.spec.ts`; modify `reports-api.ts`, `routes.tsx`, `nav.ts`, `messages/*`.

- [ ] **Step 1: Failing tests:** filters `resolved_by_email`, `from`, `to` in the URL, dates sent `+07:00` with an exclusive end; columns: report link
  `/reports/<report_id>`, learner email, resolver email, role, "Tự xử lý báo lỗi của mình", refund state (true / false / null), time; empty state;
  note "Không thu hồi được lượt đã trả."; an editor at `/refunds` → NoAccess.
- [ ] **Step 2–4. Step 5: Commit** `feat(admin): add the refunds page`.

### Task 29: Dạng chia chưa biết (A/77, A/77b)

**Files:** Create `src/features/unknown-forms/unknown-forms-api.ts`, `UnknownFormsPage.tsx` (+ tests), `e2e/unknown-forms.spec.ts`; modify `routes.tsx`,
`nav.ts`, `messages/*`.

**Interfaces:** `listUnknownForms(api, pageToken?)`, `acceptForm(api, { lemma, form }, key)` (`POST /v1/admin/content/word-forms`, Idempotency-Key,
`lemma` = the row's `lemma_key`), `undoForm(api, id)` (`DELETE /v1/admin/content/word-forms/{id}`), `ignoreForm(api, id)` (`DELETE
/v1/admin/practice/unknown-forms/{id}`).

- [ ] **Step 1: Failing tests** = design §6.9: an empty page with `next_page_token` → fetches on, at most 5 pages in a row, then A/77b; accept → toast
  "Đã thêm “went” vào dạng chia của “go”" with [Hoàn tác] that sends the DELETE and the row comes back; `word-form-exists` → "Dạng này đã có.";
  [Bỏ qua] removes the row; column Từ gốc shows `lemma_key`.
- [ ] **Step 2–4. Step 5: Commit** `feat(admin): add the unknown word forms page`.

### Task 30: M3 e2e, test flow and gate

- [ ] **Step 1:** a11y + overflow (300-character note) for the four pages.
- [ ] **Step 2:** `e2e-real/support/ai-report.ts` `seedAiReport(state): Promise<{ reportId: string; reason: string }>` following D§9 rows 1–10: fake
  model for `generate_cloze`, a source, a 3-word CSV upload published by job (own words, not flow 3's reverted batch), Pro for Lan, a group with
  those words, a `cloze` session, `next`, answer, report with a refundable reason. `e2e-real/m3.real.spec.ts`: Minh filters by that reason and
  confirms the error; Trả lượt shows the row with Lan's and Minh's emails; the admin adds a reason then turns it off; accept a word form then undo.
- [ ] **Step 3:** real run, screenshots A/73–A/77b, test-flow "M3"; commit, push, PR, CI green, merge.

---

## M4 — Người học (PR 6)

### Task 31: API — grants: people, status, last change, email filters

**Files:** Modify `apps/api/src/entitlements/grants/grants.service.ts` (+ spec; identity fake gets `emailsOf`, D§4), `grants.schemas.ts`,
`admin-grants.controller.ts` (+ spec).

**Interfaces:**
- `grantView(row, ctx: { now: Date; replaced: boolean; emails: ReadonlyMap<string, string>; lastChange: ChangeRow | null }, changes?)` adds `user:
  UserRef`, `granted_by_user: UserRef`, `revoked_by_user: UserRef | null`, `status: GrantStatus`, `last_change: (GrantChangeView & { changed_by_user:
  UserRef }) | null`; `changes[]` items add `changed_by_user`.
- `type GrantStatus = 'active' | 'scheduled' | 'revoked' | 'expired' | 'replaced'`; `grantStatus(row, now, replaced): GrantStatus` pure, in the order of
  design §5.4 10.4.
- `replacedIds(rows): Promise<Set<string>>`: one query for plan grants of the page's users created at one of the page rows' `revokedAt`; a row is
  replaced when such a sibling has `createdAt = row.revokedAt` and `grantedBy = row.revokedBy` (T7; the sibling may be off the page or filtered out, D§4).
- `lastChanges(grantIds): Promise<Map<string, ChangeRow>>`: newest change per grant in one query.
- `listGrantsQuery` adds `user_email`, `granted_by_email` (`z.string().max(320).optional()`), resolved by `findUserIdByEmail` (unknown → empty), both in
  the binding. `create`, `revoke`, `update`, `forUser` return the same fields; email lookups run after the transaction (the spec's `guard`, D§4).

- [ ] **Step 1: Failing tests:** five statuses (the B5E78 replaced case gives `replaced` for the old row and `active` for the new one; a manual revoke
  with reason "replaced" gives `revoked`; `starts_at > now` → `scheduled`; `ends_at ≤ now` → `expired`); `last_change` is the newest of two changes,
  `null` without; an unknown `user_email` → empty list, no grant `findMany`; `emailsOf` once per list page and never while `lockUser` is held.
- [ ] **Step 2–4. Step 5: Commit** `feat(api): add people, status and last change to grants`.

### Task 32: API — learner lookup for grants

**Files:** Modify `apps/api/src/entitlements/api/admin-entitlements.controller.ts` (+ spec), `grants/grants.service.ts` (+ spec),
`common/config/app-config.ts` (+ `app-config.spec.ts:173-190`).

**Interfaces:**
- `@Get('lookup') @RequirePermission('entitlements.grant') @RateLimit('entitlements.lookup')`, query `z.strictObject({ email: z.string().min(3).max(320) })`.
- `GrantsService.lookup(actorId, email): Promise<{ user: { id: string; email: string }; grantable: boolean; reason: 'self-grant' | 'target-is-admin' |
  'target-is-staff' | null }>` — `findUserIdByEmail` (null → 404 `not-found`), `getProfile`, `grantRefusal({ action: 'create', touchesAiLimits: false, … })`.
- Rule `'entitlements.lookup': { by: 'user', max: 60, windowSeconds: 3600 }` (design §5.2, R4).

- [ ] **Step 1: Failing tests:** editor + another editor's email → `grantable: false, reason: 'target-is-staff'`; editor + own email → `self-grant`;
  admin → `grantable: true, reason: null`; unknown → 404; the email matches case-insensitively; the route carries the permission and the rate rule;
  the limits map includes the new rule.
- [ ] **Step 2–4. Step 5: Commit** `feat(api): let staff look up a learner by email before a grant`.

### Task 33: Người dùng (A/71, A/71e, A/72, A/72b)

**Files:** Create `src/features/users/users-api.ts`, `UsersPage.tsx`, `UserDetail.tsx`, `LockDialog.tsx` (+ tests), `e2e/users.spec.ts`; modify
`routes.tsx` (`users`, `:id`), `nav.ts`, `messages/*`.

- [ ] **Step 1: Failing tests** = design §6.10: one character → no request, hint "Gõ từ 2 ký tự"; filters `q`, `status` in the URL, 20 per page,
  "Tải thêm"; the detail shows birth date, terms, the lock line "Đang khóa từ … · bởi <email>" + reason; [Khóa tài khoản] hidden for yourself and for
  `admin`, `lock-rule` copy if the API still refuses; the lock reason is a one-line `TextField` (1–500); unknown id → "Không tìm thấy người dùng
  này."; Minh at `/users` → NoAccess (A/71e).
- [ ] **Step 2–4. Step 5: Commit** `feat(admin): add the users page`.

### Task 34: Cấp gói và lượt — list, revoke, edit dates (A/78, A/78b, A/78c, A/78d)

**Files:** Create `src/features/entitlements/entitlements-api.ts`, `GrantsPage.tsx`, `RevokeDialog.tsx`, `EditDatesDialog.tsx` (+ tests),
`e2e/entitlements.spec.ts`; modify `routes.tsx` (`entitlements`, `new`), `nav.ts`, `messages/*`.

- [ ] **Step 1: Failing tests:** filters `user_email`, `granted_by_email`, `active`, `expiring_within_days` in the URL; the status badge from `status`
  (five labels incl. "Bị thay thế"); the "Lượt AI hôm nay" block only with `settings.manage` (no request for an editor); revoke of an expired grant →
  `grant-not-active` copy; edit dates: Từ ngày read-only once started, "Lần sửa trước" from `last_change` with its email; `grant-not-allowed` with each
  `reason` → its own sentence (design §4.5).
- [ ] **Step 2–4. Step 5: Commit** `feat(admin): add the grants list`.

### Task 35: Cấp mới (A/79, A/79b, A/79e)

**Files:** Create `src/features/entitlements/GrantDialog.tsx` (+ test); modify `entitlements-api.ts` (`lookupLearner(api, email)`, `createGrant(api,
body, key)`), `e2e/entitlements.spec.ts`, `messages/*`.

**Interfaces:** the email field calls `lookupLearner` on blur or [Kiểm]; the confirmed email is kept with its `user.id`, and any later edit of the
field clears it; [Cấp] sends only with a confirmed, grantable user. Kind `RadioGroup` (Gói Pro / Con số riêng); editors get no AI fields;
`useSubmitAction` with fingerprint = the body. 409 `target-has-paid-subscription` → `ConfirmDialog` A/79b → resend with
`confirm_turn_off_paid_renewal: true` (a new key, since the body changed).

- [ ] **Step 1: Failing tests** = design §6.11: an editor's email → "Editor không cấp được cho tài khoản staff."; 404 → "Không có tài khoản với email
  này."; an edit after [Kiểm] → [Cấp] disabled until checked again; lookup 429 → rate-limited copy under the field; Pro starting now while one is
  active → the copy note before sending; `paid_renewal_action: 'not_supported'` → warning text; an editor sees no AI fields.
- [ ] **Step 2–4. Step 5: Commit** `feat(admin): add the new grant dialog`.

### Task 36: M4 e2e, test flow and gate

- [ ] **Step 1:** a11y + overflow. **Step 2:** `e2e-real/m4.real.spec.ts`: lock and unlock Khoa; Minh looks up Lan, grants Pro, edits the end date,
  revokes; the admin grants Pro starting now to Lan twice → the first shows "Bị thay thế" (checks T7 on Postgres). **Step 3:** real run, screenshots
  A/71–A/79e, test-flow "M4"; commit, push, PR, CI green, merge.

---

## M5 — Nội dung (PR 7)

### Task 37: API — missing parts on every sense filter

**Files:** Modify `apps/api/src/content/catalog/admin-catalog.queries.ts` (+ spec, new `listSenses` tests, D§6).

**Interfaces:** `listSenses` returns `missing: PublishViolation[]` on every row: `publishViolations(latestRevision, hasLevel)` when the latest revision
is `draft` or `reviewed`, `[]` otherwise (published, rejected, no revision); `snapshotPublishable` and `exportSenses` unchanged.

- [ ] **Step 1: Failing tests:** filter `open_draft`, row without gloss → `missing: ['gloss-missing']`; no filter, published row → `missing: []`;
  `status=unpublishable` output unchanged. **Step 2–4. Step 5: Commit** `feat(api): list missing parts on every sense filter`.

### Task 38: Row selection in DataList

**Files:** Modify `apps/admin/src/ui/DataList.tsx`, `Checkbox.tsx` (+ tests).

**Interfaces:** optional `selection?: { selected: ReadonlySet<string>; onChange: (next: Set<string>) => void; label: (row: T) => string }` adds a checkbox
column to the table and a checkbox to each card (both layouts, C§5), plus a header checkbox "Chọn tất cả trên trang". `Checkbox` gains an
`aria-label` form without children.

- [ ] **Step 1: Failing tests:** toggling a row reports the new set; the header selects every row of the page; cards at 390 have the same checkboxes;
  without `selection` the markup is unchanged (existing tests pass). **Step 2–4. Step 5: Commit** `feat(admin): add row selection to data lists`.

### Task 39: Từ (A/87)

**Files:** Create `src/features/words/words-api.ts`, `WordsPage.tsx`, `PasteWordsDialog.tsx`, `WordRowActions.tsx` (+ tests), `e2e/words.spec.ts`;
modify `routes.tsx`, `nav.ts`, `messages/*`.

- [ ] **Step 1: Failing tests:** filters `q`, `level`, `has_sense`, `conflict`, `batch_id` in the URL (batch options from `listUploads`); hint under "Có
  nghĩa" that retired meanings count; row actions: editorial level (PUT), variants (PUT of the whole set), function word (`true | false | null`), add a
  sense; paste: > 500 lines → client error; per-line result created / exists / invalid with a "Soạn nghĩa" link to `/senses/<sense_id>`.
- [ ] **Step 2–4. Step 5: Commit** `feat(admin): add the words page`.

### Task 40: Nghĩa — list and bulk actions (A/88)

**Files:** Create `src/features/senses/senses-api.ts`, `SensesPage.tsx`, `BulkResultDialog.tsx` (+ tests), `e2e/senses.spec.ts`; modify `routes.tsx`
(`senses`, `:id`), `nav.ts`, `messages/*`.

- [ ] **Step 1: Failing tests:** filters `status`, `level`, `pos`, `topic`, `batch_id`, `q` in the URL; column Thiếu from `missing`; selection through
  `DataList`; five bulk actions (review, reject, publish, unpublish, retire) send ≤ 500 items with each row's `revision`; the result dialog shows the
  count of successes and each failure with its reason (`stale-revision` "Nghĩa đã đổi, tải lại", `publish-incomplete` + missing parts); publish,
  unpublish, retire hidden without `content.publish`.
- [ ] **Step 2–4. Step 5: Commit** `feat(admin): add the senses list with bulk actions`.

### Task 41: Chi tiết nghĩa (A/88b)

**Files:** Create `src/features/senses/SenseDetail.tsx` (+ test); modify `senses-api.ts` (`getSense`, `saveDraft`, `quickPublish`), `e2e/senses.spec.ts`.

- [ ] **Step 1: Failing tests** = design §6.12: people lines (review, publish, state change with the action read from `state`); a new draft after
  publish → "Bản nháp chưa review", no "Publish: —"; `stale-revision` → "Nghĩa này vừa được sửa. Tải lại để xem bản mới."; 422 `publish-incomplete`
  → errors on the missing fields, the first focused; an archived topic dropped → toast naming it; ≤ 3 examples; `useDirtyForm` +
  `useKeptDraft('sense:' + id)`.
- [ ] **Step 2–4. Step 5: Commit** `feat(admin): add the sense detail editor`.

### Task 42: Chủ đề (A/89)

**Files:** Create `src/features/topics/TopicsPage.tsx`, `TopicDialog.tsx` (+ tests), `e2e/topics.spec.ts`; modify `features/content/content-api.ts`
(`createTopic`, `updateTopic`), `routes.tsx`, `nav.ts`, `messages/*`.

- [ ] **Step 1: Failing tests:** the whole list, no paging; add with code `[a-z0-9-]+` and names; `topic-exists` on the code field; rename; archive /
  use again (`PATCH { archived }`); no delete. **Step 2–4. Step 5: Commit** `feat(admin): add the topics page`.

### Task 43: M5 e2e, close-out

- [ ] **Step 1:** a11y + overflow for the four pages. **Step 2:** `e2e-real/m5.real.spec.ts`: edit a word's level; save a sense draft, publish it from
  the list; add a topic and archive it. **Step 3:** real run, screenshots A/87–A/89, test-flow "M5".
- [ ] **Step 4: Docs (design §9):** `CLAUDE.md` (remove the "provisional admin UI" note and the B25E30 line, update "admin screens other than Giao dịch
  show Sắp có", add the section "Đợt giao diện admin — plan & as-built" pointing to `docs/deliveries/giao-dien-admin.md`); memory
  `project_admin_ui_refactor.md`; `docs/deliveries/buoc-2-5.md` (B25E30 fixed in UI refresh B, `ui-refresh-b.md:123`); copy doc §8 (drop the A/74
  consent label, fix the A/75b code rule, add the new error texts); Figma page 04 sidebar gets "Giao dịch" (not blocking); as-built of the round in
  `giao-dien-admin.md`.
- [ ] **Step 5:** commit `docs: close the admin ui round`; push, PR, CI green, merge.
