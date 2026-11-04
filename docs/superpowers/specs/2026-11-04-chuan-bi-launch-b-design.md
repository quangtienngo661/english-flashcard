# Chuẩn bị launch, đợt B: thanh toán VietQR qua payOS, quảng cáo — Design (04/11/2026)

> **Trạng thái 04/11/2026:** các câu ở §9 đã chốt (chủ dự án: "theo rec của bạn", tức theo đề xuất của Claude). **Chờ chủ dự án đọc lại bản viết.**
> Chưa có code, chưa có plan. Decision record: [`../decisions/2026-11-04-chuan-bi-launch-b-decisions.md`](../decisions/2026-11-04-chuan-bi-launch-b-decisions.md).
> **Nguồn quyết định:** chủ dự án chốt trong chat 02–04/11/2026, tổng hợp ở `docs/preparation/WEB_LAUNCH_DECISIONS_AND_OPEN_ITEMS_2026-11-04.md`
> (nhánh local `docs/web-launch-research`). Mã quyết định (P1, Q7…) dẫn theo file đó.
> **Code đọc trên:** `origin/dev` @ `a6b2bd15`. Mọi `path:line` và tài liệu ngoài (payOS, AdSense, Next.js, OpenNext, đọc 04/11/2026) ở hai file code facts:
> [`../../preparation/LAUNCH_PREP_CODE_FACTS_2026-11-04-billing.md`](../../preparation/LAUNCH_PREP_CODE_FACTS_2026-11-04-billing.md) và
> [`../../preparation/LAUNCH_PREP_CODE_FACTS_2026-11-04-ads.md`](../../preparation/LAUNCH_PREP_CODE_FACTS_2026-11-04-ads.md).
> **Đợt A** (Turnstile, header, sửa sau review, lượt AI cho Free, tắt trial): [`2026-11-04-chuan-bi-launch-a-design.md`](2026-11-04-chuan-bi-launch-a-design.md).

Ví dụ xuyên suốt: **Lan**, học viên gói Free, giờ Việt Nam.

## 1. Mục tiêu và phạm vi

| Phần | Việc | Chạm |
|---|---|---|
| B1 | Bán gói Pro bằng chuyển khoản VietQR, xác nhận qua webhook của payOS; nút "Đã nhận tiền" của admin làm dự phòng | API Entitlements (billing), DB, web, admin, email |
| B2 | Hộp thoại tự làm giới thiệu Pro khi chuyển trang (house ad) | web |
| B3 | Quảng cáo vignette của Google AdSense cho người Free trong `/app` | web (CSP, script), cấu hình AdSense, Chính sách bảo mật |

**Không làm:** nhà cung cấp tự gia hạn (MoMo) và việc chuyển người dùng sang nó (P6, P10: để sau, nhưng adapter phải chừa chỗ, §3.3); trang công khai mới
(Q7: không làm); quảng cáo video, banner, quảng cáo Google trong hộp thoại tự làm (Q4, Q6); hồ sơ chuyển dữ liệu ra nước ngoài và thông báo NĐ 248 (L8, L9).

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
| Q1–Q2, Q7–Q8 | Có quảng cáo, chấp nhận rủi ro; khách chỉ thấy landing; vignette ở Nhóm, Tra từ trong app, không hiện lúc đang làm câu (màn tổng kết bỏ theo Q-B10; Hôm nay bỏ theo chủ dự án 04/11) |
| Q3, Q4 | Trong lúc chờ Google duyệt: hộp thoại tự làm giới thiệu Pro; không bao giờ đặt quảng cáo Google vào hộp thoại tự làm |
| Q5, Q6 | CSP `nonce` chỉ cho `/app`; cờ tuổi cho người dưới 16; hỏi đồng ý trước khi cá nhân hóa (Luật 91/2025); không video, tần suất thấp |

## 3. B1 — Thanh toán VietQR qua payOS

### 3.1 Luồng mua

```
Lan ở /app/plans, chọn "3 tháng — 199.000 ₫", đọc dòng "Không hoàn tiền. Gói không tự gia hạn."
   │ bấm [Mua] ── POST /v1/me/orders { period_months: 3 }  (Idempotency-Key)
   ▼
API: tạo order `pending` (số tiền lấy từ bảng giá phía server, mã đơn) ──► payOS: tạo payment link
   │ trả { order_id, checkout_url }
   ▼
Web chuyển cả trang sang checkout_url của payOS (không nhúng, nên CSP web không đổi)
   │ Lan quét QR, chuyển khoản trong app ngân hàng
   ▼
payOS ──► POST /v1/billing/webhooks/payos (ký HMAC) ──► inbox ──► applier:
   order `paid` → tạo kỳ trả trước → ghi giao dịch → email biên nhận (Q-B4)
   │
payOS chuyển Lan về returnUrl = /app/plans/order?id=… ── web hỏi GET /v1/me/orders/:id tới khi `paid`
   ▼
"Bạn đã có Pro tới hết 04/02/2027"
```

