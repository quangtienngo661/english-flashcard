# Review độc lập Bước 0–4 — lát PL: Content Pipeline (Bước 2 + phần Bước 3 thêm vào)

Ngày 18/10/2026. Người review: một agent không viết code này. Snapshot đọc: `.claude/worktrees/review-buoc-0-4/`
(detached ở `origin/dev` = `dc4cbe0`). Mọi đường dẫn code dưới đây tính từ `apps/api/` của snapshot đó, trừ khi ghi khác.

**Cách làm:** chỉ đọc code, không sửa repo, không chạy test, không Docker, không khởi động app. Để khỏi đoán, tôi có gọi trực
tiếp vài **hàm thuần** (hàm không đụng DB hay mạng) bằng Node, qua script tạm ở scratchpad (không nằm trong repo):
`generateInflections` (`src/content/inflections/inflect.ts`), `parseUploadFile` (`src/content-pipeline/upload/csv-file.ts`), và thư
viện `busboy@1.6.0` đã cài (thư viện multer dùng để đọc multipart). Output thật được trích ở từng phát hiện. Mọi thứ cần
Postgres/Redis thật được đánh **SUSPECTED** kèm probe.

---

## 1. Phạm vi đã đọc

- **Code (đọc toàn bộ):** `src/content-pipeline/**` (35 file: upload, import, jobs, publish, export, inflections), `src/worker.ts`,
  `prisma/models/pipeline.prisma`, migration `20261012180000_pipeline`, `20261017170000_entry_inflections`,
  `20261017200000_inflection_row_keys`, `20261018120000_inflections_reviewed`, `20261018130000_form_of_unlink`,
  `20261017220000_agid_source`, `scripts/smoke-buoc-2.mjs`.
- **Code Content mà Pipeline gọi (đọc phần liên quan):** `src/content/catalog/revert.service.ts`, `entries.service.ts`,
  `levels.service.ts`, `normalize.ts`, `admin-catalog.queries.ts` (snapshot, export, batch owners), `sense-filters.ts`;
  `src/content/senses/import-content.ts`, `senses.service.ts`, `publish.service.ts`, `revision-content.ts`,
  `admin-senses.controller.ts`, `admin-publish.controller.ts`, `content-body.ts`; `src/content/inflections/inflect.ts`,
  `inflections.service.ts`; `src/content/private/private-words.service.ts` (chỉ chỗ `form_of`); `src/common/idempotency/*`,
  `src/common/config/app-config.ts`, `src/common/db/prisma.module.ts`, `src/common/maintenance/maintenance.scheduler.ts`.
- **Thư viện (đọc source đã cài):** `multer@2.4.0` (`lib/make-middleware.js`), `busboy@1.6.0` (`lib/types/multipart.js`).
- **Test (đọc phần liên quan):** `test/pipeline/*` (18 file; đọc kỹ `inflections`, `reports`, `export` (B2E6), `revert`,
  `publish-jobs`, `jobs`, `queue`, `upload`; lướt phần còn lại), `src/content-pipeline/upload/*.spec.ts`,
  `test/support/{fake-job-context,worker-env,reset-catalog,create-test-app}.ts`.
- **Design và tài liệu:** design Bước 2 toàn bộ (§1–§17, đặc biệt §4 bảng Pipeline, §5, §7, §8, §10, §11, §13, §14, §17); design
  Bước 2.5 §6.3, §7.2; design Bước 3 §7.3, §11; decisions Bước 3 (bảng "Quyết định của điều phối sau review độc lập"); plan Bước 2
  (Task 15–24, các dòng về revert và prefilter); `docs/deliveries/buoc-2.md`, `buoc-2-test-flow.md`, `buoc-3.md`,
  `buoc-3-test-flow.md`; review cũ `2026-10-17-buoc-3-code-review.md` và `…-evidence/agent-pipeline.md`.
- **Số lượt:** 2 lượt. Lượt 1 lần theo đường đi của dữ liệu (upload → parse → normalize → prefilter → row processor → Content →
  outcome/report → revert/export/publish job). Lượt 2 kiểm từng câu hỏi của brief (1–10) và trạng thái phát hiện cũ.

---

## 2. Bảng tóm tắt

| ID | Mức | Phát hiện (1 dòng) | file:dòng | Trạng thái |
|---|---|---|---|---|
| PL1 | Trung bình | `rejected.csv` của lần sửa thứ hai có cột `_row`/`_error` lặp → upload lại bị từ chối cả file (`file-invalid`); vòng sửa D4 gãy từ vòng 2 | `src/content-pipeline/upload/uploads-read.controller.ts:62`, `src/content-pipeline/upload/csv-file.ts:129-138` | CONFIRMED |
| PL2 | Trung bình | Upload lại đúng file cũ sau khi staff sửa + publish qua API một ô mà file cũng có → không `unchanged` (B2E6) mà tạo nháp CSV mang nội dung cũ; "Publish lô này" đưa nội dung cũ lên live | `src/content-pipeline/import/row-processor.ts:115-120`, `src/content/senses/import-content.ts:85-104` | CONFIRMED |
| PL3 | Trung bình | Revert xóa entry mà dữ liệu khác đang dựa vào: dạng chia đã duyệt (kể cả `-`) do lô sau ghi, link `form_of` của nghĩa catalog và của **từ riêng người học** — mất im lặng, báo cáo không nhắc | `src/content/catalog/revert.service.ts:148-153` | CONFIRMED |
| PL4 | Trung bình | Job publish vẫn publish revision đã bị `rejected`, và mở lại sense đã `unpublished`, nếu việc đó xảy ra sau lúc chụp danh sách | `src/content-pipeline/publish/publish-job.handler.ts:42-52`, `src/content/senses/publish.service.ts:89-113` | CONFIRMED |
| PL5 | Trung bình | Revert một lô lớn (CEFR-J 7.799 entry) chạy đồng bộ trong request HTTP (~7.800 transaction): dễ vượt 60 s của proxy và có thể vượt 120 s của idempotency → client báo lỗi trong khi revert vẫn chạy; báo cáo "đã bỏ qua gì" không lấy lại được | `src/content-pipeline/upload/uploads.controller.ts:51-57`, `src/content/catalog/revert.service.ts:158-168` | SUSPECTED |
| PL6 | Thấp | NUL (hoặc biến thể > 2.000 ký tự) ở `headword`, NUL ở `context_label` hay 4 cột phụ làm cả lượt import thất bại (3 lượt → batch `failed`), không chỉ loại một dòng; NUL ở tên cột/tên file làm upload trả 500 | `src/content-pipeline/upload/row-normalizer.ts:97-107,128-133,191`, `src/content/catalog/entries.service.ts:21-33` | CONFIRMED (worker) / SUSPECTED (API) |
| PL7 | Thấp | `generateInflections` ném `TypeError` với lemma trùng tên thuộc tính của `Object.prototype` (`constructor` động từ, `valueOf`, `toString`…) → batch `failed`, backfill kẹt vĩnh viễn, `entries/batch` trả 500 | `src/content/inflections/inflect.ts:41,46` | CONFIRMED |
| PL8 | Thấp | Tên file tiếng Việt lưu sai mã ("từ vựng.csv" → "tá»« vá»±ng.csv") vì multer không được cấu hình `defParamCharset: 'utf8'` | `src/content-pipeline/content-pipeline.module.ts:30-36`, `src/content-pipeline/upload/uploads.service.ts:82` | CONFIRMED |
| PL9 | Thấp | "Rác" Excel không được bỏ qua: dòng chỉ có dấu phẩy `,,,` thành dòng bị loại; ≥ 2 ô tiêu đề trống → từ chối cả file; dòng trống đầu file + `;` → báo nhầm "thiếu cột pos" | `src/content-pipeline/upload/csv-file.ts:31,86-98,129-138` | CONFIRMED |
| PL10 | Thấp | API parse đồng bộ cả file rồi mới đếm số dòng: file 10 MB toàn dòng ngắn chặn event loop vài giây và làm heap tăng hàng trăm MB trước khi bị từ chối | `src/content-pipeline/upload/csv-file.ts:86-98,146-151` | CONFIRMED (đo 1,9 MB; số 10 MB là ngoại suy) |
| PL11 | Thấp | Nguồn AGID (nguồn của dạng chia) được nhận làm `level_source_id` → staff chọn nhầm sẽ ghi level CEFR mang tên AGID | `src/content-pipeline/upload/uploads.service.ts:33-44`, `src/content/sources/sources.service.ts:38-40` | CONFIRMED |
| PL12 | Thấp | Cảnh báo theo dòng (bỏ dấu "đã rà", bỏ chủ đề đã ẩn) mất vĩnh viễn nếu worker chết giữa lô | `src/content-pipeline/import/import-batch.handler.ts:57-58,112,115` | CONFIRMED |
| PL13 | Thấp | Gỡ tiền tố `'` chống công thức khi nhập chỉ áp cho ô nội dung; `headword`/`context_label` bắt đầu bằng `- + = @` không round-trip qua xuất → nhập | `src/content-pipeline/upload/row-normalizer.ts:135-141`, `src/content-pipeline/upload/csv-writer.ts:2-4` | CONFIRMED |
| PL14 | Thấp | `scripts/smoke-buoc-2.mjs` hỏng từ Bước 3: đọc `sense_id`/`revision` theo vị trí cột cũ → dừng ở bước publish | `scripts/smoke-buoc-2.mjs:191,205-207` | CONFIRMED (đọc) |

