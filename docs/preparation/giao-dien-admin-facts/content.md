# Facts: API cho màn admin Nội dung (A/87, A/88, A/88b, A/89, A/77, A/77b)

Ngày 27/10/2026. Kiểm read-only trên checkout `origin/dev` commit `6e72bb3` (bản sao chỉ đọc trong scratchpad; mọi `path:line` dưới đây
tính từ gốc repo). Nguồn màn: `docs/mockups/2026-10-21/ban-chu-giao-dien.md` §8.1, §8.7; luật: `docs/superpowers/specs/2026-10-21-dot-giao-dien-design.md` §6.4, §10.

Quy ước chung (đã đọc):
- Mọi route có tiền tố `/v1` (`apps/api/src/app.setup.ts:26`).
- Quyền: `RequirePermission(...)` gắn metadata + `PermissionGuard` (`apps/api/src/identity/staff/require-permission.decorator.ts:7-8`); quyền ở handler
  ghi đè quyền ở class (`getAllAndOverride`, `apps/api/src/identity/staff/permission.guard.ts:22-24`); phải có **đủ mọi** quyền liệt kê (`permission.guard.ts:35`);
  thiếu → 403 `forbidden` (`permission.guard.ts:43`); staff còn mật khẩu tạm → 403 `password-change-required` (`permission.guard.ts:36-38`).
- Bảng role → quyền (`apps/api/src/identity/identity.types.ts:9-15`): `editor` = `content.edit`, `content.publish`, `content.import`, `taxonomy.manage`,
  `entitlements.grant`. Tức là **`editor` làm được mọi thao tác trong các màn này** (kể cả `taxonomy.manage`).
- Lỗi body/query sai schema → 400 `validation-failed` (`apps/api/src/common/problem-details/problem-details.filter.ts:74`, `:85`).
- Phân trang chuẩn: `page_size` 1–100, mặc định 20, `page_token` opaque (`apps/api/src/content/catalog/admin-catalog.controller.ts:10-13`); token
  sai/không khớp bộ lọc → 400 `validation-failed` (`apps/api/src/content/catalog/admin-catalog.queries.ts:59-61`, `:65-69`).
- Admin client hiện có (`apps/admin/src/features/content/content-api.ts`): chỉ gọi `GET /v1/admin/taxonomy/topics` (`:118-120`) và
  `GET /v1/admin/content/uploads` (`:88-90`) trong số các endpoint dưới đây. **Chưa có hàm client nào** cho entries, senses, review, publish,
  unpublish, retire, quick-publish, draft, batch, tạo/sửa topic, unknown-forms, word-forms (grep `admin/content|admin/taxonomy|unknown-forms|word-forms`
  trong `apps/admin/src` chỉ ra `content-api.ts:70-72,115,119`).

## A/87 Từ

