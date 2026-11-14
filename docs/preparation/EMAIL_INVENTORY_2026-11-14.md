# Các email Wordmet đang gửi (rà 14/11/2026)

Rà trên `origin/dev` @ `0cc6f174`. Mọi email đi qua một cổng: `Mailer.send({ to, subject, text })` (`apps/api/src/common/mail/mailer.ts`).
Kiểu `MailMessage` **chỉ có `text`**, nên hôm nay **không email nào có HTML**. `SmtpMailer` chuyển nguyên `text` cho nodemailer.

Ba file chứa nội dung:

| File | Số email | Ngôn ngữ |
|---|---|---|
| `apps/api/src/identity/mailer/templates.ts` | 12 (tài khoản, bảo mật, admin) | Song ngữ: tiếng Việt trước, tiếng Anh sau, trong cùng một thư |
| `apps/api/src/notifications/provider/reminder-message.ts` | 2 (nhắc học) | Một ngôn ngữ: `native_language` của người học, mặc định `vi` |
| `apps/api/src/entitlements/notices/entitlement-mail.ts` | 5 (gói Pro) | Một ngôn ngữ: `native_language`, mặc định `vi` |

## Danh sách

Cột "Gửi khi nào" lấy từ chỗ gọi hàm. Nội dung là bản tiếng Việt (rút gọn khi dài).

