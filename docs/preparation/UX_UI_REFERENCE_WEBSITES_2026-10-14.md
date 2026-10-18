# Website có UX/UI tốt theo chuyên gia và cộng đồng (14/10/2026)

Danh sách tham khảo, chia theo chủ đề. Đây là tài liệu chuẩn bị, không phải quyết định thiết kế.

## Cách lấy dữ liệu

- Mỗi tên dưới đây được đọc **trực tiếp từ trang gốc** của giải thưởng/nguồn, ngày 14/10/2026, bằng trình duyệt tích hợp
  (Webby và Awwwards dựng nội dung bằng JavaScript nên phải đọc trang đã render, không dùng bản tóm tắt).
- Link của từng site lấy từ nút "View the work"/"Visit" trên trang giải thưởng. Đã thử mở cả 33 link: đều trả về 200;
  `wildlife.org`, `follow.art`, `udemy.com` trả 403 với `curl` (chặn bot) nhưng mở bằng trình duyệt vẫn ra đúng trang.
- Phân biệt hai loại đánh giá:
  - **Chuyên gia:** Webby Winner (do ban giám khảo IADAS chấm), Awwwards (ban giám khảo), Baymard (đo usability theo
    1.254 guideline, chấm tay).
  - **Cộng đồng:** Webby People's Voice (công chúng bình chọn), Awwwards Users' Choice (công chúng bình chọn), và các
    bài tổng hợp của giới thiết kế (mức tin cậy thấp hơn — là ý kiến biên tập, không phải bình chọn).

**Lưu ý quan trọng:** giải "đẹp" (Awwwards, Webby Visual Design) thường thưởng site nhiều hiệu ứng 3D/WebGL, chuyển
động nặng. Đó là showcase, **không phải mẫu UX** cho một app học hằng ngày. Muốn học "dễ dùng" thì Baymard và hạng mục
Webby "Best User Experience"/"Navigation" sát hơn.

## 1. Giáo dục, học ngôn ngữ (sát dự án nhất)

| Site | Ghi nhận | Loại | Link |
|---|---|---|---|
| Little Language Lessons (Google) | Webby 2026 — Webby Winner, Education | Chuyên gia | https://labs.google/lll |
| 25 Years of Wikipedia (Wikimedia) | Webby 2026 — People's Voice, Education | Cộng đồng | https://wikipedia25.org/en/ |
| Language Explorer (Google Research) | Webby 2026 — Webby Winner, Responsible AI; Honoree, Best Visual Design - Aesthetic | Chuyên gia | https://sites.research.google/languages/language-explorer |
| Codecademy | Baymard — nhãn "Top 1%", nhóm Online Learning | Chuyên gia (usability) | https://www.codecademy.com/ |
| Udemy | Baymard — nhãn "Top 1%", nhóm Online Learning | Chuyên gia (usability) | https://www.udemy.com/ |
| Duolingo | Có trong bài tổng hợp của UXPin (05/2026); nhiều bài phân tích onboarding (ReallyGoodUX/Appcues gọi là một trong những onboarding họ thích nhất) | Cộng đồng / biên tập | https://www.duolingo.com/ |

Honoree khác ở Education 2026: Edit, Please (Language, Please), Smarthistory, Interactive Declaration of Independence
(National Constitution Center), Westbourne Grammar School.

## 2. UX tổng thể và điều hướng

| Site | Ghi nhận | Loại | Link |
|---|---|---|---|
| Pentagram Archive (AREA 17 & Pentagram) | Webby 2026 — Webby Winner, **Best User Experience** | Chuyên gia | https://www.pentagram.com/archive |
| The Wildlife Society (Chariot) | Webby 2026 — People's Voice, Best User Experience | Cộng đồng | https://wildlife.org/ |
| Ottografie (Exo Ape) | Webby 2026 — Webby Winner, **Best Navigation/Structure** (chỉ chấm kiến trúc thông tin) | Chuyên gia | https://www.ottografie.nl/ |
| Netflix Ads (BASIC/DEPT®) | Webby 2026 — People's Voice, Best Navigation/Structure | Cộng đồng | https://advertising.netflix.com/en-us |

Honoree Best UX 2026 có tên quen: Autodesk.com, Google Gemini Marketing Site, Nikon (DEPT®), Webex (Cisco).
Webby Winner Best UX các năm trước: Dropbox Brand Website (2025), Spotify Web Player (2024, cả hai giải).

