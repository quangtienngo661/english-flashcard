# Review plan Bước 8 (Google sign-in + xóa tài khoản) — trước khi thực thi (29/10/2026)

**Đã đọc:** plan [`../plans/2026-10-29-buoc-8-identity-remainder.md`](../plans/2026-10-29-buoc-8-identity-remainder.md) (560 dòng), bản tóm tắt
[`../../deliveries/buoc-8.md`](../../deliveries/buoc-8.md), design [`../specs/2026-10-28-buoc-8-identity-remainder-design.md`](../specs/2026-10-28-buoc-8-identity-remainder-design.md)
(669 dòng), decision record [`../decisions/2026-10-28-buoc-8-identity-remainder-decisions.md`](../decisions/2026-10-28-buoc-8-identity-remainder-decisions.md) (D1–D30),
review design [`2026-10-28-buoc-8-design-review.md`](2026-10-28-buoc-8-design-review.md) (R1–R20, M1–M24); mẫu trình bày: review plan Bước 5.

**Code:** checkout chính, nhánh `docs/buoc-8-brainstorm` @ `7b2ff1c`. `git diff --stat HEAD origin/dev -- apps` → 0 dòng, `origin/dev` = `9e35eb5` (không fetch thêm).
Đường dẫn code tính từ `apps/api/` trừ khi ghi `apps/web/…`, `apps/admin/…`. "Plan dòng N", "design dòng N" là số dòng của file trên đĩa.

**Đã kiểm thế nào (chỉ đọc):** đọc từng file và symbol plan nêu tên; grep cột trỏ tới người dùng trong `prisma/models/*.prisma`, khóa ngoại trong
`prisma/migrations/*/migration.sql`, tên advisory lock trong `src/**`; đọc `vitest.config.ts`, `.github/workflows/ci.yml`, các smoke cũ. Không build, không test,
không chạy server, không chạy migration, không cài gì. File code-facts chỉ dùng làm đầu mối; mọi bằng chứng dưới đây đọc lại trên code.

**Phạm vi:** độ phủ design ↔ task, build được trên code hiện có, interface giữa task và milestone, file hai milestone song song cùng sửa, khóa và job chạy ở hai
process, cookie và redirect, test có bắt được bản sai không, phần plan thêm hoặc bỏ. Không bàn lại D1–D30; một mục "Đề xuất" của design chỉ được nêu khi plan
làm theo nó mà hỏng trên code.

**Kết quả:** 3 Cao, 9 Vừa, 13 Thấp. 2 câu cần chủ dự án quyết (cuối file); phần còn lại sửa thẳng vào plan được.

## Bảng tóm tắt

| # | Mức | Task | Điểm |
|---|---|---|---|
| P1 | Cao | 13, 15 | Việc thử lại gọi `delete({ by: 'self' })`, nhưng Tx A trả `'pending'` ngay khi thấy `deleting` với `self` → việc tự xóa bị lỗi Tx B **không bao giờ** xong; `cleanup` không có luật |
| P2 | Cao | 10, 16 | Chạy lại sau khôi phục (B8E53) hỏng khi bản cũ ghi gói đang tự gia hạn: bộ xóa Entitlements tự ném lỗi, `mode` không tới được bộ xóa → kẹt `deleting` mãi |
| P3 | Cao | 14, 26 | Sai mật khẩu ở màn xóa trả 401: web coi mọi 401 là hết token, gia hạn rồi **gửi lại** cùng mật khẩu sai → mỗi lần gõ sai tính hai lần vào `auth.delete.user` và khóa đăng nhập IR6 |
| P4 | Vừa | 13, 15 | Dọn tài khoản chưa xác nhận không kiểm lại điều kiện trong Tx A → xóa nhầm tài khoản vừa xác nhận email hoặc vừa đăng ký lại (B8E32) giữa lúc chọn và lúc xóa |
| P5 | Vừa | 10, 14, 22 | Admin xóa người đang tự gia hạn: tắt gia hạn xong, cờ `cancel_at_period_end` chỉ đổi khi sự kiện về; bộ xóa Entitlements ném lỗi → 202 và thử lại mỗi giờ; bộ nối giả "phát sự kiện" chưa nói đồng bộ hay không |
| P6 | Vừa | 6, 12, 13 | Thư "đã xóa" cần số năm giữ giao dịch (cài đặt của Entitlements) nhưng port `IdentitySettingsReader` chỉ có `unverifiedCleanupDays()` |
| P7 | Vừa | 19, 21 | Các 302 về web (lỗi, `google/complete`, `?reauth=`) viết dạng đường dẫn tương đối → trình duyệt ở lại host API (3000), không về web (3001) |
| P8 | Vừa | 19 | `LEARNER_APP_URL + next + '?signed_in=google'` hỏng khi `next` có query hoặc `#` (web gửi `next` kèm query) |
| P9 | Vừa | 22, 26, 27 | `GET /v1/me/entitlements` **đã có** `sources[].id/status/renews_at/cancel_at_period_end` từ Bước 5; plan thêm một bộ trường trùng ở cấp trên, và "gói trả tiền hiện tại" số ít |
| P10 | Vừa | 1, 7–10, 13, 15, 32 | API không có DB trong CI; nhiều test trong plan chỉ chạy được với Prisma giả nên không chứng minh hành vi DB; smoke thiếu nhánh thử lại, B8E40, B8E52 và vượt giới hạn đăng ký 5/giờ |
| P11 | Vừa | 33 (thứ tự) | `ASSUMPTION` cookie sau chuyển trang từ Google chỉ kiểm ở cuối M7; Google giả nằm cùng host API nên CI, smoke, lượt duyệt trình duyệt đều cùng site, không tái hiện được |
| P12 | Vừa | 14, 17, 13, 19, 10, 22 | M2 ∥ M3 ∥ M4 cùng sửa `app-config.ts`, `templates.ts`, `identity.module.ts`, `entitlements.module.ts`; Task 14 thiếu `app-config.ts` và `list-routes.spec.ts` trong danh sách file |
| P13 | Thấp | 19 | Email trùng người đã có danh tính Google khác `sub` → vi phạm unique `(user_id, provider)` → 500 trên một lần chuyển trang |
| P14 | Thấp | 6 | Không có test khởi động "đủ sáu bộ xóa + hai port" (B8E23 ghi "test khởi động đỏ"); đã có tiền lệ |
| P15 | Thấp | 2, 3 | `AccountState` không mang `staffRole`, `mustChangePassword` → `PermissionGuard` vẫn đọc chuỗi phiên lần hai, khác §21 design |
| P16 | Thấp | 4 | `setStaffRole` vẫn đếm admin `deleting` khi kiểm admin cuối |
| P17 | Thấp | 18 | Google giả thiếu `given_name`, `family_name`, `picture`, không kiểm `nonce`/PKCE → B8A1 "tên và ảnh từ Google" không thử được |
| P18 | Thấp | 17 | Chế độ giả không có địa chỉ quay về (`GOOGLE_REDIRECT_URI` chỉ bắt buộc khi có client id); thứ tự ưu tiên khi bật cả giả lẫn thật chưa ghi |
| P19 | Thấp | 20, 24 | Phiếu đăng ký hết hạn trả 401 `invalid-token`: transport của web sẽ gia hạn rồi đăng xuất "hết phiên" |
| P20 | Thấp | 23–27 | `KNOWN_ERROR_SLUGS` của web không được cập nhật (design §13 có ghi) |
| P21 | Thấp | 23 | Xóa cờ `logout-pending` **trước** khi đi Google: Google lỗi thì phiên cũ chưa đăng xuất được tự vào lại (mất bảo vệ FE38) |
| P22 | Thấp | 10 | Sự kiện thanh toán tới muộn: plan đặt null hai cột id nhưng `payload`, `raw_payload` vẫn mang id thật (raw giữ 90 ngày) |
| P23 | Thấp | 10 | Bộ xóa Entitlements không lấy khóa `entitlements.pool:*` như thứ tự khóa của design §7.2 |
| P24 | Thấp | 19 | Test của callback thiếu: B8E3 ánh xạ ra `google-email-unverified`, B8E4 ra `google-failed`, danh tính theo `sub` mà `deleting`, khóa IR6 không chặn Google |
| P25 | Thấp | nhiều | Lặt vặt: lệnh drift khác CI, file "modify" thực ra là tạo mới, thứ tự tham số, `.env.example` gốc, dẫn chứng lệch |

