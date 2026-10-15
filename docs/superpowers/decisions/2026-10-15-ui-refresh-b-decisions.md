# Decisions — Làm mới giao diện landing và admin theo hướng B

Ngày: 15/10/2026. Đi kèm design doc
[`../specs/2026-10-15-ui-refresh-b-design.md`](../specs/2026-10-15-ui-refresh-b-design.md).
File này gom **mọi quyết định đã chốt** trong lúc brainstorm (15/10/2026): 12 câu hỏi Q1–Q12 và 5 phần design trình bày bằng
mô phỏng bấm được. Mỗi quyết định có các phương án đã đưa ra trong chat, trade-off, phương án được chọn. Design doc mô tả *cách
làm*; file này trả lời *tại sao chọn vậy và đã bỏ gì*.

Bối cảnh chung: cùng ngày, chủ dự án xem mockup trong `docs/mockups/2026-10-15/` và chọn landing B "Năng lượng"; admin mặc áo
B nhưng giữ sidebar của admin A, đầu trang trắng, motion nhanh (100/150/200/250ms), chỉ nút và toast có độ nảy. Chủ dự án
dặn "khoan hả build": mới tới bước thiết kế.

**Nhãn:** ✅ = phương án được chọn. **Ai chốt:** "Chủ dự án" = chọn trực tiếp trong chat; "Duyệt cùng design" = trợ lý đề xuất
trong lúc trình bày một phần design, chủ dự án duyệt cả phần đó.

