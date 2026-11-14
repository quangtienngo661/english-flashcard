# Nghiên cứu tích hợp quảng cáo (ads) cho Wordmet (19/10/2026)

Mục đích: trả lời yêu cầu của chủ dự án trong brainstorm Bước 5 (`docs/superpowers/reviews/2026-10-18-buoc-5-brainstorm-log.md`, vòng 2,
19/10/2026): app thương mại hoá nên cần ads (nếu được) để có kinh phí; Free có ads, trial và Pro không có ads; tần suất không quá nhiều.
Desk research, chỉ đọc trang công khai; không đăng ký, không điền form nào. **Không phải tư vấn pháp lý hay thuế.**

**Nhãn nguồn** (mọi khẳng định đều có mã nguồn; danh mục URL ở cuối file):

- **(Đ)** Đã đọc (chính thức): đọc trong phiên này trên trang của chính công ty, cơ quan ban hành, hoặc bài nghiên cứu gốc.
- **(T)** Thứ cấp: bài của bên thứ ba, trang tra cứu luật bên thứ ba, hoặc đoạn trích của công cụ tìm kiếm; chưa đối chiếu với bản chính thức.
- **(S)** Suy luận của người viết từ các nguồn trên.
- **(?)** Trang đã đọc không nói tới, hoặc không đọc được.

Một số trang help center (Zendesk của Quizlet, Busuu; Duolingo; một trang AdMob) chặn công cụ tải trang hoặc cần JavaScript; các trang đó được
đọc bằng trình duyệt dựng sẵn (tab riêng) và vẫn tính là (Đ).

---

## 1. Tóm tắt

1. Thực tế nhất: **mobile dùng AdMob** (plugin chính thức `google_mobile_ads` 9.1.0) (Đ)[M18]; **web dùng AdSense**, nhưng trang học nằm sau đăng
   nhập (phải cho crawler của Google đăng nhập) (Đ)[G11] và bên thứ ba báo ads bị mất khi Next.js đổi trang không tải lại (T)[W1][W3].
2. Mạng Việt Nam không hợp app mới (Admicro: website trên 1.000.000 lượt xem trang/tháng) (Đ)[N5]; Meta, Unity, AppLovin để sau, qua AdMob (Đ)[M25].
3. **Tiền ít:** interstitial ở Việt Nam 0,72–1,51 USD cho 1.000 lần hiện (2024) (T)[E1]; 1.000 người Free mỗi ngày ≈ vài chục USD/tháng (S, mục 6).
4. Đặt ads: interstitial (toàn màn hình) chỉ ở điểm nghỉ như màn tổng kết sau phiên, không khi mở/thoát app hay đang làm bài, tối đa một lần
   sau mỗi hai thao tác (Đ)[M4]; không ads ở màn đăng nhập, lỗi, trống (Đ)[G10]; banner không sát nút bấm (Đ)[M6].
5. **Việt Nam từ 15/02/2026** (Nghị định 342/2025): ads che nội dung phải tắt bằng một lần chạm, ảnh tĩnh không chờ, video chờ tối đa 5 giây
   (T)[V2][V3]. AdMob mặc định cho chờ tới 12 giây; tắt "high-engagement ads" còn 5 giây, rewarded vẫn 30 giây (Đ)[M10] → cần đọc luật (mục 9).
6. Luật Bảo vệ dữ liệu cá nhân 2025: theo dõi hành vi để quảng cáo cần đồng ý và cho từ chối (T)[V4]; Nghị định 356/2025 thay Nghị định 13/2023
   từ 01/01/2026 (T)[V6]. Người dùng EU cần CMP được Google chứng nhận (Đ)[M23].
7. **Tuổi tối thiểu là quyết định chặn:** có trẻ em thì phải dùng SDK ads chứng nhận cho trẻ em và màn hỏi tuổi trung lập (Đ)[P2]; mục Kids của
   Apple gần như cấm ads bên thứ ba (Đ)[A1].
8. "Không ads" là quyền lợi chuẩn của gói trả phí (Duolingo, Busuu, Quizlet, Memrise) (Đ)[L2][L6][L5][L7]; thí nghiệm Pandora: thêm ads thì người
   dùng ít đi rõ rệt, người trả tiền tăng nhẹ (Đ)[R1].
9. Backend Bước 5 tối thiểu chỉ cần cờ "có hiện ads không" theo người; chặn tần suất, xác minh rewarded (AdMob SSV), lưu đồng ý là tuỳ chọn (mục 8).

---

## 2. Bảng so sánh ad network

Cột "VN" = trả tiền về Việt Nam và thuế. Số trong ngoặc vuông là mã nguồn.

| Network | Nền tảng | Điều kiện tham gia | Chia doanh thu | Ngưỡng / lịch trả | VN: cách nhận tiền, thuế | Ghi chú cho Wordmet |
|---|---|---|---|---|---|---|
| **Google AdSense** | Web | Từ 18 tuổi (dưới 18 thì cha mẹ đăng ký thay); nội dung "high-quality, original"; sửa được HTML của site; tuân thủ chính sách. Trang không nêu ngưỡng traffic hay yêu cầu đăng ký doanh nghiệp (Đ)[G1] | Publisher nhận 80% sau phí của nền tảng bên mua; mua qua Google Ads thì còn khoảng 68% (Đ)[G2] | 100 USD; xác minh danh tính từ 0 USD, địa chỉ từ 10 USD (Đ)[G3] | Bảng phương thức trả tiền chung không cho thấy dòng Việt Nam (Đ)[G4]; bảng của AdSense for YouTube ghi VN: séc có, chuyển khoản (wire) có, EFT không (T, đoạn trích)[G5]. Google thu thông tin thuế Mỹ của mọi publisher và khấu trừ trên doanh thu từ người mua ở Mỹ; người không ở Mỹ dùng W-8BEN (Đ)[G6]. Danh sách hiệp định thuế của IRS không có Việt Nam (Đ)[G8] → không giảm được mức khấu trừ theo hiệp định (S). Google có bảng tên giấy chứng nhận cư trú thuế, có dòng Việt Nam (Đ)[G7] | Trang học sau đăng nhập cần "crawler login" (Đ)[G11]; nội dung học có đạt chuẩn "publisher-content" không thì (?) |
| **Google Ad Manager** (+ Google Publisher Tag) | Web (và app) | Cần một tài khoản AdSense; trang mô tả dành cho "large publishers who have significant direct sales"; có thể phải nói chuyện với nhân viên Google (Đ)[G13] | (?) | (?) | Như AdSense (S) | Có rewarded cho web, nhưng chỉ trên trang tối ưu cho mobile (Đ)[G14] |
| **Google AdMob** | Android, iOS (Flutter qua `google_mobile_ads`, publisher google.dev đã xác minh, bản 9.1.0) (Đ)[M18] | App phải đã phát hành trên store được hỗ trợ; review "app readiness" 2–3 ngày, trong lúc review có thể bị giới hạn ads; tài khoản phải xác minh (Đ)[M12] | Không tìm thấy con số chính thức (?) | 100 USD; xác minh danh tính 0 USD / địa chỉ 10 USD; chọn phương thức trả từ 10 USD (Đ)[M11]. Trả khoảng ngày 21 tháng sau (T, đoạn trích)[M13] | Thuế như AdSense (S) | Lựa chọn chính cho Flutter. Có frequency cap theo app và theo ad unit (Đ)[M9], SSV cho rewarded (Đ)[M17] |
| **Meta Audience Network** | Android, iOS, Unity; trang không nhắc web (Đ)[N1] | Chỉ bán qua bidding từ 2021; khi gộp qua AdMob cần Business Manager, tài khoản thanh toán, app-ads.txt (Đ)[M25]. Điều kiện duyệt riêng (?) | (?) | 100 USD (T)[N2] | (?) | Không nằm trong danh sách SDK tự chứng nhận cho trẻ em của Google Play (Đ)[P3] |
| **Unity Ads / LevelPlay** | Android, iOS (chủ yếu game) | (?) | (?) | Trả cuối tháng theo chu kỳ net 60, chỉ bằng USD (Đ)[N4]; ngưỡng mặc định 100 USD (T, diễn đàn)[N4] | (?) | Có trong danh sách SDK tự chứng nhận cho trẻ em (bản 4.0.1+) (Đ)[P3] |
| **AppLovin MAX** | Android, iOS | (?) | (?) | Trả ngày 15 tháng sau (NET15); ngưỡng và phí tuỳ phương thức, xem trong dashboard (Đ)[N3]; ngưỡng 100 USD (T, đoạn trích)[N3] | (?) | Đã rời chương trình SDK tự chứng nhận cho trẻ em của Google Play (Đ)[P3] |
| **Admicro** (VCCorp) | Website | Trang publisher ghi "PAGEVIEWS/THÁNG > 1.000.000", form hỏi tên miền, không nhắc app (Đ)[N5] | Không ghi (?) | Không ghi (?) | Thanh toán bằng tiền đồng (T)[N7] | Không hợp giai đoạn đầu (S) |
| **Adtima** (Zalo), **eClick** (FPT) | Adtima tập trung vào app (T)[N6] | Trang chủ Adtima chỉ đọc được tiêu đề (?)[N6]; eClick: (?) | (?) | (?) | (?) | Mạng publisher của Adtima theo tin tuyển dụng là các sản phẩm của chính hệ Zalo/VNG (T)[N6]; không thấy chương trình mở cho app bên ngoài (?) |

