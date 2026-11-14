# Code facts for the learner web UI plan (22/10/2026)

Read from `dev` @ `3299a4f` by three read-only agents and Claude, 22/10/2026. Plan:
[`../superpowers/plans/2026-10-22-giao-dien-nguoi-hoc.md`](../superpowers/plans/2026-10-22-giao-dien-nguoi-hoc.md) cites "facts §N". `W` = `apps/web`,
`A` = `apps/admin`, `API` = `apps/api`. Line numbers are as of that commit; re-check before editing.

## §1 apps/web today

- Root layout is `W/src/app/[locale]/layout.tsx` (html, body, Lexend, JsonLd, `NextIntlClientProvider messages={null}`, SkipLink, SiteHeader, `<main
  id="main">`, SiteFooter). No `src/app/layout.tsx`. Only `generateStaticParams` in the repo is there (both locales). Locale reaches
  `getTranslations()` through `next/root-params` (`W/src/i18n/request.ts:10`); no `setRequestLocale`, no `dynamic` exports.
- Routes under `[locale]`: `page.tsx`, `privacy/`, `terms/`, `not-found.tsx`, `[...rest]/page.tsx` (calls `notFound()`), `opengraph-image.tsx`.
- Server-first: sections are async server components; only 7 `'use client'` files; client islands receive copy as props (`WaitlistForm labels`).
  `W/src/global.d.ts:4-8` types `Messages = typeof en.json`.
- UI primitives `W/src/components/ui`: `Button` (native, `ButtonVariant = 'primary'|'secondary'|'accent'|'ink'`, exports `buttonVariants`,
  `buttonBase`), `ButtonLink` (`<a>`), `Chip`, `Icon` (`'check'|'flag'` only), `Container`, `Section`, `SectionHeading`, `VisuallyHidden`.
  `W/src/lib/cn.ts:5-13` registers custom `text-*` sizes with tailwind-merge: every new `--text-*` token must be added there.
- Styling: `W/src/app/globals.css:1-2` imports tailwind then `@wordmet/design-tokens/theme.css`, then a web `@theme` (type scale :6-34,
  containers :37-44, `--spacing-header`, animations, `:focus-visible` 3px primary outline :148-151, reduced-motion kill switch :167-179).
  Admin-only tokens (`text-ui`, `spacing-control`, `shadow-menu/sheet/button/dialog/toast`, menu/dialog animations) live in
  `A/src/styles/globals.css:6-49` and must be re-declared in web (no colours) for copied components.
- `W/scripts/check-tailwind-raw.mjs`: no arbitrary values `-[...]` (also `data-[x]:…`) and no `style={` in `src/**/*.tsx` (not `.test.tsx`, not
  og/icon routes) unless the line above has `// raw-ok: <reason>`; runs in `pnpm lint`.
- `W/src/styles/tokens.test.ts`: LP12 contrast pairs (text ≥ 4.5 :34-40, controls ≥ 3 :41-46), LP31 no `px` in `--text-*`, `--container-*`,
  `--radius-*`, `--shadow-*`, UBC1 no `--color-*` in `globals.css`.
- i18n: namespaces PascalCase (Metadata, Nav, Hero, …, NotFound). `W/src/i18n/messages.test.ts` enforces vi/en key parity, no empty values, rich tags
  only `br|brMd|brSm|link` (extend `allowed` for new tags), `Faq.items` = q1..q4.
- Tests: `W/vitest.config.ts` environment **node**, include `src/**/*.test.{ts,tsx}`, `scripts/**/*.test.ts`, alias `@`; DOM tests start with
  `// @vitest-environment jsdom`. Playwright (`W/playwright.config.ts`): port 3100, projects desktop 1440×900 and mobile 390×844, webServer
  `pnpm cf:build && pnpm db:migrate:local && node scripts/e2e-cf.mjs && pnpm cf:dev` (real OpenNext Worker), `env` holds the `NEXT_PUBLIC_*` the build
  bakes. `e2e/copy.ts` reads messages; a11y inlines `AxeBuilder` (admin has a helper `A/e2e/support/axe.ts:133-149` `seriousViolations`).
  `W/scripts/assert-static.mjs` asserts `/vi`, `/en` in `.next/prerender-manifest.json` (hard-coded list).
