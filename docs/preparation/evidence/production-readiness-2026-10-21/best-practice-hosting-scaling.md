# Best practice đưa SaaS nhỏ lên production, hosting cho người dùng Việt Nam, và playbook khi app bị nghẽn

Ghi chú nghiên cứu, viết 21/10/2026. Stack: NestJS API (Node 24) + một BullMQ worker riêng, PostgreSQL (Prisma 7.10 + `@prisma/adapter-pg`, TypedSQL, advisory lock cấp transaction), Redis (BullMQ), email giao dịch (OTP, nhắc học), gọi OpenAI/Anthropic ngay trong request (timeout 10 s). Landing/learner site Next.js chạy trên Cloudflare Workers, admin là SPA Vite. Một người làm, ngân sách nhỏ, người dùng chủ yếu ở Việt Nam, đợt đầu từ vài chục tới vài trăm người.

**Cách đọc.**
- Mỗi phát hiện kèm URL và ngày đọc. `[21/10]` nghĩa là đọc trong phiên này, ngày 21/10/2026.
- Giá lấy từ chính trang giá của nhà cung cấp, đọc ngày 21/10/2026, bằng USD, chưa gồm VAT, trừ khi ghi khác.
- **⚠ CŨ**: nguồn ra đời trước 2025, có thể đã lỗi thời.
- *(thứ cấp)*: nguồn từ bên thứ ba như hãng luật, blog hay trang so sánh.
- **Suy luận**: kết luận của người viết, không có nguồn nào nói thẳng.
- **ASSUMPTION**: giả định chưa kiểm được.
- Đây không phải tư vấn pháp lý.

**Kiểm tra trong code (21/10).** Mọi advisory lock trong `apps/api` đều là loại cấp transaction (`pg_advisory_xact_lock`, `pg_try_advisory_xact_lock`), không có lock cấp session: grep trong `apps/api/src` và `apps/api/prisma/sql`. Rate limiter đếm request trong bảng Postgres (`rateLimitCounter.upsert`, file `apps/api/src/common/rate-limit/rate-limiter.service.ts`), không lưu trong bộ nhớ của process.

---

## Q1. Checklist production-readiness mà các công ty dùng

### Takeaway
Các khung lớn (Google SRE PRR và launch checklist, AWS Well-Architected, Twelve-Factor, OWASP) hội tụ về cùng một lõi:
- cấu hình và secret nằm ngoài code;
- deploy nhỏ và đảo ngược được;
- đo được bốn "golden signals" và có alert;
- backup mà **đã thử restore**;
- giới hạn tải và xử lý lỗi của dịch vụ bên thứ ba;
- một quy trình xử lý sự cố.

Với đợt đầu vài trăm người dùng, bản tối thiểu (bảng dưới) gồm khoảng 12 việc. Phần lớn làm bằng free tier và tính năng sẵn có của nền tảng. SLO chính thức, IaC đầy đủ, feature flag, read replica và autoscaling để sau.

### Cited findings
- **Google SRE launch checklist** (Appendix E, "circa 2005", sách © 2017, ⚠ CŨ nhưng vẫn là tài liệu nền) có 10 nhóm câu hỏi: kiến trúc; máy và datacenter (N+2); ước lượng tải và capacity (có load test chưa); failover; monitoring ("Is the monitoring system itself monitored?"); security; automation và change control (canary); growth (dư capacity cho 10x chưa); external dependencies (degrade thế nào khi bên thứ ba lỗi); lịch rollout (có tránh launch thứ Hai/thứ Sáu không) — https://sre.google/sre-book/launch-checklist/ [21/10]
- **Production Readiness Review (PRR)** của Google SRE (⚠ CŨ, 2017): là "a process that identifies the reliability needs of a service". PRR xét: kiến trúc và dependency, instrumentation và monitoring ("Are all user-visible request failures well instrumented and monitored, with suitable alerting configured?"), emergency response, capacity planning, change management và performance — https://sre.google/sre-book/evolving-sre-engagement-model/ [21/10]
- **AWS Well-Architected** có 6 trụ: operational excellence, security, reliability, performance efficiency, cost optimization, sustainability — https://docs.aws.amazon.com/wellarchitected/latest/framework/the-pillars-of-the-framework.html [21/10]. Nguyên tắc của trụ Operational Excellence gồm: "Implement observability for actionable insights"; "Safely automate where possible" (định nghĩa cả workload "applications, infrastructure, configuration, and procedures" dưới dạng code); "Make frequent, small, reversible changes"; "Anticipate failure"; "Use managed services" — https://docs.aws.amazon.com/wellarchitected/latest/framework/oe-design-principles.html [21/10]
- **The Twelve-Factor App** (trang ghi "Last updated 2017", ⚠ CŨ). Các factor liên quan trực tiếp:
  - III Config: lưu trong env vars;
  - IV Backing services: DB, queue, cache là tài nguyên gắn vào, thay được;
  - VI Processes: stateless;
  - IX Disposability: khởi động nhanh, tắt gọn;
  - X Dev/prod parity;
  - XI Logs as event streams;
  - XII Admin processes: chạy một lần trong cùng môi trường, ví dụ migration.

  Nguồn: https://12factor.net/ [21/10]
- **OWASP Top 10:2025** đã ra ("Welcome to the OWASP Top 10:2025 Release"):
  - A01 Broken Access Control
  - A02 Security Misconfiguration
  - A03 Software Supply Chain Failures
  - A04 Cryptographic Failures
  - A05 Injection
  - A06 Insecure Design
  - A07 Authentication Failures
  - A08 Software or Data Integrity Failures
  - A09 Security Logging and Alerting Failures
  - A10 Mishandling of Exceptional Conditions

  Nguồn: https://top10.owasp.org/2025 [21/10]
- **OWASP ASVS** bản mới nhất là 5.0.0, "dated May 2025" — https://github.com/OWASP/ASVS [21/10]. Theo OWASP Developer Guide, L1 dùng cho bước đầu và kiểm tra tự động, L2 "for most applications", L3 cho hệ thống giá trị cao — https://devguide.owasp.org/en/03-requirements/05-asvs/ (chỉ thấy qua bản tóm tắt của kết quả tìm kiếm [21/10], chưa mở trang)
- **SLO** (SRE Workbook, ⚠ CŨ, 2018): SLI viết thành tỉ lệ sự kiện tốt trên tổng sự kiện. Với dịch vụ request/response, đo availability và latency theo ngưỡng, ví dụ "90% < 450 ms, 99% < 900 ms". Câu chính: "The most important goal is to get something in place and measured". Đặt target theo số đo hiện tại, cửa sổ 4 tuần, và cần một error budget policy viết thành văn bản — https://sre.google/workbook/implementing-slos/ [21/10]
- **Golden signals** (⚠ CŨ, 2017): "latency, traffic, errors, and saturation". Đo latency bằng histogram hoặc percentile, không dùng trung bình — https://sre.google/sre-book/monitoring-distributed-systems/ [21/10]
- **Backup và restore** (⚠ CŨ, 2017): "No one really wants to make backups; what people really want are restores." Thêm: "you only know that you can recover your recent state if you actually do so", nên cần thử restore định kỳ và tự động — https://sre.google/sre-book/data-integrity/ [21/10]
- **Incident** (⚠ CŨ, 2017):
  - tách vai trò: incident commander, ops, communications;
  - có một live incident document;
  - tuyên bố incident sớm, ví dụ khi khách hàng đã thấy lỗi hoặc sau khoảng 1 giờ chưa tìm ra nguyên nhân.

  Nguồn: https://sre.google/sre-book/managing-incidents/ [21/10]