**Vấn đề kỹ thuật đã biết với Next.js App Router và Cloudflare Workers**

- AdSense: không tìm thấy hướng dẫn chính thức của Google cho app một trang (SPA) hay App Router (?). Bên thứ ba: Auto ads chỉ hiện sau khi
  tải lại trang (T)[W3]; request ads bị huỷ khi chuyển trang phía client (T)[W1]; App Router không tự báo đổi trang, cách vá là component theo
  dõi `usePathname` để nạp lại khối ads (T)[W2].
- Google Publisher Tag (Ad Manager) có hướng dẫn chính thức về tự điều khiển nạp và làm mới ads; khuyên không làm mới nhanh hơn 30 giây (T, đoạn trích)[G15].
- `ads.txt`: không bắt buộc nhưng Google "highly recommended"; phải nằm ở thư mục gốc tên miền, ví dụ `example.com/ads.txt` (Đ)[G12]. Với
  OpenNext trên Workers, đặt file tĩnh ở gốc là đủ (S, chưa thử).
- Cloudflare Rocket Loader (tính năng hoãn chạy script) từng làm hỏng mã AdSense; cách vá là thuộc tính `data-cfasync="false"` hoặc tắt Rocket
  Loader (T)[W4]. Nếu site đặt Content-Security-Policy thì phải mở cho các tên miền của Google ads (S).

---

## 3. Định dạng và vị trí đặt ads trong app học

### 3.1 Các định dạng

| Định dạng | Là gì (lời thường) | Quy tắc chính |
|---|---|---|
| **Banner** | Dải ads nhỏ cố định ở trên hoặc dưới màn hình | Không đặt sát phần tử tương tác (nút "next", menu), không trên màn mà người dùng chạm liên tục; không nổi đè lên nội dung; không chạy theo khi cuộn; không kẹp giữa hai vùng nội dung (Đ)[M6][M7]. Không theo thì có thể bị tính là click không hợp lệ hoặc bị tắt ads (Đ)[M7] |
| **Native** | Ads làm giống giao diện app, chen vào danh sách | Phải ghi rõ "Ad", "Advertisement" hoặc "Sponsored", cao và rộng ít nhất 15px; có biểu tượng AdChoices; phải phân biệt rõ với nội dung; không được nguỵ trang thành nút điều hướng (Đ)[M8] |
| **Interstitial** | Ads toàn màn hình hiện giữa hai màn | Hợp với app có điểm bắt đầu và kết thúc rõ (Đ)[M3]. Chỉ ở "logical breaks"; cấm khi mở app và khi thoát app; cấm sau mỗi thao tác, tối đa "no more than one interstitial ad after every two user actions" (tính cả bấm Back); cấm hiện ngay sau khi người dùng vừa đóng một interstitial khác; cấm hiện bất ngờ khi đang làm việc (chơi, điền form, đọc); nên tải trước để khỏi hiện trễ (Đ)[M4]. Nên hiện **trước** nút "Continue / Next", app không phải game thì hiện sau một số màn hoặc thao tác; nếu người dùng chạm nhanh thì chèn một khoảng chờ (Đ)[M5] |
| **Rewarded** | Người dùng tự chọn xem ads để nhận thưởng | Chỉ phát sau khi người dùng đồng ý rõ ràng; phải nói trước cần làm gì và được gì; cấm thưởng bằng tiền trực tiếp; thưởng phải dùng trong app, không chuyển nhượng; phải trao thưởng sau khi xem xong; không ép tương tác; cho bỏ qua hoặc đóng (Đ)[M2]. Riêng **rewarded interstitial** không cần bấm đồng ý trước nhưng phải có màn giới thiệu với nút "không" thật sự hoạt động (Đ)[M2] |
| **App open** | Ads khi mở app hoặc quay lại app | Là định dạng Google khuyên dùng thay cho interstitial lúc mở app (Đ)[M4] |

Cấm chung: app hứa trả tiền hoặc phần thưởng cho việc bấm hay xem ads, trừ ad unit rewarded theo chính sách riêng (Đ)[M1][M2]; khuyến khích
người dùng bấm ads, mũi tên chỉ vào ads, đặt ads dưới tiêu đề kiểu "helpful links" (Đ)[G9]. Không đặt ads trên màn **không có nội dung của
publisher** hoặc nội dung vô giá trị, màn đang xây dựng, màn dùng cho thông báo hay điều hướng; ví dụ màn "dead end" như Thank You, Exit, Error
(Đ)[G10]. Ads không được nhiều hơn nội dung (T, đoạn trích)[G17]. Apple: interstitial phải ghi rõ là ads, có nút đóng/bỏ qua dễ thấy và đủ lớn;
không đặt ads trong extension, widget, notification, bàn phím; ads phải hợp độ tuổi của app; app có ads phải cho người dùng báo ads không phù hợp (Đ)[A1].

### 3.2 Các app học làm gì với người dùng miễn phí

| App | Ads ở đâu, tần suất | Nguồn |
|---|---|---|
| **Duolingo** | "Learners who use Duolingo for free see an ad at the end of each lesson" — một ads cuối mỗi bài, không giữa bài | (Đ)[L1] |
| | Rewarded: hết Energy thì "watch a rewarded ad to earn back some Energy" hoặc đổi gems (bài 03/07/2025) | (Đ)[L3] |
| | Báo cáo 10-K tự liệt kê rủi ro: người dùng có thể dùng ít đi nếu thấy trải nghiệm kém vì "frequency, prominence, format, size and quality" của ads | (Đ)[L1] |
| **Quizlet** | "To keep Quizlet free, we run ads on our website and apps"; cấm các nhóm ads: người lớn, thuốc lá, rượu, ma tuý, hẹn hò, cờ bạc, vũ khí…; có quy trình báo ads xấu | (Đ)[L5] |
| | Ads hiện trong chế độ Test của bản Free | (T)[L8] |
| **Busuu** | Free có ads; Premium và Premium Plus "No ads" | (Đ)[L6]; vị trí cụ thể (?) |
| **Memrise** | Mô tả trên App Store: Free Plan có "Ads", Pro "Ad free" | (Đ)[L7]; vị trí cụ thể (?) |

### 3.3 Áp vào các màn của Wordmet (S)

Không phải đề xuất chọn; chỉ đối chiếu màn hình dự kiến với các quy tắc trên.

