# Chuẩn bị launch, đợt A: Turnstile, security header, sửa sau review, lượt AI cho Free — Design (04/11/2026)

> **Trạng thái 04/11/2026:** bản nháp, **chờ chủ dự án đọc và trả lời các câu ở §10**. Chưa có code, chưa có plan, chưa có decision record.
> **Nguồn quyết định:** chủ dự án chốt trong chat 02–04/11/2026, tổng hợp ở `docs/preparation/WEB_LAUNCH_DECISIONS_AND_OPEN_ITEMS_2026-11-04.md`
> (nhánh local `docs/web-launch-research`). Mã quyết định (A1, R-Q14, Q13…) dẫn theo file đó.
> **Code đọc trên:** `origin/dev` @ `a6b2bd15`. Mọi `path:line` ở hai file code facts:
> [`../../preparation/LAUNCH_PREP_CODE_FACTS_2026-11-04-hardening.md`](../../preparation/LAUNCH_PREP_CODE_FACTS_2026-11-04-hardening.md) (Turnstile, header, review) và
> [`../../preparation/LAUNCH_PREP_CODE_FACTS_2026-11-04-free-ai.md`](../../preparation/LAUNCH_PREP_CODE_FACTS_2026-11-04-free-ai.md) (lượt AI, trial).
> **Đợt B** (quảng cáo, thanh toán VietQR) có design riêng: [`2026-11-04-chuan-bi-launch-b-design.md`](2026-11-04-chuan-bi-launch-b-design.md).

Ví dụ xuyên suốt: **Lan**, học viên gói Free, timezone `Asia/Ho_Chi_Minh`.

## 1. Mục tiêu và phạm vi

Ba việc nhỏ và vừa phải xong trước launch web, không phụ thuộc thanh toán hay quảng cáo.

| Phần | Việc | Chạm |
|---|---|---|
| A1 | Turnstile (CAPTCHA của Cloudflare) cho các route gửi mail OTP khi chưa đăng nhập | API Identity, web, có thể admin |
| A1 | Security header cho admin tĩnh, API và web | admin (`_headers`), API, web (`next.config.ts`) |
| A2 | Đợt sửa các mục review còn mở (R-Q14 = một đợt riêng) | chủ yếu tài liệu, một ít code nhỏ |
| A3 | Gói Free có 15 câu AI + 5 lượt tra AI mỗi tháng dương lịch (A1–A2 của tổng hợp); tắt trial (P3) | API Entitlements, settings, admin, web, landing |

**Không làm trong đợt này:** thanh toán, quảng cáo (đợt B); Cloudflare Access, WAF, Bot Fight Mode (cấu hình lúc deploy, đã có trong `deploy-checklist.md`);
viết lại các mục 5–8 của Điều khoản (đi cùng đợt B); test e2e cho backend (Q11: không làm).

## 2. Quyết định đã chốt (tóm tắt)

| Mã | Quyết định | Áp vào |
|---|---|---|
| A1, A2 (tổng hợp) | Free có `free_ai_practice_per_cycle` = 15, `free_ai_lookup_per_cycle` = 5; một tháng = tháng dương lịch theo timezone của học viên | §6 |
| A3 (tổng hợp) | Không cần công tắc từ chối AI: học viên tự bật/tắt "Kiểu câu có AI" và chỉ tra AI khi bấm nút | §6 (không thêm gì) |
| P3 | Tắt trial | §6.6 |
| R-Q14 | Các việc sửa sau review đi thành một đợt riêng có design và plan | §5 |
| R-Q11 (Q11) | Không e2e backend; dev test tay theo checklist `docs/audit/2026-11-04-dev-test-checklist.md` | §5, §8 |
| Q13 | Giữ cơ chế chặn provider giả bằng `BILLING_PRODUCTION`, chỉ thêm mục checklist | §5 (R3) |
| (deploy-checklist) | Turnstile ở đăng ký và quên mật khẩu, API kiểm token phía server | §3 |

## 3. Chia việc và thứ tự

Thứ tự theo khối lượng, từ nhỏ đến lớn (chủ dự án 04/11). Mỗi milestone một nhánh từ `origin/dev`, một PR vào `dev`.

