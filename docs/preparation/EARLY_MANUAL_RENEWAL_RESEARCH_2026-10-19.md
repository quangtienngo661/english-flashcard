# Gói "app tự gia hạn": người dùng trả tiền trước khi kỳ hiện tại hết thì tính thế nào (19/10/2026)

Mục đích: trả lời câu Q3 của review plan Bước 5 ([`../superpowers/reviews/2026-10-19-buoc-5-plan-review.md`](../superpowers/reviews/2026-10-19-buoc-5-plan-review.md)).
Chủ dự án hỏi: "làm sao lại có trả trước, tháng nào trả tháng đó thôi", rồi nhờ research kỹ. Tài liệu này **không chọn phương án**
(luật repo: chủ dự án trả lời trước, Claude đề xuất sau). Bối cảnh nhà cung cấp đã có ở
[`PAYMENT_PROVIDERS_RESEARCH_2026-10-18.md`](PAYMENT_PROVIDERS_RESEARCH_2026-10-18.md) (mục 3.5–3.8, 4.1); ở đây chỉ nhắc chỗ cần.

> **Đã chốt 19/10/2026:** chủ dự án chọn (e) — "mình không design app theo hướng user phải nhớ đến ngày và chủ động trả, mà phải tự gia hạn
> nếu cần" — rồi chốt bỏ kiểu "app tự gia hạn" khỏi lõi Bước 5 → **D35** trong
> [`../superpowers/decisions/2026-10-19-buoc-5-entitlements-decisions.md`](../superpowers/decisions/2026-10-19-buoc-5-entitlements-decisions.md).

**Nhãn nguồn** (mỗi khẳng định có URL + nhãn):

- **Đã đọc (chính thức)** = đọc trên trang của chính công ty trong phiên 19/10/2026.
- **Thứ cấp** = bài bên thứ ba, diễn đàn, hoặc đoạn trích của công cụ tìm kiếm; chưa đối chiếu với bản gốc.
- **Suy luận** = suy luận của người viết; cần kiểm tra trước khi dùng.

---

## 1. Tóm tắt

- **"Trả trước" chỉ xảy ra với cổng không tự trừ tiền được** (VNPay, payOS; mô hình B "app tự gia hạn"). Với các cổng này, mỗi tháng
  người dùng phải tự bấm trả. Nếu app cho bấm trả lúc tháng hiện tại chưa hết, đó là trả trước. Design hiện tại (R11) nối tháng mới
  vào cuối tháng cũ.
- **Cổng Việt Nam tự trừ tiền mỗi tháng có tồn tại**: MoMo có API subscription (app tự gọi trừ tiền tới ngày, không cần người dùng xác
  nhận lại), ZaloPay có Auto Debit (có lúc vẫn đòi người dùng xác minh). Galaxy Play gia hạn qua liên kết MoMo; VieON có gói "Tự động
  gia hạn". Với các cổng này, "tháng nào trả tháng đó" làm được đúng nghĩa đen: không có trả trước.
- **Nơi bán lớn có kiểu "trả trước, không tự gia hạn" đều cộng dồn thời gian**: Google Play prepaid plan (mua thêm trước khi hết hạn thì
  hạn mới = hạn cũ + trọn một kỳ), Spotify thẻ quà tặng (bắt đầu từ ngày thanh toán kế tiếp, tối đa 18 tháng), YouTube Premium gói
  năm (giữ tối đa 24 tháng trả trước). Google cho nhà phát triển **tắt** việc gia hạn sớm trên giao diện Play, và có trường cho biết
  thời điểm được phép mua thêm.
- **App Việt Nam**: không tìm thấy chính sách công khai nào (VieON, Galaxy Play, Zing MP3, FPT Play, ELSA) nói mua thêm khi còn hạn thì
  cộng dồn hay tính lại. Chưa xác minh.
- **Dù chọn cách nào, backend vẫn phải có luật cho "hai lần trả trong một kỳ"** (bấm hai lần, mở hai tab). Không chặn được hoàn toàn ở
  trang thanh toán, vì cổng có thể báo thành công cho cả hai.

## 2. Vì sao có "trả trước"

Hai mô hình nguồn của một kỳ Pro (file 18/10, mục 4.1):

```
(A) Nhà cung cấp tự gia hạn: Stripe, Paddle, Apple, Google, MoMo subscription*, ZaloPay agreement pay*
    → tới ngày, tiền tự bị trừ; app nhận "renewed". Không có chuyện người dùng tự bấm trả sớm.
(B) App tự gia hạn: VNPay, payOS (và MoMo/ZaloPay khi chỉ dùng thanh toán một lần)
    → mỗi kỳ là một lần mua mới; người dùng tự bấm trả; app tự tính hết hạn.
* app chủ động gọi lệnh trừ tiền tới ngày (không phải cổng tự trừ), nhưng người dùng không phải bấm gì.
```

