# Review Bước 0–4 — lát FD: nền tảng Bước 0, runtime dùng chung

Người review: agent độc lập (Claude), 18/10/2026. Snapshot: `origin/dev` = `dc4cbe0`, worktree
`.claude/worktrees/review-buoc-0-4`. **Chỉ đọc code**, không chạy test, Docker hay app (theo yêu cầu). Mọi đường dẫn tính từ
`apps/api/` nếu không ghi khác. Hành vi của thư viện được kiểm bằng cách đọc source đã cài trong `node_modules` của worktree,
không dựa vào trí nhớ.

## 1. Phạm vi đã đọc

**Code trong lát (đọc hết từng dòng):**

- `src/app.module.ts`, `src/app.setup.ts`, `src/main.ts`, `src/worker.ts`.
- `src/common/**`, trừ `mail/**` và `email/**`:
  - `clock/clock.ts`, `common.module.ts`, `db/prisma.module.ts`.
  - `config/app-config.ts` và spec.
  - `idempotency/*`: service, interceptor, decorator, cleanup registrar, 2 file e2e.
  - `logging/*`, `maintenance/maintenance.scheduler.ts`, `pagination/page-token.util.ts`.
  - `problem-details/*` và spec, `rate-limit/*` và e2e, `request-user/*`, `time/local-date.ts` và spec.
- `src/health/health.controller.ts`, `src/sample/*`, `src/cli/admin-grant.ts` (chỉ phần khởi động).
- Test:
  - `test/app-setup.e2e-spec.ts`, `test/pagination.e2e-spec.ts`, `test/sample.e2e-spec.ts`.
  - `test/request-user-not-wired-by-default.e2e-spec.ts`, `test/common/schema-drift.e2e-spec.ts`, `test/setup/*`.
  - `test/support/{create-test-app,test-config,isolated-database,auth-helpers,list-routes,in-flight.interceptor,worker-env}.ts`.
  - `test/identity/maintenance.e2e-spec.ts` (phần M1).
- `apps/api/.env.example`, `docker-compose.yml`.

**Đọc xuyên module, chỉ để trả lời câu hỏi của lát:**

- grep đủ 48 lời gọi `logger.info/warn/error` và 4 lời gọi `console.*` trong `src/`.
- Mọi `new Date()` và `Date.now()`.
- 46 route ghi (kiểm `@RateLimit`) và 20 route `@Idempotent`.
- 9 chỗ dùng `decodePageToken`/`decodeBoundToken`.
- Các file liên quan trực tiếp:
  - `groups.service.ts`, `backlog.service.ts`, `items.service.ts`, `settings.service.ts`.
  - `reminder-queue.service.ts`, `session.service.ts` (M6), `sentences.controller.ts` (M1).
  - `auth.guard.ts`, `session-transport.ts`, `job-queue.service.ts`.

**Thư viện, đọc source đã cài:**

- `@nestjs/core@12.1.2`: `routes-resolver.js`, `exceptions/exceptions-handler.js`, `nest-application.js`,
  `nest-application-context.js`.
- `@nestjs/platform-express`: `express-adapter.js`, gồm `mapException`, `setErrorHandler`/`setNotFoundHandler`,
  `enableCors`, `useBodyParser`.
- `@nestjs/common`: `StandardSchemaValidationPipe`.
- `@prisma/adapter-pg@7.10.0`, `@prisma/client@7.10.0` runtime: timeout/maxWait của TransactionManager, cách nhận biết
  transaction lồng.
- `pg-pool@3.14.0`, `pg@8.23.1` (giá trị mặc định), `body-parser@2.3.0` (`lib/types/json.js`).
- `router@2.2.0` (`lib/layer.js`), `express@5.2.1` (`compileTrust`, `req.ip`), `zod@4.6.5` (`locales/en.js`).

**Design và tài liệu:**

- Bước 0 design: §2.4, §4, §5 (B0#1–4, B0E1–B0E8, đoạn "Cảnh báo cho các bước sau"), §7.
- Bước 1 design: §6 (rate limit, `TRUST_PROXY`), §7 (lỗi, log, cấu hình, dọn dẹp).
- Bước 2.5 design: §7.1 (CORS), §8 (xử lý lỗi ở giao diện).
- Bước 4 design (R1, B4E41) và plan Task 2 cùng Global Constraints.
- `docs/specs/system-spec.md` SR7–SR14; plan migrate-drizzle-to-prisma (phần `runIdempotent`).
- Review Bước 3 (M1, M6, L17); `docs/deliveries/buoc-1.md`, `buoc-3.md`.

**Số lượt:** 2. Lượt 1 đọc toàn bộ lát và design. Lượt 2 grep xuyên module và đọc source thư viện để xác nhận từng cơ chế.

## 2. Bảng tóm tắt

| ID | Mức | Phát hiện | file:dòng | Trạng thái |
|---|---|---|---|---|
| FD1 | Trung bình | Handler của `@Idempotent` ghi DB bằng client gốc, **ngoài** transaction giữ key. Nếu transaction đó chết sau khi handler đã commit (quá `timeoutSeconds`, sập, mất kết nối), key được nhả; gửi lại cùng key thì handler chạy lần hai và ghi trùng. Nhánh `abandoned` (B0E1) không bao giờ chạy tới | `src/common/idempotency/idempotency.service.ts:30,51,68,80` | CONFIRMED (trace) |
| FD2 | Trung bình | Mỗi request idempotent giữ 1 connection suốt handler, trong khi handler cần thêm connection từ cùng pool 10 (không timeout). ≥ 10 request idempotent đồng thời trên một tiến trình (một learner làm được trong hạn 30/phút) làm cả API đứng ~5–30 s rồi trả 500 | `idempotency.service.ts:30`; `src/common/db/prisma.module.ts:20-23` | SUSPECTED |
| FD3 | Trung bình | Lỗi 500 không để lại dòng log nào: `ProblemDetailsFilter` bắt mọi exception mà không log. Design 2.5 §8 lại bảo tra `operation_id` trong log API | `src/common/problem-details/problem-details.filter.ts:12-14,81-85` | CONFIRMED |
| FD4 | Trung bình | Rate limit theo IP có hai lỗ. (a) Mặc định `TRUST_PROXY=false`: đặt sau proxy thì mọi người dùng chung một bucket (đăng ký 5/giờ, thư 20/ngày cho cả hệ thống). (b) IPv6 tính theo từng địa chỉ /128: đổi địa chỉ trong /64 là vượt mọi giới hạn IP, chỉ còn ngân sách thư toàn cục | `src/common/rate-limit/rate-limit.guard.ts:26`; `rate-limiter.service.ts:19-21`; `src/common/config/app-config.ts:160-161` | CONFIRMED (cơ chế; hậu quả tùy Deploy) |
| FD5 | Thấp | `page_token` giả nhưng đúng khuôn trả 500 thay vì 400 ở 3 route: lịch sử settings, backlog, danh sách mục của nhóm | `src/settings/settings.service.ts:87-88`; `src/learning/backlog/backlog.service.ts:44-46`; `src/learning/items/items.service.ts:138-147` | CONFIRMED |
| FD6 | Thấp | Lỗi của body-parser (413, 415, JSON hỏng) trả về không có header CORS, vì CORS được đăng ký sau body-parser. Giao diện web chỉ thấy "lỗi mạng" | `src/app.setup.ts:10,13` | CONFIRMED |
| FD7 | Thấp | Thông báo lỗi parse JSON, có thể chứa một đoạn body, được trả lại trong `violations`. Unit test khẳng định điều ngược lại vì test đi một đường không có trong app thật | `problem-details.filter.ts:63-73` + Nest `express-adapter.js:374-380`; test `problem-details.filter.spec.ts:68-77` | CONFIRMED |
| FD8 | Thấp | Không bao giờ ghi `failed_permanent`: mọi lỗi của handler (kể cả 4xx) đều nhả key. SR8 "lỗi vĩnh viễn thì trả lại kết quả đã lưu" không được làm; nhánh đọc `failed_permanent` là code chết | `idempotency.service.ts:43,68-77` | CONFIRMED |
| FD9 | Thấp | Log của worker nhắc học (`reminder_*`) không có `operation_id` (SR10) | `src/notifications/scheduler/reminder-queue.service.ts:80-89` | CONFIRMED |
| FD10 | Thấp | Job dọn dẹp chạy lần đầu sau 1 giờ uptime. Tiến trình khởi động lại thường xuyên hơn thì không bao giờ dọn (fix M1, bộ đếm, session) | `src/common/maintenance/maintenance.scheduler.ts:52-56` | CONFIRMED |
| FD11 | Thấp | Regex che log chỉ bắt `contextSentence` kiểu camelCase. Trường log của dự án là snake_case (`context_sentence`), và các trường Bước 4 (`prompt`, `meaning`, `sentence`) không được che | `src/common/logging/app-logger.ts:16` | CONFIRMED |
| FD12 | Thấp | `pnpm admin:grant` nuốt lỗi cấu hình, chỉ in "admin:grant failed". Lúc Deploy không biết thiếu biến nào | `src/cli/admin-grant.ts:33-35` | CONFIRMED |

## 3. Từng phát hiện

### FD1 — Handler idempotent ghi DB ngoài transaction giữ key → gửi lại cùng key có thể chạy lần hai

**Chỗ lỗi:**

- `src/common/idempotency/idempotency.service.ts:30-80`: handler chạy ở dòng 68, transaction đặt `timeout` ở dòng 80.
- `src/common/idempotency/idempotency.interceptor.ts:61-64`: handler chính là controller thật.
- Ví dụ handler thật: `src/learning/groups/groups.service.ts:47`.

**Cơ chế:**

```ts
// idempotency.service.ts
30  const transaction = prisma.$transaction(async (tx) => {
51      await tx.idempotencyKey.create({ data: { key, userId, endpoint, status: 'in_progress', payloadHash } });
68    const response = await handler();                 // controller thật, KHÔNG nhận `tx`
69    await tx.idempotencyKey.update({ where, data: { status: 'succeeded', /* … */ } });
80  }, { timeout: timeoutSeconds * 1000, maxWait: 10_000 });
// groups.service.ts:47 — handler ghi bằng client gốc, trong transaction riêng, commit riêng
      return await this.prisma.$transaction(async (tx) => { /* … */ tx.learningGroup.create(/* … */) }, transactionOptions);
```

- **Dòng `in_progress` (dòng 51)** chỉ nằm trong transaction của idempotency. Nó không bao giờ được commit trước khi handler
  xong: commit chỉ xảy ra sau dòng 69.
- **Handler dùng `PRISMA_CLIENT` gốc.** Đã đọc runtime Prisma 7.10 (`@prisma/client/runtime/client.js`, hàm `tu(e)`):
  - Prisma chỉ coi là transaction lồng khi `$transaction` được gọi trên client của transaction (`tx`). Hàm này đọc một thuộc
    tính trên chính object client, không dùng AsyncLocalStorage (thứ giữ dữ liệu theo chuỗi gọi async).
  - Vì vậy `this.prisma.$transaction` gọi từ bên trong callback mở một transaction **độc lập**, trên connection khác.
- **Timer `timeout` của Prisma** gắn với transaction idempotency (TransactionManager: timer → `#f(s,"timed_out")` →
  `transaction.rollback()`). Khi hết giờ, Prisma tự `ROLLBACK` dù handler vẫn đang chạy.

**Vì sao sai:**

- **B0#2** (Bước 0 design §5, dòng 167) viết: "the handler runs inside this same transaction".
- **Đoạn cảnh báo cuối §5** (dòng 185) dựa vào điều đó: "B0E1 và B0E8 … đúng cho handler chỉ ghi DB (transaction rollback
  dọn sạch)". Ghi chú chốt B0E1 cũng nói vậy (`docs/deliveries/buoc-1.md:36-38`: "a real crash rolls the row back with the
  handler's transaction").
