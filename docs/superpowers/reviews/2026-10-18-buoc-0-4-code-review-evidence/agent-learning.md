# Review Bước 0–4 — lát cắt LN: Learning, Settings, nhắc học, hạn mức email, Entitlements stub

Ngày 18/10/2026. Người review: agent độc lập, không viết code này. Snapshot: `origin/dev` = `dc4cbe0` (worktree
`.claude/worktrees/review-buoc-0-4`, detached). **Chỉ đọc code**: không chạy test, không chạy app, không Docker. Mọi
`SUSPECTED` có probe để phiên điều phối chạy trên Postgres/Redis thật. Đường dẫn tính từ `apps/api/` nếu không ghi khác.

## 1. Phạm vi đã đọc

**Code (đọc hết từng file):**
- `src/learning/**`: schedule, queue (queries, service, controller), reviews, groups, items, backlog, quick-add, my-words,
  `learning-lock.ts`, `learning.constants.ts`, module, service, `index.ts`.
- `src/settings/**`, `src/notifications/**` (prefs, provider, scheduler: tick, send, queue, eligibility, mail-error),
  `src/entitlements/**`, `src/common/mail/**`, `src/common/email/normalize-email.ts`.
- Đọc thêm để lần theo đường gọi: `src/common/time/local-date.ts`, `src/common/idempotency/idempotency.interceptor.ts`,
  `src/common/logging/app-logger.ts`, `src/common/rate-limit/rate-limiter.service.ts` + `rate-limit.guard.ts`,
  `src/common/config/app-config.ts` (rule rate limit, biến env), `src/common/db/prisma.module.ts`,
  `src/identity/profile/identity.service.ts` (`listReminderCandidates`, `verifiedEmails`), `src/identity/sessions/session.service.ts`
  (chỗ ghi `last_seen_at`), `src/identity/staff/permission.guard.ts`, `src/identity/auth/auth.schemas.ts`,
  `src/content/learner/visible-senses.ts`, `src/content/private/private-words.service.ts` (`visibleSenseIds`, `bulkCandidates`),
  `src/worker.ts`, `src/app.module.ts`.
- Schema/migration: `prisma/models/learning.prisma`, `notifications.prisma`, `settings.prisma`; migration `20261017120000_settings`,
  `20261017130000_notifications`, `20261017210000_learning`, `20261018090000_users_last_seen_at`, `20261018100000_learning_backlog_section`.
- Test: `test/learning/*` (9 file), `test/settings/settings.e2e-spec.ts`, `test/notifications/*` (3 file),
  `test/common/mail-budget.e2e-spec.ts`; unit spec cạnh code (schedule, eligibility, mail-error, mail-budget, entitlements);
  `test/support/create-test-app.ts`, `learning-metrics.ts`; `vitest.config.e2e-scale.ts`.

**Tài liệu:** design Bước 3 §4, §5.1, §5.3, §5.4, §6 (cả bảng 6.4), §8, §9, §10, §12, §13, §14; decision record Bước 3 (D16–D22,
D24–D27, D33, D35–D37, D44, D48, bảng "Quyết định của điều phối"); `docs/deliveries/buoc-3.md`, `buoc-3-test-flow.md`,
`buoc-4.md`; design Bước 4 §0, §2, §4, §5.3, §5.4, §6 (rate limit), §11, §12, B4E38/B4E44–B4E46; plan Bước 4 Task 1–5; review cũ
`2026-10-17-buoc-3-code-review.md` và `…-evidence/agent-learning.md`.

**Số lượt:** 2. Lượt 1 lần theo từng đường gọi (route → guard → service → SQL → ràng buộc DB → transaction/lock → job/worker). Lượt 2
đối chiếu design/decision, đọc test, đối chiếu từng phát hiện cũ.

**Lưu ý snapshot:** `dev` ở máy chính đã có thêm PR #50 (`94cdb6e`, `feat/buoc-4-b-learning`: ghi lượt bấm từ bài luyện,
`learning_log.origin`, cổng xóa dữ liệu luyện). PR đó **không** nằm trong `dc4cbe0`, nên không được review ở đây (mục 8).

## 2. Bảng tóm tắt

| ID | Mức | Phát hiện | file:dòng | Trạng thái |
|---|---|---|---|---|
| LN1 | Trung bình | Chi tiết nhóm, xóa nhóm và danh sách từ trong nhóm dùng Prisma `every`/`_count` không giới hạn theo người học: nếu Prisma sinh `NOT IN (SELECT … FROM group_items …)` / `GROUP BY item_id` trên cả bảng thì thời gian tăng theo tổng `group_items` của **cả hệ thống**; `DELETE` nhóm lớn có thể hết giờ transaction (10 s) → 500 | `src/learning/groups/groups.service.ts:35,89,105-106`; `src/learning/items/items.service.ts:149` | SUSPECTED |
| LN2 | Thấp | Lỗi không phải SMTP (lỗi DB khi tra email hoặc trừ hạn mức) trong `provider.send` bị xếp "không rõ đã giao": giữ `sending`, không thử lại; dòng `sending` đó còn chặn ngày kế tiếp qua `min_gap_days` | `src/notifications/scheduler/reminder-send.service.ts:64-71`; `src/notifications/provider/email.provider.ts:23-26`; `src/notifications/scheduler/mail-error.ts:15-24` | CONFIRMED |
| LN3 | Thấp | Kiểm "nghĩa thấy được" nằm ngoài transaction (thêm từ vào nhóm, thêm nhanh): đua với xóa từ riêng để lại mục học trỏ tới nghĩa đã xóa | `src/learning/items/items.service.ts:43-50`; `src/learning/quick-add/quick-add.service.ts:55-73` | CONFIRMED |
| LN4 | Thấp | Số đếm của cùng một nhóm lệch nhau: `total` ở `GET /v1/groups` bỏ nghĩa đã đổi, `item_count` ở `GET /v1/groups/:id` thì tính; `cells[0].due` còn lọc ngày trái luật M2 | `src/learning/queue/queue.queries.ts:23-24,35-38`; `src/learning/groups/groups.service.ts:76,88` | CONFIRMED |
| LN5 | Thấp | B3E2 sai với từ mới: "Đã biết" lúc 23:59 rồi 00:01 đưa từ mức 0 lên mức 2 (design hứa lần sau "không đổi") | `src/learning/schedule/schedule.ts:33-39` | CONFIRMED |
| LN6 | Thấp | Cảnh báo `mail_budget_80` so với `ceil(0,8 × budget)` còn trần nhắc học là `floor`: budget không chia hết cho 5 thì nhắc học hết phần mà không có cảnh báo (L14 mới sửa một phần) | `src/common/mail/mail-budget.service.ts:13-14,69` | CONFIRMED |
| LN7 | Thấp | `DELETE /v1/items/:id` và bỏ khỏi nhóm cuối không khóa item trước khi xóa; nếu Prisma đọc rồi mới `DELETE` thì `item_removed.level_before` ghi mức cũ khi đua với lượt ôn (phần L4 còn sót) | `src/learning/items/items.service.ts:94-115,190-191` | SUSPECTED |
| LN8 | Thấp | Design 8.3 ghi dòng `sending` của ngày cũ "không tính vào `min_gap_days`"; code và test tính nó như đã gửi | design §8.3; `src/notifications/scheduler/reminder-tick.service.ts:90`; `test/notifications/reminders.e2e-spec.ts:319` | CONFIRMED (lệch tài liệu) |

