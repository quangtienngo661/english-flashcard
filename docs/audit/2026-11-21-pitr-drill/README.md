# Diễn tập phục hồi PITR + Deletion Journal từ R2 thật (21/11/2026)

Bằng chứng gốc (đã ẩn toàn bộ UUID thành `<uuid>` và `operation_id` thành `<op>`): [pitr-drill-success.log](pitr-drill-success.log).

## 1. Bối cảnh và thiết lập

- **Ngày thực hiện:** 21/11/2026 (12:45 UTC / 19:45 giờ Việt Nam).
- **Môi trường:** Docker chạy trên máy local (Windows), **không** chạy trên VPS production.
- **Nguồn backup:** Cloudflare R2 thật, dùng token chỉ đọc (read-only), đọc từ prefix production `s3://wordmet-wal/spike` (base backup `base_000000010000000100000033`) và bucket Deletion Journal thật trên R2.
- **Mốc phục hồi mục tiêu (PITR target):** `2026-11-21 04:00:00+00`.
- **Dọn dẹp:** Sau diễn tập đã xóa toàn bộ container và volume local (`CLEANUP_CONTAINERS='' | CLEANUP_VOLUMES=''`).

## 2. Kết quả đo được (lần chạy thành công)

| Hạng mục | Kết quả đo được |
|---|---|
| `wal-g backup-fetch` (base backup `base_000000010000000100000033`) | **10,28 s** |
| Khởi chạy Postgres và promote PITR tới `2026-11-21 04:00:00+00` | **20,77 s** |
| Tài khoản đã xóa sau mốc target còn tồn tại trước khi replay | `DELETED_USER_PRESENT_BEFORE_REPLAY=1` |
| Replay Deletion Journal lần 1 (`accounts:replay-deletions --journal`) | `read 1 journal records and 0 file records`; `replayed 1, without a users row 0, pending 0` (exit `0`) |
| Replay Deletion Journal lần 2 (kiểm chứng idempotent) | `read 1 journal records and 0 file records`; `replayed 0, without a users row 1, pending 0` (exit `0`) |
| Trạng thái sau replay (`users \| deleted_accounts`) | `0 \| 1` |
| Khởi chạy API kết nối DB vừa restore & kiểm `/v1/health/ready` | `{"status":"ok","checks":{"database":"ok","redis":"ok"}}` |
| **RTO đầu-cuối (end-to-end)** | **41,97 s** |
| Diễn tập cấp gói Pro thủ công cho đơn sau mốc restore (`entitlement_grants`) | `GRANTS_BEFORE=0` → `GRANT_INSERTED=1` → `GRANTS_AFTER=1` |

## 3. Sáu lần thử trước đó (đều lỗi trước khi đạt lần chạy sạch)

| Lần thử (log gốc) | Nguyên nhân lỗi |
|---|---|
| `task-739` | Chỉ chạy tới bước promote PITR và đếm bảng (`users=8`, `published_senses=9820`, `migrations=65`); chưa chạy replay Deletion Journal hay khởi chạy API. |
| `task-744` | Chạy CLI `accounts-deletions` từ bản build cũ chưa hỗ trợ `--journal` (`REPLAY_RUN1_EXIT=1`), API không ready, và lệnh SQL thử `entitlement_grants` thiếu cột `granted_by_role` (`NOT NULL`). |
| `task-750` | Lỗi cú pháp `printf` trong script tạm `/tmp/fetch.sh` (`invalid format character`) sau khi `backup-fetch` hoàn tất (7,45 s). |
| `task-753` | API không lên được trạng thái ready (`API did not become ready`, lỗi load module Node.js khi khởi chạy). |
| `task-760` | `accounts-deletions` thoát `1` do thiếu các biến cấu hình bắt buộc (`JWT_KEYS`, `JWT_ISSUER`, `JWT_AUDIENCE`, `OTP_HMAC_KEY`, `RATE_LIMIT_HMAC_KEY`, `REFRESH_GRACE_KEY`, `TERMS_VERSION`). |
| `task-769` | `accounts-deletions` thoát `2` (`PrismaClientKnownRequestError P2022`) vì Prisma client / build chưa đồng bộ schema với DB vừa restore (1 bản ghi còn `pending`); API ready trong 40,83 s. |

## 4. Giới hạn của đợt diễn tập

- Chạy trên **máy local**, không phải trên VPS production thật hay một VPS trắng thứ hai (chưa đo thời gian cài Docker, clone repo, trỏ DNS hay tải ảnh mạng trên VPS).
- Prefix WAL-G production đang mang tên `s3://wordmet-wal/spike` (tên lịch sử từ giai đoạn thử nghiệm) — **tuyệt đối không xóa hoặc đổi tên** prefix này khi chưa có kế hoạch chuyển đổi base backup.
