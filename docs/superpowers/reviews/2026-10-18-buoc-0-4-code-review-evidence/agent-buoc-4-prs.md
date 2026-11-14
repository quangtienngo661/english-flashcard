# Review code Bước 4 — PR #48 (D1) và PR #50 (B1) — agent PX (18/10/2026)

Review tĩnh, chỉ đọc code; không chạy test, không chạy app. Mọi `file:dòng` tính từ `apps/api/` trừ khi ghi khác, đọc ở đúng
head được giao. Kết quả: **0 Cao, 2 Trung bình, 4 Thấp**, 2 test gap.

## 1. Phạm vi đã đọc

**PR và head**
- **PR #48** `feat/buoc-4-d-practice` @ `70d6e8e` (worktree `review-pr48`), merge-base `1164bbb`, 21 file (Task 8–12).
  Lưu ý trạng thái lúc viết: head của PR đã chuyển sang **`30e0fff`** (merge `origin/dev` vào nhánh; `gh pr view 48` →
  `MERGEABLE`). `git diff --stat 70d6e8e 30e0fff -- apps/api/src/practice apps/api/prisma/models/practice.prisma
  apps/api/prisma/migrations/20261018150000_practice apps/api/test/practice` rỗng, và `git diff --stat 94cdb6e 30e0fff` đúng
  21 file của PR. Conflict duy nhất (`src/app.module.ts`) đã gỡ thành `LearningModule, EntitlementsModule, PracticeModule`.
  CI (`api`, `admin`, `admin-e2e-real`, `web`) xanh trên `30e0fff` (run `39120761952`). Vậy mọi phát hiện dưới đây áp nguyên
  cho `30e0fff`.
- **PR #50** `feat/buoc-4-b-learning` @ `ba95003` (worktree `review-pr50`), 16 file (Task 3–4). Lưu ý: PR này **đã merge**
  vào `dev` lúc 18/10 17:35 (+07) thành `94cdb6e` (cha: `dc4cbe0`, `ba95003`); CI xanh (run `39118751500`).

**Tài liệu:** design `docs/superpowers/specs/2026-10-18-buoc-4-practice-design.md` §0, §2, §4, §5.1, §5.3, §5.4, §6,
§7.1–7.8, §8, §11, §12, §13, §14; decision record (bảng D1–D36); plan `docs/superpowers/plans/2026-10-18-buoc-4-practice.md`
(Global Constraints, Review Focus, Task 3, 4, 8–12 đọc kỹ; Task 13–20 đọc để biết phần dời lại); review plan (đủ 29 phát
hiện) và review design (lướt bảng phát hiện); `docs/deliveries/buoc-3.md:78` (số đo quy mô Bước 3).

**Code đối chiếu (ở `dev`, worktree `review-pr50`):** `src/learning/queue/queue.queries.ts`, `queue.service.ts`,
`schedule/schedule.ts`, `learning-lock.ts`, `reviews/reviews.service.ts`, `groups/groups.service.ts`, `items/items.service.ts`,
`quick-add/quick-add.service.ts`, mọi chỗ đọc/ghi `learning_log` (grep); `src/content/learner/visible-senses.ts`,
`content/catalog/normalize.ts`, `content/practice/practice-senses.ts` và `mask-example.ts` (chỉ để hiểu đầu vào, thuộc lát
khác), `content/private/private-words.service.ts:215-242` (`bulkCandidates`); `src/common/db/prisma.module.ts`,
`common/idempotency/idempotency.service.ts`, `src/worker.ts`; mặc định của `pg-pool` trong `node_modules` đã cài (chỉ đọc).

**Số lượt:** 2 — một lượt đọc hết hai diff, một lượt lần theo từng đường đi (caller → service → SQL → constraint/lock) cho
các điểm trong brief.

## 2. Bảng tóm tắt

| ID | Mức | PR | Phát hiện (1 dòng) | file:dòng | Trạng thái |
|---|---|---|---|---|---|
| PX1 | Trung bình | #48 | Bộ lọc đáp án nhiễu xét **từng nghĩa** nhưng đề hiện **chữ**: một chữ có nghĩa khác trùng nghĩa con với đáp án vẫn được dùng → câu có hai đáp án đúng (trái D6), ở cả trắc nghiệm lẫn đúng/sai | `src/practice/questions/distractors.ts:46-53` | CONFIRMED |
| PX2 | Trung bình | #50 | `practiceItems({ kind: 'all' })` trả cả nguồn, mỗi dòng chạy 2 correlated subquery; ở quy mô của plan (100 nhóm × 2.000 từ) nhiều khả năng ≥ 1 s riêng nó, trong khi Review Focus 2 cho cả việc mở phiên < 1 s | `src/learning/practice/practice-reads.queries.ts:93-101` | SUSPECTED |
| PX3 | Thấp | #50 | `practiceReview` gặp `review_id` đã có thì trả `applied` mà không so action/nghĩa (Learning của Bước 3 trả 400 trong ca này); không bắt lỗi unique `P2002` | `src/learning/practice/practice-review.service.ts:45-53` | CONFIRMED |
| PX4 | Thấp | #50 | `practiceReview` chạy trong transaction của Practice nhưng vẫn mượn thêm 2 kết nối từ pool (`getProfile`, `settings.get`) → pool 10 kết nối có thể kẹt cứng khi ≥ 10 lượt bấm cùng lúc | `src/learning/practice/practice-review.service.ts:33` | SUSPECTED |
| PX5 | Thấp | #48 | Cách sắp xếp `overdue_first` coi từ mới (mức 0, chưa ôn lần nào) là "quá hạn lâu nhất" theo ngày thêm | `src/practice/sessions/order.ts:53` | CONFIRMED |
| PX6 | Thấp | #48 | DB nhận `types` rỗng/NULL/trùng và `hint_level` ngoài 0–2 (lớp chặn thứ hai mà plan Task 8 đòi) | `prisma/migrations/20261018150000_practice/migration.sql:9, 59, 122` | CONFIRMED |

