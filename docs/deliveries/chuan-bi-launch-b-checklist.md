# Checklist test lại chuẩn bị launch B (mua Pro một lần bằng payOS, quảng cáo)

Bản để chủ dự án tự kiểm lại những gì đã làm; mỗi milestone đã merge thêm một nhóm. Chi tiết: [`chuan-bi-launch-b.md`](chuan-bi-launch-b.md) (plan tóm tắt và as-built), design [`../superpowers/specs/2026-11-04-chuan-bi-launch-b-design.md`](../superpowers/specs/2026-11-04-chuan-bi-launch-b-design.md), quyết định mà phiên làm đã tự chốt [`chuan-bi-launch-b-m1-rulings.md`](chuan-bi-launch-b-m1-rulings.md).

Mỗi dòng: **điều cần thấy** (Lan là người học), **Kiểm** (lệnh hoặc chỗ bấm), **Đúng là** (kết quả đúng trông ra sao). Thẻ ở đầu dòng:

- **[local]**: làm được trên máy này với payOS giả (`PAYOS_FAKE_ENABLED=true`), không tốn tiền.
- **[smoke]**: `pnpm smoke:buoc-b-payments` đã tự kiểm dòng này (19/19 bước PASS ngày 04/11/2026, output `chuan-bi-launch-b-smoke-output.txt`). Chạy lại được bất cứ lúc nào; cách dựng môi trường nằm ở đầu `apps/api/scripts/smoke-buoc-b-payments.mjs`. Dòng chỉ có thẻ này thì không cần bấm tay.
- **[deploy]**: chỉ kiểm được sau khi deploy, với payOS thật và tiền thật số nhỏ (payOS không có sandbox).

Ô `[ ]` trống là chưa ai bấm tay.

## 0. Chuẩn bị (local)

- [ ] Docker chạy; ở gốc repo: `docker compose up -d` (Postgres 5434, Redis 6380, Mailpit 8025).
- [ ] `apps/api/.env` (tạo theo mục "Local setup" của `CLAUDE.md`) có: `PAYOS_FAKE_ENABLED=true`, `BILLING_FAKE_ENABLED=true`, `BILLING_FAKE_SECRET` (một giá trị từ `node scripts/gen-secret.mjs`), `PROBLEM_TYPE_BASE=http://localhost:3000/problems/` (trang payOS giả dựng đường dẫn từ biến này), `LEARNER_APP_URL=http://localhost:3001`. Ba biến `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` để trống. Đúng là: API khởi động được.
- [ ] Ở `apps/api`: `pnpm db:setup`, `pnpm build`, `pnpm run:dev` (API cổng 3000 và worker).
- [ ] Ở `apps/api`: `pnpm learner:setup -- --admin <email admin> --learner <email Lan>` (mật khẩu cố định của hai tài khoản nằm ở đầu `scripts/learner-test-setup.mjs`). Đúng là: Lan ở gói Miễn phí.
- [ ] PowerShell: đăng nhập hai tài khoản, giữ token cho các dòng dưới.

```powershell
$base = 'http://localhost:3000'
function Login($email, $password) {
  $r = Invoke-RestMethod -Method Post "$base/v1/auth/login" -ContentType 'application/json' -Body (@{ email = $email; password = $password; client = 'web' } | ConvertTo-Json)
  @{ Authorization = "Bearer $($r.access_token)" }
}
$lan   = Login '<email Lan>'   '<mật khẩu>'
$admin = Login '<email admin>' '<mật khẩu>'
function Call($h, $method, $path, $body = $null, $key = [string](New-Guid)) {
  $headers = $h.Clone(); if ($method -eq 'Post') { $headers['Idempotency-Key'] = $key }
  $p = @{ Method = $method; Uri = "$base$path"; Headers = $headers }
  if ($body) { $p.ContentType = 'application/json'; $p.Body = ($body | ConvertTo-Json) }
  Invoke-RestMethod @p
}
```

SQL dùng ở dưới (một dòng một lệnh): `docker compose exec -T postgres psql -U dev -d english_learning -c "<câu SQL>"`.

## M1. Đơn hàng và payOS (API; chưa có màn hình)

Ở M1 chưa có trang mua của web và màn admin "Đơn hàng" (M2): Lan "bấm" bằng PowerShell, trang payOS giả mở bằng trình duyệt. Sau khi bấm "Đã trả" trình duyệt bị chuyển về `http://localhost:3001/vi/app/plans/order?...`, trang này chưa có (404 hoặc không mở được) là bình thường ở M1.

### Giá và tạo đơn

