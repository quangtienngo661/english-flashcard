# Bước 3 — plan tóm tắt, phần hệ thống (17/10/2026)

Ảnh chụp lúc trình plan, chưa duyệt. Plan đầy đủ: [`../superpowers/plans/2026-10-17-buoc-3-learning.md`](../superpowers/plans/2026-10-17-buoc-3-learning.md);
design: [`../superpowers/specs/2026-10-16-buoc-3-learning-design.md`](../superpowers/specs/2026-10-16-buoc-3-learning-design.md).
Plan này **chỉ có phần hệ thống** (API, worker, database). Giao diện (app người học, trang admin) có plan riêng, làm ở phiên khác.

**Còn chờ chủ dự án:** G2 cách đếm "mỗi tuần" của email nhắc (chặn task 21); G5 "Xong khi" (chặn task 22).

**Luồng làm song song:** A Content (1–8) · B Nền tảng (9, 17–20) · C Learning (10–16) · D Nhắc học (21–22). A, B và phần đầu của C
chạy cùng lúc từ ngày đầu; C chờ A ở task 12 và 14; D chạy sau cùng. Mỗi luồng mở PR ngay ở chỗ luồng khác cần (B sau task 9, C sau
task 14), không đợi cả luồng xong.

**Thay đổi sau review 17/10:** bỏ nhóm mặc định "Mới thêm" (D43); trang từ tách chữ hoa, chữ thường (D42); sửa 15 điểm của
[review](../superpowers/reviews/2026-10-17-buoc-3-design-plan-review.md).

**M1 — Content (luồng A)**
1. Cho publish nghĩa không có chủ đề.
2. API xuất CSV các từ chưa có nghĩa.
3. Thêm phạm vi "từ riêng" cho entry; mọi chỗ đọc của staff và các API học cũ chỉ thấy catalog.
4. Thêm bảng dạng chia và hàm sinh dạng chia (đo độ đúng của `compromise` trước khi chọn).
5. Cho người học tạo, sửa từ riêng (trần 1.000 từ); thêm hàm cho Learning kiểm nghĩa nào người học được thấy.
6. Lưu câu ngữ cảnh (tối đa 5 câu mỗi nghĩa).
7. Đưa dạng chia và link "dạng chia của" vào luồng CSV; job sinh dạng chia cho các từ đang có.
8. Trang từ kiểu Cambridge, tìm theo chữ, tra cho thêm nhanh; kiểm milestone M1.

**M2 — Learning và Settings (luồng B, C)**
9. Module cài đặt admin chỉnh được qua API, có khoảng cho phép, version và lịch sử; quyền `settings.manage`.
10. Bảng dữ liệu Learning và quản lý nhóm (xóa nhóm bỏ đúng các từ chỉ thuộc nhóm đó).
11. Luật lịch ôn và cách tính "hôm nay" theo múi giờ (hàm thuần, test theo bảng 6.4).
12. Thêm từ vào nhóm, thêm cả loạt, bỏ khỏi nhóm, bỏ khỏi việc học, đọc trạng thái học.
13. Ghi lượt ôn và nhật ký (chống gửi trùng, khóa dòng khi hai máy bấm cùng lúc).
14. Số liệu trang chủ và danh sách thẻ ôn theo trần mỗi nhóm.
15. Danh sách cân nhắc và "Học lại".
16. Thêm nhanh trong một transaction, xóa từ riêng; kiểm milestone M2.

**M3 — Nhắc học (luồng B, D)**
17. Chuyển phần gửi email và hạn mức email sang `common`, thêm ngưỡng 80%.
18. Identity cho đọc danh sách người có thể nhắc và email đã xác minh.
19. Bảng nhắc học và API bật/tắt nhắc của người học.
20. Cổng `NotificationProvider`, bản email, lớp chọn kênh, mẫu email nhắc (link `/vi/app/settings` hoặc `/en/app/settings`).
21. Lịch nhắc 15 phút một lần, mỗi người tối đa một email mỗi ngày địa phương (3 trạng thái gửi).
22. Kiểm cuối toàn hệ thống, chạy tay, ghi as-built.
