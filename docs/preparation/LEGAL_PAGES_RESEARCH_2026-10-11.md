# Research: Privacy Policy và Terms of Use cho Wordmet

**Ngày:** 11/10/2026 · **Trạng thái:** research và đề xuất, **chưa phải quyết định**. Không phải tư vấn pháp lý.
**Phạm vi:** những gì hai trang `/privacy` và `/terms` của Wordmet cần có, theo luật Việt Nam, luật nước ngoài có thể áp
dụng, yêu cầu của store và Google, và cách các app tương tự viết. Đầu vào cho design doc của việc viết hai trang.

**Giới hạn của nguồn.** Phiên này không mở được văn bản gốc trên cổng pháp luật (lỗi DNS của công cụ fetch); các điểm
luật Việt Nam dưới đây đến từ bản tóm tắt của cơ quan nhà nước, báo chí và công ty luật, có ghi rõ ở cột "Độ tin cậy".
Mọi điểm đánh dấu **cần đối chiếu** phải đọc lại trong văn bản gốc (vbpl.vn, Công báo) hoặc hỏi luật sư trước khi công bố.

## 1. Kết luận ngắn

1. Trang Privacy hiện tại đúng sự thật nhưng **thiếu nhiều mục bắt buộc**: ai chịu trách nhiệm dữ liệu, căn cứ xử lý,
   quyền của người dùng, chuyển dữ liệu ra nước ngoài, thời gian lưu, trẻ em, cách khiếu nại (mục 3).
2. Luật áp dụng chính là **Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15** (hiệu lực 01/01/2026) và **Nghị định 356/2025/NĐ-CP**.
   Sự đồng ý phải tự nguyện, biết rõ loại dữ liệu và mục đích, riêng cho từng mục đích, im lặng không phải đồng ý.
   Form waitlist đang cho tick "đồng ý Chính sách bảo mật" mà **không có link** tới chính sách: phải sửa trước tiên.
3. Terms chưa cần khi chỉ có waitlist. Terms cần khi người dùng **tạo tài khoản** (Bước 3, pilot) và phải có thêm phần
   gói, trial và thanh toán khi có billing.
4. Ba việc ngoài nội dung có thể chặn hoặc ảnh hưởng: (a) Wordmet chưa có pháp nhân nên bên chịu trách nhiệm là **cá
   nhân chủ dự án**; (b) dữ liệu lưu trên Cloudflare (mạng toàn cầu) có thể bị coi là **chuyển dữ liệu ra nước ngoài**,
   kéo theo hồ sơ đánh giá tác động; (c) **tuổi tối thiểu** của người dùng (Luật có điều riêng cho trẻ em). Cả ba cần
   chủ dự án quyết và nên hỏi luật sư (mục 9).
5. Đề xuất viết theo ba giai đoạn (mục 8): bản đầy đủ cho waitlist ngay bây giờ, bản cho pilot có tài khoản, bản cho
   billing và store.

## 2. Wordmet xử lý dữ liệu gì (lấy từ spec, không phải giả định)

