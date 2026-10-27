# Đối chiếu API cho màn AI của admin (A/80–A/86) — 27/10/2026

Đọc trên bản checkout chỉ-đọc của `origin/dev` (scratchpad `dev-ro`), không chạy code. Mọi `path:line` dưới đây tính từ gốc repo; viết tắt
`ai/` = `apps/api/src/ai/`, `mig/` = `apps/api/prisma/migrations/`, `bc` = `docs/mockups/2026-10-21/ban-chu-giao-dien.md`.

Trạng thái: **OK** = API trả đúng thứ màn cần · **DIFFERS** = có nhưng khác tên, khác dạng, hoặc màn phải tự ghép · **MISSING** = API không có.

Quyền: cả 5 controller gắn `@RequirePermission('settings.manage')` ở mức class — `ai/api/admin-ai-models.controller.ts:17`,
`ai/api/admin-ai-operations.controller.ts:13`, `ai/api/admin-ai-prompts.controller.ts:20`, `ai/api/admin-ai-eval.controller.ts:25`,
`ai/api/admin-ai-reports.controller.ts:17`. Chỉ `admin` có `settings.manage` (`apps/api/src/identity/identity.types.ts:9-15`). Cột "Quyền" bên dưới
đều là `settings.manage` trừ khi ghi khác.

## Seed 6 thao tác

| Thao tác | Dòng seed `ai_operation_settings` | `model_ref` | Bằng chứng |
|---|---|---|---|
| `generate_cloze`, `lookup_word`, `translate_sentence` | có, `max_output_tokens` 1200 / 1200 / 800, `version` 0 | NULL | `mig/20261020071131_ai/migration.sql:235-238` |
| `generate_meaning_question`, `generate_sentence_mcq`, `check_private_word` | có, 1200 / 1200 / 300, `version` 0 | NULL | `mig/20261022091000_buoc7_ai_operations/migration.sql:8-11` |
| CHECK cho phép đủ 6 | có | — | `mig/20261022091000_buoc7_ai_operations/migration.sql:4-5` |
| Prompt seed, người lưu = `AI_SYSTEM_ACTOR_ID` (UUID hệ thống, không phải user) | có, cả `ai_prompts` và `ai_prompt_revisions` | — | `mig/20261020072259_ai_initial_prompts/migration.sql:3,50,71`; `mig/20261022091000_buoc7_ai_operations/migration.sql:13,76`; `ai/ai.constants.ts:46` |

Danh sách 6 thao tác trong code: `ai/ai.types.ts:3-5`.

## A/84 Tình trạng, A/84b lần đầu — `GET /v1/admin/ai/status`

