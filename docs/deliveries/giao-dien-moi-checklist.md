# Checklist tự kiểm giao diện người học mới (M1–M9, 12/11/2026)

Bản gọn để chủ dự án tự xem lại toàn bộ giao diện mới của Wordmet trên nhánh `claude/giao-dien-moi-m9-3adf51`. Chi tiết từng milestone: [`giao-dien-moi.md`](giao-dien-moi.md) (plan tóm tắt và as-built). Quyết định đã tự chốt khi làm: [`giao-dien-moi-rulings.md`](giao-dien-moi-rulings.md). Design (khung Figma từng màn ở §9): [`../superpowers/specs/2026-11-09-giao-dien-moi-design.md`](../superpowers/specs/2026-11-09-giao-dien-moi-design.md).

Mỗi dòng: **Màn**, **Mở bằng**, **Kiểm gì**, **Sáng/Tối** (xem cả hai chế độ, trừ khi ghi khác), ô tick. Mọi URL dưới đây thêm tiền tố `http://localhost:3001/vi/app` (trừ khi ghi khác).

## 0. Bắt đầu

- **Stack:** `pnpm bootstrap` của nhánh này đã chạy. Web học `http://localhost:3001/vi/app`, trang công khai `http://localhost:3001/vi`, admin `http://localhost:5173`, Mailpit `http://localhost:8025`.
- **Người học Pro:** `pnpm bootstrap seed` in email và mật khẩu của tài khoản người học Pro và của admin (xem [`docker-bootstrap.md`](docker-bootstrap.md)). Admin và web học dùng chung cookie trên `localhost`: muốn học bằng tài khoản người học thì đăng xuất admin trước.
- **Tài khoản Miễn phí:** đăng ký mới ở `/register`; mã 6 số nằm trong Mailpit. Tài khoản mới cũng đi qua `/complete-profile` và `/welcome` (M2). Free có 15 lượt câu AI (xem [`cloze-own-then-ai.md`](cloze-own-then-ai.md)).
- **Tài khoản trial:** ở `apps/api`, `pnpm learner:setup --plan trial` (xem [`chuan-bi-launch-a-checklist.md`](chuan-bi-launch-a-checklist.md)). Chỉ cần cho hai khung Gói học (trial, tự gia hạn).
- **Đổi sáng / tối:** trong app, Cài đặt (`/settings`) → hàng "Giao diện" → Sáng · Tối · Theo hệ thống. Trang công khai: nút ở thanh trên (từ 768 px) hoặc ở chân trang (dưới 768 px).
- **Đổi khổ:** Chrome DevTools → Ctrl+Shift+M → đặt rộng 390, 768, 1024, 1440 (cột "Khổ" ở dưới chỉ ghi khổ cần xem riêng). Tải lại trang sau khi đổi khổ.
- **Phím tắt:** `N` mở Thêm từ; `L` bật/tắt Lịch; `/` vào ô Tìm từ; `F` mở bảng chọn nhóm (trang Nhóm). Các phím không chạy khi con trỏ đang ở ô nhập.
- **Ảnh đối chiếu:** `apps/web/test-results/shots/gm-m9/<bộ>/<tên>-<sáng|tối>-<khổ>.png` (ví dụ `gm-m5/customize-ai-dark-1440.png`; không commit, chỉ có trên máy này). Khung Figma của từng màn ở design §9. Bộ gm-m9 chụp 68 khung mỗi chế độ ở 4 khổ.
- **Dữ liệu cần có:** nhóm có từ đến hạn, nhóm trống, nhóm tên dài. Seed có nội dung mẫu nhưng ít khi đủ lịch sử; ô nào cần dữ liệu thêm thì ghi trong cột "Kiểm gì".

## M1. Nền và khung app

