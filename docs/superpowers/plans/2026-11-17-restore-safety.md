# Restore an toàn (PITR, mã đơn không lặp, tách role DB) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sau một lần restore, không đơn nào bị gắn tiền nhầm người, dữ liệu mất tối đa khoảng 1 phút, và API/worker không còn chạy bằng superuser.

**Architecture:** Mã đơn sinh theo thời gian (giây từ một mốc × 100 + thứ tự trong giây), nên mã sau restore luôn mới hơn mọi mã cũ; đơn chưa có link chỉ
nhận tiền chuyển sau lúc tạo đơn; một CLI dò payOS theo khoảng thời gian bị mất. Postgres chạy trong image riêng có WAL-G, đẩy WAL lên bucket R2
`wordmet-wal` mỗi 60 giây, base backup mỗi ngày cùng `pg_dump`. Hai role mới `wordmet_migrator` (migrate) và `wordmet_app` (API, worker, CLI).

**Tech Stack:** NestJS 11, Prisma 7.10.1, Vitest 4, Postgres 17, WAL-G v3.0.9, Docker Compose, bash, R2.

**Spec:** `docs/superpowers/specs/2026-11-17-restore-safety-design.md`; quyết định: `docs/superpowers/decisions/2026-11-17-restore-safety-decisions.md`;
bằng chứng tách role: `docs/audit/2026-11-17-db-roles-payment-restore.md`.

**Base:** M1 làm trên `dev` **sau khi PR #301** (`fix/ai-write-after-delete-link-mismatch`) đã merge: nó thêm `CheckoutState.paymentLinkId` và
nhánh "link khác → `needs_review`" mà Task 4 dựa vào. M2 sau khi PR #302 (`feat/deletion-journal`) merge, vì cả hai sửa `deploy/README.md` và
`deploy/env.production.example`.

## Điểm plan làm rõ hoặc lệch design (cần chủ dự án duyệt cùng plan)

| # | Design nói | Plan làm | Vì sao |
|---|---|---|---|
| R1 | `k` = sequence riêng `mod 100` | `k` = chỗ trống kế tiếp trong giây đó (`max + 1` của các mã cùng giây, bắt đầu 0) | `k` từ sequence không bắt đầu từ 0 mỗi giây, nên CLI dò phải hỏi đủ 100 mã mỗi giây (2 phút = 12.000 lần gọi payOS). `k` bắt đầu 0 thì gặp mã trống là dừng: ~1 lần gọi mỗi giây |
| R2 | `ORDER_CODE_MIN + giây × 100 + k` | `ORDER_CODE_TIME_BASE` = 1.100.000.000, mốc 2026-11-17T00:00:00Z | Mã cũ từ sequence (1.000.000.000 + số đơn đã có) nằm dưới 1,1 tỷ nên không bao giờ trùng mã mới. Dùng được tới khoảng 05/2037 (10,5 năm) |
| R3 | payOS báo trùng → đơn đó `failed`, thử mã mới, tối đa 3 lần | Như design, và đơn `failed` vì trùng mã được đánh dấu đã hỏi (`checked_at = now`) | Link mang mã đó là của người khác: job đối soát không được hỏi payOS về nó, càng không được hủy link đó |
| R4 | Đơn chưa có link mà payOS có giao dịch → luôn `needs_review` | Đơn chưa có link nhận tiền chỉ khi giờ chuyển ≥ giờ tạo đơn − 60 giây; sớm hơn thì `link-mismatch` (bỏ qua, job đưa vào `needs_review`) | "Luôn `needs_review`" làm hỏng ca có thật: payOS tạo link xong nhưng trả lời chậm, đơn thành `failed` không link, người mua vẫn trả (LB1E17, launch B §3.6). Tiền chuyển trước khi đơn tồn tại thì chắc chắn không phải của đơn đó |
| R5 | Biến WAL-G trong `.env` | File riêng `/srv/wordmet/walg.env`, chỉ service `postgres` đọc | `api` và `worker` đọc toàn bộ `.env`; thêm `AWS_ACCESS_KEY_ID` vào đó thì key WAL lọt vào app, và SDK S3 nào trong app đọc biến mặc định sẽ dùng nhầm key |