- **Startup checklist**: Gruntwork "Production Readiness Checklist" gồm server-side, client-side, CI, CD, architecture, security, monitoring. Ví dụ "back up your database and test restoring". Bài viết ngày 15/05/2018, ⚠ CŨ — https://gruntwork.io/devops-checklist/ [21/10]
- **Secret scanning trên GitHub**: miễn phí cho repo public. Repo private thuộc organization cần "GitHub Secret Protection" trên Team hoặc Enterprise Cloud — https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning [21/10]
- **BullMQ production checklist**:
  - Redis bật persistence AOF;
  - `maxmemory-policy` = `noeviction` ("the **only** setting that guarantees the correct behavior of the queues");
  - worker đặt `maxRetriesPerRequest: null`;
  - bắt `uncaughtException` và `unhandledRejection`;
  - tắt gọn khi nhận SIGINT/SIGTERM;
  - gắn handler cho `error`.

  Nguồn: https://docs.bullmq.io/guide/going-to-production [21/10]; context7 `/websites/bullmq_io` [21/10]
- **DDoS và rate limit ở edge**: Cloudflare Free có "Standard, unmetered DDoS protection (layers 3-7)" — https://developers.cloudflare.com/ddos-protection/ [21/10]. Gói Free có **1** rate limiting rule, chỉ đếm theo IP, chu kỳ 10 s — https://developers.cloudflare.com/waf/rate-limiting-rules/ [21/10]
- **Load test**: k6 chia thành smoke, average-load, stress, soak, spike, breakpoint, và khuyên "Start with a smoke test" — https://grafana.com/docs/k6/latest/testing-guides/test-types/ [21/10]

### Bảng chưng cất: (a) tối thiểu cho đợt đầu, (b) làm sau
Cột (a) và (b) là **suy luận**, dựa trên các nguồn trên, quy mô vài trăm người dùng và một người vận hành.

| Hạng mục | (a) Tối thiểu trước đợt đầu | (b) Làm sau khi lớn lên | Nguồn chính |
|---|---|---|---|
| Môi trường | `production` + một `staging` nhỏ (DB riêng, secret riêng, cùng image) | Preview env cho mỗi PR | 12-factor X |
| IaC | File cấu hình của nền tảng trong repo, ví dụ blueprint hay `fly.toml` (**suy luận**, chưa kiểm docs từng nền tảng); runbook tạo lại hạ tầng | Terraform/OpenTofu đầy đủ | AWS OE "Safely automate" |
| CI/CD + migration | CI hiện có (lint, typecheck, build, unit, schema drift) + bước deploy. Bước `prisma migrate deploy` là release step chạy bằng **direct URL**. Migration theo kiểu expand → contract, để rollback code không cần rollback DB (**suy luận**) | Canary hoặc blue-green, rollback tự động | AWS "small, reversible changes"; Prisma PgBouncer docs (Q5) |
| Observability | Log JSON có `operation_id` (đã có); Sentry free cho lỗi; uptime check `/health` + **heartbeat cho worker**; alert qua email/Slack/điện thoại | Metrics/trace qua OpenTelemetry → Grafana Cloud; dashboard golden signals | SRE golden signals; Q4 |
| Backup / PITR | DB managed có PITR ≥ 7 ngày; thêm `pg_dump` hằng tuần ra nơi khác nhà cung cấp; **diễn tập restore trước launch** rồi hằng tháng; ghi RPO/RTO mục tiêu (ví dụ RPO ≤ 5 phút, RTO ≤ 2 giờ, **suy luận**) | Restore test tự động; backup khác region | SRE data integrity |
| Secrets | Env var hoặc secret store của nền tảng; tách secret staging và prod; quy trình xoay vòng key AI/SMTP | Secret manager riêng | 12-factor III |
| Dependency/secret scanning | Dependabot hoặc `pnpm audit` trong CI; secret scan trước khi push (repo đã có quy ước này) | SAST, SBOM | OWASP A03:2025 |
| WAF / DDoS / rate limit | Đưa API qua proxy Cloudflare (DDoS free); giữ rate limit theo user đang có trong app; 1 rule IP của Cloudflare cho `/auth/*` (**suy luận**) | WAF managed rules trả phí, bot management | Cloudflare docs |
| Bảo mật ứng dụng | Tự rà theo OWASP Top 10:2025, mục tiêu ASVS L1, hướng tới L2 | Pentest thuê ngoài | OWASP |
| Load test | k6 smoke + average-load + một lần stress ở khoảng 3× tải dự kiến trên staging có cùng cỡ máy (bội số 3× là **suy luận**) | Soak, spike định kỳ trong CI | k6 docs; Q5 |
| Incident runbook | 1 trang: cách kiểm tra, rollback, restore DB, tắt AI (công tắc AI đã có), liên hệ nhà cung cấp; mẫu postmortem | On-call rotation | SRE managing incidents |
| Status page | 1 status page free (UptimeRobot hoặc Better Stack) | Domain riêng, subscribe | Q4 |
| SLO | 1 SLO availability + 1 SLO latency, đo từ dữ liệu có sẵn, cửa sổ 4 tuần | Error budget policy chính thức | SRE workbook |
| Feature flags | Dùng admin-editable settings đã có làm kill switch (**suy luận**) | Hệ thống flag riêng | (không có nguồn) |
| Data privacy | Các việc pháp lý ở Q6 và file legal | DPO, audit | Q6 |

### Inferences
- Bộ khung chung cho bước đầu là golden signals, restore test, migration đảo ngược được và timeout/retry có giới hạn. Ba thứ hay bị bỏ quên nhất với một người vận hành:
  1. **Heartbeat cho worker.** Worker chết thì API vẫn trả 200, uptime check không thấy.
  2. **Diễn tập restore.**
  3. **Giới hạn số kết nối DB** (Q5).
- Repo đã có một phần: Problem Details, `operation_id` trong log, rate limit theo user, idempotency, công tắc AI và trần AI mỗi ngày (theo CLAUDE.md). Những gì **chưa thấy**: staging, PITR, uptime/heartbeat, Sentry, runbook, status page. Mục này chưa kiểm kỹ trong repo; xem các file cùng thư mục `api-production-readiness.md` và `launch-completeness.md`.

### Gaps
- Chưa mở trang ASVS 5.0 chính thức về định nghĩa L1/L2/L3 (link GitHub 404). Mô tả các level ở trên lấy từ kết quả tìm kiếm.
- Không tìm được một "startup launch checklist" nổi tiếng nào ra đời sau 2025.
- Không kiểm docs blueprint/IaC của từng nền tảng.

---

## Q2. Hosting cho stack này, region Singapore hoặc Việt Nam

### Takeaway
Ở quy mô đợt đầu, các PaaS có region Singapore (**Render, Railway, DigitalOcean**) chạy được đủ 4 thành phần (API, worker, Postgres có PITR, Redis đặt được `noeviction`) với khoảng **15–70 USD/tháng**. GCP và AWS bản đầy đủ đắt và phức tạp hơn nhiều ở cỡ này. Hetzner Singapore rẻ nhất tính theo tài nguyên nhưng không có managed DB.

Cloud Việt Nam (VNG/GreenNode, BizFly, FPT, Viettel IDC) có managed PostgreSQL và Redis, dữ liệu nằm trong nước. Đổi lại, giá công khai rất ít (FPT báo giá theo yêu cầu) và tính năng PITR chưa xác minh được. Có hai cạm bẫy riêng của stack này:
1. Redis phải đặt được `maxmemory-policy=noeviction`.
2. Upstash pay-as-you-go tính tiền theo từng lệnh, mà BullMQ gửi lệnh cả khi rảnh.

### Cited findings — giá và tính năng (đọc 21/10/2026)

