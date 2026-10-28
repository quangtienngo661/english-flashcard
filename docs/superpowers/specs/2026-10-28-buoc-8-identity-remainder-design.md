# Bước 8 — Identity còn lại: đăng nhập Google và xóa tài khoản — Design (28/10/2026)

> **Trạng thái 28/10/2026:** bản đầu, chờ chủ dự án duyệt. Chỉ là tài liệu; chưa có code.
> **Nhánh:** `docs/buoc-8-brainstorm` (cắt từ `dev` @ `9e35eb5`).
> **Nguồn quyết định:** câu hỏi [`../reviews/2026-10-28-buoc-8-questions.md`](../reviews/2026-10-28-buoc-8-questions.md), nhật ký hỏi đáp
> [`../reviews/2026-10-28-buoc-8-qa-log.md`](../reviews/2026-10-28-buoc-8-qa-log.md), decision record
> [`../decisions/2026-10-28-buoc-8-identity-remainder-decisions.md`](../decisions/2026-10-28-buoc-8-identity-remainder-decisions.md) (D1–D25).
> **Bằng chứng code:** [`BUOC_8_CODE_FACTS_2026-10-28.md`](../../preparation/BUOC_8_CODE_FACTS_2026-10-28.md) (`dev` @ `9e35eb5`). Số dòng trong design này là của
> commit đó; plan phải đọc lại code trên `dev` lúc viết.
> **Research:** [`TRIAL_AND_RETENTION_AFTER_DELETION_RESEARCH_2026-10-28.md`](../../preparation/TRIAL_AND_RETENTION_AFTER_DELETION_RESEARCH_2026-10-28.md) (D12, D15);
> yêu cầu store về xóa tài khoản: `docs/preparation/research_notes/Phát hành app iOS và Android/policy_compliance.md` §1–§2.

