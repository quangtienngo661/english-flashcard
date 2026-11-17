# Restore an toàn: sao lưu liên tục, mã đơn không lặp, tách role DB — design

**Ngày:** 17/11/2026. **Trạng thái:** §7 đã chốt; WAL-G với R2 thật đã kiểm (§5). Chưa có code.
**Baseline:** `origin/dev` `e7acc0d9`; production chạy `7ea091d3`.
**Bằng chứng:** `docs/audit/2026-11-17-db-roles-payment-restore.md` (role DB, cơ chế lỗi thanh toán), §5 dưới đây (dựng thử PITR).
**Học lại vì sao:** `docs/learning/14-decisions-tradeoffs.md` mục 20.

## 1. Vấn đề

Backup hiện tại là `pg_dump` mỗi ngày (`deploy/scripts/backup.sh`). Restore bản đó làm mất mọi thứ từ giờ backup tới giờ hỏng, và gây hai lỗi
nghiêm trọng:

1. **Đơn mất không tìm lại được chủ.** payOS giữ tiền; SDK `@payos/node` 2.0.5 không liệt kê được link và không lưu người mua.
2. **Gắn tiền nhầm người.** `billing_order_code_seq` lùi lại; đơn mới trùng mã một link payOS cũ; tạo link thất bại → đơn `failed` không link →
   job đối soát (`claimForReconcile` lấy đơn `failed` không link trong 24 giờ) hỏi payOS bằng mã đó, nhận link cũ có giao dịch của người khác
   và `deliver` gắn vào đơn mới.

Thêm một rủi ro không liên quan tới restore nhưng đi cùng đợt: API, worker, migrate, backup đều dùng role `wordmet` (superuser).

Chủ dự án chốt hướng (17/11/2026): giải ở tầng chung, mở rộng được, không vá từng tính năng.

## 2. Phạm vi

| Trong | Ngoài |
|---|---|
| PITR bằng WAL-G lên R2 | Chuyển sang Postgres managed |
| Mã đơn theo thời gian; đối soát và webhook chỉ nhận link khớp | Đổi giao diện mua, giá, API cho web |
| CLI dò payOS cho vài phút cuối | Journal đơn hàng trên R2 (phương án B, đã bỏ) |
| Tách role `wordmet_migrator`, `wordmet_app` | Bỏ journal xóa tài khoản (quyết sau khi diễn tập PITR) |
| Runbook restore mới, cảnh báo đẩy WAL | Standby/replica, zero-downtime |

## 3. Thiết kế

### 3.1 PITR

- Image `postgres:17` + binary WAL-G (v3.0.9, sha256 kiểm) + gói `ca-certificates`, dựng trong repo (`deploy/postgres/Dockerfile`), không tải lúc chạy.
  `postgres:17` không có sẵn chứng chỉ gốc; thiếu gói này WAL-G không xác minh được TLS của R2 và thử lại mãi, không báo lỗi rõ (đo, §5).
- WAL-G kết nối Postgres bằng `PGUSER` (mặc định `postgres`, cluster này không có): đặt `PGUSER=wordmet` cho mọi lệnh `wal-g backup-push`.
- Postgres: `archive_mode=on`, `archive_command='wal-g wal-push %p'`, `archive_timeout=<§7 Q2>`. `wal_level` đã là `replica`.
- Bucket R2 riêng cho WAL và base backup, token chỉ quyền trên bucket đó; biến `WALG_S3_PREFIX`, `AWS_ENDPOINT`, `AWS_S3_FORCE_PATH_STYLE=true`,
  `AWS_REGION=auto`, khóa truy cập, `WALG_COMPRESSION_METHOD=brotli` trong `.env` của VPS.
- `backup.sh`: mỗi ngày `wal-g backup-push`, rồi `wal-g delete retain FULL <§7 Q1> --confirm`. `pg_dump` giữ lại làm bản thứ hai, độc lập công cụ.
- `watch.sh`: cảnh báo khi (a) tuổi lần đẩy thành công gần nhất (`now() - pg_stat_archiver.last_archived_time`) vượt ngưỡng trong khi có WAL chờ,
  hoặc (b) số file `pg_wal/archive_status/*.ready` vượt ngưỡng, hoặc (c) dung lượng đĩa còn dưới ngưỡng. **Không** dựa vào `failed_count` (§5).
- Restore: dừng API và worker → tạo volume mới → `wal-g backup-fetch … LATEST` → `recovery.signal` → khởi động với `restore_command='wal-g wal-fetch %f %p'`,
  `recovery_target_time` (hoặc đến cuối WAL) và `recovery_target_action=promote` → tạo role nếu là cluster mới (§3.3) → chạy lại script role → CLI §3.2 → mở app.