**Railway**
- Hobby $5/tháng, gồm $5 usage. Pro $20/tháng, gồm $20 usage. Usage tính theo giây: vCPU ≈ $20/vCPU-tháng, RAM ≈ $10/GB-tháng, volume $0.15/GB-tháng, egress $0.05/GB — https://railway.com/pricing [21/10]
- Có region "Southeast Asia Metal: Singapore (`asia-southeast1-eqsg3a`)". Trang không nói gói nào được dùng region này — https://docs.railway.com/reference/deployment-regions [21/10]
- Postgres mặc định là "a single node that Railway maintains", không HA, chạy image dựa trên image Postgres chính thức. Có PgBouncer và có thể chuyển sang HA (Patroni) — https://docs.railway.com/guides/postgresql [21/10]
- Backup volume: daily giữ 6 ngày, weekly giữ 27 ngày, monthly giữ 89 ngày, giá như volume — https://docs.railway.com/reference/backups [21/10]
- PITR phải bật thủ công. Cơ chế là pgBackRest đẩy WAL lên bucket. Cửa sổ khôi phục "roughly 4 weeks", chỉ tính từ base backup đầu tiên sau khi bật. Restore tạo một service mới và **không** ghi đè service cũ. Không có phí PITR riêng, chỉ trả storage và egress — https://docs.railway.com/volumes/point-in-time-recovery [21/10]

**Render**
- Workspace: Hobby $0, Pro $25/tháng, Scale $499/tháng — https://render.com/pricing [21/10]
- Compute, đọc từ dữ liệu bảng nhúng trong HTML trang giá: Starter $7/tháng (512 MB, 0.5 CPU); Standard $25/tháng (2 GB, 1 CPU) — https://render.com/pricing [21/10]
- Postgres:
  - Free: 30 ngày, 256 MB, 100 connections;
  - **Basic-256mb $6/tháng** (0.1 CPU, **100 connections**);
  - Basic-1gb $19/tháng (0.5 CPU, 100 connections);
  - storage $0.30/GB.

  Nguồn: https://render.com/pricing [21/10]
- Key Value: Free 25 MB; từ $10/tháng cho 256 MB, 200–250 connections. Trang có hai bảng hơi khác nhau. Nguồn: https://render.com/pricing [21/10]
- **PITR**: workspace Hobby giữ 3 ngày, Pro trở lên 7 ngày. "Render does not provide recovery capabilities for databases on the Free compute plan." Logical backup giữ 7 ngày — https://render.com/docs/postgresql-backups [21/10]
- Có region Singapore — https://render.com/docs/regions [21/10]
- Key Value mới tạo chạy Valkey 8. Có persistence trên gói trả phí. Đặt được `noeviction`, và docs khuyên "For job queues, we recommend using `noeviction`" — https://render.com/docs/key-value [21/10]

**Fly.io**
- shared-cpu-1x: 256 MB $2.19 và 512 MB $3.69 (giá region rẻ nhất); 1 GB **$8.50 ở `sin`**. Volume $0.15/GB. Egress châu Á–Thái Bình Dương $0.04/GB. Không có free tier cho tổ chức mới — https://docs.fly.io/about/pricing [21/10]
- Managed Postgres: Basic (shared-2x, 1 GB) **$38/tháng**, Starter (2 GB) $72; storage $0.28/GB. Trang ghi "All plans include high availability, backups, and connection pooling" nhưng không nêu thời gian giữ backup hay PITR — https://docs.fly.io/mpg [21/10]
- MPG có mặt ở `sin` từ 10/09/2025 theo forum — https://community.fly.io/t/managed-postgres-additional-region-support-ams-nrt-sin-sjc/25882 [21/10]. Trang docs có thể chưa cập nhật điều này.

**DigitalOcean**
- Managed PostgreSQL nhỏ nhất **$15.15/tháng** (1 GiB, 1 vCPU, 10 GiB) — https://www.digitalocean.com/pricing/managed-databases [21/10]
- Managed Valkey nhỏ nhất $15/tháng (1 GiB) — https://www.digitalocean.com/pricing/managed-databases [21/10]
- Gói PG 1 GiB chỉ có **22 backend connections**; 2 GiB có 47. Mỗi cluster có 21 PgBouncer pool và tối đa 1.000 kết nối tùy gói — https://docs.digitalocean.com/products/databases/postgresql/details/limits/ [21/10]
- Backup đầy đủ hằng ngày + WAL, "restore to any point-in-time within the previous seven days" — https://docs.digitalocean.com/products/databases/postgresql/details/features/ [21/10]
- Valkey có `noeviction` và đó là mặc định — https://docs.digitalocean.com/products/databases/valkey/how-to/choose-eviction-policies/ [21/10]
- Droplet: $4 (512 MiB), $6 (1 GiB), $12 (2 GiB). Backup weekly +20%, daily +30% — https://www.digitalocean.com/pricing/droplets [21/10]
- App Platform: $5 (512 MiB, cố định 1 instance), $10/$12 (1 GiB), $25 (2 GiB); dev DB $7 — https://www.digitalocean.com/pricing/app-platform [21/10]
- SGP1 có Droplets, App Platform, Managed PostgreSQL và Managed Valkey — https://docs.digitalocean.com/platform/regional-availability/ [21/10]

**AWS**
- Lightsail instance: $5 (0.5 GB, IPv4), $3.50 (IPv6-only) — https://aws.amazon.com/lightsail/pricing/ [21/10]
- Lightsail managed DB: $15 (1 GB, 40 GB) bản standard, $30 bản HA. Trang giá ghi gói $15 là **"No data encryption"** — https://aws.amazon.com/lightsail/pricing/ [21/10]
- Lightsail container: Nano $7, Micro $10 — https://aws.amazon.com/lightsail/pricing/ [21/10]
- Lightsail DB có PITR "in 5-minute increments, and for the previous seven days", restore ra một DB mới — https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-creating-a-database-from-point-in-time-backup.html [21/10]
- RDS PostgreSQL Singapore: `db.t4g.micro` Single-AZ **$0.025/giờ** (≈ $18.25/tháng, quy đổi 730 giờ là **suy luận**); `db.t4g.small` $0.051/giờ; gp3 $0.138/GB-tháng — file giá công khai https://b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps/rds/USD/current/rds-postgresql-ondemand.json (bản phát hành 2026-10-20) và `.../rds/USD/current/rds-storage.json` [21/10]
- RDS free tier: 750 giờ, 20 GB, 12 tháng — https://aws.amazon.com/rds/postgresql/pricing/ [21/10]
- ElastiCache Singapore: `cache.t4g.micro` Valkey **$0.0192/giờ** (≈ $14/tháng, **suy luận**) — https://b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps/elasticache/USD/current/elasticache.json (bản 2026-10-14) [21/10]

**Google Cloud**
- Cloud Run: Singapore (`asia-southeast1`) thuộc nhóm giá **Tier 2**. Bảng tĩnh chỉ hiện giá region mặc định: instance-based $0.000018/vCPU-giây và $0.000002/GiB-giây. Free tier gồm 240.000 vCPU-giây và 450.000 GiB-giây mỗi tháng, áp theo giá Tier 1 — https://cloud.google.com/run/pricing [21/10]
- Cloud SQL `db-f1-micro` $0.0105/giờ (giá region mặc định). "Shared CPU machine types … are not covered by the Cloud SQL SLA" — https://cloud.google.com/sql/pricing [21/10]
- `max_connections` mặc định: "tiny (~0.5)" 25, "small (~1.7)" 50 — https://docs.cloud.google.com/sql/docs/postgres/flags [21/10]
- Backup tự động giữ mặc định 7 bản, chỉnh được từ 1 đến 365 — https://docs.cloud.google.com/sql/docs/postgres/backup-recovery/backups [21/10]
- Memorystore for Valkey `shared-core-nano` (1.4 GB) $0.0318/giờ, giá region mặc định — https://cloud.google.com/memorystore/docs/valkey/pricing [21/10]

**Hetzner**
- Có location Singapore, cloud tại đây từ 2024 — https://www.hetzner.com/cloud/ [21/10]
- Trang Singapore liệt kê CPX12 (1 vCPU, 2 GB, 40 GB) **€15.99/tháng** và CCX13 €54.49. Traffic gồm "0.5 TB to 5 TB" tùy gói, vượt thì $8.49/TB. Trang **không có managed database** — https://www.hetzner.com/cloud-singapore/ [21/10]