- [ ] **[local] Giá hiện đúng.** Kiểm: `(Call $lan Get '/v1/me/app-config').plans.pro.prices`. Đúng là: 1 tháng 79000, 3 tháng 199000, 12 tháng 599000 (đổi ở admin "Cài đặt hệ thống", ba khóa `pro_price_1m_vnd`, `pro_price_3m_vnd`, `pro_price_12m_vnd`).
- [ ] **[local][smoke bước 1] Lan mua 1 tháng.** Kiểm: `$o = Call $lan Post '/v1/me/orders' @{ period_months = 1; expected_amount = 79000; locale = 'vi' }; $o.checkout_url`, mở `checkout_url` trong trình duyệt, bấm **Đã trả**. Đúng là: trang giả ghi "Order WM… · 79.000 ₫ · status PENDING" rồi, sau khi bấm, trình duyệt bị chuyển đi (xem ghi chú trên); `Call $lan Get "/v1/me/orders/$($o.order_id)"` có `status = paid` và `period` có `starts_at` là lúc vừa bấm, `ends_at` là nửa đêm giờ Việt Nam một tháng sau, rồi tròn tới hết ngày; `(Call $lan Get '/v1/me/entitlements')` có `plan = pro`, một nguồn `kind = prepaid`, `pro_until` bằng `ends_at`.
- [ ] **[local][smoke bước 6] Lan mua 3 tháng và 12 tháng.** Kiểm: như trên với `period_months = 3, expected_amount = 199000` rồi `12` và `599000`. Đúng là: `ends_at` cách `starts_at` đúng 3 hoặc 12 tháng lịch; SQL `SELECT interval, amount_minor FROM billing_transactions WHERE user_id = '<id Lan>'` có dòng `quarter | 199000` (và `year | 599000`, `month | 79000`).
- [ ] **[local][smoke bước 13] Giá đổi giữa lúc Lan đang xem.** Kiểm: `Call $lan Post '/v1/me/orders' @{ period_months = 1; expected_amount = 78000; locale = 'vi' }` (số cũ). Đúng là: lỗi 409 `price-changed` kèm `current_amount = 79000`, không có đơn nào mới (không dòng mới ở `billing_orders`); `period_months = 2` là 400.
- [ ] **[local] Lan bấm hai lần liền (cùng một khóa chống trùng).** Kiểm: `$k = [string](New-Guid); $b = @{ period_months = 1; expected_amount = 79000; locale = 'vi' }; Call $lan Post '/v1/me/orders' $b $k; Call $lan Post '/v1/me/orders' $b $k`. Đúng là: cả hai lần trả cùng một `order_id`; SQL `SELECT count(*) FROM billing_orders WHERE user_id = '<id Lan>'` tăng đúng 1.

### Tiền vào (webhook, trang về, job)

- [ ] **[smoke bước 2] Webhook tới hai lần cho cùng một lần chuyển.** Không bấm tay được (webhook có chữ ký). Đúng là (trong smoke): một dòng `billing_events`, một dòng `billing_order_payments`, một kỳ.
- [ ] **[smoke bước 7] Webhook và trang về cùng xử lý một lần chuyển, năm lần liền.** Đúng là: mỗi lần chỉ một kỳ, một payment, một dòng `billing_transactions`.
- [ ] **[local][smoke bước 4] Webhook tới trễ, trang về tìm thấy tiền trước.** Kiểm: tạo đơn mới, mở `checkout_url`, bấm **Đã trả** ở dòng "Without the webhook" (hoặc thêm `&action=paid&webhook=0` vào cuối đường dẫn): tiền tới payOS giả nhưng webhook không gửi; rồi `Call $lan Post "/v1/me/orders/<order_id>/check"`. Đúng là: đơn `paid`, `SELECT paid_via FROM billing_orders WHERE id = '<order_id>'` ra `reconcile`, một kỳ. Gọi `check` lần hai trong vòng 10 giây: không hỏi payOS lại; đơn của người khác: 404.
- [ ] **[local][smoke bước 6] Webhook không bao giờ tới, job đối soát tìm thấy tiền.** Kiểm: như dòng trên nhưng không gọi `check`; chạy `UPDATE billing_orders SET created_at = now() - interval '10 minutes', checked_at = NULL WHERE id = '<order_id>'` rồi `pnpm maintenance:run` ở `apps/api`. Đúng là: đơn `paid`, `paid_via = reconcile`.
- [ ] **[smoke bước 16, "Review I2"] Trang về đếm tiền trước, webhook tới sau với mã tham chiếu khác.** Không bấm tay được. Đúng là (trong smoke): một kỳ, một dòng `billing_transactions`, hai payment với kết quả `opened-period` rồi `attached`, đơn không có cờ.
- [ ] **[smoke bước 17, "Review I1"] Webhook bị bỏ qua (payOS báo `success: false`), tiền vẫn ở payOS.** Đúng là (trong smoke): sau khi job chạy, đơn sang `needs_review` với lý do `provider-mismatch`, chưa có kỳ nào, để nhân viên xem.
- [ ] **[smoke bước 3] Webhook sai chữ ký, và mẫu thử của payOS.** Đúng là: chữ ký sai trả 400 và không lưu gì; mẫu thử `orderCode 123` trả 200 và bị bỏ qua vì không có đơn nào mang mã đó.