Webhook không tới thì có hai lưới: job đối soát hằng giờ hỏi payOS trạng thái các đơn `pending` (§3.5), và nút "Đã nhận tiền" của admin (§3.7).

### 3.2 Dữ liệu

Code hiện chỉ biết gói tự gia hạn của một nhà cung cấp: không có bảng đơn, không có loại sự kiện "trả một lần", kỳ chỉ có `month | year`,
và kỳ chưa bắt đầu không hiện cho người học (code facts §0). Đề xuất thêm hai bảng (module Entitlements):

**`billing_orders`** — một lần Lan bấm Mua.

| Cột | Ý nghĩa |
|---|---|
| `id` uuid | |
| `user_id` uuid | Người mua |
| `provider` | `payos` (sau này `momo`…) |
| `environment` | `production` (payOS không có sandbox) |
| `order_code` bigint | Mã đơn gửi payOS, duy nhất theo `provider` |
| `period_months` | CHECK `IN (1, 3, 12)` |
| `amount_minor`, `currency` | Số tiền chốt lúc tạo đơn (`VND`, 0 số lẻ: 199000) |
| `status` | `pending`, `paid`, `expired`, `cancelled`, `needs_review` (CHECK) |
| `payment_link_id`, `checkout_url`, `expires_at` | Từ payOS |
| `paid_at`, `paid_amount_minor`, `provider_reference` | Từ webhook (hoặc từ admin) |
| `confirmed_by` uuid null | Admin bấm "Đã nhận tiền" |
| `created_at`, `updated_at` | |

**`prepaid_periods`** — một kỳ Pro đã trả, có thể bắt đầu ở tương lai.

| Cột | Ý nghĩa |
|---|---|
| `id` uuid, `user_id` uuid, `order_id` uuid | |
| `starts_at`, `ends_at` | `ends_at = starts_at + period_months` theo lịch (kẹp ngày cuối tháng như `addMonthsClamped`) |
| `revoked_at`, `revoke_reason` | Admin thu hồi (vd chuyển nhầm người) |

Vì sao không dùng bảng sẵn có:
- **Grant của staff:** CHECK bắt người cấp là `admin`/`editor`; grant bắt đầu ngay thu hồi grant đang chạy; lịch sử giao dịch trộn grant với
  `billing_transactions` nên một lần trả thành hai dòng.
- **`subscriptions`:** phải giả vờ "đã hủy gia hạn" (`cancel_at_period_end = true`) để không bị coi là tự gia hạn và không chặn xóa tài khoản; mỗi
  kỳ nối tiếp phải là một "subscription" riêng; `interval` chỉ `month | year`.
- Bảng riêng nói đúng điều nó là: kỳ đã trả, không tự gia hạn.

Phải sửa theo: `resolve()` (nguồn Pro mới, anchor chu kỳ AI = `starts_at` của kỳ đang chạy), `SourcesRepository`, snapshot (`sources[].kind =
'prepaid'`, kèm các kỳ chưa bắt đầu), `proCandidates`, kiểu web `Entitlements.sources`, `ACCOUNT_DATA_MAP` (test bắt mọi cột `user_id`).

**`billing_transactions`:** thêm `quarter` vào CHECK `interval` (kỳ 3 tháng); kiểu web và chữ `intervals.quarter` ("3 tháng"). Mỗi đơn `paid` ghi một
dòng `purchase`, `provider_transaction_id` = `provider_reference`.

**Thứ tự nối kỳ (P11, Q-B3):** `starts_at = max(now, ends_at lớn nhất trong các prepaid_periods chưa thu hồi, ends_at của grant gói Pro đang chạy)`,
chốt một lần lúc đơn thành `paid`. Nếu sau đó admin thu hồi grant sớm thì kỳ đã trả không dời lên; Lan có thể là Free trong khoảng trống đó (admin
thấy khoảng trống ở màn Đơn hàng và có thể cấp bù). Subscription tự gia hạn chưa có nhà cung cấp thật nên không xét.

### 3.3 Adapter chung