| Milestone | Nội dung | Ước lượng |
|---|---|---|
| M1 | Turnstile (API + web + admin nếu chọn) và security header | 1–2 PR |
| M2 | Đợt sửa sau review: tài liệu trước, code nhỏ sau | 2–3 PR (một PR tài liệu, một PR code) |
| M3 | Lượt AI cho Free + tắt trial | 1–2 PR |

M1 và M3 độc lập. M2 phần tài liệu có thể làm song song với M1.

## 4. A1 — Turnstile và security header

### 4.1 Turnstile: luồng

```
Lan mở form đăng ký ──► widget Turnstile chạy ngầm ──► token (sống 300 s, dùng 1 lần)
        │ POST /v1/auth/register { …, turnstile_token }
        ▼
API: TurnstileGuard ──► POST siteverify (secret, token, remoteip)
        ├─ success: true  ──► rate limit như cũ ──► tạo tài khoản, gửi OTP
        └─ success: false ──► 400 `captcha-failed`, không gửi mail
```

Route phải chặn (theo code facts §A1): `POST /v1/auth/register`; `POST /v1/auth/otp` (cả `verify_email` và `reset_password`). Thêm
`POST /v1/auth/login` khi tài khoản chưa xác minh hay không: câu Q-A1. Không chặn: `verify-email`, `password/reset` (không gửi mail), Google
(phải qua Google trước).

### 4.2 Turnstile: API

- **Guard** `TurnstileGuard` (Identity), đặt **trước** `RateLimitGuard` trên các route ở §4.1, để token giả không ăn vào bộ đếm của người thật.
  Đọc `turnstile_token` trong body (body đã parse trước guard, giống `RateLimitGuard`). Gửi trong body thì không phải đổi CORS.
- **Schema:** thêm `turnstile_token: z.string().min(1).max(2048)` vào `registerSchema` và hai nhánh của `otpRequestSchema` (đều `strictObject`).
  Bắt buộc hay không tùy chế độ (dưới). Test "field lạ → 400" vẫn giữ.
- **Client siteverify** theo mẫu `RealGoogleClient`: `fetch` global truyền vào được để test, `POST` form-urlencoded tới
  `https://challenges.cloudflare.com/turnstile/v0/siteverify` với `secret`, `response`, `remoteip` (= `request.ip`), timeout ngắn. Kiểm thêm
  `hostname` khớp host của web. Lỗi bọc lại, không mang secret ra log.
- **Chế độ** (`TURNSTILE_MODE`, mẫu như `google.mode`):
  - `real`: cần `TURNSTILE_SECRET_KEY`; token bắt buộc.
  - `fake`: không gọi mạng; token nào khác rỗng cũng qua, trừ một giá trị cố định để test trượt. Dùng cho smoke, `admin-e2e-real`, local.
  - `off`: không kiểm, token không bắt buộc. Chỉ để local khi cần.
  - `BILLING_PRODUCTION=true` cùng `fake` hoặc `off` thì API từ chối khởi động (cùng cơ chế Q13).
- **Lỗi mới:** `captcha-failed` (400, problem+json). Token hết hạn hoặc đã dùng (`timeout-or-duplicate`) cũng ra lỗi này; web tự làm mới widget.
- **Khi không gọi được Cloudflare** (timeout, 5xx): câu Q-A4.
- **Client `mobile`** (schema có, app chưa có): câu Q-A3.
- **IP:** `remoteip` chỉ đúng khi `TRUST_PROXY` đặt đúng với proxy thật (đã có mục trong `deploy-checklist.md`).

### 4.3 Turnstile: web và admin

- **Web:** một component `TurnstileWidget` tải script `https://challenges.cloudflare.com/turnstile/v0/api.js` ở chế độ render tường minh,
  trả token qua callback, có hàm làm mới. Gắn vào `RegisterForm`, `ForgotPasswordForm`, nút gửi lại mã của `VerifyEmailForm`. Nút gửi bị tắt
  tới khi có token. Lỗi `captcha-failed` có câu riêng vi/en (thêm slug vào `KNOWN_ERROR_SLUGS`; `problem.test.ts` đòi đủ hai ngôn ngữ).
- **Site key:** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (web, đóng vào bundle lúc build) và `VITE_TURNSTILE_SITE_KEY` (admin, nếu Q-A2 chọn có widget).
  Local và CI dùng khóa test của Cloudflare: sitekey `1x00000000000000000000AA` (luôn qua) với API ở `fake`.