**Kết luận ngắn:** không thấy lỗi mức Cao. Luật lịch ôn khớp đủ 11 dòng bảng 6.4; thứ tự khóa không tạo đường deadlock; "một email mỗi
ngày địa phương" được giữ bằng unique của DB; nhắc học không thể ăn vào phần hạn mức dành cho OTP. Các bản sửa M2, M6, M7, M9, L1–L3,
L13, L15, L16 và phần Test của review cũ đúng; L4 và L14 mới sửa một phần.

## 3. Từng phát hiện

### LN1 — Trung bình — SUSPECTED — Một số truy vấn của nhóm quét `group_items` của mọi người học

**Chỗ lỗi:** `src/learning/groups/groups.service.ts:35` (`removableWhere`), dùng ở `:89` (`GET /v1/groups/:id`, số từ sẽ bị bỏ) và
`:105-106` (`DELETE /v1/groups/:id`); `src/learning/items/items.service.ts:149` (`group_count` của `GET /v1/groups/:id/items`).

**Cơ chế:**
```ts
// groups.service.ts:35 — "từ chỉ thuộc nhóm này"
const removableWhere = (groupId: string) => ({ groups: { some: { groupId }, every: { groupId } } });
// groups.service.ts:89
tx.learningItem.count({ where: removableWhere(id) }),
// items.service.ts:149
include: { item: { include: { _count: { select: { groups: true } } } } },
```
`every` là "relation filter" (bộ lọc theo bảng liên quan) trên `learning_items`, không có `userId`. Rust engine của Prisma trước đây
dịch `every` thành `id NOT IN (SELECT item_id FROM group_items WHERE NOT group_id = $1 …)`: câu truy vấn con lấy **mọi dòng
`group_items` không thuộc nhóm này, của mọi người học**. `_count` của relation thường được dịch thành `LEFT JOIN (SELECT item_id,
COUNT(*) FROM group_items GROUP BY item_id)`, tức gom nhóm cả bảng. Postgres 17 không đổi `NOT IN (subquery)` thành anti-join (phép
"không tồn tại" dùng index); nó chỉ dựng bảng băm khi kết quả ước tính vừa `work_mem × hash_mem_multiplier` (mặc định 4 MB × 2).
Ước tính mỗi dòng uuid ≈ 40 byte (`subplan_is_hashable`), nên ngưỡng ≈ 210.000 dòng. Quá ngưỡng, với **mỗi** item của nhóm, Postgres
quét lại toàn bộ danh sách con đã lưu tạm: chi phí ≈ (số từ của nhóm) × (tổng `group_items` cả hệ thống).

**Vì sao sai:** design im lặng về hiệu năng các route này. Kỳ vọng hợp lý: mở hay xóa một nhóm chỉ tốn công theo nhóm đó, không theo số
người học khác. Review Focus 5 chỉ đo `GET /v1/groups` (`test/learning/scale.e2e-spec.ts:21`).

**Hậu quả (nếu đúng):** khi tổng `group_items` toàn hệ thống vượt ~210 nghìn (ví dụ 105 người × 2.000 từ, hoặc 1.000 người × 210 từ),
`GET /v1/groups/:id` của nhóm 2.000 từ cần cỡ 2.000 × 210.000 phép so sánh (vài giây). `DELETE /v1/groups/:id` chạy cùng truy vấn trong
transaction `timeout: 10_000` (`groups.service.ts:11`), trong lúc giữ learner lock và khóa dòng của mọi item trong nhóm → có thể hết giờ
→ 500, người học không xóa được nhóm lớn; các thao tác khác của người đó phải chờ. `GET /v1/groups/:id/items` gom nhóm cả bảng ở mỗi trang.

**Đã loại trừ:**
- Index: `group_items` có PK `(group_id, item_id)` và index `item_id`, nhưng `NOT IN` không dùng được index kiểu anti-join.
- Phép đo CI: đúng kịch bản scale test (1 người, 200.000 dòng) ước tính ≈ 7,9 MB < 8 MB nên Postgres vẫn băm được → CI không lộ.
- Chưa thấy SQL thật của Prisma 7.10.0: query compiler là wasm; chuỗi trong wasm có cả `NOT IN` lẫn `NOT EXISTS`. Vì vậy để SUSPECTED.

**Probe đề xuất:**
1. DB riêng (`createIsolatedDatabase`); seed theo cách của `scale.e2e-spec.ts`: một người học "nền" 150 nhóm × 2.000 item (300.000
   `group_items`); người học A có nhóm G 2.000 item (`seedVisibleSenses` + `generate_series`); `ANALYZE`.
2. Lấy SQL thật: `const p = new PrismaClient({ adapter: new PrismaPg({ connectionString }), log: [{ emit: 'event', level: 'query' }] });
   p.$on('query', (e) => sql.push(e.query));` rồi gọi `p.learningItem.count({ where: { groups: { some: { groupId: G }, every: { groupId: G } } } })`
   và `p.groupItem.findMany({ where: { groupId: G }, take: 101, include: { item: { include: { _count: { select: { groups: true } } } } } })`.
   Nghi: có `NOT IN (SELECT … "group_items" … NOT … "group_id" = $…)` và `GROUP BY … "item_id"` không lọc theo trang.
3. `EXPLAIN (ANALYZE, BUFFERS)` hai câu đó (thay tham số) → tìm `SubPlan` **không** có chữ `hashed`; ghi thời gian.
4. Đo qua HTTP (token của A): `GET /v1/groups/G`, `GET /v1/groups/G/items?page_size=100`, `DELETE /v1/groups/G` (có `Idempotency-Key`).
   Kỳ vọng: mỗi route < 500 ms. Nghi: GET chi tiết và DELETE mất vài giây; DELETE có thể trả 500 (transaction timeout).

**Cách sửa gợi ý:** SQL riêng giới hạn theo nhóm, ví dụ `SELECT count(*) FROM group_items gi WHERE gi.group_id = $1 AND NOT EXISTS
(SELECT 1 FROM group_items o WHERE o.item_id = gi.item_id AND o.group_id <> $1)`; `group_count` đếm bằng `groupBy` chỉ trên các
`item_id` của trang. Thêm ba route này vào phép đo scale.

