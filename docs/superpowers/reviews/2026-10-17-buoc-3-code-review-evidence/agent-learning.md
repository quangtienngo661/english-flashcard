# Review — Learning module (Bước 3), `4651fbe..5aa4085`

Phạm vi: `apps/api/src/learning/**`, `src/common/time/local-date.ts`, `src/content/learner/visible-senses.ts`,
`prisma/models/learning.prisma`, migration `20261017210000_learning`, rule `learning.review` trong
`src/common/config/app-config.ts`, test `test/learning/*`, `test/support/learning-metrics.ts`.
Đường dẫn dưới đây tính từ `apps/api`.

Đã chạy: `pnpm exec vitest run src/learning/schedule/schedule.spec.ts src/common/time/local-date.spec.ts` → 2 file, 10 test pass.
Script kiểm Intl/time: `scratchpad/review/time-check.mjs` (chép lại logic của `local-date.ts` + `schedule.ts`, chạy bằng Node).
**Không chạy** e2e nào (kể cả `scale.e2e-spec.ts`): mọi nhận định về e2e là đọc code.

Tóm tắt: 1 medium, 4 low (runtime), 8 low (test gap). Không thấy lỗi high (không lộ dữ liệu người khác, không mất dữ liệu).

---

## Findings

### F1 — medium — từ mức 0 có `due_date` ở tương lai (sau khi đổi múi giờ về phía tây, B3E1) không học được: "Đã biết" không đổi gì nhưng vẫn ăn trần từ mới, thẻ ở lại mãi trong `mode=due` — CONFIRMED-BY-READING (+ script)

- `src/learning/schedule/schedule.ts:29` — `wasDue` không coi mức 0 là đến hạn:
  ```ts
  const section = sectionOf(state, today);                 // level 0 → 'new' bất kể due_date
  const wasDue = state.priority || state.dueDate <= today;  // level 0, due ngày mai → false
  ...
  } else { next = state; }                                  // "known" → không đổi
  ```
- `src/learning/queue/queue.queries.ts:83` — phần "mới" của queue không lọc `due_date`:
  `${base} AND NOT i.priority AND i.level = 0 ORDER BY gi.added_at, i.id LIMIT ...`; đếm ở `:41`
  `count(*) FILTER (WHERE NOT priority AND level = 0)` cũng vậy.
- Log ghi `section = 'new'` (`src/learning/reviews/reviews.service.ts:65`) → `new_done` +1 (`queue.queries.ts:49`).

Kịch bản (script in ra đúng như vậy): learner ở `Asia/Ho_Chi_Minh` thêm từ lúc `2026-11-01T17:30Z` (00:30 ngày 02/11 giờ VN)
→ item mức 0, hẹn `2026-11-02`. Cùng lúc app `PATCH /v1/me` sang `America/New_York` → "hôm nay" = `2026-11-01`.
`GET /v1/groups/:id/queue` trả thẻ đó ở `section: 'new'`. `POST /v1/reviews {answer: 'known'}` → 200
`{ level: 0, due_date: '2026-11-02', section: 'new' }`, `changed=false`, `was_due=false`, nhưng log `section='new'`.
Lần đọc queue sau thẻ vẫn ở đó; bấm 20 lần là hết trần 20 từ mới của nhóm hôm đó mà từ không lên mức.
`cardsLeftToday` cũng đếm thẻ này → có thể gửi email nhắc cho một thẻ không học được. Chỉ xảy ra trong ≤ 2 ngày
(chênh tối đa UTC+14 ↔ UTC−12), chỉ khi đổi múi giờ về phía tây đúng hôm thêm/học lại từ.

Sửa đề xuất (một dòng): `const wasDue = state.priority || state.level === 0 || state.dueDate <= today;` — khớp 6.2 ("Mới: mức 0",
không điều kiện ngày) và 6.4 dòng 2. Cách khác: lọc `due_date <= today` ở phần mới (`:41`, `:83`) — nhưng khi đó từ "biến mất" khỏi
queue tới hôm sau, khó hiểu hơn.