**Neon** (Postgres serverless)
- Free: 100 CU-giờ/project, history 6 giờ.
- Launch: $0.106/CU-giờ, $0.35/GB-tháng, instant restore $0.20/GB-tháng, history tối đa 7 ngày.
- Scale: $0.222/CU-giờ, history tối đa 30 ngày.

Nguồn: https://neon.com/pricing [21/10]
- Có `aws-ap-southeast-1` (Singapore) — https://neon.com/docs/introduction/regions [21/10]
- Compute 0.25 CU có `max_connections` 104, trong đó 97 dành cho app. Pooler là PgBouncer **transaction mode**, tối đa 10.000 client — https://neon.com/docs/connect/connection-pooling [21/10]

**Supabase**
- Free: 500 MB, không backup, "paused after 1 week of inactivity".
- Pro: từ $25/tháng, gồm $10 compute credit; backup hằng ngày giữ 7 ngày; **PITR là add-on $100/tháng cho mỗi 7 ngày**.

Nguồn: https://supabase.com/pricing [21/10]
- Compute Micro ≈ $10 (1 GB): 60 kết nối trực tiếp, pooler 200 client. Small ≈ $15 (2 GB): 90 kết nối trực tiếp, pooler 400 — https://supabase.com/docs/guides/platform/compute-and-disk [21/10]
- Có `ap-southeast-1` (Singapore) — https://supabase.com/docs/guides/platform/regions [21/10]

**Upstash Redis và BullMQ**
- Free: 500K lệnh/tháng.
- Pay-as-you-go: **$0.20 cho 100K lệnh**.
- **Fixed 250 MB $10/tháng**, không tính theo số lệnh, tối đa 10.000 ops/s.

Nguồn: https://upstash.com/pricing/redis [21/10]
- Docs Upstash: "BullMQ accesses Redis regularly, even when there is no queue activity … we recommend switching to a Fixed plan" — https://upstash.com/docs/redis/integrations/bullmq [21/10]
- Docs BullMQ yêu cầu Redis ≥ 6.2 và nói "not all the alternatives are going to work properly" — https://docs.bullmq.io/guide/redis-tm-compatibility [21/10]

**Cloud Việt Nam**
- **VNG Cloud / GreenNode vDB**. Docs đã chuyển sang `docs.greennode.ai`.
  - PostgreSQL bản Single (12–15) và Cluster (15–17); Redis 4.0–7.2.
  - Backup hằng ngày (Single); hourly/daily/weekly/monthly (Cluster).
  - Region HCM (3 zone) và HAN (chỉ PostgreSQL Cluster).
  - Không nói về PITR và không có link giá.

  Nguồn: https://docs.greennode.ai/vdb [21/10]
- **BizFly Cloud Database**: có MariaDB, MongoDB, Redis, PostgreSQL; backup thủ công và tự động; có mô hình Stand-alone và Cluster. Không nói về PITR — https://bizflycloud.vn/cloud-database [21/10]
  - Bảng giá, chưa gồm 10% VAT, **không ghi engine**: gói 1 (1 core, 1 GB, 20 GB) giá **424.800 / 590.400 / 849.600 VND/tháng** cho ba tab Premium/Enterprise/Dedicated. Ghép giá với tab là suy luận của bộ tóm tắt — https://bizflycloud.vn/cloud-database/bang-gia [21/10]
- **FPT Cloud**: "FPT Relational Database Engine" hỗ trợ PostgreSQL, có backup theo lịch, "khôi phục … theo từng thời điểm", HA bằng node dự phòng. **Giá chỉ báo theo yêu cầu**: "vui lòng liên hệ với bộ phận kinh doanh" — https://fptcloud.com/product/fpt-relational-database-engine/ [21/10]. Redis nằm trong "FPT Non-Relational Database Engine" — https://fptcloud.com/ [21/10]
- **Viettel IDC**: chỉ tìm được bài báo năm 2020 về StartDB, gọi là "dịch vụ database điện toán đám mây đầu tiên của Việt Nam" (⚠ CŨ, *(thứ cấp)*) — https://thanhtra.com.vn/dau-tu-72A9E3223/viettel-go-kho-cho-doanh-nghiep-bang-dich-vu-database-dien-toan-dam-may-dau-tien-cua-viet-nam-0EE71F53.html (chỉ thấy qua bản tóm tắt của kết quả tìm kiếm [21/10]). Trang viettelidc.com.vn không tải được nội dung.

### Bảng so sánh managed Postgres: backup, PITR, giới hạn kết nối ở gói nhỏ nhất

| Nhà cung cấp (region) | Gói PG nhỏ nhất | Backup tự động | PITR | Kết nối ở gói nhỏ nhất |
|---|---|---|---|---|
| Railway (SG) | Theo usage | Volume backup daily/weekly/monthly | Có, phải bật, ~4 tuần | Không nêu. ~100 nếu giữ mặc định Postgres (**suy luận**) |
| Render (SG) | Basic-256mb $6 | Logical 7 ngày | 3 ngày (Hobby) / 7 ngày (Pro) | 100 |
| Fly MPG (sin) | Basic $38 | "backups" | Không nêu | Không nêu |
| DigitalOcean (SGP1) | $15.15 | Hằng ngày | 7 ngày | **22** (1 GiB) |
| Lightsail (SG) | $15 | Có | 7 ngày, bước 5 phút | Không đọc |
| RDS (SG) | t4g.micro ≈ $18 + storage | Không đọc trong phiên | Không đọc trong phiên | Không đọc |
| Cloud SQL | f1-micro ≈ $7.7 + storage (region mặc định) | 7 bản | Mặc định chưa rõ | **25** |
| Neon (SG) | Theo CU-giờ | — | History 6 giờ (Free) / 7 ngày (Launch) | 104 (0.25 CU), pooler 10.000 |
| Supabase (SG) | Pro $25 (Micro) | 7 ngày | Add-on $100/7 ngày | 60, pooler 200 |
| Hetzner (SG) | Không có managed DB | — | — | — |
| VNG/GreenNode vDB | Giá không công khai | Có | Không nêu | Không nêu |
| BizFly | 424.800 VND+ (engine không rõ) | Có | Không nêu | Không nêu |
| FPT | Báo giá theo yêu cầu | Có | Có ("theo từng thời điểm") | Không nêu |

### Inferences — ước tính chi phí tháng cho đủ API + worker + PG + Redis (**suy luận**, chưa gồm egress hay email)
- **Railway SG** ≈ $10–20. Giả sử tổng RAM trung bình 1–1.2 GB và CPU rất thấp.
  - Ưu điểm: rẻ nhất trong nhóm managed; PITR khoảng 4 tuần không tính phí riêng.
  - Nhược điểm: Postgres là một node do Railway trông, mức "managed" thấp hơn; tiền thay đổi theo usage; chưa rõ gói nào được dùng region Singapore.
- **Render SG** ≈ $31 trên Hobby (Starter $7 ×2 + Basic-256mb $6 + Key Value $10, chưa tính storage). Lên ≈ $45 nếu dùng Basic-1gb $19, và cộng $25 nếu lên Pro để có PITR 7 ngày.
  - Ưu điểm: đủ tính năng managed (PITR, `noeviction`, 100 kết nối) với ít công vận hành nhất.
  - Nhược điểm: Basic-256mb chỉ có 0.1 CPU, dễ thành nút cổ chai. Giá background worker ngang web service là **ASSUMPTION**.
