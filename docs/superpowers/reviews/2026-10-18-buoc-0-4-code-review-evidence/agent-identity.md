# Review code Bước 0–4 — lát cắt Identity (`ID`)

Ngày 18/10/2026. Người review: agent độc lập, không viết code này. Snapshot: worktree `.claude/worktrees/review-buoc-0-4`,
detached ở `origin/dev` = `dc4cbe0`. Đường dẫn dưới đây tính từ `apps/api/` nếu không ghi khác.

## 1. Phạm vi đã đọc

- **Số lượt:** 2.
  - Lượt 1: design → code → schema/migration → test.
  - Lượt 2: soát sâu sessions/OTP/password, kiểm quyền mọi controller, tìm đường lạm dụng.
- **Design:**
  - Bước 1 design, đọc toàn bộ (gồm §2 bảng quyền D6, §4, §4b, §5, §6, §7, §9, §10, §13, §14), decisions D1–D16, final review 07/10.
  - Design 2.5: §2, §5, §7.4, §7.5, §11–§12, §15.
  - Keepalive design (toàn bộ). Design Bước 3: §8.1–8.2. Plan Bước 3: Task 17–18.
  - Review Bước 3: M6, L16, mục "Đã kiểm".
- **Code Identity (đọc hết file không phải spec):**
  - `src/identity/**`: auth/*, sessions/*, profile/*, staff/*, `mailer/templates.ts`, `maintenance/identity-cleanup.service.ts`, `user-lock.ts`,
    `identity.module.ts`, `identity.types.ts`.
  - `prisma/models/identity.prisma`, `prisma/sql/recordOtpFailure.sql`.
  - 3 migration Identity: `20261007120000_identity`, `20261014120000_must_change_password`, `20261018090000_users_last_seen_at`.
  - `src/cli/admin-grant.ts`.
- **Code chung, đọc để trace:**
  - `common/config/app-config.ts`, `common/email/normalize-email.ts`, `common/rate-limit/{rate-limit.guard,rate-limiter.service,rate-limit.decorator}.ts`.
  - `common/mail/{mail-dispatcher,mail-budget}.service.ts`, `common/logging/app-logger.ts`, `common/problem-details/problem-details.filter.ts`
    (nhánh lỗi lạ), `common/time/local-date.ts`, `common/db/prisma.module.ts`.
  - `app.setup.ts`, `main.ts`, `worker.ts`.
  - `content/learner/learner-content.guard.ts`, `learning/queue/queue.service.ts` (hàm `today`), `notifications/scheduler/eligibility.ts:35`.
- **Kiểm quyền:** decorator của cả 32 file `*.controller.ts` trong `src/**`.
- **Test:**
  - Tên mọi case trong `test/identity/*.e2e-spec.ts` (157 case).
  - Thân các test then chốt: OTP B1#5/B1#38, logout B1#20, `reminder-reads` (M6, L16), audit route `test/content/admin-permissions.e2e-spec.ts`.
  - Helper: `test/support/{auth-helpers,create-test-app,list-routes}.ts`.
- **Đã chạy gì:**
  - **Không** chạy test, không Docker, không app.
  - Chỉ chạy 2 lệnh `node -e` một dòng trên Node 24.11.0 (cùng bản dự án dùng), cho ID1:
    - kiểm `Intl.DateTimeFormat` nhận những chuỗi múi giờ nào;
    - đo bộ nhớ của 2.000 formatter.

## 2. Bảng tóm tắt

| ID | Mức | Phát hiện | file:dòng | Trạng thái |
|---|---|---|---|---|
| ID1 | Cao | Learner bất kỳ làm bộ nhớ API tăng không giới hạn. Cách làm: đổi `timezone` sang các cách viết khác nhau của cùng một múi giờ (hoa/thường, `+07:00`). Mỗi chuỗi mới bị cache vĩnh viễn, ~30 KB | `src/identity/profile/timezone.ts:3`, `src/identity/profile/identity.service.ts:99`; cache ở `src/common/time/local-date.ts:1-12` | SUSPECTED: cơ chế đã trace đủ, độ tăng RSS qua HTTP cần probe |
| ID2 | Thấp | `POST /v1/auth/password/reset` lộ email nào có tài khoản qua thời gian trả lời. Email có tài khoản: băm Argon2 (~44 ms) trước khi kiểm mã. Email lạ: trả 400 ngay | `src/identity/auth/password.service.ts:99-101` | CONFIRMED (đường code); mức chênh thời gian cần đo |
| ID3 | Thấp | Logout bằng refresh token đã xoay trả 204 nhưng **không** thu hồi chain. Hai trường hợp: mất phản hồi refresh; hoặc token bị trộm và kẻ trộm xoay trước. Phiên của kẻ trộm sống tiếp | `src/identity/sessions/session.service.ts:119` | CONFIRMED; test đang khóa hành vi này |
| ID4 | Thấp | Ai biết email cũng giữ được tài khoản ở trạng thái khóa đăng nhập gần như liên tục: 10 lần sai mỗi 15 phút. Câu "không thể khóa mãi" của B1E3 không đúng | `src/identity/auth/credential-decision.ts:16-27` | CONFIRMED |
| ID5 | Thấp | Cờ `must_change_password` tắt được mà mật khẩu không đổi: reset về đúng mật khẩu tạm đã gửi qua email | `src/identity/auth/password.service.ts:95-116` | CONFIRMED |
| ID6 | Thấp | `staff_role` lạ trong DB (vd `'Admin'` sửa tay) làm `GET /v1/me` và mọi route learner trả 500 cho user đó. DB không có CHECK constraint | `src/identity/identity.types.ts:13-14` | CONFIRMED |
| ID7 | Thấp | Email chứa ký tự NUL ở `GET /v1/admin/users?email=` và `POST /v1/admin/users` → 500. Đăng ký/đăng nhập/reset đã trả 400 cho trường hợp này | `src/identity/staff/staff.schemas.ts:3,12` | CONFIRMED |
| ID8 | Thấp | Thiếu index `refresh_tokens(chain_id)`, `session_chains(user_id)`, `otp_codes(user_id)`. Token đã xoay không bao giờ bị xóa riêng, nên khi bảng lớn, cleanup cascade quét tuần tự | `prisma/migrations/20261007120000_identity/migration.sql:89-93`, `src/identity/maintenance/identity-cleanup.service.ts:22-37` | SUSPECTED (hiệu năng, cần EXPLAIN) |
| ID9 | Thấp | Số rate limit của Identity không đổi được bằng biến môi trường. `register` 5 lần/giờ/IP chặn nhóm đăng ký chung một Wi-Fi/NAT, vd buổi khởi động pilot | `src/common/config/app-config.ts:88,97,244` | CONFIRMED (cấu hình); tác động tùy cách chạy pilot |

Không thấy lỗ hổng quyền: mọi route `/v1/admin/**` có `@RequirePermission` đúng bảng D6 (mục 6, phần "Quyền").

## 3. Từng phát hiện

### ID1 — Bộ nhớ API tăng không giới hạn theo chuỗi `timezone` người dùng tự đặt (Cao, SUSPECTED)

**Chỗ lỗi:**
- Chuỗi được nhận và lưu nguyên văn:
  - `src/identity/profile/timezone.ts:1-8`;
  - `PATCH /v1/me`: `src/identity/profile/identity.service.ts:89,99`;
  - đăng ký: `src/identity/auth/auth.service.ts:43,53`;
  - admin tạo tài khoản: `src/identity/staff/staff.service.ts:56,72`.
- Cache không giới hạn: `src/common/time/local-date.ts:1-12`.
- Đường gọi không có rate limit: `GET /v1/groups` (`learning/groups/groups.controller.ts:19-21`) → `queue.service.ts:47` → `today()` `:107-110`
  → `localDate(profile.timezone, …)`.

**Cơ chế:**

```ts
// identity/profile/timezone.ts:1-8 — chỉ thử tạo formatter, không chuẩn hóa
try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; }
// common/time/local-date.ts:1-12 — khóa cache là chuỗi thô, không bao giờ xóa
const formats = new Map<string, Intl.DateTimeFormat>();
let value = formats.get(timeZone);
if (!value) { value = new Intl.DateTimeFormat('en-CA', { timeZone, … }); formats.set(timeZone, value); }
```

**Đo trong phiên này (Node 24.11.0, chỉ là `node -e`, không phải app):**
- `Intl.DateTimeFormat` nhận `"asia/ho_chi_minh"`, mọi tổ hợp hoa/thường của `"America/Argentina/ComodRivadavia"`.
  - Ví dụ `"amErica/…"` được hiểu thành `America/Catamarca`.
- Nhận cả dạng offset (lệch giờ cố định so với UTC): `"+07:00"`, `"+0700"`, `"+07"`, `"-23:59"`.
- Giữ 2.000 formatter khác chuỗi trong một `Map` làm RSS (bộ nhớ tiến trình) tăng 58,3 MB sau `gc()`, tức ~30 KB mỗi cái.

**Vì sao sai:**
- Design Bước 1 §6 chọn `Intl.DateTimeFormat` để không từ chối nhầm `Asia/Ho_Chi_Minh`, và "lưu đúng chuỗi client gửi".
- Design im lặng về việc chuỗi đó thành khóa cache trong RAM. Kỳ vọng hợp lý: dữ liệu người dùng tự đặt không được làm RAM server tăng không giới hạn.
- Design cũng im lặng về dạng offset. Dạng này không theo giờ mùa hè (DST).
  - Nếu sau này có SQL `AT TIME ZONE users.timezone`, Postgres hiểu `+07:00` theo kiểu POSIX, ngược dấu (UTC−7).
    `ASSUMPTION`: theo tài liệu PostgreSQL về chuỗi múi giờ POSIX, chưa chạy thử.
  - Hiện chưa có SQL nào dùng: đã grep `AT TIME ZONE` trong `src`, `prisma`.

**Hậu quả:**
- Kẻ xấu đăng ký tài khoản learner (5 tài khoản/giờ/IP) và đặt `native_language`. Sau đó lặp lại hai request:
  - `PATCH /v1/me {timezone: <cách viết mới>}` (tối đa 30/phút/user);
  - `GET /v1/groups` (không giới hạn).
- Mỗi vòng giữ thêm ~30 KB trong tiến trình API tới khi restart, khoảng 1,3 GB/ngày cho mỗi tài khoản.
- Vài tài khoản đủ làm API hết RAM và crash, mọi người dùng mất dịch vụ.
- Worker cũng giữ một mục cho mỗi chuỗi nó gặp ở tick nhắc học, nhưng chậm hơn nhiều.
- Mức Cao theo thang của brief ("API crash"). Nếu probe cho thấy RSS qua HTTP không tăng như khi đo riêng, hạ xuống Thấp.

**Đã loại trừ:**
- *V8/ICU dùng chung formatter bên trong?* Không: đo thực, RSS tăng tuyến tính ~30 KB/chuỗi sau `gc()`.
- *Chuỗi được chuẩn hóa trước khi lưu?* Không: `identity.service.ts:99` và `auth.service.ts:53` lưu `body.timezone` nguyên văn.
- *Cache có xóa?* Không: `local-date.ts` chỉ `get`/`set`, không `delete`, không giới hạn số mục.
- *Rate limit chặn?* Không: `GET /v1/groups` không có `@RateLimit`. Chỉ PATCH bị giới hạn 30/phút/user (`profile.controller.ts:17-18`).

**Probe đề xuất** (Vitest e2e, `createTestApp` với `config.limits['user.write'].max = 1_000_000`):
1. `seedUser(ctx.prisma, { verified: true, nativeLanguage: 'vi' })`, rồi `startSession(ctx, userId)`.
2. Sinh 3.000 cách viết của `America/Argentina/ComodRivadavia`: đảo hoa/thường từng chữ theo bit của chỉ số.
3. `const spy = vi.spyOn(Intl, 'DateTimeFormat')`, chỉ đếm các lần gọi có locale `'en-CA'`.
4. Lượt 1, với mỗi chuỗi: `PATCH /v1/me {timezone}` → 200, rồi `GET /v1/groups` → 200. Lượt 2: lặp lại đúng 3.000 chuỗi đó.
5. Kết quả:
   - *Mong đợi:* số formatter `'en-CA'` được tạo bị chặn ở mức nhỏ.
   - *Nghi ngờ:* lượt 1 tạo 3.000, lượt 2 tạo 0, tức cả 3.000 vẫn nằm trong cache.
   - Đo thêm `process.memoryUsage().rss` trước/sau (chạy với `--expose-gc`); nghi ngờ tăng ~90 MB.
6. Thêm: `PATCH /v1/me {timezone: '+07:00'}` → hiện trả 200 và lưu `+07:00`.

**Cách sửa gợi ý:**
- Trong `local-date.ts`: giới hạn cache (LRU vài trăm mục), hoặc dùng `resolvedOptions().timeZone` làm khóa.
- Trong Identity: chỉ nhận tên IANA đúng chữ hoa/thường (danh sách `Intl.supportedValuesOf('timeZone')` cộng alias như `Asia/Ho_Chi_Minh`), từ chối dạng offset.

### ID2 — Bước nộp mã reset lộ email có tài khoản qua thời gian (Thấp, CONFIRMED)

**Chỗ lỗi:** `src/identity/auth/password.service.ts:96-101`.

```ts
const account = await this.prisma.user.findUnique({ where: { email } });
if (!account) throw this.invalidOtp();                     // email lạ: 400 ngay
const hash = await this.hasher.hash(body.new_password);    // email có thật: Argon2 ~44 ms, rồi transaction có khóa
```

**Vì sao sai:**
- I8 và design §4b: luồng quên mật khẩu không được lộ email có tồn tại.
- Design B1E28 ghi: "Reset requests have no such difference because all account work runs after the response (B1#38)".
  - Đúng cho bước **xin mã** (`POST /v1/auth/otp`, `otp.service.ts:87-105`).
  - Sai cho bước **nộp mã** (`POST /v1/auth/password/reset`).
- Body lỗi giống nhau (test `test/identity/password.e2e-spec.ts:248`), nhưng thời gian thì khác.

**Hậu quả:**
- Gửi `{email: X, code: "000000", new_password: <hợp lệ>}`: email có tài khoản trả lời chậm hơn ~45 ms (Argon2 + transaction), email lạ trả ngay.
- Dò được email nào có tài khoản, 20 lần/giờ/IP (`auth.reset.ip`, `app-config.ts:96`).
- Vì sao chỉ Thấp: `register` đã lộ điều này bằng 409 `email-taken` theo thiết kế (B1#2, 5 lần/giờ/IP). Phần lộ thêm chủ yếu là tốc độ dò (gấp 4).
- Nếu sau này đăng ký thôi lộ email, lỗ này thành Trung bình.

**Đã loại trừ:**
- *Email lạ có được băm ở chỗ khác không?* Không: `throw` ở dòng 100 chạy trước `hash` ở dòng 101.
- *Rate limit có làm việc dò vô dụng không?* Không: 20 lần/giờ/IP vẫn đủ để dò.

**Probe đề xuất:**
1. `const spy = vi.spyOn(ctx.app.get(PasswordHasher), 'hash')`; `known = await seedUser(ctx.prisma, { verified: true })`.
2. Gửi `POST /v1/auth/password/reset {email: known.email, code: '000000', new_password: 'NewPassw0rd!'}`, đếm số lần gọi `hash`. Xóa `mockClear()`.
3. Gửi cùng body với `${randomUUID()}@example.com`, đếm lại.
4. Cả hai trả 400 `invalid-otp` cùng `type`.
   - *Mong đợi (I8):* số lần gọi `hash` bằng nhau.
   - *Nghi ngờ:* 1 và 0.
5. Tùy chọn: 20 lần mỗi loại, so median thời gian; nghi ngờ chênh 40–60 ms.

**Cách sửa gợi ý:** với email lạ cũng gọi `hasher.hash(body.new_password)` (bỏ kết quả) rồi mới trả 400. Phần chênh vài ms DB còn lại chấp nhận như B1E28.

### ID3 — Logout bằng token đã xoay không thu hồi chain (Thấp, CONFIRMED)

**Chỗ lỗi:** `src/identity/sessions/session.service.ts:112-124`, dòng 119.

```ts
const row = await tx.refreshToken.findUnique({ where: { id: located.id }, include: { chain: true } });
if (!row || row.rotatedAt || row.chain.revokedAt || row.chain.clientType !== path) return;   // token đã xoay → không làm gì
await tx.sessionChain.updateMany({ where: { id: row.chainId, revokedAt: null }, data: { revokedAt: now, revokeReason: 'logout' } });
```

**Vì sao sai:**
- Design §4 ghi "Token đã xoay … → vẫn 204 (idempotent, không lộ gì)". Câu này nói về mã trả về. Code hiểu thêm thành "không thu hồi gì", và test
  `test/identity/session.service.e2e-spec.ts:273-292` khóa hành vi đó.
- Kỳ vọng hợp lý khi người dùng bấm "Đăng xuất": phiên của thiết bị đó chấm dứt.
- Token đã xoay mà vẫn được đem ra dùng nghĩa là: (a) mất phản hồi refresh, hoặc (b) token bị trộm.
  - `refresh` coi đúng trường hợp này là "dùng lại" và thu hồi cả chain (`session.service.ts:166-169`). Logout làm ngược luật đó.

**Hậu quả:**
- *Mobile, token bị trộm:* kẻ trộm lấy được refresh token T0 và refresh trước (T0→T1). App thật vẫn giữ T0.
  - Người dùng nghi ngờ, bấm logout. Server trả 204, app xóa T0, nhưng chain vẫn sống với T1 trong tay kẻ trộm.
  - Chain sống tới 90 ngày không dùng hoặc 365 ngày tuổi.
- *Mất phản hồi refresh rồi logout:* chain mồ côi vẫn tính vào trần 10 thiết bị tới khi hết hạn.

**Đã loại trừ:**
- *Phát hiện dùng lại có bắt sau đó không?* Chỉ khi có ai refresh bằng T0 sau 10 giây.
  - Người đã logout thì không refresh nữa.
  - Kẻ trộm dùng T1, là token hiện hành, nên không kích hoạt.
- *Đổi mật khẩu có cứu không?* Có, vì thu hồi mọi chain. Nhưng người dùng không biết phải làm vậy.

**Probe đề xuất:**
1. `u = seedUser(ctx.prisma, { verified: true })`; `s = startSession(ctx, u.userId, 'mobile')` (token T0).
2. `r1 = POST /v1/auth/refresh {refresh_token: s.refreshToken}` → 200, nhận T1 (đóng vai kẻ trộm).
3. `ctx.clock.advance(11_000)`.
4. `POST /v1/auth/logout {refresh_token: s.refreshToken}` → 204.
5. Kết quả:
   - *Mong đợi:* chain `s.sessionChainId` có `revokedAt`.
   - *Nghi ngờ:* `revokedAt` null, và `POST /v1/auth/refresh {refresh_token: r1.body.refresh_token}` → 200.

**Cách sửa gợi ý:**
- Khi logout gặp token đã xoay thuộc chain chưa thu hồi: thu hồi cả chain (lý do `logout` hoặc `reuse_detected`), vẫn trả 204.
- Sửa test B1#20 và câu tương ứng trong design §4.

### ID4 — Giữ một tài khoản ở trạng thái khóa đăng nhập gần như liên tục (Thấp, CONFIRMED)

**Chỗ lỗi:** `src/identity/auth/credential-decision.ts:16-27`.

```ts
if (user?.loginLockedUntil && user.loginLockedUntil > now) return 'locked';    // trong lúc khóa: không đếm
const updated = await tx.user.update({ …, data: { failedLoginCount: { increment: 1 } } });
if (updated.failedLoginCount >= 10) {                                            // hết khóa: bộ đếm đã về 0, 10 lần sai mới là khóa lại
  await tx.user.update({ …, data: { failedLoginCount: 0, loginLockedUntil: new Date(now.getTime() + 900_000) } });
```

**Vì sao sai:**
- B1E3 (design §10) hứa: "an attacker cannot keep a real user locked forever; the real user can still reset the password, which clears the lock".
- Đúng là các lần sai trong lúc khóa không kéo dài khóa. Nhưng hết khóa thì 10 lần sai mới lại khóa thêm 15 phút.
- Reset xóa khóa nhưng không cấp phiên mới (`password.controller.ts:32-41`, trả 204). Kẻ tấn công khóa lại trong vài giây, trước khi người dùng kịp đăng nhập.

**Hậu quả:**
- Chỉ cần biết email: 10 request mỗi 15 phút (40/giờ) là giữ được tài khoản ở trạng thái không đăng nhập bằng mật khẩu trên thiết bị mới.
- Một IP giữ được khoảng 30 tài khoản (`auth.login.ip` 20/phút).
- Phiên đang có không bị ảnh hưởng, vì refresh không xét khóa.
- Admin: không đăng nhập được từ trình duyệt mới; `password/change` cũng trả 429 trong lúc khóa (B1E4).

**Đã loại trừ:**
- *Giới hạn theo IP có chặn không?* Không: 20/phút/IP (`app-config.ts:89`) gấp ~30 lần mức cần. Dùng nhiều IP còn dễ hơn.
- *Design đã chấp nhận rủi ro này chưa?* B1E3 có nhãn `ASSUMPTION`, nhưng phần "Expected" mô tả kết quả ngược lại. Chủ dự án có thể đang tin rủi ro này không tồn tại.

**Probe đề xuất:**
1. `u = seedUser(...)`. Lặp 3 chu kỳ:
   - 10 lần `POST /v1/auth/login {email: u.email, password: 'Wrong-pass1', client: 'mobile'}` → 401;
   - đọc `loginLockedUntil` → bằng `now + 900_000`;
   - `ctx.clock.advance(900_001)`.
2. Sau đó reset bằng mã lấy từ `ctx.mailer.sent` → 204. Thêm 10 lần sai → khóa lại; mật khẩu mới đúng → 401.
3. Kết quả:
   - *Mong đợi theo B1E3:* không khóa lại được mãi.
   - *Nghi ngờ:* khóa được mỗi chu kỳ.

**Cách sửa gợi ý (chủ dự án quyết):**
- (a) Chấp nhận, và sửa câu B1E3.
- (b) Khóa theo cặp (tài khoản, IP) hoặc backoff tăng dần.
- (c) Cho reset thành công trả luôn phiên.

### ID5 — `must_change_password` tắt được mà mật khẩu tạm vẫn giữ nguyên (Thấp, CONFIRMED)

**Chỗ lỗi:** `src/identity/auth/password.service.ts:95-116`. Không có kiểm `same_as_current`; dòng 114 tắt cờ.

**Vì sao sai:**
- D21 / design 2.5 §7.5: cờ dùng để bắt staff bỏ mật khẩu tạm đã gửi nguyên văn qua email.
- `change` chặn mật khẩu mới trùng mật khẩu hiện tại (`:69`). `reset` thì không, mà vẫn tắt cờ.
- Design im lặng về reset trùng mật khẩu. Kỳ vọng hợp lý: hai đường nhất quán.

**Hậu quả:**
- Editor được tạo với mật khẩu tạm P (đang nằm trong hộp thư), dùng "Quên mật khẩu" và đặt lại đúng P.
- Cờ tắt, mật khẩu vẫn là P. Ai đọc được thư cũ vẫn đăng nhập được với quyền staff.
- Chỉ Thấp vì cần chính chủ hộp thư làm việc này.

**Đã loại trừ:**
- *Reset có so với hash cũ ở chỗ khác không?* Không: chỉ `upsert` hash mới (`:109-110`) rồi tắt cờ (`:114`).

**Probe đề xuất:**
1. Admin gọi `POST /v1/admin/users {email, staff_role: 'editor', password: P, must_change_password: true, timezone: 'UTC'}` → 201.
2. `POST /v1/auth/otp {purpose: 'reset_password', email}`, rồi `drainMail()` và lấy mã 6 số từ `ctx.mailer.sent`.
3. `POST /v1/auth/password/reset {email, code, new_password: P}`.
4. Kết quả:
   - *Mong đợi:* 400 `violations: ['same_as_current']`, hoặc cờ giữ nguyên.
   - *Nghi ngờ:* 204; `GET /v1/me` → `must_change_password: false`; đăng nhập bằng P → 200.

**Cách sửa gợi ý:**
- Trong `reset`: verify `new_password` với hash cũ (ngoài khóa) và từ chối `same_as_current`.
- Hoặc: chỉ tắt cờ khi mật khẩu thật sự đổi.

### ID6 — Giá trị `staff_role` lạ làm `/me` và mọi route learner trả 500 (Thấp, CONFIRMED)

**Chỗ lỗi:**
- `src/identity/identity.types.ts:13-14`.
- Được gọi từ `toProfile` (`identity.service.ts:35`) ← `getProfile` ← `GET /v1/me` và `LearnerContentGuard` (`content/learner/learner-content.guard.ts:19`).
- DB: `"staff_role" TEXT`, không có CHECK (`migrations/20261007120000_identity/migration.sql:6`).

```ts
export function permissionsFor(role: StaffRole | null): Permission[] {
  return role === null ? [] : [...ROLE_PERMISSIONS[role]];   // 'Admin' → [...undefined] → TypeError → 500
}
```

**Vì sao sai:** design im lặng. Kỳ vọng hợp lý: vai trò lạ thì coi như không có quyền, như `PermissionGuard` đã làm (`permission.guard.ts:34-35`, trả 403), chứ không làm sập mọi route của user đó.

**Hậu quả:**
- Ví dụ: owner sửa tay `UPDATE users SET staff_role='Admin'` trong pilot, hoặc sau này đổi tên vai trò mà quên migration dữ liệu.
- User đó nhận 500 ở `GET /v1/me` và mọi route learner. Admin app không khởi động được cho họ.

**Đã loại trừ:**
- *CHECK ở DB?* Không có.
- *Kiểm ở chỗ ghi?* Có: `setStaffRole`/`createAccount` kiểm enum (`staff.schemas.ts`). Nên chỉ SQL tay hoặc migration sai mới tạo ra giá trị lạ, vì vậy Thấp.

**Probe đề xuất:**
1. `seedUser(... { verified: true, nativeLanguage: 'vi' })`.
2. `prisma.user.update({ data: { staffRole: 'Admin' } })`, rồi `startSession`.
3. Kết quả nghi ngờ: `GET /v1/me` → 500; `GET /v1/groups` → 500; `GET /v1/admin/staff` → 403.

**Cách sửa gợi ý:**
- `permissionsFor` trả `[]` (kèm log warn) cho giá trị lạ.
- Thêm CHECK `staff_role IN ('admin','editor')`, và tương tự cho `status`, `client_type`, `purpose`.

### ID7 — Ký tự NUL trong email ở hai route staff gây 500 (Thấp, CONFIRMED)

**Chỗ lỗi:**
- `src/identity/staff/staff.schemas.ts:3` (`findUserQuerySchema`) và `:12` (`createAccountSchema.email`): không có `refine` chặn NUL.
- `normalizeEmail` (`common/email/normalize-email.ts:4`) chỉ từ chối khoảng trắng (`\s`).

**Vì sao sai:** đăng ký/đăng nhập (`auth.schemas.ts:5`) và reset (`password.schemas.ts`) đã chặn NUL, với lý do ghi trong code: "PostgreSQL text cannot contain NUL". Hai route staff thì thiếu.

**Hậu quả:**
- Admin dán email có `\u0000` → Prisma/driver báo lỗi → filter trả 500 `Internal Server Error` thay vì 400 (`problem-details.filter.ts`, nhánh cuối).
- Với `POST /v1/admin/users`, server còn kiểm ngân sách thư và băm Argon2 trước khi lỗi.
- Không lộ dữ liệu.
- Ghi chú: `POST /v1/auth/otp` (reset) cũng thiếu `refine`, nhưng việc tra DB chạy sau khi đã trả 202 và lỗi được `MailDispatcher` nuốt, nên không thấy khác biệt.

**Đã loại trừ:** *zod có chặn ở chỗ khác không?* Không: hai schema trên chỉ có `.max(320)`.

**Probe đề xuất:**
1. Tạo phiên admin.
2. `GET /v1/admin/users?email=a%00b@example.com` → mong đợi 400, nghi ngờ 500.
3. `POST /v1/admin/users {email: 'a\u0000b@example.com', staff_role: 'editor', must_change_password: true, timezone: 'UTC'}` → nghi ngờ 500, không tạo user nào.

**Cách sửa gợi ý:** cho `normalizeEmail` từ chối ký tự điều khiển (`/[\u0000-\u001f\u007f]/`). Một chỗ sửa, phủ mọi route.

### ID8 — Thiếu index; token đã xoay tích lũy (Thấp, SUSPECTED)

**Chỗ lỗi:**
- Migration `20261007120000_identity/migration.sql:89-93` chỉ tạo `users_email_key` và `refresh_tokens_token_hash_key`.
- Không có index trên `refresh_tokens(chain_id)`, `session_chains(user_id)`, `otp_codes(user_id)`. Đã grep `INDEX` trong mọi migration.
- `identity-cleanup.service.ts:22-25` chỉ xóa `successor_ciphertext`. Dòng token đã xoay ở lại tới khi cả chain bị xóa (`:29-37`).

**Vì sao sai:** design §7 im lặng về index và số dòng token. Kỳ vọng hợp lý: việc hằng giờ và mỗi lần đăng nhập không quét cả bảng.

**Hậu quả (dự đoán):**
- Mỗi lần refresh thêm 1 dòng `refresh_tokens`. Admin app refresh mỗi lần tải trang và khoảng mỗi 15 phút.
- Postgres không tự tạo index cho cột khóa ngoại. Mỗi chain bị cleanup xóa sẽ kéo theo một lần quét tuần tự toàn bảng `refresh_tokens`
  (trigger của `ON DELETE CASCADE`).
- `startChain` (`session.service.ts:61-69`) và `revokeAllForUser` (`:127-131`) quét `session_chains` mỗi lần đăng nhập hoặc đổi mật khẩu.
- Ở quy mô pilot không đáng kể. Ở vài nghìn learner, cleanup có thể chạy hàng phút.

**Đã loại trừ:** *Prisma có tự tạo index cho khóa ngoại không?* Không thấy index nào như vậy trong migration.

**Probe đề xuất:**
1. Trong e2e, chèn 200.000 dòng `refresh_tokens` cho chain A bằng `generate_series` (qua `$executeRawUnsafe`).
2. `EXPLAIN (ANALYZE) DELETE FROM session_chains WHERE id = '<chain B>'` → nghi ngờ thời gian của
   "Trigger for constraint refresh_tokens_chain_id_fkey" tăng theo kích thước bảng.
3. `EXPLAIN SELECT id FROM session_chains WHERE user_id = '<id>' AND revoked_at IS NULL` → nghi ngờ Seq Scan.

**Cách sửa gợi ý:**
- Thêm `@@index([chainId])` cho `RefreshToken`, `@@index([userId])` cho `SessionChain` và `OtpCode`.
- Xóa token đã xoay cũ thì có trade-off: token cũ chuyển từ "dùng lại" (thu hồi chain) sang "không tìm thấy" (401, không thu hồi). Cần chủ dự án quyết.

### ID9 — Rate limit của Identity chỉ đổi được bằng sửa code (Thấp, CONFIRMED)

**Chỗ lỗi:** `src/common/config/app-config.ts:86-103` (`DEFAULT_LIMITS`) và `:244` (`limits: structuredClone(DEFAULT_LIMITS)`, không đọc env).

**Vì sao sai:**
- Design Bước 1 §6 và §14 ghi số rate limit là "`ASSUMPTION`, cấu hình được". Thực tế chỉ đổi được bằng sửa code rồi deploy.
- Design 2.5 §15 đã ghi điều này, nhưng chỉ cho e2e.
- Với pilot 5–10 người (CLAUDE.md, Q-A): nếu buổi hướng dẫn cho mọi người đăng ký qua cùng một Wi-Fi/NAT:
  - người thứ 6 trở đi nhận 429 tới hết giờ (`auth.register.ip` 5/giờ, `:88`);
  - `mail.ip.daily` (20/ngày/IP, `:97`) tính chung đăng ký và mọi lần xin mã.
- `ASSUMPTION`: nhiều người dùng chung một IP công khai (Wi-Fi, NAT của nhà mạng) là bình thường.

**Hậu quả:** người thật bị chặn lúc onboarding pilot; muốn nới phải deploy lại.

**Đã loại trừ:** *Có biến env nào ghi đè không?* Không: `loadConfig` không đọc biến nào cho `limits`.

**Probe đề xuất:** 6 lần `POST /v1/auth/register` từ cùng một IP (`testConfig` giữ số mặc định, không đổi `X-Forwarded-For`) → lần 6 trả 429, `Retry-After` ≤ 3600.

**Cách sửa gợi ý:** cho ghi đè `max`/`windowSeconds` của từng luật qua env, hoặc nâng số trước pilot.

## 4. Test gaps (chỉ cái quan trọng)

- **TG1 (→ ID2):** chưa có test I8 cho bước nộp mã reset.
  - Test hiện có chỉ so body (`test/identity/password.e2e-spec.ts:248`).
  - Design §8 đã dùng cách "spy Argon2" cho đăng nhập (B1#12, `register-login.e2e-spec.ts:147`); reset chưa có.
- **TG2 (→ ID1):** chưa có test nào cho dạng chuỗi `timezone` (offset, hoa/thường) hay cho giới hạn cache.
  - Test hiện có chỉ kiểm `Mars/Base` bị từ chối và `Asia/Ho_Chi_Minh` được lưu (`profile.e2e-spec.ts:29`).
- **TG3 (→ ID4):** phần "Expected" của B1E3 ("không khóa mãi được") không có test. Với code hiện tại, test như vậy không thể xanh.

## 5. Trạng thái các phát hiện cũ

| ID cũ | Trạng thái | Bằng chứng |
|---|---|---|
| R1 (final review 07/10) | Đã sửa | Commit `abd2f32`. `src/main.ts:17` gọi `app.enableShutdownHooks()`; `src/common/mail/mail-dispatcher.service.ts:39-41`: `onApplicationShutdown` → `drain()`. Worker cũng bật (`src/worker.ts`) |
| R2 | Đã sửa | Commit `abd2f32`. `otp.service.ts:60-63` (`noteIssued`) được gọi sau commit ở `auth.service.ts:63`, `otp.service.ts:84` và `:102` |
| R3 | Còn mở | `identity-cleanup.service.ts:20-39` chỉ dọn ciphertext, mã OTP và chain. Không job nào dọn `otp_failure_windows` hay `mail_budget_buckets` (grep `scheduler.register(`: 4 job, không có hai bảng này). Tăng chậm, vô hại ở pilot |
| R4 | Đã sửa | `test/identity/maintenance.e2e-spec.ts:57`, test "B1E8: …" |
| R5 | Đóng theo quyết định chủ dự án (final review §3b) | Không phải lỗi code |
| Rủi ro §5: một user dồn request chiếm hết pool | Còn mở (đã chấp nhận) | Transaction giữ kết nối trong lúc chờ khóa advisory (`user-lock.ts:4`, `{ timeout: 10_000, maxWait: 5_000 }` ở mọi service). `PrismaPg` không đặt `max` (`common/db/prisma.module.ts:21`). Với login, semaphore Argon2 4 slot (`password-hasher.service.ts:39`) đứng trước transaction nên giới hạn số transaction tranh khóa cùng lúc |
| Rủi ro §5: số rate limit là `ASSUMPTION` | Còn mở | Xem ID9 |
| M6 (review Bước 3) | Đã sửa | PR #39 (`5697c62`), commit `79abfd4`. Thêm cột `users.last_seen_at` (migration `20261018090000_users_last_seen_at`, backfill từ các chain còn lại); ghi ở `session.service.ts:54` (tạo chain) và `:186` (xoay token); đọc ở `identity.service.ts:70`; dùng ở `notifications/scheduler/eligibility.ts:35`. Test: `test/identity/reminder-reads.e2e-spec.ts:62`. Ghi chú: user có chain bị dọn **trước** migration nhận `NULL` và rơi về `createdAt` (chỉ một lần, trước pilot) |
| L16 | Đã sửa | Commit `79abfd4`. `identity.service.ts:82` (`status: 'active'`); `listReminderCandidates` cũng lọc (`:66`). Test: `reminder-reads.e2e-spec.ts:34,77` |

## 6. Đã kiểm, không thấy vấn đề

**1. Mật khẩu**
- Argon2id `m=19456, t=2, p=1`: `auth/password-hasher.service.ts:6-11`.
- Chuẩn hóa NFC trước khi băm và kiểm: `:25,:29`.
- Chính sách 8–128 code point, tính sau NFC: `auth/password-policy.ts:3-12`.
- Argon2 không cắt mật khẩu ở 72 byte như bcrypt.
- Băm luôn chạy **ngoài** khóa.
- Đổi và reset mật khẩu đều thu hồi mọi chain: `password.service.ts:72,111`.
- Access token cũ còn dùng được tối đa 15 phút ở route không có `@RequirePermission`. Design chấp nhận (B1E13, IR13).

**2. Dò email**
- Login với email lạ vẫn chạy Argon2 trên hash giả cùng tham số: `auth.service.ts:82-86`, `password-hasher.service.ts:19-22,32-36`.
- Mật khẩu > 128 code point → 401 mà không băm và trước khi tra tài khoản: `:75-78`.
- Xin mã reset giống nhau về cấu trúc: tra tài khoản, tạo mã, gửi thư đều sau khi đã trả lời (`otp.service.ts:87-105`; test `otp.e2e-spec.ts:170-196`).
- Email: cắt khoảng trắng, chữ thường, ≤ 254, đúng một `@`: `common/email/normalize-email.ts:1-8`.
  - Unique ở DB: `users_email_key`.
  - Mọi chỗ ghi đều chuẩn hóa: `auth.service.ts:39`, `staff.service.ts:55,134`.
- Log đăng nhập sai chỉ ghi HMAC của email: `auth.service.ts:73-74`.

**3. Khóa đăng nhập**
- Đếm theo tài khoản, dưới khóa user.
- Kiểm khóa trước, rồi đến "stale" (hash đã đổi giữa chừng), rồi tăng bộ đếm; đủ 10 thì khóa 15 phút và bộ đếm về 0: `credential-decision.ts:16-30`.
- Request song song: tăng nguyên tử dưới khóa (test `register-login.e2e-spec.ts:193`).
- Trạng thái được ghi rồi mới báo lỗi (union kết quả, `auth.service.ts:89-108`).
- Argon2 chạy cả khi đang khóa, để thời gian giống nhau (B1#12).

**4. OTP**
- `randomInt` là CSPRNG (bộ sinh số ngẫu nhiên an toàn cho mật mã): `otp.service.ts:51`.
- Lưu HMAC-SHA256: `:53`. Hạn 10 phút: `:54`. Cấp mã mới vô hiệu mã cũ cùng mục đích: `:47-50`.
- So sánh hằng thời gian (`timingSafeEqual`): `:119-121`.
- Dùng một lần, tối đa 5 lần thử mỗi mã (`updateMany` có điều kiện đủ vế): `:116-126`.
- Cửa sổ 24 giờ, lần sai thứ 21 khóa 24 giờ kèm thư báo: `prisma/sql/recordOtpFailure.sql:4-19`, `otp.service.ts:128-134`.
  - Lần sai lúc đang khóa không được ghi, nên khóa không bị mở sớm.
- Tách theo mục đích: `:116`. Giới hạn theo email chung cho hai mục đích: `:170-173`.
- OTP không dùng được để đăng nhập.

**5. Phiên / refresh token**
- Token 32 byte ngẫu nhiên, lưu SHA-256: `sessions/refresh-token.ts:3-5`.
- Bản mã ân hạn dùng AES-256-GCM, IV ngẫu nhiên: `grace-cipher.ts`.
- Lấy khóa user rồi đọc lại mọi thứ: `session.service.ts:89-92,144-147`.
- Hết hạn 90 ngày trượt (tính từ `last_used_at`) / 365 ngày tuyệt đối, kèm thu hồi: `:151-157`.
- Ân hạn chỉ cho khi đủ 4 điều kiện: trong 10 giây, chain chưa thu hồi, token kế tiếp chưa xoay, còn bản mã (`:159-165`). Ngoài ra thu hồi cả chain (`:166-169`).
- Compare-and-set: `:174-181`.
- Hash lạ → 401, không thu hồi gì: `:86-87`.
- Trần 10 chain, chỉ đếm chain còn sống, cắt chain dùng lâu nhất chưa dùng lại, trong cùng transaction: `:61-76`.
- Hai tab refresh cùng token: request sau chờ khóa, đi nhánh ân hạn, cùng nhận token kế tiếp (test `session.service.e2e-spec.ts:113`). Server không cần đổi gì cho bản sửa `keepalive` (RK3).

**6. Access token**
- `jwtVerify` với `algorithms: ['HS256']`, `issuer`, `audience`, `currentDate = Clock.now()`, `requiredClaims`.
- Tìm `kid` trong danh sách khóa; `sub`/`sid` phải là UUID: `access-token.service.ts:35-47`.
- Ký bằng khóa đầu, kiểm bằng mọi khóa trong `JWT_KEYS` (`:17-29`; secret ≥ 32 byte, `app-config.ts:109-125`).
- Unit test B1E14/B1#37: `access-token.service.spec.ts:55-102`.
- Quyền đọc từ DB ở mỗi request, không đọc từ token: `staff/permission.guard.ts:29-41` (test có token mang claim giả, `admin-permissions.e2e-spec.ts:93-101`).
- Chain đã thu hồi hoặc vai trò đã gỡ → 403 ngay ở route có `@RequirePermission`.

**7. Cookie + CSRF**
- `HttpOnly; Secure; SameSite=Strict; Path=/v1/auth`, không đặt `Domain` (cookie chỉ thuộc host API): `session-transport.ts:13-15`.
- Đường cookie bắt buộc `X-CSRF-Protection: 1` cho cả refresh và logout: `:39-44`.
- Token trong body chọn đường mobile và bỏ qua cookie: `:36-38`, test `sessions.e2e-spec.ts:170`.
- Không trộn được cookie với bearer để né CSRF:
  - cookie chỉ được đọc ở refresh/logout;
  - Bearer không bao giờ tự động đi kèm request;
  - chỉ có parser JSON (`app.setup.ts:10`), nên form gửi chéo trang không tạo ra body hợp lệ;
  - CORS chỉ cho danh sách origin, có `credentials` (`:13-18`).

**8. Khóa user**
- Mọi thao tác ghi trạng thái bảo mật đều lấy `withUserLock` trước: đăng ký, đăng nhập, refresh, logout, OTP (cấp và kiểm), đổi/reset mật khẩu, admin tạo tài khoản.
- Đổi vai trò dùng khóa riêng: `staff.service.ts:119,136`.
- Không thấy đường nào ném lỗi trước khi ghi lần sai, khóa hay thu hồi. Các ngoại lệ còn lại chỉ ném khi vi phạm bất biến (`password.service.ts:63`, `session.service.ts:189`).

**9. Thư**
- Chỉ đăng ký gửi sau commit; chạy khi response phát sự kiện `close`, hoặc ngay nếu client đã ngắt: `common/mail/mail-dispatcher.service.ts:25-32`.
- Lỗi được nuốt và log chỉ ghi `name`/`code`: `:66-82`, `common/logging/app-logger.ts:19-27`.
- Thư lỗi không đổi response.
- Mật khẩu tạm chỉ đi qua thư, không vào response hay log: `staff.service.ts:84-88`, test `staff.e2e-spec.ts:206`.

**10. Quyền, rà mọi controller**
- 9 route `@Public`, đều gắn ở method, không ở class: register, login, otp, password/reset, refresh, logout, health, `GET sample`, `GET sources`.
- Mọi route `/v1/admin/**` có `@RequirePermission` ở class:
  - `roles.manage`: `staff.controller.ts:11`.
  - `content.edit`: `senses-export.controller.ts:8,19`, `admin-catalog.controller.ts:30`, `admin-entries.controller.ts:41`, `admin-senses.controller.ts:59,116`.
  - `content.import`: `inflections-backfill.controller.ts:19`, `uploads-read.controller.ts:23`, `sources.controller.ts:9`.
  - `content.import` + `content.edit`: `uploads.controller.ts:26`.
  - `content.publish`: `publish-jobs.controller.ts:35`, `admin-publish.controller.ts:20`. Riêng quick-publish cần `content.edit` + `content.publish` (`:58`).
  - `taxonomy.manage`: `admin-entries.controller.ts:71`, `topics.controller.ts:13`.
  - `settings.manage`: `admin-settings.controller.ts:18`.
- Test tự động rà mọi route admin: `test/content/admin-permissions.e2e-spec.ts:58-76`.
- Bảng vai trò khớp D6, cộng `settings.manage` chỉ cho admin (design Bước 3 §9): `identity.types.ts:9-10`.
- `questions.moderate`, `entitlements.grant`, `ai.settings` chưa có route nào. Snapshot không có controller Practice nào.
- Luật vai trò:
  - không hạ được admin cuối cùng (`staff.service.ts:123-125`, test B1E12);
  - admin tự hạ mình được khi còn admin khác (B25E5);
  - không cấp vai trò cho email chưa xác minh (`:122`);
  - editor không leo quyền được: không có `roles.manage`, và schema `PATCH /v1/me` không có `staff_role`.
- Ranh giới D3: chỉ `src/identity/**` truy vấn bảng Identity. Grep đối chứng: 70 chỗ khớp, tất cả nằm trong `src/identity`.

**11. `must_change_password`**
- Chặn mọi route có `@RequirePermission` (403 `password-change-required`): `permission.guard.ts:37-39`.
- Không chặn `/me`, auth/*, và các route learner (người cầm mật khẩu tạm vốn đổi được mật khẩu, nên đây không phải ranh giới bảo mật).
- `change` chỉ tắt cờ khi mật khẩu mới hợp lệ và khác mật khẩu cũ: `password.service.ts:69-71`. Ngoại lệ đường reset: xem ID5.

**12. Phần thêm ở Bước 3**
- `last_seen_at` ghi khi tạo chain và khi xoay token: `session.service.ts:54,186`. Nhánh ân hạn không ghi, chấp nhận được vì lần xoay ngay trước đã ghi.
- `listReminderCandidates`/`verifiedEmails` lọc email đã xác minh và `status = 'active'`, phân trang theo `id`: `identity.service.ts:62-86`.
- Kiểm `timezone` từ chối `Mars/Base`, nhận `Asia/Ho_Chi_Minh` (đo bằng Node 24.11). Xem ID1 cho phần nhận quá rộng.

**13. Dọn dữ liệu**
- Bản mã ân hạn xóa sau `grace_until`. Mã OTP xóa 24 giờ sau khi hết hạn.
- Chain xóa 30 ngày sau khi chết (thu hồi, quá 120 ngày không dùng, hoặc quá 395 ngày tuổi): `identity-cleanup.service.ts:22-37`.
- Không có bảng "lần đăng nhập sai" riêng: bộ đếm nằm trên `users`.

**Khác**
- `admin:grant`: thoát mã khác 0 khi email không có hoặc chưa xác minh (`cli/admin-grant.ts:22-25,33-36`).
- Mật khẩu sinh tự động: 16 ký tự từ `randomInt`, bảo đảm đủ 4 loại ký tự, xáo trộn bằng Fisher–Yates (`staff/password-generator.ts`).

## 7. Declined to judge / Ngoài phạm vi

**Declined to judge** (quyết định thiết kế đã ghi rõ, không phải lỗi code):
- `register` trả 409 `email-taken`, nên lộ email có tồn tại (B1#2, I2).
- Khóa đăng nhập theo tài khoản, không theo IP (IR6). Phần DoS xem ID4.
- Access token của phiên đã thu hồi còn được nhận ≤ 15 phút ở route learner (B1E13).
- Mật khẩu staff gửi nguyên văn qua email và không có hạn dùng cho mật khẩu tạm (D18–D20, design 2.5 §15).
- Ân hạn 10 giây cho kẻ cầm token cũ lấy được token kế tiếp (IE1).
- Không có endpoint "đăng xuất mọi thiết bị"; design không yêu cầu, đổi mật khẩu thay thế được.
- Chênh vài ms DB ở login (B1E28).
- Không chuẩn hóa Unicode cho email (`é` dựng sẵn và `e`+dấu là hai tài khoản). Hiếm; cấp vai trò đòi email đã xác minh nên không leo quyền được.
- Kiểm cú pháp email tối thiểu (`a@b` được nhận); chỉ tốn ngân sách thư.

**Ngoài phạm vi** (mỗi mục một dòng):
- `src/common/time/local-date.ts:1-12`: cache `formats` không giới hạn, là gốc phần bộ nhớ của ID1 (lát cắt Learning/common).
- `src/common/rate-limit/rate-limiter.service.ts:19-21`: khóa IP dùng nguyên địa chỉ.
  - Nếu deploy mở IPv6 (`ASSUMPTION`), một dải `/64` xoay địa chỉ để vượt mọi giới hạn theo IP (đăng ký, login, OTP).
  - Hệ quả: đốt hết ngân sách thư 1.500/ngày, OTP toàn hệ thống trả 503.
- `GET /v1/sources` công khai, không rate limit. Đọc bảng nhỏ, vô hại (lát cắt Content).
- Worker (`worker.ts`, dùng `AppModule`) cũng chạy cleanup hằng giờ. Design §7 nói chạy trùng vô hại.

## 8. Chưa kiểm

- Không chạy probe hay test nào. Mọi SUSPECTED chờ điều phối viên chạy trên Postgres/Redis thật.
- Code `apps/admin` (`session-store`, `keepalive`): chỉ xem phía server.
- Nội dung các unit spec (`*.spec.ts`): chỉ đọc tên, trừ vài test e2e nêu ở mục 1.
- Hành vi `SmtpMailer`/nodemailer với địa chỉ lạ; chi tiết `ProblemDetailsFilter` ngoài nhánh lỗi lạ.
- Hiệu năng dưới tải: cạn pool, thời gian cleanup. ID8 chỉ là dự đoán.
- Số kết nối mặc định của pool `pg` qua `PrismaPg`: chưa kiểm trong phiên này.