| Phần tử | Endpoint | Trường / mã lỗi | Quyền | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| Đủ 6 thao tác | GET `/v1/admin/ai/status` | `operations[]` lặp theo `AI_OPERATIONS` (đủ 6, đúng thứ tự bản chữ) | settings.manage | OK | `ai/reports/reports.service.ts:95`; `ai/ai.types.ts:3-5`; controller `ai/api/admin-ai-reports.controller.ts:24-27` |
| Sẵn sàng | 〃 | `operations[].ready` | 〃 | OK | `ai/reports/reports.service.ts:106` |
| Lý do (4 nhãn) | 〃 | `operations[].reason`: `ai-disabled` / `model-not-set` / `provider-not-configured` / `daily-call-cap`. Kiểu còn có `provider-quota` nhưng readiness không bao giờ trả | 〃 | OK (màn tự đổi mã → chữ) | `ai/reports/reports.service.ts:107`; `ai/runner/readiness.service.ts:29-37`; `ai/ai.types.ts:15` |
| Model | 〃 | `operations[].model {provider, model_id}`; kèm `effort`, `thinking` (`disabled`/`between_tools`, khác dạng `off` của API thao tác), `max_output_tokens` | 〃 | OK | `ai/reports/reports.service.ts:50-53,108-111` |
| Lỗi gần nhất | 〃 | `operations[].last_error {at, outcome, http_status}` — lấy lỗi mới nhất **mọi thời điểm, mọi `purpose`** (gồm cả chạy thử, bộ ví dụ) | 〃 | OK (lưu ý phạm vi) | `ai/reports/reports.service.ts:90-92,112` |
| Cảnh báo model sắp ngừng | 〃 | `operations[].model_warning {shutdown_at, lifecycle}` khi model đang chọn ngừng trong 30 ngày hoặc `deprecated`/`retired` | 〃 | OK | `ai/reports/reports.service.ts:101-103,113`; `ai/ai.constants.ts:42` |
| "Lời gọi hôm nay: 1.240/3.000" | 〃 | `today.calls`, `today.cap` (`null` = không giới hạn) | 〃 | OK | `ai/reports/reports.service.ts:119-120` |
| "Lỗi: 12 (0,04 US$)" | 〃 | `today.failed_calls`, `today.failed_cost_usd` | 〃 | OK | `ai/reports/reports.service.ts:84-88,120` |
| "Chi phí hôm nay: 2,31 US$ · 60.291 ₫" | 〃 | `today.cost_usd`, `today.cost_vnd` (quy theo tỷ giá **hiện tại**) | 〃 | OK | `ai/reports/reports.service.ts:121` |
| "Nhà cung cấp có key" | 〃 | `providers {openai, anthropic, fake}: boolean` (= adapter đã đăng ký: có key, hoặc `AI_FAKE_ENABLED`) | 〃 | OK | `ai/reports/reports.service.ts:116,124`; `ai/adapters/adapters.registrar.ts:16-21` |
| "AI toàn hệ thống: Đang bật" | 〃 | `ai_enabled` | 〃 | OK | `ai/reports/reports.service.ts:123` |
| A/84b: 6 dòng "Chưa sẵn sàng · Chưa chọn model" | 〃 | DB mới: `model_ref` NULL ở cả 6 → `model-not-set` (khi `ai_enabled` bật; nếu tắt thì lý do đầu là `ai-disabled`) | 〃 | OK | seed ở trên; `ai/runner/readiness.service.ts:29-31` |

## A/80 Model, A/80b Thêm model — `/v1/admin/ai/models`