Không có phát hiện mức Cao trong lát này: không thấy đường nào cho người học gọi API Pipeline, không thấy ghi chéo sang dữ liệu riêng
(ngoại trừ hệ quả gián tiếp ở PL3), khung job (lease/epoch) đúng.

---

## 3. Từng phát hiện

### PL1 — `rejected.csv` vòng 2 không upload lại được (Trung bình, CONFIRMED)

- **Chỗ lỗi:** `src/content-pipeline/upload/uploads-read.controller.ts:62` dựng header của file dòng bị loại bằng cách nối thêm `_row`,
  `_error` vào **nguyên** header của file gốc; `src/content-pipeline/upload/csv-file.ts:129-138` từ chối mọi tiêu đề trùng, kể cả cột
  bắt đầu bằng `_`.
- **Cơ chế:**

  ```ts
  // uploads-read.controller.ts:62
  const csv = toCsv([...(batch.rawHeaders as string[]), '_row', '_error'], outcomes.map((row) => [
  // csv-file.ts:129-133
  const seen = new Set<string>();
  for (const header of headers) {
    if (seen.has(header)) {
      throw new UploadFileError('file-invalid', `Duplicate header "${header}" after trimming and lower-casing. ...`);
  ```
- **Vì sao sai:** design §5 (bảng cột): cột bắt đầu bằng `_` "Bỏ qua im lặng, để file lỗi tải về upload lại được (D4)"; §8 (a): "Sửa ô
  sai rồi upload lại file đó". Vòng sửa phải chạy được ở mọi vòng, không chỉ vòng đầu.
- **Hậu quả:** vòng 1 chạy đúng. Nếu file đã sửa vẫn còn dòng sai, `rejected.csv` lần 2 có header
  `headword,pos,…,_row,_error,_row,_error`; upload file này → 400 `file-invalid` "Duplicate header "_row"…" (tiếng Anh), cả file bị từ
  chối. Chủ dự án phải tự xóa cột trong Excel. Chính test hiện có cho thấy header bị lặp: `test/pipeline/reports.e2e-spec.ts:172`
  khẳng định `rejected.csv` của lô thứ hai là `[...downloaded.rawHeaders, '_row', '_error']` (mà `downloaded.rawHeaders` đã kết thúc
  bằng `_row`,`_error`) — test dừng ở đó vì lô đó không còn dòng lỗi nên không ai upload file này.
- **Đã loại trừ:** (1) cột `_` có bị bỏ trước khi kiểm trùng không? Không: `csv-file.ts:115-138` kiểm toàn bộ header, `classifyColumns`
  chạy sau và chỉ để cảnh báo. (2) Giao diện admin có tự bỏ cột không? Không: `apps/admin/src/features/content/content-api.ts:95` gửi
  nguyên file người dùng chọn. (3) Gọi thật `parseUploadFile` với header `headword,pos,_row,_error,_row,_error` → ném
  `file-invalid Duplicate header "_row" after trimming and lower-casing.`
- **Probe đề xuất** (thêm vào `test/pipeline/reports.e2e-spec.ts`, cùng helper `upload`/`finish`/`download` của file đó):
  1. Upload `headword,pos\r\nok,noun\r\nbad,nuon\r\n` → `finish(id, 'partial')`; tải `GET /v1/admin/content/uploads/{id}/rejected.csv`.
  2. Đổi `nuon` → `nonu` (vẫn sai), upload file đó → `partial`; tải `rejected.csv` lần 2.
  3. Đổi `nonu` → `noun`, `POST /v1/admin/content/uploads` với file lần 2.
  Kỳ vọng: 202 và dòng được tạo. Nghi thực tế: 400 `file-invalid`, `detail` chứa `Duplicate header "_row"`.
- **Cách sửa gợi ý:** khi dựng `rejected.csv`, bỏ các cột gốc có tên bắt đầu bằng `_` (cùng ô tương ứng) trước khi nối `_row`,`_error`;
  hoặc bỏ qua cột `_…` (và cột tên rỗng, xem PL9) trong bước kiểm tiêu đề trùng.

### PL2 — Upload lại file cũ sau khi sửa qua API: không `unchanged`, có thể đưa nội dung cũ lên live (Trung bình, CONFIRMED)

- **Chỗ lỗi:** `src/content-pipeline/import/row-processor.ts:115-120` chỉ ghi row key loại `level`; không có chỗ nào ghi key loại
  `content` (grep `importRowKey.create*` trong `src/` chỉ ra đúng dòng 117). Vì vậy key nội dung dựng ở
  `src/content-pipeline/import/prefilter.ts:58-63` không bao giờ khớp, và mọi dòng có nội dung đi vào
  `src/content/senses/import-content.ts:85-104`, nơi "không đổi" chỉ được so với **revision mới nhất**.
- **Cơ chế:**

  ```ts
  // import-content.ts:85-98
  const base = readContent(latest);
  const merged = mergeContent(base, normalizeContent(input.content, input.lemma));
  if (contentHash(merged) === latest.contentHash) return { kind: 'unchanged', senseId: sense.id };
  const open = await tx.senseRevision.findFirst({ where: { senseId: sense.id, status: { in: ['draft', 'reviewed'] } }, … });
  if (input.senseId === null) {
    if (open?.draftSource === 'ui' && hasContent(readContent(open))) return rejected('open-draft-conflict');
    if (sense.liveRevisionId !== null && !input.replaceMeaning) {
      … if (merged.glossVi !== readContent(live).glossVi) return rejected('gloss-changed');
  ```
- **Vì sao sai:** design B2E6: "The same unchanged file is uploaded after the owner edited the sense in the API → Rows match key and hash
  and report `unchanged`; live content is not touched. To push changes the owner uses an exported file with `revision`". Cơ chế design
  dùng là row key `content` có `content_hash` (§4 bảng `import_row_keys`, §5 bước 4, D13). Code bỏ cơ chế này và thay bằng "bằng
  revision mới nhất". Hai cách cho cùng kết quả khi không ai sửa tay, nhưng khác nhau khi đã có sửa qua API.
- **Hậu quả (cụ thể):**
  1. File F có dòng `edited,noun,gốc,Original example.,business` → sense S, revision 1. Staff đặt level, publish revision 1.
  2. Staff sửa ví dụ qua API (`PUT …/senses/S/draft`, `examples_en: ['Edited example.']`) rồi publish → revision 2 đang live, không
     còn revision mở.
  3. Upload lại đúng F. Dòng không có `sense_id`; merge ô ví dụ của file đè lên revision 2 → hash khác; không có nháp UI mở nên không
     `open-draft-conflict`; gloss giống nên không `gloss-changed` → tạo **revision 3 (nháp CSV) mang lại ví dụ cũ**, báo cáo ghi
     `updated`.
  4. Bấm "Publish lô này" (Bước 2.5 §6.3 → `POST …/senses/publish-jobs { filter: { batch_id } }`): `senseIdsOf(batch)` có S (lô tạo
     revision 3), revision 3 đủ điều kiện → được publish → **bản sửa qua API biến mất khỏi live**, không có cảnh báo nào.
  Nếu bản sửa API còn là nháp mở: dòng bị `open-draft-conflict` (an toàn), nhưng báo cáo ghi "bị loại" cho một file không đổi, và thông
  báo lỗi hướng dẫn "dùng sense_id và revision mới nhất" — làm theo thì chính là ghi đè bản sửa tay.
  Thêm: D13 (lọc trước để upload lại không chạy mỗi dòng một transaction) không áp cho dòng có nội dung; file nội dung lớn upload lại
  vẫn chạy mỗi dòng một transaction (chỉ là chậm, không sai).
- **Đã loại trừ:** (1) luật `open-draft-conflict` chỉ bắt nháp UI **còn mở**; (2) `gloss-changed` chỉ bắt khi gloss đổi; (3) prefilter
  không giúp vì key `content` không được ghi; (4) test B2E6 hiện có (`test/pipeline/export.e2e-spec.ts:346-363`) chỉ sửa
  `definition_en` — cột file không có — nên merge ra đúng revision mới nhất; ca sửa một cột mà file cũng có chưa được thử.
