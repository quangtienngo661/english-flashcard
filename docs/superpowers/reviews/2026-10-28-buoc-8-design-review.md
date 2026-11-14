# Bước 8 — Review độc lập design (28/10/2026)

- **Design được review:** [`../specs/2026-10-28-buoc-8-identity-remainder-design.md`](../specs/2026-10-28-buoc-8-identity-remainder-design.md) (bản đầu 28/10).
- **Đối chiếu với:** decision record [`../decisions/2026-10-28-buoc-8-identity-remainder-decisions.md`](../decisions/2026-10-28-buoc-8-identity-remainder-decisions.md) (D1–D25),
  bảng chốt vòng 1 cuối [`2026-10-28-buoc-8-qa-log.md`](2026-10-28-buoc-8-qa-log.md); `CLAUDE.md` (D3, SR7–SR14); `docs/specs/SPEC_WRITING_CONVENTIONS.md`;
  `docs/specs/module-spec-identity-access.md` (IR6–IR9, IR17–IR19, IR22, I11–I15, I25, IE1–IE15). Code facts
  [`BUOC_8_CODE_FACTS_2026-10-28.md`](../../preparation/BUOC_8_CODE_FACTS_2026-10-28.md) chỉ dùng làm đầu mối; mọi điều dưới đây đã đọc lại trên code.
- **Code:** nhánh `docs/buoc-8-brainstorm` @ `36c087f` (commit này chỉ thêm 6 file docs, nên code = `dev` @ `9e35eb5`). Đường dẫn API tính từ `apps/api/`, web từ
  `apps/web/`, admin từ `apps/admin/`. Không build, không chạy app.
- **Tài liệu Google đọc 28/10/2026 (WebFetch):** `developers.google.com/identity/protocols/oauth2/openid-connect`, `.../oauth2/web-server` (100.000 ký tự đầu),
  `.../identity/gsi/web/guides/verify-google-id-token`, `.../identity/siwg/security-bundle`, `accounts.google.com/.well-known/openid-configuration`; RFC 6265bis
  (`datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis`, mục Storage Model).
- **Cách ghi:** mỗi phát hiện tách **Đã kiểm** (đọc code hoặc tài liệu chính thức trong phiên này) và **Nghi ngờ** (suy ra, chưa chạy). Người review: Claude (phiên
  độc lập, chỉ đọc; file này là file duy nhất được viết).

Ví dụ dùng lại nhân vật của design: **Lan** (mật khẩu, Pro), **Minh** (người mới, Gmail), **Hà** (editor).

---

## Tóm tắt

| # | Mức | Mục design | Một dòng | Cần chủ dự án quyết? |
|---|---|---|---|---|
| R1 | **Cao** | 7.2, 7.3, B8E24 | Request đang chạy lúc xóa vẫn ghi sau Tx B: `ai_calls` (giữ mãi) với id thật của Lan, `ai_call_contents`, `practice_word_checks`; B8E24 nói "bị chặn" nhưng không có cơ chế nào chặn | Không |
| R2 | **Cao** | 5.4 (bảng, dòng 2–3), D8/K8 | Google khuyên **không** tự liên kết khi Google không "authoritative" cho email (không phải `@gmail.com`, không có `hd`): ai chiếm được email cũ của Lan chiếm luôn tài khoản | **Có** |
| R3 | **Cao** | 7.5, D21, 18 | Danh sách `deleted_accounts` nằm **trong chính DB được khôi phục**: khôi phục bản cũ thì danh sách cũng về bản cũ, lệnh chạy lại không thấy Lan | **Có** (lúc Deploy; thủ tục ghi ngay) |
| R4 | **Cao** | 6, 7.2, IE11 | Trạng thái `deleting` chưa được các đường cũ biết: đăng nhập mật khẩu và gia hạn vẫn cấp phiên; admin "Mở khóa" đổi `deleting` → `active` (hủy lặng lẽ việc xóa), "Khóa" đổi → `locked` (việc thử lại bỏ sót mãi) | Không |
| R5 | Vừa | 7.3 (Practice), D14 | Báo lỗi về câu từ câu tự viết **không thể tồn tại** (`report-not-available`); cách nhận ra bằng `cloze_source='own'` xóa nhầm báo lỗi khác; còn báo lỗi câu AI về **từ riêng** của Lan thì giữ chữ Lan tự viết | **Có** |
| R6 | Vừa | 5.4 dòng 3, 5.5, B8E6, B8E10 | Nhánh IR9(b) giữ ngày sinh, đồng ý điều khoản, tên của **người đăng ký chiếm trước**, trái D6/D7; `complete` trả 409 cho cùng tình huống mà callback xử lý bằng IR9(b) | Không (theo D6) |
| R7 | Vừa | 7.1, 8.1, D11 | "Đang tự gia hạn" chưa định nghĩa: gói `grace` / `on_hold` vẫn bị trừ tiền sau này nhưng không hủy được (hủy chỉ cho `trialing`/`active`); admin xóa khi tắt gia hạn lỗi thì chưa ghi làm gì | Có (nhẹ) |
| R8 | Vừa | 7.1, B8E29 | "Không xóa admin cuối" có race: hai admin xóa nhau cùng lúc → 0 admin. `setStaffRole` dùng khóa `identity.staff_role`, Tx A chỉ khóa `identity.user` | Không |
| R9 | Vừa | 4, 7.4, 11 | Vòng phụ thuộc module: Identity cần Settings (số ngày dọn) và Entitlements (kiểm gia hạn, tự tắt gia hạn) nhưng cả hai đã import Identity; bộ xóa `common` trái luật "`src/common` không import `src/identity`" | Không |
| R10 | Vừa | 5.7, 10, B8E12 | Admin và web người học dùng **chung một cookie `refresh_token`** trên host API: Hà đăng nhập Google ở `/app` làm tab admin hỏng (403 `password-login-required` mà admin chưa xử lý) | Không |
| R11 | Vừa | 5.4 bước 5, 9.1, 9.2 | Web: cờ `logout-pending` chặn phiên Google sau chuyển trang; `next` của web có tiền tố `/vi`, API lại chỉ nhận `/app…`; trang `/app/google/complete` phải ở nhóm `(auth)` | Không |
| R12 | Vừa | 7.2, 19 | Tx B một transaction Prisma, các module đang dùng timeout 10–30 s: người học nhiều dữ liệu → Tx B hết giờ **mỗi lần**, kẹt `deleting` mãi; Content xóa từng từ riêng một | Không |
| R13 | Vừa | 6, 17 | Đổi `AuthGuard`: route `@Public` mang token hợp lệ của người bị khóa chưa ghi; 24 file controller spec dùng Prisma giả sẽ hỏng; "Xong khi" thiếu `smoke:buoc-0-3-fixes` (luồng khóa) và `smoke:buoc-6` (CLI `delete-user-data` đổi) | Có (nhẹ, tùy chọn) |
| R14 | Vừa | 7.2, 7.5, 7.6 | Việc thử lại chạy ở cả API lẫn worker và có thể đụng Tx B đang chạy trong request; Tx B chưa ghi "hàng `users` đã mất = xong"; chạy lại sau backup phải bỏ qua điều kiện; thứ tự khóa với `deleteMyWord` | Không |
| R15 | Thấp | 7.6, B8E32 | `users.updated_at` bị `@updatedAt` đổi ở mỗi lần đăng nhập sai, nên tài khoản chưa xác nhận sống mãi; tài khoản rác bị khóa (`locked`) không bao giờ bị dọn | Không |
| R16 | Thấp | 7.2 bước 4, D13 | Thư "đã xóa" chỉ gửi trong request; nhánh 202 (việc định kỳ xóa nốt) không gửi thư nào; `afterResponse` cần `res` | Không |
| R17 | Thấp | 7.3, 7.4, B8A3 | Bảng xóa/giữ thiếu vài cột và điều kiện chọn hàng (`users.locked_by`, `resolved_by`, `billing_events`, `entitlement_notices`, log); B8A3 mâu thuẫn `rate_limit_counters`; xóa `entitlement_grants` mất vết cấp gói của editor | Có (tùy chọn) |
| R18 | Thấp | 5.2–5.9, B8E38 | Chi tiết luồng Google: cookie phải giữ `intent`/`locale`/`next`; `locale` chưa giới hạn; `email_verified` có thể là chuỗi; bản giả chặn bằng `NODE_ENV` trong khi code dùng `BILLING_PRODUCTION`; chưa có URL gốc API | Không |
| R19 | Thấp | 8.2, 13 | `GET /v1/me/entitlements` không trả ngày gia hạn khi đang gia hạn; 202 kèm Problem Details; `DELETE` có body | Không |
| R20 | Thấp | 0, 5.2, 7.3, B8E27 | Vài dẫn chứng lệch nhẹ; thiếu ca nhân sự chỉ có Google và dòng "Đổi mật khẩu" cho tài khoản chỉ có Google | Không |

