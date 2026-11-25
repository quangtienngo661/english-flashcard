# Runbook phục hồi khi mất VPS hoàn toàn

Tài liệu này dùng khi VPS production hiện tại không còn truy cập được hoặc hỏng ổ cứng hoàn toàn, cần dựng lại toàn bộ backend Wordmet (Caddy, API, worker, Postgres, Redis) trên một VPS mới từ bản sao lưu trên Cloudflare R2 và mật khẩu/secret đã lưu ngoài máy (password manager).

> **Thứ tự ưu tiên phục hồi (B12):**
> 1. **Luôn ưu tiên PITR (WAL-G)** từ `s3://wordmet-wal/spike` để chỉ mất tối đa ~60 giây dữ liệu gần nhất.
> 2. **Chỉ dùng `pg_dump` (trong `daily/` hoặc `deploy/`) khi PITR không thể dùng được** (hỏng WAL bucket hoặc không có base backup phù hợp). Nếu phải phục hồi từ dump, bắt buộc chạy `orders:probe-payos` cho khoảng `[thời điểm dump, thời điểm sự cố]` và cấp gói Pro thủ công (`entitlement_grants`) như đã diễn tập ngày 21/11/2026 (`docs/audit/2026-11-21-pitr-drill/README.md`).

> **Điều kiện tiên quyết (chủ dự án phải chuẩn bị trước sự cố — mục F6):**
> Ba file `/srv/wordmet/.env`, `/srv/wordmet/walg.env`, `/srv/wordmet/ops.env` và toàn bộ thông tin đăng nhập Cloudflare, R2, GitHub, payOS, Resend, Google đã được sao lưu an toàn trong password manager ngoài VPS.

---

## Quy trình 10 bước phục hồi trên VPS mới

### Bước 1. Tạo VPS mới (Ubuntu 24.04 LTS)

- Cấu hình khuyến nghị: **4 vCPU, 8 GB RAM, ≥ 80 GB SSD**, hệ điều hành **Ubuntu 24.04 LTS**.
- Tạo user quản trị không phải `root` (`deploy`, có quyền `sudo`) và gắn SSH public key. Giữ cấu hình SSH chỉ cho phép key (`/etc/ssh/sshd_config.d/00-hardening.conf`: `PasswordAuthentication no`, `PermitRootLogin prohibit-password`, theo [deploy/README.md](../../deploy/README.md)) vì GitHub Actions CD đăng nhập bằng `root` với forced-command key ở Bước 8.
- **Kết quả kỳ vọng:** SSH vào được IP mới (`ssh deploy@<NEW_VPS_IP>`), lệnh `lsb_release -ds` in ra `Ubuntu 24.04...`.