- **Probe đề xuất** (thêm vào `test/pipeline/export.e2e-spec.ts`, theo mẫu test B2E6, dùng `importFile`, `write`, `content`, `ctx.http()`):
  1. `importFile(original)` với `['headword','pos','gloss_vi','example_en_1','topics']` / `['edited','noun','gốc','Original example.','business']`.
  2. `setEditorialLevel(entry, 'A1')`; `content.publishItem({ senseId, revision: 1 })`.
  3. `PUT /v1/admin/content/senses/{senseId}/draft` body `{ revision: 1, content: { examples_en: ['Edited example.'] } }`; rồi
     `POST /v1/admin/content/senses/publish` body `{ items: [{ sense_id, revision: 2 }] }`.
  4. `importFile(original)` lần nữa → batch B. Kỳ vọng (B2E6): outcome `unchanged`, sense vẫn 2 revision. Nghi thực tế: outcome
     `updated`, có revision 3 `draftSource: 'csv'`, `examples: ['Original example.']`.
  5. `POST /v1/admin/content/senses/publish-jobs` `{ filter: { batch_id: B } }` + chạy `PublishJobHandler` → `GET /v1/senses/{senseId}`
     (người học có `native_language`) trả `Original example.` (nghi) thay vì `Edited example.` (kỳ vọng).
- **Cách sửa gợi ý:** cần chủ dự án chốt, vì key-skip thuần túy sẽ mở lại lỗi kiểu H1 cho trường hợp CSV-đè-CSV. Hướng an toàn: coi
  revision mới nhất do UI tạo (dù đã publish) là sửa tay cần bảo vệ — dòng không `sense_id` muốn đổi nó thì trả conflict (như
  `open-draft-conflict`), hoặc `unchanged` nếu đúng patch này đã được một lô chưa revert áp trước đó.

### PL3 — Revert xóa entry mà lô sau hoặc người học đang dựa vào (Trung bình, CONFIRMED)

- **Chỗ lỗi:** `src/content/catalog/revert.service.ts:148-153` (gọi từ `src/content-pipeline/import/revert.service.ts:35`). Điều kiện xóa
  entry chỉ xét sense, level, biến thể.
- **Cơ chế:**

  ```ts
  // content/catalog/revert.service.ts:148-152
  if (ids('entry').includes(entryId)) {
    report.removed.entry += (await tx.entry.deleteMany({ where: {
      id: entryId, senses: { none: {} }, levels: { none: {} }, variants: { none: {} },
    } })).count;
  ```
  Khi entry bị xóa: `entry_inflections` xóa theo (FK `ON DELETE CASCADE`, migration `20261017170000_entry_inflections:27`);
  `sense_revisions.form_of_entry_id` về NULL (`ON DELETE SET NULL`, cùng migration `:24`) và trigger
  `20261018130000_form_of_unlink:6-14` xóa `form_kind`. Dạng chia đã duyệt do lô khác ghi không có bản ghi trong `batch_records`
  (`src/content-pipeline/import/row-processor.ts:102-114`). Từ riêng của người học được phép trỏ `form_of` tới **bất kỳ** entry catalog,
  kể cả chưa có nghĩa (`src/content/private/private-words.service.ts:126-128`).
- **Vì sao sai:** design §7 viết luật xóa entry ở Bước 2, khi chưa có dạng chia và `form_of`; B2#40 nói "entries … still used by another
  batch are kept". Bước 3 thêm dữ liệu treo lên entry mà không cập nhật luật revert: §11 nói dấu `-` "được lưu bền"; B3E16 nói link của
  từ riêng "giữ nguyên". Design im lặng về revert × các thứ này; kỳ vọng hợp lý: entry đang được dùng thì giữ và báo lý do.
- **Hậu quả (cụ thể):** lô A nhập CEFR-J (chỉ level) tạo `go`, `pork`, `deploy` (phần lớn entry CEFR-J chưa có nghĩa).
  - Lô B ghi `pork,noun,-` (đã duyệt: không có số nhiều). Revert A → `pork` mất level → không còn gì → bị xóa, kéo theo quyết định `-`.
    Upload lại file A → `pork` mới với dạng library sai `porks` (đã gọi thật: `generateInflections('pork','noun')` → `porks`).
  - Lô C ghi `went,verb,đã đi,…,go/verb:past`. Revert A → `go` bị xóa → link "went là quá khứ của go" của nghĩa `went` mất (kể cả nếu
    nghĩa đó đã publish, người học thấy link biến mất).
  - Người học L thêm từ riêng `deployed` trỏ `form_of` tới catalog `deploy` (M8: tra từ trả cả từ gốc chưa có nghĩa). Revert A →
    link trong **dữ liệu riêng của L** bị xóa do một thao tác của staff.
  Báo cáo revert (`removed`/`skipped`) không nhắc gì; ghi chú `not_reverted` của L8 chỉ xuất hiện khi chính file của lô bị revert có cột
  `inflections` (`src/content-pipeline/import/revert.service.ts:36-42`), file A không có.
- **Đã loại trừ:** (1) FK có chặn xóa không? Không — CASCADE và SET NULL như trên. (2) Entry có nghĩa thì được giữ — nhưng các entry
  trong ca trên chưa có nghĩa. (3) Phần "link mất, báo cáo không nhắc" đã có trong L7 (review 17/10, `revert.service.ts:148-153`); phần
  mới ở đây là dạng chia đã duyệt của lô khác và link của từ riêng người học — L7 chỉ được sửa bằng trigger dọn `form_kind`.
- **Probe đề xuất** (thêm vào `test/pipeline/revert.e2e-spec.ts`, helper `importFile`, `revert`, `content`):
  1. Nguồn S (third_party). `importFile(csv(['go,verb,A1','pork,noun,A1','deploy,verb,B1'], 'headword,pos,CEFR'), S.id)` → A.
  2. `importFile` file `headword,pos,inflections` / `pork,noun,-` → B. `importFile` file `headword,pos,gloss_vi,example_en_1,form_of` /
     `went,verb,đã đi,He went.,go/verb:past` → C.
  3. Người học L: `content.createPrivateSense(tx, { ownerId: L, lemma: 'deployed', pos: 'verb', meaning: { text: 'đã triển khai',
     language: 'vi' }, level: null, topicCodes: [], formOf: { entryId: deploy.id, kind: 'past' } })`.
  4. `POST /v1/admin/content/uploads/{A}/revert` (Idempotency-Key).
  Kỳ vọng: `go`, `pork`, `deploy` còn (hoặc được liệt kê trong `skipped` với lý do "đang được dùng"); `pork.inflectionsReviewedAt` còn;
  revision của `went` và của L còn `formOfEntryId`. Nghi thực tế: ba entry bị xóa; `formOfEntryId = null`, `formKind = null` ở cả hai;
  `skipped` rỗng.
- **Cách sửa gợi ý:** trong `revertEntry`, chỉ xóa entry khi thêm điều kiện `inflections_reviewed_at IS NULL` và không có
  `sense_revisions.form_of_entry_id` trỏ tới; nếu không thì bỏ qua với lý do (ví dụ `entry-in-use`) trong báo cáo.

### PL4 — Job publish publish revision đã bị loại và mở lại sense đã ẩn (Trung bình, CONFIRMED)

- **Chỗ lỗi:** `src/content-pipeline/publish/publish-job.handler.ts:42-52` gọi `ContentService.publishItem`, và
  `src/content/senses/publish.service.ts:89-113` chỉ kiểm số revision, `retired` và điều kiện nội dung; không kiểm trạng thái revision,
  luôn đặt sense về `open`.
- **Cơ chế:**

  ```ts
  // publish.service.ts:94-97, 113
  if (sense.state === 'retired') return { outcome: 'refused', reason: 'sense-retired' };
  const revision = sense.revisions[0];
  if (!revision || revision.revisionNo !== item.revision) return { outcome: 'refused', reason: 'stale-revision' };
  if (sense.state === 'open' && sense.liveRevisionId === revision.id) return { outcome: 'already_published' };
  …
  await tx.sense.update({ where: { id: sense.id }, data: { state: 'open', liveRevisionId: revision.id } });
  ```
- **Vì sao sai:** design §6 (job publish): worker "kiểm lại điều kiện và `revision` ngay lúc xử lý"; vòng đời: `rejected` là "revision chủ
  động bỏ", `published` đi ra từ `draft`/`reviewed`; `unpublished` = "ẩn khỏi tìm kiếm và duyệt". Đánh dấu `rejected` hay
  `unpublish` không tạo revision mới (`src/content/senses/senses.service.ts:128`; `publish.service.ts` `changeStates`), nên kiểm số
  revision không bắt được.
