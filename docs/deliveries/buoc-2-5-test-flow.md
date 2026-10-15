# Bước 2.5 — test flow (15/10/2026)

Cách kiểm Bước 2.5 (`apps/admin`) và kết quả lần chạy ngày 15/10/2026 trên nhánh `feat/buoc-2-5-m3-csv-flow` (commit
`5251047`, worktree `english-learning-wt-m3`). Design: `docs/superpowers/specs/2026-10-14-buoc-2-5-admin-web-design.md` (§1 "Xong
khi", §10, §11). Tiến độ và as-built: `docs/deliveries/buoc-2-5.md`.

## 1. Gate tự động (plan Task 18, Step 1)

Chạy local trên Windows, Docker Desktop bật, `docker compose up -d` ở repo root.

| App | Lệnh | Kết quả 15/10/2026 |
|---|---|---|
| `apps/api` | `pnpm lint` | xanh (1 warning cũ `no-useless-spread`) |
| `apps/api` | `pnpm exec tsc --noEmit -p tsconfig.json` | xanh |
| `apps/api` | `pnpm build` | xanh |
| `apps/api` | `pnpm test` | 50 file, **578/578** |
| `apps/api` | `pnpm test:e2e` (Testcontainers) | 46 file, **475/475**, 9,5 phút |
| `apps/admin` | `pnpm lint` | xanh |
| `apps/admin` | `pnpm typecheck` | xanh |
| `apps/admin` | `pnpm test` | 31 file, **217/217** |
| `apps/admin` | `VITE_API_BASE_URL=https://admin-api.wordmet.com pnpm build` | xanh |
| `apps/admin` | `VITE_API_BASE_URL=http://localhost:3000 pnpm build:e2e` | xanh |
| `apps/admin` | `pnpm test:e2e` (API giả) | **60/60** (desktop 1440 + mobile 390), 2,5 phút |
| `apps/admin` | `pnpm test:e2e:real` (API thật) | **7/7**, 25 giây |

Lưu ý khi chạy lại:
- `pnpm build` của admin **bắt buộc** có `VITE_API_BASE_URL`, và bản production chỉ nhận host bắt đầu bằng `admin-api.` (cố ý,
  `src/api-base-url-guard.ts`). Thiếu biến hoặc dùng `http://localhost:3000` thì build báo lỗi. CI truyền đúng các giá trị ở bảng
  trên.
- `pnpm test` của admin chạy **cùng lúc** với test của API thì 18/217 test hết giờ (`findBy*` 1 giây, test 5 giây) vì máy quá
  tải; chạy riêng thì 217/217. Không phải lỗi logic. Trên CI hai job chạy trên hai máy riêng.
- Worktree mới chưa có Prisma client: chạy `prisma migrate deploy && prisma generate --sql` (`pnpm db:setup`) với `DATABASE_URL`
  trỏ vào một DB đã migrate trước khi chạy `tsc`.
- `test:e2e:real` cần API + worker thật ở `:3000`, Mailpit ở `:8025`, và quyền chạy `node dist/cli/admin-grant.js` trong
  `apps/api` (`E2E_API_DIR`, mặc định `../api`). Mỗi lần chạy đăng ký 2 tài khoản qua API (giới hạn 5 lần/giờ/IP).

**Biến môi trường khi không có `.env`.** Worktree M3 không có `apps/api/.env`, và hook của máy chặn đọc/ghi file secret. Lần chạy
này truyền biến môi trường thẳng cho tiến trình: một script nhỏ lấy các giá trị không bí mật từ `.env.example`, sinh 4 secret
(`JWT_KEYS`, `OTP_HMAC_KEY`, `RATE_LIMIT_HMAC_KEY`, `REFRESH_GRACE_KEY`) trong bộ nhớ bằng `randomBytes(32)`, rồi chạy lệnh con.
Không ghi secret ra đĩa. `main.ts`, `worker.ts` và `admin-grant.ts` chỉ nạp `.env` khi file có mặt, nên cách này dùng được.

## 2. Chạy tay "Xong khi" (design §1 mục 3; plan Task 18, Step 2)

**Môi trường:** DB mới `english_learning_b25manual` trên Postgres local (cổng 5434; DB `english_learning` của chủ dự án không bị
đụng), Redis 6380 với `JOB_QUEUE_PREFIX=wordmet-b25run`, Mailpit. API + worker: `node scripts/run-dev.mjs` (sau `pnpm build`).
Admin: `VITE_API_BASE_URL=http://localhost:3000 pnpm dev --strictPort` ở cổng 5173.

**Cách chạy:** một script Playwright (Chromium, mỗi người dùng một browser context riêng, tương đương "trình duyệt thứ hai")
đi đúng thứ tự các bước dưới đây và chụp màn hình từng bước. Đây là chạy bằng script có quan sát (ảnh chụp + DB + API), không phải
người bấm tay; ảnh chụp chỉ lưu local, không commit.

| # | Bước (design §1 mục 3) | Quan sát được |
|---|---|---|
| 1 | DB mới → đăng ký chủ dự án qua API, xác minh bằng OTP trong Mailpit → `node dist/cli/admin-grant.js <email>` | CLI in `granted`; log `staff_role_changed` (`staff_role: admin`) |
| 2 | Chủ dự án đăng nhập `http://localhost:5173` | Vào `/uploads`, menu có "Vai trò & staff" |
| 3 | Chủ dự án tạo tài khoản editor (sinh mật khẩu, bắt đổi) | Hộp xác nhận nhắc lại email → "đã tạo"; **mật khẩu không hiện trên màn hình**; log `staff_account_created` (`must_change: true`) |
| 4 | Trình duyệt thứ hai: editor đọc mật khẩu trong thư Mailpit → đăng nhập | Thư có dòng `Password: …`; đăng nhập xong bị đưa tới `/change-password` |
| 5 | Editor đổi mật khẩu | Vào app ở `/uploads` |
| 6 | Editor đăng ký nguồn "CEFR-J Vocabulary Profile" 1.5 (có license) | Nguồn hiện trong danh sách |
| 7 | Upload **file CEFR-J 1.5 thật** (`docs/preparation/evidence/wordlists_2026-10-02/cefrj-vocabulary-profile-1.5.csv`), chọn nguồn level | Lô `Hoàn tất` sau **213 giây**: tổng 7.799 dòng, tạo mới 7.799, bị loại 0. Worker: `entries_created 7799`, `variants_created 174`, `levels_created 7799`, `senses_created 0` |
| 8 | Xuất danh sách `unpublishable` | File `senses-2026-10-15.csv` có header (BOM, 15 cột gồm `_missing`) và **0 dòng dữ liệu**. Xem phát hiện 1 |
| 9 | Điền nghĩa/ví dụ cho vài từ → upload lại | Thay bằng file tự soạn (phát hiện 1): `headword,pos,gloss_vi,definition_en,example_en_1,topics` cho `apple`, `coffee`, `computer`, `teacher` (noun). Lô `Hoàn tất`: 4 dòng, worker `entries_created 0`, `senses_created 4`, `revisions_created 4` (khớp vào entry CEFR-J có sẵn) |
| 10 | Publish lô vừa upload → theo dõi job | Job `publish_job_finished`: `published 4`, `refused 0`; DB: 4 `sense_revisions` ở `published` |
| 11 | Gọi API tìm kiếm bằng tài khoản learner | Learner mới phải `PATCH /v1/me {native_language: "vi"}` trước (không có thì 403 `profile-incomplete`, đúng thiết kế Bước 1). Sau đó `GET /v1/senses/search?q=` trả 200 cho cả 4 từ, có `level: A1` (từ CEFR-J) và `meaning.text` tiếng Việt. Đối chứng: `q=book` (có trong CEFR-J, không điền nghĩa) trả rỗng |
| 12 | Learner đăng nhập trang admin | Ở lại `/login` với "Bạn không có quyền truy cập trang web này" |
| 13 | Bề rộng 390, 768, 1024, 1440 | Đo bằng tài khoản chủ dự án: mỗi trang mở **một lần** rồi đổi kích thước tại chỗ (lần đo đầu tải lại trang liên tục, dính phát hiện 2: 4/12 ảnh là trang đăng nhập, đã bỏ). 6 trang (`/uploads`, chi tiết lô CEFR-J, `/export`, chi tiết publish job, `/sources`, `/staff`) × 4 bề rộng = **24/24** tổ hợp vẫn đăng nhập và không tràn ngang (`scrollWidth − clientWidth = 0`). Ở 390 và 768 menu nằm sau nút ☰; ở 390 danh sách hiện dạng thẻ |
| 14 | Gỡ quyền editor khi editor đang mở trang | Chạy lại riêng (xem phát hiện 2): editor ở `/uploads`, admin gỡ vai trò → editor bấm "Xuất CSV" → `/login` kèm "không có quyền" |

## 3. Phát hiện

1. **Kịch bản "xuất `unpublishable` → điền → upload lại" không chạy được với file CEFR-J.** File CEFR-J chỉ tạo entry + level,
   chưa có sense (B2#7), còn xuất CSV (`GET .../senses/export`) chỉ duyệt **sense**, nên danh sách `unpublishable` rỗng. Cách đi
   được: soạn CSV theo `headword` + `pos` (khớp entry có sẵn) rồi upload. **Chủ dự án chốt 15/10/2026:** ghi nhận, sửa kịch bản
   trong design; "xuất các từ chưa có nghĩa" đưa vào backlog, không làm ở Bước 2.5.
2. **Refresh phiên bị 429 thì admin về `/login` không báo gì.** Lần chạy đầy đủ tải lại trang 12 lần trong khoảng 8 giây; tái
   hiện riêng: 10 lần `POST /v1/auth/refresh` đầu trả 200, lần 11 trả **429** (`rate-limited`, `Retry-After: 52`), app coi như
   mất phiên và mở `/login` không kèm thông báo, dù cookie refresh vẫn còn hiệu lực. Design chưa có edge case này (mục 429 chỉ nói
   về nút bấm). **Chủ dự án chốt 15/10/2026:** ghi nhận thành B25E30, sửa khi refactor giao diện admin.

## 4. Chưa kiểm ở lần này

- Job CI `admin` và `admin-e2e-real` **chưa chạy trên CI** (nhánh M3 chưa push); thời gian thêm mỗi PR (ước 5–8 phút) chưa đo.
- Ngưỡng 30 giây gợi ý worker cho lô kẹt (mục 8) chỉ có test e2e với API giả, chưa thử bằng cách tắt worker thật.
- Chỉ chạy trên Chromium (Playwright). Safari/Firefox chưa thử cookie `Secure; SameSite=Strict` trên `http://localhost`.