## 3. Thiết kế hình ảnh

| Site | Ghi nhận | Loại | Link |
|---|---|---|---|
| Igloo Inc (Bureaux) | Webby 2026 — Webby Winner, Best Visual Design - Aesthetic | Chuyên gia | https://www.igloo.inc/ |
| The Renaissance Edition (Shopify) | Webby 2026 — People's Voice, Visual Design - Aesthetic **và** Webby Winner, Best Home Page | Cả hai | https://www.shopify.com/editions/winter2026 |
| FOLLOW.ART (Vide Infra) | Webby 2026 — Webby Winner, Best Visual Design - Function (hình ảnh phục vụ chức năng) | Chuyên gia | https://follow.art/ |
| Affinity Studio Website (Canva) | Webby 2026 — People's Voice, Best Visual Design - Function | Cộng đồng | https://public.canva.site/affinity-case-study |
| Jesko Jets (The First The Last) | Webby 2026 — People's Voice, Best Home Page | Cộng đồng | https://jeskojets.com/ |

## 4. Site sáng tạo đoạt giải Awwwards 2025

Trang `awwwards.com/annual-awards/winners` không ghi năm trên chữ; năm 2025 xác nhận qua đường dẫn media của trang
(`/static/pages/awards-2025/`) và ngày Site of the Day của từng site.

| Site | Giải | Loại | Link |
|---|---|---|---|
| Lando Norris (OFF+BRAND.) | Site of the Year **và** Site of the Year Users' Choice | Cả hai | https://landonorris.com/ |
| Messenger (abeto) | Developer Site of the Year | Chuyên gia | https://messenger.abeto.co/ |
| Scout Motors | E-commerce of the Year | Chuyên gia | https://www.scoutmotors.com/ |

Cùng đợt: Agency of the Year — Immersive Garden; Studio of the Year — Malvah; Independent of the Year — Louis Paquet.

## 5. Thương mại điện tử (usability đo bằng nghiên cứu)

Baymard Institute chấm tay 344 site thương mại điện tử theo 1.254 guideline (desktop, mobile web, app). Trang công khai
gắn nhãn **"Top 1%"** cho 37 site; thứ hạng chi tiết nằm sau gói trả phí. Chưa đọc định nghĩa chính xác của nhãn này.

| Nhóm | Site có nhãn "Top 1%" |
|---|---|
| Thời trang, giày | Nike, Nordstrom, Everlane, Away, Foot Locker, Clarks, Hoka |
| Thực phẩm, siêu thị | Safeway, Sainsbury's, Albertsons |
| Hàng không | Air Canada, Emirates, Lufthansa |
| Học online | Codecademy, Udemy |
| Phần mềm, dịch vụ số | Firebase, Avast |
| Điện tử | GoPro, Netonnet, RTV Euro AGD |
| Thú cưng | Chewy, zooplus |
| Trang sức, kính | Mejuri, Pandora, Chrono24, Ray-Ban, Oakley |
| In ấn theo yêu cầu | Custom Ink, VistaPrint, Zazzle |
| Khác | bol, Gamma, Home24, GOG, Rockstar Games, Master Of Malt, Vivino |

## 6. Tài chính, sức khoẻ

| Site | Ghi nhận | Loại | Link |
|---|---|---|---|
| Cash App Brand Guidelines | Webby 2026 — Webby Winner **và** People's Voice, Financial Services & Banking | Cả hai | https://design.cash.app/ |
| Vibrant Wellness (Noomo Agency) | Webby 2026 — People's Voice, Health & Wellness | Cộng đồng | https://vibrant.noomoagency.com/ |

Webby Winner Health & Wellness 2026 là một chiến dịch y tế công cộng của New Zealand (agency ED.); chưa lấy link.

## 7. SaaS, công cụ — được giới thiết kế nhắc nhiều

Nguồn: hai bài tổng hợp 2026 (UXPin, 17/04/2026 cập nhật 09/05/2026; KrishaWeb, 08/05/2026). Đây là ý kiến biên tập,
không phải giải thưởng hay bình chọn. Cột "Số bài" = số bài trong hai bài này có nhắc tên.