---

## Phát hiện

### P1. (Cao) Task 13, 15 — việc thử lại không bao giờ xong một lần tự xóa

**Sai ở đâu.** Task 13, Tx A: "already `deleting`: `self` returns `'pending'`, `admin` goes on to Tx B" (plan dòng 262), có test riêng "a second `self` request
finding `deleting` returns `'pending'` without running Tx B (B8E54)" (dòng 274). Task 15, việc thử lại: "accounts `deleting` … → `delete({ by: users.deleting_by,
mode: 'normal' })`, which goes straight to Tx B for a `deleting` account" (dòng 301). Hai câu trái nhau: với `deleting_by = 'self'`, lời gọi này rơi đúng vào nhánh
`self` của Tx A và trả `'pending'`, không chạy Tx B. Với `deleting_by = 'cleanup'`, Task 13 không nói Tx A làm gì khi thấy `deleting`.

**Hỏng ở kịch bản nào.** Lan tự xóa; Tx B lỗi (một module lỗi, hết 120 giây, deadlock §7.2). Tài khoản ở `deleting`, 202. Mỗi giờ việc thử lại gọi
`delete({ by: 'self' })` → `'pending'`. Sau 24 giờ chỉ có log `account_deletion_stuck`; Lan không đăng nhập được, dữ liệu không bị xóa. Đây là đường hồi phục duy
nhất của D23 và của B8E22, M14.

**Đề xuất sửa plan.** Tách hẳn đường "chỉ chạy Tx B": thêm `mode: 'resume'` (hoặc hàm `finish(userId)`) bỏ qua Tx A, đọc `deleting_by` dưới khóa để ghi
`deleted_accounts.by` và quyết định có gửi thư (không gửi khi `cleanup`). Task 15 gọi đường này. Ghi rõ luật Tx A cho `cleanup` khi đã `deleting` (đề xuất: như
`admin`, đi tiếp Tx B). Thêm test ở Task 15: "retry of a `self` deleting account runs Tx B, deletes it and sends exactly one mail"; "retry of a `cleanup` one deletes it,
no mail". Đánh giá cột `deleting_by` plan thêm: **cần**, vì việc thử lại cần cả `deleted_accounts.by` lẫn luật "không thư cho `cleanup`"; plan nên ghi lý do thứ hai.

### P2. (Cao) Task 10, 16 — chạy lại sau khôi phục kẹt khi bản cũ ghi "đang tự gia hạn"

**Sai ở đâu.** Bộ xóa Entitlements: "if any subscription `isAutoRenewing` → throw `Error('renewing subscription')` (B8E52, retry path)" (plan dòng 221). Chữ ký bộ
xóa là `erase(tx, userId, anonId)` (dòng 162), không có `mode`. `mode = 'replay'` chỉ bỏ qua điều kiện §7.1 trong Tx A (dòng 268). B8E53 (design dòng 583): "bản cũ ghi
Lan đang gia hạn hoặc là admin cuối → bỏ qua điều kiện, vẫn xóa". Test của Task 16 chỉ có ca admin cuối (dòng 321).

**Hỏng ở kịch bản nào.** Lan hủy gia hạn ngày 9 (theo D11), xóa ngày 10. Khôi phục bản backup ngày 8: hàng `subscriptions` của Lan còn `active`,
`cancel_at_period_end = false`. `accounts:replay-deletions` → Tx A đặt `deleting` → Tx B gọi bộ xóa Entitlements → ném lỗi → `'pending'`. Việc thử lại mỗi giờ chạy
`mode: 'normal'` → lỗi y hệt. Lan "sống lại" ở trạng thái `deleting` mãi, đúng điều D21 muốn tránh.

**Đề xuất sửa plan.** Cho bộ xóa biết chế độ: `erase(tx, userId, anonId, opts: { checks: 'normal' | 'skip' })`, bộ xóa Entitlements chỉ kiểm `renewing` khi
`'normal'`; `replay` truyền `'skip'`. Test Task 16: "replay of a restored account whose subscription row still says renewing deletes it". Nếu replay lỗi giữa chừng,
lệnh in lỗi để người vận hành chạy lại (không cần lưu chế độ vào DB); ghi vào `deploy-checklist.md` ở thủ tục khôi phục.

### P3. (Cao) Task 14 — sai mật khẩu trả 401 làm web gửi lại request

**Sai ở đâu.** Task 14: "has password → verify with the same path as login (generic failure on mismatch, counts toward IR6 lockout)", test "wrong password → generic
401" (plan dòng 284-285, 291). Transport của web coi **mọi** 401 là token hết hạn: gia hạn phiên rồi gửi lại đúng request đó
(`apps/web/src/app-shell/session/session-store.ts:307-323`, "a 401 triggers the shared refresh and one retry"). Phiên vẫn còn nên gia hạn thành công, request
có mật khẩu sai được gửi lần hai.

**Bằng chứng thêm.** `decideCredential` tăng `failed_login_count` mỗi lần sai, khóa đăng nhập 15 phút ở lần thứ 10 (`src/identity/auth/credential-decision.ts:24-33`).
Đổi mật khẩu, cũng là route có Bearer, đã tránh đúng chuyện này bằng 400 `invalid-current-password` (`src/identity/auth/password.service.ts:92,136-137`); web đã có
chữ cho mã đó (`apps/web/src/app-shell/api/problem.ts:35-72`, `apps/web/messages/vi.json:923`).

