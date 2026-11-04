# Chuẩn bị launch, đợt B: thanh toán VietQR qua payOS, quảng cáo — Design (04/11/2026)

> **Trạng thái 04/11/2026:** các câu ở §9.1 đã chốt (chủ dự án: "theo rec của bạn", tức theo đề xuất của Claude). **Đã sửa theo review độc lập 04/11/2026**
> ([`../reviews/2026-11-04-chuan-bi-launch-b-design-review.md`](../reviews/2026-11-04-chuan-bi-launch-b-design-review.md); chủ dự án: "sửa theo review"); **chờ chủ dự án đọc lại.**
> Hai câu mới còn mở cho chủ dự án ở §9.2. Mỗi finding đổi gì: mục cuối "Thay đổi sau review".
> Chưa có code, chưa có plan. Decision record: [`../decisions/2026-11-04-chuan-bi-launch-b-decisions.md`](../decisions/2026-11-04-chuan-bi-launch-b-decisions.md)
> (DB28–DB42 và các vòng mới của DB13, DB16, DB17, DB21 là phần sửa theo review).
> **Nguồn quyết định:** chủ dự án chốt trong chat 02–04/11/2026, tổng hợp ở `docs/preparation/WEB_LAUNCH_DECISIONS_AND_OPEN_ITEMS_2026-11-04.md`
> (nhánh local `docs/web-launch-research`). Mã quyết định (P1, Q7…) dẫn theo file đó.
> **Code đọc trên:** `origin/dev` @ `a6b2bd15`. Mọi `path:line` và tài liệu ngoài (payOS, AdSense, Next.js, OpenNext, đọc 04/11/2026) ở hai file code facts:
> [`../../preparation/LAUNCH_PREP_CODE_FACTS_2026-11-04-billing.md`](../../preparation/LAUNCH_PREP_CODE_FACTS_2026-11-04-billing.md) và
> [`../../preparation/LAUNCH_PREP_CODE_FACTS_2026-11-04-ads.md`](../../preparation/LAUNCH_PREP_CODE_FACTS_2026-11-04-ads.md). Các `path:line` thêm khi sửa theo review
> đã mở lại code trên cùng commit; mã nguồn SDK `payOSHQ/payos-lib-node` (nhánh `main`, `webhook.ts` sửa lần cuối 2025-08-27) và FAQ payOS đọc ngày 04/11/2026.
> Hai chỗ trong code facts đã cũ: phần "quyết định của chủ dự án" ở đầu file ads (Hôm nay, màn tổng kết, TFAT, hỏi đồng ý) đã thay bởi Q-B10–Q-B12 và DB13 vòng 2;
> code facts billing §10.2 ghi `webhooks.verify` "đồng bộ", thật ra là `async` (§3.3).
> **Đợt A** (Turnstile, header, sửa sau review, lượt AI cho Free, tắt trial): [`2026-11-04-chuan-bi-launch-a-design.md`](2026-11-04-chuan-bi-launch-a-design.md). Hai đợt nối nhau ở §3.13.

Ví dụ xuyên suốt: **Lan**, học viên gói Free, giờ Việt Nam.

## 1. Mục tiêu và phạm vi

| Phần | Việc | Chạm |
|---|---|---|
| B1 | Bán gói Pro bằng chuyển khoản VietQR, xác nhận qua webhook của payOS; nút "Đã nhận tiền" của admin làm dự phòng | API Entitlements (billing), DB, web, admin, email |
| B2 | Luật "ai thấy quảng cáo" (`ads.show`) và hộp thoại tự làm giới thiệu Pro khi chuyển trang (house ad) | API Entitlements, Identity (một hàm tuổi), web |
| B3 | Quảng cáo vignette của Google AdSense cho người Free ở Nhóm và Tra từ | web (CSP, script), cấu hình AdSense, Chính sách bảo mật |

**Không làm:** nhà cung cấp tự gia hạn (MoMo) và việc chuyển người dùng sang nó (P6, P10: để sau, nhưng adapter phải chừa chỗ, §3.3); trang công khai mới
(Q7: không làm); quảng cáo video, banner, quảng cáo Google trong hộp thoại tự làm (Q4, Q6); hồ sơ chuyển dữ liệu ra nước ngoài và thông báo NĐ 248 (L8, L9);
API hoàn tiền (payOS không có).

## 2. Quyết định đã chốt (tóm tắt)

| Mã | Quyết định |
|---|---|
| P1 | Tạm bán bằng VietQR, trả tay từng kỳ; chấp nhận các đánh đổi. **Mở lại D35** của Bước 5 (chỉ nhận gói tự gia hạn) cho kiểu trả này |
| P2, P5 | Ba kỳ: 1 tháng 79.000 ₫, 3 tháng 199.000 ₫, 12 tháng 599.000 ₫ |
| P3 | Không trial (phần code ở đợt A §6.6) |
| P4 | Xác nhận chuyển khoản bằng webhook của payOS; nút "Đã nhận tiền" trong admin làm dự phòng |
| P6, P7 | Khi có cổng tự gia hạn: người dùng tự chọn chuyển; có MoMo thì thôi bán VietQR |
| P8 | Một adapter chung cho mọi nhà cung cấp |
| P9 | Email "sắp hết hạn, hãy trả kỳ mới" cho gói trả trước |
| P11 | Trả khi gói còn hạn: kỳ mới **nối tiếp từ ngày hết hạn**; chuyển khoản hai lần thì kỳ thứ hai cũng xếp nối tiếp |
| L6 | Không hoàn tiền; ghi rõ trước khi trả tiền |
| A4 | Không dùng Claude Sonnet cho câu AI của Pro |
| Q1–Q2, Q7–Q8 | Có quảng cáo, chấp nhận rủi ro; khách chỉ thấy landing; vignette ở Nhóm, Tra từ trong app (DB13 vòng 2, phạm vi trang ở DB38), không hiện lúc đang làm câu. **Thay D21 của Bước 5** phần chỗ đặt ("chỉ ở chỗ nghỉ") và phần "bật sau khi có bước hỏi đồng ý" |
| Q3, Q4 | Trong lúc chờ Google duyệt: hộp thoại tự làm giới thiệu Pro; không bao giờ đặt quảng cáo Google vào hộp thoại tự làm |
| Q5, Q6 | CSP `nonce` chỉ cho `/app`; không video, tần suất thấp. (Phần "cờ tuổi cho người dưới 16" và "hỏi đồng ý trước khi cá nhân hóa" đã thay bởi Q-B11, Q-B12) |

## 3. B1 — Thanh toán VietQR qua payOS

### 3.1 Luồng mua

```
Lan ở /app/plans, chọn "3 tháng — 199.000 ₫", đọc dòng "Không hoàn tiền. Gói không tự gia hạn."
   │ bấm [Mua] ── POST /v1/me/orders { period_months: 3, expected_amount: 199000 }  (Idempotency-Key)
   ▼
API (1) commit đơn `pending`: số tiền từ setting giá, order_code, expires_at = now + 15 phút
    (2) gọi payOS tạo link, NGOÀI transaction, SDK timeout 4 s
    (3) ghi payment_link_id, checkout_url  ── trả 201 { order_id, checkout_url }
        payOS lỗi hoặc quá giờ → đơn `failed`, trả 503 provider-unavailable (§3.6)
   ▼
Web chuyển cả trang sang checkout_url của payOS (không nhúng, nên CSP web không đổi)
   │ Lan quét QR, chuyển khoản trong app ngân hàng
   ▼
payOS ──► POST /v1/billing/webhooks/payos (chữ ký nằm trong body) ──► inbox ──► OrderApplier (§3.4):
   đơn `paid` → kỳ trả trước → giao dịch `purchase` → email biên nhận
   │
payOS chuyển Lan về /app/plans/order?order=<order_id>
   web gọi POST /v1/me/orders/:id/check một lần (API tự hỏi payOS), rồi hỏi GET /v1/me/orders/:id mỗi 3 giây
   ▼
"Bạn đã có Pro tới hết 05/02/2027"
```

Webhook không tới thì có ba lưới: trang về nhờ API hỏi payOS ngay; job đối soát hằng giờ hỏi payOS các đơn còn chờ (§3.6); nút "Đã nhận tiền" của admin (§3.9).
Cả ba đi qua **cùng một danh tính cho mỗi lần trả** (§3.4), nên một lần chuyển khoản không bao giờ thành hai kỳ.

### 3.2 Dữ liệu

Code hiện chỉ biết gói tự gia hạn của một nhà cung cấp: không có bảng đơn, không có loại sự kiện "trả một lần", kỳ chỉ có `month | year`,
và kỳ chưa bắt đầu không hiện cho người học (code facts §0). Thêm ba bảng ở module Entitlements, và một bảng cho bản giả.

**`billing_orders`** — một lần Lan bấm Mua.

| Cột | Ý nghĩa |
|---|---|
| `id` uuid | |
| `user_id` uuid | Người mua. Ẩn danh khi xóa tài khoản (`anonymise`, như `billing_transactions`) |
| `provider` | `payos` (sau này `momo`…) |
| `environment` | `production` với payOS thật; `sandbox` với bản giả, để dữ liệu local không trông như tiền thật. CHECK |
| `order_code` bigint | Mã đơn gửi payOS, từ sequence `billing_order_code_seq START 1000000000`; CHECK `BETWEEN 1000000000 AND 34359738367`; unique `(provider, order_code)` (§3.5) |
| `description` | `WM` + 7 ký tự base32 của `order_code` (§3.5); để admin tìm theo nội dung chuyển khoản |
| `period_months` | CHECK `IN (1, 3, 12)` |
| `amount_minor`, `currency` | Số tiền chốt lúc tạo đơn (`VND`, 0 số lẻ: 199000) |
| `status` | `pending`, `paid`, `expired`, `cancelled`, `failed`, `needs_review`, `closed` (CHECK) |
| `review_reason` | null hoặc `amount-short`, `amount-over`, `late-payment`, `account-deleted`, `extra-payment`, `reconcile-mismatch`, `provider-mismatch` (CHECK). Bắt buộc khi `needs_review`; trên đơn `paid` là **cờ** cần admin xem, không lùi trạng thái |
| `paid_via` | `webhook`, `reconcile`, `manual`; null tới khi có kỳ đầu |
| `payment_link_id`, `checkout_url`, `expires_at` | Từ payOS (`expires_at` đặt trước khi gọi payOS) |
| `checked_at` | Lần cuối API hỏi payOS về đơn này (job và trang về) |
| `refund_payer_name`, `refund_payer_account`, `refund_payer_bank`, `refund_saved_at` | Chỉ có khi tiền tới sau khi xóa tài khoản (§3.11); xóa khi admin xử lý xong hoặc sau 90 ngày |
| `resolved_at`, `resolved_by`, `resolution_note` | Admin bấm "Đã xử lý" (§3.9) |
| `created_at`, `updated_at` | |

**`billing_order_payments`** — một lần tiền tới (hoặc một lần admin xác nhận) được tính cho một đơn. Đây là chỗ giữ **danh tính** của lần trả (§3.4).

| Cột | Ý nghĩa |
|---|---|
| `id` uuid, `order_id` uuid | |
| `payment_key` unique | `payos:<environment>:<orderCode>:<reference>` (webhook và đối soát) hoặc `manual:<order_id>` (admin) |
| `source` | `webhook`, `reconcile`, `manual` |
| `reference` | Mã giao dịch payOS; với admin là mã tham chiếu ngân hàng admin gõ |
| `amount_minor` | Số tiền của lần này |
| `provider_time` text | `transactionDateTime` của payOS, giữ nguyên chuỗi (không có múi giờ); null với admin |
| `outcome` | `opened-period`, `attached`, `counted`, `flagged`, `refund-needed` (CHECK) |
| `period_id` uuid null | Kỳ mà lần trả này mở (FK `ON DELETE SET NULL`, vì kỳ bị xóa khi xóa tài khoản còn hồ sơ tiền thì giữ) |
| `confirmed_by` uuid null, `reason` | Admin bấm "Đã nhận tiền" và lý do |
| `received_at` | |

**`prepaid_periods`** — một kỳ Pro đã trả, có thể bắt đầu ở tương lai.

| Cột | Ý nghĩa |
|---|---|
| `id` uuid, `user_id` uuid, `order_id` uuid, `payment_id` uuid | |
| `starts_at`, `ends_at` | Chốt một lần lúc mở kỳ, theo §3.7 |
| `revoked_at`, `revoked_by`, `revoke_reason` | Admin thu hồi (vd ghi nhận nhầm người) |
| `created_at` | |

**`fake_payos_links`** (chỉ bản giả) — "sự thật" của payOS giả để `getCheckout` trả lời được cả ở worker: `order_code` PK, `payment_link_id`, `amount`, `status`,
`expires_at`, `transactions` jsonb. Không có cột trỏ tới người dùng.

`ACCOUNT_DATA_MAP` (test bắt mọi cột `user_id`, `*_user_id`, `*_by`, `account-data-map.ts:7-8`): `billing_orders.user_id` `anonymise`, `billing_orders.resolved_by`
`keep-id`, `billing_order_payments.confirmed_by` `keep-id`, `prepaid_periods.user_id` `erase`, `prepaid_periods.revoked_by` `keep-id`.