- **Thực tế:** handler không ở trong transaction đó. Rollback chỉ xóa dòng key, không xóa dữ liệu handler đã ghi.
- **B0E8** (dòng 183) ghi: "nếu handler xong sau khi race báo timeout, transaction đó vẫn commit bình thường sau". Điều này
  không còn đúng từ khi port sang Prisma: `timeout` của Prisma bằng đúng `timeoutSeconds`, nên transaction bị rollback.
- **Hệ quả phụ:** một dòng `in_progress` không bao giờ ở trạng thái đã commit. Vì vậy nhánh `abandoned` (dòng 60-63, quyết
  định chủ dự án 07/10) không chạy trong production; test B0E1 phải tự chèn dòng đó bằng tay.

**Hậu quả (ví dụ cụ thể):**

1. Handler đã commit, ví dụ nhóm "Animals" đã được tạo.
2. Transaction idempotency chết trước `COMMIT`. Các nguyên nhân có thể:
   - quá `timeoutSeconds`: upload 60 s, revert 120 s, mặc định 30 s; hoặc pool bị nghẽn (FD2);
   - tiến trình bị kill lúc deploy;
   - mất kết nối DB.
3. Client nhận 500 hoặc mất kết nối, rồi gửi lại **cùng** `Idempotency-Key`. Admin UI tự làm vậy với 409 (design 2.5 §8);
   app mobile làm vậy khi mạng chập chờn.
4. `findFirst` không thấy dòng nào → tạo `in_progress` mới → chạy handler lần 2 → nhóm, mục học, lô import hoặc câu ngữ cảnh
   bị tạo hai lần. Đây đúng là việc SR8 sinh ra để chặn.

**Người bị ảnh hưởng và mức độ:**

- Learner nhận dữ liệu trùng; staff nhận lô import trùng.
- Tần suất hôm nay thấp.
- Plan Bước 4 (Global Constraints, "Writes") gắn `@Idempotent()` vào `POST /items/:id/answer`. Bước 6–7 sẽ dựa vào câu "handler
  chỉ ghi DB thì an toàn", mà câu đó sai. Vì vậy đây là "guard còn thiếu mà các bước sau sẽ đụng tới".

**Đã loại trừ:**

- *Prisma tự lồng transaction theo ngữ cảnh async?* Không. `tu(e)` trả `{kind:"top-level"}` cho client gốc; `node:async_hooks`
  trong runtime chỉ dùng cho `AsyncResource`.
- *Handler nhận `tx` qua ALS (kiểu `nestjs-cls`)?* `package.json` không có thư viện nào như vậy; interceptor không truyền `tx`.
- *Unique constraint `(key, user_id, endpoint)` chặn lần chạy thứ hai?* Không. Dòng cũ đã bị rollback nên không có gì để va.
- *Advisory lock chặn?* Không. Lock là loại `xact` (gắn với transaction) và được nhả cùng lúc rollback.

**Probe đề xuất** (thêm vào `src/common/idempotency/idempotency.service.e2e-spec.ts`, dùng `prisma`, `key`, `userId` có sẵn):

```ts
it('FD1: a write committed by the handler survives the idempotency rollback and the same key re-runs it', async () => {
  const marker = `fd1:${randomUUID()}`;
  let calls = 0;
  const handler = async () => {
    calls += 1;
    // như handler thật: ghi bằng client gốc, commit riêng (groups.service.ts:47)
    await prisma.rateLimitCounter.create({ data: { key: `${marker}:${calls}`, windowStart: new Date(0), count: 1 } });
    if (calls === 1) await new Promise((r) => setTimeout(r, 1500));
    return { status: 201, body: { calls } };
  };
  const scope = { key, userId, endpoint: '/v1/probe', payloadHash: 'h1' };
  await expect(runIdempotent(prisma, scope, handler, { timeoutSeconds: 0.5 })).rejects.toThrow();
  await new Promise((r) => setTimeout(r, 2000)); // handler 1 chạy xong; Prisma đã rollback dòng key
  const retry = await runIdempotent(prisma, scope, handler, { timeoutSeconds: 5 });
  // Kỳ vọng (SR8, B0#2): retry.kind là 'replay' hoặc 'abandoned', và có đúng 1 dòng marker.
  // Nghi thực tế: retry.kind === 'proceed', calls === 2, có 2 dòng marker.
  expect(await prisma.rateLimitCounter.count({ where: { key: { startsWith: marker } } })).toBe(1);
});
```

**Biến thể "mất kết nối":** trong handler lần 1, sau khi ghi, chạy
`SELECT pg_terminate_backend(pid) FROM pg_locks WHERE locktype = 'advisory' AND granted AND pid <> pg_backend_pid()` (giết
backend đang giữ transaction idempotency), rồi gửi lại cùng key.

