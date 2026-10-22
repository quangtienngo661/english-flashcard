# Decisions — Đợt giao diện (mockup đầy đủ cho app người học và admin)

Ngày: 21/10/2026. Đi kèm design doc [`../specs/2026-10-21-dot-giao-dien-design.md`](../specs/2026-10-21-dot-giao-dien-design.md).
File này gom mọi quyết định đã chốt trong lúc brainstorm (21/10/2026, trong phiên điều phối Bước 7, sau khi rà Figma), mỗi quyết định có các phương án đã
đưa ra trong chat, trade-off, phương án được chọn và lý do. Đầu vào: báo cáo rà Figma [`../../mockups/2026-10-21/figma-review.md`](../../mockups/2026-10-21/figma-review.md).

**Nhãn:** ✅ = phương án được chọn. **Ai chốt:** "Chủ dự án" = chủ dự án trả lời trước, Claude đề xuất sau, chủ dự án chốt; "Chủ dự án, theo đề xuất" =
từ câu 3, chủ dự án nhờ Claude đề xuất trước và đồng ý; "Chủ dự án, đổi đề xuất" = chủ dự án chọn khác đề xuất của Claude; "Chủ dự án, tự nêu" = chủ dự
án nêu thêm, không có câu hỏi trước.

**Luật hỏi trong đợt này.** Câu 1–2 theo luật thường của dự án (chủ dự án trả lời trước, không phương án nào được đánh dấu đề xuất). Từ câu 3, chủ dự án
yêu cầu: "lần này không liên quan đến hệ thống, nên cho mình các recommend của từng câu giúp mình đi, kèm theo visualize nếu cần ở mỗi câu" (ngoại lệ
theo D27 Bước 4: chủ dự án tự nói muốn đề xuất trước). Claude gửi đề xuất kèm hình phác cho các câu 3, 4, 6a, 7, 8, 9; chủ dự án sửa ba câu và đồng ý phần còn lại.

## Tóm tắt

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| D1 | Phạm vi và cách chia đợt | Đủ giao diện mọi mảng, chỉ mockup; một đợt theo thứ tự; Claude vẽ, duyệt từng mảng | Chủ dự án |
| D2 | Bố cục | Hướng B (web page 08, điện thoại page 09); page cũ đổi tên, dời cuối, chưa xóa | Chủ dự án |
| D3 | Mặt trước thẻ ôn | Từ + loại từ | Chủ dự án, theo đề xuất |
| D4 | Nhóm chọn sẵn ở tấm Thêm từ | Nhóm dùng gần nhất | Chủ dự án, theo đề xuất |
| D5 | Giới hạn câu ngữ cảnh trên màn | Không ghi; báo khi chạm | Chủ dự án, theo đề xuất |
| D6 | Người Free và tính năng AI | Hiện, khóa, nhãn Pro, một dòng giải thích + link Gói học | Chủ dự án, theo đề xuất |
| D7 | Nút "Xem gói học" ở màn hết lượt | Bỏ | Chủ dự án, theo đề xuất |
| D8 | Chỗ của "Báo lỗi của tôi" | Tab trong Lịch sử luyện tập | Chủ dự án, theo đề xuất |
| D9 | Phiên đang dở | Thẻ cột phụ; hỏi chỉ khi mở phiên mới | Chủ dự án, theo đề xuất |
| D10 | Cài đặt admin | Một trang, 6 tab theo nhóm API; bỏ khối "Mẫu email" | Chủ dự án, theo đề xuất |
| D11 | Màn admin | Mức khung trên page 04; vẽ cả màn AI của Bước 6 | Chủ dự án, đổi đề xuất (phần màn AI) |
| D12 | Hồ sơ người học | Tên, Họ, Ngày sinh sửa được (ngày sinh vẫn đủ 13 tuổi); link `/terms` | Chủ dự án, đổi đề xuất (phần ngày sinh) |
| D13 | Bản tối | Chế độ Dark của biến + màn mẫu | Chủ dự án, theo đề xuất |
| D14 | Ngôn ngữ và chữ giao diện | Research tiếng Việt → bản chữ giao diện → duyệt trước khi vẽ; chỉ tiếng Việt | Chủ dự án, đổi đề xuất |
| D15 | Cách vẽ | Thẳng trong Figma + prototype 3 luồng Bước 7 | Chủ dự án, theo đề xuất |
| D16 | Chỗ của Cài đặt | Web: trong menu avatar; điện thoại: như page 09; trang Cài đặt ẩn dải tìm kiếm | Chủ dự án, tự nêu |
| D17 | Thuật ngữ và định dạng (8 câu sau research) | Theo đề xuất ở cả 8 câu | Chủ dự án, theo đề xuất |