Đếm: **Cao 4, Vừa 10, Thấp 6.** Sau bảng: "Đã kiểm, đúng", "Độ phủ edge case" (24 ca thiếu), "Có thể đơn giản hóa", "Kết luận".

---

## R1 — Cao — Request đang chạy lúc xóa vẫn ghi dữ liệu mang id thật sau Tx B

**Mục:** 7.2, 7.3, B8E24.

**Vấn đề.** `AuthGuard` (cũ hay mới) chỉ kiểm **một lần, lúc request bắt đầu**. Một request đã qua guard trước Tx A vẫn chạy tiếp và ghi sau khi Tx B commit. Ví dụ:
10:00:00 Lan bấm "Tra bằng AI" trên điện thoại (request mất 8 giây vì gọi nhà cung cấp AI); 10:00:02 Lan bấm xóa trên laptop, Tx A rồi Tx B commit lúc 10:00:03; 10:00:08 lời
gọi AI trả về và gateway ghi `ai_calls` với `user_id` = id thật của Lan, cộng `ai_call_contents` chứa chữ gửi đi (từ riêng, câu của Lan). B8E24 viết "ghi sau thì bị chặn
vì người dùng `deleting`", nhưng không có chỗ ghi nào đọc lại trạng thái.

**Bằng chứng (Đã kiểm):**
- `src/ai/runner/call-ledger.service.ts:51-88`: `record()` ghi `ai_calls` **sau** lời gọi, `userId: call.userId`; `ai_calls` "kept for good" (`prisma/models/ai.prisma:118`), không job nào xóa.
- `src/practice/ai/word-checks.repository.ts:17-22`: `put()` là `upsert` không điều kiện sau `check_private_word`; `practice_word_checks` không có job dọn (code facts §9, đã grep).
- `src/ai/runner/operations.repository.ts:76-83`: `storeFinal` có thể chèn lại hàng `ai_operations` với id của Lan (tự hết sau 24 giờ).
- Không bị: `usage_records`. `reserve` sau Tx B đọc gói của id đó, không còn gói nên từ chối, không chèn (`src/entitlements/usage/usage-ledger.service.ts:42-81`); `confirm` không thấy hàng thì chỉ log
  `usage_confirm_not_found` (`:112-114`). Câu AI của Practice cũng không bị, nhờ B7E115 (`practice_ai_requests` đã xóa thì bước ghi câu không ghi, `private-senses-cleanup.provider.ts:7-10`).
- Webhook tới sau khi xóa được ghi vào `billing_events` với `app_user_id` = id thật rồi mới `ignored` (`event-applier.service.ts:58-62, 99-101`); chỉ `raw_payload` được xóa sau 90 ngày.

**Nghi ngờ:** còn chỗ ghi muộn khác (ví dụ `reminder_deliveries` khi job nhắc đang chạy đúng lúc xóa: `notifications/scheduler/reminder-send.service.ts:56-86` ghi rồi xóa, nên nhiều khả năng sạch).

**Vì sao quan trọng.** Trái lời hứa "xóa" (SR11 viết lại ở §7.3, D15–D16) đúng ở bảng giữ mãi (`ai_calls`). Test "mọi cột có chủ" (7.4) và đếm bảng của smoke (17) không bắt được, vì
chúng chạy khi không có request song song.

**Đề xuất.**
1. Mọi bộ xóa phải **idempotent và chạy được khi hàng `users` đã mất** (chỉ cần `userId`).
2. Thêm một lượt **quét lại**: việc định kỳ `identity.deletion-sweep` chạy lại các bộ xóa cho mọi `user_id` trong `deleted_accounts` có `deleted_at` trong 24 giờ qua (lớn hơn
   mọi request dài nhất: AI 10 s × 2 lần thử, `prepare` K câu). Lượt quét sinh mã ẩn danh mới cho hàng muộn (nếu có), chấp nhận được.
3. Sửa B8E24 theo cơ chế thật; thêm ca M1 (mục "Độ phủ edge case"), và một ca smoke: giữ một lời gọi AI giả chậm, xóa tài khoản giữa chừng, chờ lượt quét, đếm `ai_calls` theo id.

---

## R2 — Cao — Tự liên kết theo email khi Google không "authoritative" cho email đó (cần chủ dự án)

**Mục:** 5.4 bảng (dòng 2 "gắn danh tính", dòng 3 IR9(b)), D8 (K8), B8E5, B8E6.

**Vấn đề.** Design gắn Google vào tài khoản có cùng email chỉ cần `email_verified = true`. Một Google Account có thể được tạo bằng **email không phải Gmail** (`lan@congty.vn`).
Với địa chỉ như vậy, `email_verified` chỉ nói email đã được xác minh **lúc tạo** tài khoản Google, không nói người đó còn giữ hộp thư. Ví dụ: Lan đăng ký Wordmet bằng
`lan@congty.vn`, nghỉ việc; công ty cấp lại hộp thư đó cho người khác; người mới tạo Google Account bằng `lan@congty.vn`, bấm "Tiếp tục với Google" → được gắn vào tài khoản
của Lan và vào thẳng, không cần mật khẩu.

**Bằng chứng (Đã kiểm, tài liệu Google).** Trang `verify-google-id-token` chia hai trường hợp: email đuôi `@gmail.com`, hoặc `email_verified` true **và** có `hd` (Google
Workspace): Google là nơi quản lý email đó, được phép bỏ qua mật khẩu khi liên kết. Còn lại thì, theo trang đó, "Google is not authoritative and password or other challenge
methods are recommended". Trang này cũng ghi chủ hộp thư bên thứ ba có thể đã đổi.

**Vì sao quan trọng.** Đây là đường chiếm tài khoản không cần mật khẩu. D8 chốt "tự liên kết theo email (K8)" nhưng lúc chốt chưa có thông tin này; thư IR22 "Google đã được liên
kết" chỉ tới đúng hộp thư mà kẻ chiếm đang giữ, nên không cảnh báo được ai.

**Đề xuất (cần chủ dự án chọn, theo luật D1: chủ dự án trả lời trước).** Các hướng: (a) giữ nguyên K8; (b) chỉ tự liên kết khi email là `@gmail.com` hoặc có `hd`; các email
khác: tài khoản cũ có mật khẩu thì hỏi mật khẩu một lần trước khi gắn, không có thì từ chối với lời nhắn; (c) như (b) nhưng thay mật khẩu bằng OTP gửi tới email (mở lại D12 cũ).
Dù chọn gì, thêm ca M10. Cũng áp cho nhánh IR9(b) (R6).

---

## R3 — Cao — `deleted_accounts` không sống sót qua chính lần khôi phục mà nó phục vụ (cần chủ dự án lúc Deploy)

**Mục:** 7.5, 12, 18, D21.

**Vấn đề.** §7.5 ghi: sau khi khôi phục backup, chạy `pnpm accounts:replay-deletions` để xóa lại mọi `user_id` trong `deleted_accounts`. Nhưng `deleted_accounts` là một bảng **trong
cùng DB**. Ví dụ: Lan xóa tài khoản ngày 10; DB hỏng ngày 12; khôi phục bản backup ngày 9. Bản ngày 9 có Lan trong `users` và **không** có Lan trong `deleted_accounts`. Chạy lệnh
thì không thấy gì để xóa: Lan "sống lại", đúng điều D21 muốn tránh.