Test để chứng minh:
- unit `schedule.spec.ts`: `applyAnswer(state(0, '2026-11-02'), 'known', '2026-11-01')` → kỳ vọng
  `{ next: state(1, '2026-11-02'), section: 'new', wasDue: true, changed: true }` (hiện trả `next = state(0, '2026-11-02')`, `changed: false`).
- e2e `queue.e2e-spec.ts`: `ctx.clock.set(new Date('2026-11-01T17:30:00Z'))`; seed 1 item `{ level: 0, dueDate: '2026-11-02' }`;
  `ctx.prisma.user.update({ where: { id: me.userId }, data: { timezone: 'America/New_York' } })`; queue → `[[id, 'new']]`;
  `answer(token, id, g)` → kỳ vọng `{ level: 1, due_date: '2026-11-02' }`; queue lần sau `[]`.

### F2 — low — `POST /v1/groups/:id/items/bulk` báo thiếu `skipped_group_full` (và `already_in_group`) khi bộ lọc khớp nhiều hơn `2000 + số từ đang có` — CONFIRMED-BY-READING

- `src/learning/items/items.service.ts:75-76`: `bulkCandidates(filter, GROUP_ITEMS_MAX + size)`;
  `src/content/private/private-words.service.ts:242`: `words.slice(0, limit)` — phần khớp sau `limit` bị cắt trước khi đếm.
- `items.service.ts:89`: `skipped_group_full: fresh.length - toAdd.length` chỉ đếm trong tập đã cắt.

Kịch bản: nhóm rỗng, bộ lọc `{ pos: 'noun' }` khớp 2.005 nghĩa catalog → `limit = 2000` → trả
`{ added: 2000, already_in_group: 0, skipped_function_words: x, skipped_group_full: 0 }` trong khi 5 nghĩa không được thêm vì nhóm đầy.
B3E22 yêu cầu "trả số đã thêm, số bỏ qua". Không ghi sai dữ liệu, chỉ con số sai. Sửa: Content trả thêm tổng số từ khớp
(`words.length`), Learning tính `skipped_group_full = (tổng khớp − đã trong nhóm) − added`, `already_in_group` đếm bằng SQL trên toàn bộ.

Test: `seedVisibleSenses(ctx.prisma, 2005, 'bulk')` (noun, catalog), nhóm rỗng, `bulk(token, g, { pos: 'noun' })` → kỳ vọng
`{ added: 2000, already_in_group: 0, skipped_function_words: 0, skipped_group_full: 5 }` (hiện ra `skipped_group_full: 0`).

### F3 — low (câu hỏi thiết kế) — từ "ưu tiên" quá hạn > N ngày nằm ở **cả** phần ưu tiên của queue **và** danh sách cân nhắc; `GET /v1/groups` đếm nó hai lần — CONFIRMED-BY-READING

- Queue ưu tiên không loại backlog: `queue.queries.ts:77` `${base} AND i.priority ORDER BY ...`.
- Đếm: `:39` `priority` = `count(*) FILTER (WHERE priority)`; `:42` `backlog` = `count(*) FILTER (WHERE NOT notBacklog)` — không loại `priority`.
- Danh sách cân nhắc: `src/learning/backlog/backlog.service.ts:51-52` — `i.level >= 1 AND today - due_date > N`, không lọc `priority`.

Kịch bản: bấm "Cần ôn tập" (mức 1, hẹn 01/09, ưu tiên), không mở app tới 02/11 (62 ngày). `GET /v1/groups` → `today.priority: 1`
**và** `backlog: 1`; thẻ đứng đầu queue và cũng có trong `GET /v1/groups/:id/backlog`. Design mâu thuẫn: 6.1 "danh sách cân nhắc:
không vào danh sách cần ôn" vs 6.2 "Ưu tiên: mọi mục `priority = true`". Cần chủ dự án chọn: (a) ưu tiên thắng — thêm `NOT priority`
vào điều kiện backlog ở 3 chỗ (`:21`, `:80`, `backlog.service.ts:51` và `relearn` `:79`); (b) backlog thắng — thêm `notBacklog` vào phần ưu tiên.

Test: seed `{ level: 1, dueDate: addDays(today, -62), priority: true }` → assert theo phương án chọn (hiện: `priority: 1, backlog: 1`, xuất hiện ở cả hai danh sách).