## Global Constraints

- `ORDER_CODE_MIN` = 1_000_000_000, `ORDER_CODE_MAX` = 34_359_738_367 giữ nguyên (`apps/api/src/entitlements/orders/order-codes.ts`).
- `ORDER_CODE_TIME_BASE` = 1_100_000_000; `ORDER_CODE_EPOCH_MS` = `Date.UTC(2026, 10, 17)` (= 1_794_873_600_000); tối đa 100 mã mỗi giây.
- Tạo đơn thử tối đa **3** mã rồi mới 503 `provider-unavailable`. Lỗi trùng mã: Prisma `P2002` khi insert; payOS `code` `'231'`; fake payOS `P2002`.
- Đơn chưa có link: chấp nhận tiền khi giờ chuyển (Vietnam time, `parsePayosTime`) ≥ `order.createdAt − 60_000 ms`.
- WAL-G v3.0.9, file `wal-g-pg-22.04-amd64.tar.gz`, sha256 `4f03ee4679db7f660bfd1b2b8291ac5df247cd2ec48074b60c112f4897299f24`.
- Postgres: `archive_mode=on`, `archive_command='wal-g wal-push %p'`, `archive_timeout=60`. Giữ base backup: `wal-g delete retain FULL 14 --confirm`.
- Cảnh báo: lần đẩy thành công gần nhất cũ hơn **15 phút** khi có WAL chờ; hơn **20** file `.ready`; đĩa trống dưới **15 GB** (cảnh báo), dưới **8 GB** (nghiêm trọng).
- WAL-G gọi Postgres bằng `PGUSER=wordmet`; image có `ca-certificates`.
- Không đọc, không in giá trị trong `.env`, `ops.env`, `walg.env`, `secrets/`. Test dùng giá trị sinh trong bộ nhớ.
- Lệnh test mặc định của API: `pnpm test` trong `apps/api` (Vitest), không cần Docker. Smoke chạy tay trên DB mới (CLAUDE.md, Bước 4 D38).
- Commit theo `~/.claude/rules/git-conventions.md`; scope `api` cho M1, `deploy` cho M2.

## Review Focus

1. **Hai đơn trong cùng một giây, đồng thời.** Cả hai đọc cùng `max`, cùng định lấy `k` = n; một bên gặp `P2002` và phải thử `k` kế tiếp, không 503. Test ở Task 3.
2. **Đồng hồ VPS lùi (NTP chỉnh) về đúng giây đã có đơn.** Mã tính ra trùng mã đã có trong DB → `P2002` → thử tiếp; trùng mã payOS cũ → `231` → thử tiếp. Test ở Task 3.
3. **Webhook của link cũ tới sau restore, cho một đơn mới chưa có link.** Giờ chuyển sớm hơn đơn → `link-mismatch`, không mở kỳ Pro. Test ở Task 4.
4. **payOS không trả `transactionDateTime` đúng dạng.** `parsePayosTime` trả `now`, tức ≥ giờ tạo đơn: tiền vẫn nhận như hôm nay (không chặn nhầm người mua thật). Test ở Task 4.
5. **R2 ngừng nhận WAL nhiều giờ.** `watch.sh` báo theo tuổi lần đẩy và số `.ready`, không theo `failed_count`; đĩa xuống 15 GB thì báo trước khi Postgres dừng. Kiểm ở Task 9.

---

## Milestone 1 — API (nhánh `feat/restore-safety-orders`, PR vào `dev`)

### Task 1: Mã đơn theo thời gian (hàm thuần)

**Files:**
- Modify: `apps/api/src/entitlements/orders/order-codes.ts`
- Test: `apps/api/src/entitlements/orders/order-codes.spec.ts`

