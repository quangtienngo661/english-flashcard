# Review plan Bước 6 (AI Integration, chỉ API): trước khi chủ dự án duyệt (20/10/2026)

**Đã đọc:**
- Plan [`../plans/2026-10-20-buoc-6-ai-integration.md`](../plans/2026-10-20-buoc-6-ai-integration.md) (1.204 dòng, nhánh `docs/buoc-6-plan` @ `b8b44bc`).
- Bản tóm tắt [`../../deliveries/buoc-6.md`](../../deliveries/buoc-6.md).
- Design [`../specs/2026-10-20-buoc-6-ai-integration-design.md`](../specs/2026-10-20-buoc-6-ai-integration-design.md), decision record, review design.
- Mẫu trình bày: [review plan Bước 5](2026-10-19-buoc-5-plan-review.md).

"Plan dòng N" và "design dòng N" là số dòng của file trên đĩa. Mọi đường dẫn code tính từ `apps/api/` trừ khi ghi khác.

**Cách làm:** hai reviewer độc lập chạy song song.
- **Reviewer 1** so plan với design: độ phủ §4–§17, B6E1–B6E96, B6#1–B6#30, độ khớp interface giữa các task, chia phiên, phụ lục A, bản tóm tắt.
- **Reviewer 2** so plan với code và thư viện thật:
  - Code `apps/api` ở `origin/dev` @ `331c1d0`.
  - Thư viện đã cài trong checkout chính (lockfile giống hệt): `@nestjs/core@12.1.2`, `bullmq@6.3.12`, `ioredis@6.0.0`, `@prisma/adapter-pg@7.10.0`, `pg-pool@3.14.0`, `prisma@7.10.0`.
  - `openai@7.39.0` và `@anthropic-ai/sdk@0.135.0` đọc từ unpkg; pnpm 11.6.0; trang lỗi và trang rate-limits của OpenAI, Anthropic.

Claude (phiên viết plan) đã **tự kiểm lại trong phiên** các phát hiện nặng nhất:
- `validatePositiveInteger('timeout', …)` có ở `openai/client.js:769, 1220` và `anthropic/client.js:900`. Hàm này ném lỗi `must be an integer` (`openai/internal/utils/values.js:47-53`).
- Chạy thử bằng `node`: `AbortSignal.timeout(1234.5)` và `AbortSignal.timeout(-1)` đều ra `ERR_OUT_OF_RANGE`; `AbortSignal.timeout(1234)` chạy được (đối chứng).
- Chữ ký `retrieve(modelID, params?, options?)` có trong `anthropic/resources/models.d.ts:18`.
- Hai SDK tự đọc biến môi trường: `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN` (`anthropic/client.js:102, 119`); `OPENAI_BASE_URL`, `OPENAI_ORG_ID`, `OPENAI_LOG` (`openai/client.js:183, 247`).
- Trang error-codes của OpenAI có câu "The broader `error.type` can still be `insufficient_quota`".
- Sink log ghi ra stdout (`common/common.module.ts:15`); helper `fakeAi` của smoke Bước 5 lọc theo `line.startsWith('{')` (`scripts/smoke-buoc-5.mjs:146-149`).

**Không làm:** không build, test, chạy server, chạy migration hay `pnpm add`. Không có lần gọi thật nào tới nhà cung cấp.

**Phạm vi:** plan ↔ design, interface giữa các task, chia phiên, plan ↔ code, build được, chạy đua, test làm được, quyền riêng tư. Không bàn lại D1–D25 và R1–R17; một quyết định chỉ được nêu khi plan làm khác nó.

**Kết quả:** 1 cao, 9 trung bình, 17 thấp; 3 câu cần chủ dự án quyết (cuối file; câu 1 chính là P1 của plan).

**Đã đúng như plan nói** (reviewer 2 kiểm, không thành phát hiện):
- **Chống gọi trùng (Task 12) an toàn trước chạy đua.** `INSERT … ON CONFLICT DO NOTHING`, giành lại có điều kiện `attempt_id`, xóa dòng hết hạn rồi giành, lời gọi cũ xong muộn: đều chỉ một bên thắng ở READ COMMITTED.
- **Không task nào giữ transaction trong lúc gọi nhà cung cấp.** Handler `@Idempotent()` chạy trên connection riêng, nên dòng `ai_eval_runs` đã commit trước khi `enqueue`.
- Mọi tên trường log plan đổi đều không bị logger che.
- CHECK, dòng seed và cột `TEXT[]` không làm hỏng bước kiểm drift của CI.
- Nest lấy được mọi thứ `AiModule` cần: `CommonModule` global, `IdentityModule` export bảng quyền.
- Phần lớn bảng "Verified" đúng.

## Bảng tóm tắt

