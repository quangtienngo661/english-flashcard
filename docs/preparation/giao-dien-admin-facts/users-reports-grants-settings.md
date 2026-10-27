# Đối chiếu API cho màn admin: Cài đặt, Người dùng, Báo lỗi, Trả lượt, Cấp gói (27/10/2026)

Nguồn: bản checkout chỉ-đọc của `origin/dev` tại commit `6e72bb3` (Merge PR #140). Mọi `path:line` dưới đây tính từ gốc repo.
Màn đối chiếu: `docs/mockups/2026-10-21/ban-chu-giao-dien.md` §8.2–§8.6, §8.8 (dòng 592–680) và luật `docs/superpowers/specs/2026-10-21-dot-giao-dien-design.md` §6.4 (dòng 128–141), §10 (dòng 177–190).
Mọi route có tiền tố `/v1` (`apps/api/src/app.setup.ts:26`). Chỉ đọc code; **không chạy API** — mọi trạng thái "OK" là theo code, chưa thử thật.

**Quyền** (`apps/api/src/identity/identity.types.ts:9-15`): `admin` có `roles.manage, content.edit, content.publish, content.import, taxonomy.manage, settings.manage, entitlements.grant`;
`editor` có `content.edit, content.publish, content.import, taxonomy.manage, entitlements.grant`. Thiếu quyền → `403 forbidden`
(`apps/api/src/identity/staff/permission.guard.ts:43`); quyền ở method ghi đè quyền ở class (`getAllAndOverride`, `permission.guard.ts:22-24`).

Trạng thái: **OK** = API có đúng như màn; **DIFFERS** = có nhưng khác (tên, kiểu, phải tự suy ra); **MISSING** = API không có.

---

## 1. Cài đặt hệ thống `A/70a`–`A/70f`

Endpoint: `GET /v1/admin/settings`, `PUT /v1/admin/settings`, `GET /v1/admin/settings/history`; cả lớp cần `settings.manage` (chỉ admin)
(`apps/api/src/settings/admin-settings.controller.ts:17-18`).

### 1.1 Khung chung của trang

| Phần tử | Endpoint | Trường / mã lỗi | Quyền | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| 6 tab Nhắc học · Học và ôn · Luyện tập · Gói và lượt · Nội dung · AI | `GET /admin/settings` | `values.{reminders, learning, practice, entitlements, content, ai}` | `settings.manage` | OK | `apps/api/src/settings/settings.definitions.ts:234-240`, `admin-settings.controller.ts:22-26` |
| Dòng phụ "khoảng …" | `GET /admin/settings` | `bounds.<section>.<key>` = `{min, max}`; thêm `nullable`, `step_minutes`, `greater_than`, `at_least` | `settings.manage` | OK | `settings.definitions.ts:65-116`, `admin-settings.controller.ts:25` |
| Dòng phụ "mặc định …" | — | Response **không** có giá trị mặc định; `SETTINGS_DEFAULTS` chỉ nằm trong code API | — | **MISSING** | `admin-settings.controller.ts:23-26` (chỉ `version, values, bounds`), `settings.definitions.ts:46-62` |
| Ràng buộc "≤ số tối đa" (`default_questions_per_session`) | `PUT` | Không ghi trong `bounds` (không có `at_most`); chỉ kiểm khi lưu, trả 400 | — | DIFFERS | `settings.definitions.ts:81` vs `256-257` |
| "Để trống" | `PUT` | gửi `null` cho khóa có `nullable: true` | — | OK | `settings.definitions.ts:136,149,161,164,176` |
| [Lưu thay đổi] | `PUT /admin/settings` | body `{version, values}` (`strictObject`, chỉ gửi khóa đổi); cần `Idempotency-Key`; trả `{version, values}` | `settings.manage` | OK | `admin-settings.controller.ts:11,28-35`, `settings.definitions.ts:126-180` |
| Lỗi "Có người vừa lưu cài đặt khác…" | `PUT` | `409 version-conflict` | — | OK | `apps/api/src/settings/settings.service.ts:20,52,66,81` |
| Lỗi "Giá trị ngoài khoảng cho phép." | `PUT` | `400 validation-failed` + `violations[]` (tên khóa API, ví dụ `values.practice.default_questions_per_session: …`) | — | OK | `settings.service.ts:55-60`, `settings.definitions.ts:252-261`, `apps/api/src/common/problem-details/problem-details.filter.ts:85` |
| Link [Lịch sử thay đổi] | `GET /admin/settings/history?page_size=&page_token=` | `items[].key` (ví dụ `reminders.send_time`), `old_value`, `new_value`, `changed_by.{id,email}`, `changed_at`; `next_page_token`; mới nhất trước; 20/trang mặc định | `settings.manage` | OK (có **email**) | `admin-settings.controller.ts:12-15,37-40`, `settings.service.ts:16-18,86-110`, `settings.definitions.ts:183,267` |
| Ghi chú "Mẫu email: bàn sau." | — | Không có API (đúng ý màn) | — | OK | design §6.4 dòng 131 |

### 1.2 Khóa, khoảng, mặc định từng tab (41 khóa; đã so từng dòng màn với code)

Kết quả: **cả 41 khóa khớp** tên, khoảng và mặc định với màn (`ban-chu-giao-dien.md:600-606`). Bằng chứng: khoảng `settings.definitions.ts:65-116`, mặc định `settings.definitions.ts:46-62`, khóa `settings.definitions.ts:184-226`.

| Tab | Khóa (khoảng · mặc định trong code) | Trạng thái |
|---|---|---|
| `A/70a` Nhắc học (`reminders`, 5) | `enabled` (bool · true) · `send_time` (06:00–22:00, bước 15 phút · 20:00) · `min_gap_days` (1–7 · 2) · `inactive_after_days` (3–30 · 7) · `stop_after_days` (30–180, `greater_than inactive_after_days` · 60) | OK — `:47,67-71` |
| `A/70b` Học và ôn (`learning`, 5) | `new_per_group_per_day` (1–100 · 20) · `reviews_per_group_per_day` (10–500, nullable · 100) · `backlog_after_days` (30–365 · 60) · `groups_per_user` (10–1000 · 100) · `items_per_group` (100–10000 · 2000) | OK — `:48,72-78` |
| `A/70c` Luyện tập (`practice`, 9) | `max_questions_per_session` (5–100 · 20) · `default_questions_per_session` (1–100, ≤ max khi lưu · 10) · `history_months` (3–24 · 6) · `true_false_true_percent` (20–80 · 50) · `idle_session_close_hours` (1–168 · 24) · `reports_per_hour` (5–100 · 20) · `hint_definition_max_chars` (80–500 · 200) · `type_word_max_retries` (1–10, nullable · null) · `ai_prefetch_count` (0–20 · 2) | OK — `:49-53,79-89` |
| `A/70d` Gói và lượt (`entitlements`, 15) | `free_practice_sessions_per_day` (1–50 · 3) · `pro_practice_sessions_per_day` (1–200, `at_least free` · 30) · `pro_ai_practice_per_cycle` (0–5000 · 300) · `pro_ai_lookup_per_cycle` (0–5000 · 100) · `trial_ai_practice_per_cycle` (0–5000 · 300) · `trial_ai_lookup_per_cycle` (0–5000 · 100) · `grace_days` (0–16 · 7) · `trial_reminder_days_before` (1–6 · 2) · `renewal_notice_days_before` (1–30, nullable · null) · `ai_enabled` (bool · true) · `ai_daily_cap` (0–100000 · 1000) · `ai_cap_alert_percent` (50–95, nullable · 75) · `ads_enabled` (bool · false) · `ads_interstitial_per_day` (0–20 · 3) · `ads_min_interval_minutes` (1–240 · 10) | OK — `:54-59,90-104` |
| `A/70e` Nội dung (`content`, 2) | `private_words_per_user` (1000–100000 · 10000) · `sentences_per_sense` (5–100 · 20) | OK — `:60,105-108` |
| `A/70f` AI (`ai`, 5) | `call_timeout_seconds` (3–30 · 10) · `max_concurrent_calls` (1–500 · 50) · `daily_provider_calls_cap` (0–1000000, nullable · 3000) · `content_retention_days` (0–30 · 7) · `usd_vnd_rate` (10000–100000 · 26100) | OK — `:61,109-115` |

Ghi chú: ba khóa bool không có mục trong `bounds` (đúng, không có khoảng). Ý nghĩa của `null` khác nhau theo khóa (`renewal_notice_days_before` null = không gửi, `ai_cap_alert_percent` null = không tô vàng, các khóa còn lại null = không giới hạn) — `settings.definitions.ts:8-9,18-19,28-29,31-32,40-41`; chữ chung "Để trống = không giới hạn" của màn không đúng cho hai khóa đầu (màn đã ghi riêng từng dòng).

### 1.3 Khối đầu `A/70d` "Lượt AI hôm nay"

| Phần tử | Endpoint | Trường | Quyền | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| "812/1.000 (81%)" | `GET /v1/admin/entitlements/ai-usage[?date=YYYY-MM-DD]` | `used` (= `confirmed + reserved`) / `cap` (= `ai_daily_cap`); % do client tính | `settings.manage` | OK | `apps/api/src/entitlements/api/admin-entitlements.controller.ts:9,27-31`, `apps/api/src/entitlements/entitlements.service.ts:181-191` |
| Tô vàng khi ≥ ngưỡng | như trên | `alert_reached` (= `used ≥ ceil(cap × percent/100)`, false khi percent null hoặc cap 0), `alert_percent` | `settings.manage` | OK | `apps/api/src/entitlements/api/ai-usage.ts:2-10` |
| "Đã xác nhận 790 · đang giữ chỗ 22" | như trên | `confirmed`, `reserved` | `settings.manage` | OK | `ai-usage.ts:2-5`, `entitlements.service.ts:185` |
| "Tính theo ngày giờ Việt Nam." | như trên | `date` = ngày theo `Asia/Ho_Chi_Minh` | — | OK | `entitlements.service.ts:184`, `apps/api/src/entitlements/rules/cycle.ts:32-34`, `apps/api/src/entitlements/entitlements.constants.ts:7` |
| (thêm, màn chưa dùng) | như trên | `enabled` (= `ai_enabled`) | — | — | `entitlements.service.ts:189` |

---

## 2. Người dùng `A/71`, `A/72`, `A/72b`

Controller `@Controller('admin')` + `@RequirePermission('roles.manage')` → **chỉ admin**, khớp màn (`apps/api/src/identity/staff/staff.controller.ts:11-12`).

### 2.1 `A/71` danh sách

| Phần tử | Endpoint | Trường / mã lỗi | Quyền | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| Ô tìm "từ 2 ký tự" | `GET /v1/admin/users?q=` | `q`: NFC + trim, 2–100 code point, không NUL; ngắn hơn → `400 validation-failed` | `roles.manage` | OK | `apps/api/src/identity/staff/staff.schemas.ts:6-9,12` |
| "Không phân biệt hoa thường; có phân biệt dấu." | như trên | `ILIKE '%q%'` trên `email`, `given_name`, `family_name`, `family_name + ' ' + given_name` (ILIKE không bỏ dấu) | — | OK | `apps/api/src/identity/staff/staff.service.ts:152-156` |
| Lọc Tất cả / Đang hoạt động / Đang khóa | như trên | `status` ∈ `active`, `locked`; bỏ trống = tất cả | — | OK | `staff.schemas.ts:13`, `staff.service.ts:157` |
| "Mới nhất trước · 20 người mỗi trang" · [Trang sau] | như trên | `ORDER BY created_at DESC, id DESC`; `page_size` mặc định 20 (1–100); `next_page_token` gắn với bộ lọc | — | OK | `staff.schemas.ts:14-15`, `staff.service.ts:144,160-171` |
| Cột Email · Họ tên | như trên | `items[].email`, `given_name`, `family_name` | — | OK | `staff.service.ts:29-32,48-56` |
| Cột Vai trò (admin / editor / người học) | như trên | `staff_role` ∈ `admin`, `editor`, `null` (= người học) | — | OK | `staff.service.ts:31,51` |
| Cột Email đã xác minh | như trên | `email_verified` (bool) | — | OK | `staff.service.ts:30,51` |
| Cột Trạng thái | như trên | `status` (`active`/`locked`) | — | OK | `staff.service.ts:31,53` |
| Cột Ngày tạo | như trên | `created_at` | — | OK | `staff.service.ts:53` |
| Cột Lần cuối vào | như trên | `last_seen_at` (lần đăng nhập hoặc refresh session gần nhất, có thể null) | — | OK | `staff.service.ts:54`, `apps/api/src/identity/profile/identity.service.ts:80`, `apps/api/src/identity/sessions/session.service.ts:54,201` |
| Trống "Không có ai khớp …" | như trên | `items: []` | — | OK | `staff.service.ts:167-171` |
| (khác) tìm đúng 1 email | `GET /v1/admin/users?email=` | trả `StaffUserView` hoặc `404 not-found`; không dùng chung với `q/status/page_token` | `roles.manage` | OK | `staff.controller.ts:16-24`, `staff.schemas.ts:11,16-17`, `staff.service.ts:135-140` |

### 2.2 `A/72` chi tiết

| Phần tử | Endpoint | Trường | Quyền | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| Email · Tên · Họ · Vai trò · Trạng thái | `GET /v1/admin/users/:id` | `email`, `given_name`, `family_name`, `staff_role`, `status` | `roles.manage` | OK | `staff.controller.ts:26-29`, `staff.service.ts:33-36,174-189` |
| Ngày sinh "14/5/2008" | như trên | `birth_date` `YYYY-MM-DD` hoặc null | — | OK | `staff.service.ts:183` |
| Đồng ý điều khoản "… · bản 2026-10-01" | như trên | `terms_accepted_at`, `terms_version` | — | OK | `staff.service.ts:184` |
| "Đang khóa từ … · bởi an.admin@…" · "Lý do: …" | như trên | `locked_at`, `locked_by.{id, email}` (**có email**), `lock_reason` | — | OK | `staff.service.ts:35,185-187` |
| [Mở khóa] | `POST /v1/admin/users/:id/unlock` | trả `AdminUserDetail`; đã mở → 200 không đổi | `roles.manage` | OK | `staff.controller.ts:67-75`, `staff.service.ts:216-229` |
| [Khóa tài khoản] ẩn với chính mình và `admin` | client tự ẩn | client có `staff_role` của người đích; API vẫn chặn (mục dưới) | — | OK | `staff.service.ts:200` |
| 404 người không tồn tại | `GET`/`POST` | `404 not-found` | — | OK (màn chưa có chữ) | `staff.service.ts:78-80,176` |

### 2.3 `A/72b` hộp khóa

| Phần tử | Endpoint | Trường / mã lỗi | Quyền | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| Ô "Lý do (1–500 ký tự, một dòng)" | `POST /v1/admin/users/:id/lock` | body `{reason}`: NFC + trim, 1–500 code point, không ký tự điều khiển (`\p{Cc}`, nên không xuống dòng) | `roles.manage` | OK | `staff.controller.ts:56-65`, `staff.schemas.ts:26-29` |
| "bị đăng xuất khỏi mọi thiết bị" | như trên | thu hồi mọi session + vô hiệu OTP đang mở | — | OK | `staff.service.ts:203-207` |
| Lỗi "Không khóa được chính bạn hoặc một admin." | như trên | `409 lock-rule` khi `targetId === actorId` hoặc đích là `admin` | — | OK | `staff.service.ts:75-77,200` |
| Khóa người đã khóa | như trên | 200, không đổi gì (không lỗi) | — | OK (màn không cần chữ) | `staff.service.ts:201` |

---

## 3. Báo lỗi `A/73`, `A/73e`, `A/74`, `A/74b`

Controller `@Controller('admin/practice')` + `@RequirePermission('content.edit')` → admin **và editor** (`apps/api/src/practice/reports/admin-reports.controller.ts:28-31`). `A/73e` (editor) dùng cùng endpoint.

### 3.1 `A/73` / `A/73e` danh sách

| Phần tử | Endpoint | Trường / mã lỗi | Quyền | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| Lọc Trạng thái: Chưa xử lý / Không có lỗi / Đã sửa / Đã xác nhận lỗi | `GET /v1/admin/practice/reports` | `status` ∈ `open`, `no_error`, `fixed`, `confirmed`; bỏ trống = mọi trạng thái | `content.edit` | OK | `admin-reports.controller.ts:14-15,34-39`, `apps/api/src/practice/reports/reports.service.ts:181` |
| Lọc Lý do (danh sách lý do) | như trên | `reason` = mã lý do (regex `^[a-z][a-z0-9_]{1,39}$`) | `content.edit` | OK (lọc) | `admin-reports.controller.ts:16`, `reports.service.ts:182` |
| …nguồn dropdown lý do cho **editor** | `GET /v1/admin/practice/report-reasons` | cần `settings.manage` → editor nhận `403` | `settings.manage` | **MISSING cho editor** | `apps/api/src/practice/reports/admin-report-reasons.controller.ts:17` |
| Lọc Nguồn câu: Câu thường / Câu AI | như trên | `source` ∈ `rule`, `ai` | `content.edit` | OK | `admin-reports.controller.ts:17`, `reports.service.ts:183` |
| Cột Từ | như trên | không có trường riêng; lấy `question_snapshot.correct.lemma` (snapshot chép `answerKey.reveal`) | — | DIFFERS (suy ra) | `reports.service.ts:51`, `apps/api/src/practice/reports/snapshot.ts:16,33-36`, `apps/api/src/practice/practice.types.ts:38` |
| Cột Kiểu câu | như trên | `question_snapshot.type` | — | DIFFERS (lồng trong snapshot) | `snapshot.ts:34` |
| Cột Lý do | như trên | `reason` (mã) + `reason_label` (tên **theo ngôn ngữ của người học** lúc gửi, có thể là tiếng Anh) | — | DIFFERS nhẹ | `reports.service.ts:50`, `reports.service.ts:126-127` |
| Cột Nguồn | như trên | `question_source` ∈ `rule`, `ai` (`own_sentence` không báo được) | — | OK | `reports.service.ts:53,101` |
| Cột Ghi chú | như trên | `note` | — | OK | `reports.service.ts:50` |
| Cột Ngày gửi | như trên | `created_at`; sắp `created_at DESC` | — | OK | `reports.service.ts:51,186` |
| Cột Trạng thái | như trên | `status` | — | OK | `reports.service.ts:50` |
| Cột Người xử lý | như trên | `resolved_by` = **mã người dùng (uuid)**, `resolved_by_role` | — | **DIFFERS** (không có email; design §10 dòng 188) | `reports.service.ts:52` |
| Phân trang | như trên | `page_size` 1–100 (mặc định 20), `page_token` gắn bộ lọc | — | OK | `admin-reports.controller.ts:13`, `reports.service.ts:168-195` |
| Trống "Không còn báo lỗi chưa xử lý." | như trên | `items: []` — đúng chữ chỉ khi client gửi `status=open` (mặc định API trả mọi trạng thái) | — | OK (client phải gửi `status=open`) | `reports.service.ts:181` |
| Người báo lỗi | — | API cố ý không trả người gửi | — | OK (màn không có cột này) | `reports.service.ts:45` |

### 3.2 `A/74`, `A/74b` chi tiết và xử lý

| Phần tử | Endpoint | Trường / mã lỗi | Quyền | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| Mở một báo lỗi | — | **Không có** `GET /admin/practice/reports/:id`; dữ liệu chi tiết có sẵn trong dòng của danh sách | — | **MISSING** (mở thẳng link `/reports/:id` không được) | `admin-reports.controller.ts:34-59` |
| Đề (đã che "[từ riêng của người học]", "[nghĩa của từ riêng]") | danh sách | `question_snapshot.prompt` (đã che lúc tạo báo lỗi) | — | OK | `snapshot.ts:13-29`, `apps/api/src/practice/practice.constants.ts:15-16` |
| Đáp án đúng | danh sách | `question_snapshot.correct` (`lemma, meaning, definition_en` + `option_index` / `is_true` / `main, accepted` tùy kiểu) | — | OK | `snapshot.ts:16,24,29,31` |
| Gợi ý đã xem | danh sách | `question_snapshot.hints_shown.{level1,level2,level3}` | — | OK | `snapshot.ts:37-41` |
| Câu trả lời của người học | danh sách | `question_snapshot.learner.{answer, answers_tried, result, hint_level}`; trắc nghiệm: `answer` là chữ của lựa chọn (đã che nếu riêng) | — | OK | `snapshot.ts:25-26,42` |
| `A/74b` lựa chọn "(Người học chọn)" | danh sách | so `learner.answer` với `prompt.options[i]`; hai lựa chọn cùng bị che thì **không phân biệt được** cái nào được chọn | — | DIFFERS (thiếu chỉ số đã chọn) | `snapshot.ts:21-26` |
| Nhãn "Người học đồng ý cho xem từ này" | — | Snapshot không có cờ `asked_private`; luật đồng ý đã bỏ (learner UI D12, GF1): câu AI về từ riêng luôn hiện từ | — | **MISSING / chữ cũ** | `reports.service.ts:85-88`, `snapshot.ts:8-11,22`, `practice.types.ts:39` |
| Thông tin AI: Mã thao tác · Mã lời gọi · Model · Bản prompt | danh sách | `ai_operation_id`, `call_operation_id`, `model`, `prompt_revision` (null với câu thường) | — | OK | `reports.service.ts:47-48,53-54` |
| Nút câu thường [Không có lỗi] [Đã sửa] | `POST /v1/admin/practice/reports/:id/resolve` | body `{status: 'no_error' \| 'fixed'}`; cần `Idempotency-Key` | `content.edit` | OK | `admin-reports.controller.ts:20,41-51`, `apps/api/src/practice/reports/refunds.ts:5-8` |
| Nút câu AI [Không có lỗi] [Xác nhận lỗi] | như trên | `{status: 'no_error' \| 'confirmed'}` | `content.edit` | OK | `refunds.ts:6-7` |
| Gửi trạng thái sai loại câu | như trên | `409 resolve-status-not-allowed` | — | OK (màn chưa có chữ) | `reports.service.ts:207-209` |
| Dòng phụ "Xác nhận lỗi sẽ trả lại 1 lượt câu AI…" | — | cần `ai_charged` (có) **và** `refundable` của lý do (không có trong báo lỗi; chỉ ở `GET /admin/practice/report-reasons`, cần `settings.manage`) | — | **MISSING cho editor**; admin phải ghép 2 response | `reports.service.ts:54`, `refunds.ts:14-18`, `admin-report-reasons.controller.ts:17` |
| "Đã xác nhận lỗi · editor · 18/10/2026, 11:02" | response resolve / danh sách | `status`, `resolved_by_role`, `resolved_at` (`resolved_by` chỉ là uuid) | — | OK (vai trò); email thiếu | `reports.service.ts:52,217`, `reports.service.ts:225` |
| "Đã trả lại 1 lượt câu AI" | như trên | `refunded = true` | — | OK | `reports.service.ts:54,231-232` |
| "Không trả lượt (lý do không có trả lượt)" | như trên | `refunded = false`; nhưng false cũng xảy ra khi câu không trừ lượt, hoặc ledger từ chối (không có chu kỳ / chu kỳ không còn lượt đã dùng để trả); API không nói lý do | — | DIFFERS (không có lý do của false) | `reports.service.ts:218`, `apps/api/src/entitlements/usage/usage-ledger.service.ts:148-153` |
| "Chưa trả được, hệ thống thử lại mỗi giờ" | như trên | `status = confirmed` và `refunded = null`; job dọn dẹp thử lại | — | OK | `reports.service.ts:197-200,233-235`, `apps/api/src/practice/maintenance/practice-cleanup.service.ts:61-65` |
| Lỗi "Báo lỗi này đã được xử lý." | resolve | `409 report-not-open` (cả khi hai người bấm cùng lúc) | — | OK | `reports.service.ts:65,205,221` |
| 404 | resolve | `404 not-found` | — | OK | `reports.service.ts:24,204` |

---

## 4. Lý do báo lỗi `A/75`, `A/75b`

Controller `admin/practice/report-reasons` + `settings.manage` (chỉ admin) — khớp màn (`admin-report-reasons.controller.ts:15-17`).

| Phần tử | Endpoint | Trường / mã lỗi | Quyền | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| Danh sách (sắp theo Thứ tự) | `GET /v1/admin/practice/report-reasons` | `items[]` sắp `position`, rồi `code`; không phân trang | `settings.manage` | OK | `admin-report-reasons.controller.ts:21-24`, `apps/api/src/practice/reports/report-reasons.service.ts:31,63-65` |
| Cột Thứ tự · Mã · Tên VI · Tên EN · Áp cho · Bắt buộc ghi chú · Có trả lượt · Đang dùng | như trên | `position`, `code`, `label_vi`, `label_en`, `applies_to` (`ai`/`non_ai`/`all`), `note_required`, `refundable`, `active`; thêm `detail_hint_vi/en`, `updated_at`, `updated_by` (uuid) | — | OK | `report-reasons.service.ts:43-47` |
| [Thêm lý do] | `POST /v1/admin/practice/report-reasons` (201, cần `Idempotency-Key`) | mã trùng → `409 report-reason-exists` | `settings.manage` | OK (màn chưa có chữ lỗi trùng) | `admin-report-reasons.controller.ts:26-33`, `report-reasons.service.ts:67-79` |
| Sửa · Tắt / Bật (không xóa) | `PATCH /v1/admin/practice/report-reasons/:code` | mọi trường trừ `code`, ít nhất 1; `active` true/false; không có `DELETE` | `settings.manage` | OK | `admin-report-reasons.controller.ts:36-42`, `report-reasons.service.ts:23-27,81-100` |
| Form Mã "(a–z, 0–9, _)" | POST | regex `^[a-z][a-z0-9_]{1,39}$`: **chữ đầu phải là chữ cái, dài 2–40** | — | DIFFERS nhẹ (màn thiếu "bắt đầu bằng chữ", "2–40") | `report-reasons.service.ts:20-21` |
| Tên VI / EN (1–100) | POST/PATCH | trim, 1–100 | — | OK | `report-reasons.service.ts:14,17` |
| Gợi ý ô ghi chú VI / EN (không bắt buộc, ≤ 200) | POST/PATCH | trim, 1–200 hoặc null, optional | — | OK | `report-reasons.service.ts:15,17` |
| Áp cho | POST/PATCH | `applies_to` ∈ `ai`, `non_ai`, `all` | — | OK | `report-reasons.service.ts:18` |
| Bắt buộc ghi chú · Có trả lượt | POST/PATCH | `note_required`, `refundable` (bool); refund chỉ áp câu AI | — | OK | `report-reasons.service.ts:18`, `refunds.ts:17` |
| Thứ tự (0–10.000) | POST/PATCH | `position` int 0–10000 | — | OK | `report-reasons.service.ts:18` |
| "báo lỗi cũ giữ tên lúc gửi" | — | `reason_label` chép lúc tạo báo lỗi | — | OK | `reports.service.ts:124-127` |
| 404 | PATCH | `404 not-found` | — | OK | `report-reasons.service.ts:97-98` |

---

## 5. Trả lượt `A/76`

| Phần tử | Endpoint | Trường / mã lỗi | Quyền | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| Trang (chỉ admin) | `GET /v1/admin/practice/refunds` | quyền method `settings.manage` ghi đè `content.edit` của class; editor → 403 | `settings.manage` | OK | `admin-reports.controller.ts:53-59`, `apps/api/src/practice/reports/admin-reports.controller.spec.ts:41-43,60-61` |
| Lọc Người xử lý | như trên | `resolved_by` = **uuid** (không lọc theo email) | — | DIFFERS (client cần danh sách staff `GET /admin/staff`, `roles.manage`) | `admin-reports.controller.ts:22`, `staff.controller.ts:31-34` |
| Lọc Từ ngày · Đến ngày | như trên | `from`, `to`: ISO datetime **có offset**; `from` ≤, `to` < (không gồm); lọc theo `resolved_at` | — | OK (client đổi ngày → mốc giờ) | `admin-reports.controller.ts:23-24`, `reports.service.ts:250-251` |
| Phạm vi dòng | như trên | chỉ `status = confirmed` và `question_source = ai`; mới xử lý trước | — | OK | `reports.service.ts:252-257` |
| Cột Báo lỗi | như trên | `report_id` (chỉ mã; không có từ / kiểu câu) | — | DIFFERS | `reports.service.ts:60-63` |
| Cột Người học | như trên | `user_id` (uuid, không email) | — | **DIFFERS** | `reports.service.ts:61` |
| Cột Người xử lý · Vai trò | như trên | `resolved_by` (uuid), `resolved_by_role` | — | DIFFERS (email) | `reports.service.ts:61` |
| Cột Tự xử lý báo lỗi của mình | như trên | `self_resolved` (= `resolved_by === user_id`) | — | OK | `reports.service.ts:59,62` |
| Cột Trả lượt: Đã trả / Không trả / Đang thử lại | như trên | `refunded` true / false / null | — | OK | `reports.service.ts:62`, `practice-cleanup.service.ts:61-65` |
| Cột Thời điểm | như trên | `resolved_at` | — | OK | `reports.service.ts:62` |
| Trống | như trên | `items: []` | — | OK | `reports.service.ts:262-266` |
| Ghi chú "Không thu hồi được lượt đã trả." | — | Không có endpoint thu hồi credit | — | OK | `admin-reports.controller.ts:29-59` |

---

## 6. Cấp gói và lượt `A/78`, `A/78d`, `A/79`, `A/79b`, `A/79e`

Controller `admin/entitlements/grants` + `entitlements.grant` (admin và editor) (`apps/api/src/entitlements/grants/admin-grants.controller.ts:12-13`).
Luật editor (`apps/api/src/entitlements/grants/grant-rules.ts:23-30`): admin luôn được; editor bị từ chối theo thứ tự `self-grant` → `target-is-admin` → `target-is-staff` → `ai-limits-admin-only`; áp cho tạo, thu hồi, sửa ngày.

### 6.1 `A/78` danh sách

| Phần tử | Endpoint | Trường / mã lỗi | Quyền | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| Khối đầu (chỉ admin) "Lượt AI hôm nay: 812/1.000" | `GET /v1/admin/entitlements/ai-usage` | `used`, `cap` (xem 1.3) | `settings.manage` | OK | `admin-entitlements.controller.ts:27-31` |
| Danh sách | `GET /v1/admin/entitlements/grants` | `items[]`, `next_page_token`; sắp `created_at DESC`; 20/trang mặc định; editor thấy mọi lần cấp | `entitlements.grant` | OK | `admin-grants.controller.ts:45-48`, `apps/api/src/entitlements/grants/grants.service.ts:202-239`, `apps/api/src/entitlements/grants/grants.schemas.ts:41-48` |
| Lọc Người học | như trên | `user_id` = **uuid**; không lọc theo email | — | DIFFERS | `grants.schemas.ts:42`, `grants.service.ts:216` |
| Lọc Người cấp | như trên | `granted_by` = uuid; không có lọc `granted_by_role` | — | DIFFERS | `grants.schemas.ts:43`, `grants.service.ts:217` |
| Lọc Còn hiệu lực | như trên | `active=true` (chưa thu hồi, chưa hết) / `false` (đã thu hồi hoặc đã hết); "Chưa bắt đầu" tính là `active=true` | — | OK | `grants.schemas.ts:44`, `grants.service.ts:214,219-220` |
| Lọc Sắp hết hạn trong … ngày | như trên | `expiring_within_days` 1–365 (đang hiệu lực và `ends_at ≤ now + N ngày`) | — | OK | `grants.schemas.ts:45`, `grants.service.ts:221-222` |
| Cột Người học | như trên | `user_id` (uuid, không email) | — | **DIFFERS** | `grants.service.ts:31,53` |
| Cột Loại (Gói Pro / Con số riêng) | như trên | `kind` ∈ `plan`, `limits`; `plan` = `pro` \| null | — | OK | `grants.service.ts:31,53` |
| Cột Con số | như trên | `limits` `{practice_sessions_per_day?, ai_practice_per_cycle?, ai_lookup_per_cycle?}` hoặc null | — | OK | `grants.service.ts:31,54` |
| Cột Từ ngày · Tới ngày | như trên | `starts_at`, `ends_at` | — | OK | `grants.service.ts:32,54-55` |
| Cột Người cấp · Vai trò | như trên | `granted_by` (uuid), `granted_by_role` | — | DIFFERS (email; design §10 dòng 188) | `grants.service.ts:32,55` |
| Cột Lý do | như trên | `reason`; thêm `revoke_reason`, `revoked_at`, `revoked_by` (uuid), `paid_renewal_action` | — | OK | `grants.service.ts:32-33,55-57` |
| Cột Trạng thái (5 giá trị) | như trên | **không có trường `status`**; client suy ra: `revoked_at` có + `revoke_reason = 'replaced'` → Bị thay thế; `revoked_at` có → Đã thu hồi; `ends_at ≤ now` → Đã hết hạn; `starts_at > now` → Chưa bắt đầu; còn lại → Đang hiệu lực. Rủi ro: staff tự gõ lý do thu hồi "replaced" sẽ bị hiện thành "Bị thay thế" | — | **DIFFERS** | `grants.service.ts:30-35,126-129`, `grants.schemas.ts:9,33` |
| Trống "Chưa cấp gói…" · [Cấp mới] | như trên | `items: []` | — | OK | `grants.service.ts:234-238` |
| Lịch sử sửa ngày của một lần cấp | danh sách **không** kèm `changes`; có ở `GET /v1/admin/entitlements/users/:user_id` (`grants[].changes[]`, tối đa 100 lần cấp) và ở response `PATCH` | `entitlements.grant` | DIFFERS | `grants.service.ts:235,242-248`, `admin-entitlements.controller.ts:19-25` |

### 6.2 Thao tác dòng: Thu hồi, Sửa ngày (`A/78d`)

| Phần tử | Endpoint | Trường / mã lỗi | Quyền | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| Thu hồi (ô lý do 1–300) | `POST /v1/admin/entitlements/grants/:id/revoke` | body `{reason}` trim 1–300; không cần `Idempotency-Key` | `entitlements.grant` | OK | `admin-grants.controller.ts:26-34`, `grants.schemas.ts:9,33`, `apps/api/src/entitlements/entitlements.constants.ts:25` |
| Thu hồi lần đã thu hồi | như trên | 200, trả bản hiện tại (không lỗi) | — | OK | `grants.service.ts:153` |
| Thu hồi lần đã hết hạn | như trên | `409 grant-not-active` | — | OK | `grants.service.ts:44,154` |
| Editor thu hồi lần cấp của staff / chính mình / con số có lượt AI | như trên | `409 grant-not-allowed` + `extensions.reason` | — | OK | `grants.service.ts:45-47,155-159`, `grant-rules.ts:18-20,23-30` |
| Hộp Sửa ngày: Từ ngày (chỉ sửa khi chưa bắt đầu) · Tới ngày · Lý do (bắt buộc) | `PATCH /v1/admin/entitlements/grants/:id` | body `{starts_at?, ends_at?, reason}` (ít nhất 1 ngày); đổi `starts_at` của lần đã bắt đầu hoặc về quá khứ (> 5 phút) → `400 validation-failed`; `ends_at ≤ max(starts_at, now)` → 400 | `entitlements.grant` | OK | `admin-grants.controller.ts:36-43`, `grants.schemas.ts:35-36`, `grants.service.ts:181-186`, `entitlements.constants.ts:22` |
| "Lượt AI không đếm lại" | — | sửa ngày không động vào ledger; `starts_at` của lần đã bắt đầu giữ nguyên làm mốc chu kỳ | — | OK | `grants.service.ts:184-185,191` |
| "Lần sửa trước: 20/10/2026 · an.admin@… · tới 21/11 → 21/12 · Kéo dài…" | response `PATCH` / `GET …/users/:user_id` | `changes[].created_at`, `changed_by` (**uuid**), `changed_by_role`, `old_/new_starts_at`, `old_/new_ends_at`, `reason` | — | DIFFERS (email) | `grants.service.ts:25-28,62-69,197` |
| Lỗi 409 "Lần cấp này đã thu hồi hoặc đã hết hạn." | `PATCH` | `409 grant-not-active` | — | OK | `grants.service.ts:175` |
| Editor sửa ngày lần không được phép | `PATCH` | `409 grant-not-allowed` + `reason` | — | OK | `grants.service.ts:176-180` |

### 6.3 `A/79` Cấp mới, `A/79e` (editor), `A/79b` xác nhận

| Phần tử | Endpoint | Trường / mã lỗi | Quyền | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| [Cấp] | `POST /v1/admin/entitlements/grants` (201, cần `Idempotency-Key`) | trả `GrantView` | `entitlements.grant` | OK | `admin-grants.controller.ts:17-24` |
| Người học (tìm theo email) | body nhận `user_id` (**uuid**), không nhận email | — | DIFFERS | `grants.schemas.ts:20` |
| …tra email → id, **admin** | `GET /v1/admin/users?email=` (khớp đúng email, không gợi ý) hoặc `GET /v1/admin/users?q=` | `roles.manage` | OK (admin) | `staff.controller.ts:16-24` |
| …tra email → id, **editor** | Không có endpoint nào editor gọi được để tìm người theo email (`/admin/users` cần `roles.manage`; `GET /admin/entitlements/users/:user_id` cần sẵn uuid và không trả email/vai trò) | — | **MISSING** | `staff.controller.ts:12`, `admin-entitlements.controller.ts:19-25`, `entitlements.service.ts:25-39` |
| Loại ◉ Gói Pro ○ Con số riêng | body | `kind` ∈ `plan`/`limits`; `plan: 'pro'` bắt buộc khi `plan`, `limits` bắt buộc khi `limits` | — | OK | `grants.schemas.ts:21-23,28-30` |
| Phiên luyện mỗi ngày (0–200) · Lượt câu AI (0–5.000) · Lượt tra AI (0–5.000) | body | `limits.practice_sessions_per_day` 0–200, `ai_practice_per_cycle` 0–5000, `ai_lookup_per_cycle` 0–5000; ít nhất 1 khóa | — | OK | `grants.schemas.ts:11-17`, `settings.definitions.ts:92-96` |
| Từ ngày (mặc định bây giờ) · Tới ngày | body | `starts_at` optional (mặc định now; sớm hơn now − 5 phút → 400), `ends_at` bắt buộc, > max(start, now) | — | OK | `grants.schemas.ts:24-25`, `grants.service.ts:109-112` |
| Lý do | body | `reason` trim 1–300 | — | OK | `grants.schemas.ts:9,26` |
| Ghi chú "Cấp gói Pro bắt đầu ngay sẽ thay lần cấp gói đang có." | — | lần `plan` đang hiệu lực bị thu hồi với `revoke_reason = 'replaced'`; cấp bắt đầu sau thì không thay | — | OK | `grants.service.ts:124-130` |
| `A/79e` Không có hai ô lượt AI | — | gửi `ai_*` (kể cả 0) khi là editor → `409 grant-not-allowed` `reason: ai-limits-admin-only` | — | OK | `grant-rules.ts:18-20,28` |
| `A/79e` Không chọn được staff hay chính mình | — | client **không biết trước** vai trò người đích (xem dòng tra email editor); API chặn sau khi gửi: `self-grant`, `target-is-admin`, `target-is-staff` | — | DIFFERS (chỉ biết sau khi bấm [Cấp]) | `grant-rules.ts:25-27`, `grants.service.ts:101-108` |
| `A/79e` Không có khối "Lượt AI hôm nay" | — | `ai-usage` cần `settings.manage` → editor 403 | — | OK | `admin-entitlements.controller.ts:28` |
| `A/79e` lỗi "Editor không cấp được cho tài khoản này." | — | `409 grant-not-allowed` + `extensions.reason` (4 giá trị phía editor) | — | OK (một chữ cho cả 4 lý do) | `grants.service.ts:45-47`, `grant-rules.ts:3-4` |
| `A/79b` Xác nhận khi đang trả tiền tự gia hạn | `POST` lần 1 | `409 grant-not-allowed` `reason: target-has-paid-subscription` (cả admin lẫn editor; chỉ với `kind = plan`) | — | OK | `grants.service.ts:119-123` |
| [Cấp và tắt tự gia hạn] | `POST` lần 2 | gửi lại với `confirm_turn_off_paid_renewal: true` (cần `Idempotency-Key` mới vì payload khác) | — | OK | `grants.schemas.ts:27`, `grants.service.ts:123` |
| Kết quả tắt tự gia hạn | response | `paid_renewal_action` ∈ `turned_off`, `not_supported` (nhà cung cấp không tắt được / quá giờ) | — | DIFFERS (màn chưa có chữ cho `not_supported`) | `grants.service.ts:142-144,275-287` |
| 404 người học không tồn tại | `POST` | `404 not-found` | — | OK (màn chưa có chữ) | `grants.service.ts:101-102` |

---

## 7. Client admin hiện có (`apps/admin/src`)

| Điểm | Bằng chứng |
|---|---|
| Chỉ trang Staff gọi API người dùng: `GET /v1/admin/staff`, `GET /v1/admin/users?email=`, `PUT /v1/admin/users/:id/staff-role`, `POST /v1/admin/users`. Chưa có client nào cho `?q=`, `/users/:id`, `lock`, `unlock`, settings, reports, refunds, report-reasons, grants, ai-usage. | `apps/admin/src/features/staff/staff-api.ts:9-35` (grep `admin/users\|admin/staff\|admin/settings\|admin/practice\|admin/entitlements` trên `apps/admin/src` chỉ ra file này) |
| Kiểu `StaffUser` của client chỉ có `id, email, email_verified, staff_role` (API trả thêm `given_name`, `family_name`). | `staff-api.ts:5`, `staff.service.ts:25-28` |
| Danh sách mã lỗi client biết (`KNOWN_ERROR_SLUGS`) **chưa có** `version-conflict`, `lock-rule`, `report-not-open`, `resolve-status-not-allowed`, `report-reason-exists`, `grant-not-allowed`, `grant-not-active`. | `apps/admin/src/api/problem.ts:32-61` |

---

## Thiếu / lệch

1. **Email người thao tác** (đã biết, design §10 dòng 188): báo lỗi `resolved_by`, trả lượt `resolved_by` **và** `user_id` người học, cấp gói `granted_by` / `revoked_by` / `changes[].changed_by`, cấp gói `user_id` người học, lý do báo lỗi `updated_by` — chỉ uuid. Có email: lịch sử cài đặt (`changed_by.email`) và `locked_by.email`. — `reports.service.ts:52,61`, `grants.service.ts:25-33`, `report-reasons.service.ts:46`.
2. **Editor không tìm được người học theo email** cho form `A/79` (và không biết trước người đích là staff hay chính mình): mọi `/admin/users` cần `roles.manage`; body cấp gói nhận `user_id` uuid. — `staff.controller.ts:12`, `grants.schemas.ts:20`.
3. **Lọc theo người** ở `A/76` (Người xử lý) và `A/78` (Người học, Người cấp) nhận uuid, không email; danh sách staff cho dropdown chỉ admin gọi được. — `admin-reports.controller.ts:22`, `grants.schemas.ts:42-43`.
4. **Cấp gói không có trường `status`**: 5 trạng thái phải suy từ `revoked_at`, `revoke_reason`, `starts_at`, `ends_at`; "Bị thay thế" dựa vào chuỗi `revoke_reason = 'replaced'`, trùng được với lý do staff tự gõ. — `grants.service.ts:30-35,128`.
5. **Danh sách cấp gói không kèm `changes`**; "Lần sửa trước" ở `A/78d` phải gọi thêm `GET /admin/entitlements/users/:user_id`. — `grants.service.ts:235,242-248`.
6. **Không có `GET /admin/practice/reports/:id`**: `A/74` chỉ mở được từ dòng danh sách (không có link trực tiếp). — `admin-reports.controller.ts:34-59`.
7. **Editor không đọc được danh sách lý do** (`settings.manage`): thiếu nguồn cho bộ lọc "Lý do" ở `A/73e` và cờ `refundable` cho dòng phụ "sẽ trả lại 1 lượt"; báo lỗi không mang `refundable`. — `admin-report-reasons.controller.ts:17`, `reports.service.ts:46-56`.
8. **Nhãn "Người học đồng ý cho xem từ này" (`A/74`) là chữ cũ**: luật đồng ý đã bỏ (D12/GF1) và snapshot không có cờ `asked_private`. — `reports.service.ts:85-88`, `snapshot.ts:33-43`.
9. `A/74b` "Người học chọn": snapshot chỉ có chữ của lựa chọn, không có chỉ số; hai lựa chọn cùng bị che thì không biết cái nào. — `snapshot.ts:25-26`.
10. `refunded = false` không kèm lý do (lý do không trả lượt / câu không trừ lượt / ledger không còn lượt để trả). — `reports.service.ts:218`, `usage-ledger.service.ts:148-153`.
11. **Cài đặt không trả giá trị mặc định** (dòng phụ "mặc định …" phải chép cứng vào client); ràng buộc `default ≤ max` không có trong `bounds`. Cả 41 khóa, khoảng, mặc định khớp màn. — `admin-settings.controller.ts:23-26`, `settings.definitions.ts:46-62,81`.
12. Cột "Từ", "Kiểu câu" ở `A/73` không có trường phẳng: lấy từ `question_snapshot.correct.lemma`, `question_snapshot.type`; `reason_label` theo ngôn ngữ người học. — `snapshot.ts:16,34`, `reports.service.ts:127`.
13. Mã lý do (`A/75b`): API bắt đầu bằng chữ cái, dài 2–40 (màn chỉ ghi a–z, 0–9, _). — `report-reasons.service.ts:20`.
14. Màn chưa có chữ cho: `409 resolve-status-not-allowed`, `409 report-reason-exists`, `paid_renewal_action = not_supported`, `404 not-found` khi cấp; client admin chưa biết 7 mã lỗi mới. — `reports.service.ts:208`, `report-reasons.service.ts:77`, `grants.service.ts:286`, `apps/admin/src/api/problem.ts:32-61`.
15. Chưa kiểm bằng chạy thật: mọi dòng trên là đọc code tại `6e72bb3`, không gọi API.