Nhãn trong design: **Chốt** = chủ dự án đã chốt (D# ở decision record); **Đề xuất** = Claude đề xuất, duyệt cùng design; `ASSUMPTION` = chưa kiểm được.

Ví dụ xuyên suốt: **Lan**, người học, đăng ký bằng `lan@gmail.com` và mật khẩu, đã học 200 từ, có 15 từ riêng, đang dùng Pro tự gia hạn. **Minh**, chưa có tài khoản,
dùng Gmail `minh@gmail.com`. **Hà**, editor.

---

## 0. Đọc trước: những chỗ đổi so với quyết định và code cũ

| Chỗ cũ | Bước 8 | Vì sao |
|---|---|---|
| SR11, IR18: "chỉ giữ số liệu tổng hợp không định danh" | Danh sách cụ thể "xóa gì, giữ gì, giữ bao lâu" ở §7.3: còn giữ dòng sổ lượt, giao dịch, báo lỗi mang **mã ẩn danh**, id trơ của nhân sự ở chỗ "ai đã làm" | D14, D15, D16, D18 |
| IR18: Google xác nhận lại bằng `prompt=login` / `max_age` và `auth_time` trong 5 phút | Google không có `prompt=login`; `auth_time` chỉ có khi app đã xác minh và "In production". Xác nhận lại = một lần chọn lại đúng tài khoản Google (`prompt=select_account`) | D25; tài liệu Google đọc 28/10/2026 |
| IR18 thứ tự (2) thu hồi phiên, (3) module xóa, "thử lại tới khi xong" | Giữ nguyên; (3) và (4) chạy trong **một** transaction ngay trong request, lỗi thì việc định kỳ thử lại | D23 |
| `AuthGuard` không đọc DB (Bước 1, `auth.guard.ts:15-27`) | Đọc `users.status` mỗi request; `locked` và `deleting` bị từ chối ngay | D24 |
| IR17: thao tác admin chỉ kiểm vai trò và chuỗi phiên | Thêm: chuỗi phiên tạo bằng Google không dùng được cho route admin | D5 |
| PRC27: báo lỗi giữ ẩn danh (`ASSUMPTION`) | Chốt: giữ, bỏ tên, xóa ghi chú; báo lỗi về câu làm từ câu người học tự viết thì xóa hẳn | D14 |
| Bước 5 (D22): một trial theo tài khoản và thẻ, "trial lại sau khi xóa" để Bước 8 | Xóa `trial_history` của người đó; đăng ký lại thì có trial lại trên web | D12 |
| Bước 6 `AiService.deleteUserData` tự mở `$transaction` (`ai.service.ts:42-49`) | Nhận transaction từ ngoài để chạy chung với các module khác | D23 |
| Web: nút "Đăng nhập bằng Google · Sắp có", dòng "Xóa tài khoản · Sắp có" | Thành nút và luồng thật | D2 |

---

## 1. Mục tiêu và bối cảnh

Bước 8 là bước cuối của thứ tự xây cố định trước Deploy. Hai việc store và luật bắt buộc trước khi có người dùng thật: **xóa tài khoản ngay trong app** (Apple 5.1.1(v),
Google Play, Nghị định 356/2025: làm trong 20 ngày) và **đăng nhập Google** (đã chốt từ spec, K2, K7, K8). Cộng các việc các bước trước để lại: dọn tài khoản chưa xác nhận
email (đợt A, `deploy-checklist.md`), admin xóa người dùng (đợt admin, câu 8), tên từ Google (D2 đợt sửa Bước 0–3), trial lại sau khi xóa (Bước 5), giao dịch của người bị
xóa (đợt giao diện người học), và nút hủy gói người học còn thiếu (chủ dự án phát hiện, D11).

## 2. Quyết định (tóm tắt; mọi phương án và trade-off ở decision record)

| # | Chốt |
|---|---|
| D2, D3, D4 | API + web người học + admin; một design, một plan; đăng nhập Google **thật** trong "Xong khi" (CI dùng Google giả); implement bằng phiên song song + phiên điều phối |
| D5 | Nút Google chỉ ở web người học; phiên tạo bằng Google không dùng cho route admin |
| D6 | Người mới bấm Google → màn "Bổ sung thông tin" sẵn có (+ ô tên khi Google không trả tên); tài khoản chỉ được tạo khi đã điền ngày sinh (từ 13 tuổi) và đồng ý |
| D7 | Tên và link ảnh đại diện lấy **một lần** khi tạo tài khoản bằng Google |
| D8 | Không có nút gắn / gỡ Google; tự liên kết theo email (K8); dòng chỉ đọc "Đăng nhập bằng"; đăng ký trùng email tài khoản Google → 409 `email-taken` (đã có) |
| D9, D25 | Xác nhận xóa: mật khẩu (nếu có) hoặc chọn lại tài khoản Google (nếu chỉ có Google) + tick "Tôi hiểu…" + gõ lại email |
| D10 | Không có tải dữ liệu |
| D11 | Đang tự gia hạn thì không cho xóa; thêm nút **"Hủy gói"** (= hủy gia hạn cuối kỳ); đã hủy gia hạn thì xóa được, mất ngày còn lại, không hoàn tiền |
| D12 | Không giữ dấu "đã dùng thử" |
| D13 | Một thư "tài khoản đã được xóa" khi xong |
| D14 | Báo lỗi: giữ, mã ẩn danh, xóa ghi chú; báo lỗi về câu làm từ câu người học tự viết thì xóa hẳn |
| D15 | Giao dịch: giữ với mã ẩn danh, xóa sự kiện thanh toán thô; xóa khi quá N năm, N là cài đặt (mặc định 10) |
| D16 | Sổ lượt: giữ với mã ẩn danh |
| D17, D18 | Chỉ admin xóa tài khoản người khác (gõ lại email); nhân sự không tự xóa; admin không tự xóa mình; không xóa admin cuối; "ai đã làm" hiện "Người dùng đã xóa" |
| D19 | Tự xóa tài khoản chưa xác nhận email sau N ngày, N là cài đặt (mặc định 7) |
| D20 | Trang web xin xóa cho Google Play: để tới khi làm app Android |
| D21 | Bảng `deleted_accounts` (mã tài khoản, thời điểm) để chạy lại việc xóa sau khi khôi phục backup; thời hạn backup chốt ở Deploy |
| D22 | Web đi tới Google bằng chuyển trang qua API |
| D23 | Xóa trong request; lỗi thì "đang xóa" và việc định kỳ thử lại |
| D24 | Đọc `users.status` mỗi request, chặn cả `locked` và `deleting` |

## 3. Phạm vi

**Làm:**
- API: đăng nhập Google (bắt đầu, quay về, hoàn tất đăng ký), xác nhận lại bằng Google, chặn tài khoản theo trạng thái mỗi request, xóa tài khoản (người học tự xóa, admin
  xóa, tự dọn tài khoản chưa xác nhận), bộ xóa của từng module, `deleted_accounts` và lệnh chạy lại, hủy gia hạn cho người học, hai cài đặt mới, hai thư mới, việc định kỳ
  thử lại xóa và xóa giao dịch quá hạn.
- Web người học: nút "Tiếp tục với Google" ở đăng nhập và đăng ký, màn hoàn tất đăng ký Google, dòng "Đăng nhập bằng", luồng xóa tài khoản, trang "Đã xóa", nút "Hủy gói".
- Admin: nút "Xóa tài khoản" ở chi tiết người dùng, nhãn cách đăng nhập, nhãn "Đang xóa", chữ "Người dùng đã xóa" thống nhất, hai cài đặt mới.
- Google giả cho CI và smoke; script `pnpm smoke:buoc-8`.

**Không làm:** Sign in with Apple và đăng nhập Google trên app điện thoại (Flutter chưa có; ghi vào việc trước ra mắt); gắn / gỡ Google bằng tay (D8); tải dữ liệu (D10);
trang web xin xóa cho Google Play (D20); backup và thời hạn backup (Deploy, D21); hoàn tiền (D11); nhà cung cấp thanh toán thật (vẫn chỉ có bản giả); đổi email.

## 4. Kiến trúc

```
Web người học                API (Identity)                              Google
─────────────                ──────────────                              ──────
[Tiếp tục với Google] ──GET /v1/auth/google/start──► tạo state, nonce, PKCE
                                                     cookie google_oauth ──302──► màn chọn tài khoản
                     ◄──302 /{locale}/app…──── GET /v1/auth/google/callback ◄── code
                                                     đổi code, kiểm ID token (JWKS)
                                                     ├─ đã có danh tính → tạo phiên, cookie refresh_token
                                                     ├─ trùng email (K8) → gắn danh tính, tạo phiên
                                                     └─ người mới → cookie google_signup (15 phút)
/app/google/complete ──POST /v1/auth/google/complete──► tạo user + danh tính + phiên

[Xóa vĩnh viễn] ──POST /v1/me/account/delete──► AccountDeletionService (Identity)
                                                  tx A: status = deleting, thu hồi phiên
                                                  tx B: AccountErasers (Practice → Learning → Content → Notifications
                                                        → Entitlements → AI → Common) rồi xóa users, ghi deleted_accounts
                                                  sau commit: thư "đã xóa"
```

- Module boundary giữ nguyên (D3 Bước 0): mỗi module tự xóa bảng của mình qua một **bộ xóa** (`AccountDataEraser`) đăng ký vào registry của Identity; Identity không đụng
  bảng module khác. Registry **fail closed** như `EntryUsageRegistry` (`content/catalog/entry-usage.ts:18,39-43`): thiếu bộ xóa của một module bắt buộc thì việc xóa lỗi,
  không bỏ qua lặng lẽ như port `@Optional()` (`quick-add.service.ts:50,92`). **Đề xuất.**
- Google chỉ nói chuyện với API (D22). Web không nạp script nào của Google, nên CSP của web (`apps/web/src/lib/csp.ts`) **không đổi**: nút là một link chuyển trang.

## 5. Đăng nhập Google

### 5.1 Việc của chủ dự án trên Google Cloud (trước "Xong khi", D4)

1. Tạo project trên Google Cloud, mở Google Auth Platform, màn đồng ý ở chế độ **Testing**, loại "External", scope `openid`, `email`, `profile`.
2. Thêm Gmail của anh/chị (và Gmail thử khác nếu muốn) vào danh sách test user (tối đa 100).
3. Tạo OAuth client loại **Web application**, địa chỉ quay về `http://localhost:3000/v1/auth/google/callback`.
4. Chép client id và secret vào `apps/api/.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Không tốn tiền.

Plan viết lại bước này thành hướng dẫn có ảnh ở `docs/deliveries/buoc-8-test-flow.md`.

### 5.2 Cấu hình API (Đề xuất)

| Biến | Ý nghĩa |
|---|---|
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth client. Thiếu cả hai và không bật bản giả → nút Google trả lỗi `google-unavailable`, phần còn lại của app chạy bình thường |
| `GOOGLE_REDIRECT_URI` | Mặc định `<API>/v1/auth/google/callback`; phải trùng đúng địa chỉ khai trên Google Cloud |
| `OAUTH_COOKIE_KEY` | Khóa AES-256-GCM mã hóa cookie `google_oauth`, `google_signup`, `google_reauth` (sinh bằng `node scripts/gen-secret.mjs`) |
| `GOOGLE_FAKE_ENABLED` | Google giả cho CI và smoke (§5.8); **không bao giờ chạy ở production**, như `BILLING_FAKE_ENABLED` (`app-config.ts:90-94`) |

### 5.3 Bắt đầu: `GET /v1/auth/google/start?intent=login&locale=vi&next=/app/groups` (Đề xuất)

- Route `@Public`, giới hạn theo IP (`auth.google.ip`, 20/phút). `next` chỉ nhận đường dẫn bắt đầu bằng `/app` (chống chuyển hướng ra ngoài).
- Sinh `state`, `nonce`, `code_verifier` (PKCE S256), lưu trong cookie `google_oauth` mã hóa: `HttpOnly`, `Secure`, `SameSite=Lax`, `path=/v1/auth/google`, sống 10 phút.
  `Lax` là bắt buộc: Google đưa trình duyệt quay về bằng một chuyển trang từ trang khác, và cookie `Strict` không được gửi trong trường hợp đó.
- 302 tới màn đăng nhập Google với `response_type=code`, `scope=openid email profile`, `state`, `nonce`, `code_challenge`, `prompt=select_account`.

### 5.4 Quay về: `GET /v1/auth/google/callback?code=…&state=…`

1. Đọc và xóa cookie `google_oauth`; `state` không khớp hoặc hết hạn → về web với `error=google-failed`.
2. Đổi `code` lấy token ở Google (client secret + `code_verifier`), timeout 10 giây (spec IE15).
3. Kiểm ID token bằng `jose` 6.2.12 (`createRemoteJWKSet` với địa chỉ JWKS của Google, đã có trong repo): chữ ký, `iss` ∈ {`accounts.google.com`,
   `https://accounts.google.com`}, `aud` = client id, `exp`, `nonce`. `email_verified` khác `true` → `error=google-email-unverified` (IR8).
4. Quyết định (khóa theo `sub`, không theo email; IR8, IE4):

| Tình huống | Làm gì |
|---|---|
| Có danh tính `(google, sub)` | Lấy người dùng đó. `locked` → `error=account-locked`; `deleting` → `error=google-failed` (như mọi đăng nhập của tài khoản đang xóa, IE11) |
| Không có danh tính; có người dùng cùng email **đã xác minh** | Gắn danh tính vào người đó (K8), gửi thư "Google đã được liên kết" (IR22) |
| Không có danh tính; có người dùng cùng email **chưa xác minh** | IR9 (b): xóa mật khẩu của người đó, thu hồi mọi phiên, đánh dấu đã xác minh, gắn danh tính; giữ dữ liệu |
| Không có ai | Người mới: cookie `google_signup` (mã hóa: `sub`, email, `given_name`, `family_name`, `picture`, hạn 15 phút; `SameSite=Lax`, `path=/v1/auth/google`), 302 tới `/{locale}/app/google/complete`. **Không ghi gì vào DB** (D6) |

5. Đăng nhập được → tạo chuỗi phiên `client='web'`, `auth_method='google'` (§5.7), đặt cookie `refresh_token` như đăng nhập mật khẩu (`session-transport.ts:13-15`), 302 tới
   `LEARNER_APP_URL/{locale}{next}`. Web gọi `/v1/auth/refresh` như khi tải lại trang và có phiên.
6. Mọi lỗi → 302 tới `/{locale}/app/login?error=<mã>`; trang đăng nhập hiện câu tương ứng. Không tạo tài khoản dở dang khi Google chậm hay lỗi (IE15).

`ASSUMPTION` (kiểm trong lần đăng nhập thật của D4): trình duyệt nhận cookie `refresh_token` (`SameSite=Strict`) đặt ở phản hồi của một chuyển trang bắt đầu từ Google, và
gửi nó ở lần gọi `/v1/auth/refresh` ngay sau đó từ web (cùng site).

### 5.5 Hoàn tất đăng ký: `POST /v1/auth/google/complete` (D6, D7)

- Cần cookie `google_signup` còn hạn và header `X-CSRF-Protection: 1` (như các route đọc cookie, `session-transport.ts:39-43`).
- Body: `birth_date`, `accept_terms: true`, `timezone`, và `given_name`, `family_name` **chỉ khi** phiếu không có tên. Kiểm như đăng ký: dưới 13 tuổi → 400
  `age-below-minimum` (`auth.service.ts:52`), xóa cookie, không lưu gì.
- Trong một transaction: email đã có người (đăng ký song song) → 409 `email-taken`; còn không thì tạo `users` (`email_verified_at` = bây giờ, tên từ phiếu hoặc body,
  `avatar_url` = `picture`, `terms_*`), `user_identities`, chuỗi phiên Google; đặt cookie `refresh_token`; xóa `google_signup`. Trả về như đăng nhập web.
- Sau đó web đưa Minh qua màn "Chào mừng" chọn tiếng mẹ đẻ như mọi tài khoản mới (`RequireSession.tsx:78-80`).

### 5.6 Đăng ký bằng mật khẩu vào email của tài khoản Google (D8)

Không đổi code: tài khoản Google luôn đã xác minh (K7), đăng ký vào email đã xác minh trả 409 `email-taken` (`auth.service.ts:78`), trang đăng ký đã có dòng nhắc "Quên mật
khẩu" (A5). Tài khoản chỉ có Google làm "Quên mật khẩu" xong thì có thêm mật khẩu (IR7). Đăng nhập mật khẩu vào tài khoản chỉ có Google trả lỗi chung (IE5, đã có:
`auth.service.ts:117-121`).