## D1 — Phạm vi và cách chia đợt

Bối cảnh: báo cáo rà Figma cho thấy Bước 7 và đợt sửa Bước 0–3 chưa có màn nào, điện thoại thiếu Bước 4–5, admin phần lớn là placeholder. Claude chia
năm mảng: (a) khung app, đăng ký/đăng nhập, học và ôn, tra từ, thêm từ, cài đặt; (b) Luyện tập không AI và có AI; (c) Gói học và lượt; (d) màn admin còn
thiếu; (e) vẽ bổ sung Figma và chốt trang 08/09. Câu hỏi: đợt này phải ra gì thì xong, chia đợt thế nào.

| Phương án đưa ra | Trade-off |
|---|---|
| Chia nhiều đợt, ví dụ "đợt 1 (e) + (a) cho web, đợt 2 (b) + (c), admin để sau" | Mỗi đợt nhỏ, duyệt sớm; nhiều vòng brainstorm/plan |
| ✅ Làm hết trong một đợt | Một lần quyết định, nhất quán; khối lượng lớn trong một đợt |

**Chủ dự án:** "đầy đủ giao diện, phần này tập trung vào thiết kế mockup, không đụng tới code nên mình nghĩ việc sẽ không nhiều".
**Claude đề xuất sau:** đồng ý phạm vi và "chỉ mockup"; khác ở khối lượng (ước tính 60–130 khung, `ASSUMPTION`); đề xuất vẫn một đợt nhưng theo thứ tự:
chốt bố cục → trả lời câu mở → vẽ sửa đăng ký → điện thoại Luyện tập/Gói học → Bước 7 (web rồi điện thoại) → admin; một design doc ngắn + plan theo trang
Figma; Claude vẽ, chủ dự án duyệt từng trang. **Chủ dự án:** "ok".

## D2 — Bố cục

Bối cảnh: page 03 (web G1 "Bàn học", sidebar, Chốt 20/10) và page 05/06 (điện thoại) là bản chính thức; page 08 (web, thanh trên, đề xuất 20–21/10) và
page 09 (điện thoại theo 08, đề xuất 21/10) chưa duyệt, chưa có trong Mục lục và UI-CONTEXT. Claude gửi ảnh màn Hôm nay của bốn bản để so.

| Phương án đưa ra | Trade-off |
|---|---|
| A: web page 03, điện thoại page 05 | Giữ quyết định 20/10; ô tra chỉ ở trang Tra từ; web và điện thoại khác kiểu |
| ✅ B: web page 08, điện thoại page 09 | Ô tra ở mọi trang; web và điện thoại cùng kiểu; thanh trên điện thoại chiếm ~175px; đổi quyết định G1 |
| Trộn (ví dụ web B, điện thoại A) | Giữ một phần cũ; hai nền tảng khác kiểu |
| Page không chọn: giữ để tham khảo / xóa như lần dọn 20/10 | Giữ thì dễ nhầm; xóa thì mất (còn trong Version history) |

**Chủ dự án:** "mình chọn hướng mới nhất hiện tại nhé, hướng đề xuất mới, không phải hướng cũ".
**Claude đề xuất sau:** đồng ý B (tra từ là việc làm nhiều nhất; nút "Tra bằng AI" của Bước 7 có chỗ tự nhiên; vẽ một kiểu cho hai nền tảng); nhận 8 điểm
khác ghi trong màn "Đọc trước" của page 08 và 09 như đã vẽ; page 03, 05, 06 **đổi tên "(cũ, không dùng)" và dời cuối, chưa xóa**, vì page 09 chép nhiều tấm từ
page 05 và có thể dùng component gốc ở đó. Ghi một điểm cần để ý: thanh trên điện thoại 175px. **Chủ dự án:** "ok".