Vì sao không dùng bảng sẵn có:
- **Grant của staff:** CHECK bắt người cấp là `admin`/`editor`; grant bắt đầu ngay thu hồi grant đang chạy; lịch sử giao dịch trộn grant với
  `billing_transactions` nên một lần trả thành hai dòng.
- **`subscriptions`:** phải giả vờ "đã hủy gia hạn" (`cancel_at_period_end = true`) để không bị coi là tự gia hạn và không chặn xóa tài khoản; mỗi
  kỳ nối tiếp phải là một "subscription" riêng; `interval` chỉ `month | year`.
- Bảng riêng nói đúng điều nó là: kỳ đã trả, không tự gia hạn.

Phải sửa theo:
- `resolve()`: nguồn Pro mới `prepaid` (hiệu lực khi `starts_at ≤ now < ends_at` và chưa thu hồi), mốc chu kỳ AI = `starts_at` của kỳ đang chạy (mốc muộn nhất thắng, như grant).
- `SourcesRepository.load` và `loadMany` (dashboard AI), `proCandidates` (`sources.repository.ts:38-46,49-65,72-80`); phần "nguồn đã hết trong tháng" theo cơ chế của đợt A (§3.13).
- Snapshot `GET /v1/me/entitlements` (DB42): `sources[]` thêm `kind: 'prepaid'`, chỉ kỳ **đang chạy**; trường mới `upcoming_periods: [{ id, starts_at, ends_at }]` cho kỳ
  chưa bắt đầu; trường mới `pro_until` = điểm hết của khoảng Pro liền mạch tính từ bây giờ (§3.7), null khi không Pro. Để kỳ tương lai ngoài `sources[]` giữ đúng
  các chỗ web lấy nguồn đầu tiên: `PlansPage.tsx:42`, `TransactionsPage.tsx:81-82`; `DeleteAccountPage.tsx:35` và `SubscriptionRows` (`PlansPage.tsx:113`) chỉ đọc
  `kind: 'subscription'` nên không đổi hành vi.
- Kiểu web `Entitlements` (`app-shell/queries.ts:11-27`): `sources[].kind` thêm `'prepaid'`, thêm `upcoming_periods`, `pro_until`, `ads`.

**`billing_transactions`:** thêm `quarter` vào CHECK `interval` (kỳ 3 tháng); kiểu TypeScript riêng `TransactionInterval = 'month' | 'quarter' | 'year'` cho giao
dịch, **không** sửa type `Interval` dùng chung với subscription (`entitlements.types.ts:18`); kiểu web và chữ `intervals.quarter` ("3 tháng"). Mỗi lần trả mở kỳ ghi một
dòng `purchase`: `provider_transaction_id` = `<orderCode>:<reference>` (payOS) hoặc `manual:<order_id>` (admin), nên hai đơn có trùng `reference` cũng không bị
`skipDuplicates` nuốt (`transactions.repository.ts:99-101`). Lần trả không mở kỳ không có dòng giao dịch; đơn và `billing_order_payments` là hồ sơ tiền của nó.

**Giữ hồ sơ:** job `billing.transactions-expire` (cắt theo `transactionRetentionYears`, `transactions-expire.job.ts`) cắt thêm `billing_orders` (kèm payments, periods) đã
ở trạng thái cuối và có `created_at` trước mốc cắt.

### 3.3 Adapter: mở rộng port có sẵn (DB34)

Giữ tên **`BillingAdapter`** và registry có sẵn (`billing-adapter.ts:34-41`, `billing-adapter.registry.ts`); không tạo port thứ hai. Thêm ba method tùy chọn, như
`fetchState` hiện nay:

```ts
abstract class BillingAdapter {
  abstract readonly provider: string;
  abstract verify(req: BillingRequest): Promise<{ ok: true; events: ParsedEvent[]; skipped: number } | { ok: false }>;
  abstract ack(result: { received: number }): { status: number; body?: unknown };
  // Gói tự gia hạn (giữ nguyên):
  fetchState?(externalSubscriptionId: string): Promise<FetchedState | null>;
  endTrialNow?(externalSubscriptionId: string): Promise<void>;
  cancelAtPeriodEnd?(externalSubscriptionId: string): Promise<void>;
  // Trả một lần (payOS). MoMo sau này dùng createCheckout để mở liên kết trừ tiền lần đầu, verify cho các lần trừ.
  createCheckout?(order: CheckoutOrder): Promise<{ paymentLinkId: string; checkoutUrl: string }>;
  getCheckout?(orderCode: number): Promise<CheckoutState | null>;   // null = payOS không có link này
  cancelCheckout?(orderCode: number): Promise<void>;
}
type CheckoutOrder = { orderCode: number; amount: number; description: string; returnUrl: string; cancelUrl: string; expiresAt: Date };
type CheckoutState = {
  status: 'PENDING' | 'CANCELLED' | 'UNDERPAID' | 'PAID' | 'EXPIRED' | 'PROCESSING' | 'FAILED';
  amount: number; amountPaid: number;
  transactions: Array<{ reference: string; amount: number; transactionDateTime: string; payer: Payer | null }>;
};
```

`CheckoutState` theo type `PaymentLink`, `Transaction` của SDK (`payment-requests.ts`). Mọi lời gọi đi qua `callAdapter` (5 s, `adapter-call.ts:7-19`), không bao giờ
khi đang giữ khóa (R6).

- **Sự kiện `payment_succeeded`** nằm **ngoài** `EVENT_TYPES` (13 loại của gói tự gia hạn giữ nguyên, test `subscription-machine.spec.ts:300-303` vẫn đúng, ma trận 91 ô
  không đổi, parser giả không nhận loại mới vì `isEventType` đọc `EVENT_TYPES`, `fake-wire.ts:132`): một hằng riêng `ORDER_EVENT_TYPES = ['payment_succeeded']`, kind
  `additive`. Ghi chú "D35: no `payment_succeeded`" của `billing.types.ts:3` sửa thành "gói tự gia hạn không có `payment_succeeded`; trả một lần ở `ORDER_EVENT_TYPES`".
  `ParsedEvent.type` thành `EventType | OrderEventType`; `ParsedEvent.externalSubscriptionId` thành `string | null` (cột đã cho null).
- **Adapter không tra DB.** `verify` của payOS chỉ kiểm chữ ký và trả sự kiện: `externalEventId = <orderCode>:<reference>`, `appUserId = null`,
  `externalSubscriptionId = null`, `occurredAt` = lúc nhận, `transactionId = <orderCode>:<reference>`, payload chuẩn hóa ở §3.12. `OrderApplier` tìm đơn và học viên
  dưới khóa, lúc apply (dữ liệu luôn mới, kể cả khi apply bị thử lại sau).
- **Applier rẽ nhánh:** sau kiểm sandbox (R17), sự kiện `payment_succeeded` đi vào `OrderApplier` **trước** nhánh `unknown-user` (`event-applier.service.ts:102-108`),
  vì sự kiện payOS luôn có `appUserId = null` và nhánh đó sẽ bỏ qua nó. `OrderApplier` không đụng máy trạng thái subscription.
- **Dùng lại** inbox (`billing_events`, dedupe theo `payos:<environment>:<orderCode>:<reference>`), route webhook, job thử lại, xóa `raw_payload` sau 90 ngày, giới hạn 5 s.
- **Thư viện:** SDK chính thức `@payos/node` 2.0.5 (Node ≥ 20) cho `createCheckout`, `getCheckout`, `cancelCheckout` và lệnh đăng ký webhook. Đặt `timeout: 4_000`
  (SDK hủy lời gọi thật bằng `AbortSignal.timeout`, còn `callAdapter` chỉ `Promise.race`), `maxRetries: 0`, `logLevel: 'off'`.
- **Chữ ký webhook: tự viết, không dùng `webhooks.verify` của SDK** (DB40). SDK khai `async verify` và so chữ ký bằng `!==`
  (`payos-lib-node/src/resources/webhooks/webhook.ts:51,64`, đọc 04/11/2026). Bản tự viết theo tài liệu payOS: chỉ ký object `data`, sắp key theo alphabet, `null`/`undefined`
  thành chuỗi rỗng, mảng `JSON.stringify` sau khi sắp key từng phần tử, HMAC-SHA256 hex bằng Checksum Key, so bằng `timingSafeEqual` trên hai buffer cùng độ dài.
  Test đối chiếu với `webhooks.verify` của SDK trên cùng body (đúng, sai một ký tự, key xáo thứ tự, giá trị null) để bản tự viết không lệch thuật toán thật.
- **Đăng ký webhook:** lệnh `pnpm payos:confirm-webhook <url>` (SDK `webhooks.confirm`), chạy sau mỗi lần deploy đổi domain (ghi vào `deploy-checklist.md`, §6 M2).
- **Nhà cung cấp giả** (payOS không có sandbox, nên bắt buộc cho test và smoke): `PAYOS_FAKE_ENABLED`, theo mẫu provider giả hiện có, đăng ký cùng tên `payos` với
  `environment = 'sandbox'`. `createCheckout` ghi `fake_payos_links` và trả trang giả `/v1/dev/payos/checkout?order=…` (như trang Google giả `/v1/dev/google/authorize`)
  có các nút "Đã trả", "Trả thiếu", "Hủy": mỗi nút ghi `fake_payos_links` rồi phát webhook ký bằng khóa giả (trừ "Hủy"). `getCheckout` đọc bảng đó. `BILLING_PRODUCTION=true`
  cùng fake thì API từ chối khởi động.
- **Env:** `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` (bắt buộc cùng nhau khi bật payOS thật, thiếu một cái thì không khởi động), `PAYOS_FAKE_ENABLED`.
- **Log:** logger che mọi key có chữ `code` (`app-logger.ts:16`), nên log dùng `order_ref` thay vì `order_code`. Không bao giờ log trường người chuyển (§3.12).

### 3.4 Một lần trả có một danh tính; luật của `OrderApplier` (DB28)

**Danh tính** của một lần trả là `payment_key` (unique ở `billing_order_payments`):
- tiền đi qua payOS, tới bằng webhook **hoặc** job đối soát: `payos:<environment>:<orderCode>:<reference>`. Đây cũng là `dedupe_key` của inbox, nên webhook và đối soát
  của cùng một lần chuyển chỉ thành một hàng inbox; `orderCode` nằm trong khóa nên hai đơn có trùng `reference` vẫn là hai lần trả;
- admin bấm "Đã nhận tiền": `manual:<order_id>`, mỗi đơn tối đa một lần. Lệnh admin gọi thẳng `OrderApplier` (không qua inbox) để trả kết quả ngay.

**Kiểm trước** (chỉ tiền qua payOS): `success === true`, `data.code === '00'`, đủ `orderCode`, `reference`, `amount`, `paymentLinkId`; có đơn theo
(`provider`, `order_code`); `data.paymentLinkId` trùng `billing_orders.payment_link_id`. Sai một điều → sự kiện `ignored` (lý do `not-success`, `missing-fields`,
`unknown-order`, `link-mismatch`), vẫn trả 2xx, không ghi gì vào đơn. Webhook thử của payOS lúc đăng ký (`orderCode: 123`) rơi vào `unknown-order` vì mã đơn thật từ 10^9.

**Thứ tự khóa:** claim hàng inbox (nếu có) → đọc đơn không khóa để biết `user_id` → `lockUser(user_id)` → `SELECT … FOR UPDATE` hàng đơn → đọc lại `user_id` (đổi nghĩa là
đơn vừa bị ẩn danh: làm theo T1) và trạng thái tài khoản trong cùng transaction (`IdentityService.accountStatus` nhận thêm tham số `db` như `getProfile`,
`identity.service.ts:81,97`) → quyết theo bảng dưới. Tiền qua payOS: ghi `billing_order_payments` trước khi quyết (`payment_key` đã có → không làm gì, "đã nhận"). Admin xác
nhận: kiểm T12–T14 trước, rồi mới ghi. Cùng thứ tự với applier hiện có (`billing_events` → `lockUser` → hàng của nhà cung cấp), nên apply, admin xác nhận, job và xóa tài khoản
chạy nối tiếp.

Ký hiệu: đơn O có số tiền A; S = tổng các lần trả qua payOS đã tính cho O, kể cả lần này (so **tổng**, không so từng lần, DB16 vòng 2). "Đúng hạn": O đang `pending`,
hoặc `needs_review` vì `amount-short`, hoặc `provider_time` của lần trả (đọc theo giờ Việt Nam, ASSUMPTION P9; đọc không được thì dùng lúc nhận) ≤ `expires_at` + 10 phút.