| Phần tử | Endpoint | Trường / mã lỗi | Quyền | Trạng thái | Bằng chứng `path:line` |
|---|---|---|---|---|---|
| Danh sách | `GET /v1/admin/content/entries` | `items[]`, `next_page_token`; `page_size`/`page_token` | `content.edit` | OK | `apps/api/src/content/catalog/admin-catalog.controller.ts:30,34-37`; `admin-catalog.queries.ts:183-187` |
| Ô tìm "từ hoặc cách viết khác" | như trên | `q` (1–100 ký tự), khớp `lemma` hoặc `variants.text`, không phân biệt hoa thường | `content.edit` | OK | `admin-catalog.controller.ts:18-19`; `admin-catalog.queries.ts:221-222` |
| Lọc Trình độ (A1–C2) | như trên | `level`; lọc theo **trình độ hiển thị** | `content.edit` | OK | `admin-catalog.controller.ts:17`; `admin-catalog.queries.ts:220,230` |
| Lọc Có nghĩa / Chưa có nghĩa | như trên | `has_sense=true|false` | `content.edit` | DIFFERS (nhỏ): `true` = có **bất kỳ** sense nào, kể cả sense đã `retired`; trong khi export "từ chưa có nghĩa" dùng "không có sense chưa retired" | `admin-catalog.queries.ts:219` so với `:304` |
| Lọc Trình độ lệch nhau | như trên | `conflict=true|false`; `conflict` = không có level editorial **và** các nguồn cho nhiều level khác nhau | `content.edit` | OK | `admin-catalog.controller.ts:17`; `admin-catalog.queries.ts:94,229` |
| Lọc Lô nhập | như trên | `batch_id` (uuid); provider thiếu → 400 `batch-filter-unavailable` | `content.edit` | OK | `admin-catalog.controller.ts:20`; `admin-catalog.queries.ts:198-206,209` |
| Nguồn danh sách lô cho bộ lọc | `GET /v1/admin/content/uploads` | `items[].id, file_name, row_count, status, created_at`; có phân trang | `content.import` | OK | `apps/api/src/content-pipeline/upload/uploads-read.controller.ts:23,27-51` |
| Cột Từ / Loại từ | entries | `lemma`, `pos` | — | OK | `admin-catalog.queries.ts:125` |
| Cột Trình độ hiển thị | entries | `displayed_level` (+ `levels[]` từng nguồn, `conflict`) | — | OK | `admin-catalog.queries.ts:85-95,129-135` |
| Cột Nghĩa (số nghĩa, trạng thái) | entries | `senses[]` mỗi phần tử `sense_id, state, status, revision, live_revision_id, replaces_sense_id, context_label`; số nghĩa = độ dài mảng (gồm cả sense retired) | — | OK (client tự đếm/lọc retired) | `admin-catalog.queries.ts:116-122,135` |
| Cột Từ chức năng | entries | `function_word` (+ `function_word_derived`, `function_word_override`) | — | OK | `admin-catalog.queries.ts:126-127` |
| Cột Cách viết khác | entries | `variants[] {id, text, kind, accepted_as_answer}` | — | OK | `admin-catalog.queries.ts:128` |
| Thao tác Sửa trình độ | `PUT /v1/admin/content/entries/{id}/levels/editorial` | body `{level}` (A1–C2); 204; 404 `not-found`. Không có đường xóa level editorial | `content.edit` | OK | `apps/api/src/content/catalog/admin-entries.controller.ts:18,32-33,41,59-67` |
| Thao tác Sửa cách viết khác | `PUT /v1/admin/content/entries/{id}/variants` | body `{variants:[{text, kind:'spelling'|'alias', accepted_as_answer}]}` (thay cả bộ); 204; trùng text → 400 `validation-failed`; 404 `not-found` | `content.edit` | OK | `admin-entries.controller.ts:13-17,48-57`; `apps/api/src/content/catalog/entries.service.ts:64-68` |
| Thao tác Đánh dấu từ chức năng | `PUT /v1/admin/taxonomy/entries/{id}/function-word` | body `{override: true|false|null}` (`null` = về giá trị tự suy); 204; 404 | `taxonomy.manage` (editor có) | OK | `admin-entries.controller.ts:19,70-71,78-86` |
| Thao tác Thêm nghĩa | `POST /v1/admin/content/senses` | body `{entry_id, context_label?, content?, replaces_sense_id?}` → `{sense_id, revision_id, revision:1}`; lỗi `not-found` 404, `sense-exists` / `replacement-exists` / `replacement-waiting` / `sense-retired` / `sense-entry-mismatch` 400 | `content.edit` | OK | `apps/api/src/content/senses/admin-senses.controller.ts:17-19,29-36,59,66-77`; `apps/api/src/content/senses/senses.service.ts:64-80` |
| Thêm cả loạt [Dán danh sách từ] "lemma,pos, tối đa 500 dòng" | `POST /v1/admin/content/entries/batch` | body `{lines: string[]}` tối đa 500 (quá → 400 `validation-failed`); mỗi dòng tách bằng `,`, đúng 2 phần, lemma ≤100 ký tự, `pos` hợp lệ; trả `items[] {line, status:'created'|'exists'|'invalid', entry_id?, sense_id?, warnings[]}`; cảnh báo lemma chỉ khác hoa/thường | `content.edit` | OK. Lưu ý: mỗi từ mới được tạo **kèm một sense rỗng** (hoặc trả sense có sẵn khi `exists`) | `admin-senses.controller.ts:25,27,115-117,123-155` |