| Màn hình Wordmet | Quy tắc liên quan | Đánh giá (S) |
|---|---|---|
| Đang lật flashcard, đang làm câu luyện | Banner không đặt trên màn chạm liên tục, sát nút (Đ)[M6]; interstitial cấm khi đang làm việc (Đ)[M4] | Rủi ro click nhầm cao nhất |
| Màn tổng kết sau phiên ôn hoặc phiên luyện | Điểm nghỉ tự nhiên, hiện trước nút "Tiếp tục" (Đ)[M5]; giống "cuối mỗi bài" của Duolingo (Đ)[L1] | Vị trí hợp quy tắc nhất cho interstitial |
| Danh sách từ, danh sách nhóm, trang tra từ | Native phải gắn nhãn "Ad" (Đ)[M8]; banner không sát nút (Đ)[M6] | Có thể dùng banner hoặc native; nội dung riêng của người học nằm ở đây (xem mục 8.4) |
| Hết 3 phiên luyện Free trong ngày | Rewarded là opt-in (Đ)[M2]; Unity ghi 38,1% người dùng xem ads khi đặt "theo ngữ cảnh", ví dụ khi hết tài nguyên (T)[R5] | Chỗ tự nhiên cho "xem ads để được thêm một phiên" |
| Đăng nhập, đăng ký, thanh toán, cài đặt, màn lỗi, màn trống | Màn không có nội dung / dead end (Đ)[G10] | Không đặt ads |
| Thêm nhanh từ (quick-add, đang điền form) | Cấm interstitial khi đang điền form (Đ)[M4] | Không đặt interstitial |
| Nhắc ôn (notification) | Apple cấm ads trong notification (Đ)[A1] | Không đặt ads |
| Mở app | Interstitial cấm; app open được phép (Đ)[M4] | Trong app học, app open chen vào đúng lúc người học định ôn (S) |

---

## 4. Tần suất và trải nghiệm

**Giới hạn cứng từ chính sách**

- AdMob: tối đa một interstitial sau mỗi hai thao tác; không hai interstitial liền nhau (Đ)[M4].
- AdMob có **frequency cap** (giới hạn số lần một người thấy ads): đặt theo app (áp cho mọi interstitial, rewarded, app open) và theo ad unit;
  cái nào chạm trước thì áp; áp cho cả mạng khác qua mediation; đổi có thể mất 24 giờ; đôi khi vượt cap một chút do trễ server. Con số duy nhất
  trên trang là ví dụ "no more than 2 impressions per 30 minutes", **không phải khuyến nghị** (Đ)[M9].
- AdMob "high-engagement ads" (bật mặc định): interstitial bỏ qua được muộn nhất 12 giây, rewarded 60 giây, tối đa 3 bước để thoát, app open 5
  giây. Tắt: interstitial 5 giây, rewarded 30 giây, 2 bước, app open 2 giây (Đ)[M10]. Theo đoạn trích, còn một công tắc cấp tài khoản để tắt
  video không bỏ qua được trong interstitial, chỉ áp cho AdMob Network (T)[M26].
- Google Play: cấm interstitial toàn màn hình hiện bất ngờ; cấm loại không đóng được sau 15 giây, trừ loại người dùng tự chọn hoặc không cắt
  ngang thao tác; rewarded opt-in không thuộc quy định này; ads cản việc dùng app phải đóng được dễ dàng (Đ)[P1].
- Web: Coalition for Better Ads (dựa trên nghiên cứu với hơn 150.000 người) xếp dưới ngưỡng chấp nhận trên mobile web: pop-up, prestitial (ads
  trước khi vào nội dung), mật độ ads trên 30%, ads nhấp nháy, video tự phát có tiếng, postitial có đếm ngược, ads cuộn phủ toàn màn hình,
  sticky lớn (Đ)[R4].
- Việt Nam: xem mục 5.6 (tắt bằng một lần chạm; ảnh tĩnh không chờ; video tối đa 5 giây) (T)[V2].

**Số liệu về ảnh hưởng tới việc giữ chân người dùng (retention)**

| Nguồn | Thiết kế | Kết quả | Độ tin |
|---|---|---|---|
| Pandora (Huang, Reiley, Riabov và cộng sự) (Đ)[R1] | Gần 35 triệu người, 9 nhóm mức ads và 1 nhóm đối chứng, chia ngẫu nhiên, 06/2014–04/2016 | Mỗi ads thêm mỗi giờ: thời gian nghe giảm 2,082%, số ngày nghe giảm 1,911%, xác suất còn nghe tháng cuối giảm khoảng 0,92%, xác suất thành người trả tiền tăng 0,14 điểm phần trăm. Tác động dài hạn gấp khoảng 3 lần con số đo trong một tháng; cần 12–15 tháng mới ổn định | Cao (thí nghiệm ngẫu nhiên), nhưng là radio âm thanh, không phải app học (S) |
| ironSource / Tapjoy trên blog Unity (Đ, số của vendor)[R2] | 8 app nhiều người dùng, không nêu tên | Người xem 1 rewarded trong tuần đầu: retention ngày 30 từ 50% trở lên, so với mốc chung 13%; số phiên tăng trung bình 34%; khả năng mua lần đầu cao gấp khoảng 4,5 lần | Thấp: chỉ là tương quan (người thích app hơn thì xem ads nhiều hơn), không có nhóm đối chứng, vendor tự đăng |
| ironSource trên blog Unity (Đ, số của vendor)[R3] | Không công bố cỡ mẫu | Game hyper-casual: interstitial giữa màn "không ảnh hưởng đáng kể" tới retention ngày 7, 14; game casual trở lên nên đợi ít nhất hai tuần mới hiện interstitial đầu tiên; người đã trả tiền nên được loại khỏi interstitial | Thấp, bối cảnh game |
| Blog của vendor (T)[R6] | Không có phương pháp | Ví dụ: hơn 1 interstitial mỗi 2 phút làm retention ngày 7 giảm tới 20% | Rất thấp, không có nguồn gốc |

**Đọc số liệu (S):** không tìm thấy khuyến nghị chính thức nào ghi "bao nhiêu interstitial một ngày" (Google chỉ cho ví dụ). Nguồn chặt chẽ
duy nhất (Pandora) cho thấy hại của ads lớn dần theo thời gian và dễ bị đánh giá thấp nếu chỉ đo vài tuần. Các vendor đều khuyên tự A/B test
(chia ngẫu nhiên người dùng, so retention và doanh thu) ít nhất khoảng hai tuần (Đ)[R3].

**Các kiểu giới hạn có thể chọn cho "không quá nhiều"** (S, chưa chọn):

| Kiểu | Ví dụ | Đổi lại |
|---|---|---|
| Theo sự kiện | Chỉ một interstitial ở màn tổng kết, không quá 1 lần mỗi phiên | Dễ hiểu, khớp quy tắc "điểm nghỉ"; số ads phụ thuộc người học làm bao nhiêu phiên |
| Theo thời gian | Tối đa N interstitial mỗi ngày, cách nhau ít nhất M phút | Dễ dự đoán; cần đếm theo ngày của người dùng |
| Thời gian ân hạn | Không ads trong K ngày đầu hoặc K phiên đầu | Bảo vệ lúc người mới dễ bỏ app nhất; mất doanh thu sớm |
| Chỉ rewarded | Không interstitial, không banner; chỉ "xem ads để được thêm phiên" | Ít phiền nhất; doanh thu thấp nhất và phụ thuộc người dùng tự chọn |

---

## 5. Chính sách và pháp lý

### 5.1 Trẻ em: Google Play Families, AdMob, Apple Kids, COPPA

- **Google Play Families:** nếu app hiện ads cho trẻ em hoặc người chưa rõ tuổi thì chỉ dùng SDK ads tự chứng nhận cho Families; app chỉ dành
  cho trẻ em không được gửi định danh như Android advertising ID (AAID); ads phải hợp với trẻ em; không cá nhân hoá, không remarketing với trẻ
  em; ads phải phân biệt rõ với nội dung; app cho trẻ em không được hiện interstitial ngay khi mở app; **app cho nhiều lứa tuổi phải có màn
  hỏi tuổi trung lập** để trẻ em chỉ thấy ads không cá nhân hoá (Đ)[P2].
- **Danh sách SDK tự chứng nhận** (Đ)[P3]: có AdMob 19.0.0+, Google Ad Manager (IMA, PAL), Unity Ads 4.0.1+, ironSource 7.2.1+, InMobi,
  Vungle, Chartboost, DT Exchange, AdColony, HyprMX, Kidoz, SuperAwesome, AddApptr. **Không có** Meta Audience Network, Pangle; AppLovin đã rời.