| Phần tử | Endpoint | Trường / mã lỗi | Quyền | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| Danh sách | GET `/v1/admin/ai/models?provider=` | `{items: ModelView[]}`, sắp theo provider, model_id | settings.manage | OK | `ai/api/admin-ai-models.controller.ts:21-24`; `ai/models/models.service.ts:90-95` |
| Nhà cung cấp · Model id | 〃 | `provider`, `model_id`, `id` (UUID) | 〃 | OK | `ai/models/models.service.ts:197-199` |
| Giá vào / cache / ra | 〃 | `price {input, cached_input, output}` (chuỗi 4 số lẻ; `price = null` khi thiếu giá vào hoặc ra) | 〃 | OK | `ai/models/models.service.ts:206-208` |
| Ghi chú | 〃 | `note` | 〃 | OK | `ai/models/models.service.ts:209` |
| Thao tác đang dùng | 〃 | `used_by: AiOperation[]` | 〃 | OK | `ai/models/models.service.ts:211` |
| Vòng đời | 〃 | `lifecycle` (Anthropic; OpenAI thường `null`), `shutdown_at` | 〃 | OK | `ai/models/models.service.ts:200-201` |
| Ước tính mỗi lời gọi | 〃 | `estimate {per_call_usd, per_call_vnd, per_day_1000_vnd, max_call_usd, max_call_vnd}` (600 vào + 500 ra; `null` khi chưa có giá) | 〃 | OK | `ai/models/models.service.ts:212`; `ai/runner/cost.ts:7-13,33-46`; `ai/ai.constants.ts:52-54` |
| Kiểm tra thông tin lần cuối | 〃 | `info_checked_at` | 〃 | OK | `ai/models/models.service.ts:210` |
| Dòng effort / thinking chọn được | 〃 | `effort_choices[]` (OpenAI: 7 mức cố định; Anthropic: mức model báo), `thinking_off_available` | 〃 | OK | `ai/models/models.service.ts:202-203`; `ai/models/model-rules.ts:5,10-14` |
| [Thêm model] form A/80b | POST `/v1/admin/ai/models` → 201 | body `provider`, `model_id` (`^[A-Za-z0-9._:-]{1,100}$`), `price_input`, `price_cached_input`, `price_output` (0–1000, ≤4 số lẻ, không bắt buộc), `note` (≤500); model `fake` ép giá 0 | 〃, rate `user.write` | OK | `ai/api/admin-ai-models.controller.ts:26-31`; `ai/models/models.service.ts:17-26,104-106`; `ai/ai.constants.ts:48,56,58` |
| "Model đã có." | POST | 409 `model-exists` | 〃 | OK | `ai/models/models.service.ts:59,101,113` |
| "Nhà cung cấp chưa có key." | POST, refresh | 409 `provider-not-configured` | 〃 | OK | `ai/models/models.service.ts:61,99,140,172` |
| Lỗi khác của thêm / đọc lại | POST, refresh | 422 `model-not-found`, 422 `model-not-supported`, 503 `provider-unavailable`, 400 `validation-failed` | 〃 | DIFFERS — API có, bản chữ chưa có câu | `ai/models/models.service.ts:171-178`; `bc:691` |
| Sửa giá | PATCH `/v1/admin/ai/models/{id}` | body `price_input`, `price_cached_input`, `price_output`, `note` (mỗi trường nullable); 404 `not-found` | 〃, `user.write` | OK | `ai/api/admin-ai-models.controller.ts:33-38`; `ai/models/models.service.ts:30,118-133` |
| [Đọc lại thông tin] | POST `/v1/admin/ai/models/{id}/refresh` → 200 `ModelView` mới, cập nhật `info_checked_at` | 404, 409, 422, 503 như trên | 〃, `user.write` | OK | `ai/api/admin-ai-models.controller.ts:40-45`; `ai/models/models.service.ts:136-151` |
| Xóa | DELETE `/v1/admin/ai/models/{id}` → 204 | "Model đang được thao tác dùng…" = 409 `model-in-use` (kiểm trước + bắt khóa ngoại P2003); 404 | 〃, `user.write` | OK | `ai/api/admin-ai-models.controller.ts:47-52`; `ai/models/models.service.ts:60,153-164` |

## A/81 Thao tác — `/v1/admin/ai/operations`