| Màn | Mở bằng | Kiểm gì | Sáng/Tối | ☐ |
|---|---|---|---|---|
| Thanh trên (máy tính) | Mọi trang trong app, ≥ 768 px | Logo, 4 tab, nút "Thêm từ" có phím N, ô "Tìm từ" có phím `/`, chip gói, menu ảnh đại diện; tab không xuống dòng ở 768 px; không tràn ngang | Cả hai | ☐ |
| Thanh trên và thanh tab dưới (điện thoại) | 390 px | Thanh trên gọn, thanh tab dưới cố định, bấm từng tab đổi trang; không tràn ngang | Cả hai | ☐ |
| Nền và chữ | Hôm nay | Nền lưới chấm, chữ Noto Sans, tiêu đề Bricolage; bóng của card nhẹ | Cả hai | ☐ |
| Phím N | Bấm `N` ở Hôm nay | Mở hộp Thêm từ; gõ trong ô nhập không mở lại; chuyển trang thì hộp đóng | Cả hai | ☐ |
| Đang tải | Tải lại cứng (Ctrl+Shift+R) ở Hôm nay, Nhóm, một nhóm | Thấy khung xương, không có vòng quay; xong thì nội dung thay vào | Sáng | ☐ |
| Màn lỗi | DevTools → Network → chặn một request API → tải lại | Có chữ lỗi và nút "Thử lại"; bấm sau khi bỏ chặn thì tải lại được | Sáng | ☐ |

## M2. Đăng nhập và tài khoản

Đăng xuất trước. Ảnh đối chiếu: bộ `gm-m2`.

| Màn | Mở bằng | Kiểm gì | Sáng/Tối | ☐ |
|---|---|---|---|---|
| Đăng nhập | `/login` | Cột form 400 px; từ 1280 px có panel thương hiệu bên phải; nút mắt hiện/ẩn mật khẩu không gửi form; ô Turnstile luôn hiện; Đăng nhập sai báo lỗi dưới ô | Cả hai | ☐ |
| Đăng ký | `/register` | Có ô "Nhập lại mật khẩu"; nhập lệch thì không gửi, lỗi dưới ô; ngày sinh dưới 13 tuổi bị chặn; cần tick điều khoản | Cả hai | ☐ |
| Xác minh email | Sau khi đăng ký (đi một mạch) | Chỉ có 6 ô mã; gõ, dán cả 6 số, xóa lùi đều chạy; mã lấy từ Mailpit. Tải lại trang thì hiện thêm ô "Mật khẩu" (đã chốt, giữ như vậy) | Cả hai | ☐ |
| Quên mật khẩu | `/forgot-password` | Card 480 px, hai quầng sáng; gửi email xong có thông báo | Cả hai | ☐ |
| Đặt mật khẩu mới | Link trong email ở Mailpit | Mã 6 ô, hai ô mật khẩu; nhập lệch thì lỗi dưới ô | Cả hai | ☐ |
| Bổ sung hồ sơ | Tài khoản mới chưa có tên hoặc ngày sinh: `/complete-profile` | Form hồ sơ trong card; lưu xong sang Chào mừng | Cả hai | ☐ |
| Chào mừng | `/welcome` (tài khoản mới) | Chọn ngôn ngữ; chọn xong vào Hôm nay | Cả hai | ☐ |
| Hoàn tất đăng ký Google | `/google/complete` | Chỉ vào được khi đang đi qua đăng nhập Google (cần `GOOGLE_FAKE_ENABLED=true` hoặc Google thật). Không thử được thì bỏ qua | Sáng | ☐ |
| Đã xóa tài khoản | `/account-deleted` | Trang hiện sau khi xóa tài khoản ở M7 (xem dòng "Xóa tài khoản"); không bị đưa về đăng nhập | Cả hai | ☐ |

## M3. Hôm nay và Nhóm

Ảnh đối chiếu: bộ `gm-m3`. Cần Pro có vài nhóm; một nhóm trống và một nhóm tên rất dài nếu có.

