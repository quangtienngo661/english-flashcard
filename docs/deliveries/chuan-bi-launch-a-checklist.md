# Checklist tự kiểm đợt chuẩn bị launch A (05/11/2026)

Bản gọn để chủ dự án tự kiểm lại những gì đợt A đã làm, theo ba milestone: **M1** Turnstile và security header, **M2** đợt sửa sau review, **M3** lượt AI cho gói Miễn phí và tắt trial.
Chi tiết kỹ thuật và số liệu đã đo: [`chuan-bi-launch-a.md`](chuan-bi-launch-a.md) (as-built) và [`chuan-bi-launch-a-smoke-output.txt`](chuan-bi-launch-a-smoke-output.txt) (output các smoke).
Design: [`../superpowers/specs/2026-11-04-chuan-bi-launch-a-design.md`](../superpowers/specs/2026-11-04-chuan-bi-launch-a-design.md). Mẫu của file này: [`dot-cai-thien-a-checklist.md`](dot-cai-thien-a-checklist.md).

Mỗi dòng là một ô để tích, gồm ba phần: **Thấy** (điều cần thấy, viết bằng lời thường), **Kiểm** (lệnh chạy, trang mở, nút bấm, câu SQL) và **Đúng là** (kết quả đúng trông ra sao).
Nhãn cuối dòng:

- **[local]** kiểm được trên máy bạn, với API chạy `TURNSTILE_MODE=fake`;
- **[lệnh]** kiểm bằng một lệnh, không cần mở trang (test tự động hoặc câu lệnh một dòng);
- **[sau deploy]** chỉ kiểm được khi đã có khóa Turnstile thật, tên miền thật và Cloudflare đứng trước. Các mục này cũng nằm trong [`deploy-checklist.md`](deploy-checklist.md).

Ví dụ trong file dùng tên **Lan**, một học viên mới đăng ký (gói Miễn phí).

## 0. Chuẩn bị (một lần)

