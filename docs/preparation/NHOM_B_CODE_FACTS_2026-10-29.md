# Nhóm B (chất lượng AI) — code facts cho design (apps/api, apps/admin @ 3016b1b, 2026-10-29)

> Khảo sát read-only cho design "nhóm B — chất lượng AI" (golden set, rule check trong eval, LLM judge, nhãn người, trần chi phí USD
> riêng cho admin, config có version draft → eval → publish → rollback, judge 7 ngày câu thật, "thêm vào bộ ví dụ", dashboard, retention).
> Nguồn: working tree nhánh `fix/web-next-16-4` @ **3016b1bea1df143a4f496c97d477678e9afaaede** (`apps/api`, `apps/admin` giống `dev` @ aacd0f4 +
> merge #182; chỉ `apps/web` khác). Không build, không chạy gì. Đường dẫn tương đối với `apps/api/` trừ khi bắt đầu bằng `apps/admin/` hoặc
> `docs/`. `file:line` là ở commit trên. Chỉ ghi fact; chỗ không kiểm được ghi `ASSUMPTION`.

## 0. Fact làm thay đổi design (đọc trước)

| # | Fact | Ở đâu |
|---|---|---|
| F1 | **Đúng giả định 1:** cap "số lần gọi provider mỗi ngày" (`ai.daily_provider_calls_cap`, mặc định 3000) đếm **mọi** `ai_calls` từ 00:00 giờ VN, mọi purpose và outcome — gồm `test`, `eval`; nhưng chỉ chặn purpose `learner`. Test/eval chỉ cần model + provider. | `src/ai/runner/call-ledger.service.ts:44-48`; `src/ai/runner/readiness.service.ts:14-15, 26-39`; `src/ai/runner/runner.service.ts:179-201` |
| F2 | Có **hai** trần ngày khác nhau, dễ nhầm: (a) `ai.daily_provider_calls_cap` = số lần gọi provider (readiness, ở trên); (b) `entitlements.ai_daily_cap` = số **lượt AI** của người học (`ai_practice` + `ai_lookup`, confirmed + reserved, mặc định 1000) ở usage ledger. `days_at_cap` của dashboard dùng (b). **Không có trần USD nào.** | `src/settings/settings.definitions.ts:30, 42-47, 61, 66`; `src/entitlements/usage/usage-ledger.service.ts:68`; `src/entitlements/entitlements.service.ts:199-213` |
| F3 | **Đúng giả định 2:** lưu prompt là live ngay: `PUT` sửa dòng `ai_prompts` (bản đang dùng) và thêm `ai_prompt_revisions` trong một transaction; learner path đọc `ai_prompts` mỗi lần gọi, không cache. Model/effort/tokens cũng vậy (`ai_operation_settings` đọc mỗi lần gọi). Prompt và model là **hai thứ version độc lập** (prompt có số `revision`; setting có `version` counter + bảng thay đổi old/new JSON), không có khái niệm "config" gộp. | `src/ai/prompts/prompts.service.ts:104-128`; `src/ai/prompts/prompts.repository.ts:14-17`; `src/ai/runner/runner.service.ts:129, 137`; `src/ai/runner/selection.ts:61-65`; `src/ai/models/operation-settings.service.ts:92-105` |
| F4 | **Đúng giả định 3:** `AiEvalExample` chỉ có `operation`, `input` (Json), `note` + audit (`created_by/at`, `updated_at`). Không có tiêu chí kỳ vọng, không split, không version bộ ví dụ, không link nguồn (report, call). | `prisma/models/ai.prisma:168-179` |
| F5 | Eval chỉ chạy **check hình dạng của gateway** (`checkOutput`: JSON, đúng key, đếm blank, độ dài, rỗng…). **Rule của Practice** (`checkCloze`/`checkMeaning`/`checkMcq`: dạng từ hợp lệ, lộ từ, distractor nằm trong candidates) cần `PracticeSense` (lemma, variants, accepted, inflections, extra_forms) lấy từ Content, nằm trong module Practice; `ai` không được import Content (R17). Input của eval example không có `sense_id` → hiện không thể chạy rule Practice trên eval. Eval cũng không làm lượt `#2`. | `src/ai/operations/define-operation.ts:45-58`; `src/ai/runner/runner.service.ts:223`; `src/practice/ai/ai-checks.ts:11-14, 29-57`; `src/ai/ai.constants.ts:60` |
| F6 | Một eval run lưu **ids** ví dụ lúc tạo, nhưng đọc **input** của ví dụ lúc job chạy; item kết quả chỉ giữ `example_id`, không giữ input. Sửa/xóa ví dụ sau đó làm run cũ mất dấu input (xóa trước khi chạy → item `skipped`). Giá dùng để tính tiền là giá **hiện tại** của model lúc job chạy (không lưu trên run). | `src/ai/eval/eval-runs.service.ts:84-96`; `src/ai/eval/eval-job.ts:72, 79-87, 107-117`; `src/ai/eval/eval-runs.repository.ts:8-16` |
| F7 | Câu AI thật **có ghi** prompt revision và model: `practice_questions.ai_meta` = `AiResult.meta` (`operation, provider, model, effort, prompt_revision, schema_version, replayed`) + `call_operation_id`. Không có cột riêng, không có `ai_calls.id`; nối sang `ai_calls` qua `operation_id` (= `practice_ai_requests.id` hoặc `<id>#2`). | `src/practice/ai/ai-question-generator.service.ts:137-140`; `src/practice/ai/ai-requests.repository.ts:74`; `src/ai/ai.types.ts:22-30` |
| F8 | Câu AI làm sẵn chưa hỏi được **dùng lại** chỉ theo (user, sense, type, `sense_revision_id`, `content_key`) — **không** xét prompt revision hay model. Câu tạo bằng prompt cũ vẫn được hỏi sau khi publish prompt mới (giữ tới `history_months`, mặc định 6 tháng). | `src/practice/ai/unseen-questions.ts:11-24`; `src/practice/maintenance/practice-cleanup.service.ts:39-42` |
| F9 | Không có khái niệm "tài khoản test" trong Identity (không cờ, không setting, không danh sách). Chỉ có `staff_role` (`admin`/`editor`). | `prisma/models/identity.prisma:1-36`; grep `test.account\|testAccount\|is_test\|isTest\|test_user` trong `src`, `prisma` → 0 kết quả |
| F10 | Báo cáo AI do `editor` xử lý được (`content.edit`), nhưng mọi API eval/prompt/operation cần `settings.manage` (chỉ `admin`). Nút "thêm vào bộ ví dụ" từ báo cáo sẽ chạm ranh giới quyền này. | `src/practice/reports/admin-reports.controller.ts:30-31, 59-60`; `src/ai/api/admin-ai-eval.controller.ts:24-25`; `src/identity/identity.types.ts:9-18` |
| F11 | Dashboard chất lượng (`ai-quality`) đếm báo cáo `open / no_error / fixed / refunded` nhưng **không đếm `confirmed`** (trạng thái lỗi AI đã xác nhận). | `src/practice/reports/ai-quality.service.ts:62-68` |
| F12 | Comment cũ trong code: `ai.prisma:38` vẫn ghi CHECK chỉ 3 operation (migration Bước 7 đã mở ra 6); `eval-examples.service.ts:84` vẫn ghi "the 101st example" (giới hạn nay là 1000). Chỉ là comment. | `prisma/models/ai.prisma:38`; `prisma/migrations/20261022091000_buoc7_ai_operations/migration.sql:4-5`; `src/ai/eval/eval-examples.service.ts:84`; `src/ai/ai.constants.ts:35` |

## 1. `prisma/models/ai.prisma` — mọi model

Không có `@relation` ra ngoài module; FK duy nhất `ai_operation_settings.model_ref → ai_models.id ON DELETE RESTRICT` (`ai.prisma:1-3, 50`).
CHECK nằm trong migration `20261020071131_ai/migration.sql:220-232` (+ `20261022091000_buoc7_ai_operations/migration.sql:4-5`).

### AiModel → `ai_models` (`ai.prisma:6-34`)
| Field | Type | Map | Ghi chú |
|---|---|---|---|
| id | String uuid | — | `gen_random_uuid()` |
| provider | String | — | CHECK `openai/anthropic/fake` (mig:221) |
| modelId | String | `model_id` | |
| shutdownAt | DateTime? | `shutdown_at` | |
| lifecycle | String? | — | CHECK `active/deprecated/retired` (mig:222) |
| effortLevels | String[] | `effort_levels` | default `[]` |
| thinkingOff | String? | `thinking_off` | CHECK `disabled/between_tools` (mig:223) |
| structuredOutputs | Boolean? | `structured_outputs` | |
| maxOutputTokens | Int? | `max_output_tokens` | |
| priceInput / priceCachedInput / priceOutput | Decimal(12,4)? | `price_input` / `price_cached_input` / `price_output` | USD / 1M token, admin gõ tay (`:19`) |
| note | String? | — | |
| infoCheckedAt | DateTime | `info_checked_at` | |
| createdBy, createdAt, updatedAt | | `created_by`, `created_at`, `updated_at` | |
Unique `(provider, modelId)` (`:32`). **Không có cột `cost_known` ở model**; `cost_known` nằm ở `ai_calls`.

### AiOperationSetting → `ai_operation_settings` (`ai.prisma:37-53`)
`operation` String **@id** (CHECK 6 operation, mig Bước 7:5) · `modelRef` uuid? `model_ref` (null = operation tắt) · `effort` String? · `thinking` String? (CHECK `'off'`) · `maxOutputTokens` Int? `max_output_tokens` (CHECK > 0; null = không giới hạn) · `version` Int default 0 · `updatedBy` uuid? · `updatedAt`. Một dòng / operation, seed bởi migration.

### AiOperationSettingChange → `ai_operation_setting_changes` (`ai.prisma:56-66`)
`id`, `operation`, `oldValue` Json `old_value`, `newValue` Json `new_value`, `changedBy`, `changedAt`; index `(operation, changedAt)`. Append-only. JSON gồm `{model_ref, effort, thinking, max_output_tokens}` (`src/ai/models/operation-settings.service.ts:52-54`).

### AiPrompt → `ai_prompts` (`ai.prisma:69-78`)
`operation` @id · `instructions` String · `examples` Json (few-shot trong prompt, ≤ 10, mỗi cái `{input, output}`) · `revision` Int · `updatedBy` · `updatedAt`. Đây là bản đang dùng.

### AiPromptRevision → `ai_prompt_revisions` (`ai.prisma:81-92`)
`id`, `operation`, `revision` Int, `instructions`, `examples` Json, `savedBy` `saved_by`, `savedAt` `saved_at`; unique `(operation, revision)`. Append-only. Không có trạng thái (draft/published), không có ghi chú, không có model.

### AiOperationRecord → `ai_operations` (`ai.prisma:95-116`)
Replay 24 h của learner: `userId`, `operationId`, `operation`, `fingerprint`, `status` (CHECK `running/succeeded/permanent_failure`), `attemptId`, `startedAt`, `deadlineAt`, `result` Json?, `meta` Json?, `finishedAt`, `expiresAt`, `createdAt`; unique `(userId, operationId)`; index `expiresAt`, `(status, deadlineAt)`.

### AiCall → `ai_calls` (`ai.prisma:119-154`) — giữ vĩnh viễn
| Field | Map | Ghi chú |
|---|---|---|
| id uuid | | |
| operationId | `operation_id` | id của caller (`<request id>`, `<id>#2`, `<id>:wc`, `test-<uuid>`, `eval-<runId>-<exampleId>`) |
| aiOperationId uuid? | `ai_operation_id` | → `ai_operations.id`, null cho test/eval |
| attempt Int | | CHECK 1..2 |
| purpose | | CHECK `learner/test/eval` (mig:229) |
| operation, provider, model (model_id string), effort?, thinking?, maxOutputTokens? `max_output_tokens` | | snapshot của selection lúc gọi |
| promptRevision Int? | `prompt_revision` | null khi chạy draft |
| outcome | | `succeeded` hoặc lý do (CHECK mig:230) |
| httpStatus?, providerErrorCode? | `http_status`, `provider_error_code` | |
| latencyMs | `latency_ms` | |
| inputTokens?, cachedInputTokens?, outputTokens?, reasoningTokens? | `input_tokens`… | |
| costUsd Decimal(14,8)? | `cost_usd` | |
| costKnown Boolean | `cost_known` | |
| providerRequestId? | `provider_request_id` | |
| userId uuid? | `user_id` | learner, hoặc admin của test/eval; NULL sau xóa tài khoản |
| createdAt | `created_at` | |
Index `createdAt`, `operationId`, `userId`. **Không có** cột model ref (uuid), giá, hay link tới eval run.

### AiCallContent → `ai_call_contents` (`ai.prisma:157-165`)
`callId` @id `call_id`, `request` Json, `response` String?, `expiresAt` `expires_at`; index `expiresAt`. `request` = `{instructions, data, schema_name, effort, thinking, max_output_tokens}` (`src/ai/runner/runner.service.ts:236-240`).

### AiEvalExample → `ai_eval_examples` (`ai.prisma:168-179`)
`id`, `operation`, `input` Json, `note` String?, `createdBy`, `createdAt`, `updatedAt`; index `operation`. (F4)

### AiEvalRun → `ai_eval_runs` (`ai.prisma:182-212`)
`operation`, `provider`, `model` (model_id string), `effort?`, `thinking?`, `maxOutputTokens?`, `promptRevision?` `prompt_revision`, `draft` Json? (CHECK đúng một trong hai: mig:231), `exampleIds` uuid[] `example_ids`, `status` (CHECK `queued/running/finished/failed`, mig:232), `total`, `validCount` `valid_count`, `avgLatencyMs?`, `costUsd` Decimal(14,8)?, `costUnknownCount`, **`items` Json default `[]`** (kết quả từng ví dụ, không có bảng riêng), `error?`, `startedBy`, `createdAt`, `startedAt?`, `finishedAt?`, `heartbeatAt?`; index `(operation, createdAt)`, `(status, heartbeatAt)`.
Một item (`src/ai/eval/eval-runs.repository.ts:8-16`): `{example_id, status (AiResult status | 'skipped'), reason, output, raw_output, latency_ms, cost_usd}`.

### Setting cho cap — không ở `ai.prisma`
Một dòng `app_settings` key `global` giữ mọi giá trị (`prisma/models/settings.prisma:1-10`); lịch sử từng giá trị ở `app_setting_changes` (`settings.prisma:13-23`), key dạng `<section>.<api_key>` (`src/settings/settings.definitions.ts:278-284`). Nhóm `ai`: `call_timeout_seconds` 10, `max_concurrent_calls` 50, `daily_provider_calls_cap` 3000 (nullable = không cap, bound 0–1 000 000), `content_retention_days` 7 (0–30), `usd_vnd_rate` 26100 (`settings.definitions.ts:42-47, 66, 118-124`).

## 2. Lưu prompt, lưu operation, các endpoint admin

**Lưu prompt** (`src/ai/prompts/prompts.service.ts:104-128`): body `{expected_revision, instructions, examples}` (`:22-26`). Trong transaction: đọc dòng, sai revision → 409 `prompt-revision-conflict` (`:109`); `promptViolations` (instructions không trống, ≤ 8000 code point, ≤ 10 examples, mỗi example đúng `{input, output}` và qua `validateInput`/`checkOutput` của operation — `src/ai/prompts/prompt-rules.ts:18-37`); `updateMany … revision: {increment: 1}` guarded bởi revision (`:113-117`); tạo `ai_prompt_revisions` revision+1 (`:118-120`); P2002 → 409 (`:124`). Không có bước duyệt: lưu = live.
**Đọc khi gọi:** learner `prompts.current(op)` mỗi lần (`src/ai/runner/runner.service.ts:137`; `prompts.repository.ts:14-17`); test/eval dùng prompt truyền vào hoặc current (`runner.service.ts:193`). System prompt = instructions + `<examples>` + `PROMPT_GUARD` (`prompt-rules.ts:9, 40-53`).
**Lưu operation** (`src/ai/models/operation-settings.service.ts:74-116`): body `{expected_version, model_ref, effort, thinking ('off'|null), max_output_tokens}` (`:16-22`); kiểm model tồn tại + provider có cấu hình (`:78-82`), `selectionViolations` (`:84-89`); `updateMany where {operation, version: expected_version}` + `version++` (`:95-98`); 0 dòng → 409 `operation-settings-conflict` (`:99-101`); ghi `ai_operation_setting_changes` (`:102-104`). Live ngay; `SelectionReader.load` đọc mỗi lần gọi (`src/ai/runner/selection.ts:61-65`).

| Method + path (`/v1` prefix) | Quyền | File |
|---|---|---|
| GET `admin/ai/prompts/:op` | settings.manage | `src/ai/api/admin-ai-prompts.controller.ts:19-27` |
| PUT `admin/ai/prompts/:op` (rate `user.write`) | " | `:29-37` |
| GET `admin/ai/prompts/:op/revisions?page_size&page_token` | " | `:39-45` |
| POST `admin/ai/prompts/:op/test` — `{instructions, examples, example_ids?≤5}`; không `@Idempotent` | " | `:47-55`; `prompts.service.ts:30-34` |
| GET `admin/ai/operations`, PUT `admin/ai/operations/:op` | " | `src/ai/api/admin-ai-operations.controller.ts:12-30` |
| GET/POST `admin/ai/eval/examples` (`?operation=`), POST `…/examples/bulk`, PATCH/DELETE `…/examples/:id` | " | `src/ai/api/admin-ai-eval.controller.ts:32-63` |
| POST `admin/ai/eval/runs` (202, `@Idempotent`), GET `…/runs?operation&page_size&page_token`, GET `…/runs/:id`, POST `…/runs/:id/cancel`, DELETE `…/runs/:id` | " | `admin-ai-eval.controller.ts:66-97` |
| GET `admin/ai/status`, `admin/ai/costs`, `admin/ai/calls?operation_id`, `admin/ai/test-quota` | " | `src/ai/api/admin-ai-reports.controller.ts:18-47` |
| GET/POST/PATCH/DELETE `admin/ai/models`, POST `…/:id/refresh` | " | `src/ai/api/admin-ai-models.controller.ts:16-47` |
| GET `admin/ai/dashboard?from&to` | **ai.view** | `src/ai/api/admin-ai-dashboard.controller.ts:10-21` |

- `TEST_EXAMPLES_MAX = 5` (`src/ai/ai.constants.ts:33`). Test lấy `example_ids`, nếu không thì 5 ví dụ đầu của bộ eval, nếu không nữa thì input của few-shot trong draft (`prompts.service.ts:191-207`). Kết quả test không lưu (chỉ `ai_calls` purpose `test`).
- Rate `ai.test`: 20 lần / giờ / user (`src/common/config/app-config.ts:142`), đếm 1 cho mỗi lần test **và** 1 cho mỗi eval run (bất kể bao nhiêu ví dụ) (`prompts.service.ts:170`; `src/ai/eval/eval-runs.service.ts:89`).
- Example đơn: `{operation, input, note?}` (`src/ai/eval/eval-examples.service.ts:15`). Bulk API: `{operation, rows: [{input, note?}] (1..1000)}`; row sai trả về theo số dòng, row đúng được lưu; vượt chỗ trống → 400 cả request; `created_at` cách nhau 1 ms để giữ thứ tự file (`:22-25, 94-130`). Giới hạn 1000 / operation (`ai.constants.ts:35`).
- Định dạng file (JSONL/CSV/TSV) chỉ do **admin web** đọc: JSONL nếu ký tự đầu là `{` (mỗi dòng `{"input":{…},"note":…}` hoặc các field input phẳng); ngược lại CSV, hoặc TSV khi header có tab; cột = input fields của operation + `note` tuỳ chọn; tối đa 1000 dòng (`apps/admin/src/features/ai/bulk-examples.ts:4, 53-60`).

## 3. Chạy eval run

- Tạo (`src/ai/eval/eval-runs.service.ts:68-100`): body `{operation, prompt: 'current' | {instructions, examples}}` (`:21-24`); cần model + provider (409 `model-not-set` / `provider-not-configured`); `'current'` → lưu `prompt_revision` hiện tại, draft → kiểm `promptViolations` rồi lưu JSON `draft`; lấy **mọi** ví dụ của operation theo `(created_at, id)`; lưu selection đã resolve (`provider, model, effort, thinking, max_output_tokens`) (`:91-96`); enqueue. **Không lưu** `model_ref` (uuid), giá, `ai_operation_settings.version`.
- Queue `ai-eval` (`src/ai/eval/eval-queue.service.ts:8`), Worker chỉ ở process worker (`config.pipeline.runWorkers`), concurrency 1 job (`:37-42`), job id = run id, `attempts: 1` (`:48-51`).
- Processor `src/ai/eval/eval-job.ts:64-97`: `start` (queued/running → running), bỏ ví dụ đã có trong `items` (resume), đọc input lúc chạy (`:72`), tối đa `EVAL_JOB_CONCURRENCY = 3` ví dụ song song (`ai.constants.ts:36`), trước mỗi lần gọi trả tiền hỏi `isRunning` (`:76-78`). Mỗi ví dụ: `runner.execute({purpose: 'eval', operation, data, actorId: startedBy, callOperationId: 'eval-<runId>-<exampleId>', selection, prompt})` (`:79-83`) → gateway path admin, không ai_operations, không cap/switch (`runner.service.ts:179-201`). Ví dụ đã xóa → item `skipped` / `example-deleted` (`eval-job.ts:84-87`).
- Prompt: draft → `{...draft, revision: null}`; current → `atRevision(promptRevision)` (`eval-job.ts:99-104`). Selection dựng lại từ dòng run, **giá = giá hiện tại** của `ai_models` theo `(provider, model_id)`, null nếu model đã xóa (`:107-117`).
- Item (`eval-job.ts:27-39`): `status` = `succeeded` chỉ khi gateway check hình dạng qua; `output`, `raw_output`, `latency_ms` (tổng các attempt), `cost_usd` (null nếu bất kỳ attempt nào không biết giá). Ghi ngay mỗi ví dụ (`eval-runs.repository.ts:86-90`). `finish` tính `valid_count`, `avg_latency_ms`, `cost_usd`, `cost_unknown_count` từ items bằng SQL (`:93-105`).
- Trạng thái: `queued → running → finished | failed`; cancel = `failed` + `error='cancelled'` (`eval-runs.service.ts:142-149`); hourly: queued > 10 phút → enqueue lại, running không heartbeat > 15 phút → `failed` + `'stalled'` (`src/ai/maintenance/ai-maintenance.ts:67-75`; `ai.constants.ts:37-38`). Xóa chỉ khi finished/failed; `ai_calls` giữ nguyên (`eval-runs.service.ts:152-155`).
- **Có** ghi revision/draft và model string trên run; mỗi `ai_calls` của eval cũng có `prompt_revision` (null với draft) và model (`runner.service.ts:228-235`).

## 4. Cap ngày và tiền

- `ReadinessService.check(op, purpose, now)` (`src/ai/runner/readiness.service.ts:26-39`): chỉ learner đọc settings; learner bị chặn bởi `entitlements.aiEnabled` false → `ai-disabled`, cap = 0 → `daily-call-cap`, `countToday ≥ cap` → `daily-call-cap` + `retry_after_seconds` tới 00:00 VN. Test/eval: `settings = null` → cap null → không chặn.
- `CallLedger.countToday` = `ai_calls.count(created_at ≥ 00:00 Asia/Ho_Chi_Minh)`, mọi purpose/outcome, không lock (`call-ledger.service.ts:44-48`; `ai.constants.ts:44`). Gọi từ readiness và `status` (`src/ai/reports/reports.service.ts:101`).
- Người học bị chặn ở: `AiService.isReady` / `run` (learner path step 3, `runner.service.ts:129-136`); Practice gọi `isReady` trước (`src/practice/ai/ai-question-generator.service.ts:76-79`); lookup (`src/content/lookup/ai-lookup.service.ts:42-48`). Cap lượt AI (F2 b) chặn ở `entitlements.reserve` (`ai-question-generator.service.ts:109-115`; `ai-lookup.service.ts:51-52`).
- Tiền mỗi call (`src/ai/runner/cost.ts:17-30`): `((input − cached)·price_input + cached·(price_cached_input ?? price_input) + output·price_output) / 1e6`, 8 chữ số; usage hoặc giá null → `cost_usd NULL`, `cost_known=false`. `reasoning_tokens` không cộng riêng (`ASSUMPTION`: provider đã tính trong output tokens). Giá là snapshot trong `Selection.price` lúc gọi; giá chỉ có khi đủ cả input và output (`selection.ts:52`). Ghi trong `CallLedger.record` (`call-ledger.service.ts:51-119`).
- Không có tổng USD theo ngày dùng để chặn; các báo cáo `costs`/`dashboard` cộng `cost_usd` theo nhóm `day/operation/model/purpose/outcome` (`reports.service.ts:15, 23-34, 146-167`). Không nhóm theo prompt revision.

## 5. Practice AI (`src/practice/ai/**`)

- Generator `AiQuestionGenerator.run` (`ai-question-generator.service.ts:63-151`), dùng chung cho `next` và `prepare`. Operation theo type: `cloze → generate_cloze`, `meaning_in_sentence → generate_meaning_question`, `mcq_sentence → generate_sentence_mcq` (`:37-39`). Từ riêng: `check_private_word` id `<request>:wc` một lần / content key (`:84-98`).
- Gọi AI lần 1 với `operationId = request.id`; nếu `succeeded` mà rule Practice từ chối → gọi lại `<request.id>#2` một lần (`:118-125`). `check()` gọi `checkCloze` / `checkMeaning` / `checkMcq` và ghi dạng lạ vào `practice_unknown_forms` (`:171-188`). Hai lần đều bị rule loại → failure `rejected` (`:211-214`).
- Fallback (`src/practice/sessions/sessions.service.ts:577-603`): request failed → phiên trộn dùng một **rule type mà phiên đã chọn** (`ruleTypesOf` = các type không phải AI, gồm cloze từ câu của chính người học, `:484-486`) cho cùng từ qua `ruleItem`, kèm notice `ai-fallback` lần đầu; phiên chỉ-AI trả `ai_unavailable` tới khi `retry_ai`. Không cố định một type cụ thể.
- Bảng: `practice_questions` (`PracticeQuestion`, `prisma/models/practice.prisma:38-65`) — `source` (`rule/ai/own_sentence`), `ai_request_id`, `ai_meta` Json (F7), `ai_charged`, `sense_revision_id`, `content_key`, `prompt`, `answer_key`, `hints`, `created_at`. Không có cột prompt revision/model riêng. Partial index `(user_id, sense_id) WHERE source='ai'` (`migrations/20261022090000_buoc7_practice_ai/migration.sql:144`). `practice_ai_requests` (`practice.prisma:136-153`): `type`, `state` (`generating/ready/failed`), `failure`, `ai_input` Json (dữ liệu gửi AI + lựa chọn của Practice), `question_id`.
- Ghi câu: `AiRequestsRepository.writeQuestion` (`ai-requests.repository.ts:65-80`), `aiMeta = {...result.meta, call_operation_id}` (`ai-question-generator.service.ts:139`).
- `prepare`: `POST /v1/practice/sessions/:id/prepare` (`src/practice/sessions/sessions.controller.ts:65-69`) → `sessions.service.ts:209-262`: chỉ vòng 1, tối đa `practice.ai_prefetch_count` (mặc định 2, 0–20; `settings.definitions.ts:56, 93`) từ đánh dấu AI sau vị trí hiện tại, bỏ qua từ đã có câu unseen hoặc request đang chạy; chạy generator song song ngoài transaction.
- Câu làm sẵn bằng bản cũ: xem F8.

## 6. Giữ nội dung 7 ngày, lọc câu thật, tài khoản test

| Dữ liệu | Giữ bao lâu | Xóa ở |
|---|---|---|
| `ai_call_contents` (request gồm `data` = input, response thô) | `content_retention_days` (7; 0 = không lưu) | hourly `ai.contents-expire` (`src/ai/maintenance/ai-maintenance.ts:29-30`); ghi `expires_at` ở `call-ledger.service.ts:90-99` |
| `ai_calls` (metadata, cost) | vĩnh viễn (user_id → NULL khi xóa tài khoản) | `src/ai/ai.service.ts:43-56` |
| `ai_operations` (result + meta, 24 h) | `expires_at` | `ai-maintenance.ts:26-28` |
| `practice_ai_requests.ai_input` | 7 ngày (`AI_REQUEST_RETENTION_DAYS`) | `src/practice/maintenance/practice-cleanup.service.ts:58-60`; `src/practice/practice.constants.ts:25` |
| `practice_questions` AI (câu đã dựng + `ai_meta`) | tới `history_months` (6) | `practice-cleanup.service.ts:38-42` |

- Lọc "câu AI thật 7 ngày qua": `practice_questions WHERE source='ai' AND created_at ≥ …`, theo type, `ai_meta->>'prompt_revision'`, `ai_meta->>'model'`, `ai_meta->>'operation'`; gồm cả câu làm sẵn chưa hỏi (có/không có `practice_session_items`). Hoặc `ai_calls WHERE purpose='learner' AND operation=… AND prompt_revision=… AND model=…`, nội dung qua `ai_call_contents` (còn hạn). `practice_questions.prompt` là câu đã dựng/che (không phải output thô); output thô chỉ còn trong `ai_call_contents.response` 7 ngày.
- Câu AI về **từ riêng** của người học chứa từ/nghĩa riêng; chỉ báo cáo mới che (`src/practice/reports/snapshot.ts:7-12`). Không có che sẵn nào cho việc đọc câu thật hàng loạt.
- Tài khoản test: không có (F9). Có thể phân biệt staff qua `users.staff_role`, không có gì khác. Test/eval của admin có `ai_calls.purpose` riêng và `user_id` = admin.

## 7. Báo cáo câu AI sai

- Model `PracticeReport` → `practice_reports` (`practice.prisma:104-132`): `user_id`, `item_id?` (unique, SetNull khi item bị dọn), `sense_id`, `question_snapshot` Json, `reason` (FK `practice_report_reasons.code`), `reason_label`, `note`, `status`, `resolved_by/at`, `created_at`, `question_source`, `ai_operation_id` (= `practice_questions.ai_request_id` = `practice_ai_requests.id` = `ai_calls.operation_id`), `ai_meta` (copy từ câu), `ai_charged`, `refunded` (null = chưa thử), `resolved_by_role`.
- `status` CHECK `open / no_error / fixed / confirmed` (`migrations/20261022090000_buoc7_practice_ai/migration.sql:127`). Câu AI chỉ được `no_error` hoặc `confirmed`; câu khác `no_error` hoặc `fixed` (`src/practice/reports/refunds.ts:6-8`). Hoàn lượt khi AI + confirmed + charged + reason refundable (`refunds.ts:14-18`), thực hiện sau commit, job hourly thử lại (`src/practice/reports/reports.service.ts:220-254`; `practice-cleanup.service.ts:62-65`).
- Snapshot (`snapshot.ts:13-46`): `type`, `prompt` (câu, options đã che nếu riêng), `correct` (`reveal` = lemma, meaning, definition_en + đáp án), `hints_shown`, câu trả lời của người học. Staff view thêm `call_operation_id`, `model`, `prompt_revision`, `ai_operation_id` (`reports.service.ts:49-60`).
- Để dựng một eval example: input của operation (`word, part_of_speech, level, meaning_vi, context_label` + `other_meanings_vi` / `answer_form, candidates`; `src/practice/ai/ai-inputs.ts:14-26`) nằm nguyên trong `practice_ai_requests.ai_input.data` (7 ngày) hoặc `ai_call_contents.request.data` (7 ngày). Sau 7 ngày chỉ còn `sense_id` + `practice_questions.sense_revision_id` để dựng lại từ Content (`ASSUMPTION`: dựng lại được bằng các hàm `clozeInput`/`meaningInput`, nhưng `other_meanings_vi`/`candidates` là lựa chọn ngẫu nhiên lúc đó, không tái tạo được y hệt). Báo cáo được giữ tới khi xử lý + `history_months` (`practice-cleanup.service.ts:46-49`).

## 8. Dashboard

| Endpoint | Quyền | Trả về |
|---|---|---|
| `GET /v1/admin/ai/dashboard?from&to` (mặc định 30 ngày) | ai.view | `DashboardReport` (`src/ai/reports/reports.service.ts:66-78, 173-215`): `ai_enabled`, `today` {calls, **cap = `ai.daily_provider_calls_cap` hiện tại**, failed_calls, failed_cost_usd, cost_usd, cost_vnd}, operations (ready/reason/model/last_error), `total`, `days[]` {calls, cost_usd, cost_vnd, learner_calls, learner_failed}, `by_operation`, `by_model`, `by_purpose`, `learner_health[]` {calls, failed, p50_ms, p95_ms, outcomes}. Cost tính mọi purpose; health chỉ learner. |
| `GET /v1/admin/practice/ai-quality?from&to` | ai.view | `AiQualityReport` (`src/practice/reports/ai-quality.service.ts:11-29, 44-88`): câu hỏi theo source/type (asked/answered/correct/skipped/hinted), `ai_requests` theo type/state/failure, phiên theo `ai_stopped`, báo cáo theo source (open/no_error/fixed/refunded — thiếu confirmed, F11), lý do báo cáo AI, dạng lạ, word checks, `ai_second_tries` (từ `AiService.secondTries`, `src/ai/ai.service.ts:65-76`). |
| `GET /v1/admin/entitlements/ai-usage/days?from&to` | ai.view | `AiUsageDaysView` (`src/entitlements/api/ai-usage.ts:13-17`): `today` (`aiUsage`), `days[]` {ai_practice, ai_lookup, total, learners} (confirmed uses theo `system_date`, `src/entitlements/usage/usage.queries.ts:70-82`), `refunds`, `days_at_cap`. |

**`days_at_cap`** = số ngày `total ≥ today.cap` với `today.cap` = `entitlements.ai_daily_cap` **hiện tại**; cap cũ không được dùng (comment nói thẳng) (`src/entitlements/entitlements.service.ts:199-213`). Lịch sử cap có trong `app_setting_changes` key `entitlements.ai_daily_cap` (`settings.definitions.ts:227, 282`; `src/settings/settings.service.ts:70-75`) nhưng không ai đọc. Dashboard không có số nào theo prompt revision.

## 9. Quyền

- `Permission` và `ROLE_PERMISSIONS` (`src/identity/identity.types.ts:4-18`): `admin` có tất cả gồm `settings.manage` và `ai.view`; `editor` có `content.edit, content.publish, content.import, taxonomy.manage, entitlements.grant, users.read, ai.view` — **không** `settings.manage`.
- Kiểm bằng `@RequirePermission(...)` + `PermissionGuard` (`src/identity/staff/permission.guard.ts:21-48`): đọc role hiện tại từ DB mỗi request; session đăng nhập bằng Google không vào route staff; `must_change_password` chặn.
- `settings.manage`: mọi controller `src/ai/api/admin-ai-{eval,models,operations,prompts,reports}.controller.ts`, `admin/entitlements/ai-usage`, `admin/practice/refunds`, report reasons, transactions, settings. `ai.view`: `admin-ai-dashboard.controller.ts:11`, `admin-entitlements.controller.ts:41, 48`, `admin-ai-quality.controller.ts:11`. Báo cáo list/get/resolve: `content.edit` (F10).
- Admin web nav: dashboard cần `ai.view`; mọi màn `/ai/*` cần `settings.manage`; `/reports` cần `content.edit` (`apps/admin/src/app/nav.ts:20, 29-41`).

## 10. Dữ liệu hoạt động người học (D7/D30)

| Nguồn | Cột thời gian | Giữ | Ghi chú |
|---|---|---|---|
| `users` | `created_at`, `last_seen_at` | vĩnh viễn | `last_seen_at` = lần login/refresh cuối, **một giá trị bị ghi đè** (`src/identity/sessions/session.service.ts:54, 208`; `prisma/models/identity.prisma:20, 25`) |
| `learning_log` (`prisma/models/learning.prisma:52-78`) | `at`, `local_date` | append-only, không job dọn | `kind` `item_added/item_removed/review/relearn`, `origin='practice'` khi bấm trong phiên luyện (`migrations/20261017210000_learning/migration.sql:85`; `20261018140000_learning_log_origin/migration.sql:5`); bị xóa khi xóa tài khoản (`src/learning/account-eraser.provider.ts:20`) và khi quick-add bỏ từ (`src/learning/quick-add/quick-add.service.ts:94`) |
| `practice_session_items` | `asked_at`, `answered_at`, `local_date` | `history_months` (6) | `practice-cleanup.service.ts:38` |
| `practice_sessions` | `started_at`, `last_activity_at`, `ended_at` | `history_months` sau khi kết thúc | `practice-cleanup.service.ts:43-45` |
| `usage_records` pool `practice_sessions` | `local_date`, `created_at` | grep không thấy job dọn (`ASSUMPTION`: giữ vĩnh viễn) | `prisma/models/entitlements.prisma:159-185`; pool CHECK `migrations/20261019094400_entitlements/migration.sql:222` |
| `session_chains` | `created_at`, `last_used_at` | — | `identity.prisma:48-60` |

Không có bảng "hoạt động theo ngày" hay "last active" riêng ngoài `users.last_seen_at`. Tài khoản đã xóa mất `learning_log` → cohort cũ bị thiếu người.

## 11. Admin web (`apps/admin/src/features/**`)

- `features/ai/`: `AiStatusPage`, `AiModelsPage` (+ `ModelDialog`), `AiOperationsPage` (+ `operation-draft.ts`, `operation-violations.ts`), `AiPromptsPage` (+ `PromptHistory`, `TestRunPanel`, `prompt-form.ts`), `AiEvalPage` (+ `ExampleDialog`, `BulkExamplesDialog`, `bulk-examples.ts`, `EvalRunPanel`), `AiCostsPage` (+ `cost-range.ts`), `AiCallsPage`, `useAiFormat.ts`, client `ai-api.ts`.
- `features/dashboard/`: `DashboardPage.tsx`, `charts.tsx`, `dashboard-api.ts` (gọi 4 endpoint: `getAiDashboard`, `getAiQuality`, `getAiUsageDays`, `getAiUsagePro`, `dashboard-api.ts:64-69`).
- `features/reports/`: `ReportsPage`, `ReportDetail`, `ReportReasonsPage` (+ `ReasonDialog`), `RefundsPage`, `reports-api.ts`.
- Tách API/UI: mỗi màn là `src/features/<tên>/` gồm `<Tên>Page.tsx` + `<tên>-api.ts` (kiểu dữ liệu và hàm gọi API) + test cạnh bên (`docs/superpowers/specs/2026-10-27-giao-dien-admin-design.md:74`). Hàm API nhận `ApiClient` (`apps/admin/src/api/client.ts:5-13`), ví dụ `ai-api.ts:249-298` (`savePrompt`, `runTest`, `createExamples`, `startRun(api, body, idempotencyKey)`, `cancelRun`…).

## 12. Đối chiếu ba giả định của người giao việc

| Giả định | Kết quả |
|---|---|
| Eval/test được đếm vào cap gọi hằng ngày của người học nhưng không bị cap chặn | **Đúng** cho `ai.daily_provider_calls_cap` (F1). Nhưng chúng **không** đụng tới cap lượt AI `entitlements.ai_daily_cap` (F2), và cũng không bị switch `ai_enabled` chặn (`readiness.service.ts:27-28`). Giới hạn duy nhất của admin là rate `ai.test` 20/giờ, một eval run 1000 ví dụ chỉ tính 1. |
| Lưu prompt có hiệu lực ngay (D15 Bước 6) | **Đúng** (F3); model/effort/tokens cũng vậy. |
| Eval example chỉ có operation, input, note | **Đúng** (F4). |