## A/88 Nghĩa

| Phần tử | Endpoint | Trường / mã lỗi | Quyền | Trạng thái | Bằng chứng `path:line` |
|---|---|---|---|---|---|
| Danh sách | `GET /v1/admin/content/senses` | `items[]`, `next_page_token`; `page_size`/`page_token` | `content.edit` | OK | `admin-catalog.controller.ts:22,39-42`; `admin-catalog.queries.ts:235-251` |
| Lọc Trạng thái: Thiếu nội dung / Bản nháp đang mở / Đã publish | như trên | `status=unpublishable` / `open_draft` / `published` | `content.edit` | OK | `apps/api/src/content/catalog/sense-filters.ts:10`; `admin-catalog.queries.ts:154-160,265-268` |
| Lọc Trình độ | như trên | `level` (trình độ hiển thị) | `content.edit` | OK | `sense-filters.ts:11`; `admin-catalog.queries.ts:152` |
| Lọc Loại từ | như trên | `pos` | `content.edit` | OK | `sense-filters.ts:11`; `admin-catalog.queries.ts:257` |
| Lọc Chủ đề | như trên | `topic` (mã, `[a-z0-9-]+`), khớp topic của revision mới nhất | `content.edit` | OK | `sense-filters.ts:12`; `admin-catalog.queries.ts:153` |
| Lọc Lô nhập | như trên | `batch_id` | `content.edit` | OK | `sense-filters.ts:13`; `admin-catalog.queries.ts:255,261` |
| Nguồn danh sách chủ đề cho bộ lọc | `GET /v1/admin/taxonomy/topics` | `items[] {code, names{vi,en}, archived_at}` | `taxonomy.manage` (editor có) | OK (client đã có `listTopics`) | `apps/api/src/content/taxonomy/topics.controller.ts:13-20`; `apps/admin/src/features/content/content-api.ts:118-120` |
| Cột Từ / Loại từ | senses | `lemma`, `pos` (+ `entry_id`) | — | OK | `admin-catalog.queries.ts:142` |
| Cột Nghĩa tiếng Việt | senses | `content.gloss_vi` (của revision mới nhất) | — | OK | `admin-catalog.queries.ts:144-145` |
| Cột Trình độ | senses | `displayed_level`, `conflict` | — | OK | `admin-catalog.queries.ts:143` |
| Cột Trạng thái | senses | `state` (`open`/`unpublished`/`retired`) + `status` của revision mới nhất + `live_revision_id` | — | OK | `admin-catalog.queries.ts:116-121`; `apps/api/src/content/senses/publish.service.ts:125,140` |
| Cột Bản sửa | senses | `revision` (số revision mới nhất) | — | OK | `admin-catalog.queries.ts:120` |
| Cột Thiếu (gloss / ví dụ / trình độ) | senses | `missing[]` gồm `gloss-missing`, `example-missing`, `level-missing` | — | DIFFERS: `missing` **chỉ có khi lọc `status=unpublishable`**; các bộ lọc khác bỏ trường này | `admin-catalog.queries.ts:157-158,247-249`; `publish.service.ts:31-35` |
| Hàng loạt [Đánh dấu đã review] | `POST /v1/admin/content/senses/review` | body `{items:[{sense_id, revision, action:'reviewed'}]}` tối đa 500; trả `items[] {sense_id, ok, reason?}`; `reason`: `not-found`, `sense-retired`, `stale-revision`, `revision-not-open` | `content.edit` | OK | `admin-senses.controller.ts:22-24,94-112`; `senses.service.ts:135-137` |
| Hàng loạt [Từ chối] | như trên | `action:'rejected'` | `content.edit` | OK | `admin-senses.controller.ts:23` |
| Hàng loạt [Publish] | `POST /v1/admin/content/senses/publish` | body `{items:[{sense_id, revision}]}`; quá `PUBLISH_MAX_ITEMS` (mặc định 500) → 400 `validation-failed`; trả `results[] {sense_id, outcome, reason?, violations?}`; `reason`: `sense-not-found`, `sense-retired`, `stale-revision`, `revision-rejected`, `publish-incomplete` (+`violations`) | `content.publish` | OK | `apps/api/src/content/senses/admin-publish.controller.ts:14,20,27-38,79-82`; `publish.service.ts:97-110`; `apps/api/src/common/config/app-config.ts:203` |
| Hàng loạt [Gỡ khỏi app] | `POST /v1/admin/content/senses/unpublish` | body `{sense_ids[]}`; trả `results[] {sense_id, ok, reason?}` (`sense-not-found`, `sense-retired`) | `content.publish` | OK | `admin-publish.controller.ts:15,40-46,85-87`; `publish.service.ts:131-148` |
| Hàng loạt [Ngừng dùng] | `POST /v1/admin/content/senses/retire` | như trên | `content.publish` | OK | `admin-publish.controller.ts:48-54` |
| Publish theo bộ lọc (không trong khung, có sẵn) | `POST /v1/admin/content/senses/publish-jobs` | client đã có `createPublishJob` | — | Ghi chú | `content-api.ts:122-124` |

