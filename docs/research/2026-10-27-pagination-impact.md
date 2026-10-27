# Phân trang mọi GET endpoint: hệ quả trước khi đổi (27/10/2026)

Khảo sát chỉ đọc, trên worktree `fix-ui-nguoi-hoc-major`. Mọi dòng `file:line` dưới đây đã đọc trong phiên này. Đường dẫn API
tính từ `apps/api/src/`, web từ `apps/web/src/`, admin từ `apps/admin/src/`, script từ `apps/api/scripts/`.

## 0. Quy ước đang có (system-spec)

- **SR7** (`docs/specs/system-spec.md:76`): "Tiền tố `/v1`; trong v1 chỉ thêm, không đổi nghĩa field. Client bỏ qua field và giá trị
  enum chưa biết. … Phân trang bằng `page_size` (mặc định 20, tối đa 100) và `page_token` mờ". Con số 20/100 được ghi `ASSUMPTION`.
- **S2** (`:106`): "When a list endpoint is called with `page_size` and `page_token`, then it returns at most that many items plus a
  `next_page_token`, and the token is opaque".
- **S3** (`:107`): token hỏng hoặc bị sửa → 400 Problem Details, không 500.
- **S12** (`:117`): "When a v1 response gains a new optional field, then a client built before the change keeps working".

Hệ quả trực tiếp: thêm `page_size` **mặc định 20** vào một endpoint đang trả cả danh sách là **đổi nghĩa** của response (client cũ
không gửi `page_size` sẽ âm thầm chỉ nhận 20 dòng) → vi phạm SR7. Cách cộng thêm (additive) duy nhất: `page_size` vắng mặt = giữ
nguyên hành vi cũ (trả hết), có `page_size` = trả trang + `next_page_token` (field mới, tùy chọn). Đổi tên khóa response (vd
`cards` → `items`) cũng là breaking.

## 1. Bảng tóm tắt

Ký hiệu loại: **R** = một tài nguyên, **BL** = danh sách có trần nhỏ, **UL** = danh sách lớn lên theo dữ liệu, **F** = tải file,
**W** = webhook. "Có trang?" = có `page_token` hay chưa.

### 1a. Đã phân trang (giữ nguyên)

| Endpoint | Bằng chứng |
|---|---|
| `GET /v1/admin/users`, `/v1/admin/staff` | `identity/staff/staff.controller.ts:23,33`, `staff.schemas.ts:15,20` |
| `GET /v1/admin/ai/eval/runs` | `ai/api/admin-ai-eval.controller.ts:17,69` |
| `GET /v1/admin/ai/prompts/:op/revisions` | `ai/api/admin-ai-prompts.controller.ts:12,44` |
| `GET /v1/admin/content/senses/publish-jobs` | `content-pipeline/publish/publish-jobs.controller.ts:29,87,109` |
| `GET /v1/admin/content/uploads` | `content-pipeline/upload/uploads-read.controller.ts:16,30,49` |
| `GET /v1/admin/content/entries`, `/senses` | `content/catalog/admin-catalog.controller.ts:12`, `admin-catalog.queries.ts:170` |
| `GET /v1/admin/practice/reports`, `/refunds` | `practice/reports/admin-reports.controller.ts:13,37,57` |
| `GET /v1/admin/practice/unknown-forms` | `practice/reports/admin-unknown-forms.controller.ts:9,20` |
| `GET /v1/admin/settings/history` | `settings/admin-settings.controller.ts:14,39` |
| `GET /v1/admin/entitlements/grants` | `entitlements/grants/grants.schemas.ts:47` |
| `GET /v1/admin/transactions`, `/v1/me/transactions` | `entitlements/transactions/transactions.queries.ts:12,21` |
| `GET /v1/sample` | `sample/sample.controller.ts:27-34` (luôn trả rỗng) |
| `GET /v1/words` | `content/words/words.schemas.ts:10` |
| `GET /v1/senses`, `/v1/senses/search` | `content/learner/learner-content.controller.ts:9-23` |
| `GET /v1/groups/:id/items` | `learning/items/items.schemas.ts:20-25`, `items.service.ts:151-181` (keyset `added_at, item_id`, có lọc `cell`) |
| `GET /v1/groups/:id/backlog` | `learning/backlog/backlog.controller.ts:11` |
| `GET /v1/practice/history`, `/weak-words` | `practice/history/history.controller.ts:6,22,32` |
| `GET /v1/practice/reports` (người học) | `practice/reports/reports.controller.ts:20,49` |

