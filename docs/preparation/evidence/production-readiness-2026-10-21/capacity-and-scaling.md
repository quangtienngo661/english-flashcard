# Capacity và scaling — ghi chép (21/10/2026)

Nguồn: snapshot nhánh `dev` tại commit `985531b` (Merge PR #101). Mọi đường dẫn `apps/...`, `docs/...` dưới đây là **tương đối với
snapshot đó**, không phải working tree hiện tại. Chỉ đọc code và docs: không chạy server, test hay benchmark nào trong phiên này. Mọi con
số ghi "ước tính" là phép tính tay từ giả định có nhãn; mọi số đo là số đã ghi trong docs (máy CI hoặc máy dev), không phải số đo
production.

## Tóm tắt kết luận

**Với nhóm nhỏ (100–500 người đăng ký, 10–50 người học cùng lúc), một API instance nhỏ + một worker + Postgres managed nhỏ + Redis nhỏ là
đủ** (ước tính ở mục 8: tải đỉnh ~5–25 request/s, ~0,4 connection DB bận trung bình khi DB cùng region). Điều kiện để kết luận này đúng:

1. API và Postgres **cùng region**. Một lần trả lời flashcard tốn ~13 lượt hỏi DB nối tiếp (mục 3.2); nếu mỗi lượt mất 30 ms vì khác
   region thì mỗi request ~0,4 s và pool 20 bắt đầu chật ở ~50 request/s (ước tính).
2. `TRUST_PROXY` đặt đúng khi API đứng sau load balancer/proxy. Giới hạn theo IP đọc `request.ip`
   (`apps/api/src/common/rate-limit/rate-limit.guard.ts:26`, `apps/api/src/app.setup.ts:19`); `.env.example` để `TRUST_PROXY=false`
   (`apps/api/.env.example:47`). Sai thì mọi người dùng chung IP của proxy và `auth.login.ip` = 20 lần/phút
   (`apps/api/src/common/config/app-config.ts:109`) chặn cả app.
3. Redis đặt `maxmemory-policy noeviction` và bật persistence (AOF) — BullMQ docs yêu cầu (mục 5).
4. Nhà cung cấp email đủ hạn mức: đây là giới hạn cứng **chạm sớm nhất** khi người dùng tăng (mục 9, #1).

Những chỗ chậm đã biết (mở phiên "Ôn tất cả" 1,9–2,8 s ở mức dữ liệu lớn nhất, D39) chỉ ảnh hưởng **người học có rất nhiều từ**, không
tăng theo tổng số người dùng. API **chạy được 2+ instance** (state dùng chung nằm trong Postgres), với 3 lưu ý: giới hạn AI đồng thời tính
theo từng process, thư sau-response nằm trong RAM (cần tắt êm), và healthcheck không kiểm DB/Redis (mục 2).

Thứ tự gãy khi người dùng tăng (chi tiết mục 9): (1) hạn mức email/ngày → (2) đọc nặng của người học nhiều từ → (3) số connection Postgres
khi thêm instance → (4) ghi Postgres cho rate limit/idempotency/log → (5) giới hạn AI theo process (Bước 7) → (6) tìm từ `ILIKE '%q%'`
không index → (7) tick nhắc học quét mọi user → (8) worker CSV một luồng (chỉ admin).

---

## 1. Số đo đã có và giả định năng lực trong design

### 1.1 `pnpm test:scale` đo gì

- Script: `"test:scale": "vitest run --config ./vitest.config.e2e-scale.ts"` (`apps/api/package.json`, khối `scripts`). Config chạy
  **ba** file, không phải hai: `test/learning/scale.e2e-spec.ts`, `test/practice/scale.e2e-spec.ts`, `test/content/lookup.scale.e2e-spec.ts`
  (`apps/api/vitest.config.e2e-scale.ts:12`); file thứ ba do đợt sửa Bước 0–3 thêm (T5). Postgres + Redis thật qua Testcontainers
  (`:13`), từng file một (`:14`), chạy tay, không trên CI (`:4-6`; D42 ở `docs/superpowers/decisions/2026-10-18-buoc-4-practice-decisions.md:66`).
- **Review Focus 5 — `GET /v1/groups`**: một người học, 100 nhóm × 2.000 mục = 200.000 dòng `group_items`, mức level/ngày đến hạn rải 90
  ngày, `ANALYZE` (`apps/api/test/learning/scale.e2e-spec.ts:8-9,22-38`). 1 lần warm-up + 3 lần đo, assert median < 500 ms (`:44-58`); ngưỡng
  là `ASSUMPTION` (`:10-11`). **Không** có dòng `learning_log` và không có người học khác (review ghi rõ:
  `docs/superpowers/reviews/2026-10-18-buoc-0-4-code-review-evidence/agent-learning.md:330`).
- **Review Focus 2 — `POST /v1/practice/sessions`** nguồn "Ôn tất cả", chỉ `mcq_definition`, cùng dữ liệu 200.000 mục
  (`apps/api/test/practice/scale.e2e-spec.ts:14-15,44-61,64`). In median và thời gian từng bước (`practiceItems`, `statsFor`,
  `availability`, `groupMates`, `candidates`), **không assert ngưỡng** (`:16-17,85,90`).
- **T5 — `GET /v1/lookup` và `GET /v1/words?q`**: 9.800 nghĩa catalog, đo, rồi thêm 300.000 từ riêng của 300 người khác, `VACUUM ANALYZE`,
  đo lại; assert sau ≤ 2 × trước (`apps/api/test/content/lookup.scale.e2e-spec.ts:7-10,24,54-69,84-85`), kèm đối chứng từ riêng của mình
  thấy được và của người khác không thấy (`:76-82`).

### 1.2 Kết quả đã ghi

| Phép đo | Kết quả | Nguồn |
|---|---|---|
| `GET /v1/groups`, 200k `group_items` | CI 347 / 320 / 335 ms, median **335 ms** < 500 ms; máy dev chạy chung bộ e2e từng ra 654 ms | `docs/deliveries/buoc-3.md:78-79` |
| `GET /v1/groups` (lần sau) | 227–352 ms | `docs/deliveries/buoc-4.md:107` |
| Mở phiên "Ôn tất cả", 200k mục | median 2.671 ms; run `39139235839` 2.835 ms (`practiceItems('all')` ~2,0 s ≈ 75%, availability ~0,6 s, sort ~60 ms); run `39140676061` 1.892 ms. Ngưỡng 1 s **không đạt**, chấp nhận theo D39, "đo lại trước pilot" | `docs/deliveries/buoc-4.md:103-106`; D39 `docs/superpowers/decisions/2026-10-18-buoc-4-practice-decisions.md:63` |
| Probe PX2 (review 18/10) | `practiceItems({kind:'all'})` median 1.267 ms/200k dòng; `'today'` 604 ms; EXPLAIN 690 ms (JIT 285 ms), 2 SubPlan × 200k vòng, sort tràn đĩa ~8 MB | `docs/superpowers/reviews/2026-10-18-buoc-0-4-code-review.md:300-306` |
| "Từ hay sai", 6 tháng dữ liệu | 29 ms | `docs/deliveries/buoc-4.md:108` |
| T5 trước sửa (probe 18/10) | lookup 36 → **798 ms**, `words?q` 60 → **1.474 ms** khi thêm 300k từ riêng của người khác | `docs/superpowers/reviews/2026-10-18-buoc-0-4-code-review.md:268-276` |
| T5 sau sửa | **Chưa thấy số ghi.** Migration index đã vào `dev` (`apps/api/prisma/migrations/20261021090000_lookup_indexes/migration.sql:1-4`) nhưng `docs/deliveries/buoc-0-3-fixes.md` mới có plan tóm tắt (dòng 1), chưa có as-built | — |
| Import CSV thật | 7.799 entry trong 196 s, 0 dòng loại | `docs/deliveries/buoc-3.md:81-82` |

### 1.3 Giả định năng lực trong design/spec

- Pilot: "kỳ vọng 10–30 người, không quá 50" (`docs/preparation/PROJECT_CONTEXT.md:56`). Spec Identity: "pilot tối đa 50 người"; thư tối
  đa 1.500/ngày; Argon2 ~19 MiB mỗi lần băm, "5 lần đăng nhập đồng thời là khoảng 95 MiB"; "Số này chưa đo"
  (`docs/specs/module-spec-identity-access.md:167`).
- AI: spec gốc giới hạn 5 lời gọi đồng thời, xấu nhất ~900 lời gọi/giờ (`docs/specs/module-spec-ai-integration.md:140`); Bước 6 đổi
  thành cài đặt admin mặc định 50 (`docs/superpowers/specs/2026-10-20-buoc-6-ai-integration-design.md:43`).
- Catalog: đích 8.812 headword (`docs/superpowers/specs/2026-10-16-buoc-3-learning-design.md:486`); đã import 7.799 entry
  (`docs/deliveries/buoc-3.md:81`).
- Giới hạn mỗi người học (cài đặt): 100 nhóm × 2.000 mục/nhóm, 20 từ mới và 100 lượt ôn mỗi nhóm mỗi ngày, 10.000 từ riêng
  (`apps/api/src/settings/settings.definitions.ts:46,57`).
- **Nhận xét:** `learning_items` unique theo `(user_id, sense_id)` (`apps/api/prisma/models/learning.prisma:33`), và số từ riêng giới hạn
  theo entry (`apps/api/src/content/private/private-words.service.ts:143`). Nên số mục **khác nhau** của một người ≈ số nghĩa catalog (~9.800)
  + nghĩa riêng (≥ 10.000 entry) — cỡ 20–30k, khoảng 10–15% của 200k mà hai phép đo seed (`test/practice/scale.e2e-spec.ts:46`). Phép
  đo `practiceItems('all')` vì vậy là ca xấu hơn mức đạt được thật; `group_items` thì vẫn đạt 200k được vì một mục ở nhiều nhóm (ước tính).

---

## 2. API/worker chạy 2+ instance được không

**Kết luận: API — được. Worker — được, còn một rủi ro trùng email chưa kiểm.** Không có WebSocket/SSE (grep `@Sse|WebSocket|socket.io`
trong `apps/api/src` không ra gì), access token là JWT kiểm không cần DB (`apps/api/src/identity/sessions/access-token.service.ts:31-52`),
nên không cần sticky session.

| State | Nằm ở đâu | 2+ instance | Bằng chứng |
|---|---|---|---|
| Rate limit | Postgres `rate_limit_counters`, upsert `count + 1` | ✅ dùng chung | `apps/api/src/common/rate-limit/rate-limiter.service.ts:28-41` |
| Idempotency-Key | Postgres + `pg_try_advisory_xact_lock`; handler chạy **ngoài** transaction (C1 đã vào `dev`) | ✅ | `apps/api/src/common/idempotency/idempotency.service.ts:17-21,35-55,72-89`; `apps/api/prisma/sql/tryAdvisoryLock.sql:5` |
| Settings | Đọc 1 dòng `app_settings` mỗi lần gọi, **không cache** | ✅ (tốn 1 query/lần) | `apps/api/src/settings/settings.service.ts:39-46` |
| Entitlements | Tính lại từ DB mỗi lần (settings + subscriptions/grants + đếm usage) | ✅ | `apps/api/src/entitlements/entitlements.service.ts:81-106` |
| Ngân sách thư/ngày | Postgres `mail_budget_buckets`, `INSERT … ON CONFLICT … WHERE sent < limit` | ✅ | `apps/api/src/common/mail/mail-budget.service.ts:38-68` |
| Cache formatter múi giờ | Map trong RAM, LRU tối đa 500, chỉ là memo thuần | ✅ vô hại | `apps/api/src/common/time/local-date.ts:1-20` |
| File CSV upload | multer `memoryStorage` (≤ 10 MiB) rồi lưu `bytea` trong Postgres; không có file trên đĩa | ✅ | `apps/api/src/content-pipeline/content-pipeline.module.ts:29-35`; `apps/api/src/content-pipeline/upload/uploads.service.ts:89-90`; `IMPORT_MAX_BYTES` `apps/api/src/common/config/app-config.ts:202` |
| Giới hạn AI đồng thời | **Bộ đếm trong RAM mỗi process** (`CallQueue.running`) | ⚠️ N instance = N × `max_concurrent_calls` (mặc định 50) | `apps/api/src/ai/runner/call-queue.ts:1-2,15-19,43-50`; mặc định `apps/api/src/settings/settings.definitions.ts:58` |
| Semaphore Argon2 | 4 slot mỗi process | ✅ (bảo vệ tài nguyên cục bộ) | `apps/api/src/identity/auth/password-hasher.service.ts:38-51` |
| Thư OTP/đặt lại mật khẩu | Gửi **sau khi trả response**, giữ trong RAM (`batches`), xả khi shutdown | ⚠️ process bị kill cứng thì mất thư (người dùng gửi lại được) | `apps/api/src/common/mail/mail-dispatcher.service.ts:25-46`; `apps/api/src/main.ts:15-17` |
| Bảo trì hằng giờ | `setInterval` 1 giờ **trong mọi process** có `MAINTENANCE_ENABLED` (mặc định `true`), kể cả worker vì worker dùng cùng `AppModule` | ✅ vô hại theo thiết kế, chạy N lần/giờ | `apps/api/src/common/maintenance/maintenance.scheduler.ts:10-14,52-56`; `apps/api/src/worker.ts:11-13`; mặc định `app-config.ts:198` |
| Việc trong bảo trì có gửi thư/đụng tiền | `entitlement-notices` claim `FOR UPDATE SKIP LOCKED`; billing jobs `SKIP LOCKED`; `ai.models-refresh` claim từng model bằng `UPDATE … RETURNING` | ✅ | `apps/api/src/entitlements/notices/notice-sender.service.ts:62-84`; `apps/api/src/entitlements/billing/billing-jobs.service.ts:24-25`; `apps/api/src/ai/maintenance/ai-maintenance.ts:35-47` |
| Reconciler job CSV/publish | Chỉ ở worker (`runWorkers`), gộp lần chạy trùng **trong một process** | ✅ hai worker cùng re-enqueue thì `jobId` trùng | `apps/api/src/content-pipeline/jobs/job-reconciler.service.ts:26-30,76-80` |
| Scheduler nhắc học | BullMQ `upsertJobScheduler` (idempotent theo id), chỉ ở worker | ✅ | `apps/api/src/notifications/scheduler/reminder-queue.service.ts:53-61` |
| Chặn gửi nhắc học trùng | Dòng `reminder_deliveries` unique `(user, local_date)`, không dựa vào Redis | ✅ theo code; ⚠️ **test "two workers … exactly one email" từng ra 2 email ngày 18/10, chưa rõ nguyên nhân**, bộ test đã bị xóa (D38) | `apps/api/src/notifications/scheduler/reminder-send.service.ts:19-23,45-61`; `docs/deliveries/buoc-4.md:130-133` |

Thêm: healthcheck chỉ trả `{status:'ok'}`, không kiểm Postgres/Redis (`apps/api/src/health/health.controller.ts:6-10`) — load balancer vẫn
gửi request vào instance đã mất DB.

---

## 3. Database hot paths

Mỗi request có xác thực: JWT kiểm không cần DB (`access-token.service.ts:31-52`); route người học qua `LearnerContentGuard` đọc profile 1 lần
(`apps/api/src/content/learner/learner-content.guard.ts:15-24`); route có `@RateLimit` thêm 1 upsert (`rate-limiter.service.ts:28-32`). Chỉ
route ghi có rate limit; các route GET đọc không có (review T5: `docs/superpowers/reviews/2026-10-18-buoc-0-4-code-review.md:279`).

### 3.1 `GET /v1/groups` (trang chủ) và `GET /v1/groups/:id/queue` (hàng thẻ)

- `list`: đọc profile + settings, rồi **một** câu `groupStatsQuery` (`apps/api/src/learning/queue/queue.service.ts:47-58`). Câu này join
  mọi nhóm → `group_items` → `learning_items` của người học, mỗi dòng chạy `EXISTS` kiểm nghĩa còn hiển thị, đếm theo `FILTER`, cộng nhật ký
  hôm nay (`apps/api/src/learning/queue/queue.queries.ts:20-64`; `apps/api/src/content/learner/visible-senses.ts:9-15`). Chi phí tuyến tính
  theo số `group_items` của người đó: 335 ms ở 200k (mục 1.2).
- `queue`, chế độ `due`: 1 câu đếm việc đã làm hôm nay + tối đa 3 câu đọc (priority / due có `LIMIT` / new có `LIMIT`), rồi nội dung thẻ và câu
  ví dụ theo lô (`queue.service.ts:71-106`; `queue.queries.ts:70-97`).
- `queue`, chế độ `all`: đọc **toàn bộ** mục của nhóm `ORDER BY random()` không `LIMIT` (`queue.queries.ts:87-88`), rồi nạp nội dung cho tất
  cả (`queue.service.ts:78-79,92-95`) — tối đa 2.000 thẻ, payload cỡ 1–2 MB (ước tính, ~0,5–1 KB/thẻ). Chưa đo
  (`agent-learning.md:330` cũng ghi thiếu).
- Index: PK `group_items(group_id, item_id)` + `group_items(item_id)` (`apps/api/prisma/models/learning.prisma:45-46`); `learning_items`
  unique `(user_id, sense_id)` (`:33`); `learning_log(user_id, group_id, local_date)` và `(user_id, item_id)` (`:75-76`). Không có index
  `(user_id, due_date)` — không cần vì mọi câu lọc theo nhóm trước.

### 3.2 Trả lời flashcard `POST /v1/reviews`

`apps/api/src/learning/reviews/reviews.service.ts:32-82`: đọc profile + settings ngoài transaction, rồi transaction (timeout 10 s, `maxWait`
5 s, `:11`) gồm: đọc kết quả cũ theo `review_id`, `SELECT … FOR UPDATE` dòng mục, đọc lại, kiểm liên kết nhóm, đọc mục, `UPDATE`, `INSERT`
nhật ký. Cộng guard (1) và rate limit (1) ≈ **13 lượt hỏi DB nối tiếp**, đều theo khóa chính/unique. Rate limit riêng 120/phút
(`app-config.ts:119-120`). Khóa là row lock của đúng một mục: không tranh chấp giữa người học.

### 3.3 Luyện tập: mở phiên, `next`, trả lời

- Mở phiên (`apps/api/src/practice/sessions/sessions.service.ts:56-113`): kiểm quota sớm (`:65`), đọc nguồn qua `practiceItems` (`:71`,
  `:210-218`), thống kê (`:73-74`), sắp xếp trong JS (`:81`), kiểm dạng bài theo lô 50 từ (`:84-93`, `AVAILABILITY_BATCH` `:19`) — tất cả
  **ngoài** transaction (chú thích `:67-69`, PX4). Transaction ngắn sau cùng: advisory lock theo user (`apps/api/src/practice/practice-lock.ts:7-9`),
  đóng phiên cũ, kiểm quota lại, tạo phiên (`sessions.service.ts:95-112`; timeout 15 s, `maxWait` 10 s, `:18`). Có `@Idempotent()` +
  `user.write` 30/phút (`apps/api/src/practice/sessions/sessions.controller.ts:33-35`; `app-config.ts:118`).
- **PX2 chưa sửa:** `practiceItems` dùng 2 correlated subquery cho **mỗi** dòng (`min(added_at)` và `max(at)` từ `learning_log`)
  (`apps/api/src/learning/practice/practice-reads.queries.ts:93-101`); nguồn `'all'` không có điều kiện thêm (`:73,85`). Đây là ~75% thời gian
  mở phiên ở mức lớn (mục 1.2).
- **`next`/`current` của phiên nguồn nhóm** gọi `usable()` → `practiceItems({kind:'group', filter:'all'})` **trong transaction**, mỗi câu
  hỏi một lần (`sessions.service.ts:221-224,254`): đọc lại cả nhóm (≤ 2.000 dòng, mỗi dòng 2 subquery) cho mỗi câu. Chưa đo.
- Trả lời (`apps/api/src/practice/answers/answers.service.ts:151-162`): đọc item, đóng phiên idle, transaction khóa dòng phiên + `FOR UPDATE`
  dòng item. Rate limit 120/phút (`app-config.ts:121-122`).
- Index Practice: `practice_session_items(user_id, sense_id, answered_at)`, `(user_id, local_date)`, unique `(session_id, position)`; một phiên
  mở mỗi user (`apps/api/prisma/migrations/20261018150000_practice/migration.sql:87-99,133`).

### 3.4 Tra từ và tìm từ

- `lookup`: so khớp `lower(e.lemma) = q` hoặc variant (`apps/api/src/content/words/words.service.ts:144-155`); index biểu thức mới
  `entries(lower(lemma)) WHERE scope='catalog'`, `entries(owner_user_id, lower(lemma)) WHERE scope='private'`,
  `entry_variants(lower(text))`, `senses(entry_id)` (`apps/api/prisma/migrations/20261021090000_lookup_indexes/migration.sql:1-4`); điều
  kiện thấy được đặt thẳng lên `entries` (`apps/api/src/content/learner/visible-senses.ts:17-24`).
- `GET /v1/words?q`: xếp hạng bằng `ILIKE '%q%'` trên lemma và variant, chạy cho **mọi** entry thấy được (catalog + từ riêng của mình) trong
  CTE `candidates` (`words.service.ts:158-186`). `GET /v1/senses/search` cũng `ILIKE '%q%'` (`apps/api/src/content/learner/learner-content.service.ts:91-103`),
  và code ghi rõ **không có index tìm kiếm**: "design §9 requires measuring the real ~9,800-entry scan before adding one" (`:115`). Không
  `pg_trgm`, không full-text (grep `similarity|pg_trgm|to_tsvector` không ra gì). Chi phí tăng theo cỡ catalog × tần suất gõ, không theo số
  người dùng (sau sửa T5).

### 3.5 Kiểm quyền (entitlements)

- `practice.basic` trả ngay, không đọc DB (`entitlements.service.ts:81-82`). `checkQuota`: settings + profile + nguồn gói + đếm usage hôm
  nay (`:93-106`) — chạy 2 lần mỗi lần mở phiên (ngoài và trong transaction).
- Giữ lượt AI: transaction với khóa theo `(user, pool)` rồi **khóa chung** `entitlements.ai_daily` cho mọi người
  (`apps/api/src/entitlements/usage/usage-ledger.service.ts:42-75`; `apps/api/src/entitlements/entitlements.locks.ts:24-27`) — mọi lần giữ
  lượt AI toàn hệ thống đi tuần tự; design đã ghi "phải đo lại nếu người dùng tăng nhiều"
  (`docs/superpowers/specs/2026-10-19-buoc-5-entitlements-design.md:961`).

### 3.6 Advisory lock và vòng N+1

- Chỉ dùng khóa **transaction-level** (`pg_advisory_xact_lock` / `pg_try_advisory_xact_lock`): idempotency, entry nội dung, từ riêng, câu ví
  dụ, entitlements, identity user, staff role, learning user, practice user (grep `advisory` trong `apps/api/src`, ví dụ
  `apps/api/src/learning/learning-lock.ts:5`, `apps/api/src/identity/user-lock.ts:4`, `apps/api/src/identity/staff/staff.service.ts:252`).
  Không có `pg_advisory_lock` session-level, `SET`, `LISTEN/NOTIFY` (grep không ra).
- Không thấy N+1 ở đường người học đã đọc: nội dung thẻ, câu ví dụ, group mates đều theo lô (`queue.service.ts:93-95`;
  `practice-reads.queries.ts:107-115`). Vòng tuần tự còn lại: tick nhắc học `await enqueueSend` từng job (mục 6.4).

---

## 4. Connections

- Pool: `PrismaPg({ max: poolMax, connectionTimeoutMillis: poolTimeoutMs })` (`apps/api/src/common/db/prisma.module.ts:25-29`), cấu hình
  qua `DATABASE_POOL_MAX` mặc định **20** và `DATABASE_POOL_TIMEOUT_MS` mặc định **5.000** (`apps/api/src/common/config/app-config.ts:165-166,256`;
  `.env.example:3,5` để comment). Worker dựng cùng `AppModule.forRoot(config)` nên có pool riêng cùng cỡ (`apps/api/src/worker.ts:11-13`;
  `apps/api/src/app.module.ts:31`). Docs Bước 6 vẫn ghi "pool 10" (`docs/deliveries/buoc-6.md:157`) — đã cũ sau T16.
- Tổng connection tối đa: (số API instance + số worker) × 20, cộng CLI (`admin:grant`, `maintenance:run`) và migrate. 1 API + 1 worker = 40.
  Postgres mặc định `max_connections` "typically 100", trừ 3 slot superuser (PostgreSQL 17 docs, runtime-config-connection, kiểm qua
  context7 phiên này). Các gói managed nhỏ thường đặt thấp hơn tùy nhà cung cấp — `ASSUMPTION`, chưa kiểm nhà cung cấp cụ thể.
- Transaction dài nhất trong đường người học: practice 15 s timeout / 10 s `maxWait` (`sessions.service.ts:18`); idempotency claim
  `maxWait` 10 s (`idempotency.service.ts:55`). Thời gian chờ connection (5 s) ngắn hơn `maxWait` của các transaction này.
- **PgBouncer (transaction pooling):**
  - Docs Prisma (context7, `prisma/web`, trang "too-many-connections" và "prepared-statement-already-exists"): ở transaction mode, `SET/RESET`,
    `LISTEN`, `PREPARE` và **session-level advisory lock** không bao giờ chạy đúng; prepared statement mức protocol chỉ chạy khi pooler đặt
    `max_prepared_statements` (PgBouncer ≥ 1.21; 1.24 bật mặc định 200); dưới mức đó Prisma 6/7 dùng `pgbouncer=true`; migrate và
    công cụ admin nên dùng **direct URL** riêng.
  - App này chỉ dùng khóa transaction-level (mục 3.6) và mọi khóa nằm trong `$transaction` callback, nên **tương thích về khóa**. TypedSQL
    (`apps/api/prisma/sql/*.sql`) và `$queryRaw` của `@prisma/adapter-pg` có dùng prepared statement có tên hay không: **chưa kiểm**
    (`ASSUMPTION`: cần PgBouncer ≥ 1.21 với `max_prepared_statements` > 0, hoặc thử `pgbouncer=true`). `prisma.config.ts` chỉ có một
    `DATABASE_URL` cho cả migrate (`apps/api/prisma.config.ts:25`) — khi dùng pooler phải tách direct URL.
- **Đề xuất cho nhóm nhỏ:** chưa cần PgBouncer; đặt `DATABASE_POOL_MAX` ~10 cho API và ~5 cho worker để chừa chỗ (ước tính, mục 8).

---

## 5. Redis

- **Ai dùng:** chỉ BullMQ. Queue CSV import / publish / inflections (`apps/api/src/content-pipeline/jobs/job-queue.service.ts:21-75`), worker
  mỗi queue một connection, `concurrency: 1` (`apps/api/src/content-pipeline/jobs/job-runner.service.ts:36-52`); queue `reminders` với scheduler
  tick + job gửi (`reminder-queue.service.ts:53-78`); queue eval AI (`apps/api/src/ai/eval/eval-queue.service.ts:37-51,62-69`). Rate limit,
  idempotency, ngân sách thư, settings, entitlements **không** dùng Redis (mục 2).
- **Bộ nhớ:** mọi job đặt `removeOnComplete/removeOnFail: true` (`job-queue.service.ts:68`; `reminder-queue.service.ts:60,76`;
  `eval-queue.service.ts:51`). Job gửi nhắc học tối đa một mỗi người mỗi ngày (`reminder-queue.service.ts:21-24,70-77`). Với 500 người: ≤ 500
  job nhỏ đứng chờ cùng lúc → dưới vài MB (ước tính ~1–2 KB/job). Gói Redis nhỏ nhất là đủ.
- **Cấu hình bắt buộc:** BullMQ docs ("Going to production", context7 `bullmq_io`): `maxmemory-policy` phải là `noeviction` ("the only setting
  that guarantees the correct behavior"), persistence phải tự bật, khuyên AOF. Local đã đúng: `redis-server --maxmemory-policy noeviction
  --appendonly yes` (`docker-compose.yml:21`). Mặc định của Redis managed từng nhà: chưa kiểm (`ASSUMPTION`).
- **Redis khởi động lại / mất dữ liệu:**
  - Job CSV/publish: nguồn sự thật là bảng `background_jobs`; reconciler mỗi 30 s (`IMPORT_RECONCILE_SECONDS`, `app-config.ts:206`) đưa lại job
    `queued` hoặc hết lease vào Redis (`job-reconciler.service.ts:32-74`). API enqueue lỗi thì trả `false`, không ném lỗi
    (`job-queue.service.ts:62-74`), có `commandTimeout` (`:21-28`).
  - Eval AI: bảo trì hằng giờ đưa lại run Redis chưa nhận (`apps/api/src/ai/maintenance/ai-maintenance.ts:32,66-67`); smoke B6#30 đã thử tắt Redis
    (`docs/deliveries/buoc-6.md:128`).
  - Nhắc học: job gửi bị mất thì tick sau thêm lại (dedupe ở DB, `reminder-send.service.ts:45-46`). **Nhưng scheduler tick chỉ được
    `upsertJobScheduler` lúc worker khởi động** (`reminder-queue.service.ts:53-61`): nếu Redis mất dữ liệu (không persistence) mà worker không
    restart, tick không chạy nữa và **nhắc học dừng im lặng** cho tới lần restart worker (suy từ code; chưa chạy thử).
  - Request người học không chạm Redis, nên Redis chết không làm hỏng học/luyện.

---

## 6. Việc chậm hoặc chặn trong request

### 6.1 AI (Bước 6 gateway; Bước 7 mới gọi từ đường người học)

- Ngân sách mỗi lời gọi `callTimeoutSeconds` 10 s **bao gồm cả lần thử lại** (`apps/api/src/ai/runner/runner.service.ts:92-95`; thử tối đa 2
  lần trong cùng ngân sách, retry cần ≥ 2 s còn lại: `:204-258`, `apps/api/src/ai/ai.constants.ts:12-13`). Slot hàng đợi giữ suốt cả hai lần
  (`runner.service.ts:203-207,256-258`). Chờ slot tối đa tới deadline rồi trả `busy` (`call-queue.ts:21-37`).
- Hàng đợi tính **theo process**, mặc định 50 lời gọi cùng lúc (`settings.definitions.ts:58`). Trần số lời gọi provider/ngày 3.000 đếm trong DB
  (`apps/api/src/ai/runner/readiness.service.ts:33-37`), trần lượt AI toàn hệ thống 1.000/ngày (`settings.definitions.ts:54`).
- Lời gọi AI không giữ connection DB trong lúc chờ provider, miễn là Bước 7 theo luật design Bước 6 §4.4 (không gọi AI trong transaction hay
  handler `@Idempotent()`; `docs/superpowers/specs/2026-10-20-buoc-6-ai-integration-design.md:329-330`). Idempotency đã chạy handler ngoài
  transaction (`idempotency.service.ts:17-21`), nên vi phạm sẽ không còn giữ connection suốt 10 s qua cơ chế này.
- Thông lượng ước tính một process: 50 slot / 3–10 s mỗi lời gọi ≈ 5–17 lời gọi/s (ước tính). Nhóm nhỏ dư.

### 6.2 Băm mật khẩu

Argon2id `memoryCost 19456` KiB, `timeCost 2`, `parallelism 1` (`apps/api/src/identity/auth/password-hasher.service.ts:6-11`), tối đa 4 lần băm
cùng lúc mỗi process (`:38-51`), chạy trên threadpool libuv (mặc định 4 luồng, dùng chung với DNS/fs — ghi trong design
`docs/superpowers/specs/2026-10-07-buoc-1-identity-core-design.md:224-225`; không thấy `UV_THREADPOOL_SIZE` trong repo). Thời gian ~44 ms/lần
theo design (`:196`), không ghi máy đo. Ước tính trần ~90 lần băm/s/instance (4 / 0,044) và ~76 MiB RAM đỉnh (4 × 19 MiB).

### 6.3 Email

- OTP/đặt lại mật khẩu: gửi **trong process API, sau response**, không qua queue (`mail-dispatcher.service.ts:25-32,66-80`). SMTP transport
  không đặt `pool: true`, timeout từng pha 10 s (`apps/api/src/common/mail/smtp-mailer.ts:15-22`) — mỗi thư một kết nối SMTP mới
  (`ASSUMPTION` theo mặc định nodemailer, chưa kiểm docs phiên này).
- Ngân sách: `MAIL_DAILY_BUDGET` mặc định 1.500 (`app-config.ts:182`); nhắc học dùng tối đa 80%, thư gói (trial/gia hạn) tối đa 95%, phần còn lại
  cho OTP (`apps/api/src/common/mail/mail-budget.service.ts:9-13`); cảnh báo log `mail_budget_80` (`:70-75`). Hết ngân sách → đăng ký/OTP trả 503
  `mail-unavailable` (`:29-36`).
- Trần nhà cung cấp: spec ghi Workspace 2.000/ngày, **Gmail cá nhân có thể chỉ 500/24 h theo nguồn thứ cấp, chưa có nguồn Google**
  (`docs/specs/module-spec-identity-access.md:71`).

### 6.4 Nhắc học (worker)

- Tick mỗi 900 s (`REMINDER_TICK_SECONDS`, `app-config.ts:213`), quét **mọi** user đã xác minh theo trang 500 (`apps/api/src/identity/profile/identity.service.ts:73-85`;
  `apps/api/src/notifications/scheduler/reminder-tick.service.ts:16,42-60`), mỗi trang 2 query + 1 câu đếm thẻ còn lại theo lô (`:62-101`), rồi
  `await enqueueSend` từng job (`:57`).
- Gửi: `concurrency: 1` (`reminder-queue.service.ts:63-65`); mỗi job ~5 query (dedupe, profile, kênh, đếm thẻ của người đó, tạo dòng) + 1 lần
  SMTP (`reminder-send.service.ts:40-80`). Giờ gửi mặc định 20:00 giờ địa phương, cách nhau tối thiểu 2 ngày (`settings.definitions.ts:45`) — người
  dùng Việt Nam cùng múi giờ nên dồn vào cùng một tick.
- Ước tính: 1–3 s/thư (SMTP không pool) → 250 thư ≈ 4–12 phút sau 20:00 (ước tính). Ổn cho nhóm nhỏ.

### 6.5 CSV import / bulk publish (worker)

Worker một luồng mỗi queue (`job-runner.service.ts:47-48`); đo thật 7.799 entry/196 s ≈ 40 entry/s (`docs/deliveries/buoc-3.md:81-82`). Giới
hạn: 20.000 dòng, 10 MiB mỗi file, 500 mục mỗi lần publish, xuất 5.000 dòng **trong request API** (`app-config.ts:200-203`). Chỉ admin dùng.

---

## 7. Frontend

- **Landing `apps/web`**: Next.js qua OpenNext trên Cloudflare Workers, static assets qua binding `ASSETS`, waitlist trên D1
  (`apps/web/wrangler.jsonc:2-28`). Proxy chỉ xử lý chọn locale (`apps/web/src/proxy.ts:9-27`); thư mục `apps/web/src/app/[locale]` chỉ có trang
  landing, privacy, terms — **chưa có app người học** (`/app`). Không phải mối lo về scale.
- **Admin `apps/admin`**: Vite SPA build tĩnh, phục vụ bằng Workers static assets, `not_found_handling: single-page-application`
  (`apps/admin/wrangler.jsonc:1-6`). Không phải mối lo.
- **Chỗ cần để ý khi làm app người học:** nếu trang gọi API từ server (SSR trên Cloudflare) thay vì từ trình duyệt, API sẽ thấy IP của
  Cloudflare → các giới hạn theo IP (mục Tóm tắt, điều kiện 2) dồn vào vài IP. Chưa có code để kiểm.

---

## 8. Kết luận cho nhóm nhỏ — phép tính tay

**Giả định (đều là `ASSUMPTION`):**
- G1: 100–500 người đăng ký; 10–50 người học **cùng lúc** ở giờ đỉnh (tối, giờ Việt Nam).
- G2: Một phiên flashcard ≈ `GET /v1/groups` + `GET queue` + ~30 `POST /v1/reviews` trong ~6 phút ≈ 0,09 request/s/người; một phiên luyện 10 câu
  ≈ 1 mở phiên + 10 × (`next` + `answer`) + tổng kết ≈ 22 request/5 phút ≈ 0,07 request/s/người. Thêm refresh token mỗi 15 phút
  (`ACCESS_TOKEN_TTL_SECONDS` 900, `app-config.ts:199`) và tra/tìm từ. Lấy trung bình 0,1 request/s/người; người lật thẻ nhanh 0,5 request/s.
- G3: Mỗi request ~10–15 lượt hỏi DB (đếm thật ở mục 3.2: 13 cho một lần trả lời thẻ).
- G4: DB cùng region, mỗi lượt hỏi ~1 ms tính cả mạng; khác region ~30 ms.
- G5: CPU API ~1–3 ms mỗi request đơn giản (Nest + zod + Prisma) — chưa đo.

**Phép tính (ước tính):**

| Đại lượng | Trung bình | Đỉnh xấu |
|---|---|---|
| Request/s | 50 × 0,1 = **5** | 50 × 0,5 = **25** |
| Lượt hỏi DB/s | 5 × 13 = 65 | 25 × 15 = 375 |
| Connection bận (Little: tốc độ × thời gian giữ), cùng region | 5 × 0,015 s ≈ 0,1 | 25 × 0,015 s ≈ **0,4** / pool 20 |
| Connection bận, khác region (13 × 30 ms ≈ 0,4 s/request) | 5 × 0,4 ≈ 2 | 25 × 0,4 ≈ **10** / pool 20; mỗi lần lật thẻ chờ ~0,4 s |
| CPU API | 5 × 3 ms = 1,5% một vCPU | 25 × 3 ms = **7,5%** một vCPU |
| Đăng nhập dồn (50 người trong 1 phút) | 0,8 lần băm/s | trần ~90/s/instance (mục 6.2) |
| RAM API | Node chưa đo + Argon2 đỉnh ~76 MiB + CSV ≤ 10 MiB → nên 512 MB–1 GB mỗi process | |
| Postgres connection | API 20 + worker 20 = 40 ≤ 100 mặc định | giảm xuống 10 + 5 nếu gói managed chỉ cho ~25 |
| Dung lượng nhật ký học/năm | 50 người active × 50 lượt/ngày × 365 ≈ 0,9 triệu dòng ≈ 0,25 GB (~250 B/dòng gồm index) | 500 người đều active ≈ 9 triệu dòng ≈ 2,3 GB |
| Catalog | ~9.800 nghĩa: dưới 100 MB | — |
| Redis | dưới vài MB (mục 5) | — |
| Email/ngày | nhắc học tối đa mỗi 2 ngày → ≤ 250 thư với 500 người | + OTP + thư gói: vẫn dưới 1.200 (phần của nhắc học); **có thể vượt 500 nếu dùng Gmail cá nhân** |

Đọc nặng ở cỡ người học thực tế (nội suy tuyến tính từ số đo 200k, ước tính): người có 2.000 mục → `GET /v1/groups` ~5 ms + chi phí cố định;
người có ~20.000 mục (gần trần đạt được thật, mục 1.3) → mở phiên "Ôn tất cả" ~0,2–0,3 s.

**Kết luận:** 1 API instance nhỏ (1 vCPU, 512 MB–1 GB) + 1 worker + Postgres managed nhỏ (cùng region) + Redis nhỏ (noeviction, AOF) **đủ**
cho G1 với dư địa lớn (ước tính dưới 10% CPU, dưới 1 connection bận trung bình). Rủi ro của nhóm nhỏ không phải công suất mà là: cấu hình
`TRUST_PROXY`, region của DB, chính sách Redis, hạn mức email, và healthcheck không kiểm DB.

---

## 9. Thứ tự gãy khi người dùng tăng

| # | Điểm nghẽn | Khi nào (ước tính) | Tín hiệu theo dõi | Cách sửa (code/infra) |
|---|---|---|---|---|
| 1 | **Hạn mức email/ngày** — trần cứng, không phụ thuộc cỡ server | Gmail cá nhân ~500/ngày (`ASSUMPTION`, `module-spec-identity-access.md:71`): nhắc học mỗi 2 ngày → ~1.000 người có thẻ; ngân sách mặc định 1.500 × 80% = 1.200 nhắc/ngày → ~2.400 người | Log `mail_budget_80` (`mail-budget.service.ts:70-75`), `reminder_tick_skipped` `budget-exhausted` (`reminder-tick.service.ts:47-49`), 503 `mail-unavailable` khi đăng ký (`mail-budget.service.ts:29-36`) | Đổi sang dịch vụ email giao dịch qua cổng `Mailer` (`apps/api/src/common/mail/mailer.ts`), nâng `MAIL_DAILY_BUDGET`, bật SMTP pool (`smtp-mailer.ts:15-22`) |
| 2 | **Đọc nặng của người học nhiều từ** — tăng theo số mục mỗi người, không theo tổng người dùng | Người có hàng chục nghìn mục; phiên luyện nguồn nhóm 2.000 từ ở mỗi câu | p95/p99 của `POST /v1/practice/sessions`, `POST /v1/practice/sessions/:id/next`, `GET /v1/groups`, `GET /v1/groups/:id/queue?mode=all`; `pg_stat_statements` theo tổng thời gian; `temp_files` (sort tràn đĩa) | PX2: đổi 2 subquery sang `LEFT JOIN` bảng gộp, sắp và cắt trong SQL (`practice-reads.queries.ts:93-101`); `usable()` chỉ cần id, không cần 2 cột subquery (`sessions.service.ts:221-224`); thêm `LIMIT`/phân trang cho `mode=all` (`queue.queries.ts:87-88`); đo lại bằng `pnpm test:scale` (D39) |
| 3 | **Connection Postgres khi thêm instance** | Mỗi process thêm 20; 3 API + 1 worker = 80 so với 100 mặc định (hoặc thấp hơn ở gói nhỏ) | Lỗi chờ connection quá 5 s, `pg_stat_activity` theo trạng thái, `idle in transaction` | Giảm `DATABASE_POOL_MAX` mỗi process; PgBouncer transaction mode (tương thích khóa, cần kiểm prepared statement, mục 4); direct URL riêng cho migrate (`prisma.config.ts:25`) |
| 4 | **Ghi Postgres cho rate limit, idempotency và nhật ký** | Hàng trăm request ghi/s | WAL/giây, IOPS, dead tuple và autovacuum của `rate_limit_counters`, `idempotency_keys`; kích thước `learning_log`, `practice_session_items` | Đưa bộ đếm rate limit sang Redis `INCR`+`EXPIRE` (`rate-limiter.service.ts:28-32`); partition hoặc lưu trữ nhật ký theo tháng; dọn hằng giờ đã có (`apps/api/src/common/rate-limit/rate-limit-cleanup.registrar.ts:15`, `apps/api/src/common/idempotency/idempotency-cleanup.registrar.ts:18`) |
| 5 | **Giới hạn AI tính theo process** (khi Bước 7 bật AI cho người học) | Khi chạy 2+ API instance | Log `ai_provider_quota` (`runner.service.ts:246-248`), kết quả `busy`, số lời gọi hôm nay so với trần | Đặt `ai.max_concurrent_calls` = trần provider / số instance; hoặc semaphore dùng chung trên Redis thay `CallQueue` (`call-queue.ts:15-60`); đo khóa chung `entitlements.ai_daily` (`entitlements.locks.ts:24-27`) |
| 6 | **Tìm từ `ILIKE '%q%'` không index** | Catalog lớn hơn nhiều, hoặc tìm theo từng phím gõ với nhiều người | p95 `GET /v1/words?q`, `GET /v1/senses/search`; seq scan trên `entries`, `entry_variants` | Index `pg_trgm` GIN trên `lower(lemma)` và `entry_variants.text`; debounce phía client; rate limit cho GET (`learner-content.service.ts:91-115`, `words.service.ts:167-186`) |
| 7 | **Tick nhắc học quét mọi user, gửi một luồng** | Hàng chục nghìn user cùng múi giờ 20:00 | Thời gian chạy tick, số job `reminders` đang chờ, độ trễ từ 20:00 tới thư cuối | Lọc theo cửa sổ giờ gửi ngay trong SQL; tăng `concurrency` job gửi (`reminder-queue.service.ts:63-65`); `addBulk` thay vòng `await` (`reminder-tick.service.ts:57`) |
| 8 | **Worker CSV một luồng** (chỉ admin) | File lớn hoặc nhiều lần import liền nhau | Thời gian job, lease hết hạn (`job_lease_expired`, `job-reconciler.service.ts:58`) | Tăng `concurrency` hoặc thêm worker; không ảnh hưởng người học |

---

## Chưa kiểm được

- **Không chạy phép đo nào trong phiên này** (read-only). Mọi số đo ở trên lấy từ docs, trên runner CI hoặc máy dev, không phải phần cứng production.
- **T5 sau sửa chưa có số**: test đã có (`apps/api/test/content/lookup.scale.e2e-spec.ts`) và migration đã vào `dev`, nhưng chưa thấy kết quả
  ghi trong `docs/deliveries/`.
- **PX2 vẫn chưa sửa và chưa đo lại** dù D39 ghi "đo lại trước pilot" (`docs/deliveries/buoc-4.md:106,129`).
- Các route chưa ai đo: `GET /v1/groups/:id/queue?mode=all`, `GET /v1/groups/:id`, `POST /v1/practice/sessions/:id/next` với nguồn nhóm
  2.000 từ, `GET /v1/groups` khi có ~1 năm nhật ký, tick nhắc học với nhiều user.
- RAM (RSS) và CPU mỗi request của Node: chưa đo. Argon2 ~44 ms là số trong design, không ghi máy đo.
- `@prisma/adapter-pg` + PgBouncer transaction mode: prepared statement có tên hay không — chưa kiểm (mục 4).
- Mặc định `maxmemory-policy`/persistence của Redis managed và `max_connections` của Postgres managed theo nhà cung cấp: chưa kiểm.
- nodemailer không `pool: true` thì mỗi thư một kết nối: `ASSUMPTION` theo mặc định thư viện, chưa đọc docs.
- Trần Gmail cá nhân 500/ngày: nguồn thứ cấp theo spec, chưa có nguồn Google.
- Hai worker có thể gửi 2 thư nhắc học cùng ngày (test chập chờn 18/10, `docs/deliveries/buoc-4.md:130-133`): chưa rõ nguyên nhân, cần chạy tay
  hai worker trước khi chạy 2 worker ở production.
- Scheduler nhắc học biến mất khi Redis mất dữ liệu mà worker không restart: suy ra từ code (`reminder-queue.service.ts:53-61`), chưa chạy thử.
- App người học (`apps/web` `/app`) chưa có: chưa biết gọi API từ trình duyệt hay từ server, nên chưa biết ảnh hưởng tới giới hạn theo IP.