**Cách sửa gợi ý:** chọn một trong hai.

- Cho handler chạy trong đúng transaction đó: truyền `tx` qua một transaction host dựa trên ALS mà các service dùng chung.
- Hoặc tách thành 2 bước:
  1. commit dòng `in_progress` (kèm lease hoặc owner) trong một transaction ngắn, trước khi chạy handler;
  2. ghi kết quả sau khi handler xong; gặp dòng `in_progress` thì trả 409 hoặc `abandoned` như B0E1 đã chốt.

Cách 2 chữa luôn FD2.

---

### FD2 — Request idempotent cần 2 connection cùng lúc; pool 10 làm cả tiến trình tự khóa

**Chỗ lỗi:**

- `src/common/idempotency/idempotency.service.ts:30`: transaction mở suốt thời gian handler chạy.
- `src/common/db/prisma.module.ts:20-23`: pool không được cấu hình.

**Cơ chế:**

```ts
// prisma.module.ts:20-23
useFactory: (): PrismaClient => {
  const adapter = new PrismaPg({ connectionString: options.connectionString });
  return new PrismaClient({ adapter });
},
```

- **Pool mặc định 10, chờ vô hạn.** `PrismaPg({connectionString})` tạo `new pg.Pool({ connectionString })`
  (`@prisma/adapter-pg/dist/index.mjs:776`):
  - `max = 10` (`pg-pool/index.js:89`);
  - không có `connectionTimeoutMillis`, nên khi pool đầy, yêu cầu lấy connection xếp hàng vô hạn (`pg-pool/index.js:206-208`).
- **Transaction tương tác giữ riêng 1 connection** tới khi commit hoặc rollback (`adapter-pg/dist/index.mjs:702-708`:
  `this.client.connect()`).
- **`runIdempotent` giữ connection A suốt `handler()`,** trong khi handler cần thêm connection B:
  - đa số handler mở `$transaction` riêng với `maxWait: 5_000` (vd `groups.service.ts:11,47`);
  - `PATCH /v1/me/reminders` truy vấn thường, không có hạn chờ (`reminder-prefs.service.ts:19`).

**Vì sao sai:**

- **Design im lặng** về số connection. Kỳ vọng hợp lý: một tầng bọc dùng chung không được nhân đôi số connection mỗi request
  rồi tự khóa nhau.
- **Mục gần nhất đã được chấp nhận** là "same-user lock contention can exhaust the 10-connection pool"
  (`docs/deliveries/buoc-1.md:26-27`). FD2 khác cơ chế:
  - không cần cùng user hay khóa nào, chỉ cần ≥ 10 request idempotent đồng thời trên một tiến trình;
  - nó là **tự khóa** (không tiến được tới khi hết timeout), không chỉ là chậm.

**Hậu quả (nghi):**

- **Cả tiến trình đứng.** 10 request idempotent đồng thời → 10 transaction idempotency chiếm hết 10 connection → mọi handler
  chờ connection.
  - Sau 5 s (`maxWait` của transaction trong handler), khoảng 10 request trả 500 (P2028).
  - Handler kiểu truy vấn thường thì đợi tới 30 s (timeout của idempotency).
  - Trong lúc đó **mọi** request khác cần DB cũng đứng: upsert của `RateLimitGuard`, đọc danh sách…
- **Một learner gây ra được.** `user.write` cho 30 request/phút, nên `Promise.all` 10 lần `POST /v1/groups` là đủ để làm API
  lỗi và chậm với mọi người, lặp lại mỗi phút.
- **Bước 4 làm ngưỡng gần hơn.** Plan gắn `@Idempotent()` vào `POST /items/:id/answer`, route nóng nhất (120/phút).
- **Cộng dồn với FD1.** Với handler kiểu truy vấn thường, dòng key bị rollback ở giây 30 nhưng handler vẫn commit sau đó.
- **Đề xuất nâng mức:** nếu probe xác nhận ≥ 5 s đứng cho mỗi đợt 10 request, nên nâng lên **Cao** (một tài khoản làm API ngừng
  phục vụ, ngay trong hạn mức cho phép).

**Đã loại trừ:**

- *Tăng pool qua `DATABASE_URL`?* Không được. `connection_limit` là tham số của engine Rust cũ. `pg-pool` chỉ đọc `max` từ
  object options, không từ URL (`pg-pool/index.js:89`), nên pool luôn là 10.
- *Test hiện có đã chạy đồng thời mà không lỗi?*
  - Bài đồng thời lớn nhất qua route idempotent là 5 request (`test/content/sentences.e2e-spec.ts:93`): 5 transaction + 5 handler
    = 10 connection, vừa đủ, chưa vượt ngưỡng.
  - Các bài 10 request đồng thời (`rate-limit.guard.e2e-spec.ts:100-112`, `test/content/private-boundary.e2e-spec.ts:206-216`)
    không đi qua `runIdempotent`.

**Probe đề xuất** (file mới `test/common/idempotency-pool.e2e-spec.ts`):

```ts
const ctx = await createTestApp();                       // cùng pool mặc định 10 như production
const { userId } = await seedUser(ctx.prisma, { verified: true, nativeLanguage: 'vi' });
const { accessToken } = await startSession(ctx, userId);
const t0 = Date.now();
const res = await Promise.all(Array.from({ length: 12 }, (_, i) => ctx.http().post('/v1/groups')
  .set('Authorization', `Bearer ${accessToken}`).set('Idempotency-Key', randomUUID()).send({ name: `pool-${i}` })));
const ms = Date.now() - t0;
// Kỳ vọng: 12 × 201, ms < 2000.
// Nghi: ms ≥ 5000, khoảng 10 × 500 (P2028 từ $transaction của handler) và 2 × 201.
// Thêm: một GET /v1/groups của user khác gửi trong lúc đó cũng mất ≥ 5 s.
```

**Cách sửa gợi ý:**

- Không giữ connection trong lúc handler chạy (cách 2 của FD1).
- Tối thiểu: cho cấu hình pool (`max`, `connectionTimeoutMillis`) qua env, đo lại, và ghi vào checklist Deploy.

---

### FD3 — Lỗi 500 không được log

**Chỗ lỗi:** `src/common/problem-details/problem-details.filter.ts:12-14` và `:81-85`; filter được đăng ký ở
`src/app.setup.ts:20`.

**Cơ chế:**

```ts
@Catch()                                                     // bắt mọi exception
export class ProblemDetailsFilter implements ExceptionFilter {
  constructor(private readonly problemTypeBase?: string) {}  // không có logger
  // …
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, type: 'about:blank', title: 'Internal Server Error' };
```

- **Nest chỉ log lỗi lạ trong `BaseExceptionFilter`.** `ExceptionsHandler.next` gọi filter tùy chỉnh trước và **dừng** nếu có
  filter khớp (`@nestjs/core/exceptions/exceptions-handler.js:6-11`). `@Catch()` khớp mọi thứ, nên Nest không bao giờ log.
- **Không có chỗ nào khác log:** grep toàn `src/` không thấy interceptor hay middleware nào log lỗi request, cũng không có
  access log.

**Vì sao sai:**

- Design 2.5 §8 (dòng 313): "`type` không có trong bảng → 'Có lỗi xảy ra' kèm **mã lỗi** `operation_id` để tra log API". Với
  500, tra log không ra gì.
- SR10/S13 đòi log mang `operation_id`; khi không có dòng log nào thì yêu cầu đó không còn ý nghĩa.

**Hậu quả:**

- Mọi lỗi im lặng: lỗi lập trình, lỗi Prisma không được bắt (P2002/P2003/P2025 ở chỗ module quên map), lỗi DB hay Redis
  trong pilot.
- Chủ dự án chỉ có `operation_id` trên màn hình, không truy được nguyên nhân hay tần suất.
- FD5 là ví dụ: 500 xảy ra mà không ai biết.

**Đã loại trừ:**

- *Nest tự log?* Không (đã giải thích ở trên).
- *Log của platform hoặc proxy?* Chỉ thấy status 500, không có tên lỗi hay `operation_id` để nối lại.
- *Có logger khác (`useLogger`)?* grep không thấy.

**Probe đề xuất** (dùng FD5 để gây 500 chắc chắn):