## D3 — Mặt trước thẻ ôn

Bối cảnh: W/20 và Mục lục ghi mặt trước chỉ từ + loại từ; W/44 ghi câu đã gặp hiện ở mặt trước, từ bị che; UI-CONTEXT §7.3 còn mở.

| Phương án | Trade-off |
|---|---|
| ✅ Từ + loại từ; mặt sau nghĩa + câu đã gặp, tô từ | Đúng việc của thẻ ôn (thấy từ nhớ nghĩa); câu riêng vẫn hiện ở mặt sau |
| Câu đã gặp, từ bị che, ở mặt trước | Ôn theo ngữ cảnh; thành bài điền từ, trùng việc của Luyện tập và bài điền từ từ câu đã lưu (Bước 7) |

## D4 — Nhóm chọn sẵn ở tấm Thêm từ

Bối cảnh: D43 Bước 3 bỏ nhóm mặc định; N/50 chọn sẵn "Mới thêm".

| Phương án | Trade-off |
|---|---|
| Để trống | Đúng D43 tuyệt đối; thêm mỗi từ phải chọn lại nhóm |
| ✅ Chọn sẵn nhóm dùng gần nhất (chưa có nhóm → "Tạo nhóm đầu tiên"; nhóm đó bị xóa → trống) | Ít thao tác khi thêm liền nhiều từ vào một nhóm; vẫn là lựa chọn của người học, không phải nhóm hệ thống; app phải nhớ lựa chọn (không cần API) |
| Cách khác | — |

## D5 — Giới hạn câu ngữ cảnh trên màn

Bối cảnh: màn ghi "tối đa 5 câu"; Bước 5 đặt `sentences_per_sense` mặc định 20 (admin chỉnh 5–100).

| Phương án | Trade-off |
|---|---|
| Hiện con số giới hạn | Người học biết trước; con số đổi theo admin; dễ sai như "5" hiện nay |
| ✅ Không ghi; trang từ ghi số câu đã có; báo khi chạm giới hạn | Ít chữ; đa số không bao giờ chạm 20; câu báo cần con số từ API (`ASSUMPTION`) |

## D6 — Người Free và tính năng AI

Bối cảnh: Pro "Chưa mở bán"; màn hết lượt "không mời mua" (UI-CONTEXT); design Bước 7 §19: dạng AI ở màn mở phiên "gắn nhãn Pro"; Free gọi "Tra bằng AI" nhận `entitlement-required`.

| Phương án | Trade-off |
|---|---|
| Ẩn hẳn | Gọn; người Free không biết app có AI, tới lúc mở bán phải làm lại màn |
| Hiện nhưng khóa, nhãn Pro | Người học biết có AI; không mời mua |
| Hiện kèm đường tới trang Gói học | Dẫn tới nơi giải thích gói; gần với mời mua |
| ✅ Hiện, khóa, nhãn Pro; bấm → "Dành cho gói Pro. Gói Pro chưa mở bán." + link Gói học; không nút mua | Đúng §19; có chỗ giải thích; không có hành động mua |

## D7 — Nút "Xem gói học" ở màn hết lượt

| Phương án | Trade-off |
|---|---|
| Giữ | Dẫn tới trang gói; trái "không mời mua" đã chốt 20/10 |
| ✅ Bỏ | Đúng quyết định 20/10; xem lại khi Pro mở bán |

## D8 — Chỗ của "Báo lỗi của tôi" và dòng "Đã trả lại 1 lượt"

| Phương án | Trade-off |
|---|---|
| Cài đặt (trong avatar) | Gom việc cá nhân; xa nơi làm bài |
| Trang Luyện tập | Gần bài; trang đã nhiều khối |
| ✅ Tab trong trang Lịch sử luyện tập | Báo lỗi gắn với câu đã làm; chưa có hệ thống thông báo trong app nên đây là chỗ duy nhất thấy việc trả lượt |
| Chỗ khác | — |

## D9 — Phiên đang dở

Bối cảnh: Bước 4 (W/51) đặt thẻ ở cột phụ; design Bước 7 §6.7 tả một câu hỏi "[Làm tiếp] [Bỏ, mở phiên mới]" khi mở trang Luyện tập.

