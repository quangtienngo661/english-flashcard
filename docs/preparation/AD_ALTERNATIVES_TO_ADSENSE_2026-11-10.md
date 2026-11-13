# Các cách chạy quảng cáo ngoài AdSense cho Wordmet (10/11/2026)

Câu hỏi của chủ dự án: "Có cách nào khác để chạy quảng cáo ngoài AdSense không?"

Ràng buộc đã chốt (decisions `docs/superpowers/decisions/2026-11-04-chuan-bi-launch-b-decisions.md`, design §4–§5 `docs/superpowers/specs/2026-11-04-chuan-bi-launch-b-design.md`):
quảng cáo chỉ cho người Free từ 16 tuổi (DB24, `ads.show`), không staff (DB26), chỉ ở `/app/groups` và `/app/lookup` (DB13, DB38), không bao giờ trong phiên luyện
hay màn tổng kết (DB23), không video, tần suất thấp (DB14), luôn không cá nhân hoá (DB25), dạng toàn màn hình giữa hai lần chuyển trang (DB11). `/app` là SPA dựng phía
client, CSP chặt bằng `nonce` (DB39). Hộp thoại giới thiệu Pro là dự phòng (DB27).

Desk research, chỉ đọc trang công khai, không đăng ký tài khoản nào. Không phải tư vấn pháp lý hay thuế. Mọi trang đọc ngày **10/11/2026**.
Tài liệu này nối tiếp `WEB_ADS_RESEARCH_2026-11-02.md` và `ADSENSE_LOGGED_IN_APP_RESEARCH_2026-11-04.md` (nhánh `docs/web-launch-research`); phần đã có ở đó không lặp lại.

**Nhãn:** **(Đ)** trang chính thức đọc trong phiên này · **(T)** bên thứ ba, hoặc chỉ có đoạn trích tìm kiếm · **(S)** suy luận · **(?)** không tìm thấy ·
**`ASSUMPTION`** điều chưa kiểm được mà kết luận phụ thuộc vào. Không có đề xuất chọn phương án (luật dự án: chủ dự án trả lời trước).

---

## 1. Bảng so sánh

| Lựa chọn | Nhận site mới, tiếng Việt | Dạng toàn màn hình; tránh phiên luyện | SPA + CSP `nonce` | Không cá nhân hoá; dưới 16 | Trả tiền cho người ở VN | Rủi ro nội dung quảng cáo | Hợp Wordmet |
|---|---|---|---|---|---|---|---|
| **Google Ad Manager + GPT** | Cần tài khoản AdSense hợp lệ; site vẫn được Google xét (Đ) | Web interstitial khi bấm link; tắt từng link bằng `data-google-interstitial="false"` (Đ) | Hỗ trợ SPA chính thức từ 06/2025; CSP `nonce` như AdSense (Đ) | `nonPersonalizedAds`, `tagForAgeTreatment` gọi được từng lần tải (T) | Qua tài khoản AdSense; VN nhận wire (T) | Thấp: chính sách Google, chặn được danh mục (T) | Kỹ thuật hợp nhất; **không** thoát được chờ duyệt AdSense |
| **Ezoic** | 250.000 MAU với site mới từ 19/02/2026 (Đ) | (?) | (?) | (?) | (?) | Thấp (S) | Không: dưới ngưỡng |
| **Media.net, Journey, Raptive** | Liên hệ sales; traffic Mỹ/Anh/Canada/Úc (T) | (?) | (?) | (?) | (?) | Thấp (S) | Không: sai thị trường |
| **MGID** (native) | 3.000 khách/ngày, ≥10 bài ≥500 chữ (Đ) | Không có dạng toàn màn hình phù hợp (S) | (?) | (?) | PayPal, Payoneer, Tipalti 100 USD; NET30 (Đ) | Trung bình (S) | Không: dưới ngưỡng, không có bài viết |
| **Adsterra** | Không có ngưỡng traffic, duyệt "under 10 minutes" (Đ) | Popunder, Social Bar, interstitial; không có tài liệu tắt theo link (?) | Không có tài liệu SPA hay CSP (?) | Không thấy cờ NPA hay tuổi (?) | Paxum, WebMoney 5 USD, PayPal 25 USD (Đ) | **Cao**: từng bị nối với malvertising (T) | Không hợp DB11, DB14, DB25 |
| **Monetag** (PropellerAds) | Không tìm thấy ngưỡng (?) | OnClick Popunder, "Vignette Banner" (chỉ là banner native), interstitial (Đ) | (?) | (?) | Tối thiểu 5 USD theo thông cáo của hãng (T) | **Rất cao**: chiến dịch mã độc 12/2024 (T) | Không |
| **Admicro** (VCCorp) | Trên 1.000.000 pageview/tháng (Đ) | Banner, balloon, masthead, video 15–45 s (Đ) | (?) | (?) | Không công bố (Đ) | Thấp (S) | Không: dưới ngưỡng, nhiều video |
| **Adtima, eClick, Cốc Cốc** | Không tìm thấy chương trình mở cho site ngoài (T, ?) | (?) | (?) | (?) | (?) | (?) | Chưa có đường vào |
| **Affiliate** (AccessTrade, Shopee, ELSA…) | Không ngưỡng traffic; Shopee duyệt kênh (T) | Link, ảnh trong trang; Wordmet tự đặt chỗ (S) | Không cần script bên thứ ba (S) | App tự quyết, dùng lại `ads.show` (S) | VND, khấu trừ thuế TNCN (T) | Thấp, tự chọn sản phẩm (S) | Hợp về kỹ thuật; doanh thu chưa biết |
| **Tài trợ trực tiếp / tự bán chỗ** | Không ngưỡng; phải tự đi bán (S) | Wordmet tự làm hộp thoại như house ad (S) | CSP giữ nguyên (S) | App tự quyết (S) | Theo hợp đồng, VND (S) | Thấp, tự duyệt từng mẫu (S) | Hợp về kỹ thuật; tốn công bán, nghĩa vụ luật quảng cáo |
| **Chỉ house ad giới thiệu Pro** | Đã có trong design §4.2 | Đúng DB11, đã dựng | CSP giữ nguyên | Đã có | Không có tiền quảng cáo | Không | Đúng hiện trạng dự phòng |

