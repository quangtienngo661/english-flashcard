# Code facts cho design Bước 8: Google sign-in và xóa tài khoản (28/10/2026)

Đọc trên nhánh `docs/buoc-8-brainstorm` (HEAD `9e35eb5`, cùng commit với `dev` lúc đó), 28/10/2026, bằng một agent chỉ đọc; không đọc `.env`, không chạy
app. Mọi `path:line` là của bản đó; đường dẫn API tính từ `apps/api/`, trừ khi ghi rõ. Chỉ ghi code làm gì hôm nay, không đề xuất. Điều nào chỉ suy ra từ
đọc code, chưa chạy thật, ghi `CHƯA KIỂM`.

---

## 1. Mọi cột trỏ tới một user

Chỉ có **4 FK trỏ tới `users`**, đều `ON DELETE CASCADE`, đều trong Identity (`prisma/migrations/20261007120000_identity/migration.sql:96,99,105,108`).
Mọi cột khác là uuid trần (không FK), đúng quy ước D3. Không có `CHECK` hay trigger nào nhắc tới `users` ngoài `users_status_check`.

Loại hàng: **learner** = dữ liệu học của chính người học; **audit** = vết hành động của staff; **money** = tiền/gói; **AI log** = nhật ký gọi AI;
**khác** = nêu rõ.

| Module | Bảng | Cột | Null? | FK / ON DELETE | Loại | Nguồn |
|---|---|---|---|---|---|---|
| identity | `users` | `email` (varchar 254, unique) | không | — | khác: định danh | `prisma/models/identity.prisma:3`; unique `migrations/20261007120000_identity/migration.sql:90` |
| identity | `users` | `locked_by` | có | uuid trần | audit | `identity.prisma:18` |
| identity | `password_credentials` | `user_id` (PK) | không | FK → users, CASCADE | khác: credential | `identity.prisma:34,38`; migration `:96` |
| identity | `session_chains` | `user_id` | không | FK → users, CASCADE (`refresh_tokens` cascade theo chain, `:102`) | khác: phiên | `identity.prisma:45,53`; migration `:99` |
| identity | `otp_codes` | `user_id` | không | FK → users, CASCADE | khác: OTP | `identity.prisma:76,85`; migration `:105` |
| identity | `otp_failure_windows` | `user_id` (PK cùng `purpose`) | không | FK → users, CASCADE | khác: OTP | `identity.prisma:91,97`; migration `:108` |
| common | `idempotency_keys` | `user_id` | không | uuid trần | khác: replay 24 h (`response_body` JSON) | `prisma/models/common.prisma:3,8` |
| common | `rate_limit_counters` | `key` (text, chứa user id trần với luật `by: 'user'`) | không | — | khác: đếm giới hạn | `common.prisma:17`; dạng key `src/common/rate-limit/rate-limiter.service.ts:46-50` |
| settings | `app_settings` | `updated_by` | không | uuid trần | audit | `prisma/models/settings.prisma:6` |
| settings | `app_setting_changes` | `changed_by` | không | uuid trần | audit | `settings.prisma:18` |
| notifications | `reminder_prefs` | `user_id` (PK) | không | uuid trần | learner | `prisma/models/notifications.prisma:3` |
| notifications | `reminder_deliveries` | `user_id` | không | uuid trần | learner (nhật ký thư nhắc) | `notifications.prisma:14` |
| learning | `learning_groups` | `user_id` | không | uuid trần | learner | `prisma/models/learning.prisma:5` |
| learning | `learning_items` | `user_id` | không | uuid trần | learner | `learning.prisma:22` |
| learning | `learning_log` | `user_id` | không | uuid trần (append-only) | learner | `learning.prisma:54` |
| content | `entries` | `owner_user_id` (chỉ `scope = 'private'`) | có | uuid trần | learner (từ riêng) | `prisma/models/content.prisma:47-48` |
| content | `senses` | `state_changed_by` | có | uuid trần | audit (staff, hoặc chủ từ riêng: `src/content/private/private-words.service.ts:123-125`) | `content.prisma:103` |
| content | `sense_revisions` | `created_by` | **không** | uuid trần | audit (staff; với từ riêng là chính người học, `private-words.service.ts:118`) | `content.prisma:124` |
| content | `sense_revisions` | `reviewed_by` | có | uuid trần | audit | `content.prisma:128` |
| content | `sense_revisions` | `published_by` | có | uuid trần | audit (từ riêng: người học, `private-words.service.ts:118`) | `content.prisma:130` |
| content | `word_form_additions` | `added_by` | không | uuid trần | audit | `content.prisma:187` |
| content | `context_sentences` | `user_id` | không | uuid trần (FK `sense_id` → senses CASCADE) | learner | `content.prisma:198,203` |
| pipeline | `background_jobs` | `created_by` | không | uuid trần | audit | `prisma/models/pipeline.prisma:10` |
| entitlements | `entitlement_grants` | `user_id` | không | uuid trần | money (gói được cấp) | `prisma/models/entitlements.prisma:7` |
| entitlements | `entitlement_grants` | `granted_by` | không | uuid trần | audit | `entitlements.prisma:16` |
| entitlements | `entitlement_grants` | `revoked_by` | có | uuid trần | audit | `entitlements.prisma:19` |
| entitlements | `entitlement_grant_changes` | `changed_by` | không | uuid trần | audit | `entitlements.prisma:37` |
| entitlements | `subscriptions` | `user_id` | không | uuid trần | money | `entitlements.prisma:55` |
| entitlements | `billing_events` | `app_user_id` | có | uuid trần | money (inbox webhook) | `entitlements.prisma:98` |
| entitlements | `billing_events` | `user_id` | có | uuid trần | money | `entitlements.prisma:99` |
| entitlements | `trial_history` | `user_id` (unique) | không | uuid trần | money (chống dùng thử lại) | `entitlements.prisma:118` |
| entitlements | `billing_transactions` | `user_id` | không | uuid trần | money | `entitlements.prisma:130` |
| entitlements | `usage_records` | `user_id` | không | uuid trần | money (sổ lượt) | `entitlements.prisma:161` |
| entitlements | `entitlement_notices` | `user_id` | có | uuid trần | khác: thư gói | `entitlements.prisma:189` |
| entitlements | `entitlement_notices` | `recipient_user_id` | không | uuid trần | khác: thư gói | `entitlements.prisma:190` |
| entitlements | `fake_billing_subscriptions` | `user_id` | không | uuid trần | money (chỉ provider giả) | `entitlements.prisma:210` |
| practice | `practice_sessions` | `user_id` | không | uuid trần | learner | `prisma/models/practice.prisma:5` |
| practice | `practice_questions` | `user_id` | không | uuid trần | learner | `practice.prisma:40` |
| practice | `practice_session_items` | `user_id` | không | uuid trần | learner | `practice.prisma:71` |
| practice | `practice_reports` | `user_id` | không | uuid trần | learner (báo lỗi) | `practice.prisma:106` |
| practice | `practice_reports` | `resolved_by` | có | uuid trần | audit | `practice.prisma:116` |
| practice | `practice_ai_requests` | `user_id` | không | uuid trần | learner / AI | `practice.prisma:138` |
| practice | `practice_report_reasons` | `updated_by` | có | uuid trần | audit | `practice.prisma:169` |
| practice | `practice_word_checks` | `user_id` (PK cùng `sense_id`) | không | uuid trần | learner / AI | `practice.prisma:192` |
| ai | `ai_models` | `created_by` | không | uuid trần | audit | `prisma/models/ai.prisma:26` |
| ai | `ai_operation_settings` | `updated_by` | có | uuid trần | audit | `ai.prisma:47` |
| ai | `ai_operation_setting_changes` | `changed_by` | không | uuid trần | audit | `ai.prisma:61` |
| ai | `ai_prompts` | `updated_by` | không | uuid trần | audit | `ai.prisma:74` |
| ai | `ai_prompt_revisions` | `saved_by` | không | uuid trần | audit | `ai.prisma:87` |
| ai | `ai_operations` | `user_id` | không | uuid trần | AI log (replay 24 h) | `ai.prisma:97` |
| ai | `ai_calls` | `user_id` (learner, hoặc admin của lần gọi test/eval) | có | uuid trần | AI log ("kept for good") | `ai.prisma:118,146-147` |
| ai | `ai_eval_examples` | `created_by` | không | uuid trần | audit | `ai.prisma:173` |
| ai | `ai_eval_runs` | `started_by` | không | uuid trần | audit | `ai.prisma:203` |