**Interfaces:**
- Produces: `ORDER_CODE_TIME_BASE: number`, `ORDER_CODE_EPOCH_MS: number`, `ORDER_CODES_PER_SECOND = 100`,
  `orderCodeSecond(at: Date): number` (giây từ mốc, làm tròn xuống),
  `orderCodeAt(second: number, slot: number): number` (= `ORDER_CODE_TIME_BASE + second × 100 + slot`),
  `orderCodeSlots(second: number): { first: number; last: number }` (mã `slot` 0 và 99 của giây đó).

- [ ] **Step 1: Viết test đỏ** (thêm `describe('time-based order codes')`):
  - `orderCodeSecond(new Date(ORDER_CODE_EPOCH_MS))` → `0`; `orderCodeSecond(new Date(ORDER_CODE_EPOCH_MS + 1999))` → `1`.
  - `orderCodeAt(0, 0)` → `1_100_000_000`; `orderCodeAt(1, 0)` → `1_100_000_100`; `orderCodeAt(1, 99)` → `1_100_000_199`.
  - `orderCodeAt(0, 100)`, `orderCodeAt(0, -1)`, `orderCodeAt(-1, 0)`, `orderCodeAt(0, 1.5)` → throw `RangeError`.
  - Giây cuối dùng được: `s = Math.floor((ORDER_CODE_MAX - ORDER_CODE_TIME_BASE - 99) / 100)`; `orderCodeAt(s, 99) <= ORDER_CODE_MAX`; `orderCodeAt(s + 1, 0)` → `RangeError`.
  - `orderDescription(orderCodeAt(s, 99))` dài đúng 9 ký tự (vừa `WM` + 7).
  - Bất biến: với 50 cặp `(second, slot)` ngẫu nhiên hợp lệ, `orderCodeAt` tăng ngặt theo `(second, slot)`; mọi mã ≥ `ORDER_CODE_TIME_BASE` > mọi mã sequence cũ.
  - `orderCodeSlots(3)` → `{ first: 1_100_000_300, last: 1_100_000_399 }`.
- [ ] **Step 2:** `pnpm vitest run src/entitlements/orders/order-codes.spec.ts` → FAIL (`orderCodeAt` không tồn tại).
- [ ] **Step 3:** Cài đặt ba hàm và ba hằng trong `order-codes.ts`, thuần (không đọc đồng hồ). Chú thích nói rõ R1, R2.
- [ ] **Step 4:** Chạy lại → PASS.
- [ ] **Step 5:** Commit `feat(api): derive order codes from time so a restore never reuses one`.

### Task 2: Repository lấy mã kế tiếp theo giây; đơn trùng mã không bị job hỏi

**Files:**
- Modify: `apps/api/src/entitlements/orders/orders.repository.ts` (`nextOrderCode`, `markFailed`)
- Test: `apps/api/src/entitlements/orders/orders.repository.spec.ts`

**Interfaces:**
- Consumes: `orderCodeSecond`, `orderCodeAt`, `orderCodeSlots` (Task 1).
- Produces: `nextOrderCode(db: Db, now: Date): Promise<number>`; `markFailed(db: Db, id: string, opts?: { codeTaken?: boolean }): Promise<boolean>`.

- [ ] **Step 1: Viết test đỏ** (thay test `nextOrderCode reads the sequence…`):
  - Với `$queryRaw` giả trả `[{ max: null }]`: `nextOrderCode(db, new Date(ORDER_CODE_EPOCH_MS + 5_000))` → `1_100_000_500`; câu SQL chứa `max(order_code)`
    và hai cận `1100000500`, `1100000599`; không còn `nextval`.
  - Trả `[{ max: 1_100_000_503n }]` → `1_100_000_504`.
  - Trả `[{ max: 1_100_000_599n }]` (giây đã đủ 100) → throw lỗi có `code: 'order-codes-exhausted'`.
  - `markFailed(db, 'o1', { codeTaken: true })` gọi `updateMany` với `where { id: 'o1', status: 'pending' }`, `data { status: 'failed', checkedAt: <Date> }`;
    không có `opts` thì `data` chỉ `{ status: 'failed' }` (giữ hành vi cũ để job vẫn hỏi đơn timeout).