- **CSP của web:** thêm `https://challenges.cloudflare.com` vào `script-src` và thêm `frame-src https://challenges.cloudflare.com`
  (hiện không có `frame-src`, nên `default-src 'self'` chặn iframe). Sửa `csp.test.ts`; e2e E23 vẫn đòi 0 vi phạm.
- **e2e mock của web:** chặn request tới `challenges.cloudflare.com` và giả widget trả token, để e2e không cần mạng.
- **Admin:** trang quên mật khẩu gọi cùng `POST /v1/auth/otp` và cùng tiến trình API. Câu Q-A2.
- Trang quên mật khẩu mở cả khi đã đăng nhập (B8-2), nên widget cũng hiện cho người đã đăng nhập. Chấp nhận.

### 4.4 Security header

**Admin tĩnh** (Workers Static Assets, không có Worker script): thêm `apps/admin/public/_headers`, Vite copy vào `dist/` (`ASSUMPTION`, kiểm lúc build):

| Header | Giá trị đề xuất | Ghi chú |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://admin-api.wordmet.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`, cộng `img-src` theo Q-A5 | React Aria tự chèn thẻ `<style>` lúc chạy, nên cần `'unsafe-inline'` cho style (hoặc hash, `ASSUMPTION`). Có Turnstile thì thêm `challenges.cloudflare.com` vào `script-src`, `frame-src` |
| `X-Content-Type-Options` | `nosniff` | |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | |

Chưa rõ rule `_headers` có áp cho trang trả về từ fallback SPA không (`ASSUMPTION`); kiểm bằng `curl -I` trên một đường dẫn sâu sau deploy.

**API:** đề xuất dùng `helmet` (thư viện có sẵn, theo luật "dùng công cụ có sẵn trước khi tự viết") với cấu hình cho API JSON:
tắt `X-Powered-By`; `X-Content-Type-Options: nosniff`; `Referrer-Policy: no-referrer`; `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`;
`Cross-Origin-Resource-Policy: same-site`. Không đặt HSTS ở API: để Cloudflare đặt ở tầng edge (thêm mục checklist). Kiểm không làm vỡ
CORS, cookie refresh và webhook billing (raw body).

**Web:** thêm vào `headers()` của `next.config.ts` (cạnh CSP): `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy` như admin. `poweredByHeader: false` đã có.

### 4.5 When → Then (Turnstile)

| Khi | Thì |
|---|---|
| Lan gửi form đăng ký với token hợp lệ | Guard qua, rate limit đếm như cũ, tạo tài khoản, gửi OTP |
| Bot gửi register không có `turnstile_token` (chế độ `real`) | 400 `validation-failed` từ schema; không tới guard, không đếm rate limit |
| Bot gửi token giả | siteverify `success: false` → 400 `captcha-failed`; không gửi mail, không đếm rate limit |
| Lan để form quá 5 phút rồi mới bấm | `timeout-or-duplicate` → 400 `captcha-failed`; web làm mới widget, Lan bấm lại |
| Lan bấm gửi hai lần nhanh với cùng token | `useSubmitOnce` chặn lần hai ở web; nếu vẫn tới API thì lần hai `captcha-failed` |
| Token qua nhưng `hostname` không phải host của web | 400 `captcha-failed` (token lấy từ site khác) |
| Cloudflare không trả lời trong thời gian chờ | Theo Q-A4 |
| API chạy `fake` hoặc `off` cùng `BILLING_PRODUCTION=true` | API từ chối khởi động, báo tên biến |
| Smoke chạy với API `fake` | Smoke gửi một token bất kỳ khác rỗng; chạy như trước |

## 5. A2 — Đợt sửa sau review

Danh sách đủ ở code facts §C, §D. Chia ba nhóm.

**Nhóm 1, chỉ tài liệu (một PR):**
- R3: mục checklist "đặt `BILLING_PRODUCTION=true`; không đặt các biến `*_FAKE_ENABLED`; kiểm API từ chối khởi động khi bật một đồ giả".
- R4: các mục còn thiếu của `deploy-checklist.md` (AI và riêng tư; trước khi bán thật; đo tải; CSP; chạy hai worker nhắc học; dọn tài khoản chưa xác nhận
  đánh dấu xong; DB production tạo mới (B8-5); đo search và mở phiên AI). Mỗi sự thật pháp lý ghi một lần, không thêm phương án "chờ luật sư".
