# Bỏ toàn bộ e2e backend (`apps/api`) — phân tích trước khi làm (18/10/2026)

Chủ dự án chọn hướng A (bỏ hết e2e backend) và nhờ phân tích những gì phải đổi trước khi làm. Đọc trên `dev` @ `fc4cadf`
(sau PR #52). Chưa sửa gì.

**Kết quả (cùng tối 18/10):** chủ dự án chọn T2 (bỏ ngay) thay vì T1 Claude đề xuất → D38; bốn câu tiếp theo (thời gian mở phiên, kiểm
migration trên CI, job `admin-e2e-real`, hai test đo tải) chủ dự án nhờ đề xuất và chốt cả bốn → D39–D42. Decision record:
[`../decisions/2026-10-18-buoc-4-practice-decisions.md`](../decisions/2026-10-18-buoc-4-practice-decisions.md); plan Task 20a/20b.

## 1. Mất gì

| Hạng mục | Số liệu, bằng chứng |
|---|---|
| Quy mô | 72 file `*.e2e-spec.ts`, khoảng 670 test (pipeline 177, content 163, identity 154, learning 95, notifications 38, settings 12, common 7, practice 5, gốc 18). Cuối Bước 3: 681 unit + 688 e2e (`docs/deliveries/buoc-3.md:73`). PR D2 #54 và E1 của Bước 4 thêm khoảng 100 e2e nữa |
| Phần chỉ e2e kiểm | 49 file `*.service.ts`, chỉ 13 có unit spec; 32 file trong `src` chạy SQL thô (`$queryRaw`, `Prisma.sql`, TypedSQL). Các thứ này chỉ e2e chạm tới: câu SQL (trần thẻ mỗi ngày, "từ hay sai", lịch sử), khóa dòng và advisory lock, chạy đua hai máy (B4E1, B4E2, B4E28, B4E29, test deadlock), migration chạy trên DB trống và kiểm drift (`test/common/schema-drift`), `Idempotency-Key`, rate limit, kiểm quyền mọi route `/v1/admin` (`test/content/admin-permissions`), job BullMQ (import CSV, publish), job bảo trì, nhắc học và OTP qua Mailpit |
| Lỗi thật e2e đã bắt | Bước 2: mọi BullMQ Worker dùng chung một kết nối Redis nên worker thứ hai trở đi không bao giờ nhận job, không lỗi, không log (`docs/deliveries/buoc-2.md:48-53`); route `GET senses/export` bị `senses/:id` nuốt (`:57-59`). Unit test có mock không thấy được hai lỗi này |
| Bước 4 đang làm | Review Focus 1 (hai máy, bấm đúp), 4 (nội dung đổi giữa chừng), 5 (từ riêng lọt sang người khác/staff) chỉ được chứng minh bằng e2e của Task 13–19 và test xuyên luồng của Task 20 |

Vì sao đau (nguyên nhân, đã kiểm): Vitest chạy e2e với `maxWorkers` mặc định = toàn bộ CPU khi không ở watch mode (tài liệu Vitest,
`docs/config/maxworkers.md`); máy này 12 luồng CPU → tới 12 tiến trình, mỗi tiến trình dựng một app Nest và chạy `prisma migrate deploy`
cho DB riêng. Hôm nay trên máy dev: 6 lần chạy e2e đầy đủ hoặc scale thì 4 lần hỏng hoặc bị hệ thống dừng vì RAM (2–6 GB trống / 31,6 GB,
29 tiến trình Claude ≈ 5,5 GB, VM Docker ≈ 9–10 GB). Chạy một mình: ~320 s, pass hết. Trên CI job `api` mất ~7 phút và chưa lần nào đỏ
vì RAM.

## 2. Phải đổi gì nếu làm A

| # | Chỗ | Đổi | Ghi chú |
|---|---|---|---|
| 1 | `.github/workflows/ci.yml` job `api` | Bỏ bước "E2E tests" (`pnpm test:e2e`) và "Scale check" (`pnpm test:e2e:scale`); đổi tên job (bỏ chữ "e2e") | Giữ service `postgres`: `pnpm db:setup` cần DB đã migrate để sinh TypedSQL. Ruleset `validate-before-merge-main` hiện không bắt buộc check nào theo tên, `dev` không có branch protection (đã kiểm) → đổi tên job không làm kẹt merge |
| 2 | Thay thế rẻ cho kiểm drift | Thêm một bước CI `prisma migrate diff --from-migrations … --to-schema-datamodel … --exit-code` (cần shadow DB: dùng chính service `postgres`) | Thay `test/common/schema-drift.e2e-spec.ts`. Lệnh và cờ chính xác phải kiểm lại theo Prisma 7.10 trước khi viết (`ASSUMPTION`) |
| 3 | `apps/api/test/**` | Xóa 72 file `*.e2e-spec.ts`, `test/setup/*-global-setup.ts`, `vitest.config.e2e.ts`, `vitest.config.e2e-scale.ts`, `test/support/isolated-database.ts`, `mailpit.ts` và helper chỉ e2e dùng | **Giữ** `test/support/create-test-app.ts` (+ các helper nó cần): 8 unit spec dùng nó với `databaseUrl: 'unused'` (`src/identity/**/*.controller.spec.ts`, `test/support/*.spec.ts`); `test/pipeline/export-routing.spec.ts` là unit spec dùng `supertest` |
| 4 | `apps/api/package.json` | Bỏ script `test:e2e`, `test:e2e:scale`; bỏ devDependency `testcontainers`, `@testcontainers/postgresql`, `@testcontainers/redis` | Giữ `supertest`. Cập nhật `pnpm-lock.yaml` |
| 5 | D28 (Bước 4 "Xong khi") | Hiện là "CI xanh + `pnpm smoke:buoc-4` qua API thật trên DB mới", trong đó CI gồm e2e (design §14 mục "Test và Xong khi", dòng 1: "e2e qua Testcontainers") | Quyết định mới (D38) + sửa design §14. Sau A, "test thành công" = CI (lint, typecheck, build, unit, kiểm drift) + smoke |
| 6 | Plan Bước 4 (đang chạy) | Test của Task 3–8, 13–19 là e2e; Task 20 có test xuyên luồng e2e, bước cổng `pnpm test:e2e; pnpm test:e2e:scale`, và hai phép đo (Review Focus 2, "từ hay sai") nằm trong file e2e | Xem mục 3 (thời điểm) |
| 7 | Luật `E:\Working\.claude\rules\verification.md` (áp cho mọi dự án trong `E:\Working`) | Luật không đòi bộ e2e mà đòi "chạy thật đầu-cuối, unit test qua thôi chưa đủ". Sau A, phần này chỉ còn smoke script và chạy tay | Luật vẫn giữ được; nhưng mỗi Bước phải có smoke script đủ rộng. Chạy đua và khóa thì smoke không kiểm được ổn định |
| 8 | `CLAUDE.md` của repo | Dòng CI/CD ("`ci.yml` (lint, typecheck, build, unit, e2e)"), đoạn Local setup nói "e2e global setup", các dòng số test | Hồ sơ as-built cũ (`docs/deliveries/*`) giữ nguyên, vì chúng ghi lại quá khứ |
| 9 | Cách viết plan/design từ Bước 5 | Bỏ "real Postgres through Testcontainers" khỏi Global Constraints; tiêu chí `B5#` chứng minh bằng unit (mock) hoặc smoke | Phần SQL, khóa, quyền không còn test tự động |
| 10 | Job `admin-e2e-real` | Không phải e2e của `apps/api` (là Playwright của admin chạy với API thật) | Chủ dự án chốt giữ hay bỏ. Giữ thì vẫn còn một lớp kiểm API thật cho các luồng admin |

## 3. Thời điểm (Bước 4 đang dở)

| Cách | Trade-off |
|---|---|
| T1: làm xong Bước 4 đúng plan (D2, E1, F vẫn có e2e, CI vẫn chạy e2e), rồi bỏ e2e trong một PR riêng `chore(api): remove backend e2e` | Bước 4 giữ nguyên D28; Practice (chạy đua, từ riêng) được kiểm trước khi xóa test; tốn thêm khoảng 2–3 lần CI ~7 phút; không cần chạy e2e đầy đủ trên máy |
| T2: bỏ ngay | Phải đổi D28 giữa Bước; bỏ phần lớn test của D2 #54, E1 và viết lại Task 20; module Practice vào `dev` mà không có test nào chạm DB |

**Đề xuất:** T1, và làm mục 2 (kiểm drift) cùng PR xóa để không mất lưới an toàn cho migration.

Còn một hướng nhẹ hơn (B, đã nêu ở lượt trước): giữ e2e trên CI, trên máy chỉ chạy file e2e của task, đặt `maxWorkers` thấp (ví dụ `4`)
cho lần chạy local. Hướng này giải quyết đúng chỗ đau (RAM máy dev) mà không mất các test trên. Ghi lại để chủ dự án cân nhắc; chủ dự án
đã chọn A.

## 4. Rủi ro còn lại nếu làm A

- Lỗi kiểu "worker không nhận job" của Bước 2 sẽ chỉ lộ khi chạy tay hoặc khi người dùng thật gặp.
- Thay đổi SQL (trần thẻ, "từ hay sai", lịch sử) chỉ được kiểm bằng smoke trên dữ liệu nhỏ.
- Kiểm quyền route admin mới không còn test tự động bắt "quên gắn quyền".
- Unit test có mock chỉ chứng minh code gọi đúng hàm mình tưởng, không chứng minh Postgres làm đúng điều mình tưởng.