Ghi chú: `practice/items` **không có GET** nào (chỉ POST answer/skip/hint/report/review) — mục "practice/items (?)" trong đề bài không tồn tại.

### 1b. Chưa phân trang

| Endpoint | Loại | Số dòng tối đa hôm nay, chặn bởi gì | Kết luận |
|---|---|---|---|
| `GET /v1/groups` | BL | ≤ `learning.groupsPerUser` = **100** (khoảng 10–1000) `settings.definitions.ts:48,76` | Không cần trang; có rủi ro hiệu năng khác (§2.1) |
| `GET /v1/groups/:id` | R | 1 (`learning/groups/groups.service.ts:87-96`) | Không cần |
| `GET /v1/groups/:id/queue?mode=all` | UL-có-trần | **mọi thẻ của nhóm**, ≤ `itemsPerGroup` = **2000** (khoảng 100–**10000**), kèm nội dung và mọi câu ngữ cảnh (`learning/queue/queue.service.ts:78-79`, `queue.queries.ts:87-88` `ORDER BY random()`) | **Cần sửa** — nhưng là trang nhóm, không phải endpoint này (§3) |
| `GET /v1/groups/:id/queue?mode=due` | UL-có-trần | ưu tiên **không giới hạn** + đến hạn ≤ `reviewsPerGroupPerDay` 100 (null = không giới hạn) + mới ≤ `newPerGroupPerDay` 20 (`queue.service.ts:80-90`, `queue.queries.ts:79-86`) | Không cần trang; có thể cần trần cho phần ưu tiên (§3.5) |
| `GET /v1/items?sense_ids=` | BL | ≤ 100 id (`items.schemas.ts:17-19`) | Không cần |
| `GET /v1/lookup?q=` | BL | các nghĩa của một chữ + gốc của dạng chia (`content/words/words.service.ts:156-167`) | Không cần |
| `GET /v1/words/:lemma` | R | một trang từ (`words.service.ts:129-153`) | Không cần |
| `GET /v1/senses/:id` | R | 1 | Không cần |
| `GET /v1/senses/:id/sentences` | BL | ≤ `content.sentencesPerSense` = **20** (5–100) `settings.definitions.ts:60,107`; comment cố ý "no paging" `content/sentences/sentences.controller.ts:29` | Không cần |
| `GET /v1/topics` | BL (quản trị tạo) | mọi chủ đề chưa lưu trữ (`content/taxonomy/topics.service.ts:79-89`); không có trần cứng | Không cần |
| `GET /v1/topics/suggestions` | BL | ≤ 3 gợi ý × 4 mẫu (`topic-suggestions.service.ts:10-11`); nhưng server đọc **mọi** nghĩa của từng cặp rồi mới cắt (`topic-suggestions.queries.ts:51-61`, không `LIMIT`) | Không cần trang; có thể thêm `LIMIT` ở server |
| `GET /v1/practice/weak-words/groups` | BL | ≤ số nhóm (100) (`practice/history/history.service.ts:73-86`) | Không cần |
| `GET /v1/practice/report-reasons` | BL (quản trị tạo) | lý do đang bật | Không cần |
| `GET /v1/practice/sessions/current` | R | 1 | Không cần |
| `GET /v1/practice/sessions/:id/summary` | BL | ≤ số câu của phiên, `maxQuestionsPerSession` 20 (5–100) (`practice/reviews/*.service.ts:56-64`) | Không cần |
| `GET /v1/me`, `/me/app-config`, `/me/entitlements`, `/me/reminders` | R | 1 | Không cần |
| `GET /v1/health` | R | `{status:'ok'}` | Không cần |
| `GET /v1/sources` (công khai), `/v1/admin/content/sources` | BL (quản trị tạo) | mọi nguồn dữ liệu (`content/sources/sources.service.ts:51-55`) | Không cần |
| `GET /v1/admin/ai/calls?operation_id=` | BL | các lần gọi của **một** operation id (lần đầu + lần thử lại) (`ai/reports/reports.service.ts:152-175`); không có trần cứng | Không cần |
| `GET /v1/admin/ai/costs` | BL | ≤ 366 ngày (`reports.service.ts:18,136`) theo 5 kiểu nhóm | Không cần |
| `GET /v1/admin/ai/status` | R | 1 | Không cần |
| `GET /v1/admin/ai/models` | BL (quản trị tạo) | mọi model (`ai/models/models.service.ts:90-95`) | Không cần |
| `GET /v1/admin/ai/operations` | BL | số operation cố định trong code (6) | Không cần |
| `GET /v1/admin/ai/prompts/:op` | R | 1 (lịch sử đã có trang riêng) | Không cần |
| `GET /v1/admin/ai/eval/examples` | BL | ≤ `EVAL_EXAMPLES_PER_OPERATION_MAX` = 100 (`ai/ai.constants.ts:35`, `eval-examples.service.ts:51-54`) | Không cần |
| `GET /v1/admin/ai/eval/runs/:id` | R | 1 lần chạy, `items` ≤ 100 ví dụ (`eval-runs.service.ts:117-121`) | Không cần |
| `GET /v1/admin/content/senses/:id` | R | 1 | Không cần |
| `GET /v1/admin/content/senses/export`, `/entries/export` | F | ≤ `EXPORT_MAX_ROWS` = 5000, quá thì lỗi (`common/config/app-config.ts:206`, `content-pipeline/export/export.service.ts:42-54`) | Không áp dụng (file) |
| `GET /v1/admin/content/inflections/backfill/:id` | R | 1 (`inflections-backfill.controller.ts:42-49`) | Không cần |
| `GET /v1/admin/content/senses/publish-jobs/:id` (+ `report.csv`) | R / F | 1; CSV = mọi mục của job, đọc hết vào bộ nhớ (`publish-jobs.controller.ts:114-124`) | Không cần |
| `GET /v1/admin/content/uploads/:id` (+ `rejected.csv`) | R / F | 1; CSV ≤ số dòng tải lên, `IMPORT_MAX_ROWS` 20000 (`app-config.ts:204`, `uploads-read.controller.ts:54-67`) | Không cần |
| `GET /v1/admin/entitlements/ai-usage` | R | 1 (`entitlements/entitlements.service.ts:181-191`) | Không cần |
| `GET /v1/admin/entitlements/users/:user_id` | R + BL | snapshot + lần cấp **cắt ngầm ở 100**, không báo còn nữa (`entitlements/grants/grants.service.ts:242-247` `take: 100`) | Cách sửa khác: báo bị cắt, hoặc trỏ sang `/grants?user_id=` đã có trang |
| `GET /v1/admin/practice/report-reasons` | BL (quản trị tạo) | mọi lý do | Không cần |
| `GET /v1/admin/settings` | R | 1 (`admin-settings.controller.ts:22-26`) | Không cần |
| `GET /v1/admin/taxonomy/topics` | BL (quản trị tạo) | mọi chủ đề (`topics.service.ts:74-77`) | Không cần |
| `GET /v1/billing/webhooks/:provider` | W | không phải danh sách (`entitlements/billing/webhook.controller.ts:27-29`) | Không áp dụng |