- `W/src/proxy.ts`: only `/` picks a locale (307, `Cache-Control: private, no-store`, `Vary`); matcher `'/((?!api|trpc|_next|_vercel|.*\\..*).*)'`.
  `sitemap.ts` lists `/vi`, `/en`; `robots.ts` allow/disallow `/` by `NEXT_PUBLIC_INDEXABLE`. `next.config.ts`: `reactStrictMode`,
  `poweredByHeader:false`, next-intl plugin, `initOpenNextCloudflareForDev()`; no headers. `lib/site.ts`: `NEXT_PUBLIC_SITE_URL`,
  `NEXT_PUBLIC_INDEXABLE`, `NEXT_PUBLIC_CONTACT_EMAIL`.
- `node_modules` is not installed in a fresh checkout; `W/AGENTS.md` asks to read `node_modules/next/dist/docs` before writing Next code.
- Live landing HTML (owner, 22/10) contains inline `self.__next_f.push(…)` scripts and the Cloudflare Web Analytics beacon
  `https://static.cloudflareinsights.com/beacon.min.js/…`.

## §2 apps/admin session and API layer (to copy)

- `A/src/auth/session-store.ts` (353 lines, spec 851 lines): `Permission` union lacks `settings.manage`, `entitlements.grant` (API has them,
  `API/src/identity/identity.types.ts:4-15`); `Me`; `Notice = 'no-access'|'expired'|'rate-limited'|'logout-failed'`; `SessionState`;
  `CHANNEL_NAME='wordmet-admin-auth'`; private `DEVICE={client:'web',device_label:'Wordmet Admin'}`; `REFRESH_TRIES=3`; `REFRESH_RETRY_DEFAULT_S=10`.
  `class SessionStore({baseUrl, fetch, channel, wait?, now?})`: constructor adds `pagehide`/`pageshow` listeners (**touches `window`**); members
  `state`, `hasAccessToken`, `subscribe`, `bootstrap()`, `login`, `changePassword`, `logout`, `retryLogout`, `recheck` (GET `/v1/me` → `gate`),
  `send: Transport` (403 `forbidden` → refresh+recheck). Refresh shares one promise, retries 429 by `Retry-After`, `postRefresh` uses
  `keepalive:true` and `X-CSRF-Protection: 1`. Logout-pending flag in **sessionStorage** key `wordmet-admin-logout-pending`.
- `A/src/auth/session-context.tsx`: `createDefaultStore` (BroadcastChannel in try/catch, `apiBaseUrl` from Vite env), `SessionProvider` uses
  `useSyncExternalStore` **without a server snapshot**, bootstraps in an effect, rechecks on `focus`. `useSession()`, `useApi()`.
- `A/src/auth/gate.ts`: staff only. `A/src/auth/test-support.ts`: `BASE`, `makeMe`, `tokenResponse`, `problem`, `rateLimited`, `makeFetch(routes)`
  (keys `"METHOD /path?query"`, unscripted request throws), `channelHub()`.
- `A/src/api/client.ts`: `ApiClient` has `get`, `post(path, body?, {idempotencyKey?})`, `put(path, body)` (**no key option**), `postForm`, `getBlob`;
  **no `patch`, no `delete`**. `problem.ts`: `Problem`, `ApiError {problem, retryAfterSeconds}`, `NetworkError`, `KNOWN_ERROR_SLUGS` (28),
  `problemSlug`, `toApiError`, `errorMessageKey` (`errors.<slug>` | `errors.inProgress` | `errors.generic`). `idempotency.ts`:
  `useIdempotencyKey(fingerprint): {key, renew()}`. `use-error-message.ts` uses root `useTranslations()` (keys `errors.*`, `offline.message`).
  `app/offline.tsx` `createQueryClient(setOffline)` (retry off; `NetworkError` → offline banner).
- Admin page wiring: `app/routes.tsx` (explicit routes under `<RequireSession><Shell>`; NAV entries with `available:false` → `ComingSoonPage`),
  `app/nav.ts` (`NavEntry`, 16 entries), `nav-icons.ts`, `Shell.tsx` (H1 = nav label). Adding/flipping a nav entry updates `nav.test.ts`
  (FIGMA_ORDER, counts 16, editor 12/admin 16), `routes.test.tsx`, `ComingSoonPage.test.tsx`, `e2e/shell.spec.ts:44` (`toHaveCount(16)`),
  `e2e/a11y.spec.ts` pages list. Example feature `features/staff` (`staff-api.ts`, `StaffPage.tsx` with `useInfiniteQuery`, `test-utils.tsx`
  `renderApp`). E2E mocks `A/e2e/support/mock-api.ts` (`mockApi`, `problem`, `signedInAs`, `PERMISSIONS`, `requestCount`). Admin messages camelCase
  namespaces; curly quotes and `…` required.