**Bằng chứng (Đã kiểm, đọc design):** §7.5 "với mọi `user_id` trong `deleted_accounts` mà bảng `users` vẫn còn hàng"; §12 `deleted_accounts` là bảng Identity trong cùng Postgres.

**Đề xuất.**
- Thủ tục ghi vào `deploy-checklist.md` phải là: (1) trước khi khôi phục, xuất `deleted_accounts` từ DB đang chạy (nếu còn đọc được); (2) khôi phục; (3) nạp lại danh sách; (4)
  chạy lệnh. Thêm `pnpm accounts:export-deletions` / `--from <file>` cho lệnh chạy lại.
- Trường hợp DB mất hẳn: danh sách phải có bản **ngoài DB** (ví dụ mỗi lần xóa ghi một dòng `{user_id, deleted_at}` vào nơi lưu trữ riêng, giữ lâu hơn backup lâu nhất). Chỗ lưu là
  việc của Deploy, cần chủ dự án quyết cùng cách backup (D21 đã để thời hạn backup cho Deploy).
- Lệnh chạy lại phải **bỏ qua điều kiện** của §7.1 (đang gia hạn, admin cuối) và ghi `deleted_accounts` bằng `ON CONFLICT DO NOTHING` (xem R14).

---

## R4 — Cao — Các đường cũ chưa biết trạng thái `deleting`

**Mục:** 6, 7.2, B8E21, IE11; 10 (nhãn "Đang xóa").

**Vấn đề.** Design thêm `deleting` vào `users.status` và nói "mọi request bị từ chối", nhưng nhiều chỗ ghi cũ chỉ so với `'locked'` hoặc `'active'`. Bình thường `deleting` chỉ kéo dài
vài giây; khi Tx B lỗi (R12), nó kéo dài từ một giờ tới mãi mãi, và các lỗ dưới đây mở:

1. **Đăng nhập mật khẩu vẫn cấp phiên.** `decideCredential` chỉ trả `account_locked` khi `status === 'locked'` (`src/identity/auth/credential-decision.ts:37`), nên Lan
   (`deleting`) nhập đúng mật khẩu → `startChain` → có phiên mới. Spec IE11 đòi "refused with the generic failure"; design chỉ áp IE11 cho Google (5.4).
2. **Gia hạn phiên.** `refreshLocked` chỉ chặn `locked` (`src/identity/sessions/session.service.ts:152-157`). Với phiên vừa cấp ở (1): mọi request → 401 (guard mới), web gọi
   `/v1/auth/refresh` → 200 → lại 401: vòng lặp cho tới khi `auth.refresh.chain` (10/phút) trả 429.
3. **Admin "Mở khóa" hủy việc xóa.** `unlockUser` đặt `active` cho mọi trạng thái khác `active` (`src/identity/staff/staff.service.ts:301-303`). Admin thấy nhãn "Đang xóa" (design §10)
   mà bấm "Mở khóa" thì tài khoản trở lại `active`, đủ dữ liệu, việc thử lại (chỉ chọn `deleting`) bỏ qua: yêu cầu xóa của Lan bị hủy lặng lẽ.
4. **Admin "Khóa" làm kẹt việc xóa.** `lockUser` chỉ bỏ qua khi đã `locked` (`:281`), nên `deleting` → `locked`; việc thử lại không bao giờ chọn lại.
5. **Nghi ngờ:** `setStaffRole` chỉ từ chối `locked` (`:335`); `updateUser` (`:154`) và `resetPassword` (`:189`) không có kiểm `status` (grep trong khoảng `:154-220`
   không thấy), nên admin có thể sửa email, đặt mật khẩu, cấp vai trò cho tài khoản đang xóa.

Đã đúng sẵn: phát OTP chỉ khi `active` (`src/identity/auth/otp.service.ts:50`); đặt lại mật khẩu đòi `active` (`password.service.ts:108`); đăng ký lại vào email đó → 409
(`auth.service.ts:78`); thư nhắc học và thư gói chỉ tới người `active` (`identity.service.ts:102-109`).

**Đề xuất.** Ghi vào design (mục 6 hoặc 7.2) một bảng "đường nào làm gì với `deleting`": đăng nhập mật khẩu → lỗi chung 401 (IE11); refresh → từ chối và thu hồi chuỗi như
`locked`; mọi thao tác admin trên người dùng (`lock`, `unlock`, `PUT staff-role`, `PATCH`, đặt lại mật khẩu, cấp gói) → 409 `account-deleting`; admin xóa lại một tài khoản
`deleting` → chạy lại Tx B ngay (thay vì 409). Thêm ca M2, M3.

---

## R5 — Vừa — Báo lỗi: ngoại lệ D14 không có hàng nào, cách nhận ra xóa nhầm; báo lỗi về từ riêng thì sót (cần chủ dự án)

**Mục:** 7.3 dòng Practice, 19 ("cách nhận ra khi item đã bị dọn chưa kiểm"), D14.

**Vấn đề.**
1. **Ngoại lệ D14 không có gì để xóa.** Câu điền từ làm từ câu người học tự viết (`source = 'own_sentence'`) **không báo lỗi được**: tạo báo lỗi cho câu đó trả 409
   `report-not-available`. Nên "xóa báo lỗi về câu tự viết" luôn là 0 hàng.
2. **Cách nhận ra của design xóa nhầm.** "phiên `cloze_source='own'`" chọn **mọi** báo lỗi trong phiên đó, kể cả báo lỗi câu AI dạng `meaning_in_sentence` / `mcq_sentence` (báo được)
   nằm cùng phiên. Những báo lỗi đó lẽ ra phải giữ theo D14.
3. **Chỗ thật sự còn chữ Lan tự viết.** Câu AI về **từ riêng** của Lan báo lỗi được (không cần đồng ý từ learner UI D12), và bản chụp giữ nguyên từ được hỏi, phương án, gợi ý
   (`src/practice/reports/snapshot.ts:8-11, 19-24`), tức là lemma và có thể cả nghĩa Lan tự gõ; `sense_id` của báo lỗi trỏ tới nghĩa riêng sẽ bị xóa. Hôm nay, xóa **một** từ
   riêng đã xóa luôn báo lỗi của nó (`practice/maintenance/private-senses-cleanup.provider.ts:42`); design lại giữ chúng khi xóa **cả tài khoản**: ngược nhau.
4. Bản chụp còn giữ `learner.answer`, `answers_tried` (chữ Lan gõ khi trả lời, `snapshot.ts:44`); D14 chỉ nói "ghi chú".

**Bằng chứng (Đã kiểm):** `src/practice/reports/reports.service.ts:89-92` (chú thích), `:106` (`if (source === 'own_sentence' || (answerKey.asked_private && !isAi)) throw notAvailable()`);
`snapshot.ts` như trên; `private-senses-cleanup.provider.ts:42`.

**Đề xuất (cần chủ dự án: mở rộng ngoại lệ D14).** Bỏ quy tắc `cloze_source='own'`; ghi "ngoại lệ D14 được bảo đảm bởi `report-not-available`" và giữ một test cho điều đó.
Đề xuất xóa hẳn báo lỗi có `sense_id` là nghĩa riêng của Lan (giống `deleteForSenses` hôm nay), vì lý do D14 dùng cho ngoại lệ ("bản chụp chứa chính chữ của Lan") cũng đúng ở
đây. Hỏi thêm: `answer` / `answers_tried` trong bản chụp có xóa (đặt null) như ghi chú không. Practice cần danh sách nghĩa riêng của Lan trước khi Content xóa chúng, nên giữ thứ tự
Practice trước Content (đã có).

---

## R6 — Vừa — Nhánh IR9(b) trái D6/D7; `complete` không theo IR9(b)

**Mục:** 5.4 bảng dòng 3, 5.5, B8E6, B8E10.

**Vấn đề.** Ví dụ B8E6: X đăng ký mật khẩu bằng `minh@gmail.com`, khai ngày sinh 2015, tick đồng ý, rồi bỏ đó. Minh thật bấm Google. Design: xóa mật khẩu, đánh dấu đã xác minh,
gắn Google, **giữ dữ liệu**. Tài khoản chưa xác nhận không thể có dữ liệu học (không có phiên: đăng nhập trả `email-not-verified`, `auth.service.ts:135-149`), nên "dữ liệu" ở đây
chỉ là hồ sơ **do X khai**: tên, ngày sinh (có thể dưới 13), `terms_accepted_at`. Minh vào app với ngày sinh và lời đồng ý không phải của mình. D6 chốt "tài khoản chỉ được tạo khi
đã điền ngày sinh (từ 13 tuổi) và đồng ý", D7 chốt tên lấy từ Google.

