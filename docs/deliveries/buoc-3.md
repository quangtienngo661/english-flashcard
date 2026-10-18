# Bước 3 — plan tóm tắt, phần hệ thống (17/10/2026)

Ảnh chụp lúc trình plan, chưa duyệt. Plan đầy đủ: [`../superpowers/plans/2026-10-17-buoc-3-learning.md`](../superpowers/plans/2026-10-17-buoc-3-learning.md);
design: [`../superpowers/specs/2026-10-16-buoc-3-learning-design.md`](../superpowers/specs/2026-10-16-buoc-3-learning-design.md).
Plan này **chỉ có phần hệ thống** (API, worker, database). Giao diện (app người học, trang admin) có plan riêng, làm ở phiên khác.

**Không còn câu chờ chủ dự án.** "Xong khi": chủ dự án tự báo khi Bước 3 xong (D45). Nguồn dạng chia: AGID, `compromise` dự phòng cho
động từ và danh từ, đo trước (D46).
Đã chốt 17/10: G2 → hai email nhắc cách nhau ít nhất N ngày, admin chỉnh 1–7, mặc định 2 (D44).

**Luồng làm song song:** A Content (1–8) · B Nền tảng (9, 17–20) · C Learning (10–16) · D Nhắc học (21–22). A, B và phần đầu của C
chạy cùng lúc từ ngày đầu; C chờ A ở task 12 và 14; D chạy sau cùng. Mỗi luồng mở PR ngay ở chỗ luồng khác cần (B sau task 9, C sau
task 14), không đợi cả luồng xong.

**Thay đổi sau review 17/10:** bỏ nhóm mặc định "Mới thêm" (D43); trang từ tách chữ hoa, chữ thường (D42); sửa 15 điểm của
[review](../superpowers/reviews/2026-10-17-buoc-3-design-plan-review.md).

**M1 — Content (luồng A)**
1. Cho publish nghĩa không có chủ đề.
2. API xuất CSV các từ chưa có nghĩa.
3. Thêm phạm vi "từ riêng" cho entry; mọi chỗ đọc của staff và các API học cũ chỉ thấy catalog.
4. Thêm bảng dạng chia và hàm sinh dạng chia (đo độ đúng của `compromise` trước khi chọn).
5. Cho người học tạo, sửa từ riêng (trần 1.000 từ); thêm hàm cho Learning kiểm nghĩa nào người học được thấy.
6. Lưu câu ngữ cảnh (tối đa 5 câu mỗi nghĩa).
7. Đưa dạng chia và link "dạng chia của" vào luồng CSV; job sinh dạng chia cho các từ đang có.
8. Trang từ kiểu Cambridge, tìm theo chữ, tra cho thêm nhanh; kiểm milestone M1.

**M2 — Learning và Settings (luồng B, C)**
9. Module cài đặt admin chỉnh được qua API, có khoảng cho phép, version và lịch sử; quyền `settings.manage`.
10. Bảng dữ liệu Learning và quản lý nhóm (xóa nhóm bỏ đúng các từ chỉ thuộc nhóm đó).
11. Luật lịch ôn và cách tính "hôm nay" theo múi giờ (hàm thuần, test theo bảng 6.4).
12. Thêm từ vào nhóm, thêm cả loạt, bỏ khỏi nhóm, bỏ khỏi việc học, đọc trạng thái học.
13. Ghi lượt ôn và nhật ký (chống gửi trùng, khóa dòng khi hai máy bấm cùng lúc).
14. Số liệu trang chủ và danh sách thẻ ôn theo trần mỗi nhóm.
15. Danh sách cân nhắc và "Học lại".
16. Thêm nhanh trong một transaction, xóa từ riêng; kiểm milestone M2.

**M3 — Nhắc học (luồng B, D)**
17. Chuyển phần gửi email và hạn mức email sang `common`, thêm ngưỡng 80%.
18. Identity cho đọc danh sách người có thể nhắc và email đã xác minh.
19. Bảng nhắc học và API bật/tắt nhắc của người học.
20. Cổng `NotificationProvider`, bản email, lớp chọn kênh, mẫu email nhắc (link `/vi/app/settings` hoặc `/en/app/settings`).
21. Lịch nhắc 15 phút một lần, mỗi người tối đa một email mỗi ngày địa phương (3 trạng thái gửi).
22. Kiểm cuối toàn hệ thống, chạy tay, ghi as-built.