Kết quả: ngoài danh sách đã có trang, **không có endpoint nào thật sự lớn lên không giới hạn theo dữ liệu**. Chỗ lớn nhất là
`queue?mode=all`, bị chặn bởi một setting nhưng setting đó lên tới 2000 (mặc định) và 10000 (tối đa). Những danh sách "không có trần
cứng" còn lại (chủ đề, nguồn, model, lý do báo lỗi, lần gọi AI của một operation id) đều do quản trị tạo hoặc do thiết kế giữ nhỏ.

## 2. Chi tiết các endpoint đáng chú ý

### 2.1 `GET /v1/groups` — không nên phân trang

- Trả `{ items }` mọi nhóm của người học, server sắp: có ưu tiên trước, rồi nhiều thẻ chờ nhất, rồi tên (`queue.service.ts:47-58`).
- Người gọi đều giả định có **cả danh sách**:
  - `groups/GroupPage.tsx:84` `.find(g => g.id === detail.id)` lấy số liệu của chính nhóm đang xem (chip Ưu tiên/Cần ôn/Mới, biểu
    đồ ngăn, link tồn đọng). Nhóm rơi sang trang 2 → trang nhóm mất chip và biểu đồ.
  - `groups/GroupListPage.tsx:29-36` sắp lại ở client (`sortForToday`, `GroupCard.tsx:14-22`), **cộng** `total` mọi nhóm thành
    "N từ", lọc "đang chờ/xong" và tìm theo tên ở client.
  - `today/TodayPage.tsx:30-31` chọn nhóm "hero" = nhóm đầu tiên còn thẻ chờ sau khi sắp.
  - `add-word/AddWordSheet.tsx:51`, `BulkAddSheet.tsx:29`, `DeckPickerDialog.tsx:27`, `TopicPickerPage.tsx:54` dùng làm danh sách chọn nhóm.
  - `word/LearningBlock.tsx:18-22` đổi `group_ids` → tên bằng `.find`.
  - `practice/PracticePage.tsx:31`, `practice/use-practice-starter.tsx:49,67`, `practice/session/PracticeSession.tsx:41,44` chọn và gắn nhãn nguồn.
