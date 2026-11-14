# Vòng đời subscription: gia hạn lỗi, huỷ, hoàn tiền, đổi gói, đổi giá, trial (19/10/2026)

Mục đích: đầu vào cho Bước 5 (billing port trung lập + fake provider). Trả lời câu chủ dự án hỏi: "gia hạn mà trừ tiền lỗi
thì sao?", và các trường hợp kề bên mà design phải quyết tiếp. Tài liệu này **không chọn phương án** (luật repo: chủ dự án
trả lời trước). Bối cảnh nhà cung cấp (ai mở được ở VN, phí, webhook, dedupe) đã có ở
`docs/preparation/PAYMENT_PROVIDERS_RESEARCH_2026-10-18.md`; ở đây không nhắc lại.

**Nhãn nguồn** (mỗi khẳng định có URL + nhãn):

- **Đã đọc (chính thức)** = đọc trên trang của chính công ty/cơ quan trong phiên 19/10/2026.
- **Thứ cấp** = bài bên thứ ba, bản chép lại, hoặc đoạn trích của công cụ tìm kiếm; chưa đối chiếu với bản gốc.
- **Suy luận** = suy luận của người viết; cần kiểm tra trước khi dùng.

Phần luật Việt Nam chỉ ở mức cao, **không phải tư vấn pháp lý**. Con số (ngày, %, lần) chỉ ghi khi đọc được trong phiên.

---

## 1. Tóm tắt

- **Trừ tiền gia hạn lỗi không có nghĩa là mất khách ngay.** Nơi bán tự thử trừ lại một thời gian (Apple tới 60 ngày; Google
  mặc định 60 ngày; Stripe khuyên 8 lần trong 2 tuần; Paddle 30 ngày) và gửi email nhắc.
- Thời gian thử lại có **hai giai đoạn**: grace period (người dùng **vẫn dùng** Pro) rồi account hold / past_due kéo dài (**khoá**
  Pro nhưng chưa huỷ). Trả được tiền thì mở lại; hết hạn thử thì subscription hết hẳn.
- **Mobile: Apple/Google quyết phần lớn** (tự thử lại, tự gửi email, bắt app cho dùng trong grace và khoá khi hold). Web qua
  Stripe/Paddle: app chọn độ dài và cách xử lý. Cổng VN (VNPay, MoMo): app tự làm hết.
- App lớn làm khác nhau: YouTube Premium cho 3 ngày rồi "tạm dừng" 30 ngày; Spotify giữ Premium "vài ngày"; Netflix báo
  "account on hold" và thử lại trong kỳ.
- **Huỷ gói**: chuẩn chung là dùng tới hết kỳ đã trả, không hoàn phần còn lại (Apple, Google bắt buộc; Spotify, YouTube làm vậy).
  Nhưng Luật Bảo vệ quyền lợi người tiêu dùng 2023, Điều 42 cho người dùng chấm dứt dịch vụ liên tục bất cứ lúc nào, chỉ trả
  phần đã dùng, "trừ trường hợp có thỏa thuận khác" → với gói năm cần hỏi luật sư.
- **Hoàn tiền / chargeback** từ store, MoR hay ngân hàng đến bất ngờ (có thể một phần, có thể bị đảo ngược); app phải quyết cắt
  quyền ngay hay không.
- **Đổi tháng ↔ năm**: nơi đổi ngay có bù tiền, nơi đợi hết kỳ; trên Apple tuỳ cách xếp hạng gói trong subscription group.
- **Trial 7 ngày**: ca khó là lần trừ đầu lỗi, huỷ giữa trial, và người đã trial hoặc đã được hoàn tiền quay lại.

---

## 2. Gia hạn lỗi (failed renewal)

### 2.1 Apple App Store

- **Billing retry**: lỗi thanh toán đưa subscription vào trạng thái billing retry, App Store thử thu tiền "for up to 60 days".
  Nếu khôi phục trong 60 ngày, ngày tính tiền mới là ngày khôi phục — **Đã đọc (chính thức)**
  https://developer.apple.com/tutorials/data/documentation/storekit/reducing-involuntary-subscriber-churn.json
- **Billing Grace Period** (bật trong App Store Connect, áp cho **mọi** subscription của app, không chỉnh theo từng sản phẩm):
  chọn **3, 16 hoặc 28 ngày**; gói tuần bị giới hạn 3 hoặc 6 ngày. Trong grace, người dùng vẫn truy cập nội dung trả phí
  trong khi Apple tiếp tục thu tiền. Khôi phục trong grace thì không gián đoạn số ngày trả phí lẫn doanh thu. Tắt grace thì
  "days of paid service pause" tới khi Apple thu được tiền — **Đã đọc (chính thức)**
  https://developer.apple.com/help/app-store-connect/manage-subscriptions/enable-billing-grace-period-for-auto-renewable-subscriptions
- **Grace có áp cho trial chuyển sang trả phí không**: developer chọn "All Renewals" (gồm cả free intro offer chuyển sang trả
  phí) hoặc "Only Paid to Paid Renewals" (đang ở kỳ free thì không có grace) — **Đã đọc (chính thức)**, cùng trang trên.
- **App phải làm gì**: trong grace "provide full service"; sự kiện `DID_FAIL_TO_RENEW` có subtype `GRACE_PERIOD` thì tiếp tục
  phục vụ, subtype rỗng thì "you can stop providing the subscription service"; `GRACE_PERIOD_EXPIRED` thì "you can turn off
  access"; khôi phục là `DID_RENEW` subtype `BILLING_RECOVERY`; hết 60 ngày không thu được là `EXPIRED` subtype
  `BILLING_RETRY`. Apple khuyên báo người dùng có thể có vấn đề với thông tin thanh toán — **Đã đọc (chính thức)**
  https://developer.apple.com/tutorials/data/documentation/appstoreservernotifications/notificationtype.json
- **Thông báo cho người dùng**: từ iOS 16.4, nếu subscription không gia hạn được, "a system-provided sheet appears in your app
  upon launch"; app có thể deep link tới `https://apps.apple.com/account/billing` — **Đã đọc (chính thức)**
  https://developer.apple.com/app-store/subscriptions/ và
  https://developer.apple.com/tutorials/data/documentation/storekit/handling-subscriptions-billing.json
- Quá trình gia hạn bắt đầu kiểm tra 10 ngày trước hạn; trong 24 giờ trước hạn App Store bắt đầu thử gia hạn tự động —
  **Đã đọc (chính thức)**, trang handling-subscriptions-billing ở trên.
- Ai quyết: **Apple** quyết lịch thử lại (60 ngày) và email; **app** chỉ chọn bật grace hay không, độ dài 3/16/28, áp cho trial
  hay không, và cho dùng hay khoá ngoài grace — **Suy luận** từ các trang trên.

### 2.2 Google Play

