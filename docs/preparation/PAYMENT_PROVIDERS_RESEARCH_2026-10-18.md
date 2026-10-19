# Khảo sát nhà cung cấp thanh toán cho gói Pro (18/10/2026)

Mục đích: làm đầu vào cho Bước 5 (Entitlements), cụ thể là "billing port" trung lập với nhà cung cấp (inbox các sự kiện
subscription: mua/bắt đầu, gia hạn, huỷ, hết hạn, refund; dedupe theo external event ID; chịu được giao hàng sai thứ tự).
V1 không làm thanh toán thật. Tài liệu này **không chọn nhà cung cấp** — chủ dự án quyết định trước (luật Bước 3+ của repo).

**Nhãn nguồn** (bắt buộc cho mỗi khẳng định):

- **[Đã đọc]** = đọc trên trang/tài liệu chính thức của nhà cung cấp trong phiên 18/10/2026.
- **[Thứ cấp]** = bài bên thứ ba hoặc đoạn trích của công cụ tìm kiếm, chưa đối chiếu với nguồn gốc.
- **[Suy luận]** = suy luận của người viết từ các nguồn trên; cần kiểm tra trước khi dùng.

Mọi phí ghi trong tài liệu là con số đọc ngày **18/10/2026**. Không có khẳng định nào lấy từ trí nhớ; chỗ nào không tìm
được nguồn thì ghi "chưa rõ". Phần thuế/hoá đơn Việt Nam chỉ là **cờ báo ở mức cao**, không phải tư vấn pháp lý/thuế.

---

## 1. Tóm tắt

Các con đường thực tế cho một developer một mình đang ở Việt Nam (chưa rõ đang là cá nhân, hộ kinh doanh hay doanh nghiệp):

1. **Web, khách Việt trả VND → cổng/ví Việt Nam** (VNPay, MoMo, ZaloPay, OnePay; hoặc payOS chuyển khoản VietQR). Được: đúng phương thức người Việt hay dùng (QR, ví, thẻ nội địa). Đổi lại: VNPay/MoMo/ZaloPay/OnePay cần hợp đồng merchant (thường cần giấy phép doanh nghiệp hoặc hộ kinh doanh); payOS nhận cá nhân nhưng không có sandbox. Hầu hết là thanh toán **một lần**, nên app phải tự lo gia hạn, nhắc nợ và hết hạn; chỉ MoMo (subscription API) và ZaloPay (agreement pay) có cơ chế cho merchant chủ động trừ tiền định kỳ. Chủ dự án là người bán trực tiếp nên tự lo hoá đơn và thuế. Phí hầu như không công khai.
2. **Web qua merchant of record (MoR)** (Paddle; Lemon Squeezy; Polar, Dodo Payments). Được: nhận người bán ở Việt Nam (Paddle nhận cá nhân), có subscription tự gia hạn sẵn, MoR lo VAT/sales tax toàn cầu. Đổi lại: phí cao hơn (Paddle 5% + 50¢), chủ yếu thẻ/PayPal (chưa thấy ví VN nào), checkout Paddle ở Việt Nam mặc định hiện USD, payout bằng USD/tháng. Lemon Squeezy đang được chuyển sang Stripe Managed Payments, mà sản phẩm này không nhận người bán ở Việt Nam → rủi ro nền tảng.
3. **Stripe qua pháp nhân nước ngoài** (vd. Stripe Atlas, Delaware). Stripe không mở tài khoản cho doanh nghiệp đặt tại Việt Nam. Được: API/Billing mạnh nhất, có Managed Payments (Stripe làm MoR), và tài khoản Stripe Mỹ đang preview MoMo (VND, có recurring mandate). Đổi lại: $500 + $100/năm cho Atlas cộng nghĩa vụ của một công ty Mỹ (chưa đọc nguồn chính thức), Managed Payments cộng thêm 3,5%, MoMo trên Stripe vẫn là waitlist.
4. **Mobile (Flutter) → Apple In-App Purchase / Google Play Billing.** Ở storefront Việt Nam, mở khoá tính năng trong app phải dùng IAP. Chưa thấy Apple cho phép link ra ngoài ở Việt Nam, và Google không có user choice billing ở Việt Nam. Được: store lo thanh toán; với cá nhân/hộ kinh doanh ở Việt Nam, Google thu VAT hộ và khấu trừ thuế, Apple khấu trừ PIT. Đổi lại: phí 15% (Apple Small Business Program; Google subscription), store quyết refund, app không được dẫn người dùng sang web để mua.
5. **RevenueCat làm lớp đệm.** Gộp Apple/Google và web (Stripe hoặc Paddle) thành một luồng webhook/entitlement. Miễn phí dưới $2.500 MTR, sau đó 1%. Đổi lại: thêm một phụ thuộc; phía web vẫn cần Stripe hoặc Paddle, không dùng được cổng Việt Nam.

Hệ quả cho port: phải biểu diễn được **cả hai mô hình** — nhà cung cấp tự gia hạn (Stripe/Paddle/store) và app tự gia hạn
(cổng VN: một lần → app cấp 30/365 ngày). Không nhà cung cấp nào cam kết thứ tự sự kiện, và cách xác nhận webhook khác nhau
theo từng bên (mục 4).

---

## 2. Bảng so sánh

Ký hiệu: Đ = Đã đọc, T = Thứ cấp, S = Suy luận, ? = chưa rõ. Chi tiết và URL ở mục 3.