- Phân trang sẽ làm sai: tổng "N từ", nhóm hero, thứ tự (sắp theo "thẻ chờ" là giá trị tính lúc đọc, không làm keyset được), tìm
  tên, mọi `.find`. Lợi ích gần bằng 0 vì trần mặc định là 100 nhóm.
- **Rủi ro thật nằm ở chỗ khác:** mỗi lần gọi chạy `groupStatsQuery` (`queue.queries.ts:20-64`) gộp **mọi item của mọi nhóm** của
  người đó. Với 100 nhóm × 2000 từ là tới 200.000 dòng `group_items` mỗi lần gọi, và endpoint này được gọi ở gần như mọi màn hình.
  Phân trang **không** giảm chi phí đó (vẫn phải tính hết để sắp). Chưa đo thời gian thật — `ASSUMPTION` là ổn ở cỡ hiện tại.

### 2.2 `GET /v1/groups/:id/queue` — xem §3

### 2.3 `GET /v1/admin/entitlements/users/:user_id` — cắt ngầm

`grants.service.ts:244` `take: 100` không có `next_page_token`. Ai có hơn 100 lần cấp thì admin chỉ thấy 100 lần mới nhất mà không
biết còn. Người gọi duy nhất tìm thấy: `scripts/smoke-buoc-5.mjs` (`GET /v1/admin/entitlements/users/${userId}`). Admin web chưa có
màn hình này. Sửa đúng: thêm field cộng thêm (vd `grants_truncated: true`) hoặc để màn hình dùng `/admin/entitlements/grants?user_id=`
(đã có trang).

### 2.4 Hai CSV đọc hết vào bộ nhớ

`publish-jobs/:id/report.csv` và `uploads/:id/rejected.csv` dùng `findMany` không giới hạn rồi `response.send` một lần. Bị chặn
gián tiếp bởi `IMPORT_MAX_ROWS` 20000 và số nghĩa trong một job xuất bản. Là file tải về, **phân trang không áp dụng**; nếu cần thì
stream như `export.service.ts`.