| # | Mức | Task | Điểm |
|---|---|---|---|
| 1 | cao | 8, 9, 12 | "Thời gian còn lại" là số lẻ (đo bằng `performance.now()`), có thể âm. Cả hai SDK và `AbortSignal.timeout` đều từ chối, nên **mọi lời gọi thật thành `connection` mà không có request nào được gửi**. Không test nào bắt được |
| 2 | trung bình | 12, 17 | Sổ `ai_calls` ghi **trước** bước kiểm khuôn, nên lời gọi sai khuôn bị ghi `succeeded`. Trang tình trạng không thấy lỗi |
| 3 | trung bình | 6, phụ lục A | Lời dặn gọi `level` là "trình độ người học"; design §5.1 nói đó là level **của từ** (`null` = từ riêng). Bản nháp còn tự chọn "null → B1" |
| 4 | trung bình | 13, 16, 17 | Thiếu 404 `not-found` design yêu cầu cho API 4–6, 15, 17. Sửa/xóa một model vừa bị người khác xóa → 500 |
| 5 | trung bình | 9 | Anthropic `models.retrieve(id, params?, options?)`: plan đặt request options vào chỗ `params`, nên build lỗi. Nếu ép kiểu cho qua thì mất timeout 5 s |
| 6 | trung bình | 8, 9 | Client SDK tự đọc biến môi trường (`ANTHROPIC_BASE_URL` đang đặt trên máy này, `*_LOG`, `OPENAI_ORG_ID`…). Request có thể đi tới host khác; log debug ghi cả body |
| 7 | trung bình | 9, design §4.3 | "Anthropic 429 không có `retry-after` → `provider_quota`" xếp nhầm cả 429 thường. Trang chính thức nói chỉ `error_code` mới phân biệt được |
| 8 | trung bình | 8 | OpenAI hết tiền có thể chỉ mang `error.type = insufficient_quota`. Plan chỉ xét `code`, nên rơi về `rate_limited` và bị thử lại |
| 9 | trung bình | 19, 20 | stdout của `ai:fake-call` lẫn dòng log `ai_call` (JSON) với dòng kết quả. Helper chép từ smoke Bước 5 sẽ đọc nhầm |
| 10 | trung bình | 3, 9, 13 | `effort_levels text[]?`: Prisma 7 không cho list có `?`, nên không phân biệt được "chưa biết" với "không có effort" |
| 11 | thấp | 12, 19 | Luồng chạy thử và bộ ví dụ không kiểm dữ liệu vào. Design chỉ bỏ phần *lưu* của bước 2 |
| 12 | thấp | 10 | `CallQueue` không đọc lại giới hạn khi trả chỗ (design §8.4); tăng giới hạn không mở ngay cho người đang chờ |
| 13 | thấp | 10, 12, 16, 19 | Interface lệch nhỏ: `classify`, `decideRetry`, `Selection.modelRef`, kiểm nhà cung cấp khi có selection truyền vào, ai cung cấp `CallQueue`, cột của `storeFinal`, CLI import sâu `RunnerService` |
| 14 | thấp | 16, 19 | Bước kiểm tay cần đã chọn model (PR E1), nhưng cột "Waits for" không ghi |
| 15 | thấp | 18 | Giành dòng bằng `info_checked_at = :old`: Postgres giữ µs, JS chỉ có ms → có thể không bao giờ khớp |
| 16 | thấp | 12, 20 | B6#11 có thể chập chờn: lời gọi thứ hai được chỗ vài ms trước hạn → `timeout` thay vì `busy` |
| 17 | thấp | 16 | Lần chạy bộ ví dụ chốt `total` lúc tạo nhưng job đọc tập ví dụ lúc chạy; tổng kết sau khi chạy tiếp chưa định nghĩa |
| 18 | thấp | 16, 20 | Queue, Worker, kết nối `ai-eval` phải có `on('error')`; thiếu thì worker chết khi tắt Redis (B6#30) và `run-dev` tắt luôn API |
| 19 | thấp | brief điều phối | Không đặt `JOB_QUEUE_PREFIX` riêng mỗi phiên trên Redis dùng chung; worker phiên khác có thể nhặt job `ai-eval` |
| 20 | thấp | 4–17 | Thiếu test hoặc thiếu một vế cho B6E3, B6E10, B6E20, B6E60, B6E68, B6E84, B6E89, B6E90; không ghi vì sao B6E28, B6E42, B6E71, B6E77 không có test |
| 21 | thấp | 11, 12, 13, 16 | Sáu lựa chọn hành vi chưa có trong danh sách plan choices (và bản tóm tắt) |
| 22 | thấp | 7–9, 11 | `effort: string` không gán được vào kiểu union của SDK; test B6E67 quên các trường logger tự thêm; tên `max_output_tokens` trong log sẽ bị che |
| 23 | thấp | 8, 9 | Bẫy khi viết test bằng stub `fetch`: thiếu `object: 'response'` và content-type JSON; reject không đúng kiểu thì ra `connection` thay vì `timeout` |
| 24 | thấp | 18 | Step 4 "`maintenance:run` exits 0" không chứng minh gì (CLI luôn thoát 0) |
| 25 | thấp | 3, 6, 14, 16, 20 | Bước chạy tay: máy không có `psql`; không nói lấy token admin thế nào; đăng ký chỉ 5 lần/giờ mỗi IP khi chạy lại smoke |
| 26 | thấp | 20 | B6#25 ghi "17 routes"; §12.1 thực ra có **21** route |
| 27 | thấp | bảng Verified, 2, tóm tắt, phụ lục A | Vài số dòng lệch; pnpm 11 không "refuse" mà ghi thêm vào `pnpm-workspace.yaml`; dòng "pool 10" giờ đã kiểm được; bản tóm tắt có tên hàm; bản nháp phụ lục A dễ thành "đề xuất trước" |

Đã giải quyết ngoài plan: design §20 (`CLAUDE.md` dòng kiến trúc AI, HANDOFF §2) đã làm ở PR #81, merge vào `dev` (merge commit `a37853d`). Reviewer 1 nêu điểm này vì chưa biết.

## Phát hiện

### 1. (cao) Task 8, 9, 12: `timeout` nhận số lẻ hoặc số âm

**Sai ở đâu.**
- Plan dòng 168 tính thời gian trong một lần chạy bằng `performance.now()`.
- Task 12 (dòng 764-765) đặt `timeoutMs` = thời gian còn lại và gọi adapter với `AbortSignal.timeout(time left)`.
- Task 8 và 9 truyền thẳng số đó cho SDK: `{ timeout: req.timeoutMs, signal, maxRetries: 0 }` (dòng 548, 600).

Thời gian còn lại = quỹ − (`performance.now()` − lúc bắt đầu), nên gần như luôn là số lẻ, và có thể âm. Hai SDK kiểm `timeout` cho mọi request (`openai/client.js:1220`, `anthropic/client.js:900`) và ném `… must be an integer` (`values.js:47-53`). `AbortSignal.timeout(1234.5)` ra `ERR_OUT_OF_RANGE` (đã chạy).

**Vì sao quan trọng.**
- Lỗi SDK ném ra là `OpenAIError`/`AnthropicError`, không phải `APIError`. Plan quy loại này thành `connection` (dòng 560, 605), nên nó được thử lại, rồi ném lần nữa.
- Khi chủ dự án bỏ key thật vào `.env`, Lan bấm "Tạo câu" lần nào cũng nhận "chưa tạo được". Sổ có hai dòng `connection`, mà không request nào được gửi đi.
- Không gì trong plan bắt được lỗi này: test adapter dùng số nguyên, bản giả bỏ qua `timeoutMs`, smoke chỉ chạy bản giả, D19 không có lần gọi thật.

**Đề xuất sửa plan.**
- Task 12: `leftMs = Math.floor(deadline − performance.now())`, tính một lần cho mỗi lần gọi và dùng chung cho `AbortSignal.timeout` và `timeoutMs`.
- `leftMs < 1` → không gọi adapter, không ghi `ai_calls`, trả `timeout`.
- `AdapterRequest.timeoutMs` ghi rõ "integer ≥ 1".
- Thêm test runner: `the adapter always receives an integer timeoutMs ≥ 1`, và `a deadline already passed → no adapter call`.
- Thêm test adapter: `timeoutMs 1234 → the stub fetch is called once`.

### 2. (trung bình) Task 12, 17: lời gọi sai khuôn bị ghi sổ là `succeeded`

**Sai ở đâu.**
- Plan choice 2 (dòng 187-189) có `outcome` = `invalid-shape` và `stopped`.
- Nhưng bước 6 của runner `record` mỗi lần gọi trước bước 7 `parseOutput` (dòng 764-767), lúc chưa biết khuôn đúng hay sai.
- Design dòng 576 chỉ loại `busy`, `in_progress`, `ai-disabled`, `daily-call-cap`, `bad-input` khỏi "lỗi gần nhất". Vậy `invalid-shape` phải hiện ở đó.

**Vì sao quan trọng.** Admin chọn một model hay trả câu có hai chỗ trống. Lan bấm 20 lần, lần nào cũng "chưa tạo được". Trang tình trạng vẫn báo không lỗi, `failed_calls = 0`. Smoke B6#7 vẫn xanh, vì chỉ đếm số dòng.

**Đề xuất sửa plan.**
- Với outcome `ok`, gọi `parseOutput` trước `record`, và ghi `outcome = invalid-shape` khi parse hỏng. An toàn, vì `invalid-shape` không bao giờ được thử lại.
- Chữ ký `callOutcome(outcome, shape: 'ok' | 'invalid')`.
- Test Task 12: `B6#7: two blanks → one record with outcome invalid-shape`; `stopped → record stopped, result invalid-shape`.
- Test Task 17: `an invalid-shape call shows as last_error`.
- Smoke B6#7: đọc lại `outcome` của dòng sổ.

### 3. (trung bình) Phụ lục A: nghĩa của ô `level` ngược với design §5.1

**Sai ở đâu.**
- Plan dòng 1115: "level: the learner's CEFR level (A1 to C2), or null when unknown".
- Plan dòng 1126: "When level is null, write at level B1".
- Design dòng 297: "`level` | `A1`–`C2`, hoặc `null` (từ riêng không có level)". Đây là level của **nghĩa / từ**.

**Vì sao quan trọng.**
- Bước 7 đọc lời dặn để biết gửi gì vào ô này; dặn "trình độ người học" dễ khiến Bước 7 gửi sai thứ.
- Với từ riêng, bản nháp tự chọn B1. Ví dụ: Lan (A2) lưu từ riêng "serendipity" rồi bấm "Tạo câu", AI viết câu mức B1. Đây là lựa chọn sản phẩm nằm sẵn trong bản nháp, nên chuyển thành câu Q2.

**Đề xuất sửa plan.**
- Mô tả ô thành "the CEFR level of this word's meaning, or null when the word has no level (a word the learner added)".
- Viết câu "When level is null, …" sau khi chủ dự án trả lời Q2.

### 4. (trung bình) Task 13, 16, 17: thiếu 404 `not-found`

**Sai ở đâu.**
- Design dòng 618: `not-found` 404 cho API 4–6, 15, 17.
- Task 13 (`update`, `refresh`, `remove`) không nói về id không tồn tại.
- Task 16 không ghi 404 cho `GET /runs/:id`.
- Task 17 không nói mã không có lời gọi nào thì trả gì.
- Không có ánh xạ chung P2025 → 404 trong code: chỉ `identity.service.ts:107` tự bắt riêng.

**Vì sao quan trọng.** Admin A xóa `fake:ok`, cùng lúc admin B bấm sửa giá. Prisma `update` ném P2025 → 500, trái luật "never 500".

**Đề xuất sửa plan.**
- Task 13: id không có → 404 (kiểm trước; P2025 cũng ánh xạ về 404), kèm test.
- Task 16: `GET /runs/:id` không có → 404, kèm test.
- Task 17: mã không có lời gọi → `items: []` (`not-found` của API 17 hiểu là không có gì để trả), ghi thành plan choice.
- Thêm test `provider-not-configured` cho API 5, 11, 14 và `provider-unavailable` cho API 5.

### 5. (trung bình) Task 9: Anthropic `models.retrieve` gọi sai chữ ký

**Sai ở đâu.**
- Plan dòng 611: `client.models.retrieve(id, { timeout, signal, maxRetries: 0 })`.
- SDK: `retrieve(modelID, params?, options?)` (`resources/models.d.ts:18`). `params` chỉ nhận `betas`, `workspace_id`.
- OpenAI thì đúng: `retrieve(model, options?)`.

**Vì sao quan trọng.** `tsc` báo lỗi. Nếu ép kiểu cho qua, mất timeout 5 s và `maxRetries: 0`: thêm model Anthropic có thể treo tới 10 phút cộng 2 lần thử lại (B6E94 sai).

**Đề xuất sửa plan.**
- Sửa thành `client.models.retrieve(id, {}, { timeout: AI_DESCRIBE_TIMEOUT_MS, signal, maxRetries: 0 })`.
- Ghi chữ ký này vào bảng Verified.

### 6. (trung bình) Task 8, 9: client SDK tự đọc biến môi trường

**Sai ở đâu.** Factory chỉ truyền `{ apiKey, maxRetries: 0, fetch }` (dòng 542, 593).
- Anthropic tự đọc `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_LOG`, `ANTHROPIC_CUSTOM_HEADERS`.
- OpenAI tự đọc `OPENAI_BASE_URL`, `OPENAI_ORG_ID`, `OPENAI_PROJECT_ID`, `OPENAI_LOG`, `OPENAI_CUSTOM_HEADERS`.
- Ở mức log `debug`, OpenAI ghi cả body request.
- Shell của các phiên Claude Code trên máy này có đặt `ANTHROPIC_BASE_URL` (reviewer kiểm là có đặt, không đọc giá trị).

**Vì sao quan trọng.**
- Test adapter Anthropic chạy trong phiên Claude sẽ gửi tới host khác: xanh trên CI, đỏ trên máy.
- Sau này, khi có key thật, API khởi động từ một shell như vậy sẽ gửi key và chữ của người học tới host trong biến đó.
- `OPENAI_LOG=debug` ghi lời dặn và dữ liệu ra stdout, trái SR10.

**Đề xuất sửa plan.**
- Factory truyền tường minh:
  - OpenAI: `baseURL: 'https://api.openai.com/v1'`, `organization: null`, `project: null`, `logLevel: 'warn'`.
  - Anthropic: `baseURL: 'https://api.anthropic.com'`, `authToken: null`, `logLevel: 'warn'`.
- Test: đặt các biến môi trường đó, rồi kiểm stub `fetch` nhận đúng host và không có header lạ.

### 7. (trung bình) Task 9, design §4.3: mọi 429 không có `retry-after` bị coi là hết tiền

**Sai ở đâu.**
- Plan choice 4 (dòng 191-193) và Task 9 (dòng 607-608) coi 429 có `enforced_spend_limit_reached` **hoặc** không có `retry-after` là `provider_quota`. Design dòng 228 cũng ghi vậy.
- Trang rate-limits (đọc 20/10) nói: "Not every 429 carries it; the spend-cap 429 never does", và muốn tách hai loại thì dùng `error.details.error_code`.

**Vì sao quan trọng.** Một 429 tạm thời không kèm `retry-after` (ví dụ giới hạn tăng tốc) thành "chưa dùng được". Hệ quả: không thử lại nhanh, log `ai_provider_quota`, trang tình trạng báo hết tiền sai.

**Đề xuất sửa plan.**
- Chỉ coi là `provider_quota` khi: `error_code = enforced_spend_limit_reached`, 400 có câu "You have reached your specified…", hoặc 402.
- Mọi 429 khác → `rate_limited`.
- Đây là sửa một dòng của design §4.3 (phần kỹ thuật, design ghi theo tài liệu chưa đọc kỹ). Ghi vào design và decision record khi chủ dự án duyệt review này.

### 8. (trung bình) Task 8: OpenAI hết tiền có thể chỉ ghi ở `error.type`

**Sai ở đâu.** Task 8 (dòng 556-557) chỉ xét `code` thuộc 4 mã. Trang error-codes: "The broader `error.type` can still be `insufficient_quota`."

**Vì sao quan trọng.** 429 `type: insufficient_quota` với `code` khác hoặc rỗng sẽ thành `rate_limited`, bị thử lại (tốn thêm một lời gọi), và không ai được báo `provider-quota`.

**Đề xuất sửa plan.** Thêm điều kiện: 429 với `type === 'insufficient_quota'` → `provider_quota`, kèm một fixture.

### 9. (trung bình) Task 19, 20: stdout của `ai:fake-call` lẫn log

**Sai ở đâu.**
- `CallLedger.record` log `ai_call` ở mức info.
- Sink của `AppLogger` ghi JSON ra **stdout** (`common.module.ts:15`); `logger: ['error']` của CLI chỉ tắt logger của Nest.
- Helper `fakeAi` của smoke Bước 5 lấy mọi dòng bắt đầu bằng `{` (`smoke-buoc-5.mjs:146-149`). Ở Bước 5 cách này chạy được vì `reserve` không log info.

**Vì sao quan trọng.** Bước "race" và các chỗ đọc `[0].result` sẽ đọc phải dòng log, nên smoke đỏ hoặc kiểm sai.

**Đề xuất sửa plan.**
- Mỗi dòng kết quả mang `"kind": "ai_fake_call"`, smoke lọc theo dấu này.
- Hoặc CLI đổi sink log sang stderr.
- Đổi chữ "one JSON line per call" cho khớp.

### 10. (trung bình) Task 3, 9, 13: cột `effort_levels text[]?` không viết được bằng Prisma

**Sai ở đâu.**
- Plan dòng 319 và `ModelInfo.effortLevels: string[] | null` (dòng 505) cần phân biệt `null` (chưa biết) với `[]` (không có effort).
- Prisma 7.10 từ chối list có `?` ("Optional lists are not supported"). `String[]` không ghi được `null` qua client.

**Đề xuất sửa plan.**
- `effortLevels String[] @default([])` cộng cột `capabilitiesKnown Boolean?`.
- Hoặc ghi rõ "chưa biết = `[]`" và đổi kiểu `ModelInfo.effortLevels` thành `string[]` (Task 13 vốn đã dùng `?? []`).
- Sửa dòng 319, 505, 615 cho khớp.

### 11. (thấp) Task 12, 19: chạy thử và bộ ví dụ không kiểm dữ liệu vào

**Sai ở đâu.**
- Design dòng 481-482: chạy thử và bộ ví dụ bỏ qua "bước 2 **phần lưu**", tức vẫn kiểm dữ liệu.
- Luồng test/eval của Task 12 (dòng 770-773) không gọi `validateInput`.
- Task 19 còn nói CLI không kiểm vì "the gate does it", nhưng ở luồng test cổng không kiểm.

**Đề xuất sửa plan.**
- Luồng test/eval: `validateInput` trước → `bad-input` (không lưu, không gọi, không ghi sổ).
- Thêm test `purpose test with a 150-character word → bad-input, no record`.

### 12. (thấp) Task 10: `CallQueue` không đọc lại giới hạn khi trả chỗ

Design dòng 505 (R12) nói đọc lại giới hạn cả lúc xin lẫn lúc trả chỗ. Plan dòng 671-673 chỉ lưu giới hạn lúc `acquire`. Admin nâng 5 → 50 khi 30 lời gọi đang chờ: các lời gọi đó vẫn xả 5 một, một phần nhận `busy` oan.

**Đề xuất sửa plan.**
- `acquire(getLimit: () => number, deadlineAtMs)`, gọi `getLimit` cả lúc xin lẫn lúc trả (đọc giá trị settings đã đọc gần nhất).
- `acquire` có giới hạn cao hơn thì đánh thức người chờ tới mức mới.
- Test `raising the limit wakes waiters at once`.

### 13. (thấp) Interface lệch nhỏ giữa các task

- **`classify`** (dòng 661-662) không nhận `bad-input`, nhưng test đòi một dòng `bad-input` (dòng 681-682). Sửa: thêm `{ kind: 'bad-input' }` vào chữ ký.
- **`decideRetry`**: test có `invalid-shape → no`, nhưng kiểu đầu vào không có `invalid-shape`. Sửa: bỏ hàng đó khỏi test, hoặc thêm vào kiểu.
- **`Selection.modelRef: string`** bắt buộc, nhưng bảng `ai_eval_runs` không có `model_ref`. Sửa: `string | null`.
- **Kiểm nhà cung cấp:** khi `selection` được truyền vào (job bộ ví dụ), registry có thể không có nhà cung cấp đó (bản giả vừa tắt). Sửa: kiểm cho mọi selection.
- **`CallQueue`** "provided by AiModule", nhưng không task nào ghi việc này vào Files. Sửa: Task 12 provide.
- **`storeFinal`** không nói ghi cột nào. Nếu quên `expires_at`, dòng `bad-input` không bao giờ hết hạn (B6E24 sai). Sửa: ghi đủ `attempt_id, started_at, deadline_at, finished_at, expires_at = now + RESULT_TTL_MS`.
- **Task 19** dùng `RunnerService` nhưng `index.ts` không export; CLI sẽ phải import sâu. Sửa: thêm `AiService.runAdminTest(op, data, actorId)` dành cho admin/CLI, export qua `index.ts`.

### 14. (thấp) Task 16, 19: bước kiểm tay cần PR E1

Task 16 Step 4 và Task 19 Step 4 cần một thao tác đã chọn model, tức API của PR E1. Bảng phiên không ghi điều này.

**Đề xuất sửa plan.** Ghi sẵn câu SQL chọn model cho bước kiểm tay (thêm dòng `ai_models` `fake:ok` rồi cập nhật `ai_operation_settings`), để không phải chờ E1.

### 15. (thấp) Task 18: giành dòng bằng so sánh timestamp

`WHERE info_checked_at = :old` với `:old` là JS `Date` (ms), còn cột `timestamptz` giữ µs. Một lần ghi bằng `now()` của SQL hay default DB là phép so không bao giờ khớp nữa, và việc làm mới model im lặng dừng (B6E41 không còn cảnh báo).

**Đề xuất sửa plan.** `UPDATE ai_models SET info_checked_at = :now WHERE id = :id AND info_checked_at < :now − interval '24 hours' RETURNING id`.

### 16. (thấp) Task 12, 20: B6#11 có thể chập chờn

Lời gọi giữ chỗ trả chỗ sau khi hết giờ **và** ghi xong sổ; lời gọi đang chờ có mốc hết hạn riêng, lệch vài ms. Nếu nó được chỗ khi còn 2 ms thì sẽ gọi `fake:slow` và ra `timeout`, trong khi smoke đòi `busy`.

**Đề xuất sửa plan.** Sau `acquire`, nếu còn dưới `MIN_RETRY_BUDGET_MS` (2 giây) thì trả chỗ và ra `busy` (không gọi, không ghi sổ). Ghi thành plan choice, kèm test.

### 17. (thấp) Task 16: tập ví dụ và tổng kết của một lần chạy

**Sai ở đâu.**
- `total` = số ví dụ lúc tạo, nhưng job đọc tập ví dụ **lúc chạy**, có thể sau 10–60 phút (B6E91).
- Sau khi chạy tiếp (B6E93), `valid_count`, `avg_latency_ms`, `cost_usd` tính từ đâu chưa nói.

**Vì sao quan trọng.** Chủ dự án bấm chạy 3 ví dụ, rồi thêm ví dụ thứ 4 trong lúc Redis tắt. Kết quả: `total 3` nhưng có 4 mục và 4 lần tốn tiền, nên không so được hai lần chạy với nhau.

**Đề xuất sửa plan.**
- Lưu `example_ids` vào dòng lần chạy lúc tạo; job chỉ chạy đúng danh sách đó (ví dụ đã bị xóa → mục lỗi `example-deleted`).
- Tổng kết tính bằng SQL từ toàn bộ `items`.
- Test `an example added after create is not run`.

### 18. (thấp) Task 16: listener `error` của hàng đợi

BullMQ phát sự kiện `error`; thiếu listener thì tiến trình chết. `run-dev.mjs` tắt luôn tiến trình còn lại khi một tiến trình thoát, nên B6#30 (tắt Redis) đỏ.

**Đề xuất sửa plan.** Ghi rõ `.on('error', warn)` cho Queue, Worker và mỗi kết nối Redis, như `reminder-queue.service.ts:57, 66, 93`.

### 19. (thấp) Brief điều phối: `JOB_QUEUE_PREFIX` riêng mỗi phiên

Brief tạo DB riêng cho từng phiên nhưng để prefix mặc định `wordmet` trên một Redis dùng chung. Các lần chạy tay trước đây đều đặt prefix riêng (`buoc-2-5-test-flow.md:45`, `buoc-3-test-flow.md:22`).

**Đề xuất sửa plan.** Brief ghi `JOB_QUEUE_PREFIX=wordmet-b6-<a|b|c>`; smoke dùng `wordmet-b6-smoke`.

### 20. (thấp) Một số B6E thiếu test hoặc thiếu một vế

**Thiếu test:**
- B6E10: mã `<uuid>#2` có quỹ riêng; `run` chấp nhận `#`.
- B6E90: N lần kiểm khi số đếm = trần − 1 đều qua.

**Thiếu một vế:**
- B6E3: jitter rút trong khoảng 250–750 ms.
- B6E20: `bad-input` gọi lại thì trả lỗi cũ mà không gọi nhà cung cấp.
- B6E60: lần gọi kế tiếp dùng chữ mới.
- B6E68: báo cáo tổng giữ nguyên sau khi xóa dữ liệu một người.
- B6E84: chạy thử hiện `truncated`.
- B6E89: lời gọi chạy thử vẫn tính vào số đếm.

**Không cần test riêng, nhưng plan chưa ghi lý do:**
- B6E28, B6E42: đúng sẵn do cách làm (đếm theo tiến trình; không có code tự chuyển nhà cung cấp).
- B6E71: đã phủ bởi B6#30.
- B6E77: việc của Bước 7, ghi vào phần ghi chú Bước 7 của as-built.

**Đề xuất sửa plan.** Thêm các test trên vào Task 10, 11, 12, 15, và một dòng ghi lý do cho bốn ca còn lại.

### 21. (thấp) Lựa chọn hành vi chưa ghi vào plan choices

Các chỗ sau chưa có trong danh sách plan choices, nên sẽ không được chép vào design as-built (Task 20):
- Trần = 0 → `daily-call-cap` **không** kèm `retry_after_seconds`. Design dòng 352 và 511 đọc được theo hai cách.
- `AiService.run` ném `TypeError` khi mã thao tác hoặc `userId` sai, trong khi design ghi `run` → `AiResult`.
- Chạy bộ ví dụ khi thao tác chưa có ví dụ nào → 400.
- `refresh` trả 422 `model-not-found` / `model-not-supported` (design chỉ ghi cho API 3).
- Hằng số mới: `MODEL_NOTE_MAX`, `EVAL_NOTE_MAX`, `PRICE_MAX`, `OPERATION_ID_PATTERN`.
- Cách xử lý model Anthropic không cho biết số token tối đa: xem Q3.

**Đề xuất sửa plan.** Thêm thành plan choices 18–22 (Q3 sau khi chủ dự án trả lời) và thêm vào bản tóm tắt.

### 22. (thấp) Kiểu dữ liệu và trường log

- `AdapterRequest.effort: string | null` không gán được vào `ReasoningEffort` / `OutputConfig.effort` của SDK. Thu hẹp kiểu bằng một hàm guard trong hai hàm `build…Request`.
- Test B6E67 "exactly the listed fields" phải tính cả `level`, `event`, `operation_id` mà logger tự thêm.
- Không đặt tên trường log là `max_output_tokens`, vì chữ `token` sẽ bị che.

### 23. (thấp) Bẫy khi viết test với stub `fetch` (Task 8, 9)

- Fixture OpenAI phải có `object: 'response'`, nếu không SDK không thêm `output_text`.
- Mọi fixture phải có header `content-type: application/json`.
- Khi bị hủy, stub phải reject bằng `init.signal.reason` (một `AbortError`). Reject bằng lỗi thường thì SDK ra `APIConnectionError` → `connection`, không ra `timeout`.

### 24. (thấp) Task 18 Step 4

`maintenance:run` luôn thoát 0 (`cli/run-maintenance.ts:9-10`). Thêm vào bước kiểm: "và output không có `maintenance_job_failed`".

### 25. (thấp) Các bước chạy tay

- Máy không có `psql`. Mọi lệnh phải là `docker compose -p english-learning exec -T postgres psql -U dev -d <db> -tA -c …`.
- Task 14 và 16 Step 4 cần token admin: đăng ký → OTP qua Mailpit → `pnpm admin:grant`.
- Task 20: `auth.register.ip` chỉ cho 5 lần/giờ. Khi chạy lại smoke nhiều lần, tạo lại DB như Step 2 (bộ đếm nằm trong DB).

### 26. (thấp) Task 20: B6#25 có 21 route

§12.1 gộp vài route vào một hàng: hàng 13 có 4 route, hàng 15 có 2. Tổng là **21** route, không phải 17 (reviewer 1 đếm 22; Claude đếm lại từng hàng ra 21). Ghi "each of the 21 routes" và liệt kê đủ.

### 27. (thấp) Bảng Verified, Task 2, bản tóm tắt, phụ lục A

**Bảng Verified:**
- Số dòng idempotency đúng ra là: mặc định 30 s ở `:18`, `$transaction` ở `:30`, handler ở `:68`, timeout ở `:80`. Mã 202 giữ được vì Nest đặt `@HttpCode` trước interceptor; mỗi request `@Idempotent()` chiếm 2 connection.
- Số dòng helper của smoke: `psql` ở `:113`, `fakeAi` ở `:146`, `registerVerified` ở `:173`.
- Dòng "pool 10" chuyển sang mục đã kiểm: `adapter-pg/dist/index.mjs:776` tạo `pg.Pool`, `pg-pool/index.js:89` (max 10) và `:206` (không có timeout chờ connection).

**Task 2:** pnpm 11.6.0 mặc định `minimum-release-age` 1.440 phút, không ở chế độ strict. Với bản quá mới, nó **không từ chối** mà ghi thêm vào `minimumReleaseAgeExclude` trong `pnpm-workspace.yaml`. Hai bản đã chốt đều đã quá 24 giờ lúc review. Sửa câu "If pnpm refuses" thành "if pnpm adds entries to `pnpm-workspace.yaml`, revert them or list the file".

**Bản tóm tắt `buoc-6.md`:**
- Dòng 53 có tên hàm (`isReady`, `run`).
- Dòng 9 nói smoke đi đủ B6#1–B6#30, trong khi B6#19 và B6#26 là unit.
- Vài lựa chọn kèm lý do trong ngoặc.

**Phụ lục A:** bản nháp viết trọn bằng tiếng Anh trước khi chủ dự án trả lời P1, nên dễ thành "đề xuất trước". Ghi rõ ngôn ngữ của bản nháp chỉ là tạm, viết lại theo câu trả lời P1.

## Kết quả kiểm theo yêu cầu của phiên viết plan

| Yêu cầu | Kết quả |
|---|---|
| Task nhỏ theo TDD | Có; mỗi task có test trước, chạy, implement, chạy lại, commit |
| Brief cho phiên điều phối (D20) | Có; thiếu `JOB_QUEUE_PREFIX` (#19) |
| Task lời dặn ban đầu để chủ dự án duyệt (§7.5) | Có (Task 6, phụ lục A); nghĩa ô `level` sai (#3), chờ P1 và Q2 |
| `pnpm ai:fake-call`, `pnpm smoke:buoc-6` | Có (Task 19, 20); cần sửa #9, #16, #26 |
| Task cuối CI + smoke + as-built | Có (Task 20) |
| Plan tóm tắt trong `docs/deliveries/buoc-6.md` | Có; sửa nhỏ (#27) |
| Commit đã đọc ghi trong plan | Có (`331c1d0`) |
| Phiên bản SDK và `signal` kiểm trong phiên | Có, đúng; nhưng lộ ra #1, #5, #6 |

## Câu cần chủ dự án quyết

Luật Bước 6 (D1): chủ dự án trả lời trước, Claude đề xuất sau. Mỗi câu chỉ có bối cảnh và ràng buộc, không đánh dấu phương án nào.

**Q1 (= P1 của plan): Lời dặn ban đầu viết bằng tiếng gì?**
- Bối cảnh: lời dặn là đoạn chữ cố định gửi kèm mỗi lời gọi. Ban đầu nạp bằng migration; sau đó admin sửa trong trang admin (D12), dùng chung cho cả hai nhà cung cấp (D14).
- Câu chặn chèn lệnh nằm trong code: admin không sửa được, đổi ngôn ngữ của nó phải qua PR.
- Ràng buộc: ô `*_vi` luôn là tiếng Việt, câu luyện luôn là tiếng Anh; tên ô dữ liệu (`word`, `meaning_vi`…) giữ nguyên.
- Phương án: (a) tiếng Anh; (b) tiếng Việt; (c) cách khác chủ dự án đặt ra.

**Q2: Câu điền từ cho từ không có level (từ riêng của người học) nhắm trình độ nào?**
- Bối cảnh: design §5.1 gửi `level` = level của nghĩa (A1–C2), và `null` với từ riêng. Ví dụ: Lan (A2) lưu từ riêng "serendipity" rồi bấm "Tạo câu".
- Ràng buộc: giữ nguyên khuôn dữ liệu thì chỉ đổi chữ trong lời dặn (admin sửa lại được sau). Thêm một ô dữ liệu mới (ví dụ trình độ người học) là đổi design §5.1 và việc của Bước 7.
- Phương án:
  - (a) một mức cố định khi `level = null` (mức nào do chủ dự án đặt);
  - (b) không dặn trình độ khi `level = null`;
  - (c) thêm ô "trình độ người học" vào dữ liệu gửi đi, áp cho mọi câu;
  - (d) cách khác.

**Q3: Model Anthropic không cho biết số token tối đa, mà ô "số token tối đa" để trống (D25: trống = không giới hạn)?**
- Bối cảnh: Anthropic **bắt buộc** gửi một con số (`max_tokens`). D25 chốt: để trống thì gửi số tối đa của model, đọc lúc thêm model.
- API "xem một model" của Anthropic có thể trả `max_tokens: null`. Khi đó không có số nào để gửi.
- Plan hiện bắt admin phải điền số cho model đó (lưu lựa chọn bị từ chối nếu để trống). Plan còn mượn cận trên 128.000 của OpenAI.
- Ràng buộc: không gửi số thì Anthropic từ chối mọi lời gọi; một số tự chọn lớn thì lời gọi đắt nhất có thể rất đắt (§6.6).
- Phương án:
  - (a) bắt admin điền số cho riêng model đó (như plan);
  - (b) một số cố định trong code dùng khi model không cho biết;
  - (c) không cho thêm model Anthropic không cho biết số tối đa;
  - (d) cách khác.
