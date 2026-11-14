# Giao diện người học trên web (Bước 3–7) — Implementation Plan

> **Status 22/10/2026:** written after the owner approved the design ("ok viết plan giúp mình đi", D1–D22). The owner read the plan and asked to merge it
> into `dev` and run it from a local session ("push và merge vào dev, xong cho mình prompt để mình kéo code từ dev về và chạy ở local"). The execution
> method (subagent-driven or native) is chosen with the owner at the start of the local session.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement
> this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Learners use Wordmet in the browser under `/vi/app/...` and `/en/app/...` — sign up, groups, review, lookup, add words, practice (with AI
questions on the fake provider), plans, settings and transaction history — matching the approved Figma frames, in Vietnamese and English, light and
dark, from 390px to 1920px; plus the nine small API changes the screens need and one admin page.

**Architecture:** The app lives in `apps/web` next to the landing, every `/app` page is a static shell rendered in the browser (data via the API with a
bearer token, session layer copied from `apps/admin`). App route files carry the `.app.tsx` page extension so they only exist in builds with
`NEXT_PUBLIC_LEARNER_APP=on`; with the flag off, `proxy.ts` redirects `/…/app/*` to the landing. Screens are grouped by feature under
`src/features/learner/<area>/` on top of a small app shell (`src/app-shell`) and UI kit (`src/app-ui`, react-aria-components).

**Tech Stack:** Next 16.3.8 (App Router, pinned with `eslint-config-next` 16.3.8), next-intl 4.14.9, OpenNext Cloudflare 1.20.7, Tailwind 4.3.3,
React 19.3, TanStack Query 5.104.2, react-aria-components 1.22.1, lucide-react 1.55.0, Vitest 4.1.11, Playwright 1.63.0 + axe; API: NestJS, Prisma,
Vitest (as Bước 7).

**Spec:** [`docs/superpowers/specs/2026-10-22-giao-dien-nguoi-hoc-design.md`](../specs/2026-10-22-giao-dien-nguoi-hoc-design.md) ("design §N", decisions
D1–D22, edge cases E1–E42, API cases GA1–GI10). Decisions: [`../decisions/2026-10-22-giao-dien-nguoi-hoc-decisions.md`](../decisions/2026-10-22-giao-dien-nguoi-hoc-decisions.md).
Code facts: [`../../preparation/GIAO_DIEN_NGUOI_HOC_PLAN_CODE_FACTS_2026-10-22.md`](../../preparation/GIAO_DIEN_NGUOI_HOC_PLAN_CODE_FACTS_2026-10-22.md) ("facts §N").
Frames: Figma `7HcPAKLrWu32C27qYMJUOA`, node ids in [`../../mockups/2026-10-22/figma-node-ids.md`](../../mockups/2026-10-22/figma-node-ids.md); copy
(vi): [`../../mockups/2026-10-21/ban-chu-giao-dien.md`](../../mockups/2026-10-21/ban-chu-giao-dien.md) (§12–§16 override earlier sections; §17 added by Task 5).

## Global Constraints

- Keep `next` and `eslint-config-next` at **16.3.8**. New dependencies only at the versions `apps/admin` locks (facts §2); no other new package.
- Colours only in `packages/design-tokens/theme.css` (UBC1); no Tailwind arbitrary values, no inline `style` without `// raw-ok:` (facts §1).
- No third-party script except the Cloudflare Web Analytics beacon Cloudflare injects (D22).
- Every `/app` page is prerendered (static shell); dynamic values in the query string, never a dynamic route segment (design §4.1).
- App route files are named `page.app.tsx` / `layout.app.tsx`; `next.config.ts` adds `app.tsx` to `pageExtensions` only when
  `NEXT_PUBLIC_LEARNER_APP === 'on'` (D21).
- Locale prefix of `/app` follows the profile's `native_language` (design §4.1, E10).
- Copy: Vietnamese from the copy doc + design §6–§7; English per design §7.1–§7.2 (deck, review, practice, session, question, AI credits, Free / Trial /
  Pro, My words, saved sentences, forms, Report, return, stage, Still learning / Know; sentence case; "we" only for app errors; "Cancel"; no
  please/sorry). Formats: `vi-VN` and `en-US` with the **learner's** time zone ("Chủ Nhật, 18/10", "20:00"; "Sunday, Oct 18", "8:00 PM").
- One yellow (accent) button per screen; text contrast ≥ 4.5:1, icons and input borders ≥ 3:1 in both themes.
- Every write that the API marks `[I]` sends an `Idempotency-Key`: one key per user press, the same key on a retry of that press (E12–E14).
- TDD: every task writes its failing test first. Test names carry the design case id (`E17:`, `GA2:` …) when they prove one.
- Code names follow the API (`group`, `groups-api`, `useGroups`); only English copy says "deck".
- Commits: Conventional Commits, one per task step "Commit"; push only the branch `claude/gallant-keller-bwo9dk`; scan for secrets before each push.

## Review Focus

1. **Double press / slow network on a write** (create deck, quick add, answer, report) → exactly one write, the button is busy until the answer.
   Pinned by `useSubmitOnce` tests (Task 4) and one test per form task ("second click while pending sends nothing").
2. **Long content at 390px** (300-character sentence, long Vietnamese meaning, 60-character deck name, long English word) → no horizontal page
   scroll. Pinned by `e2e/app/overflow.spec.ts` (Task 11, extended in every milestone e2e task) asserting `scrollWidth <= innerWidth`.
3. **Learner time zone ≠ device or server time zone, near midnight** (UTC+14, UTC−12) → dates and "0:00" reset times shown in the learner's zone.
   Pinned by `format.test.ts` cases in Task 5.
4. **Reload or browser Back inside a full-screen session** → review restarts from the queue without double-counting (new `review_id` per card press,
   same id on retry); practice resumes through `GET /practice/sessions/current`. Pinned in Task 20 and Task 31.
5. **Stale or hostile URL state** (deleted deck id, unknown lemma, `next=https://evil.example`) → not-found state or safe redirect, no crash. Pinned
   in Task 4 (`safeNext`), Task 17 (E17) and Task 24.

---

## Execution model

- **One session, one branch** (`claude/gallant-keller-bwo9dk`), milestones in order; each milestone is one PR into `dev` (M5 two PRs). After a PR
  merges, `git fetch origin dev && git merge origin/dev` before the next milestone.
- **Milestone gate (D1, D4):** all tasks done and green locally → push → open PR → CI green → run the real stack (Task 11 runbook) and capture the
  screenshots set → send the owner screenshots (next to the Figma frame) + the milestone's section of the test-flow doc → owner "ok" → merge. While
  waiting, work continues locally on the next milestone, not pushed.
- **Step shorthand:** "Step 2–4" = run the new tests (expect FAIL for the stated reason), implement the Interfaces/Produces items, run the tests
  (expect PASS) plus `pnpm --filter <app> lint` and `typecheck`.
- **Setup once per session (Task 1 does it the first time):** `pnpm install --frozen-lockfile` at the repo root after the dependency step of Task 6;
  Docker per facts §5 when a task needs the real stack.

## File map (apps/web, new unless marked)

```
src/app/[locale]/layout.tsx                    modified: html/body/font/intl only
src/app/[locale]/(site)/…                      moved: landing page, privacy, terms, [...rest], not-found + layout.tsx with SiteHeader/SiteFooter
src/app/[locale]/app/layout.app.tsx            app root: AppProviders, App messages, theme script, AppShell
src/app/[locale]/app/(auth)/…/page.app.tsx     login, register, forgot-password, reset-password
src/app/[locale]/app/(member)/layout.app.tsx   RequireSession
src/app/[locale]/app/(member)/…/page.app.tsx   every other screen (table in design §4.1)
src/lib/csp.ts, src/lib/learner-app-flag.ts    CSP builder, flag + redirect rule
src/app-shell/session/*                        copied from apps/admin/src/auth (session-store, session-context, test-support)
src/app-shell/api/*                            copied from apps/admin/src/api (+ patch/delete/put key)
src/app-shell/{AppProviders,RequireSession,locale-prefix,timezone-sync,use-submit-once,format}.ts(x)
src/app-shell/theme/*                          theme choice, inline script + hash
src/app-ui/*                                   Dialog/Sheet, Menu, Select, TextField, DateOfBirthField, Checkbox, Switch, Tabs, Toast, States, Icon
src/app-chrome/*                               TopBar, SearchStrip, PlanChip, AvatarMenu, AppFooter, MobileTabBar, Fab, SubpageHeader
src/features/learner/<area>/*                  auth, settings, today, groups, review, lookup, word, add-word, practice, plans, transactions
e2e/app/*, e2e/support/mock-api.ts             mocked-API e2e for the app
e2e-shots/*, playwright.shots.config.ts        screenshot run against the real stack (not in CI)
```

---

## M1 — App frame, account, Settings (PR 1)

### Task 1: Split the root layout, gate the app behind the flag

**Files:**
- Modify: `apps/web/src/app/[locale]/layout.tsx`, `apps/web/src/proxy.ts`, `apps/web/next.config.ts`, `apps/web/src/app/sitemap.ts`,
  `apps/web/src/app/robots.ts`, `apps/web/scripts/assert-static.mjs`, `apps/web/playwright.config.ts`, `apps/web/README.md`
- Create: `apps/web/src/app/[locale]/(site)/layout.tsx` (move `page.tsx`, `privacy/`, `terms/`, `[...rest]/`, `not-found.tsx` under `(site)`),
  `apps/web/src/lib/learner-app-flag.ts`, `apps/web/src/lib/learner-app-flag.test.ts`, `apps/web/src/app/[locale]/app/layout.app.tsx` and
  `apps/web/src/app/[locale]/app/page.app.tsx` (placeholder "Wordmet app" text, replaced in Task 15)

**Interfaces:**
- Produces: `LEARNER_APP_ENABLED: boolean` (`process.env.NEXT_PUBLIC_LEARNER_APP === 'on'`), `learnerAppRedirect(pathname: string, enabled:
  boolean): string | null` (returns `/{locale}` for `/{locale}/app` and any sub-path when disabled, else `null`), `appPageExtensions(enabled:
  boolean): string[]` (`['app.tsx', 'tsx', 'ts', 'jsx', 'js']` when enabled, `['tsx', 'ts', 'jsx', 'js']` otherwise).

