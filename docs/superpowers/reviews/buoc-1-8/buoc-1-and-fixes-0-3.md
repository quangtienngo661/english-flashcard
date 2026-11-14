# Review độc lập — Bước 1 (Identity core) và đợt sửa thiếu sót Bước 0–3 (29/10/2026)

Người review: Claude (subagent, read-only với code). Worktree `review-buoc-1-8-b95feb`, nhánh `docs/review-buoc-1-8` @ `867d385` (cắt từ `origin/dev`).
Phạm vi: Bước 1 + phần identity / admin session / nền (`src/common`) của đợt sửa Bước 0–3; phần content của đợt sửa chỉ spot-check qua smoke output.

**Giới hạn của lần review này:** không chạy unit test (worktree không có `node_modules` và `src/generated/prisma`; cài dependency nằm ngoài quyền
review). Không đụng DB nào, không gọi API thật. Mọi kết luận dựa trên đọc code, docs, `git`/`gh` và lệnh tìm ghi ở mục (d).

Mức: **Cao** = lỗ bảo mật / quyền sai / mất dữ liệu có kịch bản hỏng cụ thể; **Vừa**; **Thấp**. Lần này **không có phát hiện mức Cao**.

---

## (a) Bảng "Xong khi"

### Bước 1 (design `docs/superpowers/specs/2026-10-07-buoc-1-identity-core-design.md:22-24`)

| Mục | Trạng thái | Bằng chứng |
|---|---|---|
| Mọi tiêu chí `B1#` có test e2e chạy trên Postgres thật bằng một lệnh | **Verified 07/10, nay không chạy lại được** | `docs/superpowers/reviews/2026-10-07-buoc-1-final-review.md:18,24` (e2e 182/182, 38/38 `B1#` có test); `gh pr view 4` → `api (lint, typecheck, build, unit, e2e):SUCCESS`. Bộ e2e backend bị xóa ở D38 (`docs/superpowers/decisions/2026-10-18-buoc-4-practice-decisions.md:423-450`); `find apps/api -name "*.e2e-spec.ts"` chỉ còn 3 file `*scale*` (mục d). Xem **B1-2** |
| Test cũ của Bước 0 vẫn xanh | **Verified 07/10** | `gh pr view 4`, `gh pr view 5` → job `api … e2e` SUCCESS. Ba file e2e cũ của Bước 0 đã bị xóa ở Task 26 đợt sửa (`docs/deliveries/buoc-0-3-fixes.md:63`) |
| Một lượt chạy tay register → OTP Mailpit → verify → refresh → đổi mật khẩu → logout | **Verified 07/10, chỉ có prose** | `2026-10-07-buoc-1-final-review.md:20-23`, `docs/deliveries/buoc-1.md:19-20`. Không có log lệnh lưu trong repo. Luồng nay đã khác (đăng ký không trả token, `verify-email` công khai + mật khẩu — đợt cải thiện A), nên lượt chạy tay đó không còn khớp luồng hiện tại |

### Đợt sửa Bước 0–3 (design `docs/superpowers/specs/2026-10-20-buoc-0-3-fixes-design.md:446-450`)

| Mục | Trạng thái | Bằng chứng |
|---|---|---|
| CI xanh ở mọi PR (`api`, `web`, `admin`, `admin-e2e-real`) | **Verified** | `gh pr view 98…102 --json statusCheckRollup`: cả 5 PR đều 4/4 job `SUCCESS`, đều `MERGED` |
| `pnpm smoke:buoc-0-3-fixes` pass trên DB mới | **Verified** | `docs/deliveries/buoc-0-3-fixes-smoke-output.txt:77,153` (`exit code: 0` hai lần, "ALL STEPS MATCHED"). Chạy lại 26/10 sau khi sửa script (`docs/deliveries/stale-smokes.md`, output `stale-smokes-smoke-output.txt:140+`) và sau Bước 8 (`docs/deliveries/buoc-8.md:113`, chỉ prose) |
| `smoke:buoc-4`, `smoke:buoc-5` (body đăng ký mới) vẫn pass; output lưu vào `buoc-0-3-fixes-smoke-output.txt` | **Configured / chỉ prose** | Output file không có lần chạy smoke 4/5 nào (`grep "smoke:buoc-4\|smoke:buoc-5"` → 0). Bằng chứng duy nhất là câu ở `buoc-0-3-fixes.md:77` (gate M2). Xem **B1-8** |
| `pnpm test:scale` ghi số đo T5 vào delivery record | **Ghi số (prose), đo trên code M1** | `buoc-0-3-fixes.md` đoạn "`pnpm test:scale` (T5…)": "Chưa chạy lại sau M3" — đã vào `deploy-checklist.md:43-45` |
| Ca C3 (log 500), FE28 (handler quá hạn), FE30 (nhả key khi lỗi) | **Chỉ unit test** (theo plan) | smoke output dòng `[15] C3: covered by unit test`; `idempotency.service.spec.ts:142,173,185` |

