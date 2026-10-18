# Bước 4 — plan tóm tắt (18/10/2026)

Ảnh chụp lúc trình plan, chưa duyệt. Plan đầy đủ: [`../superpowers/plans/2026-10-18-buoc-4-practice.md`](../superpowers/plans/2026-10-18-buoc-4-practice.md);
design: [`../superpowers/specs/2026-10-18-buoc-4-practice-design.md`](../superpowers/specs/2026-10-18-buoc-4-practice-design.md).
Plan **chỉ có API** (D24); giao diện làm ở đợt sau.

**Không còn câu chờ chủ dự án.** Cách làm: các phiên Claude implement song song, một phiên điều phối (D29). "Xong khi": xong mọi task,
CI xanh trên mọi PR và `pnpm smoke:buoc-4` chạy qua API thật trên DB mới (D28).

**Luồng làm song song:** A Nền tảng (1–2) · B Learning (3–5) · C Content (6–7) · D Bài luyện (8–17) · E Báo lỗi và dọn dữ liệu
(18–19) · F Kiểm cuối (20). A, B, C và phần đầu của D (8–12) chạy cùng lúc từ ngày đầu, mỗi luồng một database local riêng; D chờ A, B
và C ở task 13; E chạy khi PR đầu của D xong; F chạy sau cùng.

**Sửa sau review plan (18/10):** đã sửa đủ 29 điểm của
[review](../superpowers/reviews/2026-10-18-buoc-4-plan-review.md); số task giữ nguyên. Thay đổi chính: phần "trần từ ôn để trống"
chuyển từ task 1 sang task 5 để PR đầu không vỡ build; thêm luật thứ tự khóa chung để tránh deadlock; xóa từ riêng đang hiện thì phiên
nhớ để lần tải lại báo "Không tìm thấy"; định nghĩa cách lưu đáp án trắc nghiệm, đúng/sai; kiểm cuối dùng database mới riêng, không
xóa dữ liệu local.

**M1 — Nền móng (luồng A, B, C, D)**
1. Thêm 8 cài đặt nhóm `practice`; cho số lần làm lại để trống; số câu mặc định không vượt số câu tối đa.
2. Thêm giới hạn tần suất riêng cho lúc làm câu (120 lần/phút) và module kiểm quyền tạm, luôn "được phép".
3. Learning cho Practice đọc danh sách từ theo 5 nguồn, các từ cùng nhóm và trạng thái một từ.
4. Learning ghi "Cần ôn tập", "Đã biết" từ bài luyện (không gắn nhóm, không tính trần); thêm "cổng" xóa dữ liệu luyện khi xóa từ riêng.
5. Cho trần từ ôn để trống (cài đặt và code Learning cùng một lần sửa); để trống thì không giới hạn (D35).
6. Content cho Practice đọc chi tiết nghĩa: nghĩa, định nghĩa, câu ví dụ, cách viết được chấp nhận, dạng chia, cờ từ chức năng.
7. Hàm che từ trong câu ví dụ (phân biệt hoa thường, chỉ nhận câu mà từ xuất hiện đúng một dạng).
8. Bảng dữ liệu và module Practice, cùng các hằng số cố định.
9. Chuẩn hóa và so khớp đáp án gõ.
10. Chọn đáp án nhiễu, chọn dạng bài, dựng gợi ý.
11. Sắp xếp từ theo 8 cách và xáo các vòng ôn lại.
12. Luật "từ hay sai" (2 sai trong 5 lượt được tính).

**M2 — Luồng bài luyện (luồng D)**
13. Dựng câu hỏi: trắc nghiệm và đúng/sai theo nghĩa, gõ từ theo nghĩa hoặc theo câu (D34).
14. Phiên luyện: mở phiên, tải lại, câu tiếp theo, "Ôn lại thêm không?", Dừng, tự đóng phiên bỏ ngang; xử lý từ bị gỡ/xóa giữa phiên.
15. Chấm đáp án, làm lại khi gõ sai, Bỏ qua, gợi ý.
16. Nút "Cần ôn tập", "Đã biết", trang tổng kết và "Đưa tất cả vào ưu tiên".
17. API "từ hay sai" và lịch sử lọc theo ngày.

**M3 — Báo lỗi và dọn dữ liệu (luồng E)**
18. Báo lỗi cho người học và màn danh sách cho staff qua API; che từ riêng trong bản sao (D36).
19. Job dọn dữ liệu cũ hơn số tháng lịch sử, đóng phiên bỏ ngang, xóa dữ liệu luyện khi xóa từ riêng.

**M4 — Kiểm cuối**
20. Test xuyên luồng (báo lỗi câu có từ riêng, xóa từ riêng đang hiện), script `smoke:buoc-4` trên database mới riêng, lệnh chạy job
    dọn bằng tay, chạy đủ test, ghi as-built và báo chủ dự án.
