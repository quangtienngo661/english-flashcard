# Wordmet: đánh giá sẵn sàng production (21/10/2026)

Báo cáo cho chủ dự án. Trả lời bốn câu hỏi: (1) app ở quy mô website, nếu làm xong các phần cần thiết và deploy chính thức, thì
thế nào, và khả năng lên production thực tế; (2) theo best practice còn thiếu gì; (3) quy mô hiện tại có đủ cho một nhóm nhỏ không;
(4) khi đông người và bị nghẽn thì làm gì.

- **Nguồn:** bốn ghi chép trong `docs/preparation/evidence/production-readiness-2026-10-21/` (liệt kê ở cuối), viết trên bản chụp
  nhánh `dev` tại commit `985531b`. Mọi `path:line` là của bản chụp đó. Giá hosting và trang tài liệu bên ngoài đọc ngày 21/10/2026.
- **Nhãn:** **đã kiểm phiên này** = đọc trong code hôm nay; **ước tính** = phép tính tay từ giả định có ghi; `ASSUMPTION` = chưa kiểm;
  **suy luận** = kết luận của người viết, không nguồn nào nói thẳng.
- **Không ai chạy load test hay server trong phiên này.** Mọi con số công suất là ước tính, hoặc số đo cũ trên máy CI/máy dev.
- Phần pháp lý **không phải tư vấn pháp lý**.

---

## Tóm tắt

1. **Đánh giá:** lõi máy chủ (API nhận yêu cầu từ trình duyệt; worker chạy việc nền như gửi email nhắc học) viết chắc, đúng cỡ cho
   website nhỏ–vừa, chạy được nhiều bản song song. Không cần viết lại để chạy thật.
2. **Hôm nay chưa lên production (bản chạy thật cho người dùng) được:** thiếu app người học trên web (`/vi/app` trả 404), nghĩa tiếng
   Việt đã duyệt (0), cách deploy API (đưa code lên máy chủ), email gửi thật (thiếu thì không ai đăng ký xong), nền pháp lý. Ngày ra
   mắt do giao diện người học, công duyệt nội dung (73–440 giờ, `ASSUMPTION`) và luật sư quyết định, không phải hạ tầng (mục 2, 5).
3. **Best practice:** 16 hạng mục, 1 đạt, 8 một phần, 7 thiếu (mục 4). Nặng nhất: deploy + rollback (quay về bản trước), healthcheck
   thật (đường dẫn cho máy kiểm app còn phục vụ được không), cảnh báo, backup có thử khôi phục, chặn đồ giả ở production, IP thật.
4. **Nhóm nhỏ: đủ, dư nhiều.** 1 API nhỏ + 1 worker + Postgres (cơ sở dữ liệu) nhỏ + Redis (nơi giữ hàng đợi việc nền) nhỏ, cho 100–500
   người đăng ký, 10–50 người cùng lúc (ước tính đỉnh ~25 request/giây, ~7,5% một CPU), **nếu** DB cùng vùng máy chủ với API, cài đặt
   IP proxy (`TRUST_PROXY`) đúng, Redis không tự xóa dữ liệu và có ghi đĩa, email đủ hạn mức (mục 6).
5. **Khi nghẽn:** đo trước (độ trễ, lỗi, kết nối DB, hàng đợi, SQL chậm), rồi leo thang rẻ → đắt: sửa SQL → máy to hơn → gom kết nối →
   giữ sẵn dữ liệu hay đọc → thêm bản API → dời việc chậm vào hàng đợi → chặn bớt tải → bản sao DB. Gãy đầu tiên: **hạn mức email/ngày**.
6. **Làm ngay:** `.verify-b25-accounts.md` ở gốc repo chứa mật khẩu/token và **không** nằm trong `.gitignore` (mục 1).
7. **8 quyết định cần chủ dự án** (mục 11): hosting, Free hay Pro, AI lúc ra mắt, cổng thanh toán, tuổi tối thiểu, hình thức pháp lý,
   lưu dữ liệu tại Việt Nam, nhà cung cấp email.

---

## 1. Việc bảo mật cần làm ngay (trước mọi việc khác)

- **File `.verify-b25-accounts.md` ở gốc repo** có mật khẩu và token. Review 18/10 (dòng 520-521) đã nêu, coordinator cũng xác nhận;
  mình **không mở** file. Hiện nó untracked (git chưa theo dõi). Mình **đã kiểm phiên này**: `git check-ignore` trả mã 1, tức file
  **không** bị `.gitignore` chặn.
- **Nguy cơ:** chỉ cần một lệnh `git add -A` hay `git add .`, file vào commit. Sau khi push, file nằm trên GitHub kể cả khi xóa ở commit sau.
- **Việc cần làm (chủ dự án tự làm, Claude không sửa file trong việc này):**
  - chuyển file ra khỏi thư mục repo hoặc xóa;
  - thêm tên file vào `.gitignore`;
  - đổi mật khẩu/token trong đó nếu tài khoản tương ứng còn dùng, hoặc nếu mật khẩu đó được dùng lại ở nơi khác.

---

## 2. Câu 1: đánh giá app ở quy mô website, và khả năng lên production

### 2.1 Mức sẵn sàng theo từng lớp

