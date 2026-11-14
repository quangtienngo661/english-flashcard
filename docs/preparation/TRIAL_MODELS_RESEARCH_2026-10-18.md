# Nghiên cứu cơ chế trial: các app thật vận hành thế nào (18/10/2026)

Mục đích: trả lời câu của chủ dự án "mình không hiểu cơ chế trial của các app vận hành lắm" cho Bước 5 (Free / Trial / Pro).
Desk research, chỉ đọc trang công khai; không đăng ký, không mở trial, không điền form nào.

**Nhãn nguồn** (mọi khẳng định đều có URL và nhãn):

- **[Đã đọc]** / **(Đ)**: đọc trên trang chính thức của chính công ty đó trong phiên này.
- **[Thứ cấp]** / **(T)**: bài của bên thứ ba hoặc đoạn trích của công cụ tìm kiếm, chưa đối chiếu với trang chính thức.
- **[Suy luận]** / **(S)**: suy luận của người viết từ các nguồn trên.
- **(?)**: trang chính thức đã đọc không nói tới.

Một số trang help center (Zendesk) chặn công cụ tải trang; các trang đó được đọc bằng trình duyệt dựng sẵn và vẫn tính là [Đã đọc].

Tài liệu liên quan: `docs/preparation/PAYMENT_PROVIDERS_RESEARCH_2026-10-18.md` (Stripe không nhận doanh nghiệp đặt ở Việt Nam,
Paddle nhận cá nhân, cổng Việt Nam chủ yếu thanh toán một lần, mobile bắt buộc Apple IAP / Google Play Billing).

---

## 1. Tóm tắt

1. Có bốn kiểu chính. **Opt-out (card-on-file)**: nhập thẻ lúc bắt đầu trial, hết trial tự trừ tiền nếu không huỷ (Duolingo Super, Speak, Quizlet, Grammarly; mọi trial trên App Store và Google Play). **Opt-in (không thẻ)**: hết trial thì quay về Free, muốn Pro phải tự trả (FAQ của ELSA, Wordmet V1). **Không có trial theo ngày**, chỉ có bản Free giới hạn (Babbel, MochiMochi). **Lượt AI dùng thử một lần** cho tài khoản Free (Notion AI).
2. Kiểu chủ dự án thích (giữ thẻ, tự lên Pro nếu không huỷ, huỷ thì vẫn dùng hết trial) chính là opt-out. Nó cần một bên giữ thẻ và tự trừ tiền: Paddle (card trial), Apple, Google. V1 chưa có thanh toán thật nên chưa làm được kiểu này.
3. Số liệu thống nhất một hướng. Opt-out chuyển thành trả tiền cao hơn nhiều tính trên mỗi người dùng thử: Recurly ghi 40,1% so với 25,5% (dữ liệu 2022), ChartMogul 2026 ghi 30%, gấp hơn 5 lần trial không thẻ. Đổi lại, ít người bắt đầu trial hơn. Các số này chủ yếu đến từ SaaS ở Mỹ/châu Âu; không có số cho Việt Nam.
4. RevenueCat 2026 (app mobile, nơi trial luôn đi qua store): tỷ lệ trial thành trả tiền ở vùng Ấn Độ/Đông Nam Á chỉ 15,2%, thấp nhất các vùng. Trial dài (17–32 ngày) chuyển đổi tốt hơn trial ≤ 4 ngày.
5. Huỷ giữa trial: đa số vẫn cho dùng tới hết trial (Google Play, Speak). Grammarly cắt trial ngay khi huỷ.
6. Nhắc trước khi trừ tiền là nghĩa vụ, không chỉ là phép lịch sự. Visa (từ 18/04/2020, gồm châu Á – Thái Bình Dương) bắt gửi email/SMS kèm link huỷ ít nhất 7 ngày trước lần trừ đầu tiên sau trial. Luật Bảo vệ quyền lợi người tiêu dùng 2023 của Việt Nam yêu cầu hợp đồng mẫu cho dịch vụ liên tục phải thông báo việc nộp phí chậm nhất 7 ngày làm việc trước khi hết hạn (đọc qua trang tra cứu luật bên thứ ba; không phải tư vấn pháp lý).
7. Mobile: trial do store quản lý. Apple cho mỗi người một introductory offer trong một subscription group. Google kiểm tra phương thức thanh toán trước khi cho trial. App không tự quyết được ai được trial trên store, trừ offer "developer determined" của Google.
8. Hạn mức AI riêng cho trial: không trang chính thức nào đã đọc nói rõ app nào cho trial ít lượt AI hơn bản trả phí. Các mẫu thấy được là hạn mức theo gói (Grammarly 100 so với 2.000 lượt/tháng; Mochi Cards 20 so với 1.000 lượt tra từ/tháng) và một "kho" lượt AI dùng thử một lần (Notion).

---

## 2. Bảng so sánh các app

Ký hiệu cột "Thẻ": **opt-out** = cần phương thức thanh toán, tự trừ tiền khi hết trial; **opt-in** = không cần thẻ.
Số trong ngoặc vuông là nguồn, liệt kê dưới bảng.