| Giai đoạn | Dữ liệu | Mục đích | Lưu ở đâu, bên xử lý | Thời gian lưu | Nguồn |
|---|---|---|---|---|---|
| Waitlist (đang chạy) | Email, ngôn ngữ trang lúc đăng ký, thời điểm | Báo tin ra mắt | Cloudflare D1 (`wordmet-waitlist`) | Đến khi ra mắt hoặc khi người dùng yêu cầu xóa (30 ngày) | landing-deploy design §4, `messages/*.json` |
| Waitlist | Cookie ngôn ngữ (`NEXT_LOCALE`) | Nhớ ngôn ngữ | Trình duyệt | Theo cookie | landing-page design §4 |
| Waitlist | Thư gửi tới `hello@`, `ryan.ngo@` | Liên hệ | Cloudflare Email Routing → Gmail cá nhân | Theo hộp thư | DP10 |
| V1 tài khoản | Email, hash mật khẩu (Argon2id), danh tính Google (subject), chuỗi phiên (nhãn thiết bị, thời điểm), hash OTP, hồ sơ, vai trò; **không lưu IP lâu dài** | Đăng nhập, bảo mật | Postgres (provider chưa chọn) | Đến khi xóa tài khoản | Identity IR21, IR10 |
| V1 | Ngôn ngữ mẹ đẻ, múi giờ | Giao diện, giải nghĩa, ranh giới ngày | Postgres | Đến khi xóa tài khoản | system-spec S8, SR13 |
| V1 | Từ riêng tư, câu ngữ cảnh người học nhập, nhóm từ, trạng thái thẻ, lịch ôn, kết quả bài | Học và ôn | Postgres | Đến khi xóa tài khoản | Vocabulary Content, Learning, Practice |
| V1 | Gói, quyền, sổ lượt dùng AI | Hạn mức | Postgres | Đến khi xóa tài khoản; số liệu tổng hợp ẩn danh được giữ | Entitlements, SR11 |
| V1 | Nội dung học gửi cho AI provider: từ, loại từ, level, nghĩa, nhãn ngữ cảnh; câu ngữ cảnh chỉ khi người học tự gửi lúc tra nghĩa. **Không gửi email, tên, user ID** | Sinh bài, tra nghĩa | AI provider (chưa chọn) | Theo điều khoản provider (F30, chưa xác minh) | AI Integration AR7 |
| V1 | Nhật ký chi phí AI (không lưu prompt và phản hồi thô), log có `operation_id`, không chứa mật khẩu, OTP, token, câu trả lời, câu ngữ cảnh | Vận hành, chi phí | Server | Ẩn danh khi xóa tài khoản | AR6, SR10 |
| V1 | Thư OTP, thông báo bảo mật | Xác minh email, quên mật khẩu | Google SMTP (`Mailer`) | — | Identity IR19 |

Xóa tài khoản (SR11, IR18): xóa ngay sau khi xác nhận lại danh tính, mọi module xóa dữ liệu, chỉ giữ số liệu tổng hợp
không định danh; thời hạn xóa bản sao lưu còn là `ASSUMPTION`.

## 3. Vì sao trang Privacy hiện tại chưa đủ

| Thiếu | Vì sao cần | Nguồn yêu cầu |
|---|---|---|
| Ai chịu trách nhiệm dữ liệu và cách liên hệ | Chủ thể phải biết bên xử lý là ai; Wordmet chưa có pháp nhân, trang chỉ ghi "Wordmet's account" | PDPL (quyền được biết), GDPR Art. 13(1)(a) |
| Căn cứ xử lý (đồng ý) và cách rút lại | Đồng ý phải rõ ràng, rút lại được bằng văn bản hoặc dạng điện tử | PDPL Điều 9, 10 |
| Danh sách quyền: biết, đồng ý hoặc rút đồng ý, xem và sửa, xóa, hạn chế, phản đối, khiếu nại | Trang chỉ nói xóa | PDPL (quyền chủ thể), GDPR Art. 13(2) |
| Chuyển dữ liệu ra nước ngoài | Cloudflare và Gmail xử lý ngoài Việt Nam | PDPL, NĐ 356/2025; GDPR Art. 13(1)(f) |
| Thời gian lưu cụ thể | Trang chỉ nói xóa khi được yêu cầu | GDPR Art. 13(2)(a), Apple 5.1.1 |
| Trẻ em và tuổi tối thiểu | Luật có điều riêng cho trẻ em | PDPL Điều 24 (theo nguồn thứ cấp) |
| Bên xử lý khác (Gmail qua Email Routing) | Thư liên hệ đi qua Cloudflare và Google | Minh bạch bên nhận dữ liệu |
| Lịch sử phiên bản | Đổi chính sách phải báo trước | Thói quen chung; DP4 đã có câu "sẽ cập nhật" |
| Link từ form và footer | Đồng ý mà không đọc được chính sách | PDPL Điều 9 (đồng ý phải "biết rõ") |

## 4. Khung pháp lý và yêu cầu nền tảng