- VNPay: thanh toán bằng token vẫn **redirect trình duyệt và nhập OTP ngân hàng mỗi lần**; không thấy luồng trừ tiền server-to-server —
  **Đã đọc (chính thức)** https://sandbox.vnpayment.vn/apis/ (đã ghi ở file 18/10, mục 3.5). → **Suy luận:** với VNPay, người dùng luôn
  phải tự trả từng kỳ.
- payOS: không thấy recurring — đã ghi ở file 18/10, mục 3.8.
- Vậy câu hỏi "trả trước thì tính sao" chỉ đặt ra cho mô hình B. Với mô hình A, "tháng nào trả tháng đó" là cách nó vốn chạy.

## 3. Nơi bán lớn làm gì

### 3.1 Google Play — prepaid plan (gói trả trước, không tự gia hạn)

- "Prepaid plans **do not** automatically renew upon expiration. To extend their subscription entitlement without interruption, the user
  must _top-up_ a prepaid plan for the same subscription." — **Đã đọc (chính thức)** https://developer.android.com/google/play/billing/subs
- "The user is immediately charged for a full billing period, and their entitlement is extended by the duration specified in the top-up." —
  **Đã đọc (chính thức)**, cùng trang. Trang không nói rõ cộng vào hạn cũ hay tính từ lúc mua.
- RevenueCat (bên thứ ba tích hợp Google Play): hạn mới là "the original expiration date + the full duration of the prepaid base plan"; và
  "A customer can extend their plan before it expires by purchasing a top-up in order not to lose access." — **Thứ cấp**
  https://www.revenuecat.com/docs/subscription-guidance/google-prepaid-plans
- Nhà phát triển chọn được có cho gia hạn sớm trên giao diện Play hay không: `timeExtension` — "Whether users should be able to extend this
  prepaid base plan in Google Play surfaces. Defaults to TIME_EXTENSION_ACTIVE if not specified." — **Đã đọc (chính thức, tài liệu client do
  Google sinh)** https://googleapis.dev/ruby/google-apis-androidpublisher_v3/v0.74.0/Google/Apis/AndroidpublisherV3/PrepaidBasePlanType.html
- Gói đang chạy có trường `allowExtendAfterTime`: thời điểm sau đó mới được mua thêm (bản thư viện cũ: "the time after which the subscription
  is allowed for a new top-up purchase") — **Thứ cấp** (tài liệu client các phiên bản khác nhau diễn đạt khác nhau)
  https://googleapis.dev/ruby/google-apis-androidpublisher_v3/v0.27.0/Google/Apis/AndroidpublisherV3/PrepaidPlan.html. Không tìm thấy trang
  nói luật mở cửa cụ thể là bao nhiêu ngày.

### 3.2 Apple — non-renewing subscription

- "Your app is responsible for calculating the time period that the subscription is active … Your app is responsible for detecting that a
  non-renewing subscription is approaching its expiration date and prompting the user to renew the subscription by purchasing the same
  product again." — **Đã đọc (chính thức)**
  https://developer.apple.com/tutorials/data/documentation/storekit/handling-subscriptions-billing.md
- Apple không quy định cộng dồn hay không; trên diễn đàn nhà phát triển, người trả lời nói mua nhiều lần thì thời gian cộng dồn, app tự
  quyết khi nào bắt đầu và hết — **Thứ cấp** https://developer.apple.com/forums/thread/73215

### 3.3 Spotify, YouTube

- Spotify thẻ quà tặng: "starts on your plan's next payment date" (tức nối vào cuối kỳ đang chạy), cộng dồn tối đa 18 tháng Premium —
  **Thứ cấp** (đoạn trích tìm kiếm của trang hỗ trợ Spotify, chưa mở trang gốc) https://support.spotify.com/article/gift-cards
- YouTube Premium gói năm (trả trước): "You can purchase up to 24 months of prepaid access … at a given time" — **Thứ cấp** (đoạn trích tìm
  kiếm của trang hỗ trợ Google) https://support.google.com/youtube/answer/11417260

## 4. Ở Việt Nam

- MoMo subscription: "When the subscription reaches the payment date, Merchant can make the payment request without user confirmation";
  tần suất DAILY … MONTHLY … YEARLY; người dùng huỷ trong app MoMo thì MoMo báo về merchant — **Đã đọc (chính thức)**
  https://developers.momo.vn/v3/docs/payment/api/wallet/subscription/ (đã ghi ở file 18/10, mục 3.6).
- Galaxy Play gia hạn qua liên kết MoMo: huỷ ở "Hóa đơn định kỳ và Dịch vụ liên kết"; "Khi huỷ liên kết, bạn đồng thời ngừng gia hạn gói đã
  mua của Galaxy Play"; "Bạn vẫn có thể sử dụng dịch vụ Galaxy Play cho đến hết thời điểm kết thúc gói đã mua." — **Đã đọc (chính thức,
  blog của MoMo)** https://www.momo.vn/blog/huong-dan-cach-huy-goi-galaxy-play-c115dt1354
- VieON: "Các gói cước VieON được chú thích cụ thể “Tự động gia hạn” đều được gia hạn khi hết hạn hàng tháng." — **Đã đọc (chính thức, blog
  của MoMo)** https://www.momo.vn/blog/mua-goi-vieon-c115dt1265 (trang không nói gia hạn bằng phương thức nào).
