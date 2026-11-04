# Review độc lập — Design "Chuẩn bị launch, đợt A" (04/11/2026)

> **Đối tượng:** [`../specs/2026-11-04-chuan-bi-launch-a-design.md`](../specs/2026-11-04-chuan-bi-launch-a-design.md), cùng decision record
> [`../decisions/2026-11-04-chuan-bi-launch-a-decisions.md`](../decisions/2026-11-04-chuan-bi-launch-a-decisions.md) và hai file code facts
> (`docs/preparation/LAUNCH_PREP_CODE_FACTS_2026-11-04-hardening.md`, `...-free-ai.md`).
> **Code đọc trên:** worktree `launch-prep-design`, `origin/dev` @ `a6b2bd15`. Mã thư viện (`@nestjs/core` 12.1.2, Express 5.2.1) đọc trong `node_modules`
> của checkout chính, vì worktree không có `node_modules`. Tài liệu Cloudflare và MDN đọc ngày 04/11/2026. Không chạy app, không build, không chạy test.
> **Cách review:** theo design như một tài liệu để build (nhất quán, build được, khớp code), không so với spec cũ. Các quyết định đã chốt không bàn lại,
> trừ chỗ hai quyết định va nhau hoặc không build được như đã viết.

## §0. Tóm tắt

**Kết luận: chưa nên chuyển sang `writing-plans`.** Hướng đi đúng và phần lớn cơ chế design dựa vào đều có thật trong code. Có 2 chỗ sẽ build ra kết quả
sai (admin không đăng nhập được ở production; quyết định Q-A7 bị bỏ qua mà không ai biết) và 14 chỗ phải sửa trước khi viết plan, phần lớn sửa trên giấy
mất vài giờ.

| Mức | Số | Mã |
|---|---|---|
| Critical | 2 | RA-1, RA-2 |
| Important | 14 | RA-3 … RA-16 |
| Minor | 11 | RA-17 … RA-27 |

Có ba việc cần chủ dự án quyết lại vì hai quyết định va nhau hoặc vì có rủi ro mới:
- **RA-6:** từ chối khi Cloudflare lỗi (Q-A4) nay áp cả cho đăng nhập, nên không ai đăng nhập được, kể cả admin.
- **RA-10:** lượt AI của Free tính chung trần `ai_daily_cap` với Pro.
- **RA-14:** limits grant hết hạn giữa tháng có theo luật Q-A7 không.

---

## Critical

### RA-1 — Kiểm `hostname` "khớp host của web" sẽ chặn hết đăng nhập admin (Critical)

- **Chỗ:** §4.2 (dòng 77–78), §4.5 hàng "Token qua nhưng `hostname` không phải host của web" (dòng 134).
- **Bằng chứng:** Q-A1 và Q-A2 đặt widget ở trang đăng nhập và quên mật khẩu của admin (§4.3, dòng 99–100). Token sinh trên `admin.wordmet.com` nên
  siteverify trả `hostname` là `admin.wordmet.com`, khác host của web. Web cũng chạy ở hai host, `wordmet.com` và `www.wordmet.com`
  (`apps/web/wrangler.jsonc:7-10`), và không có code nào chuyển `www` sang apex (grep `www` trong `proxy.ts`, `next.config.ts` rỗng). Ở local, admin
  được mở bằng `127.0.0.1:5173` (`apps/api/.env.example`, `CORS_ORIGINS`). Mẫu response của khóa test Cloudflare ghi `"hostname": "localhost"`, và tài
  liệu không nói giá trị này cố định hay đổi theo trang (trang Testing của Turnstile).
- **Hậu quả:** CI chạy `fake` nên không bắt được lỗi này. Nó chỉ lộ ra sau deploy: mọi lần đăng nhập admin bị `captcha-failed`.
- **Sửa:** API nhận một **danh sách** hostname, đọc từ biến môi trường (vd `TURNSTILE_ALLOWED_HOSTNAMES=wordmet.com,www.wordmet.com,admin.wordmet.com`)
  hoặc suy ra từ `LEARNER_APP_URL` và `ADMIN_APP_URL` cộng `www`. Ghi rõ dùng **một** widget (một sitekey và một secret) đăng ký đủ các hostname đó trong
  Cloudflare. Hai widget sẽ cần hai secret, và API không biết token đến từ widget nào. Thêm hàng When → Then cho token của admin và cho `www`.

### RA-2 — Q-A7 không build được như đã viết: `resolve()` không thấy nguồn Pro/trial đã kết thúc (Critical)

