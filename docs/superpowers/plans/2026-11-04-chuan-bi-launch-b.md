# Chuẩn bị launch, đợt B — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bán gói Pro 1/3/12 tháng bằng VietQR qua payOS (webhook, đối soát, admin xác nhận tay), hộp thoại tự làm giới thiệu Pro, và quảng cáo vignette của
AdSense chỉ ở Nhóm và Tra từ cho người Free từ 16 tuổi.

**Architecture:** Mở rộng port `BillingAdapter` có sẵn bằng ba method trả một lần; sự kiện `payment_succeeded` (ngoài `EVENT_TYPES`) đi qua inbox sẵn có vào
`OrderApplier`, nơi một bảng luật T1–T14 quyết mỗi lần trả theo danh tính `payment_key`. Kỳ đã trả là nguồn Pro thứ ba (`prepaid_periods`) trong `resolve()`.
Quảng cáo: `ads.show` tính ở API; CSP `nonce` cho `/app` qua `proxy.ts`; script AdSense chỉ có trong document ở hai trang được phép.

**Tech Stack:** NestJS + Prisma + Postgres, `@payos/node` 2.0.5, Next.js 16 (App Router, `proxy.ts`) + OpenNext 1.20.13, React admin, Vitest, Playwright.

**Spec:** [`../specs/2026-11-04-chuan-bi-launch-b-design.md`](../specs/2026-11-04-chuan-bi-launch-b-design.md) (decision record
[`../decisions/2026-11-04-chuan-bi-launch-b-decisions.md`](../decisions/2026-11-04-chuan-bi-launch-b-decisions.md); code facts
`docs/preparation/LAUNCH_PREP_CODE_FACTS_2026-11-04-{billing,ads}.md`). Mọi `§`, `T1–T14`, `LB…` dưới đây là của design.

## Global Constraints

- Milestone và nhánh (mỗi cái một PR vào `dev`): M0 `spike/launch-b-csp-nonce` (bỏ đi, không merge); M1 `feat/launch-b-m1-orders`; M2 `feat/launch-b-m2-buy`;
  M3 `feat/launch-b-m3-house-ad`; M4 `feat/launch-b-m4-adsense`. M1 bắt đầu sau khi đợt A M3 (loader `ended`, tắt trial) đã vào `dev` (§3.13).
- Giá mặc định: `pro_price_1m_vnd` 79000, `pro_price_3m_vnd` 199000, `pro_price_12m_vnd` 599000, bound 1000–10000000. `period_months ∈ {1, 3, 12}`.
- Đơn: hạn 15 phút; `order_code` từ sequence `billing_order_code_seq START 1000000000`, CHECK `BETWEEN 1000000000 AND 34359738367`; `description` = `WM` + base32 Crockford
  7 ký tự đệm `0` (1000000123 → `WM0XSNJKV`); `expiredAt` = `floor(expires_at/1000)`.
- `payment_key`: `payos:<environment>:<orderCode>:<reference>` hoặc `manual:<order_id>`; cũng là `dedupe_key` của inbox cho tiền qua payOS. `provider_transaction_id` của dòng
  `purchase` = `<orderCode>:<reference>` hoặc `manual:<order_id>`.
- payOS SDK: `timeout: 4_000`, `maxRetries: 0`, `logLevel: 'off'`; mọi lời gọi qua `callAdapter` (5 s), không bao giờ khi giữ khóa. Chữ ký webhook tự viết, so `timingSafeEqual`.
- Thứ tự khóa: inbox claim → đọc đơn → `lockUser` → `FOR UPDATE` đơn. Mọi đổi trạng thái của job: `UPDATE … WHERE id = … AND status = <vừa đọc>`.
- Không log trường người chuyển (`counterAccount*`, `virtualAccount*`), không log key `order_code` (log dùng `order_ref`). Không gửi `buyer*`, `items`, `invoice` cho payOS.
- Quảng cáo: trang được phép đúng `/{vi,en}/app/groups`, `/{vi,en}/app/lookup`; `ads.show` = `ads_enabled` ∧ Free ∧ không staff ∧ đủ 16 tuổi theo timezone; luôn
  `requestNonPersonalizedAds = 1`. Hộp thoại giới thiệu Pro tắt khi `NEXT_PUBLIC_ADSENSE_CLIENT` có giá trị.
- Defect fix hai commit; Conventional Commits; PR qua skill `ship-pr`. Lệnh test: `pnpm exec vitest run <file>` trong từng app.

## Review Focus

1. **Một lần chuyển khoản tới cả ba đường** (webhook, `check` trang về, job) gần như cùng lúc: phải ra đúng một kỳ. Unit test dùng `FakeDb` không ép khóa, nên ca song song thật
   nằm ở smoke (Task 14: gửi webhook và gọi `check` bằng `Promise.all` → một kỳ); unit giữ LB1E2 (Task 10) và LB1E13 (Task 12).
2. **Lan mua lúc 23:58 ngày 31/01** (kẹp ngày cuối tháng, làm tròn tới hết ngày): `ends_at` và chữ "tới hết" phải khớp nhau ở trang gói, biên nhận, email (Task 5: `periodEnd` →
   01/03 00:00, `lastCoveredDay` → `2027-02-28`; email dùng `lastCoveredDay`, Task 15).
3. **payOS trả trạng thái lạ hoặc `transactions[]` rỗng khi `PAID`**: job không được mở kỳ, không được đánh `expired` nhầm (Task 12 test `PAID` rỗng → `provider-mismatch`).
4. **Lan vừa mua Pro khi đang ở Nhóm có script AdSense**: trang phải tải lại, không còn script (Task 23 test LB3E3).
5. **Admin đổi giá giữa lúc Lan đang xem trang gói**: Lan không bao giờ trả số khác số đã thấy (Task 11 test `price-changed`, LB1E28).