Ngược lại, ở `POST /v1/auth/google/complete` (5.5, B8E10), nếu X đăng ký mật khẩu **sau** lúc Minh qua callback và **trước** lúc Minh bấm "Tạo tài khoản", design trả 409
`email-taken`, dù đúng tình huống này callback xử lý bằng IR9(b).

**Bằng chứng (Đã kiểm):** design 5.4, 5.5; `auth.service.ts:62-88` (đăng ký lại giữ `id`, ghi đè hồ sơ: khuôn có sẵn cho cách sửa dưới).

**Đề xuất.** Coi tài khoản chưa xác nhận như **không có**: callback đi nhánh "người mới" (cookie `google_signup`, màn D6); ở `complete`, nếu email thuộc một tài khoản chưa xác nhận
và `active` thì dùng lại `id` đó như đăng ký lại (ghi đè tên từ Google, ngày sinh, đồng ý; xóa mật khẩu; thu hồi chuỗi; đặt đã xác minh; gắn danh tính). Như vậy I15 vẫn đúng
(mật khẩu bị xóa, phiên bị thu hồi) mà D6/D7 cũng đúng. Ca chưa xác nhận nhưng `locked`: từ chối `account-locked`.

---

## R7 — Vừa — "Đang tự gia hạn" chưa định nghĩa; admin tắt gia hạn lỗi thì sao

**Mục:** 7.1, 8.1, 9.4 bước 2, B8E15, B8E16, D11.

**Vấn đề.**
1. Gói có 6 trạng thái: `trialing | active | grace | on_hold | expired | revoked`. "Hủy gói" chỉ cho `trialing`, `active` (8.1). Điều kiện chặn xóa ("đang tự gia hạn", 7.1)
   không ghi trạng thái nào. Lan ở `grace` (trừ tiền lỗi, nhà cung cấp đang thử lại): nếu không bị chặn thì xóa xong, lần thử lại thành công → Lan bị trừ tiền cho tài khoản không còn
   (webhook bị `ignored`, B8E25); nếu bị chặn thì Lan không xóa được mà cũng không hủy được (8.1 trả 409). Máy trạng thái lại cho `cancel_scheduled` ở cả `grace`, `on_hold`.
2. Admin xóa người có gói tự gia hạn (Đề xuất 7.1): `turnOffPaidRenewals` gặp lỗi hay timeout thì **không ném lỗi**, chỉ trả `not_supported` và log. Design chưa ghi: vẫn xóa (người
   đó tiếp tục bị trừ tiền) hay dừng.
3. Giữa Tx A và Tx B, một webhook `cancel_unscheduled` (Lan bật lại gia hạn ở trang của nhà cung cấp) làm gói thành "đang gia hạn" mà Tx B không kiểm lại.

**Bằng chứng (Đã kiểm):** `src/entitlements/entitlements.types.ts:15`; định nghĩa "sẽ gia hạn" của job thư gia hạn `billing-jobs.service.ts:133`
(`(status !== 'trialing' && status !== 'active') || cancelAtPeriodEnd` → không gia hạn); `subscription-machine.ts:164-170` (`cancel_scheduled` hợp lệ ở `grace`, `on_hold`);
`grants/grants.service.ts:384-396` (`settles(...)`, `all = false`, log `paid_renewal_not_cancelled`, trả `not_supported`).

**Đề xuất.** Một vị từ dùng chung cho chặn xóa, hiện nút "Hủy gói" và cho phép `cancel`: `status ∈ (trialing, active, grace, on_hold) AND cancel_at_period_end = false`. Admin xóa:
tắt gia hạn **trước** Tx A, ngoài khóa; `not_supported` → 409 `renewal-not-cancelled`, không xóa. Tx B (bộ xóa Entitlements, dưới `entitlements.user`) kiểm lại vị từ; nếu đúng thì
lỗi → nhánh thử lại, log cảnh báo. Câu cần chủ dự án (nhẹ): người ở `grace` / `on_hold` có phải hủy trước khi xóa không (đề xuất: có, như D11).

---

## R8 — Vừa — Race "admin cuối"

**Mục:** 7.1, 7.2 Tx A, B8E29.

**Vấn đề.** Hai admin A, B (chỉ hai admin). A xóa B, B xóa A cùng lúc: mỗi Tx A khóa `identity.user:<người bị xóa>` (khóa khác nhau), đếm admin = 2, cho qua → cả hai `deleting` → 0
admin. Tương tự: A xóa B trong lúc một admin khác hạ quyền A. Ngoài ra, phép đếm `staffRole = 'admin'` tính cả admin đang `deleting`.

**Bằng chứng (Đã kiểm):** `staff.service.ts:327-339`: `setStaffRole` khóa `identity.staff_role` và ghi rõ "Role changes never acquire the per-user lock as well"; đếm ở `:336`.

**Đề xuất.** Khi người bị xóa là nhân sự, Tx A lấy `identity.staff_role` **trước** `identity.user:<id>` (thứ tự mới, ghi vào design vì hiện không chỗ nào giữ cả hai), đếm admin
`status <> 'deleting'`. Thêm ca M4.

---

## R9 — Vừa — Vòng phụ thuộc module

**Mục:** 4, 7.1, 7.4, 11.

**Vấn đề.**
1. `identity.unverified-cleanup` cần cài đặt `identity.unverified_cleanup_days` từ `SettingsService`, nhưng `SettingsModule` **import** `IdentityModule` → Identity import Settings
   là vòng.
2. Kiểm "đang tự gia hạn" (7.1, trong Tx A của Identity) và "tự tắt gia hạn khi admin xóa" cần Entitlements; `EntitlementsModule` import `IdentityModule` → vòng. Registry bộ xóa
   (7.4) chỉ giải chiều "Identity gọi module xóa", chưa giải hai chỗ này.
3. Bộ xóa `module: 'common'` phải đăng ký vào registry của Identity, tức `src/common` import `src/identity`: CLAUDE.md cấm ("`src/common/**` never imports from `src/identity/**`").

**Bằng chứng (Đã kiểm):** `src/settings/settings.module.ts` (`imports: [IdentityModule]`); `src/entitlements/entitlements.module.ts:29`; `src/identity/identity.module.ts`
(`imports: [MailModule]` duy nhất); CLAUDE.md mục Architecture (D3).

**Đề xuất.** Thêm vào 7.4 một port thứ hai `AccountDeletionPrecondition` (Entitlements đăng ký: `check(tx, userId)` và `prepareAdminDelete(userId)`), cùng khuôn fail closed. Cài
đặt số ngày dọn: job dọn đặt ở module khác (ví dụ một `AccountMaintenance` import cả Identity và Settings), hoặc Identity đọc qua một port Settings đăng ký vào. `idempotency_keys`:
Common xuất một hàm `deleteIdempotencyKeysOf(tx, userId)`, Identity gọi trực tiếp (Identity được import Common); registry còn sáu module.

---

## R10 — Vừa — Admin và web người học chung một cookie phiên

**Mục:** 5.7, 10, 13, B8E12.

**Vấn đề.** Cả hai web gửi `client: 'web'`, nên API đặt cùng một cookie `refresh_token` (`path=/v1/auth`) trên **host của API**, dùng chung cho admin và web người học (local:
`localhost`; production: `api.wordmet.com`). Ví dụ: Hà mở admin (phiên mật khẩu), rồi trong cùng trình duyệt đăng nhập Google ở `/app`. Cookie bị thay bằng chuỗi Google. Lần gia
hạn sau của tab admin nhận chuỗi Google; `/v1/me` vẫn trả `staff_role` nên cổng admin cho vào, rồi **mọi** route admin trả 403 `password-login-required`. Transport admin chỉ xử lý
`forbidden` và `password-change-required`, nên admin hiện lỗi ở từng trang thay vì đưa về đăng nhập.