### LN2 — Thấp — CONFIRMED — Lỗi DB trong lúc gửi nhắc bị coi như lỗi SMTP "không rõ đã giao"

**Chỗ lỗi:** `src/notifications/scheduler/reminder-send.service.ts:64-71`; `src/notifications/provider/email.provider.ts:23-26`;
`src/notifications/scheduler/mail-error.ts:15-24`.

**Cơ chế:**
```ts
// reminder-send.service.ts:64-71
try {
  outcome = await provider.send(userId, { kind, language });   // gồm cả đọc email và trừ hạn mức (DB)
} catch (error) {
  const errorKind = classifyMailError(error);
  if (errorKind === 'unknown') {                                // giữ 'sending', không thử lại
    this.logger.warn('reminder_outcome_unknown', …); return;
// email.provider.ts:23-26
const to = (await this.identity.verifiedEmails([userId])).get(userId);
if (!await this.budget.tryConsume({ ceiling: REMINDER_MAIL_SHARE })) return 'budget-exhausted';
```
`classifyMailError` trả `'unknown'` cho mọi lỗi không có `responseCode`, không phải `EDNS`, `syscall: 'connect'` hay timeout trước khi
kết nối (`mail-error.ts:24`). Lỗi Prisma từ `verifiedEmails` hoặc `tryConsume` (ví dụ hết connection pool `P2024`, mất kết nối DB giữa
chừng) rơi vào nhánh này, dù chưa có byte SMTP nào được gửi.

**Vì sao sai:** design 8.3: chỉ "timeout hoặc reset sau khi đã giao thư cho máy chủ" mới là "không rõ"; lỗi trước khi gửi là "chắc chắn
chưa giao" → xóa `sending`, để BullMQ thử lại.

**Hậu quả:** người học mất email nhắc của ngày đó. Dòng `sending` ở lại; từ hôm sau tick tính dòng `sending` ngày cũ như "đã gửi" cho
`min_gap_days` (`reminder-tick.service.ts:90`), nên với mặc định 2 thì ngày kế tiếp cũng bị bỏ (`gap`). Một lỗi DB thoáng qua → hai
ngày không email. Không gửi thừa. Hiếm (cần DB lỗi đúng lúc đó).

**Đã loại trừ:** BullMQ retry không xảy ra vì nhánh `unknown` trả về bình thường (job "completed"); tick sau bị chặn vì đã có dòng của
ngày đó (`reminder-tick.service.ts:85`).

**Probe đề xuất:** trong `test/notifications/reminders.e2e-spec.ts`, khối "one send job": `const user = await learner(ctx);
vi.spyOn(ctx.app.get(IdentityService), 'verifiedEmails').mockRejectedValueOnce(Object.assign(new Error('pool timeout'), { code: 'P2024' }));
await send.send(sendData(user.userId), { lastAttempt: false })`. Kỳ vọng: promise reject, `reminder_deliveries` rỗng. Thực tế theo code:
resolve, một dòng `state: 'sending'`, log `reminder_outcome_unknown`. Đặt clock +1 ngày, `tick()` → không có job.

**Cách sửa gợi ý:** chỉ phân loại lỗi của chính `mailer.send` (ví dụ provider bọc lỗi transport thành `MailTransportError`); lỗi khác
trong provider coi là "chắc chắn chưa giao" (xóa `sending`, ném lại để retry).

### LN3 — Thấp — CONFIRMED — Thêm từ đua với xóa từ riêng để lại mục học "mồ côi"

**Chỗ lỗi:** `src/learning/items/items.service.ts:43-50` (`POST /v1/groups/:id/items`); `src/learning/quick-add/quick-add.service.ts:55-73`
(`POST /v1/quick-add` với `sense_id`).

**Cơ chế:**
```ts
// items.service.ts:43-50
if (!(await this.content.visibleSenseIds(userId, [senseId])).has(senseId)) { … throw notFound(); }
return this.prisma.$transaction(async (tx) => {
  await withLearnerLock(tx, userId);                 // khóa theo người học lấy SAU khi đã kiểm
  await this.groups.assertOwned(tx, userId, groupId);
  return this.linkInTx(tx, userId, groupId, senseId, today);   // không kiểm lại nghĩa
```
`learning_items.sense_id` là UUID thường, không có khóa ngoại sang `senses` (luật D3), nên insert vẫn thành công khi nghĩa đã bị xóa.

**Vì sao sai:** B3E17/CR23: xóa từ riêng thì xóa luôn mục học của nó. `DELETE /v1/my-words/:id` (`quick-add.service.ts:86-89`) lấy
learner lock rồi xóa; nếu nó commit giữa lúc `add` kiểm và lúc `add` lấy lock, `add` tạo mục học mới cho nghĩa vừa xóa.

**Hậu quả:** một mục học không có nội dung trong nhóm, hiện `sense_changed: true`, chiếm một chỗ trong trần 2.000 từ, không bao giờ vào
hàng ôn; xóa lại từ riêng thì 404 (entry đã mất), người học phải gỡ tay. Chỉ xảy ra khi chính người học thao tác song song ở hai tab/máy.
Không lộ dữ liệu người khác: nghĩa riêng của người khác luôn bị chặn ở bước kiểm.

**Đã loại trừ:** learner lock (có, nhưng lấy sau bước kiểm); `ensureItems` (`items.service.ts:169-188`) không kiểm nghĩa; DB không có FK.

**Probe đề xuất:** tạo từ riêng W bằng quick-add (`new_word`), rồi `DELETE /v1/items/{item}` để W không còn học. `const content =
ctx.app.get(ContentService); const real = content.visibleSenseIds.bind(content); vi.spyOn(content, 'visibleSenseIds')
.mockImplementationOnce(async (u, ids) => { const r = await real(u, ids); /* xóa W qua HTTP: DELETE /v1/my-words/{entryId} → 204 */ return r; });`
rồi `POST /v1/groups/{g}/items { sense_id }`. Kỳ vọng 404 và không có `learning_items` cho sense đó. Thực tế theo code: 201 và một dòng
`learning_items` có `sense_id` không còn trong `senses`.

**Cách sửa gợi ý:** kiểm lại "thấy được" bên trong transaction, sau learner lock (cần một hàm Content nhận `tx`).

### LN4 — Thấp — CONFIRMED — Số đếm của cùng một nhóm lệch nhau

**Chỗ lỗi:** `src/learning/queue/queue.queries.ts:35-38` và `:23-24`; `src/learning/groups/groups.service.ts:76,88`.