**Hỏng ở kịch bản nào.** Lan gõ sai mật khẩu 3 lần ở màn xóa: server đếm 6 lần → lần thứ 3 của Lan đã bị 429 `auth.delete.user` (5/giờ, B8E18 nói "sau 5 lần"). Gõ sai
5 lần → 10 lần sai → đăng nhập mật khẩu của Lan bị khóa 15 phút (IR6), ở mọi thiết bị.

**Đề xuất sửa plan.** Task 14 trả 400 `invalid-current-password` khi sai mật khẩu (giữ luật đếm IR6 như đổi mật khẩu), 429 khi `decideCredential` trả `locked`.
Sửa test thành "wrong password → 400 `invalid-current-password`, counted once". Task 26 hiện câu chung như design §9.4. Thêm test web: "400 không làm transport
gia hạn hay gửi lại".

### P4. (Vừa) Task 13, 15 — dọn tài khoản chưa xác nhận không kiểm lại dưới khóa

**Sai ở đâu.** Tx A chỉ liệt kê việc kiểm lại cho `self` và `admin` (plan dòng 260-262). Việc dọn chọn tới 200 tài khoản bằng một câu `SELECT` rồi gọi
`delete({ by: 'cleanup' })` lần lượt (dòng 304-305); không câu nào nói kiểm lại "chưa xác minh, không vai trò, mốc cũ hơn N ngày" trong Tx A.

**Bằng chứng.** Đăng ký lại đặt lại `terms_accepted_at` cho tài khoản chưa xác minh đang `active` (`src/identity/auth/auth.service.ts:67-70,78-86`). Scheduler chạy ở
**cả** API lẫn worker: worker dựng cả `AppModule` (`src/worker.ts:11`), `MaintenanceScheduler` ở `CommonModule` (`src/common/common.module.ts:27,31`) và bật timer khi
`MAINTENANCE_ENABLED` (mặc định `true`, `src/common/config/app-config.ts:204`; `maintenance.scheduler.ts:52-55`). Vậy mục "`CHƯA KIỂM`" của design §7.2, §19 đã rõ:
hai process cùng chạy mọi việc mỗi giờ.

**Hỏng ở kịch bản nào.** Tài khoản X đăng ký 7 ngày trước, chưa xác minh. Việc dọn chọn 200 tài khoản, X ở cuối danh sách. Trong lúc 199 tài khoản trước đang được
xóa (mỗi cái hai transaction), người dùng nhập OTP xác minh X, hoặc đăng ký lại X (B8E32). Tới lượt X, Tx A đặt `deleting` và xóa một tài khoản **đã xác minh** hoặc
vừa đăng ký lại.

**Đề xuất sửa plan.** Tx A với `by = 'cleanup'`: dưới `withUserLock` đọc lại và chỉ đi tiếp khi `email_verified_at IS NULL AND staff_role IS NULL AND status IN
('active','locked') AND COALESCE(terms_accepted_at, created_at) < cutoff`; không thì trả `'skipped'`. Test: "user verified between select and Tx A → not deleted";
"re-registered between select and Tx A → not deleted". Sửa chú thích `maintenance.scheduler.ts:10-14` (Task 15 đã có) theo sự thật này.

### P5. (Vừa) Task 10, 14, 22 — admin xóa người đang tự gia hạn luôn rơi vào 202

**Sai ở đâu.** Task 14: trước Tx A gọi `turnOffRenewalForAdminDelete`, rồi `delete({ by: 'admin' })` (plan dòng 287-288). Hàm này dùng lại `turnOffPaidRenewals`
(dòng 225-226), vốn chỉ gọi `cancelAtPeriodEnd` của bộ nối (`src/entitlements/grants/grants.service.ts:383-396`); cờ `subscriptions.cancel_at_period_end` chỉ đổi khi
sự kiện `cancel_scheduled` được áp (design §8.1, dòng 419). Bộ xóa Entitlements trong Tx B ném lỗi khi còn "đang tự gia hạn" (dòng 221). Task 22 cho bộ nối giả "emits
a `cancel_scheduled` event through its wire" (dòng 416-417) nhưng không nói đồng bộ hay không. Bộ nối giả hiện không có đường gửi sự kiện cho chính nó: sự kiện vào
qua `WebhookController` → `BillingInbox.store` → `afterResponse` (`src/entitlements/billing/webhook.controller.ts:32-50`, `billing-inbox.service.ts:34-77`).

**Hỏng ở kịch bản nào.** Với nhà cung cấp thật, webhook về sau vài giây tới vài phút: admin xóa → 202, tài khoản `deleting`, việc thử lại chỉ chọn sau 10 phút →
xong sau tới một giờ. Nhà cung cấp không gửi webhook → kẹt mãi. Với bộ nối giả, kết quả 204 hay 202 phụ thuộc người làm Task 22 chọn áp sự kiện đồng bộ hay
không; B8A4 ("như B8A3", tức 204) và ca "admin delete" của smoke không xác định.

**Đề xuất sửa plan.** Cần chủ dự án chọn hành vi (câu Q1 cuối file). Dù chọn gì: ghi vào Task 22 rằng bộ nối giả lưu và áp sự kiện `cancel_scheduled`
**trước khi** `cancelAtPeriodEnd` trả về (cho CI và smoke tất định); thêm ca smoke "admin xóa người đang tự gia hạn".

### P6. (Vừa) Task 6, 12, 13 — thư "đã xóa" không lấy được số năm giữ giao dịch

**Sai ở đâu.** Task 13: "`accountDeletedMail(email, retentionYears)`" (plan dòng 266); design §14: thư có dòng "hồ sơ thanh toán N năm". N là
`entitlements.transactionRetentionYears` (Task 12, dòng 247). Identity không được import `SettingsModule` (Global Constraints dòng 31; `src/settings/settings.module.ts:9`
import Identity). Port duy nhất là `IdentitySettingsReader { unverifiedCleanupDays() }` (dòng 167).

**Đề xuất sửa plan.** Thêm `transactionRetentionYears(): Promise<number>` vào `IdentitySettingsReader` (Task 6) và vào provider của Settings (Task 12); test
Task 13 kiểm số năm trong thư lấy từ port.

### P7. (Vừa) Task 19, 21 — redirect về web viết tương đối, rơi vào host API

**Sai ở đâu.** Chỉ đường thành công có tiền tố: "302 to `LEARNER_APP_URL + next + '?signed_in=google'`" (plan dòng 370-371). Các đường khác viết tương đối: "mode
`off` → 302 to `/{locale}/app/login?error=google-unavailable`" (dòng 365), "302 to `/{locale}/app/google/complete`", "Errors → 302 `/{locale}/app/login?error=<slug>`"
(dòng 369-371), "302 `/{locale}/app/settings/delete-account?reauth=ok`" (dòng 399). `start_url` của Task 21 cũng tương đối (dòng 397). API và web là hai origin
(`learnerAppUrl` là origin riêng, `src/common/config/app-config.ts:59-60`; local 3000 và 3001).