Port hiện có (`BillingAdapter`) chỉ **nhận** sự kiện của gói tự gia hạn. Đề xuất một port cho mọi nhà cung cấp, mỗi adapter khai năng lực của mình:

```ts
abstract class PaymentProvider {
  readonly provider: string;
  // Trả một lần (payOS); MoMo sau này dùng nó để mở liên kết trừ tiền lần đầu.
  createCheckout?(order: CheckoutOrder): Promise<{ checkoutUrl; providerOrderRef; expiresAt }>;
  getCheckout?(orderCode): Promise<CheckoutState>;      // đối soát khi webhook không tới
  cancelCheckout?(orderCode): Promise<void>;
  // Như hiện nay: kiểm chữ ký webhook, trả danh sách sự kiện đã chuẩn hóa.
  verify(req: BillingRequest): Promise<VerifyResult>;
  ack(result): { status; body? };
  // Chỉ nhà cung cấp tự gia hạn: fetchState, endTrialNow, cancelAtPeriodEnd (giữ nguyên).
}
```

- Thêm loại sự kiện **`payment_succeeded`** (additive) cho lần trả một lần: `orderCode`, `amount`, `reference`, `occurredAt`. Đây là chỗ đảo lại ghi chú
  "D35: no `payment_succeeded`" của `billing.types.ts`. Sự kiện của gói tự gia hạn giữ nguyên 13 loại.
- **Dùng lại** inbox (`billing_events`, dedupe theo `payos:production:<reference>`), route webhook, job thử lại, xóa `raw_payload` sau 90 ngày, giới hạn
  thời gian gọi adapter 5 s.
- Applier rẽ nhánh: `payment_succeeded` đi vào `OrderApplier` (khóa user → khóa order → `paid` → tạo `prepaid_periods` → ghi giao dịch → notice),
  không đụng máy trạng thái subscription.
- payOS không có `app_user_id` trong webhook: adapter tra `order_code` → order → user trước khi trả sự kiện. Đơn không tìm thấy thì vẫn trả 2xx
  (payOS gửi thử với `orderCode: 123` khi đăng ký webhook, `ASSUMPTION`) và đánh dấu sự kiện `ignored`.
- **Thư viện:** đề xuất SDK chính thức `@payos/node` 2.0.5 (Node ≥ 20), đặt `timeout` ≤ 5 s, `maxRetries: 0`, `logLevel: 'off'` cho đúng quy ước gọi
  adapter và không ghi body ra log. Chữ ký webhook so bằng `timingSafeEqual`.
- **Đăng ký webhook:** một lệnh CLI `pnpm payos:confirm-webhook <url>` chạy một lần lúc deploy.
- **Nhà cung cấp giả** (payOS không có sandbox, nên bắt buộc cho test và smoke): `PAYOS_FAKE_ENABLED`, theo mẫu provider giả hiện có. `createCheckout` trả
  một trang giả `/v1/dev/payos/checkout?order=…` (như trang Google giả) có nút "Đã trả" phát webhook ký bằng khóa giả. `BILLING_PRODUCTION=true` cùng
  fake thì API từ chối khởi động.
- **Env:** `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` (bắt buộc cùng nhau khi bật payOS thật), `PAYOS_FAKE_ENABLED`.
- **Log:** logger che mọi key có chữ `code`, nên log dùng `order_ref` thay vì `order_code`.

### 3.4 Giá

- Bảng giá phía server, gửi web qua `GET /v1/me/app-config` (`plans.pro.prices`). Đơn chốt số tiền lúc tạo; đổi giá không ảnh hưởng đơn đang chờ.
- **Giá sửa trong admin** (Q-B8): ba setting mới nhóm `entitlements`: `pro_price_1m_vnd` (79.000), `pro_price_3m_vnd` (199.000), `pro_price_12m_vnd`
  (599.000), bound `1.000–10.000.000`, có trong lịch sử setting như các key khác.
- **Landing không hiện giá** (Q-B9): landing dựng sẵn lúc build nên sẽ lệch khi admin đổi giá; giá chỉ hiện ở `/app/plans`.
- `description` gửi payOS tối đa 9 ký tự với tài khoản không liên kết qua payOS: dùng mã ngắn như `WM7KQ2PB` (chữ hoa và số, không dấu).

### 3.5 Vòng đời đơn