- [ ] **Thấy:** máy chạy đúng mã `dev` mới nhất (có PR #211, #212, #213, #215, #216).
  **Kiểm:** `git switch dev`, `git pull`, rồi ở thư mục gốc `pnpm bootstrap` (dựng API, worker, admin và web học trong Docker; mỗi lần `up` mất khoảng 1–2 phút trước khi API nghe cổng, xem [`docker-bootstrap.md`](docker-bootstrap.md)).
  **Đúng là:** `pnpm bootstrap status` báo các container healthy; mở được admin http://localhost:5173, web học http://localhost:3001/vi/app, API http://localhost:3000/v1/health, Mailpit http://localhost:8025 (mọi email, ví dụ mã 6 số khi đăng ký). **[local]**
- [ ] **Thấy:** dữ liệu mẫu có sẵn.
  **Kiểm:** `pnpm bootstrap seed`; ghi lại email admin và email người học Pro in ra.
  **Đúng là:** có nội dung mẫu, một admin và một người học Pro (tài khoản thử, mật khẩu cố định); các model AI giả được bật cho AI. **[local]**
- [ ] **Thấy:** API đang ở chế độ Turnstile giả.
  **Kiểm:** `docker-compose.yml` mặc định `TURNSTILE_MODE=fake`; không đặt `TURNSTILE_SITE_KEY`, nên form web và admin không vẽ khung Cloudflare nào.
  **Đúng là:** mọi form chạy như trước đây, không có hộp "Xác minh bạn là người" nào. (Khóa thật chỉ có sau deploy: mục 1B.) **[local]**
- [ ] **Thấy:** các file `.env` đã có sẵn từ trước vẫn giữ giá trị cũ.
  **Kiểm:** `findstr EXPORT_MAX_ROWS .env apps\api\.env`; mở `.env` của API xem có dòng `TURNSTILE_MODE`.
  **Đúng là:** `EXPORT_MAX_ROWS=10000` (nếu còn `5000`, sửa tay: file có sẵn không bao giờ bị ghi đè) và có `TURNSTILE_MODE=fake`; thiếu dòng này thì API, worker và các CLI (`admin:grant`, `maintenance:run`…) không khởi động. **[local]**

## 1. M1 — Turnstile và security header (PR [#211](https://github.com/quangtienngo661/english-flashcard/pull/211))

### 1A. Chạy được trên máy

- [ ] **M1-1 · Đăng ký vẫn chạy.** **Thấy:** Lan đăng ký bằng email mới, không vướng gì thêm.
  **Kiểm:** http://localhost:3001/vi/app/register, điền form, gửi; lấy mã 6 số ở Mailpit, nhập.
  **Đúng là:** sang trang nhập mã, nhập mã xong vào app; nút gửi không bị tắt kéo dài (widget giả cấp token ngay). **[local]**
- [ ] **M1-2 · Đăng nhập, quên mật khẩu, gửi lại mã vẫn chạy.** **Thấy:** Lan đăng xuất rồi đăng nhập lại; bấm "Quên mật khẩu"; ở trang nhập mã bấm "Gửi lại mã".
  **Kiểm:** các trang `/vi/app/login`, `/vi/app/forgot-password`, `/vi/app/verify-email`.
  **Đúng là:** đăng nhập vào được; mật khẩu sai báo "Email hoặc mật khẩu chưa đúng." rồi **sửa lại và bấm tiếp được ngay** (token mới sau mỗi lần trả lời); mã mới tới Mailpit. **[local]**
- [ ] **M1-3 · Admin đăng nhập và quên mật khẩu.** **Thấy:** admin vào được trang quản trị; "Quên mật khẩu" gửi được mã và mã được nhập ở bước hai, bấm "Gửi lại mã" ở bước hai cũng chạy.
  **Kiểm:** http://localhost:5173, đăng nhập bằng admin của `pnpm bootstrap seed`; rồi đăng xuất và thử quên mật khẩu.
  **Đúng là:** như trước đây. **[local]**
- [ ] **M1-4 · API từ chối request thiếu hoặc sai token.** **Thấy:** một con bot gọi thẳng API không kèm token thì bị chặn.
  **Kiểm** (PowerShell, ba lệnh, email nào cũng được):
  ```powershell
  curl.exe -s -X POST http://localhost:3000/v1/auth/login -H "content-type: application/json" -d "{\"email\":\"bot@example.com\",\"password\":\"x\",\"client\":\"web\"}"
  curl.exe -s -X POST http://localhost:3000/v1/auth/login -H "content-type: application/json" -d "{\"email\":\"bot@example.com\",\"password\":\"x\",\"client\":\"web\",\"turnstile_token\":\"fake-turnstile-fail\"}"
  curl.exe -s -X POST http://localhost:3000/v1/auth/login -H "content-type: application/json" -d "{\"email\":\"bot@example.com\",\"password\":\"x\",\"client\":\"web\",\"turnstile_token\":\"fake-turnstile-token\"}"
  ```
  **Đúng là:** lệnh 1 trả `400` với `type` kết thúc `validation-failed`; lệnh 2 trả `400` `captcha-failed`; lệnh 3 qua cổng chống bot và trả `401` (sai mật khẩu). Gọi `register` kiểu lệnh 1 và 2 thì Mailpit **không** có thư mới. **[local]**
- [ ] **M1-5 · Header của API.** **Kiểm:** `curl.exe -I http://localhost:3000/v1/health`.
  **Đúng là:** có `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Content-Security-Policy: default-src 'none';frame-ancestors 'none'` (helmet viết không có dấu cách sau `;`), `Cross-Origin-Resource-Policy: same-site`; **không** có `X-Powered-By` và **không** có `Strict-Transport-Security` (HSTS để Cloudflare lo). **[local]**
- [ ] **M1-6 · Header của web.** **Kiểm:** `curl.exe -I http://localhost:3001/vi`.
  **Đúng là:** có `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` và `Content-Security-Policy` có nhắc `challenges.cloudflare.com`. Máy local chạy `next start` trong Docker nên đây chỉ là dấu hiệu sớm; bản chính thức kiểm ở M1-9. **[local]**
- [ ] **M1-7 · API từ chối khởi động khi cấu hình sai.** **Thấy:** quên đặt biến thì API không chạy "nửa vời".
  **Kiểm** (PowerShell, ở `apps/api`, sau `pnpm build`; biến trong shell thắng file `.env`):
  ```powershell
  $env:TURNSTILE_MODE='real'; node dist/main.js           # thiếu khóa bí mật và danh sách hostname
  $env:TURNSTILE_MODE='fake'; $env:BILLING_PRODUCTION='true'; node dist/main.js
  Remove-Item Env:TURNSTILE_MODE, Env:BILLING_PRODUCTION
  ```
  **Đúng là:** cả hai lệnh dừng ngay với "Missing or invalid configuration variables: …": lệnh đầu nêu `TURNSTILE_SECRET_KEY, TURNSTILE_ALLOWED_HOSTNAMES`; lệnh hai nêu `BILLING_PRODUCTION` cùng các đồ giả đang bật (`BILLING_FAKE_ENABLED`, `AI_FAKE_ENABLED`, `GOOGLE_FAKE_ENABLED`, `TURNSTILE_MODE`). Bỏ hẳn `TURNSTILE_MODE` cũng bị từ chối. **[lệnh]**
- [ ] **M1-8 · Test tự động của M1.** **Kiểm:** `cd apps/api; pnpm exec vitest run src/identity/turnstile src/common/config` và `cd apps/web; pnpm exec vitest run src/features/learner/auth`.
  **Đúng là:** tất cả pass. **[lệnh]**

### 1B. Chỉ kiểm được sau deploy

- [ ] **M1-9 · Header thật.** **Kiểm:** `curl -I https://admin.wordmet.com/` và một đường dẫn sâu (ví dụ `/uploads`); `curl -I https://wordmet.com/vi` và một file `/_next/static/…`; `curl -I` vào API.
  **Đúng là:** admin có bốn header của `apps/admin/public/_headers` cả ở trang gốc lẫn đường dẫn sâu (Cloudflare Assets áp `_headers` cho cả trang trả về từ SPA fallback: một `ASSUMPTION` của design §4.4); web có ba header + CSP; API có HSTS. **[sau deploy]**
- [ ] **M1-10 · Widget thật hiện ra và cho qua.** **Thấy:** Lan mở `wordmet.com/vi/app/register`, thấy khung Cloudflare, tick xong gửi được; admin `admin.wordmet.com` cũng vậy.
  **Kiểm:** làm đúng 3 bước "việc cần làm lúc deploy" của Turnstile ở [`deploy-checklist.md`](deploy-checklist.md) (một widget cho ba hostname; site key vào build web và admin; secret và `TURNSTILE_ALLOWED_HOSTNAMES` vào API).
  **Đúng là:** đăng ký, đăng nhập, quên mật khẩu, gửi lại mã đều qua; nút gửi tắt tới khi có token; sai mật khẩu rồi sửa thì bấm lại được; Console không có lỗi CSP. Build production thiếu site key phải **fail** và nêu tên biến. **[sau deploy]**
- [ ] **M1-11 · Log không báo cấu hình sai.** **Kiểm:** sau vài lần đăng nhập, tìm trong log API chuỗi `turnstile_misconfigured` và `turnstile_hostname_mismatch`.
  **Đúng là:** không có dòng nào (có là secret đặt sai hoặc hostname thiếu). **[sau deploy]**

## 2. M2 — Đợt sửa sau review (PR [#212](https://github.com/quangtienngo661/english-flashcard/pull/212) tài liệu, [#213](https://github.com/quangtienngo661/english-flashcard/pull/213) code)

- [ ] **M2-1 · Xuất "Từ chưa có nghĩa" (không bị cắt ở 5.000).** **Thấy:** admin muốn lấy mọi từ chưa có nghĩa để soạn nghĩa.
  **Kiểm:** admin → **Xuất CSV** → tích "Từ chưa có nghĩa" → xuất; đối chiếu số dòng với trang **Từ** lọc "Chưa có nghĩa".
  **Đúng là:** tên file `entries-without-senses-<ngày>.csv`; số dòng dữ liệu bằng số từ chưa có nghĩa, kể cả khi hơn 5.000 (với CEFR-J thật khoảng 7.799). Các ô lọc khác vẫn sửa được nhưng bị bỏ qua khi ô này được tích (đã biết, chưa sửa). **[local]**
- [ ] **M2-2 · "Đặt mật khẩu" của tài khoản chỉ đăng nhập bằng Google.** **Thấy:** một học viên vào bằng Google (bản giả) muốn đặt mật khẩu; trước đây bị đá về trang chủ.
  **Kiểm:** đăng nhập bằng Google giả theo [`buoc-8-test-flow.md`](buoc-8-test-flow.md); **Cài đặt** → "Đặt mật khẩu".
  **Đúng là:** form hiện ra, nhận mã gửi tới Mailpit, đặt được mật khẩu; đăng xuất rồi đăng nhập lại bằng email và mật khẩu mới được. **[local]** (Google thật: mục 4.)
- [ ] **M2-3 · Các sửa không nhìn thấy trên giao diện, chỉ có test.** **Thấy:** hoàn lượt AI chỉ khi có lượt đã dùng thật trong chu kỳ (B5-7); chu kỳ AI của gói gia hạn tính từ lúc event xảy ra (B5-5); thêm từ riêng và xóa mục học dưới khóa của người học (B3-5); job không chạy quá số lần (B2-6); job dọn bảng OTP và ngân sách mail cũ (B1-5); admin bỏ ký tự lạ trong ô tìm kiếm và đếm ngược khi bị rate limit khóa tài khoản.
  **Kiểm:** `cd apps/api; pnpm exec vitest run src/entitlements src/learning src/content-pipeline src/identity/maintenance src/common` và `cd apps/admin; pnpm exec vitest run src/features/users src/features/export`.
  **Đúng là:** pass (mỗi lỗi có test đỏ trước, fix sau trong lịch sử commit của #213: tìm `git log --oneline` các cặp `test(api): …` rồi `fix(api): …`). **[lệnh]**
- [ ] **M2-4 · Script `test:e2e` chết đã bỏ.** **Kiểm:** `pnpm run` ở thư mục gốc.
  **Đúng là:** danh sách script không có `test:e2e` (e2e nằm ở `apps/web` và `apps/admin`). **[lệnh]**
- [ ] **M2-5 · Đo tải (tùy chọn, cần Docker, khoảng 2,5 phút).** **Kiểm:** `cd apps/api; pnpm test:scale`.
  **Đúng là:** 3/3 pass; mở phiên "Ôn tất cả" với 100 nhóm × 2.000 mục cỡ 3 giây; tra từ không chậm đi khi có 300.000 từ riêng của người khác. **[lệnh]**
- [ ] **M2-6 · Link trong tài liệu không hỏng.** **Thấy:** các tài liệu bị sửa ở #212 trỏ đúng nhau.
  **Kiểm:** mở `deploy-checklist.md` mục "Chặn đồ giả ở production (đợt A, R3)" và vài link trong đó.
  **Đúng là:** mở được, không 404. **[local]**

## 3. M3 — Lượt AI cho gói Miễn phí, tắt trial (PR [#215](https://github.com/quangtienngo661/english-flashcard/pull/215), [#216](https://github.com/quangtienngo661/english-flashcard/pull/216))

Chuẩn bị riêng: đăng ký **Lan** (email mới, xác nhận bằng mã ở Mailpit) và chọn tiếng Việt. Lan là gói **Miễn phí**. Người học Pro của `pnpm bootstrap seed` dùng để đối chiếu. Admin vào http://localhost:5173.

- [ ] **M3-1 · Trang Gói học nói Lan có AI.** **Thấy:** thẻ gói Miễn phí không còn nói "cần gói Pro" cho AI.
  **Kiểm:** web học → **Gói học** (`/vi/app/plans`).
  **Đúng là:** thẻ Miễn phí có dòng "15 câu AI và 5 lượt tra AI mỗi tháng" (dấu tích); bấm "So sánh chi tiết các gói": hàng "Câu AI mới mỗi tháng" ghi 15 / 300 và "Lượt tra AI mỗi tháng" ghi 5 / 100 (không còn dấu gạch ở cột Miễn phí); không chữ "Dùng thử" nào. **[local]**
- [ ] **M3-2 · Cài đặt cho Lan thấy mức dùng AI.** **Kiểm:** **Cài đặt** → mục mức sử dụng.
  **Đúng là:** "Lượt câu AI: còn 15/15" và "Lượt tra AI: còn 5/5", kèm "mới vào 1/<tháng sau>" (ngày đầu tháng sau theo múi giờ của Lan, ví dụ tháng 11 thì "1/12"); không có chữ "Cần gói Pro". **[local]**
- [ ] **M3-3 · Phiên luyện có câu AI.** **Thấy:** Lan bật kiểu câu có AI và luyện.
  **Kiểm:** **Luyện tập** → "Tùy chỉnh: Luyện tất cả" → bật công tắc "Kiểu câu có AI" → để 12 câu → Bắt đầu (cần nhóm có từ; `pnpm bootstrap seed` có sẵn nội dung mẫu).
  **Đúng là:** công tắc bật được, **không có chip "Pro"** cạnh nó; hiện ba kiểu câu AI và dòng "Phiên này dùng tối đa N lượt câu AI · còn 15"; phiên mở và có câu do AI soạn (câu đó có nhãn AI). Sau khi làm xong, Cài đặt cho thấy số lượt còn giảm đúng số câu AI đã dùng. **[local]**
- [ ] **M3-4 · Tra bằng AI.** **Thấy:** từ Lan tra không có trong từ điển.
  **Kiểm:** **Thêm từ** → gõ một từ lạ như `rizz` → "Tra bằng AI".
  **Đúng là:** nút bấm được, dưới nút ghi "còn 5 lượt tra AI", **không có** chip "Pro" hay "Dùng thử"; sau mỗi lần tra số lượt còn giảm 1. Tra tới lần thứ 6: báo "Hết lượt tra AI. Lượt tra AI mới vào 1/<tháng sau>." **[local]**
- [ ] **M3-5 · "Sang tháng" thì có lại lượt.** **Thấy:** hết tháng, Lan có lại đủ lượt mà không ai làm gì.
  **Kiểm:** không đổi giờ máy (API dùng giờ thật; đổi giờ Windows làm lệch Docker, JWT và cookie). Thay vào đó lùi dữ liệu một tháng. Lấy id của Lan: `docker compose -p english-learning exec -T postgres psql -U dev -d english_learning -tA -c "SELECT id FROM users WHERE email = '<email của Lan>'"`; rồi thay `<id của Lan>` ở lệnh dưới:
  ```powershell
  docker compose -p english-learning exec -T postgres psql -U dev -d english_learning -c "UPDATE usage_records SET confirmed_at = confirmed_at - interval '1 month' WHERE user_id = '<id của Lan>' AND pool IN ('ai_practice', 'ai_lookup') AND kind = 'use' AND status = 'confirmed'"
  ```
  **Đúng là:** tải lại Cài đặt của Lan: "còn 15/15" và "còn 5/5" trở lại. **[local]**
- [ ] **M3-6 · Pro rồi về Free giữa tháng: lượt dùng lúc Pro không tính vào Free.** **Thấy:** Lan được tặng Pro, dùng nhiều câu AI, hết Pro thì vẫn có đủ 15 câu Free.
  **Kiểm:** admin → **Cấp gói và lượt** → cấp gói Pro cho Lan (đến một ngày xa) → Lan làm một phiên có câu AI (dùng vài chục lượt nếu được, hoặc ít nhất 16 lượt tra/câu bằng cách lặp lại) → admin thu hồi lần cấp đó.
  **Đúng là:** trong lúc Pro, Cài đặt ghi hạn mức 300 và 100; sau khi thu hồi, Cài đặt của Lan ghi **còn 15/15** (không phải "hết" dù trước đó đã dùng hơn 15) và mốc làm mới vẫn là đầu tháng sau. Smoke làm đúng kịch bản này tự động: `pnpm smoke:buoc-5` bước "LA3#7" và "LA3#6". **[local]**
- [ ] **M3-7 · Admin chỉnh được ba số.** **Thấy:** admin đổi hạn mức Free mà không cần deploy.
  **Kiểm:** admin → **Cài đặt hệ thống** → tab **Gói và lượt**.
  **Đúng là:** có ba ô mới: "Lượt câu AI mỗi tháng, Miễn phí" (15), "Lượt tra AI mỗi tháng, Miễn phí" (5), "Trần lượt AI mỗi ngày, gói Miễn phí" (500), mỗi ô ghi `khóa · khoảng · mặc định`, ô lượt tháng có ghi chú "Landing ghi 15 và 5; đổi số ở đây thì sửa chữ landing"; nhãn phiên luyện của Pro ghi "gói Pro" (không còn "và Dùng thử"). Đặt 5.001 vào một ô lượt tháng: bị từ chối. **[local]**
- [ ] **M3-8 · Đặt Free về 0 thì mọi thứ như cũ.** **Kiểm:** admin đặt cả hai ô lượt tháng của Free về 0, lưu; mở web của Lan.
  **Đúng là:** thẻ Miễn phí ghi "Câu AI và tra bằng AI: cần gói Pro"; bảng so sánh Free là dấu gạch; công tắc "Kiểu câu có AI" mờ và bấm vào ra "Dành cho gói Pro. Gói Pro chưa mở bán."; Cài đặt ghi "Cần gói Pro". Đặt lại 15 và 5 thì AI trở lại. **[local]**
- [ ] **M3-9 · Free có trần riêng mỗi ngày, Pro không bị ảnh hưởng.** **Thấy:** nhiều tài khoản Free dùng chung một trần; người trả tiền vẫn dùng được.
  **Kiểm:** admin đặt "Trần lượt AI mỗi ngày, gói Miễn phí" = 1. Lan tra một từ bằng AI (lượt thứ nhất). Đăng ký thêm một học viên Free thứ hai (Bình) và tra một từ. Rồi đăng nhập người học Pro của seed và tra một từ.
  **Đúng là:** Lan qua; Bình nhận dòng chung "Hệ thống đang gặp lỗi." (AI tạm dừng tới nửa đêm giờ Việt Nam; người học không được báo là do "trần"); người học Pro vẫn tra được. Đặt ô này = 0: mọi người Free bị chặn như vậy ngay từ đầu. Nhớ đặt lại 500. **[local]**
- [ ] **M3-10 · Báo lỗi một câu AI của Free thì được hoàn lượt.** **Thấy:** Lan gặp một câu AI sai và báo lỗi; admin xác nhận.
  **Kiểm:** Lan làm phiên có câu AI, bấm **Báo lỗi** trên một câu AI, chọn lý do có trả lượt; admin → **Báo lỗi** → mở báo lỗi đó → chọn "Đã xác nhận lỗi".
  **Đúng là:** báo lỗi ghi "Đã trả lại 1 lượt câu AI" (ở tab thống kê của AI là "Đã hoàn lượt"); Cài đặt của Lan được cộng lại 1 lượt câu AI. (Câu dùng lúc còn Pro mà báo sau khi đã về Free thì **không** hoàn: đúng thiết kế.) **[local]**
- [ ] **M3-11 · Không còn trial.** **Thấy:** không nơi nào mời dùng thử.
  **Kiểm:** trang chủ http://localhost:3001/vi (bảng gói, câu hỏi thường gặp), **Gói học**, trang giao dịch trống (Cài đặt → Lịch sử giao dịch với tài khoản mới); trong DevTools xem `GET /v1/me/entitlements`.
  **Đúng là:** không có dòng "Dùng thử 7 ngày, cần thẻ thanh toán"; trang giao dịch trống nói "Khi bạn mua gói Pro hoặc được đội Wordmet cấp gói…"; `trial_eligible` là `false`. **[local]**
- [ ] **M3-12 · Landing nói đúng về AI của Free.** **Kiểm:** http://localhost:3001/vi, cuộn tới bảng gói và phần "Luyện tập với AI", "Tra cứu từ vựng".
  **Đúng là:** hai dòng "Câu luyện tập AI" và "Tra cứu bằng AI" có ô Miễn phí ghi **"15/tháng"** và **"5/tháng"** (không phải dấu tích hay dấu gạch); câu hỏi "Wordmet có miễn phí không?" nhắc có lượt AI mỗi tháng; không chỗ nào còn "Pro: tra cứu bằng AI" hay "Gói Pro có thêm câu do AI biên soạn". Hai số này viết cứng, nên đổi setting thì phải sửa chữ landing. **[local]**
- [ ] **M3-13 · Bản nháp pháp lý theo gói mới.** **Kiểm:** trên nhánh `docs/web-launch-research` (worktree `web-launch-docs`, chưa push) đọc `docs/preparation/legal-drafts/chinh-sach-bao-mat.draft.md` mục 3 và 4, `dieu-khoan-su-dung.draft.md` mục 4 và 9 (và hai bản tiếng Anh).
  **Đúng là:** AI có ở gói Miễn phí (lượt giới hạn mỗi tháng) và gói Pro; không còn email nhắc hết dùng thử; không còn "hoặc sử dụng gói Miễn phí" ở cách không dùng AI; không ghi con số. Mục 5 "Dùng thử" của Điều khoản còn trong bản nháp (đợt B viết lại). **[lệnh]**
- [ ] **M3-14 · Smoke chứng minh phần không nhìn thấy.** **Kiểm:** các smoke cần API và worker khởi động đúng cách trên DB trống; xem hướng dẫn đầu mỗi file `apps/api/scripts/smoke-buoc-5.mjs`, `smoke-buoc-7.mjs`; hoặc đọc output đã lưu ở [`chuan-bi-launch-a-smoke-output.txt`](chuan-bi-launch-a-smoke-output.txt).
  **Đúng là:** `smoke:buoc-5` (hai chế độ fetchState), 4, 2, 6, 0-3-fixes, 8, 7 và `learner:setup --plan trial` đều kết thúc `exit 0`. Riêng `smoke:nhom-b` kết thúc `exit 1` ở bước M2.9 vì lỗi có từ trước (xem mục 4). **[lệnh]**

## 4. Chưa kiểm được

| Việc | Vì sao chưa |
|---|---|
| Form web và admin trên **trình duyệt thật** với API ở `TURNSTILE_MODE=real` và khóa Cloudflare thật (đăng ký, đăng nhập sai rồi đúng, quên mật khẩu, gửi lại mã) | Cần khóa và hostname thật (mục M1-10). Mới kiểm bằng unit test, e2e có widget giả, và `curl` tới siteverify thật của Cloudflare với khóa test |
| LA1E18: token của widget giả gửi tới API `real` bị từ chối | Khóa test `1x…` cho qua mọi token, `2x…` trượt mọi token nên không phân biệt được; chỉ có unit test |
| Header qua Cloudflare (admin `_headers` cho cả trang trả về từ SPA fallback, web OpenNext, HSTS của API) | Chưa deploy (M1-9) |
| Đăng nhập **Google thật** và "Đặt mật khẩu" của tài khoản Google thật | Cần chủ dự án có cấu hình Google thật (Q-A10); mới kiểm với Google giả |
| Giao diện M3 (thẻ gói, bảng so sánh, công tắc AI, landing) **bấm tay trên trình duyệt thật** | Phiên làm đợt A chỉ có unit test và e2e (CI xanh, API giả); các dòng M3-1…M3-12 là để bạn bấm lần đầu |
| **AI thật** (OpenAI/Anthropic): chất lượng câu AI, tỷ lệ bị rule loại, chi phí thật trên Free | Mọi lượt AI của đợt này là provider giả (D3). Lần gọi thật 28/10 chưa có as-built |
| Chứng minh test chạy đua có răng (B5-8): bỏ `lockPool`/`lockAiDaily` trên nhánh nháp, `smoke:buoc-5` phải đỏ | Chưa làm trong đợt A |
| Đo B7-5 (mở phiên với 50 từ có dạng AI) | Không có test scale cho nó |
| `docs/audit/2026-11-04-dev-test-checklist.md` | Còn nằm trên nhánh `docs/dev-test-checklist`, chưa vào `dev`; các dòng cần thêm khi nó vào `dev` ghi ở cuối mục M3 của as-built |
| **`smoke:nhom-b` hỏng ở bước M2.9** (và 18 bước phụ thuộc) | Lỗi **có từ trước đợt A**: smoke tự giữ khóa dòng 8 giây còn giao dịch publish chỉ chờ 5 giây (Prisma mặc định) nên cả hai request publish báo `P2028`. Khi rút thời gian giữ khóa còn 4 giây (bản cục bộ, không commit) cả 89 bước pass. Đề xuất sửa riêng, chưa làm |
| Hoãn có chủ ý: khai báo kiểu dịch cho admin (UA-4), ô ngày theo ngôn ngữ của app | Việc lớn hơn một milestone; đã ghi vào `IMPROVEMENT_PLAN` |
| Điểm Minor còn mở | Trial bị từ chối rồi trả tiền và kết thúc sớm không tính là nguồn Pro (trial đang tắt); một lượt giữ chỗ của người Free chạy bốn câu đếm dưới khóa chung; hai chỗ nhỏ khác của M2 ở as-built |
| Quyết định cho chủ dự án | `ended_at` của event lấy theo thời điểm event xảy ra (`occurredAt`): event trễ vài ngày làm lượt dùng lúc còn Pro bị tính vào 15 lượt Free. Đổi sang `max(occurredAt, updated_at)` là đổi design |

## 5. Liên kết

- PR: [#211](https://github.com/quangtienngo661/english-flashcard/pull/211) (M1), [#212](https://github.com/quangtienngo661/english-flashcard/pull/212) (M2 tài liệu), [#213](https://github.com/quangtienngo661/english-flashcard/pull/213) (M2 code), [#215](https://github.com/quangtienngo661/english-flashcard/pull/215) (M3), [#216](https://github.com/quangtienngo661/english-flashcard/pull/216) (cập nhật trạng thái sau M3).
- As-built, plan, decisions: [`chuan-bi-launch-a.md`](chuan-bi-launch-a.md), [plan](../superpowers/plans/2026-11-04-chuan-bi-launch-a.md), [design](../superpowers/specs/2026-11-04-chuan-bi-launch-a-design.md).
- Việc phải làm lúc deploy: [`deploy-checklist.md`](deploy-checklist.md) (mục "Chống bot và tấn công", "Chặn đồ giả ở production" và "Lượt AI cho Free và trial đã tắt").
