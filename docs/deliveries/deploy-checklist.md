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
- [ ] **Cộng ngân sách kết nối: API (mặc định 20) + worker (mặc định 20) + các CLI chạy cùng lúc (`maintenance:run`, `admin:grant`…) phải
  nhỏ hơn số kết nối tối đa của DB.** Nguồn: M1 final review. Vì sao: mỗi process có pool riêng; tổng vượt mức DB cho phép thì process sau
  không kết nối được.
- [ ] **Pool của worker ≥ 2 × số job import CSV chạy cùng lúc.** Nguồn: M1 gate (21/10; xem as-built). Vì sao: worker pool 1 thì job
  import không xử lý được dòng nào; pool 20 thì chạy. `ASSUMPTION` về nguyên nhân (chưa đọc stack): mỗi job giữ một kết nối cho transaction
  "rào" và mở thêm một kết nối khi ghi nội dung.

## Cấu hình và dữ liệu

- [ ] **Đặt `TERMS_VERSION` bằng phiên bản thật của trang Điều khoản.** Nguồn: design sửa thiếu sót §11.6. Vì sao: hiện là giá trị tạm
  `2026-10-20`; mỗi lần đăng ký ghi giá trị này làm bằng chứng người dùng đã đồng ý phiên bản nào. Thiếu biến thì API và worker không khởi động.
- [ ] **Chạy `pnpm db:normalize-timezones` một lần trên DB thật (sau `pnpm build`), bằng cùng phiên bản Node/ICU với API.** Nguồn: design
  §6.2 (C2), Task 5. Vì sao: dữ liệu cũ còn múi giờ viết kiểu lạ (`asia/ho_chi_minh`, `+07:00`); tên chuẩn phụ thuộc bảng ICU của Node
  (Node 24.11 cho `Asia/Saigon`), chạy bằng Node khác có thể ra tên khác với tên API ghi.
- [ ] **Luật sư xem lại mốc 13 tuổi không hỏi cha mẹ; trang Điều khoản ghi "dưới 16 tuổi cần cha mẹ đồng ý".** Nguồn: design §11.2 (D4).
  Vì sao: Luật BVDLCN 2025 Điều 24 khoản 2 nói về người đại diện của trẻ dưới 16 tuổi.

## Chặn đồ giả ở production (đợt A, R3)