| Phần tử | Endpoint | Trường / mã lỗi | Quyền | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| Đủ 6 thao tác | GET `/v1/admin/ai/operations` | `{items}` từ bảng (6 dòng seed); **sắp theo tên a→z**, không theo thứ tự bản chữ | settings.manage | OK (màn tự sắp) | `ai/api/admin-ai-operations.controller.ts:17-20`; `ai/models/operation-settings.service.ts:66-72` |
| Thao tác · Model | 〃 | `operation`, `model {id, provider, model_id}` hoặc `null` | 〃 | OK | `ai/models/operation-settings.service.ts:25-34,129-130` |
| Effort (Mặc định / các mức model có) | 〃 | `effort` (`null` = mặc định). Danh sách mức **không có** trong item: lấy `effort_choices` của model từ GET models theo `model.id` | 〃 | DIFFERS (màn ghép 2 API) | `ai/models/operation-settings.service.ts:131`; `ai/models/models.service.ts:202` |
| Thinking (Mặc định / Tắt) | 〃 | `thinking: 'off' \| null`; có tắt được không: `thinking_off_available` của model | 〃 | DIFFERS (ghép 2 API) | `ai/models/operation-settings.service.ts:132`; `ai/models/models.service.ts:203` |
| Số token đầu ra tối đa | 〃 | `max_output_tokens` (`null` = không giới hạn); PUT nhận 1–số tối đa của model, hoặc 1–128.000 khi không biết | 〃 | OK | `ai/models/operation-settings.service.ts:133`; `ai/models/model-rules.ts:35-37`; `ai/ai.constants.ts:26` |
| Ô dữ liệu vào | 〃 | `input_fields[]` | 〃 | OK | `ai/models/operation-settings.service.ts:135` |
| Ước tính mỗi lời gọi | 〃 | `estimate` (CostEstimate; lời gọi đắt nhất theo giới hạn của thao tác) | 〃 | OK | `ai/models/operation-settings.service.ts:136-139` |
| Lưu | PUT `/v1/admin/ai/operations/{op}` | body bắt buộc đủ: `expected_version`, `model_ref` (UUID / `null` = "Không có model" = tắt), `effort`, `thinking` (`'off'`/`null`), `max_output_tokens`; ghi lịch sử `ai_operation_setting_changes` (không có API đọc) | 〃, `user.write` | OK | `ai/api/admin-ai-operations.controller.ts:22-30`; `ai/models/operation-settings.service.ts:16-22,90-104` |
| "Có người vừa đổi thao tác này…" (409) | PUT | 409 `operation-settings-conflict` | 〃 | OK | `ai/models/operation-settings.service.ts:99-101` |
| "Model này không tắt được thinking." | PUT | 400 `validation-failed`, violation `thinking: this model cannot turn thinking off` — **không có mã `type` riêng** | 〃 | DIFFERS (màn khớp theo chuỗi violation) | `ai/models/model-rules.ts:28-30`; `ai/models/operation-settings.service.ts:84-89` |
| "Tắt thinking cần effort high trở xuống." | PUT | 400 `validation-failed`, violation `thinking: off needs effort high or below` | 〃 | DIFFERS (như trên) | `ai/models/model-rules.ts:31-33` |
| Lỗi khác của PUT | PUT | 400 `model_ref: not found`; 400 `effort: not offered by this model`; 409 `provider-not-configured` | 〃 | DIFFERS — bản chữ chưa có câu | `ai/models/operation-settings.service.ts:49,79-82`; `ai/models/model-rules.ts:25-27` |

## A/82 Prompt — `/v1/admin/ai/prompts/{op}`