- **DigitalOcean SGP1** ≈ $36–55 (Droplet $6 hoặc App Platform $5–12 cho API và worker, + PG $15.15 + Valkey $15).
  - Ưu điểm: PITR 7 ngày; Valkey mặc định `noeviction`.
  - Nhược điểm: **22 kết nối** ở gói 1 GiB. Prisma 7 mặc định mở pool 10 kết nối mỗi process, nên API ×2 cộng worker là đã vượt (Q5). Phải dùng PgBouncer pool của DO hoặc hạ `max`.
- **AWS Lightsail SG** ≈ $25–35. Gói DB $15 "No data encryption", và không thấy Redis managed trong Lightsail (chưa kiểm), nên phải tự chạy Redis. **AWS đầy đủ** (RDS + ElastiCache + Fargate/ECS + ALB) ≥ $35 chỉ riêng DB và cache, chưa có compute và ALB.
- **GCP**: worker BullMQ phải chạy liên tục. Một vCPU chạy suốt ở giá region mặc định ≈ $47/tháng chỉ riêng CPU, và Singapore là Tier 2 nên còn đắt hơn. Không hợp ngân sách.
- **Fly sin** ≈ $55–65 (MPG Basic $38 + 2 máy 1 GB × $8.50 + Upstash Fixed $10).
- **Hetzner SG** €15.99 tự chạy tất cả bằng Docker Compose. Rẻ, nhưng bạn tự làm DBA: tự backup, tự lo PITR, tự vá lỗi. Không hợp người làm một mình nếu chưa có quy trình restore.
- **Cloud VN**: lợi về luật (Q6) và về độ trễ, không phụ thuộc cáp biển (Q6). Nhưng giá khó so, PITR và giới hạn kết nối chưa xác minh, và cần liên hệ sales.
- **Neon/Supabase** dùng làm DB riêng ghép với compute ở nơi khác. Neon Launch 0.25 CU chạy suốt ≈ $19/tháng (0.25 × 730 × $0.106 = $19.3) + storage. Supabase muốn có PITR thì tốn $100, quá đắt ở quy mô này.
- **Gợi ý (suy luận) để chủ dự án quyết:**
  - (1) **Render Singapore** nếu muốn ít vận hành nhất;
  - (2) **Railway Singapore** nếu muốn rẻ nhất mà vẫn có PITR;
  - (3) **Cloud VN** nếu Q6 kết luận phải lưu dữ liệu trong nước.

  Việc đầu tiên nên làm: hỏi luật sư câu hỏi ở Q6, vì câu trả lời có thể loại các lựa chọn 1 và 2 cho dữ liệu tài khoản.

### Gaps
- Chưa rõ gói Railway nào được dùng region Singapore; Railway PITR có hạn chế theo gói không.
- Chưa có giá Fargate Singapore: file giá ECS công khai không có nhãn đọc được. Chưa có giá ALB.
- Chưa có giá Cloud SQL, Cloud Run và Memorystore riêng cho Singapore: bảng tĩnh chỉ hiện region mặc định.
- Fly MPG: chưa rõ thời gian giữ backup, PITR và giới hạn kết nối.
- Lightsail: chưa rõ giới hạn kết nối và có Redis managed không.
- RDS: chưa đọc thời gian giữ backup và PITR trong phiên này.
- Cloud VN: chưa có giá PG/Redis theo engine, PITR và giới hạn kết nối. VNG/GreenNode không có trang giá công khai. Viettel không có dữ liệu mới.
- Chưa rõ Upstash có region Singapore không (trang regions trả 404).
- Chưa quy đổi VND ↔ USD (chưa kiểm tỷ giá).

---

## Q3. Email giao dịch

### Takeaway
Gmail cá nhân giới hạn **500 email/ngày**. Nếu gửi từ `@gmail.com` thì không ký được DKIM cho domain riêng, và Google có thể khóa gửi 1–24 giờ. Cách này không hợp cho OTP của một sản phẩm.

Gửi bằng domain riêng qua một nhà cung cấp, với SPF, DKIM và DMARC (`p=none` là đủ để bắt đầu), tốn từ **$0 tới khoảng $20/tháng** ở mức 1–10k email/tháng:
- Amazon SES khoảng $1 cho 10k;
- Resend Free 3.000/tháng (100/ngày);
- Postmark và Mailgun Basic $15 cho 10k;
- Brevo Free 300/ngày.

### Cited findings
- **Gmail cá nhân**: có thể chạm giới hạn khi gửi "more than 500 emails sent in a day", tối đa 500 người nhận mỗi thư. Khi chạm sẽ gặp lỗi "You have reached a limit for sending mail" và gửi lại được sau "1 to 24 hours" — https://support.google.com/mail/answer/22839?hl=en [21/10]
- **Google Workspace**:
  - 2.000 thư/ngày/user (trial 500);
  - 10.000 người nhận/ngày, 3.000 người nhận bên ngoài;
  - gửi qua SMTP bằng POP/IMAP thì tối đa 100 người nhận mỗi thư;
  - giới hạn tính theo cửa sổ 24 giờ trượt;
  - "Repeated violations may suspend the account".

  Nguồn: https://knowledge.workspace.google.com/admin/gmail/gmail-sending-limits-in-google-workspace?hl=en [21/10]
- **Gmail sender guidelines**, có hiệu lực từ 01/02/2024:
  - mọi sender cần SPF **hoặc** DKIM, PTR hợp lệ, TLS, spam rate < 0.3%;
  - bulk sender (≥ 5.000 thư/ngày) cần SPF **và** DKIM + DMARC ("can be set to none") + alignment + one-click unsubscribe cho thư marketing/subscribed + DKIM ≥ 1024 bit;
  - mục tiêu spam "below 0.10%".

  Nguồn: https://support.google.com/a/answer/81126?hl=en [21/10]
- **Yahoo**: mọi sender cần SPF hoặc DKIM, spam < 0.3%. Bulk sender cần SPF + DKIM + DMARC `p=none` trở lên, list-unsubscribe (khuyên dùng RFC 8058), xử lý hủy đăng ký trong 2 ngày — https://senders.yahooinc.com/best-practices/ [21/10]
- **Amazon SES**:
  - $0.10/1.000 email;
  - attachment $0.12/GB;
  - dedicated IP $24.95/tháng;
  - khách mới có tới $200 credit free tier, "free plan … available for 6 months".

  Nguồn: https://aws.amazon.com/ses/pricing/ [21/10]
- **Postmark**: Free 100 email/tháng; ở mức 10k: Basic $15, Pro $16.50, Platform $18; vượt $1.20–1.80/1.000 — https://postmarkapp.com/pricing [21/10]
- **Resend**: Free 3.000/tháng (100/ngày, 3 domain); Pro $20 cho 50k — https://resend.com/pricing [21/10]
- **Brevo**: tài khoản Free "send up to 300 emails per day". Starter "From 5,000 emails per month", giá không hiện trong HTML tĩnh — https://www.brevo.com/pricing/ [21/10]
- **Mailgun**: Free 100/ngày; Basic $15/tháng cho 10k (vượt từ $1.80/1.000); Foundation $35 cho 50k — https://www.mailgun.com/pricing/ [21/10]
- **SendGrid**: trang giá chính thức chuyển hướng vòng quanh nên **không đọc được**. Nguồn thứ ba cho rằng gói free vĩnh viễn đã bỏ (khoảng 27/05/2025), thay bằng trial 60 ngày (100/ngày), và Essentials từ $19.95 — https://dreamlit.ai/blog/best-sendgrid-alternatives, https://automationatlas.io/answers/sendgrid-pricing-explained-2026/ *(thứ cấp, chỉ thấy qua bản tóm tắt của kết quả tìm kiếm [21/10])*

