# Giao diện mới M8, FAQ do admin quản lý: code facts (11/11/2026)

Source: `origin/refactor/giao-dien-moi` at `1c4c752efbf7f133f92fdfcd7878a3bb30d81b27` (merge of PR #263, `feat/giao-dien-moi-m7a`), read with
`git show` / `git grep` after `git fetch origin`. Nothing was built or run. Paths below are relative to the repo root; `API/` = `apps/api/src/`,
`ADM/` = `apps/admin/src/`, `WEB/` = `apps/web/src/`. Sibling survey for the rest of the landing (prices, build, tests to rewrite):
`docs/preparation/GIAO_DIEN_MOI_PLAN_CODE_FACTS_2026-11-11-m8-site.md`.

## 0. Big picture

Surprises first:

- **The legal pattern is per request, not build time.** `WEB/lib/legal.ts:33` fetches with `cache: 'no-store'` and both legal pages export
  `dynamic = 'force-dynamic'` (`WEB/app/[locale]/(site)/privacy/page.tsx:12`; `/sources` the same at `sources/page.tsx:10`). Copying that into the home page would
  break the rule that `/vi` and `/en` are prerendered: `apps/web/scripts/assert-render-mode.mjs:12-13` fails the CI `web` job
  (`.github/workflows/ci.yml:107-112`) when either is not in `.next/prerender-manifest.json`. A build-time FAQ read must not use `no-store` /
  `force-dynamic`.
- **No build has an API to read from today.** CI web build: `apps/web/playwright.config.ts:19,26` sets `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000`
  and the `web` job starts no API. Production build: `.github/workflows/deploy-web.yml:27-32` sets no API URL at all, so `serverApiBaseUrl()` falls
  back to `http://localhost:3000` (`WEB/app-shell/config.ts:2-4,29-32`). The FAQ read therefore needs the same fallback / required-flag scheme design
  §10.6 gives prices (`docs/superpowers/specs/2026-11-09-giao-dien-moi-design.md:789-805`: `prices.fallback.ts`, `PRICES_REQUIRED=1` only in `deploy-web.yml`).
  Neither the price reader nor the fallback exists in `apps/web` yet (no hit for `public/prices` under `apps/web`).
- **The landing FAQ is hard-coded and pinned by tests.** `WEB/components/landing/Faq.tsx:8-13` builds exactly four items from `copy.q1..a4`;
  `apps/web/messages/vi.json:236` holds them under `Landing.faq`; `WEB/i18n/messages.test.ts:63-67` (LP30) pins the keys `title, q1, a1 … q4, a4` in both
  locales; `WEB/components/landing/sections.test.tsx:55-69` pins four `<details>` with the first open and LA3#16 checks the wording of `a2`.
  `#hoi-dap` anchors are linked from `LandingHeader.tsx:30` and `SiteFooter.tsx:30`.
- **The English home is not served.** `WEB/proxy.ts:23-31` (L4) redirects the English landing to the Vietnamese one, and `apps/web/messages/en.json:236-240`
  `Landing.faq` is Vietnamese text. Whether a FAQ item needs an English column is a decision, not a requirement of the current site.
- **Admin has no reorder UI anywhere.** A grep of `ADM` and `apps/admin/package.json` for `moveUp|moveDown|reorder|dnd-kit|draggable|useDrag|sort_order|
  display_order|useListData|DragAndDrop` finds nothing relevant. The only admin-edited order is a numeric `position` field in a dialog (report reasons, §3.4).
- **Public legal route has no rate limit; public prices has one.** `API/legal/public-legal.controller.ts:11-12` is `@Get('current') @Public()` only;
  `API/settings/public-prices.controller.ts:16-18` adds `@RateLimit('public.prices.ip')`. The guard reads the rule from the handler only
  (`API/common/rate-limit/rate-limit.guard.ts:18`), and the counter key is `${rule}:${by}:${value}` (`API/common/rate-limit/rate-limiter.service.ts:50`),
  so reusing `public.prices.ip` on a FAQ route would share the prices counter.
- **Migration folders are dated in the future.** The newest is `apps/api/prisma/migrations/20261113100000_learning_log_user_local_date`; a FAQ migration
  named with today's date (20261111…) would sort before it. Pick a name after `20261113100000`.
- **Every `*_by` column must be declared for account deletion.** `API/identity/deletion/account-data-map.ts:7-8` says `account-data-map.spec.ts` fails for a
  `user_id`, `*_user_id` or `*_by` column missing from the map (`account-data-map.spec.ts:38-45`); legal declares its three at `account-data-map.ts:29-32`
  as `keep-id`.

## 1. Legal feature in the API (the pattern)

### 1.1 Files

`API/legal/` (`git ls-tree`): `admin-legal.controller.ts`, `public-legal.controller.ts`, `legal.service.ts`, `legal.schemas.ts`, `legal.module.ts`,
`legal-terms.provider.ts`, `legal.service.spec.ts`. Registered in `API/app.module.ts:13,23` (`LegalModule` in the `imports` list).

`legal.module.ts:9-15`: `imports: [IdentityModule]` (for `IdentityService.emailsOf`), `controllers: [AdminLegalController, PublicLegalController]`,
`providers: [LegalService, IdempotencyInterceptor, LegalTermsProvider]`, `exports: [LegalService]`. `IdempotencyInterceptor` is provided per module
(same in `API/settings/settings.module.ts:13`).

`legal-terms.provider.ts:5-20`: the D3 port pattern. Identity never imports Legal; Legal registers a `TermsVersionSource` on `TermsVersion` in
`onModuleInit`. A FAQ needs no such port (nothing in Identity reads it).

### 1.2 Prisma model and migration

`apps/api/prisma/models/legal.prisma:3-21`, model `LegalVersion` → table `legal_versions`:
`id` uuid `gen_random_uuid()`, `number Int @unique`, `status String`, `rowVersion Int @default(1)` (`row_version`), `privacyVi`/`termsVi String @default("")`,
`privacyEn`/`termsEn String?`, `effectiveDate DateTime? @db.Date`, `createdBy`/`updatedBy String @db.Uuid`, `createdAt`/`updatedAt @db.Timestamptz`,
`publishedBy String? @db.Uuid`, `publishedAt DateTime? @db.Timestamptz`. No `@relation` (D3: staff ids are plain uuid columns).
`createdAt`/`updatedAt` have **no default**: the service writes them from `Clock` (`legal.service.ts:87-93`).

Migration `apps/api/prisma/migrations/20261103120000_legal_versions/migration.sql`: comment line 1, `CREATE TABLE` 4-23 with
`CHECK ("status" IN ('draft', 'published', 'superseded'))` at 22 (status is text + CHECK, not a Postgres enum), unique `number` at 26, and a hand-written
partial unique index `legal_versions_one_published_key ON legal_versions ((true)) WHERE status = 'published'` at 29.

Folder naming: `<yyyymmddhhmmss>_<snake_name>` (e.g. `20261103120000_legal_versions`, `20261113100000_learning_log_user_local_date`).
Prisma reads `prisma/` (`apps/api/prisma.config.ts:23-24`: `schema: 'prisma'`, `migrations.path`); `db:setup` = `prisma migrate deploy && prisma generate --sql`
(`apps/api/package.json:29`). CI checks schema drift (CLAUDE.md, job `api`), so the `.prisma` file and the SQL must agree.

Seed rows go in the migration SQL itself, e.g. `INSERT INTO "practice_report_reasons" (…, "position") VALUES` at
`apps/api/prisma/migrations/20261022090000_buoc7_practice_ai/migration.sql:110`. No Prisma seed script (`package.json` has none).

### 1.3 Controllers, routes, permissions

`setGlobalPrefix('v1')` at `API/app.setup.ts:54`, so `@Controller('legal')` serves `/v1/legal`.

Admin, `admin-legal.controller.ts`: `@Controller('admin/legal/versions')` :14, class-level `@RequirePermission('settings.manage')` :15.

| Route | Lines | Decorators |
|---|---|---|
| `GET /v1/admin/legal/versions` | 19-22 | `@Query({ schema: listQuery })` |
| `GET /v1/admin/legal/versions/:id` | 24-27 | `@Param({ schema: idParams })` |
| `POST /v1/admin/legal/versions` | 29-36 | `@HttpCode(201) @Idempotent() @UseInterceptors(IdempotencyInterceptor) @RateLimit('user.write')` |
| `PUT /v1/admin/legal/versions/:id` | 38-44 | `@Idempotent() @UseInterceptors(IdempotencyInterceptor) @RateLimit('user.write')` |
| `DELETE /v1/admin/legal/versions/:id` | 46-51 | `@HttpCode(204) @RateLimit('user.write')` (no Idempotency-Key) |
| `POST /v1/admin/legal/versions/:id/publish` | 53-61 | `@HttpCode(200) @Idempotent() @UseInterceptors(IdempotencyInterceptor) @RateLimit('user.write')` |

The actor is `req.user!.userId` from `@Req() req: RequestWithUser` (:34-35).

Public, `public-legal.controller.ts:7-18`: `@Controller('legal')`, `@Get('current') @Public()`, 404 `not-found` problem when nothing is published (:15).
Public prices, `API/settings/public-prices.controller.ts:12-22`: `@Controller('public/prices')`, `@Get() @Public() @RateLimit('public.prices.ip')`.

Decorators: `@Public()` = `SetMetadata('identity.public', true)` (`API/identity/sessions/public.decorator.ts:3-4`); `@RateLimit(...rules)` = metadata +
`UseGuards(RateLimitGuard)` (`API/common/rate-limit/rate-limit.decorator.ts:5-8`); `@RequirePermission(...)` = metadata + `UseGuards(PermissionGuard)`
(`API/identity/staff/require-permission.decorator.ts:7-9`); `@Idempotent()` default lease 30 s (`API/common/idempotency/idempotent.decorator.ts:13-14`).

### 1.4 Validation and errors

- **zod 4** (`zod: 4.6.7`, `apps/api/package.json:77`) through Nest's global `StandardSchemaValidationPipe` (`API/app.setup.ts:56`), used as
  `@Body({ schema })`, `@Param({ schema })`, `@Query({ schema })`. No class-validator.
- `API/legal/legal.schemas.ts`: `z.strictObject` everywhere; `text = z.string().max(20_000)` :4; `uuid = z.uuid().transform(lower)` :6; `saveSchema` :9-20 with
  a `refine` capping total bytes at 90 000 because the JSON body limit is 100 kB (`API/app.setup.ts:45`); `publishSchema { expected_version }` :23;
  `createSchema { copy_from? }` :26; `idParams` :29; `listQuery { page_size 1..100 default 20, page_token? }` :32-35. Types via `z.infer`.
- Problems: `new ProblemDetailsException({ status, type, title, extensions })` (`legal.service.ts:31-35`). Slugs used: `not-found` 404, `not-a-draft` 409,
  `legal-busy` 409 (P2002 on `number`, :98-101), `draft-version-conflict` 409, `publish-stale` 409, `validation-failed` 400 with
  `extensions.violations: string[]` (:134). The global filter is `ProblemDetailsFilter` (`API/app.setup.ts:55`). A zod failure gives 400 `validation-failed`
  with `violations` (the smoke checks `violations[].startsWith('month')`, `apps/api/scripts/smoke-giao-dien-moi.mjs:364-368`).

### 1.5 Versions, publishing, audit fields

`API/legal/legal.service.ts`:
- `list` :52-70: newest first by `number desc`, opaque `page_token` = `encodePageToken({ id })` of the last row (`common/pagination/page-token.util.js`).
- `create` :79-103: next `number` in a transaction; copies `copy_from`, else the published row, else empty.
- `save` :105-116: optimistic lock with `updateMany where { id, status: 'draft', rowVersion: expected_version }`, `rowVersion: { increment: 1 }`;
  `count === 0` → `whyNotDraftWrite` (:170-175) picks 404 / `not-a-draft` / conflict.
- `remove` :118-121: only drafts (`deleteMany where status 'draft'`).
- `publish` :124-151: checks required fields, then in one `$transaction` sets the old `published` row to `superseded` and this draft to `published`
  with `publishedBy`/`publishedAt`; the partial unique index turns a race into P2002 → 409 `publish-stale`.
- `current` :154-161: the public shape, no ids or authors.
- Audit: columns only (`createdBy`, `updatedBy`, `publishedBy` + times). No separate history/audit table for legal. Emails for display come from
  `IdentityService.emailsOf(ids)` (:177-180), rendered as `published_by: { id, email }` (:188). For contrast, Settings keeps an append-only
  `AppSettingChange` table (`apps/api/prisma/models/settings.prisma:12-23`). A grep for `audit` in `prisma/models/*.prisma` finds nothing: there is no
  shared audit log.
- Time: `Clock` injected (`legal.service.ts:49`), `FakeClock` in tests.

### 1.6 Unit tests (style)

- `API/legal/legal.service.spec.ts` (221 lines, Vitest): an in-memory `fakePrisma()` (:14-61) that understands only the `where` shapes the service uses
  (`not`, `lt`, `increment`, P2002 on duplicate `number`), `$transaction: fn => fn(prisma)`; `setup()` builds `new LegalService(prisma, identity, new FakeClock(...))`
  (:66-71); a `problem(promise)` helper returns `{ status, type, extensions }` (:77-85). Describes: `create` :87, `save` :113, `remove` :141, `publish` :155,
  reads :187. Assertions pin exact values (`toMatchObject({ number: 1, status: 'draft', row_version: 1, … })`).
- No controller spec for legal. The public-route pattern with a spec is `API/settings/public-prices.controller.spec.ts:8-27`: constructs the controller
  with a stub service, pins the exact body, and pins metadata
  `Reflect.getMetadata(IS_PUBLIC_KEY, …prototype.prices) === true` and `Reflect.getMetadata(RATE_LIMIT_KEY, …) == ['public.prices.ip']` (:23-26).

## 2. Module boundaries and the owner of a landing FAQ

Rule (CLAUDE.md:174-178, "Module boundaries (D3)"): each module owns `apps/api/prisma/models/<module>.prisma`; only its code queries its tables; others call
its exported service; no Prisma `@relation` across modules (plain uuid columns); only `src/identity/**` touches Identity tables; a review convention, not tooling.
Model files today: `ai, common, content, entitlements, identity, learning, legal, notifications, pipeline, practice, settings` (`.prisma`). `legal` was itself added
as a new module outside the original seven (03/11/2026).

| Candidate | Owns (verified) | Fit for a FAQ list |
|---|---|---|
| `legal` (`API/legal`, `legal.prisma`) | `legal_versions`: one versioned document set (privacy + terms), draft → published → superseded; its published `number` is the learner's accepted terms version through the `TermsVersion` port (`legal-terms.provider.ts:5-20`, `legal.service.ts:164-167`) | Same audience (public site text written by admin, `settings.manage`), same controller split. But its version number means "terms version" and drives re-consent (`terms_outdated`); a FAQ in the same module mixes an ordered list into a consent document set |
| `settings` (`API/settings`, `settings.prisma`) | One row `app_settings.key = 'global'` with every tunable value as JSON under one `version` (`settings.prisma:1-10`), plus `app_setting_changes` history (:12-23); values are numbers/enums/time strings with bounds (`settings.definitions.ts:90,115,200-279`); also serves `GET /v1/public/prices` | Poor: a list of rich text items does not fit the bounded-value model or its per-key history |
| `content` (`API/content`, `content.prisma`) | Vocabulary: `topics`, `topic_names`, `data_sources` (with `display_priority`), entries, senses, revisions, forms, context sentences, speech audio (models start at `content.prisma:1,10,21,39,…,203,218`); also the public `GET /v1/sources` (`API/content/sources/sources.controller.ts:44-52`) | Poor: vocabulary content, edited with `content.*` permissions by editors too |
| new module (e.g. `faq`, `faq.prisma`) | nothing yet | Copies Legal's files one to one; one module, one models file, no shared version semantics |

## 3. Admin app

### 3.1 `/legal` files

- Routes: `ADM/app/routes.tsx:27-28` imports, `:123-124` `<Route path="legal" element={<LegalPage />} />`, `<Route path="legal/:id" element={<LegalEditorPage />} />`.
- API client: `ADM/features/legal/legal-api.ts` — response types :3-35, React Query keys `legalKeys` :37-40, calls :42-57. Writes pass
  `{ idempotencyKey }` (create, save, publish); delete does not. `ApiClient` = `get/post/put/patch/delete/postForm` with optional
  `{ idempotencyKey }` (`ADM/api/client.ts:6-11,33-45`, sets the `Idempotency-Key` header).
- List page: `ADM/features/legal/LegalPage.tsx:25-88` — `useQuery` + `useMutation` (`crypto.randomUUID()` as the key, :38), `PageActions` slot for the button
  (:62-64), `Banner`, `DataList` with `columns`, `rowHref`, `state`, empty texts (:76-85). Shared UI: `ADM/ui/{Badge,Banner,Button,DataList,Toast}`.
- Editor: `ADM/features/legal/LegalEditorPage.tsx` (233 lines) — remounts on `key={id}:{row_version}` (:56), `useDirtyForm` (:75), `useFocusFirstError` with a
  violation→field map (:29-30,76), `Tabs`, `TextArea`, `TextField`, `ConfirmDialog` (:13-16).
- Markdown: `ADM/features/legal/MarkdownPreview.tsx:1-24` — `react-markdown` + `remark-gfm`, no raw HTML, headings shifted down one level. No Markdown editor
  component: the text is a plain `TextArea` beside the preview.
- No hooks file; queries and mutations live in the page components.

### 3.2 Nav entry and permission

`ADM/app/nav.ts:45` `{ group: 'system', path: '/legal', labelKey: 'nav.legal', needs: ['settings.manage'], available: true }`; the doc comment says
"27 items" (:18). Icon map `ADM/app/nav-icons.ts:59` (`'/legal': Scale`). The admin `Permission` type is its own copy (`ADM/auth/session-store.ts:5`);
the API's is `API/identity/identity.types.ts:4-6` (`settings.manage` is admin-only, :9-18).

Adding a nav item touches pinned counts: `ADM/app/nav.test.ts:36` (`MENU_ORDER`), `:41-48` (27 items, the full `available` list), `:54-74` (editor list,
`toHaveLength(27)` for admin, `/legal` hidden from editors); `apps/admin/e2e/shell.spec.ts:38,46` (`toHaveCount(27)`), `:154` (comment).

### 3.3 Tests

- Unit (Vitest + Testing Library): `ADM/features/legal/LegalPage.test.tsx` — `renderApp(path, handlers)` from `../staff/test-utils` with handlers keyed
  `'METHOD /path?query'` (:6,10); copy read from `messages/vi.json` (`const t = vi.legal`, :4,9); asserts the request body and
  `headers['Idempotency-Key']` (:53-55); queries by role and visible text.
- Mocked e2e (Playwright): legal has no dedicated spec, only `apps/admin/e2e/a11y.spec.ts:190-202` (mocks and the `/legal`, `/legal/:id` pages in the axe
  list) and `:289`. A list-plus-dialog spec to copy: `apps/admin/e2e/report-reasons.spec.ts:1-33` (`signedInAs(page, 'admin', handlers)`,
  `requests(page, 'PATCH', path)`, `seriousViolations(page)`); helpers in `apps/admin/e2e/support/mock-api.ts` (`problem` :25, `mockApi` :40,
  `PERMISSIONS` :81, `signedInAs` :101).
- New problem slugs must be added to `KNOWN_ERROR_SLUGS` (`ADM/api/problem.ts:44`, `legal-busy` at :85) with an `errors.<slug>` message;
  `ADM/api/problem.test.ts:104-109` shows the per-feature check.

### 3.4 Reorder precedent

None with drag or up/down. Report reasons store `position Int` (`apps/api/prisma/models/practice.prisma:173-191`, `position` :183), validated
`z.number().int().min(0).max(10_000)` (`API/practice/reports/report-reasons.service.ts:20`), sorted `position` then `code` (:33). Admin edits it as a number
field in `ADM/features/reports/ReasonDialog.tsx:26,43,106-107,207-214`; the list shows it as a column (`ReportReasonsPage.tsx:16,42`). Seed gives "other"
1000 so it stays last. Admin routes: `admin/practice/report-reasons` with class `settings.manage` and `GET` overridden to `content.edit`
(`API/practice/reports/admin-report-reasons.controller.ts:16-17,22-23`); `POST` idempotent (:28-32), `PATCH` not (:38-39).

### 3.5 i18n

Admin is bilingual: `apps/admin/messages/vi.json` and `en.json` (`legal-busy` :112, `nav.legal` :168 and the `legal` section :2764 in both files;
in `vi.json` `errors` opens at :2 and `nav` at :142), `use-intl` with default locale `vi` (`ADM/i18n/locale-context.tsx:9,29`), and `ADM/i18n/parity.test.ts:10-18` fails when a key exists in only
one file. So every FAQ string needs a `vi` and an `en` entry.

## 4. Web

- `WEB/lib/legal.ts`: type `PublicLegal` :5-10, shape guard :14-23, `fetchLegal()` :31-40 (`fetch(\`${serverApiBaseUrl()}/v1/legal/current\`, { cache: 'no-store',
  signal: AbortSignal.timeout(2500) })`, returns `null` on non-2xx, bad shape or network error), `getLegal = cache(fetchLegal)` :43, `pickLanguage` :46-48.
  Test style `WEB/lib/legal.test.ts:15-45`: `vi.stubGlobal('fetch', …)`, `vi.stubEnv`, asserts URL, `init.cache`, `AbortSignal`, and null on 404/500/throw/bad shape.
- `GET /v1/public/prices`: **not read anywhere in `apps/web`** on this ref (the only `serverApiBaseUrl` users are `lib/legal.ts` and `lib/sources.ts:1,21`).
- `WEB/app-shell/config.ts`: `apiBaseUrl()` :2-4 (`NEXT_PUBLIC_API_BASE_URL`, default `http://localhost:3000`), `serverApiBaseUrl()` :29-32
  (`API_INTERNAL_BASE_URL` first, run time), `assertApiBaseUrl(siteUrl, raw)` :38-52 (absolute http(s); on `https://wordmet.com` the host must start with `api.`).
- `apps/web/next.config.ts`: `const nextConfig: NextConfig = { … }` is a **plain object** (:25-41) exported as `withNextIntl(nextConfig)` (:47). Top-level code
  runs when the config loads: `assertApiBaseUrl` only when `LEARNER_APP_ENABLED` (:12; flag = `NEXT_PUBLIC_LEARNER_APP === 'on'`,
  `WEB/lib/learner-app-flag.ts:2`), `assertTurnstileSiteKey` (:15), `buildCsp` (:17-23), `initOpenNextCloudflareForDev()` (:45). It fetches nothing.
- Home page `WEB/app/[locale]/(site)/page.tsx:16-46`: `getLandingCopy()` / `getAppCopy()`, `<Faq copy={copy.faq} />` at :39; no `dynamic` export.
  `generateStaticParams` is in `WEB/app/[locale]/layout.tsx:24-26`.

## 5. Smoke scripts

- **No smoke covers legal**: `git grep -il legal apps/api/scripts` hits only `fixtures/learner-sample.csv`. The delivery record says the legal run was
  "23 kiểm tra" by hand (`docs/deliveries/legal-documents.md:58`); where those checks live is UNVERIFIED.
- `apps/api/scripts/smoke-giao-dien-moi.mjs` (410 lines; `smoke:giao-dien-moi`, `apps/api/package.json:43`): header :1-12 (how to start the API: fresh
  `english_learning_smoke_gm`, `TURNSTILE_MODE=fake`, `AI_FAKE_ENABLED=true`, `JOB_QUEUE_PREFIX=wordmet-gm-smoke`); helpers `step(name, body, { fatal })` :48,
  `api(method, path, { as, body, idem })` :84-102 (adds a fresh `Idempotency-Key` when `idem: true`, re-logs on 401, waits on 429), `want` :104-108,
  `wantProblem` :110-115, `psql` :122-124. Steps: wait for API :218; **1. `GET /v1/public/prices` without a token** :223-228 (exact body); Setup :231-261
  registers an admin, grants it with `dist/cli/admin-grant.js`, keeps `admin.token`; steps 2-12 learner flows; summary and exit code at the end.
- A FAQ step fits after Setup (needs `admin`): admin create → publish/order → `GET` the public route without a token, compare the exact list; a `psql`
  count can check rows. Step 1 shows the unauthenticated public-read shape.

## 6. Other facts a plan needs

- Permissions: `API/identity/identity.types.ts:4-6` (`'roles.manage' | 'content.edit' | 'content.publish' | 'content.import' | 'taxonomy.manage' |
  'settings.manage' | 'entitlements.grant' | 'users.read' | 'ai.view'`), roles :9-18. `settings.manage` = admin only; `content.edit` includes editors.
- A new rate-limit rule needs three edits: the `RateLimitRuleName` union (`API/common/config/app-config.ts:6-27`), `DEFAULT_LIMITS` (:161-191; `user.write`
  30/min per user at :175, `public.prices.ip` 60/min per IP at :189-190), and the full-table pin in `API/common/config/app-config.spec.ts:274-296`.
  Limits are not env-overridable: `limits: structuredClone(DEFAULT_LIMITS)` (`app-config.ts:516`).
- CORS: `API/app.setup.ts:48-53` (`config.corsOrigins`, credentials, allowed headers include `Idempotency-Key`). A build-time read runs on the build machine
  server-side, so CORS does not apply to it; admin writes already go through the admin origin.
- Account deletion map: add every `*_by` column of a new table to `API/identity/deletion/account-data-map.ts` (staff audit → `keep-id`, as :29-32).
- Seed: by `INSERT` in the migration (§1.2). Seeding the four current questions from `apps/web/messages/vi.json:236` would keep the home page unchanged after
  the switch; whether to do so is a decision.
- Markdown on the web: `react-markdown` 10.1.0 and `remark-gfm` 4.0.1 are already in both apps (`docs/deliveries/legal-documents.md:35-36`); today's FAQ
  answers are plain text in a `<p>` (`Faq.tsx:27`).

## UNVERIFIED

- Whether a `fetch` without `cache: 'no-store'` in the home page (or a module it imports) keeps `/vi` prerendered in Next 16.4 (no `cacheComponents` flag in
  `next.config.ts`). Check with the Next docs (context7) or a real `cf:build` + `assert:render-mode` before choosing the mechanism.
- Whether OpenNext on Cloudflare serves `/vi` from build output or re-renders it per request (sibling file m8-site §UNVERIFIED 3). If it re-renders, a
  "build-time" FAQ read runs at request time against the baked API URL.
- Where the 23 manual legal checks of `docs/deliveries/legal-documents.md:58` are kept (no script found).
- How `RateLimitGuard` resolves `request.ip` behind Cloudflare for a build runner (only `trust proxy` = `config.trustProxy` was seen, `API/app.setup.ts:47`).
