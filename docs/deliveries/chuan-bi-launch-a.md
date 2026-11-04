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