## A/88b Chi tiết nghĩa

| Phần tử | Endpoint | Trường / mã lỗi | Quyền | Trạng thái | Bằng chứng `path:line` |
|---|---|---|---|---|---|
| Đọc chi tiết | `GET /v1/admin/content/senses/{id}` | như dòng của list + khối người thao tác; 404 `not-found` | `content.edit` | OK | `admin-catalog.controller.ts:46-49`; `admin-catalog.queries.ts:391-405` |
| "Review: email · thời điểm" | như trên | `reviewed_by: {id, email}`, `reviewed_at` | `content.edit` | OK — trả **EMAIL** (kèm id; `email` có thể `null` nếu không tìm thấy user) | `admin-catalog.queries.ts:395-401`; `apps/api/src/identity/profile/identity.service.ts:107-113` |
| "Publish: email" | như trên | `published_by: {id, email}`; **không có `published_at`** | `content.edit` | OK cho email; DIFFERS (nhỏ): `reviewed_by`/`published_by` lấy từ **revision mới nhất**, nên khi đã có bản nháp mới sau publish thì hai trường này là `null` (không phải người publish bản đang live) | `admin-catalog.queries.ts:394,400-402` |
| "Đổi trạng thái gần nhất: email · gỡ khỏi app · thời điểm" | như trên | `state_changed_by: {id, email}`, `state_changed_at`; **không có trường hành động** | `content.edit` | DIFFERS: hành động phải suy từ `state` hiện tại (`unpublished` = gỡ, `retired` = ngừng dùng, `open` = publish). Publish cũng ghi `state_changed_by` | `admin-catalog.queries.ts:403`; `publish.service.ts:115,125,140`; `apps/api/prisma/models/content.prisma:102-104` |
| Ghi chú "Chỉ lưu lần gần nhất" | — | đúng: một cột cho mỗi loại người thao tác | — | OK | `content.prisma:102-104` |
| Nghĩa tiếng Việt / Định nghĩa tiếng Anh | đọc: như trên; ghi: xem 2 nút | `content.gloss_vi`, `content.definition_en` (≤2.000 ký tự) | — | OK | `admin-catalog.queries.ts:144-145`; `apps/api/src/content/senses/content-body.ts:7,10-11` |
| Câu ví dụ (tối đa 3) | như trên | `content.examples_en[]` max `MAX_EXAMPLES` = 3; quá → 400 `validation-failed` / `too-many-examples` | — | OK | `content-body.ts:12`; `apps/api/src/content/content.constants.ts:22` |
| Chủ đề | như trên | `content.topics[]` (mã); lỗi `unknown-topic`, `topic-archived` (400); khi lưu từ bản có topic đã lưu trữ → `dropped_topics[]` | — | OK | `content-body.ts:12`; `senses.service.ts:42-43,103-111` |
| Dạng được chấp nhận | như trên | `content.accepted_forms[]` | — | OK | `content-body.ts:13` |
| [Lưu bản nháp] | `PUT /v1/admin/content/senses/{id}/draft` | body `{revision, content}` → `{sense_id, revision, dropped_topics}`; 409 `stale-revision`, 404 `not-found`, 400 `sense-retired` và mã nội dung | `content.edit` | OK | `admin-senses.controller.ts:21,29-36,79-92`; `senses.service.ts:94-97` |
| [Lưu và publish] | `POST /v1/admin/content/senses/{id}/quick-publish` | body `{revision, content}` → `{sense_id, revision, outcome:'published'|'already_published', dropped_topics}`; 422 `publish-incomplete` + `violations`, 409 `stale-revision` / `revision-rejected`, 404 `not-found` | `content.edit` **và** `content.publish` | OK | `admin-publish.controller.ts:17,56-77`; `publish.service.ts:17-19` |