| Trạng thái | Vào khi | Ra khi |
|---|---|---|
| `pending` | Tạo đơn, payOS trả link | Webhook trả đủ → `paid`; quá `expires_at` → `expired` (job); Lan bấm hủy trên trang payOS → `cancelled` |
| `paid` | Webhook đúng số tiền, hoặc admin bấm "Đã nhận tiền" | — (không hoàn tiền) |
| `needs_review` | Webhook số tiền khác số đơn (Q-B2: không tự mở kỳ, chờ admin); tiền tới khi đơn đã `expired`/`cancelled`; tiền tới khi tài khoản đã xóa (Q-B7) | Admin xử lý |
| `expired`, `cancelled` | — | Tiền vẫn tới thì `needs_review` |

- **Thời hạn của link: 15 phút** (Q-B1), `expiredAt = now + 15 phút`. Quá hạn mà Lan chưa trả thì bấm Mua lại.
- **Job đối soát** (hằng giờ, chạy được song song ở API và worker như các job billing khác): đơn `pending` quá vài phút thì gọi `getCheckout`; payOS báo
  đã trả mà chưa có webhook thì tạo sự kiện như webhook.
- Một người có nhiều đơn `pending` cùng lúc: cho phép (mỗi lần bấm Mua là một đơn; `Idempotency-Key` chặn bấm đúp).

### 3.6 Người học (web)

- **`/app/plans`:** thay ô chọn Năm/Tháng bằng ba kỳ 1 / 3 / 12 tháng kèm giá; bỏ dải "Chưa mở bán" và giá giữ chỗ `XXX.000 ₫`; nút **Mua**. Ngay trên nút:
  "Không hoàn tiền. Gói không tự gia hạn; hết hạn bạn mua kỳ mới." Có link tới Điều khoản.
- Đang Pro: hiện "Pro tới hết {ngày}" và các kỳ đã trả chưa bắt đầu ("Kỳ tiếp theo: 05/12/2026 – 04/01/2027"). Vẫn bấm Mua được (kỳ nối tiếp).
- **`/app/plans/order?id=…`** (trang về từ payOS): hỏi `GET /v1/me/orders/:id` mỗi vài giây trong tối đa vài phút. `paid` → báo thành công;
  vẫn `pending` → "Đang chờ ngân hàng xác nhận. Bạn có thể đóng trang này; gói sẽ tự mở khi tiền tới" kèm email hỗ trợ; `cancelled` → quay lại trang gói.
- **Lịch sử giao dịch:** dòng `purchase` có số tiền, kỳ (thêm chữ "3 tháng"), mã tham chiếu.
- Hàng "Hủy gói" (`SubscriptionRows`) không hiện cho kỳ trả trước (không có gì để hủy).
- **Landing:** câu trial đã bỏ ở đợt A; không hiện giá (Q-B9).
- **Điều khoản** mục 5–8 viết lại theo cách bán này (việc tài liệu, cùng đợt).

### 3.7 Admin

- Màn mới **"Đơn hàng"** trong nhóm tiền, **chỉ admin** (`settings.manage`, Q-B6), như màn Giao dịch: danh sách lọc theo trạng thái, email, ngày; chi tiết
  đơn có số tiền, mã, sự kiện đã nhận.
- **"Đã nhận tiền"** (đơn `pending`, `expired`, `needs_review`): nhập mã tham chiếu ngân hàng và số tiền đã nhận, ghi `confirmed_by`, đi đúng đường của
  `payment_succeeded` (cùng `OrderApplier`), nên kỳ, giao dịch và email giống hệt khi webhook tới. Bấm hai lần cùng đơn không tạo hai kỳ.
- **"Hủy đơn"** cho đơn `pending` (gọi `cancelCheckout`).
- Thu hồi một kỳ trả trước (vd ghi nhận nhầm người) ghi `revoked_at`, `revoke_reason`; không hoàn tiền trong hệ thống.

### 3.8 Email

- **Sắp hết hạn** (P9): kind mới `expiry_notice` cho kỳ trả trước cuối cùng của Lan (không còn kỳ nối tiếp). Gửi trước **7 ngày**, dùng chung setting
  `renewal_notice_days_before` (Q-B5). Nội dung:
  ngày hết hạn, link `/app/plans`, không có câu "tự gia hạn và trừ tiền" hay "hủy ở App Store, Google Play". Sửa đủ sáu chỗ (kiểu `NoticeKind`, CHECK của
  bảng, bản chữ, chọn ngày, planner, nhánh kiểm của `NoticeSender.claim` đang đòi `subject_key` là subscription).