- [ ] **Step 2:** Chạy spec → FAIL.
- [ ] **Step 3:** `nextOrderCode`: `SELECT max(order_code) AS max FROM billing_orders WHERE order_code BETWEEN first AND last` (cả hai môi trường, mọi provider),
  rồi `orderCodeAt(second, max === null ? 0 : max − first + 1)`; slot 100 → ném lỗi `order-codes-exhausted`. Không khóa: `P2002` ở Task 3 lo chạy đua.
  `markFailed` với `codeTaken` đặt thêm `checkedAt: new Date()` (cột `checked_at`; `claimForReconcile` chỉ lấy đơn `failed` có `checked_at IS NULL`).
  Sequence `billing_order_code_seq` giữ nguyên trong DB, không còn ai gọi.
- [ ] **Step 4:** Chạy spec → PASS; `pnpm typecheck` (sửa chữ ký ở `orders.service.ts` tạm truyền `this.clock.now()`).
- [ ] **Step 5:** Commit `feat(api): take the next free order code of the current second`.

### Task 3: Tạo đơn thử mã khác khi trùng (tối đa 3 lần)

**Files:**
- Modify: `apps/api/src/entitlements/orders/orders.service.ts` (`create`)
- Test: `apps/api/src/entitlements/orders/orders.service.spec.ts`

**Interfaces:**
- Consumes: `nextOrderCode(db, now)`, `markFailed(db, id, { codeTaken })` (Task 2).
- Produces: hàm cục bộ `isCodeTaken(error: unknown): boolean` (đúng khi `code` là `'231'`, `231` hoặc `'P2002'`). Không đổi API HTTP.

- [ ] **Step 1: Viết test đỏ** (memory repo của spec trả mã theo hàng đợi định sẵn):
  - `insertPending` ném `{ code: 'P2002' }` một lần → lần hai thành công: 201, đơn có mã thứ hai, không đơn `failed` nào.
  - `createCheckout` ném `{ code: '231' }` một lần → đơn đầu `failed` với `codeTaken: true`; đơn thứ hai có link; trả về link thứ hai.
  - Fake payOS ném `{ code: 'P2002' }` ba lần → 503 `provider-unavailable`; ba đơn `failed` đều `codeTaken: true`; `createCheckout` gọi đúng 3 lần.
  - `createCheckout` ném `{ name: 'TimeoutError' }` (không phải trùng) → 503 ngay, `createCheckout` gọi 1 lần, đơn `failed` **không** `codeTaken` (job vẫn hỏi, LB1E17).
  - Log `order_checkout_failed` vẫn có `provider_error: '231'`, không có mã đơn trong log (test hiện có ở dòng ~213 giữ nguyên).
- [ ] **Step 2:** Chạy spec → FAIL.
- [ ] **Step 3:** Bọc phần "transaction tạo đơn → gọi `createCheckout`" trong vòng lặp `attempt` 1..3. `P2002` khi insert: thử lại (không đơn nào được tạo).
  `isCodeTaken` khi gọi payOS: `markFailed(…, { codeTaken: true })`, log `order_code_taken` với `order_ref`, thử lại. Lỗi khác: hành vi cũ. Hết 3 lần: 503.
- [ ] **Step 4:** `pnpm vitest run src/entitlements/orders` → PASS.
- [ ] **Step 5:** Commit `feat(api): retry an order with a new code when payOS has the code`.

### Task 4: Đơn chưa có link chỉ nhận tiền chuyển sau khi tạo đơn

**Files:**
- Modify: `apps/api/src/entitlements/orders/order-rules.ts` (`precheckPayment`), `apps/api/src/entitlements/orders/order-applier.service.ts` (`applyPayment`),
  `apps/api/src/entitlements/orders/orders.repository.ts` (`OrderRecord` thêm `createdAt: Date`, `toRecord`)
- Test: `order-rules.spec.ts`, `order-applier.service.spec.ts`, `orders-reconcile.service.spec.ts`