---

## 2. Từng lựa chọn

### 2.1 Google Ad Manager + Google Publisher Tag (GPT)

- Đăng ký: "You need a valid Google AdSense account to sign up for Ad Manager"; sản phẩm "for large publishers who have significant direct sales"; có thể phải nói
  chuyện với nhân viên Google (Đ)[G1]. Site thêm vào Ad Manager qua các trạng thái "Getting ready" → "Ready", "usually takes just a few days but could take up to 2-4 weeks" (Đ)[G2].
- Web interstitial: "appear in response to user actions"; bấm link luôn là trigger, các trigger khác (cuối bài, 30 s không thao tác, quay lại tab) tắt mặc định; tần suất
  mặc định 1 lần/10 phút, thấp nhất 1 lần/phút, tính theo subdomain; gắn `data-google-interstitial="false"` lên link hoặc phần tử cha để link đó không bật quảng cáo; cần
  local storage (Đ)[G3].
- SPA: tuần 02/06/2025 "seamlessly display web interstitial ads within SPA-enabled websites, without needing full page reloads"; từ 15/06/2026 nút Back không còn bật
  interstitial; tuần 19/10/2026 GPT tự cập nhật correlator khi điều hướng phía client (Đ)[G4].
- CSP: chỉ hỗ trợ CSP chặt bằng `nonce`, cùng mẫu với AdSense (có `'unsafe-eval'`, `'strict-dynamic'`); không hỗ trợ liệt kê tên miền; nên bật
  `safeFrame: { forceSafeFrame: true }` (Đ)[G5].
- Không cá nhân hoá và tuổi: `setPrivacySettings({ nonPersonalizedAds: true })`, `tagForAgeTreatment` (1 child, 2 teen) đặt trước `display()` (T, đoạn trích help Ad Manager)[G6].
- Thanh toán: tài khoản Ad Manager "permanently linked" với tài khoản AdSense (T, đoạn trích của [G1]); tiền đi qua AdSense là `ASSUMPTION`. Việt Nam nhận wire, không có
  EFT (T, bảng của AdSense for YouTube)[G8]; ngưỡng 100 USD với tài khoản USD (T, đoạn trích ví dụ trong help AdSense).