| Site | Số bài | Điểm được khen | Link |
|---|---|---|---|
| Linear | 2 | Giao diện tối, chữ chính xác, chuyển động có mục đích, tải nhanh | https://linear.app/ |
| Vercel | 2 | Bố cục dày đặc cho dev, code là phần tử hình ảnh | https://vercel.com/ |
| Apple | 2 | Ảnh sản phẩm lớn, kể chuyện theo cuộn trang | https://www.apple.com/ |
| Raycast | 2 | Tour sản phẩm tương tác, thẩm mỹ cho power user | https://www.raycast.com/ |
| Framer | 2 | Site làm bằng chính công cụ của họ | https://www.framer.com/ |
| Spotify Design | 2 | Màu đậm, chữ cỡ lớn kiểu tạp chí | https://spotify.design/ |
| Stripe | 1 | Làm sản phẩm kỹ thuật phức tạp trở nên dễ hiểu | https://stripe.com/ |
| Airbnb | 1 | Ô tìm kiếm đặt lên đầu, thẻ nội dung nhất quán | https://www.airbnb.com/ |
| Notion | 1 | Tab theo nhu cầu, người xem tự chọn đường đi | https://www.notion.so/ |

Chưa kiểm: GOV.UK hay được gọi là chuẩn mực usability của khu vực chính phủ — chỉ thấy trong phần tóm tắt kết quả tìm
kiếm, chưa mở bài gốc.

## 8. Nơi xem tiếp (cập nhật liên tục)

- Webby Gallery + Index — https://winners.webbyawards.com (lọc theo hạng mục và năm)
- Awwwards — https://www.awwwards.com (Site of the Day, Annual Awards)
- Baymard UX Benchmark — https://baymard.com/ux-benchmark (lọc theo ngành, có nhóm "Online Learning")
- Godly — https://godly.website (gallery tuyển chọn tay, thiên về chuyển động)

## Chưa làm được / còn thiếu

- **Webby các ngành khác** (thương mại điện tử, du lịch, chính phủ, tin tức): không tìm ra đường dẫn hạng mục; chỉ có
  Education, Financial, Health và các hạng mục Features & Design.
- **CSS Design Awards 2025:** không tìm thấy trang công bố.
- **Nielsen Norman Group Intranet Design Annual:** bản mới nhất tìm thấy là 2023, và intranet không mở công khai được.
- **Reddit (r/UXDesign, r/web_design):** tìm kiếm không trả về thread nào, nên phần "cộng đồng" dựa trên bình chọn công
  khai (People's Voice, Users' Choice) và bài tổng hợp, không có thảo luận diễn đàn.

## Nguồn

- Webby 2026: [Best User Experience](https://winners.webbyawards.com/winners/websites-and-mobile-sites/features-design/best-user-experience),
  [Best Visual Design - Aesthetic](https://winners.webbyawards.com/winners/websites-and-mobile-sites/features-design/best-visual-design-aesthetic),
  [Best Visual Design - Function](https://winners.webbyawards.com/winners/websites-and-mobile-sites/features-design/best-visual-design-function),
  [Best Navigation/Structure](https://winners.webbyawards.com/winners/websites-and-mobile-sites/features-design/best-navigationstructure),
  [Best Home Page](https://winners.webbyawards.com/winners/websites-and-mobile-sites/features-design/best-home-page),
  [Education](https://winners.webbyawards.com/winners/websites-and-mobile-sites/general-desktop-mobile-sites/education),
  [Financial Services & Banking](https://winners.webbyawards.com/winners/websites-and-mobile-sites/general-desktop-mobile-sites/financial-services-banking),
  [Health & Wellness](https://winners.webbyawards.com/winners/websites-and-mobile-sites/general-desktop-mobile-sites/health-wellness),
  [Language Explorer](https://winners.webbyawards.com/2026/websites-and-mobile-sites/responsible-technology/responsible-ai/364609/language-explorer)
- Awwwards: [Annual Awards winners](https://www.awwwards.com/annual-awards/winners),
  [Lando Norris](https://www.awwwards.com/sites/lando-norris), [Messenger](https://www.awwwards.com/sites/messenger),
  [Scout Motors](https://www.awwwards.com/sites/scout-motors)
- Baymard: [UX Benchmark](https://baymard.com/ux-benchmark)
- Bài tổng hợp: [UXPin](https://www.uxpin.com/studio/blog/good-website-designs-examples/),
  [KrishaWeb](https://www.krishaweb.com/blog/best-modern-website-designs/),
  [ReallyGoodUX — Duolingo onboarding](https://goodux.appcues.com/blog/duolingo-user-onboarding)