- R11: sửa dòng plan thành ✅ (đã merge).
- R12: các chỗ lệch trong `CLAUDE.md`, design cũ (ghi chú "đã thay bởi …", không viết lại), test flow còn `pnpm test:e2e`, handoff người học, `buoc-7.md`.
- Tài liệu lệch thêm: `deploy-checklist.md` còn nhắc waitlist; plan A7 nhắc D1 waitlist.
- Các dòng "ghi nhận" của R14: UW-7 (lớp phiên chép từ admin), UA-7 (email trong URL bộ lọc admin), B8-8 (ghi chú design Bước 8), B5-6 (nếu chọn sửa chữ design).
- Google đăng nhập thật: sửa `CLAUDE.md`, `buoc-8.md`, `deploy-checklist.md` sau khi có kết quả của chủ dự án (Q-A10).

**Nhóm 2, code nhỏ (một PR, mỗi mục là một commit; defect thì hai commit: test đỏ trước):**
- Gốc `package.json`: bỏ script `test:e2e` trỏ tới script không còn.
- B1-5: dọn `otp_failure_windows` (> 48 h) và `mail_budget_buckets` cũ bằng job dọn sẵn có.
- B3-5: `visibleSenseIds` vào trong transaction; `deleteItem` gọi `lockItems`.
- B5-5: mốc chu kỳ `min(currentPeriodStart, occurredAt)`, kèm unit test.
- B5-7: `refund` đòi có dòng `use` `confirmed` đúng `operation_id`, kèm test.
- B2-6: trần 3 lượt job theo `background_jobs.attempts` (hoặc ghi rõ vào design nếu giữ).
- UA-4: khai `AppConfig` của `use-intl` cho admin.
- UW-6: bỏ assert class bố cục trong ba file test web.
- B2-7: đổi nhãn `B2#66` trong `list-routes.spec.ts`.
- B2-8 (phần nợ): gộp `writeEntry` bị chép ở hai controller.
- A6 (admin): chặn ký tự NUL trong ô tìm kiếm Người dùng; đếm ngược khi khóa tài khoản bị rate limit; ô ngày theo locale.

**Nhóm 3, chạy tay và đo (ghi output vào `docs/deliveries/`):**
- R2: merge checklist dev (nhánh `docs/dev-test-checklist`), chạy một lượt, lưu output.
- R8: thử trên trình duyệt "Đặt mật khẩu" của tài khoản chỉ có Google.
- R13: nối output smoke hồi quy; lượt trình duyệt Bước 8; mục "Thêm sau plan" cho test flow admin; as-built lần gọi AI thật 28/10 (cần dữ liệu của chủ dự án).
- B5-8: chứng minh test chạy đua có răng (bỏ khóa trên nhánh nháp, smoke phải đỏ).
- B2-5, B7-5: đo bằng `test:scale` (cần Docker).

**Cần chủ dự án quyết trước khi làm** (Q-A9): B2-3 (Content chạy SQL trên bảng Pipeline, DB12), B3-7 = B25-2 (trang Xuất thiếu "Từ chưa có nghĩa",
7.799 > `EXPORT_MAX_ROWS` 5.000), B4-4 (PX3, PX5, PX6), UA-6 (44 chỗ `getByTestId('detail-panel')`, cỡ M).

## 6. A3 — Lượt AI cho Free, tắt trial

### 6.1 Hành vi

- Lan (Free) mỗi tháng dương lịch theo giờ Việt Nam có **15 câu AI** và **5 lượt tra AI**. Tháng 11: từ 00:00 01/11 tới trước 00:00 01/12 giờ của Lan.
- Hết lượt thì như Pro hiện nay: mở phiên có kiểu AI bị từ chối `ai-quota-insufficient` kèm ngày có lượt mới; tra AI trả `quota-exhausted`.
- Trần chung `ai_daily_cap` vẫn đếm cả lượt của Free (đã vậy). Admin có thể tắt AI của riêng một người Free bằng limits grant `ai_*: 0` (đã có).
- Câu AI làm sẵn (`ai_prefetch_count`, mặc định 2) trừ lượt lúc ghi câu như hiện nay; câu chưa hỏi được dùng lại ở phiên sau.

### 6.2 Cycle tháng dương lịch