## 3. Từng phát hiện

### PX1 — Trung bình — PR #48 — CONFIRMED: đáp án nhiễu lọc theo nghĩa, đề hiện theo chữ (trái D6)

**Chỗ lỗi:** `src/practice/questions/distractors.ts:46-53` (`eligibleCandidates`).

**Cơ chế:**
```ts
for (const candidate of candidates) {
  const lemma = candidate.lemma.toLowerCase();
  if (candidate.sense_id === asked.sense_id || lemma === askedLemma) continue;   // :48
  if (candidate.form_of_entry_id === asked.entry_id || asked.form_of_entry_id === candidate.entry_id) continue;
  if (sameMeaning(asked, candidate) || seen.has(lemma)) continue;               // :50
  seen.add(lemma);
  result.push(candidate);
}
```
Hai lỗ hổng cùng gốc "xét từng nghĩa, bỏ qua các nghĩa khác của cùng chữ":
- (a) Nghĩa bị loại ở `:50` **không** được ghi vào `seen`, nên một nghĩa khác của **cùng chữ** đi qua bình thường. Câu trắc
  nghiệm chỉ hiện chữ (`Prompt.options: string[]`, `practice.types.ts:12`), người học không biết đang nói nghĩa nào.
- (b) Các nghĩa khác của **chính chữ đang hỏi** bị bỏ ở `:48` nhưng không được dùng để lọc ứng viên còn lại. Câu đúng/sai hiện
  "chữ đang hỏi — nghĩa của ứng viên" (`practice.types.ts:13`); nếu nghĩa đó trùng nghĩa con với một nghĩa khác của chữ đang
  hỏi thì "cặp sai" thật ra đúng.

**Vì sao sai:** D6 (Chốt): "Không bao giờ có câu có hơn một đáp án đúng; phải chặn lúc tạo câu". Design 7.4 bước 2 viết luật
"chung một nghĩa con" theo từng ứng viên và im lặng về chữ có nhiều nghĩa; rủi ro được chấp nhận (⚠2) chỉ là từ đồng nghĩa
**khác chữ tiếng Việt**, còn ở đây nghĩa con giống hệt nhau, đúng loại bộ lọc phải chặn. Kỳ vọng hợp lý: chặn theo **chữ**.

**Hậu quả (dữ liệu cụ thể):**
- Trắc nghiệm: nhóm có `fast` "nhanh", `quick` (nghĩa 1) "nhanh", `quick` (nghĩa 2) "nhanh trí", `slow` "chậm". Hỏi `fast`:
  `quick`#1 bị loại ở `:50`, `quick`#2 được giữ → lựa chọn gồm `fast`, `quick`, … cho đề "nhanh". Người học chọn `quick` bị chấm
  sai, lượt này tính vào "từ hay sai".
- Đúng/sai: nhóm có `deploy`#1 "triển khai (phần mềm)", `deploy`#2 "bố trí (quân)", `arrange` "sắp xếp, bố trí". Hỏi
  `deploy`#1: `arrange` được giữ → cặp sai "deploy — sắp xếp, bố trí", đáp án hệ thống là Sai trong khi `deploy` (nghĩa 2) đúng
  là "bố trí".
- Báo lỗi không gỡ được gốc: nội dung không sai nên staff không có gì để sửa; nếu kết luận `no_error` thì lượt sai lại được
  tính (design §8), và câu tương tự còn được tạo lại ở phiên sau.
- Không hiếm: thêm hàng loạt theo level (`content/private/private-words.service.ts:215-242`, lọc theo level của **entry**) đưa
  mọi nghĩa đang mở của một entry vào cùng nhóm; Learning cho phép nhiều nghĩa của một chữ trong một nhóm (mục học duy nhất theo
  `(user_id, sense_id)`, `learning.prisma:33`).

**Đã loại trừ:** (1) Task 13 không thêm bước lọc theo chữ (plan Task 13: "none same lemma, form or subsense", theo từng ứng
viên). (2) `practiceGroupMates` trả mọi nghĩa cùng nhóm, không gộp theo chữ (`practice-reads.queries.ts:107-116`). (3) Không có
bước sau nào của plan nhắc ca này; review design và review plan cũng không (grep "nghĩa khác", "nhiều nghĩa" chỉ thấy dòng
design 424 về nghĩa khác của **chính chữ đang hỏi** làm ứng viên). Hàm thuần nên lần theo code là đủ chứng minh.