- **Chỗ:** §6.2 (dòng 205–206: "`resolve()` trả thêm mốc kết thúc này"), dòng 202 ("Không cần migration"), §6.7 hàng "Lan (Pro) … hết hạn 20/11 10:00".
- **Bằng chứng:** `SourcesRepository.load` bỏ subscription có status `expired` hoặc `revoked`, và bỏ grant đã revoke hoặc đã hết hạn
  (`apps/api/src/entitlements/sources/sources.repository.ts:38-46`; `loadMany` cũng vậy, `:56-59`). Vì vậy `resolve()` không bao giờ nhận được nguồn đã
  kết thúc, nên không tính được "lúc kết thúc gần nhất". `Subscription` không có cột `ended_at` (`apps/api/prisma/models/entitlements.prisma:53-81`). Trạng
  thái `expired`, `revoked`, `on_hold` do event đặt không lưu thời điểm (`billing/subscription-machine.ts:157-197`), chỉ có `lastEventAt` và `updatedAt`.
  Các mốc kết thúc suy ra lúc đọc thì nằm trong `effectiveStatus` (`rules/plan-rules.ts:50-67`): hủy cuối kỳ thì `expired` ở `currentPeriodEnd`; quá hạn thì
  thành `on_hold` sau `end + graceDays`; `grace` thì thành `on_hold` ở `graceEndsAt`.
- **Hậu quả:** cách dễ nhất là thêm một field vào `resolve()` và viết unit test với một nguồn đã hết hạn làm input. Test đó xanh, nhưng ở production nguồn
  hết hạn không được nạp, nên mốc luôn là `null`. Cửa sổ Free khi đó bắt đầu từ đầu tháng, và lượt dùng lúc còn Pro lại bị tính vào Free, trái với Q-A7.
  Không có gì fail, vì Xong khi không có hàng Pro → Free (RA-13).
- **Sửa:** viết rõ trong §6.2:
  1. Repository nạp thêm các nguồn kết thúc từ đầu tháng (theo zone) tới nay.
  2. Một hàm thuần `lastProEnd(sources, now, graceDays)` với một luật cho từng kiểu kết thúc: plan grant (`endsAt` / `revokedAt`), subscription hủy cuối kỳ,
     quá hạn rồi thành `on_hold`, `grace` hết hạn, event `expired`/`revoked` (dùng `lastEventAt`, hay thêm cột `ended_at` có migration?), trial hết hạn.
     Trial bị từ chối (`trialDenied`) không tính là nguồn.
  3. Sửa câu "Không cần migration" cho đúng với cách chọn ở bước 2.
  4. Mỗi kiểu kết thúc một hàng edge case.
  5. Một bước smoke chạy Pro → Free giữa tháng trên API thật.

---

## Important

### RA-3 — Guard chạy **trước** khi body được validate; hàng §4.5 và cách "bắt buộc tùy chế độ" đều sai cơ chế (Important)

- **Chỗ:** §4.2 dòng 72–75; §4.5 hàng 130 ("400 `validation-failed` từ schema; không tới guard").
- **Bằng chứng:** trong Nest, guard chạy trước pipe. `fnCanActivate` được gọi trước, còn `fnApplyPipes` chỉ chạy bên trong handler
  (`@nestjs/core/router/router-execution-context.js:41-50`, bản 12.1.2). Schema `@Body({ schema })` đi qua pipe global
  `StandardSchemaValidationPipe` (`apps/api/src/app.setup.ts:37`). Body đã được parse lúc guard chạy (`app.setup.ts:15-26`), nhưng **chưa validate**:
  `turnstile_token` có thể thiếu, là số hoặc là object.
  Schema là hằng tạo lúc load module (`auth.schemas.ts:4-16`, `otp.schemas.ts:4-7`), nên không thể "bắt buộc hay không tùy chế độ". `loginSchema` và
  `verifyEmailSchema` là `registerSchema.pick(...)` (`auth.schemas.ts:16`, `otp.schemas.ts:8`), nên thêm field vào `registerSchema` không tự sang login.
  Thứ tự guard: `UseGuards` nối mảng metadata (`extend-metadata.util.js`), decorator được áp từ dưới lên, `GuardsConsumer` chạy guard theo thứ tự mảng
  (`guards-consumer.js:11`). Vậy decorator Turnstile phải đặt **dưới** `@RateLimit(...)` (`rate-limit.decorator.ts:7-8`) thì mới chạy trước, ngược với
  cách đọc bình thường.
- **Sửa:**
  - Trong schema, đặt `turnstile_token` là `z.string().min(1).max(2048).optional()`.
  - Guard tự kiểm token là chuỗi 1–2048 ký tự: sai thì 400 `validation-failed`, không gọi mạng, không đếm rate limit. Bắt buộc có token ở `real` và `fake`,
    bỏ qua ở `off`.
  - Viết rõ thứ tự decorator, hoặc thêm option `turnstile: true` vào `@RateLimit` để một decorator đặt đúng thứ tự.
  - Nêu tác động lên các test HTTP unit đang có, vì chúng dựng app thật với guard thật: `auth.controller.spec.ts:61-66`, `:76-90`, và
    `otp.controller.spec.ts`. Đề xuất `testConfig` để `off`, còn guard có test riêng.