**Cơ chế:**
```ts
// queue.queries.ts:35 (CTE items, chỉ nghĩa còn thấy được) → :38
count(*)::int AS total,
// queue.queries.ts:23-24 — ngăn mức 0 vẫn lọc theo ngày
Prisma.sql`count(*) FILTER (WHERE level = ${level} AND due_date <= today AND ${notBacklog})`
// groups.service.ts:88 — GET /v1/groups/:id đếm mọi liên kết, kể cả nghĩa đã đổi
tx.groupItem.count({ where: { groupId: id } }),
```
(a) `total` của `GET /v1/groups` bỏ các từ có nghĩa đã bị staff thay hoặc gỡ (B3E21); `item_count` của `GET /v1/groups/:id` và của
`PATCH` (`:76`) thì tính chúng; danh sách `/items` cũng liệt kê chúng (với `sense_changed`).
(b) `cells[0].due` chỉ đếm từ mức 0 có `due_date ≤ hôm nay`, trong khi bản sửa M2 coi từ mức 0 luôn đến hạn (`schedule.ts:33`) và phần
"mới" không lọc ngày (`queue.queries.ts:41,85`).

**Vì sao sai:** design 6.3 im lặng về từ có nghĩa đã đổi; kỳ vọng hợp lý là một nhóm có một con số tổng ở mọi màn. (b) lệch luật M2 vừa chốt.

**Hậu quả:** chỉ hiển thị. Ví dụ: staff gỡ một nghĩa → trang chủ "49 từ", trang nhóm "50 từ". (b) chỉ khi vừa đổi múi giờ về phía tây.
Không ảnh hưởng lịch ôn hay nhắc học (`cardsLeftToday` không dùng `total`/`cell_due`).

**Đã loại trừ:** `cardsLeftToday` (`queue.service.ts:60-68`) và hàng ôn dùng `due_available`/`new_available`, không dùng hai trường này.

**Probe đề xuất:** (a) người học có nhóm 2 nghĩa catalog; `UPDATE senses SET state = 'retired' WHERE id = $1` (hoặc route gỡ của staff);
`GET /v1/groups` → `total: 1`; `GET /v1/groups/{id}` → `item_count: 2`. (b) như probe M2: thêm từ ở `Pacific/Kiritimati` lúc
`2026-11-01T10:30Z`, đổi sang `Etc/GMT+12` → `today.new = 1` nhưng `cells[0].due = 0`.

**Cách sửa gợi ý:** chốt trong design trường nào đếm gì (hoặc trả thêm số từ "nghĩa đã đổi"); bỏ điều kiện ngày cho ngăn mức 0.

### LN5 — Thấp — CONFIRMED — B3E2 không đúng với từ mới (mức 0)

**Chỗ lỗi:** `src/learning/schedule/schedule.ts:33-39`; test `src/learning/schedule/schedule.spec.ts:62` chỉ thử từ mức 2.

**Cơ chế:**
```ts
// schedule.ts:33-39
const wasDue = state.priority || state.level === 0 || state.dueDate <= today;
…
} else if (wasDue) {
  const level = Math.min(state.level + 1, MAX_LEVEL);
  next = { level, dueDate: addDays(today, LEVEL_INTERVALS[level - 1]), priority: false };
```
Mức 0 → 1 hẹn "hôm nay + 1". "Đã biết" lúc 23:59 ngày D → mức 1, hẹn D+1. Bấm lại lúc 00:01 (ngày D+1): `dueDate <= today` → đến hạn
→ mức 2, hẹn D+4.

**Vì sao sai:** design §12 B3E2: "'Đã biết' lúc 23:59, bấm lại lúc 00:01 → lần đầu lên mức; lần sau từ chưa đến hạn → ôn sớm, không đổi".
Câu đó đúng với từ mức ≥ 1 (khoảng ≥ 3 ngày) nhưng sai với từ mới (khoảng 1 ngày). Code theo đúng luật 6.1, nên đây là chỗ design tự
mâu thuẫn.

**Hậu quả:** một lần bấm lặp qua nửa đêm (hàng ôn cũ còn trên màn hình) đẩy từ mới lên mức 2 khi người học mới gặp nó một lần; lần đầu
ăn trần "mới" ngày D, lần sau ăn trần "đến hạn" ngày D+1.

**Đã loại trừ:** idempotency theo `review_id` chỉ chặn gửi lại cùng một `review_id`; hai lần bấm là hai `review_id`.

**Probe đề xuất:** unit `applyAnswer(applyAnswer(state(0,'2026-11-05'),'known','2026-11-05',60).next,'known','2026-11-06',60)` → theo
B3E2 kỳ vọng không đổi; thực tế `{ level: 2, dueDate: '2026-11-09' }`. E2e: clock `2026-11-05T16:59Z` (23:59 ở `Asia/Ho_Chi_Minh`),
thêm từ, "known"; clock `17:01Z`, "known" với `review_id` khác → mức 2.

**Cách sửa gợi ý:** chủ dự án chọn: chấp nhận và sửa câu B3E2, hoặc coi "Đã biết" trên item vừa ôn trong vòng vài phút là ôn sớm
(dựa vào `last_reviewed_at`).

### LN6 — Thấp — CONFIRMED — Ngưỡng cảnh báo 80% lệch với trần của nhắc học (L14 còn sót)

**Chỗ lỗi:** `src/common/mail/mail-budget.service.ts:13-14` và `:69`.

**Cơ chế:**
```ts
// mail-budget.service.ts:13-14 — trần của nhắc học
export function mailLimit(budget: number, share: number): number { return Math.floor(share * budget); }
// mail-budget.service.ts:69 — điều kiện cảnh báo
if (sent === Math.ceil(0.8 * this.config.mailDailyBudget)) { this.logger.warn('mail_budget_80', …) }
```
`tryConsumeBelow` (đường của nhắc học) dừng ở `floor(0,8 × budget)`; cảnh báo chỉ bắn khi `sent === ceil(0,8 × budget)`. Hai số trùng nhau
khi budget chia hết cho 5 (mặc định 1.500 → 1.200, đúng). Với budget khác (7, 499, 1.501…) nhắc học dùng hết phần của mình mà không có
cảnh báo; cảnh báo chỉ bắn nếu sau đó một OTP rơi đúng vào số `ceil`.

**Vì sao sai:** L14 và bản sửa PR #39 ("warn at 80% of the mail budget from reminder sends too").

**Hậu quả:** mất log cảnh báo vận hành khi cấu hình budget không chia hết cho 5. Không ảnh hưởng việc gửi.

**Đã loại trừ:** test L14 (`test/common/mail-budget.e2e-spec.ts:55`) dùng budget 10 (0,8 × 10 = 8 tròn) nên không lộ.

**Probe đề xuất:** `test/common/mail-budget.e2e-spec.ts`: `budgetFor(7)`, `consume(budget, 7, { ceiling: REMINDER_MAIL_SHARE })` → 5 lần
`true`. Kỳ vọng: một log `mail_budget_80`. Thực tế theo code: không có.