**Probe đề xuất** (unit, thêm vào `src/practice/questions/distractors.spec.ts`, dùng helper `word()` sẵn có):
```ts
it('D6: a lemma is dropped when any of its senses shares a sub-meaning with the asked sense', () => {
  const fast = word('fast', { gloss_vi: 'nhanh' });
  const quick1 = word('quick', { gloss_vi: 'nhanh' });
  const quick2 = word('quick', { entry_id: quick1.entry_id, gloss_vi: 'nhanh trí' });
  const slow = word('slow', { gloss_vi: 'chậm' });
  expect(eligibleCandidates(fast, [quick1, quick2, slow]).map((w) => w.lemma)).toEqual(['slow']); // thực tế: ['quick', 'slow']
});
it('D6 (true/false): a candidate sharing a sub-meaning with another sense of the asked lemma is dropped', () => {
  const deploy1 = word('deploy', { gloss_vi: 'triển khai (phần mềm)' });
  const deploy2 = word('deploy', { entry_id: deploy1.entry_id, gloss_vi: 'bố trí (quân)' });
  const arrange = word('arrange', { gloss_vi: 'sắp xếp, bố trí' });
  expect(eligibleCandidates(deploy1, [deploy2, arrange])).toEqual([]); // thực tế: [arrange]
});
```

**Cách sửa gợi ý:** hai lượt: (1) tập "chữ bị chặn" = chữ của mọi ứng viên trượt luật dạng chia/nghĩa con, so với nghĩa đang
hỏi **và** với mọi nghĩa cùng chữ với nó có trong tập ứng viên; (2) chỉ giữ ứng viên có chữ không bị chặn, mỗi chữ một lần.
Sửa trước Task 13 (Task 13 dùng hàm này cho cả `availability`).

### PX2 — Trung bình — PR #50 — SUSPECTED: `practiceItems('all')` ở quy mô của plan

**Chỗ lỗi:** `src/learning/practice/practice-reads.queries.ts:93-101` (`itemRows`, dùng cho mọi nguồn), `:85`;
`practice-reads.service.ts:55-57`.

**Cơ chế:**
```sql
SELECT i.id::text AS item_id, i.sense_id::text AS sense_id, i.level, i.due_date, i.priority,
  COALESCE((SELECT min(gi.added_at) FROM group_items gi WHERE gi.item_id = i.id), i.created_at) AS added_at,
  (SELECT max(l.at) FROM learning_log l
    WHERE l.user_id = i.user_id AND l.item_id = i.id AND l.kind = 'review' AND l.answer = 'review') AS last_needs_review_at
FROM learning_items i
WHERE i.user_id = ${userId}::uuid      -- + visibleSenseCondition + ORDER BY i.id
```
Hai cột cuối là **correlated subquery** (câu SQL con chạy lại cho từng dòng). Với nguồn "Ôn tất cả" ở quy mô Review Focus 2
(100 nhóm × 2.000 từ = 200.000 mục học) là khoảng 400.000 lần dò index, rồi 200.000 dòng (3 cột thời gian đổi sang `Date`) được
chuyển vào Node và qua `toItem` từng dòng.

**Vì sao đáng lo:** plan Review Focus 2 và test quy mô của Task 14 đòi mở phiên "Ôn tất cả" < 1 s (`ASSUMPTION`); Task 14 đọc
**cả** nguồn rồi mới sắp xếp (plan Task 14: "words of the source (Task 3) … sort … walk the order in batches"). Đối chứng: Bước
3 đo `GET /v1/groups` trên đúng 200.000 liên kết được median 335 ms (`docs/deliveries/buoc-3.md:78`), câu đó chỉ trả 100 dòng
và không có subquery theo dòng. Vậy riêng `practiceItems('all')` nhiều khả năng đã ≥ 1 s, chưa tính `PracticeStats` và sắp xếp.

**Hậu quả:** test quy mô của Task 14 đỏ hoặc phải nới ngưỡng; sửa lúc đó nghĩa là luồng D sửa file Learning đã merge (luồng B).

**Đã loại trừ:** (1) Không phải thiếu index: `group_items_item_id_idx` và `learning_log_user_id_item_id_idx` có sẵn (migration
`20261017210000_learning:68, 74`); chi phí nằm ở vòng lặp × 200.000. (2) Phần kiểm "nghĩa còn thấy được" (`EXISTS`) planner có
thể làm thành semi-join rẻ, nên không phải nguồn chính. (3) Postgres không tự gỡ subquery tổng hợp trong danh sách SELECT thành
join (`ASSUMPTION` theo cách planner Postgres làm; probe dưới xác nhận bằng `SubPlan … loops=200000`). (4) Đo đạc được plan giao
cho Task 14 ("Not verified" của plan), nhưng hình dạng câu SQL là của PR này, nên nêu ở đây để đo sớm.

**Probe đề xuất** (e2e quy mô, file mới `test/learning/practice-scale.e2e-spec.ts`, chạy bằng `vitest.config.e2e-scale.ts` sau
khi thêm file vào `include`; seed y hệt `test/learning/scale.e2e-spec.ts:21-40`, có `ANALYZE`):
```ts
const learning = ctx.app.get(LearningService);
ctx.clock.set(now);
await learning.practiceItems(userId, { kind: 'all' });                // warm-up
const timings: number[] = [];
for (let i = 0; i < 3; i += 1) {
  const started = performance.now();
  expect(await learning.practiceItems(userId, { kind: 'all' })).toHaveLength(200_000);
  timings.push(performance.now() - started);
}
console.log('practiceItems(all)', timings);  // làm thêm cho { kind: 'today' } và practiceGroupMates(userId, 50 nghĩa của nhóm 1)
const q = practiceItemsQuery(userId, { kind: 'all' }, '2026-11-08', 60, { reviews: 100, new: 20 });
console.log(await ctx.prisma.$queryRawUnsafe(`EXPLAIN (ANALYZE, BUFFERS) ${q.text}`, ...q.values));
```
Kỳ vọng: median thấp hơn nhiều so với 1.000 ms (ngân sách của **cả** việc mở phiên). Nghi ngờ: median ≥ 1.000 ms; EXPLAIN có
hai `SubPlan` với `loops=200000`.