**Interfaces:**
- Produces: `precheckPayment(payment: { success; code; paymentLinkId; env; paidAt: Date }, order: { paymentLinkId; environment; createdAt: Date } | null)`,
  hằng `NO_LINK_PAYMENT_SKEW_MS = 60_000`. Kết quả vẫn là `'not-success' | 'unknown-order' | 'link-mismatch' | null`.

- [ ] **Step 1: Viết test đỏ**
  - `order-rules.spec.ts`, bảng: đơn không link, `createdAt` 10:00:00Z; `paidAt` 09:58:59Z → `'link-mismatch'`; 09:59:00Z → `null` (đúng cạnh 60 s);
    10:05:00Z → `null`. Đơn có link: `paidAt` bất kỳ, link khớp → `null` (luật giờ chỉ áp cho đơn không link).
  - `order-applier.service.spec.ts`: webhook cho đơn không link, `providerTime` `'2026-11-17 16:58:00'` (09:58:00Z) và đơn tạo 10:00:00Z → `{ outcome: 'ignored', reason: 'link-mismatch' }`,
    không `insertPayment`, không kỳ Pro. `providerTime: null` → giữ hành vi cũ (nhận tiền).
  - `orders-reconcile.service.spec.ts`: đơn `failed` không link, payOS trả link có giao dịch trước giờ tạo đơn → đơn thành `needs_review/provider-mismatch`
    (qua `neverApplied`), không mở kỳ.
- [ ] **Step 2:** Chạy ba spec → FAIL.
- [ ] **Step 3:** `applyPayment` tính `paidAt = parsePayosTime(input.providerTime, now)` và truyền `found.createdAt`; `precheckPayment` thêm một nhánh cho
  `order.paymentLinkId === null`. Sửa mọi chỗ gọi `precheckPayment` theo `pnpm typecheck`.
- [ ] **Step 4:** `pnpm vitest run src/entitlements` → PASS.
- [ ] **Step 5:** Commit `fix(api): refuse money sent before an order without a link existed`.

### Task 5: CLI dò payOS theo khoảng thời gian

**Files:**
- Create: `apps/api/src/cli/orders-probe-payos-args.ts`, `apps/api/src/cli/orders-probe-payos.ts`
- Test: `apps/api/src/cli/orders-probe-payos.spec.ts`
- Modify: `apps/api/package.json` (`"orders:probe-payos": "node dist/cli/orders-probe-payos.js"`)

**Interfaces:**
- Consumes: `orderCodeSecond`, `orderCodeAt`, `orderDescription` (Task 1); `createPayosClient` (`payos.adapter.ts`), `loadConfig`.
- Produces: `parseProbeArgs(argv: string[]): { ok: true; from: Date; to: Date; gap: number } | { ok: false; error: string }`;
  `probe(client: Pick<PayOS, 'paymentRequests'>, range: { from: Date; to: Date; gap: number }, sleep: (ms: number) => Promise<void>): Promise<ProbeRow[]>`
  với `ProbeRow = { orderCode: number; description: string; status: string; amount: number; amountPaid: number; createdAt: string; payers: string[] }`.

- [ ] **Step 1: Viết test đỏ**
  - Args: `--from 2026-11-17T10:00:00Z --to 2026-11-17T10:02:00Z` → ok, `gap` 3; thiếu `--to`, `to` ≤ `from`, khoảng > 24 giờ, chuỗi không phải ISO → `{ ok: false }` với lỗi đúng chữ.
  - `probe`: client giả có link ở mã `slot` 0, 1 của giây đầu và `slot` 0 của giây thứ ba → trả đúng 3 hàng theo thứ tự mã; với mỗi giây gọi `get` cho tới khi
    gặp `gap` mã liên tiếp không có (`NotFoundError`); giây không có gì → đúng `gap` lần gọi. `sleep` được gọi giữa hai lần gọi (100 ms).
  - Lỗi khác `NotFoundError` → ném ra (CLI exit 1), không nuốt.
  - Hàng in ra có tên người chuyển (`counterAccountName`) nhưng **không** có số tài khoản.
