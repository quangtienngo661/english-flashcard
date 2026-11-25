# Checklist Deploy — việc phải làm trước khi launch

Bắt đầu 21/10/2026, từ đợt sửa thiếu sót Bước 0–3 (as-built: [`buoc-0-3-fixes.md`](buoc-0-3-fixes.md)). Trước đó chưa có checklist nào
cho bước Deploy; các bước sau thêm mục vào đây. Mỗi mục ghi nguồn (mục design / mã phát hiện) và một dòng vì sao.

Deploy làm khi toàn bộ app hoàn chỉnh, trước ra mắt (D3 vòng 3 của Bước 3). Việc chung của bước đó (hosting, Postgres/Redis bền, SMTP thật,
secret, backup) nằm ở design Bước 2.5 §14; những thứ chỉ kiểm được sau khi deploy nằm ở design Bước 3 §14. File này không chép lại hai chỗ đó.

## Rate limit và mạng

- [ ] **Đặt `TRUST_PROXY` đúng với proxy / load balancer thật.** Nguồn: T12 (review 18/10, FD4(a); design sửa thiếu sót §3 "Không làm").
  Vì sao: mặc định `false`; đứng sau proxy thì mọi người dùng chung IP của proxy, nên giới hạn theo IP (đăng ký 5/giờ, thư 20/ngày…) thành
  giới hạn chung cả hệ thống.
- [ ] **Gom IPv6 theo dải (vd. /64) trước khi tính bucket rate limit, nếu bản deploy nhận IPv6.** Nguồn: T12 (FD4(b), review 18/10). Vì sao:
  hiện mỗi địa chỉ /128 một bucket, đổi địa chỉ trong cùng dải /64 là vượt mọi giới hạn theo IP. Việc này **cần sửa code** (`RateLimitGuard`).
