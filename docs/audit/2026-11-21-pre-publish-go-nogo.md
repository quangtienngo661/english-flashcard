# Báo cáo Go/No-Go Trước Khi Public (2026-11-21)

- **Kết luận:** **GO** — Đủ điều kiện publish công khai cả **Free** và **Pro** trên `wordmet.com`.
- **Commit đang chạy trên production (`main`):** `d39b5a17cd78f370ff8c2ced342d19e965d12422` (PR #326, merge từ `dev` `5bfbcb62`).
- **Deploy workflow:** GitHub Actions `Deploy` run `44903774396` — **3/3 PASS** (VPS API + worker, Cloudflare `apps/web`, Cloudflare `apps/admin`).
- **Điểm đánh giá audit (v4 trên `d39b5a17`):** **7.53 / 10** (tăng từ 6.30 v1 → 6.40 v2 → 6.65 v3 → 7.53 v4).
- **Tài liệu tham chiếu:**
  - Thiết kế: `docs/superpowers/specs/2026-11-20-pre-publish-audit-design.md`
  - Quyết định (`D1–D13`): `docs/superpowers/decisions/2026-11-20-pre-publish-audit-decisions.md`
  - Kế hoạch thực thi: `docs/superpowers/plans/2026-11-21-pre-publish-hardening.md`

---

## 1. Bảng bằng chứng đã xác minh

| Hạng mục | Trạng thái | Bằng chứng xác minh (không PII/secret) |
|---|---|---|
| Hardening code & unit tests (PR #325) | **PASS** | CI 4/4 xanh (`api`, `web`, `admin`, `admin-e2e-real`); 644 file / 8,715 unit tests xanh; Argon review APPROVED. |
| Race & concurrency fixes (`F-03`, `F-04`) | **PASS** | Refresh–logout race: 0/20 sống sót; account deletion vs word-check/usage-ledger: 0 orphan row. |
| Billing reconcile & công tắc Pro (`F-05`, `F-11`, `F-12`, `D8`) | **PASS** | `needs_review/amount-short` đối soát 7 ngày; `failed` không link retry 24h/1h; toggle `entitlements.pro_checkout_enabled` trả `503 checkout-paused` + UI Web/Admin. |
| AI fallback khi provider lỗi (`F-08`, `D7`) | **PASS** | Tự rơi về câu hỏi rule cho cả phiên mixed và AI-only; vẫn giữ `403` cho lỗi quota/plan. |
| Bảo mật host, log & header (`F-06`, `F-07`, `F-10`) | **PASS** | `https://api.wordmet.com/v1/admin` trả `404`; `https://admin-api.wordmet.com/v1/admin/users` trả `401`; Caddy access log ẩn query nhạy cảm (đã dọn log cũ); HSTS bật trên cả 4 host (`max-age=15552000` trên web/admin, `31536000` trên api/admin-api, đều có `includeSubDomains`). |
| Worker health & cảnh báo billing (`F-09`) | **PASS** | VPS `wordmet-worker-1` trạng thái `healthy` (heartbeat file); `watch.sh` và `daily-report.sql` đã cập nhật. |
| Bảo vệ nhánh GitHub (`F-15`) | **PASS** | Ruleset `validate-before-merge-main` bảo vệ cả `main` và `dev` (`~DEFAULT_BRANCH`), yêu cầu 4/4 CI, strict up-to-date, không bypass. |
| Giao dịch payOS thật sau 18/11 (`F-02`) | **PASS** | Giao dịch thật gói Pro 1 tháng (79.000 VND) ngày 21/11/2026 dùng `orderCode` theo thời gian (`>= 1_100_000_000`), webhook thành công, lên Pro và đối chiếu khớp qua `orders:probe-payos`. |
| Google OAuth thật trên prod | **PASS** | Chủ dự án xác nhận hoạt động ổn trên production. |
| Email thật qua Resend/Gmail (`D5`) | **PASS** | 17 mẫu email gửi từ VPS `api` qua `smtp.resend.com` vào Gmail test; chủ dự án xác nhận ổn. |
| Tài khoản học & trang pháp lý (`D6`) | **PASS** | Chủ dự án xác nhận tài khoản học cá nhân còn nguyên dữ liệu và `/vi/privacy`, `/vi/terms`, `/vi/sources` ổn. |
| Ngưỡng tải (`D13`) | **PASS** | 30 burst: `p95 = 310.1 ms` (0/30 lỗi); 50 staggered: `p95 = 57.1 ms` (0/50 lỗi); 4 kết nối Postgres. |
| Diễn tập PITR từ R2 thật + chống hồi sinh (`D11`) | **PASS** | WAL-G `backup-fetch` (`10.28 s`) + PITR về `2026-11-21 04:00:00+00` (`20.77 s`, `archive_mode=off`); `accounts-deletions replay --journal` từ R2 `wordmet-deletion-journal` thật xóa lại tài khoản đã xóa sau mốc PITR (lần 1: `replayed 1, pending 0`; lần 2 idempotent: `replayed 0, without a users row 1, pending 0`; `users=0`, `deleted_accounts=1`); boot API `wordmet_app` trả `/v1/health/ready` `200 ok`; **RTO đo thực tế: 41.97 giây**, **RPO WAL-G: ~60 giây**. Đã diễn tập cấp bù Pro thủ công + kiểm tra chống cấp trùng, xóa sạch container/volume tạm local và file/token R2 read-only tạm. |

---

## 2. Rủi ro tồn đọng & hạng mục theo dõi sau khi publish

1. **payOS `code: 101` cho slot trống (phát hiện khi probe live 21/11 — không ảnh hưởng luồng mua bình thường):**
   - Khi hỏi một `orderCode` chưa từng tạo link, payOS trả HTTP `200` + `code: "101"` (*Mã thanh toán không tồn tại*) thay vì HTTP `404`.
   - Ảnh hưởng: `orders:probe-payos` dừng ở slot trống đầu tiên; `OrdersReconcileService` coi đơn `failed` chưa tạo link là lỗi tạm thời thay vì `null`.
   - **Hành động đề xuất (đợt bảo trì nhỏ tiếp theo):** thêm helper `isPayosNotFound` (~5 dòng) ở `apps/api/src/entitlements/billing/payos/payos.adapter.ts` và `apps/api/src/cli/orders-probe-payos.ts` kèm unit test.
2. **Rủi ro đã chấp nhận có chủ đích:**
   - `D3`: không có quy trình tự động khóa hoàn tiền/chargeback; hoàn tiền xử lý thủ công theo chính sách.
   - `D10`: giữ cơ chế auto-link Google cho tài khoản cùng email đã xác minh; chỉnh copy modal `/transactions` admin để đợt sau.
   - `D12`: đánh giá chất lượng AI eval tách khỏi cổng publish.
   - `D13`: hạ tầng 1 VPS chịu thoải mái ~30 burst / 50 đồng thời rải rác; theo dõi `watch.sh` và `daily-report.sql` khi lưu lượng tăng.
