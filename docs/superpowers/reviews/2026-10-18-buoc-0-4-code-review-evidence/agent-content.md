# Review độc lập — lát CT: module Content (catalog Bước 2, luồng A Bước 3, PR C1 Bước 4)

Ngày: 18/10/2026. Người review: một agent Claude không tham gia implement. Chỉ đọc code (static review), **không chạy test, không
chạy app**. Snapshot: worktree `.claude/worktrees/review-buoc-0-4/` detached ở `origin/dev` = `dc4cbe0`. Mọi đường dẫn tính từ
`apps/api/` trừ khi ghi khác.

## 1. Phạm vi đã đọc

**Code (đọc hết từng dòng):** cả 52 file trong `src/content/**` (3.713 dòng TS): `catalog/*`, `senses/*`, `learner/*`, `words/*`,
`private/*`, `sentences/*`, `inflections/*` (trừ file dữ liệu `agid-inflections.json`), `practice/*`, `sources/*`, `taxonomy/*`,
`content.service.ts`, `content.module.ts`, `index.ts`, `batch-scope.port.ts`, `content.constants.ts`; `prisma/models/content.prisma`;
migration của Content: `20261012120000_content`, `20261017160000_private_entries`, `20261017170000_entry_inflections`,
`20261017180000_private_words`, `20261017190000_context_sentences`, `20261018120000_inflections_reviewed`, `20261018130000_form_of_unlink`.

**Code đọc để lần theo đường gọi (không review sâu):** `common/idempotency/*` (interceptor, service, cleanup), `identity/staff/permission.guard.ts`,
`common/problem-details/problem-details.filter.ts`, `common/config/app-config.ts` (rate limit), `learning/quick-add/*` (gọi vào Content),
`content-pipeline/import/row-processor.ts:40-140`, `content-pipeline/publish/publish-job.handler.ts:40-90`, danh sách đường API mà
`apps/admin/src` gọi (grep).

**Test:** đọc hết `test/content/practice-senses.e2e-spec.ts`, `words.e2e-spec.ts`, `private-boundary.e2e-spec.ts`, `src/content/practice/mask-example.spec.ts`;
đọc phần lớn `senses.e2e-spec.ts`, `admin-read.e2e-spec.ts:300-383`; các file test còn lại của `test/content/` đọc qua tên test (grep `it(`).
Helper: `test/support/seed-senses.ts`, `seed-practice.ts`, `auth-helpers.ts`, `create-test-app.ts`.

