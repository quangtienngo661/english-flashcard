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

## Đo tải trước launch

- [ ] **Chạy `pnpm test:scale` (300.000 từ riêng của người học khác) trên máy giống bản deploy.** Nguồn: design §6.4 (T5), M3 gate
  (21/10; xem as-built). Vì sao: số đo T5 có từ Task 6 (trước M3); sau M3, tra từ (`/v1/lookup`) vẫn đọc toàn bộ index lemma của
  catalog (1,3 ms ở 5.000 từ), thời gian tăng theo cỡ catalog (mục tiêu 8.812 từ). Cần thấy con số thật trước khi có người dùng.

## Admin web

- [ ] **Thêm security header cho admin tĩnh (CSP, `frame-ancestors`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`).** Nguồn: AD12
  (kiểm kê [`inventory-admin-practice.md`](../superpowers/reviews/2026-10-20-buoc-0-3-review-evidence/inventory-admin-practice.md); design §3 "Không làm"). Vì sao: bản deploy admin hiện chỉ phục vụ file tĩnh, không có header nào;
  thêm `apps/admin/public/_headers` (kiểm Workers Static Assets có đọc file này không) và thử CSP với style inline của React Aria.
- [ ] **Quyết định security header cho API (helmet, ẩn `x-powered-by`).** Nguồn: FD-dj (kiểm kê [`inventory-foundation-db.md`](../superpowers/reviews/2026-10-20-buoc-0-3-review-evidence/inventory-foundation-db.md), đi cặp với AD12).
  Vì sao: API chưa đặt header nào; chủ dự án quyết lúc Deploy.

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
- [ ] **Gắn CAPTCHA (Cloudflare Turnstile) vào đăng ký, quên mật khẩu, waitlist; API kiểm token phía server.** Nguồn: trao đổi 26/10; tìm
  `turnstile|captcha` trong `apps/api/src`, `apps/web/src`, `apps/admin/src` không thấy. Vì sao: bot đăng ký bằng email người khác khiến SMTP
  Gmail gửi hàng loạt OTP → bị coi là spam và khoá tài khoản gửi; rate limit theo IP không đủ khi bot đổi IP. **Cần sửa code** và thêm
  domain Turnstile vào CSP (`ASSUMPTION`: tên domain chính xác, kiểm lúc làm).
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
- [ ] **Dọn tài khoản chưa từng xác nhận email sau N ngày.** Nguồn: A5 đợt cải thiện nhóm A (design `../superpowers/specs/2026-10-26-dot-cai-thien-a-design.md` §4),
  làm cùng phần xoá tài khoản của Bước 8. Vì sao: từ đợt này tài khoản chưa xác nhận không vào được app nhưng vẫn nằm trong DB và giữ chỗ email;
  `identity-cleanup.service.ts` chỉ xoá OTP và chuỗi phiên hết hạn.

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