### 5.7 Phiên Google và route admin (D5; Đề xuất)

- Thêm cột `session_chains.auth_method` (`password` | `google`, mặc định `password` cho mọi chuỗi cũ).
- `PermissionGuard` (`staff/permission.guard.ts:29-35`), vốn đã đọc chuỗi phiên mỗi request, từ chối chuỗi `google` bằng 403 `password-login-required`. Trang đăng nhập
  admin không có nút Google, nên Hà (editor) chỉ vào admin bằng mật khẩu; Hà đăng nhập Google ở `/app` vẫn học bình thường.
- Gia hạn và đổi mật khẩu giữ `auth_method` của chuỗi; đổi mật khẩu chuyển thiết bị sang chuỗi mới (IR14) với `auth_method='password'`.

### 5.8 Google giả (CI, smoke; Đề xuất)

`GOOGLE_FAKE_ENABLED=true` thay địa chỉ của Google bằng ba route chỉ có khi bật: trang "chọn tài khoản" giả nhận `email`, `sub`, `name`, `email_verified` qua query (smoke và
e2e truyền vào), endpoint đổi code và JWKS ký bằng một khóa sinh lúc khởi động. Luồng API (§5.3–5.5) chạy y hệt, chỉ khác địa chỉ. API từ chối khởi động nếu bật bản giả
khi `NODE_ENV=production`.

### 5.9 Xác nhận lại bằng Google trước khi xóa (D25)

Web giữ access token trong bộ nhớ nên một chuyển trang không mang được nó. Vì vậy (Đề xuất):
1. Web gọi `POST /v1/auth/google/reauth` (cần Bearer) → API trả `start_url` chứa một vé ký 2 phút mang `user_id`.
2. Web chuyển trang tới `start_url`; API bắt đầu như §5.3 với `intent=reauth`, `prompt=select_account`, `login_hint=<sub của Lan>`.
3. Ở callback: `sub` phải là danh tính Google của đúng `user_id` trong vé; đúng thì đặt cookie `google_reauth` (mã hóa: `user_id`, hạn 5 phút, `path=/v1/me/account`,
   `SameSite=Lax`) và 302 về `/{locale}/app/settings/delete-account?reauth=ok`; sai tài khoản → `?reauth=wrong-account`.

Giới hạn đã biết (D25): nếu trình duyệt đang đăng nhập Google sẵn, bước này chỉ là một lần bấm chọn tài khoản, không hỏi mật khẩu Google.

