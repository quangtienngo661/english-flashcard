# Design and accessibility review — landing page Wordmet (Task 11)

Ngày 08/10/2026. Làm theo skill `design:accessibility-review` và `design:design-critique` (plugin `design` 1.2.0;
trợ lý đọc `SKILL.md` rồi làm theo vì skill chưa tải trong phiên) cùng lượt tự soát của `frontend-design`. Bằng chứng:
ảnh `apps/web/test-results/visual/{vi,en}-{desktop,mobile}.png` (tạo bởi `e2e/visual.spec.ts`), đo trên bản build
production. Mọi đề xuất dưới đây **chưa áp dụng**, chờ chủ dự án chọn.

## Đã sửa trong lúc làm (có test chứng minh)

| Lỗi | Cách phát hiện | Sửa |
|---|---|---|
| Trang mobile rộng 467px, cuộn ngang | Ảnh chụp 390 | Lưới dùng `grid-cols-1` (`minmax(0, 1fr)`) |
| Ô email không có viền focus (`outline-none`), WCAG 2.4.7 | e2e `Review#3` | Bỏ `outline-none`; vòng focus trên nền xanh dùng màu trắng |
| Dải vuốt "How it works" không focus được bằng bàn phím | axe `scrollable-region-focusable` (mobile) | `tabIndex=0` + `aria-labelledby` |
| Lề cuối dải vuốt 40px thay vì 20px | e2e `LP29` | Bỏ khoảng trống thừa ở cuối (trình duyệt đã tính padding) |
| Tên đọc của flashcard dính chữ ("deployChạm để lật") | Chẩn đoán e2e | Thêm khoảng trắng giữa hai phần chữ |
| Card bài mẫu chỉ rộng 64% dải (224px trên mobile, nút đáp án xếp một cột) | So ảnh với Figma | Card `w-full` trong vùng nội dung của dải (80%): 280px mobile, 429px desktop, nút 2×2 như Figma |

## Accessibility (WCAG 2.1/2.2 AA)

Tự động: axe không có vi phạm `serious`/`critical` ở VI/EN × desktop/mobile (`LP25`). Bàn phím: thứ tự Tab hợp lý, mọi
điểm dừng có vòng focus (`Review#3`). Phóng to 200% (khung 720px): không cuộn ngang. Cỡ chữ gốc 125%: không vỡ (`LP32`).
Chuyển động: tắt khi bật giảm chuyển động (`LP26`). Không JS: đọc được, FAQ và form vẫn chạy (`LP27`).

| # | Vấn đề | Tiêu chí | Mức | Đề xuất |
|---|---|---|---|---|
| A1 | Ô VI/EN cao 32px | 2.5.8 (AA, ≥24) đạt; 2.5.5 (AAA, 44) chưa | 🟢 Nhỏ | Tăng lên 44px nếu muốn chuẩn cảm ứng của Apple/Google |
| A2 | Ô tick 20×20px (nhãn bấm được nên vùng thực tế lớn hơn) | 2.5.8 đạt nhờ nhãn | 🟢 Nhỏ | Tăng ô lên 24px |
| A3 | `nav` ở header có nhãn "Wordmet" | 4.1.2 | 🟢 Nhỏ | Đổi thành nhãn theo ngôn ngữ ("Điều hướng chính"/"Main") |
| A4 | Nút ‹ ở câu 1 và › ở câu 3 không làm gì nhưng vẫn bật | 3.2 / dễ dùng | 🟡 Vừa | Tắt (`disabled`) hai nút ở hai đầu, hoặc cho quay vòng như prototype Figma |
| A5 | Chưa thử với trình đọc màn hình thật (NVDA/VoiceOver) | — | 🟡 Vừa | Chạy một lượt NVDA trước khi ra mắt |

## Design critique

**Ấn tượng đầu:** tiêu đề lớn và bài điền từ bấm thử được là thứ thu hút mắt đầu tiên, đúng điểm khác biệt của sản phẩm.
Bố cục khớp Figma ở 1440 và 390 (so từng section qua ảnh).

| # | Phát hiện | Mức | Đề xuất |
|---|---|---|---|
| D1 | Trên mobile, form email nằm dưới bài mẫu, cách đầu trang khoảng 800px, nên người dùng phải cuộn mới thấy nút đăng ký | 🟡 Vừa | Giữ (chủ dự án đã chọn đưa bài mẫu lên trên), hoặc thêm nút "Nhận thông báo" nhỏ ngay dưới H1 dẫn xuống form |
| D2 | Các dấu hiệu "trang mẫu" skill `frontend-design` nêu: nhãn VIẾT HOA trên mọi tiêu đề, chuỗi nối "·", "→" trong nút | 🟢 Nhỏ | Chờ chủ dự án quyết (đã nêu 08/10) |
| D3 | Hai form giống hệt (Hero và Final CTA) | 🟢 Nhỏ | Giữ; Final CTA giúp người đọc hết trang không phải cuộn lên |
| D4 | Màu `*-strong` khiến chữ đúng/sai đậm hơn Figma một chút | 🟢 Nhỏ | Cập nhật biến Figma (design-system review, mục "Việc nên làm") |
| D5 | Lần đầu tải trang, các section bên dưới ẩn rồi hiện dần khi cuộn; chụp toàn trang mà không cuộn sẽ thấy trống | 🟢 Nhỏ | Đúng thiết kế; công cụ chụp/preview cần cuộn (đã làm trong `visual.spec.ts`) |

**Điểm tốt:** token và tỉ lệ chữ nhất quán; card cùng hàng cao bằng nhau; trang tĩnh, JS chỉ ở 5 chỗ cần tương tác;
đổi ngôn ngữ giữ nguyên trang.

## Ưu tiên đề xuất

1. **A4** — tắt nút ‹/› ở hai đầu (nhỏ, tránh bấm không có phản hồi).
2. **A5** — một lượt NVDA trước khi ra mắt.
3. **D1** — quyết có thêm lối tắt tới form trên mobile không.
