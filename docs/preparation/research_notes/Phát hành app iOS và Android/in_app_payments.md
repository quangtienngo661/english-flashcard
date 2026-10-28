# In-app payments: bán gói "Pro" tự gia hạn trong app iOS và Android (storefront Việt Nam, developer cư trú tại Việt Nam) — tình trạng tháng 10/2026

Ghi chú nghiên cứu, viết 20/10/2026. Mọi nội dung thuế và pháp lý dưới đây **không phải tư vấn pháp lý hoặc tư vấn thuế**; cần người có chuyên môn (kế toán, luật sư thuế ở Việt Nam) xác nhận trước khi làm theo.
Ký hiệu: **[Đã đọc]** = đã mở trang và đọc trong phiên này; **[Snippet]** = chỉ thấy qua kết quả tìm kiếm, chưa mở trang; **[Thứ cấp]** = nguồn không phải Apple, Google hay cơ quan nhà nước; **[Có thể cũ]** = nguồn hoặc mốc từ trước 2025.
Các trang Apple viết bằng JavaScript thì được đọc qua bản JSON chính thức của Apple (`developer.apple.com/tutorials/data/...json`), giống cách các file nghiên cứu trước đã làm.

## 1. App mobile có bắt buộc dùng Apple IAP / Google Play Billing cho Pro không? Được nhắc hoặc dẫn link tới giá web rẻ hơn không? Ngoại lệ ở Mỹ, EU và các chương trình của Google có áp dụng cho storefront Việt Nam không?

### Takeaway
Có. Ở storefront Việt Nam, Pro bán trong app iOS phải là Apple IAP, trong app Android phải dùng Google Play Billing. App **không được** có nút, link hay lời mời mua ở nơi khác (kể cả "web rẻ hơn"). Tất cả ngoại lệ (Mỹ sau vụ Epic v. Apple; EU/EEA, Hàn Quốc, Nhật, Brazil, Hà Lan; user choice billing và billing choice của Google) đều **không có Việt Nam**. App vẫn được cho người dùng dùng Pro đã mua trên web, với điều kiện trên iOS Pro cũng bán được qua IAP trong app. Chương trình mới của Google (tháng 3/2026) cho dùng hệ thống thanh toán riêng sẽ tới nhóm "phần còn lại của thế giới" chậm nhất **30/9/2027**; tới lúc đó Việt Nam vẫn theo luật cũ.