| Phương án | Trade-off |
|---|---|
| Chỉ thẻ ở cột phụ | Không làm phiền; có thể bỏ phiên cũ mà không biết khi mở phiên mới |
| Hỏi mỗi lần mở trang Luyện tập (§6.7) | Không bỏ sót; phiền khi chỉ vào xem |
| ✅ Thẻ ở cột phụ; hỏi chỉ khi bấm mở phiên mới lúc còn phiên cũ | Không phiền; chặn đúng lúc phiên cũ sắp bị đóng; chỉ đổi giao diện, phải sửa chữ ở §6.7 (API giữ nguyên) |

## D10 — Cài đặt admin

Bối cảnh: Bước 4–7 thêm khoảng 33 khóa cài đặt; API chia 6 nhóm (`reminders`, `learning`, `practice`, `entitlements`, `content`, `ai`); A/60 có khối
"Mẫu email" mà API chưa có.

| Phương án | Trade-off |
|---|---|
| (a) Gộp vào trang "Thông báo & giới hạn" | Một trang dài |
| (a) Tách theo nhóm thành nhiều trang | Mỗi trang ngắn; sidebar thêm 4–5 mục |
| ✅ (a) Một trang "Cài đặt hệ thống", 6 tab theo nhóm của API | Khớp API; sidebar không phình; "Thông báo & giới hạn" thành hai tab đầu |
| (b) Giữ khối "Mẫu email" làm bản vẽ cho sau | Có sẵn hình; dễ hiểu nhầm là đã làm được |
| ✅ (b) Bỏ khối, ghi "bàn sau" | Màn đúng với API |

## D11 — Màn admin

Bối cảnh: chủ dự án ghi 15/10/2026 rằng lớp hình thức của admin sẽ làm lại; design Bước 6 D8 ghi chủ dự án tự làm các màn AI của admin.

| Phương án | Trade-off |
|---|---|
| Vẽ đầy đủ trên page 04 theo style hiện tại | Đẹp ngay; công sức trau chuốt có thể bỏ khi làm lại admin |
| Chờ đợt làm lại admin | Không vẽ hai lần; code admin Bước 4–7 thiếu bản vẽ |
| ✅ Vẽ trên page 04 ở mức khung (cột, bộ lọc, trạng thái, khác nhau `admin`/`editor`) | Giữ cấu trúc và trường hợp biên, không tốn công hình thức |
| Màn AI Bước 6: không vẽ, giữ 3 placeholder (đề xuất của Claude) | Đúng D8 Bước 6 |
| ✅ Màn AI Bước 6: vẽ trong đợt này | Chủ dự án: "làm luôn đi bạn"; đổi ghi chú D8 Bước 6 |

## D12 — Hồ sơ người học