- Lan mua thêm kỳ sau khi email đã lập nhưng chưa gửi: lúc gửi kiểm lại, còn kỳ nối tiếp thì bỏ (`skipped`).
- **Biên nhận khi nhận tiền** (Q-B4): kind mới `payment_receipt`, gửi một lần khi đơn thành `paid` (kể cả admin xác nhận): kỳ, số tiền, mã tham chiếu,
  ngày bắt đầu và kết thúc, câu "không hoàn tiền". `subject_key` = id đơn. Dùng trần 95% ngân sách mail như email thanh toán khác.

### 3.9 Xóa tài khoản

- Kỳ trả trước **không** chặn tự xóa tài khoản (không tự gia hạn). Màn xóa nhắc "thời gian Pro còn lại sẽ mất, không hoàn tiền".
- Khi xóa: xóa `prepaid_periods`; ẩn danh `billing_orders` như `billing_transactions` (giữ hồ sơ tiền); đơn `pending` gọi `cancelCheckout`.
- **Tiền tới sau khi Lan đã xóa** (Q-B7): đơn thành `needs_review` (đã ẩn danh), log cảnh báo; admin hoàn tiền tay ngoài hệ thống (ngoại lệ duy nhất của
  "không hoàn tiền", vì không còn tài khoản để mở kỳ).

### 3.10 When → Then

| Khi | Thì |
|---|---|
| Lan (Free) mua 1 tháng ngày 05/11, webhook tới 05/11 10:02 | Đơn `paid`; kỳ 05/11 10:02 → 05/12 10:02; Lan là Pro; giao dịch `purchase` 79.000 ₫; chu kỳ AI neo 05/11 |
| Lan (Pro tới 05/12 nhờ kỳ trên) mua 12 tháng ngày 20/11 | Kỳ mới 05/12 → 05/12/2027; trang gói hiện "Kỳ tiếp theo"; email sắp hết hạn của kỳ 1 tháng không gửi |
| payOS gửi cùng webhook hai lần | Dedupe theo `reference`: lần hai là "đã nhận", không tạo kỳ thứ hai |
| Lan chuyển khoản lần hai vào cùng đơn (reference khác) | Theo P11: kỳ thứ hai xếp nối tiếp (`ASSUMPTION`: payOS báo lần chuyển thứ hai bằng webhook riêng) |
| Webhook không tới trong 30 phút | Job đối soát hỏi payOS; đã trả thì apply như webhook |
| Webhook chữ ký sai | 400, không ghi inbox (như provider hiện có) |
| Webhook cho `orderCode` không có | 2xx, sự kiện `ignored` |
| Số tiền webhook khác số đơn | `needs_review`, không mở kỳ; admin xem và bấm "Đã nhận tiền" (mở kỳ) hoặc hoàn tay (Q-B2) |
| Đơn đã `expired` mà tiền vẫn tới | `needs_review`, admin xử lý (không tự mở kỳ) |
| Admin bấm "Đã nhận tiền" rồi webhook cùng giao dịch tới | Cùng `reference` thì webhook là "đã nhận"; khác `reference` thì `needs_review` |
| Lan bấm Mua hai lần nhanh | Cùng `Idempotency-Key` trả cùng đơn; khác key thì hai đơn `pending` (chỉ đơn được trả mới thành kỳ) |
| Kỳ cuối của Lan hết lúc 05/12 10:02 | Lan về Free; lượt AI theo tháng dương lịch (đợt A) |
| API chạy `PAYOS_FAKE_ENABLED` cùng `BILLING_PRODUCTION=true` | API từ chối khởi động |

## 4. B2 — Hộp thoại giới thiệu Pro (house ad)

- **Khi nào:** người Free (`ads.show = true`) chuyển trang bằng link trong app (soft navigation) **tới** Nhóm hoặc Tra từ (cùng bộ trang với vignette; Hôm nay không có). Không bao giờ ở Hôm nay, phiên luyện,
  ôn thẻ, trang gói, cài đặt, hoàn tất hồ sơ.
- **Tần suất:** theo `ads_interstitial_per_day` (mặc định 3) và `ads_min_interval_minutes` (mặc định 10). Server không biết hộp thoại đã hiện (D21 Bước 5),
  nên web tự đếm trong `localStorage` theo từng user (`wordmet-web.house-ad.<user_id>`: ngày theo timezone của Lan, số lần, lần cuối), đọc/ghi bọc `try/catch`.
  Đổi máy hoặc xóa dữ liệu trình duyệt thì đếm lại từ đầu: chấp nhận.
