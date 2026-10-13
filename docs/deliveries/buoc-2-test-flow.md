# Bước 2 — luồng test (13/10/2026)

Ba lớp kiểm thử cho Content + Pipeline, từ nhanh/tự động tới chậm/thủ công. Chạy theo thứ tự dưới khi cần
xác minh lại toàn bộ Bước 2 (ví dụ sau khi merge PR, hoặc trước khi bắt đầu Bước 3).

## 1. Gate tự động (bắt buộc, ~3-5 phút)

Từ `apps/api`, cần Docker đang chạy (`pnpm docker:up` ở repo root):

```bash
pnpm lint
pnpm exec tsc --noEmit -p tsconfig.json
pnpm build
pnpm test
pnpm test:e2e
```

Kỳ vọng: 575 unit + 457 e2e, tất cả xanh. `test/pipeline/real-files.e2e-spec.ts` tự import file CEFR-J/Octanove
thật và so khớp từng số liệu (B2#70); các test còn lại dùng Postgres/Redis/Mailpit thật qua Testcontainers,
không mock. Chi tiết số đo B2#71 và các bug thật tìm được trong lúc làm: `docs/deliveries/buoc-2.md`.

## 2. Smoke test tự động (nhanh, ~4 giây, cần API+worker thật đang chạy)

Khác gate ở mục 1 (dùng `createTestApp()` giả lập), smoke test này gọi qua HTTP thật vào API đã build và một
tiến trình worker thật — đúng như người dùng cuối sẽ chạy production. Dùng file CSV nhỏ tự dựng (không phải
file CEFR-J thật — việc đó gate tự động ở trên đã làm), nên chạy lại nhiều lần trong vài giây là bình thường.

```bash
pnpm docker:up                          # ở repo root: Postgres/Redis/Mailpit
cd apps/api
pnpm build
pnpm run:dev                            # chạy API + worker cùng lúc; Ctrl+C để tắt cả hai
```

Mở một terminal khác, cùng thư mục `apps/api`:

```bash
pnpm smoke:buoc-2
```

Script `scripts/smoke-buoc-2.mjs` tự làm, theo thứ tự, và dừng ngay (exit code 1) kèm thông báo rõ nếu một
bước nào đó sai:

1. Chờ API phản hồi.
2. Đăng ký admin → lấy mã OTP từ Mailpit → verify email → `admin:grant` → đăng nhập lại.
3. Đăng ký 1 nguồn dữ liệu test.
4. Upload CSV 3 dòng (2 hợp lệ, 1 dòng `pos` sai) → xác nhận báo cáo đúng 2 tạo / 1 loại.
5. Tải `rejected.csv` → sửa dòng sai trong bộ nhớ → upload lại → xác nhận thành công (cột `_row`/`_error`
   bị bỏ qua đúng như thiết kế).
6. Export danh sách `status=unpublishable` → điền gloss/example/level còn thiếu cho 1 sense → upload lại →
   xác nhận sense đó không còn trong danh sách unpublishable.
7. Publish sense đó bằng danh sách tay (`POST .../senses/publish`); publish sense còn lại bằng publish-job
   lọc theo `batch_id` (`POST .../senses/publish-jobs`) → chờ job xong.
8. Đăng ký 1 learner, đặt `native_language=vi` → tìm kiếm → xác nhận nghĩa tiếng Việt hiện đúng.

Mỗi lần chạy dùng email/lemma ngẫu nhiên (an toàn chạy lại nhiều lần, không đụng dữ liệu cũ). **Giới hạn
thật:** `auth.register.ip` cho tối đa 5 lần đăng ký/giờ/IP (mỗi lần chạy script tốn 2: admin + learner) — chạy
quá ~2 lần liên tiếp trong cùng giờ sẽ gặp lỗi 429 thật (không phải lỗi script), chờ sang giờ sau hoặc đổi máy.

## 3. Thủ công, việc gate tự động/smoke test không thể chứng minh (chậm, cần file CEFR-J thật)

Hai việc dưới đây cần quy mô dữ liệu thật (gate tự động đã chứng minh bằng test, nhưng xem bằng mắt mình một
lần vẫn hữu ích trước khi báo "xong" cho một thay đổi lớn ở khung job nền):

1. **Worker chết giữa batch rồi phục hồi, không trùng dữ liệu.** Với API+worker đang chạy (`pnpm run:dev`):
   đăng ký nguồn CEFR-J 1.5 → upload `docs/preparation/evidence/wordlists_2026-10-02/cefrj-vocabulary-profile-1.5.csv`
   qua `POST /v1/admin/content/uploads` → khi batch đang `running`, tắt riêng tiến trình worker (không tắt
   api) → khởi động lại worker → chờ batch chuyển `succeeded` → đếm `entries`/`entry_levels` trong Postgres,
   xác nhận không có số nào gấp đôi.
2. **Hành vi Excel thật** (chưa ai thử — xem `docs/deliveries/buoc-2.md`, mục "open items"): mở file CSV bằng
   Excel tiếng Việt, lưu lại dạng "CSV (Comma delimited)", upload file đó lên — kiểm dấu phân cách `;`, mã hoá
   ký tự, và một ô bắt đầu bằng `'` (như `'m`, `'re`) có còn giữ nguyên không.

## Scripts liên quan

- `package.json` (repo root): `pnpm docker:up` / `pnpm docker:down` — bật/tắt Postgres, Redis, Mailpit.
- `apps/api/scripts/run-dev.mjs` (`pnpm run:dev`): chạy API thật (`dist/main.js`) và worker thật
  (`dist/worker.js`) cùng lúc, gộp log có tiền tố `[api]`/`[worker]`; Ctrl+C tắt cả hai. Cần `pnpm build`
  trước.
- `apps/api/scripts/smoke-buoc-2.mjs` (`pnpm smoke:buoc-2`): mục 2 ở trên.