### Bước 2. Cài Docker và bật tường lửa `ufw` (chỉ mở cổng 22, 80, 443)

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status verbose
```

Đăng xuất SSH rồi đăng nhập lại để nhóm `docker` có hiệu lực.

- **Kết quả kỳ vọng:** `docker compose version` in `Docker Compose version v2...`; `sudo ufw status` hiển thị `Status: active` và chỉ mở `22/tcp`, `80/tcp`, `443/tcp`.

### Bước 3. Tạo thư mục vận hành và clone repo vào `/srv/wordmet/app`

```bash
sudo mkdir -p /srv/wordmet/{backups,logs,state}
sudo chown -R "$USER:$USER" /srv/wordmet
git clone https://github.com/quangtienngo661/english-flashcard.git /srv/wordmet/app
cd /srv/wordmet/app
git checkout main
```

- **Kết quả kỳ vọng:** `git rev-parse --short HEAD` khớp với commit đang chạy trên `origin/main`.

### Bước 4. Khôi phục 3 file secret (`.env`, `walg.env`, `ops.env`) từ password manager

Chép nội dung 3 file từ password manager vào `/srv/wordmet/.env`, `/srv/wordmet/walg.env`, `/srv/wordmet/ops.env`, rồi khóa quyền truy cập:

```bash
chmod 600 /srv/wordmet/.env /srv/wordmet/walg.env /srv/wordmet/ops.env
ls -la /srv/wordmet/*.env /srv/wordmet/.env
```

- **Kết quả kỳ vọng:** Quyền của cả 3 file đều là `-rw-------` (`600`), thuộc sở hữu user triển khai; `walg.env` trỏ đúng `WALG_S3_PREFIX=s3://wordmet-wal/spike`.

### Bước 5. Phục hồi Postgres bằng WAL-G PITR tới thời điểm mới nhất

Build image API/migrate và ghi SHA hiện tại vào `/srv/wordmet/state/current` (trên VPS trắng chưa có `current`, nếu bỏ bước này `API_TAG` sẽ mặc định là `none`), sau đó kiểm tra danh sách base backup trên R2:

```bash
cd /srv/wordmet/app
SHA="$(git rev-parse HEAD)"
printf '%s\n' "$SHA" > /srv/wordmet/state/current
docker build --quiet --target api-prod -t "wordmet-api:$SHA" .
docker build --quiet --target api-build -t "wordmet-api-migrate:$SHA" .
deploy/scripts/compose.sh build postgres

L="$(deploy/scripts/compose.sh run --rm --no-deps -T --entrypoint wal-g postgres backup-list)"
echo "$L"
echo "$L" | grep -c '^base_'
```

Chạy `backup-fetch` + `recovery.signal` (không đặt `recovery_target_time` để phát lại toàn bộ WAL mới nhất tới tận thời điểm mất VPS; chi tiết lệnh đầy đủ xem mục "Restore to a point in time (WAL-G)" trong [deploy/README.md](../../deploy/README.md)):

```bash
deploy/scripts/compose.sh run --rm --no-deps -T --entrypoint bash postgres -c '
  set -euo pipefail
  rm -rf /var/lib/postgresql/data/*
  wal-g backup-fetch /var/lib/postgresql/data LATEST
  touch /var/lib/postgresql/data/recovery.signal
  cat >> /var/lib/postgresql/data/postgresql.auto.conf <<EOF
restore_command = '\''wal-g wal-fetch "%f" "%p"'\''
recovery_target_action = '\''promote'\''
EOF
  chown -R postgres:postgres /var/lib/postgresql/data
  chmod 700 /var/lib/postgresql/data
'
deploy/scripts/compose.sh up -d postgres redis
```

Chờ Postgres hoàn tất phát lại WAL, thoát chế độ recovery, dọn cấu hình recovery, kiểm roles và áp dụng migration còn thiếu (lưu ý: cluster production **không** có role `postgres`, dùng `$POSTGRES_USER` / `$POSTGRES_DB` trong `/srv/wordmet/.env`):

```bash
U="$(grep -E '^POSTGRES_USER=' /srv/wordmet/.env | tail -n 1 | cut -d= -f2-)"
D="$(grep -E '^POSTGRES_DB=' /srv/wordmet/.env | tail -n 1 | cut -d= -f2-)"
deploy/scripts/compose.sh exec -T postgres psql -X -U "$U" -d "$D" -tAc "SELECT pg_is_in_recovery();"
deploy/scripts/compose.sh exec -T postgres psql -X -U "$U" -d "$D" \
  -c 'ALTER SYSTEM RESET restore_command' \
  -c 'ALTER SYSTEM RESET recovery_target_action'
deploy/scripts/db-roles.sh
deploy/scripts/compose.sh --profile migrate run --rm migrate
```

- **Kết quả kỳ vọng:** `wal-g backup-list` có ít nhất 1 dòng `base_...`; `SELECT pg_is_in_recovery();` trả về `f` (false); `db-roles.sh` in `left over: 0`; `migrate` thoát `0`.

### Bước 6. Phát lại Deletion Journal từ R2 (chạy 2 lần để kiểm chứng idempotent)

Giữ `api` và `worker` ở trạng thái dừng cho tới khi replay thành công:

```bash
deploy/scripts/compose.sh run --rm --no-deps -T api node dist/cli/accounts-deletions.js replay --journal
deploy/scripts/compose.sh run --rm --no-deps -T api node dist/cli/accounts-deletions.js replay --journal
```

- **Kết quả kỳ vọng:**
  - Lần 1: exit `0`, in `pending 0`.
  - Lần 2: exit `0`, in `replayed 0, ..., pending 0` (xác nhận toàn bộ tài khoản đã yêu cầu xóa đều đã bị xóa sạch khỏi DB vừa phục hồi).

### Bước 7. Khởi chạy toàn bộ stack (API, worker, Caddy), tạo base backup mới và cài lại cron

```bash
deploy/scripts/compose.sh up -d
deploy/scripts/compose.sh ps
BACKUP_KIND=deploy deploy/scripts/backup.sh
```

Cài lại các dòng cron của `watch.sh`, `backup.sh`, `run-maintenance.js` và `daily-report.sh` theo hướng dẫn mục cron trong [deploy/README.md](../../deploy/README.md).

- **Kết quả kỳ vọng:** Tất cả các service (`caddy`, `api`, `worker`, `postgres`, `redis`) ở trạng thái `Up (healthy)`.

### Bước 8. Trỏ DNS trên Cloudflare và cập nhật cấu hình SSH/CD trên GitHub

Trên Cloudflare Dashboard (DNS cho `wordmet.com`):
- Cập nhật bản ghi `A` của `api.wordmet.com` và `admin-api.wordmet.com` sang `<NEW_VPS_IP>` (giữ nguyên **grey cloud / DNS only**).

Cấp quyền SSH cho GitHub Actions CD trên VPS mới (theo [deploy/README.md](../../deploy/README.md), mục *Continuous deployment*):
- Workflow `.github/workflows/deploy-web.yml` đăng nhập SSH bằng user **`root`** (`root@$VPS_HOST`), **không phải** user quản trị `deploy` tạo ở Bước 1.
- Cài script wrapper `ci-deploy.sh` ngoài bản clone và khai báo `safe.directory` cho `root`:
  ```bash
  sudo install -d -m 755 /srv/wordmet/bin
  sudo install -m 755 /srv/wordmet/app/deploy/scripts/ci-deploy.sh /srv/wordmet/bin/
  sudo git config --global --add safe.directory /srv/wordmet/app
  ```
- Thêm nửa công khai (public half) của deploy key `VPS_SSH_KEY` (secret trong GitHub environment `deploy-env`) vào `/root/.ssh/authorized_keys` với tiền tố forced-command:
  ```text
  restrict,command="/srv/wordmet/bin/ci-deploy.sh" ssh-ed25519 <PUBLIC_KEY> github-actions-deploy@wordmet
  ```

Cập nhật **repository variables** trên GitHub (**Settings → Secrets and variables → Actions → Variables**, dùng qua `vars.VPS_HOST` và `vars.VPS_KNOWN_HOSTS` trong `.github/workflows/deploy-web.yml` — **không phải** Secrets):
- Cập nhật `VPS_HOST` (nếu dùng IP) sang `<NEW_VPS_IP>`.
- Thay `VPS_KNOWN_HOSTS` bằng SSH host key mới của VPS: chạy từ máy của chủ dự án lệnh `ssh-keyscan -t rsa <NEW_VPS_IP>`, đối chiếu fingerprint với `ssh-keygen -lf /etc/ssh/ssh_host_rsa_key.pub` trên VPS, rồi lưu vào `VPS_KNOWN_HOSTS`.

- **Kết quả kỳ vọng:** `dig +short api.wordmet.com` và `dig +short admin-api.wordmet.com` trả về `<NEW_VPS_IP>`; Caddy tự cấp chứng chỉ TLS Let's Encrypt thành công; `/root/.ssh/authorized_keys` có dòng `ci-deploy.sh` và hai repository variable `VPS_HOST`, `VPS_KNOWN_HOSTS` khớp với VPS mới.

### Bước 9. Chạy tay workflow `Deploy` trên GitHub Actions cho commit `main` hiện tại

Trên GitHub → **Actions** → workflow **Deploy** → **Run workflow** (nhánh `main`), để đồng bộ lại landing/admin trên Cloudflare Workers với API mới và đảm bảo cấu hình triển khai khớp SHA hiện tại.

- **Kết quả kỳ vọng:** Run workflow `Deploy` xanh hoàn toàn.

### Bước 10. Kiểm chứng sau phục hồi

1. **Health check:**
   ```bash
   curl -fsS https://api.wordmet.com/v1/health/ready
   ```
   - Kỳ vọng: `{"status":"ok","checks":{"database":"ok","redis":"ok"}}`.
2. **Đăng nhập thử:** Đăng nhập tài khoản kiểm thử trên `https://wordmet.com/vi/app` và kiểm tra một phiên học/ôn.
3. **Kiểm tra đơn payOS quanh mốc sự cố (đặc biệt nếu phải dùng `pg_dump`):**
   ```bash
   deploy/scripts/compose.sh exec -T api node dist/cli/orders-probe-payos.js \
     --from "<ISO_TRUOC_SU_CO>" --to "<ISO_SAU_SU_CO>"
   ```
   - Kỳ vọng: Thoát `0` không lỗi; nếu phát hiện đơn đã thanh toán trên payOS nhưng mất trong DB, đối chiếu chứng từ và cấp gói Pro thủ công qua màn hình Admin "Cấp gói" (`entitlement_grants`).