**Hỏng ở kịch bản nào.** Google lỗi → trình duyệt tới `http://localhost:3000/vi/app/login?error=google-failed` → 404 của API. Test unit viết theo plan sẽ khẳng định
đúng `Location` sai này.

**Đề xuất sửa plan.** Một helper `toLearnerApp(path)` = `LEARNER_APP_URL + path` cho mọi 302 về web; test khẳng định `Location` tuyệt đối. Ghi rõ `start_url`
trả về tuyệt đối (API không biết địa chỉ gốc của mình, nên hoặc web ghép `API` + `start_url`, hoặc dùng `GOOGLE_REDIRECT_URI` để suy ra; chọn một và ghi).

### P8. (Vừa) Task 19 — `?signed_in=google` ghép chuỗi

**Sai ở đâu.** `next` được phép có `?` và `#` (mẫu `/^\/(vi|en)\/app(?=[/?#]|$)/`, plan dòng 366). Web gửi `next` kèm query: `RequireSession` lấy `here` gồm cả
`window.location.search` (`apps/web/src/app-shell/RequireSession.tsx:24,68`), và nhiều trang đọc query (`WordPage.tsx`, `GroupPage.tsx`, `LookupPage.tsx`).

**Hỏng ở kịch bản nào.** `next=/vi/app/word?id=abc` → `…/vi/app/word?id=abc?signed_in=google` → `id` thành `abc?signed_in=google`, trang từ lỗi, web không thấy
`signed_in`. `next` có `#` → tham số nằm trong fragment.

**Đề xuất sửa plan.** Dựng bằng `new URL(next, LEARNER_APP_URL)` rồi `searchParams.set('signed_in', 'google')`, đồng thời kiểm `url.origin` bằng origin của
`LEARNER_APP_URL` và `pathname` sau chuẩn hóa vẫn bắt đầu bằng `/{vi|en}/app` (bắt luôn `%2e%2e`, mà kiểm "không có `..`" bỏ sót). Thêm vào Review Focus 2:
`next=/vi/app/word?id=1#x` → về đúng trang với `signed_in`.

### P9. (Vừa) Task 22 — trường gói đã có sẵn

**Sai ở đâu.** Task 22: "`GET /v1/me/entitlements` adds `subscription_id`, `renews_at`, `cancel_at_period_end` of the current paid subscription (null when none)"
(plan dòng 414), chép design §8.1 ("hiện chỉ trả `ends_at`…", design dòng 415). Code đã trả mỗi gói trong `sources[]` với `id`, `status` (trạng thái hiệu lực),
`renews_at`, `cancel_at_period_end` từ Bước 5 (`src/entitlements/entitlements.service.ts:32-38,152-160`; commit `d3609f2`), và web đã đọc
(`apps/web/src/app-shell/queries.ts:19-20`, `src/features/learner/transactions/TransactionsPage.tsx:82`).

**Vì sao quan trọng.** Hai hình dạng cho cùng dữ liệu; "gói hiện tại" số ít trong khi luật chặn xóa phải xét **mọi** gói đang tự gia hạn. `status` hiệu lực
(`src/entitlements/rules/plan-rules.ts:50-67`) chỉ lọc `expired`/`revoked`; gói lưu `active` chưa hủy không bao giờ thành `expired` hiệu lực, nên web áp vị từ trên
`sources` khớp với API.

**Đề xuất sửa plan.** Bỏ phần sửa snapshot ở Task 22 (và test "snapshot fields"). Task 26, 27 dùng `sources.filter(kind === 'subscription')` với
`isAutoRenewing(status, cancel_at_period_end)`; nút "Hủy gói" theo từng gói. Ghi một dòng ở design §8.1 rằng câu "hiện chỉ trả `ends_at`" đã cũ.

### P10. (Vừa) Nhiều task — test giả không chứng minh hành vi DB; smoke còn thiếu ca

**Sai ở đâu.** API không có test chạm DB trong CI: `vitest.config.ts` chỉ có `**/*.spec.ts`, không `globalSetup`; 24 spec dựng app bằng `createTestApp` với
`PrismaModule.forRoot` bị thay bằng đối tượng giả (`src/identity/profile/profile.controller.spec.ts:20-23`); Testcontainers chỉ còn ở `test:scale` chạy tay.
Plan viết test như thể có DB: "private entries … are gone; another user's private entry and catalog senses stay" (dòng 188), "order (items before questions)"
(dòng 211), "anonymised usage rows keep `(pool, operation_id)` unique" (dòng 229), "two admins deleting each other serialize on `identity.staff_role`" (dòng 271),
và Task 1 chỉ chạy migration trên DB mới (dòng 86). Với Prisma giả, các test này chỉ kiểm câu lệnh được gọi; cascade, trigger `entries_clear_form_kind`, FK RESTRICT
`practice_session_items.question_id`, `jsonb_set`, `ON CONFLICT`, khóa advisory chỉ được chứng minh ở smoke.

**Smoke Task 32 thiếu** (plan dòng 540-543 so với design §15, §16): nhánh Tx B lỗi → việc thử lại xong, đúng một thư (B8E22, M14; cũng là ca bắt P1); hai admin xóa
nhau (B8E40); webhook bật lại gia hạn giữa Tx A và Tx B (B8E52); báo lỗi đã xác nhận của người bị xóa (B8E27); đăng ký lại có trial (B8E28); thư "đã xóa" có trong
Mailpit và `deleted_accounts.by='admin'` (B8A3, B8A4); B8E49 chỉ "printed", không có ngưỡng. Smoke tạo hơn 5 tài khoản qua đường đăng ký trong một giờ, trong khi
`auth.register.ip` là 5/giờ (`app-config.ts:110`) và `POST /v1/auth/google/complete` dùng chung luật đó (plan dòng 38).

**Đề xuất sửa plan.** Ghi ở Global Constraints: "test API là unit với Prisma giả; hành vi chỉ DB có được kiểm ở smoke", và ở mỗi task ghi test nào là giả. Thêm
vào Task 32: dựng `deleting` bằng psql (`deleting_since` lùi 11 phút, `deleting_by='self'`) rồi `maintenance:run`, kiểm đã xóa và đúng một thư; hai request admin
song song với một psql giữ khóa `identity.staff_role` (như FE29, `scripts/smoke-buoc-0-3-fixes.mjs:277-310`); kiểm Mailpit và `by`; khẳng định B8E49 dưới 120 giây;
tạo người dùng phụ bằng psql (`sqlUsers`, `smoke-buoc-0-3-fixes.mjs:190-197`) để không vượt 5/giờ. Task 1 Step 2 thêm: chạy migration trên một DB đã có dữ liệu
(sau một smoke cũ).