### RA-4 — Guard Turnstile đặt trước rate limit: mỗi request của bot là một lần gọi Cloudflare, không có giới hạn (Important)

- **Chỗ:** §4.2 dòng 72; decision record, bảng "Đề xuất kỹ thuật" (chưa duyệt).
- **Bằng chứng:** design muốn token giả không ăn vào bộ đếm của người thật. Hệ quả ngược lại là bot gửi token rác bao nhiêu lần thì API gọi siteverify
  bấy nhiêu lần, mỗi lần giữ một kết nối ra ngoài tới hết timeout, trước khi có bất kỳ giới hạn nào. Thêm nữa, token hợp lệ bị **tiêu** ngay cả khi
  `RateLimitGuard` trả 429 ngay sau đó. `apps/admin/e2e-real/support/sign-in.ts:18-24` đang chờ hết `Retry-After` rồi bấm lại với cùng form, nên ở chế độ
  `real` lần bấm lại sẽ bị `captcha-failed`.
- **Sửa (cần chọn trước plan, đề xuất (a)):**
  - (a) Giữ thứ tự của design, cộng kiểm hình dạng token không gọi mạng (RA-3), cộng một giới hạn riêng theo IP cho số lần gọi siteverify (vd
    `auth.captcha.ip` 60/60 s).
  - (b) Đổi thứ tự: kiểm hình dạng, rồi `RateLimitGuard`, rồi siteverify. Token không bị tiêu khi 429; đổi lại, request rác của bot vẫn tính vào bộ đếm của
    cả IP.
  - Ghi trade-off vào decision record.

### RA-5 — Token dùng một lần: web và admin phải làm mới widget sau **mọi** lần gửi, không chỉ khi `captcha-failed` (Important)

- **Chỗ:** §4.2 dòng 84; §4.3 dòng 91–93; §4.5 hàng 132, 133, 138.
- **Bằng chứng:**
  - Tài liệu siteverify: "Each token can only be validated once". Design chỉ làm mới widget khi gặp `timeout-or-duplicate`.
  - Sai mật khẩu (401 `invalid-credentials`, `LoginForm.tsx:62-63`), `email-taken`, mật khẩu không đạt luật, 429 hay `mail-unavailable` đều đã tiêu token.
    Nên Lan sửa mật khẩu rồi bấm lại thì bị `captcha-failed`, và phải bấm thêm lần thứ ba.
  - Ngược lại, hàng "để form quá 5 phút" có thể không xảy ra: `refresh-expired` mặc định là `auto` ("Automatically refreshes the token when it expires",
    trang Widget configurations), tức widget tự lấy token mới.
- **Sửa:**
  - `TurnstileWidget` gọi `reset()` và xóa token sau mỗi response, kể cả 2xx (form chuyển trang thì thôi).
  - Đặt rõ `refresh-expired: 'auto'`, và dùng `expired-callback` / `error-callback` để tắt nút gửi.
  - Sửa ba hàng §4.5. Thêm hàng "sai mật khẩu rồi bấm lại" và hàng "429 rồi bấm lại".

### RA-6 — Q-A4 (từ chối khi Cloudflare lỗi) và Q-A1 vòng 2 (chặn ở login) va nhau: Cloudflare lỗi thì không ai đăng nhập được (Important)

- **Chỗ:** §4.2 dòng 85; §10 Q-A1, Q-A4; decision record DA12 (dòng 132).
- **Bằng chứng:** DA12 chỉ cân nhắc "Người thật không đăng ký được lúc Cloudflare lỗi (hiếm)", vì lúc chốt Q-A4 login chưa bị chặn. Sau Q-A1 vòng 2,
  siteverify lỗi nghĩa là không ai đăng nhập được web hay admin; chỉ phiên đang mở còn sống nhờ `refresh`. Cũng không có cách tắt khẩn cấp: `off` và
  `fake` bị chặn khi `BILLING_PRODUCTION=true` (§4.2 dòng 83), nên muốn tắt Turnstile thì phải tắt luôn chế độ production, kéo theo việc mở cửa cho đồ
  giả (X-3).
- **Sửa:** hỏi lại chủ dự án đúng câu này, kèm các lựa chọn:
  - giữ từ chối ở mọi route;
  - login cho qua khi Cloudflare lỗi, chỉ dựa vào rate limit và khóa tài khoản (register và otp vẫn từ chối);
  - thêm một công tắc khẩn cấp riêng (vd biến `TURNSTILE_EMERGENCY_BYPASS`, ghi log cảnh báo), kèm runbook trong checklist.
  Ghi vòng 2 của DA12.