```ts
const ctx = await createTestApp();
const admin = await seedUser(ctx.prisma, { verified: true, staffRole: 'admin' });
const { accessToken } = await startSession(ctx, admin.userId);
const forged = Buffer.from(JSON.stringify({ id: '-'.repeat(36) })).toString('base64url');
const res = await ctx.http().get(`/v1/admin/settings/history?page_token=${forged}`)
  .set('Authorization', `Bearer ${accessToken}`);
// Kỳ vọng FD5: 400. Nghi: 500.
// Kỳ vọng FD3: ctx.logs có { level: 'error', operation_id: res.body.operation_id }. Nghi: không có dòng nào.
expect(ctx.logs.some((e) => e.level === 'error' && e.operation_id === res.body.operation_id)).toBe(true);
```

**Cách sửa gợi ý:**

- Truyền `AppLogger` vào filter: `new ProblemDetailsFilter(base, app.get(AppLogger))`.
- Với nhánh không phải `HttpException`, gọi `logger.error('request_failed', exception, { method, route, status: 500 })`.
  `AppLogger` đã chỉ ghi `name`/`code`, đúng B1 §7.

---

### FD4 — Rate limit theo IP: mặc định sau proxy và IPv6

**Chỗ lỗi:**

- `src/common/rate-limit/rate-limit.guard.ts:26`, `src/common/rate-limit/rate-limiter.service.ts:19-21`.
- `src/app.setup.ts:12`, `src/common/config/app-config.ts:160-161`, `apps/api/.env.example:43`.

**Cơ chế:**

```ts
// rate-limit.guard.ts:26
case 'ip': subject = request.ip; break;
// rate-limiter.service.ts:19-21
const value = by === 'user' || by === 'chain' ? subject
  : createHmac('sha256', this.config.rateLimitHmacKey).update(subject).digest('hex').slice(0, 32);
const key = `${rule}:${by}:${value}`;
// app-config.ts:160-161
TRUST_PROXY: nonEmpty.refine(/* … */).transform(/* … */).default(false),
```

- **(a) Sau proxy, mọi người cùng một IP.** Với `trust proxy = false`, Express không tin proxy nào
  (`express@5.2.1/lib/utils.js` `compileTrust(false)` → `proxyaddr.compile([])`). Vì vậy `req.ip` là địa chỉ socket, tức địa
  chỉ của proxy.
- **(b) IPv6 bị tách theo từng địa chỉ.** Khóa là HMAC của **nguyên chuỗi** IP. Với IPv6, `2001:db8::1` và `2001:db8::2` (cùng
  một máy, cùng /64) là hai bucket khác nhau.

**Vì sao sai:**

- **(a)** Design Bước 1 §6 có ghi "mặc định `false` … khi deploy, proxy cuối phải ghi đè `X-Forwarded-For`". Nhưng
  `.env.example:43` để `TRUST_PROXY=false` không chú thích, và chưa có checklist Deploy. Đây là một mặc định vận hành nguy hiểm:
  quên một biến là pilot hỏng.
- **(b)** Design im lặng về IPv6. Kỳ vọng hợp lý: một máy không vượt được giới hạn IP. Thông lệ là gom IPv6 theo /64 (hoặc /56).

**Hậu quả:**

- **(a)** Sau proxy (gần như mọi PaaS) mà không đặt `TRUST_PROXY`:
  - `auth.register.ip` 5/giờ và `mail.ip.daily` 20/ngày (`app-config.ts:88,97`) trở thành giới hạn **chung cho cả hệ thống**;
  - từ người đăng ký thứ 6 trong một giờ, ai cũng nhận 429;
  - quá 20 thư một ngày thì không ai nhận được OTP.
- **(b)** Nếu bản Deploy nhận IPv6:
  - Một máy có dải /64 đổi địa chỉ mỗi request là vượt hết `auth.register.ip`, `auth.otp.ip`, `mail.ip.daily`,
    `auth.login.ip`.
  - Kẻ xấu spam đăng ký tới email ngẫu nhiên, đốt ngân sách thư toàn cục (`MAIL_DAILY_BUDGET` 1.500/ngày). Kết quả:
    `503 mail-unavailable` cho mọi người tới hết ngày UTC, và tài khoản Gmail gửi thư có thể bị Google chặn vì bounce.
  - Đăng nhập: có thể rải mật khẩu lên nhiều tài khoản, mỗi tài khoản dưới 10 lần để không bị khóa, mà không vướng giới hạn IP.
  - **Nếu Deploy có IPv6, đề nghị nâng (b) lên Cao** (lạm dụng làm mất quota thư của mọi người).

**Đã loại trừ:**

- *Giả mạo `X-Forwarded-For`?* Không được, và đây là điểm làm đúng:
  - `TRUST_PROXY` chỉ nhận danh sách địa chỉ hoặc dải tin cậy, từ chối `true` (`app-config.ts:127-137`, test B1E32);
  - Express lấy địa chỉ không tin cậy đầu tiên tính từ bên phải.
- *Bộ đếm theo email chặn thay?* Không. `auth.otp.email.*` giới hạn theo từng email; email ngẫu nhiên thì mỗi email một bucket.
- *Ngân sách thư chặn?* Có chặn, nhưng nó là bucket toàn cục, và chính nó là thứ bị đốt.

**Probe đề xuất:**

```ts
const ctx = await createTestApp({ config: { trustProxy: 'loopback', limits: structuredClone(DEFAULT_LIMITS) } });
const register = (ip: string) => ctx.http().post('/v1/auth/register').set('X-Forwarded-For', ip)
  .send({ email: `${randomUUID()}@example.com`, password: 'Password1!', timezone: 'Asia/Ho_Chi_Minh', client: 'mobile' });
// Đối chứng: 6 lần cùng '2001:db8:1:2::1' → lần 6 = 429 (chứng minh đường XFF và luật hoạt động).
// (b): 6 lần '2001:db8:1:2::1' … '::6' → kỳ vọng lần 6 = 429 (cùng /64). Nghi: cả 6 đều 201.
// (a): ctx2 = createTestApp({ config: { trustProxy: false, limits: structuredClone(DEFAULT_LIMITS) } });
//      6 lần với XFF IPv4 khác nhau → lần 6 = 429 dù là "6 người", vì mọi request mang IP của socket.
```

**Cách sửa gợi ý:**

- **(a)** Ghi `TRUST_PROXY` vào checklist Deploy và chú thích trong `.env.example`. Có thể log cảnh báo một lần khi thấy
  `X-Forwarded-For` mà `trust proxy` đang tắt.
- **(b)** Chuẩn hóa IPv6 về /64 trước khi băm HMAC, trong `RateLimitGuard`.

---

### FD5 — `page_token` giả trả 500 thay vì 400

**Chỗ lỗi:**

- `src/settings/settings.service.ts:87-88`.
- `src/learning/backlog/backlog.service.ts:44-46`.
- `src/learning/items/items.service.ts:138-147`.

**Cơ chế:**

```ts
// settings.service.ts:87-88 — 36 ký tự hex hoặc '-' chưa chắc đã là uuid
if (!cursor || !/^[0-9a-f-]{36}$/.test(cursor.id)) throw invalidInput();
const row = await this.prisma.appSettingChange.findUnique({ where: { id: cursor.id }, /* … */ }); // cột UUID
// backlog.service.ts:44-46 — '2026-02-30' khớp regex nhưng không phải ngày có thật
/* … */ || !/^\d{4}-\d{2}-\d{2}$/.test(cursor.due) || /* … */ !/^[0-9a-f-]{36}$/.test(cursor.id)) throw invalidInput();
after = Prisma.sql`AND (i.due_date, i.id) > (${cursor.due}::date, ${cursor.id}::uuid)`;
// items.service.ts:138,147 — cursor.id là chuỗi bất kỳ, đem so với cột item_id kiểu UUID
{ addedAt: after.addedAt, itemId: { gt: after.itemId } }
```

- **Token không được ký:** nó chỉ là base64url của JSON, nên client tự tạo được. "Binding" là `groupId` hoặc `groupId:cell`, mà
  client đều biết.
- **Postgres báo lỗi kiểu dữ liệu:** `invalid input syntax for type uuid` hoặc `date/time field value out of range`. Lỗi này
  không phải `HttpException`, nên filter trả 500.

**Vì sao sai:**