- **Grace period**: mặc định bật cho mọi base plan auto-renew; chỉnh độ dài hoặc tắt trong Play Console; đặt ngắn hơn mặc định
  "may reduce the number of subscriptions recovered". Đặt 0 ngày thì Play vẫn chờ tối thiểu 1 ngày. Trong grace người dùng
  "should still have access"; RTDN `SUBSCRIPTION_IN_GRACE_PERIOD`, state `SUBSCRIPTION_STATE_IN_GRACE_PERIOD`; khôi phục trong
  grace thì ngày gia hạn **không** đổi — **Đã đọc (chính thức)**
  https://developer.android.com/google/play/billing/lifecycle/subscriptions
- **Độ dài grace mặc định / các lựa chọn**: trang chính thức **không ghi**. RevenueCat ghi lựa chọn 3, 7, 14, 30 ngày cho kỳ
  tháng trở lên — **Thứ cấp**
  https://www.revenuecat.com/guides/google-play-billing/payment-recovery-grace-period-and-account-hold
- **Account hold**: mặc định bật, độ dài "60 days minus any grace period duration"; khi vào hold "you should block access";
  RTDN `SUBSCRIPTION_ON_HOLD`; trả được tiền thì `SUBSCRIPTION_RECOVERED` và **ngày gia hạn reset**; hết hold không trả được thì
  `SUBSCRIPTION_CANCELED` rồi ngay sau đó `SUBSCRIPTION_EXPIRED`. Trước hold, Play thử thêm tới 48 giờ và người dùng vẫn giữ
  quyền — **Đã đọc (chính thức)**, trang lifecycle ở trên.
- Grace + hold cộng lại phải ít nhất 30 ngày; giảm dưới mặc định có thể giảm số subscription cứu được — **Đã đọc (chính thức)**
  https://support.google.com/googleplay/android-developer/answer/12154973?hl=en
- RevenueCat ghi "account hold can last up to 30 days" — **Thứ cấp**, **mâu thuẫn** với trang chính thức (60 ngày trừ grace);
  ưu tiên trang chính thức.
- Phía người dùng: thanh toán lỗi thì "may have a grace period", có thể bị hold "for up to 60 days during which you can't use
  the subscription", Play thử lại định kỳ, hết hạn thì tự huỷ — **Đã đọc (chính thức)**
  https://support.google.com/googleplay/answer/2476088?hl=en
- Ai quyết: **Google** thử lại và gửi thông báo; **app** chọn độ dài grace/hold; quyền truy cập theo trạng thái là **quy định
  Google đặt ra** (grace: cho dùng, hold: khoá) — **Suy luận** từ các trang trên.

### 2.3 Stripe Billing (chỉ tham khảo: Stripe không mở cho người bán ở VN, xem file 18/10)

- **Smart Retries**: AI chọn thời điểm thử lại; cấu hình số lần trong 1 tuần, 2 tuần, 3 tuần, 1 tháng hoặc 2 tháng; mặc định
  khuyên **8 lần trong 2 tuần**. Hoặc lịch tự đặt (tối đa 3 lần, mỗi lần cách N ngày). Không thử lại khi không có phương thức
  thanh toán hoặc gặp "hard decline" (`lost_card`, `stolen_card`, `authentication_required`…) — **Đã đọc (chính thức)**
  https://docs.stripe.com/billing/revenue-recovery/smart-retries
- **Hết thử lại thì sao** (developer chọn): `canceled`; `unpaid` (vẫn sinh invoice draft, không thu); giữ `past_due`; hoặc
  `paused` — **Đã đọc (chính thức)**, cùng trang.
- **Trạng thái và quyền truy cập**: `past_due` = invoice mới nhất lỗi hoặc chưa thu, Stripe "might retry" nhưng không đảm bảo;
  với `unpaid` Stripe ghi rõ "Revoke access to your product when the subscription is `unpaid`". Trang **không** ra lệnh cắt quyền
  khi `past_due` — **Đã đọc (chính thức)** https://docs.stripe.com/billing/subscriptions/overview
- **Email dunning**: bật "Send emails when card payments fail" thì Stripe gửi email sau **mỗi** lần trừ lỗi, kèm link cập nhật
  thẻ; có email báo thẻ sắp hết hạn (1 tháng trước), nhắc gia hạn, nhắc xác thực 3DS. Sandbox không tự gửi — **Đã đọc
  (chính thức)** https://docs.stripe.com/billing/revenue-recovery/customer-emails
- Sự kiện: `invoice.payment_failed` (có `attempt_count`), `customer.subscription.updated` (sang `past_due`/`unpaid`),
  `customer.subscription.deleted` — **Đã đọc (chính thức)**, trang overview và smart-retries ở trên.
- Ai quyết: **app** chọn gần như mọi thứ (số lần, độ dài, trạng thái cuối, có cắt quyền khi `past_due` hay không) — **Suy luận**.

### 2.4 Paddle Billing

- Không bật Retain: thanh toán lỗi trên subscription tự thu được "retried up to seven times over a 30-day window before they're
  canceled"; subscription sang `past_due` — **Đã đọc (chính thức)**
  https://developer.paddle.com/build/retain/configure-payment-recovery-dunning
- Bật Paddle Retain: mặc định dunning 30 ngày; tối đa **4 email** (ngày 1, 3, 5, 7, thời điểm do thuật toán), có thông báo
  trong app (cần Paddle.js trên trang công khai), tuỳ chọn SMS; hết hạn thì developer chọn **pause hoặc cancel**; "canceled
  subscriptions can't be reinstated". Retain chỉ chạy với dữ liệu live, không test được bằng sandbox — **Đã đọc (chính thức)**
  https://developer.paddle.com/build/lifecycle/subscription-renewal-dunning và
  https://developer.paddle.com/concepts/retain/payment-recovery-dunning
- **Quyền truy cập theo khuyến nghị Paddle**: `past_due` = **Full** access, "show a banner and link to the customer portal";
  `paused` = none hoặc read-only; `canceled` = none — **Đã đọc (chính thức)**
  https://developer.paddle.com/build/subscriptions/provision-access-webhooks.md
- Sự kiện `subscription.past_due`: thử lại theo cấu hình; thành công thì quay về `active` (`subscription.updated`); hết lần thì
  paused hoặc canceled — **Đã đọc (chính thức)**
  https://developer.paddle.com/webhooks/subscriptions/subscription-past-due.md
- Không thay đổi được subscription đang `past_due` (đổi gói bị chặn) — **Đã đọc (chính thức)**
  https://developer.paddle.com/build/subscriptions/replace-products-prices-upgrade-downgrade

### 2.5 Cổng Việt Nam

- **MoMo subscription**: merchant tự gọi trừ tiền. "If transaction is failed 2 times due to insufficient funds, MoMo will
  deactivate the subsToken"; MoMo gọi về merchant `requestType=lock`; người dùng phải tự kích hoạt lại trong app MoMo. Mã lỗi
  2007 (token bị khoá), 2015 (chưa tới kỳ), 2016 (quá kỳ). Trang **không** nêu lịch thử lại hay email báo lỗi cho người dùng —
  **Đã đọc (chính thức)** https://developers.momo.vn/v3/docs/payment/api/wallet/subscription/