## A/89 Chủ đề

| Phần tử | Endpoint | Trường / mã lỗi | Quyền | Trạng thái | Bằng chứng `path:line` |
|---|---|---|---|---|---|
| Danh sách | `GET /v1/admin/taxonomy/topics` | `{items: TopicView[]}`, sắp theo `code`, gồm cả chủ đề đã lưu trữ | `taxonomy.manage` (editor có) | OK; **không phân trang** (trả hết) | `topics.controller.ts:13-20`; `apps/api/src/content/taxonomy/topics.service.ts:74-77` |
| Cột Mã / Tên tiếng Việt / Tên tiếng Anh | như trên | `code`, `names.vi`, `names.en` (có thể thiếu) | — | OK | `topics.service.ts:8,16-21` |
| Cột Trạng thái (Đang dùng / Đã lưu trữ) | như trên | `archived_at` (`null` = đang dùng) | — | OK | `topics.service.ts:19` |
| [Thêm chủ đề] | `POST /v1/admin/taxonomy/topics` | body `{code: [a-z0-9-]+, names:{vi?, en?}}`; 409 `topic-exists` | `taxonomy.manage` | OK (lưu ý: `names.vi`/`names.en` đều không bắt buộc) | `topics.controller.ts:23-27`; `apps/api/src/content/taxonomy/topics.schemas.ts:3-9`; `topics.service.ts:44-46` |
| Sửa tên | `PATCH /v1/admin/taxonomy/topics/{code}` | body `{names:{vi?, en?}}`; 404 `not-found` | `taxonomy.manage` | OK | `topics.controller.ts:29-36`; `topics.schemas.ts:11-14`; `topics.service.ts:54,62-65` |
| Lưu trữ / Dùng lại | như trên | body `{archived: true|false}` | `taxonomy.manage` | OK | `topics.schemas.ts:13`; `topics.service.ts:59-61` |
| Không xóa | — | không có route DELETE | — | OK | `topics.controller.ts:13-37` |

## A/77 Dạng chia chưa biết, A/77b trống

