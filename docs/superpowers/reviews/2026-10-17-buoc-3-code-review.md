# Review độc lập code Bước 3 (phần hệ thống: API, worker, database)

Ngày: 17/10/2026. Người review: một phiên Claude không tham gia implement (phiên "review" do phiên điều phối "Bước 3 Learning
design doc" mở). **Chỉ review, không sửa code, không commit.**

- **Phạm vi:** mọi thay đổi trong `apps/api/` và `.github/workflows/ci.yml` từ `4651fbe` tới `origin/dev` = `5aa4085` (merge PR #37);
  187 file, +8.948/−246 dòng; gồm PR #29–#37. Đường dẫn dưới đây tính từ `apps/api/`.
- **Đối chiếu:** design `docs/superpowers/specs/2026-10-16-buoc-3-learning-design.md`, decision record (D1–D47), plan
  `docs/superpowers/plans/2026-10-17-buoc-3-learning.md` (Global Constraints, Review Focus, Task 1–21).
- **Cách kiểm:**
  1. Bốn agent đọc code song song theo luồng (Content privacy, Pipeline + dạng chia, Learning, Settings/mail/nhắc học). Mỗi agent
     viết báo cáo đầy đủ, có `file:dòng` và mục "đã kiểm".
  2. Tôi tự đọc phần lõi: Learning (queue, reviews, items, groups, quick add, backlog) và nhắc học (tick, send, eligibility, queue).
  3. Mỗi phát hiện có thể kiểm được bằng chạy thì **tôi viết test thăm dò ("probe") và chạy thật** trên Postgres/Redis
     (Testcontainers), trong một worktree review riêng, detached ở `5aa4085`.
  4. Đã chạy `pnpm build` và gọi `generateInflections` từ `dist/`.
- **Bằng chứng đầy đủ:** [`2026-10-17-buoc-3-code-review-evidence/`](2026-10-17-buoc-3-code-review-evidence/).
  - Bốn báo cáo agent: `agent-*.md`.
  - Bốn file probe: `probes/*.zz-review-probes.e2e-spec.ts`, chép vào `test/<thư mục>/` để chạy lại.
  - Output của probe: `probes/probe-output.txt`.

## Kết luận ngắn

- **Không tìm thấy lỗ hổng quyền riêng tư (B3#12).** Người học B không thấy từ riêng, câu, mục học của A trên mọi đường đọc đã rà, kể
  cả `form_of`, `has_page`, `has_private`, `via_inflection`, queue, backlog. Mọi đường đọc của staff chỉ lấy catalog.
- **Gửi tối đa một email nhắc mỗi ngày địa phương: đúng**, kể cả khi hai process gọi `send` đúng cùng lúc. Probe R1 chạy 5 vòng,
  mỗi vòng ra đúng 1 email.
- **Ranh giới module D3 sạch.** Learning, Notifications và Settings chỉ dùng model của mình; ngoại lệ duy nhất là
  `visibleSenseCondition`, đã được duyệt.
- **1 lỗi mức Cao**, ở luồng A (Pipeline): upload lại một file cũ y hệt không khôi phục dạng chia, mà báo "unchanged".
- **9 phát hiện mức Trung bình**, trong đó 3 cần quyết định thiết kế. Còn lại là mức Thấp và chỗ test chưa kiểm đủ.
- **CI của merge `5aa4085`:** run `39033545551`, xanh.
  - API: 57 file unit + 70 file e2e + scale test pass.
  - Scale test: `GET /v1/groups` với 100 nhóm × 2.000 từ đo được **318 / 310 / 304 ms** (ngưỡng 500 ms).
- **Chạy ở máy local:**
  - 3 file e2e làm mốc (`reviews`, `queue`, `reminders`): 40/40 test pass.
  - 13 probe: chạy hết; các output dưới đây là kết quả thật.

## Bảng tóm tắt

| # | Mức | Luồng | Phát hiện | Bằng chứng |
|---|---|---|---|---|
| H1 | **Cao** | A | Upload lại một file cũ y hệt (sau khi file khác đã đổi dạng chia đã duyệt) bị prefilter coi là "unchanged": dạng chia cũ không được khôi phục, báo cáo nói không có gì đổi | Probe F1 |
| M1 | Trung bình | A (+ common) | Nội dung câu ngữ cảnh còn nguyên trong `idempotency_keys.response_body` sau khi người học xóa câu hoặc xóa từ riêng, không có hạn | Probe C1 |
| M2 | Trung bình | C | Từ mức 0 có `due_date` ở tương lai (sau khi đổi múi giờ về phía tây): "Đã biết" không đổi gì nhưng vẫn ăn trần từ mới, thẻ kẹt trong queue | Probe P1 |
| M3 | Trung bình | A | Không có cách nào lưu "từ này không có dạng chia": `-` bị từ chối, `;` xóa hết nhưng job backfill lại sinh dạng sai (`porks`) | Probe F2 |
| M4 | Trung bình | A | Ô `form_of` = `-` ở dòng không có nghĩa tạo ra một nghĩa nháp rỗng, nên entry biến mất khỏi file xuất "từ chưa có nghĩa" (D34) | Probe F4 |
| M5 | Trung bình | A | Staff chọn lại đúng level của một level `derived` thì nó vẫn là `derived`: xung đột level không gỡ được bằng cách đó, revert batch xóa luôn level staff vừa xác nhận | Probe F3 |
| M6 | Trung bình | D (+ B) | Khi job dọn dẹp xóa session chain (đăng xuất > 30 ngày), `lastSeenAt` mất, hệ thống lấy `createdAt` thay → người học bị xếp "dừng" quá sớm, mất email "Đã lâu rồi" | Đọc code (agent chạy `eligibility`) |
| M7 | Trung bình | D | Lỗi SMTP vĩnh viễn (5xx) cũng thử lại 3 lần mỗi ngày, mất 3 suất email/ngày; ngày `failed` không tính vào trần "một email lâu rồi mỗi tuần" → email "lâu rồi" được thử **mỗi ngày** | Probe R2 |
| M8 | Trung bình, thiết kế | A | B3E14: gõ `deployed` khi từ gốc `deploy` chưa có nghĩa published → tra trả rỗng, không gợi ý từ gốc, không gắn sẵn link. Hiện hầu hết 7.799 entry CEFR-J chưa có nghĩa | Probe C3 |
| M9 | Trung bình, thiết kế | D | Lỗi SMTP mơ hồ (timeout sau khi máy chủ đã nhận thư) bị coi là tạm thời → xóa `sending` → thử lại → có thể gửi trùng. Design 8.3 quy định vậy, nhưng trái lý do của D37 | Đọc code |
| L1–L19 | Thấp | A, B, C, D | Xem mục "Mức Thấp" | Probe P2–P4, C2 hoặc đọc code |
| T | Test chưa đủ | A, C, D | Các test chỉ kiểm bề mặt hoặc thiếu vế "Then"; quan trọng nhất là Review Focus 4 chưa thật sự cho hai Worker tranh nhau | Mục "Test" |

Luồng: **A** Content + Pipeline, **B** Settings/mail/Identity, **C** Learning, **D** Notifications (nhắc học).

---

## Mức Cao

### H1 — Upload lại file cũ không khôi phục dạng chia đã duyệt — luồng A

- **Chỗ lỗi:** `src/content-pipeline/import/prefilter.ts:85-86` và `:102-104`.
- **Cơ chế:** prefilter (bước lọc trước khi import, của D13 Bước 2) bỏ qua một dòng khi "cùng byte file đã được áp dụng trước đó".
  Bước 3 thêm row key loại `inflection` vào cơ chế này.
- **Vì sao sai:** điều kiện "cùng byte đã áp dụng thì bỏ qua" an toàn cho level, vì level chỉ được thêm, không bao giờ bị thay.
  Dạng chia thì bị **thay cả bộ**, nên một batch sau có thể đã ghi đè thứ mà file cũ từng đặt.
- **Thêm một lý do:** unique key của `import_row_keys` là toàn cục và dùng `skipDuplicates`, nên batch đầu tiên giữ hash
  `H(went)` mãi mãi.

```ts
// prefilter.ts:85 — chỉ batch cùng byte file mới được tính
if (key.batchId === batch.batchId || key.batch.fileSha256 !== batch.fileSha256
  || key.batch.levelSourceId !== batch.levelSourceId) continue;
// prefilter.ts:102 — mọi key khớp một batch cũ đã áp dụng → dòng bị bỏ qua, outcome 'unchanged'
const unchanged = row.normalized.senseId === null && firstMatch !== undefined && [...firstMatch].some((id) =>
  appliedRows.has(JSON.stringify([id, row.normalized.rowNumber])) && keys.every((key) => matches.get(signature(key))?.has(id)));
```

**Tình huống:**

1. File FA có dòng `go,verb,past:went` → dạng đã duyệt là `went`.
2. File FB có dòng `go,verb,past:goed` → dạng đã duyệt thành `goed`.
3. Chủ dự án upload lại FA (cùng byte) để sửa về `went` → outcome `unchanged`, entry vẫn giữ `goed`.

Chuyện này dễ xảy ra trong luồng D5: AI soạn CSV, chủ dự án duyệt, rồi import nhiều vòng.

**Bằng chứng** (probe `pipeline … F1`):

```
F1 outcomes updated updated unchanged | after B [{"form":"goed","kind":"past","source":"reviewed"}]
   | after A again [{"form":"goed","kind":"past","source":"reviewed"}]
```

**Đề xuất sửa:** row key `inflection` không được quyết định việc bỏ qua dòng. Bước xử lý dòng đã có kiểm `sameForms`
(`row-processor.ts:105`), nên xử lý lại một ô không đổi vẫn rẻ. Cách khác: lúc prefilter, so với bộ dạng đã duyệt hiện tại của entry.

**Test nên thêm:** đúng 3 bước trên. Kỳ vọng lần 3 có outcome `updated` và dạng chia là `went`.

---

## Mức Trung bình

### M1 — Câu ngữ cảnh còn lưu trong `idempotency_keys` sau khi bị xóa — luồng A (+ hạ tầng common)

- **Câu bị lưu ở đâu:**
  - `POST /v1/senses/:id/sentences` trả nguyên văn câu (`src/content/sentences/sentences.controller.ts:41`).
  - Interceptor idempotency lưu cả response body đó vào `idempotency_keys.response_body`
    (`src/common/idempotency/idempotency.service.ts:74`).
- **Vì sao không bao giờ mất:**
  - Dòng chỉ bị xóa khi chính key đó được gửi lại sau 24 giờ (`idempotency.service.ts:38-39`).
  - Key là UUID ngẫu nhiên, nên thực tế điều đó không xảy ra.
  - Không có job dọn dẹp nào cho bảng này.
- **Vì sao là vấn đề:** design 7.4 và CR23 yêu cầu câu bị xóa cùng từ riêng hoặc cùng tài khoản.
- **Phạm vi:** đây là lưu giữ quá hạn, **không lộ cho người khác**. Key gắn theo user, nên chỉ chủ câu replay lại được.
- **Các route ghi khác không bị:** quick add chỉ trả id, `PATCH /v1/my-words` trả 204.

**Bằng chứng** (probe `content … C1`):

```
C1 add 201 remove 204 sentences left 0 copies in idempotency_keys 1
```

**Cách sửa (cần chốt):**

- **(a)** route thêm câu chỉ trả `{ id, created_at }`. Phải báo plan giao diện, vì họ có thể đang dùng `text` trong response.
- **(b)** thêm job dọn `idempotency_keys` cũ hơn 24 giờ. Cách này có lợi cho mọi route.

Bước 8 (xóa tài khoản) cũng phải xóa các dòng này.

### M2 — Từ mức 0 có ngày hẹn ở tương lai không học được — luồng C

- **Lỗi thứ nhất:** `src/learning/schedule/schedule.ts:29`
  `const wasDue = state.priority || state.dueDate <= today;` không coi mức 0 là đến hạn.
- **Lỗi thứ hai:** phần "mới" của queue chỉ lọc `level = 0` mà không lọc ngày (`src/learning/queue/queue.queries.ts:41`, `:83`).
- **Khi nào xảy ra:** người học thêm từ ở múi giờ phía đông, rồi múi giờ đổi về phía tây ngay trong ngày đó (B3E1).
  Ví dụ đi máy bay từ Việt Nam sang Mỹ. Khi đó `due_date` = "ngày mai" so với "hôm nay" mới.
- **Hậu quả:**
  - Thẻ hiện ở phần "Mới".
  - Bấm "Đã biết" không đổi gì, nhưng nhật ký ghi `section='new'`, nên trần 20 từ mới bị ăn mất một chỗ.
  - Thẻ vẫn nằm trong queue.
  - `cardsLeftToday` vẫn đếm thẻ này, nên email nhắc có thể được gửi cho một thẻ không học được.
  - Số liệu B3#20 cũng bị thổi phồng.

**Bằng chứng** (probe `learning … P1`): thêm từ ở `Pacific/Kiritimati` lúc 2026-11-01T10:30Z (đã là 02/11 ở đó), rồi đổi sang
`Etc/GMT+12` (vẫn 31/10):

```
P1 queue cards [{"level":0,"due_date":"2026-11-02","section":"new"}]
P1 three known answers [{"status":200,"level":0,"due_date":"2026-11-02","section":"new"}, … ×3]
P1 log rows [{"section":"new","wasDue":false}, … ×3]
```

**Đề xuất sửa (một dòng):** `const wasDue = state.priority || state.level === 0 || state.dueDate <= today;`. Cách này khớp design
6.2 (mục "Mới" là mức 0, không có điều kiện ngày) và dòng 2 của bảng 6.4.

**Test nên thêm:** unit test `applyAnswer({level:0, dueDate:'2026-11-02'}, 'known', '2026-11-01')` → mức 1; và e2e như probe P1.

### M3 — Không lưu được "không có dạng chia" — luồng A

- **D47** nói: số nhiều sai mà `pluralize` bỏ sót (`porks`, `furnitures`, `Internets`) sẽ "được CSV đã duyệt sửa". Nhưng với danh
  từ không đếm được, bộ đúng là **rỗng**, và không có cách nào ghi bộ rỗng.
- **Ba cách viết, không cách nào được:**
  - Ô `-` → `invalid-inflection` (`src/content-pipeline/upload/row-normalizer.ts:31-44`); thông báo lỗi không gợi ý cách xóa.
  - Ô rỗng → giữ dạng library.
  - Ô `;` → bộ reviewed rỗng: xóa hết dòng (`inflections.service.ts:26`). Nhưng entry khi đó có 0 dòng dạng chia, nên lần chạy
    backfill sau (`inflections-backfill.handler.ts:42`, lọc `inflections: { none: {} }`) **sinh lại** dạng sai.

**Bằng chứng** (probe `pipeline … F2`):

```
F2 library [{"form":"porks",…"library"}] | "-" outcome rejected … "Dạng chia \"-\" không hợp lệ…"
   | ";" outcome updated forms [] | after backfill [{"form":"porks","kind":"plural","source":"library"}]
```

**Cần chốt:**

- Ký hiệu để ghi "không có dạng chia", ví dụ `-` giống ô `form_of`.
- Cách lưu bền để backfill tôn trọng nó, ví dụ một cờ "đã duyệt: không có dạng chia" ở entry.

### M4 — `form_of` = `-` ở dòng không có nghĩa tạo nghĩa nháp rỗng — luồng A

- **Chỗ lỗi:** `src/content-pipeline/upload/row-normalizer.ts:205`: `content: content ?? (link !== null ? {} : null)`.
  Giá trị `'clear'` khác `null`, nên một dòng chỉ có `form_of = -` trở thành dòng nội dung `{}`.
- **Hậu quả:**
  - `importContent` → `createSense` tạo một nghĩa không có gloss, ví dụ hay link. Bước 2 chưa bao giờ tạo nghĩa từ dòng không có
    nội dung.
  - Entry có một nghĩa chưa retire, nên **biến mất khỏi `entries/export?has_sense=false`** (D34), tức danh sách staff dùng để
    biết còn từ nào phải soạn.
  - Dễ gặp: người duyệt điền `-` vào cột `form_of` của file "từ chưa có nghĩa" với ý "không có".

**Bằng chứng** (probe `pipeline … F4`): `F4 outcome created senses 1 revisions 1`. Kỳ vọng: `unchanged`, không có nghĩa nào.

**Đề xuất sửa:** chỉ coi `form_of` là dòng nội dung khi nó trỏ tới một từ gốc (không phải `-`), hoặc khi dòng đã có `sense_id`
hay nội dung khác.

### M5 — Level `derived` không trở thành `editorial` khi staff chọn đúng level đó — luồng A

- **Chỗ lỗi:** `src/content/catalog/levels.service.ts:67-78`. `setEditorialLevel` upsert theo key `(entry, OWNER_SOURCE_ID, level)`,
  phần `update` chỉ đổi `createdAt` (`:76`).
- **Vì sao trùng key:** level `derived` (D29, `:58-65`) dùng chung `OWNER_SOURCE_ID`, nên staff chọn đúng level đó thì trúng dòng
  `derived` và `basis` vẫn là `derived`.
- **Hậu quả:**
  - Entry có thêm một level bên thứ ba khác giá trị: `levelState` báo `conflict: true`
    (`admin-catalog.queries.ts:84-94`). Staff xác nhận đúng level `derived` thì xung đột vẫn còn; chỉ chọn level kia mới gỡ được.
  - Dòng `derived` thuộc bản ghi của batch import, nên revert batch đó xóa luôn level staff vừa xác nhận.

**Bằng chứng** (probe `pipeline … F3`):

```
F3 before [{"level":"A1","basis":"derived"}] after editorial A1 [{"level":"A1","basis":"derived"}]
```

**Đề xuất sửa:** `update: { createdAt, basis: 'editorial' }`, hoặc cho level `derived` một source id riêng.

### M6 — `lastSeenAt` mất khi job dọn dẹp xóa session chain — luồng D (đụng Identity, luồng B)

- **Cách tính vắng mặt:** `src/identity/profile/identity.service.ts:72` lấy `max(session_chains.last_used_at)`.
- **Job dọn dẹp xóa chain:** `src/identity/maintenance/identity-cleanup.service.ts:32-33`.
  - Chain đã revoke quá 30 ngày (người học bấm đăng xuất).
  - Chain không dùng quá 120 ngày.
- **Hậu quả:**
  - Khi chain bị xóa, `eligibility.ts:30` dùng `createdAt` thay, nên số ngày vắng bị tính quá lớn.
  - Ví dụ: tạo tài khoản 01/07, đăng xuất 01/09, chain bị xóa 02/10. Đúng ra vắng 31 ngày → email "inactive". Thực tế tính 93 ngày
    → `stopped`.
  - Người học tự đăng xuất rồi bỏ đi sẽ không bao giờ nhận email "Đã lâu rồi" của ngày 31–60.
  - Với `stop_after_days` > 120 (admin cho tối đa 180) thì cả người không đăng xuất cũng bị.
  - Ảnh hưởng chỉ là **ít email hơn**, không gửi thừa.
- **Bằng chứng:**
  - Đã đọc đủ ba chỗ trên.
  - Agent Reminders gọi `eligibility()` thật: còn chain → `{ kind: 'inactive' }`; mất chain → `{ skip: 'stopped' }`.
  - Chưa có e2e cho chuỗi "cleanup → tick".
- **Cần chốt:** lưu "lần cuối thấy" bền vững (ví dụ cột `users.last_seen_at` ghi lúc refresh; design §4 từng nói "không thêm chỗ ghi
  mới"), hoặc chấp nhận và ghi vào rủi ro.

### M7 — Lỗi SMTP vĩnh viễn thử lại mỗi ngày; email "lâu rồi" bị thử hằng ngày — luồng D

- **Lỗi thứ nhất:** `src/notifications/scheduler/reminder-send.service.ts:58-66` coi **mọi** lỗi là tạm thời. Một lỗi 5xx
  (hộp thư không tồn tại, vượt quota của Gmail) tốn 3 lần thử và 3 suất email (`email.provider.ts` trừ suất trước khi gửi).
- **Lỗi thứ hai:** `reminder-tick.service.ts:85` chỉ chặn dòng delivery của **hôm nay**, và `:88` chỉ lấy dòng `sent` làm
  `sentDates`. Dòng `failed` hôm qua không tính vào khoảng cách `min_gap_days`, cũng không tính vào trần "inactive tối đa mỗi tuần
  một lần".
- **Hậu quả:** người học vắng 7–60 ngày có địa chỉ bị từ chối sẽ bị thử email "Đã lâu rồi" **mỗi ngày**, mỗi ngày tốn 3 suất.

**Bằng chứng** (probe `notifications … R2`): mỗi người học có một dòng `failed` ngày 16/10, tick ngày 17/10 vẫn xếp job cho cả hai.

```
R2 jobs after a failed row yesterday [{"who":"regular","kind":"regular"},{"who":"inactive","kind":"inactive"}]
```

**Đề xuất sửa:**

- Ném BullMQ `UnrecoverableError` khi `responseCode >= 500`, để một lỗi vĩnh viễn chỉ tốn một suất.
- Tính dòng `failed` (và dòng `sending` của ngày cũ, xem L13) vào trần "inactive mỗi tuần". Có tính vào `min_gap_days` không thì
  cần chốt: thử lại hôm sau với email thường thì hợp lý.

### M8 — B3E14 không hoạt động khi từ gốc chưa có nghĩa published — luồng A, câu hỏi thiết kế

- **Chỗ lỗi:** `src/content/words/words.service.ts:139`. `via_inflection` chỉ giữ từ gốc **có nghĩa đang hiện**.
- **Hiện trạng dữ liệu:** catalog có 7.799 entry CEFR-J nhưng phần lớn chưa có nghĩa. Job backfill đã sinh dạng chia cho chúng.
- **Hậu quả:**
  - Gõ `deployed` khi `deploy` chưa có nghĩa → tra trả rỗng, giống B3E15 ("coi như từ mới").
  - Không có `entry_id` của từ gốc, nên giao diện không gắn sẵn được link "quá khứ của deploy".
  - Mục đích (1) của D29 ("thêm nhanh nhận ra `went` là quá khứ của `go`") chỉ chạy được khi từ gốc đã có nội dung.
  - Trong khi đó `createPrivateSense` chấp nhận `form_of` trỏ tới từ gốc này.

**Bằng chứng** (probe `content … C3`): `C3 lookup 200 {"senses":[],"via_inflection":[]}`.

**Cần chốt:** có trả từ gốc (chỉ `entry_id`, `lemma`, `pos`, không có nghĩa) để tự nhập kèm link không. Chọn "có" thì phải giữ được
B3#12: chỉ lộ entry catalog, không bao giờ lộ từ riêng của người khác.

### M9 — Lỗi SMTP mơ hồ có thể gây gửi trùng — luồng D, câu hỏi thiết kế

- **Chỗ lỗi:** `reminder-send.service.ts:58-66`.
- **Cơ chế:** nodemailer có thể báo `ETIMEDOUT` hoặc `ECONNRESET` **sau khi** máy chủ đã nhận thư; socket timeout là 10 giây
  (`src/common/mail/smtp-mailer.ts`). Code xóa dòng `sending`, BullMQ thử lại sau khoảng 5 giây, và người học nhận 2 email cùng ngày.
- **Mâu thuẫn trong design:** design 8.3 bước 4 quy định đúng cách làm này. Nhưng D37 chọn "mất một email còn hơn gửi trùng", vì
  email trùng dễ bị báo spam mà email nhắc dùng chung địa chỉ gửi với OTP.
- **Bằng chứng:** mới đọc code. Cần đo với SMTP thật thì mới biết tần suất (ở bước Deploy).
- **Cần chốt:** giữ như design, hoặc coi lỗi timeout/reset xảy ra sau khi đã kết nối là "không rõ" và giữ `sending` theo luật D37.

---

## Mức Thấp

| # | Luồng | Phát hiện | Chỗ | Bằng chứng |
|---|---|---|---|---|
| L1 | C | Từ **ưu tiên** quá hạn > 60 ngày bị đếm cả ở `priority` lẫn `backlog`, và hiện ở cả queue lẫn danh sách cân nhắc. Design 6.1 ("cân nhắc: không vào danh sách cần ôn") và 6.2 ("ưu tiên: mọi mục priority") mâu thuẫn nhau ở chỗ này → **cần chốt bên nào thắng** | `queue.queries.ts:39,42,77`, `backlog.service.ts:51` | Probe P2: `{"today":{"priority":1,…},"backlog":1}`, queue `["priority"]`, backlog 1 mục |
| L2 | C | Trả lời từ trong danh sách cân nhắc ở `mode=all` được ghi `section='due'` và ăn trần ôn của nhóm, trong khi design 6.1 nói cân nhắc "không tính trần". Hàm `isBacklog` có trong code nhưng runtime không gọi → **cần chốt** | `schedule.ts` `sectionOf`, `reviews.service.ts:52,65` | Probe P4: trần 10, trả lời 10 từ cân nhắc → `today.due` từ 1 xuống 0, từ đến hạn thật bị ẩn |
| L3 | C | Thêm cả loạt báo `skipped_group_full: 0` khi bộ lọc khớp nhiều hơn 2.000 + số từ đang có, vì danh sách ứng viên bị cắt trước khi đếm (B3E22 "trả số bỏ qua") | `items.service.ts:76,89`, `private-words.service.ts:242` | Probe P3: 2.005 danh từ → `{"added":2000,…,"skipped_group_full":0}` |
| L4 | C | `relearn` và xóa nhóm đọc item không khóa dòng (`FOR UPDATE`), trong khi review chỉ khóa dòng item, không lấy learner lock → lượt ôn cùng lúc trên máy khác có thể bị ghi đè, hoặc nhật ký ghi `level_before` cũ | `backlog.service.ts:79-89`, `groups.service.ts` (delete) | Đọc code (ngữ nghĩa READ COMMITTED) |
| L5 | A | `addSentence` tự viết luật "thấy được" riêng, không dùng `visibleSenseCondition`: nghĩa riêng đã retire của chính chủ vẫn nhận câu (201 thay vì 404). Hiện chưa có API nào retire nghĩa riêng | `sentences.service.ts:32-35` | Probe C2: `visibleSenseIds has it false add status 201` |
| L6 | A | Staff phân biệt được "id nghĩa riêng có tồn tại" qua `replaces_sense_id` (400 so với 404). Không ghi gì, không trả dữ liệu; phải biết trước UUID | `senses.service.ts:59-60` | Đọc code |
| L7 | A | Xóa entry gốc (xóa từ riêng hoặc revert batch) chỉ đặt `form_of_entry_id = NULL` mà để nguyên `form_kind`. Hash đã lưu vẫn có `formOf`, nên upload lại file không đổi lại tạo revision mới; báo cáo revert cũng không nói link đã mất | migration `20261017170000…:24`, `revert.service.ts:148-153`, `private-words.service.ts:197-203` | Đọc code (2 agent độc lập) |
| L8 | A | Revert một batch không hoàn tác dạng chia batch đó đã đặt (không có loại bản ghi `inflection`). Cộng với H1, một lần upload dạng chia sai chỉ sửa được bằng một file khác byte → **cần chốt** revert có phải lo phần này không | `row-processor.ts:100-114`, `revert.service.ts:4` | Đọc code |
| L9 | A | `form_of` nhận link tới chính entry của dòng (`go … go/verb:past`) và kind không hợp loại từ (`book/noun:past`). Ký tự NUL trong `form_of` làm hỏng cả lần import thay vì chỉ từ chối một dòng | `row-processor.ts:135-143`, `row-normalizer.ts:51-65,134-138` | Đọc code |
| L10 | A | Entry tạo qua `POST /v1/admin/content/entries/batch` không có dạng chia library cho tới khi chạy lại backfill (`apps/admin` chưa gọi route này) | `admin-senses.controller.ts:134-136` | Đọc code |
| L11 | A | `catalogMatch` (CR13: "gợi ý dùng bản catalog") được tính nhưng không bao giờ tới người học, vì quick add bỏ đi. Nếu đưa ra thì phải lọc entry có nghĩa đang hiện | `private-words.service.ts:158-162`, `quick-add.service.ts:66-79` | Đọc code |
| L12 | A | `entriesByForm` trả cả entry catalog không có nghĩa đang hiện. Hiện chỉ lookup gọi và lookup có lọc, nhưng hàm được export với mô tả "visible entries only" | `inflections.service.ts:38-44` | Đọc code |
| L13 | D | Job gửi chạy trễ sang ngày địa phương hôm sau (worker chết qua đêm) vẫn gửi email của "hôm qua" mà không kiểm lại ngày. Với `min_gap_days = 1`, người học có thể nhận 2 email trong một ngày thật. Dòng `sending` kẹt của ngày cũ cũng không tính vào khoảng cách | `reminder-send.service.ts:40-49`, `reminder-tick.service.ts:88` | Đọc code |
| L14 | B | Log cảnh báo `mail_budget_80` gần như không bao giờ bắn nữa, vì nhắc học đẩy bộ đếm qua `tryConsumeBelow`, hàm này không log | `src/common/mail/mail-budget.service.ts:45,57-65` | Đọc code |
| L15 | D | Backoff khi thử lại email dùng chung `IMPORT_JOB_BACKOFF_MS` (5 s) của job import: 3 lần thử gói trong khoảng 15 s, nên SMTP 421 kéo dài hơn sẽ đốt cả ngày | `reminder-queue.service.ts:75` | Đọc code |
| L16 | B | `verifiedEmails` không lọc `status = 'active'`. Hiện vô hại; cần thêm khi Bước 8 có khóa hoặc xóa tài khoản | `identity.service.ts:82-88` | Đọc code |
| L17 | B (vận hành) | `LEARNER_APP_URL` giờ là biến bắt buộc: file `apps/api/.env` cũ làm API **và** worker không khởi động được. CI đã thêm. Task 22 và bước Deploy cần biết | `common/config/app-config.ts:163-167` | Đọc code |
| L18 | A (dữ liệu) | Dạng library sai trên từ CEFR-J thật: `furniture→furnitures`, `Internet→Internets`, `mother-in-law→mother-in-laws`, `lie` gộp hai động từ (`lied, lay`), `Bank→banks`. Đưa vào danh sách duyệt CSV của chủ dự án | `inflect.ts:41,46` | Agent Pipeline gọi `generateInflections` thật |
| L19 | A | `SUSPECTED`: thêm câu đúng lúc đang xóa chính từ riêng đó → 500 (lỗi FK P2003) thay vì 404. Tự đua với chính mình trên hai máy | `sentences.service.ts:37` | Đọc code; chưa chạy |

---

## Test: chỗ chưa kiểm đủ vế "Then"

Không có test nào **sai**. Các mục dưới đây là test chỉ kiểm bề mặt, hoặc thiếu một vế của tiêu chí.

**Luồng D (nhắc học), ưu tiên cao nhất vì là Review Focus 4:**

- **T-D1 — Review Focus 4 chưa thật sự cho hai Worker tranh nhau** (`test/notifications/reminders.e2e-spec.ts:333-345`).
  - BullMQ bỏ `add` thứ hai có cùng `jobId`, nên chỉ một Worker chạy job; chốt chặn ở DB (unique `(user_id, local_date)`) không bao
    giờ bị tranh.
  - Test pass nếu **một trong hai** chốt chặn đúng, nên không chứng minh riêng chốt nào.
  - Probe R1 cho thấy chốt chặn DB đúng: `Promise.all` hai `send()` từ hai app → `[1,1,1,1,1]` email qua 5 vòng. Nên đưa probe này
    vào bộ test.
- **T-D2:** B3E27 (một job cho mỗi `jobId`) chưa được kiểm riêng; cần đọc hàng đợi BullMQ thay vì đếm email.
- **T-D3:** chưa có test "lỗi SMTP tạm thời được thử lại thành đúng một email" với Worker chạy thật (plan Task 21).
- **T-D4:** nửa "đổi múi giờ về phía đông" của test B3E29 bị bỏ qua vì chưa tới giờ gửi, nên không kiểm logic ngày nào.
- **T-D5:** chưa có test tick mà ngày địa phương khác ngày UTC (`Etc/GMT+12`).
- **T-D6:** "OTP vẫn gửi được" (B3#18) chỉ kiểm `tryConsume()` trả `true`, chưa gửi OTP thật qua route.

**Luồng C:**

- **T-C1:** chưa có test trả lời thẻ **mới** rồi thấy `today.new` giảm; chưa có test trả lời sớm thì **không** ăn trần.
- **T-C2:** chưa có test nhánh P2002: cùng `review_id` gửi đồng thời cho hai item khác nhau.
- **T-C3:** B3#5 chỉ đọc `GET /v1/groups/:id`, chưa đọc queue và backlog.
- **T-C4:** chưa có test queue của nhóm người khác → 404.
- **T-C5:** chưa có test đồng thời cho nhóm thứ 101 và nhóm đầy 2.000 (code đúng nhờ learner lock; test để giữ nó đúng).
- **T-C6:** B3#20 tự chèn dòng `item_added` bằng tay; comment "route chưa có" đã lỗi thời.
- **T-C7:** B3E11 (nhóm đầy) chỉ kiểm số từ riêng, chưa đọc lại toàn bộ trạng thái.
- **T-C8:** B3E19/B3E20 kiểm nhật ký chưa đủ cột.

**Luồng A:**

- **T-A1:** test "prefiltered as unchanged" không phân biệt được bị bỏ qua với được xử lý lại; nên kiểm thêm số row key của batch thứ
  hai. Test này cũng không bắt được H1.
- **T-A2:** chưa có test cho các trường hợp: từ gốc không có level; `form_of` trỏ tới entry riêng (bộ lọc catalog ở
  `row-processor.ts:139` chưa có test); rollback entry mới khi gặp `form-of-not-found`.
- **T-A3:** B3E12 chỉ kiểm ở tầng service.
  - Chưa có test HTTP 409 qua quick add.
  - Chưa có test hai request đồng thời khi đang có 999 từ.
  - "Thêm từ catalog vẫn bình thường" đang được kiểm bằng một thao tác của staff, không phải quick add của người học.
- **T-A4:** chưa có test quyền riêng tư cho `has_page`; chưa có test quick add với `form_of` trỏ tới từ riêng của người khác qua HTTP
  (404 và không lưu gì).
- **T-A5:** PATCH với `sense_id` của người khác chỉ kiểm status, chưa đọc lại trạng thái.
- **T-A6:** SR10 chỉ kiểm nhánh thành công.
- **T-A7:** Review Focus 3 còn thiếu hai ca:
  - Lemma 100 code point có emoji.
  - Input NFD dài hơn 300 code point nhưng còn ≤ 300 sau NFC.

---

## Đã kiểm, không thấy vấn đề

**Quyền riêng tư (B3#12):**

- Luật "thấy được" chỉ định nghĩa một lần, ở `src/content/learner/visible-senses.ts`. Nó được dùng ở trang từ, `/v1/words` (cả
  `mine`, `has_private`), `/v1/lookup` (cả `via_inflection`, `has_page`), `cardContent`, `visibleSenseIds`, queue và backlog.
- `form_of` trỏ tới từ riêng của người khác → 404 trước khi ghi (`private-words.service.ts:126-129`). PATCH không đặt được `form_of`;
  CSV chỉ nhận từ gốc catalog.
- Route Bước 2 `/v1/senses*` lọc `scope = 'catalog'`.
- `GET /v1/items?sense_ids` chỉ lọc theo người gọi.

**Ranh giới staff:**

- Mọi đường đọc của staff chỉ lấy catalog (ngoại lệ nhỏ là L6).
- `ON CONFLICT` duy nhất trên `entries` (`entries.service.ts:49`) có ghi `WHERE scope = 'catalog'`.

**Ghi đồng thời:**

- Trần 1.000 từ riêng: lock theo chủ, lấy trước khi `COUNT` (rộng hơn lock theo lemma mà plan nêu, nên an toàn hơn).
- Nhãn `p2`/`p3` sinh dưới cùng lock đó.
- Trần 5 câu: lock theo `(user, sense)`, có test.
- Nhóm thứ 101 và trần 2.000 từ mỗi nhóm: đếm dưới learner lock.
- Thêm cùng một nghĩa đồng thời dùng `INSERT … ON CONFLICT DO NOTHING` rồi đọc lại.

**Quick add:** tất cả hoặc không gì cả, một transaction. Thứ tự lock là learner → chủ từ → câu, giống `deleteMyWord`, nên hai thao
tác không deadlock nhau.

**Reviews:**

- `FOR UPDATE` trên dòng item; tra `review_id` trước và sau khi lock.
- Cùng `review_id`: cùng body → trả kết quả đã lưu; body khác → 400; đua trên hai item → P2002 → 400.

**Lịch ôn:**

- Thang 1/3/7/14/30 không lệch chỉ số.
- Mốc cân nhắc: 60 ngày thì chưa, 61 ngày thì vào; điều kiện này viết giống nhau ở cả 4 chỗ dùng.
- Mức 0 không bao giờ vào danh sách cân nhắc.
- Trần chỉ đếm `section IN ('due','new')` của đúng nhóm và đúng "hôm nay" được truyền vào; không có `CURRENT_DATE`/`now()` trong
  `src/learning`.

**Ngày theo múi giờ:**

- `localDate`/`localTime` đúng ở Kiritimati (UTC+14), `Etc/GMT+12` và New York qua ngày hết DST 2026-11-01; `hourCycle h23`.
- `addDays`/`daysBetween` tính trên nửa đêm UTC, nên không bị DST ảnh hưởng.

**Nhắc học:**

- Một email mỗi ngày địa phương đã lưu: probe R1 chạy đồng thời thật, kết quả đúng.
- `lastAttempt` khớp luật thử lại của BullMQ 6.3.12; stall không làm tăng `attemptsMade`.
- Dòng `failed` chặn phần còn lại của ngày đó.
- `jobId` không có dấu `:`.
- Scheduler và Worker chỉ chạy ở worker process; worker dùng `AppModule`, đã gồm `NotificationsModule`.

**Hạn mức email:**

- Câu SQL trần 80% là nguyên tử; lần trừ bị từ chối không làm tăng bộ đếm.
- Tick và provider dừng ở cùng một con số (`mailLimit`); OTP vẫn tới 100%.
- Bucket tính theo ngày UTC: hệ quả được ghi trong báo cáo agent, không phải lỗi.

**Settings:**

- 409 nguyên tử (`updateMany WHERE version`).
- Kiểm khoảng giá trị, kể cả ràng buộc chéo giữa hai khóa.
- Đổi tên khóa theo D44.
- Lịch sử ghi theo từng khóa đã đổi.
- Chỉ `admin` có `settings.manage`; route có `Idempotency-Key`.

**Mail chuyển sang common:** chỉ đổi đường import; `src/common` không import Identity; có test drift của schema.

**Ranh giới D3 (tôi tự grep):**

- Learning, Notifications và Settings chỉ dùng model và bảng của mình.
- Import từ module khác chỉ qua `content/index.ts`, `settings/index.ts`, `learning/index.ts`, và `IdentityService`.
- Content không import Learning.

**Migration viết tay:**

- CHECK đã có: scope, scope↔owner, pos, basis, `draft_source`, level 0–5, kind/answer/rating/section.
- Partial index đã có: `entries_catalog_key`, `entries_private_key`, `learning_log_user_review_key`.
- `test/common/schema-drift.e2e-spec.ts` kiểm `migrate diff` rỗng.

**Pipeline:**

- `contentHash` của revision không có `formOf` giữ đúng từng byte như Bước 2 (agent tính lại bằng tay, khớp hex trong test).
- Dạng library không bao giờ ghi đè dạng reviewed.
- File xuất: `inflections` chỉ chứa dạng reviewed, `_inflections` chứa dạng library.
- Backfill luôn kết thúc (keyset theo id), kể cả entry không sinh được dạng nào.
- `topic-missing` đã bỏ hết.

**AGID trong bản build:** `pnpm build` copy `agid-inflections.json` vào `dist/content/inflections/`. Gọi từ `dist`:
`go → goes, going, went, gone`, `leaf → leaves`, `good → []` (đúng D46 vòng 2).

**Logs:** không có địa chỉ email, câu ngữ cảnh hay token trong log của notifications và sentences.

**Hiệu năng:** scale test trên CI 304–318 ms (ngưỡng 500 ms). Chỉ đo nhánh catalog, chưa đo nghĩa riêng.

## Chưa kiểm / rủi ro còn lại

- **Chưa chạy toàn bộ e2e ở local**, để không làm máy hết RAM khi các phiên khác đang chạy. Dựa vào CI run `39033545551` cho merge
  `5aa4085` (xanh).
- **Tần suất M9 với SMTP thật:** chưa đo; chỉ đo được ở bước Deploy.
- **Chi phí tick khi có hàng nghìn người học**, mỗi người có nhiều nhóm: `cardsLeftToday` dùng một câu SQL cho 500 người, chưa đo
  (plan đã ghi "Not verified").
- **M6:** chưa có e2e cho chuỗi "cleanup → tick"; chỉ đọc code và chạy `eligibility()`.

## Đề xuất thứ tự xử lý

1. **Luồng A, làm trước task 22:** H1 (lỗi thật, âm thầm, đúng vào luồng duyệt CSV của chủ dự án), rồi M4, M5.
2. **Luồng C, làm trước task 22:** M2 (sửa một dòng).
3. **Cần quyết định trước khi sửa** (chủ dự án hoặc điều phối):
   - M1: chọn (a) hay (b).
   - M3: ký hiệu "không có dạng chia".
   - M6: lưu "lần cuối thấy" bền vững hay chấp nhận.
   - M7: có tính dòng `failed` vào trần không.
   - M8: tra có trả từ gốc chưa có nghĩa không.
   - M9: giữ design 8.3 hay áp luật D37.
   - L1, L2: luật cho từ ưu tiên và từ cân nhắc.
   - L8: revert có hoàn tác dạng chia không.
4. **Việc còn lại:** mức Thấp và test (T-*) có thể gom vào một PR dọn dẹp của từng luồng. Nên đưa probe R1 vào bộ test chính trước
   (T-D1).
