# Đợt cải thiện, nhóm A (giao diện người học) — Design (26/10/2026)

> **Trạng thái 26/10/2026:** chủ dự án duyệt từng phần trong chat (phần 1 C13, phần 2 C14, phần 3 Luyện tập, phần 4 nút loa); bản viết này **chờ chủ dự án đọc lại**.
> Chưa có code, chưa có plan.
> **Nguồn quyết định:** câu hỏi và trả lời [`../reviews/2026-10-26-dot-cai-thien-questions.md`](../reviews/2026-10-26-dot-cai-thien-questions.md); decision record
> [`../decisions/2026-10-26-dot-cai-thien-a-decisions.md`](../decisions/2026-10-26-dot-cai-thien-a-decisions.md); danh sách gốc
> [`../../preparation/IMPROVEMENT_IDEAS_2026-10-23.md`](../../preparation/IMPROVEMENT_IDEAS_2026-10-23.md) (C1, C2, C3, C13, C14, C15, C16).
> **Code đọc trên:** `feat/giao-dien-nguoi-hoc-m5b` @ `d83146d` (+ thay đổi chưa commit của M5b); mọi `path:line` dẫn ở
> [`../../preparation/DOT_CAI_THIEN_A_CODE_FACTS_2026-10-26.md`](../../preparation/DOT_CAI_THIEN_A_CODE_FACTS_2026-10-26.md).
> **Nhóm B** (gọi AI thật, eval, judge, vòng đời prompt, dashboard) có design riêng, viết **sau** lần gọi AI thật đầu tiên bằng Postman (câu 4, 15).

Ví dụ xuyên suốt: **Lan**, người học tiếng Việt, nhóm "IT" có 40 từ, đang học `deploy`.

## 1. Mục tiêu và phạm vi

Sửa những chỗ chủ dự án vướng khi tự dùng thử app người học (26/10/2026), cộng hai mục rẻ trong danh sách cải thiện.

| Mục | Việc | Chạm |
|---|---|---|
| C13 | Bắt buộc nhập mã xác nhận email trước khi có phiên đăng nhập | **API Identity** + web |
| C14 | Thêm từ ngay từ trang nhóm | web |
| C15 | Sửa chữ thứ tự trong Tùy chỉnh phiên | web (bản chữ) |
| C16 + C2 | Hai nút sau khi trả lời một câu Luyện tập | web |
| C3 | Điền từ vào câu bạn đã lưu, mở cho mọi gói | API Practice + web |
| C1 | Nút loa UK · US | web |
| Sửa lỗi | "Xem đáp án" trước lần thử đầu bị API từ chối | API Practice (+ test web) |

**Không làm trong đợt này:** dòng thứ tự "Bấm Cần ôn lại lâu nhất trước" và câu trên thẻ "Đang ưu tiên" (câu 10, dời); C4, C5 (dời); C17 (archived); C6–C9;
đổi email của tài khoản; xoá tài khoản chưa xác nhận (để cùng phần xoá tài khoản của Bước 8, ghi vào `deploy-checklist.md`); file âm thanh làm sẵn trên máy
chủ (ghi vào `IMPROVEMENT_IDEAS` thành hướng nâng cấp).

## 2. Quyết định (tóm tắt)

Đầy đủ phương án và trade-off: decision record. Đợt này Claude đề xuất trước, chủ dự án xác nhận (câu 1).

| # | Quyết định | Chọn |
|---|---|---|
| A0 | Luật hỏi | Claude đề xuất trước, chủ dự án xác nhận |
| A1 | Phạm vi | Nhóm A trọn (bảng §1); nhóm B phần nền ở design riêng; C4, C5 dời; C17 archived |
| A2, A2b | Chia việc | Mỗi nhóm một design; nhóm A làm song song, 3 phiên theo file (§3) |
| A3 | Thứ tự trang khi đăng ký | Đăng ký → nhập mã → chọn ngôn ngữ → Hôm nay |
| A4 | Chặn tài khoản chưa xác nhận | **Không cấp phiên** tới khi nhập mã đúng (7b-B); nhập mã thành API công khai email + mã, đúng thì cấp phiên |
| A5 | Gõ nhầm email, email chưa xác nhận | Đăng ký lại vào email chưa xác nhận thì thay dữ liệu bằng lần mới và gửi mã mới (không 409); link "Đăng ký bằng email khác" trên trang nhập mã; dòng nhắc Quên mật khẩu khi `email-taken` (chỉ email đã xác nhận); chưa làm "Đổi email"; dọn tài khoản chưa xác nhận để tới Bước 8 |
| A6 | Thêm từ từ trang nhóm | Nút mở tấm Thêm từ ở chế độ khoá nhóm; đóng sau mỗi từ; thêm cả loạt qua trang Chọn từ theo chủ đề với nhóm chọn sẵn |
| A7 | Chữ thứ tự | Bỏ "trước" ở 5 dòng; giữ dòng `priority_oldest` |
| A8, A9 | Nút sau khi trả lời (gộp C2) | Cần ôn lại + một nút chính (Enter) đổi chữ theo trường hợp; bảng §6.3; D16 Bước 3 giữ |
| A10, A13, A14 | Nút loa | Giọng của máy; hai nút UK · US ở từ, một nút US ở câu; câu đã lưu chỉ đọc bằng giọng trên máy; file âm thanh làm sẵn để sau |
| A11 | Điền từ từ câu đã lưu | Mọi gói (đổi D11 Bước 7); công tắc riêng, luôn hiện |
| A12 | Lỗi "Xem đáp án" | Sửa API: cho bỏ qua câu điền từ trước lần thử đầu, tính là sai (theo mockup K/78a) |
| A15 | Nhập mã kèm mật khẩu (sau review plan I2) | API nhập mã nhận email + mã + mật khẩu, kiểm mật khẩu trước; sai mật khẩu không đụng bộ đếm OTP; khoá trả 429 rõ ràng (chỉ người đúng mật khẩu thấy); bỏ giới hạn theo email; web giữ mật khẩu trong bộ nhớ trang; link Quên mật khẩu chỉ ở trang đăng nhập |

