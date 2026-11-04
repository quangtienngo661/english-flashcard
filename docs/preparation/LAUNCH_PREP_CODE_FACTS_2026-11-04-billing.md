# Code facts cho design "bán Pro qua VietQR + payOS" (04/11/2026)

Bản khảo sát code (chỉ đọc) cho design doc bán gói Pro bằng chuyển khoản VietQR, xác nhận qua `webhook` của payOS. Đọc trên worktree
`launch-prep-design`, nhánh `docs/launch-prep-design`, commit `a6b2bd15` (đỉnh `dev` sau PR #210). Mọi đường dẫn tính từ gốc repo; `path:line`
là dòng của file tại commit đó. Hai file research nằm trên nhánh `docs/web-launch-research` (đọc bằng `git show`). Tài liệu payOS đọc ngày
**04/11/2026**. Điểm chưa xác nhận ghi `ASSUMPTION`; suy luận của người khảo sát ghi (S).

Quyết định của chủ dự án dùng làm khung (từ yêu cầu, chưa có decision record): kỳ 1 / 3 / 12 tháng giá 79.000 / 199.000 / 599.000 ₫, trả tay
từng kỳ (không tự gia hạn, mở lại D35 của Bước 5), không trial, không hoàn tiền, trả khi gói còn hạn thì kỳ mới nối sau kỳ hiện tại (kể cả
chuyển nhầm hai lần), nút admin "Đã nhận tiền" làm dự phòng, email "sắp hết hạn, trả kỳ tiếp", một thiết kế adapter dùng được cho nhà cung
cấp tự gia hạn sau này (MoMo), và khi có nhà cung cấp tự gia hạn thì người dùng tự chọn chuyển.

---

## 0. Mười điểm ảnh hưởng design nhất

1. **Port `BillingAdapter` chỉ nhận sự kiện, không tạo thanh toán.** Có `verify`, `ack` và ba method tùy chọn `fetchState`, `endTrialNow`,
   `cancelAtPeriodEnd` (`apps/api/src/entitlements/billing/billing-adapter.ts:34-41`). Không có method tạo link/trang thanh toán; research
   02/11 cũng ghi "port hiện tại chưa có bước tạo trang thanh toán" (`PAYMENT_WEB_LAUNCH_RESEARCH_2026-11-02.md` §1 mục 8, nhánh
   `docs/web-launch-research`).
2. **Lõi xoay quanh "subscription của nhà cung cấp".** Mỗi sự kiện phải có `externalSubscriptionId` (kiểu `string`, bắt buộc,
   `billing-adapter.ts:20`); applier khóa hàng `subscriptions` theo `(provider, environment, external_subscription_id)`
   (`event-applier.service.ts:212-219`). Một đơn payOS không có subscription id: adapter payOS phải tự ánh xạ `orderCode` → user và một khóa
   subscription/đơn.
3. **Không có loại sự kiện "đã trả tiền một lần".** 13 `EventType` (`billing.types.ts:4-18`); dòng 3 ghi rõ "D35: no `payment_succeeded`".
   `renewed` là additive và ghi `current_period_end = max(cũ, mới)` (`subscription-machine.ts:68-91`).
4. **Kỳ hạn chỉ có `month` | `year`, khóa ở 6 chỗ:** type `Interval` (`apps/api/src/entitlements/entitlements.types.ts:18`), CHECK
   `subscriptions_interval_check`, `subscriptions_pending_interval_check`, `fake_billing_subscriptions_interval_check`
   (`apps/api/prisma/migrations/20261019094400_entitlements/migration.sql:216-217,230`), CHECK `billing_transactions_interval_check`
   (`.../20261023100000_billing_transactions/migration.sql:37`), parser giả (`fake/fake-wire.ts:154-156`), type web
   (`apps/web/src/features/learner/transactions/transactions-api.ts:15`) và copy `intervals.month|year` (`apps/web/messages/vi.json:560-563`).
   Kỳ 3 tháng chưa biểu diễn được.
5. **Gói `active` không tự gia hạn mà không đánh `cancel_at_period_end` vẫn là Pro thêm `graceDays` ngày rồi thành `on_hold`**
   (`rules/plan-rules.ts:53-58`, mặc định `graceDays: 7`, `apps/api/src/settings/settings.definitions.ts:74`); `on_hold` được tính là
   "tự gia hạn" (`billing/auto-renewing.ts:3`) nên **chặn người học tự xóa tài khoản** (`identity/deletion/account-deletion.service.ts:107`).
   Có `cancel_at_period_end = true` thì hết kỳ là `expired` ngay (`plan-rules.ts:56`).
6. **Grant gói (`grant_plan`) là nguồn "không tự gia hạn" duy nhất hiện có**, nhưng cần người cấp là staff: CHECK
   `granted_by_role IN ('admin','editor')` (`20261019094400_entitlements/migration.sql:212`), `granted_by` là uuid bắt buộc
   (`apps/api/prisma/models/entitlements.prisma:16-17`). Grant bắt đầu ngay sẽ **thu hồi grant gói đang chạy** (`revoke_reason = 'replaced'`,
   `grants/grants.service.ts:158-164`); grant bắt đầu sau thì không (D38, cùng chỗ).
7. **Kỳ "đã trả nhưng chưa tới" không hiện cho người học:** `snapshot` bỏ qua grant có `startsAt > now` (`entitlements.service.ts:163`), và
   trang Gói chỉ lấy nguồn đầu tiên (`apps/web/src/features/learner/plans/PlansPage.tsx:42`). Khi kỳ nối tiếp bắt đầu, mốc chu kỳ AI chuyển sang
   ngày bắt đầu của nó (mốc muộn nhất thắng, `plan-rules.ts:102-107,133`).
8. **Email mới cần sửa 4 chỗ cứng:** CHECK `entitlement_notices_kind_check` chỉ có 3 kind (`20261019094400_entitlements/migration.sql:227`);
   `NoticeSender.claim` coi mọi kind khác `renewal_notice` là email trial và **bỏ qua nếu `subject_key` không phải id của một subscription**
   (`notices/notice-sender.service.ts:78-81`); `entitlementMail` chọn ngày theo `kind === 'renewal_notice'` (`notices/entitlement-mail.ts:59`);
   copy `renewal_notice` hiện nói "sẽ tự gia hạn và trừ tiền" kèm câu hủy ở App Store/Google Play (`entitlement-mail.ts:15-18,41-50`).
9. **Log che mọi key có chữ `code`:** `REDACT_KEY_PATTERN = /password|otp|code|token|.../i` (`apps/api/src/common/logging/app-logger.ts:16,29-38`).
   Field log `order_code`/`orderCode` sẽ ra `[redacted]`; muốn log mã đơn thì đặt tên khác (vd `order_id`).
10. **payOS (đọc 04/11/2026):** không có sandbox, test bằng tiền thật; webhook ký HMAC-SHA256 trên object `data` (key sắp alphabet); không có
    API hoàn tiền; SDK chính thức `@payos/node` 2.0.5 mặc định `timeout` 60 s và `maxRetries` 2 (vượt `BILLING_ADAPTER_TIMEOUT_MS = 5_000`,
    `entitlements.constants.ts:28`). Chi tiết ở mục 10.

---

## 1. Billing port và lõi (`apps/api/src/entitlements/billing/*`)

### 1.1 Port, registry, gọi adapter
- `BillingRequest` = `method`, `headers`, `query`, `rawBody: Buffer` (byte gốc, trước khi parse JSON) (`billing-adapter.ts:5-10`).
- `ParsedEvent`: `externalEventId`, `type`, `environment`, `externalSubscriptionId`, `appUserId` (null nếu không phải uuid chữ thường),
  `occurredAt`, `transactionId`, `event` (null khi thiếu field §9.3, kèm `missing`), `raw` (`billing-adapter.ts:16-27`).
- `BillingAdapter`: `provider`, `verify(req)` → `{ok:true, events, skipped}` hoặc `{ok:false}` (chỉ khi sai chữ ký; loại sự kiện không dùng
  thì đếm `skipped` và vẫn ack), `ack({received})` → `{status, body?}`, tùy chọn `fetchState?`, `endTrialNow?`, `cancelAtPeriodEnd?`
  (`billing-adapter.ts:29-41`). Không gọi adapter khi đang giữ lock (R6, comment dòng 32).
- `dedupeKey = provider:environment:externalEventId` (`billing-adapter.ts:44-46`), unique ở `billing_events.dedupe_key`
  (`entitlements.prisma:88`).
- Registry: `Map<provider, adapter>`, adapter tự `register` lúc `onModuleInit` (`billing-adapter.registry.ts:4-16`); fake chỉ register khi
  `BILLING_FAKE_ENABLED` (`fake/fake-billing.adapter.ts:38-40`).
- Mọi lời gọi adapter qua `callAdapter`, giới hạn `BILLING_ADAPTER_TIMEOUT_MS` = 5.000 ms; lỗi hoặc timeout trả `{ok:false}`, không throw
  (`adapter-call.ts:3-19`, `entitlements.constants.ts:27-28`).
- "Tự gia hạn" = status ∈ {`trialing`,`active`,`grace`,`on_hold`} và `!cancelAtPeriodEnd`; một hàm dùng cho kiểm xóa tài khoản, nút "Hủy gói" và
  `POST …/cancel` (`auto-renewing.ts:3-11`).

### 1.2 Webhook route và raw body
- `POST|GET /v1/billing/webhooks/{provider}`, `@Public()`, không rate limit, chữ ký kiểm trước trên raw body; log chỉ có provider và số đếm
  (`webhook.controller.ts:9-15`). Provider lạ → 404 `not-found` (`:34`); chữ ký sai → 400 `validation-failed` (`:41-44`); sau đó `store` →
  `ack` → `afterResponse` (`:45-50`).
- Raw parser chỉ cho URL bắt đầu `/v1/billing/webhooks/`, limit `WEBHOOK_BODY_LIMIT = '64kb'` (`apps/api/src/app.setup.ts:14-18`,
  `entitlements.constants.ts:18-19`).

### 1.3 Inbox
- `store`: một `createManyAndReturn(skipDuplicates)` theo `dedupe_key`, `status: 'pending'`, `payload` = `Prisma.DbNull` khi thiếu field, lưu
  `rawPayload` (`billing-inbox.service.ts:33-59`). Trả id các hàng mới; trùng = "đã nhận".
- `afterResponse`: chạy `applyMany` sau khi response đóng (provider không chờ apply), giữ `operation_id` (`billing-inbox.service.ts:61-77`);
  hàng `pending` do crash được job hằng giờ làm lại (comment `:17-21`).

### 1.4 Applier
- Ba pha: đọc không lock → một transaction (claim `FOR UPDATE SKIP LOCKED` → `lockUser` → khóa hàng subscription) → gọi adapter sau commit
  (`event-applier.service.ts:35-39,57-80,85-87`).
- Production bỏ qua sự kiện `sandbox` (`ignored`, `sandbox-in-production`) (`:96-101`). User không còn (đã xóa) → `ignored` `unknown-user`, xóa
  `appUserId`, `payload`, `rawPayload` (`:102-108`).
- Additive (`renewed`, `refunded`) dedupe theo `transaction_id` đã `applied` (có xử lý refund sau `refund_reversed`) (`:128-148`); sự kiện
  state cũ hơn `last_event_at` → `stale`, vẫn ghi giao dịch (`:149-154`).
- Trial: chèn `trial_history` (unique user và vân tay thẻ), trùng thì `trialAllowed=false` và gọi `endTrialNow` sau commit (`:157-167,208`);
  tạo notice `trial_started` (`:191-199`).
- Tạo hoặc cập nhật `subscriptions` (`:177-186`), ghi `billing_transactions` qua `TransactionsRepository.recordFromEvent` (`:125-126,188`).
- Lỗi → `failed`, `attempts+1`, tới `BILLING_MAX_ATTEMPTS = 5` thì log `billing_event_stuck` (`:243-251`, `entitlements.constants.ts:10`).
- Thứ tự lock: `billing_events` row → `lockUser` → `subscriptions` row (`entitlements.locks.ts:4-8`); `lockUser` = advisory xact lock
  `entitlements.user:<id>` (`entitlements.locks.ts:15-17`), dùng chung với ghi grant.

### 1.5 Thứ tự sự kiện và state machine
- State event cũ hơn `last_event_at` là `stale`; additive luôn apply; `last_event_at` chỉ tiến (`event-order.ts:3-13`).
- `EVENT_TYPES` 13 loại: `subscription_started`, `renewed`, `renewal_failed`, `grace_ended`, `cancel_scheduled`, `cancel_unscheduled`,
  `expired`, `revoked`, `refunded`, `refund_reversed`, `plan_changed`, `plan_change_scheduled`, `plan_change_canceled`
  (`billing.types.ts:4-18`); additive = `renewed`, `refunded` (`:22`).
- Field mỗi loại (`NormalizedEvent`): kỳ (`interval`, `currentPeriodStart`, `currentPeriodEnd`), tiền tùy chọn (`amount` đơn vị lớn,
  `currency` ISO 4217), `transactionId` bắt buộc cho mọi lần thu (D37) (`billing.types.ts:39-62`).
- `SubscriptionState` 12 cột (`status`, `interval`, `trialEndsAt`, `trialDenied`, `paymentFingerprint`, kỳ, `graceEndsAt`,
  `cancelAtPeriodEnd`, `pendingInterval`, `quotaAnchorAt`, `currentTransactionId`) (`billing.types.ts:64-78`); `FetchedState` 6 cột (`:80-88`).
- Ma trận 13 sự kiện × (không có hàng + 6 status) = 91 ô (`subscription-machine.ts:1,106-274`). Đáng chú ý cho design:
  - `subscription_started` trên hàng đang sống là "Ghi" (không đổi gì); chỉ tạo mới hoặc kích hoạt lại từ `expired`/`revoked`; mốc chu kỳ AI =
    `occurredAt` (`:46-66,107-115`).
  - `renewed`: `status: 'active'`, đặt kỳ mới, xóa grace; kỳ kết thúc trước kỳ đang lưu thì chỉ ghi lại (`:68-91`); `renewed` khi chưa có hàng
    vẫn tạo hàng (log `billing_started_missing`) (`:117-135`).
  - `cancel_scheduled` đặt `cancelAtPeriodEnd: true` (`:164-172`).
  - `refunded` của giao dịch kỳ hiện tại → `revoked` (`:99-104`).
- `applyFetched` ghi đè 6 cột bằng trạng thái của provider; ngày null không bao giờ ghi đè ngày đã lưu (`subscription-machine.ts:295-318`).

### 1.6 Job hằng giờ
- Bốn job của billing đăng ký vào `MaintenanceScheduler`: `billing-events-retry`, `subscriptions-time`, `billing-refund-refetch`,
  `billing-raw-payload-cleanup` (`billing-jobs.service.ts:38-43`), thêm `billing.transactions-expire` (`transactions-expire.job.ts:22-24`).
- Scheduler chạy **mỗi giờ, trong cả API và worker**, nên mọi job phải chạy song song được (`apps/api/src/common/maintenance/maintenance.scheduler.ts:8-14,53-57`).
- Retry: hàng `failed` dưới 5 lần và `pending` quá `BILLING_PENDING_RETRY_MS` (5 phút) (`billing-jobs.service.ts:45-58`, `entitlements.constants.ts:13`).
- `timeTransitions`: hàng `trialing|active|grace` đã quá ngày → ghi status do `effectiveStatus` quyết; hàng `trialing|active` chưa hủy và quá
  hạn thì hỏi `fetchState` trước (D31) (`billing-jobs.service.ts:60-90,132-144`).
- `refetchRevoked` (D39, 3 ngày) (`:92-123`, `entitlements.constants.ts:31`); xóa `raw_payload` sau 90 ngày (`:125-130`, `entitlements.constants.ts:16`).

### 1.7 Bảng giao dịch
- `TransactionKind = purchase | renewal | plan_change | refund | trial`, `TransactionStatus = succeeded | refunded | pending | reversed`
  (`transactions.repository.ts:8-9`); mọi giao dịch trả tiền là gói `pro` (`:31-32`).
- Ghi từ sự kiện đã apply, trong transaction của applier: `subscription_started` → `purchase` (hoặc `trial`), `renewed` → `renewal`,
  `plan_changed` → `plan_change`, `refunded`/`refund_reversed` cập nhật hàng gốc (`transactions.repository.ts:45-97`). Trùng thì bỏ qua nhờ
  unique `(provider, environment, provider_transaction_id, kind)` (`:99-101`, `entitlements.prisma:154`).
- Tiền: `toMinorUnits` theo số lẻ của tiền tệ (`transaction-amount.ts:1-5`). Kiểm trong phiên này: `Intl` cho VND 0 chữ số lẻ, nên
  79.000 ₫ → `amount_minor = 79000`. Tiền âm hoặc vượt số nguyên an toàn → null (`transactions.repository.ts:34-43`).
- Giữ hồ sơ tiền N năm (`transactionRetentionYears`, mặc định 10, tối thiểu 5), cắt theo 1/1 giờ Việt Nam (`transactions-expire.job.ts:9-13,26-32`,
  `settings.definitions.ts:76,125`).

### 1.8 Provider giả
- HMAC-SHA256 trên raw body với `BILLING_FAKE_SECRET`, header `X-Fake-Signature: sha256=<hex>`, so sánh `timingSafeEqual`
  (`fake/fake-wire.ts:1-20`); GET đọc `payload` base64url và `signature` từ query (`:22-31`); body `{ "events": [...] }` snake_case (`:33-53`).
- Bảng riêng `fake_billing_subscriptions` giữ "sự thật" của provider, gấp lịch sử theo `occurred_at`, để `fetchState` trả lời như provider thật
  (`fake/fake-billing.adapter.ts:17-21,115-140`); `fetchState` chỉ có khi `BILLING_FAKE_FETCH_STATE=true` (`:35`).
- `cancelAtPeriodEnd` của fake tự tạo và **apply ngay** một `cancel_scheduled` trước khi trả về (cho CI và smoke tất định) (`:65-91`).
- Script phát sự kiện giả: `pnpm billing:fake-event` (`apps/api/package.json:39`, `apps/api/scripts/billing-fake-event.mjs`).

---

## 2. Nguồn quyền lợi (entitlement sources)

- Hai loại nguồn: `SubscriptionSource` (`rules/plan-rules.ts:10-25`) và `GrantSource` `kind: 'plan' | 'limits'` (`:27-35`). Tính lại mỗi lần đọc,
  không cache (D28) (`:3`, `entitlements.service.ts:51-54`).
- `SourcesRepository.load`: subscription có status khác `expired`/`revoked`; grant chưa thu hồi và `endsAt > now` (kể cả grant bắt đầu sau)
  (`sources/sources.repository.ts:34-46`).
- `effectiveStatus` (chuyển theo thời gian, áp lúc đọc) (`plan-rules.ts:45-67`):
  - `trialing|active` quá ngày kết thúc: `cancelAtPeriodEnd` → `expired`; không thì `overdue` trong `graceDays` ngày rồi `on_hold` (D31).
  - `grace` quá `graceEndsAt` → `on_hold` (hoặc `expired` nếu đã hủy).
  - Comment dòng 48: "Every subscription renews automatically (D35)".
- `resolve` (`plan-rules.ts:77-135`): subscription `active|grace` = Pro, `trialing` không bị từ chối = trial (`:90-100`); grant `plan` đang hiệu
  lực (`startsAt ≤ now < endsAt`, chưa thu hồi, `:69-71`) = Pro, mốc chu kỳ = `startsAt` (`:102-107`); mốc chung là **mốc muộn nhất** trong các
  nguồn (`:133`). Chu kỳ AI tính theo tháng từ mốc (`rules/cycle.ts:20-29`).
- Snapshot hiển thị (`entitlements.service.ts:151-169`):
  - subscription: `kind:'subscription'`, `status` hiệu lực, `starts_at` = đầu kỳ, `renews_at` (khi chưa hủy) hoặc `ends_at` (khi đã hủy),
    `cancel_at_period_end`, `pending_interval` (`:152-161`).
  - grant: `kind:'grant_plan'|'grant_limits'`, `starts_at`, `ends_at`, `status:null`, `renews_at:null`; **grant chưa bắt đầu bị bỏ qua** (`:162-169`).
  - `trial_eligible` = email đã xác nhận và chưa có `trial_history` (`:181`, `sources.repository.ts:82-85`).
- Người học thấy gì với `grant_plan`: dải "Gói hiện tại" (`yoursGift`) và "Tới hết {date}" (`PlansPage.tsx:44,88,97-100`,
  `apps/web/messages/vi.json:1506,1517`). Câu "Đội Wordmet cấp từ {from} tới hết {to}. Không thu tiền, không tự gia hạn." còn trong
  `vi.json:1497` nhưng **không còn hiển thị**; test khẳng định nó vắng mặt (`apps/web/src/features/learner/plans/plans.test.tsx:70`). Ở lịch sử giao
  dịch grant hiện là "Cấp gói", không tiền, không provider (`apps/api/src/entitlements/transactions/transactions.service.ts:132-139`,
  `vi.json:552`).
- Kỳ trả tay có mô hình được bằng loại nguồn đang có không: các ràng buộc (để design quyết)
  - Dạng **grant**: cần staff (CHECK `granted_by_role`, `migration.sql:212`; `granted_by` bắt buộc, `entitlements.prisma:16-17`); grant bắt đầu
    ngay thu hồi grant gói đang chạy (`grants.service.ts:158-164`); lịch sử giao dịch đọc grant **và** `billing_transactions` rồi trộn, nên ghi
    cả hai sẽ thành hai dòng cho một lần trả (`transactions.service.ts:85-100`); CHECK hình dạng `kind='plan' ⇔ plan='pro' AND limits IS NULL`
    (`migration.sql:208-210`).
  - Dạng **subscription**: phải có `cancel_at_period_end = true` mới hết hạn đúng ngày và không bị tính là "tự gia hạn" (mục 0 điểm 5);
    `renewal_notice` chỉ lập cho `active` chưa hủy (`notice-planner.service.ts:31-38`); `interval` chỉ `month|year` (mục 0 điểm 4); unique
    `(provider, environment, external_subscription_id)` (`entitlements.prisma:77`).
  - Một **loại nguồn mới**: không có sẵn; `resolve`, `snapshot`, `proCandidates` (`sources.repository.ts:67-80`), type web
    `Entitlements.sources[].kind` (`apps/web/src/app-shell/queries.ts:13-14`) đều liệt kê cứng hai loại.
- `cancel_at_period_end`: chỉ đổi khi sự kiện `cancel_scheduled` của provider được apply (`api/subscription-cancel.service.ts:28-31`), trừ lúc
  admin xóa tài khoản thì ghi tại chỗ (`account-deletion.provider.ts:56-80`).
- Grace: `graceDays` mặc định 7, giới hạn 0–16 (`settings.definitions.ts:74,118`); `renewal_failed` không có ngày thì grace = max(lúc lỗi, cuối
  kỳ) + `graceDays` (D23, `subscription-machine.ts:93-97`).
- Grant tạo khi người học đang có subscription tự gia hạn: phải `confirm_turn_off_paid_renewal`, rồi gọi `cancelAtPeriodEnd` của từng gói
  (`grants.service.ts:152-157,176-178,386-399`); `starts_at` của grant đã bắt đầu không sửa được (D38, `:231-233`).

---

## 3. Prisma models (`apps/api/prisma/models/entitlements.prisma`) và CHECK

CHECK viết tay ở `apps/api/prisma/migrations/20261019094400_entitlements/migration.sql:205-238` và
`20261023100000_billing_transactions/migration.sql:35-40`. Đổi CHECK theo mẫu DROP rồi ADD (vd `20261017180000_private_words/migration.sql:2`).

| Model (bảng) | Cột chính | CHECK / unique |
|---|---|---|
| `Subscription` (`subscriptions`) `:52-81` | `user_id`, `provider`, `environment`, `external_subscription_id`, `interval`, `status`, `trial_ends_at`, `trial_denied`, `payment_fingerprint`, `current_period_start/end`, `grace_ends_at`, `cancel_at_period_end`, `pending_interval`, `quota_anchor_at`, `current_transaction_id`, `last_event_at`, `created_at`, `updated_at`; comment "Every subscription renews automatically (D35): no renewal column" (`:52`) | `environment IN ('sandbox','production')`, `interval IN ('month','year')`, `pending_interval IN ('month','year')`, `status IN ('trialing','active','grace','on_hold','expired','revoked')` (`migration.sql:215-218`); unique `(provider, environment, external_subscription_id)` (`:175`) |
| `BillingEvent` (`billing_events`) `:83-116` | `provider`, `environment`, `dedupe_key` unique, `external_event_id`, `external_subscription_id` (nullable), `type`, `kind`, `transaction_id`, `occurred_at`, `received_at`, `app_user_id`, `user_id`, `subscription_id`, `payload`, `raw_payload`, `status`, `error`, `attempts`, `processed_at` | `environment`, `kind IN ('state','additive')`, `status IN ('pending','applied','stale','ignored','failed')` (`migration.sql:219-221`); **`type` không có CHECK** (S: chỉ thấy 3 CHECK của bảng này) |
| `BillingTransaction` (`billing_transactions`) `:129-158` | `user_id`, `subscription_id`, `kind`, `plan`, `interval`, `amount_minor` (BigInt), `currency`, `occurred_at`, `period_start`, `period_end`, `status`, `provider`, `environment`, `provider_transaction_id`; comment: "pending is for real providers later" (`:147`) | `kind IN ('purchase','renewal','plan_change','refund','trial')`, `interval IN ('month','year')`, `status IN ('succeeded','refunded','pending','reversed')`, `environment`, `(amount_minor IS NULL) = (currency IS NULL)` (`billing_transactions/migration.sql:36-40`); unique `(provider, environment, provider_transaction_id, kind)` (`:32`) |
| `TrialHistory` (`trial_history`) `:118-127` | `user_id` unique, `provider`, `payment_fingerprint`, `started_at` | unique một phần `(provider, payment_fingerprint) WHERE payment_fingerprint IS NOT NULL` (`migration.sql:232`) |
| `EntitlementNotice` (`entitlement_notices`) `:189-210` | `user_id`, `recipient_user_id`, `kind`, `subject_key` (comment "The subscription id", kiểu String), `period_key`, `state`, `due_at`, `window_ends_at`, `attempts`, `last_error_at`, `sent_at` | `kind IN ('trial_started','trial_reminder','renewal_notice')`, `state IN ('pending','sending','sent','failed','skipped')` (`migration.sql:227-228`); unique `(kind, subject_key, period_key, recipient_user_id)` (`:199`) |
| `FakeBillingSubscription` (`fake_billing_subscriptions`) `:212-232` | `external_subscription_id` PK, `user_id`, `status`, `interval`, kỳ, `trial_ends_at`, `cancel_at_period_end`, `last_occurred_at`, `end_trial_called_at`, `cancel_called_at`, `current_transaction_id`, `history` | `status`, `interval IN ('month','year')` (`migration.sql:229-230`) |
| `EntitlementGrant` (`entitlement_grants`) `:4-31` | `user_id`, `kind`, `plan`, `limits`, `starts_at`, `ends_at`, `reason`, `granted_by`, `granted_by_role`, `revoked_at/by`, `revoke_reason`, `paid_renewal_action`, `created_at` | `kind IN ('plan','limits')`, hình dạng kind, `ends_at > starts_at`, `granted_by_role IN ('admin','editor')`, `paid_renewal_action IN ('turned_off','not_supported')` (`migration.sql:206-213`) |

- Không có bảng đơn hàng / payment link nào (S: không thấy model nào khác trong `entitlements.prisma`).
- Bảng mới có cột `user_id`, `*_user_id` hoặc `*_by` phải thêm vào `ACCOUNT_DATA_MAP`, nếu không `account-data-map.spec.ts` fail
  (`apps/api/src/identity/deletion/account-data-map.ts:7-8`, spec `:38`).

---

## 4. Notice và email

- `NoticeKind = 'trial_started' | 'trial_reminder' | 'renewal_notice'` (`entitlements.types.ts:22`).
- Planner (`notices/notice-planner.service.ts:9-56`): `trial_reminder` cho `trialing` chưa bị từ chối, kết thúc trong `trialReminderDaysBefore`
  (`:25-29`); `renewal_notice` cho `status:'active'`, `cancelAtPeriodEnd:false`, `currentPeriodEnd` trong `renewalNoticeDaysBefore` ngày, luôn bật
  từ Q8 (`:31-38`); `due_at = end − days`, `window_ends_at = end`, `createMany skipDuplicates` (`:41-53`). Comment: "No `expiry_notice` (D35)"
  (`:12`). `trial_started` do applier tạo (`event-applier.service.ts:191-199`).
- Ngưỡng (PR #206, merge `d51265ba`; commit `52a4d669`): `trial_reminder_days_before` 3–6, `renewal_notice_days_before` 7–30, mặc định 3 và 7
  (`settings.definitions.ts:29-32,74-75,119-120`).
- Sender (`notices/notice-sender.service.ts`): một job `entitlement-notices` vừa lập vừa gửi (`:45-51`); claim từng hàng `FOR UPDATE SKIP LOCKED`,
  hết `window_ends_at` thì `skipped` (`:61-85`); **mọi kind khác `renewal_notice` phải có subscription `subject_key` không `trialDenied`, nếu
  không `skipped` lý do `trial-denied`** (`:78-81`); cần email đã xác nhận (`:90-95`); trần `PAYMENT_MAIL_SHARE = 0.95` ngân sách mail mỗi ngày
  (`:96-100`, `apps/api/src/common/mail/mail-budget.service.ts:13`); lỗi `unknown` không gửi lại (`:110-112`).
- Template: plain text trong code, không file template riêng: `notices/entitlement-mail.ts:20-51` (vi/en), ngày theo múi giờ hồ sơ, mặc định
  `Asia/Ho_Chi_Minh` (`:7-13`); mọi email có thêm câu hủy ở "App Store, Google Play hoặc trang thanh toán" (`:15-18,61`). Comment: "No amount
  until a real adapter sends one (ASSUMPTION)" (`:1-2`).
- Thêm kind "sắp hết hạn" phải đụng: `NoticeKind` (`entitlements.types.ts:22`), `COPY` (kiểu `Record<NoticeKind,…>` nên TypeScript bắt buộc,
  `entitlement-mail.ts:20`), chọn ngày (`:59`), nhánh kiểm của `claim` (`notice-sender.service.ts:78-81`), planner (`notice-planner.service.ts:21-55`),
  CHECK `entitlement_notices_kind_check` (`migration.sql:227`) và có thể một setting số ngày (mẫu `renewal_notice_days_before`,
  `settings.definitions.ts:120,195,256`). D35 đã bỏ đúng setting này: `expiry_notice_days_before` mặc định 7
  (`docs/superpowers/decisions/2026-10-19-buoc-5-entitlements-decisions.md:470`).

---

## 5. API và web phía người học

### API
- `GET /v1/me/entitlements`: chỉ cần đăng nhập, không cần learner profile (`api/me-entitlements.controller.ts:6-19`). Payload
  `EntitlementsSnapshot`: `plan`, `sources[]` (`kind`, `id`, `status`, `starts_at`, `ends_at`, `renews_at`, `cancel_at_period_end`,
  `pending_interval`, `limits`), `pools`, `features`, `ai_available`, `ads`, `trial_eligible` (`entitlements.service.ts:30-44`).
- `POST /v1/me/subscriptions/:id/cancel`: 202, `@Idempotent`, `user.write` (`api/me-subscriptions.controller.ts:16-23`). Không tự gia hạn hoặc của
  người khác → 409 `subscription-not-cancellable`; adapter không có `cancelAtPeriodEnd` → 409 `cancel-in-store`; adapter lỗi → 503
  `provider-unavailable` (`api/subscription-cancel.service.ts:32-52`).
- `GET /v1/me/transactions`: trộn `billing_transactions` với grant gói, mới nhất trước, keyset `(occurred_at desc, id desc)`
  (`transactions/me-transactions.controller.ts:7-15`, `transactions/transactions.service.ts:34-112`). Bộ lọc kind admin gồm cả `grant`
  (`transactions/transactions.queries.ts:9`).
- `GET /v1/me/app-config` trả số của gói (`plans.free|trial|pro`), **không có giá** (`apps/api/src/settings/app-config.view.ts:10-14,27-35`).

### Web
- `/[locale]/app/plans` → `PlansPage` (`apps/web/src/app/[locale]/app/(member)/plans/page.app.tsx`): chọn kỳ năm/tháng (`PlansPage.tsx:30,55-65`),
  giá là chuỗi giữ chỗ `priceYear: "XXX.000 ₫"`, `priceMonth: "XX.000 ₫"` (`PlansPage.tsx:105`, `vi.json:1512-1513`), dải "Chưa mở bán" khi không
  phải Pro (`PlansPage.tsx:88`, `vi.json:1507`); **không có nút mua**. Tiêu đề và dòng trial (`titleTrial`, `trialUntil`) (`PlansPage.tsx:47,53`,
  `vi.json:1496,1500`).
- `SubscriptionRows`: một dòng cho mỗi source `kind:'subscription'`; đang tự gia hạn thì "Gia hạn ngày …" + [Hủy gói], đã hủy thì "Gói kết thúc
  ngày …"; grant không có dòng (`plans/SubscriptionRows.tsx:18-25,46,70-81`); gửi `Idempotency-Key` mỗi lần bấm (`:50-53`). Bản web của
  `isAutoRenewing` (`plans/auto-renewing.ts:9-13`). Copy dialog: "Không hoàn tiền cho thời gian còn lại" (`vi.json:1487-1488`).
- `CompareTable`: bảng số, không giá (`plans/CompareTable.tsx:4-17`).
- `/[locale]/app/settings/transactions` → `TransactionsPage` (`apps/web/src/app/[locale]/app/(member)/settings/transactions/page.app.tsx`); type
  `TransactionKind` 6 loại, `TransactionStatus` 4 loại, `interval: 'month'|'year'|null` (`features/learner/transactions/transactions-api.ts:7-24`);
  chi tiết hiện provider và mã giao dịch (`TransactionDetail.tsx:23-24`). Copy kind/status/interval `vi.json:546-563`.
- Landing: cột Pro có câu trial `Landing.plans.trial` = "Dùng thử 7 ngày, cần thẻ thanh toán. Hủy trước hạn không mất phí."
  (`apps/web/src/components/landing/Plans.tsx:97`, `vi.json:230`), có test (`components/landing/sections.test.tsx:38`); landing không có giá.
  `en.json:219-232` của landing cũng là tiếng Việt (S: có thể cố ý, chưa kiểm).
- CSP web không có `frame-src` (rơi về `default-src 'self'`), `img-src 'self' data: blob:`, `form-action 'self'` (`apps/web/src/lib/csp.ts:19-30`):
  nhúng form payOS bằng iframe hoặc ảnh QR từ host ngoài sẽ bị chặn; chuyển hẳn trang sang `checkoutUrl` thì không phụ thuộc CSP (S).

---

## 6. Admin

- Menu: `/users` (`users.read`), `/entitlements` (`entitlements.grant`), `/transactions` (`settings.manage`) (`apps/admin/src/app/nav.ts:32-34`);
  route `apps/admin/src/app/routes.tsx:88-94`.
- Quyền: `settings.manage` chỉ admin; `entitlements.grant` cả admin và editor (`apps/api/src/identity/identity.types.ts:9-18`). Editor không cấp
  cho chính mình, admin hay staff khác, không chạm số AI (`grants/grant-rules.ts:22-30`).
- `GET /v1/admin/transactions`: chỉ đọc, `settings.manage` (GI9: "money screens are admin-only") (`transactions/admin-transactions.controller.ts:6-15`).
  Màn admin `TransactionsPage`: danh sách, bộ lọc, dialog chi tiết chỉ có nút đóng (`apps/admin/src/features/transactions/TransactionsPage.tsx:21,102,161-167`).
  **Chưa có hành động ghi nào** trên giao dịch.
- Grant: `POST /v1/admin/entitlements/grants` (201, `@Idempotent`, `user.write`), `POST :id/revoke`, `PATCH :id`, `GET` danh sách
  (`grants/admin-grants.controller.ts:11-48`); UI `GrantDialog` gửi `kind:'plan', plan:'pro', ends_at` và `confirm_turn_off_paid_renewal` khi cần
  (`apps/admin/src/features/entitlements/GrantDialog.tsx:171,224-227`).
- `GET /v1/admin/entitlements/users/:user_id` (snapshot + grants, `entitlements.grant`) có ở API (`api/admin-entitlements.controller.ts:23-29`) nhưng
  admin web **không gọi** (tìm `entitlements/users` trong `apps/admin/src` không ra). `UserDetail` không có phần gói (`apps/admin/src/features/users/UserDetail.tsx:131-149`).
- Chỗ có thể đặt nút "Đã nhận tiền" (để design chọn): dialog chi tiết ở `/transactions` (admin, `settings.manage`), màn grant `/entitlements`
  (admin + editor), hoặc chi tiết người dùng `/users/:id` (đọc `users.read`, sửa chỉ admin theo AD18, `identity.types.ts:15`).

---

## 7. Xóa tài khoản

- Precondition: `renewing(db, userId)` = có subscription "tự gia hạn" theo status hiệu lực (`entitlements/account-deletion.provider.ts:43-54`).
  Người học tự xóa → 409 `subscription-renewing` (`identity/deletion/account-deletion.service.ts:105-107`). Admin xóa → gọi
  `turnOffRenewalForAdminDelete`; còn gói không tắt được → 409 `renewal-not-cancelled` (`identity/deletion/account-deletion-requests.service.ts:62-68`).
- `turnOffRenewalForAdminDelete`: gọi `cancelAtPeriodEnd` từng gói ngoài lock, gói nào provider nhận kịp thì ghi `cancel_at_period_end=true` tại chỗ
  (`account-deletion.provider.ts:56-80`).
- Eraser: kiểm lại `renewing` trong transaction (`:86-87`); xóa `billing_events` của user, `entitlement_grants` (kèm change), `subscriptions`,
  `trial_history`, `entitlement_notices`, `fake_billing_subscriptions`; **ẩn danh** `usage_records` và `billing_transactions` (D15, D16) (`:89-101`).
- R21 / M3: tắt gia hạn từng phần khi admin xóa (một gói tắt được, gói kia quá hạn → 409 nhưng gói đầu đã bị hủy; bước tắt chạy trước kiểm "admin
  cuối"), để lại tới khi nối nhà cung cấp thật (`docs/deliveries/buoc-8-rulings.md:31,47`, `docs/deliveries/deploy-checklist.md:146`). Chỉ xảy ra với
  gói tự gia hạn (S: payOS trả tay không có `cancelAtPeriodEnd` nên không đi vào nhánh này; quay lại khi có MoMo).
- Đơn đang chờ hoặc đã trả: hiện **không có** bảng đơn nên không có quy tắc nào (S). Sự kiện tới sau khi user đã xóa → `ignored` `unknown-user` và
  xóa payload (`event-applier.service.ts:102-108`): tiền đã nhận sẽ không có hàng giao dịch nào nếu không có xử lý riêng (S).

---

## 8. Quy ước idempotency, webhook, log, rate limit, HTTP ra ngoài

- `@Idempotent({timeoutSeconds})` mặc định lease 30 s (`apps/api/src/common/idempotency/idempotent.decorator.ts:5-14`); interceptor bắt buộc
  header `Idempotency-Key` và user đã đăng nhập (`idempotency.interceptor.ts:40-48`); phạm vi `(key, userId, endpoint)` + hash payload
  (`idempotency.interceptor.ts:50-62`, `idempotency.service.ts:22-31`); đang chạy → 409 + `Retry-After` (`idempotency.interceptor.ts:72-79`).
  Webhook `@Public` nên không dùng interceptor này; dedupe bằng `dedupe_key` (mục 1.3).
- Problem Details: `ProblemDetailsException({status, title, type, extensions})`, `type` ghép với base URL (`common/problem-details/problem-details.exception.ts:3-26`,
  `problem-details.filter.ts:44-45`).
- Rate limit: tên rule cố định (`common/config/app-config.ts:6-25`); `user.write` 30/phút/user (`:136`); thêm rule mới phải sửa union và
  `DEFAULT_LIMITS` (từ `:122`).
- Log: không ghi body (SR10, `webhook.controller.ts:11`); redact theo tên key (`app-logger.ts:16,29-38`), xem mục 0 điểm 9; `raw_payload` có thể
  chứa email người mua, xóa sau 90 ngày (`entitlements.prisma:103-104`, `billing-jobs.service.ts:125-130`).
- HTTP ra ngoài:
  - Google: `fetch` toàn cục, inject được qua `deps.fetch`, `AbortSignal.timeout(10_000)`, không retry, thông báo lỗi không chứa code/secret
    (`apps/api/src/identity/google/google-client.real.ts:11-26,39-59`); port trừu tượng `GoogleClient` (`google-client.ts:26-32`) và chọn
    fake/real bằng `useFactory` theo config (`apps/api/src/identity/identity.module.ts:47-48`).
  - AI SDK: mỗi lời gọi đặt `timeout` và `maxRetries: 0` (`apps/api/src/ai/adapters/openai/openai.adapter.ts:68,77`,
    `anthropic/anthropic.adapter.ts:94,105`).

---

## 9. Config

- `AppConfig.billing = { production, fakeEnabled, fakeSecret, fakeFetchState }` (`common/config/app-config.ts:92-99,341-346`); env
  `BILLING_PRODUCTION` (mặc định false), `BILLING_FAKE_ENABLED` (false), `BILLING_FAKE_SECRET`, `BILLING_FAKE_FETCH_STATE` (true) (`:238-241`).
- Không khởi động khi `BILLING_PRODUCTION` bật cùng fake billing, fake AI hoặc fake Google (`:261-275`); fake bật thì bắt buộc secret (`:282-284`).
  Mẫu "bắt buộc khi bật" cho một nhóm biến: Google (`:276-281`).
- `.env.example:59-65` (billing), `:52-54` (`ADMIN_APP_URL`, `LEARNER_APP_URL`, dùng được cho `returnUrl`/`cancelUrl`; `learnerAppUrl` ở
  `app-config.ts:61-62`).
- Deploy checklist: webhook thật phải kiểm chữ ký và chống phát lại (`docs/deliveries/deploy-checklist.md:93-94`); nhà cung cấp thật phải trả lời
  trong `BILLING_ADAPTER_TIMEOUT_MS` khi admin xóa người đang gia hạn (`:167-168`); sửa R21/M3 trước khi nối nhà cung cấp thật (`:146`).

---

## 10. payOS

### 10.1 Research trong repo
- `PAYMENT_WEB_LAUNCH_RESEARCH_2026-11-02.md` (nhánh `docs/web-launch-research`): payOS bị loại vì "không có recurring, không có `sandbox`"
  (dòng 40, 75, 87-88); thêm gói KienLongBank miễn phí từ 23/01/2026, "vẫn không recurring, không có API hoàn tiền" (dòng 541). Cảnh báo pháp lý ở §1
  mục 6 (Luật 19/2023 Điều 42: báo ≥ 7 ngày làm việc trước mỗi lần thu phí **gia hạn**) (S: nói về thu tự động; trả tay có thuộc phạm vi không là
  việc chủ dự án cân nhắc).
- `PRICING_INPUTS_RESEARCH_2026-11-04.md`: payOS cho cá nhân đăng ký bằng CCCD, 600 giao dịch miễn phí ban đầu, webhook HMAC-SHA256, không sandbox
  (dòng 16, 142); không bên nào khấu trừ thuế thay, người bán tự khai (dòng 118).
- Lịch sử D35: phương án trả tay (a)–(d) và R11 "trả lúc còn hạn thì nối kỳ" từng có rồi bị bỏ; chủ dự án chọn (e) tự trừ tiền
  (`docs/superpowers/decisions/2026-10-19-buoc-5-entitlements-decisions.md:67,544-574`); research đi kèm
  `docs/preparation/EARLY_MANUAL_RENEWAL_RESEARCH_2026-10-19.md`. D24: hủy thì không hoàn tiền, dùng tới hết kỳ (`…-decisions.md:56`).

### 10.2 Tài liệu chính thức (đọc 04/11/2026)
Nguồn: https://payos.vn/docs/api/ · https://payos.vn/docs/tich-hop-webhook/kiem-tra-du-lieu-voi-signature ·
https://payos.vn/docs/du-lieu-tra-ve/webhook · https://payos.vn/docs/du-lieu-tra-ve/return-url · https://payos.vn/docs/moi-truong-test ·
https://payos.vn/docs/ (rate limits) · https://payos.vn/docs/cau-hoi-thuong-gap · https://payos.vn/docs/sdks/intro ·
https://payos.vn/docs/sdks/back-end/node · https://github.com/payOSHQ/payos-lib-node · npm registry (`npm view @payos/node`). Không trang nào ghi
ngày cập nhật.

- **Base URL:** `https://api-merchant.payos.vn`. Header `x-client-id`, `x-api-key` cho mọi endpoint; `x-partner-code` tùy chọn.
- **Endpoint thanh toán:** `POST /v2/payment-requests` (tạo link), `GET /v2/payment-requests/{id}` (xem), `POST /v2/payment-requests/{id}/cancel`
  (hủy, body `cancellationReason` tùy chọn), `GET /v2/payment-requests/{id}/invoices`, `.../invoices/{invoice-id}/download`; `POST /confirm-webhook`
  (body `{ "webhookUrl": "..." }`). Phần còn lại là payout. **Không có endpoint hoàn tiền.** `{id}` nhận `orderCode` hoặc `paymentLinkId`.
- **Tạo link — request:** `orderCode` integer (bắt buộc), `amount` integer (bắt buộc), `description` string (bắt buộc; nguyên văn: "với tài khoản
  ngân hàng không phải liên kết qua payOS thì giới hạn ký tự là 9"), `cancelUrl`, `returnUrl` (bắt buộc), `expiredAt` ("là Unix Timestamp và kiểu
  Int32", tùy chọn), `items[]` (`name`, `quantity`, `price`, …), `buyerName`, `buyerEmail`, `buyerPhone`, `buyerAddress`, `buyerCompanyName`,
  `buyerTaxCode`, `invoice` (tùy chọn), `signature` (bắt buộc) = HMAC-SHA256 bằng checksum key trên chuỗi
  `amount=$amount&cancelUrl=$cancelUrl&description=$description&orderCode=$orderCode&returnUrl=$returnUrl`.
- **Tạo link — response 200:** `code: "00"`, `desc`, `data` { `bin`, `accountNumber`, `accountName`, `amount`, `description`, `orderCode`,
  `currency`, `paymentLinkId`, `status` (`"PENDING"`), `checkoutUrl`, `qrCode` }, `signature`. Lỗi khác: 401, 429.
- **Xem link:** `data` { `id`, `orderCode`, `amount`, `amountPaid`, `amountRemaining`, `status`, `createdAt`, `transactions`, … }. Trang API chỉ cho
  ví dụ `PENDING`, `CANCELLED`; trang return-url liệt kê `PAID`, `PENDING`, `PROCESSING`, `CANCELLED`.
- **returnUrl / cancelUrl** nhận query `code` (`00` thành công, `01` sai tham số), `id` (paymentLinkId), `cancel` (`true` = đã hủy), `status`,
  `orderCode`; trang ghi là "phục vụ cho việc xử lý ở phía giao diện người dùng".
- **Webhook payload:** `{ code, desc, success, data, signature }`; `data` { `orderCode`, `amount`, `description`, `accountNumber`, `reference`,
  `transactionDateTime` (vd `"2023-02-04 18:25:00"`, không có múi giờ), `currency`, `paymentLinkId`, `code`, `desc`, `counterAccountBankId`,
  `counterAccountBankName`, `counterAccountName`, `counterAccountNumber`, `virtualAccountName`, `virtualAccountNumber` }. Server của shop "Phản hồi
  trạng thái mã 2XX để xác nhận webhook gửi thành công".
- **Chữ ký webhook:** chỉ ký object `data`; key sắp alphabet; chuỗi `key1=value1&key2=value2` không URL-encode; mẫu Node đổi `null`/`undefined`/
  `"null"`/`"undefined"` thành chuỗi rỗng; mảng thì `JSON.stringify` sau khi sắp key từng phần tử; HMAC-SHA256 bằng **Checksum Key**, digest hex;
  mẫu so sánh bằng `==` (nên dùng `timingSafeEqual`, như `fake-wire.ts:15-20`). Chữ ký nằm trong body, không ở header (khác provider giả).
- **Sai số tiền (FAQ Q7):** với VietQR Pro, chuyển sai số tiền bị từ chối ngay ở màn hình ngân hàng; nếu đã chuyển thành công thì "hệ thống ngân hàng
  sẽ hoàn tiền lại vào tài khoản". Một tài khoản ảo ứng với một đơn và một số tiền (FAQ Q6).
- **Môi trường test:** "Hiện tại, payOS không cung cấp môi trường test (sandbox/staging) riêng biệt"; giao dịch thử chạy trên môi trường thật, khuyên
  dùng số tiền nhỏ.
- **Rate limit:** có giới hạn, quá thì 429; không công bố con số.
- **SDK Node chính thức:** `@payos/node`, bản `latest` **2.0.5** (registry sửa lần cuối 2026-03-05, đọc bằng `npm view` trong phiên này); cần Node
  ≥ 20 (repo dùng Node 24.11.0). Khởi tạo bằng `clientId`, `apiKey`, `checksumKey` (env `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`),
  tùy chọn `partnerCode`, `baseURL`, `timeout` (mặc định 60000 ms), `maxRetries` (mặc định 2), `logLevel` (env `PAYOS_LOG`, mặc định ghi ra console),
  `logger`, `fetch`, `fetchOptions`. Method có trong docs: `paymentRequests.create`, `webhooks.confirm(url)`, `webhooks.verify(body)` (đồng bộ, throw
  khi sai); lỗi `APIError` và lớp con (`NotFoundError`).

### 10.3 Ánh xạ payOS vào port hiện có (S, để design quyết)
- `verify` dùng được với chữ ký trong body (raw body vẫn có, `webhook.controller.ts:35-40`); không có `app_user_id` trong payload nên adapter phải
  tra `orderCode` → đơn → user trước khi trả `ParsedEvent`.
- payOS không có sandbox nên mọi sự kiện thật là `environment = 'production'`; ở máy local (`BILLING_PRODUCTION=false`) applier vẫn apply sự kiện
  production (chỉ chặn chiều ngược lại, `event-applier.service.ts:96-101`).
- `fetchState` / `cancelAtPeriodEnd` / `endTrialNow` không áp dụng cho trả tay; "xem link" (`GET /v2/payment-requests/{id}`) là chỗ đối soát khi
  webhook không tới.
- Nếu dùng SDK: đặt `maxRetries: 0`, `timeout` ≤ 5 s và `logLevel: 'off'` để giữ quy ước R6, AI SDK và SR10 (mục 8).

---

## 11. ASSUMPTION còn mở

1. **ASSUMPTION:** payOS chỉ gửi webhook khi thanh toán thành công; tài liệu không nói có webhook cho hủy, hết hạn hay trả thiếu.
2. **ASSUMPTION:** chính sách gửi lại webhook (số lần, khoảng cách) và việc webhook có thể tới trùng: tài liệu không nói.
3. **ASSUMPTION:** `POST /confirm-webhook` gửi một request thử tới URL và cần 2XX; tài liệu không mô tả. Payload ví dụ dùng `orderCode: 123`,
   nên adapter nên ack (không trả 4xx) cho đơn không tìm thấy.
4. **ASSUMPTION:** giới hạn của `orderCode` (kiểu integer, chưa thấy giá trị tối đa; nếu là `Number.MAX_SAFE_INTEGER` thì cần cột BigInt) và độ dài
   tối đa của `description` ngoài quy tắc "9 ký tự" cho tài khoản không liên kết qua payOS; chưa tìm thấy trong docs, SDK README, FAQ.
5. **ASSUMPTION:** đơn vị của `expiredAt` là giây (S: "Unix Timestamp và kiểu Int32" không chứa được mili giây; Int32 tràn ở 2038-01-19).
6. **ASSUMPTION:** danh sách đủ các status của link (có `EXPIRED`, `UNDERPAID` không); `amountPaid`/`amountRemaining` gợi ý có thể trả từng phần.
7. **ASSUMPTION:** `data.reference` (hoặc `paymentLinkId` + `reference`) là duy nhất cho mỗi lần chuyển, dùng được làm `externalEventId` và
   `provider_transaction_id`.
8. **ASSUMPTION:** chuyển nhầm lần hai vào cùng một link đã `PAID`: payOS xử lý thế nào (từ chối, hoàn, hay gửi webhook thứ hai) chưa rõ; FAQ chỉ nói
   trường hợp sai số tiền.
9. **ASSUMPTION:** `transactionDateTime` theo giờ Việt Nam (chuỗi không có múi giờ).
10. **ASSUMPTION:** landing tiếng Anh dùng copy tiếng Việt (`apps/web/messages/en.json:219-232`) là cố ý.
11. (S) Bảng `billing_events.type` không có CHECK; chỉ thấy ba CHECK của bảng này trong migration, chưa đọc mọi migration sau 19/10 cho từng bảng
    ngoài các file đã grep (`20261102100000_review_r1_user_id_indexes` chỉ thêm index).