## 6. Chặn tài khoản theo trạng thái mỗi request (D24)

- `AuthGuard` (`auth.guard.ts:15-27`), sau khi token hợp lệ, đọc `users.status` theo khóa chính. Không có hàng, `locked` hoặc `deleting` → 401 `invalid-token`; web đã coi
  401 là hết phiên và đưa về trang đăng nhập. Route `@Public` có token hỏng vẫn coi như ẩn danh như hiện nay.
- Một lần đọc theo khóa chính mỗi request đã đăng nhập (**Đề xuất**: không cache). Bịt luôn kẽ hở "bị khóa vẫn dùng được tới 15 phút" ghi ở code facts §3.
- `users.status` CHECK đổi thành `('active', 'locked', 'deleting')`; thêm `users.deleting_since` (timestamptz, null).

## 7. Xóa tài khoản

### 7.1 Ai xóa được ai

| Người bấm | Xóa ai | Điều kiện | Xác nhận |
|---|---|---|---|
| Người học (không vai trò) | Chính mình | Không có gói **đang tự gia hạn** (D11) | Tick + gõ email + mật khẩu, hoặc cookie `google_reauth` nếu không có mật khẩu (D9, D25) |
| Nhân sự (`admin`, `editor`) | — | Không tự xóa được (D18): dòng "Xóa tài khoản" ghi "Liên hệ admin", API trả 409 `staff-account` | — |
| Admin (`roles.manage`) | Người khác, kể cả nhân sự | Không phải chính mình; không phải admin cuối (cùng luật với `setStaffRole`, `staff.service.ts:336-338`) | Gõ lại email (D17) |
| Việc định kỳ | Tài khoản chưa xác nhận email quá N ngày (D19) | §7.6 | — |

Admin xóa người học đang có gói tự gia hạn (**Đề xuất**, khác D11 vốn chỉ nói người học tự xóa): app tự tắt gia hạn như khi cấp Pro (`grants.service.ts:384-396`) rồi xóa;
hộp xác nhận nói rõ. Lý do: admin xóa theo yêu cầu của người không vào được app, nên người đó không tự hủy gói được.

### 7.2 Thứ tự (SR11, IR18, D23)

1. **Kiểm** (ngoài transaction): điều kiện ở §7.1; email gõ lại khớp (so sau khi chuẩn hóa như `normalize-email.ts:3`); mật khẩu đúng hoặc `google_reauth` đúng người.
   Giới hạn: `user.write` (30/phút) như các route ghi khác, cộng `auth.delete.user` 5/giờ để chặn dò mật khẩu.
2. **Tx A** (khóa `identity.user:<id>`): kiểm lại điều kiện; `status='deleting'`, `deleting_since=now`; thu hồi mọi chuỗi phiên (`revoke_reason='account-deleted'`); vô hiệu
   OTP. Commit. Từ đây mọi request của người đó bị từ chối (§6).
3. **Tx B**: sinh **một mã ẩn danh** ngẫu nhiên (uuid) cho lần xóa này; gọi lần lượt bộ xóa của từng module theo thứ tự ở §7.3, truyền `(tx, userId, anonId)`; cuối cùng
   Identity ghi `deleted_accounts` và xóa hàng `users` (cascade: mật khẩu, chuỗi phiên, refresh token, OTP, `user_identities`). Commit. Mã ẩn danh **không** được lưu ở đâu
   nối với `userId`.
4. **Sau commit:** thư "tài khoản đã được xóa" tới email lấy ra ở bước 1 (D13; qua `MailDispatcher.afterResponse`, tính vào ngân sách thư như mọi thư). Việc định kỳ dọn
   tài khoản chưa xác nhận **không** gửi thư.
5. Trả 204. Web xóa phiên trong bộ nhớ và chuyển tới trang `/{locale}/account-deleted` (ngoài `/app`).

**Tx B lỗi:** tài khoản ở `deleting`, request trả 202 `deletion-pending` (web vẫn chuyển sang trang "Đã xóa", trang này ghi "đang hoàn tất, có thể mất tới một giờ"). Việc
định kỳ `identity.deletion-retry` (đăng ký vào `MaintenanceScheduler` mỗi giờ) chạy lại Tx B cho mọi tài khoản `deleting`, dưới khóa advisory theo người để không chạy hai
lần cùng lúc (code facts §9: scheduler có thể chạy ở cả API lẫn worker, `CHƯA KIỂM`). Quá 24 giờ vẫn `deleting` → log `account_deletion_stuck` mức cảnh báo.

### 7.3 Xóa gì, giữ gì (thay câu "chỉ giữ số liệu tổng hợp" của SR11)

Thứ tự gọi bộ xóa: Practice → Learning → Content → Notifications → Entitlements → AI → Common → Identity (cuối). Practice trước Learning và Content vì
`practice_session_items.question_id` là FK RESTRICT (code facts §2) và Practice đọc sense riêng của người học. **Đề xuất** thứ tự; plan kiểm khóa advisory theo đúng thứ tự
đã ghi ở code facts §3.

| Module | Xóa | Giữ (với mã ẩn danh hoặc như cũ) | Nguồn |
|---|---|---|---|
| Practice | `practice_session_items`, `practice_questions`, `practice_sessions`, `practice_ai_requests`, `practice_word_checks` của người đó | `practice_reports`: `user_id` = mã ẩn danh, `note` = null; **xóa** báo lỗi có câu làm từ câu người học tự viết (phiên `cloze_source='own'`; item đã dọn thì đọc bản chụp, plan kiểm) | D14, Bước 4 §15, Bước 7 §19 |
| Learning | `learning_groups`, `learning_items`, `learning_log` | — | SR11 |
| Content | Từ riêng (`entries.owner_user_id`, xóa qua `deletePrivateEntryContent`, cascade nghĩa, bản sửa, câu), `context_sentences` của người đó | `sense_revisions.created_by` / `reviewed_by` / `published_by`, `senses.state_changed_by`, `word_form_additions.added_by` của nhân sự: giữ id trơ | D18 |
| Notifications | `reminder_prefs`, `reminder_deliveries` | — | SR11 |
| Entitlements | `entitlement_grants` (+ `entitlement_grant_changes` cascade) của người nhận, `subscriptions`, `billing_events` (cả `payload`, `raw_payload`), `trial_history`, `entitlement_notices`, `fake_billing_subscriptions` | `usage_records`: `user_id` = mã ẩn danh (D16); `billing_transactions`: `user_id` = mã ẩn danh (D15); `granted_by`, `revoked_by`, `changed_by` của nhân sự: id trơ | ER16, D12, D15, D16, D18 |
| AI | `ai_call_contents` của các lời gọi của người đó, `ai_operations` | `ai_calls`: `user_id` = null (Bước 6, `deleteUserData`) | B6E68 |
| Common | `idempotency_keys` của người đó | `rate_limit_counters` tự hết sau 24 giờ | — |
| Settings, Pipeline, AI (cột "ai đã làm") | — | `updated_by`, `changed_by`, `created_by`, `started_by`, `saved_by`: id trơ | D18 |
| Identity | `users` (cascade 5 bảng) | `deleted_accounts(user_id, deleted_at, by)` với `by` ∈ `self` / `admin` / `cleanup` | D21 |

