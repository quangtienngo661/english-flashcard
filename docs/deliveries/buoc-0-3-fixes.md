# Sửa thiếu sót Bước 0–3 — plan tóm tắt (20/10/2026)

Plan đầy đủ: [`../superpowers/plans/2026-10-20-buoc-0-3-fixes.md`](../superpowers/plans/2026-10-20-buoc-0-3-fixes.md). Design:
[`../superpowers/specs/2026-10-20-buoc-0-3-fixes-design.md`](../superpowers/specs/2026-10-20-buoc-0-3-fixes-design.md). 27 task, 5 mốc, mỗi mốc
một PR vào `dev`. M1 trước; M2 và M3 song song được; M4 làm lúc nào cũng được; M5 cuối.

**M1 — Nền**
1. Đặt rõ số kết nối DB tối đa và thời gian chờ kết nối qua biến môi trường.
2. Viết lại "chống gửi trùng": giữ chỗ → chạy → ghi kết quả, mỗi request một kết nối mỗi lúc.
3. Ba chỗ đang mượn thêm kết nối trong lúc mở transaction (luyện tập "Cần ôn tập", mở phiên luyện, chụp danh sách publish) đổi sang đọc qua transaction hoặc đọc trước.
4. Ghi log mọi lỗi 500 (có `operation_id`, route mẫu, không có dữ liệu người dùng).
5. Lưu múi giờ theo tên chuẩn, từ chối dạng `+07:00`, giới hạn bộ nhớ đệm; thêm lệnh chuẩn hóa múi giờ đang có.
6. Tra từ chỉ xét từ catalog và từ riêng của chính người xem; thêm index; thêm phép đo tải chạy tay.

**M2 — Tài khoản**
7. Thêm cột họ, tên, ngày sinh, đồng ý điều khoản, khóa tài khoản vào `users`; thêm `TERMS_VERSION`.
8. Luật kiểm họ tên, ngày sinh và mốc 13 tuổi.
9. Đăng ký nhận họ tên, ngày sinh, ô đồng ý; sửa các script smoke và test thật của admin cho khớp.
10. Hồ sơ hiện và sửa được họ tên (không sửa ngày sinh).
11. Tạo tài khoản staff nhận họ tên không bắt buộc.
12. Danh sách người dùng (tìm một phần email/họ/tên, lọc trạng thái) và trang chi tiết cho admin.
13. Khóa / mở khóa tài khoản và chặn người bị khóa ở đăng nhập, làm mới phiên, đổi mật khẩu, OTP, đặt lại mật khẩu.

**M3 — Nội dung**
14. Lưu ai review, ai publish, ai gỡ/retire từng nghĩa; trả về ở API chi tiết nghĩa.
15. Không bao giờ publish bản đã bị bác; nháp mới dựng trên bản chưa bị bác; job publish bỏ qua nghĩa đang gỡ.
16. Revert lô giữ lại từ đang được dùng (dạng chia đã duyệt, `form_of`, level đã xác nhận); khóa dòng để không mất link.
17. Upload lại dòng đã nhập thì báo "không đổi", không đè bản sửa tay.
18. `rejected.csv` vòng 2 trở đi upload lại được.
19. Che từ trong câu ví dụ đúng các ca sở hữu cách, viết tắt, `a.m.`, số; chấm bỏ dấu chấm cuối.
20. Câu luyện chỉ có một đáp án đúng (lọc đáp án nhiễu theo mọi nghĩa của chữ).

**M4 — Admin web**
21. API lỗi tạm thời thì giữ phiên, hiện dải mất kết nối / màn chờ có nút thử lại.
22. Đăng xuất thất bại thì báo "Chưa đăng xuất được khỏi máy chủ — Thử lại".
23. Lỗi lạ hiện mã `operation_id` kèm nút chép.
24. Khóa nút và đếm ngược khi bị 429 ở 5 form còn thiếu.

**M5 — Kiểm và ghi chép**
25. Script `pnpm smoke:buoc-0-3-fixes` chạy qua API thật trên DB mới, mỗi lỗi một ca.
26. Xóa 3 file test cần DB không config nào chạy (ca của chúng đã chuyển sang unit test và smoke).
27. Ghi as-built, trỏ trong `CLAUDE.md`, cập nhật trạng thái trong review 20/10, thêm mục vào checklist Deploy.