| # | Đơn O | Lần trả tới | Kết quả |
|---|---|---|---|
| T1 | Học viên đã xóa (đơn ẩn danh) hoặc đang `deleting` | qua payOS | Không mở kỳ. O chưa có kỳ → `needs_review` `account-deleted`; O đã có kỳ → cờ `account-deleted`. Lưu thông tin hoàn tiền lên O (§3.11). Lần trả `refund-needed` |
| T2 | Chưa có kỳ (`pending`, `needs_review`, `failed`, `expired`, `cancelled`) | qua payOS, S = A, đúng hạn | `paid`, `paid_via` = `webhook` hoặc `reconcile`; mở 1 kỳ; dòng `purchase`; biên nhận. Lần trả `opened-period` |
| T3 | Chưa có kỳ | qua payOS, S = A, muộn | `needs_review` `late-payment`. Lần trả `counted` |
| T4 | Chưa có kỳ | qua payOS, S < A | `needs_review` `amount-short`; lần trả sau đưa S tới A thì thành T2. Lần trả `counted` |
| T5 | Chưa có kỳ | qua payOS, S > A | `needs_review` `amount-over`. Lần trả `counted` |
| T6 | `closed` | qua payOS | `needs_review` `extra-payment` (đơn chưa có kỳ nên được lùi về chờ xem). Lần trả `counted` |
| T7 | `paid` do admin xác nhận, chưa có lần trả qua payOS nào | qua payOS, số tiền = A | Gắn vào lần xác nhận của admin; **không** mở kỳ. Lần trả `attached` |
| T8 | `paid`, không thuộc T7 | từ **webhook**, số tiền = A | Kỳ mới **nối tiếp** (P11, DB8); dòng `purchase`; biên nhận. Lần trả `opened-period` |
| T9 | `paid` | qua payOS, số tiền ≠ A (kể cả trường hợp T7 mà khác A) | Không mở kỳ; cờ `extra-payment`. Lần trả `flagged` |
| T10 | `paid` | từ **job đối soát**, khóa chưa thấy | Không mở kỳ; cờ `reconcile-mismatch` (job chỉ chọn đơn chưa có kỳ, nên chỉ tới đây khi ASSUMPTION P7 sai). Lần trả `flagged` |
| T11 | Chưa có kỳ, không `closed`; học viên còn, không `deleting` | admin "Đã nhận tiền" | `paid`, `paid_via = manual`; mở 1 kỳ; dòng `purchase` (`manual:<order_id>`); biên nhận. Lần trả `opened-period` |
| T12 | Đã có kỳ | admin "Đã nhận tiền" | 409 `order-already-paid`; không ghi gì |
| T13 | `closed` | admin "Đã nhận tiền" | 409 `order-closed` |
| T14 | Học viên đã xóa / đang `deleting` | admin "Đã nhận tiền" | 409 `account-deleted` / `account-deleting` (như grant, `grants.service.ts:136`) |

- `needs_review` **chỉ** dành cho đơn chưa có kỳ. Bất thường trên đơn đã có kỳ là cờ `review_reason`; trạng thái giữ `paid`.
- Đường "một lần trả thành hai kỳ" của review (admin xác nhận lúc 14:20, webhook tới 15:05, admin bấm lần nữa lúc 15:10) bị chặn hai lần: webhook rơi vào T7 (gắn, không kỳ,
  không `needs_review`), lần bấm thứ hai rơi vào T12.
- Một lần chuyển thật thứ hai vào đơn đã trả (cùng số tiền, `reference` mới, tới bằng webhook) vẫn thành kỳ nối tiếp như DB8 (T8). `ASSUMPTION` P8: payOS báo lần đó bằng
  webhook riêng.

### 3.5 Giá, mã đơn, nội dung chuyển khoản

- Bảng giá phía server, gửi web qua `GET /v1/me/app-config` (`plans.pro.prices: { '1': 79000, '3': 199000, '12': 599000 }`). Đơn chốt số tiền lúc tạo; đổi giá không ảnh
  hưởng đơn đang chờ.
- **Giá sửa trong admin** (Q-B8): ba setting mới nhóm `entitlements`: `pro_price_1m_vnd` (79.000), `pro_price_3m_vnd` (199.000), `pro_price_12m_vnd`
  (599.000), bound `1.000–10.000.000`, có trong lịch sử setting như các key khác.
- **Giá Lan thấy là giá Lan trả:** `POST /v1/me/orders` mang `expected_amount`; khác giá hiện tại → 409 `price-changed`, web tải lại giá và hỏi Lan lại.
- **Landing không hiện giá** (Q-B9): landing dựng sẵn lúc build nên sẽ lệch khi admin đổi giá; giá chỉ hiện ở `/app/plans` và hộp thoại giới thiệu Pro.
- **`order_code`** (DB29): sequence Postgres `billing_order_code_seq START 1000000000`, CHECK tới `34359738367` (= 32^7 − 1, vẫn dưới `Number.MAX_SAFE_INTEGER` mà SDK khai
  `orderCode: number`). Không bao giờ dưới 10^6, nên webhook thử `orderCode: 123` của payOS không trúng đơn thật. Mỗi lần tạo đơn là một mã mới, kể cả lần thử lại sau lỗi.
- **`description`** (tối đa 9 ký tự với tài khoản không liên kết qua payOS, theo trang API): `WM` + `order_code` viết base32 Crockford (chữ hoa và số, bỏ `I L O U`), đệm
  `0` cho đủ 7 ký tự. Ví dụ `order_code` 1000000123 → `WM0XSNJKV`. Duy nhất vì `order_code` duy nhất; không dấu, không khoảng trắng. Ứng dụng tìm đơn theo `orderCode`,
  không đọc nội dung chuyển khoản.
- **`expiredAt`** gửi payOS = `floor(expires_at / 1000)` (giây, Int32 đủ tới 2038), có test ghim. Ngoài ra job tự hủy link quá hạn (§3.6), nên hạn 15 phút không phụ thuộc
  việc payOS hiểu đúng đơn vị (ASSUMPTION P5).
- Không gửi `buyerName`, `buyerEmail`, `buyerPhone`, `buyerAddress`, `buyerCompanyName`, `buyerTaxCode`, `items`, `invoice` (§3.12).

### 3.6 Vòng đời đơn, job đối soát, tạo đơn khi payOS lỗi

| Trạng thái | Vào khi | Ra khi |
|---|---|---|
| `pending` | Commit đơn mới (trước khi gọi payOS) | §3.4 T2–T5; job hoặc trang về thấy payOS báo hết hạn / hủy; payOS lỗi lúc tạo → `failed` |
| `failed` | payOS lỗi hoặc quá giờ lúc tạo link; payOS báo `FAILED` | Tiền vẫn tới: §3.4 (thường là T3) |
| `paid` | §3.4 T2, T11 | Không ra (không hoàn tiền). Cờ `review_reason` có thể bật và được admin xử lý |
| `needs_review` | §3.4 T1, T3–T6 | T2 (khi tổng đủ); admin "Đã nhận tiền" → `paid`; admin "Đã xử lý" → `closed` |
| `expired`, `cancelled` | Job hoặc trang về, chỉ theo câu trả lời của payOS (bảng dưới) | Tiền vẫn tới: §3.4 |
| `closed` | Admin "Đã xử lý" một đơn `needs_review` (vd đã hoàn tiền tay) | Tiền vẫn tới: T6 |

**Tạo đơn** (`POST /v1/me/orders`, `@Idempotent`, rate limit `user.write`; DB33):
1. Kiểm `period_months ∈ {1, 3, 12}` (400) và `expected_amount` (409 `price-changed`).
2. Một transaction ngắn: chèn đơn `pending` với `order_code` mới, `description`, số tiền, `expires_at = now + 15 phút`. Commit.
3. Gọi `createCheckout` ngoài transaction (SDK 4 s, `callAdapter` 5 s), `returnUrl` = `cancelUrl` = `{LEARNER_APP_URL}/{locale}/app/plans/order?order=<order_id>`.
4. Thành công → `UPDATE … SET payment_link_id, checkout_url WHERE id = … AND status = 'pending'` → 201 `{ order_id, checkout_url }`.
5. Lỗi hoặc quá giờ → `UPDATE … SET status = 'failed' WHERE id = … AND status = 'pending'` → 503 `provider-unavailable`. Interceptor nhả `Idempotency-Key` khi handler
   throw (`idempotency.service.ts:72-77`), nên Lan bấm lại là một đơn mới, `order_code` mới; payOS không bao giờ thấy mã trùng ("Đơn thanh toán đã tồn tại").
6. Link có thể đã được tạo ở payOS mà ta không nhận được câu trả lời: job dưới đây hỏi payOS theo `order_code` và hủy link đó.

Một người có nhiều đơn `pending` cùng lúc: cho phép (mỗi lần bấm Mua là một đơn; `Idempotency-Key` chặn bấm đúp).

**Job đối soát** `billing-orders-reconcile` (DB30, DB31; hằng giờ, trong cả API và worker như mọi job của `MaintenanceScheduler`, `maintenance.scheduler.ts:8-14,53-57`):
- Chọn tối đa 100 đơn, cũ trước, bằng `UPDATE billing_orders SET checked_at = now WHERE id IN (SELECT … FOR UPDATE SKIP LOCKED) RETURNING`, nên hai tiến trình không hỏi
  trùng một đơn. Điều kiện: `pending` có link, tạo quá 5 phút, `checked_at` null hoặc quá 10 phút; `pending` chưa có link, tạo quá 2 phút (tiến trình chết giữa bước 2 và 4);
  `failed` chưa có link, tạo trong 24 giờ, chưa kiểm lần nào.
- Gọi `getCheckout(order_code)` **ngoài khóa**, rồi xử lý theo bảng. Mọi lần đổi trạng thái là `UPDATE … WHERE id = … AND status = <trạng thái vừa đọc>` dưới khóa user →
  khóa đơn; 0 hàng nghĩa là webhook hay admin đã đổi trước, bỏ qua. Nên job không bao giờ ghi đè một đơn vừa thành `paid`.

| payOS trả (7 trạng thái của SDK) | Việc |
|---|---|
| `transactions[]` có phần tử (ở bất kỳ trạng thái nào) | Làm trước: mỗi phần tử thành một sự kiện `payment_succeeded` vào inbox với khóa `<orderCode>:<reference>`, nguồn `reconcile`; `OrderApplier` quyết theo §3.4 |
| `PAID`, `UNDERPAID` mà `transactions[]` rỗng | `needs_review` `provider-mismatch`, log `warn` |
| `PENDING`, `PROCESSING`, chưa quá `expires_at` | Không đổi |
| `PENDING` đã quá `expires_at` | Gọi `cancelCheckout`; thành công → `expired` |
| `PROCESSING` đã quá `expires_at` | Không đổi; lần chạy sau hỏi lại |
| `EXPIRED` | `expired` |
| `CANCELLED` | `cancelled` |
| `FAILED` | `failed` |
| Không có link (`null`) | Đơn chưa có link → `failed`; đơn có link → log `warn`, không đổi |
| Đơn chưa có link hoặc `failed` mà payOS có link `PENDING` | `cancelCheckout`; đơn `failed` |
| Lỗi, hết giờ, 429 | Không đổi. Đơn `pending` đã quá `expires_at` + 24 giờ mà vẫn không hỏi được → `expired` |
| Trạng thái lạ ngoài 7 giá trị | Như `PROCESSING`, log `warn` |

- **`cancelled` chỉ khi API tự hỏi payOS**, không tin query `cancel=true&status=CANCELLED` trên `cancelUrl` (không có chữ ký).
- **Trang về hỏi ngay** (`POST /v1/me/orders/:id/check`, rate limit `user.write`): chạy đúng xử lý trên cho một đơn của chính Lan, khi đơn `pending` và `checked_at` quá
  10 giây (nếu chưa thì trả trạng thái hiện có). Nhờ đó Lan không phải chờ job hằng giờ khi webhook trễ, và bấm "Hủy" trên trang payOS thì về thấy ngay "Đơn đã hủy".
- Webhook không tới và Lan đóng trang: job thấy tiền chậm nhất khoảng 1 giờ (một chu kỳ scheduler) sau khi đơn quá 5 phút.

### 3.7 Ngày bắt đầu và kết thúc của kỳ (DB17 vòng 2, DB35)

- **`now`** là giờ `OrderApplier` mở kỳ (trong transaction, sau khóa user). `transactionDateTime` của payOS chỉ để hiển thị và để xét "đúng hạn" (§3.4), không dời ngày bắt đầu.
- **`starts_at`** = điểm hết của khoảng Pro liền mạch tính từ `now`: bắt đầu với t = `now`; lặp lại: nếu có nguồn Pro chưa thu hồi (grant `plan`, **kể cả grant bắt đầu ở tương
  lai**; kỳ trả trước, kể cả kỳ tương lai) với `starts_at ≤ t < ends_at` thì t = `ends_at` lớn nhất của các nguồn đó; dừng khi không còn. Subscription tự gia hạn chưa có nhà
  cung cấp thật nên không xét. Cùng hàm này tính `pro_until` của snapshot.
- **`ends_at`**: cộng `period_months` tháng theo lịch ở múi giờ hồ sơ của học viên lúc mở kỳ (giữ giờ, kẹp ngày cuối tháng như `addMonthsClamped`, `cycle.ts:11-18`), rồi
  **làm tròn lên 00:00 của ngày hôm sau** theo múi giờ đó (đúng 00:00 thì giữ). Hiển thị "tới hết {ngày của `ends_at − 1 ms`}" như web đang làm (`PlansPage.tsx:20`).
  Trang gói, lịch sử, biên nhận và email sắp hết hạn dùng chung quy ước này. Học viên không bao giờ mất Pro trước ngày được ghi; kỳ đầu dư dưới một ngày.
- **Chốt một lần** lúc mở kỳ. Grant bị thu hồi sớm, một kỳ giữa chuỗi bị thu hồi, hay grant mới đè lên kỳ đang chạy đều **không** dời kỳ đã chốt; khoảng trống (nếu có) hiện ở
  màn Đơn hàng (§3.9) để admin cấp bù.