---

## M0 — Spike CSP `nonce` (song song đợt A M1)

### Task 1: Spike trên bản build Worker

**Files:** nhánh `spike/launch-b-csp-nonce` (bỏ đi); ghi kết quả `docs/deliveries/chuan-bi-launch-b-spike-csp.md` trên nhánh tài liệu.

- [ ] **Step 1:** Bỏ CSP của `/app` khỏi `next.config.ts` `headers()`; trong `proxy.ts` cho `/{locale}/app*`: tạo nonce (`btoa(crypto.randomUUID())`), đặt
  `Content-Security-Policy` (chuỗi §5.4, chưa có phần in đậm) trên **request** và response; layout `[locale]/app` gọi `await connection()`.
- [ ] **Step 2:** `pnpm cf:build && pnpm cf:dev`; kiểm đủ danh mục §5.4: mọi `<script>` có nonce bằng header; hai request khác nonce; script chống nháy màu chạy; beacon
  Cloudflare (chèn tự động có bị chặn không; nếu bị thì thử snippet tay có nonce); Turnstile ở `/vi/app/login`, `/register`, `/forgot-password` chạy; Console 0 vi phạm ở `/vi`,
  `/vi/app`, `/vi/app/login`, `/vi/app/groups`; đo CPU Worker một trang `/app` (`wrangler` log).
- [ ] **Step 3:** Ghi kết quả từng dòng, kết luận qua/không qua, và cách nạp script Turnstile dưới `'strict-dynamic'` vào file trên. Commit `docs(deliveries): csp nonce spike on the worker build`.
  Không qua → M4 dừng chờ OpenNext; M1–M3 chạy tiếp.

---

## M1 — Đơn hàng và payOS (API)

### Task 2: Migration và model

**Files:**
- Create: `apps/api/prisma/migrations/20261110100000_billing_orders/migration.sql`
- Modify: `apps/api/prisma/models/entitlements.prisma` (`BillingOrder`, `BillingOrderPayment`, `PrepaidPeriod`, `FakePayosLink`), `apps/api/src/identity/deletion/account-data-map.ts`
- Test: `apps/api/src/identity/deletion/account-data-map.spec.ts` (có sẵn, tự kiểm cột mới)

- [ ] **Step 1:** Viết migration đúng bảng §3.2: sequence; CHECK `environment`, `period_months`, `status` (7 giá trị), `review_reason` (7 giá trị + null; bắt buộc khi
  `needs_review`), `paid_via`, `outcome` (5 giá trị), `order_code` range; unique `(provider, order_code)`, `payment_key`; FK `billing_order_payments.period_id` `ON DELETE SET NULL`;
  index `billing_orders(status, created_at)`, `(user_id)`, `prepaid_periods(user_id, ends_at)`. `billing_transactions_interval_check` DROP rồi ADD với `month | quarter | year`.
  `entitlement_notices_kind_check` DROP rồi ADD thêm `expiry_notice`, `payment_receipt` (dùng ở M2).
- [ ] **Step 2:** Model Prisma khớp; `ACCOUNT_DATA_MAP`: `billing_orders.user_id` `anonymise`, `billing_orders.resolved_by` `keep-id`, `billing_order_payments.confirmed_by`
  `keep-id`, `prepaid_periods.user_id` `erase`, `prepaid_periods.revoked_by` `keep-id`.
- [ ] **Step 3:** `pnpm db:setup` trên DB mới; `pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma --exit-code --script` → exit 0;
  `pnpm exec vitest run src/identity/deletion/account-data-map.spec.ts` → PASS.
- [ ] **Step 4:** commit `feat(api): billing orders, order payments and prepaid periods tables`.

### Task 3: Setting giá và `app-config`

**Files:** `apps/api/src/settings/settings.definitions.ts`, `settings/app-config.view.ts`, `apps/web/src/app-shell/queries.ts`, `apps/admin/src/features/settings/settings-api.ts`,
`apps/admin/messages/{vi,en}.json`; specs `settings.definitions.spec.ts`, `app-config.view.spec.ts`, `apps/admin/src/features/settings/settings-api.test.ts`, `apps/admin/e2e/support/settings.ts`

**Interfaces:**
- Produces: `AppConfigView.plans.pro.prices: { '1': number; '3': number; '12': number }`; `AppSettings['entitlements']` thêm `proPrice1mVnd`, `proPrice3mVnd`, `proPrice12mVnd`;
  `priceFor(settings: AppSettings['entitlements'], months: 1 | 3 | 12): number` trong `apps/api/src/entitlements/plan-numbers.ts` (cạnh `planNumbers`).

- [ ] **Step 1: Failing tests:** ba key mặc định 79000/199000/599000; `999` → 400; `app-config` có `plans.pro.prices` đúng ba số; admin thêm ba ô (đếm key theo số đợt A để lại + 3).
- [ ] **Step 2:** implement đủ năm chỗ của settings; PASS. Commit `feat(settings): pro prices for 1, 3 and 12 months`.

### Task 4: Config payOS

**Files:** `apps/api/src/common/config/app-config.ts`, `.env.example`, `test/support/test-config.ts`; spec `app-config.spec.ts`

**Interfaces:** Produces `AppConfig.payos: { mode: 'real' | 'fake' | 'off'; clientId: string | null; apiKey: string | null; checksumKey: string | null }` (`fake` khi
`PAYOS_FAKE_ENABLED=true`, `real` khi đủ ba biến, `off` khi không có gì).

- [ ] **Step 1: Failing tests:** LB1E42 (đặt một hoặc hai trong ba `PAYOS_*` → throw nêu tên biến thiếu); LB1E41 (`PAYOS_FAKE_ENABLED=true` + `BILLING_PRODUCTION=true` → throw);
  `PAYOS_FAKE_ENABLED=true` cần `BILLING_FAKE_SECRET` như bản giả billing (dùng để ký webhook giả).