---

## (b) Mục mở / ASSUMPTION / rủi ro và nơi theo dõi

| # | Mục (nguồn) | Còn mở? | Nơi theo dõi |
|---|---|---|---|
| 1 | Mọi con số rate limit, khóa, ngân sách thư là `ASSUMPTION` (`buoc-1.md:26`; design §14) | Còn: `app-config.ts:123-147` giữ nguyên số design | **Một phần**: `deploy-checklist.md:83-86` (CAPTCHA, "rate limit theo IP không đủ") — không có mục rà lại con số |
| 2 | Tranh khóa cùng user làm cạn pool (`buoc-1.md:26-27`) | Còn (pool nay mặc định 20) | **Một phần**: `deploy-checklist.md:22-26` (kích pool); không có mục riêng cho tranh khóa |
| 3 | Giới hạn gửi Gmail cá nhân chưa có nguồn (`buoc-1.md:28`, final review §5) | Còn | **Một phần**: "SMTP thật" ở design 2.5 §14 (`2026-10-14-buoc-2-5-admin-web-design.md:473`), `deploy-checklist.md:85` nhắc nguy cơ Gmail khóa; không có mục xác minh giới hạn |
| 4 | `otp_failure_windows`, `mail_budget_buckets` không bao giờ được dọn (`buoc-1.md:28`, final review R3) | Còn (mục d, lệnh 9) | **Chưa theo dõi** (B1-5) |
| 5 | Prisma ghim `7.10.0`, xem lại khi Prisma 8 stable (`buoc-1.md:40-41`) | Còn (`package.json`: `prisma 7.10.0`) | **Chưa theo dõi** |
| 6 | B1E11 cookie `Secure` trên `http://localhost` ở trình duyệt khác Chromium | Chromium đã kiểm ở Bước 2.5 (B25E2); trình duyệt khác chưa | Chưa theo dõi (rủi ro chỉ ở dev local) |
| 7 | B1E18 (DoS khóa reset 24 h), B1E28 (chênh thời gian đăng nhập), B1E8 (ciphertext ≤ 1 h) | Chấp nhận theo design | Design §10 (chấp nhận có ghi) |
| 8 | D13 web và API cùng tên miền gốc (`SameSite=Strict`) | Còn (yêu cầu deploy) | **Một phần**: `deploy-checklist.md:113-114` (host `api.`) |
| 9 | B1E25 `TRUST_PROXY` sau proxy; IPv6 /64 | Còn | `deploy-checklist.md:11-15` ✓ |
| 10 | Đổi vai trò không lấy khóa user → admin bị khóa (`buoc-0-3-fixes.md:155`) | Còn (B1-3) | **Chỉ as-built** |
| 11 | Token trang cũ trả 400; test FE5 phụ thuộc thứ tự; `\p{Cf}` trong tên "để lúc làm lại admin UI" (`buoc-0-3-fixes.md:155-156`) | Còn: `person.ts:8-9` chỉ chặn `\p{Cc}`; đợt admin UI đã đóng 28/10 mà chưa làm | **Chỉ as-built** |
| 12 | Lỗi nhả key bị nuốt không log; replay bỏ qua `responseStatus`; pool params không có test ghim (`buoc-0-3-fixes.md:148`) | Còn (B1-9) | **Chỉ as-built** |
| 13 | `$transaction` trong identity / entitlements / ai / common chưa rà việc đọc bằng client chung (`buoc-0-3-fixes.md:150`) | Còn (lần review này cũng không rà hết) | **Chỉ as-built** |
| 14 | Rate limit nhiều request cùng lúc tại ranh giới cửa sổ chưa thấy trên DB thật | Còn | `deploy-checklist.md:16-18` ✓ |
| 15 | `DATABASE_POOL_*`, pool worker ≥ 2× job, `TERMS_VERSION` thật, `db:normalize-timezones`, luật sư mốc 13 tuổi, `test:scale` sau M3, AD12 header | Còn | `deploy-checklist.md:22-53` ✓; luật sư cũng ở `IMPROVEMENT_PLAN_2026-10-28.md:98` (D6) |
| 16 | Gate M2: "chưa kiểm việc nâng cấp các dòng `users` có sẵn qua migration mới" | Còn (rủi ro thấp: cột mới nullable, CHECK chỉ `status`) | Chưa theo dõi |
| 17 | Hai cách sửa thời gian của smoke (FE29) chỉ chạy lúc máy rảnh | Còn | `stale-smokes.md` mục "Còn chưa kiểm" |
| 18 | Các điểm nhỏ admin web M4 (thông báo cũ ở tab 2, nút chép không phản hồi…) (`buoc-0-3-fixes.md:160-162`) | Còn | **Chỉ as-built** (`IMPROVEMENT_PLAN` A6 liệt kê điểm khác, không phải các điểm này) |