## Tóm tắt

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| UB1 | Phạm vi "làm mới" | Chỉ phần nhìn; giữ stack, route, code hành vi | Chủ dự án |
| UB2 | Thứ tự | Landing → admin (sau PR #19) → Deploy API + admin → Bước 3 | Chủ dự án |
| UB3 | Chỗ đặt token chung | Package riêng `packages/design-tokens` | Chủ dự án |
| UB4 | Ô tick đồng ý của waitlist | Giữ ô tick bắt buộc, vẽ lại theo B | Chủ dự án |
| UB5 | Các phần và chữ của landing | Đủ 7 phần, giữ chữ đã duyệt | Chủ dự án |
| UB6 | Bài điền từ ở Hero | Một thẻ như mockup B | Chủ dự án |
| UB7 | Mục audit cần thêm chữ | Nút ở header + nút ở hai thẻ Gói học | Chủ dự án |
| UB8 | Chi tiết lô nhập và publish job | Panel bên cạnh, giữ URL | Chủ dự án |
| UB9 | Ba form của admin | Dialog, giữ URL | Chủ dự án |
| UB10 | Sửa B25E30 | Có, thành task riêng | Chủ dự án |
| UB11 | Bản tham chiếu hình ảnh | Mockup HTML + duyệt ảnh chụp | Chủ dự án |
| UB12 | Toast ở admin | Chỉ cho đổi/gỡ vai trò | Chủ dự án |
| UB13 | Icon ở menu admin | Giữ icon | Chủ dự án |
| UB14 | Dọn miếng dán khi tab chạy nền | Dọn ngay khi tab hiện lại (thêm mốc thứ ba) | Chủ dự án (vòng 2 của phần 4) |
| UB15 | Màu viền ô nhập và chữ gợi ý | `#7d84a8` và `#5f6688` thay giá trị mockup | Duyệt cùng design (phần 1) |
| UB16 | Header landing | Dính và có nút từ 48rem; dưới 48rem như hiện nay (cách 1) | Duyệt cùng design (phần 2); chủ dự án chốt vòng 2 lúc viết plan |
| UB17 | Chữ của các nút mới | Dùng lại `Nav.cta` có sẵn, không thêm chuỗi mới | Duyệt cùng design (phần 2) |
| UB18 | Trần thời lượng chuyển động landing | ≤ 400ms | Duyệt cùng design (phần 2) |
| UB19 | Số plan | Một design doc, hai plan; plan admin sau PR #19 | Duyệt cùng design (phần 5) |
| UB20 | H1 bản VI dòng cuối một chữ ("…thực / tế") | Sửa: `text-wrap` cho tiêu đề (chủ dự án chọn `balance`, triển khai bằng `pretty`) | Chủ dự án (sau review) |
| UB21 | Nơi commit tài liệu | Đi cùng PR #22 (commit docs riêng) | Chủ dự án (sau review) |
| UB22 | Panel chi tiết ở màn hẹp hơn khoảng 1320px | Trượt đè lên bảng; chỉ chia đôi khi bảng vẫn đủ rộng | Chủ dự án (lúc viết plan admin) |
| UB23 | Hiệu ứng lúc đóng ở admin | Có ở menu, ngăn kéo, panel, 3 form; toast và 4 hộp xác nhận đóng ngay | Chủ dự án (lúc viết plan admin) |

## UB1 — Phạm vi "làm mới giao diện" (Q1)

Bối cảnh: memory của dự án ghi phải hỏi "refactor" gồm những gì (chỉ phần nhìn, hay cả stack và cấu trúc) trước khi lập plan.
Hành vi admin (session, API client, B25E1–E29) phải giữ.

| Phương án | Trade-off |
|---|---|
| ✅ Chỉ phần nhìn | Đổi token, font, bố cục, motion; giữ stack, route và code hành vi. Ít rủi ro, test hành vi giữ nguyên. Ý nào của mockup đụng route thì hỏi riêng |
| Cả cấu trúc và stack | Được đổi thư viện UI, route, cách chia component. Tự do hơn, nhưng phải viết lại nhiều test và dễ làm hỏng edge case B25E |

Về sau, UB8, UB9 (route hiển thị khác, URL giữ), UB10 (sửa lỗi đã ghi) và UB12 (thêm toast) là các ngoại lệ được chốt riêng.

## UB2 — Thứ tự làm (Q2)

Bối cảnh: M3 của Bước 2.5 (PR #19) đang chờ CI; bước "Deploy API + admin" chưa xếp lịch; Bước 3 là mốc pilot.

| Phương án | Trade-off |
|---|---|
| ✅ Landing → admin → Deploy | Landing làm ngay vì không phụ thuộc M3; admin ngay sau khi M3 merge; rồi Deploy và Bước 3. Đội ngũ nhận admin lần đầu đã là giao diện mới. Deploy và Bước 3 lùi thêm thời gian của hai việc |
| Landing → Deploy → admin | Deploy admin với giao diện hiện tại trước, rồi mới đổi giao diện admin (trước Bước 3). Deploy sớm hơn; admin cũ lên production một thời gian |
| Chỉ landing, admin để sau Bước 3 | Pilot đến sớm nhất; admin mới đến muộn nhất, phần admin của design có thể cũ đi khi tới lúc làm |

## UB3 — Chỗ đặt token chung (Q3)

Bối cảnh: cả hai app dùng Tailwind v4 `@theme`. Đã kiểm trong phiên: `pnpm-workspace.yaml` có sẵn `packages/*`; CI và `cf:docker`
cài cả workspace; tài liệu Tailwind v4 cho phép đặt `@theme` trong package riêng của monorepo.

| Phương án | Trade-off |
|---|---|
| ✅ Package riêng | Một file `theme.css`; mỗi app `@import` rồi thêm token riêng. Một nguồn duy nhất, app học sau này dùng lại được, không thêm thư viện ngoài. Rủi ro: Next/Turbopack đọc CSS từ package workspace là `ASSUMPTION`, kiểm ở task đầu |
| Chép vào từng app + test so khớp | Không thêm package; test của app này phải đọc file của app kia; sửa token phải sửa hai chỗ |
| Mỗi app tự giữ, không ràng buộc | Đơn giản nhất; hai app dễ lệch màu và nhịp theo thời gian |

## UB4 — Ô tick đồng ý của waitlist (Q4)

Bối cảnh: W4 (08/10) đã hai lần chốt giữ ô tick ở cả hai form. Bản tóm tắt Điều 9 Luật 91/2025 trong
`LEGAL_PAGES_RESEARCH_2026-10-11.md`: đồng ý phải rõ ràng, lưu lại được, im lặng không phải đồng ý (chưa đối chiếu văn bản gốc).
Audit landing nói ô tick làm 15–25% người bỏ dở (không ghi nguồn). Mockup B dùng dòng chữ dưới nút. Bỏ ô tick là đổi hành vi
server, ngoài phạm vi UB1.

| Phương án | Trade-off |
|---|---|
| ✅ Giữ ô tick, làm lại theo B | Ô tick bắt buộc vẽ lại theo áo B; server và test không đổi. An toàn hơn với luật, đổi lại một cú bấm |
| Bỏ ô tick, dùng dòng chữ | Ít bước hơn; phải bỏ điều kiện consent ở server, sửa LP15/LP30; việc đủ theo Điều 9 hay không là `ASSUMPTION` |
| Tạm giữ, chờ kiểm luật | Giữ trong lần làm này, ghi là việc mở; bỏ sau nếu văn bản gốc hoặc luật sư cho phép |

## UB5 — Các phần và chữ của landing (Q5)

Bối cảnh: mockup B chỉ có Hero, Ba bước, CTA cuối; trang thật có 7 phần. Menu của mockup có link "Gói học", "Hỏi đáp", nên
mockup là mẫu phong cách. Chữ của mockup khác chữ đã duyệt (H1 khác).

| Phương án | Trade-off |
|---|---|
| ✅ Đủ 7 phần, giữ chữ | Mỗi phần mặc áo B; mockup chỉ quyết phong cách. Đúng UB1, test nội dung giữ nguyên |
| Đủ 7 phần, Hero dùng chữ mockup | H1 và câu phụ của Hero lấy từ mockup; phải viết bản EN và duyệt lại chữ |
| Rút gọn như mockup | Chỉ Hero, Ba bước, CTA cuối (có thể thêm FAQ). Trang ngắn; mất phần AI và gói học, phải xóa code và test |

## UB6 — Bài điền từ ở Hero (Q6)

Bối cảnh: hiện là carousel 3 thẻ (vuốt/kéo, mũi tên, phím ←→, 800ms, khoảng 300 dòng code kéo vuốt). Mockup B là một thẻ có
"Câu tiếp", 3 vạch tiến độ, miếng dán bay vào khi đúng, rung khi sai.

| Phương án | Trade-off |
|---|---|
| ✅ Một thẻ như B | Bỏ vuốt, kéo, mũi tên; giữ nội dung (gợi ý, giải thích, bản dịch, màn Xong). Bớt phần code khó nhất và chuyển động 800ms. Mất vuốt ngang trên điện thoại; LP21 và LP28 viết lại |
| Giữ carousel, đổi áo | Giữ vuốt, kéo, mũi tên, phím ←→; 800ms → 400ms; thêm bay vào. Giữ phần code khó; hiệu ứng bay vào khó làm đúng khi dải thẻ đang cuộn |

## UB7 — Mục audit cần thêm chữ mới (Q7)

Bối cảnh: ba mục audit tự giải quyết khi mặc áo B (form trước bài luyện trên điện thoại, thứ tự thẻ "Cách hoạt động", nhịp màu
nền); ô tick và chữ nút đã quyết ở Q4, Q5; "bằng chứng xã hội" để ngoài vì chưa có số liệu. Câu hỏi cho phép chọn nhiều.

| Phương án | Trade-off |
|---|---|
| ✅ Nút đăng ký ở header | Một nút góc phải header, cuộn tới form Hero; dự kiến thêm 1 chuỗi chữ |
| ✅ Nút ở hai thẻ Gói học | Mỗi thẻ một nút cuộn tới form; dự kiến thêm 2 chuỗi chữ |
| Huy hiệu ở phần Vấn đề | Thêm 2 chuỗi; dễ trông như quảng cáo; áo B đã tách hai cột bằng màu |
| Không thêm chữ nào | Chỉ lấy các mục bố cục; đúng tuyệt đối "giữ chữ" |

Vòng 2 (phần 2 của design): đọc code thấy `Nav.cta` đã có ở cả VI và EN nhưng chưa dùng, nên cả ba nút dùng lại chuỗi này; không
thêm chuỗi mới (UB17). Cũng thấy header hiện không dính, nên đề xuất UB16.

## UB8 — Chi tiết lô nhập và publish job (Q8)

Bối cảnh: mockup admin-b mở chi tiết lô ở panel bên phải bảng; code hiện tại mở ở trang riêng `/uploads/:id`, nơi chạy polling,
luật đá ra khi mất quyền (B25E6) và luồng e2e thật (3). Publish job cũng có trang riêng.

| Phương án | Trade-off |
|---|---|
| Giữ trang riêng (trợ lý đề xuất) | Mặc áo B; không đổi route; link chia sẻ được; test hành vi giữ nguyên. Mất cái lợi "vừa xem chi tiết vừa thấy bảng" |
| ✅ Panel bên cạnh, giữ URL | Giống mockup: `/uploads/:id` hiện bảng kèm panel (route lồng); điện thoại panel phủ cả màn hình; vẫn chia sẻ link được. Phải tái cấu trúc route, xử lý focus cho panel không chặn trang, viết lại một phần test; vượt UB1 |

Chủ dự án chọn phương án không được đề xuất; đây là ngoại lệ đầu tiên của UB1.

## UB9 — Ba form của admin (Q9)

Bối cảnh: Upload CSV, Tạo publish job, Đăng ký nguồn hiện là trang riêng (`/…/new`). Mockup mở Upload CSV bằng dialog. Sau UB8,
form có thể dùng cùng kiểu route lồng.

| Phương án | Trade-off |
|---|---|
| ✅ Dialog, giữ URL | Giống mockup; `/uploads/new` hiện bảng kèm dialog; đóng thì về danh sách; upload xong sang `/uploads/:id` và panel mở. Cùng kiểu route lồng với UB8 nên làm một lần. Đang gửi thì không đóng được |
| Giữ trang riêng | Ít việc hơn, test form giữ nguyên; lệch mockup; hai kiểu mở (panel cho chi tiết, trang cho form) nằm cạnh nhau |

## UB10 — Sửa B25E30 (Q10)

Bối cảnh: tải lại trang quá nhanh làm `POST /v1/auth/refresh` trả 429; app đá về `/login` không báo dù cookie còn hợp lệ. Ngày
15/10/2026 chủ dự án ghi "sửa khi refactor giao diện admin". Phần sửa nằm gọn trong `session-store.ts`.

| Phương án | Trade-off |
|---|---|
| ✅ Có, thành task riêng | Một task riêng trong plan admin, hai commit (test lỗi trước, sửa sau); giữ màn đang tải, hiện "Thử lại sau N giây" theo `Retry-After`, tự thử lại, không bỏ phiên. Đúng lời hẹn; commit giao diện vẫn tách bạch |
| Không, để việc riêng sau | Lần làm này thuần giao diện; sửa bằng nhánh `fix/*` nhỏ lúc khác; lỗi còn lâu hơn |

## UB11 — Bản tham chiếu hình ảnh (Q11)

Bối cảnh: landing và admin trước đây đều có bước Figma được duyệt trước khi code. Lần này chủ dự án duyệt bằng mockup HTML;
mockup chưa có: đăng nhập, quên/đổi mật khẩu, Nguồn, Xuất CSV, danh sách publish job, trạng thái rỗng/đang tải/lỗi, trang
Chính sách, 404.

| Phương án | Trade-off |
|---|---|
| ✅ Mockup HTML + duyệt ảnh chụp | Không vẽ Figma; màn chưa có dựng từ token và component chung; sau task dựng khung của mỗi app, chụp ảnh 1440 và 390 để duyệt rồi mới làm tiếp; Figma cũ ghi lỗi thời. Nhanh nhất; màn chưa có chỉ thấy khi đã có code |
| Mở rộng mockup HTML trước | Thêm các màn còn thiếu vào mockup, duyệt xong mới code; có hình duyệt trước cho mọi màn; thêm khoảng một phiên làm việc |
| Vẽ lại Figma (như M0) | Đầy đủ nhất và giữ thói quen cũ; tốn nhiều thời gian nhất |

## UB12 — Toast ở admin (Q12)

Bối cảnh: admin chưa có toast. Đổi/gỡ vai trò xong thì dialog đóng, dòng đổi, không báo gì; hoàn tác lô đã có thông báo trên
trang chi tiết; upload và tạo publish job chuyển sang chi tiết. `react-aria-components` 1.22.1 có Toast với nhãn `UNSTABLE_`.

| Phương án | Trade-off |
|---|---|
| ✅ Chỉ cho đổi/gỡ vai trò | Hai thao tác hiện không báo gì; thêm 2 chuỗi chữ; Toast của React Aria bọc trong component riêng để khi API đổi chỉ sửa một chỗ |
| Cho mọi thao tác xong | Thêm cho cả đổi/gỡ vai trò, upload, tạo publish job, hoàn tác lô (5 chuỗi); đồng nhất nhưng trùng với thông báo và panel đã có |
| Không thêm toast | Ít việc nhất; đổi vai trò vẫn không có lời xác nhận |

## UB13 — Icon ở menu admin (duyệt phần 3)

Bối cảnh: lần duyệt Figma ngày 14/10, chủ dự án yêu cầu thêm icon Lucide vào menu; mockup B không có icon. Mô phỏng phần 3 có
công tắc bật/tắt icon để so.

| Phương án | Trade-off |
|---|---|
| ✅ Ổn, giữ icon | 16 mục dễ quét mắt hơn, nhất là khi menu thành ngăn kéo trên điện thoại |
| Ổn, bỏ icon như mockup | Gọn, yên hơn; bỏ được `nav-icons.ts` |

## UB14 — Dọn miếng dán khi chuyển động không chạy xong (duyệt phần 4, hai vòng)

Bối cảnh: khi tab chạy nền, trình duyệt có thể dừng chuyển động; sự kiện kết thúc không bắn.

- **Vòng 1:** trợ lý trình bày: trạng thái của app không chờ chuyển động; miếng dán còn treo được dọn bằng hẹn giờ. Bản mô
  phỏng để miếng dán treo 2,2 giây rồi mới biến mất.
- **Vòng 2:** chủ dự án sửa: "trường hợp nó chạy không hết thì khi nó chạy lên thì cho nó biến mất gần như ngay lập tức chứ
  đừng hold 1-2s". Trợ lý thêm mốc thứ ba: khi trình duyệt báo tab đã hiện lại (`visibilitychange`), gỡ miếng dán trong một
  khung hình; lý do: hẹn giờ của tab chạy nền bị trình duyệt làm chậm tới 1 giây hoặc hơn. Mô phỏng sửa lại đo được dọn sau
  một khung hình. Chủ dự án duyệt.

| Phương án | Trade-off |
|---|---|
| Chỉ hẹn giờ (vòng 1) | Đơn giản; nhưng hẹn giờ bị ghìm khi tab chạy nền, miếng dán có thể treo 1–2 giây sau khi quay lại |
| ✅ Mốc sớm nhất trong ba: chuyển động xong, 480ms, tab hiện lại | Không còn miếng dán treo khi quay lại; thêm một listener phải dọn khi unmount |

## UB16 — Header landing trên điện thoại và máy tính bảng (ba vòng)

- **Vòng 1 (phần 2 của design):** trợ lý đề xuất header dính ở mọi bề rộng, có nút `Nav.cta`, "ở 390 vẫn hiện nút, cỡ nhỏ".
  Chủ dự án duyệt cả phần 2.
- **Vòng 2 (lúc viết plan landing, 15/10/2026):** trợ lý ước tính rồi dựng bản đo bằng Lexend thật: logo + VI/EN + nút
  "Đăng ký nhận tin ra mắt" không vừa một hàng ở 390 và 320 (test hiện có kiểm cả 320, Review#2). Chủ dự án chọn "cách 1".

| Phương án | Trade-off |
|---|---|
| Theo design vòng 1 (đủ logo, VI/EN, nút chữ dài) | Không vừa một hàng ở 390 và 320, gây cuộn ngang |
| ✅ Cách 1: dưới 48rem không nút, không dính; từ 48rem dính + nút | Không thêm chữ, không chiếm chiều cao trên điện thoại; form Hero nằm trong màn đầu, dải CTA ở cuối; audit cũng chỉ đòi nút ở desktop. Đổi lại: đang ở giữa trang trên điện thoại thì không có lối tắt tới form |
| Cách 2: nút thay đổi ngôn ngữ, logo chỉ còn `_ _` | Không thêm chữ; đổi ngôn ngữ khó tìm hơn (chỉ còn ở footer); có thể vẫn tràn ở 320 |
| Cách 3: chữ ngắn mới "Đăng ký" / "Sign up" trên điện thoại | Có lối tắt ở mọi nơi; lệch UB17 (thêm 2 chuỗi); header dính chiếm khoảng 3,5rem chiều cao khi cuộn |

- **Vòng 3 (sau review cả nhánh, 15/10/2026):** khi làm Task 4, trợ lý tự đưa hai link nav lên từ `lg` (1024), vì ở 768 logo +
  hai link + VI/EN + nút không vừa một hàng với chữ 125% (test RF4). Reviewer chỉ ra đây là một đánh đổi design mà chủ dự án
  chưa thấy (ảnh điểm dừng chỉ có 1440 và 390). Chủ dự án chọn giữ.

| Phương án | Trade-off |
|---|---|
| ✅ Giữ: link từ 1024 | 768–1023 có logo, VI/EN và nút đăng ký; đã đo vừa một hàng kể cả chữ 125%. Máy tính bảng không có hai link trên header |
| Link từ 768, nút nhỏ hơn | Đủ hai link từ 768 bằng cách thu nhỏ nút và khoảng cách; phải đo lại ở 768 với chữ 125%, có thể vẫn không vừa |
| Nút từ 1024, link từ 768 | 768–1023 có hai link nhưng không có nút đăng ký; lệch UB16 (nút từ 768) |

## UB20 — H1 bản VI kết thúc bằng một chữ (sau review)

Bối cảnh: rà soát bằng `design:design-critique` thấy H1 bản VI ở 1440 và 390 ngắt thành "…ngữ cảnh thực / tế" (dòng cuối chỉ một
chữ ngắn); rủi ro "Lexend rộng hơn" của design (UBE18).

| Phương án | Trade-off |
|---|---|
| ✅ Sửa bằng `text-wrap: balance` | Trình duyệt chia dòng đều, không đổi chữ, một commit nhỏ |
| Để nguyên | Giữ cách ngắt hiện tại |

Triển khai: đo trên trang thật, Chrome **không** cân dòng một khối có `<br>` ép xuống dòng (`balance` để nguyên "…thực / tế");
`text-wrap: pretty` cho "từ ngữ cảnh / thực tế", cùng mục đích, nên dùng `pretty` (ruling ghi trong delivery record). Trình duyệt
chưa hỗ trợ `pretty` giữ cách ngắt cũ.

## UB21 — Nơi commit tài liệu (sau review)

Bối cảnh: design, decision record, plan, delivery, bản tổng hợp quy trình, 5 mockup và 2 tài liệu nghiên cứu nằm chưa commit ở thư
mục chính; PR #20 (tài liệu Bước 2.5) đã merge.

| Phương án | Trade-off |
|---|---|
| ✅ Thêm vào PR #22 | Một commit docs riêng; PR tự đủ, link trong design không gãy khi vào `dev`; cập nhật luôn CLAUDE.md và HANDOFF. PR to hơn |
| PR tài liệu riêng | Nhánh `docs/*` riêng vào `dev` như D28 của Bước 2.5; PR code gọn, nhưng design chưa có trong `dev` cho tới khi PR docs merge |
| Để sau | Giữ chưa commit |

## UB22 — Panel chi tiết ở màn laptop (lúc viết plan admin, 15/10/2026)

Bối cảnh: design §6.3 đặt panel `26rem` cạnh bảng từ `64rem`. Tính theo mockup (sidebar `15.5rem`, lề `0.75rem`): ở 1280 bảng
còn khoảng 600px, dưới ngưỡng `40rem` (chủ dự án chốt 14/10) nên bảng tự đổi thành thẻ ngay khi mở panel. Trình bày bằng mô phỏng
có thanh kéo bề rộng. Giả định (`ASSUMPTION`) đội dùng laptop 13–14 inch ở 1280 hoặc 1366.

| Phương án | Trade-off |
|---|---|
| ✅ B. Đè khi hẹp | Dưới khoảng 1320px panel trượt đè từ phải, có nền mờ; bảng giữ nguyên là bảng. Đổi lại: ở 1280 không bấm được bảng khi panel đang mở |
| A. Chia đôi luôn (design lúc đó) | Từ 1024px panel luôn nằm cạnh; ở 1024–1315px bảng thành thẻ xếp dọc khi mở panel, thành bảng lại khi đóng |

Triển khai: ngưỡng đặt `84rem` (1344px) thay 1320px, để chừa thanh cuộn dọc của Windows (khoảng 17px) mà bảng vẫn đủ `40rem`.

## UB23 — Hiệu ứng lúc đóng ở admin (lúc viết plan admin, 15/10/2026)

Bối cảnh: design §6.2/§6.6 cho mọi thứ mờ dần 150ms khi đóng. Đọc code và thư viện thấy hai chỗ khó: Toast của React Aria 1.22.1
không có trạng thái `entering`/`exiting` (chỉ hỗ trợ View Transitions, cách này chặn bấm chuột trên cả trang khoảng 150ms mỗi
lần toast tắt); 4 hộp xác nhận (hoàn tác lô, đổi vai trò, tạo tài khoản, publish toàn bộ) được tạo mới mỗi lần mở để mỗi lần
bấm là một yêu cầu riêng, muốn mờ dần phải viết lại phần đã có test bấm đúp. Trình bày bằng mô phỏng bấm được.

| Phương án | Trade-off |
|---|---|
| ✅ B. Mờ dần trừ toast và 4 hộp xác nhận | Form, panel, menu, ngăn kéo mờ dần 150ms; toast và 4 hộp xác nhận biến mất ngay. Không đụng code hành vi; khác design ở 2 chỗ đó |
| C. Đóng ngay mọi nơi | Chỉ có hiệu ứng lúc mở. Ít code nhất, đồng nhất; mất cảm giác mượt lúc đóng |
| A. Mờ dần mọi nơi | Đúng design. Phải viết lại 4 hộp xác nhận và dùng View Transitions cho toast |

## Phần 1 — trình bày lại bằng mô phỏng

Lần đầu phần 1 (token chung) chỉ trình bày bằng chữ. Chủ dự án trả lời: "mình không phải dân designer, nên bạn có thể mô phỏng
hay giải thích cho mình hiểu được không". Trợ lý trình bày lại bằng khung bấm được (đổi một màu thì cả hai app đổi, bảng màu và
chỗ dùng, ô tìm kiếm trước/sau khi sửa, bốn tốc độ chuyển động), rồi chủ dự án duyệt. Các phần 2–5 sau đó đều có mô phỏng.

## Đề xuất kỹ thuật duyệt cùng design (không hỏi riêng)

| Chủ đề | Chọn | Phương án bỏ | Lý do |
|---|---|---|---|
| UB15 Viền ô nhập admin | Viền 1,5px `#7d84a8` | Không viền như mockup (1,14:1); viền `#c4c9e2` (1,64:1) | Luật của dự án (LP12) đòi viền ô nhập ≥ 3:1; `#7d84a8` đạt 3,66 trên trắng, 3,31 trên canvas |
| UB15 Chữ gợi ý | `#5f6688` | `#6a7192` của mockup (4,32:1 trên canvas) | Đạt 5,07 trên canvas |
| Font | Lexend; landing qua `next/font`, admin đổi link Google Fonts hiện có | — | Có bộ chữ tiếng Việt (đã kiểm); không thêm thư viện |
| UB16 Header landing | Dính ở đầu màn hình (vòng 2 thu lại: chỉ từ 48rem, xem mục UB16) | Header không dính như hiện nay | Nút đăng ký ở header chỉ có ích khi luôn thấy |
| UB17 Chữ nút mới | Dùng lại `Nav.cta` | Thêm 1 + 2 chuỗi mới như Q7 dự kiến | Chuỗi đã có ở VI và EN mà chưa dùng; cả hai gói đều dẫn tới cùng một danh sách chờ |
| UB18 Thời lượng landing | ≤ 400ms; thẻ rơi vào 400ms | 600ms của mockup; 800ms hiện tại | NN/g: từ 500ms trở lên thấy lê thê |
| Motion admin | Animation chỉ khai báo khi máy không bật giảm chuyển động | — | React Aria thấy 0 animation nên gỡ ngay (đã đọc mã `react-aria` 3.53.1) |
| Lớp phủ kẹt | Quy tắc chỉ gắn animation qua `data-entering`/`data-exiting` + test mở/đóng nhanh | — | Đọc mã: animation đóng bị hủy thì React Aria không gỡ phần tử |
| Panel và bảng | Panel báo xong thì làm mới dòng trong bảng | — | Tránh dòng ghi "Đang chạy" khi panel ghi "Hoàn tất" |
| UB19 Plan | Một doc, hai plan; plan admin sau PR #19 | — | Plan admin không bị cũ nếu M3 còn đổi |

**Chỉ có trong design doc, chưa trình bày riêng trong chat** (chủ dự án duyệt khi đọc doc): chiều cao nút/ô nhập admin 2,5rem
theo mockup (hiện 2rem); B25E30 thử lại tối đa 3 lần, mặc định 10 giây khi thiếu `Retry-After`; lỗi ở form CTA cuối dùng ô trắng
vì chữ đỏ trên nền vàng chỉ đạt 4,24:1; bỏ action `prev`/`goTo` của reducer bài điền từ; `aria-disabled` thay `disabled` và
chuyển focus sang "Câu tiếp" khi đúng.