Hiện cycle AI là cửa sổ một tháng tính theo UTC từ một anchor (ngày bắt đầu Pro, trial hoặc limits grant). Free không có anchor, nên **nếu chỉ
đổi số thì Free dùng AI không giới hạn** (code facts F3). Thiết kế:

- Thêm hàm thuần `calendarMonthCycle(zone, now)` → `[đầu tháng theo zone, đầu tháng sau theo zone)`, dựng từ `localDate` và `zonedMidnight`
  sẵn có (đã xử lý DST). Thêm phép cộng tháng trên chuỗi `YYYY-MM`.
- Thêm một hàm duy nhất `aiCycle(resolved, zone, now)`: có anchor thì `cycleAt(anchor, now)` như cũ; không có anchor và gói Free có limit AI > 0
  thì `calendarMonthCycle(zone, now)`. **Cả bốn chỗ** đang tự tính cycle (snapshot, `standing` của reserve/confirm, `refund`, dashboard) đổi sang
  gọi hàm này, để không chỗ nào lệch.
- `UsageLedgerService` cần timezone: inject `IdentityService` (module đã import), đọc `getProfile(userId, tx)` trong cùng transaction; thiếu profile thì
  `'UTC'` như `checkQuota`.
- Không cần migration: lượt đếm theo thời điểm `[start, end)` trên `confirmed_at` và `credited_at`.
- Refund câu AI lỗi của Free hoạt động như Pro (hiện trả `refunded: false` vì thiếu anchor).
- Snapshot trả `resets_at` = đầu tháng sau theo zone, nên web hiện dòng "Lượt câu AI mới vào 01/12".
- Hai chỗ chưa có luật: Pro về Free giữa tháng (Q-A7); Free có limits grant có AI (Q-A8).

### 6.3 Settings

- Hai key mới trong nhóm `entitlements`: `free_ai_practice_per_cycle` (mặc định 15), `free_ai_lookup_per_cycle` (mặc định 5), bound `0–5000` như Pro.
  Đề xuất thêm ràng buộc chéo "Free ≤ Pro" theo mẫu `at_least` đang có.
- Sửa đủ năm chỗ của `settings.definitions.ts`, `planNumbers()` đọc hai key (bỏ số 0 ghi cứng), `appConfigView` thêm số AI vào `plans.free`,
  kiểu web `AppConfig`.
- Admin: thêm hai ô vào `SETTINGS_LAYOUT.entitlements` với nhãn vi/en; sửa nhãn đang ghi "gói Pro và Dùng thử" nếu bỏ chữ Dùng thử (§6.6).
- Test ghim danh sách setting đổi theo (API `settings.definitions.spec.ts`, `app-config.view.spec.ts`; admin `settings-api.test.ts` "49 key",
  fixture e2e mock).

### 6.4 Web

- Trang gói: dòng AI của thẻ Free đổi từ "cần gói Pro" thành "{n} câu AI và {m} lượt tra AI mỗi tháng" (`included: true`); ô AI của Free trong
  bảng so sánh thôi ghi cứng `'—'`.
- Công tắc "Kiểu câu có AI": khi được dùng thì bỏ chip "Pro" (hiện chip vẫn hiện). Khi hết lượt, dòng khóa nói "hết lượt tháng này, có lượt mới
  vào {ngày}" thay vì "Dành cho gói Pro. Gói Pro chưa mở bán." Câu này còn phụ thuộc đợt B (lúc Pro mở bán).
- Tra AI: chip "Dùng thử" bỏ khi trial tắt; dòng "còn N lượt tra AI" tự hiện vì `limit > 0`.
- Cài đặt → Mức sử dụng: tự hiện `còn X/Y` và ngày có lượt mới (đã chạy theo dữ liệu).
- Landing: bảng Free/Pro, hai dòng AI của Free ghi số lượt; bỏ câu trial dưới bảng; FAQ `a2` sửa theo. Test ghim nguyên văn đổi theo.

### 6.5 Admin

- Chưa có màn nào cho staff xem lượt AI của một học viên (API `GET /v1/admin/entitlements/users/:id` có sẵn, chưa ai gọi). Không thêm trong đợt này.
- Thẻ dashboard "Người dùng gói Pro" chỉ tính Pro; tổng theo ngày đã gồm Free. Không đổi.

### 6.6 Tắt trial