- [ ] **Step 1: Install and read.** `pnpm install --frozen-lockfile` at the root; read `apps/web/node_modules/next/dist/docs` sections on route
  groups, `pageExtensions`, and Proxy (AGENTS.md).
- [ ] **Step 2: Failing tests** in `learner-app-flag.test.ts`: `learnerAppRedirect('/vi/app', false) === '/vi'`; `('/en/app/group', false) ===
  '/en'`; `('/vi/app', true) === null`; `('/vi/apple', false) === null`; `('/vi', false) === null`; `appPageExtensions(true)[0] === 'app.tsx'`;
  `appPageExtensions(false)` does not contain `'app.tsx'`.
- [ ] **Step 3: Run** `pnpm --filter web test learner-app-flag` → FAIL (module missing).
- [ ] **Step 4: Implement** the module; wire `proxy.ts` (redirect 307 with `Cache-Control: no-store` before next-intl when `learnerAppRedirect`
  returns a path) and `next.config.ts` (`pageExtensions: appPageExtensions(LEARNER_APP_ENABLED)`). Split the layout as in the file map; the
  `(site)` layout keeps SkipLink, SiteHeader, `<main id="main">`, SiteFooter. `sitemap.ts` unchanged (no `/app`); `robots.ts` adds
  `disallow: '/*/app'` in both modes. Playwright `webServer.env` adds `NEXT_PUBLIC_LEARNER_APP: 'on'` and `NEXT_PUBLIC_API_BASE_URL:
  'http://localhost:3000'`. `assert-static.mjs` also asserts `/vi/app` and `/en/app`. README env table: the two new variables.
- [ ] **Step 5: Verify the gate both ways.** `pnpm --filter web test` PASS. Build with the flag on (`NEXT_PUBLIC_LEARNER_APP=on pnpm --filter web
  cf:build`) → `.next/prerender-manifest.json` has `/vi/app`; build with it off → no `/vi/app` route, and the Worker bundle size is reported by
  wrangler (`pnpm exec wrangler deploy --dry-run --outdir /tmp/w`); note both sizes for the as-built. **If `page.app.tsx` is not picked up or
  is not excluded, stop and report to the owner** (design §4.5).
- [ ] **Step 6: Run** `pnpm --filter web lint && pnpm --filter web typecheck && pnpm --filter web test:e2e` → landing e2e PASS unchanged.
- [ ] **Step 7: Commit** `feat(web): split the site layout and gate the learner app behind a build flag`.

### Task 2: Content-Security-Policy with SRI (D9, D20, D22)

**Files:**
- Create: `apps/web/src/lib/csp.ts`, `apps/web/src/lib/csp.test.ts`, `apps/web/e2e/csp.spec.ts`
- Modify: `apps/web/next.config.ts`

**Interfaces:**
- Produces: `buildCsp(opts: { apiOrigin: string | null; dev: boolean; inline: boolean; scriptHashes: string[] }): string`; `CSP_INLINE_FALLBACK:
  boolean` (constant, set by Step 5).

- [ ] **Step 1: Failing tests** in `csp.test.ts`: default-src 'self'; `script-src` has `'self'`, `https://static.cloudflareinsights.com`, each
  `'sha256-…'` passed, and `'unsafe-inline'` only when `inline: true`; `connect-src` has `'self'`, the API origin when given and
  `https://cloudflareinsights.com`; `img-src 'self' data: blob:`; `font-src 'self'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`;
  `frame-ancestors 'none'`; `upgrade-insecure-requests` absent when `dev: true`; `'unsafe-eval'` present only when `dev: true`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `buildCsp`; `next.config.ts` adds `headers()` (`source: '/:path*'`, header `Content-Security-Policy`) only when
  `NODE_ENV === 'production'`, and `experimental: { sri: { algorithm: 'sha256' } }`. `apiOrigin` = origin of `NEXT_PUBLIC_API_BASE_URL` when the app
  flag is on.
- [ ] **Step 4: e2e** `csp.spec.ts`: response of `/vi` and `/vi/app` carries the header; listen to `securitypolicyviolation` (via
  `page.addInitScript`) and assert none fired after load and one interaction (E23).
- [ ] **Step 5: Run the e2e on the real Worker build.** If it passes with `inline: false`, keep it. If inline scripts or styles are blocked, set
  `CSP_INLINE_FALLBACK = true` (D20: `'unsafe-inline'` for `script-src` and `style-src`, everything else unchanged) and re-run; record which
  directive failed in the PR description and the as-built.
- [ ] **Step 6: Commit** `feat(web): add a content security policy with subresource integrity`.

### Task 3: Design tokens from Figma, dark theme, theme switch

**Files:**
- Modify: `packages/design-tokens/theme.css`, `packages/design-tokens/README.md`, `apps/web/src/styles/tokens.test.ts`, `apps/web/src/app/globals.css`,
  `apps/web/src/lib/cn.ts`
- Create: `apps/web/src/app-shell/theme/theme.ts`, `theme.test.ts`, `theme-script.ts`, `theme-script.test.ts`, `ThemeProvider.tsx`

**Interfaces:**
- Produces: `type ThemeChoice = 'light' | 'dark' | 'system'`; `THEME_STORAGE_KEY = 'wordmet-web.theme'`; `readThemeChoice(): ThemeChoice` (default
  `'system'`, never throws, E21); `writeThemeChoice(c: ThemeChoice): void`; `resolveTheme(c: ThemeChoice, prefersDark: boolean): 'light' | 'dark'`;
  `THEME_SCRIPT: string` (sets `data-theme` on `<html>` before paint); `THEME_SCRIPT_HASH: string` (`'sha256-…'`, fed to `buildCsp`);
  `useTheme(): { choice, resolved, setChoice }` (syncs across tabs via `storage`, E22).

- [ ] **Step 1: Read the variables.** Light values with `get_variable_defs` on a frame of page 08 (e.g. K/10 `256:189`); Dark values with the Plugin
  API (`getLocalVariablesAsync('COLOR')`, both modes; load the figma-use skill first). List every variable page 08 uses (including `navy`,
  `navy-raised`, `on-navy`, `on-navy-muted`, `session-card`, `highlight`, `shadow-ink`, `on-accent`).
- [ ] **Step 2: Failing tests** in `tokens.test.ts`: every light token has a dark counterpart in the `[data-theme='dark']` block; the LP12 pairs plus
  the new pairs (`ink`/`surface`, `on-navy`/`navy`, `muted`/`canvas`, `ink`/`highlight`) reach ≥ 4.5 (controls ≥ 3) in **both** blocks; UBC1 still
  holds. `theme.test.ts`: `resolveTheme('system', true) === 'dark'`; a throwing `localStorage` makes `readThemeChoice()` return `'system'`.
  `theme-script.test.ts`: `THEME_SCRIPT_HASH` equals sha256-base64 of `THEME_SCRIPT`.
- [ ] **Step 3: Run** → FAIL.
- [ ] **Step 4: Implement** the tokens (new colours named as in Figma: `--color-navy`, …; shadow colour as a token used by `--shadow-ledge`), the
  dark block, web-only tokens the app needs (menu/dialog/sheet shadows and animations, `text-ui`), `cn.ts` text sizes, theme module and
  provider. The script goes in `app/[locale]/app/layout.app.tsx` `<head>` via `<script dangerouslySetInnerHTML>` with `// raw-ok:` not needed
  (no `style`). Landing and admin never get `data-theme`.
- [ ] **Step 5: Run** `pnpm --filter web test && pnpm --filter admin test` → PASS (admin unaffected).
- [ ] **Step 6: Commit** `feat(tokens): add the learner app colours and the dark theme`.

### Task 4: Session and API layer (copied from admin)

**Files:**
- Create (copy from `apps/admin/src/auth/*`, `apps/admin/src/api/*` with their specs, imports switched to `@/`, first line
  `// @vitest-environment jsdom`, `afterEach(() => sessionStorage.clear())`): `apps/web/src/app-shell/session/{session-store,session-context,test-support}.ts(x)`,
  `apps/web/src/app-shell/api/{client,problem,idempotency,use-error-message}.ts`; new `apps/web/src/app-shell/config.ts`,
  `use-submit-once.ts`, `RequireSession.tsx`, `locale-prefix.ts`, `timezone-sync.ts`, `AppProviders.tsx` and their tests.

**Interfaces:**
- Consumes: facts §2.
- Produces:
  - `SessionStore` as admin minus the staff gate: `recheck()` → `signed-in` for any user; `Me` adds `given_name`, `family_name`, `birth_date`;
    `CHANNEL_NAME = 'wordmet-web-auth'`; logout flag key `wordmet-web-logout-pending`; `DEVICE = { client: 'web', device_label: 'Wordmet Web' }`;
    `register(body: RegisterBody): Promise<void>` (POST `/v1/auth/register`, keeps the token like `login`).
  - `ApiClient` adds `patch<T>(path, body, opts?: { idempotencyKey?: string })`, `delete<T>(path, opts?: { idempotencyKey?: string })`, and `put`
    gains the same `opts`.
  - `apiBaseUrl(): string` from `NEXT_PUBLIC_API_BASE_URL`; `assertApiBaseUrl(siteUrl: string, raw: string | undefined): string` called by
    `next.config.ts` when the flag is on: an absolute http(s) URL is required, and when `NEXT_PUBLIC_SITE_URL` starts with `https://wordmet.com` the host
    must start with `api.` (local and e2e builds keep `http://localhost:3000`).
  - `useEntitlements()` (key `['me','entitlements']`, `GET /v1/me/entitlements`) and `useAppConfig()` (key `['me','app-config']`, `GET
    /v1/me/app-config`) in `src/app-shell/queries.ts`, used from Task 6 on.
  - `useSubmitOnce<T>(fn: (key: string) => Promise<T>): { submit(): Promise<T | undefined>; busy: boolean }` (one Idempotency-Key per press, reused on
    retry after a `NetworkError`, ignores presses while busy).
  - `safeNext(raw: string | null, locale: AppLocale): string` (only `/{locale}/app…` paths; else `/{locale}/app`).
  - `prefixFix(pathname: string, profileLanguage: 'vi' | 'en' | null): string | null` (E10).
  - `timezoneToSync(deviceTz: string, profileTz: string): string | null` (E11).
  - `<AppProviders>` (client): QueryClient (retry off, `NetworkError` → offline banner), `SessionStore` created in an effect (not during prerender),
    `SessionProvider` with server snapshot `{ status: 'loading' }`, ThemeProvider, ToastRegion.
  - `<RequireSession>`: loading → full-screen spinner; `unavailable` → offline screen with [Thử lại] (E5); signed-out → `router.replace(login?next=…)`
    (E1, E2); signed-in → runs `prefixFix` (E10) and timezone sync (E11) once, then renders children; 403 `profile-incomplete` from any query →
    `/app/welcome?next=…` (E9); `change-password` state (`must_change_password`) → `/app/forgot-password` with a one-line explanation.