- Design Bước 0 §4 (S3): "`page_token` hỏng → 400, không bao giờ 500".
- Các route content và pipeline dùng zod (`z.uuid()`, `z.enum`) cho cursor nên đúng: `admin-catalog.queries.ts:27-30`,
  `words.service.ts:29-32`, `publish-jobs.controller.ts:31`. Ba route này tự viết kiểm tra bằng tay và lỏng hơn.

**Hậu quả:**

- Chỉ người tự sửa token nhận 500: learner với route của chính họ, admin với lịch sử settings.
- Không lộ dữ liệu, không chèn được SQL (truy vấn tham số hóa đầy đủ).
- Nhưng 500 không có log (FD3), và vi phạm S3.

**Đã loại trừ:**

- *SQL injection?* Không. `Prisma.sql` và query builder đều tham số hóa; không có `$queryRawUnsafe` hay `Prisma.raw` trong
  `src/`.
- *Prisma tự kiểm uuid và trả 400?* Prisma không kiểm định dạng `@db.Uuid` ở phía client. Dù có kiểm, lỗi validation của Prisma
  cũng không phải `HttpException`, nên vẫn ra 500.

**Probe:** như FD3 cho settings. Thêm cho learner (`auth` là header Bearer của một learner):

```ts
const g = (await ctx.http().post('/v1/groups').set(auth).set('Idempotency-Key', randomUUID()).send({ name: 'P' })).body.id;
const bound = (binding: string, payload: object) => Buffer.from(JSON.stringify({ binding, payload })).toString('base64url');
await ctx.http().get(`/v1/groups/${g}/backlog?page_token=${bound(g, { due: '2026-02-30', id: randomUUID() })}`).set(auth);
// kỳ vọng 400, nghi 500
await ctx.http().get(`/v1/groups/${g}/items?page_token=${bound(`${g}:`, { at: '2026-10-18T00:00:00.000Z', id: 'x' })}`).set(auth);
// kỳ vọng 400, nghi 500
```

**Cách sửa:** dùng `z.strictObject({ id: z.uuid(), due: z.iso.date() /* … */ })` cho 3 chỗ này, như các route content.

---

### FD6 — Response lỗi của body-parser không có header CORS

**Chỗ lỗi:** `src/app.setup.ts:10` (body-parser) đứng trước `:13` (CORS).

**Cơ chế:**

```ts
9   app.use(operationIdMiddleware);
10  app.useBodyParser('json', { limit: '100kb' });
11  app.use(cookieParser());
13  app.enableCors({ origin: config.corsOrigins, credentials: true, /* … */ });
```

- `useBodyParser` và `enableCors` đều gọi `app.use(...)` ngay, theo đúng thứ tự trong code (`express-adapter.js:199-201` và
  `:252-256`).
- Khi body-parser lỗi, nó gọi `next(err)`. Lúc có lỗi, router của Express bỏ qua mọi middleware không phải 4 tham số
  (`router@2.2.0/lib/layer.js:109-111`), trong đó có `cors`. Lỗi đi thẳng tới error handler của Nest.
- Kết quả: response không có `Access-Control-Allow-Origin`.

**Vì sao sai:** design 2.5 §8: giao diện đọc `type` của Problem Details để hiện câu tương ứng, và `payload-too-large` có trong
bảng. Trình duyệt chặn đọc response cross-origin thiếu header này, nên `fetch` báo lỗi mạng.

**Hậu quả:** body lớn hơn 100 KB hoặc JSON hỏng từ admin web hay learner web thì giao diện hiện "Không kết nối được máy chủ" thay
vì câu đúng. Hiện tại khó xảy ra (body lớn nhất của admin khoảng 35 KB), nên chỉ là Thấp.

**Đã loại trừ:**

- *Nest tự thêm CORS cho response lỗi?* Không. CORS là một middleware Express thường.
- *Test hiện có kiểm?* Không. `test/app-setup.e2e-spec.ts:28-36` gửi 101 KB nhưng không kèm header `Origin`.

**Probe:** `createTestApp({ config: { corsOrigins: ['https://app.example.com'] } })`, rồi `POST /v1/sample` với
`Origin: https://app.example.com` và body 101 KB.

- Kỳ vọng: 413 **và** `access-control-allow-origin` bằng origin đó.
- Nghi: header vắng.

**Cách sửa:** gọi `enableCors` trước `useBodyParser` (ngay sau `operationIdMiddleware`).

---

### FD7 — Lỗi parse JSON trả lại một đoạn body; unit test đi sai đường

**Chỗ lỗi:** `problem-details.filter.ts:63-73`; Nest `@nestjs/platform-express/adapters/express-adapter.js:374-380`; test
`src/common/problem-details/problem-details.filter.spec.ts:68-77`.

**Cơ chế:**

```js
// express-adapter.js:374-380 (Nest 12) — chạy TRƯỚC filter
case error instanceof SyntaxError || error instanceof URIError:
    return new BadRequestException(error.message);
```

```ts
// problem-details.filter.ts:66-72 — HttpException 400 → message thành violations
const message: unknown = typeof body === 'string' ? body : 'message' in body ? body.message : undefined;
const violations = Array.isArray(message) ? /* … */ : typeof message === 'string' ? [message] : [];
```

- body-parser 2.3.0 dựng message từ chính body (`lib/types/json.js:128-146`: thay chuỗi `#` giữ chỗ bằng
  `str.substring(index, …)`).
- Ví dụ: body `secret-token-123` cho message `Unexpected token 's', "secret-token-123" is not valid JSON`.

**Vì sao sai:**

- Nhánh `isExposedClientError` của filter (dòng 52-62) cố tình **không** trả message.
- Unit test `filter.spec.ts:68-77` khẳng định response "không chứa 'private JSON'". Test pass chỉ vì nó đưa thẳng một
  `SyntaxError` vào filter.
- Trong app thật, Nest đã đổi lỗi này thành `BadRequestException(message)` trước khi tới filter, nên filter đi nhánh 400 khác.
  Test tạo cảm giác an toàn sai.

**Hậu quả:**

- Chỉ người gửi nhận lại đoạn body của chính họ, không lộ cho người khác, nên là Thấp.
- Nhưng nội dung đó có thể vào log của proxy, APM hay devtools, và test đang bảo vệ sai chỗ.

**Đã loại trừ:**

- *body-parser trả lỗi http-errors thường, không phải `SyntaxError`?* Không. `createError(400, err, …)` giữ nguyên object
  `SyntaxError` (chỉ gắn thêm `status`/`expose`), nên `instanceof SyntaxError` vẫn đúng.
- *Vì sao e2e hiện có không phát hiện?* Test gửi `'{'`: JSON hỏng bắt đầu bằng `{` cho message không chứa body.

**Probe:** `POST /v1/sample` với `Content-Type: application/json` và body `secret-token-123`.

- Kỳ vọng: 400 và `JSON.stringify(res.body)` không chứa `secret-token-123`.
- Nghi: `violations[0]` chứa chuỗi đó.

**Cách sửa:**

- Đăng ký một error middleware riêng ngay sau body-parser, trả Problem Details `validation-failed` không kèm message (hoặc map
  `SyntaxError` trong filter).
- Đổi unit test thành e2e chạy qua `configureApp`.

---

### FD8 — Lỗi vĩnh viễn không được lưu (`failed_permanent` là code chết)

**Chỗ lỗi:** `idempotency.service.ts:43-48` (đọc `failed_permanent`) và `:68-77` (chỉ ghi `succeeded`).

**Cơ chế:**

- Handler ném lỗi bất kỳ, kể cả `ProblemDetailsException` 4xx → callback của transaction ném lỗi → Prisma rollback → dòng
  `in_progress` biến mất → key được nhả.
- `grep failed_permanent` trong `src/` và `test/` chỉ ra đúng dòng 43, là chỗ đọc.

**Vì sao sai:**

- SR8: "Cùng key và cùng nội dung: nếu lần đầu đã thành công **hoặc đã thất bại vĩnh viễn** thì trả đúng kết quả đã lưu và
  không thực hiện lại".
- Design B0#3 có nhắc trạng thái `failed_permanent` nhưng không nói khi nào ghi (design im lặng).

**Hậu quả:**

- Ví dụ: lần đầu trả 409 (`group-name-taken`) nhưng response bị mất. Client gửi lại cùng key sau khi tình trạng đã đổi → lần 2
  thực hiện và thành công, và client tưởng lần đầu đã thành công.