| Lan (giờ Việt Nam) | `starts_at` | `ends_at` | Hiển thị |
|---|---|---|---|
| Free, mua 1 tháng, tiền tới 05/11/2026 10:02 | 05/11 10:02 | 06/12 00:00 | "Pro tới hết 05/12/2026" |
| Pro tới 06/12 00:00 nhờ kỳ trên, mua 12 tháng ngày 20/11 | 06/12/2026 00:00 | 06/12/2027 00:00 | "Kỳ tiếp theo: 06/12/2026 – 05/12/2027" |
| Free, mua 3 tháng, tiền tới 05/11/2026 10:02 | 05/11 10:02 | 06/02/2027 00:00 | "Pro tới hết 05/02/2027" |
| Free, mua 1 tháng, tiền tới 31/01/2027 10:00 | 31/01 10:00 | 01/03 00:00 | "Pro tới hết 28/02/2027" |
| Kỳ trước hết 31/01/2027 00:00, kỳ 1 tháng nối tiếp | 31/01 00:00 | 28/02 00:00 | "31/01/2027 – 27/02/2027" (kẹp ngày; chuỗi kỳ 1 tháng có thể trôi ngày ở cuối tháng) |

### 3.8 Người học (web)

- **`/app/plans`:** thay ô chọn Năm/Tháng bằng ba kỳ 1 / 3 / 12 tháng kèm giá (từ `plans.pro.prices`); bỏ dải "Chưa mở bán" và giá giữ chỗ `XXX.000 ₫`; nút **Mua**.
  Ngay trên nút: "Không hoàn tiền. Gói không tự gia hạn; hết hạn bạn mua kỳ mới." Có link tới Điều khoản. Bấm Mua: gửi `Idempotency-Key`; 201 → `window.location.assign(checkout_url)`;
  409 `price-changed` → tải lại giá, báo "Giá vừa đổi, xem lại trước khi mua"; 503 → "Chưa tạo được đơn. Thử lại sau ít phút."
- Đang Pro: "Pro tới hết {ngày}" lấy từ `pro_until`; các kỳ chưa bắt đầu lấy từ `upcoming_periods` ("Kỳ tiếp theo: 06/12/2026 – 05/12/2027"). Vẫn bấm Mua được (kỳ nối tiếp).
- **`/app/plans/order?order=<order_id>`** (trang về từ payOS, DB32): bỏ qua mọi query payOS gắn thêm (`code`, `id`, `cancel`, `status`, `orderCode`); gọi `check` một lần rồi hỏi
  `GET /v1/me/orders/:id` mỗi 3 giây trong tối đa 2 phút. `paid` → báo thành công kèm ngày, invalidate `['me','entitlements']`; `pending` → "Đang chờ ngân hàng xác nhận. Bạn có thể
  đóng trang này; gói sẽ tự mở khi tiền tới" kèm email hỗ trợ; `needs_review` → "Chúng tôi đang kiểm tra khoản chuyển của bạn" kèm email hỗ trợ; `cancelled`, `expired`,
  `failed` → "Đơn đã hủy hoặc hết hạn" và nút về trang gói.
- **Lịch sử giao dịch:** dòng `purchase` có số tiền, kỳ (thêm chữ "3 tháng"), mã tham chiếu.
- Hàng "Hủy gói" (`SubscriptionRows`) không hiện cho kỳ trả trước (không có gì để hủy).
- **Câu khóa tính năng** (đợt A để lại cho B): "Dành cho gói Pro. Gói Pro chưa mở bán." (`apps/web/messages/vi.json:341` `ui.lockedLine`, `:1017` lỗi `entitlement-required`;
  `en.json` cùng dòng) đổi lúc mở bán thành "Dành cho gói Pro." / "Part of the Pro plan." và "Dành cho gói Pro. Mở Gói học để mua." / "Part of the Pro plan. Open Plans to buy it."
- **Landing:** câu trial đã bỏ ở đợt A; không hiện giá (Q-B9).
- **Điều khoản** mục 5–8 viết lại theo cách bán này; **Chính sách bảo mật** thêm mục payOS (§3.12). Cả hai là việc tài liệu của M2; thời điểm đăng là Q-B16.

### 3.9 Admin

- Màn mới **"Đơn hàng"** trong nhóm tiền, **chỉ admin** (`settings.manage`, Q-B6), như màn Giao dịch. Danh sách lọc theo trạng thái, "Cần xem" (`needs_review` hoặc cờ chưa xử
  lý), email, ngày, mã `WM…`. Chi tiết đơn có: số tiền, `order_code`, `description`, các lần trả (`billing_order_payments`: nguồn, reference, số tiền, `provider_time`, kết quả),
  các kỳ đã mở (ngày bắt đầu, kết thúc, thu hồi), **khoảng Pro hiện có của học viên** (grant, kỳ trả trước, khoảng trống), lý do cần xem, thông tin hoàn tiền nếu có.
- **"Đã nhận tiền"** (`POST /v1/admin/orders/:id/confirm-payment`, `@Idempotent`, bắt buộc mã tham chiếu ngân hàng, số tiền đã nhận, lý do): đi `OrderApplier` (§3.4 T11–T14),
  nên kỳ, giao dịch và email giống hệt khi webhook tới. Bấm hai lần hoặc hai tab: lần sau 409 `order-already-paid` (cùng key thì trả lại kết quả cũ).
- **"Hủy đơn"** cho đơn `pending`: gọi `cancelCheckout` ngoài khóa, thành công thì `UPDATE … WHERE status = 'pending'` → `cancelled`; payOS lỗi → 503, đơn không đổi.
- **"Đã xử lý"** (`POST /v1/admin/orders/:id/resolve`, bắt buộc ghi chú, vd "Đã hoàn 199.000 ₫ qua ngân hàng ngày 06/11"): đơn `needs_review` → `closed`; đơn `paid` có cờ →
  tắt cờ. Ghi `resolved_by`, `resolved_at`; xóa thông tin hoàn tiền của đơn.
- **Thu hồi kỳ** (`POST /v1/admin/prepaid-periods/:id/revoke`, `@Idempotent`, bắt buộc lý do), nút trên chi tiết đơn: ghi `revoked_at = now`, `revoked_by`, `revoke_reason`; kỳ sau
  không dời; dòng giao dịch giữ nguyên (tiền đã nhận thật); không hoàn tiền trong hệ thống.

### 3.10 Email

- **Sắp hết hạn** (P9): kind mới `expiry_notice` cho kỳ trả trước cuối cùng của Lan. Gửi trước **7 ngày**, dùng chung setting `renewal_notice_days_before` (Q-B5).
  `subject_key` = id kỳ, `period_key` = `ends_at`, `window_ends_at` = `ends_at`. Nội dung: ngày hết hạn (quy ước §3.7), link `/app/plans`; không có câu "tự gia hạn và trừ tiền".
- Lúc lập và lúc gửi đều kiểm: khoảng Pro liền mạch còn kéo dài qua `ends_at` (một kỳ nối tiếp **hoặc một grant Pro nối sau**) thì bỏ (`skipped`, lý do `covered`).
- **Biên nhận khi nhận tiền** (Q-B4): kind mới `payment_receipt`, một lần cho mỗi lần trả mở kỳ (kể cả admin xác nhận, kể cả kỳ thứ hai của T8). `subject_key` = id lần trả
  (`billing_order_payments.id`), `period_key` = `starts_at` của kỳ, `due_at` = lúc mở kỳ, `window_ends_at` = lúc mở kỳ + 7 ngày. Nội dung: kỳ, số tiền, mã `WM…`, mã tham chiếu,
  ngày bắt đầu và kết thúc, câu "không hoàn tiền". Dùng trần 95% ngân sách mail như email thanh toán khác.
- Phải sửa đủ: kiểu `NoticeKind`, CHECK của bảng, bản chữ (`COPY` là `Record<NoticeKind, …>` nên TypeScript bắt), chọn ngày (`entitlement-mail.ts:59`), planner, nhánh kiểm của
  `NoticeSender.claim` đang coi mọi kind khác `renewal_notice` là email trial (`notice-sender.service.ts:78`), và `deliver` đang chỉ đưa một ngày lấy từ `period_key`
  (`notice-sender.service.ts:102`): với hai kind mới, `deliver` tải kỳ hoặc lần trả, đơn theo `subject_key`.
- Câu hủy ở "App Store, Google Play hoặc trang thanh toán" đang gắn vào **mọi** email (`entitlement-mail.ts:15-18,61`): bỏ ở cả `expiry_notice` lẫn `payment_receipt`.

### 3.11 Xóa tài khoản (DB21 vòng 2)

- Kỳ trả trước **không** chặn tự xóa tài khoản (không tự gia hạn; `renewing()` chỉ xét subscription, `account-deletion.provider.ts:43-54`). Màn xóa nhắc "thời gian Pro còn
  lại sẽ mất, không hoàn tiền".
- Bộ xóa của Entitlements (chạy trong Tx B, `account-deletion.service.ts:127-137`): xóa `prepaid_periods` (payments giữ, `period_id` thành null); ẩn danh `billing_orders.user_id`
  như `billing_transactions`; **không gọi payOS** (bỏ `cancelCheckout` của bản trước: không được gọi nhà cung cấp trong transaction, và người học tự xóa không có bước nào chạy
  trước Tx B). Link sống 15 phút; job đối soát đánh `expired` hoặc hủy link như mọi đơn.
- **Tiền tới sau khi Lan đã xóa** (Q-B7): `OrderApplier` tìm đơn theo `orderCode` + `paymentLinkId`, thấy đơn ẩn danh → §3.4 T1 (`needs_review` `account-deleted`), không đi
  nhánh `unknown-user` vốn xóa sạch payload (`event-applier.service.ts:102-108`). Trên đơn lưu `refund_payer_name`, `refund_payer_account`, `refund_payer_bank`, `refund_saved_at`;
  số tiền và `reference` nằm ở lần trả. Ba trường người chuyển bị xóa khi admin bấm "Đã xử lý", hoặc 90 ngày sau `refund_saved_at` (job xóa raw payload hằng giờ làm luôn việc
  này). Admin hoàn tiền tay ngoài hệ thống (ngoại lệ duy nhất của "không hoàn tiền").
- Trường người chuyển rỗng (payload mẫu của payOS để trống, ASSUMPTION P10): admin tra lần trả theo `reference` trong trang quản lý của payOS hoặc hỏi ngân hàng; không tìm được
  người nhận thì tiền nằm lại, là rủi ro đã biết (§10).
- Tiền tới giữa Tx A và Tx B (tài khoản `deleting`): `OrderApplier` đọc trạng thái trong transaction sau khóa user, thấy `deleting` → cũng T1.

### 3.12 Dữ liệu người chuyển và riêng tư (DB41)

- **Payload chuẩn hóa** của sự kiện payOS (`billing_events.payload`): `orderCode`, `paymentLinkId`, `amount`, `reference`, `transactionDateTime`, `source`, `success`, `code`,
  và `payer` (`counterAccountName`, `counterAccountNumber`, `counterAccountBankName`) **chỉ tới lúc apply**: `OrderApplier` xóa `payer` khỏi payload trong cùng transaction với mọi
  kết quả, và chỉ chép nó sang đơn ở T1. Sự kiện kẹt ở `failed` thì job xóa raw payload (90 ngày) xóa luôn `payer`.
- **`raw_payload`:** adapter bỏ `counterAccount*` và `virtualAccount*` khỏi body trước khi trả `raw`; phần còn lại giữ 90 ngày như hiện nay (R23).
- **Không gửi cho payOS** trường `buyer*`, `items`, `invoice` (§3.5). Trang thanh toán là của payOS.
- **Không log** trường người chuyển: logger chỉ che theo tên key (`app-logger.ts:16`), `counter_account_number` không khớp mẫu đó. Có test log.
- **Chính sách bảo mật** thêm mục payOS ở M2, trước khi bán: payOS là bên xử lý thanh toán; dữ liệu là số tiền, mã đơn, mã giao dịch và thông tin tài khoản người chuyển mà ngân
  hàng gửi kèm; hồ sơ tiền giữ N năm (`transactionRetentionYears`); thông tin người chuyển chỉ giữ khi cần hoàn tiền sau khi xóa tài khoản, tối đa 90 ngày.

### 3.13 Chỗ nối với đợt A (hợp đồng giữa hai design)

- **Đợt A sở hữu** cơ chế cho phần lượt AI biết nguồn Pro cuối cùng của học viên kết thúc lúc nào trong tháng này: loader trả thêm các nguồn đã kết thúc từ đầu tháng địa phương
  hiện tại, mỗi nguồn kèm một thời điểm kết thúc. **Đợt B cắm `prepaid_periods` vào loader đó** (DB36): kỳ chưa thu hồi có `ends_at > now` (cả kỳ tương lai) là nguồn như grant;
  kỳ đã hết từ đầu tháng là nguồn đã kết thúc với thời điểm kết thúc = `ends_at`; kỳ bị thu hồi giữa chừng có thời điểm kết thúc = `revoked_at`; kỳ thu hồi trước khi bắt đầu
  không phải nguồn. Test của B: kỳ cuối của Lan hết 06/12 00:00 → lượt AI dùng từ 01/12 tới 06/12 (lúc còn Pro) không trừ vào lượt Free tháng 12 (luật Q-A7 của A).