## 3. Trang nhóm (`GroupPage.tsx`) — điều chủ dự án thấy

### 3.1 Hôm nay trang tải gì, với nhóm 2000 từ

Mở `/app/group?id=…` chạy song song:

| # | Request | Trả về | Số request |
|---|---|---|---|
| 1 | `GET /v1/groups/:id` (`groups-api.ts:91-98`) | tên, `item_count`, ngày tạo | 1 |
| 2 | `GET /v1/groups` (`GroupPage.tsx:84`) | mọi nhóm + số liệu (chỉ để `.find` nhóm này) | 1 |
| 3 | `GET /v1/groups/:id/queue?mode=all` (`GroupPage.tsx:85`, `groups-api.ts:117-124`) | **cả 2000 thẻ**, mỗi thẻ kèm `content` (nghĩa, định nghĩa, ví dụ, `form_of`) và **mọi câu ngữ cảnh** của người học (≤ 20/nghĩa) (`queue.service.ts:92-106`) | 1 |
| 4 | `useAllGroupItems` (`groups-api.ts:127-145`) | vòng lặp **tuần tự** `GET /v1/groups/:id/items?page_size=100` cho tới hết → 2000 dòng → `Map` theo `item_id` (chỉ để lấy `group_count` và `sense_changed`) | **20, nối đuôi nhau** |

Phía server cho request 3: một câu `queueItemsQuery … ORDER BY random()` (`queue.queries.ts:87-88`) không `LIMIT`, rồi
`cardContent` cho 2000 sense id và `listSentences` cho 2000 sense id (`content/sentences/sentences.service.ts:60-70`, không giới hạn).
Kích thước JSON thật **chưa đo** (`ASSUMPTION`: cỡ vài trăm byte tới ~1 KB mỗi thẻ → khoảng 1–2 MB).

Mọi thứ trên trang được tính ở client từ mảng `cards`:

| Thành phần | Dựa vào | Dòng |
|---|---|---|
| Dòng meta "N từ · tạo ngày …" | `detail.item_count` (request 1) | `GroupPage.tsx:107` |
| Chip Ưu tiên / Cần ôn / Mới | `summary.today` (request 2, **đã áp trần ngày**) | `:109-115` |
| Nút "Ôn N" / "Học tất cả N từ" | `waiting(summary)` và `detail.item_count` | `:90,117-125` |
| Biểu đồ ngăn | `summary.cells[level].total/.due` (request 2) | `:137,209-248` |
| Link tồn đọng | `summary.backlog` | `:138-143` |
| Xem trước thẻ | `cards` (request 3), lật lần lượt theo thứ tự ngẫu nhiên | `:147,251-300` |
| Tiêu đề "Toàn bộ N từ" | `cards.length` (request 3) | `:150,168` |
| Bộ lọc và số đếm từng mục | `cards.filter(matches)` cho **từng** mục, ở client | `:40-46,93-100,158` |
| Danh sách từ | `shown` = `cards` đã lọc, **vẽ hết** (không ảo hóa) | `:169-171` |
| Nút "Bỏ" và nhãn "nghĩa đã đổi" | `items.get(item_id)` (request 4); khi request 4 chưa xong nút "Bỏ" bị tắt | `:170,354` |

### 3.2 Các lỗi ẩn đang có (không do phân trang, nhưng phân trang phải xử lý)

- **Thứ tự nhảy:** `ORDER BY random()` → mỗi lần refetch danh sách đổi chỗ. `removeItem` và `bulkAdd` gọi `refresh(groupId)`
  (`groups-api.ts:191-199`), invalidate `['group', id]`, nên bỏ một từ = tải lại 2000 thẻ + 20 trang và **cả danh sách xáo lại**.
  Ôn xong một thẻ (`review/use-review-queue.ts:63`) cũng invalidate cùng khóa.