- Versions to reuse (`A/package.json`): `@tanstack/react-query` 5.104.2, `react-aria-components` 1.22.1, `lucide-react` 1.55.0, `msw` 3.0.3 (unused).
  Web has none of them.

## §3 API: learner facing

- Global `AuthGuard` (`API/src/identity/identity.module.ts:28`) sets `req.user = {userId, sessionChainId}`. `@LearnerContent()` +
  `@CurrentLearner()` (`API/src/content/index.ts:23-24`) → `Learner {userId, nativeLanguage}`, 403 `profile-incomplete` without a language. Without
  that guard: `@Req() req: RequestWithUser` (`me-entitlements.controller.ts:10-19`, `profile.controller.ts:12-24`).
- Problem `type` = `${PROBLEM_TYPE_BASE}<code>`; Idempotency: missing key 400 `about:blank`, same key other body 400, in flight 409 `about:blank`
  + `Retry-After`, abandoned 409 `idempotency-key-abandoned`. Rate limits: `user.write` 30/min, `learning.review` 120/min, `practice.answer`
  120/min, reports `reports_per_hour` 20.
- Refresh cookie `refresh_token`, `HttpOnly; Secure; SameSite=Strict; Path=/v1/auth`; refresh/logout need `X-CSRF-Protection: 1` and `{}`.
  CORS from `CORS_ORIGINS` (exact origins; `.env.example:48` lacks `http://localhost:3001`). `LEARNER_APP_URL=http://localhost:3001`
  (`.env.example:52`). API port `process.env.PORT ?? 3000`.
- Endpoint inventory by area: see the 22/10 survey in the design (§4–§8) and the agent report summarised in the decision record; the plan names each
  endpoint where a screen uses it.

## §4 API: places the nine API tasks touch

- **(a)** `API/src/identity/profile/profile.schemas.ts:4-9` strict body; `identity.service.ts:107-132` `updateProfile` (early return :112-113, no
  Clock injected, :59); `person.ts` `MIN_AGE` :3, `birthDateSchema` :29-33, `isOldEnough` :38-44; register rule `auth.service.ts:45-52`; `Clock`
  abstract class `API/src/common/clock/clock.ts:3`, `FakeClock`; `localDate(tz, at)` `API/src/common/time/local-date.ts:32`, `dateValue` :69. FE8 test
  `profile.controller.spec.ts:83`.
- **(b)** `history.controller.ts:6-7,22-25` (weak query); `history.service.ts:32-52` `weakWords(userId, page)`, binding `'weak-words'` (:33,50);
  `encodeBoundToken`/`decodeBoundToken` `API/src/common/pagination/page-token.util.ts:21-42`; `practice-stats.ts:53-58` `weakSenses`;
  `sessions.controller.ts:15-28` refine; `sessions.service.ts:362-370` `sourceItems`, `:373-379` `usable`; Learning façade
  `learning.service.ts:22-45` (`practiceItems(userId, scope, db?)` asserts group ownership → 404); template query `practice-reads.queries.ts:107-116`
  (`groupMatesQuery`); `ItemsService.states` `items.service.ts:121-133` (group ids per sense, no names).
- **(c)** `items.schemas.ts:10-14` `bulkAddBody`; `items.service.ts:74-95` `bulkAdd`, `BulkResult` :19; `content.visibleSenseIds(viewerId,
  senseIds, db?)` `content.service.ts:232`; `itemsPerGroup` setting default 2000.
- **(d)** seed `API/prisma/migrations/20261022090000_buoc7_practice_ai/migration.sql:110-117` (positions 1–7, `other`=4, `updated_by` NULL);
  latest migration `20261022091000_buoc7_ai_operations`; learner sort `report-reasons.service.ts:31-41`.