### F4 — low (câu hỏi thiết kế) — trả lời một từ trong danh sách cân nhắc ở `mode=all` bị ghi `section='due'` và ăn trần ôn của nhóm — CONFIRMED-BY-READING

- `sectionOf` (`schedule.ts:21-25`) không biết backlog: mức ≥ 1, `due_date ≤ today` → `'due'`. `reviews.service.ts:52,65` ghi section đó;
  `queue.queries.ts:48` đếm `section = 'due'` vào `due_done`.
- `mode=all` cố ý gồm cả backlog (`queue.queries.ts:85`, plan Task 14).

Kịch bản: learner vắng 70 ngày, nhóm có 100 từ backlog và 30 từ đến hạn bình thường; vào "học tất cả", bấm "Đã biết" 100 từ backlog
→ `due_done = 100` → `today.due = 0`, 30 từ đến hạn thật bị ẩn khỏi `mode=due` hôm đó. Design 6.1: backlog "không tính trần".
Nếu chủ dự án muốn backlog không ăn trần: thêm section `'backlog'` (hoặc ghi `'early'`) khi `isBacklog(...)` đúng — hàm `isBacklog`
đã có ở `schedule.ts:45` nhưng runtime chưa dùng.

Test: seed 1 item `{ level: 3, dueDate: addDays(today, -70) }` + 1 item `{ level: 2, dueDate: today }`, cap ôn = 1; trả lời item backlog
(như từ `mode=all`) → kỳ vọng `today.due` vẫn 1 (hiện ra 0).

### F5 — low — `relearn` và `DELETE /v1/groups/:id` đọc item không khóa dòng: chạy cùng lúc với một lượt ôn thì ghi đè kết quả ôn / log có `level_before` cũ — CONFIRMED-BY-READING (theo ngữ nghĩa READ COMMITTED của Postgres)

- `backlog.service.ts:79-85`: `findMany` (không `FOR UPDATE`), lọc backlog bằng JS, rồi `updateMany({ where: { id: { in } } })` — `UPDATE`
  chờ khóa dòng của review rồi vẫn khớp `id`, ghi đè. Log `:86-89` dùng `item.level`/`item.dueDate` đã cũ.
  `reviews.service.ts` chỉ khóa dòng item (`:37-39`), không lấy learner lock, nên learner lock của relearn không chặn được.
- `groups.service.ts:102-112`: tương tự, `item_removed` ghi `levelBefore`/`dueBefore` từ lần đọc trước khi review commit (chỉ log sai, item vẫn bị xóa đúng).

Kịch bản: điện thoại bấm "Đã biết" một từ backlog trong `mode=all` (mức 2 → 3) đúng lúc máy tính bấm "Học lại" từ đó → kết quả cuối mức 0
(lượt ôn bị xóa mất), log relearn ghi `level_before: 2` thay vì 3. Hai thao tác người dùng trên hai máy cùng lúc — hẹp.
Sửa: `SELECT … FOR UPDATE` các item trước khi lọc trong `relearn` (và trong `GroupsService.delete`), như `reviews.service.ts:37`.

Test (khó làm tất định): trong một `$transaction` giữ `SELECT id FROM learning_items WHERE id = $1 FOR UPDATE`, gọi `POST /v1/items/relearn`
song song, cập nhật item lên mức 3 rồi commit → kỳ vọng log relearn `levelBefore: 3`.

---

## Test gaps (low)

- **T1** `test/learning/queue.e2e-spec.ts`: không test nào trả lời thẻ **mới** rồi thấy `today.new` giảm; không test trả lời sớm (`early`, từ
  `mode=all`) **không** làm giảm trần; không test từ vừa "Học lại" khi trả lời thì tính vào trần mới. Một lỗi đếm sai `section` ở
  `queue.queries.ts:48-49`/`:91` cho `'new'`/`'early'` sẽ lọt. Test: 5 thẻ mới, cap mới 3 → trả lời 2 thẻ → `today.new = 1`; trả lời 1 item
  `early` → `today.due` không đổi.