- **File hai đợt cùng sửa** (theo review RB-10 và §6 cũ): `apps/api/src/settings/settings.definitions.ts` và test đếm key (B thêm ba key giá), `app-config.view.ts` (`plans`),
  kiểu web `AppConfig` (`app-shell/queries.ts:30-41`), `sources.repository.ts`, `rules/plan-rules.ts` (`resolve`, và việc tắt trial của A M3), `apps/web/messages/{vi,en}.json`.
  Nhánh nào merge sau thì rebase và sửa số đếm.
- **Đợt B sở hữu** câu khóa "Gói Pro chưa mở bán" (§3.8), đổi ở M2.
- **Turnstile** của đợt A ở `/app/(auth)/login`, `register`, `forgot-password` nằm trong vùng CSP `nonce` mà M4 đưa vào; spike và e2e của B kiểm cả các trang đó (§5.4).

### 3.14 `ASSUMPTION` về payOS: kiểm ở lần mua thật đầu tiên (DB40)

Chủ dự án làm sau khi deploy M1–M2, bằng tiền thật số nhỏ. Mỗi dòng có cách kiểm và luật nếu sai; không dòng nào để hệ thống mở hai kỳ cho một lần trả.

| # | Giả định | Kiểm thế nào | Nếu sai |
|---|---|---|---|
| P1 | payOS chỉ gửi webhook khi trả thành công | Để một link hết hạn, hủy một link; xem inbox | Sự kiện có `success` false hoặc `code ≠ '00'` đã `ignored` (§3.4) |
| P2 | payOS gửi lại webhook khi không nhận 2xx (số lần không công bố) | Lúc trả thử, cho route webhook trả 503; xem có tới lại không | Job đối soát và trang về là lưới; ghi vào `deploy-checklist.md` |
| P3 | `confirm-webhook` gửi mẫu đã ký, `orderCode: 123` | Chạy `pnpm payos:confirm-webhook`, xem inbox | `unknown-order`, vẫn 2xx; mẫu khác thì kiểm `paymentLinkId` vẫn chặn |
| P4 | `orderCode` nhận số từ 10^9 tới 34.359.738.367 | Đơn đầu tiên (mã 1.000.000.0xx) tạo được | Đổi khoảng của sequence (một migration) |
| P5 | `expiredAt` tính bằng giây | Trang payOS báo hết hạn sau 15 phút | Job vẫn tự hủy link quá hạn |
| P6 | Trạng thái chỉ là 7 giá trị của SDK | Xem `status` ở các lần thử | Giá trị lạ như `PROCESSING`, log `warn` |
| P7 | `reference` của webhook trùng `transactions[].reference` của `getCheckout` | So hai giá trị của cùng lần trả | T10 đã chặn mở kỳ thứ hai; sửa khóa của đối soát |
| P8 | Chuyển lần hai vào link đã `PAID` sinh webhook riêng | Không thử bằng tiền; theo dõi khi xảy ra | Tiền không tới webhook nằm ở payOS/ngân hàng; admin xử lý tay |
| P9 | `transactionDateTime` là giờ Việt Nam | So với giờ trên app ngân hàng | Chỉ ảnh hưởng hiển thị và xét "đúng hạn" (đệm 10 phút); đổi múi giờ khi đọc |
| P10 | Webhook có `counterAccount*` khác rỗng | Xem payload thật (trước khi bị bỏ khỏi raw) | Hoàn tiền sau khi xóa tài khoản phải hỏi payOS/ngân hàng (§3.11) |
| P11 | Nội dung chuyển khoản giữ `WM…` | Xem sao kê | Không ảnh hưởng: tìm đơn theo `orderCode` |

### 3.15 When → Then (B1)

Acceptance criteria:

| # | Khi | Thì |
|---|---|---|
| LB1A1 | Lan (Free) mua 1 tháng; webhook tới 05/11/2026 10:02 | Đơn `paid` (`webhook`); kỳ 05/11 10:02 → 06/12 00:00; trang gói "Pro tới hết 05/12/2026"; dòng `purchase` 79.000 ₫ "1 tháng"; chu kỳ AI neo 05/11 10:02; email biên nhận |
| LB1A2 | Lan (Pro tới 06/12 00:00 nhờ kỳ trên) mua 12 tháng ngày 20/11 | Kỳ mới 06/12/2026 00:00 → 06/12/2027 00:00; "Kỳ tiếp theo: 06/12/2026 – 05/12/2027"; email sắp hết hạn của kỳ 1 tháng `skipped` (`covered`) |
| LB1A3 | Webhook không tới, Lan về trang `order` | Trang gọi `check`; API hỏi payOS, thấy `transactions[]`; đơn `paid` (`reconcile`) như LB1A1 |
| LB1A4 | Webhook không tới, Lan đóng trang | Job hằng giờ thấy tiền ở lần chạy kế tiếp; đơn `paid` (`reconcile`) |
| LB1A5 | Admin bấm "Đã nhận tiền" trên đơn `pending` (mã FT2611…, 199.000 ₫, lý do) | Đơn `paid` (`manual`); kỳ, dòng `purchase` (`manual:<order_id>`), biên nhận như webhook |
| LB1A6 | Lan bấm "Hủy" trên trang payOS | Về `/app/plans/order?order=…`; `check` hỏi payOS, thấy `CANCELLED`; đơn `cancelled`; trang "Đơn đã hủy hoặc hết hạn" |
| LB1A7 | Kỳ cuối của Lan còn 7 ngày | Email `expiry_notice` với ngày "tới hết" theo §3.7, link `/app/plans`, không câu hủy ở App Store |
| LB1A8 | Kỳ cuối của Lan hết 06/12 00:00 | Lan về Free; lượt AI Free tháng 12 tính từ 06/12 00:00 (§3.13) |
| LB1A9 | Lan xóa tài khoản khi còn một kỳ tương lai | Xóa được; kỳ bị xóa; đơn ẩn danh; dòng giao dịch ẩn danh; không gọi payOS |

Edge cases:

| # | Khi | Thì |
|---|---|---|
| LB1E1 | payOS gửi cùng webhook hai lần | Cùng `dedupe_key`: lần hai là "đã nhận", không tạo kỳ thứ hai |
| LB1E2 | Webhook và job đối soát cùng thấy một lần chuyển | Cùng khóa `payos:production:<orderCode>:<reference>`: một hàng inbox, một kỳ |
| LB1E3 | Admin xác nhận lúc 14:20 (mã FT2611…); webhook cùng lần chuyển (199.000 ₫, reference của payOS) tới 15:05 | T7: gắn vào lần xác nhận, không kỳ mới, không `needs_review` |
| LB1E4 | Như LB1E3 nhưng webhook mang 100.000 ₫ | T9: cờ `extra-payment`; đơn vẫn `paid`; không kỳ mới |
| LB1E5 | Admin bấm "Đã nhận tiền" hai lần, hoặc ở hai tab | Khóa user → khóa đơn xếp hàng; lần sau 409 `order-already-paid` (cùng key thì trả lại kết quả cũ) |
| LB1E6 | Admin bấm "Đã nhận tiền" trên đơn đã `paid` qua webhook | 409 `order-already-paid` |
| LB1E7 | Lan chuyển lần hai đúng 199.000 ₫ vào đơn đã `paid` (reference mới, webhook riêng) | T8: kỳ thứ hai nối tiếp, dòng `purchase` thứ hai, biên nhận thứ hai (DB8; `ASSUMPTION` P8) |
| LB1E8 | Lan chuyển lần hai 50.000 ₫ vào đơn đã `paid` | T9: cờ `extra-payment`, không kỳ |
| LB1E9 | Đơn 199.000 ₫: Lan chuyển 100.000 ₫ rồi 99.000 ₫ | Lần 1: `needs_review` `amount-short`. Lần 2: tổng = 199.000 → `paid`, một kỳ |
| LB1E10 | Lan chuyển 398.000 ₫ một lần cho đơn 199.000 ₫ | `needs_review` `amount-over`; admin "Đã nhận tiền" (một kỳ) và hoàn phần dư tay, hoặc hoàn hết rồi "Đã xử lý" |
| LB1E11 | Đơn đã `expired` (vd payOS không trả lời job suốt 24 giờ), rồi webhook tới với `provider_time` 14:50, link hết hạn 14:52 | `provider_time` ≤ `expires_at` + 10 phút → T2, `paid` |
| LB1E12 | Tiền tới đơn `expired`, `provider_time` sau `expires_at` + 10 phút | T3: `needs_review` `late-payment`, không kỳ |
| LB1E13 | Job đọc đơn `pending`, gọi payOS; trong lúc đó webhook ghi `paid` | Sự kiện của job cùng khóa → "đã nhận"; mọi `UPDATE` của job có `WHERE status = 'pending'` → 0 hàng; đơn giữ `paid` |
| LB1E14 | Khóa của job khác khóa của webhook cho cùng lần chuyển (`ASSUMPTION` P7 sai) | T10: cờ `reconcile-mismatch`, không kỳ thứ hai |
| LB1E15 | payOS vẫn báo `PENDING` sau `expires_at` | Job gọi `cancelCheckout`, rồi `expired`; hủy lỗi thì giữ `pending`, quá 24 giờ thì `expired` |
| LB1E16 | payOS không trả lời khi job chạy | Không đổi gì; lần chạy sau hỏi lại |
| LB1E17 | payOS lỗi hoặc quá 4 s lúc tạo link | Đơn `failed`; 503 `provider-unavailable`; key được nhả; Lan bấm lại → đơn mới, `order_code` mới |
| LB1E18 | payOS đã tạo link nhưng ta không nhận được câu trả lời | Đơn `failed`; job hỏi theo `order_code`, thấy link `PENDING`, gọi `cancelCheckout` |
| LB1E19 | Tiến trình chết giữa lúc commit đơn và lúc ghi link | Đơn `pending` chưa link; quá 2 phút job hỏi payOS: có link thì hủy, rồi `failed` |
| LB1E20 | `pnpm payos:confirm-webhook` gửi mẫu `orderCode: 123` | 2xx; sự kiện `ignored` `unknown-order` |
| LB1E21 | Webhook đã ký mà `paymentLinkId` khác đơn, `success` false hoặc `code ≠ '00'` | 2xx; `ignored` (`link-mismatch` / `not-success`); đơn không đổi |
| LB1E22 | Webhook chữ ký sai | 400, không ghi inbox (như provider hiện có) |
| LB1E23 | Webhook thiếu `reference` | `ignored` `missing-fields`; đơn còn `pending` nên job hoặc trang về tìm lại lần trả qua `transactions[]` |
| LB1E24 | API chết lúc payOS gửi webhook | Nếu payOS gửi lại (P2) thì apply như thường; không thì job đối soát thấy tiền sau khi API lên lại, xét "đúng hạn" theo `provider_time` |
| LB1E25 | API chết sau khi ghi inbox, trước khi apply | Job `billing-events-retry` apply lại sau 5 phút (có sẵn) |
| LB1E26 | Hai đơn của Lan thành `paid` cùng lúc | Khóa user xếp hàng; đơn sau bắt đầu ở `ends_at` của đơn trước |
| LB1E27 | Lan bấm Mua hai lần nhanh | Cùng key: cùng đơn. Khác key: hai đơn `pending`; chỉ đơn được trả mới thành kỳ; trả cả hai thì hai kỳ nối nhau |
| LB1E28 | Admin đổi giá lúc Lan đang xem trang gói | Lan bấm Mua → 409 `price-changed`; trang tải lại giá |
| LB1E29 | Admin đổi giá sau khi đơn đã tạo | Đơn giữ số tiền cũ; link payOS mang số đó |
| LB1E30 | Lan có grant Pro đang chạy tới 30/11 và grant 01/12–31/12 nối liền, mua 1 tháng | Kỳ bắt đầu ở `ends_at` của grant tháng 12 |
| LB1E31 | Lan đang Free, có grant tương lai 10/12–10/01 (có khoảng trống), mua 1 tháng ngày 20/11 | Kỳ 20/11 → 21/12 00:00, trùng một phần với grant; Lan Pro liền từ 20/11 tới 10/01. Giới hạn đã biết: không dời quanh grant tương lai không liền |
| LB1E32 | Staff tạo grant bắt đầu ngay khi kỳ của Lan đang chạy | Grant không thu hồi kỳ; hai nguồn chạy song song; kỳ không dời (giới hạn đã biết); màn Đơn hàng hiện cả hai |
| LB1E33 | Admin thu hồi kỳ giữa chuỗi ba kỳ | Có khoảng trống; kỳ sau không dời; Lan Free trong khoảng trống; admin có thể cấp bù |
| LB1E34 | Admin thu hồi grant sớm khi kỳ đã nối sau grant | Kỳ không dời lên (DB17) |
| LB1E35 | Lan xóa tài khoản khi có đơn `pending` | Đơn ẩn danh; không gọi payOS; job đánh `expired` hoặc hủy link |
| LB1E36 | Tiền tới sau khi Lan đã xóa | T1: `needs_review` `account-deleted`; tên, số tài khoản, ngân hàng người chuyển lưu trên đơn; raw payload không có các trường đó; không mở kỳ, không dòng giao dịch |
| LB1E37 | Như LB1E36 nhưng các trường người chuyển rỗng | Như LB1E36, thông tin hoàn tiền rỗng; admin tra theo `reference` |
| LB1E38 | 90 ngày sau LB1E36 admin chưa xử lý | Job xóa ba trường người chuyển; đơn vẫn `needs_review` |
| LB1E39 | Tiền tới khi tài khoản đang `deleting` | T1, như LB1E36 |
| LB1E40 | Admin bấm "Đã nhận tiền" trên đơn của tài khoản đã xóa / đang xóa | 409 `account-deleted` / `account-deleting` |
| LB1E41 | `PAYOS_FAKE_ENABLED` cùng `BILLING_PRODUCTION=true` | API từ chối khởi động |
| LB1E42 | Chỉ đặt một hoặc hai trong ba biến `PAYOS_*` | API từ chối khởi động |
| LB1E43 | Email sắp hết hạn đã lập; Lan mua thêm kỳ hoặc được cấp grant nối sau | Lúc gửi thấy còn Pro qua `ends_at` → `skipped` `covered` |
| LB1E44 | Biên nhận gặp trần ngân sách mail | `failed`, lần chạy sau gửi lại trong 7 ngày |
| LB1E45 | Trang về nhận `?order=…&id=…&status=PAID` | Bỏ qua query của payOS; trạng thái chỉ lấy từ API |
| LB1E46 | Lan bấm F5 nhiều lần ở trang về | `check` hỏi payOS tối đa một lần mỗi 10 giây mỗi đơn, và theo `user.write` |
| LB1E47 | Job chạy cùng lúc ở API và worker | Claim bằng `checked_at` + `SKIP LOCKED`: mỗi đơn một tiến trình |
| LB1E48 | Sự kiện payOS kẹt ở `failed` 5 lần | Log `billing_event_stuck` (có sẵn); `payer` bị xóa cùng raw payload sau 90 ngày |

