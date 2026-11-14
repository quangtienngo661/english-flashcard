# Giao diện email — plan tóm tắt (14/11/2026)

Plan: [`../superpowers/plans/2026-11-14-email-giao-dien.md`](../superpowers/plans/2026-11-14-email-giao-dien.md). Design và decisions:
`docs/superpowers/{specs,decisions}/2026-11-14-email-giao-dien*`. Mockup: `docs/mockups/2026-11-14-email/index.html`.

1. Thêm phần HTML vào thư; nodemailer gửi cả HTML và text.
2. Dựng hàm layout chung: màu theo token, các khối nội dung, chế độ tối, chân thư, bản text đi kèm.
3. Thêm cấu hình địa chỉ hỗ trợ, mặc định `support@wordmet.com`.
4. Đổi email mã xác minh, mã đặt lại mật khẩu và tạm khóa mã sang HTML.
5. Đổi các email bảo mật và tài khoản (đổi mật khẩu, đặt lại, đã có tài khoản, liên kết Google, xóa tài khoản) sang HTML.
6. Đổi các email do admin gửi (tạo tài khoản, đặt lại mật khẩu, đổi email) sang HTML.
7. Đổi hai email nhắc học sang HTML, có nút ôn và link tắt nhắc.
8. Đổi biên nhận mua Pro và thư Pro sắp hết hạn sang HTML; ba email dùng thử, tự gia hạn giữ text.
9. Thêm lệnh gửi 17 thư mẫu vào Mailpit để xem.
10. Chạy lint, test, build, smoke; xem 17 thư trong Mailpit; ghi as-built và mở PR vào `dev`.