### RA-7 — Phía client chưa có chế độ không cần Cloudflare thật (Important)

- **Chỗ:** §4.3 dòng 94–101; §8 dòng 271–273.
- **Bằng chứng:** design chỉ nói "e2e mock … giả widget". Còn bỏ ngỏ:
  - (1) `admin-e2e-real` chạy admin thật trên trình duyệt thật qua `vite preview` (`apps/admin/playwright.real.config.ts:29-35`), đăng nhập bằng giao diện
    (`e2e-real/support/sign-in.ts:9-25`). Widget sẽ tải script thật từ `challenges.cloudflare.com` trong CI.
  - (2) `pnpm bootstrap` và local khi không có mạng.
  - (3) Unit test của form: `auth.test.tsx`, `LoginPage.test.tsx`, `ForgotPasswordPage.test.tsx` đều cần một bản giả của widget.
  - (4) E23 (`apps/web/e2e/csp.spec.ts:28-34`) mở `/vi/app` lúc chưa đăng nhập, tức trang login, nơi nay có widget. Phải chọn: tải widget thật (kiểm được
    CSP với iframe thật, nhưng cần mạng) hay bản giả (không kiểm được CSP của iframe).
  - (5) Không nói build production làm gì khi thiếu site key.
- **Sửa:**
  - Một nguồn token có thể thay bằng bản giả: provider/context, hoặc site key rỗng trong build không phải production thì dùng widget giả trả token cố
    định. API ở `fake` nhận token đó.
  - Build production của web (app bật) và của admin fail khi thiếu site key, như `assertApiBaseUrl` (`apps/web/next.config.ts:10-11`) và
    `resolveApiBaseUrl` (`apps/admin/src/resolve-api-base-url.ts`).
  - Đề xuất E23 dùng widget thật với sitekey test, còn mọi e2e khác dùng bản giả.

### RA-8 — `TURNSTILE_MODE` chưa có giá trị mặc định và chưa có danh sách nơi phải đặt (Important)

- **Chỗ:** §4.2 dòng 79–83.
- **Bằng chứng:**
  - Mọi biến cờ hiện nay đều có mặc định (`app-config.ts:184-252`). Nếu `TURNSTILE_MODE` mặc định `off` hoặc `fake`, một production quên đặt cả biến này
    lẫn `BILLING_PRODUCTION` (mặc định `false`, `:238`; đây là lỗ X-3) sẽ chạy không có Turnstile mà không ai biết.
  - Worker dùng cùng `loadConfig` (`apps/api/src/worker.ts:10`), nên luật "`real` cần secret" áp cả cho worker.
  - Secret Turnstile không ở dạng base64url, nên không dùng `secretSchema` được (`app-config.ts:150-159`).
- **Sửa:** chốt "không có mặc định, thiếu thì dừng" hoặc "mặc định `real`". Liệt kê nơi đặt:
  - API: `apps/api/.env.example`, `test/support/test-config.ts`, env của `admin-e2e-real` trong `ci.yml:205-237`, `docker-compose.yml` (api).
  - Client: `ci.yml:111,147,155,160`, `deploy-web.yml:27-31`, `playwright.config.ts:24-26` của web và admin, `vite-env.d.ts`, `apps/admin/.env.example`.
  - Smoke: tự kiểm `.env` có `fake` trước khi chạy, theo mẫu các smoke đang có.

### RA-9 — `trial_eligible = false` mâu thuẫn với "giữ nguyên" `smoke-buoc-8` và `learner-test-setup --plan trial` (Important)

- **Chỗ:** §6.6 dòng 239, 241–242.
- **Bằng chứng:**
  - `smoke-buoc-8.mjs:600` đòi `view.trial_eligible === true` sau khi đăng ký lại (B8E28), nên sẽ đỏ.
  - `learner-test-setup.mjs:351`: `trial_eligible` là false thì in "skipped: the learner has used a trial before" và **không** bắt đầu trial. Vậy
    `--plan trial` lặng lẽ không làm gì, kèm một lý do sai.
- **Sửa:** B8E28 kiểm `trial_history` bằng SQL (bước đó đã dùng `psql`, `:590-592`) thay cho `trial_eligible`. `learner-test-setup` bỏ điều kiện
  `trial_eligible` hoặc đọc `trial_history`. Liệt kê hai script này trong §6.6 và §8. Thêm `entitlements.service.spec.ts` (đang ghim `trial_eligible`) vào
  danh sách test đổi.

### RA-10 — Free dùng chung trần `ai_daily_cap` với Pro: người Free có thể làm Pro hết AI cả ngày (Important, rủi ro chưa ghi)

