# Decisions — Restore an toàn: sao lưu liên tục, mã đơn không lặp, tách role DB

Ngày: 17/11/2026. Đi kèm design doc
[`../specs/2026-11-17-restore-safety-design.md`](../specs/2026-11-17-restore-safety-design.md). Bằng chứng:
[`../../audit/2026-11-17-db-roles-payment-restore.md`](../../audit/2026-11-17-db-roles-payment-restore.md).

**Nhãn:** ✅ = phương án được chọn. **Ai chốt:** "Chủ dự án" = chọn trực tiếp trong chat; "Đề xuất của Claude" = chủ dự án nhờ Claude đề
xuất ("bạn rec đi") rồi đồng ý ("có nhé"); "Duyệt cùng design" = Claude đề xuất trong design, chủ dự án đồng ý phần chứa nó.

Phiên này bỏ bước "chủ dự án trả lời trước" cho Q1–Q4 theo yêu cầu của chủ dự án.

## Tóm tắt

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| D1 | Cách xử lý dữ liệu mất khi restore | Hai tầng chung: PITR + mã đơn không lặp | Chủ dự án (hướng mở rộng được), Claude đề xuất hai tầng |
| D2 | Cách sinh mã đơn | Theo thời gian | Chủ dự án, cùng đề xuất của Claude |
| D3 | Công cụ PITR | WAL-G | Duyệt cùng design |
| D4 | Tách role DB | Đi cùng đợt này | Duyệt cùng design |
| D5 | Journal xóa tài khoản | Giữ; quyết lại sau khi diễn tập PITR | Duyệt cùng design |
| D6 | Giữ backup bao lâu (Q1) | 14 ngày | Đề xuất của Claude |
| D7 | `archive_timeout` (Q2) | 60 giây | Đề xuất của Claude |
| D8 | Áp dụng khi nào (Q3) | Ban đêm giờ Việt Nam, trước đợt mời đầu, sau khi PR A deploy | Đề xuất của Claude |
| D9 | Cảnh báo (Q4) | Email qua `send-alert.sh`; 15 phút / 20 file / 15 GB / 8 GB | Đề xuất của Claude |

## D1 — Cách xử lý dữ liệu mất khi restore

Bối cảnh: restore bản `pg_dump` hằng ngày làm mất mọi thứ sau giờ backup. Với thanh toán, đơn mất không tìm lại được chủ, và
`billing_order_code_seq` lùi lại làm job đối soát gắn tiền của người khác vào đơn mới. Ví dụ: backup 03:00, Bình mua Pro 10:00, VPS hỏng
14:00.

**Vòng 1 (Claude đề xuất A):**

| Phương án | Trade-off |
|---|---|
| A. Sửa code (đơn khớp link lạ → `needs_review`) + CLI dò payOS sau restore, staff ghép người bằng tay | Ít code, không thêm phụ thuộc vào luồng mua. Ghép người thủ công; việc tỉ lệ với số đơn trong khoảng mất |
| B. A + journal đơn hàng trên R2, restore thì dựng lại đơn | Tự động hoàn toàn. Thêm R2 vào đường mua (R2 lỗi thì không mua được hoặc thiếu bản ghi); thêm code và diễn tập |
| C. A + sao lưu WAL liên tục (PITR) | Khoảng mất còn vài phút cho mọi bảng. Thêm công cụ và vận hành; vẫn cần A cho vài phút cuối |

Chủ dự án: "nên thiết kế theo hướng scalable, chứ không phải giải quyết vấn đề đang có hiện tại".

**Vòng 2 (chủ dự án "ok chốt"):**

| Phương án | Trade-off |
|---|---|
| Journal riêng cho từng tính năng (xóa tài khoản, đơn hàng, …) | Mỗi luồng ghi mới lại cần journal, lệnh replay và diễn tập riêng: không mở rộng được |
| ✅ Hai tầng chung: (1) PITR cho mọi bảng; (2) mã đơn không bao giờ cấp lại, đối soát và webhook chỉ nhận link khớp | Tính năng mới tự được bảo vệ, không đụng đường mua. Thêm WAL-G, bucket, cảnh báo, diễn tập |