- [ ] **Step 1: Copy** the admin files and specs, apply the changes above; run the copied specs → they must pass unchanged except the gate cases
  (replace "non-staff → no-access" with "learner → signed-in").
- [ ] **Step 2: Failing tests** for the new parts: `safeNext('https://evil.example', 'vi') === '/vi/app'`, `safeNext('/vi/app/group?id=x', 'vi')`
  kept, `safeNext('/en/app', 'vi') === '/vi/app'`; `prefixFix('/en/app/word?w=go', 'vi') === '/vi/app/word?w=go'`, `prefixFix('/vi/app', null) ===
  null`; `timezoneToSync('Asia/Ho_Chi_Minh','Asia/Ho_Chi_Minh') === null`; `useSubmitOnce`: two clicks while pending → one call; a `NetworkError`
  retry reuses the key; E13: a 409 `about:blank` with `Retry-After: 2` is retried once with the same key after 2 s; E14: 409
  `idempotency-key-abandoned` → one retry with a new key; E15: a 429 gives `retryAfterSeconds` and the error text "Bạn thao tác hơi nhanh. Thử lại
  sau N giây."; `client.patch` sends `Idempotency-Key` when given; E4: three 429 refreshes end at `signed-out` with notice `rate-limited` (shown on
  the login screen in Task 9); `assertApiBaseUrl('https://wordmet.com','http://localhost:3000')` throws, with `'http://localhost:3100'` it returns.
- [ ] **Step 3: Run** → FAIL. **Step 4: Implement.** **Step 5: Run** `pnpm --filter web test` → PASS.
- [ ] **Step 6: Commit** `feat(web): add the learner session and api layer`.

### Task 5: App copy, formats and the copy doc §17

**Files:**
- Modify: `apps/web/messages/vi.json`, `apps/web/messages/en.json` (new namespace `App`), `apps/web/src/i18n/messages.test.ts` (allowed rich tags
  `b`, `hl` added), `docs/mockups/2026-10-21/ban-chu-giao-dien.md` (§17)
- Create: `apps/web/src/app-shell/format.ts`, `format.test.ts`, `apps/web/src/app-shell/AppIntl.tsx`

**Interfaces:**
- Produces: `App.*` keys per feature (`App.common`, `App.errors.<slug>`, `App.chrome`, `App.auth`, `App.settings`, … added by each task);
  `<AppIntl>` server component that passes only `App` messages to a nested `NextIntlClientProvider` inside the app layout;
  `useFormat(): { date(d, style: 'weekdayDayMonth' | 'dayMonth' | 'full' | 'monthDay'), time(d), resetAt(iso), number(n), money(amountMinor: number,
  currency: string), relativeDays(n) }` using `vi-VN` / `en-US` and the learner's `Me.timezone` (`'UTC'` before sign-in).

- [ ] **Step 1: Failing tests** `format.test.ts` (Review Focus 3): `2026-10-18T13:00:00Z` in `Asia/Ho_Chi_Minh` → vi `"Chủ Nhật, 18/10"`, time
  `"20:00"`, en `"Sunday, Oct 18"`, `"8:00 PM"`; `2026-10-18T10:30:00Z` in `Pacific/Kiritimati` (UTC+14) → `"Thứ Hai, 19/10"` / `"0:30"`;
  `resetAt` of the next local midnight → vi `"0:00"`, en `"12:00 AM"`; `money(99000,'VND')` → vi `"99.000 ₫"`; `money(499,'USD')` → en `"$4.99"`;
  `date(...,'full')` en `"Dec 31, 2026"`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `format.ts` and `AppIntl`.
- [ ] **Step 4: Write copy doc §17**: the Vietnamese changes of design §6, §7.3 (final text) and the English glossary table of design §7.2. Every later
  task takes its Vietnamese strings from the copy doc and writes the English per design §7.1.
- [ ] **Step 5: Run** `pnpm --filter web test` → PASS (parity test included). **Step 6: Commit** `feat(web): add learner app copy namespace and formats`.

### Task 6: UI kit and app chrome

**Files:**
- Modify: `apps/web/package.json` (add `@tanstack/react-query` 5.104.2, `react-aria-components` 1.22.1, `lucide-react` 1.55.0; dev `msw` 3.0.3 —
  versions exactly as `apps/admin`), `pnpm-lock.yaml`
- Create: `apps/web/src/app-ui/{Dialog,Menu,Select,TextField,DateOfBirthField,Checkbox,Switch,Tabs,Toast,States,Icon,ProBadge,LockedFeature}.tsx` with
  tests; `apps/web/src/app-chrome/{AppShell,TopBar,SearchStrip,PlanChip,AvatarMenu,AppFooter,MobileTabBar,Fab,SubpageHeader}.tsx` with tests

**Interfaces:**
- Consumes: Task 3 tokens, Task 4 `useSession`, Task 5 `useFormat`.
- Produces:
  - `Dialog` (`isOpen`, `onOpenChange`, `title`, `children`, `footer`): centred modal ≥ 768px, bottom sheet < 768px (design §4.7, E42).
  - `Select<T>` (dropdown, items with count suffix), `TextField` (label, error under field, `maxLength` counter), `DateOfBirthField` (one text field
    `dd/mm/yyyy`, returns ISO `YYYY-MM-DD` or `null`, error "Bạn cần đủ 13 tuổi để dùng Wordmet." when under 13 by the same rule as the API:
    birthday + 13 years ≤ today in the device zone), `Checkbox`, `Switch` (`isDisabled` with Pro badge), `Tabs`, `showToast(message, tone)`,
    `EmptyState`, `ErrorState` (`onRetry`), `NotFoundState`, `FullScreenSpinner`.
  - `LockedFeature` (D6 line "Dành cho gói Pro. Gói Pro chưa mở bán." + [Xem Gói học]) shown when a locked control is pressed.
  - `AppShell` (`variant: 'main' | 'sub' | 'full' | 'bare'`): `main` = TopBar (tabs Hôm nay · Nhóm · Luyện tập · Tra từ, Thêm từ button, PlanChip,
    AvatarMenu) + SearchStrip + content (max 1440, aside 360 at ≥ 1280) + AppFooter; < 768px MobileTabBar + Fab (Hôm nay, Nhóm, Tra từ) and the
    phone top bar; `sub` adds SubpageHeader (back link); `full` = no chrome (sessions, plans); `bare` = auth pages with the 12% pattern background.
    Before M3 the Thêm từ button, Fab and SearchStrip are hidden (`features` prop).
  - `AvatarMenu` (K/90): Cài đặt, Gói học, Đăng xuất. `PlanChip`: "Miễn phí" / "Dùng thử" / "Pro" from `GET /v1/me/entitlements` `plan`.
  - `AppFooter` (D7): links Giới thiệu (`/{locale}`), Gói học, Liên hệ (`mailto:` `NEXT_PUBLIC_CONTACT_EMAIL`), Điều khoản sử dụng, Chính sách bảo mật;
    Trợ giúp, Câu hỏi thường gặp, Gửi góp ý rendered as muted text with `aria-disabled="true"`, not focusable; no language switch.

- [ ] **Step 1: Add dependencies** and run `pnpm install`; `pnpm --filter web cf:build` still builds; record Worker size.
- [ ] **Step 2: Failing tests** per component (jsdom): Dialog renders `role="dialog"` with the title and closes on Escape; `DateOfBirthField` with
  today 2026-10-18: `"18/10/2013"` valid, `"19/10/2013"` → error text, `"31/02/2010"` → invalid-date error; Switch disabled + press → `LockedFeature`
  line visible; AppFooter: three disabled items have no `href` and `aria-disabled="true"`, Liên hệ href is `mailto:`; AvatarMenu has the three items;
  MobileTabBar shown only below 768px (class check); TopBar marks the current tab with `aria-current="page"`.
- [ ] **Step 3: Run** → FAIL. **Step 4: Implement** from the frames: K/10 (`256:189`) for TopBar/SearchStrip/footer (`443:6928`), K/90 (`328:13087`),
  M/10 (`285:135`), tab bar `284:156`, phone headers `284:9`, `332:2670`, `332:2693` (figma-node-ids). **Step 5: Run** → PASS.
- [ ] **Step 6: Commit** `feat(web): add the learner app ui kit and chrome`.

### Task 7: API (g) — learner app config, weak-word meaning, plan start date

**Files:**
- Create: `apps/api/src/settings/me-app-config.controller.ts`, `me-app-config.controller.spec.ts`, `app-config.view.ts`, `app-config.view.spec.ts`
- Modify: `apps/api/src/settings/settings.module.ts`, `apps/api/src/practice/history/history.service.ts` (+ spec), `history.controller.ts`,
  `apps/api/src/entitlements/entitlements.service.ts` (+ spec)