| App (nền tảng) | Độ dài | Thẻ | Kích hoạt | Trial gồm gì / AI | Hết trial | Nhắc trước khi trừ | Huỷ giữa trial | Một trial cho mỗi… |
|---|---|---|---|---|---|---|---|---|
| **Duolingo Super** (web; app qua store) | 1 tuần (Đ)[D1] | opt-out: "Day 7 Your account is charged" (Đ)[D1] → đã giữ phương thức thanh toán (S) | Bấm "Start my 1 week free" (Đ)[D1] | "Unlock full access to all Super Duolingo features" (Đ)[D1] | Trừ tiền ngày 7; mọi subscription tự gia hạn (Đ)[D1][D2] | Nhắc ngày 5; huỷ trước 24 giờ (Đ)[D1] | Gói trả phí: dùng tới hết kỳ (Đ)[D4]; với trial (?) | (?) |
| **Duolingo Max** (chỉ iOS/Android) | (?) | (?) | Nút "Unlock with Max" trong app (Đ)[D3] | Super + tính năng AI (Roleplay, Video Call) (Đ)[D3] | (?) | (?) | (?) | "eligible free learners" (Đ)[D3]; điều kiện cụ thể (?) |
| **Babbel** | Không có trial theo ngày | — | Đăng ký miễn phí | "the first lesson of every course is free to try" (Đ)[B1] | — | — | — | — |
| **Busuu** | Help center không có bài về trial (tìm "trial": 0 kết quả) (Đ)[U1] | (?) | (?) | Free có quảng cáo; Premium Plus có AI Conversations (Đ)[U2] | (?) | (?) | Gói trả phí: dùng Premium tới hết kỳ (Đ)[U3] | (?) |
| **Memrise** | Không tìm thấy trial trên trang chính thức (Đ)[M1][M2] | (?) | (?) | (?) | (?) | (?) | (?) | (?) |
| **Quizlet Plus** (web; app qua store) | Trang đã đọc không ghi số ngày (?); bên thứ ba ghi 7 ngày (T)[Q4] | opt-out: "Once your trial ends, you will be charged" (Đ)[Q1] | (?) | Tính năng nâng cao; Quizlet Plus có "monthly usage limits" (Đ)[Q2] | Trừ phí gói đã chọn (Đ)[Q1] | Huỷ trước 24 giờ (Đ)[Q1]; Quizlet có gửi email nhắc không thì (?) | Huỷ xong tài khoản về bản Free, giữ dữ liệu (Đ)[Q1]; thời điểm mất quyền (?) | Family Plan: không có trial, chỉ người dùng Free được mua (Đ)[Q2] |
| **ELSA Speak** (FAQ quốc tế) | 7 ngày (Đ)[E1] | FAQ: "No payment or credit card required" (Đ)[E1]. FAQ khác: người dùng quên huỷ trial thì bị gia hạn thành gói 3 tháng (Đ)[E1] → **hai FAQ mâu thuẫn** | "create an account with ELSA to activate" (Đ)[E1] | "unlimited access to ELSA's curriculum" (Đ)[E1] | Mâu thuẫn (xem cột Thẻ) | (?) | Theo đoạn trích: trial vẫn chạy tới ngày hết hạn (T)[E3] | (?) |
| **ELSA Speak** (trang Việt Nam) | 7 ngày (Đ)[E2] | Trang không nói về thẻ (?) | Hồ sơ → Nâng cấp → "7 ngày học thử miễn phí" (Đ)[E2] | "toàn bộ kho +25,000 bài học", "tất cả các tiện ích" (Đ)[E2] | "Sau 7 ngày trải nghiệm, ELSA sẽ tự động gia hạn gói ELSA Pro" (Đ)[E2] | (?) | Huỷ trong 7 ngày thì không mất phí (Đ)[E2] | (?) |
| **Speak** (iOS, Android, web) | 7 ngày (Đ)[S1] | opt-out: phải "add a payment method" (Đ)[S1] | Chọn gói, thêm phương thức thanh toán (Đ)[S1] | "full access to all features included in the plan" (Đ)[S1] | Tự trừ tiền gói đã chọn (Đ)[S1] | Huỷ trước ít nhất 1 ngày (Đ)[S1] | Vẫn dùng mọi tính năng tới hết trial (Đ)[S1] | (?) |
| **Mochi Cards** (flashcard) | Nút "Try it free", không ghi số ngày (?)[C1] | (?) | (?) | Hạn mức AI theo gói, reset đầu mỗi tháng: AI completion 5.000 so với 500.000 token; tra từ điển 20 so với 1.000 lượt (Free so với Pro) (Đ)[C1] | Hạ gói: dữ liệu giữ trên máy; sync và tính năng Pro dừng cuối kỳ (Đ)[C1] | (?) | (?) | (?) |
| **MochiMochi** (Việt Nam) | Không có trial theo ngày: "trial account with 3 first lessons of every above course" (Đ)[V1] | — | Đăng ký tài khoản | 3 bài đầu mỗi khoá | — | — | — | — |
| ↳ cách bán | Premium 1 năm / 3 năm; mua trên App Store/Google Play (thẻ Visa hoặc MoMo) hoặc mua mã kích hoạt (chuyển khoản) (Đ)[V2]. MochiKanji: "All of our packages are one-time purchases — no subscriptions" (Đ)[V3]; MochiMochi tiếng Anh có tự gia hạn không thì (?) | | | | | | | |
| **Prep** (Việt Nam) | Trang "Học thử 0 đồng" chỉ còn trang giữ chỗ của tên miền (Đ)[P1]. Theo đoạn trích tìm kiếm: mỗi khoá mở 1–2 bài học thử (T)[P1]; sự kiện thi thử tặng 15 ngày phòng luyện thi ảo (T)[P2] | (?) | (?) | (?) | (?) | (?) | (?) | (?) |
| **Notion AI** | Không theo ngày: gói Free và Plus có "Trial of Notion AI" (Đ)[N1] | opt-in | Tự động có sẵn trên Free/Plus (Đ)[N1] | Một số lượt AI miễn phí, mỗi lần AI trả lời tính một lượt, bấm "Try again" cũng tính (Đ)[N2]; số lượt cụ thể (?) | Hết lượt: phải nâng lên Business/Enterprise mới dùng AI tiếp (Đ)[N2] | — | — | Theo workspace hay thành viên (?) |
| **Grammarly Pro** (web) | 7 ngày (Đ)[G3] | opt-out: "$0 payment today"; có "verification charge" tạm giữ trên thẻ (Đ)[G3][G4] | Không phải lúc nào cũng có; khi có thì đăng ký trên website (Đ)[G1] | Free 100 lượt AI/tháng; Pro 2.000 lượt/thành viên/tháng (Đ)[G4]; trial được bao nhiêu lượt (?) | Trừ tiền nếu không huỷ (Đ)[G2] | "Email reminder 2 days before trial ends" (Đ)[G4] | **Trial kết thúc ngay**, về bản Free, không trừ tiền (Đ)[G2] | (?) |
| **ChatGPT Plus** | Theo chiến dịch (ví dụ 3 tháng) (Đ)[O1] | "Some promotions require adding a valid payment method" (Đ)[O1] | Qua link mời / mã khuyến mãi (Đ)[O1] | Gói được mời (ví dụ Plus) (Đ)[O1] | Tự gia hạn thành gói trả phí bằng phương thức thanh toán đã lưu, nếu không huỷ (Đ)[O1] | (?) | Huỷ trước khi hết trial thì không bị trừ (Đ)[O1] | "Generally, only users on the free plan can accept"; mã dùng một lần, không cộng dồn; OpenAI thu hồi được nếu nghi lạm dụng (Đ)[O1] |

**Nguồn của bảng**