- **AdMob cho app nhiều lứa tuổi:** đánh dấu yêu cầu ads dành cho trẻ em (`setTagForChildDirectedTreatment(true)`) và đặt mức nội dung ads tối
  đa `G` cho trẻ em hoặc người chưa rõ tuổi; AdMob chặn mạng chưa tự chứng nhận cho các yêu cầu đó; dùng SDK Android 20.6.0+ / iOS 7.67.0+ để
  không gửi advertising ID với yêu cầu dành cho trẻ em (Đ)[M14]. Trong plugin Flutter, `tagForChildDirectedTreatment` và
  `tagForUnderAgeOfConsent` đã deprecated, thay bằng `ageRestrictedTreatment`; `maxAdContentRating` nhận `g`, `pg`, `t`, `ma` (Đ)[M15].
- **Thiếu niên:** Google tắt cá nhân hoá ads và chặn nhóm nội dung nhạy cảm với tài khoản Google từ tuổi được tự đồng ý trên mạng (digital age
  of consent) tới dưới 18 tuổi (T, đoạn trích)[M27]; áp cho AdMob
  tới đâu thì các trang không thống nhất (T)[M27].
- **Apple:** app trong mục Kids "should not include third-party analytics or third-party advertising"; ngoại lệ hẹp cho ads theo ngữ cảnh có
  người duyệt nội dung ads (1.3, 5.1.4) (Đ)[A1].
- **COPPA (Mỹ):** áp cho website/app hướng tới trẻ dưới 13 tuổi, hoặc biết thực tế là đang thu dữ liệu của trẻ dưới 13; định danh lâu dài
  (cookie, IP, ID thiết bị) là dữ liệu cá nhân; quảng cáo theo hành vi có thể cần đồng ý có kiểm chứng của cha mẹ; màn hỏi tuổi phải trung lập
  (không đặt sẵn 13+, không ô "Tôi trên 12 tuổi") (Đ)[C1]. Bản sửa đổi: phải có đồng ý riêng của cha mẹ trước khi chia dữ liệu trẻ em cho bên
  thứ ba để quảng cáo nhắm mục tiêu; hạn tuân thủ một năm sau khi đăng công báo (Đ)[C2], tức 22/04/2026 theo bên thứ ba (T)[C3]. Wordmet nhắm
  người học Việt Nam nên COPPA chỉ liên quan nếu có trẻ em ở Mỹ dùng (S).
- **Việt Nam:** trẻ em là người dưới 16 tuổi (Luật Trẻ em 2016) (T)[V7]. Luật Bảo vệ dữ liệu cá nhân 2025, Điều 24: người đại diện theo pháp
  luật thực hiện quyền thay trẻ; trẻ từ đủ 7 tuổi phải đồng ý cùng người đại diện khi xử lý dữ liệu để công khai đời sống riêng tư (T)[V5].
  Nghị định 356/2025 quy định chi tiết về trẻ em thế nào thì chưa đọc được (?).

### 5.2 Apple: App Tracking Transparency (ATT) và SKAdNetwork

- "Tracking" = nối dữ liệu từ app với dữ liệu của app, web của công ty khác để quảng cáo nhắm mục tiêu hoặc đo hiệu quả quảng cáo, hoặc chia
  dữ liệu cho data broker. Từ iOS 14.5 phải xin phép qua ATT mới được theo dõi hoặc đọc advertising identifier. Gắn một SDK bên thứ ba có nối
  dữ liệu như vậy cũng tính là tracking (Đ)[A2].
- **Không được khoá tính năng hay thưởng** để người dùng đồng ý tracking (5.1.2(i)) (Đ)[A2][A1]. Hệ quả (S): không được gắn "đồng ý ATT" với
  phần thưởng như thêm phiên luyện.
- Google: thêm `NSUserTrackingUsageDescription`, gọi hộp xin phép ATT, nên chờ kết quả rồi mới nạp ads; thêm danh sách mã SKAdNetwork của Google
  (và của từng mạng mediation) vào `Info.plist` để ghi nhận cài đặt khi không có IDFA (Đ)[M21]. Trang tài liệu ATT của Apple cần JavaScript,
  không đọc được (?)[A3].

### 5.3 Consent cho người dùng EU (GDPR, TCF, UMP)

- Chính sách đồng ý của Google áp cho người dùng EEA, Anh, Thuỵ Sĩ: phải xin đồng ý cho cookie/local storage (khi luật đòi) và cho việc dùng
  dữ liệu để cá nhân hoá ads; lưu bằng chứng đồng ý; chỉ cách rút lại; nêu tên từng bên nhận dữ liệu (Đ)[C4].
- Từ 16/01/2024 (EEA, Anh) và 31/07/2024 (Thuỵ Sĩ), muốn hiện ads cá nhân hoá phải dùng CMP (công cụ xin đồng ý) được Google chứng nhận và gắn
  với IAB TCF; không có thì không được hiện ads cá nhân hoá (Đ)[M23]. Danh sách CMP chứng nhận có mục "Google LLC", CMP ID 300 (T, đoạn trích)[M24].
- UMP (User Messaging Platform) cho Flutter: gọi `requestConsentInfoUpdate()` mỗi lần mở app, `loadAndShowConsentFormIfRequired()`, kiểm
  `canRequestAds()` trước khi xin ads; nếu thông điệp yêu cầu thì phải có nút cho người dùng sửa lựa chọn bất cứ lúc nào (Đ)[M16].
- Ads không cá nhân hoá vẫn dùng cookie hoặc ID quảng cáo cho frequency cap và báo cáo tổng hợp; nơi luật đòi thì vẫn cần đồng ý (Đ)[M22].

### 5.4 Việt Nam: dữ liệu cá nhân và theo dõi để quảng cáo

- **Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15**, hiệu lực 01/01/2026 (T)[V8]. Điều 28 (dữ liệu cá nhân trong kinh doanh dịch vụ quảng cáo,
  theo trang tra cứu bên thứ ba) (T)[V4]: xử lý dữ liệu khách hàng để quảng cáo phải có sự đồng ý, khách hàng phải biết nội dung, phương thức,
  hình thức, tần suất; phải có cách để từ chối nhận quảng cáo và yêu cầu ngừng; **quảng cáo theo hành vi hoặc cá nhân hoá chỉ được thu dữ liệu
  qua theo dõi website, app khi có đồng ý**, phải cho từ chối chia sẻ, đặt thời hạn lưu và xoá khi hết cần.
- **Nghị định 356/2025/NĐ-CP thay Nghị định 13/2023** từ 01/01/2026 (T)[V6]. Theo bài phân tích (T)[V6]: đồng ý phải gắn mục đích cụ thể, không
  được đặt sẵn đồng ý mặc định, bên kiểm soát dữ liệu phải chứng minh đã có đồng ý; dữ liệu theo dõi hành vi, thói quen dùng dịch vụ trên không
  gian mạng được xếp vào dữ liệu **nhạy cảm**; chuyển dữ liệu ra nước ngoài cần hồ sơ đánh giá tác động và thông báo Bộ Công an; có thời hạn trả
  lời yêu cầu rút đồng ý (2 ngày làm việc, thực hiện trong 15 ngày).
- Hệ quả (S): SDK ads gửi IP, tương tác, ID thiết bị về Google ở nước ngoài (Đ)[M20] → có thể bị xem là theo dõi hành vi và chuyển dữ liệu ra
  nước ngoài. UMP chỉ có thông điệp cho EEA/Anh/Thuỵ Sĩ và các bang của Mỹ (Đ)[M16]; không thấy loại thông điệp cho Việt Nam (?). Cần hỏi
  chuyên gia pháp lý trước khi bật ads cá nhân hoá cho người dùng Việt Nam.

### 5.5 Google Play: Advertising ID