| Nhà cung cấp | a. Ai mở được / VN? | b. Recurring | c. VND / payout về VN | d. Phí (18/10/2026) | e. Sandbox | f. Webhook | g. MoR / thuế | h. Node |
|---|---|---|---|---|---|---|---|---|
| **Stripe (trực tiếp)** | VN **không** có trong danh sách quốc gia (Đ) | Có, Billing đầy đủ (Đ) | Không áp dụng cho người bán ở VN (Đ) | US: 2,9% + 30¢; +1,5% thẻ quốc tế; +1% đổi tiền; Billing 0,7% (Đ) | Có (Đ) | `Stripe-Signature` HMAC-SHA256; retry tới 3 ngày; không đảm bảo thứ tự; dedupe theo event ID (Đ) | Không (bạn là người bán); Stripe Tax tính VAT VN cho khách VN (Đ) | SDK chính thức (Đ) |
| **Stripe Managed Payments** | Người bán phải ở US/CA/EU/UK/CH/NO/AU/HK/JP/SG — **không có VN** (Đ) | Có, qua Billing + Checkout (Đ) | Khách từ 195+ nước (Đ); không có ví VN trong danh sách (Đ) | +3,5% trên phí Payments (Đ) | Có (S) | Như Stripe | **Có — Stripe/Link là MoR**, thuế ở 80+ nước (Đ) | Như Stripe |
| **Stripe Atlas** (đường vòng) | Lập Delaware C-corp/LLC; "175+ nước đã dùng" (Đ); VN đủ điều kiện? **?** | — | — | $500 lần đầu + $100/năm (Đ) | — | — | Nghĩa vụ thuế Mỹ: chưa đọc (?) | — |
| **Paddle** | VN không bị loại (Đ); cá nhân/sole trader được, không cần business verification (Đ) | Có; month/year; proration; huỷ cuối kỳ (Đ) | VND có (Đ) nhưng checkout ở VN hiện USD nếu không đặt price override (Đ); payout wire/Payoneer, ngưỡng tối thiểu $100, hằng tháng (Đ) | 5% + 50¢ (Đ) | Có (Đ) | `Paddle-Signature` HMAC-SHA256; live 60 lần/3 ngày; dedupe `event_id`; thứ tự theo `occurred_at` (Đ) | **Có, MoR** (Đ) | `@paddle/paddle-node-sdk` (Đ) |
| **Lemon Squeezy** | VN có trong danh sách bank payout (Đ); cá nhân? ? | Có (Đ) | VND có trong currency list (T) | 5% + 50¢; "phí phụ ngoài US" (Đ) | Test mode (Đ) | Ký bằng secret (Đ); chi tiết ? | **Có, MoR** (Đ) | ? |
| **Polar** | Payout qua Stripe Connect Express; VN có trong danh sách (Đ) | Có (S) | ? | Starter 5% + 50¢; +1,5% thẻ ngoài US; phí payout của Stripe (Đ) | ? | ? | **Có, MoR** (Đ) | ? |
| **Dodo Payments** | VN có trong danh sách (theo nước cấp giấy tờ tùy thân) (Đ) | Có (subscription, dunning) (Đ) | VND qua Adaptive Currency (T) | 4% + 40¢; +1,5% ngoài US; +0,5% subscription (Đ) | ? | Standard Webhooks; 8 lần; có thể sai thứ tự; dedupe `webhook-id` (Đ) | **Có, MoR** (Đ) | SDK có helper `unwrap` (Đ) |
| **VNPay** | Cần giấy phép doanh nghiệp hoặc giấy chứng nhận hộ kinh doanh (T) | **Không thấy** recurring; có token, thanh toán bằng token qua redirect + OTP (Đ) | Chỉ VND; số tiền ×100 (Đ) | Không công khai; biểu phí qua ngân hàng đối tác (T) | Có (sandbox.vnpayment.vn) (Đ) | IPN GET, HMAC-SHA512; retry tối đa 10 lần, cách 5 phút; không có event ID (Đ) | Không (bạn là người bán) (S) | Không có SDK chính thức; lib cộng đồng `vnpay` (T) |
| **MoMo** | "Tài khoản Đối tác" cho doanh nghiệp và hộ kinh doanh (T) | **Có**: subscription API, merchant tự gọi trừ tiền, không cần người dùng xác nhận (Đ) | VND (S) | Không công khai (?) | Có test env (Đ) | IPN POST; trả HTTP 204 trong 15 giây; retry ? (Đ) | Không (S) | Không thấy SDK chính thức (?) |
| **ZaloPay** | Hợp đồng qua BD, nộp hồ sơ (Đ); loại hình ? | Agreement pay / auto-debit (Đ); có thể cần người dùng xác minh (Đ) | VND (S) | ? | Có (sb-openapi) (Đ) | Callback HMAC (key2); retry "tối đa 3 lần" chỉ trong code mẫu; sau 15 phút tự query (Đ) | Không (S) | ? |
| **payOS (Casso)** | Cá nhân chỉ cần CCCD (Đ) | Không (S) | Tiền về thẳng tài khoản ngân hàng của bạn (Đ) | "Miễn phí"; gói BIDV-1K 1.000 GD/năm tới 31/12/2026; bảng giá khác ? (Đ) | **Không có sandbox** (Đ) | HMAC-SHA256 bằng checksum key; retry/event ID ? (Đ) | Không (S) | `@payos/node` (Đ) |
| **OnePay** | ? | ? | Thẻ nội địa + quốc tế (Đ) | ? | Có trang dev MTF (T) | ? | Không (S) | ? |
| **2C2P** | VN là nước onboarding (T) | RPP: 2C2P tự trừ thẻ theo lịch (Đ) | MoMo/chuyển khoản VND qua Spreedly (T) | ? | ? | Backend notification (Đ) | Không (S) | ? |
| **Apple IAP** | Individual (không cần D-U-N-S, sole proprietorship đăng ký dạng individual) / Organization (cần D-U-N-S) (Đ); $99/năm (Đ) | Auto-renewable; huỷ = tắt auto-renew, giữ quyền tới hết kỳ (Đ) | Có storefront VN (Đ) | 15% nếu thuộc Small Business Program (Đ); mức chuẩn ? | Có (sandbox, gửi 1 lần) (Đ) | Server Notifications V2 (JWS); retry 5 lần (1/12/24/48/72 giờ); `notificationUUID` để dedupe (Đ) | Apple bán cho người dùng; VN: PIT 2% + FCT 5% trên commission với cá nhân ở VN (Đ) | ? (REST) |
| **Google Play Billing** | VN được đăng ký developer + merchant (Đ) | Có; grace period + account hold mặc định bật (Đ) | Tiền tệ mặc định VND nhưng payout bằng USD qua wire (Đ) | 15% cho subscription (Đ) | ? | RTDN qua Cloud Pub/Sub; **bắt buộc** gọi `subscriptionsv2.get` để lấy trạng thái (Đ) | Hộ KD/cá nhân VN: Google thu VAT hộ + khấu trừ 5% WHT (Đ) | ? |
| **RevenueCat** | Theo store/Stripe/Paddle bên dưới (Đ) | Gộp store + web (Đ) | Theo nhà cung cấp bên dưới | Miễn phí tới $2.500 MTR, sau đó 1% (Đ) | Có trường `environment` (Đ) | Retry 5 lần (~80 phút); `id` để dedupe (Đ) | Không; MoR là Paddle/Stripe MP/store (Đ) | Flutter `purchases_flutter` (T) |

---

## 3. Chi tiết từng nhà cung cấp

### 3.1 Stripe (trực tiếp, Atlas, Managed Payments, Link)

**a. Ai mở được.**

- Trang Global liệt kê 51 quốc gia/vùng (gồm Singapore, Thailand, Malaysia, Indonesia preview…); **Việt Nam không có**, kể cả dạng preview — [Đã đọc] https://stripe.com/global
- **Stripe Atlas**: phí một lần $500 (gồm phí nhà nước và năm đầu registered agent), sau đó $100/năm; lập Delaware C-corp, LLC hoặc subsidiary; "Startups in over 175 countries have chosen Atlas" — [Đã đọc] https://stripe.com/atlas. Trang không nêu điều kiện quốc tịch hay cư trú của founder và không mô tả nghĩa vụ thuế định kỳ ở Mỹ → **chưa xác minh** Atlas có nhận founder ở Việt Nam không, và chi phí tuân thủ hằng năm là bao nhiêu.
- **Managed Payments** (Stripe là MoR): người bán phải đặt trụ sở ở CA, US, các nước châu Âu trong danh sách, AU, HK, JP hoặc SG. **Không có VN** — [Đã đọc] https://docs.stripe.com/payments/managed-payments/eligibility
  - Chỉ cho sản phẩm số tự động hoàn toàn. Có các tax code phù hợp, vd. `txcd_10103000` SaaS personal use và `txcd_20060358` online courses dạng văn bản — cùng nguồn.
  - Bài blog của Lemon Squeezy (28/01/2026) nói doanh nghiệp ở nước chưa hỗ trợ được hướng sang Atlas — [Đã đọc] https://www.lemonsqueezy.com/blog/2026-update

**b. Recurring.**

- Stripe Billing có đủ vòng đời: `incomplete`, `trialing`, `active`, `past_due`, `canceled`, `unpaid`, `paused`; tự retry/dunning; khuyên cấp quyền dựa trên `invoice.paid` hoặc trạng thái `active` — [Đã đọc] https://docs.stripe.com/billing/subscriptions/overview
- Huỷ ngay (mặc định) hoặc `cancel_at_period_end=true`. Trên Dashboard có ba lựa chọn refund khi huỷ: prorated, refund toàn bộ kỳ cuối, hoặc không refund. Sự kiện: `customer.subscription.updated` khi đặt lịch huỷ, `customer.subscription.deleted` khi kết thúc. Subscription tự huỷ sau tối đa 8 lần thu tiền thất bại (cấu hình được) — [Đã đọc] https://docs.stripe.com/billing/subscriptions/cancel
- Chu kỳ tháng/năm: **[Suy luận]**, chưa đọc trang Price.
- Với Managed Payments, Stripe có thể **tự refund trong 60 ngày** trong một số trường hợp, và refund không cần người bán duyệt nếu người bán không trả lời trong 48 giờ — [Đã đọc] https://docs.stripe.com/payments/managed-payments/how-it-works

**c. VND / payout.**

