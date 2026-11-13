# Đường deploy production (M1–M5, M7) — plan tóm tắt (13/11/2026)

Plan đầy đủ: `docs/superpowers/plans/2026-11-13-prod-deploy.md`. Nguồn: runbook `docs/deliveries/deploy-production-runbook.md` (nhánh local
`docs/deploy-checklist-pre-launch`). Quyết định đã chốt 13/11:
- Q5: một VPS 4 CPU, 8 GB.
- Q6: DNS trỏ thẳng VPS (đám mây xám).
- Q9: bỏ TypedSQL, image nhiều tầng.
- Q10: deploy bằng script chạy tay, build image trên VPS.
- Q14: công tắc `WEB_DEPLOY_PAUSED`.
- Q4 (13–14/11): bật giọng Google ngay khi launch, file trên R2 `audio.wordmet.com`; tắt AdSense; bật Google sign-in ngay khi launch.

Nhánh `feat/prod-deploy` từ `origin/dev`, một PR vào `dev`.

1. Thay 2 query TypedSQL bằng `$queryRaw`, bỏ TypedSQL khỏi `db:setup`, CI và tài liệu; chạy thử hai query trên Postgres thật.
2. Thêm image `api-prod`: build một lần, không cần DB, chạy `node dist/main.js` bằng user thường. Thêm image `migrate`.
3. Thêm `GET /v1/health/ready`: kiểm Postgres và Redis, mỗi bên tối đa 2 giây, lỗi thì trả 503.
4. Thêm `deploy/compose.prod.yml` (Caddy, api, worker, migrate, Postgres, Redis), `Caddyfile` và hai file mẫu biến môi trường.
5. Thêm `deploy.sh` (backup, migrate, đổi image, chờ ready, lỗi thì tự quay về), `rollback.sh` (không migrate), `backup.sh` (R2, giữ 14 bản)
   và trang hướng dẫn vận hành.
6. Sửa `deploy-web.yml`: bật `/app`, trỏ `api.wordmet.com`, thêm site key Turnstile, `LANDING_DATA_REQUIRED=1`, địa chỉ file giọng đọc
   `audio.wordmet.com`, công tắc `WEB_DEPLOY_PAUSED`.
7. Thêm `watch.sh` (5 phút, gửi email cảnh báo, mỗi loại tối đa một thư mỗi giờ), `daily-report.sh` (8:00) và lịch cron.
8. Bỏ mọi chữ nhắc quảng cáo ở bảng giá trang chủ, trang Gói (thẻ Miễn phí, thẻ Pro, bảng so sánh) và hộp thoại giới thiệu Pro, trong lúc
   quảng cáo đang tắt. Giữ nguyên phần nạp AdSense và công tắc trong admin.
9. Tổng duyệt toàn bộ trên máy này (deploy, deploy lần hai, rollback, deploy hỏng, cảnh báo), rồi mở PR vào `dev`.

Sửa 13/11/2026 sau khi sync `dev` (`2d858021`): thêm việc 8 theo yêu cầu chủ dự án; số dòng `app.module.ts` và ghi chú `LANDING_DATA_REQUIRED`
cập nhật theo giao diện mới đã vào `dev`. Các việc 1–7 không đổi.
Sửa tối 13/11: bật giọng Google ngay khi launch. File mẫu môi trường (việc 4) thêm khóa Google TTS và R2 giọng đọc; trang vận hành (việc 5)
thêm bước `tts:backfill` và kiểm một file trên `audio.wordmet.com`; việc 6 thêm `NEXT_PUBLIC_AUDIO_BASE_URL`.
Sửa 14/11: bật Google sign-in. File mẫu môi trường (việc 4) có thêm bốn khóa Google với địa chỉ quay về `https://api.wordmet.com/v1/auth/google/callback`.

# Đường deploy production — as-built (14/11/2026)

Nhánh `feat/prod-deploy`, làm theo plan (cách Native), 9 việc. Bằng chứng từng việc và mọi quyết định tự chốt ở ledger
`.superpowers/sdd/2026-11-13-prod-deploy/progress.md` (máy local, không commit); bản dưới là phần cần nhớ.

## Đã làm