| Nguồn | Áp dụng cho Wordmet khi nào | Điểm chính | Độ tin cậy |
|---|---|---|---|
| **Luật BVDLCN 91/2025/QH15** | Ngay bây giờ (đang thu email) | Hiệu lực 01/01/2026. Điều 9: đồng ý tự nguyện, biết rõ loại dữ liệu và mục đích, rõ ràng và lưu lại được, riêng cho từng mục đích, không gắn điều kiện, im lặng không phải đồng ý; rút đồng ý bằng văn bản hoặc dạng điện tử. Điều 24: trẻ em do người đại diện thực hiện quyền; trẻ từ đủ 7 tuổi cần đồng ý của cả trẻ và người đại diện (phạm vi cần đối chiếu). Điều 38 khoản 2: doanh nghiệp nhỏ và khởi nghiệp được chọn không thực hiện Điều 21, 22 và khoản 2 Điều 33 (hồ sơ đánh giá tác động, nhân sự bảo vệ dữ liệu) trong 5 năm, trừ khi xử lý dữ liệu nhạy cảm, số lượng lớn chủ thể hoặc kinh doanh dịch vụ xử lý dữ liệu. Phạt tối đa 3 tỷ đồng; vi phạm chuyển dữ liệu xuyên biên giới tới 5% doanh thu năm trước | Bản tóm tắt của cơ quan nhà nước và công ty luật; **cần đối chiếu**, nhất là Điều 24 và việc miễn trừ có áp dụng cho **cá nhân chưa có doanh nghiệp** hay không |
| **Nghị định 356/2025/NĐ-CP** | Ngay bây giờ | Hướng dẫn luật; có yêu cầu thông báo cho chủ thể; hồ sơ đánh giá tác động chuyển dữ liệu ra nước ngoài (mẫu số 09) và thông báo Bộ Công an; một nguồn nói nộp trong 60 ngày kể từ khi chuyển | Nguồn thứ cấp, số mẫu và thời hạn **mâu thuẫn giữa các nguồn** |
| **Luật Thương mại điện tử 122/2025/QH15** | Khi bán gói Pro (có billing) | Hiệu lực 01/7/2026, thay NĐ 52/2013 và 85/2021; nền tảng phải công khai điều kiện giao dịch. Bộ Công Thương có thông tư riêng cho ứng dụng di động (TT 38/2025, TT 26/2026) | Nguồn chính phủ cho ngày hiệu lực; nghĩa vụ cụ thể **chưa đọc** |
| **Luật BVQLNTD 19/2023/QH15** và NĐ 55/2024 | Terms là "điều kiện giao dịch chung" với người tiêu dùng | Điều 23: rõ ràng, dễ hiểu; Điều 25: điều khoản không được phép quy định (ví dụ loại trừ trách nhiệm); Điều 28: kiểm soát | Mục lục luật; nội dung Điều 25 **chưa đọc** |
| **GDPR** | Khi có người dùng ở EU (tên miền `.com`, giao diện tiếng Anh) | Art. 3(2): áp dụng cho bên ngoài EU cung cấp dịch vụ cho người ở EU. Art. 13: phải nêu bên chịu trách nhiệm, mục đích và căn cứ, bên nhận, chuyển dữ liệu, thời gian lưu, quyền, quyền khiếu nại. Art. 27: thường phải chỉ định đại diện ở EU; miễn trừ "occasional" khó đạt với app có tài khoản | Văn bản GDPR và nguồn tư vấn; việc "nhắm tới" EU **cần đánh giá** |
| **COPPA (Mỹ)** | Nếu cho người dưới 13 tuổi ở Mỹ dùng | Duolingo coi dưới 13 tuổi (hoặc dưới tuổi đồng ý số của nước sở tại) là "Child Users" và hạn chế dữ liệu | Bản tóm tắt chính sách Duolingo |
| **Apple App Store 5.1.1** | Khi phát hành iOS | Có Privacy Policy; app có tạo tài khoản phải **xóa tài khoản trong app**, xóa cả dữ liệu, không chỉ vô hiệu hóa | Tin 2022 và hướng dẫn Apple; **đọc lại bản hiện hành** |
| **Google Play** | Khi phát hành Android | Mọi app phải có Privacy Policy và điền form Data safety (kể cả track test), gồm cả SDK bên thứ ba và cách yêu cầu xóa dữ liệu | Tin 2021–2022; **đọc lại bản hiện hành** |
| **Google OAuth verification** | Khi bật "Đăng nhập bằng Google" (Bước 8) | Trang chủ mô tả app (không chỉ là trang đăng nhập) và có link Privacy; Privacy cùng domain với trang chủ, cùng URL ở consent screen; domain xác minh qua Search Console; nêu rõ cách dùng dữ liệu Google | Trang trợ giúp Google Cloud |
| **Giấy phép dữ liệu CEFR-J, Octanove** | Khi app hiển thị dữ liệu từ hai nguồn này | Terms **không được cấm** sao chép phần dữ liệu CC BY-SA; cần màn hình ghi nguồn | Vocabulary Content spec, SR15 |
| **Điều khoản AI provider** | Trước khi bật AI cho người thật | Xem provider có lưu hay huấn luyện bằng dữ liệu gửi đi không (F30) | Chưa chọn provider |

