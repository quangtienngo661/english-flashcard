# Giao diện email Wordmet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 17 email Wordmet đang gửi có bản HTML theo giao diện mới, luôn kèm bản text, chữ viết lại theo quy tắc văn phong.

**Architecture:** Một hàm thuần `renderMail(spec)` trong `apps/api/src/common/mail/layout/` dựng cả HTML (bảng, CSS inline, khối tối) và bản text
từ một danh sách khối. Ba file template hiện có gọi hàm này và trả thêm `html`. `MailMessage` có thêm `html?`; `SmtpMailer` chuyển cho nodemailer.

**Tech Stack:** NestJS 11, TypeScript, Vitest, nodemailer (có sẵn). Không thêm dependency.

**Spec:** [`../specs/2026-11-14-email-giao-dien-design.md`](../specs/2026-11-14-email-giao-dien-design.md) · decisions
[`../decisions/2026-11-14-email-giao-dien-decisions.md`](../decisions/2026-11-14-email-giao-dien-decisions.md) · **chữ chính xác của từng email:**
mảng `MAILS` trong [`../../mockups/2026-11-14-email/index.html`](../../mockups/2026-11-14-email/index.html) (theo `id`).

**Nhánh:** `feat/email-giao-dien` từ `origin/dev`. Mọi lệnh chạy trong `apps/api` trừ khi ghi khác.

## Global Constraints