## 4. B2 — Ai thấy quảng cáo; hộp thoại giới thiệu Pro (house ad)

### 4.1 `ads.show` (DB37: làm ở M3, trước hoặc cùng hộp thoại)

- `ads.show` tính ở API (`entitlements.service.ts:177-180` hiện chỉ là `adsEnabled && plan === 'free'`): `ads_enabled` **và** gói Free **và** `staff_role === null` (Q-B13) **và**
  `IdentityService.isAtLeast(profile, 16, now)` (Q-B11).
- `isAtLeast` là hàm mới của Identity (D3: Entitlements gọi service của Identity, không tự tính): "hôm nay" theo `profile.timezone`, dùng `isOldEnough(birth_date, today, 16)`
  có sẵn (`person.ts:38-44`, 29/02 tính là 01/03 năm không nhuận); `birth_date` null (tài khoản admin tạo, tài khoản cũ) → `false`, tức không có quảng cáo.
- Người dưới 16 tuổi không tải script quảng cáo, nên không cần cờ tuổi của Google (vốn chưa có cách gắn cho vignette, `ASSUMPTION` A7). Hộp thoại và AdSense dùng cùng `ads.show`.
- Kiểu web `Entitlements` thêm `ads: { show, interstitial_per_day, min_interval_minutes }`.

### 4.2 Hộp thoại

- **Khi nào:** `ads.show = true` và Lan chuyển trang trong app (soft navigation: `pathname` đổi mà không tải lại) **tới** `/vi/app/groups`, `/en/app/groups` (Nhóm) hoặc
  `/vi/app/lookup`, `/en/app/lookup` (Tra từ) — đúng bộ trang của vignette (DB38). Lần tải đầu (full load) không tính. Mọi trang khác không có hộp thoại.
- **Tần suất:** theo `ads_interstitial_per_day` (mặc định 3) và `ads_min_interval_minutes` (mặc định 10). Server không biết hộp thoại đã hiện (D21 Bước 5),
  nên web tự đếm trong `localStorage` theo từng user (`wordmet-web.house-ad.<user_id>`: ngày theo `timezone` hồ sơ của Lan, số lần, lần cuối). Đọc hoặc ghi lỗi → **không hiện**
  (thà mất một lần giới thiệu còn hơn hiện mỗi lần chuyển trang). Đổi máy hoặc xóa dữ liệu trình duyệt thì đếm lại từ đầu: chấp nhận.
- **Giao diện:** dùng `Dialog` có sẵn của `app-ui` (làm tối nền, tắt bằng × hoặc Esc, sheet dưới trên điện thoại). Nội dung: lợi ích Pro, "từ {giá 1 tháng}" đọc từ
  `plans.pro.prices` (không viết cứng 79.000 ₫), nút "Xem gói Pro" tới `/app/plans`. Không chứa mã của Google.
- **Phụ thuộc:** bật sau B1 (Pro phải mua được).
- **Khi có AdSense (B3):** hộp thoại **tắt hẳn** (Q-B14). Web chọn theo `NEXT_PUBLIC_ADSENSE_CLIENT`: có thì vignette, không thì hộp thoại.

### 4.3 When → Then (B2)

| # | Khi | Thì |
|---|---|---|
| LB2A1 | Lan (Free, 20 tuổi, `ads_enabled` bật, chưa có AdSense) bấm tab Nhóm từ Hôm nay lần đầu trong ngày | Hộp thoại hiện; đếm 1; "Xem gói Pro" tới `/app/plans` |
| LB2A2 | Lan bấm "Xem gói Pro" rồi mua, trang về báo `paid` | Entitlements được invalidate; `ads.show = false`; không còn hộp thoại |
| LB2E1 | `birth_date` null | `ads.show = false` |
| LB2E2 | Hôm nay (theo `timezone` của Lan) là sinh nhật 16 tuổi | `ads.show = true` |
| LB2E3 | Còn một ngày nữa mới tròn 16 tuổi; hoặc sinh 29/02, năm tròn 16 không nhuận, hôm nay 28/02 | `ads.show = false` |
| LB2E4 | Staff (`admin` / `editor`), có hoặc không có Pro | `ads.show = false` |
| LB2E5 | Pro (subscription, grant hay kỳ trả trước) hoặc trial | `ads.show = false` |
| LB2E6 | `ads_enabled` tắt | `ads.show = false` |
| LB2E7 | Chuyển trang tới Nhóm lần hai trong 10 phút | Không hiện |
| LB2E8 | Lần thứ tư trong ngày | Không hiện; qua 00:00 theo `timezone` của Lan thì đếm lại |
| LB2E9 | `ads_interstitial_per_day = 0` | Không bao giờ hiện |
| LB2E10 | Minh đăng nhập trên cùng máy sau Lan | Bộ đếm riêng theo user id |
| LB2E11 | `localStorage` ném lỗi (chế độ riêng tư, chặn dữ liệu) | Không hiện |
| LB2E12 | Tải lại cả trang ở `/app/groups` | Không hiện (chỉ tính soft navigation) |
| LB2E13 | Chuyển tới `/app/group?id=…`, `/app/topic`, `/app/review`, `/app/word`, Hôm nay, phiên luyện | Không hiện |
| LB2E14 | Tra từ đổi `?q=` (`router.replace`, `pathname` không đổi) | Không hiện |
| LB2E15 | `NEXT_PUBLIC_ADSENSE_CLIENT` có giá trị | Không bao giờ hiện |
| LB2E16 | Admin đổi giá 1 tháng thành 89.000 ₫ | Hộp thoại ghi "từ 89.000 ₫" ở lần tải `app-config` sau |

## 5. B3 — Quảng cáo vignette của AdSense

Bật AdSense chỉ sau khi deploy và Google duyệt site (Q7: duyệt dựa trên landing và văn bản pháp lý, rủi ro bị từ chối đã chấp nhận). Spike CSP thì làm sớm (§6).

### 5.1 Trang có quảng cáo và cách nạp script (DB38)

Vignette của Google hiện khi Lan bấm link **trên trang có mã** AdSense. Vậy "vignette ở Nhóm, Tra từ" nghĩa là: mã AdSense chỉ có mặt trong document khi trang hiện tại là Nhóm
hoặc Tra từ. Không dựa vào danh sách loại trừ của AdSense (A2 chưa kiểm được).

- **Trang được phép:** đúng `/{vi,en}/app/groups` và `/{vi,en}/app/lookup` (kể cả `?q=`). Không gồm cả tab Nhóm (`currentTab` gộp `groups|group|topic|review`,
  `app-chrome/nav.ts:8`), vì tab đó có ôn thẻ và trang nhóm; không gồm `/app/word`.
- **Nạp:** một component client trong layout `(member)` chèn `adsbygoogle.js?client=…` (có `nonce`, `async`, `crossorigin="anonymous"`) lần đầu khi `ads.show = true`,
  `NEXT_PUBLIC_ADSENSE_CLIENT` có giá trị và `pathname` là trang được phép (tải trang hoặc soft navigation). Trước đó đặt `requestNonPersonalizedAds = 1` (§5.5).
- **Rời:** script đã nạp thì ở lại suốt document. Nên khi `pathname` đổi sang trang không được phép trong lúc script đã nạp (link, `router.push`, nút Back), component gọi
  `hardReplace(location.href)` (`app-shell/navigate.ts`): trang đích tải lại cả trang, không còn script. Cũng làm vậy khi `ads.show` đổi thành `false` lúc script đã nạp
  (Lan vừa mua Pro, admin tắt `ads_enabled`).
- **Phiên luyện** không bao giờ có script: không phải trang được phép, và luôn vào bằng `hardReplace` (`use-practice-starter.tsx:63,128`). Link bắt đầu luyện, ôn thẻ trên trang
  được phép mang `data-google-vignette="false"`.
- **Rời `/app`:** link ở chân trang ra landing, `/terms`, `/privacy` (`AppFooter.tsx:28-51`, đang là `next/link`) đổi thành `<a>` thường, để rời app luôn là tải lại cả trang.
- Pro, trial, staff, người dưới 16 tuổi và khách không bao giờ tải script.

### 5.2 Cài đặt AdSense, `ads.txt`

- Chỉ bật Vignette; tần suất 10 phút trở lên; bỏ ô "Allow additional triggers" (tránh quảng cáo khi ngồi yên 30 giây hay khi quay lại tab).
- "Excluded pages" chỉ là lớp thứ hai: `/vi/app/practice`, `/en/app/practice`, `/vi/app/review`, `/en/app/review` ("All pages under this section").
- `ads.txt` đặt ở gốc tên miền (`apps/web/public/ads.txt`, thư mục `public/` chưa có; matcher của proxy bỏ đường có dấu chấm nên không đi qua proxy), chép đúng dòng AdSense đưa.
- Tắt nhanh không cần deploy: tắt `ads_enabled` trong admin (§5.1: trang đang mở tải lại, không còn script).

### 5.3 Màn tổng kết phiên luyện

Màn tổng kết là một trạng thái bên trong `/app/practice/session`, cùng địa chỉ với lúc làm câu, và chính sách Google cấm quảng cáo ở màn kiểu "Thank You, Exit".
**Q-B10: không có quảng cáo ở màn tổng kết** (thay Q8 ở phần này). Với §5.1, cả nhánh `/app/practice` không có script.

### 5.4 CSP `nonce` cho `/app` (DB39)

AdSense chỉ hỗ trợ CSP chặt bằng `nonce` trên mọi thẻ script. Hai chỗ vướng:
1. Next.js chỉ cấp `nonce` khi trang được dựng theo từng request, trong khi design người học §4.1 và CI (`assert:static`, `apps/web/scripts/assert-static.mjs:7`) bắt
   `/vi/app`, `/en/app` dựng sẵn.