- [ ] **Step 2:** implement; `.env.example` thêm `PAYOS_FAKE_ENABLED=true` cho local và ba biến trống. PASS. Commit `feat(api): payos config with a fake mode`.

### Task 5: Hàm thuần của đơn và kỳ

**Files:** Create `apps/api/src/entitlements/orders/order-codes.ts`, `order-codes.spec.ts`, `apps/api/src/entitlements/orders/period-window.ts`, `period-window.spec.ts`

**Interfaces:**
- Produces:

```ts
export function orderDescription(orderCode: number): string;            // 'WM' + 7 base32 Crockford
export function expiredAtSeconds(expiresAt: Date): number;               // floor(ms/1000)
export function paymentKeyPayos(env: 'production' | 'sandbox', orderCode: number, reference: string): string;
export function paymentKeyManual(orderId: string): string;
export type ProSpan = { startsAt: Date; endsAt: Date; revokedAt: Date | null };
export function continuousProUntil(spans: ProSpan[], now: Date): Date | null;   // dùng cho starts_at và pro_until (§3.7)
export function periodEnd(startsAt: Date, months: 1 | 3 | 12, zone: string): Date;  // cộng tháng theo lịch, kẹp, làm tròn lên 00:00 hôm sau
export function lastCoveredDay(endsAt: Date, zone: string): string;              // 'YYYY-MM-DD' của endsAt − 1 ms theo zone ("tới hết")
```

- [ ] **Step 1: Failing tests:** `orderDescription(1000000123) === 'WM0XSNJKV'`; `orderDescription(1000000000)` 9 ký tự, chỉ `[0-9A-HJKMNP-TV-Z]`; biên `34359738367`;
  `expiredAtSeconds`; năm hàng của bảng §3.7 (`periodEnd` và `lastCoveredDay`, vd 05/11/2026 10:02 VN, 1 tháng → `2026-12-05T17:00:00Z`, `'2026-12-05'`); thêm ca Review Focus 2:
  31/01/2027 23:58 VN, 1 tháng → `2027-02-28T17:00:00Z`, `'2027-02-28'`; `continuousProUntil` với LB1E30 (hai grant liền), LB1E31 (grant tương lai không liền → không nối), span bị
  thu hồi.
- [ ] **Step 2:** implement; PASS. Commit `feat(api): order codes, descriptions and prepaid period windows`.

### Task 6: Chữ ký webhook payOS và `verify`

**Files:** Create `apps/api/src/entitlements/billing/payos/payos-signature.ts` (+ spec), `payos/payos-wire.ts` (+ spec); thêm dev dependency `@payos/node` 2.0.5 (đối chiếu trong test)

**Interfaces:**
- Produces: `signPayosData(data: Record<string, unknown>, checksumKey: string): string`; `verifyPayosBody(rawBody: Buffer, checksumKey: string): { ok: true; body: PayosWebhook } | { ok: false }`;
  `toParsedEvent(body: PayosWebhook, env): ParsedEvent` (type `payment_succeeded`, `externalEventId` = `<orderCode>:<reference>`, `appUserId` null, `externalSubscriptionId` null,
  payload chuẩn hóa §3.12, `raw` không có `counterAccount*`, `virtualAccount*`).

- [ ] **Step 1: Failing tests:** body mẫu từ tài liệu payOS ký bằng khóa test → `ok`; đổi một ký tự chữ ký → `ok: false`; key xáo thứ tự, giá trị `null`, mảng → cùng chữ ký với
  `new PayOS(...).webhooks.verify` của SDK (await); `raw` không có `counterAccountNumber`; payload có `payer` (ba trường), `success`, `code`.
- [ ] **Step 2:** implement (sắp key, `null`/`undefined` → `''`, mảng `JSON.stringify` sau khi sắp key từng phần tử, HMAC-SHA256 hex, `timingSafeEqual` hai buffer cùng độ dài);
  PASS. Commit `feat(api): verify payos webhook signatures`.

### Task 7: Adapter payOS, bản giả, trang checkout giả

**Files:**
- Modify: `apps/api/src/entitlements/billing/billing-adapter.ts` (ba method tùy chọn, kiểu `CheckoutOrder`, `CheckoutState`), `billing.types.ts` (`ORDER_EVENT_TYPES`,
  `OrderEventType`, `ParsedEvent.type`, `externalSubscriptionId: string | null`, sửa ghi chú D35)
- Create: `billing/payos/payos.adapter.ts`, `billing/payos/fake-payos.adapter.ts`, `billing/payos/fake-payos.controller.ts` (`/v1/dev/payos/checkout`), specs
- Modify: module Entitlements (đăng ký theo `config.payos.mode`)

**Interfaces:**
- Produces: `BillingAdapter.createCheckout?(order: CheckoutOrder): Promise<{ paymentLinkId: string; checkoutUrl: string }>`;
  `getCheckout?(orderCode: number): Promise<CheckoutState | null>`; `cancelCheckout?(orderCode: number): Promise<void>` (kiểu đúng §3.3).

- [ ] **Step 1: Failing tests:** adapter thật gọi SDK `paymentRequests.create` với `orderCode`, `amount`, `description`, `returnUrl`, `cancelUrl`, `expiredAt` (giây), **không** có
  `buyer*`; SDK được tạo với `timeout: 4000, maxRetries: 0, logLevel: 'off'`; `getCheckout` map đủ 7 trạng thái; `verify` dùng Task 6, `ack` → 200; LB1E22 (chữ ký sai qua route
  webhook → 400, không ghi `billing_events`). Bản giả: `createCheckout` ghi `fake_payos_links`, trả `checkoutUrl` tới `/v1/dev/payos/checkout?order=…`; `getCheckout` đọc bảng đó
  (cả từ worker), `cancelCheckout` đặt `CANCELLED`; nút "Đã trả", "Trả thiếu" ghi `transactions` rồi phát webhook ký bằng `BILLING_FAKE_SECRET`, "Hủy" chỉ đổi status; tham số
  `webhook=0` ghi giao dịch mà không phát webhook (cho smoke "webhook trễ"); trang giả 404 khi `mode !== 'fake'`. `subscription-machine.spec.ts:300-303` (13 loại) vẫn PASS.