### Cited Findings
**Apple**
- 3.1.1: "If you want to unlock features or functionality within your app, (by way of example: subscriptions, … access to premium content …), you must use in-app purchase. Apps may not use their own mechanisms to unlock content or functionality, such as license keys …" — [Đã đọc] [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- 3.1.1(a): entitlement link ra ngoài "are limited to use only in specific storefronts of the App Store … In all other storefronts, except for the United States storefront, where this prohibition does not apply, apps and their metadata may not include buttons, external links, or other calls to action that direct customers to purchasing mechanisms other than in-app purchase." — [Đã đọc] [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- 3.1.1(a): các entitlement này "are not required for developers to include buttons, external links, or other calls to action in their United States storefront apps." Tức là ở Mỹ được link ra ngoài mà không cần entitlement — [Đã đọc] [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/). Theo một nguồn thứ cấp, Apple đổi quy tắc này ngày 1/5/2025 để tuân lệnh tòa ở Mỹ — [Snippet][Thứ cấp] [newly.app](https://newly.app/how-to/app-store-external-purchase-link)
- 3.1.3 (phần mở đầu): các app trong mục này "cannot, within the app, encourage users to use a purchasing method other than in-app purchase, except for apps on the United States storefront …"; developer được liên lạc **ngoài app** với người dùng về cách mua khác — [Đã đọc] [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- 3.1.3(b) Multiplatform Services: app "may allow users to access content, subscriptions, or features they have acquired in your app on other platforms or your web site … provided those items are also available as in-app purchases within the app." — [Đã đọc] [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- 3.1.3(a) Reader apps chỉ dành cho "magazines, newspapers, books, audio, music, and video" — [Đã đọc] [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/). App học từ vựng không thuộc nhóm này **[Suy luận]**.
- Tài liệu StoreKit External Purchase chỉ nêu các vùng: EU và Hàn Quốc (nhà cung cấp thanh toán khác), EU (custom link), EEA (nhạc), Brazil (từ iOS 26.5), Nhật (từ iOS 26.2), EEA và Nga (nhiều link ra ngoài). Không có Việt Nam, cũng không nhắc tới Mỹ — [Đã đọc] [StoreKit External Purchase (JSON)](https://developer.apple.com/tutorials/data/documentation/storekit/external-purchase.json)
- Entitlement theo lệnh của ACM "are only available for dating apps on the App Store in the Netherlands" — [Đã đọc] [Distributing dating apps in the Netherlands](https://developer.apple.com/support/storekit-external-entitlement/)
- Trang guidelines (phần đọc được) không nhắc tới Việt Nam — [Đã đọc] [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

**Google**
- Payments policy mục 2: app thu tiền cho tính năng hay dịch vụ trong app "must use Google Play's billing system for those transactions unless Section 3, 8, or 9 applies"; ví dụ có "subscription services" — [Đã đọc] [Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en)
- Mục 4: "apps may not lead users to a payment method other than Google Play's billing system". Lệnh cấm áp cho trang Play listing, quảng bá trong app, "In-app webviews, buttons, links, messaging, advertisements, or other calls to action". Mục 8 và 9 (thanh toán khác trong app, dẫn ra ngoài) chỉ áp cho "eligible countries/regions" có đăng ký chương trình — [Đã đọc] [Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en)
- FAQ: trong app không được "directly linking to a webpage that could lead to an alternate payment method" hoặc "using language that encourages a user to purchase the digital item outside of the app"; được liên lạc ngoài app (email…) về giá, "even special pricing"; "Google Play allows any app to be consumption-only, even if it is part of a paid service" — [Đã đọc] [Understanding Google Play's Payments policy](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en)
- User choice billing: danh sách nước gồm Australia, Brazil, Indonesia, Japan, South Africa, United Kingdom và các nước EEA; Hàn Quốc, Ấn Độ, Mỹ có chương trình riêng. **Không có Việt Nam** — [Đã đọc] [User choice billing](https://support.google.com/googleplay/android-developer/answer/13821247?hl=en)
- Billing choice program (mới, 2026): "Only offer billing choice to users in available markets, currently:" Australia (30/9/2026), Japan (30/9/2026), UK (30/6/2026), EEA (30/6/2026); Mỹ dùng các chương trình alternative billing và external content links đang có. Không có Việt Nam hay Đông Nam Á — [Đã đọc] [Billing choice program](https://support.google.com/googleplay/android-developer/answer/17161464?hl=en)
- Blog 4/3/2026 (Sameer Samat): "Mobile developers will have the option to use their own billing systems in their app alongside Google Play's billing." Lộ trình: EEA, UK, US trước 30/6; Australia trước 30/9; Hàn Quốc và Nhật trước 31/12; "The updates will reach the rest of the world" trước **30/9/2027**. Google cũng tuyên bố đã giải quyết tranh chấp với Epic trên toàn cầu — [Đã đọc] [A new era for choice and openness](https://android-developers.googleblog.com/2026/03/a-new-era-for-choice-and-openness.html)

### Inferences
- Tới ít nhất 30/9/2027, ở storefront Việt Nam: Pro trong app iOS = IAP, trong app Android = Play Billing. App và metadata (mô tả trên store) không được nói "mua trên web rẻ hơn" hay dẫn link tới trang thanh toán web. Email, Zalo, landing page **ngoài app** thì được nói về giá web (cả Apple 3.1.3 lẫn FAQ của Google).
- Một tài khoản mua Pro trên web (cổng Việt Nam) được dùng Pro trong app iOS (3.1.3(b), vì Pro cũng bán qua IAP) và trong app Android (FAQ consumption-only của Google). Hai trang của Google không nói thẳng về app **vừa** bán qua Play Billing **vừa** nhận gói mua trên web; xem mục Gaps.
- Pro do staff cấp (đã có ở Bước 5) và Pro mua trên web là quyền có được ngoài app, nên gần với 3.1.3(b) hơn là "own mechanisms to unlock" của 3.1.1. Nhưng **trial không thẻ do Wordmet tự cấp** mà mở khóa Pro trong app iOS thì vẫn có rủi ro bị review (file TRIAL_MODELS đã nêu, chưa có câu nào của Apple nói thẳng).
- Chương trình mới của Google tới Việt Nam muộn nhất 30/9/2027. Thiết kế bộ nối nên chừa đường cho "Android dùng cổng thanh toán riêng" về sau, nhưng V1 không cần.

### Gaps
- Chưa đọc được phần cuối trang guidelines (ký tự sau 100.000). Có thể còn nhắc tới quốc gia nào đó ở mục 5.
- Google không có câu chính thức nói rõ app **vừa** dùng Play Billing **vừa** công nhận gói mua trên web có được phép không (Apple thì có 3.1.3(b)). FAQ chỉ nói "any app can be consumption-only" và không cấm. Thực tế nhiều app làm vậy, nhưng đó là quan sát, chưa phải nguồn.
- Lịch cụ thể cho Việt Nam trong đợt "rest of the world" và mức billing fee ở Việt Nam: Google chưa công bố.

## 2. Phí hoa hồng: Apple Small Business Program, 15% sau năm đầu của subscription, Google 15%; thay đổi 2025–2026; cách đăng ký

### Takeaway
Apple: 15% từ đầu nếu thuộc Small Business Program (doanh thu ròng dưới 1 triệu USD năm trước và năm nay, developer mới cũng được). Nếu không thuộc chương trình: 30% năm đầu của mỗi subscriber, 15% sau một năm trả phí. Google ở Việt Nam (tháng 10/2026): **15% cho auto-renewing subscription**. Bảng phí mới của Google (subscription 10% service fee + billing fee riêng) mới áp ở EEA/UK/US, Úc, Nhật, Hàn; tới Việt Nam muộn nhất 30/9/2027. Cả hai đều phải tự đăng ký chương trình 15%.

### Cited Findings
**Apple**
- "During a subscriber's first year of service, you receive 70% of the subscription price at each billing cycle, minus applicable taxes. After a subscriber accumulates one year of paid service, your net revenue increases to 85%…" — [Đã đọc] [Auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/)
- Đếm ngày trả phí: tính cả các offer có trả tiền; "Free trials and renewal extensions are excluded from days of paid service"; tính riêng theo subscription group; nâng, hạ, đổi gói trong cùng group không ảnh hưởng; mất gói và quay lại trong 60 ngày thì đếm tiếp, quá 60 ngày thì đếm lại từ đầu — [Đã đọc] [Auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/)
- "If you're currently enrolled in the App Store Small Business Program, you receive 85% of the subscription price at each billing cycle … regardless of whether or not the subscription has accumulated one year of paid service." — [Đã đọc] [Auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/)
- Small Business Program: "a reduced commission rate of 15% on paid apps and Apple In-App Purchases"; điều kiện: "no more than 1 million USD in total proceeds … during the 12 fiscal months occurring within the previous calendar year, and … no more than 1 million USD during the current year"; developer mới cũng đủ điều kiện; vượt ngưỡng trong năm thì "the standard commission rate will apply to future sales" — [Đã đọc] [App Store Small Business Program](https://developer.apple.com/app-store/small-business-program/)
- Cách đăng ký: là Account Holder, chấp nhận Paid Apps agreement (Schedule 2) trong App Store Connect, khai các Associated Developer Accounts, rồi bấm "Enroll now". Mức giảm áp từ 15 ngày sau khi hết tháng tài chính có đơn được duyệt (ví dụ trên trang dùng năm 2022) — [Đã đọc] [App Store Small Business Program](https://developer.apple.com/app-store/small-business-program/)
- Trang SBP cũng có câu "For developers on the alternative terms in the EU in the App Store Small Business Program and for subscriptions after their first year, Apple will offer a further reduced commission of 10%." Câu này gắn với điều khoản EU — [Đã đọc] [App Store Small Business Program](https://developer.apple.com/app-store/small-business-program/)

**Google**
- Phần còn lại của thế giới: "15% for the first $1M (USD) revenue earned by the developer each year", "30% for earnings in excess of $1M", "15% for automatically renewing subscription products purchased by subscribers"; các mức này áp "until the announced updated service fees are rolled out globally" — [Đã đọc] [Service fees](https://support.google.com/googleplay/android-developer/answer/112622?hl=en)
- Úc, EEA, Nhật, UK, Mỹ có bảng mới theo "new install" và "existing install"; mốc "June 30, 2026 for the EEA, UK, and US; September 30, 2026 for Australia and Japan"; billing fee 5% khi dùng Play Billing ở các thị trường này. Bảng trên trang bị vỡ khi đọc, nên cột nào là mức nào chưa chắc — [Đã đọc] [Service fees](https://support.google.com/googleplay/android-developer/answer/112622?hl=en)
- Blog 4/3/2026: "Our service fee for recurring subscriptions will be 10%"; IAP cho new installs 20%; billing fee tách riêng "In the European Economic Area (EEA), UK, and US that rate will be 5%"; tới "rest of the world" trước 30/9/2027 — [Đã đọc] [A new era for choice and openness](https://android-developers.googleblog.com/2026/03/a-new-era-for-choice-and-openness.html)
- Lưu ý mốc Nhật: trang service fees ghi 30/9/2026, blog ghi "By December 31: Korea and Japan" — **mâu thuẫn giữa hai trang của Google**. Không ảnh hưởng tới Việt Nam — [Đã đọc] hai nguồn trên.
- Báo chí thứ cấp ghi các mức khác nhau (ví dụ 25% cho existing installs, "10% headline, 15% reality") — [Snippet][Thứ cấp] [ppc.land](https://ppc.land/google-play-developers-face-25-percent-fee-under-new-structure/), [pricepush.app](https://pricepush.app/blog/google-play-subscription-fees-2026-real-math), [MacRumors 24/6/2026](https://www.macrumors.com/2026/06/24/google-play-store-fee-change/)
- Đăng ký mức 15% cho 1 triệu USD đầu: cần payments profile, tạo Account Group chứa tài khoản developer chính, khai Associated Developer Accounts, rồi bấm "Review and enroll" trên trang Associated developer accounts. Áp "as of the date you complete enrollment". Tính theo năm dương lịch; vượt ngưỡng thì 30% cho phần còn lại của năm — [Đã đọc][Có thể cũ: nội dung viết cho mốc 2021] [Service fee tier](https://support.google.com/googleplay/android-developer/answer/10632485?hl=en)

### Inferences
- Với một developer cá nhân ở Việt Nam mới bắt đầu: Apple thu 15% (khi đã vào SBP), Google thu 15% cho subscription. Như vậy file PAYMENT_PROVIDERS ghi "15%" là đúng; ô "mức chuẩn ?" của Apple nay đã rõ: 30% năm đầu, 15% sau năm đầu.
- Phải **chủ động** đăng ký SBP trước khi bán, nếu không năm đầu mất 30%. Google: trang service fees ghi subscription 15% như một dòng riêng, nên có lẽ áp bất kể có đăng ký mức 15% hay không. Dù vậy vẫn nên tạo Account Group và đăng ký (xem Gaps).
- Khi bảng mới của Google tới Việt Nam (muộn nhất 30/9/2027), subscription = 10% service fee + billing fee của Việt Nam (chưa công bố). Nếu billing fee giống mức 5% ở Mỹ thì tổng vẫn khoảng 15% — **[Suy luận]**, chưa có số chính thức cho Việt Nam.

### Gaps
- Google không có câu nào nói rõ mức 15% cho subscription có cần đăng ký 15% tier hay không.
- Trang SBP không nói phải nộp đơn trước bao lâu để kịp lần bán đầu tiên. Mốc "15 ngày sau khi hết tháng tài chính" có nghĩa là doanh thu trước ngày đó tính 30% hay sẽ được điều chỉnh lại thì chưa rõ.

## 3. Cấu hình sản phẩm subscription: group và level, introductory offer và free trial (khớp với trạng thái "Trial" của backend thế nào), promo/offer code, grace period, billing retry, account hold, giá VND, đổi giá và đồng ý của người dùng, refund

### Takeaway
Apple: một subscription group, xếp gói năm và gói tháng theo level; mỗi Apple Account được **một** introductory offer cho mỗi group, và **app không chặn được** Apple áp offer này. Google: subscription → base plan → offer; trial là offer gắn với base plan; **app tự chọn offer nào được trình bày**. Grace period: Apple 3/16/28 ngày; Google bật mặc định, account hold mặc định = 60 ngày trừ grace. Đổi giá: Apple cần người dùng đồng ý khi tăng mạnh; Google mặc định opt-in (37 ngày, không đồng ý thì tự hủy). Refund: Apple do Apple quyết, developer không tự hoàn được; Google cho developer hoàn qua Play Console hoặc API. Hai điểm vướng với thiết kế Bước 5: (1) **không store nào có API "kết thúc trial ngay"**, và Apple **không có API hủy subscription thay người dùng**; (2) luật D30 "store vẫn cho trial nhưng Wordmet không cho Pro" có thể đi ngược chính sách của Google và Apple.

### Cited Findings
**Apple — group, level, offer**
- "creating a single group is the best practice for most apps"; xếp level từ gói cho nhiều nhất (level 1) tới ít nhất. Upgrade: đổi ngay, "receive a refund of the prorated amount". Downgrade: đợi tới kỳ gia hạn sau. Crossgrade khác thời hạn: áp ở kỳ gia hạn sau — [Đã đọc] [Auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/)
- Introductory offer: "Customers can redeem one introductory offer per subscription group"; mỗi subscription có thể có một introductory offer cho mỗi vùng. Offer code: loại dùng một lần (18 ký tự) và loại custom (ví dụ "SPRINGPROMO"). Promotional offer: tối đa 10 cho mỗi subscription, "You decide the business logic for promotional offers". Có win-back offer. Các kiểu giảm giá: free trial, pay as you go, pay up front — [Đã đọc] [Auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/)
- (Từ file nghiên cứu trước, không đọc lại) độ dài free trial của Apple: 3 ngày; 1 hoặc 2 tuần; 1, 2, 3 hoặc 6 tháng; 1 năm — xem `TRIAL_MODELS_RESEARCH_2026-10-18.md` mục 4.1, nguồn [Set up introductory offers](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions)
- 3.1.2(a): kỳ subscription tối thiểu 7 ngày và "available across all of the user's devices"; "allow a user to get what they've paid for without performing additional tasks"; app lừa người dùng đăng ký hoặc "bait-and-switch" sẽ bị gỡ — [Đã đọc] [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

**Apple — grace period, billing retry**
- Grace period áp cho "all renewals (existing paid renewals and free offers transitioning to paid renewals) or only to existing paid renewals", dài "3, 16, or 28 days". Gia hạn lỗi thì "Apple attempts to recover it for 60 days". Từ iOS 16.4, app tự hiện sheet hệ thống để người dùng cập nhật phương thức thanh toán — [Đã đọc] [Auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/)

**Apple — giá và đổi giá**
- "You can choose from 800 price points in each currency"; App Store Connect tự đề xuất giá tương đương cho 175 quốc gia và vùng theo thuế và tỷ giá; Apple "will not make price adjustments on your auto-renewable subscription products" khi thuế hoặc tỷ giá thay đổi — [Đã đọc] [Manage pricing for auto-renewable subscriptions](https://developer.apple.com/help/app-store-connect/manage-subscriptions/manage-pricing-for-auto-renewable-subscriptions)
- Người dùng phải đồng ý trước khi gia hạn nếu: ở vùng yêu cầu đồng ý cho mọi lần tăng giá; hoặc tăng "more than 50% of the current price and the difference … exceeds approximately US$5 per period for non-annual subscriptions, or US$50 per year for annual"; hoặc đã bị tăng giá trong 12 tháng qua. Không đồng ý thì gói hết hạn cuối kỳ. Email báo đầu tiên: gói năm 60 ngày, gói tháng 27 ngày trước ngày gia hạn. Có thể giữ giá cũ cho người đang đăng ký. "Once a price increase goes into effect, it can't be reversed." — [Đã đọc] [Manage pricing for auto-renewable subscriptions](https://developer.apple.com/help/app-store-connect/manage-subscriptions/manage-pricing-for-auto-renewable-subscriptions)
- Giảm giá thì người đang đăng ký tự gia hạn ở giá thấp hơn, không giữ được giá cao — [Đã đọc] [Auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/)
- Vùng báo cáo "Vietnam", tiền tệ báo cáo VND — [Đã đọc] [Financial report regions and currencies](https://developer.apple.com/help/app-store-connect/reference/reporting/financial-report-regions-and-currencies)

**Apple — hủy, refund, API cho developer**
- App Store Server API có: Get Transaction Info, Get All Subscription Statuses, Get Transaction History, Set App Account Token, Look Up Order ID, Send Consumption Information, Get Refund History, Extend a Subscription Renewal Date (cả bản cho mọi subscriber), Get Notification History, Request a Test Notification. **Không có endpoint nào hủy subscription hay kết thúc free trial thay người dùng** — [Đã đọc] [App Store Server API (JSON)](https://developer.apple.com/tutorials/data/documentation/appstoreserverapi.json)
- Người dùng tự quản lý gói qua `showManageSubscriptions(in:)` hoặc link `https://apps.apple.com/account/subscriptions/`. Xin refund qua `beginRefundRequest` hoặc https://support.apple.com/118223 — [Đã đọc] [Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app/)

**Google — cấu trúc, trial, promo code**
- "Through base plans and offers, you can create multiple configurations for the same subscription product." Có base plan prepaid (không tự gia hạn) và installment (chỉ ở Brazil, Pháp, Ý, Tây Ban Nha) — [Đã đọc] [About subscriptions](https://developer.android.com/google/play/billing/subscriptions)
- Free trial: "Google Play verifies that the user has a valid payment method before starting the free trial"; hủy giữa trial thì "the subscription remains active until the end of the trial, and they aren't charged". Có tùy chọn "Allow one free trial per app". Promo code dùng để "give selected users an extended free trial to an existing subscription" — [Đã đọc] [About subscriptions](https://developer.android.com/google/play/billing/subscriptions)

**Google — grace period, account hold, trạng thái**
- "By default, all auto-renewing base plans have grace period enabled"; đặt 0 ngày thì Play vẫn đợi ít nhất 1 ngày. Account hold mặc định bật, dài "60 days minus any grace period duration". Trong grace thì vẫn cho dùng; khi on hold thì "block access"; khi canceled thì dùng tới hết kỳ — [Đã đọc] [Subscription lifecycle (cập nhật 15/10/2026)](https://developer.android.com/google/play/billing/lifecycle/subscriptions)
- Developer có thể `purchases.subscriptionsv2.cancel` (dừng gia hạn), `purchases.subscriptionsv2.revoke` (cắt quyền ngay), `purchases.subscriptionsv2.defer` (lùi ngày trừ tiền). Cảnh báo: "Don't remove access to a subscription from Google Play while the user is still entitled to the content." — [Đã đọc] [Subscription lifecycle](https://developer.android.com/google/play/billing/lifecycle/subscriptions)

**Google — đổi giá**
- Mặc định tăng giá là opt-in: người dùng phải chấp nhận, nếu không "Google Play automatically cancels their subscription"; giá mới áp sau "an advance notification period of 37 days"; Play báo qua email và push từ 30 ngày trước. Người đang đăng ký mặc định ở lại "legacy price cohort". Tăng giá opt-out (30 hoặc 60 ngày tùy nước) "only available in certain locations with limits on the increase amount and frequency" — [Đã đọc] [Subscription price changes](https://developer.android.com/google/play/billing/price-changes)

**Google — refund**
- Play Console → Order management: hoàn đơn gần nhất = "Refund and revoke" ("the user's subscription is removed immediately"); hoàn đơn cũ hơn = chỉ hoàn, gói vẫn còn. Hoàn một phần được (chỉ trên web Console). "Canceling a subscription doesn't issue a refund." — [Đã đọc] [Issue refunds](https://support.google.com/googleplay/android-developer/answer/2741495?hl=en)
- Chính sách subscription: với Play Billing, người dùng "will not receive a refund for the current billing period", một số nước có thể được hoàn theo tỷ lệ — [Đã đọc] [Subscriptions policy](https://support.google.com/googleplay/android-developer/answer/9900533?hl=en)

**Google — giá VND**
- Năm 2021 Google hạ giá tối thiểu ở 20 thị trường, có Việt Nam — [Snippet][Có thể cũ] [Android Developers Blog 3/2021](https://android-developers.googleblog.com/2021/03/sub-dollar-pricing-expansion-in-20.html). Một bài thứ cấp không ghi ngày nói mức tối thiểu ở Việt Nam là ₫6.000 — [Snippet][Thứ cấp][Có thể cũ] [electronic.partners](https://electronic.partners/news/google-lowers-the-minimum-purchase-price-for-play-store-apps-and-in-app-purchases-in-17-countries/)

### Inferences
- **Khớp trial của store với trạng thái "Trial" của Wordmet (mục 8 design Bước 5):**
  - Trial 7 ngày của Wordmet khớp với free trial "1 tuần" của Apple và trial 7 ngày của Google. Câu trong design "Apple chỉ cho trial 1 hoặc 2 tuần" thì **chưa đủ**: Apple còn có 3 ngày, 1/2/3/6 tháng, 1 năm (theo TRIAL_MODELS). Kết luận "7 ngày khớp" vẫn đúng.
  - D30 ("store vẫn cấp trial nhưng tài khoản đã có `trial_history` thì Wordmet ghi `trial_denied`, không cho Pro, rồi gọi `endTrialNow`") **vướng ở cả hai store**:
    - `endTrialNow`: Apple không có endpoint. Google chỉ có cancel, revoke, defer; không thấy API kết thúc trial và trừ tiền ngay. Nên bộ nối Apple và Google phải báo `endTrialNow` = không hỗ trợ.
    - Không cho Pro trong lúc store đang báo trial hợp lệ thì đi ngược câu "Don't remove access … while the user is still entitled" của Google, và có thể bị Apple coi là "bait-and-switch" (3.1.2(a)). Đây là rủi ro bị review, **chưa có nguồn nào nói thẳng về trường hợp này**.
    - Cách giảm rủi ro: trên Android, app chỉ trình bày offer trial khi API báo `trial_eligible` (vì app chọn offer nào được mua). Trên iOS, app không chặn được introductory offer theo Apple Account. Hướng khả dĩ: không đặt introductory offer, dùng promotional offer (do developer tự xét điều kiện) làm trial cho tài khoản đủ điều kiện — **cần kiểm** promotional offer có dùng được cho người **chưa từng** đăng ký không.
  - `cancelAtPeriodEnd` (D32, staff cấp Pro khi người dùng đang trả tiền): Google hỗ trợ (`subscriptionsv2.cancel`); Apple **không** hỗ trợ. Điều này xác nhận `ASSUMPTION` trong D32: Apple chỉ cho người dùng tự hủy.
- **Nâng gói tháng → năm:** Apple tự hoàn phần dư khi upgrade, đúng với B5E87 / D34 đã thiết kế. Google: upgrade tạo **purchase token mới** kèm `linkedPurchaseToken`, nên `external_subscription_id` của gói Google đổi sau mỗi lần nâng hoặc hạ gói. Bộ nối phải nối chuỗi token.
- **Grace period:** design ghi Apple không có 7 ngày (chỉ 3, 16, 28) là đúng. Google cho đặt độ dài và mặc định đã bật; account hold mặc định 60 ngày trừ grace.
- **Giá VND:** Apple có 800 mức giá cho mỗi loại tiền và tự quy đổi; Google cho đặt giá theo từng nước. Giá cụ thể (ví dụ 99.000 ₫/tháng có đúng một mức giá không) thì chỉ thấy được trong console.

### Gaps
- Danh sách mức giá VND của Apple và giá tối thiểu, tối đa VND của Google: không đọc được nguồn chính thức (chỉ thấy trong console).
- Promotional offer của Apple có dùng làm trial cho người mới được không: chưa kiểm.
- Google "developer determined" offer: file TRIAL_MODELS có nhắc, phiên này không đọc lại.
- Google: người dùng tự xin refund qua Google trong bao lâu (hay nói "48 giờ"): trang Issue refunds không có con số này.
- Việt Nam có thuộc nhóm "region that requires consent for any price changes" của Apple không: trang không liệt kê.

## 4. Màn hình và metadata bắt buộc cho subscription (paywall, Terms/Privacy, restore, quản lý gói); lý do bị từ chối thường gặp

### Takeaway
Apple bắt buộc trên màn hình đăng ký: tên và thời hạn gói, nội dung được dùng, giá gia hạn đầy đủ (là con số nổi bật nhất), cách đăng nhập hoặc restore purchases, với free trial thì ghi rõ trial bao lâu và giá sau trial; link Terms of Use (EULA) và Privacy Policy trong app **và** trong metadata trên App Store. Google bắt buộc ghi rõ giá, chu kỳ trừ tiền, tự gia hạn, trial chuyển sang trả phí khi nào và cách hủy; trong app phải có link quản lý và hủy gói. Lý do bị từ chối hay gặp nhất với Apple là thiếu link Terms of Use (EULA) ở đúng chỗ.

### Cited Findings
**Apple**
- Màn hình đăng ký phải có: "Subscription name and duration, and the content or services provided during the subscription period"; "Full renewal price, shown clearly and prominently, and localized in available currencies"; "A way for current subscribers to sign in or restore purchases". "your app and App Store metadata must include links to your Terms of Use and Privacy Policy." "the amount that will be billed must be the most prominent pricing element in the layout." Free trial: "clearly indicate how long the free trial lasts and the price billed once the free trial is over." — [Đã đọc] [Auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/)
- 3.1.2(c): "Before asking a customer to subscribe, you should clearly describe what the user will get for the price … Ensure you clearly communicate the requirements described in Schedule 2" — [Đã đọc] [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- 3.1.2(b): người dùng "should not be able to inadvertently subscribe to multiple variations of the same thing" — [Đã đọc] [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Nên dễ vào màn hình quản lý gói của hệ thống, dùng `showManageSubscriptions(in:)` — [Đã đọc] [Auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/)
- Xóa tài khoản (5.1.1(v)): nếu người dùng có auto-renewable subscription, "notify them that billing will continue through Apple and ask them to cancel their subscription before continuing"; được hẹn xóa tài khoản trùng ngày gói hết hạn, nếu vẫn có lựa chọn xóa ngay — [Đã đọc] [Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- Bị từ chối theo 3.1.2 vì thiếu link Terms of Use hoạt động được. Người duyệt hướng dẫn: dùng EULA chuẩn của Apple thì đặt link vào App Description; dùng EULA riêng thì thêm trong App Store Connect. Có developer đã có link trong app, trên paywall, trong mô tả mà vẫn bị từ chối — [Snippet][Thứ cấp: diễn đàn] [forum 809635](https://developer.apple.com/forums/thread/809635), [forum 813493](https://developer.apple.com/forums/thread/813493), [forum 768364](https://developer.apple.com/forums/thread/768364)
- Có trường hợp bị từ chối 3.1.2(c) cùng 2.1(b) vì lỗi IAP trong sandbox khi review (subscription ở trạng thái "Developer Action Needed"; nghi do agreement hoặc banking chưa xong) — [Snippet][Thứ cấp: diễn đàn] (cùng các thread trên)

**Google**
- Phải công bố "offer terms, the cost of your subscription, the frequency of your billing cycle", "the automatic renewal terms, whether a subscription is required to use the app"; "Users should not have to perform any additional action to review the information." Trial: "how and when a free trial will convert to a paid subscription" và "how a user can cancel" — [Đã đọc] [Subscriptions policy](https://support.google.com/googleplay/android-developer/answer/9900533?hl=en)
- Bắt buộc: "clearly disclose how a user can manage or cancel their subscription" và "include in your app access to an easy-to-use, online method to cancel", ví dụ "A link to Google Play's Subscription Center" — [Đã đọc] [Subscriptions policy](https://support.google.com/googleplay/android-developer/answer/9900533?hl=en)
- Ví dụ vi phạm: gói tháng không báo tự gia hạn; "Annual subscriptions that most prominently display their pricing in terms of monthly cost"; không cho thấy dùng được nội dung mà không cần subscription (khi có bản miễn phí); không ghi rõ trial dài bao lâu; nhiều màn hình dẫn tới bấm nhầm; "missing a link to manage and cancel subscriptions in the account setting or equivalent page" — [Đã đọc] [Subscriptions policy](https://support.google.com/googleplay/android-developer/answer/9900533?hl=en)
- Tăng giá opt-out thì "you must show users an in-app notice" — [Đã đọc] [Subscription price changes](https://developer.android.com/google/play/billing/price-changes)

### Inferences
- Paywall Flutter dùng chung cho hai nền tảng cần: giá gia hạn đầy đủ bằng VND là con số to nhất; gói năm **không** được lấy "x ₫/tháng" làm số nổi bật nhất (Google cấm); dòng trial "7 ngày miễn phí, sau đó Y ₫/năm, tự gia hạn, hủy bất cứ lúc nào trong cài đặt"; nút Restore (iOS); link Terms và Privacy; trong trang tài khoản có link quản lý gói (iOS `showManageSubscriptions`, Android Play Subscription Center).
- Vì có bản Free (3 phiên mỗi ngày), paywall phải cho thấy người dùng vẫn dùng được app mà không trả tiền (ví dụ vi phạm thứ ba của Google).
- Luồng xóa tài khoản (Bước 8) phải nhắc người dùng hủy subscription Apple trước, hoặc hẹn ngày xóa trùng ngày gói hết hạn.
- Trước khi gửi review: Paid Apps agreement, thông tin ngân hàng và thuế trong App Store Connect phải xong, nếu không IAP lỗi trong sandbox và bị từ chối 2.1(b) (dựa trên thread diễn đàn, chưa chắc chắn).

### Gaps
- Apple không có trang chính thức liệt kê "lý do từ chối hay gặp" cho subscription; phần trên lấy từ diễn đàn.
- Câu chữ chính xác về "restore" trong 3.1.1 nằm ở phần guidelines chưa trích được; trang subscriptions đã đủ để làm căn cứ.

## 5. Nối với backend: App Store Server API, Server Notifications V2, StoreKit 2/JWS, appAccountToken; Google Play Developer API, RTDN qua Pub/Sub, acknowledge trong 3 ngày, obfuscatedAccountId; một người mua cả web lẫn store; tự làm với Flutter `in_app_purchase` hay dùng RevenueCat, Adapty, Qonversion

### Takeaway
Cả hai store khớp khá sát với bộ nối của Bước 5 (`verify` / `ack` / `fetchState`). Apple có `appAccountToken` là **UUID**, khớp thẳng với `app_user_id` (UUID của Wordmet), và có thư viện Node chính thức để kiểm JWS. Google gửi tin qua Pub/Sub push; tin đó **không có chữ ký trên body**: `verify` phải kiểm JWT OIDC trong header `Authorization`, rồi gọi `purchases.subscriptionsv2.get` để lấy trạng thái thật, và phải acknowledge trong 3 ngày. Tự làm (Flutter `in_app_purchase` 3.3.1 + hai bộ nối trong NestJS) hợp với cổng đã có và không tốn phí nền tảng. RevenueCat (miễn phí tới 2.500 USD MTR, sau đó 1%) gộp hai store nhưng lặp lại phần chuẩn hóa sự kiện mà cổng đã làm, và không cắm được cổng thanh toán Việt Nam.

### Cited Findings
**Apple**
- App Store Server API: mỗi request dùng JWT ký bằng key lấy từ App Store Connect, gửi dạng bearer token; TLS 1.2+; sandbox base URL `https://api.storekit-sandbox.apple.com/`; transaction có trường `environment`; nếu không biết môi trường thì gọi production trước, gặp lỗi `4040010` thì gọi sandbox — [Đã đọc] [App Store Server API (JSON)](https://developer.apple.com/tutorials/data/documentation/appstoreserverapi.json)
- `appAccountToken`: "The UUID that you generate to associate a customer's In-App Purchase with its resulting App Store transaction"; gắn lúc mua bằng `appAccountToken(_:)` trong StoreKit; endpoint **Set App Account Token** dùng để gắn hoặc sửa token cho giao dịch làm ngoài app hoặc giao dịch đã có; "The App Store returns the same UUID in `Transaction.appAccountToken` in the transaction information and subscription renewal information" — [Đã đọc] [appAccountToken (JSON)](https://developer.apple.com/tutorials/data/documentation/appstoreserverapi/appaccounttoken.json)
- Thư viện chính thức `@apple/app-store-server-library` (Node 22+): `SignedDataVerifier` kiểm và giải mã notification bằng chứng chỉ gốc của Apple (tải từ Apple PKI); "appAppleId is required when the environment is Production"; `AppStoreServerAPIClient` gọi API; cần key App Store Connect với vai trò Admin; "Only the latest major version of the library will receive updates" — [Đã đọc] [app-store-server-library-node](https://github.com/apple/app-store-server-library-node)
- Get All Subscription Statuses cho biết "in one simple check whether a subscription is active, expired, in billing retry, or in grace period" — [Đã đọc] [Auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/)
- (Từ các file trước, không đọc lại) Server Notifications V2: trả 200–206; retry 5 lần sau 1/12/24/48/72 giờ; sandbox chỉ gửi 1 lần; `notificationUUID` để lọc trùng — xem `PAYMENT_PROVIDERS_RESEARCH_2026-10-18.md` mục 3.10.

**Google**
- Acknowledge: "must be done within three days so that the purchase isn't automatically refunded and entitlement revoked"; 3 ngày tính từ lúc chuyển từ PENDING sang PURCHASED; chỉ cấp quyền khi `PURCHASED`; mua bị từ chối thì "immediately revoke and refund … using the Google Play Developer API" — [Đã đọc] [Integrate the Google Play Billing Library (cập nhật 15/10/2026)](https://developer.android.com/google/play/billing/integrate)
- `obfuscatedAccountId` / `obfuscatedProfileId`: gắn lúc mở luồng mua, ví dụ "an obfuscated version of the user's login in your system"; giúp chống gian lận và gán đúng người; "verify these identifiers on your secure backend before granting entitlements" — [Đã đọc] [Integrate](https://developer.android.com/google/play/billing/integrate)
- Thư viện: "By Aug 31, 2026, all new apps and updates to existing apps must use Billing Library version 8 or later … extension until Nov 1, 2026"; code mẫu dùng 9.1.0 — [Đã đọc] [Integrate](https://developer.android.com/google/play/billing/integrate)
- Sau mỗi `SubscriptionNotification` phải gọi `purchases.subscriptionsv2.get` với purchase token; endpoint này "is considered the source of truth"; nên gọi lúc nhận RTDN chứ không đợi tới ngày hết hạn; purchase token dùng được "until 60 days after expiration"; tài nguyên subscription có `ExternalAccountIdentifiers` (`obfuscatedAccountId`, `obfuscatedProfileId`); upgrade/downgrade tạo token mới có `linkedPurchaseToken`; "Before offering upgrade, downgrade, or resubscribe options … you must acknowledge the existing subscription" — [Đã đọc] [Subscription lifecycle](https://developer.android.com/google/play/billing/lifecycle/subscriptions)
- Thiết lập RTDN: tạo topic Pub/Sub; tạo subscription push ("generally easier to implement") hoặc pull; cấp quyền Pub/Sub Publisher cho `google-play-developer-notifications@system.gserviceaccount.com`; Play Console → Monetize → Monetization setup → nhập `projects/{project_id}/topics/{topic_name}` → "Send Test Message"; mỗi app cấu hình riêng; Play Developer API cần quyền "View financial data" — [Đã đọc] [Getting ready (cập nhật 9/9/2026)](https://developer.android.com/google/play/billing/getting-ready)
- Push có xác thực: Pub/Sub "signs a JSON Web Token (JWT) and sends the JWT in the authorization header of the push request" bằng service account do mình chọn; endpoint kiểm chữ ký, `aud`, `exp`, `iss` (`accounts.google.com`), `email`, `email_verified` — [Đã đọc] [Authenticate push subscriptions](https://docs.cloud.google.com/pubsub/docs/authenticate-push-subscriptions)

**Flutter `in_app_purchase`**
- Bản 3.3.1, publisher flutter.dev (đã xác minh), Android SDK 24+, iOS 13+; "On iOS and macOS, the generic API uses StoreKit 2 by default"; không có xác minh phía server (hàm `_verifyPurchase` trong ví dụ để trống); không gọi `completePurchase` trong 3 ngày thì Android tự hoàn tiền; iOS không finish giao dịch thì giao dịch bị gửi lại mỗi lần mở app và chặn mua lại cùng sản phẩm — [Đã đọc] [pub.dev in_app_purchase](https://pub.dev/packages/in_app_purchase)
- `PurchaseParam.applicationUserName`: "An opaque id for the user's account that's unique to your app. (Optional)". Tài liệu không nói nó map sang `obfuscatedAccountId` hay `appAccountToken` — [Đã đọc] [PurchaseParam](https://pub.dev/documentation/in_app_purchase_platform_interface/latest/in_app_purchase_platform_interface/PurchaseParam-class.html)

**Lớp trung gian (giá 2026)**
- RevenueCat: "Pay nothing for up to $2,500 in monthly tracked revenue", sau đó "1% of what you track"; gói miễn phí có đủ tính năng, kể cả webhooks. Trang không định nghĩa MTR — [Đã đọc] [RevenueCat pricing](https://www.revenuecat.com/pricing/)
- Adapty: $0 tới $5K mỗi tháng, trên đó 1% doanh thu theo dõi; có webhooks, server-side API; có SDK Flutter — [Đã đọc] [Adapty pricing](https://adapty.io/pricing/)
- Qonversion: miễn phí khi MTR ≤ $7.000 mỗi tháng, vượt thì 0,8% trên **toàn bộ** doanh thu theo dõi; có webhooks; trang giá không nhắc Flutter — [Đã đọc] [Qonversion pricing](https://qonversion.io/pricing)
- (Từ file trước) Web Billing của RevenueCat cần Stripe hoặc Paddle; không cắm cổng Việt Nam vào được — xem `PAYMENT_PROVIDERS_RESEARCH_2026-10-18.md` mục 3.12.

### Inferences
**Ráp vào cổng thanh toán Bước 5 (mục 9 design):**
```
Apple  ── ASSN V2 (POST, body = signedPayload JWS) ──► /v1/billing/webhooks/apple
          verify(): SignedDataVerifier (chuỗi chứng chỉ Apple) → notificationUUID làm dedupe
          app_user_id = appAccountToken (UUID Wordmet, gắn lúc mua; sửa được bằng Set App Account Token)
          fetchState(): Get All Subscription Statuses / Get Transaction Info
          cancelAtPeriodEnd: không có API    endTrialNow: không có API

Google ── Pub/Sub push (POST, header Authorization: Bearer <OIDC JWT>) ──► /v1/billing/webhooks/google
          verify(): kiểm JWT (aud/iss/email/email_verified), không phải HMAC trên raw body
          tin RTDN chỉ có purchaseToken → bộ nối PHẢI gọi subscriptionsv2.get (đúng D37: "Google luôn phải gọi lại API")
          app_user_id = obfuscatedAccountId (đặt UUID Wordmet; không phải email)
          ack(): HTTP 2xx cho Pub/Sub  +  acknowledge purchase trong 3 ngày (việc riêng, qua API hoặc client)
          cancelAtPeriodEnd: subscriptionsv2.cancel    revoke: subscriptionsv2.revoke    endTrialNow: không thấy
```
- Bảng hàm của bộ nối (mục 9.1) ghi `verify` = "kiểm chữ ký … trên raw body". Với Google, `verify` phải kiểm **header**, nên mô tả hàm cần nới thành "kiểm chữ ký **hoặc token** theo cách của nhà cung cấp".
- Acknowledge của Google là một bước **mới** chưa có trong cổng: nếu client chết trước khi gọi `completePurchase`, server phải tự acknowledge qua API, nếu không 3 ngày sau Google tự hoàn tiền. Nên để bộ nối Google acknowledge khi xử lý `SUBSCRIPTION_PURCHASED`.
- Gắn người dùng: Apple `appAccountToken` bắt buộc là UUID, khớp `app_user_id`. Google cho chuỗi tùy ý, nên dùng cùng UUID. Cần kiểm plugin Flutter có truyền `applicationUserName` sang hai trường này không; nếu không thì phải dùng API riêng của từng nền tảng (xem Gaps).
- Môi trường (R17): Apple có `environment` trong transaction. Google không có cờ sandbox kiểu đó (tester dùng license testing); cách phân biệt sandbox và production cho Google **chưa đọc**.
- **Một người mua cả web lẫn store (B5E58):** store không báo cho mình biết người đó đã có Pro từ nguồn khác; Apple 3.1.2(b) chỉ chặn mua trùng **trong cùng group**. Cách phòng là app hỏi API Entitlements trước khi hiện paywall: đã Pro (web, staff, store khác) thì ẩn nút mua và hiện "Bạn đang dùng Pro qua <nguồn>". Lõi Bước 5 đã chịu được hai nguồn Pro cùng lúc. Hoàn tiền khi đã lỡ trùng: Google hoàn được qua API, Apple thì không (người dùng phải tự xin Apple).

**Tự làm hay dùng lớp trung gian:**

| | Tự làm (`in_app_purchase` + bộ nối `apple`, `google`) | RevenueCat | Adapty / Qonversion |
|---|---|---|---|
| Phí | 0 | 0 tới 2.500 USD MTR, sau đó 1% | 0 tới 5K USD (1%) / 7K USD (0,8% trên toàn bộ) |
| Khớp cổng Bước 5 | Hai bộ nối mới, đúng khuôn `verify/ack/fetchState` | Một bộ nối `revenuecat`, nhưng RevenueCat có trạng thái riêng chồng lên lõi | Tương tự RevenueCat |
| Việc phải tự viết | Kiểm JWS, kiểm JWT Pub/Sub, acknowledge, nối chuỗi token, test sandbox | Ít hơn ở mobile; web vẫn qua cổng VN riêng | Như RevenueCat |
| Rủi ro | Nhiều code hơn, phải tự theo kịp thay đổi của store (PBL 8+, StoreKit) | Thêm một phụ thuộc và một nơi giữ dữ liệu người dùng; MTR có thể tính trước khi store cắt phí (FAQ có tiêu đề nhưng chưa có câu trả lời) | Ít phổ biến hơn với Flutter (Qonversion: trang giá không nhắc Flutter) |

- Với người làm một mình, đã có lõi chuẩn hóa sự kiện, Node 24 (đủ yêu cầu Node 22+ của thư viện Apple) và chưa có doanh thu: tự làm đỡ phụ thuộc và khớp kiến trúc hơn. RevenueCat đáng cân nhắc nếu muốn đẩy nhanh lần ra mắt mobile đầu tiên: miễn phí ở mức doanh thu nhỏ, đổi lại phải chấp nhận hai nơi giữ trạng thái.

**Mâu thuẫn, bổ sung so với các file nền (không nghiên cứu lại, chỉ ghi chú):**
- PAYMENT_PROVIDERS mục 3.10 ghi "mức chuẩn ?" cho Apple → nay rõ: 70% / 85% (30% năm đầu, 15% sau năm đầu); SBP 15% từ đầu (mục 2).
- PAYMENT_PROVIDERS dòng 54 và mục 3.11 ghi Google "thu VAT hộ + khấu trừ 5% WHT" cho cá nhân, hộ kinh doanh ở Việt Nam → trang thuế của Google (đọc 20/10/2026) chỉ nói Google thu và nộp **5% VAT** trên giao dịch (và 5% VAT trên hóa đơn phí dịch vụ); **không nhắc WHT hay PIT** (mục 6). Có thể "5%" bị nhầm giữa VAT và WHT.
- PAYMENT_PROVIDERS dòng 25 ("Google không có user choice billing ở Việt Nam") → vẫn đúng; bổ sung: chương trình billing choice mới cũng chưa có Việt Nam, "rest of the world" muộn nhất 30/9/2027.
- PAYMENT_PROVIDERS mục 3.10 nói chưa đọc cách gắn user cho Apple, Google → nay đã đọc: `appAccountToken` (UUID; có endpoint Set App Account Token) và `obfuscatedAccountId`.
- Design Bước 5 mục 8 ("Apple chỉ cho trial 1 hoặc 2 tuần") → chưa đủ (xem mục 3); kết luận 7 ngày vẫn đúng.
- Design Bước 5 D32 `ASSUMPTION` "Apple chỉ cho người dùng tự hủy" → khớp: App Store Server API không có endpoint hủy. Google **có** `subscriptionsv2.cancel`.
- Design Bước 5 mục 8 / D30 `endTrialNow` → cả hai store đều không có (mục 3). D30 ("không cho Pro trong trial do store cấp") có rủi ro chính sách ở cả hai store.
- Design Bước 5 mục 9.1 `verify` "trên raw body" → Google dùng JWT ở header (xem trên).

### Gaps
- `in_app_purchase_android` dùng Play Billing Library bản nào (phải ≥ 8, hạn 31/8/2026, gia hạn được tới 1/11/2026): pub.dev không ghi. Cần kiểm trước khi phát hành Android.
- `applicationUserName` của plugin có đặt `appAccountToken` (iOS, StoreKit 2, cần UUID) và `obfuscatedAccountId` (Android) không: tài liệu không nói.
- Base URL production của App Store Server API, chi tiết retry của ASSN V2, `appAccountToken` có nằm trong `signedTransactionInfo` của notification không (gần như chắc chắn vì notification chứa transaction info, nhưng trang không nói thẳng): không đọc lại trong phiên này.
- Gói `googleapis` / `androidpublisher` cho Node (thư viện gọi `subscriptionsv2`): chưa kiểm phiên bản.
- Cách phân biệt test và production cho giao dịch Google (license tester): chưa đọc.
- Định nghĩa MTR của RevenueCat (trước hay sau khi store cắt phí, có tính doanh thu web không): trang giá có tiêu đề FAQ nhưng không có câu trả lời.

## 6. Tiền và thuế cho developer ở Việt Nam: nhận tiền (tiền tệ, ngân hàng, lịch), Apple/Google có thu hộ VAT không, nghĩa vụ thuế còn lại của cá nhân hoặc công ty ở Việt Nam (không phải tư vấn pháp lý)

### Takeaway
Apple trả vào **một** tài khoản ngân hàng, trong vòng 45 ngày sau khi hết tháng tài chính, ngân hàng của Apple quy đổi sang tiền của tài khoản, ngưỡng mặc định 40 USD. Google chuyển khoản quốc tế bằng **USD**, ngưỡng 100 USD, Việt Nam có trong danh sách. Thuế (thông báo Apple 21/8/2025, trang thuế của Google, Nghị định 117/2025): với **cá nhân hoặc hộ kinh doanh ở Việt Nam**, store đóng vai nền tảng nước ngoài khấu trừ thay. Apple khấu trừ PIT 2% (và FCT 5% trên phần hoa hồng của Apple); Google thu và nộp VAT 5% (trang của Google không nhắc PIT). Mức 5% VAT và 2% PIT khớp với tỷ lệ cho "dịch vụ" trong Nghị định 117. Với **công ty ở Việt Nam**, store **không** nộp thuế thay trên doanh thu bán cho khách nữa; công ty tự kê khai. Từ kỳ tính thuế 2026, Luật Thuế TNCN 109/2025/QH15 cho cá nhân kinh doanh có doanh thu năm ≤ 500 triệu đồng không phải nộp PIT. Mức này **chưa rõ ăn khớp thế nào** với việc store khấu trừ 2% trên từng giao dịch.

### Cited Findings
**Nhận tiền — Apple**
- "payments are made to the bank account and the currency you provided within 45 days of the last day of the fiscal month in which the transaction was completed"; gộp mỗi loại tiền thành "a single payment to your bank per fiscal month"; "Payments to multiple or split bank accounts aren't supported"; trả qua EFT, ưu tiên chuyển khoản giá trị thấp; có thể mất phí ngân hàng trung gian; "Our bank converts payment amounts into the currency of your bank account" theo tỷ giá spot — [Đã đọc] [Overview of receiving payments](https://developer.apple.com/help/app-store-connect/getting-paid/overview-of-receiving-payments)
- Ngưỡng: ngân hàng hoặc loại tiền không có trong bảng thì "must exceed a minimum payment threshold of 40 USD"; bảng không có dòng Việt Nam — [Đã đọc] [Minimum payment threshold](https://developer.apple.com/help/app-store-connect/reference/reporting/minimum-payment-threshold)
- Vùng báo cáo Vietnam, tiền tệ báo cáo VND — [Đã đọc] [Financial report regions and currencies](https://developer.apple.com/help/app-store-connect/reference/reporting/financial-report-regions-and-currencies)

**Nhận tiền — Google**
- "Google issues wire transfer payouts in USD"; nếu ngân hàng cho mở tài khoản USD thì "this option is preferred"; ngưỡng "minimum payout amount of US$100"; phí do ngân hàng đặt, "US$0 to US$50 or more"; **Việt Nam có trong danh sách nước nhận wire transfer**; lịch trả "follow the same payment schedule as other merchant payouts" (ngày cụ thể ở trang khác) — [Đã đọc] [Wire transfer payouts](https://support.google.com/googleplay/android-developer/answer/2700656?hl=en)
- Nguồn thứ cấp ghi ngày 15 hằng tháng — [Snippet][Thứ cấp] [namiml](https://amp.namiml.com/en/amp/play-store-developer-payout-schedule)

**Thuế — Apple (thông báo 21/8/2025, "Tax and Price Updates…")**
- Cá nhân developer ở Việt Nam: "Personal income tax (PIT) introduction of 2%, replacing the corporate income tax (CIT). FCT of 5% introduced on Apple's commission. Reduced VAT rate of 0% for news, magazines, and books no longer applies and all content will be taxed at the standard rate." — [Đã đọc] [Apple Developer News, 21/8/2025](https://developer.apple.com/news/?id=yo2104n5)
- Tổ chức ở Việt Nam: "Apple will no longer remit foreign contractor tax (FCT) on sales to end customers. FCT of 5% introduced on Apple's commission." — [Đã đọc] (cùng nguồn)
- Tổ chức ngoài Việt Nam: "VAT rate increase from 5% to 10%"; cá nhân ngoài Việt Nam: PIT 5%. Áp "As of August 21"; Exhibit B và C của Paid Applications Agreement được cập nhật. Thông báo không dẫn văn bản luật nào — [Đã đọc] (cùng nguồn)

**Thuế — Google**
- Hộ kinh doanh, cá nhân ở Việt Nam: "Google is responsible for determining, charging, and remitting VAT"; "Google or its payment processor partners will charge and remit a 5% VAT on these purchases". Developer khác ở Việt Nam (ví dụ công ty): tự xác định, thu và nộp VAT. Developer ngoài Việt Nam: Google thu "a 10% VAT". Developer ở Việt Nam bị tính 5% VAT trên hóa đơn phí dịch vụ. Phải nộp mã số thuế (mã định danh cá nhân 12 số) trong Payments profile → "Vietnam tax info" để Google báo cáo cơ quan thuế. Trang **không** nhắc khấu trừ PIT hay WHT, không ghi ngày hiệu lực — [Đã đọc] [Tax rates and VAT (Google Play)](https://support.google.com/googleplay/android-developer/answer/138000?hl=en)

**Luật Việt Nam — khấu trừ trên nền tảng (Nghị định 117/2025/NĐ-CP)**
- Ban hành 09/6/2025, hiệu lực 01/7/2025; tổ chức quản lý nền tảng thương mại điện tử và nền tảng số, **trong và ngoài nước**, khấu trừ và nộp thay VAT, PIT cho hộ và cá nhân kinh doanh; tỷ lệ cho **dịch vụ**: VAT 5%, PIT 2% (cá nhân cư trú), 5% (không cư trú); không xác định được loại thì áp mức cao nhất; khấu trừ khi giao dịch thành công và đã nhận tiền; nền tảng kê khai theo tháng; hộ, cá nhân đã bị khấu trừ thì "không phải khai, nộp thuế giá trị gia tăng, thuế thu nhập cá nhân" cho các giao dịch đó — [Đã đọc] [Cổng Chính phủ — Xây dựng chính sách](https://xaydungchinhsach.chinhphu.vn/quy-dinh-moi-quan-ly-thue-doi-voi-ho-ca-nhan-kinh-doanh-tren-nen-tang-thuong-mai-dien-tu-119250612171755463.htm); cùng tỷ lệ — [Đã đọc][Thứ cấp, 13/6/2025] [Thị trường Tài chính Tiền tệ](https://thitruongtaichinhtiente.vn/tu-1-7-ban-hang-online-bi-khau-tru-thue-tu-dong-ai-phai-nop-ai-duoc-mien-68263.html)
- Văn bản gốc: [Snippet] [thuvienphapluat — Nghị định 117/2025/NĐ-CP](https://thuvienphapluat.vn/van-ban/Thuong-mai/Nghi-dinh-117-2025-ND-CP-quan-ly-thue-hoat-dong-kinh-doanh-tren-nen-tang-thuong-mai-dien-tu-641913.aspx), [vanban.chinhphu.vn](https://vanban.chinhphu.vn/?pageid=27160&docid=213883). Nền tảng nước ngoài được cấp mã số thuế 10 số để kê khai số đã khấu trừ — [Snippet] (tóm tắt từ các nguồn thuvienphapluat ở trên)
- Người bị khấu trừ thừa có thể làm thủ tục hoàn thuế tại cơ quan thuế nơi cư trú — [Snippet][Thứ cấp] [EY Tax News 24/6/2025](https://taxnews.ey.com/news/2025-1337-vietnam-promulgates-decree-on-tax-administration-for-business-activities-on-e-commerce-and-digital-platforms-of-households-and-individuals) (trang không mở được: ECONNREFUSED)

**Luật Việt Nam — VAT với nhà cung cấp nước ngoài (nghĩa vụ của Apple, Google)**
- Luật Thuế GTGT 48/2024/QH15 thông qua 26/11/2024, hiệu lực 01/7/2025; nhà cung cấp nước ngoài không có cơ sở thường trú, kinh doanh qua thương mại điện tử hoặc nền tảng số, là người nộp VAT; dịch vụ số do họ cung cấp chịu mức chuẩn 10% — [Snippet][Thứ cấp] [EY](https://www.ey.com/en_gl/technical/tax-alerts/vietnam-introduces-new-and-amended-tax-laws-on-foreign-suppliers-conducting-business-through-e-commerce-and-digital-platforms), [Baker McKenzie](https://insightplus.bakermckenzie.com/bm/tax/vietnam-key-updates-on-new-vat-law-and-amended-law-on-tax-administration). Khớp với việc Apple tăng VAT 5% → 10% cho tổ chức ngoài Việt Nam (thông báo Apple ở trên).
- Nghị quyết 204/2025/QH15 giảm 2 điểm % VAT từ 01/7/2025 tới 31/12/2026 cho một số hàng hóa, dịch vụ — [Snippet][Thứ cấp] (cùng kết quả tìm kiếm; PwC). **Chưa rõ có áp cho dịch vụ số không.**
- Thông tư 80/2021/TT-BTC và cổng đăng ký cho nhà cung cấp nước ngoài, mở 21/3/2022 — [Snippet][Thứ cấp][Có thể cũ] (cùng kết quả tìm kiếm)

**Luật Việt Nam — PIT của cá nhân kinh doanh từ 2026 (Luật 109/2025/QH15)**
- Luật Thuế TNCN 109/2025/QH15: hiệu lực 01/7/2026; quy định về thu nhập từ kinh doanh của cá nhân cư trú áp dụng từ **kỳ tính thuế 2026**; "điều chỉnh mức doanh thu không phải nộp thuế của hộ, cá nhân kinh doanh từ 200 triệu đồng/năm lên 500 triệu đồng/năm", và mức này được trừ trước khi tính thuế theo tỷ lệ trên doanh thu; doanh thu 500 triệu – 3 tỷ: được chọn tính theo tỷ lệ trên doanh thu hoặc 15% trên thu nhập; 3–50 tỷ: 17%; trên 50 tỷ: 20%; "điều chỉnh mức thuế suất từ 2% lên 5% đối với một số khoản thu nhập từ hoạt động cung cấp sản phẩm và dịch vụ nội dung thông tin số về giải trí, trò chơi điện tử…" — [Đã đọc] [Cổng Chính phủ — Giới thiệu Luật 109/2025/QH15](https://xaydungchinhsach.chinhphu.vn/gioi-thieu-luat-thue-thu-nhap-ca-nhan-so-109-2025-qh15-119260123145437408.htm); văn bản gốc [Snippet] [thuvienphapluat — Luật 109/2025/QH15](https://thuvienphapluat.vn/van-ban/Thue-Phi-Le-Phi/Luat-Thue-thu-nhap-ca-nhan-2025-so-109-2025-QH15-665870.aspx)
- Nguồn thứ cấp mâu thuẫn về năm 2026: một số bài nói thuế khoán bị bỏ từ 01/01/2026 (Nghị quyết 198/2025/QH15), và dẫn Nghị định 68/2026/NĐ-CP (hiệu lực 05/3/2026) cho ngưỡng 500 triệu; một bài khác nói luật sửa đổi các luật thuế thông qua 24/4/2026 đã bỏ con số 500 triệu cố định trong luật — [Snippet][Thứ cấp] [einvoice.vn](https://einvoice.vn/tin-tuc/thue-ho-kinh-doanh-2026), [thuvienphapluat bài viết](https://thuvienphapluat.vn/phap-luat-doanh-nghiep/bai-viet/de-xuat-moi-ve-cach-tinh-thue-ho-kinh-doanh-2026-16464.html). **Chưa kiểm với văn bản gốc.**

### Inferences
(Không phải tư vấn pháp lý hay tư vấn thuế.)
- **Luồng tiền với cá nhân hoặc hộ kinh doanh ở Việt Nam:**
  ```
  Khách VN trả giá trên store (VND)
     ├─ Apple: −VAT (mức "standard") −15% hoa hồng (SBP) −FCT 5% trên phần hoa hồng −PIT 2% → payout (≤45 ngày sau tháng tài chính, ≥40 USD, 1 tài khoản)
     └─ Google: −VAT 5% −15% phí dịch vụ (−5% VAT trên phí) → payout USD qua wire (≥100 USD); PIT: trang Google không nói
  ```
  Thứ tự trừ và cơ sở tính chính xác **chưa đọc** (nằm trong Schedule 2 / Exhibit B–C của Apple và hóa đơn của Google). Sơ đồ chỉ để thấy các khoản, không dùng để tính số.
- Theo Nghị định 117, cá nhân đã bị nền tảng khấu trừ VAT và PIT thì không phải khai lại cho các giao dịch đó. Với Apple điều này có vẻ đã đủ (PIT 2% và VAT). Với Google, trang chỉ nói VAT 5%; nếu Google không khấu trừ PIT 2% thì có thể cá nhân phải **tự kê khai PIT** cho doanh thu Google Play. Cần kiểm (khác với ghi chú "5% WHT" của file PAYMENT_PROVIDERS).
- Ngưỡng 500 triệu đồng/năm của Luật 109/2025 (từ kỳ tính thuế 2026) có thể làm cá nhân có doanh thu nhỏ không phải chịu PIT; khi đó khoản 2% store đã khấu trừ có thể là **khấu trừ thừa**, đòi lại qua thủ tục hoàn thuế. Chưa có hướng dẫn chính thức nào nối hai quy định này.
- Câu "2% lên 5% … nội dung thông tin số về giải trí, trò chơi điện tử…" có thể **không** áp cho app học từ vựng (giáo dục), nhưng việc phân loại cần người có chuyên môn xác nhận.
- Doanh thu qua cổng web Việt Nam (VNPay, MoMo, ZaloPay…) không đi qua store, nên không ai khấu trừ thay: chủ dự án tự kê khai như hộ hoặc cá nhân kinh doanh. Nếu cổng đó tự tính là "nền tảng số có chức năng thanh toán" theo Nghị định 117 thì có thể khác; chưa kiểm.
- **Công ty ở Việt Nam:** Apple thôi nộp FCT trên doanh thu bán cho khách; Google nói developer Việt Nam không phải hộ hay cá nhân thì tự lo VAT. Nghĩa là công ty phải tự kê khai VAT và CIT cho doanh thu store; store vẫn khấu trừ FCT 5% (Apple) hoặc thu 5% VAT (Google) trên phần phí của họ.
- Ngân hàng: Google trả USD nên cần tài khoản ngoại tệ (hoặc chịu ngân hàng quy đổi). Apple quy đổi sang tiền của tài khoản; trang không nói có trả thẳng VND vào ngân hàng Việt Nam không.

### Gaps
- Google có khấu trừ PIT cho cá nhân Việt Nam không (trang thuế chỉ nói VAT 5%): cần đọc phần "Vietnam tax info" trong Payments profile hoặc hỏi hỗ trợ của Google.
- "Standard rate" VAT trong thông báo Apple cho cá nhân Việt Nam là 5% (theo tỷ lệ của Nghị định 117) hay 10%: thông báo không nói.
- Apple trả tiền vào tài khoản VND ở ngân hàng Việt Nam được không, hay phải USD: trang không nói.
- Ngày trả tiền hằng tháng của Google: chỉ có nguồn thứ cấp (ngày 15).
- Nghị định hướng dẫn Luật 109/2025 (Nghị định 68/2026/NĐ-CP?), việc bỏ thuế khoán từ 2026, và có luật sửa đổi tháng 4/2026 thay ngưỡng 500 triệu hay không: nguồn thứ cấp mâu thuẫn, chưa đọc văn bản gốc.
- Nghị định 117/2025 có bị sửa hay thay thế trong năm 2026 không: chưa kiểm.
- Văn bản gốc của Nghị định 117 (điều về tỷ lệ) và Luật 48/2024 (điều về nhà cung cấp nước ngoài): mới thấy qua tóm tắt của cổng Chính phủ, thuvienphapluat và hãng tư vấn, chưa đọc nguyên văn điều luật.
