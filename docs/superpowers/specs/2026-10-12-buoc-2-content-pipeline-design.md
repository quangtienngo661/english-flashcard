# Design — Bước 2: Content + Pipeline (phía quản trị)

> **Trạng thái 12/10/2026:** bản nháp chờ chủ dự án duyệt. Chưa có code. Sau khi duyệt: `superpowers:writing-plans`.

Ngày: 12/10/2026 (brainstorm 11–12/10/2026). Phạm vi: Bước 2 trong `../../HANDOFF_2026-10-05_BUOC_0.md` §2, theo spec
[`module-spec-vocabulary-content.md`](../../specs/module-spec-vocabulary-content.md) (CR1–CR23) và
[`module-spec-content-pipeline.md`](../../specs/module-spec-content-pipeline.md) (PR1–PR18). Brainstorm qua
`superpowers:brainstorming`, hỏi từng câu trong chat. Nền: Bước 0 và Bước 1 đã merge vào `main`
(Prisma 7.10.0, `@nestjs/common` 12, Vitest + Testcontainers, guard xác thực toàn cục, `@RequirePermission`).
Quyết định và trade-off: [`../decisions/2026-10-12-buoc-2-content-pipeline-decisions.md`](../decisions/2026-10-12-buoc-2-content-pipeline-decisions.md).

**Nhãn:** **Chốt** = chủ dự án chọn trong phiên brainstorm. **Đề xuất** = trợ lý đề xuất; nếu chủ dự án đã nghe và không
phản đối thì ghi rõ, còn lại chờ duyệt cùng doc. **ASSUMPTION** = chưa kiểm chứng bằng chạy thật hoặc nguồn. **Chờ bạn** =
cần chủ dự án xác nhận (mục 17). Criteria và edge cases dùng số hiệu `B2#`/`B2E#` (theo
`docs/specs/SPEC_WRITING_CONVENTIONS.md`), trích ngược về `C#`/`CE#`/`CR#` (Content), `P#`/`PE#`/`PR#` (Pipeline),
`I#`, `S#`/`SR#`.

## 1. Mục tiêu và tiêu chí xong

Cho phép `admin`/`editor` đưa nội dung vào catalog **chỉ bằng API**: nhập file CEFR-J và Octanove, soạn nghĩa/ví dụ/chủ đề bằng
file CSV (hoặc từng thao tác API), rà, publish; và cho người học (đã đăng nhập) **tìm và duyệt chỉ-đọc** các sense đã
publish. Giao diện (đăng nhập web và trang admin) làm ngay sau Bước 2, không nằm trong doc này.