- [ ] **Step 2:** implement; PASS. Commit `feat(api): payos adapter, its fake and the fake checkout page`.

### Task 8: Rẽ nhánh applier sang `OrderApplier`

**Files:** `apps/api/src/entitlements/billing/event-applier.service.ts` (trước nhánh `unknown-user` `:102-108`), create `entitlements/orders/order-applier.service.ts` (khung)

**Interfaces:**
- Produces: `OrderApplier.applyPayment(input: { source: 'webhook' | 'reconcile'; env; orderCode: number; paymentLinkId: string; reference: string; amount: number; providerTime: string | null; success: boolean; code: string; payer: Payer | null; eventId?: string }): Promise<OrderApplyResult>`
  và `OrderApplier.confirmManual(input: { orderId: string; adminId: string; reference: string; amount: number; reason: string }): Promise<OrderApplyResult>`;
  `OrderApplyResult = { outcome: 'opened-period' | 'attached' | 'counted' | 'flagged' | 'refund-needed' | 'ignored'; reason?: string; periodId?: string }`.

- [ ] **Step 1: Failing test:** sự kiện `payment_succeeded` có `appUserId = null` đi vào `OrderApplier.applyPayment` (spy), **không** vào nhánh `unknown-user` (payload không bị xóa);
  sự kiện sandbox ở production vẫn bị bỏ như cũ; LB1E25 (sự kiện `failed` một lần, job `billing-events-retry` chạy lại → vào `OrderApplier`, một kỳ).
- [ ] **Step 2:** implement nhánh; PASS. Commit `feat(api): route one-off payment events to the order applier`.

### Task 9: Kỳ trả trước trong `resolve()` và snapshot

**Files:** `entitlements/rules/plan-rules.ts` (`PrepaidSource`, nguồn Pro `prepaid`, anchor = `starts_at` kỳ đang chạy), `sources/sources.repository.ts` (`load`, `loadMany`, `proCandidates`,
`ended` của đợt A), `rules/source-ends.ts` (nhánh `prepaid_period` của `aiSourceEnds`), `entitlements.service.ts` (snapshot `kind: 'prepaid'`, `upcoming_periods`, `pro_until`),
`apps/web/src/app-shell/queries.ts` (kiểu); specs

**Interfaces:**
- Consumes: đợt A `aiSourceEnds`, `EndedSources`, `load(db, userId, now, endedSince?)`; Task 5 `ProSpan`, `continuousProUntil`.
- Produces: `PrepaidSource = { id: string; startsAt: Date; endsAt: Date; revokedAt: Date | null }`; `load` trả thêm `prepaidPeriods: PrepaidSource[]` (chưa thu hồi, `ends_at > now`, cả kỳ
  tương lai); `EndedSources` thêm `prepaidPeriods: PrepaidSource[]` (hết hoặc thu hồi từ `endedSince`); `aiSourceEnds` nhận thêm `prepaidPeriods` (`endedAt` = `ends_at`, hoặc
  `revoked_at` khi thu hồi giữa chừng); `proSpans(grants, prepaidPeriods): ProSpan[]` để Task 10 và snapshot gọi `continuousProUntil`.

- [ ] **Step 1: Failing tests:** kỳ đang chạy → `plan: 'pro'`, anchor = `starts_at`; kỳ tương lai → không vào `sources`, có trong `upcoming_periods`; `pro_until` = `continuousProUntil`;
  kỳ thu hồi → hết Pro ở `revoked_at`; LB1A8 (kỳ cuối hết 06/12 00:00 → `aiSourceEnds` có `{ kind: 'prepaid_period', endedAt: 06/12 00:00 }`, lượt AI dùng 01–06/12 không trừ vào Free);
  kỳ thu hồi trước khi bắt đầu → không phải nguồn; dashboard Pro tính người có kỳ trả trước; LB1E32 (grant bắt đầu ngay khi kỳ đang chạy → hai nguồn, kỳ giữ nguyên `starts_at`,
  `ends_at`); LB1E34 (grant thu hồi sớm → kỳ nối sau grant không đổi ngày).
- [ ] **Step 2:** implement; PASS. Commit `feat(entitlements): prepaid periods are a pro source`.

### Task 10: Luật T1–T14 của `OrderApplier`

**Files:** `entitlements/orders/order-applier.service.ts`, `order-rules.ts` (hàm thuần quyết theo bảng), specs; `billing/transactions.repository.ts` (dòng `purchase` của kỳ trả trước,
kiểu `TransactionInterval = 'month' | 'quarter' | 'year'`, không sửa `Interval` của `entitlements.types.ts:18`); `identity/profile/identity.service.ts` (`accountStatus(userId, db?)`)

**Interfaces:**
- Consumes: Task 5 (`continuousProUntil`, `periodEnd`, `paymentKey*`), Task 8, Task 9 (`load` có `prepaidPeriods`, `proSpans`; `starts_at` = `continuousProUntil(proSpans(...), now)`).
- Produces: `decideOrderPayment(state: OrderState, payment: IncomingPayment): Decision` (thuần), `Decision = { orderStatus; reviewReason; paidVia; openPeriod: boolean; outcome; flag?: string; error?: '409-order-already-paid' | '409-order-closed' | '409-account-deleted' | '409-account-deleting' }`.

