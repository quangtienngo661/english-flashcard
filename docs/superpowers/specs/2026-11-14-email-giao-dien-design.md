# Giao diện email Wordmet — Design (14/11/2026)

> **Trạng thái 14/11/2026:** chủ dự án đã duyệt các đề xuất trong chat (D1–D11) và mockup. Chưa có code.
> Decision record: [`../decisions/2026-11-14-email-giao-dien-decisions.md`](../decisions/2026-11-14-email-giao-dien-decisions.md).
> **Mockup:** [`../../mockups/2026-11-14-email/index.html`](../../mockups/2026-11-14-email/index.html) (17 email, sáng/tối, máy tính/điện thoại, Việt/Anh, bản text).
> **Danh sách email đang gửi:** [`../../preparation/EMAIL_INVENTORY_2026-11-14.md`](../../preparation/EMAIL_INVENTORY_2026-11-14.md).
> **Code đọc trên:** `origin/dev` @ `0cc6f174` (14/11/2026).

Ví dụ xuyên suốt: **Lan** (`lan.nguyen@gmail.com`) đăng ký, nhận mã `482915`, sau đó mua Wordmet Pro 3 tháng giá 249.000 ₫.

## 1. Mục tiêu và phạm vi

Mọi email Wordmet đang gửi thật có bản HTML mang giao diện mới (design `2026-11-09-giao-dien-moi-design.md`, Figma `JKnyUUtGjpGpfKK4PqBfdY`),
kèm bản text. Chữ viết lại theo `~/.claude/rules/vietnamese-writing.md`.

**Trong phạm vi: 17 email** (số theo bản rà).

| Nhóm | Email | File hiện tại |
|---|---|---|
| Tài khoản (song ngữ) | #1 mã xác minh, #2 mã đặt lại mật khẩu, #3 tạm khóa mã, #4 đã đổi mật khẩu, #5 đã đặt lại mật khẩu, #6 đã có tài khoản, #7 đã liên kết Google, #8 đã xóa tài khoản | `apps/api/src/identity/mailer/templates.ts` |
| Do admin gửi (song ngữ) | #9 tài khoản người học, #10 tài khoản quản trị, #11 admin đặt lại mật khẩu, #12 email đã đổi (địa chỉ cũ), #13 xác nhận email mới | `apps/api/src/identity/mailer/templates.ts` |
| Nhắc học (một ngôn ngữ) | #14 nhắc thường, #15 nhắc khi vắng lâu | `apps/api/src/notifications/provider/reminder-message.ts` |
| Gói Pro (một ngôn ngữ) | #16 biên nhận, #17 Pro sắp hết hạn | `apps/api/src/entitlements/notices/entitlement-mail.ts` |

**Ngoài phạm vi:**
- #18 bắt đầu dùng thử, #19 dùng thử sắp hết, #20 sắp tự gia hạn: chỉ để tham khảo (D1). Code giữ nguyên dạng text. Trial đã tắt và chưa có gói tự gia hạn thật.
- Header `List-Unsubscribe` cho email nhắc học (việc sau, §11).
- Đổi cách gửi mật khẩu dạng chữ trong #9–#11 (AD18, có từ trước).
- Đổi ngôn ngữ của 13 email tài khoản sang một ngôn ngữ (D2).

## 2. Giao diện chung

```
 nền #f6f7fa (tối #0f1220)
 ┌──────────────────────────────── tối đa 560 px ┐
 │ wordmet.            ← chữ HTML, dấu chấm navy │
 │ ┌───────────────────────────────────────────┐ │
 │ │ thẻ trắng, viền #e1e5ee, bo 14 px, đệm 32 │ │
 │ │ Tiêu đề 24 px                             │ │
 │ │ Đoạn 16 px                                │ │
 │ │ [khối mã | bảng chi tiết | ghi chú]       │ │
 │ │ [ Nút chính ]                             │ │
 │ │ chữ phụ 14 px                             │ │
 │ │ ── English ── (chỉ email song ngữ)        │ │
 │ └───────────────────────────────────────────┘ │
 │ chân thư 12 px: lý do / tắt nhắc / hỗ trợ     │
 │ Chính sách bảo mật · Điều khoản · © 2026      │
 └───────────────────────────────────────────────┘
```

### 2.1 Màu (từ `packages/design-tokens`)