- Phí của Ad Manager bản thường: (?).

### 2.2 Ezoic, Media.net, Journey by Mediavine, Raptive

- Ezoic: site mới "generally required to have 250,000+ monthly active users" từ 19/02/2026; dưới ngưỡng thì xét Incubator (không nêu điều kiện); nội dung phải bằng ngôn ngữ AdSense
  hỗ trợ; nhận cả "web-based tools and applications" (Đ)[X1].
- Media.net: trang publisher chỉ có nút liên hệ, không nêu điều kiện (Đ)[X2]. Bên thứ ba ghi nội dung tiếng Anh, phần lớn traffic từ Mỹ, Anh, Canada (T)[X3].
- Journey cần 1.000 phiên/tháng từ Mỹ, Anh, Canada, Úc; Raptive 25.000 pageview/tháng (theo tài liệu 02/11, **chưa đọc lại** trong phiên này).

### 2.3 MGID (quảng cáo native)

- "3000 unique daily visitors and at least 10 articles", mỗi bài ít nhất 500 chữ; cấm nội dung người lớn và "intrusive advertising" trên site (Đ)[X4].
- Trả tiền: PayPal, Tipalti, Payoneer 100 USD, wire 1.000 USD, NET 30; trang không nói có trả về Việt Nam không (Đ)[X5].

### 2.4 Adsterra

- "No traffic minimums, no review queues"; duyệt site "typically takes under 10 minutes"; định dạng: Popunder, Social Bar (kèm In-Page Push và Interstitial), banner IAB, Native,
  Smartlink; có kiểm duyệt mẫu quảng cáo và lọc theo danh mục (Đ)[X6]. Popunder đặt trong `<head>`, Social Bar trước `</body>`; muốn đổi tần suất thì liên hệ hãng (Đ, bài
  cho site HTML tĩnh)[X7]. Không có tài liệu SPA, CSP, cờ tuổi hay không cá nhân hoá (?).
- Trả tiền: Paxum, WebMoney 5 USD, PayPal 25 USD (Đ)[X6]; wire 1.000 USD (T, đoạn trích tìm kiếm, không rõ trang). Paxum, WebMoney ít phổ biến ở Việt Nam;
  PayPal rút về ngân hàng Việt Nam được không: `ASSUMPTION`, chưa tra.
- Rủi ro: TechTarget (27/07/2020) ghi Check Point nối Adsterra với chiến dịch Master134 (2018) và mẫu quảng cáo lừa "tech support" chạy từ tên miền Adsterra trên PEdump.me (2020);
  Adsterra bác bỏ (T)[S1].
- Doanh thu: một case study của chính Adsterra về blog nấu ăn Việt Nam ghi CPM popunder 5,516 USD, CPM chung 2,813 USD, nhưng blog nhắm người đọc **ngoài** Việt Nam
  (T, **số của nhà bán**, chỉ đọc đoạn trích; trang trả 403)[R1].

### 2.5 Monetag (PropellerAds)

- Định dạng: MultiTag, OnClick Popunder (mở tab mới khi người dùng bấm), Vignette Banners ("native banner" có nút Close, **không** phải quảng cáo chuyển trang như vignette của
  Google), Push Notification, In-Page Push, Interstitial, SmartLink (Đ, trang plugin WordPress sửa 02/06/2026)[X9].
- Thanh toán tối thiểu 5 USD, trả hằng tuần theo thông cáo của hãng; danh sách phương thức các nguồn ghi khác nhau (T)[X10].
- Rủi ro: Help Net Security (17/12/2024) thuật lại báo cáo của Guardio Labs và Infoblox: Monetag, "a subsidiary of PropellerAds", bị dùng để mở tab mới tới trang CAPTCHA giả cài mã
  độc Lumma, tới 1 triệu lượt hiện/ngày từ hơn 3.000 site publisher (T)[S2]. Năm 2020, Confiant nói một tên miền của PropellerAds là điểm cuối của chiến dịch Tag Barnakle và
  PropellerAds "known to look the other way" (T)[S1].
- Doanh thu: một bài trên diễn đàn affiliate kể publisher Việt Nam lãi 41.000 USD bằng SmartLink, do tài khoản liên quan Monetag đăng (T, **giai thoại của nhà bán**, trang trả 403)[R2].