### P11. (Vừa) Thứ tự — kiểm cookie qua Google thật quá muộn

**Sai ở đâu.** `ASSUMPTION` của design §5.4, §19 (trình duyệt nhận `refresh_token` `SameSite=Strict` ở phản hồi của chuỗi chuyển trang bắt đầu từ Google, rồi gửi nó
ở `/v1/auth/refresh` ngay sau) và PKCE với client Web (§5.3) chỉ được xác nhận ở Task 33 Step 3 (plan dòng 556-557), tức sau khi M5 đã dựng web trên giả định đó.
Google giả nằm ngay trên host API (`/v1/dev/google/authorize`, plan dòng 352), nên chuỗi chuyển trang của CI, smoke và lượt duyệt trình duyệt đều cùng site; không
cách nào trong plan tái hiện được trường hợp khác site. Cookie phiên web là `SameSite=Strict`, `path=/v1/auth` (`src/identity/sessions/session-transport.ts:13-15`).

**Vì sao quan trọng.** Nếu giả định sai, phương án dự phòng của design §19 (mã dùng một lần đổi bằng `fetch`) đổi cả API (M3) lẫn web (M5).

**Đề xuất sửa plan.** Câu Q2 cuối file (lịch việc của chủ dự án). Về kỹ thuật, không cần chủ dự án: trong lượt duyệt trình duyệt, cho trang "chọn tài khoản" giả chạy
ở một host khác site (`127.0.0.1` thay vì `localhost`) để chuỗi chuyển trang thành khác site.

### P12. (Vừa) Các milestone song song sửa cùng file

**Sai ở đâu.** Plan gọi M2 ∥ M3 ∥ M4 song song (dòng 52-53), nhưng:
- `src/common/config/app-config.ts`: M2 cần `auth.delete.user` (dùng ở Task 14, dòng 283) nhưng Task 14 không liệt kê file này; M3 Task 17 sửa cùng file (dòng 330).
  Cả hai đều phải thêm vào union `RateLimitRuleName` (`app-config.ts:6-23`) và `DEFAULT_LIMITS` (`:108-125`).
- `src/identity/mailer/templates.ts`: M2 Task 13 (`accountDeletedMail`) và M3 Task 19 (`googleLinkedMail`).
- `src/identity/identity.module.ts`: M1 Task 2, M2 Task 6/13–15, M3 Task 19–21.
- `src/entitlements/entitlements.module.ts`: M2 Task 10 (provider) và M4 Task 22 (controller).
- `test/support/list-routes.spec.ts:46-54` khẳng định **đúng** danh sách route `roles.manage`; route `POST /v1/admin/users/:id/delete` của Task 14 làm nó đỏ,
  nhưng Task 14 không liệt kê file này.

**Đề xuất sửa plan.** Dồn các dòng dùng chung vào M1 (đã tuần tự): hai luật tần suất, hai hàm thư (thân rỗng có test), các khóa `.env.example`. Ghi thứ tự merge
M2 trước M3/M4 (M3 đã phải chờ Task 14 cho Task 21) và "rebase trên `dev` trước khi mở PR". Thêm `app-config.ts` (hoặc bỏ, nếu dồn vào M1) và
`list-routes.spec.ts` vào Files của Task 14.

### P13. (Thấp) Task 19 — người dùng đã có danh tính Google khác `sub`

Bảng §5.4 (design dòng 192-198) và Task 19 (plan dòng 368) không có dòng "email trùng người đã xác minh, `active`, nhưng người đó đã có danh tính Google với
`sub` khác". Gắn thêm sẽ vi phạm unique `(user_id, provider)` (Task 1, plan dòng 79) → lỗi P2002 → 500 trên một lần chuyển trang, người dùng thấy JSON lỗi. Đúng
loại B8E58 (email không do Google quản lý). Đề xuất: không gắn, `google-failed`, log `google_link_conflict` (chỉ user id); thêm test.

### P14. (Thấp) Task 6 — thiếu test khởi động của registry

B8E23: "Tx B lỗi ngay (fail closed); test khởi động đỏ". Task 6 chỉ test registry đứng riêng (plan dòng 175). Tiền lệ có sẵn: dựng app bằng `createTestApp` rồi
khẳng định đủ probe (`src/content/catalog/admin-entries.controller.spec.ts:49-50`). Đề xuất: cuối M2 (sau Task 12) thêm test "app boots with all six erasers in
`ERASE_ORDER`, the precondition and the settings reader registered".

### P15. (Thấp) Task 2, 3 — `PermissionGuard` vẫn đọc lần hai

Design §21 chốt "một hàng `session_chains` nối `users` theo `sid`, dùng lại cho các guard sau" (design dòng 665). `AccountState` của plan chỉ có `status`,
`authMethod`, `revoked` (plan dòng 97), nên `PermissionGuard` vẫn chạy câu của nó (`src/identity/staff/permission.guard.ts:29-32`, đọc `staffRole`,
`mustChangePassword`). Đề xuất: thêm `staffRole`, `mustChangePassword` vào `AccountState`, bỏ câu đọc trong `PermissionGuard`; hoặc ghi rõ đây là lựa chọn giữ
nguyên và vì sao.

### P16. (Thấp) Task 4 — `setStaffRole` đếm cả admin `deleting`

Task 4 chỉ thêm 409 khi đích là `deleting` (plan dòng 133). Luật admin cuối của `setStaffRole` vẫn `count({ where: { staffRole: 'admin' } })`
(`src/identity/staff/staff.service.ts:336`). Hai admin A, B; việc xóa A lỗi Tx B (A `deleting`); B tự bỏ vai trò admin: đếm ra 2 → cho phép → khi A được xóa xong
không còn admin nào (chỉ cứu được bằng `pnpm admin:grant`). Đề xuất: đếm `status <> 'deleting'` ở cả `setStaffRole`; test.

### P17. (Thấp) Task 18 — Google giả thiếu trường

Route giả nhận `email&sub&name&email_verified&state&redirect_uri` (plan dòng 352): không có `given_name`, `family_name`, `picture`, và không nói lấy `nonce`,
`code_challenge` từ `authorizeUrl`. Hệ quả: B8A1 ("tên và ảnh từ Google") và nhánh `needs_name: false` không thử được bằng bản giả; bản giả không kiểm `code_verifier`
nên một lỗi nối PKCE vẫn qua CI. Đề xuất: thêm ba tham số; bản giả nhúng `nonce` đã nhận vào ID token và từ chối khi `code_verifier` không khớp `code_challenge`.

### P18. (Thấp) Task 17 — địa chỉ quay về ở chế độ giả

`GOOGLE_REDIRECT_URI` chỉ bắt buộc "when the client id is set" (plan dòng 332). Ở chế độ giả không có client id, `start` không có địa chỉ callback để đưa cho trang giả.
Đề xuất: bắt buộc `GOOGLE_REDIRECT_URI` khi bật giả, hoặc ghi rõ dùng đường dẫn tương đối `/v1/auth/google/callback` ở chế độ giả; ghi thứ tự `mode` khi bật cả hai
(`fake` thắng).