| Vai trò | Sáng (`web.css`) | Tối (`web-dark.css`) |
|---|---|---|
| Nền ngoài | `bg` `#f6f7fa` | `#0f1220` |
| Thẻ | `surface` `#ffffff` | `#171b2a` |
| Chữ chính | `ink` `#1b2444` | `#eceef5` |
| Chữ phụ | `muted` `#525a78` | `#a6adc4` |
| Đường kẻ, viền thẻ | `line` `#e1e5ee` | `#2a3044` |
| Nút, dấu chấm logo, viền ghi chú | `accent` `#1e3a8a` | `#8da2ff` |
| Chữ trên nút | `on-accent` `#ffffff` | `#0f1220` |
| Nền khối mã | `accent-soft` `#e7ecf8` | `#2c334f` |
| Nhãn chuỗi ngày | `mark` `#ffd84a`, chữ `mark-ink` `#1b2444` | giữ nguyên |

Bảng màu nằm trong một hằng số của API. Một unit test đọc `packages/design-tokens/web.css` và `web-dark.css`, rồi so từng giá trị, để màu email không lệch khi token đổi.

### 2.2 Chữ

- Font hệ thống: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', Helvetica, Arial, sans-serif`. Không tải web font (D4).
- Logo: chữ `wordmet` 24 px, đậm 800, khoảng chữ −0,5 px, dấu `.` màu `accent`. Không dùng ảnh (D3).
- Tiêu đề 24 px / 1,3 đậm 700; đoạn 16 px / 1,6; chữ phụ 14 px; chân thư 12 px.

### 2.3 Khối nội dung

Mỗi email là một danh sách khối. Cùng một danh sách dựng ra cả HTML và bản text (D10).

| Khối | HTML | Bản text |
|---|---|---|
| `heading` | `<h1>` 24 px | dòng riêng |
| `paragraph` | `<p>` 16 px; cho phép đoạn đậm và link | dòng riêng, link ghi dạng `chữ (url)` |
| `muted` | `<p>` 14 px màu `muted` | dòng riêng |
| `code` | ô nền `accent-soft`, bo 10 px, số 36 px đậm, `letter-spacing: 10px`, `tabular-nums`, căn giữa (D6) | dòng riêng chỉ có mã |
| `button` | bảng một ô nền `accent`, bo 8 px, link đệm 13×24 px, chữ 16 px đậm 600 (D7) | `Nhãn: url` |
| `rows` | bảng hai cột: nhãn `muted` 14 px, giá trị `ink` 15 px đậm; kẻ `line` giữa các dòng | mỗi dòng `Nhãn: giá trị`; email song ngữ ghi `Nhãn vi / Nhãn en: giá trị` |
| `chip` | ô bo tròn nền `mark` | dòng riêng |
| `note` | ô nền `bg`, viền trái 3 px `accent` | dòng riêng |

Mọi chữ đi vào HTML đều được escape. Đoạn đậm và link là các phần tử có kiểu riêng, không phải chuỗi HTML tự do.

### 2.4 Email song ngữ (D2)

Phần tiếng Việt đầy đủ: tiêu đề, khối mã, nút, bảng. Bên dưới là đường kẻ, nhãn "English" 12 px, rồi phần tiếng Anh 14 px màu `muted`.
Phần tiếng Anh chỉ có đoạn văn. Mã, nút và bảng không lặp lại. Link trong email song ngữ đi tới bản `/vi/` của web
(`localePrefix: 'always'`, `apps/web/src/i18n/routing.ts`).

### 2.5 Chân thư (D8)