App nhắm Android 13+ phải khai báo quyền `com.google.android.gms.permission.AD_ID`; SDK ads như `play-services-ads` thường tự khai báo và quyền
này nhập vào manifest của app theo mặc định; dùng advertising ID thay mọi định danh thiết bị khác cho mục đích quảng cáo (Đ)[P4]. Có thể chặn
việc thu AAID bằng sửa manifest; tính năng "Limited Ads" cũng có thể ngừng gửi ad ID (Đ)[M20].

### 5.6 Việt Nam: Luật Quảng cáo và Nghị định 342/2025

- **Luật số 75/2025/QH15** sửa Luật Quảng cáo, hiệu lực 01/01/2026 (Đ)[V1]. Điều 23 mới (quảng cáo trên mạng) áp cho cả "ứng dụng trực tuyến" (Đ)[V1]:
  - phải có dấu hiệu nhận diện rõ bằng chữ, số, ký hiệu, hình ảnh, âm thanh để phân biệt quảng cáo với nội dung khác;
  - "Đối với những quảng cáo không ở vùng cố định, phải có tính năng, biểu tượng dễ nhận biết cho phép người tiếp nhận quảng cáo tắt quảng cáo",
    báo nội dung vi phạm và từ chối xem quảng cáo không phù hợp;
  - không đặt quảng cáo "trong, bên cạnh, liền sau hoặc trước nội dung vi phạm pháp luật";
  - gỡ quảng cáo vi phạm chậm nhất 24 giờ khi cơ quan có thẩm quyền yêu cầu;
  - phải đăng ký, kê khai, nộp thuế với doanh thu từ dịch vụ quảng cáo.
  - Chủ trang thông tin điện tử thuộc định nghĩa "người phát hành quảng cáo" (Điều 2, khoản 7) (Đ)[V1]; chủ app có thuộc nhóm này không thì
    luật dùng cụm "tổ chức, cá nhân sử dụng người, phương tiện quảng cáo khác" (Đ)[V1] → nhiều khả năng có (S).
- **Nghị định 342/2025/NĐ-CP**, ban hành 26/12/2025, hiệu lực 15/02/2026, Điều 17 (T, trang tra cứu bên thứ ba và bài của cổng tỉnh Hà Tĩnh,
  hai nguồn khớp nhau)[V2][V3]:
  - "quảng cáo không ở vùng cố định" = hiện ở vị trí, thời điểm không cố định trên giao diện, che nội dung chính, làm gián đoạn việc tiếp cận thông tin;
  - tắt được chỉ với **một lần tương tác**; cấm nút tắt giả hoặc khó nhận ra;
  - **ảnh tĩnh: không có thời gian chờ tắt; video hoặc chuỗi hình chuyển động: chờ tối đa 05 giây**;
  - phải có biểu tượng và hướng dẫn để người dùng báo quảng cáo vi phạm, từ chối hoặc tắt quảng cáo không phù hợp; phải tiếp nhận, xử lý kịp
    thời và báo kết quả cho người dùng.
- Đối chiếu với AdMob (S): interstitial video với "high-engagement ads" bật (mặc định) bắt chờ tới 12 giây, vượt mức 5 giây; tắt thì còn 5 giây
  (Đ)[M10]. Rewarded khi tắt vẫn tới 30 giây (Đ)[M10]. Interstitial ảnh tĩnh của AdMob có hiện nút đóng ngay không thì (?). Luật Quảng cáo áp
  cho người dùng ở Việt Nam; Google Play (15 giây) và Apple là chính sách store, áp ở mọi nước (S).

---

## 6. Doanh thu tham khảo

Không tìm thấy nguồn chính thức nào công bố eCPM theo nước. Mọi con số dưới đây là thứ cấp và lệch nhau nhiều.

| Số liệu | Giá trị | Phạm vi, thời gian | Nguồn |
|---|---|---|---|
| Interstitial, Việt Nam, app | 0,72 USD (01/2024) đến 1,51 USD (12/2024); phần lớn các tháng 1,1–1,4 USD | Tổng hợp từ "500+ mobile app publishers", bảng ghi năm 2024 | (T)[E1] |
| App open, Việt Nam | 2,34 USD (09/2024), 2,17 USD (12/2024) | Interstitial và app open của tập publisher AnyMind | (T, đoạn trích)[E5] |
| Châu Á, Android | Rewarded khoảng 2 USD; interstitial 1,91 USD; banner 0,15 USD | Appodeal, 100.000+ app, H2 2021 – H1 2022 | (T)[E2] |
| Châu Á, iOS | Rewarded 5,86 USD; interstitial 4,18 USD; banner 0,11 USD | Như trên | (T)[E2] |
| "AdMob eCPM", Việt Nam | 0,25 USD, không ghi định dạng | Không rõ thời gian | (T)[E4] |
| Thứ hạng định dạng | Rewarded cao nhất, rồi interstitial, banner thấp nhất; iOS cao hơn Android; Android tương đối tốt ở APAC | Appodeal, 10–12/2024, 100.000+ app; bản PDF không có số theo nước ở dạng chữ | (Đ)[E3] |
| Mỹ (để so sánh) | Rewarded 30,25 USD (iOS); interstitial 19,62 USD | Tenjin Q1 2024, game | (T)[E7] |
| Web (YouTube) Việt Nam | RPM khoảng 0,22 USD mỗi 1.000 lượt xem | YouTube, không phải ads trên web | (T, đoạn trích)[E6] |

Duolingo không tách riêng doanh thu ads: năm 2025 nhóm "Other" (chủ yếu ads, Duolingo English Test, mua trong app) là 164,1 triệu USD trên tổng
1.037,6 triệu USD (Đ)[L1].

**Ước lượng minh hoạ (S, mọi giả định là `ASSUMPTION`):** 1.000 người Free hoạt động mỗi ngày; giả định mọi yêu cầu ads đều có ads (thực tế thấp hơn).

| Cách đặt | Giả định | Mỗi ngày | Mỗi tháng (30 ngày) |
|---|---|---|---|
| 1 interstitial cuối phiên | 1.000 lượt × 1,0–1,5 USD/1.000 | 1,0–1,5 USD | 30–45 USD |
| Banner trên 3 màn danh sách | 9.000 lượt × 0,15 USD/1.000 | khoảng 1,35 USD | khoảng 40 USD |
| Rewarded "thêm phiên" | 20% người xem 1 lần × 2 USD/1.000 | 0,40 USD | khoảng 12 USD |

Nghĩa là cỡ vài chục USD mỗi tháng cho mỗi 1.000 người Free hoạt động mỗi ngày; với ngưỡng trả 100 USD (Đ)[G3][M11], quy mô này nhận tiền khoảng
mỗi 1–3 tháng (S). Chưa trừ thuế Mỹ khấu trừ trên phần doanh thu từ người mua ở Mỹ (Đ)[G6] và thuế Việt Nam (Đ)[V1].

---

## 7. Ads-free như quyền lợi của gói trả phí

| App | Cách trình bày | Nguồn |
|---|---|---|
| Duolingo Super | Quyền lợi đầu tiên trong danh sách: "No ads: Learn without interruptions", đi cùng Unlimited Hearts, Personalized Practice… | (Đ)[L2] |
| Duolingo (10-K) | "learners who purchase one of our paid subscriptions enjoy an ad-free experience" | (Đ)[L1] |
| Duolingo Plus (04/2017) | Gói trả phí đầu tiên chỉ có hai quyền lợi: không ads và học offline; CEO nói làm vì nhiều người dùng xin | (T)[L4] |
| Busuu | Bảng so sánh: dòng "No ads" — Free không có, Premium và Premium Plus có | (Đ)[L6] |
| Quizlet | Người có Plus không thấy ads bên thứ ba; giáo viên có Plus thì học sinh trong lớp (đã đăng nhập) cũng không thấy | (Đ)[L5] |
| Memrise | "Ad free" nằm trong danh sách quyền lợi Pro; Free ghi "Ads" | (Đ)[L7] |

**Dữ liệu về việc ads đẩy người dùng lên gói trả phí**

- Pandora (thí nghiệm ngẫu nhiên): mỗi ads thêm mỗi giờ làm xác suất là người trả tiền cuối thí nghiệm tăng 0,14 điểm phần trăm, đồng thời tỷ
  lệ bỏ dịch vụ tăng 0,34 điểm phần trăm (Đ)[R1]. Tức là thêm ads đẩy được một ít người lên gói trả phí nhưng đẩy nhiều người hơn rời đi (S).