| Phần tử | Endpoint | Trường / mã lỗi | Quyền | Trạng thái | Bằng chứng `path:line` |
|---|---|---|---|---|---|
| Danh sách, sắp theo số lần bị loại | `GET /v1/admin/practice/unknown-forms` | `items[]`, `next_page_token`; `page_size`/`page_token`; sắp `rejected_count` giảm dần | `content.edit` (editor có) | OK | `apps/api/src/practice/reports/admin-unknown-forms.controller.ts:8-10,13-20`; `apps/api/src/practice/reports/unknown-forms-admin.service.ts:31-36,45-46` |
| Cột Từ gốc | như trên | `lemma_key` | — | DIFFERS (nhỏ): là **khóa đã chuẩn hóa chữ thường** (không phải lemma hiển thị gốc) | `unknown-forms-admin.service.ts:42`; `apps/api/src/content/word-forms/word-forms.service.ts:12-15,23` |
| Cột Dạng AI dùng / Số lần bị loại / Lần đầu / Lần gần nhất | như trên | `form`, `rejected_count`, `first_seen_at`, `last_seen_at` | — | OK | `unknown-forms-admin.service.ts:42-43` |
| [Nhận dạng này] | `POST /v1/admin/content/word-forms` | body `{lemma, form}` (≤100 ký tự); **bắt buộc header `Idempotency-Key`** (thiếu → 400); 201 `{id, lemma_key, form}`; 409 `word-form-exists` | `content.edit` | OK. Sau khi nhận, dòng bị **ẩn** khỏi list (không xóa) | `apps/api/src/content/word-forms/admin-word-forms.controller.ts:14,19,23-38`; `apps/api/src/common/idempotency/idempotency.interceptor.ts:40`; `unknown-forms-admin.service.ts:38,41` |
| [Bỏ qua] | `DELETE /v1/admin/practice/unknown-forms/{id}` | 204; 404 `not-found` (xóa hẳn dòng) | `content.edit` | OK | `admin-unknown-forms.controller.ts:23-27`; `unknown-forms-admin.service.ts:51-54` |
| "Đã thêm “went” vào dạng chia của “go”" | dùng response của POST | `form`, `lemma_key` | — | OK | `admin-word-forms.controller.ts:31` |
| [Hoàn tác] | `DELETE /v1/admin/content/word-forms/{id}` | `id` từ response POST; 204; 404 `not-found`. Dòng unknown-form tự hiện lại vì list chỉ ẩn cặp đã biết | `content.edit` | OK | `admin-word-forms.controller.ts:15,40-45`; `word-forms.service.ts:32-34`; `unknown-forms-admin.service.ts:41` |
| Trống `A/77b` | GET list | `items: []` | — | DIFFERS (cạnh): một trang có thể ít dòng hơn `page_size`, **kể cả rỗng mà vẫn có `next_page_token`**, vì dòng đã nhận bị lọc sau khi lấy trang | `unknown-forms-admin.service.ts:15,37-46` |

## Thiếu / lệch

1. A/88 cột "Thiếu": `missing[]` chỉ trả khi lọc `status=unpublishable` (`admin-catalog.queries.ts:247-249`); muốn cột này ở mọi bộ lọc thì API phải thêm trường, hoặc màn chỉ hiện cột khi lọc "Thiếu nội dung".
2. A/88b "Đổi trạng thái gần nhất · gỡ khỏi app": API không trả hành động, chỉ `state_changed_by/at` + `state` hiện tại; publish cũng ghi trường này (`publish.service.ts:125`). Màn phải suy từ `state`.
3. A/88b `reviewed_by`/`published_by` là của revision **mới nhất**, không phải revision đang live (`admin-catalog.queries.ts:394`): có bản nháp mới thì hai dòng đó `null`. Không có `published_at`.
4. A/87 "Có nghĩa": `has_sense=true` tính cả sense `retired` (`admin-catalog.queries.ts:219`).
5. A/77 "Từ gốc" là `lemma_key` chữ thường đã chuẩn hóa, không phải lemma gốc (`unknown-forms-admin.service.ts:42`).
6. A/77b: trang rỗng có thể còn `next_page_token` (`unknown-forms-admin.service.ts:15,41-46`); màn trống phải xét cả token.
7. A/77 [Nhận dạng này] cần header `Idempotency-Key` (`admin-word-forms.controller.ts:25-26`).
8. A/89 list không phân trang (`topics.service.ts:74-77`); mọi list khác (entries, senses, unknown-forms, uploads) có `page_size`/`page_token`.
9. Admin client chưa có hàm nào cho các endpoint trên, trừ `listTopics` và `listUploads` (`content-api.ts:88-90,118-120`).
10. Đã có sẵn, khớp: "Trình độ lệch nhau" (`conflict`), "Lô nhập" (`batch_id`), "Dán danh sách từ" (`POST /entries/batch`, 500 dòng, `lemma,pos`), đủ 5 thao tác hàng loạt của A/88, email người thao tác ở A/88b, Hoàn tác của A/77. `editor` có mọi quyền cần cho các màn này (`identity.types.ts:14`).