## 5. Bên xử lý dữ liệu (sub-processor)

| Bên | Dùng cho | Ghi chú |
|---|---|---|
| Cloudflare | Workers, D1, Email Routing, DNS, chứng chỉ | DPA của Cloudflare áp dụng cho cả gói self-serve và kèm Standard Contractual Clauses (bản v6.4 hiệu lực 03/4/2026). Vị trí lưu D1 chưa xác minh |
| Google | Gmail nhận thư chuyển tiếp; SMTP gửi OTP; OAuth (Bước 8) | Gmail cá nhân, không phải Workspace |
| AI provider | Sinh bài, tra nghĩa | Chưa chọn; chỉ nhận nội dung học (AR7) |
| Hosting backend và Postgres | API, dữ liệu tài khoản | Chưa chọn |
| Apple, Google Play | Phát hành, thanh toán sau này | Khi có app mobile và billing |

## 6. Khảo sát các app tương tự

Phiên này không mở được trang chính sách gốc của các app; dưới đây là bản tóm tắt bên thứ ba, chỉ dùng để thấy mẫu chung.

| App | Điểm đáng học | Nguồn |
|---|---|---|
| Duolingo | Định nghĩa "Child Users" dưới 13 tuổi (hoặc tuổi đồng ý số địa phương); dưới 16 tuổi có thêm bảo vệ (không quảng cáo cá nhân hóa, tắt theo dõi bên thứ ba); email riêng cho quyền riêng tư; nói rõ dữ liệu giọng nói và AI | ExpressVPN, ConductAtlas, Common Sense (các nguồn mâu thuẫn nhau ở phần quảng cáo) |
| Quizlet | Nội dung người dùng tạo không được kiểm duyệt trước; có quảng cáo và đối tác theo dõi | Common Sense, ConductAtlas |
| ELSA Speak, Anki | Không tìm được nội dung chính sách | — |

**Mẫu chung rút ra:** tách rõ dữ liệu theo nhóm; có mục trẻ em; có email liên hệ riêng; nói về AI và bên thứ ba; ghi
ngày hiệu lực và lịch sử thay đổi. Wordmet **không có quảng cáo và không theo dõi**, nên chính sách có thể ngắn hơn
nhiều so với Duolingo hay Quizlet, và đó là điểm nên nói rõ.

**Nên làm thêm trước khi viết:** chủ dự án mở trực tiếp chính sách của Duolingo, Quizlet, ELSA (bản tiếng Việt) và lưu
bản PDF vào `docs/preparation/evidence/`, vì công cụ của trợ lý không tải được.

## 7. Dàn ý đề xuất

### 7.1 Privacy Policy