- **Ba con số "N từ" có thể lệch nhau:** meta dùng `item_count` (đếm cả nghĩa đã ẩn, `groups.service.ts:91`), tiêu đề dùng
  `cards.length` (bỏ nghĩa ẩn, `queue.service.ts:96-99`), biểu đồ dùng `cells` (chỉ nghĩa hiện, `queue.queries.ts:35`).
- **"Đến hạn" ≠ chip "Cần ôn":** bộ lọc đếm `section === 'due'` **không trần**; chip dùng `today.due` **đã trần** 100/ngày
  (`queue.service.ts:26-33`). Bộ lọc "Mới" cũng vậy (không trần) so với chip "Mới" (trần 20).

### 3.3 Định nghĩa từng bộ lọc, đối chiếu số đếm server đã có

`sectionOf` (`learning/schedule/schedule.ts:22-28`): tồn đọng thắng ưu tiên; ưu tiên; level 0 → mới; đến ngày → đến hạn; còn lại → sớm.

| Bộ lọc | Điều kiện | Server đã đếm sẵn chưa |
|---|---|---|
| Tất cả | mọi thẻ hiện | `total` (`queue.queries.ts:38`) ✔ |
| Ưu tiên | `priority AND NOT backlog` | `priority` (`:39`), trả nguyên trong `today.priority` ✔ |
| Đến hạn | `NOT priority AND level≥1 AND due≤today AND NOT backlog` | `due_available` (`:40`) — **chưa trả ra**, chỉ trả bản đã trần |
| Mới | `NOT priority AND level=0` | `new_available` (`:41`) — **chưa trả ra**, chỉ trả bản đã trần |
| Ngăn N | `level = N` (gồm cả ưu tiên và tồn đọng) | `cells[N].total` (`:43`) ✔ |

Nghĩa là thêm hai field cộng thêm (vd `available: { due, new }`) vào `GroupSummary` là đủ để mọi số đếm của bộ lọc lấy từ server,
khớp đúng logic client hiện nay.

### 3.4 Thiết kế phân trang tối thiểu mà vẫn đúng

1. **Số đếm từ server:** chip bộ lọc, "Toàn bộ N từ" lấy từ `GroupSummary` (+ 2 field mới ở 3.3). Không đếm ở client nữa.
2. **Danh sách theo trang, lọc ở server:** mở rộng **cộng thêm** `GET /v1/groups/:id/items`: thêm giá trị lọc `section=priority|due|new`
   (bên cạnh `cell` đang có, `items.schemas.ts:21-22`) và một tham số tùy chọn kèm nội dung thẻ (lemma, loại từ, nghĩa, ví dụ đầu).
   Endpoint này đã có keyset `(added_at, item_id)` ổn định, đã có `group_count` và `sense_changed` → bỏ được request 4 và không còn
   xáo thứ tự. Thứ tự hiển thị đổi từ ngẫu nhiên sang "thêm vào trước/sau" — cần chủ dự án duyệt.
   - Lọc "Đến hạn" phụ thuộc "hôm nay" theo múi giờ người học → token phải gắn với ngày (binding như `items.service.ts:154`), qua nửa
     đêm thì token cũ trả 400 hoặc kết quả lệch.
   - Hiện `listGroup` lọc nghĩa ẩn **sau** khi lấy trang (`items.service.ts:173`, chỉ đánh dấu `sense_changed`), còn queue thì **bỏ**
     thẻ ẩn. Hai cách đếm này phải thống nhất, nếu không số đếm (chỉ nghĩa hiện) ≠ số dòng trong danh sách.
   - Index: hiện chỉ có PK `(group_id, item_id)` và `@@index([itemId])` (`prisma/models/learning.prisma:45-46`); không có index
     `(group_id, added_at, item_id)`. Với ≤ 2000–10000 dòng/nhóm Postgres lọc rồi sắp trong bộ nhớ vẫn nhanh (`ASSUMPTION`, chưa đo);
     thêm index là tùy chọn.
