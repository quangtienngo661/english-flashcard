# Decisions — Giao diện email Wordmet

Ngày: 14/11/2026. Đi kèm design doc
[`../specs/2026-11-14-email-giao-dien-design.md`](../specs/2026-11-14-email-giao-dien-design.md) và mockup
[`../../mockups/2026-11-14-email/index.html`](../../mockups/2026-11-14-email/index.html).

**Nhãn:** ✅ = phương án được chọn. **Ai chốt:** "Chủ dự án" = chủ dự án tự chọn trong chat; "Duyệt đề xuất" = Claude đề xuất, chủ dự án
duyệt cả bộ ("Duyệt, viết tiếp", 14/11/2026).

**Cách chốt:** chủ dự án bỏ bước tự trả lời trước ("bạn rec rồi lên plan làm đi, cho mình xem mockup trước"). Claude đề xuất cả 11 quyết định
kèm mockup. Chủ dự án sửa D1 rồi duyệt phần còn lại.

## Tóm tắt

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| D1 | Phạm vi | 17 email đang gửi thật, kể cả email tài khoản quản trị; 3 email dùng thử, tự gia hạn chỉ để tham khảo | Chủ dự án (vòng 2) |
| D2 | Ngôn ngữ 13 email tài khoản | Giữ song ngữ; tiếng Anh nhỏ hơn, dưới đường kẻ | Duyệt đề xuất |
| D3 | Logo | Chữ "wordmet." bằng HTML | Duyệt đề xuất |
| D4 | Font | Font hệ thống, không web font | Duyệt đề xuất |
| D5 | Chế độ tối | Khối CSS tối dùng màu tối của app; màu chọn để chịu được tự đảo | Duyệt đề xuất |
| D6 | Mã OTP | Khối nền xanh nhạt, số 36 px; mã không lên tiêu đề | Duyệt đề xuất |
| D7 | Nút | Tối đa một nút chính, trỏ tới trang thật của app | Duyệt đề xuất |
| D8 | Chân thư | Theo loại email: lý do nhận thư, tắt nhắc học, hỗ trợ thanh toán; link chính sách và điều khoản | Duyệt đề xuất |
| D9 | Chữ | Viết lại cả vi và en theo quy tắc văn phong | Duyệt đề xuất |
| D10 | Cách code | Một hàm layout tự viết dựng cả HTML và text; không thêm thư viện | Duyệt đề xuất |
| D11 | Kiểm thử | Unit test + gửi 17 email mẫu vào Mailpit + chủ dự án xem trên hộp thư thật | Duyệt đề xuất |

## D1 — Phạm vi