| Lớp | Mức hôm nay | Một câu giải thích | Nguồn |
|---|---|---|---|
| Logic máy chủ (API + worker) | **Cao** | Đủ API cho hầu hết luồng học. 3 lỗi mức Cao của review 18/10 đã sửa (PR #98). Chạy được nhiều bản song song | launch §1, §4; capacity §2 |
| Vận hành (đóng gói, deploy, giám sát, backup) | **Thấp** | Không có Dockerfile, workflow deploy API, healthcheck thật, báo lỗi hay backup | api §3, §4, §7, §10 |
| App người học trên web | **Chưa có** | Figma 40 màn, chủ dự án đánh giá "ổn khoảng 50%"; chưa có plan giao diện, chưa có dòng code | launch §1 |
| Nội dung (nghĩa tiếng Việt) | **Chưa có** | Lần chạy thật nạp 7.799 headword, `senses_created 0`; đích 8.812 từ; chưa có bằng chứng lô thử 20 từ | launch §7; `docs/deliveries/buoc-3-test-flow.md:65-69` |
| Pháp lý cho tài khoản người học | **Thấp** | `/privacy` chỉ viết cho waitlist, `/terms` là nháp, chưa có cách xóa tài khoản, chưa có ý kiến luật sư | launch §6 |

### 2.2 Điểm mạnh (giữ nguyên khi lên production)

- **Cấu hình được kiểm lúc khởi động.** Thiếu hay sai một biến môi trường thì app dừng ngay và báo tên biến, không chạy nửa vời
  (`apps/api/src/common/config/app-config.ts:161-252`).
- **API stateless:** mỗi bản API không giữ dữ liệu riêng của người dùng trong RAM, nên chạy nhiều bản sau một load balancer (bộ chia yêu
  cầu) được. Bộ đếm rate limit (giới hạn số lần gọi trong một khoảng thời gian), `Idempotency-Key` (khóa chống gửi trùng) và ngân sách
  email đều nằm trong Postgres. Access token kiểm
  không cần DB. File CSV lưu trong Postgres, không lưu trên đĩa máy (capacity §2, ví dụ `rate-limiter.service.ts:28-41`,
  `uploads.service.ts:89-90`).
- **Việc nền chạy song song an toàn.** Hai bản cùng chạy một job không làm sai dữ liệu: các job đều "giành" việc bằng `FOR UPDATE SKIP LOCKED`
  hoặc điều kiện trong DB (api §8; `notice-sender.service.ts:65-69`, `billing-jobs.service.ts:77-78`).
- **Nền bảo mật tốt.** Mật khẩu băm argon2id. Cookie refresh có `httpOnly`, `secure`, `SameSite=Strict`. Có header chống CSRF. Dữ liệu vào
  kiểm bằng schema chặt, field lạ bị từ chối. Giới hạn kích thước body. Khóa ký JWT xoay vòng được (api §2, §6).
- **Log có cấu trúc.** Mỗi dòng log là JSON, mang `operation_id` (mã của một request) và che mật khẩu/token theo tên trường
  (`app-logger.ts:16, 29-40`).
- **Có timeout cho mọi lời gọi ra ngoài:** AI 10 s, SMTP 10 s mỗi pha, cổng thanh toán 5 s, Redis 2 s, chờ kết nối DB 5 s (api §5).
- **Có công tắc khẩn cấp:** bật/tắt AI, trần AI mỗi ngày, trần số lời gọi provider mỗi ngày, ngân sách email mỗi ngày (capacity §6.1, §6.3).

### 2.3 Đánh giá ở quy mô website khi đã làm xong các phần cần thiết

- **Kiến trúc đúng cỡ.** Gồm một khối NestJS chia module, một Postgres giữ mọi trạng thái, Redis/BullMQ chỉ cho việc nền thật, và
  Cloudflare cho trang tĩnh. Cấu trúc này hợp với website vài trăm tới vài nghìn người (suy luận; điểm gãy đầu tiên ước ở ~1.000–2.400
  người, và đó là hạn mức email, mục 7.3). Cỡ này không cần microservice hay Kubernetes.
- **Điểm yếu đã biết đều có cách sửa cụ thể,** và không cái nào buộc đổi kiến trúc. Ví dụ: query "Ôn tất cả" chậm với người có rất nhiều
  từ (PX2), tìm từ chưa có index, AI giới hạn theo từng process (mục 7.3).
- **Đường lên production là chuỗi việc đã biết.** Cụ thể: viết Dockerfile (công thức đóng gói app), chọn hosting, nối CI/CD (tự động
  kiểm rồi đưa code lên máy chủ), thêm healthcheck và giám sát, bật backup, chạy load test (thử tải nhân tạo). Tổng cỡ vừa (mục 5,
  giai đoạn 0–1).

### 2.4 Khả năng lên production thực tế

- **Kỹ thuật:** khả thi. Không có việc nào cần thiết kế lại.
- **Đường găng (những việc dài, quyết định ngày ra mắt) gồm ba việc; chưa đủ số liệu để xếp cái nào dài hơn:**
  1. **App người học trên web**: chưa có plan, chưa có code; API thì đã xong (launch §1, B1–B2).
  2. **Nội dung**: 73–440 giờ duyệt (`ASSUMPTION`, D6), một người duyệt, chưa có người dự phòng (launch §7, §8).
  3. **Pháp lý**: cần luật sư cho tuổi tối thiểu, DPIA/CTIA (hồ sơ đánh giá tác động và hồ sơ chuyển dữ liệu ra nước ngoài), và câu
     "lưu dữ liệu tại Việt Nam". Câu cuối **chặn việc chọn region hosting** (vùng đặt máy chủ) (launch §6d).
- **Ra mắt Free trước là được, theo tài liệu.** Nghĩa vụ hộ kinh doanh, thông báo website TMĐT và luật hợp đồng từ xa chỉ áp khi
  **thu tiền**. Nhưng luật dữ liệu cá nhân (Luật 91/2025, Nghị định 356) **vẫn áp đủ** (launch §3, §6).
- **Lịch Deploy theo quyết định đã chốt:** D3 (vòng 3, Bước 3) đặt Deploy vào lúc cả app xong, trước ra mắt. Lộ trình ở mục 5 vì vậy là
  **thứ tự**, không phải lịch. Giai đoạn 0 chỉ là sửa code, làm lúc nào cũng được.

---

## 3. Sơ đồ production đích

Chú thích (trong sơ đồ viết không dấu): `[CO]` đang chạy; `[CODE CO]` code có nhưng chưa deploy; `[THIEU]` chưa có gì;
`[CO NHUNG GIA]` có nhưng không làm đúng việc của nó.

```
                Nguoi hoc & staff (trinh duyet, chu yeu o Viet Nam)
                                  |  HTTPS
                                  v
 +------------------------------------------------------------------------+
 | Cloudflare: DNS, CDN, chong DDoS mien phi, 1 rule rate limit (goi Free) |
 | [CO cho wordmet.com]  [THIEU cho api. / admin. / admin-api.]            |
 +------------------------------------------------------------------------+
        |                        |                            |
        v                        v                            v
 +------------------+   +---------------------+   +-------------------------------+
 | wordmet.com      |   | admin.wordmet.com   |   | api. + admin-api.wordmet.com  |
 | Worker wordmet-  |   | Worker wordmet-admin|   | load balancer cua hosting     |
 | web              |   | (file tinh)         |   | [THIEU]                       |
 |  landing   [CO]  |   | [CODE CO, wrangler  |   +---------------+---------------+
 |  /vi/app [THIEU] |   |  viet san, chua     |                   |
 +------------------+   |  deploy]            |                   v
                        +---------------------+   +-------------------------------+
                                                  | API NestJS, 1..N ban          |
                                                  | [CODE CO; chua dong goi,      |
                                                  |  chua deploy]                 |
                                                  +--+----------+----------+------+
                                                     |          |          |
             +---------------------------------------+          |          |
             v                                                  v          v
 +------------------------+   +---------------------+   +--------------+ +------------------+
 | PostgreSQL managed     |   | Redis cho BullMQ    |   | Email        | | AI provider      |
 | + PITR >= 7 ngay       |   | noeviction + AOF    |   | provider     | | OpenAI/Anthropic |
 | + pg_dump tuan ra ngoai|   | [THIEU]             |   | SPF/DKIM/    | | [CODE CO, chua   |
 | [THIEU]                |   |                     |   | DMARC        | |  goi that; tuy   |
 +------------------------+   +---------------------+   | [THIEU]      | |  chon luc launch]|
             ^                          ^               +--------------+ +------------------+
             |                          |                      ^
             +------------+-------------+                      |
                          |                                    |
             +------------+---------------+                    |
             | Worker (dist/worker.js)    |--------------------+
             | import CSV, nhac hoc,      |
             | AI eval, bao tri hang gio  |
             | [CODE CO; chua deploy;     |
             |  khong co health/heartbeat]|
             +----------------------------+

 Giam sat, dung ngoai nhin vao tat ca:
   Sentry (gom loi) . uptime check /health/ready . heartbeat cua worker
   . status page . canh bao qua email/Slack                              [THIEU]
   Hom nay /v1/health luon tra "ok", khong kiem DB/Redis                 [CO NHUNG GIA]
```

(Sơ đồ viết không dấu để các cột thẳng hàng.) Bố cục domain (`api.`, `admin.`, `admin-api.`) đã chốt ở design Bước 2.5. Cookie refresh
host-only trên `api.`, nên API phải cùng tên miền gốc `wordmet.com` với web (launch §5; `session-transport.ts:13-15, 23-26`).

---

## 4. Câu 2: còn thiếu gì theo best practice

### 4.1 Các khung dùng để chấm

- **Google SRE launch checklist và Production Readiness Review (PRR).** PRR là buổi rà xem dịch vụ đã đủ tin cậy để chạy thật chưa. Sách
  ra năm 2017, cũ nhưng vẫn là tài liệu nền. Các câu hỏi chính: có load test chưa, có giám sát và cảnh báo chưa, khi bên thứ ba lỗi thì
  app xuống cấp thế nào, có canary (thả bản mới cho một phần nhỏ người dùng trước) và rollback (quay về bản trước) chưa.
  Nguồn: https://sre.google/sre-book/launch-checklist/ và https://sre.google/sre-book/evolving-sre-engagement-model/ [đọc 21/10/2026].
- **AWS Well-Architected, trụ Operational Excellence:** "Make frequent, small, reversible changes", "Use managed services"
  (https://docs.aws.amazon.com/wellarchitected/latest/framework/oe-design-principles.html [21/10/2026]).
- **Twelve-Factor App** (2017, cũ):
  - config nằm trong biến môi trường;
  - process stateless;
  - tắt gọn;
  - dev và prod giống nhau;
  - log là dòng sự kiện;
  - migration chạy như việc admin một lần.

  Nguồn: https://12factor.net/ [21/10/2026].
- **OWASP Top 10:2025.** A02 Security Misconfiguration, A03 Software Supply Chain Failures, A09 Security Logging and Alerting Failures
  (https://top10.owasp.org/2025 [21/10/2026]). ASVS 5.0.0: mức L1 cho bước đầu, L2 "for most applications" (L1/L2 lấy từ kết quả tìm
  kiếm, chưa mở trang gốc).
- **BullMQ "Going to production":**
  - Redis bật AOF;
  - `maxmemory-policy=noeviction` ("the only setting that guarantees the correct behavior");
  - tắt gọn khi nhận SIGTERM.

  Nguồn: https://docs.bullmq.io/guide/going-to-production [21/10/2026].
- **k6:** load test (bài thử tải nhân tạo) chạy theo thứ tự smoke → average-load → stress → soak → spike
  (https://grafana.com/docs/k6/latest/testing-guides/test-types/ [21/10/2026]).

### 4.2 Scorecard

Hiện trạng: **có** / **một phần** / **thiếu**. Cột "Việc cần làm" trỏ sang mã việc trong lộ trình ở mục 5.

| # | Hạng mục | Hiện trạng | Evidence | Việc cần làm |
|---|---|---|---|---|
| 1 | **Môi trường tách biệt** (một staging, tức bản chạy thử giống production nhưng dữ liệu riêng) | **thiếu** | Chỉ có máy local và landing production; chưa có staging (launch §5, CL E4) | Staging nhỏ: DB riêng, secret riêng, cùng image với production (G1-2) |
| 2 | **Đóng gói và deploy** (gói app thành một image chạy được ở bất kỳ máy nào) | **thiếu** | Không có Dockerfile, `fly.toml`, `render.yaml`, Procfile (api §10, kiểm bằng `find`). Build cần một Postgres **đã migrate** (đã chạy các file đổi cấu trúc bảng) vì TypedSQL, tức các câu SQL viết tay mà Prisma sinh code từ DB thật (`apps/api/package.json:25`, `prisma.config.ts:1`, `ci.yml:21`). `prisma` CLI chỉ là devDependency (`package.json:76`). `argon2` là module native | Dockerfile nhiều tầng cho API và worker; giải chuyện build cần DB (G0-11, G0-12) |
| 3 | **CI/CD và rollback** (CI/CD: tự động kiểm rồi tự động đưa code lên máy chủ) | **một phần** | CI chạy trên PR: lint, typecheck, build, unit, kiểm schema lệch (`.github/workflows/ci.yml:13-68`). Chỉ có `deploy-web.yml` cho landing; không có deploy API, không có bước migrate production, không có cách rollback. Migration tạo index không `CONCURRENTLY` (DB18). Branch protection chưa bật | Workflow deploy API + worker; migrate là một bước release riêng; rollback = deploy lại image trước; migration kiểu "thêm trước, bỏ sau" (G0-13, G1-3, G0-18) |
| 4 | **Cấu hình và secret** (secret: khóa bí mật như mật khẩu DB, key API) | **một phần** | Tốt: zod kiểm lúc khởi động; khóa JWT xoay được (`app-config.ts:138-147`). Thiếu: chế độ production **mở mặc định**. `BILLING_PRODUCTION` mặc định `false` nên đồ giả không bị chặn (`app-config.ts:215, 232-241`, **đã kiểm phiên này**). Code không đọc `NODE_ENV`. `.env.example:59-61, 68` bật cả fake billing lẫn fake AI. Các secret khác (`OTP_HMAC_KEY`, `REFRESH_GRACE_KEY`…) không xoay được | Biến `APP_ENV=production` buộc tắt mọi đồ giả, mặc định từ chối đồ giả (G0-2); dùng kho secret của hosting, secret staging khác production (G1-4) |
| 5 | **Observability** (nhìn được bên trong hệ thống: log, gom lỗi, số đo, cảnh báo) | **một phần** | Có log JSON + `operation_id`. Log **không có timestamp** (`app-logger.ts:4-9, 58-64`). Không có access log (dòng ghi method, đường dẫn, mã trả về, thời gian). Không Sentry (dịch vụ gom lỗi và báo về), không metrics (số đo theo thời gian), không tracing (vết đường đi của một request) (api §4). `start:prod` không bật source map, nên lỗi không chỉ đúng dòng trong code gốc (`package.json:17`) | Timestamp + access log + source map (G0-8); Sentry (G0-9); cảnh báo qua email/Slack (G1-6) |
| 6 | **Health check** (đường dẫn để máy kiểm "app còn phục vụ được không") | **thiếu** (có nhưng giả) | `GET /v1/health` luôn trả `{status:'ok'}`, không chạm DB hay Redis (`apps/api/src/health/health.controller.ts`, **đã kiểm phiên này**). API khởi động được cả khi không tới được DB (`prisma.module.ts:24-31`). Worker không mở cổng HTTP nào (`worker.ts:11-16`) | `/health/live` + `/health/ready` (`SELECT 1` + Redis `PING`, có timeout); heartbeat cho worker, tức worker tự báo "còn sống" đều đặn (G0-3, G0-4) |
| 7 | **Backup và diễn tập restore** (restore: khôi phục dữ liệu từ bản sao lưu) | **thiếu** | Không có `pg_dump`, script backup hay restore nào (api §7). Sách SRE: "No one really wants to make backups; what people really want are restores" (https://sre.google/sre-book/data-integrity/ [21/10/2026]) | PITR ≥ 7 ngày của DB managed (PITR: quay DB về một thời điểm bất kỳ trong N ngày qua); `pg_dump` hằng tuần ra nơi khác; **diễn tập restore trước launch**, rồi hằng tháng; ghi mục tiêu mất tối đa bao nhiêu phút dữ liệu (G1-7) |
| 8 | **Security header, rate limit, IP thật sau proxy** | **một phần** | Rate limit nằm trong Postgres, đúng khi chạy nhiều bản (`rate-limiter.service.ts:17-41`). Không có security header (các dòng trình duyệt đọc để tự bảo vệ, ví dụ "chỉ dùng HTTPS"), `X-Powered-By: Express` còn bật, tức tự khai đang chạy Express (api §6). `TRUST_PROXY` mặc định `false` và chỉ nhận danh sách IP/CIDR (`app-config.ts:149-158, 184-185`). Rate limit theo IP đọc `request.ip` (`rate-limit.guard.ts:26`, **đã kiểm phiên này**). IPv6 tính theo /128 (T12). `/v1/sample` (endpoint thử của Bước 0) còn mở (`app.module.ts:16, 21`) | Sửa `TRUST_PROXY` + gom IPv6 theo /64 (G0-5); security header ở app hoặc ở edge, tắt `X-Powered-By` (G0-7); gỡ `SampleModule` (G0-6); 1 rule Cloudflare cho `/v1/auth/*` (G2-3) |
| 9 | **Quét dependency và secret** (tự tìm thư viện có lỗ hổng và mật khẩu lỡ commit) | **thiếu** | Không có Dependabot, CodeQL, `pnpm audit`, gitleaks. Action pin theo tag, workflow không khai báo `permissions` (api §10; DB17) | Dependabot + `pnpm audit` trong CI + gitleaks trước push; pin action theo SHA (G0-14) |
| 10 | **Email giao dịch** (OTP tức mã xác minh gửi qua email, đặt lại mật khẩu, nhắc học) | **một phần** | Có SMTP, ngân sách email/ngày, nhắc học qua hàng đợi có thử lại (`reminder-queue.service.ts:11, 73-77`). Nhưng OTP gửi **trong process API, không thử lại** (`mail-dispatcher.service.ts:25-32, 66-82`), và request OTP luôn trả 202 nên SMTP sập thì người dùng không biết (`otp.controller.ts:15`). Chưa chọn nhà cung cấp; `SMTP_FROM=no-reply@localhost` (`.env.example:39`) | Nhà cung cấp email với domain riêng, có SPF/DKIM/DMARC, tức ba bản ghi DNS chứng minh thư đúng từ `wordmet.com` (G1-5); OTP qua hàng đợi có thử lại, hoặc ít nhất cảnh báo khi `mail_send_failed` tăng (G0-10) |
| 11 | **Load test** | **thiếu** | Chỉ có `pnpm test:scale`, đo **một** người học có dữ liệu rất lớn, chạy tay (`apps/api/vitest.config.e2e-scale.ts:12`). Chưa ai thử nhiều người cùng lúc. PX2/T7 chưa đo lại; T5 sau sửa chưa có số (capacity §1.2) | k6 trên staging: smoke → 50 người ảo trong 15 phút → stress 3×, dùng fake AI (G1-12); đo lại `test:scale` (G0-16) |
| 12 | **Runbook sự cố và status page** (runbook: trang hướng dẫn xử lý khi hỏng; status page: trang công khai báo app đang chạy hay lỗi) | **thiếu** | Không có runbook (grep các từ runbook, incident, on-call trong `docs/`), README API là bản mẫu của Nest, chưa có SLO, chưa có quy trình báo sự cố dữ liệu 72 giờ (launch §8) | Runbook 1 trang: kiểm gì, rollback, restore DB, tắt AI, liên hệ nhà cung cấp; status page miễn phí (G1-13); quy trình 72 giờ (G2-5) |
| 13 | **Tuân thủ bảo vệ dữ liệu** | **một phần** (rất ít) | Có: lưu một lần đồng ý gộp `terms_accepted_at`, `terms_version`; chặn dưới 13 tuổi (`person.ts:3`). `TERMS_VERSION` là cấu hình bắt buộc (`app-config.ts:197`, **đã kiểm phiên này**) nhưng bản Terms đó chưa tồn tại. Thiếu: Privacy cho tài khoản, Terms thật, đồng ý theo từng mục đích (email nhắc học **bật sẵn**, `notifications.prisma:1-4`), xóa tài khoản, DPIA/CTIA (launch §6) | Ý kiến luật sư; Privacy + Terms; đồng ý riêng cho email nhắc học; quy trình xóa; quy trình sự cố 72 giờ (G2-1, G2-2, G2-4, G2-5) |
| 14 | **Job định kỳ** (thêm vì là gap lớn) | **một phần** | 15 job "hằng giờ" chạy bằng `setInterval`, lần đầu chạy **1 giờ sau khi process khởi động** (`maintenance.scheduler.ts:52-56`, **đã kiểm phiên này**). Trong đó có việc đụng tiền: chuyển trạng thái gói hết hạn, email trial/gia hạn, thử lại sự kiện thanh toán. Cứ deploy/restart dưới 1 giờ một lần thì các việc này đứng im, không ai được báo (FD10) | Chạy một lượt ngay sau khởi động hoặc lập lịch theo giờ cố định; ghi "lần chạy gần nhất" để cảnh báo (G0-4) |
| 15 | **Kết nối DB, timeout, tắt gọn** (thêm) | **một phần** | Pool kết nối (số kết nối DB mỗi process giữ sẵn để dùng lại) có giới hạn: `DATABASE_POOL_MAX` mặc định 20 mỗi process, chờ tối đa 5 s (`app-config.ts:165-166`, **đã kiểm phiên này**). Không có `statement_timeout` (giới hạn thời gian một câu SQL). Node để `keepAliveTimeout` (thời gian giữ kết nối rảnh) mặc định 5 s, có thể gây lỗi 502 lác đác sau load balancer. `sslmode=require` bị thư viện `pg` hiểu là `verify-full`, DB dùng CA riêng sẽ lỗi kết nối (api §5, §7) | Đặt pool theo gói DB (G0-17); chỉnh timeout theo nền tảng khi đã chọn (G1-3) |
| 16 | **Chạy nhiều bản** (thêm, để thấy điểm đã đạt) | **có** | State dùng chung nằm trong Postgres; không cần sticky session, tức không phải buộc một người luôn vào cùng một bản (capacity §2) | Giữ nguyên. Lưu ý 3 điểm khi chạy 2+ bản: giới hạn AI tính theo từng process; thư sau response nằm trong RAM; job bảo trì chạy ở mỗi process, mỗi process một lần/giờ |

**Tổng:** 1 có, 8 một phần, 7 thiếu.

### 4.3 Năm gap ảnh hưởng production nhiều nhất (theo ghi chép API)

1. **Chưa có cách lên production lặp lại được, chưa có cách khôi phục dữ liệu.** Thiếu Dockerfile, workflow deploy và backup (#2, #3, #7).
2. **Hệ thống hỏng mà không ai biết.** Healthcheck giả và không có cảnh báo. DB sập, worker chết hay email nhắc ngừng gửi thì load balancer
   vẫn đưa người dùng vào (#5, #6).
3. **Chế độ production mở mặc định.** Quên đặt một biến là production chạy fake billing (cổng thanh toán giả để test). Webhook giả
   `/v1/billing/webhooks/fake` (đường dẫn để bên thanh toán báo sự kiện cho app) khi đó
   nhận sự kiện gói học từ bất kỳ ai có `BILLING_FAKE_SECRET` (`webhook.controller.ts:13-30`; #4).
4. **Job hằng giờ có thể không bao giờ chạy** khi restart dày (#14).
5. **IP thật sau proxy.** `TRUST_PROXY` sai thì mọi người dùng chung IP của proxy, và giới hạn theo IP chặn cả app (#8). Ví dụ, mình đọc
   phiên này:
   - đăng ký `auth.register.ip` = 5 lần/giờ (`app-config.ts:108`);
   - đăng nhập `auth.login.ip` = 20 lần/phút (`:109`);
   - `mail.ip.daily` = 20 lần/ngày (`:117`), gắn trên **cả đăng ký lẫn gửi OTP** (`identity/auth/auth.controller.ts:22`, `otp.controller.ts:17`).

   Khi đó cả hệ thống chỉ còn khoảng **20 lượt đăng ký/gửi OTP mỗi ngày** cho mọi người dùng chung một IP proxy (**suy luận** từ cấu hình;
   `ASSUMPTION`: hai route dùng chung một bộ đếm vì cùng tên rule).

---

## 5. Lộ trình theo giai đoạn

Cỡ việc **ước tính**, một người làm, chưa tính thời gian chờ bên ngoài: **S** ≈ ≤ 1 ngày, **M** ≈ 2–5 ngày, **L** ≈ hơn 1 tuần.

### Giai đoạn 0: trước mọi deploy (sửa code và cấu hình)

| Mã | Việc | Cỡ |
|---|---|---|
| G0-1 | Chuyển `.verify-b25-accounts.md` ra khỏi repo, thêm vào `.gitignore`, đổi mật khẩu/token nếu còn dùng | S |
| G0-2 | Chế độ production đóng: `APP_ENV=production` thì bắt buộc tắt fake billing/AI; mặc định từ chối đồ giả nếu không khai báo là dev/test | S |
| G0-3 | Healthcheck thật: `/health/live` (process sống) và `/health/ready` (`SELECT 1` + Redis `PING`, có timeout) | S |
| G0-4 | Heartbeat cho worker; job bảo trì chạy một lượt ngay sau khởi động và ghi "lần chạy gần nhất" | S–M |
| G0-5 | `TRUST_PROXY` nhận số hop hoặc dải IP Cloudflare; gom IPv6 theo /64 (T12) | M |
| G0-6 | Gỡ `SampleModule` (`/v1/sample`) khỏi bản production | S |
| G0-7 | Security header (`nosniff`, HSTS…) ở app hoặc ở Cloudflare; tắt `X-Powered-By` | S |
| G0-8 | Log thêm timestamp; access log (method, route, status, `duration_ms`); `--enable-source-maps`; log khởi động của Nest dạng JSON | S |
| G0-9 | Sentry cho API và worker. Filter lỗi của app là catch-all (`@Catch()` ở `problem-details.filter.ts:13`, **đã kiểm phiên này**), nên phải gắn `@SentryExceptionCaptured()` vào nó; không thì Sentry không thấy lỗi 5xx | S |
| G0-10 | OTP và thư tài khoản đi qua hàng đợi BullMQ có thử lại, hoặc ít nhất cảnh báo khi `mail_send_failed` tăng | M |
| G0-11 | Dockerfile nhiều tầng cho API + worker; giải chuyện build cần DB đã migrate (TypedSQL); build và chạy cùng libc vì `argon2` native | M |
| G0-12 | Script chỉ-migrate cho production; `prisma` CLI có trong image hoặc chạy ở job release riêng; tách `DIRECT_URL` khi dùng pooler | S–M |
| G0-13 | Quy ước migration an toàn trên DB đang chạy: `CREATE INDEX CONCURRENTLY`, CHECK kiểu `NOT VALID` (DB18) | S |
| G0-14 | Dependabot + `pnpm audit` trong CI + gitleaks; pin action theo SHA, khai báo `permissions` (DB17) | S |
| G0-15 | Merge M5 (PR #102) để `docs/deliveries/deploy-checklist.md` vào `dev`, bổ sung các mục còn thiếu (DB17, PL5, T7, hai worker) | S |
| G0-16 | Chạy lại `pnpm test:scale`: đo T5 sau sửa, đo lại T7/PX2 (D39 ghi "đo lại trước pilot"); quyết có sửa PX2 trước launch không | M |
| G0-17 | Đặt `DATABASE_POOL_MAX` từng process cho vừa gói DB (ví dụ API ~10, worker ~5, **ước tính** của ghi chép capacity) | S |
| G0-18 | Branch protection cho `main` và `dev` (chủ dự án bật trong GitHub settings) | S |

### Giai đoạn 1: staging công khai (bản chạy thử trên internet, giống production)

| Mã | Việc | Cỡ |
|---|---|---|
| G1-1 | Chủ dự án chốt hosting và region (sau ý kiến luật sư về lưu dữ liệu tại Việt Nam; mục 11) | quyết định |
| G1-2 | Dựng staging: API + worker + Postgres (bật PITR) + Redis (`noeviction` + AOF), **cùng region** | M |
| G1-3 | Workflow deploy API/worker + bước migrate; rollback bằng deploy lại image trước; chỉnh timeout theo load balancer của nền tảng | M |
| G1-4 | Secret trong kho của nền tảng; secret staging khác production; ghi cách xoay key AI/SMTP | S |
| G1-5 | Nhà cung cấp email, domain riêng, SPF + DKIM + DMARC `p=none`; gửi thử vào Gmail/Outlook, kiểm không rơi vào spam | S–M |
| G1-6 | Giám sát: Sentry, uptime check `/health/ready`, heartbeat worker, cảnh báo về email/Slack | S |
| G1-7 | Backup: PITR + `pg_dump` hằng tuần ra nơi khác nhà cung cấp; **diễn tập restore** ra một DB mới, ghi thời gian | M |
| G1-8 | Deploy admin (`wordmet-admin`) và DNS + TLS (chứng chỉ HTTPS) cho các subdomain | S |
| G1-9 | Kiểm các mục design Bước 3 §14: cookie/CORS/CSP (luật trình duyệt cho trang `wordmet.com` gọi sang `api.`) giữa `wordmet.com` và `api.`; email tới hộp thư thật; nhắc học đúng giờ địa phương khi server chạy UTC; Job Scheduler sống sót khi Redis khởi động lại | M |
| G1-10 | Chạy tay hai worker, kiểm không gửi 2 email nhắc học (test từng ra 2 email ngày 18/10, chưa rõ nguyên nhân, `docs/deliveries/buoc-4.md:130-133`) | S |
| G1-11 | Chạy `pnpm db:normalize-timezones`; đặt `TERMS_VERSION` khớp bản Terms đã đăng | S |
| G1-12 | Load test bằng k6 từ một máy khác cùng region: smoke → 50 người ảo 15 phút → 150 người ảo; ngưỡng đề xuất p95 < 500 ms (95% request nhanh hơn 500 ms), lỗi < 1%; theo dõi kết nối DB và hàng đợi | M |
| G1-13 | Runbook 1 trang + status page miễn phí | S |

### Giai đoạn 2: launch nhóm nhỏ

Trước khi mở cửa còn các việc sản phẩm/nội dung/pháp lý. Chúng không phải vận hành nhưng chặn ra mắt (launch, bảng B1–B18):

| Mã | Việc | Cỡ |
|---|---|---|
| G2-1 | Ý kiến luật sư: tuổi tối thiểu, DPIA/CTIA, lưu dữ liệu tại Việt Nam, email nhắc học bật sẵn, ô đồng ý gộp | quyết định + chờ bên ngoài |
| G2-2 | Privacy Policy đầy đủ cho tài khoản người học; Terms thật; bật lại link ở footer và form | M |
| G2-3 | 1 rule rate limit Cloudflare (gói Free có đúng 1 rule, đếm theo IP, chu kỳ 10 s) cho `/v1/auth/*` | S |
| G2-4 | Đồng ý riêng cho email nhắc học; cách xóa tài khoản kèm dữ liệu trong ~20 ngày (tự động ở Bước 8, hoặc quy trình tay tạm nếu luật sư cho phép) | M–L |
| G2-5 | Quy trình sự cố dữ liệu 72 giờ; người liên hệ khi có sự cố | S |
| G2-6 | App người học trên web (`/vi/app`, `/en/app`) theo plan giao diện | L |
| G2-7 | Nội dung: lô thử 20 từ, rồi duyệt tới đích 8.812 từ | L |
| G2-8 | Sửa landing: bỏ "14 ngày dùng thử, không cần thẻ" và "Tự động ưu tiên từ hay quên" (`apps/web/messages/vi.json:133, 141, 146`) | S |
| G2-9 | Kênh hỗ trợ: mục Trợ giúp/Liên hệ trong app; kiểm Email Routing của `hello@` nhận thư thật | S |
| G2-10 | Production: dựng giống staging, admin đầu tiên bằng `pnpm admin:grant`, kiểm lại G1-9 trên production | S–M |
| G2-11 | Một SLO độ sẵn sàng + một SLO độ trễ, cửa sổ 4 tuần (SLO: mục tiêu tự đặt, ví dụ "99% request trả lời dưới 900 ms") | S |
| G2-12 | Việc định kỳ: mỗi tuần xem log ngân sách email, top query chậm, số kết nối DB; mỗi tháng diễn tập restore | S (lặp lại) |
| G2-13 | Màn admin tối thiểu để vận hành không phải gọi API tay: người dùng/khóa tài khoản, câu bị báo lỗi, "Thông báo & giới hạn" | M |

### Giai đoạn 3: khi người dùng tăng

Thứ tự theo "thứ gì gãy trước" ở mục 7.3. Chỉ làm khi tín hiệu tương ứng xuất hiện.

| Mã | Việc | Cỡ |
|---|---|---|
| G3-1 | Email: nâng gói nhà cung cấp, tăng `MAIL_DAILY_BUDGET`, bật pool SMTP (`smtp-mailer.ts:15-22`) | S |
| G3-2 | Sửa PX2: viết lại câu SQL để không chạy 2 truy vấn con cho **từng** dòng (dùng `LEFT JOIN`), sắp xếp và cắt bớt ngay trong SQL; `usable()` chỉ lấy id; thêm `LIMIT` cho `mode=all` | M |
| G3-3 | PgBouncer chế độ transaction + `DIRECT_URL` cho migrate; hạ pool từng process. PgBouncer là bộ gom kết nối, cho nhiều bản app dùng chung ít kết nối DB | M |
| G3-4 | Bộ đếm rate limit chuyển sang Redis (`INCR` + `EXPIRE`) nếu ghi DB thành nút cổ chai | M |
| G3-5 | Giới hạn AI đồng thời dùng chung trên Redis thay vì đếm theo process (khi có AI cho người học và 2+ bản API) | M |
| G3-6 | Index `pg_trgm` (loại index cho tìm chuỗi nằm giữa từ) cho tìm từ; giãn nhịp gõ phía client; rate limit cho GET tìm kiếm | S–M |
| G3-7 | Tick nhắc học: lọc theo giờ gửi ngay trong SQL; `addBulk` (đưa cả loạt job vào hàng đợi một lần); tăng `concurrency` (số job gửi chạy cùng lúc) | M |
| G3-8 | Metrics/trace qua OpenTelemetry (chuẩn mở để gửi số đo) → Grafana Cloud; dashboard bốn "golden signals" (độ trễ, lưu lượng, lỗi, mức đầy) | M |
| G3-9 | Chia bảng `learning_log` theo tháng hoặc đưa dữ liệu cũ đi lưu trữ | L |
| G3-10 | Read replica (bản sao chỉ-đọc của DB) và autoscaling (tự thêm/bớt máy theo tải) | L |

---

## 6. Câu 3: quy mô hiện tại có đủ cho nhóm nhỏ không

### 6.1 Kết luận

**Đủ, dư nhiều.** Cấu hình: 1 API nhỏ (1 vCPU tức một nhân CPU ảo, 512 MB–1 GB RAM) + 1 worker + Postgres managed nhỏ cùng region + Redis nhỏ (`noeviction`,
AOF). Ước tính dưới 10% CPU và dưới 1 kết nối DB bận trung bình (capacity §8). Đây là **ước tính**, chưa có load test.

### 6.2 Giả định (đều là `ASSUMPTION`)

| Mã | Giả định (GT = giả thiết) |
|---|---|
| GT1 | 100–500 người đăng ký; 10–50 người học **cùng lúc** ở giờ đỉnh (buổi tối giờ Việt Nam). Docs dự án: pilot "kỳ vọng 10–30 người, không quá 50" (`docs/preparation/PROJECT_CONTEXT.md:56`) |
| GT2 | Một phiên flashcard ≈ 0,09 request/giây/người; một phiên luyện 10 câu ≈ 0,07. Lấy trung bình 0,1; người lật thẻ nhanh 0,5 |
| GT3 | Mỗi request ~10–15 lượt hỏi DB. Đếm thật cho một lần trả lời thẻ: ~13 lượt nối tiếp (`learning/reviews/reviews.service.ts:32-82`) |
| GT4 | DB cùng region: ~1 ms mỗi lượt hỏi tính cả mạng; khác region: ~30 ms |
| GT5 | CPU API ~1–3 ms mỗi request đơn giản (chưa đo) |

### 6.3 Phép tính (ước tính, từ capacity §8)

| Đại lượng | Trung bình | Đỉnh xấu |
|---|---|---|
| Request/giây | 50 × 0,1 = **5** | 50 × 0,5 = **25** |
| Lượt hỏi DB/giây | 5 × 13 = 65 | 25 × 15 = 375 |
| Kết nối DB đang bận, cùng region (tốc độ × thời gian giữ) | 5 × 0,015 s ≈ 0,1 | 25 × 0,015 s ≈ **0,4** trên pool 20 |
| Kết nối DB đang bận, **khác region** (13 × 30 ms ≈ 0,4 s/request) | 5 × 0,4 ≈ 2 | 25 × 0,4 ≈ **10** trên pool 20; mỗi lần lật thẻ chờ ~0,4 s |
| CPU API | 5 × 3 ms = 1,5% một vCPU | 25 × 3 ms = **7,5%** một vCPU |
| Đăng nhập dồn (50 người trong 1 phút) | 0,8 lần băm mật khẩu/giây | trần ~90/giây/bản (4 luồng / 44 ms; 44 ms lấy từ design, chưa đo) |
| RAM API | Node chưa đo + argon2 đỉnh ~76 MiB + CSV ≤ 10 MiB → nên 512 MB–1 GB mỗi process | |
| Kết nối Postgres tối đa | API 20 + worker 20 = 40 ≤ 100 (mặc định Postgres) | Phải hạ xuống, ví dụ 10 + 5, nếu gói managed chỉ cho ~22–25 |
| Nhật ký học mỗi năm | 50 người × 50 lượt/ngày × 365 ≈ 0,9 triệu dòng ≈ 0,25 GB | 500 người đều học ≈ 9 triệu dòng ≈ 2,3 GB |
| Redis | dưới vài MB | — |
| Email/ngày | nhắc học tối đa mỗi 2 ngày → ≤ 250 thư với 500 người | + OTP + thư gói: vẫn dưới 1.200, nhưng **có thể vượt 500 nếu dùng Gmail cá nhân** |

**Ở cỡ người học thực tế** (nội suy tuyến tính từ số đo 200k dòng, ước tính):
- người có 2.000 mục: `GET /v1/groups` ~5 ms + chi phí cố định;
- người có ~20.000 mục (gần trần thực tế): mở phiên "Ôn tất cả" ~0,2–0,3 s.

### 6.4 Điều kiện bắt buộc để kết luận đúng

1. **API và Postgres cùng region.** Khác region thì mỗi lần lật thẻ chờ thêm ~0,4 s, và pool 20 bắt đầu chật ở ~50 request/giây (ước tính).
2. **`TRUST_PROXY` đặt đúng** khi API đứng sau proxy/load balancer. Sai thì giới hạn theo IP chặn cả app (mục 4.3). Hiện code **chỉ nhận
   danh sách IP/CIDR** (`app-config.ts:149-158`): sau Cloudflare phải liệt kê mọi dải IP Cloudflare, mà dải này đổi theo thời gian.
   Nên làm G0-5 trước.
3. **Redis `maxmemory-policy noeviction` + AOF.** Nghĩa là Redis không tự xóa dữ liệu khi đầy, và có ghi xuống đĩa. Chỉ compose local đặt
   (`docker-compose.yml:21`), code không kiểm. Nếu Redis mất dữ liệu mà worker không khởi động lại, lịch nhắc học **dừng im lặng**: lịch chỉ
   được đăng ký lúc worker khởi động (`reminder-queue.service.ts:53-61`). Đây là suy ra từ code, chưa chạy thử.
4. **Nhà cung cấp email đủ hạn mức.** Gmail cá nhân bị giới hạn khoảng 500 email/ngày, theo trang hỗ trợ của Google
   (https://support.google.com/mail/answer/22839?hl=en [21/10/2026]).

### 6.5 Số đo đã có (cũ, trên máy CI/dev, không phải production)

| Phép đo | Kết quả | Nguồn |
|---|---|---|
| `GET /v1/groups`, 200k dòng nhóm của một người | median 335 ms (CI), đạt ngưỡng 500 ms | `docs/deliveries/buoc-3.md:78-79` |
| Mở phiên "Ôn tất cả", 200k dòng | 1,9–2,8 s; **không đạt** ngưỡng 1 s, chấp nhận theo D39, "đo lại trước pilot" | `docs/deliveries/buoc-4.md:103-106` |
| Tra/tìm từ khi có 300k từ riêng của người khác (T5), trước sửa | lookup 36 → 798 ms; `words?q` 60 → 1.474 ms | review 18/10:268-276 |
| T5 sau sửa | **chưa có số** (migration index đã vào `dev`) | capacity §1.2 |
| Import CSV thật | 7.799 entry trong 196 s | `docs/deliveries/buoc-3.md:81-82` |

Chỗ chậm đã biết (PX2, T7) chỉ ảnh hưởng **người có rất nhiều từ**, không tăng theo tổng số người dùng. Mức 200k dòng mà phép đo dùng
cao hơn mức một người đạt được thật (~20–30k mục), nên đây là ca xấu (capacity §1.3).

---

## 7. Câu 4: khi bị nghẽn thì làm gì

### 7.1 Bước 0: đo trước, sửa sau

Sửa khi chưa đo thì dễ sửa nhầm chỗ, tốn tiền mà không hết nghẽn. Theo SRE, cần bốn "golden signals" (bốn tín hiệu vàng):
- latency: độ trễ, xem p95/p99 (95%/99% request nhanh hơn mức này), không xem trung bình;
- traffic: lưu lượng;
- errors: tỉ lệ lỗi;
- saturation: mức đầy của CPU, RAM, kết nối DB, hàng đợi.

Nguồn: https://sre.google/sre-book/monitoring-distributed-systems/ [21/10/2026].

| Đo cái gì | Ở đâu trong app này | Hôm nay đo được chưa |
|---|---|---|
| p95/p99 của các route nặng: `POST /v1/practice/sessions`, `POST /v1/practice/sessions/:id/next`, `GET /v1/groups`, `GET /v1/groups/:id/queue?mode=all`, `GET /v1/words?q` | access log có `duration_ms` | **chưa** (không có access log; G0-8) |
| Tỉ lệ lỗi 5xx | Sentry hoặc access log | **chưa** (G0-8, G0-9) |
| CPU, RAM mỗi process | bảng điều khiển của hosting | sau khi deploy |
| Kết nối DB: số đang dùng, `idle in transaction`, lỗi chờ kết nối quá 5 s | `pg_stat_activity`; lỗi pool (`prisma.module.ts:25-29`) | sau khi deploy |
| Query chậm nhất theo tổng thời gian | `pg_stat_statements`, tức thống kê thời gian của từng câu SQL (https://www.postgresql.org/docs/current/pgstatstatements.html [21/10/2026]) | sau khi bật trên DB managed |
| Sort tràn ra đĩa | `temp_files` của Postgres | sau khi deploy |
| Độ sâu hàng đợi BullMQ; thời gian tick nhắc học | Redis / log worker | **chưa** |
| Email: ngân sách, tick bị bỏ, đăng ký bị từ chối | log `mail_budget_80` (`mail-budget.service.ts:70-75`), `reminder_tick_skipped` `budget-exhausted` (`reminder-tick.service.ts:47-49`), 503 `mail-unavailable` (`mail-budget.service.ts:29-36`) | **có** (log) nhưng chưa có cảnh báo |
| AI: hết hạn mức provider, trả `busy` | log `ai_provider_quota` (`runner.service.ts:246-248`) | **có** (log) |
| Job CSV quá hạn lease | log `job_lease_expired` (`job-reconciler.service.ts:58`) | **có** (log) |

**Hệ quả:** trước launch phải có access log, Sentry và cảnh báo (G0-8, G0-9, G1-6). Không có chúng thì khi nghẽn chỉ đoán được.

### 7.2 Phân loại nhanh triệu chứng

| Triệu chứng | Nguyên nhân hay gặp | Bước đầu |
|---|---|---|
| Một vài route chậm, CPU DB cao, các route khác bình thường | Query nặng (PX2, tìm từ `ILIKE '%q%'` không index) | Thang 7.4 bước (a) |
| Mọi route chậm đều, lỗi "chờ kết nối quá 5 s" | Hết kết nối DB, hoặc DB khác region | Kiểm region; thang bước (c) |
| Đăng ký/OTP lỗi 429 cho nhiều người khác nhau | `TRUST_PROXY` sai, mọi người chung một IP | Sửa cấu hình (G0-5), không phải tăng máy |
| Đăng ký lỗi 503 `mail-unavailable` | Hết ngân sách email trong ngày | Mục 7.3, dòng #1 |
| Email nhắc học không tới, API vẫn khỏe | Worker chết, hoặc Redis mất lịch tick | Xem heartbeat worker; khởi động lại worker |
| CPU API cao lúc nhiều người đăng nhập | Băm mật khẩu (4 lượt cùng lúc mỗi process, hàng chờ không giới hạn, `password-hasher.service.ts:38-52`) | Thêm bản API; rule Cloudflare cho `/v1/auth/*` |

### 7.3 Thứ tự gãy khi người dùng tăng (từ capacity §9)

| # | Điểm nghẽn | Khi nào (ước tính) | Tín hiệu theo dõi | Cách sửa |
|---|---|---|---|---|
| 1 | **Hạn mức email/ngày.** Đây là trần cứng, tăng cỡ server không giúp gì | Gmail cá nhân ~500/ngày → khoảng 1.000 người có thẻ (nhắc học mỗi 2 ngày). Ngân sách mặc định 1.500 × 80% = 1.200 nhắc/ngày → khoảng 2.400 người | `mail_budget_80`, `reminder_tick_skipped`, 503 `mail-unavailable` | Dùng dịch vụ email giao dịch qua cổng `Mailer` (`apps/api/src/common/mail/mailer.ts`); tăng `MAIL_DAILY_BUDGET`; bật pool SMTP (G3-1) |
| 2 | **Đọc nặng của người có nhiều từ.** Tăng theo số từ của mỗi người, không theo tổng người dùng | Người có hàng chục nghìn mục; phiên luyện theo nhóm 2.000 từ đọc lại cả nhóm ở **mỗi** câu | p95 các route nặng; `pg_stat_statements`; `temp_files` | PX2 (`practice-reads.queries.ts:93-101`); `usable()` (`sessions.service.ts:221-224`); `LIMIT` cho `mode=all` (`queue.queries.ts:87-88`); đo lại bằng `pnpm test:scale` (G3-2) |
| 3 | **Số kết nối Postgres khi thêm bản** | Mỗi process thêm 20 kết nối; 3 API + 1 worker = 80 so với 100 mặc định, hoặc ít hơn nhiều ở gói nhỏ | Lỗi chờ kết nối quá 5 s; `pg_stat_activity` | Hạ `DATABASE_POOL_MAX`; PgBouncer; `DIRECT_URL` cho migrate (`prisma.config.ts:25`) (G3-3) |
| 4 | **Ghi Postgres cho rate limit, idempotency, nhật ký** | Hàng trăm request ghi mỗi giây | Lượng WAL/giây, IOPS, autovacuum (lượng ghi đĩa, số thao tác đĩa, việc dọn dòng cũ của Postgres) của `rate_limit_counters`, `idempotency_keys` | Bộ đếm rate limit sang Redis (`rate-limiter.service.ts:28-32`); chia bảng nhật ký theo tháng (G3-4, G3-9) |
| 5 | **Giới hạn AI theo process** (khi Bước 7 bật AI cho người học) | Khi chạy 2+ bản API: N bản = N × 50 lời gọi cùng lúc | `ai_provider_quota`, kết quả `busy` | Đặt `ai.max_concurrent_calls` = trần provider / số bản; hoặc semaphore (bộ đếm chỗ trống) dùng chung trên Redis (`call-queue.ts:15-60`); đo khóa chung `entitlements.ai_daily` (`entitlements.locks.ts:24-27`) (G3-5) |
| 6 | **Tìm từ `ILIKE '%q%'` không index** | Catalog lớn hơn nhiều, hoặc tìm theo từng phím gõ | p95 `GET /v1/words?q`, `GET /v1/senses/search`; seq scan (Postgres đọc cả bảng) | Index `pg_trgm` (`words.service.ts:158-186`, `learner-content.service.ts:91-115`) (G3-6) |
| 7 | **Tick nhắc học quét mọi user, gửi một luồng** | Hàng chục nghìn user cùng múi giờ, cùng giờ gửi 20:00 | Thời gian tick; độ trễ từ 20:00 tới thư cuối | Lọc theo giờ trong SQL; `addBulk` (`reminder-tick.service.ts:57`); tăng `concurrency` (`reminder-queue.service.ts:63-65`) (G3-7) |
| 8 | **Worker CSV một luồng** (chỉ admin dùng) | File lớn hoặc nhiều lần import liền nhau | `job_lease_expired` | Tăng `concurrency` hoặc thêm worker; người học không bị ảnh hưởng |

### 7.4 Thang leo thang (bước sau đắt hơn bước trước)

| Bước | Làm gì | Trong code này | Chi phí thô |
|---|---|---|---|
| (a) | **Sửa query hoặc thêm index** | PX2 (`practice-reads.queries.ts:93-101`); `mode=all` không `LIMIT` (`queue.queries.ts:87-88`); `pg_trgm` cho tìm từ; settings đọc DB mỗi lần gọi, không cache (`settings.service.ts:39-46`) | Công sửa, 0 tiền hạ tầng |
| (b) | **Tăng cỡ máy** (vertical: máy to hơn, không thêm máy) | Đổi gói DB hoặc gói API trong bảng điều khiển hosting | Vài–vài chục USD/tháng. Ví dụ Render Postgres Basic-256mb $6 → Basic-1gb $19; DO PG 1 GiB (22 kết nối) → 2 GiB (47 kết nối, giá chưa đọc) |
| (c) | **Gom kết nối** (pool nhỏ lại + PgBouncer) | `DATABASE_POOL_MAX` (`app-config.ts:165`). App chỉ dùng advisory lock cấp transaction (khóa tạm app tự xin trong DB, tự nhả khi xong giao dịch), nên **tương thích** PgBouncer chế độ transaction. Prepared statement qua PgBouncer **chưa kiểm**. Migrate phải dùng kết nối thẳng (`prisma.config.ts:25` hiện chỉ có một URL) | Thường có sẵn: DO có pool PgBouncer, Railway có PgBouncer, Neon có pooler |
| (d) | **Cache** (giữ sẵn kết quả để khỏi đọc DB lại) cho dữ liệu chỉ-đọc: catalog từ, nghĩa, settings | Cache ngắn trong RAM cho settings; cache catalog ở edge | Công sửa |
| (e) | **Thêm bản API** sau load balancer (horizontal) | Đã stateless. Lưu ý: giới hạn AI theo process (`call-queue.ts`); thư sau response trong RAM nên phải tắt gọn; job bảo trì chạy N+1 lần/giờ (N bản API + 1 worker; vô hại nhưng tốn tải DB); mỗi bản +20 kết nối DB | +1 máy: ví dụ Render Starter $7, Fly 1 GB `sin` $8.50, DO Droplet $6 |
| (f) | **Dời việc chậm vào hàng đợi** | OTP sang BullMQ; nhắc học `addBulk` + tăng `concurrency` | Công sửa |
| (g) | **Chặn bớt tải** (backpressure: từ chối có kiểm soát thay vì để cả hệ thống sập) | Rate limit hiện chỉ gắn trên route ghi; thêm cho GET tìm kiếm. 1 rule Cloudflare cho `/v1/auth/*`. AI trả 429/503 kèm `Retry-After`, thêm circuit breaker (ngắt tạm khi provider lỗi liên tục). Bộ đếm rate limit sang Redis | Công sửa; Cloudflare Free có 1 rule |
| (h) | **Read replica + autoscaling** | Tách route chỉ-đọc sang bản sao | Gần gấp đôi tiền DB; nhiều công vận hành |

**Đòn bẩy khẩn cấp đã có sẵn, không cần deploy:**
- tắt AI hoặc hạ trần AI mỗi ngày (hiện phải gọi API admin, vì màn AI của admin chưa làm);
- hạ giới hạn mỗi người học trong settings (API `admin/settings` có; màn "Thông báo & giới hạn" chưa có);
- `MAIL_DAILY_BUDGET` (đổi biến này cần restart).

Nguồn thang leo: best-practice Q5, tổng hợp từ SRE "Addressing cascading failures"
(https://sre.google/sre-book/addressing-cascading-failures/ [21/10/2026], sách 2017) và Azure circuit breaker pattern
(https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker [21/10/2026]). Thứ tự (a)–(h) là **suy luận** của ghi
chép đó.

---

## 8. Hosting, email và giám sát: các lựa chọn (bảng trung lập)

Giá đọc trên trang giá của nhà cung cấp ngày **21/10/2026**, USD, chưa VAT. Tổng/tháng là **suy luận** của ghi chép best-practice
(API + worker + Postgres + Redis, chưa tính egress tức tiền băng thông ra ngoài, và chưa tính email). Thứ tự trong bảng **không** phải thứ tự ưu tiên.

### 8.1 Hosting cho API + worker + Postgres + Redis

| Lựa chọn (region) | Tổng/tháng (suy luận) | PITR | Kết nối DB gói nhỏ | Redis `noeviction` | Được | Mất |
|---|---|---|---|---|---|---|
| **Railway** (Singapore) | ≈ $10–20, tính theo usage (Hobby $5 gồm $5 usage; Pro $20) | Có, tự bật, ~4 tuần, không phí riêng | Không nêu (~100 nếu giữ mặc định Postgres, suy luận) | Không kiểm riêng | Rẻ nhất trong nhóm managed; PITR dài | Postgres một node, mặc định không HA (không có máy dự phòng tự thay khi máy chính hỏng); tiền đổi theo usage; chưa rõ gói nào được dùng region Singapore |
| **Render** (Singapore) | ≈ $31 (Hobby) → ≈ $45 nếu DB Basic-1gb; +$25 nếu lên Pro để PITR 7 ngày | 3 ngày (Hobby) / 7 ngày (Pro) | 100 | Có, docs khuyên dùng cho job queue | Ít công vận hành nhất; đủ tính năng managed | DB $6 chỉ 0,1 CPU, dễ thành nút cổ chai; giá worker ngang web service là `ASSUMPTION` |
| **DigitalOcean** (SGP1) | ≈ $36–55 (Droplet $6 hoặc App Platform $5–12 cho API và worker; PG $15.15; Valkey $15) | 7 ngày | **22** (1 GiB), 47 (2 GiB) | Có, là mặc định | PITR 7 ngày; đủ dịch vụ ở Singapore; Valkey là bản tương thích Redis | 22 kết nối: với pool mặc định 20 của app, 1 API + 1 worker đã vượt, **phải** hạ pool hoặc dùng PgBouncer |
| **AWS Lightsail** (Singapore) | ≈ $25–35 | 7 ngày, bước 5 phút | Không đọc | Không thấy Redis managed (chưa kiểm), phải tự chạy | Hạ tầng AWS | Gói DB $15 ghi **"No data encryption"** |
| **AWS đầy đủ** (RDS + ElastiCache + ECS + ALB) | ≥ $35 chỉ riêng DB + cache (RDS t4g.micro ≈ $18 + ElastiCache ≈ $14), chưa có compute và ALB | Không đọc trong phiên | Không đọc | Có ElastiCache; `noeviction` chưa kiểm | Mở rộng xa nhất | Đắt và phức tạp ở cỡ này |
| **Google Cloud** | Riêng CPU worker chạy suốt ≈ $47 (giá region mặc định); Singapore thuộc Tier 2, đắt hơn | Mặc định chưa rõ | 25 (tiny) | Có Memorystore; `noeviction` chưa kiểm | Cloud Run hợp với API | Worker chạy liên tục tốn kém; gói shared-core không có SLA |
| **Fly.io** (`sin`) | ≈ $55–65 (MPG $38 + 2 máy 1 GB × $8.50 + Upstash Fixed $10) | Không nêu | Không nêu | Dùng Upstash; docs Upstash khuyên gói Fixed cho BullMQ | Có HA và pooler theo trang giá | Đắt hơn phần lớn nhóm PaaS ở cỡ này; thông tin backup mỏng |
| **Hetzner** (Singapore), tự quản | €15.99 (CPX12: 1 vCPU, 2 GB), tự chạy hết bằng Docker Compose | Tự làm | Tự đặt | Tự đặt | Rẻ nhất theo tài nguyên | Không có DB managed: tự backup, tự PITR, tự vá |
| **Cloud Việt Nam** (VNG/GreenNode, BizFly, FPT) | Giá phần lớn không công khai. BizFly gói 1: 424.800–849.600 VND/tháng + 10% VAT, không ghi engine. FPT báo giá theo yêu cầu | FPT có ("theo từng thời điểm"); hai bên kia không nêu | Không nêu | GreenNode có Redis 4.0–7.2; `noeviction` chưa kiểm | Dữ liệu trong nước; không phụ thuộc cáp biển | Giá và tính năng kém minh bạch; phải liên hệ sales |
| **DB riêng: Neon** (Singapore) | ≈ $19 cho 0,25 CU (đơn vị sức máy của Neon) chạy suốt + storage | History 7 ngày (gói Launch) | 104, pooler 10.000 client | — | Có sẵn pooler transaction mode | Compute đặt chỗ khác |
| **DB riêng: Supabase** (Singapore) | Pro $25 | PITR là add-on $100/tháng cho 7 ngày | 60, pooler 200 | — | Backup hằng ngày 7 ngày | PITR quá đắt ở cỡ này |

**Hai cạm bẫy riêng của stack này:**
- Redis phải đặt được `noeviction`.
- Upstash gói pay-as-you-go tính tiền theo từng lệnh, mà BullMQ gửi lệnh cả khi rảnh. Upstash tự khuyên chuyển sang gói Fixed
  (https://upstash.com/docs/redis/integrations/bullmq [21/10/2026]).

**Độ trễ và cáp biển:**
- Ping giữa datacenter (WonderNetwork, đọc 21/10/2026): HCM–Singapore ~41 ms, Hà Nội–Singapore ~42 ms, HCM–Tokyo ~89 ms. Đây không phải
  số đo từ mạng di động của người dùng.
- Ngày 25/08/2026, 4/8 tuyến cáp quốc tế gặp sự cố; báo chí nhận định dịch vụ host trong nước không bị ảnh hưởng
  (https://english.vov.vn/en/society/four-undersea-cables-hit-faults-vietnams-international-internet-slows-locally-post1328208.vov [21/10/2026]).

**So với ước tính cũ:** CL E1 (`docs/preparation/COMMERCIAL_MINIMUM_CHECKLIST_2026-10-19.md`, chưa commit) ước 0,9–1,6 triệu đ/tháng.
Mình **không quy đổi** sang USD để so, vì chưa kiểm tỷ giá.

### 8.2 Email giao dịch

| Lựa chọn | Hạn mức / giá (đọc 21/10/2026) | Được | Mất |
|---|---|---|---|
| Gmail cá nhân | ~500 thư/ngày; chạm giới hạn thì khóa gửi 1–24 giờ (https://support.google.com/mail/answer/22839?hl=en) | Miễn phí, đang có | From là `@gmail.com`, không có DKIM của domain riêng; rủi ro khóa tài khoản cá nhân |
| Google Workspace | 2.000 thư/ngày/user (trial 500) | Domain riêng | Vi phạm lặp lại có thể bị treo tài khoản |
| Amazon SES | $0,10 / 1.000 email | Rẻ nhất | Nhiều thao tác hơn; thủ tục ra khỏi sandbox chưa kiểm |
| Resend | Free 3.000/tháng (100/ngày); Pro $20 cho 50k | Free đủ cho đợt đầu nếu ≤ 100/ngày | 100/ngày dễ chạm khi nhắc học dồn 20:00 |
| Postmark | $15 cho 10k/tháng | Chuyên email giao dịch | Có phí từ đầu |
| Mailgun | Free 100/ngày; Basic $15 cho 10k | Có gói free để thử | Vượt mức từ $1,80 / 1.000 thư |
| Brevo | Free 300/ngày | Free hạn mức cao hơn Resend | Giá gói Starter không đọc được |

Dù chọn bên nào cũng cần **SPF + DKIM + DMARC** cho domain gửi. Đây là ba bản ghi DNS chứng minh thư đúng là từ `wordmet.com`; thiếu thì
thư dễ vào spam. Gmail và Yahoo đã bắt buộc (https://support.google.com/a/answer/81126?hl=en [21/10/2026]). Nên thêm `List-Unsubscribe`
cho thư nhắc học ngay từ đầu.

### 8.3 Giám sát miễn phí

| Công cụ | Gói free (đọc 21/10/2026) | Ghi chú |
|---|---|---|
| Sentry Developer | 5k lỗi, 1 uptime monitor, 1 cron monitor, 1 user | Cần `@SentryExceptionCaptured()` trên filter catch-all của app |
| Better Stack Free | 10 monitor/heartbeat, 1 status page, cảnh báo Slack/email | "Free for personal projects"; điều khoản thương mại chưa đọc |
| UptimeRobot Free | 50 monitor, chu kỳ 5 phút, 1 status page | Ghi "hobby and non-profit"; gói Solo $9/tháng |
| Grafana Cloud Free | Metrics/log/trace lưu 14 ngày; k6 500 VU-giờ/tháng | Cho giai đoạn 3 |

---

## 9. Rủi ro và chỗ chưa xác minh

### 9.1 Công suất

- **Không có load test nào trong phiên này.** Mọi con số ở mục 6 là ước tính từ giả định, hoặc số đo cũ trên máy CI/dev.
- RAM thực dùng (RSS) của Node và CPU mỗi request chưa đo. Con số argon2 ~44 ms lấy từ design, không ghi máy đo.
- PX2/T7 chưa sửa và chưa đo lại, dù D39 ghi "đo lại trước pilot". T5 sau sửa chưa có số.
- Các route **chưa ai đo:**
  - `GET /v1/groups/:id/queue?mode=all` (tới 2.000 thẻ, payload 1–2 MB, ước tính);
  - `POST /v1/practice/sessions/:id/next` với nhóm 2.000 từ;
  - `GET /v1/groups` khi đã có ~1 năm nhật ký;
  - tick nhắc học với nhiều user.
- **Hai worker có thể gửi 2 email nhắc học cùng ngày.** Test từng ra 2 email ngày 18/10, chưa rõ nguyên nhân, bộ test đã bị xóa (D38).
  Cần chạy tay trước khi dùng 2 worker (G1-10).
- **Lịch nhắc học biến mất nếu Redis mất dữ liệu mà worker không restart.** Suy ra từ code, chưa chạy thử.

### 9.2 Phụ thuộc nền tảng (chỉ kiểm được khi đã chọn hosting hoặc đã deploy)

- Idle timeout của load balancer so với `keepAliveTimeout` 5 s của Node: có thể gây lỗi 502 lác đác.
- CA của Postgres managed: `sslmode=require` bị thư viện `pg` 2.14.1 hiểu là `verify-full` (kiểm chứng chỉ của DB đầy đủ), nên có thể cần khai báo `sslrootcert` (file CA của nhà cung cấp).
- `max_connections` thật của gói DB; mặc định `maxmemory-policy`/persistence của Redis managed; có bật sẵn `pg_stat_statements` không.
- `@prisma/adapter-pg` qua PgBouncer có dùng prepared statement có tên không: chưa kiểm (`ASSUMPTION`).
- Nếu image production lỡ chứa file `.env`, `process.loadEnvFile()` có ghi đè biến của nền tảng không: chưa kiểm (`ASSUMPTION`: không ghi đè).
- Các mục design Bước 3 §14 chỉ kiểm được sau deploy:
  - cookie/CORS/CSP giữa `wordmet.com` và `api.`;
  - email không vào spam, link đúng domain;
  - nhắc học đúng giờ địa phương khi server chạy UTC;
  - Job Scheduler sống sót khi Redis khởi động lại.
- Nếu app người học gọi API **từ server** (SSR trên Cloudflare) thay vì từ trình duyệt, API sẽ thấy IP của Cloudflare. Khi đó các giới hạn
  theo IP dồn vào vài IP. Chưa có code để kiểm.

### 9.3 Bảo mật và vận hành

- `.verify-b25-accounts.md` (mục 1).
- Access token không bị thu hồi giữa chừng: khóa tài khoản hay đăng xuất chỉ có hiệu lực sau tối đa 15 phút (TTL 900 s). Đây là lựa chọn
  thiết kế; ghi lại để biết.
- Hàng chờ băm mật khẩu không giới hạn độ dài. Flood đăng nhập từ nhiều IP có thể làm request treo tới 300 s (`requestTimeout` mặc định
  của Node).
- Tài khoản staff mới nhận **mật khẩu dạng chữ thường trong email** (`identity/mailer/templates.ts:38`), có cờ buộc đổi mật khẩu. Cần
  biết khi chọn nhà cung cấp email.
- Bật `BILLING_PRODUCTION=true` để chặn đồ giả **còn đổi hành vi billing**: sự kiện `sandbox` bị xử lý khác
  (`event-applier.service.ts:92`). Đây là thêm một lý do tách thành biến riêng (G0-2).
- Mới chỉ một người duyệt nội dung và một người vận hành; không có người dự phòng.
- Khoảng 55 lỗi mức Thấp của review 18/10 và 20/10 còn mở. Trạng thái "còn mở" lấy từ kiểm kê 20/10, chưa đọc lại code từng lỗi.
- Trạng thái "đã sửa" của C1–C3 dựa trên đọc code và as-built; không ai chạy test trong phiên này.
- `api.wordmet.com` trả `000` khi curl. Có thể vì chưa có bản ghi DNS, cũng có thể vì DNS của máy kiểm. Kết luận "chưa deploy" dựa thêm
  vào tài liệu.
- Email Routing của `hello@wordmet.com` chưa kiểm có nhận thư thật không.

### 9.4 Pháp lý (không phải tư vấn pháp lý; chưa có ý kiến luật sư)

- **Tuổi tối thiểu.** Code chặn dưới 13 tuổi, không có bước cha mẹ. Theo tài liệu, Luật 116/2025 Điều 16 khoản 2 có thể buộc cha mẹ đăng
  ký thay khi trẻ dưới 16. Cần luật sư.
- **Miễn DPIA/CTIA.** Các nguồn mâu thuẫn: Luật 91 Điều 38 miễn DPIA cho hộ kinh doanh và doanh nghiệp siêu nhỏ nhưng không miễn CTIA;
  EY nói Nghị định 356 miễn cả hai. Cá nhân chưa đăng ký kinh doanh thì không thuộc diện miễn nào.
- **Lưu dữ liệu tại Việt Nam** (Luật 116/2025, Nghị định 333/2026).
  - Một nguồn thứ cấp (Le Tran Law, 02/09/2026) nói nghĩa vụ là "tự động" với công ty thành lập ở Việt Nam.
  - Chưa rõ áp với cá nhân thế nào, và có cần xử lý chính tại Việt Nam hay chỉ cần một bản sao.
  - Câu này **chặn chọn region**.
  - Nghị định 356 và 333 chỉ được đọc qua nguồn thứ cấp hoặc file legal cũ, chưa đọc văn bản gốc.
- **Đồng ý.** Email nhắc học đang bật sẵn, và Terms + Privacy dùng một ô tick gộp. Có thể vướng Luật 91 Điều 9 (suy luận, cần luật sư).
- **Xóa dữ liệu.** Nghị định 356 cho khoảng 20 ngày (nguồn thứ cấp), trong khi trang Privacy hiện hứa 30 ngày. Chưa có cách xóa tài khoản.
- **Nếu thu tiền (Luật 19/2023):** phải báo trước ≥ 7 ngày làm việc trước mỗi lần thu, nhưng D29 đang để mặc định tắt. Chính sách không
  hoàn tiền gói năm (D24) có thể vướng Điều 42. Ngưỡng thuế 1 tỷ đ và 500 triệu đ mâu thuẫn giữa các nguồn.
- **Nếu bật AI:**
  - gửi dữ liệu cho AI ở nước ngoài là chuyển dữ liệu ra nước ngoài;
  - Luật AI 134/2025 yêu cầu tự phân loại rủi ro;
  - quy định under-18 của OpenAI chưa kiểm;
  - mốc 13 tuổi làm vấn đề nặng hơn.

---

## 10. Chỗ các ghi chép mâu thuẫn nhau

| # | Mâu thuẫn | Tin bên nào, vì sao |
|---|---|---|
| 1 | Ghi chép best-practice viết "Prisma 7 + `pg` mặc định pool 10, **không** timeout" và coi việc đặt pool/timeout là "quick win". Nó tính DigitalOcean 22 kết nối theo pool 10 | **Ghi chép API/capacity.** Code đã đặt rõ pool **20** và chờ **5 s** (`app-config.ts:165-166`, `prisma.module.ts:25-29`; **đã kiểm phiên này**). "Quick win" đó đã có. Nhưng ví dụ DO còn tệ hơn ghi chép best-practice tính: 1 API + 1 worker = 40 > 22, nên **phải** hạ pool. Docs Bước 6 ghi "pool 10" (`docs/deliveries/buoc-6.md:157`) cũng đã cũ |
| 2 | Hạn mức Gmail cá nhân: capacity ghi 500/ngày là `ASSUMPTION` (nguồn thứ cấp qua spec); best-practice đọc trang hỗ trợ của Google ngày 21/10 | **Best-practice**: nguồn chính thức, đọc hôm nay. Coi 500/ngày là đã xác minh |
| 3 | Hậu quả `TRUST_PROXY` sai: capacity nói login 20/phút chặn cả app; launch nói chỉ còn 5 lần đăng ký/giờ cho cả hệ thống | **Không mâu thuẫn, cả hai đúng.** Hai rule khác nhau (`app-config.ts:108-109`, đã kiểm). Mình thấy thêm rule chặt hơn: `mail.ip.daily` 20/ngày trên cả đăng ký và OTP (mục 4.3) |
| 4 | Best-practice chưa biết filter lỗi của app có bắt mọi exception không | **Đã kiểm phiên này:** `@Catch()` ở `problem-details.filter.ts:13` là catch-all, nên Sentry cần `@SentryExceptionCaptured()` |
| 5 | Chi phí: CL E1 ước 0,9–1,6 triệu đ/tháng; best-practice ước $15–70 tùy nhà cung cấp | Khác cơ sở tính và đơn vị; chưa quy đổi vì chưa kiểm tỷ giá. Dùng bảng 8.1 (giá đọc 21/10) cho quyết định |
| 6 | Cổng thanh toán: R/CL đề xuất payOS trả trước; D35 Bước 5 chỉ nhận gói tự gia hạn và đã loại payOS, VNPay | Đây là **quyết định treo**, không phải sai sót. Muốn dùng payOS thì phải mở lại D35 (mục 11) |
| 7 | Miễn trừ DPIA/CTIA; ngưỡng thuế 1 tỷ đ và 500 triệu đ; tên cơ quan nhận thông báo TMĐT | Chưa giải được từ tài liệu. Cần luật sư |

---

## 11. Quyết định cần chủ dự án

Theo quy ước của dự án, chủ dự án trả lời trước. Mỗi dòng chỉ liệt kê phương án và trade-off, **không** đánh dấu phương án nào được ưu
tiên. **Claude sẽ đưa đề xuất của mình sau khi chủ dự án trả lời.**

1. **Hosting và region** (phụ thuộc câu 7): Render SG (ít vận hành, ≈ $31–70) · Railway SG (≈ $10–20, PITR ~4 tuần, DB một node) ·
   DigitalOcean SGP1 (≈ $36–55, PITR 7 ngày, chỉ 22 kết nối) · Cloud Việt Nam (dữ liệu trong nước, giá không minh bạch) · Hetzner tự quản
   (€15.99, tự làm DBA tức tự quản trị DB) · AWS/GCP (đắt, phức tạp).
2. **Phạm vi ra mắt:** Free-only (ít nghĩa vụ pháp lý, không cần cổng thanh toán, phải sửa landing) · có Pro (có doanh thu, kéo theo hộ
   kinh doanh, thông báo TMĐT, Luật 19, trang thanh toán).
3. **AI lúc ra mắt:** không AI (Bước 7 không chặn ra mắt, ít nghĩa vụ Luật AI và ít chuyển dữ liệu ra nước ngoài) · có AI (đủ tính năng,
   cần design Bước 7, lần gọi thật đầu tiên, hạn mức chi, Privacy ghi việc gửi cho OpenAI/Anthropic).
4. **Cổng thanh toán (nếu có Pro):** Paddle (bên bán thay/MoR, 5% + 50¢, nhận cá nhân, chủ yếu thẻ) · MoMo subscription (hợp đồng merchant,
   loại hình được nhận chưa xác minh) · ZaloPay Auto Debit (hợp đồng merchant) · payOS (nhận cá nhân, chỉ trả trước, phải mở lại D35) ·
   store (chỉ khi có app mobile, suy luận).
5. **Tuổi tối thiểu:** 13 không hỏi cha mẹ (code hiện tại; rộng nhất, có thể lệch Luật 116) · 13 có bước cha mẹ (thêm luồng, thêm dữ
   liệu) · 16+ (an toàn hơn về luật, ít người dùng hơn).
6. **Hình thức pháp lý:** cá nhân chưa đăng ký (không thủ tục, không thuộc diện miễn trừ nào) · hộ kinh doanh (thủ tục nhẹ, có thể được
   miễn DPIA) · doanh nghiệp (nặng thủ tục, có thể khiến nghĩa vụ lưu dữ liệu tại Việt Nam thành "tự động").
7. **Lưu dữ liệu tại Việt Nam** (nên hỏi luật sư trước câu 1): (A) toàn bộ ở cloud Việt Nam (dễ tuân thủ nhất, giá kém minh bạch) ·
   (B) Singapore + bản sao định kỳ về Việt Nam (chưa biết bản sao có đủ không) · (C) toàn bộ ở Singapore (rẻ, minh bạch; rủi ro nếu nghĩa
   vụ là tự động).
8. **Nhà cung cấp email:** Gmail cá nhân (0 đồng, ~500/ngày, không DKIM domain riêng) · SES (rẻ nhất, nhiều thao tác) · Resend Free
   (100/ngày) · Postmark/Mailgun ($15 cho 10k) · Brevo Free (300/ngày).

---

## Nguồn

- [api-production-readiness.md](evidence/production-readiness-2026-10-21/api-production-readiness.md): kiểm vận hành và bảo mật backend,
  kèm `path:line`.
- [capacity-and-scaling.md](evidence/production-readiness-2026-10-21/capacity-and-scaling.md): công suất, chạy nhiều bản, nút cổ chai,
  phép tính tay.
- [launch-completeness.md](evidence/production-readiness-2026-10-21/launch-completeness.md): tính năng, nội dung, pháp lý, lỗi còn mở
  cho bản web.
- [best-practice-hosting-scaling.md](evidence/production-readiness-2026-10-21/best-practice-hosting-scaling.md): checklist của các công
  ty, giá hosting 21/10/2026, email, giám sát, playbook khi nghẽn.
- Kiểm thêm trong phiên này, trên bản chụp `dev` @ `985531b`:
  - `health.controller.ts`;
  - `app-config.ts:106-125, 165-166, 184-185, 197, 215, 232-241`;
  - `rate-limit.guard.ts:20-32`;
  - `maintenance.scheduler.ts:50-56`;
  - `problem-details.filter.ts:13`;
  - `auth.controller.ts:22`, `otp.controller.ts:17`;
  - `git check-ignore .verify-b25-accounts.md` (mã 1).
