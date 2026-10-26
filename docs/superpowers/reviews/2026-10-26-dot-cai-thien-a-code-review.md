# Đợt cải thiện A — code review sau khi merge (26/10/2026)

> **Phạm vi:** PR #133, #134, #135, #136, #137 (đã merge vào `dev`, `dev` @ `fae324d`). Không gồm PR #138.
> **Nguồn đúng:** design `../specs/2026-10-26-dot-cai-thien-a-design.md`, decision record `../decisions/2026-10-26-dot-cai-thien-a-decisions.md`,
> plan `../plans/2026-10-26-dot-cai-thien-a.md` (Global Constraints, Review Focus).
> **Cách làm:** đọc mô tả và diff từng PR, đọc code hiện tại trên `dev` của mọi chỗ đổi, so từng dòng When → Then (A13-*, A14-*, A16-*, A3-*, A1-*,
> §6.1, chữ §8) với code và tên test; chạy test thật trên `dev`.

## Kết quả

| Mức | Số | Sửa trong phiên này |
|---|---|---|
| Critical | 0 | — |
| Important | 1 (lỗ hổng ở **design**, không phải lỗi code) | Không tự sửa: đổi hành vi đã chốt → hỏi phiên gốc |
| Minor | 7 | Không (ghi lại) |

Code khớp design ở mọi dòng When → Then đã soát. Không có PR sửa code.

**Test chạy thật trên `dev` @ `fae324d`** (DB Postgres riêng `el_review_a` chỉ để `prisma generate --sql`):

```
pnpm --filter api test   → Test Files 191 passed (191) · Tests 2566 passed (2566)
pnpm --filter web test   → Test Files 69 passed (69)   · Tests 637 passed (637)
```

Web e2e và admin `e2e-real` **không chạy lại** ở phiên này (không có thay đổi code); CI của từng PR đã xanh 4/4 (`api`, `web`, `admin`, `admin-e2e-real`).

## Important

### I1. Kẻ xấu khoá được việc xác nhận email của người khác 24 giờ (design §4.2 bước 6 và câu "người ngoài không khoá được")

Design viết: "Vì chỉ người đúng mật khẩu mới làm tăng bộ đếm sai mã, người ngoài không khoá được việc xác nhận của người khác." Câu này không đúng, vì **đăng ký
lại (A5, A13-2b) cho bất kỳ ai đặt mật khẩu** cho một email chưa xác nhận.

Ví dụ: Lan có tài khoản chưa xác nhận `lan@gmail.com` (hoặc chưa đăng ký). Kẻ xấu:
1. Đăng ký `lan@gmail.com` bằng mật khẩu của mình → 201, dữ liệu bị thay, mã gửi vào hộp thư của Lan.
2. Nộp `verify-email` với **mật khẩu của mình** và mã đoán bừa. Đúng mật khẩu nên mỗi lần sai đều được đếm. Mỗi mã sống chịu 5 lần sai; khi mã chết, bấm
   "Gửi lại mã" (`/auth/otp`, 5 mã / giờ theo email) để có mã sống mới. Lần sai thứ 21 trong 24 giờ → cửa sổ khoá `verify_email` 24 giờ. Cần khoảng 1 giờ
   (giới hạn email 5 / giờ, IP 20 / giờ).
3. Lan đăng ký lại bằng mật khẩu của mình (A13-2b): dữ liệu được thay, nhưng **cửa sổ khoá OTP không bị xoá** → `issueInTx` thấy khoá, **không tạo mã, không gửi
   mail** (`apps/api/src/identity/auth/otp.service.ts:51-53`); nộp mã (cũ) với mật khẩu đúng → `checkInTx` trả khoá → **429 "Bạn đã nhập sai mã quá nhiều lần.
   Thử lại sau 24 giờ"** (`otp.service.ts:127-131`), dù Lan chưa gõ sai lần nào.