- [D1] https://www.duolingo.com/super — [Đã đọc]
- [D2] https://www.duolingo.com/help/super-duolingo — [Đã đọc]
- [D3] https://www.duolingo.com/help/what-is-duolingo-max — [Đã đọc]
- [D4] https://www.duolingo.com/help/cancel-my-super-duolingo-subscription — [Đã đọc]
- [B1] https://support.babbel.com/hc/en-us/articles/205600498-Try-Babbel-for-free — [Đã đọc]; bài Pricing: subscription tự gia hạn, trả trước cả kỳ: https://support.babbel.com/hc/en-us/articles/19650417983378-Pricing — [Đã đọc]
- [U1] https://help.busuu.com/hc/en-us/search?query=%22trial%22 — [Đã đọc] (0 kết quả)
- [U2] https://help.busuu.com/hc/en-us/articles/16269241908497-What-is-Premium — [Đã đọc]
- [U3] https://help.busuu.com/hc/en-us/articles/16466204976785-How-do-I-cancel-my-subscription — [Đã đọc]
- [M1] https://www.memrise.com/llms.txt — [Đã đọc] (không nhắc tới trial)
- [M2] https://memrise.zendesk.com/hc/en-us/search?query=free+trial — [Đã đọc] (chỉ có bài tặng gói Pro)
- [Q1] https://help.quizlet.com/hc/en-us/articles/360038664051-Canceling-a-free-trial-if-you-signed-up-on-the-website — [Đã đọc]
- [Q2] https://help.quizlet.com/hc/en-us/articles/360041181691-Subscribing-to-Quizlet — [Đã đọc]
- [Q4] https://www.myengineeringbuddy.com/blog/quizlet-reviews-alternatives-pricing-offerings/ — [Thứ cấp] (chỉ qua đoạn trích tìm kiếm); trang giá quizlet.com/upgrade trả "Access to this page has been denied"
- [E1] https://elsaspeak.com/en/faqs-en/ — [Đã đọc]
- [E2] https://vn.elsaspeak.com/ban-dung-thu-elsa-speak/ — [Đã đọc] (bài marketing tiếng Việt, không ghi ngày)
- [E3] https://elsaspeak.com/en/faqs/cancel-elsa-subscriptions-for-web-subscriptions-2/ — [Thứ cấp] (trang trả 404 khi tải; nội dung chỉ thấy qua đoạn trích tìm kiếm)
- [S1] https://help.speak.com/en/articles/5458519-is-a-free-trial-available — [Đã đọc]. Kênh thanh toán web là Paddle hoặc Stripe/Link, theo đoạn trích của https://help.speak.com/en/articles/6160467-canceling-a-subscription — [Thứ cấp] (trang trả 404 khi tải)
- [C1] https://mochi.cards/pricing/ — [Đã đọc]
- [V1] https://mochidemy.com/support/?p=48 — [Đã đọc]
- [V2] https://mochidemy.com/blog/nang-cap-mochi-premium/ và https://mochidemy.com/tienganh/ — [Đã đọc]
- [V3] https://mochidemy.com/support/mochikanji-packages-pricing/ — [Đã đọc]
- [P1] https://hocieltsonline.prepedu.com/hoc-thu-conv — [Đã đọc] (chỉ còn trang giữ chỗ); đoạn trích "1-2 bài" — [Thứ cấp]
- [P2] https://dautruonganhngu.prepedu.com/ — [Thứ cấp] (đoạn trích tìm kiếm)
- [N1] https://www.notion.com/pricing — [Đã đọc]
- [N2] https://www.notion.com/help/complimentary-ai-responses — [Đã đọc]
- [G1] https://support.grammarly.com/hc/en-us/articles/360033548272-Does-Grammarly-offer-a-trial — [Đã đọc]
- [G2] https://support.grammarly.com/hc/en-us/articles/31475970390285-How-do-I-cancel-my-free-trial — [Đã đọc]
- [G3] https://support.grammarly.com/hc/en-us/articles/9527130695309-Why-was-I-charged-during-a-free-trial — [Đã đọc] (nằm trong mục Business & Schools)
- [G4] https://www.grammarly.com/plans — [Đã đọc]
- [O1] https://help.openai.com/en/articles/8381046-chatgpt-promotional-subscriptionsfree-trial-invites-faq — [Đã đọc] (cập nhật "13 days ago")

**Nhận xét từ bảng** [Suy luận]:

- Các app học ngôn ngữ có trial theo ngày (Duolingo, Speak, ELSA trang Việt Nam, Quizlet) đều tự gia hạn sang trả phí. Babbel và MochiMochi không có trial theo ngày; người dùng thử vài bài đầu.
- Hai app Việt Nam đã đọc (MochiMochi, Prep) bán theo gói thời hạn hoặc mã kích hoạt, không dùng trial tự gia hạn. Điều này khớp với việc cổng thanh toán Việt Nam chủ yếu thanh toán một lần (xem file nghiên cứu thanh toán).
- Trial của các app trên đều cho dùng đủ tính năng của gói ("full access"). Không trang nào đã đọc mô tả bản trial bị cắt bớt AI.

---

## 3. Số liệu opt-in và opt-out

### 3.1 Recurly (dữ liệu của các merchant dùng Recurly; chủ yếu trên web)

- **Báo cáo "The 2023 State of Subscriptions"** (dữ liệu từ 01/01 đến 31/12/2022, so với 2021; hơn 2.200 merchant) — [Đã đọc] https://go.recurly.com/rs/439-LSC-903/images/FINAL-rp-2023-01-state-of-subs-report.pdf
  - 90,4% số trial yêu cầu thông tin thanh toán. Nhóm này có tỷ lệ chuyển đổi trung bình **40,1%**, trial dài trung bình 30 ngày.
  - Trial không yêu cầu thông tin thanh toán: tỷ lệ chuyển đổi trung bình **25,5%**, trial dài trung bình 60 ngày.
  - Tỷ lệ trung bình theo site là 38,1%. Ngành Education: 42,1%. Trial ≤ 7 ngày: 42,8%; trial ≥ 61 ngày: 33,3%.
  - Định nghĩa: "average site-level conversion rate"; trial được đếm theo subscription (một tài khoản có hai trial thì tính hai).
- **Trang "State of Subscriptions: The acquisition chapter"** (01–08/2022, 803 site, 33,2% site có trial) — [Đã đọc] https://recurly.com/resources/report/state-of-subscriptions-acquisition/
  - 87,4% trial yêu cầu thông tin thanh toán: chuyển đổi trung bình **39,0%** (dài trung bình 29 ngày). Không yêu cầu: **12,0%** (dài trung bình 39 ngày).
  - Hai ấn phẩm của cùng Recurly cho số khác nhau ở nhóm không thẻ (12,0% so với 25,5%), vì khác giai đoạn và khác mẫu. Trang không định nghĩa thêm "conversion rate".

### 3.2 ChartMogul + Kyle Poyar, "The SaaS Conversion Report" (đăng 04/02/2026)

[Đã đọc] https://chartmogul.com/reports/saas-conversion-report/

- Khảo sát bằng Typeform tháng 01/2026, 200 sản phẩm phần mềm, số liệu do người trả lời **tự ước tính**.
- Định nghĩa: free-to-paid là tỷ lệ người đăng ký miễn phí trở thành khách trả tiền "within six months".
- Trong các sản phẩm có trial, 20% yêu cầu thẻ, 80% không.
- Trial cần thẻ: **30%** free-to-paid, "more than 5x" so với trial không thẻ.
- Mốc GOOD (trung vị) / GREAT (phân vị 75): trial không thẻ 4–6% / 10–15%; trial cần thẻ 25–35% / 50–60%; reverse trial 4–6% / 8–12% (tác giả ghi mẫu reverse trial nhỏ, chênh lệch không có ý nghĩa thống kê); sản phẩm AI-native 6–8% / 15–20%.
- Trên mỗi 1.000 lượt vào website: trial không thẻ có 45 người đăng ký và 3,6 khách trả tiền; trial cần thẻ có 35 người đăng ký và 10,5 khách trả tiền; freemium có 90 và 5.
- Lưu ý của chính báo cáo: yêu cầu thẻ có thể làm giảm số người đăng ký và tổng số khách trả tiền, trừ khi sản phẩm xứng đáng với rào cản đó.

### 3.3 FirstPageSage, qua bài của Adapty

[Thứ cấp] https://adapty.io/blog/trial-conversion-rates-for-in-app-subscriptions/ — Adapty trích FirstPageSage, "aggregated from 86 SaaS companies between Q1 2022 and Q3 2025":

- Opt-in (không thẻ): 8,5% visitor-to-trial, 18,2% trial-to-paid.
- Opt-out (cần thẻ): 2,5% visitor-to-trial, 48,8% trial-to-paid.
- Freemium: 13,3% và 2,6%.
- Chưa đọc trang gốc của FirstPageSage. Lấy hai tỷ lệ nhân với nhau thì opt-in ra nhiều khách trả tiền trên mỗi lượt truy cập hơn (khoảng 15,5 so với 12,2 trên 1.000) [Suy luận]; kết quả này ngược với ChartMogul ở mục 3.2, nên không kết luận được bên nào thắng tính trên mỗi lượt truy cập.

