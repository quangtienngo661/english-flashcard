# Chuẩn bị launch đợt A — plan tóm tắt (04/11/2026)

Plan đầy đủ: [`../superpowers/plans/2026-11-04-chuan-bi-launch-a.md`](../superpowers/plans/2026-11-04-chuan-bi-launch-a.md). Design:
[`../superpowers/specs/2026-11-04-chuan-bi-launch-a-design.md`](../superpowers/specs/2026-11-04-chuan-bi-launch-a-design.md). Bản này là ảnh chụp lúc duyệt plan; as-built
nối tiếp bên dưới khi làm xong.

## M1 — Turnstile và security header

1. Thêm cấu hình Turnstile cho API (thật, giả, tắt; bắt buộc khai báo) và giới hạn số lần kiểm captcha theo IP.
2. Viết client gọi Cloudflare kiểm token, bản thật và bản giả; thử lại một lần, tách "bị từ chối" với "không gọi được".
3. Bắt token Turnstile ở đăng ký, đăng nhập, xin mã; Cloudflare lỗi thì đăng nhập vẫn qua, đăng ký và xin mã trả 503.
4. Cho các smoke và e2e admin gửi token giả.
5. Thêm security header cho API.
6. Thêm widget Turnstile vào đăng ký, đăng nhập, quên mật khẩu, gửi lại mã của web; lấy token mới sau mỗi lần gửi.
7. Mở CSP cho Turnstile và thêm ba header của web; build production fail khi thiếu site key; e2e trang đăng nhập với widget thật.
8. Thêm widget vào đăng nhập và quên mật khẩu của admin; header tĩnh cho admin; build fail khi thiếu site key.
9. Cập nhật checklist deploy, chạy tay với khóa test của Cloudflare, mở PR M1.

## M2 — Đợt sửa sau review

10. PR tài liệu: các mục review chỉ cần sửa tài liệu (checklist production, sự thật pháp lý, design cũ, việc để sau).
11. Bỏ script test chết, sửa nhãn, bắt key dịch sai lúc typecheck ở admin, bỏ assert theo class ở ba test web.
12. Sửa lỗi hoàn lượt AI khi không có lượt dùng đã xác nhận trong chu kỳ (test đỏ trước).
13. Sửa mốc chu kỳ AI khi subscription gia hạn: lấy thời điểm sớm hơn (test đỏ trước).
14. Đọc nghĩa hiển thị và xóa mục học dưới khóa của người học (test đỏ trước).
15. Giới hạn số lần chạy lại job theo số đã lưu trong DB (test đỏ trước).
16. Dọn bảng cửa sổ OTP và ngân sách mail cũ.
17. Gộp hàm ghi dòng xuất dùng chung cho hai controller.
18. Admin: lọc ký tự lạ ở ô tìm, đếm ngược khi bị khóa đăng nhập, ngày theo ngôn ngữ, xuất từ chưa có nghĩa, giới hạn xuất 10.000 dòng.
19. E2e "Đặt mật khẩu" cho tài khoản chỉ có Google; mở PR code của M2.
20. Chạy tay checklist dev, các lượt kiểm còn treo và đo tải; ghi kết quả.

## M3 — Lượt AI cho Free, tắt trial

21. Hàm tính chu kỳ AI theo tháng dương lịch cho gói Free.
22. Ghi lúc một nguồn Pro kết thúc và gói của mỗi lượt dùng (migration, hàm tính thời điểm kết thúc).
23. Ghi thời điểm kết thúc ở mọi chỗ đổi trạng thái subscription; tải thêm các nguồn đã kết thúc trong tháng.
24. Ba setting mới: lượt câu AI, lượt tra AI mỗi tháng cho Free, trần AI mỗi ngày riêng của Free.
25. Sổ lượt, snapshot, hoàn lượt và trần Free dùng chu kỳ mới.
26. Tắt trial cho người mới; sửa ba script đang dựa vào trial.
27. Web và landing hiện lượt AI của Free, bỏ câu trial.
28. Smoke cho lượt AI của Free (Pro về Free hai cách, hết lượt, trần ngày).
29. Sửa bản nháp Chính sách bảo mật và Điều khoản theo lượt AI của Free và việc tắt trial.
30. Chạy hết smoke trên DB mới, chạy tay, viết as-built.