### 3.2 Mã đơn không lặp

- `code = ORDER_CODE_MIN + giây_kể_từ_mốc × 100 + k`, `k` 0–99 là thứ tự trong giây (lấy từ một sequence riêng `mod 100`). Mốc cố định trong code.
  Giới hạn: tối đa 100 đơn/giây; mã lớn nhất `ORDER_CODE_MAX` (34.359.738.367) đạt sau khoảng 10,6 năm.
- Tạo đơn: payOS báo mã đã dùng → đánh dấu đơn đó `failed`, thử mã mới, tối đa 3 lần, rồi mới 503.
- Đối soát và webhook: chỉ ghi nhận tiền khi `paymentLinkId` payOS trả về **bằng** link đã lưu trên đơn. Đơn chưa có link mà payOS có giao dịch, hoặc
  link khác → `needs_review/provider-mismatch`, không cấp Pro.
- CLI `orders:probe-payos --from <thời điểm> --to <thời điểm>`: tính dải mã của khoảng thời gian, hỏi payOS từng mã (bỏ qua `k` cao khi gặp liên tiếp
  không có), in đơn có tiền (mã, số tiền, thời điểm, tên người chuyển) để staff xác nhận bằng "Xác nhận thanh toán" có sẵn. Chỉ đọc payOS.

### 3.3 Tách role DB

Như đã thử (`docs/audit/2026-11-17-db-roles-payment-restore.md` §1): `wordmet` giữ cho ops; `wordmet_migrator` sở hữu schema, chạy migrate;
`wordmet_app` DML cho API, worker, CLI. Script idempotent `deploy/sql/roles.sql`; compose truyền `DATABASE_URL` riêng cho `migrate` và cho `api`/`worker`.

## 4. When → Then

| When | Then |
|---|---|
| R2 không nhận WAL | App vẫn ghi (đo); WAL dồn trong `pg_wal`; cảnh báo theo tuổi lần đẩy; khi R2 lại, WAL được đẩy bù (đo: 4 file trong ~3 s) |
| R2 lỗi kéo dài | `pg_wal` tăng tới khi đầy đĩa → Postgres dừng ghi. Ngưỡng cảnh báo đĩa phải báo trước nhiều giờ (§7 Q2 ảnh hưởng tốc độ tăng) |
| `docker stop postgres` khi R2 lỗi | Đo: tắt trong 2 s, checkpoint xong, WAL chưa đẩy giữ lại và được đẩy sau khi khởi động lại |
| Initdb lần đầu khi R2 chưa sẵn | Đo: container không khởi tạo được (archiver chặn lần tắt tạm của entrypoint). Lần áp dụng trên VPS không initdb nên không gặp; cluster mới thì bật archive sau initdb |
| Restore về thời điểm T | Đo: dữ liệu ≤ T còn, > T mất; timeline mới (2) và WAL timeline mới được đẩy tiếp |
| Restore về cuối WAL sau khi mất máy | Mất tối đa `archive_timeout` + thời gian đẩy; vài phút cuối dò bằng CLI §3.2 |
| Hai đơn trong cùng giây | `k` khác nhau; quá 100 đơn/giây → 503, thử lại |
| Đồng hồ VPS lùi (NTP chỉnh) | Mã có thể trùng mã đã cấp → payOS báo trùng → thử mã mới (§3.2) |
| Restore về T rồi tạo đơn | Mã theo thời gian hiện tại > mọi mã trước T, không trùng |
| Webhook của link cũ tới sau restore | Đơn có mã đó không tồn tại hoặc link khác → `needs_review`, không cấp |
| Migration lỡ chạy bằng `wordmet` | App `permission denied` trên bảng mới (đo); chạy lại script role sửa được (đo) |
| Restore sang cluster mới chưa có role | `pg_restore` thất bại (đo) → runbook tạo role trước |

## 5. Dựng thử PITR (17/11/2026)

Postgres 17.6 + WAL-G v3.0.9 (`wal-g-pg-22.04-amd64`, sha256 `4f03ee46…299f24` khớp), SeaweedFS làm S3, 65 migration thật, `archive_timeout=60`, brotli.

| Đo | Kết quả |
|---|---|
| Base backup DB vừa migrate | 2 s |
| Mất máy (xóa container và volume) → restore về T1 | 10 s (7 s tải base, 3 s phát lại + promote) |
| Đúng thời điểm | `before-base`, `m1-keep`, 200.000 dòng, 65 migration còn; dòng ghi sau T1 và lệnh xóa sau T1 không có; log `recovery stopping before commit … 09:12:43` |
| S3 ngừng 20 s | `failed_count` vẫn 0 (WAL-G tự thử lại trong một lần gọi); 3 file `.ready`; app ghi bình thường |
| S3 sống lại | backlog đẩy hết trong ~3 s, `archived` 2 → 6 |