### 3.4 RevenueCat "State of Subscription Apps 2026" (app mobile)

[Đã đọc] https://www.revenuecat.com/state-of-subscription-apps — hơn 115.000 app, hơn 16 tỷ USD doanh thu, số liệu năm 2025.

- Trial trên App Store/Google Play đi qua tài khoản store có phương thức thanh toán, nên số liệu này thực chất là của trial opt-out [Suy luận; với Google: Play "verifies that the user has a valid payment method before starting the free trial" — Đã đọc https://developer.android.com/google/play/billing/subscriptions].
- Định nghĩa: download-to-trial = tỷ lệ lượt cài bắt đầu trial trong 30 ngày; trial-to-paid = tỷ lệ trial chuyển thành subscription trả tiền.
- Trial-to-paid (trung vị) theo độ dài: 17–32 ngày **42,5%**; 5–9 ngày 37,4%; 10–16 ngày 35,4%; ≤ 4 ngày 25,5%.
- Theo vùng: Bắc Mỹ 34,2%; châu Á – Thái Bình Dương 31,9%; Tây Âu 29,7%; **IN/SEA (Ấn Độ và Đông Nam Á) 15,2%**.
- Nhóm Education: download-to-trial 6,5%; 78,5% số trial bắt đầu ngay ngày cài app (Day 0); 50,3% trial dài 5–9 ngày; giá trung vị gói năm 44,99 USD, gói tháng 9,99 USD — [Đã đọc] https://www.revenuecat.com/state-of-subscription-apps-2026-education. Báo cáo không cho tỷ lệ trial-to-paid riêng của Education.
- Huỷ trial ngay trong Day 0: 55,4% số lần huỷ (trial 3 ngày); 39,8% (7 ngày); 35,7% (14 ngày); 31,1% (30 ngày).
- Hard paywall (phải trả hoặc bắt đầu trial mới dùng được) so với freemium, chuyển đổi Day 35 trung vị: 10,7% so với 2,1%. Trang tự mâu thuẫn về định nghĩa (thân bài ghi "trial-to-paid", chú thích biểu đồ ghi "download-to-paid") — [Đã đọc] https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026

**Bài riêng về độ dài trial** (08/2025–07/2026, hơn 17.000 app) — [Đã đọc] https://www.revenuecat.com/blog/growth/free-trial-length

- Gói tháng, trial-to-paid: ≤ 4 ngày khoảng 39,6%; 5–9 ngày 45,9%; 10–16 ngày 46,6%; 17–32 ngày 43,7%.
- Gói năm: khoảng 24%, 33%, 43% và 44,6% theo cùng các khoảng trên.
- Gia hạn lần đầu của gói tháng: không trial 49,5%; trial 10–16 ngày 72,0%; trial 17–32 ngày 77,5%.
- App AI có tỷ lệ chuyển đổi gói tháng và gia hạn lần đầu thấp hơn app không AI ở mọi độ dài trial.

### 3.5 Đọc các số này thế nào [Suy luận]

- Các nguồn cùng một hướng: trial cần thẻ chuyển đổi cao hơn **tính trên mỗi người dùng thử** (khoảng 1,6 lần theo Recurly 2022, hơn 5 lần theo ChartMogul 2026). Còn **tính trên mỗi lượt truy cập** thì các nguồn không thống nhất.
- Định nghĩa không giống nhau (trung bình theo site, trung vị, trong 6 tháng hay trong 30–35 ngày), nên không cộng hay so trực tiếp các con số với nhau.
- Phần lớn mẫu là SaaS hoặc khách ở Mỹ/châu Âu. Số duy nhất liên quan tới Đông Nam Á (RevenueCat IN/SEA 15,2%) thấp hơn hẳn các vùng khác.
- Chưa tìm thấy số về hoàn tiền hay khiếu nại (chargeback) của trial opt-out so với opt-in.

---

## 4. Cơ chế của Apple, Google, Stripe, Paddle

### 4.1 Apple: introductory offer (free trial) của auto-renewable subscription

- Có ba loại introductory offer: free trial, pay as you go, pay up front. Free trial dài được 3 ngày; 1 hoặc 2 tuần; 1, 2, 3 hoặc 6 tháng; 1 năm — [Đã đọc] https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions
- **Điều kiện được trial**: "Customers can redeem one introductory offer per subscription group" — [Đã đọc] https://developer.apple.com/app-store/subscriptions/. Người mới luôn được; người từng đăng ký rồi bỏ được lại nếu chưa dùng introductory offer nào trong group; người đang đăng ký thì không được, kể cả khi đổi gói trong group — [Đã đọc] https://developer.apple.com/tutorials/data/documentation/storekit/implementing-introductory-offers-in-your-app.json
- **Trừ tiền**: "Their subscription begins immediately, but they won't be billed until the offer duration ends" — [Đã đọc] https://developer.apple.com/app-store/subscriptions/. Hết introductory period thì gia hạn theo giá thường — [Đã đọc] trang StoreKit ở trên.
- **Huỷ**: Apple hướng dẫn người dùng huỷ "at least 24 hours before the trial ends" — [Đã đọc] https://support.apple.com/en-us/118428. Trang này không nói huỷ xong còn dùng tiếp tới hết trial không. Với app bên thứ ba, notification `EXPIRED` / `VOLUNTARY` mô tả "Subscription expired after the customer turned off renewal", nên subscription vẫn còn hạn tới cuối kỳ [Suy luận]. Speak (có bán qua App Store) ghi người dùng vẫn dùng mọi tính năng tới hết trial dù huỷ sớm, nhưng không tách theo nền tảng — [Đã đọc] [S1]. Các dịch vụ của chính Apple (Apple Music, Apple TV+) theo diễn đàn thì mất quyền ngay khi huỷ trial — [Thứ cấp] https://discussions.apple.com/thread/256184656
- **Server notification**: không có loại riêng cho trial. Trial bắt đầu đến dưới dạng `SUBSCRIBED` / `INITIAL_BUY` (hoặc `RESUBSCRIBE`), và muốn biết có offer thì xem `offerType` trong `JWSTransactionDecodedPayload`. Tắt gia hạn: `DID_CHANGE_RENEWAL_STATUS` / `AUTO_RENEW_DISABLED`. Gia hạn: `DID_RENEW`. Hết hạn sau khi tắt gia hạn: `EXPIRED` / `VOLUNTARY` — [Đã đọc] https://developer.apple.com/tutorials/data/documentation/appstoreservernotifications/notificationtype.json. Lúc trial chuyển sang trả tiền có thể đến dưới dạng `DID_RENEW` như một lần gia hạn thường [Thứ cấp, nhân viên Apple trả lời trên diễn đàn developer, qua đoạn trích: https://developer.apple.com/forums/thread/759883].
- **Nhắc trước khi hết trial**: không tìm thấy trang chính thức nào nói Apple gửi email nhắc; diễn đàn người dùng nói là không — [Thứ cấp] https://discussions.apple.com/thread/251481896
- **Công bố bắt buộc**: màn hình đăng ký phải có tên và thời hạn subscription, nội dung được dùng, giá gia hạn đầy đủ, cách khôi phục giao dịch đã mua, link Terms và Privacy. Riêng free trial: "clearly indicate how long the free trial lasts and the price billed once the free trial is over" — [Đã đọc] https://developer.apple.com/app-store/subscriptions/. Guideline 3.1.2(a): subscription app được có free trial "by providing the relevant information set forth in App Store Connect" — [Đã đọc] https://developer.apple.com/app-store/review/guidelines/
- **Trial ngoài IAP trên iOS** [Suy luận, cần xác minh]: guideline 3.1.1 cấm app "use their own mechanisms to unlock content or functionality". Guideline 3.1.3(b) cho người dùng dùng trong app những gì đã mua trên web, "provided those items are also available as in-app purchases" — [Đã đọc] cùng trang guidelines. Một trial không thẻ do Wordmet tự cấp mà mở khoá tính năng trả phí trong app iOS có thể bị review soi; chưa tìm thấy câu nào của Apple nói thẳng về trường hợp này.

### 4.2 Google Play: free trial là một offer gắn với base plan

- Offer chỉ tạo được cho base plan tự gia hạn. Phase free trial dài từ 3 ngày tới 3 năm. Free trial không pause được — [Đã đọc] https://support.google.com/googleplay/android-developer/answer/12154973
- **Điều kiện** — [Đã đọc] cùng trang:
  - *New customer acquisition*: người "never had entitlement to this subscription", hoặc (tuỳ chọn rộng hơn) chưa từng có subscription nào của app.
  - *Upgrade*: người đang dùng một gói cụ thể.
  - *Developer determined*: app tự quyết; Google không kiểm tra, và offer này không mua được ngoài app.
  - Play có thể phát hiện người lách điều kiện trial; người đó vẫn mua được base plan với giá đầy đủ.
- Có ô "Allow one free trial per app", "restricts the user to getting one free trial per app" — [Đã đọc] https://developer.android.com/google/play/billing/subscriptions
- **Thẻ**: "Google Play verifies that the user has a valid payment method before starting the free trial"; người dùng có thể thấy một khoản giữ tiền tạm, sau đó được hoàn — [Đã đọc] cùng trang.
- **Hết trial**: "the user's payment method is charged for the full subscription amount". **Huỷ giữa trial**: "the subscription remains active until the end of the trial, and they aren't charged" — [Đã đọc] cùng trang.
- **Nhắc**: "If you accept a trial offer, you'll get an email when your trial is about to end" — [Đã đọc] https://support.google.com/googleplay/answer/2476088?hl=en. Từ 2020, Google "now email[s] users a reminder before their free trial or intro price ends" — [Đã đọc] https://android-developers.googleblog.com/2020/04/building-user-trust-through-more.html. Hai trang đều không ghi gửi trước bao nhiêu ngày.
- **Real-time developer notification (RTDN)**: không có loại riêng cho trial. Các loại chung là `SUBSCRIPTION_PURCHASED`, `SUBSCRIPTION_RENEWED`, `SUBSCRIPTION_CANCELED`, `SUBSCRIPTION_EXPIRED`… — [Đã đọc] https://developer.android.com/google/play/billing/rtdn-reference. Muốn biết đang ở phase nào (ví dụ free trial) thì đọc trường `offerPhase` qua Developer API — [Đã đọc] https://developer.android.com/google/play/billing/subscriptions
- **Chính sách công bố**: phải nói rõ trial dài bao lâu, "how and when a free trial will convert to a paid subscription", giá sau trial, cách huỷ, và cho thấy người dùng vẫn dùng được nội dung mà không cần trial (nếu có lựa chọn đó) — [Đã đọc] https://support.google.com/googleplay/android-developer/answer/9900533

### 4.3 Stripe (chỉ để tham khảo mô hình; Stripe không nhận doanh nghiệp đặt ở Việt Nam)

- **Hai cách làm trial**: Trial Offer API mới (cần API version `2026-09-30.endive` và billing mode `flexible`) — [Đã đọc] https://docs.stripe.com/billing/subscriptions/trials; và `trial_end` / `trial_period_days` (Stripe gọi là "Legacy", trial tối đa 730 ngày) — [Đã đọc] https://docs.stripe.com/billing/subscriptions/trials/free-trials
- **Trial không cần thẻ**: "you don't need to add a payment method" — [Đã đọc] trang free-trials. Checkout dùng `payment_method_collection=if_required`.
- **Hết trial mà chưa có thẻ** (`trial_settings.end_behavior.missing_payment_method`) — [Đã đọc] trang free-trials:
  - `create_invoice` (mặc định): tạo hoá đơn; không trả được thì subscription chuyển `past_due`.
  - `cancel`: huỷ subscription, bắn event `customer.subscription.deleted`.
  - `pause`: tạm dừng tới khi người dùng thêm thẻ và resume, bắn event `customer.subscription.paused`.
- **Hết trial mà có thẻ**: tạo invoice, khoảng 1 giờ sau thì trừ tiền — [Đã đọc] trang free-trials.
- **`customer.subscription.trial_will_end`**: gửi theo cài đặt "Trial ending events" trong Dashboard, mặc định 3 ngày trước khi hết trial; trial ngắn hơn khoảng đó thì gửi ngay — [Đã đọc] https://docs.stripe.com/billing/subscriptions/trials
- **Email nhắc do Stripe gửi**: 7 ngày trước khi hết trial; trial dưới 7 ngày thì gửi ngay lúc bắt đầu; email có link cập nhật thẻ và link huỷ. Biên lai có thông tin trial và URL huỷ; statement descriptor được nối thêm `* TRIAL OVER` — [Đã đọc] https://docs.stripe.com/billing/subscriptions/trials/manage-trial-compliance
- Stripe cảnh báo trial không thẻ dễ bị spam tạo khách giả; gợi ý bắt tạo tài khoản và qua captcha trước khi cho trial — [Đã đọc] trang free-trials.

### 4.4 Paddle (merchant of record; nhận người bán cá nhân ở Việt Nam theo file nghiên cứu thanh toán)

- **Ba loại** — [Đã đọc] https://developer.paddle.com/concepts/subscriptions/trials:
  - Free trial cần thẻ: "Customers enter payment details at signup but aren't charged until the trial ends".
  - Paid trial: trả một khoản nhỏ lúc đầu; Paddle nêu ích lợi "reducing trial abuse".
  - **Cardless trial**, nhãn "public early access": tạo qua API (một transaction không cần thông tin thanh toán), và "Cardless trials are always free".
- **Hết trial (có thẻ)**: Paddle "automatically charges the payment method on file and transitions the subscription to `active` status" — [Đã đọc] cùng trang.
- **Nhắc**: với card trial, Paddle tự gửi email khi trial sắp hết, kèm link customer portal; với cardless trial, **app tự gửi** — [Đã đọc] cùng trang. Thời điểm gửi: (?).
- **Cardless trial hết hạn mà người dùng không thêm thẻ**: trang không mô tả (?). Muốn activate một trial không thẻ thì người dùng phải thêm thẻ qua checkout (theo phần tóm tắt AI trên trang, thân bài không ghi) — [Thứ cấp] https://developer.paddle.com/build/trials/extend-activate-change-date-trials
- **Webhook**: `subscription.trialing` khi vào trial; `subscription.activated` "typically follows when the trial ends and Paddle has successfully billed the customer" — [Đã đọc] https://developer.paddle.com/webhooks/subscriptions/subscription-trialing
- **Kéo dài hoặc kết thúc trial sớm**: kéo dài bằng PATCH `next_billed_at` (ít nhất 30 phút sau thời điểm hiện tại); kết thúc sớm bằng POST `/subscriptions/{id}/activate` (chỉ cho subscription thu tiền tự động); khi đang trial, `proration_billing_mode` chỉ nhận `do_not_bill` — [Đã đọc] https://developer.paddle.com/build/trials/extend-activate-change-date-trials
- Mỗi khách được mấy trial: trang không nói (?).

---

## 5. Quy định về nhắc trước khi trừ tiền

Tóm tắt ở mức khái quát, không phải tư vấn pháp lý.

### 5.1 Visa (áp dụng cho merchant có trial hoặc ưu đãi đầu kỳ chuyển thành trả tiền định kỳ)

Nguồn: Visa Business News 20/06/2019, Article ID AI09067 — [Đã đọc] https://usa.visa.com/dam/VCOM/global/support-legal/documents/subscription-merchants-visa-public.pdf; tờ tóm tắt — [Đã đọc] https://usa.visa.com/content/dam/VCOM/global/support-legal/documents/visa-new-subscription-rules-flier.pdf

- Hiệu lực 18/04/2020. Vùng ghi trên văn bản: "AP, Canada, CEMEA, LAC, U.S." (AP là châu Á – Thái Bình Dương). Áp dụng cho cả hàng vật lý lẫn hàng số.
- **Express consent**: lúc đăng ký, người dùng phải đồng ý rõ ràng với việc tham gia subscription trả tiền định kỳ.
- **Gửi điều khoản ngay lúc đăng ký** (email hoặc SMS), "even if no amount was due at the time": xác nhận đã đăng ký, ngày bắt đầu, nội dung dịch vụ, số tiền và chu kỳ thu, link huỷ online.
- **Nhắc**: gửi email/SMS kèm link huỷ "at least seven (7) days before initiating a recurring transaction" khi trial hoặc ưu đãi sắp hết, hoặc khi giá hay chu kỳ thu thay đổi.
- **Huỷ online dễ**, "similar to 'unsubscribing' from an email distribution list".
- **Biên lai** phải ghi độ dài trial và nói rõ sẽ bị trừ tiền nếu không huỷ.
- Statement descriptor có chữ "trial": chuyển thành **tuỳ chọn** từ 17/04/2021 — [Đã đọc] https://usa.visa.com/content/dam/VCOM/global/support-legal/documents/revised-enhanced-descriptor-policy.pdf
- Trial ≤ 7 ngày thì đưa nội dung nhắc vào email xác nhận ban đầu: theo đoạn trích một FAQ của Visa — [Thứ cấp]; Stripe cũng làm vậy (gửi nhắc ngay khi trial bắt đầu) — [Đã đọc] mục 4.3.

### 5.2 Mastercard

Không đọc được (trang PDF trả 403; mở bằng trình duyệt thì thành tải file, không lưu). Theo đoạn trích tìm kiếm của FAQ Mastercard [Thứ cấp, https://www.mastercard.com/content/dam/mccom/ca/en/business/documents/subscription-recurring-payments-and-negative-option-billing-merchants%E2%80%93faqs.pdf]: công bố 09/2021, hiệu lực 22/09/2022; cần người dùng chấp nhận điều khoản trước khi thu; trial dài hơn 7 ngày thì phải nhắc. Chưa xác minh.

### 5.3 Apple và Google

- Apple: công bố bắt buộc ở mục 4.1. Không thấy Apple cam kết gửi nhắc trước khi hết trial.
- Google: chính sách công bố và email nhắc của Play ở mục 4.2.
- Khi bán qua store hoặc qua Paddle (merchant of record), bên thu tiền là store hoặc Paddle, nên nghĩa vụ với tổ chức thẻ có lẽ thuộc về họ [Suy luận]. Paddle tự gửi email nhắc cho card trial — [Đã đọc] mục 4.4.

### 5.4 Việt Nam: Luật Bảo vệ quyền lợi người tiêu dùng 2023 (Luật số 19/2023/QH15)

Nguồn: văn bản luật đọc trên hai trang tra cứu luật của bên thứ ba và đối chiếu chéo — [Thứ cấp] https://caselaw.vn/van-ban-phap-luat/411464-luat-bao-ve-quyen-loi-nguoi-tieu-dung-so-19-2023-qh15-ngay-20-06-2023-cua-quoc-hoi và https://hethongphapluat.com/luat-bao-ve-quyen-loi-nguoi-tieu-dung-2023/dieu-42. Bản PDF trên cổng tỉnh Bình Phước không tải được (lỗi chứng chỉ). Luật ban hành 20/06/2023, hiệu lực 01/07/2024; Nghị định 55/2024/NĐ-CP hướng dẫn — [Thứ cấp, đoạn trích tìm kiếm], **chưa đọc nghị định**.

- **Điều 3 khoản 6**: "Cung cấp dịch vụ liên tục là việc cung cấp dịch vụ có thời hạn từ 03 tháng trở lên hoặc không xác định thời hạn". Khoản 5: giao dịch từ xa là giao dịch "trên không gian mạng, phương tiện điện tử…".
- **Điều 25 khoản 13**: hợp đồng theo mẫu và điều kiện giao dịch chung không được có điều khoản cho phép gia hạn hợp đồng đã thoả thuận với người tiêu dùng "mà không quy định trách nhiệm thông báo trước" (theo caselaw.vn: cũng không được thiếu cơ chế để người tiêu dùng chọn gia hạn hay chấm dứt).
- **Điều 42 khoản 2** (hợp đồng theo mẫu cung cấp dịch vụ liên tục) phải có: điểm đ, thông báo việc nộp phí để tiếp tục sử dụng dịch vụ "chậm nhất là 07 ngày làm việc trước ngày hết hạn sử dụng dịch vụ"; điểm e, thông báo thời điểm kết thúc hợp đồng, cũng ít nhất 07 ngày làm việc trước.
- **Điều 42 khoản 3**: người tiêu dùng có quyền "đơn phương chấm dứt thực hiện hợp đồng cung cấp dịch vụ liên tục tại bất kỳ thời điểm nào" (trừ khi có thoả thuận khác), và "chỉ phải thanh toán đối với phần dịch vụ mà mình đã sử dụng".
- **Điều 10 khoản 1 điểm d**: cấm ép người tiêu dùng thanh toán cho sản phẩm, dịch vụ đã cung cấp "mà không có thỏa thuận trước".
- **Điều 38**: giao dịch từ xa mà thông tin cung cấp thiếu hoặc sai thì người tiêu dùng được đơn phương chấm dứt trong 30 ngày.

**Suy luận cho Wordmet** (chưa xác minh, nên hỏi người có chuyên môn pháp lý):

- Pro tự gia hạn theo tháng hoặc năm có lẽ thuộc nhóm "không xác định thời hạn", tức là dịch vụ liên tục.
- Trial 14 ngày không thẻ, không thu tiền thì gần như không chạm các điều trên.
- Nếu sau này trial tự chuyển thành Pro, mốc 7 ngày làm việc (khoảng 9–11 ngày lịch) chiếm phần lớn một trial 14 ngày: thông báo phải đi từ khoảng ngày 3–5 của trial.
- Chưa rõ khi bán qua Paddle hay App Store thì ai là "tổ chức, cá nhân kinh doanh" theo luật này.
- Điều 42 khoản 3 (chỉ trả phần đã dùng) đặt câu hỏi cho gói năm: người dùng huỷ giữa năm có được hoàn phần chưa dùng không.

---

## 6. Chống lạm dụng trial

| Cách | Chặn được gì | Cần gì | Lọt ở đâu | Nguồn |
|---|---|---|---|---|
| Một trial cho mỗi tài khoản, email đã xác minh (Wordmet đang có) | Bật trial lại trên cùng tài khoản | Cờ "đã dùng trial" gắn với tài khoản, giữ cả khi trial đã hết | Tạo email mới | [Suy luận] |
| Tài khoản + captcha trước khi cho trial không thẻ | Bot tạo hàng loạt khách giả | Captcha ở bước đăng ký | Người thật tạo nhiều tài khoản | Stripe khuyên — [Đã đọc] https://docs.stripe.com/billing/subscriptions/trials/free-trials |
| Theo dấu vân tay thẻ (`card.fingerprint` của Stripe) | Cùng một thẻ mở trial ở nhiều tài khoản | Trial có thẻ; lưu fingerprint cùng lịch sử trial | Thẻ khác; Apple Pay/Google Pay có thể trả số đã token hoá thay cho số thẻ thật | "Uniquely identifies this particular card number…" — [Đã đọc] https://docs.stripe.com/api/payment_methods/object?query=card. Paddle có trường tương tự không: chưa tìm (?) |
| Theo tài khoản store | Cùng Apple Account dùng lại intro offer trong cùng subscription group; cùng tài khoản Google dùng lại trial | Dùng offer của store; store tự xét | Tài khoản store khác; không chặn được người đã có trial bên web | [Đã đọc] mục 4.1, 4.2 |
| Google "Allow one free trial per app"; Play tự phát hiện người lách điều kiện | Một trial cho mỗi app | Bật trong Play Console | (?) | [Đã đọc] mục 4.2 |
| Theo thiết bị, iOS: DeviceCheck (2 bit cho mỗi thiết bị lưu trên server Apple) | Thiết bị đã nhận ưu đãi: "identify devices that have already taken advantage of a promotional offer" | Gọi DeviceCheck từ app và server | Apple ghi DeviceCheck chỉ là một tín hiệu trong đánh giá rủi ro | [Đã đọc] https://developer.apple.com/tutorials/data/documentation/devicecheck.json |
| Theo thiết bị, Android: Play Integrity `deviceRecall` (beta) | Thiết bị đã dùng trial, kể cả khi cài lại app hoặc reset máy; ví dụ chính thức: "has or hasn't redeemed a free trial" | Tích hợp Play Integrity API | Bản beta; tối đa 3 cờ cho mỗi thiết bị | [Đã đọc] https://developer.android.com/google/play/integrity/overview |
| Theo thiết bị, web: browser fingerprint | Nhiều tài khoản trên cùng trình duyệt | Thư viện bên ngoài | Đổi trình duyệt; có vấn đề quyền riêng tư | Chưa nghiên cứu [Suy luận] |
| Paid trial (thu một khoản nhỏ lúc đầu) | Người không định trả tiền | Có cổng thanh toán | — | Paddle: paid trial giúp "reducing trial abuse" — [Đã đọc] https://developer.paddle.com/concepts/subscriptions/trials |
| Mã mời hoặc khuyến mãi dùng một lần, chỉ người dùng Free được nhận, thu hồi nếu nghi lạm dụng | Dùng lại mã, cộng dồn ưu đãi | Hệ thống mã | — | OpenAI — [Đã đọc] [O1] |

---

## 7. Hệ quả cho thiết kế của Wordmet

Phần này chỉ liệt kê điều thiết kế phải biểu diễn được và các lựa chọn kèm trade-off. **Không chọn phương án** (quy tắc dự án: chủ dự án trả lời trước).
Cả mục là [Suy luận] dựa trên mục 2–6.

### 7.1 Điều thiết kế cần biểu diễn được (dù chọn phương án nào)

1. **Nguồn của trial**: trial do Wordmet tự cấp (không thẻ, V1) và trial do bên thanh toán quản lý (Paddle card trial, introductory offer của Apple, offer của Google, sau này). Hai nguồn có vòng đời khác nhau: tự cấp thì Wordmet tự đặt mốc hết hạn; do bên thanh toán quản lý thì trạng thái đến từ webhook hoặc notification (`subscription.trialing` / `subscription.activated`, `SUBSCRIBED` / `DID_RENEW`, `SUBSCRIPTION_PURCHASED`…).
2. **Lịch sử "đã dùng trial" tách khỏi subscription**: hết trial, subscription có thể không còn, nhưng cờ "đã dùng" phải còn. Sau này có thể cần thêm khoá khác ngoài tài khoản: tài khoản store, dấu vân tay thẻ, thiết bị.
3. **Kết quả khi hết trial**: (a) về Free; (b) tự lên Pro vì bên thanh toán đang giữ thẻ; (c) chờ thanh toán / tạm dừng (kiểu `pause` của Stripe). V1 chỉ cần (a), nhưng trạng thái nên chừa chỗ cho (b).
4. **Huỷ giữa trial**: "huỷ gia hạn nhưng vẫn dùng tới hết trial" (Google Play, Speak) và "kết thúc ngay" (Grammarly) là hai hành vi khác nhau. Cần một trạng thái kiểu "đang trial, sẽ không gia hạn".
5. **Nhắc trước khi hết trial / trước khi trừ tiền**: ai gửi (Paddle và Google tự gửi với trial có thẻ; trial tự cấp hay cardless thì Wordmet gửi), lúc nào (Visa ≥ 7 ngày; luật Việt Nam ≥ 7 ngày làm việc cho dịch vụ liên tục; Duolingo nhắc ngày 5 của trial 7 ngày; Grammarly 2 ngày trước), và trường hợp trial ngắn hơn mốc nhắc.
6. **Trial chéo nền tảng**: Apple tự xét quyền trial theo Apple Account và subscription group; Wordmet không ép được Apple từ chối người đã dùng trial trên web. Người dùng có thể được một trial web và thêm một trial trên store. Google có offer "developer determined" do app tự xét, nhưng offer đó không mua được ngoài app.
7. **iOS**: trial tự cấp mở khoá tính năng trong app iOS có thể vướng guideline 3.1.1 / 3.1.3(b) (mục 4.1). Cần xác minh trước khi làm Flutter.

### 7.2 Các mô hình trial (để chủ dự án cân nhắc; không xếp hạng)

| # | Mô hình | Được | Mất / rủi ro |
|---|---|---|---|
| T1 | **Opt-in, không thẻ** (quyết định hiện tại của V1): tự bấm kích hoạt, hết trial về Free | Làm được ngay, không cần thanh toán; ít ràng buộc của tổ chức thẻ và luật về gia hạn | Tỷ lệ thành trả tiền trên mỗi người thử thấp hơn (mục 3); dễ bị tạo tài khoản mới để dùng lại; phải tự gửi email nhắc |
| T2 | **Opt-out, giữ thẻ qua bên thanh toán** (Paddle card trial; introductory offer của Apple; offer của Google): hết trial tự lên Pro | Kiểu chủ dự án thích; tỷ lệ chuyển đổi trên mỗi người thử cao hơn; Paddle và Google tự gửi nhắc | Cần thanh toán thật; ít người bắt đầu trial hơn; phải đáp ứng Visa, chính sách store, luật Việt Nam; người dùng Việt Nam ít dùng thẻ quốc tế (xem file nghiên cứu thanh toán) |
| T3 | **Lai**: T1 bây giờ, thêm T2 sau như một nguồn trial thứ hai, một trial cho mỗi tài khoản Wordmet tính trên cả hai nguồn | Không phải làm lại khi có thanh toán | Phải xác định quy tắc khi người dùng đã dùng T1 rồi muốn T2 (cho hay không); không chặn được trial của store |
| T4 | **Reverse trial**: tự vào Pro khi đăng ký, hết hạn tự về Free | Ai cũng được thấy Pro | Trái quyết định hiện tại "kích hoạt bằng hành động rõ ràng"; ChartMogul ghi mẫu nhỏ, chưa thấy hơn trial thường |
| T5 | **Không có trial theo ngày**: Free kèm một ít lượt AI (như Notion) hoặc paid trial (tháng đầu giá thấp) | Không cần logic hết hạn trial; paid trial giúp chống lạm dụng | Người dùng không trải nghiệm đủ Pro; paid trial cần thanh toán thật |

### 7.3 Mẫu hạn mức AI: Trial so với Pro (để cân nhắc; không xếp hạng)

| # | Mẫu | Ví dụ thấy được | Được | Mất / rủi ro |
|---|---|---|---|---|
| Q1 | Trial **bằng** Pro | Speak, ELSA: trial "full access" (Đ); số lượt AI trong trial của họ không ghi | Người dùng đánh giá đúng thứ họ sẽ mua | Mỗi trial tốn chi phí AI như một người trả tiền, cả khi người đó không bao giờ trả |
| Q2 | Trial **thấp hơn** Pro (mặc định cũ của dự án) | Không tìm thấy app nào trong các trang đã đọc ghi rõ cách này (?) | Giới hạn chi phí cho mỗi trial | Người dùng đánh giá Pro qua một bản bị cắt bớt |
| Q3 | Một **kho lượt dùng một lần** cho cả trial, không reset | Notion: "complimentary AI responses" (Đ), số lượt không công bố | Biết trước chi phí tối đa cho mỗi trial; không cần quy đổi theo tháng | Người dùng hết lượt sớm thì những ngày trial còn lại kém giá trị |
| Q4 | Hạn mức theo tháng của gói, reset đầu tháng, áp luôn cho trial | Grammarly 100 so với 2.000 lượt/tháng; Mochi Cards 20 so với 1.000 lượt tra từ/tháng (Đ) | Một quy tắc dùng chung cho mọi gói | Trial 14 ngày cắt ngang tháng: phải quyết có chia theo tỷ lệ hay không, và khi trial chuyển sang Pro giữa tháng thì hạn mức reset hay cộng dồn |
| Q5 | Giới hạn theo ngày trong thời gian trial | Không thấy trong các trang đã đọc [Suy luận] | Chặn việc dùng dồn trong vài ngày | Thêm một loại hạn mức phải giải thích cho người dùng |

---

## 8. Câu hỏi còn mở và trang không đọc được

### 8.1 Trang không đọc được hoặc không có thông tin

- Trang tài liệu StoreKit và notificationType của Apple dựng bằng JavaScript nên công cụ tải trang không đọc được; đã đọc qua bản JSON (`developer.apple.com/tutorials/data/...json`) của chính Apple.
- `quizlet.com/upgrade`: "Access to this page has been denied". Độ dài trial của Quizlet chưa xác minh được.
- PDF FAQ của Mastercard: 403. Khi mở bằng trình duyệt dựng sẵn, trang trả về file tải xuống nên trình duyệt hiện hộp thoại lưu file; tôi không lưu và không thử lại. Mục 5.2 vì vậy chỉ là [Thứ cấp].
- Busuu và Memrise: help center không có bài nào về trial; không biết họ có trial hay không.
- Duolingo Max: không có trang nào nói về trial.
- Prep: trang "Học thử 0 đồng" chỉ còn trang giữ chỗ của tên miền.
- MochiMochi: bài "Hướng dẫn tải app và học thử miễn phí" chưa đọc; MochiMochi tiếng Anh có tự gia hạn không thì chưa rõ.
- ELSA: hai FAQ mâu thuẫn (không cần thẻ, nhưng có người bị gia hạn thành gói 3 tháng); trang FAQ huỷ web trả 404.
- Mochi Cards: độ dài trial và có cần thẻ không.
- Speak: trang huỷ subscription trả 404 khi tải (thông tin kênh Paddle/Stripe chỉ là [Thứ cấp]).
- Luật Bảo vệ quyền lợi người tiêu dùng 2023: chỉ đọc trên trang tra cứu của bên thứ ba; Nghị định 55/2024/NĐ-CP chưa đọc.
- Trang gốc FirstPageSage chưa đọc (số liệu chỉ qua Adapty).

### 8.2 Câu hỏi kỹ thuật còn mở

- Apple có cần thẻ để bắt đầu free trial không, và có gửi email nhắc trước khi hết trial không: chưa có nguồn chính thức.
- Google Play gửi email nhắc trước bao nhiêu ngày: chưa có nguồn.
- Paddle cardless trial hết hạn mà không có thẻ thì subscription chuyển sang trạng thái gì; Paddle có giới hạn một trial cho mỗi khách hay có dấu vân tay thẻ không.
- Một trial không thẻ do Wordmet tự cấp có được mở khoá tính năng trong app iOS/Android không (Apple 3.1.1 / 3.1.3(b), chính sách thanh toán của Google Play).
- Luật Việt Nam: điều nào áp dụng khi bán qua Paddle (merchant of record) hoặc qua App Store; thông báo 7 ngày làm việc có áp dụng cho lần thu đầu tiên sau trial không; gói năm huỷ giữa chừng có phải hoàn phần chưa dùng không (Điều 42 khoản 3).

### 8.3 Câu hỏi quyết định cho chủ dự án (chủ dự án trả lời trước; ở đây không đề xuất)

1. Mô hình trial nào trong T1–T5 cho V1, và có cần chừa chỗ cho T2 sau này không?
2. Hạn mức AI của Trial so với Pro theo mẫu nào trong Q1–Q5?
3. Huỷ giữa trial: vẫn dùng tới hết trial, hay kết thúc ngay?
4. Wordmet có gửi email nhắc trước khi hết trial không thẻ không, nếu có thì gửi lúc nào?
5. "Một trial cho mỗi…": chỉ theo tài khoản như hiện nay, hay thêm khoá khác khi có thanh toán (thẻ, tài khoản store, thiết bị)?
6. Khi có app mobile: chấp nhận người dùng được một trial web và thêm một trial trên store, hay tìm cách gộp?