| Phần tử | Endpoint | Trường / mã lỗi | Quyền | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| Đọc prompt | GET `/v1/admin/ai/prompts/{op}` | `operation, instructions, examples, revision, input_fields, updated_at, updated_by` | settings.manage | OK | `ai/api/admin-ai-prompts.controller.ts:24-27`; `ai/prompts/prompts.service.ts:34-42,84-90` |
| Lời dặn ≤ 8.000 ký tự | PUT | 400 `validation-failed` `instructions: Expected at most 8000 characters` (đếm code point); trống → `instructions: Must not be blank` | 〃 | OK | `ai/prompts/prompt-rules.ts:20-23`; `ai/ai.constants.ts:30` |
| Ví dụ ≤ 10, mỗi ví dụ một cặp vào/ra | PUT | 400 `examples: Expected at most 10 examples`; `examples[i]: Expected an object with exactly input and output`; lỗi ô `examples[i].input.…`, `examples[i].output: …` | 〃 | OK | `ai/prompts/prompt-rules.ts:24-36`; `ai/ai.constants.ts:31` |
| "Dữ liệu prompt nhận: word, …" | GET | `input_fields[]` | 〃 | OK | `ai/prompts/prompts.service.ts:88` |
| Câu chặn cố định | — | Chỉ là hằng `PROMPT_GUARD` trong code (tiếng Anh), **API không trả** | — | MISSING (màn phải chép chữ, hoặc thêm trường) | `ai/prompts/prompt-rules.ts:9,40-53` |
| "Bản số 3" | GET | `revision` | 〃 | OK | `ai/prompts/prompts.service.ts:87` |
| [Lưu] | PUT `/v1/admin/ai/prompts/{op}` | body `expected_revision`, `instructions`, `examples`; trả PromptView mới | 〃, `user.write` | OK | `ai/api/admin-ai-prompts.controller.ts:29-37`; `ai/prompts/prompts.service.ts:19-23,93-117` |
| "Có người vừa lưu prompt này…" | PUT | 409 `prompt-revision-conflict` (kiểm trước nội dung; cả khi đua unique) | 〃 | OK | `ai/prompts/prompts.service.ts:60,98,106,113` |
| Lịch sử: Bản · Thời điểm lưu | GET `/v1/admin/ai/prompts/{op}/revisions?page_size=&page_token=` | `items[] {revision, instructions, examples, saved_by, saved_at}`, mới nhất trước, `next_page_token`; mặc định 20, tối đa 100 | 〃 | OK | `ai/api/admin-ai-prompts.controller.ts:10-13,39-45`; `ai/prompts/prompts.service.ts:119-144` |
| [Xem] bản cũ | 〃 | Item đã có đủ `instructions` + `examples`; không có API đọc một bản riêng (không cần) | 〃 | OK | `ai/prompts/prompts.service.ts:138-140` |
| Người lưu | GET prompt / revisions | `updated_by`, `saved_by` là **UUID**, không có email. Bản seed là `AI_SYSTEM_ACTOR_ID` (không phải user, tra `GET /v1/admin/users/{id}` sẽ không ra) | 〃 (tra user cần `roles.manage`) | DIFFERS (design đợt giao diện §10 hẹn thêm email) | `ai/prompts/prompts.service.ts:41,44,88,139`; `docs/superpowers/specs/2026-10-21-dot-giao-dien-design.md:188`; `apps/api/src/identity/staff/staff.controller.ts:12,26` |
| [Chạy thử] | POST `/v1/admin/ai/prompts/{op}/test` → 200 | body `instructions`, `examples`, `example_ids?` (≤5); không có ví dụ nào → 400 `examples: at least one example is needed`; 409 `model-not-set`; 409 `provider-not-configured` | 〃, rate `ai.test` | OK | `ai/api/admin-ai-prompts.controller.ts:47-56`; `ai/prompts/prompts.service.ts:27-31,147-193`; `ai/ai.constants.ts:33` |
| Kết quả từng mẫu: đầu vào · trạng thái · lý do · đầu ra | POST test | `items[] {input, status, reason, output, raw_output, latency_ms, cost_usd, calls[]}` | 〃 | OK | `ai/prompts/prompts.service.ts:46-55,161-171` |
| "Còn 17/20 lần chạy thử trong giờ này (dùng chung với Bộ ví dụ)" | — | Giới hạn có: rule `ai.test` 20 lần / cửa sổ 3600 s theo user, **dùng chung** khóa với POST eval runs (cùng tên rule). **Không có API hay header trả số còn lại**; chỉ biết khi đã vượt: 429 `rate-limited` + `Retry-After`. Cửa sổ là giờ tròn theo đồng hồ (floor), không phải 60 phút trượt | 〃 | MISSING (số còn lại) | `apps/api/src/common/config/app-config.ts:127`; `apps/api/src/common/rate-limit/rate-limiter.service.ts:21-24,34-41`; `ai/api/admin-ai-eval.controller.ts:62`; `ai/api/admin-ai-prompts.controller.ts:49` |

## A/83 Bộ ví dụ — `/v1/admin/ai/eval/*`