- Không áp dụng cho người bán ở Việt Nam (không mở được tài khoản).
- **MoMo trên Stripe**: chỉ tài khoản Stripe **ở Mỹ** nhận được; khách ở VN, tiền VND; có recurring qua saved mandate (`SetupIntent` `usage=off_session`); mỗi giao dịch 15.000–12.000.000 VND; refund trong 90 ngày; không có dispute; **đang waitlist/preview** — [Đã đọc] https://docs.stripe.com/payments/momo
- Danh sách phương thức của Managed Payments không có ví Việt Nam (chỉ thẻ, Apple Pay, Google Pay, Link và một số phương thức US/KR/IN/BR/BE) — [Đã đọc] https://docs.stripe.com/payments/managed-payments/how-it-works

**d. Phí** — [Đã đọc] https://stripe.com/pricing

- 2,9% + 30¢ cho thẻ nội địa (Mỹ); +1,5% thẻ quốc tế; +1% nếu phải đổi tiền.
- Billing pay-as-you-go 0,7% volume.
- Managed Payments +3,5%/giao dịch, cộng thêm phí Payments.

**e. Sandbox.** Có sandbox/test mode và Stripe CLI `stripe trigger` — [Đã đọc] https://docs.stripe.com/webhooks

**f. Webhook** — [Đã đọc] https://docs.stripe.com/webhooks

- Ký bằng header `Stripe-Signature` (HMAC-SHA256, `t=` và `v1=`); mặc định chấp nhận lệch 5 phút.
- Live retry tới **3 ngày** với exponential backoff; sandbox retry 3 lần trong vài giờ. Resend thủ công: 15 ngày trên Dashboard, 30 ngày qua CLI.
- "Stripe doesn't guarantee the delivery of events in the order that they're generated". Không dùng `created` để xếp thứ tự vì đơn vị là giây.
- Dedupe bằng event ID. Đôi khi có **hai Event object riêng** cho cùng một việc → dedupe thêm bằng `data.object.id` + `event.type`.

**g. Thuế.**

- Stripe thường: bạn là người bán. Stripe Tax tính VAT cho khách ở VN (digital products), nhưng doanh nghiệp đặt ở VN thì "Not supported" — [Đã đọc] https://docs.stripe.com/tax/supported-countries
- Managed Payments: Stripe/Link là MoR, lo tax ở 80+ nước — [Đã đọc] https://docs.stripe.com/payments/managed-payments

**h. Node.** Có SDK Node.js chính thức (changelog liệt kê Node.js) — [Đã đọc] https://docs.stripe.com/changelog/dahlia/2026-04-22/managed-payments

**Link.** Ví số của Stripe (lưu thẻ, tự điền). Không có ở Ấn Độ. Chỉ liên quan nếu dùng Stripe — [Đã đọc] https://docs.stripe.com/payments/link

### 3.2 Paddle (MoR)

**a. Ai mở được.**

- "Paddle works with software businesses anywhere in the world", trừ danh sách bị cấm vận. **Việt Nam không nằm trong danh sách bị loại** — [Đã đọc] https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle
- Xác minh tài khoản gồm 3 bước: domain review, business verification ("not required for individuals or sole traders") và identity verification — [Đã đọc] https://www.paddle.com/help/start/account-verification/what-is-account-verification
- Paddle dành cho software; dịch vụ có người làm (tư vấn, coaching) không phù hợp — [Thứ cấp, snippet help center]

**b. Recurring.**

- `billing_cycle.interval` nhận `day | week | month | year` — [Đã đọc] https://developer.paddle.com/api-reference/prices/create-price
- Proration có 5 chế độ: `prorated_immediately`, `full_immediately`, `prorated_next_billing_period`, `full_next_billing_period`, `do_not_bill` — [Đã đọc] https://developer.paddle.com/concepts/subscriptions/proration
- Huỷ mặc định `next_billing_period` (tạo `scheduled_change`, vẫn active tới kỳ sau) hoặc `immediately`. Không huỷ được trong vòng 30 phút trước kỳ thu; đã huỷ thì không khôi phục được — [Đã đọc] https://developer.paddle.com/build/subscriptions/cancel-subscriptions
- Refund là "adjustment" `full` hoặc `partial`. **Phần lớn refund ở live cần Paddle duyệt**; tự duyệt nếu ≤ 400 USD và thoả các điều kiện khác. Sự kiện `adjustment.created` / `adjustment.updated` — [Đã đọc] https://developer.paddle.com/build/transactions/create-transaction-adjustments/
- Chính sách refund cho người mua (hiệu lực 31/03/2026), [Đã đọc] https://www.paddle.com/legal/refund-policy :
  - Mặc định "non-refundable".
  - Paddle có thể refund tuỳ ý nếu yêu cầu trong 14 ngày.
  - Quyền rút lại theo luật: 14 ngày ở EU/EEA/CH/UK; 7 ngày ở KR/BR/CN/CA; 5 ngày ở SG.
  - Huỷ subscription "take effect at the end of the billing period".

**c. VND / payout.**

- VND hỗ trợ từ 2024, nhưng "Paddle Checkout doesn't automatically localize prices in Vietnam to Vietnamese Dong": checkout ở VN hiện **USD** trừ khi đặt price override — [Đã đọc] https://developer.paddle.com/changelog/2024/vietnamese-dong-vnd-supported-currency.md
- Payout hằng tháng (gửi trước ngày 15), qua wire hoặc Payoneer. Ngưỡng payout đặt được từ $100 tới $100.000. Một số nước có thể mất phí SWIFT $15 — [Đã đọc] https://www.paddle.com/help/manage/get-paid/when-and-how-do-i-get-paid
- Tiền tệ payout khi nhận ở VN: **chưa rõ**.

**d. Phí.** 5% + 50¢ mỗi giao dịch checkout; đơn dưới $10 phải liên hệ để có giá riêng; "No monthly fees" — [Đã đọc] https://www.paddle.com/pricing

**e. Sandbox** — [Đã đọc] https://developer.paddle.com/sdks/sandbox.md

- Có môi trường sandbox riêng.
- Webhook sandbox retry 3 lần trong 15 phút; live 60 lần trong 3 ngày.
- Refund ở sandbox tự duyệt mỗi 10 phút.

**f. Webhook.**

- Header `Paddle-Signature` (`ts`, `h1`, HMAC-SHA256); Node SDK có `paddle.webhooks.unmarshal(...)` — [Đã đọc] https://developer.paddle.com/webhooks/about/signature-verification.md
- Phải trả 200 trong 5 giây. Giao hàng at-least-once, dedupe bằng `event_id` (khác `notification_id`). **Không đảm bảo thứ tự**: dùng `occurred_at` — [Đã đọc] https://developer.paddle.com/webhooks/about/how-webhooks-work.md
- Sự kiện:
  - `subscription.activated`, `subscription.canceled`, `subscription.created`, `subscription.past_due`, `subscription.paused`, `subscription.resumed`, `subscription.trialing`, `subscription.updated`
  - `transaction.completed`, `transaction.payment_failed`, …
  - `adjustment.created`, `adjustment.updated`
  - [Đã đọc] https://developer.paddle.com/webhooks/overview

**g. Thuế.** MoR, lo "global tax and regulatory compliance" — [Đã đọc] https://www.paddle.com/pricing. Paddle có thu/nộp VAT Việt Nam cho khách Việt hay không: **chưa xác minh**.

**h. Node.** `@paddle/paddle-node-sdk` — [Đã đọc] (trang signature verification ở trên)

### 3.3 Lemon Squeezy (MoR, thuộc Stripe)

- **Tình trạng 2026.** Banner "2026 Update: Lemon Squeezy + Stripe Managed Payments", nút "Get started" vẫn hoạt động — [Đã đọc] https://www.lemonsqueezy.com/pricing
  - Bài 28/01/2026: mục tiêu là "provide Lemon Squeezy users an easy way to migrate to Stripe Managed Payments"; không có ngày ngừng dịch vụ; Managed Payments mới hỗ trợ người bán ở "35+ countries"; nước khác được hướng sang Atlas — [Đã đọc] https://www.lemonsqueezy.com/blog/2026-update
  - **[Suy luận]** Người bán ở VN có rủi ro bị kẹt khi Lemon Squeezy chuyển hẳn sang Managed Payments, vì Managed Payments không nhận VN (mục 3.1).