**Interfaces:**
- Produces: `GET /v1/me/app-config` (signed-in, `@Req()`) → `AppConfigView = { practice: { max_questions_per_session, default_questions_per_session },
  reminders: { send_time }, learning: { backlog_after_days, groups_per_user }, plans: { free: { practice_sessions_per_day }, trial: { ai_practice_per_cycle,
  ai_lookup_per_cycle }, pro: { practice_sessions_per_day, ai_practice_per_cycle, ai_lookup_per_cycle } } }` built by `appConfigView(s: AppSettings)`;
  `WeakWord` gains `meaning: string | null`; `weakWords(userId, nativeLanguage, page)`; snapshot `sources[]` gains `starts_at: string | null`
  (grant → `startsAt`, subscription → `currentPeriodStart`).

- [ ] **Step 1: Failing tests:** `appConfigView(SETTINGS_DEFAULTS)` equals the defaults (max 20, default 10, `send_time '20:00'`, 60, 100, free 3, pro 30 /
  300 / 100, trial 300 / 100); GG1 (controller returns new value after `settings.get` changes); GG4 (no `native_language` → 200); GG2 (weak word whose
  sense lost its meaning → `meaning: null`); GG3 (grant source `starts_at` = grant start).
- [ ] **Step 2: Run** `pnpm --filter api test -- me-app-config history entitlements.service` → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS;
  `pnpm --filter api lint && pnpm --filter api exec tsc --noEmit -p tsconfig.json`.
- [ ] **Step 5: Commit** `feat(api): expose learner app config, weak-word meanings and plan start dates`.

### Task 8: API (a) — edit birth date

**Files:** Modify `apps/api/src/identity/profile/profile.schemas.ts`, `identity.service.ts` (+ `identity.service.spec.ts`),
`profile.controller.spec.ts` (replace the FE8 test)

**Interfaces:** `UpdateProfileBody` gains `birth_date?: string` (`birthDateSchema`); `IdentityService` injects `Clock`; errors per design §8.1.

- [ ] **Step 1: Failing tests** GA1–GA7 (design §8.1) in `identity.service.spec.ts` with `FakeClock` at `2026-10-18T05:00:00Z`, profile zone
  `Asia/Ho_Chi_Minh`; controller spec: body `{ birth_date: null }` → 400.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** (today from `body.timezone ?? profile.timezone`; one `user.update`; log event without the date).
  **Step 4: Run** → PASS. **Step 5: Commit** `feat(api): let learners correct their birth date (13+)`.

### Task 9: Sign-up, sign-in, verification, password reset, language

**Files:** Create `apps/web/src/features/learner/auth/{RegisterForm,LoginForm,VerifyEmailForm,ForgotPasswordForm,ResetPasswordForm,WelcomeLanguage}.tsx`
with tests, `auth-api.ts`; pages `app/(auth)/{login,register,forgot-password,reset-password}/page.app.tsx`, `app/(member)/{verify-email,welcome}/page.app.tsx`

**Interfaces:**
- Consumes: Task 4 `SessionStore.register/login/logout`, `safeNext`; Task 6 `DateOfBirthField`, `TextField`, `Checkbox`, `Select`.
- Produces: routes `/app/login?next=`, `/app/register`, `/app/verify-email`, `/app/forgot-password`, `/app/reset-password?email=`, `/app/welcome?next=`.

Frames: K/01 `273:1302`, K/01b `341:8507`, K/02 `273:1343`, K/93 `328:13037`, K/03 `273:1383`, K/04 `273:1422`, K/05 `273:1450`, K/06 `273:1483`,
K/06b `341:8909`; phone M/01–M/06, M/93. API: `POST /auth/register` (`client:'web'`, `timezone` from the browser, `accept_terms: true`), `POST
/auth/login`, `POST /auth/otp`, `POST /auth/verify-email`, `POST /auth/password/reset`, `PATCH /me {native_language}`.

- [ ] **Step 1: Failing tests:** register sends given_name, family_name (optional), birth_date ISO, email, password, timezone, `accept_terms:true`; the
  button stays disabled until the consent box is ticked and the birth date is valid (K/01b inline error, no request sent); 409 `email-taken` →
  error under email; 400 `age-below-minimum` → error under birth date; password `violations` → list under password; login 401 → "Email hoặc mật khẩu
  chưa đúng."-style copy from the copy doc; 403 `account-locked` → K/93 notice (E8); signed-out notice `rate-limited` → the E4 line; verify: 6-digit
  code, `invalid-otp` error, resend respects 60 s; welcome: `PATCH /me {native_language}` then `router.replace(safeNext(next, chosen))`;
  Review Focus 1: double submit sends one request.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit** `feat(web): add learner sign-up and sign-in`.

### Task 10: Settings and Account

**Files:** Create `apps/web/src/features/learner/settings/{SettingsPage,AccountPage,UsageSection,settings-api}.tsx/ts` with tests; pages
`app/(member)/settings/page.app.tsx`, `app/(member)/settings/account/page.app.tsx`

**Interfaces:** Consumes `GET /v1/me`, `useEntitlements()`, `useAppConfig()` (Task 4; endpoint from Task 7), `GET/PATCH /v1/me/reminders` (`[I]`),
`PATCH /v1/me` (name, birth date, language), `useTheme`, `useFormat.resetAt`.

Frames: K/50 `277:2441`, K/91 `328:11013`, K/92 `328:11159`; M/90, M/91, M/92, M/63. Sections and copy: copy doc §12 (row "3, 6").

- [ ] **Step 1: Failing tests:** usage rows show "đã dùng 1/3" and "Mở lại lúc 0:00" from `pools.practice_sessions.resets_at` (D15, TV10); Free shows
  "Cần gói Pro" for both AI rows; Trial/Pro shows "còn 287/300" + "Lượt câu AI mới có vào 15/11"; a pool without `resets_at` shows no reset line
  (E26); language change → `PATCH /me` then navigation to the other prefix; theme Select writes the choice; reminder Switch sends `PATCH
  /me/reminders` with an Idempotency-Key; "Chưa xác minh" + [Xác minh email] when `email_verified` is false; Account: birth date under 13 → inline
  error, no request (K/92); 400 `age-below-minimum` from the API also shows the inline error; Xóa tài khoản shows "Sắp có" and is disabled; the
  "Lịch sử giao dịch" row is hidden until M4b (flag constant `SHOW_TRANSACTIONS = false`).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit** `feat(web): add learner settings and account`.

### Task 11: Sample data, runbook, e2e and screenshots harness; M1 gate

**Files:**
- Create: `apps/api/scripts/learner-test-setup.mjs`, `apps/api/scripts/fixtures/learner-sample.csv`, `apps/web/e2e/support/mock-api.ts` (copy of
  admin's, CORS origin `http://localhost:3100`), `apps/web/e2e/support/axe.ts` (copy of admin's `seriousViolations`), `apps/web/e2e/app/m1.spec.ts`,
  `apps/web/e2e/app/overflow.spec.ts`, `apps/web/playwright.shots.config.ts`, `apps/web/e2e-shots/shots.spec.ts`,
  `docs/deliveries/giao-dien-nguoi-hoc-test-flow.md`
- Modify: `apps/api/.env.example` (`CORS_ORIGINS` adds `http://localhost:3001`), `apps/api/package.json` (script `learner:setup`),
  `apps/web/package.json` (scripts `dev:app` = `next dev --port 3001`, `shots`), `docs/deliveries/deploy-checklist.md`

**Interfaces:**
- `pnpm --filter api learner:setup -- --admin <email> --learner <email> [--plan pro|trial] [--transactions]`: refuses unless `AI_FAKE_ENABLED=true` and
  `BILLING_FAKE_ENABLED=true`; creates missing topics, imports and publishes the CSV (facts §5), adds `fake:ok` and chooses it for the six AI
  operations, grants Pro (`--plan pro`) or sends a fake trial `subscription_started` (`--plan trial`); `--transactions` (M4b) sends a purchase, a
  renewal and a refund with `--amount 99000 --currency VND`.
- `learner-sample.csv`: about 300 senses, columns per facts §5 (`headword,pos,CEFR,gloss_vi,definition_en,example_en_1,topics,inflections`), topics
  technology, business, food, daily-life, travel (created by the script), levels A1–B2; one pair (business · B1) with ≥ 110 senses; include `go`,
  `went`, `left`, `leave`, `deploy`, a 60+-character meaning, a 280-character example; content drafted by Claude for review (D19).
- `mock-api.ts` exports `mockApi`, `problem`, `signedInAs(page, plan?: 'free'|'trial'|'pro', me?)` (mocks refresh, `/v1/me`, `/v1/me/entitlements`,
  `/v1/me/app-config`), fixtures in `e2e/support/fixtures.ts`.

- [ ] **Step 1: e2e (mocked)** `m1.spec.ts`: register → verify → welcome → Today placeholder; login with `?next=/vi/app/settings` lands on Settings
  (E2); `/en/app/settings` for a `vi` profile lands on `/vi/app/settings` (E10); locked account notice; Settings usage rows; axe has no serious
  violation on every M1 page × vi/en × 1440/390 × light/dark; `overflow.spec.ts` (Review Focus 2) on M1 pages with long names.