### 2.6 Mạng quảng cáo Việt Nam

- Admicro (VCCorp): "PAGEVIEWS/THÁNG > 1.000.000", traffic và tin bài ổn định; đăng ký nộp báo cáo Google Analytics bằng PDF; định dạng banner, native, Balloon, Masthead, Inpage,
  iPoster, video Instream 15 s, In-read và Outstream 45 s; không nêu tỷ lệ chia hay ngưỡng trả (Đ)[V1].
- Adtima (Zalo, VNG): trang chủ chỉ có tiêu đề (Đ)[V2]; tin tuyển dụng mô tả mạng phát hành là Zalo, Báo Mới, Zing MP3, Zalo Video, ZNews (T)[V3]. Không thấy chương trình cho site ngoài (?).
- eClick (FPT): tên miền không phân giải được trong phiên này; tài liệu 02/11 ghi trang chỉ bán cho nhà quảng cáo (chưa đọc lại).
- Cốc Cốc Audience Network: chỉ có đoạn trích bài ra mắt, không có điều kiện hay tỷ lệ chia (T)[V4].
- Yango Ads: bài 23/04/2025 chỉ nói tới nhà phát hành game và app (T)[V5].

### 2.7 Affiliate (tiếp thị liên kết)

- AccessTrade Việt Nam: tự nêu "Hơn 1.000 Nhãn Hàng", hơn 2.500.000 publisher, hoa hồng tới 45% cho sản phẩm D2C (Đ, **số của nhà bán**); trang chủ không nêu ngưỡng trả hay thuế (?)[F1].
- Shopee Affiliate (sách học tiếng Anh): đối tác là tổ chức thành lập ở Việt Nam hoặc cá nhân quốc tịch và cư trú ở Việt Nam; website được dùng khi Shopee chấp thuận; cá nhân bị khấu trừ
  thuế TNCN (T, đoạn trích điều khoản; trang chính thức trả 503)[F2]. Ngưỡng khấu trừ 10% mỗi lần chi trả có thể đã lên 5 triệu đồng theo Nghị định 253/2026 (T, chưa kiểm)[F3].
- ELSA Speak có chương trình affiliate CPS cho Việt Nam, Thái Lan, Indonesia qua Indoleads (2024); một trang khác ghi chiến dịch "paused" (T)[F4].
- Kỹ thuật: link và ảnh tự host, không thêm script bên thứ ba, CSP `/app` giữ như trước AdSense (S).
- Doanh thu: trả theo đơn hàng; không tìm thấy số chuyển đổi của app học (?). `ASSUMPTION`: vài đơn sách mỗi tháng ở quy mô 1.000 người Free/ngày.

### 2.8 Tài trợ trực tiếp / tự bán chỗ quảng cáo

- Không có ngưỡng, nhưng phải tự tìm khách (trung tâm IELTS, nhà sách, app khác) (S).
- Luật: quảng cáo hàng hoá, dịch vụ phải có giấy chứng nhận đăng ký kinh doanh (Điều 20 Luật Quảng cáo, T)[L3]; điều kiện riêng cho quảng cáo dịch vụ giáo dục: (?). Wordmet là
  người phát hành quảng cáo: gỡ quảng cáo vi phạm trong 24 giờ (Nghị định 342 Điều 18, theo tài liệu 02/11). Hoá đơn, thuế khi cá nhân bán chỗ quảng cáo: `ASSUMPTION`, chưa tra.

### 2.9 Chỉ giữ house ad giới thiệu Pro

- Đã có trong design §4.2: cùng trang, cùng tần suất, cùng `ads.show`; không chứa mã Google. Không có tiền quảng cáo; CSP `/app` không thêm `'unsafe-eval'`, `https:` (design §5.4).
- Bằng chứng ngoài: Duolingo nói tăng ad load góp phần làm DAU tăng chậm (Đ, theo `EDU_APP_ADS_SURVEY_2026-11-04.md`).

### 2.10 Luật dữ liệu cá nhân (áp cho mọi mạng bên thứ ba)