| Phần tử | Endpoint | Trường / mã lỗi | Quyền | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| Ví dụ theo thao tác | GET `/v1/admin/ai/eval/examples?operation=` | `items[] {id, operation, input, note, created_by, created_at, updated_at}`, tối đa 100, không phân trang | settings.manage | OK | `ai/api/admin-ai-eval.controller.ts:32-35`; `ai/eval/eval-examples.service.ts:19-28,51-56` |
| Tối đa 100 | POST examples | Ví dụ thứ 101 → 400 `validation-failed` `operation: at most 100 examples` (không có mã riêng) | 〃 | OK | `ai/eval/eval-examples.service.ts:62-64`; `ai/ai.constants.ts:35` |
| [Thêm ví dụ] | POST `/v1/admin/ai/eval/examples` → 201 | body `operation`, `input` (kiểm theo luật dữ liệu vào của thao tác), `note` (≤500) | 〃, `user.write` | OK | `ai/api/admin-ai-eval.controller.ts:37-42`; `ai/eval/eval-examples.service.ts:13,58-69` |
| Sửa / xóa ví dụ | PATCH / DELETE `/v1/admin/ai/eval/examples/{id}` | `input?`, `note?`; 404 `not-found`; DELETE → 204 | 〃, `user.write` | OK | `ai/api/admin-ai-eval.controller.ts:44-56`; `ai/eval/eval-examples.service.ts:71-91` |
| [Chạy bộ ví dụ] (prompt hiện tại / bản nháp) | POST `/v1/admin/ai/eval/runs` → 202 `{run_id, status:'queued'}` | body `operation`, `prompt: 'current' \| {instructions, examples}` (bản nháp kiểm luật lưu, lỗi `prompt.…`); **bắt buộc header `Idempotency-Key`** (thiếu → 400); 409 `model-not-set`; 409 `provider-not-configured`; 400 `examples: at least one example is needed` | 〃, rate `ai.test` | OK | `ai/api/admin-ai-eval.controller.ts:58-65`; `ai/eval/eval-runs.service.ts:16-19,58-88`; `apps/api/src/common/idempotency/idempotency.interceptor.ts:38-40` |
| Danh sách lần chạy | GET `/v1/admin/ai/eval/runs?operation=&page_size=&page_token=`; GET `/v1/admin/ai/eval/runs/{id}` (thêm `items`, `draft`, `heartbeat_at`) | mới nhất trước; 404 | 〃 | OK | `ai/api/admin-ai-eval.controller.ts:67-75`; `ai/eval/eval-runs.service.ts:90-121` |
| Trạng thái (Đang chờ / Đang chạy / Xong / Lỗi) | 〃 | `status`: `queued` / `running` / `finished` / `failed`; `error` | 〃 | OK | `ai/eval/eval-runs.service.ts:39,42`; `mig/20261020071131_ai/migration.sql:232` |
| Tiến độ "12/20" | 〃 | `done` / `total` | 〃 | OK | `ai/eval/eval-runs.service.ts:40` |
| Hợp lệ | 〃 | `valid_count` | 〃 | OK | `ai/eval/eval-runs.service.ts:40` |
| Thời gian trung bình | 〃 | `avg_latency_ms` | 〃 | OK | `ai/eval/eval-runs.service.ts:41` |
| Chi phí | 〃 | `cost_usd`, `cost_unknown_count` — chỉ USD, **không có `cost_vnd`** | 〃 | DIFFERS nhỏ (nếu màn muốn ₫) | `ai/eval/eval-runs.service.ts:41` |
| Model | 〃 | `provider`, `model`, `effort`, `thinking`, `max_output_tokens` (lưu lúc tạo) | 〃 | OK | `ai/eval/eval-runs.service.ts:38-39,79-81` |
| Bản prompt | 〃 | `prompt_revision` (`null` khi chạy bản nháp → màn ghi "Bản nháp") | 〃 | OK | `ai/eval/eval-runs.service.ts:39,67-72` |
| Người tạo ví dụ / người chạy | 〃 | `created_by`, `started_by` là **UUID**, không có email | 〃 | DIFFERS (design §10 hẹn thêm email) | `ai/eval/eval-examples.service.ts:20`; `ai/eval/eval-runs.service.ts:42`; `docs/superpowers/specs/2026-10-21-dot-giao-dien-design.md:188` |

## A/85 Chi phí — `GET /v1/admin/ai/costs`