- **Chỗ:** §6.1 dòng 187 ("vẫn đếm cả lượt của Free (đã vậy)"); §11 không có dòng nào.
- **Bằng chứng:** `ai_daily_cap` mặc định 1000 (`settings.definitions.ts:75`) và đếm mọi lượt, không lọc theo gói (`usage.queries.ts:94-103`, code facts F12).
  Chạm trần thì **mọi** người nhận `ai-unavailable` (`ledger-rules.ts:40-46`). 70 người Free dùng hết 15 câu trong một ngày là chạm trần. Mỗi tài khoản
  Free cần một email xác minh được (login trả `email-not-verified`), mà email dùng một lần thì có sẵn.
- **Sửa:** ghi rủi ro vào §11 và hỏi chủ dự án:
  - (a) chấp nhận, admin tự nâng trần;
  - (b) thêm trần riêng cho Free mỗi ngày (một setting nữa), kiểm cùng `lockAiDaily`;
  - (c) giữ một phần trần cho người trả tiền.
  Đề xuất (b) nếu muốn bảo vệ Pro; (a) nếu Pro chưa bán (đợt B).

### RA-11 — Chính sách bảo mật đang hứa "AI chỉ có ở gói Dùng thử và Pro"; đợt A làm câu này sai mà không ghi việc sửa (Important)

- **Chỗ:** §1 "Không làm" (dòng 25–26) chỉ nhắc Điều khoản mục 5–8 đi cùng đợt B.
- **Bằng chứng:** bản nháp `chinh-sach-bao-mat.draft.md` (nhánh `docs/web-launch-research`): dòng 110 "Tính năng AI chỉ có ở gói Dùng thử và Pro"; dòng
  101 hứa email "nhắc sắp hết thời gian dùng thử". Điều khoản có mục "5. Dùng thử" (`dieu-khoan-su-dung.draft.md:70`). Cloudflare đã có trong danh sách
  bên nhận dữ liệu (dòng 128, "chống tấn công"), nên Turnstile không cần thêm bên mới.
- **Sửa:** thêm một việc tài liệu vào đợt A (M3) hoặc ghi rõ sang đợt B: Chính sách bảo mật mục 3 và mục 4 (Free có AI giới hạn, bỏ email dùng thử) và Điều
  khoản mục 5. Mỗi sự thật pháp lý ghi một lần (memory "No lawyer push").

### RA-12 — Còn chữ cũ từ vòng 1 của Q-A1 và Q-A2: plan sẽ thiếu login và admin (Important)

- **Chỗ, bằng chứng:**
  - §2 dòng 38: "Turnstile ở đăng ký và quên mật khẩu", thiếu đăng nhập và gửi lại mã.
  - §3 dòng 46: "admin nếu chọn", trong khi Q-A2 đã chốt có.
  - §8 dòng 271: web chỉ test "form đăng ký và quên mật khẩu gửi token", thiếu `LoginForm` và nút gửi lại của `VerifyEmailForm`.
  - §8 dòng 273: "widget (nếu Q-A2 chọn)".
  - §9 dòng 282: chạy tay chỉ "đăng ký và quên mật khẩu trên web", thiếu login và admin.
  - Mục checklist `deploy-checklist.md:83` còn ghi "đăng ký, quên mật khẩu, waitlist".
- **Sửa:** sửa đủ sáu chỗ. Nêu trong §4.3 và §8 test cho `LoginPage` và `ForgotPasswordPage` của admin.

### RA-13 — "Xong khi" có mục không kiểm được và thiếu mục cho phần đã đổi (Important)

- **Chỗ:** §9 dòng 281–283.
- **Bằng chứng, sửa:**
  - "header kiểm bằng `curl -I` trên … admin local": admin local chạy `vite` hoặc `vite preview` (`apps/admin/package.json`, `dev`, `preview`), và hai lệnh
    này không đọc `_headers`; `_headers` là tính năng của Workers Static Assets. Tài liệu `_headers` không nói `wrangler dev` có áp file này không
    (`ASSUMPTION`). Sửa: kiểm `dist/_headers` có sau build; thêm một unit test đọc `public/_headers` và ghim các directive (Turnstile, host API); `curl -I`
    thật để sau deploy, ghi vào checklist.
  - Chỉ smoke 5, 7, 8 chạy lại, trong khi M1 đổi **cả chín** smoke, `learner-test-setup`, `admin-e2e-real` (code facts §A5). Sửa: chạy lại mọi smoke có đổi
    (ít nhất một lần, trên DB mới), cộng một lần `learner-test-setup`.
  - "đổi giờ máy sang tháng sau": API dùng `SystemClock` (`common/clock/clock.ts`), không có biến nào giả giờ. Đổi giờ Windows làm lệch Docker, JWT và
    cookie. Sửa: chỉ dùng cách "đặt dữ liệu", ghi câu SQL lùi `confirmed_at` của học viên đó về tháng trước.
  - Thêm: một lượt Pro → Free giữa tháng (RA-2); đăng nhập web và admin ở `real` với khóa test.