- Ảnh hưởng nhỏ. Chủ dự án chọn một trong hai:
  - giữ cách nhả key (thân thiện hơn khi client sửa payload rồi gửi lại) và xóa nhánh chết;
  - hoặc lưu 4xx như SR8.

**Đã loại trừ:** không module nào khác ghi vào `idempotency_keys` (D3: chỉ `common` sở hữu bảng này).

**Probe:**

1. `POST /v1/groups {name:'A'}` với key k0 → 201.
2. `POST {name:'A'}` với key k1 → 409.
3. `PATCH /v1/groups/:id {name:'B', version:0}` với key k2.
4. Lại `POST {name:'A'}` với key k1. Theo SR8 kỳ vọng 409 (replay); nghi thực tế 201.

**Cách sửa:** chốt hướng với chủ dự án. Nếu giữ hành vi hiện tại thì bỏ `failed_permanent` khỏi code, và sửa SR8/B0#3 cho khớp.

---

### FD9 — Log của worker nhắc học không có `operation_id`

**Chỗ lỗi:** `src/notifications/scheduler/reminder-queue.service.ts:80-89`.

**Cơ chế:**

```ts
private async process(job: Job): Promise<void> {
  const { tick, send } = this.handlers;
  if (job.name === 'tick' && tick) return tick();
  // …
    return send(job.data as ReminderSendData, { lastAttempt });
```

- `process` không bọc `runWithOperationId`, khác với `import-batch.handler.ts:46`, `publish-job.handler.ts:35` và
  `maintenance.scheduler.ts:42`.
- Worker BullMQ được tạo trong `onApplicationBootstrap`, nên không có ngữ cảnh ALS.
- Vì vậy `AppLogger` (`app-logger.ts:61-62`) không gắn `operation_id` cho:
  - `reminder_skipped`, `reminder_outcome_unknown`, `reminder_failed`, `reminder_sent` (`reminder-send.service.ts:43,70,76,86`);
  - `reminder_tick_skipped` (`reminder-tick.service.ts:48`).

