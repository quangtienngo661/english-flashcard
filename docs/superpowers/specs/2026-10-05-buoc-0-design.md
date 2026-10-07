# Design — Bước 0: nền backend

Ngày: 05/10/2026. Phạm vi: HANDOFF §4–5 (`../../HANDOFF_2026-10-05_BUOC_0.md`). Brainstorm qua skill
`superpowers:brainstorming`, 4 câu hỏi hỏi từng câu một trong chat, chủ dự án đã chốt cả 4. File này gộp lại
thành một design doc để tự soát và để bạn duyệt trước `writing-plans`.

**Cách đọc nhãn:** **Chốt** = chủ dự án đã chọn trong phiên này. **Đề xuất** = trợ lý đề xuất, kèm lý do,
chủ dự án đã đồng ý khi chốt câu tương ứng. **ASSUMPTION** = chưa kiểm chứng bằng cách chạy thật, chỉ dựa
trên đọc docs/source. Mục Acceptance criteria/Edge cases dùng số hiệu riêng `B0#`/`B0E#` (quy ước đặt tên
theo `docs/specs/SPEC_WRITING_CONVENTIONS.md`), trích ngược về `S#`/`SR#`/`SE#` của system-spec khi có.

## 1. Mục tiêu và tiêu chí xong

Từ HANDOFF §4: dựng nền để bước 1–8 cắm vào mà không phải sửa quy ước chung. **Xong khi** có một endpoint
mẫu chạy đủ các quy ước dưới đây, và test chạy được trên Postgres thật bằng **một lệnh**.

## 2. Bốn quyết định đã chốt (05/10/2026)

### 2.1 Repo layout — Chốt: (a) một repo, pnpm workspace

- `apps/api` (NestJS) bắt đầu ở bước 0; `apps/web` (Next.js) vào ở bước 3; `apps/mobile` (Flutter) **ngoài**
  pnpm workspace (không phải JS/TS, tự quản bằng `pub`).
- `packages/*` để trống ở bước 0 — chỗ chứa code share (vd DTO/type chung api↔web) khi cần.
- `docs/` giữ nguyên ở gốc.
- **Không dùng Nx/Turborepo** ở bước 0 — chỉ có một package (`apps/api`), chưa có gì để cache/chạy song
  song (YAGNI). pnpm bản mới (≥12.4, máy đang ở 11.6.0 nên chưa có) có `pnpm pipeline` native nếu cần task
  caching sau này, trước khi xét Turborepo/Nx.
- **`git init` đã chạy** ở gốc `english-learning/` trong phiên này (xác nhận: `.git/` tồn tại, chưa có
  commit nào).

### 2.2 ORM / DB access — Chốt lúc đầu: Drizzle ORM, pin `0.45.x`

> **Thay đổi 06/10/2026: đã chuyển sang Prisma ORM** (pin `7.10.0`), sau khi user tự research lại thấy
> Prisma type-safe mạnh hơn tưởng, và lý do loại Prisma ban đầu (không lock được) hóa ra chỉ áp dụng cho
> thiết kế lock cũ (`FOR UPDATE SKIP LOCKED`) — thiết kế lock hiện tại (mục 5, `pg_try_advisory_xact_lock`)
> không bị gap đó, và Prisma TypedSQL đủ type-safe cho đúng 1 dòng raw SQL cần. Toàn bộ lý do/so sánh dưới
> đây giữ nguyên làm lịch sử quyết định (tại sao Drizzle được chọn lúc đó), không còn phản ánh code hiện
> tại. Xem `docs/superpowers/plans/2026-10-06-migrate-drizzle-to-prisma.md` cho lý do chuyển và toàn bộ
> quá trình migrate (6 task, review hai vòng bởi Codex gpt-6-astra).

- Cần cho SR8 (idempotency), ER5 (sổ lượt AI usage): row locking `FOR UPDATE SKIP LOCKED`. Xác nhận bằng
  cách đọc trực tiếp source `drizzle-orm` tag `0.45.3` (không chỉ docs tóm tắt) —
  `drizzle-orm/src/pg-core/query-builders/select.types.ts` có `LockConfig` với `skipLocked`/`noWait`, và
  test chính thức (`integration-tests/tests/pg/pg-common.ts`) xác nhận sinh đúng SQL
  `for update of "table" skip locked`.
- So với Kysely (cũng native, locking ngang nhau): Drizzle thắng vì có `drizzle-kit` tự diff schema →
  migration (Kysely phải viết tay), cộng đồng/đà tải lớn hơn Prisma giữa 2026 (npmtrends).