**Bằng chứng (Đã kiểm):** `src/identity/sessions/session-transport.ts:13-15, 23-26`; admin `src/auth/session-store.ts:48` (`client: 'web'`), `:181-195` (chỉ hai slug 403); web
`src/app-shell/session/session-store.ts:54`.

**Đề xuất.** Admin: 403 `password-login-required` → đăng xuất với lời nhắn "Đăng nhập lại bằng mật khẩu". Tốt hơn: `/v1/me` trả `auth_method` của chuỗi hiện tại để cổng admin chặn ngay.
Thêm ca M5. (Việc chung cookie đã có từ trước, nhưng trước Bước 8 nó vô hại vì mọi chuỗi đều dùng được cho admin.)

---

## R11 — Vừa — Web: hạ cánh sau Google

**Mục:** 5.4 bước 5, 5.5, 9.1, 9.2, B8E39.

**Vấn đề.**
1. **Cờ `logout-pending`.** Khi một lần đăng xuất chưa tới được server, web đặt cờ trong `sessionStorage`; lúc khởi động mà còn cờ thì **không gia hạn**, coi như đã đăng xuất.
   Cờ chỉ được xóa khi đăng nhập qua `startSession` (mật khẩu). Luồng Google không qua đó: Lan quay về từ Google, API đã đặt cookie, nhưng web vẫn hiện "đã đăng xuất" và đưa về
   trang đăng nhập, vòng mãi trong tab đó.
2. **Định dạng `next`.** Web tạo `next` có tiền tố ngôn ngữ (`/vi/app/groups`); design cho API chỉ nhận `next` "bắt đầu bằng `/app`" rồi ghép `/{locale}{next}`. `next` của trang
   đăng nhập luôn bị bỏ → về `/app`, mất liên kết sâu.
3. **Nhóm route.** `/app/complete-profile` nằm trong `(member)` (bọc `RequireSession`, chưa có phiên là chuyển đi). `/app/google/complete` phải ở `(auth)` (bọc `AuthGate`), design chưa ghi.
4. Tab khác không biết Lan đã đăng nhập (không có `broadcast('login')`) cho tới khi tải lại.

**Bằng chứng (Đã kiểm):** web `src/app-shell/session/session-store.ts:36, 148, 219-223`; `src/app-shell/RequireSession.tsx:65-68`; `src/app-shell/locale-prefix.ts:3-9` (`safeNext`
nhận `/(vi|en)/app…`); `src/app/[locale]/app/(member)/complete-profile/page.app.tsx`, `(auth)/layout.app.tsx`.

**Đề xuất.** Nút Google xóa cờ `logout-pending` trước khi chuyển trang (và phát `login` khi khởi động thành công từ Google, ví dụ callback thêm `?signed_in=google`); API nhận `next`
theo đúng regex của `safeNext`; ghi `/app/google/complete` thuộc `(auth)`. Thêm ca M6, M7.

---

## R12 — Vừa — Tx B có thể hết giờ mỗi lần

**Mục:** 7.2, 7.3 (Content), 19.

**Vấn đề.** Tx B là một interactive transaction của Prisma. Code hiện đặt `timeout` 10 s (Identity, Entitlements, Content) hoặc 30 s (Learning). Một người học lâu năm: hàng chục nghìn
`learning_log`, `practice_session_items` (giữ 6 tháng), tới 10.000 từ riêng (`privateWordsPerUser`), mỗi từ xóa một lần qua `deletePrivateEntryContent` (khóa, tìm, xóa một entry,
trigger `entries_clear_form_kind` chạy mỗi hàng). Quá timeout thì Tx B rollback; việc thử lại chạy **cùng** Tx B nên lỗi y hệt mỗi giờ: kẹt `deleting` mãi, chỉ có log sau 24 giờ.
§19 chỉ nói "request lâu".

**Bằng chứng (Đã kiểm):** `const transactionOptions` ở `identity/auth/auth.service.ts:25`, `learning/quick-add/quick-add.service.ts:14` (30 s) và 18 file khác;
`content/private/private-words.service.ts:221-227` (xóa một entry mỗi lần gọi); `settings.definitions.ts:60` (`privateWordsPerUser: 10000`); trigger
`migrations/20261018130000_form_of_unlink/migration.sql:6-13`.

**Đề xuất.** Ghi timeout riêng cho Tx B (ví dụ 120 s) và `statement_timeout` phù hợp; bộ xóa Content xóa hàng loạt (`DELETE FROM entries WHERE scope = 'private' AND
owner_user_id = $1`); smoke đo một người học có, ví dụ, 50.000 dòng `learning_log` và 2.000 từ riêng, ghi thời gian vào as-built. Nếu vẫn quá, phương án (b) của D23 (worker) là đường
lui đã ghi.

---

## R13 — Vừa — Đổi `AuthGuard` (D24): phạm vi ảnh hưởng

**Mục:** 6, 17.

**Vấn đề và bằng chứng (Đã kiểm):**
1. `AuthGuard` gắn `request.user` cả ở route `@Public` khi có token hợp lệ (`src/identity/sessions/auth.guard.ts:22`). Design chỉ nói về "token hỏng". Với token **hợp lệ** của người
   `locked`/`deleting` trên route `@Public` (`/v1/auth/refresh`, `/logout`, `/v1/sources`, `/health`): nên coi là ẩn danh và **không đọc DB**, không trả 401 (web gửi `/logout` khi
   đăng xuất; 401 ở đó vô nghĩa).
2. **Test hỏng:** `auth.guard.spec.ts:32` dựng `new AuthGuard(new Reflector(), tokens)`. 24 file controller spec dùng `createTestApp` với Prisma giả chỉ có `$disconnect`
   (ví dụ `src/identity/auth/password.controller.spec.ts:24-27`) và ký token cho `randomUUID()` không có hàng `users`: mọi request có token sẽ 500 hoặc 401. Plan phải có một bước
   cho việc này (ví dụ đặt việc đọc trạng thái sau một provider `AccountStatusReader` mà `createTestApp` thay bằng bản giả trả `active`).
3. **Smoke:** "Xong khi" (17) chạy `smoke:buoc-4`, `-5`, `-7` nhưng không chạy `smoke:buoc-0-3-fixes`, nơi có luồng khóa tài khoản (`scripts/smoke-buoc-0-3-fixes.mjs:346-366`), và
   `smoke:buoc-6`, nơi B6#24 gọi `ai:fake-call delete-user-data` (`scripts/smoke-buoc-6.mjs:480-492`) mà 7.4 sẽ đổi. `ai.service.spec.ts:93-107` (kiểm đúng một
   `$transaction`) cũng phải sửa.
4. Mỗi request người học đọc `users` hai lần (guard mới và `LearnerContentGuard` → `getProfile`, `learner-content.guard.ts:19`).
5. **Nghi ngờ / tùy chọn:** guard chỉ đọc `status`, không đọc chuỗi phiên. Tài khoản bị khóa rồi **mở khóa** trong 15 phút: access token cũ (chuỗi đã thu hồi lúc khóa) lại dùng
   được tới hết hạn. Đăng xuất "mọi thiết bị" cũng vậy (đã có từ Bước 1).

**Đề xuất.** Ghi (1) vào §6; thêm (2), (3) vào §17. Đơn giản hóa (4) và (5) cùng lúc: guard đọc **một** hàng `session_chains` nối `users` theo `sid` (khóa chính), lấy `revoked_at`,
`status`, `auth_method`; gắn kết quả vào request để `LearnerContentGuard` và `PermissionGuard` dùng lại. Kiểm `revoked_at` vượt phạm vi D24 (đóng thêm kẽ hở đăng xuất), nên hỏi chủ dự án.

---

## R14 — Vừa — Việc thử lại, chạy lại và thứ tự khóa

**Mục:** 7.2 "Tx B lỗi", 7.3 (thứ tự), 7.5, 7.6.

**Vấn đề.**
1. `MaintenanceScheduler` nằm trong `CommonModule`; worker dựng cùng `AppModule`; `onApplicationBootstrap` không kiểm `runWorkers`. Theo code, nó chạy ở **cả hai** process
   (Đã kiểm bằng đọc code; **chưa chạy thật**). Chú thích của nó viết "Running the same job on several instances at once is harmless: every job only deletes or nulls expired
   rows": hai job mới của Bước 8 không còn đúng như vậy.