**Đếm theo module (53 cột):** identity 6 (gồm `users.email`), common 2 (gồm `rate_limit_counters.key`), settings 2, notifications 2, learning 3,
content 7, pipeline 1, entitlements 13, practice 8, ai 9.

**User id hoặc email nằm trong JSON / text, không phải cột riêng:**
- `billing_events.payload`, `raw_payload`: chú thích ghi `raw_payload` "May hold the buyer's email" (`entitlements.prisma:103-104`); xóa sau 90 ngày (mục 9).
- `fake_billing_subscriptions.history`: danh sách event đã nhận (`entitlements.prisma:223`); có chứa app user id hay không: `CHƯA KIỂM`.
- `entitlement_notices.subject_key` = subscription id (`entitlements.prisma:192-193`); `usage_records.note` = report id (`entitlements.prisma:177-178`).
- `idempotency_keys.response_body`, `ai_operations.result` / `meta`: nội dung response; có email hay không tùy endpoint: `CHƯA KIỂM`.

**Bảng giữ chữ do người học tự viết:**
- `context_sentences.text` (`content.prisma:200`).
- Từ riêng: `entries.lemma` khi `scope = 'private'` (`content.prisma:41,47`), `sense_revisions.examples` (`:131`), `sense_revision_texts.text` (nghĩa, `:153`); xóa
  `entries` thì cascade xuống senses, revisions, texts, levels, inflections, câu (`content.prisma:73,88,107,138,155,172,203`).
- `learning_groups.name` (tên nhóm, `learning.prisma:6`). `learning_log.answer` **không** phải chữ tự do: CHECK `('known','review')`
  (`migrations/20261017210000_learning/migration.sql:86`).
- `practice_session_items.answer_raw`, `answer_normalized`, `answers_tried` (`practice.prisma:79-81`).
- `practice_reports.note`, `question_snapshot` (`practice.prisma:110,114`).
- `practice_questions.prompt`: câu điền từ dựng từ câu đã lưu của người học chứa câu đó đã che (`src/practice/ai/ai-question.ts:101`).
- `practice_ai_requests.ai_input` ("The data sent to AI", `practice.prisma:145-146`); `ai_call_contents.request` / `response` (`ai.prisma:159-160`, giữ
  `contentRetentionDays`, mặc định 7, `src/settings/settings.definitions.ts:61`). Chi tiết dữ liệu nào của người học đi vào đó: `CHƯA KIỂM`.
- `users.given_name`, `family_name`, `birth_date` (`identity.prisma:12-14`).

---

## 2. Code xóa theo user đang có