---

## (c) Phát hiện

<a id="b1-1"></a>
### B1-1 — Vừa — Thiếu index cho các truy vấn chính của phiên và OTP; `refresh_tokens` tăng không giới hạn trong đời một chain

**Mô tả.** `session_chains.user_id`, `refresh_tokens.chain_id`, `otp_codes(user_id, purpose)` đều không có index. Postgres không tự tạo index cho cột
tham chiếu của foreign key.

**Bằng chứng.**
- `apps/api/prisma/models/identity.prisma:48-63` (SessionChain), `65-78` (RefreshToken), `80-94` (OtpCode): không có `@@index`.
- Mọi `CREATE INDEX` trên bảng identity trong `prisma/migrations` (mục d, lệnh 8): chỉ `users_email_key`, `refresh_tokens_token_hash_key`,
  `users_created_at_id_idx`, hai unique của `user_identities`.
- Tài liệu Postgres (context7, `/websites/postgresql`, trang ddl-constraints §5.5.5): "a DELETE of a row from the referenced table … will require a scan
  of the referencing table … the declaration of a foreign key constraint does not automatically create an index on the referencing columns".
- Truy vấn theo `user_id` trên mọi lần đăng nhập / đổi mật khẩu / khóa: `session.service.ts:61-75` (đếm chain để áp trần 10), `127-131`
  (`revokeAllForUser`). OTP: `otp.service.ts:54-57,135`.
- `refresh_tokens` chỉ bị xóa qua cascade khi chain bị xóa: `identity-cleanup.service.ts:29-37`; không có `refreshToken.deleteMany` nào trong `src`
  (mục d, lệnh 14). Mỗi lần refresh (access token 15 phút) thêm một dòng (`session.service.ts:204-206`) và giữ tới khi chain chết > 30 ngày.

**Kịch bản hỏng.** Khi có người dùng thật: một chain web dùng 2 giờ/ngày sinh ~8 dòng/ngày; 10.000 người → hàng chục triệu dòng `refresh_tokens`
sau một năm. Job dọn mỗi giờ xóa N chain → Postgres chạy N lần quét toàn bảng `refresh_tokens` để cascade; xóa tài khoản (Bước 8) cũng vậy.
Mỗi lần đăng nhập quét toàn bảng `session_chains`. Không sai dữ liệu, nhưng thời gian job / đăng nhập tăng theo kích thước bảng và giữ khóa user lâu hơn
(transaction có `timeout: 10_000`, `session.service.ts:17`).

**Đề xuất.** Một migration thêm `session_chains(user_id)`, `refresh_tokens(chain_id)`, `otp_codes(user_id, purpose)`; cân nhắc index một phần cho
`refresh_tokens(grace_until) WHERE successor_ciphertext IS NOT NULL` (job dọn mỗi giờ). Tạo `CONCURRENTLY` nếu bảng đã có dữ liệu (quy ước
`deploy-checklist.md:59-61`). **Chưa theo dõi ở đâu.**

<a id="b1-2"></a>
### B1-2 — Vừa — Các bất biến bảo mật cần DB của Identity không còn test nào chạy trên Postgres thật

**Mô tả.** "Xong khi" của Bước 1 dựa vào 182 e2e trên Postgres thật; D38 xóa toàn bộ e2e backend. Phần thay thế (unit test + smoke) không phủ các
luồng bảo mật cốt lõi của Bước 1.

**Bằng chứng.**
- Unit test mock chính cơ chế được test: `session.service.spec.ts:43-66` — `$executeRaw` (khóa advisory) là `vi.fn`, `updateMany` (compare-and-set)
  luôn trả `{ count: 1 }`, `$transaction` là hàm giả. Khóa thật, CAS 0 dòng, unique violation chưa bao giờ chạy.