**Cách sửa gợi ý:** thay hai subquery bằng `LEFT JOIN` tới bảng đã gộp sẵn theo người học (`min(added_at)` của `group_items` qua
`learning_groups.user_id`, `max(at)` của `learning_log` lọc `user_id`), để Postgres dùng hash join; ở mức plan, cân nhắc sắp
xếp và cắt trong SQL cho nguồn lớn thay vì kéo 200.000 dòng về Node.

### PX3 — Thấp — PR #50 — CONFIRMED: `review_id` đã dùng → luôn `applied`, không so nội dung

**Chỗ lỗi:** `src/learning/practice/practice-review.service.ts:45-53`.

**Cơ chế:**
```ts
const stored = await tx.learningLogEntry.findFirst({ where: { userId, reviewId } });
if (stored) {
  outcomes.push({
    senseId, outcome: 'applied', item_id: stored.itemId, level: stored.levelAfter!, due_date: dateString(stored.dueAfter!),
    priority: stored.answer === 'review',
  });
  continue;
}
```
Không so `stored.answer` với `action`, `stored.senseId` với `senseId`, cũng không kiểm dòng đó là dòng của bài luyện
(`origin = 'practice'`, `group_id` null). Lệnh `create` ở `:72` không bắt `P2002` (lỗi trùng khóa unique).

**Vì sao sai:** chính Learning của Bước 3 trả 400 khi một `review_id` bị dùng lại với nội dung khác
(`reviews.service.ts:84-92`) và bắt `P2002` (`:74-80`). Plan Task 4 chỉ ghi "a log row with this review_id returns its stored
result", và design 5.3 dựa vào bước kiểm `review_action` của Practice (Task 16, B4E11 → `409 review-already-set`) đứng trước.
Vì vậy đây là lớp phòng thủ thứ hai bị thiếu, không phải lỗi luồng chính.

**Hậu quả:** (1) Nếu Task 16 sót một nhánh kiểm, lần bấm "Đã biết" sau "Cần ôn tập" trên cùng lần hỏi nhận `applied` với kết quả
của "Cần ôn tập" (`priority: true`, mức 1) như thể "Đã biết" đã ghi. (2) `review_id` của flashcard do app tự chọn
(`POST /v1/reviews`), nên một client lỗi gửi đúng ID của một lần hỏi luyện thì lần bấm ở bài luyện sau đó bị báo `applied` mà
không ghi gì (chỉ ảnh hưởng dữ liệu của chính người đó). (3) Hai lời gọi đồng thời cùng `review_id` cho hai nghĩa khác nhau (chỉ
khi người gọi có bug) → một bên `P2002` → 500.

**Đã loại trừ:** index unique `(user_id, review_id)` (`learning_log_user_review_key`) chỉ ngăn dòng thứ hai, không ngăn kết quả
sai; Task 16 có test B4E10/B4E11 ở tầng Practice nhưng không có gì ghim hành vi ở tầng Learning.

**Probe đề xuất** (e2e, thêm vào `test/learning/practice-review.e2e-spec.ts`, dùng helper sẵn có):
```ts
it('a review_id reused with another action is not reported as applied', async () => {
  const me = await learner(); const g = await me.group('A'); const s = await senses(1);
  await seed(me.userId, g, s, () => ({ level: 2, dueDate: today }));
  const id = randomUUID();
  await review(me.userId, [one(s[0], 'review', id)]);
  const [second] = await review(me.userId, [one(s[0], 'known', id)]);
  expect(second.outcome).not.toBe('applied'); // thực tế: { outcome: 'applied', level: 1, priority: true }
});
```

**Cách sửa gợi ý:** khi có `stored`, nếu `answer`/`senseId`/`origin` khác thì trả một outcome riêng (ví dụ `review-id-conflict`,
Practice đổi thành 409) thay vì `applied`; bắt `P2002` như `ReviewsService`.

### PX4 — Thấp — PR #50 — SUSPECTED: mượn thêm kết nối pool khi đang ở trong transaction của người gọi

**Chỗ lỗi:** `src/learning/practice/practice-review.service.ts:33`; cùng kiểu ở `practice-reads.service.ts:52, 70` (các hàm đọc
không nhận `tx`, mà Task 14 dự định gọi chúng trong transaction của nó).

**Cơ chế:**
```ts
async review(tx: Prisma.TransactionClient, userId: string, inputs: PracticeReviewInput[]) {
  if (inputs.length === 0) return [];
  const [profile, { learning }] = await Promise.all([this.identity.getProfile(userId), this.settings.get()]);
```
`getProfile` và `settings.get` dùng `this.prisma` (pool chung), không dùng `tx`. Pool do `PrismaPg` tạo chỉ với
`connectionString` (`common/db/prisma.module.ts:21`), tức `pg.Pool` mặc định **10 kết nối** và **không có hạn chờ** lấy kết
nối (`node_modules/.pnpm/pg-pool@3.14.0…/index.js:89` `max … || 10`; `:206` không có `connectionTimeoutMillis` thì chờ mãi).

**Vì sao sai:** `ReviewsService.answer` của Bước 3 đọc profile và settings **trước** khi mở transaction
(`reviews.service.ts:33-36`); hàm mới nhận `tx` nhưng vẫn cần thêm 2 kết nối khi người gọi đang giữ 1. Design im lặng; kỳ vọng
hợp lý là hàm chạy "trong transaction của Practice" không cần thêm kết nối.