## D2 — Cách sinh mã đơn

| Phương án | Trade-off |
|---|---|
| Ngẫu nhiên trong dải 1 tỷ – ~34 tỷ (vừa `WM` + 7 ký tự) | Đơn giản. Đơn mất **không dò lại được** trên payOS |
| ✅ Theo thời gian: giây từ một mốc × 100 + thứ tự trong giây | Không lặp sau restore, dò lại được theo khoảng thời gian. Tối đa 100 đơn/giây; khoảng 10 năm phải đổi mốc |

## D3 — Công cụ PITR

| Phương án | Trade-off |
|---|---|
| ✅ WAL-G | Một file chạy, cấu hình bằng biến môi trường. Phải tự thêm vào image Postgres |
| pgBackRest | Có sẵn kiểm toàn vẹn. Nặng hơn, cấu hình nhiều hơn |

Chủ dự án cho tải WAL-G v3.0.9 (sha256 khớp) để dựng thử. Kiểm với kho giả và R2 thật: design §5.

## D4 — Tách role DB

Production chỉ có `wordmet` (bootstrap superuser, không hạ quyền được). Đề xuất: `wordmet` chỉ cho ops, `wordmet_migrator` sở hữu schema và
chạy migrate, `wordmet_app` chỉ đọc ghi dữ liệu cho API, worker, CLI. Gộp vào đợt này vì cùng sửa service `postgres` và quy trình restore, chỉ
restart Postgres một lần. Đã thử local: smoke Bước 4, 8 và thanh toán qua dưới `wordmet_app`.

## D5 — Journal xóa tài khoản

Giữ (PR #302). Bỏ hay giữ làm lớp thứ hai thì quyết sau khi PITR đã diễn tập trên VPS.

## D6 — Giữ backup bao lâu (Q1)

| Phương án | Trade-off |
|---|---|
| ✅ 14 ngày, bằng `KEEP_REMOTE=14` của `pg_dump` | Restore về xa nhất 14 ngày. Mỗi ngày giữ thêm tốn base backup + WAL của ngày đó; journal xóa tài khoản phải giữ ít nhất 14 ngày |

Claude chỉ đưa một đề xuất; không có phương án khác được trình bày.

## D7 — `archive_timeout` (Q2)

| Phương án | Trade-off |
|---|---|
| ✅ 60 giây | Mất máy thì mất tối đa ~1 phút. Khi R2 lỗi, `pg_wal` có thể tăng tới ~23 GB/ngày lúc bận liên tục |
| 300 giây | Mất tối đa ~5 phút. Khi R2 lỗi, ~4,6 GB/ngày |

## D8 — Áp dụng khi nào (Q3)

✅ Ban đêm giờ Việt Nam, trước đợt mời đầu tiên, sau khi PR A (#301) đã merge và deploy. Ngưng 5–10 phút. Bucket `wordmet-wal` và token đã
tạo 17/11/2026.

## D9 — Cảnh báo (Q4)

✅ Email qua `send-alert.sh`. Cảnh báo khi lần đẩy WAL thành công gần nhất cũ hơn 15 phút trong khi có WAL chờ; hơn 20 file `.ready`; đĩa
trống dưới 15 GB (cảnh báo) và dưới 8 GB (nghiêm trọng). Thêm một dòng PITR vào `daily-report.sh`. Không dựa vào `failed_count` vì WAL-G tự thử
lại trong một lần gọi nên số này đứng ở 0 khi kho lỗi (đo, design §5).

## Đề xuất kỹ thuật duyệt cùng design

- Bỏ phương án B (journal đơn hàng): thêm R2 vào đường mua.
- Image Postgres dựng trong repo, có `ca-certificates` và `PGUSER=wordmet` cho WAL-G (hai lỗi chỉ lộ ra khi thử với R2 thật).
- Giữ `pg_dump` hằng ngày làm bản thứ hai, độc lập công cụ.