- Prisma bị loại: không có `FOR UPDATE`/`SKIP LOCKED` trong query builder hay typed SQL builder — xác nhận
  qua issue đang mở của chính Prisma team (`prisma/orm#30531`, PR thiết kế `#30542`, chưa merge) — phải
  dùng `$queryRaw` (mất type safety) đúng ở hai bảng rủi ro cao nhất hệ thống (idempotency key, usage
  ledger).
- TypeORM/MikroORM: cũng native locking, nhưng nặng hơn (entity/decorator, Unit-of-Work) và không cần
  thiết cho nhu cầu thực của 7 module; TypeORM còn bị nguồn 2026 gọi là "phần lớn coi là legacy" trong hệ
  sinh thái TS.
- **Rủi ro đã biết, có giảm thiểu:** Drizzle đang giữa đợt viết lại lớn hướng tới v1.0 (xác nhận từ chính
  Drizzle team, GitHub issue #4275, bình luận 30/08/2025: viết lại `drizzle-kit`, viết lại hệ type,
  "breaking changes" được báo trước). `v1.0.0-rc.4` (27/06/2026) vẫn chưa GA tính đến 05/10/2026, bản
  stable mới nhất là `0.45.3`. Giảm thiểu: **pin cứng `drizzle-orm@0.45.x`** trong `package.json` (không
  dùng `^`), chỉ nâng lên 1.0 sau khi đọc changelog và nâng cấp có chủ đích.
- **Đề xuất — quy ước ranh giới module** (nêu trong lúc bàn câu 2.2, chưa hỏi riêng thành một câu, chủ dự
  án không phản đối khi chốt Drizzle): mỗi module Nest có một thư mục schema + query riêng (vd
  `apps/api/src/<module>/db/`); không module nào import schema của module khác — giữ đúng "Bản đồ ghi dữ
  liệu" trong system-spec. Đây là quy ước code, không phải tính năng của Drizzle, nhưng là điều kiện để
  tách module ra service sau này (nếu cần) không phải dọn dẹp vi phạm ranh giới trước. Nên hỏi lại tường
  minh trước khi đưa vào plan, vì chưa thật sự được chốt riêng.

### 2.3 Test strategy — Chốt: Vitest + ESM cho `apps/api`; Testcontainers cho DB test

- **Sửa lại một giả định của HANDOFF §5.3:** HANDOFF ghi "Jest (mặc định của Nest)" nhưng đó là
  `ASSUMPTION` chưa kiểm. Đọc docs NestJS hiện hành (context7, `nestjs/docs.nestjs.com`): `nest new` hiện
  hỏi ESM hay CommonJS; **ESM** (mặc định khi chạy non-interactive, vd CI) → scaffold dùng **Vitest**;
  CommonJS mới ra Jest — Jest giờ là nhánh cũ, không còn mặc định. NestJS có recipe chính thức
  (`docs.nestjs.com/recipes/swc`) cấu hình Vitest + `unplugin-swc` để đảm bảo `emitDecoratorMetadata` hoạt
  động đúng cho DI của Nest.
- **Hệ quả rộng hơn câu hỏi gốc:** chọn Vitest kéo theo chọn **ESM** làm module system cho toàn bộ
  `apps/api` (không chỉ chọn test runner) — chủ dự án đã xác nhận hướng này.
- **DB test dùng Postgres thật qua Testcontainers** (`@testcontainers/postgresql`, class
  `PostgreSqlContainer`), không dùng mock, không tự `docker compose up` tay. Lý do giữ nguyên từ HANDOFF:
  S4, S5, S15, S16 phụ thuộc hành vi khóa/unique thật của Postgres — mock chứng minh sai thứ. Testcontainers
  tự khởi/tắt container trong chính tiến trình test (Vitest `globalSetup` + `inject()`, xác nhận có doc
  chính thức) — khớp tiêu chí "chạy test bằng một lệnh" ở mục 1.

### 2.4 Ranh giới bước 0 / bước 1 — Chốt: seam `RequestUser`

- Idempotency (SR8) và rate limit (SR14) gắn theo user, nhưng user thật (JWT) chỉ có từ bước 1 (Identity).
- Bước 0 định nghĩa một seam `RequestUser` (interface + bản giả cho test, vd middleware gắn `userId` test
  vào request hoặc đọc từ header test). Bước 1 thay implementation bằng JWT thật; code ở module khác gọi
  `RequestUser` không cần sửa.
