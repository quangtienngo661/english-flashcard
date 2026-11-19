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

# Restore an toàn — as-built M1, M2 và M3 (17–18/11/2026)

M1 và M2 được dựng và diễn tập trên máy dev (Windows, Docker Desktop, kho S3 giả là SeaweedFS). M3 là lần đưa lên VPS thật và R2 thật, làm tay từng lệnh ngày 18/11/2026 (mục "M3 — as-built" bên dưới).

## Đã làm

| PR | Nội dung | Trạng thái |
|---|---|---|
| [#303](https://github.com/quangtienngo661/english-flashcard/pull/303) (`feat/restore-safety-orders`, M1, Task 1–6) | Mã đơn theo thời gian, thử lại 3 mã, khóa đơn trùng mã, luật "chưa link chỉ nhận tiền sau lúc tạo đơn", CLI `orders:probe-payos`, smoke | CI 4/4 xanh; merge vào nhánh của #301 (14:48 UTC 17/11, tài khoản chủ dự án), cùng #301 vào `dev` (03:45 UTC 18/11) |
| [#304](https://github.com/quangtienngo661/english-flashcard/pull/304) (`feat/restore-safety-ops`, M2, Task 7–10) | Image Postgres + WAL-G, tách role, backup/cảnh báo, runbook | Merge vào nhánh của #302 (02:37 UTC 18/11), cùng #302 vào `dev` (04:19 UTC 18/11) |
| [#307](https://github.com/quangtienngo661/english-flashcard/pull/307) (`dev` → `main`) | Cả đợt lên `main` | Chủ dự án merge 07:54 UTC 18/11, Deploy chạy, API và worker lên `cad0b96a` |
| [#309](https://github.com/quangtienngo661/english-flashcard/pull/309) | Đưa `main` ngược vào `dev` (cây thư mục không đổi) | Merge 15:49 UTC 18/11 |

Khác plan (đều ghi trong ledger lúc làm):
- Đơn trùng mã mang thêm `review_reason='provider-mismatch'` (không cần migration) để webhook cũng từ chối: lượt review cuối thấy webhook vẫn nhận được tiền cho đơn trùng mã. Hệ quả: admin hiện đơn đó là "cần xử lý" mà staff chưa xóa được; "Xác nhận thanh toán" thủ công xóa dấu này. Chủ dự án quyết để nguyên (18/11/2026).
- Ca timeout "job hủy link lạc" (LB1E18) giờ chỉ còn unit test, smoke bước `RS-collide` thay cho `LB1E17 + LB1E18`.
- Base backup chỉ chạy từ cron (chủ dự án quyết 18/11): `deploy.sh` đặt `BACKUP_SKIP_BASE=1`, nên WAL-G lỗi không chặn deploy và `retain FULL 14` đúng bằng 14 ngày.
- File output M2 tên `restore-safety-ops-output.txt` (khác `restore-safety-smoke-output.txt` của M1, để hai nhánh không xung đột khi gộp).
- Hai lỗi thật tìm ra khi diễn tập, không có trong design: WAL-G cần `PGDATABASE` khi tên database khác tên user; `ca-certificates` (đã biết từ R2 thật).

## Số đo

- M1: `pnpm test` API 373 file / 5.477 test pass; `tsc` sạch; `smoke:buoc-b-payments` 23/23 bước; `smoke:buoc-4` ALL CHECKS PASSED, mỗi lần trên DB mới (`restore-safety-smoke-output.txt`).
- M2: ba smoke (Bước 4, Bước 8, thanh toán) pass khi API và worker chạy bằng `wordmet_app`, 0 dòng `permission denied`; `db-roles.sh` `left over: 0` hai lần và sau 91 bảng migrate; 16 lần `backup.sh` giữ đúng 14 base backup; cảnh báo `archive` bắn khi tắt kho giả và hết khi bật lại; mất máy rồi restore về mốc T1: dữ liệu trước T1 còn, sau T1 không còn, 65 migration nguyên, archive tiếp trên timeline 2 (`restore-safety-ops-output.txt`).

## M3 — as-built (18/11/2026, VPS thật, R2 thật)

Chủ dự án cho phép Claude vào VPS (`ssh wordmet-vps`) và làm tay từng lệnh theo `deploy/README.md`, mục "Database roles and WAL-G (first rollout)". Log deploy: `/srv/wordmet/logs/m3-deploy.log` trên VPS.

| Bước README | Kết quả |
|---|---|
| 0. Tạm dừng CD, lấy code mới không deploy | Chủ dự án đặt `DEPLOY_PAUSED=true`; VPS checkout `05e4c68f` |
| 1. `walg.env`, biến role trong `.env` | Chủ dự án tạo `walg.env` và mật khẩu role. `.env` thiếu `MIGRATOR_DB_USER`; chủ dự án tự thêm dòng đó (Claude không đọc hay ghi `.env`), sau đó compose nạp được |
| 2. Build image Postgres | `wordmet-postgres:17-walg-3.0.9` build được trên VPS |
| 3. `db-roles.sh` | In `left over: 0`; script chạy trong vài giây, không đo chính xác thời gian khóa từng bảng |
| 4. Restart Postgres, API, worker | Postgres lên với `archive_mode=on`; API và worker đăng nhập bằng `wordmet_app`; 0 dòng `permission denied` / `must be owner` / `FATAL` trong log từ lúc đó. Không đo thời gian gián đoạn của lần restart; lúc đó chưa có người dùng thật |
| 5. `backup.sh` | Base backup WAL-G đầu tiên `base_000000010000000000000018` lên R2 |
| 6. `deploy.sh <sha>` | 06:43 UTC: migrate bằng `wordmet_migrator` ("No pending migrations", 65 migration), `state/current` = `05e4c68f` (trước đó `7ea091d3`) |

Sau đó chủ dự án đặt `DEPLOY_PAUSED=false` và merge #307; Deploy đưa `state/current` lên `cad0b96a`. Lúc 17:01 UTC 18/11, `pg_stat_archiver` ghi `archived_count=64`, `failed_count=0`, WAL cuối `000000010000000000000055`.

Hai điều gặp lúc làm:
- `.env` thiếu `MIGRATOR_DB_USER` làm compose từ chối `up`, `run`, `ps`, `logs` (README đã cảnh báo ca này), nên `watch.sh` chạy mỗi 5 phút sẽ lỗi cho tới khi thêm dòng đó. Không kiểm xem `watch.sh` có báo lỗi trong khoảng đó không.
- Design §6 ghi "deploy code trước, chưa đổi role"; thứ tự đã dùng là thứ tự README, và design đã được ghi chú as-built ở §6.

## Chưa kiểm

- **Restore từ R2 thật** (`wal-g backup-fetch` và replay WAL) chưa diễn tập, nên thời gian restore ở dung lượng production chưa đo. Việc kế tiếp.
- Mốc cron đầu tiên: base backup theo lịch (20:00 UTC) và dòng `PITR:` trong báo cáo ngày (01:00 UTC) chưa có lần chạy nào sau rollout; chưa có email cảnh báo `archive` hay `disk-low` nào được thấy.
- Thời gian khóa của `ALTER … OWNER` trên 91 bảng production: chỉ biết script xong trong vài giây.
- API và worker không chạy DDL lúc runtime vẫn là suy ra từ log sau rollout (không có `permission denied`), chưa phủ hết đường code hiếm.
- payOS thật: `231` khi trùng mã và HTTP 404 khi hỏi mã không tồn tại là giả định; CLI chưa chạy với payOS thật.
- Chưa có test trên Postgres thật cho hai đơn cùng giây cùng lúc; hơn 3 đơn đồng thời trong một giây có thể nhận 503.
- Smoke mới chưa được mutation-check; smoke không có ca đối chứng "job sẽ nhận đơn failed nếu `checked_at` rỗng".
- Chưa chạy: `accounts-deletions.js replay` với journal thật, restore về mốc cũ hơn base backup mới nhất, Compose cũ hơn 2.40, cái `watch.sh` báo khi `.env` thiếu biến role.
- `deploy/README.md`, mục "After a restore: payments", còn đoạn "Only until the time-based order codes are deployed" (và câu mở đầu nói M1 chưa deploy). M1 đã lên VPS cùng M2 (`05e4c68f`), nên đoạn đó hết hiệu lực; README chưa được sửa trong PR này.