- **VNPay token**: `token_pay` là redirect trình duyệt; luồng mô tả người dùng nhập OTP ngân hàng; không thấy trừ tiền
  server-to-server, định kỳ hay retry — **Đã đọc (chính thức)**
  https://sandbox.vnpayment.vn/apis/docs/thanh-toan-token/token.html
- **Suy luận**: với cổng VN, "gia hạn lỗi" nghĩa là người dùng không trả kỳ mới (VNPay) hoặc lệnh trừ của app bị từ chối
  (MoMo). Lịch thử lại, email nhắc, grace, khoá quyền đều do **app tự làm**; với MoMo chỉ còn 1 lần thử thất bại do thiếu tiền
  trước khi token bị khoá.

### 2.6 Ứng dụng tiêu dùng làm gì

| App | Khi trừ tiền gia hạn lỗi | Nguồn |
|---|---|---|
| YouTube Premium | Email báo; **3 ngày** để sửa trước khi mất quyền, trong lúc đó thử lại; sau đó "Paused" **30 ngày**, vẫn thử lại; trả được thì tự khôi phục; hoặc huỷ và đăng ký lại để có quyền ngay | **Đã đọc (chính thức)** https://support.google.com/youtube/answer/9972274?hl=en |
| Spotify | "If a monthly payment fails, you won't immediately lose your Premium"; thử lại "over the next few days". Trang không nói số ngày, không nói khi nào về Free | **Đã đọc (chính thức)** https://support.spotify.com/us/article/failed-payment/ |
| Spotify (bản vùng khác) | Thử lại thất bại thì "your Premium plan will switch to free" | **Thứ cấp** (snippet) https://support.spotify.com/nl-en/article/failed-payment/ |
| Netflix | Thông báo "Your account is on hold because of a problem with your last payment"; Netflix "will automatically retry failed payments periodically during the course of your billing cycle". Trang không nói có xem được trong lúc hold không | **Đã đọc (chính thức)** https://help.netflix.com/en/node/2065 |
| Duolingo | Không đọc được trang chính thức (help center chạy JS, trả về rỗng) | — |
| Quizlet | help.quizlet.com trả 403; tìm kiếm không ra trang chính thức | — |
| Grammarly | Trang billing chỉ nói tự gia hạn bằng phương thức đã lưu, không nói về thanh toán lỗi | **Đã đọc (chính thức)** https://support.grammarly.com/hc/en-us/articles/115000090132 |

**Suy luận**: mẫu chung là "giữ quyền vài ngày + email/banner → khoá nhưng chưa xoá subscription một thời gian → huỷ hẳn";
khác nhau ở độ dài và có nói rõ với người dùng hay không.

---

## 3. Huỷ gói và hoàn tiền theo yêu cầu người dùng

### 3.1 Store

- **Apple**: "Customers may cancel a subscription in the middle of a subscription period, but the subscription remains paid
  through the end of the same period"; huỷ = tắt auto-renew → `DID_CHANGE_RENEWAL_STATUS`; hoàn tiền do khách liên hệ Apple
  (customer support có thể huỷ và hoàn toàn phần hoặc một phần) — **Đã đọc (chính thức)**
  https://developer.apple.com/tutorials/data/documentation/storekit/handling-subscriptions-billing.json
- Apple: khách xin refund qua Apple Support, reportaproblem.apple.com, hoặc ngân hàng phát hành — **Đã đọc (chính thức)**
  https://developer.apple.com/tutorials/data/documentation/storekit/handling-refund-notifications.json. Trang Apple cho người
  dùng không mô tả quy trình refund; có lưu ý huỷ "slightly different" ở Đức, Israel, Nam Phi, Thổ Nhĩ Kỳ — **Đã đọc (chính
  thức)** https://support.apple.com/en-us/118428
- **Google**: huỷ thì "the user retains access to the content until the end of the current billing cycle"; "Don't remove access
  to a subscription from Google Play while the user is still entitled to the content" — **Đã đọc (chính thức)**
  https://developer.android.com/google/play/billing/lifecycle/subscriptions
- Google, phía người dùng: có hai lựa chọn, huỷ cuối kỳ hoặc "Cancel your subscription with immediate effect and lose access" —
  **Đã đọc (chính thức)** https://support.google.com/googleplay/answer/2476088?hl=en
- Google, phía developer (Play Console): refund toàn phần hoặc **một phần** (theo % hoặc số tiền, nhiều lần, không vượt tổng
  đơn); refund đơn gần nhất kèm revoke thì subscription bị gỡ ngay và ngừng gia hạn; refund đơn cũ thì subscription vẫn active;
  "Canceling a subscription doesn't issue a refund"; refund không đảo ngược được — **Đã đọc (chính thức)**
  https://support.google.com/googleplay/android-developer/answer/2741495?hl=en
- Google: quá 48 giờ kể từ khi mua thì người dùng nên liên hệ developer — **Đã đọc (chính thức)**
  https://support.google.com/googleplay/answer/15574897?hl=en. Partial refund cho subscription là chính sách riêng ở
  Israel/Pháp/Đức — **Đã đọc (chính thức)** https://support.google.com/googleplay/answer/2479637?hl=en

### 3.2 Stripe, Paddle

- **Stripe**: huỷ mặc định có hiệu lực **ngay**; hoặc `cancel_at_period_end=true` (dùng hết kỳ đã trả, bật lại được tới hết
  kỳ); hoặc `cancel_at` ngày tuỳ chọn. Dashboard cho chọn refund prorated, refund toàn bộ kỳ cuối, hoặc không refund. Đã
  `canceled` thì không kích hoạt lại được, phải tạo subscription mới — **Đã đọc (chính thức)**
  https://docs.stripe.com/billing/subscriptions/cancel
- Stripe refund: toàn phần hoặc một phần, nhiều lần nhưng không vượt số tiền gốc; phí xử lý ban đầu không được trả lại; sự kiện
  `refund.created`, `charge.refunded`, `refund.failed` — **Đã đọc (chính thức)** https://docs.stripe.com/refunds
- **Paddle**: `effective_from` = `next_billing_period` (mặc định) hoặc `immediately`; huỷ lịch được bằng cách xoá
  `scheduled_change`; đã canceled thì không khôi phục — **Đã đọc (chính thức)**
  https://developer.paddle.com/build/subscriptions/cancel-subscriptions. Trang không nói huỷ ngay có tự refund không.
  Chính sách refund của Paddle cho người mua (mặc định không hoàn, quyền rút lại 5–14 ngày theo vùng) đã ghi trong file 18/10.

### 3.3 Cổng VN và ứng dụng tiêu dùng

- **Cổng VN** không có khái niệm subscription; refund qua API do merchant gọi (xem file 18/10). **Suy luận**: chính sách huỷ và
  hoàn tiền hoàn toàn do Wordmet tự viết và tự thực hiện.
- **Spotify**: "Your Premium stays until your next billing date, then your account switches to free" — **Đã đọc (chính thức)**
  https://support.spotify.com/us/article/cancel-premium/
