# Review plan Bước 5 (Entitlements & Usage, chỉ API) — trước khi chủ dự án duyệt (19/10/2026)

**Đã đọc:** plan [`../plans/2026-10-19-buoc-5-entitlements.md`](../plans/2026-10-19-buoc-5-entitlements.md) (962 dòng, bản trên đĩa, chưa commit),
bản tóm tắt [`../../deliveries/buoc-5.md`](../../deliveries/buoc-5.md), design
[`../specs/2026-10-19-buoc-5-entitlements-design.md`](../specs/2026-10-19-buoc-5-entitlements-design.md), decision record
[`../decisions/2026-10-19-buoc-5-entitlements-decisions.md`](../decisions/2026-10-19-buoc-5-entitlements-decisions.md), review design
[`2026-10-19-buoc-5-design-review.md`](2026-10-19-buoc-5-design-review.md); mẫu trình bày: review plan Bước 4.

**Code:** worktree `buoc-5-design`, nhánh `docs/buoc-5-plan` @ `f3e4572` (= `origin/dev`; `git diff --name-only HEAD origin/dev -- apps/api` → 0 file).
Mọi đường dẫn code tính từ `apps/api/` trừ khi ghi khác. "Plan dòng N" là số dòng của file plan trên đĩa; "design dòng N" tương tự.

**Đã kiểm thế nào (chỉ đọc):**
- Thư viện đọc từ `node_modules/.pnpm` của checkout chính (worktree này không có `node_modules`; `pnpm-lock.yaml` và `apps/api/package.json` giống hệt
  giữa `dab4fe4` và `f3e4572`, `git diff --stat` → 0 dòng): `body-parser@2.3.0`, `on-finished@2.4.1`, `@nestjs/platform-express@12`,
  `@prisma/adapter-pg@7.10.0`, `pg-pool@3.14.0`.
- Postgres 17 qua context7 (`/websites/postgresql_17`, trang `sql-insert`).
- Một lệnh `node` trong scratchpad để xem `process.loadEnvFile` có ghi đè biến môi trường đã có không (kết quả: **không**, biến môi trường thắng file).
- Không build, không test, không chạy server, không chạy migration. Hook chặn đọc giá trị trong `.env.example`, nên mọi ý dựa trên giá trị secret mẫu đều bị bỏ.

**Phạm vi:** plan ↔ design, interface giữa các task, chia phiên/luồng, plan ↔ code, build được, khóa và chạy đua, test làm được khi không còn e2e backend,
privacy. Không bàn lại D1–D34, R1–R25; một quyết định chỉ được nêu khi plan làm khác nó, hoặc design không nói và plan tự chọn một hành vi sản phẩm.

**Kết quả:** 3 cao, 8 trung bình, 10 thấp. 4 câu cần chủ dự án quyết (cuối file).

