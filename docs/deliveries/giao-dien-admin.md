# Đợt giao diện admin — plan tóm tắt (27/10/2026)

Plan chi tiết: [`../superpowers/plans/2026-10-27-giao-dien-admin.md`](../superpowers/plans/2026-10-27-giao-dien-admin.md). Design:
[`../superpowers/specs/2026-10-27-giao-dien-admin-design.md`](../superpowers/specs/2026-10-27-giao-dien-admin-design.md). Bảy PR vào `dev`, làm lần lượt,
mỗi PR một nhánh `feat/giao-dien-admin-<m>` tách từ `origin/dev` sau khi PR trước merge.

**M0 — Khung chung**
1. Chuyển admin sang data router, mọi route và test cũ giữ nguyên.
2. Client API có `patch`, `delete`, `put` kèm Idempotency-Key; giữ `reason` của lỗi; thêm câu cho các mã lỗi mới; test vi/en đủ khóa.
3. Menu 24 mục theo Figma; trang "Bạn không có quyền xem trang này." thay cho chuyển hướng im lặng.
4. Một chỗ chặn rời trang ở `Shell` khi form chưa lưu (không hỏi khi chỉ đổi tab hay bộ lọc, không hỏi sau khi lưu).
5. Giữ bản đang sửa khi phiên hết hạn, hỏi khôi phục sau khi đăng nhập lại.
6. Bộ lọc danh sách ghi vào URL (bỏ giá trị sai); lưu lỗi thì focus ô lỗi đầu tiên.
7. Component mới: ô nhiều dòng, công tắc, ô số, chọn một trong nhiều, hộp xác nhận.
8. Tài khoản dùng chung cho test trên stack thật (Minh, Lan, Khoa), bật AI giả trong CI, kiểm M0 và chụp màn.

**M1a — AI, cấu hình**
9. API: email người lưu prompt (bản seed hiện "Hệ thống") và câu chặn cố định.
10. API: số lần chạy thử còn lại trong giờ; mục đích của lỗi AI gần nhất.
11. Client API cho các màn AI.
12. Màn Tình trạng AI.
13. Màn Model (thêm, sửa giá, đọc lại thông tin, xóa).
14. Màn Thao tác (model, effort, thinking, token tối đa từng thao tác).
15. Màn Prompt (sửa, lịch sử, chạy thử, số lần còn lại).
16. e2e, test flow M1a và cổng merge.

**M1b — AI, đo**
17. API: email người tạo ví dụ và người chạy bộ ví dụ.
18. Màn Bộ ví dụ (ví dụ, các lần chạy, chạy với bản prompt đang sửa).
19. Màn Chi phí và Các lần gọi.
20. e2e, test flow M1b gồm các bước gọi AI thật bằng key của chủ dự án, cổng merge.

**M2 — Cài đặt hệ thống**
21. API: trả giá trị mặc định của cài đặt.
22. Màn Cài đặt hệ thống 6 tab, một nút lưu, lịch sử thay đổi.
23. e2e, test flow M2 và cổng merge.

**M3 — Báo lỗi**
24. API báo lỗi: email người xử lý, cờ "có trả lượt", đọc một báo lỗi, lựa chọn người học đã chọn.
25. API: lọc trả lượt theo email; editor đọc được danh sách lý do.
26. Màn Báo lỗi (danh sách, chi tiết, xử lý).
27. Màn Lý do báo lỗi.
28. Màn Trả lượt.
29. Màn Dạng chia chưa biết (nhận, hoàn tác, bỏ qua).
30. Dựng một báo lỗi câu AI cho test thật; e2e, test flow M3 và cổng merge.

**M4 — Người học**
31. API cấp gói: email các bên, trạng thái (gồm "Bị thay thế"), lần sửa gần nhất, lọc theo email.
32. API: tra một người học theo email trước khi cấp, giới hạn 60 lần mỗi giờ.
33. Màn Người dùng (tìm, lọc, chi tiết, khóa / mở khóa).
34. Màn Cấp gói: danh sách, thu hồi, sửa ngày.
35. Hộp Cấp mới (tra email, xác nhận khi người học đang trả tiền tự gia hạn, bản của editor).
36. e2e, test flow M4 và cổng merge.

**M5 — Nội dung**
37. API: cột "Thiếu" cho mọi bộ lọc nghĩa.
38. Chọn nhiều dòng trong danh sách.
39. Màn Từ (lọc, thao tác dòng, dán danh sách từ).
40. Màn Nghĩa: danh sách và 5 thao tác hàng loạt.
41. Chi tiết nghĩa (lưu bản nháp, lưu và publish).
42. Màn Chủ đề.
43. e2e, test flow M5; sửa tài liệu theo design §9; as-built cả đợt.