---

# Chuẩn bị launch đợt A — as-built

Ghi theo từng milestone khi xong.

## M1 — Turnstile và security header (04/11/2026)

Nhánh `feat/launch-a-m1-turnstile`, một PR vào `dev` (mang theo 9 commit tài liệu của design, decisions, review và plan).

**Đã làm (Task 1–9):**
- API: `TURNSTILE_MODE` (`real | fake | off`, không có mặc định; `real` cần `TURNSTILE_SECRET_KEY` và `TURNSTILE_ALLOWED_HOSTNAMES`; `fake` hoặc `off` cùng `BILLING_PRODUCTION=true` thì từ chối khởi động), luật `auth.captcha.ip` 60 lần/60 giây chỉ ở `real`.
- `TurnstileGuard` chạy trước `RateLimitGuard` ở `POST /v1/auth/register`, `/login`, `/otp`. Cloudflare không trả lời: `register` và `otp` trả 503 `captcha-unavailable`, `login` cho qua và ghi log `turnstile_bypassed`. Lỗi mới: `captcha-failed` (400), `captcha-unavailable` (503).
- Header API bằng `helmet` (bốn header trả về, không `X-Powered-By`, không HSTS), header web (`next.config.ts`) và `apps/admin/public/_headers`.
- Web và admin: widget Turnstile (giả khi site key rỗng), nút gửi tắt tới khi có token, widget `reset()` sau mọi phản hồi trừ khi rời trang. Build production của web (`https://wordmet.com`, app bật) và admin (`pnpm build`) fail khi thiếu site key.
- Tám smoke, `learner-test-setup` và `admin/e2e-real` gửi `smoke-token` và dừng sớm khi môi trường không phải `TURNSTILE_MODE=fake`.

**Cần làm với `.env` cục bộ:** mọi file môi trường của API (`apps/api/.env`) giờ **bắt buộc** có `TURNSTILE_MODE`; thiếu thì API, worker và các CLI (`admin:grant`, `maintenance:run`, …) không khởi động. `apps/api/.env.example` có `TURNSTILE_MODE=fake`; `docker-compose.yml` mặc định `fake`.

