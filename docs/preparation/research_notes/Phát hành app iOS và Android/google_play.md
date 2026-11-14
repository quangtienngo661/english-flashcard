# Google Play: từ "chưa có tài khoản" tới "app chạy trên production", cho một developer cá nhân ở Việt Nam (trạng thái 20/10/2026)

Phạm vi: phía Google Play (tài khoản Play Console, cổng thử kín, track phát hành, yêu cầu kỹ thuật khi publish, các khai báo trong
Play Console, merchant/thuế ở mức tổng quát, rủi ro tài khoản). Build, signing và CI do người nghiên cứu khác phụ trách; ở đây chỉ
nêu chỗ quy trình Play bắt buộc. App: học từ vựng tiếng Anh cho người Việt, Flutter (chưa viết), NestJS API đã có, email + mật khẩu
(sẽ thêm Google login), flashcard, ôn lặp lại, câu luyện tập do AI sinh, gói Pro tự gia hạn (Free / Trial / Pro), sẽ có quảng cáo,
email nhắc học. Một người, ở Việt Nam, dùng Windows 11.

Quy ước: nguồn chính thức của Google được ưu tiên. Nguồn ghi *(anecdotal)* là blog, diễn đàn hoặc dịch vụ bán tester. Nguồn ghi
*(qua tóm tắt tìm kiếm)* nghĩa là chưa đọc trang gốc, chỉ thấy đoạn trích. Trang trợ giúp Play Console thường không ghi ngày cập
nhật; các trang developer.android.com có ghi và được ghi kèm. Các trang support.google.com được đọc hôm 20/10/2026.

## 1. Tài khoản developer: Personal hay Organization, phí, xác minh danh tính, thông tin hiện công khai, và "Android developer verification"

### Takeaway
Phí là **US$25 một lần**, người đăng ký phải từ 18 tuổi. Tài khoản **Personal** cần tên pháp lý, địa chỉ, email và số điện thoại
(xác minh bằng OTP), có thể bị đòi CCCD/hộ chiếu, và phải chứng minh có một máy Android thật. Tài khoản **Organization** cần mã
D-U-N-S (miễn phí, mất tới 30 ngày). Điểm dễ bị bỏ qua: **tài khoản Personal có bán hàng (subscription) thì Google hiện
địa chỉ đầy đủ của chủ tài khoản trên Play**. Chương trình "Android developer verification" mới không đòi thêm gì từ một app
chỉ phát hành trên Play: Play Console tự đăng ký package name.

