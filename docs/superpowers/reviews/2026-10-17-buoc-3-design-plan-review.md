# Review — design và plan hệ thống Bước 3 (17/10/2026)

Đối tượng: [`../specs/2026-10-16-buoc-3-learning-design.md`](../specs/2026-10-16-buoc-3-learning-design.md) và
[`../plans/2026-10-17-buoc-3-learning.md`](../plans/2026-10-17-buoc-3-learning.md) (bản tách phần hệ thống, 22 task). Người review:
Claude, theo yêu cầu của chủ dự án.

> **Đã sửa 17/10/2026** (chủ dự án duyệt "ok"): R1–R5 và R7–R16 đã sửa vào design và plan theo cột "Sửa đề xuất"; R6 xong qua D43.

Cách kiểm: đọc lại hai file từ đầu; đối chiếu các chỗ plan dựa vào code thật; chạy thử một câu SQL trên Postgres 17 của máy
(`english-learning-postgres-1`, bảng tạm, không đụng dữ liệu).

## Nghiêm trọng — sẽ làm hỏng build, test hoặc dữ liệu cũ nếu làm đúng như plan

| # | Vấn đề | Bằng chứng | Sửa đề xuất |
|---|---|---|---|
| R1 | Task 3 đổi khóa duy nhất của `entries` thành chỉ áp cho catalog, nhưng `ensureEntry` đang ghi `ON CONFLICT (language, lemma, pos) DO NOTHING`. Với khóa chỉ áp cho một phần bảng, câu này lỗi | `entries.service.ts:49`. Thử trên Postgres 17: không có `WHERE` → `ERROR: there is no unique or exclusion constraint matching the ON CONFLICT specification`; thêm `WHERE scope = 'catalog'` → chạy đúng (lần 1 thêm 1 dòng, lần 2 thêm 0) | Task 3 ghi rõ: mọi `ON CONFLICT` trên `entries` thêm `WHERE scope = 'catalog'`; `findUnique({ language_lemma_pos })` ở dòng 51 đổi sang `findFirst` có `scope` |
| R2 | Task 7 đưa `formOf` vào `contentHash`. Hàm này băm một object liệt kê từng trường, nên thêm trường là **mọi revision cũ đổi mã băm**. Sau khi lên bản mới, upload lại đúng file cũ sẽ tạo revision nháp mới thay vì "unchanged" (hỏng B2#10 với dữ liệu đang có). Test B2#10 trong plan chạy trên dữ liệu mới nên không bắt được | `revision-content.ts:64-68` | Chỉ thêm `formOf` vào object băm khi khác `null`; thêm test: mã băm của một revision không có `formOf` giống hệt mã băm tính bằng hàm Bước 2 (giá trị cố định trong test) |
| R3 | Task 7 cho xuất cột `inflections` (cả bản thư viện), và quy định cột không rỗng khi import = bộ đã duyệt. Vậy xuất ra rồi upload lại sẽ **biến dạng chia của thư viện thành "đã duyệt"** mà không ai duyệt. Test "export → upload không đổi" trong plan mâu thuẫn với chính quy định import | Plan Task 7, mục Interfaces | Cột `inflections` khi xuất chỉ ghi bộ đã duyệt; bộ thư viện ghi vào cột `_inflections` (cột bắt đầu bằng `_` bị bỏ qua khi upload, có sẵn từ Bước 2) để người duyệt nhìn thấy |
| R4 | Bảng "Parallel tracks": C (task 14) chờ "task 9 của B", nhưng B chỉ mở **một** PR sau task 20, nên C thực tế bị chặn sau cả 17–20. Tương tự D (task 21) cần task 14 nhưng C mở PR sau task 16 | Plan, mục Parallel tracks | B mở PR 1 ngay sau task 9; C mở PR 1 sau task 14 (15, 16 vào PR 2). Đường găng không đổi, bớt chờ |

## Trung bình — design và plan lệch nhau, hoặc plan tự quyết một hành vi

| # | Vấn đề | Sửa đề xuất |
|---|---|---|
| R5 | Design §10: "mọi thao tác ghi mang `Idempotency-Key`". Plan chỉ gắn `@Idempotent()` cho 4 route (thêm nhanh, thêm cả loạt, học lại, tạo nhóm). Khi đã gắn thì header là bắt buộc (`idempotency.interceptor.ts:38-40` trả 400 nếu thiếu) | Plan theo design: mọi route ghi của người học gắn `@Idempotent()`; riêng `POST /v1/reviews` dùng `review_id` |
| R6 | Plan Task 10: đổi tên nhóm "Mới thêm" → 409. Design chỉ cấm **xóa** nhóm này; việc cấm đổi tên là plan tự thêm, chưa hỏi chủ dự án | **Đã xử lý 17/10:** chủ dự án bỏ hẳn nhóm mặc định (D43); design, plan, `UI-CONTEXT.md` đã sửa |
| R7 | Task 5: từ riêng có `form_of` mà người học không chọn level thì không có level. Design 7.3 nói level của dạng chia mặc định theo từ gốc | Task 5: thiếu level + có `form_of` → ghi level `derived` bằng level hiển thị của từ gốc (giống Task 7) |
| R8 | Task 14 có câu viết lỗi: "Both exclude backlog-free rules as design 6.2" | Viết lại: `mode=due` không lấy từ trong danh sách cân nhắc; `mode=all` lấy mọi từ trong nhóm (kể cả danh sách cân nhắc, theo design 6.2 "mọi từ"); cả hai bỏ nghĩa đã bị thay hoặc gỡ |
| R9 | Hai lần bấm thêm cùng một nghĩa gần như cùng lúc (hai máy, hoặc bấm đúp): khóa `unique(user_id, sense_id)` sẽ ném lỗi thành 500 nếu code chỉ "đọc rồi ghi". Plan chưa có test | Task 12: tạo mục học bằng `INSERT … ON CONFLICT DO NOTHING` rồi đọc lại; test "hai lần thêm đồng thời tạo một mục học" |
| R10 | Task 21: "email 'lâu rồi' tối đa một lần mỗi 7 ngày", nhưng hàm `eligibility` chỉ nhận ngày đã gửi, không biết loại email | Ghi rõ: email "lâu rồi" chỉ gửi khi 7 ngày gần nhất chưa có email nào (mọi loại) |
| R11 | Design còn chữ cũ, lệch D39/D41 và plan: đầu file nói mục 17 "chỉ làm sau giao diện"; sơ đồ và §4, B3E32, §14 ghi `/app/*` (nay `/vi/app`, `/en/app`); §10 để `DELETE /v1/my-words` ở Content (plan chuyển sang Learning vì Content không được gọi Learning); §5.1 thiếu cột `section`, §5.3 thiếu trạng thái `failed`, §5.4 chưa nói "một dòng `global`"; §4 thiếu "Learning đọc Settings"; §19 còn "Mở: milestone (mục 17)" | Sửa design cho khớp; các đề xuất của plan (`section`, `failed`, một dòng `global`) ghi nhãn "Đề xuất của plan" |

## Nhỏ

| # | Vấn đề | Sửa |
|---|---|---|
| R12 | Bảng "Verified": "Accuracy … (Task 6)" — đo độ đúng nay là Task 4 | Đổi thành Task 4 |
| R13 | Task 16 bước 4 còn "Claude then walks"; Global Constraints còn "milestone branch" | "the implementer"; "track branch" |
| R14 | Task 22: "Bước 2.5 baseline (575 unit + 457 e2e API at Bước 2)" lẫn hai mốc | Ghi đúng một mốc: số test API ở cuối Bước 2.5 (đọc từ `docs/deliveries/buoc-2-5.md`) |
| R15 | B3E16: "trang từ gốc hiện nhãn 'nghĩa đã đổi'" — link trỏ theo id của từ gốc nên nghĩa gốc bị thay không ảnh hưởng gì; nhãn này không có chỗ dùng | Rút B3E16 còn "link giữ nguyên" |
| R16 | Task 10: controller của Learning dùng `LearnerContentGuard` (cần `IdentityService`), nên `LearningModule` phải import `IdentityModule` | Thêm một dòng vào Task 10 |

## Câu hỏi cho chủ dự án (trả lời trước, Claude đề xuất sau)

**Đã trả lời 17/10:** Q1 → bỏ nhóm "Mới thêm" (D43). Q2 → tách trang chữ hoa và chữ thường (D42). Cả hai đã ghi vào design và plan.

- **Q1 (R6):** nhóm "Mới thêm" có cho đổi tên không? Hiện design chỉ cấm xóa. Nếu cho đổi tên, nhóm mặc định vẫn là nơi từ rơi vào khi
  không chọn nhóm, chỉ khác tên hiển thị.
- **Q2:** trang từ `GET /v1/words/{lemma}` gộp chữ hoa và chữ thường không? Catalog có hai mục khác nhau `March` (danh từ, tháng) và
  `march` (động từ, B2#8). Gộp thì một trang hiện cả hai; tách thì hai trang riêng. Design "một trang mỗi chữ" chưa nói rõ.

## Đã kiểm, không có vấn đề

- `upsertJobScheduler` có trong BullMQ đã cài (`node_modules/bullmq` `6.3.12`, `queue.d.ts:205`).
- Khóa idempotency gắn với đường dẫn thật (`request.path`, `idempotency.interceptor.ts:60`), nên `DELETE /v1/items/:id` với cùng một
  key cho hai id khác nhau không bị trả nhầm kết quả.
- Phép tính múi giờ trong test Task 11 đúng: 10:30Z ngày 1/11 là 2/11 ở Kiritimati (UTC+14), 31/10 ở UTC−12; New York 05:30Z và
  06:30Z ngày 1/11 đều là 01:30 (giờ mùa hè kết thúc lúc 2:00).
- Không đụng route cũ: `POST /v1/senses/:id/sentences` không trùng `GET /v1/senses/:id`; `/v1/me/reminders` không trùng `/v1/me`.
- Mọi `B3#1–20` và `B3E1–35` có test trong plan, trừ B3E32, B3E34 (đã ghi là của plan giao diện).