**Cách sửa gợi ý:** so với `mailLimit(budget, REMINDER_MAIL_SHARE)` thay cho `Math.ceil(0.8 * budget)`.

### LN7 — Thấp — SUSPECTED — Bỏ khỏi việc học / bỏ khỏi nhóm cuối không khóa item trước khi xóa

**Chỗ lỗi:** `src/learning/items/items.service.ts:94-105` (`removeFromGroup`), `:108-115` (`forget`), `:190-196` (`deleteItem`).

**Cơ chế:**
```ts
// items.service.ts:111-113 (forget): chỉ learner lock, rồi
await this.deleteItem(tx, userId, itemId, null, profile.timezone);
// items.service.ts:191, 193-195
const item = await tx.learningItem.delete({ where: { id: itemId } });
… kind: 'item_removed', levelBefore: item.level, dueBefore: item.dueDate …
```
`ReviewsService.answer` chỉ khóa dòng item (`reviews.service.ts:39-40`), không lấy learner lock. Nếu Prisma thực hiện `delete` bằng
`SELECT` rồi `DELETE` (như Rust engine cũ), `SELECT` đọc bản trước khi lượt ôn commit, `DELETE` chờ khóa rồi xóa bản mới → `level_before`
ghi mức cũ. Nếu Prisma 7.10.0 dùng `DELETE … RETURNING` thì Postgres trả bản mới sau khi chờ khóa → đúng. Chưa kiểm được trong phiên này.