Bằng chứng: `register` không đụng `otpFailureWindow` (`apps/api/src/identity/auth/auth.service.ts:77-87`: chỉ `user.updateMany`, `passwordCredential.upsert`,
`revokeAllForUser`); `verifyEmail` đếm sai mã cho bất kỳ ai đúng mật khẩu hiện tại (`auth.service.ts:167-173`).

Lối thoát đã có: **Quên mật khẩu** dùng cửa sổ khoá riêng (`reset_password`), đặt lại xong là đã xác nhận (A13-18). Lan không mất tài khoản, nhưng chữ 429 nói
sai lý do và không chỉ tới Quên mật khẩu. Chưa có production nên chưa có ai bị.

**Không tự sửa** (đổi hành vi đã chốt). Phương án để chủ dự án chọn:

| Phương án | Trade-off |
|---|---|
| A. Đăng ký lại (khi thay dữ liệu) xoá cửa sổ khoá `verify_email` của tài khoản đó | Một dòng ở `register`; kẻ xấu mất tác dụng của 21 lần sai ngay khi chủ thật đăng ký lại; nhưng kẻ xấu cũng tự xoá khoá được bằng đăng ký lại (giới hạn email 5 / giờ vẫn chặn đoán mã: 5 mã × 5 lần = 25 lần đoán / giờ trên 10⁶ khả năng) |
| B. Giữ nguyên, sửa chữ 429 ở trang nhập mã thêm dòng "Hoặc dùng Quên mật khẩu" | Chỉ đổi chữ; lỗ vẫn còn nhưng người dùng có đường ra |
| C. Giữ nguyên, ghi vào rủi ro của design | Không tốn gì; người bị phá phải tự tìm ra Quên mật khẩu |

Đề xuất: **A** (nhỏ, đúng ý A15 "người ngoài không khoá được"), kèm test "đăng ký lại sau khi khoá → mã mới được gửi".

## Minor

| # | Chỗ | Phát hiện | Cách xử lý đề xuất |
|---|---|---|---|
| M1 | `apps/api/src/identity/auth/auth.service.ts:56-57` | Mọi lần đăng ký, kể cả email mới, đều tính vào giới hạn email (`auth.otp.email.cooldown`, `hourly`); design §4.2 viết "lần đăng ký đầu tiên của một email mới vẫn không qua giới hạn". Kết quả email mới vẫn luôn nhận mã (đúng design), chỉ khác là đăng nhập / "Gửi lại mã" trong 60 s sau đó không gửi thêm (mã vừa gửi vẫn dùng được). Vô hại; comment trong code nói rõ là cố ý. | Ghi vào design (as-built), không đổi code |
| M2 | design A13-2d và A13-2c | A13-2d viết "chỉ mã của lần sau còn sống"; nhưng lần sau tới trong 60 s nên theo A13-2c **không** gửi mã mới và mã cũ còn sống. Code theo A13-2c. Design tự mâu thuẫn. | Sửa chữ A13-2d trong design |
| M3 | `apps/web/src/features/learner/auth/VerifyEmailForm.tsx` (`onSubmit`, nhánh `status === 429`) | Giới hạn IP `auth.verify.ip` (20 / giờ) cũng trả 429 `rate-limited`, nên trang hiện "Bạn đã nhập sai mã quá nhiều lần" cả khi nguyên nhân là IP. Body hai loại 429 giống nhau, web không phân biệt được. | Chấp nhận; nếu muốn phân biệt phải thêm trường ở API |
| M4 | `apps/web/src/app-ui/speech.ts:44-50` | Máy có giọng tiếng Anh nhưng không có `en-GB` lẫn `en-US` (chỉ `en-AU`, `en-IN`) → không nút loa nào. A1-3 chỉ nói ẩn khi không có giọng tiếng Anh nào; §7 lại nói nút câu là "US". Ít gặp. | Hỏi khi làm lại loa (file âm thanh làm sẵn) |
| M5 | `apps/web/src/app-ui/SpeakButtons.tsx` | Nhãn đọc màn hình "Nghe giọng Anh" khác chữ nhìn thấy "UK" (WCAG 2.5.3 Label in Name). Giữ theo design §8 (phiên 3 đã ghi). | Cân nhắc nhãn "UK, nghe giọng Anh" ở lần sửa chữ sau |
| M6 | `auth.service.ts:59-75`, test B1#2 | Hai lần đăng ký **email mới** tới cùng lúc khoá hai ID khác nhau (ID cấp trước), nên không xếp hàng: lần sau nhận 409 `email-taken` và web hiện dòng Quên mật khẩu. Có từ trước PR (B1#2); `useSubmitOnce` chặn bấm đôi ở web. | Chấp nhận |
| M7 | `auth.service.ts:77-87` | Tài khoản chưa xác nhận **tạo trước C13** (thời K7, đã dùng app, có nhóm, từ) bị người khác đăng ký lại được: phiên bị thu hồi, mật khẩu bị thay. Chủ thật lấy lại bằng Quên mật khẩu, dữ liệu học còn. Design đã nhận rủi ro "phá đám"; chưa có production. | Ghi vào `deploy-checklist.md` nếu DB có tài khoản thật trước khi lên |