- [ ] **Step 1: Failing tests cho hàm thuần:** một `it` cho mỗi hàng T1–T14 (ghim `orderStatus`, `reviewReason`, `outcome`, `openPeriod`, lỗi); kiểm trước: `success: false`,
  `code ≠ '00'`, thiếu field, `unknown-order`, `link-mismatch` → `ignored` (LB1E20, LB1E21, LB1E23); "đúng hạn" với `provider_time` ≤ `expires_at` + 10 phút (LB1E11, LB1E12; cả khi
  nguồn là `reconcile`, LB1E24); tổng S (LB1E9, LB1E10); T10 (LB1E14).
- [ ] **Step 2: Failing tests cho service** (in-memory `FakeDb` có call log, theo mẫu `event-applier.service.spec.ts`): LB1A1 (kỳ, dòng `purchase` 79000 ₫ interval `month`,
  `provider_transaction_id` `<orderCode>:<reference>`), LB1A5, LB1E1–LB1E8, LB1E26 (hai đơn lần lượt → kỳ sau bắt đầu ở `ends_at` kỳ trước), LB1E36–LB1E40 (đơn ẩn danh hoặc
  `deleting` → `needs_review` `account-deleted`, lưu ba trường hoàn tiền, `payer` bị xóa khỏi payload), thứ tự khóa (call log: `lockUser` trước `FOR UPDATE` đơn); log: không entry nào
  chứa `counterAccount`, `counter_account` hay key `order_code` (§3.12).
- [ ] **Step 3:** implement; PASS. Commit `feat(api): order applier rules T1–T14`.

### Task 11: API đơn của học viên

**Files:** create `entitlements/orders/me-orders.controller.ts`, `orders.service.ts`, `orders.schemas.ts`, specs; problem types `price-changed`, `provider-unavailable`, `order-already-paid`,
`order-closed`

**Interfaces:**
- Produces: `POST /v1/me/orders { period_months, expected_amount, locale }` → 201 `{ order_id, checkout_url }`; `GET /v1/me/orders/:id` → `OrderView = { id, status, period_months, amount, description, expires_at, period: { starts_at, ends_at } | null }`
  (`POST …/check` ở Task 12).

- [ ] **Step 1: Failing tests:** `period_months: 2` → 400; `expected_amount` khác giá → 409 `price-changed` (LB1E28); thành công: đơn `pending` commit **trước** khi gọi `createCheckout`
  (spy thứ tự), rồi có `payment_link_id`; `createCheckout` ném/quá giờ → đơn `failed`, 503 `provider-unavailable`, `Idempotency-Key` được nhả, bấm lại tạo `order_code` mới
  (LB1E17); `returnUrl` = `cancelUrl` = `{LEARNER_APP_URL}/{locale}/app/plans/order?order=<id>`; LB1E27 (cùng key → cùng đơn; khác key → hai đơn `pending`); LB1E29 (đổi giá sau khi
  tạo → `amount_minor` của đơn giữ số cũ); đơn của người khác → 404.
- [ ] **Step 2:** implement (`@Idempotent`, `@RateLimit('user.write')`); PASS. Commit `feat(api): learners create payos orders`.

### Task 12: Job đối soát `billing-orders-reconcile` và `check`

**Files:** create `entitlements/orders/orders-reconcile.service.ts` (`reconcileOne`), `orders-reconcile.job.ts` (+ specs); đăng ký job vào `MaintenanceScheduler`
(`common/maintenance/maintenance.scheduler.ts`); `me-orders.controller.ts` thêm `check`

**Interfaces:**
- Produces: `reconcileOne(order: { id: string; status: string; orderCode: number; paymentLinkId: string | null; expiresAt: Date; createdAt: Date }, now: Date): Promise<void>`;
  `POST /v1/me/orders/:id/check` (`@RateLimit('user.write')`) → `OrderView` của Task 11.

- [ ] **Step 1: Failing tests:** `check` chỉ gọi `reconcileOne` khi `pending` và `checked_at` quá 10 giây (LB1E46); `check` thấy `transactions[]` → `paid` `reconcile` (LB1A3), thấy
  `CANCELLED` → `cancelled` (LB1A6); đơn của người khác → 404. Job: chọn đơn theo ba điều kiện §3.6 bằng `UPDATE … RETURNING` + `SKIP LOCKED`, tối đa 100 (LB1E47); mỗi hàng bảng §3.6 một `it` (gồm `PAID` mà
  `transactions[]` rỗng → `needs_review` `provider-mismatch`; `PENDING` quá hạn → `cancelCheckout` rồi `expired`; hủy lỗi → giữ `pending`, quá 24 giờ → `expired` (LB1E15); lỗi/429
  → không đổi (LB1E16); trạng thái lạ → như `PROCESSING` + warn); `transactions[]` → sự kiện inbox khóa `payos:…:<orderCode>:<reference>` nguồn `reconcile` (LB1A4, LB1E2); webhook
  đổi đơn thành `paid` giữa chừng → `UPDATE` 0 hàng, đơn giữ `paid` (LB1E13); LB1E18, LB1E19.
- [ ] **Step 2:** implement; PASS. Commit `feat(api): reconcile pending payos orders hourly and on the return page`.

### Task 13: API admin đơn hàng và xóa tài khoản

**Files:** create `entitlements/orders/admin-orders.controller.ts` (+ spec); `entitlements/account-deletion.provider.ts` (eraser); `billing/billing-jobs.service.ts` (job xóa raw payload
cũng xóa ba trường hoàn tiền quá 90 ngày); `billing/transactions-expire.job.ts` (cắt cả đơn ở trạng thái cuối)