**Quyết định cũ bị đổi:** K7 và D8, D14 Bước 1 (§4.5); D11 Bước 7 (C3); luật "chỉ bỏ qua sau một lần thử" của Bước 4 áp cho câu điền từ qua D9 Bước 7 (lỗi
"Xem đáp án"); D36 Bước 3 (lời mời xác nhận ở Cài đặt bỏ đi); quy ước `/v1` chỉ thêm, không đổi (SR7–SR14) có một ngoại lệ ở §4.5.

## 3. Chia việc và thứ tự

Năm PR, ba phiên làm song song (câu 3). Các mục dưới đây đụng chung file nên phải đi cùng một phiên:

| Phiên | PR, theo thứ tự | File chính |
|---|---|---|
| 1 | **A-C13**: xác nhận email | `apps/api/src/identity/**`, `apps/web/src/features/learner/auth/**`, `app-shell/session/**`, `RequireSession.tsx`, `SettingsPage.tsx`, script smoke, `apps/admin/e2e-real/support/api.ts` |
| 2 | **A-C14**: thêm từ từ trang nhóm | `features/learner/groups/GroupPage.tsx`, `TopicPickerPage.tsx`, `features/learner/add-word/**` |
| 3 | **fix "Xem đáp án"** → **A-luyện tập** (C15, C16 + C2, C3) → **A-C1** nút loa | `apps/api/src/practice/**`, `features/learner/practice/**`, `features/learner/review/Flashcard.tsx`, `features/learner/word/**` |

- Mỗi PR một nhánh từ `origin/dev` (`fix/…`, `feat/…`), PR vào `dev`. PR fix gồm hai commit: test lỗi trước, sửa sau.
- `apps/web/messages/vi.json`, `en.json` bị cả ba phiên sửa: mỗi phiên chỉ thêm / sửa key của mình; xung đột gộp lúc merge. Phiên merge sau rebase lên `dev` mới.
- Phiên 2 sửa `AddWordSheet.tsx`; phiên 3 (C1) không đụng tấm này.

## 4. C13 — Bắt buộc xác nhận email trước khi có phiên

### 4.1 Luồng

```
Đăng ký ──201, không token──► trang Nhập mã ──mã đúng: cấp phiên──► Chọn ngôn ngữ ──► Hôm nay
Đăng nhập, đúng mật khẩu, chưa xác nhận ──403 email-not-verified + gửi mã──► trang Nhập mã
Đăng nhập, sai mật khẩu (dù đã hay chưa xác nhận) ──401 invalid-credentials (như hiện nay)
Phiên cũ của tài khoản chưa xác nhận ──làm mới phiên bị từ chối──► đăng nhập lại ──► như dòng 2
```

### 4.2 API

**Đăng ký `POST /v1/auth/register`** (`auth.service.ts:40-82`)
- Vẫn tạo `users` (`emailVerifiedAt = null`) và mật khẩu trong một transaction; **bỏ `sessions.startChain`**; vẫn gửi mã `verify_email` sau khi trả lời.
- Trả `201 { email, verification_required: true }` (email đã chuẩn hoá); **không token, không cookie**. Rate limit, ngân sách mail giữ nguyên.
- **Email đã có tài khoản** (tra trước khi tạo, trong transaction + `withUserLock`):
  - đã xác nhận, hoặc `status` không `active` → `409 email-taken` như hiện nay;
  - **chưa xác nhận và `active` → thay dữ liệu bằng lần đăng ký mới** (mật khẩu, họ, tên, ngày sinh, múi giờ, thời điểm và phiên bản đồng ý điều khoản), gửi mã mới
    (việc gửi mã mới huỷ mã cũ như hiện nay, `issueInTx`); trả `201` giống email mới (không lộ là email đã có).
  - Lần thay này đi qua giới hạn theo email của bước xin mã (`auth.otp.email.cooldown` 1/60 s, `auth.otp.email.hourly` 5/giờ) để form đăng ký không thành công cụ
    spam hộp thư người khác. Bị giới hạn: vẫn thay dữ liệu, vẫn `201`, **không gửi mail và không huỷ mã cũ**: mã đã gửi trước đó vẫn dùng được tới hết hạn
    (10 phút, giữ nguyên); trang nhập mã cho bấm "Gửi lại mã" khi hết đếm ngược. (Chủ dự án 26/10/2026: chỉ huỷ mã cũ khi thật sự gửi được mã mới; giữ hạn 10 phút.)
  - Lần đăng ký đầu tiên của một email mới vẫn không qua giới hạn theo email (như hiện nay).

**Đăng nhập `POST /v1/auth/login`** (`auth.service.ts:84-126`)
- Thứ tự kiểm: khoá tạm (`loginLockedUntil`) → mật khẩu đổi (`stale`) → sai mật khẩu (tăng đếm, như hiện nay) → tài khoản bị khoá (`status = locked` → 403
  `account-locked`) → **chưa xác nhận → 403 `email-not-verified`** → cấp phiên.
- Khi trả `email-not-verified`: đếm sai về 0 (mật khẩu đúng), **không** tạo chuỗi phiên, gửi một mã mới sau khi trả lời qua cùng giới hạn theo email của bước xin mã
  (`auth.otp.email.cooldown` 1/60 s, `auth.otp.email.hourly` 5/giờ) và ngân sách mail. Bị giới hạn thì vẫn trả 403, không gửi mail, không báo lỗi khác.
- Chỉ người đúng mật khẩu mới biết tài khoản chưa xác nhận, giống `account-locked`.

