# Chạy cả app bằng Docker từ root (28/10/2026)

Một lệnh ở root dựng và chạy API + worker, admin và web học trong container, thay cho việc vào từng project để cài, migrate, build.

```powershell
pnpm bootstrap            # tạo .env nếu chưa có, build image, chạy tất cả, chờ tới khi healthy
pnpm bootstrap seed       # nội dung mẫu + 1 admin + 1 người học Pro (tài khoản thử, mật khẩu cố định)
pnpm bootstrap status     # trạng thái các container
pnpm bootstrap logs api   # xem log (bỏ tên để xem tất cả)
pnpm bootstrap down       # dừng (thêm --volumes để xóa cả dữ liệu Postgres và Redis)
pnpm bootstrap infra      # chỉ Postgres, Redis, Mailpit; app chạy trên máy như trước
```

Sau `pnpm bootstrap`: admin `http://localhost:5173`, web học `http://localhost:3001/vi/app`, API `http://localhost:3000/v1/health`,
Mailpit `http://localhost:8025` (mọi email app gửi, ví dụ mã 6 số khi đăng ký).

## Biến môi trường

Không có giá trị nào nằm trong script hay `docker-compose.yml`. Script chọn file theo thứ tự: `ENV_FILE` nếu đặt, rồi `.env` ở root, rồi
`apps/api/.env` (file bạn đang dùng khi chạy API trên máy). Chưa có file nào thì nó tạo `.env` ở root từ `.env.example` và sinh ngẫu nhiên
từng secret. File có sẵn thì **không bao giờ bị ghi đè**; nếu còn placeholder `REPLACE_WITH_GENERATED_*` thì script dừng và báo.

- Các giá trị chỉ hợp với chạy trên máy (`DATABASE_URL=localhost…`, `REDIS_URL`, `SMTP_HOST`, `CORS_ORIGINS`, `JWT_ISSUER`, các URL của app) bị
  `docker-compose.yml` đặt lại cho đúng mạng trong Docker, nên dùng chung `apps/api/.env` được.
- Việc của bạn: `OPENAI_API_KEY` và `ANTHROPIC_API_KEY` (để trống thì admin chỉ thấy model giả). Sửa xong thì `docker compose --profile app restart api`.
- Đổi cổng: `API_PORT`, `ADMIN_PORT`, `WEB_PORT`, `POSTGRES_PORT`, `REDIS_PORT`, `MAILPIT_SMTP_PORT`, `MAILPIT_UI_PORT`.

## Cách nó chạy

- `Dockerfile` (root) có 3 target dùng chung một lockfile: `api`, `admin`, `web`. `.dockerignore` loại `node_modules`, `.env`, `docs`, `.claude`.
- **api:** container chạy `pnpm db:setup && pnpm build && node scripts/run-dev.mjs` (API và worker cùng một container, giống `pnpm run:dev`).
  Build lúc container khởi động chứ không lúc build image, vì `prisma generate --sql` (TypedSQL) phải đọc DB thật. Hệ quả: mỗi lần `up`
  mất khoảng 1–2 phút trước khi API nghe cổng.
- **admin:** `vite build --mode docker` rồi nginx. `--mode docker` (không phải production) để `VITE_API_BASE_URL` được là `http://localhost:…`;
  build production bắt buộc host `admin-api.` (`apps/admin/src/resolve-api-base-url.ts`).
- **web:** `next build` với `NEXT_PUBLIC_LEARNER_APP=on` rồi `next start`. Form waitlist của trang landing cần Cloudflare D1, `next start`
  không có; phần học `/vi/app`, `/en/app` chỉ gọi API nên chạy bình thường.
- `NEXT_PUBLIC_*` và `VITE_API_BASE_URL` được ghi vào bundle lúc build: đổi cổng API thì phải build lại (`pnpm bootstrap` tự build lại).
- Các service app nằm trong profile `app` nên `docker compose up -d` vẫn chỉ bật Postgres, Redis, Mailpit như trước. Tên project cố định
  `english-learning` nên mọi checkout dùng chung container và volume.