Bối cảnh: có 20 email. Ba email (#18 bắt đầu dùng thử, #19 dùng thử sắp hết, #20 sắp tự gia hạn) không gửi lúc launch: trial đã tắt và chưa có
gói tự gia hạn thật. Email #10 chỉ gửi cho `admin` và `editor`.

**Vòng 1** (Claude hỏi, chủ dự án chưa trả lời mà bảo Claude đề xuất):

| Phương án | Trade-off |
|---|---|
| Làm cả 20 email | Cùng layout nên làm thêm 3 email gần như không tốn công; nhưng thiết kế cho thứ chưa chạy. |
| Chỉ email đang gửi; 3 email dùng thử, tự gia hạn để text | Ít việc hơn; khi bật gói tự gia hạn phải làm lại. |
| Email quản trị dùng chung giao diện người học | Một layout; nhân sự thấy cùng thương hiệu. |
| Email quản trị để text | Không phải viết lại; lệch với các email khác. |

Claude đề xuất làm cả 20, email quản trị dùng chung giao diện.

**Vòng 2** (chủ dự án): bỏ #18–#20, "lưu lại làm context chứ không đưa lên vận hành thật".

| Phương án | Trade-off |
|---|---|
| ✅ 17 email đang gửi; #18–#20 giữ code text như cũ, ghi lại làm tài liệu | Không thiết kế cho thứ chưa chạy; nội dung cũ vẫn nằm trong mockup và bản rà. |

## D2 — Ngôn ngữ của 13 email tài khoản

Bối cảnh: các hàm trong `identity/mailer/templates.ts` không biết ngôn ngữ người nhận; lúc đăng ký (#1) người học chưa chọn ngôn ngữ.

| Phương án | Trade-off |
|---|---|
| ✅ Giữ song ngữ; phần tiếng Anh 14 px màu phụ, dưới đường kẻ; mã, nút, bảng chỉ một lần | Không đổi API; thư dài hơn một chút. |
| Một ngôn ngữ theo hồ sơ hoặc theo trang đăng ký | Thư gọn hơn; phải truyền ngôn ngữ qua đăng ký, OTP, admin và nhiều service. |

## D3 — Logo

| Phương án | Trade-off |
|---|---|
| ✅ Chữ "wordmet." bằng HTML, dấu chấm màu `accent` | Hiện cả khi hộp thư chặn ảnh; font hệ thống thay Bricolage nên hơi khác logo trên web. |
| Ảnh PNG của logo | Giống hệt web; Outlook chặn ảnh mặc định, cần nơi lưu ảnh công khai. |

## D4 — Font

| Phương án | Trade-off |
|---|---|
| ✅ Font hệ thống | Hiện ngay ở mọi hộp thư. |
| Tải Noto Sans hoặc Bricolage từ Google Fonts | Chỉ Apple Mail và vài hộp thư đọc; Gmail và Outlook bỏ qua. |

## D5 — Chế độ tối

| Phương án | Trade-off |
|---|---|
| ✅ `color-scheme` + khối `@media (prefers-color-scheme: dark)` dùng màu `web-dark.css`; không ảnh có chữ | Apple Mail, Outlook.com, Gmail iPhone hiện đúng màu tối của app; Gmail Android và Outlook Windows tự đảo, không điều khiển được. |
| Chỉ bản sáng, để hộp thư tự đảo | Ít code; kết quả mỗi nơi một kiểu. |

## D6 — Mã OTP

| Phương án | Trade-off |
|---|---|
| ✅ Một khối nền `accent-soft`, số 36 px, giãn chữ bằng CSS; mã không lên tiêu đề, preheader | Dễ đọc, chép ra đúng 6 số; không lộ mã trên màn hình khóa. |
| Sáu ô riêng như màn nhập mã | Giống app; chép ra có thể dính ký tự lạ hoặc tách ô. |
| Đưa mã lên tiêu đề | Đọc mã ngay từ thông báo; lộ mã trên màn hình khóa. |

## D7 — Nút

| Phương án | Trade-off |
|---|---|
| ✅ Tối đa một nút chính, bảng một ô nền `accent` (hiện được cả ở Outlook) | Rõ việc cần làm; không nút phụ. |
| Chỉ link chữ như hiện nay | Gọn; khó bấm trên điện thoại. |

## D8 — Chân thư

| Phương án | Trade-off |
|---|---|
| ✅ Theo loại: email tài khoản ghi lý do nhận thư; nhắc học có link tắt; email gói có địa chỉ hỗ trợ; mọi email có Chính sách bảo mật, Điều khoản | Người nhận biết vì sao nhận và làm gì tiếp; cần cấu hình `SUPPORT_EMAIL`. |
| Một chân thư chung | Đơn giản; nhắc học thiếu link tắt ở chỗ người ta tìm. |

## D9 — Chữ

| Phương án | Trade-off |
|---|---|
| ✅ Viết lại vi và en theo `vietnamese-writing.md` (bỏ bị động, "hãy", "thực hiện thao tác") | Đúng văn phong; phải sửa test so chữ. |
| Giữ chữ cũ, chỉ thêm HTML | Ít sửa test; chữ lệch quy tắc. |

## D10 — Cách code

| Phương án | Trade-off |
|---|---|
| ✅ Hàm `renderMail` tự viết trong `common/mail/layout`, dựng HTML và text từ một danh sách khối | Không dependency; text luôn khớp HTML; phải tự giữ quy tắc HTML email. |
| `react-email` | Component JSX, có sẵn quy tắc; thêm React vào API NestJS. |
| MJML | Ngôn ngữ email chuyên dụng; thêm bước build và dependency. |

## D11 — Kiểm thử

| Phương án | Trade-off |
|---|---|
| ✅ Unit test cho layout, màu và từng template; lệnh `mail:preview` gửi 17 email vào Mailpit; chủ dự án xem trên Gmail, Outlook, Apple Mail | Bắt lỗi nội dung tự động; hiển thị trên hộp thư thật vẫn cần người xem. |
| Snapshot HTML | Bắt mọi thay đổi; test vỡ cả khi chỉ đổi khoảng trắng. |

## Đề xuất kỹ thuật duyệt cùng design

- Giữ tiêu đề `Biên nhận mua Wordmet Pro` và `Gói Wordmet Pro sắp hết hạn`, vì `smoke-buoc-b-payments.mjs` so khớp đúng chuỗi.
- Bản text giữ dòng `… / Password: <mật khẩu>` và mã OTP là số 6 chữ số đầu tiên, vì admin e2e, smoke script và `FakeMailer.otpFor` đọc chúng.
- Link trong email song ngữ đi tới bản `/vi/` của web.
- Bỏ ba câu trong mockup chưa kiểm được trên code: "Pro đã bật trên tài khoản" (kỳ mua thêm có thể bắt đầu sau kỳ đang chạy), "Wordmet xếp sẵn từ cần ôn
  trước" (chưa kiểm). Giữ "các từ và lịch ôn vẫn giữ nguyên" ở #17 sau khi kiểm: gói Free không giới hạn số từ và không code nào xóa dữ liệu học khi Pro hết.
- Ghi lại thành việc sau: header `List-Unsubscribe` cho email nhắc học.