## Đối chiếu theo ưu tiên

**PR #137 (Identity)** — đúng design ở các điểm được giao soát:
- Đăng ký không cấp phiên: `register` không gọi `startChain`; controller trả `{ email, verification_required: true }` (`auth.controller.ts:22-30`).
- Đăng nhập chưa xác nhận: kiểm sau `decideCredential` (khoá tạm → `stale` → sai mật khẩu → `account_locked` → chưa xác nhận); đếm sai về 0 trong
  `decideCredential`; không chuỗi phiên; gửi mã lặng qua giới hạn email và ngân sách mail, bị giới hạn thì im (`otp.service.ts:82-95`).
- Nhập mã: `@Public()`, `@RateLimit('auth.verify.ip')` chỉ luật IP; body strict (test `otp.controller.spec.ts:174, 182`); kiểm mật khẩu ngoài khoá trước, sai
  → 400 không đụng OTP, không tăng `failedLoginCount`; dưới `withUserLock` đọc lại hash / `status` / `emailVerifiedAt`; 429 chỉ sau khi đúng mật khẩu; mọi thất bại
  khác cùng `invalidOtp()` (`auth.service.ts:156-190`).
- Đăng ký lại: `updateMany` có điều kiện `emailVerifiedAt: null, status: 'active'`, thu hồi phiên (`reregistered`), chỉ `issueInTx` (huỷ mã cũ) khi qua giới hạn.
- Làm mới phiên: tài khoản chưa xác nhận → thu hồi (`unverified`) → 401 (`session.service.ts:157-162`).
- Chống dò email: `/auth/otp` luôn 202 và tra tài khoản sau khi trả lời; `verify-email` cùng body cho email lạ / đã xác nhận / sai mật khẩu.
- Web: mật khẩu chỉ ở biến module (`app-shell/session/pending-email.ts`), xoá khi rời trang nhập mã và khi xác nhận xong; email ở `sessionStorage`; đăng ký và
  đăng nhập sang trang nhập mã bằng `router.replace` (client-side); trang ở nhóm `(auth)`.

**PR #133, #134 (Practice):** `gate` chặn theo `isAiType` (cloze `own` qua được khi không có `ai.practice`); `ruleTypesOf` giữ cloze `own` khi mất `ai.practice`;
bỏ qua câu cloze trước lần thử lưu `answer_raw = null` (cột nullable; lịch sử, báo lỗi, `answerSummary` đều xử lý `null`); `type_word` vẫn 409. Bảng 4 trường hợp
(`feedbackCase`) và phím khớp §6.3; Enter giữ lâu bị chặn (`e.repeat`); Enter trên nút đang focus giữ luật cũ.

**PR #135, #136 (web):** chế độ khoá nhóm qua `useAddWordScope` (nút, phím N, FAB đều khoá nhóm; rời trang nhóm thì bỏ khoá); "Đã có trong nhóm" chờ hàng đợi nhóm
nạp xong; nút loa chặn Space / 1 / 2 lan ra phiên ôn (`stopPropagation` ở `keydown` và `click`); câu đã lưu chỉ dùng giọng `localService === true`.