2. Issue OpenNext #1302 (đang mở) báo mất `nonce` trên đúng bản `@opennextjs/cloudflare 1.20.13` khi vừa đặt CSP có `nonce` trong `proxy.ts` vừa đặt CSP trong
   `next.config.ts` `headers()`, đúng như cấu hình hiện tại (`next.config.ts:28-31`). Bản sửa (opennextjs-aws #1339) chưa phát hành.

**Spike** (nhánh bỏ đi, không cần deploy hay Google; chạy trên `pnpm cf:build && pnpm cf:dev`, làm song song M1): bỏ CSP của `/app` khỏi `next.config.ts`, tạo `nonce` trong
`proxy.ts` cho `/app` (đặt trên request và response), ép `/app` dựng theo request (`await connection()` ở layout của app). Danh mục kiểm:
- mọi `<script>` trong HTML có `nonce` bằng nonce trong header; hai request khác nonce;
- script chống nháy màu (`layout.app.tsx`, hash `THEME_SCRIPT_HASH`) chạy (giữ hash, vì hash vẫn có hiệu lực dưới `'strict-dynamic'`, hoặc gắn nonce);
- beacon Cloudflare Web Analytics: bản chèn tự động ở edge không có nonce nên bị `'strict-dynamic'` chặn (`ASSUMPTION` A6). Không chạy thì tắt chèn tự động và đặt snippet
  beacon tay có `nonce`;
- Turnstile của đợt A ở `/vi/app/login`, `/register`, `/forgot-password`: dưới `'strict-dynamic'` danh sách host bị bỏ qua, nên script Turnstile phải mang nonce hoặc được
  nạp bởi script có nonce (vd `next/script`); widget chạy, không vi phạm;
- không vi phạm CSP ở `/vi`, `/vi/app`, `/vi/app/login`, `/vi/app/groups`; đo CPU Worker của một trang `/app` dựng theo request.
Spike không qua: B3 chờ OpenNext phát hành bản sửa; B2 vẫn chạy.

**CSP của `/app` sau spike** (landing và `/terms`, `/privacy` giữ CSP hiện tại, `csp.ts:15-33`). `{N}` là nonce, `{API}` là origin API. Phần **in đậm** chỉ có khi
`NEXT_PUBLIC_ADSENSE_CLIENT` có giá trị (lúc build), để trước AdSense `/app` vẫn chặt:

| Directive | Giá trị |
|---|---|
| `default-src` | `'self'` |
| `script-src` | `'nonce-{N}' 'strict-dynamic' 'sha256-{THEME}' 'unsafe-inline'` **`'unsafe-eval'` `https:` `http:`** (`'unsafe-inline'`, `https:`, `http:` chỉ có tác dụng ở trình duyệt cũ không hiểu nonce / `'strict-dynamic'`; giữ đúng mẫu Google) |
| `style-src` | `'self' 'unsafe-inline'` (như hiện nay) |
| `img-src` | `'self' data: blob:` **`https:`** |
| `font-src` | `'self'` |
| `connect-src` | `'self' {API} https://cloudflareinsights.com` **`https:`** |
| `frame-src` | `https://challenges.cloudflare.com` (Turnstile) **`https:`** |
| `object-src` | `'none'` |
| `base-uri` | `'none'` (theo mẫu Google; Next không dùng `<base>`) |
| `form-action` | `'self'` |
| `frame-ancestors` | `'none'` |
| `upgrade-insecure-requests` | (ngoài dev) |

- **`'unsafe-eval'`:** có, theo header mẫu Google "specifically supports" và cảnh báo "More restrictive policies may break without notice" (code facts ads §5.1); chỉ khi có
  AdSense. Đánh đổi: `/app` cho phép `eval` khi bật quảng cáo.
- Trước khi bật thật: chạy một tuần `Content-Security-Policy-Report-Only` với đúng chuỗi này (song song CSP đang có hiệu lực), đọc Console ở Nhóm và Tra từ; vi phạm nào thì thêm
  đúng nguồn đó và sửa test.
- **Thay `assert:static`:** script mới `assert:render-mode` fail khi `/vi`, `/en` **không** có trong `.next/prerender-manifest.json` (landing phải tĩnh) hoặc khi `/vi/app`,
  `/en/app` **có** trong đó (`/app` phải dựng theo request để có nonce). Sửa design người học §4.1 cho khớp (việc tài liệu của M4).
- **Mở rộng `apps/web/e2e/csp.spec.ts`:** `/vi/app` và `/vi/app/login` có header chứa `'nonce-` và `'strict-dynamic'`; mọi `<script>` có `nonce` bằng nonce của header; hai lần tải
  khác nonce; `/vi` không có nonce và giữ `default-src 'self'`; không vi phạm ở `/vi`, `/vi/app`, `/vi/app/login`, `/vi/app/groups`; từ `/vi` bấm nút vào app là **tải lại cả trang**
  (một dấu đặt trên `window` trước khi bấm phải mất sau khi tới `/vi/app`), để ranh giới CSP theo document được ghim (hiện đúng nhờ `ButtonLink` là `<a>`,
  `components/ui/ButtonLink.tsx:10-11`, nhưng chưa có test).
- Dựng `/app` theo request tốn CPU Worker hơn và mất cache: spike đo; con số ghi vào `deploy-checklist.md`.

### 5.5 Không cá nhân hóa

- **Luôn dùng quảng cáo không cá nhân hóa** (Q-B12): đặt `(adsbygoogle = window.adsbygoogle || []).requestNonPersonalizedAds = 1` trước khi chèn script; không làm hộp thoại xin
  đồng ý cá nhân hóa. Quảng cáo không cá nhân hóa vẫn dùng cookie để giới hạn tần suất và báo cáo gộp (`ASSUMPTION` A13 về việc cookie đó có cần đồng ý); Chính sách bảo mật nói rõ.

### 5.6 Văn bản

- Chính sách bảo mật bản nháp đang hứa "không dùng dữ liệu cho quảng cáo", "không dùng cookie quảng cáo" (mục 3, 5, 10): phải sửa trước khi bật quảng cáo
  (quảng cáo Google không cá nhân hóa cho người Free từ 16 tuổi ở Nhóm và Tra từ, cookie giới hạn tần suất; không áp cho người dưới 16 tuổi, Pro và staff). Thời điểm đăng: Q-B16.
- Trang gói đã ghi Pro "Không quảng cáo": nay đúng.

### 5.7 Chưa kiểm được trước khi có tài khoản AdSense, và luật dự phòng

| # | Chưa biết | Kiểm ở bản thử sau deploy | Nếu sai |
|---|---|---|---|
| A1 | Vignette có hiện khi bấm `next/link` (đổi trang không tải lại) không | Bấm link từ Nhóm, Tra từ nhiều lần, quá 10 phút | DB38: gỡ `NEXT_PUBLIC_ADSENSE_CLIENT` (hộp thoại giới thiệu Pro quay lại), giữ `ads.txt`, xem lại sau |
| A2 | Loại trừ trang của AdSense có áp sau khi đổi trang kiểu đó không | Không cần cho đúng luật: §5.1 không dựa vào nó | — |
| A8 | Có tắt được video không | Xem các quảng cáo hiện ra, tìm trong Blocking controls | Ghi lại; chủ dự án quyết có giữ quảng cáo không |
| A12 | Quảng cáo có được phục vụ trong `/app` khi robot không đọc được trang không | Báo cáo AdSense sau vài ngày | Như A1 |

### 5.8 When → Then (B3)

| # | Khi | Thì |
|---|---|---|
| LB3A1 | Lan (Free, 20 tuổi, `ads_enabled`, có AdSense) mở `/vi/app/groups` | Script nạp có nonce, sau `requestNonPersonalizedAds = 1`; Console không lỗi CSP; vignette có thể hiện khi Lan bấm link trên trang này (theo Google) |
| LB3A2 | Lan chuyển từ Hôm nay sang Tra từ bằng tab | Script được chèn lúc tới Tra từ |
| LB3E1 | Script đã nạp, Lan bấm link từ Nhóm sang `/vi/app/practice` | Trang đích tải lại cả trang; không còn script |
| LB3E2 | Lan vào phiên luyện từ bất kỳ đâu | Không có script trong document phiên luyện |
| LB3E3 | Script đã nạp, Lan mua Pro (entitlements invalidate) | `ads.show = false` → trang hiện tại tải lại; không còn script |
| LB3E4 | Admin tắt `ads_enabled` | Ở lần tải entitlements tiếp theo của Lan: tải lại, không còn script |
| LB3E5 | Lan bấm "Điều khoản" ở chân trang app | `<a>` thường: tải lại cả trang ra `/vi/terms` |
| LB3E6 | Lan từ landing bấm vào app | Tải lại cả trang (e2e ghim) |
| LB3E7 | Hai lần tải `/vi/app/groups` | Hai nonce khác nhau; `/vi` không có nonce |
| LB3E8 | Lan mở `/vi/app/login` có Turnstile (đợt A) dưới CSP nonce | Widget chạy; không vi phạm |
| LB3E9 | Beacon Cloudflare chèn tự động bị chặn dưới `'strict-dynamic'` | Spike phát hiện; dùng snippet beacon tay có nonce |
| LB3E10 | Bản thử cho thấy vignette không hiện khi chuyển trang mềm (A1 sai) | Gỡ `NEXT_PUBLIC_ADSENSE_CLIENT`; hộp thoại giới thiệu Pro quay lại |
| LB3E11 | Lan dùng trình chặn quảng cáo | Script không tải; không có thông báo lỗi cho Lan |
| LB3E12 | Người dưới 16 tuổi, staff, Pro mở Nhóm | Không có script |
| LB3E13 | Google từ chối duyệt site | Không đặt `NEXT_PUBLIC_ADSENSE_CLIENT`; hộp thoại ở lại; đợt B xong với M1–M3 |

## 6. Chia việc và thứ tự

| Milestone | Nội dung | Phụ thuộc |
|---|---|---|
| M0 | Spike CSP `nonce` trên bản build Worker (§5.4), nhánh bỏ đi; kết quả ghi vào `docs/deliveries/` | Không; làm song song M1 |
| M1 | Dữ liệu (`billing_orders`, `billing_order_payments`, `prepaid_periods`, `fake_payos_links`, sequence, `quarter`), ba method mới của `BillingAdapter`, adapter payOS (chữ ký tự viết) và bản giả, `OrderApplier`, nhánh `payment_succeeded` trong applier, job đối soát, `POST /v1/me/orders`, `GET /v1/me/orders/:id`, `POST …/check`, API admin đơn hàng và thu hồi kỳ, `resolve()` và snapshot (`prepaid`, `upcoming_periods`, `pro_until`), cắm kỳ trả trước vào loader của đợt A, bộ xóa tài khoản, `ACCOUNT_DATA_MAP`, ba setting giá và `app-config`, `pnpm payos:confirm-webhook` | Đợt A M3 (tắt trial, cùng file `plan-rules`) và phần loader của đợt A (§3.13) xong trước |
| M2 | Web mua và trang về; đổi câu "Gói Pro chưa mở bán"; lịch sử giao dịch ("3 tháng"); admin "Đơn hàng", "Đã nhận tiền", "Hủy đơn", "Đã xử lý", thu hồi kỳ; email `expiry_notice` và `payment_receipt`; viết lại Điều khoản mục 5–8 và thêm mục payOS vào Chính sách bảo mật; thêm vào `deploy-checklist.md`: cho `/v1/billing/webhooks/payos` qua WAF và Bot Fight Mode, chạy `payos:confirm-webhook` sau mỗi lần đổi domain, ba biến `PAYOS_*`, bảng §3.14 | M1 |
| M3 | `ads.show` mới (Free, không staff, từ 16 tuổi) và `IdentityService.isAtLeast`, kiểu web `ads`, hộp thoại giới thiệu Pro | M2 |
| M4 | CSP `nonce` cho `/app` theo kết quả M0, `assert:render-mode`, e2e CSP; component nạp AdSense và luật rời trang; chân trang dùng `<a>`; `ads.txt`; cài đặt AdSense; sửa Chính sách bảo mật phần quảng cáo (nếu chưa đăng ở Q-B16); sửa design người học §4.1 | M0 qua; phần CSP làm được trước khi Google duyệt; bật AdSense sau khi deploy và Google duyệt |

Thử với payOS thật (tiền thật, số nhỏ, vì không có sandbox) là việc của chủ dự án sau khi deploy M1–M2, theo bảng §3.14.

## 7. Kiểm thử

- **API unit:** `ads.show` (bảng LB2E1–LB2E6, gồm sinh nhật 16 theo timezone và 29/02); `isAtLeast`; chữ ký webhook payOS tự viết, đối chiếu với `webhooks.verify` của SDK (đúng,
  sai, key xáo thứ tự, giá trị null); ánh xạ webhook → sự kiện, bỏ `counterAccount*` khỏi raw; `OrderApplier` theo từng hàng T1–T14 (mỗi test ghim trạng thái, `review_reason`,
  `outcome`, số kỳ, số dòng giao dịch); `starts_at` và `ends_at` theo bảng §3.7 và LB1E30–LB1E34; job đối soát theo bảng §3.6 và các cập nhật có điều kiện; tạo đơn khi payOS
  lỗi; `order_code` và `description` (biên của sequence, `WM0XSNJKV`); `expiredAt` tính bằng giây; giá theo kỳ, `price-changed`; config payOS và chặn ở production;
  `ACCOUNT_DATA_MAP`; bộ xóa; email hai kind mới; snapshot (`upcoming_periods`, `pro_until`); loader với kỳ đã hết trong tháng (§3.13); log không có trường người chuyển.
- **Web:** trang gói (ba kỳ, câu không hoàn tiền, nút Mua, `price-changed`, "Kỳ tiếp theo"), trang về (paid, pending lâu, needs_review, cancelled, bỏ query payOS), câu khóa mới,
  hộp thoại giới thiệu Pro (LB2), component nạp AdSense (LB3E1–LB3E4).
- **Admin:** màn Đơn hàng, "Đã nhận tiền" bấm hai lần, "Đã xử lý", thu hồi kỳ.
- **e2e web:** `csp.spec.ts` mở rộng (§5.4, ở M4).
- **Smoke mới** `smoke:buoc-b-payments` chạy với payOS giả: mua, trùng webhook, nối kỳ, webhook trễ qua `check` và qua job đối soát, trả thiếu rồi đủ, admin xác nhận rồi webhook
  tới (gắn, không kỳ mới), admin bấm hai lần, payOS lỗi lúc tạo đơn, tiền tới sau khi xóa tài khoản, hết hạn về Free, email sắp hết hạn và biên nhận.
- **Chạy tay sau deploy:** một lần mua thật nhỏ với payOS thật theo bảng §3.14; bản thử AdSense theo `WEB_LAUNCH_DECISIONS…` §3.6 (F) và bảng §5.7.

## 8. Xong khi

- CI xanh trên mọi PR; smoke mới và smoke 5, 7, 8 chạy qua trên DB mới (smoke 7 vì `resolve()` đổi: Pro qua grant, lượt AI), output lưu ở `docs/deliveries/`.
- Chủ dự án mua thành công một kỳ bằng payOS thật và thấy Pro, giao dịch, email đúng; các dòng của bảng §3.14 kiểm được đã ghi kết quả.
- (M4) Google duyệt site; vignette hiện cho người Free từ 16 tuổi chỉ ở Nhóm và Tra từ, không có script ở trang khác, trong phiên luyện và cho Pro; Console không lỗi CSP.
- **Google từ chối duyệt** (hoặc A1 sai): đợt B coi là xong với M1–M3; hộp thoại giới thiệu Pro ở lại.

## 9. Câu hỏi

### 9.1 Đã chốt

Chủ dự án (04/11/2026): "theo rec của bạn", tức chọn theo đề xuất của Claude cho cả mười bốn câu. Lý do và các phương án: decision record. Phần sửa theo review
(DB28–DB42, các vòng mới của DB13, DB16, DB17, DB21) chọn theo đề xuất của review (chủ dự án: "sửa theo review", 04/11/2026).

| # | Câu hỏi | Chốt |
|---|---|---|
| Q-B1 | Đơn chưa trả hết hạn sau bao lâu? | **15 phút** |
| Q-B2 | Chuyển thiếu hoặc thừa tiền? | **`needs_review`, không tự mở kỳ**; admin mở kỳ bằng "Đã nhận tiền" hoặc hoàn tay. So **tổng** các lần chuyển (DB16 vòng 2) |
| Q-B3 | Đang có Pro do đội Wordmet cấp mà mua? | **Nối sau** khoảng Pro liền mạch, kể cả grant tương lai nối liền, chốt lúc mở kỳ (DB17 vòng 2) |
| Q-B4 | Email biên nhận? | **Có** (`payment_receipt`) |
| Q-B5 | Email sắp hết hạn trước mấy ngày? | **7 ngày**, dùng chung `renewal_notice_days_before` |
| Q-B6 | Ai bấm "Đã nhận tiền", xem Đơn hàng? | **Chỉ admin** (`settings.manage`) |
| Q-B7 | Tiền tới sau khi xóa tài khoản? | **`needs_review`**, admin hoàn tay ngoài hệ thống; giữ thông tin người chuyển tối đa 90 ngày (DB21 vòng 2) |
| Q-B8 | Giá sửa ở đâu? | **Trong admin** (ba setting giá) |
| Q-B9 | Landing hiện giá? | **Không** |
| Q-B10 | Màn tổng kết có quảng cáo? | **Không**; cả `/app/practice` không có script |
| Q-B11 | Người dưới 16 tuổi? | **Không tải quảng cáo** (cả hộp thoại giới thiệu Pro) |
| Q-B12 | Đồng ý cá nhân hóa? | **Luôn không cá nhân hóa**, không hỏi |
| Q-B13 | Staff không có gói thấy quảng cáo? | **Không** |
| Q-B14 | Khi có vignette, hộp thoại giới thiệu Pro? | **Tắt hẳn** |

### 9.2 Còn mở cho chủ dự án (sau review)

Không chặn plan: design chạy được với mọi câu trả lời; câu trả lời đổi rủi ro hoặc thời điểm đăng văn bản.

- **Q-B15 — Tài khoản ngân hàng nào nối với payOS?** Bối cảnh: trang API của payOS ghi giới hạn `description` 9 ký tự "với tài khoản ngân hàng không phải liên kết qua payOS"; FAQ
  câu 7 (đọc 04/11/2026) nói với liên kết VietQR Pro, chuyển sai số tiền bị ngân hàng từ chối ngay, đã chuyển thì ngân hàng hoàn lại. Design dùng mã 9 ký tự nên chạy với cả hai
  loại. Loại tài khoản quyết định trả sai tiền, trả muộn, trả hai lần là hiếm hay thường, tức admin sẽ gặp `needs_review` nhiều hay ít (§10).
- **Q-B16 — Đăng bản văn bản pháp lý mới lúc nào?** Bối cảnh: mỗi lần admin đăng một phiên bản mới (Chính sách bảo mật và Điều khoản đi chung một số phiên bản), mọi học viên đã
  đồng ý bản cũ bị giữ ở `complete-profile` tới khi đồng ý lại (`terms-version.ts:29-31`, `RequireSession.tsx:75`). Hai văn bản chưa có trong DB; bản đầu tiên sẽ đăng trước
  launch. Đợt B cần sửa văn bản hai lần: phần payOS (M2, trước khi bán) và phần quảng cáo (M4, sau khi Google duyệt, tức sau launch). Các cách: (a) bản đăng lúc launch đã có cả
  phần payOS và phần quảng cáo (viết là "khi bật"), M4 không cần bản mới trừ khi sự thật đổi; (b) bản lúc launch chỉ có phần payOS, đăng bản mới khi bật AdSense và mọi học viên
  đồng ý lại một lần.

## 10. Rủi ro và chỗ chưa kiểm

- payOS **không có môi trường test**: mọi lần thử thật tốn tiền thật; logic chỉ kiểm được bằng bản giả cho tới lần mua thật đầu tiên. Bảng §3.14 gom mọi `ASSUMPTION` về payOS,
  mỗi dòng có luật nếu sai.
- **Trả sai tiền, trả muộn, trả hai lần không được coi là hiếm** cho tới khi biết loại tài khoản (Q-B15): FAQ về VietQR Pro chỉ nói cho liên kết VietQR Pro. Mỗi lần như vậy admin
  phải xem tay (`needs_review` hoặc cờ).
- **Tiền tới sau khi xóa tài khoản mà payOS không gửi thông tin người chuyển** (P10): admin có thể không tìm được người để hoàn tiền; tiền nằm lại ngoài ý muốn.
- **Kỳ chốt một lần:** grant tạo đè lên kỳ đang chạy, kỳ thu hồi giữa chuỗi, hay grant tương lai không liền (LB1E31–LB1E33) làm học viên mất hoặc trùng ngày; admin thấy ở màn Đơn hàng
  và cấp bù tay.
- Mở lại D35 thêm một kiểu nguồn Pro thứ ba (`prepaid`); mọi chỗ liệt kê cứng hai loại nguồn phải sửa đủ (§3.2), nếu không người mua có thể không thấy Pro.
- CSP `nonce` trên OpenNext chưa ai chạy thử; nếu lỗi #1302 không tránh được thì vignette phải chờ bản sửa của OpenNext.
- Dựng `/app` theo từng request tốn CPU Worker hơn và mất cache (spike đo). Khi có AdSense, `/app` cho phép `'unsafe-eval'` và `https:` ở ảnh, khung, kết nối.
- Rời Nhóm, Tra từ khi đã có script là tải lại cả trang (chỉ người Free có quảng cáo): chậm hơn một chút mỗi lần.
- Google có thể từ chối duyệt site (Q7) hoặc không phục vụ quảng cáo trong `/app` (A1, A12); khi đó chỉ còn hộp thoại giới thiệu Pro.
- Luật 19/2023 Điều 42 (báo trước khi thu phí gia hạn) nói về gia hạn tự động; gói trả trước không tự thu, nên không áp, nhưng email sắp hết hạn vẫn gửi (P9).

## Thay đổi sau review

Review: [`../reviews/2026-11-04-chuan-bi-launch-b-design-review.md`](../reviews/2026-11-04-chuan-bi-launch-b-design-review.md) (04/11/2026). Mục dẫn theo bản này.

- **RB-1** → §3.2 bảng `billing_order_payments`, §3.4 (danh tính `payos:<env>:<orderCode>:<reference>` / `manual:<order_id>`, bảng T1–T14, `needs_review` chỉ cho đơn chưa có kỳ,
  cờ cho đơn đã có kỳ, 409 khi xác nhận lần hai), LB1E1–LB1E8, LB1E14; DB28.
- **RB-2** → §3.3 (rẽ nhánh trước `unknown-user`), §3.4 T1, §3.11 (thông tin hoàn tiền, xóa sau xử lý hoặc 90 ngày, bỏ `cancelCheckout` khỏi bước xóa, `deleting`), §10,
  LB1E35–LB1E40; DB21 vòng 2.
- **RB-3** → §3.5 (`order_code` từ sequence `[10^9, 32^7−1]`, `description` `WM` + base32), §3.4 kiểm `paymentLinkId`, `success`, `code`, LB1E20–LB1E21; DB29.
- **RB-4** → §3.6 (job chỉ đánh `expired` theo payOS, hoặc quá hạn + 24 giờ; `UPDATE … WHERE status`; claim bằng `checked_at`), §3.4 "đúng hạn" (đệm 10 phút), chữ "30 phút" bỏ,
  trang về hỏi ngay, LB1E11–LB1E16; DB30.
- **RB-5** → §3.6 bảng 7 trạng thái, §3.4 so tổng (T4 → T2), `cancelled` chỉ khi API hỏi payOS, Q-B15, §10 bỏ đánh giá "hiếm", LB1E9–LB1E10, LB1A6; DB16 vòng 2, DB31.
- **RB-6** → §3.6 bước 3 và §3.8 (`?order=<uuid>`, bỏ query payOS), LB1E45; DB32.
- **RB-7** → §3.6 "Tạo đơn" (commit trước, gọi payOS ngoài transaction, `failed`, 503, mã mới khi thử lại, job hủy link mồ côi), LB1E17–LB1E19; DB33.
- **RB-8** → §3.3 (giữ `BillingAdapter`, ba method tùy chọn, `ORDER_EVENT_TYPES` ngoài `EVENT_TYPES`, `externalSubscriptionId` null, adapter không tra DB, `CheckoutState` theo SDK); DB34.
- **RB-9** → §3.7 (`now` = giờ mở kỳ, khoảng Pro liền mạch kể cả grant tương lai, `ends_at` làm tròn tới hết ngày, bảng ví dụ, chuỗi trôi ngày), LB1E30–LB1E34; DB17 vòng 2, DB35.
- **RB-10** → §3.13 (kỳ trả trước cắm vào loader của đợt A, `ends_at`/`revoked_at` là thời điểm kết thúc; danh sách file chung; câu "chưa mở bán" ở M2), LB1A8; DB36.
- **RB-11** → §4.1, §6 M3 (luật `ads.show` chuyển từ M4 sang M3, cùng hộp thoại); DB37.
- **RB-12** → §5.1 (chỉ nạp script ở `/app/groups`, `/app/lookup`; rời trang thì tải lại cả trang; chân trang `<a>`; phiên luyện không có script), §5.2 (loại trừ chỉ là lớp thứ hai),
  §5.7 (luật dự phòng A1, A2), LB3E1–LB3E5, LB3E10; DB38, DB13 vòng 3.
- **RB-13** → §5.4 (chuỗi CSP đầy đủ, `'unsafe-eval'` có khi bật AdSense, danh mục spike gồm Turnstile và beacon, `assert:render-mode` thay `assert:static`, e2e mở rộng, ghim landing →
  app là tải lại cả trang), LB3E6–LB3E9; DB39.
- **RB-14** → §3.14 (bảng `ASSUMPTION` payOS có cách kiểm và luật nếu sai), §3.5 (`expiredAt` tính bằng giây có test, job tự hủy link, cách sinh `description`), §3.3 (không dùng
  `webhooks.verify`); DB40.
- **RB-15** → §3.12 (payload chuẩn hóa, `payer` chỉ tới lúc apply, raw bỏ `counterAccount*`, không gửi `buyer*`, không log, mục payOS trong Chính sách bảo mật ở M2), §6 M2; DB41.
- **RB-16** → §3.15 (LB1A1–LB1A9, LB1E1–LB1E48), §4.3 (LB2), §5.8 (LB3), gồm các ca review liệt kê.
- **RB-17** → §2 hàng Q5, Q6 ghi "đã thay bởi Q-B11, Q-B12"; hàng Q1–Q2, Q7–Q8 ghi "thay D21 Bước 5"; §6 bỏ "biên nhận nếu chọn" và "đồng ý"; đầu file ghi phần cũ của code facts ads
  (không sửa code facts vì ngoài phạm vi lần sửa này).
- **RB-18** → §3.10 (`period_key`, `window_ends_at`, `deliver` tải theo `subject_key`, bỏ câu App Store ở cả hai email, `covered` tính cả grant nối sau; biên nhận theo lần trả).
- **RB-19** → §3.2 (`upcoming_periods`, `pro_until`; liệt kê bốn chỗ web đọc `sources`); DB42.
- **RB-20** → §3.2 (`revoked_by`, giữ hồ sơ theo `transactionRetentionYears`, `TransactionInterval` riêng, bản giả `environment = 'sandbox'`, bảng `fake_payos_links` không có cột user).
- **RB-21** → §4.1 (`IdentityService.isAtLeast`; `birth_date` null thì không có quảng cáo).
- **RB-22** → §6 (M0 spike song song M1), §8 (thêm smoke 7; Google từ chối thì xong với M1–M3).
- **RB-23** → §6 M2 (mục `deploy-checklist.md`: WAF, Bot Fight Mode, `confirm-webhook` sau đổi domain), §3.6 (trang về nhờ API hỏi payOS, 10 giây một lần).
- **RB-24** → §3.9 (chi tiết đơn có ngày kỳ và khoảng Pro hiện có; endpoint và nút thu hồi kỳ; "Đã nhận tiền" đòi `Idempotency-Key` và lý do), §4.2 (giá trong hộp thoại đọc từ
  setting), §9.2 Q-B16 (thời điểm đăng văn bản: việc của chủ dự án).