| Màn | Mở bằng | Kiểm gì | Sáng/Tối | ☐ |
|---|---|---|---|---|
| Hôm nay | `/` | Khối "ôn tiếp" có nút Học và Ôn (nút có việc chờ tô navy); "Lần luyện gần nhất" chỉ hiện khi đã luyện; hàng "Nhóm của bạn" chia đều, không cuộn ngang; "Xem tất cả N nhóm" | Cả hai | ☐ |
| Hôm nay, khổ hẹp | 390, 768, 1024, 1440 | Số thẻ nhóm vừa chỗ (2 ở 390, 5 ở 1024, 4 ở 1440); không tràn ngang; ít nhóm thì nửa hàng để trống (đã chốt) | Sáng | ☐ |
| Nút "+" | Hôm nay, điện thoại | Mở Thêm từ; nút lịch nằm ngay trên nút này | Sáng | ☐ |
| Nhóm (băng chuyền) | `/groups` | Phím ← →, vuốt, cuộn ngang, nút mũi tên đổi nhóm; ↓ mở nhóm; chồng bên cạnh mờ | Cả hai | ☐ |
| Bảng chọn nhóm | Phím `F` ở `/groups` | Gõ tìm không dấu; ↑ ↓ Enter chọn; Esc đóng | Cả hai | ☐ |
| Một nhóm | Mở một nhóm từ `/groups` | Đầu trang có chồng thẻ, chip "hôm nay", thanh nhịp ôn; chip lọc đổi danh sách; hàng từ 5 cột; thẻ bay khi mở và đóng nhóm. Không có khối xem trước thẻ (đã chốt: bỏ) | Cả hai | ☐ |
| Từ lâu chưa ôn | Từ khối cảnh báo trong một nhóm, `/group/backlog` | Số lớn, đoạn giải thích, chọn tất cả; thanh nổi dưới chỉ hiện khi đã chọn từ | Sáng | ☐ |
| Chủ đề | `/topic` | Danh sách có chọn tất cả; thanh nổi dưới như trên | Sáng | ☐ |
| Hộp Tạo nhóm, Đổi tên | Nút "Nhóm mới" ở `/groups`; menu ⋯ của một nhóm | Hộp theo `Dialog` mới; Esc đóng; Enter gửi | Cả hai | ☐ |
| Hộp Xóa nhóm, Bỏ từ, Bỏ khỏi việc học | Menu ⋯ của nhóm; chọn từ trong nhóm | Hộp xóa có khối cảnh báo; sau khi xóa về `/groups` (dùng nhóm thử) | Cả hai | ☐ |

## M4. Tra từ, trang một từ, Thêm từ

Ảnh đối chiếu: bộ `gm-m4`. Hộp "Kết quả tra bằng AI" cần AI (seed dùng AI giả nếu chưa có khóa thật).

| Màn | Mở bằng | Kiểm gì | Sáng/Tối | ☐ |
|---|---|---|---|---|
| Tra từ | `/lookup` | Ô tìm lớn; câu bộ lọc có menu trình độ, chủ đề, loại từ; trang từ điển có chữ cái đầu, IPA, loại từ viết tắt; ↑ ↓ đổi mục; "Trang sau →" / "← Trang trước" | Cả hai | ☐ |
| Tra từ, thẻ nhấc lên | Chọn một mục | Thẻ có UK/US, ngăn đang học; sáu chồng nhóm bấm để thêm ("✓ đã có" sau khi thêm); "Mở trang từ →" | Cả hai | ☐ |
| Tra từ (điện thoại) | 390 px | Thẻ và chồng nhóm đứng trước trang từ điển | Sáng | ☐ |
| Ô "Tìm từ" trên thanh trên | Bấm `/` ở Hôm nay, gõ một từ, Enter | Sang `/lookup?q=…`; trên Tra từ thì ô trên thanh trên ẩn | Sáng | ☐ |
| Trang một từ | Nút "Mở trang từ →", hoặc `/word?…` | Tiêu đề lớn, UK/US, tab nhảy trong trang; nghĩa theo loại từ có ngăn hoặc "Thêm vào nhóm"; "Câu bạn đã gặp", "Cùng chủ đề". Từ của tôi có "Sửa từ", "Xóa từ" ở đầu trang | Cả hai | ☐ |
| Thêm từ (Hộp 1, 5) | `N`, gõ một từ | Dòng dạng gốc ("went → go · quá khứ của go"); hàng nghĩa có radio hoặc "đã có trong nhóm"; Hộp chọn nhóm có ô màu và thanh sáu ngăn nhỏ; nút "Lưu" | Cả hai | ☐ |
| Thêm câu (Hộp 2) | Từ trang một từ: "Thêm câu đã gặp" | Thẻ "mặt sau thẻ"; lưu được câu | Cả hai | ☐ |
| Thêm cả loạt (Hộp 3) | Trong hộp Thêm từ, chọn thêm cả loạt | Dán nhiều từ, thấy kết quả từng từ | Sáng | ☐ |
| Kết quả tra bằng AI (Hộp 4) | Thêm từ chưa có trong từ điển (cần AI) | Hai cột với thẻ xem trước; lưu thành từ riêng được | Cả hai | ☐ |
| Sửa từ, Xóa từ, Câu đã gặp | Từ riêng của tôi trên trang một từ | Ba hộp mở đúng, Esc đóng, xóa có xác nhận (dùng từ thử) | Sáng | ☐ |

## M5. Luyện tập, Học, Ôn