Màn cảnh báo (§9.4) và chính sách riêng tư dùng **một** bản chữ dựng từ bảng này. Chính sách riêng tư cần thêm: link ảnh Google (D7), hồ sơ thanh toán giữ N năm (D15),
thời hạn backup (Deploy). Ghi vào `deploy-checklist.md`.

### 7.4 Bộ xóa của module (Đề xuất)

```ts
// apps/api/src/identity/deletion/account-eraser.ts
export interface AccountDataEraser {
  readonly module: 'practice' | 'learning' | 'content' | 'notifications' | 'entitlements' | 'ai' | 'common';
  erase(tx: Prisma.TransactionClient, userId: string, anonId: string): Promise<void>;
}
```

- Mỗi module tự đăng ký ở `onModuleInit` như các probe dùng từ (`learning/entry-usage.probe.ts:15-17`). `REQUIRED_ACCOUNT_ERASERS` liệt kê đủ bảy; thiếu một → lỗi ngay ở lần
  xóa đầu và ở test khởi động.
- `AiService.deleteUserData` đổi để nhận `tx`; CLI `ai:fake-call delete-user-data` dùng bản mới.
- Một test "mọi cột trỏ tới người dùng đều có chủ" đọc `apps/api/prisma/models/*.prisma`, liệt kê mọi cột tên `user_id`, `*_user_id`, `*_by` và so với một bảng khai báo
  "xóa / mã ẩn danh / id trơ"; thêm cột mới mà không khai báo thì test đỏ. Chống quên khi các bước sau thêm bảng.

### 7.5 Chạy lại sau khi khôi phục backup (D21)

`pnpm accounts:replay-deletions` (trong `apps/api`): với mọi `user_id` trong `deleted_accounts` mà bảng `users` vẫn còn hàng, chạy lại §7.2 bước 2–3, không gửi thư. Ghi vào
`deploy-checklist.md` ở mục backup: "sau mọi lần khôi phục, chạy lệnh này trước khi mở app".

### 7.6 Dọn tài khoản chưa xác nhận email (D19)

Việc định kỳ `identity.unverified-cleanup` (mỗi giờ): chọn tài khoản `email_verified_at` null, `status='active'`, không vai trò, `updated_at` cũ hơn N ngày (cài đặt
`identity.unverified_cleanup_days`). Dùng `updated_at` vì đăng ký lại vào email chưa xác nhận ghi đè dữ liệu và đặt lại mốc (`auth.service.ts:66-71`). Chạy §7.2 bước 2–3 với
`by='cleanup'`, tối đa 200 tài khoản mỗi lần, không thư.

### 7.7 Giao dịch quá hạn (D15)

Việc định kỳ `billing.transactions-expire` (mỗi ngày): xóa `billing_transactions` có `occurred_at` trước ngày 1/1 của năm (năm hiện tại − N) theo giờ Việt Nam, N = cài đặt
`entitlements.transaction_retention_years`. Áp cho **mọi** giao dịch, không chỉ của người đã xóa (**Đề xuất**: luật chỉ buộc giữ ít nhất N năm; giữ lâu hơn không có lý do).

## 8. Hủy gói (D11)

### 8.1 API (Đề xuất)

`POST /v1/me/subscriptions/{id}/cancel` (cần `Idempotency-Key` như các lệnh ghi khác):
- Gói phải của người gọi, `status` ∈ (`trialing`, `active`), `cancel_at_period_end = false`; không thì 409 `subscription-not-cancellable`.
- Gọi `cancelAtPeriodEnd` của bộ nối (`billing-adapter.ts:40`), không giữ khóa khi gọi (R6 Bước 5), timeout như `turnOffPaidRenewals` (`grants.service.ts:384-396`). Bộ nối
  không hỗ trợ (sau này: gói mua qua App Store / Google Play) → 409 `cancel-in-store`.
- Thành công → 202. `subscriptions.cancel_at_period_end` đổi khi nhà cung cấp báo lại sự kiện `cancel_scheduled` (`subscription-machine.ts:164-169`), như mọi thay đổi khác.
- Bộ nối giả hiện chỉ ghi cờ ở bảng của nó (`fake-billing.adapter.ts:61-66`). Bước 8 cho nó phát thêm một sự kiện `cancel_scheduled` qua đường webhook giả, để luồng chạy
  thử được từ đầu tới cuối.

### 8.2 Màn (trang Gói của người học)

- Đang Pro tự gia hạn: "Gia hạn ngày 12/11/2026 · [Hủy gói]". Hộp xác nhận: "Gói vẫn dùng tới hết 12/11/2026, sau đó không gia hạn. Không hoàn tiền cho thời gian còn lại."
- Sau khi hủy: "Gói kết thúc ngày 12/11/2026". Trong lúc chờ nhà cung cấp báo lại, màn hiện "Đã gửi yêu cầu hủy gia hạn" và tải lại trạng thái.
- Gói staff cấp: không có nút (không tự gia hạn).

## 9. Màn web người học (D2)

### 9.1 Đăng nhập, đăng ký

- Thay `GoogleSoon` (`AuthCard.tsx:76-88`) bằng link "Tiếp tục với Google" tới `${API}/v1/auth/google/start?intent=login&locale=<locale>&next=<next>`. Giữ ở cả hai trang.
- `?error=` trên trang đăng nhập → câu tương ứng: `google-failed` "Không đăng nhập được bằng Google. Thử lại.", `account-locked` (câu đã có), `google-email-unverified`
  "Email Google này chưa được xác minh.", `google-unavailable` "Đăng nhập bằng Google đang tạm tắt."

### 9.2 Hoàn tất đăng ký Google: `/[locale]/app/google/complete`

Dùng lại thành phần của `CompleteProfile.tsx` (ngày sinh, ô đồng ý), thêm ô họ / tên khi API báo phiếu thiếu tên (`GET /v1/auth/google/complete` trả `{ email, needs_name }`,
**Đề xuất**). Nút "Tạo tài khoản". Dưới 13 tuổi: câu đã có của đăng ký, rồi về trang đăng nhập. Phiếu hết hạn: "Phiên đăng ký đã hết hạn" + nút Google lại.

### 9.3 Cài đặt

- Dòng chỉ đọc "Đăng nhập bằng: Mật khẩu · Google" (từ `GET /v1/me`, thêm `sign_in_methods: ['password','google']`; D8).
- Dòng "Xóa tài khoản" thay `ComingSoon` (`SettingsPage.tsx:176`): người học → link tới `/app/settings/delete-account`; nhân sự → chữ "Liên hệ admin để xóa tài khoản".

### 9.4 Xóa tài khoản: `/[locale]/app/settings/delete-account`