Bối cảnh: đợt sửa Bước 0–3 thêm Tên, Họ, Ngày sinh (13+), ô đồng ý điều khoản; API cho sửa tên (`PATCH /v1/me`), không cho sửa ngày sinh ("Ngày sinh không
sửa qua API — mốc tuổi không bị lách", phần 1 của các đề xuất duyệt cùng design đợt sửa Bước 0–3); trang `/terms` đã có trên landing nhưng là bản nháp.

| Phương án | Trade-off |
|---|---|
| ✅ (a) Tên, Họ sửa ở Cài đặt → Tài khoản | API đã có |
| (b) Ngày sinh không hiện (đề xuất vòng 1 của Claude) | Bớt dữ liệu cá nhân trên màn; không sửa được nên không cần hiện |
| (b) Ngày sinh sửa được (chủ dự án: "sửa được nhé") | Người học sửa được khi gõ nhầm; trái lựa chọn đã duyệt ở đợt sửa Bước 0–3; cần đổi API |
| ✅ (b) Vòng 2: sửa được, ngày mới vẫn phải đủ 13 tuổi; mockup vẽ ô sửa; đổi API là việc sau | Sửa được khi nhầm, mốc tuổi vẫn giữ; ghi việc API ngoài đợt |
| (b) Vòng 2: sửa tự do, không kiểm 13 tuổi | Đơn giản; lách được mốc tuổi |
| (c) Vẽ trang Điều khoản | Có hình đủ; nội dung pháp lý cần luật sư |
| ✅ (c) Chỉ link tới `/terms` có sẵn | Đúng phạm vi mockup; nội dung là việc trước ra mắt |

**Chủ dự án (vòng 2):** "Đồng ý: ngày sinh sửa được, ngày mới vẫn phải đủ 13 tuổi; mockup vẽ ô sửa, đổi API là việc sau."

## D13 — Bản tối

| Phương án | Trade-off |
|---|---|
| Vẽ page riêng như page 06 | Thấy rõ từng màn; gấp đôi khung |
| ✅ Chế độ Dark của biến màu + 4–5 màn mẫu (Hôm nay, phiên luyện, Gói học, tấm Thêm từ) | Bớt khoảng 1/3 khung; cần gắn biến cho hai bóng đổ tô cứng trước |

## D14 — Ngôn ngữ và chữ giao diện

| Phương án | Trade-off |
|---|---|
| Chỉ tiếng Việt; tiếng Anh kiểm khi code (đề xuất của Claude) | Ít khung; chữ tiếng Việt thường dài hơn nên đã là trường hợp chật nhất (`ASSUMPTION`) |
| Thêm bản tiếng Anh cho vài màn chính | Thấy trước chữ tiếng Anh; thêm khung |
| ✅ Research cách viết tiếng Việt tự nhiên, dễ đọc, rồi làm bản chữ giao diện (bảng thuật ngữ + chữ từng màn), duyệt trước khi vẽ; mockup chỉ tiếng Việt | Chủ dự án: "bạn nên đi research và học cách dùng tiếng Việt làm sao để cho nó tự nhiên và dễ đọc nhất, rồi sau đó … làm một bản message sau"; chữ đúng từ đầu; thêm một bước duyệt |

## D15 — Cách vẽ

| Phương án | Trade-off |
|---|---|
| Đi qua mockup HTML bấm thử trước (UI-CONTEXT §1) | Bấm thử sớm; bước HTML vốn để chốt style, style đã chốt |
| ✅ Vẽ thẳng trong Figma + prototype cho 3 luồng Bước 7 | Nhanh hơn; vẫn bấm thử được các luồng mới |

## D16 — Chỗ của Cài đặt (chủ dự án tự nêu)

Chủ dự án: "đổi trang setting nằm chung với dropdown button khi ấn nút vào avatar giúp mình, đó là với web, còn với mobile thì giữ nguyên như hiện tại,
tuy nhiên ở cả 2 nền tảng khi vào trang cài đặt thì mình nghĩ ẩn thanh search đi cho gọn". ✅ Web: Cài đặt là một mục trong menu thả xuống của avatar;
điện thoại: như page 09 (bấm avatar vào Cài đặt); cả hai: trang Cài đặt không có dải tìm kiếm.

## D17 — Thuật ngữ và định dạng (8 câu sau research)

Bối cảnh: research [`../../mockups/2026-10-21/vietnamese-ux-writing-research.md`](../../mockups/2026-10-21/vietnamese-ux-writing-research.md) nêu 8 câu
(Q1–Q8) cần chốt trước khi viết bản chữ giao diện. Claude đề xuất cho cả 8 câu; chủ dự án: "ok".

| Câu | Phương án đưa ra (research + chat) | Chọn |
|---|---|---|
| Q1 "Lượt" mang ba nghĩa (phiên luyện của Free, lượt AI, một lần trả lời) | (a) "lượt" chỉ cho lượt AI, phiên luyện gọi "phiên", một lần trả lời gọi "câu"; (b) giữ "lượt luyện" và "lượt AI", luôn có chữ đi kèm; (c) cách khác | ✅ (a), tách hai kho lượt AI thành "lượt câu AI" và "lượt tra AI" như API |
| Q2 Nhãn cho từ người học tự thêm | "Từ của tôi" (đang có), "Từ của bạn", "Từ tự thêm", "Từ riêng" | ✅ "Từ của tôi" (mockup đang dùng; cách đặt nhãn quen ở app Việt) |
| Q3 Tên gói Free, Trial | "Miễn phí" / "Dùng thử"; giữ "Free" / "Trial" | ✅ "Miễn phí", "Dùng thử"; giữ "Pro" |
| Q4 "Gợi ý" cho cả gợi ý làm câu lẫn nhãn "AI gợi ý" | Giữ cả hai; đổi một bên (ví dụ nhãn "AI tra") | ✅ Giữ cả hai (hai chỗ dùng khác hẳn; nhãn "AI gợi ý" đã có ở design Bước 7) |
| Q5 Đặt dấu thanh | "hoà, thuỷ, khoẻ" (sách giáo khoa 2018); "hòa, thủy, khỏe" (Microsoft, Mozilla) | ✅ "hòa, thủy, khỏe"; quan trọng là thống nhất |
| Q6 Thứ trong tuần giữa câu | "thứ Bảy" (Nghị định 30); "Thứ Bảy" (CLDR, mặc định của `Intl`) | ✅ Theo `Intl` vi-VN ("Chủ Nhật, 18/10"); tránh đặt thứ giữa câu |
| Q7 Giờ trong câu | "20:00"; "8 giờ tối" | ✅ "20:00" (đã chạy thử `Intl` vi-VN) |
| Q8 Tiền VND khi mở bán Pro | "99.000 ₫"; "99.000đ"; "99.000 VND" | ✅ "99.000 ₫" (đã chạy thử `Intl` vi-VN) |

Thêm vào mảng A: mockup ghi "Thứ Bảy, 18 tháng 10" nhưng 18/10/2026 là Chủ Nhật (research phát hiện; Claude kiểm lại bằng `Intl`).

## Mốc 0 — duyệt bản chữ giao diện (21/10/2026, sau khi duyệt plan)

Chủ dự án: "Ok bản chữ giao diện. Q1: đổi Level thành Trình độ. Q2: vẽ email người thao tác ở màn admin và ghi việc API trả email vào design §10." Theo luật hỏi của đợt, Claude đề xuất trước.

| Câu | Phương án đưa ra | Chọn |
|---|---|---|
| Q1 Chữ "Level" trên màn người học | ✅ Đổi thành "Trình độ" (giữ khung giao diện bằng tiếng Việt, N17; sửa chữ nhiều màn có sẵn); giữ "Level" | Chủ dự án, theo đề xuất |
| Q2 Màn admin hiện "ai làm" khi API chỉ trả mã người dùng (cấp gói, báo lỗi, prompt, bộ ví dụ) | ✅ Vẽ email, ghi việc "API trả email" vào design §10 (đổi API là việc ngoài đợt); chỉ vẽ vai trò | Chủ dự án, theo đề xuất |

Cùng bản chữ, Claude tự đổi (chủ dự án duyệt cùng bản chữ): "dạng bài" → "kiểu câu"; "Ôn lại thêm", "Ôn tất cả" trong Luyện tập → "Luyện lại thêm", "Luyện tất cả".

## Mốc A+B — góp ý của chủ dự án (22/10/2026)

Vòng 1, chủ dự án nêu 9 điểm sau khi xem ảnh; Claude sửa điểm 2, 3, 5, 6, 7 (phần giao diện), 8, 9 theo đúng góp ý: form điện thoại gọn hơn; mức sử
dụng chuyển vào Cài đặt và bỏ khỏi Gói học ("thanh usage không để ở subscription plan"); bỏ dòng "Tra từ / …"; điện thoại có nút quay lại ở trang con;
Cài đặt chia mục (thông tin cá nhân, gói và mức sử dụng, học tập, thông báo, tài khoản); thẻ chủ đề có 3–5 từ và màn chọn từ; web có đủ các màn điện
thoại có; bỏ khoảng trống phía trên trang Cài đặt điện thoại.

| Câu | Phương án đưa ra | Chọn |
|---|---|---|
| Điểm 1: hỏi tuổi bằng ô tick "Tôi đã đủ 13 tuổi" | Giữ ô Ngày sinh, báo lỗi ngay dưới ô thay màn riêng (đề xuất của Claude; không đổi API); ô tick thay ô Ngày sinh (đổi API, bỏ lưu ngày sinh) | ✅ Chủ dự án, vòng 2: "Bỏ màn k01b đi … chặn ở form nhập luôn, báo đỏ bằng cách báo một dòng lỗi hoặc tô đỏ ô nhập ngày tháng năm sinh" (giữ ô Ngày sinh) |
| Điểm 4: lọc Từ hay sai theo nhóm (API chưa có lọc nhóm) | ✅ Thêm `group_id` cho `GET /v1/practice/weak-words` (đề xuất; ghi design §10) | Chủ dự án, theo đề xuất |
| Điểm 7: thêm từng từ đã chọn (API thêm cả loạt chỉ nhận bộ lọc) | ✅ Thêm `sense_ids[]` cho `POST /v1/groups/{id}/items/bulk` (đề xuất; ghi design §10) | Chủ dự án, theo đề xuất |

Vòng 2, chủ dự án thêm: chọn ngôn ngữ ở màn đầu bằng danh sách thả xuống có cờ (K/06, M/06); sửa gờ dưới của các nút (bị khung bọc cắt mất).

Chủ dự án duyệt mốc A+B (22/10/2026): "Ok mốc A+B. Hai việc API theo đề xuất: thêm group_id cho Từ hay sai và sense_ids[] cho thêm cả loạt, ghi vào design §10. Sang mốc C."

## Mốc C – F+G — duyệt không kèm góp ý (22/10/2026)

Các mốc sau được duyệt mà không có câu hỏi mở nào; những điều Claude tự quyết khi vẽ ghi ở as-built (`docs/deliveries/dot-giao-dien.md`).

| Mốc | Chủ dự án |
|---|---|
| C — điện thoại: Luyện tập, Gói học | "Ok mốc C, sang mốc D-web." |
| D-web — Bước 7 trên web | "Ok mốc D-web, sang mốc D-phone." |
| D-phone — Bước 7 trên điện thoại | "Ok mốc D-phone, sang mốc E." (kèm việc sửa nhãn gói "Miễn phí" thành "Pro" / "Dùng thử" trên 11 màn web, báo trong lần gửi mốc) |
| E — admin | "Ok mốc E, sang mốc F+G." (kèm việc xóa khung `A/60` và các khung giữ chỗ `A/D02`–`A/D11`, báo trong lần gửi mốc) |
| F+G — bản tối, prototype | "Ok mốc F+G, sang Task 12." |

## Đề xuất kỹ thuật duyệt cùng design (bốn phần, chủ dự án "ok" từng phần)

| Chọn | Bỏ | Vì sao |
|---|---|---|
| Thứ tự: bản chữ giao diện → A, B → C → D (web rồi điện thoại) → E → F, G | Vẽ theo bước 3→7 | Chốt chữ trước để khỏi sửa lại; mảng sửa chỗ lệch và tài khoản nhỏ, làm trước; Bước 7 cần web làm mẫu cho điện thoại |
| Mỗi mảng A–G là một mốc duyệt bằng ảnh | Duyệt một lần cuối đợt | Phát hiện lệch sớm |
| Kiểm mỗi mốc: tương phản ≥ 4,5:1 (chữ), ≥ 3:1 (icon), không tràn khung, một nút vàng mỗi màn, đúng bảng thuật ngữ, đủ trạng thái của bảng 6.2 | — | Giữ mức đã kiểm ngày 20/10 |
| Bảng thuật ngữ áp cho cả màn đã có của page 08, 09 (chỉ sửa chữ) | Chỉ áp cho màn mới | Cách gọi thống nhất |
| Menu avatar trên web: Cài đặt, Gói học, Đăng xuất (**thêm trong bản viết**, chưa trình bày trong chat; chủ dự án duyệt cùng bản viết) | — | Chỗ tự nhiên cho các mục tài khoản (D16) |
| Ký hiệu khung giữ quy ước K/xx, M/xx, A/xx | Đặt tên mới | Khớp page 08, 09, 04 hiện có |
| Màn admin "đang phát triển" đã có API thay bằng màn thật; Dashboard giữ placeholder | Giữ tất cả placeholder | Dashboard chưa có API |
| Việc ngoài đợt ghi ở design §10 (API sửa ngày sinh, chữ §6.7 Bước 7, D8 Bước 6, bản tiếng Anh) | Làm ngay trong đợt | Đợt này chỉ mockup |

## Sau merge — góp ý mobile (22/10/2026)

Sau khi PR #119 vào `dev`, chủ dự án góp 6 điểm cho bản điện thoại, kèm ảnh: "1. Sao lại có khoảng trống ở bên dưới mỗi card? Sửa lại · 2. Mình nghĩ
nên có một đường viền phân biệt để tránh trùng màu với background · 3. Đổi thành dropdown box ở trong chi tiết nhóm · 4. Ở phần flashcard, viền ngoài
vẫn giữ, viền phân chia có thể bỏ · 5. Mấy cái ô chọn như hình cũng ưu tiên sử dụng dropdown box cho gọn giao diện · 6. Các ô có padding Y và X khá
nhiều, giảm xuống lại cho gọn + giảm font size xuống cho nhỏ hơn 1 chút giúp mình, xong mobile rồi mình sẽ xem tiếp web sau".

Không có câu hỏi mở; Claude làm theo cách hiểu dưới đây và gửi ảnh để chủ dự án xem (bản chữ mục 14):

| Điểm | Cách hiểu của Claude (chờ chủ dự án xem) |
|---|---|
| 2 | Viền cho thẻ nhóm và khối đầu trang nhóm (hai chỗ có nền gần màu nền trang) |
| 5 | Ngoài các ô ở ảnh (Tùy chỉnh phiên), đổi luôn các hàng chip chọn khác trên điện thoại sang danh sách thả xuống: Từ hay sai, Danh sách nhóm, bộ lọc của Tra từ và Thêm cả loạt; nút bật Lưới / Danh sách giữ nguyên |
| 6 | "Các ô" là ô nhập, ô chọn, thẻ lựa chọn và dải tra đầu màn; nút chính giữ nguyên |

## Góp ý web (22/10/2026, sau khi duyệt mobile)

Chủ dự án duyệt mobile ("ok, mobile ổn"), PR #120 vào `dev`; rồi góp 15 điểm cho web, thêm "Các thay đổi mình nêu ở mobile thì cũng sẽ thay đổi ở web luôn,
cái nào thuộc đặc trưng của mobile thì có thể bỏ đi" và "bổ sung 15: mobile cũng vậy". Chữ và khung: bản chữ mục 15. Các điểm chủ dự án nhờ đề xuất được vẽ thẳng để
xem, chờ chủ dự án chọn:

| Điểm | Đề xuất của Claude (chờ chủ dự án) | Nguồn tham khảo |
|---|---|---|
| 1, 4 Nền đỡ trống | Một component họa tiết mờ 12% (thẻ từ, ô trống, trắc nghiệm, dạng chia, hộp ngăn) đặt sau trang đăng ký, đăng nhập và trang thẻ ôn; tránh vùng form và thẻ | — |
| 2 Lâu chưa ôn | Giữ trang (API có danh sách cân nhắc) nhưng làm lại: link quay lại thay nút "Về nhóm", một nút vàng, dòng ngữ cảnh, cột "Quá hạn", thẻ giải thích "Vì sao có danh sách này?". Cách khác chưa vẽ: gộp thành một tab trong trang nhóm | — |
| 3 Chân trang | Chân trang vừa (thương hiệu + 3 nhóm link + bản quyền + ngôn ngữ), không lặp menu chính, chỉ trên trang web có thanh trên | Tóm tắt nghiên cứu NN/g về chân trang (uxcel.com/lessons/footers-best-practices-643; blog.logrocket.com/ux-design/website-footer-design-practices) |
| 10 Gợi ý | Danh sách gợi ý đánh số có chấm tiến độ; gợi ý chưa mở là một nút "Mở gợi ý n" kèm phím H | — |
| 15 Bản tối | Nền than lạnh ít bão hòa; thẻ sáng hơn nền theo độ nổi; mảng tô vàng, xanh lá, đỏ giảm độ đậm màu | m2.material.io/design/color/dark-theme (bề mặt nổi hơn thì sáng hơn, dùng xám đậm thay đen); material.io/blog/tone-based-surface-color-m3 |

Claude tự quyết: điểm 9 áp cho cả thẻ của trang Luyện tập (K/51–K/55) lẫn thẻ câu trong phiên; điểm 11 và 12 áp cả cho phone vì đó là dữ liệu chung; các điểm còn lại
chỉ web (mobile đã duyệt). Thứ tự lý do báo lỗi do dữ liệu seed quyết định, nên ghi việc đổi seed vào design §10.