- [ ] **Step 2:** Chạy spec → FAIL.
- [ ] **Step 3:** Entry theo mẫu `payos-confirm-webhook.ts`: không cần DB; `payos.mode` `fake` → exit 1 với "fake mode: read fake_payos_links instead";
  `off` → exit 1. In bảng TSV: mã, mô tả `WM…`, trạng thái, số tiền, đã trả, giờ tạo, người chuyển. Exit 2 khi sai tham số. Chú thích đầu file: chỉ đọc payOS,
  dùng sau restore cho khoảng `[giờ của bản restore, giờ hỏng]`, staff xác nhận bằng "Xác nhận thanh toán".
- [ ] **Step 4:** Chạy spec → PASS; `pnpm build`; `node dist/cli/orders-probe-payos.js --from x` → exit 2.
- [ ] **Step 5:** Commit `feat(api): add a cli that lists payOS links of a time window`.

### Task 6: Smoke thanh toán theo mã mới và kiểm runtime

**Files:**
- Modify: `apps/api/scripts/smoke-buoc-b-payments.mjs` (bước `LB1E17 + LB1E18`, thêm bước `RS1`)
- Output: `docs/deliveries/restore-safety-smoke-output.txt`

- [ ] **Step 1:** Viết lại `LB1E17 + LB1E18`: thay việc đọc `billing_order_code_seq` bằng chèn link giả cho **mọi** mã của 10 giây tới, tính trong SQL từ `now()`
  (`1100000000 + (floor(extract(epoch from now()) − 1794873600) + s) × 100 + k`, `s` 0–9, `k` 0–99, `ON CONFLICT DO NOTHING`); mua → 503, ba đơn `failed`
  có `checked_at` khác NULL; xóa các link giả; mua lại cùng key → 201 với mã lớn hơn mọi mã `failed`. Bỏ kiểm "job hủy link lạc" (link mang mã trùng không phải của
  đơn này, R3); ca timeout vẫn được unit test ở Task 3 giữ.
- [ ] **Step 2:** Thêm bước `RS1`: chèn link giả cho mã `slot` 0 của giây hiện tại và giây kế; mua → 201, `order_code` không nằm trong hai mã đó; một đơn `failed` với `checked_at`.
- [ ] **Step 3:** Chạy trên DB mới theo `docs/deliveries/chuan-bi-launch-b.md`: `pnpm smoke:buoc-b-payments` → `PASS … FAIL 0`; `pnpm smoke:buoc-4` → `ALL CHECKS PASSED`.
  Ghi output vào file trên.
- [ ] **Step 4:** Commit `test(api): pin time-based order codes in the payments smoke`, rồi PR M1 (skill `ship-pr`).

## Milestone 2 — Vận hành (nhánh `feat/restore-safety-ops`, PR vào `dev`)

Script deploy không có test tự động trong CI; mỗi task kiểm bằng một stack cô lập trên máy (tên container `rs-*`, cổng riêng), như lượt diễn tập G1.

### Task 7: Image Postgres có WAL-G và bật archive

**Files:**
- Create: `deploy/postgres/Dockerfile`, `deploy/walg.env.example`
- Modify: `deploy/compose.prod.yml` (service `postgres`)

- [ ] **Step 1:** `Dockerfile`: `FROM postgres:17`; `apt-get install --no-install-recommends ca-certificates curl`; tải
  `https://github.com/wal-g/wal-g/releases/download/v3.0.9/wal-g-pg-22.04-amd64.tar.gz`, `sha256sum -c` với giá trị ở Global Constraints (sai thì build fail);
  giải nén `wal-g-pg-22.04-amd64` thành `/usr/local/bin/wal-g`; gỡ `curl`; `RUN wal-g --version`. Tải lúc build, không lúc chạy.