3. **Xem trước thẻ:** không cần 2000 thẻ — lấy từ trang đầu của danh sách, hoặc `queue?mode=due` (≤ ~120 thẻ khi phần ưu tiên nhỏ).
4. **Giữ nguyên `GET /groups/:id/queue`** cho phiên ôn. Không đổi shape (`{cards}`), nên không breaking.

### 3.5 Ảnh hưởng tới phiên ôn (`/app/review?group=…`) và nơi khác dùng queue

- `review/use-review-queue.ts:17-35` đọc queue **một lần** (`staleTime: Infinity`, tắt query sau lần đầu) để thứ tự không đổi dưới
  tay người học. `mode=all` → vẫn tải 2000 thẻ một lần.
- **Nếu phân trang luôn queue**, phiên ôn gặp ba vấn đề:
  - `mode=due`: trần ngày được tính **lúc mỗi request** (`queue.service.ts:81-85` = trần − số đã ôn hôm nay). Trang 2 xin sau khi đã
    ôn trang 1 sẽ trừ hai lần → thiếu thẻ. Muốn đúng phải chốt trần lúc mở phiên và mang trong token.
  - Trả lời làm thẻ đổi nhóm: "Cần ôn tập" đặt `priority=true, level=1, due=hôm nay` (`schedule.ts:39-40`) → thẻ có thể xuất hiện
    lại ở trang sau tùy cursor đang ở phần nào.
  - `mode=all` dùng `random()`: **không làm keyset được**; phải đổi sang thứ tự xác định hoặc ngẫu nhiên có seed mang trong token.
  - Đổi khóa `cards` → `items` là breaking với 3 người gọi web (`groups-api.ts:121`, `use-review-queue.ts:26`, `AddWordSheet.tsx:53`).
- `AddWordSheet.tsx:53-54` gọi `queue?mode=all` của nhóm đang khóa **chỉ để** dựng `Set` sense_id "đã có trong nhóm". Đúng hơn và rẻ
  hơn: `GET /v1/items?sense_ids=` cho các nghĩa vừa tra (≤ 100, trả sẵn `group_ids`, `items.service.ts:137-149`), như
  `word/word-api.ts` và `TopicPickerPage.tsx` đang làm.
- Phần ưu tiên của `mode=due` không có `LIMIT` (`queue.queries.ts:79-80`): ai bấm "Cần ôn tập" cho cả nhóm thì `mode=due` trả cả
  nhóm. Nếu muốn chặn, đó là một trần (setting mới), không phải phân trang.

### 3.6 Người gọi / test phải sửa nếu đổi trang nhóm

- Web unit: `groups/group-page.test.tsx`, `add-word/locked-add-word.test.tsx`, `review/review-session.test.tsx` (mock `/queue`);
  `groups/groups-api.test.tsx`. Web e2e (mock API): `e2e/app/cai-thien-a-group.spec.ts`, `cai-thien-a-speak.spec.ts`, `m2.spec.ts`,
  `overflow.spec.ts`, `e2e/support/mock-api.ts`.
- API: **không có unit test nào cho `QueueService`/`queueItemsQuery`** (grep `src/**/*.spec.ts` chỉ ra `ai/eval/eval-queue.service.spec.ts`,
  không liên quan). Đổi queue là đổi mù; nên viết test trước.
- Smoke: không script nào gọi `GET /queue` (grep `scripts/*.mjs`); `smoke-buoc-4.mjs` gọi `/v1/groups/${id}/items` (POST thêm từ).

## 4. Hệ quả nếu phân trang **toàn bộ** GET

**Blast radius.** Khoảng 40 GET chưa có trang (§1b). Trong đó ~25 là tài nguyên đơn hoặc file/webhook — "phân trang" chúng không có
nghĩa. Còn ~15 danh sách nhỏ có người gọi giả định "đủ cả": web (`useGroups` ở 11 chỗ, `topics`, `topics/suggestions`,
`report-reasons` với `.find` ở `ReportDialog.tsx:53`, `weak-words/groups` với `total` và dropdown ở `WeakWordsPage.tsx:45-46,117-118`,
`senses/:id/sentences`, `lookup`), admin (`content-api.ts:119` lấy `.items` chủ đề cho bộ chọn; nguồn dữ liệu), và các smoke
`learner-test-setup.mjs`, `smoke-buoc-5/6/7.mjs` (gọi `admin/ai/models`, `operations`, `costs`, `calls`, `taxonomy/topics`,
`content/sources`, `report-reasons`, `ai-usage`…).

