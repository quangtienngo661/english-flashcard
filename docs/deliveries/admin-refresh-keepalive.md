# Admin refresh keepalive — plan tóm tắt (15/10/2026)

Design: `docs/superpowers/specs/2026-10-15-admin-refresh-keepalive-design.md`. Plan chi tiết:
`docs/superpowers/plans/2026-10-15-admin-refresh-keepalive.md`. Điều tra: `docs/tasks/2026-10-15-refresh-fast-reload/report.md`.
Nhánh `fix/admin-refresh-keepalive`, PR xếp trên PR #23.

1. Viết test trước (unit cho từng đường refresh, một e2e API thật "rời trang giữa lúc refresh, 12 giây sau quay lại"), chạy
   e2e 3 lần trên code cũ để thấy đỏ, commit; rồi cho refresh của admin gửi với `keepalive`, chạy lại unit, lint, typecheck và
   bộ e2e thật cho xanh, commit.
2. Chạy tay một lần đường 429 (F5 14 lần) và đường rời trang trên code đã sửa, ghi as-built và trỏ các design cũ sang bản sửa
   này, rồi push và mở PR.

# Admin refresh keepalive — as-built (15/10/2026)

Nhánh `fix/admin-refresh-keepalive`, PR [#24](https://github.com/quangtienngo661/english-flashcard/pull/24) (base
`feat/ui-b-admin`, xếp trên PR #23). Chạy theo cách Native (chủ dự án chọn): phiên này tự làm 2 task theo TDD, một reviewer
mới kiểm cả nhánh ở cuối.

- `0e8df26` test: `Call.keepalive` trong `test-support.ts`; unit RKC1 (khởi động, sau 401, sau 403 `forbidden`, mọi lần thử
  lại sau 429 lúc khởi động và giữa phiên) và RKC2; e2e API thật RKC3 ngay sau B25#4.
- `64aea54` fix: `runRefresh()` gửi `{ ...json('POST', {}, this.csrf()), keepalive: true }`.

## Kiểm chứng

- Unit trước khi sửa: 4 test RKC1 đỏ (`expected [ undefined ] to deeply equal [ true ]`), RKC2 và 26 test cũ của file xanh.
  Sau khi sửa: file 31/31; cả bộ admin 286/286 với `--maxWorkers=3`; lint 0, typecheck 0.
- E2E API thật trên code cũ (API build từ worktree này, môi trường như job CI, DB mới mỗi lần, `CI=1`): RKC3 đỏ **3/3** lần,
  mỗi lần API ghi đúng 1 dòng `refresh_reuse_detected`; trang lúc lỗi là màn "Đăng nhập". Một lần chạy khác hỏng ở bước dựng
  tài khoản (`ECONNRESET` khi đăng ký, trước mọi test) nên không tính và chạy lại.
- E2E API thật trên code đã sửa: **8/8** test qua (gồm RKC3, B25#4, B25#6, B25#6a, B25#8 + B25E1), không có
  `refresh_reuse_detected`. Đối chứng trong DB: token do refresh lúc rời trang tạo ra (16:40:41.1) sống 12,06 s rồi được xoay
  bình thường khi quay lại.
- Chạy tay trên code đã sửa, không giả lập (`docs/tasks/2026-10-15-refresh-fast-reload/evidence/fixed-*.out`):
  - RKC4, F5 14 lần khi refresh đang chạy: `first 429 on last page; browser cookie row (id | rotated_at | grace_until): 601ff931 |  |`,
    `outcome: SIGNED IN`, `refresh_reuse_detected 0`.
  - Rời sang `about:blank` khi refresh đang chạy, quay lại sau 12 s: `SIGNED IN` 3/3; mỗi lần token trong cookie đúng là token
    do lần refresh lúc rời trang tạo ra.

## Lệch so với plan (ruling)

- Cổng 3000 và 5173 đang do server của worktree khác giữ (API `run:dev` và Vite dev của `gifted-booth-9229f5`); chủ dự án cho
  phép tắt, đã tắt bằng `taskkill /T`. Nếu còn cần, khởi động lại hai server đó.
- RKC3 đỏ ở dòng kiểm tiêu đề, không ở `toHaveURL` như plan dự kiến: ngay sau `goto('/uploads')` URL vẫn là `/uploads`, app
  mới chuyển về `/login` sau đó. Vẫn đỏ đúng lý do; giữ nguyên test.
- Một lần chạy cả bộ unit với số worker mặc định đỏ 1 test (`BatchPanel.test.tsx`, `findBy` hết giờ); chạy riêng 2/2 xanh, cả
  bộ với `--maxWorkers=3` 286/286. Đây là lỗi chập chờn do tải đã ghi ở `ui-refresh-b.md`.
- Log của bộ e2e thật để trong workspace của plan (git-ignored) thay vì `$TEMP`.
- PR mở trước commit tài liệu này để ghi được link PR.

## Còn mở

- Chỉ kiểm trên Chromium (RK5); mất mạng hoặc trình duyệt bị tắt giữa lúc refresh vẫn làm mất phiên (RKE4, phương án B).
- DB thử còn lại trên Postgres local: `english_learning_reload_repro` và các DB `keepalive_e2e_*` của lần chạy e2e (xóa được).
