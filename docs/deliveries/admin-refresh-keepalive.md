# Admin refresh keepalive — plan tóm tắt (15/10/2026)

Design: `docs/superpowers/specs/2026-10-15-admin-refresh-keepalive-design.md`. Plan chi tiết:
`docs/superpowers/plans/2026-10-15-admin-refresh-keepalive.md`. Điều tra: `docs/tasks/2026-10-15-refresh-fast-reload/report.md`.
Nhánh `fix/admin-refresh-keepalive`, PR xếp trên PR #23.

1. Viết test trước (unit cho từng đường refresh, một e2e API thật "rời trang giữa lúc refresh, 12 giây sau quay lại"), chạy
   e2e 3 lần trên code cũ để thấy đỏ, commit; rồi cho refresh của admin gửi với `keepalive`, chạy lại unit, lint, typecheck và
   bộ e2e thật cho xanh, commit.
2. Chạy tay một lần đường 429 (F5 14 lần) và đường rời trang trên code đã sửa, ghi as-built và trỏ các design cũ sang bản sửa
   này, rồi push và mở PR.