- **Giao diện:** dùng `Dialog` có sẵn của `app-ui` (làm tối nền, tắt bằng × hoặc Esc, sheet dưới trên điện thoại). Nội dung: lợi ích Pro, giá từ 79.000 ₫, nút
  "Xem gói Pro" tới `/app/plans`. Không chứa mã của Google.
- **Phụ thuộc:** bật sau B1 (Pro phải mua được). Web thêm trường `ads` vào kiểu `Entitlements`.
- **Khi có AdSense (B3):** hộp thoại này **tắt hẳn** (Q-B14), để người Free không gặp hai thứ. Web chọn theo việc có cấu hình AdSense hay không
  (`NEXT_PUBLIC_ADSENSE_CLIENT`): có thì vignette, không thì hộp thoại.

## 5. B3 — Quảng cáo vignette của AdSense

Chỉ làm sau khi deploy và Google duyệt site (Q7: duyệt dựa trên landing và văn bản pháp lý, rủi ro bị từ chối đã chấp nhận).

### 5.1 Cách gắn

- Chỉ người Free trong `/app` mới tải `adsbygoogle.js` (vd qua `next/script` có `nonce`). Pro, trial và khách không tải script, nên không bao giờ thấy quảng cáo.
- Cài đặt trong AdSense: chỉ bật Vignette; tần suất 10 phút trở lên; bỏ ô "Allow additional triggers" (tránh bật quảng cáo khi ngồi yên 30 giây hay khi quay
  lại tab); loại trừ trang Hôm nay `/vi/app` và `/en/app` ("This page only", vì là gốc của mọi trang app) và các nhánh `/vi/app/practice`, `/vi/app/review`, `/vi/app/plans`, `/vi/app/settings`, `/vi/app/complete-profile`, `/vi/app/welcome` và bản
  `/en`. Link bắt đầu luyện gắn `data-google-vignette="false"`.
- `ads.txt` đặt ở gốc tên miền (`apps/web/public/ads.txt`, thư mục `public/` chưa có), chép đúng dòng AdSense đưa.
- Tắt nhanh không cần deploy: tắt `ads_enabled` trong admin.

### 5.2 Màn tổng kết phiên luyện

Màn tổng kết không có địa chỉ riêng: nó là một trạng thái bên trong `/app/practice/session`, cùng địa chỉ với lúc đang làm câu. Loại trừ trang của AdSense
chỉ lọc theo địa chỉ, nên **không thể** cho quảng cáo ở màn tổng kết mà vẫn chặn trong lúc làm câu. Ngoài ra chính sách của Google cấm quảng cáo ở màn
kiểu "Thank You, Exit". **Chốt (Q-B10): bỏ màn tổng kết khỏi chỗ có quảng cáo**; cả nhánh `/app/practice` bị loại trừ. Vignette chỉ ở Nhóm và Tra từ
(thay Q8 ở phần màn tổng kết; Hôm nay cũng bỏ, chủ dự án 04/11).

### 5.3 CSP `nonce` cho `/app`