- [ ] **Đặt `BILLING_PRODUCTION=true`; KHÔNG đặt `BILLING_FAKE_ENABLED`, `AI_FAKE_ENABLED`, `GOOGLE_FAKE_ENABLED`; đặt `TURNSTILE_MODE=real`; rồi kiểm API từ chối khởi động khi bật một đồ giả.**
  Nguồn: [X-3](../superpowers/reviews/2026-10-29-buoc-1-8-review.md#x-3), [B5-2](../superpowers/reviews/buoc-1-8/buoc-5.md#b5-2), Q13 (giữ cơ chế, chỉ thêm mục checklist).
  Vì sao: `BILLING_PRODUCTION=true` cùng một đồ giả (thanh toán, AI, Google, hoặc `TURNSTILE_MODE` là `fake`/`off`) làm API và worker dừng ngay khi khởi động
  (`apps/api/src/common/config/app-config.ts`, `superRefine`), nhưng chỉ khi chính biến `BILLING_PRODUCTION` được đặt; thiếu nó thì mọi đồ giả chạy được.
  Kiểm: trên môi trường production thật, thử bật từng đồ giả một và thấy API cùng worker dừng với tên hai biến trong thông báo, rồi bỏ đồ giả đó đi.

## AI và riêng tư (Bước 6–7)

Nguồn chung: [B6-1](../superpowers/reviews/buoc-1-8/buoc-6-and-7.md#b6-1); chi tiết ở design Bước 6 §18–§19 và Bước 7 §19–§20.

- [ ] **Chính sách bảo mật nêu việc gửi từ riêng và câu ngữ cảnh của người học cho OpenAI/Anthropic (bên nhận ở Mỹ), và việc `ai_call_contents` giữ nội dung 7 ngày, admin đọc được**
  (`apps/api/src/ai/reports/reports.service.ts:218-235`). Nguồn: B6 §18, F29, SR15. Vì sao: trang chính sách hiện chưa nhắc AI; bản nháp đã ở nhánh `docs/web-launch-research`.
- [ ] **Điều khoản xử lý dữ liệu của từng provider (F30); OpenAI cho người dưới 18 tuổi và ZDR so với mốc 13 tuổi của app; không dùng model có giữ dữ liệu 30 ngày.**
  Nguồn: B6-1. Vì sao: app nhận người học từ 13 tuổi và gửi nội dung người học cho provider.
- [ ] **`max_concurrent_calls` (50) đếm theo từng tiến trình, không theo cả hệ thống: đặt theo tier của provider khi chạy nhiều instance.** Nguồn: B6 §18 "Deploy".
  Vì sao: hai instance API cộng worker là hơn 50 lượt song song; tier Anthropic thấp hơn thế thì 429 hàng loạt.
- [ ] **Ba điểm riêng tư của Bước 7 (B7 §20) và chữ "300 câu AI" của gói Pro (B7 §19).** Vì sao: chữ trên trang gói, landing và chính sách phải khớp số thật trong Cài đặt (`pro_ai_practice_per_cycle`).

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

## Admin web

- [x] **Security header cho admin tĩnh: phần code đã làm (đợt A, M1, 04/11/2026).** Nguồn: AD12 (kiểm kê
  [`inventory-admin-practice.md`](../superpowers/reviews/2026-10-20-buoc-0-3-review-evidence/inventory-admin-practice.md)). `apps/admin/public/_headers` có một rule `/*`
  với CSP (chấp nhận `'unsafe-inline'` cho `style-src` vì React Aria tự chèn thẻ `<style>`), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`;
  `apps/admin/src/headers.test.ts` ghim nội dung. `vite` và `vite preview` không đọc `_headers`, nên local không có header này.
- [ ] **Sau khi deploy admin: kiểm header thật bằng `curl -I`.** Vì sao: hai `ASSUMPTION` của design đợt A (§4.4) chưa kiểm được ở local: Workers Static
  Assets áp `_headers` cho cả trang trả về từ fallback SPA, và Vite copy `public/` vào `dist/`. Làm: `curl -I https://admin.wordmet.com/` và một đường dẫn sâu
  (vd `/uploads`) phải có bốn header trên; `dist/_headers` giống `public/_headers` sau `pnpm build`.
- [x] **Security header cho API: phần code đã làm (đợt A, M1).** Nguồn: FD-dj. API dùng `helmet` với năm header của một API JSON: không `X-Powered-By`;
  `X-Content-Type-Options: nosniff`; `Referrer-Policy: no-referrer`; `Content-Security-Policy: default-src 'none';frame-ancestors 'none'` (helmet viết
  không có dấu cách sau `;`); `Cross-Origin-Resource-Policy: same-site`. Không đặt HSTS ở API (`app.setup.headers.spec.ts` ghim).
- [ ] **Sau khi deploy API: kiểm HSTS và header.** `curl -I https://api.wordmet.com/v1/health` có năm header trên. HSTS: `ASSUMPTION` Cloudflare đặt ở
  tầng edge, chỉ đúng khi API đứng sau proxy Cloudflare; nếu hosting của API không đứng sau proxy thì bật `strictTransportSecurity` trong `helmet`
  (`apps/api/src/app.setup.ts`).
- [ ] **Sau khi deploy web: kiểm header của web.** `curl -I https://wordmet.com/vi` có `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` và CSP;
  `curl -I` một file `/_next/static/…`. `ASSUMPTION`: `headers()` của `next.config.ts` có thể không áp cho file tĩnh mà Workers Static Assets trả thẳng
  (`.open-next/assets`). E23 trong CI chỉ kiểm phần Worker trả lời.

## Từ kiểm kê 20/10, mức Thấp, đã gắn nhãn "deploy-checklist" (chưa làm, D11)

- [ ] **`LEARNER_APP_URL` là biến bắt buộc.** Nguồn: L17 ([`inventory-identity-learning.md`](../superpowers/reviews/2026-10-20-buoc-0-3-review-evidence/inventory-identity-learning.md)). Vì sao: `.env` cũ thiếu biến này thì API và
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
- [ ] **Ngay sau lần đầu CSP lên `main`, mở `wordmet.com` và `/vi/app` trên production, xem Console không có lỗi CSP.** Nguồn: D22,
  design §4.6. Vì sao: beacon Cloudflare Web Analytics chỉ chèn ở edge, e2e local không thấy; CSP đang ở chế độ dự phòng D20
  (`'unsafe-inline'` cho script/style) vì Next chèn script `self.__next_f.push(…)`.
- [ ] **Chính sách bảo mật nhắc việc đo lượt xem bằng Cloudflare Web Analytics.** Nguồn: D22, design §12. Vì sao: script bên thứ ba duy nhất
  chạy trên mọi trang, kể cả `/app`.
- [ ] **Bản build production bật app phải có `NEXT_PUBLIC_API_BASE_URL` với host bắt đầu bằng `api.`.** Nguồn: design §4.2. Vì sao: cookie
  `refresh_token` host-only của `admin-api.` và `api.` không được đè nhau; `next.config.ts` dừng build khi sai.
- [x] **Dọn tài khoản chưa từng xác nhận email sau N ngày (đã có job `identity.unverified-cleanup`, `deletion-jobs.service.ts:36`; [B8-6](../superpowers/reviews/buoc-1-8/buoc-8.md#b8-6)).** Nguồn: A5 đợt cải thiện nhóm A (design `../superpowers/specs/2026-10-26-dot-cai-thien-a-design.md` §4),
  làm cùng phần xoá tài khoản của Bước 8. Vì sao: từ đợt này tài khoản chưa xác nhận không vào được app nhưng vẫn nằm trong DB và giữ chỗ email;
  `identity-cleanup.service.ts` chỉ xoá OTP và chuỗi phiên hết hạn.

- [ ] **Xem lại CSP (nonce hoặc hash thay `'unsafe-inline'`) trước khi bật `/app`.** Nguồn: [UW-4](../superpowers/reviews/buoc-1-8/giao-dien-nguoi-hoc-and-admin.md#uw-4). Vì sao: D20 đang để
  `'unsafe-inline'` vì Next chèn script RSC inline; script Turnstile (đợt A) phải còn nạp được sau khi đổi.
- [ ] **Build và kiểm bản cờ app tắt (cấu hình production hiện tại, `NEXT_PUBLIC_LEARNER_APP` không đặt).** Nguồn: [UW-3](../superpowers/reviews/buoc-1-8/giao-dien-nguoi-hoc-and-admin.md#uw-3).
  Vì sao: CI và e2e chỉ build với app bật; bản app tắt (`/…/app/*` chuyển về landing) chưa được thử trong CI.
- [ ] **Chạy tay hai worker gửi nhắc học cùng lúc (G1-10).** Nguồn: [B3-1](../superpowers/reviews/buoc-1-8/buoc-3-and-4.md#b3-1); checklist dev (`docs/audit/2026-11-04-dev-test-checklist.md`, mục D) đã có bước này.

## Landing mới (`apps/web`, design landing-redesign §9, 03/11/2026)

- [ ] **`deploy-web.yml` phải build với `NEXT_PUBLIC_LEARNER_APP=on` và `NEXT_PUBLIC_API_BASE_URL` (host bắt đầu bằng `api.`) trước khi lên `main`.**
  Nguồn: design §9, LRE7. Vì sao: hiện workflow chỉ đặt `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_INDEXABLE`, `NEXT_PUBLIC_CONTACT_EMAIL`. Với app tắt,
  `proxy.ts` đưa mọi `/{locale}/app/*` về `/vi` (D8, E20), nên nút Đăng ký và Đăng nhập của landing quay về chính trang đó. Cần API thật đang chạy
  ở host `api.` thì đăng ký mới hoàn tất.
- [ ] **Xóa database D1 `wordmet-waitlist` trong Cloudflare dashboard.** Nguồn: design L2. Vì sao: binding `DB`, migration và form đã bị bỏ khỏi code,
  database còn lại chỉ tốn chỗ. Chủ dự án (lúc brainstorm landing, 11/2026) nói chưa có ai đăng ký thật nên không cần xuất dữ liệu.
- [ ] **Viết nội dung thật cho `/vi/privacy` và `/vi/terms`, rồi mới đưa link trở lại footer.** Nguồn: design L2; nghiên cứu
  `docs/preparation/LEGAL_AND_PILOT_RESEARCH_2026-11-02.md`. Vì sao: hai trang hiện là bản nháp (`LegalDraft`), link đang ẩn từ 09/10/2026; khi link
  trở lại, đổi `e2e/privacy.spec.ts` theo ghi chú ở đầu file. *(03/11/2026: nội dung nay soạn và đăng trong admin, xem mục "Chính sách bảo mật và Điều khoản" ở cuối file.)*
- [ ] **Sau deploy: mở `/vi`, mở `/en` (phải 307 về `/vi`), bấm Đăng ký (phải tới `/vi/app/register`), xem Console không có lỗi CSP.** Nguồn: design §9.
  Vì sao: beacon Cloudflare chỉ chèn ở edge, e2e local không thấy.
- [ ] **Bản tiếng Anh của landing.** Nguồn: design L3, L4. Khi có: thêm `'en'` vào `LANDING_LOCALES` (`src/lib/landing-locale.ts`), dịch `Landing` trong
  `messages/en.json` (hiện còn là chữ Việt), đưa link ngôn ngữ trở lại header/footer.

## Bước 8 — đăng nhập Google và xóa tài khoản (design Bước 8 §18, §19; 29/10/2026)

- [ ] **Google Auth Platform: chuyển từ "Testing" sang "In production" và xin xác minh thương hiệu.** Nguồn: design Bước 8 §18. Vì sao: để tên và logo app hiện trên màn đồng ý (Google nói
  cần xác minh brand) và để không phụ thuộc chế độ Testing. Sửa 29/10/2026: với đúng ba scope `openid email profile`, ở Testing người dùng vẫn đăng nhập được mà không cần là test user, không có cảnh báo và không hết hạn
  sau 7 ngày (Google Cloud Help, Publishing status; chưa thử với Gmail ngoài danh sách). Giới hạn 100 test user, cảnh báo và 7 ngày chỉ quay lại nếu app xin thêm scope khác. Việc: trang chủ có link chính sách riêng tư cùng domain (`docs/preparation/LEGAL_PAGES_RESEARCH_2026-10-11.md`), thêm địa chỉ quay
  về production (`https://api.<domain>/v1/auth/google/callback`) vào OAuth client, đặt `GOOGLE_REDIRECT_URI` đúng địa chỉ đó. Khi đã xác minh có thể bật `auth_time` để siết bước xác nhận Google (D25).
- [ ] **Đặt secret production: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OAUTH_COOKIE_KEY` (khóa riêng, sinh bằng `node scripts/gen-secret.mjs`) và KHÔNG đặt `GOOGLE_FAKE_ENABLED`.**
  Vì sao: API từ chối khởi động nếu Google giả bật cùng `BILLING_PRODUCTION`, nhưng đừng dựa vào đó. `TERMS_VERSION` cũng bắt buộc (đợt sửa Bước 0–3).
- [ ] **`GOOGLE_FAKE_ENABLED` không bao giờ bật ở môi trường nào nối được ra internet (staging, demo, preview), không chỉ production.** Nguồn: review cuối Bước 8. Vì sao: Google giả cho ai cũng tự cấp ID token "đã xác minh"
  cho bất kỳ email nào, nên qua tự liên kết (K8) nó là lối vào mọi tài khoản đã xác nhận, không chỉ là chuyện thanh toán giả. Lớp chặn duy nhất trong code là từ chối khởi động khi cùng bật `BILLING_PRODUCTION`.
- [ ] **Thời gian một yêu cầu xóa tài khoản có thể kéo dài tới 120 giây** (Tx B). Kiểm giới hạn thời gian của reverse proxy/hosting (nhiều nơi cắt ở 60–100 giây); bị cắt thì dữ liệu vẫn an toàn (đã commit hoặc còn `deleting` để retry) nhưng web hiện lỗi mạng.
- [ ] **Trước khi nối nhà cung cấp thanh toán thật: sửa việc tắt gia hạn từng phần khi admin xóa người học (review cuối M3).** Nguồn: `buoc-8-rulings.md` R21. Vì sao: người học có hai gói tự gia hạn, gói đầu tắt được, gói sau quá hạn thì admin nhận 409 "chưa xóa" nhưng gói đầu đã bị hủy; và bước tắt gia hạn chạy trước khi kiểm "admin cuối". Hiện chỉ có nhà cung cấp giả nên chưa ai gặp.
- [ ] **Khi viết quy trình backup và khôi phục: `accounts:replay-deletions` với tài khoản đang `deleting` do người dùng tự xóa (review cuối M1).** Nguồn: `buoc-8-rulings.md` R21. Vì sao: lệnh chạy lại không hoàn tất riêng loại xóa "tự xóa" (code bỏ qua `mode` ở `account-deletion.service.ts:94-96`); việc thử lại chạy mỗi giờ sẽ xử lý nốt nhưng với kiểm tra bình thường. Chỉ gặp sau khôi phục sau sự cố.
- [ ] **Hai lần chạy Google thật (D32) và hai giả định kỹ thuật.** Nguồn: design §19. Lần 1 (cookie `refresh_token` còn sau chuyển trang từ Google; `/v1/auth/refresh` ngay sau đó
  thành công; Google nhận PKCE S256) và lần 2 (cả luồng) làm theo `docs/deliveries/buoc-8-test-flow.md` mục B. **Chưa ai chạy tới 29/10/2026.** Thất bại → áp phương án dự phòng
  của design §19 (mã dùng một lần 60 giây) rồi mới mở Google cho người dùng.
- [ ] **Chính sách riêng tư (cần luật sư).** Nguồn: design §18, D15. Ghi: ảnh đại diện lấy từ Google; hồ sơ thanh toán giữ N năm sau khi xóa tài khoản (mặc định 10, cài đặt
  `entitlements.transaction_retention_years`; luật sư xác nhận N, vì Luật Kế toán nêu 5–10 năm tùy loại chứng từ); thời hạn backup; những gì còn giữ sau khi xóa (design §7.3:
  hàng ẩn danh của sổ lượt, giao dịch, báo lỗi đã bỏ ghi chú); cách giữ báo lỗi.
- [ ] **Xem lại câu 26 trước khi mở cho người dùng thật: tự liên kết Google với email không do Google quản lý.** Nguồn: design §19. Vì sao: người từng giữ hộp thư công ty đã tạo
  tài khoản Google bằng email đó có thể vào tài khoản Wordmet của người đang giữ hộp thư, vì Google chỉ xác minh email một lần lúc tạo tài khoản Google. Bước 8 chấp nhận.
- [ ] **Backup và danh sách tài khoản đã xóa (D21).** Nguồn: design §7.5. `deleted_accounts` nằm trong chính DB nên khôi phục backup cũ làm mất danh sách. Thủ tục (trong `apps/api`):
  (1) trước khi khôi phục, nếu DB đang chạy còn đọc được: `pnpm accounts:export-deletions --out deleted-accounts.jsonl` (giữ file ngoài DB); (2) khôi phục backup; (3) **trước khi mở app**:
  `pnpm accounts:replay-deletions --from deleted-accounts.jsonl` (thoát mã 2 và in `pending <id>` khi còn tài khoản chưa xóa xong). Lệnh xóa lại mọi tài khoản trong file mà bảng `users` vẫn còn hàng, bỏ qua điều kiện "gói đang gia hạn / admin cuối",
  không gửi thư; in `replayed N, without a users row M, pending K` — **K > 0 nghĩa là một vài tài khoản chưa xóa xong, chạy lại lệnh**. Còn mở: nơi lưu danh sách **ngoài DB**
  (cho trường hợp mất cả DB) và thời hạn backup — chốt cùng cách backup. Thời hạn giữ log cũng phải ghi (log mang `user_id`).
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

- [ ] **Đặt `NEXT_PUBLIC_API_BASE_URL` cho bản build web (host `api.`).** Nguồn: as-built legal-documents. Vì sao: `/privacy` và `/terms` đọc `GET /v1/legal/current` ở
  server mỗi lần mở trang; không có địa chỉ API thì hai trang luôn hiện dòng "bản nháp". Mục này trùng với mục `NEXT_PUBLIC_API_BASE_URL` của phần "Landing mới".
- [ ] **Dán nội dung vào admin rồi đăng bản đầu tiên.** Nguồn: as-built. Việc: mở `/legal` trong admin, "Tạo bản nháp", dán hai bản nháp (nhánh
  `docs/web-launch-research`, thư mục `docs/preparation/legal-drafts/`) sau khi điền các ô `[[...]]`, chọn ngày có hiệu lực, Đăng. Vì sao: trước lần đăng đầu, phiên bản
  vẫn lấy từ `TERMS_VERSION`; lần đăng đầu khiến **mọi** người học đã đồng ý bản đó bị hỏi lại.
- [ ] **Sau deploy: mở `/vi/privacy`, `/vi/terms`, `/en/privacy` và xem đúng bản đã đăng; tắt API thử thì trang phải về dòng "bản nháp".** Nguồn: as-built. Vì sao:
  hai trang không còn là trang tĩnh, mỗi lượt mở gọi Worker rồi gọi API (hết 2,5 giây thì dùng dòng "bản nháp"); chưa đo tải.
- [ ] **Đặt `TERMS_VERSION` vẫn bắt buộc.** Vì sao: API không khởi động nếu thiếu; giá trị này chỉ còn dùng cho tới khi có bản đầu tiên được đăng.
- [ ] **Email báo trước 07 ngày khi đổi điều khoản.** Chưa làm: cần tính năng gửi thư hàng loạt. Cho tới khi có, người học chỉ biết qua màn đồng ý lại.

## Chuẩn bị launch B: mua gói Pro một lần bằng payOS (`docs/deliveries/chuan-bi-launch-b.md`, 04/11/2026)

- [ ] **Ba biến payOS cho API và worker.** Nguồn: design launch B §3.3, `apps/api/.env.example`. Việc: đặt `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` (ba cái cùng lúc; đặt dở dang thì API từ chối chạy và nói thiếu biến nào). Vì sao: thiếu cả ba thì `payos.mode = off` và `POST /v1/me/orders` trả 503. **Không** đặt `PAYOS_FAKE_ENABLED=true` ở production: kết hợp với `BILLING_PRODUCTION=true` thì API không khởi động. Ba khóa là bí mật: không dán vào chat hay commit.
- [ ] **Đăng ký URL webhook với payOS: `pnpm payos:confirm-webhook https://<api>/v1/billing/webhooks/payos` sau mỗi lần đổi domain.** Nguồn: design §3.3 (P3). Việc: chạy ở `apps/api` với ba biến trên; payOS gửi một mẫu có chữ ký (`orderCode: 123`), API trả 2xx và bỏ qua vì không có đơn nào mang mã đó. Vì sao: payOS chỉ gửi webhook tới URL đã đăng ký và đã thử được. Kiểm: dòng `billing_events` của mẫu ở trạng thái `ignored` lý do `unknown-order`.
- [ ] **Cho `/v1/billing/webhooks/payos` đi qua WAF và Bot Fight Mode của Cloudflare.** Nguồn: design §3.3. Vì sao: webhook là máy gửi tới, không có trình duyệt; Bot Fight Mode hoặc một luật WAF chặn nó thì tiền về mà Wordmet không biết cho tới khi job đối soát (mỗi giờ) hoặc trang về tìm thấy. Kiểm: một lần chuyển thật nhỏ, xem `billing_events` có dòng `payos:production:<orderCode>:<reference>` ngay sau khi chuyển.
- [ ] **Giá ba kỳ ở admin "Cài đặt hệ thống".** Nguồn: design §3.6. Ba khóa `pro_price_1m_vnd`, `pro_price_3m_vnd`, `pro_price_12m_vnd` (mặc định 79.000, 199.000, 599.000 ₫, giới hạn 1.000 tới 10.000.000). Đổi giá giữa lúc có người đang xem trang Gói: người đó nhận lỗi "Giá vừa đổi" và không bao giờ trả số khác số đã thấy.
- [ ] **`LEARNER_APP_URL` đúng host của app người học.** Nguồn: `OrdersService.create`, `NoticeSender`. Vì sao: link về sau khi trả (`/<ngôn ngữ>/app/plans/order?order=…`) và link "mua kỳ mới" trong email biên nhận và email nhắc hết hạn đều dựng từ biến này. Sai host thì người học trả xong về một trang không tồn tại.
- [ ] **Worker chạy job `billing.orders-reconcile` mỗi giờ và job `entitlement-notices`.** Nguồn: design §3.6, §3.10. Việc: kiểm `MAINTENANCE_ENABLED` của worker; sau deploy chạy `pnpm maintenance:run` một lần và xem không lỗi. Vì sao: job đối soát là lưới an toàn cho webhook bị chặn hoặc mất; job thông báo gửi biên nhận (hạn 7 ngày kể từ lúc tiền về) và email nhắc 07 ngày trước khi kỳ cuối hết.
- [ ] **SMTP thật cho biên nhận và email nhắc hết hạn.** Nguồn: design §3.10. Cả hai dùng trần 95% ngân sách mail như email thanh toán khác (`PAYMENT_MAIL_SHARE`); mail quá trần thì thử lại lần chạy sau, trong cửa sổ của hàng.
- [ ] **Kiểm một lần mua thật nhỏ theo bảng giả định P1–P12.** Nguồn: design §3.14 (DB40). Việc (chủ dự án, sau deploy M1–M2, tiền thật số nhỏ vì payOS không có sandbox): làm từng dòng của bảng, ghi kết quả vào `docs/deliveries/chuan-bi-launch-b.md`. Hai dòng đổi kết quả của code: **P7** (`reference` của webhook trùng `transactions[].reference` của `getCheckout`; code chặn mở kỳ thứ hai cho cùng một lần chuyển khi cùng số tiền và cùng `transactionDateTime`, nên cũng cần P9 là cùng định dạng và múi giờ) và **P12** (payOS trả HTTP 404 cho link không tồn tại; nếu trả 200 kèm mã lỗi thì đơn chỉ được để nguyên và ghi cảnh báo).
- [ ] **Đăng Điều khoản và Chính sách bảo mật bản mới trước khi bán.** Nguồn: design §3.8, Q-B16. Việc: bản nháp đã viết lại nằm ở nhánh `docs/launch-b-legal-drafts` (thư mục `docs/preparation/legal-drafts/`, bốn file, chưa push); chuyển sang nhánh `docs/web-launch-research` hoặc dán thẳng vào admin `/legal`, điền các ô `[[…]]`, đăng. Vì sao: Điều khoản cũ nói dùng thử và tự gia hạn; mục 5–8 mới nói mua một lần, không tự gia hạn, không hoàn tiền. Chính sách mới có payOS và phần quảng cáo viết dạng "có thể hiển thị" (M4 không cần bản mới).
- [ ] **Kiểm không còn chỗ nào nói Pro "chưa mở bán".** Nguồn: design §3.8. Việc: sau deploy tìm chữ "chưa mở bán" trong web và trong email. Đợt B đã đổi trang Gói, câu khóa tính năng (`ui.lockedLine`, `errors.entitlement-required`); landing không hiện giá (Q-B9).

## CSP có `nonce` cho `/app` (launch prep B, M4; `docs/deliveries/chuan-bi-launch-b-spike-csp.md`)

- [ ] **Sau deploy: `/vi/app` trả đúng MỘT chính sách CSP, có `'nonce-` và `'strict-dynamic'`; mọi `<script>` (trừ script chống nháy màu, có hash) mang đúng nonce đó.** Nguồn: design §5.4, issue OpenNext #1302. Kiểm: `curl -sI https://<host>/vi/app | findstr /i content-security-policy` (một dòng, một `default-src`), và hai lần gọi cho hai nonce khác nhau. Vì sao: spike chạy trên `wrangler dev` (workerd cục bộ), chưa trên Cloudflare đã deploy; lỗi #1302 mất nonce có thể chỉ hiện ở đó. Nếu mất nonce: `/app` hỏng hoàn toàn (mọi script bị chặn); lùi bằng cách đặt lại CSP cũ cho `/app` trong `next.config.ts` và bỏ nonce trong `src/proxy.ts`.
- [ ] **Đo CPU Worker của một trang `/app` dựng theo request.** Nguồn: design §5.4, spike M0. Việc: sau deploy, mở Observability hoặc `wrangler tail`, xem "CPU time" của vài request `/vi/app/groups` và ghi con số vào đây. Vì sao: `/app` không còn là trang dựng sẵn, mỗi lượt mở là một lần chạy Worker; gói Cloudflare Free có giới hạn 10 ms CPU mỗi request (theo trang Limits của Cloudflare, chưa đọc trang gốc), gói Paid cao hơn nhiều. Chưa biết Wordmet dùng gói nào. Nếu vượt: gói Paid, hoặc `prefetch={false}` cho các link trong app (mỗi lần tải một trang bắn khoảng 15 request `_rsc` prefetch, mỗi cái là một lần chạy Worker).
- [ ] **Beacon Cloudflare Web Analytics.** Nguồn: design §5.4 (ASSUMPTION A6). Việc: trong Cloudflare dashboard xem Web Analytics đang tự chèn ở edge hay bằng snippet tay. Tự chèn thì thẻ chèn không có nonce và `'strict-dynamic'` chặn nó ở `/app`: tắt chèn tự động và đặt snippet tay có nonce (LB3E9), hoặc chấp nhận beacon không chạy ở `/app`. Kiểm: Console ở `/vi/app` không có vi phạm; thống kê trang landing vẫn chạy.
- [ ] **Chạy lại mục Turnstile của spike M0 với code thật của đợt A.** Nguồn: `chuan-bi-launch-b-spike-csp.md`. Việc: e2e `LA1#14` (widget Turnstile thật ở `/vi/app/login`, cần mạng) nằm trong `e2e/csp.spec.ts` và chạy ở CI trên bản build Worker; xem nó xanh sau khi hợp nhất với đợt A.
- [ ] **Đưa `assert:render-mode` vào mọi chỗ từng gọi `assert:static`.** Nguồn: M4 Task 22. Đã đổi ở `ci.yml`, `scripts/cf-docker.mjs` và `README.md` của `apps/web`; kiểm các nơi khác (lệnh deploy, tài liệu) không còn nhắc `assert:static`.