**Cập nhật 19/10/2026 (chủ dự án: "sửa đi"):** cả 21 phát hiện đã được sửa vào plan và bản tóm tắt `buoc-5.md`, theo đúng "Đề xuất sửa plan" của
từng mục (#16: chọn cách ghi khoảng hỏng vào brief điều phối, không chuyển Task 20). Phần phụ thuộc Q1–Q4 chưa sửa: plan ghi ở mục "Waiting for the
owner" và đánh dấu ngay trong Task 7, 12, 19. File này giữ nguyên nội dung review lúc viết.

**Cập nhật 19/10/2026 (Q3):** chủ dự án chọn "tự trừ tiền mỗi kỳ" sau research
[`../../preparation/EARLY_MANUAL_RENEWAL_RESEARCH_2026-10-19.md`](../../preparation/EARLY_MANUAL_RENEWAL_RESEARCH_2026-10-19.md), rồi chốt bỏ kiểu "app tự gia
hạn" khỏi lõi → **D35** (decision record). Phát hiện #18 và câu Q3 không còn.

**Cập nhật 19/10/2026 (Q4):** chủ dự án chọn bỏ email cảnh báo trần AI, chỉ tô vàng trên màn admin → **D36**. Phần cảnh báo trần của phát hiện #17 không
còn.

**Cập nhật 19/10/2026 (Q2):** chủ dự án chốt: bộ nối bắt buộc gửi mã giao dịch mỗi khi có trừ tiền, `plan_changed` kèm mã của kỳ mới (sửa luôn chỗ B5E87 không
chạy đúng mà Claude phát hiện khi giải thích lại Q2), thiếu mã thì hoàn tiền chỉ ghi lại và log → **D37**.

**Cập nhật 19/10/2026 (Q1):** chủ dự án chốt: kéo dài hay dời ngày thì sửa ngày của chính lần cấp (API `PATCH`, có lịch sử sửa), không tạo lần cấp mới; lần cấp Pro
bắt đầu ở tương lai không thu hồi lần cũ → **D38**. Cả bốn câu Q1–Q4 đã chốt.

## Bảng tóm tắt

| # | Mức | Task | Điểm |
|---|---|---|---|
| 1 | cao | 17 | `fetchState` được gọi **bên trong** transaction đang giữ khóa người dùng và khóa dòng gói (trái R6 và chính Global Constraints); lỗi `fetchState` làm sự kiện `failed` thay vì rơi về luật thứ tự như design |
| 2 | cao | 10, 14, 21 | Pool chỉ có 10 connection: 10 lần `reserve` cùng chờ một advisory lock, người đang giữ khóa cần thêm một connection để đọc Settings/Identity → có thể treo cả process; `--parallel 10` của smoke tạo đúng điều kiện này |
| 3 | cao | 17 | Bước "trial" chạy cả khi `subscription_started` chỉ được "Ghi" (gói đã có dòng) → đụng `trial_history` của chính người đó → coi là dùng trial lần hai → gọi `endTrialNow`, trừ tiền sớm một trial hợp lệ |
| 4 | trung bình | 18 | Job chuyển trạng thái dùng `last_event_at` để biết dòng đã đổi chưa; sự kiện cộng thêm tới muộn không đổi `last_event_at` → job ghi trạng thái cũ đè lên lần gia hạn vừa áp |
| 5 | trung bình | 19 | Job gửi email đánh dấu 50 dòng `sending` trong một commit rồi mới gửi từng cái; process chết giữa chừng → tới 49 email (kể cả nhắc trial) kẹt `sending` mãi, không bao giờ gửi |
| 6 | trung bình | 21 | Smoke: lệnh con `maintenance:run` đọc `.env` nên ở lượt "tắt fetchState" job vẫn dùng `fetchState`; lùi thời gian bằng SQL phải làm cả trên bảng của bộ nối giả ở mọi bước, không chỉ B5#29; thứ tự job trong một lần chạy chưa cố định |
| 7 | trung bình | 14, 21 | Ca chạy đua B5E11 (nhiều người dùng cùng lúc) không làm được với `fake-ai` một `--user`; vòng lặp B5E73 thiếu bước đặt lại, sau lần đầu không còn gì để đua |
| 8 | trung bình | 12, 6 | `SubscriptionSource` thiếu `provider` và `externalSubscriptionId` mà Task 12 cần để gọi `cancelAtPeriodEnd`; lời gọi bộ nối chạy trong transaction còn mở của `IdempotencyInterceptor` (giới hạn 30 s) |
| 9 | trung bình | 14 | `entitlements:fake-ai` kiểm `BILLING_FAKE_ENABLED`, tức cấu hình của Task 15 (PR G1, phiên S3), nhưng bảng phiên không ghi S2 chờ G1 |
| 10 | trung bình | 8, 16, 17, 4 | Sự kiện thiếu trường: cột `payload` NOT NULL nhưng sự kiện chuẩn hóa là `null`; `app_user_id` không phải uuid làm lỗi DB thay vì `ignored`; loại sự kiện lạ làm cả lô bị 400 |
| 11 | trung bình | 12, 16, 17, 19 | Không test nào kiểm log không chứa email, payload, `reason`, fingerprint (SR10, B5E62 không có trong plan); logger chỉ che các khóa `password|otp|code|token|…` |
| 12 | thấp | 16, bảng Verified | Lý do "body-parser bỏ qua khi `req._body` có giá trị" sai với bản đã cài (2.3.0 dùng `onFinished.isFinished(req)`); cơ chế vẫn đúng |
| 13 | thấp | 2 | `ItemsService` (2 chỗ giới hạn) không có trong danh sách service nhận thêm `SettingsService` |
| 14 | thấp | 4 | Tên DB `english_learning_b5_c` khác quy ước `english_learning_b5_s<n>` của brief điều phối |
| 15 | thấp | 11 | Kiểm hạn mức sau vòng tìm từ tốn tới 30 s; người hết lượt chờ hết vòng mới bị 403; nhóm rỗng trả 409 trước 403 |
| 16 | thấp | 20 | `smoke:buoc-4` hỏng trên `dev` từ lúc PR F1 merge tới lúc PR Z1 merge |
| 17 | thấp | 19 | `subject_key`/`period_key` của `trial_reminder`, `expiry_notice` chưa định nghĩa; cảnh báo trần có thể mất hẳn khi chạm ngưỡng trong giờ cuối của ngày |
| 18 | thấp | 7 | `payment_succeeded` không ghi `current_transaction_id`; với giá trị `null`, mọi hoàn tiền của gói "app tự gia hạn" đều cắt Pro |
| 19 | thấp | 9, 12, 17 | Vài chỗ người làm phải đoán: `touchesAiLimits` khi tạo, `snapshot` với người không tồn tại, trạng thái sự kiện sau khi áp trạng thái hỏi lại |
| 20 | thấp | tóm tắt | `buoc-5.md` chỉ liệt kê 5 trên 7 lựa chọn của plan |
| 21 | thấp | 21 | Thứ tự B5#2 rồi B5#3 trên cùng một learner: sau 3 phiên đã tính, 5 lần "mở rồi bỏ" đều bị 403 |

## Phát hiện

### 1. (cao) Task 17 — `fetchState` chạy trong lúc đang giữ khóa

**Sai ở đâu.** Task 17 mở "One transaction per event" (plan dòng 814), khóa người dùng và khóa dòng `subscriptions` ở bước 4 (dòng 818-819), rồi ở bước 5
và bước 7 gọi `fetchState` và ghi kết quả (dòng 820-821, 824), vẫn trong transaction đó. Global Constraints của chính plan cấm điều này: "Never call an
adapter or send mail while holding a lock (R6): adapter calls (`fetchState`, `endTrialNow`, `cancelAtPeriodEnd`) … run after the transaction commits"
(dòng 158-159). Plan cũng không nói khi `fetchState` ném lỗi thì làm gì; mặc định lỗi làm hỏng transaction và sự kiện thành `failed` (dòng 831-832).
Design lại nói lỗi `fetchState` thì "rơi về luật thứ tự ở trên" (design dòng 417-418), tức sự kiện cũ vẫn là `stale`, sự kiện thiếu trường vẫn `ignored`.

**Bằng chứng.** Plan dòng 153-159, 814-832; design dòng 417-418.

**Hỏng ở kịch bản nào.** Với bộ nối thật, `fetchState` là một lời gọi HTTP (vài giây). Trong lúc đó khóa `entitlements.user:<id>` và dòng gói bị giữ: lần
cấp tay cho cùng người đó và mọi sự kiện khác của người đó phải chờ. Nhà cung cấp chậm hoặc lỗi → transaction quá hạn → sự kiện `failed`, job thử lại 5 lần
rồi log `billing_event_stuck`, trong khi design muốn sự kiện đó chỉ là `stale` hoặc `ignored`. Với bộ nối giả thì không thấy gì, nên smoke không bắt được;
nhưng đây là khung mà bộ nối thật sẽ cắm vào.

**Đề xuất sửa plan.** Tách Task 17 thành hai bước như job ở Task 18: transaction 1 quyết định và ghi `stale` / `missing-fields` (commit); ngoài transaction
gọi `fetchState`; transaction 2 khóa lại người dùng và dòng gói, chỉ ghi trạng thái hỏi lại nếu dòng chưa đổi kể từ transaction 1 (xem #4 về cách nhận biết
"chưa đổi"). Ghi rõ: `fetchState` lỗi hoặc trả `null` → giữ kết quả của luật thứ tự (`stale` / `ignored`), log, không đổi sự kiện thành `failed`. Thêm test:
"fetchState throws → event stays stale, no retry"; "fetchState is never called while lockUser is held" (mảng thứ tự gọi).

### 2. (cao) Task 10, 14, 21 — cạn connection pool khi nhiều `reserve` chờ cùng một khóa

**Sai ở đâu.** `PrismaPg` được tạo chỉ với `connectionString`, nên dùng `pg.Pool` mặc định **10 connection**, và pool chờ connection **không giới hạn
thời gian**. Mỗi `reserve` là một interactive transaction giữ một connection trong lúc chờ `pg_advisory_xact_lock` (khóa theo người, rồi khóa chung
`entitlements.ai_daily` mà mọi người dùng xếp hàng). `reserve` cần Settings (`aiEnabled`, trần, con số gói) và nguồn quyền. `SettingsService.get()` và
`IdentityService.getProfile()` không nhận `tx`, luôn đi qua client chung, tức cần **một connection nữa** từ pool. Code hiện có đã gọi `settings.get()` bên
trong transaction (Practice `advance`), nên người làm rất dễ chép cách này. Plan không có luật nào chặn.

**Bằng chứng.** `src/common/db/prisma.module.ts:21-22`; `@prisma/adapter-pg/dist/index.mjs:776` (`new pg2.Pool(this.config)`); `pg-pool/index.js:89`
(`max … || 10`), `:206` (không có `connectionTimeoutMillis` → chờ mãi); `src/settings/settings.service.ts:36-43` (`this.prisma.appSetting.findUnique`);
`src/identity/profile/identity.service.ts:52-55`; tiền lệ `src/practice/sessions/sessions.service.ts:278` (`settings.get()` trong transaction của
`advance`); plan dòng 587-595 (Task 10), 725-726 (`--parallel N` 1–50), 945 (smoke B5#14 `--parallel 10`).

**Hỏng ở kịch bản nào.** Smoke B5E1/B5#14: `pnpm entitlements:fake-ai reserve … --parallel 10` chạy 10 transaction trong **một** process. Cả 10 lấy đủ
10 connection; một transaction giữ khóa, 9 transaction kia chờ khóa trong khi vẫn giữ connection. Transaction đang giữ khóa gọi `settings.get()` → chờ
connection thứ 11 → không bao giờ có. `ASSUMPTION` (chưa chạy thử): khi hết `timeout` 10 s, Prisma gửi `ROLLBACK` trên connection đang bận chạy câu chờ khóa,
nên connection không được trả; kết quả có thể là treo hẳn thay vì lỗi. Ở Bước 7, 10 người dùng xin lượt AI cùng lúc trong process API sẽ gặp đúng điều này và
kéo theo mọi request cần DB.

**Đề xuất sửa plan.** Ghi vào Global Constraints và Task 10: "Bên trong transaction giữ khóa của Entitlements chỉ dùng `tx`; Settings, profile và mọi đọc khác
qua client chung làm **trước** khi mở transaction." Lấy `lockAiDaily` **sau** các bước từ chối theo người (công tắc, con số 0, hết lượt), chỉ khi sắp đếm
trần, để lần bị từ chối không xếp hàng ở khóa chung (hiện `decideReserve` nhận `capUsed` làm đầu vào, tức trần được đếm trước khi quyết định). Thêm test
"reserve issues no query outside tx while holding a lock" (fake client chung ném lỗi nếu bị gọi sau `lockPool`). Cho smoke chạy `--parallel` nhỏ hơn số
connection, hoặc cấu hình `max` của pool cho CLI rõ ràng.

### 3. (cao) Task 17 bước 8 — trial hợp lệ bị coi là trial lần hai

**Sai ở đâu.** Bước 8 chạy cho mọi "`subscription_started` with `trialEndsAt`" (plan dòng 825-827), không phân biệt ô nào của bảng 9.4 sẽ áp. Với gói
**đã có dòng** đang `trialing`, `active`, `grace` hoặc `on_hold`, design ghi `subscription_started` chỉ là "Ghi" (design dòng 454). Nhưng bước 8 vẫn chèn
`trial_history`; dòng của chính lần trial đầu đã có (unique `user_id`) → không có dòng trả về → `trialAllowed = false`, log `trial_reuse_detected`. Sau
commit, "a denied trial with `endTrialNow` → call it" (dòng 831).

**Bằng chứng.** Plan dòng 825-827, 831; design dòng 454 (cột `trialing` … `on_hold` = "Ghi"); unique `user_id` của `trial_history` (plan dòng 330).

**Hỏng ở kịch bản nào.** Lan bắt đầu trial ngày 1/11, sự kiện A (`subscription_started`, mã `evt_1`) được áp. Bộ nối chuẩn hóa thêm một sự kiện khác của nhà
cung cấp thành `subscription_started` (mã `evt_2`, cùng gói, `occurred_at` không cũ hơn) — chuyện thường gặp khi một nhà cung cấp gửi hai thông báo cho một
lần đăng ký. `evt_2` không trùng `dedupe_key`, không `stale`, đi tới bước 8, bị coi là dùng trial lần hai → Wordmet gọi `endTrialNow` → thẻ của Lan bị trừ
tiền ngay ngày 1/11 thay vì 8/11. Bộ nối giả trong smoke không gửi sự kiện như vậy nên không bắt được.

**Đề xuất sửa plan.** Bước 8 chỉ chạy khi ô sẽ áp là "tạo dòng" hoặc "kích hoạt lại" (state hiện tại `null`, `expired`, `revoked`) **và** sự kiện có trial.
Cách gọn: `applyEvent` trả thêm `startsTrial: boolean` (tính từ ô), bước 8 dùng cờ đó. Sau commit chỉ gọi `endTrialNow` khi gói vừa được ghi `trial_denied =
true`. Thêm test Task 17: "a second subscription_started with a trial on a trialing row → recorded, no trial_history insert, no endTrialNow".

### 4. (trung bình) Task 18 — job chuyển trạng thái nhận biết "dòng đã đổi" bằng `last_event_at`

**Sai ở đâu.** `subscriptions-time` đọc ứng viên, gọi `fetchState` không khóa, rồi trong transaction "if `last_event_at` is unchanged since the candidate read
write the fetched state, then write `effectiveStatus(...).status` when it differs" (plan dòng 857-860). Nhưng sự kiện cộng thêm (`renewed`,
`payment_succeeded`) luôn áp và chỉ đặt `last_event_at = max(cũ, occurred_at)` (plan dòng 460-462; design dòng 415-416). Một `renewed` tới muộn có
`occurred_at` cũ hơn `last_event_at` sẽ dời kỳ mà **không** đổi `last_event_at`. Plan cũng không nói `effectiveStatus` tính trên dòng vừa đọc lại dưới khóa
hay trên bản đọc lúc chọn ứng viên.

**Bằng chứng.** Plan dòng 460-462, 857-860; design dòng 415-416.

**Hỏng ở kịch bản nào.** Gói của Lan `active`, kỳ hết 30/11; ngày 28/11 có `cancel_scheduled` (`last_event_at` = 28/11) rồi Lan bật lại ở trang nhà cung cấp,
`renewed` của kỳ mới có `occurred_at` 27/11 (gửi trước, tới sau). Job chọn ứng viên lúc 01/12 00:10 (dòng còn `cancel_at_period_end`, quá cuối kỳ) → trong lúc
đó `renewed` được áp, kỳ dời tới 31/12, `last_event_at` vẫn 28/11 → job thấy "chưa đổi", ghi trạng thái hỏi lại cũ hoặc `expired` tính từ bản đọc cũ → Lan mất
Pro dù đã trả tiền.

**Đề xuất sửa plan.** So bằng `updated_at` (đổi ở mọi lần ghi) hoặc một cột `version`, không bằng `last_event_at`. Ghi rõ: dưới khóa, đọc lại dòng và tính
`effectiveStatus` trên dòng đó. Bọc `fetchState` từng gói trong `try/catch` để một gói lỗi không dừng cả job. Thêm test "an additive event applied between the
candidate read and the lock → the job writes nothing".

### 5. (trung bình) Task 19 — đánh dấu 50 email `sending` trước khi gửi

**Sai ở đâu.** `entitlement-notices-send` "claim up to 50 rows … set `sending`, commit; then per row … send" (plan dòng 896-901), và lỗi gửi `unknown` giữ
`sending` "never resent, as reminders". Email nhắc học thì khác: dòng `sending` được tạo **ngay trước** mỗi lần gửi, một dòng một lần, nên process chết chỉ
làm mất tối đa một email.

**Bằng chứng.** Plan dòng 896-901; `src/notifications/scheduler/reminder-send.service.ts:56-61` (tạo `sending` ngay trước `provider.send`), `:68-71`
(`unknown` giữ `sending`).

**Hỏng ở kịch bản nào.** Job nhận 50 dòng (nhắc trial của Lan và 49 người khác), commit `sending`, gửi được 1 thì process API bị restart (deploy, OOM). 49 dòng
còn lại nằm ở `sending` mãi: lượt sau chỉ nhận `pending`/`failed`. Lan không nhận email nhắc trước khi bị trừ tiền — đúng loại email design coi là quan trọng
về pháp lý (design dòng 636-638, mục 19).

**Đề xuất sửa plan.** Nhận và đánh dấu **từng dòng** ngay trước khi gửi (transaction ngắn: `SELECT … FOR UPDATE SKIP LOCKED LIMIT 1`, kiểm cửa sổ, ghi `sending`,
commit, gửi, ghi kết quả), lặp tối đa 50 lần. Hoặc giữ cách nhận theo lô nhưng để dòng ở `pending` kèm `claimed_until`, chỉ ghi `sending` ngay trước lần gửi
của dòng đó. Thêm test "a crash after claiming leaves unsent rows retryable".

### 6. (trung bình) Task 21 — smoke chạy hai chế độ `fetchState` nhưng lệnh con đọc cấu hình khác

**Sai ở đâu.** (a) `pnpm maintenance:run` và `pnpm entitlements:fake-ai` là process riêng, tự đọc `.env` (`process.loadEnvFile`), và biến môi trường
đã có thì thắng file (đã thử trong phiên này). Job `subscriptions-time` (gọi `fetchState` cho gói quá kỳ, D31) chạy trong process của `maintenance:run`, không
phải trong API. Plan chỉ nói "restart the API with `BILLING_FAKE_FETCH_STATE=false`" và smoke đọc `SMOKE_FETCH_STATE` (dòng 951, 956). Nếu biến được đặt
cho lệnh chạy API mà không có trong `.env`, process `maintenance:run` vẫn bật `fetchState`. (b) Ở chế độ bật, mỗi lần sự kiện bị `stale` hay thiếu trường, trạng
thái hỏi lại từ bảng của bộ nối giả **ghi đè** `current_period_*` mà smoke đã lùi bằng SQL. Plan chỉ nhắc lùi `fake_billing_subscriptions.current_period_end`
cho B5#29 (dòng 944-945). (c) `runAll` chạy job tuần tự theo thứ tự đăng ký, cùng một `now`; plan không cố định thứ tự, nên nếu `notices-send` đăng ký trước
`notices-plan` thì một lần `maintenance:run` chỉ tạo dòng mà không gửi (B5#4, B5#5 cần hai lần chạy).

**Bằng chứng.** `src/cli/run-maintenance.ts:13`; `src/main.ts:9-11`; `scripts/smoke-buoc-4.mjs:23` (chỉ nạp `.env` khi thiếu `DATABASE_URL`), `:504`
(`execFileSync` lệnh con); `src/common/maintenance/maintenance.scheduler.ts:39-50`; plan dòng 944-945, 951-957.

**Hỏng ở kịch bản nào.** Lượt "tắt" của B5#29: smoke lùi `current_period_end` 11 ngày, chạy `maintenance:run`; process đó có `fetchState` nên đi đường hỏi lại,
không đi đường "không có `fetchState`" mà lượt này sinh ra để kiểm. Smoke vẫn xanh, nhưng một nửa yêu cầu R10 không được kiểm. Ở lượt "bật", B5#10 (sự kiện
`stale`) ghi lại kỳ chưa lùi từ bảng giả, làm bước kế tiếp đã lùi kỳ cho ra kết quả khác lượt "tắt".

**Đề xuất sửa plan.** Smoke truyền `BILLING_FAKE_FETCH_STATE` (và `BILLING_FAKE_ENABLED`) vào `env` của mọi lệnh con, hoặc plan ghi "đổi giá trị trong `.env`,
không đặt bằng shell", và smoke in giá trị mà `maintenance:run` thấy (ví dụ một dòng log khi khởi động). Mọi `UPDATE` lùi kỳ trên `subscriptions` trong chuỗi
thanh toán đi kèm `UPDATE` tương ứng trên `fake_billing_subscriptions` (một helper `travel(subId, …)`), hoặc mỗi kịch bản dùng một gói giả mới. Cố định thứ tự:
đăng ký `subscriptions-time` → `entitlement-notices-plan` → `entitlement-notices-send` trong một service, hoặc smoke chạy `maintenance:run` hai lần và ghi lý do.

### 7. (trung bình) Task 14, 21 — hai ca chạy đua chưa làm được như viết

**Sai ở đâu.** (a) B5E11 là "còn 1 lượt của trần, **hai người dùng khác nhau** cùng `reserve`". `entitlements:fake-ai` nhận một `--user` (plan dòng 724-726).
Chạy 10 process riêng thì mỗi process tốn vài giây khởi động Nest trong khi một `reserve` mất vài mili giây, nên các lời gọi gần như không chồng nhau, và helper
của smoke dùng `execFileSync` (đồng bộ). (b) B5E73: "firing `POST /sessions` and the first answer of the open session together 10 times on a learner with 2
counted sessions" (dòng 949-950). Sau lần đầu, nếu câu trả lời thắng thì đã có 3 phiên được tính, mọi lần mở sau bị 403 và không còn phiên mở để đua; nếu lần mở
thắng thì phiên cũ bị đóng. Plan không có bước đặt lại. Helper `api` của smoke tự chờ khi gặp 429, nên một request bị lùi lại là hết "cùng lúc"; `POST /sessions`
dùng rule `user.write` 30 lần/60 s.

**Bằng chứng.** Plan dòng 724-726, 945-950; `scripts/smoke-buoc-4.mjs:11, 68-71, 504`; `src/practice/sessions/sessions.controller.ts:32-35`
(`@RateLimit('user.write')`); `src/common/config/app-config.ts:98`.

**Hỏng ở kịch bản nào.** Smoke in `ok` cho B5E11 và B5E73 nhưng thực ra không có hai giao dịch nào chồng nhau; Review Focus 1 (dòng 200-203) coi đây là bằng chứng
duy nhất cho khóa (design §17 mục 3), nên lỗi khóa sẽ lọt.

**Đề xuất sửa plan.** Task 14: thêm `--users <uuid,uuid,…>` (mỗi lời gọi song song lấy một người theo vòng) để B5E11 chạy trong một process. Task 21, B5E73:
mỗi vòng dùng một learner riêng (hoặc `DELETE` dòng sổ thứ ba bằng `psql` để về 2), mở phiên, gọi `next` lấy câu đầu, rồi bắn `POST /sessions` và `answer` bằng
`Promise.all` với `fetch` thẳng (không qua helper tự chờ 429); kiểm sau mỗi vòng: số dòng `practice_sessions` của ngày ≤ 3 và đúng một trong hai request thành
công. Ghi rõ số request ghi mỗi phút để không chạm `user.write`.

### 8. (trung bình) Task 12 ↔ Task 6 — thiếu dữ liệu để gọi bộ nối; lời gọi nằm trong transaction của interceptor

**Sai ở đâu.** (a) Sau commit, Task 12 gọi `registry.get(provider)?.cancelAtPeriodEnd(externalSubscriptionId)` cho "each paid subscription found" (plan dòng
666-668), và lấy gói từ `SourcesRepository` (dòng 649). Nhưng `SubscriptionSource` (Task 6) không có `provider` lẫn `externalSubscriptionId` (dòng 400-402).
Một lần cấp chỉ có một cột `paid_renewal_action`, trong khi có thể có hai gói trả tiền (Apple và web, B5E58) cho hai kết quả khác nhau. (b) `POST grants` có
`@Idempotent()`: `runIdempotent` mở một transaction, giữ advisory lock của khóa idempotency, chạy handler bên trong và chỉ lưu kết quả sau khi handler trả về, với
giới hạn 30 s. Lời gọi `cancelAtPeriodEnd` "after commit" vì vậy vẫn nằm trong transaction còn mở đó.

**Bằng chứng.** Plan dòng 400-402, 649, 661-668; `src/common/idempotency/idempotency.service.ts:18` (30 s), `:30-31` (transaction + advisory lock), `:68`
(handler chạy bên trong), `:80-82` (timeout, `Promise.race`).

**Hỏng ở kịch bản nào.** (a) Người làm Task 12 phải tự viết thêm truy vấn; nếu dùng `id` gói thay cho mã của nhà cung cấp thì bộ nối giả không tìm thấy gói.
(b) Nhà cung cấp thật trả lời chậm 35 s: request trả 500, lần cấp **đã commit**, khóa idempotency bị rollback (không lưu kết quả). Staff bấm lại cùng
`Idempotency-Key` → tạo lần cấp thứ hai, lần thứ nhất bị thu hồi `replaced` (D32), `cancelAtPeriodEnd` bị gọi lại.

**Đề xuất sửa plan.** Thêm `provider`, `externalSubscriptionId` vào `SubscriptionSource` (Task 6) hoặc cho Task 12 một hàm đọc riêng ghi trong Interfaces.
`paid_renewal_action`: ghi rõ luật khi nhiều gói (ví dụ `not_supported` nếu có ít nhất một gói không tắt được). Đặt timeout cho mọi lời gọi bộ nối (ví dụ 5 s,
`ASSUMPTION`), thấp hơn hẳn 30 s, và ghi vào Global Constraints rằng route có `@Idempotent()` vẫn đang trong transaction của interceptor khi gọi bộ nối.

### 9. (trung bình) Task 14 — phụ thuộc vào cấu hình của Task 15 mà bảng phiên không ghi

**Sai ở đâu.** `entitlements:fake-ai` "refuses to start … unless `BILLING_FAKE_ENABLED=true` (never on production, plan choice 1)" (plan dòng 726-727).
Cờ đó và `BILLING_PRODUCTION` chỉ có trong `AppConfig.billing` do Task 15 thêm (dòng 748-751), thuộc PR G1 của phiên S3. Bảng phiên ghi S2 chỉ chờ
"9: PR A1; 12: PR B1, PR D1" (dòng 50); bảng luồng cũng vậy (dòng 65).

**Bằng chứng.** Plan dòng 50, 65, 726-727, 748-751; `src/common/config/app-config.ts` hiện không có nhóm `billing` (không có cờ production).

**Hỏng ở kịch bản nào.** S2 làm Task 14 trước khi G1 merge: hoặc đọc thẳng `process.env.BILLING_FAKE_ENABLED` (bỏ qua kiểm "production + fake" của
`loadConfig`), hoặc dùng `config.billing` chưa tồn tại → PR E2 hỏng typecheck trên CI.

**Đề xuất sửa plan.** Thêm "14: PR G1" vào cột chờ của S2 và luồng E, và vào Consumes của Task 14 (`config.billing.fakeEnabled`, Task 15). Thứ tự merge
trong brief (dòng 109-110) đã đặt G1 trước E2 nên không đổi.

### 10. (trung bình) Task 4, 8, 16, 17 — sự kiện thiếu trường hoặc dữ liệu lạ

**Sai ở đâu.** (a) `ParsedEvent.event = null` khi thiếu trường (plan dòng 486-487), `BillingInbox.store` lưu `payload` = sự kiện chuẩn hóa (dòng 778), nhưng
cột `payload` là `Json` bắt buộc (dòng 328). Applier phân biệt "thiếu trường" bằng gì cũng chưa ghi. (b) `appUserId` là `string | null` tùy ý; applier gọi
`getProfile(appUserId)` (dòng 817), mà `users.id` là `@db.Uuid`. (c) `fakeParse` trả `null` cho cả body khi gặp một loại sự kiện lạ (dòng 495-497, 502), và
`verify` chỉ có `{ ok: true; events } | { ok: false }` (dòng 487-488), nên một sự kiện lạ làm cả lô thành 400 "chữ ký sai".

**Bằng chứng.** Plan dòng 328, 486-488, 495-497, 502, 778, 817; `prisma/models/identity.prisma:2` (`@db.Uuid`).

**Hỏng ở kịch bản nào.** Sự kiện `renewed` thiếu `transaction_id` → lưu `payload: null` vào cột NOT NULL → `store` lỗi → 500 → nhà cung cấp gửi lại mãi; design
B5E45 muốn lưu và `ignored`. Sự kiện có `app_user_id = "abc"` → `ASSUMPTION` (chưa chạy): Postgres từ chối chuỗi không phải uuid → applier lỗi, thử 5 lần,
`billing_event_stuck`, thay vì `ignored` / `unknown-user`. Với bộ nối thật, nhà cung cấp gửi nhiều loại sự kiện Wordmet không dùng; trả 400 làm họ gửi lại mãi và
có thể khóa webhook.

**Đề xuất sửa plan.** Cho `payload` nullable (hoặc lưu `{ "missing": [...] }`) và ghi cách applier nhận ra. `fakeParse`/`verify` kiểm `app_user_id` là uuid
chữ thường, sai thì coi như `null`. Tách "chữ ký sai" (400, không lưu) với "chữ ký đúng nhưng loại lạ" (ack 2xx, lưu `ignored` hoặc bỏ qua, log), và thêm biến thể
đó vào kiểu trả về của `verify`. Applier ghi `billing_events.user_id` khi nhận ra người dùng (design §6 có cột này; plan chưa nói ai ghi).

### 11. (trung bình) SR10 — không có test nào giữ luật "không log dữ liệu riêng tư"

**Sai ở đâu.** Plan có luật privacy ở Global Constraints (dòng 165-166) nhưng không task nào kiểm log. B5E62 ("log của webhook, cấp tay, sổ lượt … không có số
thẻ, email, `raw_payload`") không xuất hiện trong plan; test B5E44 của Task 16 (dòng 794) chỉ kiểm 400 và `store` không bị gọi. Logger chỉ che các khóa khớp
`password|otp|code|token|cookie|authorization|answer|contextSentence`; một trường tên `email`, `reason`, `payload`, `fingerprint` sẽ được ghi nguyên văn.

**Bằng chứng.** Plan dòng 165-166, 794; design B5E62 (dòng 730); `src/common/logging/app-logger.ts:16, 29-39`.

**Hỏng ở kịch bản nào.** Người làm Task 17 log `trial_reuse_detected` kèm `{ fingerprint }` để dễ tra; người làm Task 12 log `paid_renewal_not_cancelled` kèm
`{ reason }` của lần cấp. CI vẫn xanh.

**Đề xuất sửa plan.** Thêm test dùng `ctx.logs` của `createTestApp` (hoặc sink giả) ở Task 12 (tạo, thu hồi), Task 16 (chữ ký sai), Task 17 (trial bị từ chối,
thiếu trường), Task 19 (lỗi gửi): log có `operation_id` và không chứa địa chỉ email, `reason`, payload, chữ ký, fingerprint của dữ liệu test. Đặt tên test
`B5E62: …`.

### 12. (thấp) Bảng "Verified", Task 16 — lý do raw parser hoạt động ghi sai

**Sai ở đâu.** Plan ghi "body-parser skips when `req._body` is set" (dòng 135). Đó là cách của body-parser 1.x. Bản đã cài (2.3.0, qua Express của
`@nestjs/platform-express` 12) bỏ qua khi `onFinished.isFinished(req)` — tức request đã đọc hết (`req.complete && !req.readable`). Kết quả vẫn như plan muốn:
raw parser đọc hết body webhook, parser JSON đăng ký sau sẽ bỏ qua. `useBodyParser(parser, options)` có trong Nest 12 và chuyển `options` (kể cả `type` là hàm)
thẳng cho `express[type]`. Body-parser gặp quá `limit` thì `next(err)` với 413, và filter hiện có đổi thành `payload-too-large`.

**Bằng chứng.** `body-parser@2.3.0/lib/read.js:40-44`; `on-finished@2.4.1/index.js` (`isFinished`, nhánh `IncomingMessage`); `@nestjs/platform-express/
adapters/express-adapter.js:252-256`; `src/common/problem-details/problem-details.filter.ts:53-55`.

**Hỏng ở kịch bản nào.** Người làm đọc lý do cũ, tự đặt `req._body = true` hoặc thử lại theo kiểu 1.x khi test đầu tiên của Task 16 đỏ vì lý do khác.

**Đề xuất sửa plan.** Sửa dòng 135: "body-parser 2.x bỏ qua request đã đọc xong (`onFinished.isFinished`)". Giữ test đầu tiên của Task 16 như plan đã định.

### 13. (thấp) Task 2 — thiếu `ItemsService`

**Sai ở đâu.** "`GroupsService`, `PrivateWordsService` and `SentencesService` gain `SettingsService`" (plan dòng 273-274). Hai chỗ `GROUP_ITEMS_MAX` nằm ở
`ItemsService` (`linkInTx`, `bulkAdd`), service này hiện không inject `SettingsService`.

**Bằng chứng.** `src/learning/items/items.service.ts:32-38` (constructor), `:63`, `:83`.

**Hỏng ở kịch bản nào.** Không hỏng lâu (compile báo lỗi), nhưng Interfaces của task nói sai.

**Đề xuất sửa plan.** Thêm `ItemsService` vào câu đó.

### 14. (thấp) Task 4 — tên database

**Sai ở đâu.** Step 3 dùng `english_learning_b5_c` (plan dòng 358-359); brief điều phối tạo `english_learning_b5_s<n>` (dòng 102), và Task 4 chạy ở S1.

**Bằng chứng.** Plan dòng 102, 358-359.

**Hỏng ở kịch bản nào.** Lệnh `psql` của Step 3 trỏ vào database không tồn tại.

**Đề xuất sửa plan.** Đổi thành `english_learning_b5_s1`.

### 15. (thấp) Task 11 — kiểm hạn mức sau phần việc đắt

**Sai ở đâu.** `checkQuota` đặt ngay sau `updateMany` (plan dòng 623-625), tức sau vòng tìm từ dùng được theo lô (transaction cho phép 30 s, đang giữ khóa
Practice của người học). Người đã hết phiên vẫn chạy hết vòng đó rồi mới bị 403. Người hết phiên mở một nhóm rỗng nhận 409 `practice-no-words` thay vì 403
`quota-exhausted`.

**Bằng chứng.** `src/practice/sessions/sessions.service.ts:19` (30 s), `:70-93` (vòng tìm), `:95-97`; plan dòng 623-625.

**Hỏng ở kịch bản nào.** Lan đã dùng 3 phiên, bấm "Bắt đầu" với nhóm 2.000 từ: chờ vài giây mới thấy báo hết lượt; app không biết nên hiện "hết lượt" hay "nhóm
không có từ".

**Đề xuất sửa plan.** Thêm một lần `checkQuota` không có `tx` ở đầu `start` (chỉ để trả lời sớm), giữ lần kiểm chính thức sau `updateMany` (R4 không đổi). Thêm
test "an exhausted learner is refused before the availability walk".

### 16. (thấp) Task 20 — `smoke:buoc-4` hỏng giữa hai lần merge

**Sai ở đâu.** Learner của `smoke:buoc-4` bị giới hạn ngay khi PR F1 merge; bản sửa (Task 20) nằm trong PR Z1, merge cuối cùng (plan dòng 109-110). Trong khoảng
đó ai chạy `smoke:buoc-4` trên `dev` cũng thấy 403.

**Bằng chứng.** Plan dòng 109-110, 920-931; `scripts/smoke-buoc-4.mjs:253` (mở nhiều phiên có trả lời).

**Hỏng ở kịch bản nào.** Một phiên khác (ví dụ phiên làm UI) chạy `smoke:buoc-4` để kiểm việc của mình và tưởng mình làm hỏng Practice.

**Đề xuất sửa plan.** Ghi khoảng này vào brief điều phối, hoặc chuyển Task 20 vào PR E2 (Task 20 chỉ cần API cấp tay của Task 12).

### 17. (thấp) Task 19 — khóa chống trùng chưa định nghĩa đủ; cảnh báo trần có thể mất

**Sai ở đâu.** Plan chỉ ghi `period_key` cho `renewal_notice` (= cuối kỳ) và cảnh báo trần (= ngày) (plan dòng 889-895). `trial_reminder` và `expiry_notice`
chưa có `subject_key`/`period_key`, trong khi B5#5 ("chạy lại không thêm dòng") dựa vào unique `(kind, subject_key, period_key, recipient_user_id)`. Thêm:
lựa chọn 7 tạo cảnh báo trần ở job mỗi giờ, cửa sổ hết lúc 0 giờ Việt Nam; job chạy theo `setInterval` từ lúc process khởi động, không canh giờ.

**Bằng chứng.** Plan dòng 195-196, 889-895; `src/common/maintenance/maintenance.scheduler.ts:52-55`.

**Hỏng ở kịch bản nào.** Job chạy lúc 23:15 và 00:15; số lượt chạm 75% lúc 23:40 → lúc 00:15 đã sang ngày mới, ngày cũ không có cảnh báo (không phải "trễ tối đa
một giờ" như design §14 mà là không gửi). Xem câu Q4.

**Đề xuất sửa plan.** Ghi: `trial_reminder` = (`subscription.id`, `trial_ends_at` ISO); `expiry_notice` = (`subscription.id`, `current_period_end` ISO).
Phần cảnh báo trần chờ câu trả lời Q4.

### 18. (thấp) Task 7 — `current_transaction_id` của gói "app tự gia hạn"

**Sai ở đâu.** `renewed` ghi `current_transaction_id` (plan dòng 451-452); `payment_succeeded` thì không (dòng 456-457). `refunded` cắt Pro khi giao dịch là
giao dịch hiện tại **hoặc** `current_transaction_id` là `null` (dòng 454). Vậy với gói `app:<user_id>`, mọi lần hoàn tiền đều cắt Pro, kể cả hoàn cho một lần
trả cũ. Quy tắc "null → cắt" là lựa chọn của plan, design D34 không nói trường hợp này.

**Bằng chứng.** Plan dòng 451-457; design dòng 462, 467, 482-484.

**Hỏng ở kịch bản nào.** Xem Q2, Q3.

**Đề xuất sửa plan.** Sau khi chủ dự án trả lời Q2, Q3: ghi rõ `payment_succeeded` có đặt `current_transaction_id` không (và khi nối kỳ thì là giao dịch nào),
thêm dòng test tương ứng vào bảng 98 ô.

### 19. (thấp) Vài chỗ người làm phải đoán

- Task 12: `touchesAiLimits` khi **tạo** chưa ghi; theo D7/D33 phải là "có khóa `ai_*`, kể cả 0" như khi thu hồi (plan dòng 651-654).
- Task 9: `snapshot(userId)` với người không tồn tại làm gì chưa ghi, trong khi Task 13 test "user view 404 for an unknown id" (dòng 710).
- Task 17 bước 5: sau khi áp trạng thái hỏi lại cho sự kiện thiếu trường, sự kiện mang trạng thái gì (`applied`? `ignored`?) chưa ghi (dòng 820-821).
- Task 17: "bind the real applier to `BILLING_APPLY_PORT`" ở `webhook.controller.ts` (dòng 807-808); provider thuộc module, nên ghi là `entitlements.module.ts`
  (`useExisting`).

**Đề xuất sửa plan.** Thêm một câu cho mỗi điểm trong Interfaces của task đó.

### 20. (thấp) Bản tóm tắt thiếu hai lựa chọn

**Sai ở đâu.** `buoc-5.md` liệt kê 5 lựa chọn (dòng 18-24); plan có 7 (dòng 182-196). Thiếu lựa chọn 4 (raw parser riêng cho webhook) và 6 (chuyển
`classifyMailError` sang `src/common/mail/`, sửa một file của Notifications).

**Bằng chứng.** `docs/deliveries/buoc-5.md:18-24`; plan dòng 182-196.

**Đề xuất sửa plan.** Thêm hai dòng vào bản tóm tắt; đánh số theo plan để hai bản khớp nhau.

### 21. (thấp) Task 21 — thứ tự B5#2 và B5#3

**Sai ở đâu.** "open three, answer the first question of each, fourth → 403; five open-and-abandon" (plan dòng 942) trên cùng một learner. Sau bước đầu đã có 3
phiên được tính, nên 5 lần mở sau đều 403, không kiểm được B5#3.

**Bằng chứng.** Plan dòng 942; design B5#3 (dòng 773).

**Đề xuất sửa plan.** Làm B5#3 trước B5#2, hoặc trên một learner khác.

## Kết quả kiểm theo từng yêu cầu

**Coverage.** Mọi B5#1–B5#34 có chỗ kiểm: unit ở task tương ứng và smoke Task 21 (B5#6–B5#8, B5#11, B5#12 nằm trong khoảng "B5#4 → B5#13", dòng 943).
B5E59 (Bước 8) và B5E74 (Bước 7) được hoãn có ghi rõ. Không có trong plan: **B5E62** (xem #11) và **B5E10** (chấm bài không đi qua Entitlements; đúng sẵn vì
Bước 5 không sửa chấm, nhưng nên ghi một dòng). B5E48, B5E49, B5E51, B5E52 không có test riêng; được phủ bởi các ô của bảng 98 ô (Task 7) và B5#7, B5#12,
B5#13 của smoke — đủ.

**Interface.** `Refusal`, `ReserveResult`, `EntitlementsSnapshot`, `applyEvent`, `orderDecision`, `BILLING_APPLY_PORT`, ba hàm khóa và
`entitlements.types.ts` khớp giữa nơi tạo và nơi dùng. `checkQuota(…, tx)` của Task 9 khớp cách Task 11 gọi; truyền `{ allowed: false } & Refusal` vào
`refusalProblem(refusal: Refusal)` hợp lệ về kiểu. Lệch: `SubscriptionSource` thiếu trường cho Task 12 (#8).

**Phụ thuộc.** Bảng phiên và bảng luồng đúng với Files/Interfaces trừ Task 14 → G1 (#9). Thứ tự merge trong brief (C1, A1, B1; C2, D1; E1, G1; F1, E2, G2; H1;
Z1) thỏa mọi phụ thuộc. Danh sách file nhiều luồng cùng sửa đủ (`entitlements.module.ts`, `index.ts`, `package.json`); `src/notifications/scheduler/**` chỉ
Task 19 sửa.

**Bảng "Verified on 19/10/2026".** Số dòng và nhận định đúng với code: Practice (`sessions.service.ts:68-69, 95-97, 198-200, 42-43, 277, 314`;
`answers.service.ts:78, 92, 112-121`, `locked()` ở 142-154), Limits, Settings, Identity, Mail, Jobs, HTTP, SQL idioms, Config, Smoke (520 dòng). Sai một
chỗ: lý do của dòng "Not verified" (#12). Đường dẫn `session-store.ts:5` là `apps/admin/src/auth/session-store.ts:5`.

**Thư viện.**
- Raw parser trước JSON parser: đúng (#12, kiểm trên source đã cài).
- `ON CONFLICT DO NOTHING` không có `conflict_target` bắt mọi unique index kể cả partial: đúng theo tài liệu Postgres 17 ("when omitted, conflicts with all
  usable constraints (and unique indexes) are handled"). Áp dụng đúng cho `recordPracticeSession` (dòng mới thỏa điều kiện của index) và `trial_history` (bắt cả
  unique `user_id` lẫn unique một phần của thẻ). `ON CONFLICT (dedupe_key)` của Task 16 dùng unique đầy đủ, không cần điều kiện.
- `prisma migrate diff` với partial index và CHECK chỉ có trong migration: có tiền lệ đã qua CI (`20261018150000_practice/migration.sql:119-133`,
  `20261017210000_learning/migration.sql:90`); không chạy lại trong phiên này.

**Khóa.** Thứ tự ở Global Constraints không tạo vòng chờ: applier (dòng sự kiện → người → dòng gói), cấp tay (người, chỉ đọc gói), job thời gian (chỉ dòng gói,
`SKIP LOCKED`), sổ lượt (kho → khóa chung), Practice (khóa Practice → dòng phiên → dòng câu; `recordPracticeSession` không lấy advisory lock). Khóa
idempotency là `pg_try_advisory_xact_lock` nên không chờ. Vi phạm "không gọi bộ nối khi giữ khóa": #1 (Task 17), #8 (transaction của interceptor). Rủi ro mới:
#2 (pool), #4 (lost update của job). Job `usage-expire` không lấy khóa kho; tranh chấp với `confirm` chỉ ở mức dòng và kết quả xấu nhất vẫn đúng luật R7.

**Test không có e2e backend.** Test của Task 1–10, 12–16, 18–19 viết được bằng unit với fake như plan tả; `createTestApp` với Prisma giả đã có tiền lệ
(`src/identity/profile/profile.controller.spec.ts:19-22`). Task 11 làm được nhưng nặng (7 dependency, `start` gọi Learning, QuestionBuilder, PracticeStats trước
`updateMany`). Smoke: xem #6, #7, #21.

## Đánh giá 7 lựa chọn của plan (dòng 182-196)

1. `BILLING_PRODUCTION`: hợp lý, cần vì config chưa có cờ production. An toàn phụ thuộc việc deploy nhớ đặt `true`; design đã đưa vào checklist Deploy (R17).
   Không đổi hành vi đã duyệt.
2. Ghi phiên ở mọi lần ghi kết quả cuối: đúng (đã kiểm ngữ nghĩa `ON CONFLICT` với partial index; các lần ghi của cùng phiên đã nối tiếp nhau qua khóa dòng
   phiên). Không đổi hành vi.
3. Hai cột thêm và bảng của bộ nối giả: hợp lý. Riêng "`current_transaction_id` null → cắt Pro" là một hành vi design chưa có (#18, Q2).
4. Raw parser riêng cho route: hợp lý, cơ chế đúng (#12). Không đổi hành vi.
5. `entitlements:fake-ai` là CLI: hợp lý; thiếu chế độ nhiều người dùng (#7).
6. Chuyển `classifyMailError`: hợp lý, tránh Entitlements import Notifications.
7. Cảnh báo trần do job mỗi giờ: giữ khóa chung ngắn là đúng, nhưng có trường hợp **không gửi** (không chỉ trễ) khi chạm ngưỡng trong giờ cuối của ngày (#17, Q4).

## Câu cần chủ dự án quyết

Theo luật D1: chủ dự án trả lời trước, Claude đề xuất sau. Dưới đây chỉ có bối cảnh và ràng buộc; các phương án không xếp theo thứ tự ưu tiên.

**Q1. Cấp "một gói" Pro bắt đầu ở tương lai khi người đó đang có một lần cấp Pro.**
D32 nói cấp Pro là gói mới, lần cấp cũ tự thu hồi; plan thu hồi ngay lúc tạo (plan dòng 665-666). Design không nói gì về lần cấp mới có `starts_at` ở tương lai.
Ví dụ: Lan được cấp Pro tới 30/11. Ngày 10/11, editor tạo thêm lần cấp Pro từ 1/12 tới 31/12 để Lan dùng tiếp. Theo plan hiện tại, lần cấp tới 30/11 bị thu hồi
ngay 10/11, nên Lan là Free từ 10/11 tới 1/12. Các cách có thể: thu hồi ngay (như plan); thu hồi lần cũ vào đúng `starts_at` của lần mới; không thu hồi khi hai
khoảng không chồng nhau. Ràng buộc: mốc chu kỳ lượt AI đổi theo lần cấp mới (D32), và hệ thống không có job nào "bật" lần cấp đúng giờ (quyền được tính lúc đọc).

**Q2. Hoàn tiền khi không biết giao dịch nào đã trả cho kỳ đang dùng.**
D34: hoàn tiền cho kỳ đang dùng thì mất Pro ngay; hoàn cho giao dịch khác thì chỉ ghi lại. Khi gói được tạo từ một sự kiện không kèm mã giao dịch (ví dụ
`subscription_started` của lần trừ tiền đầu, mã là trường không bắt buộc), Wordmet không biết giao dịch của kỳ đang dùng. Plan chọn: khi đó mọi hoàn tiền đều cắt
Pro (plan dòng 454).
Ví dụ: gói của Lan bắt đầu bằng một sự kiện không có mã giao dịch. Tháng sau admin hoàn một phần cho một lần trừ tiền cũ do tính nhầm. Theo plan, Lan mất Pro ngay.
Các cách có thể: cắt Pro (như plan); chỉ ghi lại; hỏi lại nhà cung cấp (`fetchState`) rồi mới quyết, và khi không hỏi được thì chọn một trong hai cách trước.
Ràng buộc: bộ nối giả luôn gửi được mã; trường hợp này chỉ xảy ra với nhà cung cấp thật.

**Q3. Hoàn tiền một lần trả trước của gói "app tự gia hạn".**
Gói "app tự gia hạn" nối kỳ khi người dùng trả thêm lúc còn hạn (R11). Design không nói hoàn tiền cho một lần trả **chưa tới kỳ** thì làm gì, và plan chưa ghi
`current_transaction_id` cho kiểu gói này (#18).
Ví dụ: ngày 1/11 Lan trả tháng 11 (lần A); ngày 20/11 trả thêm tháng 12 (lần B), gói được nối tới 31/12. Ngày 25/11 Lan đòi lại tiền lần B và admin hoàn. Có thể:
coi lần B "không phải kỳ đang dùng" nên chỉ ghi lại (Lan vẫn có Pro tới 31/12 dù đã được hoàn); rút ngắn kỳ đi 30 ngày (Pro tới 1/12); cắt Pro ngay như hoàn kỳ
đang dùng (Lan mất cả phần tháng 11 đã trả). Ràng buộc: V1 chưa có nhà cung cấp thật kiểu này (VNPay, MoMo là ứng viên); D24 không hoàn tiền từ phía app.

**Q4. Cảnh báo trần AI khi số lượt chạm ngưỡng trong giờ cuối của ngày.**
D18 chốt cảnh báo 75%, tối đa một lần mỗi ngày; design §14 chấp nhận trễ khoảng một giờ. Plan (lựa chọn 7) tạo cảnh báo bằng job mỗi giờ để khóa chung của trần giữ
ngắn, và job không canh theo giờ đồng hồ.
Ví dụ: trần 1.000 lượt. Job chạy lúc 23:15 (đã dùng 700) và 00:15. Lúc 23:40 số lượt lên 760. Tới 00:15 đã là ngày mới, nên ngày hôm trước không có email cảnh báo
nào, dù đã vượt 75%. Các cách có thể: chấp nhận mất cảnh báo trong trường hợp này; trong giờ đầu của ngày mới, job xét thêm ngày hôm trước và vẫn gửi; tạo cảnh báo
ngay trong `reserve` lúc vượt ngưỡng (plan đã bỏ cách này vì nó kéo dài thời gian giữ khóa chung). Ràng buộc: cảnh báo chỉ gửi cho admin, không ảnh hưởng người học.