**Hậu quả:** khi ≥ 10 lượt "Cần ôn tập"/"Đã biết" cùng giữ transaction (hoặc ≥ 5 lượt `review-all`, vì mỗi lượt còn giữ thêm
transaction của `IdempotencyInterceptor`), cả 10 kết nối bị transaction chiếm, các lời gọi `getProfile` chờ một kết nối mà chỉ
transaction mới nhả → tất cả đứng tới khi Prisma hủy transaction vì quá giờ → 500. Ít khả năng xảy ra ở pilot 5–10 người.

**Đã loại trừ:** không có cấu hình nào nâng `max` của pool; interactive transaction của Prisma giữ riêng một kết nối suốt
transaction. Cùng cơ chế đã có sẵn ở `IdempotencyInterceptor` (xem "Ngoài phạm vi"), PR này làm nó nặng thêm.

**Probe đề xuất** (e2e, `test/learning/practice-review.e2e-spec.ts`): 12 người học (≥ 10 để chắc chắn lấp đầy pool), mỗi người
một mục học tới hạn, rồi
```ts
const results = await Promise.allSettled(users.map((u) => ctx.prisma.$transaction(async (tx) => {
  await tx.$queryRaw`SELECT pg_sleep(0.3)`;           // để các transaction cùng giữ kết nối một lúc
  return learning.practiceReview(tx, u.userId, [one(u.senseId, 'known')]);
}, { timeout: 5_000, maxWait: 5_000 })));
```
Kỳ vọng: cả 12 `fulfilled` trong khoảng 1–2 s. Nghi ngờ: ít nhất 10 `rejected` sau khoảng 5 s (transaction quá giờ /
"Transaction already closed").

**Cách sửa gợi ý:** để người gọi truyền `today` (theo múi giờ) và `backlogDays` đã đọc trước transaction (hoặc thêm một hàm
`practiceReviewContext(userId)` gọi trước `$transaction`); áp cùng cách cho các hàm đọc nếu Task 14/15 gọi chúng trong
transaction.

### PX5 — Thấp — PR #48 — CONFIRMED: `overdue_first` đưa từ mới chưa ôn lên đầu

**Chỗ lỗi:** `src/practice/sessions/order.ts:53`.

**Cơ chế:** `overdue_first: (a, b) => byText(a.due_date, b.due_date)`. Từ mới có `due_date` = ngày thêm (`newItem(today)`,
`learning/schedule/schedule.ts:13-15`; "Học lại" cũng vậy, `:18-20`), nên từ thêm từ lâu mà chưa ôn lần nào có `due_date` cũ nhất.

**Vì sao sai:** design 7.1 "`overdue_first` — Quá hạn lâu nhất trước", im lặng về mức 0. Bước 3 coi từ mức 0 không bao giờ quá
hạn dù cũ tới đâu (D22, `schedule.ts:52-54`), và đã có khóa riêng `new_first` cho từ mới. Kỳ vọng hợp lý: từ ôn đang quá hạn đứng
trước.

**Hậu quả:** "Ôn tất cả" + `overdue_first`, người học có 200 từ thêm từ tháng 9 chưa học và 30 từ quá hạn thật → phiên 20 câu
toàn từ mới, không có từ quá hạn nào.

**Đã loại trừ:** Task 14 truyền nguyên `due_date` của Learning (`PracticeItem.due_date`, `practice-reads.service.ts:90`); không
task sau nào định nghĩa lại khóa này.

**Probe đề xuất** (unit, `src/practice/sessions/order.spec.ts`, helper `w()` sẵn có):
```ts
it('overdue_first: a never-reviewed word added long ago does not come before an overdue review', () => {
  const words = [
    w('new-old', { level: 0, section: 'new', due_date: '2026-09-01' }),
    w('overdue', { level: 3, section: 'due', due_date: '2026-10-15' }),
  ];
  expect(sortWords(words, 'overdue_first', seededRandom(1))).toEqual(['overdue', 'new-old']); // thực tế: ['new-old', 'overdue']
});
```

**Cách sửa gợi ý:** xếp mức ≥ 1 theo `due_date` trước, mức 0 sau (hỏi chủ dự án vì design im lặng).

### PX6 — Thấp — PR #48 — CONFIRMED: DB không chặn `types` rỗng/NULL/trùng và `hint_level` ngoài 0–2

**Chỗ lỗi:** `prisma/migrations/20261018150000_practice/migration.sql:9` (`"types" TEXT[]`, không `NOT NULL`), `:122`
(`CHECK ("types" <@ ARRAY[…])`), `:59` (`"hint_level" INTEGER NOT NULL DEFAULT 0`, không CHECK).

**Cơ chế:** `<@` (mảng trái nằm trong mảng phải) đúng với mảng rỗng `'{}'` và với mảng có phần tử trùng; NULL đi qua mọi CHECK.

**Vì sao sai:** plan Task 8 "CHECKs on every enum column"; design 5.1 ghi `hint_level` (0, 1, 2); plan Task 14 `types: 1–3,
distinct`.

**Hậu quả:** chỉ khi Task 14/15 có bug (ví dụ ghi `types = '{}'` hoặc `hint_level = 3`) thì DB lưu im lặng thay vì từ chối.
Zod ở tầng API là lớp chặn chính.

**Đã loại trừ:** đây là lớp chặn thứ hai; không ảnh hưởng luồng đúng.