- ironSource/Tapjoy: người xem rewarded có khả năng mua lần đầu cao gấp khoảng 4,5 lần, nhưng chỉ là tương quan (Đ, số của vendor)[R2].
- Không tìm thấy số liệu công khai nào về việc **riêng** quyền lợi "không ads" làm tăng tỷ lệ nâng cấp trong app học (?). Các app học đều gộp
  "không ads" với quyền lợi khác (Đ)[L2][L6]; Duolingo năm 2017 thì bán riêng "không ads + offline" (T)[L4].
- Hệ quả (S): trial của Wordmet không có ads, nên khi trial hết và người dùng về Free họ mới thấy ads lần đầu; đây là lúc "không ads" thành
  quyền lợi rõ ràng nhất, cũng là lúc dễ làm người dùng khó chịu nhất.

---

## 8. Hệ quả cho thiết kế backend của Wordmet

Bước 5 chỉ làm API; gắn SDK ads vào web và Flutter thuộc đợt giao diện. Bối cảnh trong brainstorm log: `EntitlementsService.check(userId,
feature)` đang luôn trả `{ allowed: true }`; quyền tính theo từng tính năng (không có cờ `is_pro` chung); các con số là cài đặt `admin` chỉnh được,
có version và lịch sử. Mọi phương án dưới đây là (S) trừ chỗ ghi nguồn; **chưa chọn** (luật Bước 3+: chủ dự án trả lời trước).

### 8.1 Ai quyết định "người này có thấy ads không"

| Phương án | Cách làm | Được | Mất |
|---|---|---|---|
| A. Thêm một quyền theo tính năng | Ví dụ quyền "không ads": trial, Pro có; Free không; cấp tay được. API trả cờ trong phần thông tin quyền của người dùng | Khớp nguyên tắc "theo tính năng"; cấp tay "Pro 30 ngày" tự kéo theo không ads | Phải quyết định khi một người có nhiều nguồn quyền (Câu 16 đang bàn) |
| B. App tự suy ra từ tên gói | API chỉ trả `free` / `trial` / `pro`; app tự hiểu Free = có ads | Ít việc nhất ở backend | Gắn app vào tên gói; đổi luật (ví dụ tặng một tuần không ads) phải phát hành lại app |
| C. API trả cấu hình ads đầy đủ | Cờ + các giới hạn tần suất + bật tắt từng vị trí, có công tắc tắt ads toàn hệ thống | Đổi tần suất không cần phát hành app; tắt nhanh khi có sự cố hoặc yêu cầu của cơ quan quản lý | Nhiều việc nhất; thêm cài đặt admin |

Trường hợp biên cần ghi dù chọn phương án nào: trial hết giữa phiên; Pro mua trên store mà thông báo về server trễ; hoàn tiền; app mobile offline
dùng cờ đã lưu (nên mặc định "có ads" hay "không ads" khi chưa biết); người dùng chưa rõ tuổi (mục 8.5).

### 8.2 Chặn tần suất ở đâu

| Phương án | Được | Mất |
|---|---|---|
| Chỉ phía client (frequency cap của AdMob + bộ đếm trong app) | Không tốn việc backend; AdMob có sẵn cap theo app và ad unit (Đ)[M9] | Chỉ đúng trên từng thiết bị; web không có công cụ tương đương trong các trang đã đọc (?); cap AdMob đổi mất tới 24 giờ (Đ)[M9] |
| Phía server | Một con số cho cả web và mobile; admin chỉnh được | App phải báo về mỗi lần hiện ads (thêm request, và vẫn phải tin app); đếm theo ngày của người dùng |
| Lai | Server trả con số giới hạn (cài đặt admin), app tự đếm; cap AdMob làm chốt chặn cuối | Hai nơi giữ luật, dễ lệch nhau |

### 8.3 Rewarded: "xem ads để thêm một phiên luyện"

| Phương án | Được | Mất |
|---|---|---|
| Không dùng rewarded | Đơn giản; khỏi đụng hạn mức Bước 5 và câu hỏi 5 giây ở Việt Nam (mục 5.6) | Mất định dạng eCPM cao nhất (T)[E2] |
| Tin callback phía app | Dễ: app báo "đã xem xong", API cộng một phiên | Dễ bị gọi giả để lấy phiên miễn phí |
| AdMob SSV (server-side verification) | Google gọi thẳng về server khi người dùng được thưởng, kèm `user_id`, `custom_data`, `transaction_id` duy nhất, chữ ký ECDSA và `key_id`; server kiểm chữ ký bằng khoá công khai lấy từ máy chủ khoá AdMob (lưu cache tối đa 24 giờ), không được sửa nội dung callback, trả HTTP 200; không 200 thì Google gửi lại tối đa 5 lần, cách nhau 1 giây (Đ)[M17] | Cần một endpoint công khai mới; callback có thể đến trễ, Google khuyên thưởng ngay ở app rồi kiểm sau, hoặc chờ server nếu phần thưởng quan trọng (Đ)[M17] |

Ghi chú (S): `transaction_id` cho sẵn khoá chống cộng hai lần, hợp với quy ước `Idempotency-Key` của dự án; phiên thưởng có thể là một nguồn hạn mức
riêng có trần mỗi ngày (liên quan Câu 16). Chính sách AdMob bắt **phải** trao thưởng khi người dùng đã xem xong (Đ)[M2], nên nếu chờ SSV mà server
từ chối thì có rủi ro chính sách. Một phiên luyện là phần thưởng không phải tiền, chỉ dùng trong app, không chuyển nhượng, hợp quy định (Đ)[M2].
Web: rewarded của Google Publisher Tag báo "đã được thưởng" bằng sự kiện phía trình duyệt (`RewardedSlotGrantedEvent`) (Đ)[G14]; không thấy cơ chế
xác minh phía server tương đương (?).

### 8.4 Giữ dữ liệu học và dữ liệu cá nhân khỏi SDK ads

- SDK AdMob tự thu và gửi: IP (dùng ước lượng vị trí), tương tác (mở app, chạm, xem video), thông tin chẩn đoán, Android advertising ID, app set
  ID; có thể chặn ad ID qua manifest (Đ)[M20]. Từ SDK iOS 10.14.0, "publisher first-party ID" bật mặc định, tắt được (Đ)[M21].
- `AdRequest` cho phép truyền `keywords` ("Words or phrases describing the current user activity"), `contentUrl`, `neighboringContentUrls`
  (Đ)[M19]. Không truyền các trường này thì SDK không nhận từ đang học hay câu ngữ cảnh từ phía app (S).
- `user_id` và `custom_data` của SSV đi qua Google (Đ)[M17]: dùng mã ngẫu nhiên, không dùng email hay id thật của người dùng (S).
- Web AdSense: ads theo ngữ cảnh dựa trên nội dung trang; trang sau đăng nhập phải cấp cho crawler một tài khoản đăng nhập (Đ)[G11]. Nếu trang
  có từ riêng, câu ngữ cảnh của người học thì crawler đọc được (S). Phương án: chỉ đặt ads web ở trang không có nội dung riêng, hoặc không có ads web.
- Luật Quảng cáo cấm đặt quảng cáo cạnh nội dung vi phạm pháp luật (Đ)[V1]; từ riêng và câu ngữ cảnh do người học tự nhập (S) → lý do thứ hai
  để tránh ads trên màn có nội dung người dùng tạo.
- Đồng ý (consent): Luật 2025 Điều 28 và Nghị định 356 (T)[V4][V6]. Phương án: (a) chỉ ads không cá nhân hoá cho mọi người
  (`nonPersonalizedAds` trong `AdRequest`) (Đ)[M19], nhưng vẫn dùng ID cho frequency cap (Đ)[M22], eCPM thấp hơn bao nhiêu thì (?); (b) màn xin
  đồng ý riêng, API lưu bằng chứng đồng ý theo mục đích, có version, rút lại được; (c) UMP cho EU, phần Việt Nam tự làm.