**Design và tài liệu:** design Bước 2 (đọc hết §1–§17), Bước 2.5 §7.1–7.3, Bước 3 §1–§7, §10–§13, §19, Bước 4 §0–§7.7, §11–§14, plan Bước 4
(mục Verified, Global Constraints, Review Focus, Task 6–7), bảng "Quyết định của điều phối sau review độc lập" trong decision record Bước 3,
review Bước 3 (`2026-10-17-buoc-3-code-review.md`: M1, M8, bảng L, mục Test), `docs/deliveries/buoc-3.md:60-130`. Diff
`5aa4085..dc4cbe0 -- src/content` (PR #41, #42, #43, #51) đọc hết.

**Số lượt:** 3 lượt. (1) Đọc design và vẽ bản đồ route → service → SQL. (2) Đọc code từng file. (3) Lần theo từng nghi vấn tới migration,
lock và test; lập trạng thái phát hiện cũ.

## 2. Bảng tóm tắt

| ID | Mức | Phát hiện (1 dòng) | file:dòng | Trạng thái |
|---|---|---|---|---|
| CT1 | Trung bình | Revision đã `rejected` vẫn được publish (publish thường, quick-publish, job publish) và vẫn là nền ghép cho bản nháp sau | `src/content/senses/publish.service.ts:89-115` (không kiểm `status` ở `:95-97`); `src/content/senses/senses.service.ts:88-91` | CONFIRMED (lần theo code) |
| CT2 | Trung bình | Tìm kiếm, tra từ, trang từ của người học quét toàn bộ `senses`/`entries` gồm từ riêng của **mọi** người học (không có index dùng được); chi phí tăng theo tổng số từ riêng của cả hệ thống; GET không có rate limit | `src/content/words/words.service.ts:78-101, 110-120, 134-137, 148-190`; `src/content/learner/visible-senses.ts:9-15` | SUSPECTED |
| CT3 | Thấp | Revert xóa revision mới nhất nên `revision_no` bị dùng lại; kiểm "stale" chỉ so số nên file xuất cũ hoặc danh sách publish cũ áp vào nội dung khác mà không bị chặn | `src/content/catalog/revert.service.ts:95-104`; `src/content/senses/senses.service.ts:109`; `src/content/senses/import-content.ts:63`; `src/content/senses/publish.service.ts:96` | CONFIRMED (lần theo code) |
| CT4 | Thấp | Tạo sense thay nghĩa (`replaces_sense_id`) không kiểm nhãn ngữ cảnh; lúc publish đụng unique index → 500, và cả lô publish dừng giữa chừng | `src/content/senses/senses.service.ts:59-72`; `src/content/senses/publish.service.ts:104-113`; `src/content/senses/admin-publish.controller.ts:33-34` | CONFIRMED (lần theo code) |
| CT5 | Thấp | `maskExample`: token có `'s` (`student's`) không tính là chỗ khớp nên câu vẫn được dùng mà lộ đáp án; từ nhiều chữ khớp qua dấu phẩy; chữ hoa sau từ viết tắt (`Mr. March`) bị coi là đầu câu | `src/content/practice/mask-example.ts:7, 17, 38-47` | CONFIRMED (lần theo code, chưa chạy) |
| CT6 | Thấp | `maskExample` bỏ ký tự không phải chữ cái của dạng từ: `a.m.`/`p.m.` (có trong CEFR-J) để lại dấu `.` sau `___` mà đáp án vẫn đòi dấu chấm; `MP3 player` khớp "MP4 player"; biến thể `am` che cả động từ "am" | `src/content/practice/mask-example.ts:9, 31-33, 44` | CONFIRMED (che); SUSPECTED (hệ quả ở chấm điểm Bước 4) |
| CT7 | Thấp | Tìm kiếm, tra từ và từ riêng không coi nháy cong `’` là `'`: gõ `o’clock` (bàn phím iPhone) không ra `o'clock`, và tạo được từ riêng trùng | `src/content/words/words.schemas.ts:6-7`; `src/content/learner/learner-content.controller.ts:21`; `src/content/catalog/normalize.ts:1-3` | CONFIRMED (server); ASSUMPTION (tần suất ở thiết bị) |
| CT8 | Thấp | API sửa nghĩa không xóa được `definition_en`: gửi `null` hay `""` đều bị coi là "giữ nguyên", trái design §5 ("muốn xóa giá trị thì sửa qua API") | `src/content/senses/revision-content.ts:66-67`; `src/content/senses/content-body.ts:11` | CONFIRMED (lần theo code) |
| CT9 | Thấp | Trần 1.000 từ riêng chỉ đếm entry; số nghĩa riêng của một entry không giới hạn (chỉ bị chặn gián tiếp bởi 100 nhóm × 2.000 từ) | `src/content/private/private-words.service.ts:131-147` | CONFIRMED (lần theo code) |

Không tìm thấy lỗi mức **Cao**. Ranh giới riêng tư (người học B không thấy dữ liệu của A, staff không thấy/sửa từ riêng) giữ đúng ở mọi đường
đã rà (mục 6).

## 3. Từng phát hiện

### CT1 — Revision `rejected` vẫn publish được và vẫn làm nền cho bản nháp sau (Trung bình, CONFIRMED)

**Chỗ lỗi:** `src/content/senses/publish.service.ts:89-115` (`publishRevision`); `src/content/senses/senses.service.ts:88-91` (`saveDraft`).

**Cơ chế:** `publishRevision` chỉ kiểm sense đã retire, số revision có phải mới nhất không, đã publish chưa, và đủ điều kiện publish; **không**
nhìn `revision.status`.

```ts
// publish.service.ts:94-101
if (sense.state === 'retired') return { outcome: 'refused', reason: 'sense-retired' };
const revision = sense.revisions[0];
if (!revision || revision.revisionNo !== item.revision) return { outcome: 'refused', reason: 'stale-revision' };
if (sense.state === 'open' && sense.liveRevisionId === revision.id) return { outcome: 'already_published' };
const hasLevel = await tx.entryLevel.findFirst({ where: { entryId: sense.entryId }, select: { id: true } });
const violations = publishViolations(revision, hasLevel !== null);
```

Trong khi đó `markRevisions` coi `rejected` là đã đóng: không cho đánh dấu lại `reviewed` (`senses.service.ts:122-123`
`!['draft', 'reviewed', item.action].includes(latest.status) ? 'revision-not-open'`). `saveDraft` lấy `sense.revisions[0]` (bất kể status) làm
nền ghép (`senses.service.ts:88-91`), nên bản nháp kế tiếp kế thừa nội dung đã bị bác.

**Ba đường dẫn tới publish nội dung đã bị bác:**
1. `POST /v1/admin/content/senses/publish` với `{sense_id, revision: N}` khi N là revision `rejected` mới nhất.
2. `POST /v1/admin/content/senses/:id/quick-publish` với nội dung không đổi: `saveDraft` trả lại revision `rejected` (hash bằng nhau,
   `senses.service.ts:104-105`), rồi `publishRevision` publish nó.
3. Job publish: lúc chụp (`admin-catalog.queries.ts:285`) chỉ lấy revision `draft`/`reviewed`, nhưng worker gọi lại `publishItem`
   (`content-pipeline/publish/publish-job.handler.ts:50`); revision bị bác **sau** lúc chụp vẫn được publish.

**Vì sao sai:** design Bước 2 §6: "revision `draft` → (tùy chọn) `reviewed` → `published`; `rejected` cho revision **chủ động bỏ**". Không có
mũi tên `rejected → published`; code của chính module (markRevisions) cũng coi `rejected` là đóng.

**Hậu quả:** reviewer bác revision 3 của `bank` (ví dụ sai); một nhân sự khác (hoặc job publish đã chụp trước đó) publish `{bank, 3}` →
nội dung bị bác hiện cho mọi người học trong tìm kiếm, thẻ ôn và (Bước 4) đề luyện. Lần sửa tiếp theo qua API hoặc CSV cũng ghép lên nội
dung bị bác, nên ví dụ sai quay lại bản nháp mới.

**Đã loại trừ:**
- Một ràng buộc DB chặn chuyển trạng thái: không có. Migration chỉ có CHECK liệt kê giá trị (`20261012120000_content/migration.sql`,
  `sense_revisions_status_check`); trigger duy nhất trên Content là `entries_clear_form_kind` (grep `TRIGGER`).
- Controller kiểm thêm: `admin-publish.controller.ts:30-37` chỉ gọi `publishItem`.
- Giao diện admin hiện **không** gọi `/senses/review` (grep đường API trong `apps/admin/src`), nên hôm nay chỉ tới được qua API trực tiếp.
  Nhưng Bước 2 là "API trước" (D9) và giao diện admin sẽ được làm lại, nên đây là hợp đồng của API.

**Probe đề xuất** (e2e, `createTestApp({ databaseUrl: await createIsolatedDatabase() })`, `seedUser`/`startSession` editor và learner `nativeLanguage: 'vi'`):
1. Trong một transaction có `content.lockEntryKey(tx, 'probe', 'noun')`: `ensureEntry` → `setEditorialLevel(…, 'A1')` → `createSense` với
   `{ glossVi: 'thăm dò', examplesEn: ['A probe.'], definitionEn: null, topicCodes: [], acceptedForms: [] }` → revision 1 `draft`.
2. `POST /v1/admin/content/senses/review` `{ items: [{ sense_id, revision: 1, action: 'rejected' }] }` → `items[0].ok === true`.
3. `POST /v1/admin/content/senses/publish` `{ items: [{ sense_id, revision: 1 }] }`.
   - Kỳ vọng: `results[0].outcome === 'refused'` (lý do mới, ví dụ `revision-rejected`), `sense.liveRevisionId === null`.
   - Nghi là thật: `{ outcome: 'published' }`; `GET /v1/senses/search?q=probe` (learner) trả 1 mục; revision có `status = 'published'`.
4. Biến thể quick: lặp bước 1–2 với lemma khác, rồi `POST /v1/admin/content/senses/:id/quick-publish` `{ revision: 1, content: {} }` → nghi
   là `200 outcome: 'published'`.
5. Biến thể nền ghép: sense đã publish rev1 `examples_en: ['Good.']`; `PUT /draft` `{revision: 1, content: {examples_en: ['Bad.']}}`; bác rev2;
   `PUT /draft` `{revision: 2, content: {definition_en: 'New.'}}` → đọc rev3: nghi là `examples = ['Bad.']`, kỳ vọng hợp lý `['Good.']`.

**Cách sửa gợi ý:** `publishRevision` từ chối khi `revision.status` là `rejected` (hoặc `superseded`) với lý do riêng; `saveDraft`/`importContent`
ghép lên revision mới nhất **chưa bị bác** (hoặc revision đang live) thay vì `revisions[0]`.

---

### CT2 — Tìm kiếm / tra từ / trang từ quét từ riêng của mọi người học (Trung bình, SUSPECTED)

**Chỗ lỗi:** `src/content/words/words.service.ts:78-101` (`senses()`), `:110-120` (`wordPage` và `has_page`), `:134-137` (`lookup`),
`:148-190` (`search`); điều kiện thấy được ở `src/content/learner/visible-senses.ts:9-15`.

**Cơ chế:** câu truy vấn ngoài quét `senses s JOIN entries e` mà không có điều kiện nào trên `e.scope`/`e.owner_user_id`; điều kiện "người
học thấy được" nằm trong một `EXISTS` riêng trên bảng bí danh `vs`/`ve`:

```sql
-- visible-senses.ts:11-14 (nhúng vào mọi câu của words.service)
EXISTS (SELECT 1 FROM senses vs JOIN entries ve ON ve.id = vs.entry_id
  WHERE vs.id = s.id AND vs.state = 'open' AND vs.live_revision_id IS NOT NULL
    AND (ve.scope = 'catalog' OR (ve.scope = 'private' AND ve.owner_user_id = $viewer)))
-- words.service.ts:111 / :135
WHERE <visible> AND e.lemma = $lemma          -- trang từ
WHERE <visible> AND (lower(e.lemma) = $q OR EXISTS (… lower(v.text) = $q))   -- tra từ
```

Index hiện có trên `entries` chỉ là hai unique index **từng phần** (partial index, chỉ phủ một phần bảng):
`entries_catalog_key (language, lemma, pos) WHERE scope = 'catalog'` và `entries_private_key (owner_user_id, …) WHERE scope = 'private'`
(`20261017160000_private_entries/migration.sql:12-13`). Câu truy vấn không có `scope`/`owner_user_id` ở `e`, nên planner (bộ lập kế hoạch
truy vấn của Postgres) không dùng được hai index này; không có index trên `lower(lemma)` hay `senses(entry_id)`. Vì vậy mỗi lần gọi phải quét
cả bảng `senses` và `entries` — gồm cả từ riêng của mọi người khác — rồi mới lọc. `/v1/words?q=` còn tính `displayedLevel` (LATERAL) và
nghĩa cho mọi nghĩa thấy được trước khi gom nhóm (`:171-187`).

**Vì sao sai:** design Bước 2 §9 bỏ index với lý do "~9.800 entry … quét tuần tự vẫn nhỏ; plan đo trước khi thêm chỉ mục; ASSUMPTION"
(comment `learner-content.service.ts:115` nhắc lại). Bước 3 §5.2 thêm từ riêng (tối đa 1.000 mỗi người) vào **cùng** bảng `entries`/`senses`,
nên số dòng bị quét không còn bị chặn bởi catalog mà tăng theo **tổng** số người học. Phép đo quy mô của Bước 3 chỉ đo `GET /v1/groups`
nhánh catalog (review Bước 3, mục "Hiệu năng": "chưa đo nghĩa riêng").

**Hậu quả:** ở pilot (vài người) không thấy gì. Khi mở rộng, ví dụ 3.000 người × 100 từ riêng = 300.000 dòng, mỗi lần gõ để tìm (`/v1/words`),
mỗi lần "Thêm nhanh" (`/v1/lookup`) và mỗi trang từ đều quét ~310.000 dòng; thời gian tăng tuyến tính với số người dùng. Các route GET này
không có rate limit (`common/config/app-config.ts:86-104` chỉ có luật cho thao tác ghi), nên một tài khoản gọi liên tục `/v1/words?q=a` cũng
đẩy tải lên DB.

**Đã loại trừ:**
- Partial index có thể được dùng: không, vì câu ngoài không có vị từ `scope`/`owner_user_id` trên `e` (đã kiểm `words.service.ts:98, 111, 135`).
- `cardContent`, `practiceSenses`, `practiceCandidates`, `visibleSenseIds` **không** bị: chúng lọc `s.id = ANY($ids)` theo khóa chính.
- `/v1/senses/search` (Bước 2) lọc `e.scope = 'catalog'` trực tiếp (`learner-content.service.ts:106`), ít bị hơn.

**Probe đề xuất** (e2e riêng kiểu scale test của Learning, `createIsolatedDatabase()`):
1. `seedVisibleSenses(prisma, 9_800, 'cat')` làm catalog.
2. Đo p50 của 5 lần gọi mỗi route bằng một learner `nativeLanguage: 'vi'`: `GET /v1/lookup?q=cat-1`, `GET /v1/words?q=cat-12`, `GET /v1/words/cat-1`.
3. Chèn 300.000 entry riêng bằng một câu SQL giống `seedVisibleSenses` nhưng `scope = 'private'`, `owner_user_id` lấy vòng trong 300 UUID ngẫu
   nhiên (mỗi entry một sense `open` + revision `published` + text `vi`), rồi đo lại bước 2.
4. Chạy `EXPLAIN (ANALYZE, BUFFERS)` câu SQL của `senses()` với `where = e.lemma = 'cat-1'` và id của learner.
- Kỳ vọng (theo giả định design): thời gian không phụ thuộc từ riêng của người khác.
- Nghi là thật: kế hoạch có `Seq Scan on senses`/`entries` ~310k dòng; p50 sau bước 3 lớn hơn nhiều lần bước 2.

**Cách sửa gợi ý:** đặt điều kiện thấy được trực tiếp trên `e` (`e.scope = 'catalog' OR (e.scope = 'private' AND e.owner_user_id = $viewer)`)
để planner dùng được partial index; thêm index `entries (lower(lemma))` (hoặc trigram cho `contains`) và `senses (entry_id)`; cân nhắc rate
limit đọc cho tìm kiếm. Thêm phép đo vào scale test.

---

### CT3 — `revision_no` bị dùng lại sau revert, nên kiểm "stale" không phát hiện thay đổi (Thấp, CONFIRMED)

**Chỗ lỗi:** `src/content/catalog/revert.service.ts:95-104` (xóa revision mới nhất), `src/content/senses/senses.service.ts:109`
(`revisionNo: latest.revisionNo + 1`), `src/content/senses/import-content.ts:63`, `src/content/senses/publish.service.ts:96`.

**Cơ chế:**

```ts
// revert.service.ts:98-102 — revision do lô tạo, chưa publish, vẫn là mới nhất → xóa hẳn
if (revision.revisionNo !== latest?.revisionNo) { …skip… }
const removed = await tx.senseRevision.deleteMany({ where: { id: revision.id } });
// senses.service.ts:109 — revision sau đó lấy lại đúng số vừa bị xóa
senseId: sense.id, revisionNo: latest.revisionNo + 1, ...
// import-content.ts:63 và publish.service.ts:96 — "stale" chỉ so số
if (input.revision !== sense.revisions[0]?.revisionNo) return rejected('stale-revision');
```

**Vì sao sai:** design Bước 2 §4 định nghĩa `revision_no` "tăng dần theo sense"; B2E10 ("bản sửa qua API không bao giờ bị ghi đè") và B2E11
("publish từ danh sách cũ bị từ chối stale") dựa vào việc số revision không bao giờ lặp lại. Revert (§7, PR16) xóa revision nên số bị dùng lại.

**Hậu quả** (ví dụ cụ thể):
1. `bank` live ở rev1 (`E1`). Lô B1 tạo rev2 (ví dụ `E2`). Nhân sự P lấy danh sách/xuất file: `{bank, revision 2}`.
2. Revert B1 → rev2 bị xóa.
3. Nhân sự E sửa qua API → rev2 **mới** (ví dụ `E3`, `draft_source = ui`).
4. P publish `{bank, 2}` → publish nội dung `E3` mà P chưa từng xem; hoặc P upload file xuất cũ (có `sense_id`, `revision = 2`) → được nhận,
   tạo rev3 mang `E2`, bản sửa `E3` của E bị `superseded` mà không có lỗi xung đột nào.

Cần một chuỗi revert + sửa + dùng lại danh sách cũ, và hiện chỉ xảy ra khi dùng API (giao diện admin chỉ có CSV, publish job chụp lúc tạo),
nên để mức Thấp.

**Đã loại trừ:**
- Prefilter của Pipeline có thể chặn: nó chỉ dùng hash để ghi `unchanged` khi nội dung **giống** (design §5 "lọc trước"); nội dung khác thì đi
  tiếp vào `importContent`, nơi chỉ so số.
- Có bộ đếm revision riêng trên sense: không (`prisma/models/content.prisma:95-111`, không có cột đếm).

**Probe đề xuất** (e2e mức service, không cần Pipeline): trong `test/content/…`:
1. Như fixture `published()` của `senses.e2e-spec.ts`: `bank` có rev1 published (`examplesEn: ['E1']`).
2. `write('bank', tx => content.saveDraft(tx, { senseId, baseRevision: 1, content: { examplesEn: ['E2'] }, source: 'csv', actorId }))` → rev2 (`R2`).
3. `const stale = (await content.latestRevisions([senseId])).get(senseId)!.revisionNo` → `2`.
4. `await content.revertRecords([{ type: 'revision', id: R2 }])` → `removed.revision === 1`.
5. `saveDraft({ baseRevision: 1, content: { examplesEn: ['E3'] }, source: 'ui' })` → trả `revisionNo === 2`.
6. `content.publishItem({ senseId, revision: stale }, actorId)`.
- Kỳ vọng: `refused / stale-revision`.
- Nghi là thật: `{ outcome: 'published' }`, live `examples = ['E3']`.
- Biến thể CSV: thay bước 6 bằng `write(tx => content.importContent(tx, { entryId, lemma: 'bank', senseId, revision: 2, content: { examplesEn: ['E2'] },
  contextLabel: null, replaceMeaning: false, actorId }))` → nghi là `kind: 'new_revision'` (rev3 = `E2`, rev2 `ui` thành `superseded`).

**Cách sửa gợi ý:** cấp số revision từ một bộ đếm không lùi (cột `senses.next_revision_no`), hoặc revert đánh dấu revision là `rejected`/"đã hoàn
tác" thay vì xóa.

---

### CT4 — Sense thay nghĩa không kiểm nhãn; publish đụng unique index → 500 (Thấp, CONFIRMED)

**Chỗ lỗi:** `src/content/senses/senses.service.ts:59-72`; `src/content/senses/publish.service.ts:104-113`;
`src/content/senses/admin-publish.controller.ts:33-34`.

**Cơ chế:** khi có `replacesSenseId`, `createSense` bỏ qua kiểm `sense-exists` (chỉ nhánh `else` kiểm), nên sense thay thế mang nhãn bất kỳ:

```ts
// senses.service.ts:59-72 (rút gọn)
if (input.replacesSenseId) {
  …kiểm target catalog, cùng entry, chưa retire, chưa có thay thế đang chờ…
} else if (await tx.sense.findFirst({ where: { entryId: entry.id, contextLabel, state: { not: 'retired' },
  OR: [{ replacesSenseId: null }, { liveRevisionId: { not: null } }] } })) throw new ContentRuleError('sense-exists');
```

Lúc publish, `publishRevision` đặt `live_revision_id` (`publish.service.ts:113`), sense thay thế lúc này nằm trong unique index
`senses_entry_label_live_key (entry_id, coalesce(context_label,''))` → trùng với một sense khác đang live cùng nhãn → Prisma `P2002` không được
bắt → `ProblemDetailsFilter` trả 500 (`common/problem-details/problem-details.filter.ts:80-86`). Route publish lặp từng mục trong một vòng `for` không `try`
(`admin-publish.controller.ts:33-34`), nên các mục sau trong cùng request không được xử lý; các mục trước đã commit.

**Vì sao sai:** design §4 yêu cầu bất biến "tối đa một sense chưa retire và không chờ thay thế cho mỗi (entry, nhãn)" — DB giữ đúng, nhưng
API phải trả lỗi quy tắc (400/từng mục `refused`) chứ không phải 500. Design §6: publish theo lô "từng mục độc lập".

**Hậu quả:** `bank` có S0 (nhãn null) và S1 (`river`), cả hai đang live. Nhân sự muốn thay nghĩa S1 nhưng quên gửi lại `context_label` →
sense thay thế nhãn null → publish trả 500, các mục khác trong lô không được publish. (Đường CSV không bị vì dòng `replace_meaning` mang đúng
nhãn đã khớp, `import-content.ts:49-56, 76-80`.)

**Đã loại trừ:** dữ liệu không hỏng (transaction rollback); nhánh không-thay-thế có kiểm `sense-exists` (`:69-72`); target đã retire bị chặn
lúc tạo (`:64`) nhưng target bị retire **sau** khi tạo thay thế, rồi có sense mới cùng nhãn, cũng dẫn tới cùng lỗi 500.

**Probe đề xuất** (e2e, editor token, `user.write` nâng cao như `senses.e2e-spec.ts`):
1. Entry `bank/noun` level A1; S0 (nhãn null) và S1 (nhãn `river`), cả hai đủ điều kiện và đã publish; một nháp đủ điều kiện D ở entry `zzz/noun`.
2. `POST /v1/admin/content/senses` `{ entry_id, replaces_sense_id: S1, content: { gloss_vi: 'bờ', examples_en: ['x.'] } }` (không có `context_label`).
   - Kỳ vọng: 400 `sense-exists`. Nghi là thật: 201.
3. `POST /v1/admin/content/senses/publish` `{ items: [{ sense_id: <S2 vừa tạo>, revision: 1 }, { sense_id: D, revision: 1 }] }`.
   - Kỳ vọng: 200; S2 `refused` với lý do quy tắc; D `published`.
   - Nghi là thật: 500 `about:blank`; D không được publish; S1 vẫn `open`.

**Cách sửa gợi ý:** sense thay thế lấy đúng nhãn của target (hoặc kiểm nhãn như nhánh thường, loại trừ chính target); trong `publishRevision`
bắt `P2002` của index này thành `refused`.

---

### CT5 — `maskExample` để lộ đáp án hoặc che nhầm trong vài dạng câu (Thấp, CONFIRMED bằng lần theo code)

**Chỗ lỗi:** `src/content/practice/mask-example.ts:7` (mẫu token gồm cả dấu nháy), `:17` (nhận diện đầu câu), `:38-47` (khớp và luật "cùng một chữ").

**Cơ chế:**

```ts
const tokenPattern = /[\p{L}'‘’]+/gu;                                   // :7  token = chữ cái + dấu nháy
sentenceStart: tokens.length === 0 || /[.!?]/.test(sentence.slice(last, start))  // :17
return token.text === part || (k === 0 && token.sentenceStart && token.text === part.charAt(0).toUpperCase() + part.slice(1)); // :41
if (matches.length === 0 || matches.some(({ form }) => form !== matches[0].form)) return null;                                // :47
```

Ba trường hợp:
- **(a) Lộ đáp án qua token có `'s`:** `student's` là **một** token khác `student`, nên không phải "chỗ khớp"; luật ở `:47` chỉ xét các chỗ
  khớp. Câu "Each student's work is checked by another student." → che chữ `student` cuối, giữ nguyên `student's` → đáp án hiện ngay trong đề.
  Ví dụ catalog dạng sở hữu (`company's`, `child's`, `teacher's`) là bình thường.
- **(b) Từ nhiều chữ khớp qua dấu câu:** chỉ kiểm hai token đứng liền trong danh sách token, không kiểm giữa chúng chỉ có khoảng trắng. "She looks,
  after all, tired." khớp `looks after` → "She ___ all, tired.".
- **(c) Chữ hoa sau từ viết tắt bị coi là đầu câu:** dấu `.` của `Mr.`/`a.m.` làm token sau thành "đầu câu", nên `March` trong "Mr. March will
  march." bị che như động từ `march` → B4E37 sai ở ca này.

**Vì sao sai:** design Bước 4 §7.4b: "chỉ dùng câu mà mọi chỗ khớp là cùng một chữ" (mục đích: đề không tự lộ/không có hai đáp án); "từ nhiều chữ
khớp khi các chữ **đứng liền nhau**"; B4E37: chữ viết hoa không ở đầu câu thì không che. Design im lặng về dạng sở hữu; kỳ vọng hợp lý là câu có
chính chữ đáp án nằm trong một token khác thì không dùng cho kiểu B.

**Hậu quả:** khi Bước 4 dùng hàm này, một số câu đề kiểu B tự lộ đáp án (a) hoặc che sai chỗ (b, c). Không mất dữ liệu; người học thấy đề dễ hoặc lạ.
(a) là trường hợp dễ gặp nhất.

**Đã loại trừ:** design §7.4b định nghĩa token gồm cả dấu nháy, nên `student's ≠ student` là đúng design; lỗi nằm ở chỗ câu vẫn được dùng. Các
ca design nêu (B4E35, B4E37 cơ bản, `redeploys`, gạch nối, nháy cong) đều đúng và có test (`mask-example.spec.ts:7-61`).

**Probe đề xuất** (unit, thêm vào `src/content/practice/mask-example.spec.ts`):
```ts
const student = { lemma: 'student', variants: [], inflections: [{ form: 'students' }] };
expect(maskExample("Each student's work is checked by another student.", student)).toBeNull();
// nghi là thật: { masked: "Each student's work is checked by another ___.", blank: 'student', base: true }
const lookAfter = { lemma: 'look after', variants: [], inflections: [{ form: 'looks after' }] };
expect(maskExample('She looks, after all, tired.', lookAfter)).toBeNull();      // nghi: { masked: 'She ___ all, tired.', … }
const march = { lemma: 'march', variants: [], inflections: [{ form: 'marched' }] };
expect(maskExample('Mr. March will march.', march)).toEqual({ masked: 'Mr. March will ___.', blank: 'march', base: true });
// nghi: { masked: 'Mr. ___ will ___.', … }
```

**Cách sửa gợi ý:** trả `null` khi có token chứa một dạng của từ cộng hậu tố `'s`/`'` (hoặc khi có token nào bắt đầu bằng dạng đó rồi tới dấu
nháy); yêu cầu phần giữa hai chữ của từ nhiều chữ chỉ là khoảng trắng/gạch nối; chỉ coi là đầu câu khi `.!?` đứng sau một token dài hơn 1–3 chữ
cái và trước khoảng trắng (hoặc bỏ luật chữ hoa đầu câu cho token đứng ngay sau `Mr.`/`Mrs.`/`Dr.`).

---

### CT6 — Dạng từ có ký tự không phải chữ cái (`a.m.`, `p.m.`, `MP3 player`) bị che lệch (Thấp)

**Chỗ lỗi:** `src/content/practice/mask-example.ts:9` (`words()` chỉ giữ chữ cái và nháy), `:31-33`, `:44` (đoạn che kết thúc ở token cuối).

**Cơ chế:** `words('a.m.')` = `['a', 'm']`; câu "The shop opens at 9 a.m." khớp hai token `a`, `m` liền nhau và che từ đầu `a` tới cuối `m`, nên dấu
`.` cuối vẫn hiện: "The shop opens at 9 ___." với `blank = 'a.m.'`. `words('MP3 player')` = `['MP', 'player']` nên "an MP4 player" cũng khớp
(che thành "an ___.", đáp án `MP3 player`). Biến thể `am` của `a.m.` (CEFR-J `a.m./A.M./am/AM`) khớp cả động từ "am": "I am at work at 9 am."
→ "I ___ at work at 9 ___.".

**Vì sao sai:** design §7.4b che "đúng chữ" và §7.6 chấm sau chuẩn hóa (NFC, cắt/gộp khoảng trắng, nháy cong → thẳng, chữ thường) **không bỏ dấu
câu**. Người học thấy "9 ___." sẽ gõ `a.m` (dấu chấm đã ở ngoài chỗ trống) → không khớp `a.m.`, `A.M.`, `am`, `AM` → bị chấm sai. Headword thật
có ký tự này: `a.m./A.M./am/AM`, `p.m./P.M./pm/PM`, `doctor/Dr./Dr`, `Mr./Mr`, `Mrs./Mrs`, `Ms./Ms`, `MP3 player`
(`docs/preparation/evidence/wordlists_2026-10-02/cefrj-vocabulary-profile-1.5.csv` dòng 3, 2000, 4358–4361, 4798).

**Hậu quả:** vài từ CEFR-J có đề kiểu B "bẫy" (gõ hợp lý mà bị chấm sai) hoặc che sai từ. `Dr.`, `Mr.` ít bị vì có biến thể không dấu chấm được
chấp nhận.

**Đã loại trừ:** phần chấm (Bước 4, Task 9) chưa có trong snapshot (`src/practice` không tồn tại ở `dc4cbe0`), nên hệ quả chấm điểm là SUSPECTED
theo đúng bảng chuẩn hóa của design §7.6; phần che là CONFIRMED theo code.

**Probe đề xuất** (unit):
```ts
const am = { lemma: 'a.m.', variants: ['A.M.', 'am', 'AM'], inflections: [] };
expect(maskExample('The shop opens at 9 a.m.', am)).toBeNull();            // nghi: { masked: 'The shop opens at 9 ___.', blank: 'a.m.', base: true }
expect(maskExample('I bought an MP4 player.', { lemma: 'MP3 player', variants: [], inflections: [] })).toBeNull(); // nghi: masked 'I bought an ___.'
expect(maskExample('I am at work at 9 am.', am)).toBeNull();               // nghi: masked 'I ___ at work at 9 ___.'
```

**Cách sửa gợi ý:** với dạng từ có ký tự ngoài chữ cái/nháy, so nguyên văn (kể cả dấu câu) hoặc không dùng kiểu B cho dạng đó; không cho biến thể
trùng một từ chức năng phổ biến (`am`) tự khớp khi câu có cả dạng chính.

---

### CT7 — Tìm/tra/từ riêng không gộp nháy cong `’` với `'` (Thấp)

**Chỗ lỗi:** `src/content/words/words.schemas.ts:6-7` (`searchText` = `normalizeText` + chữ thường), `src/content/learner/learner-content.controller.ts:21`,
`src/content/catalog/normalize.ts:1-3` (`normalizeText` chỉ cắt khoảng trắng, gộp khoảng trắng, NFC).

**Cơ chế:** `q = "o’clock"` (U+2019) đi thẳng vào `lower(e.lemma) = $q` / `ILIKE` mà không đổi thành `'`; lemma CEFR-J dùng `'` thẳng (`o'clock`,
`'m`, `'re`, `driver's license`). Lemma từ riêng cũng không đổi, nên `o’clock` và `o'clock` thành hai từ riêng khác nhau.

**Vì sao sai:** design im lặng về tìm kiếm; nhưng chính design Bước 4 §7.6 coi nháy cong = nháy thẳng khi chấm và `maskExample` cũng vậy
(`mask-example.ts:8`). Kỳ vọng hợp lý: gõ `o’clock` thì tra ra `o'clock`. Bàn phím iOS mặc định bật "Smart Punctuation" đổi `'` thành `’`
(ASSUMPTION: chưa thử trên Safari của trang `apps/web`).

**Hậu quả:** "Thêm nhanh" (`GET /v1/lookup`) không tìm thấy từ catalog có dấu nháy → người học tự nhập → tạo từ riêng trùng catalog.

**Đã loại trừ:** không có middleware nào chuẩn hóa query (đã đọc `normalize.ts`, `words.schemas.ts`, `learner-content.controller.ts:71-75`).

**Probe đề xuất** (e2e): `seedPracticeSense(prisma, { lemma: "o'clock", pos: 'adverb', glossVi: 'giờ đúng', examples: ['At 5 o\'clock.'] })`, rồi
learner `GET /v1/lookup?q=o’clock`, `GET /v1/words?q=o’clock`, `GET /v1/senses/search?q=o’clock` → kỳ vọng có sense đó; nghi là thật:
`{ senses: [], via_inflection: [] }` / `items: []`.

**Cách sửa gợi ý:** đổi `‘ ’` thành `'` trong `searchText`, `searchQuery` và chuẩn hóa lemma từ riêng (giữ nguyên dữ liệu catalog).

---

### CT8 — API không xóa được `definition_en` (Thấp, CONFIRMED)

**Chỗ lỗi:** `src/content/senses/revision-content.ts:66-67`; `src/content/senses/content-body.ts:11`.

**Cơ chế:** schema nhận `definition_en: null` (`content-body.ts:11` `.nullable()`), nhưng khi ghép:

```ts
glossVi: patch.glossVi?.trim() ? patch.glossVi : base.glossVi,
definitionEn: patch.definitionEn?.trim() ? patch.definitionEn : base.definitionEn,
```

`null` hoặc `""` đều giữ giá trị cũ; hash bằng nhau nên `saveDraft` trả `changed: false` và không tạo revision (`senses.service.ts:104-105`). Test
`senses.e2e-spec.ts:301-316` (B2#26 ui) khẳng định hành vi "trống = giữ" cho cả API.

**Vì sao sai:** design Bước 2 §5 bước 3: "Ô trống nghĩa là giữ nguyên … **Muốn xóa giá trị thì sửa qua API từng sense**." Hiện không có đường nào
(CSV, API, giao diện) xóa được `definition_en`.

**Hậu quả:** định nghĩa tiếng Anh nhập sai chỉ thay được bằng chữ khác, không bỏ được. Với người học `en`, định nghĩa chính là nghĩa hiển thị; ở Bước 4,
định nghĩa > 200 ký tự không dùng làm gợi ý mà cũng không bỏ được để chuyển sang gợi ý bằng câu ví dụ. API nhận `null` mà lặng lẽ bỏ qua.

**Đã loại trừ:** có cờ "xóa" riêng hay route khác: không (đã đọc `admin-senses.controller.ts`, `content-body.ts`).

**Probe đề xuất** (e2e): sense đã publish có `definition_en: 'Wrong.'`; `PUT /v1/admin/content/senses/:id/draft` `{ revision: 1, content: { definition_en: null } }`
→ kỳ vọng (theo design): rev2 không có text `en/definition`; nghi là thật: `200 { revision: 1 }`, không có revision mới, định nghĩa vẫn còn.

**Cách sửa gợi ý:** ở API, phân biệt `null` (xóa) với không gửi (giữ); CSV giữ luật "ô trống = giữ".

---

### CT9 — Số nghĩa riêng mỗi entry không có trần (Thấp, CONFIRMED)

**Chỗ lỗi:** `src/content/private/private-words.service.ts:131-147`.

**Cơ chế:** chỉ đếm khi tạo **entry** mới; entry đã có thì thêm sense mới (`p2`, `p3`, …) không kiểm gì:

```ts
let entry = await tx.entry.findFirst({ where: { scope: 'private', ownerUserId: input.ownerId, language: 'en', lemma, pos } });
if (!entry) {
  if (await tx.entry.count({ where: { scope: 'private', ownerUserId: input.ownerId } }) >= PRIVATE_WORDS_MAX) throw new PrivateWordLimitError();
  …
}
for (let n = 2; labels.has(contextLabel); n++) contextLabel = `p${n}`;
const sense = await tx.sense.create({ … });
```

**Vì sao sai:** design Bước 3 §5.2 đặt trần "mỗi người tối đa 1.000 từ riêng" nhưng im lặng về số nghĩa mỗi từ; kỳ vọng hợp lý là trần giới hạn được
lượng dữ liệu riêng một người tạo. Bước 5 sẽ biến trần thành hạn mức theo gói (D23), nên đơn vị đếm cần chốt trước.

**Hậu quả:** một người học gửi `POST /v1/quick-add` với cùng `lemma`, mỗi lần một nghĩa khác, tạo được ~200.000 nghĩa riêng (chỉ bị chặn bởi 100 nhóm ×
2.000 từ của Learning và rate limit 30 lần/phút) thay vì 1.000.

**Đã loại trừ:** trần nhóm của Learning có chặn nhưng ở mức 200.000; design cho phép nhiều nghĩa một từ (test `private-words.e2e-spec.ts:124`).

**Probe đề xuất** (e2e mức service): learner L; lặp 1.001 lần
`tx(t => content.createPrivateSense(t, { ownerId: L, lemma: 'same', pos: null, meaning: { text: 'm' + i, language: 'vi' }, level: null, topicCodes: [], formOf: null }))`
→ kỳ vọng (nếu trần tính theo nghĩa): lần 1.001 bị `private-word-limit-reached`; nghi là thật: cả 1.001 lần thành công, entry có 1.001 sense.

**Cách sửa gợi ý:** đếm sense riêng (hoặc thêm trần nghĩa mỗi từ, ví dụ 10) cùng dưới lock của chủ (`lockOwner`).

## 4. Test gaps (chỉ các mục quan trọng)

- **TG1 — publish revision `rejected`:** không test nào kiểm publish/quick-publish/job từ chối revision đã bị bác (`grep rejected test/content/publish.e2e-spec.ts`
  không có). Liên quan CT1.
- **TG2 — L19:** chưa có test hai transaction xen nhau (xóa từ riêng trong lúc thêm câu → 404). `docs/deliveries/buoc-3.md:102` cũng ghi vậy.
- **TG3 — staff ghi bằng id riêng tư:** `private-boundary.e2e-spec.ts:156-168` chỉ kiểm `publishItem`, `unpublish`, `PUT levels/editorial`. Chưa có test cho
  `PUT /senses/:id/draft`, `POST /senses/review`, `POST /senses/retire`, `POST /senses/:id/quick-publish`, `PUT /entries/:id/variants`,
  `PUT /taxonomy/entries/:id/function-word`, `POST /senses` với `entry_id` riêng. Code hiện đúng (mục 6) nhưng không có test giữ nó đúng.
- **TG4 — `maskExample`:** thiếu ca sở hữu (`student's`), nháy đơn làm ngoặc kép (`'Deploy,' she said`), chữ hoa sau viết tắt, dạng có dấu chấm (`a.m.`),
  từ nhiều chữ cách nhau dấu câu, câu rỗng, chữ cái Unicode (`café`). Liên quan CT5, CT6.
- **TG5 — quy mô tìm kiếm với từ riêng:** không có phép đo `/v1/words`, `/v1/lookup`, `/v1/words/:lemma` khi có nhiều từ riêng của người khác (CT2).
- **TG6 — revert rồi dùng lại số revision:** B2E10/B2E11 không có ca có revert ở giữa (CT3).
- **TG7 — M5 nửa revert:** `test/pipeline/inflections.e2e-spec.ts:339-348` chỉ kiểm `basis` đổi thành `editorial`, chưa kiểm revert sau đó (mục 5).

## 5. Trạng thái các phát hiện cũ

| ID cũ | Trạng thái | Bằng chứng |
|---|---|---|
| M1 (phía Content) | Đã sửa | `POST /v1/senses/:id/sentences` chỉ trả `{ id, created_at }` (`src/content/sentences/sentences.controller.ts:41-42`, PR #42 `3961c60`); `PATCH /v1/my-words/:id` trả 204 không body (`private/my-words.controller.ts:38-39`); `DELETE /v1/sentences/:id` trả 204 (`sentences.controller.ts:53-54`). Job dọn `idempotency_keys` > 24 giờ (`common/idempotency/idempotency-cleanup.registrar.ts`, PR #39 `d701541`). Interceptor chỉ lưu hash của body (`idempotency.interceptor.ts:48-55`). Test `test/content/sentences.e2e-spec.ts:66`. Không route Content nào khác dùng `@Idempotent()`. |
| M8 | Đã sửa | `lookup` không còn lọc bỏ từ gốc không có nghĩa (`src/content/words/words.service.ts:140-143`, PR #42 `3961c60`); `entriesByForm` trả entry catalog bất kể có nghĩa, và từ riêng của chính người xem (`inflections/inflections.service.ts:46-55`). Test `test/content/words.e2e-spec.ts:107-119` (kể cả từ riêng của người khác không lộ). |
| L5 | Đã sửa | `addSentence` dùng `visibleSenseCondition` (`src/content/sentences/sentences.service.ts:32-35`, PR #42). Test `sentences.e2e-spec.ts:148`. |
| L6 | Đã sửa | `createSense` chỉ tìm `replaces_sense_id` trong catalog (`src/content/senses/senses.service.ts:60-61`, PR #41 `dff8244`). Test `private-boundary.e2e-spec.ts:194-202` (cùng status và type với id không tồn tại). |
| L11 | Còn mở | `catalogMatch` vẫn được tính (`src/content/private/private-words.service.ts:158-162`) và vẫn bị quick add bỏ đi (`src/learning/quick-add/quick-add.service.ts:66-70, 76-79`). Không commit nào trong `5aa4085..dc4cbe0` đụng tới. |
| L12 | Đã sửa (theo quyết định M8) | Mô tả hàm nay khớp hành vi cố ý: "Every catalog entry (with or without a visible sense) plus the viewer's own private entries" (`inflections/inflections.service.ts:46-47`); decision record Bước 3, bảng "Quyết định của điều phối sau review độc lập", dòng M8. |
| L19 | Sửa một phần | Bắt `P2003` khi insert → 404 (`src/content/sentences/sentences.service.ts:42-50`, PR #42). Chưa có test (`docs/deliveries/buoc-3.md:102`). Lần theo: đua này chỉ còn qua route `POST /v1/senses/:id/sentences`; quick add lấy learner lock trước như `deleteMyWord` nên không đua được. |
| M5 (ngoài danh sách được hỏi, cùng lát) | Sửa một phần | Nửa đầu đã sửa: chọn lại đúng level của dòng `derived` đổi `basis` thành `editorial` (`src/content/catalog/levels.service.ts:72-78`). Nửa sau còn: revert vẫn xóa dòng level theo id ghi trong `batch_records` (`src/content/catalog/revert.service.ts:130-146`), nên level staff vừa xác nhận bị xóa khi revert lô đã tạo dòng `derived` đó (trừ khi là level duy nhất của entry có nghĩa đang live). |

## 6. Đã kiểm, không thấy vấn đề

**Người học chỉ thấy nghĩa được phép thấy:**
- Một định nghĩa duy nhất "thấy được" (`open` + có `live_revision_id` + catalog hoặc của chính người xem): `src/content/learner/visible-senses.ts:9-15`.
- Dùng đúng ở: `words.service.ts:98` (mọi câu `senses()`: trang từ, tra, thẻ), `:117` (`has_page`), `:163` (`/v1/words`), `practice/practice-senses.ts:36-37`
  (cả `practiceSenses` lẫn `practiceCandidates`), `private/private-words.service.ts:206-212` (`visibleSenseIds`), `sentences/sentences.service.ts:32-35`.
- Route Bước 2 `/v1/senses/search|/v1/senses|/v1/senses/:id` lọc `s.state = 'open' AND s.live_revision_id IS NOT NULL` và `e.scope = 'catalog'`
  (`learner/learner-content.service.ts:105-106`); `/v1/senses/:id` của sense không thấy → 404 (`:70-73`).
- `bulkCandidates` chỉ catalog đã publish, loại từ chức năng theo cờ hiệu lực (`private-words.service.ts:215-242`).
- `entriesByForm` không bao giờ trả từ riêng của người khác (`inflections.service.ts:50`).

**Riêng tư và IDOR (lấy id của người khác):**
- `PATCH /v1/my-words/:id`: entry phải của người gọi (`private-words.service.ts:113-117, 167`); `senses[].sense_id` phải thuộc entry đó (`:183`) → 404.
- `deletePrivateEntryContent` kiểm chủ (`:199`), xóa cascade sense/revision/text/level/dạng chia/câu (FK `context_sentences_sense_id_fkey ON DELETE CASCADE`,
  migration `20261017190000`), trigger xóa `form_kind` (`20261018130000_form_of_unlink`).
- `form_of` của từ riêng chỉ trỏ tới entry catalog hoặc của chính chủ (`private-words.service.ts:126-129`); PATCH không đặt được `form_of`.
- Câu ngữ cảnh: thêm chỉ vào nghĩa thấy được (`sentences.service.ts:32-35`), xóa theo `(id, user_id)` (`:67`), đọc theo `user_id` (`:55-63`).
- Nhãn nội bộ `p2`, `p3` của từ riêng không lộ ra (`words.service.ts:61`, `practice-senses.ts:70`).

**Staff chỉ chạm catalog (B2#69, bất biến §10):**
- Đọc: `catalogWhere` ở `catalog/admin-catalog.queries.ts:34, 213, 252, 299, 386, 394`; `snapshotPublishable` dùng `senseSelection` (`:249-266`).
- Ghi theo entry: `writeEntry` kiểm `scope: 'catalog'` trước khi lock (`catalog/admin-entries.controller.ts:32`, `senses/admin-senses.controller.ts:42`);
  `writeSense` đi qua `writeEntry` (`admin-senses.controller.ts:50-56`); publish/unpublish/retire/quick-publish kiểm catalog
  (`senses/publish.service.ts:79`); `importContent` với `sense_id` chỉ tìm catalog (`senses/import-content.ts:51`); revert chỉ nhóm entry catalog
  (`catalog/revert.service.ts:52`); cảnh báo trùng chữ hoa/thường chỉ so catalog (`admin-senses.controller.ts:140`).
- `ON CONFLICT` duy nhất trên `entries` có vị từ `WHERE scope = 'catalog'` (`catalog/entries.service.ts:49`).

**Quyền từng route (bảng D6/D12, Bước 2 §10, Bước 2.5 §7.3):** `admin/content/entries|senses` (GET) và ghi nháp/review/thêm nghĩa/dán dòng →
`content.edit`; publish/unpublish/retire → `content.publish`; quick-publish → `content.edit` **và** `content.publish` (guard dùng
`getAllAndOverride` nên quyền ở method thắng, `identity/staff/permission.guard.ts:22-24`); nguồn → `content.import`; chủ đề và cờ từ chức năng →
`taxonomy.manage`; `GET /v1/sources` `@Public()` và chỉ trả tên/phiên bản/URL/giấy phép/ghi nhận (`sources/sources.service.ts:32-36`); route
người học dùng `@LearnerContent()` (`learner/learner.decorator.ts:4-6`). URL nguồn chỉ nhận http(s) (`sources/sources.schemas.ts:8`).

**Vòng đời và revision:**
- Hai người sửa cùng nghĩa: `saveDraft` đòi `baseRevision` = mới nhất dưới khóa advisory của entry (`senses.service.ts:88-89`) → 409; có test đồng thời
  (`senses.e2e-spec.ts:387-404`).
- Publish revision cũ → `stale-revision` (`publish.service.ts:96`); retire là cuối (`:94`, `:123`); unpublish giữ `live_revision_id` để publish lại (`:124-125`).
- Thay nghĩa: sense cũ retire trong cùng transaction, trước khi sense mới giữ nhãn (`publish.service.ts:104-106`); bác revision của sense chờ thay
  thế → retire nó (`senses.service.ts:129-131`).
- Ba bất biến DB: `senses_entry_label_live_key`, `senses_one_replacement_key`, `sense_revisions_one_open_key` (migration `20261012120000_content`).
- Revert: chỉ xóa revision chưa publish và còn mới nhất, trả lại trạng thái revision bị thay (`revert.service.ts:89-105, 59-77`); xóa sense lá trước
  vì FK `replaces_sense_id` là RESTRICT (`:117-127`); giữ level duy nhất của entry có nghĩa đang live (`:136-140`).

**Tìm kiếm:** mọi SQL dùng tham số (`Prisma.sql`), không có `$queryRawUnsafe` (grep); `%`, `_`, `\` được escape với `ESCAPE '\'`
(`learner-content.service.ts:91-103`, `words.service.ts:157-161`) và trong `contains` của admin (`admin-catalog.queries.ts:211`, có test
`admin-read.e2e-spec.ts:314-327`); `q` cắt khoảng trắng, NFC, chữ thường, 1–100 code point, chặn NUL (`words.schemas.ts:6-7`,
`learner-content.controller.ts:19-23`); phân trang keyset có token gắn với truy vấn (`learner-content.service.ts:28-42`, `words.service.ts:149-156`),
bộ khóa sắp xếp duy nhất (rank, lemma, pos, id) hoặc (rank, lemma `COLLATE "C"`), cùng collation ở `ORDER BY` và điều kiện con trỏ.

**Tra và dạng chia:** `went → go` qua `form_key` chữ thường (`inflections.service.ts:12-14, 48-55`); trang từ phân biệt hoa/thường (D42, `words.service.ts:111`,
`words.schemas.ts:16-19`), tra không phân biệt (`:135-136`); từ nhiều chữ không có dạng thư viện (`inflect.ts:93`), dạng đã duyệt nhiều chữ vẫn tra được;
dạng đã duyệt thắng dạng thư viện và bộ rỗng `-` được giữ (`inflections.service.ts:29-35`).

**Câu ngữ cảnh:** ≤ 300 code point sau NFC (`sentences.service.ts:30-31`, `sentences.controller.ts:17`); tối đa 5 mỗi (người, nghĩa) dưới khóa advisory
riêng (`:37-40`); log chỉ có id (`:51`, `:68`); response không có chữ (M1).

**Đọc cho Practice (PR #51):** đúng các trường của plan Task 6 và bảng §4 design Bước 4 (`practice-senses.ts:9-20`); `accepted` = biến thể có
`accepted_as_answer` + `accepted_forms`, bỏ lemma (`:73-74`); `function_word` = `COALESCE(override, derived)` (`:30`); một câu SQL mỗi hàm, không N+1
(`:51`, `:59-66`); từ riêng `examples: []`, `context_label: null`.

**Che từ (PR #51), các ca design nêu:** phân biệt hoa thường trừ chữ cái đầu câu; B4E35 (hai dạng khác nhau → `null`); B4E37 cơ bản; nháy cong =
nháy thẳng; gạch nối tách token; `redeploys` không khớp `deploys`; không dựng regex từ dữ liệu nên `C++`, `a.m.` không làm vỡ regex; ưu tiên dạng nhiều
chữ trước (`mask-example.ts:31-34`); `matchAll` không làm đổi `lastIndex` của regex dùng chung; câu rỗng → `null`.

**Khác:** quy tắc "level hiển thị" giống nhau cho entry catalog ở 5 chỗ cài đặt (`learner-content.service.ts:125-133`, `words.service.ts:36-44`,
`private-words.service.ts:229-238`, `levels.service.ts:45-56`, `admin-catalog.queries.ts:84-95`); job publish chụp dữ liệu trong một transaction
`RepeatableRead` (`admin-catalog.queries.ts:277-292`); xuất CSV đếm đủ trước khi phát (`:326-357`); chủ đề lưu trữ không đổi mã trong revision cũ
(`taxonomy/topics.service.ts:51-71`).

## 7. Declined to judge / Ngoài phạm vi

**Declined to judge (để chủ dự án hoặc điều phối chọn):**
- `gloss-changed` so gloss sau khi ghép với gloss **đang live** (`import-content.ts:94-97`), nên khi đã có bản nháp CSV (qua `sense_id`) đổi gloss, mọi
  dòng khớp theo khóa sau đó đều bị loại dù không đổi gloss. Design "gloss_vi đổi" không nói rõ so với gì; đây là luật của Pipeline.
- Level `derived` dùng nguồn `owner` (`display_priority = 0`), nên đứng trên level nhập của CEFR-J/Octanove nếu sau này một file bên thứ ba thêm level cho
  chính entry đó; file CEFR-J/Octanove thật không có dòng như vậy và design im lặng về thứ tự này.
- Bộ lọc `has_sense=false` của danh sách entry (`admin-catalog.queries.ts:215`, bất kỳ sense nào kể cả `retired`) khác bộ lọc của file xuất "từ chưa có nghĩa"
  (`:299`, chỉ sense chưa retire). Giao diện admin chỉ dùng file xuất.
- Lemma catalog có `/` (tạo được qua `POST /entries/batch`) xuất ra `headword` có `/` và upload lại bị tách thành lemma + biến thể → dòng bị loại
  `sense-entry-mismatch`. Giao diện không gọi route này.
- Bộ lọc chủ đề `= ANY(topic_codes)` không dùng được GIN index (chỉ hiệu năng).

**Ngoài phạm vi (lát khác), mỗi mục một dòng:**
- D3: Pipeline đọc thẳng bảng Content: `content-pipeline/import/row-processor.ts:103, 105, 139`, `content-pipeline/inflections/inflections-backfill.handler.ts:41, 53`.
- `ProblemDetailsFilter` không ghi log lỗi 500 (`common/problem-details/problem-details.filter.ts:80-86`), nên lỗi như CT4 không để lại dấu vết.
- Design Bước 4 tự mâu thuẫn: §7.7 (gợi ý nấc 1) ghi "không phân biệt hoa thường", §7.4b sau R7 ghi "phân biệt"; `maskExample` chỉ có kiểu phân biệt — Task 10/13
  của Practice phải chọn.
- Lọc đáp án nhiễu "dạng chia của nhau" chỉ dựa vào `form_of_entry_id` (design §7.4), `CandidateSense` không có bảng dạng chia (theo plan): một entry `went` không
  gắn link vẫn có thể làm đáp án nhiễu cho `go`.
- `runIdempotent` chạy handler bên trong một transaction ngoài trong khi handler mở transaction riêng (2 kết nối DB mỗi request idempotent).

## 8. Chưa kiểm

- Không chạy gì: mọi kết luận là đọc code; các probe ở mục 3 chưa chạy.
- Chưa đọc hết thân các file test `test/content/learner.e2e-spec.ts`, `publish.e2e-spec.ts`, `entries.e2e-spec.ts`, `sources-topics.e2e-spec.ts`,
  `schema.e2e-spec.ts`, `inflections.e2e-spec.ts`, `sentences.e2e-spec.ts`, `private-words.e2e-spec.ts`, `admin-permissions.e2e-spec.ts` (chỉ đọc tên test).
- Không kiểm hành vi escape của `contains` trong Prisma 7.10 bằng tài liệu; dựa vào test `admin-read.e2e-spec.ts:314-327` (giả định CI xanh).
- Không xem dữ liệu `agid-inflections.json` và đầu ra `generateInflections` trên dữ liệu thật (L18 đã biết).
- Không rà cách Learning dùng `cardContent`/`visibleSenseCondition` (lát Learning) và `apps/web`.
- Không đo hiệu năng thật của CT2.
