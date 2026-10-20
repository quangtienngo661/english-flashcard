# Design — Sửa thiếu sót Bước 0–3 (tài khoản, nội dung, nền, admin web; chỉ API + lớp phiên của admin)

> **Trạng thái 20/10/2026: đã duyệt** ("ok duyệt", 20/10, sau khi đọc bản viết; gồm cả bốn đề xuất thêm khi viết ở §12). Mọi quyết định sản phẩm đã
> hỏi trong chat theo luật "chủ dự án trả lời trước, Claude đề xuất sau". Năm phần trình bày trong chat (tài khoản; nội dung; nền; admin web; thứ tự, test,
> "Xong khi") chủ dự án đã duyệt từng phần ("ok phần 1 được" … "ok phần 5 được, viết design đi"). Bước tiếp: plan (`superpowers:writing-plans`).

Ngày: 20/10/2026. Brainstorm qua `superpowers:brainstorming`, đọc code trên `dev` @ `529fde3` (Bước 0–5 đã merge). Trong lúc brainstorm, Bước 6 (AI
Integration) đã merge vào `origin/dev` (@ `0db64ae`, PR #80–#95). Đã kiểm `git diff --stat 529fde3 origin/dev`: ngoài `src/ai/**` và migration AI, Bước 6
chỉ sửa `src/common/config/app-config.ts` và `src/settings/settings.definitions.ts`; không đụng file nào của các lỗi trong design này. Bước 6 thêm một route
`@Idempotent()` (`admin-ai-eval.controller.ts`, `POST /runs`) và quy ước "không gọi provider trong handler idempotent" (design Bước 6 §4.4). Plan cắt nhánh
từ `origin/dev` mới nhất.

**Nguồn:**
- Review hôm nay: [`../reviews/2026-10-20-buoc-0-3-review.md`](../reviews/2026-10-20-buoc-0-3-review.md) (thiếu nghiệp vụ N1–N9, trạng thái lỗi cũ).
- Kiểm kê từng lỗi trên code hiện tại (4 file, mỗi dòng có `file:dòng`):
  [`../reviews/2026-10-20-buoc-0-3-review-evidence/`](../reviews/2026-10-20-buoc-0-3-review-evidence/).
- Review code 18/10 (mô tả lỗi, probe đã tái hiện): [`../reviews/2026-10-18-buoc-0-4-code-review.md`](../reviews/2026-10-18-buoc-0-4-code-review.md).
- Review nghiệp vụ schema 17/10 (DB1–DB3): [`../reviews/2026-10-17-db-schema-business-review.md`](../reviews/2026-10-17-db-schema-business-review.md).
- Decision record: [`../decisions/2026-10-20-buoc-0-3-fixes-decisions.md`](../decisions/2026-10-20-buoc-0-3-fixes-decisions.md).

**Nhãn:** **Chốt** = chủ dự án chọn trong chat (mã D# của decision record). **Đề xuất, đã duyệt 20/10** = Claude đề xuất khi trình một phần, chủ dự
án duyệt cả phần. **Đề xuất** = chỉ có trong bản viết này, chủ dự án duyệt khi đọc. **`ASSUMPTION`** = con số hay giả định chưa kiểm chứng. Design
doc là tài liệu chính thức để build; `docs/specs/` là khung ban đầu, không sửa theo (chủ dự án, 12/10/2026). Mã lỗi của review (C1, T3, CT5…) giữ
nguyên để truy nguồn. Tiêu chí `F#`, edge case `FE#`.

## 0. Đọc trước: những chỗ đổi so với quyết định cũ

| # | Đổi gì | Từ | Thành | Quyết định |
|---|---|---|---|---|
| 1 | Dữ liệu tối thiểu của tài khoản (IR21) | Chỉ email, mật khẩu, tiếng mẹ đẻ, múi giờ | Thêm họ, tên, ngày sinh, thời điểm và phiên bản đồng ý điều khoản | D2–D5 |
| 2 | Đăng ký (Bước 1, B1#1) | `email, password, timezone, client, device_label` | Thêm `given_name` (bắt buộc), `family_name`, `birth_date` (bắt buộc), `accept_terms: true`; dưới 13 tuổi bị từ chối. **Phá vỡ** quy ước "v1 chỉ thêm" (SR7); chấp nhận vì chưa có người dùng thật | D3, D4, D8 |
| 3 | `users.status` | Chỉ `active`, không nơi nào kiểm | `active` / `locked`; đăng nhập, refresh, OTP kiểm | D6 |
| 4 | Chống gửi trùng (Bước 0, B0#2: "handler chạy trong cùng transaction giữ key") | Key và handler ở hai connection; handler chạy ngoài transaction | Giữ chỗ (commit `in_progress` có hạn) → handler → ghi kết quả; mỗi lúc một connection | D12 |
| 5 | Múi giờ lưu | Chuỗi client gửi, nguyên văn; nhận dạng `+07:00` | Tên chuẩn (`resolvedOptions().timeZone`); từ chối dạng lệch giờ | Đề xuất, đã duyệt 20/10 |
| 6 | Upload lại dòng CSV đã nhập (B2E6) | Code: tạo nháp mang nội dung file | Đúng design cũ: báo `unchanged`, không đụng nội dung | D14 |
| 7 | Job publish (Bước 2 §6) | Có thể publish bản bị bác, mở lại nghĩa đã gỡ | Bỏ qua cả hai, ghi lý do | D17 |
| 8 | Admin: refresh lỗi 5xx (design 2.5 §5) | "Refresh thất bại → `/login`" | Chỉ 401 mới đăng xuất; 5xx giữ người dùng lại | D15 |
| 9 | Test backend | (D38) CI + smoke | Giữ D38; thêm unit test cho phần logic, một smoke riêng cho đợt này; xóa 3 file test cần DB không ai chạy | D13 |

## 1. Mục tiêu và bối cảnh

Chủ dự án (20/10): "user table chỉ có lưu email và password… khi tạo tài khoản mình muốn app phải có thêm thông tin như họ tên, ngày sinh… và
những lỗi logic hoặc thiếu của các bước tiếp theo nếu có". Review 20/10 cho thấy mọi lỗi mức Cao và phần lớn mức Trung bình của review 18/10 **vẫn
còn trong code**, và Bước 4–5 còn gọi thêm vào chính các chỗ lỗi đó.

**Mục tiêu:** app đủ chuẩn để ra mắt cho người dùng thật ở các điểm sau: tài khoản có thông tin nhận diện và bằng chứng đồng ý; admin chặn được tài
khoản xấu và tra được người học; nội dung bị bác hay đã sửa tay không bị đưa lên lại; dữ liệu học của người học không mất vì thao tác của staff; API
không sập hay trả 500 hàng loạt khi đông người; lỗi 500 tra được.

**Ngoài mục tiêu:** tính năng mới cho người học; giao diện mới (D8); các lỗi mức Thấp (D11).

## 2. Quyết định (tóm tắt; chi tiết và mọi phương án ở decision record)

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| D1 | Chia việc | Một design, một plan; plan chia mốc, làm phần nền (M1) trước | Chủ dự án; thứ tự là đề xuất, đã duyệt 20/10 |
| D2 | Họ tên | Hai ô "Họ", "Tên"; chỉ để nhận diện, không dùng trong email hay lời chào | Chủ dự án |
| D3 | Ngày sinh | Đầy đủ, bắt buộc khi đăng ký | Chủ dự án |
| D4 | Tuổi tối thiểu | 13; không hỏi sự đồng ý của cha mẹ | Chủ dự án (sau hai vòng tìm hiểu) |
| D5 | Đồng ý điều khoản | Một ô tick bắt buộc; lưu thời điểm + phiên bản trên `users`; đổi phiên bản không bắt đồng ý lại | Chủ dự án |
| D6 | Khóa tài khoản | `admin` khóa/mở khóa; thu hồi mọi phiên; chấp nhận trễ tối đa 15 phút | Chủ dự án |
| D7 | Tra cứu người học | Danh sách tìm theo một phần email/họ/tên, lọc trạng thái | Chủ dự án |
| D8 | Giao diện | Chỉ API (cộng sửa hành vi lớp phiên của admin, D15–D16) | Chủ dự án |
| D9 | Lưu người thao tác nội dung | Cột trên bảng có sẵn, chỉ lần gần nhất | Chủ dự án |
| D10 | N6, N7, N8, N9 | Không làm N6, N7, N8; N9 (xóa tài khoản) để Bước 8 | Chủ dự án |
| D11 | Phạm vi lỗi | Lỗi mức Cao, Trung bình (cùng CT5/CT6); mức Thấp để đợt sau | Chủ dự án (đổi từ "toàn bộ" sau khi xem mức ảnh hưởng) |
| D12 | Cách sửa C1 | Giữ chỗ → làm → ghi kết quả | Claude đề xuất, chủ dự án nhờ |
| D13 | Test | Không thêm test cần DB vào CI; smoke trên DB mới; xóa 3 file bỏ quên | Chủ dự án |
| D14 | T3 | Dòng đã nhập trước đó → `unchanged` | Chủ dự án |
| D15 | T8 | Giữ người dùng lại khi API lỗi tạm thời | Chủ dự án |
| D16 | T9 | Vẫn xóa phiên trên máy, báo "Chưa đăng xuất được khỏi máy chủ — Thử lại" | Chủ dự án |
| D17 | PL4 | Job bỏ qua nghĩa đang bị gỡ | Chủ dự án |

## 3. Phạm vi

**Làm** (mã ở cột trái là mã của review):

| Cụm | Mã | Việc |
|---|---|---|
| Tài khoản (§4) | N1, N2, N4, N5 | Họ, tên, ngày sinh, mốc 13 tuổi, đồng ý điều khoản; khóa/mở khóa; danh sách và chi tiết người dùng cho admin |
| Nội dung (§5) | N3, T1 (CT1, PL4), T2 (PL3, phần còn lại của M5), T3 (PL2), T4 (PL1), CT5, CT6, T6 (PX1, PX1b) | Lưu người thao tác; chặn bản bị bác; revert không xóa thứ đang dùng; upload lại → `unchanged`; `rejected.csv` vòng 2; che từ đúng; câu luyện một đáp án đúng |
| Nền (§6) | C1 (FD1, FD2, DB10, DB11, T16), PX4, C2 (ID1), C3 (FD3), T5 (CT2, DB14, T14) | Chống gửi trùng; số connection; đọc trong transaction; múi giờ chuẩn; log lỗi 500; tra từ không quét từ riêng của người khác |
| Admin web (§7) | T8 (AD1), T9 (AD2), T10 (AD3), T11 (AD4) | Lớp phiên và thông báo lỗi |
| Test (§9) | — | Unit test, smoke riêng, xóa 3 file test bỏ quên |

**Không làm:**
- N6 (xem/đăng xuất thiết bị khác), N7 (đổi email), N8 (chuyển lịch ôn khi nghĩa bị **thay**; sửa nghĩa thông thường vốn đã giữ lịch ôn vì giữ id):
  D10. N9 (xóa tài khoản): Bước 8.
- Khoảng 60 lỗi mức Thấp và các dòng "thiếu test" của chúng (D11). Danh sách đầy đủ trong 4 file kiểm kê; các câu đã hỏi về chúng (ID4, FD8, CT9,
  L11, P1, LN4, LN5, ID8, DB12, AD-403, PX5) **chưa chốt**, hỏi lại khi làm đợt đó.
- T7 (đọc nguồn "Ôn tất cả" chậm): đã chấp nhận ở D39 Bước 4, đo lại trước khi có người dùng thật.
- T12 (rate limit theo IP sau proxy), AD12 (security header của admin): đưa vào checklist Deploy (§10), không sửa code.
- Giao diện mới cho người học và admin (D8).

## 4. Tài khoản (mốc M2; module Identity)

### 4.1 Dữ liệu (`identity.prisma`, bảng `users`; Đề xuất, đã duyệt 20/10)

| Cột mới | Kiểu | Null | Ghi chú |
|---|---|---|---|
| `given_name` | `varchar(50)` | có | Tên. Bắt buộc ở đăng ký người học; null ở tài khoản cũ và staff tạo không kèm tên |
| `family_name` | `varchar(50)` | có | Họ. Không bắt buộc (người chỉ có một tên; Google thiếu họ ở Bước 8) |
| `birth_date` | `date` | có | Bắt buộc ở đăng ký người học; null ở staff và tài khoản cũ |
| `terms_accepted_at` | `timestamptz` | có | Thời điểm tick đồng ý |
| `terms_version` | `text` | có | Phiên bản Điều khoản + Chính sách bảo mật lúc đồng ý (từ cấu hình `TERMS_VERSION`) |
| `locked_at` | `timestamptz` | có | Khi `status = 'locked'` |
| `locked_by` | `uuid` | có | Admin khóa |
| `lock_reason` | `varchar(500)` | có | Lý do admin nhập |

- `status`: `active` | `locked` (Bước 8 thêm `deleting`). Thêm `CHECK (status IN ('active','locked'))` (**Đề xuất**; Bước 8 đổi CHECK).
- Tài khoản đang có: mọi cột mới null, `status` giữ `active`. Không bắt nhập lại.
- `terms_version` không phải khóa ngoại: chưa có bảng văn bản pháp lý. `TERMS_VERSION` là biến môi trường bắt buộc (vd. `2026-10-20`); giá trị thật
  đặt khi trang Điều khoản của app được viết (`ASSUMPTION`: trang này chưa có).

### 4.2 Đăng ký `POST /v1/auth/register` (Chốt D2–D5; chi tiết Đề xuất, đã duyệt 20/10)

Body: `email, password, timezone, client, device_label?` như cũ, thêm:

| Trường | Luật | Lỗi |
|---|---|---|
| `given_name` | Bắt buộc. NFC, cắt khoảng trắng hai đầu, 1–50 ký tự (code point), không ký tự điều khiển (kể cả NUL) | 400 `validation-failed` |
| `family_name` | Không bắt buộc; cùng luật; chuỗi rỗng sau khi cắt → lưu null | 400 `validation-failed` |
| `birth_date` | Bắt buộc, dạng `YYYY-MM-DD`, ngày có thật, ≥ 1900-01-01, không sau hôm nay | 400 `validation-failed` |
| — | Tuổi < 13 tại "hôm nay" theo `timezone` của request | 400 `age-below-minimum` |
| `accept_terms` | Bắt buộc, phải là `true` | 400 `validation-failed` |

- **Tính tuổi:** đủ 13 tuổi khi "hôm nay" (theo `timezone` đã chuẩn hóa, §6.2) ≥ ngày sinh + 13 năm. Sinh 29/02: năm không nhuận, đủ tuổi từ **01/03**
  (chọn mốc muộn). Thứ tự kiểm: body hợp lệ → mật khẩu → múi giờ → tuổi → ngân sách thư → tạo tài khoản (giữ thứ tự cũ, chèn tuổi sau múi giờ).
- Server ghi `terms_accepted_at = now`, `terms_version = TERMS_VERSION`. Client không gửi phiên bản.
- Log `register_rejected_age` không có ngày sinh hay email (SR10); chỉ ghi `reason`.

### 4.3 Hồ sơ `GET/PATCH /v1/me`

- `GET` trả thêm `given_name`, `family_name`, `birth_date` (`YYYY-MM-DD` hoặc null).
- `PATCH` nhận thêm `given_name` (không được null hay rỗng khi đã có), `family_name` (null được). **Không** sửa được `birth_date` qua API (Đề xuất, đã
  duyệt 20/10): mốc tuổi không bị lách sau đăng ký. Tài khoản cũ chưa có tên đặt được tên qua `PATCH`.

### 4.4 Tài khoản staff `POST /v1/admin/users`

Nhận thêm `given_name`, `family_name`, **không bắt buộc** (D8: admin web hiện tại không gửi; bắt buộc khi làm lại giao diện admin). Không có ngày
sinh, không ghi đồng ý. Kết quả trả thêm hai trường tên.

### 4.5 Khóa tài khoản (Chốt D6; chi tiết Đề xuất, đã duyệt 20/10)

| Route | Quyền | Body | Kết quả |
|---|---|---|---|
| `POST /v1/admin/users/:id/lock` | `roles.manage` (chỉ `admin`) | `{ reason }` (1–500 ký tự, NFC, cắt) | 200 + chi tiết người dùng |
| `POST /v1/admin/users/:id/unlock` | `roles.manage` | — | 200 + chi tiết người dùng |

- **Khóa:** một transaction giữ `withUserLock` của người bị khóa: `status = 'locked'`, ghi `locked_at/by`, `lock_reason`; thu hồi mọi phiên
  (`revoke_reason = 'locked'`); vô hiệu mọi mã OTP còn sống. Log `account_locked` (`actor_id`, `target_id`; không có lý do vì có thể chứa dữ liệu cá nhân).
- **Mở khóa:** `status = 'active'`, xóa ba cột khóa. Log `account_unlocked`. Phiên cũ không quay lại: người dùng đăng nhập lại.
- **Luật:** không khóa chính mình, không khóa người có `staff_role = 'admin'` → 409 `lock-rule`. Không tìm thấy → 404. Khóa người đang bị khóa, mở
  người đang mở → 200, không đổi gì (idempotent; không cần `Idempotency-Key`).
- **Người bị khóa thấy gì:**

| Hành động | Kết quả |
|---|---|
| Đăng nhập, mật khẩu **đúng** | 403 `account-locked` ("Tài khoản đã bị khóa"). Chỉ người biết mật khẩu thấy câu này |
| Đăng nhập, mật khẩu sai | 401 `invalid-credentials`, đếm sai như thường |
| Refresh | 401 `invalid-token` (phiên đã bị thu hồi lúc khóa; có kiểm thêm `status` phòng phiên tạo sau) |
| Xin OTP xác minh email, xin mã đặt lại mật khẩu | Như email không tồn tại: 202, không gửi gì |
| Nộp mã đặt lại mật khẩu | 400 `invalid-otp` (không có mã nào được phát) |
| Gọi route học bằng `access token` còn hạn | Vẫn chạy tối đa hết hạn token (≤ 15 phút, `ACCESS_TOKEN_TTL_SECONDS=900`): chấp nhận (D6) |
| Route staff (`PermissionGuard`) | 403 ngay: guard đã đọc phiên từ DB, phiên bị thu hồi |
| Email nhắc học, email gói dịch vụ | Không gửi: hai truy vấn đó đã lọc `status = 'active'` (`identity.service.ts:67, 83`) |

### 4.6 Danh sách và chi tiết người dùng (Chốt D7; chi tiết Đề xuất, đã duyệt 20/10)

- **`GET /v1/admin/users?q=&status=&page_size=&page_token=`** (quyền `roles.manage`):
  - `q`: 2–100 ký tự, không phân biệt hoa thường, khớp một phần `email`, `given_name`, `family_name` hoặc "họ + tên". Ký tự `%`, `_`, `\` được escape.
  - `status`: `active` | `locked`, không có = tất cả.
  - Thứ tự `created_at` giảm dần rồi `id` giảm dần; `page_size` mặc định 20, tối đa 100; `page_token` gắn với bộ lọc (như các danh sách khác). `created_at`
    luôn do code ghi theo mili giây (đã đúng ở đăng ký và tạo staff), nên con trỏ trang không bỏ sót (bài học `df9c1f6` ở Bước 5).
  - Mỗi dòng: `id, email, given_name, family_name, email_verified, staff_role, status, created_at, last_seen_at`.
  - **Tương thích:** có tham số `email` → giữ đúng hành vi cũ (tìm đúng email, trả một đối tượng hoặc 404), cho admin web hiện tại. Có `email` cùng `q` →
    400. Bỏ nhánh `email` khi làm lại admin.
- **`GET /v1/admin/users/:id`**: thêm `birth_date`, `terms_accepted_at`, `terms_version`, `locked_at`, `locked_by` (id + email), `lock_reason`. 404 khi
  không có.
- `ASSUMPTION`: `ILIKE '%q%'` quét bảng `users`; đủ nhanh tới vài chục nghìn người. Cần index `pg_trgm` thì thêm khi đo thấy chậm.

## 5. Nội dung (mốc M3; module Content, Pipeline, Practice)

### 5.1 N3 — Lưu người thao tác (Chốt D9; chi tiết Đề xuất, đã duyệt 20/10)

| Bảng | Cột mới | Ghi khi |
|---|---|---|
| `sense_revisions` | `reviewed_by uuid`, `reviewed_at timestamptz` | Đánh dấu `reviewed` hoặc `rejected` (`POST …/senses/review`) |
| `sense_revisions` | `published_by uuid` | Revision được publish (cùng lúc `published_at`) |
| `senses` | `state_changed_by uuid`, `state_changed_at timestamptz` | Publish (thường, nhanh, job), gỡ, retire, bị nghĩa mới thay (người làm = người publish nghĩa mới) |

- Người làm: staff gọi API; job publish → `background_jobs.created_by`; từ riêng của người học → chính người học.
- Các route `review`, `unpublish`, `retire` nhận thêm người làm từ request (hiện không nhận); `publishItem` dùng `_actorId` đang bị bỏ.
- Đọc: API chi tiết nghĩa của admin trả thêm các cột trên, mỗi người làm dạng `{ id, email }` (như lịch sử settings). Dòng cũ: null.
- Không thêm bảng lịch sử: chỉ lần gần nhất (D9).

### 5.2 T1 — Bản đã bị bác (CT1, PL4; Chốt D17 cho phần job)

- `publishRevision` (`src/content/senses/publish.service.ts:89`) từ chối revision có `status` khác `draft`/`reviewed` với lý do `revision-rejected`
  (revision `superseded`, `published` cũ cũng không publish được qua đây). Áp cho publish thường, publish nhanh (409 như các lý do khác), job.
- **Nháp mới dựng trên bản gần nhất chưa bị bác** (UI `saveDraft` và đường CSV `import-content`): vẫn kiểm `revision` client gửi bằng số của revision
  mới nhất (kể cả khi nó bị bác) để phát hiện sửa chồng; nhưng nội dung nền lấy từ revision mới nhất có `status <> 'rejected'`. Khi revision mới nhất
  bị bác, luôn tạo revision mới (phép so "không đổi" chỉ áp khi revision mới nhất chưa bị bác), để luôn có một bản mở publish được.
  Ví dụ: revision 2 (ví dụ sai) bị bác; An gửi sửa một ô với `revision: 2` → revision 3 = revision 1 + ô An sửa.
- **Job publish** (`publish-job.handler.ts:41-53`): bỏ qua revision bị bác (lý do `revision-rejected`) và **nghĩa đang ở trạng thái `unpublished`**
  (lý do `sense-unpublished`), kể cả khi lúc chụp nó còn mở. Muốn hiện lại nghĩa đã gỡ: publish tay từng nghĩa (route thường vẫn cho).

### 5.3 T2 — Revert lô không xóa thứ đang được dùng (PL3, phần còn lại của M5)

`revertEntry` (`src/content/catalog/revert.service.ts`) giữ entry và đưa vào `skipped` với lý do `entry-in-use` khi entry còn:
- bộ dạng chia đã duyệt (`inflections_reviewed_at` khác null, kể cả bộ rỗng "không có dạng chia");
- revision nào (catalog hoặc từ riêng của bất kỳ người học nào) có `form_of_entry_id` trỏ tới nó.

Chạy đua với người học đang tạo từ riêng trỏ tới entry đó: revert khóa dòng entry (`SELECT … FOR UPDATE`) **trước** khi kiểm; tạo từ riêng có `form_of`
khóa dòng entry gốc (`FOR SHARE`) trước khi ghi link. Bên nào trước thì bên kia chờ (FE22). Thiếu khóa này, link tạo trong khe giữa "kiểm" và "xóa" bị
`ON DELETE SET NULL` xóa mất.

Level: không xóa dòng level của lô nếu dòng đó nay có `basis = 'editorial'` (staff đã xác nhận sau khi nhập; phần còn lại của M5), lý do
`level-confirmed`. Báo cáo revert liệt kê mọi mục bỏ qua kèm lý do (cấu trúc `skipped` hiện có).

### 5.4 T3 — Upload lại dòng đã nhập (PL2; Chốt D14)

- Khi nhập thành công một dòng có nội dung (`created`, `updated` hoặc `unchanged`), ghi row key loại `content` với hash nội dung của **dòng trong file**
  (đúng cơ chế design Bước 2 D13 định dùng; code hiện chỉ ghi loại `level`). Bảng `import_row_keys` đã unique theo `(kind, source_id, row_key,
  content_hash)` nên giữ được mọi phiên bản dòng từng nhập.
- Prefilter: dòng không có `sense_id`, có row key `content` + hash **đã từng được nhập ở bất kỳ lô nào** → phần nội dung báo `unchanged`, không tạo
  nháp, dù sau đó nội dung đã bị sửa tay hay bị một file khác sửa.
- **Dạng chia giữ luật hiện nay** (quyết định H1, 17/10): row key `inflection` chỉ khớp lô cùng byte file, và bộ dạng chia được so với dữ liệu hiện
  tại; upload lại file cũ **khôi phục** bộ dạng chia của file đó. Chủ dự án đã xác nhận hai luật ngược nhau này khi duyệt phần 2.
- Muốn đưa nội dung trong file lên đè bản hiện tại: dùng file export có cột `revision` (đường `sense_id`, không qua prefilter) như B2E6.
- Dòng đã nhập trước khi có thay đổi này không có row key `content`: lần upload lại đầu tiên sau khi deploy xử lý như hiện nay (FE16).

### 5.5 T4 — `rejected.csv` vòng 2 (PL1)

`uploads-read.controller.ts:62`: trước khi thêm `_row`, `_error`, bỏ các cột tên `_row`, `_error` (sau khi cắt, chữ thường) cùng ô tương ứng của từng
dòng. Upload lại file vòng 2, 3… được.

### 5.6 CT5, CT6 — Che từ trong câu ví dụ (`src/content/practice/mask-example.ts`)

Dùng cho câu điền từ và gợi ý của Practice (`question-builder.service.ts`, `hints.ts`). Mỗi ca dưới thành một unit test:

| Ca | Hiện tại | Sau khi sửa |
|---|---|---|
| `The student's book` (đáp án `student`) | Không che, lộ đáp án | `The ___'s book` |
| Từ nhiều chữ `ice cream` trong `ice, cream and…` | Khớp vắt qua dấu phẩy | Không khớp |
| `Mr. March is here` (đáp án `March`) | `Mr.` bị coi là hết câu | Che đúng `March`; `Mr.`/`Mrs.`/`Dr.`… không kết thúc câu |
| `at 9 a.m.` (đáp án `a.m.`) | Dư dấu chấm sau `___` | Che cả `a.m.` |
| `MP3 player` | Khớp cả "MP4 player" | Chỉ khớp đúng chữ số |
| Biến thể `am` của `a.m.` | Che nhầm động từ "am" | Chỉ che dạng có dấu chấm |

Chấm câu điền từ (`src/practice/grading/normalize.ts`): bỏ dấu chấm câu ở **cuối** khi so (gõ `a.m` hay `a.m.` đều đúng). Dấu ở giữa chữ giữ nguyên.

### 5.7 T6 — Câu luyện có hai đáp án đúng (PX1, PX1b; `src/practice/questions/distractors.ts`)

- **Trắc nghiệm** (đề hiện nghĩa, chọn chữ): loại khỏi đáp án nhiễu mọi **chữ** (lemma, không phân biệt hoa thường) có **bất kỳ nghĩa nào người học thấy
  được** (catalog đã publish + từ riêng của mình, không chỉ nghĩa trong nhóm) trùng nghĩa con với nghĩa đang hỏi (`shareSubsense` hiện có).
  Ví dụ: hỏi "nhanh"; `quick` có nghĩa "nhanh" (dù nghĩa đó không ở trong nhóm) → `quick` không được làm đáp án nhiễu.
- **Đúng/sai** (đề hiện "chữ — nghĩa"): một cặp sai không được dùng nghĩa trùng nghĩa con với **bất kỳ nghĩa thấy được nào của chữ đang hỏi**. Ví dụ:
  hỏi `deploy`; `deploy` có nghĩa "bố trí (quân)" → không ghép `deploy — sắp xếp, bố trí` làm cặp sai.
- Hai lượt: lượt 1 đọc mọi nghĩa thấy được của các chữ ứng viên và của chữ đang hỏi (một truy vấn qua `ContentService`, theo danh sách lemma); lượt 2
  lọc. Không đủ đáp án nhiễu sau khi lọc → dùng luật "không đủ ứng viên" đã có của Bước 4.

## 6. Nền (mốc M1; `src/common`, chỗ dùng chung)

### 6.1 C1 — Chống gửi trùng (Chốt D12; chi tiết Đề xuất, đã duyệt 20/10)

```
Request (key X) ──▶ [tx ngắn 1] khóa advisory (key, user, endpoint) → đọc dòng X
                       ├─ không có → INSERT in_progress (updated_at = now) → COMMIT
                       ├─ succeeded/failed_permanent, cùng payload → trả kết quả đã lưu (replay)
                       ├─ khác payload → 400
                       ├─ in_progress, updated_at > now − hạn → 409 "đang chạy", Retry-After 2
                       └─ in_progress, quá hạn → 409 idempotency-key-abandoned (B0E1)
                 ──▶ handler chạy như route thường (transaction riêng của nó)
                       ├─ thành công → [tx ngắn 2] UPDATE X SET succeeded, response WHERE status = in_progress
                       └─ ném lỗi    → [tx ngắn 2] DELETE X WHERE status = in_progress  (nhả key, như hiện nay)
```

- Hạn (`timeoutSeconds`, mặc định 30) là thời gian giữ chỗ, **không** còn cắt ngang handler: bỏ `Promise.race` với timer. Handler chậm hơn hạn vẫn chạy
  xong và ghi `succeeded`; trong lúc đó lần gửi lại nhận 409 "bắt đầu lại" thay vì chạy lần hai.
- Hai request cùng key đến đồng thời: khóa advisory + unique `(key, user_id, endpoint)` → một bên chèn được, bên kia thấy `in_progress` → 409.
- Server chết giữa handler: dòng `in_progress` ở lại → sau hạn: `abandoned`. Khe còn lại: chết **sau** khi handler commit, **trước** tx ngắn 2 → lần gửi
  lại nhận `abandoned`, client làm lại với key mới có thể tạo bản trùng (D12 chấp nhận; khe này rất ngắn).
- `failed_permanent` vẫn không được ghi (FD8 thuộc đợt lỗi Thấp, chưa chốt).
- Mỗi request giữ **tối đa một** connection mỗi lúc.
- **Số connection** (T16): `PrismaPg` nhận cấu hình pool qua biến môi trường mới `DATABASE_POOL_MAX`, `DATABASE_POOL_TIMEOUT_MS`. Giá trị mặc định
  `ASSUMPTION` (đề xuất 20 và 5000 ms); plan kiểm tài liệu `@prisma/adapter-pg` (context7) xem truyền tham số pool thế nào trước khi viết.
- **Đọc trong transaction (PX4 và cùng loại):** code đang mở transaction mà đọc hồ sơ hay settings qua client chung thì đổi sang đọc qua `tx`
  (`getProfile(userId, tx)`, `settings.get(tx)` đã có sẵn tham số). Chỗ đã biết: `src/learning/practice/practice-review.service.ts:33`,
  `src/practice/sessions/sessions.service.ts:69-88`. Plan rà `grep` mọi `$transaction` có gọi `getProfile(`/`settings.get(` bên trong.

### 6.2 C2 — Múi giờ (ID1; Đề xuất, đã duyệt 20/10)

- **Lưu tên chuẩn:** đăng ký, `PATCH /v1/me`, tạo staff lưu `new Intl.DateTimeFormat('en', { timeZone }).resolvedOptions().timeZone`. Đã chạy thử trên
  Node 24.11.0 (20/10): `asia/ho_chi_minh` → `Asia/Saigon`, `ASIA/HO_CHI_MINH` → `Asia/Saigon`, `etc/gmt-7` → `Etc/GMT-7`.
- **Từ chối dạng lệch giờ** (`+07:00`, `-23:59`): 400 `validation-failed`. Lý do: không theo giờ mùa hè của nước có đổi giờ.
- **Bộ nhớ đệm có trần:** `src/common/time/local-date.ts` giữ tối đa 500 formatter (`ASSUMPTION`), bỏ cái dùng lâu nhất khi đầy, để giá trị lạ đã lỡ lưu
  không làm phình RAM.
- **Script một lần** (`pnpm db:normalize-timezones`, chạy tay): chuẩn hóa `users.timezone` đang có; dòng dạng lệch giờ đổi sang `Etc/GMT∓N` tương ứng
  khi lệch tròn giờ, còn lại `UTC`, in số dòng đã đổi (không in email).

### 6.3 C3 — Log lỗi 500 (FD3; Đề xuất, đã duyệt 20/10)

`ProblemDetailsFilter` (`src/common/problem-details/problem-details.filter.ts:16`): khi status ≥ 500, ghi một dòng mức `error`, event `request_failed`,
gồm `operation_id`, `method`, route **mẫu** (`/v1/groups/:id`, không có giá trị hay query string), tên lỗi, mã lỗi (`code` của Prisma nếu có), và tối đa
10 dòng stack **không kèm dòng thông báo lỗi** (thông báo có thể chứa dữ liệu người dùng, SR10). Không ghi body.

### 6.4 T5 — Tra từ không quét từ riêng của người khác (CT2, DB14, T14)

- `/v1/lookup`, `/v1/words`, `/v1/words/:lemma` (`src/content/words/words.service.ts`): đặt điều kiện `(e.scope = 'catalog' OR (e.scope = 'private' AND
  e.owner_user_id = <người xem>))` thẳng lên bảng `entries` của câu ngoài, bên cạnh `visibleSenseCondition`, để Postgres dùng được index một phần.
- Index mới: `entries (lower(lemma)) WHERE scope = 'catalog'`, `entries (owner_user_id, lower(lemma)) WHERE scope = 'private'`,
  `entry_variants (lower(text))`, `senses (entry_id)`. Tạo trong migration thường (chưa có dữ liệu thật; DB18 thuộc đợt Thấp).
- Đo: thêm ba route vào `pnpm test:scale` (chạy tay, D42 Bước 4). **Mục tiêu** (`ASSUMPTION`): có thêm 300.000 từ riêng của 300 người khác, median
  không quá 2 lần lúc chỉ có catalog. Số 18/10: `lookup` 36 → 798 ms, `words?q=` 60 → 1.474 ms.

## 7. Admin web (mốc M4; `apps/admin`, chỉ lớp phiên và thông báo lỗi)

Lớp này là phần chủ dự án muốn giữ khi làm lại giao diện admin. Dùng lại thứ đã có: dải offline (`src/app/offline.tsx`), khóa nút theo `Retry-After`
(`src/features/content/useSubmitAction.ts`).

| Mã | Sửa | Chốt |
|---|---|---|
| T8 (AD1) | `refresh` trả 5xx hoặc lỗi mạng → kết quả mới `unavailable`, **không** gọi logout, không phát sự kiện đăng xuất cho tab khác. Đang làm việc: bật dải "Mất kết nối máy chủ — Thử lại", dữ liệu giữ nguyên. Mở trang (khởi tạo phiên) lúc đó: màn chờ có nút "Thử lại", không chuyển `/login`. Chỉ 401 (và 403 `csrf-header-required` như hiện nay) mới coi là hết phiên. 429 giữ luật B25E30 | D15 |
| T9 (AD2) | `logout` kiểm `res.ok`. Lỗi server hoặc mạng: vẫn xóa token trong bộ nhớ, về `/login`, hiện "Chưa đăng xuất được khỏi máy chủ — Thử lại"; bấm thì gọi logout lần nữa (cookie refresh vẫn còn nên gọi được); thông báo không tự mất khi chưa thành công | D16 |
| T10 (AD3) | Lỗi không có câu riêng (`errors.generic`) hiện thêm "Mã: …" (`operation_id`) có nút chép. Test B25#19 kiểm chữ hiển thị | Đề xuất, đã duyệt 20/10 |
| T11 (AD4) | 429 khóa nút + đếm ngược theo `Retry-After` ở 5 form: đăng nhập, đổi mật khẩu bắt buộc, đổi vai trò, tạo tài khoản, đăng ký nguồn (B25#18) | Đề xuất, đã duyệt 20/10 |

Ngoài lớp phiên, admin web không đổi (D8): chưa có màn danh sách người dùng, khóa tài khoản, họ tên.

## 8. API thay đổi (tóm tắt) và mã lỗi mới

| Route | Thay đổi |
|---|---|
| `POST /v1/auth/register` | Thêm `given_name`, `family_name`, `birth_date`, `accept_terms` (§4.2). **Phá vỡ** |
| `POST /v1/auth/login` | 403 `account-locked` (§4.5) |
| `POST /v1/auth/refresh`, `/otp`, `/password/reset` | Kiểm `status` (§4.5) |
| `GET/PATCH /v1/me` | Thêm họ, tên, ngày sinh (§4.3); `timezone` lưu tên chuẩn, từ chối dạng lệch giờ (§6.2) |
| `GET /v1/admin/users` | Không có `email` → danh sách (§4.6); có `email` → như cũ |
| `GET /v1/admin/users/:id`, `POST …/:id/lock`, `POST …/:id/unlock` | Mới |
| `POST /v1/admin/users` | Thêm họ tên không bắt buộc |
| `POST /v1/admin/content/senses/review`, `/unpublish`, `/retire`, `/publish`, `:id/quick-publish`, job publish | Ghi người làm (§5.1); từ chối bản bị bác (§5.2) |
| Chi tiết nghĩa của admin | Thêm `reviewed_*`, `published_by`, `state_changed_*` |
| Mọi route có `Idempotency-Key` | Hành vi C1 (§6.1); mã lỗi giữ nguyên |

| Mã lỗi mới | Status | Khi |
|---|---|---|
| `age-below-minimum` | 400 | Dưới 13 tuổi |
| `account-locked` | 403 | Đăng nhập đúng mật khẩu khi bị khóa |
| `lock-rule` | 409 | Khóa chính mình hoặc một `admin` |
| `revision-rejected` (lý do trong kết quả từng mục, như `stale-revision`) | — / 409 ở publish nhanh | Publish bản bị bác |
| `sense-unpublished` (lý do trong báo cáo job) | — | Job gặp nghĩa đang gỡ |
| `entry-in-use`, `level-confirmed` (lý do trong `skipped` của revert) | — | §5.3 |

## 9. Edge cases (When → Then)

Viết riêng cho cơ chế của đợt này (quy ước `docs/specs/SPEC_WRITING_CONVENTIONS.md`).

### 9.1 Tài khoản

| # | When | Then |
|---|---|---|
| FE1 | Đăng ký với `birth_date = 2013-10-21`, `timezone = Asia/Ho_Chi_Minh`, lúc 20/10/2026 23:00 giờ VN | 400 `age-below-minimum` (12 tuổi); lúc 21/10/2026 00:00 giờ VN thì được |
| FE2 | Cùng ngày sinh nhưng `timezone = Pacific/Kiritimati` (đã sang 21/10) | Được: tuổi tính theo múi giờ của request (chấp nhận người dùng chọn múi giờ để lách vài giờ) |
| FE3 | Sinh 2013-02-29 (ngày không có) | 400 `validation-failed` |
| FE4 | Sinh 2012-02-29, hôm nay 2025-02-28 | Chưa đủ 13; 2025-03-01 thì đủ |
| FE5 | `accept_terms` là `false`, thiếu, hay `"true"` (chuỗi) | 400 `validation-failed` |
| FE6 | `given_name` toàn khoảng trắng, hay 51 ký tự, hay có `\u0000` | 400 `validation-failed` |
| FE7 | `family_name = "  "` | Lưu null |
| FE8 | `PATCH /v1/me` gửi `birth_date` | 400 `validation-failed` (trường lạ, `strictObject`) |
| FE9 | Admin khóa A trong lúc A đang refresh | Cả hai cùng giữ `withUserLock(A)`: refresh trước → phiên mới bị thu hồi ngay sau đó; khóa trước → refresh thấy chain bị thu hồi → 401 |
| FE10 | Admin khóa A khi A đang đăng nhập (mật khẩu đã đúng, đang chờ khóa user) | `decideCredential` đọc `status` sau khi giữ khóa: thấy `locked` → 403 `account-locked`, không tạo phiên |
| FE11 | Admin khóa chính mình, hay khóa một `admin` khác | 409 `lock-rule`, không đổi gì |
| FE12 | Hạ vai trò một admin (còn admin khác) rồi khóa | Được |
| FE13 | `GET /v1/admin/users?q=a` | 400 `validation-failed` (dưới 2 ký tự) |
| FE14 | `q = "50%"` | Tìm đúng chuỗi `50%`, không coi `%` là ký tự đại diện |
| FE15 | Tài khoản cũ (tên null) `PATCH /v1/me { given_name: "Lan" }` | Lưu tên; `GET` trả tên |

### 9.2 Nội dung

| # | When | Then |
|---|---|---|
| FE16 | Upload lại một file nhập **trước** khi có row key `content` | Lần đầu xử lý như hiện nay (không có key để khớp); từ lần đó trở đi có key |
| FE17 | File F nhập ví dụ "X"; file G sửa thành "Y"; upload lại F | Dòng F: `unchanged`, live vẫn "Y" (D14) |
| FE18 | File F đặt `go → went`; file G đổi `goed`; upload lại F | Dạng chia khôi phục `went` (H1 giữ nguyên) |
| FE19 | Revision 2 bị bác; publish nhanh nghĩa đó mà không sửa gì | Tạo revision 3 (= nội dung revision 1) và publish nó: `published`. Nội dung live giống revision 1 |
| FE20 | Job chụp nghĩa S lúc 10:00 (revision 2 nháp); 10:01 revision 2 bị bác; 10:02 job xử lý S | `refused`, lý do `revision-rejected` |
| FE21 | Job gặp nghĩa `unpublished` đã như vậy từ trước lúc chụp | Bỏ qua, `sense-unpublished` (không phân biệt trước hay sau lúc chụp) |
| FE22 | Revert lô A đúng lúc một người học tạo từ riêng trỏ `form_of` tới entry E của A | Tạo từ riêng làm trước: revert chờ, rồi thấy link → giữ E (`entry-in-use`). Revert làm trước: tạo từ riêng chờ, rồi thấy E không còn → 404 (§5.3: khóa dòng E) |
| FE23 | `rejected.csv` vòng 3 (đã có `_row`, `_error` hai lần do file cũ của bản lỗi) | Bỏ mọi cột `_row`, `_error` cũ, thêm một cặp mới |
| FE24 | Đáp án `MP3 player`, câu ví dụ chỉ có `MP4 player` | `maskExample` trả `null` (không che được) → câu đó không dùng cho câu điền từ, theo luật "không che được" hiện có |
| FE25 | Trắc nghiệm hỏi "nhanh"; ứng viên `quick` chỉ có nghĩa "nhanh trí" trong nhóm, nhưng catalog có `quick` = "nhanh" | `quick` bị loại (lọc theo mọi nghĩa thấy được, không chỉ nghĩa trong nhóm) |

### 9.3 Nền

| # | When | Then |
|---|---|---|
| FE26 | 10 request `POST /v1/groups` cùng lúc, mỗi request một người, pool mặc định | 10 × 201; không request nào chờ connection thứ hai |
| FE27 | Một người gửi 10 request cùng lúc, 10 key khác nhau (trong hạn rate limit) | Như FE26 |
| FE28 | Handler chạy 40 s với hạn 30 s; gửi lại cùng key ở giây thứ 35 | 409 `idempotency-key-abandoned`; handler đầu vẫn chạy xong, ghi `succeeded`; gửi lại lần nữa sau đó → replay kết quả |
| FE29 | Gửi lại cùng key ở giây thứ 5 khi handler còn chạy | 409, `Retry-After: 2` |
| FE30 | Handler ném 409 `group-full` | Dòng key bị xóa; gửi lại cùng key → chạy lại |
| FE31 | Tx ngắn 2 (ghi `succeeded`) lỗi DB | Request trả 500 (C3 log); dòng ở `in_progress` → sau hạn: `abandoned`. Dữ liệu handler đã commit (khe đã chấp nhận ở D12) |
| FE32 | `PATCH /v1/me { timezone: "+07:00" }` | 400 `validation-failed` |
| FE33 | Hồ sơ cũ còn `timezone = "asia/ho_chi_minh"` (chưa chạy script) | Vẫn chạy (formatter tạo được); bộ nhớ đệm có trần |
| FE34 | Lỗi Prisma P2002 không được bắt ở một route → 500 | Một dòng log `request_failed` với `code: 'P2002'`, không có giá trị cột |

### 9.4 Admin web

| # | When | Then |
|---|---|---|
| FE35 | Đang làm việc, request bị 401, refresh trả 503 | Dải offline; không gọi logout; tab khác không đổi; bấm "Thử lại" khi API đã lên → refresh thành công, gửi lại request |
| FE36 | Mở trang khi API trả 503 | Màn chờ + "Thử lại"; API lên → vào thẳng nếu cookie còn hạn |
| FE37 | Refresh trả 401 | Đăng xuất như hiện nay ("Phiên đăng nhập đã hết hạn") |
| FE38 | Logout trả 503, rồi F5 ở `/login` | Thông báo "Chưa đăng xuất được…" vẫn hiện (lưu trong `sessionStorage` của tab, `ASSUMPTION`: plan chọn cách giữ); trang không tự đăng nhập lại |
| FE39 | Đăng nhập nhận 429 `Retry-After: 30` | Nút khóa, đếm ngược 30 → 0, rồi mở |

## 10. Test, thứ tự làm, "Xong khi" (Chốt D13; thứ tự Đề xuất, đã duyệt 20/10)

### 10.1 Test

- **Unit test** cho mọi phần logic không cần DB: tính tuổi, kiểm tên, chuẩn hóa múi giờ, bộ nhớ đệm có trần, dựng `rejected.csv`, `maskExample` (bảng §5.6),
  lọc đáp án nhiễu (§5.7), luật publish bản bị bác (§5.2), luật revert (§5.3), luật prefilter (§5.4), quyết định của `runIdempotent` (§6.1, với DB giả),
  filter log 500, lớp phiên admin (§7, như probe 18/10).
- **Smoke riêng** `pnpm smoke:buoc-0-3-fixes` qua API thật trên DB mới, mỗi ca có tên theo mã. Gồm ít nhất: C1 (FE26, FE28, FE29 với route thử có hạn
  ngắn), các ca của 3 file test sắp xóa (B0E1 `abandoned`, B0E8, rate limit), C2 (FE32), C3 (FE34 qua một route cố ý lỗi trong môi trường smoke,
  `ASSUMPTION`: plan chọn cách gây lỗi), M2 (FE1, FE5, khóa/mở khóa FE9–FE11, danh sách FE13–FE14), T1 (FE19, FE20), T2, T3 (FE17, FE18), T4.
- **Xóa** `src/common/idempotency/idempotency.service.e2e-spec.ts`, `src/common/idempotency/idempotency.interceptor.e2e-spec.ts`,
  `src/common/rate-limit/rate-limit.guard.e2e-spec.ts` sau khi ca của chúng có trong smoke (không config nào chạy chúng: `vitest list` 20/10).
- Sửa các script đang gọi đăng ký cho khớp body mới: `apps/api/scripts/smoke-buoc-2.mjs`, `smoke-buoc-4.mjs`, `smoke-buoc-5.mjs`,
  `apps/admin/e2e-real/support/api.ts`.
- `pnpm test:scale`: thêm đo T5 (§6.4).

### 10.2 Thứ tự

| Mốc | Việc | Phụ thuộc |
|---|---|---|
| M1 Nền | C1 (+ pool, đọc trong tx), C3, C2 (+ script), T5 | — |
| M2 Tài khoản | §4 + sửa các script đăng ký | M1 (route mới dùng C1, C2) |
| M3 Nội dung | §5 | M1 (job publish và quick-publish đi qua C1); độc lập với M2, làm song song được |
| M4 Admin web | §7 | Không phụ thuộc API; T10 có ích hơn sau C3 |
| M5 Kiểm và ghi chép | Smoke mới; xóa 3 file; delivery record `docs/deliveries/buoc-0-3-fixes.md`; một dòng trỏ trong `CLAUDE.md`; checklist Deploy (T12, AD12, `TERMS_VERSION`, `DATABASE_POOL_*`); cập nhật trạng thái trong review 20/10 | M1–M4 |

M2 và M3 cùng thêm migration: plan đặt thứ tự timestamp và chỉ một PR sửa `schema` mỗi lúc để test drift không đỏ.

### 10.3 Xong khi

- CI xanh ở mọi PR (`api`: lint, typecheck, build, unit, schema drift; `web`; `admin`; `admin-e2e-real`).
- `pnpm smoke:buoc-0-3-fixes` pass trên DB mới; `pnpm smoke:buoc-4` và `pnpm smoke:buoc-5` (đã sửa body đăng ký) vẫn pass. Output lưu vào
  `docs/deliveries/buoc-0-3-fixes-smoke-output.txt`.
- `pnpm test:scale` ghi số đo T5 vào delivery record.

## 11. Rủi ro và `ASSUMPTION`

1. **C1 đổi cơ chế dùng chung của 25 route** mà CI không có test cần DB (D13). Smoke kiểm các ca chính; ai sửa lại `runIdempotent` sau này phải tự chạy
   smoke.
2. **Mốc 13 tuổi không hỏi cha mẹ** (D4): Luật BVDLCN 2025 Điều 24 khoản 2 cho người đại diện thực hiện quyền của trẻ em (dưới 16). Cần luật sư xem trước
   ra mắt; trang Điều khoản ghi "dưới 16 tuổi cần cha mẹ đồng ý" (như ELSA), không cần code.
3. Con số `ASSUMPTION`: `DATABASE_POOL_MAX` 20, `DATABASE_POOL_TIMEOUT_MS` 5000, trần bộ nhớ đệm múi giờ 500, mục tiêu T5 "không quá 2 lần", `ILIKE` đủ nhanh
   cho danh sách người dùng.
4. **Bước 6 đã merge** trong lúc brainstorm (xem đầu file); Bước 7 có thể bắt đầu song song. Plan cắt nhánh từ `origin/dev` mới nhất và kiểm
   `git log origin/dev` trước mỗi mốc, nhất là `src/common/**`, `src/settings/**`.
5. Đổi body đăng ký là thay đổi phá vỡ của v1 (SR7): chấp nhận vì chưa có app người học; ghi vào delivery record.
6. `TERMS_VERSION` có trước khi có trang Điều khoản của app: giá trị đặt tạm, đổi khi trang được viết.

## 12. Đề xuất kỹ thuật duyệt cùng design

| Đề xuất | Chọn | Bỏ | Vì sao |
|---|---|---|---|
| Hạn tuổi theo múi giờ nào | Múi giờ trong request đăng ký | Giờ VN cố định; UTC | Khớp "hôm nay" của chính người dùng, như mọi ngày khác trong app (SR13) |
| Sinh 29/02 | Đủ tuổi từ 01/03 năm không nhuận | 28/02 | Chọn mốc muộn hơn cho chắc |
| Ngày sinh sửa qua API | Không | Cho sửa | Mốc tuổi không bị lách |
| Phiên bản điều khoản | Server ghi từ `TERMS_VERSION` | Client gửi | Không ghi được phiên bản người dùng chưa thấy |
| Người bị khóa đăng nhập đúng mật khẩu | 403 `account-locked` | 401 như sai mật khẩu | Người dùng thật biết lý do; kẻ dò email không thấy (phải đúng mật khẩu) |
| Danh sách người dùng | Cùng path `GET /v1/admin/users`, nhánh `email` giữ cho admin cũ | Path mới | Một tài nguyên một path; bỏ nhánh cũ khi làm lại admin |
| N3 | Cột, lần gần nhất | Bảng lịch sử | D9 |
| C1 | Giữ chỗ → làm → ghi kết quả | Chạy handler trong tx của key; chỉ tăng pool | D12: Bước 7 gọi AI trong request, giữ tx suốt lúc chờ AI sẽ cạn pool |
| Múi giờ dạng lệch giờ | Từ chối | Nhận; đổi sang `Etc/GMT∓N` | Không theo giờ mùa hè; Postgres hiểu ngược dấu dạng POSIX (`ASSUMPTION` từ review 18/10) |
| Log lỗi 500 | Tên, mã, route mẫu, ≤ 10 dòng stack không kèm thông báo | Cả thông báo lỗi | SR10: thông báo có thể chứa dữ liệu |
| T6 | Lọc theo chữ trên mọi nghĩa thấy được | Chỉ nghĩa trong nhóm | Đề chỉ hiện chữ; nghĩa ngoài nhóm vẫn làm chữ đó đúng |
| Test | Unit + smoke riêng | Bộ test DB trên CI | D13 |

**Thêm khi viết bản này (chưa trình trong chat; chủ dự án duyệt khi đọc bản viết, "ok duyệt" 20/10):**

| Đề xuất | Chọn | Vì sao |
|---|---|---|
| Revision mới nhất bị bác (§5.2) | Lưu nháp luôn tạo revision mới, kể cả khi nội dung bằng bản nền | Nếu không, "không đổi" trả về chính bản bị bác và publish nhanh bị từ chối (FE19) |
| Revert chạy đua với tạo từ riêng (§5.3) | Revert `FOR UPDATE` dòng entry trước khi kiểm; tạo từ riêng có `form_of` `FOR SHARE` dòng entry gốc | Không khóa thì link tạo trong khe "kiểm → xóa" bị `SET NULL` mất (FE22) |
| Khóa tài khoản (§4.5) | Vô hiệu luôn mã OTP còn sống | Một mã đặt lại mật khẩu phát trước lúc khóa không được dùng để đổi mật khẩu |
| `users.status` (§4.1) | Thêm `CHECK (status IN ('active','locked'))` | Giá trị lạ không lọt vào; Bước 8 đổi CHECK khi thêm `deleting` |