- **Hậu quả:** job publish một lô lớn chạy vài phút. Trong lúc đó: (a) người rà bấm "loại" revision N của S → job vẫn publish N → người
  học thấy nội dung đã bị loại; (b) staff ẩn sense S (đã chụp với nháp N+1) → job publish N+1 và đặt `state = 'open'` → S hiện lại.
  Báo cáo job ghi `published`.
- **Đã loại trừ:** lúc chụp, sense có revision mới nhất là `rejected` bị loại ra (`src/content/catalog/admin-catalog.queries.ts:153-154`),
  nên lỗi chỉ xảy ra trong khoảng từ lúc chụp tới lúc xử lý mục đó; khóa entry tuần tự hóa hai thao tác nhưng không kiểm lại trạng
  thái; test `test/pipeline/publish-jobs.e2e-spec.ts:94-148` chỉ thử ca đổi số revision.
- **Probe đề xuất** (thêm vào `test/pipeline/publish-jobs.e2e-spec.ts`, helper `ready`, `create`, `edit` của file đó, `runWorkers: false`):
  1. S1, S2 sẵn sàng (nháp revision 1). Publish S2 revision 1, rồi sửa S2 → nháp revision 2 (đủ điều kiện).
  2. `POST /v1/admin/content/senses/publish-jobs` `{ filter: { senseIds: [S1, S2] } }` → job J (chụp {S1,1}, {S2,2}).
  3. `POST /v1/admin/content/senses/review` `{ items: [{ sense_id: S1, revision: 1, action: 'rejected' }] }`;
     `POST /v1/admin/content/senses/unpublish` `{ sense_ids: [S2] }`.
  4. `jobs.acquire(J)` + `PublishJobHandler.run(makeJobContext(...))`.
  Kỳ vọng: S1 bị từ chối (lý do kiểu `revision-not-open`), S2 vẫn `unpublished`. Nghi thực tế: cả hai `published`; revision 1 của S1 có
  `status: 'published'`, `S1.liveRevisionId` = revision đó; `S2.state = 'open'`.
- **Cách sửa gợi ý:** `publishRevision` từ chối khi `revision.status` không thuộc `draft`/`reviewed`/`published` (giữ `published` cho ca
  publish lại của B2#46); với job, từ chối sense đang `unpublished` nếu lúc chụp nó đang `open` (hoặc ghi rõ trong design là job được
  phép mở lại).

### PL5 — Revert lô lớn chạy đồng bộ trong HTTP (Trung bình, SUSPECTED)

- **Chỗ lỗi:** `src/content-pipeline/upload/uploads.controller.ts:51-57` (`@Idempotent({ timeoutSeconds: 120 })`, gọi `revertBatch`
  ngay trong request); `src/content/catalog/revert.service.ts:157-168` (mỗi entry một transaction có khóa);
  `src/common/idempotency/idempotency.service.ts:26-28,80-82` (hết 120 s thì request lỗi nhưng việc vẫn chạy);
  `src/content-pipeline/upload/uploads-read.controller.ts:70-81` (`GET …/uploads/:id` không trả `revert_report`).
