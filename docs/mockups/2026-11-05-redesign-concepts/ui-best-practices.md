# Best practice UI cho Wordmet (08/11/2026)

Bản rút gọn để thiết kế và duyệt màn hình. Mỗi dòng là một quy tắc kiểm được trên một màn cụ thể.

Nguồn:
- Figma Resource Library: [graphic design principles](https://www.figma.com/resource-library/graphic-design-principles/) (13 nguyên tắc), [UI design principles](https://www.figma.com/resource-library/ui-design-principles/) (7 nguyên tắc), [typography](https://www.figma.com/resource-library/typography-in-design/), [color theory](https://www.figma.com/resource-library/what-is-color-theory/). Đọc ngày 08/11/2026.
- Luật nhà của taste-skill.
- Các quyết định đã có trong `context-2026-11-07.md`.

Số tương phản dưới đây đo bằng công thức WCAG ngày 08/11/2026, không ước lượng.

## 1. Thứ bậc (hierarchy) và điểm nhấn (emphasis)

| Quy tắc | Áp vào Wordmet |
|---|---|
| Mỗi màn có **một** việc chính và **một** nút chính | Đăng nhập: nút "Đăng nhập". Nút Google là nút phụ, "Quên mật khẩu?" là link. Bảng giá: chỉ gói Pro được tô sáng. |
| Kích thước là tín hiệu mạnh nhất, dùng 2–3 cỡ chữ có việc làm rõ | Tiêu đề trang 64/38 px, tiêu đề card 24–32 px, chữ đọc 16–17 px. Không thêm cỡ ở giữa. |
| Tương phản cao chỉ dành cho chỗ quan trọng nhất | Màu nhấn navy `#1e3a8a` (đổi từ `#2445d6` ngày 08/11/2026) chỉ cho nút chính, link và một điểm nhấn mỗi màn. Vàng `#ffd84a` chỉ để tô từ đích. |
| Điều quan trọng nằm ở chỗ mắt chạm đầu tiên (mẫu F/Z) | Form: tiêu đề, câu dẫn, ô nhập, nút, theo một cột trái. Trang chủ: tiêu đề, mô tả, nút, rồi mới tới ảnh minh họa. |

## 2. Căn lề (alignment), gần nhau (proximity), khoảng trắng (white space)

| Quy tắc | Áp vào Wordmet |
|---|---|
| Căn trái mặc định, chỉ căn giữa một khoảnh khắc ngắn | Form và bài pháp lý căn trái. Hero, 404, tiêu đề phần có thể căn giữa. |
| Thứ liên quan đứng gần nhau, nhóm khác cách bằng khoảng trắng, không bằng đường kẻ | Họ và Tên chung một hàng. Nhãn cách ô 6 px, ô cách ô 16 px, nhóm cách nhóm 24–32 px. |
| Khoảng giữa các phần lớn hơn rõ khoảng trong một phần | Bậc khoảng cách: 4, 8, 12, 16, 24, 32, 56, 80, 120. Khoảng giữa các phần trang chủ 64–120 px. |
| Một lưới, một cặp lề | Desktop: cột nội dung 1160 px, lề 140 px. Mobile: lề 16 px, cột 358 px. |

## 3. Lặp lại (repetition), nhất quán (consistency), thống nhất (unity)

- Một khái niệm một thành phần: nút, ô nhập, thẻ từ, ô đáp án đều là component trong trang "Hệ thống" của file Figma. Màn mới dùng lại, không vẽ lại.
- Một khái niệm một từ: app gọi là "nhóm" thì landing cũng gọi là "nhóm", không gọi "bộ thẻ".
- Bo góc chọn một lần (chủ dự án 09/11/2026: nút và hộp thoại bớt tròn): nút hành động 10 px (biến `radius/button`), hộp thoại, tấm trượt, menu nổi, thanh nổi 16 px (`radius/modal`), card 14–28 px, ô nhập và ô tìm 10 px, tab điều hướng 8 px, nhãn và chip đếm 6 px. Card nằm trong hộp thoại 12 px (góc trong không lớn hơn góc ngoài). Tròn hẳn theo Figma: công tắc, nút chia đoạn, ảnh đại diện, nút tăng giảm số câu và huy hiệu (design giao diện mới §3.1).
- Mọi card có bóng (chủ dự án, 09/11/2026): card, bảng, hộp kết quả dùng bóng hai lớp màu ink trung tính, không ánh màu accent (`--shadow-card`, Figma Shadow/Card); ô chọn, chip, ô từ dùng bóng nhẹ (`--shadow-row`, Shadow/Row); hộp thoại, thanh nổi, menu dùng `--shadow-pop` (Shadow/Pop). Dòng trong bảng không có bóng riêng. Nút có bóng màu (chủ dự án giữ, 09/11/2026, sau khi xem bản không bóng): nút chính bóng navy, nút xanh và đỏ bóng cùng màu nút, nút phụ bóng navy rất nhẹ; nút bị tắt không có bóng.

## 4. Màu (color) và khả năng tiếp cận (accessibility)

| Cặp màu | Tương phản | Dùng được cho |
|---|---|---|
| ink `#1b2444` trên bg `#f6f7fa` | 14,18 | mọi chữ |
| muted `#525a78` trên bg / surface | 6,34 / 6,79 | chữ phụ, gợi ý ô nhập |
| accent navy `#1e3a8a` trên trắng, chữ trắng trên accent (đo 08/11/2026) | 10,36 | link, nút chính |
| accent navy trên bg / trên accent-soft `#e7ecf8` | 9,67 / 8,76 | link, tab đang chọn |
| accent navy so với chữ ink `#1b2444` | **1,47** | quá gần nhau: link phải khác chữ thường bằng độ đậm, mũi tên hoặc gạch chân, không chỉ bằng màu |
| ink trên mark `#ffd84a` | 10,98 | từ được tô vàng |
| pass `#1b7a46` / fail `#b8352a` trên nền nhạt của nó | 4,64 / 4,90 | chữ Đúng/Sai (vừa đủ 4,5) |
| ghost `#c9cedc` trên bg | **1,47** | chỉ trang trí hoặc trạng thái chuyển, **không** cho chữ cần đọc |
| Dark: ink, muted, accent trên nền tối | 16,06 / 7,66 / 7,13 | đạt |

- Ngưỡng: chữ thường ≥ 4,5:1, chữ lớn (≥ 24 px, hoặc ≥ 19 px đậm) ≥ 3:1.
- Đúng và Sai chỉ chênh 1,09:1 về độ sáng, nên luôn kèm icon và chữ, không báo bằng màu một mình.
- Mọi phần tử bấm được có viền focus 3 px màu nhấn. Vùng chạm trên điện thoại ≥ 44 px.

## 5. Chữ (typography)

- Chữ đọc 16 px trở lên. Figma gợi ý line-height 120–145%; Wordmet dùng **160–170%**, vì dấu tiếng Việt chồng hai tầng (ví dụ "ặ", "ễ") cần chỗ.
- Độ dài dòng 45–75 ký tự: form rộng 360–440 px, bài pháp lý 680–700 px.
- Tiêu đề không quá 2 dòng, không để một chữ rơi một mình xuống dòng cuối.
- Hai họ chữ chính (Noto Sans, Bricolage Grotesque). Độ đậm: 400, 600, 700 cho chữ thường; 800 cho tiêu đề và số lớn Bricolage (chủ dự án chốt 09/11/2026, GM18 của design giao diện mới).
- Tiêu đề có thể xuống dòng: line-height ≥ 1,15 (an toàn 1,2), vì dấu tiếng Việt chồng hai tầng ở độ đậm 800 cần khoảng 1,13 lần cỡ chữ. 1,0 chỉ cho số và tiêu đề một dòng. Không cắt tiêu đề bằng `overflow: hidden` (chủ dự án đồng ý 09/11/2026, theo khảo sát GM18).
- Hành động phụ và lối đi tới trang khác dùng component "Nút chữ" (chủ dự án chọn mẫu C, 09/11/2026):
  - không nền, không gạch chân, chữ 14 đậm vừa màu navy;
  - "Thêm…" có icon +; đi tới trang khác thì giữ "→" trong nhãn;
  - Hủy và Để sau dùng chữ xám, Xóa dùng chữ đỏ;
  - chữ gạch chân chỉ dành cho liên kết nằm giữa câu, ví dụ "Điều khoản sử dụng".
- Ngoại lệ (chủ dự án chốt 09/11/2026): app người học dùng thêm JetBrains Mono 12 px, chữ thường, cho nhãn nhỏ (ví dụ "noun · A2", "câu 7 / 20"), theo `style-da-chon.md`. Không dùng mono cho chữ đọc, tiêu đề hay nút.
- Không viết hoa toàn bộ cho nhãn nhỏ. Chữ hoa chỉ ở đầu câu và tên riêng.

## 6. Hé lộ dần (progressive disclosure) cho form

- Hỏi ít nhất ở mỗi bước. Đăng ký hỏi tên, ngày sinh, email, mật khẩu. Ngôn ngữ đọc nghĩa hỏi ở bước "Chào mừng" sau đó.
- Nhãn luôn hiện phía trên ô; placeholder không thay nhãn.
- Ràng buộc nói trước, dưới ô (ví dụ "Tối thiểu 8 ký tự…"). Lỗi nằm ngay dưới ô gây lỗi, theo dạng "chuyện gì xảy ra + việc cần làm".
- Nút chính tắt khi chưa đủ điều kiện (chưa tick đồng ý). Có trạng thái đang gửi.
- Màn có nhiều bước thì cho biết đang ở bước mấy.

## 7. Chuyển động (movement, motion)

- Phản hồi khi bấm hoặc rê chuột: 150–250 ms. Vào trang, vào phần: theo tài liệu motion (`motion-va-chuyen-canh.md`, vào khoảng 300–340 ms); tài liệu motion là nguồn duy nhất cho số chuyển động (design giao diện mới §3.1).
- Chỉ animate transform, opacity và blur. Người bật "giảm chuyển động" thấy ngay trạng thái cuối.
- Mỗi màn tối đa một chuyển động gây chú ý: hero hiện từng từ, viền gói Pro sáng chạy, card 404 hiện từ mờ.

## 8. Bảng giá

- Một card cho mỗi **gói** (Miễn phí, Pro). Các kỳ của Pro có cùng quyền lợi, nên mỗi kỳ là một ô chọn có giá riêng, không phải một card quyền lợi riêng.
- Giá gạch ngang là **giá mua lẻ theo tháng** (3 × 79.000 ₫, 12 × 79.000 ₫), nên phần giảm là thật. Không bịa một "giá gốc" cao hơn để tạo giảm giá.
- Kỳ dài ghi kèm giá quy ra mỗi tháng và phần trăm tiết kiệm.
- Gói nổi bật được viền sáng và glow. Gói còn lại phẳng, để mắt so được ngay.

## 9. Câu chữ trên giao diện

Theo `~/.claude/rules/vietnamese-writing.md`:
- Nút dùng động từ cộng đối tượng.
- Không chấm cuối nút và nhãn.
- Không kể chi tiết hệ thống người học không cần (VietQR, payOS, ngăn ôn, hạn mức AI). Chủ dự án ghi chú ngày 08/11/2026.