- **Payout.** Việt Nam có trong danh sách "Bank payouts supported"; PayPal payout ở "200+ countries" — [Đã đọc] https://docs.lemonsqueezy.com/help/getting-started/supported-countries
- **Phí.** 5% + 50¢; "Transactions made outside of the US may encounter small additional fees". MoR — [Đã đọc] https://www.lemonsqueezy.com/pricing
- **Test mode.** Có; store mới mặc định ở test mode — [Đã đọc] https://docs.lemonsqueezy.com/help/getting-started/test-mode
- **Webhook.** Ký bằng secret 6–40 ký tự; danh sách event, retry và header không đọc được trên trang tổng quan — [Đã đọc] https://docs.lemonsqueezy.com/help/webhooks

### 3.4 Polar và Dodo Payments (MoR, nhận người bán ở VN)

**Polar**

- MoR. "Polar uses Stripe Connect Express to issue payouts to residents or businesses in any of the countries below". Việt Nam có trong danh sách. Cá nhân được hay không tuỳ Stripe Connect Express có loại "individual" cho VN — **chưa rõ** — [Đã đọc] https://polar.sh/docs/merchant-of-record/supported-countries
- Phí — [Đã đọc] https://polar.sh/resources/pricing
  - Starter miễn phí, 5% + 50¢; Pro $20/tháng, 3,8% + 40¢.
  - +1,5% thẻ ngoài US.
  - Phí payout của Stripe: $2/tháng, 0,25% + $0,25 mỗi payout, đổi tiền 0,25–1%.
  - Dispute $15.
- Subscription, webhook, Node SDK: chưa đọc.

**Dodo Payments**

- MoR. Đủ điều kiện xét theo **nước cấp giấy tờ tùy thân**; danh sách có "173. Vietnam" — [Đã đọc] https://docs.dodopayments.com/miscellaneous/accepted-countries-and-territories.md
- Phí: 4% + 40¢ (thẻ US); +1,5% ngoài US; +0,5% subscription. Payout: trang FAQ ghi $5 nếu payout dưới $1.000, nhưng bảng payout ghi miễn phí (hai chỗ mâu thuẫn); SWIFT USD $25 — [Đã đọc] https://dodopayments.com/pricing
- Webhook theo Standard Webhooks (`webhook-id`, `webhook-timestamp`, `webhook-signature`); retry 8 lần (5 giây → 10 giờ); "Events may arrive out of order"; dedupe bằng `webhook-id`; có sự kiện `subscription.active`, `subscription.past_due` và dunning — [Đã đọc] https://docs.dodopayments.com/developer-resources/webhooks

### 3.5 VNPay

**a. Ai mở được.**

- Trang `vnpay.vn/dang-ky-merchant` trả 404; trang tài liệu `vnpayment.vnpay.vn` không phân giải được DNS.
- Theo đoạn trích tìm kiếm của trang tài liệu VNPAY, hồ sơ gồm "Giấy phép đăng ký kinh doanh đối với Doanh nghiệp/Tổ chức" hoặc "Giấy chứng nhận kinh doanh đối với Hộ kinh doanh"; thẩm định 5–10 ngày làm việc — [Thứ cấp, snippet của trang VNPAY, không tải được]
- **[Suy luận]** Cá nhân chưa đăng ký kinh doanh khó mở được merchant cổng thanh toán VNPay.

**b. Recurring.**

- Trang API liệt kê ba sản phẩm: "Thanh toán PAY", "Thanh toán bằng mã token", "Thanh toán trả góp". Không có mục định kỳ — [Đã đọc] https://sandbox.vnpayment.vn/apis/
- Token: `token_create`, `pay_and_create`, `token_pay`, `token_remove`. Mọi lần thanh toán bằng token là **redirect trình duyệt**, và luồng mô tả "Khách hàng nhập thông tin xác thực OTP Ngân hàng tại VNPAY"; không có luồng server-to-server không cần khách — [Đã đọc] https://sandbox.vnpayment.vn/apis/docs/thanh-toan-token/token.html
- **[Suy luận]** Muốn bán theo tháng/năm thì app phải coi mỗi kỳ là một lần mua mới (hoặc nhắc khách tự trả).

**Refund.** API `refund`: `vnp_TransactionType=02` hoàn toàn phần, `03` hoàn một phần; số tiền ≤ giao dịch gốc. Có API `querydr` để truy vấn trạng thái — [Đã đọc] https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr&refund.html

**c. Tiền tệ.** `vnp_CurrCode` "Hiện tại chỉ hỗ trợ VND". `vnp_Amount` = số tiền × 100 (cả trong IPN) — [Đã đọc] https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html

**d. Phí.**

- Không tìm thấy biểu phí công khai của VNPAY.
- Biểu phí của Nam A Bank "thông qua đối tác VNPAY" (hiệu lực 15/06/2026) ghi QR: 0,5% nguồn nội địa, 0,7% thẻ quốc tế phát hành trong nước — [Thứ cấp] https://www.namabank.com.vn (PDF biểu phí). Đây là phí của ngân hàng đối tác, có thể khác phí hợp đồng trực tiếp với VNPAY.

**e. Sandbox.** Có (sandbox.vnpayment.vn) — [Đã đọc]

**f. IPN** — [Đã đọc] trang pay.html ở trên

- Method GET, URL phải SSL; checksum HMAC-SHA512 (tài liệu có nhắc SHA256).
- Merchant phải trả JSON `{"RspCode","Message"}`:
  - `00` (thành công) hoặc `02` (đã xác nhận trước đó) → VNPAY dừng gửi.
  - `01`, `04`, `97`, `99` hoặc timeout → VNPAY retry, **tối đa 10 lần, cách 5 phút**.
- Return URL "Không cập nhật kết quả giao dịch tại địa chỉ này".
- Không có event ID; định danh bằng `vnp_TxnRef` (mã đơn của merchant, không trùng trong ngày) và mã giao dịch VNPAY.

**g. Thuế.** Bạn là người bán → tự lo hoá đơn/thuế (mục 3.13) — [Suy luận]

**h. Node.** Không thấy SDK chính thức. Thư viện cộng đồng `vnpay` (MIT, tác giả cá nhân) — [Thứ cấp] https://vnpay.js.org/en/

### 3.6 MoMo

**a. Ai mở được.**

- Bài báo 20/03/2026: "Tài khoản Đối tác MoMo là tài khoản dành riêng cho doanh nghiệp và hộ kinh doanh", định danh theo giấy phép kinh doanh, phù hợp Thông tư 25/2025/TT-NHNN — [Thứ cấp] https://doanhnhan.baophapluat.vn/momo-cap-nhat-moi-nhat-ve-giai-phap-nhan-tien-danh-cho-ho-kinh-doanh-ho-tro-chuan-hoa-thong-tin-theo-quy-dinh-moi.html
- Quy trình dev: đăng ký M4B (business.momo.vn) → tích hợp trên Test → xác minh tài khoản → xin production credentials → UAT → go-live. Tài liệu không nêu loại hình được phép — [Đã đọc] https://developers.momo.vn/v3/docs/payment/onboarding/overall/ và https://developers.momo.vn/v3/docs/payment/onboarding/integration-process/
- Trang business.momo.vn tải về rỗng (không đọc được).

**b. Recurring** — [Đã đọc] https://developers.momo.vn/v3/docs/payment/api/wallet/subscription/

- Tạo subscription (`requestType=subscription`) → người dùng uỷ quyền trên trang MoMo → lấy token → merchant gọi `subscription/pay`.
- Nguyên văn: "When the subscription reaches the payment date, Merchant can make the payment request without user confirmation". **Merchant tự kích hoạt**, MoMo không tự trừ.
- Tần suất: DAILY … MONTHLY … YEARLY.
- `subscription/manage` hỗ trợ `pause`, `cancel`, `reactivate`. Hai lần trừ thất bại do thiếu tiền thì MoMo tự tạm dừng token. Khi người dùng huỷ trong app MoMo, MoMo gọi về merchant và merchant phải trả HTTP 204.