### RA-14 — Thiếu edge case ở §4.5 và §6.7 (Important)

Đề xuất thêm các hàng sau. Hàng có dấu ⚑ cần chủ dự án chọn.

| Khi | Thì (đề xuất) | Bằng chứng |
|---|---|---|
| Lượt giữ chỗ lúc 23:59:30 ngày 30/11, confirm lúc 00:00:10 ngày 01/12 | Tính vào **tháng 12** (`confirmed_at` = lúc confirm); tháng 11 coi như không mất lượt đó | `usage.queries.ts:14-21`, `usage-ledger.service.ts:97-100` |
| ⚑ Lan (Free) có limits grant 50 câu AI từ 10/11, grant hết hạn ngày 20/11 | Về tháng dương lịch từ 01/11, nên lượt thời grant bị tính vào Free 15 và Lan hết lượt tới 01/12. Có áp luật `max()` của Q-A7 cho grant có AI không? | `plan-rules.ts:112-113`, `sources.repository.ts:43` |
| Câu AI dùng lúc còn Pro, bị báo lỗi và xác nhận sau khi Lan về Free | Refund tính vào cửa sổ Free (`credited_at` = bây giờ), nên có thể cộng một lượt Free. Đề xuất B5-7 đòi thêm dòng `use` nằm trong cửa sổ hiện tại | `usage-ledger.service.ts:140-159` |
| Câu AI tháng 11 bị báo lỗi, admin xác nhận ngày 02/12 | Như trên: hoàn vào tháng 12, hay từ chối? | như trên |
| Lan đổi timezone sát cuối tháng (VN → `Pacific/Kiritimati` → VN) | Có thể được thêm tới **một lượt Free đầy đủ**, không chỉ "dịch một ngày" như §6.7 hàng 253 ghi. Chấp nhận, nhưng ghi cho đúng | `usage.queries.ts:52-56` (đếm theo thời điểm) |
| Free → Pro một ngày (editor cấp, D6–D8) → Free trong cùng tháng | Theo Q-A7, cửa sổ Free bắt đầu lại sau khi Pro kết thúc, nên có lại 15 lượt. Ghi là chấp nhận | `plan-rules.ts:102-107` |
| Pro không có anchor (subscription có `quotaAnchorAt` null) | `aiCycle` giữ `null` như hiện nay cho mọi gói khác Free (không âm thầm thành tháng dương lịch) | `plan-rules.ts:97` |
| Web bản mới gửi `turnstile_token` tới API bản cũ | 400 vì schema strict; deploy API trước web | code facts hardening §0.3 |
| siteverify trả `internal-error` hoặc lỗi mạng | Thử lại một lần với cùng `idempotency_key`, rồi mới 503 (không đổi Q-A4) | trang Server-side validation |
| Token lấy ở form đăng nhập đem dùng cho `register` | Hiện qua được. Tùy chọn: đặt `action` riêng cho từng form và kiểm ở API | trang Widget configurations (`action`) |

### RA-15 — Bảng When → Then chưa theo quy ước: thiếu mã, thiếu bảng edge case, thiếu phần header và các sửa lỗi (Important)

- **Chỗ:** §4.5, §6.7.
- **Bằng chứng:** `docs/specs/SPEC_WRITING_CONVENTIONS.md` yêu cầu mỗi hàng có mã (`{prefix}#`, `{prefix}E#`) và tách bảng tiêu chí với bảng edge case.
  Design Bước 8 làm đúng như vậy (`B8E1…`, `2026-10-28-buoc-8-identity-remainder-design.md:531-533`). Test của dự án dẫn mã (vd `B5#20`, `B7E1`), nên TDD
  cần mã để dẫn. Phần header (§4.4), các defect fix của nhóm 2 (B3-5, B5-5, B5-7: test đỏ trước) và settings (§6.3) chưa có hàng nào.
- **Sửa:** đặt prefix (vd `LA#`/`LAE#`). Mỗi defect fix một hàng "Khi … thì" làm test đỏ. Header của API, admin, web mỗi bên một hàng.

### RA-16 — Còn lựa chọn bỏ ngỏ, làm plan mơ hồ (Important, sửa nhanh)

- §5 dòng 161: B2-6 "(hoặc ghi rõ vào design nếu giữ)".
- §5 dòng 152: B5-6 "(nếu chọn sửa chữ design)".
- §4.4 dòng 110 và §11 dòng 305–306: CSP admin dùng `'unsafe-inline'` "hoặc hash". Đã chọn `'unsafe-inline'` thì hai `ASSUMPTION` về hash và CSSOM ở §11
  không còn cần.