1. **Những gì bị xóa** (dữ liệu học, từ riêng, câu tự viết, gói, phiên đăng nhập) và **những gì còn giữ** (hồ sơ thanh toán N năm không kèm tên; báo lỗi không kèm tên; số liệu
   tổng hợp). Dựng từ §7.3.
2. Có gói tự gia hạn → khối chặn: "Bạn đang có gói Pro tự gia hạn. Hủy gói trước khi xóa tài khoản." + link tới trang Gói. Không hiện phần dưới.
3. Ô tick "Tôi hiểu dữ liệu sẽ mất và không khôi phục được"; ô "Gõ lại email của bạn"; ô mật khẩu, hoặc nút "Xác nhận bằng Google" (§5.9) khi không có mật khẩu.
4. Nút đỏ "Xóa vĩnh viễn" (bấm được khi đủ ba ô). Lỗi mật khẩu sai: câu chung như đăng nhập.
5. Trang `/[locale]/account-deleted`: "Tài khoản của bạn đã được xóa." (202: "đang hoàn tất…").

### 9.5 Trang Gói: nút "Hủy gói" (§8.2)

Toàn bộ chữ vi và en; dùng token chung `packages/design-tokens`.

## 10. Màn admin (D2, D17, D18)

- **Chi tiết người dùng** (`features/users/UserDetail.tsx`): nút "Xóa tài khoản" (chỉ `roles.manage`; ẩn khi xem chính mình và khi người đó là admin cuối). Hộp xác nhận: tên,
  email, vai trò, "Gõ lại email để xác nhận", và nếu có gói tự gia hạn: "Gói tự gia hạn sẽ được tắt". Gọi `DELETE /v1/admin/users/{id}` với body `{ confirm_email }`.
  Xong → về danh sách, thông báo "Đã xóa tài khoản".
- **Nhãn cách đăng nhập** ở danh sách và chi tiết: "Mật khẩu", "Google" (API thêm `sign_in_methods` vào phản hồi người dùng của admin).
- **Nhãn "Đang xóa"** cho tài khoản `deleting` (hiếm; chỉ khi Tx B lỗi).
- **"Người dùng đã xóa"**: các chỗ hiện người thao tác khi id không còn tài khoản đang dùng ba chữ khác nhau (`messages/vi.json:85` "Không rõ người dùng", `:1391`, `:1597`);
  thống nhất thành "Người dùng đã xóa" / "Deleted user" (D18).
- **Cài đặt hệ thống**: hai ô mới (§11).

## 11. Cài đặt mới (D15, D19; Đề xuất về khoảng)

| Nhóm | Tên (API) | Mặc định | Khoảng | Tab ở admin |
|---|---|---|---|---|
| `identity` (mới) | `unverified_cleanup_days` | 7 | 1–365 | Tab mới "Tài khoản" |
| `entitlements` | `transaction_retention_years` | 10 | 5–30 | Tab gói có sẵn; dòng giải thích "Luật Kế toán: tối thiểu 5–10 năm tùy loại chứng từ" |

Đổi như mọi cài đặt (`settings.manage`, có lịch sử thay đổi). Tối thiểu 5 năm để admin không lỡ tay xóa hồ sơ mà luật còn buộc giữ.

## 12. Dữ liệu (Đề xuất)

| Bảng | Đổi |
|---|---|
| `users` | CHECK `status` thêm `deleting`; thêm `deleting_since timestamptz null`, `avatar_url varchar(2048) null` |
| `user_identities` (mới, Identity) | `id`, `user_id` FK → `users` ON DELETE CASCADE, `provider` (`google`), `subject` (varchar 255), `created_at`; unique `(provider, subject)`, unique `(user_id, provider)` |
| `session_chains` | thêm `auth_method varchar(16) not null default 'password'`, CHECK `('password','google')` |
| `deleted_accounts` (mới, Identity) | `user_id uuid` PK (không FK), `deleted_at timestamptz`, `by varchar(16)` CHECK `('self','admin','cleanup')` |
| `app_settings` | nhóm `identity` mới; khóa mới ở `entitlements` |

Không đổi cấu trúc các bảng module khác: cột `user_id` bắt buộc nhận mã ẩn danh, cột "ai đã làm" giữ id trơ (D16, D18).

## 13. API (tóm tắt)

| Route | Ai gọi | Mục |
|---|---|---|
| `GET /v1/auth/google/start` | Công khai | §5.3 |
| `GET /v1/auth/google/callback` | Google | §5.4 |
| `GET /v1/auth/google/complete`, `POST /v1/auth/google/complete` | Cookie `google_signup` | §5.5, §9.2 |
| `POST /v1/auth/google/reauth` | Người học đã đăng nhập | §5.9 |
| `POST /v1/me/account/delete` | Người học (không vai trò) | §7 |
| `DELETE /v1/admin/users/{id}` | `roles.manage` | §7, §10 |
| `POST /v1/me/subscriptions/{id}/cancel` | Người học | §8 |
| `GET /v1/me`, `GET /v1/admin/users…` | — | Thêm `sign_in_methods`; admin thêm `status` `deleting` |

Lỗi mới (Problem Details): `google-failed`, `google-unavailable`, `google-email-unverified`, `password-login-required`, `staff-account`, `subscription-renewing`,
`confirm-email-mismatch`, `reauth-required`, `self-delete`, `last-admin`, `deletion-pending` (202), `subscription-not-cancellable`, `cancel-in-store`. Admin và web thêm các mã này vào danh sách lỗi đã biết
(`apps/admin/src/api/problem.ts`, chỗ tương ứng ở web).

## 14. Thư mới (D13, IR22)

Theo khuôn của `identity/mailer/templates.ts` (chữ thường, vi rồi en trong một thư):
- `accountDeletedMail`: "Tài khoản Wordmet của bạn đã được xóa ngày …" + một dòng "những gì còn giữ" (hồ sơ thanh toán N năm).
- `googleLinkedMail`: "Tài khoản Google đã được liên kết với tài khoản Wordmet của bạn. Không phải bạn? Đổi mật khẩu ngay." (IR22, đã chốt từ spec).

## 15. Edge cases (When → Then)