| # | Mục | Nội dung cho Wordmet | Đáp ứng |
|---|---|---|---|
| 1 | Ai chúng tôi là | Wordmet do [tên chủ dự án], cá nhân, [thành phố], Việt Nam vận hành; email liên hệ | PDPL, GDPR 13(1)(a), OAuth |
| 2 | Phạm vi | Áp dụng cho website, waitlist, và app (khi có) | — |
| 3 | Dữ liệu thu thập | Bảng theo nhóm (mục 2), chỉ ghi nhóm đang thật sự thu ở giai đoạn đó | PDPL Điều 9 |
| 4 | Mục đích và căn cứ | Mỗi mục đích một dòng; căn cứ là đồng ý (waitlist) và thực hiện dịch vụ (tài khoản) | PDPL Điều 9, GDPR 13(1)(c) |
| 5 | Không làm gì | Không bán, không quảng cáo, không theo dõi, không dùng dữ liệu để huấn luyện AI; AI chỉ nhận nội dung học | AR7, khác biệt so với đối thủ |
| 6 | Bên xử lý và chuyển ra nước ngoài | Danh sách mục 5, nơi xử lý, cơ sở pháp lý | PDPL, NĐ 356, GDPR 13(1)(e)(f) |
| 7 | Thời gian lưu | Waitlist: đến khi ra mắt + N tháng hoặc khi yêu cầu; tài khoản: đến khi xóa; sao lưu: N ngày | GDPR 13(2)(a), Apple |
| 8 | Quyền của bạn | Biết, đồng ý hoặc rút, xem, sửa, xóa, hạn chế, phản đối, khiếu nại; cách gửi yêu cầu; thời hạn trả lời | PDPL, GDPR 13(2)(b)–(d) |
| 9 | Xóa tài khoản | Làm ngay trong app; dữ liệu nào bị xóa, dữ liệu tổng hợp nào được giữ | SR11, Apple 5.1.1(v), Google Play |
| 10 | Trẻ em | Tuổi tối thiểu và cách xử lý nếu phát hiện người dưới tuổi | PDPL Điều 24, COPPA |
| 11 | Bảo mật | Mô tả ngắn: mật khẩu băm, HTTPS, phiên theo thiết bị, log không chứa bí mật | IR10, SR10 |
| 12 | Cookie | Chỉ cookie ngôn ngữ và cookie phiên đăng nhập (HttpOnly) | IR10 |
| 13 | Dữ liệu Google (khi có OAuth) | Lấy gì từ Google, dùng làm gì, không chia sẻ | OAuth verification |
| 14 | Thay đổi chính sách | Báo trước qua email cho người dùng có tài khoản; ngày hiệu lực; lịch sử phiên bản | DP4 |
| 15 | Liên hệ và khiếu nại | Email; quyền khiếu nại tới cơ quan có thẩm quyền | PDPL, GDPR 13(2)(d) |

### 7.2 Terms of Use