- **YouTube Premium**: quyền lợi "will continue until the end of the billing period"; "You won't be refunded for the period
  between when you cancel and when your membership ends"; refund chỉ khi tính năng lỗi; đã refund thì mất quyền lợi — **Đã đọc
  (chính thức)** https://support.google.com/youtube/answer/6308278?hl=en và
  https://support.google.com/youtube/answer/12014038?hl=en
- **Duolingo**: giữ Super tới hết kỳ đã trả, không hoàn tiền phần đã dùng dở, refund iOS do Apple xử lý — **Thứ cấp** (đoạn trích
  tìm kiếm của trang duolingo.com/help; trang tải về rỗng vì JS)
  https://www.duolingo.com/help/cancel-my-super-duolingo-subscription

### 3.4 Luật Việt Nam (mức cao, không phải tư vấn pháp lý)

Nguồn đọc được: bản chép Luật Bảo vệ quyền lợi người tiêu dùng số 19/2023/QH15 trên caselaw.vn — **Thứ cấp**
https://caselaw.vn/van-ban-phap-luat/411464-luat-bao-ve-quyen-loi-nguoi-tieu-dung-so-19-2023-qh15-ngay-20-06-2023-cua-quoc-hoi.
Bản trên cổng chính phủ **không tải được** (mục 9). Hiệu lực 01/07/2024 (cùng nguồn).

- Khoản 6 Điều 3: "Cung cấp dịch vụ liên tục là việc cung cấp dịch vụ có thời hạn từ 03 tháng trở lên hoặc không xác định thời
  hạn" — **Thứ cấp**.
- Điều 42 khoản 1: hợp đồng phải lập thành văn bản, người tiêu dùng giữ một bản — **Thứ cấp**.
- Điều 42 khoản 2: hợp đồng theo mẫu phải có, ngoài nội dung chung, việc thông báo **tối thiểu 07 ngày làm việc** trước ngày
  hết hạn sử dụng dịch vụ về khoản phí để tiếp tục dùng, và trước ngày chấm dứt hợp đồng — **Thứ cấp**.
- Điều 42 khoản 3: trừ trường hợp các bên có thỏa thuận khác, người tiêu dùng có quyền đơn phương chấm dứt bất cứ lúc nào (có
  thông báo) và chỉ trả phần dịch vụ đã sử dụng — **Thứ cấp**.
- Điều 41: bên cung cấp không được đơn phương chấm dứt / ngừng dịch vụ không đúng hợp đồng; không được yêu cầu thanh toán trước
  khi cung cấp dịch vụ trừ khi có thỏa thuận — **Thứ cấp** (bản tóm của công cụ đọc, chưa đọc nguyên văn).
- Điều 25 khoản 13: điều khoản cho phép gia hạn hợp đồng mà không quy định trách nhiệm thông báo trước, không cho người tiêu
  dùng lựa chọn, là điều khoản không được có — **Thứ cấp**.
- Điều 38 khoản 3–4 (giao dịch từ xa): nếu bên bán cung cấp thông tin sai/thiếu, người tiêu dùng được chấm dứt trong 30 ngày kể
  từ giao kết và chỉ trả phần đã dùng; bên bán hoàn phần chưa dùng trong 30 ngày — **Thứ cấp**.

**Suy luận cho Wordmet** (cần luật sư xác nhận):

- Gói năm (12 tháng ≥ 3 tháng) và gói tháng tự gia hạn không thời hạn có vẻ rơi vào "dịch vụ liên tục".
- Nếu vậy, khi người dùng huỷ giữa gói năm, mặc định của luật là chỉ trả phần đã dùng → có thể phải hoàn phần còn lại. Câu
  "trừ trường hợp có thỏa thuận khác" có cho phép điều khoản "không hoàn tiền" trong hợp đồng theo mẫu hay không là **câu hỏi
  pháp lý mở**, vì Điều 25 giới hạn điều khoản bất lợi cho người tiêu dùng (chỉ đọc khoản 13).
- Nhắc trước 07 ngày làm việc trước khi gia hạn/thu phí kỳ mới có vẻ là nghĩa vụ khi Wordmet là bên bán trực tiếp (cổng VN).
  Khi bán qua Apple/Google/Paddle, ai là "tổ chức kinh doanh" theo luật VN (store/MoR hay Wordmet) chưa rõ.
- 7 ngày làm việc dài hơn trial 7 ngày lịch: nếu nghĩa vụ áp cho lần thu đầu sau trial thì không thể nhắc đủ 7 ngày làm việc
  trước khi trial hết — cần hỏi luật sư.
- Nghị định 55/2024/NĐ-CP (hướng dẫn luật) **chưa đọc**.

---

## 4. Hoàn tiền / chargeback do store, nhà cung cấp, ngân hàng

| Nguồn | Sự kiện đến | Ý nghĩa và việc app làm | Nhãn |
|---|---|---|---|
| Apple | `REFUND` | App Store đã hoàn tiền giao dịch (kể cả auto-renewable); có `revocationDate`, `revocationReason` | **Đã đọc (chính thức)** [1] |
| Apple | `DID_CHANGE_RENEWAL_STATUS` / `AUTO_RENEW_DISABLED` | Có thể do App Store tự tắt auto-renew "after the customer requested a refund" | **Đã đọc (chính thức)** [1] |
| Apple | `REFUND_DECLINED` | Apple từ chối yêu cầu refund | **Đã đọc (chính thức)** [1] |
| Apple | `REFUND_REVERSED` | Apple đảo ngược refund do tranh chấp; "If your app revoked content or services … it needs to reinstate them" | **Đã đọc (chính thức)** [1] |
| Apple | `CONSUMPTION_REQUEST` | Khách xin refund, Apple hỏi developer dữ liệu sử dụng | **Đã đọc (chính thức)** [1] |
| Apple | `REVOKE` | Quyền qua Family Sharing bị gỡ (người mua tắt chia sẻ, rời nhóm, hoặc được refund) | **Đã đọc (chính thức)** [1] |
| Google | `SUBSCRIPTION_REVOKED` | Revoke trước hạn; state `EXPIRED`; khi backend revoke hoặc giao dịch bị chargeback: "revoke the user's entitlement immediately" | **Đã đọc (chính thức)** [2] |
| Google | `VoidedPurchaseNotification` (`refundType` 1 = full, 2 = partial theo số lượng) | Giao dịch bị void | **Đã đọc (chính thức)** [3] |
| Google | Voided Purchases API | Lý do: user refund, user huỷ, chargeback, developer/Google huỷ hoặc refund; chỉ xem được **30 ngày** gần nhất; developer refund mà không chọn revoke thì API không trả đơn đó | **Đã đọc (chính thức)** [4] |
| Stripe | Dispute (`charge.dispute.*`) | Stripe trừ số tiền tranh chấp + phí dispute khỏi số dư; không refund được khi dispute đang mở; chủ thẻ thường có 120 ngày để mở dispute; trả lời trong 7–21 ngày; cả quá trình 2–3 tháng | **Đã đọc (chính thức)** [5] |
| Stripe | Subscription sau dispute | Mặc định subscription **vẫn chạy** (có thể sinh thêm dispute); bật trong Dashboard để huỷ ngay hoặc huỷ cuối kỳ khi có dispute | **Đã đọc (chính thức)** [6] |
| Stripe | Early fraud warning | Không bắt buộc làm gì; có thể chủ động refund; khoảng 40% EFW Visa/Mastercard thành dispute nếu không refund | **Đã đọc (chính thức)** [5] |
| Paddle | `adjustment.created` / `adjustment.updated` | Paddle tự tạo adjustment `chargeback_warning` hoặc `chargeback`; thắng thì `chargeback_reverse`; refund do merchant tạo ở trạng thái `pending_approval` rồi `approved`/`rejected` | **Đã đọc (chính thức)** [7] |
| Paddle | Ảnh hưởng tới subscription | Trang adjustments **không nói** refund/chargeback có đổi trạng thái subscription không | **Đã đọc (chính thức)** [7] |
| MoMo, VNPay | Refund do merchant gọi API (file 18/10) | Chargeback/khiếu nại qua ngân hàng hay ví: **không tìm thấy** tài liệu | — |