| # | Khi | Thì |
|---|---|---|
| B8E1 | `state` ở callback khác cookie, hoặc cookie `google_oauth` đã hết hạn | Về đăng nhập với `google-failed`; không gọi Google đổi code |
| B8E2 | ID token sai chữ ký, sai `aud`, sai `iss`, hết hạn, sai `nonce` | `google-failed`; không tạo hay gắn gì (I13) |
| B8E3 | `email_verified` false | `google-email-unverified` (I13) |
| B8E4 | Google chậm quá 10 giây hoặc lỗi khi đổi code | `google-failed`; không tạo tài khoản dở dang (IE15) |
| B8E5 | Lan (mật khẩu, đã xác minh) bấm Google cùng email lần đầu | Gắn danh tính vào Lan, thư "Google đã được liên kết", vào app với tài khoản cũ (K8, I14) |
| B8E6 | Một người đăng ký mật khẩu `minh@gmail.com` rồi bỏ đó chưa xác minh; Minh thật bấm Google cùng email | Mật khẩu kia bị xóa, mọi phiên bị thu hồi, tài khoản được đánh dấu đã xác minh và gắn Google; dữ liệu giữ (K8, IR9, I15) |
| B8E7 | Lan đổi email trên Google rồi đăng nhập | Vẫn tìm thấy Lan theo `sub`; email trong app không đổi (IE4) |
| B8E8 | Minh bấm Google, đóng tab, 20 phút sau mở `/app/google/complete` | Phiếu hết hạn: "Phiên đăng ký đã hết hạn" + nút Google lại; không có gì trong DB |
| B8E9 | Minh nhập ngày sinh dưới 13 tuổi | 400 `age-below-minimum`; phiếu bị xóa; không có gì trong DB (D6) |
| B8E10 | Hai tab cùng hoàn tất đăng ký Google, hoặc ai đó đăng ký mật khẩu cùng email ngay trước | Một tab tạo được; tab kia 409 `email-taken` (khóa theo email trong transaction) |
| B8E11 | Tài khoản bị khóa đăng nhập Google | `account-locked`; không tạo phiên (khóa của admin chặn mọi cách đăng nhập; khóa vì sai mật khẩu 10 lần thì không chặn Google, IR6) |
| B8E12 | Hà (editor) đăng nhập Google ở `/app` rồi gọi route admin bằng access token đó | 403 `password-login-required` (D5) |
| B8E13 | Lan bị admin khóa lúc 10:00, điện thoại còn access token tới 10:15 | Request kế tiếp của điện thoại → 401, về trang đăng nhập (D24) |
| B8E14 | Lan bấm xóa trên laptop; 10:05 điện thoại bấm "Lưu từ" | 401; không có từ nào được ghi sau Tx A (D24, S17) |
| B8E15 | Lan bấm xóa khi đang có Pro tự gia hạn | 409 `subscription-renewing`; màn đã chặn trước, API chặn lại lần nữa (D11) |
| B8E16 | Lan đã hủy gia hạn, còn 20 ngày Pro | Xóa được; mất 20 ngày, không hoàn tiền; màn cảnh báo đã nói (D11) |
| B8E17 | Lan gõ email sai một chữ | 400 `confirm-email-mismatch`; không đổi gì |
| B8E18 | Lan nhập sai mật khẩu nhiều lần ở màn xóa | Lỗi chung; sau 5 lần trong một giờ → 429 (`auth.delete.user`) |
| B8E19 | Tài khoản chỉ có Google bấm xóa mà chưa xác nhận Google, hoặc cookie `google_reauth` quá 5 phút | 403 `reauth-required`; màn hiện lại nút "Xác nhận bằng Google" (SE6) |
| B8E20 | Ở bước xác nhận Google, Lan chọn một tài khoản Google khác | `?reauth=wrong-account`; không đặt cookie |
| B8E21 | Bấm xóa hai lần (hai tab) | Lần đầu đặt `deleting`; lần hai bị 401 như mọi request của tài khoản đang xóa |
| B8E22 | Tx B lỗi giữa chừng (một module lỗi) | Rollback toàn bộ Tx B; tài khoản ở `deleting`; 202 `deletion-pending`; việc định kỳ thử lại mỗi giờ; quá 24 giờ thì log cảnh báo |
| B8E23 | Thiếu bộ xóa của một module bắt buộc | Tx B lỗi ngay (fail closed); test khởi động đỏ |
| B8E24 | Lan đang có câu AI được tạo trong một request khác lúc Tx A commit | Request đó ghi vào DB trước Tx B thì Tx B xóa; ghi sau thì bị chặn vì người dùng `deleting` (SE1, B7E130) |
| B8E25 | Webhook thanh toán của Lan tới sau khi xóa xong | Ghi `ignored`, lý do `unknown-user` (`event-applier.service.ts:62,99-101`, B5E59) |
| B8E26 | Job nhắc học của Lan còn trong Redis lúc xóa | Lúc chạy không tìm thấy email đã xác minh → bỏ qua (`email.provider.ts:23`) |
| B8E27 | Báo lỗi của Lan đã được staff xác nhận, chưa trả lượt | Báo lỗi giữ với mã ẩn danh; việc trả lượt cho mã ẩn danh không có người nhận → đánh dấu đã xử lý, không trả (Đề xuất; plan kiểm `refunds.ts`) |
| B8E28 | Lan đăng ký lại bằng `lan@gmail.com` hôm sau | Tài khoản mới, id mới, có trial lại trên web (D12) |
| B8E29 | Admin xóa chính mình, hoặc xóa admin cuối | 409 `self-delete` hoặc 409 `last-admin`; nút đã ẩn |
| B8E30 | Hà (editor) gọi `POST /v1/me/account/delete` | 409 `staff-account` (D18) |
| B8E31 | Editor gọi `DELETE /v1/admin/users/{id}` | 403 (không có `roles.manage`) |
| B8E32 | Tài khoản chưa xác nhận đăng ký lại ở ngày thứ 6 | `updated_at` đặt lại; việc dọn đếm lại 7 ngày từ lần đăng ký mới (D19) |
| B8E33 | Admin đổi `unverified_cleanup_days` từ 7 xuống 1 | Lần chạy kế tiếp dọn mọi tài khoản chưa xác nhận quá 1 ngày, tối đa 200 mỗi lần |
| B8E34 | Khôi phục một backup cũ có Lan | `pnpm accounts:replay-deletions` xóa lại Lan (D21) |
| B8E35 | Thư "đã xóa" không gửi được (SMTP lỗi, hết ngân sách thư) | Việc xóa vẫn xong; lỗi được log; không thử lại thư (IR19) |
| B8E36 | Bấm "Hủy gói" hai lần | Lần hai 409 `subscription-not-cancellable` khi cờ đã bật, hoặc trả lại kết quả cũ theo `Idempotency-Key` |
| B8E37 | Nhà cung cấp không trả lời khi hủy gói | 503 Problem Details; gói không đổi; Lan thử lại |
| B8E38 | `GOOGLE_FAKE_ENABLED=true` với `NODE_ENV=production` | API không khởi động |
| B8E39 | `next` ở `/v1/auth/google/start` là địa chỉ ngoài app | Bỏ qua, dùng `/app` |

## 16. Acceptance criteria (When → Then)

