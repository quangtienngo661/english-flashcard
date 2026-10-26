# Đợt cải thiện nhóm A — plan tóm tắt (26/10/2026)

Plan chi tiết: [`../superpowers/plans/2026-10-26-dot-cai-thien-a.md`](../superpowers/plans/2026-10-26-dot-cai-thien-a.md). Design:
[`../superpowers/specs/2026-10-26-dot-cai-thien-a-design.md`](../superpowers/specs/2026-10-26-dot-cai-thien-a-design.md). Năm PR vào `dev`, ba phiên song song: phiên 1 làm PR 1,
phiên 2 làm PR 2, phiên 3 làm PR 3 → 4 → 5.

**PR 1 — Xác nhận email trước khi có phiên (phiên 1)**
1. Đăng nhập đúng mật khẩu mà chưa xác nhận email thì trả 403 `email-not-verified` và gửi mã mới.
2. Đăng ký không còn cấp phiên đăng nhập; đăng ký lại vào email chưa xác nhận thì thay dữ liệu và gửi mã mới.
3. Nhập mã thành API công khai (email + mã), đúng thì cấp phiên; thêm giới hạn theo email và IP.
4. Gửi lại mã bằng email, không cần đăng nhập.
5. Làm mới phiên từ chối tài khoản chưa xác nhận.
6. Sửa `learner:setup`, 6 smoke và admin e2e-real theo luồng mới, chạy lại hết.
7. Web: đăng ký không vào app; nhập mã xong mới có phiên.
8. Web: form đăng ký và đăng nhập đưa sang trang nhập mã; chữ "email đã có tài khoản" nhắc Quên mật khẩu.
9. Web: trang nhập mã không cần đăng nhập (ô email, gửi lại mã, đăng ký bằng email khác); bỏ lời mời xác nhận ở Cài đặt.
10. e2e đăng ký / đăng nhập theo luồng mới, chạy thật, ghi test flow.

**PR 2 — Thêm từ từ trang nhóm (phiên 2)**
11. Tấm Thêm từ có chế độ khoá nhóm, nhãn "Đã có trong nhóm".
12. Nút Thêm từ trên trang nhóm, thêm cả loạt qua trang Chọn từ theo chủ đề với nhóm chọn sẵn; e2e, chạy thật.

**PR 3 — Sửa lỗi "Xem đáp án" (phiên 3)**
13. Tái hiện lỗi bằng test, rồi cho xem đáp án câu điền từ trước lần thử đầu.

**PR 4 — Luyện tập (phiên 3)**
14. Bỏ chữ "trước" ở 5 lựa chọn thứ tự.
15. Hai nút sau khi trả lời, nút chính đổi theo trường hợp.
16. API: câu điền từ từ câu đã lưu không cần quyền AI.
17. Web: công tắc "Điền từ vào câu bạn đã lưu"; e2e, chạy thật.

**PR 5 — Nút loa (phiên 3)**
18. Component đọc bằng giọng của máy (UK · US, câu đã lưu chỉ giọng trên máy).
19. Gắn nút loa vào trang từ, thẻ ôn, kết quả luyện tập; e2e, nghe thử trên Windows.

**Đóng đợt**
20. Chạy smoke trên `dev`, viết as-built, cập nhật `CLAUDE.md` và danh sách cải thiện.