- **Trong phạm vi bước 0 (test trên seam):** S1–S5 (Problem Details, pagination, idempotency cơ bản), S13
  (log có `operation_id`), S15–S16 (idempotency: lỗi tạm thì giải phóng key, đang chạy thì 409), SE2
  (idempotency key hết hạn retention), SR14 (rate limit theo user).
- **Để bước 1+:** S6–S10 (phân quyền theo chủ sở hữu thật, native language, xóa tài khoản...), S17 (chặn
  request khi tài khoản "đang xóa"), SE5 (language tag) — cần user thật mới có ý nghĩa.

## 3. Cấu trúc thư mục (bước 0)

```
english-learning/
├── pnpm-workspace.yaml      # packages: "apps/*", "packages/*"
├── package.json             # root, private:true, devDependencies dùng chung
├── pnpm-lock.yaml
├── apps/
│   └── api/                 # NestJS, ESM — toàn bộ việc bước 0 nằm ở đây
│       ├── package.json
│       ├── src/
│       │   └── <module>/db/ # mỗi module Nest: schema + query Drizzle riêng, không import chéo module
│       ├── vitest.config.ts
│       ├── vitest.config.e2e.ts
│       └── test/
├── packages/                 # trống ở bước 0
├── docs/
└── (apps/mobile/ sau này — Flutter, ngoài pnpm workspace)
```

## 4. Quy ước xuyên suốt cần dựng (đã chốt ở system-spec, bước 0 hiện thực hóa)

Trích nguyên văn SR#/S# từ `../../specs/system-spec.md` — đây không phải quyết định mới, chỉ là phần bước 0
phải dựng để các bước sau cắm vào:

- **ID (SR2):** UUID mờ cho mọi định danh (user ID, sense ID, operation ID...), không suy ra từ nội dung,
  không lộ thứ tự.
- **API (SR7, S1, S3, S12):** tiền tố `/v1`; lỗi `application/problem+json` (RFC 9457) với `type, status,
  title, detail, instance, operation_id`; client bỏ qua field/enum chưa biết; `page_token` hỏng → 400, không
  bao giờ 500; thêm field mới không phá client cũ.
- **Pagination (SR7, S2):** `page_size` (mặc định 20, tối đa 100) + `page_token` mờ, trả kèm
  `next_page_token`.
- **Idempotency (SR8, S4, S5, S15, S16, SE2):** `Idempotency-Key` theo (user, endpoint); cùng key + cùng
  payload → trả kết quả đã lưu, không chạy lại; lỗi tạm → giải phóng key; đang chạy → 409 kèm thời gian
  chờ; payload khác → từ chối; giữ key ≥ 24h, hết hạn thì coi là request mới.
- **Log (SR10, S13):** mọi log liên quan một thao tác mang `operation_id`; không chứa mật khẩu/OTP/token/
  đáp án thô/câu ngữ cảnh.
- **Thời gian (SR13):** lưu UTC ISO 8601.
- **Rate limit (SR14):** mọi endpoint ghi giới hạn theo user; vượt → 429 kèm thời gian chờ.

**Endpoint mẫu** (tiêu chí xong ở mục 1): một endpoint ghi đơn giản (gợi ý: health-check có ghi, hoặc một
no-op dùng `RequestUser` seam) đi qua đủ: Problem Details khi lỗi, pagination nếu trả list, Idempotency-Key
đầy đủ 4 nhánh (S4/S5/S15/S16), log có `operation_id`, rate limit theo `RequestUser`.

## 5. Acceptance criteria và Edge cases riêng cho bước 0

Mục 4 trích S#/SE# của system-spec (cấp hệ thống). Mục này viết rõ **cách bước 0 hiện thực hóa chúng**,
theo đúng khung bảng của `docs/specs/` (xem `module-spec-identity-access.md`), cho đúng stack đã chốt
(Drizzle, Testcontainers, seam `RequestUser`). Đây là phân tích mới trong phiên này, chưa đưa qua chủ dự
án ở dạng này.

