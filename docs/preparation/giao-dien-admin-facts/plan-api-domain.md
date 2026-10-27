# Plan facts: API domain changes for giao-dien-admin (M3, M4, M5) — 27/10/2026

Source: `origin/dev` at `5a60dce` (Merge PR #142), read with `git show` / `git grep` only. Every `path:line` is from the repo root
(`apps/api/...` unless noted). Extends `users-reports-grants-settings.md` and `content.md` (not repeated here). Nothing was run.
Unit test command for any spec below: `pnpm --filter api exec vitest run <path relative to apps/api>` (script `"test": "vitest run"`,
`apps/api/package.json:20`), e.g. `pnpm --filter api exec vitest run src/practice/reports/reports.service.spec.ts`.

## 1. Practice reports (`src/practice/reports/`)

**Service** `reports.service.ts`

| Symbol | Line | Fact |
|---|---|---|
| `ReportRow` | :20 | `type ReportRow = Prisma.PracticeReportGetPayload<object>;` (no relations) |
| `staffView(row: ReportRow)` | :46-56 | returns `id, sense_id, reason, reason_label, note, status, question_snapshot, created_at, resolved_at, resolved_by, resolved_by_role, question_source, ai_operation_id, call_operation_id, model, prompt_revision, ai_charged, refunded` (last 3 from `aiMeta` JSON). No `user_id` by design ("never the reporter", :45) |
| `RefundRow` / `refundView` | :58-63 | `Pick<ReportRow,'id'|'userId'|'resolvedBy'|'resolvedByRole'|'refunded'|'resolvedAt'>` → `report_id, user_id, resolved_by, resolved_by_role, self_resolved, refunded, resolved_at` |
| constructor | :73-81 | `(prisma, clock, settings: SettingsService, reasons: ReportReasonsService, identity: IdentityService, entitlements: EntitlementsService, logger)` — **IdentityService is injected** (used only by `resolve` :210) |
| `list(query: { status?: ReportStatus; reason?: string; source?: 'rule' \| 'ai'; pageSize: number; pageToken?: string })` | :168-195 | `findMany` with `where/orderBy[{createdAt:'desc'},{id:'asc'}]/take` — **no `include`, so no `reasonRef`** (:179-187). Binding: `sha256(JSON.stringify({ route: 'practice-reports', filters: { status, reason, source } }))` (:169-170, nulls for absent). Cursor `{ created_at, id }` (:192-193) |
| `resolve(actorId, reportId, status: ResolveStatus)` | :202-226 | reads `findUnique({ where:{id}, include: { reasonRef: true } })` (:203); role from `identity.getProfile(actorId)?.staff_role` (:210); `refundDecision(..., report.reasonRef)` (:211-213); conditional `updateMany` (:214-221); refund after write (:222); **re-reads without include** (:223) → `staffView(row)` (:225) |
| `listRefunds(query: { resolvedBy?: string; from?: Date; to?: Date; pageSize; pageToken? })` | :239-267 | `select` of the 6 `RefundRow` fields (:258); binding `{ route: 'practice-refunds', filters: { resolvedBy, from(ISO), to(ISO) } }` (:240-241); cursor `{ resolved_at, id }` (:265) |

To add `refundable` to list rows: add `include: { reasonRef: { select: { refundable: true } } }` at :179 and :223 (or a second
`findMany` on reasons). `refundDecision` (`refunds.ts:14-18`) reads `reason.refundable` only.

**Controller** `admin-reports.controller.ts` — `@Controller('admin/practice')` + class `@RequirePermission('content.edit')` (:29-30).
- `params = z.strictObject({ id: z.uuid().transform((value) => value.toLowerCase()) })` (:12) — reuse for `GET reports/:id`.
- `listQuery` (:14-19) verbatim:
  ```ts
  const listQuery = z.strictObject({
    status: z.enum(['open', 'no_error', 'fixed', 'confirmed']).optional(),
    reason: z.string().regex(REASON_CODE_PATTERN).optional(),
    source: z.enum(['rule', 'ai']).optional(),
    ...page,
  });
  ```
- `refundsQuery` (:21-26) verbatim:
  ```ts
  const refundsQuery = z.strictObject({
    resolved_by: z.uuid().transform((value) => value.toLowerCase()).optional(),
    from: z.iso.datetime({ offset: true }).transform((value) => new Date(value)).optional(),
    to: z.iso.datetime({ offset: true }).transform((value) => new Date(value)).optional(),
    ...page,
  });
  ```
- Routes: `GET reports` (:34-39), `POST reports/:id/resolve` (Idempotent + IdempotencyInterceptor + `user.write`, :41-51),
  `GET refunds` with method `@RequirePermission('settings.manage')` (:53-59). New `@Get('reports/:id')` inherits `content.edit`
  from the class; no route clash with `reports/:id/resolve` (different method). Service needs a new `get(id)` (404 `not-found`, `notFound` :24).
- The refunds email filter can follow `TransactionsService.forAdmin` (`entitlements/transactions/transactions.service.ts:51-71`):
  put the email in the binding, `findUserIdByEmail` → `null` ⇒ `{ items: [], next_page_token: null }`, then `emailsOf(ids)` once.

**Prisma** `apps/api/prisma/models/practice.prisma`: `model PracticeReport` :104-132 (`resolvedBy String? @db.Uuid` :116,
`resolvedAt DateTime? @db.Timestamptz` :117, `userId` :106, `aiMeta Json?` :122); relation **`reasonRef PracticeReportReason
@relation(fields: [reason], references: [code], onDelete: Restrict)`** :128. `model PracticeReportReason` :156-174 (`refundable Boolean`
:164, `position Int` :166, `updatedBy String? @db.Uuid` :169, back-relation `reports` :171).

**Specs**
- `reports.service.spec.ts` — `make(question)` (:50-77) for `create`/`listMine`; `build(stored)` (:214-235) for `resolve`; `listRefunds`
  builds inline (:317-340). **`list` has no test of its own**; only page-token rejection (:189-199). Excerpt (:228-234):
  ```ts
  const ledger = { refund: vi.fn(options.refund ?? (async () => ({ refunded: true }))) };
  const identity = { getProfile: vi.fn(async () => ({ staff_role: options.role ?? 'editor' })) };
  const logger = { warn: vi.fn() };
  const service = new ReportsService(prisma as unknown as PrismaClient, { now: () => NOW } as Clock, {} as SettingsService,
    {} as ReportReasonsService, identity as unknown as IdentityService, ledger as unknown as EntitlementsService,
    logger as unknown as AppLogger);
  ```
  `stored()` (:208-213) already carries `reasonRef: { refundable: true }`; the `findUnique` fake returns it for both reads, so a test of
  `refundable` in the resolve response needs the fake to honour `include`. `resolve` tests also need `identity.emailsOf` once views add emails.
- `admin-reports.controller.spec.ts` — Nest test app with mocked service (`createTestApp`, `vi.spyOn(reports,'list'|'resolve'|'listRefunds')`,
  :23-38). Route/permission table (:41-47), update when adding `GET /v1/admin/practice/reports/:id`:
  ```ts
  expect(listRoutes(ctx.app).filter(({ path }) => /^\/v1\/admin\/practice\/(reports|refunds)/.test(path))).toEqual([
    { method: 'GET', path: '/v1/admin/practice/refunds', permissions: ['settings.manage'] },
    { method: 'GET', path: '/v1/admin/practice/reports', permissions: ['content.edit'] },
    { method: 'POST', path: '/v1/admin/practice/reports/:id/resolve', permissions: ['content.edit'] },
  ]);
  ```
  Exact `toHaveBeenCalledWith` on `listRefunds` (:68-70) must change when `resolved_by_email` is added.

## 2. Report reasons (`report-reasons.service.ts`, `admin-report-reasons.controller.ts`)

- `adminList()` (:63-65): `Promise<{ items: ReturnType<typeof adminView>[] }>`, sorted `byPosition` (:31). `adminView` (:43-47) ends with
  `updated_at: row.updatedAt.toISOString(), updated_by: row.updatedBy`. `create`/`update` (:67-100) also return `adminView`.
- Constructor `(prisma, clock)` only (:54-57) — **no IdentityService**; adding `updated_by_user` needs a 3rd param. Constructed directly in
  `report-reasons.service.spec.ts:67` and `reports.service.spec.ts:74` (`new ReportReasonsService(prisma as never, clock)`).
- Controller: `@Controller('admin/practice/report-reasons')` + class `@RequirePermission('settings.manage')` (:16-17); `@Get() list()` (:21-24) —
  add method-level `@RequirePermission('content.edit')` there (guard uses `getAllAndOverride([handler, class])`, `identity/staff/permission.guard.ts:22-24`).
- `report-reasons.controller.spec.ts:52-59` checks metadata via `listRoutes`:
  ```ts
  expect(listRoutes(ctx.app).filter(({ path }) => path.includes('report-reasons'))).toEqual([
    { method: 'GET', path: '/v1/admin/practice/report-reasons', permissions: ['settings.manage'] },
    { method: 'POST', path: '/v1/admin/practice/report-reasons', permissions: ['settings.manage'] },
    { method: 'PATCH', path: '/v1/admin/practice/report-reasons/:code', permissions: ['settings.manage'] },
    { method: 'GET', path: '/v1/practice/report-reasons', permissions: null },
  ]);
  ```
  Service spec `adminList` exact view: `report-reasons.service.spec.ts:73-82` (`toEqual` with `updated_by: null`) — will need `updated_by_user`.

## 3. Snapshot (`snapshot.ts`)

- `buildSnapshot(question: SnapshotQuestion, item: SnapshotItem)` (:13-44); types (:4-5):
  `SnapshotItem = { answer_raw: string | null; answers_tried: string[]; result: string | null; hint_level: number }`.
- For `mcq` / `meaning_in_sentence` / `mcq_sentence` (:18-26): options masked, `correct.option_index = key.correct_index`, and
  `learner.answer = options[Number(item.answer_raw)]` — "answer_raw is the chosen index" (:25). Return `learner: { answer, answers_tried, result, hint_level }` (:42).
  So `learner.option_index` = `item.answer_raw === null ? null : Number(item.answer_raw)` inside that branch only.
- `answer_raw` comes from `practiceSessionItem.answerRaw` (`reports.service.ts:123`), written by `practice/answers/answers.service.ts:86`
  (answer), `:105` (skip → null), `:111`.
- Spec `snapshot.spec.ts`, pure calls; excerpt (:26-34):
  ```ts
  const snapshot = buildSnapshot({ type: 'mcq_definition', prompt: mcqPrompt, answerKey: mcqKey, hints: noHints }, answered('1'));
  expect(snapshot).toEqual({
    type: 'mcq_definition',
    prompt: { ...mcqPrompt, options: ['release', PRIVATE_WORD_MASK, 'deploy', 'merge'] },
    correct: { lemma: 'deploy', meaning: 'triển khai', definition_en: 'to put software into use', option_index: 2 },
    hints_shown: { level1: null, level2: null, level3: null },
    learner: { answer: PRIVATE_WORD_MASK, answers_tried: [], result: 'wrong', hint_level: 0 },
  });
  ```
  Uses `toEqual`: every mcq-kind expectation changes when `option_index` is added.

## 4. Grants (`src/entitlements/grants/`)

- `GrantChangeView` (`grants.service.ts:25-28`) and `GrantView` (:30-35) verbatim:
  ```ts
  export type GrantView = {
    id: string; user_id: string; kind: 'plan' | 'limits'; plan: 'pro' | null; limits: Partial<Record<LimitKey, number>> | null;
    starts_at: string; ends_at: string; reason: string; granted_by: string; granted_by_role: string; revoked_at: string | null;
    revoked_by: string | null; revoke_reason: string | null; paid_renewal_action: string | null; created_at: string;
    changes?: GrantChangeView[];
  };
  ```
- `export function grantView(row: GrantRow, changes?: ChangeRow[]): GrantView` (:51-60, exported); `changeView(row)` (:62-69, private).
  Both are pure: adding `status` needs `now` + sibling info, adding emails needs an id→email map, so they need extra params.
- Constructor (:89-97): `(prisma, clock, identity: IdentityService, settings, sources, registry, logger)`.
- `create(actorId, body): Promise<GrantView>` (:99-145): `now = this.clock.now()` (:100). Replaced rows: `updateMany(... data: { revokedAt: now,
  revokedBy: actorId, revokeReason: 'replaced' })` (:126-129) only when `kind === 'plan' && startsAt <= now` (:124); new row
  `createdAt: now`, `grantedBy: actorId` (:131-137) in the same `$transaction`. **Confirmed: same `now` for both.**
  Columns: `revokedAt DateTime? @db.Timestamptz` and `createdAt DateTime @default(now()) @db.Timestamptz` (`prisma/models/entitlements.prisma:18,24`);
  DDL `"revoked_at" TIMESTAMPTZ`, `"created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
  (`prisma/migrations/20261019094400_entitlements/migration.sql:13,17`) → no explicit precision = Postgres default (6). Both store the same
  JS millisecond `Date`, so they compare equal. Only other writer of `revokedAt` is `revoke` (:160-162, free-text `reason`).
- `revoke(actorId, grantId, reason)` (:147-167, returns current row unchanged if already revoked :153); `update(actorId, grantId, body)`
  (:169-199, returns `grantView(row, changes)` with all changes).
- `list(query: ListGrantsQuery)` (:202-239): binding `sha256({ route: 'entitlement-grants', user_id, granted_by, active, expiring_within_days })`
  (:204-207); cursor zod `{ created_at: z.iso.datetime(), id }` (:49); where `userId` / `grantedBy` / `AND[...]` (:215-228); order
  `[{createdAt:'desc'},{id:'desc'}]` (:230); items `grantView(row)` **without changes** (:235).
- `forUser(userId): Promise<GrantView[]>` (:242-248): ≤100, `include: { changes: { orderBy: [...] } }`.
- `roleOf(actorId)` (:250-254): `getProfile(actorId)?.staff_role`, not admin/editor → 403 `forbidden`.
  `context(actorId, grantId)` (:257-263) → `{ grant, actorRole, targetRole }` (target role read now, B5E38).
- `listGrantsQuery` (`grants.schemas.ts:41-48`) verbatim:
  ```ts
  export const listGrantsQuery = z.strictObject({
    user_id: uuid.optional(),
    granted_by: uuid.optional(),
    active: z.enum(['true', 'false']).optional(),
    expiring_within_days: z.coerce.number().int().min(1).max(365).optional(),
    page_size: z.coerce.number().int().min(1).max(100).default(20),
    page_token: z.string().optional(),
  });
  ```
- `AdminGrantsController` `@Controller('admin/entitlements/grants')` + class `entitlements.grant` (`admin-grants.controller.ts:12-13`): POST
  (Idempotent, `user.write`, :17-24), `POST :id/revoke` (:26-34), `PATCH :id` (:36-43), `GET` list passes the whole query (:45-48).
- `GET admin/entitlements/users/:user_id` (`api/admin-entitlements.controller.ts:19-25`, method `entitlements.grant`): returns
  `{ ...await entitlements.snapshot(id), grants: await grants.forUser(id) }`, 404 when `snapshot` is null (`entitlements.service.ts:119-178`:
  `plan, sources, pools, features, ai_available, ads, trial_eligible`).
- Spec `grants.service.spec.ts`: hand-written in-memory Prisma with a `matches(row, where)` evaluator (:42-57), `setup()` (:66-179);
  `identity` fake has **only `getProfile`** (:162). Excerpt (:162-177):
  ```ts
  const identity = { getProfile: vi.fn(async (id: string) => (guard('IdentityService.getProfile'), profiles.get(id) ?? null)) };
  const settings = { get: vi.fn(async () => (guard('SettingsService.get'), SETTINGS_DEFAULTS)) };
  ...
  const clock = new FakeClock(NOW);
  const service = new GrantsService(
    prisma as never, clock, identity as never, settings as never, sources as never, registry as never, logger,
  );
  ```
  `guard` throws if called while `lockUser` is held (:78-80, test :517) — email lookups must run outside the transaction.
  Replaced case: B5E78 (:284-289). List tests (:484-514). `findMany` fake ignores `include`.
- `admin-grants.controller.spec.ts` (mocked service, :29-46); `entitlements-api.controller.spec.ts:111-115` lists routes with
  `toContainEqual` (adding a route does not break it).

## 5. Where `GET /v1/admin/entitlements/lookup?email=` lives; Identity helpers

- `AdminEntitlementsController` `@Controller('admin/entitlements')` has **no class permission**; each method sets its own:
  `users/:user_id` → `entitlements.grant` (:20), `ai-usage` → `settings.manage` (:28). A `@Get('lookup')` there with
  `@RequirePermission('entitlements.grant')` gives `/v1/admin/entitlements/lookup`. It already injects `EntitlementsService` and `GrantsService` (:14-17);
  putting the logic in `GrantsService` reuses `roleOf` + `grantRefusal`. (`AdminGrantsController` would make it `/grants/lookup`.)
- `grantRefusal(input: GrantRefusalInput): GrantRefusalReason | null` (`grant-rules.ts:23-30`): admin → null; then `self-grant`,
  `target-is-admin`, `target-is-staff`, `ai-limits-admin-only` (pass `touchesAiLimits: false` for lookup).
- `IdentityService` (`identity/profile/identity.service.ts`): `getProfile(userId, db = prisma): Promise<Profile | null>` (:70-73);
  `Profile` (:16-28) has `id, email, email_verified, native_language, timezone, staff_role: StaffRole | null, permissions,
  must_change_password, given_name, family_name, birth_date`. `emailsOf(userIds: string[]): Promise<Map<string, string>>` (:107-113, no status
  filter, unknown ids absent, empty input → no query). `findUserIdByEmail(email): Promise<string | null>` (:116-121, `normalizeEmail` = trim +
  lowercase, `common/email/normalize-email.ts:1-8`; exact unique match, any status).
- Rate-limit rule: add to `RateLimitRuleName` union (`common/config/app-config.ts:6-22`) and `DEFAULT_LIMITS` (:107-128, e.g.
  `{ by: 'user', max: 60, windowSeconds: 3600 }`). `app-config.spec.ts:173-190` asserts the full map with `toEqual` → must be updated.

## 6. Content senses list (`src/content/catalog/admin-catalog.queries.ts`)

- `senseView(sense: SenseRow)` (:138-147): `senseSummary` + `entry_id, lemma, pos, displayed_level, conflict, function_word, content`.
- `selectedSense(row, query: Pick<SenseFilter,'level'|'topic'|'status'>)` (:149-162): computes `publishViolations` **only** when
  `status === 'unpublishable'` (:156-158); for every other status returns `{ ...view, missing: [] }` (:161).
- `listSenses(query)` (:235-251): strips it — `const { missing, ...view } = selected; return query.status === 'unpublishable' ? { ...view, missing } : view;` (:247-249).
- `publishViolations(revision: { texts: readonly {language; kind; text}[]; examples: readonly string[] }, hasLevel: boolean): PublishViolation[]`
  (`content/senses/publish.service.ts:26-37`) → `gloss-missing`, `example-missing`, `level-missing`.
- Other callers of `selectedSense`: `snapshotPublishable` (:290, status `open_draft`) and `exportSenses` (:341, `_missing` only for unpublishable :355);
  10.3 must not change them. A sense with no revision has `revisions[0]` undefined (:150) — `missing` needs a rule for it.
- `getSense` (:391-) already returns `{ id, email }` via `identity.emailsOf` (:395).
- Spec `admin-catalog.queries.spec.ts` covers only PX4 and `getSense`; **no test of `listSenses`**. Excerpt (:9-20):
  ```ts
  function setup() {
    const tx = { sense: { findMany: vi.fn(async () => []) } };
    const prisma = {
      $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
      sense: { findMany: vi.fn(async () => []) },
    };
    const batchScope = { entryIdsOf: vi.fn(async () => ['e1']), senseIdsOf: vi.fn(async () => ['s1']) };
    const queries = new AdminCatalogQueries(prisma as unknown as PrismaClient, {} as IdentityService, batchScope as BatchScope);
    return { queries, tx, prisma, batchScope };
  }
  ```
  Row shape for a fake sense: `:46-52`.

## 7. `POST /v1/admin/users` (staff create)

- `staff.controller.ts:36-44`: class `@Controller('admin')` + `roles.manage` (admin only, :11-12); **`@RateLimit('user.write')`** (:37), not `auth.register.ip`.
- Body `createAccountSchema` (`staff.schemas.ts:30-38`): `email, staff_role: z.enum(['admin','editor']), password?, must_change_password: boolean,
  timezone, given_name?, family_name?`. **No learner (non-staff) creation.**
- `StaffService.createAccount` (`staff.service.ts:96-133`): `emailVerifiedAt: now`, `mustChangePassword: body.must_change_password` (:114-118);
  `MailBudget.assertAvailable()` first (:105); mails the password after the response (:128-129).
- Clearing `mustChangePassword`: `POST /v1/auth/password/change` (`auth/password.controller.ts:20-28`, `user.write`) → `password.service.ts:71`.
  Or create with `must_change_password: false` (smoke does, `scripts/smoke-buoc-7.mjs:372-373`). The API does not block other calls while it is true.
- A learner without registration: create an editor, then `PUT /v1/admin/users/:id/staff-role` `{ staff_role: null }` (`staff.controller.ts:46-54`,
  `staff.service.ts:249-264`; allowed since the account is verified and active).
- `auth.register.ip` = `{ by: 'ip', max: 5, windowSeconds: 3600 }` (`app-config.ts:109`), used only by `POST /v1/auth/register`
  (`identity/auth/auth.controller.ts:22`, with `mail.ip.daily`).

## 8. Admin real-stack e2e (`apps/admin/e2e-real/`)

- `support/api.ts`: `API` (:5), `API_DIR` (:7), private `post(pathname, body, token?)` (:9-15, adds `X-CSRF-Protection: 1`), `expectStatus` (:17-20),
  `waitForHealth(timeoutMs = 60_000): Promise<void>` (:22-33), `registerVerified(email, password): Promise<void>` (:36-42: register body with
  `given_name, birth_date '2000-01-01', accept_terms: true, client 'web'`, OTP from Mailpit via `otpCodeFor(email, before + 1)`, then
  `/v1/auth/verify-email`), `grantAdmin(email): void` (:45-47, `node dist/cli/admin-grant.js` in `API_DIR`), `loginToken(email, password): Promise<string>`
  (:49-52), `changePasswordViaApi(token, current, next)` (:55-57). No helper for GET/PUT/PATCH or Idempotency-Key yet.
- `support/mailpit.ts` exports `MAILPIT` (:1), `mailsTo` (:5), `waitForMail` (:12), `otpCodeFor` (:24), `passwordFromMail` (:39).
- `global-setup.ts`: `STATE_FILE` (:6); `RealState = { run: string; admin: { email; password }; learner: { email; password } }` (:8-12); registers
  admin (+ CLI grant) and learner = 2 registrations per run (:30-32); `E2E_REUSE_STATE` skip (:22). The learner has **no `native_language`**.
- `admin.real.spec.ts` (serial, :12), 8 tests: B25#23+B25#27+flow 1 (:55); B25#9+B25#2+flow 2 (:93); B25#12+B25#14+flow 3 (CSV upload, publish,
  **revert**) (:112); B25#4 (:155); RKC3 (:162); B25#6 (:182); B25#6a (:194); B25#8+B25E1+flow 4 (:206). Script `pnpm test:e2e:real` =
  `playwright test -c playwright.real.config.ts` (`apps/admin/package.json:15`).
- CI job `admin-e2e-real` (`.github/workflows/ci.yml:162-272`): services postgres:17 (5434), redis 7.4 (6380), mailpit (1025/8025); env block
  (:205-235): `DATABASE_URL, REDIS_URL, JWT_*, OTP_HMAC_KEY, RATE_LIMIT_HMAC_KEY, REFRESH_GRACE_KEY, MAIL_BUDGET_KEY, MAIL_DAILY_BUDGET=1500, SMTP_*,
  CORS_ORIGINS, ADMIN_APP_URL, LEARNER_APP_URL, TERMS_VERSION, PROBLEM_TYPE_BASE, TRUST_PROXY=false, MAINTENANCE_ENABLED=false,
  JOB_QUEUE_PREFIX=ci-admin-e2e, IMPORT_*`. **No `AI_FAKE_ENABLED`** (defaults `false`, `app-config.ts:222`) and no `BILLING_FAKE_*`.
  Starts `dist/main.js` and `dist/worker.js` (:242-243).

## 9. Learner flow that yields an AI-question report (API)

Preconditions: API with `AI_FAKE_ENABLED=true`, no OpenAI/Anthropic key; published catalog words with gloss, definition, example, level.
`ai_enabled` defaults `true`, `ai_daily_cap` 1000, Pro AI practice 300 per cycle (`settings/settings.definitions.ts:55,57`).

| # | Call | Body / headers | Ref |
|---|---|---|---|
| 1 | `POST /v1/admin/ai/models` (admin) | `{ provider: 'fake', model_id: 'fake:ok' }` → 201 | `ai/api/admin-ai-models.controller.ts:16,26`; smoke :329 |
| 2 | `GET /v1/admin/ai/operations`, then `PUT /v1/admin/ai/operations/generate_cloze` | `{ expected_version, model_ref, effort: null, thinking: null, max_output_tokens: null }` | `admin-ai-operations.controller.ts:12,22`; smoke :335-340 |
| 3 | Content: `POST /v1/admin/content/sources`, `POST /v1/admin/content/uploads` (multipart, Idempotency-Key, 202), poll batch, `POST /v1/admin/content/senses/publish-jobs` `{ filter: { batch_id } }` (Idempotency-Key, 202), poll | CSV `headword,pos,CEFR,gloss_vi,definition_en,example_en_1,topics,inflections` | smoke :401-425 |
| 4 | Learner `PATCH /v1/me` `{ native_language: 'vi' }` | without it every learner route is 403 `profile-incomplete` | `content/learner/learner-content.guard.ts:20-21`; smoke :205 |
| 5 | Admin `POST /v1/admin/entitlements/grants` `{ user_id, kind: 'plan', plan: 'pro', ends_at, reason }` + Idempotency-Key | Pro ⇒ `features['ai.practice'].allowed` | `admin-grants.controller.ts:17-24`; smoke :432-436 |
| 6 | `POST /v1/groups` `{ name }` + Idempotency-Key (201); `POST /v1/groups/:id/items/bulk` `{ topic, level }` or `POST /v1/groups/:id/items` `{ sense_id }` + Idempotency-Key | | `learning/groups/groups.controller.ts:24-27`; `learning/items/items.controller.ts:18-40`, `items.schemas.ts:9-14`; smoke :451-454 |
| 7 | `POST /v1/practice/sessions` `{ source: 'group', group_id, types: ['cloze'], count: 1 }` + Idempotency-Key (201) | `cloze_source` defaults to `'ai'` | `practice/sessions/sessions.controller.ts:15-29,40-46`, `sessions.service.ts:103`; smoke :729 |
| 8 | `POST /v1/practice/sessions/:id/next` (no key) → `item.type 'cloze'`, sentence `'Lan will ___ it tomorrow.'` | generated in-request; `prepare` (`:65-70`, no key) optional | `sessions.controller.ts:53-62`; smoke :25-26,730 |
| 9 | `POST /v1/practice/items/:id/answer` `{ text }` + Idempotency-Key | | `practice/answers/answers.controller.ts:13-17,25-36` |
| 10 | `POST /v1/practice/items/:id/report` `{ reason: 'ai_more_than_one_answer', note? }` → 201, **no Idempotency-Key** (unique item_id) | | `practice/reports/reports.controller.ts:10-38`; smoke :784 |

The session gate (`practice/ai/ai-session-planner.service.ts:40-49`): `snapshot.features['ai.practice'].allowed` else 403 `plan-required`; `ai_available.enabled`
and not `cap_reached`; `ai.isReady('generate_cloze')` (operation map :15), else unavailable. `plan()` then checks `pools.ai_practice.remaining` (:87-93).
Smoke steps in order: accounts (:365-379), AI setup (:381-398), content (:400-428), grants (:430-447), groups (:449-464), AC7 AI cloze (:728-746), AC8 report →
staff list → resolve → refunds (:772-805). Smoke registers 4 accounts (`auth.register.ip` 5/h); the editor is created by `POST /v1/admin/users` (:372-373).

## Surprises

1. Staff `list` has no `reasonRef` include and `resolve` re-reads without it (`reports.service.ts:179-187,223`): `refundable` needs the include in both.
2. No unit test exists for `ReportsService.list` (only token rejection, spec :189-199) or `AdminCatalogQueries.listSenses`: tests and fakes must be written from scratch.
3. `replaced` (10.4) needs a second query for sibling grants: the replacing grant can be on another page or filtered out (`granted_by`, `active=false`), so it cannot come from the page rows.
   Timestamps match (same `now`, both TIMESTAMPTZ(6)).
4. `ReportReasonsService` has no `IdentityService` (`report-reasons.service.ts:54-57`); two specs construct it with 2 args.
5. CI `admin-e2e-real` lacks `AI_FAKE_ENABLED=true` (`ci.yml:205-235`). The state learner has no `native_language`. Flow 3 reverts its CSV batch, so an AI-report e2e needs its own published words.
6. `POST /v1/admin/users` cannot make a learner (`staff.schemas.ts:32`); create editor + set `staff_role: null` is the Mailpit-free way, costing `user.write` and a mail.
7. Adding `entitlements.lookup` breaks `app-config.spec.ts:173-190` (exact `toEqual` on all limits) unless updated.
8. The existing content actor objects (`getSense`, `admin-catalog.queries.ts:395`) are `{ id, email }` without `system`; design §5.1 says every actor object has `system`.