**Refund.** Toàn phần hoặc một phần; idempotency bằng `requestId`; không nêu hạn refund — [Đã đọc] https://developers.momo.vn/v3/docs/payment/api/payment-api/refund/

**c/d. Tiền tệ, phí.** Phí không công khai (không tìm thấy) — **chưa rõ**.

**e. Sandbox.** Có Test environment — [Đã đọc] (trang onboarding ở trên)

**f. IPN.** POST JSON; "You need to respond with HTTP code 204 (No Content)!" trong **15 giây**; phải kiểm `signature`; chính sách retry không nêu — [Đã đọc] https://developers.momo.vn/v3/docs/payment/api/result-handling/notification/

**h. Node.** Không thấy SDK Node chính thức — **chưa rõ**.

### 3.7 ZaloPay

- **Onboarding.** Gửi hồ sơ ký hợp đồng và đơn đăng ký merchant cho BD → được cấp tài khoản Merchant Portal → tích hợp → QC → ZaloPay duyệt và cấp appid/key production. Tài liệu không nêu loại hình được phép — [Đã đọc] http://docs.zalopay.vn/docs/guides/integration-guide/intro/
- **Recurring (Auto Debit / agreement pay).**
  - "Auto Debit is a payment solution which allows merchants can debit money from user balances" sau khi người dùng ký agreement (binding hết hạn sau 15 phút nếu chưa xác nhận); merchant gọi PayByToken — [Đã đọc] http://docs.zalopay.vn/docs/guides/payment-acceptance/tokenization/wallet-token/
  - Lệnh Pay có thể trả về `verification_required` (cần người dùng xác minh) → không bảo đảm trừ tiền hoàn toàn không cần người dùng — [Đã đọc] http://docs.zalopay.vn/docs/guides/payment-acceptance/authorize-payment/intro/
- **Sandbox.** `sb-openapi.zalopay.vn` — [Đã đọc] (cùng trang)
- **Callback** — [Đã đọc] http://docs.zalopay.vn/docs/developer-tools/knowledge-base/callback/
  - POST JSON; HMAC trên `data` bằng `key2`; trả `return_code`.
  - Retry chỉ thấy trong comment code mẫu ("up to 3 times"), không phải chính sách chính thức.
  - Sau 15 phút không có callback thì merchant phải tự gọi QueryOrder.
- **Phí:** chưa rõ.

### 3.8 payOS (Casso, chuyển khoản VietQR)

- **a/c.** "payOS là cổng thanh toán sử dụng chính tài khoản ngân hàng của người dùng để xác nhận thanh toán"; "Tiền về trực tiếp tài khoản ngân hàng"; dành cho "cá nhân kinh doanh, MMO, freelancer"; kênh thu chỉ cần CCCD — [Đã đọc] https://payos.vn/
- **d.** "Cổng thanh toán miễn phí"; khuyến mãi gói BIDV-1K (1.000 giao dịch/năm) tới 31/12/2026. Trang bảng giá `payos.vn/bang-gia/` trả 404 → các gói khác **chưa rõ** — [Đã đọc] https://payos.vn/
- **b.** Không thấy recurring/subscription; FAQ không có quy trình refund. Nếu khách chuyển sai số tiền thì ngân hàng hoàn tiền và đơn không được xác nhận — [Đã đọc] https://payos.vn/docs/cau-hoi-thuong-gap. **[Suy luận]** Refund thực tế là chuyển khoản tay.
- **e.** "payOS không cung cấp môi trường test (sandbox/staging) riêng biệt"; test bằng giao dịch thật giá trị nhỏ — [Đã đọc] https://payos.vn/docs/moi-truong-test
- **f.** Webhook trả về `orderCode`, `amount`, `reference`, `transactionDateTime`, `paymentLinkId`, …; merchant trả 2xx — [Đã đọc] https://payos.vn/docs/du-lieu-tra-ve/webhook. Chữ ký HMAC-SHA256 bằng checksum key, các khoá sắp alphabet — [Đã đọc] https://payos.vn/docs/tich-hop-webhook/kiem-tra-du-lieu-voi-signature. Không thấy retry hay event ID.
- **h.** `@payos/node`, cùng Python/.NET/PHP/Go — [Đã đọc] https://payos.vn/docs/sdks/intro

### 3.9 OnePay, 2C2P, 9Pay, Payoo

- **OnePay.** Cổng thanh toán qua website/API/payment link; "thẻ mang thương hiệu quốc tế và nội địa". Recurring, phí và tài liệu dev không có trên trang chủ — [Đã đọc] https://www.onepay.vn/. Có cổng dev MTF với tài khoản test — [Thứ cấp] https://www.drupal.org/project/commerce_onepayvn
- **2C2P.** RPP: "2C2P will then combine the card data … to create a recurring schedule" (2C2P tự trừ theo lịch); kênh: Global Card và Local Card — [Đã đọc] https://developer.2c2p.com/docs/direct-api-rpp-recurring-payment-plan. Hỗ trợ MoMo/chuyển khoản VND qua Spreedly (08/2026) — [Thứ cấp] https://developer.spreedly.com/changelog/added-support-for-momo-on-the-2c2p-gateway
- **9Pay, Payoo.** **Chưa khảo sát** trong phiên này.

### 3.10 Apple In-App Purchase

- **Quy tắc** — [Đã đọc] https://developer.apple.com/app-store/review/guidelines/
  - 3.1.1: mở khoá tính năng hay subscription trong app "you must use in-app purchase".
  - 3.1.1(a): entitlement link ra ngoài chỉ ở "specific storefronts". Ở mọi storefront khác, **trừ Mỹ**, app không được có nút/link/CTA dẫn tới cách mua khác.
  - 3.1.2(a): auto-renewable tối thiểu 7 ngày và phải dùng được trên mọi thiết bị của người dùng.
  - 3.1.3(b) Multiplatform: app được cho dùng nội dung/subscription đã mua trên web "provided those items are also available as in-app purchases within the app".
  - Không thấy Việt Nam được nhắc tới. Trang hướng dẫn "dating apps" xác nhận entitlement ACM chỉ cho Hà Lan — [Đã đọc] https://developer.apple.com/support/storekit-external-entitlement/
  - **[Suy luận]** Ở storefront VN, gói Pro bán trong app iOS phải là IAP, và app không được nhắc "mua rẻ hơn trên web".
- **Đăng ký.** Individual không cần D-U-N-S; "sole proprietorship/single person business, enroll as an individual"; organization phải là pháp nhân có D-U-N-S — [Đã đọc] https://developer.apple.com/help/account/membership/D-U-N-S/. Phí $99/năm — [Đã đọc] https://developer.apple.com/programs/whats-included/
- **Phí hoa hồng.** 15% cho developer thuộc Small Business Program (doanh thu ≤ 1 triệu USD năm trước) — [Đã đọc] https://developer.apple.com/app-store/small-business-program/. Mức chuẩn và mức subscription sau năm đầu (ngoài EU) không đọc được trên trang này.
- **Huỷ, refund** — [Đã đọc] https://developer.apple.com/tutorials/data/documentation/storekit/handling-subscriptions-billing.json
  - "Customers may cancel a subscription in the middle of a subscription period, but the subscription remains paid through the end of the same period".
  - Billing retry tới 60 ngày.
  - Refund do khách yêu cầu qua Apple (reportaproblem / support); developer nhận notification — [Đã đọc] https://developer.apple.com/tutorials/data/documentation/storekit/handling-refund-notifications.json
  - Developer có tự refund được không: trang không nói → **chưa rõ**.