### Trả thiếu, trả lần hai, kỳ nối tiếp

- [ ] **[local][smoke bước 10] Lan trả thiếu rồi trả đủ (đơn 3 tháng).** Kiểm: tạo đơn 3 tháng, mở `checkout_url`, bấm **Trả thiếu** (trả một nửa), xem; rồi bấm **Đã trả**. Đúng là: sau "Trả thiếu" đơn `needs_review` lý do `amount-short`, chưa có kỳ, Lan vẫn ở Miễn phí; sau "Đã trả" đơn `paid`, đúng một kỳ, hai payment.
- [ ] **[local][smoke bước 8] Lan đang Pro mua thêm.** Kiểm: khi Lan còn Pro, tạo đơn 12 tháng và bấm **Đã trả**. Đúng là: kỳ mới bắt đầu đúng lúc kỳ đang chạy kết thúc (`upcoming_periods[0].starts_at` bằng `pro_until` trước đó); `pro_until` là cuối kỳ mới.
- [ ] **[local][smoke bước 8] Lan chuyển tiền lần hai vào đơn đã trả.** Kiểm: đợi hơn 1 giây rồi bấm **Đã trả** lần nữa trên cùng trang. Đúng là: kỳ thứ hai nối sau kỳ thứ nhất, `upcoming_periods` có hai kỳ, ngày bắt đầu của kỳ sau là ngày kết thúc của kỳ trước, một dòng `billing_transactions` mới. (Bấm hai lần trong cùng một giây thì hệ thống coi là cùng một lần chuyển, không mở kỳ thứ hai.)
- [ ] **Lan mua lúc 23:58 ngày 31/01.** Kiểm: không bấm tay được vì đồng hồ máy; chạy `pnpm exec vitest run src/entitlements/orders/period-window.spec.ts` ở `apps/api`. Đúng là: kỳ 1 tháng kết thúc `2027-03-01 00:00` giờ Việt Nam; chữ "tới hết" ghi `28/02/2027` (hiện ở trang gói, M2).

### Admin

- [ ] **[local][smoke bước 11] Nhân viên xác nhận đã nhận tiền trước khi payOS báo.** Kiểm: tạo đơn của Lan, không trả; `Call $admin Post "/v1/admin/orders/<order_id>/confirm-payment" @{ reference = 'FT-TEST'; amount = 79000; reason = 'thấy trong app ngân hàng' }`. Đúng là: đơn `paid`, `paid_via = manual`, một kỳ cho Lan. Bấm lần hai: 409 `order-already-paid`. Rồi mở `checkout_url` và bấm **Đã trả** (cùng lần chuyển qua payOS): đơn vẫn một kỳ, payment thứ hai có kết quả `attached`, không có cờ.
- [ ] **[local][smoke bước 11] Danh sách đơn của admin.** Kiểm: `Call $admin Get '/v1/admin/orders?status=paid'` và `Call $admin Get '/v1/admin/orders?q=WM'` (một đoạn đầu nội dung chuyển khoản). Đúng là: tìm ra đơn theo nội dung chuyển khoản; Lan gọi cùng đường dẫn này (với `$lan`) bị 403: các đường dẫn đơn hàng của nhân viên chỉ dành cho `admin`.
- [ ] **[local] Hủy đơn đang chờ.** Kiểm: tạo đơn, `Call $admin Post "/v1/admin/orders/<order_id>/cancel"`; rồi mở `checkout_url`. Đúng là: đơn `cancelled`; trang payOS giả ghi `status CANCELLED`.
- [ ] **[local][smoke bước 9] Thu hồi một kỳ giữa chuỗi.** Kiểm: khi Lan có hai kỳ nối nhau, `Call $admin Post "/v1/admin/prepaid-periods/<id kỳ giữa>/revoke" @{ reason = 'ghi nhầm người học' }`. Đúng là: kỳ sau không dịch chỗ (có khoảng trống), Lan Pro tới hết kỳ đầu thôi; bấm lần hai không đổi gì.

### Xóa tài khoản, giữ hồ sơ, hết hạn