- Phạm vi: 17 email (#1–#17 của design §1). `trial_started`, `trial_reminder`, `renewal_notice` **không có `html`**, chữ giữ nguyên (D1).
- Màu chỉ lấy từ `packages/design-tokens/web.css` và `web-dark.css` (design §2.1).
- Font: `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans',Helvetica,Arial,sans-serif`; không `@import`, không `<link>`, không `<img>`, không `<script>`.
- Bảng ngoài `max-width:560px`; thẻ bo 14 px, đệm 32 px (điện thoại 24×20).
- Mã OTP không có trong tiêu đề thư và preheader (D6).
- Bản text: mã là số 6 chữ số đầu tiên (#1, #2); dòng `Mật khẩu tạm / Password: <mật khẩu>` (#9, #10); dòng `Mật khẩu mới / New password: <mật khẩu>` (#11) (design §4).
- Tiêu đề giữ nguyên: `Biên nhận mua Wordmet Pro`, `Gói Wordmet Pro sắp hết hạn` (vi); `Your Wordmet Pro receipt`, `Your Wordmet Pro plan ends soon` (en).
- Tiêu đề #7 phải khớp `/liên kết|linked/i`; #8 khớp `/đã được xóa|was deleted/i` (`smoke-buoc-8.mjs:117–118`). Tiêu đề mới của #8 trong mockup
  ("Tài khoản Wordmet đã xóa / Your Wordmet account was deleted") khớp nhờ "was deleted".
- Email song ngữ: link tới `/vi/...`; một ngôn ngữ: `/{lang}/...`.
- Chữ copy đúng từ mảng `MAILS` của mockup, không tự viết lại.

## Review Focus

- Dữ liệu có `<`, `&`, `"` (email lạ, nội dung chuyển khoản, mật khẩu sinh ra có ký tự đặc biệt như `Kp7#<wQ&`) → HTML escape đúng, bản text giữ nguyên ký tự. Test ở Task 2.
- Người học chép mã từ HTML → chép ra đúng 6 số, không khoảng trắng: mã nằm trong **một** node chữ, giãn bằng `letter-spacing`. Test ở Task 2.
- `streakDays` là `null` hoặc `0` → không nhãn chuỗi, không câu "giữ chuỗi". Test ở Task 7.
- `mustChange` là `false` → không câu "Wordmet yêu cầu bạn đổi mật khẩu" ở cả HTML lẫn text. Test ở Task 6.
- Ngôn ngữ `en` ở #14–#17 → toàn thư tiếng Anh, `lang="en"`, link `/en/`, chân thư tiếng Anh. Test ở Task 7, Task 8.

---

### Task 1: `MailMessage.html` và gửi multipart

**Files:**
- Modify: `src/common/mail/mailer.ts`, `src/common/mail/smtp-mailer.ts` (không đổi logic, chỉ kiểu), `src/common/mail/fake-mailer.ts`
- Test: `src/common/mail/smtp-mailer.spec.ts`, `src/common/mail/fake-mailer.spec.ts`

**Interfaces:**
- Produces: `interface MailMessage { to: string; subject: string; text: string; html?: string }`.

- [ ] **Step 1: Write the failing tests**
  - `smtp-mailer.spec.ts` → `it('passes html with text so nodemailer sends multipart/alternative')`: gửi `{ to, subject, text: 'body', html: '<p>body</p>' }`,
    assert `sendMail` nhận đúng `{ from, to, subject, text: 'body', html: '<p>body</p>' }`.
  - Thêm một test dùng nodemailer thật (`vi.importActual('nodemailer')`, `createTransport({ streamTransport: true, buffer: true })`) chứng minh message có
    cả hai phần: chuỗi raw chứa `multipart/alternative`, `text/plain` và `text/html`.
  - `fake-mailer.spec.ts` → `it('keeps html')`: `sent[0].html === '<p>x</p>'`.
- [ ] **Step 2:** `pnpm vitest run src/common/mail` → FAIL (kiểu `html` chưa có).
- [ ] **Step 3:** Thêm `html?: string` vào `MailMessage`. `SmtpMailer.send` đã spread `...msg` nên chỉ cần kiểu.
- [ ] **Step 4:** `pnpm vitest run src/common/mail` → PASS.
- [ ] **Step 5:** Commit `feat(api): carry an html part in mail messages`.

### Task 2: Màu, khối và `renderMail`

**Files:**
- Create: `src/common/mail/layout/colors.ts`, `src/common/mail/layout/blocks.ts`, `src/common/mail/layout/render-mail.ts`
- Test: `src/common/mail/layout/colors.spec.ts`, `src/common/mail/layout/render-mail.spec.ts`

**Interfaces:**
- Produces (`blocks.ts`):
  ```ts
  export type Inline = string | { bold: string } | { link: string; href: string };
  export type MailBlock =
    | { kind: 'heading'; text: string }
    | { kind: 'paragraph'; parts: Inline[] }
    | { kind: 'muted'; parts: Inline[] }
    | { kind: 'note'; parts: Inline[] }
    | { kind: 'code'; code: string }
    | { kind: 'button'; label: string; href: string }
    | { kind: 'rows'; rows: Array<{ label: string; value: string; textLabel?: string }> }
    | { kind: 'chip'; text: string };
  export type MailFooter =
    | { kind: 'account' } | { kind: 'reminder'; settingsUrl: string } | { kind: 'billing'; supportEmail: string } | { kind: 'none' };
  export type MailSpec = {
    language: 'vi' | 'en';      // <html lang>, chân thư, link chính sách; email song ngữ dùng 'vi'
    preheader: string;
    blocks: MailBlock[];
    english?: MailBlock[];      // có = email song ngữ: đường kẻ, nhãn "English", khối 14 px màu muted
    footer: MailFooter;
    appUrl: string;             // learnerAppUrl, không có dấu "/" cuối
  };
  ```
- Produces (`render-mail.ts`): `export function renderMail(spec: MailSpec): { html: string; text: string }`.
- Produces (`colors.ts`): `export const EMAIL_COLORS: { light: Record<EmailColor, string>; dark: Record<Exclude<EmailColor,'mark'|'markInk'>, string> }`,
  `type EmailColor = 'bg'|'surface'|'ink'|'muted'|'line'|'accent'|'accentSoft'|'onAccent'|'mark'|'markInk'`, giá trị theo design §2.1.

- [ ] **Step 1: Write the failing tests**
  - `colors.spec.ts` → `it('matches the web tokens')`: đọc `../../../../../../packages/design-tokens/web.css` và `web-dark.css` (tính từ file spec), lấy
    `--color-wm-<tên>: #xxxxxx` bằng regex; map `accentSoft→accent-soft`, `onAccent→on-accent`, `markInk→mark-ink`; assert từng giá trị bằng nhau.
  - `render-mail.spec.ts`, mỗi `it` một hành vi, giá trị chính xác:
    - `'escapes every text it is given'`: paragraph `'a <b> & "c"'` → HTML chứa `a &lt;b&gt; &amp; &quot;c&quot;`, text chứa `a <b> & "c"`; rows value `Kp7#<wQ&` tương tự.
    - `'puts the code in one text node and on its own text line'`: code `'482915'` → HTML khớp `/>482915</`, có `letter-spacing:10px`; dòng text đúng bằng `482915`.
    - `'renders a button as a table cell link'`: href `https://x.test/vi/app/login` xuất hiện trong `href="…"`; text có dòng `Đăng nhập: https://x.test/vi/app/login`.
    - `'renders rows with the text label when given'`: `{ label:'Mật khẩu tạm', textLabel:'Mật khẩu tạm / Password', value:'Kp7' }` → text có dòng `Mật khẩu tạm / Password: Kp7`, HTML có `Mật khẩu tạm` không có `/ Password`.
    - `'adds the English part under a rule when english is given'`: HTML chứa `>English<`; text có dòng `---` rồi đoạn tiếng Anh.
    - `'writes the footer of each kind'`: `account` → cả hai câu lý do (design §2.5); `reminder` → link settingsUrl; `billing` → `mailto:support@x.test`; `none` → không câu lý do. Mọi loại: link `${appUrl}/vi/privacy` và `/vi/terms` (hoặc `/en/` khi `language: 'en'`) và `© 2026 Wordmet`.
    - `'is a safe email document'`: HTML không khớp `/<img|<script|@import|<link/i`; có `name="color-scheme" content="light dark"`, `prefers-color-scheme: dark`, `max-width:560px`, `lang="vi"`; mọi mã màu `#xxxxxx` trong HTML thuộc `EMAIL_COLORS`.
    - `'carries the preheader but never the code in it'`: preheader nằm trong `div` có `display:none`; spec có code `482915` và preheader `Mã có hiệu lực 10 phút.` → chuỗi `482915` chỉ xuất hiện đúng một lần trong HTML.
- [ ] **Step 2:** `pnpm vitest run src/common/mail/layout` → FAIL (module chưa có).
- [ ] **Step 3:** Viết `colors.ts`, `blocks.ts`, `render-mail.ts`. Markup và CSS lấy theo hàm `emailHtml`, `blockHtml`, `footerHtml`, `emailText` của mockup
  (cùng class `wm-*` và khối tối), thay chuỗi HTML tự do bằng `Inline[]` có escape. Chân thư lấy chữ từ design §2.5.
- [ ] **Step 4:** `pnpm vitest run src/common/mail/layout` → PASS.
- [ ] **Step 5:** Commit `feat(api): render html and text mail from one block list`.

### Task 3: Cấu hình `SUPPORT_EMAIL`

**Files:**
- Modify: `src/common/config/app-config.ts` (schema cạnh `LEARNER_APP_URL` dòng ~277, giá trị cạnh dòng ~452), `.env.example`, `test/support/test-config.ts` nếu nó liệt kê đủ trường
- Test: spec có sẵn của `app-config` (tìm bằng `grep -rl "loadConfig" src --include=*.spec.ts`)

**Interfaces:**
- Produces: `AppConfig.supportEmail: string`.

- [ ] **Step 1:** Test: không đặt `SUPPORT_EMAIL` → `supportEmail === 'support@wordmet.com'`; đặt `help@example.com` → giá trị đó; đặt `not-an-email` → `loadConfig` throw và lỗi nêu `SUPPORT_EMAIL`.
- [ ] **Step 2:** Chạy spec đó → FAIL.
- [ ] **Step 3:** `SUPPORT_EMAIL: z.email().default('support@wordmet.com')`; thêm dòng có chú thích vào `.env.example`.
- [ ] **Step 4:** Chạy lại → PASS.
- [ ] **Step 5:** Commit `feat(api): add the support address used in emails`.

### Task 4: Email mã OTP và tạm khóa (#1–#3)

**Files:**
- Modify: `src/identity/mailer/templates.ts` (`otpMail`, `otpLockedMail`), `src/identity/auth/otp.service.ts:62,150`
- Test: `src/identity/mailer/templates.spec.ts`, `src/identity/auth/otp.service.spec.ts`

**Interfaces:**
- Consumes: `renderMail`, `MailSpec` (Task 2).
- Produces: `otpMail(to: string, purpose: OtpPurpose, code: string, appUrl: string): MailMessage`;
  `otpLockedMail(to: string, purpose: OtpPurpose, appUrl: string): MailMessage`. Bên gọi truyền `this.config.learnerAppUrl`.

- [ ] **Step 1: Write the failing tests** (`templates.spec.ts`)
  - `#1`: subject `'Mã xác minh Wordmet / Your Wordmet code'`; `text.match(/\d{6}/)?.[0] === '482915'`; subject và preheader không chứa `482915`; HTML chứa `Xác minh email` và `>English<`; không có nút.
  - `#2`: subject `'Mã đặt lại mật khẩu Wordmet / Your Wordmet reset code'`; như trên; text chứa `mật khẩu không đổi`.
  - `#3`: subject `'Tạm khóa nhập mã Wordmet / Wordmet codes locked'`; `purpose: 'verify_email'` → text chứa `xác minh email` và `email verification`; `reset_password` → `đặt lại mật khẩu` và `password reset`; cả hai chứa `24 giờ` và `24 hours`.
  - Mọi email nhóm này: `html` khác `undefined`; `FakeMailer.otpFor` trả `482915` sau khi gửi #1.
- [ ] **Step 2:** `pnpm vitest run src/identity` → FAIL.
- [ ] **Step 3:** Viết lại hai hàm bằng `renderMail`, chữ từ `MAILS` id `otp-verify`, `otp-reset`, `otp-locked`; footer `account`; sửa hai chỗ gọi trong `otp.service.ts`.
- [ ] **Step 4:** `pnpm vitest run src/identity` → PASS (sửa assert chữ cũ trong `otp.service.spec.ts` theo chữ mới).
- [ ] **Step 5:** Commit `feat(api): send otp and lock emails as html`.

### Task 5: Email bảo mật và tài khoản (#4–#8)

**Files:**
- Modify: `src/identity/mailer/templates.ts` (`passwordChangedMail`, `passwordResetMail`, `accountExistsMail`, `googleLinkedMail`, `accountDeletedMail`);
  `src/identity/auth/password.service.ts:79,126`; `src/identity/google/google-auth.service.ts:334`; `src/identity/deletion/account-deletion.service.ts:52-59,159` (thêm `@Inject(APP_CONFIG) private readonly config: AppConfig`)
- Test: `templates.spec.ts`, `password.service.spec.ts`, `account-deletion.service.spec.ts`, `google-auth.controller.spec.ts`

**Interfaces:**
- Produces: thêm tham số cuối `appUrl: string` cho `passwordChangedMail(to, appUrl)`, `passwordResetMail(to, appUrl)`, `googleLinkedMail(to, appUrl)`,
  `accountDeletedMail(to, retentionYears, appUrl)`. `accountExistsMail(to, learnerAppUrl)` giữ nguyên chữ ký.

- [ ] **Step 1: Write the failing tests** (`templates.spec.ts`, mỗi email một `it`):
  - `#4` subject `'Mật khẩu Wordmet đã đổi / Your Wordmet password was changed'`, HTML có nút `href="http://localhost:3001/vi/app/forgot-password"`, text có dòng `Đặt lại mật khẩu: http://localhost:3001/vi/app/forgot-password`.
  - `#5` subject `'Mật khẩu Wordmet đã đặt lại / Your Wordmet password was reset'`, cùng nút.
  - `#6` subject `'Bạn đã có tài khoản Wordmet / You already have a Wordmet account'`, nút `…/vi/app/login`, text không khớp `/\b\d{6}\b/`.
  - `#7` subject khớp `/liên kết|linked/i`, nút `…/vi/app/forgot-password`.
  - `#8` subject khớp `/đã được xóa|was deleted/i`; `retentionYears: 7` → text chứa `7 năm` và `7 years`; footer `none` (không có câu "Bạn nhận thư này").
  - Bỏ các assert chữ cũ (`'đã được xóa'` trong body…) đã không còn đúng.
- [ ] **Step 2:** `pnpm vitest run src/identity` → FAIL.
- [ ] **Step 3:** Viết lại năm hàm từ `MAILS` id `pw-changed`, `pw-reset`, `exists`, `google`, `deleted`; sửa bốn chỗ gọi truyền `this.config.learnerAppUrl`.
  Spec dựng `AccountDeletionService` bằng tay thì thêm `testConfig()` vào đúng vị trí tham số.
- [ ] **Step 4:** `pnpm vitest run src/identity` → PASS.
- [ ] **Step 5:** Commit `feat(api): send account and security emails as html`.

### Task 6: Email do admin gửi (#9–#13)

**Files:**
- Modify: `src/identity/mailer/templates.ts` (`learnerAccountMail`, `staffAccountMail`, `adminPasswordResetMail`, `emailChangedNoticeMail`, `emailChangedConfirmMail`); `src/identity/staff/staff.service.ts:152-153,194,224`
- Test: `templates.spec.ts`, `staff-user-edit.service.spec.ts`, `staff.controller.spec.ts`

**Interfaces:**
- Produces: `learnerAccountMail(to, password, learnerAppUrl, mustChange)` giữ nguyên; `staffAccountMail(to, password, adminAppUrl, mustChange, learnerAppUrl)`;
  `adminPasswordResetMail(to, password, signInUrl, mustChange, learnerAppUrl)`; `emailChangedNoticeMail(oldEmail, newEmail, learnerAppUrl, supportEmail)`;
  `emailChangedConfirmMail(newEmail, learnerAppUrl)` giữ nguyên.

- [ ] **Step 1: Write the failing tests**
  - `#9`: password `'Kp7#<wQ&'` → text có dòng chính xác `Mật khẩu tạm / Password: Kp7#<wQ&` và khớp `/Password: \S+/`; HTML chứa `Kp7#&lt;wQ&amp;`; nút `…/vi/app/login`.
  - `#10`: nút `href` bằng `adminAppUrl`; text có dòng `Mật khẩu tạm / Password: …`.
  - `#11`: text có dòng `Mật khẩu mới / New password: …`; nút trỏ `signInUrl` (`/vi/app/login` khi là `learnerAppUrl`, nguyên `adminAppUrl` khi là admin).
  - `mustChange: false` ở #9–#11 → cả HTML và text không chứa `đổi mật khẩu` và `change the password`; `true` → có.
  - `#12`: to = địa chỉ cũ; rows có email mới; HTML có `mailto:support@wordmet.com`.
  - `#13`: to = địa chỉ mới; nút `…/vi/app/login`; text chứa `Quên mật khẩu` và `Forgot password`.
- [ ] **Step 2:** `pnpm vitest run src/identity` → FAIL.
- [ ] **Step 3:** Viết lại năm hàm từ `MAILS` id `admin-learner`, `admin-staff`, `admin-reset`, `email-old`, `email-new`; với `adminPasswordResetMail`, nút trỏ
  `${signInUrl}/vi/app/login` khi `signInUrl === learnerAppUrl`, ngược lại `signInUrl`. Sửa ba chỗ gọi trong `staff.service.ts`.
- [ ] **Step 4:** `pnpm vitest run src/identity` → PASS.
- [ ] **Step 5:** Commit `feat(api): send admin account emails as html`.

### Task 7: Email nhắc học (#14, #15)

**Files:**
- Modify: `src/notifications/provider/reminder-message.ts`, `src/notifications/provider/email.provider.ts:32-34`
- Test: `reminder-message.spec.ts`, `email.provider.spec.ts`

**Interfaces:**
- Produces: `reminderMail(to, kind, language, learnerAppUrl, streakDays): MailMessage` (tham số thứ tư đổi từ `settingsUrl` sang `learnerAppUrl`;
  hàm tự gọi `reminderSettingsUrl`). `reminderSettingsUrl` giữ nguyên.

- [ ] **Step 1: Write the failing tests**
  - `regular`, `vi`, streak 12: subject `'Tới giờ ôn từ'`; HTML có nhãn `Chuỗi 12 ngày` và nút `Ôn ngay` → `${appUrl}/vi/app`; footer có link `${appUrl}/vi/app/settings`.
  - `inactive`, `en`: subject `'Your words are still waiting'`; `lang="en"`; nút `Open Wordmet` → `/en/app`; footer `Turn them off in Settings` → `/en/app/settings`.
  - `streakDays: null` và `0`: không có `Chuỗi`, `streak`; `regular` vi dùng đoạn không nhắc chuỗi: `'Ôn hôm nay, vài phút là xong.'` (en `'A few minutes is enough.'`).
  - Bản text của mọi trường hợp có link settings (giữ hành vi design 8.4).
- [ ] **Step 2:** `pnpm vitest run src/notifications` → FAIL.
- [ ] **Step 3:** Viết lại từ `MAILS` id `remind`, `inactive`; footer `reminder`. `email.provider.ts` truyền `this.config.learnerAppUrl`.
- [ ] **Step 4:** `pnpm vitest run src/notifications` → PASS.
- [ ] **Step 5:** Commit `feat(api): send study reminders as html`.

### Task 8: Biên nhận và Pro sắp hết hạn (#16, #17)

**Files:**
- Modify: `src/entitlements/notices/entitlement-mail.ts`, `src/entitlements/notices/notice-sender.service.ts:124-128`
- Test: `entitlement-mail.spec.ts`, `notices.spec.ts`

**Interfaces:**
- Produces: `entitlementMail(kind, language, data): { subject: string; text: string; html?: string }`; `data` thêm `appUrl?: string` và
  `supportEmail?: string`. `notice-sender` truyền `this.config.learnerAppUrl` (bỏ `/` cuối như dòng `plansUrl` đang làm) và `this.config.supportEmail`.

- [ ] **Step 1: Write the failing tests**
  - `payment_receipt` vi: subject `'Biên nhận mua Wordmet Pro'`; rows đúng thứ tự `Gói`, `Số tiền`, `Nội dung chuyển khoản`, `Mã tham chiếu`, `Dùng được`
    với giá trị như test hiện có; HTML nút `Xem gói của bạn` → `${appUrl}/vi/app/plans`; footer `mailto:support@wordmet.com`; không chứa `Pro đã bật`.
  - `payment_receipt` en: subject `'Your Wordmet Pro receipt'`, `lang="en"`.
  - `expiry_notice` vi: subject `'Gói Wordmet Pro sắp hết hạn'`; HTML có `<strong>` quanh `hết ngày <ngày>`; nút `Mua kỳ mới` → `/vi/app/plans`; text chứa `các từ và lịch ôn vẫn giữ nguyên`.
  - `trial_started`, `trial_reminder`, `renewal_notice`: `html` là `undefined`, `text` bằng đúng chuỗi hiện tại (copy từ test cũ).
- [ ] **Step 2:** `pnpm vitest run src/entitlements/notices` → FAIL.
- [ ] **Step 3:** Hai loại dùng `renderMail` (chữ từ `MAILS` id `receipt`, `expiry`; footer `billing`); ba loại kia đi nhánh cũ.
- [ ] **Step 4:** `pnpm vitest run src/entitlements/notices` → PASS.
- [ ] **Step 5:** Commit `feat(api): send the pro receipt and expiry emails as html`.

### Task 9: Lệnh `mail:preview`

**Files:**
- Create: `src/cli/mail-preview.ts`, `src/cli/mail-preview-samples.ts`
- Modify: `package.json` (`"mail:preview": "node dist/cli/mail-preview.js"`)
- Test: `src/cli/mail-preview.spec.ts`

**Interfaces:**
- Produces: `mailPreviewSamples(config: AppConfig, to: string): MailMessage[]` (17 thư mẫu, dữ liệu của mockup: Lan, `482915`, 249.000 ₫);
  CLI `pnpm mail:preview [to]` (mặc định `preview@example.com`) gửi lần lượt qua `SmtpMailer` với `loadConfig(process.env)`, in `sent N/17`.

- [ ] **Step 1:** Test: `mailPreviewSamples(testConfig(), 'a@x.test')` trả 17 thư, 17 tiêu đề khác nhau, mọi thư có `html`, mọi `to` bằng `a@x.test`.
- [ ] **Step 2:** `pnpm vitest run src/cli/mail-preview.spec.ts` → FAIL.
- [ ] **Step 3:** Viết theo mẫu `admin-grant.ts` (nạp `.env` nếu có), nhưng không dựng Nest app: chỉ `loadConfig` + `new SmtpMailer(config)`. CLI từ chối chạy khi
  `config.smtp.host` không phải `localhost`/`127.0.0.1` (in lý do, exit 1), để không gửi thư mẫu qua Resend.
- [ ] **Step 4:** `pnpm vitest run src/cli/mail-preview.spec.ts` → PASS.
- [ ] **Step 5:** Commit `feat(api): add a command that sends sample emails to mailpit`.

### Task 10: Xác minh và ghi as-built

**Files:**
- Modify: `docs/deliveries/email-giao-dien.md` (thêm mục as-built), `CLAUDE.md` (một mục ngắn trỏ sang delivery record)

- [ ] **Step 1:** `pnpm lint`, `pnpm test`, `pnpm build` trong `apps/api` → cả ba xanh; ghi số unit test.
- [ ] **Step 2:** Docker đang chạy (`docker info`), `docker compose up -d` ở gốc repo, `pnpm build && pnpm mail:preview` → in `sent 17/17`; mở `http://localhost:8025`,
  xem cả 17 thư ở tab HTML, Text và HTML Check; chụp màn hình ba thư (#1, #16, #14) và ghi điểm HTML Check vào delivery record.
- [ ] **Step 3:** Smoke trên DB mới theo cách các delivery record trước (API + worker chạy từ `dist`): `pnpm smoke:identity`, `pnpm smoke:buoc-8`,
  `pnpm smoke:buoc-b-payments` → cả ba qua; lưu output vào `docs/deliveries/email-giao-dien-smoke-output.txt`.
- [ ] **Step 4:** Ghi as-built; ghi rõ chưa kiểm trên hộp thư thật (bước của chủ dự án: Gmail web, Gmail Android chế độ tối, Gmail iPhone, Outlook, Apple Mail),
  hộp thư `support@wordmet.com` chưa kiểm, và việc sau `List-Unsubscribe`.
- [ ] **Step 5:** Commit `docs(api): record the as-built html emails`; mở PR vào `dev` bằng skill `ship-pr` (CI `admin-e2e-real` kiểm dòng `Password:` qua Mailpit).