| Phần tử | Endpoint | Trường / mã lỗi | Quyền | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| Từ ngày · Đến ngày (≤ 366 ngày) | GET `/v1/admin/ai/costs?from=&to=&group_by=` | `from`, `to` dạng `YYYY-MM-DD`, mặc định hôm nay (giờ VN); `from > to` hoặc > 366 ngày → 400 `validation-failed` | settings.manage | OK | `ai/api/admin-ai-reports.controller.ts:8-12,29-32`; `ai/reports/reports.service.ts:18,132-136` |
| Nhóm theo Ngày / Thao tác / Model / Mục đích / Kết quả | 〃 | `group_by`: `day` (mặc định) / `operation` / `model` (`provider/model`) / `purpose` / `outcome` | 〃 | OK | `ai/reports/reports.service.ts:14,22-28` |
| Cột Nhóm | 〃 | `items[].key` | 〃 | OK | `ai/reports/reports.service.ts:148` |
| Lời gọi · 4 cột token | 〃 | `calls`, `input_tokens`, `cached_input_tokens`, `output_tokens`, `reasoning_tokens` | 〃 | OK | `ai/reports/reports.service.ts:30-33,178-185` |
| Chi phí US$ · ₫ | 〃 | `cost_usd`, `cost_vnd` (tỷ giá hiện tại × USD) | 〃 | OK | `ai/reports/reports.service.ts:185-186` |
| Lời gọi chưa có giá | 〃 | `unknown_cost_calls` | 〃 | OK | `ai/reports/reports.service.ts:33,187` |
| Dòng tổng | 〃 | `total` (cùng các trường) | 〃 | OK | `ai/reports/reports.service.ts:144,148` |

## A/86 Các lần gọi — `GET /v1/admin/ai/calls`

| Phần tử | Endpoint | Trường / mã lỗi | Quyền | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| Ô tìm "Mã thao tác (operation_id)" | GET `/v1/admin/ai/calls?operation_id=` | 1–200 ký tự; cũ trước | settings.manage | OK | `ai/api/admin-ai-reports.controller.ts:13,34-37`; `ai/reports/reports.service.ts:152-153` |
| Lần thử · Mục đích · Thao tác | 〃 | `attempt`, `purpose`, `operation` | 〃 | OK | `ai/reports/reports.service.ts:163` |
| Model | 〃 | `provider`, `model` (+ `effort`, `thinking`, `max_output_tokens`, `prompt_revision`) | 〃 | OK | `ai/reports/reports.service.ts:163-164` |
| Kết quả · HTTP | 〃 | `outcome`, `http_status`, `provider_error_code` | 〃 | OK | `ai/reports/reports.service.ts:165` |
| Token | 〃 | `input_tokens`, `cached_input_tokens`, `output_tokens`, `reasoning_tokens` | 〃 | OK | `ai/reports/reports.service.ts:166-167` |
| Chi phí | 〃 | `cost_usd` (chuỗi hoặc `null`), `cost_known` — không có ₫ | 〃 | OK | `ai/reports/reports.service.ts:167` |
| Thời gian | 〃 | `latency_ms`, `created_at` | 〃 | OK | `ai/reports/reports.service.ts:165,168` |
| Nội dung (còn tới 25/10 / đã xóa) | 〃 | `content {request, response, expires_at}` khi còn hạn, ngược lại `null`. `null` gộp chung "đã hết hạn" và "không lưu" (`content_retention_days = 0`) | 〃 | OK (chữ "đã xóa" có thể sai khi không lưu) | `ai/reports/reports.service.ts:155-158,169-171` |
| Trống "Không có lời gọi nào với mã này." | 〃 | 200 `{items: []}` (không 404, khác bảng mã lỗi design Bước 6 §12.3) | 〃 | OK | `ai/reports/reports.service.ts:154` |

## Quyền: API so với `nav.ts`

| Chỗ | Quyền | Bằng chứng |
|---|---|---|
| Mọi API AI | `settings.manage` | 5 controller ở đầu file |
| `nav.ts` nhóm AI | `roles.manage` ("session has no AI permission yet") — lời chú đã cũ: `settings.manage` có trong `Permission` của admin và đang dùng cho `/transactions` | `apps/admin/src/app/nav.ts:18-19,35`; `apps/admin/src/auth/session-store.ts:5-12` |
| Mục trong `nav.ts` | 3 mục `/ai/settings`, `/ai/costs`, `/ai/eval-sets`, cả 3 `available: false`; bản chữ cần 7 mục (Tình trạng · Model · Thao tác · Prompt · Bộ ví dụ · Chi phí · Các lần gọi) | `apps/admin/src/app/nav.ts:36-38`; `bc:569` |
| Client admin | Chưa có code gọi `/v1/admin/ai/*` (grep `admin/ai` trong `apps/admin/src` ra 0 file; control: grep `/v1/admin` ra 5 file) | `apps/admin/src/api/` |