**Vì sao sai:** SR10: "Mọi log liên quan một thao tác mang `operation_id`". Bước 2 đã làm đúng việc này cho batch (B2#68).

**Hậu quả:** không nối được các lần thử của một lần gửi, hay một tick với các lần gửi nó sinh ra; chỉ còn `user_id + local_date`.
Mức Thấp.

**Đã loại trừ:** `MailDispatcher` tạo id riêng (`mail-dispatcher.service.ts:49`), nhưng đó là đường gửi thư sau response, không
phải đường nhắc học.

**Probe:** trong `test/notifications/reminders.e2e-spec.ts`, kịch bản `runWorkers: true`. Sau khi có log `reminder_sent`, kiểm
`expect(entry.operation_id).toMatch(/^[0-9a-f-]{36}$/)`. Nghi: `undefined`.

**Cách sửa:** trong `process`, dùng `return runWithOperationId(randomUUID(), () => …)`. Muốn nối tick với các lần gửi thì lưu id
vào `job.data` khi tick enqueue.

---

### FD10 — Job dọn dẹp chạy lần đầu sau 1 giờ

**Chỗ lỗi:** `src/common/maintenance/maintenance.scheduler.ts:52-56`.

```ts
onApplicationBootstrap(): void {
  if (!this.config.maintenanceEnabled) return;
  this.timer = setInterval(() => { void this.runAll(); }, HOURLY);
  this.timer.unref();
}
```

**Vì sao sai:**

- Design Bước 1 §7: "Dọn dẹp mỗi giờ". Fix M1 dựa vào job này để response và câu không nằm lại quá 24 giờ.
- Kỳ vọng hợp lý: job chạy cả lúc khởi động (hoặc sau vài phút), không chỉ sau 60 phút chạy liên tục.

**Hậu quả:**

- Nếu host ngủ khi rảnh hoặc restart thường xuyên (deploy nhiều lần trong ngày, autoscale về 0), không tiến trình nào sống đủ
  1 giờ. Khi đó `idempotency_keys`, `rate_limit_counters`, OTP và session không bao giờ được dọn.
- Hiện API và worker cùng chạy job, và worker thường sống lâu, nên tạm ổn: mức Thấp.

**Đã loại trừ:** *Xóa lười trong `runIdempotent`?* Chỉ xóa khi đúng key đó được gửi lại sau 24 giờ (`idempotency.service.ts:38-41`),
gần như không bao giờ xảy ra (review M1 đã nói).

**Probe:** unit test với `vi.useFakeTimers()`: gọi `onApplicationBootstrap()`, rồi `vi.advanceTimersByTime(3_599_000)`. Thực tế:
`runAll` chưa được gọi lần nào.

**Cách sửa:** sau khởi động, gọi `runAll()` một lần (có trễ ngắn, timer `unref`).

---

### FD11 — Regex che log bỏ sót trường snake_case và trường của Bước 4

**Chỗ lỗi:** `src/common/logging/app-logger.ts:16`.

```ts
const REDACT_KEY_PATTERN = /password|otp|code|token|cookie|authorization|answer|contextSentence/i;
```

**Vì sao sai:**

- Trường log của dự án viết snake_case (`user_id`, `sentence_id`, `local_date`). `context_sentence` không khớp `contextSentence`
  vì có dấu gạch dưới.
- Plan Bước 4 (Global Constraints, "Privacy", dòng 147): "never log a typed answer, a prompt, a meaning or a sentence". Các trường
  `prompt`, `meaning`, `sentence`, `text`, `email` đều không có trong lưới che.

**Hậu quả:**

- Hôm nay chưa có log nào lộ: đã kiểm đủ 48 lời gọi.
- Lưới che chỉ là lớp phòng thủ thứ hai. Một lần sơ ý ở Bước 4 (vd `{ prompt, typed }`) sẽ đi thẳng vào log.

**Probe:** unit `AppLogger`: `logger.info('x', { context_sentence: 's', prompt: 'p', meaning: 'm', sentence: 's2' })`. Kỳ vọng:
mọi giá trị thành `[redacted]`. Thực tế: giữ nguyên.

**Cách sửa:** so khớp trên key đã bỏ `_` và `-`, và thêm `sentence|prompt|meaning|email`.

---

### FD12 — `admin:grant` nuốt lỗi cấu hình

**Chỗ lỗi:** `src/cli/admin-grant.ts:33-35`.

```ts
} catch {
  console.error('admin:grant failed');
  process.exitCode = 1;
}
```

`loadConfig` ném lỗi `Missing or invalid configuration variables: X, Y`. Message này chỉ có tên biến, không có giá trị, nên in ra
an toàn; nhưng nó bị nuốt.

**Vì sao sai:**

- Đây là bước "First admin" trong hướng dẫn cài đặt (CLAUDE.md) và sẽ là một trong những bước đầu tiên của Deploy.
- Design im lặng; kỳ vọng hợp lý là người chạy biết thiếu biến nào.

**Hậu quả:** người vận hành mất thời gian dò lỗi. Mức Thấp.

**Cách sửa:** in `err.message` khi lỗi đến từ cấu hình (message của `loadConfig` không chứa bí mật); giữ thông báo chung cho các
lỗi khác.

## 4. Test gaps

- **T1 (FD1):** không test nào cho ca "handler đã ghi xong rồi transaction idempotency chết, gửi lại cùng key".
  - Test B0E8 (`idempotency.service.e2e-spec.ts:94-111`) chỉ kiểm hàm ném lỗi; handler của nó không ghi DB.
  - Test B0E1 (`:78-85`) tự chèn dòng `in_progress` bằng tay, một trạng thái mà code thật không tạo ra được.
- **T2 (FD2):** không test đồng thời nào vượt cỡ pool qua route idempotent.
- **T3:** test replay (`idempotency.interceptor.e2e-spec.ts:84-99`) chỉ so body, không so status.
  - `responseStatus` đã lưu bị bỏ qua khi replay (`idempotency.interceptor.ts:89` trả `result.body`).
  - Hôm nay vô hại vì không route idempotent nào đặt status động (đã grep), nhưng không có test giữ điều kiện đó.
- **T4 (B0E6):** `test/request-user-not-wired-by-default.e2e-spec.ts:15-18` gọi `GET /v1/health` (route `@Public`), nên luôn 200
  dù fake middleware có bị gắn hay không. Test không kiểm vế "Then". Nên đổi thành `POST /v1/sample` kèm `X-Test-User-Id` và
  `Idempotency-Key`, không có Bearer, kỳ vọng 401.
- **T5 (S1):** không có e2e cho route lạ dưới `/v1` → 404 problem+json, và không có test header CORS trên response lỗi (FD6).
- **T6 (S3, FD5):** e2e pagination (`test/pagination.e2e-spec.ts:43-47`) chỉ thử token rác trên một controller giả lập. Chưa thử
  token đúng khuôn nhưng giả trên route thật.
- **T7 (FD7):** `problem-details.filter.spec.ts:56-77` kiểm filter với lỗi body-parser thô, một đường không xảy ra trong app vì
  Nest đã map trước. Cần bản e2e chạy qua `configureApp`.
- **T8 (FD4):** `test/support/test-config.ts:157-159` nâng mọi luật IP lên 10 000. Không test nào chạy luật IP thật với
  `TRUST_PROXY` khác `false`, hay với IPv6.

## 5. Trạng thái các phát hiện cũ

| ID cũ | Trạng thái | Bằng chứng |
|---|---|---|
| M1 | Đã sửa | **PR #42, commit `3961c60`:** `POST /v1/senses/:id/sentences` chỉ trả `{ id, created_at }` (`src/content/sentences/sentences.controller.ts:41-42`), nên câu không còn vào `response_body`. **PR #39, commit `d701541`:** job `idempotency-keys` xóa dòng cũ hơn 24 giờ (`src/common/idempotency/idempotency-cleanup.registrar.ts:17-20`, đăng ký ở `common.module.ts:29`), test `test/identity/maintenance.e2e-spec.ts:44`. **Còn lại:** job chạy lần đầu sau 1 giờ (FD10); Bước 8 (xóa tài khoản) phải xóa các dòng của user, chưa làm, đúng kế hoạch |
| M6 | Đã sửa | **PR #39, commit `79abfd4`:** thêm cột `users.last_seen_at` và backfill từ `session_chains` (`prisma/migrations/20261018090000_users_last_seen_at/migration.sql`). Cột được ghi khi mở phiên (`src/identity/sessions/session.service.ts:54`) và khi refresh (`:186`); nhắc học đọc từ user (`src/identity/profile/identity.service.ts:62-74`); test `session.service.spec.ts:116,307`. Cleanup xóa chain không còn ảnh hưởng |
| L17 | Còn mở (chấp nhận theo thiết kế) | `LEARNER_APP_URL` vẫn bắt buộc, không có mặc định (`src/common/config/app-config.ts:168-172`). Không commit nào sửa sau review (git log `app-config.ts` chỉ có `6f422bd` thêm luật practice). Đã có trong `.env.example:47-48`, `docs/deliveries/buoc-3-test-flow.md:23`, CI `.github/workflows/ci.yml:225`, `test/support/worker-env.ts:22`, test `app-config.spec.ts:26`. **Còn thiếu:** checklist Deploy chưa có; nên ghi cùng `TRUST_PROXY` (FD4) và lỗi của `admin:grant` (FD12) |

## 6. Đã kiểm, không thấy vấn đề

### Idempotency

- **Phạm vi (user, endpoint):** advisory lock và unique đều gồm `userId` và `request.path` (có path param), nên hai user hay hai
  endpoint không va nhau (`idempotency.interceptor.ts:60`, `idempotency.service.ts:19-20,31`,
  `prisma/models/common.prisma:12`).
  - Hai route idempotent cùng path khác method (`PATCH`/`DELETE /v1/groups/:id`, `/v1/my-words/:id`) có body khác nhau (object
    và `null`), nên bị reject chứ không replay nhầm.
- **Hai request đầu tiên cùng key chạy song song:** `pg_try_advisory_xact_lock` không chờ, nên một request chạy, request kia nhận
  409 + `Retry-After: 2` (`idempotency.service.ts:31-34`, `interceptor.ts:67-74`); có test
  (`idempotency.service.e2e-spec.ts:113-129`, `test/sample.e2e-spec.ts:118-142`).
- **Payload khác → 400, không chạy** (`idempotency.service.ts:43-46`). Dòng cũ hơn 24 giờ bị xóa và chạy như mới (`:38-41`).
- **Hash payload:**
  - Tính trên body đã parse, nên không phụ thuộc khoảng trắng. Interceptor chạy trước pipe, nên đó là body thô.
  - File multipart: sha256 của bytes cộng fieldname (`interceptor.ts:48-55`).
  - Không route idempotent nào đọc query string (đã xem cả 20 route).
  - Phụ thuộc thứ tự key, nhưng client gửi lại đúng bytes thì không sao.
  - `originalname` không vào hash (`uploads.service.ts:82` có lưu nó). Cùng bytes, khác tên file, cùng key → replay lô đầu, vô hại.
- **Thứ được lưu:** status + body, không lưu header; giữ 24 giờ; job dọn (M1). Không route idempotent nào đặt header hay status
  động (đã grep `passthrough`, `setHeader`, `res.status`).
- **Ghép đôi đúng:** mọi `@Idempotent()` đi cùng `@UseInterceptors(IdempotencyInterceptor)` (20 route). Route idempotent luôn qua
  `AuthGuard` trước nên có user; thiếu user → 400 (`interceptor.ts:43-46`).
- **Timer của `Promise.race`** không gây unhandled rejection, vì `race` đã gắn handler.

### Problem Details

- **Lỗi của body-parser:** JSON hỏng 400, 413, 415 (charset hoặc encoding), gzip hỏng 400. Tất cả là problem+json có
  `operation_id` (`test/app-setup.e2e-spec.ts:20-53`; filter `:52-62`).
- **Route lạ dưới `/v1`:** handler not-found của Nest (mount dưới `/v1`, `express-adapter.js:101-108`) → filter toàn cục → 404
  problem+json (`routes-resolver.js:77-89`).
- **Lỗi validation:** 400 `validation-failed` + `violations` (`standard-schema-validation.pipe.js`; filter `:63-73`). Message của
  zod 4 chỉ nêu kiểu, giá trị mong đợi và tên key lạ, không lặp lại giá trị người dùng gửi (`zod/v4/locales/en.js:63-102`).
- **Guard:** không có `new ForbiddenException`/… dạng thô trong `src/` (grep). Guard đều ném `ProblemDetailsException`.
- **Lỗi Prisma không được map:** ra 500 `Internal Server Error`, không message, không stack (`filter:81-85`). Module tự map các ca
  đã biết (vd `groups.service.ts` P2002 → 409, sentences P2003 → 404).
- **`extensions`** không ghi đè được `type`/`status`/`title`/`instance`/`operation_id` (`filter:29-38`).

### Pagination

- **`page_size`:** zod mặc định 20, khoảng 1–100, trên mọi route list (10 schema). `?page_size=1&page_size=2` thành mảng → NaN →
  400.
- **Token "bound":** kiểm base64url chuẩn, `binding` phải khớp bộ lọc, giá trị chỉ là string hoặc number hữu hạn
  (`page-token.util.ts:25-42`). Các route content và pipeline kiểm thêm bằng zod strict (`admin-catalog.queries.ts:27-30`,
  `learner-content.service.ts:21-25`, `words.service.ts:29-32`, `publish-jobs.controller.ts:31`, `uploads-read.controller.ts:18`).
  Dùng lại token với bộ lọc khác → binding khác → 400.
- **Truy vấn:** đều tham số hóa; không có `$queryRawUnsafe` hay `Prisma.raw` trong `src/`.
- **Thứ tự keyset:** có khóa phụ duy nhất (id hoặc email) ở mọi route. Timestamp trong cursor lấy từ `Clock` (độ chính xác ms) nên
  không mất phần µs (`background-jobs.service.ts:61`, `items.service.ts:181`, `settings.service.ts:71`).

### Logging

- **`operation_id`** lấy từ AsyncLocalStorage, có cả khi request mang body JSON (`test/sample.e2e-spec.ts:87-99`), tức ngữ cảnh đi
  qua được body-parser.
  - Job import, publish và inflection bọc bằng `job.operationId`; maintenance mỗi job một id.
  - Người gọi không ghi đè được `operation_id`/`level`/`event` (`app-logger.ts:59-63`).
- **Lỗi** chỉ ghi `name`/`code` (B1 §7), kể cả khi lỗi nằm trong một field (`redact` → `serializeError`).
- **Grep đủ 48 lời gọi `logger.*` và 4 `console.*` trong `src/`:** không có mật khẩu, OTP, token, cookie, IP thô, email thô (đăng
  nhập sai chỉ ghi HMAC, `auth.service.ts:72-73`), câu ngữ cảnh, đáp án hay ô CSV.

### Rate limit

- **Bộ đếm:** nằm ở Postgres, upsert nguyên tử bằng `ON CONFLICT`, nên đúng khi chạy nhiều instance. Có test 10 request đồng thời
  (`rate-limit.guard.e2e-spec.ts:100-112`). 429 kèm `Retry-After` ≥ 1 (`rate-limiter.service.ts:34-40`); CORS expose `Retry-After`.
- **Độ phủ:** 46/46 route ghi có `@RateLimit` (đếm `@Post|@Patch|@Put|@Delete` so với `@RateLimit` trong controllers).
  - Route `@Public` chỉ dùng luật IP.
  - Luật `user` chạy sau `AuthGuard` toàn cục.
- **Lưu trữ:** IP và email được băm HMAC trước khi lưu. `TRUST_PROXY` chỉ nhận allow-list, từ chối `true`
  (`app-config.ts:127-137,160`).
- **`practice.answer`:** 120 lần/60 s theo user (`app-config.ts:102`), khớp Bước 4 R1/B4E41 và plan Task 2. Chưa gắn vào route vì
  các route Practice chưa merge.

### Config

- **Validation:** zod kiểm mọi biến. Boot fail chỉ in tên biến (`app-config.ts:192-197`).
- **Secret:** base64url chuẩn, tối thiểu 32 byte; `REFRESH_GRACE_KEY` đúng 32 byte. `JWT_KEYS` dạng `kid:secret`, kid không trùng.
- **`CORS_ORIGINS`:** phải là origin http(s) chính xác.
- **Placeholder trong `.env.example`** không qua được validation, nên không thể vô tình chạy với secret mẫu.
- **Cookie refresh:** `secure: true, httpOnly, sameSite: 'strict'` cố định (`session-transport.ts:14`).

### Time

- Chỉ `idempotency.service.ts:38,75` và `sample.controller.ts:22` dùng giờ hệ thống thay vì `Clock`. Ở idempotency, hệ quả duy
  nhất là mốc 24 giờ lệch đúng bằng độ lệch đồng hồ giữa app và DB: chấp nhận được.
- `local-date.ts` đúng qua DST và các múi giờ cực (`local-date.spec.ts`). Timezone đầu vào được kiểm bằng `Intl.DateTimeFormat` ở
  identity (`auth.service.ts:43`, `identity.service.ts:89`), cùng cơ chế với `localDate`.

### Maintenance

- Mỗi job chỉ xóa hoặc đặt null các dòng đã hết hạn.
- Chạy trùng ở API và worker vô hại: row lock, lần chạy sau đếm 0.
- Một job lỗi được log, các job khác vẫn chạy (`maintenance.scheduler.ts:39-50`).
- Timer được `unref` và hủy khi đóng app.

### Bootstrap

- `configureApp` dùng chung cho `main.ts` và test (`create-test-app.ts:91`).
- **Body:** JSON tối đa 100 KB; chỉ có parser JSON (urlencoded/text cho body rỗng → 400 theo schema). Multer giới hạn 10 MB và
  1 file, chỉ ở route upload, chạy sau guard (`content-pipeline.module.ts:30-34`).
- **CORS** theo allow-list kèm credentials; prefix `/v1`.
- **Tắt máy:**
  1. Nest chạy destroy hooks.
  2. Đóng HTTP, chờ các request đang chạy xong.
  3. `onApplicationShutdown` xả thư (`nest-application-context.js:142-150`, `mail-dispatcher.service.ts:39`).
  - Enqueue lỗi trong lúc đóng để lại job ở trạng thái `queued` cho reconciler (`job-queue.service.ts:38,62-75`).
  - Prisma không được `$disconnect`, nhưng tiến trình thoát bằng `process.kill` sau các hooks (`nest-application-context.js:229`),
    nên không treo.
- **Worker** nạp đúng `AppModule` như API, không thiếu provider. Scheduler nhắc học chỉ chạy khi `runWorkers`
  (`reminder-queue.service.ts:54`).

### Request-user seam

- `AuthGuard` toàn cục (`identity.module.ts:28`) ghi đè `request.user` ở mọi route (`auth.guard.ts:22`). Kể cả khi fake middleware
  bị gắn nhầm cũng không giả được user.
- Không handler `@Public` nào đọc `CurrentUser`. Fake middleware chỉ được import trong test.

### docker-compose

- Các cổng bind vào `127.0.0.1`. Redis dùng `noeviction` + AOF, đúng cho BullMQ.

### Quan sát nhỏ (không vào bảng)

- Request ngoài `/v1` (vd `GET /`, `/health`) nhận 404 HTML mặc định của Express, không phải problem+json, vì handler not-found
  của Nest chỉ mount dưới `/v1`. Healthcheck lúc Deploy phải dùng `/v1/health`.
- 404 dưới `/v1` có `instance` mất tiền tố (`/nope` thay vì `/v1/nope`), vì router mount cắt bớt `req.url`.
- `redact` coi `Date` và `Map` là object thường, nên chúng thành `{}` trong log (hiện chưa có log nào truyền `Date`).
- `Idempotency-Key` không giới hạn độ dài. Key ngẫu nhiên dài hơn khoảng 2,7 KB vượt cỡ dòng của index B-tree → 500 (SUSPECTED,
  chỉ hại chính client gửi).
- Câu cleanup trên `idempotency_keys.created_at` và `rate_limit_counters.window_start` không có index, nên mỗi giờ quét cả bảng;
  ổn ở quy mô pilot.
- `POST /v1/sample` (endpoint mẫu Bước 0) vẫn mở ở production: có auth, giới hạn 10/phút, vô hại.

## 7. Declined to judge / Ngoài phạm vi

**Declined to judge:**

- Security headers (helmet, `x-powered-by`): API chỉ trả JSON và design im lặng; để chủ dự án quyết lúc Deploy.
- Healthcheck chỉ kiểm tiến trình còn sống (liveness), không kiểm DB/Redis: đây là quyết định của bước Deploy.
- FD8 có thể được chấp nhận như hiện tại (nhả key cả khi 4xx thì thân thiện hơn); đã ghi Thấp để chủ dự án chọn.
- Không có cấu hình log level: chưa thấy chi phí cụ thể.

**Ngoài phạm vi:**

- Mail: `SMTP_SECURE=false` là mặc định. Lát mail nên kiểm nodemailer có bật `requireTLS` cho cổng 587 không; nếu không, kẻ ở giữa
  gỡ STARTTLS thì lộ mật khẩu SMTP.
- Schema: thiếu index cho các câu cleanup (đã nêu ở mục 6).
- Deploy:
  - `keepAliveTimeout` mặc định của Node (5 s) ngắn hơn idle timeout của nhiều load balancer → 502 lác đác.
  - Log dạng text của Nest lẫn với các dòng JSON.
- `withUserLock` giữ connection trong lúc chờ (đã chấp nhận ở `docs/deliveries/buoc-1.md:26-27`), cộng dồn với FD2.

## 8. Chưa kiểm

- Không chạy gì (theo yêu cầu). Mọi SUSPECTED và các probe ở trên cần chạy trên Postgres/Redis thật.
- Chưa đọc `prisma.config.ts`, `scripts/*.mjs` (run-dev, gen-secret, smoke). Với `.github/workflows/ci.yml` chỉ grep một dòng.
- `src/common/mail/**`, `src/common/email/**` (thuộc lát khác), `test/common/mail-budget.e2e-spec.ts`.
- `test/support/{seed-practice,seed-senses,reset-catalog,learning-metrics,fake-job-context,mailpit}.ts`: chỉ đọc tên file.
- Logic bên trong từng handler, ngoài phần cần cho FD1, FD2 và FD5.
- Dạng chính xác của message lỗi JSON theo từng kiểu body (phụ thuộc V8); probe FD7 sẽ chốt.