# Bước 3 — as-built, phần hệ thống (18/10/2026)

Kết quả chạy tay chi tiết (từng bước, bằng chứng, phát hiện): [`buoc-3-test-flow.md`](buoc-3-test-flow.md). Design:
[`2026-10-16-buoc-3-learning-design.md`](../superpowers/specs/2026-10-16-buoc-3-learning-design.md); decisions D1–D48:
[`2026-10-16-buoc-3-learning-decisions.md`](../superpowers/decisions/2026-10-16-buoc-3-learning-decisions.md); plan:
[`2026-10-17-buoc-3-learning.md`](../superpowers/plans/2026-10-17-buoc-3-learning.md).

**Trạng thái:** code phần hệ thống (22 task, 4 luồng) đã merge vào `dev` qua PR #29–#43, docs design/plan ở PR #28. Chưa lên `main`.
Theo D45 (G5), **chủ dự án tự báo khi Bước 3 xong**; mục này chỉ giao kết quả. Phần giao diện (app người học, trang admin "Thông
báo & giới hạn", lựa chọn xuất "từ chưa có nghĩa" trong admin) thuộc plan riêng, không nằm ở đây.

**Đã làm, theo PR (tất cả vào `dev`, CI xanh trước khi merge):**

| PR | Nội dung |
|---|---|
| #28 | Docs: design, decision record, plan hệ thống |
| #29 | Settings: cài đặt admin có khoảng cho phép, `version`, lịch sử; quyền `settings.manage` (Task 9) |
| #30 | Email và hạn mức email chuyển sang `common`, ngưỡng 80%; Identity cho đọc người có thể nhắc; bật/tắt nhắc của người học; `NotificationProvider` + bản email (Task 17–20) |
| #31 | Content A1: publish không cần chủ đề, xuất entry chưa có nghĩa, phạm vi từ riêng, bảng dạng chia, từ riêng (Task 1–5) |
| #32 | Content A2: câu ngữ cảnh, cột `inflections`/`form_of` trong CSV, trang từ, tra cho thêm nhanh (Task 6–8) |
| #33 | Learning C1: nhóm, mục học, ghi lượt ôn, số liệu trang chủ, hàng ôn (Task 10–14) |
| #34 | Lịch nhắc mỗi 15 phút và job gửi, tối đa một email mỗi ngày địa phương (Task 21) |
| #35 | Docs: quyết định nguồn dạng chia (D46) và bản nghiên cứu |
| #36 | Learning C2: danh sách cân nhắc, "Học lại", thêm nhanh, xoá từ riêng; phép đo quy mô chạy riêng trên CI (Task 15–16) |
| #37 | Content A3: dạng chia từ AGID (+ `compromise` dự phòng cho động từ, danh từ; `pluralize` lọc danh từ không đếm được, D47), job backfill, dạng chia của từ riêng (Task 4b, 7) |
| #38–#43 | Sửa theo review độc lập code (17/10): #38 luồng D (lỗi SMTP theo mức chắc chắn đã giao hay chưa), #39 luồng B (`last_seen_at`, dọn idempotency, log hạn mức), #40 luồng C (lịch, trần, thêm cả loạt, khoá mục), #41 L6, #42 luồng A (H1, M1a, M3, M4, M5, M8 và các mục thấp), #43 `form_of` `-` không kèm `sense_id` |

**Số test** (CI của PR #43, run `39049047148`, 17/10/2026; code giống `dev` `c1f775d`): API **681 unit + 688 e2e** + 1 phép đo quy
mô; admin 290 unit + 138 e2e API giả (53 skipped) + 8 e2e API thật; tất cả xanh. Cuối Bước 2.5 API là 578 + 475. Số của admin tăng do UI
refresh B và bản sửa phiên (PR #23, #24, hai PR duy nhất sửa `apps/admin` sau Bước 2.5), không do Bước 3. Gate §1 không chạy lại trên máy ở lần này (luật chung: máy từng hết RAM;
CI là cổng), chỉ `pnpm build` và migrate trên DB mới, cả hai xanh.

**Phép đo quy mô (Review Focus 5):** 100 nhóm × 2.000 từ, `GET /v1/groups` trên CI: 347 / 320 / 335 ms, median **335 ms** < 500 ms. Ngưỡng
500 ms vẫn là `ASSUMPTION`. Trên máy dev khi chạy song song với cả bộ e2e từng đo 654 ms (PR #36), nên phép đo chạy riêng một bước.

**Chạy tay trên DB mới với file CEFR-J 1.5 thật (18/10/2026):** 15/15 bước đã chạy, 14 đạt, bước 4 đạt một phần. Import 7.799 entry
trong 196 giây, 0 dòng loại; điền nghĩa, upload lại (giữ dạng chia đã duyệt, H1; `-` không bị backfill điền lại, M3), publish 7 nghĩa không
chủ đề; learner tra `went` ra `go`, thêm nhanh, ôn, danh sách cân nhắc, "Học lại", tạo rồi xoá sạch từ riêng; từ riêng của learner khác không
lộ. Nhắc học: đặt `send_time` qua API, đúng một email cho learner đã xác minh còn thẻ, không email cho learner chưa xác minh, không gửi
lại ở các tick sau; SMTP không tới được thì thử lại sau 60 s rồi 120 s và gửi đúng một email khi SMTP trở lại.

**Phát hiện ở lần chạy tay** (chi tiết và cách tái hiện ở `buoc-3-test-flow.md` §3):
- P1 — Xuất "từ chưa có nghĩa" không kèm `level` trả 400 `export-too-large`: 7.799 entry vượt `EXPORT_MAX_ROWS=5000` (mặc định trong
  `.env.example`). Xuất theo từng level thì đủ 7.799 dòng (A1 1.164, A2 1.411, B1 2.446, B2 2.778). Code chạy đúng giới hạn đã đặt; cần
  chủ dự án chọn: giữ và để màn xuất bắt chọn level, hay nâng giới hạn riêng cho lựa chọn này.
- P2 — Lần thử gửi nhắc học lỗi SMTP tạm thời không ghi log nào (chỉ thấy trong BullMQ). Design không đòi; cần chủ dự án chọn có thêm log
  `reminder_retry` trước Deploy không.
- Lệch kịch bản, không phải lỗi: import CEFR-J tự sinh dạng chia library (9.262 dòng cho 5.227 entry) nên backfill trên DB mới không thêm gì;
  tính từ không có dạng so sánh library (D46 vòng 3), chỉ có dạng đã duyệt qua CSV.

**Việc còn mở:**
- **L7 (phần còn lại):** xoá entry gốc giờ xoá cả `form_kind` (PR #42), nhưng hash nội dung đã lưu vẫn chứa link cũ (không tính lại); theo
  review, upload lại một file không đổi có thể tạo revision thừa. Chưa kiểm ở lần chạy này.
- **L18:** dạng library sai trên dữ liệu thật, thấy lại ở lần chạy này: `furniture → furnitures`, `Internet → Internets`, `meat → meats`,
  `pork → porks`, `mother-in-law → mother-in-laws`, `leave → leaved` (cạnh `left`), `lie` gộp `lay`/`lied`. Sửa bằng ô `inflections` đã
  duyệt (hoặc `-`) trong lúc chủ dự án duyệt CSV.
- **L19:** thêm câu đúng lúc đang xoá chính từ riêng đó giờ trả 404 thay vì 500 (PR #42) nhưng **chưa có test** (cần hai transaction xen
  nhau).
- **Ngưỡng 500 ms** của phép đo quy mô và các con số mặc định, khoảng cho phép của Settings (design §9) vẫn là `ASSUMPTION`.
- Chỉ kiểm được khi Deploy (design §14): SMTP thật, tần suất lỗi "không rõ đã giao chưa" (M9), lỗi SMTP 5xx thật.
- Chưa làm trong PR này: §17 as-built của design và `.env.example` (plan Task 22, Step 3); `CLAUDE.md` và HANDOFF §2 thuộc PR docs nhỏ
  của design §18.