- **(e)** `sentences.controller.ts:29-60`; `sentences.service.ts` `listSentences(userId, senseIds, db?)` :60-70 (no visibility filter),
  `deleteSentence` :72-76; `WordsService.wordPage` `words.service.ts:124-145`, `WordSense` :13-20 (shared with `lookup` and `cardContent`).
- **(f)** `reports.controller.ts:10-18,35-37` (`share_private_word` → `sharePrivateWord ?? false`); `reports.service.ts:88` `create(learner,
  itemId, {reason, note, sharePrivateWord})`, consent check :106-108; test B7E79 `reports.service.spec.ts:120`.
- **(g)** `SettingsService.get(db?) → AppSettings` `settings.service.ts:39`; `FIELDS` api-key map `settings.definitions.ts:184-226`
  (`toApiValues` not exported); Settings module imports Identity only (Content imports Settings: no `@LearnerContent` in Settings).
  `EntitlementsService.snapshot` sources mapping `entitlements.service.ts:144-162`. `PracticeSense.meaning` via
  `content.practiceSenses(viewerId, senseIds, nativeLanguage, db?)` `content.service.ts:202`.
- **(h)** Topics: `Topic {code, archivedAt}`, `TopicName` (`content.prisma:1-19`); senses carry `sense_revisions.topic_codes text[]` (GIN). Published
  + catalog + function-word filters and displayed level LATERAL: `learner-content.service.ts:90-158` (filters :104-112, level :125-134). Profile
  timezone via `IdentityService.getProfile(userId)`.
- **(i)** `BillingEventApplier.apply` `API/src/entitlements/billing/event-applier.service.ts:55-78`, transaction :65, `decide()` :80-183 (dedupe :117-125,
  trial history :133-142, `applyEvent` :144, subscription write :156-160); normalized events `billing.types.ts:42-59` (`amount` only on `refunded`,
  unused); fake wire `billing/fake/fake-wire.ts:55-125`; CLI `scripts/billing-fake-event.mjs` (`--type --sub --user`, `--amount`, flag map :35-48);
  grants model `entitlements.prisma:5-31`, reads `sources.repository.ts:26-45`, `grants.service.ts:242-248`; webhook 404 unless
  `BILLING_FAKE_ENABLED`. Trial only via fake `subscription_started` with `trial_ends_at`.

## §5 Sample data and test setup

- CSV import (as `smoke-buoc-4.mjs:208-232`): `POST /v1/admin/content/sources` → `POST /v1/admin/content/uploads` (multipart `level_source_id`,
  `file`, Idempotency-Key) → poll `GET …/uploads/:id` → `POST /v1/admin/content/senses/publish-jobs {filter:{batch_id}}` → poll until `succeeded`.
  Needs the worker (`pnpm run:dev`). Columns (`content-pipeline/upload/columns.ts:1-28`): `headword`, `pos`, `CEFR`/`level`, `gloss_vi`,
  `definition_en`, `example_en_1..3`, `topics` (`;`-separated, must exist: `POST /v1/admin/taxonomy/topics {code, names:{vi,en}}`), `inflections`
  (`kind:form; …`). Publishable needs gloss, example, level. Seeded topics: technology, marketing, business, food, daily-life.
- Admin login (smoke): register → OTP from Mailpit `GET :8025/api/v1/messages` → `POST /v1/auth/verify-email` → `node dist/cli/admin-grant.js <email>`
  → login. Fake AI: `POST /v1/admin/ai/models {provider:'fake', model_id:'fake:ok'}`, `PUT /v1/admin/ai/operations/:op {expected_version, model_ref,
  effort:null, thinking:null, max_output_tokens:null}` for `generate_cloze`, `generate_meaning_question`, `generate_sentence_mcq`,
  `check_private_word`, `lookup_word` (+ `translate_sentence`). Pro: `POST /v1/admin/entitlements/grants {user_id, kind:'plan', plan:'pro',
  ends_at, reason}` (Idempotency-Key). Trial: fake `subscription_started` with `trial_ends_at`.
- Cloud session: `dockerd` must be started by hand (not running after a container restart); Docker Hub returns 429, images pull from
  `mirror.gcr.io` (`mirror.gcr.io/library/postgres:17`, `mirror.gcr.io/library/redis:7.4-alpine`, `mirror.gcr.io/axllent/mailpit`), retag to the
  names in `docker-compose.yml`.
