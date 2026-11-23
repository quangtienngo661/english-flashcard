# Checklist kiểm thử Accessibility (NVDA + điện thoại thật) — Pilot

> Dùng cho kiểm thử thủ công trước và trong đợt pilot (Task D4). Đánh dấu `[x]` sau khi xác nhận trên **NVDA (Windows + Chrome/Firefox)** và **điện thoại thật (iOS Safari hoặc Android Chrome, màn hình dọc 360–390 px)**.

## 1. Luồng Đăng ký & Đăng nhập (`/vi/auth/register`, `/vi/auth/login`)

- [ ] **Tab qua toàn bộ form đăng ký:** Nhấn `Tab` từ đầu trang đến nút gửi. NVDA đọc rõ nhãn (`label`) của từng ô (tên, email, mật khẩu, ngày sinh, checkbox điều khoản) và trạng thái bắt buộc; vòng focus nhìn thấy rõ.
- [ ] **Lỗi validation form đăng ký:** Gửi form trống hoặc email sai định dạng. NVDA thông báo lỗi (`aria-invalid="true"` và nội dung lỗi liên kết qua `aria-describedby`), focus hoặc vùng thông báo cho biết cần sửa ô nào.
- [ ] **Bước nhập OTP xác nhận email:** Chuyển sang màn OTP, nhập sai mã 6 số. NVDA đọc thông báo lỗi mà không cần tải lại trang; trên điện thoại bàn phím số hiển thị đúng (`inputMode="numeric"`).
- [ ] **Ẩn/hiện mật khẩu:** Kích hoạt nút hiện mật khẩu bằng `Space`/`Enter`. NVDA đọc trạng thái bật/tắt (`aria-pressed` hoặc nhãn đổi rõ ràng) và không làm mất focus.
- [ ] **Đăng nhập trên màn hình 360 px:** Không bị tràn ngang (`overflow-x`), nút "Đăng nhập" và liên kết "Quên mật khẩu" dễ chạm (chiều cao tối thiểu ~44 px).

## 2. Luồng Học thẻ mới (`/vi/app/groups/:id/learn`)

- [ ] **Mở thẻ mới bằng bàn phím:** Vào một nhóm từ có thẻ mới. Nhấn `Space` hoặc `Enter` để lật thẻ. NVDA đọc từ, phiên âm IPA và nghĩa tiếng Việt sau khi lật mà không đọc lẫn mặt trước.
- [ ] **Nút phát âm (Audio TTS):** Focus vào nút loa và nhấn `Enter`. NVDA đọc nhãn rõ (ví dụ "Nghe phát âm"), âm thanh phát trên điện thoại không bị che bởi thanh điều hướng.
- [ ] **Chọn kết quả học thẻ:** Nhấn nút đánh giá ("Đã nhớ" / "Học lại" hoặc tương đương) bằng bàn phím. Thẻ chuyển sang từ tiếp theo, NVDA thông báo tiến độ (ví dụ "Thẻ 2/10").
- [ ] **Thêm câu ngữ cảnh cá nhân:** Mở form thêm câu ví dụ trên thẻ, nhập câu và lưu bằng bàn phím. NVDA thông báo đã lưu; trên điện thoại bàn phím ảo không che nút "Lưu".
- [ ] **Màn hình hoàn thành phiên học:** Khi học hết lượt, tiêu đề hoàn thành nhận focus hoặc được đọc rõ, nút quay lại nhóm từ dễ bấm.

## 3. Luồng Ôn tập tới hạn (`/vi/app/groups/:id/review`)