### P19. (Thấp) Task 20, 24 — 401 cho phiếu hết hạn

`GET`/`POST /v1/auth/google/complete` trả 401 `invalid-token` khi cookie hết hạn (plan dòng 382). Transport có phiên của web gia hạn khi gặp 401 rồi `logout('expired')`
khi gia hạn lỗi (`apps/web/src/app-shell/session/session-store.ts:307-323`). Đề xuất: ghi ở Task 24 là gọi hai route này bằng `fetch` thô (không qua transport có
phiên), hoặc đổi sang một mã riêng không phải 401.

### P20. (Thấp) M5 — slug lỗi của web

Design §13: "Admin và web thêm các mã này vào danh sách lỗi đã biết". Web có `KNOWN_ERROR_SLUGS` (`apps/web/src/app-shell/api/problem.ts:35-72`) và test kiểm mỗi mã có
chữ ở vi/en (theo mẫu của admin). Không task M5 nào sửa file này. Đề xuất: Task 26 thêm `confirm-email-mismatch`, `reauth-required`, `staff-account`,
`subscription-renewing`; Task 27 thêm `subscription-not-cancellable`, `cancel-in-store`.

### P21. (Thấp) Task 23 — xóa cờ `logout-pending` quá sớm (thách thức một "Đề xuất" của design §9.1)

Nút xóa cờ trước khi chuyển trang (plan dòng 432). Lan bấm Đăng xuất, lệnh chưa tới server (cờ bật, cookie còn sống); Lan bấm Google; Google lỗi → về trang đăng nhập
với `?error=` → `AuthGate` khởi động, không còn cờ, gia hạn bằng cookie cũ → vào lại tài khoản Lan vừa muốn đăng xuất (FE38, `session-store.ts:36`). Đề xuất: giữ
cờ khi đi; khi quay về có `?signed_in=google` thì bỏ cờ rồi gia hạn (cookie lúc này đã là chuỗi Google mới). B8E45 vẫn đúng.

### P22. (Thấp) Task 10 — sự kiện tới muộn vẫn mang id thật trong payload

Plan đặt `app_user_id`, `user_id` null cho sự kiện `unknown-user` (dòng 227). Hàng đã được lưu kèm `payload` và `raw_payload` trước khi bộ áp quyết
(`src/entitlements/billing/billing-inbox.service.ts:34-58`); `raw_payload` giữ 90 ngày (`billing-jobs.service.ts:125-130`). Đề xuất: với `unknown-user`, đặt null
cả `payload`, `raw_payload`; hoặc ghi rõ chấp nhận 90 ngày ở §7.3.

### P23. (Thấp) Task 10 — khóa kho lượt

Design §7.2 ghi thứ tự khóa trong Tx B kết thúc bằng `entitlements.user → entitlements.pool:*` (design dòng 323); khóa kho có ở
`src/entitlements/entitlements.locks.ts:19-22`. Task 10 chỉ nói "under `entitlements.user:<id>`" (plan dòng 221). Một `reserve`/`confirm` đã qua guard trước Tx A có
thể ghi `usage_records` mang id thật sau Tx B; lượt quét lại 24 giờ bắt được, nên chấp nhận được, nhưng plan nên ghi một trong hai: lấy khóa kho của ba pool, hoặc
dựa vào lượt quét (và test lượt quét có ca `usage_records`).

### P24. (Thấp) Task 19 — test thiếu vài dòng của bảng §5.4

Task 19 test (plan dòng 373-375) không có: `email_verified` false → `google-email-unverified` (B8E3; Task 18 chỉ kiểm chuỗi `"true"`); client lỗi hoặc hết giờ →
redirect `google-failed` (B8E4 ở mức callback); danh tính theo `sub` mà người đó `deleting` → `google-failed`; khóa đăng nhập vì sai mật khẩu 10 lần không chặn
Google (B8E11, IR6). Đề xuất: thêm bốn test.

### P25. (Thấp) Lặt vặt

- Task 1 Step 2 gọi lệnh drift `--from-migrations prisma/migrations` là "the CI drift check" (plan dòng 86); CI chạy `prisma migrate diff --from-config-datasource
  --to-schema prisma --exit-code --script` sau `db:setup` (`.github/workflows/ci.yml:56`). Dùng đúng lệnh CI.
- Task 14 "modify … `src/identity/deletion/delete.schemas.ts`" (dòng 279-280): file chưa có, là tạo mới.
- `privateSenseIdsOf(userId, tx)` (dòng 183) ngược thứ tự với `erase(tx, userId, …)`; `renewing(tx, userId)` được gọi **ngoài** transaction ở Task 14 (route admin,
  `auto_renewing` của chi tiết người dùng, dòng 287-289) → cho nhận `Prisma.TransactionClient | PrismaClient`.
- Task 15 gọi `delete({ by: 'cleanup' })` thiếu `mode` bắt buộc (dòng 259 so với 305).
- Task 11 sửa `src/cli/ai-fake-call*.ts` (dòng 235): CLI gọi `ai.deleteUserData(args.user)` (`src/cli/ai-fake-call-args.ts:85`), tham số `tx` tùy chọn nên CLI không
  cần đổi.
- Task 17 tạo `sealed-cookie.ts` AES-256-GCM mới; `src/identity/sessions/grace-cipher.ts` đã có `seal`/`open` AES-256-GCM: dùng lại, chỉ thêm JSON và hạn.
- Global Constraints đòi thêm biến vào env của Docker bootstrap (dòng 54), nhưng Task 17 chỉ liệt kê `apps/api/.env.example`; repo còn `.env.example` ở gốc.
- Task 5: "`billing-jobs.service.ts:133` keeps its own rule" (dòng 146): dòng 133 là `fetchIfOverdue` (hỏi lại nhà cung cấp khi quá hạn), không phải job thư gia hạn
  như design §7.1 viết. Không đổi việc phải làm, chỉ sửa dẫn chứng.
- Task 28: design §10 nói ba chữ `unknownUser` khác nhau; hai trong ba đã là "Người dùng đã xóa" (`apps/admin/messages/vi.json:85,1391,1597`), chỉ dòng 85 còn
  "Không rõ người dùng".
- Review Focus 5 (plan dòng 64) đã đúng trên code hiện tại: `refreshLocked` trả `revoked` trước nhánh grace (`src/identity/sessions/session.service.ts:150`), nên test
  này không đỏ trước khi làm; ghi là test chặn hồi quy.
- M6 ghi "after M1, M2" (dòng 489) còn Global Constraints ghi M5 ∥ M6 sau M2–M4 (dòng 52-53): M6 bắt đầu được ngay sau M2. Sửa một chỗ cho khớp.

---

## Độ phủ edge case và acceptance