## Hai nghi vấn treo

### (a) Bị đẩy về trang đăng nhập khi tải lại trang trên bản dev (refresh 401 sau một lần 200)

**Không do PR #137.** Nhánh `unverified` chỉ chặn tài khoản chưa xác nhận và chặn ngay lần làm mới đầu tiên, và nó **ghi** `revoke_reason = 'unverified'`.

Bằng chứng (đọc DB của các phiên, chỉ đọc):

```
english_learning_cai_thien_group     session_chains 9, revoked 0 · refresh_tokens 18, rotated 9
english_learning_cai_thien_practice  session_chains 7, revoked 0 · refresh_tokens 14, rotated 7
(đối chứng) english_learning_smoke_c13_admine2e: password_changed 4, logout 3  → câu truy vấn đọc được lý do thu hồi
```

Mỗi chuỗi phiên được làm mới **đúng một lần** rồi bỏ, không chuỗi nào bị thu hồi (không `reuse_detected`, không `unverified`, không `expired`). Tức là lần làm
mới thứ hai **không gửi token của DB này**: API không tìm thấy token → 401 không ghi gì (`session.service.ts:85-87`).

Nguyên nhân hợp nhất: cookie `refresh_token` (`apps/api/src/identity/sessions/session-transport.ts:13-14`, `path: '/v1/auth'`, không `domain`) là cookie của
host `localhost`, **dùng chung cho mọi cổng**. Hai phiên PR 2 và PR 3 chạy hai API riêng (khung giờ chồng nhau: 10:38–11:01 và 10:41–11:19 UTC) trong cùng trình
duyệt nhúng của app Claude → đăng nhập ở API này ghi đè cookie của API kia → lần làm mới sau gửi token lạ → 401. Đây là hiện tượng môi trường dev, không phải lỗi
của đợt A. **Chưa tái hiện trực tiếp** (cách tách: một trình duyệt chỉ dùng một API; hoặc hai API trên hai host `127.0.0.1` và `localhost`).

**Hệ quả có thật, có từ trước đợt A (ngoài phạm vi):** app admin và app người học dùng **cùng** cookie `refresh_token` trên host API, cùng `client: 'web'`
(`apps/admin/src/auth/session-store.ts:46`, `apps/web/src/app-shell/session/session-store.ts:52`). Cùng một trình duyệt, đăng nhập admin bằng tài khoản A rồi mở
app người học đang đăng nhập tài khoản B → lần làm mới sau, app người học nhận phiên của **A**. Đăng xuất ở một app cũng đăng xuất app kia. Đáng một việc riêng
trước pilot (ví dụ tên cookie / `path` riêng cho admin).

### (b) Giọng `en-GB` trên trình duyệt thật

**Chưa kiểm.** Máy này chỉ có giọng `en-US` (David, Mark, Zira; phiên 3 đã ghi), trình duyệt nhúng không có giọng Google qua mạng. Code chọn giọng `en-GB` trên
máy trước, không có thì giọng `en-GB` từ xa (`speech.ts:47`), nên trên Chrome / Edge Windows nút UK sẽ dùng giọng từ xa ("Google UK English" / "Microsoft …
Online"); câu đã lưu vẫn chỉ đọc giọng trên máy. Cần chủ dự án bấm thử trên Chrome và Edge thật, và nghe bằng tai.

## Việc còn chưa kiểm

- Web e2e (`pnpm cf:docker`) và admin `e2e-real` không chạy lại ở phiên này (dựa vào CI xanh của từng PR).
- I1 suy ra từ đọc code (`otp.service.ts`, `auth.service.ts`), **chưa chạy** kịch bản 21 lần sai trên API thật.
- (a) là giả thuyết có bằng chứng từ DB, chưa tái hiện.
- (b) giọng `en-GB`, Android, iOS, nghe bằng tai.