Ảnh đối chiếu: bộ `gm-m5`. Cần Pro cho câu AI; thử một lần bằng tài khoản Free để thấy trạng thái thiếu lượt. Chưa có ảnh `session-round` và `recall-answer`, nên hai khung đó phải xem tay.

| Màn | Mở bằng | Kiểm gì | Sáng/Tối | ☐ |
|---|---|---|---|---|
| Luyện tập | `/practice` | Thẻ "Luyện nhanh" có số lớn và câu ví dụ; "Phiên đang dở" hiện khi có; cột phải Gần đây và Phím trong phiên | Cả hai | ☐ |
| Tùy chỉnh phiên | Nút "Tùy chỉnh" ở Luyện tập | Cột "Từ" (nhóm, Mọi từ / Cần ôn / Ưu tiên); bốn kiểu câu; "Câu AI viết" ô − / + có dòng "Tối đa N câu AI · còn M lượt"; chân hộp "Bắt đầu N câu →". Hộp tải sau, lần đầu có thể trống nửa giây (đã biết) | Cả hai | ☐ |
| Tùy chỉnh, Free | Tài khoản Free | Thấy "Hết lượt…" hoặc "Xem gói Pro" khi thiếu lượt AI | Sáng | ☐ |
| Phiên luyện: điền từ | Bắt đầu một phiên | Thanh tiến độ, "câu n / N", chip ✓/✗; chỗ trống tô xanh hoặc đỏ sau khi trả lời; panel "Ngăn 1 ngày → Ngăn 3 ngày" | Cả hai | ☐ |
| Phiên luyện: gõ sai | Gõ sai một câu | Hiện "Chưa đúng" (hộp cam san hô ở chế độ tối), còn được làm lại; Enter gửi lại đúng từ sai | Cả hai | ☐ |
| Phiên luyện: trắc nghiệm | Câu trắc nghiệm, chọn sai | "Bạn chọn" và "Đáp án đúng" đánh dấu; chip "câu AI" và Báo lỗi chỉ trên câu AI | Cả hai | ☐ |
| Báo lỗi câu này | Nút Báo lỗi ở một câu AI | Hộp mở, gửi được; câu xác nhận trỏ tới "Cài đặt → Báo lỗi của tôi" | Sáng | ☐ |
| Tổng kết phiên | Làm hết phiên | Vòng tròn "x/y câu đúng"; khối hiện lần lượt (400 ms, cách 90 ms); "Luyện thêm một phiên" | Cả hai | ☐ |
| Từ hay sai | `/practice/weak` | Chip ✓/✗ thay "sai x/y"; bắt đầu luyện từ sai được | Cả hai | ☐ |
| Học (chồng thẻ) | Nút Học ở một nhóm có từ mới | Hai chồng "Cần ôn lại" / "Đã biết" hai bên; Space lật; 1/← và 2/→ chấm; kéo ngang quá 110 px hoặc vuốt nhanh thì chấm; nút trả lời mờ tới khi lật; Esc dừng | Cả hai | ☐ |
| Học: tổng kết | Hết thẻ | Vòng "x/y thẻ đã biết"; danh sách từ từng chồng | Cả hai | ☐ |
| Ôn (trắc nghiệm, gõ) | Nút Ôn ở nhóm có từ đến hạn | Trắc nghiệm theo nghĩa; ô gõ từ theo nghĩa | Cả hai | ☐ |
| Ôn: so chữ | Gõ sai rồi "Xem đáp án" | Dòng so chữ giữa từ bạn gõ và đáp án; tổng kết "x/y từ đúng" | Cả hai | ☐ |

## M6. Lịch học

Ảnh đối chiếu: bộ `gm-m6`. Cần tài khoản đã học, ôn hoặc luyện ít nhất một ngày.