**Interfaces:**
- Produces (`settings.manage`): `GET /v1/admin/orders` (lọc `status`, `needs_attention`, `email`, `from`, `to`, `q` theo `WM…`), `GET /v1/admin/orders/:id` (payments, periods, khoảng Pro
  hiện có, thông tin hoàn tiền), `POST /:id/confirm-payment { reference, amount, reason }` (`@Idempotent`), `POST /:id/cancel`, `POST /:id/resolve { note }`,
  `POST /v1/admin/prepaid-periods/:id/revoke { reason }` (`@Idempotent`).

- [ ] **Step 1: Failing tests:** editor → 403; confirm đi `OrderApplier.confirmManual` (LB1A5, LB1E5, LB1E6, LB1E40); cancel gọi `cancelCheckout` ngoài khóa, payOS lỗi → 503, đơn không
  đổi; resolve `needs_review` → `closed`, đơn `paid` có cờ → tắt cờ, xóa thông tin hoàn tiền; revoke kỳ giữa chuỗi → kỳ sau không dời (LB1E33). Eraser: LB1A9, LB1E35 (không gọi payOS,
  đơn ẩn danh, kỳ xóa, payments giữ `period_id` null). Job 90 ngày: LB1E38; LB1E48 (sự kiện payOS kẹt `failed` quá 90 ngày → `payer` bị xóa khỏi `payload` cùng `raw_payload`).
  Job cắt hồ sơ: đơn ở trạng thái cuối (`paid`, `expired`, `cancelled`, `failed`, `closed`) tạo trước mốc `transactionRetentionYears` bị xóa kèm payments, periods.
- [ ] **Step 2:** implement; PASS. Commit `feat(api): admin orders, manual confirmation and account deletion of orders`.

### Task 14: CLI webhook và smoke payments

**Files:** create `apps/api/src/cli/payos-confirm-webhook.ts` + script `payos:confirm-webhook` trong `apps/api/package.json`; create `apps/api/scripts/smoke-buoc-b-payments.mjs` + script
`smoke:buoc-b-payments`; `docs/deliveries/chuan-bi-launch-b.md` (as-built M1)

- [ ] **Step 1:** CLI gọi SDK `webhooks.confirm(url)` khi `mode = 'real'`, in kết quả; `fake` → in "fake mode, nothing to confirm".
- [ ] **Step 2:** Smoke (API `PAYOS_FAKE_ENABLED=true`, `TURNSTILE_MODE=fake`, DB mới): mua 1 tháng qua trang giả → Pro, dòng `purchase`; trùng webhook → một kỳ; "Đã trả" với
  `webhook=0` rồi `check` → `paid` `reconcile`; "Đã trả" với `webhook=0`, dời `created_at` bằng SQL, chạy job đối soát một lần → `paid` `reconcile`; gửi webhook và gọi `check` bằng
  `Promise.all` cho cùng lần trả → một kỳ (Review Focus 1); mua 12 tháng khi còn Pro → kỳ nối tiếp; "Trả thiếu" rồi đủ → một kỳ; admin xác nhận rồi webhook cùng lần (T7) → không kỳ
  mới; admin bấm hai lần → 409; payOS giả lỗi lúc tạo → 503 rồi đơn mới; xóa tài khoản rồi "Đã trả" → `needs_review` `account-deleted`; dời ngày kỳ bằng SQL cho hết hạn → Free.
  In dòng pass cuối.
- [ ] **Step 3:** `pnpm build && pnpm smoke:buoc-b-payments` → PASS; lưu output `docs/deliveries/chuan-bi-launch-b-smoke-output.txt`. Commit `test(api): payments smoke with the fake payos`;
  PR M1 bằng `ship-pr`.

---

## M2 — Mua trên web, admin, email, văn bản

### Task 15: Email `expiry_notice` và `payment_receipt`

**Files:** `entitlements/entitlements.types.ts` (`NoticeKind`), `notices/entitlement-mail.ts` (`COPY`, chọn ngày, bỏ câu App Store với hai kind mới), `notices/notice-planner.service.ts`,
`notices/notice-sender.service.ts` (`claim` `:78`, `deliver` `:102`), `orders/order-applier.service.ts` (tạo notice biên nhận); specs

- [ ] **Step 1: Failing tests:** planner lập `expiry_notice` cho kỳ cuối 7 ngày trước `ends_at` (`subject_key` = id kỳ, `period_key` = `ends_at`, `window_ends_at` = `ends_at`); lúc lập và lúc gửi
  còn Pro liền qua `ends_at` (kỳ nối hoặc grant nối) → `skipped` `covered` (LB1A2, LB1E43); `OrderApplier` mở kỳ → một `payment_receipt` (`subject_key` = id payment, `period_key` =
  `starts_at`, `window_ends_at` = +7 ngày; cả T8, T11); `claim` không coi hai kind mới là email trial; `deliver` tải kỳ/payment/đơn và ghi ngày bằng `lastCoveredDay` (Task 5; LB1A7: kỳ
  hết 06/12 00:00 → "05/12/2026", link `/app/plans`); nội dung không có "App Store", "Google Play", "tự gia hạn"; biên nhận có kỳ, số tiền, `WM…`, mã tham chiếu, câu "không hoàn tiền";
  trần 95% (LB1E44).
- [ ] **Step 2:** implement; PASS. Mở rộng `smoke:buoc-b-payments`: sau lần mua đầu có một `payment_receipt` `sent` (Mailpit nhận); dời `ends_at` về 6 ngày tới, chạy planner → một
  `expiry_notice`; mua kỳ nối rồi chạy sender → `skipped` `covered`. Commit `feat(entitlements): expiry and receipt emails for prepaid plans`.

### Task 16: Trang gói của web

