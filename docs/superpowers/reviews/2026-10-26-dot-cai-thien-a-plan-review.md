# Review plan "Đợt cải thiện nhóm A" (26/10/2026)

Plan: [`../plans/2026-10-26-dot-cai-thien-a.md`](../plans/2026-10-26-dot-cai-thien-a.md). Design: [`../specs/2026-10-26-dot-cai-thien-a-design.md`](../specs/2026-10-26-dot-cai-thien-a-design.md).
Đọc code trên working tree `feat/giao-dien-nguoi-hoc-m5b` @ `7ee1233` và so với `origin/dev` @ `c0c3e55`. Không đọc `.env`, không chạy test (chỉ đọc code và git).

## Kết luận

Plan bám design tốt, phần lớn tên file, hàm, dòng, luật rate limit và lệnh test khớp code thật. Nhưng **chưa thực thi được như viết**: mọi nhánh cắt từ
`origin/dev`, trong khi M5b (PR #131, còn OPEN) và toàn bộ tài liệu của đợt chưa có trên `dev` (Critical 1). Ba điểm Important cần sửa plan trước khi giao
cho các phiên: luồng đăng ký lại có race ghi đè mật khẩu tài khoản vừa xác nhận; API nhập mã công khai mở đường chặn đăng ký của người khác (DoS) và lộ tài khoản
chưa xác nhận qua 429 khoá; nút loa trên mặt trước thẻ ôn thành nút lồng trong nút, sẽ trượt axe.

Số lượng: **Critical 1 · Important 3 · Minor 9**.

---

## Critical

### C1. Nhánh gốc `origin/dev` thiếu M5b và thiếu chính tài liệu của đợt

**Sai ở đâu.** Global Constraints: "Mỗi PR một nhánh cắt từ `origin/dev`". Nhưng:
- M5b chưa vào `dev`: `git branch -r --contains 7ee1233` chỉ ra `origin/feat/giao-dien-nguoi-hoc-m5b`; `gh pr list --head feat/giao-dien-nguoi-hoc-m5b` → PR #131 `OPEN`.
- `git ls-tree origin/dev -- apps/web/src/features/learner/add-word/` không có `EditSuggestionForm.tsx`, `AiLookupPanel.tsx`, `m5b-review.test.tsx` — Task 11 sửa
  `EditSuggestionForm.tsx` và test `m5b-review.test.tsx`, A14-3 dựa trên đường "Tra bằng AI → Sửa trước khi lưu".
- `git diff --name-only origin/dev origin/feat/giao-dien-nguoi-hoc-m5b` có `AddWordSheet.tsx`, `WordPage.tsx`, `SenseBlock.tsx`, `messages/vi.json`, `en.json` —
  đúng các file Task 11, 12, 19 sửa; số dòng trong plan và code facts là của M5b, không phải của `dev`.
- Design, plan, decision record, code facts, file câu hỏi và `docs/deliveries/dot-cai-thien-a.md` đều untracked (`git status`: `??`), nên một phiên mở worktree từ
  `origin/dev` không đọc được chúng (plan bảo "Đọc kèm … code facts").

**Vì sao quan trọng.** Phiên 2 sẽ không tìm thấy file cần sửa; phiên 3 (Task 19) sửa `WordPage`/`SenseBlock` bản cũ rồi xung đột khi M5b merge; không phiên nào đọc
được design.

**Sửa plan.** Thêm "Task 0 — tiền đề" trước PR 1–5: (1) merge PR #131 vào `dev` khi CI xanh; (2) commit design, decisions, plan, code facts, file câu hỏi, bản
plan tóm tắt (và hai file đã sửa `deploy-checklist.md`, `IMPROVEMENT_IDEAS`) lên nhánh `docs/dot-cai-thien-a`, PR vào `dev`, merge; (3) chỉ sau đó mới cắt ba nhánh
làm việc; (4) phiên đầu tiên kiểm lại các số dòng của code facts trên `dev` mới (code facts đọc ở `d83146d`, M5b đã thêm `b9301d1`, `7ee1233` sau đó).

---

## Important

### I1. Đăng ký lại: race ghi đè dữ liệu của tài khoản vừa xác nhận; thiếu thu hồi phiên cũ; không test A13-2d

**Sai ở đâu.** Task 2 Step 3: "trước khi tạo, tra `users` theo email trong transaction + `withUserLock(tx, existing.id)` … có, chưa xác nhận và `active` → cập nhật".
Cách hiểu tự nhiên là: đọc dòng theo email (chưa có khoá) → lấy khoá → quyết định bằng dòng đã đọc. `withUserLock` chỉ là advisory lock
(`identity/user-lock.ts:3-4`), không khoá dòng đã đọc trước đó.

**Chứng cứ.** Hôm nay đăng ký khoá trên id mới tạo (`auth.service.ts:56-60`) nên không có chuyện này. Mẫu đúng đã có ở `session.service.ts:84-91`: "Only locate the lock
owner here. All security decisions use fresh locked reads."

**Vì sao quan trọng.** Thứ tự: (1) Lâm gửi đăng ký lại, đọc dòng `emailVerifiedAt = null`; (2) Lan nhập mã đúng, `verifyEmail` giữ khoá, đặt `emailVerifiedAt`, cấp
phiên, commit; (3) đăng ký lại lấy được khoá, ghi mật khẩu và họ tên mới lên **tài khoản đã xác nhận**. Kết quả: mật khẩu tài khoản Lan bị thay, trái A13-2
(đã xác nhận → 409). Thêm nữa, tài khoản chưa xác nhận tạo trước C13 có thể còn chuỗi phiên (đăng ký cũ gọi `startChain`, `auth.service.ts:68`); nếu không thu hồi
khi đăng ký lại, chuỗi phiên cũ của Lan sẽ làm mới được sau khi Lâm xác nhận (Task 5 chỉ thu hồi khi làm mới lúc còn chưa xác nhận).

**Sửa plan (Task 2 Step 3 và Step 1).**
- Trong transaction: `findUnique({ email })` chỉ để lấy id → `withUserLock(tx, id)` → **đọc lại theo id dưới khoá** → quyết định 409 hay thay dữ liệu.
- Ghi bằng `updateMany({ where: { id, emailVerifiedAt: null, status: 'active' } })`, `count !== 1` → 409 `email-taken`.
- Cùng transaction: `sessions.revokeAllForUser(tx, id, 're_registered')`; đặt lại `failedLoginCount = 0`, `loginLockedUntil = null`. **Không** xoá
  `otpFailureWindow` (nếu xoá, kẻ xấu đăng ký lại để có thêm lượt đoán mã).
- Thêm test A13-2d (mock): thứ tự gọi lock → đọc lại → ghi; ca "đọc lại thấy đã xác nhận → 409, không ghi gì".

### I2. API nhập mã công khai: chặn được việc xác nhận của người khác, và 429 khoá làm lộ tài khoản chưa xác nhận

**Sai ở đâu.**
- `auth.verify.email` (email, 10/giờ) đếm **mọi** lời gọi theo email trong body (`rate-limit.guard.ts:27`, guard chạy trước validate). Ai biết email của Lan gửi 10
  lời gọi rác mỗi giờ (chỉ cần một IP, `auth.verify.ip` 20/giờ) là Lan bị 429 suốt giờ đó khi nhập mã thật.
- Khoá OTP theo (user, mục đích): lần sai thứ 21 trong 24 giờ khoá 24 giờ (`otp.service.ts:129-135`). Trước đây chỉ chủ phiên mới gửi được mã sai; nay ai cũng gửi
  được. Khi khoá: nhập mã → 429 (A13-9), đăng nhập → 403 nhưng `issueInTx` trả `null` nên **không gửi mã nào, im lặng** (`otp.service.ts:47`), "Gửi lại mã" → 202
  không gửi gì. Trang nhập mã không chỉ lối thoát.
- Design A13-10 nói mọi thất bại "cùng body", "mẫu theo `PasswordService.reset`". Nhưng `reset` gộp cả khoá vào `invalid-otp` (`password.service.ts:127`:
  `if (outcome.kind !== 'ok') throw this.invalidOtp();`), còn plan Task 3 (A13-9) trả 429 + `Retry-After` ~86 400 s. Email lạ không bao giờ bị khoá → luôn 400; email
  có tài khoản chưa xác nhận → sau 21 lần sai thành 429 dài. Đó là cách dò ra email chưa xác nhận (chậm, ~3 giờ mỗi email vì giới hạn 10/giờ, và chủ email nhận mail
  khoá), trái điều A13-2b cố giữ kín.

**Vì sao quan trọng.** Người mới đăng ký là đúng đối tượng dễ bị chặn, và họ chưa có cách nào khác để vào app.

**Sửa (cần chủ dự án chốt vì đổi design §4.2):**
1. Bỏ `auth.verify.email`; giới hạn đoán mã đã có ở khoá theo tài khoản (20 lần sai / 24 giờ) cộng `auth.verify.ip`. Email không có tài khoản thì không có gì để đoán.
   Nếu muốn giữ, đặt con số cao hơn nhiều so với một người dùng thật (ví dụ 30/giờ) và ghi rõ rủi ro DoS trong §11.
2. Khoá OTP ở nhập mã trả **400 `invalid-otp`** như `reset` (vẫn gửi mail khoá), sửa A13-9 theo đó.
3. Trang nhập mã luôn có link "Quên mật khẩu?" (đặt lại mật khẩu dùng mục đích `reset_password` riêng và đánh dấu đã xác nhận, `password.service.ts:115-116`, A13-18):
   đây là lối thoát khi `verify_email` bị khoá. Thêm test web cho link này.

### I3. Nút loa trên mặt trước thẻ ôn thành nút lồng trong nút

**Sai ở đâu.** Task 19 gắn `SpeakWord` vào `Flashcard.tsx` (40). Cả mặt trước là một `<button onClick={onFlip}>` chứa lemma (`Flashcard.tsx:36-40`:
`<button type="button" onClick={onFlip} …>` … `<span …>{content.lemma}</span>`).

**Vì sao quan trọng.** `<button>` trong `<button>` là HTML sai: React báo `validateDOMNesting`, axe báo `nested-interactive` (mức serious) nên Task 19 Step 4 (axe)
trượt; bấm loa còn nổi bọt lên `onFlip`, lật thẻ (trái A1-6).

**Sửa plan.** Task 19 ghi rõ: mặt trước đặt `SpeakWord` **bên ngoài** nút lật (phần tử anh em, định vị tuyệt đối trong khung thẻ), nút loa `stopPropagation` trên
click; thêm test "bấm UK ở mặt trước → đọc, thẻ không lật" và axe trên trang ôn khi thẻ úp.

---

## Minor

### M1. Test A13-12 "dùng limiter thật của test harness" không chạy được

`otp.controller.spec.ts:15,30` spy và `mockReset()` `RateLimiter.prototype.hit`; Prisma bị thay bằng object giả (`:18-24`); limiter thật ghi vào Postgres
(`rate-limiter.service.ts:28`); backend e2e đã bỏ (D38). **Sửa:** test controller khẳng định `hit` được gọi với `('auth.verify.ip', ip)` và
`('auth.verify.email', 'foo@example.com')` (email đã chuẩn hoá), và một ca `hit` ném 429 → route trả 429. Số lần thật kiểm ở bước chạy thật (Task 10 Step 3).

### M2. Đăng nhập chưa xác nhận: ngân sách mail hết phải vẫn trả 403

Task 1 Interface: `sendVerifyCodeQuietly` "dùng `tryLimitEmail` và `budget.assertAvailable`; bị giới hạn thì không gửi, không ném lỗi". `assertAvailable` ném 503
`mail-unavailable` (`mail-budget.service.ts:29-35`). Ghi rõ: bắt cả 503 này (design §4.2: "Bị giới hạn thì vẫn trả 403"); thêm test. Kiểm `emailVerifiedAt` bằng dòng đọc
**dưới khoá** (không dùng `account` đọc ngoài transaction ở `auth.service.ts:92-94`); fixture `user` của `auth.service.spec.ts` hiện không có `emailVerifiedAt`
(`undefined`), nên kiểm `=== null` sẽ cho qua lặng lẽ: đặt giá trị mặc định là một ngày trong fixture.

### M3. Giới hạn theo email chỉ áp cho đăng ký lại → dò được email chưa xác nhận (vấn đề của design)

Plan giữ và ghim bằng test "first registration of a new email does not consult the email limiter" (Task 2). Hệ quả: đăng ký `x@…` rồi gọi ngay
`/auth/otp {verify_email, x@…}`: email mới → 202 (limiter chưa bị đụng), email đã có tài khoản chưa xác nhận → 429 (lần đăng ký lại vừa tiêu cooldown). Trái
A13-2b "không lộ là email đã có". Mức thấp vì phép dò đã ghi đè dữ liệu tài khoản đó. **Sửa (chủ dự án chốt):** mọi lần đăng ký đều qua `tryLimitEmail`
(email mới cũng vậy), bỏ test ghim; hoặc ghi rủi ro này vào design §11.

### M4. `learner-test-setup.mjs`: nhánh tài khoản cũ chưa xác nhận sẽ gặp 429

Task 6 Step 1: "tài khoản cũ chưa xác nhận → 403 thì xin mã (`/auth/otp …`) rồi nhập mã". Đăng nhập 403 đã gửi mã và tiêu `auth.otp.email.cooldown` (Task 1), nên
`/auth/otp` ngay sau đó trả 429. **Sửa:** sau 403, đọc mã mới nhất ở Mailpit (như `newestCode` của script); chỉ xin mã khi không có mail sau 20 s và đã quá 60 s.

### M5. Trang nhập mã: bốn chi tiết chưa chốt

- Plan Task 9 Step 3: hiện dòng "Bạn cần xác nhận email…" "khi tới từ đăng nhập" nhưng không nói trang biết bằng gì (`next` có thể vắng khi đăng nhập không có
  `next`). Chốt một tín hiệu, ví dụ `?reason=unverified` do `LoginForm` thêm.
- Chữ mã sai mới (design §8) không được ghi vào key lỗi chung `invalid-otp` (`messages/vi.json:901`), vì trang đặt lại mật khẩu cũng dùng key đó. Dùng key riêng của
  `App.auth.verify`.
- `(member)/verify-email/page.app.tsx` tự bọc `<AppShell variant="bare">`; layout `(auth)` cũng bọc `AuthGate` → `AppShell bare`. Khi chuyển nhóm, bỏ `AppShell` ở
  page để không lồng hai khung.
- Review Focus 3: tab A (đang ở trang nhập mã) nhận `login` qua BroadcastChannel và tự `bootstrap()` thành `signed-in` (`session-store.ts:99-103`), nhưng `AuthGate`
  chỉ chuyển trang khi trang mở lúc đã đăng nhập (`AuthGate.tsx:24`). Tab A ở lại, nộp mã cũ → "hãy đăng nhập" trong khi đã đăng nhập. Nên cho trang nhập mã tự vào app
  khi trạng thái thành `signed-in`.

### M6. Thêm từ từ trang nhóm: hai chỗ dễ sai

- `AddWordProvider` nằm **trong** `AppShell` (`AppShell.tsx:40`), mà `GroupPage` tự render `<AppShell>` (`GroupPage.tsx:57`). `useAddWordScope` gọi ở `GroupPage` sẽ nhận
  context mặc định (`add-word-context.tsx:7`, `open: () => {}`) và không làm gì. Ghi rõ: gọi trong `GroupBody`.
- A14-6: `quick-add` trả cùng `404 not-found` khi nhóm không còn **và** khi nghĩa không còn thấy (`quick-add.service.ts:57-64`). "Nhóm này không còn." có thể sai.
  Khi 404 ở chế độ khoá, kiểm lại `GET /v1/groups/{id}` trước khi chọn chữ.

### M7. Luyện tập: năm chỗ plan chưa nói

- `feedbackCase` 4 = mọi `wrong`. Khi từ không còn trong việc học, `highlight_needs_review` false (`answers.service.ts:152`) và review trả 409 `not-in-learning`
  (`practice-reviews.service.ts:103`); Enter thành nút hỏng. Dùng `wrong && highlight_needs_review` cho trường hợp 4, còn lại nút chính là Câu tiếp.
- `CustomizeDialog.tsx:107` `noTypes = types.size === 0 && aiChosen.length === 0` làm nút Bắt đầu tắt khi chỉ bật công tắc mới (A3-2); `aiUsage` (`:109-112`) chia theo
  số kiểu. Task 17 phải sửa cả hai.
- Task 16: test B7E4 (`ai-session-planner.service.spec.ts:67-70`, `resolves.not.toBeNull()`) gãy nếu `gate` trả `null` cho câu `own`; thêm vào danh sách test phải sửa.
  Thêm ca API cho A3-2: Free, chỉ `['cloze']` `own`, không có câu → 409 `practice-no-words`, không phải 403.
- Task 13 lưu `answerRaw: ''`. `HistoryPage.tsx:182` hiện "—" khi `answer === null`, còn `''` cho ô trống; snapshot báo lỗi cũng đọc `answer_raw`
  (`reports/snapshot.ts:17`). Lưu `null` (đổi kiểu `FinalWrite.answerRaw` thành `string | null`) và nêu `history.service.ts:117`, `snapshot.ts` trong Step 4.
- Phím tắt trong phiên còn ghi Enter = "Kiểm tra, sang câu tiếp" (`messages/vi.json`, `App.practice.shortcuts.check`); sau C16, Enter trên màn kết quả là nút chính. Sửa chữ
  này (chưa có trong design §8).

### M8. Hàng When → Then chưa có test trong plan

A13-2d (xem I1); A13-18 và A13-20 (design §9 liệt kê cho API unit, plan không có); A3-5, A3-6 (dựa vào hành vi cũ, nên ghi rõ test nào đang giữ); §6.1 "sau khi bỏ
qua hiện như trường hợp 4" chưa có test web; Task 15 không chạy axe / không cuộn ngang cho màn kết quả Luyện tập đã đổi (design §9 yêu cầu cho mọi màn đổi).

### M9. Lặt vặt về tài liệu và song song

- Dòng Architecture ghi "Bốn PR vào `dev`", thực tế năm PR.
- Task 20 "Create `docs/deliveries/dot-cai-thien-a.md`": file đã có (bản plan tóm tắt); là Modify.
- `docs/deliveries/giao-dien-nguoi-hoc-test-flow.md` bị cả ba phiên sửa (Task 10, 12, 17, 19): thêm vào danh sách xung đột chắc chắn ở design §3 cùng `vi.json`/`en.json`,
  hoặc cho mỗi phiên một file test flow riêng của đợt.

---

## Đã kiểm, khớp code (không phải phát hiện)

`auth.service.ts` `register` 40-82 / `login` 84-126; `otp.service.ts` `requestVerifyEmail` 66-86, `requestPasswordReset` 88-106, `checkInTx` 109-137, `verifyEmail`
139-165; `otp.controller.ts` 34-44; `otp.schemas.ts`; `session.service.ts` `RefreshOutcome` 28-30, `refreshLocked` 140-158; `app-config.ts` `RateLimitRuleName`,
`DEFAULT_LIMITS` (và `app-config.spec.ts:183` liệt kê luật); guard đọc `request.body?.email` qua `normalizeEmail`; `MailDispatcher.afterResponse` chạy cả khi trả lỗi
(`res.once('close')`); `answers.service.ts:97` (lỗi "Xem đáp án" có thật trong code); `ai-session-planner.service.ts:42-44`; `sessions.service.ts:483-488`; không có CHECK
nào trên `practice_session_items.answer_raw`; caller duy nhất của `AuthService.login/register` là `auth.controller.ts`; caller duy nhất của `store.register` là
`RegisterForm.tsx`; script dùng token đăng ký đúng như danh sách Task 6; `apps/admin/e2e-real/support/api.ts:36-43`; tên package `api`/`web`/`admin` và các lệnh
`test`, `test:e2e`, `cf:docker`, `test:e2e:real`; `GET /v1/topics` có sẵn; scale test (`test/support/auth-helpers.ts`) dùng `startChain` trực tiếp, không làm mới phiên nên
không gãy vì Task 5. Nhánh phòng thủ `RequireSession` → `/app/verify-email` không lặp vô hạn vì Task 5 làm `bootstrap` thành `signed-out` sau lần tải lại trang.

UNVERIFIED: chưa chạy test nào; hành vi giọng đọc trên Windows/Edge; thời gian trả lời khác nhau giữa email có / không có tài khoản ở API nhập mã.