**Nhập mã `POST /v1/auth/verify-email`** (`otp.controller.ts:34-44`, `otp.service.ts:139-165`)
- Thành **`@Public()`**. Body `z.strictObject({ email, code, password, client, device_label? })` (`password`, `client`, `device_label` như đăng nhập).
- **Kiểm mật khẩu trước, rồi mới kiểm mã** (A15, chủ dự án 26/10/2026: chặn việc kẻ xấu đặt mật khẩu bằng cách đăng ký lại rồi chờ chủ hộp thư nhập mã):
  1. Tìm tài khoản theo email đã chuẩn hoá; không có → `hasher.verifyDummy` rồi `400 invalid-otp` (giữ thời gian như đăng nhập).
  2. `hasher.verify(hash, password)` **ngoài** khoá (như đăng nhập). Sai → `400 invalid-otp`, **không** đụng tới `attempts` hay cửa sổ khoá OTP; không tăng
     `failedLoginCount` (để kẻ xấu không khoá đăng nhập của người khác qua đường này).
  3. Transaction + `withUserLock`: đọc lại tài khoản; hash đã đổi trong lúc chờ (đăng ký lại xen vào) → `400 invalid-otp`; không `active` hoặc **đã xác nhận** →
     `400 invalid-otp`; rồi `checkInTx(..., 'verify_email', code)`.
  4. Mã đúng → `emailVerifiedAt = now` → `startChain` → trả **như đăng nhập** (`writeSession`: body token, cookie cho web).
  5. Mã sai / không có mã sống → `400 invalid-otp`.
  6. Khoá OTP (lần sai thứ 21 trong 24 giờ) → **`429 rate-limited` + `Retry-After`**, mail báo khoá như hiện nay. Chỉ người đúng mật khẩu mới tới được bước này, nên
     429 không lộ gì (cùng lý lẽ với `account-locked` của đăng nhập và B1E17 của Bước 1).
- Vì chỉ người đúng mật khẩu mới làm tăng bộ đếm sai mã, người ngoài không khoá được việc xác nhận của người khác. **Không có giới hạn theo email** ở route này;
  giữ `auth.verify.ip` (ip, 20 / 3600 s, `ASSUMPTION`, chỉnh được ở `DEFAULT_LIMITS`) khai bằng `@RateLimit`; bỏ `user.write` (không có user). (Review plan I2.)
- Giữ: 5 lần thử mỗi mã, mã sống 10 phút, khoá 24 giờ ở lần sai thứ 21.

**Gửi lại mã `POST /v1/auth/otp`** (`otp.schemas.ts:3-6`, `otp.service.ts:66-106`)
- `{ purpose: 'verify_email', email }`: công khai, **luôn 202 `{}`**, tra tài khoản để sau khi trả lời, email lạ hay đã xác nhận thì không gửi gì; theo đúng nhánh
  `reset_password` (`requestPasswordReset`). Bỏ dạng cũ `{ purpose: 'verify_email' }` cần đăng nhập.

**Làm mới phiên `POST /v1/auth/refresh`** (`session.service.ts:140-158`)
- Đọc thêm `emailVerifiedAt` cùng `status`; chưa xác nhận → thu hồi chuỗi (lý do mới `unverified`; cột `revoke_reason` là `TEXT`, không có CHECK, nên không cần
  migration) và trả như phiên bị thu hồi. Access token đã cấp trước khi đổi vẫn sống tối đa `ACCESS_TOKEN_TTL_SECONDS` (900 s); chấp nhận vì chưa có production.