### Inferences
- OTP xác thực và đặt lại mật khẩu cần đến nơi chắc chắn. Gửi qua Gmail cá nhân đồng nghĩa From là `@gmail.com`, không có DKIM của domain riêng, giới hạn 500/ngày, và nguy cơ bị khóa tài khoản cá nhân. Nên dùng domain riêng ngay từ đầu.
- Ở 1–10k/tháng: SES rẻ nhất (≈ $1) nhưng thao tác nhiều hơn (chưa kiểm thủ tục ra khỏi sandbox). Resend Free đủ cho đợt đầu nếu ≤ 100/ngày. Postmark hoặc Mailgun $15 là lựa chọn ổn định khi vượt mức đó.
- Thư nhắc học (reminder) gần với "subscribed messages". Thêm `List-Unsubscribe` one-click ngay từ đầu, dù chưa phải bulk sender.

### Gaps
- Chưa đọc trang chính thức của SendGrid và chưa có giá Brevo Starter.
- Chưa kiểm SES có ở region Singapore không và thủ tục production access (sandbox).
- Không có số liệu deliverability riêng cho các nhà mạng hay email Việt Nam.

---

## Q4. Monitoring free tier cho người làm một mình

### Takeaway
Bộ free tier đủ dùng cho đợt đầu:
- **Sentry Developer**: lỗi, trace, 1 uptime monitor, 1 cron monitor.
- **Better Stack Free**: 10 monitor hoặc heartbeat, 1 status page, alert qua Slack/email. Hoặc **UptimeRobot Free**: 50 monitor, chu kỳ 5 phút, nhưng ghi là "hobby and non-profit".
- **Grafana Cloud Free**, khi cần metrics, log, trace và k6: 14 ngày lưu trữ.

OpenTelemetry JS: traces và metrics đã stable, logs còn "Development".

### Cited findings
- **Sentry Developer**, free: 5k errors, 5M spans, 50 replays, 5 GB logs, 1 uptime monitor, 1 cron monitor, 1 user, 30-day lookback. Team $29/tháng — https://sentry.io/pricing/ [21/10]
- **`@sentry/nestjs`**:
  - cần Node ≥ 20.19.0;
  - file `instrument.ts` phải import đầu tiên;
  - thêm `SentryModule.forRoot()`;
  - nếu đã có global catch-all filter thì gắn `@SentryExceptionCaptured()` vào `catch()`, nếu chưa có thì dùng `SentryGlobalFilter`;
  - mặc định không bắt `HttpException`.

  Nguồn: https://docs.sentry.io/platforms/javascript/guides/nestjs/ [21/10]
- **Better Stack Free**: "Free for personal projects"; 10 monitor + heartbeat dùng chung; 1 status page; logs và traces 3 GB giữ 3 ngày; 100.000 exception/tháng; alert qua Slack và email, không có gọi điện. Gói trả phí từ $29/tháng (trả theo năm) — https://betterstack.com/pricing [21/10]
- **UptimeRobot Free**: 50 monitor, chu kỳ 5 phút, 1 status page. Mô tả "Good for hobby and non-profit projects", không nói rõ có được dùng thương mại không. Solo $9/tháng (trả theo năm) — https://uptimerobot.com/pricing/ [21/10]
- **Grafana Cloud Free**:
  - 10k active series;
  - 50 GB mỗi loại logs, traces, profiles;
  - lưu 14 ngày;
  - 3 user;
  - k6 500 VU-giờ/tháng;
  - synthetic 100k API test.

  Nguồn: https://grafana.com/pricing/ [21/10]
- **OpenTelemetry JS**: Traces Stable, Metrics Stable, Logs "Development" — https://opentelemetry.io/docs/languages/js/ [21/10]

### Inferences
- API dùng một Problem Details filter toàn cục. Nếu filter đó bắt mọi lỗi (catch-all), phải gắn `@SentryExceptionCaptured()` vào nó. Nếu không, Sentry sẽ không thấy lỗi 5xx. Code chưa kiểm cho điểm này.
- Worker BullMQ cần một **heartbeat**: worker ping định kỳ, và nếu ngừng ping thì có alert. Better Stack free có heartbeat; Sentry free có 1 cron monitor. Uptime check HTTP không phát hiện được worker chết.
- Vì UptimeRobot ghi "hobby and non-profit" cho gói Free, dùng Better Stack Free hoặc trả $9 cho UptimeRobot Solo sẽ an toàn hơn cho sản phẩm thu phí.

### Gaps
- Chưa đọc điều khoản dùng thương mại của UptimeRobot Free và Better Stack Free.
- Chưa đọc chu kỳ check của Better Stack Free.
- Chưa kiểm Problem Details filter trong repo có bắt mọi exception hay không.

---

## Q5. Playbook khi app bị nghẽn

### Takeaway
Thứ tự xử lý: **đo trước, sửa sau**.
1. Xem golden signals: p95/p99 latency, error rate, traffic, saturation (CPU/RAM, số kết nối DB, độ sâu queue).
2. Tìm query chậm bằng `pg_stat_statements`.
3. Leo thang theo thứ tự, mỗi bước rẻ hơn bước sau:
   - sửa query hoặc index;
   - tăng cỡ máy (vertical);
   - giới hạn và gom kết nối (pool, PgBouncer transaction mode);
   - cache hoặc CDN;
   - thêm instance API sau load balancer (khi đã stateless);
   - đẩy việc chậm sang queue;
   - backpressure: rate limit, load shedding;
   - read replica và autoscaling.

Với stack này có 2 điểm nghẽn cần chặn sớm:
- **Số kết nối Postgres.** Prisma 7 + `pg` mặc định mở pool `max` 10 kết nối mỗi process và **không có connection timeout**. Gói DB nhỏ chỉ có 22–100 kết nối.
- **Gọi AI ngay trong request.** Cần timeout, retry có giới hạn kèm jitter, giới hạn số lời gọi đồng thời, và circuit breaker.

### Cited findings
- **Chẩn đoán**: theo dõi "latency, traffic, errors, and saturation". Đo p99 trong cửa sổ ngắn, vì đó là tín hiệu sớm của saturation — https://sre.google/sre-book/monitoring-distributed-systems/ (⚠ CŨ) [21/10]
- **`pg_stat_statements`**: thống kê theo từng câu query đã chuẩn hóa (`calls`, `total_exec_time`, `mean_exec_time`…). Cách bật: thêm vào `shared_preload_libraries` (phải restart), đặt `compute_query_id`, rồi `CREATE EXTENSION`. PostgreSQL bản hiện hành là 18 — https://www.postgresql.org/docs/current/pgstatstatements.html [21/10]
- **Mặc định Postgres**: `max_connections` "typically 100"; `superuser_reserved_connections` 3 — https://www.postgresql.org/docs/current/runtime-config-connection.html [21/10]
- **Prisma ORM v7 + adapter `pg`**: pool `max` mặc định **10**; `connectionTimeoutMillis` mặc định **0 (không timeout)**; `idleTimeoutMillis` 10 s. Prisma v6 trước đây có timeout 5 s, nên "If you experience timeout issues after upgrading", hãy cấu hình lại — https://github.com/prisma/web/blob/main/content/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/connection-pool.mdx (qua context7 `/prisma/web` [21/10])
- **Prisma + PgBouncer**:
  - "PgBouncer must run in Transaction mode";
  - PgBouncer ≥ 1.21.0 thì **không** đặt `pgbouncer=true`;
  - prepared statements cần `max_prepared_statements > 0`;
  - các lệnh CLI (`migrate`, `db push`) dùng **direct connection**, cấu hình trong `prisma.config.ts`.

  Nguồn: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer [21/10]