- **Server Notifications V2** — [Đã đọc] https://developer.apple.com/tutorials/data/documentation/appstoreservernotifications/notificationtype.json
  - Loại: `SUBSCRIBED`, `DID_RENEW`, `DID_CHANGE_RENEWAL_STATUS`, `DID_FAIL_TO_RENEW`, `GRACE_PERIOD_EXPIRED`, `EXPIRED`, `REFUND`, `REFUND_REVERSED`, `REVOKE`, `DID_CHANGE_RENEWAL_PREF`, `PRICE_INCREASE`, `CONSUMPTION_REQUEST`, …
  - Payload có `notificationUUID` ("Use this value to identify a duplicate notification") và `signedDate` — [Đã đọc] https://developer.apple.com/tutorials/data/documentation/appstoreservernotifications/responsebodyv2decodedpayload.json
  - Trả 200–206 là thành công. V2 retry **5 lần, sau 1, 12, 24, 48, 72 giờ**; sandbox chỉ gửi 1 lần; lấy lại notification bị lỡ bằng Get Notification History — [Đã đọc] https://developer.apple.com/tutorials/data/documentation/appstoreservernotifications/responding-to-app-store-server-notifications.json
- **Thuế VN** (thông báo 21/08/2025) — [Đã đọc] https://developer.apple.com/news/?id=yo2104n5
  - Cá nhân developer ở VN: PIT 2% (thay CIT) và FCT 5% trên commission của Apple.
  - Tổ chức ở VN: "Apple will no longer remit foreign contractor tax (FCT) on sales to end customers. FCT of 5% introduced on Apple's commission".
  - **[Suy luận]** Tổ chức ở VN có thể phải tự kê khai thuế trên doanh thu bán cho khách VN → hỏi kế toán.

### 3.11 Google Play Billing

- **Đăng ký.** Việt Nam ✔ developer registration, ✔ merchant registration; tiền tệ mặc định VND nhưng chú thích ghi developer được trả USD hoặc EUR — [Đã đọc] https://support.google.com/googleplay/android-developer/answer/9306917?hl=en. Wire payout "in USD"; Vietnam có trong danh sách — [Đã đọc] https://support.google.com/googleplay/android-developer/answer/2700656?hl=en
- **Phí.** "15% for automatically renewing subscription products" (thị trường ngoài AU/EEA/JP/UK/US) — [Đã đọc] https://support.google.com/googleplay/android-developer/answer/112622?hl=en
- **User choice billing.** Chỉ ở EEA, AU, BR, ID, JP, ZA, UK, KR, IN, US — **không có VN** — [Đã đọc] https://support.google.com/googleplay/android-developer/answer/13821247?hl=en
- **Vòng đời** — [Đã đọc] https://developer.android.com/google/play/billing/lifecycle/subscriptions
  - Huỷ thì "the user retains access to the content until the end of the current billing cycle"; tước quyền sớm là vi phạm chính sách.
  - Grace period mặc định bật (tối thiểu 1 ngày); account hold mặc định bật (60 ngày trừ grace).
  - Revoke kèm `fullRefund` qua `purchases.subscriptionsv2.revoke`.
  - Không acknowledge trong 3 ngày → tự refund.
  - `subscriptionsv2.get` là "source of truth".
- **RTDN** — [Đã đọc] https://developer.android.com/google/play/billing/rtdn-reference
  - Gửi qua Cloud Pub/Sub.
  - "You must call the Google Play Developer API after receiving Real-time developer notifications to get the complete status".
  - Loại sự kiện: `SUBSCRIPTION_PURCHASED`, `RENEWED`, `CANCELED`, `EXPIRED`, `IN_GRACE_PERIOD`, `ON_HOLD`, `RECOVERED`, `RESTARTED`, `REVOKED`, `PAUSED`, …; `VoidedPurchaseNotification` cho refund (full/partial).
  - Dedupe bằng `messageId`.
- **Thuế VN.**
  - Developer ở VN là hộ kinh doanh/cá nhân → "Google is responsible for determining, charging, and remitting VAT" cho giao dịch với khách VN. Nếu không phải hộ KD/cá nhân → developer tự lo VAT. Phải nộp mã số thuế 12 số — [Đã đọc] https://support.google.com/googleplay/android-developer/answer/138000?hl=en
  - Khấu trừ "5% of withholding tax (WHT) on your gross sales revenue" với hộ KD/cá nhân ở VN — [Đã đọc] https://support.google.com/googleplay/android-developer/answer/9384608?hl=en
  - Một snippet tìm kiếm của cùng trang ghi 2% → **mâu thuẫn**; trang tải trực tiếp hôm nay ghi 5%.

### 3.12 RevenueCat

- **Web.** Ba engine — [Đã đọc] https://www.revenuecat.com/docs/web/overview
  - RevenueCat Billing: cần tài khoản Stripe; bạn là MoR.
  - Stripe Billing: cần Stripe; bạn là MoR, hoặc Stripe nếu dùng Managed Payments.
  - Paddle Billing: cần Paddle; **Paddle là MoR**.
  - **[Suy luận]** Với người bán ở VN không có pháp nhân nước ngoài, chỉ đường Paddle là khả thi; cổng VN không cắm vào RevenueCat được.
- **Phí.** Miễn phí tới $2.500 MTR/tháng, sau đó 1% — [Đã đọc] https://www.revenuecat.com/pricing/
- **Webhook** — [Đã đọc] https://www.revenuecat.com/docs/integrations/webhooks
  - Authorization header tuỳ chọn, hoặc HMAC `X-RevenueCat-Webhook-Signature`.
  - Retry 5 lần (~80 phút); timeout 60 giây.
  - Retry giữ nguyên `id` (dùng để dedupe).
- **Loại sự kiện** — [Đã đọc] https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
  - `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION` (refund = `CANCELLATION` với `cancel_reason=CUSTOMER_SUPPORT`), `UNCANCELLATION`, `EXPIRATION`, `BILLING_ISSUE`, `PRODUCT_CHANGE`, `REFUND_REVERSED`, `NON_RENEWING_PURCHASE`, `TRANSFER`, …
  - Trường: `app_user_id`, `original_transaction_id`, `transaction_id`, `purchased_at_ms`, `expiration_at_ms`, `store`, `environment`, `period_type`.
- **Flutter.** SDK `purchases_flutter` — [Thứ cấp, snippet] https://www.revenuecat.com/docs/getting-started/installation/flutter

### 3.13 Cờ báo về thuế, hoá đơn, pháp lý ở Việt Nam (mức cao, không phải tư vấn)

Đều là **[Thứ cấp]** trừ chỗ ghi khác; cần kế toán hoặc cơ quan thuế xác nhận trước khi quyết định:

- Thuế khoán cho hộ kinh doanh không áp dụng từ 01/01/2026 (khoản 6 Điều 10 Nghị quyết 198/2025/QH15). Hộ kinh doanh chuyển sang tự kê khai theo doanh thu thực tế.
  - Ngưỡng không chịu thuế được nhiều nguồn ghi 500 triệu/năm; một nguồn (MeInvoice) ghi Nghị định 141/2026 nâng lên 1 tỷ → **mâu thuẫn**, chưa xác minh.
  - Nguồn: tổng hợp từ thuvienphapluat.vn (trang trả 403 khi tải) và các trang kế toán.
- Hoá đơn điện tử khởi tạo từ máy tính tiền bắt buộc cho hộ kinh doanh doanh thu ≥ 1 tỷ/năm bán trực tiếp cho người tiêu dùng, từ 01/06/2025 (Nghị định 70/2025/NĐ-CP sửa Nghị định 123/2020) — meinvoice.vn.
- Tài khoản dùng cho kinh doanh phải đứng tên đúng theo giấy chứng nhận hộ kinh doanh, từ 01/03/2026 (Thông tư 25/2025/TT-NHNN). Hộ kinh doanh phải thông báo điện tử mọi tài khoản ngân hàng **và ví điện tử** dùng cho kinh doanh (Nghị định 68/2026/NĐ-CP) — bài trên vnpay.vn ngày 15/05/2026: https://vnpay.vn/tai-khoan-thanh-toan-ho-kinh-doanh-0xz1anvhceql
- Luật Thương mại điện tử 2025 (số 122/2025/QH15) có hiệu lực 01/07/2026; Nghị định 248/2026/NĐ-CP hướng dẫn. Có yêu cầu xác thực danh tính người bán trên sàn TMĐT — baolaocai.vn, vneconomy.vn. Việc tự bán trên website riêng có phải thông báo Bộ Công Thương không: **chưa xác minh**.
- **[Suy luận]** Khác biệt theo mô hình:
  - Bán qua cổng VN (VNPay, MoMo, payOS…): chủ dự án là người bán trực tiếp → nghĩa vụ hoá đơn/thuế theo loại hình của chính mình.
  - Bán qua MoR hay store: MoR/store là người bán cho khách (lo VAT phía khách). Store còn khấu trừ thuế cho cá nhân VN (Google 5% WHT; Apple PIT 2%). Nhưng khoản payout vẫn là thu nhập của chủ dự án tại VN.