**Vì sao sai:** comment của chính `src/learning/learning-lock.ts:8-11` ("any write that reads an item's level or date and then changes or
logs it takes this lock first (L4)"); bản sửa L4 áp cho `relearn` và xóa nhóm nhưng không cho hai đường này.

**Hậu quả:** chỉ nhật ký `item_removed` sai (mức/ngày hẹn trước khi xóa) khi hai máy thao tác cùng lúc; ảnh hưởng dữ liệu cho FSRS sau
này. Item vẫn bị xóa đúng; không mất lượt ôn (DELETE tự chờ khóa dòng).

**Đã loại trừ:** learner lock không chặn lượt ôn (lượt ôn không lấy nó); thứ tự khóa không tạo deadlock.

**Probe đề xuất:** chép test L4 của nhóm (`test/learning/groups.e2e-spec.ts:193`): mở transaction giữ `SELECT id FROM learning_items WHERE
id = $1 FOR UPDATE` rồi `update { level: 1, dueDate: 2026-11-02 }`; gọi song song `DELETE /v1/items/{id}` (ca 2: `DELETE
/v1/groups/{g}/items/{id}` với nhóm cuối); chờ 500 ms, thả khóa. Kỳ vọng log `item_removed` có `levelBefore: 1`, `dueBefore: 2026-11-02`.
Nghi: `levelBefore: 0`.

**Cách sửa gợi ý:** gọi `lockItems(tx, userId, [itemId])` trước khi xóa ở `forget` và `removeFromGroup`.

### LN8 — Thấp — CONFIRMED (lệch tài liệu) — Design 8.3 và code nói ngược nhau về dòng `sending` ngày cũ

**Chỗ lỗi:** design Bước 3 §8.3 (câu thêm ở commit `bb74749`); `src/notifications/scheduler/reminder-tick.service.ts:90-91`;
`src/notifications/scheduler/eligibility.ts:14-20`; test `test/notifications/reminders.e2e-spec.ts:319`.

**Cơ chế:** design: "Dòng `failed`, và dòng `sending` của ngày cũ, tính vào trần 'email lâu rồi tối đa một lần mỗi 7 ngày', không tính vào
khoảng cách `min_gap_days`." Code:
```ts
// reminder-tick.service.ts:90-91
sentDates: own.filter((row) => row.state !== 'failed').map(…),   // có 'sending' ngày cũ → dùng cho min_gap_days
failedDates: own.filter((row) => row.state === 'failed').map(…),
```
và test ở dòng 319 chốt "a sending row left from yesterday counts as sent for min_gap_days". Commit sửa `e03fa4a` cũng ghi "an older
sending day counts as sent".

**Vì sao sai:** design là tài liệu build chính thức; hai nơi nói ngược nhau. Hành vi của code hợp với D37 ("mất một email còn hơn gửi
trùng": dòng `sending` có thể đã giao) và với đề xuất L13, nên chỗ cần sửa có lẽ là câu design.

**Hậu quả:** không có lỗi chạy; người đọc design hiểu sai luật khi làm Bước sau (push, mẫu email).

**Đã loại trừ:** không phải cách đọc khác của câu: chủ ngữ "Dòng `failed`, và dòng `sending` của ngày cũ" đi với cả hai vế.

**Cách sửa gợi ý:** sửa câu design 8.3: `failed` chỉ tính vào trần "lâu rồi"; `sending` ngày cũ tính như đã gửi cho cả hai.

## 4. Test gaps

| # | Tiêu chí | Thiếu gì | Gợi ý |
|---|---|---|---|
| TG1 | B4E38 ("admin lưu `max_questions_per_session` nhỏ hơn `default_questions_per_session` → 400, không lưu") | Test mang tên B4E38 (`test/settings/settings.e2e-spec.ts:187`) chỉ thử **nâng `default`** lên 30 khi `max` = 20. Chưa thử đúng vế "When": **hạ `max`** dưới `default` đang lưu. Code đúng (luật chéo kiểm trên giá trị đã gộp, `src/settings/settings.definitions.ts:125-132`), nhưng không có test giữ nó | PUT `default_questions_per_session: 15` (v0→1), rồi PUT `max_questions_per_session: 10` (v1) → 400, `violations` gọi tên `default_questions_per_session`, đọc lại vẫn version 1 |
| TG2 | Design 8.3 "chắc chắn chưa giao → thử lại" | Không test lỗi không phải SMTP trong `provider.send` (LN2) | probe LN2 |
| TG3 | Review Focus 5 (quy mô) | `scale.e2e-spec.ts` chỉ đo `GET /v1/groups`; không có dòng `learning_log` (CTE đếm trần chạy trên bảng rỗng), không có người học khác; không đo `GET /v1/groups/:id`, `DELETE /v1/groups/:id`, `GET /v1/groups/:id/items`, `queue?mode=all` | probe LN1; thêm ~1 năm nhật ký cho người học đo |
| TG4 | B3E2 | Chỉ thử từ mức 2 (`schedule.spec.ts:62`); từ mức 0 cho kết quả khác (LN5) | probe LN5 |
| TG5 | L4 / B3E5 cho `DELETE /v1/items/:id` và bỏ khỏi nhóm cuối | Chưa có test đua với lượt ôn (LN7) | probe LN7 |

## 5. Trạng thái các phát hiện cũ

| ID cũ | Trạng thái | Bằng chứng |
|---|---|---|
| M2 | Đã sửa | PR #40 (`45d184e`): `src/learning/schedule/schedule.ts:33` (`state.level === 0`); test `schedule.spec.ts:89`, `test/learning/queue.e2e-spec.ts:293`. Phần đếm `cells[0].due` còn lệch nhỏ (LN4b) |
| M6 (phía Learning/Notifications) | Đã sửa | PR #39 (`79abfd4`): cột `users.last_seen_at` (migration `20261018090000_users_last_seen_at`, có backfill), ghi ở `src/identity/sessions/session.service.ts:54,186`, đọc ở `identity.service.ts:63-77`, dùng ở `eligibility.ts:35`; test `test/identity/reminder-reads.e2e-spec.ts:62` |
| M7 | Đã sửa | PR #38 (`e03fa4a`): 5xx → `failed` + `UnrecoverableError` (`reminder-send.service.ts:73-79`); `failedDates` vào trần "lâu rồi", không vào `min_gap_days` (`reminder-tick.service.ts:91`, `eligibility.ts:41-44`); test `reminders.e2e-spec.ts:184,307,454` |
| M9 | Đã sửa (có lỗ phụ) | PR #38: `mail-error.ts:15-24`, `reminder-send.service.ts:68-71` giữ `sending` khi không rõ; test `reminders.e2e-spec.ts:193`, `mail-error.spec.ts` (có ca nodemailer thật). Lỗ phụ: lỗi không phải SMTP cũng rơi vào "không rõ" → LN2 |
| L1 | Đã sửa | D48; PR #40: `schedule.ts:24`, `queue.queries.ts:39,78`; test `schedule.spec.ts:102`, `queue.e2e-spec.ts:363,385` |
| L2 | Đã sửa | PR #40: section `backlog` (migration `20261018100000_learning_backlog_section`), `schedule.ts:24`; không đếm vào trần (`queue.queries.ts:48-49`); test `schedule.spec.ts:94`, `queue.e2e-spec.ts:315` |
| L3 | Đã sửa | PR #40: `items.service.ts:75` (`Number.POSITIVE_INFINITY`), `:83-88`; test `test/learning/items.e2e-spec.ts:347` |
| L4 | Sửa một phần | PR #40: `relearn` (`backlog.service.ts:78`) và xóa nhóm (`groups.service.ts:103-104`) khóa item; test `backlog.e2e-spec.ts:116`, `groups.e2e-spec.ts:193`. Chưa áp cho `forget` và bỏ khỏi nhóm cuối → LN7 (SUSPECTED) |
| L13 | Đã sửa | PR #38: job trễ sang ngày địa phương khác bị bỏ (`reminder-send.service.ts:47-49`); `sending` ngày cũ tính như đã gửi (`reminder-tick.service.ts:90`); test `reminders.e2e-spec.ts:204,319`. Design 8.3 ghi ngược → LN8 |
| L14 | Sửa một phần | PR #39 (`89e5540`): `warnAt80` gọi ở cả hai đường (`mail-budget.service.ts:45,63`); test budget 10 (`test/common/mail-budget.e2e-spec.ts:55`). Lệch `floor`/`ceil` khi 0,8 × budget không tròn → LN6 |
| L15 | Đã sửa | PR #38: `REMINDER_RETRY_BACKOFF_MS` mặc định 60.000 (`app-config.ts:189`), dùng ở `reminder-queue.service.ts:75`; chạy tay bước 15 (`buoc-3-test-flow.md`) thấy 60 s rồi 120 s |
| L16 | Đã sửa | PR #39 (`79abfd4`): `status: 'active'` ở `identity.service.ts:82` (`verifiedEmails`) và `:66` (`listReminderCandidates`) |
| Test (Review Focus 4, T-D1…T-D6) | Đã sửa | `reminders.e2e-spec.ts:228` (hai process gọi `send` cùng lúc, 5 vòng → 1 email/vòng), `:425` (T-D2 đọc hàng đợi BullMQ), `:442` (T-D3 worker thật thử lại thành 1 email), `:370` (T-D4 đổi múi giờ về phía đông), `:328` (T-D5 `Etc/GMT+12`), `:213` (T-D6 OTP thật qua route), `:479` (hai worker cùng prefix cùng tick → 1 email) |
| Test T-C1…T-C8 | Đã sửa | `queue.e2e-spec.ts:335` (T-C1), `reviews.e2e-spec.ts:269` (T-C2), `:238` (T-C3), `queue.e2e-spec.ts:351` (T-C4), `groups.e2e-spec.ts:182` + `items.e2e-spec.ts:357` (T-C5), `metrics.e2e-spec.ts:22` (T-C6, route thật), `quick-add.e2e-spec.ts:83` (T-C7 đọc lại toàn bộ), `items.e2e-spec.ts:136,187` (T-C8 đủ cột) |

## 6. Đã kiểm, không thấy vấn đề

**Lịch ôn (hàm thuần)**
- 11 dòng bảng 6.4: dòng 1–10 qua `newItem`/`applyAnswer`/`relearn`/`isBacklog` (`schedule.ts:13-51`), thang `[1,3,7,14,30]` dùng
  `LEVEL_INTERVALS[level - 1]` (`schedule.ts:39`, `learning.constants.ts:2`): 0→1 +1, 1→2 +3, 2→3 +7, 3→4 +14, 4→5 +30, 5→5 +30; dòng 9
  (1/9 → 2/11 = 62 ngày > 60); dòng 11 = một item mỗi `(user, sense)` (unique `learning_items_user_id_sense_id_key`) + log ghi
  `groupId: input.groupId` (`reviews.service.ts:63`) + trần đếm theo `l.group_id` (`queue.queries.ts:47-52`). Test bảng ở `schedule.spec.ts:8`.
- "Cần ôn tập" luôn mức 1, hẹn hôm nay, ưu tiên (`schedule.ts:35-36`); ôn sớm "Đã biết" không đổi gì, `was_due=false` (`:40-42`);
  backlog thắng cờ ưu tiên (D48, `:24`); mức 0 không bao giờ vào backlog (`:49-51`).
- Ngày theo múi giờ: `localDate`/`localTime` dùng `Intl` với IANA zone và `hourCycle: 'h23'` (`src/common/time/local-date.ts:7-8,20-29`);
  `addDays`/`daysBetween` tính trên nửa đêm UTC nên không bị DST (`:41-48`). Múi giờ được kiểm khi đăng ký và khi `PATCH /v1/me`
  (`auth.service.ts:43`, `identity.service.ts:89`), nên tick không gặp zone hỏng.
- Không có `now()`/`CURRENT_DATE` trong SQL của `src/learning` (mọi "hôm nay" truyền từ `Clock`).

**Trần mỗi nhóm và đồng thời**
- Trần đếm từ nhật ký: `kind = 'review' AND group_id IS NOT NULL`, `section IN ('due','new')`, đúng `local_date` (`queue.queries.ts:46-52,91-95`);
  kẹp không âm (`queue.service.ts:26-32,82-83`); B3E9 hạ trần giữa ngày đúng.
- Lượt ôn: một transaction, `SELECT … FOR UPDATE` trên dòng item (`reviews.service.ts:39-41`), tra `review_id` trước và sau khóa
  (`:37,43`), kiểm liên kết nhóm của chính người học (`:45-48`); cùng `review_id` khác item → P2002 → 400 (`:74-80`). Hai máy cùng bấm
  một từ chạy tuần tự (B3E5).
- Thứ tự khóa: mọi thao tác ghi nhiều item lấy learner lock (`learning-lock.ts:4-6`, advisory lock theo người học) rồi khóa item theo
  thứ tự id (`:12-16`); lượt ôn chỉ giữ một khóa dòng và không chờ learner lock → không có vòng chờ (deadlock). Chèn `group_items` (FK
  KEY SHARE lên item) chỉ chờ lượt ôn, lượt ôn không chờ ngược.
- Xóa từ riêng đua với lượt ôn: `learningItem.deleteMany` chờ khóa dòng, câu `learningLogEntry.deleteMany` sau đó thấy cả dòng log của lượt
  ôn vừa commit (READ COMMITTED, ảnh chụp mới mỗi câu) (`quick-add.service.ts:88-89`).
- `Idempotency-Key` gắn theo `request.path` cụ thể (`idempotency.interceptor.ts:59`) → dùng lại một key cho hai nhóm khác nhau không phát lại
  nhầm kết quả.

**Hàng ôn, danh sách cân nhắc, học lại, ưu tiên**
- Thứ tự ưu tiên → đến hạn (quá hạn lâu trước, rồi mức thấp trước) → mới (thêm vào nhóm sớm trước) (`queue.queries.ts:76-85`); đếm ở trang
  chủ dùng đúng cùng điều kiện (`:39-42`). `mode=all` gồm mọi item một lần, ngẫu nhiên, không trần (`:86-87`).
- Backlog: mức ≥ 1, quá hạn > N ngày, gồm cả từ ưu tiên (D48), phân trang keyset (`backlog.service.ts:36-70`); "Học lại" khóa item, chỉ đổi
  item của chính người học còn trong backlog, về mức 0, hẹn hôm nay, bỏ ưu tiên, log `relearn` không đếm trần (`:73-94`).
- Nghĩa đã đổi (B3E21): loại khỏi hàng ôn và số đếm qua `visibleSenseCondition`, vẫn hiện `sense_changed` ở `/items` (`items.service.ts:153-158`).

**Thêm, bỏ, xóa**
- Thêm cả loạt: lấy mọi ứng viên rồi mới cắt theo chỗ trống, báo đủ `already_in_group`, `skipped_function_words`, `skipped_group_full`
  (`items.service.ts:71-91`); trần 2.000 và nhóm thứ 101 đếm dưới learner lock (`:63-65`, `groups.service.ts:48-51`).
- Thêm hai lần cùng nghĩa: `INSERT … ON CONFLICT DO NOTHING` rồi đọc lại (`items.service.ts:169-188`).
- Thêm nhanh: từ riêng + câu + mục học + liên kết trong một transaction; mọi lỗi (nhóm đầy, quá 5 câu, quá 1.000 từ riêng, 404) làm rollback
  toàn bộ (`quick-add.service.ts:52-81`); đúng một trong `sense_id`/`new_word`, `group_id` bắt buộc (`quick-add.controller.ts:17-30`).
- Xóa nhóm: chỉ bỏ item không thuộc nhóm nào khác (`groups.service.ts:35,105-111`), log `item_removed` từng item (`:112-115`).
- Bỏ khỏi nhóm / bỏ khỏi việc học: đúng nhóm của người học, nhóm cuối thì xóa item, log giữ (`items.service.ts:94-115`).
- Xóa từ riêng: Content (entry, nghĩa, câu) + Learning (item, liên kết qua cascade, log theo `sense_id`) trong một transaction
  (`quick-add.service.ts:84-91`).
- Không lộ dữ liệu người khác: mọi route kiểm chủ (`assertOwned`, `user_id` trong SQL khóa, `visibleSenseIds` theo người gọi);
  `GET /v1/items?sense_ids` lọc theo người gọi (`items.service.ts:117-129`).
- Ranh giới D3: grep `prisma.|tx.(sense|entry|user|sessionChain|…)` trong `src/learning`, `src/notifications`, `src/settings`,
  `src/entitlements` → 0 kết quả (đối chứng: `tx.learningItem` có kết quả); SQL thô chỉ chạm bảng `learning_*`/`group_items` và
  `visibleSenseCondition` đã duyệt; `src/common` không import Identity.

**Settings**
- Khoảng cho phép khớp design §9 và Bước 4 §5.4 (`settings.definitions.ts:25-47`); chỉ `type_word_max_retries` nhận `null`
  (`:78`); `withDefaults` giữ `null` đã lưu (`:146-154`); lịch sử ghi `Prisma.JsonNull` (`settings.service.ts:71`).
- Luật chéo kiểm trên giá trị đã gộp nên áp dụng khi **bất kỳ** trường nào đổi: `stop_after_days > inactive_after_days` và
  `default_questions_per_session ≤ max_questions_per_session` (`settings.definitions.ts:125-132`).
- `version`: so rồi `updateMany WHERE version` (`settings.service.ts:49,62-63`); hai lần lưu đầu tiên cùng lúc → P2002 → 409 (`:78`).
- `settings.manage` chỉ `admin` (`identity.types.ts:9-10`), gắn ở cấp controller (`admin-settings.controller.ts:18`), guard đọc cả handler
  lẫn class; PUT có `@Idempotent()` + `user.write` (`:29-31`).
- Không có cache: `SettingsService.get()` đọc DB mỗi lần (`settings.service.ts:36-43`) → API và worker luôn thấy giá trị mới, không có
  giá trị cũ sau khi admin đổi.

**Nhắc học**
- Một scheduler (`upsertJobScheduler` với id cố định, `reminder-queue.service.ts:58-61`) dù chạy nhiều worker; tick trùng không sinh email
  thứ hai vì `jobId = reminder-<user>-<ngày địa phương>` (không có `:`) (`:22-24,73-77`) và unique `(user_id, local_date)` của
  `reminder_deliveries` (migration `20261017130000_notifications`).
- Điều kiện: đã xác minh và `status = 'active'` (`identity.service.ts:66`), tắt toàn hệ thống hoặc người học tắt (`channel-chooser.ts:19-21`,
  kiểm lại khi gửi), qua giờ gửi theo giờ địa phương (`eligibility.ts:34`), vắng tính bằng ngày lịch địa phương từ `last_seen_at`
  (`:35`), > 60 ngày dừng (`:36`), 7–60 ngày "lâu rồi" tối đa 7 ngày một lần (`:41-43`), `min_gap_days` (`:44`); ngày "tương lai" sau khi
  đổi múi giờ về phía tây cho khoảng cách âm → bị chặn đúng.
- Còn thẻ hôm nay sau trần: cùng `cardsLeftToday` với trang chủ, kiểm ở tick (`reminder-tick.service.ts:99`) và kiểm lại khi gửi
  (`reminder-send.service.ts:54`).
- Ba trạng thái gửi: thấy `sent`/`sending`/`failed` → bỏ (`:45-46`); 4xx/chưa kết nối → xóa dòng, thử lại 60 s rồi 120 s; 5xx → `failed`,
  không thử lại; không rõ → giữ `sending` (`:64-82`); `lastAttempt` khớp `attemptsMade` của BullMQ 6.3.12 (`reminder-queue.service.ts:85`).
- Job chạy trễ qua nửa đêm địa phương → bỏ (`reminder-send.service.ts:47-49`).
- Nội dung email: chữ thường, chung chung, không liệt kê từ, có link `<LEARNER_APP_URL>/<vi|en>/app/settings` (D39)
  (`reminder-message.ts:8,12-14,30-33`); `LEARNER_APP_URL` buộc đúng origin, không có `/` cuối (`app-config.ts:168-172`).
- Log không chứa email: logger chỉ giữ `name`, `code` của lỗi (`app-logger.ts:19-27`), log nhắc học chỉ có `user_id`.
- Worker: `worker.ts` bật `runWorkers`; API process không tạo queue/worker nhắc học (`reminder-queue.service.ts:54`).

**Hạn mức email**
- Trần 80% của nhắc học là một câu SQL nguyên tử `INSERT … ON CONFLICT … WHERE sent < limit` (`mail-budget.service.ts:55-65`); lần bị từ
  chối không tăng bộ đếm; tick và provider dừng ở cùng con số (`reminder-tick.service.ts:46`, `email.provider.ts:26`).
- **Nhắc học không thể làm đói email bảo mật:** `floor(0,8 × budget) ≤ budget − 1` với mọi budget ≥ 1, nên OTP và đặt lại mật khẩu (đường
  `MailDispatcher`, `mail-dispatcher.service.ts:71`) luôn còn ít nhất 20% (tối thiểu 1 thư); OTP vẫn lên tới 100%. Test OTP thật qua route ở
  `reminders.e2e-spec.ts:213`.

**Entitlements stub và rate limit Bước 4 (PR #49)**
- `EntitlementsService.check` luôn `{ allowed: true }` (`entitlements.service.ts:11-12`), module đăng ký trong `AppModule`
  (`app.module.ts:8,19`), `index.ts` export đúng `EntitlementsModule`, `EntitlementsService`, `type Feature`.
- Rule `practice.answer` = 120 lần / 60 s theo người dùng (`app-config.ts:102`), có trong `DEFAULT_LIMITS` nên `RateLimiter` đọc được
  (`rate-limiter.service.ts:18`); chưa route nào dùng (Practice chưa có trong snapshot) — đúng plan.

**Quy mô (N+1)**
- Không có N+1 trong `GET /v1/groups` (một câu SQL cho mọi nhóm, `queue.service.ts:46-57`), hàng ôn (số câu cố định), backlog (một câu +
  nội dung theo lô), `/items` (một trang + một lần kiểm thấy được), tick (một trang 500 người = vài câu). Vấn đề quy mô duy nhất thấy được
  là kiểu truy vấn ở LN1.

## 7. Declined to judge / Ngoài phạm vi

**Declined to judge**
- Bộ đếm hạn mức email theo ngày UTC, trong khi hạn mức của nhà cung cấp SMTP thường tính 24 giờ trượt: review cũ đã ghi là hệ quả đã biết.
- P1 (xuất "chưa có nghĩa" vượt 5.000) và P2 (không có log khi thử lại SMTP) của lần chạy tay: đang chờ chủ dự án chọn.
- Thứ tự giữa các từ trong phần ưu tiên (B3#4 "đứng đầu" khi có nhiều từ ưu tiên): design im lặng; code xếp theo lúc thêm vào nhóm.
- Thêm cả loạt với bộ lọc rỗng lấy 2.000 nghĩa catalog đầu tiên theo chữ cái; thêm nhanh một từ đang học vào nhóm đầy thì mất luôn câu kèm theo:
  design im lặng, không coi là lỗi.

**Ngoài phạm vi (một dòng mỗi ý)**
- Toàn hệ thống không giới hạn tần suất cho route đọc (theo SR14); `GET /v1/groups/:id/queue?mode=all` trả tới 2.000 thẻ kèm nội dung mỗi lần gọi.
- `MailDispatcher` (OTP, Identity/common): nếu hạn mức hết giữa lúc kiểm trước và lúc gửi sau response, thư bị bỏ im lặng sau khi đã trả 202.
- `last_seen_at` chỉ cập nhật ở nhánh xoay refresh token, không ở nhánh "grace" 10 giây (`session.service.ts:186`) — không đáng kể.
- `src/learning/learning.module.ts:3` import `ContentModule` thẳng từ `content.module.js` (index của Content không export module); review cũ đã chấp nhận.

## 8. Chưa kiểm

- **PR #50** (`94cdb6e`, đã merge vào `dev` ở máy chính sau snapshot): `practiceReview`, `learning_log.origin`, cổng `PRIVATE_SENSES_CLEANUP`
  trong `deleteMyWord`. Cũng chưa có trong snapshot: Task 3 (Learning cho Practice đọc) và Task 5 (trần từ ôn để trống, D35/B4E44–B4E46).
- Không chạy gì: SQL thật của Prisma 7.10.0 cho `every`, `_count` và `delete` (LN1, LN7) chưa được quan sát; cần probe.
- Các hàm Content mà Learning gọi (`cardContent`, `listSentences`, `createPrivateSense`, `deletePrivateEntryContent`, `addSentence`) chỉ đọc chữ ký;
  nội dung thuộc lát cắt Content.
- Chi phí tick với hàng nghìn người học nhiều nhóm; chi phí CTE đếm trần khi một người học có nhiều tháng nhật ký (index
  `(user_id, group_id, local_date)` không có `group_id` trong điều kiện); `bulkCandidates` khi catalog vượt vài chục nghìn nghĩa (danh sách
  `IN` lớn trong `items.service.ts:79-81`).
- Hành vi BullMQ Job Scheduler khi Redis khởi động lại và gửi đúng giờ trên server UTC (design §14, chỉ kiểm được khi Deploy).