- [ ] **Step 2: Run** `pnpm --filter web test:e2e` → PASS (fix until green).
- [ ] **Step 3: Write** the runbook and the M1 section of `giao-dien-nguoi-hoc-test-flow.md`: Windows PowerShell setup (docker compose, `.env`
  with `CORS_ORIGINS` incl. 3001, `pnpm db:setup`, `pnpm build`, `pnpm run:dev`, `pnpm --filter api learner:setup …`, web `pnpm --filter web
  dev:app` with `NEXT_PUBLIC_LEARNER_APP=on`, admin opened at `http://127.0.0.1:5173` so its refresh cookie does not replace the learner's), then per
  screen: steps → expected → frame id, in vi/en and light/dark. Deploy checklist: Worker size vs Free plan (D21), check CSP errors on production after
  the first CSP release (D22), privacy policy mentions Cloudflare Web Analytics (D22).
- [ ] **Step 4: Real-stack run in the cloud** (facts §5 Docker steps): run the script, walk the M1 test flow, run `pnpm --filter web shots` (routes ×
  vi/en × light/dark × 390/1024/1440 into `apps/web/test-results/shots/`), take the matching Figma screenshots.
- [ ] **Step 5: Commit** `test(web): add the learner app e2e, sample data and m1 test flow`; push; open the M1 PR into `dev`; CI green; send the owner
  screenshots + test flow; merge after "ok".

---

## M2 — Today, decks, review (PR 2)

### Task 12: API (c) — bulk add by `sense_ids`

**Files:** Modify `apps/api/src/learning/items/items.schemas.ts`, `items.service.ts` (+ `items.service.spec.ts`)

**Interfaces:** `bulkAddBody` adds `sense_ids?: string[]` (uuid, 1–100, unique; not with `level`/`topic`/`pos`); `BulkResult` adds
`skipped_not_found: number` (0 in filter mode).

- [ ] **Step 1: Failing tests** GC1–GC7 (design §8.3). **Step 2: Run** → FAIL. **Step 3: Implement** (`content.visibleSenseIds` before the
  transaction; keep the order sent; no function-word skip). **Step 4: Run** → PASS. **Step 5: Commit** `feat(api): bulk add hand-picked senses`.

### Task 13: API (h) — topic suggestions

**Files:** Create `apps/api/src/content/taxonomy/topic-suggestions.service.ts` (+ spec), `topic-suggestions.queries.ts`; modify
`taxonomy/topics.controller.ts`, `content.module.ts`

**Interfaces:** `GET /v1/topics/suggestions` (`@LearnerContent`) → `{ items: Array<{ topic: { code, name }, level, count, samples: Array<{ sense_id,
lemma, pos, meaning }> }> }`; `suggestionSeed(userId: string, localDate: string): number` (first 4 bytes of sha256(`${userId}|${localDate}`));
`pickSuggestions(pairs: Array<{topic, level, count}>, seed: number, max = 3): …` (seeded shuffle, distinct topics); threshold `SUGGESTION_MIN_SENSES = 10`.

- [ ] **Step 1: Failing tests** GH1–GH4 (design §8.8) on `pickSuggestions`/`suggestionSeed` (pure) and the service with mocked queries; the query uses
  the same published/catalog/level/topic/function-word filters as `learner-content.service.ts:104-134` and excludes archived topics.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit** `feat(api): suggest a few topics per learner per day`.

### Task 14: Deck data hooks

**Files:** Create `apps/web/src/features/learner/groups/groups-api.ts` (+ test)

**Interfaces:** query hooks `useGroups()` (`GET /groups`, key `['groups']`), `useGroup(id)` (`GET /groups/{id}`), `useGroupItems(id, cell)` (infinite,
`GET /groups/{id}/items?cell=`), `useTopicSuggestions()`; mutations `createGroup(name)` (`POST /groups` `[I]`), `renameGroup(id, name, version)` (`PATCH`
`[I]`, E18), `deleteGroup(id)` (`DELETE` `[I]`), `removeItem(groupId, itemId)`, `bulkAdd(groupId, body)` — each invalidates `['groups']` and the deck.

- [ ] **Step 1: Failing tests** with `makeFetch`: each hook calls the right path; 409 `version-conflict` on rename refetches the deck; 409
  `group-name-taken` returns a field error; 409 `group-limit-reached` maps to the limit message with `groups_per_user` from app config.
- [ ] **Step 2–4: Run → FAIL, implement, run → PASS. Step 5: Commit** `feat(web): add deck data hooks`.

### Task 15: Today

**Files:** Create `apps/web/src/features/learner/today/{TodayPage,GroupCard,GroupCardMenu,TopicSuggestionCard,QuickAddBox}.tsx` with tests; page
`app/(member)/page.app.tsx` (replaces the Task 1 placeholder)

Frames: K/10 `256:189`, K/10b `335:3288`, K/94 `328:12804`; M/10, M/11, M/94. Copy: copy doc §5.6, §12, §15 (footer).

- [ ] **Step 1: Failing tests:** deck cards sorted as K/10 with counts from `today{priority,due,new}`; card menu (K/10b) Đổi tên nhóm · Học tất cả N từ ·
  Xóa nhóm; no decks → K/94 empty state with [Tạo nhóm đầu tiên] and up to 3 suggestion cards (hidden when `items: []`, GH3); suggestion card shows
  "Kinh doanh · B1 · 52 từ", 4 samples and [Xem thêm và chọn từ] → `/app/topic?code=business&level=B1`; QuickAddBox hidden until M3.
- [ ] **Step 2–4. Step 5: Commit** `feat(web): add the today screen`.

### Task 16: Deck list, create, rename, delete

**Files:** Create `apps/web/src/features/learner/groups/{GroupListPage,CreateGroupDialog,RenameGroupDialog,DeleteGroupDialog}.tsx` with tests; page
`app/(member)/groups/page.app.tsx`

Frames: K/16 `268:905`, K/16b `335:3121`, K/17 `335:2879`, K/17b `335:3000`, K/14 `274:1513`; M/15, M/14, M/13, M/13b, M/22.

- [ ] **Step 1: Failing tests:** filter Select "Tất cả · 4 nhóm" / Còn thẻ chờ / Xong hôm nay; search box appears from 10 decks and filters by name;
  create dialog counts "12/60" and blocks 61 characters; delete dialog text uses `removable_items` from `GET /groups/{id}` ("Xóa nhóm “Công nghệ”? … [Xóa
  nhóm và 12 từ] [Giữ nhóm]"; en "Delete deck" / "Cancel"); topic suggestion block as Task 15; Review Focus 1 for create.
- [ ] **Step 2–4. Step 5: Commit** `feat(web): add the deck list and deck dialogs`.

### Task 17: Deck page

**Files:** Create `apps/web/src/features/learner/groups/{GroupPage,StageChart,GroupItemRow,GroupFilterSelect,CardPreview}.tsx` with tests; page
`app/(member)/group/page.app.tsx`

Frames: K/11 `257:317`, K/12 `274:950`, K/13 `274:1196`; M/20, M/21, M/21b `428:5177`, M/24. Copy: §14 row 3 (filter list), §15 row 7.

- [ ] **Step 1: Failing tests:** stage chart from `cells[{level,total,due}]` labelled "Mới · 1 · 3 · 7 · 14 · 30" (TV9 kept); filter Select lists Tất cả ·
  Ưu tiên · Đến hạn · Mới · Ngăn 1 ngày … Ngăn 30 ngày with counts and maps to `cell=priority|0..5`; rows show "Ngăn 1 ngày · ưu tiên" and "nghĩa đã đổi"
  when `sense_changed`; removing an item whose `group_count` is 1 warns first; [Ôn N thẻ] → `/app/review?group=`; "Lâu chưa ôn" link when `backlog > 0`;
  E17: unknown or deleted `id` → NotFoundState with a link to the deck list; Review Focus 5.
- [ ] **Step 2–4. Step 5: Commit** `feat(web): add the deck page`.

### Task 18: Backlog ("Từ lâu chưa ôn")

**Files:** Create `apps/web/src/features/learner/groups/BacklogPage.tsx` (+ test); page `app/(member)/group/backlog/page.app.tsx`

Frames: K/15 `445:7913`; M/23. API: `GET /groups/{id}/backlog` (infinite), `POST /items/relearn {item_ids}` `[I]`, `DELETE /items/{id}` `[I]`.
Copy: §15 row 2 (`backlog_after_days` from app config in "quá hạn hơn 60 ngày").

- [ ] **Step 1: Failing tests:** one yellow button "Học lại cả 40 từ" sends all ids (batches of 100); selecting rows turns "Học lại 2 từ" into a normal
  button; "Bỏ khỏi việc học" confirms first; the explainer card text uses the app-config number.
- [ ] **Step 2–4. Step 5: Commit** `feat(web): add the long-overdue list`.

### Task 19: Topic word picker

**Files:** Create `apps/web/src/features/learner/groups/TopicPickerPage.tsx` (+ test); page `app/(member)/topic/page.app.tsx`

Frames: K/18 `336:3463`; M/16. API: `GET /senses?topic&level&exclude_function_words=true` (all pages, `page_size=100`), `GET /items?sense_ids=` (100 per
call), `POST /groups` (new deck), `POST /groups/{id}/items/bulk` `[I]` (Task 12). Copy: §12 row 7.

- [ ] **Step 1: Failing tests:** counts "52 từ gợi ý", "Chọn tất cả (50 từ chưa học)", "Đã chọn 3 từ"; learning rows "Đang học · Công việc" are not
  selectable; [Thêm 3 từ đã chọn] sends `{sense_ids}` of the ticked rows; [Thêm cả 50 từ] sends the 50 unlearned ids when ≤ 100 and `{topic, level}`
  otherwise (design §8.3); target deck Select defaults to "Nhóm mới “Kinh doanh · B1”" and creates it first; result toast uses `added`,
  `already_in_group`, `skipped_group_full`, `skipped_not_found`.
- [ ] **Step 2–4. Step 5: Commit** `feat(web): add the topic word picker`.

### Task 20: Review session

**Files:** Create `apps/web/src/features/learner/review/{ReviewSession,Flashcard,ReviewSummary,use-review-queue}.tsx/ts` with tests; page
`app/(member)/review/page.app.tsx` (`AppShell variant="full"`)

Frames: K/20 `273:1505`, K/21 `273:1530`, K/22 `273:1574`; M/30, M/31, M/32. API: `GET /groups/{id}/queue?mode=due|all`, `POST /reviews {item_id,
group_id, answer: 'known'|'review', review_id}` (no Idempotency-Key; dedupe by `review_id`; rate 120/min).

- [ ] **Step 1: Failing tests:** front = word + part of speech + "Ưu tiên" label; back = forms, meaning, example, saved sentences with the word
  highlighted (D3); keys Space (flip), 1 (Cần ôn lại / Still learning), 2 (Đã biết / Know), Esc (summary); each press generates a new `review_id`, a
  retry after `NetworkError` reuses it (E19, Review Focus 4); `mode=all` shows `section:'backlog'` cards with their label; summary counts known /
  needs-review; reload restarts from the queue (no stored local progress).
- [ ] **Step 2–4. Step 5: Commit** `feat(web): add the review session`.

### Task 21: M2 e2e, test flow and gate

- [ ] **Step 1:** `e2e/app/m2.spec.ts` (mocked): today with and without decks, create → rename → delete deck, deck filters, backlog relearn, topic picker
  both buttons, review keyboard flow; axe and overflow (long deck names, 280-char sentence on the card back) on every M2 page.
- [ ] **Step 2:** M2 section of the test flow; real-stack run with the sample CSV; screenshots; commit `test(web): add m2 e2e and test flow`; PR;
  owner gate (D1).

---

## M3 — Lookup and add words (PR 3)

### Task 22: API (e) — saved sentences list and counts

**Files:** Modify `apps/api/src/content/sentences/sentences.controller.ts`, `sentences.service.ts` (+ spec), `apps/api/src/content/words/words.service.ts`
(+ new `words.service.spec.ts` case), `words.controller.ts`

**Interfaces:** `GET /v1/senses/{id}/sentences` (`@LearnerContent`) → `{ items: Array<{ id, text, created_at }> }`; `SentencesService.counts(userId,
senseIds): Map<string, number>`; word page senses typed `WordPageSense = WordSense & { sentence_count: number }` (only `GET /words/{lemma}`).

- [ ] **Step 1: Failing tests** GE1–GE5 (design §8.5). **Step 2: Run** → FAIL. **Step 3: Implement** (visibility as `addSentence`; never log text).
  **Step 4: Run** → PASS. **Step 5: Commit** `feat(api): list saved sentences and count them on the word page`.

### Task 23: Lookup page and search strip

**Files:** Create `apps/web/src/features/learner/lookup/{LookupPage,LookupFilters,lookup-api}.tsx/ts` with tests; page `app/(member)/lookup/page.app.tsx`;
modify `app-chrome/SearchStrip.tsx` (enable, submit → `/app/lookup?q=`)

Frames: K/30 `258:413`; M/40. API: `GET /words?q&level&pos&topic&mine=true` (infinite), `GET /topics`. Copy: §14 row 5, §15.

- [ ] **Step 1: Failing tests:** query and filters round-trip through the URL; "Chỉ từ của tôi" sends `mine=true`; "Xóa lọc" clears; `/` focuses the
  search strip; empty result → "Không tìm thấy từ này" state with [Thêm từ này] (opens the add-word sheet in Task 25).
- [ ] **Step 2–4. Step 5: Commit** `feat(web): add the lookup page`.

### Task 24: Word page and saved sentences

**Files:** Create `apps/web/src/features/learner/word/{WordPage,SenseBlock,FormsLine,LearningBlock,SavedSentencesDialog}.tsx` with tests; page
`app/(member)/word/page.app.tsx`

Frames: K/31 `259:508`, K/32 `275:1233`, K/33 `275:1420`; M/41, M/41b, M/42, M/43. API: `GET /words/{lemma}` (exact case, D42), `GET /items?sense_ids=`,
`GET /senses/{id}/sentences`, `DELETE /sentences/{id}` `[I]`, `POST /groups/{id}/items` `[I]`. Copy: §4.4, §15 rows 7 and 11.

- [ ] **Step 1: Failing tests:** sections by part of speech; forms line "going · went · gone" with links only where `has_page`; `form_of` sense links
  to the base word; definition line under each meaning (§15 row 11); "Bạn đang học" block (Loại từ · Nghĩa · Nhóm "IELTS · ngăn 3 ngày" · Câu đã gặp)
  when the sense is learned; "3 câu đã gặp" opens the list; deleting a sentence decrements the count (GE4); `sentence_count: 0` hides the line (GE2);
  unknown lemma → NotFoundState with [Thêm từ này] (Review Focus 5).
- [ ] **Step 2–4. Step 5: Commit** `feat(web): add the word page`.

### Task 25: Add-word sheet

**Files:** Create `apps/web/src/features/learner/add-word/{AddWordSheet,GroupPicker,ManualMeaningForm,add-word-api,last-group}.tsx/ts` with tests; modify
`app-chrome/TopBar.tsx`, `Fab.tsx`, `today/QuickAddBox.tsx` (enable; key N opens the sheet)

Frames: K/40 `275:7927`, K/40b `326:12207`, K/41 `275:8067`, K/42 `275:8211`, K/42b `333:12049`, K/42c `333:12695`; M/50, M/50b, M/51, M/52, M/52b,
M/52c. API: `GET /lookup?q=` (`via_inflection` with possibly empty `senses`), `POST /quick-add` `[I]`, `POST /groups` `[I]`. Copy: §4.3, §12 row 8.

- [ ] **Step 1: Failing tests:** "went" shows "dạng chia của go" and the base senses; a `via_inflection` with `senses: []` still offers the base word and
  pre-fills `form_of` for manual entry; deck picker defaults to the last used deck (`localStorage` key `wordmet-web.last-group`, E21), empty when that
  deck no longer exists, "Tạo nhóm đầu tiên" when there are none (K/40b); typing a new name offers [Tạo nhóm “du l”] (K/42b) and [Tạo nhóm và lưu] when
  nothing matches (K/42c); manual meaning requires only the meaning; quick-add with a sentence; 409 `private-word-exists` → link to the existing word;
  409 `group-full`; success toast "Đã lưu từ “rizz” vào nhóm “Du lịch”."; Review Focus 1.
- [ ] **Step 2–4. Step 5: Commit** `feat(web): add the add-word sheet`.

### Task 26: Add a saved sentence, bulk add by filter

**Files:** Create `apps/web/src/features/learner/add-word/{AddSentenceSheet,BulkAddSheet}.tsx` with tests

Frames: K/44 `275:8964`, K/44b `327:10733`, K/43 `275:8778`; M/53, M/53b, M/44. API: `POST /senses/{id}/sentences` `[I]` (≤ 300 chars), `POST
/groups/{id}/items/bulk {level?, topic?, pos?}` `[I]`. Copy: §4.4, §14 row 5.

- [ ] **Step 1: Failing tests:** counter to 300 and block above; 409 `sentence-limit-reached` → K/44b error with [Xem các câu đã gặp] (no number, D5);
  bulk add shows the result counts, function words skipped count included.
- [ ] **Step 2–4. Step 5: Commit** `feat(web): add saved sentences and bulk add`.

### Task 27: M3 e2e, test flow and gate

- [ ] **Step 1:** `e2e/app/m3.spec.ts`: lookup → word page → add to deck; add "went" via the sheet; manual meaning; add sentence until the limit; bulk add;
  axe and overflow (long meaning, 300-char sentence).
- [ ] **Step 2:** test flow M3; real-stack run; screenshots; commit `test(web): add m3 e2e and test flow`; PR; owner gate.

---

## M4 — Practice and plans (PR 4)

### Task 28: API (b) — weak words by deck

**Files:** Modify `apps/api/src/learning/learning.service.ts`, `practice/practice-reads.queries.ts` (+ spec), `apps/api/src/practice/history/*`,
`practice/sessions/sessions.controller.ts`, `sessions.service.ts` (+ specs)

**Interfaces:** `LearningService.groupsOfSenses(userId, senseIds, db?): Promise<Map<string, Array<{ id: string; name: string }>>>` (visible items only);
`GET /v1/practice/weak-words?group_id=` (binding `weak-words|<group_id or ''>`); `GET /v1/practice/weak-words/groups` → `{ total, items: Array<{ group_id,
name, count }> }` (count > 0, count desc then name); start body: `group_id` allowed with `source: 'weak'`.

- [ ] **Step 1: Failing tests** GB1–GB8 (design §8.2). **Step 2: Run** → FAIL. **Step 3: Implement** (group filter = weak senses ∩
  `learning.practiceItems(userId, {kind:'group', groupId, filter:'all'})`, which also gives the 404). **Step 4: Run** → PASS. **Step 5: Commit**
  `feat(api): filter weak words and weak-word sessions by deck`.

### Task 29: API (d) — report reasons order and short English labels

**Files:** Create `apps/api/prisma/migrations/20261023090000_report_reasons_order_labels/migration.sql` (rename to a timestamp later than the newest on
`dev` before the PR); modify `report-reasons.service.spec.ts`

- [ ] **Step 1: Failing test** GD1 in the spec: with the seeded rows as the migration leaves them, `learnerReasons('ai')` ends with `other`.
- [ ] **Step 2: Write the migration** (UPDATEs of design §8.4, each `WHERE code = … AND updated_by IS NULL AND <column> = <seeded value>`).
- [ ] **Step 3: Verify** on a fresh DB: `pnpm --filter api db:setup` then the drift check command of CI → empty; query the table → GD1, GD2 (run once with
  an admin edit on `other` before the migration). **Step 4: Commit** `feat(api): put "other" last and shorten english report reasons`.

### Task 30: Practice home, customise dialog (non-AI layout), out-of-sessions

**Files:** Create `apps/web/src/features/learner/practice/{PracticePage,SourceCard,CustomizeDialog,CurrentSessionCard,OutOfSessions,practice-api}.tsx/ts`
with tests; page `app/(member)/practice/page.app.tsx`

Frames: K/51 `276:2349`, K/54 `276:2708`, K/55 `276:3140`, K/77 `360:15650`; M/L51, M/L54, M/L55, M/77. API: `POST /practice/sessions` `[I]`, `GET
/practice/sessions/current`, `GET /me/entitlements`, `GET /me/app-config`. Copy: §4.8, §6, design §6 (D10).

- [ ] **Step 1: Failing tests:** big card "Bắt đầu N câu" with N = `default_questions_per_session`; source cards Theo nhóm / Từ hay sai / Đang ưu tiên / Luyện
  tất cả each with [Tùy chỉnh]; customise dialog (D10): three equal type boxes without descriptions, no notes under Kiểu đề and Số câu, stepper max =
  `max_questions_per_session` ("tối đa 20"), Kiểu đề only for Gõ từ; **no AI section yet** (Task 40 adds it); 403 `quota-exhausted` → K/55 with the reset
  time (E25, D7: no "Xem gói học"); 409 `practice-no-words` reasons mapped; a current session → aside card; pressing start while one exists → K/77
  dialog [Làm tiếp] [Mở phiên mới] (E35); Free sessions card "đã dùng 1/3" + reset.
- [ ] **Step 2–4. Step 5: Commit** `feat(web): add the practice home and session setup`.

### Task 31: Practice session player (non-AI)

**Files:** Create `apps/web/src/features/learner/practice/session/{PracticeSession,QuestionCard,McqQuestion,TrueFalseQuestion,TypeWordQuestion,HintPanel,
AnswerFeedback,RoundPrompt,SessionSummary,ReportDialog,use-practice-session}.tsx/ts` with tests; page `app/(member)/practice/session/page.app.tsx`
(`variant="full"`)

Frames: K/60 `273:1598`, K/61 `273:1657`, K/62 `273:1731`, K/63 `273:1800`, K/64 `273:1849`, K/65 `273:1911`, K/66 `273:1954`, K/67 `273:2069`; M/L60–M/L67,
M/L63b. API: `GET /practice/sessions/current`, `POST …/{id}/next`, `POST /practice/items/{id}/answer` `[I]`, `…/skip`, `…/hint {level}`, `…/review {action}`,
`POST …/{id}/continue`, `…/finish`, `GET …/{id}/summary`, `POST …/{id}/review-all` `[I]`, `GET /practice/report-reasons?kind=non_ai`, `POST
/practice/items/{id}/report`. Copy: §10 rows, §15 rows 10, 12.

- [ ] **Step 1: Failing tests:** progress bar of `target_count` segments; keys 1–4, Enter, H (next hint), Esc (stop → summary); [Kiểm tra] submits a typed
  answer (TV12); `try_again` keeps the question with "Làm lại" (K/64); feedback shows correct answer, meaning, definition and the "Cần ôn lại" suggestion
  when `highlight_needs_review`; hints list "Gợi ý 1/3" in vi, no total in en (design §7.1); round prompt (K/65) calls `continue`; 409 `already-answered`
  with `result` renders that result (E36); 409 `session-closed` → "Phiên này đã kết thúc." (E37); report dialog lists reasons in API order (Khác last
  after Task 29), note required when `note_required`; reload resumes via `current` (Review Focus 4); E34 leave mid-session keeps it open.
- [ ] **Step 2–4. Step 5: Commit** `feat(web): add the practice session player`.

### Task 32: Weak words, history, my reports

**Files:** Create `apps/web/src/features/learner/practice/{WeakWordsPage,HistoryPage,MyReportsTab}.tsx` with tests; pages
`app/(member)/practice/weak/page.app.tsx`, `app/(member)/practice/history/page.app.tsx`

Frames: K/56 `276:3501`, K/57 `276:3741`, K/57b `411:5825`, K/82 `364:4453`, K/83 `364:4706`; M/L56, M/L57, M/L57b, M/82, M/83. API: `GET
/practice/weak-words?group_id=` (+ `meaning`), `GET /practice/weak-words/groups`, `POST /practice/sessions {source:'weak', group_id}` `[I]`, `GET
/practice/history?date&sense_id`, `GET /practice/reports`. Copy: §4.6, §12 row 4, §7.14–7.15b.

- [ ] **Step 1: Failing tests:** deck Select "Tất cả nhóm · 6", "Công nghệ · 3"; title "3 từ trong nhóm Công nghệ"; [Luyện 3 từ của nhóm Công nghệ] sends
  `source:'weak'` + `group_id`; "5 câu gần nhất" column; explainer box text from §4.6; history tabs Câu đã làm / Báo lỗi của tôi with empty states; report
  status labels and "trả 1 lượt" when `refunded`.
- [ ] **Step 2–4. Step 5: Commit** `feat(web): add weak words, practice history and my reports`.

### Task 33: Plans page

**Files:** Create `apps/web/src/features/learner/plans/{PlansPage,PlanCard,CompareTable}.tsx` with tests; page `app/(member)/plans/page.app.tsx`
(`variant="full"`)

Frames: K/52 `265:844`, K/53 `277:2349`, K/52t `260:508` (dark reference); M/62, M/62b. API: `GET /me/entitlements` (`plan`, `sources[].starts_at`,
`ends_at`), `GET /me/app-config` (`plans`). Copy: §4.7, §16.

- [ ] **Step 1: Failing tests:** Free card without "Không cần thẻ ngân hàng"; Pro card with placeholder price "XXX.000 ₫ / năm" and the month/year switch,
  strip "Chưa mở bán", no payment line, no buy button; numbers from `plans` (not hard-coded); Pro granted by the team: "cấp từ 15/10/2026 tới
  31/12/2026" from `starts_at` / `ends_at` (GG3); no usage block here (§12).
- [ ] **Step 2–4. Step 5: Commit** `feat(web): add the plans page`.

### Task 34: M4 e2e, test flow and gate

- [ ] **Step 1:** `e2e/app/m4.spec.ts`: start a default session; each question type; hints; round prompt; summary; report; out-of-sessions (Free);
  resume dialog; weak words by deck; history; plans; axe and overflow (long typed answer, long meanings in MCQ options).
- [ ] **Step 2:** test flow M4 (grant Pro with `learner:setup --plan pro` to check 30 sessions); real-stack run; screenshots; commit `test(web): add m4 e2e
  and test flow`; PR; owner gate.

---

## M4b — Transaction history (PR 5, D18)

### Task 35: Figma frames for transaction history (owner approval gate)

- [ ] **Step 1:** Draw in Figma `7HcPAKLrWu32C27qYMJUOA` (load figma-use first), in a new section "12 · Lịch sử giao dịch" on page 08 (web: list, row detail,
  empty, load error; light and dark), section "10 · Lịch sử giao dịch" on page 09 (phone: list, detail sheet, empty), section "E5 · Giao dịch" on page 04
  (admin wireframe: table with filters email · loại · từ ngày · tới ngày, row detail, empty). Rows: loại (Mua · Gia hạn · Đổi kỳ · Hoàn tiền · Dùng thử ·
  Đội Wordmet cấp), gói và kỳ, số tiền ("99.000 ₫"; none for trial/grant), ngày, kỳ được dùng, trạng thái (Thành công · Đã hoàn tiền · Đang chờ · Đã hủy
  hoàn tiền), cổng ("Giả (thử)" for `fake`), mã giao dịch. Copy added to the copy doc §17. Run `figma-checks.js` (contrast, overflow, one yellow button).
- [ ] **Step 2:** Send the owner the frames' screenshots; **wait for "ok"** before Task 36. Record the node ids in `figma-node-ids.md`; commit
  `docs(ui): add the transaction history frames`.

### Task 36: API (i) — transaction records

**Files:** Modify `apps/api/prisma/models/entitlements.prisma` (model `BillingTransaction`), `src/entitlements/billing/billing.types.ts`,
`billing/fake/fake-wire.ts` (+ spec), `billing/event-applier.service.ts` (+ spec), `scripts/billing-fake-event.mjs` (`--currency`); create
`prisma/migrations/<ts>_billing_transactions/migration.sql`, `src/entitlements/billing/transactions.repository.ts` (+ spec), `transaction-amount.ts`
(+ spec)

**Interfaces:**
- Table per design §8.9 (`billing_transactions`, unique `(provider, environment, provider_transaction_id, kind)`).
- `NormalizedEvent` adds `amount: number | null; currency: string | null` to `subscription_started`, `renewed`, `plan_changed`; `refunded` adds
  `currency`. Fake wire accepts `amount` (finite number) and `currency` (`/^[A-Z]{3}$/`) on those types.
- `toMinorUnits(amount: number, currency: string): number` (fraction digits from `Intl.NumberFormat(…, {style:'currency', currency})`).
- `TransactionsRepository.recordFromEvent(tx, event, ctx: { userId: string; subscriptionId: string; provider: string }): Promise<void>` called in
  `decide()` after `applyEvent` for every non-duplicate event of those types (design §8.9 mapping); `refunded` / `refund_reversed` update the original
  row's status.

- [ ] **Step 1: Failing tests** GI1–GI6, GI10 (design §8.9); `toMinorUnits(99000,'VND') === 99000`, `(4.99,'USD') === 499`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** + migration (`prisma migrate diff` drift check empty). **Step 4: Run** → PASS. **Step 5: Commit**
  `feat(api): record billing transactions`.

### Task 37: API (i) — transaction reads

**Files:** Create `apps/api/src/entitlements/transactions/{transactions.service,me-transactions.controller,admin-transactions.controller,transactions.queries}.ts`
(+ specs); modify `entitlements.module.ts`; if no email lookup exists on `IdentityService`, add `findUserIdByEmail(email): Promise<string | null>` to it
(+ spec)

**Interfaces:** `TransactionView = { id, kind: 'purchase'|'renewal'|'plan_change'|'refund'|'trial'|'grant', plan, interval, amount_minor, currency,
occurred_at, period_start, period_end, status, provider, provider_transaction_id }`; `GET /v1/me/transactions?page_size&page_token` (signed-in) →
`{ items: TransactionView[], next_page_token }`; `GET /v1/admin/transactions?email&kind&from&to&page_size&page_token`
(`@RequirePermission('settings.manage')`) → items with `user: { id, email }`. Grants merged as `kind:'grant'` (revoked → `period_end` = revoke date).
Keyset pagination on `(occurred_at desc, id desc)` over a UNION ALL of transactions and grants; token bound to the filters.

- [ ] **Step 1: Failing tests** GI7–GI9 plus: unknown email → empty list; bad `page_token` → 400. **Step 2–4. Step 5: Commit** `feat(api): list
  transactions for learners and admins`.

### Task 38: Learner transaction history screen

**Files:** Create `apps/web/src/features/learner/transactions/{TransactionsPage,TransactionRow,TransactionDetail}.tsx` with tests; page
`app/(member)/settings/transactions/page.app.tsx`; modify `settings/SettingsPage.tsx` (`SHOW_TRANSACTIONS = true`)

- [ ] **Step 1: Failing tests** against the approved frames of Task 35: money via `useFormat().money` ("99.000 ₫"), no amount line when `amount_minor` is
  null, kind and status labels, period "15/10/2026 – 31/12/2026", infinite list, empty state, error state with retry.
- [ ] **Step 2–4. Step 5: Commit** `feat(web): add the transaction history`.

### Task 39: Admin "Giao dịch" page

**Files:** Create `apps/admin/src/features/transactions/{TransactionsPage,transactions-api}.tsx/ts` with tests; modify `apps/admin/src/app/{nav,nav-icons,
routes}.ts(x)`, `auth/session-store.ts` (`Permission` adds `settings.manage`, `entitlements.grant`), `auth/test-support.ts`, `e2e/support/mock-api.ts`
(`PERMISSIONS.admin`), the nav/route tests and e2e counts listed in facts §2, `messages/{vi,en}.json` (`transactions.*`, `nav.transactions`)

- [ ] **Step 1: Failing tests:** nav entry visible to admin only (editor count unchanged); filters map to query params; table columns as the approved A/
  frame; e2e page in the a11y list. **Step 2–4. Step 5: Commit** `feat(admin): add the transactions page`.

### Task 40: M4b e2e, test flow and gate

- [ ] **Step 1:** web `e2e/app/m4b.spec.ts` (list, detail, empty); admin e2e via `mockApi`. **Step 2:** test flow M4b (`learner:setup --transactions`);
  real-stack run; screenshots; commit `test: add m4b e2e and test flow`; PR; owner gate.

---

## M5a — Practice with AI questions (PR 6)

### Task 41: API (f) — report on AI questions about private words without consent

**Files:** Modify `apps/api/src/practice/reports/reports.service.ts`, `reports.controller.ts` (+ specs; update the B7E79 test)

- [ ] **Step 1: Failing tests** GF1–GF4 (design §8.6). **Step 2: Run** → FAIL. **Step 3: Implement** (drop the consent check and the `sharePrivateWord`
  input; the body still accepts `share_private_word`). **Step 4: Run** → PASS. **Step 5: Commit** `feat(api): report ai questions about private words
  without a consent box`.

### Task 42: Customise dialog with the AI toggle

**Files:** Modify `apps/web/src/features/learner/practice/CustomizeDialog.tsx` (+ test); create `AiTypesToggle.tsx` (+ test)

Frames: K/70 `357:3557`, K/70t `359:3683`, K/70b `359:4099`, K/71 `359:4527`, K/72 `359:4950`; M/70, M/70t, M/70b, M/71, M/72 — **changed by design §6
(D10)**: no "Câu lấy từ đâu?", no descriptions, equal boxes.

- [ ] **Step 1: Failing tests:** the switch "Kiểu câu có AI" + Pro badge; off → the three AI boxes are absent; on → Điền từ vào câu, Chọn nghĩa trong câu,
  Trắc nghiệm theo câu and "Phiên này dùng tối đa N lượt câu AI · còn M" (N from the AI types ticked, M from `pools.ai_practice.remaining`); Free
  (`features['ai.practice']` false) → switch disabled, press → LockedFeature line (D6); the switch state persists in `localStorage`
  `wordmet-web.ai-types` (E21); start sends `types` incl. AI types and never `cloze_source`; 403 `ai-quota-insufficient` → K/71 (have, need, reset);
  503 `ai-unavailable` → K/72 generic text of D11 (E28); 403 `entitlement-required` → switch off + LockedFeature + entitlements refetch (E24).
- [ ] **Step 2–4. Step 5: Commit** `feat(web): add the ai question toggle to session setup`.

### Task 43: AI states in the session player

**Files:** Modify `use-practice-session.ts`, `PracticeSession.tsx` (+ tests); create `PreparingState.tsx`, `AiUnavailableState.tsx`, `SessionNotice.tsx`

Frames: K/73 `360:4197`, K/74a `360:4266`, K/74b `360:4338`, K/74c `360:4410`, K/74d `360:4482`, K/74e `360:4554`, K/75 `360:15451`, K/75b `360:15512`,
K/76 `360:15573`; M/73–M/76.

- [ ] **Step 1: Failing tests:** `state:'preparing'` → "Đang tạo câu…", next call after `retry_after_seconds` (fake timers), after 60 s the generic error with
  [Thử lại] [Để sau] (E29); after each question is shown, `POST …/prepare` fires once without awaiting; `ai_unavailable` `ai-failed` / `ai-unavailable` →
  "Hệ thống đang gặp lỗi." [Thử lại] (sends `{retry_ai:true}`) [Để sau] (E30, D11); `quota-exhausted` → K/74b with reset time; `plan-required` → K/74c;
  notice `ai-fallback` → "Câu này chuyển sang kiểu câu thường." once (E32), except `ai_reason: 'quota-exhausted'` → the K/75b text with the reset
  time; `word-not-recognized` → K/76 link "Xem lại từ trong Từ của tôi" (E33).
- [ ] **Step 2–4. Step 5: Commit** `feat(web): handle ai preparation and failures in practice`.

### Task 44: AI question types and AI report

**Files:** Create `ClozeQuestion.tsx`, `MeaningInSentenceQuestion.tsx`, `SentenceMcqQuestion.tsx` (+ tests); modify `HintPanel.tsx`, `AnswerFeedback.tsx`,
`ReportDialog.tsx` (+ tests)

Frames: K/78a `362:4386`, K/78b `362:4445`, K/78c `362:4511`, K/79a `362:4577`, K/80 `363:4417`, K/80b `363:4596`, K/81 `363:4779` (**changed by D12**);
M/78a–M/81, M/78d. Copy: §7.10–7.13, §15 row 10.

- [ ] **Step 1: Failing tests:** cloze with [Kiểm tra] and skip; meaning-in-sentence with the bold word; sentence MCQ; hint list with progress dots and
  [Mở gợi ý n] (H); feedback shows "Bản dịch · AI dịch" for `vi` learners when `translation` exists, none for `en` (E41); AI report reasons
  (`kind=ai`, Khác last); K/81: no consent checkbox, the line "Đội Wordmet sẽ thấy từ “rizz” bạn tự thêm để kiểm tra." and the request has no
  `share_private_word`.
- [ ] **Step 2–4. Step 5: Commit** `feat(web): add ai question types`.

### Task 45: M5a e2e, test flow and gate

- [ ] **Step 1:** `e2e/app/m5a.spec.ts`: Pro session with AI types (preparing → question → hints → answer → translation); AI failure + retry; mixed session
  notice; Free locked switch; quota insufficient; AI report on a private word; axe and overflow (300-char AI sentence on 390px, M/78d).
- [ ] **Step 2:** test flow M5a (`learner:setup --plan pro`, fake models); real-stack run; screenshots; commit `test(web): add m5a e2e and test flow`; PR;
  owner gate.

---

## M5b — AI lookup and My words (PR 7)

### Task 46: AI lookup in the add-word sheet

**Files:** Create `apps/web/src/features/learner/add-word/{AiLookupPanel,AiLookupResult,ai-lookup-api}.tsx/ts` (+ tests); modify `AddWordSheet.tsx`

Frames: K/85 `365:4577`, K/85t `365:4878`, K/85b `365:5179`, K/85c `367:5650`, K/86 `366:5018`, K/86b `366:5315`; M/85, M/85t, M/85b, M/85c, M/86, M/86b.
API: `POST /lookup/ai {text, context_sentence?}` `[I]` (lease 60 s). Copy: §7.16–7.17, §15 row 13.

- [ ] **Step 1: Failing tests:** two equal buttons, "còn 96 lượt tra AI" under [Tra bằng AI]; Free → locked + LockedFeature; "Gửi kèm câu đã gặp cho AI"
  unticked → no `context_sentence`; result: catalog senses first, then the "AI gợi ý" suggestion; 409 `ai-in-progress` or `about:blank` → keeps "Đang tra…"
  and retries with the **same** key after `Retry-After` (E38); 503 `ai-lookup-failed` → D11 generic text, [Thử lại] only if `retryable` (E39); 403
  `quota-exhausted` → "Hết lượt tra AI." + reset date (E40); Review Focus 1.
- [ ] **Step 2–4. Step 5: Commit** `feat(web): add ai lookup to add word`.

### Task 47: Edit before saving, My word page

**Files:** Create `apps/web/src/features/learner/add-word/EditSuggestionForm.tsx` (+ test); modify `word/WordPage.tsx`, `word/SenseBlock.tsx` (+ tests)

Frames: K/87 `366:5621`, K/88 `367:5452`; M/87, M/88. API: `POST /quick-add` with `new_word{lemma, meaning, pos?, level?, topics?, form_of?, examples?(≤2),
ai_suggestion?}`, `PATCH /my-words/{entryId}` `[I]`, `DELETE /my-words/{entryId}` `[I]`. Copy: §7.18–7.19.

- [ ] **Step 1: Failing tests:** form prefilled from the suggestion (meaning, part of speech, level, up to 2 examples); saving sends `ai_suggestion`;
  My word page shows "AI gợi ý" while `ai_suggested`; editing the meaning, topics or examples removes the label after refetch; editing only the
  word, part of speech or level keeps it; no English definition line for private words.
- [ ] **Step 2–4. Step 5: Commit** `feat(web): edit ai suggestions before saving and show my words`.

### Task 48: M5b e2e, test flow, close-out

- [ ] **Step 1:** `e2e/app/m5b.spec.ts` (AI lookup flow for Pro, Trial, Free; edit and save; My word page); axe and overflow.
- [ ] **Step 2:** test flow M5b; real-stack run; screenshots.
- [ ] **Step 3: Close-out docs:** as-built in `docs/deliveries/giao-dien-nguoi-hoc.md` (Worker sizes, CSP result, calls made while building); UI-CONTEXT
  §2 (D22 exception) and §10 (pointer to this round); CLAUDE.md one section "Giao diện người học"; design Bước 7 note (D10, D12 changed D11/D26 of
  Bước 7); commit `docs: record the learner ui round`; PR; owner gate.