---

## 4. Hệ quả cho "billing port" của Bước 5

Mục này mô tả **những gì port phải biểu diễn được** để mọi nhà cung cấp ở trên cắm vào được sau này. Không phải phương án
thiết kế đã chọn.

### 4.1 Hai mô hình nguồn gốc của một kỳ Pro

```
(A) Nhà cung cấp tự gia hạn                 (B) App tự gia hạn
Stripe Billing, Paddle, LS, Dodo, Polar,    VNPay, payOS, ZaloPay/MoMo đơn lẻ,
Apple IAP, Google Play, RevenueCat          (MoMo subscription, ZaloPay agreement pay
                                             = app chủ động gọi trừ tiền)
provider ──webhook──▶ inbox ──▶ entitlement  gateway ──IPN──▶ inbox ──▶ entitlement
  (renew/cancel/expire do provider quyết)     (app tự tính hết hạn 30/365 ngày;
                                               "gia hạn" = lần mua mới hoặc lệnh
                                               trừ tiền do scheduler của app tạo)
```

- (A) Thời điểm hết quyền (`period_end`) **lấy từ nhà cung cấp**: Stripe `current_period_end`, Apple `expiresDate` trong JWS, Google `subscriptionsv2`, RevenueCat `expiration_at_ms`.
- (B) Thời điểm hết quyền do app tính từ thời điểm thanh toán thành công cộng 30 hoặc 365 ngày — **[Suy luận]**. Port phải phân biệt "thanh toán một lần biến thành N ngày Pro" với "subscription do provider quản lý".

### 4.2 Loại sự kiện chuẩn hoá cần có

| Sự kiện chuẩn hoá | Ví dụ nguồn (đã đọc ở mục 3) |
|---|---|
| `payment_succeeded` (một lần, mô hình B) | VNPay IPN `vnp_ResponseCode=00` / `TransactionStatus=00`; payOS webhook `code`; MoMo `resultCode=0` |
| `subscription_started` | Stripe `invoice.paid` lần đầu / `customer.subscription.created`; Paddle `subscription.activated`; Apple `SUBSCRIBED`; Google `SUBSCRIPTION_PURCHASED`; RevenueCat `INITIAL_PURCHASE` |
| `renewed` | Stripe `invoice.paid`; Paddle `transaction.completed`; Apple `DID_RENEW`; Google `SUBSCRIPTION_RENEWED`; RevenueCat `RENEWAL` |
| `renewal_failed` / `billing_issue` (vào grace) | Stripe `invoice.payment_failed`, `past_due`; Paddle `subscription.past_due`; Apple `DID_FAIL_TO_RENEW`; Google `IN_GRACE_PERIOD`; RevenueCat `BILLING_ISSUE` |
| `grace_ended` / `on_hold` (khoá quyền, chưa hết hẳn) | Apple `GRACE_PERIOD_EXPIRED`; Google `SUBSCRIPTION_ON_HOLD`; Stripe `unpaid` |
| `cancel_scheduled` (tắt auto-renew, **vẫn còn quyền tới hết kỳ**) | Stripe `cancel_at_period_end=true`; Paddle `scheduled_change`; Apple `DID_CHANGE_RENEWAL_STATUS` (off); Google `SUBSCRIPTION_CANCELED`; RevenueCat `CANCELLATION` (không do refund) |
| `cancel_unscheduled` (bật lại) | Stripe `cancel_at_period_end=false`; Google `SUBSCRIPTION_RESTARTED`; RevenueCat `UNCANCELLATION` |
| `expired` (hết quyền) | Stripe `customer.subscription.deleted`; Paddle `subscription.canceled`; Apple `EXPIRED`; Google `SUBSCRIPTION_EXPIRED`; RevenueCat `EXPIRATION`; mô hình B: app tự sinh khi tới `period_end` |
| `revoked` (cắt ngay) | Google `SUBSCRIPTION_REVOKED`; Apple `REVOKE` (Family Sharing) |
| `refunded` (toàn phần/một phần, có số tiền) | Stripe refund; Paddle `adjustment.*` (có trạng thái chờ duyệt); Apple `REFUND`; Google `VoidedPurchaseNotification` (`refundType`); VNPay `02`/`03`; MoMo refund; RevenueCat `CANCELLATION` + `CUSTOMER_SUPPORT` |
| `refund_reversed` | Apple `REFUND_REVERSED`; RevenueCat `REFUND_REVERSED` |
| `plan_changed` (tháng ↔ năm) | Stripe update subscription + proration; Paddle `proration_billing_mode`; Apple `DID_CHANGE_RENEWAL_PREF`; RevenueCat `PRODUCT_CHANGE` |
| `dispute` / chargeback | Stripe disputes (MoR tự xử lý); Google revoke khi chargeback |

### 4.3 Trường dữ liệu port phải giữ

- `provider` và `environment` (sandbox/production). Apple, RevenueCat và Paddle đều tách hai môi trường; payOS không có sandbox.
- **Khoá dedupe**: `external_event_id` khi có — Stripe `evt_…`, Paddle `event_id`, Apple `notificationUUID`, Google Pub/Sub `messageId`, RevenueCat `id`, Dodo `webhook-id`. Khi không có (VNPay, payOS, MoMo, ZaloPay), dùng khoá ghép thay thế: mã đơn của merchant + mã giao dịch của gateway (vd. `vnp_TxnRef` + mã GD VNPAY; `orderCode` + `reference`). Stripe có thể sinh hai Event khác ID cho cùng một việc → cần thêm khoá phụ `object.id` + `type`.
- `external_subscription_id` / chuỗi giao dịch gốc (Stripe subscription ID, Paddle `sub_…`, Apple `originalTransactionId`, Google `purchaseToken`, RevenueCat `original_transaction_id`) và `external_payment_id`.
- **Liên kết với user của app**: RevenueCat `app_user_id` (Đã đọc). VNPay `vnp_TxnRef` và payOS `orderCode` do app tự đặt nên tự map được (Đã đọc). Cách gắn user cho Stripe/Paddle (metadata/custom data), Apple (`appAccountToken`) và Google (`obfuscatedAccountId`) **chưa đọc** — [Suy luận].
- `plan` (monthly/yearly), `period_start`, `period_end`, `occurred_at` theo đồng hồ của provider: Paddle `occurred_at`, Apple `signedDate`, Google `eventTimeMillis`. Stripe `created` chỉ có độ phân giải giây và Stripe khuyên **không** dùng nó để xếp thứ tự.
- `amount`, `currency`, `refund_amount`. Cẩn thận đơn vị: VNPay gửi số tiền ×100; MoMo trên Stripe giới hạn 15.000–12.000.000 VND/giao dịch.
- `raw_payload`, kết quả xác minh chữ ký, `received_at`.

### 4.4 Thứ tự và trạng thái

- Không bên nào cam kết thứ tự. Stripe nói rõ không đảm bảo; Paddle bảo dùng `occurred_at`; Dodo nói "may arrive out of order"; Google thì webhook chỉ báo "đã đổi", phải gọi `subscriptionsv2.get`.
- Port cần một trong hai cách (hoặc cả hai):
  - (i) so `occurred_at` để bỏ sự kiện cũ hơn trạng thái đã có;
  - (ii) coi webhook là "tín hiệu" rồi **đọc lại trạng thái hiện tại** từ API của provider (Stripe, Google; Apple có Get All Subscription Statuses).