| Màn | Mở bằng | Kiểm gì | Sáng/Tối | ☐ |
|---|---|---|---|---|
| Nút lịch nổi | Hôm nay, `/groups`, `/lookup` | Dải tháng "T11", ngày hôm nay, huy hiệu chuỗi ngày (ẩn khi 0); rê chuột hiện "Lịch học" và phím L. Điện thoại: nằm trên nút "+"; ẩn ở Từ tồn đọng và Chủ đề | Cả hai | ☐ |
| Lịch | Bấm nút, hoặc phím `L`, hoặc `?lich=` trên URL | Tổng tháng (số từ học, lần ôn, phiên luyện, chuỗi ngày); ngày có chấm; phím mũi tên đổi ngày, Enter mở; "Về hôm nay"; không sang được tháng sau tháng hiện tại | Cả hai | ☐ |
| Ngày | Bấm một ngày có dữ liệu (`?ngay=YYYY-MM-DD`) | Bộ lọc Tất cả / Học / Ôn / Luyện; thẻ Học có chip nhóm (10 chip rồi "+N từ"); thẻ Ôn Đã biết / Cần ôn lại; thẻ Luyện từng phiên, "Xem đủ N câu"; nút ngày trước / sau | Cả hai | ☐ |
| Ngày trống | Bấm ngày không có gì | Hiện câu "chưa học" thay vì khung rỗng | Sáng | ☐ |
| Back/Esc của Lịch | Mở Lịch → Ngày → Back; Esc | Back về Lịch rồi về trang gốc; Esc đóng hết; đóng rồi không tự mở lại | Sáng | ☐ |
| Nút lịch trên thanh phiên | Phiên luyện, Học, Ôn ở 390 px | Nút lịch cuối hàng đầu của thanh phiên; máy tính dùng nút nổi | Sáng | ☐ |
| Báo lỗi của tôi | `/settings/reports`, hoặc menu ảnh đại diện | Chia theo tháng; ngày, kiểu câu, "câu AI" / "Đã trả lại 1 lượt câu AI", trạng thái có chấm màu. Cần đã gửi ít nhất một báo lỗi | Cả hai | ☐ |
| Đường cũ | `/practice/history`, `/practice/history?tab=reports` | Chuyển tới Lịch hoặc Báo lỗi của tôi; không còn trang lịch sử cũ | Sáng | ☐ |

## M7. Cài đặt, tài khoản, gói học

Ảnh đối chiếu: bộ `gm-m7a`, `gm-m7b` (chưa có khung trial và renewing). Gói Pro/Free: so cả hai tài khoản.

| Màn | Mở bằng | Kiểm gì | Sáng/Tối | ☐ |
|---|---|---|---|---|
| Cài đặt | `/settings` | Sáu thẻ mục; Mục lục dính bên trái chỉ từ 1024 px, đổi theo vị trí cuộn; hàng "Giao diện" đổi sáng/tối ngay; một nút "Đăng xuất" | Cả hai | ☐ |
| Menu ảnh đại diện | Bấm ảnh đại diện | Trang đang mở được đánh dấu; có "Báo lỗi của tôi"; Esc đóng | Cả hai | ☐ |
| Tài khoản | `/settings/account` | Thẻ "Hồ sơ" và "Email đăng nhập" (chỉ đọc); "Lưu thay đổi" tắt tới khi có thay đổi | Cả hai | ☐ |
| Xóa tài khoản | `/settings/delete-account` | Thẻ thông tin rồi thẻ xác nhận (từ 768 px thẻ xác nhận ở bên trái); nhập đúng mới bật nút. **Chỉ thử bằng tài khoản thử đã đăng ký mới**: xóa xong về `/account-deleted` | Cả hai | ☐ |
| Lịch sử giao dịch | `/settings/transactions` | Mỗi tháng một thẻ; cấp gói "0 ₫"; "payOS" viết đúng; cần có giao dịch (tài khoản Pro seed, hoặc mua thử ở dòng Gói học) | Cả hai | ☐ |
| Chi tiết giao dịch | Bấm một dòng giao dịch | Hộp rộng 512 px; nút chép mã có toast; Esc đóng và focus về dòng | Cả hai | ☐ |
| Gói học: Free | `/plans` (tài khoản Free) | Hai thẻ cạnh nhau từ 1024 px; thẻ Pro viền accent; ba lựa chọn kỳ (mặc định 12 tháng) kèm phần trăm tiết kiệm; bảng so sánh; link Điều khoản | Cả hai | ☐ |
| Gói học: Pro | `/plans` (tài khoản Pro) | Hiện gói đang dùng; nút Hủy gói (chỉ có với gói tự gia hạn: chỉ provider giả tạo ra) | Cả hai | ☐ |
| Gói học: trial / tự gia hạn | Tài khoản `learner:setup --plan trial` | Hàng gói và ngày hết đúng; ghi chú trial. Câu "không tự gia hạn" ở đầu trang có thể mâu thuẫn hàng gói tự gia hạn (đã biết) | Sáng | ☐ |
| Hủy gói | Nút Hủy gói (nếu hiện) | Hộp xác nhận; sau khi hủy, focus về chỗ hợp lý; chỉ thử với provider giả | Sáng | ☐ |
| Đơn hàng | Bấm "Mua gói Pro …" (provider giả) rồi `/plans/order?…` | Thẻ trạng thái: đang chờ có chấm nhấp nháy, thành công có ngày `dd/mm/yyyy`. **Không thử payOS thật.** Bấm đúp nút mua chỉ gửi một đơn | Cả hai | ☐ |
| Giới thiệu Pro | Tài khoản Free, Hôm nay (hộp tự hiện theo luật quảng cáo, cần `ads_enabled` bật ở admin) | Viền accent, nhãn "Pro" / "có AI", giá "Từ 79.000 ₫ cho 1 tháng", nút "Để sau" | Cả hai | ☐ |