**Correction (06/10/2026, found while Codex implemented Task 7 — see Rủi ro mục 7):** the original two-step
`INSERT ... ON CONFLICT` + `SELECT ... FOR UPDATE SKIP LOCKED` pattern below is **wrong** and is replaced
by `pg_try_advisory_xact_lock`. Two real bugs in the original pattern: (1) `INSERT ... ON CONFLICT DO
NOTHING` is not non-blocking in Postgres — a concurrent insert targeting an uncommitted conflicting row
**waits** for that transaction to resolve before deciding whether to skip, so a racing request does not
get an immediate answer the way `SKIP LOCKED` implies; (2) because the claiming `INSERT` auto-commits as
its own short transaction rather than staying open for the handler's duration, no lock actually survives
past `claim()` returning — a second concurrent request can reach the same "orphaned `in_progress`" branch
and also proceed, running the same operation twice (the exact bug SR8 exists to prevent).

`pg_try_advisory_xact_lock(key_hash)` fixes both: it is genuinely non-blocking (the `try` variant returns
`false` immediately instead of waiting), and it is scoped to the transaction — held until that transaction
commits, rolls back, or the connection dies (crash), which gives B0E1's crash-orphan behavior for free
instead of needing separate detection logic. The whole claim-run-complete cycle is now one function over
one open transaction, not two independent `claim()`/`complete()` calls.

### Acceptance criteria — «When … then …»

| # | Criterion | Cites |
|---|---|---|
| B0#1 | When a request arrives for an `Idempotency-Key`, then it opens a transaction and calls `SELECT pg_try_advisory_xact_lock(hash(key, user_id, endpoint))`; if this returns `false`, another request currently holds the lock, and the response is 409 with a wait time, with nothing else read or written | S16 |
| B0#2 | When `pg_try_advisory_xact_lock` returns `true` and no row exists yet for `(key, user_id, endpoint)`, then a row is inserted with `status = 'in_progress'`, the handler runs inside this same transaction, and on success the row is updated to `status = 'succeeded'` with the response before committing | SR8 (đề xuất — cơ chế cụ thể, system-spec không quy định cách claim) |
| B0#3 | When `pg_try_advisory_xact_lock` returns `true` and an existing row has `status` `succeeded` or `failed_permanent` with the same payload hash as the incoming request, then the stored result is returned and the handler does not run | S4 |
| B0#4 | When `pg_try_advisory_xact_lock` returns `true` and an existing row has the same key but a different payload hash, then the request is rejected with a Problem Details error and the handler does not run | S5 |

### Edge cases