- §6.3 dòng 212: "Đề xuất thêm ràng buộc chéo Free ≤ Pro". Lưu ý: ràng buộc này buộc Free phải về 0 nếu admin đặt AI của Pro về 0.
- **Sửa:** chốt từng mục, ghi vào decision record.

---

## Minor

### RA-17 — Ô CSP của admin đọc như có hai `script-src`

§4.4 dòng 110 viết `script-src 'self'; …` rồi "`script-src` và `frame-src` thêm …". Chép nguyên văn thì CSP có hai `script-src`, và trình duyệt bỏ qua
directive lặp lại, nên Turnstile bị chặn. **Sửa:** ghi đúng một chuỗi cuối cùng, vd `script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; …`.
Ghi thêm: chỉ dùng một rule `/*`, vì `_headers` nối giá trị bằng dấu phẩy khi một header được áp hai lần (tài liệu `_headers`).

### RA-18 — Thiếu slug lỗi ở web và admin

Web chỉ thêm `captcha-failed`, thiếu `captcha-unavailable` (`apps/web/src/app-shell/api/problem.ts:35-83`). Admin có danh sách và test riêng
(`apps/admin/src/api/problem.ts:41-82`, `problem.test.ts`), mà design không nhắc. **Sửa:** thêm cả hai slug, câu vi/en, ở cả hai app.

### RA-19 — §6.4 mô tả sai màn "hết lượt"

`lockedLine` ("Dành cho gói Pro…") chỉ hiện khi limit = 0 (`AiTypesToggle.tsx:88`, `locked={!allowed}`). Hết lượt thì web đã có sẵn hộp `quota` kèm
ngày có lượt mới (`CustomizeDialog.tsx:308-334`; `AiLookupPanel.tsx:63-66`; `vi.json:963-964, 1228-1232`). **Sửa:** ghi "không thêm trạng thái mới, chỉ
sửa chữ", để plan không dựng thêm một trạng thái khóa trùng.

### RA-20 — Ô của bảng landing chỉ là `Mark` có/không