## M8. Trang công khai và SEO

Dùng `http://localhost:3001/vi` (không có `/app`). Ảnh đối chiếu: bộ `gm-m8`. Khổ cần xem cả 390, 1024, 1440.

| Màn | Mở bằng | Kiểm gì | Sáng/Tối | ☐ |
|---|---|---|---|---|
| Trang chủ: hero, dải từ, nhóm từ | `/vi` | Tiêu đề, thẻ hero, các khối cuộn vào có chuyển động; tắt chuyển động trong hệ điều hành thì đứng yên | Cả hai | ☐ |
| Trang chủ: giá | Cuộn tới bảng giá | Ba giá Pro tĩnh kèm % tiết kiệm; kỳ tiết kiệm nhất nổi bật; nút thẻ Pro là "Tạo tài khoản"; ở 1024 px hai thẻ gói xếp dọc, không lấn lề | Cả hai | ☐ |
| Trang chủ: hỏi đáp | Cuộn tới 6 câu | Mở/đóng từng câu; chữ khớp chủ dự án mong muốn (xem mục "Chỗ cần bạn quyết") | Cả hai | ☐ |
| Thanh trên và chân trang | Mọi trang công khai | Đăng nhập (trắng), Đăng ký (navy); nút đổi giao diện ở thanh trên từ 768 px, ở chân trang dưới 768 px; đổi xong tải lại vẫn giữ | Cả hai | ☐ |
| Chính sách bảo mật | `/vi/privacy` | Mục lục dính (thu gọn trên điện thoại); dòng meta có số phiên bản; còn chữ `[[PHIÊN BẢN]]` v.v. (xem mục "Chỗ cần bạn quyết") | Cả hai | ☐ |
| Điều khoản sử dụng | `/vi/terms` | Như trên | Cả hai | ☐ |
| Nguồn dữ liệu | `/vi/sources` | Danh sách nguồn, ghi công hiện cả trên điện thoại; không có nhãn "Dùng cho" | Cả hai | ☐ |
| 404 | `/vi/khong-ton-tai` | Trang 404 có chuyển động, không có thanh trên; có JS mới thấy chữ (đã biết, chưa sửa: tắt JS thì trống) | Cả hai | ☐ |
| Admin: Hỏi đáp trang chủ | `http://localhost:5173/faq` (đăng nhập admin) | Mục menu "Hỏi đáp trang chủ"; thêm, sửa, đăng, xóa một câu thử. Trang chủ đọc FAQ lúc build, nên câu đổi sẽ hiện ở `/vi` sau lần build/deploy sau | Sáng | ☐ |
| SEO | `/vi`, xem nguồn trang | Có `<title>`, description, `hreflang`, JSON-LD (WebSite, SoftwareApplication, Organization). Stack local có `noindex` (đúng thiết kế) | Sáng | ☐ |

## M9. Kiểm thử và chế độ tối

M9 phần lớn là script và token; việc của bạn là xem chế độ tối trên mọi màn ở các dòng trên. Thêm các điểm riêng sau.