2. `identity.deletion-retry` chọn **mọi** `deleting`, kể cả tài khoản mà request đang chạy Tx B ngay lúc đó. Có khóa thì lượt thử lại chờ; khi vào được thì hàng `users` đã mất. Design
   chưa ghi "không còn hàng `users` = xong" và `deleted_accounts` sẽ trùng khóa chính.
3. Thứ tự khóa (design để plan kiểm). Đã ghi trong code: `practice.user` là "bước 1, trước hàng phiên, item Practice và item Learning" (`src/practice/practice-lock.ts:3-5`);
   `deleteMyWord` lại khóa `learning.user` → `content.private` → hàng Practice (`learning/quick-add/quick-add.service.ts:89-92`). Tx B theo thứ tự Practice → Learning → Content
   ngược với `deleteMyWord` ở cặp (Learning, Practice), nên một `deleteMyWord` đang chạy (qua guard trước Tx A) có thể deadlock với Tx B (Postgres hủy một bên).
4. Lý do thứ tự ở 7.3 ("`practice_session_items.question_id` là FK RESTRICT") là FK **trong** Practice, chỉ quyết thứ tự bên trong bộ xóa Practice; lý do thật để Practice đi trước là
   thứ tự khóa trên và R5 (cần danh sách nghĩa riêng).

**Bằng chứng (Đã kiểm):** `src/worker.ts:11-13`; `src/common/common.module.ts` (provider `MaintenanceScheduler`); `src/common/maintenance/maintenance.scheduler.ts:10-14, 52-56`;
các file khóa ở trên; `src/entitlements/entitlements.locks.ts:4-7`.

**Đề xuất.** Thử lại chỉ chọn `deleting_since < now − 10 phút`; Tx B mở bằng `withUserLock` rồi đọc lại hàng `users` (không còn → xong, không lỗi); `deleted_accounts` ghi
`ON CONFLICT DO NOTHING`. Ghi thứ tự khóa đầy đủ của Tx B vào design: `identity.user` → `practice.user` → hàng Practice → `learning.user` → item Learning → `content.private` →
`entitlements.user` → `entitlements.pool:*`, và chấp nhận deadlock hiếm với `deleteMyWord` (rơi vào nhánh thử lại). Sửa chú thích scheduler. Ca M13.

---

## R15 — Thấp — Dọn tài khoản chưa xác nhận: mốc `updated_at` và tài khoản bị khóa

**Mục:** 7.6, B8E32, B8E33.

**Vấn đề (Đã kiểm).** `users.updatedAt` có `@updatedAt` (`prisma/models/identity.prisma:22`): **mọi** `tx.user.update` của Prisma đặt lại mốc. Đăng nhập sai vào tài khoản chưa xác
nhận tăng `failedLoginCount` (`credential-decision.ts:25-31`), đăng nhập đúng đặt lại về 0 (`:38`): ai cũng giữ được tài khoản rác sống mãi bằng một lần đăng nhập sai mỗi tuần.
Ngoài ra 7.6 lọc `status = 'active'`, nên đúng ví dụ của D17 (50 tài khoản rác, admin **khóa**) không bao giờ được dọn.

**Đề xuất.** Dùng `terms_accepted_at` (đặt lại ở mỗi lần đăng ký và đăng ký lại, `auth.service.ts:66-69`, không đổi khi đăng nhập) hoặc thêm `registered_at`; bỏ điều kiện
`status = 'active'` (giữ "không vai trò", "chưa xác nhận"). Ca M16.

---

## R16 — Thấp — Thư "đã xóa" ở nhánh 202

**Mục:** 7.2 bước 4, "Tx B lỗi", B8E22, D13.

**Vấn đề (Đã kiểm).** D13: "một thư 'tài khoản đã được xóa' khi xong". Ở nhánh 202, việc xóa xong trong việc định kỳ, nơi không có `res`; `MailDispatcher.afterResponse(res, jobs)` cần
`res` (`src/common/mail/mail-dispatcher.service.ts:25-32`); có `runNow` (`:34-36`). Design không ghi thư cho nhánh này, cũng không ghi email lấy từ đâu (hàng `users` vẫn còn
tới cuối Tx B). Admin xóa thì có thư (câu 17 của QA log), đúng.

**Đề xuất.** Tx B đọc email ngay đầu (dưới khóa), trả về; sau commit: trong request dùng `afterResponse`, trong job dùng `runNow`; `by='cleanup'` và chạy lại sau backup thì không gửi.
Ca M14.

---

## R17 — Thấp — Bảng xóa/giữ (7.3) còn thiếu chi tiết

**Mục:** 7.3, 7.4, B8A3.

Đã đối chiếu từng cột của 10 file `prisma/models/*.prisma` (53 cột trỏ tới người dùng, khớp code facts §1). 7.3 phủ đúng mọi bảng có dữ liệu người học; còn thiếu:
- **Cột "ai đã làm" chưa liệt kê:** `users.locked_by` (người khác bị Lan, nếu Lan là admin, khóa), `practice_reports.resolved_by`, `practice_report_reasons.updated_by`. Test 7.4 bắt được
  nhờ mẫu `*_by`, nhưng bảng chữ cho chính sách riêng tư (dựng từ 7.3) sẽ thiếu.
- **Điều kiện chọn hàng:** `billing_events` của Lan là `user_id = X OR app_user_id = X OR subscription_id IN (gói của X)` (`entitlements.prisma:97-100`); `entitlement_notices`
  có cả `user_id` và `recipient_user_id` (`:189-190`). Webhook tới sau khi xóa tạo lại `billing_events` mang `app_user_id` thật (R1).
- **Log:** stdout mang `user_id` (code facts §10); thời hạn giữ log là việc Deploy, nên vào `deploy-checklist.md` cùng thời hạn backup.
- **B8A3** ghi "không còn hàng nào mang id của Lan ngoài `deleted_accounts` và các cột giữ", nhưng `rate_limit_counters.key` chứa id trần tới 24 giờ (7.3 đã ghi): sửa B8A3, nếu
  không smoke "đếm mọi bảng" sẽ đỏ.
- **Vết cấp gói của editor** (cần chủ dự án, tùy chọn): xóa `entitlement_grants` của người nhận làm mất luôn bản ghi "editor nào cấp Pro cho ai, lý do gì" mà D33 Bước 5 cho admin
  xem lại. Phương án: giữ hàng, `user_id` = mã ẩn danh, như giao dịch.
- Cascade của `users` là 6 bảng (`password_credentials`, `session_chains` → `refresh_tokens`, `otp_codes`, `otp_failure_windows`, `user_identities`), không phải 5.

Đã kiểm, **không** vướng: mã ẩn danh với các unique index (`usage_records_live_use_key`, `usage_records_credit_key` theo `(user_id, pool, operation_id)`,
`migrations/20261019094400_entitlements/migration.sql:234-236`: mọi hàng của Lan chuyển sang **cùng** một mã nên không trùng; `billing_transactions` unique không có `user_id`,
`20261023100000_billing_transactions/migration.sql:32`; `practice_reports.item_id` unique, FK `SET NULL`, `20261018150000_practice/migration.sql:102, 114`); FK RESTRICT duy nhất
liên quan là `practice_session_items.question_id` (`:111`) và `practice_reports.reason` (chỉ trỏ tới bảng lý do, không bị xóa); trigger duy nhất là `entries_clear_form_kind` (grep
`TRIGGER` trên mọi migration chỉ ra một dòng); `senses.replaces_sense_id` RESTRICT chỉ dùng cho catalog (grep).

---

## R18 — Thấp — Chi tiết luồng Google

**Mục:** 5.2–5.9, B8E38.

- Cookie `google_oauth` (5.3) chỉ liệt kê `state`, `nonce`, `code_verifier`; phải giữ thêm `intent`, `locale`, `next`, và với `reauth` là `user_id` của vé. `locale` phải thuộc
  `{vi, en}` (đang ghép thẳng vào địa chỉ chuyển về).