- **Cơ chế:** revert lô CEFR-J = ~7.800 transaction, mỗi cái ~7 câu lệnh (khóa, đọc level, tìm nghĩa đã publish, xóa level, xóa entry
  kèm trigger và cascade). Số đo có sẵn của chiều ngược lại: import cùng file mất 130.757 ms / 17.508 transaction (B2#71) và 196 s ở
  lần chạy tay Bước 3 (`docs/deliveries/buoc-3.md`). Plan Bước 2 Task 24 Step 2 (`docs/superpowers/plans/2026-10-12-buoc-2-content-pipeline.md:421`)
  yêu cầu "Record … the revert timing of Task 21; if a 60-second proxy timeout would cut the revert … say so and open an issue";
  `docs/deliveries/buoc-2.md` không có con số nào. Test thật (`test/pipeline/revert.e2e-spec.ts:442-475`) gọi thẳng `revertBatch(...)`,
  không qua HTTP/idempotency, và chỉ `console.log` thời gian.
- **Vì sao sai:** design §17 tự nêu rủi ro "request phải xong trước timeout của proxy (thường 60 giây)" cho publish 500 mục; revert một
  lô lớn hơn nhiều mà không được xét. B2#40: báo cáo "lists what was skipped and why".
- **Hậu quả (nếu đúng):** > 60 s sau proxy → giao diện báo lỗi mạng trong khi revert vẫn chạy; Bước 2.5 §6.3 cho giao diện gửi lại cùng
  key → 409 "đang xử lý" tới khi xong → được trả lại kết quả (ổn) **chỉ khi revert xong trong 120 s**. > 120 s → transaction
  idempotency hết hạn, dòng key bị rollback, client nhận 500; gửi lại → chạy revert lần hai → 409 `batch-not-revertable` khi lần đầu
  đã xong. Kết quả dữ liệu vẫn đúng (revert chạy hai lần an toàn, test `revert.e2e-spec.ts:242`), nhưng staff thấy "thất bại" cho một
  revert đã thành công và không có API nào đọc lại `revert_report` (danh sách nghĩa đã publish được giữ lại, v.v.).
- **Đã loại trừ:** timeout HTTP của Node (`requestTimeout` chỉ tính lúc nhận request) không phải giới hạn; không có job nền nào cho revert.
- **Probe đề xuất** (thêm vào `describe('real CEFR-J batch revert …')` của `test/pipeline/revert.e2e-spec.ts`, cùng setup worker thật):
  sau khi import file thật `succeeded`, đo `POST /v1/admin/content/uploads/{id}/revert` **qua HTTP** (`ctx.http()`, Idempotency-Key)
  bằng `performance.now()`. Kỳ vọng: < 60 s. Nghi: 60–150 s trên máy dev. Nếu > 120 s: status 500, sau đó
  `GET /v1/admin/content/uploads/{id}` trả `reverted: true` và không có trường báo cáo. Ghi số đo vào `docs/deliveries/buoc-2.md`.
- **Cách sửa gợi ý:** chạy revert bằng khung job nền có sẵn (trả 202, báo cáo lưu ở batch) và cho `GET …/uploads/:id` trả `revert_report`;
  ít nhất là đo và ghi số trước Deploy.

### PL6 — NUL/độ dài ở cột chưa được kiểm làm hỏng cả lượt import (Thấp; CONFIRMED phần worker, SUSPECTED phần API)

- **Chỗ lỗi:** `src/content-pipeline/upload/row-normalizer.ts:97-107` (headword: không kiểm NUL, không kiểm độ dài biến thể),
  `:128-133` (4 cột phụ lưu nguyên, không kiểm), `:191` (`context_label`: không kiểm NUL). Lỗi chỉ bị bắt sâu hơn, dưới dạng lỗi hệ
  thống: `src/content/catalog/entries.service.ts:21-33` (`normalizedKey`/`variantText` ném `ProblemDetailsException`),
  `src/content/senses/import-content.ts:108-110` (lỗi không phải `ContentRuleError` được ném tiếp), Postgres từ chối NUL trong
  `text`/`jsonb`. `src/content-pipeline/import/row-processor.ts:127-131` chỉ đổi `RowRejected` thành "dòng bị loại".
- **Hậu quả:** một ô `go\u0000` ở headword (hoặc biến thể dài > 2.000 ký tự, NUL ở `context_label`, `notes`, `Threshold`…) làm lượt chạy
  ném lỗi; `withTransientRetry` không thử lại (mã 22021/22P05 không thuộc danh sách tạm, `src/content-pipeline/jobs/transient-retry.ts:22`);
  job thử 3 lượt rồi `failed`; các dòng sau dòng đó không bao giờ được xử lý; `error_summary` kiểu "ProblemDetailsException: Validation
  failed" không chỉ ra dòng nào. Phía API: header chứa NUL qua được `parseUploadFile` (đã gọi thật: header `"no\u0000te"` được nhận),
  rồi `raw_headers`/`warnings` là `jsonb` → Postgres từ chối → 500 thay vì 400 `file-invalid`; tên file chứa NUL cũng vậy (`file_name`
  là `text`).
- **Đã loại trừ:** bản sửa L9 chỉ phủ `form_of` (`row-normalizer.ts:69`) và ô nội dung (`:181-186`); `recordRejected` lưu NUL an toàn
  (`row-processor.ts:36-37`) nhưng các dòng này không tới được đó vì không phải `RowRejected`.
- **Probe đề xuất** (`test/pipeline/import-batch.e2e-spec.ts` hoặc `inflections.e2e-spec.ts`, helper `importFile`): file
  `headword,pos,context_label,gloss_vi` với các dòng `ok1,noun,,một` / `go\u0000,verb,,đi` / `ok2,noun,,hai` / `ok3,noun,a\u0000b,ba`.
  Kỳ vọng: `partial`, dòng 3 và 5 bị loại có mã, dòng 2 và 4 `created`. Nghi: `ImportBatchHandler.run` ném lỗi (`ProblemDetailsException`
  rồi lỗi Postgres); với worker thật, lô `failed` sau 3 lượt. API: `POST /v1/admin/content/uploads` với `headword,pos,no\u0000te\r\ngo,verb,x\r\n`
  → kỳ vọng 400 `file-invalid`, nghi 500.
- **Cách sửa gợi ý:** `normalizeRow` kiểm NUL/độ dài cho mọi đoạn headword, `context_label` và 4 cột phụ (loại dòng với mã có sẵn hoặc
  mã mới), giống `normalizedKey`/`variantText`; `parseUploadFile` từ chối header có NUL; thay NUL trong tên file.

### PL7 — Lemma trùng tên thuộc tính `Object.prototype` làm `generateInflections` ném lỗi (Thấp, CONFIRMED)

- **Chỗ lỗi:** `src/content/inflections/inflect.ts:41` (`data.V[lemma] ?? data.V[lemma.toLowerCase()]`) và `:46` (tương tự với `data.N`).
  `data` là object thường từ `JSON.parse`, nên `data.V['constructor']` là hàm `Object` (thuộc tính kế thừa), không phải `undefined`.
- **Bằng chứng (gọi thật hàm trong snapshot):**

  ```
  constructor verb THROWS TypeError: slots.flatMap is not a function
  toString noun   THROWS TypeError: plurals.map is not a function
  valueOf verb    THROWS TypeError: slots.flatMap is not a function
  __proto__ noun  THROWS TypeError: plurals.map is not a function
  constructor noun [{"form":"constructors","kind":"plural"}]   (AGID có khóa riêng 'constructor' ở N)
  ```
- **Hậu quả:** dòng CSV tạo entry mới `constructor,verb` (không có ô `inflections`) → `TypeError` trong transaction dòng
  (`src/content-pipeline/import/row-processor.ts:98-101`) → không phải `RowRejected` → batch `failed` sau 3 lượt. Nếu catalog có entry
  như vậy (tạo từ trước khi có generator), job backfill (`src/content-pipeline/inflections/inflections-backfill.handler.ts:54`) thất bại ở
  chunk đó mỗi lần chạy, các entry sau không bao giờ được điền. `POST /v1/admin/content/entries/batch` với `valueOf,verb` → 500
  (`src/content/senses/admin-senses.controller.ts:139`).
- **Đã loại trừ:** hai file từ thật không có lemma nào như vậy (grep), nên khả năng thấp; `constructor` danh từ vẫn đúng.
- **Probe đề xuất:** unit `expect(generateInflections('constructor', 'verb')).toEqual(expect.any(Array))` (hiện ném); e2e import
  `headword,pos` / `run,verb` / `constructor,verb` / `walk,verb` → kỳ vọng `succeeded`, nghi `failed` với `error_summary`
  "TypeError: slots.flatMap is not a function".
- **Cách sửa gợi ý:** dùng `Object.hasOwn(data.V, key)` trước khi đọc, hoặc nạp JSON vào `Map`/`Object.create(null)`.

### PL8 — Tên file tiếng Việt bị lỗi mã (Thấp, CONFIRMED)

- **Chỗ lỗi:** `src/content-pipeline/content-pipeline.module.ts:30-36` chỉ đặt `limits`; `src/content-pipeline/upload/uploads.service.ts:82`
  lưu `file.originalname`.
- **Cơ chế:** `multer@2.4.0` truyền `defParamCharset: options.defParamCharset` (undefined) cho busboy (`lib/make-middleware.js:119,241`);
  busboy khi đó trả nguyên chuỗi đã đọc theo latin1; README multer ghi mặc định `'latin1'`. Trình duyệt gửi tên file dạng UTF-8 thô.
  Chạy thật busboy 1.6.0 với tên `từ vựng A1.csv`: `defParamCharset=undefined → "tá»« vá»±ng A1.csv"`, `utf8 → "từ vựng A1.csv"`.
- **Hậu quả:** danh sách lô, tiêu đề chi tiết lô và bộ lọc "lô" trên giao diện admin (`apps/admin/src/features/uploads/BatchPanel.tsx:110`,
  `features/content/FilterFields.tsx:65`) hiện tên file bị vỡ chữ với mọi tên có dấu — rất dễ gặp với chủ dự án người Việt.
- **Đã loại trừ:** `decodeFormDataName` của multer chỉ giải mã `%0A/%0D/%22`, không đổi bảng mã; tên file không đi vào header hay đường dẫn
  nào, nên không có lỗ hổng, chỉ hiển thị sai.
- **Probe đề xuất:** `test/pipeline/upload.e2e-spec.ts`: `.attach('file', buffer, 'từ vựng A1.csv')` → `GET /v1/admin/content/uploads/{id}`
  → kỳ vọng `file_name: 'từ vựng A1.csv'`, nghi `'tá»« vá»±ng A1.csv'`.
- **Cách sửa gợi ý:** thêm `defParamCharset: 'utf8'` vào cấu hình `MulterModule.registerAsync`.

### PL9 — "Rác" Excel không được bỏ qua (Thấp, CONFIRMED)

- **Chỗ lỗi:** `src/content-pipeline/upload/csv-file.ts:88-91` (`skip_empty_lines` chỉ bỏ dòng **rỗng hẳn**), `:31` (đoán dấu phân cách
  từ dòng vật lý đầu tiên), `:129-138` (ô tiêu đề rỗng cũng bị coi là trùng).
- **Bằng chứng (gọi thật `parseUploadFile`):** `headword,pos,gloss_vi\r\ngo,verb,đi\r\n,,\r\n…` → bản ghi số 3 là `['', '', '']`;
  `headword,pos,gloss_vi,,` (2 ô tiêu đề trống) → `file-invalid Duplicate header ""`; `\r\nheadword;pos\r\n…` → `file-invalid Missing
  required pos column`.
- **Hậu quả:** Excel thường ghi dòng `,,,` cho các dòng đã xóa nội dung nhưng còn trong vùng đã dùng, và ghi thêm cột trống ở cuối khi cột
  từng có định dạng. Dòng `,,,` → bị loại với `lemma-required` + `invalid-pos`, lô thành `partial`, `rejected.csv` đầy dòng rỗng. Hai cột
  trống ở cuối → cả file bị từ chối với thông báo khó hiểu. Design im lặng; kỳ vọng hợp lý: dòng toàn ô rỗng và cột không tên, không
  dữ liệu được bỏ qua.
- **Đã loại trừ:** đây là hành vi Excel `ASSUMPTION` (design §17 cũng ghi chưa thử trên máy chủ dự án); phần parser đã chạy thật.
- **Probe đề xuất:** e2e upload hai file trên; kỳ vọng `succeeded` (1 dòng) và 202; nghi `partial` với dòng 3 bị loại, và 400.
- **Cách sửa gợi ý:** `skip_records_with_empty_values: true` của csv-parse; bỏ cột tiêu đề rỗng khỏi kiểm trùng nếu mọi ô của nó rỗng;
  đoán dấu phân cách từ dòng không rỗng đầu tiên.

### PL10 — Parse cả file đồng bộ trong API trước khi đếm dòng (Thấp, CONFIRMED cơ chế)

- **Chỗ lỗi:** `src/content-pipeline/upload/csv-file.ts:86-98` (`csv-parse/sync` cả file) rồi mới `:146-151` kiểm `maxRows`; chạy trong
  tiến trình API (`src/content-pipeline/upload/uploads.service.ts:54`). Thứ tự này có chủ ý (test `csv-file.spec.ts:300` "parses the whole
  file before rejecting … excess rows").
- **Bằng chứng (đo thật hàm `parseUploadFile`):** file 1,91 MB, 500.000 dòng `a,b` → 578 ms chặn event loop, heap 10 → 144 MB, RSS 280 MB,
  rồi mới báo `file-too-large`. File 10 MB cùng dạng (~2,6 triệu dòng) ước ~3 s và heap ~700 MB (ngoại suy, chưa đo).
- **Hậu quả:** chỉ staff (`content.import` + `content.edit`) gửi được; một file như vậy làm mọi request của API (cả người học) đứng vài giây,
  container nhỏ (512 MB–1 GB) có thể bị OOM. File từ vựng thật 10 MB (~200k dòng dài) không gặp vấn đề.
- **Đã loại trừ:** multer chặn > 10 MB trước khi đọc hết (`content-pipeline.module.ts:34`); guard xác thực chạy trước interceptor multer
  nên người chưa đăng nhập không kích được.
- **Probe đề xuất:** unit trên `parseUploadFile` với 10 MB `a,b\n` đo thời gian và `process.memoryUsage().heapUsed`.
- **Cách sửa gợi ý:** dùng `to: maxRows + 1` (dừng parse sớm) cho lượt kiểm ở API, chấp nhận lỗi cấu trúc sau dòng giới hạn được báo ở worker.

### PL11 — AGID được nhận làm nguồn level (Thấp, CONFIRMED)

- **Chỗ lỗi:** `src/content-pipeline/upload/uploads.service.ts:33-44` chỉ kiểm nguồn tồn tại và `isSourceComplete`; AGID (migration
  `20261017220000_agid_source`) là `third_party` có version và license nên qua (`src/content/sources/sources.service.ts:38-40`). Form upload
  của admin liệt kê mọi nguồn (`apps/admin/src/features/uploads/UploadForm.tsx:161`).
- **Hậu quả:** staff chọn nhầm "AGID 2016.01.19" làm nguồn level cho file CEFR → level ghi `imported` mang tên AGID (sai nguồn gốc, sai giấy
  phép hiển thị ở `GET /v1/sources`); gỡ được bằng revert. Design im lặng (AGID thêm ở Bước 3 cho dạng chia).
- **Probe đề xuất:** `POST /v1/admin/content/uploads` với `level_source_id = AGID_SOURCE_ID`, file `headword,pos,CEFR` / `go,verb,A1` →
  kỳ vọng 400; nghi 202 và một `entry_levels` có `source_id = AGID_SOURCE_ID`.
- **Cách sửa gợi ý:** đánh dấu nguồn nào dùng được cho level (cột hoặc danh sách loại trừ), từ chối ở API và ẩn ở form.

### PL12 — Cảnh báo theo dòng mất khi worker chết giữa lô (Thấp, CONFIRMED)

- **Chỗ lỗi:** `src/content-pipeline/import/import-batch.handler.ts:57-58` (nạp cảnh báo đã lưu), `:112` (thêm cảnh báo của dòng vào `Set`
  trong bộ nhớ), `:115`/`:120` (chỉ lưu khi lượt chạy kết thúc hoặc ném lỗi).
- **Hậu quả:** B2#24a ("ghi đè revision CSV đã `reviewed` → báo cáo lô có cảnh báo cho dòng đó") và B2E20 (bỏ chủ đề đã ẩn) mất cảnh báo
  nếu tiến trình bị kill giữa chừng (B2#35): lượt sau bỏ qua các dòng đã xong nên không sinh lại cảnh báo. Dữ liệu vẫn đúng.
- **Probe đề xuất:** dòng 2 ghi đè một nháp CSV `reviewed`; chạy handler với một `JobContext` bọc `makeJobContext` ném `LeaseLostError` ở
  lần gọi `tx` thứ 3 (handler ném tiếp mà không `saveReport`); `acquire` lại và chạy lần nữa → kỳ vọng `warnings` có "Dòng 2: bỏ dấu đã rà…",
  nghi không có.
- **Cách sửa gợi ý:** lưu cảnh báo của dòng cùng transaction với outcome của dòng (ví dụ cột `warnings` ở `import_row_outcomes`), rồi gộp khi
  `saveReport`.

### PL13 — Tiền tố chống công thức không được gỡ ở `headword`/`context_label` (Thấp, CONFIRMED)

- **Chỗ lỗi:** `src/content-pipeline/export/export.service.ts:71` → `csvRow` → `csvCell` (`src/content-pipeline/upload/csv-writer.ts:2-4`)
  thêm `'` cho **mọi** ô bắt đầu bằng `= + - @`, kể cả `headword`, `context_label`; khi nhập, `src/content-pipeline/upload/row-normalizer.ts:135-141`
  chỉ gỡ `'` ở cột nội dung, `form_of`, `inflections`.
- **Vì sao sai:** design §8: "khi nhập, nếu ô bắt đầu bằng `'` rồi đến một trong bốn ký tự đó thì gỡ `'` trước khi băm và so sánh" (mọi
  ô); B2#53/B2#54: xuất rồi nhập lại không đổi nội dung.
- **Hậu quả:** lemma kiểu `-ism`, `-ness` (staff có thể thêm từ tố) xuất thành `'-ism`; nhập lại file nghĩa → `sense-entry-mismatch`; nhập
  lại file "từ chưa có nghĩa" (không có `sense_id`) → **tạo entry rác `'-ism`**. Hai file từ thật không có lemma nào như vậy (grep).
- **Probe đề xuất:** tạo entry `-ism` noun + một nghĩa, xuất `GET …/senses/export`, upload lại nguyên file → kỳ vọng `unchanged`, nghi
  `rejected` `sense-entry-mismatch`.
- **Cách sửa gợi ý:** gỡ tiền tố ở mọi cột người dùng gửi (trừ cột `_…`), trước `splitHeadword`.

### PL14 — Smoke test Bước 2 hỏng từ Bước 3 (Thấp/tooling, CONFIRMED bằng đọc)

- **Chỗ lỗi:** `scripts/smoke-buoc-2.mjs:191` lấy `sense_id`, `revision` ở vị trí 10, 11 của dòng xuất; từ PR #32 xuất có thêm
  `form_of`, `inflections` ở đúng hai vị trí đó (`src/content-pipeline/export/export.service.ts:8-11`). Script nhận chuỗi rỗng, bước "fill"
  vẫn chạy nhờ khớp theo khóa, nhưng `:205-207` gọi `GET …/senses?sense_id=` → 400 (zod `uuid`, `src/content/catalog/sense-filters.ts:9`)
  → `.items[0]` ném `TypeError`.
- **Hậu quả:** `pnpm smoke:buoc-2` — bước 2 của `docs/deliveries/buoc-2-test-flow.md` — báo "SMOKE TEST FAILED: Cannot read properties of
  undefined (reading '0')"; người chạy QA dễ tưởng API lỗi.
- **Probe đề xuất:** chạy `pnpm smoke:buoc-2` với API + worker thật; kỳ vọng "ALL CHECKS PASSED", nghi dừng ở bước 6.
- **Cách sửa gợi ý:** đọc cột theo tên từ dòng tiêu đề thay vì theo vị trí.

---

## 4. Test gaps (chỉ cái quan trọng)

- **TG1 — B2E6 chỉ thử ca sửa một cột file không có** (`test/pipeline/export.e2e-spec.ts:346-363`); chưa có ca sửa cột file cũng có (PL2).
- **TG2 — vòng 2 của file dòng bị loại chưa bao giờ được upload lại**; `test/pipeline/reports.e2e-spec.ts:172` còn khẳng định header bị lặp
  mà không thử upload (PL1).
- **TG3 — revert chưa có ca entry đang được dùng** bởi dạng chia đã duyệt của lô khác, bởi `form_of` của nghĩa catalog hay của từ riêng
  (`test/pipeline/revert.e2e-spec.ts`; PL3).
- **TG4 — revert lô thật chỉ chạy qua hàm** (`test/pipeline/revert.e2e-spec.ts:464`), không qua HTTP + idempotency, và thời gian chỉ
  `console.log`, chưa ghi vào tài liệu như plan Task 24 yêu cầu (PL5).
- **TG5 — B2#45b chỉ thử "đổi số revision sau lúc chụp"** (`test/pipeline/publish-jobs.e2e-spec.ts:94-148`); chưa có ca `rejected`/`unpublish`
  sau lúc chụp (PL4).
- **TG6 — M5 chỉ kiểm `basis`** (`test/pipeline/inflections.e2e-spec.ts:339-348`); chưa có ca revert lô tạo level derived sau khi staff xác
  nhận, chưa có đường CSV nguồn `owner`.
- **TG7 — L7 chỉ kiểm xóa từ riêng** (`test/content/private-words.e2e-spec.ts:219-225`); chưa có "revert xóa entry gốc → upload lại file xuất
  không đổi vẫn `unchanged`".
- **TG8 — NUL chỉ được thử ở `form_of` và ô nội dung** (`inflections.e2e-spec.ts:181-189`); chưa có ở headword, `context_label`, cột phụ
  (PL6).

---

## 5. Trạng thái các phát hiện cũ

| ID cũ | Trạng thái | Bằng chứng |
|---|---|---|
| H1 | Đã sửa | PR #42 (commit `7dabf79`): `src/content-pipeline/import/prefilter.ts:98-104` — dòng có ô `inflections` luôn được xử lý lại; key loại `inflection` không còn được ghi (chỉ còn `kind: 'level'` ở `row-processor.ts:117`); test `test/pipeline/inflections.e2e-spec.ts:262-272` (H1) và `:244-260` (T-A1, đếm số lần gọi processor). |
| M3 | Đã sửa | `src/content-pipeline/upload/row-normalizer.ts:32-33` (`-` → bộ rỗng), `:41` (thông báo nêu `-`); `src/content/inflections/inflections.service.ts:29-35` (bộ đã duyệt đặt `inflections_reviewed_at`; bộ library bị bỏ qua khi đã duyệt); `src/content-pipeline/inflections/inflections-backfill.handler.ts:42-43`; `src/content/catalog/admin-catalog.queries.ts:103-105` (xuất `-`); migration `20261018120000_inflections_reviewed`; test `inflections.e2e-spec.ts:274-297`. Lưu ý: quyết định `-` mất nếu entry bị revert xóa (PL3). |
| M4 | Đã sửa | `src/content/senses/import-content.ts:72-76` (không có sense và chỉ có `formOf: null` → `unchanged`); test `inflections.e2e-spec.ts:299-323` (PR #42, #43). |
| M5 | Sửa một phần | Đã sửa `basis`: `src/content/catalog/levels.service.ts:76-77`, test `inflections.e2e-spec.ts:339-348`. Còn mở: (a) dòng level giữ nguyên id nên vẫn nằm trong `batch_records` của lô tạo level derived → revert lô đó xóa level staff vừa xác nhận (`src/content/catalog/revert.service.ts:130-146` không xét `basis`); (b) đường "file riêng khai báo nguồn `owner`" mà design §8 và B2E27 nêu để đặt level biên tập: `src/content-pipeline/import/row-processor.ts:184-186` thấy cùng giá trị level (dòng derived dùng chung `OWNER_SOURCE_ID`) nên trả về sớm, level vẫn `derived`, xung đột level không gỡ được. |
| L7 | Sửa một phần | Trigger `20261018130000_form_of_unlink:6-14` xóa `form_kind`; test `test/content/private-words.e2e-spec.ts:219-225`. Còn mở: `content_hash` đã lưu vẫn tính `formOf` (so ở `import-content.ts:88`, `senses.service.ts:104`) → upload lại file xuất không đổi tạo revision thừa; báo cáo revert không nhắc link mất (`docs/deliveries/buoc-3.md:97` cũng ghi còn mở). Phần mở rộng (dạng chia đã duyệt, link của từ riêng người học): PL3. |
| L8 | Đã xử lý theo quyết định | Quyết định "Chấp nhận ở Bước 3, báo cáo revert ghi rõ" (`docs/superpowers/decisions/2026-10-16-buoc-3-learning-decisions.md:589`); `src/content-pipeline/import/revert.service.ts:36-42`; test `inflections.e2e-spec.ts:325-337`. Ghi chú chỉ có khi file của chính lô bị revert có cột `inflections`. |
| L9 | Đã sửa (phần `form_of`) | `row-normalizer.ts:52-75` (kind hợp loại từ của từ gốc, NUL, độ dài), `:146-148` (tự trỏ), `row-processor.ts:36-37` (U+FFFD khi lưu raw); test `inflections.e2e-spec.ts:181-189`. Cùng lớp lỗi còn ở cột khác (PL6); ô `inflections` không kiểm kind hợp loại từ (`happy,adjective,plural:happies` được nhận, `parseInflections` không nhận `pos`). |
| L10 | Đã sửa | `src/content/senses/admin-senses.controller.ts:137-139`; test `test/content/senses.e2e-spec.ts:243`. (PL7 cũng áp ở route này.) |
| L18 | Còn mở (dữ liệu) | Generator không đổi từ `6cc477c`. Gọi thật hôm nay: `furniture → furnitures`, `Internet → Internets`, `mother-in-law → mother-in-laws`, `lie → lied, lay` (quá khứ), `Bank → banks`, `pork → porks`. Cách xử lý đã chốt: ô `inflections` đã duyệt hoặc `-` khi chủ dự án duyệt CSV (khả thi nhờ M3); `docs/deliveries/buoc-3.md:99-101`. |
| P1 (buoc-3.md) | Còn mở (chờ chủ dự án) | `src/content-pipeline/export/export.service.ts:50-52`, `src/content/catalog/admin-catalog.queries.ts:313`; `EXPORT_MAX_ROWS=5000` (`.env.example:6`). Chi tiết mới: cách tránh "xuất theo từng level" không lấy được entry **không có level** (`src/content/catalog/sense-filters.ts:18-21` chỉ có `level` enum; lọc level đòi `displayed_level` bằng giá trị đó), nên khi > 5.000 entry chưa có nghĩa thì entry không level (B2#16: từ chủ dự án tự thêm, ô level trống) không xuất được bằng cách nào. |

---

## 6. Đã kiểm, không thấy vấn đề

**Đọc CSV và kiểm cả file (`src/content-pipeline/upload/csv-file.ts`):**
- Giới hạn byte kiểm trước khi giải mã (`:66-71`); multer chặn > 10 MB, `files: 1` (`content-pipeline.module.ts:34`); 413 `file-too-large`
  (`upload/multer-exception.filter.ts`).
- UTF-8 `fatal` từ chối bảng mã Windows và UTF-16 với hướng dẫn "CSV UTF-8" (`:73-81`); BOM bị `TextDecoder` bỏ và `bom: true` (đã chạy:
  BOM + CRLF đọc đúng).
- Đoán dấu phân cách bỏ qua ký tự trong ngoặc kép, nhập nhằng thì từ chối kèm tên dấu (`:30-60`); RFC 4180 (ngoặc kép, xuống dòng trong ô,
  `""`) qua csv-parse; số cột lệch → `file-invalid` (`relax_column_count: false`).
- Thiếu header, thiếu `pos` hoặc cả `headword` lẫn `lemma`, header trùng, 0 dòng, quá 20.000 dòng (`:108-151`); số dòng `_row` là số bản ghi
  (đúng "số dòng Excel", có test `csv-file.spec.ts:272`).
- Cột lạ → cảnh báo; cột `_…` bỏ im lặng (`upload/columns.ts:48-56`).

**Chuẩn hóa dòng (`src/content-pipeline/upload/row-normalizer.ts`):** cắt/gộp khoảng trắng, NFC, `pos` thường, level hoa (`:109-127`);
mọi lỗi của dòng được gom (`:96-213`); `cell-too-long` > 2.000 (`:151-159`); NUL ở ô nội dung → loại dòng (`:177-187`); `sense_id` phải là
UUID, `revision` số nguyên dương không có 0 đầu (`:192-210`); gỡ `'` trước khi băm cho ô nội dung (`:135-141`); `form_of` và `inflections`
như L9/M3.

**Lọc trước (`src/content-pipeline/import/prefilter.ts`):** trùng khóa nội dung trong file → `duplicate-key-in-file`, ghi trước khi xử lý
(`:42-52`, handler `:94-96`); `inflections-differ-in-file` theo entry, không theo dòng kề (`:26-41`); một truy vấn hàng loạt, bỏ key của lô
đã revert (`:67-78`); chỉ bỏ qua dòng khi **đúng byte file**, cùng nguồn level, lô trước đã áp đúng dòng đó và mọi key khớp (`:79-104`);
key level là toàn cục + `skipDuplicates` nên lô đầu giữ key — đã kiểm cùng revert: revert xóa key của lô, nên upload lại file của lô sau
tạo lại được (B2#41, quyết định 12/10).

**Hợp đồng thuê và khung job (`src/content-pipeline/jobs/`):**
- `acquire` một câu `UPDATE … WHERE status='queued' OR (running AND hết hạn)`, tăng `lease_epoch` và `attempts`
  (`background-jobs.service.ts:67-86`); va chạm `exclusive_key` (index duy nhất từng phần, migration pipeline `:107`) → trả `null`, không
  hỏng hàng đợi.
- Mỗi `ctx.tx` mở `SELECT … FOR SHARE` trên dòng job rồi so `lease_epoch` (`:30-47`): worker "ma" (hết lease vẫn chạy) bị chặn — bên lấy
  lại lease phải chờ transaction đang mở commit, transaction kế tiếp của worker cũ ném `LeaseLostError`; mọi ghi của handler import, publish,
  backfill đều đi qua `ctx.tx` hoặc `finish/release` có điều kiện epoch (`:88-111`).
- Nhịp tim không chồng nhau, lỗi chỉ log (`job-runner.service.ts:60-67`); mỗi Worker một kết nối Redis riêng (`:44`); `concurrency: 1` (`:48`);
  `LeaseLostError` → kết thúc êm (`:74`); lượt cuối → `failed`, còn lại → `release` để BullMQ thử lại (`:78-82`).
- Reconciler (`job-reconciler.service.ts:35-68`): lấy lại lease hết hạn bằng `updateMany` có điều kiện hết hạn + giới hạn `attempts` và tăng
  epoch; chỉ thêm lại vào Redis khi không có job sống; job `completed/failed` còn sót thì xóa trước khi thêm.
- BullMQ: `jobId` = id batch/job, `attempts` 3, backoff mũ có `jitter: 0.5`, `removeOnComplete/removeOnFail` (`job-queue.service.ts:65-69`);
  `commandTimeout` 2 s nên upload khi Redis sập vẫn trả 202 sau ~2 s, batch ở `queued`, reconciler thêm lại (B2#4, B2E14).
- Thử lại dòng chỉ cho lỗi tạm (40001, 40P01, 08xxx, P1001/P1002/P1017/P2034), có giới hạn và jitter (`transient-retry.ts`).
- Redis cục bộ `noeviction` + AOF (`docker-compose.yml:21`).

**Import (`src/content-pipeline/import/`):** chạy lại bỏ qua dòng đã có outcome (`import-batch.handler.ts:65-83`); ghi catalog + key + outcome
trong **một** transaction mỗi dòng (`row-processor.ts:57-126`), outcome đầu tiên được giữ khi chạy lại; dòng bị loại rollback toàn bộ rồi ghi
outcome ở transaction riêng (`:30-45`); bộ đếm suy ra từ DB (`import-batch.handler.ts:138-157`, B2#32); `level-differs-from-source` chỉ với
level của lô **trước** (`row-processor.ts:182-204`); `form_of` chỉ tìm từ gốc catalog (`:139`); dạng library chỉ cho entry mới, không đè bộ đã
duyệt (`:98-101`, `inflections.service.ts:29-31`); file đã bị dọn → `failed file-purged` (`import-batch.handler.ts:48-55`); log không chứa giá
trị ô (`:123-131`).

**Revert (`src/content-pipeline/import/revert.service.ts`, `src/content/catalog/revert.service.ts`):** 409 khi `queued`/`running`/đã revert,
kiểm lại dưới `FOR UPDATE` trước khi xóa key và đặt `reverted_at` (`:10-15,43-50`); revision chỉ xóa khi chưa publish và còn là mới nhất,
revision bị thay được trả trạng thái cũ (`content/catalog/revert.service.ts:83-105`); sense xóa theo thứ tự lá trước (ràng buộc
`replaces_sense_id`) (`:107-128`); level là level duy nhất của entry có nghĩa đang publish thì giữ (`:130-146`); mỗi entry một transaction có khóa
entry nên chạy song song với import/publish an toàn; chạy hai lần an toàn.

**Xuất (`src/content-pipeline/export/export.service.ts`):** đếm và lọc xong trước khi ghi byte đầu tiên, vượt `EXPORT_MAX_ROWS` → 400
`export-too-large` (`:42-54`); stream theo khối 500 dòng có backpressure và dừng khi client ngắt (`:19-33,63-75`); BOM + CRLF, chống công thức
`= + - @` cho mọi ô (`upload/csv-writer.ts`); quyền `content.edit` (`senses-export.controller.ts`); chỉ catalog.

**Job publish (`src/content-pipeline/publish/`):** `content.publish` + `Idempotency-Key`; `batch_id` giao với `senseIds` trước khi chụp
(`publish-jobs.controller.ts:56-60`); chụp trong `RepeatableRead` (`content/catalog/admin-catalog.queries.ts:271-292`); 400 `nothing-to-publish`
trước khi tạo dòng nào (`:63-65`); chèn mục theo khối 1.000 (`:73-75`); worker chỉ xử lý mục `pending`, mỗi mục một `ctx.tx`, mục lỗi không dừng
job, chết giữa chừng → `already_published` (`publish-job.handler.ts:38-55`); trạng thái cuối `succeeded`/`partial`.

**Backfill dạng chia (`src/content-pipeline/inflections/`):** bỏ qua entry đã duyệt (kể cả `-`) và entry đã có dòng (`handler:43,53`);
500 entry mỗi transaction, khóa từng entry và kiểm lại; keyset theo id nên luôn kết thúc; `content.import`, `Idempotency-Key`, `exclusiveKey`
nên hai backfill không chạy cùng lúc (`controller:19-35`).

**Lưu file upload:** byte file ở `import_batch_files` (bytea), không đưa vào Redis; xóa sau 30 ngày tính từ lúc upload, chạy mỗi giờ
(`import-file-cleanup.service.ts:26-28`); `rejected.csv` vẫn tải được sau khi file bị xóa (raw lưu ở outcome); tên file không đi vào header
`Content-Disposition` (dùng id).

**Upload và quyền:** nguồn sai/thiếu kiểm trước file (`uploads.service.ts:33-44`); job + batch + file trong một transaction rồi mới enqueue
(`:76-95`); băm payload idempotency gồm cả byte file (`src/common/idempotency/idempotency.interceptor.ts:48-55`, B2#5); revert đòi
`content.import` + `content.edit` — khớp Bước 2.5 §6.3 ("Hoàn tác lô (cần thêm `content.edit`)").

**Worker (`src/worker.ts`):** `createApplicationContext` (không mở cổng HTTP), `runWorkers: true` chỉ ở worker, shutdown hook đóng Worker,
Redis, timer.

---

## 7. Declined to judge / Ngoài phạm vi

**Declined to judge:**
- Ô thô trong `rejected.csv` bắt đầu bằng tab hoặc CR rồi `=` không được thêm `'` (`csv-writer.ts:3` chỉ xét `= + - @`). Có nguy hiểm hay
  không tùy bảng tính; dữ liệu do chính staff upload. Cần thử trên Excel thật.
- Worker bị đóng băng (VM pause, mạng treo nửa vời) giữa `ctx.tx` giữ `FOR SHARE` vô thời hạn vì không có `idle_in_transaction_session_timeout`;
  reconciler và worker khác sẽ chờ. Comment ở `idempotency.service.ts:22-25` cho thấy timeout phía Postgres được bỏ có chủ ý; chỉ đáng xét khi
  chạy nhiều worker — chưa chốt.
- Job publish dùng hai kết nối cùng lúc (transaction ngoài giữ `FOR SHARE` + transaction của `publishItem`); pool `pg` mặc định 10, tiến trình
  worker còn import, backfill, nhắc học, reconciler. Cạn pool chỉ làm lượt thử thất bại rồi thử lại; cần đo tải.
- Prisma có tự chia nhỏ danh sách `in`/`createMany` lớn không: ở 20.000 dòng, tính tay vẫn dưới 65.535 tham số; nếu nâng `IMPORT_MAX_ROWS` quá
  ~21.800 thì câu ghi `unchanged` hàng loạt có thể vượt. Chưa kiểm được không chạy.
- Snapshot job publish gồm cả sense đang `unpublished` có nháp đủ điều kiện (mở lại khi publish); design không nói "sẵn sàng" có gồm sense
  đã ẩn không. Chỉ báo phần xảy ra sau lúc chụp (PL4).
- Upload lại đúng byte file không khôi phục biến thể staff đã xóa qua `PUT …/variants` (file khác byte thì có): bảo vệ được quyết định của
  staff nhưng không nhất quán; design im lặng.
- `IMPORT_LEASE_SECONDS`/`IMPORT_HEARTBEAT_SECONDS` không được kiểm chéo (nhịp tim < lease, lease > 30 s timeout của `ctx.tx`); mặc định đúng,
  chỉ sai khi cấu hình sai.

**Ngoài phạm vi (một dòng mỗi mục):**
- `src/content/senses/publish.service.ts:89-113` — `POST …/senses/publish` đồng bộ cũng publish được revision `rejected` nếu gọi đúng số; đây là
  gốc của PL4.
- `src/content/private/private-words.service.ts:139,175` — từ riêng của người học `constructor`/`valueOf` (động từ hoặc danh từ) → 500 do PL7.
- `src/common/idempotency/idempotency.service.ts:30-82` — nếu commit của transaction idempotency lỗi sau khi handler đã commit, gửi lại cùng key
  chạy handler lần nữa (với upload: một batch thừa).
- `apps/admin/src/features/uploads/UploadForm.tsx:161` — form upload liệt kê AGID trong danh sách nguồn level (nửa giao diện của PL11).

---

## 8. Chưa kiểm

- Không chạy e2e hay probe nào trên Postgres/Redis (theo brief); mọi probe ở trên chờ điều phối chạy.
- Hành vi giao diện admin khi revert lâu hoặc khi gửi lại (chỉ đọc design Bước 2.5 §6.3).
- Hành vi CSV thật của Excel trên máy cài tiếng Việt (dấu `;`, dòng `,,,`, mất `'` ở `'m`) — vẫn là `ASSUMPTION` như design §17.
- Bên trong BullMQ (stalled job, lock renewal) chỉ suy từ cấu hình mặc định, không đọc source.
- Không đo hiệu năng: thời gian revert (PL5), import file nội dung lớn khi upload lại (PL2), backfill trên 7.799 entry.
- Không đọc hết từng dòng của mọi file test pipeline; chỉ đọc các test liên quan tới phát hiện và tiêu chí được hỏi.
