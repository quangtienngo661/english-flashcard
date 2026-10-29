# Review độc lập Bước 8 (Google sign-in, xóa tài khoản, "Hủy gói") — 29/10/2026

Phạm vi: code trên nhánh `docs/review-buoc-1-8` (cắt từ `origin/dev` @ `867d385`, đã gồm PR #172–#182). Chỉ đọc code và tài liệu; không chạy
migration, không đụng DB `english_learning`, không gọi Google hay AI thật. Worktree không có `node_modules` nên **không chạy lại** unit test;
bằng chứng chạy là CI trên PR (`gh pr checks`) và các file output đã commit. Không báo lại những gì review cuối
(`../2026-10-29-buoc-8-final-review.md`: C1, I1–I3, M1–M8) đã nêu, trừ chỗ bản sửa hoặc lý do bỏ qua không đủ.

Mức: **Cao** = có kịch bản hỏng cụ thể về bảo mật, tiền, mất dữ liệu, quyền; **Vừa**; **Thấp**.

---

## (a) Bảng "Xong khi" (design §16, §17)

| Mục | Trạng thái | Bằng chứng |
|---|---|---|
| CI xanh trên mọi PR (`api`, `web`, `admin`, `admin-e2e-real`) | **Verified** | `gh pr checks` cho #173–#181: cả 4 job `pass` ở mỗi PR (chạy trong phiên review này) |
| Unit cho ID token, bảng callback, từng bộ xóa, registry, "mọi cột có chủ", guard, hủy gói, việc định kỳ | Có file test, xanh trong CI | Không chạy lại (không có `node_modules`). Lưu ý: unit của bộ xóa chỉ ghi lại câu lệnh với Prisma giả và **giao phần chứng minh cho smoke** (xem B8-1) |
| B8A7: thêm cột trỏ tới người dùng mà không khai báo → test đỏ | Có test, có đối chứng | `account-data-map.spec.ts:32-41` (đối chứng `>= 54` cột, có `practice_reports.user_id`). Chưa kiểm "răng" bằng cách cố ý thêm cột (review read-only). Test chỉ bắt cột **chưa khai báo**, không bắt bộ xóa làm khác bảng khai báo |
| Web và admin: "unit và e2e mock cho màn mới" | **Không làm** (e2e mock) | `grep -rli "google\|delete-account\|account-deleted" apps/web/e2e` → chỉ khớp chữ `cancel` vô can ở `m4b.spec.ts:29` và `cai-thien-a-speak.spec.ts:62`; admin `e2e/` không có ca nào cho xóa người dùng, `password-login-required`, hai cài đặt mới. Plan (Task 23–30) đã thu hẹp xuống unit. Xem B8-4 |
| `admin-e2e-real`: một ca admin xóa người học | Verified (CI pass) | `apps/admin/e2e-real/delete-user.real.spec.ts` — người học vừa tạo, **không có dữ liệu học** |
| `pnpm smoke:buoc-8` trên DB mới | **Verified, phủ hẹp hơn lời ghi** | `docs/deliveries/buoc-8-smoke-output.txt`: 20/20 bước hai lần. Nhưng bước xóa chỉ có dữ liệu ở **8/53** cột (`buoc-8-smoke-output.txt:27`); Practice, grant, notice, câu tự viết, `ai_call_contents` chưa từng có hàng (B8-1) |
| Smoke: "lời gọi AI giả chậm bị xóa giữa chừng rồi chờ lượt quét (R1)" | Mô phỏng | `smoke-buoc-8.mjs:557-564` chèn hàng `ai_operations` bằng `psql` **sau** khi xóa; chứng minh sweep, không phải một request thật đang chạy qua guard |
| Smoke: B8E49 thời gian xóa người học lớn | Verified hẹp | `smoke-buoc-8.mjs:604-607`: 50 000 `learning_log` + 2 000 `entries` **không có sense**; các bảng Practice rỗng (B8-1, B8-3) |
| Kèm `smoke:buoc-0-3-fixes`, 4, 5 (hai chế độ), 6, 7 | Chỉ có lời ghi | Bảng bằng chứng ở `docs/deliveries/buoc-8.md`; `git log 9e35eb5..HEAD -- 'docs/deliveries/*smoke-output*'` chỉ ra 3 commit, đều của `buoc-8-smoke-output.txt`. Chạy trên `feat/buoc-8-m7`, trước PR #181 |
| Google thật lần 1 và 2 (D32), hai `ASSUMPTION` §19, B8A8 | **Chưa làm** (đã biết) | `buoc-8.md` "Chưa kiểm"; `buoc-8-rulings.md` N2 |
| Trình duyệt: trang Google giả ở host khác site (`127.0.0.1`, plan review P11) | **Chưa làm** | `grep -rn "127.0.0.1" apps/web/e2e apps/web/playwright*.ts apps/api/scripts/smoke-buoc-8.mjs` → rỗng |
| "Claude chạy thật" trên stack Docker, chụp màn | **Chưa làm** (đã biết, R16) | `buoc-8-rulings.md` R16 |
| Kết quả kiểm tay A1–A12, B2, B3 của chủ dự án | Chưa có | `buoc-8.md` mục cuối "(chưa có …)" |

---

## (b) Mục mở và nơi theo dõi

`docs/preparation/IMPROVEMENT_PLAN_2026-10-28.md:9` ghi rõ "Không nằm trong bản này: Bước 8", nên nơi theo dõi duy nhất ngoài chính các file Bước 8 là
`docs/deliveries/deploy-checklist.md` mục "Bước 8".

| Mục mở | Nguồn | Theo dõi ở đâu |
|---|---|---|
| Google thật lần 1, 2 + hai `ASSUMPTION` (cookie `refresh_token` Strict sau chuyển trang; PKCE S256 với client Web có secret) | D32, design §19, N2 | deploy-checklist ✓ |
| Task 23 (nút Google ở web) làm tạm | R13, N3 | Gián tiếp (deploy-checklist: "thất bại → phương án dự phòng §19") |
| Lượt kiểm trình duyệt có chụp màn, Google giả khác site (P11) | R16, design §17 | **Chưa theo dõi** ngoài `buoc-8.md` / rulings |
| Kết quả kiểm tay A1–A12, B2, B3 | test flow | **Chưa theo dõi** ngoài chỗ trống ở `buoc-8.md` |
| e2e mock cho màn mới của web và admin | design §17 | **Chưa theo dõi** (không ai ghi là bỏ) — B8-4 |
| Unit test đỏ ngẫu nhiên (timeout 5 s, "chưa tìm ra gốc") | `buoc-8.md` bảng bằng chứng | **Chưa theo dõi** |
| `clockTolerance` cho `jwtVerify` | final review "Declined to judge" | **Chưa theo dõi**; mức cần thiết thấp hơn ghi (xem mục "Đã kiểm") |
| Thứ tự khóa hàng trong xóa hàng loạt; `google-round1-account.mjs` không chốt tên DB | final review | **Chưa theo dõi** |
| M1 (replay `by=self`), M3 (tắt gia hạn từng phần) | R21 | deploy-checklist ✓ |
| M7 (sweep cả tài khoản `cleanup`) | R21: bỏ, "tốn một chút" | Bỏ — lý do không còn đứng khi bảng không có index `user_id` (B8-3) |
| Scheduler ở cả API và worker; pool kết nối; log lỗi Tx B (R6, R8) | design §19 | deploy-checklist ✓ |
| Danh sách đã xóa ngoài DB; thời hạn backup và log | D21 | deploy-checklist ✓ |
| Câu 26 (tự liên kết email không do Google quản lý) | design §19 | deploy-checklist ✓ |
| Google giả là lối vào mọi tài khoản nếu bật ở môi trường ra internet | final review | deploy-checklist ✓ (code chỉ chặn khi cùng `BILLING_PRODUCTION`, `app-config.ts:271-275`) |
| Yêu cầu xóa tới 120 s so với reverse proxy | final review | deploy-checklist ✓ |
| Dòng "Dọn tài khoản chưa từng xác nhận email sau N ngày" | đợt cải thiện A | **Cũ**: còn `[ ]` ở `deploy-checklist.md:115` dù Bước 8 đã làm (`deletion-jobs.service.ts:78-92`) — B8-6 |

---

## (c) Phát hiện

<a id="b8-1"></a>
### B8-1 — Vừa — Smoke không chứng minh "xóa sạch mọi module" trên Postgres thật như as-built và unit test nói

- **Mô tả:** `docs/deliveries/buoc-8.md` ghi smoke "xóa sạch **53 cột** `user_id`/`*_user_id`/`*_by` của mọi bảng (đếm trước/sau)", và tiêu đề bước là
  "every module erased". Ba file unit của bộ xóa tự nói phần thật để cho smoke: `practice/maintenance/account-eraser.provider.spec.ts:24` ("real effects are
  proven in the smoke"), `content/private/account-eraser.provider.spec.ts:23` ("cascades and the entries_clear_form_kind trigger are proven in the smoke"),
  `entitlements/account-deletion.provider.spec.ts:76` ("cascades, uniqueness and the real run are in the smoke"). Smoke không cung cấp điều đó.
- **Bằng chứng:**
  - `buoc-8-smoke-output.txt:27`: `before: rows in 8 of 53 user columns` (lần 2 cũng vậy, dòng 115). Bước chỉ gieo dữ liệu ở 6 cột (`smoke-buoc-8.mjs:352-365`:
    group, idempotency key, reminder prefs, `entries` không sense, `ai_operations`, `usage_records`); hai cột còn lại là bảng Identity.
  - Đếm trong `apps/api/scripts/smoke-buoc-8.mjs`: `/v1/practice` 0, `sentences` 0, `entitlements/grants|entitlement_grants` 0, `entitlement_notices` 0,
    `ai_call_contents|ai:fake-call` 0; đối chứng `/v1/groups` 1.
  - Từ riêng trong smoke chỉ là hàng `entries` trơn (`smoke-buoc-8.mjs:357`, `:607`), không có `senses`/`sense_revisions`/`sense_revision_texts`/câu, nên cascade và trigger
    mà spec Content giao cho smoke chưa chạy lần nào trên DB thật.
  - `admin-e2e-real` xóa một tài khoản vừa tạo, không dữ liệu (`delete-user.real.spec.ts:16-17`).
- **Chưa từng chạy trên Postgres thật:** xóa `practice_session_items` → `practice_questions` (FK RESTRICT, `20261018150000_practice/migration.sql:111`), `practice_sessions`,
  `practice_ai_requests`, `practice_word_checks`, `learning_items`, `context_sentences`, `reminder_deliveries`, `entitlement_grants` (+ cascade `entitlement_grant_changes`),
  `entitlement_notices`, và câu `DELETE … USING` của `ai_call_contents` trong nhánh có `tx` (`ai.service.ts:46`).
- **Kịch bản hỏng:** một câu lệnh của bộ xóa lỗi trên Postgres thật (FK, cú pháp raw SQL, timeout khi bảng lớn) với người học **đã từng luyện tập** → Tx B rollback, tài khoản
  kẹt `deleting`, retry hỏng mỗi giờ, quá hạn 20 ngày luật định. CI và smoke đều xanh vì không người học nào trong đó có dữ liệu Practice/grant/notice.
  Xác suất thấp (đọc code thấy thứ tự đúng; unit kiểm thứ tự), nhưng lời ghi "đã chứng minh" là sai.
- **Đề xuất:** trong smoke, dựng một người học bằng luồng thật (một phiên luyện tập có trả lời, một câu tự viết, một từ riêng **có sense** qua API, một lần cấp gói có đổi ngày,
  một notice, một lời gọi `ai:fake-call`) rồi xóa và giữ `referencesTo` phải về 0; đo lại B8E49 với bảng Practice có dữ liệu. Sửa câu "xóa sạch 53 cột" ở `buoc-8.md` cho đúng
  phạm vi.

<a id="b8-2"></a>
### B8-2 — Vừa — "Đặt mật khẩu" trong Cài đặt của tài khoản chỉ có Google không mở được trang quên mật khẩu

- **Mô tả:** design §9.3 (IR7, review R20): tài khoản chỉ có Google thấy dòng "Đặt mật khẩu" dẫn sang "Quên mật khẩu". Link trỏ tới `/{locale}/app/forgot-password`
  (`apps/web/src/features/learner/settings/SettingsPage.tsx:179-185`, `Link` ở `:253`). Trang đó nằm trong nhóm route `(auth)` bọc `AuthGate`
  (`apps/web/src/app/[locale]/app/(auth)/layout.app.tsx:5-6`). `AuthGate` (`apps/web/src/features/learner/auth/AuthGate.tsx`, 29 dòng) chuyển ngay người **đang đăng nhập**
  sang `safeNext(?next)` = `/{locale}/app` (`locale-prefix.ts:6-8`). Không có ngoại lệ nào cho `forgot-password` (ngoại lệ duy nhất là trạng thái `change-password`,
  `RequireSession.tsx:70`, không phải `signed-in`).
- **Kịch bản hỏng:** Minh (chỉ có Google) vào Cài đặt → bấm "Đặt mật khẩu" → bị đưa về trang Hôm nay. Không có cách thêm mật khẩu khi còn đăng nhập; phải tự đăng xuất rồi
  tìm "Quên mật khẩu". Ảnh hưởng thêm: nhân sự chỉ có Google cần mật khẩu để vào admin (§5.7) cũng đi đường này.
- **Test thiếu răng:** `settings.test.tsx:195` chỉ kiểm `href`. Test flow A3 chỉ kiểm dòng có hiện. Chưa chạy trong trình duyệt (kết luận từ đọc code).
- **Đề xuất:** cho `forgot-password` (hoặc một route "đặt mật khẩu" riêng) không bị `AuthGate` chuyển khi đến từ Cài đặt (ví dụ `?reason=set-password` như `change-password`), thêm
  một test hành vi: người đang đăng nhập mở link thì thấy form.

<a id="b8-3"></a>
### B8-3 — Vừa — Bộ xóa quét toàn bảng ở nhiều bảng lớn vì không có index theo `user_id`; sweep mỗi giờ nhân lên

- **Mô tả:** các câu `WHERE user_id = $1` của bộ xóa trên những bảng sau không có index dùng được (chỉ có index không bắt đầu bằng `user_id`, hoặc index partial
  mà điều kiện không suy ra được):
  - `practice_questions` — chỉ partial `(user_id, sense_id) WHERE source = 'ai'` (`migrations/…buoc7_practice_ai/migration.sql:144`);
  - `practice_sessions` — chỉ partial unique `WHERE status IN ('active','waiting_continue')` (`…practice/migration.sql:133`) và `(status, last_activity_at)`;
  - `practice_reports` (DELETE và UPDATE) — chỉ `(status, created_at)`, `item_id`;
  - `practice_ai_requests` — chỉ partial `WHERE state = 'generating'` (`…buoc7_practice_ai/migration.sql:142`) và `(session_id, state)`;
  - `billing_events` — `OR` trên `user_id`, `app_user_id`, `subscription_id` (`entitlements/account-deletion.provider.ts:89-92`); index chỉ có `dedupe_key`, `(status, received_at)`,
    `(provider, environment, transaction_id)`;
  - `entitlement_notices` — `OR` trên `user_id`, `recipient_user_id` (`:97`); unique bắt đầu bằng `kind`;
  - `idempotency_keys` — unique `(key, user_id, endpoint)` (`…/migration.sql:22`), `deleteIdempotencyKeysOf` lọc theo `user_id`.
  Đối chứng: các bảng có index đúng — `practice_session_items (user_id, …)`, `learning_log (user_id, …)`, `usage_records (user_id, …)`, `billing_transactions (user_id, …)`,
  `context_sentences (user_id, sense_id)`, `ai_calls (user_id)`, `entries` partial `(owner_user_id, …) WHERE scope='private'` (khớp điều kiện của bộ xóa).
- **Vì sao nhân lên:** `identity.deletion-sweep` chạy lại **cả sáu bộ xóa** cho mọi `deleted_accounts` trong 24 giờ, mỗi giờ, ở cả API và worker
  (`deletion-jobs.service.ts:58-75`), kể cả tài khoản `cleanup` (M7, tới 200/giờ). Review cuối M7 ước "~4.800 transaction sáu bộ xóa mỗi giờ" và R21 bỏ vì "tốn một chút";
  ước lượng đó ngầm coi mỗi câu lệnh là tra index. Với bảy bảng trên, mỗi transaction là vài lần quét toàn bảng.
- **Kịch bản hỏng (suy từ schema, chưa đo):** sau ra mắt, `practice_questions` và `idempotency_keys` lên hàng triệu dòng; một đợt bot tạo tài khoản rác (5 đăng ký/giờ/IP, nhiều IP)
  làm việc dọn xóa 200 tài khoản/giờ → sweep chạy hàng nghìn lượt quét toàn bảng mỗi giờ ở hai process, giữ kết nối tới 120 s mỗi lượt → DB chậm cho mọi người, xóa tài khoản
  thật vượt 120 s và rơi vào `deleting`. B8E49 (0,3 s) đo khi các bảng này rỗng nên không nói gì về điều này.
- **Đề xuất:** thêm index `user_id` (hoặc bắt đầu bằng `user_id`) cho các bảng trên và cho `billing_events(app_user_id)`, `billing_events(subscription_id)`,
  `entitlement_notices(recipient_user_id)`; lọc sweep `by <> 'cleanup'` (M7); đo lại B8E49 với bảng Practice có dữ liệu.

<a id="b8-4"></a>
### B8-4 — Thấp — e2e mock cho màn mới (design §17) không có, và bảng bằng chứng nêu 318 ca web e2e như thể phủ Bước 8

- **Bằng chứng:** design §17 "Web và admin: unit và e2e mock cho màn mới". `apps/web/e2e/app/` không có spec Bước 8 (grep ở bảng (a)); admin `e2e/` không có ca nào cho
  `users/:id/delete`, `password-login-required`, `auth_method`, `unverified_cleanup`, `transaction_retention`, `last_admin` (grep `e2e/support/mock-api.ts e2e/*.spec.ts` rỗng).
  Plan Task 23–30 chỉ yêu cầu unit; không chỗ nào ghi quyết định bỏ e2e. `buoc-8.md` liệt kê "web e2e … **318** ca xanh" trong bảng bằng chứng của Bước 8.
- **Kịch bản hỏng:** lỗi chỉ thấy khi điều hướng thật giữa các trang (như B8-2, hay chuỗi chuyển trang Google → API → web) lọt qua mọi lớp test; lượt trình duyệt R16 là chốt chặn
  duy nhất còn lại và chưa chạy.
- **Đề xuất:** ít nhất một e2e mock cho: nút Google → quay về `?signed_in=google`; trang hoàn tất đăng ký; xóa tài khoản (mật khẩu và Google, gồm `reauth-required`); "Hủy gói";
  "Đặt mật khẩu". Ghi rõ trong `buoc-8.md` rằng 318 ca là hồi quy, không phải Bước 8.

<a id="b8-5"></a>
### B8-5 — Thấp — Giả định "tài khoản chưa xác minh không có dữ liệu học" sai với dữ liệu tạo trước 26/10/2026

- **Mô tả:** design §5.5 và B8E6: khi hoàn tất đăng ký Google vào email của một tài khoản **chưa xác minh**, app **dùng lại id** của tài khoản đó vì "Tài khoản đó không thể có
  dữ liệu học (chưa xác minh thì không có phiên)". Việc chặn đăng nhập khi chưa xác minh chỉ có từ commit `9fa1c11` (26/10/2026, "refuse sign-in until the email is verified",
  `git log -S"kind: 'unverified' as const" -- src/identity/auth/auth.service.ts`); trước đó tài khoản chưa xác minh đăng nhập và học được. Refresh nay thu hồi chuỗi của tài khoản
  chưa xác minh (`session.service.ts:165-169`), nên dữ liệu mới không sinh thêm, nhưng dữ liệu cũ vẫn nằm đó.
- **Kịch bản hỏng:** trên một DB có từ trước 26/10 (DB cục bộ của chủ dự án, hoặc nếu dữ liệu thử đó từng được mang lên môi trường thật), X đăng ký `minh@gmail.com` không xác minh
  nhưng đã học (nhóm, từ riêng, gói). Minh thật hoàn tất Google → `google-auth.service.ts:266-286` ghi đè hồ sơ trên **id của X** → Minh thấy nhóm, từ riêng, lịch sử, gói của X.
  Không có DB production nên ảnh hưởng hiện chỉ ở DB cục bộ.
- **Đề xuất:** ghi giả định này vào deploy-checklist ("DB production phải tạo mới, không mang tài khoản chưa xác minh từ trước 26/10"), hoặc khi dùng lại id thì chạy bộ xóa dữ liệu
  module cho id đó trước.

<a id="b8-6"></a>
### B8-6 — Thấp — Theo dõi và tài liệu lệch thời gian

- `CLAUDE.md:166-167`: "Bước 0–7 are implemented … **Step 8 is still decided-but-not-scaffolded**" — sai từ 29/10 (cùng file, mục "Bước 8", ghi đã merge).
- `deploy-checklist.md:115`: mục "Dọn tài khoản chưa từng xác nhận email sau N ngày" còn `[ ]` dù `identity.unverified-cleanup` đã có (`deletion-jobs.service.ts:36, 78-92`).
- Các mục mở không có nơi theo dõi ngoài file Bước 8 (bảng (b)): lượt trình duyệt R16 và P11, kết quả kiểm tay, unit test đỏ ngẫu nhiên, e2e mock bỏ ngầm.
- Smoke hồi quy (0–3, 4, 5×2, 6, 7) chỉ có lời ghi trong `buoc-8.md`, không lưu output mới (bảng (a)).
- **Đề xuất:** một mục "Bước 8 còn mở" trong improvement plan hoặc deploy-checklist liệt kê các dòng **Chưa theo dõi** ở bảng (b); sửa hai dòng cũ.

<a id="b8-7"></a>
### B8-7 — Thấp — Màn xóa tài khoản nói "lượt dùng" bị xóa, trong khi sổ lượt được giữ từng dòng dưới mã ẩn danh

- **Bằng chứng:** `apps/web/messages/vi.json` mục `App.deleteAccount.deleted.plans` = "Gói và lượt dùng của bạn" (cột "Những gì bị xóa"). Design §7.3: `usage_records` **giữ** với
  `user_id` = mã ẩn danh (D16), và §7.3 nói màn cảnh báo và chính sách riêng tư "dùng **một** bản chữ dựng từ bảng này". Code giữ đúng design
  (`entitlements/account-deletion.provider.ts:100-101`). Cùng một mã ẩn danh dùng cho sổ lượt, giao dịch và báo lỗi (`account-deletion.service.ts:135-137`), mà giao dịch còn
  mã giao dịch của nhà cung cấp (design §19: tra ngược được ra người mua) — nên dòng giữ lại là theo từng người, không phải "số liệu tổng hợp" như dòng `kept.totals`.
- **Kịch bản hỏng:** người học (và chính sách riêng tư chép từ màn này) được bảo lượt dùng đã xóa; thực tế từng dòng còn, nối được với nhau qua một mã.
- **Đề xuất:** đổi chữ thành "Gói của bạn" ở cột xóa và thêm "Lịch sử dùng lượt, không kèm tên" ở cột giữ; nêu điều này trong mục chính sách riêng tư của deploy-checklist.

<a id="b8-8"></a>
### B8-8 — Thấp — Lệch giữa design, plan và test flow không được ghi lại trong design

- design §9.1: nút Google "xóa cờ `logout-pending`" **trước khi** chuyển trang; code xóa cờ **khi quay về** với `?signed_in=google`
  (`apps/web/src/app-shell/session/session-store.ts:243-246`, ghi "plan review P21"). Design không được sửa theo.
- design B8A8: "đăng xuất, đăng nhập lại được"; test flow B3 (`buoc-8-test-flow.md`) không có bước đăng xuất rồi đăng nhập lại bằng Google thật.
- design §17 e2e mock → plan chỉ unit (B8-4).
- **Đề xuất:** ghi chú as-built ở design §9.1, §17; thêm bước đăng xuất/đăng nhập lại vào B3.

---

## Đã kiểm, không thấy vấn đề (kèm chỗ đọc)

- Bản sửa **C1** đúng: `sealed-cookie.ts` niêm phong mục đích bên trong (`p`), `openJson` đòi đúng mục đích; ticket dùng `'reauth-ticket'` (`google-auth.service.ts:145`), bằng chứng
  dùng `'reauth-proof'` (`:153`, `:191`); test `sealed-cookie.spec.ts:28-32` thử mọi cặp mục đích. **I1**: `google-auth.service.ts:267-269` trả `email-taken` khi hàng đã mất.
  **I2**: `account-deletion-requests.service.ts:60-68` chạy bước tắt gia hạn cả khi đích đang `deleting`. **I3**: `DeleteAccountPage.tsx:101-104, 121`. **M4**:
  `account-deletion.service.ts:141, 145`. **M6**: `staff.controller.ts:47`, `UserDetail.tsx:102`. **M8**: `google-auth.controller.ts:35-76`.
- `next`/redirect: `learner-redirect.ts` `safeNext` parse bằng `new URL`, đòi cùng origin và `^/(vi|en)/app(/|$)`; redirect URI cố định ở cả authorize và exchange
  (`google-client.real.ts:31, 47`); Google giả kiểm `redirect_uri` (`fake-google.controller.ts:41`).
- ID token (`google-client.ts:45-66`): chữ ký JWKS, `iss` hai dạng, `aud`, nonce, RS256/ES256, `sub` và `email` bắt buộc, `email_verified` chỉ `true`/`"true"`. Ghi chú:
  jose 6.2.12 (đọc `apps/api/node_modules/jose/dist/webapi/lib/jwt_claims_set.js:64-86` ở checkout chính) chỉ kiểm `exp`/`nbf` **khi có**, không đòi, và không kiểm `iat`
  khi không có `maxTokenAge`. Token do Google ký nên không phải lỗ; nhưng lo ngại `clockTolerance` của review cuối chỉ còn ở `nbf`/`exp`.
- Email chưa xác minh không chiếm được tài khoản: `email_verified` khác true → `google-email-unverified` (`google-auth.service.ts:174`); tài khoản đích chưa xác minh → đi màn
  hoàn tất, không gắn ở callback (`:205-226`).
- Admin cuối cùng không tự xóa được: route người học trả `staff-account` (`account-deletion-requests.service.ts:44`, `account-deletion.service.ts:106`); route admin trả
  `self-delete` (`account-deletion-requests.service.ts:58`, `account-deletion.service.ts:109`); `last-admin` đếm bỏ `deleting` (`:110-113`). Editor không gọi được route xóa:
  `@RequirePermission('roles.manage')` cấp lớp (`staff.controller.ts:17-18`), route xóa không ghi đè (`:111-119`).
- Refresh token thu hồi ngay: Tx A `revokeAllForUser` (`account-deletion.service.ts:118`); refresh từ chối `deleting` (`session.service.ts:159-164`); guard từ chối mỗi request
  (`auth.guard.ts:29-30`).
- Tiền: sổ lượt và giao dịch giữ dưới mã ẩn danh, `billing_events` (cả payload) xóa (`entitlements/account-deletion.provider.ts:89-101`) đúng D15/D16; "Hủy gói" không có đường hoàn
  tiền, cần `Idempotency-Key` (`me-subscriptions.controller.ts:16-23`), gói của người khác trả cùng 409 (`subscription-cancel.service.ts:36-40`).
- Ranh giới D3: không file nào trong `src/identity` import `entitlements|learning|practice|content|ai|notifications|settings`; `src/common` không import `identity`; ngoài
  `src/identity` chỉ CLI `src/cli/accounts-deletions-args.ts:23,55,59` đọc bảng Identity (CLI, không phải module).
- Log: các lời gọi log mới ở `src/identity/google`, `src/identity/deletion` (12 lời gọi), hai service Entitlements chỉ mang `user_id`/`subscription_id`/mã lỗi Prisma.
- Migration `20261029090000_buoc8_identity`: CHECK cho `status`, `deleting_by`, `auth_method`, `provider`, `by`; unique `(provider, subject)`, `(user_id, provider)`; index
  `deleted_accounts(deleted_at)` cho sweep.

---

## (d) Lệnh tìm "không có" và đối chứng

| Kết luận "không có" | Lệnh | Đối chứng (thứ chắc chắn có) |
|---|---|---|
| Smoke không gieo dữ liệu Practice/câu/grant/notice/AI content | `grep -c "/v1/practice" …` = 0, `sentences` = 0, `entitlements/grants\|entitlement_grants` = 0, `entitlement_notices` = 0, `ai_call_contents\|ai:fake-call` = 0 trên `apps/api/scripts/smoke-buoc-8.mjs` | `grep -c "/v1/groups"` = 1 |
| Web e2e không có spec Bước 8 | `grep -rli "google\|delete-account\|account-deleted\|Hủy gói\|cancel" apps/web/e2e` → chỉ `m4b.spec.ts:29` (`cancel_at_period_end: null`) và `cai-thien-a-speak.spec.ts:62` (`cancel: () => {}`) | `grep -rln "login" apps/web --include=*.spec.ts` ra `e2e/app/m1.spec.ts` |
| Admin e2e mock không có ca Bước 8 | `grep -n -i "users/.*delete\|password-login-required\|auth_method\|unverified_cleanup\|transaction_retention\|last_admin" e2e/support/mock-api.ts e2e/*.spec.ts` → rỗng | `grep -rln -i "delete" e2e` ra 5 spec (xóa nguồn, eval…) |
| Không có trang Google giả khác site | `grep -rn "127.0.0.1" apps/web/e2e apps/web/playwright*.ts apps/api/scripts/smoke-buoc-8.mjs` → rỗng | — (chính lệnh grep trên `google` ở smoke ra nhiều dòng, xem `smoke-buoc-8.mjs:264`) |
| Identity không import module khác | `grep -rn "from '\.\./\.\./\(entitlements\|…\)\|from '\.\./\(entitlements\|…\)" src/identity --include=*.ts \| grep -v spec` → rỗng | `grep -rln "from '../../common" src/identity` ra `auth.controller.ts`… |
| Không log email/token ở code mới | `grep -rn "logger\.\(info\|warn\|error\)" src/identity/google src/identity/deletion src/entitlements/account-deletion.provider.ts src/entitlements/api/subscription-cancel.service.ts \| grep -i "email\|token\|code\|subject"` → chỉ `user_id`, `subscription_id`, `code` = mã lỗi Prisma | Tổng lời gọi log ở hai thư mục Identity: 12 |
| Không có index `user_id` cho 7 bảng ở B8-3 | `grep -rhn "INDEX" prisma/migrations/*/migration.sql \| grep -E "practice_sessions\|practice_questions\|practice_reports\|practice_ai_requests\|billing_events\|entitlement_notices\|entries"` và `@@index/@@unique` trong `prisma/models/*.prisma` | Cùng lệnh ra index `user_id` của `practice_session_items`, `learning_log`, `usage_records`, `billing_transactions`, `context_sentences`, `entries` partial `owner_user_id` |
| `clockTolerance` chưa được theo dõi | `grep -rn -i "clockTolerance" docs/ apps/api/src` → chỉ `buoc-8-rulings.md:54` và final review | — |
| Output smoke hồi quy không được lưu trong Bước 8 | `git log --format="%h %ad %s" 9e35eb5..HEAD -- 'docs/deliveries/*smoke-output*'` → 3 commit, cả ba của `buoc-8-smoke-output.txt` | `ls docs/deliveries/*smoke-output*` ra 7 file (gồm 4, 5, 6, 7) |
| CI xanh trên mọi PR Bước 8 | `gh pr checks <n>` cho 173–181 → `admin`, `admin-e2e-real`, `api`, `web` đều `pass` | — |