**Không đổi:** `AuthGuard`; đăng nhập admin (nhân viên luôn đã xác nhận: `staff.service.ts:115, 255, 272`); `admin:grant`; đặt lại mật khẩu (vẫn đánh dấu đã xác
nhận, B1#23); `trial_eligible`; email nhắc học.

### 4.3 Web

- **Đăng ký** (`RegisterForm.tsx`): 201 → giữ email trong `sessionStorage` (key `wordmet-web.pending-email`; không đưa lên URL) → `/app/verify-email`. 409
  `email-taken` → chữ mới có Quên mật khẩu (§8).
- **Đăng nhập** (`LoginForm.tsx`): 403 `email-not-verified` → giữ email → `/app/verify-email?next=…` (giữ `next`).
- **Trang nhập mã** chuyển từ nhóm `(member)` sang nhóm `(auth)` (không `RequireSession`):
  - Email lấy từ `sessionStorage`; không có (mở ở tab mới) → hiện ô email.
  - **Mật khẩu** (A15): mật khẩu vừa gõ ở form đăng ký / đăng nhập giữ **chỉ trong bộ nhớ JS của trang** (biến module, không `sessionStorage`, không URL, không log)
    và gửi kèm khi nộp mã. Để bộ nhớ còn, đăng ký / đăng nhập chuyển sang trang nhập mã bằng **điều hướng phía client** (router của Next), không tải lại trang. Không
    còn mật khẩu trong bộ nhớ (tải lại trang, tab mới) → trang hiện thêm ô mật khẩu cạnh ô mã. Xoá mật khẩu khỏi bộ nhớ khi xác nhận xong hoặc rời trang.
  - Nộp → `POST /v1/auth/verify-email { email, code, password, client: 'web' }` → nhận phiên qua cùng đường với đăng nhập trong `session-store.ts`
    (`startSession`) → xoá email tạm → chưa có ngôn ngữ thì `/app/welcome`, có thì `next` hoặc `/app`.
  - `400 invalid-otp` → chữ "Mã hoặc mật khẩu không đúng…" (§8); `429` (chỉ khi đúng mật khẩu) → "Bạn đã nhập sai mã quá nhiều lần. Thử lại sau {time}."
  - "Gửi lại mã": `POST /v1/auth/otp { purpose: 'verify_email', email }`, đếm ngược 60 s như hiện nay. **Bỏ việc tự gửi mã khi mở trang** (đăng ký và đăng nhập đã gửi).
  - Link "Gõ nhầm email? Đăng ký bằng email khác" → xoá email tạm → `/app/register`.
  - Mở trang khi đang có phiên → `AuthGate` đưa vào app như các trang `(auth)` khác.
- **`session-store.ts`**: `register()` không còn bắt đầu phiên; thêm hàm nhận phiên từ kết quả nhập mã.
- **`RequireSession.tsx`**: thêm một kiểm phòng thủ: `me.email_verified === false` (không nên xảy ra nữa) → `/app/verify-email`.
- **Cài đặt** (`SettingsPage.tsx:91-97`): bỏ lời mời xác nhận; chỉ hiện email.

### 4.4 Script và test phải đổi

Danh sách theo dòng: code facts phần 2 mục 7, 8, 10.
- Script dùng token trả về lúc đăng ký: `learner-test-setup.mjs`, `smoke-buoc-0-3-fixes.mjs` (M2), `smoke-buoc-2.mjs`, `smoke-buoc-4.mjs`, `smoke-buoc-5.mjs`,
  `smoke-buoc-6.mjs`, `smoke-buoc-7.mjs` → đổi sang: đăng ký → lấy mã ở Mailpit → `verify-email` công khai (nhận token từ đây). Người học trước đây để chưa xác nhận
  (`registerLearner`) nay phải xác nhận.
- `apps/admin/e2e-real/support/api.ts:36-43` (`registerVerified`).
- Test API Identity (B1#1, B1#7, B1#11, B1#38, `otp.*.spec.ts`), web (`session-store.test.ts` 219-266, `auth.test.tsx`, `AuthGate.test.tsx`, `RequireSession.test.tsx`),
  e2e `m1.spec.ts`.

### 4.5 Quyết định cũ bị đổi

| Cũ | Nội dung | Đợt này |
|---|---|---|
| K7 (`DECISIONS_2026-10-04.md:25`) | Dùng được tính năng Free khi chưa xác minh | Chưa xác minh thì không vào được app |
| D8 Bước 1 | Đăng ký xong là đăng nhập luôn (trả token) | Đăng ký không trả token |
| D7 Bước 1 | `verify_email` qua `/auth/otp` cần đăng nhập | Công khai, nhận email |
| D14 Bước 1 | Đã xác minh → 409 `email-already-verified` | `400 invalid-otp` (không lộ trạng thái) |
| IR2 (`module-spec-identity-access.md`) | Lý do đăng ký được lộ email tồn tại: K7 | Đăng ký chỉ còn lộ email **đã xác nhận** (`email-taken`), để người dùng biết dùng Quên mật khẩu; email chưa xác nhận trả 201 như email mới |
| D36 Bước 3 | Cài đặt mời xác nhận | Bỏ |
| SR7 (system-spec) | `/v1` chỉ thêm, không đổi | **Ngoại lệ**: đổi body của đăng ký, `verify-email`, `/auth/otp`; được vì chưa có client nào ngoài repo (app người học còn bị chặn trên production) |

### 4.6 When → Then

| # | When | Then |
|---|---|---|
| A13-1 | Lan đăng ký với email mới | 201 `{ email, verification_required: true }`; không cookie; DB có `users` chưa xác nhận, **không** có `session_chains`; mail mã được gửi sau khi trả lời |
| A13-2 | Đăng ký với email đã có tài khoản **đã xác nhận** (hoặc bị khoá) | 409 `email-taken`; web hiện dòng có Quên mật khẩu |
| A13-2b | Đăng ký với email đã có tài khoản **chưa xác nhận** | 201 như email mới; mật khẩu, họ tên, ngày sinh, đồng ý điều khoản là của lần mới; mã cũ bị huỷ; mã mới được gửi; vẫn chỉ một dòng `users` |
| A13-2c | Như A13-2b, lần thứ hai trong 60 s (hoặc lần thứ sáu trong giờ) | 201, dữ liệu vẫn được thay, **không** gửi mail; mã của lần trước **vẫn dùng được** tới hết hạn 10 phút (nhập đúng → cấp phiên với mật khẩu của lần đăng ký sau cùng) |
| A13-2d | Hai lần đăng ký cùng một email chưa xác nhận tới cùng lúc | `withUserLock` xếp hàng; lần tới sau thắng; chỉ mã của lần sau còn sống |
| A13-3 | Lan đăng nhập, đúng mật khẩu, chưa xác nhận | 403 `email-not-verified`; không phiên; đếm sai về 0; một mã mới (nếu qua giới hạn email); web sang trang nhập mã, giữ `next` |
| A13-4 | Như A13-3, trong 60 s sau lần gửi trước | 403 như trên, **không** gửi thêm mail; trang nhập mã cho bấm "Gửi lại mã" khi hết đếm ngược |
| A13-5 | Đăng nhập sai mật khẩu, tài khoản chưa xác nhận | 401 `invalid-credentials`, tăng đếm như hiện nay; không lộ trạng thái xác nhận |
| A13-6 | Tài khoản `status = locked`, đúng mật khẩu, chưa xác nhận | 403 `account-locked` (khoá đứng trước chưa xác nhận) |
| A13-7 | Nhập đúng mã, đúng mật khẩu | 200 + phiên như đăng nhập; `emailVerifiedAt` có giá trị; mã đã dùng; web sang `/app/welcome` |
| A13-7b | Đúng mã, **sai mật khẩu** | 400 `invalid-otp`; `attempts` của mã và cửa sổ khoá OTP **không** đổi; `failedLoginCount` không đổi |
| A13-7c | Kẻ xấu đăng ký lại email chưa xác nhận của Lan bằng mật khẩu của mình; Lan nhập mã mới nhất (trang gửi kèm mật khẩu của Lan) | 400 `invalid-otp` (mật khẩu không khớp); tài khoản vẫn chưa xác nhận; Lan đăng ký lại bằng mật khẩu của mình rồi nhập mã mới → vào app; kẻ xấu không có mã nên không xác nhận được |
| A13-7d | Đăng ký lại (đổi hash) xen vào giữa lúc kiểm mật khẩu và lúc khoá dòng | Đọc lại dưới khoá thấy hash đổi → 400 `invalid-otp` |
| A13-8 | Đúng mật khẩu, sai mã | 400 `invalid-otp`; `attempts` của mã tăng; sai lần 5 thì mã chết, các lần sau vẫn 400 |
| A13-9 | Đúng mật khẩu, sai mã lần thứ 21 trong 24 giờ | 429 + `Retry-After`; mail báo khoá; nhập đúng trong lúc khoá vẫn 429; người không biết mật khẩu chỉ thấy 400 |
| A13-10 | Email không có tài khoản, hoặc tài khoản đã xác nhận, hoặc không `active` | 400 `invalid-otp`, cùng body với mã sai |
| A13-11 | Mã quá 10 phút | 400 `invalid-otp`; "Gửi lại mã" tạo mã mới và huỷ mã cũ |
| A13-12 | Một IP gửi quá 20 lần nhập mã / giờ | 429 `rate-limited` + `retryAfterSeconds` (không có giới hạn theo email) |
| A13-12b | Tải lại trang nhập mã (mất mật khẩu trong bộ nhớ) | Trang hiện ô mật khẩu; nộp email + mã + mật khẩu như thường |
| A13-13 | "Gửi lại mã" với email lạ hoặc đã xác nhận | 202 `{}`, không gửi gì |
| A13-14 | Phiên cũ (từ trước khi đổi) của tài khoản chưa xác nhận làm mới phiên | Bị từ chối, chuỗi bị thu hồi (`unverified`); web về đăng nhập → A13-3 |
| A13-15 | Mở trang nhập mã ở tab mới, không có email tạm | Hiện ô email; nộp email + mã như thường |
| A13-16 | Bấm "Đăng ký bằng email khác" | Email tạm bị xoá; sang trang đăng ký; tài khoản cũ chưa xác nhận vẫn còn trong DB |
| A13-17 | Lan gõ nhầm `lam@gmail.com` (của Lâm), không nhập mã; sau đó Lâm đăng ký bằng email của mình | A13-2b: tài khoản thành của Lâm với mật khẩu của Lâm; dữ liệu Lan gõ mất; Lâm nhập mã → vào app |
| A13-17b | Như trên, nhưng Lâm muốn nhập luôn mã nhận được từ lần Lan đăng ký (không đăng ký lại) | Lâm không biết mật khẩu Lan đặt → 400; Lâm đăng ký lại (A13-2b) hoặc dùng Quên mật khẩu (A13-18) |
| A13-18 | Quên mật khẩu trên tài khoản chưa xác nhận | Như hiện nay: đặt lại xong là đã xác nhận, mọi phiên thu hồi; đăng nhập sau đó cấp phiên |
| A13-19 | Bấm nộp mã hai lần nhanh | `useSubmitOnce` chặn lần hai; nếu lần hai vẫn tới API: 400 `invalid-otp` (mã đã dùng), web đã rời trang |
| A13-20 | Nhân viên do admin tạo đăng nhập admin | Như hiện nay (đã xác nhận lúc tạo) |

## 5. C14 — Thêm từ từ trang nhóm

- **Nút:** `GroupPage.tsx` thêm **[+ Thêm từ]** ở khối trên cùng (cạnh nút ôn); trên điện thoại bật nút + nổi (`AppShell` `fab`).
- **Chế độ khoá nhóm:** `useAddWord().open(word?, { groupId })` (thêm tham số); `AddWordSheet` nhận `lockedGroupId`: thay `GroupPicker` bằng dòng "Lưu vào nhóm: **IT**";
  mọi đường lưu trong tấm (nghĩa có sẵn, Tự nhập nghĩa, Tra bằng AI → Sửa trước khi lưu) dùng nhóm này.
- Ở trang nhóm, phím **N** và Thêm từ trên thanh trên cùng cũng mở chế độ khoá nhóm.
- **"Đã có trong nhóm":** nghĩa đã có trong nhóm (từ dữ liệu trang nhóm đã nạp, `useGroupQueue(id,'all')`) hiện nhãn thay cho nút chọn; không thêm lời gọi API.
- **Lưu xong:** như hiện nay (`writeLastGroup`, toast "Đã lưu từ “deploy” vào nhóm “IT”.", xoá cache, đóng tấm); danh sách nhóm tự cập nhật.
- **Thêm cả loạt:** trong tấm (chế độ khoá) có dòng "Thêm nhiều từ theo chủ đề": chọn chủ đề (`GET /v1/topics`) và trình độ → [Xem từ] →
  `/app/topic?code=&level=&group=<id>`. `TopicPickerPage.tsx` đọc thêm `group`: có và còn tồn tại thì là nhóm đích chọn sẵn (thay cho nhóm trùng tên chủ đề hay nhóm mới).

| # | When | Then |
|---|---|---|
| A14-1 | Lan bấm [+ Thêm từ] ở nhóm IT, chọn một nghĩa `deploy` | `POST /v1/quick-add { group_id: IT, sense_id }`; toast; tấm đóng; `deploy` hiện trong danh sách nhóm |
| A14-2 | Gõ `merge`, một nghĩa đã có trong IT | Nghĩa đó hiện "Đã có trong nhóm", không bấm chọn được; nghĩa khác vẫn chọn được |
| A14-3 | Gõ "rizz" (chưa có), Tra bằng AI → Sửa trước khi lưu | Ô "Lưu vào nhóm" là dòng cố định IT; lưu vào IT |
| A14-4 | Nhấn N trên trang nhóm IT | Tấm mở ở chế độ khoá IT |
| A14-5 | Nhóm đầy | Lỗi `group-full` trong tấm, tấm không đóng |
| A14-6 | Nhóm bị xoá ở tab khác trong lúc tấm mở, rồi bấm lưu | API trả lỗi không tìm thấy nhóm; tấm hiện "Nhóm này không còn." + nút đóng |
| A14-7 | "Thêm nhiều từ theo chủ đề" → Kinh doanh, B1 → [Xem từ] | Trang Chọn từ theo chủ đề, nhóm đích chọn sẵn là IT; "Thêm cả N từ" thêm vào IT |
| A14-8 | Mở `/app/topic?…&group=<id lạ hoặc đã xoá>` | Bỏ qua `group`, chọn nhóm như hiện nay |
| A14-9 | Sau khi thêm, nhấn N ở trang Hôm nay | Tấm thường, chọn sẵn IT (nhóm dùng gần nhất), đổi được |

## 6. Luyện tập

### 6.1 Sửa lỗi "Xem đáp án" (PR `fix/` riêng, làm đầu tiên ở phiên 3)

- Hiện: web hiện "Xem đáp án" cho câu điền từ trước lần thử đầu (`PracticeSession.tsx:279-284`, mockup K/78a "[Bỏ qua, xem đáp án]"); API từ chối khi
  `item.tries === 0` (`answers.service.ts:96`, 409 `skip-not-allowed`). **Chưa chạy để xác nhận**: commit đầu là test API của `skip` tái hiện 409 (unit test web
  hiện mock route skip nên không bắt được, `ai-questions.test.tsx:82-86`).
- Sửa API: câu `cloze` cho bỏ qua khi `tries === 0`; kết quả `wrong`, câu trả lời lưu là rỗng (không có lần gõ nào); `type_word` giữ luật cũ (chỉ sau một lần thử).
  Đổi luật Bước 4 áp cho câu điền từ qua D9 Bước 7.
- Sau khi bỏ qua: hiện kết quả như trả lời sai (trường hợp 4 ở §6.3).

### 6.2 C15 — Chữ thứ tự

`App.practice.customize.sorts`: `level_asc` "Ngăn thấp" / "Lowest stage"; `overdue_first` "Quá hạn lâu nhất" / "Most overdue"; `new_first` "Từ mới" / "New words";
`least_practiced` "Lâu chưa luyện" / "Least practiced"; `most_wrong` "Sai nhiều nhất" / "Most missed". Giữ `queue`, `random`, `priority_oldest`.

### 6.3 C16 + C2 — Nút sau khi trả lời

`AnswerFeedback.tsx`, `PracticeSession.tsx`. Chỉ web; API giữ nguyên (`show_known`, `highlight_needs_review`, `hint_level` đủ để chọn trường hợp).

| # | Trường hợp (theo kết quả API) | Nút (nút chính đậm) | Enter | Phím 2 | Lịch ôn |
|---|---|---|---|---|---|
| 1 | `correct`, `show_known` | [Cần ôn lại] · **[Đã biết]** | Đã biết | Đã biết | Đã biết: lên một ngăn |
| 2 | `correct`, không `show_known`, `hint_level = 0` (từ chưa đến hạn) | [Cần ôn lại] · **[Câu tiếp]** | Câu tiếp | — | giữ |
| 3 | `correct`, `hint_level > 0` | [Cần ôn lại] · **[Câu tiếp]** | Câu tiếp | — | giữ |
| 4 | `wrong` (cả Xem đáp án) | **[Cần ôn lại]** · [Câu tiếp] | Cần ôn lại | — | Cần ôn lại: về ngăn 1, lên đầu |

- Phím 1 luôn là Cần ôn lại. Luật bỏ qua phím (alt/ctrl/meta, đang báo lỗi, trong dialog, trong ô nhập, Enter/Space trên nút đang focus) giữ nguyên.
- Lịch ôn chỉ đổi khi người học bấm hoặc nhấn Enter trên nút ghi rõ "Đã biết" / "Cần ôn lại": **D16 Bước 3 giữ**; cái bỏ là lối "Câu tiếp" trung tính ở trường hợp 1.
- Ghi chú dưới nút viết lại theo trường hợp (§8).

| # | When | Then |
|---|---|---|
| A16-1 | Trường hợp 1, Lan nhấn Enter | `POST …/items/{id}/review {action:'known'}` rồi `…/next` |
| A16-2 | Trường hợp 4, nhấn Enter | `review {action:'needs_review'}` rồi `next`; `deploy` về ngăn 1, ưu tiên |
| A16-3 | Trường hợp 4, bấm [Câu tiếp] | Chỉ `next`; lịch giữ |
| A16-4 | Trường hợp 2 hoặc 3, nhấn Enter | Chỉ `next` |
| A16-5 | Lời gọi review lỗi mạng | Ở lại màn, hiện `failed` như hiện nay; bấm lại an toàn (cùng `reviewId`) |
| A16-6 | Review trả 409 `known-not-allowed` (hạn đổi giữa chừng) | Xử lý như hiện nay; không tự đổi sang hành động khác |
| A16-7 | Focus đang ở nút [Câu tiếp] (Tab), nhấn Enter | Kích hoạt nút đang focus (luật cũ), không phải nút chính |

### 6.4 C3 — Điền từ vào câu bạn đã lưu

**API** (`apps/api/src/practice/**`)
- `ai-session-planner.service.ts:42-44`: chặn gói theo `isAiType(type, clozeSource)` thay cho danh sách cố định ba kiểu, để `cloze` + `cloze_source: own` qua được khi
  `ai.practice` không được phép. `meaning_in_sentence`, `mcq_sentence`, `cloze` AI vẫn cần `ai.practice`.
- `sessions.service.ts:483-488` (`ruleTypesOf`): giữ `cloze` của phiên `own` khi `ai.practice` mất giữa phiên.
- Không đổi: chọn câu (`maskExample`), gợi ý ba nấc, không bản dịch, không báo lỗi được, không tốn lượt AI, tính như một phiên thường (Miễn phí 3 phiên / ngày).
- Đổi D11 Bước 7; sửa test B7E1 (`ai-session-planner.service.spec.ts:61-65`), B7E123.

**Web** (`CustomizeDialog.tsx`, `practice-api.ts`)
- Công tắc **"Điền từ vào câu bạn đã lưu"** dưới công tắc "Kiểu câu có AI", mọi gói, **luôn hiện**, dòng phụ "Chỉ dùng cho từ có câu bạn đã lưu. Không tốn lượt AI."
  Nhớ trên máy (localStorage, như công tắc AI).
- Bật → `types` có `cloze`, gửi `cloze_source: 'own'` (thêm trường vào `StartBody`).
- Gói có AI, bật cả hai: ô "Điền từ" trong nhóm câu AI tự tắt và mờ, dòng "Điền từ dùng câu bạn đã lưu thay cho câu AI."; hai kiểu AI còn lại chọn được. Tắt công tắc
  mới thì ô "Điền từ" AI trở về trạng thái người học chọn trước đó.
- Sửa test `ai-toggle.test.tsx:83-97` ("never cloze_source").

| # | When | Then |
|---|---|---|
| A3-1 | Gói Miễn phí, bật công tắc, chọn thêm một kiểu thường, nhóm IT có câu đã lưu cho `deploy` | Phiên mở; `deploy` có thể ra câu điền từ từ câu đã lưu; từ không có câu nhận kiểu thường |
| A3-2 | Gói Miễn phí, chỉ bật công tắc, không từ nào trong phạm vi có câu đã lưu | 409 `practice-no-words` `no-word-fits-types`; web hiện thông báo có sẵn |
| A3-3 | Gói Pro, bật cả "Kiểu câu có AI" và công tắc mới | `cloze_source: 'own'`; không có câu điền từ AI; hai kiểu AI còn lại vẫn tốn lượt như thường |
| A3-4 | Pro hết hạn giữa phiên có câu `own` | Câu điền từ từ câu đã lưu vẫn ra; kiểu AI bị bỏ (như B7E123) |
| A3-5 | Lan xoá câu đã lưu của `deploy` giữa phiên | Câu kế cho `deploy` lấy kiểu khác; không còn kiểu nào thì bỏ qua từ (như hiện nay) |
| A3-6 | Câu điền từ từ câu đã lưu | Không có nút báo lỗi, không có bản dịch (như hiện nay) |

## 7. C1 — Nút loa

- **Chỗ đặt:** hai nút **UK** · **US** cạnh từ ở trang từ (`WordPage.tsx:67`), thẻ ôn mặt trước và mặt sau (`Flashcard.tsx:40, 53`), kết quả Luyện tập sau khi chấm
  (`AnswerFeedback.tsx:28`). Một nút (US) cạnh câu ví dụ (`SenseBlock.tsx:83`, `Flashcard.tsx:68-73`) và câu đã lưu (`LearningBlock.tsx:39-43`,
  `SavedSentencesDialog.tsx`, `Flashcard.tsx:74-83`). Không có loa ở câu hỏi trước khi chấm.
- **Một component** dùng `window.speechSynthesis` + `SpeechSynthesisUtterance`; chọn giọng theo `lang` (`en-GB`, `en-US`) từ `getVoices()`, nghe sự kiện
  `voiceschanged` (danh sách giọng có thể tới muộn); bấm nút mới thì `cancel()` câu đang đọc. Chỉ chạy ở trình duyệt.
- **Ẩn:** không có `speechSynthesis` hoặc không có giọng tiếng Anh → ẩn mọi nút; không có giọng `en-GB` → ẩn nút UK.
- **Riêng tư:** ưu tiên giọng có `localService === true` (MDN: giọng trên máy, khác giọng qua dịch vụ từ xa). **Câu đã lưu** chỉ đọc bằng giọng trên máy; máy chỉ có
  giọng từ xa thì ẩn nút loa của câu đã lưu. Từ và câu ví dụ của kho được dùng giọng từ xa khi không có giọng trên máy. (Gửi chữ ra máy chủ khi dùng giọng từ xa là
  suy luận, MDN không nói thẳng.)
- **Phím:** không phím tắt; nút loa không nhận Space / phím 1, 2 của phiên ôn (`ReviewSession.tsx:41-52`) để không lật thẻ hay chấm nhầm.
- Nhãn đọc màn hình: "Nghe giọng Anh" / "Nghe giọng Mỹ" / "Nghe câu" (§8).

| # | When | Then |
|---|---|---|
| A1-1 | Bấm UK cạnh `deploy` trên máy có `en-GB` trên máy | Đọc "deploy" bằng giọng `en-GB` trên máy |
| A1-2 | Máy không có `en-GB` | Không có nút UK; nút US vẫn có |
| A1-3 | Máy không có giọng tiếng Anh nào | Không có nút loa nào; trang không lỗi |
| A1-4 | Đang đọc câu dài, bấm loa khác | Câu cũ dừng, đọc cái mới |
| A1-5 | Máy chỉ có giọng từ xa | Có loa ở từ và câu ví dụ; **không** có loa ở câu đã lưu |
| A1-6 | Trong phiên ôn, focus ở nút loa, nhấn Space | Đọc (nút được bấm), thẻ **không** lật |
| A1-7 | Danh sách giọng tới sau khi trang dựng xong | Nút hiện ra khi `voiceschanged` tới |

## 8. Bản chữ mới và sửa

Theo luật của `apps/web/src/i18n/messages.test.ts` (cùng key hai file, không "vui lòng" / "please" / "sorry", dấu "…" một ký tự). Tên key chốt ở plan.

| Chỗ | Tiếng Việt | English |
|---|---|---|
| Đăng ký, `email-taken` (sửa) | Email này đã có tài khoản. Nếu là email của bạn, dùng Quên mật khẩu. | This email already has an account. If it's yours, use Forgot password. |
| Trang nhập mã, sau đăng nhập chưa xác nhận | Bạn cần xác nhận email trước khi vào app. Mã đã được gửi tới {email}. | Confirm your email to continue. We sent a code to {email}. |
| Trang nhập mã, mã sai | Mã hoặc mật khẩu không đúng, hoặc mã đã hết hạn. Nếu email đã được xác nhận, hãy đăng nhập. | That code or password is wrong, or the code has expired. If your email is already confirmed, sign in. |
| Trang nhập mã, bị khoá | Bạn đã nhập sai mã quá nhiều lần. Thử lại sau {time}. | Too many wrong codes. Try again in {time}. |
| Trang nhập mã, ô mật khẩu (khi mất bộ nhớ) | Mật khẩu | Password |
| Trang nhập mã, link | Gõ nhầm email? Đăng ký bằng email khác | Typed the wrong email? Sign up with another one |
| Trang nhóm, nút | Thêm từ | Add word |
| Tấm Thêm từ, khoá nhóm | Lưu vào nhóm: {name} | Saving to deck: {name} |
| Tấm Thêm từ, nhãn | Đã có trong nhóm | Already in this deck |
| Tấm Thêm từ, dòng | Thêm nhiều từ theo chủ đề | Add several words by topic |
| Tấm Thêm từ, nút | Xem từ | See words |
| Tấm Thêm từ, lỗi | Nhóm này không còn. | This deck no longer exists. |
| Luyện tập, ghi chú TH1 | Nhấn Enter là Đã biết: {lemma} lên một ngăn. Chưa chắc thì bấm Cần ôn lại. | Enter means Know: {lemma} moves up a stage. Not sure? Choose Still learning. |
| Luyện tập, ghi chú TH2 | {lemma} chưa tới hạn ôn nên lịch ôn giữ nguyên. | {lemma} isn't due yet, so its schedule stays the same. |
| Luyện tập, ghi chú TH3 | (giữ `noteHint`) | (keep `noteHint`) |
| Luyện tập, ghi chú TH4 (sửa `noteWrong`) | Nhấn Enter để đưa {lemma} lên đầu nhóm, về ngăn 1. Câu tiếp: giữ lịch ôn. | Enter moves {lemma} to the top of its deck, back to stage 1. Next question keeps its schedule. |
| Tùy chỉnh phiên, công tắc | Điền từ vào câu bạn đã lưu | Fill in your saved sentences |
| Tùy chỉnh phiên, dòng phụ | Chỉ dùng cho từ có câu bạn đã lưu. Không tốn lượt AI. | Only for words with a sentence you saved. Uses no AI credits. |
| Tùy chỉnh phiên, khi bật cả hai | Điền từ dùng câu bạn đã lưu thay cho câu AI. | Fill-in uses your saved sentences instead of AI ones. |
| Nút loa (nhãn đọc màn hình) | Nghe giọng Anh · Nghe giọng Mỹ · Nghe câu | Listen, British · Listen, American · Listen to the sentence |
| Nút loa (chữ trên nút) | UK · US | UK · US |

Bỏ: lời mời xác nhận ở Cài đặt; `noteRight`, `noteRightNoKnow` thay bằng ghi chú TH1, TH2.

## 9. Kiểm thử

- **API (unit, Vitest):** C13 theo A13-1…A13-14, A13-18, A13-20 (sửa test B1 liên quan, thêm test rate limit `auth.verify.*`, refresh `unverified`); C3 theo A3-1…A3-4;
  fix "Xem đáp án" (test tái hiện trước).
- **Web (unit):** trang nhập mã (email tạm, ô email, gửi lại, link email khác, mã sai), đăng nhập 403, chế độ khoá nhóm của tấm Thêm từ, `TopicPickerPage` với `group`,
  bảng 4 trường hợp và phím, công tắc C3 + gửi `cloze_source`, component loa với `speechSynthesis` giả (giọng có / không, `localService`, `voiceschanged`).
- **Web e2e (Playwright, job `web`):** sửa `m1.spec.ts` (đăng ký → mã → ngôn ngữ → Hôm nay theo luồng mới), `m4.spec.ts`, `m5a.spec.ts`; thêm e2e trang nhóm thêm từ
  và Tùy chỉnh phiên có công tắc mới; axe và không cuộn ngang × vi/en × sáng/tối × 1440/390 cho các màn đổi.
- **Admin e2e-real:** chạy lại sau khi đổi `registerVerified`.
- **Script:** chạy lại `learner:setup` và các smoke đã sửa ở §4.4 trên DB mới.

## 10. Xong khi

- CI xanh trên mỗi PR (`ci.yml`: `api`, `web`, `admin`, `admin-e2e-real`).
- Chạy thật trên máy (API + worker + Postgres + Redis + Mailpit, DB mới): đăng ký → mã ở Mailpit → vào app; đăng nhập tài khoản chưa xác nhận → trang nhập mã; thêm từ từ
  trang nhóm; một phiên Miễn phí có câu điền từ từ câu đã lưu; "Xem đáp án" trước lần thử; hai nút sau khi trả lời; nút loa trên Windows (Edge / Chrome).
- `pnpm smoke:buoc-7` và các smoke đã sửa ở §4.4 chạy qua trên DB mới; output ghi vào `docs/deliveries/`.
- Tài liệu kiểm cho chủ dự án: thêm mục vào `docs/deliveries/giao-dien-nguoi-hoc-test-flow.md` (hoặc file test flow riêng của đợt, chốt ở plan).

## 11. Rủi ro và chỗ chưa kiểm

- **Lỗi "Xem đáp án" mới chỉ đọc code**, chưa tái hiện.
- **Giọng đọc trên Windows / Android / iOS** (có `en-GB` trên máy không) chưa kiểm; e2e không nghe được âm thanh.
- **C13 đụng nhiều nơi** (Identity, web, admin e2e-real, 7 script): sót một script là smoke gãy; danh sách ở code facts mục 7.
- **Ngoại lệ SR7** chỉ đúng khi chưa có client ngoài repo; app Flutter sau này phải theo luồng mới từ đầu.
- **Rate limit `auth.verify.ip`** là con số `ASSUMPTION`. Route nhập mã công khai chạy Argon2 mỗi lần (khoảng 44 ms), nên tốn CPU hơn; giới hạn theo IP chặn bớt.
- **Mật khẩu giữ trong bộ nhớ trang** từ form tới trang nhập mã: mất khi tải lại (trang hỏi lại); không ghi xuống máy, không URL.
- **Kẻ xấu vẫn phá đám được** bằng cách đăng ký lại liên tục (Lan phải đặt lại mật khẩu của mình), nhưng không chiếm được tài khoản (A13-7c); giới hạn 5 / giờ theo email.
- **Tài khoản chưa xác nhận tích lại trong DB** cho tới khi có việc dọn (Bước 8).
- **Đăng ký lại liên tục vào một email chưa xác nhận** làm mã của chủ thật hết hiệu lực (A13-2b); giới hạn theo email (5 / giờ) chặn bớt, chủ thật bấm "Gửi lại mã".
- **Người đăng ký bỏ ngang ở bước nhập mã** (đánh đổi sản phẩm của A4): chưa đo được, theo dõi khi có người dùng thật.
- **Ba phiên song song cùng sửa `vi.json` / `en.json`**: xung đột khi merge là chắc chắn, gộp tay.