`Plans.tsx:34-42` dựng `{ label, free: boolean }`, mỗi ô là dấu có hoặc không. "Ghi số lượt" (§6.4 dòng 227) cần đổi component sang ô có chữ (layout điện
thoại, PR #208). Số 15 và 5 lại được ghi cứng trong chữ landing, tách khỏi `SETTINGS_DEFAULTS`. **Sửa:** nêu kiểu ô mới, và ghim bằng test giá trị ghi
trong chữ (luật "tài liệu hứa gì thì phải có thứ fail").

### RA-21 — Hàng §4.5 dòng 137 hứa quá

"không khóa được tài khoản của Lan" không đúng với bot giải được Turnstile (dịch vụ giải CAPTCHA thuê): 10 lần sai cần 10 token. **Sửa:** "khó hơn và tốn
tiền hơn nhiều", và ghi rủi ro còn lại vào §11.

### RA-22 — `ASSUMPTION` ngầm về hạ tầng

- HSTS "để Cloudflare đặt" (§4.4 dòng 119) chỉ đúng khi API đứng sau proxy của Cloudflare; hosting của API chưa chọn.
- Header trong `next.config.ts` có thể không áp cho file tĩnh mà Workers Static Assets trả trực tiếp (`.open-next/assets`).
- **Sửa:** ghi hai dòng `ASSUMPTION` và mục checklist tương ứng.

### RA-23 — Thiếu mục deploy checklist cho Turnstile

Cần thêm:
- tạo widget với đủ hostname (RA-1);
- đặt secret và `TURNSTILE_MODE=real`;
- site key trong `deploy-web.yml` và trong build admin;
- sau deploy, gọi `curl` không có token phải nhận 400.

Sửa `deploy-checklist.md:83-86` (bỏ waitlist, thêm login) và đánh dấu hai mục header `:49-53`.

### RA-24 — Va chạm với design B

Design B đưa CSP của `/app` sang `proxy.ts` với `nonce` và `'strict-dynamic'` (B §5.3). CSP mới đó phải giữ `frame-src` của Turnstile, và script
Turnstile do một script có `nonce` chèn vào. Design B cũng thêm ba setting giá (B dòng 152), nên "51 key" của §8 chỉ đúng khi A merge trước B. **Sửa:** ghi
một dòng phụ thuộc ở cả hai design.

### RA-25 — `EXPORT_MAX_ROWS` 10.000: đổi mặc định chưa đủ

`apps/api/.env.example:10` đặt cứng `EXPORT_MAX_ROWS=5000`, và `app-config.spec.ts:127` ghim `5_000`. Chỉ đổi mặc định ở `app-config.ts:226` thì máy local
vẫn là 5.000. **Sửa:** liệt kê ba chỗ.

### RA-26 — Thứ tự milestone

- §3 dòng 50 "M1 và M3 độc lập", nhưng DA3 ghi trade-off "cần chặn tạo tài khoản hàng loạt (Turnstile)". Vậy Free có AI không nên vào `dev` trước M1.
- B5-7 (M2) và `aiCycle` trong `refund` (M3) cùng sửa `usage-ledger.service.ts:140-160`.
- **Sửa:** ghi M3 sau M1, và B5-7 xong trước M3.

### RA-27 — Chi tiết client siteverify

- "timeout ngắn" (dòng 77) nên ghi số, vd 5 s.
- Không log token, theo luật log của SR: không log token.
- `TURNSTILE_SECRET_KEY` dùng `nonEmpty`, không dùng `secretSchema`.
- Ô setting `free_ai_*` có gợi ý `zeroMeaning` ("0 = gói Miễn phí không có AI"), theo mẫu `vi.json:1996-2012` của admin.

---

## Đã kiểm và thấy đúng

- **Thứ tự trong Nest:** guard chạy trước pipe; guard chạy theo thứ tự mảng metadata (`@nestjs/core` 12.1.2: `router-execution-context.js:41-50`,
  `guards-consumer.js:11`, `extend-metadata.util.js`). `AuthGuard` global là `APP_GUARD` (`identity.module.ts:43`); các route auth là `@Public()`.
- **Body và CORS:** body JSON được parse trước guard (`app.setup.ts:15-26`). CORS chỉ cho bốn header (`:29-34`), nên gửi token trong body là đúng.
- **Route gửi mail:** chỉ `register`, `otp` và `login` (tài khoản chưa xác minh, `auth.service.ts:151-153`) gửi mail mà không cần đăng nhập. Thư báo khóa
  của `verify-email` và `password/reset` chỉ có khi đã có mã còn hạn (`otp.service.ts:126-151`), tức đã qua `otp` có Turnstile.
- **`verify-email`:** trả `invalid-otp` giống hệt nhau khi sai mật khẩu và khi sai mã (`auth.service.ts:160-194`). Không lộ mật khẩu đúng hay sai qua nội
  dung response. Còn chênh thời gian một transaction ngắn; chấp nhận được, ghi để biết.
- **Đồ giả và Express:** cơ chế chặn đồ giả khi production có thật (`app-config.ts:261-275`). Express 5.2.1 bật `X-Powered-By` mặc định
  (`express/lib/application.js:94, 160`). `helmet` chưa có trong lockfile.
- **`helmet`:** không đụng tới CORS, cookie hay body raw của webhook. `Cross-Origin-Resource-Policy` chỉ chặn request `no-cors` (MDN), nên không ảnh
  hưởng `fetch` có CORS, kể cả admin mở bằng `127.0.0.1`. Luồng Google không dùng popup hay `window.opener` (grep), nên COOP mặc định vô hại. Trang Google
  giả (`fake-google.controller.ts:47-51`) vẫn gửi form được dưới `default-src 'none'`, vì `form-action` không lấy giá trị từ `default-src`.
- **CSP và hạ tầng tĩnh:** CSP web thiếu `frame-src` và host Turnstile (`csp.ts:19-30`); header chỉ đặt ở production (`next.config.ts:28-31`). Admin chỉ
  có `assets`, không có Worker, không có `_headers` (`wrangler.jsonc`). Nguồn ngoài của admin chỉ là Google Fonts (`index.html:8-10`); admin không có
  `<img>`.
- **Lượt AI:** đúng bốn chỗ tính cycle (`entitlements.service.ts:134, 245`; `usage-ledger.service.ts:148-150, 182`). Planner đọc từ snapshot
  (`ai-session-planner.service.ts:88-93`). Lượt giữ chỗ được đếm bất kể cycle (`usage.queries.ts:14-21`).
  `getProfile(userId, tx)` có sẵn (`identity.service.ts:81`), và `EntitlementsModule` đã import `IdentityModule` (`entitlements.module.ts:33`).
  `zonedMidnight` xử lý DST (`local-date.ts:44-55`). Free AI = 0 ghi cứng một chỗ (`plan-numbers.ts:7`). Limits grant chỉ neo anchor cho Free
  (`plan-rules.ts:112-113`).
- **Settings:** năm chỗ phải sửa và test "49 key" (`settings-api.test.ts:15-18`) đúng như code facts.
- **Trial:** trial chỉ bắt đầu từ `subscription_started` có `trial_ends_at`. `trial_eligible` tính ở `entitlements.service.ts:181`.
- **Tài liệu Turnstile:** token sống 300 s, dùng một lần; `refresh-expired` mặc định `auto`; sitekey test chạy được trên `localhost`; `internal-error`
  thì nên thử lại với cùng `idempotency_key`.
- **Code facts:** các điểm chính đều khớp code. Riêng việc `SourcesRepository` bỏ nguồn đã kết thúc thì code facts không ghi; đó là gốc của RA-2.