- Hai tab cùng bấm Google: tab sau ghi đè `google_oauth`, tab trước về callback → `google-failed` (chấp nhận được; ghi thành ca M18).
- `email_verified`: ví dụ payload trên trang OpenID Connect của Google viết dạng chuỗi `"true"`; chấp nhận cả `true` và `"true"`, kiểm lại ở lần chạy thật D4.
- PKCE với client loại Web có client secret: discovery của Google có `code_challenge_methods_supported: plain, S256`, nhưng phần đã đọc của hướng dẫn web-server không mô tả
  `code_challenge` cho loại này: ghi `ASSUMPTION`, kiểm trong lần chạy thật.
- `GOOGLE_REDIRECT_URI` "mặc định `<API>/…`": API không có biến URL gốc của chính nó (`.env.example` chỉ có `ADMIN_APP_URL`, `LEARNER_APP_URL`); cho biến này bắt buộc khi có
  `GOOGLE_CLIENT_ID`.
- Chặn bản giả ở production: code không đọc `NODE_ENV` ở đâu (grep `src`); bản giả của billing và AI chặn bằng `BILLING_PRODUCTION` (`common/config/app-config.ts:238-246`). Dùng
  cùng cờ đó cho `GOOGLE_FAKE_ENABLED` và sửa B8E38. Bản giả nên kiểm token bằng khóa trong bộ nhớ (`createLocalJWKSet`) thay vì API tự gọi HTTP tới JWKS của chính nó.
- `POST /v1/auth/google/complete` chưa có giới hạn tần suất; đề xuất dùng lại `auth.register.ip`.

---

## R19 — Thấp — API cho màn Gói và các mã trả về

- Màn 8.2 cần "Gia hạn ngày 12/11/2026", nhưng `GET /v1/me/entitlements` chỉ trả `ends_at` **khi** đã hủy gia hạn (`src/entitlements/entitlements.service.ts:157`); thêm
  `renews_at` và `cancel_at_period_end` vào §13.
- `deletion-pending` là 202 nhưng xếp vào "Lỗi mới (Problem Details)": 202 là thành công, nên trả thân thường (`{ "status": "pending" }`).
- `DELETE /v1/admin/users/{id}` có body `{ confirm_email }`; các thao tác admin khác là `POST …/lock`, `…/unlock`. Đề xuất `POST /v1/admin/users/{id}/delete` cho đồng bộ và tránh
  proxy bỏ body của `DELETE`.

---

## R20 — Thấp — Dẫn chứng lệch nhẹ và vài ca nhỏ

- 5.2 dẫn `app-config.ts:90-94` cho "bản giả không chạy production": đó là kiểu dữ liệu; chỗ chặn ở `:238-246`.
- 7.3 dẫn "code facts §2" cho FK RESTRICT: nằm ở mục "Điểm đáng chú ý" số 2 của code facts.
- B8E27 "plan kiểm `refunds.ts`": logic quyết định nằm ở `usage-ledger.service.ts:148-149` (không có gói → `refunded: false`); kết luận của B8E27 đúng (xem "Đã kiểm, đúng").
- Thiếu ca: nhân sự **chỉ có Google** (người học được cấp vai trò) không vào admin được tới khi làm "Quên mật khẩu"; dòng "Đổi mật khẩu" ở Cài đặt với tài khoản chỉ có Google (đổi cần
  mật khẩu hiện tại) nên dẫn sang "Đặt mật khẩu" qua IR7. Ca M19.
- Nhãn cách đăng nhập ở admin (§10) là phần thêm ngoài D8 (D8 chỉ nói dòng ở Cài đặt người học); vô hại, nên gắn nhãn **Đề xuất**.

---

## Đã kiểm, đúng (không cần sửa)

- `auth.guard.ts:15-27` không đọc DB; `permission.guard.ts:29-35` đọc chuỗi phiên mỗi request (nên thêm `auth_method` là hợp lý).
- `session-transport.ts:13-15` (`httpOnly`, `secure`, `sameSite: 'strict'`, `path: '/v1/auth'`), `:39-43` (bắt header `X-CSRF-Protection`).
- `auth.service.ts:51-52` (`age-below-minimum`), `:66-70` (đăng ký lại đặt `updatedAt`), `:78` (409 `email-taken` cho email đã xác minh), `:117-121` (không có mật khẩu → lỗi chung, IE5).
- `staff.service.ts:336-338` (không hạ admin cuối); `grants.service.ts:384-396`; `billing-adapter.ts:40`; `fake-billing.adapter.ts:61-66` (chỉ ghi cờ, không phát event);
  `subscription-machine.ts:164-169`; `event-applier.service.ts:62, 99-101` (B8E25 đúng); `email.provider.ts:23` và `identity.service.ts:102-109` (B8E26 đúng: người không `active`
  không nhận thư); `normalize-email.ts:3`; `entry-usage.ts:18, 39-43`; `quick-add.service.ts:50, 92`; `learning/entry-usage.probe.ts:15-17`; `ai.service.ts:42-49`.
- Web: `AuthCard.tsx:76-88`, `SettingsPage.tsx:176`, `RequireSession.tsx:78-80` (màn chọn tiếng mẹ đẻ). Admin: `messages/vi.json:85` "Không rõ người dùng", `:1391` "Người dùng đã
  xóa", `:1597` "người dùng đã xóa" (ba chữ khác nhau, đúng như §10).
- `jose` 6.2.12 (`package.json:53`, `node_modules/jose/package.json`), có `createRemoteJWKSet`.
- CSP không đổi: nút là liên kết chuyển trang, `POST /v1/auth/google/reauth` là `fetch` tới `apiOrigin` vốn đã có trong `connect-src`.
- B8E27: báo lỗi mang mã ẩn danh được xác nhận sau khi xóa → `refund(anon, …)` không thấy gói → `{ refunded: false }`, không lỗi, không lặp mãi (`usage-ledger.service.ts:140-159`;
  `practice-cleanup.service.ts:62-65`).
- D16: số người dùng AI mỗi ngày đếm `count(DISTINCT user_id)` trên `usage_records` (`entitlements/usage/usage.queries.ts:80`), nên mã ẩn danh giữ đúng con số. `ai_calls.user_id = NULL`
  không làm sai dashboard nào (grep `DISTINCT … user_id`: chỉ có chỗ trên).
- **Google, đã xác nhận trên tài liệu chính thức:** `prompt` chỉ có `none`, `consent`, `select_account` (không có `login`); `login_hint` nhận email **hoặc** `sub`; `iss` là
  `accounts.google.com` hoặc `https://accounts.google.com`; tên và ảnh **không bảo đảm** có (đúng D6 thêm ô tên); `auth_time` cần app đã publish, đã xác minh **và** bật "Session age
  claims" (trang security-bundle), nên tiền đề của D25 và §0 đúng; địa chỉ quay về `http://localhost` được phép. **Cookie:** RFC 6265bis cho lưu cookie `SameSite` khác `None`
  nhận từ một request điều hướng cấp cao nhất, kể cả khi chuỗi chuyển hướng bắt đầu ở site khác; nên `ASSUMPTION` ở §5.4 có cơ sở. Phần còn phải kiểm ở lần chạy thật là
  trình duyệt có gửi cookie đó ở `fetch` cùng site ngay sau.
- Đối chiếu quyết định: D2–D4, D6 (trừ R6), D7, D8 (trừ R2), D9, D10, D12, D13 (trừ R16), D15–D25 có mặt và khớp; phần thêm của Claude đều gắn **Đề xuất** (5.7, 7.1 admin tắt
  gia hạn, 7.7 mọi giao dịch, 11 khoảng giá trị), trừ §10 nhãn cách đăng nhập (R20). Không thấy quyết định nào bị bỏ quên.

---

## Độ phủ edge case

Luật design dẫn và ca When → Then đã có:

| Luật | Ca có | Ghi chú |
|---|---|---|
| IR8, I13 | B8E1–B8E4 | Thiếu: `email_verified` dạng chuỗi (R18) |
| IR9, I14, I15, K8 | B8E5, B8E6 | B8E6 phải đổi theo R6; thiếu email không authoritative (R2), tài khoản trùng email đang `locked`/`deleting` (M11) |
| IE4, IE5 | B8E7, 5.6 | |
| IE11 | 5.4 dòng 1 | Thiếu đăng nhập mật khẩu và gia hạn (R4) |
| IE15 | B8E4 | |
| IR17, D5 | B8E12 | Thiếu cookie chung với admin (R10) |
| IR18, I25, SR11 | B8E13–B8E24 | B8E24 không có cơ chế (R1); thiếu đường cũ với `deleting` (R4) |
| IR19 | B8E35 | Thiếu thư ở nhánh 202 (R16) |
| IR22 | B8E5 | |
| SR8 (cancel) | B8E36 | |
| SR13 | B8E18 | Thiếu giới hạn cho `google/complete` (R18) |

**Ca thiếu đáng thêm** (When → Then đề xuất):

| # | When | Then (đề xuất) |
|---|---|---|
| M1 | Lời gọi AI của Lan trả về sau khi Tx B commit | Hàng muộn (`ai_calls`, `ai_call_contents`, `practice_word_checks`) bị lượt quét lại xóa hoặc ẩn danh trong 24 giờ (R1) |
| M2 | Lan (`deleting`, Tx B đã lỗi) đăng nhập mật khẩu đúng | 401 lỗi chung, không tạo chuỗi phiên (IE11, R4) |
| M3 | Admin bấm Mở khóa / Khóa / đổi vai trò / sửa / đặt lại mật khẩu trên tài khoản `deleting` | 409 `account-deleting`, không đổi gì (R4) |
| M4 | Hai admin (chỉ hai) xóa nhau cùng lúc | Một bên 409 `last-admin` (R8) |
| M5 | Hà đăng nhập Google ở `/app` khi tab admin đang mở | Tab admin đăng xuất với lời nhắn "đăng nhập lại bằng mật khẩu" (R10) |
| M6 | Lần đăng xuất trước chưa tới server (cờ `logout-pending`), Lan bấm Google | Vào app bình thường (R11) |
| M7 | Trang đăng nhập có `next=/vi/app/groups`, Lan bấm Google | Về `/vi/app/groups` (R11) |
| M8 | Gói của Lan ở `grace`, Lan bấm xóa / Hủy gói | Theo vị từ chung của R7 |
| M9 | Admin xóa người có gói tự gia hạn, nhà cung cấp không trả lời | 409 hoặc 503, không xóa (R7) |
| M10 | Google trả `lan@congty.vn`, `email_verified` true, không `hd`, trùng tài khoản có mật khẩu | Theo quyết định ở R2 |
| M11 | Google trùng email của tài khoản đã xác minh đang `locked` / `deleting` | `account-locked` / `google-failed`; **không** gắn danh tính |
| M12 | Người học có 50.000 dòng `learning_log`, 2.000 từ riêng xóa tài khoản | Xong trong timeout của Tx B (R12) |
| M13 | Việc thử lại tới đúng lúc Tx B trong request đang chạy | Chờ khóa, thấy `users` đã mất, coi là xong; không lỗi, không ghi trùng `deleted_accounts` (R14) |
| M14 | Tx B lỗi, một giờ sau việc định kỳ xóa xong | Đúng một thư "đã xóa" (R16) |
| M15 | Lan (`deleting` kẹt) đăng ký lại cùng email / bấm Google | 409 `email-taken` / `google-failed`; câu trên màn nói "tài khoản đang được xóa" |
| M16 | Tài khoản chưa xác nhận bị đăng nhập sai mỗi ngày; hoặc bị admin khóa | Vẫn bị dọn sau N ngày từ lần đăng ký (R15) |
| M17 | DB mất hẳn, khôi phục từ backup | Danh sách đã xóa lấy từ nơi lưu ngoài DB, chạy lại xóa trước khi mở app (R3) |
| M18 | Hai tab cùng bấm Google | Tab sau thắng; tab trước `google-failed` (R18) |
| M19 | Người chỉ có Google được cấp vai trò editor rồi mở admin | Đăng nhập mật khẩu lỗi chung; hướng dẫn "Quên mật khẩu" để đặt mật khẩu (R20) |
| M20 | Webhook `cancel_unscheduled` của Lan tới giữa Tx A và Tx B | Tx B kiểm lại, lỗi sang nhánh thử lại, log cảnh báo (R7) |
| M21 | Lan có báo lỗi câu AI về một từ riêng | Theo quyết định ở R5 |
| M22 | Route `@Public` nhận token hợp lệ của người bị khóa | Coi là ẩn danh, không 401 (R13) |
| M23 | Chạy lại xóa cho một người mà bản backup còn ghi "đang gia hạn" hoặc "admin cuối" | Bỏ qua điều kiện, vẫn xóa; không thư (R3, R14) |
| M24 | Bấm xóa hai lần, cả hai request đã qua guard trước Tx A đầu tiên | Lần hai thấy `deleting` trong Tx A → trả như lần đầu (204 hoặc 202), không chạy Tx B lần hai song song |

---

## Có thể đơn giản hóa (không phạm quyết định nào của chủ dự án)

- **Một lần đọc cho cả guard:** `AuthGuard` đọc `session_chains` nối `users` theo `sid` (khóa chính): có `status` (D24), `auth_method` (D5), `revoked_at`; `PermissionGuard` và
  `LearnerContentGuard` dùng lại kết quả trên request (R13). Kiểm `revoked_at` là phần thêm, cần chủ dự án.
- **Bỏ quy tắc `cloze_source='own'`** ở bộ xóa Practice: ngoại lệ D14 đã do `report-not-available` bảo đảm (R5).
- **Bản giả Google** kiểm chữ ký bằng khóa trong bộ nhớ (`createLocalJWKSet`), không cần API tự gọi JWKS của chính nó (R18).
- `billing.transactions-expire` chạy theo scheduler mỗi giờ là đủ (xóa hàng quá hạn chạy lặp vô hại); không cần cơ chế "mỗi ngày" riêng.
- ID token lấy thẳng từ token endpoint qua HTTPS: Google ghi có thể tin mà không kiểm chữ ký. Vẫn nên giữ kiểm JWKS vì IR8 đòi và bản giả dùng chung đường.

---

## Kết luận

**Viết plan được sau khi sửa**, không cần viết lại design. Các sửa Cao và Vừa đều là thêm luật hoặc thêm ca vào mục có sẵn (6, 7.1–7.6, 5.4, 9.2, 17), không đổi kiến trúc:
registry bộ xóa, mã ẩn danh, hai transaction, cookie mã hóa vẫn đứng. Phải sửa **trước** khi viết plan: R1, R3 (phần thủ tục), R4, R6–R14; R15–R20 sửa cùng lúc hoặc ghi vào plan.

**Cần chủ dự án quyết** (theo luật D1: chủ dự án trả lời trước):
- **R2** — tự liên kết Google với email không do Google quản lý (mở rộng D8/K8).
- **R5** — xóa luôn báo lỗi về từ riêng, và câu trả lời gõ trong bản chụp (mở rộng ngoại lệ D14).
- **R3** — danh sách đã xóa lưu ngoài DB ở đâu (lúc Deploy, cùng D21); thủ tục xuất/nạp ghi ngay ở Bước 8.
- **R7** (nhẹ) — người ở `grace` / `on_hold` có phải hủy trước khi xóa không.
- Tùy chọn: **R13** (guard kiểm cả chuỗi phiên đã thu hồi), **R17** (giữ `entitlement_grants` dạng ẩn danh để còn vết cấp gói của editor).

Các mục còn lại là sửa kỹ thuật, không cần chủ dự án.

## Ghi chú

- Chưa kiểm được (`ASSUMPTION`): scheduler chạy ở cả hai process (chỉ đọc code); các race của R1, R8, R14 (suy ra từ code và thứ tự lệnh, chưa chạy); PKCE với client Web có secret;
  trình duyệt gửi cookie `Strict` ở `fetch` ngay sau chuyển trang từ Google (đã có cơ sở từ RFC 6265bis cho việc **lưu** cookie, việc **gửi** cần lần chạy thật D4).
- Review không xét chữ trên màn và chất lượng thư; không đối chiếu design với `docs/specs/` ngoài định nghĩa các mã luật (luật dự án 12/10/2026).