**Xong khi:**
1. Mọi tiêu chí `B2#` ở mục 13 có test e2e chạy trên Postgres + Redis thật bằng `pnpm test:e2e`, test cũ của Bước 0–1 vẫn xanh.
2. Chạy tay trên API thật (Postgres + Redis + Mailpit trong Docker, một tiến trình API và một tiến trình worker): đăng nhập bằng
   tài khoản `admin` → đăng ký nguồn CEFR-J 1.5 → upload file CEFR-J gốc (7.799 dòng) → thêm cột nội dung cho một nhóm nhỏ rồi
   upload → xem báo cáo, tải file dòng bị loại, sửa, upload lại → publish → gọi API tìm kiếm bằng tài khoản người học và thấy từ
   đó. Số liệu đo được ghi vào doc (B2#70, B2#71).

## 2. Quyết định đã chốt (11–12/10/2026)

| # | Quyết định | Nhãn | Lệch spec? |
|---|---|---|---|
| D1 | **Phạm vi:** quản trị (nhập nguồn, soạn, rà, publish, hoàn tác, xuất) **cộng** tìm kiếm, duyệt, xem sense chỉ-đọc cho người học. **Để Bước 3:** từ riêng tư, câu ngữ cảnh, chuỗi tra nghĩa, xóa lan sang Learning/Practice | Chốt | Lệch HANDOFF §2 (từ riêng tư rời Bước 2) |
| D2 | **Upload gộp:** một file có cột `headword,pos,CEFR` của nguồn **cộng** cột nội dung; một lần upload tạo entry, level và (nếu dòng có nội dung) sense nháp. Dòng không có nội dung chỉ tạo entry và level. Không có bước "xuất file mẫu" | Chốt | **Lệch** PR2 ("nhập nguồn không tạo sense") |
| D3 | **Pilot một nghĩa chính** mỗi (từ, loại từ); mô hình vẫn cho nhiều nghĩa (nhãn ngữ cảnh) | Chốt | Không (CR6, K10) |
| D4 | **Hai danh sách lỗi tách riêng:** (a) *dòng bị loại* (chưa vào DB): tải CSV có `_row`, `_error`, sửa rồi upload lại chính file đó; (b) *sense nháp chưa publish được* (đã vào DB): tải CSV có `sense_id`, `revision`, `_missing`, điền rồi upload lại | Chốt | Làm rõ PR10, PR15 |
| D5 | **Tự chuẩn hóa lỗi vô hại** (khoảng trắng, hoa/thường của loại từ và level); chỉ loại dòng khi giá trị thật sự sai. **Không** loại dòng vì thiếu ví dụ hay chủ đề (vào thành sense nháp, chặn lúc publish) | Chốt | Không (P11) |
| D6 | **Job nền: BullMQ + Redis** (không chuyển sang bảng job trong Postgres). Chờ bạn: BullMQ 6.3.12 có backend Postgres, xem mục 17 | Chốt (Redis); câu mở ở mục 17 | Không (giữ Constraint Pipeline) |
| D7 | **Tìm kiếm:** không phân biệt hoa thường, khớp đầu từ và chứa trên lemma và biến thể, thứ tự khớp đúng → đầu từ → chứa. **Revision:** sửa sense đã publish tạo revision nháp, nội dung chỉ đổi khi publish revision | Chốt | Không (CR11, CR17) |
| D8 | **Xuất để sửa gồm cả sense đã publish** (không chỉ bản nháp) | Chốt | **Lệch** PR15 ("xuất bản nháp được chọn") |
| D9 | **Bước 2 là API**; giao diện (đăng nhập web + trang admin) làm ngay sau Bước 2, trước Bước 3 | Chốt | Thêm một bước vào bảng 9 bước của HANDOFF §2 |
| D10 | **Một design, một plan, ba mốc** M1–M3 (mục 12), không tách thành hai bước độc lập | Đề xuất (chủ dự án nghiêng về không chia, chưa phản đối) | Không |
| D11 | **Phiên bản CEFR-J và nơi phát hành Octanove:** mặc định dùng bản trong repo (CEFR-J 1.5, Octanove 1.0) cho tới khi chủ dự án xác nhận có bản mới hơn hay không. Phiên bản nằm trong bản ghi nguồn nên đổi bản sau không phải sửa code | Chờ bạn (mục 17) | Không (PR1) |
| D12 | **Bảng quyền cho Bước 2:** `content.edit`, `content.publish`, `content.import`, `taxonomy.manage` gán cho cả `admin` và `editor` (bảng D6 của Bước 1); ánh xạ từng endpoint ở mục 10 | Chốt (bảng D6); ánh xạ endpoint: Đề xuất | Không |

Thư viện (đã kiểm `npm view` ngày 12/10/2026): `bullmq` 6.3.12, `@nestjs/bullmq` 12.0.0 (peer `bullmq ^6`, `@nestjs/core ^12`),
`ioredis` 6.0.0 (Node ≥ 20), `@testcontainers/redis` 12.2.0, `csv-parse` 7.0.3 (ESM), `@types/multer` 2.3.0. Việc chọn
`csv-parse` và `ioredis` là đề xuất; plan kiểm tương thích và chốt. Đọc code gói `bullmq` 6.3.12 (không phải tài liệu):
Worker bắt buộc `maxRetriesPerRequest: null` ở kết nối ioredis; Redis tối thiểu 5.0.0, khuyến nghị 6.2.0; cảnh báo nếu
`maxmemory-policy` khác `noeviction`; backoff có tùy chọn `jitter`.

## 3. Phạm vi: làm và để sau

| Làm ở Bước 2 | Để sau |
|---|---|
| Nguồn dữ liệu (CR18, PR1), chủ đề (CR9), entry/biến thể/level/cờ từ chức năng (CR1, CR8, CR10, CR20) | Từ riêng tư, giới hạn 1.000 từ, xóa từ riêng tư (CR13, CR23) → Bước 3 |
| Sense, revision, vòng đời, điều kiện publish, thay nghĩa, retire (CR4–CR7, CR17, CR19, CR22) | Câu ngữ cảnh (CR14) → Bước 3 cùng thêm nhanh |
| Upload gộp, job nền, báo cáo, hai danh sách lỗi, hoàn tác lô, xuất (PR2–PR17) | Chuỗi tra nghĩa, nguồn từ điển ngoài, AI (CR15) → Bước 3 (catalog + tự nhập), Bước 6–7 |
| Tìm kiếm, duyệt, xem sense chỉ-đọc cho người học (CR11, CR12, CR7) | Thông báo sense retired cho Learning, xóa lan (CR17 phần báo, CR21, CR23) → Bước 3–4, Bước 8 |
| Màn hình "Nguồn dữ liệu & giấy phép" ở dạng endpoint công khai (CR18) | Giao diện web: đăng nhập, trang admin → ngay sau Bước 2 |
| Quyền cho 4 nhóm thao tác content (D12) | Quyền `questions.moderate`, `entitlements.grant`, `ai.settings` → Bước 4–6 |

## 4. Cấu trúc module, dữ liệu và chỗ sửa Bước 0–1

```
apps/api/src/content/            ContentModule: catalog, chủ đề, nguồn, tìm kiếm/duyệt, ContentService (export cho module khác)
apps/api/src/content-pipeline/   PipelineModule: upload, batch, row processor, xuất CSV, producer BullMQ
apps/api/src/worker.ts           điểm vào tiến trình worker (Nest application context, không mở cổng HTTP)
apps/api/prisma/models/content.prisma    bảng của Content
apps/api/prisma/models/pipeline.prisma   bảng của Pipeline
```

Theo D3 của Bước 1: chỉ code của module truy vấn bảng của module; **không có relation Prisma xuyên module**
(tham chiếu chéo là cột uuid trơn, ví dụ `created_by`). Pipeline ghi vào catalog **chỉ qua `ContentService`**; mỗi thao tác
ghi của `ContentService` nhận một `tx` (Prisma transaction client) để Pipeline gói "ghi catalog + ghi khóa dòng + ghi kết quả
dòng" vào **một** giao dịch cho mỗi dòng (PR10). Content sở hữu luật (CR5, CR17, CR20), Pipeline sở hữu cách đọc file và
điều phối.

### Bảng của Content (đề xuất; đặt tên cột và kiểu cụ thể là việc của plan)

- **`topics`** (`code` PK, `[a-z0-9-]+`, `archived_at`) và **`topic_names`** (`topic_code`, `language`, tên). Khởi đầu (F13) nạp
  bằng migration: `technology`, `marketing`, `business`, `food`, `daily-life`, tên tiếng Việt do trợ lý đề xuất (Công nghệ, Tiếp
  thị, Kinh doanh, Ẩm thực, Đời sống), tiếng Anh theo mã.
- **`data_sources`**: `id`, `kind` (`third_party`/`owner`), `name`, `version`, `url`, `license`, `attribution`, `display_priority`
  (số nhỏ thắng khi chọn level hiển thị), `created_at`; `UNIQUE(name, version)`; không có thao tác sửa (đổi bản = thêm
  dòng mới). Một dòng `owner` có sẵn từ migration; nguồn `owner` không cần giấy phép (PR1) và là nguồn của level biên tập.
- **`entries`**: `id`, `language` (`en`), `lemma` (phân biệt hoa thường, đã cắt khoảng trắng, ≤ 100 ký tự), `pos`, `entry_type`
  (chỉ `word`, CR2), `function_word_derived`, `function_word_override` (null = không ghi đè), `created_at`, `updated_at`;
  `UNIQUE(language, lemma, pos)` (CR20). Cờ hiệu lực = `coalesce(override, derived)`, nên nhập lại không đè lên ghi đè của owner.
  Bước 2 chỉ có entry catalog; cột `scope`/`owner_user_id` cho từ riêng tư thêm ở Bước 3 (tránh cột chết).
- **`entry_variants`**: `entry_id`, `text`, `kind` (`spelling`/`alias`), `accepted_as_answer`; `UNIQUE(entry_id, text)`. Một
  biến thể có thể thuộc nhiều entry (CR1: chỉ dùng để tìm).
- **`entry_levels`**: `entry_id`, `level` (A1–C2), `source_id`, `basis` (`imported`/`editorial`), `source_extra` (jsonb: các cột phụ
  của file nguồn như `CoreInventory 1`, `Threshold`, `notes`, PR3), `created_at`; `UNIQUE(entry_id, source_id, level)`. **Dòng
  `imported` không bao giờ bị sửa** (CR8, P23); `basis` = `editorial` khi nguồn là `owner`. Không có cờ "cần rà": entry **có xung
  đột** khi các bản ghi level của nó có hơn một level khác nhau và chưa có bản ghi `editorial`.
- **`senses`**: `id` (uuid, **không bao giờ tái dùng**, SR2), `entry_id`, `context_label` (null = nghĩa chính; chuỗi rỗng/chỉ
  khoảng trắng chuẩn hóa thành null), `state` (`open`/`unpublished`/`retired`; `open` = chưa bị
  bỏ publish hay retire, **không** có nghĩa là đã publish), `live_revision_id` (null nếu chưa từng publish), `replaces_sense_id`
  (khi là sense thay nghĩa chưa publish), `created_at`. Người học chỉ thấy sense `open` **và** có `live_revision_id`. Bất biến:
  **tối đa một sense chưa retire và không chờ thay thế cho mỗi (entry, nhãn)**, và **tối đa một sense chờ thay thế cho mỗi sense**;
  plan chọn cách cài (chỉ mục duy nhất từng phần) và có test cho hai bất biến này. Sense chờ thay thế mà revision bị `rejected`
  thì chuyển `retired` (chưa từng publish), trả lại chỗ cho lần thay sau.
- **`sense_revisions`**: bản chụp bất biến của nội dung: `sense_id`, `revision_no` (tăng dần theo sense, bắt đầu từ 1),
  `status` (`draft`/`reviewed`/`published`/`superseded`/`rejected`), `draft_source` (`csv`/`ui`, PR17), `content_hash`,
  `created_by` (uuid trơn), `created_at`, `published_at`; nội dung gồm **text theo (ngôn ngữ, loại gloss/definition)** (V1: `vi`
  gloss bắt buộc để publish, `en` definition tùy chọn; thêm ngôn ngữ = thêm dòng, không thêm cột, SR3, CR7), danh sách ví dụ
  tiếng Anh, danh sách mã chủ đề, danh sách dạng được chấp nhận (CR22). Cách lưu danh sách (cột mảng hay bảng con) là việc của
  plan, miễn là duyệt theo chủ đề có chỉ mục. Mỗi sense có **tối đa một revision mở** (`draft`/`reviewed`) tại một thời điểm.

Mỗi lần lưu sửa tạo **revision mới**; revision mở cũ chuyển `superseded` trong cùng giao dịch. Vì vậy `revision` trong CSV là
`revision_no` của revision mới nhất, và "cũ hơn" nghĩa là nhỏ hơn số đó (PR15).

### Bảng của Pipeline

- **`import_batches`**: `id`, `status` (`queued`/`running`/`succeeded`/`partial`/`failed`/`reverted`), `level_source_id` (null nếu file
  không có cột level), `file_name`, `file_sha256`, `file_size`, `row_count`, bộ đếm (đã xử lý, entry tạo mới, level tạo mới,
  sense tạo mới, revision tạo mới, không đổi, bị loại), `attempts`, `lease_owner`, `lease_epoch`, `lease_expires_at`, `created_by`,
  `created_at`, `started_at`, `finished_at`, `operation_id`, tóm tắt lỗi.
- **`import_batch_files`**: `batch_id` PK, nội dung file (bytea). Worker đọc file từ đây (không nhét file vào job Redis).
  Xóa sau 30 ngày bằng `MaintenanceScheduler` (đề xuất); báo cáo và file dòng bị loại vẫn tải được vì lưu ở bảng kết quả dòng.
- **`import_row_outcomes`**: `batch_id`, `row_number`, `outcome` (`created`/`updated`/`unchanged`/`rejected`), `error_codes`,
  `raw` (jsonb, **chỉ** cho dòng bị loại, để dựng lại file sửa).
- **`import_row_keys`**: `(kind, source_id, row_key, content_hash)` duy nhất (PR9), kèm `batch_id`. `kind` = `level` (khóa là
  `(source, lemma, pos)`) hoặc `content` (khóa là `(owner, lemma, pos, nhãn hoặc sense_id)`); `content_hash` là băm nội dung đã
  chuẩn hóa.
- **`batch_records`**: `(batch_id, record_type, record_id)` các bản ghi lô đã **tạo**, để hoàn tác (PR16).

### Chỗ sửa code Bước 0–1 (liệt kê đủ để plan không bỏ sót)

1. **`RequirePermission`** nhận nhiều quyền (phải có tất cả); `Permission` thêm 4 quyền content; `ROLE_PERMISSIONS` cho
   `admin` và `editor` có đủ 4 quyền; `GET /v1/me` tự trả `permissions` mới.
2. **`IdempotencyInterceptor`** băm `JSON.stringify(request.body)`; với multipart, file không nằm trong `body`, nên hai file khác
   nhau cùng `Idempotency-Key` sẽ bị coi là một payload (phát lại kết quả cũ). Interceptor phải nhận băm payload do endpoint
   cung cấp (băm file + tham số). Có test B2#5.
3. **`page-token.util`**: con trỏ hiện chỉ có `{ id }`; tìm kiếm có xếp hạng cần con trỏ gồm (hạng, lemma, pos, id) và gắn với
   chữ ký của truy vấn; sai định dạng hoặc dùng cho truy vấn khác vẫn trả 400 (S3).
4. **Cấu hình:** thêm `REDIS_URL`, các giới hạn upload/job (mục 11), `RateLimitRuleName` thêm `content.upload`. `loadConfig` vẫn
   fail-fast theo zod.
5. **Hạ tầng:** thêm dịch vụ `redis` vào `docker-compose.yml` (Redis ≥ 6.2, `maxmemory-policy noeviction`); test e2e dùng
   `@testcontainers/redis` trong global setup (như Postgres), nên CI không cần thêm service.
6. **Upload:** `FileInterceptor` (multer, có trong `@nestjs/platform-express`) trên route upload với giới hạn 10 MB; thêm
   `@types/multer`. Plan kiểm multer đi cùng Nest 12.
7. **Tiến trình worker:** script `start:worker` và build chung; `createTestApp` có thêm cách chạy worker trong tiến trình test
   (mục 12).
8. **`AppModule`** import `ContentModule` và `PipelineModule`; `prisma.config.ts` đã trỏ thư mục `prisma/` nên thêm
   `content.prisma`, `pipeline.prisma` là đủ (plan vẫn kiểm client sinh ra có model mới, B1E31).

## 5. Upload gộp: định dạng và quy tắc dòng

**Request.** `POST /v1/admin/content/uploads` (multipart): `file` và `level_source_id` (bắt buộc khi file có cột level). Header
`Idempotency-Key` bắt buộc. Trả 202 với `batch_id`; việc xử lý chạy ở worker.

**Kiểm cả file trước khi xử lý (từ chối cả file, không tạo batch):** quá 20.000 dòng hoặc 10 MB; không phải UTF-8 hợp lệ (thông báo lỗi nói rõ: lưu lại bằng "CSV UTF-8" trong Excel, hoặc tải CSV từ
Google Sheets; không hỗ trợ bảng mã Windows hay `.xlsx`, đề xuất); thiếu
dòng tiêu đề; thiếu cột `pos` hoặc cả `headword` lẫn `lemma`; tiêu đề trùng sau khi chuẩn hóa; 0 dòng dữ liệu; có cột level mà thiếu
`level_source_id`; nguồn bên thứ ba thiếu phiên bản hoặc giấy phép (PR1). BOM UTF-8 và CRLF được chấp nhận (PE1). Ngưỡng
20.000/10 MB áp cho **mọi** file (PR14 tách 5.000 cho file soạn, nhưng file gộp có thể là cả file CEFR-J 7.799 dòng kèm
nội dung, nên dùng một ngưỡng; lệch PR14).

**Dấu phân cách.** Phát hiện từ dòng tiêu đề trong {`,`, `;`, tab}; nhập nhằng thì từ chối với thông báo rõ. Lý do: Excel ghi
CSV bằng dấu phân cách của hệ thống, và với thiết lập tiếng Việt thường là `;` (ASSUMPTION, chưa kiểm trên máy chủ dự án); Google
Sheets luôn dùng `,`. Ô theo chuẩn RFC 4180 (PE3).

**Cột.** Tiêu đề so khớp không phân biệt hoa thường, đã cắt khoảng trắng.

| Cột | Ghi chú |
|---|---|
| `headword` (hoặc `lemma`), `pos` | Bắt buộc. `headword` dạng `a/b/c`: `a` là lemma, các đoạn còn lại là biến thể chính tả (PR3) |
| `CEFR` (hoặc `level`) | Tùy chọn. Có cột này thì bắt buộc khai báo nguồn level. Nguồn `owner` → bản ghi `editorial`. **Ô trống = dòng không có level** (không phải lỗi), để chủ dự án thêm từ của mình vào file CEFR-J; sense của entry chưa có level vẫn vào nháp và bị chặn lúc publish |
| `gloss_vi`, `definition_en`, `example_en_1`…`example_en_3`, `topics`, `accepted_forms` | Nội dung của sense. `topics`, `accepted_forms` ngăn bởi `;` |
| `context_label`, `sense_id`, `revision`, `replace_meaning` | Chọn sense đích (PR5) |
| `CoreInventory 1`, `CoreInventory 2`, `Threshold`, `notes` | Bốn cột phụ của hai file nguồn: **giữ nguyên** vào `source_extra` của bản ghi level, không suy ra gì (PR3). Mọi cột lạ khác bị bỏ qua và cảnh báo |
| Cột bắt đầu bằng `_` (`_row`, `_error`, `_missing`, `_status`) | Bỏ qua im lặng, để file lỗi tải về upload lại được (D4) |

**Chuẩn hóa tự động (D5)** trước khi kiểm: cắt khoảng trắng đầu/cuối, gộp khoảng trắng liên tiếp, chuẩn Unicode NFC; `pos` về
chữ thường; level về chữ hoa; `topics` về chữ thường; bỏ trùng trong `topics` và `accepted_forms`, bỏ lemma khỏi
`accepted_forms` (PE9); ô đầu bằng tiền tố vô hiệu công thức thì gỡ tiền tố (mục 8). Tập loại từ hợp lệ là 15 giá trị của
CEFR-J 1.5 (`noun`, `verb`, `adjective`, `adverb`, `pronoun`, `preposition`, `determiner`, `conjunction`, `number`, `modal auxiliary`,
`be-verb`, `do-verb`, `have-verb`, `infinitive-to`, `interjection`; đã đếm trên file ngày 12/10/2026). Thêm loại từ = sửa hằng số.

**Mã lỗi của dòng** (mỗi dòng ghi **tất cả** lỗi của nó, kèm giá trị hợp lệ; một dòng có lỗi thì **cả dòng** bị loại, không nhận một nửa):

| Mã | Khi nào |
|---|---|
| `lemma-required`, `lemma-too-long` | Thiếu hoặc quá 100 ký tự |
| `invalid-pos` | Loại từ rỗng hoặc ngoài tập hợp lệ (ví dụ `nuon`, `vern`) |
| `invalid-level` | Level ngoài A1–C2 |
| `unknown-topic`, `topic-archived` | Mã chủ đề không tồn tại hoặc đã ẩn (P13) |
| `cell-too-long` | Ô quá 2.000 ký tự (PE10) |
| `revision-required`, `stale-revision`, `sense-not-found`, `sense-retired`, `sense-entry-mismatch` | Dòng có `sense_id` (PR5, PR15, PE7) |
| `open-draft-conflict` | Dòng không có `sense_id`, sense khớp có revision mở do sửa tay qua API (PE6; Chờ bạn) |
| `gloss-changed` | Khớp sense **đã từng publish**, `gloss_vi` đổi, không có `sense_id` và không `replace_meaning` (P25; Chờ bạn) |
| `duplicate-key-in-file` | Khóa nội dung trùng với một dòng trước trong cùng file (PE2) |

**Xử lý một dòng hợp lệ** (trong một giao dịch, dưới khóa advisory theo `(lemma, pos)` để UI và import không ghi chồng nhau):

1. **Entry:** tạo nếu chưa có (cờ từ chức năng suy từ loại từ, CR10); thêm biến thể mới; không bao giờ xóa biến thể.
2. **Level** (nếu có cột level): thêm bản ghi `(entry, nguồn, level)` nếu chưa có; không sửa bản ghi cũ. Cùng khóa nguồn mà khác
   level (Octanove có 21 khóa như vậy) → giữ cả hai (PR3).
3. **Nội dung** (nếu có ít nhất một ô trong `gloss_vi`, `definition_en`, `example_en_*`, `topics`, `accepted_forms`). Thứ tự kiểm
   **cố định**: chọn sense đích → **nội dung sau khi ghép giống revision mới nhất thì `unchanged` và dừng** → luật xung đột → ghi.
   Vì "không đổi" được kiểm trước luật xung đột, upload lại cùng file không bao giờ bị loại vì xung đột (B2#10).
   - Có `sense_id` → sense đó; `revision` phải bằng revision mới nhất (nhỏ hơn: `stale-revision`); nội dung đổi → revision mới.
   - Không có `sense_id` → sense **chưa retire và không chờ thay thế** theo (entry, `context_label`); riêng dòng có `replace_meaning=true`
     nhắm vào **sense chờ thay thế** của sense đó nếu đã có (sửa tiếp, không tạo thay thế thứ hai). **Không có** → tạo sense mới (nháp,
     revision 1; với `replace_meaning=true` là sense thay nghĩa).
   - **Luật xung đột** khi khớp theo khóa (Chờ bạn, mục 17): có revision mở do **sửa tay qua API** (`draft_source=ui`) → `open-draft-conflict`;
     revision mở do **CSV** tạo thì dòng ghi đè bằng revision mới (vòng sửa trong Excel trước khi publish). `gloss_vi` đổi mà sense **đã
     từng publish** (có `live_revision_id`) và không `replace_meaning` → `gloss-changed`; sense chưa từng publish thì sửa `gloss_vi` tự do.
   - Còn lại: tạo revision nháp mới (sense đang publish **không đổi** cho tới khi publish, PR8).
   - **Ô trống nghĩa là giữ nguyên** giá trị hiện có; ô danh sách (`topics`, `accepted_forms`, hoặc nhóm `example_en_*`) có giá trị
     thì **thay cả danh sách**. Muốn xóa giá trị thì sửa qua API từng sense. Mã chủ đề đã ẩn **không** được kế thừa sang revision mới
     (bỏ kèm cảnh báo), để sửa một sense cũ không bị kẹt ở điều kiện publish. (Đề xuất.)
4. **Khóa dòng (PR9)** ghi vào `import_row_keys`; khóa và băm đã có (worker chạy lại sau khi chết) → bỏ qua, ghi `unchanged`.
5. Ghi `import_row_outcomes` và, với bản ghi mới tạo, `batch_records`.

## 6. Vòng đời, revision, publish

- **Trạng thái:** revision `draft` → (tùy chọn) `reviewed` → `published`; `rejected` cho revision chủ động bỏ; `superseded` khi bị
  thay. Sense `open` (mặc định); `unpublished` (ẩn khỏi tìm kiếm và duyệt, giữ nội dung, publish lại được);
  `retired` (kết thúc, CR17). Chỉ sense `open` **và** có `live_revision_id` hiện với người học (CR4). Đánh dấu `reviewed` **không bắt
  buộc** trước khi publish (spec không nói bắt buộc; đề xuất).
- **Điều kiện publish (CR5):** `gloss_vi` không rỗng, ít nhất một ví dụ tiếng Anh, entry có ít nhất một level, revision có ít nhất
  một chủ đề (mã còn hoạt động). Thiếu thì từ chối và trả **danh sách mục thiếu** (`violations`); sense giữ nguyên.
- **Publish theo lô (PR7, P16):** yêu cầu là danh sách `{sense_id, revision}`; **từng mục độc lập**, kết quả trả theo từng mục
  (`published`/`already_published`/lý do từ chối). `revision` khác **revision mới nhất** của sense → từ chối mục đó (hai người sửa chồng
  nhau). Publish lại một mục đã publish đúng revision đó là thành công, không đổi gì (idempotent tự nhiên, không cần
  `Idempotency-Key`).
- **Publish nhanh (CR17):** lưu nội dung mới và publish trong một lời gọi, cần **cả** `content.edit` và `content.publish`, nguyên
  tử, vẫn kiểm đủ điều kiện publish.
- **Thay nghĩa:** tạo sense mới (`replaces_sense_id` trỏ sense cũ). Khi sense mới được publish, sense cũ chuyển `retired`
  **trong cùng giao dịch**.
- **Đánh dấu level biên tập (CR8):** thêm bản ghi `editorial` (nguồn `owner`). **Level hiển thị** của entry: bản ghi `editorial` mới
  nhất nếu có; nếu không thì bản ghi của nguồn có `display_priority` nhỏ nhất (CEFR-J 10, Octanove 20); nếu nguồn đó có nhiều
  level (Octanove C1 và C2) thì lấy level thấp nhất (đề xuất). Dòng `imported` không đổi.
- **Cờ từ chức năng (CR10):** ghi đè qua `taxonomy.manage`; tìm kiếm vẫn trả từ chức năng, kèm cờ; tham số duyệt
  `exclude_function_words=true` loại chúng ra (CR12).

## 7. Job nền: BullMQ, hợp đồng thuê, hoàn tác

- **Hàng đợi** `content-import`, job `{ batchId }`, **`jobId` = `batchId`**. Tiến trình API chỉ là **producer**; tiến trình
  `worker` là consumer (concurrency 1: một lần một job, PR13). Redis dùng kết nối ioredis; Worker bắt buộc
  `maxRetriesPerRequest: null`.
- **DB là chuẩn (PR12):** trạng thái batch, khóa dòng, kết quả dòng nằm ở Postgres. Redis chỉ là cơ chế chạy. Upload lưu batch
  `queued` **trước**, rồi mới thêm job; thêm job lỗi (Redis tạm sập) thì vẫn trả 202 và để bộ đối soát (reconciler) thêm lại.
- **Hợp đồng thuê (lease):** worker nhận batch bằng một câu `UPDATE ... WHERE (status='queued' OR (status='running' AND
  lease_expires_at < now))` tăng `lease_epoch`, đặt `lease_owner` và `lease_expires_at`; một bộ hẹn giờ gia hạn lease (nhịp tim).
  **Mỗi giao dịch dòng bắt đầu bằng kiểm `lease_epoch` còn khớp** (nếu không, hủy giao dịch): worker cũ vì thế **mất quyền ghi**
  ngay khi lease bị lấy (P28). Giờ lấy từ `Clock` để test tua đồng hồ.
- **Reconciler** trong tiến trình worker, chạy khi khởi động và mỗi 30 giây (ASSUMPTION): (a) batch `queued` quá vài giây mà
  Redis không có job tương ứng → thêm lại `jobId` = batch id; (b) batch `running` lease hết hạn → đặt `queued` (nếu `attempts` chưa tới 3,
  còn không thì `failed`) và thêm lại. Job được **xóa khỏi Redis khi xong hoặc lỗi** (`removeOnComplete`, `removeOnFail`), vì BullMQ bỏ
  qua lệnh thêm job trùng `jobId` khi job cũ còn lưu (hành vi cần plan kiểm); nếu job cũ còn ở trạng thái khác thì bộ đối soát xóa hoặc
  thử lại nó theo trạng thái thay vì chỉ thêm. Dù có chạy hai lần, khóa dòng ở DB chặn trùng (P9). **`import_batches.attempts` là bộ
  đếm chuẩn** (tăng mỗi lần nhận lease); `attempts` của BullMQ chỉ là cơ chế thử lại, và lượt cuối thất bại thì worker ghi `failed` vào DB.
- **Thử lại (PR11):** lỗi tạm của một dòng (mất kết nối, deadlock, serialization failure) thử lại **tối đa 3 lần** trong tiến trình
  với backoff mũ có jitter; hết lần thì lượt xử lý của job thất bại. Job thử lại **tối đa 3 lượt** (`attempts: 3`, backoff mũ có
  `jitter` của BullMQ) và **bỏ qua các dòng đã xong** nhờ khóa dòng. Hết lượt thì batch `failed` kèm báo cáo (số dòng đã xong); upload lại **cùng
  file** làm nốt phần còn lại. Lỗi kiểm dữ liệu **không** thử lại: dòng vào danh sách bị loại và job chạy tiếp.
- **Trạng thái cuối:** mọi dòng xử lý xong và không dòng nào bị loại → `succeeded`; có dòng bị loại → `partial`; không xử lý hết sau
  các lượt thử → `failed`. `đã xử lý = tạo mới + không đổi + bị loại` (cộng `cập nhật` nếu có).
- **Hoàn tác lô (PR16):** `POST .../uploads/{id}/revert`, `Idempotency-Key` bắt buộc; chỉ khi batch không đang `queued`/`running`
  và chưa `reverted`. `batch_records` ghi mọi bản ghi lô **tạo** (entry, biến thể, level, sense, revision) và với mỗi revision lô tạo thì ghi luôn revision
  mở mà nó đã thay (`superseded`). Pipeline đưa danh sách cho `ContentService`; Content áp dụng:
  - **Revision lô tạo**: xóa nếu chưa từng publish **và** vẫn là revision mới nhất của sense; khi đó revision mở bị nó thay (nếu có) được
    **trả lại** trạng thái cũ (`draft`/`reviewed`). Revision đã bị sửa tiếp sau đó hoặc đã publish thì giữ, báo lý do.
  - **Sense lô tạo**: xóa khi sense chưa từng publish và mọi revision của nó đã bị xóa ở bước trên; ngược lại giữ, báo "sửa sau khi nhập".
  - **Level lô tạo**: xóa, **trừ** khi entry có sense đã publish và level đó là level duy nhất của entry (giữ để không vi phạm CR5).
  - **Biến thể lô thêm**: xóa. **Entry lô tạo**: xóa khi không còn sense, level hay biến thể nào.
  Xóa luôn khóa dòng của lô để upload lại tạo lại được (P26). Trả báo cáo bản ghi bị bỏ qua và lý do. Batch chuyển `reverted`.
- **Quan sát (PR18):** log mỗi batch mang `operation_id`, số liệu, thời gian; cảnh báo (log `warn`) khi batch `failed`, `partial`, hoặc
  `running` quá hạn thuê. Kênh cảnh báo ngoài log là của Bước sau.

## 8. Xuất, sửa, hai danh sách

- **Xuất (D8):** `GET /v1/admin/content/senses/export` phát CSV **trực tiếp (stream)**, không qua job (đề xuất; lệch PR10 "xuất
  chạy như job"): tối đa 5.000 dòng, vượt thì 400 `export-too-large` kèm hướng dẫn thu hẹp bộ lọc. Bộ lọc: `sense_id` (nhiều),
  `status` (`unpublishable`, `open_draft`, `published`), `level`, `pos`, `topic`. Mỗi dòng là một sense với nội dung của
  **revision mới nhất**: các cột của mục 5 **trừ cột level** (level của file xuất nằm ở `_level`, chỉ để xem, upload bỏ qua; nên upload
  lại file xuất không cần khai báo nguồn level và không gắn nhầm nguồn), cộng `sense_id`, `revision`, `_status`; bộ lọc `unpublishable`
  thêm `_missing`. Đặt level biên tập dùng API từng entry hoặc một file riêng khai báo nguồn `owner`.
- **Chống chèn công thức (PR15, P22):** ô bắt đầu bằng `=`, `+`, `-`, `@` được thêm tiền tố `'` khi xuất; khi nhập, nếu ô bắt đầu
  bằng `'` rồi đến một trong bốn ký tự đó thì gỡ `'` **trước khi băm và so sánh**, nên xuất rồi nhập lại không đổi nội dung. Hệ
  quả chấp nhận: một nội dung thật sự bắt đầu bằng `'=` sẽ mất dấu `'` khi qua vòng xuất-nhập (ASSUMPTION).
- **Danh sách (a) dòng bị loại:** `GET .../uploads/{id}/rejected.csv` = các cột của **file gốc** theo đúng thứ tự cộng `_row`
  (số dòng trong file gốc) và `_error` (mọi mã và thông báo tiếng Việt, kèm giá trị hợp lệ). Sửa ô sai rồi **upload lại file đó** (chỉ
  gồm các dòng bị loại). Upload lại cả file gốc đã sửa cũng được: các dòng đã xong lần trước hiện `unchanged`.
- **Danh sách (b) sense chưa publish được:** xuất với `status=unpublishable`; điền xong upload lại, hệ thống tạo revision nháp mới
  (cần `sense_id` và `revision` có sẵn trong file).

## 9. Tìm kiếm, duyệt, hiển thị (người học)

Mọi endpoint ở mục này cần đăng nhập (người học, kể cả email chưa xác minh, K7) và **đã chọn `native_language`** (qua
`IdentityService.getProfile`); chưa chọn thì 403 `profile-incomplete` (I22). Chỉ sense `open` có `live_revision_id` được trả.

- **Tìm kiếm** `GET /v1/senses/search?q=`: `q` đã cắt khoảng trắng, NFC, chữ thường, 1–100 ký tự (rỗng hoặc dài hơn: 400). Khớp **đầu từ**
  hoặc **chứa** trên lemma **và** mọi biến thể, không stemming hay fuzzy (CR11). `%`, `_`, `\` trong `q` là ký tự thường (phải thoát).
  Thứ tự: khớp đúng toàn bộ → khớp đầu từ → khớp chứa; trong mỗi nhóm theo lemma, loại từ, id (ổn định, phân trang bằng con
  trỏ ở mục 4). `analyse` tìm ra entry `analyze/analyse`. Cách tạo chỉ mục là việc của plan (~9.800 entry khi nhập cả hai nguồn nên quét
  tuần tự vẫn nhỏ; plan đo trước khi thêm chỉ mục; ASSUMPTION).
- **Duyệt** `GET /v1/senses`: lọc theo `level` (level hiển thị), `topic`, `pos`; mặc định **gồm** từ chức năng kèm cờ; `exclude_function_words=true`
  loại chúng (CR12); thứ tự lemma rồi loại từ.
- **Xem một sense** `GET /v1/senses/{id}`; sense không hiện với người học hoặc không tồn tại → 404.
- **Chủ đề** `GET /v1/topics` (mã và tên theo ngôn ngữ người học). **Nguồn và giấy phép** `GET /v1/sources` **công khai** (`@Public()`):
  tên, phiên bản, URL, giấy phép, ghi nhận (CR18, SR15).
- **Mỗi kết quả:** `sense_id`, `entry_id`, lemma, loại từ, level hiển thị, cờ từ chức năng, nhãn ngữ cảnh, nghĩa **theo CR7**
  (tiếng mẹ đẻ nếu có; không thì định nghĩa tiếng Anh; không thì nghĩa tiếng Việt kèm `translation_missing: true`), định nghĩa tiếng Anh,
  ví dụ, chủ đề (mã và tên). Không trả dạng được chấp nhận (thuộc Practice sau này, PRC22).

## 10. API và phân quyền

Đường dẫn là đề xuất; plan chốt. Mọi route dưới `/v1/admin/` **phải** khai báo quyền (B2#66). Người học (không có vai trò) không có
quyền nào; endpoint của người học dùng xác thực và quyền sở hữu, không dùng bảng quyền.

| Endpoint (đề xuất) | Quyền |
|---|---|
| `POST/GET /v1/admin/content/sources` | `content.import` |
| `POST /v1/admin/content/uploads`, `GET .../uploads`, `GET .../uploads/{id}`, `GET .../uploads/{id}/rejected.csv` | `content.import` **và** `content.edit` (một file gộp có thể ghi cả hai phần) cho `POST`; các `GET`: `content.import` |
| `POST /v1/admin/content/uploads/{id}/revert` | `content.import` |
| `GET /v1/admin/content/entries`, `GET .../senses`, `GET .../senses/{id}`, `GET .../senses/export` | `content.edit` |
| `POST .../entries/batch` (dán `lemma,pos`, PR6), `POST .../senses` (thêm nghĩa), `PUT .../senses/{id}/draft` (tạo revision), `PUT .../entries/{id}/variants`, `PUT .../entries/{id}/levels/editorial` | `content.edit` |
| `POST .../senses/review` (đánh dấu `reviewed`/`rejected`) | `content.edit` |
| `POST .../senses/publish`, `/unpublish`, `/retire` | `content.publish` |
| `PUT .../senses/{id}/draft?publish=true` (publish nhanh) | `content.edit` **và** `content.publish` |
| `POST/PATCH /v1/admin/taxonomy/topics`, `PUT .../entries/{id}/function-word` | `taxonomy.manage` |
| `GET /v1/senses/search`, `GET /v1/senses`, `GET /v1/senses/{id}`, `GET /v1/topics` | Đăng nhập + đã chọn tiếng mẹ đẻ |
| `GET /v1/sources` | Công khai |

`Idempotency-Key` **bắt buộc** (cơ chế Bước 0) cho `POST .../uploads` và `POST .../uploads/{id}/revert`; các thao tác còn lại
idempotent tự nhiên (trạng thái hoặc kiểm `revision`). Giới hạn tần suất: `user.write` có sẵn cho mọi route ghi; thêm luật
`content.upload` (đề xuất 10 lần/giờ/người dùng, ASSUMPTION).

**Bất biến cho các bước sau:** mọi truy vấn của endpoint quản trị phải **giới hạn ở catalog**. Khi Bước 3 thêm từ riêng tư vào
`entries`, nhân sự **không** được thấy hay sửa chúng bằng quyền content (CR3, S6).

## 11. Lỗi, log, cấu hình

- Lỗi `application/problem+json` như Bước 0–1. `type` mới: `source-incomplete`, `level-source-required`, `file-invalid`,
  `file-too-large`, `publish-incomplete` (kèm `violations`), `stale-revision`, `export-too-large`, `batch-not-revertable`,
  `profile-incomplete`. Lỗi của từng dòng không phải HTTP lỗi mà nằm trong báo cáo batch (mục 5).
- Log: `AppLogger` có sẵn; log batch mang `operation_id`, số liệu và thời gian; **không** log nội dung ô của file (có thể chứa
  chuỗi giống chỉ thị; mọi giá trị trong file là dữ liệu, không bao giờ được thi hành hay dịch).
- Cấu hình mới (ASSUMPTION, đều cấu hình được): `REDIS_URL`; `IMPORT_MAX_ROWS` 20.000; `IMPORT_MAX_BYTES` 10 MB; `EXPORT_MAX_ROWS`
  5.000; `IMPORT_LEASE_SECONDS` 60, nhịp tim 20 giây; `IMPORT_RECONCILE_SECONDS` 30; thử lại dòng 3 lần, job 3 lượt; giữ file
  upload 30 ngày.
- Tiến trình worker dùng chung `loadConfig` nên cần đủ biến môi trường như API (kể cả `JWT_KEYS`, SMTP); tách cấu hình riêng cho
  worker là việc có thể làm sau, không cần ở Bước 2.

## 12. Ba mốc và kiểm thử

| Mốc | Gồm | Merge được vì |
|---|---|---|
| **M1 Content lõi** | Bảng Content, nguồn, chủ đề, entry/level/biến thể, sense/revision, vòng đời + publish, API quản trị từng thao tác, tìm kiếm/duyệt/xem chỉ-đọc, 4 quyền + test phân quyền | Soạn và publish được bằng API từng thao tác; người học thấy kết quả |
| **M2 Pipeline** | Redis + BullMQ + worker, bảng Pipeline, upload gộp, row processor, báo cáo, danh sách (a), lease + reconciler | Nhập được file thật |
| **M3 Hoàn thiện** | Hoàn tác lô, xuất (cả sense đã publish), danh sách (b), đo thời gian nhập, chạy tay trọn luồng | Xong Bước 2 |

**Kiểm thử.** Giữ nguyên nguyên tắc Bước 0–1: Postgres thật bằng Testcontainers, không mock; thêm **Redis thật** (`@testcontainers/redis`). Worker
chạy **trong tiến trình test** (cùng module) để có điều khiển; một test e2e chạy bằng tiến trình `worker` riêng để kiểm điểm vào. Suite phụ thuộc
trạng thái chung (lease, reconciler, BullMQ) dùng `createIsolatedDatabase()` và hàng đợi có tên riêng. Dùng `FakeClock` cho lease. Dữ liệu thật:
test nhập đúng hai file CSV trong `docs/preparation/evidence/wordlists_2026-10-02/` và đối chiếu số liệu ở B2#70. Ma trận phân quyền: mỗi
endpoint quản trị × {chưa đăng nhập, người học, nhân sự thiếu đúng quyền đó (vai trò giả trong test), `editor`, `admin`, phiên đã thu hồi};
**test tự duyệt danh sách route** và thất bại nếu có route `/v1/admin/` thiếu `@RequirePermission` (B2#66).
Đo và ghi vào doc: thời gian, số giao dịch và bộ nhớ khi nhập 7.799 dòng CEFR-J (Pipeline Defense Analysis đã hứa); không đặt ngưỡng
trước khi có số đo.

## 13. Acceptance criteria — «When … then …»

| # | Criterion | Cites |
|---|---|---|
| B2#1 | When an upload names a third-party level source whose version or license is empty, then the request is refused with 400 `source-incomplete` before the file is read, and no batch exists | P1, PR1 |
| B2#2 | When the file has a level column and no `level_source_id` is sent, then the request is refused with 400 `level-source-required` and nothing is stored | PR1 |
| B2#3 | When a file exceeds 20,000 rows or 10 MB, is not valid UTF-8, has no header, lacks `pos` or both `headword` and `lemma`, has duplicate headers after normalization, or has no data row, then the request is refused with 400/413 `file-invalid` or `file-too-large` and no batch is created; a UTF-8 BOM and CRLF line ends are accepted | P20, PR14, PE1 |
| B2#4 | When a valid upload is accepted, then one `queued` batch with the file bytes and its SHA-256 is stored, a BullMQ job whose `jobId` is the batch id is added, and the response is 202 with `batch_id`; when the queue is unreachable the batch stays `queued` and the response is still 202 | PR10, PR12 |
| B2#5 | When the same `Idempotency-Key` is sent with the same file and parameters, then the first batch is returned and no second batch exists; when it is sent with a different file or `level_source_id`, then 400 and nothing is stored | S4, S5, SR8 |
| B2#6 | When the header uses `;` or tab as separator, then it is detected and the file is read; when the header line is ambiguous, then the file is refused with a message naming the separators found | PE3 (`ASSUMPTION`) |
| B2#7 | When the CEFR-J row `analyze/analyse,verb,B1` is imported with source CEFR-J 1.5, then one entry (lemma `analyze`, pos `verb`) with the accepted spelling variant `analyse`, one `imported` level record B1 naming that source and version, and a derived function-word flag of false exist, no sense exists, and a learner search for `analyze` returns nothing | P2, C20, R6 |
| B2#8 | When the file contains `March,noun,A1` and `march,noun,B1`, then two distinct entries are created and neither overwrites the other | P4, CE1 |
| B2#9 | When a row's part of speech is `preposition`, then its entry is flagged as a function word; when it is `noun`, it is not; `in` as preposition and `in` as adverb are two entries flagged independently | P7, CE2, CR10 |
| B2#10 | When the same file is uploaded again, including after its first upload left open draft revisions, then no entry, level, sense or revision is created and the report shows every row as `unchanged`, never as a conflict | P3, PR9 |
| B2#11 | When a row has an empty or unknown part of speech (such as `batter` with none, or `remonstrate` with `vern`) or a level outside A1–C2, then only that row is rejected, its report line gives the row number and every error with the valid values, and the other rows are processed | P5, CE4, PR3 |
| B2#12 | When a cell differs from a valid value only by surrounding or repeated whitespace, letter case of the part of speech or level (`Noun`, `b1`), or Unicode normalization form, then it is normalized and the row is accepted | D5 |
| B2#13 | When a headword has a trailing space, has several words, or contains apostrophes (`turn to `, `according to`, `o'clock`, `'re`), then it is accepted as a `word` entry with whitespace trimmed and no phrasal-verb behaviour | PE8, CE3, CE7 |
| B2#14 | When the same (headword, pos) appears twice in one source file with the same level, then one level record exists; with levels C1 and C2, then both level records exist and the entry is reported as conflicting | P27, PR3 |
| B2#15 | When the same (lemma, pos) comes from CEFR-J and Octanove with different levels, then both level records are kept, the displayed level is the CEFR-J one, and the entry is reported as conflicting until an editorial level is added | P6, C18, PR4 |
| B2#16 | When a row has a level but no content cell, then the entry and level record are created and no sense exists; when a file with a level column has a row whose level cell is empty, then that row creates no level record and is not rejected | D2 |
| B2#17 | When a row has content cells and names a lemma and part of speech that have no sense (new entry, or an entry from an earlier import), then one sense with a draft revision 1 holding the given fields is created even if it cannot yet be published | P11, K1 |
| B2#18 | When a row matches a published sense by (entry, context label) without `sense_id` and without changing `gloss_vi`, then a draft revision is created, the live content is unchanged, and it changes only when that revision is published | P12, PR8, CR17 |
| B2#19 | When a row matches a sense that has been published by key without `sense_id` and changes `gloss_vi` without `replace_meaning`, then the row is rejected with `gloss-changed` and nothing is written; for a sense never published, the gloss change creates a draft revision | P25, PR5 (Chờ bạn) |
| B2#20 | When a row for `bank`, noun carries a context label that no sense has and no `sense_id`, then a second sense is created for the same entry and the published sense is untouched | P24, CR6 |
| B2#21 | When a row has `replace_meaning=true`, then a new draft sense is created with a link to the matched sense, a later such row edits that waiting sense instead of creating a second one, and when the new sense is published the old sense becomes `retired` in the same transaction | CR17, C11 |
| B2#22 | When a row names a topic code that does not exist or is archived, then that row is rejected with `unknown-topic` or `topic-archived` | P13, CR9 |
| B2#23 | When a row has `sense_id` but no `revision`, or a `revision` older than the sense's latest, or names a retired sense, or a sense of a different lemma or part of speech, then it is rejected with `revision-required`, `stale-revision`, `sense-retired` or `sense-entry-mismatch` | P14, PR15, PE7 |
| B2#24 | When a row has no `sense_id` and the matching sense has an open revision created through the API, then the row is rejected with `open-draft-conflict` and that revision is unchanged; when the open revision was created by a CSV upload, then the row creates a newer draft revision | PE6, PR5 (Chờ bạn) |
| B2#25 | When two rows of one file share a content key, then the first is applied and the later one is rejected with `duplicate-key-in-file` | PE2 |
| B2#26 | When a content cell is blank on a row that updates an existing sense, then the existing value is kept; when a list cell (`topics`, `accepted_forms`, or any `example_en_*`) has a value, then the whole list is replaced by the given values | PR5 (`ASSUMPTION`) |
| B2#27 | When a cell is longer than 2,000 characters, then the row is rejected with `cell-too-long` | PE10 |
| B2#28 | When a column is unknown, then it is ignored with a warning; when its name starts with `_`, then it is ignored silently, so a downloaded rejected-rows file can be uploaded again | PR5, D4 |
| B2#29 | When `accepted_forms` contains the lemma itself or a repeated form, then duplicates and the lemma are removed before storing | PE9, CR22 |
| B2#30 | When a source row has extra columns (`CoreInventory 1`, `Threshold`, `notes`), then their values are stored unchanged with the level record and nothing is derived from them | PR3, R46 |
| B2#31 | When a row is rejected, then none of its parts (entry, level, sense) is written | D4 |
| B2#32 | When a batch finishes, then its status is `succeeded` when no row was rejected, `partial` when some were, `failed` when rows were left unprocessed after all attempts, and processed = created + updated + unchanged + rejected | P19, PR10 |
| B2#33 | When the owner opens a finished batch, then its status, counts and a downloadable rejected-rows CSV are shown, and the CSV holds the original columns of every rejected row plus `_row` and `_error`, and stays available after the stored file is purged | P19, D4 |
| B2#34 | When a transient database failure hits a row, then it is retried at most 3 times with exponential backoff and jitter; if it still fails, the job attempt fails, the job is retried up to 3 attempts skipping finished rows, and after the last attempt the batch is `failed` with the counts so far | P10, PR11, F24 |
| B2#35 | When the worker dies in the middle of a batch and the batch runs again, then rows already applied are skipped and no entry, level or sense is duplicated | P8, R35 |
| B2#36 | When the same job is enqueued twice, or the queue has forgotten a finished job and it is enqueued again, then each row is still applied once | P9, R32 |
| B2#37 | When a worker stops sending its heartbeat, then another worker takes the batch only after the lease expires, and the first worker's next row transaction is cancelled because its `lease_epoch` no longer matches | P28, PE5, PR12 |
| B2#38 | When Redis loses its data while a batch is `queued` or `running`, then the reconciler adds the job again from the database and the batch finishes without duplicates | PE4, PR12 |
| B2#39 | When a second upload for the same level source is accepted while a batch for that source is running, then it waits and starts after the first | P21, PR13 |
| B2#40 | When a batch is reverted, then the unpublished records it created are deleted together with its row keys, entries or levels still used by another batch are kept, published records are untouched, a level that is the only level of an entry with a published sense is kept, and the report lists what was skipped and why | P18, PR16, CR5 |
| B2#40a | When a reverted batch had replaced an open draft revision with its own revision, and that batch revision is still the latest and unpublished, then the batch revision is deleted and the replaced revision returns to its earlier status | PR16 (`ASSUMPTION`) |
| B2#41 | When a reverted file is uploaded again, then its entries and level records are created again | P26 |
| B2#42 | When a revert is requested for a batch that is `queued`, `running` or already `reverted`, then it is refused with 409 `batch-not-revertable` | PR16 |
| B2#43 | When a sense whose entry has a level, and whose revision has a Vietnamese gloss, at least one English example and a topic, is published, then it is visible in learner search and browse | C1, CR5 |
| B2#44 | When a publish request names a sense that lacks any of those four items, then it is refused with the list of missing items and the sense stays unpublished | C2, CR5 |
| B2#45 | When ten selected senses are published and three lack a required item, then seven are published and three are refused with their reasons, each item independently | P16, PR7 |
| B2#46 | When a publish item names a `revision` that is not the sense's latest revision, then that item alone is refused as stale; an unpublished sense with no open revision is published again by naming its latest revision | PR15, Content Defense Analysis |
| B2#47 | When a revision is published directly from `draft` without being marked `reviewed`, then it is accepted | CR4 (`ASSUMPTION`) |
| B2#48 | When a published sense is edited through the API, then a draft revision with the next number and the same sense id is created, the live content does not change, and the previous open revision becomes `superseded`; when a quick publish is requested, then edit and publish happen atomically and both `content.edit` and `content.publish` are required | C11, CR17 |
| B2#49 | When a sense is unpublished or retired, then it no longer appears in learner search, browse or detail, and an unpublished sense can be published again | C3, CR17 |
| B2#50 | When the owner adds an editorial level to an entry, then the imported level rows are unchanged, the editorial record names the owner source and basis, and the displayed level becomes the editorial one | C19, P23 |
| B2#51 | When the function-word override of an entry is set, then browse with `exclude_function_words=true` follows the new value and default browse still returns the entry with its flag | C4, C6, CR12 |
| B2#52 | When the owner pastes five lines of lemma and part of speech, then for each line an entry and an empty draft sense are created as needed, a word that already has a sense is reported with its link and not duplicated, and a lemma that differs from an existing one only by letter case gets a warning | P15, PR6 |
| B2#53 | When selected senses, including published ones, are exported and the file is uploaded unchanged, then no level source is needed and every row is `unchanged` | PR15, D8 |
| B2#54 | When an exported cell starts with `=`, `+`, `-` or `@`, then it is prefixed so a spreadsheet does not run it, and on upload the prefix is removed before comparison so the round trip changes no content | P22, PR15 |
| B2#55 | When a row of the export carries a `revision` older than the sense's latest when uploaded again, then it is rejected as a conflict; when an export would exceed 5,000 rows, then it is refused with 400 `export-too-large` | P14, PR15 |
| B2#56 | When senses that cannot yet be published are exported with `status=unpublishable`, then each row has `_missing` naming the missing items together with `sense_id` and `revision`, and uploading the filled file creates draft revisions | D4 |
| B2#57 | When a learner searches `analyse`, then the entry whose headword is `analyze/analyse` is found; search is case-insensitive on lemma and variants, and `%`, `_` and `\` in the query match only themselves | C20, CR11 |
| B2#58 | When a learner searches, then exact matches come first, then prefix matches, then contains matches, each group ordered by lemma, part of speech and id | D7 |
| B2#59 | When a learner searches or browses, then no sense in `draft`, `reviewed`, `rejected`, `unpublished` or `retired` state and no entry without a published sense is returned | C3, CR4 |
| B2#60 | When a learner browses by level, topic or part of speech, then only matching published senses return in a stable order, function-word entries are included and flagged by default, and `exclude_function_words=true` removes them | C4, CR12 |
| B2#61 | When a result is shown to a learner whose native language is not Vietnamese, then the text is that language if present, else the English definition if present, else the Vietnamese gloss with `translation_missing: true` | C21, CR7 |
| B2#62 | When a list endpoint gets `page_size` and `page_token`, then it returns at most that many items (default 20, maximum 100) and a `next_page_token`; a malformed token, or a token made for another query, returns 400 | S2, S3 |
| B2#63 | When a learner with no `native_language` calls a learner content endpoint, then 403 `profile-incomplete`; when the call carries no valid token, then 401 | I22 |
| B2#64 | When `GET /v1/sources` is called without a token, then it returns each source's name, version, URL, license and attribution | CR18, SR15 |
| B2#65 | When a learner, or a staff member who lacks the endpoint's permission, or a holder of a revoked session calls a staff endpoint, then it is refused with 403 (401 when there is no valid token) whatever the token claims, a revoked session included because the permission guard checks the session chain; `editor` and `admin` pass every content endpoint of section 10 | P17, I21, S7 |
| B2#66 | When the route table is inspected, then every route under `/v1/admin/` declares a permission, and the test fails naming any that does not | S7, D12 |
| B2#67 | When `admin` or `editor` calls `GET /v1/me`, then `permissions` contains `content.edit`, `content.publish`, `content.import` and `taxonomy.manage` | Bước 1 mục 6 |
| B2#68 | When any batch runs, then its log lines carry `operation_id`, the counts and the duration, and never a cell value | PR18, S13 |
| B2#69 | When a staff endpoint lists or reads entries and senses, then only catalog data is returned | CR3, S6 |
| B2#70 | When the real CEFR-J 1.5 file and then the Octanove 1.0 file are imported, then there are 9,776 entries, 9,894 level records (7,799 CEFR-J and 2,095 Octanove), 279 function-word entries, 117 entries with more than one distinct level, 207 entries carrying 215 spelling variants, and exactly 2 rejected rows (Octanove file lines 606 `batter`, 2129 `remonstrate`) | P2–P7, R1–R8 (counts measured 12/10/2026 with a script over the repository files) |
| B2#71 | When the 7,799-row CEFR-J file is imported on a development machine, then its duration, transaction count and peak memory are recorded in this document | Pipeline Defense Analysis (planned measurement) |

## 14. Edge cases

| # | Edge case | Expected | Cites |
|---|---|---|---|
| B2E1 | Excel saves the file with `;` separators (Vietnamese regional settings) | Detected from the header; a header with both `,` and `;` in a way that cannot be resolved is refused with a clear message | PE3 (`ASSUMPTION`) |
| B2E2 | A cell contains commas, quotes or line breaks | Read per RFC 4180 and stored unchanged | PE3 |
| B2E3 | Real headwords `a.m./A.M./am/AM`, `driver's license/driving licence`, `'m`, `'s`, `o'clock` | Split only at `/`; the first segment is the lemma and the others are spelling variants; apostrophes and dots are kept; empty segments are ignored | R4, PR3 |
| B2E4 | A variant equals the lemma ignoring case (`A.M.` for `a.m.`) | Stored as a separate variant; search finds one entry once | CR1 (`ASSUMPTION`) |
| B2E5 | One variant string belongs to two entries | Allowed; it is used for search only and never as an accepted answer unless flagged | CR1 |
| B2E6 | The same unchanged file is uploaded after the owner edited the sense in the API | Rows match key and hash and report `unchanged`; live content is not touched. To push changes the owner uses an exported file with `revision` | PR9 |
| B2E7 | A row has valid content but an invalid level | The whole row is rejected: no entry, no level, no sense; the report names the single error once | D4 |
| B2E8 | Octanove duplicate rows share a key and level but have different `notes` | One level record; `source_extra` keeps the first row's extras | PR3 (`ASSUMPTION`) |
| B2E9 | Two batches for different sources create the same new entry at the same moment | The per-(lemma, pos) lock and `UNIQUE(language, lemma, pos)` leave exactly one entry; both batches reference it | CR20 |
| B2E10 | The owner edits a draft through the API while an upload updates the same sense | The upload row is rejected as a conflict (`open-draft-conflict`, or `stale-revision` with a `revision`); the edit is never overwritten | PE6 |
| B2E11 | An upload creates draft revision N+1 while an editor publishes revision N from an older list | The publish item is refused as stale; live content is unchanged | PR15 |
| B2E12 | The process crashes after a row transaction committed and before the job is acknowledged | The next run skips that row by its key; counts are derived from stored row outcomes, so they are not double counted | P8 |
| B2E13 | A row transaction outlives the lease | Its commit is refused because `lease_epoch` changed; the new owner redoes the row | PR12 |
| B2E14 | Redis is down when the owner uploads | The batch is stored `queued` and 202 is returned; the reconciler adds the job when Redis is back | PR12 |
| B2E15 | Redis has an eviction policy other than `noeviction` | BullMQ logs a warning at connection; the system keeps running and the reconciler repairs lost jobs | BullMQ source (verified 12/10) |
| B2E16 | The stored upload file is purged after 30 days | The batch, counts and rejected-rows CSV remain; re-running the batch is not possible and the owner uploads the file again | D4 (`ASSUMPTION`) |
| B2E17 | The owner edited a batch-created sense through the API, then reverts the batch | The sense and its later revisions are kept and reported as "edited after import"; the batch's other records and its row keys are still removed when safe | PR16 (`ASSUMPTION`) |
| B2E18 | The owner reverts a batch whose sense was published | The published sense, its entry and the entry's only level are kept and reported; only unpublished records are removed | P18, CR5 |
| B2E19 | The last published sense of an entry is retired | The entry stays; search returns nothing for it until another sense is published | CR17 |
| B2E20 | A topic is archived while published senses use it | Those senses keep and show it; a row cannot name it (`topic-archived`); a new revision that inherits topics drops it with a warning | CR9 (`ASSUMPTION`) |
| B2E21 | A search query is `%`, `_`, `\`, only spaces, or 101 characters | Wildcards match literally; empty or over-long queries return 400; a query matching only unpublished senses returns an empty list, not 404 | CR11 |
| B2E22 | A learner reuses a `page_token` after changing `q` | 400, because the token is bound to its query | S3 (`ASSUMPTION`) |
| B2E23 | An entry has two parts of speech, both published | Search returns both senses as separate results | CR1 |
| B2E24 | A header-only file, or a file whose every row is rejected | A file with no data row is refused (`file-invalid`); a file whose rows are all rejected finishes `partial` with zero created | PR14 (`ASSUMPTION`) |
| B2E25 | A staff member is demoted or their session revoked while their batch runs | The batch continues; authorization was checked when it was accepted and `created_by` is stored for audit | PR18 (`ASSUMPTION`) |
| B2E26 | A user who created batches is deleted (Bước 8) | `created_by` is a plain uuid with no foreign key; batch history stays | D3 |
| B2E27 | The level source declared for a file is the `owner` source | Level cells create `editorial` records and no version or license is needed | PR1 |
| B2E28 | Two upload requests with different `Idempotency-Key` carry the same file | Two batches; the second finds every row key present and reports all rows `unchanged` | PR9 |
| B2E29 | Browse is requested while a batch writes new drafts | Only published senses are visible; READ COMMITTED gives no cross-request snapshot guarantee | PR8 |
| B2E30 | A context label is whitespace only | Normalized to null (the main sense) | CR6 |
| B2E31 | The idempotency row of an upload request is left `in_progress` (orphaned) | 409 `idempotency-key-abandoned`; the client uploads again with a new key | Bước 0 (chốt 07/10) |
| B2E32 | The revision of a waiting replacement sense is rejected | The replacement sense becomes `retired` without ever being published, the old sense is unchanged and stays published, and a later replacement can be created | CR17 (`ASSUMPTION`) |
| B2E33 | The owner saves the file in Excel as plain "CSV" (Windows code page) instead of "CSV UTF-8" | Refused as invalid UTF-8 with a message telling how to save as CSV UTF-8 | PE1 (`ASSUMPTION` about Excel) |
| B2E34 | A file goes through Excel and headwords start with an apostrophe (`'m`, `'re`, `'s`) | Excel may drop the leading apostrophe; a changed headword is a different key and creates a new entry. Must be tried once on the owner's machine | `ASSUMPTION` |
| B2E35 | A sense was edited through the API (open revision from `ui`) and the owner uploads an Excel file without `sense_id` touching it | The row is rejected with `open-draft-conflict`, so the manual edit is never overwritten | PE6 |

## 15. Chỗ lệch spec — sửa spec sau khi duyệt design này

1. `module-spec-content-pipeline.md`: **PR2** (file nguồn có thể tạo sense nháp khi dòng có nội dung); **PR14** (một ngưỡng 20.000 dòng/10 MB
   cho mọi file upload); **PR10** (xuất chạy đồng bộ, tối đa 5.000 dòng); **PR15** (xuất cả sense đã publish; hậu quả của tiền tố
   `'`); **PR5** (cột `headword` thay `lemma`, cột nội dung ghép với cột nguồn; ô trống giữ nguyên giá trị); **PR12** (chi tiết lease, `lease_epoch`, reconciler);
   **PR13** (hàng đợi concurrency 1); thêm cột `_row`, `_error`, `_missing`.
2. `module-spec-vocabulary-content.md`: **CR13, CR14, CR15, CR21, CR23** chuyển sang Bước 3 (ghi chú, không sửa nội dung); **CR8** (cách chọn level hiển thị và
   `display_priority`); **CR17** (revision là bản chụp bất biến, `unpublished` là trạng thái của sense).
3. `HANDOFF_2026-10-05_BUOC_0.md` §2: Bước 2 chỉ còn phía quản trị và tìm kiếm chỉ-đọc; từ riêng tư về Bước 3; thêm **bước giao diện** (đăng nhập web, trang
   admin, cấp vai trò) giữa Bước 2 và Bước 3 (D9). `CLAUDE.md`: cập nhật mục Bước 2 as-built khi xong.

## 16. Ngoài phạm vi Bước 2

Từ riêng tư và mọi thứ gắn với nó; câu ngữ cảnh; chuỗi tra nghĩa, nguồn từ điển ngoài, AI; thông báo sense retired cho Learning; xóa tài khoản
và xóa lan; giao diện web; quyền `questions.moderate`, `entitlements.grant`, `ai.settings`; nguồn dữ liệu dạng chia (CR16); lịch nhập định kỳ;
kênh cảnh báo ngoài log; CSV có số phiên bản; nhiều ngôn ngữ giải thích ngoài `vi` và `en`.

## 17. Rủi ro và việc còn mở

**Chờ bạn:**
1. **Phiên bản CEFR-J.** Repo chỉ có 1.5. Có nguồn thứ cấp nói tồn tại 1.6 (bài thuyết trình của Tono; một app Nhật tải bản 1.6 tháng 10/2022 từ
   `cefr-j.org/data/CEFRJ_wordlist_ver1.6.zip`), nhưng môi trường này không truy cập được `cefr-j.org` nên **chưa xác nhận được** và chưa thấy file.
   Cần bạn mở `cefr-j.org/download.html`. Nếu có 1.6: đưa file vào repo; các con số ở B2#70 (7.799 dòng, 117 entry xung đột…) sẽ phải đo lại. Octanove: chỉ thấy
   bản 1.0 trong repo `olp-en-cefrj`, chưa thấy trang phát hành riêng của Octanove Labs.
2. **BullMQ có backend Postgres.** Đọc code `bullmq` 6.3.12: thư mục `postgres/` có `createPostgresBackend` (kèm `setDefaultBackendFactory`), Postgres tối thiểu 13; README
   không nhắc, và bản 6.3.12 (09/10/2026) có một bản vá cho phần này, nên có thể còn mới; mình chưa chạy thử. Nếu dùng, Bước 2 **không cần Redis**
   (bỏ dịch vụ Redis, `@testcontainers/redis`, `REDIS_URL`), phần còn lại của design giữ nguyên vì chỉ dùng API `Queue`/`Worker`, và DB vẫn là nguồn sự thật. Bạn đã chốt Redis (D6);
   đây là thông tin mới để bạn xác nhận giữ Redis hay đổi. Plan M2 chỉ an toàn nếu không đổi giữa chừng.
3. **Luật xung đột khi upload lại trong lúc soạn** (mục 5, B2#19, B2#24): đề xuất CSV được ghi đè revision mở do CSV tạo (chỉ chặn bản sửa
   tay qua API), và `gloss-changed` chỉ áp cho sense đã từng publish. Lệch PE6 và P25 của spec, vì hai luật đó đúng chữ thì chặn vòng sửa
   trong Excel trước khi publish.

**Rủi ro mình thấy:**
- Redis là dịch vụ mới phải vận hành (cấu hình `noeviction`, lưu bền); lý do dùng BullMQ yếu đi từ K1b (Pipeline Defense Analysis); điều kiện xét lại ghi ở spec.
- Chưa đo thời gian nhập 7.799 dòng với mỗi dòng một giao dịch (B2#71); số lease, nhịp tim, reconciler là ASSUMPTION.
- Hành vi của Excel là ASSUMPTION: dấu phân cách `;` với thiết lập tiếng Việt, bảng mã khi lưu "CSV" thường, và việc mất dấu `'` ở đầu ô (`'m`, `'re`, `'s`). Excel là công cụ chính của chủ dự án nên cần thử một lần trên máy thật trước M2.
- `csv-parse`, `ioredis`, `@nestjs/bullmq`, multer chưa được thử chạy cùng Nest 12 và Node 24 trong repo; plan kiểm trước khi viết code.
- Hàng đợi concurrency 1 nghĩa là một file lớn làm các upload khác chờ; chấp nhận ở pilot (một đến vài nhân sự).
- Cách cài tìm kiếm (chỉ mục) chưa đo; ~9.800 entry nên quét tuần tự vẫn nhỏ (ASSUMPTION).
- Bảng quyền: `entitlements.grant` của `editor` mâu thuẫn với "editor không đụng chi phí AI" (D6); ghi ở `CLAUDE.md`, quyết ở Bước 5.