- **T2** `test/learning/reviews.e2e-spec.ts`: chưa test nhánh P2002 (`reviews.service.ts:72-77`): cùng `review_id` gửi đồng thời cho **hai item khác
  nhau** → một 200, một 400, log 1 dòng. Chưa test gửi lại `review_id` sau khi item đã bị `DELETE /v1/items/:id` (hiện trả 200 kết quả cũ —
  nên chốt bằng test).
- **T3** `reviews.e2e-spec.ts:237-248` (B3#5): 90 ngày chỉ đọc `GET /v1/groups/:id`; nên đọc cả `GET /v1/groups`, `queue`, `backlog` (các đường
  tính backlog lúc đọc) rồi assert item không đổi và log 0 dòng.
- **T4** Queue: chưa test `GET /v1/groups/{nhóm người khác}/queue` → 404 (backlog có ở `backlog.e2e-spec.ts:111`).
- **T5** Đồng thời: chưa test hai `POST /v1/groups` cùng lúc khi đã có 99 nhóm (kỳ vọng đúng 100), hai add cùng lúc vào nhóm 1.999 từ (kỳ vọng 2.000,
  một 409), hai rename cùng `version` gửi song song. Code đúng nhờ learner lock / `updateMany where version` — test chỉ để giữ nó đúng.
- **T6** `test/learning/metrics.e2e-spec.ts:85-95`: dòng `item_added` tự chèn tay (comment "Task 12's add route does not exist yet" đã lỗi thời);
  B3#20 nên dùng route thật để chứng minh log production đủ cho chỉ số.
- **T7** `test/learning/quick-add.e2e-spec.ts:113-123` (B3E11, nhóm đầy): chỉ assert `privateEntries` không đổi; nên `expect(await stored(me.userId)).toEqual(before)`
  như ca sentence-limit (senses, items, links, sentences, log).
- **T8** `test/learning/items.e2e-spec.ts:150` (B3E19): log `item_removed` chỉ kiểm `kind`, `groupId`; thiếu `levelBefore`, `dueBefore`, `localDate`, `senseId`.
  `:176-186` (B3E20) không kiểm dòng `item_added` của item mới và log cũ vẫn còn.

Scale test (`test/learning/scale.e2e-spec.ts`): seed thật 100 nhóm × 2.000 item (200.000 sense catalog qua `generate_series`/`unnest`), `ANALYZE`,
1 lần warm-up, 3 lần đo, assert **median < 500 ms**, in thời gian. Chạy riêng (`vitest.config.e2e-scale.ts`, bị loại khỏi `vitest.config.e2e.ts:11`)
và **có** trong CI (`.github/workflows/ci.yml:70`, `pnpm test:e2e:scale`). Chỉ đo nhánh catalog của `visibleSenseCondition` (không có sense riêng tư).
Tôi không chạy nó.

---

## Checked, no issue

**Q1 — luật lịch ôn (design 6.1/6.4)**
- Thang: `schedule.ts:34-35` `level = min(level+1, 5)`, `LEVEL_INTERVALS[level - 1]` — script: 0→1 +1, 1→2 +3, 2→3 +7, 3→4 +14, 4→5 +30, 5→5 +30. Không off-by-one; khớp 6.4 dòng 2–4, 7, 8.
- "Cần ôn tập": `schedule.ts:31-32` mức 1, hẹn hôm nay, ưu tiên, kể cả ôn sớm. Ôn sớm "Đã biết": `:36-38` không đổi, `wasDue=false`.
- Học lại: `schedule.ts:17-19` + `backlog.service.ts:81-84` mức 0, hẹn hôm nay, bỏ ưu tiên, log `relearn`.
- Backlog `> N` (60 không, 61 có), mức 0 không bao giờ: `queue.queries.ts:21` và `:80`, `backlog.service.ts:51-52`, `:79-80` — bốn chỗ cùng một điều kiện.

**Q2 — `localDate`/`addDays`/`daysBetween`** (`src/common/time/local-date.ts`): script xác nhận Kiritimati 09:59Z→01/11 23:59, 10:00Z→02/11 00:00; `Etc/GMT+12` 11:59Z→31/10, 12:00Z→01/11;
New York 03:59Z→31/10 23:59, 04:00Z→01/11 00:00, 05:30Z và 06:30Z→01/11 01:30 (hết DST), 02/11 04:59Z→01/11 23:59, 05:00Z→02/11. `addDays`/`daysBetween` (`:41-48`) làm
trên mốc nửa đêm UTC nên không bị DST; `daysBetween(from, to)` = `to − from` (dương khi quá hạn). `hourCycle: 'h23'` → nửa đêm là `00:00`.