[1] https://developer.apple.com/tutorials/data/documentation/appstoreservernotifications/notificationtype.json
[2] https://developer.android.com/google/play/billing/lifecycle/subscriptions
[3] https://developer.android.com/google/play/billing/rtdn-reference
[4] https://developers.google.com/android-publisher/voided-purchases
[5] https://docs.stripe.com/disputes/how-disputes-work
[6] https://docs.stripe.com/billing/subscriptions/cancel
[7] https://developer.paddle.com/build/transactions/create-transaction-adjustments.md

**Suy luận**:

- Trang Apple không ra lệnh "phải cắt quyền khi `REFUND`", nhưng câu về `REFUND_REVERSED` ngầm hiểu cắt quyền là cách làm
  thường gặp.
- Refund có thể **một phần** (Google partial qua Play Console, Stripe, Paddle `partial`) → port không thể coi mọi refund là
  "hết quyền".
- Chargeback đến muộn (tới 120 ngày với thẻ) và có thể đảo ngược (Apple `REFUND_REVERSED`, Paddle `chargeback_reverse`, Stripe
  "late win") → trạng thái quyền phải đi được cả hai chiều.

---

## 5. Đổi tháng ↔ năm

### 5.1 Apple (subscription group)

- Nâng cấp: "Upgrades of any duration or cross-grades with same durations go into effect immediately"; hạ cấp và crossgrade
  **khác thời hạn** có hiệu lực ở kỳ gia hạn sau — **Đã đọc (chính thức)**
  https://developer.apple.com/tutorials/data/documentation/storekit/handling-subscriptions-billing.json
- Nâng cấp: mở quyền ngay, bắt đầu kỳ mới và "the customer receives a prorated refund for the unused portion"; sự kiện
  `DID_CHANGE_RENEWAL_PREF` subtype `UPGRADE`/`DOWNGRADE`; subtype rỗng = khách đổi ý, huỷ lần hạ cấp — **Đã đọc (chính thức)**
  https://developer.apple.com/tutorials/data/documentation/appstoreservernotifications/notificationtype.json
- Đổi trong cùng group không làm mất "one year of paid service" — **Đã đọc (chính thức)**
  https://developer.apple.com/app-store/subscriptions/
- **Suy luận**: tháng ↔ năm là đổi khác thời hạn. Nếu Wordmet xếp gói tháng và gói năm **cùng cấp** trong group thì đó là
  crossgrade khác thời hạn → đợi kỳ sau. Nếu xếp gói năm **cao hơn** thì tháng → năm là upgrade (ngay, Apple hoàn phần dư), còn
  năm → tháng là downgrade (đợi hết năm). Cách xếp hạng là quyết định của developer trong App Store Connect.

### 5.2 Google Play (replacement mode)

- `WITH_TIME_PRORATION` (mặc định của API): đổi ngay, thời gian còn lại quy ra tiền và đẩy lùi ngày tính tiền kế.
  `CHARGE_PRORATED_PRICE`: đổi ngay, giữ chu kỳ, thu phần chênh (chỉ khi giá theo thời gian tăng). `CHARGE_FULL_PRICE`: đổi ngay,
  thu đủ giá gói mới (ví dụ nêu "shorter to longer billing period"). `WITHOUT_PRORATION`: đổi ngay, giá mới tính khi gia hạn.
  `DEFERRED`: đổi khi gia hạn. Khuyến nghị: nâng cấp dùng `CHARGE_PRORATED_PRICE`, hạ cấp dùng `DEFERRED` — **Đã đọc (chính
  thức)** https://developer.android.com/google/play/billing/subscriptions
- Ví dụ tháng → năm trên trang: $2/tháng sang $36/năm; `CHARGE_PRORATED_PRICE` thu chênh $0,50 rồi $36 mỗi năm từ ngày cũ;
  `CHARGE_FULL_PRICE` thu $36 ngay, cộng ~10 ngày tín dụng; `DEFERRED` giữ gói tháng tới hết kỳ — **Đã đọc (chính thức)**, cùng trang.
- Đổi base plan **trong cùng một subscription** chỉ hợp lệ với `CHARGE_FULL_PRICE` ("Charge immediately") hoặc
  `WITHOUT_PRORATION` ("Charge at the next billing date") — **Đã đọc (chính thức)**, cùng trang.
- **Suy luận**: nếu Wordmet làm tháng và năm là hai base plan của **một** subscription product thì chỉ có hai lựa chọn trên;
  muốn proration kiểu khác thì phải là hai subscription product riêng.

### 5.3 Stripe

- Hai giá khác chu kỳ: "switching a customer from a monthly subscription to a yearly subscription moves the billing date to the
  date of the switch"; reset billing cycle anchor thì Stripe **thu tiền ngay**; thu lỗi thì thay đổi vẫn áp dụng và subscription
  sang `past_due`, trừ khi dùng "pending updates" để chỉ đổi khi thu thành công. Hạ cấp sinh credit proration. Muốn đổi ở cuối kỳ
  thì dùng subscription schedule — **Đã đọc (chính thức)** https://docs.stripe.com/billing/subscriptions/change-price

### 5.4 Paddle

- Đổi tần suất: thay mọi price recurring bằng price chu kỳ mới (mọi item phải cùng chu kỳ); chế độ cho phép:
  `prorated_immediately`, `full_immediately`, `do_not_bill`; `on_payment_failure` mặc định `prevent_change`; không đổi được nếu
  kỳ thu kế trong vòng 30 phút hoặc subscription đang `past_due` — **Đã đọc (chính thức)**
  https://developer.paddle.com/build/subscriptions/replace-products-prices-upgrade-downgrade
- Trang không mô tả lên lịch đổi ở kỳ sau cho thay đổi tần suất — **Đã đọc (chính thức)**, cùng trang.