| # | Mục | Nội dung cho Wordmet | Ghi chú |
|---|---|---|---|
| 1 | Chấp nhận điều khoản | Bên cung cấp (mục 7.1 #1); dùng dịch vụ là chấp nhận | Luật BVQLNTD Điều 23: rõ ràng, dễ hiểu |
| 2 | Điều kiện sử dụng | Tuổi tối thiểu; một người một tài khoản | Khớp mục Trẻ em |
| 3 | Tài khoản và bảo mật | Giữ mật khẩu; báo khi bị lộ; logout từng thiết bị | Identity |
| 4 | Gói Free, Trial, Pro | Free không có AI; trial 14 ngày tự kích hoạt; hạn mức AI có thể thay đổi | K7, Entitlements |
| 5 | Thanh toán và hoàn tiền | Chỉ khi có billing; mua qua App Store hoặc Google Play theo chính sách store | Apple 3.1.1, Luật TMĐT |
| 6 | Nội dung của bạn | Bạn sở hữu từ và câu ngữ cảnh mình nhập; Wordmet chỉ dùng để chạy dịch vụ cho bạn | Từ riêng tư |
| 7 | Nội dung của Wordmet và giấy phép bên thứ ba | Phần mềm và nội dung do Wordmet soạn; phần dữ liệu CC BY-SA theo giấy phép gốc, không bị cấm sao chép | CEFR-J, Octanove |
| 8 | Nội dung do AI tạo | Có thể sai; dùng để luyện tập, không phải nguồn chính thức; có nút báo lỗi | K16, AR9 |
| 9 | Hành vi bị cấm | Lạm dụng, dò tìm lỗ hổng trái phép, tự động hóa vượt giới hạn, chèn chỉ thị vào dữ liệu gửi AI | Rate limit SR14 |
| 10 | Ngừng hoặc thay đổi dịch vụ | Pilot có thể thay đổi; báo trước khi ngừng | Pilot |
| 11 | Chấm dứt | Người dùng xóa tài khoản bất cứ lúc nào; Wordmet khóa tài khoản vi phạm | SR11 |
| 12 | Giới hạn trách nhiệm | Phải phù hợp Luật BVQLNTD Điều 25 (không loại trừ trách nhiệm trái luật) | **Cần luật sư** |
| 13 | Luật áp dụng và giải quyết tranh chấp | Luật Việt Nam; thương lượng trước | **Cần luật sư** |
| 14 | Thay đổi điều khoản | Báo trước; ngày hiệu lực | — |
| 15 | Liên hệ | Email | — |

## 8. Viết theo giai đoạn

| Giai đoạn | Khi nào | Privacy | Terms |
|---|---|---|---|
| A. Waitlist | Ngay bây giờ | Bản đầy đủ nhưng chỉ cho dữ liệu đang thu (email, ngôn ngữ, thời điểm, cookie ngôn ngữ, thư liên hệ): mục 1–8, 10, 12, 14, 15. Hiện link ở footer và form | Chưa cần; giữ ẩn hoặc bỏ trang nháp |
| B. Pilot có tài khoản | Trước khi mở Bước 3 cho người thật | Thêm dữ liệu tài khoản, học tập, AI (khi bật), xóa tài khoản, bảo mật | Bản đầy đủ trừ mục 5; người dùng đồng ý khi đăng ký |
| C. Billing và store | Trước khi bán Pro hoặc lên store | Thêm thanh toán, Apple/Google, Data safety, OAuth | Thêm mục 5, điều kiện giao dịch theo Luật TMĐT |

Song ngữ Việt và Anh như phần còn lại của landing; bản tiếng Việt là bản chính (`ASSUMPTION`, cần chủ dự án chốt).

## 9. Câu hỏi cần chủ dự án quyết (hỏi từng câu một)

| # | Câu hỏi | Đề xuất của trợ lý | Nhãn |
|---|---|---|---|
| Q1 | Ai đứng tên bên chịu trách nhiệm dữ liệu khi chưa có pháp nhân? | Tên thật của chủ dự án, thành phố, email `hello@wordmet.com` | đề xuất |
| Q2 | Tuổi tối thiểu? | 16 tuổi trở lên cho pilot (khớp nhóm sinh viên, tránh nghĩa vụ đồng ý của người đại diện và COPPA); xem lại khi mở cho học sinh | đề xuất, cần đối chiếu Điều 24 |
| Q3 | Có xử lý hồ sơ đánh giá tác động chuyển dữ liệu ra nước ngoài không, và miễn trừ Điều 38 có áp dụng cho cá nhân không? | Hỏi luật sư trước khi mở pilot có tài khoản; với waitlist rủi ro thấp hơn nhưng vẫn nên hỏi | `ASSUMPTION` |
| Q4 | Có nhắm tới người dùng EU không (áp GDPR đầy đủ, đại diện EU)? | Không chủ động nhắm tới trong pilot; viết chính sách đủ các mục Art. 13 để không phải viết lại | đề xuất |
| Q5 | Giữ email waitlist bao lâu sau ra mắt? | Đến ra mắt + 6 tháng, rồi xóa nếu không tạo tài khoản | đề xuất |
| Q6 | Bản tiếng Việt hay tiếng Anh là bản chính khi hai bản khác nhau? | Tiếng Việt | đề xuất |
| Q7 | Có nhờ luật sư xem bản cuối không? | Có, ít nhất cho Terms mục 12–13 và Q3 | đề xuất |

## 10. Bước tiếp theo

1. Chủ dự án trả lời Q1–Q7.
2. Viết design doc ngắn cho giai đoạn A (nội dung VI/EN, vị trí link, e2e), theo quy tắc của repo.
3. Sau khi duyệt: sửa trang, hiện link Privacy ở footer và form, chạy test, deploy.

## Nguồn

- Luật BVDLCN 2025, tóm tắt: [Cảnh sát QLHC](https://canhsatquanlyhanhchinh.gov.vn/gioi-thieu/mot-so-quy-dinh-dang-chu-y-trong-luat-bao-ve-du-lieu-ca-nhan-2025-3694), [Tuyên Quang PBGDPL](https://pbgdpl.tuyenquang.gov.vn/DetailView/35980/8/HOI--DAP-quy-dinh-cua-luat-bao-ve-du-lieu-ca-nhan.html), [EY tháng 7/2025](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/legal-alert-july-2025-personal-data-protection-law-vn.pdf), [KPMG](https://assets.kpmg.com/content/dam/kpmg/vn/pdf/2025/06/new-pdp-law-vi.pdf), [LSVN về trẻ em](https://lsvn.vn/bao-ve-du-lieu-ca-nhan-cua-tre-em-theo-luat-bao-ve-du-lieu-ca-nhan-nam-2025-khoang-trong-phap-ly-va-kien-nghi-hoan-thien-a176510.html), [Bộ Công an](https://mps.gov.vn/chinh-sach-phap-luat/bai-viet/bao-ve-du-lieu-ca-nhan-trong-mot-so-hoat-dong-1754989261), [Công an Tây Ninh về doanh nghiệp nhỏ](https://congan.tayninh.gov.vn/vi/chi-tiet-tin-tuc?Id=269188), [Báo Đầu tư về mức phạt](https://baodautu.vn/to-chuc-vi-pham-quy-dinh-chuyen-du-lieu-ca-nhan-xuyen-bien-gioi-bi-phat-5-doanh-thu-d314379.html)
- Nghị định 356/2025: [EY tháng 3/2026](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/ey-vietnam-legal-alert-march-2026-decree-no356-2025-nd-cp-providing-detailed-guidance-for-implementation-of-personal-data-protection-law-viet.pdf), [Thư viện Pháp luật](https://thuvienphapluat.vn/phap-luat-doanh-nghiep/bai-viet/nghi-dinh-356-2025-nd-cp-pdf-huong-dan-luat-bao-ve-du-lieu-ca-nhan-moi-nhat-17744.html), [CDLAF về chuyển dữ liệu](https://cdlaf.vn/cap-nhat-2026-chuyen-du-lieu-xuyen-bien-gioi-theo-nghi-dinh-356-2025-nd-cp-quy-dinh-va-thu-tuc-tuan-thu/)
- Luật TMĐT 2025: [Cổng văn bản Chính phủ](https://vanban.chinhphu.vn/?pageid=27160&docid=216503&classid=1&orggroupid=1), [Bộ Công Thương](https://moit.gov.vn/tin-tuc/bo-cong-thuong-ban-hanh-cac-van-ban-ho-p-nha-t-ve-quan-ly-thuong-mai-dien-tu.html)
- Luật BVQLNTD 2023: [Caselaw](https://caselaw.vn/van-ban-phap-luat/411464-luat-bao-ve-quyen-loi-nguoi-tieu-dung-so-19-2023-qh15-ngay-20-06-2023-cua-quoc-hoi), [Bộ Công Thương](https://moit.gov.vn/tin-tuc/bao-chi-voi-nguoi-dan/nhung-diem-moi-cua-luat-bao-ve-quyen-loi-nguoi-tieu-dung-2023-trong-kiem-soat-hop-dong-theo-mau-dieu-kien-giao-dich-chun.html)
- GDPR Art. 27: [rgpd.com](https://rgpd.com/gdpr/chapter-4-controller-and-processor/article-27-representatives-of-controllers-or-processors-not-established-in-the-union), [GDPR Local](https://gdprlocal.com/de/gdpr-article-27-gdpr-exemptions/)
- Store: [Goodwin về Apple 5.1.1](https://www.goodwinlaw.com/en/insights/blogs/2022/06/delete-my-account-and-all-my-personal-data-apples-app-requirement-takes-effect), [iubenda về Google Play Data safety](https://www.iubenda.com/en/help/38933/-google-play-new-safety-section)
- Google OAuth: [Google Cloud Help](https://support.google.com/cloud/answer/13464321)
- Cloudflare DPA: [Cloudflare](https://www.cloudflare.com/cloudflare-customer-dpa/)
- Đối thủ: [ExpressVPN về Duolingo](https://expressvpn.com/blog/is-duolingo-safe/), [ConductAtlas Duolingo](https://conductatlas.com/platform/duolingo/), [Common Sense Duolingo](https://privacy.commonsense.org/privacy-report/duolingo), [Common Sense Quizlet](https://privacy.commonsense.org/privacy-report/quizlet)