- Nghị định 13/2023 đã được thay bởi Nghị định 356/2025, hướng dẫn Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15, hiệu lực 01/01/2026; dữ liệu theo dõi hành vi trên mạng
  thành dữ liệu **nhạy cảm**; cấm cơ chế đồng ý mặc định (T, LuatVietnam 20/01/2026)[L1]. Điều 28 về quảng cáo cần đồng ý khi xử lý dữ liệu khách hàng để quảng cáo (T, tài liệu 02/11)[L2].
- Google có công tắc không cá nhân hoá và cờ tuổi (2.1). Adsterra, Monetag không công bố công tắc tương tự (?), nên script của họ thu gì thì Wordmet không biết để ghi vào Chính sách
  bảo mật (S).
- Chính sách AdSense: site "may not … redirect users to unwanted websites" và không được có "pop-ups or pop-unders that interfere with site navigation" (Đ)[G9]. Chạy popunder
  của mạng khác trên cùng tên miền thì rủi ro khi xin hoặc giữ AdSense (S).

---

## 3. Phù hợp với Wordmet không

- **Ad Manager + GPT:** hợp nhất về kỹ thuật với SPA: app chọn link nào bật quảng cáo, Google ghi rõ hỗ trợ SPA, cờ không cá nhân hoá và tuổi đặt được từng lần tải. Nhưng vẫn
  cần tài khoản AdSense hợp lệ và site được Google xét, nên **không giải quyết việc đang chờ duyệt**; thêm việc dựng ad unit trong Ad Manager. Là thay thế cho vignette nếu bản
  thử sau deploy cho thấy A1 sai (design §5.7), không phải thay thế cho AdSense.
- **Ezoic, Media.net, Journey, Raptive, MGID, Admicro:** không, ít nhất tới khi có traffic lớn; ba mạng đầu nhắm traffic Mỹ/Anh; MGID và Admicro cần site có bài viết.
- **Adsterra, Monetag:** không. Dạng chính là popunder, push giả thông báo, mở tab mới, trái DB11 ("tắt được ngay, không spam") và DB14; không có cờ không cá nhân hoá (DB25);
  có tiền sử malvertising; popunder trái chính sách AdSense nếu sau này vẫn muốn AdSense.
- **Adtima, eClick, Cốc Cốc:** chưa có đường vào công khai cho một app nhỏ.
- **Affiliate:** hợp về kỹ thuật và ràng buộc (dùng lại `ads.show` và trang Nhóm, Tra từ; CSP không đổi; không theo dõi người học). Doanh thu chưa biết; phải ghi nhãn quảng cáo.
- **Tài trợ trực tiếp:** hợp về kỹ thuật như affiliate; tốn công bán và có nghĩa vụ luật quảng cáo, thuế.
- **Chỉ house ad:** đúng hiện trạng dự phòng; không doanh thu trực tiếp; không thêm rủi ro.

## 4. Chưa kiểm được

- Tài khoản AdSense có được coi là "valid" cho Ad Manager khi site đầu tiên chưa được duyệt không: `ASSUMPTION` là không; Google không nói (?).
- Ad Manager bản thường có thu phí không (?); có trả về Việt Nam đúng như AdSense không (chỉ có bảng của AdSense for YouTube) (T).
- Adsterra, Monetag: chặn hẳn quảng cáo người lớn và cờ bạc được không; có hỗ trợ CSP `nonce`, SPA, cờ tuổi không; thu những dữ liệu gì (?).
- Số CPM, RPM cho traffic Việt Nam: chỉ có số của nhà bán và giai thoại (2.4, 2.5) và số AdSense 0,27 USD/1.000 pageview của một blogger (tài liệu 02/11). Không số nào đo trên app học.
- Toàn văn Điều 28 Luật 91/2025 và Nghị định 342/2025: chưa đọc bản chính thức; điều kiện quảng cáo dịch vụ giáo dục; thuế khi tự bán chỗ quảng cáo.
- Trang không đọc được: một số trang của Adsterra, CloudSEK, BrandsVietnam, Advertising Vietnam, afflift (403); Shopee (503); `eclick.vn` (không phân giải).

---

## Nguồn (đọc 10/11/2026)