- Ở mô hình B, app là nguồn sự thật nên chỉ cần idempotent theo mã giao dịch.

### 4.5 Hợp đồng xác nhận (ack) khác nhau → adapter riêng cho từng provider

| Provider | Phản hồi để dừng retry | Retry | Lấy lại sự kiện bị lỡ |
|---|---|---|---|
| Stripe | 2xx, trả nhanh | Live tới 3 ngày; sandbox 3 lần | Resend 15 ngày (Dashboard) / 30 ngày (CLI) |
| Paddle | 200 trong 5 giây | Live 60 lần/3 ngày; sandbox 3 lần/15 phút | Replay qua API |
| Apple | HTTP 200–206 | 5 lần: 1/12/24/48/72 giờ; sandbox 1 lần | Get Notification History |
| Google | Ack Pub/Sub | Theo Pub/Sub (chưa đọc chi tiết) | Voided Purchases API; `subscriptionsv2.get` |
| VNPay | JSON `RspCode` `00` hoặc `02` | Tối đa 10 lần, cách 5 phút | `querydr` |
| MoMo | **HTTP 204** trong 15 giây | Chưa rõ | Chưa đọc |
| ZaloPay | JSON `return_code` | "Tối đa 3 lần" (code mẫu) | QueryOrder sau 15 phút |
| payOS | 2xx | Chưa rõ | Chưa rõ |
| RevenueCat | 200 trong 60 giây | 5 lần (~80 phút) | Retry thủ công trên Dashboard |
| Dodo | 2xx trong 30 giây | 8 lần (tới ~10 giờ) | Replay trên Dashboard |

**[Suy luận]** Nên ghi vào inbox trước rồi mới ack. Mã phản hồi phải theo đúng từng provider: vd. VNPay cần `02` khi trùng; MoMo cần 204 chứ không phải 200.

### 4.6 Liên quan tới hai câu hỏi mở của Bước 5

- **Quota AI của người mua gói năm** (làm mới theo tháng hay theo năm). Không provider nào xử lý chuyện này. Với gói năm, kỳ thanh toán của provider là 1 năm (`period_start` → `period_end`). Nếu muốn quota theo tháng, app phải tự chia cửa sổ tháng trong kỳ năm — **[Suy luận]**.
- **Huỷ giữa năm** — mỗi nơi xử lý khác nhau:
  - Apple: khách huỷ thì "remains paid through the end of the same period"; refund do Apple xử lý (Đã đọc).
  - Google: giữ quyền tới hết kỳ là **chính sách bắt buộc**; developer có thể revoke kèm full refund (Đã đọc); refund theo tỷ lệ qua `revoke` chưa xác minh.
  - Stripe: tự chọn huỷ ngay hay cuối kỳ, refund prorated/toàn bộ/không (Đã đọc). Managed Payments: Stripe có thể tự refund trong 60 ngày (Đã đọc).
  - Paddle: huỷ hiệu lực cuối kỳ; mặc định không refund, trừ quyền luật định 5–14 ngày theo vùng và refund tuỳ ý trong 14 ngày (Đã đọc).
  - Cổng VN: không có khái niệm subscription; refund toàn phần/một phần qua API (VNPay, MoMo — Đã đọc) → chính sách hoàn tiền do app tự định.
  - **[Suy luận]** Port phải chấp nhận cả refund **không do app khởi xướng** (store, MoR) và phải tách "huỷ" khỏi "hết quyền".
- **Một người dùng, nhiều nguồn**: Apple 3.1.3(b) cho phép app iOS công nhận Pro mua trên web nếu Pro cũng bán qua IAP trong app (Đã đọc) → một user có thể có entitlement từ hai nguồn cùng lúc — **[Suy luận]**.

---

## 5. Câu hỏi còn mở / chưa đọc được

**Phí các cổng VN.** VNPay, MoMo, ZaloPay, OnePay không công khai biểu phí. Bảng giá payOS (`payos.vn/bang-gia/`) trả 404. Cần xin báo giá trực tiếp.

**Điều kiện mở tài khoản.**

- VNPay: trang đăng ký 404, trang tài liệu `vnpayment.vnpay.vn` không phân giải DNS; danh mục hồ sơ chỉ có từ snippet.
- MoMo: business.momo.vn tải về rỗng.
- ZaloPay: không nêu loại hình được phép.
- → Cá nhân chưa đăng ký kinh doanh dùng được những cổng nào (ngoài payOS) vẫn **chưa xác minh**.

**Recurring ở VN.**

- VNPay: thanh toán bằng token có bắt OTP mọi lần không (trang chỉ mô tả luồng redirect + OTP).
- MoMo subscription: loại merchant nào được dùng, hạn mức bao nhiêu, retry IPN thế nào.
- ZaloPay agreement pay: khi nào trả về `verification_required`.

**Paddle.**

- Thực tế có duyệt người bán cá nhân ở VN không (chỉ biết VN không bị loại).
- Có thu/nộp VAT Việt Nam cho khách VN không.
- Payout về ngân hàng VN bằng tiền gì, mất phí gì.
- Có phương thức thanh toán nội địa VN không.

**Lemon Squeezy.** Ngày ngừng nhận merchant hoặc chuyển bắt buộc sang Managed Payments: không có trong bài 28/01/2026. Chi tiết webhook (header, retry, event list) chưa đọc được.

**Polar.** Stripe Connect Express có cho loại "individual" ở VN không. Chi tiết subscription và webhook chưa đọc.

**Stripe Atlas.** Founder ở VN có đủ điều kiện không, và nghĩa vụ thuế/kế toán hằng năm của công ty Mỹ thuộc sở hữu nước ngoài gồm những gì. Trang Atlas không nêu. Ngoài ra: MoMo trên Stripe đang waitlist, không biết khi nào GA.

**Apple.**

- Mức hoa hồng chuẩn và mức subscription sau năm đầu (ngoài EU) chưa đọc.
- Trang tài liệu External Purchase là JS, tải về rỗng → danh sách storefront đầy đủ chưa đọc; chỉ biết từ Review Guidelines là ngoài Mỹ thì cấm link ra ngoài, trừ storefront có entitlement.
- Hộ kinh doanh ở VN đăng ký Apple dạng individual hay organization: hộ KD không phải pháp nhân nên có thể là individual — **[Suy luận]**.
- Developer có tự refund được không: chưa rõ.

**Google.** Tỷ lệ khấu trừ 5% (trang tải hôm nay) khác 2% (snippet tìm kiếm). Chưa đọc chi tiết retry của Pub/Sub và cách gắn user (`obfuscatedAccountId`).

**Thuế, pháp lý VN** (mục 3.13 đều là Thứ cấp):

- Ngưỡng 500 triệu hay 1 tỷ.
- Nghĩa vụ hoá đơn điện tử khi bán dịch vụ số cho người tiêu dùng.
- Thông báo website với Bộ Công Thương theo Luật TMĐT 2025.
- Quy định hoàn tiền theo luật bảo vệ người tiêu dùng VN: chưa khảo sát.
- Cách kê khai payout từ MoR hay store nước ngoài.
- → Cần kế toán hoặc tư vấn thuế.

**Chưa khảo sát.** 9Pay, Payoo, Gumroad, FastSpring, 2Checkout.

**Trang không tải được.**

- `vnpay.vn/dang-ky-merchant` (404), `payos.vn/bang-gia/` (404), `vnpayment.vnpay.vn` (ENOTFOUND)
- thuvienphapluat.vn (403)
- `developer.apple.com/documentation/storekit/external-purchase` (nội dung rỗng)
- `business.momo.vn` (nội dung rỗng)
- `developer.paddle.com/webhooks/overview.md` (404 — đã đọc bản không có `.md`)