| Loại | Dòng đầu | Dòng sau |
|---|---|---|
| Tài khoản, admin (#1–#7, #9–#13) | "Bạn nhận thư này vì email này gắn với một tài khoản Wordmet." + câu tiếng Anh | Chính sách bảo mật · Điều khoản sử dụng · © 2026 Wordmet |
| Đã xóa tài khoản (#8) | không có (tài khoản không còn) | như trên |
| Nhắc học (#14, #15) | "Không muốn nhận nhắc học? Tắt trong Cài đặt." (link `/{lang}/app/settings`) | như trên |
| Gói Pro (#16, #17) | "Cần hỗ trợ về thanh toán? Viết cho support@wordmet.com." | như trên |

Link chính sách và điều khoản: `<learnerAppUrl>/{lang}/privacy`, `<learnerAppUrl>/{lang}/terms`. Không email nào nhắc tới quảng cáo.

### 2.6 Chế độ tối (D5)

- `<meta name="color-scheme" content="light dark">` và `supported-color-schemes`.
- Một khối `<style>` có `@media (prefers-color-scheme: dark)` đổi màu theo §2.1 bằng class (`wm-card`, `wm-ink`…) và `!important`.
  Apple Mail, Outlook.com và Gmail trên iPhone đọc khối này.
- Gmail trên Android và Outlook trên Windows tự đảo màu, không đọc khối này. Thiết kế không dùng ảnh có chữ và không dùng màu chữ sát màu nền, nên bản đảo vẫn đọc được.
  Điều này **chưa kiểm trên máy thật** (§11).

### 2.7 Kỹ thuật HTML

- Layout bảng (`role="presentation"`), CSS inline trên từng phần tử; khối `<style>` chỉ chứa phần điện thoại (`max-width: 600px`: đệm thẻ 24×20) và phần tối.
- Rộng tối đa 560 px, nằm trong giới hạn 600 px.
- Preheader: một `div` ẩn chứa câu tóm tắt, hiện ở dòng xem trước của hộp thư. Mã OTP **không** nằm trong tiêu đề hay preheader (D6).
- Không ảnh, không script, không web font, không link ngoài domain Wordmet trừ `mailto:`.

## 3. Nội dung từng email

Chữ đầy đủ (vi và en) nằm trong mockup, mảng `MAILS`. Bảng dưới ghi tiêu đề thư, khối chính và nút. Tiêu đề đánh dấu **(giữ)** là giữ nguyên chuỗi
hiện tại, vì smoke script so khớp đúng chuỗi đó (§8).

| # | Tiêu đề thư | Khối chính | Nút → đường dẫn |
|---|---|---|---|
| 1 | Mã xác minh Wordmet / Your Wordmet code | tiêu đề "Xác minh email", khối mã, "Mã có hiệu lực 10 phút." | không |
| 2 | Mã đặt lại mật khẩu Wordmet / Your Wordmet reset code | "Đặt lại mật khẩu", khối mã | không |
| 3 | Tạm khóa nhập mã Wordmet / Wordmet codes locked | "Tạm khóa nhập mã"; tên mục bị khóa theo `purpose` | không |
| 4 | Mật khẩu Wordmet đã đổi / Your Wordmet password was changed | ghi chú "Không phải bạn đổi?" | Đặt lại mật khẩu → `/vi/app/forgot-password` |
| 5 | Mật khẩu Wordmet đã đặt lại / Your Wordmet password was reset | ghi chú "Không phải bạn?" | Đặt lại mật khẩu → `/vi/app/forgot-password` |
| 6 | Bạn đã có tài khoản Wordmet / You already have a Wordmet account | | Đăng nhập → `/vi/app/login` |
| 7 | Đã liên kết Google với Wordmet / Google linked to Wordmet | ghi chú "Không phải bạn?" | Đặt lại mật khẩu → `/vi/app/forgot-password` |
| 8 | Tài khoản Wordmet đã xóa / Your Wordmet account was deleted | số năm giữ hồ sơ thanh toán (`retentionYears`) | không |
| 9 | Tài khoản Wordmet của bạn / Your Wordmet account | bảng Email, Mật khẩu tạm / Password | Đăng nhập → `/vi/app/login` |
| 10 | Tài khoản quản trị Wordmet / Your Wordmet admin account | bảng Email, Mật khẩu tạm / Password | Mở trang quản trị → `adminAppUrl` |
| 11 | Mật khẩu Wordmet đã đặt lại / Your Wordmet password was reset | bảng Mật khẩu mới / New password | Đăng nhập → `/vi/app/login` hoặc `adminAppUrl` (theo `appUrl` hiện tại) |
| 12 | Email đăng nhập Wordmet đã đổi / Your Wordmet email was changed | bảng Email mới; ghi chú có `support@wordmet.com` | không |
| 13 | Xác nhận email Wordmet mới / Confirm your new Wordmet email | | Đăng nhập → `/vi/app/login` |
| 14 | Tới giờ ôn từ / Time to review your words | nhãn chuỗi ngày (khi `streakDays` khác `null`) | Ôn ngay → `/{lang}/app` |
| 15 | Các từ của bạn vẫn đang chờ / Your words are still waiting | | Mở Wordmet → `/{lang}/app` |
| 16 | Biên nhận mua Wordmet Pro / Your Wordmet Pro receipt **(giữ)** | bảng Gói, Số tiền, Nội dung chuyển khoản, Mã tham chiếu, Dùng được | Xem gói của bạn → `/{lang}/app/plans` |
| 17 | Gói Wordmet Pro sắp hết hạn / Your Wordmet Pro plan ends soon **(giữ)** | ngày cuối đậm; "các từ và lịch ôn vẫn giữ nguyên" | Mua kỳ mới → `/{lang}/app/plans` |

Hai câu trong #17 đã kiểm trên code: gói Free không giới hạn số từ (`apps/api/src/entitlements/rules/plan-rules.ts`: chỉ có `practice_sessions`,
`ai_practice`, `ai_lookup`), và không chỗ nào trong `entitlements` hay `learning` xóa dữ liệu học khi Pro hết (lệnh xóa chỉ có ở thao tác của người
học và ở xóa tài khoản).

## 4. Bản text (D10)

Luôn gửi kèm, dựng từ cùng danh sách khối. Bố cục:

```
Xác minh email

Nhập mã này trong Wordmet để xác minh email.

482915

Mã có hiệu lực 10 phút. Không phải bạn đăng ký thì bỏ qua thư này.

---

Enter this code in Wordmet to verify your email. ...

--
Bạn nhận thư này vì email này gắn với một tài khoản Wordmet.
You received this email because this address belongs to a Wordmet account.
```

Ràng buộc (vì test và script đang đọc bản text, §8):
- Trong #1, #2: số 6 chữ số **đầu tiên** của bản text là mã. Các email khác không có số 6 chữ số đứng riêng trước mã của thư sau đó.
- Trong #9, #10: có dòng `Mật khẩu tạm / Password: <mật khẩu>` (admin e2e đọc `Password: \S+`).
- Trong #11: có dòng `Mật khẩu mới / New password: <mật khẩu>`.

## 5. Kiến trúc code

```
 identity/mailer/templates.ts ─┐
 notifications/.../reminder-message.ts ─┼─► common/mail/layout/render-mail.ts ─► { html, text }
 entitlements/notices/entitlement-mail.ts ─┘            (hàm thuần, không I/O)
                                                    │
 MailMessage { to, subject, text, html? } ─► Mailer.send ─► SmtpMailer (nodemailer: text + html)
```

- `MailMessage` thêm `html?: string`. `SmtpMailer` chuyển nguyên cho nodemailer; nodemailer tự gửi `multipart/alternative`. `FakeMailer` giữ cả hai.
- `common/mail/layout/`: kiểu `MailBlock`, `MailSpec` và hàm `renderMail(spec)`. `common` không import `identity` (quy ước D3), nên layout chỉ nhận dữ liệu.
- Bảng màu `EMAIL_COLORS` trong `common/mail/layout/colors.ts`.
- Các hàm template giữ tên và kiểu trả về. Hàm cần link nhận thêm `appUrl` (#4, #5, #7). Bên gọi đã có `APP_CONFIG`
  (`password.service.ts`, `google-auth.service.ts`).
- `entitlementMail` trả thêm `html` cho `payment_receipt` và `expiry_notice`. Ba loại còn lại trả như cũ, không có `html` (D1).
- `supportEmail`: cấu hình mới `SUPPORT_EMAIL`, không bắt buộc, mặc định `support@wordmet.com` (giống `NEXT_PUBLIC_SUPPORT_EMAIL` của web).
- Không thêm dependency.

## 6. Tình huống biên (When → Then)

| Khi | Thì |
|---|---|
| Hộp thư chặn ảnh (Outlook mặc định) | Không có ảnh nào bị chặn; logo là chữ. |
| Hộp thư không đọc `<style>` | CSS inline vẫn cho bản sáng đầy đủ; mất phần điện thoại và phần tối. |
| Hộp thư chỉ hiện text | Người nhận đọc bản text; mã, link và mật khẩu đều có. |
| Người học chọn chép mã trong HTML | `letter-spacing` không chèn ký tự; chép ra đúng `482915`. |
| Dữ liệu có ký tự HTML (`<`, `&`) trong email mới, nội dung chuyển khoản | Được escape; không vỡ layout, không chèn được thẻ. |
| `streakDays` là `null` | Không có nhãn chuỗi ngày; câu "giữ chuỗi" bỏ đi. |
| `retentionYears` khác 10 | Số năm lấy từ tham số như hiện nay. |
| `mustChange` là `false` (#9–#11) | Bỏ câu "Wordmet yêu cầu bạn đổi mật khẩu". |
| Ngôn ngữ người học `en` (#14–#17) | Toàn bộ thư tiếng Anh, link `/en/...`, ngày theo `en-US` như hiện nay. |
| `SUPPORT_EMAIL` không đặt | Dùng `support@wordmet.com`. |

## 7. Kiểm thử

- **Unit, `renderMail`:** escape; mỗi loại khối có trong HTML và bản text; khối `code` ra đúng một dòng chỉ có mã; HTML không có `<img`, `<script`,
  `@import`, `<link`; có `color-scheme` và khối `prefers-color-scheme: dark`; bảng ngoài `max-width:560px`; preheader có mặt và không chứa mã.
- **Unit, màu:** `EMAIL_COLORS` khớp từng giá trị trong `web.css` và `web-dark.css`.
- **Unit, từng template:** tiêu đề chính xác; bản text chứa mã, link, mật khẩu đúng ràng buộc §4; HTML chứa nút đúng URL; #18–#20 không có `html`.
  Test có sẵn của ba file template và các service (`otp.service.spec.ts`, `staff-user-edit.service.spec.ts`, `notices.spec.ts`…) sửa theo chữ mới.
- **Xem thật:** lệnh CLI `mail:preview` gửi 17 email mẫu vào Mailpit (`http://localhost:8025`). Mailpit có tab HTML Check báo chỗ không hỗ trợ theo từng hộp thư.
- **Smoke chạy lại** trên DB mới: `smoke:identity`, `smoke:buoc-8`, `smoke:buoc-b-payments`. CI chạy `admin-e2e-real`.
- **Chủ dự án kiểm trên hộp thư thật:** Gmail web, Gmail Android (chế độ tối), Gmail iPhone, Outlook, Apple Mail.

## 8. Chỗ code khác đọc nội dung email

| Chỗ đọc | Đọc gì | Hệ quả |
|---|---|---|
| 12 smoke script và `learner-test-setup.mjs` | số 6 chữ số đầu tiên trong `Text` của Mailpit | Giữ ràng buộc §4. |
| `smoke-buoc-8.mjs:117–118` | tiêu đề khớp `đã được xóa\|was deleted`, `liên kết\|linked` | Tiêu đề mới #8, #7 vẫn khớp. |
| `smoke-buoc-b-payments.mjs:477, 488` | tiêu đề đúng chuỗi `Biên nhận mua Wordmet Pro`, `Gói Wordmet Pro sắp hết hạn` | Giữ hai tiêu đề này. |
| `apps/admin/e2e-real/support/mailpit.ts` | `Password: \S+` trong `Text`; mã 6 số | Giữ ràng buộc §4. |
| `FakeMailer.otpFor` | số 6 chữ số trong `text` | Giữ ràng buộc §4. |

## 9. Cấu hình và triển khai

- Biến môi trường mới `SUPPORT_EMAIL` (không bắt buộc). Thêm vào `.env.example`.
- Không migration. Không đổi cách gửi, không đổi `MAIL_DAILY_BUDGET`.
- HTML làm thư nặng hơn khoảng 6–10 KB. Resend tính theo số thư, không theo dung lượng (**ASSUMPTION**: chưa đọc bảng giá Resend trong phiên này).

## 10. Quyết định

Xem decision record. Tóm tắt: D1 làm 17 email đang gửi thật, D2 giữ song ngữ, D3 logo bằng chữ, D4 font hệ thống, D5 CSS tối + màu chịu được đảo,
D6 khối mã lớn và không đưa mã lên tiêu đề, D7 một nút chính, D8 chân thư theo loại, D9 viết lại chữ, D10 một hàm layout tự viết, D11 unit test + Mailpit.

## 11. Rủi ro và chỗ chưa kiểm

- Chưa xem trên hộp thư thật. Mockup chỉ chạy trong trình duyệt.
- Gmail Android và Outlook Windows tự đảo màu; kết quả chưa thấy.
- Hộp thư `support@wordmet.com` chưa kiểm có tồn tại. Nếu không, đặt `SUPPORT_EMAIL` trước khi deploy.
- Email nhắc học chưa có header `List-Unsubscribe`. Gmail và Yahoo đòi header này với người gửi số lượng lớn. Việc sau, ngoài đợt này.
- Ba email admin vẫn gửi mật khẩu dạng chữ (AD18).