**Rủi ro breaking theo SR7.** Nếu theo đúng chữ SR7 (mặc định 20) cho endpoint cũ → mọi client cũ âm thầm thiếu dữ liệu sau dòng 20:
bộ chọn nhóm thiếu nhóm, `.find` trả `undefined`, tổng sai, smoke so sánh sai. Đó là đổi nghĩa trong v1. Cách cộng thêm (không gửi
`page_size` = trả hết) thì không breaking nhưng cũng **không bảo vệ gì** cho tới khi client đổi sang gửi `page_size`.
Đổi shape (`cards`→`items`, thêm bọc `{items}` cho endpoint đang trả đối tượng) luôn là breaking.

**Cỡ thay đổi (ước lượng, chưa lập plan).**
- Phân trang toàn bộ: ~15 endpoint API (schema + cursor + binding + test), ~15 điểm gọi web/admin phải chuyển sang infinite query
  hoặc vòng lặp "lấy hết" (tức là quay về hành vi cũ, tốn thêm request), 5–6 smoke, nhiều test mock. Với `GET /v1/groups` còn phải
  dời phần sắp xếp/tổng/hero sang server. Lớn, và phần lớn không giải quyết vấn đề nào có thật.
- Chỉ sửa trang nhóm (§3.4): API 1 endpoint mở rộng cộng thêm + 2 field cộng thêm ở `GroupSummary` + test mới cho queue; web
  `GroupPage.tsx`, `groups-api.ts`, `AddWordSheet.tsx` và ~8 file test/e2e. Phiên ôn không đổi.

## 5. Các phương án (chủ dự án quyết trước)

| | Phương án | Được | Mất / rủi ro |
|---|---|---|---|
| A | **Phân trang mọi GET danh sách** theo SR7, cộng thêm (vắng `page_size` = trả hết) | Đồng nhất quy ước; sẵn cho tương lai | Thay đổi lớn (~15 API, ~15 điểm gọi, smoke, test) cho các danh sách đã nhỏ; `GET /groups` phải dời sắp/tổng sang server; queue mất tính "đọc một lần" của phiên ôn; vẫn không chặn được client cũ gửi thiếu `page_size` |
| B | **Chỉ sửa trang nhóm** (§3.4): số đếm từ server, danh sách theo trang lọc ở server qua `/groups/:id/items`, bỏ vòng 20 request, giữ queue cho phiên ôn, `AddWordSheet` chuyển sang `/items?sense_ids=` | Giải đúng chỗ nặng thật (2000–10000 thẻ + 20 request tuần tự); hết xáo thứ tự; số đếm khớp nhau; không breaking | Thứ tự danh sách đổi (ngẫu nhiên → theo ngày thêm); token "Đến hạn" gắn với ngày; phải thống nhất cách đếm nghĩa ẩn; phiên ôn `mode=all` vẫn tải cả nhóm |
| C | **B + các trần nhỏ khác**: trần cho phần ưu tiên của `mode=due`; báo bị cắt ở `admin/entitlements/users/:id`; `LIMIT` cho mẫu gợi ý chủ đề; (tùy chọn) đo `groupStatsQuery` với 100 nhóm × 2000 từ | Đóng hết các chỗ không có trần thật sự tìm thấy | Thêm 1 setting mới (trần ưu tiên) cần quyết con số; nhiều PR nhỏ hơn |

Chưa kiểm được: kích thước JSON thật của `queue?mode=all` 2000 thẻ và thời gian `groupStatsQuery` ở cỡ lớn (chưa chạy, chỉ đọc code).