**Probe đề xuất** (thêm vào `test/practice/schema.e2e-spec.ts`):
```ts
await expect(session(randomUUID(), 'finished', { types: [] })).rejects.toThrow();            // thực tế: resolves
const s = await session(randomUUID(), 'finished'); const q = await question(s.userId);
await expect(item(s.id, s.userId, q.id, 1, { hintLevel: 3 })).rejects.toThrow();               // thực tế: resolves
```

**Cách sửa gợi ý:** `"types" TEXT[] NOT NULL` + `CHECK (cardinality("types") BETWEEN 1 AND 3)`; `CHECK ("hint_level" BETWEEN 0 AND 2)`.

## 4. Test gaps

- **TG1 (PR #48, B4#3 / D6):** test "B4#3 (filters)" (`distractors.spec.ts:24-35`) chỉ có **một** nghĩa cho mỗi chữ ứng viên;
  không có ca hai nghĩa cùng chữ (PX1). Hai test ở probe của PX1 lấp chỗ này.
- **TG2 (PR #50, B4E10/B4E11 tầng Learning):** không test nào ghim việc `practiceReview` nhận lại một `review_id` với **action
  khác**; hành vi hiện tại (trả `applied`) chưa được ai chọn rõ (PX3).

## 5. Đã kiểm, không thấy vấn đề

**PR #48 — schema (design §5.1, plan Task 8)**
- Đủ cột của bốn bảng theo §5.1, cộng `pending_notice`, `prompt_style`, `blank` của plan (`migration.sql:2-81`,
  `prisma/models/practice.prisma`).
- CHECK trên mọi cột chữ dạng liệt kê: `source`, `group_filter`, `sort`, `types`, `prompt_style` (phiên có `mixed`, câu hỏi chỉ
  `meaning`/`sentence`), `status`, `pending_notice`, `type`, `result` (có `void`), `review_action`, `reason`, `status` của báo
  cáo (`migration.sql:119-131`); NULL được phép ở các cột null được, đúng ý.
- Index unique một phần "mỗi người một phiên mở" (`:133`), unique `(session_id, position)` (`:99`), index của §5.1 và plan
  (`:84-105`), unique `item_id` của báo cáo (`:102`). Index unique mặc định coi các NULL là khác nhau, nên nhiều báo cáo đã mất
  lần hỏi (`item_id` null) cùng tồn tại được.
- FK: lần hỏi → phiên `CASCADE` (`:108`), lần hỏi → câu hỏi `RESTRICT` (`:111`), báo cáo → lần hỏi `SET NULL` (`:114`); test
  của PR kiểm cả ba (`test/practice/schema.e2e-spec.ts`).
- `RESTRICT` không chặn job dọn hay cổng xóa từ riêng: cả design §11 và plan Task 19 đều xóa lần hỏi trước, rồi mới xóa câu hỏi
  không còn lần hỏi; xóa phiên thì CASCADE xóa lần hỏi chứ không đụng câu hỏi.
- D3: không bảng practice nào có FK hay `@relation` sang module khác; `user_id`, `sense_id`, `group_id` là UUID thường
  (`practice.prisma:1`, mọi `@relation` ở `:75-76, :101` đều trong Practice).
- Thứ tự migration: `20261018150000_practice` mới hơn migration mới nhất của `dev` (`20261018140000_learning_log_origin` của PR
  #50); hai migration không phụ thuộc nhau; PR #49, #51 không thêm migration (`git diff --stat 1164bbb dc4cbe0 -- apps/api/prisma`
  rỗng). Không cần đổi tên theo luật của plan. Conflict code duy nhất là một dòng `app.module.ts`, đã gỡ đúng ở `30e0fff`.

**PR #48 — hàm thuần**
- `normalizeAnswer` đúng các bước của 7.6 (`grading/normalize.ts:2-10`): NFC, trim, mọi khoảng trắng (cả tab, xuống dòng, NBSP)
  thành một dấu cách, `‘ ’` → `'`, `“ ”` → `"`, chữ thường. `matchesAnswer` so khớp tuyệt đối với danh sách đã chuẩn hóa;
  `answerLength` đếm code point sau NFC + trim. Đúng design: không bỏ dấu câu (`deploy.` → chưa đúng), không bỏ dấu thanh/dấu phụ
  (`cafe` ≠ `café` trừ khi là cách viết được chấp nhận), không đổi các loại gạch nối khác nhau — design 7.6 liệt kê đủ các bước và
  không có các bước này.
- `subsenses` đúng luật tách của 7.4 (`distractors.ts:16-22`); khoảng trắng kép trong nghĩa không làm trượt so khớp vì Content
  đã gộp khoảng trắng + NFC khi ghi (`content/catalog/normalize.ts:1-3`).
- `eligibleCandidates` (ngoài PX1): bỏ chính nghĩa đang hỏi, cùng chữ không phân biệt hoa thường, dạng chia hai chiều, nghĩa con
  chung; mỗi chữ một lần; không lọc loại từ, level, từ chức năng (đúng Chốt ⚠1); fallback R13 so `definition_en` khi một bên
  không có nghĩa tiếng Việt (`:30-36`).
- `pickDistractors` trả `null` khi thiếu, ưu tiên ứng viên chưa dùng ở vòng trước (`:67-75`); `shuffle` là Fisher–Yates đúng.
- `availableTypes`: gõ từ luôn có; trắc nghiệm cần 3, đúng/sai cần 1; từ chức năng chỉ gõ từ; từ riêng làm được mọi dạng
  (`question-types.ts:9-15`). `chooseType` ưu tiên dạng khác lần trước (`:18-22`). `typingStyle` khớp bảng 7.3 (`:25-29`).
- `buildHints` khớp 7.7 và 7.4b bước 4 (`hints.ts:20-35`): nấc 1 = định nghĩa ≤ giới hạn, trừ khi đề đã là định nghĩa tiếng Anh;
  không thì câu ví dụ đã che; đề kiểu câu thì định nghĩa, không có thì nghĩa; nấc 2 chỉ cho gõ từ. Gợi ý không lộ trọn đáp án,
  trừ từ 1–2 chữ cái ở nấc 2 (design chọn "chữ cái đầu và số chữ"; lượt đúng nhờ gợi ý không được tính nên không hại).
- `sortWords` (ngoài PX5): 8 khóa đúng bảng 7.1; xáo rồi sort ổn định nên hòa thì ngẫu nhiên (`order.ts:51-68`); `queue` =
  ưu tiên → đến hạn (ngày, rồi mức) → mới → sớm → tồn đọng. `defaultSort` đúng bảng mặc định. `nextRoundOrder` không mở vòng bằng
  từ cuối vòng trước khi có ≥ 2 từ (`:71-78`).
- `weakness`/`countedAttempts` đúng §8 (`weak/weak-words.ts:13-24`): 5 lượt được tính gần nhất, ≥ 2 sai; bỏ lượt đúng nhờ gợi ý
  và lượt có báo cáo `open`/`fixed`; `no_error` tính lại; lượt sai có gợi ý vẫn là sai. Cả 5 dòng bảng §8 có test.
- `withPracticeLock` (`practice-lock.ts:7-9`): advisory lock theo transaction, khóa khác hẳn khóa của Learning
  (`learning-lock.ts:5`); theo plan chỉ dùng ở bước 1 (mở phiên, tạo báo cáo). Theo interface của plan, không đường nào lấy khóa
  người học của Learning sau khóa này (mở phiên chỉ **đọc** Learning; cổng xóa từ riêng của Task 19 không lấy khóa Practice), nên
  không có vòng chờ; cần kiểm lại khi Task 14, 18, 19 có code.
- `practice.types.ts` ghi rõ định dạng `answer_raw` (lỗ hổng #3 của review plan đã được vá).

**PR #50**
- Nguồn `today` tương đương hợp các danh sách `GET /v1/groups/:id/queue?mode=due` sau trần: trần đếm từ log có `group_id`
  (`practice-reads.queries.ts:40` so với `queue.queries.ts:51, 95`), cùng ba phần (ưu tiên trừ tồn đọng `:47` ↔ `:78`; đến hạn
  `:48` ↔ `:81-82`; mới `:49` ↔ `:85`), cùng thứ tự bên trong trần (`:58-59` ↔ `:83, 85`), bỏ trùng giữa các nhóm (`:62`). Trần
  ôn `null` = không giới hạn (`:32-33, 63`). Test so với chính API queue thật (`test/learning/practice-reads.e2e-spec.ts:83-107`).
  Thứ tự cuối do Practice sắp (Task 11), hòa thì ngẫu nhiên như design 7.1 bước 3; `added_at` là liên kết nhóm sớm nhất (plan).
- `all`, `priority` (trừ tồn đọng, D48), lọc nhóm `all`/`due`/`priority`/mức (`:72-85`); chỉ nghĩa còn thấy được ở mọi nguồn
  (`:15, 55, 85`); nhóm không phải của mình → 404 (`practice-reads.service.ts:53`). Mọi giá trị đi qua tham số `Prisma.sql`,
  không ghép chuỗi.
- `practiceGroupMates` (`practice-reads.queries.ts:107-116`): một câu cho cả lô, chỉ mục học của chính người đó
  (`i.user_id = q.user_id`), chỉ nghĩa còn thấy được, không có chính nó, mỗi nghĩa một lần; nghĩa không trong việc học → `[]`
  (`practice-reads.service.ts:60-66`). `practiceCheck` (`:69-78`) đúng interface của plan.
- `isDueNow` tách ra có thân y hệt biểu thức `wasDue` cũ (`schedule.ts:30-37`) → không đổi hành vi ôn flashcard của Bước 3.
- `practiceReview` khóa mục học `ORDER BY id FOR UPDATE` (`practice-review.service.ts:36-39`), cùng thứ tự với `lockItems`
  (`learning-lock.ts:12-16`), xóa nhóm (`groups.service.ts:104`), "Học lại" (`backlog.service.ts:78`); flashcard chỉ khóa một dòng
  (`reviews.service.ts:39-40`); `deleteMyWord` chỉ xóa mục học sau khi gọi cổng (`quick-add.service.ts:91-93`) → khớp thứ tự khóa
  của plan, không có vòng chờ. Nếu một lần xóa nhóm chạy trước, `FOR UPDATE` đọc lại và bỏ dòng đã xóa → `not-in-learning` đúng.
- Idempotent theo `review_id`, kể cả hai lời gọi cùng lúc (test `practice-review.e2e-spec.ts:155-168`); `known` chưa tới hạn →
  `known-not-allowed`, không ghi gì (`:62-65`); không có mục học → `not-in-learning` (`:54-58`).
- Dòng log của bài luyện: `group_id` null, `origin = 'practice'`, `section` từ `applyAnswer`; CHECK `section` có `backlog`
  (migration `20261018100000`), CHECK `origin` (migration `20261018140000:5`). Mọi câu đếm trần đều bỏ dòng `group_id` null
  (`queue.queries.ts:51, 95`; `practice-reads.queries.ts:40`); nhắc học dùng `cardsLeftToday` → cùng câu (D35, B4#27 có test).
- Cổng `PRIVATE_SENSES_CLEANUP`: Learning khai báo (`private-senses-cleanup.port.ts`), tiêm `@Optional()`
  (`quick-add.service.ts:50`), gọi trong transaction của `deleteMyWord`, sau bước xóa Content, trước khi xóa mục học và log
  (`:89-93`), đúng plan. `deleteMyWord` là đường duy nhất xóa từ riêng (grep `deletePrivateEntryContent`). API và worker cùng dựng
  `AppModule` (`src/worker.ts:11`), nên provider đăng ký ở `AppModule` (Task 19) tới được cả hai tiến trình.
- `createTestApp({ providers })` (`test/support/create-test-app.ts:76-96`): không truyền thì module global rỗng và không override
  gì → test cũ chạy y như trước; có truyền thì token vừa được cung cấp global vừa override mọi provider cùng token.
- Migration `20261018140000`: thêm cột null được (chỉ đổi metadata) và CHECK trên cột toàn NULL → an toàn khi deploy.

## 6. Declined to judge / Ngoài phạm vi

**Declined to judge**
- **Provider của cổng xóa từ riêng** — Task 19 (`PracticePortsModule` `@Global()` trong `AppModule`). Hiện chưa ai cung cấp nên
  `deleteMyWord` bỏ qua phần Practice mà không báo; vô hại khi chưa có dữ liệu luyện. Điều kiện: brief của plan merge **E1 trước
  D2**; nếu D2 (luồng ghi câu hỏi có từ riêng) vào `dev` trước E1 thì xóa từ riêng trong khoảng đó để lại câu hỏi chứa chữ của từ
  riêng tới khi job dọn theo `history_months` xóa.
- **Index cho cổng xóa từ riêng** — Task 19 xóa "câu hỏi của các nghĩa đó"; `practice_questions` không có index
  `(user_id, sense_id)`. Gợi ý cho Task 19: lấy `question_id` từ lần hỏi (có index `(user_id, sense_id, answered_at)`) trước khi xóa
  lần hỏi, nếu không câu xóa câu hỏi sẽ quét cả bảng trong transaction của `deleteMyWord`.
- **Đo quy mô Review Focus 2** — Task 14; PX2 chỉ đề xuất đo sớm.
- **`chooseType([])` trả `undefined`** — Task 13 phải trả `skip: 'no-type'` trước khi gọi.
- **`practice_reports.user_id NOT NULL`** so với ý "báo cáo giữ ẩn danh (`user_id` null)" khi xóa tài khoản — Bước 8 (design §15).
- **Xóa câu hỏi bằng một câu SQL gộp** — nếu Task 19 xóa lần hỏi và câu hỏi trong cùng một câu (CTE ghi dữ liệu), `RESTRICT`
  kiểm ngay có thể chặn; nên tách hai câu theo đúng thứ tự plan.
- **`prisma migrate deploy` trên DB local của luồng D** (đã chạy `150000` trước khi có `140000`): `ASSUMPTION` là deploy vẫn áp
  migration còn thiếu dù tên cũ hơn; tài liệu Prisma 7 qua context7 không nói rõ. Chỉ ảnh hưởng DB local, CI dùng DB mới. Probe:
  trên DB nháp chạy migration tới `20261018130000`, áp tay `20261018150000`, rồi `pnpm prisma migrate deploy` và đọc
  `_prisma_migrations` phải có cả hai.

**Ngoài phạm vi** (mỗi điểm một dòng, chưa lần theo hết)
- Toàn hệ thống: `IdempotencyInterceptor` giữ một transaction suốt lúc handler mở transaction riêng (`common/idempotency/idempotency.service.ts:30, 68`), pool `pg` mặc định 10 kết nối không hạn chờ → khoảng ≥ 5 lượt ghi idempotent đồng thời có thể kẹt tới khi quá giờ (SUSPECTED).
- Input chữ có ký tự U+0000 (JSON hợp lệ) tới cột `TEXT` của Postgres bị từ chối → nhiều khả năng 500 thay vì 400; `answer_raw` của Task 15 sẽ gặp nếu không chặn (SUSPECTED).
- `maskExample` (Content, PR #51): chữ viết hoa giữa câu (sau `:` hoặc trong tiêu đề, `Deploy`) không khớp mà cũng không bị tính là "khác chữ", nên câu "Rule one: Deploy early, then deploy often." cho gợi ý "Rule one: Deploy early, then ___ often." lộ đáp án (SUSPECTED, phụ thuộc nội dung).

## 7. Chưa kiểm

- Chưa chạy probe nào (theo luật của lát này); PX2 và PX4 cần probe trên Postgres thật.
- Không đọc Task 13–20 (chưa có code), nên các nhận định về cách Task 13/14/16/19 dùng các hàm này dựa trên interface của plan.
- Content của PR #51 (`practiceSenses`, `practiceCandidates`, `maskExample`) chỉ đọc để hiểu đầu vào, không review.
- Chi phí `todayIdsQuery` và `practiceGroupMates` ở quy mô 200.000 liên kết chỉ suy luận, chưa đo (đã gộp vào probe của PX2).
- Không kiểm commit merge `30e0fff` ngoài việc so diff (các file practice giống hệt `70d6e8e`) và trạng thái CI.