**Q3 — queue SQL** (`queue.queries.ts`): thứ tự ưu tiên → đến hạn (`ORDER BY due_date, level, added_at, id`, `:81`) → mới (`ORDER BY gi.added_at`, theo nhóm, `:83`).
Trần chỉ đếm `section IN ('due','new')` của `kind='review'`, đúng nhóm, `local_date = today` truyền vào (`:47-51`, `:89-93`); không có `CURRENT_DATE`/`now()` trong `src/learning`
(grep; chỉ `this.clock.now()`). `priority`/`early` không tính. "Cần ôn tập" trên từ đến hạn ghi `'due'` → ăn trần đến hạn: đúng 6.2 ("lượt ôn đến hạn"). Từ học lại (mức 0)
được ghi `'new'`. Trần không âm: `queue.service.ts:26-32` và `:82-83` (`Math.max(0, …)`, `LIMIT` chỉ khi > 0). Backlog bị loại khỏi phần đến hạn và đếm (`:40`, `:80`).
Sense đã retire/replace (`state <> 'open'`, `publish.service.ts:105`) và unpublished bị loại bằng `visibleSenseCondition` (`visible-senses.ts:11-14`) ở cả đếm và queue,
vẫn hiện trong `GET /v1/groups/:id/items` với `sense_changed` (`items.service.ts:154-159`). `mode=all`: mọi item một lần, `random()`, không trần, gồm backlog (`:85`).
`GET /v1/groups`: một câu SQL cho mọi nhóm (`queue.service.ts:48`), `cells` 6 ngăn có `due`, sắp xếp ưu tiên → tổng chờ → tên (`:53-55`). Bộ lọc queue (`:79-83`) và bộ đếm (`:40-41`) cùng điều kiện → cùng con số.

**Q4 — `cardsLeftToday`** (`queue.service.ts:60-69`): cùng `groupStatsQuery` và cùng hàm kẹp trần `today()` với `GET /v1/groups` → cùng số; nhiều learner trong một câu
qua `unnest(uuid[], date[])` (`queue.queries.ts:27`), mỗi người dùng `today` riêng do Notifications truyền (`reminder-tick.service.ts:96`).

**Q5 — reviews** (`reviews.service.ts`): một `$transaction`; `SELECT … FOR UPDATE` trên dòng item (`:37-39`), không phải learner lock; tra `review_id` trước và sau khóa (`:35`, `:41`)
→ hai request cùng `review_id` cùng item: request sau chờ khóa, rồi thấy dòng của request trước (READ COMMITTED, snapshot mới mỗi câu). Cùng `review_id` khác item:
index unique một phần → 23505 → adapter đổi thành `UniqueConstraintViolation`/P2002 (`node_modules/@prisma/adapter-pg/dist/index.js:472`) → `catch` trả 400 (`:72-77`).
Body khác → 400 (`:88-89`). Item không có / của người khác → 404 (`:38-39`); link nhóm không có hoặc nhóm của người khác → 404 (`:43-46`). Log đủ cột 5.1 + `section` (`:60-66`);
`priority` trả lại khi replay suy từ `answer` (`:94`) — đúng vì "known" luôn bỏ ưu tiên. Gửi lại sau khi item bị bỏ khỏi việc học → 200 kết quả đã lưu (log còn, D33); sau khi xóa từ riêng → log bị xóa → 404.