- **Giới hạn của transaction mode** (Neon PgBouncer) — không dùng được: "Session-level advisory locks", `SET`/`RESET`, `LISTEN`/`NOTIFY`, `PREPARE` ở mức SQL. Migration và `pg_dump` phải dùng direct connection — https://neon.com/docs/connect/connection-pooling [21/10]
- **Số kết nối của gói nhỏ**: DO 1 GiB **22**; Render Basic **100**; Supabase Micro **60** (pooler 200); Cloud SQL tiny **25**; Neon 0.25 CU **104** (97 dùng được). Nguồn ở Q2.
- **Stateless và scale ngang**: 12-factor VI Processes và VIII Concurrency — https://12factor.net/ (⚠ CŨ) [21/10]
- **Throttler trong NestJS** mặc định lưu trong bộ nhớ. Hệ phân tán cần storage Redis của cộng đồng. App đứng sau proxy thì phải bật "trust the proxy" để lấy IP thật từ `X-Forwarded-For` — https://docs.nestjs.com/security/rate-limiting [21/10]
- **Timeout và retry** (AWS Builders' Library, ngày đăng không hiện trên trang, có thể cũ):
  - chọn timeout từ percentile latency của dịch vụ phía sau, theo tỉ lệ timeout nhầm chấp nhận được (ví dụ 0.1% tương ứng p99.9);
  - retry có backoff hàm mũ, có trần, kèm jitter;
  - giới hạn retry bằng token bucket;
  - "APIs with side effects aren't safe to retry unless they provide idempotency".

  Nguồn: https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter [21/10]
- **Cascading failures** (⚠ CŨ, 2017):
  - "Always use randomized exponential backoff when scheduling retries";
  - "Limit retries per request";
  - load shedding và graceful degradation;
  - truyền deadline xuống dưới;
  - giữ queue ngắn;
  - load test cho tới khi hỏng.

  Nguồn: https://sre.google/sre-book/addressing-cascading-failures/ [21/10]
- **Circuit breaker** (cập nhật 26/09/2026):
  - ba trạng thái Closed, Open, Half-Open;
  - khác Retry ở chỗ chặn hẳn thao tác "likely to fail";
  - timeout quá dài với dịch vụ ngoài làm breaker mất tác dụng;
  - phía gọi tôn trọng 429/503.

  Nguồn: https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker [21/10]
- **Load test bằng k6**:
  - làm theo thứ tự smoke → average-load (5–60 phút) → stress → soak → spike → breakpoint;
  - "Stick to simple load patterns";
  - máy chạy k6 nên còn ≥ 20% CPU rảnh (CPU ≤ 80%, RAM < 90%), nếu không kết quả latency bị đội lên.

  Nguồn: https://grafana.com/docs/k6/latest/testing-guides/test-types/ ; https://grafana.com/docs/k6/latest/testing-guides/running-large-tests/ [21/10]
- **Artillery** tự mô tả là "a platform for Playwright E2E testing, scalable load testing, and synthetic monitoring" — https://www.artillery.io/docs [21/10]
- **CDN/edge**: Cloudflare có data center ở Hà Nội, TP.HCM và Đà Nẵng — https://www.cloudflare.com/network/ [21/10]

### Inferences — playbook áp cho stack này
1. **Trước launch**, các bước "Quick win" trong code đã kiểm:
   - Đặt `connectionTimeoutMillis` (ví dụ 5 s) và `max` của pool một cách tường minh cho cả API lẫn worker.
   - Ràng buộc: tổng `max` × số process ≤ `max_connections` − khoảng dự phòng cho migration và admin.
   - Ví dụ với DO 1 GiB (22 kết nối): API 1 instance `max` 8 + worker `max` 5 + 3 cho migration/admin ≈ 16.
   - Khi cần thêm instance: dùng PgBouncer transaction mode.
   - Mọi advisory lock đều là loại `xact`, nên **tương thích** transaction mode. Neon chỉ liệt kê lock **cấp session** là không dùng được.
   - Prisma Migrate chạy bằng `DIRECT_URL`.
2. **Bật `pg_stat_statements`** (thường đã có sẵn trên managed PG; chưa kiểm từng nhà) và log query chậm. Khi p95 tăng, xem top `total_exec_time` trước rồi mới nghĩ tới tăng cỡ máy.
3. **Rate limiter đang ghi Postgres ở mỗi request bị giới hạn.** Cách này đúng cho nhiều instance, vì state dùng chung. Nhưng khi tải cao, mỗi request sẽ thêm một lần ghi vào DB. Nếu DB là nút cổ chai thì cân nhắc chuyển sang Redis hoặc chặn bớt ở Cloudflare trước. Phải bật `trust proxy` để rule theo IP không gom mọi người dùng thành một IP của proxy.
4. **Lời gọi AI trong request** (10 s, 1 lần retry):
   - giới hạn số lời gọi AI đồng thời mỗi instance (bulkhead), quá ngưỡng thì trả 503 hoặc 429 kèm `Retry-After`;
   - thêm circuit breaker theo provider: mở khi tỉ lệ timeout cao, half-open sau 30–60 s;
   - không bao giờ giữ kết nối DB trong lúc chờ AI (design Bước 6 đã cấm gọi AI trong transaction);
   - deadline của request phải lớn hơn timeout AI cộng thời gian retry.
5. **Thứ tự leo thang khi nghẽn**:
   - (a) sửa query hoặc index;
   - (b) tăng cỡ DB hoặc app (vertical);
   - (c) pool hoặc PgBouncer;
   - (d) cache dữ liệu catalog chỉ-đọc (từ vựng, nghĩa) ở edge hoặc trong bộ nhớ;
   - (e) thêm instance API (đã stateless: rate limit và idempotency nằm trong DB);
   - (f) tách việc nặng sang BullMQ (đã có cho import và AI eval);
   - (g) read replica cho truy vấn đọc;
   - (h) autoscaling.
6. **Load test trước launch**:
   - chạy k6 từ một máy **khác** máy chủ, tốt nhất ở cùng region Singapore;
   - smoke 1–2 VU;
   - average-load với số người dùng đồng thời dự kiến (ví dụ 50) trong 15 phút;
   - stress ở 3× mức đó;
   - đặt ngưỡng: p95 < 500 ms cho API không gọi AI, lỗi < 1%;
   - dùng **fake AI provider** (đã có, `AI_FAKE_ENABLED`) để không tốn tiền;
   - theo dõi số kết nối DB và độ sâu queue trong lúc test.

### Gaps
- Chưa kiểm managed PG của từng nhà có bật sẵn `pg_stat_statements` không.
- Chưa có nguồn chính thức về read replica và autoscaling của Render, Railway, DO trong phiên này.
- Chưa đo latency thật của API. Số p95 < 500 ms ở trên là mục tiêu đề xuất, không phải số đo.
- Chưa kiểm Node `pg` dùng named hay unnamed prepared statement khi đi qua PgBouncer.

---

## Q6. Đặc thù Việt Nam: độ trễ và lưu trữ dữ liệu

### Takeaway
- **Độ trễ**: HCM↔Singapore khoảng **41 ms**, Hà Nội↔Singapore khoảng **42 ms** (36–49 ms trong 2 tuần), HCM↔Tokyo khoảng 89 ms, HCM↔Hà Nội khoảng 22 ms. Đây là ping giữa các datacenter, không phải từ mạng di động của người dùng. Singapore đủ nhanh cho app học từ vựng.
- **Rủi ro cáp biển**: tháng 8/2026, 4 trên 8 tuyến cáp quốc tế gặp sự cố. Báo chí nhận định dịch vụ host trong nước không bị ảnh hưởng.
- **Pháp lý** (không phải tư vấn): PDPL 91/2025 và Decree 356/2025 coi việc lưu hoặc xử lý ở nước ngoài, kể cả "cloud-based processing", là **chuyển dữ liệu xuyên biên giới**. Luật An ninh mạng 116/2025 (hiệu lực 01/7/2026) giữ nghĩa vụ **lưu dữ liệu người dùng tại Việt Nam**. Một nguồn thứ cấp (09/2026) nói với công ty thành lập ở Việt Nam thì nghĩa vụ này **tự động**, không cần chờ yêu cầu.
- **Hệ quả (suy luận)**: dù host ở Singapore hay Việt Nam, gọi AI của Mỹ vẫn là chuyển dữ liệu ra nước ngoài. Còn dữ liệu tài khoản (email, IP, thời gian dùng) có thể phải có **bản lưu trong nước**.

### Cited findings
- **Ping (WonderNetwork)**, các lần đo gần nhất ngày 21/10/2026:
  - HCM–Singapore: trung bình 40.74 ms — https://wondernetwork.com/pings/Ho%20Chi%20Minh%20City/Singapore [21/10]
  - Hà Nội–Singapore: 42.39 ms; mức trung bình mỗi lần đo từ khoảng 07/10 tới 21/10 dao động 36.2–49.4 ms, đỉnh 94.7 ms — https://wondernetwork.com/pings/Hanoi/Singapore [21/10]
  - HCM–Tokyo: 88.71 ms — https://wondernetwork.com/pings/Ho%20Chi%20Minh%20City/Tokyo [21/10]
  - HCM–Hà Nội: 22.05 ms — https://wondernetwork.com/pings/Ho%20Chi%20Minh%20City/Hanoi [21/10]
- **Cáp biển**: ngày 25/08/2026, SJC2 và AAE-1 gặp sự cố gần như cùng lúc, AAG chưa sửa xong, IA cũng bị ảnh hưởng, tức 4 trên 8 tuyến. Bài báo: "Domestic websites and services hosted in Vietnam are not expected to be affected" (VOV, 28/08/2026) — https://english.vov.vn/en/society/four-undersea-cables-hit-faults-vietnams-international-internet-slows-locally-post1328208.vov [21/10]. Năm 2024 đã có 3 tuyến (IA, APG, AAE-1) gặp sự cố — https://www.datacenterdynamics.com/en/news/four-of-vietnams-subsea-cables-suffer-faults-leading-to-fresh-connectivity-outages-for-country/ (chỉ thấy qua bản tóm tắt của kết quả tìm kiếm [21/10])
- **PDPL 91/2025/QH15**: thông qua 26/06/2025, hiệu lực 01/01/2026. Phạt vi phạm chuyển dữ liệu xuyên biên giới tới **5% doanh thu năm trước**, hoặc 3 tỷ VND nếu con số 5% thấp hơn. DPIA không bắt buộc với doanh nghiệp nhỏ và startup trong 5 năm. Hộ kinh doanh và doanh nghiệp siêu nhỏ được miễn, trừ khi xử lý dữ liệu nhạy cảm, xử lý số lượng lớn, hoặc cung cấp dịch vụ xử lý dữ liệu — https://www.tilleke.com/insights/vietnams-new-personal-data-protection-law-a-closer-look/2/ (bài 27/08/2025, có cập nhật) *(thứ cấp)* [21/10]
- **Decree 356/2025**, hiệu lực 01/01/2026 và thay Decree 13/2023:
  - chuyển dữ liệu xuyên biên giới gồm "direct transfers, offshore storage, cloud-based processing, and onward processing of data collected in Vietnam";
  - nộp hồ sơ đánh giá **trong 60 ngày** kể từ khi bắt đầu chuyển, qua cổng của Bộ Công an; cơ quan xem xét trong 15 ngày;
  - doanh nghiệp nhỏ và startup có ân hạn 5 năm nếu không xử lý dữ liệu nhạy cảm, không quá 100.000 người, và không làm dịch vụ xử lý dữ liệu.

  Nguồn: https://www.vietnam-briefing.com/news/vietnam-personal-data-protection-regulation-decree-356.html (26/01/2026) *(thứ cấp)* [21/10]
- **Luật An ninh mạng 116/2025/QH15**: thông qua 10/12/2025, hiệu lực 01/7/2026. Yêu cầu lưu dữ liệu tại Việt Nam "remains", và loại dữ liệu được ghi rõ hơn: tên tài khoản, thời gian dùng, thông tin thanh toán, IP truy cập — https://blogs.duanemorris.com/vietnam/2026/01/08/vietnam-law-on-cybersecurity-2026-what-you-must-know/ (08/01/2026) *(thứ cấp)* [21/10]
- **Le Tran Law** (02/09/2026):
  - với công ty thành lập theo luật Việt Nam, "the storage obligation is treated as automatic";
  - với nhà cung cấp nước ngoài không có pháp nhân ở Việt Nam, nghĩa vụ chỉ phát sinh sau vi phạm và một yêu cầu của Bộ Công an;
  - lưu tối thiểu 24 tháng; log vi phạm 12 tháng;
  - nghị định hướng dẫn ban hành 19/08/2026;
  - "a compliance position built on the old Decree 53 alone is now out of date".

  Nguồn: https://letranlaw.com/?p=30079 *(thứ cấp)* [21/10]
- File legal sẵn có của dự án đã đọc Decree **333/2026/NĐ-CP** (19/08/2026): Điều 19 liệt kê dữ liệu phải lưu, Điều 20 quy định lưu ≥ 24 tháng, Điều 16 quy định log ≥ 12 tháng. Phần này **không kiểm lại trong phiên này** — [1_legal_vietnam.md, Q4](../commercialization-2026-10-19/1_legal_vietnam.md)
- Tilleke 2022 về Decree 53 (⚠ CŨ; nay có thể đã bị thay thế): https://www.tilleke.com/insights/what-do-vietnams-new-data-localization-requirements-mean-for-domestic-enterprises/2/ (chỉ thấy qua bản tóm tắt của kết quả tìm kiếm [21/10])

### Inferences
- **Độ trễ**: thêm khoảng 40 ms cho mỗi round-trip là chấp nhận được. Một request có TLS và 1–2 round-trip vẫn dưới khoảng 150 ms phần mạng. Tokyo gấp đôi, Mỹ hay EU còn xa hơn. Nên chọn **Singapore** nếu host ở nước ngoài.
- **Hai lớp pháp lý tách nhau.**
  - (1) *Chuyển xuyên biên giới* (PDPL/Decree 356): xảy ra ngay khi dùng Cloudflare hoặc AI API của Mỹ, **dù DB đặt ở đâu**. Host DB trong nước không xóa được hồ sơ đánh giá, nếu không thuộc diện miễn.
  - (2) *Lưu trữ tại Việt Nam* (Luật An ninh mạng 2025 + Decree 333): nếu chủ dự án vận hành bằng công ty hoặc hộ kinh doanh Việt Nam và nghĩa vụ là "tự động", thì dữ liệu tài khoản và log phải có bản ở Việt Nam.
- **Ba phương án hosting theo luật:**
  - (A) Toàn bộ ở cloud VN: tuân thủ dễ nhất, không phụ thuộc cáp biển; giá và tính năng kém minh bạch.
  - (B) Singapore + bản sao định kỳ dữ liệu tài khoản và log về một máy hoặc bucket ở VN: chưa biết "bản sao" có đủ để tuân thủ không.
  - (C) Singapore toàn bộ: rủi ro pháp lý nếu nghĩa vụ là tự động.

  Cần luật sư chốt trước khi chọn nhà cung cấp.

### Gaps
- Chưa đọc văn bản gốc của Decree 356 và Decree 333 trong phiên này. Mọi điểm trên đến từ nguồn thứ cấp hoặc từ file legal cũ.
- Chưa rõ cá nhân chưa đăng ký kinh doanh có phải "doanh nghiệp trong nước" theo nghĩa của luật không.
- Chưa rõ ân hạn hoặc miễn trừ cho doanh nghiệp nhỏ có áp cho **hồ sơ chuyển xuyên biên giới** hay chỉ cho DPIA (hai nguồn nói khác nhau, xem file legal).
- Chưa rõ "lưu tại Việt Nam" nghĩa là chỉ cần một bản sao hay phải xử lý chính tại Việt Nam.
- Ping WonderNetwork đo giữa các datacenter. Không có số đo từ mạng di động hay mạng nhà người dùng Việt Nam.
- Chưa có thông tin cáp AAG, SJC2, AAE-1 đã sửa xong chưa (tính tới 21/10/2026).