### 5.5 Cổng VN

- **Suy luận**: không có subscription → "đổi gói" là app tự tính: ví dụ huỷ gói tháng còn N ngày rồi bán gói năm, hoặc cộng
  dồn thời hạn. Mọi phép tính bù tiền là của app.

---

## 6. Đổi giá cho người đang dùng, và mua lại sau khi hết hạn

### 6.1 Đổi giá

- **Apple**: cần người dùng đồng ý nếu (a) ở vùng yêu cầu đồng ý cho mọi lần tăng giá, (b) tăng hơn 50% **và** chênh hơn ~US$5
  mỗi kỳ (gói không phải năm) hoặc US$50/năm (gói năm), hoặc (c) đã bị tăng giá trong 12 tháng qua. Không thuộc các trường hợp
  này thì Apple chỉ báo. Không đồng ý thì hết hạn cuối kỳ (`EXPIRED` subtype `PRICE_INCREASE`). Thông báo sớm: gói năm 60 ngày,
  gói tháng 27 ngày trước ngày gia hạn. Developer chọn **giữ giá cũ cho người đang dùng** (người hết hạn quay lại trong 60 ngày
  vẫn được giá cũ) hoặc áp giá mới. Giảm giá thì người đang dùng tự động được giá thấp, không giữ giá cao được — **Đã đọc
  (chính thức)** https://developer.apple.com/help/app-store-connect/manage-subscriptions/manage-pricing-for-auto-renewable-subscriptions
- Danh sách vùng "yêu cầu đồng ý cho mọi lần tăng giá" **không thấy trên trang**; Việt Nam có trong đó không: **chưa rõ**.
- **Google**: mặc định người đang dùng ở "legacy price cohort", tiếp tục trả giá cũ. Kết thúc cohort thì tăng giá mặc định là
  **opt-in**: người dùng phải chấp nhận, nếu không thì subscription bị huỷ và hết hạn ở lần gia hạn áp giá mới; thông báo trước
  37 ngày (email/push 30 ngày trước lần thu). Opt-out chỉ ở một số nơi, có giới hạn mức và tần suất (trang không liệt kê), báo
  trước 30 hoặc 60 ngày, app **phải** hiện thông báo trong app — **Đã đọc (chính thức)**
  https://developer.android.com/google/play/billing/price-changes
- **Stripe**: số tiền của Price không sửa được; tạo Price mới; archive Price cũ thì "existing subscriptions that use the price
  remain active until they're canceled" — **Đã đọc (chính thức)** https://docs.stripe.com/products-prices/manage-prices.
  **Suy luận**: người đang dùng giữ giá cũ cho tới khi app chủ động chuyển subscription sang Price mới.
- **Paddle**: không tìm được trang chính thức về tăng giá cho người đang dùng — **chưa rõ**.

### 6.2 Mua lại sau khi hết hạn (resubscribe / reactivation)

- **Apple**: đăng ký lại trong 60 ngày thì số ngày trả phí tiếp tục; sau 60 ngày thì reset — **Đã đọc (chính thức)**
  https://developer.apple.com/app-store/subscriptions/. Sự kiện `SUBSCRIBED` subtype `RESUBSCRIBE` — **Đã đọc (chính thức)**
  https://developer.apple.com/tutorials/data/documentation/appstoreservernotifications/notificationtype.json
- Apple, trial khi quay lại: "Lapsed subscribers who renew are eligible if they haven't previously used an introductory offer"
  trong cùng group; mỗi người chỉ một intro offer mỗi group — **Đã đọc (chính thức)**
  https://developer.apple.com/tutorials/data/documentation/storekit/implementing-introductory-offers-in-your-app.json và
  https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions.
  Apple có "win-back offers" để mời người cũ quay lại — **Đã đọc (chính thức)** https://developer.apple.com/app-store/subscriptions/
- **Google**: còn hạn mà đã huỷ thì "Resubscribe/Restore", giữ purchase token (`SUBSCRIPTION_RESTARTED`), bắt buộc hỗ trợ. Hết hạn
  thì mua lại trong tối đa 1 năm, token mới (`SUBSCRIPTION_PURCHASED`), phải acknowledge. "If the user resubscribes to the same
  SKU, they are no longer eligible for free trials or introductory price"; có ô "Allow one free trial per app" — **Đã đọc (chính
  thức)** https://developer.android.com/google/play/billing/subscriptions và
  https://developer.android.com/google/play/billing/lifecycle/subscriptions
- Google offer cho khách mới: giới hạn cho người "never had this subscription" hoặc "never had any subscription"; offer do
  developer tự xác định điều kiện (ví dụ trial lần hai, win-back) — **Đã đọc (chính thức)**
  https://support.google.com/googleplay/android-developer/answer/140504?hl=en
- **Stripe**: `canceled` là trạng thái cuối, muốn quay lại phải tạo subscription mới — **Đã đọc (chính thức)**
  https://docs.stripe.com/billing/subscriptions/overview. **Paddle**: canceled không khôi phục, tạo transaction mới rồi checkout —
  **Đã đọc (chính thức)** https://developer.paddle.com/build/subscriptions/cancel-subscriptions
- **Suy luận**: Stripe/Paddle/cổng VN không tự chặn "trial lần hai"; nếu Wordmet muốn mỗi người chỉ một trial thì app phải tự
  kiểm. Không đọc được trang Stripe/Paddle nói rõ việc này.

---

## 7. Trường hợp biên quanh trial (7 ngày, bắt buộc thẻ, tự chuyển sang Pro)

### 7.1 Trial hết, lần trừ tiền đầu tiên lỗi

- **Apple**: developer chọn grace có áp cho chuyển từ kỳ free sang trả phí ("All Renewals") hay không ("Only Paid to Paid") —
  **Đã đọc (chính thức)** (trang Billing Grace Period ở 2.1). Không có grace thì vào billing retry 60 ngày như gia hạn thường —
  **Suy luận**.
- **Google**: trang chính thức **không nói** grace/hold có áp cho lần thu đầu sau trial không. Google xác minh phương thức thanh
  toán trước khi bắt đầu trial (có thể là khoản giữ tạm, sau đó hoàn) — **Đã đọc (chính thức)**
  https://developer.android.com/google/play/billing/subscriptions
- **Stripe**: trial hết thì tạo invoice, khoảng 1 giờ sau thử thu — **Đã đọc (chính thức)**
  https://docs.stripe.com/billing/subscriptions/trials/free-trials. Không có phương thức thanh toán thì theo
  `missing_payment_method`: `create_invoice` (mặc định, không thu được → `past_due`), `cancel`, hoặc `pause` — **Đã đọc (chính
  thức)** https://docs.stripe.com/billing/subscriptions/trials. Có thẻ nhưng thẻ bị từ chối thì đi luồng retry/`past_due` như
  gia hạn — **Suy luận**.