- [ ] **Step 2:** Compose `postgres`: `build: { context: ./postgres }`, `image: wordmet-postgres:17-walg-3.0.9` (tag cố định: `deploy.sh` chạy `compose up` không dựng lại);
  `env_file: ${WORDMET_HOME:-/srv/wordmet}/walg.env`; `environment` thêm `PGUSER: ${POSTGRES_USER:?}`; `command` thêm
  `-c archive_mode=on -c "archive_command=wal-g wal-push %p" -c archive_timeout=60`. `walg.env.example`: sáu biến của design §3.1 + `WALG_COMPRESSION_METHOD=brotli`,
  không giá trị thật; chú thích "chmod 600, chỉ postgres đọc (R5)".
- [ ] **Step 3:** Kiểm: `docker build deploy/postgres` thành công, sửa một ký tự sha256 thì build fail (rồi hoàn lại). Stack cô lập với SeaweedFS làm S3 (cluster đã initdb trước khi
  bật archive, design §4): ghi dữ liệu, `select pg_switch_wal()`, `pg_stat_archiver.archived_count` ≥ 1, 0 file `.ready`. Kiểm `docker compose config` cho thấy `api` **không** có `AWS_ACCESS_KEY_ID`.
- [ ] **Step 4:** Commit `feat(deploy): run postgres with wal-g archiving to r2`.

### Task 8: Tách role DB

**Files:**
- Create: `deploy/sql/roles.sql` (từ `split-roles.sql` đã thử; tên DB nhận qua biến `:db`, mật khẩu qua `:mig_pw`, `:app_pw`), `deploy/scripts/db-roles.sh`
- Modify: `deploy/compose.prod.yml` (`x-api-env.DATABASE_URL` → `${APP_DB_USER:?}:${APP_DB_PASSWORD:?}`; `migrate.DATABASE_URL` → `${MIGRATOR_DB_USER:?}:${MIGRATOR_DB_PASSWORD:?}`),
  `deploy/env.production.example`

- [ ] **Step 1:** `db-roles.sh`: đọc mật khẩu bằng `env_get` (không in), đẩy `\set` qua stdin rồi `roles.sql` vào `compose exec -T postgres psql -U $POSTGRES_USER -v ON_ERROR_STOP=1`;
  in đúng dòng `left over: N`; `N` ≠ 0 → exit 1. Idempotent.
- [ ] **Step 2:** Kiểm trên stack cô lập: chạy hai lần → `left over: 0` cả hai; `wordmet_app` bị chặn `CREATE TABLE`, `COPY … TO PROGRAM`, đọc `_prisma_migrations`;
  migrate bằng `wordmet_migrator` một migration thử tạo bảng → `wordmet_app` có DML trên bảng mới; API + worker bằng `wordmet_app` chạy
  `smoke:buoc-4`, `smoke:buoc-8`, `smoke:buoc-b-payments` → pass (bộ chạy như audit §1).
- [ ] **Step 3:** Rollback ghi trong README (Task 10): đặt `APP_DB_USER`/`MIGRATOR_DB_USER` về `wordmet` với mật khẩu của nó; kiểm chạy được.
- [ ] **Step 4:** Commit `feat(deploy): run the api and migrations without the superuser`.

### Task 9: Backup, cảnh báo và báo cáo ngày cho PITR

**Files:**
- Modify: `deploy/scripts/backup.sh`, `deploy/scripts/watch.sh`, `deploy/scripts/daily-report.sh`

- [ ] **Step 1:** `backup.sh`: sau khi upload `pg_dump`, `compose exec -T postgres wal-g backup-push "$PGDATA"` rồi `wal-g delete retain FULL 14 --confirm`; lỗi → cùng
  `alert_on_failure` hiện có. `pg_dump` giữ nguyên, chạy trước (nếu WAL-G lỗi vẫn có bản dump).
