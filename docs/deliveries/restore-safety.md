# Restore an toàn — plan tóm tắt (17/11/2026)

Plan: `docs/superpowers/plans/2026-11-17-restore-safety.md`. Design: `docs/superpowers/specs/2026-11-17-restore-safety-design.md`.
Quyết định: `docs/superpowers/decisions/2026-11-17-restore-safety-decisions.md`. Chưa có code.

Năm điểm plan làm rõ hoặc lệch design (R1–R5, bảng đầu plan) chờ chủ dự án duyệt cùng plan.

## M1 — API (sau khi PR #301 merge)

1. Sinh mã đơn theo thời gian: giây từ mốc 17/11/2026 × 100 + thứ tự trong giây, bắt đầu từ 1,1 tỷ.
2. Lấy mã trống kế tiếp trong giây hiện tại; đơn hỏng vì trùng mã không bị job đối soát hỏi lại.
3. Tạo đơn thử mã khác khi DB hoặc payOS báo trùng, tối đa 3 lần rồi mới 503.
4. Đơn chưa có link chỉ nhận tiền chuyển sau lúc tạo đơn (trừ hao 60 giây).
5. CLI `orders:probe-payos` liệt kê link payOS trong một khoảng thời gian, để staff ghép đơn sau restore.
6. Sửa smoke thanh toán theo mã mới, chạy smoke thanh toán và Bước 4 trên DB mới.

## M2 — Vận hành (sau khi PR #302 merge)

7. Image Postgres có WAL-G và chứng chỉ gốc, bật đẩy WAL lên R2 mỗi 60 giây; key WAL ở file riêng chỉ Postgres đọc.
8. Tách role: `wordmet_migrator` chạy migrate, `wordmet_app` cho API, worker, CLI; script tạo role chạy lại được.
9. Backup hằng ngày thêm base backup WAL-G, giữ 14 bản; cảnh báo khi WAL không lên R2 hoặc đĩa còn dưới 15 GB / 8 GB; dòng PITR trong báo cáo ngày.
10. Runbook restore (PITR, `pg_dump` vào cluster mới, rollback) và diễn tập đúng từng lệnh trên máy.

## M3 — Áp dụng trên VPS (ban đêm, có chủ dự án)

11. Chủ dự án tạo `walg.env` và mật khẩu role; chạy script role, restart, base backup đầu tiên, diễn tập restore từ R2 thật trên VPS.