| # | Email (hàm) | Gửi khi nào | Nội dung hiện tại (vi) |
|---|---|---|---|
| 1 | Mã xác minh email (`otpMail`, `verify_email`) | Đăng ký, hoặc bấm gửi lại mã (`otp.service.ts:62`) | Tiêu đề "Xác minh email / Verify your email". "Mã xác minh email của bạn: 123456. Mã có hiệu lực trong 10 phút." |
| 2 | Mã đặt lại mật khẩu (`otpMail`, `reset_password`) | Quên mật khẩu (`otp.service.ts:62`) | "Mã đặt lại mật khẩu của bạn: 123456. Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu, hãy bỏ qua thư này." |
| 3 | Tạm khóa mã (`otpLockedMail`) | Nhập sai mã quá nhiều lần (`otp.service.ts:150`) | "Xác minh email đã bị khóa trong 24 giờ do quá nhiều lần nhập mã sai. Đăng nhập bằng mật khẩu vẫn hoạt động." |
| 4 | Đã đổi mật khẩu (`passwordChangedMail`) | Người học tự đổi mật khẩu (`password.service.ts:79`) | "Bạn đã đổi mật khẩu. Nếu bạn không thực hiện thao tác này, hãy đặt lại mật khẩu ngay." |
| 5 | Đã đặt lại mật khẩu (`passwordResetMail`) | Đặt lại xong bằng mã (`password.service.ts:126`) | "Mật khẩu của bạn đã được đặt lại. Nếu bạn không thực hiện thao tác này, hãy đặt lại mật khẩu ngay." |
| 6 | Đã có tài khoản (`accountExistsMail`) | Ai đó đăng ký bằng email đã có tài khoản (`auth.service.ts:99`) | "Có người vừa dùng email này để đăng ký Wordmet, nhưng bạn đã có tài khoản… Đăng nhập tại <link>, hoặc dùng Quên mật khẩu…" |
| 7 | Đã liên kết Google (`googleLinkedMail`) | Google nối vào tài khoản có sẵn theo email (`google-auth.service.ts:334`) | "Tài khoản Google đã được liên kết với tài khoản Wordmet của bạn. Không phải bạn? Đổi mật khẩu ngay." |
| 8 | Đã xóa tài khoản (`accountDeletedMail`) | Xóa tài khoản xong (`account-deletion.service.ts:159`) | "Tài khoản Wordmet của bạn đã được xóa. Hồ sơ thanh toán được giữ N năm theo quy định, không kèm tên bạn." |
| 9 | Tài khoản người học do admin tạo (`learnerAccountMail`) | Admin tạo người học (`staff.service.ts:152`) | Link đăng nhập, email, **mật khẩu dạng chữ**, câu "sẽ được yêu cầu đổi mật khẩu" nếu bật. |
| 10 | Tài khoản quản trị (`staffAccountMail`) | Admin tạo `admin`/`editor` (`staff.service.ts:153`) | Như #9, link là trang admin. |
| 11 | Admin đặt lại mật khẩu (`adminPasswordResetMail`) | Admin đặt mật khẩu mới cho một người (`staff.service.ts:224`) | "Quản trị viên đã đặt lại mật khẩu của bạn và đăng xuất bạn khỏi mọi thiết bị." Kèm **mật khẩu mới dạng chữ**. |
| 12 | Email đã đổi, gửi địa chỉ cũ (`emailChangedNoticeMail`) | Admin đổi email của một người (`staff.service.ts:194`) | "Quản trị viên đã đổi email đăng nhập… thành <email mới>. Nếu bạn không yêu cầu, hãy liên hệ hỗ trợ." |
| 13 | Xác nhận email mới (`emailChangedConfirmMail`) | Cùng lúc với #12, gửi địa chỉ mới (`staff.service.ts:194`) | "Email đăng nhập… đã được đổi sang địa chỉ này. Để dùng tiếp, đăng nhập tại <link> bằng mật khẩu rồi nhập mã…" |
| 14 | Nhắc học thường (`reminderMail`, `regular`) | Worker nhắc theo lịch, người học còn từ đến hạn (`email.provider.ts:34`) | Tiêu đề "Tới giờ học từ vựng". "[Bạn đang có chuỗi N ngày. Học hôm nay để giữ chuỗi.] Hôm nay bạn còn từ cần ôn. Mở app để học vài phút nhé. Tắt nhắc học trong Cài đặt: <link>" |
| 15 | Nhắc khi lâu không học (`reminderMail`, `inactive`) | Như #14, người học vắng lâu | Tiêu đề "Đã lâu rồi bạn chưa vào học". "Các từ của bạn vẫn đang chờ. Quay lại học vài phút nhé." + link Cài đặt |
| 16 | Biên nhận mua Pro (`payment_receipt`) | payOS báo đã nhận tiền (`orders.repository.ts:359` → `notice-sender.service.ts:126`) | "Wordmet đã nhận tiền của bạn. Biên nhận:" gói, số tiền, nội dung chuyển khoản `WM…`, mã tham chiếu, dùng được từ … tới hết ngày …; "Không hoàn tiền sau khi đã thanh toán…" + link trang Gói |
| 17 | Pro sắp hết hạn (`expiry_notice`) | Kỳ trả trước cuối cùng còn ≤ N ngày (`notice-planner.service.ts:55`) | "Gói Wordmet Pro của bạn dùng được tới hết ngày …. Sau đó tài khoản về gói Miễn phí. Muốn dùng Pro tiếp, bạn mua kỳ mới tại <link>." |
| 18 | Bắt đầu dùng thử (`trial_started`) | **Không gửi lúc launch**: trial đã tắt (`trial_eligible` luôn `false`, launch A M3) | "Bản dùng thử Wordmet Pro của bạn kéo dài tới ngày …" + câu cách hủy tự gia hạn |
| 19 | Dùng thử sắp hết (`trial_reminder`) | **Không gửi lúc launch** (như #18) | "Bản dùng thử… kết thúc vào ngày …" + câu cách hủy |
| 20 | Sắp tự gia hạn (`renewal_notice`) | **Không gửi lúc launch**: chỉ có gói trả trước qua payOS, chưa có gói tự gia hạn thật | "Gói Wordmet Pro của bạn sẽ tự gia hạn và trừ tiền kỳ mới vào ngày …" + câu cách hủy |

Không email nào nhắc tới quảng cáo.

**#18–#20 chỉ để tham khảo** (chủ dự án 14/11/2026): không thiết kế giao diện, không đưa vào vận hành. Code của chúng giữ nguyên dạng text như hiện nay.

## Ghi nhận khi rà (chưa sửa)

- **Chỉ có text.** Muốn có HTML phải thêm trường `html` vào `MailMessage` và để nodemailer gửi cả hai phần (multipart). `FakeMailer` và các test đọc `text` hiện tại.
- **Song ngữ ở 13 email tài khoản** (#1–#13): hàm không biết ngôn ngữ người nhận. Lúc đăng ký (#1) người học chưa chọn ngôn ngữ.
- **Ba email gửi mật khẩu dạng chữ** (#9, #10, #11). Đây là cách làm có sẵn (AD18), không thuộc việc thiết kế giao diện, nhưng nên biết: mật khẩu nằm trong hộp thư người nhận.
- **Chữ chưa theo `vietnamese-writing.md`**: câu bị động ("Mật khẩu đã được đổi"), "hãy", "thực hiện thao tác này", "nhé", "của bạn" lặp.
- **#14–#15 không có nút mở app**, chỉ có link Cài đặt. **#1–#2 không có link** (chỉ có mã).