**Files:** `apps/web/src/features/learner/plans/PlansPage.tsx`, `PlanCard.tsx`, create `plans/buy.ts` (gọi API), `messages/{vi,en}.json` (gồm `ui.lockedLine` `:341`, `:1017`),
`features/learner/transactions/transactions-api.ts` + chữ `intervals.quarter`; tests `plans.test.tsx`, `transactions.test.tsx`, `ui-kit.test.tsx`

- [ ] **Step 1: Failing tests:** ba kỳ với giá từ `plans.pro.prices`; không còn "Chưa mở bán", `XXX.000 ₫`; câu "Không hoàn tiền. Gói không tự gia hạn; hết hạn bạn mua kỳ mới." ngay trên nút Mua
  và link Điều khoản; bấm Mua gửi `Idempotency-Key` và `expected_amount`, 201 → `window.location.assign(checkout_url)`; 409 → tải lại giá và câu "Giá vừa đổi, xem lại trước khi mua"; 503 →
  "Chưa tạo được đơn. Thử lại sau ít phút."; Pro: "Pro tới hết {ngày}" từ `pro_until`, "Kỳ tiếp theo: …" từ `upcoming_periods`; hàng "Hủy gói" (`SubscriptionRows`) không hiện với
  nguồn `kind: 'prepaid'`; câu khóa mới nguyên văn §3.8; lịch sử hiện "3 tháng"; màn xóa tài khoản (`DeleteAccountPage.tsx`, test `delete-account.test.tsx`) có câu "Thời gian Pro còn
  lại sẽ mất, không hoàn tiền." khi `pro_until` khác null.
- [ ] **Step 2:** implement; PASS. Commit `feat(web): buy pro for 1, 3 or 12 months`.

### Task 17: Trang về `/app/plans/order`

**Files:** create `apps/web/src/app/[locale]/app/(member)/plans/order/page.app.tsx`, `features/learner/plans/OrderReturnPage.tsx` (+ test)

- [ ] **Step 1: Failing tests:** đọc `?order=` và bỏ qua `code`, `id`, `cancel`, `status`, `orderCode` (LB1E45); gọi `check` một lần rồi `GET` mỗi 3 s tối đa 2 phút (fake timers); `paid` → câu
  thành công có ngày (LB1A3), invalidate `['me','entitlements']`; `pending` quá 2 phút → câu chờ kèm email hỗ trợ; `needs_review` → câu kiểm tra; `cancelled`/`expired`/`failed` → "Đơn đã hủy hoặc hết
  hạn" + nút về trang gói (LB1A6).
- [ ] **Step 2:** implement; PASS. Commit `feat(web): order return page polls the order`.

### Task 18: Màn "Đơn hàng" của admin

**Files:** create `apps/admin/src/features/orders/*` (list, detail, dialogs, api, tests), `apps/admin/src/app/nav.ts`, `routes.tsx`, `messages/{vi,en}.json`

- [ ] **Step 1: Failing tests:** menu chỉ hiện với `settings.manage`; danh sách lọc trạng thái, "Cần xem", email, ngày, `WM…`; chi tiết hiện payments, kỳ, khoảng Pro, lý do, thông tin hoàn tiền;
  "Đã nhận tiền" bắt buộc mã, số tiền, lý do, gửi `Idempotency-Key`, 409 hiện câu "Đơn đã có kỳ"; "Hủy đơn", "Đã xử lý" (bắt buộc ghi chú), "Thu hồi kỳ" (bắt buộc lý do).
- [ ] **Step 2:** implement; `pnpm exec vitest run` admin → PASS. Commit `feat(admin): orders screen with manual confirmation`.

### Task 19: Văn bản và checklist của M2

**Files:** nhánh `docs/web-launch-research`: `docs/preparation/legal-drafts/*.draft.md` (bốn file); nhánh M2: `docs/deliveries/deploy-checklist.md`

- [ ] **Step 1:** Điều khoản mục 5–8 viết lại theo VietQR (không trial, không tự gia hạn, kỳ nối tiếp, không hoàn tiền); Chính sách bảo mật thêm mục payOS (§3.12) và phần quảng cáo
  dạng "gói Free có thể hiển thị quảng cáo không cá nhân hóa của Google…" (Q-B16 cách a, §5.6), bản vi và en. Commit trên `docs/web-launch-research`.
- [ ] **Step 2:** Checklist: `/v1/billing/webhooks/payos` qua WAF và Bot Fight Mode; `pnpm payos:confirm-webhook` sau mỗi lần đổi domain; ba biến `PAYOS_*`; bảng §3.14 cho lần mua thật.
- [ ] **Step 3:** `pnpm smoke:buoc-b-payments`, `smoke:buoc-5`, `smoke:buoc-7`, `smoke:buoc-8` trên DB mới → PASS; nối output. Commit `docs(deploy): payos items`; PR M2 bằng `ship-pr`.

---

## M3 — Ai thấy quảng cáo, hộp thoại giới thiệu Pro

### Task 20: `isAtLeast` và `ads.show`

**Files:** `apps/api/src/identity/profile/identity.service.ts` (`isAtLeast(profile, years, now)`), `entitlements/entitlements.service.ts:177-180`; specs; `apps/web/src/app-shell/queries.ts` (`ads`)

- [ ] **Step 1: Failing tests:** LB2E1–LB2E6 (`birth_date` null → false; sinh nhật 16 hôm nay theo timezone → true; thiếu một ngày → false; sinh 29/02, năm tròn 16 không nhuận, hôm nay 28/02
  → false, 01/03 → true; staff có hoặc không Pro → false; Pro/trial/kỳ trả trước → false; `ads_enabled` tắt → false).
- [ ] **Step 2:** implement (dùng `isOldEnough(birth_date, today, 16)` có sẵn); PASS. Commit `feat(entitlements): ads only for free learners aged 16 or more, never staff`.

### Task 21: Hộp thoại giới thiệu Pro