Trial chỉ bắt đầu từ sự kiện của một nhà cung cấp tự gia hạn (`subscription_started` có `trial_ends_at`). Adapter duy nhất hiện nay là bản giả, và
VietQR (đợt B) không có trial. Đề xuất cách nhỏ nhất:
- Không gỡ code trial (để khi có cổng tự gia hạn còn dùng được). Không thêm setting bật/tắt trial lúc này.
- `trial_eligible` trong snapshot trả `false`.
- Bỏ mọi chữ hứa trial ở web và landing (§6.4); nhãn admin bỏ chữ "Dùng thử" ở các key dùng chung.
- Smoke và script đang dựng trial bằng provider giả (`smoke-buoc-5`, `smoke-buoc-8`, `learner-test-setup --plan trial`) giữ nguyên, vì chúng
  kiểm logic còn trong code.

### 6.7 When → Then (lượt AI của Free)

| Khi | Thì |
|---|---|
| Lan (Free) mở phiên 10 câu có kiểu AI ngày 05/11, chưa dùng lượt nào | Planner cần ≤ 10 lượt, còn 15 → mở phiên; lượt trừ lúc ghi câu |
| Lan đã dùng 15 câu AI trong tháng 11, mở phiên có kiểu AI ngày 20/11 | 403 `ai-quota-insufficient`, `resets_at` = 00:00 01/12 giờ Việt Nam |
| 23:59 30/11 giờ của Lan, còn 0 lượt; 00:00 01/12 | Từ 00:00 01/12 có lại 15 lượt (cửa sổ mới, không cần job) |
| Một câu AI của Lan bị báo lỗi và admin xác nhận | Refund trả 1 lượt trong tháng hiện tại (`refunded: true`) |
| Lượt đang giữ chỗ (`reserved`, < 2 phút) lúc sang tháng | Vẫn được cộng vào `used` cho tới khi confirm hoặc hết hạn (như hiện nay) |
| Lan đổi timezone từ `Asia/Ho_Chi_Minh` sang `Europe/London` ngày 15/11 | Cửa sổ tháng dịch theo zone mới (tới khoảng một ngày); chấp nhận |
| Lan có limits grant `ai_practice_per_cycle: 0` | Limit 0 → `plan-required` như hiện nay |
| Admin đặt `free_ai_practice_per_cycle = 0` | Free về như hiện nay: `plan-required`, web hiện khóa |
| Trần chung `ai_daily_cap` đã chạm | Lan nhận `ai-unavailable` như mọi gói |
| Lan (Pro) hết hạn ngày 20/11, về Free | Theo Q-A7 |
| Lan (Free) có limits grant có AI | Theo Q-A8 |

## 7. Chỗ đổi luật cũ

- Luật Bước 5 "Free AI luôn bằng 0" (comment `plan-rules.ts:7-8`, `plan-numbers.ts:7`) đổi thành số theo setting.
- Cycle Bước 5 (D13: theo UTC từ anchor) giữ nguyên cho Pro và trial; Free có cycle riêng theo tháng dương lịch.
- Hứa trial của landing và trang gói bỏ.

## 8. Kiểm thử

- **API unit:** `calendarMonthCycle` (đầu và cuối tháng, tháng 2, năm nhuận, timezone âm dương, ngày đổi DST); `aiCycle` cho đủ các nguồn anchor;
  `standing`, `refund`, snapshot với Free có limit; guard Turnstile (qua, trượt, hết hạn, sai hostname, Cloudflare không trả lời, ba chế độ);
  config (`TURNSTILE_MODE`, chặn ở production); header của API (một test HTTP gọi `/v1/health` kiểm header và không có `X-Powered-By`).
- **Web:** component widget (giả script), form đăng ký và quên mật khẩu gửi token, lỗi `captcha-failed`; trang gói, công tắc AI, tra AI với
  fixture Free có lượt; `csp.test.ts`.
- **Admin:** settings 51 key; widget (nếu Q-A2 chọn).
- **Smoke:** `smoke-buoc-5` (người mới có pool AI 15/5, `trial_eligible` false), `smoke-buoc-7` (Free dùng được AI tới hết lượt), mọi smoke gửi
  `turnstile_token` với API `fake`.
- **Checklist dev:** thêm mục Free hết lượt, sang tháng, refund; Turnstile ở chế độ `real` với khóa test của Cloudflare.

## 9. Xong khi

