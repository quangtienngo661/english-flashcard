# Đánh giá mockup 1 bằng taste-skill và Emil Kowalski (02/11/2026)

Bản trước: `1-mot-ngay-truoc.html`. Bản sau: `1-mot-ngay.html`. Chủ dự án yêu cầu thêm: bỏ dòng "Câu AI và tra bằng AI: cần gói Pro" ở gói Miễn phí (đã bỏ).

## Máy đo taste-skill (`inspect.mjs`, 1440 / 768 / 390, Chrome thật)

| | Bản trước | Bản sau |
|---|---|---|
| FAIL | 9 | 1 (`few-pictures`) |
| WARN | 4 | 2 (`size-count`, `no-footage`) |
| Tiêu đề chính | 64px (4,4vw), 3 dòng ở 1440 | 88px (6,1vw), 2 dòng ở 1440, 768 và 390 |
| Nhãn trên tiêu đề | 4 ("7:30 · Sáng"…) | 0: giờ nằm luôn trong tiêu đề ("7:30, ôn thẻ đến hạn") |
| Vật chuyển động | 0 | lớp entrance mỗi phần, phản hồi khi bấm |
| Cỡ chữ đang dùng | 14 cỡ | 10 cỡ |
| Dòng chữ dài nhất | ~100 ký tự | ≤ 60ch |

Chạy với `--allow gradient,shadow,button-fx`: vệt highlight vàng dưới tiêu đề, gờ dưới nút và thẻ là **design system của app** mà chủ dự án muốn landing khớp theo. Theo mục "existing brand" của skill, những thứ đó giữ nguyên và ghi rõ ở đây.

**Còn lại:**
- `few-pictures` (FAIL): skill đòi ít nhất 4 ảnh thật, nhưng trang hiện chỉ có mảnh app dựng bằng HTML (máy đo đếm được 2). Khi làm thật có thể chụp màn app đang chạy (như `e2e-shots`) để làm ảnh. Việc này cần bạn quyết.
- `size-count` (WARN): phần lớn cỡ chữ thừa nằm trong mảnh app (chip, số đếm), vì mảnh app giữ đúng cỡ chữ của app thật.
- `no-footage` (WARN): không có video nào thật về sản phẩm, và mình không dùng video stock.

Mình chưa chạy vòng chấm 14 bước trong `references/critique.md`. Phần "nhìn bằng mắt" chỉ là xem ảnh chụp 1440 và 390 rồi sửa hai chỗ chật (mục dưới).

## Emil Kowalski: chi tiết và chuyển động

| Before | After | Why |
| --- | --- | --- |
| Tiêu đề chính chung cột với chữ, 3 dòng | Tiêu đề chạy hết bề rộng, `text-wrap: balance`, 2 dòng | Một thứ dẫn dắt màn đầu; không bị một từ lẻ ở dòng cuối |
| "7:30 · Sáng" là nhãn nhỏ phía trên tiêu đề | "7:30, ôn thẻ đến hạn" trong chính tiêu đề, số `tabular-nums` | Thông tin nằm trong câu, giờ thẳng hàng |
| Không có chuyển động khi vào trang | Từng phần hiện dần và nhích lên 16px, cách nhau 70ms, 520ms `cubic-bezier(0.23,1,0.32,1)`, chạy một lần | Ease-out mạnh cho cảm giác nhanh; stagger ngắn, không chặn thao tác |
| Không có JS thì sẽ ẩn nội dung | Class `js` + failsafe 2,5s nếu `motion.js` không chạy | Nội dung luôn hiện (đã thử chặn `motion.js`: 0 phần bị ẩn) |
| `prefers-reduced-motion` chưa tính | Bỏ dịch chuyển, chỉ còn mờ-rõ 200ms; bỏ nhấn nút | Giảm chuyển động là ít hơn, không phải bằng 0 (đã thử: 0 phần bị ẩn) |
| Đáp án trong bài luyện hiện ra tức thì | Ô đáp án hiện vào 220ms từ `scale(0.94)`; khung kết quả trượt lên 4px trong 180ms | Không bao giờ hiện từ `scale(0)`; phản hồi dưới 300ms |
| Nút đáp án không có trạng thái nhấn | `:active` lún xuống gờ 0,18rem trong 120ms | Bấm phải thấy app "nghe" mình, giống nút trong app |
| Hover chạy cả trên điện thoại | Hover chỉ khi `(hover: hover)` | Chạm trên điện thoại không kẹt trạng thái hover |
| Màu nền tab/nút đổi tức thì | `background-color 150ms ease` | Đổi màu dùng `ease`, không dùng ease-out |
| Bấm link neo bị thanh trên dính che tiêu đề | `scroll-margin-top: 4.5rem` | Tiêu đề không chui dưới thanh xanh than |
| Viền 1px quanh thẻ gói và hỏi đáp | Nền khác tông, bỏ viền | Mặt phẳng tách bằng tông màu, không bằng đường kẻ |
| Đường kẻ trên footer | Bỏ | Như trên |
| Thẻ "Hôm nay" chật, số "20" rớt dòng; thẻ từ "deploy" hẹp | Ba ô số cùng một hàng; phần trưa xếp dọc, rộng 30rem | Sửa từ ảnh chụp 1440 |
| Chạm trên điện thoại lóe màu xám | `-webkit-tap-highlight-color: transparent` | Chi tiết nhỏ cho cảm giác app thật |

## Đã kiểm

Playwright với Chrome thật, đã cuộn hết trang. Ở cả 1440 và 390:
- Không có phần nào bị ẩn sau khi cuộn.
- Không tràn ngang, không lỗi JS.
- Chế độ giảm chuyển động và trường hợp chặn `motion.js` đều hiện đủ nội dung.

Phiên luyện chạy hết 3 câu, cả bằng chuột lẫn phím 1–4.