### 8.5 Tuổi và cờ "trẻ em"

Bảng `users` chưa có ngày sinh (ghi chú DB1 trong CLAUDE.md của dự án). Nếu cho trẻ em dùng, API cần biết người dùng thuộc nhóm nào để app gắn
cờ `ageRestrictedTreatment` / mức nội dung `G` (Đ)[M15][M14], hoặc không hiện ads. Phương án (S): (a) tuổi tối thiểu đủ cao để khỏi xử lý trẻ em;
(b) lưu năm sinh hoặc khoảng tuổi lúc đăng ký (màn hỏi tuổi trung lập (Đ)[P2][C1]), API trả thêm cờ "ads cho trẻ em"; (c) không ads cho người
chưa xác định tuổi.

### 8.6 Báo cáo quảng cáo vi phạm

Apple bắt app có ads phải cho người dùng báo ads không phù hợp (Đ)[A1]; Nghị định 342 bắt có biểu tượng báo vi phạm, tiếp nhận, xử lý kịp thời và
báo kết quả (T)[V2]. AdChoices của SDK có đáp ứng phần "tiếp nhận và báo kết quả" không thì (?). Phương án (S): (a) dựa vào công cụ của SDK;
(b) API nhận báo cáo (ảnh chụp hoặc mô tả, giống quy trình của Quizlet (Đ)[L5]), admin xem và trả lời.

### 8.7 Nằm trong Bước 5 hay để sau

| Phần | Cần ngay khi có ads? |
|---|---|
| Cờ "có hiện ads không" (8.1) | Có, nếu chọn ads |
| Giới hạn tần suất phía server (8.2) | Chỉ khi chọn phương án server hoặc lai |
| Endpoint SSV (8.3) | Chỉ khi rewarded cấp phần thưởng thật |
| Lưu đồng ý quảng cáo (8.4) | Chỉ khi hiện ads cá nhân hoá |
| Nhóm tuổi (8.5) | Tuỳ quyết định tuổi tối thiểu |
| Tiếp nhận báo cáo ads (8.6) | Tuỳ cách đọc Nghị định 342 |

---

## 9. Câu hỏi còn mở và trang không đọc được

**Câu hỏi cho chủ dự án hoặc cần chuyên gia**

1. Tuổi tối thiểu của người học (chặn các quyết định ở 5.1 và 8.5).
2. Quy định 5 giây của Nghị định 342 có áp cho rewarded (người dùng tự chọn xem) không; AdMob rewarded bắt chờ tới 30 giây kể cả khi tắt
   high-engagement (Đ)[M10]. Cần người đọc luật.
3. Interstitial ảnh tĩnh của AdMob có cho đóng ngay (không chờ) như Nghị định yêu cầu không (?).
4. Người dùng Việt Nam: ads cá nhân hoá (cần đồng ý, có thể là dữ liệu nhạy cảm) hay chỉ ads không cá nhân hoá.
5. Nghĩa vụ thuế ở Việt Nam với doanh thu ads (Luật 75/2025 Điều 23 khoản 3a (Đ)[V1]); cá nhân hay hộ kinh doanh / doanh nghiệp đứng tên tài
   khoản AdSense/AdMob. Cần tư vấn thuế.
6. Đường nhận tiền về Việt Nam: chưa đọc được dòng Việt Nam trong bảng phương thức của AdSense/AdMob (chỉ có đoạn trích của bảng AdSense for
   YouTube) (T)[G5].
7. Có đặt ads trên web không, khi trang học sau đăng nhập và có nội dung riêng của người học (8.4).

**Không tìm thấy**

- eCPM rewarded và banner riêng cho Việt Nam; mọi số theo nước đều thứ cấp.
- Tỷ lệ chia doanh thu chính thức của AdMob.
- Hướng dẫn chính thức của Google cho AdSense trên SPA / Next.js App Router.
- Số liệu riêng về "không ads" làm tăng nâng cấp trong app học.
- Điều kiện duyệt và trả tiền chính thức của Meta Audience Network, Unity, AppLovin cho người ở Việt Nam.
- eCPM thấp hơn bao nhiêu khi chỉ dùng ads không cá nhân hoá.
- Cơ chế xác minh phía server cho rewarded trên web.

**Trang không đọc được hoặc chỉ đọc được một phần**

- Tài liệu ATT của Apple (`developer.apple.com/documentation/apptrackingtransparency`): cần JavaScript, chỉ thấy tiêu đề [A3].
- Bảng phương thức trả tiền AdSense [G4]: phần đọc được không có dòng Việt Nam.
- Trang AdMob tạo interstitial ad unit [M26]: bản đọc bằng trình duyệt không còn câu về video không bỏ qua được; chỉ có đoạn trích tìm kiếm.
- Trang thời điểm trả tiền AdMob [M13], chính sách "ads nhiều hơn nội dung" [G17], danh sách CMP chứng nhận [M24], Offerwall [G16], bảo vệ
  thiếu niên [M27]: chỉ có đoạn trích tìm kiếm.
- `support.google.com/googleplay/android-developer/answer/12955212`: 404; đã đọc trang danh sách SDK 12955712 thay thế [P3].
- Thư viện Pháp luật (Luật 91/2025) và PwC Việt Nam (Nghị định 356/2025): 403. Toàn văn Nghị định 342/2025 và Nghị định 356/2025 trên Công báo:
  chưa đọc; chỉ có trang tra cứu bên thứ ba [V2][V4][V5][V6].
- Báo cáo Appodeal 2025 [E3] và Gamigion: số theo nước nằm trong ảnh, không đọc được.
- Trang chủ Adtima [N6]: chỉ đọc được tiêu đề.
- Bản sửa đổi COPPA trên Federal Register: chưa đọc; ngày tuân thủ lấy từ bên thứ ba [C3].

---

## Phụ lục: danh mục nguồn

**Google AdSense, Ad Manager, chính sách publisher**

- [G1] (Đ) https://support.google.com/adsense/answer/9724
- [G2] (Đ) https://support.google.com/adsense/answer/180195
- [G3] (Đ) https://support.google.com/adsense/answer/1709871
- [G4] (Đ, thiếu dòng VN) https://support.google.com/adsense/answer/1714398
- [G5] (T, đoạn trích) https://support.google.com/youtube/answer/14728152
- [G6] (Đ) https://support.google.com/adsense/answer/1322037
- [G7] (Đ) https://support.google.com/adsense/answer/14131950
- [G8] (Đ) https://www.irs.gov/businesses/international-businesses/united-states-income-tax-treaties-a-to-z
- [G9] (Đ) https://support.google.com/adsense/answer/1346295
- [G10] (Đ) https://support.google.com/publisherpolicies/answer/11112688
- [G11] (Đ) https://support.google.com/adsense/answer/161351
- [G12] (Đ) https://support.google.com/adsense/answer/12171612
- [G13] (Đ) https://support.google.com/admanager/answer/7084151
- [G14] (Đ) https://developers.google.com/publisher-tag/samples/display-rewarded-ad
- [G15] (T, đoạn trích) https://developers.google.com/publisher-tag/guides/control-ad-loading
- [G16] (T, đoạn trích) https://support.google.com/adsense/answer/12726063 ; (T) https://ppc.land/google-adsense-offerwall-is-generally-available-what-it-means/
- [G17] (T, đoạn trích) https://support.google.com/publisherpolicies/answer/11169917

**Google AdMob, Flutter**