Tìm `deleteUserData|deleteForUser|removeUser|anonymi|UserDataDeleter|forgetUser|purgeUser` trong `apps/`: chỉ ra `deleteUserData` (AI). `anonymi*`,
`removeUser`, `deleteForUser`: **không có**.

| Hàm | File | Xóa gì | Được gọi ở đâu | Test |
|---|---|---|---|---|
| `AiService.deleteUserData(userId)` | `src/ai/ai.service.ts:42-49` (chú thích "Account deletion (Bước 8; design §12.2, R14)") | Một `$transaction([...])`: xóa `ai_call_contents` của các call có `user_id` đó, xóa `ai_operations` của user, `UPDATE ai_calls SET user_id = NULL` (`:45-47`); không xóa hàng `ai_calls` | Chỉ CLI `ai:fake-call delete-user-data` (`src/cli/ai-fake-call-args.ts:84-88`); không route HTTP nào | Unit `src/ai/ai.service.spec.ts:93-107` (đúng 3 câu SQL, đúng thứ tự, 1 transaction); `src/cli/ai-fake-call.spec.ts:88,137`; smoke `scripts/smoke-buoc-6.mjs:480-492` (B6#24) |
| `QuickAddService.deleteMyWord(userId, entryId)` | `src/learning/quick-add/quick-add.service.ts:87-96` | Một từ riêng: `withLearnerLock` → `ContentService.deletePrivateEntryContent` (`src/content/private/private-words.service.ts:221-227`: khóa owner, xóa entry, cascade) → port Practice → `learning_items`, `learning_log` của các sense đó (`:93-94`) | `DELETE /v1/my-words/:id` (`src/learning/my-words/my-words-delete.controller.ts:24`) | Không có unit spec cho chính hàm (grep `deleteMyWord` trong `*.spec.ts`: không); smoke `scripts/smoke-buoc-4.mjs:496-502`, `scripts/smoke-buoc-7.mjs:994-1001` |
| `PracticePrivateSensesCleanup.deleteForSenses(tx, userId, senseIds)` | `src/practice/maintenance/private-senses-cleanup.provider.ts:14-46` | Khóa phiên mở, AI request, item (theo thứ tự id, `:16-27`); xóa `practice_ai_requests`, `practice_word_checks`, gỡ `pending_ai_request_id`, đặt `pending_notice`, xóa `practice_reports`, `practice_session_items`, `practice_questions` của các sense đó (`:29-45`) | Qua port ở `deleteMyWord` (`quick-add.service.ts:92`) | Unit `src/practice/maintenance/practice-cleanup.spec.ts:69` trở đi |

**Khuôn có sẵn mà một bước xóa có thể chép:**
- **Port xuyên module (ghi):** token `PRIVATE_SENSES_CLEANUP` và interface ở Learning (`src/learning/private-senses-cleanup.port.ts:3-9`), Practice cài đặt
  và cấp qua `@Global() PracticePortsModule` (`private-senses-cleanup.provider.ts:49-55`), Learning tiêm bằng `@Optional()`
  (`quick-add.service.ts:50`): thiếu provider thì bước đó **lặng lẽ bị bỏ qua** (`?.` ở `:92`).
- **Registry + probe (chỉ đọc, fail closed):** `EntryUsageRegistry` (`src/content/catalog/entry-usage.ts:31-44`); module bắt buộc phải đăng ký
  (`REQUIRED_ENTRY_USAGE_MODULES`, `:18`), thiếu một probe thì `all()` ném lỗi (`:39-43`). Mỗi probe tự đăng ký ở `onModuleInit`
  (`src/learning/entry-usage.probe.ts:15-17`, `src/practice/entry-usage.probe.ts:16-18`, `src/content-pipeline/entry-usage.probe.ts:21-23`) và chạy trong
  transaction xóa của `EntryDeleteService.deleteEntry` (`src/content/catalog/entry-delete.service.ts:77`). Probe làm việc theo sense id của một entry, không
  theo user. Có spec cho cả ba probe (`*/entry-usage.probe.spec.ts`).
- Xóa lẻ khác của người học: một câu (`src/content/sentences/sentences.service.ts:92`), item khi xóa nhóm (`src/learning/groups/groups.service.ts:114`), gỡ
  item khỏi nhóm (`src/learning/items/items.service.ts:131`).
- `SET NULL` có sẵn: FK `practice_reports.item_id` (`migrations/20261018150000_practice/migration.sql:114`), FK `sense_revisions.form_of_entry_id`
  (`migrations/20261017170000_entry_inflections/migration.sql:24`), và `ai_calls.user_id` qua `deleteUserData`.

---

## 3. Identity hôm nay

**Bảng `users`** (`prisma/models/identity.prisma:1-31`): `id`, `email` (varchar 254, unique), `email_verified_at`, `staff_role`, `native_language`,
`timezone`, `status` (mặc định `'active'`), `failed_login_count`, `login_locked_until`, `must_change_password`, `given_name`, `family_name`, `birth_date`,
`terms_accepted_at`, `terms_version`, `locked_at`, `locked_by`, `lock_reason`, `last_seen_at`, `created_at`, `updated_at`.
- `status`: CHECK `users_status_check CHECK (status IN ('active', 'locked'))` ở `migrations/20261021100000_account_fields/migration.sql:15`. `staff_role`,
  `client_type`, OTP `purpose` **không có** CHECK (grep migrations).
- Email lưu dạng `trim().toLowerCase()` (`src/common/email/normalize-email.ts:3`); unique `users_email_key` (`migrations/20261007120000_identity/migration.sql:90`).
- Bảng khác: `password_credentials` (một hash một user, `identity.prisma:33-41`; package `argon2` 0.45.1, `package.json:47`), `session_chains` +
  `refresh_tokens` (`:43-72`), `otp_codes` (`:74-88`), `otp_failure_windows` (`:90-101`). OTP purposes: `'verify_email' | 'reset_password'`
  (`src/identity/identity.types.ts:2`). **Không có bảng identity/provider nào** (identity.prisma chỉ có 5 model).
- Phiên: tối đa 10 chain sống mỗi user (giữ 9 cũ + 1 mới, `src/identity/sessions/session.service.ts:61-76`); hết hạn khi rảnh 90 ngày hoặc sau 365 ngày
  (`:166-171`); grace 10 s khi quay token (`:193`); `last_seen_at` ghi khi login và refresh (`:54`, `:201`).

**Xác thực một request:**
- `AuthGuard` là `APP_GUARD` toàn cục (`src/identity/identity.module.ts:28`). Chỉ kiểm JWT HS256 (`issuer`, `audience`, claims `exp iat sub sid`) rồi gắn
  `{ userId, sessionChainId }` (`src/identity/sessions/access-token.service.ts:31-52`; `auth.guard.ts:15-27`). **Không đọc DB, không cache.** TTL access
  token mặc định 900 s (`src/common/config/app-config.ts:205`; `.env.example:35`).
- `PermissionGuard` (route staff, `@RequirePermission`) mỗi request đọc `session_chains` + `users.staff_role`, `must_change_password`; từ chối nếu chain
  không thuộc user hoặc đã revoke (`src/identity/staff/permission.guard.ts:29-35`). Không đọc `users.status`.
- Route người học dùng `@Learner()` → `LearnerContentGuard` (`src/content/learner/learner.decorator.ts:6`): đọc profile, chỉ từ chối 403
  `profile-incomplete` khi `native_language` null (`learner-content.guard.ts:19-22`); không đọc `status`. `getProfile` trả `null` khi không có hàng user
  (`src/identity/profile/identity.service.ts:75-78`), nên user không còn hàng cũng ra 403 này. `GET /v1/me` trả 401 `invalid-token` khi không có hàng
  (`src/identity/profile/profile.controller.ts:26-29`).

**`locked` được chặn ở đâu:**
- Khóa: `StaffService.lockUser` (`src/identity/staff/staff.service.ts:275-293`): dưới `withUserLock`, từ chối tự khóa mình hoặc khóa admin (409 `lock-rule`,
  `:280`), đặt `status/locked_at/locked_by/lock_reason`, revoke mọi chain (`:286`), vô hiệu OTP còn sống (`:287`). Mở khóa không phục hồi phiên (`:295-309`).
- Login: `decideCredential` trả `account_locked` chỉ sau khi đúng mật khẩu (`src/identity/auth/credential-decision.ts:37`) → 403 `account-locked`
  (`src/identity/auth/auth.service.ts:146`). Refresh: hàng user `locked` → revoke chain, từ chối (`session.service.ts:152-157`). Phát OTP: chỉ khi
  `status === 'active'` (`src/identity/auth/otp.service.ts:50`). Xác minh email: đòi `active` (`auth.service.ts:171-172`).
- Suy ra từ code, `CHƯA KIỂM` chạy thật: access token đã phát vẫn qua được route người học tới khi hết hạn (≤ 900 s), vì `AuthGuard` và `LearnerContentGuard`
  không đọc `status`; route staff bị chặn ngay vì chain đã revoke.

**"Không bao giờ còn 0 admin":** chỉ ở code, không có ràng buộc DB. `setStaffRole` khóa `identity.staff_role` rồi đếm admin, từ chối hạ admin cuối
(`staff.service.ts:332,336-338`); `lockUser` từ chối khóa admin (`:280`); `grantAdminByEmail` (CLI `admin:grant`) chỉ thêm (`:346-357`).

**Đăng ký lại một tài khoản chưa xác minh** (`auth.service.ts:62-88`): tìm theo email; có rồi thì **giữ nguyên `id`**, chỉ cho khi `email_verified_at`
null và `status = 'active'` (không thì 409 `email-taken`, `:78`, `:83`), ghi đè tên, ngày sinh, timezone, terms, reset `failed_login_count`, upsert hash
mật khẩu, revoke mọi chain lý do `reregistered` (`:79-86`). Không đụng bảng module khác. Người chưa xác minh không có phiên (login trả 403
`email-not-verified`, `:135-136`, `:147-149`).

**Terms:** `TERMS_VERSION` bắt buộc (`app-config.ts:203`; `.env.example:55-56`). Ghi `terms_accepted_at`, `terms_version` lúc đăng ký (`auth.service.ts:69`;
body phải có `accept_terms: true`, `src/identity/auth/auth.schemas.ts:13`) hoặc qua `PATCH /v1/me` `accept_terms` (`identity.service.ts:147`;
`profile.schemas.ts:12`). Web chuyển tới `/app/complete-profile` khi `birth_date` hoặc `terms_accepted_at` null
(`apps/web/src/app-shell/RequireSession.tsx:75-77`; `apps/web/src/features/learner/auth/CompleteProfile.tsx:31-32`).

**Rate-limit của route auth** (bảng `DEFAULT_LIMITS`, `app-config.ts:108-131`; gắn ở controller):
`auth.register.ip` 5/giờ + `mail.ip.daily` 20/ngày (`src/identity/auth/auth.controller.ts:22`); `auth.login.ip` 20/phút (`:34`); `auth.otp.ip` 20/giờ +
`mail.ip.daily` (`otp.controller.ts:24`); `auth.verify.ip` 20/giờ (`otp.controller.ts:40`); `auth.reset.ip` 20/giờ (`password.controller.ts:35`);
`user.write` 30/phút cho đổi mật khẩu, `PATCH /v1/me`, mọi route ghi của staff (`password.controller.ts:22`, `profile.controller.ts:18`,
`staff.controller.ts:40-95`); `auth.refresh.ip` 60/phút, `auth.logout.ip` 60/phút (`sessions.controller.ts:23,40`); trong service:
`auth.refresh.chain` 10/phút (`session.service.ts:88`), `auth.otp.email.cooldown` 1/phút và `auth.otp.email.hourly` 5/giờ (`otp.service.ts:161-162`).

**Khóa advisory theo user đang dùng:** `identity.user:<id>` (`src/identity/user-lock.ts:4`), `learning.user:<id>` (`src/learning/learning-lock.ts:5`),
`practice.user:<id>` (`src/practice/practice-lock.ts:8`), `content.private:<id>` (`private-words.service.ts:90`), `content.sentences:<id>:<sense>`
(`sentences.service.ts:41`), `entitlements.user:<id>`, `entitlements.pool:<id>:<pool>` (`src/entitlements/entitlements.locks.ts:15-22`). Thứ tự đã ghi:
Learning trước Content owner lock (`quick-add.service.ts:62`); Practice trước item Learning (`private-senses-cleanup.provider.ts:7-10`); Entitlements
`billing_events row → lockUser → subscriptions row` (`entitlements.locks.ts:5-6`).

---

## 4. Google / OAuth đã có gì

- **API:** không có. Grep `google|oauth|openid|jwks|createRemoteJWKSet|GOOGLE_|identities` trong `apps/api/src` và `.env.example` chỉ ra chữ không liên
  quan (`src/content-pipeline/upload/csv-file.ts:79` "Google Sheets", `src/entitlements/notices/entitlement-mail.ts:16-17` "Google Play"). `provider` trong
  `src/identity`: chỉ chữ `providers:` của Nest (`identity.module.ts:27`).
- **Web:** chỉ chỗ giữ chỗ. `GoogleSoon` "Đăng nhập bằng Google · Sắp có (Bước 8): shown, never pressable", `aria-disabled` (`apps/web/src/features/learner/auth/AuthCard.tsx:76-88`);
  hiện ở `LoginForm.tsx:108` và `RegisterForm.tsx:140`. Key `App.auth.google`: vi "Đăng nhập bằng Google", en "Sign in with Google" (`apps/web/messages/vi.json:308`,
  `en.json:308`). `next/font/google` (`apps/web/src/app/[locale]/layout.tsx:5`) là font, không phải auth.
- **Admin:** không có (grep `google` trong `apps/admin/src`: không kết quả).
- **`jose`:** `6.2.12` (`apps/api/package.json:53`; bản cài trong `node_modules/jose/package.json` cũng 6.2.12). Chỉ dùng `SignJWT`, `jwtVerify` với khóa HS256
  của chính app (`access-token.service.ts:2,17-52`).
- **Env của API liên quan** (`apps/api/.env.example`): `JWT_KEYS` (danh sách `kid:base64url`, khóa đầu ký, `:28-29`), `JWT_ISSUER`, `JWT_AUDIENCE` (`:30-31`),
  `OTP_HMAC_KEY`, `RATE_LIMIT_HMAC_KEY`, `REFRESH_GRACE_KEY` (`:32-34`), `ACCESS_TOKEN_TTL_SECONDS=900` (`:35`), `SMTP_*`, `MAIL_DAILY_BUDGET`,
  `MAIL_BUDGET_KEY` (`:37-45`), `TRUST_PROXY` (`:47`), `CORS_ORIGINS` (`:50`), `PROBLEM_TYPE_BASE` (`:51`), `ADMIN_APP_URL` (`:52`), `LEARNER_APP_URL` (`:54`),
  `TERMS_VERSION` (`:56`), `MAINTENANCE_ENABLED` (`:57`). Không có biến cookie riêng: tùy chọn cookie cứng trong code (mục 5). CORS: `credentials: true`,
  `allowedHeaders: ['Authorization', 'Content-Type', 'X-CSRF-Protection', 'Idempotency-Key']` (`src/app.setup.ts:29-34`).
- Web không có `.env.example`; build đọc `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_BASE_URL` (`apps/web/next.config.ts:9-11`).

---

## 5. Auth ở web người học (`apps/web`)

- **Trang:** `src/app/[locale]/app/(auth)/{login,register,verify-email,forgot-password,reset-password}/page.app.tsx`; thành phần ở
  `src/features/learner/auth/` (`LoginForm.tsx`, `RegisterForm.tsx`, `VerifyEmailForm.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`,
  `CompleteProfile.tsx`, `WelcomeLanguage.tsx`, `AuthCard.tsx`, `AuthGate.tsx`). Login xử lý 403 `email-not-verified` và `account-locked` (`LoginForm.tsx:52-57`);
  register gửi `birth_date`, `accept_terms: true` (`RegisterForm.tsx:38,42`).
- **Phiên:** `session-store.ts` gửi `DEVICE = { client: 'web', device_label: 'Wordmet Web' }` (`src/app-shell/session/session-store.ts:54`) tới
  `/v1/auth/login`, `/register`, `/verify-email` (`:127,132,139`); mọi fetch `credentials: 'include'` (`:329`; `src/app-shell/api/client.ts:20`); header
  `X-CSRF-Protection: 1` (`:333`) gửi kèm `/v1/auth/logout` (`:187`) và `/v1/auth/refresh` (`:291-296`, có `keepalive`).
- **Cookie phía API:** `refresh_token`, `httpOnly`, `secure`, `sameSite: 'strict'`, `path: '/v1/auth'` (`src/identity/sessions/session-transport.ts:13-15`), chỉ
  đặt khi `client === 'web'`; mobile nhận `refresh_token` trong body (`:23-29`). Đọc cookie thì bắt buộc header `X-CSRF-Protection: 1`, thiếu → 403
  `csrf-header-required` (`:39-43`).
- **Trang Cài đặt:** hàng "Xóa tài khoản" có nhãn "Sắp có": `<Row title={t('deleteAccount')} action={<ComingSoon />} />`
  (`src/features/learner/settings/SettingsPage.tsx:176`), `ComingSoon` (khóa + chữ, `:219-227`). Key `App.settings.deleteAccount`: vi "Xóa tài khoản", en
  "Delete account" (`apps/web/messages/vi.json:430`, `en.json:430`); `App.common.comingSoon`: vi "Sắp có", en "Coming soon" (`vi.json:232`, `en.json:232`).
- **CSP:** `src/lib/csp.ts:15-33`, gắn ở `next.config.ts:13-19,28-31` (chỉ khi `NODE_ENV === 'production'`). `CSP_INLINE_FALLBACK = true` (`csp.ts:6`), nên:
  - `script-src 'self' https://static.cloudflareinsights.com 'unsafe-inline'` (+ `'unsafe-eval'` khi site không phải https; hash bị bỏ khi inline bật, `:17-21`);
  - `connect-src 'self' <apiOrigin> https://cloudflareinsights.com` (`:25`; `apiOrigin` chỉ khi learner app bật, `next.config.ts:11`);
  - `frame-src`: **không có directive**, nên theo `default-src 'self'` (`:20`); `form-action 'self'`, `frame-ancestors 'none'` (`:28-29`).
- **File bản chữ:** `apps/web/messages/vi.json`, `apps/web/messages/en.json`.

---

## 6. Admin web (`apps/admin`)

- Login: `src/features/account/LoginPage.tsx`; session store gửi `client: 'web', device_label: 'Wordmet Admin'` (`src/auth/session-store.ts:48`) và header CSRF (`:316`).
- Trang người dùng `src/features/users/` (`UsersPage.tsx`, `UserDetail.tsx`, `EditUserDialog.tsx`, `LockDialog.tsx`, `ResetPasswordDialog.tsx`, `users-api.ts`);
  mục nav `/users` cần `users.read` (`src/app/nav.ts:32`).
- Hành động mỗi user, chỉ khi có `roles.manage` (`UserDetail.tsx:43-44,139`): Sửa (`:141-143`, `PATCH /v1/admin/users/:id`), Đặt lại mật khẩu (`:144-146`,
  `POST .../password`), Khóa / Mở khóa (`:147-155`, `POST .../lock`, `.../unlock`); không cho khóa chính mình hoặc admin (`:95`). Lời gọi API ở
  `users-api.ts:58-80`.
- **Không có** nút xóa, chỗ giữ chỗ xóa, chữ "Bước 8" hay Google (grep `Bước 8|xóa tài khoản|delete account|deleteUser|google` trong `apps/admin/src`: không kết quả).

---

## 7. Billing và entitlements mà việc xóa chạm tới

- Bảng: `entitlement_grants` + `entitlement_grant_changes` (cascade theo grant, `migrations/20261019094400_entitlements/migration.sql:202`),
  `subscriptions` (`entitlements.prisma:53-81`, unique `(provider, environment, external_subscription_id)` `:77`), `billing_events` (`:84-113`),
  `trial_history` (`:116-124`), `billing_transactions` (`:128-155`), `usage_records` (sổ lượt, không có bảng đếm, `:157-184`), `entitlement_notices`
  (`:187-205`), `fake_billing_subscriptions` (`:208-227`).
- **Chống dùng thử lại:** `trial_history.user_id` unique (`migration.sql:187`) và `(provider, payment_fingerprint)` unique khi fingerprint khác null
  (`:232`). Applier chèn với `skipDuplicates`; chú thích "Email is not checked (R25)" (`src/entitlements/billing/event-applier.service.ts:142-150`).
- **Webhook của user không còn hàng:** applier coi là `unknown-user` khi `getProfile(app_user_id)` null, đặt event `ignored` (`event-applier.service.ts:62,99-101`).
- **Provider giả khi hủy:** `cancelAtPeriodEnd` chỉ ghi `cancel_called_at`, `cancel_at_period_end = true` vào `fake_billing_subscriptions`
  (`src/entitlements/billing/fake/fake-billing.adapter.ts:61-66`); không ghi `subscriptions`, không phát event. Nơi duy nhất gọi: khi cấp Pro, tắt gia hạn
  trả phí (`src/entitlements/grants/grants.service.ts:384-396`). `subscriptions.cancel_at_period_end` chỉ đổi khi provider gửi `cancel_scheduled`
  (`src/entitlements/billing/subscription-machine.ts:164-169`). Port adapter: `fetchState?`, `endTrialNow?`, `cancelAtPeriodEnd?`
  (`billing-adapter.ts:38-40`).
- **Định danh thanh toán:** không có số thẻ. Có `payment_fingerprint` (chuỗi provider đưa, `entitlements.prisma:64,120`; đọc từ event,
  `fake-wire.ts:107`), `provider_transaction_id` (`:148`), `external_subscription_id` (`:57`), và `raw_payload` có thể chứa email người mua (`:103-104`).

---

## 8. Mail

- Port: `MailMessage { to, subject, text }` (chỉ plain text) và `abstract class Mailer { send(msg) }` (`src/common/mail/mailer.ts:1-9`); cài đặt `SmtpMailer`
  (`smtp-mailer.ts:7`), `FakeMailer` (`fake-mailer.ts:3`); kèm `MailBudget`, `MailDispatcher.afterResponse` (`src/common/mail/`).
- Mẫu Identity, **song ngữ trong một thư** (tiêu đề "vi / en", thân vi rồi en), không chọn ngôn ngữ (`src/identity/mailer/templates.ts`): `otpMail` (`:4`),
  `passwordChangedMail` (`:16`), `passwordResetMail` (`:24`), `staffAccountMail` (`:32`), `learnerAccountMail` (`:43`), `adminPasswordResetMail` (`:54`),
  `emailChangedNoticeMail` (`:65`), `otpLockedMail` (`:73`).
- Thư nhắc học: `reminderMail` (`src/notifications/provider/reminder-message.ts:30`), ngôn ngữ = `native_language ?? 'vi'` (`:7-9`); địa chỉ qua
  `verifiedEmails` (`src/notifications/provider/email.provider.ts:23`).
- Thư gói: `entitlementMail` (`src/entitlements/notices/entitlement-mail.ts:53`), loại `trial_started | trial_reminder | renewal_notice`
  (`entitlements.types.ts:22`), ngôn ngữ `native_language ?? 'vi'` (`notice-sender.service.ts:103`); không có địa chỉ đã xác minh và `active` thì notice
  thành `skipped` (`:90-94`; `identity.service.ts:102-109`).

---

## 9. Việc chạy nền

- **Hàng đợi BullMQ:** `content-import`, `content-publish`, `content-inflections` (`src/content-pipeline/jobs/job-types.ts:3`), `ai-eval`
  (`src/ai/eval/eval-queue.service.ts:8`), `reminders` (`src/notifications/scheduler/reminder-queue.service.ts:9`).
- **Worker:** `src/worker.ts:11-13` dựng cùng `AppModule` với `pipeline.runWorkers: true`; Worker và scheduler chỉ chạy khi `runWorkers`
  (`job-runner.service.ts:36`, `job-reconciler.service.ts:77`, `eval-queue.service.ts:37`, `reminder-queue.service.ts:54`).
- **Định kỳ:** không có `@Cron` (grep). `reminders` dùng Job Scheduler `tick` mỗi `tickSeconds` (mặc định 900, `reminder-queue.service.ts:58-61`), mỗi tick thêm
  job `send` id `reminder-<userId>-<localDate>` (`:22-24`), `removeOnComplete/removeOnFail` (`:76`). `setInterval`: reconciler (`job-reconciler.service.ts:78`),
  heartbeat (`job-runner.service.ts:61`), `MaintenanceScheduler` mỗi giờ (`src/common/maintenance/maintenance.scheduler.ts:54`) khi `MAINTENANCE_ENABLED`
  (mặc định true, `app-config.ts:204`). Scheduler nằm trong `CommonModule` mà cả API lẫn worker đều dựng, nên theo code nó chạy ở **cả hai process**
  (chú thích lại ghi "inside the API process", `:11`) — `CHƯA KIỂM` chạy thật. Chạy tay: `src/cli/run-maintenance.ts:16`.
- **Job dọn dẹp đăng ký với scheduler:**
  - `identity-cleanup`: OTP hết hạn quá 1 ngày, chain chết quá 30 ngày (`src/identity/maintenance/identity-cleanup.service.ts:26-37`). **Không dọn tài
    khoản chưa xác minh** (không có `deleteMany` nào trên `users`).
  - `idempotency-keys` > 24 h (`src/common/idempotency/idempotency-cleanup.registrar.ts:18-20`); `rate-limit-counters` > 24 h (`rate-limit-cleanup.ts:4-6`).
  - `import-file-cleanup`: file CSV quá `IMPORT_FILE_RETENTION_DAYS` (30) (`import-file-cleanup.service.ts:27`; `app-config.ts:215`).
  - `ai.operations-expire`, `ai.contents-expire` (`src/ai/maintenance/ai-maintenance.ts:26-30`; nội dung giữ 7 ngày, `settings.definitions.ts:61`),
    `ai.models-refresh`, `ai.eval-runs-recover` (`:31-32`).
  - `billing-events-retry`, `subscriptions-time`, `billing-refund-refetch`, `billing-raw-payload-cleanup` (90 ngày) (`billing-jobs.service.ts:39-42,127-129`;
    `entitlements.constants.ts:16`); `entitlement-notices` (`notice-sender.service.ts:47`); `entitlements-usage-expire` (`usage-expire.job.ts:18-20`).
  - `practice-cleanup` (`src/practice/maintenance/practice-cleanup.service.ts:34-70`): item hỏi trước `historyMonths` (6), câu hỏi không còn item, phiên đã
    xong, báo cáo đã xử lý; phiên rảnh 24 h → `abandoned`; `practice_ai_requests` > 7 ngày (`practice.constants.ts:25`); thử lại refund.
- **Không có job dọn:** `learning_*`, `context_sentences`, `reminder_prefs`, `reminder_deliveries`, `billing_transactions`, `usage_records`, `trial_history`,
  `ai_calls` ("kept for good", `ai.prisma:118`), mọi cột audit.

---

## 10. Log và dữ liệu cá nhân lưu ngoài `users`

- **Logger:** che theo **tên key**, regex `/password|otp|code|token|cookie|authorization|answer|contextSentence/i` (`src/common/logging/app-logger.ts:16,29-40`);
  `email` không có trong regex. Sink: một dòng JSON ra stdout (`src/common/common.module.ts:16`). Không có access log theo request (middleware chỉ gắn
  `operation_id`, `operation-id.middleware.ts:9-13`).
- Log mang uuid (`user_id`, `actor_id`, `target_id`), ví dụ `auth.service.ts:142-144`, `staff.service.ts:291`; login sai với email lạ ghi `email_hmac`
  (`auth.service.ts:108-111,119`); lý do khóa không ghi log (`staff.service.ts:290`). Grep các lời gọi log có chữ `email|ip|address`: không thấy giá trị
  email nào được ghi (`CHƯA KIỂM` toàn bộ: chỉ grep theo dòng).
- **Email ngoài `users`:** chỉ `billing_events.raw_payload` (có thể, mục 1). Màn staff lấy email lúc đọc qua `IdentityService.emailsOf`
  (`identity.service.ts:112-118`); id không còn tài khoản thì `UserRef.email = null` (`src/common/user-ref.ts:5-7`).
- **IP:** không bảng nào có cột IP. `request.ip` chỉ dùng cho rate-limit (`rate-limit.guard.ts:26`, `trust proxy` ở `app.setup.ts:28`); key IP và email bị
  HMAC, key user để id trần (`rate-limiter.service.ts:48-50`).
- **Redis:** job `send` của `reminders` mang `userId` trong id và data (`reminder-queue.service.ts:13,22-24`), xóa khi xong hoặc hỏng; job pipeline mang
  job id, `ai-eval` mang `runId` (`eval-queue.service.ts:40`). Khóa nội bộ khác của BullMQ: `CHƯA KIỂM`.

---

## Điểm đáng chú ý cho Bước 8

1. Chỉ 4 FK trỏ tới `users`, đều CASCADE (`migrations/20261007120000_identity/migration.sql:96-108`): xóa hàng `users` không bị FK nào chặn, và kéo theo
   credential, chain/token, OTP. 47 cột ở module khác (46 uuid trần + key của `rate_limit_counters`) thì ở lại, không tự xóa.
2. FK nội bộ `practice_session_items.question_id → practice_questions` là **RESTRICT** (`migrations/20261018150000_practice/migration.sql:111`): phải xóa
   item trước câu hỏi; port hiện có làm đúng thứ tự này (`private-senses-cleanup.provider.ts:43-45`). `practice_reports.reason → practice_report_reasons` cũng
   RESTRICT (`migrations/20261022090000_buoc7_practice_ai/migration.sql:122`).
3. Trigger `entries_clear_form_kind BEFORE DELETE ON entries` (`migrations/20261018130000_form_of_unlink/migration.sql:6-13`) chạy khi xóa entry riêng.
4. Nhiều cột audit trỏ tới staff là NOT NULL (`sense_revisions.created_by`, `background_jobs.created_by`, `app_settings.updated_by`,
   `app_setting_changes.changed_by`, `entitlement_grants.granted_by`, `entitlement_grant_changes.changed_by`, `word_form_additions.added_by`, `ai_models.created_by`,
   `ai_operation_setting_changes.changed_by`, `ai_prompts.updated_by`, `ai_prompt_revisions.saved_by`, `ai_eval_examples.created_by`, `ai_eval_runs.started_by`):
   không đặt NULL được nếu không có migration. Màn admin đã chịu được id không còn tài khoản (`user-ref.ts:6`).
5. `AuthGuard` không đọc DB: access token (≤ 900 s) vẫn hợp lệ sau khi hàng user mất; khi đó `/v1/me` → 401, route `@Learner()` → 403 `profile-incomplete`,
   route staff → 403 (chain đã cascade) — suy ra từ code, `CHƯA KIỂM`.
6. `AiService.deleteUserData` đã có, có test, nhưng chỉ CLI gọi; nó không đụng `practice_ai_requests`, `practice_questions`, `ai_calls` của admin chỉ bị
   null hóa nếu gọi với id admin.
7. Không có hàm xóa hàng loạt theo user ở Learning, Content, Practice, Entitlements, Notifications, Settings; chỉ có xóa một từ riêng
   (`deleteMyWord`) và khuôn port `@Optional()` (thiếu provider thì bỏ qua lặng lẽ) cùng khuôn registry fail closed.
8. Chống dùng thử lại khóa theo `user_id` và `payment_fingerprint`, không theo email (`event-applier.service.ts:142`): xóa rồi đăng ký lại cùng email
   ra id mới.
9. Event billing của user không còn hàng bị bỏ qua (`event-applier.service.ts:62,99-101`); provider giả chỉ ghi cờ hủy ở bảng của nó, và chỉ khi cấp Pro
   (`grants.service.ts:384-396`).
10. "Không còn 0 admin" chỉ kiểm ở `setStaffRole` và `lockUser` (`staff.service.ts:280,336`); chưa có đường xóa nào.
11. Đăng ký lại tài khoản chưa xác minh dùng lại cùng `id` (`auth.service.ts:64`); không job nào xóa tài khoản chưa xác minh.
12. Google: API không có gì; web chỉ có nút giữ chỗ; CSP không có origin Google, không có `frame-src`, `form-action 'self'` (`csp.ts:19-30`). Không có bảng
    liên kết provider; `password_credentials` là 0..1 mỗi user, login báo sai mật khẩu khi không có credential (`auth.service.ts:117-121`).
13. Web có hàng "Xóa tài khoản · Sắp có" (`SettingsPage.tsx:176`); admin không có gì.
14. `MaintenanceScheduler` theo code chạy ở cả API và worker; job reminders có thể còn đợi trong Redis với `userId` lúc user bị xóa.
