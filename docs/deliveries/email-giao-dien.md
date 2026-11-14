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

---

# Giao diện email — as-built (14/11/2026)

Nhánh `feat/email-giao-dien` từ `origin/dev` @ `0cc6f174`. Chỉ API. Design, decisions, plan và mockup: xem đầu file.

## Đã làm

- `MailMessage.html?` và `SmtpMailer` (nodemailer gửi `multipart/alternative` khi có cả `text` và `html`).
- `apps/api/src/common/mail/layout/`: `blocks.ts` (kiểu khối), `colors.ts` (màu; test so từng giá trị với `packages/design-tokens/web.css` và `web-dark.css`),
  `render-mail.ts` (hàm thuần `renderMail(spec) → { html, text }`).
- 17 email dựng bằng `renderMail`: 13 email tài khoản và admin (`identity/mailer/templates.ts`), 2 nhắc học (`notifications/provider/reminder-message.ts`),
  biên nhận và Pro sắp hết hạn (`entitlements/notices/entitlement-mail.ts`). `trial_started`, `trial_reminder`, `renewal_notice` giữ nguyên dạng text.
- `SUPPORT_EMAIL` (không bắt buộc, mặc định `support@wordmet.com`) trong `app-config.ts` và `.env.example`.
- Lệnh `pnpm mail:preview [địa chỉ]` (sau `pnpm build`): gửi 17 thư mẫu vào Mailpit; từ chối chạy khi `SMTP_HOST` không phải máy này.
- Sửa ba regex tiêu đề trong `scripts/smoke-identity.mjs` cho khớp tiêu đề mới (design §8).

## Kiểm

- `pnpm lint` xanh (hai cảnh báo có sẵn: `Prisma` không dùng ở `account-deletion.service.ts`, spread thừa ở `mail-dispatcher.service.ts`), `pnpm build` xanh,
  `pnpm test` **370 file, 5.396 test**, tất cả qua.
- Đỏ trước: Task 1 (đỏ ở `tsc`, vì vitest không kiểm kiểu), 2, 3, 7, 8, 9. Task 4–6 viết template trước từ chữ đã duyệt rồi viết lại spec; kiểm bằng cách
  đảo điều kiện `mustChange` (test đỏ, hoàn lại thì xanh). Test màu: đổi `accent` một chữ số thì đỏ.
- `pnpm mail:preview` gửi 17/17 thư vào Mailpit. Mỗi thư có HTML (4,2–7,3 KB) và text. HTML Check của Mailpit: 88–93 % hỗ trợ, 6–11 % hỗ trợ một phần, 1 % không
  hỗ trợ (`@media` và vài thuộc tính nền: chỉ ảnh hưởng chế độ tối và điện thoại). Qua SMTP thật, bản text giữ mã OTP là số 6 chữ số đầu và dòng `Password: <mật khẩu>`.
- Xem thư thật trên trang HTML của Mailpit: chế độ sáng (mã xác minh) và chế độ tối (biên nhận) đúng như mockup.
- Smoke trên DB mới, API + worker từ bản build, cổng 3100, output ở `docs/deliveries/email-giao-dien-smoke-output.txt`:
  `smoke:identity` 7/7, `smoke:buoc-8` 20/20, `smoke:buoc-b-payments` 22/22, không FAIL.

## Chưa kiểm (việc của chủ dự án)

- **Gmail web, Gmail Android (chế độ tối), Gmail iPhone, Outlook, Apple Mail thật.** Mailpit chỉ cho biết HTML hợp lệ và bảng hỗ trợ; nó không chạy khối tối của từng hộp thư.
  `mail:preview` từ chối SMTP không phải máy này. Muốn xem trên hộp thư thật: chạy `pnpm mail:preview` vào Mailpit rồi chuyển tiếp thư từ Mailpit sang hộp thư, hoặc
  đăng ký một tài khoản thử trên bản deploy.
- Hộp thư `support@wordmet.com` có tồn tại không. Nếu không, đặt `SUPPORT_EMAIL` trước khi deploy.
- Resend tính phí theo số thư hay theo dung lượng: chưa đọc bảng giá trong phiên này (**ASSUMPTION**: theo số thư).
- Header `List-Unsubscribe` cho email nhắc học (việc sau).
- `admin-e2e-real` (CI) đọc dòng `Password:` trong thư tài khoản quản trị: chưa chạy ở máy này; bản text giữ dòng đó (có test và đã đọc qua Mailpit).

## Rulings

- Task 4–6 làm một lượt, một commit (cùng `templates.ts` và spec của nó).
- Task 4–6: viết template trước spec (chữ lấy từ mockup đã duyệt); kiểm bằng mutation (nêu ở trên).
- Task 7: câu không có chuỗi ngày là "Ôn hôm nay. Vài phút là xong." / "Review today. A few minutes is enough." (plan ghi "Ôn hôm nay, vài phút là xong.").
- Task 9: `mail:preview` đọc `SMTP_*` và URL app thẳng từ môi trường (mặc định local), không qua `loadConfig`; hàm tạo thư mẫu nhận một object nhỏ thay vì `AppConfig`.
- Tiêu đề #5 (tự đặt lại mật khẩu) và #11 (admin đặt lại) trùng nhau theo mockup đã duyệt; trước đây hai thư có tiêu đề khác nhau.
- Sửa `smoke-identity.mjs` (ngoài danh sách file của plan) vì ba regex tiêu đề cũ không khớp tiêu đề mới.