AdSense chỉ hỗ trợ CSP chặt bằng `nonce` trên mọi thẻ script. Hiện có hai chỗ vướng:
1. Next.js chỉ cấp `nonce` khi trang được dựng theo từng request, trong khi design người học §4.1 và CI (`assert:static`) bắt `/vi/app`, `/en/app` dựng sẵn.
2. Issue OpenNext #1302 (đang mở) báo mất `nonce` trên đúng bản `@opennextjs/cloudflare 1.20.13` khi vừa đặt CSP có `nonce` trong `proxy.ts` vừa đặt CSP trong
   `next.config.ts` `headers()`, đúng như cấu hình hiện tại. Bản sửa (opennextjs-aws #1339) chưa phát hành.

Đề xuất làm theo thứ tự:
- **Spike trước (bỏ đi sau khi có câu trả lời):** trên bản build Worker, bỏ CSP của `/app` khỏi `next.config.ts`, tạo `nonce` trong `proxy.ts` cho `/app`,
  ép `/app` dựng theo request (`await connection()`), xem Next có gắn `nonce` vào mọi script không và Console có lỗi CSP không (`ASSUMPTION` A3 của code facts).
- Spike qua: `/app` thành trang dựng theo request (bỏ `/app` khỏi `assert:static`, sửa design người học §4.1, đo CPU Worker); landing giữ CSP cũ và vẫn dựng sẵn.
  CSP của `/app` theo mẫu Google: `script-src 'nonce-…' 'strict-dynamic' https: 'unsafe-inline'` (hai cái sau chỉ cho trình duyệt cũ), `object-src 'none'`,
  `base-uri 'none'`, thêm `frame-src`, `img-src`, `connect-src` đủ rộng cho quảng cáo (Google không công bố danh sách domain). Thử bằng
  `Content-Security-Policy-Report-Only` trước.
- `'strict-dynamic'` bỏ qua danh sách host, nên beacon Cloudflare Web Analytics chỉ chạy nếu mang `nonce` (`ASSUMPTION`); spike kiểm luôn.
- Spike không qua: chờ OpenNext phát hành bản sửa; B3 dừng lại, B2 vẫn chạy.

### 5.4 Ai thấy quảng cáo, đồng ý

- `ads.show` tính ở API (nơi đã biết gói, vai trò và ngày sinh): `ads_enabled` **và** gói Free **và** không phải staff (Q-B13) **và** đủ 16 tuổi theo
  `birth_date` và timezone của người học (Q-B11). Người dưới 16 tuổi không tải script quảng cáo, nên không cần cờ tuổi của Google (vốn chưa có cách gắn
  cho vignette, `ASSUMPTION` A7). Hộp thoại giới thiệu Pro (B2) dùng cùng `ads.show`.
- **Luôn dùng quảng cáo không cá nhân hóa** (Q-B12): đặt `requestNonPersonalizedAds=1` trước khi tải quảng cáo; không làm hộp thoại xin đồng ý cá nhân hóa.
  Quảng cáo không cá nhân hóa vẫn dùng cookie để giới hạn tần suất và báo cáo gộp (`ASSUMPTION` A13 về việc cookie đó có cần đồng ý); Chính sách bảo mật
  nói rõ điều này.

### 5.5 Văn bản

- Chính sách bảo mật bản nháp đang hứa "không dùng dữ liệu cho quảng cáo", "không dùng cookie quảng cáo" (mục 3, 5, 10): phải sửa trước khi bật quảng cáo
  (quảng cáo Google không cá nhân hóa cho người Free từ 16 tuổi, cookie giới hạn tần suất; không áp cho người dưới 16 tuổi, Pro và staff).
- Trang gói đã ghi Pro "Không quảng cáo": nay đúng.

### 5.6 Chưa kiểm được trước khi có tài khoản AdSense

Vignette có hiện khi bấm `next/link` (đổi trang không tải lại) không (A1); loại trừ trang có áp sau khi đổi trang kiểu đó không (A2); có tắt được video không (A8);
quảng cáo có được phục vụ trong `/app` khi robot không đọc được trang không (A12). Bản thử sau deploy ghi lại từng điểm này.

## 6. Chia việc và thứ tự

| Milestone | Nội dung | Phụ thuộc |
|---|---|---|
| M1 | Dữ liệu (`billing_orders`, `prepaid_periods`, `quarter`), port `PaymentProvider`, adapter payOS và bản giả, webhook, applier, job đối soát, `GET/POST /v1/me/orders` | Đợt A M3 (tắt trial) nên xong trước để không đụng cùng file `plan-rules` cùng lúc |
| M2 | Web mua và trang về; admin "Đơn hàng" và "Đã nhận tiền"; email sắp hết hạn (và biên nhận nếu chọn); sửa chữ; viết lại Điều khoản mục 5–8 | M1 |
| M3 | Hộp thoại giới thiệu Pro | M2 |
| M4 | Spike CSP `nonce`, rồi AdSense vignette, đồng ý, tuổi, `ads.txt`, sửa Chính sách bảo mật | Deploy, Google duyệt site |

Thử với payOS thật (tiền thật, số nhỏ, vì không có sandbox) là việc của chủ dự án sau khi deploy M1–M2.

## 7. Kiểm thử

- **API unit:** `ads.show` (Free, Pro, staff, 15 tuổi và 16 tuổi đúng ngày sinh nhật theo timezone); chữ ký webhook payOS (đúng, sai, key xáo thứ tự, giá trị null); ánh xạ webhook → sự kiện; `OrderApplier` (nối kỳ, trùng, số tiền lệch, đơn hết
  hạn, người đã xóa); `resolve()` với kỳ trả trước đang chạy và kỳ tương lai; job đối soát; giá theo kỳ; config payOS và chặn ở production; `ACCOUNT_DATA_MAP`.
- **Web:** trang gói (ba kỳ, câu không hoàn tiền, nút Mua), trang về (paid, pending lâu, cancelled), hộp thoại giới thiệu Pro (đếm theo ngày, khoảng cách, không
  hiện ở trang loại trừ, không hiện cho Pro).
- **Admin:** màn Đơn hàng, "Đã nhận tiền" bấm hai lần.
- **Smoke mới** `smoke:buoc-b-payments` chạy với payOS giả: mua, trùng webhook, nối kỳ, webhook trễ qua job đối soát, admin xác nhận, hết hạn về Free, email sắp hết hạn.
- **Chạy tay sau deploy:** một lần mua thật nhỏ với payOS thật; bản thử AdSense theo `WEB_LAUNCH_DECISIONS…` §3.6 (F).

## 8. Xong khi

- CI xanh trên mọi PR; smoke mới và smoke 5, 8 chạy qua trên DB mới, output lưu ở `docs/deliveries/`.
- Chủ dự án mua thành công một kỳ bằng payOS thật và thấy Pro, giao dịch, email đúng.
- (M4) Google duyệt site; vignette hiện cho người Free ở Nhóm và Tra từ, không hiện ở Hôm nay, không hiện trong phiên luyện và cho Pro; Console không lỗi CSP.

## 9. Câu hỏi đã chốt

Chủ dự án (04/11/2026): "theo rec của bạn", tức chọn theo đề xuất của Claude cho cả mười bốn câu. Lý do và các phương án: decision record.

| # | Câu hỏi | Chốt |
|---|---|---|
| Q-B1 | Đơn chưa trả hết hạn sau bao lâu? | **15 phút** |
| Q-B2 | Chuyển thiếu hoặc thừa tiền? | **`needs_review`, không tự mở kỳ**; admin mở kỳ bằng "Đã nhận tiền" hoặc hoàn tay |
| Q-B3 | Đang có Pro do đội Wordmet cấp mà mua? | **Nối sau** kỳ được cấp, chốt lúc đơn `paid` |
| Q-B4 | Email biên nhận? | **Có** (`payment_receipt`) |
| Q-B5 | Email sắp hết hạn trước mấy ngày? | **7 ngày**, dùng chung `renewal_notice_days_before` |
| Q-B6 | Ai bấm "Đã nhận tiền", xem Đơn hàng? | **Chỉ admin** (`settings.manage`) |
| Q-B7 | Tiền tới sau khi xóa tài khoản? | **`needs_review`**, admin hoàn tay ngoài hệ thống |
| Q-B8 | Giá sửa ở đâu? | **Trong admin** (ba setting giá) |
| Q-B9 | Landing hiện giá? | **Không** |
| Q-B10 | Màn tổng kết có quảng cáo? | **Không**; loại trừ cả `/app/practice` |
| Q-B11 | Người dưới 16 tuổi? | **Không tải quảng cáo** (cả hộp thoại giới thiệu Pro) |
| Q-B12 | Đồng ý cá nhân hóa? | **Luôn không cá nhân hóa**, không hỏi |
| Q-B13 | Staff không có gói thấy quảng cáo? | **Không** |
| Q-B14 | Khi có vignette, hộp thoại giới thiệu Pro? | **Tắt hẳn** |

## 10. Rủi ro và chỗ chưa kiểm

- payOS **không có môi trường test**: mọi lần thử thật tốn tiền thật; logic chỉ kiểm được bằng bản giả cho tới lần mua thật đầu tiên.
- `ASSUMPTION` về payOS (code facts billing §11): chỉ gửi webhook khi trả thành công; chính sách gửi lại và trùng; giới hạn `orderCode` và `description`; đơn vị
  `expiredAt`; đủ danh sách trạng thái; `reference` duy nhất; chuyển lần hai vào link đã trả; múi giờ của `transactionDateTime`.
- Mở lại D35 thêm một kiểu nguồn Pro thứ ba (`prepaid`); mọi chỗ liệt kê cứng hai loại nguồn phải sửa đủ, nếu không người mua có thể không thấy Pro.
- CSP `nonce` trên OpenNext chưa ai chạy thử; nếu lỗi #1302 không tránh được thì vignette phải chờ bản sửa của OpenNext.
- Dựng `/app` theo từng request tốn CPU Worker hơn và mất cache (chưa đo).
- Google có thể từ chối duyệt site (Q7) hoặc không phục vụ quảng cáo trong `/app`; khi đó chỉ còn hộp thoại giới thiệu Pro.
- Luật 19/2023 Điều 42 (báo trước khi thu phí gia hạn) nói về gia hạn tự động; gói trả trước không tự thu, nên không áp, nhưng email sắp hết hạn vẫn gửi (P9).