- [ ] **Danh sách nhóm và số thẻ tới hạn:** Tại `/vi/app`, NVDA đọc rõ tên nhóm kèm số thẻ cần ôn hôm nay (không chỉ đọc một con số trơ trọi).
- [ ] **Ôn thẻ nhớ lại (Recall / Flashcard):** Nhập đáp án hoặc lật thẻ bằng bàn phím. Khi trả lời sai, NVDA đọc rõ đáp án đúng và giải thích; không chỉ dùng màu đỏ/xanh để phân biệt đúng/sai.
- [ ] **Chuyển trạng thái mức độ nhớ:** Sau khi chọn mức độ, thẻ kế tiếp tải mượt, không nhảy cuộn trang bất ngờ trên điện thoại.
- [ ] **Trạng thái hết thẻ ôn:** Khi không còn thẻ tới hạn, trang hiển thị thông báo rõ ràng và nút điều hướng sang học từ mới hoặc luyện tập.
- [ ] **Điều hướng quay lại giữa chừng:** Bấm nút thoát/quay lại khi đang ôn. Nếu có hộp thoại xác nhận, focus được giữ trong hộp thoại (`focus trap`) và `Esc` đóng được hộp thoại.

## 4. Luồng Luyện tập & Câu hỏi AI (`/vi/app/practice`)

- [ ] **Chọn nguồn từ và cấu hình phiên luyện:** Dùng bàn phím chọn nhóm từ, số câu, loại câu hỏi (có/không câu AI). NVDA đọc đúng trạng thái đã chọn của từng chip/checkbox/select.
- [ ] **Câu hỏi trắc nghiệm (MCQ):** Dùng phím mũi tên hoặc `Tab` để chọn đáp án A/B/C/D và gửi. NVDA đọc nội dung đầy đủ của từng phương án và kết quả đúng/sai ngay sau khi nộp.
- [ ] **Câu hỏi điền từ vào chỗ trống (Cloze AI / câu cá nhân):** NVDA đọc câu có chỗ trống dễ hiểu (không đọc chuỗi gạch dưới dài gây nhiễu), ô nhập đáp án có nhãn rõ ràng.
- [ ] **Gợi ý (Hint) và bỏ qua (Skip):** Bấm nút gợi ý bằng bàn phím; nội dung gợi ý xuất hiện và được NVDA đọc (`aria-live="polite"`).
- [ ] **Báo lỗi câu hỏi AI:** Mở modal báo lỗi trên 1 câu AI, chọn lý do và gửi bằng bàn phím. Focus vào modal khi mở, trả về nút kích hoạt khi đóng, có thông báo gửi thành công.
- [ ] **Tổng kết phiên luyện trên điện thoại:** Bảng kết quả từng câu cuộn gọn trong khung màn hình, không cắt chữ, nút cập nhật lịch ôn ("Cần ôn tập" / "Đã biết") bấm chính xác.

## 5. Luồng Mua gói Pro & Cài đặt (`/vi/app/billing`, `/vi/app/settings`)

- [ ] **So sánh gói Free và Pro:** NVDA đọc rõ tên gói, thời hạn (1 / 3 / 12 tháng), giá tiền (59.000 ₫ / 149.000 ₫ / 479.000 ₫) và quyền lợi chính.
- [ ] **Tạo đơn thanh toán VietQR:** Bấm chọn gói và tạo đơn. Trang hiển thị mã QR kèm thông tin chuyển khoản dạng văn bản (số tài khoản, số tiền, nội dung chuyển khoản) và nút sao chép có thông báo "Đã sao chép" cho NVDA.
- [ ] **Hiển thị trên điện thoại khi quét/chuyển khoản:** Mã QR và nút sao chép nội dung chuyển khoản nằm gọn trong một màn hình cuộn ngắn, nút không dính sát nhau.
- [ ] **Đăng xuất mọi thiết bị trong Cài đặt:** Mở `/vi/app/settings`, bấm "Đăng xuất tất cả thiết bị", xác nhận trong hộp thoại bằng bàn phím (`Tab` + `Enter`). Focus quản lý đúng và chuyển về màn đăng nhập sau khi xác nhận.

## Biên bản chạy kiểm thử

| Ngày | Người kiểm | Môi trường (NVDA / Thiết bị) | Số mục đạt | Ghi chú lỗi phát hiện |
|---|---|---|---|---|
| | | Windows + NVDA | /25 | |
| | | Điện thoại thật | /25 | |