- **Paddle**: card-required trial: hết trial thì Paddle tự trừ và chuyển `active` — **Đã đọc (chính thức)**
  https://development-docs.paddle.dev/concepts/subscriptions/trials (bản mirror tài liệu của Paddle). Trừ lỗi thì sang `past_due`
  rồi dunning — **Suy luận** (trang trial không nói).

### 7.2 Người dùng huỷ trong lúc trial

- **Google**: "the subscription remains active until the end of the trial, and they aren't charged" — **Đã đọc (chính thức)**
  https://developer.android.com/google/play/billing/subscriptions
- **Apple**: khuyên huỷ ít nhất 24 giờ trước khi trial hết — **Đã đọc (chính thức)** https://support.apple.com/en-us/118428.
  Có còn quyền tới hết trial không: trang không nói; cộng đồng Apple trích "might lose access … immediately" — **Thứ cấp**
  https://discussions.apple.com/thread/253116581
- **Stripe**: app chọn huỷ ngay, huỷ cuối kỳ (`cancel_at_period_end`) hoặc `cancel_at` ngày hết trial — **Đã đọc (chính thức)**
  https://docs.stripe.com/billing/subscriptions/cancel
- **Paddle**: trang huỷ không nói về subscription đang `trialing` — **chưa rõ**.
- **Spotify**: huỷ trong trial miễn phí thì về Free **ngay**, và trial đó không kích hoạt lại được — **Đã đọc (chính thức)**
  https://support.spotify.com/us/article/cancel-premium/

### 7.3 Nhắc trước khi trial hết

- Stripe (theo yêu cầu của card network): bật email thì nhắc **7 ngày** trước khi trial hết; trial ngắn hơn 7 ngày thì gửi
  ngay khi trial bắt đầu; tự làm thì vẫn phải tuân thủ; statement descriptor được gắn chữ trial — **Đã đọc (chính thức)**
  https://docs.stripe.com/billing/subscriptions/trials/manage-trial-compliance
- Sự kiện `customer.subscription.trial_will_end` mặc định 3 ngày trước khi hết trial — **Đã đọc (chính thức)**
  https://docs.stripe.com/billing/subscriptions/trials
- Paddle (card-required): Paddle gửi email nhắc trial sắp hết — **Đã đọc (chính thức)**
  https://development-docs.paddle.dev/concepts/subscriptions/trials
- Google gửi email khi trial sắp hết — **Đã đọc (chính thức)** https://support.google.com/googleplay/answer/2476088?hl=en
- **Suy luận**: với trial 7 ngày, mốc "7 ngày trước" của Stripe trùng ngày bắt đầu trial, còn mốc "07 ngày làm việc" của luật VN
  (mục 3.4) không thể đạt nếu bị áp cho lần thu đầu.

### 7.4 Quyền dùng trial sau khi được hoàn tiền

- Apple: điều kiện dựa trên việc **đã dùng intro offer** trong group; trang không nhắc refund — **Đã đọc (chính thức)** (trang
  implementing-introductory-offers ở 6.2). Refund có khôi phục quyền trial không: **chưa rõ**.
- Google: "never had this subscription"/"never had any subscription" và "one free trial per app"; ảnh hưởng của refund: **chưa rõ**.
- Stripe/Paddle/cổng VN: app tự quyết — **Suy luận**.

---

## 8. Hệ quả cho thiết kế Wordmet (chưa chọn — để chủ dự án trả lời trước)

Mỗi mục: các phương án một design có thể chọn, đánh đổi, và chỗ nào **store/provider quyết, app không đổi được**. Không mục nào
là đề xuất.

### 8.1 Gia hạn lỗi: trạng thái nội bộ và quyền Pro

Phần app không đổi được: với Apple, subtype `GRACE_PERIOD` → phải phục vụ đầy đủ; Google grace → nên giữ quyền, account hold →
phải khoá; lịch thử lại và email của store do store làm (mục 2.1–2.2).

| Phương án | Được | Mất |
|---|---|---|
| A. Port có trạng thái riêng cho "grace" (vẫn Pro) và "hold/past_due" (khoá Pro, chưa huỷ), mỗi provider ánh xạ vào | Đúng luật store; dùng chung cho mọi provider | Thêm trạng thái và test; độ dài khác nhau theo provider |
| B. Wordmet đặt một grace N ngày chung cho mọi nguồn (store vẫn theo luật store) | Người dùng thấy nhất quán | Web và store vẫn lệch nhau nếu N khác cấu hình store |
| C. Cắt Pro ngay khi trừ lỗi (trừ chỗ store bắt buộc) | Đơn giản, không cho dùng "chùa" | Mất người dùng vì lỗi thẻ tạm thời; trái thói quen Spotify/YouTube |

Câu cần chủ dự án trả lời: độ dài grace trên web (nếu có), có giữ AI quota trong grace không, và banner/email nói gì.
Với cổng VN (mô hình B ở file 18/10), app tự quyết lịch nhắc và thử lại; MoMo chỉ cho thêm một lần lỗi do thiếu tiền rồi khoá
token (mục 2.5).

### 8.2 Huỷ và hoàn tiền theo yêu cầu

Phần app không đổi được: Apple và Google giữ quyền tới hết kỳ; refund trên Apple do Apple quyết; Google cho developer refund một
phần nhưng mặc định huỷ không hoàn tiền (mục 3.1).

| Phương án (cho web/cổng VN) | Được | Mất |
|---|---|---|
| A. Huỷ = tắt gia hạn, dùng tới hết kỳ, không hoàn | Giống store và app lớn; dễ làm | Có thể vướng Điều 42 khoản 3 với gói năm (câu hỏi pháp lý) |
| B. Như A, cộng hoàn tiền toàn bộ trong X ngày đầu | Giảm khiếu nại, giảm chargeback | Bị lạm dụng; phải làm luồng refund |
| C. Hoàn phần chưa dùng (prorated) khi huỷ giữa kỳ, ít nhất cho gói năm | Gần mặc định của Điều 42 khoản 3 | Phức tạp: tính tiền, quota AI đã dùng, giá năm đã giảm 10% |
| D. Huỷ ngay, mất quyền ngay (theo lựa chọn người dùng) | Google cũng cho người dùng chọn kiểu này | Phải có hai nút huỷ, hai thông điệp |

Port cần tách "huỷ gia hạn" khỏi "hết quyền" (đã ghi ở file 18/10). Cần hỏi luật sư trước khi chốt chính sách cho gói năm.

### 8.3 Hoàn tiền / chargeback từ bên ngoài

Phần app không đổi được: store/MoR/ngân hàng quyết refund và chargeback; app chỉ nhận sự kiện; Google yêu cầu revoke ngay khi
chargeback; Apple có thể đảo ngược refund (mục 4).

| Phương án | Được | Mất |
|---|---|---|
| A. Refund toàn phần / chargeback → cắt Pro ngay | Không mất tiền thêm | Phải mở lại khi `REFUND_REVERSED` / `chargeback_reverse` |
| B. Cắt Pro ở cuối kỳ hiện tại | Ít tranh cãi với người dùng | Cho dùng miễn phí phần còn lại; với Stripe, subscription vẫn chạy nếu không cấu hình huỷ |
| C. Refund một phần → giữ Pro, chỉ ghi nhận số tiền | Hợp với partial refund | Cần quy tắc khi nào một phần thành "toàn phần" |

