# Audit Figma Wordmet (09/11/2026)

File Figma `JKnyUUtGjpGpfKK4PqBfdY`. Đã quét 3 trang: "Trang công khai", "Đăng nhập và tài khoản", "App người học". Tổng cộng 89 khung, trong đó 44 khung điện thoại.

## Cách kiểm

- **Script tự động.** Chạy trên mọi khung, kiểm:
  - chữ bị cắt: dài hơn khung chứa, khung lại bật cắt nội dung;
  - chữ đè lên chữ trong khung không dùng auto-layout;
  - khối tràn ra ngoài khung;
  - lề điện thoại dưới 16 px;
  - font ngoài Noto Sans và Bricolage;
  - nút lịch nổi che chữ;
  - placeholder trong ô nhập.
- **Soát bằng mắt** từng khung điện thoại, qua ảnh chụp từ Figma.

## Đã sửa

| Chỗ | Lỗi | Sửa |
|---|---|---|
| Component Logo (trang Hệ thống) | Logo "Wordmet" khác logo trong mockup vòng 6–10 | Đổi thành "wordmet." (dấu chấm color/accent). 88 chỗ dùng logo trên 3 trang tự đổi theo |
| Cài đặt, Tài khoản, Xóa tài khoản, Lịch sử giao dịch (cả chi tiết), Gói học, Đơn hàng (12 khung) | Tab "Hôm nay" sáng dù trang không thuộc tab nào | Thêm biến thể "Tab=Không" cho Thanh tab dưới và Thanh trên app/Desktop, đổi 12 khung sang biến thể này |
| Tra từ, Hôm nay (điện thoại) | Nút lịch nổi che dòng cuối ("Trang sau →", "0 / 11") | Thêm 40 px khoảng đệm cuối trang |
| Nhóm (2 khung điện thoại), Phiên luyện (điện thoại) | Gợi ý phím trên điện thoại ("← →", "↓", "Nhấn Enter", huy hiệu Enter và 1) | Đổi chữ sang thao tác chạm, ẩn huy hiệu phím |
| Một nhóm (điện thoại) | 9 chip lọc xuống 4 hàng | Một hàng cuộn ngang |
| Kết quả tra bằng AI (máy tính và điện thoại) | Nhãn "nghĩa có sẵn trong từ điển" và dòng "AI gợi ý có thể sai…" cách khối của nó bằng khoảng các khối khác | Gom nhãn với khối của nó (6–8 px), đẩy dòng lượt tra sang phải tiêu đề |
| Ôn (các khung) | Nhãn viết hoa toàn bộ "ÔN NHÓM", "CÂU MẪU" | Chữ thường, đúng `style-da-chon.md` |
| Hôm nay | Placeholder "Ví dụ: went" | Bỏ |
| Đăng ký, Hoàn tất đăng ký Google, Bổ sung hồ sơ | Placeholder "Nguyễn", "dd/mm/yyyy" (7 chỗ) | Bỏ. Giá trị đã nhập ("Lan", email) giữ để khung vẫn là trạng thái đang điền |
| Đăng ký, Đặt mật khẩu mới (máy tính và điện thoại) | Không có ô nhập lại mật khẩu | Thêm "Nhập lại mật khẩu" / "Nhập lại mật khẩu mới". Khung Đăng ký trên máy tính cao 986 → 1078 px |
| Mảng nền xanh ở Đăng nhập và Đăng ký (máy tính) | Trống | Thêm, ở độ mờ thấp: lưới chấm, một đường chấm từ ngăn Mới tới 30 ngày (phần lớn nằm sau thẻ), 3 chip từ mờ ở các góc trống |
| Thanh toán thành công (máy tính và điện thoại) | Tiêu đề 36 px, các dòng có đường kẻ, cỡ chữ lẻ 14,5 | Huy hiệu dấu tick, tiêu đề 24 (Display/Card title), ngày hết hạn ngay dưới tiêu đề, chi tiết trong một ô nền nhạt không đường kẻ, chữ theo text style |
| Chính sách bảo mật, Điều khoản (máy tính) | 2 mục lục và 2 câu "Gửi…" bị cắt ngang | Cho xuống dòng theo bề rộng khung |
| Nguồn dữ liệu (máy tính) | Dòng "Giấy phép: …" tràn khung | Như trên |

Cảnh báo sai (đã kiểm, không phải lỗi):
- Tiêu đề các thẻ đăng nhập bị báo "cắt": chữ nằm trọn trong khung, do khung bao của chữ lớn hơn chữ thật.
- Quầng sáng ở các trang đăng nhập trên điện thoại nằm ngoài khung: cố ý, khung cắt chúng đi.

## Chưa đổi, cần bạn quyết

1. **Font JetBrains Mono: đã chốt giữ (09/11/2026).** App người học dùng nó cho nhãn nhỏ: 58 khung, có khung tới 30 nhãn. `style-da-chon.md` quy định "JetBrains Mono 12px, chữ thường, cho nhãn". `ui-best-practices.md` trước đó ghi "tối đa hai họ chữ". Chủ dự án chọn giữ mono. `ui-best-practices.md` đã thêm ngoại lệ này.
2. **Ô "Đã xác minh" ở Đăng ký.** Đây là khung tự vẽ thay cho ô chống bot Cloudflare Turnstile. Ô thật do Cloudflare vẽ, không đổi giao diện được.
   - Code hiện để ô luôn hiện (`apps/web/src/app-ui/TurnstileWidget.tsx` không đặt `appearance`). Người học thấy một ô Cloudflare tự tick rồi báo thành công.
   - Nếu đặt `appearance: 'interaction-only'`, ô chỉ hiện khi Cloudflare cần người học bấm. Lúc đó form gọn hơn và khung tự vẽ có thể bỏ khỏi Figma.
   - Việc này là sửa code, chưa làm.
3. **Ô tìm kiếm.** Mình giữ chữ gợi ý ("Tìm từ", "Tìm hoặc tạo nhóm…", "Tìm từ, ví dụ: mitigate"). Các ô này không có nhãn, xóa đi thì không còn biết ô dùng để làm gì.
4. **"Nhập lại mật khẩu" chưa có trong code.** `RegisterForm.tsx` hiện chỉ có một ô mật khẩu. Thêm ô này chỉ là kiểm tra ở giao diện, API không đổi.

## Chưa kiểm

- Bản Dark: chưa có khung Dark cho app người học.
- Trang Motion và trang Ghi chú.
- Từng component trên trang Hệ thống. Chỉ các khung dùng chúng được kiểm.