- [M1] (Đ) https://support.google.com/admob/answer/2753860
- [M2] (Đ) https://support.google.com/admob/answer/7313578
- [M3] (Đ) https://support.google.com/admob/answer/6066980
- [M4] (Đ) https://support.google.com/admob/answer/6201362
- [M5] (Đ) https://support.google.com/admob/answer/6201350
- [M6] (Đ) https://support.google.com/admob/answer/6275345
- [M7] (Đ) https://support.google.com/admob/answer/6128877
- [M8] (Đ) https://support.google.com/admob/answer/6329638
- [M9] (Đ) https://support.google.com/admob/answer/6244508
- [M10] (Đ, trình duyệt) https://support.google.com/admob/answer/15525707
- [M11] (Đ) https://support.google.com/admob/answer/2772208
- [M12] (Đ) https://support.google.com/admob/answer/10564477
- [M13] (T, đoạn trích) https://support.google.com/admob/answer/2998394
- [M14] (Đ) https://support.google.com/admob/answer/6223431
- [M15] (Đ) https://developers.google.com/admob/flutter/targeting
- [M16] (Đ) https://developers.google.com/admob/flutter/privacy
- [M17] (Đ) https://developers.google.com/admob/flutter/ssv
- [M18] (Đ) https://pub.dev/packages/google_mobile_ads
- [M19] (Đ) https://pub.dev/documentation/google_mobile_ads/latest/google_mobile_ads/AdRequest-class.html
- [M20] (Đ) https://developers.google.com/admob/android/privacy/play-data-disclosure
- [M21] (Đ) https://developers.google.com/admob/ios/privacy/strategies
- [M22] (Đ) https://support.google.com/admob/answer/7676680
- [M23] (Đ) https://support.google.com/admob/answer/13554020
- [M24] (T, đoạn trích) https://support.google.com/admanager/answer/13554116
- [M25] (Đ) https://developers.google.com/admob/flutter/mediation/meta
- [M26] (T, đoạn trích) https://support.google.com/admob/answer/7311435
- [M27] (T, đoạn trích) https://support.google.com/adspolicy/answer/12205906

**Google Play, Apple**

- [P1] (Đ) https://support.google.com/googleplay/android-developer/answer/9857753
- [P2] (Đ) https://support.google.com/googleplay/android-developer/answer/9893335
- [P3] (Đ) https://support.google.com/googleplay/android-developer/answer/12955712
- [P4] (Đ) https://support.google.com/googleplay/android-developer/answer/6048248
- [A1] (Đ) https://developer.apple.com/app-store/review/guidelines/
- [A2] (Đ) https://developer.apple.com/app-store/user-privacy-and-data-use/
- [A3] (không đọc được) https://developer.apple.com/documentation/apptrackingtransparency

**Mạng quảng cáo khác**

- [N1] (Đ) https://developers.facebook.com/docs/audience-network/
- [N2] (T) https://www.webtonic.io/blog/facebook-audience-network
- [N3] (Đ) https://support.applovin.com/en/max/faq/what-are-applovins-payment-options-policies ; (T, đoạn trích) https://support.applovin.com/en/max/max-dashboard/account/payments
- [N4] (Đ) https://support.unity.com/hc/en-us/articles/211217543-How-do-I-receive-payment-for-my-Ads-revenue ; (T) https://discussions.unity.com/t/the-message-your-balance-does-not-exceed-the-threshold-of-100-usd-but-this-is-not-so/753587
- [N5] (Đ) https://admicro.vn/ ; https://publisher.admicro.vn/
- [N6] (chỉ tiêu đề) https://adtima.vn/ ; (T) https://zalo.careers/job/product-specialist-adtima-publisher-strategy-monetization-n-QA37EkgAdGEp4c81
- [N7] (T) https://adsterra.com/blog/ad-network-la-gi/

**Web, Next.js, Cloudflare**

- [W1] (T) https://sia.hackernoon.com/how-a-small-nextjs-routing-change-boosted-my-google-adsense-revenue
- [W2] (T) https://dev.to/vibeberry/how-we-integrated-google-adsense-into-a-nextjs-app-router-project-the-right-way-4540
- [W3] (T) https://meta.discourse.org/t/adsense-auto-ads/94104
- [W4] (T) https://www.drupal.org/node/1301992

**App học**

- [L1] (Đ) https://www.sec.gov/Archives/edgar/data/1562088/000162828026012494/duol-20251231.htm
- [L2] (Đ, trình duyệt) https://www.duolingo.com/help/super-duolingo
- [L3] (Đ) https://blog.duolingo.com/duolingo-energy/
- [L4] (T) https://techcrunch.com/2017/04/21/duolingo-launches-paid-subscriptions-as-it-struggles-to-monetize-its-service/
- [L5] (Đ, trình duyệt) https://help.quizlet.com/hc/en-us/articles/360030560092-Reporting-bad-ads
- [L6] (Đ, trình duyệt) https://help.busuu.com/hc/en-us/articles/16269241908497-What-is-Premium
- [L7] (Đ) https://apps.apple.com/app/id635966718
- [L8] (T) https://nibble-app.com/blog/is-quizlet-worth-it

**Nghiên cứu, tiêu chuẩn**

- [R1] (Đ, bài gốc) https://arxiv.org/html/2412.05516v1 ; đã đăng Quantitative Marketing and Economics 2025 (T) https://ideas.repec.org/a/kap/qmktec/v23y2025i3d10.1007_s11129-025-09294-7.html
- [R2] (Đ, số của vendor) https://unity.com/blog/understanding-the-impact-of-rewarded-ads-on-iap-retention-and-engagement
- [R3] (Đ, số của vendor) https://unity.com/blog/best-practices-for-maximizing-revenue-from-interstitial-ads-in-your-app
- [R4] (Đ) https://www.betterads.org/standards/
- [R5] (T) https://www.pocketgamer.biz/unity-global-rewarded-ad-engagement-rose-by-32-in-2023
- [R6] (T) https://mwm.ai/glossary/interstitial ; https://blog.playio.co/interstitial-ads-mobile-games

**eCPM**

- [E1] (T) https://www.monetizemore.com/blog/ecpm-insights/
- [E2] (T) https://www.blog.udonis.co/mobile-marketing/mobile-apps/ecpms
- [E3] (Đ) https://appodeal.com/wp-content/uploads/2025/03/Appodeal-The-Latest-eCPM-Report-2025.pdf
- [E4] (T) https://www.thesrzone.com/2024/01/admob-ecpm-rates-by-country.html
- [E5] (T, đoạn trích) https://anymindgroup.com/?p=47889
- [E6] (T, đoạn trích) https://dynamoi.com/data/youtube-adsense-rpm/vn
- [E7] (T) https://gamedevreports.substack.com/p/tenjin-ad-monetization-in-mobile

**Pháp luật Việt Nam, Mỹ, EU**

- [V1] (Đ, PDF toàn văn Luật 75/2025/QH15 trên cổng TP Hà Nội) `https://storage-vnportal.vnpt.vn/gov-hni/7218/VanBan/2025/7/30/LUẬT SỬA ĐỔI BỔ SUNG LUẬT QUẢNG CÁO.pdf`
- [V2] (T) https://hethongphapluat.com/nghi-dinh-342-2025-nd-cp-huong-dan-luat-quang-cao/dieu-17
- [V3] (T, bài của cổng tỉnh Hà Tĩnh tóm tắt nghị định) https://hatinh.gov.vn/vi/bai-viet/siet-chat-quang-cao-tren-mang-tu-1522026
- [V4] (T) https://hethongphapluat.com/luat-bao-ve-du-lieu-ca-nhan-2025/dieu-28
- [V5] (T) https://hethongphapluat.com/luat-bao-ve-du-lieu-ca-nhan-2025/dieu-24
- [V6] (T, đoạn trích; trang trả 403) https://www.pwc.com/vn/vn/publications/legal-news-brief/20260128-new-rules-personal-data-protection.html ; (T) https://luatvietan.vn/diem-moi-cua-nghi-dinh-356-2025-so-voi-nghi-dinh-13-2023-ve-huong-dan-bao-ve-du-lieu-ca-nhan.html
- [V7] (T) https://luatvietnam.vn/tin-phap-luat/tre-em-la-nguoi-duoi-bao-nhieu-tuoi-230-35818-article.html
- [V8] (T, đoạn trích; trang trả 403) https://thuvienphapluat.vn/van-ban/Bo-may-hanh-chinh/Law-91-2025-QH15-Personal-Data-Protection-665440.aspx
- [C1] (Đ) https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions
- [C2] (Đ) https://www.ftc.gov/node/87237
- [C3] (T) https://bassberry.com/news/amendments-to-the-coppa-rule-now-in-effect/
- [C4] (Đ) https://www.google.com/about/company/user-consent-policy/