- Smoke (đếm theo đường gọi, mục d, lệnh 15): không smoke nào gọi `password/reset`, `password/change`, `logout`; không smoke nào kiểm reuse detection,
  khóa OTP 21 lần sai, khóa đăng nhập 10 lần sai, trần 10 thiết bị, giới hạn đăng ký 5/IP/giờ (smoke đăng ký qua `psql` để né giới hạn,
  `buoc-0-3-fixes.md` mục "Lệch so với plan").
- `admin-e2e-real` (CI) phủ một phần trên DB thật: đăng nhập, refresh cookie, refresh song song (grace), logout, đổi mật khẩu thu hồi phiên
  (`apps/admin/e2e-real/admin.real.spec.ts:155-206`); không có reset, OTP, reuse, lockout (mục d, lệnh 16).
- `B1#35` (hai `password/reset` cùng mã đồng thời) không còn test nào mang mã này (mục d, lệnh 13).

**Kịch bản hỏng.** Một refactor đổi thứ tự `withUserLock` / đọc lại, hoặc vô tình ném lỗi trong transaction sau khi ghi lần sai (vi phạm design §4b
"ghi rồi mới báo lỗi") → unit test với mock vẫn xanh, CI xanh; lỗi chỉ lộ khi có người tấn công dò OTP / mật khẩu (bộ đếm sai bị rollback = không còn
giới hạn thử).

**Đề xuất.** Thêm một smoke identity (hoặc mở rộng `smoke:buoc-0-3-fixes`) qua API thật: B1#10 (21 lần sai → khóa, bộ đếm đã commit), B1#13, B1#17
(reuse → chain bị thu hồi), B1#19, B1#23, B1#35, rate limit đăng ký. Ghi vào `buoc-1.md` rằng bằng chứng e2e 07/10 không còn chạy lại được.
**Chưa theo dõi** (D38 chấp nhận rủi ro chung; design sửa thiếu sót §11.1 chỉ nhắc cho C1).

<a id="b1-3"></a>
### B1-3 — Thấp — Khóa tài khoản chạy đua với nâng vai trò có thể tạo "admin bị khóa", và luật "admin cuối" vẫn đếm admin bị khóa

**Bằng chứng.** `staff.service.ts:294-300` (`lockUser` chỉ giữ khóa user, kiểm `staffRole === 'admin'`); `350-358` (`setStaffRole` chỉ giữ khóa
`identity.staff_role`, kiểm `status === 'locked'`; đếm admin bằng `status: { not: 'deleting' }`); `isLastAdmin` `268-270` cũng đếm admin bị khóa.

**Kịch bản hỏng.** Admin A khóa C đúng lúc admin B nâng C lên admin: mỗi bên đọc trạng thái chưa commit của bên kia → C là admin bị khóa (không đăng nhập
được, `auth.guard.ts:30`). Sau đó A và B tự hạ vai trò: luật "admin cuối" vẫn tính C → hệ thống không còn admin dùng được; chỉ cứu được bằng CLI
`admin:grant` trên server. Cần race + thao tác cố ý, nên Thấp.

**Đề xuất.** `setStaffRole` lấy thêm `withUserLock(target)` sau khóa `identity.staff_role` (cùng thứ tự Bước 8 đã dùng, `account-deletion.service.ts:85-86`,
nên không tạo vòng chờ); đếm "admin cuối" chỉ với `status = 'active'`. **Chỉ theo dõi ở as-built** (`buoc-0-3-fixes.md:155`).

<a id="b1-4"></a>
### B1-4 — Thấp — CLI `admin:grant` bỏ qua trạng thái `locked` / `deleting`, khác luật của endpoint

**Bằng chứng.** `staff.service.ts:368-376` (`grantAdminByEmail`) chỉ kiểm tồn tại và đã xác minh; `setStaffRole` từ chối `deleting` và `locked`
(`staff.service.ts:356-357`).

**Kịch bản hỏng.** Người vận hành dùng `admin:grant` (đường cứu duy nhất ở B1-3) lên một tài khoản đang bị khóa → thêm một admin không đăng nhập được;
lên một tài khoản `deleting` → vai trò admin trên tài khoản sắp bị xóa. **Đề xuất:** trả `locked` / `deleting` như `unverified` và thoát mã khác 0.
**Chưa theo dõi.**

<a id="b1-5"></a>
### B1-5 — Thấp — `otp_failure_windows` và `mail_budget_buckets` không bao giờ được dọn

**Bằng chứng.** Không có `deleteMany` nào cho hai bảng (mục d, lệnh 9); danh sách job dọn đã đăng ký không có hai bảng này. Chỉ xóa tài khoản xóa dòng
`otp_failure_windows` của chính người đó (`account-data-map.ts:20`). Mục mở từ `buoc-1.md:28` và final review R3.