| Mục | Task có test | Ghi chú |
|---|---|---|
| B8E1, B8E5, B8E7, B8E11, B8E39, B8E48, B8E58 | 19 | Đủ |
| B8E2, B8E4 | 18 (mức client) | Thiếu ở mức callback (P24) |
| B8E3 | — | Thiếu (P24) |
| B8E6, B8E8, B8E9, B8E10 | 20 (+24 cho web) | B8E10 chỉ với Prisma giả (P10) |
| B8E12 | 3 | Đủ |
| B8E13, B8E14, B8E21, B8E56 | 2 | Đủ |
| B8E15, B8E57 | 10, 13, 26, 27 | Đủ |
| B8E16 | smoke | Phải chờ sự kiện `cancel_scheduled` (P5) |
| B8E17, B8E31, B8E43, B8E47 | 14 | B8E17 đủ |
| B8E18 | 14 | Test sai hướng (P3) |
| B8E19, B8E20 | 21 | Đủ |
| B8E22, M14 | 13 (nhánh `'pending'`) | Nhánh thử lại không có test, và đang hỏng (P1, P10) |
| B8E23 | 6 | Thiếu test khởi động (P14) |
| B8E24, M1 | 15, smoke | Đủ |
| B8E25 | 10 | Đủ (xem P22) |
| B8E26 | — | Hành vi có sẵn; không cần test mới |
| B8E27 | — | Thiếu (P10) |
| B8E28 | — | Thiếu ca "đăng ký lại có trial" (P10) |
| B8E29, B8E30, B8E35, B8E54 | 13 | Đủ |
| B8E32, B8E51 | 15 | Đủ; thêm ca chạy đua của P4 |
| B8E33 | smoke | Đủ |
| B8E34 | 16 | Đủ |
| B8E36, B8E37 | 22 | Đủ |
| B8E38 | 17 | Đủ |
| B8E40 | 13 (giả) | Không chứng minh được bằng Prisma giả; thiếu ở smoke (P10) |
| B8E41, B8E42 | 4 | Đủ |
| B8E44 | 28 | Đủ |
| B8E45, B8E46 | 23 | Đủ (xem P21) |
| B8E49 | smoke | Không có ngưỡng đạt (P10) |
| B8E50 | 15, 13 | Đủ |
| B8E52 | 10 (giao diện) | Không có test nêu tên; thiếu ở smoke |
| B8E53 | 16 | Chỉ ca admin cuối; ca gói đang gia hạn hỏng (P2) |
| B8E55, B8E59 | 9 | Đủ |
| B8A1 | smoke | Tên và ảnh không thử được bằng bản giả (P17) |
| B8A2, B8A5, B8A6, B8A7 | smoke, 6, 22, 25, 27 | Đủ |
| B8A3, B8A4 | smoke | Thiếu kiểm thư ở Mailpit và `by='admin'` (P10) |
| B8A8 | 33 | Có, nhưng muộn (P11) |

Review Focus: cả 5 mục đều có test nêu tên (Task 20, 19, 14, 13/15, 4). Mục 3 cần sửa theo P3; mục 4 chỉ là test giả, cần ca smoke "chạy lại" thật (đã có trong
Task 32, dòng 542); mục 5 xem P25.

## Đã kiểm, đúng

- Mọi file plan nói "modify" đều có trên `9e35eb5` (`auth.guard.ts`, `permission.guard.ts`, `profile.controller.ts`, `profile/identity.service.ts`, `staff.service.ts`,
  `identity.types.ts`, `session.service.ts`, `credential-decision.ts`, `grants.service.ts`, `event-applier.service.ts`, `ai.service.ts`, `settings.definitions.ts`,
  `templates.ts`, `maintenance.scheduler.ts` dòng 10-14, `fake-billing.adapter.ts`, `test/support/create-test-app.ts`; web `AuthCard.tsx` với `GoogleSoon`,
  `session-store.ts`, `SettingsPage.tsx`, `AccountPage.tsx`, `PlansPage.tsx`, nhóm route `(auth)`, `(member)` với `page.app.tsx`; admin `session-store.ts`,
  `problem.ts` có `KNOWN_ERROR_SLUGS`, `UserDetail.tsx`, `UsersPage.tsx`, `users-api.ts`, `settings-api.ts` có `SECTIONS`, `e2e-real/`, script `test:e2e:real`, tên package
  `admin`, `web`). Ngoại lệ ở P25.
- Symbol: `startChain(tx, { userId, client, deviceLabel? })` (`session.service.ts:44-46`); `MaintenanceScheduler.register(name, job)` (`maintenance.scheduler.ts:26`);
  khuôn `EntryUsageRegistry` fail closed (`content/catalog/entry-usage.ts:30-43`); `DEFAULT_LIMITS` ở `app-config.ts:108`; luật chặn giả cùng `BILLING_PRODUCTION`
  (`:238-246`); `turnOffPaidRenewals` (`grants.service.ts:383-396`, trả `turned_off | not_supported`, hết giờ cũng là `not_supported`); `MailDispatcher.afterResponse`,
  `runNow` (`common/mail/mail-dispatcher.service.ts:25-36`); `normalizeEmail` trim và hạ chữ (`common/email/normalize-email.ts`), nên Review Focus 3 đúng;
  `SubscriptionStatus` có đúng sáu giá trị (`entitlements.types.ts:16`); `withUserLock` khóa `identity.user:<id>`; tên khóa `practice.user:`, `learning.user:`,
  `content.private:`, `entitlements.user:`, `identity.staff_role` đều có trong code.
- Ranh giới module: cả sáu module có bộ xóa, cùng `SettingsModule`, `EntitlementsModule`, đều đã import `IdentityModule`, nên đăng ký vào registry của Identity được mà
  không tạo vòng. `ContentService` được export (`content.module.ts:52`) và Practice import `ContentModule`.
- Cột trỏ tới người dùng: 51 cột tên `user_id`, `*_user_id`, `*_by` trong `prisma/models/*.prisma`; cộng `user_identities.user_id`, `deleted_accounts.user_id` là 53,
  khớp con số của Task 6. Không thấy cột trỏ tới người dùng nào ngoài mẫu tên này (`entries.owner_user_id`, `entitlement_notices.recipient_user_id` đều khớp mẫu).
- Khóa ngoại: `practice_session_items.question_id` RESTRICT (thứ tự xóa của Task 9 đúng); `practice_reports.item_id` SET NULL nên báo lỗi giữ lại không chặn việc xóa
  item; `entitlement_grant_changes.grant_id` CASCADE (D30); `users.locked_by` không có FK nên xóa một admin từng khóa người khác không lỗi; sáu bảng Identity cascade
  từ `users`.