Hôm nay hai quyền trùng người (chỉ `admin` có cả hai, `apps/api/src/identity/identity.types.ts:9-15`), nên lệch này chưa gây lỗi, nhưng nav nên dùng `settings.manage`.

## Thiếu / lệch

1. **MISSING — số lần chạy thử còn lại** ("Còn 17/20…"): rule `ai.test` 20/giờ có và dùng chung với chạy bộ ví dụ, nhưng không API/header nào trả số đã dùng; chỉ 429 `rate-limited` + `Retry-After` khi vượt. Cửa sổ là giờ tròn theo đồng hồ (`rate-limiter.service.ts:23-24`). `ASSUMPTION` (chưa kiểm): request bị 400/409 sau guard vẫn bị đếm, vì guard chạy trước handler.
2. **MISSING — câu chặn cố định**: chỉ là hằng `PROMPT_GUARD` (`ai/prompts/prompt-rules.ts:9`); GET prompt không trả.
3. **DIFFERS — email người thao tác**: prompt `updated_by`/`saved_by`, ví dụ `created_by`, lần chạy `started_by` chỉ là UUID; bản seed dùng `AI_SYSTEM_ACTOR_ID` (không phải user). Lưu ý bản chữ A/82 không có cột người lưu, nhưng design đợt giao diện §10 hẹn thêm email.
4. **DIFFERS — hai lỗi thinking** không có mã `type` riêng: cả hai là 400 `validation-failed`, chỉ khác chuỗi violation (`model-rules.ts:30,32`).
5. **DIFFERS — A/81 phải ghép 2 API**: item thao tác không có danh sách mức effort và cờ tắt thinking; lấy `effort_choices`, `thinking_off_available` từ GET models. GET operations sắp a→z, không theo thứ tự 6 thao tác.
6. **DIFFERS — lỗi API có mà bản chữ chưa có câu**: 422 `model-not-found`, 422 `model-not-supported`, 503 `provider-unavailable` (thêm/đọc lại model); 409 `provider-not-configured`, 400 `model_ref`/`effort` (PUT thao tác); 409 `model-not-set` (chạy thử, chạy bộ ví dụ); 400 "cần ít nhất một ví dụ"; 400 "tối đa 100 ví dụ".
7. **DIFFERS nhỏ**: lần chạy bộ ví dụ chỉ có `cost_usd` (không ₫); `status.thinking` dùng `disabled`/`between_tools` còn API thao tác dùng `off`; "Lỗi gần nhất" gồm cả lỗi chạy thử/bộ ví dụ, không giới hạn ngày; `content = null` ở A/86 không phân biệt "đã xóa" với "không lưu".
8. **Lệch quyền ở admin web**: `nav.ts` dùng `roles.manage` cho AI, API cần `settings.manage`; nav có 3 mục AI (đều `available:false`) thay vì 7; chưa có client gọi API AI.
9. **OK**: đủ 6 thao tác ở status và operations, cả 6 seed `model_ref` NULL; model có lifecycle, `info_checked_at`, ước tính, `used_by`, refresh, sửa giá, xóa 409 `model-in-use`; 409 `operation-settings-conflict`, 409 `prompt-revision-conflict`; ≤8.000 ký tự, ≤10 ví dụ, `input_fields`, `revision`, lịch sử phân trang có đủ chữ để [Xem]; eval ≤100 ví dụ, chạy `current`/nháp, đủ trường lần chạy; chi phí ≤366 ngày, 5 kiểu nhóm, 4 cột token, ₫, `unknown_cost_calls`; các lần gọi đủ cột kèm `expires_at`.