### Cited Findings
**Phí và các bước tạo tài khoản**
- "There is a US$25 one-time registration fee." Nhận MasterCard, Visa, American Express; Visa Electron chỉ ngoài Mỹ; **không nhận
  thẻ trả trước**. Thông tin bị phát hiện là không hợp lệ thì không hoàn phí — [Play Console Help 6112435](https://support.google.com/googleplay/android-developer/answer/6112435)
- Các bước: đăng nhập bằng Google Account → chấp nhận Developer Distribution Agreement → trả phí → chọn loại tài khoản → xác minh
  danh tính → (chỉ Personal) đáp ứng yêu cầu thử nghiệm và xác minh thiết bị — [6112435](https://support.google.com/googleplay/android-developer/answer/6112435)
- Có thể bị yêu cầu "a valid government ID and a credit card, both under your legal name" — [6112435](https://support.google.com/googleplay/android-developer/answer/6112435)
- Từ đầu năm 2024, tài khoản Personal mới phải "verify that they have access to an Android device using the Play Console mobile app" — [6112435](https://support.google.com/googleplay/android-developer/answer/6112435)
- "You must be at least 18 years of age to sign up for a Play Console account." — [6112435](https://support.google.com/googleplay/android-developer/answer/6112435)

**Personal và Organization**
- Hai loại có "access to the same functionality" và đều bán hàng được qua payments profile. Personal dành cho cá nhân, sinh viên,
  người làm nghiệp dư; Organization dành cho "commercial, industrial, professional, or governmental activities". Google khuyên
  dùng Organization nếu app thuộc dịch vụ tài chính, sức khỏe, VpnService hoặc app chính phủ — [Help 13634885](https://support.google.com/googleplay/android-developer/answer/13634885)
- "To create a developer account for an organization, you must have a D-U-N-S number." Xin qua Dun & Bradstreet là miễn phí;
  Google cảnh báo các dịch vụ trung gian thu phí cao — [13634885](https://support.google.com/googleplay/android-developer/answer/13634885)
- Xin D-U-N-S "can take up to 30 days so you should plan ahead"; không có D-U-N-S thì không tạo được tài khoản Organization — [Help 13628312](https://support.google.com/googleplay/android-developer/answer/13628312)
- Thông tin bắt buộc. **Personal**: developer name, legal name, legal address, contact email, contact phone, developer email.
  **Organization**: thêm D-U-N-S, tên và địa chỉ tổ chức (lấy từ Google Payments profile), số điện thoại tổ chức, website, tên người
  liên hệ, developer phone — [13628312](https://support.google.com/googleplay/android-developer/answer/13628312)
- Tên và địa chỉ pháp lý lấy từ Google Payments profile và phải được xác minh trước khi publish. Email và điện thoại xác minh bằng
  OTP và "remain operational for the duration of your developer account" — [13628312](https://support.google.com/googleplay/android-developer/answer/13628312)
- Khi bật bán hàng, phương thức thanh toán được xác minh bằng giao dịch thử (deposit challenge) hoặc giấy tờ ngân hàng;
  "Verification can take up to 5 days" — [13628312](https://support.google.com/googleplay/android-developer/answer/13628312)

**Thông tin hiện công khai trên Google Play**
- Personal: "Google will display your legal name, your country (as per your legal address), and developer email address", cùng
  developer name; ở một số khu vực có thể hiện số điện thoại hoặc địa chỉ đầy đủ — [13628312](https://support.google.com/googleplay/android-developer/answer/13628312)
- Personal có bán hàng: "If you decide to monetize on Google Play then Google will display your full address." — [13628312](https://support.google.com/googleplay/android-developer/answer/13628312)
- Organization: hiện "legal name, legal address, developer email address, and developer phone number" — [13628312](https://support.google.com/googleplay/android-developer/answer/13628312)

**Riêng cho người ở Việt Nam**
- Việt Nam có trong danh sách hỗ trợ "Google Play Developer Registration" và "Merchant Registration" — [Help 9306917](https://support.google.com/googleplay/android-developer/answer/9306917)
- Trang 6112435 không có quy định riêng cho Việt Nam, ngoài việc loại thẻ được chấp nhận có thể khác theo nơi ở — [6112435](https://support.google.com/googleplay/android-developer/answer/6112435)
- *(anecdotal, không rõ năm đăng)* Một bài hướng dẫn tiếng Việt khuyên chuẩn bị CCCD hoặc hộ chiếu bản gốc chụp rõ, đủ 4 góc, không
  flash; thẻ Visa/Mastercard (ghi nợ hoặc tín dụng) có ít nhất US$25 và đã bật thanh toán online (E-commerce); nhập địa chỉ khớp
  CCCD; chọn Personal để khỏi cần D-U-N-S; duyệt "có thể mất từ vài giờ đến vài ngày" — [Viblo](https://viblo.asia/p/huong-dan-tao-tai-khoan-nha-phat-trien-tren-play-console-2vJPdWEnJeK)

**Android developer verification (công bố 2025, triển khai 2026)**
- Mốc thời gian: tháng 8/2026 ra mắt API cho developer, "limited distribution accounts" và luồng nâng cao cho người dùng rành máy;
  **30/9/2026** bắt đầu áp dụng cho người cài app từ các store tham gia ở **Brazil, Indonesia, Singapore, Thái Lan** trên máy
  Android 7+ có chứng nhận; **2027** mở rộng ra toàn cầu cho mọi app trên máy có chứng nhận. Việt Nam không được nêu tên — [developer.android.com/developer-verification](https://developer.android.com/developer-verification)
- "For most Play developers, **no new action** is required for identity verification. Your existing verified identity (such as for
  Play's developer verification requirements) meets this requirement." — [Play Console guide, cập nhật 30/9/2026](https://developer.android.com/developer-verification/guides/google-play-console)
- App mới: "when you create an app in the Google Play Console, Google Play automatically registers the package name and links it to
  your account. If another developer is already using that name, the Play Console prompts you to choose a different name." — [Play Console guide](https://developer.android.com/developer-verification/guides/google-play-console)
- "Google Play automatically registers 99% of apps"; Play Console dùng để đăng ký thêm các app phát hành ngoài Play — [developer-verification](https://developer.android.com/developer-verification)
- Blog ngày 30/3/2026: ai đã xác minh danh tính trên Play Console thì "you're likely already set"; app chưa đăng ký vẫn sideload được
  qua ADB hoặc luồng nâng cao — [Android Developers Blog, 30/3/2026](https://developer.android.com/blog/posts/android-developer-verification-rolling-out-to-all-developers-on-play-console-and-android-developer-console)
- Limited distribution accounts cho phép "students, teachers, and hobbyists … share apps with up to 20 devices without a
  government-issued ID or registration fee" — [developer-verification](https://developer.android.com/developer-verification)

### Inferences
- Với app này (chỉ phát hành trên Play), "Android developer verification" không thêm việc gì ngoài xác minh danh tính Play Console
  vốn đã bắt buộc. Nó chỉ quan trọng nếu sau này phát APK ngoài Play (ví dụ gửi file APK cho người dùng thử): từ 2027 APK đó
  phải được đăng ký qua Play Console thì mới cài được trên máy có chứng nhận.
- **Lưu ý riêng tư:** chủ dự án chọn Personal và bán Pro thì địa chỉ đầy đủ ghi trong payments profile (thường là nhà riêng, khớp
  CCCD) sẽ hiện công khai trên trang app. Organization cũng hiện địa chỉ và số điện thoại pháp lý. Không có loại tài khoản nào
  giấu được địa chỉ khi đã bán hàng. Tài liệu COMMERCIALIZATION_READINESS chỉ nhắc chuyện Apple hiện tên thật (dòng 139–141), chưa
  nhắc chuyện Google hiện địa chỉ; nên bổ sung.
- Organization cần một pháp nhân để có D-U-N-S (theo tài liệu dự án, đó là công ty, có thể cả hộ kinh doanh). Đổi lại, tài khoản
  Organization không bị cổng thử kín 12 người / 14 ngày (xem mục 2). Đó là trade-off chính: khoảng 30 ngày xin D-U-N-S cộng chi
  phí lập pháp nhân, so với khoảng 2–3 tuần thử kín.
- Developer làm việc trên Windows vẫn cần một máy Android thật để cài app Play Console khi xác minh thiết bị, và để tự thử.

### Gaps
- Chưa có nguồn chính thức cho biết ở Việt Nam bước xác minh danh tính đòi đúng loại giấy tờ nào (CCCD hay hộ chiếu), có cần giấy
  xác nhận địa chỉ không, và mất bao lâu. Chỉ có bài Viblo *(anecdotal)*.
- Chưa xác minh được: đổi Personal sang Organization sau này có được không, hay phải tạo tài khoản mới rồi chuyển app (app
  transfer). Trang 13634885 không nói. Có báo cáo *(anecdotal)* về tài khoản bị khóa sau khi chuyển app giữa tài khoản Personal và
  Organization (xem mục 7).
- Chưa rõ hộ kinh doanh cá thể ở Việt Nam có xin được D-U-N-S và mở tài khoản Organization không.
- Chưa rõ trường "full address" cho phép dùng địa chỉ không phải nhà riêng (văn phòng ảo, hộp thư) không. Địa chỉ phải khớp payments
  profile đã xác minh, nên nhiều khả năng là không, nhưng chưa xác minh.

## 2. Yêu cầu thử nghiệm với tài khoản Personal mới (closed test N người trong N ngày) và việc xin production access

### Takeaway
Con số hiện tại (2026) là **ít nhất 12 tester opt-in liên tục 14 ngày** trong một closed test, chỉ áp dụng cho tài khoản Personal
tạo sau 13/11/2023. Sau đó developer bấm "Apply for production" và trả lời một form ba phần; Google duyệt "thường trong 7 ngày
hoặc ít hơn". Đủ số người chưa chắc được duyệt: tester phải dùng app thật. Từ lúc app sẵn sàng cho closed test tới lúc được quyền
production, nên tính khoảng **3 tuần**.

### Cited Findings
- Tài khoản Personal "created after November 13, 2023" phải thử nghiệm trước khi app được phát hành trên Google Play — [Help 14151465](https://support.google.com/googleplay/android-developer/answer/14151465)
- Lúc xin production access, closed test phải có "at least 12 testers" opt-in "continuously for the preceding 14 days" — [14151465](https://support.google.com/googleplay/android-developer/answer/14151465)
- FAQ: "Testers who opt in, test for fewer than 14 days, and then opt out do not count toward the requirement." và "If a tester opts
  out and opts back in later, the 14 days must be consecutive to count toward the minimum requirement." — [14151465](https://support.google.com/googleplay/android-developer/answer/14151465)
- Cách xin: Dashboard → "Apply for production". Form có ba phần: về closed test (tuyển tester có dễ không, tester có dùng hết tính
  năng không, cách dùng có giống production không, tóm tắt góp ý và cách thu); về app (đối tượng, giá trị, ước số lượt cài năm
  đầu); về độ sẵn sàng (đã đổi gì sau closed test, dựa vào đâu để thấy sẵn sàng) — [14151465](https://support.google.com/googleplay/android-developer/answer/14151465)
- Duyệt "seven days or less". Nếu cần thử thêm (ví dụ "fewer than 12 opted-in testers or insufficient tester engagement") thì phải
  chạy tiếp closed test — [14151465](https://support.google.com/googleplay/android-developer/answer/14151465)
- Google gợi ý tuyển tester qua "personal and professional networks" và khuyến khích tester "use as many features as possible" — [14151465](https://support.google.com/googleplay/android-developer/answer/14151465)
- Internal testing là "optional, but recommended as a starting point" — [14151465](https://support.google.com/googleplay/android-developer/answer/14151465)
- Khi chưa đáp ứng yêu cầu, tài khoản Personal mới không phát hành được app và không dùng được pre-registration — [Help 9845334](https://support.google.com/googleplay/android-developer/answer/9845334)
- **Lịch sử con số:** khi mới áp dụng (11/2023) là 20 tester; Play Console bắt đầu hiện "at least 12 testers for at least 14 days
  continuously" từ khoảng **11/12/2024**, không có thông báo chính thức đi kèm — [Adalo forum](https://forum.adalo.com/t/google-play-policy-update-how-anyone-can-get-12-free-testers/53705) *(anecdotal, qua tóm tắt tìm kiếm)*.
  Bài ontest.app (4/7/2026) lại ghi việc giảm từ 20 xuống 12 là năm 2025 — [ontest.app](https://ontest.app/blog/google-play-12-testers-14-days-requirement-explained) *(anecdotal)*.
  Hai nguồn lệch nhau về năm; trang chính thức hiện chỉ ghi con số 12.
- Tài khoản Organization không bị yêu cầu này — [ontest.app](https://ontest.app/blog/google-play-12-testers-14-days-requirement-explained) *(anecdotal)*; trang chính thức 14151465 chỉ nêu tài khoản Personal là đối tượng.
- *(anecdotal)* Form xin production có khoảng 10 câu, khoảng 300 ký tự mỗi câu; trả lời chung chung là lý do bị từ chối phổ biến;
  ra quyết định khoảng 48 giờ tới 7 ngày — [testerscommunity.com](https://www.testerscommunity.com/research/the-12-tester-era) *(dịch vụ bán tester, qua tóm tắt tìm kiếm)*;
  khoảng 3–7 ngày làm việc — [ontest.app](https://ontest.app/blog/google-play-12-testers-14-days-requirement-explained)
- *(anecdotal)* Lý do bị từ chối hay gặp: tester opt-in nhưng gần như không mở app; dùng emulator hoặc profile phụ làm tester;
  thông báo từ chối thường gặp: "we need you to continue testing your app with real testers". Lời khuyên: tuyển 15–18 người để dư,
  tính 14–17 ngày, theo dõi mức tương tác từ ngày đầu, ghi chép trong lúc thử để trả lời form cụ thể — [ontest.app](https://ontest.app/blog/google-play-12-testers-14-days-requirement-explained)
- *(anecdotal)* Nên đẩy ít nhất một bản cập nhật nhỏ trong 14 ngày; bạn bè và người thân hay cài một lần rồi bỏ — [testerscommunity.com](https://www.testerscommunity.com/blog/why-apps-fail-google-play-production-access) *(dịch vụ bán tester, qua tóm tắt tìm kiếm)*
- *(anecdotal)* Một developer tránh thuê tester trên Fiverr vì sợ tester giả và tài khoản bị gắn cờ, thay vào đó tìm tester qua cộng
  đồng r/AndroidClosedTesting bằng cách thử chéo app của nhau — [Level Up Coding](https://levelup.gitconnected.com/the-12-tester-tax-google-plays-closed-testing-rule-is-quietly-killing-solo-devs-2cea83c2e338) *(qua tóm tắt tìm kiếm)*

### Inferences
- Cách khả thi nhất cho một developer ở Việt Nam: tuyển 15–20 người học thật (bạn bè đang học tiếng Anh, nhóm Facebook học từ vựng,
  người trong danh sách chờ của landing). Đây cũng là đúng nhóm người dùng mục tiêu, nên câu trả lời trong form xin production sẽ có
  nội dung thật. Dùng Google Group làm danh sách tester để thêm, bớt người dễ dàng.
- Thuê tester (Fiverr và các dịch vụ tương tự) có rủi ro: Google xét mức tương tác và có thể phát hiện emulator. Hiện chưa có nguồn
  chính thức cấm việc này, nhưng các báo cáo khóa tài khoản vì "high risk behavior" (mục 7) cho thấy nên tránh mọi thứ trông như
  tương tác giả.
- Nên thử trên cả backend thật: closed test là lúc kiểm luồng đăng ký, OTP qua email, Play Billing bằng license tester, email nhắc
  học. Nghĩa là backend phải chạy ở môi trường người ngoài truy cập được trước khi bắt đầu đếm 14 ngày. Điều này mâu thuẫn với lịch
  hiện tại trong CLAUDE.md ("Deploy khi cả app xong, trước launch"): **muốn closed test thì phải deploy sớm hơn**, ít nhất một môi
  trường staging.

### Gaps
- Chưa xác minh được: yêu cầu áp dụng **cho từng app mới hay chỉ một lần cho mỗi tài khoản**. Trang chính thức không nói rõ; bài
  ontest.app vừa viết "per-account, not per-app" vừa viết "each new app needs its own 12-tester, 14-day closed test", tự mâu thuẫn.
- Chưa rõ khi số tester tụt dưới 12 giữa chừng thì bộ đếm 14 ngày về 0 hay vẫn chạy. Các nguồn *(anecdotal)* nói ngược nhau; trang
  chính thức chỉ nói 14 ngày của từng tester phải liên tục.
- Chưa xác minh được tài khoản Personal mới có dùng được open testing trước khi được production access không.
- Không tìm thấy bài viết tiếng Việt năm 2025–2026 nào kể lại trải nghiệm thử kín 12 người. Tìm trên Viblo và tìm tiếng Việt nói
  chung chỉ ra các nguồn tiếng Anh.

## 3. Các track phát hành, staged rollout, thời gian duyệt năm 2026, điều gì làm duyệt lâu hơn (kèm lộ trình đầu-cuối)

### Takeaway
Có bốn track: internal (tối đa 100 tester, có thể không qua duyệt policy), closed, open, production. Staged rollout chỉ dùng cho
bản cập nhật, **không dùng được cho bản phát hành đầu tiên**. Google không công bố thời gian duyệt cố định; trang chính thức nói
duyệt kỹ hơn "may result in review times of up to seven days or longer in exceptional cases". Đường dự kiến cho developer Personal
mới: khoảng **3–5 tuần** từ lúc tạo tài khoản tới lúc app lên production, nếu bản build đã sẵn sàng.

### Cited Findings
- Internal testing: "An internal test can have up to 100 testers per app", thêm bằng danh sách email; "Internal tests might not be
  subject to standard Play policy or security reviews"; được miễn form Data safety; tester internal ở nước nào cũng nhận được — [Help 9845334](https://support.google.com/googleplay/android-developer/answer/9845334)
- Closed testing: tối đa 200 danh sách email, mỗi danh sách tối đa 2.000 người, tối đa 50 danh sách mỗi track; dùng được Google Groups
  (`yourgroupname@googlegroups.com`) — [9845334](https://support.google.com/googleplay/android-developer/answer/9845334)
- Open testing: mặc định không giới hạn số tester, hoặc đặt giới hạn từ 1.000 trở lên; ai có link đều vào được — [9845334](https://support.google.com/googleplay/android-developer/answer/9845334)
- Staged rollout: "Staged rollouts can only be used for app updates, not when publishing an app for the first time." Tỷ lệ phần trăm
  không tự tăng; có thể halt và resume (resume áp dụng cho cùng nhóm người); chọn quốc gia chỉ được khi cập nhật bản production, và
  "Once a staged rollout has started, you can't remove any countries." — [Help 6346149](https://support.google.com/googleplay/android-developer/answer/6346149)
- Halt một bản đã phát hành 100%: bản trước đó tự quay lại cho người dùng mới; "You cannot halt your first release on a track." — [Help 16285429](https://support.google.com/googleplay/android-developer/answer/16285429)
- Thời gian duyệt: bản cập nhật thường "processed and published as soon as possible"; một số tài khoản developer và một số app phải
  duyệt kỹ hơn (không nêu tên nhóm nào), "This may result in review times of up to seven days or longer in exceptional cases." — [Help 9859751](https://support.google.com/googleplay/android-developer/answer/9859751)
- Managed publishing: bản cập nhật vẫn được duyệt như thường, và sau khi duyệt "you control exactly when the changes are published" — [9859751](https://support.google.com/googleplay/android-developer/answer/9859751)
- Thay đổi chưa gửi duyệt nằm ở mục "Changes not yet sent for review" và không tự gửi — [9859751](https://support.google.com/googleplay/android-developer/answer/9859751)
- Đơn xin production access duyệt trong "seven days or less" — [Help 14151465](https://support.google.com/googleplay/android-developer/answer/14151465)
- Bài nộp không đúng quy định dẫn tới "rejections, review delays, and lengthier appeal processes" — [14151465](https://support.google.com/googleplay/android-developer/answer/14151465)

### Inferences
Lộ trình đầu-cuối dự kiến cho một developer Personal ở Việt Nam (các khoảng thời gian lấy từ nguồn ở trên; tổng là ước tính):

```
Tạo tài khoản + trả US$25 + xác minh danh tính, email, điện thoại, thiết bị Android  ── vài giờ – vài ngày (anecdotal)
        │  (nếu bán hàng: payments profile + merchant, xác minh phương thức thanh toán ≤ 5 ngày)
        ▼
Tạo app trong Play Console (package name tự đăng ký), điền App content (mục 5), store listing
        ▼
Internal testing (≤ 100 người, gần như không qua duyệt)  ── kiểm build AAB, Play Billing với license tester
        ▼
Closed testing ≥ 12 người opt-in, 14 ngày liên tục  ── bản closed test vẫn qua duyệt; tính 14–17 ngày
        ▼
Apply for production (form 3 phần)  ── ≤ 7 ngày
        ▼
Gửi bản production đầu tiên (không staged rollout được)  ── duyệt; có thể tới 7 ngày hoặc lâu hơn
        ▼
App live. Các bản cập nhật sau: staged rollout 5% → 20% → 50% → 100%, có thể halt
```

- Tổng thời gian thực tế: khoảng 3–5 tuần sau khi build sẵn sàng, khớp với ước tính "~3 tuần" trong COMMERCIAL_MINIMUM_CHECKLIST H1
  và COMMERCIALIZATION_READINESS Q3. Tài liệu dự án chưa tính thời gian duyệt bản production đầu tiên sau khi được production access.
- App mới từ tài khoản mới nhiều khả năng rơi vào nhóm duyệt kỹ hơn. Google không nêu tên nhóm nào, nên nên dự trù tới 7 ngày cho
  mỗi lần nộp đầu tiên, và dùng managed publishing để chủ động ngày ra mắt.

### Gaps
- Google không công bố thời gian duyệt trung bình năm 2026 cho app mới hay bản cập nhật. Các con số "vài giờ" hay "1–3 ngày"
  thường gặp trên mạng chưa có nguồn chính thức nào xác nhận.
- Chưa có danh sách chính thức về những gì gây "extended review" (ngoài việc Google nói một số tài khoản và một số app bị duyệt kỹ hơn).

## 4. Yêu cầu kỹ thuật khi publish: AAB, target API level 2026, Play App Signing, 16 KB page size, giới hạn kích thước

### Takeaway
App mới phải nộp **Android App Bundle (AAB)**. App mới và bản cập nhật phải nhắm **Android 16 (API 36) từ 31/8/2026**, có thể xin gia
hạn tới **1/11/2026**. App mới tự được ghi danh **Play App Signing** (Google giữ khóa ký app, developer giữ upload key, mất upload key thì
xin reset được). App nhắm API 35 trở lên phải hỗ trợ **16 KB page size**; trang chính thức hiện ghi từ **1/2/2027** bản cập nhật
không hỗ trợ sẽ không phát hành được. Giới hạn base module là 500 MB.

### Cited Findings
- "From August 2021, new apps are required to publish with the Android App Bundle on Google Play." — [developer.android.com/guide/app-bundle, cập nhật 24/6/2026](https://developer.android.com/guide/app-bundle)
- Từ **31/8/2026**: app mới và bản cập nhật phải nhắm **Android 16 (API 36)** trở lên (Wear OS và Automotive: API 35; TV và XR: API 34).
  Gia hạn được tới **1/11/2026**. App đang có phải nhắm API 35 trở lên để người dùng mới trên máy chạy Android mới hơn còn thấy app — [Target API requirements, cập nhật 16/10/2026](https://developer.android.com/google/play/requirements/target-sdk)
- Play App Signing: app mới "will be automatically enrolled in quantum-ready, hybrid signing with Google-generated keys", kèm một khóa
  cổ điển riêng cho thiết bị Android 16 trở xuống. Upload key "Must be an RSA key of 2048 bits or more"; mất hoặc lộ upload key thì
  Google reset được. Khóa ký app do Google tạo là RSA 4096 — [Help 9842756](https://support.google.com/googleplay/android-developer/answer/9842756)
- Nếu tự quản lý khóa ký app (không dùng Play App Signing) mà mất khóa thì "This key cannot be reset" — [9842756](https://support.google.com/googleplay/android-developer/answer/9842756)
- 16 KB: "all apps targeting Android 15 (API level 35) and higher must support 16 KB memory page sizes on 64-bit devices on Google Play."
  "Starting February 1, 2027, if your app updates don't support 16 KB memory page sizes, you won't be able to release these updates." — [Page sizes guide, cập nhật 16/10/2026](https://developer.android.com/guide/practices/page-sizes)
- 16 KB, kỹ thuật: cần AGP 8.5.1 trở lên để căn chỉnh thư viện native chưa nén; app chỉ có code Java/Kotlin (kể cả mọi thư viện) đã
  tương thích sẵn — [Page sizes guide](https://developer.android.com/guide/practices/page-sizes)
- **Mâu thuẫn về ngày 16 KB:** các nguồn năm 2025 ghi hạn là 1/11/2025, gia hạn được tới 31/5/2026 — [Adalo forum, 2025](https://forum.adalo.com/t/important-republish-your-android-apps-by-november-1-2025/59040) *(qua tóm tắt tìm kiếm)*.
  Trang chính thức hiện tại (16/10/2026) ghi 1/2/2027; một bài *(anecdotal)* nói các ngày cũ là trước khi Google dời hạn — [testerbee.com](https://testerbee.com/blog/16-kb-page-size-on-google-play-find-the-failing-so) *(qua tóm tắt tìm kiếm)*.
  Ngày 1/2/2027 của trang chính thức là ngày đang có hiệu lực.
- Giới hạn kích thước (tính theo dung lượng tải đã nén): base module 500 MB; mỗi feature module 500 MB; tổng module và asset pack cài
  cùng app 4 GB; app trên 200 MB hiện cảnh báo (không chặn) với người dùng đang dùng dữ liệu di động; app vẫn nộp APK thì tối đa 100 MB — [Help 9859372](https://support.google.com/googleplay/android-developer/answer/9859372)

### Inferences
- Flutter đóng gói engine dưới dạng thư viện native (`libflutter.so`) nên quy tắc 16 KB áp dụng. Vì app sẽ nhắm API 36 (lớn hơn 35),
  bản build phải tương thích 16 KB ngay từ đầu. Người nghiên cứu phần tooling nên xác minh phiên bản Flutter/AGP nào cho build 16 KB
  đúng chuẩn. (Suy luận: trang Google không nhắc Flutter.)
- App học từ vựng chủ yếu là text, nên khó vượt 200 MB, trừ khi đóng gói sẵn audio phát âm cho 8.812 từ. Nếu có audio thì nên tải từ
  server khi cần hoặc dùng Play Asset Delivery.
- Nên để Google tạo khóa ký app (mặc định) và cất upload key thật cẩn thận. Mất upload key thì xin reset được; mất khóa tự quản lý thì
  không cập nhật app được nữa.
- COMMERCIAL_MINIMUM_CHECKLIST H7 đã ghi "Target Android API 36 (từ 31/8/2026)": khớp. Tài liệu dự án chưa nhắc 16 KB, AAB và Play
  App Signing.

### Gaps
- Chưa rõ hạn 1/2/2027 có áp dụng cho bản phát hành đầu tiên của app mới không, hay chỉ cho bản cập nhật. Trang chỉ nói "app updates".
- Chưa xác minh hôm nay biểu mẫu xin gia hạn target API (tới 1/11/2026) còn mở không. Câu "extension forms will be available in Play
  Console later this year" trên trang có thể đã cũ.

## 5. Các khai báo bắt buộc trong Play Console (App content) và khai báo nào áp dụng cho app này

### Takeaway
Mọi app phải khai: privacy policy, ads, content rating (IARC), target audience, Data safety, financial features và health apps (kể cả
khi không có tính năng đó, thì cam kết "không có"), COVID-19. App này còn phải khai: **App access** (tài khoản demo cho reviewer, vì
phải đăng nhập), **xóa tài khoản** (trong app và qua một link web), và tuân theo **policy về nội dung do AI sinh** (phải có nút báo
cáo nội dung ngay trong app). Khai đối tượng dưới 13 tuổi sẽ kéo theo Families policy (ràng buộc ad SDK, màn hỏi tuổi trung lập).

### Cited Findings
**Áp dụng cho mọi app**
- Ads: "declare whether or not your app contains ads"; quảng cáo tự quảng bá (house ads), banner, interstitial, native ad đều tính là
  "Yes"; Google có thể kiểm và hiện nhãn "Contains ads"; khai sai "may result in your app(s) being suspended" — [Help 9859455](https://support.google.com/googleplay/android-developer/answer/9859455)
- Content rating: "All apps must have a content rating from the IARC to be on Google Play"; "Apps without a content rating will be removed";
  nội dung hoặc tính năng đổi làm thay đổi câu trả lời thì phải làm lại bảng hỏi — [Help 9898843](https://support.google.com/googleplay/android-developer/answer/9898843)
- Target audience and content: bắt buộc với mọi app; nhóm tuổi: 5 trở xuống, 6–8, 9–12, 13–15, 16–17, 18 trở lên — [Help 9867159](https://support.google.com/googleplay/android-developer/answer/9867159)
- Data safety: mọi app trên closed, open, production (chỉ internal được miễn); app không thu dữ liệu vẫn phải khai và có link privacy
  policy; phải khai cả dữ liệu do thư viện và SDK bên thứ ba gửi đi; hỏi dữ liệu có mã hóa khi truyền không, có cách yêu cầu xóa không;
  khai sai mà không sửa thì bị chặn cập nhật hoặc gỡ app — [Help 10787469](https://support.google.com/googleplay/android-developer/answer/10787469)
- Data safety: "service provider" là bên "processes user data on behalf of the developer and based on the developer's instructions"
  (không tính là chia sẻ); SDK lập hồ sơ quảng cáo trên nhiều khách hàng thì không phải service provider, phải khai là chia sẻ — [10787469](https://support.google.com/googleplay/android-developer/answer/10787469)
- Privacy policy là bắt buộc để hoàn thành Data safety — [10787469](https://support.google.com/googleplay/android-developer/answer/10787469); app nhắm trẻ em phải để link privacy policy cả trên store listing lẫn trong app — [9859455](https://support.google.com/googleplay/android-developer/answer/9859455)
- Financial features: mọi developer có app (closed, open, production) phải điền, kể cả app không có tính năng tài chính thì cam kết là
  không có — [Help 13849271](https://support.google.com/googleplay/android-developer/answer/13849271) *(qua tóm tắt tìm kiếm)*
- Health apps: tương tự, mọi app phải điền và cam kết không có tính năng sức khỏe nếu không có — [Help 14738291](https://support.google.com/googleplay/android-developer/answer/14738291) *(qua tóm tắt tìm kiếm)*
- COVID-19 contact tracing/status: mọi app phải khai — [9859455](https://support.google.com/googleplay/android-developer/answer/9859455)
- Permissions declaration form: chỉ khi dùng quyền rủi ro cao như SMS, Call Log — [9859455](https://support.google.com/googleplay/android-developer/answer/9859455)

**Áp dụng riêng cho app này**
- App access: bắt buộc nếu một phần app cần đăng nhập. Phải cung cấp thông tin cho reviewer vào được; ô "Any other instructions" dùng để
  báo "if there's anything special about your login mechanisms" như one-time password, MFA; tối đa 5 bộ hướng dẫn — [9859455](https://support.google.com/googleplay/android-developer/answer/9859455)
- Xóa tài khoản: app cho tạo tài khoản thì phải có "an in-app path to delete their app accounts and associated data" **và** "a web link
  resource where users can request app account deletion"; người dùng không phải cài lại app để gửi yêu cầu; cần hủy subscription trước
  thì phải giải thích rõ; xóa tài khoản là xóa cả dữ liệu đã khai trong Data safety (được giữ một phần vì bảo mật, chống gian lận, tuân
  thủ pháp luật nếu có ghi rõ); link phải khai trong Data safety — [Help 13327111](https://support.google.com/googleplay/android-developer/answer/13327111)
- AI-generated content: "Apps that generate content using AI must contain in-app user reporting or flagging features" để người dùng
  báo nội dung xúc phạm mà không phải rời app; app phải ngăn sinh nội dung bị cấm (ví dụ nội dung bóc lột trẻ em, lừa đảo). Policy
  định nghĩa nội dung AI là "created by generative AI models based on user prompts" — [Help 13985936](https://support.google.com/googleplay/android-developer/answer/13985936)

**Đối tượng trẻ em và thiếu niên (Families policy)**
- Chọn nhóm dưới 13 tuổi: phải tuân Families Policy Requirements và chỉ được dùng "Families Self-Certified Ads SDKs" — [9867159](https://support.google.com/googleplay/android-developer/answer/9867159)
- Đối tượng hỗn hợp (trẻ em cùng người lớn): vẫn phải theo Families policy; quảng cáo cho trẻ em và người chưa rõ tuổi phải từ SDK đã tự
  chứng nhận; cần một màn hỏi tuổi trung lập (không điền sẵn ngày sinh, không gợi ý tuổi cần có) — [9867159](https://support.google.com/googleplay/android-developer/answer/9867159)
- Không nhắm trẻ em nhưng hình ảnh, nhân vật trông hướng tới trẻ em ("youthful animation or young characters") thì có thể bị từ chối — [9867159](https://support.google.com/googleplay/android-developer/answer/9867159)
- Nhóm 13–15 và 16–17 "may be considered to include children in some locales"; nếu app nhắm người dưới 21 tuổi thì phải xem luật địa
  phương có coi họ là trẻ em không — [9867159](https://support.google.com/googleplay/android-developer/answer/9867159)
- Chỉ chọn 18 trở lên và bật "Restrict Minor Access": người bị xác định dưới 18 không tìm, tải hay mua được app; người dùng cũ còn dùng
  được nhưng không gia hạn subscription được — [9867159](https://support.google.com/googleplay/android-developer/answer/9867159)

**Việt Nam**
- Nghị định 147/2024 (hiệu lực 25/12/2024) phân loại **game online** theo độ tuổi 00+, 12+, 16+, 18+, và cơ quan quản lý có thể buộc
  Google Play, App Store gỡ game không phép — [Vietnam Briefing](https://www.vietnam-briefing.com/news/vietnams-new-internet-regulation-decree-147-2024.html) *(bình luận luật, qua tóm tắt tìm kiếm)*. App học từ vựng không phải game.

### Inferences
Bảng khai báo áp dụng cho app này:

| Khai báo | Áp dụng? | Ghi chú cho app này |
|---|---|---|
| Privacy policy | Có | Cần một URL công khai (landing `apps/web` là chỗ hợp lý) |
| App access | Có | Đăng ký cần OTP qua email, reviewer không nhận được → cấp **tài khoản demo đã xác minh sẵn**, ghi rõ trong "Any other instructions". Nên cấp Pro cho tài khoản này (backend đã có staff grant) để reviewer xem được tính năng Pro |
| Ads | Có (khi có quảng cáo) | Khai "Yes" ngay khi app có bất kỳ quảng cáo nào, kể cả quảng cáo tự quảng bá gói Pro dạng banner hay interstitial |
| Content rating (IARC) | Có | Làm lại khi thêm nội dung do người dùng hoặc AI sinh |
| Target audience | Có | Quyết định quan trọng: có nhắm học sinh dưới 13 tuổi không (xem dưới) |
| Data safety | Có | Khai: email, tài khoản, tiến độ học, câu ngữ cảnh người học nhập, dữ liệu gửi cho AI provider, SDK quảng cáo, analytics/crash; mã hóa khi truyền (HTTPS); có cách xóa |
| Xóa tài khoản | Có | Khớp mục C4 và H5 của COMMERCIAL_MINIMUM_CHECKLIST (hiện "dời sang Bước 8"); **phải có trước khi nộp production** |
| AI-generated content | Gần như chắc có | Câu luyện tập do AI sinh, nhất là câu sinh từ câu người học tự nhập (Bước 7) → thêm nút "Báo cáo câu này" trong app; khớp ý tưởng quyền `questions.moderate` đã ghi trong CLAUDE.md |
| Financial features, Health apps | Điền "không có" | Bán subscription qua Play Billing nhiều khả năng không tính là "financial feature" (chưa xác minh) |
| COVID-19 | Điền "không" | |
| Permissions declaration | Nhiều khả năng không | Nhắc học dùng email và notification, không dùng SMS/Call Log |
| News, Government apps | Không | |

- Nhắm trẻ em dưới 13 tuổi (học sinh tiểu học học từ vựng) sẽ kéo theo Families policy: chỉ được dùng ad SDK tự chứng nhận Families,
  phải có màn hỏi tuổi trung lập, phải để link privacy policy trong app. Cách ít rủi ro nhất cho V1 là chọn 13 tuổi trở lên (hoặc
  16+/18+) và không dùng hình ảnh trông như cho trẻ em trên store listing. Đây là một quyết định chủ dự án cần chốt.
- Data safety và AI provider: nếu AI provider chỉ xử lý dữ liệu theo chỉ dẫn của developer (không dùng để huấn luyện mô hình hay cho
  mục đích của họ) thì có thể khai là service provider, tức "collected" chứ không phải "shared". Cần xem điều khoản của provider được
  chọn ở Bước 6.

### Gaps
- Chưa đọc trang chính thức về khai báo "Advertising ID" (app nhắm Android 13 trở lên mà dùng quyền `AD_ID`) và "Government apps".
  Lần đọc trang 9859455 không liệt kê hai mục này, nên chưa nói được chúng còn tồn tại hay đã đổi.
- Chưa xác minh Google Play có xếp hạng tuổi riêng cho Việt Nam không (Apple có từ 18/6/2026 theo tài liệu dự án). Trang IARC
  9898843 không nhắc Việt Nam.
- Chưa xác minh luật Việt Nam coi người dưới bao nhiêu tuổi là trẻ em (liên quan câu "consider local law" của Google), và Nghị định
  13/2023 (bảo vệ dữ liệu cá nhân) đòi gì về sự đồng ý của cha mẹ. Không nghiên cứu lần này.
- Chưa xác minh policy về quyền `SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM`, chỉ liên quan nếu app Flutter đặt nhắc học cục bộ bằng
  báo thức chính xác.

## 6. Merchant/payments profile để bán subscription từ Việt Nam: quốc gia hỗ trợ, đồng tiền nhận, thuế, VAT

### Takeaway
Việt Nam được hỗ trợ cả đăng ký developer lẫn **merchant**. Đồng tiền mặc định là VND, nhưng developer ở Việt Nam **nhận tiền bằng
USD hoặc EUR**. Với hộ kinh doanh hoặc cá nhân ở Việt Nam, **Google tự thu và nộp VAT 5%** trên tiền người Việt mua, và thu thêm 5% VAT
trên phí dịch vụ của Google. Developer phải nộp **mã số định danh cá nhân 12 số**. Phí dịch vụ cho subscription tự gia hạn ở Việt Nam
là **15%**.

### Cited Findings
- Dòng Việt Nam: "Vietnam ✔ ✔ VND[1]" (hỗ trợ đăng ký developer, hỗ trợ đăng ký merchant, đồng tiền mặc định VND); chú thích [1]:
  "Developers in these countries will be paid in USD or EUR, depending on their location." — [Help 9306917](https://support.google.com/googleplay/android-developer/answer/9306917)
- Muốn bán hàng phải có merchant account và payments profile đã cấu hình; xác minh phương thức thanh toán tới 5 ngày — [Help 13628312](https://support.google.com/googleplay/android-developer/answer/13628312)
- Developer ở Việt Nam là hộ kinh doanh hoặc cá nhân: "Google or its payment processor partners will charge and remit a 5% VAT on these
  purchases" (app và mua trong app của khách hàng Việt Nam); Google cũng thu và nộp 5% VAT trên phí dịch vụ, ghi riêng — [Help 138000](https://support.google.com/googleplay/android-developer/answer/138000)
- Không thuộc diện hộ kinh doanh hoặc cá nhân thì developer tự lo VAT — [138000](https://support.google.com/googleplay/android-developer/answer/138000)
- "You are required to submit your Vietnam tax code (i.e., 12-digit personal identification number)"; nhập ở Payments profile →
  Settings → Manage settings → Vietnam tax info — [138000](https://support.google.com/googleplay/android-developer/answer/138000)
- Developer ở ngoài Việt Nam: Google thu và nộp 10% VAT trên mua hàng của khách Việt Nam — [138000](https://support.google.com/googleplay/android-developer/answer/138000)
- Ở các thị trường Google nộp thuế thay, Google là merchant of record; phí dịch vụ tính trên giá chưa thuế — [138000](https://support.google.com/googleplay/android-developer/answer/138000)
- Phí dịch vụ: ở các thị trường ngoài AU, EEA, JP, UK, US là "15% for automatically renewing subscription products"; sản phẩm mua trong
  app khác: 15% cho US$1 triệu đầu mỗi năm nếu đã ghi danh tier 15%, trên mức đó 30%. AU/EEA/JP/UK/US chuyển sang cơ cấu phí mới
  (EEA, UK, US từ 30/6/2026; AU, JP từ 30/9/2026); các thị trường khác giữ mức hiện tại "until the announced updated service fees are
  rolled out globally" — [Help 112622](https://support.google.com/googleplay/android-developer/answer/112622)

### Inferences
- Bán Pro ở Việt Nam: người dùng trả giá đã gồm VAT 5%; Google trừ VAT, rồi trừ 15% phí dịch vụ trên giá chưa thuế, rồi trừ 5% VAT trên
  khoản phí đó, phần còn lại chuyển cho developer bằng USD. Ví dụ ước tính (không phải số Google công bố): giá 105.000đ → chưa thuế
  100.000đ → phí 15.000đ → VAT trên phí 750đ → developer nhận khoảng 84.250đ, quy ra USD.
- "Mã số định danh cá nhân 12 số" nhiều khả năng là số CCCD (Việt Nam dùng số định danh cá nhân làm mã số thuế cá nhân từ 1/7/2025).
  **ASSUMPTION**: chưa xác minh trong phiên này.
- Google có nộp VAT thay thì developer cá nhân vẫn có thể phải tự khai thuế thu nhập cá nhân. Tài liệu COMMERCIALIZATION_READINESS
  dòng 260–262 đã ghi phần này là UNVERIFIED; nghiên cứu lần này không giải quyết được.
- Tài liệu dự án ghi "Google thu và nộp thay 5% ... đòi số định danh cá nhân 12 số" và "trả về Việt Nam bằng USD hoặc EUR": khớp với
  trang chính thức hôm nay. Không có mâu thuẫn.

### Gaps
- Trang 9306917 không có bảng nơi người mua được mua và đồng tiền người mua trả. Trang VAT ngầm cho thấy khách Việt Nam mua được,
  nhưng chưa xác minh trực tiếp người dùng Việt Nam trả bằng VND trên Play.
- Chưa xác minh cách nhận tiền về ngân hàng Việt Nam (chuyển khoản quốc tế bằng USD, phí ngân hàng nhận, ngưỡng thanh toán tối thiểu).
- Chưa xác minh cách ghi danh tier phí 15% (trang 10632485 chưa đọc) và subscription có cần ghi danh không (trang ghi 15% cho subscription
  tự gia hạn "regardless of annual revenue").
- Thuế thu nhập (TNCN, TNDN) của developer: ngoài phạm vi trang Google; chưa có nguồn.

## 7. Rủi ro sức khỏe tài khoản với developer cá nhân mới: suspension, termination, đóng tài khoản không hoạt động, strike, và cách tránh

### Takeaway
Tài khoản tạo hơn một năm mà **chưa từng nộp app** sẽ bị đóng và không hoàn phí. Nghĩa là **không nên đăng ký tài khoản Play quá sớm**
trong khi dự án đang làm web trước. Nhiều suspension là "strike"; nhiều strike, hoặc một vi phạm nghiêm trọng, dẫn tới termination
**kèm mọi tài khoản liên quan**, và tài khoản mới mở sau đó cũng bị đóng. Các báo cáo *(anecdotal)* về việc bị khóa vì "high risk
behavior" thường liên quan tới việc hệ thống nối tài khoản với nhau và chuyển app giữa các tài khoản.

### Cited Findings
- Tài khoản không hoạt động. Loại không có app: tạo hơn 1 năm và chưa từng nộp app để duyệt. Loại có app: tạo hơn 1 năm, tổng app
  (live, đã gỡ, bị suspend) "less than 1,000 combined lifetime installs", email và điện thoại liên hệ chưa xác minh, và không dùng Play
  Console trong 180 ngày qua. Có email báo, nhắc lại trước 60, 30 và 7 ngày; không hoàn phí đăng ký — [Help 11605267](https://support.google.com/googleplay/android-developer/answer/11605267)
- Muốn giữ tài khoản: xác minh email và điện thoại ở trang Account details, **và** publish một app hoặc bản cập nhật; chưa muốn phát hành
  công khai thì dùng internal app sharing, internal testing hoặc closed testing — [11605267](https://support.google.com/googleplay/android-developer/answer/11605267)
- Các mức xử lý: rejection (không ảnh hưởng tài khoản); removal (nhiều lần có thể dẫn tới suspension); suspension ("count as strikes");
  limited visibility; limited regions; restricted developer account (gỡ hết app, không publish được); account termination — [Help 9899234](https://support.google.com/googleplay/android-developer/answer/9899234)
- "Multiple strikes can result in the termination of individual and related Google Play Developer accounts"; khi bị terminate, "any related
  Google Play developer accounts will also be permanently suspended"; tài khoản mới mở trong lúc tài khoản khác đang bị terminate cũng bị
  đóng và không hoàn phí. Google không công bố số strike cụ thể — [9899234](https://support.google.com/googleplay/android-developer/answer/9899234)
- Vi phạm lặp lại hoặc nghiêm trọng ("malware, fraud, and apps that may cause user or device harm") dẫn tới termination; developer chịu
  trách nhiệm cả về SDK bên thứ ba trong app — [9899234](https://support.google.com/googleplay/android-developer/answer/9899234)
- Tên hoặc địa chỉ không còn khớp xác minh mà không sửa kịp hạn → tài khoản bị hạn chế, "which would remove all of your apps from Google Play";
  email hoặc điện thoại developer không liên lạc được thì Google có thể gỡ app — [Help 13628312](https://support.google.com/googleplay/android-developer/answer/13628312)
- Khai ads sai có thể bị suspend — [Help 9859455](https://support.google.com/googleplay/android-developer/answer/9859455); khai Data safety sai thì bị chặn cập nhật hoặc gỡ app — [Help 10787469](https://support.google.com/googleplay/android-developer/answer/10787469); app không có content rating bị gỡ — [Help 9898843](https://support.google.com/googleplay/android-developer/answer/9898843)
- *(anecdotal)* Thông báo termination ghi "pattern of high risk or abuse"; kháng nghị thường bị từ chối, kèm câu Google "can't share the
  reasons"; các yếu tố được nhắc gồm khiếu nại, lịch sử vi phạm, góp ý người dùng và "use of popular brands, characters, and other assets" — [Thunkable community](https://community.thunkable.com/t/my-google-play-console-account-terminated-with-reason-high-risk-behavior/3581202) *(qua tóm tắt tìm kiếm)*
- *(anecdotal)* Developer bị terminate sau khi chuyển app giữa tài khoản Personal và Organization, nghi do bị nối nhầm với tài khoản khác
  hoặc do đổi thiết bị và mạng — [B4X forum](https://b4x.com/android/forum/threads/google-play-account-terminated-after-app-transfer-between-personal-and-organization-accounts.170336/) *(qua tóm tắt tìm kiếm)*

### Inferences
Các cách tránh rủi ro, suy ra từ các nguồn trên:
- **Thời điểm đăng ký:** chỉ tạo tài khoản Play khi trong vòng 12 tháng chắc chắn nộp được ít nhất một bản closed test. Theo
  COMMERCIALIZATION_READINESS Q3 (web trước, mobile sau khi có người trả tiền), đăng ký bây giờ có nguy cơ bị đóng vì không hoạt động
  và mất US$25.
- Chỉ một tài khoản, đúng danh tính thật, một Gmail riêng dùng lâu dài; giữ email và điện thoại liên hệ luôn liên lạc được; đăng nhập
  Play Console ít nhất mỗi 180 ngày.
- Không dùng tên thương hiệu người khác (Oxford, Cambridge, Duolingo, IELTS…) trong tên app, icon hay mô tả khi chưa có quyền.
- Không mua tester hay lượt cài, không dùng emulator làm tester trong closed test.
- Đừng chuyển app giữa các tài khoản ngay sau khi tạo. Nếu sau này chuyển từ Personal sang Organization thì làm qua quy trình chính
  thức và chờ lâu dài (rủi ro *anecdotal*).
- Khai đúng ads, Data safety (kể cả dữ liệu SDK quảng cáo và AI provider thu), giữ content rating cập nhật.
- Theo tài liệu dự án, Android vitals sẽ cảnh báo trên trang app nếu tỷ lệ crash vượt 1,09% hoặc ANR vượt 0,47%. Nên chạy staged
  rollout và theo dõi các chỉ số này.

### Gaps
- Google không công bố số strike dẫn tới termination, cũng không công bố tiêu chí "high risk behavior".
- Không tìm thấy thống kê về tỷ lệ tài khoản developer Việt Nam bị khóa, hay các vụ cụ thể của developer Việt Nam năm 2025–2026.
- Chưa đọc trang "Managing Policy Violations and Appeals", nên chưa có thời hạn kháng nghị và quy trình chi tiết.
