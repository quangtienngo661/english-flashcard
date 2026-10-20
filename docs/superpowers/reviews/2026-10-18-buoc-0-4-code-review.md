# Review độc lập code Bước 0–4

Ngày: 18/10/2026. Người review: một phiên Claude không tham gia implement, do chủ dự án mở ("review work của bước 0 - bước 4", chọn
kiểu "đọc code sâu + chạy thử"). **Chỉ review: không sửa code, không commit.**

- **Phạm vi:**
  - `origin/dev` = `dc4cbe0` (Bước 0–3, cùng Bước 4 PR #49 A1 và #51 C1): `apps/api` (src, prisma, test), `apps/admin`,
    `.github/workflows`.
  - Bước 4 PR #50 B1 ở `ba95003`. PR này merge vào `dev` lúc review đang chạy (`94cdb6e`), code giống hệt bản đã review.
  - Bước 4 PR #48 D1 ở `70d6e8e`, PR còn mở. Head hiện tại `30e0fff` chỉ merge `dev` vào, các file Practice không đổi.
- **Ngoài phạm vi:**
  - landing `apps/web`;
  - PR #52 (mở trong lúc review);
  - Bước 4 task 13–20 (chưa có code);
  - những gì chỉ kiểm được khi Deploy.
- **Cách kiểm:**
  1. **Đọc code song song.** 8 agent đọc theo lát:
     - nền chung (FD); DB/SQL/CI (DB); Identity (ID); Content (CT); Pipeline (PL);
     - Learning, nhắc học, Settings (LN); admin web (AD); hai PR Bước 4 (PX).
     
     Mỗi agent đối chiếu code với design của Bước tương ứng. Báo cáo của agent ghi `file:dòng`, mục "đã kiểm, không thấy vấn đề" và
     "chưa kiểm".
  2. **Tự kiểm lại.** Mình đọc lại code của mọi phát hiện mức Cao và Trung bình.
  3. **Chạy test thăm dò (probe) trên Postgres/Redis thật (Testcontainers)** cho mọi phát hiện mức Cao, mọi phát hiện Trung bình chạy
     được, và mọi phát hiện "SUSPECTED" (chưa chắc).
     - Probe chạy trong 3 worktree review riêng, detached (không gắn nhánh), không đụng code của nhánh nào.
     - Mỗi probe có **đối chứng** (control: một ca chắc chắn đúng), để kết quả "0" nghĩa là "không có" chứ không phải "không đo được".
  4. Mức Thấp: chỉ do agent đọc code, **chưa chạy**, trừ AD8 và FD5 đã chạy.
- **Bằng chứng đầy đủ:** [`2026-10-18-buoc-0-4-code-review-evidence/`](2026-10-18-buoc-0-4-code-review-evidence/).
  - 8 báo cáo agent `agent-*.md`.
  - File probe `probes/*.zz-review-probes.*` và output thật `probes/*-output.txt`.
  - Log chạy `probes/*-run.log`.

## Kết luận ngắn

- **3 lỗi mức Cao, cả 3 đã tái hiện bằng probe:**
  1. **Ghi đồng thời làm hỏng cả loạt.** Chỉ cần 10 request ghi có `Idempotency-Key` cùng lúc, cả 10 trả 500 sau 5 giây; với 9
     request thì cả 9 qua.
     - Cùng gốc: "chống gửi trùng" không chống được, cùng một key chạy handler hai lần.
  2. **Bộ nhớ API tăng không giới hạn.** Một learner bất kỳ làm được, bằng cách đổi `timezone` sang các cách viết khác nhau của cùng
     một múi giờ.
  3. **Lỗi 500 không để lại dòng log nào.** Cộng với việc admin không hiện `operation_id` (mã của request), một lỗi 500 hiện không có
     cách nào tra được.
     - Mức gốc của agent là Trung bình. Mình nâng lên Cao vì nó làm hai lỗi trên vô hình khi chạy thật.
- **Trung bình: 16 phát hiện.** 11 đã tái hiện bằng probe, 5 đã xác nhận bằng đọc code. 2 phát hiện bị hạ mức sau khi chạy thử
  (LN1, PL5).
- **Thấp: khoảng 55 phát hiện.** Liệt kê theo lát ở dưới; phần lớn chưa chạy.
- **Tin tốt** (theo kết luận "đã kiểm" của các agent; mình không chạy lại):
  - Không thấy lỗ hổng quyền riêng tư giữa người học.
  - Mọi route `/v1/admin/**` có `@RequirePermission` đúng bảng D6.
  - Khung job nền (lease, `lease_epoch`) đúng.
  - Access token của admin chỉ nằm trong bộ nhớ; refresh token là cookie `httpOnly`.
  - Không có sink XSS (chỗ chèn dữ liệu thành HTML chạy được), không có open redirect.
  - Phần lớn phát hiện của review Bước 3 (17/10) đã được sửa đúng.
- **CI xanh ở mọi PR**, nhưng CI không chạy tới các ca hỏng ở trên:
  - ≥ 10 request đồng thời;
  - handler chậm hơn thời hạn của key;
  - chuỗi múi giờ lạ;
  - nhiều từ riêng của người khác trong DB.

## Bảng tóm tắt: mức Cao và Trung bình

"Kiểm bằng": **probe** = đã chạy và thấy lỗi thật; **đọc** = đã đọc lại code, chưa chạy.

| # | Mức | Bước | Phát hiện (nói gọn) | Kiểm bằng | Chỗ chính (từ `apps/api/` hoặc `apps/admin/`) |
|---|---|---|---|---|---|
| C1 | **Cao** | 0 | Chống gửi trùng (`Idempotency-Key`) chạy handler ngoài transaction giữ key. Hậu quả: 10 request ghi đồng thời → cả 10 trả 500; key hết hạn → gửi lại chạy handler lần 2 | probe | `src/common/idempotency/idempotency.service.ts:30,68,80`; `src/common/db/prisma.module.ts:20-23` |
| C2 | **Cao** | 1 | Mỗi cách viết `timezone` mới được cache mãi trong RAM (~29 KB), learner tự tạo được vô hạn cách viết | probe | `src/common/time/local-date.ts:1-12`; `src/identity/profile/timezone.ts:1-8` |
| C3 | **Cao** | 0 | Lỗi 500 không ghi log (filter bắt mọi lỗi nhưng không log) | probe | `src/common/problem-details/problem-details.filter.ts:12-16` |
| T1 | TB | 2 | Revision đã bị bác (`rejected`) vẫn publish được: qua publish, quick-publish và job publish. Bản nháp sau còn ghép lên nội dung bị bác. Job publish cũng mở lại sense đã ẩn | probe | `src/content/senses/publish.service.ts:89-113`; `senses.service.ts:88-91` |
| T2 | TB | 2–3 | Revert lô xóa entry mà lô sau và người học đang dựa vào: quyết định dạng chia đã duyệt, link `form_of` của nghĩa catalog **và của từ riêng người học**. Báo cáo revert không nhắc gì | probe | `src/content/catalog/revert.service.ts:148-153` |
| T3 | TB | 2 | Upload lại đúng file cũ sau khi staff sửa qua API → tạo nháp CSV mang nội dung cũ, thay vì báo `unchanged` (B2E6). "Publish lô này" sẽ đè bản sửa | probe | `src/content-pipeline/import/row-processor.ts:115-120`; `src/content/senses/import-content.ts:85-104` |
| T4 | TB | 2 | `rejected.csv` của vòng sửa thứ hai không upload lại được (header `_row` bị lặp), vòng sửa D4 gãy từ vòng 2 | probe | `src/content-pipeline/upload/uploads-read.controller.ts:62`; `upload/csv-file.ts:129-138` |
| T5 | TB | 3 | `/v1/lookup` và `/v1/words` quét cả từ riêng của mọi người học: 36 → 798 ms và 60 → 1.474 ms khi có 300.000 từ riêng của người khác | probe | `src/content/words/words.service.ts:78-190`; `learner/visible-senses.ts:9-15` |
| T6 | TB | 4 (PR #48, mở) | Lọc đáp án nhiễu theo từng nghĩa, nhưng đề chỉ hiện chữ, nên một câu có thể có hai đáp án đúng (trái D6) | probe | `src/practice/questions/distractors.ts:46-53` |
| T7 | TB | 4 (PR #50, đã merge) | `practiceItems({ kind: 'all' })` ở quy mô plan (100 nhóm × 2.000 từ) mất 1.267 ms, trong khi ngân sách mở cả phiên luyện là < 1 s | probe | `src/learning/practice/practice-reads.queries.ts:93-101` |
| T8 | TB | 2.5 | Admin: refresh bị lỗi 5xx bị coi là hết phiên → gọi logout thật và đá mọi tab ra (vd. lúc deploy API) | probe | `src/auth/session-store.ts:195-196, 237-240` |
| T9 | TB | 2.5 | Admin: đăng xuất nuốt lỗi server. Giao diện báo đã ra, nhưng cookie refresh (tới 90 ngày) còn sống, F5 là vào lại | probe | `src/auth/session-store.ts:119-128` |
| T10 | TB | 2.5 | Admin không bao giờ hiện `operation_id` cho lỗi lạ (B25#19). Test của B25#19 xanh giả vì chỉ kiểm key | đọc | `src/api/use-error-message.ts:10-12`; `src/api/problem.ts:86` |
| T11 | TB | 2.5 | 429 không khóa nút + đếm ngược ở 5 form: đăng nhập, đổi mật khẩu bắt buộc (khóa 15 phút), đổi vai trò, tạo tài khoản, đăng ký nguồn (B25#18) | đọc | `LoginPage.tsx:39`, `ChangePasswordPage.tsx:59` và 3 file khác |
| T12 | TB | 1 | Rate limit theo IP: mặc định `TRUST_PROXY=false` thì sau proxy mọi người chung một bucket (đăng ký 5/giờ cho cả hệ thống). IPv6 tính theo từng địa chỉ /128 nên dễ lách | đọc | `src/common/rate-limit/rate-limit.guard.ts:26`; `rate-limiter.service.ts:19-21` |
| T13 | TB | 4 (PR #48) | (gộp vào T6) cùng gốc ở câu đúng/sai: "cặp sai" có thể đúng với một nghĩa khác của chữ đang hỏi | probe | như T6 |
| T14 | TB | 3 | (gộp vào T5) tra theo lemma không có index dùng được; giả định "~9.800 entry" của Bước 2 hết đúng khi từ riêng chung bảng | probe | `words.service.ts:111,135` |
| T15 | TB | 2 | (gộp vào T1) job publish publish revision bị bác **sau** lúc chụp và đặt lại `state = 'open'` | đọc | `src/content-pipeline/publish/publish-job.handler.ts:42-52` |
| T16 | TB | 0 | (gộp vào C1) không có giới hạn kích thước pool và thời gian chờ connection | probe | `prisma.module.ts:20-23` |

T13–T16 là cùng gốc với dòng được gộp vào. Chúng có ID riêng trong báo cáo agent (PX1b, DB14, PL4, DB11/FD2); khi sửa thì tính chung.

---

## Mức Cao

### C1 — Chống gửi trùng không chống được, và làm hỏng cả loạt khi có ≥ 10 request ghi cùng lúc (Bước 0)

Agent: FD1 + FD2, và DB10 + DB11. Hai agent tìm ra độc lập.

**Chuyện gì xảy ra (nói thường):**
- Mọi route ghi có `Idempotency-Key` ("khóa chống gửi trùng": app gửi lại cùng khóa thì server không làm lại việc) đều mở một
  transaction để giữ khóa đó. Rồi handler chạy **bên ngoài** transaction này, bằng một connection khác tới DB.
- Vì vậy mỗi request cần **2 connection** cùng lúc.
- Bể kết nối (connection pool) mặc định chỉ có 10 connection, và không đặt thời gian chờ.

**Probe** (`probes/idem-probe-output.txt`), `POST /v1/groups` đồng thời, mỗi request một người học, một key:
```
9 request  → 9 × 201, chậm nhất 72 ms
10 request → 10 × 500, sau 5.046 ms
14 request → 4 × 201, 10 × 500, sau 5.069 ms
```
- 10 transaction giữ key chiếm hết 10 connection, nên handler nào cũng phải chờ connection thứ hai.
- Sau `maxWait` 5 s, Prisma ném lỗi và cả loạt nhận 500.
- Trong 5 giây đó request khác cần DB cũng phải chờ. Điều này suy ra từ cơ chế, chưa đo riêng.
- Mình chạy với 10 người khác nhau. Theo cơ chế, một người gửi 10 request song song (vẫn trong hạn 30 lần ghi/phút) cũng đủ; ca này
  chưa chạy.

**Probe thứ hai** (cùng file): một route thử có hạn key 0,5 s, handler chạy 0,9 s.
```
Gửi lần 1 → 500 sau 549 ms. Sau khi handler xong: đã tạo 1 nhóm, còn 0 dòng key.
Gửi lại đúng key đó → 201, handler chạy lần 2, giờ có 2 nhóm.
Gửi lại khi lần 1 còn đang chạy → 201, hai lần chạy song song, 2 nhóm.
```
Lý do: hết hạn thì Prisma rollback dòng key, nhưng việc ghi của handler (ở connection khác) vẫn commit.

**Vì sao sai:**
- Design Bước 0 B0#2: "the handler runs inside this same transaction".
- B0E1 (chủ dự án chốt 07/10): lần chạy bị gián đoạn trả 409 `idempotency-key-abandoned`, **không chạy lại**. Nhánh này trong code
  không bao giờ xảy ra được.
- system-spec S4 ("no side effect is repeated"), S16.

**Hậu quả:**
- Lúc đông người, các thao tác ghi (thêm từ, tạo nhóm, thêm câu) hỏng hàng loạt.
- Một người cố ý gửi 10 request song song vài lần mỗi phút là đủ làm API trả 500 cho người khác.
- Handler nào đọc ngoài transaction trước (quick add, thêm mục học) thì chờ connection không giới hạn. Nó có thể commit **sau** khi
  client đã nhận 500. Client gửi lại đúng như quy ước → ghi trùng: ví dụ nghĩa riêng thứ hai `p2`, câu trùng, lô upload thứ hai.
- Cộng với C3, các lỗi 500 này không để lại log.

**Hướng sửa (để plan chốt):**
- Ghi và commit dòng key `in_progress` trước khi chạy handler, rồi cập nhật `succeeded` sau. Cách này đúng B0E1 và mỗi request chỉ giữ
  một connection mỗi lúc.
- Hoặc truyền `tx` của key vào handler.
- Ngoài ra đặt rõ `max` và `connectionTimeoutMillis` cho pool.
- Thêm test ≥ 10 request đồng thời và test "handler đã ghi rồi hết hạn → gửi lại".

### C2 — Bộ nhớ API tăng không giới hạn theo chuỗi `timezone` (Bước 1)

Agent: ID1.

**Chuyện gì xảy ra:**
- `PATCH /v1/me` nhận mọi chuỗi mà `Intl.DateTimeFormat` chấp nhận, rồi lưu nguyên văn.
- `src/common/time/local-date.ts` cache một formatter cho **mỗi chuỗi**, không bao giờ xóa.
- Formatter là đối tượng định dạng ngày của Node; mỗi cái tốn khoảng 29 KB.

**Probe** (`probes/api-probe-output.txt`). Mỗi vòng gồm `PATCH /v1/me` rồi `GET /v1/groups`. Mình đếm thẳng số formatter `en-CA` được
tạo ra.
```
PATCH "asia/ho_chi_minh" → 200, lưu nguyên "asia/ho_chi_minh"; "ASIA/HO_CHI_MINH", "+07:00", "-23:59" → 200; "Mars/Base" → 400 (đối chứng)
1.200 vòng cùng một múi giờ:          0 formatter mới, RSS +0 MB
1.200 cách viết hoa/thường khác nhau: 1.200 formatter mới, RSS +34 MB
1.200 vòng cùng một múi giờ (lần 2):  0 formatter mới, RSS +2 MB
lặp lại đúng 1.200 cách viết đó:      0 formatter mới, tức cả 1.200 vẫn nằm trong cache
```
RSS là bộ nhớ của tiến trình.

**Hậu quả:**
- Một tài khoản learner, trong hạn 30 lần `PATCH`/phút, thêm được khoảng 1,2 GB mỗi ngày.
- Vài tài khoản đủ làm API hết RAM và sập; mọi người dùng mất dịch vụ.
- `GET /v1/groups` không có rate limit.
- Worker nhắc học cũng giữ một mục cho mỗi chuỗi nó gặp, nhưng tăng chậm hơn.
- Ngoài ra, dạng offset (`+07:00`) không theo giờ mùa hè. Nếu sau này có SQL `AT TIME ZONE` thì Postgres hiểu ngược dấu (`ASSUMPTION`,
  chưa chạy thử).

**Hướng sửa (nhỏ):**
- Lưu `new Intl.DateTimeFormat(…).resolvedOptions().timeZone` (tên chuẩn) thay vì chuỗi client gửi.
- Cân nhắc từ chối dạng offset.
- Dùng tên chuẩn làm khóa cache hoặc giới hạn cache.

### C3 — Lỗi 500 không để lại dòng log nào (Bước 0)

Agent: FD3. Agent xếp Trung bình; mình nâng lên Cao (lý do ở cuối mục).

**Chuyện gì xảy ra:**
- `ProblemDetailsFilter` có `@Catch()`, tức là bắt mọi lỗi, rồi trả Problem Details nhưng không gọi logger.
- Nest cũng không log thay, vì filter đã bắt hết.

**Probe** (`probes/errors-probe-output.txt`), có đối chứng:
```
Đối chứng: đăng nhập sai mật khẩu → 401, log có 1 dòng "login_failed" (bộ thu log hoạt động)
GET /v1/groups/:id/items với page_token giả nhưng đúng khuôn → 500 (đây cũng là FD5)
Số dòng log ghi trong request đó: 0; số dòng có operation_id của nó: 0
```

**Vì sao nâng lên Cao:**
- Design 2.5 §8 bảo người dùng gửi `operation_id` để tra log API. Nhưng log không có dòng nào, và admin cũng không hiện `operation_id`
  (T10).
- Mọi lỗi 500 lúc chạy thật vì thế vô hình, kể cả C1.
- Lỗi này chặn việc vận hành khi có người dùng thật.

**Hướng sửa:** trong filter, với status ≥ 500, log mức `error` kèm `operation_id`, route và stack (không log body).

---

## Mức Trung bình

### T1 — Nội dung đã bị bác vẫn lên được tay người học (Bước 2; CT1 + PL4)

`publishRevision` không kiểm `revision.status`. Probe (`probes/api-probe-output.txt`):
```
CT1a: sửa → revision 2 "A BAD example."; bác revision 2 → ok; POST /senses/publish revision 2 → "published", revision 2 live
CT1b: bác revision 2 rồi quick-publish không đổi gì → "published", revision 2 live
CT1c: bác revision 2 rồi lưu nháp mới → revision 3 vẫn mang "A BAD example."
Đối chứng: revision 2 nháp (không bị bác) → publish được (đúng)
```
- Job publish đi cùng hàm này. Vì vậy revision bị bác **sau** lúc chụp vẫn được publish.
- Job còn đặt `state = 'open'` cho sense vừa bị ẩn. Phần này mình đọc code, chưa chạy.
- Design Bước 2 §6: không có mũi tên `rejected → published`.
- Hôm nay giao diện admin chưa gọi `/senses/review`, nên chỉ tới được qua API. Nhưng đây là hợp đồng của API.

**Hướng sửa:** từ chối khi status không phải `draft`/`reviewed`; bản nháp mới ghép lên revision chưa bị bác; job không mở lại sense đã ẩn.

### T2 — Revert xóa thứ người khác đang dựa vào (Bước 2–3; PL3)

Probe (`probes/pipeline-probe-output.txt`):
- Lô A nhập `go`, `pork`, `deploy` (chỉ level).
- Lô B ghi `pork,noun,-` ("đã duyệt: không có dạng chia").
- Lô C ghi `went` với `form_of = go/verb:past`.
- Một người học tạo từ riêng `deployed` trỏ `form_of` tới `deploy`.
- Revert A:
```
→ 200 {"removed":{"entry":3,"level":3,…},"skipped":[]}
Sau revert: không còn go/pork/deploy; revision của went: formOfEntryId null, formKind null;
revision từ riêng của người học: formOfEntryId null, formKind null
```
- Luật xóa entry viết từ Bước 2, khi chưa có dạng chia và `form_of`. Bước 3 thêm dữ liệu dựa vào entry (dấu `-` "được lưu bền", link
  của từ riêng "giữ nguyên" B3E16) nhưng không sửa luật revert.
- Một thao tác của staff làm mất dữ liệu trong **từ riêng của người học** mà không ai biết.
- Phần lớn entry CEFR-J chưa có nghĩa (`CLAUDE.md`, 16/10: 7.799 entry, 4 nghĩa), nên revert lô CEFR-J sẽ xóa gần hết catalog cùng
  mọi link trỏ vào.

**Hướng sửa:** entry còn được dùng (dạng chia đã duyệt, có `form_of` trỏ tới) thì giữ, và ghi vào `skipped` kèm lý do.

### T3 — Upload lại file cũ sau khi sửa qua API: không `unchanged` mà tạo nháp nội dung cũ (Bước 2; PL2) — **cần chủ dự án chốt**

Probe (`probes/pipeline-probe-output.txt`):
```
Lô 1 tạo nghĩa "Original example." → publish revision 1
Sửa qua API "Edited example." → publish revision 2
Upload lại đúng file đó → dòng "updated"; revision 3 (nháp CSV) mang lại "Original example."
```
- B2E6 viết: file không đổi upload lại sau khi sửa qua API thì báo `unchanged`, không đụng nội dung live.
- Code chỉ so với revision mới nhất. Row key loại `content` không bao giờ được ghi.
- Bấm "Publish lô này" sẽ publish revision 3 và xóa bản sửa tay mà không cảnh báo.
- Agent ghi chú: sửa kiểu "bỏ qua theo key" thuần túy có thể mở lại lỗi kiểu H1, nên cần chốt luật (xem mục "Cần chủ dự án chốt").

### T4 — `rejected.csv` vòng 2 không upload lại được (Bước 2; PL1)

Probe (hàm `parseUploadFile` thật, `probes/pipeline-probe-output.txt`):
```
Vòng 1: file headword,pos,_row,_error → nhận (1 dòng)
Vòng 2: header vòng 1 + _row,_error (đúng như uploads-read.controller.ts:62 dựng) → từ chối:
  Duplicate header "_row" after trimming and lower-casing.
```
- Vòng sửa D4 ("sửa ô sai rồi upload lại file đó") gãy từ vòng 2: chủ dự án phải tự xóa cột trong Excel.
- Test `test/pipeline/reports.e2e-spec.ts:172` đã khẳng định header lặp mà không thử upload.

**Hướng sửa:** bỏ các cột `_…` cũ trước khi nối thêm `_row`, `_error`; hoặc bỏ qua cột `_…` khi kiểm header trùng.

### T5 — Tìm và tra từ chậm dần theo tổng số từ riêng của mọi người (Bước 3; CT2 + DB14)

Probe (`probes/api-probe-output.txt`): 9.800 nghĩa catalog, rồi thêm 300.000 từ riêng của 300 người khác. Đo median 5 lần.

| Route | Trước | Sau |
|---|---|---|
| `GET /v1/lookup?q=cat-1` | 36 ms | **798 ms** |
| `GET /v1/words?q=cat-12` | 60 ms | **1.474 ms** |
| `GET /v1/words/cat-1` | 14 ms | 30 ms |
| Đối chứng `GET /v1/senses/search` (chỉ catalog) | 32 ms | 45 ms |

- Câu SQL không có điều kiện `scope`/`owner_user_id` trên bảng ngoài. Vì vậy hai partial index (index chỉ phủ một phần bảng) không dùng
  được, và Postgres quét cả bảng.
- Ở quy mô vài người dùng không thấy. Lỗi lộ khi có vài nghìn người dùng. Các route GET này không có rate limit.

**Hướng sửa:** đặt điều kiện thấy được thẳng lên `e`, thêm index `lower(lemma)` và `senses(entry_id)`, và thêm route này vào phép đo
quy mô.

### T6 — Câu trắc nghiệm hoặc đúng/sai có thể có hai đáp án đúng (Bước 4, PR #48 còn mở; PX1)

Probe (unit, `probes/admin-px-probe-output.txt`):
```
Hỏi fast "nhanh"; nhóm có quick#1 "nhanh", quick#2 "nhanh trí", slow "chậm"
→ đáp án nhiễu giữ lại: ["quick:nhanh trí","slow:chậm"] (đổi thứ tự: vẫn giữ quick)
Đúng/sai: hỏi deploy#1; deploy#2 "bố trí (quân)"; arrange "sắp xếp, bố trí" → giữ arrange
```
- Bộ lọc loại `quick#1` (trùng nghĩa con) nhưng không chặn **chữ** `quick`, nên `quick#2` lọt vào.
- Đề chỉ hiện chữ, nên người chọn `quick` cho "nhanh" bị chấm sai, và lượt sai đó tính vào "từ hay sai".
- D6: "Không bao giờ có câu có hơn một đáp án đúng".
- Ca này dễ gặp, vì thêm hàng loạt theo level đưa mọi nghĩa của một entry vào cùng nhóm.

**Hướng sửa:** chặn theo chữ, và sửa trước Task 13. Agent có gợi ý cách lọc hai lượt.

### T7 — Đọc nguồn "Ôn tất cả" đã vượt ngân sách 1 s của cả phiên (Bước 4, PR #50 đã merge; PX2)

Probe (`probes/px2-probe-output.txt`), dữ liệu 100 nhóm × 2.000 từ như phép đo quy mô của Bước 3:
```
Đối chứng GET /v1/groups: 260 ms
practiceItems({ kind: 'all' }):   median 1.267 ms, 200.000 dòng
practiceItems({ kind: 'today' }): median 604 ms, 13.490 dòng
EXPLAIN: SQL 690 ms (JIT tốn 285 ms); 2 SubPlan × 200.000 vòng; sort tràn ra đĩa (~8 MB)
```
- `learning_log` trong probe rỗng, tức là ca tốt nhất.
- Plan Review Focus 2 đặt ngân sách mở **cả** phiên < 1 s (`ASSUMPTION`). Task 14 sẽ đọc cả nguồn rồi mới sắp xếp.

**Hướng sửa:** đổi hai subquery thành `LEFT JOIN` tới bảng đã gộp theo người học; cân nhắc sắp và cắt ngay trong SQL. Nên làm trước khi
viết test quy mô của Task 14.

### T8, T9 — Phiên đăng nhập của admin (Bước 2.5; AD1, AD2)

Lớp phiên này thuộc phần chủ dự án muốn **giữ** khi làm lại giao diện admin, nên vẫn nên sửa.

Probe (store, `probes/admin-px-probe-output.txt`):
```
AD1: request bị 401, refresh trả 503 → gửi POST /v1/auth/logout (1 lần); tab này "signed-out, expired"; tab khác cũng bị đá ra
AD1: mở trang khi refresh trả 503 → "signed-out", không thông báo gì
AD2: logout trả 503 → không báo lỗi, giao diện "signed-out"; tải lại trang (cookie còn hạn) → "signed-in"
```
- **T8 (AD1):** chỉ 401 mới chứng tỏ hết phiên. Lỗi 5xx (API đang restart hoặc deploy) phải giữ người dùng lại, giống cách đã chốt cho
  429 ở B25E30.
- **T9 (AD2):** người tưởng đã đăng xuất ở máy dùng chung, nhưng người kế tiếp chỉ cần F5 là vào được với quyền của họ.

### T10, T11 — Thông báo lỗi của admin (Bước 2.5; AD3, AD4)

Cả hai đã xác nhận bằng đọc code.
- **T10:** `operation_id` được đọc từ phản hồi (`problem.ts:86`) nhưng không component nào hiện. Câu `errors.generic` là "Có lỗi xảy ra",
  không có chỗ cho mã.
  - Test B25#19 chỉ kiểm key nên vẫn xanh. Tiêu chí "Xong khi" của Bước 2.5 đang tính là đạt dù hành vi chưa có.
- **T11:** chỉ upload, publish, hoàn tác và quên mật khẩu có khóa nút theo `Retry-After`.
  - Ca tệ nhất: đổi mật khẩu bắt buộc, sai 10 lần thì khóa 15 phút. Người dùng chỉ thấy "Thao tác quá nhanh", nút vẫn bấm được.

### T12 — Rate limit theo IP khi Deploy (Bước 1; FD4)

Đã xác nhận bằng đọc code; hậu quả tùy cách Deploy.
- Nếu Deploy sau proxy mà để `TRUST_PROXY=false` (mặc định), mọi request mang IP của proxy. Khi đó "5 lần đăng ký/giờ/IP" thành 5 lần
  cho cả hệ thống, và hạn mức thư theo IP cũng vậy.
- IPv6 được tính theo từng địa chỉ /128, nên đổi địa chỉ trong dải /64 là lách mọi giới hạn IP.
- Nên đưa vào checklist Deploy, cùng L17 (`LEARNER_APP_URL`) và AD12 (security header).

---

## Hai phát hiện bị hạ mức sau khi chạy thử

- **LN1 (agent xếp Trung bình, SUSPECTED) → không xác nhận.**
  - Agent lo Prisma sinh `NOT IN (subquery)`, khiến chi phí tăng theo `group_items` của cả hệ thống.
  - SQL thật của Prisma 7.10 là `NOT EXISTS`, và Postgres chạy bằng anti-join có index (34 ms).
  - Có thêm 300.000 `group_items` của 150 người khác: `GET /v1/groups/:id` 19 → 26 ms, trang mục 18 → 26 ms; `DELETE` nhóm 2.000 từ
    trả 204 trong 559 ms.
  - Còn lại một điểm nhỏ: truy vấn `_count` của trang mục quét index `group_items` tới id cuối của trang, nên trang sâu có thể đọc gần
    hết index (chưa đo). Xếp Thấp.
- **PL5 (agent xếp Trung bình, SUSPECTED) → Thấp.**
  - Revert lô CEFR-J thật (7.799 dòng) đã có số đo trong CI: `durationMs 22.660` (run `39117831713`, gọi thẳng hàm, không qua HTTP).
  - Vậy dưới mốc 60 s của proxy trên máy CI. Nhưng plan Task 24 muốn ghi số này vào tài liệu, và chưa ai ghi.
  - Rủi ro còn lại: DB ở xa khi Deploy (mỗi transaction tốn thêm thời gian đi về mạng) → đo lại lúc Deploy.

---

## Mức Thấp

Chi tiết, cơ chế, probe đề xuất nằm trong báo cáo agent tương ứng. "(probe)" là đã chạy; còn lại là agent đọc code, chưa chạy.

**Identity** ([agent-identity.md](2026-10-18-buoc-0-4-code-review-evidence/agent-identity.md)):
- ID2: bước nộp mã reset lộ email nào có tài khoản qua thời gian trả lời (băm Argon2 trước khi kiểm mã).
- ID3: logout bằng refresh token đã xoay trả 204 mà không thu hồi chain. Test B1#20 đang khóa hành vi này.
- ID4: ai biết email cũng giữ được tài khoản ở trạng thái khóa gần như liên tục (10 lần sai mỗi 15 phút); câu "không khóa mãi được" của
  B1E3 không đúng.
- ID5: cờ `must_change_password` tắt được bằng cách reset về đúng mật khẩu tạm.
- ID6: `staff_role` lạ trong DB làm `/v1/me` trả 500; DB không có CHECK.
- ID7: email có ký tự NUL ở `GET/POST /v1/admin/users` → 500.
- ID8: thiếu index `refresh_tokens(chain_id)`, `session_chains(user_id)`, `otp_codes(user_id)`.
- ID9: rate limit của Identity không chỉnh được bằng biến môi trường; `register` 5/giờ/IP chặn một nhóm dùng chung Wi-Fi.

**Content** ([agent-content.md](2026-10-18-buoc-0-4-code-review-evidence/agent-content.md)):
- CT3: revert xóa revision mới nhất nên số `revision_no` bị dùng lại; kiểm "stale" bằng số không phát hiện được.
- CT4: sense thay nghĩa không bị kiểm nhãn ngữ cảnh; publish đụng unique index → 500 và cả lô dừng giữa chừng.
- CT5, CT6: `maskExample` của PR #51 (đề kiểu câu bỏ trống) có các ca sai:
  - `student's` không bị che → đề lộ đáp án;
  - từ nhiều chữ khớp qua dấu phẩy;
  - `Mr. March` bị coi là đầu câu;
  - `a.m.` còn dư dấu chấm sau `___`;
  - `MP3 player` khớp cả "MP4 player";
  - biến thể `am` che cả động từ "am".
  
  Cần sửa trước khi Task 13 dùng.
- CT7: không gộp `’` với `'` khi tìm, tra và tạo từ riêng.
- CT8: API không xóa được `definition_en`.
- CT9: trần 1.000 từ riêng chỉ đếm entry, không giới hạn số nghĩa trong một entry.

**Pipeline** ([agent-pipeline.md](2026-10-18-buoc-0-4-code-review-evidence/agent-pipeline.md)):
- PL5: đã hạ mức, xem trên.
- PL6: ký tự NUL (hoặc biến thể > 2.000 ký tự) ở vài cột làm hỏng cả lô sau 3 lần thử, thay vì chỉ loại một dòng.
- PL7: `generateInflections` ném lỗi với lemma trùng tên thuộc tính JS (`constructor`, `valueOf`, `toString`) → lô `failed`, backfill kẹt.
- PL8: tên file tiếng Việt bị lưu sai mã ("tá»« vá»±ng.csv").
- PL9: rác của Excel (dòng `,,,`, ô tiêu đề trống) không được bỏ qua.
- PL10: API parse cả file trước khi đếm dòng: 500.000 dòng làm event loop đứng 578 ms, heap +134 MB.
- PL11: nguồn AGID được nhận làm nguồn level.
- PL12: cảnh báo theo dòng mất nếu worker chết giữa lô.
- PL13: tiền tố chống công thức `'` chỉ được gỡ ở cột nội dung, nên lemma kiểu `-ism` xuất rồi nhập lại thành entry rác `'-ism`.
- PL14: `pnpm smoke:buoc-2` hỏng từ Bước 3 (đọc cột theo vị trí), trong khi đây là bước 2 của quy trình kiểm Bước 2.

**Learning, nhắc học, Settings** ([agent-learning.md](2026-10-18-buoc-0-4-code-review-evidence/agent-learning.md)):
- LN1: đã hạ mức, xem trên.
- LN2: lỗi DB bên trong `provider.send` bị coi là "không rõ đã giao": mất email hôm đó, và còn chặn hôm sau qua `min_gap_days`.
- LN3: kiểm "nghĩa thấy được" chạy ngoài transaction khi thêm từ và thêm nhanh; đua với xóa từ riêng thì để lại mục học trỏ tới nghĩa đã
  xóa.
- LN4: cùng một nhóm nhưng `total` và `item_count` lệch nhau; `cells[0].due` vẫn lọc theo ngày, trái luật M2.
- LN5: ví dụ B3E2 trong design sai với từ mức 0 (code làm đúng luật 6.1).
- LN6: cảnh báo `mail_budget_80` dùng `ceil`, còn trần nhắc học dùng `floor`, nên có thể không bao giờ có cảnh báo.
- LN7: `DELETE /v1/items/:id` không khóa item trước khi xóa (SUSPECTED, phần còn lại của L4).
- LN8: design 8.3 lệch code về `min_gap_days`; code đúng D37.

**Admin web** ([agent-admin.md](2026-10-18-buoc-0-4-code-review-evidence/agent-admin.md)):
- AD5: `/me` lỗi ngay sau đăng nhập → form đứng yên, không có câu nào.
- AD6: tab ở `/change-password` không kiểm lại `/me` khi được focus (B25#7, B25E26).
- AD7: tab đã đăng nhập lặng lẽ chạy API bằng tài khoản khác (đăng nhập ở tab khác) mà vẫn hiện danh tính cũ.
- AD8 (probe: sau khi đăng xuất, `/me` chậm trả về đưa tab quay lại "signed-in" mà không có token).
- AD9: panel chi tiết vẫn hỏi lại mỗi 2 s khi lời gọi lỗi.
- AD10: lỗi của các danh sách phụ (topic, lô, nguồn level) bị nuốt: ô chọn rỗng, không báo.
- AD11: câu "chưa tạo tài khoản" hiện cả ở "Quên mật khẩu".
- AD12: bản deploy tĩnh chưa có security header (CSP, `frame-ancestors`, `nosniff`, `Referrer-Policy`).
- AD13: trạng thái B25E30 trong tài liệu đã cũ.

**Nền chung** ([agent-foundation.md](2026-10-18-buoc-0-4-code-review-evidence/agent-foundation.md)):
- FD5 (probe: `page_token` giả nhưng đúng khuôn → 500 thay vì 400; đối chứng id sai trong đường dẫn → 400), ở 3 route. Đây cũng là
  DB15.
- FD6: lỗi của body-parser (413, 415, JSON hỏng) trả về không có header CORS, nên giao diện web chỉ thấy "lỗi mạng".
- FD7: thông báo lỗi parse JSON có thể chứa một đoạn body bị trả lại; unit test kiểm một đường không có trong app thật.
- FD8: `failed_permanent` không bao giờ được ghi; SR8 chưa làm.
- FD9: log của worker nhắc học thiếu `operation_id`.
- FD10: job dọn dẹp chỉ chạy lần đầu sau 1 giờ chạy liên tục, nên tiến trình hay restart sẽ không bao giờ dọn.
- FD11: regex che log chỉ bắt `contextSentence` viết camelCase; `context_sentence` và các trường Bước 4 (`prompt`, `meaning`,
  `sentence`) không được che.
- FD12: `pnpm admin:grant` nuốt lỗi cấu hình.

**DB, SQL, CI** ([agent-db-ci.md](2026-10-18-buoc-0-4-code-review-evidence/agent-db-ci.md)):
- DB12: Pipeline đọc thẳng bảng của Content (`entries`, `entry_inflections`), trái D3. Chỉ đọc; việc ghi vẫn đi qua `ContentService`.
  Agent xếp Trung bình, mình hạ Thấp.
- DB13: thiếu index trên các cột khóa ngoại `senses(entry_id)`, `senses(replaces_sense_id)`, `context_sentences(sense_id)`,
  `refresh_tokens(chain_id)`.
- DB16: `Idempotency-Key` không giới hạn độ dài → 500 (SUSPECTED).
- DB17: CI pin action theo tag thay vì SHA, image `mailpit` không pin, không khai báo `permissions`; `deploy-web` chạy tay được từ mọi
  nhánh.
- DB18: đổi CHECK bằng `DROP`+`ADD` và `CREATE INDEX` không `CONCURRENTLY` sẽ khóa bảng lớn khi đã có dữ liệu thật.
- DB19: cột mảng cho phép NULL trong DB, trong khi code coi là luôn có giá trị.

**Bước 4 (PR #48, #50)** ([agent-buoc-4-prs.md](2026-10-18-buoc-0-4-code-review-evidence/agent-buoc-4-prs.md)):
- PX3: `practiceReview` gặp `review_id` đã dùng thì trả `applied`, không so nội dung.
- PX4: `practiceReview` mượn thêm 2 connection trong transaction của người gọi. Cùng loại với C1; phải tính khi sửa C1 (SUSPECTED).
- PX5: thứ tự `overdue_first` xếp từ mới như thể quá hạn lâu nhất.
- PX6: DB nhận `types` rỗng/NULL/trùng và `hint_level` ngoài 0–2.
- Cổng `PRIVATE_SENSES_CLEANUP` hiện chưa ai cung cấp (`@Optional()`); Task 19 làm việc đó. Phải nhớ cung cấp ở **cả** API lẫn worker,
  nếu không việc xóa từ riêng sẽ lặng lẽ bỏ qua dữ liệu luyện.

---

## Trạng thái các phát hiện cũ

**Review code Bước 3 (17/10)**:
- **Đã sửa:** H1, M1, M2, M3, M4, M6, M7, M8, L1, L2, L3, L5, L6, L10, L15, L16; cùng các test T-C1…T-C8 và T-D1…T-D6.
- **M9:** đã sửa, còn một lỗ phụ (LN2).
- **L12:** đã sửa theo quyết định M8.
- **L13:** đã sửa; tài liệu ghi ngược lại (LN8).
- **Sửa một phần:**
  - M5: revert vẫn xóa level staff vừa xác nhận; đường CSV của nguồn chủ dự án vẫn để `derived`.
  - L4: còn `forget` và bỏ khỏi nhóm cuối, xem LN7.
  - L7: hash vẫn chứa link cũ; báo cáo revert không nhắc; xem thêm T2.
  - L9: còn cùng loại lỗi ở cột khác, xem PL6.
  - L14: lệch `ceil`/`floor`, xem LN6.
  - L19: code đã sửa, chưa có test.
- **Đã xử lý theo quyết định:** L8.
- **Còn mở:**
  - L11: gợi ý catalog chưa bao giờ tới người học.
  - L17: `LEARNER_APP_URL` bắt buộc; cần vào checklist Deploy.
  - L18: dạng chia library sai trên dữ liệu thật; sửa bằng CSV.
  - P1: xuất "từ chưa có nghĩa" không kèm level. Thêm chi tiết mới: cách xuất từng level không xuất được entry **không có level**.

**Review tổng kết Bước 1 (07/10)**:
- Đã sửa: R1, R2, R4.
- R5: đóng theo quyết định chủ dự án.
- **R3 còn mở:** `otp_failure_windows` và `mail_budget_buckets` không có job dọn.
- Rủi ro "một user chiếm hết pool": nay đã thành C1.

## Test còn thiếu (quan trọng)

- **C1:** không test nào có ≥ 10 request idempotent đồng thời (lớn nhất là 5). Không test "handler đã ghi rồi key hết hạn → gửi lại". Test
  B0E1 tự chèn dòng `in_progress` bằng tay, trạng thái mà code thật không tạo ra.
- **C2:** không test cách viết `timezone` (offset, hoa/thường) hay giới hạn cache.
- **T1:** không test publish, quick-publish hay job từ chối revision `rejected`.
- **T2, T3, T4:**
  - Revert chưa có ca entry đang được dùng.
  - B2E6 chỉ thử sửa một cột mà file không có.
  - `rejected.csv` vòng 2 chưa bao giờ được upload lại.
- **T5, T7:** phép đo quy mô chỉ đo `GET /v1/groups` (không có nhật ký, không có người học khác); chưa đo tìm/tra từ với từ riêng, cũng
  chưa đo nguồn luyện.
- **T6:** test B4#3 chỉ có một nghĩa cho mỗi chữ ứng viên.
- **T10, T11:** test B25#19 kiểm key thay vì chữ hiển thị. B25#18 chỉ có ở 3 form. Không test refresh 5xx hay logout lỗi.
- B4E38 chỉ thử nâng `default`, chưa thử hạ `max` xuống dưới `default`.
- Test drift (so schema Prisma với migration) không thấy CHECK, partial index, trigger. Test B0E6 gọi một route `@Public` nên luôn xanh.

## Tài liệu và quy trình

- **`CLAUDE.md` và `HANDOFF` lệch thực tế.** Trên cả `dev` lẫn `main`, hai file vẫn ghi "tiếp theo là Bước 3" và "chưa chọn vị trí
  Deploy". Thực tế:
  - Bước 3 xong, Bước 4 đang làm;
  - Deploy dời về "trước ra mắt" (D3 vòng 3, 18/10);
  - người dùng thật chỉ tìm khi app hoàn chỉnh (D12).
  
  Phiên mới nào cũng đọc `CLAUDE.md` đầu tiên, nên sẽ bắt đầu với bối cảnh sai.
- Trạng thái B25E30 trong design 2.5, `buoc-2-5.md` và `CLAUDE.md` đã cũ (AD13).
- Design Bước 3 có hai chỗ lệch code: B3E2 (LN5) và §8.3 (LN8).
- `pnpm smoke:buoc-2` hỏng (PL14), nhưng vẫn nằm trong quy trình kiểm của Bước 2.
- **CI xanh của PR chưa chắc phản ánh kết quả merge.** Ví dụ: PR #48 chạy CI lúc 09:58, trước khi #49, #51 merge (10:11). Sau đó PR này
  đã merge `dev` vào và CI xanh lại. Nhưng "require branches to be up to date" vẫn chưa bật (`CLAUDE.md`: việc của chủ dự án trong
  GitHub settings).
- **File chứa thông tin đăng nhập có thể bị commit nhầm.** File chưa commit `.verify-b25-accounts.md` ở gốc repo có dòng chứa
  password/token/secret và không nằm trong `.gitignore`; `git add -A` là bị commit. Mình chỉ đếm dòng, không đọc nội dung.

## Cần chủ dự án chốt

Theo luật "chủ dự án trả lời trước" (D27), mục này chỉ nêu bối cảnh, không đề xuất.

1. **T3 (B2E6):** upload lại một file không đổi sau khi đã sửa qua API thì nên làm gì?
   - Design viết: báo `unchanged`, không đụng nội dung live.
   - Code hiện: tạo nháp mang nội dung của file.
   - Ràng buộc: sửa theo kiểu "bỏ qua theo key" có thể mở lại lỗi kiểu H1 (upload lại file cũ không khôi phục được dạng chia).
2. **ID4:** chấp nhận việc người biết email giữ được tài khoản ở trạng thái khóa gần như liên tục, hay đổi luật khóa? Đây là đánh đổi
   giữa an toàn mật khẩu và việc người dùng thật bị khóa ngoài.
3. **FD8 (SR8):** lỗi vĩnh viễn hiện nhả key và cho chạy lại, trong khi spec nói trả lại kết quả đã lưu. Giữ spec hay đổi spec theo code?
4. **T5:** sửa tìm/tra từ ngay, hay khi số người dùng tăng? Ở quy mô vài người không thấy chậm.
5. **P1** (từ Bước 3, vẫn mở) và **L11** (gợi ý "dùng bản catalog" khi thêm từ riêng chưa bao giờ hiện cho người học).

## Chưa kiểm, rủi ro còn lại

- Mức Thấp chưa chạy probe (trừ AD8, FD5): đó là kết luận đọc code của agent. Các agent đọc tên test của nhiều file nhưng không đọc hết
  thân test.
- C1: chưa chạy ca "một người gửi 10 request song song", chưa đo request khác bị chờ trong lúc pool cạn.
- C2: đã đo bằng RSS và số formatter. Chưa chạy tới lúc API thật sự hết RAM.
- Chỉ kiểm được khi Deploy:
  - SMTP thật;
  - proxy, IPv6, `TRUST_PROXY`;
  - kích thước pool với DB ở xa;
  - thời gian revert qua mạng;
  - security header của admin.
- Không review: landing `apps/web`; PR #52; Bước 4 task 13–20. Chưa đo hiệu năng với `learning_log` nhiều tháng.

## Đề xuất thứ tự xử lý

1. **C1** (một lần sửa cho cả hai hậu quả) và đặt rõ kích thước pool. Lưu ý PX4 cùng loại.
2. **C3 + T10**: log mọi lỗi 500 và hiện `operation_id` ở admin, để lỗi sau này tra được.
3. **C2**: chuẩn hóa `timezone` (sửa nhỏ).
4. **T1**: chặn publish revision bị bác.
5. **T6 trước Task 13** (PR #48 còn mở; gộp CT5/CT6 của `maskExample`). **T7 trước test quy mô của Task 14.**
6. **T2, T4**; T3 sau khi chủ dự án chốt luật.
7. **T8, T9, T11**: lớp phiên và thông báo của admin (phần được giữ khi làm lại giao diện).
8. **Checklist Deploy:** T12, AD12, L17, đo lại revert (PL5), DB17, DB18.
9. **Tài liệu:** `CLAUDE.md`/`HANDOFF`, B25E30, B3E2, §8.3, `smoke:buoc-2`.

## Chạy lại probe

Các probe chưa nằm trong bộ test sản phẩm. Muốn chạy lại:
1. Chép file từ `probes/` vào worktree có node_modules:
   - `*.e2e-spec.ts` của API → `apps/api/test/review/`;
   - `admin-session.zz-review-probes.test.ts` → `apps/admin/src/auth/`;
   - `practice-*.spec.ts` → worktree PR #48 hoặc #50.
2. Chạy (từ `apps/api`):
   ```
   NODE_OPTIONS=--expose-gc PROBE_OUT=<file> pnpm exec vitest run --config ./vitest.config.e2e.ts --fileParallelism=false test/review/
   ```
   Admin: `pnpm exec vitest run src/auth/zz-review-probes.test.ts --silent=false --reporter=verbose`.

Ba worktree review (`.claude/worktrees/review-buoc-0-4`, `review-pr48`, `review-pr50`) còn giữ để chạy lại; xóa bằng
`git worktree remove`.
