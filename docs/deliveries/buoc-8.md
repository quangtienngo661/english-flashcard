# Bước 8 — plan tóm tắt (29/10/2026)

Bước 8 = đăng nhập Google + xóa tài khoản (cộng dọn tài khoản chưa xác nhận, admin xóa người dùng, nút "Hủy gói"). Plan đầy đủ:
[`../superpowers/plans/2026-10-29-buoc-8-identity-remainder.md`](../superpowers/plans/2026-10-29-buoc-8-identity-remainder.md); design
[`../superpowers/specs/2026-10-28-buoc-8-identity-remainder-design.md`](../superpowers/specs/2026-10-28-buoc-8-identity-remainder-design.md); quyết định D1–D30
[`../superpowers/decisions/2026-10-28-buoc-8-identity-remainder-decisions.md`](../superpowers/decisions/2026-10-28-buoc-8-identity-remainder-decisions.md).

Thứ tự: M1 → (M2, M3, M4 song song) → (M5, M6 song song) → M7. Mỗi mốc một nhánh `feat/buoc-8-m<N>`, một PR vào `dev`.

**M1 — API nền**
1. Thêm cột và bảng mới: trạng thái "đang xóa", ảnh đại diện, danh tính Google, cách đăng nhập của phiên, danh sách tài khoản đã xóa.
2. Mỗi request kiểm tài khoản còn dùng được và phiên chưa bị thu hồi (khóa, đang xóa, đã đăng xuất đều bị chặn ngay).
3. Phiên tạo bằng Google không vào được route admin; `/v1/me` trả cách đăng nhập.
4. Đăng nhập, gia hạn phiên và các thao tác admin cũ biết trạng thái "đang xóa".
5. Một luật dùng chung "gói đang tự gia hạn" (gồm cả trừ tiền lỗi).

**M2 — API xóa tài khoản**
6. Cổng cho từng module tự xóa dữ liệu của mình, cộng test bắt buộc mọi cột trỏ tới người dùng phải có cách xử lý.
7. Content xóa từ riêng và câu tự viết.
8. Learning và thư nhắc xóa dữ liệu học, cài đặt nhắc.
9. Practice xóa bài luyện, xóa báo lỗi về từ riêng, ẩn danh các báo lỗi còn lại.
10. Entitlements xóa gói, lần cấp, dấu dùng thử; ẩn danh sổ lượt và giao dịch; webhook tới muộn không giữ id thật.
11. Cổng AI xóa nội dung lời gọi trong cùng transaction.
12. Hai cài đặt mới: số ngày dọn tài khoản chưa xác nhận, số năm giữ giao dịch.
13. Dịch vụ xóa hai bước (đặt "đang xóa", rồi xóa hết) với mã ẩn danh và thư "đã xóa".
14. Route người học tự xóa và admin xóa người khác.
15. Việc định kỳ: thử lại xóa, quét hàng ghi muộn, dọn tài khoản chưa xác nhận, xóa giao dịch quá hạn.
16. Lệnh xuất và chạy lại danh sách đã xóa sau khi khôi phục backup.

**M3 — API đăng nhập Google**
17. Cấu hình Google và cookie mã hóa có hạn.
18. Bộ nối Google thật và Google giả cho test.
19. Bắt đầu đăng nhập và nhận kết quả từ Google (tự liên kết theo email, thư báo liên kết).
20. Hoàn tất đăng ký bằng Google (ngày sinh, đồng ý, tên khi Google thiếu).
21. Xác nhận lại bằng Google trước khi xóa tài khoản chỉ có Google.

**M4 — API hủy gói**
22. Route hủy gia hạn, thêm ngày gia hạn vào thông tin gói, nhà cung cấp giả báo lại sự kiện hủy.

**M5 — Web người học**
23. Nút "Tiếp tục với Google" và xử lý khi quay về.
24. Màn hoàn tất đăng ký Google.
25. Cài đặt: dòng "Đăng nhập bằng", lối vào xóa tài khoản, "Đặt mật khẩu" cho tài khoản chỉ có Google.
26. Luồng xóa tài khoản và trang "Đã xóa".
27. Nút "Hủy gói" ở trang Gói.

**M6 — Admin**
28. Đăng xuất khi gặp phiên Google, mã lỗi mới, chữ "Người dùng đã xóa".
29. Nút xóa tài khoản ở chi tiết người dùng, nhãn cách đăng nhập, nhãn "Đang xóa".
30. Hai ô cài đặt mới.
31. Một ca admin xóa người học trên stack thật.

**M7 — Kiểm thật và tài liệu**
32. Script `pnpm smoke:buoc-8`.
33. Test flow (có bước tạo OAuth client Google), việc trước ra mắt, CLAUDE.md, as-built; chạy mọi smoke, kiểm trên trình duyệt, chủ dự án đăng nhập Google thật.