**Kiểm chứng:**
- API: toàn bộ unit test (305 file, 4130 test) xanh trước Task 6, `tsc` sạch; sau đó thêm hai test cho lỗi ở dưới.
- Web: typecheck, lint, 82 file / 803 test xanh. Admin: lint, typecheck, 104 file / 1364 test xanh; `pnpm build` có site key thành công và `dist/_headers` giống `public/_headers`; build thiếu site key fail và nêu tên `VITE_TURNSTILE_SITE_KEY`.
- e2e web trong container Linux (`pnpm cf:docker`, toàn bộ): 345 pass, 0 lỗi (7,6 phút). Riêng `csp.spec.ts` 8/8 pass (E23 hai lần, LA1#13 ba header, LA1#14 widget thật với khóa test chạy dưới CSP, 0 vi phạm). LA1#14 chứng minh bằng việc nút đăng nhập bật lên sau khi Cloudflare trả token, vì Turnstile vẽ iframe trong shadow root đóng nên không hỏi được iframe.
- `smoke:buoc-4` trên DB mới với API `TURNSTILE_MODE=fake`: ALL CHECKS PASSED. Các smoke còn lại chạy ở Task 30.
- Chạy tay API ở chế độ `real` với khóa test của Cloudflare (`curl`, 04/11/2026):
  - không token → 400 `validation-failed`;
  - secret `1x0000000000000000000000000000000AA` và token giả `XXXX.DUMMY.TOKEN.XXXX` → qua (202) khi danh sách hostname có `example.com`; thiếu thì 400 `captcha-failed` và log `turnstile_hostname_mismatch`;
  - secret `2x0000000000000000000000000000000AA` (luôn trượt) → 400 `captcha-failed`;
  - secret sai → 503 `captcha-unavailable` và log mức error `turnstile_misconfigured`; đăng nhập vẫn qua, log `turnstile_bypassed` với `reason: misconfigured`.
- `curl -I /v1/health` trên API local: `Content-Security-Policy: default-src 'none';frame-ancestors 'none'`, `Cross-Origin-Resource-Policy: same-site`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`; không có `X-Powered-By`, không có HSTS.

**Phát hiện khi chạy với Cloudflare thật (hai chỗ design và plan nghĩ sai):**
1. Với khóa test, siteverify trả `hostname: "example.com"`, **không phải** `localhost` như `ASSUMPTION` của design §9. Muốn chạy tay `real` với khóa test thì `TURNSTILE_ALLOWED_HOSTNAMES` phải có `example.com`. Hostname của token lấy trong trình duyệt ở `localhost` với khóa test chưa thử.
2. Secret sai được Cloudflare trả **HTTP 400** kèm JSON `{"error-codes":["invalid-input-secret"]}`, không phải HTTP 200. Client ban đầu chỉ phân loại theo mã HTTP nên coi là `http`, và login bypass ghi sai lý do. Đã sửa (hai commit: test đỏ, rồi fix): client đọc body trước, nên `invalid-input-secret` hoặc `missing-input-secret` luôn thành `misconfigured`, không thử lại.

**Review độc lập cuối M1** (một reviewer mới, đọc diff): 0 Critical, 2 Important, 5 Minor. Hai Important đã sửa theo quy trình test đỏ trước, fix sau: (I1) dòng `TURNSTILE_SECRET_KEY=` để trống trong `.env.example` thành chuỗi rỗng khi nạp file nên API không khởi động dù ở `fake`; nay trống nghĩa là chưa đặt. (I2) phản hồi HTTP 4xx có `success:false` bị coi là "Cloudflare không trả lời" nên đăng nhập lọt; nay là `rejected`. Năm Minor để lại: script Cloudflare lỗi khi không có widget nào đang mở thì thẻ script hỏng ở lại và widget sau chờ mãi; không thử lại khi script tải lỗi; guard build web chỉ khớp đúng `https://wordmet.com` (không khớp `www.` hay URL xem trước) và guard admin chỉ khớp mode `production`; widget hiện cả trang xác minh email dù chỉ "Gửi lại mã" dùng; hai script bằng chứng cũ trong `docs/tasks/2026-10-15-refresh-fast-reload/evidence/` vẫn đăng ký không token.

**Chưa làm / chưa kiểm được:**
- Chưa chạy tay trên trình duyệt thật các form web (đăng ký, đăng nhập, quên mật khẩu, gửi lại mã, LA1#6) và admin (đăng nhập, quên mật khẩu) với API `real`; chỉ kiểm bằng unit test, e2e có widget giả và `curl` ở trên. Cần chủ dự án hoặc một lượt có trình duyệt và mạng.
- LA1E18 (token của widget giả gửi tới API `real` bị từ chối) chưa kiểm sống: secret test `1x…` cho qua mọi token, `2x…` trượt mọi token, nên không phân biệt được. Có unit test của client.
- Sau deploy: `curl -I` admin (trang `/` và một đường dẫn sâu), web (`/vi` và một file `/_next/static/…`), API (HSTS); hai `ASSUMPTION` của design §4.4 về `_headers` và `headers()`. Đã nằm trong `deploy-checklist.md`.
- E23 và LA1#14 cần mạng tới Cloudflare trong CI; có thể chập chờn khi Cloudflare chậm.

**Quyết định đáng nhớ của M1:** header CSP của API là dạng helmet viết (`default-src 'none';frame-ancestors 'none'`, không dấu cách sau `;`); câu tiếng Anh của hai lỗi mới bỏ chữ "Please" vì test của app người học cấm; widget có dòng báo khi script Cloudflare không tải được; widget cũng có ở bước nhập mã của quên mật khẩu admin, vì nút "Gửi lại mã" ở đó gọi `/v1/auth/otp`.

## M2 — Đợt sửa sau review (04/11/2026)

Hai PR vào `dev`: tài liệu [#212](https://github.com/quangtienngo661/english-flashcard/pull/212) (nhánh `docs/launch-a-m2-review`, merge `fdade1c6`) và code
[#213](https://github.com/quangtienngo661/english-flashcard/pull/213) (nhánh `fix/launch-a-m2-review`, merge `f48f28ad`), mỗi PR bốn check xanh.

**Đã làm (Task 10–19):**
- #212: R3 (mục checklist "Chặn đồ giả ở production", Q13 giữ cơ chế), R4 (các mục checklist: dữ liệu gửi AI, điều khoản provider, việc trước khi bán thật, đo lại "Ôn tất cả"), R11 → ✅,
  R12 (design cũ có ghi chú "đã thay bởi …", test flow và handoff cũ sửa). 104 link tương đối kiểm tra, 0 link hỏng.
- #213, mỗi lỗi là hai commit (test đỏ trước, fix sau): LA2#1–#2 hoàn lượt chỉ khi thao tác có dòng `use` đã xác nhận trong chu kỳ hiện tại (B5-7); LA2#3 mốc chu kỳ của event `renewed`
  lấy theo lúc event xảy ra, không lấy đầu kỳ mới (B5-5); LA2#4–#5 đọc nghĩa hiển thị và xóa mục học dưới khóa của người học (B3-5); LA2#6 số lần chạy job lấy từ DB,
  lần cuối thành `failed` và BullMQ nhận `UnrecoverableError` (B2-6); LA2#7 job dọn hằng giờ xóa `otp_failure_windows` quá 48 giờ (trừ cửa sổ còn đang khóa) và `mail_budget_buckets` quá 7 ngày (B1-5);
  hàm `writeCatalogEntry` dùng chung cho hai controller (B2-8). Admin: LA2#8 bỏ ký tự NUL ở ô tìm, LA2#9 đếm ngược theo `Retry-After` khi khóa tài khoản bị rate limit,
  LA2#10 xuất "Từ chưa có nghĩa" (`has_sense=false`), `EXPORT_MAX_ROWS` lên 10.000. LA2#11 bỏ script `test:e2e` chết. LA2#12 e2e "Đặt mật khẩu" của tài khoản chỉ có Google (desktop và mobile pass).
- **Review độc lập cuối M2** (reviewer mới, chỉ đọc code): 0 Critical, 1 Important, 8 Minor. Important (root `.env.example` còn `EXPORT_MAX_ROWS=5000`, nên `pnpm bootstrap` chặn xuất 7.799 dòng) đã sửa, test đỏ trước.

**Đo tải (Task 20, một phần), `pnpm test:scale` 3/3 pass trong 151 giây:** mở phiên "Ôn tất cả" 100 nhóm × 2.000 mục: median 3.136 ms (D39); tra từ 16 → 16 ms và `words?q` 30 → 49 ms khi có 300.000
từ riêng của người khác (B2-5); `GET /v1/groups` 289 ms (mục tiêu < 500). B7-5 (mở phiên với 50 từ có dạng AI) không có test scale nên chưa đo.

**Chưa làm / chưa kiểm được (M2):**
- Checklist dev `docs/audit/2026-11-04-dev-test-checklist.md` còn nằm trên nhánh `docs/dev-test-checklist`, chưa vào `dev`, nên chưa chạy và chưa thêm mục. Mục cần thêm khi nó vào `dev` ghi ở cuối M3.
- B5-8 (chứng minh test chạy đua có răng: bỏ `lockPool`/`lockAiDaily` trên nhánh nháp, smoke 5 phải đỏ) chưa làm. B7-5 chưa đo. R8 chưa thử với Google thật trên trình duyệt thật; R13: chưa có as-built của lần gọi AI thật 28/10 (cần dữ liệu của chủ dự án).
- **Để sau, có chủ ý:** UA-4 (`Messages` của `use-intl` cho admin: 44 lỗi `tsc`, thành một đợt chuyển kiểu) và "ô ngày theo ngôn ngữ của app" (ô ngày là `<input type="date">` gốc trình duyệt). Cả hai nằm trong `IMPROVEMENT_PLAN`.
- Minor của review M2 chưa sửa: trần job chỉ giữ khi `finish` thành công (thêm `AND attempts < jobAttempts` vào `acquire`); `UnrecoverableError` mất stack gốc (truyền `{ cause }`); `mail-budget-cleanup.spec` lặp luật SQL
  bằng JS; `LockDialog` còn banner lỗi cũ cạnh đếm ngược; `ExportPage` để các ô lọc không dùng vẫn sửa được khi chọn "Từ chưa có nghĩa"; `lockItems` trước `DELETE … RETURNING` đóng góp ít.
- Một ghi chú vận hành: e2e của "Đặt mật khẩu" cần `expect().toPass` vì chữ gõ vào trang vừa tải đầy đủ có thể mất trước khi React hydrate.

## M3 — Lượt AI cho Free, tắt trial (04–05/11/2026)

Nhánh `feat/launch-a-m3-free-ai`, một PR vào `dev` (Task 21–28; Task 29 là commit riêng trên nhánh nghiên cứu, xem dưới).

**Đã làm:**
- **Cửa sổ lượt AI của Free** (Task 21): `rules/ai-cycle.ts` có `calendarMonthCycle(zone, now)` (tháng dương lịch theo múi giờ người học, xử lý DST) và `aiCycle(resolved, zone, now, lastEnd)`: có anchor (Pro, trial,
  limits grant có AI) thì giữ `cycleAt(anchor, now)` như cũ; Free không anchor và có số AI > 0 thì từ đầu tháng (hoặc từ lúc nguồn Pro cuối cùng của tháng kết thúc) tới đầu tháng sau; còn lại `null`.
  `aiWindow` gom việc tìm `lastEnd` để snapshot, `standing` của sổ lượt (reserve và confirm), `refund` cùng gọi một chỗ; dashboard Pro gọi `aiCycle` với `lastEnd = null`.
- **Lúc một nguồn Pro kết thúc** (Task 22–23): migration `20261105100000_free_ai_cycle` thêm `subscriptions.ended_at` và `usage_records.plan` (hai cột `NULL`, `plan` có CHECK `free | trial | pro`, không backfill).
  `rules/source-ends.ts`: `nextEndedAt` (luật duy nhất cho cột), `aiSourceEnds`, `lastAiSourceEnd`. Cả bốn chỗ ghi `status` (áp event, hỏi lại provider sau khi thu hồi, `timeTransitions`, `refetchRevoked`) ghi `ended_at`.
  `SourcesRepository.load(db, userId, now, endedSince?)` trả thêm mảng `ended` (subscription `expired`/`revoked` có `ended_at` từ đầu tháng, grant bị thu hồi hoặc hết hạn trong tháng); `subscriptions` và `grants` giữ đúng như cũ.
- **Ba setting** (Task 24): `free_ai_practice_per_cycle` 15, `free_ai_lookup_per_cycle` 5 (0–5000) và `free_ai_daily_cap` 500 (0–100000, không nhận `null`); đủ năm chỗ của `settings.definitions.ts`, `planNumbers`, `appConfigView`,
  admin (52 key, tab "Gói và lượt" 19 ô, nhãn, gợi ý "0 = …", ghi chú về chữ landing), kiểu `AppConfig` của web. Nhãn "gói Pro và Dùng thử" của số phiên luyện đổi thành "gói Pro".
- **Sổ lượt, snapshot, hoàn lượt, trần Free** (Task 25): `UsageLedgerService` nhận `IdentityService` để đọc múi giờ trong cùng transaction; `reserve` ghi `usage_records.plan` và, chỉ với người Free, kiểm `capUsedFree` dưới
  `lockAiDaily` ngay sau trần chung; `free_ai_daily_cap = 0` từ chối như công tắc tắt (`ai-unavailable` không kèm giây); xác nhận muộn không kiểm trần (B5-6). Snapshot: `resets_at` của Free = đầu tháng sau theo múi giờ;
  `ai_available.cap_reached` của Free = trần chung hoặc trần Free. Hoàn lượt cho câu lỗi của Free trả `true` khi dòng `use` nằm trong cửa sổ.
- **Tắt trial** (Task 26): `trial_eligible` luôn `false`; code trial và `sources.trialUsed` giữ cho nhà cung cấp tự gia hạn về sau; `smoke-buoc-5`, `smoke-buoc-8` (B8E28) và `learner-test-setup --plan trial` sửa theo.
- **Web và landing** (Task 27): thẻ Free ghi "N câu AI và M lượt tra AI mỗi tháng" (số lấy từ `plans.free`); bảng so sánh Free có số; công tắc "Kiểu câu có AI" và nút tra AI không còn chip "Pro" / "Dùng thử" khi dùng được;
  landing ô Free của hai dòng AI ghi "15/tháng" và "5/tháng", bỏ dòng trial, FAQ và hai câu mô tả (`practice.body`, `lookup.p1`) không còn nói AI là của Pro; trang giao dịch trống không còn nhắc dùng thử.
  Free có số AI bằng 0 thì mọi thứ về như trước (khóa, "cần gói Pro", dấu gạch).
- **Smoke** (Task 28): `smoke-buoc-5` thêm B5#1 (pool 15/5, `resets_at` đầu tháng sau), Pro → Free hai cách (thu hồi plan grant; event `expired` cho subscription hủy cuối kỳ, kiểm `ended_at` ghi), "sang tháng" bằng SQL lùi 40 ngày,
  `free_ai_daily_cap` = 2 và 0; `smoke-buoc-7` AC11 viết lại (AI cloze mở, 5 lượt tra rồi lượt thứ 6 `quota-exhausted`, sau 15 câu phiên AI bị `ai-quota-insufficient`).
- **Bản nháp pháp lý** (Task 29): commit `d461a6b5` trên nhánh `docs/web-launch-research` (chưa push, theo quy ước tài liệu chủ dự án đọc): Chính sách bảo mật mục 3, 4 và Điều khoản mục 4, 9, bản vi và en; không ghi con số.

**Kiểm chứng:**
- Unit test trên mã cuối (05/11/2026): API 313 file / 4.267 test, web 82 file / 813 test, admin 104 file / 1.372 test, đều xanh; `tsc` sạch ở cả ba app; eslint web và `check-tailwind-raw` sạch; `oxlint` API chỉ còn hai cảnh báo có sẵn
  (`mail-dispatcher.service.ts`, `account-deletion.service.ts`). Lần chạy admin đầu tiên khi máy đang bận có 12 test hết 5 giây ở 9 file không liên quan; chạy lại 9 file đó với `--maxWorkers=2`: 223 test pass, và cả bộ với `--maxWorkers=3`: pass.
- Test đỏ trước, fix sau cho mọi thay đổi hành vi. Ngoại lệ có chủ ý: `aiWindow`, `freeCap` của `decideReserve` và `capUsedFree` được viết trước lần chạy đỏ đầu tiên; thay vào đó bảy lần phá thử đã làm test đỏ rồi được hoàn lại
  (bỏ điều kiện `freeCap === 0`, bỏ nhánh trần Free, ghi sai cột `plan`, snapshot không xét trần Free, mốc `lastEnd` luôn từ 1970, `lastEnd` luôn `null`, bỏ bộ lọc `plan = 'free'` của `capUsedFree`).
- **Smoke trên DB mới**, mỗi lần một DB và một tiền tố hàng đợi riêng, API và worker khởi động chỉ từ biến môi trường (không đọc `apps/api/.env`), `TURNSTILE_MODE=fake`; chạy sau khi build lại bằng mã cuối. Toàn văn:
  [`chuan-bi-launch-a-smoke-output.txt`](chuan-bi-launch-a-smoke-output.txt).

  | Smoke | Kết quả |
  |---|---|
  | `smoke:buoc-5` fetchState ON / OFF | ALL CHECKS PASSED cả hai (436 s / 334 s), gồm các bước mới B5#1 (LA3#13), LA3#7, #6, #3, #10 |
  | `smoke:buoc-4` | ALL CHECKS PASSED (20 phiên, 40 câu) |
  | `smoke:buoc-2` | ALL CHECKS PASSED |
  | `smoke:buoc-6` | passed, 32 bước |
  | `smoke:buoc-7` | passed, 30 bước, gồm AC11 viết lại cho Free |
  | `smoke:buoc-0-3-fixes`, `smoke:buoc-8` | exit 0 (B8E28 mới kiểm bằng SQL) |
  | `learner:setup --plan trial` | exit 0, trial vẫn bắt đầu qua provider giả với tài khoản chưa có lịch sử trial |
  | `smoke:nhom-b` | **exit 1, một lỗi có từ trước**: bước M2.9 và 18 bước phụ thuộc trạng thái của nó. Smoke tự giữ khóa dòng `ai_live_configs` 8 giây (`pg_sleep(8)`, từ commit `0ab70760`, 01/11/2026) để hai lần publish cùng xếp hàng, nhưng giao dịch publish không đặt `timeout` nên dùng mặc định 5 giây của Prisma, và cả hai kết thúc bằng `P2028` (HTTP 500). Lấy mẫu `pg_stat_activity` mỗi 250 ms thấy hai câu `UPDATE` chờ khóa tới lúc đó. Bản chạy cục bộ rút giữ khóa còn 4 giây (không commit) cho **89/89 bước pass** trên mã cuối, nên đợt này không làm hỏng gì ở nhóm B. Lần chạy ghi lại 31/10/2026 trước commit đó. Việc tiếp theo ở "Chưa làm" |

  Lần đầu `smoke:buoc-5` fetchState OFF (trên bản build trước khi sửa I1) hỏng một lần ở bước mới LA3#6 vì 10 trong 16 lần `confirm` song song cho cùng một người trả `PrismaClientKnownRequestError`; Postgres không ghi lỗi nào, và tám vòng
  15 `reserve` + 15 `confirm` song song cho người dùng mới trên cùng DB cho 0 lỗi, một vòng `reserve` đứng 7 giây khi smoke khác đang dùng chung Postgres. Coi là kẹt do tải; bước mới nay chia lô tối đa 8 lần song song, và cả hai chế độ đã pass trên mã cuối.

**Review độc lập cuối M3** (reviewer mới, chỉ đọc code): 0 Critical, 1 Important, 8 Minor. Important (I1): `timeTransitions` dùng trạng thái provider vừa trả để tính `ended_at`, nên câu trả lời "expired + hủy cuối kỳ" kéo mốc kết thúc
về cuối kỳ cũ và tính lượt đã dùng lúc còn Pro vào Free; đã sửa (test đỏ rồi fix): `ended_at` chỉ lấy ngày và cờ của chính dòng. Đã sửa luôn M2 (kiểm B8E28 không thể đỏ), M3 (bảng so sánh khớp thẻ khi chỉ một số bằng 0),
M4 (trang giao dịch trống nhắc dùng thử), M5 (comment cũ), M8 (LA3E21 có test).

**Chưa làm / chưa kiểm được (M3):**
- **Việc có từ trước, không thuộc đợt này:** `smoke:nhom-b` bước M2.9 hỏng vì smoke giữ khóa 8 giây còn giao dịch publish chỉ chờ 5 giây (bảng ở trên). Cách sửa: cho giao dịch publish một `timeout` lớn hơn thời gian giữ khóa của smoke, hoặc rút thời gian giữ khóa dưới 5 giây.
- e2e web: máy cục bộ không chạy toàn bộ bộ e2e trước khi mở PR; CI của PR chạy và bắt được 4 test hỏng vì fixture Free đổi (`m5a.spec.ts` "Free: the switch is locked" và `landing.spec.ts` LR36, mỗi test ở desktop và mobile). Đã sửa (Free có hạn mức thì công tắc dùng được; "Free với AI tắt" dùng `entitlementsBody('free', { freeAi: false })`; hai ô AI của Free ở landing là "15/tháng" và "5/tháng"). Chạy lại ba file `landing`, `m5a`, `m5b` trong container Linux (`pnpm cf:docker`): 111 pass, 1 flaky (axe/overflow của `m5a`, pass ở lần thử lại), exit 0. Hai test axe của `m5b` trên mobile cũng flaky trong CI (Worker dev server báo "Aborted", pass ở lần thử lại).
- **Chưa dùng AI thật** trong đợt này: mọi lượt AI trong smoke là provider giả (D3); chất lượng câu AI và tỷ lệ bị rule loại vẫn chưa đo. Bước 2 của Task 30 (lượt AI chạy tay) làm bằng các bước SQL của smoke, không qua giao diện web.
- Chưa thử trên trình duyệt thật: thẻ Free, bảng so sánh, công tắc AI, landing.
- Minor chưa sửa: (M1) trial bị từ chối rồi đã trả tiền và kết thúc trước `trial_ends_at` không được tính là nguồn Pro (trial đang tắt); (M6) một lượt giữ chỗ của người Free chạy bốn câu `count` dưới `lockAiDaily`.
- **Ghi cho chủ dự án (M7):** `ended_at` của event lấy theo `occurredAt` (LA3E10). Event `expired`/`revoked` ghi ngày 15/11 mà tới ngày 18/11 mới nhận được thì cửa sổ Free bắt đầu từ 15/11, và lượt dùng 15–18/11 lúc còn là Pro bị tính vào 15 lượt Free.
  Đổi sang `max(occurredAt, updated_at của dòng)` là thay đổi design; chưa làm.
- Mục cần thêm vào `docs/audit/2026-11-04-dev-test-checklist.md` khi nhánh `docs/dev-test-checklist` vào `dev`: (1) Free dùng hết 15 câu AI rồi bị chặn với ngày có lượt mới là đầu tháng sau; (2) "sang tháng" bằng
  `UPDATE usage_records SET confirmed_at = confirmed_at - interval '1 month' WHERE user_id = '<id>' AND pool IN ('ai_practice', 'ai_lookup') AND kind = 'use' AND status = 'confirmed'`, không đổi giờ máy
  (API dùng `SystemClock`, đổi giờ Windows làm lệch Docker, JWT và cookie); (3) báo lỗi câu AI của Free rồi xác nhận: được hoàn; (4) Pro → Free giữa tháng: cấp Pro, dùng vài câu AI, thu hồi grant, Free còn đủ 15.

**Quyết định đáng nhớ của M3:** `ended_at` của event lấy `occurredAt`, của job và hỏi lại provider lấy `now`, và luôn lấy `min` với mốc theo luật thời gian của chính dòng; một dòng vừa được tạo đã kết thúc coi như vừa còn sống; `check()` (cổng
`ai.practice`/`ai.lookup`) chỉ đọc giới hạn, không tính cửa sổ; Landing của `en.json` là cùng chữ tiếng Việt như `vi.json` (landing chỉ có tiếng Việt), nên "15/tháng" không có bản "15/month".