- [ ] **Step 2:** `watch.sh` thêm kiểm 5: đọc `pg_stat_archiver` (`extract(epoch from now() - last_archived_time)`) và đếm `pg_wal/archive_status/*.ready` trong container;
  alert `archive` khi (tuổi > 900 s **và** `.ready` > 0) hoặc `.ready` > 20; đĩa trống (`df -BG /`) < 15 → alert `disk-low`, < 8 → alert `disk-critical`
  (giữ kiểm `WATCH_DISK_PERCENT` cũ). Không dùng `failed_count`.
- [ ] **Step 3:** `daily-report.sh` thêm dòng `PITR: last WAL <tuổi>, .ready <n>, newest base backup <tên, giờ>` (từ `wal-g backup-list`).
- [ ] **Step 4:** Kiểm trên stack cô lập với SeaweedFS: chạy `backup.sh` (R2 của `pg_dump` trỏ vào SeaweedFS) → có base backup, còn tối đa 14; dừng SeaweedFS, ghi dữ liệu,
  chờ quá ngưỡng (đặt ngưỡng nhỏ bằng biến `WATCH_ARCHIVE_MAX_AGE_S` chỉ cho lượt kiểm) → `send-alert.sh` nhận `archive` (thay bằng script giả ghi ra file);
  bật lại SeaweedFS → `.ready` về 0, không còn cảnh báo. `bash -n` cả ba script.
- [ ] **Step 5:** Commit `feat(deploy): back up with wal-g and alert when wal stops reaching r2`.

### Task 10: Runbook restore và diễn tập

**Files:**
- Modify: `deploy/README.md` (mục "Prepare the server", "Backup and restore", "Roll back"), `deploy/ops.env.example` nếu cần

- [ ] **Step 1:** Viết: tạo `walg.env`; chạy `db-roles.sh`; restore PITR theo design §3.1 (dừng API, worker → volume mới → `backup-fetch LATEST` → `recovery.signal`,
  `restore_command`, `recovery_target_time` hoặc tới cuối WAL, `recovery_target_action=promote` → mở lại → `orders:probe-payos --from <giờ restore> --to <giờ hỏng>`);
  restore bằng `pg_dump` vào cluster mới: tạo role trước rồi `pg_restore`, chạy lại `db-roles.sh` (PUBLIC lấy lại `CONNECT`); rollback ảnh Postgres cũ và role;
  migration lỡ chạy bằng `wordmet` (app báo `permission denied` trên bảng mới) → chạy lại `db-roles.sh`.
- [ ] **Step 2:** Diễn tập đúng từng lệnh trong README trên stack cô lập: mất volume → restore về mốc T1 → dữ liệu ≤ T1 còn, > T1 mất; API đọc được bằng `wordmet_app`.
  Ghi kết quả vào `docs/deliveries/restore-safety.md` (as-built).
- [ ] **Step 3:** Commit `docs(deploy): add the pitr restore and role runbook`, rồi PR M2.

## Milestone 3 — Áp dụng trên VPS (có chủ dự án, ban đêm giờ Việt Nam, D8)

### Task 11: Đưa lên production

Không code. Làm theo design §6, mỗi bước ghi output vào `docs/deliveries/restore-safety.md`:

- [ ] **Step 1:** M1 và M2 đã merge và deploy (`deploy.sh main`); chủ dự án tạo `/srv/wordmet/walg.env` (chmod 600, `WALG_S3_PREFIX=s3://wordmet-wal/prod`) và thêm bốn biến role vào `.env`.
  Claude không mở hai file này.
- [ ] **Step 2:** `db-roles.sh` → `left over: 0`.
- [ ] **Step 3:** Restart `postgres`, `api`, `worker` với image và role mới; `/v1/health/ready` 200; `pg_stat_archiver.archived_count` tăng sau `pg_switch_wal()`.
- [ ] **Step 4:** `backup.sh` → base backup đầu tiên trên R2; `watch.sh` không báo gì.
- [ ] **Step 5:** Diễn tập restore từ R2 thật vào một container tách mạng trên VPS (không đụng volume production), về mốc vài phút trước; đếm bảng và dòng khớp.
- [ ] **Step 6:** Ghi as-built; đánh dấu journal xóa tài khoản để quyết lại (D5).