**Google**
- [G1] (Đ) https://support.google.com/admanager/answer/7084151
- [G2] (Đ) https://support.google.com/admanager/answer/10130765
- [G3] (Đ) https://developers.google.com/publisher-tag/samples/display-web-interstitial-ad
- [G4] (Đ) https://developers.google.com/publisher-tag/release-notes
- [G5] (Đ) https://developers.google.com/publisher-tag/guides/content-security-policy
- [G6] (T) https://support.google.com/admanager/answer/7678538
- [G8] (T) https://support.google.com/youtube/answer/14728152 (bảng phương thức thanh toán theo nước)
- [G9] (Đ) https://support.google.com/adsense/answer/48182

**Mạng quảng cáo**
- [X1] (Đ) https://support.ezoic.com/kb/article/getting-started-ezoics-requirements
- [X2] (Đ) https://www.media.net/publishers
- [X3] (T) https://www.adpushup.com/blog/media-net-review-pros-and-cons/
- [X4] (Đ) https://help.mgid.com/requirements-to-publishers
- [X5] (Đ) https://help.mgid.com/payouts
- [X6] (Đ) https://adsterra.com/monetize-traffic/
- [X7] (Đ) https://help-publishers.adsterra.com/en/articles/5210780-adding-ads-to-a-static-html-site (ngày 28/08/2026)
- [X9] (Đ) https://wordpress.org/plugins/monetag-official/
- [X10] (T) https://techbullion.com/monetag-unveils-new-monetization-option-for-telegram-mini-apps-via-rewarded-interstitial-ads/

**An toàn quảng cáo**
- [S1] (T) https://www.techtarget.com/searchsecurity/news/252486702/Digital-ad-networks-tied-to-malvertising-threats-again (27/07/2020)
- [S2] (T) https://helpnetsecurity.com/?p=319766 (17/12/2024)

**Việt Nam**
- [V1] (Đ) https://publisher.admicro.vn/
- [V2] (Đ, chỉ tiêu đề) https://adtima.vn/
- [V3] (T, đoạn trích tin tuyển dụng) https://zalo.careers/job/product-specialist-adtima-publisher-strategy-monetization-n-QA37EkgAdGEp4c81; https://www.brandsvietnam.com/job/36-advertising-operations-collaborator-adtima
- [V4] (T, đoạn trích) https://www.brandsvietnam.com/21219-ra-mat-coc-coc-audience-network-mang-quang-cao-truc-tuyen-so-huu-he-sinh-thai-da-dang-tai-viet-nam
- [V5] (T) https://vnreview.vn/threads/yango-ads-mach-nuoc-cho-su-phat-trien-cua-adtech-tai-viet-nam.60079/

**Affiliate**
- [F1] (Đ) https://accesstrade.vn/
- [F2] (T, đoạn trích) https://shopee.vn/affiliate/dieu-kien-hop-tac-chuong-trinh-tiep-thi-lien-ket-cua-shopee-viet-nam-update-18-08-2023/
- [F3] (T, đoạn trích) https://thuehaiquan.tapchikinhtetaichinh.vn/chi-tra-tu-5-trieu-dong-lan-moi-phai-khau-tru-thue-thu-nhap-ca-nhan-10-163891.html
- [F4] (T) https://indoleads.com/blog/new-offer-launched-elsa-speak-affiliate-program/; https://www.cuelinks.com/campaigns/elsa-speak-affiliate-program

**Doanh thu (số của nhà bán hoặc giai thoại)**
- [R1] (T, đoạn trích) https://adsterra.com/blog/how-a-vietnamese-recipe-blog-earns-case-study/
- [R2] (T, đoạn trích) https://afflift.com/f/threads/how-one-publisher-earned-41k-in-vietnam-using-twitter-monetag-smartlink.15494

**Luật**
- [L1] (T) https://english.luatvietnam.vn/legal-updates/new-features-of-decree-356-2025-compared-with-decree-13-2023-on-personal-data-protection-892-106712-article.html (20/01/2026)
- [L2] (T) https://hethongphapluat.com/luat-bao-ve-du-lieu-ca-nhan-2025/dieu-28 (theo tài liệu 02/11)
- [L3] (T, đoạn trích) https://hethongphapluat.com/law-no-16-2012-qh13-ofjune-21-2012-on-advertising/dieu-20