**Q6 — items** (`items.service.ts`): thêm mức 0 hẹn hôm nay theo múi giờ learner (`:42`, `:173`); `createManyAndReturn({ skipDuplicates })` = `INSERT … ON CONFLICT DO NOTHING` rồi đọc lại (`:174-181`);
mọi đường tạo `group_items` (add, bulk, quick add) đều dưới learner lock (`:48`, `:78`, `quick-add.service.ts:61`) → trần 2.000 và hai add cùng lúc an toàn. Bỏ khỏi nhóm cuối → xóa item + log `item_removed` (`:95-106`);
`DELETE /v1/items/:id` xóa khỏi mọi nhóm (cascade) + log (`:109-116`). `GET /v1/items?sense_ids` (1–100, `items.schemas.ts:15-17`) chỉ lọc `userId` của người gọi (`:119-121`).
`cell=` (`:144`). Nhóm/sense của người khác → 404 trước khi ghi (`:43-49`).

**Q7 — groups**: tên trim → NFC → 1–60 **code point** (`groups.schemas.ts:5-6`, không dùng `.max` của zod); `VARCHAR(60)` của Postgres cũng đếm ký tự; `name_key` = lower-case của tên NFC;
P2002 → 409 `group-name-taken` (`groups.service.ts:58-60`, `:78-80`). Nhóm thứ 101 đếm dưới learner lock (`:48-51`). Rename: so `version` rồi `updateMany where { id, version }` (`:68-74`) → bên sau 409.
Xóa nhóm: cùng điều kiện `removableWhere` (`:35`) cho `removable_items` (`:89`) và cho việc xóa (`:102-104`), log `item_removed` từng item (`:109-112`).

**Q8 — quick add** (`quick-add.service.ts:52-81`): một `$transaction` cho từ riêng + item + link + câu; mọi lỗi (`private-word-limit-reached`, `sentence-limit-reached`, `group-full`, 404) ném trong transaction → rollback.
`sense_id` của người khác bị chặn trước transaction (`:55-58`). "Đang học" → không tạo item, vẫn **thêm vào nhóm được chọn** nếu đang ở nhóm khác (`items.service.ts:58-68`), câu vẫn lưu.
Đúng một trong `sense_id`/`new_word` và `group_id` bắt buộc: `quick-add.controller.ts:30`. `@Idempotent()` có.

**Q9 — `DELETE /v1/my-words/:id`** (`quick-add.service.ts:84-91`): một transaction: learner lock → `deletePrivateEntryContent` (kiểm chủ, `private-words.service.ts:113-116`, `:197-203`; cascade senses, revisions, câu)
→ xóa items (cascade link) và log theo `sense_id`. Người khác → `not-found` → 404.

**Q10 — ranh giới module, rate limit**: grep `FROM|JOIN senses|entries|sense_revisions|users|profiles|app_settings|…` và `tx./prisma.sense|entry|user|…` trong `src/learning` → 0 kết quả
(đối chứng: grep `FROM learning_` có kết quả). Content chỉ được dùng qua `src/content/index.ts`, ngoại lệ đã duyệt là `visibleSenseCondition`. `learning.module.ts:3` import `ContentModule` từ
`content.module.js` — giống `content-pipeline.module.ts:5` (index không export module), không phải truy cập dữ liệu. Mọi route ghi có `@Idempotent()` + `@RateLimit('user.write')`;
`POST /v1/reviews` chỉ có `@RateLimit('learning.review')` (`reviews.controller.ts:23`), rule `{ by: 'user', max: 120, windowSeconds: 60 }` trong `DEFAULT_LIMITS`.

**Schema/migration**: CHECK mức 0–5, `kind`, `answer`, `rating`, `section`; unique một phần `(user_id, review_id) WHERE review_id IS NOT NULL`; `learning_log.item_id` không FK; `group_items` FK cascade.

**Tests đạt yêu cầu** (đọc): 6.4 dòng 1–10 table-driven + dòng 11 qua B3E10; B3#2/#3/#4 qua HTTP có đọc lại item và log; B3E4 (cả gửi đồng thời), B3E5 (phát hiện được nếu không tuần tự),
B3E6, B3#6 (183 thẻ, thứ tự chính xác, 40 lượt → 60), B3E8, B3E9, B3E10, B3E21 (retire), B3E35, caps reset ở nửa đêm địa phương, B3E18/B3#13, B3#7, B3E22/B3E33, B3#12 (groups, items, quick add),
B3E17, NFC vs NFD tên nhóm (byte thật khác nhau: `Caf\303\251` vs `Cafe\314\201`).