- CI xanh trên mọi PR.
- Smoke 5, 7, 8 chạy qua trên DB mới, output lưu vào `docs/deliveries/`.
- Chạy tay: đăng ký và quên mật khẩu trên web với khóa test `real`; header kiểm bằng `curl -I` trên API và admin local; một học viên Free dùng hết
  15 câu AI, bị chặn, đổi giờ máy sang tháng sau (hoặc đặt dữ liệu) thì có lại lượt.
- `IMPROVEMENT_PLAN` cập nhật trạng thái R2–R4, R8, R11–R14.

## 10. Câu hỏi còn mở

Chủ dự án trả lời trước; đề xuất của Claude đưa sau.

| # | Câu hỏi | Bối cảnh |
|---|---|---|
| Q-A1 | Có chặn Turnstile ở **đăng nhập của tài khoản chưa xác minh** không? | Login gửi lại mã khi mật khẩu đúng. Không chặn thì bot đã đăng ký vẫn gửi thêm mail qua login, tối đa 1 mail/60 s và 5 mail/giờ cho mỗi email |
| Q-A2 | Trang quên mật khẩu của **admin** có widget không, hay API miễn kiểm cho admin? | Admin và học viên gọi cùng `POST /v1/auth/otp`, cùng tiến trình API. Miễn kiểm thì phải phân biệt theo host/Origin |
| Q-A3 | Request đăng ký hay xin mã từ client **`mobile`** (chưa có app) xử lý thế nào? | Schema đã có `client: 'mobile'`. App Flutter chưa có; khi có, Turnstile trên app khác trên web |
| Q-A4 | Khi **không gọi được Cloudflare** (mạng lỗi, quá thời gian chờ): từ chối hay cho qua? | Từ chối thì người thật không đăng ký được lúc Cloudflare lỗi; cho qua thì bot lợi dụng được lúc đó. Rate limit vẫn còn ở cả hai cách |
| Q-A5 | Ảnh trong bản xem trước Markdown văn bản pháp lý của admin: cho tải ảnh từ mọi địa chỉ `https:` hay chỉ ảnh của chính site? | Ảnh hưởng `img-src` của CSP admin |
| Q-A6 | Có làm **e2e mock** cho luồng "Đặt mật khẩu" của tài khoản chỉ có Google (B8-4) không, hay chỉ thử tay (R8)? | |
| Q-A7 | Lan (Pro) dùng 200 câu AI, hết hạn ngày 20/11 về Free: lượt dùng lúc còn Pro **có bị tính** vào 15 lượt Free của tháng 11 không? | Cách đếm hiện tại sẽ tính, tức Lan hết lượt Free tới 01/12 |
| Q-A8 | Lan (Free) được admin cấp limits grant có số AI (vd 50 câu): chu kỳ tính theo **ngày bắt đầu grant** (như hiện nay) hay theo **tháng dương lịch**? | Hiện grant như vậy neo chu kỳ vào ngày bắt đầu của nó (B5E32) |
| Q-A9 | Các mục review cần quyết trước khi sửa: B2-3, B3-7, B4-4, UA-6. Làm trong đợt này, để sau, hay bỏ từng mục? | Chi tiết ở code facts §C |
| Q-A10 | Kết quả thử **Google đăng nhập thật**: ngày, lần 1 và lần 2, hai `ASSUMPTION` của design Bước 8 §19 đúng hay sai? | Cần để sửa `CLAUDE.md`, `buoc-8.md`, `deploy-checklist.md` |

## 11. Rủi ro và chỗ chưa kiểm

- `ASSUMPTION`: `_headers` áp cho trang fallback SPA của admin; Vite copy `public/` vào `dist/`; hash CSP áp được cho thẻ `<style>` React Aria tạo lúc chạy.
- `ASSUMPTION`: style gán qua CSSOM (7 prop `style={}` của admin) không bị CSP chặn.
- Turnstile ở chế độ `real` chỉ kiểm được khi có mạng tới Cloudflare; CI chạy `fake`.
- Đổi cycle chạm phần tính lượt cốt lõi; bốn chỗ tính cycle phải dùng chung một hàm, nếu không snapshot và reserve có thể báo khác nhau.
- `helmet` thêm một dependency mới cho API; cấu hình mặc định của nó có header hợp với trang HTML hơn API, nên phải cấu hình lại (§4.4).
- Học viên đổi timezone giữa tháng làm cửa sổ tháng dịch tới một ngày (chấp nhận, §6.7).