- [ ] **[local][smoke bước 14] Lan xóa tài khoản khi đang có đơn chờ, rồi tiền mới tới.** Kiểm: tạo đơn, `Call $lan Post '/v1/me/account/delete' @{ confirm_email = '<email Lan>'; acknowledged = $true; password = '<mật khẩu>' }`, rồi mở `checkout_url` bấm **Đã trả**. Đúng là: đơn `needs_review` lý do `account-deleted`; không có kỳ, không có dòng `billing_transactions`; trong chi tiết admin (`GET /v1/admin/orders/<id>`) có thông tin người chuyển để hoàn tiền và không có email; `POST …/resolve` với `{ note = 'đã hoàn tiền' }` đóng đơn và xóa thông tin người chuyển.
- [ ] **[smoke bước 15] Thông tin người chuyển bị xóa sau 90 ngày.** Đúng là: job dọn xóa ba trường hoàn tiền của đơn đã lưu hơn 90 ngày, đơn còn nguyên.
- [ ] **[local][smoke bước 18] Kỳ hết hạn, Lan về Miễn phí.** Kiểm: `UPDATE prepaid_periods SET starts_at = starts_at - interval '400 days', ends_at = ends_at - interval '400 days' WHERE user_id = '<id Lan>'`, rồi `Call $lan Get '/v1/me/entitlements'`. Đúng là: `plan = free`, `pro_until = null`, không còn nguồn `prepaid`.
- [ ] **[smoke bước 19] Log không chứa mã đơn, người chuyển hay mã tham chiếu.** Kiểm: chạy smoke với `SMOKE_LOGS=<log API>,<log worker>`. Đúng là: bước "privacy" PASS với dòng "log files scanned".
- [ ] **[local][smoke bước 12] payOS lỗi lúc tạo link.** Đúng là: 503 `provider-unavailable`, đơn `failed`, bấm lại với cùng khóa là một đơn mới; job hủy link lạc.

### Chạy cả bộ

- [ ] **[local] Chạy `pnpm smoke:buoc-b-payments`** (dựng môi trường theo đầu file script, DB smoke riêng). Đúng là: `19/19 steps`, mọi dòng PASS.

## M2. Mua trên web, admin, email, văn bản

(Thêm khi M2 được merge: trang gói và trang về, "Đơn hàng" ở admin, email biên nhận và sắp hết hạn, Điều khoản và Chính sách bảo mật mục payOS.)

## M3. Ai thấy quảng cáo, hộp thoại giới thiệu Pro

(Thêm khi M3 được merge.)

## M4. AdSense vignette

(Thêm khi M4 được merge.)

## Chưa kiểm được (và vì sao)

- **payOS thật, mọi giả định P1–P12 của design §3.14**: chỉ kiểm được sau deploy, bằng tiền thật số nhỏ, vì payOS không có sandbox. Trong đó hai dòng đổi kết quả của M1: **P7** (webhook và danh sách giao dịch của payOS cùng `reference` cho một lần chuyển; so với `transactionDateTime` của P9, vì quy tắc chống mở kỳ thứ hai dựa vào cả hai) và **P12** (link không tồn tại thì payOS trả HTTP 404; nếu trả 200 kèm mã lỗi, đơn chỉ được để nguyên và ghi cảnh báo). **[deploy]**
- **Webhook thật qua WAF và Bot Fight Mode của Cloudflare**, và `pnpm payos:confirm-webhook <url>` đăng ký URL với payOS thật (cần ba khóa thật và địa chỉ công khai). **[deploy]**
- **Chuyển lần hai vào link đã trả sinh webhook riêng (P8)**: không thử bằng tiền; theo dõi khi xảy ra. **[deploy]**
- **Phần của Task 9 phụ thuộc đợt A** (lượt AI dùng lúc còn Pro trả trước không trừ vào Free sau khi kỳ hết, LB1A8): chưa làm, chờ `origin/dev` có M3 của đợt A. Chưa kiểm được cho tới lúc đó.
- **Email biên nhận và "sắp hết hạn" (Task 15)**, trang mua, trang về và màn admin "Đơn hàng": thuộc M2.
- **Hộp thoại giới thiệu Pro và AdSense**: thuộc M3 và M4; AdSense chỉ bật được sau khi Google duyệt. **[deploy]**
- **Spike CSP `nonce` với Turnstile thật**: chạy lại sau khi mã Turnstile của đợt A vào `dev` (đã vào ngày 04/11/2026, chưa chạy lại); xem `chuan-bi-launch-b-spike-csp.md`.
- **Smoke 5 và 7** chạy lại ở Task 24, sau khi hợp nhất với đợt A (M1 đổi `resolve()` và snapshot quyền lợi).

## Liên kết

- PR M1: **chưa mở**, nhánh `feat/launch-b-m1-orders`; chờ M3 của đợt A vào `dev` rồi hợp nhất `origin/dev` và chạy lại test, smoke.
- PR M2, M3, M4: chưa có.
- Đợt A (cùng đợt chuẩn bị launch): [`chuan-bi-launch-a.md`](chuan-bi-launch-a.md), PR [#211](https://github.com/quangtienngo661/english-flashcard/pull/211) (Turnstile) và [#212](https://github.com/quangtienngo661/english-flashcard/pull/212) (tài liệu).