Câu mở: refund có "trả lại" quyền dùng trial không (mục 7.4); có khoá tài khoản khi chargeback lặp lại không.

### 8.4 Đổi tháng ↔ năm

Phần app không đổi được: Apple quyết theo xếp hạng trong group (mục 5.1); Google giới hạn replacement mode khi tháng/năm là hai
base plan cùng subscription (mục 5.2).

| Phương án | Được | Mất |
|---|---|---|
| A. Tháng → năm có hiệu lực ngay, bù phần còn lại của tháng | Thu tiền năm sớm; người dùng thấy ngay | Phải tính proration; Paddle/Stripe thu ngay có thể lỗi |
| B. Mọi thay đổi có hiệu lực ở cuối kỳ hiện tại | Không có proration; dễ test | Người muốn lên gói năm phải đợi hết tháng |
| C. Tháng → năm ngay, năm → tháng cuối kỳ | Giống khuyến nghị Google (upgrade ngay, downgrade deferred) | Hai đường đi khác nhau |

Liên quan câu mở Bước 5 về quota AI gói năm (theo tháng hay theo năm): khi đổi giữa kỳ, cửa sổ quota phải được tính lại —
**Suy luận**.

### 8.5 Đổi giá

Phần app không đổi được: Apple/Google tự gửi thông báo và xin đồng ý theo luật của họ; không đồng ý thì subscription hết hạn
(mục 6.1).

| Phương án | Được | Mất |
|---|---|---|
| A. Giữ giá cũ cho người đang dùng (grandfather) | Không xin đồng ý, ít mất khách | Nhiều mức giá cùng lúc; port phải nhớ giá của từng subscription |
| B. Chuyển mọi người sang giá mới sau thời gian báo trước | Một mức giá | Store xin đồng ý → có người hết hạn; web phải tự báo (luật VN 07 ngày làm việc nếu áp dụng) |

### 8.6 Mua lại sau khi hết hạn

| Phương án | Được | Mất |
|---|---|---|
| A. Một trial cho mỗi người dùng, mãi mãi | Chống lạm dụng | Phải xác định "một người" qua nhiều nguồn (web, iOS, Android) |
| B. Cho trial lại sau một khoảng thời gian / win-back offer | Kéo khách cũ | Trên store phải dùng cơ chế của store (Apple win-back, Google developer-determined offer) |

Phần app không đổi được: Apple một intro offer mỗi group; Google theo cấu hình "one free trial per app" và điều kiện offer
(mục 6.2).

### 8.7 Trial

| Câu cần chốt | Phương án | Ghi chú |
|---|---|---|
| Huỷ trong trial | Giữ Pro tới hết 7 ngày / mất Pro ngay | Google bắt buộc giữ tới hết trial; Spotify cắt ngay |
| Lần thu đầu lỗi | Có grace như gia hạn / coi như trial hết, về Free | Apple cho chọn "All Renewals" hay "Only Paid to Paid" |
| Nhắc trước khi hết trial | Ngày bắt đầu trial / N ngày trước / để provider gửi | Stripe: trial < 7 ngày thì nhắc ngay khi bắt đầu; luật VN: xem 3.4 |

### 8.8 Kịch bản cho fake provider (Bước 5 test được ngay, không cần thanh toán thật) — **Suy luận**

Từ các mục trên, một fake provider cần phát được ít nhất: trừ lỗi → vào grace → trả được (không đổi ngày gia hạn); trừ lỗi →
grace hết → hold → trả được (ngày gia hạn reset như Google); hold hết → expired; huỷ (còn quyền tới hết kỳ) → bật lại → hết kỳ;
refund toàn phần → revoke; refund đảo ngược → khôi phục; refund một phần; đổi tháng → năm ngay và cuối kỳ; trial → thu lỗi;
huỷ trong trial; mua lại sau khi hết hạn (không trial); sự kiện đến sai thứ tự hoặc trùng lặp.

---

## 9. Câu hỏi còn mở / trang không đọc được

**Pháp lý (cần luật sư)**

- Điều 42 khoản 3 Luật 19/2023/QH15: điều khoản "không hoàn tiền khi huỷ gói năm" trong hợp đồng theo mẫu có hợp lệ không.
- Nghĩa vụ báo trước 07 ngày làm việc áp cho gia hạn tự động và cho lần thu đầu sau trial 7 ngày thế nào.
- Khi bán qua Apple, Google hoặc Paddle (MoR), ai là bên chịu nghĩa vụ theo luật VN.
- Nghị định 55/2024/NĐ-CP chưa đọc. Nguyên văn luật chỉ đọc qua bản chép caselaw.vn (Thứ cấp); Điều 25 chỉ đọc khoản 13.

**Kỹ thuật chưa xác minh**

- Google: độ dài grace mặc định và các lựa chọn (chỉ có nguồn RevenueCat, lại mâu thuẫn về account hold); grace/hold có áp cho
  lần thu đầu sau trial không; refund ảnh hưởng quyền trial thế nào; opt-out price increase có ở VN không.
- Apple: danh sách vùng bắt buộc đồng ý mọi lần tăng giá (VN?); huỷ trong trial còn quyền tới hết trial không; refund có khôi
  phục quyền intro offer không; developer có tự refund được không.
- Paddle: tăng giá cho người đang dùng; huỷ khi đang `trialing`; thu lỗi lần đầu sau trial; refund/chargeback có đổi trạng thái
  subscription không.
- Stripe: thẻ bị từ chối ở lần thu đầu sau trial (chỉ suy luận là đi luồng `past_due`).
- MoMo: lịch retry IPN, có thông báo lỗi cho người dùng không; chargeback/khiếu nại qua ví.
- Ứng dụng tiêu dùng: Spotify bao nhiêu ngày thì về Free; Netflix có cho xem trong lúc "on hold" không; Duolingo, Quizlet,
  Grammarly xử lý gia hạn lỗi thế nào.

**Trang không tải được / không có nội dung**

- `duolingo.com/help/cancel-my-super-duolingo-subscription`, `duolingo.com/help/how-do-I-request-a-refund`,
  `duolingo.com/terms`: trả về rỗng (JS).
- `help.quizlet.com/hc/en-us/articles/360030807611`: 403.
- `binhphuoc.gov.vn/.../luat19_2023.pdf`: lỗi chứng chỉ (bản Công báo của luật).
- `pbgdpl.moj.gov.vn/...Tai lieu gioi thieu Luat Bao ve quyen loi nguoi tieu dung nam 2023.doc`: 404.
- `developer.paddle.com/concepts/subscriptions/subscription-status`: 404.
- Không tìm được bản luật trên vbpl.vn / chinhphu.vn / quochoi.vn qua công cụ tìm kiếm.