| Màn | Mở bằng | Kiểm gì | Sáng/Tối | ☐ |
|---|---|---|---|---|
| Nền tối | Bật Tối ở Cài đặt, xem Hôm nay | Nền mesh tối, quầng vàng nhẹ, hạt mịn; không có mảng trắng hay quầng trắng | Tối | ☐ |
| Bóng và nút tối | Mọi trang | Nút chính không bóng; card, hộp thoại có bóng đen; màu nhóm tối đọc được | Tối | ☐ |
| Lớp mờ hộp thoại | Mở Lịch, Thêm từ, hộp Xóa | Nền sau hộp tối 55 %; chữ trong hộp đọc rõ | Tối | ☐ |
| Giấy Tra từ | `/lookup` | Nền giấy `#1e2334`, chữ đọc được | Tối | ☐ |
| Hộp "Chưa đúng" | Phiên luyện, trả lời sai | Panel cam san hô nền nhạt, viền rõ. Ở 1440 panel che mép dưới thẻ (đã biết) | Tối | ☐ |
| Thanh trình duyệt | Chrome mobile, hoặc DevTools → phần `theme-color` | Màu thanh theo lựa chọn trong app, không theo hệ điều hành; còn đúng sau khi chuyển trang | Cả hai | ☐ |
| Phím tắt trong phiên | Phiên luyện | Chữ phím tắt đọc được ở nền `accent-soft` | Cả hai | ☐ |
| Dung lượng JS | CI của PR | Bước "JS size" xanh. Gần giới hạn: `/recall`, `/practice/session`, `/word`, và `/plans`, `/plans/order` ở 118 % (đã chấp nhận). Lượt CI đầu có thể đỏ ở route PR này không đụng | — | ☐ |
| Lighthouse | `pnpm lighthouse http://localhost:3001` (khi stack đã chạy) | 4 điểm: Performance 100, Accessibility 100, Best practices 100, SEO 66 (do `noindex` local) | — | ☐ |

## Chỗ cần bạn quyết hoặc tự làm

Chỉ liệt kê điều tài liệu ghi là còn mở.

- **Đo khung hình trên điện thoại thật (QM9-7).** Design §14 đòi số này trước PR cuối vào `dev`. Theo [`giao-dien-moi-do-dien-thoai.md`](giao-dien-moi-do-dien-thoai.md); chọn trước: Wi-Fi (đã chốt) hay cắm USB trên Android. iOS chưa thử (Safari Web Inspector cần máy Mac). Các điều kiện trong hướng dẫn chưa chạy thử (cookie `Secure` qua `http://<IP>`, container tới API qua IP, số thẻ đến hạn sau `learner:setup`). Xem cả: kéo ngang để chấm ở Học vẫn cuộn dọc được; mã 6 số tự điền ở ô OTP; font và layout trên màn thật.
- **Văn bản pháp lý (M8).** Chính sách và Điều khoản còn `[[PHIÊN BẢN]]`, `[[NGÀY HIỆU LỰC]]`, `[[EMAIL HỖ TRỢ]]`: nội dung nằm trong DB, bạn đăng bản thật ở admin `/legal`.
- **Chữ 6 câu hỏi đáp (QM8-6).** Bạn chưa duyệt, nhất là ba câu đã viết lại (câu 20, 50, 60). Sửa ở admin `/faq`; câu mới vào trang chủ ở lần build sau.
- **M8c: favicon và ảnh chia sẻ (OG).** Chờ bạn duyệt khung Figma (M8.10) rồi mới code (M8.11). Đến lúc đó icon và ảnh OG vẫn là bản cũ (font Lexend); đây là việc cuối của PR `dev`.
- **R246: chữ Bricolage rộng hơn Figma 6–10 %.** Tiêu đề hero ở 1440 xuống dòng khác Figma. Muốn khớp thì nạp trục optical size, thêm khoảng 90 KB font và đổi cả app. Bạn quyết có làm không.
- **Chưa thử thật:** mua payOS thật, đăng nhập Google thật, Google re-auth khi xóa tài khoản, nút Hủy gói với provider thật.
- **Trình duyệt thật cho hai chỗ ảnh chụp nghi ngờ:** nền cả trang dừng ở 900 px và nút lịch / thanh tab hiện giữa trang ở 390 px (có thể chỉ là lỗi chụp cả trang); quầng vàng trang công khai ở 1024/1440 tối đậm hơn mockup. Cuộn trang ở 390 và 1440 và xem có đúng không.
- **Chưa kiểm:** tiếng Anh (`/en/app`, `/en`) chưa chụp cho mọi bộ; chỉ xem tay vài màn nếu cần. Ảnh gm-m7b trial / renewing, gm-m5 `session-round`, `recall-answer` chưa có.
- **Trước launch (không phải bước này):** đo lại `GET /v1/groups` trên máy chủ thật (local 399 ms, giới hạn 500 ms); Lighthouse và Schema Markup Validator trên domain thật có `NEXT_PUBLIC_INDEXABLE`. Xem [`deploy-checklist.md`](deploy-checklist.md).

## Đã biết, để đợt polish