| # | Edge case | Expected | Cites |
|---|---|---|---|
| B0E1 | Server crash or lost DB connection while a transaction holds the advisory lock and `status = in_progress` for an `Idempotency-Key` | Postgres releases the advisory lock automatically when the connection dies (it is transaction-scoped). The next request's `pg_try_advisory_xact_lock` call succeeds immediately (no wait), finds the orphaned `in_progress` row, treats it as SR8's transient-failure case, and executes as a new attempt | SR8 (`ASSUMPTION` — not covered by system-spec's SE2, needs owner confirmation) |
|  | **Chốt 07/10/2026 (chủ dự án):** thay vì chạy lại, dòng `in_progress` mồ côi trả 409 `idempotency-key-abandoned`, client làm lại với mã mới. Sập thật thì dòng bị hoàn tác cùng transaction nên lần gửi lại chạy như mới. `Idempotency-Key` bắt buộc + timeout 30 s cũng được chốt. |  |
| B0E2 | Multiple requests from the same user approach the rate-limit threshold at nearly the same instant | The counter increment is one atomic SQL statement (e.g. `UPDATE ... SET count = count + 1 ... RETURNING count`), not a separate read-then-write — otherwise two concurrent requests could both read "under limit" and both pass | SR14 |
| B0E3 | Vitest runs test files in parallel (default) against the same Testcontainers Postgres instance | Tests touching `idempotency_keys` or rate-limit counters use a unique key/user per test (or run inside a rolled-back transaction), so two parallel tests cannot collide on the same key | `ASSUMPTION` |
| B0E4 | Docker daemon is not running when Testcontainers starts | Container startup fails within seconds with a clear error, not an unbounded hang — requires an explicit startup timeout | `ASSUMPTION` |
| B0E5 | Drizzle migrations run against an empty Testcontainers-provisioned database (every test run) and against a long-lived dev database that already has data | The same migration files apply cleanly to both — no branch of migrations that only exists "for tests" | Đề xuất |
| B0E6 | The `RequestUser` seam is still a fake (before Step 1's real JWT exists) | Its only accepted input is a test-only header/fixture; it must never be wired into a publicly reachable endpoint, even temporarily for a demo — name it in code so it isn't forgotten when Step 1 swaps in real JWT | B0R4 (đề xuất) |
| B0E7 | `idempotency_keys` rows past the retention window (≥24h) are never deleted | Once the advisory lock is held (B0#1/B0#2), a row older than the retention window is deleted and treated as if it never existed, so `SE2`'s "treated as a new request" actually holds and the table does not grow without bound | SE2 (`ASSUMPTION` — system-spec itself marks the deletion mechanism as unconfirmed; mechanism still needs picking) |
| B0E8 | The transaction holding the advisory lock runs unusually long (a slow downstream call, not a crash) | A per-call bound (`@Idempotent({ timeoutSeconds })`, default 30s) stops a single slow request from making every duplicate retry wait indefinitely for a 409. **Implemented 06/10/2026 as a client-side `Promise.race`, not a Postgres `transaction_timeout`/`idle_in_transaction_session_timeout`** — both GUCs bound idle-in-transaction time correctly (`statement_timeout` does not, since no SQL statement runs during a handler's non-DB work), but both enforce it by having Postgres terminate the whole connection, which was observed in testing to surface as an unhandled process-level exception through this exact drizzle + node-postgres pooling setup — a crash risk worse than the problem being solved. The client-side race never touches the connection, so it cannot crash the process, but it does not truly cancel the abandoned transaction: if the handler finishes after the race already reported a timeout, that transaction still commits normally later | `ASSUMPTION` (timeoutSeconds now configurable per `@Idempotent()` call, default still 30s, chosen not measured) |

**Cảnh báo cho các bước sau (06/10/2026, không phải việc của bước 0):** B0E1 và B0E8 đều giả định an toàn khi retry lại từ đầu — đúng cho handler chỉ ghi DB (transaction rollback dọn sạch). Handler nào gọi dịch vụ ngoài có tác dụng phụ không thể rollback (AI provider ở bước 6–7, tốn tiền thật mỗi lần gọi) thì crash hoặc timeout giữa chừng có thể khiến lần gọi thật đã xảy ra, rồi retry gọi lại lần hai — cơ chế `runIdempotent` của bước 0 không tự bảo vệ trường hợp này. Bước nào thêm handler có tác dụng phụ ngoài DB cần tự thêm một lớp chống trùng riêng cho đúng lần gọi đó (vd ghi "đã gửi yêu cầu tới provider" vào cùng transaction trước khi gọi, kiểm lại khi retry).

## 6. Ngoài phạm vi bước 0

Từ HANDOFF §6, không chặn bước 0: K18 (cấu trúc hạn mức AI), K20 (provider từ điển ngoài), CR16/PRC7
(biến cách/lemma), SMTP Gmail cá nhân, mọi số liệu năng lực/chi phí. Từ mục 2.4: S6–S10, S17, SE5 (cần user
thật).

## 7. Rủi ro và việc còn mở

- Drizzle pre-1.0, đang giữa đợt viết lại — giảm thiểu bằng pin version (mục 2.2). Cần theo dõi changelog
  khi `v1.0.0` GA.
- Docker daemon có đang chạy không: `ASSUMPTION`, chỉ mới xác nhận Docker **client** 28.5.1 trong phiên
  viết HANDOFF. Cần xác nhận trước khi chạy Testcontainers thật (sẽ lộ ra ngay ở lần chạy test đầu; xem
  B0E4 ở mục 5 cho cách fail nhanh thay vì treo).
- B0E1 (mục 5) cần chủ dự án xác nhận riêng: case `Idempotency-Key` mồ côi do crash giữa chừng chưa có
  trong system-spec's SE2, đang ghi `ASSUMPTION`.
- B0E7/B0E8 (mục 5) cần chủ dự án chọn cụ thể: cơ chế xóa key hết hạn (cron? xóa lười lúc claim?) và số
  giây timeout tối đa cho transaction giữ lock — cả hai hiện là `ASSUMPTION`.
- **Câu hỏi mở, chưa có trong system-spec:** header `Idempotency-Key` có bắt buộc trên endpoint cần nó
  không, hay thiếu header thì bỏ qua dedup và chạy thẳng?
- Chưa chạy thử thật bất kỳ phần nào ở trên — toàn bộ mục 2 dựa trên đọc source/docs (context7, GitHub),
  chưa phải đã verify bằng cách chạy code trong phiên này. `writing-plans` nên đưa việc dựng skeleton tối
  thiểu (cài Drizzle, viết 1 query `FOR UPDATE SKIP LOCKED` thật, chạy qua Testcontainers) lên sớm để lộ rủi
  ro còn lại trước khi viết phần còn lại của bước 0.
