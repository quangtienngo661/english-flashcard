# Review độc lập Bước 0–4 — slice `DB` (schema, migration, raw SQL, ranh giới module, CI)

Ngày 18/10/2026. Người review: agent độc lập, không tham gia viết code. Chỉ đọc, không chạy test, không chạy DB/Docker.
Snapshot: `.claude/worktrees/review-buoc-0-4/` detached tại `origin/dev` = `dc4cbe0` (đã có PR #49, #51 của Bước 4; **chưa** có
PR #50). Đường dẫn tính từ `apps/api/` trừ khi ghi khác.

Cách đọc nhãn: **CONFIRMED** = đã lần theo đủ đường đi (route → service → query → schema/migration → transaction/lock) và mã
nguồn thư viện liên quan; **SUSPECTED** = cơ chế đọc được nhưng hậu quả cần chạy thật mới chắc (có probe kèm theo).

---

## 1. Phạm vi đã đọc

- **Schema và migration:** `prisma/schema.prisma`, `prisma.config.ts`, 7 file `prisma/models/*.prisma`, đủ 22 file
  `prisma/migrations/*/migration.sql`, `migration_lock.toml`, `prisma/sql/tryAdvisoryLock.sql`, `prisma/sql/recordOtpFailure.sql`.
- **Raw SQL — đọc hết 20 file** có `$queryRaw`/`$executeRaw`/`Prisma.sql`/`Prisma.join`/TypedSQL:
  `common/idempotency/idempotency.service.ts`, `common/mail/mail-budget.service.ts`, `identity/{user-lock.ts, staff/staff.service.ts,
  auth/otp.service.ts}`, `content/{learner/visible-senses.ts, learner/learner-content.service.ts, words/words.service.ts,
  practice/practice-senses.ts, private/private-words.service.ts, sentences/sentences.service.ts, catalog/entries.service.ts,
  catalog/levels.service.ts}`, `content-pipeline/{jobs/background-jobs.service.ts, import/revert.service.ts}`,
  `learning/{learning-lock.ts, queue/queue.queries.ts, queue/queue.service.ts, backlog/backlog.service.ts, reviews/reviews.service.ts}`.
  Không có `Prisma.raw`, `$queryRawUnsafe`, `$executeRawUnsafe` trong `src/` (chỉ một chỗ trong test).
- **Luồng có transaction/lock** (đọc để kiểm thứ tự khóa, ràng buộc unique, cascade): `learning/{items,groups,quick-add}/*`,
  `content/catalog/{revert.service.ts, admin-entries.controller.ts, admin-catalog.queries.ts}`, `content/inflections/inflections.service.ts`,
  `content-pipeline/{import/row-processor.ts, import/prefilter.ts, inflections/inflections-backfill.handler.ts, jobs/job-queue.service.ts,
  jobs/job-reconciler.service.ts, upload/uploads.service.ts, publish/publish-job.handler.ts}`, `identity/{sessions/session.service.ts,
  maintenance/identity-cleanup.service.ts, profile/identity.service.ts, staff/permission.guard.ts}`, `common/{rate-limit/*, maintenance/*,
  idempotency/*, db/prisma.module.ts, pagination/page-token.util.ts, time/local-date.ts}`, `notifications/scheduler/{reminder-send,reminder-tick}.service.ts`,
  `settings/settings.service.ts`.
- **Ranh giới D3:** quét mọi `prisma.<model>`/`tx.<model>` theo thư mục module (bảng kết quả ở mục 5), mọi import chéo module, mọi
  `@relation` trong 7 file model, mọi tên bảng trong raw SQL ngoài module sở hữu.
- **Test liên quan DB:** `test/common/schema-drift.e2e-spec.ts`, `test/{content,learning,pipeline}/schema.e2e-spec.ts`,
  `src/common/idempotency/*.e2e-spec.ts`, `test/support/{create-test-app,auth-helpers,isolated-database,reset-catalog}.ts`,
  `test/setup/postgres-global-setup.ts`, `vitest.config*.ts`; grep mọi test chạy đồng thời (`Array.from({ length: N })`).
- **CI và vệ sinh repo:** `.github/workflows/ci.yml`, `.github/workflows/deploy-web.yml`, `package.json` gốc, `pnpm-workspace.yaml`,
  `.gitignore` (gốc, api, admin, web), `docker-compose.yml`, `apps/api/scripts/*` (4 file), `.env.example`, `src/cli/admin-grant.ts`;
  `git ls-files` + `git grep` tìm file `.env`/khóa/secret đã commit.
- **Mã nguồn thư viện, đọc để kiểm chứng hành vi (không dựa vào trí nhớ):** `node_modules/.pnpm/pg-pool@3.14.0…/index.js` (mặc định `max`,
  hàng chờ connection), `@prisma/adapter-pg@7.10.0/dist/index.mjs` (tạo pool, `startTransaction`, parser kiểu `date`),
  `@prisma/client@7.10.0/runtime/client.mjs` (`maxWait`, `timeout` → ROLLBACK). Tài liệu Postgres 17 qua context7: khóa của
  `ADD CONSTRAINT … CHECK`, giới hạn kích thước dòng index B-tree, điều kiện dùng partial index và multicolumn index.
- **Design:** Bước 0 §2.2, §4, §5 (B0#1–B0#4, B0E1–B0E8, cảnh báo dòng 185); Bước 1 §3; Bước 2 §3 (ranh giới, dòng 85–89) và §4;
  Bước 3 §4 (ranh giới), §5; Bước 4: không có migration mới trong snapshot. `docs/specs/system-spec.md` SR8, S3, S4, S5, S15, S16.
  Review cũ để không báo lại: `2026-10-17-db-schema-business-review.md` (DB1–DB3), `2026-10-17-buoc-3-code-review.md`,
  `2026-10-18-buoc-4-plan-review.md` (#9, #28).
- **Số lượt:** 4 lượt — (1) schema + migration; (2) raw SQL + transaction/lock; (3) D3 + ràng buộc + index; (4) CI/scripts/hygiene +
  kiểm chứng thư viện.

---

## 2. Bảng tóm tắt

| ID | Mức | Phát hiện (1 dòng) | file:dòng | Trạng thái |
|---|---|---|---|---|
| DB10 | Trung bình | Handler của route có `Idempotency-Key` chạy **ngoài** transaction giữ key; quá `timeoutSeconds` thì Prisma rollback dòng key và nhả lock nhưng handler vẫn commit → gửi lại cùng key chạy lần 2 (trái S4, S16, B0#2, quyết định B0E1) | `src/common/idempotency/idempotency.service.ts:30-82`, `src/common/idempotency/idempotency.interceptor.ts:58-65` | CONFIRMED (cơ chế); hậu quả có probe |
| DB11 | Trung bình | Mỗi request idempotent giữ 2 connection; pool mặc định 10, chờ connection không giới hạn → ≥10 request idempotent đồng thời trong một process kẹt rồi trả 500 | `src/common/db/prisma.module.ts:21-22`, `src/common/idempotency/idempotency.service.ts:30,68` | SUSPECTED |
| DB12 | Trung bình | Module Pipeline truy vấn thẳng bảng của Content (`entries`, `entry_inflections`) — vi phạm D3 | `src/content-pipeline/import/row-processor.ts:103,105,139`, `src/content-pipeline/inflections/inflections-backfill.handler.ts:41,53` | CONFIRMED |
| DB13 | Thấp | Thiếu index trên cột khóa ngoại dùng cho xóa dây chuyền/join: `senses(entry_id)`, `senses(replaces_sense_id)`, `context_sentences(sense_id)`, `refresh_tokens(chain_id)` (+ 3 cột nhẹ hơn) | `prisma/migrations/20261012120000_content/migration.sql:73-83,147,177-178`; `…20261017190000_context_sentences/migration.sql:13`; `…20261007120000_identity/migration.sql:42-53,102` | CONFIRMED (thiếu index); SUSPECTED (độ chậm) |
| DB14 | Thấp | Tra theo lemma (`wordPage`, `has_page`, `lookup`) không có index dùng được; giả định "~9.800 entry, quét tuần tự vẫn nhỏ" của Bước 2 hết đúng khi từ riêng nằm chung bảng `entries` | `src/content/words/words.service.ts:111,116-117,135-136` | SUSPECTED |
| DB15 | Thấp | `page_token` tự chế với ngày/uuid sai qua được regex → cast `::date`/`::uuid` trong SQL lỗi → 500 thay vì 400 (S3) | `src/learning/backlog/backlog.service.ts:44-46` (cùng kiểu: `learning/items/items.service.ts:138-141`, `settings/settings.service.ts:87-88`) | SUSPECTED |
| DB16 | Thấp | `Idempotency-Key` không giới hạn độ dài → vượt giới hạn dòng index B-tree → 500 | `src/common/idempotency/idempotency.interceptor.ts:39`, `prisma/migrations/20261006070840_init/migration.sql:22` | SUSPECTED |
| DB17 | Thấp | CI/CD: action pin theo tag (không theo SHA), image service trôi (`axllent/mailpit` = latest), không khai báo `permissions`, `deploy-web` có `workflow_dispatch` chạy được từ mọi nhánh | `.github/workflows/ci.yml:37-46,184-185`; `.github/workflows/deploy-web.yml:12,23,34-43` | CONFIRMED |
| DB18 | Thấp | Đổi CHECK bằng `DROP`+`ADD` (quét cả bảng dưới khóa `ACCESS EXCLUSIVE`) và `CREATE INDEX` không `CONCURRENTLY` — sẽ chặn ghi trên bảng lớn (`learning_log`) sau khi có DB thật | `prisma/migrations/20261018100000_learning_backlog_section/migration.sql:2-3`; `…20261018130000_form_of_unlink/migration.sql:2` | CONFIRMED (cơ chế) |
| DB19 | Thấp | Cột mảng `sense_revisions.examples/topic_codes/accepted_forms`, `import_row_outcomes.error_codes` cho phép NULL trong DB trong khi code coi là luôn có; drift test không thấy chênh lệch này | `prisma/migrations/20261012120000_content/migration.sql:96-98`; `…20261012180000_pipeline/migration.sql:51`; `src/content/practice/practice-senses.ts:73` | CONFIRMED (schema) |

Không có mục **Cao** trong slice này. Quyền riêng tư ở tầng SQL (`visibleSenseCondition`, phạm vi `Idempotency-Key` theo user) đã kiểm,
không thấy lỗ (mục 5).

---

## 3. Từng phát hiện

### DB10 — Trung bình — Handler idempotent chạy ngoài transaction giữ key; timeout làm mất key mà tác dụng phụ vẫn ghi

**Chỗ lỗi:** `src/common/idempotency/idempotency.service.ts:30-82`; `src/common/idempotency/idempotency.interceptor.ts:58-65`.

**Cơ chế:**

```ts
// idempotency.service.ts
30  const transaction = prisma.$transaction(async (tx) => {
31    const [{ locked }] = await tx.$queryRawTyped(tryAdvisoryLock(key, userId, endpoint));
56          status: 'in_progress',                      // tạo dòng key trong tx (chưa commit)
68    const response = await handler();                 // handler KHÔNG nhận tx
80  }, { timeout: timeoutSeconds * 1000, maxWait: 10_000 });
82  return Promise.race([transaction, timeout]);
// idempotency.interceptor.ts:62
          const body = await firstValueFrom(next.handle());  // controller → service → this.prisma.$transaction(...) riêng
```

- Service của handler dùng `this.prisma` (client toàn cục), ví dụ `sentences.controller.ts:39`, `quick-add.service.ts:59`,
  `groups.service.ts:47`. Không có cơ chế truyền `tx` ngầm: `common/logging/request-context.ts` chỉ giữ `operation_id`.
- `@prisma/adapter-pg` 7.10.0 `startTransaction` (`dist/index.mjs:702-731`) lấy **một client riêng** từ pool (`this.client.connect()`),
  nên transaction của handler là một transaction khác, commit độc lập.
- Prisma 7.10.0 runtime (`runtime/client.mjs`): hết `timeout` thì đóng transaction với trạng thái `timed_out` và chạy ROLLBACK
  (`#f(s,"timed_out")`). Tức là ở đúng mốc `timeoutSeconds`, dòng `in_progress` bị xóa và advisory lock (khóa tự đặt theo một con số,
  sống đến hết transaction) được nhả, trong khi handler vẫn đang chạy trên connection khác.

**Vì sao sai:**

- Design Bước 0 §5, B0#2 (dòng 167): *"the handler runs inside this same transaction"*. Code không làm vậy.
- B0E8 (dòng 183) viết transaction bị bỏ *"still commits normally later"* — đúng thời Drizzle; sau khi chuyển Prisma, chính Prisma
  rollback nó ở cùng mốc timeout. Cảnh báo dòng 185 ("handler chỉ ghi DB thì rollback dọn sạch") sai, vì ghi của handler không nằm
  trong transaction đó.
- Chủ dự án chốt B0E1 (07/10): lần chạy bị gián đoạn **không chạy lại**, trả 409 `idempotency-key-abandoned`. Thực tế: không có dòng
  `in_progress` nào được commit, nên nhánh `abandoned` (`idempotency.service.ts:60-63`) không bao giờ xảy ra và lần gửi lại luôn chạy lại.
- system-spec S4 (*"no side effect is repeated"*) và S16 (*"nothing is executed twice"*).

**Hậu quả (cụ thể):** request quick add tạo từ riêng mới mất hơn 30 s. Đường thực tế nhất: pool cạn (DB11), các câu đọc **trước**
transaction của handler (`quick-add.service.ts:53-58`) phải chờ connection không giới hạn, nên transaction của handler chỉ bắt đầu sau
mốc 30 s của key (chờ lock bên trong transaction của handler chỉ gây được việc này trong một khe rất hẹp, vì transaction đó cũng có
hạn 30 s). Lúc 30 s client nhận 500; dòng key bị rollback. Ngay sau đó transaction của handler chạy và commit: entry riêng, nghĩa, mục
học, câu ngữ cảnh đã có. Client gửi lại cùng
key (đúng S15 sau lỗi tạm) → không có dòng key → chạy lại → `createPrivateSense` thấy entry đã có, tạo **nghĩa thứ hai nhãn `p2`**
(`private-words.service.ts:143-147`), thêm câu thứ hai. Nếu gửi lại lúc handler 1 còn chạy thì hai lần chạy song song (S16 hỏng).
Route khác: `POST senses/:id/sentences` thêm câu trùng; upload tạo batch thứ hai; `publish-jobs` tạo job thứ hai. Route tự chặn được
nhờ ràng buộc unique: tạo nhóm (409 trùng tên), relearn.

**Đã loại trừ:**

- *Có truyền tx ngầm cho service không?* Không: grep `AsyncLocalStorage` chỉ thấy `request-context.ts` (operation_id).
- *Prisma có rollback khi timeout không, hay transaction vẫn commit sau như B0E8 viết?* Đọc runtime 7.10.0: timer → `timed_out` →
  ROLLBACK.
- *Test hiện có đã bắt chưa?* `idempotency.interceptor.e2e-spec.ts:138-149` chỉ kiểm 500 và thời gian; handler test không ghi DB,
  không gửi lại cùng key.

**Probe đề xuất** (Vitest e2e, theo mẫu `src/common/idempotency/idempotency.interceptor.e2e-spec.ts`: `Test.createTestingModule` với
`CommonModule.forRoot(testConfig())`, `PrismaModule.forRoot({ connectionString: inject('databaseUrl') })`, `fakeRequestUserMiddleware`,
header `X-Test-User-Id`):

```ts
let calls = 0;
@Controller('probe-idem')
class ProbeController {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}
  @Post() @Idempotent({ timeoutSeconds: 0.5 }) @UseInterceptors(IdempotencyInterceptor)
  async create(@Req() req: RequestWithUser) {
    if (calls++ === 0) await new Promise((r) => setTimeout(r, 900));   // chỉ lần đầu chậm
    const now = new Date(); const name = `probe-${calls}`;
    await this.prisma.learningGroup.create({ data: { userId: req.user!.userId, name, nameKey: name, createdAt: now, updatedAt: now } });
    return { calls };
  }
}
// A: gửi lại sau khi handler 1 xong
const user = randomUUID(), key = randomUUID();
const r1 = await post(user, key);                      // kỳ vọng hiện tại: 500 (~0,5 s)
await sleep(1000);
const groupsAfterFirst = await prisma.learningGroup.count({ where: { userId: user } });   // nghi: 1
const keyRows = await prisma.idempotencyKey.count({ where: { key } });                    // nghi: 0
const r2 = await post(user, key);                      // cùng key, cùng body
// Kỳ vọng theo S4/B0#2/B0E1: handler không chạy lại (calls === 1; replay hoặc 409 abandoned), groups === 1
// Nghi thực tế: r2.status 201, calls === 2, groups === 2
// B (S16): gửi lần 2 ở t = 0,6 s (handler 1 còn ngủ) → kỳ vọng 409 "in progress"; nghi thực tế: 201 và handler chạy song song
```

**Cách sửa gợi ý:** cho handler chạy trong đúng `tx` của key (đúng B0#2; cần cơ chế truyền tx cho service), hoặc đổi sang commit
dòng `in_progress` trước khi chạy handler rồi cập nhật `succeeded` sau — dòng `in_progress` quá hạn thì trả 409 `abandoned` như B0E1.
Cách thứ hai cũng gỡ DB11.

---

### DB11 — Trung bình — Mỗi request idempotent cần 2 connection; pool 10 không có hạn chờ → kẹt khi ≥10 request đồng thời

**Chỗ lỗi:** `src/common/db/prisma.module.ts:21-22`; `src/common/idempotency/idempotency.service.ts:30,68`.

**Cơ chế:**

```ts
// prisma.module.ts:21-22 — không đặt max, không đặt connectionTimeoutMillis
const adapter = new PrismaPg({ connectionString: options.connectionString });
return new PrismaClient({ adapter });
// pg-pool 3.14.0 index.js:89
this.options.max = this.options.max || this.options.poolSize || 10
// index.js:206-208 — không có connectionTimeoutMillis thì xếp hàng chờ mãi
if (!this.options.connectionTimeoutMillis) { this._pendingQueue.push(new PendingItem(response.callback)); return result }
```

- `PrismaPg` truyền `{ connectionString }` thẳng vào `new pg.Pool(...)` (`adapter-pg dist/index.mjs:776`): bể kết nối (connection pool)
  tối đa 10, không đọc giới hạn nào từ URL.
- Request idempotent giữ connection A suốt thời gian handler (DB10); handler cần connection B cho transaction của nó (`maxWait` 5 s ở
  mọi service, ví dụ `groups.service.ts:11`) hoặc cho câu đọc ngoài transaction (chờ không hạn).

**Vì sao sai:** design im lặng về kích thước pool; kỳ vọng hợp lý là một request ghi chỉ cần một connection, và lúc đông người
request chậm đi chứ không hỏng hàng loạt. B0#2 (handler trong cùng transaction) cũng ngụ ý một connection.

**Hậu quả:** 10 request idempotent đồng thời trong một process API (ví dụ 10 người cùng bấm thêm từ, tạo nhóm, thêm câu) chiếm cả 10
connection bằng transaction A. Mọi handler chờ connection B:

- handler mở `$transaction` ngay (tạo/đổi tên nhóm, thêm câu `sentences.controller.ts:39`, lưu settings) ném P2028 sau `maxWait` 5 s
  → 500 cho cả loạt, không ghi gì;
- handler đọc ngoài transaction trước (quick add `quick-add.service.ts:53-58`, thêm mục học `items.service.ts:41-45`, relearn
  `backlog.service.ts:74`: `getProfile`, `visibleSenseIds`, `settings.get`) chờ tới khi A hết 30 s → 500, rồi vẫn chạy tiếp và commit
  → nối vào DB10 (ghi mà không có key, gửi lại chạy lần 2);
- mọi request khác của process (đọc queue, trang từ) cũng xếp hàng sau đó.

**Đã loại trừ:**

- *Pool lớn hơn nhờ tham số URL?* `prisma.module.ts` chỉ đưa `connectionString`; pool đọc `max` từ options, không từ URL;
  `.env.example` không có tham số pool.
- *Test đã chạy đồng thời đủ lớn chưa?* Lớn nhất là 5 lần `POST senses/:id/sentences` đồng thời (`test/content/sentences.e2e-spec.ts:93`)
  = 10 connection, vừa khít; chưa có test ≥ 10 request idempotent.
- *Worker có bị không?* Worker chạy BullMQ `concurrency: 1` mỗi queue (`job-runner.service.ts:48`, `reminder-queue.service.ts:64`) nên
  tối đa ~4 job × 2 connection < 10.

**Probe đề xuất** (`createTestApp()`, `seedUser`, `startSession` trong `test/support/`):

```ts
const users = await Promise.all(Array.from({ length: 12 }, () => seedUser(ctx.prisma, { verified: true, nativeLanguage: 'vi' })));
const tokens = await Promise.all(users.map(async ({ userId }) => (await startSession(ctx, userId)).accessToken));
const t0 = Date.now();
const res = await Promise.all(tokens.map((token, i) => ctx.http().post('/v1/groups')
  .set('Authorization', `Bearer ${token}`).set('Idempotency-Key', randomUUID()).send({ name: `g${i}` })));
console.log('DB11', Date.now() - t0, res.map((r) => r.status));
// Kỳ vọng: 12 × 201 trong < 1 s. Nghi thực tế: phần lớn 500 sau ≈ 5 s (P2028 từ groups.create), vài 201 sau đó.
```

**Cách sửa gợi ý:** gốc là DB10 (một connection mỗi request). Trước mắt: đặt `max` và `connectionTimeoutMillis` cho `PrismaPg`, ghi
vào checklist bước Deploy cùng giới hạn connection của Postgres được chọn.

---

### DB12 — Trung bình — Pipeline truy vấn thẳng bảng của Content (vi phạm D3)

**Chỗ lỗi:** `src/content-pipeline/import/row-processor.ts:103,105,139`; `src/content-pipeline/inflections/inflections-backfill.handler.ts:41,53`.

**Cơ chế:**

```ts
// row-processor.ts
103  const reviewed = (await tx.entry.findUniqueOrThrow({ where: { id: changes.entryId }, select: { inflectionsReviewedAt: true } }))
105  const current = (await tx.entryInflection.findMany({ where: { entryId: changes.entryId }, ...
139  const base = await tx.entry.findFirst({ where: { scope: 'catalog', language: 'en', lemma, pos }, select: { id: true } });
// inflections-backfill.handler.ts
41   const chunk = await this.prisma.entry.findMany({
43     where: { scope: 'catalog', inflectionsReviewedAt: null, inflections: { none: {} }, pos: { in: ['verb', 'noun'] }, ...
53   if (await tx.entryInflection.findFirst({ where: { entryId: entry.id }, select: { id: true } })) continue;
```

Bảng `entries`, `entry_inflections` thuộc `prisma/models/content.prisma`. Thêm ở Bước 3 (commit `6652985a`, `121be0c4`, `4aadee4f`,
`7dabf792`).

**Vì sao sai:** design Bước 2 §3 (dòng 85–89): *"chỉ code của module truy vấn bảng của module … Pipeline ghi vào catalog chỉ qua
`ContentService`"*; CLAUDE.md "Module boundaries (D3)". Ngoại lệ đã duyệt duy nhất là `visibleSenseCondition` (Content → Learning).
Review Bước 3 kết luận "D3 sạch" nhưng chỉ rà Learning, Notifications, Settings.

**Hậu quả:** chưa gây lỗi chạy (các câu đọc đều lọc `scope = 'catalog'`). Chi phí cụ thể: luật "entry nào đã duyệt dạng chia",
"từ gốc catalog theo (lemma, pos)" giờ nằm ở hai module; Content đổi cột hay luật (ví dụ thêm điều kiện cho entry riêng) thì Pipeline
lệch mà không ai thấy; muốn tách Pipeline ra service riêng phải dọn trước.

**Đã loại trừ:** *có ngoại lệ được duyệt không?* Plan Bước 3 Task 3 có grep `src/content-pipeline` để thêm bộ lọc `scope`, không cho phép
Pipeline đọc bảng Content; decision record Bước 3 không có mục nào cho phép. Quét toàn bộ accessor (mục 5): Pipeline không dùng model
Content nào khác; Learning/Notifications/Settings/common sạch.

**Probe đề xuất** (test tĩnh, chạy trong `pnpm test`): đọc mọi file `src/<module>/**/*.ts` (bỏ `*.spec.ts`), tìm
`\b(prisma|tx)\.(\w+)\.(find|create|update|upsert|delete|count|aggregate|groupBy)`, ánh xạ model → module theo file `prisma/models/*.prisma`;
kỳ vọng mọi model thuộc chính module đó. Nghi thực tế: 5 vi phạm ở hai file trên.

**Cách sửa gợi ý:** thêm hàm export của `ContentService` nhận `tx`: tìm id entry catalog theo (lemma, pos), đọc trạng thái dạng chia
(đã duyệt + bộ hiện tại), liệt kê entry cần backfill theo keyset. Thêm test tĩnh trên vào CI.

---

### DB13 — Thấp — Thiếu index trên cột khóa ngoại dùng cho xóa dây chuyền và join

**Chỗ lỗi:** `prisma/migrations/20261012120000_content/migration.sql:73-83` (bảng `senses`), `:147` (FK `replaces_sense_id` RESTRICT),
`:177-178` (hai partial index); `prisma/migrations/20261017190000_context_sentences/migration.sql:13`;
`prisma/migrations/20261007120000_identity/migration.sql:28-39, 42-53, 56-68, 102`.

**Cơ chế:** Postgres không tự tạo index cho cột khóa ngoại. Các index hiện có không dùng được cho câu cần:

- Partial index (index chỉ chứa dòng thỏa một điều kiện) chỉ được dùng khi điều kiện của câu truy vấn kéo theo điều kiện của index
  (tài liệu Postgres 17 §11.8). `senses_entry_label_live_key` có điều kiện `state <> 'retired' AND NOT (…)`; câu `WHERE entry_id = $1`
  không kéo theo được.
- Index nhiều cột chỉ thu hẹp phần quét theo cột đứng đầu (§11.3); `context_sentences (user_id, sense_id)` không giúp câu chỉ có `sense_id`.

| Cột thiếu index | Câu cần nó | Ghi chú |
|---|---|---|
| `senses.entry_id` | xóa dây chuyền khi xóa entry: xóa từ riêng (`private-words.service.ts:201`), revert batch (`content/catalog/revert.service.ts:150-151`, kèm `senses: { none: {} }`); `sense.findMany({ where: { entryId } })` (`private-words.service.ts:143,180,200`); join `senses s JOIN entries e` khi lọc theo entry (`words.service.ts:79-100` cho `wordPage`, `lookup`, `has_page`) | mỗi lần = quét toàn bảng `senses`; bảng gồm cả nghĩa riêng của mọi người học (tối đa 1.000 từ/người) |
| `senses.replaces_sense_id` | kiểm FK `ON DELETE RESTRICT` mỗi khi xóa một sense (`SELECT 1 FROM senses WHERE replaces_sense_id = $1 FOR KEY SHARE`); `_count.replacements` (`revert.service.ts:108`) | `senses_one_replacement_key` có thêm điều kiện `live_revision_id IS NULL AND state <> 'retired'` nên không dùng được |
| `context_sentences.sense_id` | xóa dây chuyền khi xóa sense | index hiện có bắt đầu bằng `user_id` |
| `refresh_tokens.chain_id` | xóa dây chuyền khi job dọn dẹp xóa chain mỗi giờ (`identity/maintenance/identity-cleanup.service.ts:29-37`) | token đã xoay không bao giờ bị tỉa: mỗi lần refresh thêm 1 dòng (`session.service.ts:182`), nên bảng lớn dần; mỗi chain bị xóa = 1 lần quét cả bảng |
| `session_chains.user_id` | `session.service.ts:61` (mỗi lần login), `:127-129` (thu hồi mọi phiên), xóa user ở Bước 8 | bảng nhỏ — nhẹ |
| `otp_codes.user_id` | `otp.service.ts:47,117,122`, xóa user | bảng được dọn mỗi ngày — nhẹ |
| `import_row_keys.batch_id` | `content-pipeline/import/revert.service.ts:47` | một lần quét mỗi revert — nhẹ |

**Vì sao sai:** design im lặng; kỳ vọng hợp lý là xóa một từ riêng hay mở một trang từ không phải quét toàn bảng nghĩa của mọi người học.
Bước 8 (xóa tài khoản) sẽ đi qua đúng các đường dây chuyền này.

**Hậu quả:** với pilot (vài nghìn nghĩa) không thấy được. Khi có ~1.000 người học × 100 từ riêng (~100k nghĩa): mỗi trang từ quét
`senses` 1 + (số dạng chia) lần; revert batch CEFR-J 7.799 entry = ~15.600 lần quét `senses`; job dọn dẹp mỗi giờ quét `refresh_tokens`
một lần cho mỗi chain bị xóa.

**Đã loại trừ:** *Prisma có tự tạo index cho quan hệ?* Không trên PostgreSQL — migration không có `CREATE INDEX` nào cho các cột này.
*Index nào khác phủ được?* Đã đối chiếu mọi `CREATE INDEX` trong 22 migration (mục 5).

**Probe đề xuất** (DB riêng qua `createIsolatedDatabase()`):

```sql
-- seed 50k entry riêng, mỗi entry 1 sense
INSERT INTO entries (id, lemma, pos, scope, owner_user_id)
  SELECT gen_random_uuid(), 'w' || g, 'noun', 'private', gen_random_uuid() FROM generate_series(1, 50000) g;
INSERT INTO senses (entry_id, state) SELECT id, 'open' FROM entries WHERE scope = 'private';
ANALYZE;
EXPLAIN SELECT 1 FROM senses WHERE entry_id = '<một id>';            -- kỳ vọng Index Scan; nghi Seq Scan
EXPLAIN ANALYZE DELETE FROM entries WHERE id = '<một id>';           -- xem "Trigger for constraint senses_entry_id_fkey: time=…"
-- refresh_tokens: 1 chain có 200k token + 1 chain khác; EXPLAIN ANALYZE DELETE FROM session_chains WHERE id = '<chain khác>'
-- kỳ vọng trigger refresh_tokens_chain_id_fkey < 1 ms; nghi hàng chục ms
```

**Cách sửa gợi ý:** một migration thêm index thường cho `senses(entry_id)`, `senses(replaces_sense_id)`, `context_sentences(sense_id)`,
`refresh_tokens(chain_id)`, `session_chains(user_id)`, `otp_codes(user_id)`; cân nhắc job tỉa token đã xoay quá hạn grace.

---

### DB14 — Thấp — Tra theo lemma không có index dùng được; giả định "~9.800 entry" của Bước 2 hết đúng

**Chỗ lỗi:** `src/content/words/words.service.ts:111` (`wordPage`: `e.lemma = ${lemma}`), `:116-117` (`has_page`: `e.lemma = i.form`
cho từng dạng chia), `:135-136` (`lookup`: `lower(e.lemma) = ${q} OR EXISTS (… lower(v.text) = ${q})`).

**Cơ chế:** index trên `entries` chỉ có `entries_catalog_key (language, lemma, pos) WHERE scope = 'catalog'` và
`entries_private_key (owner_user_id, language, lemma, pos) WHERE scope = 'private'` (`20261017160000_private_entries/migration.sql:12-13`).
Câu chỉ có `e.lemma = …` không có `language`/`scope` → không kéo theo điều kiện partial index, cột đầu không bị ràng buộc → quét tuần
tự (seq scan: đọc từng dòng của cả bảng). `lower(...)` không có index biểu thức.

**Vì sao sai:** design Bước 2 (`2026-10-12-buoc-2-content-pipeline-design.md` dòng 365-366, 594) hoãn index tìm kiếm vì "~9.800 entry nên quét tuần tự vẫn nhỏ (ASSUMPTION)";
`learner-content.service.ts:115` nhắc lại. Từ Bước 3, từ riêng của mọi người học nằm chung `entries` (tối đa 1.000 từ/người), nên số
dòng không còn bị chặn ở ~9.800.

**Hậu quả:** mỗi lần mở trang từ: 1 + (số dạng chia, thường 4–5) lần quét `entries` và `senses` (DB13). Màn thêm nhanh gọi `GET /v1/lookup` (`words.controller.ts:23-25`), mỗi lần
quét `entries` và dò `entry_variants` cho từng entry. Pilot không thấy; tăng tuyến tính theo tổng số từ riêng.

**Đã loại trừ:** *Planner có dùng partial index nhờ tham số?* Không — câu không chứa điều kiện `scope`/`language` nào. *Cố ý bỏ?*
Quyết định hoãn chỉ nói về tìm kiếm `ILIKE` của Bước 2, với số dòng cố định; `wordPage`/`lookup` là Bước 3.

**Probe đề xuất:** cùng seed 50k entry riêng như DB13, `ANALYZE`, rồi `EXPLAIN` đúng SQL của `WordsService.senses()` với
`e.lemma = 'bank'` → kỳ vọng Index Scan trên `entries`; nghi Seq Scan trên `entries` và `senses`. Đo `GET /v1/words/bank` trước/sau seed.

**Cách sửa gợi ý:** thêm `e.language = 'en'` và tách nhánh `scope = 'catalog'` / `scope = 'private' AND owner_user_id = viewer` để dùng hai
partial index sẵn có; hoặc thêm index `(lemma)` và index biểu thức `lower(lemma)`, `lower(entry_variants.text)`. Đo trước khi chọn.

---

### DB15 — Thấp — `page_token` tự chế làm cast SQL lỗi → 500 thay vì 400

**Chỗ lỗi:** `src/learning/backlog/backlog.service.ts:44-46`.

**Cơ chế:**

```ts
44  if (!cursor || typeof cursor.due !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(cursor.due)
45    || typeof cursor.id !== 'string' || !/^[0-9a-f-]{36}$/.test(cursor.id)) throw invalidInput();
46  after = Prisma.sql`AND (i.due_date, i.id) > (${cursor.due}::date, ${cursor.id}::uuid)`;
```

Token chỉ là JSON base64url, không ký (`common/pagination/page-token.util.ts:21-23`), client tự tạo được. `2026-02-30` và 36 dấu `-` qua
regex; Postgres từ chối `'2026-02-30'::date` và `'----…'::uuid` → lỗi DB → `ProblemDetailsFilter` trả 500.

Cùng kiểu, không qua raw SQL: `learning/items/items.service.ts:138-141` (`cursor.id` không kiểm uuid, dùng trong lọc cột uuid);
`settings/settings.service.ts:87-88` (regex như trên rồi `findUnique` theo uuid).

**Vì sao sai:** system-spec S3 / Bước 0 §4: *"`page_token` hỏng → 400, không bao giờ 500"*.

**Hậu quả:** chỉ chính người gửi token giả nhận 500 và một dòng log lỗi; không lộ dữ liệu.

**Đã loại trừ:** *Token có bị ràng buộc theo nhóm?* Có (`binding`), nhưng người học biết id nhóm của mình nên vẫn tự tạo được token
hợp lệ về binding.

**Probe đề xuất:** learner + nhóm (`POST /v1/groups`), rồi
`GET /v1/groups/:id/backlog?page_token=` + base64url của `{"binding":"<groupId>","payload":{"due":"2026-02-30","id":"<uuid>"}}`
→ kỳ vọng 400 `validation-failed`; nghi 500. Lặp với `id = '-'.repeat(36)`.

**Cách sửa gợi ý:** kiểm `cursor.id` bằng `z.uuid()` và kiểm ngày bằng vòng `dateString(dateValue(due)) === due` trước khi đưa vào SQL.

---

### DB16 — Thấp — `Idempotency-Key` không giới hạn độ dài

**Chỗ lỗi:** `src/common/idempotency/idempotency.interceptor.ts:39` (chỉ kiểm chuỗi khác rỗng); index unique
`idempotency_keys_key_user_id_endpoint_key` (`prisma/migrations/20261006070840_init/migration.sql:22`).

**Cơ chế:** tài liệu Postgres 17 §64.1.1: một mục index B-tree không được quá khoảng 1/3 trang (~2,7 KB, sau nén). Header của Node cho
tới ~16 KB. Key ngẫu nhiên vài KB → `INSERT` dòng `in_progress` lỗi → 500.

**Vì sao sai:** lỗi do client gây ra phải là 4xx (Problem Details); design Bước 2.5 (`2026-10-14-buoc-2-5-admin-web-design.md` dòng 232) chỉ dùng UUID cho key, nên giới hạn ngắn không
hại client nào.

**Hậu quả:** 500 cho chính người gửi; không ảnh hưởng người khác.

**Đã loại trừ:** *Nén có cứu được không?* Chỉ với chuỗi lặp; key ngẫu nhiên base64url không nén đủ.

**Probe đề xuất:** `POST /v1/groups` với `Idempotency-Key: randomBytes(4000).toString('base64url')` → kỳ vọng 400; nghi 500, log
"index row size … exceeds btree version 4 maximum 2704".

**Cách sửa gợi ý:** từ chối key dài hơn ~255 ký tự (hoặc không phải UUID) bằng 400 ngay trong interceptor.

---

### DB17 — Thấp — Vệ sinh CI/CD

**Chỗ lỗi:** `.github/workflows/ci.yml:37-46` (và các job khác), `:184-185`; `.github/workflows/deploy-web.yml:12, 23, 34-43`.

**Cơ chế và hậu quả:**

- Action pin theo tag lớn (`actions/checkout@v4`, `pnpm/action-setup@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`), không
  theo SHA. Job deploy giữ `CLOUDFLARE_API_TOKEN`; một tag bên thứ ba bị dời có thể chạy code lạ trong job đó (rủi ro chuỗi cung ứng).
- Image service trôi: `axllent/mailpit` không có tag (= latest), `postgres:17`, `redis:7.4-alpine` → CI có thể đổi hành vi mà repo không
  đổi dòng nào.
- Không khai báo `permissions:` → `GITHUB_TOKEN` theo mặc định của repo (có thể có quyền ghi) trong job chạy code của PR.
- `deploy-web.yml:12` có `workflow_dispatch`: chạy tay từ **bất kỳ nhánh nào** sẽ deploy nhánh đó lên `wordmet.com`, trừ khi environment
  `deploy-env` giới hạn nhánh (không kiểm được từ repo). Đây là mức tệ hơn ghi chú "deploy không chờ CI" trong CLAUDE.md.
- Không có bước nào chặn sửa một migration đã merge (DB mới trong CI luôn chạy được bản đã sửa; DB thật thì không).

**Vì sao sai:** design im lặng; thực hành chuẩn của GitHub cho workflow có secret.

**Đã loại trừ:** không có `pull_request_target`, không có `continue-on-error`, `if:` chỉ dùng cho bước in log khi lỗi (`ci.yml:256-270`);
secret của CI sinh mới mỗi lần chạy (`ci.yml:204-233`).

**Cách sửa gợi ý:** pin action theo SHA, pin image theo phiên bản, thêm `permissions: contents: read`, giới hạn `deploy-env` chỉ nhánh
`main` (GitHub settings); thêm bước CI so file migration với nhánh đích (file đã có thì không được đổi).

---

### DB18 — Thấp — Mẫu migration đổi CHECK và tạo index sẽ khóa bảng lớn sau khi deploy

**Chỗ lỗi:** `prisma/migrations/20261018100000_learning_backlog_section/migration.sql:2-3`; `prisma/migrations/20261018130000_form_of_unlink/migration.sql:2`;
cùng mẫu ở `20261017180000_private_words`, `20261017200000_inflection_row_keys`, `20261017230000_inflections_queue`.

**Cơ chế:**

```sql
ALTER TABLE "learning_log" DROP CONSTRAINT "learning_log_section_check";
ALTER TABLE "learning_log" ADD CONSTRAINT "learning_log_section_check" CHECK ("section" IN ('priority', 'due', 'new', 'backlog', 'early'));
CREATE INDEX "sense_revisions_form_of_entry_id_idx" ON "sense_revisions"("form_of_entry_id");
```

Tài liệu Postgres 17 (ALTER TABLE, Notes): `ADD CONSTRAINT` quét cả bảng để kiểm dòng cũ và giữ khóa `ACCESS EXCLUSIVE` tới khi commit;
`NOT VALID` + `VALIDATE CONSTRAINT` (khóa `SHARE UPDATE EXCLUSIVE`) tránh việc chặn ghi. `CREATE INDEX` không `CONCURRENTLY` chặn ghi
suốt lúc tạo.

**Vì sao sai:** design im lặng; kỳ vọng hợp lý là deploy không làm treo việc ôn bài. `learning_log` chỉ thêm, không bao giờ xóa (K14),
mỗi lần ôn thêm một dòng.

**Hậu quả:** hôm nay vô hại (chưa có DB thật). Sau khi deploy, mỗi lần đổi danh sách giá trị như trên sẽ chặn mọi `POST` ôn bài trong lúc
quét cả `learning_log`. PR #50 (ngoài snapshot) đã thêm một CHECK nữa trên `learning_log` theo đúng mẫu này.

**Đã loại trừ:** *Prisma có tự dùng `NOT VALID`?* Không — các CHECK này viết tay trong migration.

**Cách sửa gợi ý:** quy ước cho migration sau deploy: CHECK mới dùng `NOT VALID` rồi `VALIDATE CONSTRAINT` ở migration riêng; index trên
bảng lớn dùng `CREATE INDEX CONCURRENTLY` ở migration chỉ có một câu đó. Ghi vào checklist bước Deploy.

---

### DB19 — Thấp — Cột mảng cho phép NULL, code coi là luôn có

**Chỗ lỗi:** `prisma/migrations/20261012120000_content/migration.sql:96-98` (`examples`, `topic_codes`, `accepted_forms` là
`TEXT[] DEFAULT …`, không `NOT NULL`); `prisma/migrations/20261012180000_pipeline/migration.sql:51` (`error_codes`). So sánh
`20261012190000_import_row_outcome_messages/migration.sql:2`: `error_messages` lại có `NOT NULL`.

**Cơ chế:** Prisma khai báo `String[] @default([])` (kiểu TypeScript `string[]`, không null). Drift test xanh với cả hai dạng (cột có và
không có `NOT NULL`), tức `migrate diff` không so tính nullable của cột mảng. Raw SQL đọc thẳng: `practice-senses.ts:73`
(`...row.accepted_forms`) sẽ ném lỗi nếu gặp NULL; `private-words.service.ts:62` đưa vào `contentHash`.

**Vì sao sai:** ràng buộc mà code dựa vào (luôn là mảng) không có ở DB; hai cột cùng loại trong cùng bảng lại khác nhau.

**Hậu quả:** hôm nay không có đường ghi nào tạo NULL (mọi ghi qua Prisma; không có `INSERT` raw vào hai bảng này trong `src/`). Rủi ro
chỉ đến từ SQL tay/migration dữ liệu sau này.

**Đã loại trừ:** đã grep mọi raw `INSERT` trong `src/` (chỉ `entries`, `entry_variants`, `mail_budget_buckets`).

**Cách sửa gợi ý:** migration `ALTER COLUMN … SET NOT NULL` cho 4 cột (sau khi kiểm không có NULL); thêm test đọc
`information_schema.columns` khẳng định mọi cột `ARRAY` là `NOT NULL`.

---

## 4. Test gaps (chỉ cái quan trọng)

- **T1 (DB10):** không test nào cho handler idempotent **có ghi DB** bị quá hạn rồi gửi lại cùng key (S4/S16). Test timeout hiện có
  (`idempotency.interceptor.e2e-spec.ts:138-149`) chỉ kiểm 500.
- **T2 (DB11):** không test nào chạy ≥ 10 request idempotent đồng thời (lớn nhất là 5, `test/content/sentences.e2e-spec.ts:93`).
- **T3 (D3, DB12):** ranh giới module không có kiểm tự động; vi phạm lọt qua review Bước 3. Test tĩnh ở probe DB12 chặn được.
- **T4 (drift):** `schema-drift.e2e-spec.ts` không thấy CHECK, partial index, trigger, nullable của mảng. Phần lớn CHECK có test riêng
  (`test/content/schema.e2e-spec.ts:169-213`, `test/pipeline/schema.e2e-spec.ts:36-86`), nhưng chưa có test khẳng định tập giá trị của
  `learning_log_answer_check`, `learning_log_rating_check`, `learning_log_section_check`, `reminder_deliveries_kind/state_check`,
  `entry_inflections_kind/source_check`, `sense_revisions_form_kind_check` bằng đúng hằng số TypeScript. Một migration `DROP`+`ADD` gõ
  thiếu giá trị chỉ lộ khi luồng ghi giá trị đó có e2e.
- **T5 (B0E5):** migration chỉ chạy trên DB rỗng (Testcontainers, service CI). Hai migration có backfill dữ liệu
  (`20261018090000_users_last_seen_at`, `20261018120000_inflections_reviewed`) chưa từng chạy trên DB có dữ liệu.

---

## 5. Đã kiểm, không thấy vấn đề

**Drift schema ↔ migration**
- Drift test tồn tại và CI chạy nó: `test/common/schema-drift.e2e-spec.ts:5-15` (`prisma migrate diff --from-config-datasource --to-schema prisma --exit-code`),
  nằm trong `pnpm test:e2e` (`vitest.config.e2e.ts` include `**/*.e2e-spec.ts`; `ci.yml:66-67`). Không test nào đổi schema DB chung
  (grep `CREATE TABLE|ALTER TABLE|DROP` trong test: không có).
- Đối chiếu tay: kiểu `VARCHAR(254/100/60)`, `timestamptz` cho mọi `DateTime` (không có `timestamp` thiếu múi giờ), `@db.Date` cho
  `due_date`/`local_date`, mặc định, hành động `ON DELETE` của mọi FK, index Prisma-quản lý (`background_jobs_queue_status_lease_expires_at_idx`
  trùng tên với bản viết tay — `pipeline.prisma:20-22`, migration `:110`) khớp giữa model và migration.

**CHECK ↔ hằng số TypeScript** (khớp đủ cả hai chiều)
- `entries_pos_check` = `VALID_POS` (`content.constants.ts:4-8`) + `'unspecified'` chỉ cho `private` (`20261017180000_private_words:4-8`, test
  `private-words.e2e-spec.ts:135`); `entry_levels` level = `LEVELS`, basis `imported/editorial/user/derived` (`levels.service.ts:33,63,74,77`,
  `private-words.service.ts:94`); `draft_source` `csv/ui/user`; `senses.state`, `sense_revisions.status`; `entry_inflections.kind` và
  `form_kind` = `INFLECTION_KINDS` (`content.constants.ts:24-26`); source `library/reviewed`.
- `learning_items_level_check 0..5` = `MAX_LEVEL` (`learning.constants.ts:3`); `learning_log` kind/answer/rating/section = `Answer`,
  `Section` (`schedule.ts:9-11`), có `backlog` (`20261018100000:3`).
- `reminder_deliveries` kind/state = giá trị ghi ở `reminder-send.service.ts:57-89`; `background_jobs` queue/status, `import_row_outcomes`,
  `import_row_keys` (`level/content`; `inflection` còn được phép nhưng không còn ghi — sau sửa H1, `prefilter.ts:98-103`), `batch_records`
  (`batch-records.ts:5`), `publish_job_items` (`publish.service.ts:10-11,97`, `publish-job.handler.ts:39`).
- Identity không có CHECK cho `staff_role`, `status`, `client_type`, `purpose`: design Bước 1 §3 im lặng; `permission.guard.ts:33-35`
  từ chối mọi role lạ (đóng an toàn), nên không coi là lỗi.

**Unique mà code dựa vào cho idempotent/đua**
- `ON CONFLICT (language, lemma, pos) WHERE scope = 'catalog'` khớp `entries_catalog_key` (`entries.service.ts:46-49`; migration `:12`);
  `entry_variants (entry_id, text)` (`entries.service.ts:55-58`); `mail_budget_buckets (bucket)` có `WHERE sent < limit` nguyên tử
  (`mail-budget.service.ts:57-61`); `otp_failure_windows (user_id, purpose)` (`recordOtpFailure.sql:4-6`).
- `createMany/createManyAndReturn({ skipDuplicates })` đều có unique tương ứng: `learning_items (user_id, sense_id)` (`items.service.ts:173-181`),
  `group_items` PK, `entry_levels`, `import_row_outcomes` PK, `import_row_keys`.
- P2002 được bắt và đổi đúng nghĩa: `learning_log_user_review_key` (`reviews.service.ts:74-79`), `reminder_deliveries (user_id, local_date)`
  (`reminder-send.service.ts:57-61`), `learning_groups (user_id, name_key)` (`groups.service.ts:58-59`), `app_settings` PK (version conflict).

**FK `ON DELETE` ↔ luồng xóa**
- Xóa từ riêng: một transaction, khóa learner → owner, xóa entry dây chuyền xuống sense/revision/text/level/variant/inflection/câu,
  rồi Learning xóa item/log theo `sense_id` (`quick-add.service.ts:84-91`, `private-words.service.ts:197-203`).
- Revert batch: xóa sense lá trước vì `replaces_sense_id` là RESTRICT (`content/catalog/revert.service.ts:117-127`); chỉ xóa sense chưa
  từng publish nên không có câu/mục học của người học trỏ vào.
- Trigger L7 `entries_clear_form_kind` (`20261018130000_form_of_unlink:6-14`): `BEFORE DELETE … FOR EACH ROW` chỉ sửa `sense_revisions`,
  có index `form_of_entry_id`; không sửa chính bảng `entries` nên không gây lỗi "tuple already modified"; có test
  (`private-words.e2e-spec.ts:219`).
- Dọn session: chain → refresh token dây chuyền (`identity/migration:102`); chỉ chậm khi bảng lớn (DB13).
- Bước 8 (xóa tài khoản): theo D3 không có FK chéo module, nên Content (entry riêng, câu), Learning, Notifications, `idempotency_keys`,
  `rate_limit_counters` phải tự xóa — đúng thiết kế, cần ghi vào design Bước 8.

**Index cho câu nóng (có index dùng được)**
- Idempotency `(key, user_id, endpoint)`; reconciler `(queue, status, lease_expires_at)`; tick nhắc học `reminder_deliveries (user_id, local_date)`
  + `reminder_prefs` PK + `users` PK; trần ôn `learning_log (user_id, group_id, local_date)`; `review_id` partial unique (điều kiện
  `review_id IS NOT NULL` được suy ra từ `review_id = $n`); `group_items` PK và `(item_id)`; `entry_inflections (form_key)`;
  `sense_revisions` GIN `topic_codes` (lọc `has`); prefilter dùng unique `(kind, source_id, row_key, …)`.
- Tìm kiếm `ILIKE '%q%'` không có index: cố ý theo design Bước 2 (đo trước) — xem DB14 cho phần đã đổi giả định.

**Raw SQL**
- Không nối chuỗi vào SQL: mọi câu dùng tagged template; `Prisma.join` chỉ với dấu nối hằng (`queue.queries.ts:22-24`,
  `private-words.service.ts:239`, `words.service.ts:181`, `learner-content.service.ts:135`); `visibleSenseCondition` nhận cột là
  `Prisma.sql` hằng (`visible-senses.ts:9-15`).
- Thời gian: không có `now()`/`CURRENT_DATE`/`date_trunc` trong SQL lúc chạy; "hôm nay" tính bằng `localDate(timezone, clock.now())`
  (`common/time/local-date.ts:20-23`) rồi truyền `::date` (`queue.queries.ts:27,78-95`, `backlog.service.ts:52`); `date` đọc về dạng chuỗi
  (`adapter-pg normalize_date`), không lệch múi giờ server.
- `ORDER BY` có khóa phụ duy nhất ở mọi chỗ có `LIMIT`/keyset: `queue.queries.ts:79,83,85`, `backlog.service.ts:54`,
  `words.service.ts:99-100,189`, `learner-content.service.ts:138,156`, `private-words.service.ts:240`, `levels.service.ts:49-54`,
  `inflections-backfill.handler.ts:45`.

**Transaction và lock**
- Không gian khóa advisory: idempotency dùng `hashtext` 32 bit (`tryAdvisoryLock.sql:5`), các chỗ khác `hashtextextended` 64 bit có tiền
  tố riêng (`learning.user:`, `identity.user:`, `content.entry:`, `content.private:`, `content.sentences:`, `identity.staff_role`); trùng
  ngẫu nhiên chỉ gây 409/chờ thừa với xác suất không đáng kể. `pg_try_advisory_xact_lock` trả `false` → 409 kèm `Retry-After: 2`
  (`idempotency.service.ts:31-34`, `idempotency.interceptor.ts:67-73`), không đọc/ghi gì thêm (B0#1).
- Thứ tự khóa không tạo vòng: learner → owner → câu (`quick-add.service.ts:60-75`) và learner → owner (`:86-87`); `lockItems` khóa theo
  thứ tự id (`learning-lock.ts:12-16`); review chỉ khóa một dòng item (`reviews.service.ts:39-40`); job row `FOR SHARE` trước khóa entry
  (`background-jobs.service.ts:29-44`, `row-processor.ts:169`); backfill giữ tới 500 khóa entry theo thứ tự id trong một transaction
  (`inflections-backfill.handler.ts:48-56`) và không transaction nào khác giữ ≥ 2 khóa entry.
- Không giữ transaction qua gọi mạng: gửi nhắc học (`reminder-send.service.ts:57-89`), thư OTP sau commit (`otp.service.ts:73-84`),
  enqueue BullMQ sau commit với `commandTimeout` 2 s (`uploads.service.ts:76-95`, `job-queue.service.ts:8,22-28`), reconciler
  (`job-reconciler.service.ts:34-66`). Ngoại lệ duy nhất là transaction giữ key idempotency (DB10/DB11).
- Isolation mặc định READ COMMITTED + khóa/CAS; một snapshot `RepeatableRead` chỉ đọc (`admin-catalog.queries.ts:271-292`).
- `publish-job.handler.ts:42-55`: `publishItem` commit riêng rồi mới ghi kết quả item — có chủ đích, `publishItem` idempotent khi chạy lại.

**Ranh giới D3** (ngoài DB12)
- Bảng accessor theo thư mục: common → `idempotencyKey`, `rateLimitCounter`, `mailBudgetBucket`; identity → 6 model Identity; content →
  model Content; content-pipeline → model Pipeline (+ 2 vi phạm DB12); learning → 4 model Learning; notifications → 2; settings → 2;
  entitlements → không truy vấn DB.
- Không `@relation` nào xuyên module (7 file model); `src/common/**` không import module nghiệp vụ nào; SQL của Learning chỉ chạm bảng
  Content qua `visibleSenseCondition` (`queue.queries.ts:35,74`, `backlog.service.ts:53`) — ngoại lệ đã duyệt.

**Migration an toàn trên DB có dữ liệu**
- Mọi `ADD COLUMN … NOT NULL` đều có `DEFAULT`; mọi CHECK thay thế là tập lớn hơn tập cũ; unique cũ của `entries` được thay bằng partial
  unique trong cùng file; backfill có giới hạn (`20261018090000:4-6`, `20261018120000:5-6`). Lệnh xóa dữ liệu duy nhất là
  `DROP TABLE rate_limit_counters` (Bước 1, bộ đếm tạm, đã ghi trong design Bước 1 §3).

**CI**
- PR chạy đủ: API lint, typecheck, build, unit, e2e, scale; web lint, typecheck, unit, e2e, static; admin lint, typecheck, unit, build,
  mocked e2e; admin real-stack e2e (`ci.yml:13-270`). Không `pull_request_target`, không `continue-on-error`. Test bị skip chỉ là skip
  theo viewport và `visual.spec.ts` khi không có `VISUAL=1` — có chủ đích.

**Vệ sinh repo và script**
- Không có `.env`, khóa, token nào được commit (`git ls-files` + `git grep` theo mẫu khóa phổ biến); `.gitignore` phủ `.env*` (trừ
  `.env.example`), `*.pem`, `*.key`, client Prisma sinh ra, `e2e-real/.state.json`.
- `docker-compose.yml:9,16-17,24` chỉ mở cổng trên `127.0.0.1`.
- `apps/api/scripts/*` không có lệnh xóa DB. `smoke-buoc-2.mjs` tạo một admin đã xác thực với mật khẩu cố định trong repo trên DB mà nó trỏ
  tới; email có 32 bit ngẫu nhiên nên khó đoán. Nên chặn chạy khi `SMOKE_BASE_URL` không phải localhost trước bước Deploy.

---

## 6. Declined to judge / Ngoài phạm vi

**Declined to judge**
- Có cho Pipeline đọc thẳng bảng Content (biến DB12 thành ngoại lệ được duyệt) hay không: quyết định của chủ dự án.
- Index tìm kiếm `ILIKE`: design Bước 2 cố ý hoãn tới khi đo.
- Các gap nghiệp vụ DB1–DB3 (`2026-10-17-db-schema-business-review.md`): không báo lại.

**Ngoài phạm vi** (mỗi mục một dòng)
- Common/idempotency: không đường nào ghi `failed_permanent`, nên lỗi vĩnh viễn (4xx) không được lưu và gửi lại sẽ chạy lại — SR8 nói
  phải trả đúng kết quả đã lưu.
- Common/idempotency: `setTimeout` trong `runIdempotent` (`idempotency.service.ts:26-28`) không bao giờ bị hủy — mỗi request giữ một timer
  30 s.
- PR #50 (ngoài snapshot, đã ở `dev`) thêm `learning_log.origin` + CHECK theo đúng mẫu của DB18.
- Cây làm việc chính có `.verify-b25-accounts.md` và `.sync-backup-2026-10-18/` chưa track và không bị ignore; nên kiểm nội dung trước bất
  kỳ `git add -A` nào.
- Bước 8 cần danh sách xóa theo từng module (mục 5, FK ↔ luồng xóa).

---

## 7. Chưa kiểm

- Không chạy probe nào; mọi mục SUSPECTED cần coordinator chạy trên Postgres/Redis thật. Chưa có `EXPLAIN` thật cho DB13/DB14.
- Chưa kiểm hành vi `prisma migrate deploy` khi một migration đã áp dụng bị sửa (checksum).
- Không đọc migration D1 của `apps/web` và code `apps/admin`.
- Không đọc Practice của Bước 4 sau snapshot (PR #50 trở đi).