- **API:** bỏ TypedSQL. Hai query (khóa advisory của `Idempotency-Key`, đếm OTP sai) viết lại bằng `Prisma.sql` + `$queryRaw`, mọi tham số có ép
  kiểu. `db:setup` = `prisma migrate deploy && prisma generate`; `generate` chỉ cần biến `DATABASE_URL` có giá trị, không cần DB chạy.
  `GET /v1/health/ready`: Postgres `SELECT 1` và Redis `PING`, mỗi bên tối đa 2 giây, 200 hoặc 503 (body JSON thường).
- **Image:** `Dockerfile` thêm `api-build` (cũng là image `migrate`), `api-prod-deps`, `api-prod` (chạy `node dist/main.js` bằng user `node`).
  `.dockerignore` loại mọi `.env*` trừ `.env.example`. Cỡ đo ở máy này: `api-prod` 1,06 GB, `api-build` 2,16 GB.
- **`deploy/`:** `compose.prod.yml` (Caddy 2.11.9, api, worker, migrate, Postgres 17, Redis 7.4), `Caddyfile` (log JSON, xoay mỗi ngày, giữ 7 ngày),
  `env.production.example`, `ops.env.example`, `README.md` (trang vận hành: chuẩn bị máy, deploy, rollback, khôi phục, admin, cron).
  Script: `deploy.sh`, `rollback.sh`, `backup.sh`, `compose.sh`, `send-alert.sh`, `watch.sh`, `daily-report.sh` (+ `.sql`), `common.sh`.
- **Web:** `deploy-web.yml` bật `/app`, trỏ `api.wordmet.com`, site key Turnstile (biến `TURNSTILE_SITE_KEY`), `audio.wordmet.com`,
  `LANDING_DATA_REQUIRED=1`, công tắc `WEB_DEPLOY_PAUSED`. Bỏ mọi chữ nhắc quảng cáo ở bảng giá trang chủ, trang Gói và hộp thoại giới thiệu Pro.

## Đã kiểm trên máy này

- API 5.352 unit test, web 1.722; `tsc`, lint, `check-message-keys` sạch; shellcheck và actionlint sạch.
- Hai query trên Postgres thật: `smoke:buoc-8` 20/20 bước qua (có gửi `Idempotency-Key`); một mã OTP sai ghi `failures = 1`.
- Image `api-prod` build khi Postgres tắt; chạy được với stack local; `docker stop` dừng trong dưới 1 giây (hook tắt của Nest chạy).
- `/v1/health/ready`: 200; tắt Redis → 503 `{"redis":"fail"}` sau 1,7 giây; bật lại → 200.
- Tổng duyệt (stack `wordmet` riêng ở cổng 8088):
  1. deploy lần đầu với cấu hình sai → báo "no previous version to return to", thoát 1;
  2. deploy đúng → ready sau 34 giây;
  3. deploy lần hai rồi `rollback.sh` → ready sau 20 giây, không chạy migration;
  4. deploy một bản không khởi động được → sau 120 giây tự bật lại bản trước, thoát 1, không ghi bản hỏng;
  5. `watch.sh`: một email cảnh báo, lần hai trong giờ không gửi lại, thiếu `ALERT_TO` thì dừng và nêu tên khóa; `daily-report.sh` gửi đủ mục;
     `backup.sh` hỏng thì gửi email "backup failed".
- Tổng duyệt tìm ra 3 lỗi (đọc `ops.env` bằng `source`, dọn thư mục tạm sau khi `main` trả về, ngày báo cáo lệch khi máy thiếu dữ liệu múi giờ)
  và review cuối tìm ra 3 lỗi Important (log Caddy giữ quá 7 ngày, bước khôi phục làm hỏng lần deploy sau, backup hỏng không báo): đã sửa hết.

## Chưa kiểm (chỉ kiểm được trên VPS, G1–G3)

- Chứng chỉ HTTPS thật của Caddy; backup lên R2 và khôi phục từ R2 (không có token backup ở máy này); Resend từ VPS (cổng 465 có bị chặn không);
  giọng Google ghi lên R2 từ VPS; cron chạy đúng giờ (lịch viết theo UTC, cần `timedatectl` báo `Etc/UTC`); IP người dùng qua Caddy
  (`TRUST_PROXY=uniquelocal`, G3-14); khách IPv6 (không tạo bản ghi AAAA).
- 15 điểm Minor của review để lại sau launch (ledger, mục "Final: minor (deferred)"); đáng làm sớm: giấu khóa khỏi dòng lệnh (`ps`), `umask 077`
  cho bản dump, `curl --max-time` và `flock`.
