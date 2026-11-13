# Đường deploy production (M1–M5, M7) — plan tóm tắt (13/11/2026)

Plan đầy đủ: `docs/superpowers/plans/2026-11-13-prod-deploy.md`. Nguồn: runbook `docs/deliveries/deploy-production-runbook.md` (nhánh local
`docs/deploy-checklist-pre-launch`). Quyết định đã chốt 13/11:
- Q5: một VPS 4 CPU, 8 GB.
- Q6: DNS trỏ thẳng VPS (đám mây xám).
- Q9: bỏ TypedSQL, image nhiều tầng.
- Q10: deploy bằng script chạy tay, build image trên VPS.
- Q14: công tắc `WEB_DEPLOY_PAUSED`.

Nhánh `feat/prod-deploy` từ `origin/dev`, một PR vào `dev`.

1. Thay 2 query TypedSQL bằng `$queryRaw`, bỏ TypedSQL khỏi `db:setup`, CI và tài liệu; chạy thử hai query trên Postgres thật.
2. Thêm image `api-prod`: build một lần, không cần DB, chạy `node dist/main.js` bằng user thường. Thêm image `migrate`.
3. Thêm `GET /v1/health/ready`: kiểm Postgres và Redis, mỗi bên tối đa 2 giây, lỗi thì trả 503.
4. Thêm `deploy/compose.prod.yml` (Caddy, api, worker, migrate, Postgres, Redis), `Caddyfile` và hai file mẫu biến môi trường.
5. Thêm `deploy.sh` (backup, migrate, đổi image, chờ ready, lỗi thì tự quay về), `rollback.sh` (không migrate), `backup.sh` (R2, giữ 14 bản)
   và trang hướng dẫn vận hành.
6. Sửa `deploy-web.yml`: bật `/app`, trỏ `api.wordmet.com`, thêm site key Turnstile, `LANDING_DATA_REQUIRED=1`, công tắc `WEB_DEPLOY_PAUSED`.
7. Thêm `watch.sh` (5 phút, gửi email cảnh báo, mỗi loại tối đa một thư mỗi giờ), `daily-report.sh` (8:00) và lịch cron.
8. Bỏ mọi chữ nhắc quảng cáo ở bảng giá trang chủ, trang Gói (thẻ Miễn phí, thẻ Pro, bảng so sánh) và hộp thoại giới thiệu Pro, trong lúc
   quảng cáo đang tắt. Giữ nguyên phần nạp AdSense và công tắc trong admin.
9. Tổng duyệt toàn bộ trên máy này (deploy, deploy lần hai, rollback, deploy hỏng, cảnh báo), rồi mở PR vào `dev`.

Sửa 13/11/2026 sau khi sync `dev` (`2d858021`): thêm việc 8 theo yêu cầu chủ dự án; số dòng `app.module.ts` và ghi chú `LANDING_DATA_REQUIRED`
cập nhật theo giao diện mới đã vào `dev`. Các việc 1–7 không đổi.