- `usage_records` unique là `(user_id, pool, operation_id)` có điều kiện; thay cả loạt bằng một mã ẩn danh giữ được tính duy nhất (Task 10).
- Bản chụp báo lỗi có đúng các khóa `learner.answer`, `learner.option_index`, `learner.answers_tried` (`practice/reports/snapshot.ts:44`); báo lỗi về từ riêng chỉ đến từ
  câu AI (`reports.service.ts:106`), khớp D27a.
- Đăng ký lại vào email của tài khoản không `active` đã trả `email-taken` (`auth.service.ts:78`), nên tài khoản `deleting` không bị đăng ký đè.
- Migration: CHECK `users_status_check` chỉ có trong SQL (`20261021100000_account_fields/migration.sql:15`), đổi được bằng DROP + ADD; cột `NOT NULL DEFAULT 'password'`
  an toàn với dữ liệu cũ; drift check của CI không thấy CHECK.
- 24 controller spec dựng app bằng `createTestApp` (đếm bằng grep), khớp R13; `createTestApp` có sẵn `providers` để thay port theo từng test
  (`test/support/create-test-app.ts:54-55,95`).
- Các smoke cũ không tự ký token và không dùng lại token sau khi khóa hay đăng xuất; `smoke-buoc-0-3-fixes` không dùng Lan sau bước khóa. Admin e2e-real khóa rồi mở
  khóa Khoa nhưng không dùng lại token cũ của Khoa. Chưa chạy, nên vẫn ghi ở "Nghi ngờ".
- `deleting_by` (plan thêm): hợp lý và đã ghi vào design §12; xem P1.

## Nghi ngờ (chưa kiểm được)

- **Cookie qua chuyển trang khác site** (P11): không kiểm được nếu không chạy trình duyệt với Google thật hoặc host khác site.
- **Smoke cũ sau M1** (D24, D29: chặn ngay khi khóa, đăng xuất): đọc code không thấy bước nào hỏng, nhưng chưa chạy.
- **Admin đăng xuất khi gặp chuỗi Google** (Task 28, B8E44): cổng admin hiện đăng xuất **phía server** cho người không phải nhân sự
  (`apps/admin/src/auth/session-store.ts:171-179`, `logout('no-access')`). Làm y vậy với chuỗi Google sẽ thu hồi luôn chuỗi Google của tab `/app` (một cookie chung,
  design §5.7): Hà bị đăng xuất cả ở trang học. Có thể chấp nhận; nên ghi vào test flow để không bị coi là lỗi.
- **`createApplicationContext` gọi `onApplicationBootstrap`**: kết luận "scheduler chạy ở cả worker" ở P4 dựa trên việc worker dựng đủ `AppModule`; theo hành vi đã biết
  của Nest là có, nhưng chưa chạy để thấy log.

## Kết luận

Thực thi được **sau khi sửa plan** theo P1–P3 (bắt buộc: chúng làm hỏng đường hồi phục, đường khôi phục backup và một hợp đồng API mà web dựa vào) và P4, P6–P10,
P12 (sửa thẳng vào plan, không cần quyết định mới). P13–P25 sửa trong lúc làm task tương ứng cũng được, nhưng rẻ hơn nếu ghi luôn vào plan. Cần chủ dự án: **Q1** (P5)
và **Q2** (P11). Không phát hiện nào đòi mở lại D1–D30.

## Câu cần chủ dự án quyết

**Cập nhật 29/10/2026 — chủ dự án đã trả lời:** Q1 = **(b)** (khi nhà cung cấp đã nhận lệnh tắt gia hạn, Wordmet tự ghi `cancel_at_period_end = true` rồi xóa
ngay); Q2 = **(c)** (chạy Google thật một lần sớm ngay sau khi M3 merge, trước M5, và một lần cuối cho B8A8). Claude đồng ý cả hai. Với (b), Claude thêm điều kiện:
chỉ tự ghi khi lời gọi bộ nối **trả về thành công trong thời hạn** (hết giờ, lỗi, không hỗ trợ vẫn là 409 `renewal-not-cancelled`); ghi dưới khóa
`entitlements.user`, log `subscription_cancel_recorded_locally` (chỉ id); sự kiện `cancel_scheduled` tới sau là lặp, không đổi gì. Cần ghi thành D31, D32 trong
decision record.

Theo luật D1: chủ dự án trả lời trước, Claude đề xuất sau. Dưới đây chỉ có bối cảnh và ràng buộc; các cách không xếp theo thứ tự ưu tiên.

**Q1. Admin xóa một người học đang có gói tự gia hạn (P5).**
Design §7.1 (Đề xuất) cho app tắt gia hạn ở nhà cung cấp trước rồi mới xóa; lỗi thì 409 `renewal-not-cancelled`. Nhưng Wordmet chỉ biết gói đã tắt gia hạn khi nhà
cung cấp gửi lại sự kiện `cancel_scheduled`, và bộ xóa Entitlements (B8E52) không cho xóa khi gói còn ghi "đang tự gia hạn".
Ví dụ: Lan nhờ admin xóa qua thư. Admin bấm "Xóa tài khoản" lúc 10:00; nhà cung cấp nhận lệnh tắt gia hạn nhưng tới 10:03 mới gửi sự kiện. Các cách có thể: (a) chấp
nhận: admin thấy "đang hoàn tất", Lan ở `deleting`, việc thử lại xóa xong trong khoảng 10 phút tới một giờ sau khi sự kiện về, nếu sự kiện không bao giờ về thì kẹt và
có log cảnh báo; (b) khi nhà cung cấp đã nhận lệnh, Wordmet tự ghi `cancel_at_period_end = true` cho gói đó rồi xóa ngay (sự kiện về sau là lặp, không đổi gì);
(c) chặn như người học: admin phải đợi sự kiện về rồi bấm lại. Ràng buộc: hiện chỉ có nhà cung cấp giả; B8A4 đang ghi "như B8A3", tức 204.

**Q2. Lúc nào chủ dự án chạy đăng nhập Google thật (P11).**
D4 chốt có đăng nhập Google thật trong "Xong khi"; plan để nó ở bước cuối (Task 33), sau khi web người học (M5) đã làm xong. Hai giả định (trình duyệt giữ cookie
phiên sau khi Google chuyển về; Google nhận PKCE với client "Web") chỉ biết được ở lần chạy thật, và nếu sai thì phải sửa cả API (M3) lẫn web (M5).
Ví dụ: M3 merge ngày X. Các cách có thể: chủ dự án làm §5.1 (tạo OAuth client, không tốn tiền) và đăng nhập thử một lần bằng `curl`/trình duyệt ngay sau ngày X,
trước khi M5 bắt đầu; hoặc giữ ở cuối như plan và chấp nhận có thể phải làm lại một phần M3, M5; hoặc làm cả hai (một lần sớm, một lần cuối cho B8A8). Ràng buộc:
lần thử sớm cần web đã có nút (M5) nếu muốn đi đúng đường người học; không có nút thì vẫn thử được bằng cách mở thẳng `/v1/auth/google/start` trên trình duyệt.