Đừng báo các điểm này như lỗi mới. Danh sách chốt: QM9-9 trong `docs/superpowers/decisions/2026-11-09-giao-dien-moi-decisions.md` và "Việc dọn chuyển sang đợt polish" trong [`giao-dien-moi.md`](giao-dien-moi.md).

- **Theo mockup bản chốt:** 25 chỗ lệch của audit 11/11 (sửa theo lựa chọn của bạn); đổi "ngăn" thành "Mới, Bậc 1–5" và dùng màu mức (chấm giai đoạn trong "86 từ theo ngăn" ở Hôm nay còn màu cũ); góc bo mức C (phím 4–5, nút 8, dòng 10, card 14, hộp thoại 16 px); bỏ JetBrains Mono, nhãn dùng Noto Sans; chip lọc một dòng ở Một nhóm; danh sách chọn nhóm kiểu B và lưu một từ vào nhiều nhóm; Nhóm kiểu Vòng cung; Học kiểu Chồng thẻ tan mờ; chữ giao diện trong phiên bằng tiếng Anh; từ đích in đậm gạch chân; các chỗ nhỏ khác (card nhóm chỉ ghi số từ, bỏ dòng "Sai: …", gợi ý "e_______", nút Học 40 px).
- **Dọn code (không thấy được):** xóa `app-ui/`, `dark.css`, `island.css`; thu hẹp bốn mục allow của script khóa chữ; sửa `lib/cn.ts` (tiêu đề "Tổng kết Ôn" mất cỡ chữ trên điện thoại); bỏ alias `wide` của `Dialog`.
- **M1:** khung xương thấp hơn header thật ~50 px khi tải cứng; phím N vẫn mở Thêm từ khi menu ảnh đại diện đang mở; màn lỗi không tự hết khi chỉ đổi `?id=`.
- **M2:** Tab tới "Quên mật khẩu?" trước ô Mật khẩu (theo thứ tự Figma); chữ "Đề 12" trên panel thương hiệu còn tiếng Việt ở `/en`.
- **M3:** tiêu đề và số lớn dùng thang cỡ chữ mặc định Tailwind; màu ngăn ở chế độ tối còn giá trị sáng.
- **M4:** Back của trình duyệt về trang 1 của Tra từ; điện thoại chọn mục ở dưới thì thẻ đổi ở chỗ đã cuộn khuất; thẻ cũ không bay đi khi đổi mục; `marked` khớp theo đầu từ ("go" tô "good"); chưa đo thanh trên ở đúng 768 px có tràn ngang không.
- **M5:** bảng phím ghi "H Gợi ý" và "Esc Dừng" khi ô gõ đang chọn (trong ô gõ H là chữ); giữ H mở liền mọi mức gợi ý; "Luyện thêm một phiên" xin lại số câu AI phiên trước dùng thật, không phải số bạn chọn; kéo thẻ Học ngay lúc thẻ mới đang đến thì thẻ không theo tay; thẻ đang tan mất dòng dạng từ.
- **M6:** Ngày: lùi qua đầu tháng thì nút ghi "Lịch tháng 10" nhưng về Lịch tháng 11; ngày hơn 100 mục thì "+N từ" có thể sai; chuyển cảnh Lịch ↔ Ngày chưa trượt ±22 px.
- **M7 (điện thoại):** nút lịch nổi che một phần nội dung ở Cài đặt, Tài khoản, Giao dịch tới khi cuộn; dòng hoàn tiền xuống hai dòng; tiêu đề cột "Miễn phí" của bảng so sánh xuống hai dòng; hai nút hộp Pro xếp dọc. Thêm: heading ở Xóa tài khoản đi h1 → h3 → h2; hộp chi tiết rộng 512 px (Figma 520); thẻ chờ có thêm dòng email hỗ trợ.
- **M8:** điện thoại thẻ hero vẫn có câu ví dụ, chân trang cao hơn khung; tắt JS thì 404 trống (R239); nếu chunk JS không tải được sau khi class `js` đã thêm thì sau 3 giây trang hiện đủ nhưng không có chuyển động (R249); ảnh OG của trang con chưa có hash nội dung (R250).
- **M9:** hộp Tùy chỉnh phiên trống tới khi chunk về; `HouseAd` có thể bỏ lỡ đếm một lần chuyển trang; công cụ chạy tay (`--write-baseline`, `lighthouse.mjs`) còn vài chỗ thô; quầng vàng trang công khai và hàng xen kẽ ở Nguồn dữ liệu (768, tối) chưa so với mockup.