**Files:** create `apps/web/src/features/learner/house-ad/HouseAd.tsx`, `house-ad-counter.ts` (+ tests); mount trong `app-shell/AppProviders.tsx` (layout `/app`); `messages/{vi,en}.json`

**Interfaces:** Produces `shouldShowHouseAd(input: { counter: Counter | null; now: Date; zone: string; perDay: number; minIntervalMinutes: number }): boolean` (thuần).

- [ ] **Step 1: Failing tests:** LB2A1 (soft navigation tới `/vi/app/groups` lần đầu trong ngày → hiện, đếm 1, "Xem gói Pro" tới `/app/plans`); LB2E7–LB2E16 (10 phút; lần 4; qua 00:00 theo
  zone; `0`/ngày; bộ đếm theo user id; `localStorage` ném lỗi → không hiện; full load → không hiện; trang khác và `?q=` → không hiện; `NEXT_PUBLIC_ADSENSE_CLIENT` có giá trị → không bao giờ;
  giá "từ {price}" đọc `plans.pro.prices['1']`); LB2A2 (mua xong `ads.show` false → không hiện).
- [ ] **Step 2:** implement bằng `Dialog` của `app-ui`; PASS. Commit `feat(web): house ad dialog for pro on groups and lookup`; PR M3 bằng `ship-pr`.

---

## M4 — AdSense vignette (sau deploy cho phần bật; CSP làm trước)

### Task 22: CSP `nonce` cho `/app` và `assert:render-mode`

**Files:** `apps/web/src/proxy.ts`, `src/lib/csp.ts` (+ `buildAppCsp(nonce, { adsense: boolean, apiOrigin })`), `next.config.ts` (bỏ CSP cho `/app`), `src/app/[locale]/app/layout.app.tsx`
(`await connection()`), create `apps/web/scripts/assert-render-mode.mjs`, `package.json`, `.github/workflows/ci.yml`, `apps/web/e2e/csp.spec.ts`; design người học §4.1 (ghi chú)

- [ ] **Step 1: Failing tests:** `buildAppCsp` ra đúng bảng §5.4 khi `adsense: false` và khi `true` (phần in đậm); script `assert:render-mode` fail khi `/vi` không có trong prerender manifest
  hoặc `/vi/app` có trong đó.
- [ ] **Step 2:** implement theo kết quả spike Task 1 (cách nạp Turnstile và beacon dưới `'strict-dynamic'`; beacon tự động bị chặn thì tắt chèn tự động, đặt snippet tay có nonce,
  LB3E9); CI thay `assert:static` bằng `assert:render-mode` (`ci.yml:108`); con số CPU Worker của spike vào `deploy-checklist.md`.
- [ ] **Step 3:** e2e mở rộng §5.4 (nonce ở `/vi/app`, `/vi/app/login`; hai lần tải `/vi/app/groups` khác nonce, `/vi` không nonce (LB3E7); Turnstile ở `/vi/app/login` không vi phạm
  (LB3E8); 0 vi phạm ở bốn trang; landing → app là tải lại cả trang, LB3E6);
  `pnpm cf:docker` → PASS. Commit `feat(web): nonce csp for the learner app`.

### Task 23: Nạp AdSense ở hai trang được phép

**Files:** create `apps/web/src/features/learner/ads/AdsenseLoader.tsx` (+ test), mount trong layout `(member)`; `app-chrome/AppFooter.tsx:28-51` (`<a>`); link bắt đầu luyện, ôn thẻ trên Nhóm, Tra từ
(`data-google-vignette="false"`); `apps/web/README.md` (`NEXT_PUBLIC_ADSENSE_CLIENT`)

- [ ] **Step 1: Failing tests:** chỉ chèn script khi `ads.show` ∧ có client ∧ `pathname` ∈ `/{vi,en}/app/groups|lookup` (LB3A2: tab từ Hôm nay sang Tra từ → chèn lúc tới); đặt
  `requestNonPersonalizedAds = 1` trước; script có `nonce`, `async`, `crossorigin="anonymous"`; LB3E1 (script đã nạp, `pathname` sang trang khác → `hardReplace(location.href)`); LB3E2
  (`/vi/app/practice/session` → không chèn); LB3E3, LB3E4 (`ads.show` thành false → `hardReplace`); LB3E5 (chân trang là `<a>`); LB3E11 (script phát `error` → không throw, không hiện
  gì); LB3E12; link bắt đầu luyện có `data-google-vignette="false"`.
- [ ] **Step 2:** implement; PASS. Commit `feat(web): load adsense only on groups and lookup`; PR M4 bằng `ship-pr`.

### Task 24: Xong khi của đợt B

- [ ] **Step 1:** Smoke payments, 5, 7, 8 trên DB mới → PASS; output vào `docs/deliveries/chuan-bi-launch-b-smoke-output.txt`.
- [ ] **Step 2:** (Chủ dự án, sau deploy M1–M2) một lần mua thật nhỏ với payOS thật; ghi từng dòng bảng §3.14 vào `docs/deliveries/chuan-bi-launch-b.md`.
- [ ] **Step 3:** (Sau khi Google duyệt) đặt `NEXT_PUBLIC_ADSENSE_CLIENT`; tạo `apps/web/public/ads.txt` chép đúng dòng AdSense đưa; cài đặt AdSense §5.2; một tuần
  `Content-Security-Policy-Report-Only`; kiểm bảng §5.7 và LB3A1, LB3A2. Google từ chối (LB3E13) hoặc A1 sai (LB3E10) → không đặt hoặc gỡ `NEXT_PUBLIC_ADSENSE_CLIENT`, hộp thoại ở lại
  (§8).
- [ ] **Step 4:** As-built cuối, dòng trỏ trong `CLAUDE.md`. Commit `docs(deliveries): as-built of launch prep round b`.