Production (đọc 17/11, chỉ đọc): WAL **104 MB/ngày** (trung bình từ 14/11, gồm lúc nạp dữ liệu), DB 98 MB, `pg_dump` ~15 MB, đĩa trống 56 GB / 79 GB.

**R2 thật (17/11, bucket `wordmet-wal`, thư mục `spike/`, đã xóa sau khi thử):** cùng kịch bản, image thêm bộ chứng chỉ gốc.

| Đo | Kết quả |
|---|---|
| Lần đầu, image chưa có chứng chỉ | `wal-g backup-list` treo, gọi lại liên tục tới hết thời gian; `openssl` trong container: `unable to get local issuer certificate`. Cùng key, gọi ký tay từ container `node` trả 200 |
| Đẩy WAL | 5 file, 0 lỗi, 0 `.ready` còn lại |
| Base backup | 7 s; 31 MB → 3,6 MB sau nén brotli |
| Mất máy → restore về T1 | tải 9 s, phát lại + promote 14 s; `before-base`, `m1-keep`, 200.000 dòng còn; dòng và lệnh xóa sau T1 không có; timeline 2 đẩy tiếp 2 file, 0 lỗi |
| `wal-g delete everything FORCE --confirm` | xóa 13 object; liệt kê `spike/` còn 0 |

Path style và `AWS_REGION=auto` chạy được; không cần đặt `S3_ENABLE_VERSIONING`.

Ước tính (chưa đo trên R2): lượt ghi R2 ≤ 1.440/ngày (một file WAL mỗi phút có hoạt động) ≈ 43.000/tháng, trong mức miễn phí 1 triệu. Dung lượng
phụ thuộc tỉ lệ nén thật (bản thử nén cao vì dữ liệu tổng hợp) và §7 Q1. Restore production: base ~100 MB + WAL một ngày; dự kiến dưới vài phút,
`ASSUMPTION`.

## 6. Áp dụng trên VPS (một lần, khoảng vài phút gián đoạn)

1. Tạo bucket R2 và token (chủ dự án). 2. Deploy code có mã đơn mới và script role (chưa đổi role). 3. Chạy script role bằng `wordmet` (trực tuyến;
`ALTER … OWNER` khóa từng bảng rất ngắn). 4. Đổi `.env` (role, biến WAL-G) và image Postgres; restart Postgres, API, worker. 5. `wal-g backup-push`
lần đầu. 6. Kiểm `pg_stat_archiver`, cảnh báo, rồi diễn tập restore vào một container tách mạng từ R2 thật.
Rollback: trả image Postgres cũ và `DATABASE_URL` về `wordmet` (đo: chạy ngay).

## 7. Quyết định (chốt 17/11/2026; chủ dự án nhờ Claude đề xuất, rồi đồng ý cả bốn)

- **Q1. Giữ 14 ngày** (`wal-g delete retain FULL 14`), bằng `KEEP_REMOTE=14` của `pg_dump` đang có; `pg_dump` giữ làm bản thứ hai.
  Journal xóa tài khoản giữ ít nhất 14 ngày.
- **Q2. `archive_timeout = 60` giây.** Mất máy thì mất tối đa khoảng 1 phút dữ liệu. Giá phải trả: khi R2 lỗi, `pg_wal` có thể tăng tới ~23 GB/ngày
  lúc bận liên tục (300 s thì ~4,6 GB/ngày); ngưỡng đĩa ở Q4 bù cho điều này.
- **Q3. Áp dụng ban đêm giờ Việt Nam, trước đợt mời đầu tiên, sau khi PR A đã merge và deploy.** Ngưng 5–10 phút. Bucket WAL và token đã tạo (17/11).
- **Q4. Email qua `send-alert.sh`.** Cảnh báo khi: lần đẩy thành công gần nhất cũ hơn 15 phút trong khi có WAL chờ; hơn 20 file `.ready`;
  đĩa trống dưới 15 GB (cảnh báo) và dưới 8 GB (nghiêm trọng). Thêm một dòng PITR vào `daily-report.sh`.

## 8. Chưa xác minh

Tỉ lệ nén và dung lượng thật; thời gian restore ở kích thước production; payOS thật báo gì khi trùng
mã (mới có chú thích "231" trong `apps/api/src/entitlements/orders/orders.service.ts` và bản fake); `order-applier.service.ts` có chặn đủ link lạ
hay không (có so `paymentLinkId`, chưa kiểm mọi ca).