| # | Khi | Thì |
|---|---|---|
| B8A1 | Minh bấm Google lần đầu, điền ngày sinh hợp lệ và đồng ý | Có tài khoản đã xác minh, tên và ảnh từ Google, danh tính Google; vào màn chọn tiếng mẹ đẻ |
| B8A2 | Lan bấm Google cùng email | Vào đúng tài khoản cũ; nhận thư liên kết; Cài đặt hiện "Mật khẩu · Google" |
| B8A3 | Lan xóa tài khoản (đã hủy gia hạn) với mật khẩu, tick, email đúng | 204; không còn hàng nào mang id của Lan ngoài `deleted_accounts` và các cột "giữ" của §7.3; có dòng sổ lượt và giao dịch mang mã ẩn danh; thư "đã xóa" ở Mailpit |
| B8A4 | Admin xóa một người học | Như B8A3, `deleted_accounts.by='admin'` |
| B8A5 | Tài khoản chưa xác nhận quá 7 ngày | Bị xóa ở lần chạy kế tiếp, `by='cleanup'`, không thư |
| B8A6 | Lan bấm "Hủy gói" | Nhà cung cấp (giả) nhận lệnh; sau sự kiện `cancel_scheduled`, trang Gói hiện "Gói kết thúc ngày …" |
| B8A7 | Một cột mới trỏ tới người dùng được thêm mà không khai báo cách xóa | Test "mọi cột có chủ" đỏ |
| B8A8 | Chủ dự án đăng nhập thật bằng Gmail của mình trên máy (D4) | Vào được `/app`; đăng xuất, đăng nhập lại được; xác nhận Google trước khi xóa chạy được |

## 17. Kiểm thử và "Xong khi" (D4)

- **CI xanh** trên mọi PR (job `api`, `web`, `admin`, `admin-e2e-real`). Unit cho: kiểm ID token (bằng khóa giả), quyết định ở callback (bảng §5.4), từng bộ xóa, registry fail
  closed, test "mọi cột có chủ", guard theo trạng thái, các điều kiện xóa, hủy gói, hai việc định kỳ. Web và admin: unit và e2e mock cho màn mới; `admin-e2e-real` thêm một
  ca admin xóa người học trên stack thật.
- **`pnpm smoke:buoc-8`** trên DB mới, API và worker chạy với `GOOGLE_FAKE_ENABLED=true`, `BILLING_FAKE_ENABLED=true`: đăng ký Google (người mới, dưới 13 tuổi, trùng email),
  gắn K8, xóa bằng mật khẩu, xóa bằng Google, chặn khi đang gia hạn, hủy gói rồi xóa, admin xóa, dọn chưa xác nhận, chạy lại sau "khôi phục" (chèn lại hàng `users` giả), và đếm
  mọi bảng ở §7.3 trước và sau. Kèm `smoke:buoc-4`, `smoke:buoc-5` (cả hai chế độ fetchState), `smoke:buoc-7` để chắc không hỏng bước cũ.
- **Google thật** (D4): chủ dự án làm §5.1; Claude chạy app trên máy, chủ dự án đăng nhập bằng Gmail của mình một lần (B8A8). Kết quả ghi vào `docs/deliveries/buoc-8.md`.
- **Claude chạy thật** trên stack Docker: các luồng web và admin trong trình duyệt, chụp màn.

## 18. Ảnh hưởng tới các bước sau và việc trước ra mắt

Ghi vào `docs/deliveries/deploy-checklist.md`:
- Google Auth Platform: chuyển sang "In production", xin xác minh thương hiệu (trang chủ có link chính sách riêng tư cùng domain; `LEGAL_PAGES_RESEARCH_2026-10-11.md`), thêm
  địa chỉ quay về production. Khi đã xác minh, có thể bật `auth_time` để siết bước xác nhận Google (D25).
- Chính sách riêng tư: ảnh Google, hồ sơ thanh toán N năm, thời hạn backup, những gì còn giữ sau khi xóa (§7.3). Luật sư xác nhận N (D15) và cách giữ báo lỗi.
- Backup: thời hạn (D21) và bước `accounts:replay-deletions` sau mọi lần khôi phục.
- App điện thoại: Google Sign-In qua thư viện Android/iOS và một endpoint nhận ID token; Sign in with Apple trước khi ra iOS (Apple 4.8); trang web xin xóa cho Google Play (D20);
  gói mua qua store thì "Hủy gói" chuyển người dùng sang trang quản lý gói của store.
- Nhà cung cấp thanh toán thật: hỗ trợ `cancelAtPeriodEnd`; xem lại chống dùng thử lại ở phía họ (D12).

## 19. Rủi ro và việc còn mở

- **Cookie qua chuyển trang từ Google** (`ASSUMPTION` ở §5.4): nếu trình duyệt không gửi `refresh_token` ngay sau callback, phương án dự phòng là callback đưa về web kèm
  một mã dùng một lần (60 giây) để web đổi lấy phiên bằng `fetch`. Biết được ở lần chạy thật đầu tiên.
- **Xóa trong một transaction**: người học rất nhiều dữ liệu (hàng chục nghìn dòng `learning_log`) làm request lâu. Chưa đo. Nếu chậm: chuyển sang worker (D23 phương án b).
- **Mã giao dịch nhà cung cấp** vẫn tra ngược ra người mua trên trang của nhà cung cấp; dòng giữ lại là "bỏ tên", không phải ẩn danh tuyệt đối (research §2.4).
- **Báo lỗi về câu tự viết**: cách nhận ra khi item đã bị dọn chưa kiểm (§7.3).
- **Xác nhận Google yếu hơn mật khẩu** khi trình duyệt đang đăng nhập Google sẵn (D25).

## 20. Tài liệu cần cập nhật sau khi duyệt

`CLAUDE.md` (mục Bước 8, trạng thái), `docs/deliveries/buoc-8.md` (plan tóm tắt rồi as-built), `docs/deliveries/deploy-checklist.md` (§18). Spec Identity và system-spec
**không** sửa (chỉ là khung ban đầu; design này là tài liệu chính thức).

## 21. Đề xuất kỹ thuật duyệt cùng design

| Đề xuất | Chọn | Bỏ | Vì sao |
|---|---|---|---|
| Lưu trạng thái OAuth và phiếu đăng ký Google | Cookie mã hóa ở API, có hạn | Bảng DB | Không lưu gì của người chưa xong đăng ký (D6); tự hết hạn |
| Bảng danh tính | `user_identities` riêng | Cột `google_sub` trên `users` | Thêm Apple sau này là thêm dòng (spec "Tiến hóa"); khớp K2 "bảng danh tính tách user" |
| Chặn phiên Google ở admin | Cột `auth_method` trên chuỗi phiên | Claim trong access token | Guard admin đã đọc chuỗi phiên; token cũ không có claim |
| Xóa theo module | Registry fail closed + test "mọi cột có chủ" | Port `@Optional()` | Không bỏ sót bảng một cách lặng lẽ |
| Mã ẩn danh | Một uuid ngẫu nhiên mỗi lần xóa, không lưu nối | `null` | Giữ "số người mỗi ngày" đúng; không sửa cột bắt buộc (D16) |
| Admin xóa người có gói tự gia hạn | Tự tắt gia hạn rồi xóa | Chặn như người học | Người nhờ admin xóa thường không vào được app |
| Giao dịch quá hạn | Xóa mọi giao dịch quá N năm | Chỉ của người đã xóa | Luật buộc giữ tối thiểu, không buộc giữ mãi |
| Cài đặt tối thiểu 5 năm | Có | Cho đặt 1 năm | Tránh xóa hồ sơ luật còn buộc giữ |