**Kịch bản hỏng.** Tăng chậm (≤ 2 dòng/user, 1 dòng/ngày), không hỏng chức năng. **Đề xuất:** thêm vào `identity-cleanup` (cửa sổ > 48 h, không khóa)
và vào job của `src/common` cho bucket thư cũ hơn vài ngày. **Chưa theo dõi** ngoài `buoc-1.md`.

<a id="b1-6"></a>
### B1-6 — Thấp — `POST /v1/auth/password/reset` lộ email có tài khoản qua thời gian phản hồi

**Bằng chứng.** `password.service.ts:101-103`: email lạ → 400 `invalid-otp` ngay; email có tài khoản → băm Argon2 (~44 ms, design §2) rồi mở transaction.
Design làm luồng *xin mã* bằng nhau theo cấu trúc (B1#38, `otp.service.ts:112-122`) nhưng không nói gì về `password/reset`; B1E28 (design dòng 425)
nói "Reset requests have no such difference", dễ đọc thành phủ cả route này.

**Kịch bản hỏng.** Dò email có tài khoản bằng `password/reset` (20/IP/giờ). Tác động biên nhỏ vì đăng ký đã trả 409 `email-taken` cho email đã xác minh.
**Đề xuất:** băm (hoặc `verifyDummy`) trước khi tra tài khoản, hoặc ghi rõ chấp nhận trong design. **Chưa theo dõi.**

<a id="b1-7"></a>
### B1-7 — Thấp — Tài liệu cũ nói hành vi mà code không còn làm, và không có ghi chú "đã thay"

| Tài liệu nói | Code hiện tại | Đổi bởi |
|---|---|---|
| Bước 0 design B0#2: "the handler runs inside this same transaction"; B0E8: `Promise.race` (`2026-10-05-buoc-0-design.md:167,183`). `CLAUDE.md:80,444` gọi file này là "as-built design" | Giữ chỗ → handler ngoài transaction → ghi kết quả, không cắt handler (`idempotency.service.ts:17-21,69-89`) | C1, đợt sửa M1 |
| Bước 1 design §4: guard "**không** đọc DB"; B1E13 access token của phiên bị thu hồi còn dùng 15 phút (dòng 136-140, 407). Design sửa thiếu sót §4.5: người bị khóa vẫn gọi route học ≤ 15 phút (`…fixes-design.md:164`) | Guard đọc chain + trạng thái mỗi request, từ chối ngay (`auth.guard.ts:28-30`) | Bước 8 (D24, D29) |
| Bước 1 B1#1 / D8: đăng ký trả token; §5 `verify-email` cần đăng nhập (dòng 37, 216, 352) | Đăng ký trả `{ email, verification_required }` (`auth.controller.ts:19-29`); `verify-email` `@Public` + mật khẩu (`otp.controller.ts:37-39`); refresh của người chưa xác minh bị thu hồi (`session.service.ts:165`) | Đợt cải thiện A |
| Design sửa thiếu sót §4.3, FE8: không sửa được `birth_date` qua API (`…fixes-design.md:135,370`); as-built "sửa ngày sinh → 400" (`buoc-0-3-fixes.md:19,59,89`) | `birth_date` sửa được (≥ 13 tuổi) (`profile.schemas.ts:10`, commit `5a2bf53`); smoke đã sửa theo (`stale-smokes.md`) nhưng as-built và output 21/10 không ghi chú | "Design §8.1" (comment trong code) |
| Bảng quyền D6 của Bước 1 có `questions.moderate`, `ai.settings` (design dòng 47-60) | `settings.manage`, `users.read`, `ai.view`; không có `questions.moderate` (`identity.types.ts:4-18`) | Bước 5, AD18, 28/10 (CLAUDE.md có ghi một phần) |
| Comment "provider không được chạy trong idempotency transaction" (`admin-ai-models.controller.ts:13-14`, `admin-ai-prompts.controller.ts:16-17`) | Sau C1 handler không còn chạy trong transaction | C1 |

**Kịch bản hỏng.** Một session lạnh theo `CLAUDE.md` đọc Bước 0 design làm as-built, tin rằng handler và key commit cùng nhau → bỏ qua khe "chết sau khi
handler commit, trước khi ghi `succeeded`" mà D12 đã chấp nhận (`…fixes-design.md` §6.1). **Đề xuất:** thêm một dòng "đã thay bởi …" ở đầu các mục trên
(Bước 0 B0#2/B0E8, Bước 1 §4 / B1#1 / §5, fixes §4.3 / §4.5); ghi cạnh dòng "339 unit + 182 e2e" của `buoc-1.md:18` rằng e2e đã xóa ở D38.

<a id="b1-8"></a>
### B1-8 — Thấp — Bằng chứng "smoke 4/5 vẫn pass" của đợt sửa chỉ là một câu prose

**Bằng chứng.** Design §10.3 (`…fixes-design.md:446-450`) yêu cầu lưu output vào `buoc-0-3-fixes-smoke-output.txt`; file chỉ có hai lần chạy
`smoke:buoc-0-3-fixes` (mục d, lệnh 17). Câu duy nhất: `buoc-0-3-fixes.md:77`. Lần chạy smoke trên code cũ (bắt được 8 lỗi) cũng không lưu output (as-built
tự ghi). Về sau `buoc-8.md:113-114` báo smoke 4/5 qua (cũng prose). **Đề xuất:** từ nay lưu output mọi smoke được nêu trong "Xong khi".

<a id="b1-9"></a>
### B1-9 — Thấp — Nợ nhỏ của idempotency chỉ nằm trong as-built

**Bằng chứng.** Lỗi nhả key bị nuốt không để lại log: `idempotency.service.ts:76` (`.catch(() => undefined)`) → key kẹt `in_progress`, client nhận 409
`idempotency-key-abandoned` sau 30 s mà không có dấu vết server. Replay trả body, không áp `responseStatus` đã lưu: `idempotency.interceptor.ts:89`. Hiện
**chưa gây sai** vì không controller idempotent nào đặt status động (mục d, lệnh 18). **Đề xuất:** ghi một dòng log `idempotency_release_failed`
(không kèm key); áp `response.status(result.status)` khi replay. **Chỉ as-built** (`buoc-0-3-fixes.md:148`).

<a id="b1-10"></a>
### B1-10 — Thấp — Kiểm cú pháp email lỏng hơn design

**Bằng chứng.** Design §5 "đúng dạng địa chỉ email (kiểm cú pháp)"; `normalize-email.ts:3-7` chỉ cần đúng một `@`, hai phía không rỗng, không khoảng trắng
(nhận `a@b`, ký tự điều khiển khác NUL). **Tác động:** tài khoản rác chưa xác minh tốn ngân sách thư; bị chặn bởi rate limit và job dọn tài khoản chưa xác minh
của Bước 8. **Đề xuất:** thêm kiểm domain có dấu chấm và chặn `\p{Cc}`, hoặc sửa câu trong design. **Chưa theo dõi.**

### Ghi chú ngoài phạm vi (chuyển reviewer bước tương ứng, chưa đánh giá mức)

- D3: `src/cli/accounts-deletions-args.ts:23,55,59` truy vấn `prisma.user` và `prisma.deletedAccount` ngoài `src/identity` (Bước 8).
- `POST /v1/practice/items/:id/report` không có `@RateLimit` (`src/practice/reports/reports.controller.ts:29`; Bước 7).
- `REDACT_KEY_PATTERN` có `code` (`app-logger.ts:16`) nên trường `code` của `google_sign_in_failed` (`google-auth.service.ts:323`) luôn ra `[redacted]` (Bước 8).

### Đã kiểm, không có phát hiện

- **Quyền:** mọi controller `admin/*` (30 controller / 27 file) có `@RequirePermission` ở class hoặc từng handler (lệnh 5). Bảng quyền được ghim chính xác
  (`identity.types.spec.ts`). Guard đọc vai trò hiện tại + chain chưa thu hồi + chain thuộc đúng user (`permission.guard.ts`), chặn phiên Google và
  `must_change_password`. Route `GET users`, `GET users/:id` có cả `roles.manage` (class) và `users.read` (method): guard chạy hai lần nhưng
  `getAllAndOverride` lấy metadata của method, nên editor đọc được, mọi thao tác ghi vẫn 403 (có test `staff.controller.spec.ts:156`). Không route `@Public`
  nào đọc `req.user` (lệnh 11).
- **Ranh giới D3:** `src/common` không import `src/identity` (lệnh 1); 0/34 `@relation` xuyên module (lệnh 2); ngoài ghi chú CLI ở trên, không code `src` nào
  ngoài identity chạm bảng identity (lệnh 3, 4).
- **Idempotency:** replay cùng payload, 400 khi payload khác, 409 + `Retry-After: 2` khi đang chạy, `abandoned` sau hạn, nhả key khi handler lỗi — có trong
  code (`claim-decision.ts`, `idempotency.service.ts`), unit test và smoke (`smoke output` bước 6-8). `@Idempotent` và interceptor luôn đi cặp (lệnh 6).
- **Rate limit:** đăng ký 5/IP/giờ + thư 20/IP/ngày, đăng nhập 20/IP/phút, OTP 20/IP/giờ + 1/60 s + 5/giờ theo email, refresh 60/IP/phút + 10/chain/phút
  (`app-config.ts:124-136`, decorator ở các controller). IP và email băm HMAC trước khi lưu (`rate-limiter.service.ts:48-49`). 91/95 handler ghi có `@RateLimit`;
  4 cái còn lại không thuộc Identity (lệnh 12).
- **Refresh / logout theo thiết bị:** CAS dưới khóa user, grace 10 s chỉ khi successor chưa xoay, reuse → thu hồi cả chain, log không có token
  (`session.service.ts:140-212`); logout chỉ thu hồi chain của token, đường web bắt buộc `X-CSRF-Protection: 1` (`session-transport.ts:33-45`).
- **OTP:** HMAC-SHA256 có khóa, so bằng `timingSafeEqual`, 10 phút, 5 lần/mã, 21 lần sai/24 h → khóa 24 h, tra theo (user, purpose), mã mới vô hiệu mã cũ
  (`otp.service.ts:47-64,126-154`, `prisma/sql/recordOtpFailure.sql`).
- **Khóa tài khoản:** thu hồi mọi phiên + vô hiệu OTP trong cùng transaction (`staff.service.ts:303-307`); đăng nhập đúng mật khẩu → 403 chỉ sau khi đọc
  trạng thái dưới khóa (`credential-decision.ts`); refresh / OTP / reset đều kiểm `status`.
- **Log:** không log nào mang email / IP / token thô (lệnh 7); log đăng nhập sai dùng `email_hmac`; lỗi chỉ ghi `name` + `code`
  (`app-logger.ts:19-27`); log 500 bỏ dòng thông báo (`problem-details.filter.ts:106-112`).
- **Index cho truy vấn chính:** đăng nhập theo email (`users_email_key`) và tìm refresh token theo hash (`refresh_tokens_token_hash_key`) có index unique;
  phần thiếu ở B1-1.
- **Test thiếu răng:** không có `toBeDefined()` / `toBeTruthy()` trong spec identity/common; chỉ 2 `toHaveBeenCalled()` không đối số
  (`session.service.spec.ts:221`, `auth.service.spec.ts:202`), cả hai đều có test khác ghim giá trị (`session.service.spec.ts:236` ghim `reuse_detected`).
  Điểm yếu thật là mock DB, đã nêu ở B1-2.

---

## (d) Lệnh tìm "không có" và đối chứng

Chạy từ `apps/api` của worktree, trừ khi ghi khác.

| # | Câu hỏi | Lệnh | Kết quả | Đối chứng (thứ chắc chắn có) |
|---|---|---|---|---|
| 1 | `src/common` import `src/identity`? | `grep -rn "from ['\"].*identity/" src/common --include=*.ts` | 0 dòng (kể cả spec) | `grep -rln "generated/prisma" src/common` → `prisma.module.ts`, `erase-idempotency-keys.ts`… |
| 2 | `@relation` xuyên module? | script node đọc `prisma/models/*.prisma`, so model đích với file sở hữu | `models 66 relations 34 cross 0` | 34 relation được đếm (vd `identity.prisma:43`) |
| 3 | Prisma model identity bị gọi ngoài `src/identity`? | `grep -rnE "\.(user\|passwordCredential\|sessionChain\|refreshToken\|otpCode\|otpFailureWindow\|userIdentity\|deletedAccount)\.(find\|create\|update\|upsert\|delete\|count\|aggregate\|groupBy)" src` trừ `src/identity`, spec | chỉ `src/cli/accounts-deletions-args.ts:23,55,59` | 82 dòng khớp bên trong `src/identity` |
| 4 | SQL thô chạm bảng identity ngoài identity? | `grep -rnE "(FROM\|JOIN\|UPDATE\|INTO\|DELETE FROM)\s+\"?(users\|password_credentials\|session_chains\|refresh_tokens\|otp_codes\|…)\b" src prisma/sql scripts` | trong `src`: 0; còn lại là smoke script và `prisma/sql/recordOtpFailure.sql` (TypedSQL của identity) | dòng `recordOtpFailure.sql:4` được tìm thấy |
| 5 | Controller `admin/*` thiếu quyền? | vòng lặp đếm `@RequirePermission` cấp class / method so với số handler | 27 file, mọi file có class-level hoặc đủ method-level (`admin-entitlements.controller.ts` 5/5) | `staff.controller.ts classLevel=1` |
| 6 | `@Idempotent()` thiếu interceptor hoặc ngược lại? | đếm `@Idempotent(` và `UseInterceptors(IdempotencyInterceptor)` mỗi controller | 4 file lệch, đều do comment nhắc `@Idempotent()` (đã đọc từng chỗ) | `admin-ai-eval.controller.ts:68-69` có cả hai |
| 7 | Log mang email / IP / mật khẩu / token thô? | `grep -rnE "logger\.(info\|warn\|error)\([^)]*\b(email\|ip\|password\|token)\b" src`; `grep -rn "console\.(log\|error\|warn)" src` trừ `src/cli` | 1 dòng là chuỗi lý do `'no-verified-email'`; console: 0 | `grep -rn email_hmac src` → `auth.service.ts:109` |
| 8 | Index trên `session_chains` / `refresh_tokens(chain_id)` / `otp_codes`? | `grep -rn "CREATE INDEX\|CREATE UNIQUE INDEX" prisma/migrations \| grep -i "session_chains\|refresh_tokens\|otp_codes\|users\|…"` | không có index nào trên 3 cột đó | thấy `users_email_key`, `refresh_tokens_token_hash_key`, `users_created_at_id_idx` |
| 9 | Có dọn `otp_failure_windows` / `mail_budget_buckets`? | `grep -rn "otpFailureWindow\.\(delete\|deleteMany\)\|mailBudgetBucket\.\(delete\|deleteMany\)\|otp_failure_windows\|mail_budget_buckets" src` + liệt kê `scheduler.register(` | không có lệnh xóa (chỉ upsert và `account-data-map.ts:20`) | thấy `register('identity-cleanup'…)`, `register('rate-limit-counters'…)` |
| 10 | Assert yếu trong spec identity/common? | `grep -rn "toBeDefined()\|toBeTruthy()" src/identity src/common --include=*.spec.ts` | 0 | `toHaveBeenCalled()` không đối số: 2 dòng tìm thấy |
| 11 | Route `@Public` đọc `req.user`? | lọc file controller có `@Public()` rồi tìm `req.user\|@CurrentUser` | 3 file khớp, nhưng `req.user` chỉ ở handler không public (`password.controller` `change`, `google-auth.controller` `reauth`, `sample` POST) | `password.controller.ts` `change` dùng `req.user!` |
| 12 | Handler ghi thiếu `@RateLimit`? | script node quét `@Post/@Put/@Patch/@Delete` trong `*.controller.ts` | 95 handler, 4 thiếu: AI eval runs, AI prompt test (service tự `limiter.hit('ai.test')`, `prompts.service.ts:170`), webhook, practice report | 91 handler có |
| 13 | Còn test mang mã `B1#35`? | `grep -rl "B1#35\b" src test` | 0 | `B1#17` → `session.service.spec.ts` |
| 14 | Có tỉa `refresh_tokens` ngoài cascade? | `grep -rn "refreshToken\.deleteMany\|refresh_tokens" src` | 0 | `sessionChain.deleteMany` ở `identity-cleanup.service.ts:29` |
| 15 | Smoke nào phủ luồng identity? | đếm `/auth/refresh`, `/auth/logout`, `password/reset`, `password/change`, `/auth/otp`, `verify-email`, `csrf`, `invalid-credentials` trong `scripts/smoke-*.mjs` | `logout`, `password/reset`, `password/change`: 0 ở mọi smoke | `verify-email` có ở 7/7 smoke; `/auth/refresh` ở `smoke-buoc-0-3-fixes` (2) |
| 16 | `admin-e2e-real` phủ reset / OTP / reuse / lockout? | `grep -rn "password/reset\|/auth/otp\|reuse\|device_cap" apps/admin/e2e-real` | chỉ chữ "reused state" (biến môi trường), không phải luồng | `admin.real.spec.ts:155-206` có refresh, logout, đổi mật khẩu |
| 17 | Output smoke 4/5 trong file output đợt sửa? | `grep -n "smoke:buoc-4\|smoke:buoc-5" docs/deliveries/buoc-0-3-fixes-smoke-output.txt` (từ root) | 0 | `exit code: 0` ở dòng 77, 153 |
| 18 | Controller idempotent đặt status động? | với mọi file có `UseInterceptors(…IdempotencyInterceptor`: `grep "\.status(\|statusCode\s*="` | 0 | — (status lấy từ `@HttpCode`) |
| 19 | Unit test chạy được trong worktree? | `ls src/generated/prisma; ls node_modules; ls ../../node_modules` | không có cả ba → không chạy | — |