- ZaloPay Auto Debit: merchant trừ tiền bằng token sau khi người dùng ký thoả thuận; lệnh trừ có thể trả `verification_required` — đã ghi ở
  file 18/10, mục 3.7.
- Mua thêm khi gói còn hạn (VieON, Galaxy Play, Zing MP3, FPT Play, ELSA): **không tìm thấy** chính sách công khai nói cộng dồn, tính lại hay
  chặn (đã tìm bằng nhiều từ khoá tiếng Việt ngày 19/10/2026). Muốn biết chắc phải hỏi trực tiếp hoặc thử mua.

## 5. Các cách làm và hệ quả (không xếp theo ưu tiên)

Ví dụ chung: tháng của Lan hết **30/11**. Ngày **25/11** Lan bấm trả tháng 12.

| Cách | Lan thấy gì | Việc ở Bước 5 (backend) | Việc sau này (trang thanh toán, bộ nối thật) | Hệ quả khác |
|---|---|---|---|---|
| **(a) Không cho trả trước** | Nút trả bị khoá tới 30/11; trả ngày 1/12 thì tháng mới 1/12–31/12; có thể mất Pro vài giờ hoặc vài ngày nếu quên | Vẫn cần luật cho lần trả lọt vào lúc còn hạn (trả trùng, mục 6) | Trang thanh toán chặn khi còn hạn; email nhắc đúng ngày hết hạn | Ngày hết hạn trôi theo ngày Lan trả |
| **(b) Cho trả, tính từ ngày trả** | Tháng mới 25/11–25/12; 5 ngày còn lại của tháng 11 mất | Sửa Task 7: `payment_succeeded` lúc còn hạn đặt kỳ mới từ `paid_at`, không nối | Trang thanh toán nên báo trước "bạn sẽ mất 5 ngày" | Người dùng trả tiền mà mất ngày đã trả: rủi ro khiếu nại; luật Việt Nam về điểm này **chưa kiểm** |
| **(c) Cho trả, nối từ cuối kỳ** (R11 hiện tại) | Tháng mới 1/12–31/12 (nối từ 30/11) | Giữ nguyên Task 7 | Có thể đặt trần tổng thời gian trả trước (Spotify 18 tháng, YouTube 24 tháng) | Có kỳ "đã trả nhưng chưa tới": phát sinh câu hoàn tiền cho kỳ đó (Q3 cũ) |
| **(d) Chỉ cho trả trong N ngày cuối, nối từ cuối kỳ** | Nút trả mở từ 23/11 nếu N = 7; trả 25/11 → 1/12–31/12 | Như (c) | Trang thanh toán mở nút trong N ngày cuối (giống `allowExtendAfterTime` của Google) | Kỳ trả trước tối đa một tháng; câu hoàn tiền vẫn có nhưng hẹp |
| **(e) Tự trừ tiền mỗi tháng** (MoMo subscription, ZaloPay Auto Debit) | Không bấm gì; 30/11 app tự trừ ví MoMo cho tháng 12 | Không đổi: lệnh trừ thành công vẫn là `payment_succeeded` nối từ cuối kỳ; chỉ không có trả trước | Bộ nối MoMo/ZaloPay và một job gọi lệnh trừ tới ngày (chưa có trong Bước 5) | Chỉ với cổng có tự trừ; VNPay, payOS vẫn phải chọn một trong (a)–(d) |

(e) có thể đi cùng một trong (a)–(d): ví dụ MoMo tự trừ, VNPay theo (a).

## 6. Ca phải có luật dù chọn cách nào

- **Trả trùng**: Lan bấm "Trả" hai lần, hoặc mở hai tab, cổng báo thành công cho cả hai (hai mã giao dịch khác nhau). Backend nhận hai
  `payment_succeeded` trong cùng kỳ. Theo (c)/(d)/(e) hiện tại: kỳ nối thêm hai tháng. Theo (a): lần thứ hai lẽ ra không có, nên cần quyết
  hoàn tiền tự động hay nối. Theo (b): lần thứ hai đặt lại kỳ từ ngày trả, Lan mất trọn lần thứ nhất. — **Suy luận** (không cổng nào hứa
  chặn trùng thay app).
- **Trả khi đã hết hạn** (Lan trả 3/12): mọi cách đều tính từ ngày trả, mốc lượt AI mới (R11, không đổi).

## 7. Chưa xác minh

- Chính sách mua thêm khi còn hạn của các app Việt Nam (mục 4).
- Cách (b) có vi phạm Luật Bảo vệ quyền lợi người tiêu dùng 2023 không (người dùng mất phần đã trả) — cần luật sư, cùng danh sách ở design
  Bước 5 §19.
- Trang gốc của Spotify và YouTube (chỉ đọc đoạn trích tìm kiếm).
- Apple không có tài liệu chính thức về cộng dồn non-renewing subscription (chỉ có diễn đàn).