- [ ] **Kiểm rate limit với nhiều request cùng lúc ngay ranh giới cửa sổ, trên Postgres thật.** Nguồn: Task 26 (ca "N concurrent at
  boundary" của file test đã xóa không có chỗ thay). Vì sao: unit test chỉ kiểm phép cộng nguyên tử, chưa ai thấy trên DB thật rằng không
  vượt `max` khi đông người cùng lúc.

## Kết nối DB

- [ ] **Đo và đặt `DATABASE_POOL_MAX`, `DATABASE_POOL_TIMEOUT_MS` theo DB thật được deploy.** Nguồn: design sửa thiếu sót §6.1, §11.3 (20 và
  5000 là `ASSUMPTION`). Vì sao: số kết nối tối đa của DB thuê có giới hạn; pool quá to thì hết kết nối, quá nhỏ thì request chờ rồi lỗi.
- [x] **Cộng ngân sách kết nối: API (mặc định 20) + worker (mặc định 20) + các CLI chạy cùng lúc (`maintenance:run`, `admin:grant`…) phải
  nhỏ hơn số kết nối tối đa của DB.** *(Đã kiểm 14–15/11: API 20 + worker 20 = 40 < Postgres `max_connections` 100; đỉnh load test 50 người dùng là 21/100, `2026-11-14-production-checks.md`, `2026-11-15-load-test.md`.)* Nguồn: M1 final review. Vì sao: mỗi process có pool riêng; tổng vượt mức DB cho phép thì process sau
  không kết nối được.
- [ ] **Pool của worker ≥ 2 × số job import CSV chạy cùng lúc.** Nguồn: M1 gate (21/10; xem as-built). Vì sao: worker pool 1 thì job
  import không xử lý được dòng nào; pool 20 thì chạy. `ASSUMPTION` về nguyên nhân (chưa đọc stack): mỗi job giữ một kết nối cho transaction
  "rào" và mở thêm một kết nối khi ghi nội dung.

## Cấu hình và dữ liệu

- [x] **Đặt `TERMS_VERSION` bằng phiên bản thật của trang Điều khoản.** *(Đã xong: `TERMS_VERSION` đã đặt trên VPS từ 14/11 và văn bản pháp lý phiên bản `1` đã đăng trong admin `/legal`, `GET /v1/legal/current` trả `200` ngày 20/11.)* Nguồn: design sửa thiếu sót §11.6. Vì sao: hiện là giá trị tạm
  `2026-10-20`; mỗi lần đăng ký ghi giá trị này làm bằng chứng người dùng đã đồng ý phiên bản nào. Thiếu biến thì API và worker không khởi động.
- [ ] **Chạy `pnpm db:normalize-timezones` một lần trên DB thật (sau `pnpm build`), bằng cùng phiên bản Node/ICU với API.** Nguồn: design
  §6.2 (C2), Task 5. Vì sao: dữ liệu cũ còn múi giờ viết kiểu lạ (`asia/ho_chi_minh`, `+07:00`); tên chuẩn phụ thuộc bảng ICU của Node
  (Node 24.11 cho `Asia/Saigon`), chạy bằng Node khác có thể ra tên khác với tên API ghi.
- [ ] **Luật sư xem lại mốc 13 tuổi không hỏi cha mẹ; trang Điều khoản ghi "dưới 16 tuổi cần cha mẹ đồng ý".** Nguồn: design §11.2 (D4).
  Vì sao: Luật BVDLCN 2025 Điều 24 khoản 2 nói về người đại diện của trẻ dưới 16 tuổi.

## Chặn đồ giả ở production (đợt A, R3)

- [x] **Đặt `BILLING_PRODUCTION=true`; KHÔNG đặt `BILLING_FAKE_ENABLED`, `AI_FAKE_ENABLED`, `GOOGLE_FAKE_ENABLED`; đặt `TURNSTILE_MODE=real`** *(Đã kiểm trực tiếp trong container VPS ngày 14–15/11: `BILLING_PRODUCTION=true`, `TURNSTILE_MODE=real`, cả 6 cờ `*_FAKE_ENABLED=false`, `2026-11-14-production-checks.md`, `2026-11-15-pilot-readiness.md`. Lưu ý: bước thử bật ngược từng cờ giả trên VPS chưa ghi nhận riêng, nhưng cơ chế `superRefine` đã khóa bằng unit test.)*
  Nguồn: [X-3](../superpowers/reviews/2026-10-29-buoc-1-8-review.md#x-3), [B5-2](../superpowers/reviews/buoc-1-8/buoc-5.md#b5-2), Q13 (02/11/2026 giữ cơ chế, chỉ thêm mục checklist; 07/11/2026 bỏ giá trị mặc định).
  Vì sao: `BILLING_PRODUCTION=true` cùng một đồ giả (thanh toán, AI, Google, hoặc `TURNSTILE_MODE` là `fake`/`off`) làm API và worker dừng ngay khi khởi động
  (`apps/api/src/common/config/app-config.ts`, `superRefine`). Từ 07/11/2026 biến này không có giá trị mặc định: thiếu nó thì API và worker cũng không khởi động, nên không còn
  trường hợp quên biến mà đồ giả vẫn chạy. Đặt nhầm `false` ở production thì vẫn hở, nên mục này vẫn cần.
  Kiểm: trên môi trường production thật, thử bật từng đồ giả một và thấy API cùng worker dừng với tên hai biến trong thông báo, rồi bỏ đồ giả đó đi.

## Lượt AI cho Free và trial đã tắt (đợt A M3, 05/11/2026)

- [x] **DB production tạo mới bằng `prisma migrate deploy`.** *(Đã kiểm 15/11: đủ 65 migration đã áp trên DB production, `2026-11-15-restore-drill.md`.)* Migration `20261105100000_free_ai_cycle` thêm `subscriptions.ended_at` và `usage_records.plan` (cả hai `NULL`, không backfill).
  Vì sao: một DB đã có người dùng Pro cũ thì dòng cũ không có `ended_at`, nên lượt Pro cũ của họ có thể bị tính vào lượt Free tháng này (sai về phía chặt, không cho thêm lượt).
- [x] **Ba setting mới trong Cài đặt → Gói và lượt: `free_ai_practice_per_cycle` (15), `free_ai_lookup_per_cycle` (5), `free_ai_daily_cap` (500).** *(Đã kiểm 15/11 trong `app_settings` production: `ai_daily_cap=1000`, `free_ai_daily_cap=500`, `2026-11-15-pilot-readiness.md`.)* Landing ghi cứng "15/tháng" và "5/tháng"
  (`Landing.plans.freeAiPractice`, `freeAiLookup`): đổi số ở Cài đặt thì sửa chữ landing trước khi đăng. `free_ai_daily_cap` là số ước; xem lại sau tuần đầu có người dùng thật.
- [x] **Chữ hứa dùng thử không còn ở web, landing và bản nháp pháp lý; `trial_eligible` luôn `false`.** *(Đã kiểm 14/11 trên `/vi`, `2026-11-14-production-checks.md`; văn bản pháp lý v1 đã đăng 20/11.)* Mục 5 "Dùng thử" của Điều khoản còn trong bản nháp: đợt B viết lại các mục 5–8.
  Code trial giữ nguyên cho một nhà cung cấp tự gia hạn về sau; các test e2e/smoke dựng trial bằng provider giả vẫn chạy.
- [ ] **Cửa sổ Free theo tháng dương lịch của múi giờ người học.** Đổi múi giờ cuối tháng có thể cho thêm tối đa một lượt Free đầy đủ (LA3E3, LA3E4); chấp nhận.

## AI và riêng tư (Bước 6–7)

Nguồn chung: [B6-1](../superpowers/reviews/buoc-1-8/buoc-6-and-7.md#b6-1); chi tiết ở design Bước 6 §18–§19 và Bước 7 §19–§20.

- [ ] **Chính sách bảo mật nêu việc gửi từ riêng và câu ngữ cảnh của người học cho OpenAI/Anthropic (bên nhận ở Mỹ), và việc `ai_call_contents` giữ nội dung 7 ngày, admin đọc được**
  (`apps/api/src/ai/reports/reports.service.ts:218-235`). Nguồn: B6 §18, F29, SR15. Vì sao: trang chính sách hiện chưa nhắc AI; bản nháp đã ở nhánh `docs/web-launch-research`.
- [ ] **Điều khoản xử lý dữ liệu của từng provider (F30); OpenAI cho người dưới 18 tuổi và ZDR so với mốc 13 tuổi của app; không dùng model có giữ dữ liệu 30 ngày.**
  Nguồn: B6-1. Vì sao: app nhận người học từ 13 tuổi và gửi nội dung người học cho provider.
- [ ] **`max_concurrent_calls` (50) đếm theo từng tiến trình, không theo cả hệ thống: đặt theo tier của provider khi chạy nhiều instance.** Nguồn: B6 §18 "Deploy".
  Vì sao: hai instance API cộng worker là hơn 50 lượt song song; tier Anthropic thấp hơn thế thì 429 hàng loạt.
- [ ] **Ba điểm riêng tư của Bước 7 (B7 §20) và chữ "300 câu AI" của gói Pro (B7 §19).** Vì sao: chữ trên trang gói, landing và chính sách phải khớp số thật trong Cài đặt (`pro_ai_practice_per_cycle`).
- [ ] **Sau khi migrate bản có "từ đồng nghĩa trong phiên": mở Admin → AI → Prompts → `generate_cloze` và xem bản đang chạy có nhắc `session_words` không** (`docs/deliveries/session-synonyms.md`, mục "The owner's steps").
  Vì sao: migration chỉ thay prompt khi bản đang chạy còn đúng chữ của bản gốc; đã sửa chữ thì chỉ in một thông báo và bản cũ vẫn chạy, nên câu AI không khai đáp án thay thế.
- [ ] **Chính sách bảo mật nêu rằng mỗi câu điền từ AI gửi kèm danh sách từ của phiên (tối đa 99 từ, kèm nghĩa tiếng Việt), từ riêng của người học cũng nằm trong đó.** Nguồn: design `2026-11-06-cloze-session-synonyms` §5.5, D13. Vì sao: trước đây chỉ gửi từ đang hỏi.

## Trước khi bán thật (Bước 5)

- [ ] **D24/Điều 42 và email báo trước khi gia hạn; bộ nối thanh toán thật gửi `transaction_id` (D37) và có `fetchState` (D39); đo khóa trần AI dưới tải.**
  Nguồn: [B5-9](../superpowers/reviews/buoc-1-8/buoc-5.md#b5-9), design Bước 5 §18–§19. Vì sao: hiện chỉ có nhà cung cấp giả nên chưa ai gặp; `B5-2`/R17 ở mục "Chặn đồ giả" trên.

## Đo tải trước launch

- [ ] **Chạy `pnpm test:scale` (300.000 từ riêng của người học khác) trên máy giống bản deploy.** Nguồn: design §6.4 (T5), M3 gate
  (21/10; xem as-built). Vì sao: số đo T5 có từ Task 6 (trước M3); sau M3, tra từ (`/v1/lookup`) vẫn đọc toàn bộ index lemma của
  catalog (1,3 ms ở 5.000 từ), thời gian tăng theo cỡ catalog (mục tiêu 8.812 từ). Cần thấy con số thật trước khi có người dùng.
- [ ] **Đo lại "Ôn tất cả" (D39).** Nguồn: [B4-1](../superpowers/reviews/buoc-1-8/buoc-3-and-4.md#b4-1). Vì sao: số đo hiện có là của lúc chưa có D39.
- [ ] **Đo search/browse của người học khi bảng có từ riêng (B2-5) và đo mở phiên có 50 từ dạng AI, mỗi từ một query (B7-5).** Nguồn:
  [B2-5](../superpowers/reviews/buoc-1-8/buoc-2-and-2-5.md#b2-5) (`apps/api/test/content/lookup.scale.e2e-spec.ts`, `pnpm test:scale`),
  [B7-5](../superpowers/reviews/buoc-1-8/buoc-6-and-7.md#b7-5) (`question-builder.service.ts:94-103`). Vì sao: hai chỗ này là `ASSUMPTION` chưa đo.
- [ ] **Đo lại `GET /v1/groups` với 100 nhóm × 2.000 từ trên máy chủ thật.** Nguồn: [`giao-dien-moi.md`](giao-dien-moi.md) (as-built M3; `pnpm test:scale`). Vì sao: trên máy dev, median 399 ms khi chạy một mình, ngưỡng 500 ms; chạy song song với `pnpm test` đo 582 ms, vượt ngưỡng.

## Admin web

- [x] **Security header cho admin tĩnh: phần code đã làm (đợt A, M1, 04/11/2026).** Nguồn: AD12 (kiểm kê
  [`inventory-admin-practice.md`](../superpowers/reviews/2026-10-20-buoc-0-3-review-evidence/inventory-admin-practice.md)). `apps/admin/public/_headers` có một rule `/*`
  với CSP (chấp nhận `'unsafe-inline'` cho `style-src` vì React Aria tự chèn thẻ `<style>`), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`;
  `apps/admin/src/headers.test.ts` ghim nội dung. `vite` và `vite preview` không đọc `_headers`, nên local không có header này.
- [x] **Sau khi deploy admin: kiểm header thật bằng `curl -I`.** *(Đã kiểm 14/11 và 20/11: `https://admin.wordmet.com/` và `/uploads` trả đủ 4 header CSP, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; vẫn thiếu HSTS ở mục dưới.)* Vì sao: hai `ASSUMPTION` của design đợt A (§4.4) chưa kiểm được ở local: Workers Static
  Assets áp `_headers` cho cả trang trả về từ fallback SPA, và Vite copy `public/` vào `dist/`. Làm: `curl -I https://admin.wordmet.com/` và một đường dẫn sâu
  (vd `/uploads`) phải có bốn header trên; `dist/_headers` giống `public/_headers` sau `pnpm build`.
- [x] **Security header cho API: phần code đã làm (đợt A, M1).** Nguồn: FD-dj. API dùng `helmet` với năm header của một API JSON: không `X-Powered-By`;
  `X-Content-Type-Options: nosniff`; `Referrer-Policy: no-referrer`; `Content-Security-Policy: default-src 'none';frame-ancestors 'none'` (helmet viết
  không có dấu cách sau `;`); `Cross-Origin-Resource-Policy: same-site`. Sửa 14/11/2026: API tự đặt `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  (`app.setup.headers.spec.ts` ghim), vì `api.` và `admin-api.` trỏ thẳng VPS (Q6), không qua proxy Cloudflare.
- [ ] **Sau khi deploy API & web: kiểm HSTS và header.** *(Kiểm lại 20/11/2026: `api.wordmet.com` và `admin-api.wordmet.com` **ĐÃ CÓ** đủ 5 header + `Strict-Transport-Security: max-age=31536000; includeSubDomains`; `http://wordmet.com` và `http://admin.wordmet.com` đã redirect `301` → HTTPS. **Còn mở:** `https://wordmet.com/` và `https://admin.wordmet.com/` vẫn **chưa có header `Strict-Transport-Security`** — cần bật HSTS ở Cloudflare → SSL/TLS → Edge Certificates hoặc thêm trực tiếp vào headers của web/admin.)*
- [x] **Sau khi deploy web: kiểm header của web.** *(Đã kiểm 14/11 và 20/11: `/vi` và `/vi/app` có đủ CSP, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; đã xác nhận `/_next/static/*` do Workers Static Assets trả thẳng không có security header, `2026-11-14-production-checks.md`.)*

## Từ kiểm kê 20/10, mức Thấp, đã gắn nhãn "deploy-checklist" (chưa làm, D11)

- [x] **`LEARNER_APP_URL` là biến bắt buộc.** *(Đã kiểm 14/11 trên VPS: đúng host production `https://wordmet.com`, `2026-11-14-production-checks.md`.)* Nguồn: L17 ([`inventory-identity-learning.md`](../superpowers/reviews/2026-10-20-buoc-0-3-review-evidence/inventory-identity-learning.md)). Vì sao: `.env` cũ thiếu biến này thì API và
  worker không khởi động.
- [ ] **Quy ước migration khi bảng đã có dữ liệu: `CHECK … NOT VALID` rồi `VALIDATE CONSTRAINT`; `CREATE INDEX CONCURRENTLY` đứng riêng một
  migration.** Nguồn: DB18 (`inventory-foundation-db.md`, như trên). Vì sao: cách hiện nay khóa cả bảng trong lúc quét; vô hại khi bảng trống, chặn
  ghi khi `learning_log` đã lớn.

## Chống bot và tấn công (trao đổi 26/10/2026)

Bối cảnh: landing `wordmet.com` (chỉ landing, chưa có API/app) đã nhận hơn 7000 request từ nhiều nước. Kiểm ngày 26/10/2026, chưa xem
được Cloudflare dashboard nên **chưa xác nhận** tỉ lệ bot/người:
- crt.sh cho thấy domain đã có chứng chỉ từ 06/2020–01/2021 (trước khi dự án dùng), rồi lại từ 09/2025: link và crawler cũ có thể vẫn gọi tới.
- `https://wordmet.com/robots.txt` trả `Allow: /` vì `deploy-web.yml` đặt `NEXT_PUBLIC_INDEXABLE: 'true'` (code mặc định chặn tới launch, W14).
- Mỗi lần gia hạn chứng chỉ hiện trong nhật ký công khai (Certificate Transparency); bot quét lỗ hổng đọc nhật ký này và dò `/wp-login.php`,
  `/.env`, `/.git/config`… để tìm key bị lộ hoặc site dễ chiếm. Landing chạy trên Workers nên các đường này chỉ ra 404.
- Một lượt xem sinh nhiều request (307 `/` → `/vi`, JS, CSS, font, ảnh); so **Requests** với **Visits** trong Cloudflare Analytics để biết.

Thông thường site nhỏ không cố chặn hết bot; chỉ bảo vệ chỗ bot gây hại được (form, đăng nhập, gửi email, chi phí) và không chặn Googlebot/Bing.

- [ ] **Quyết định `NEXT_PUBLIC_INDEXABLE` trên `main` trước launch.** Nguồn: trao đổi 26/10. Vì sao: hiện production đã cho mọi bot index
  landing; nếu chưa muốn lên kết quả tìm kiếm thì bỏ biến này trong `deploy-web.yml`.
- [ ] **WAF custom rule chặn đường dò lỗ hổng** (đường dẫn chứa `/wp-`, `/.env`, `/.git`, `xmlrpc.php`, `phpmyadmin` → Block), áp cho cả
  `wordmet.com`, `api.`, `admin-api.`, `admin.`. Nguồn: tài liệu Cloudflare WAF custom rules (đọc 26/10: gói Free có 5 rule). Vì sao: không
  ảnh hưởng người thật vì app không có các đường này; giảm log rác.
- [ ] **Cân nhắc Bot Fight Mode — chỉ sau khi tính tới API và app mobile.** Nguồn: tài liệu Cloudflare Bot Fight Mode (đọc 26/10). Vì sao:
  miễn phí, nhưng áp cho cả domain, **không tạo ngoại lệ được** bằng WAF rule, có thể thách thức nhầm traffic API/mobile, và tự chèn JS
  detection cần CSP cho phép (CSP hiện ở chế độ D20). `ASSUMPTION`: CSP hiện tại có chặn JS này hay không — chưa thử.
- [x] **CAPTCHA (Cloudflare Turnstile): phần code đã làm (đợt A, M1, 04/11/2026).** Nguồn: trao đổi 26/10; design
  [`2026-11-04-chuan-bi-launch-a-design.md`](../superpowers/specs/2026-11-04-chuan-bi-launch-a-design.md) §4. Phạm vi thật: đăng ký, đăng nhập, xin mã OTP
  (đặt lại mật khẩu và gửi lại mã xác minh) của web; đăng nhập và quên mật khẩu của admin. Waitlist đã bị bỏ từ 03/11. API kiểm token phía server
  (`TurnstileGuard`), domain Turnstile là `challenges.cloudflare.com` (đã có trong CSP của web và admin).
- [ ] **Turnstile: việc cần làm lúc deploy.** Làm theo thứ tự:
  1. Tạo **một** widget Turnstile trong Cloudflare, đăng ký đủ ba hostname `wordmet.com`, `www.wordmet.com`, `admin.wordmet.com`. Một widget thì
     web và admin dùng chung một site key và API chỉ có một secret.
  2. API: đặt `TURNSTILE_MODE=real`, `TURNSTILE_SECRET_KEY`, `TURNSTILE_ALLOWED_HOSTNAMES=wordmet.com,www.wordmet.com,admin.wordmet.com`. Thiếu
     `TURNSTILE_MODE` hoặc dùng `fake`/`off` cùng `BILLING_PRODUCTION=true` thì API và worker từ chối khởi động.
  3. Đặt site key: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` trong `deploy-web.yml` lúc bật app (build web của `https://wordmet.com` với app bật mà thiếu thì
     fail), và `VITE_TURNSTILE_SITE_KEY` khi build admin (`pnpm build` fail nếu thiếu).
  4. **Deploy API trước, rồi web và admin.** Web bản mới gửi `turnstile_token` tới API bản cũ sẽ nhận 400 (schema strict).
  5. Sau deploy: `curl -i -X POST https://api.wordmet.com/v1/auth/register -H 'content-type: application/json' -d '{}'` phải trả 400 (thiếu token);
     log của API không có `turnstile_misconfigured`; đăng ký và đăng nhập thật trên web, đăng nhập trên admin chạy được.
  6. Cloudflare lỗi thì đăng ký và xin mã trả 503 `captcha-unavailable`, đăng nhập cho qua và log `turnstile_bypassed`: nhớ xem log này nếu thấy nhiều.
  7. `TRUST_PROXY` phải đúng với proxy thật (mục riêng ở trên), vì `remoteip` gửi cho Cloudflare và bộ đếm `auth.captcha.ip` dựa vào IP.
- [ ] **Giới hạn chi phí AI trước khi gắn key thật.** Nguồn: trao đổi 26/10; Bước 5–6 đã có `ai_daily_cap`, trần lần gọi provider mỗi ngày,
  công tắc AI. Vì sao: tài khoản Trial tạo hàng loạt có thể đốt tiền AI. Việc: đặt trần thấp lúc ra mắt, rồi bật **giới hạn chi tiêu và
  cảnh báo** ngay trên tài khoản OpenAI/Anthropic (lớp chặn cuối nếu app có lỗi).
- [ ] **Đặt `admin.` (và `admin-api.` nếu được) sau Cloudflare Access.** Nguồn: trao đổi 26/10. Vì sao: thêm một lớp đăng nhập trước cả
  trang login admin, bot không chạm tới form đăng nhập. `ASSUMPTION`: gói Free của Cloudflare Zero Trust có Access cho tối đa 50 người —
  chưa xác nhận được từ tài liệu ngày 26/10; kiểm cookie `refresh_token` và CORS của admin vẫn chạy sau Access.
- [ ] **Webhook của cổng thanh toán thật phải kiểm chữ ký (signature) và chống phát lại.** Nguồn: trao đổi 26/10; Bước 5 chỉ có provider giả.
  Vì sao: không kiểm chữ ký thì ai cũng gửi được thông báo "đã trả tiền" giả. Làm khi tích hợp provider thật.

## Giao diện người học (`apps/web`, design giao-dien-nguoi-hoc, 22/10/2026)

- [ ] **Worker Cloudflare của `apps/web` khi bật `NEXT_PUBLIC_LEARNER_APP=on`: kiểm cỡ chưa nén (≤ 64 MiB) và thời gian khởi động
  (≤ 1 giây).** Nguồn: D21, design §4.5; **sửa 26/10/2026** theo trang giới hạn Cloudflare Workers (cập nhật 12/10/2026, đọc 26/10):
  "Worker size (uncompressed)" là 64 MiB cho cả Free và Paid, "There is no compressed size limit"; số gzip chỉ để tham khảo. Ghi cũ
  "khoảng 3 MiB sau nén, vượt gói Free, phải nâng Paid" **không còn đúng**. Vì sao vẫn giữ mục: Worker phải chạy xong phần code ngoài
  handler trong 1 giây (lỗi `10021` "Script startup exceeded CPU time limit"), bundle càng to càng dễ chạm. Việc: đo "Total Upload"
  (chưa nén; các số dưới đây chỉ là gzip, **chưa ai ghi số chưa nén**) và `wrangler deploy --dry-run`, rồi sau deploy xem không có lỗi `10021`.
  Số gzip đã đo: 22/10 (M1, Task 1) landing chưa có app 2.941,92 KiB, có app 2.943,28 KiB; hết M2 (23/10) tắt app 2.963,24 KiB, bật app
  3.462,38 KiB; hết M3 bật app 3.706,34 KiB; hết M4 3.739,72 KiB; hết đợt (M5b, 26/10) 3.761,49 KiB; mỗi mốc ở
  `docs/deliveries/giao-dien-nguoi-hoc.md`. Đo bằng
  `NEXT_PUBLIC_LEARNER_APP=on NEXT_PUBLIC_API_BASE_URL=http://localhost:3000 pnpm cf:docker --build` (in dòng "Total Upload … gzip"; thiếu `NEXT_PUBLIC_API_BASE_URL` thì build dừng).
- [x] **Ngay sau lần đầu CSP lên `main`, mở `wordmet.com` và `/vi/app` trên production, xem Console không có lỗi CSP.** *(Đã kiểm 14/11 trên `/vi` và `/vi/app/login`, 0 lỗi CSP, beacon `POST /cdn-cgi/rum` trả 204, `2026-11-14-production-checks.md`.)* Nguồn: D22,
  design §4.6. Vì sao: beacon Cloudflare Web Analytics chỉ chèn ở edge, e2e local không thấy; CSP đang ở chế độ dự phòng D20
  (`'unsafe-inline'` cho script/style) vì Next chèn script `self.__next_f.push(…)`.
- [ ] **Chính sách bảo mật nhắc việc đo lượt xem bằng Cloudflare Web Analytics.** Nguồn: D22, design §12. Vì sao: script bên thứ ba duy nhất
  chạy trên mọi trang, kể cả `/app`.
- [x] **Bản build production bật app phải có `NEXT_PUBLIC_API_BASE_URL` với host bắt đầu bằng `api.`.** *(Đã đặt `https://api.wordmet.com` trong `.github/workflows/deploy-web.yml:89`.)* Nguồn: design §4.2. Vì sao: cookie
  `refresh_token` host-only của `admin-api.` và `api.` không được đè nhau; `next.config.ts` dừng build khi sai.
- [x] **Dọn tài khoản chưa từng xác nhận email sau N ngày (đã có job `identity.unverified-cleanup`, `deletion-jobs.service.ts:36`; [B8-6](../superpowers/reviews/buoc-1-8/buoc-8.md#b8-6)).** Nguồn: A5 đợt cải thiện nhóm A (design `../superpowers/specs/2026-10-26-dot-cai-thien-a-design.md` §4),
  làm cùng phần xoá tài khoản của Bước 8. Vì sao: từ đợt này tài khoản chưa xác nhận không vào được app nhưng vẫn nằm trong DB và giữ chỗ email;
  `identity-cleanup.service.ts` chỉ xoá OTP và chuỗi phiên hết hạn.

- [x] **Xem lại CSP (nonce hoặc hash thay `'unsafe-inline'`) trước khi bật `/app`.** *(Đã triển khai ở Launch B M4 và kiểm trên production 14/11 & 20/11: `/vi/app` trả `script-src 'nonce-…' 'strict-dynamic'`, mỗi request một nonce mới.)* Nguồn: [UW-4](../superpowers/reviews/buoc-1-8/giao-dien-nguoi-hoc-and-admin.md#uw-4). Vì sao: D20 đang để
  `'unsafe-inline'` vì Next chèn script RSC inline; script Turnstile (đợt A) phải còn nạp được sau khi đổi.
- [ ] **Build và kiểm bản cờ app tắt (cấu hình production hiện tại, `NEXT_PUBLIC_LEARNER_APP` không đặt).** Nguồn: [UW-3](../superpowers/reviews/buoc-1-8/giao-dien-nguoi-hoc-and-admin.md#uw-3).
  Vì sao: CI và e2e chỉ build với app bật; bản app tắt (`/…/app/*` chuyển về landing) chưa được thử trong CI.
- [ ] **Chạy tay hai worker gửi nhắc học cùng lúc (G1-10).** Nguồn: [B3-1](../superpowers/reviews/buoc-1-8/buoc-3-and-4.md#b3-1); checklist dev 04/11 (mục D, bản nháp local) đã có bước này.

## Giao diện mới M8: trang công khai (design giao diện mới §10.6, §10.7, QM8, 11/11/2026)

- [x] **Đặt `LANDING_DATA_REQUIRED=1` và địa chỉ API trong `deploy-web.yml` khi `api.wordmet.com` đã chạy.** *(Đã đặt trong `.github/workflows/deploy-web.yml:89,95` và đã deploy thành công.)* Nguồn: design §10.6, Part 8
  của plan (M8.3).
- [x] **Đổi giá hoặc đăng hỏi đáp trong admin xong thì deploy lại web.** *(Đã thay bằng đọc live ở trình duyệt từ PR #312 ngày 19/11, `docs/deliveries/landing-live-plans.md` — không cần deploy lại web nữa, chỉ còn JSON-LD giữ giá lúc build.)* Nguồn: design §10.6, §10.7.
- [ ] **Chủ dự án sửa văn bản Chính sách bảo mật và Điều khoản sử dụng trong admin `/legal`:** bỏ tiêu đề, dòng "Phiên bản · Có hiệu lực",
  đoạn mở và "Mục lục" viết tay ở đầu văn bản, rồi đăng bản mới. Nguồn: QM8-4. Vì sao: trang mới tự vẽ các phần đó, giữ lại thì trang có hai tiêu đề và
  hai mục lục.
- [ ] **Chủ dự án kiểm câu chữ nháp** trước launch: 6 câu trả lời hỏi đáp (admin "Hỏi đáp trang chủ"), các câu sửa trên trang chủ và câu "Không hoàn tiền
  tự động." Nguồn: QM8-6.
- [ ] **Ghi cỡ Worker sau khi đổi font ảnh chia sẻ** (M8.11), theo lệnh ở mục Worker.

## Landing mới (`apps/web`, design landing-redesign §9, 03/11/2026)

- [x] **`deploy-web.yml` phải build với `NEXT_PUBLIC_LEARNER_APP=on` và `NEXT_PUBLIC_API_BASE_URL` (host bắt đầu bằng `api.`) trước khi lên `main`.** *(Đã đặt trong `.github/workflows/deploy-web.yml:88-89` và đã deploy lên `main`.)* Nguồn: design §9, LRE7.
- [ ] **Xóa database D1 `wordmet-waitlist` trong Cloudflare dashboard.** Nguồn: design L2. Vì sao: binding `DB`, migration và form đã bị bỏ khỏi code,
  database còn lại chỉ tốn chỗ. Chủ dự án (lúc brainstorm landing, 11/2026) nói chưa có ai đăng ký thật nên không cần xuất dữ liệu.
- [x] **Viết nội dung thật cho `/vi/privacy` và `/vi/terms`, rồi mới đưa link trở lại footer.** *(Đã đăng phiên bản `1` trong admin `/legal`, `GET /v1/legal/current` trả `200` ngày 20/11.)*
- [x] **Khi Deploy: đặt `LANDING_DATA_REQUIRED=1` và địa chỉ API (`NEXT_PUBLIC_API_BASE_URL`) trong `deploy-web.yml`.** *(Đã đặt và deploy thành công, trùng mục M8 ở trên.)*
- [x] **Sau deploy: mở `/vi`, mở `/en` (phải hiện landing tiếng Anh, status 200), bấm Đăng ký ở mỗi trang, xem Console không có lỗi CSP.** *(Kiểm 20/11 bằng Playwright + axe trên production: `/vi` và `/en` đều `200`, 0 lỗi JS console, 0 lỗi axe WCAG 2.2 AA sau cuộn, `2026-11-20-agy-audit/REPORT.md`.)* Nguồn: design §9.
- [x] **Bản tiếng Anh của landing** (14/11/2026, `docs/deliveries/landing-en.md`). Nguồn: design L3, L4. `'en'` đã ở `LANDING_LOCALES`, `Landing` trong `messages/en.json` đã dịch, link ngôn ngữ ở footer.
  Còn lại: FAQ tiếng Anh nằm trong code (`landing-faq.en.ts`), không đọc từ admin; đổi câu nào ở admin thì đổi cả bản tiếng Anh. Sau deploy kiểm `hreflang` và sitemap có `/en`.

## Bước 8 — đăng nhập Google và xóa tài khoản (design Bước 8 §18, §19; 29/10/2026)

- [ ] **Google Auth Platform: chuyển từ "Testing" sang "In production" và xin xác minh thương hiệu.** Nguồn: design Bước 8 §18. Vì sao: để tên và logo app hiện trên màn đồng ý (Google nói
  cần xác minh brand) và để không phụ thuộc chế độ Testing. Sửa 29/10/2026: với đúng ba scope `openid email profile`, ở Testing người dùng vẫn đăng nhập được mà không cần là test user, không có cảnh báo và không hết hạn
  sau 7 ngày (Google Cloud Help, Publishing status; chưa thử với Gmail ngoài danh sách). Giới hạn 100 test user, cảnh báo và 7 ngày chỉ quay lại nếu app xin thêm scope khác. Việc: trang chủ có link chính sách riêng tư cùng domain (`docs/preparation/LEGAL_PAGES_RESEARCH_2026-10-11.md`), thêm địa chỉ quay
  về production (`https://api.<domain>/v1/auth/google/callback`) vào OAuth client, đặt `GOOGLE_REDIRECT_URI` đúng địa chỉ đó. Khi đã xác minh có thể bật `auth_time` để siết bước xác nhận Google (D25).
- [x] **Đặt secret production: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OAUTH_COOKIE_KEY` và KHÔNG đặt `GOOGLE_FAKE_ENABLED`.** *(Đã kiểm 14/11 trên VPS: đủ 3 biến secret, `GOOGLE_FAKE_ENABLED=false`, `/v1/auth/google/start` redirect 302 tới Google với client id thật, `2026-11-14-production-checks.md`.)*
- [ ] **`GOOGLE_FAKE_ENABLED` không bao giờ bật ở môi trường nào nối được ra internet (staging, demo, preview), không chỉ production.** Nguồn: review cuối Bước 8. Vì sao: Google giả cho ai cũng tự cấp ID token "đã xác minh"
  cho bất kỳ email nào, nên qua tự liên kết (K8) nó là lối vào mọi tài khoản đã xác nhận, không chỉ là chuyện thanh toán giả. Lớp chặn duy nhất trong code là từ chối khởi động khi cùng bật `BILLING_PRODUCTION`.
- [ ] **Thời gian một yêu cầu xóa tài khoản có thể kéo dài tới 120 giây** (Tx B). Kiểm giới hạn thời gian của reverse proxy/hosting (nhiều nơi cắt ở 60–100 giây); bị cắt thì dữ liệu vẫn an toàn (đã commit hoặc còn `deleting` để retry) nhưng web hiện lỗi mạng.
- [ ] **Trước khi nối nhà cung cấp thanh toán thật: sửa việc tắt gia hạn từng phần khi admin xóa người học (review cuối M3).** Nguồn: `buoc-8-rulings.md` R21. Vì sao: người học có hai gói tự gia hạn, gói đầu tắt được, gói sau quá hạn thì admin nhận 409 "chưa xóa" nhưng gói đầu đã bị hủy; và bước tắt gia hạn chạy trước khi kiểm "admin cuối". Hiện chỉ có nhà cung cấp giả nên chưa ai gặp.
- [x] **Cho `accounts:replay-deletions` hoàn tất tài khoản đang `deleting` do người dùng tự xóa (review cuối M1).** Test xác nhận replay hoàn tất và không gửi email. Quy trình restore dùng lệnh replay trước khi mở API và worker.
- [ ] **Hai lần chạy Google thật (D32) và hai giả định kỹ thuật.** Nguồn: design §19. Lần 1 (cookie `refresh_token` còn sau chuyển trang từ Google; `/v1/auth/refresh` ngay sau đó
  thành công; Google nhận PKCE S256) và lần 2 (cả luồng) làm theo `docs/deliveries/buoc-8-test-flow.md` mục B. **Chưa ai chạy tới 29/10/2026.** Thất bại → áp phương án dự phòng
  của design §19 (mã dùng một lần 60 giây) rồi mới mở Google cho người dùng.
- [ ] **Chính sách riêng tư (cần luật sư).** Nguồn: design §18, D15. Ghi: ảnh đại diện lấy từ Google; hồ sơ thanh toán giữ N năm sau khi xóa tài khoản (mặc định 10, cài đặt
  `entitlements.transaction_retention_years`; luật sư xác nhận N, vì Luật Kế toán nêu 5–10 năm tùy loại chứng từ); thời hạn backup; những gì còn giữ sau khi xóa (design §7.3:
  hàng ẩn danh của sổ lượt, giao dịch, báo lỗi đã bỏ ghi chú); cách giữ báo lỗi.
- [ ] **Xem lại câu 26 trước khi mở cho người dùng thật: tự liên kết Google với email không do Google quản lý.** Nguồn: design §19. Vì sao: người từng giữ hộp thư công ty đã tạo
  tài khoản Google bằng email đó có thể vào tài khoản Wordmet của người đang giữ hộp thư, vì Google chỉ xác minh email một lần lúc tạo tài khoản Google. Bước 8 chấp nhận.
- [ ] **Backup và danh sách tài khoản đã xóa (D21) — cập nhật 20/11/2026.** *(Đã xong phần lớn: R2 daily `pg_dump` đã diễn tập restore 15/11 trong ~3s, `2026-11-15-restore-drill.md`; WAL-G 60s archiving + Deletion Journal trên R2 độc lập DB đã rollout 18/11, PR #301–#307. **Còn mở:** diễn tập `wal-g backup-fetch` + WAL replay từ R2 thật và chạy thử `accounts:replay-deletions --journal` từ R2 thật, `restore-safety.md:75,82`.)*
- [ ] **Kích thước pool kết nối DB.** Nguồn: Bước 8 R6/R8 (`docs/deliveries/buoc-8-rulings.md`). Vì sao: Tx B của xóa tài khoản giữ một kết nối tới 120 giây và bộ xóa của Entitlements đọc
  cài đặt qua client dùng chung trong lúc đó; kiểm nhiều người xóa cùng lúc không làm cạn pool. Cũng xem lại: thông điệp lỗi trong log `account_deletion_failed` có thể nêu giá trị từ lỗi DB.
- [ ] **Scheduler chạy ở cả API và worker.** Nguồn: design §19 (`CHƯA KIỂM` trong production). Các việc Bước 8 (thử lại xóa, quét hàng ghi muộn, dọn chưa xác nhận, xóa giao dịch quá hạn)
  được viết để chạy lặp vô hại; kiểm lại trên môi trường thật là chúng không chạy đồng thời gây xung đột.
- [ ] **App điện thoại.** Nguồn: design §18. Google Sign-In qua thư viện Android/iOS và một endpoint nhận ID token; Sign in with Apple trước khi ra iOS (Apple 4.8); trang web xin xóa tài khoản
  cho Google Play (D20); gói mua qua store thì "Hủy gói" chuyển người dùng sang trang quản lý gói của store (web đã có thông báo `cancel-in-store`).
- [ ] **Nhà cung cấp thanh toán thật.** Nguồn: design §18, D12, D31. Hỗ trợ `cancelAtPeriodEnd`; adapter phải trả lời trong hằng `BILLING_ADAPTER_TIMEOUT_MS` (`entitlements.constants.ts`) khi admin xóa người đang gia hạn
  (không kịp → 409 `renewal-not-cancelled`, không xóa gì); xem lại chống dùng thử lại ở phía họ.

- [ ] **DB production phải tạo mới; không mang sang tài khoản chưa xác minh tạo trước 26/10/2026.** Nguồn: [B8-5](../superpowers/reviews/buoc-1-8/buoc-8.md#b8-5). Vì sao: đăng ký Google vào email của
  một tài khoản chưa xác minh dùng lại id của tài khoản đó (`google-auth.service.ts:266-286`, design Bước 8 §5.5), với giả định nó không có dữ liệu học; giả định này chỉ đúng từ khi đăng nhập bị
  chặn lúc chưa xác minh (26/10/2026). Trên DB có dữ liệu cũ hơn, người đăng ký Google sẽ thấy dữ liệu của tài khoản kia.
- [ ] **Email nằm trong URL bộ lọc của admin: xét lại khi chọn hosting (log truy cập).** Nguồn: [UA-7](../superpowers/reviews/buoc-1-8/giao-dien-nguoi-hoc-and-admin.md#ua-7). Vì sao: URL của trang
  Người dùng có thể mang email người học vào log truy cập của hosting; ghi nhận, chưa phải lỗi.

## Chính sách bảo mật và Điều khoản soạn trong admin (`docs/deliveries/legal-documents.md`, 03/11/2026)

- [x] **Đặt `NEXT_PUBLIC_API_BASE_URL` cho bản build web (host `api.`).** *(Đã đặt `https://api.wordmet.com` trong `deploy-web.yml:89`.)*
- [x] **Dán nội dung vào admin rồi đăng bản đầu tiên.** *(Đã kiểm 20/11: `GET https://api.wordmet.com/v1/legal/current` trả `200`, `version: "1"`, `effective_date: "2026-11-20"`.)*
- [ ] **Sau deploy: mở `/vi/privacy`, `/vi/terms`, `/en/privacy` và xem đúng bản đã đăng; tắt API thử thì trang phải về dòng "bản nháp".** *(Đã xác nhận API trả v1; chưa kiểm tay hiển thị cả 3 trang + ca tắt API.)*
- [x] **Đặt `TERMS_VERSION` vẫn bắt buộc.** *(Đã đặt trên VPS 14/11 và đã có bản pháp lý v1 đăng trong admin.)*
- [ ] **Email báo trước 07 ngày khi đổi điều khoản.** Chưa làm: cần tính năng gửi thư hàng loạt. Cho tới khi có, người học chỉ biết qua màn đồng ý lại.

## Trang Nguồn dữ liệu (`docs/deliveries/nguon-du-lieu.md`, 05/11/2026)

- [ ] **Điền đủ `attribution`, `license`, `url` của CEFR-J, Octanove C1/C2 (và các nguồn thật khác) ở màn Nguồn dữ liệu trong admin trước launch.** Nguồn: as-built nguon-du-lieu.
  Vì sao: trang `/vi/sources` chỉ hiện đúng những gì admin đã nhập; giấy phép CEFR-J và Octanove bắt ghi nguồn, nên câu ghi công trống là thiếu nghĩa vụ giấy phép.
- [ ] **Sau deploy: mở `/vi/sources` và `/en/sources`, thấy CEFR-J, Octanove, AGID với câu ghi công đầy đủ; link "Nguồn dữ liệu" có ở footer landing và footer app.** Nguồn: as-built.
  Vì sao: trang đọc `GET /v1/sources` ở server mỗi lần mở (cùng điều kiện `NEXT_PUBLIC_API_BASE_URL` như `/privacy`); thiếu địa chỉ API hoặc API lỗi thì trang chỉ hiện câu "chưa có nguồn nào", không báo lỗi.
- [ ] **Chủ dự án thêm câu trỏ từ Điều khoản sang trang nguồn.** Việc này nằm ở bản nháp `docs/preparation/legal-drafts/` (nhánh `docs/web-launch-research`), không nằm trong PR này.

## Chuẩn bị launch B: mua gói Pro một lần bằng payOS (`docs/deliveries/chuan-bi-launch-b.md`, 04/11/2026)

- [x] **Ba biến payOS cho API và worker.** *(Đã kiểm 14/11 trên VPS: đủ 3 biến `PAYOS_*`, `PAYOS_FAKE_ENABLED=false`, `2026-11-14-production-checks.md`.)*
- [x] **Đăng ký URL webhook với payOS & cho `/v1/billing/webhooks/payos` đi qua Cloudflare.** *(Đã kiểm 14/11: endpoint nhận POST trực tiếp qua DNS xám trả 400 trên thân rỗng, và giao dịch mua Pro thật 79.000 ₫ ngày 14/11 nhận webhook thật thành công.)*
- [x] **Giá ba kỳ ở admin "Cài đặt hệ thống".** *(Đã kiểm 20/11: `GET /v1/public/prices` trả 79.000 / 199.000 / 599.000 ₫.)*
- [x] **`LEARNER_APP_URL` đúng host của app người học.** *(Đã kiểm 14/11 trên VPS.)*
- [x] **Worker chạy job `billing.orders-reconcile` mỗi giờ và job `entitlement-notices`.** *(Đã kiểm 14/11 trên VPS: `MAINTENANCE_ENABLED=true` trên worker, cron bảo trì chạy phút 15 mỗi giờ.)*
- [x] **SMTP thật cho biên nhận và email nhắc hết hạn.** *(Đã kiểm 14/11 trên VPS: `smtp.resend.com:465`, `SMTP_SECURE=true`, `Wordmet <no-reply@wordmet.com>`.)*
- [ ] **Kiểm một lần mua thật nhỏ theo bảng giả định P1–P12.** *(Cập nhật 20/11: happy path mua thật 79.000 ₫ qua payOS production đã thành công ngày 14/11 với `orderCode` cũ `1001000000`, tự mở kỳ 14/11→14/12/2026. **Còn mở sau rollout 18/11:** kiểm chứng `orderCode` theo thời gian `>= 1_100_000_000` và chạy thử `orders:probe-payos` live để đối chứng P7/P9/P12.)*
- [x] **Đăng Điều khoản và Chính sách bảo mật bản mới trước khi bán.** *(Đã đăng phiên bản `1`, `GET /v1/legal/current` trả `200` ngày 20/11.)*
- [x] **Kiểm không còn chỗ nào nói Pro "chưa mở bán".** *(Đã kiểm 14/11 trên `/vi`, đếm 0, `2026-11-14-production-checks.md`.)*

## CSP có `nonce` cho `/app` (launch prep B, M4; `docs/deliveries/chuan-bi-launch-b-spike-csp.md`)

- [x] **Sau deploy: `/vi/app` trả đúng MỘT chính sách CSP, có `'nonce-` và `'strict-dynamic'`; mọi `<script>` mang đúng nonce.** *(Đã kiểm 14/11 và 20/11 trên `https://wordmet.com/vi/app`: một header CSP, nonce đổi mỗi request, `'strict-dynamic'`, 0 lỗi CSP.)*
- [x] **Đo CPU Worker của một trang `/app` dựng theo request.** *(Đã đo 15/11 qua Cloudflare Analytics: `usage_model=standard`, `limits.cpu_ms=5000`, 5.157 lượt 0 lỗi, CPU P90 356 ms, `2026-11-15-load-test.md`.)*
- [x] **Beacon Cloudflare Web Analytics.** *(Đã kiểm 14/11: `beacon.min.js` nạp được ở `/app`, `POST /cdn-cgi/rum` 204, 0 lỗi CSP.)*
- [x] **Chạy lại mục Turnstile của spike M0 với code thật của đợt A.** *(Đã nằm trong `e2e/csp.spec.ts` chạy xanh trên CI; `TURNSTILE_MODE=real` đã bật trên prod.)*
- [x] **Đưa `assert:render-mode` vào mọi chỗ từng gọi `assert:static`.** *(Đã xác nhận trong `.github/workflows/ci.yml:108`.)*

## Đợt C: Học / Ôn, chuỗi ngày, phiên âm và giọng đọc (`docs/deliveries/dot-cai-thien-c.md`, 07/11/2026)

- [x] **Google Cloud Text-to-Speech, `GOOGLE_TTS_CREDENTIALS`, `TTS_VOICE_UK`/`TTS_VOICE_US`, bucket R2 `audio.wordmet.com`, `NEXT_PUBLIC_AUDIO_BASE_URL`, `TTS_FAKE_ENABLED=false` và worker chạy `content-tts`.** *(Đã kiểm 14/11 trên VPS & bên ngoài: đủ secret TTS/R2, `audio.wordmet.com/tts/v1/*.mp3` trả `200 audio/mpeg`, CSP `media-src` có `https://audio.wordmet.com`, `9.481` dòng `speech_audio` `ready`, `0 failed`, `2026-11-14-production-checks.md`; dump 15/11 có `9.806` `sense_revisions` đã publish, `2026-11-15-restore-drill.md`.)*
- [ ] **Chính sách bảo mật: xác nhận bản đã đăng (v1) đã nêu Google Cloud Text-to-Speech và sửa câu "không gửi từ vựng của bạn cho Google".** Nguồn: design §5.8.
- [ ] **Bản đồ dữ liệu cá nhân: `speech_audio.text` có thể chứa từ riêng của người học** (dọn bởi job tuần sau 7 ngày, ghi nhận trong tài liệu xóa tài khoản).
