# Review plan Bước 2 (Claude, 12/10/2026)

Đối tượng: [`../plans/2026-10-12-buoc-2-content-pipeline.md`](../plans/2026-10-12-buoc-2-content-pipeline.md), đối chiếu với design đã duyệt
[`../specs/2026-10-12-buoc-2-content-pipeline-design.md`](../specs/2026-10-12-buoc-2-content-pipeline-design.md) và code hiện có trên `dev`.
Lưu ý: chính Claude viết plan này, nên đây **không** phải review độc lập; vẫn nên cho Codex (`gpt-6-astra`) review thêm một vòng như Bước 1.

Đã kiểm thêm trong phiên review: BullMQ `Queue.add` khi Redis từ chối kết nối báo lỗi ngay (1–3 ms, cả với cấu hình ioredis mặc định) →
**không** có nguy cơ upload bị treo khi Redis sập lúc khởi động; nghi vấn này bị loại.

## Lỗi làm sai hành vi (nên sửa trước khi duyệt)

| # | Task | Vấn đề | Hậu quả cụ thể | Sửa |
|---|---|---|---|---|
| R1 | 17 | Plan áp `open-draft-conflict` và `gloss-changed` cho **mọi** dòng. Design (§5, bảng mã lỗi) chỉ áp hai luật này cho dòng **không có `sense_id`** | Luồng D8 hỏng: xuất sense đã publish, sửa nghĩa trong Excel (file có `sense_id` + `revision` đúng), upload → bị loại `gloss-changed`. Sửa tiếp một sense đang có bản nháp tay cũng bị chặn dù `revision` đúng | Ghi rõ: có `sense_id` thì chỉ kiểm `revision` (bằng revision mới nhất); hai luật xung đột chỉ cho dòng khớp theo khóa. Thêm test "dòng có `sense_id` đổi `gloss_vi` của sense đã publish → tạo revision nháp" |
| R2 | 16 | Luật `level-differs-from-source` viết là "nguồn đã có **một** level khác (từ lô trước) → loại" | Entry Octanove có cả C1 và C2 (21 khóa như vậy). Upload lại file Octanove có thêm cột nội dung: dòng C1 thấy C2 cũ → bị loại, dòng C2 thấy C1 cũ → bị loại. Đây đúng là luồng chính của D2 | Chỉ loại khi level của dòng **chưa có** trong các bản ghi của nguồn đó **và** nguồn đó đã có bản ghi từ lô khác. Level đã có → `unchanged`. Thêm test với cặp C1/C2 |
| R3 | 5 + 17 | Lệnh dán `lemma,pos` (B2#52) tạo sense với revision 1 rỗng. Theo cách viết hiện tại revision đó mang `draft_source='ui'` | Dán 50 từ rồi điền nghĩa bằng CSV không có `sense_id` (cách dùng tự nhiên) → mọi dòng bị `open-draft-conflict` | Revision rỗng (không có ô nội dung nào) không được bảo vệ bởi `open-draft-conflict`; hoặc revision do lệnh dán tạo mang `draft_source='csv'`. Đề xuất cách thứ nhất (không đổi nghĩa của cột). Thêm test "dán → upload CSV điền nghĩa" |

## Lỗi kiểm thử (làm test chập chờn hoặc sai)

| # | Task | Vấn đề | Sửa |
|---|---|---|---|
| T1 | 12 | Test B2#38 dùng `FLUSHALL`, test B2E15 dùng `CONFIG SET maxmemory-policy` trên **Redis dùng chung** của global setup. Các file e2e chạy song song → xóa job của file khác, đổi policy của cả suite | Xóa theo prefix (`SCAN MATCH <prefix>:*` + `DEL`); B2E15 dùng một `RedisContainer` riêng trong chính test đó |
| T2 | 1 | Test ma trận quyền gửi rất nhiều request ghi bằng cùng user admin/editor. Luật `user.write` (30/phút) sẽ trả 429. Tùy thứ tự guard, người học có thể nhận 429 thay vì 403 | `testConfig` của suite này nâng `user.write`, hoặc xóa `rate_limit_counters` trước mỗi route; khẳng định thứ tự: permission trước rate limit |
| T3 | 20 | Test B2#70 so số tuyệt đối (9.776 entry…) nhưng không ghi phải chạy trên DB riêng; DB e2e dùng chung có entry của file khác | Ghi rõ `createIsolatedDatabase()` (Global Constraints đã nói "counts", nhưng task cần nói thẳng) |
| T4 | 11–12, 18 | Thời gian chờ backoff giữa các lượt job và giữa các lần thử lại dòng không cấu hình được | B2#34 chờ backoff thật nên test chậm hoặc vượt `testTimeout` 30 s. Thêm `pipeline.jobBackoffMs` và `pipeline.rowRetryBaseMs` (test đặt ~10 ms) |
| T5 | 2–8 | Topic và nguồn `owner` được seed bằng migration. Test content dọn bảng bằng `deleteMany` dễ xóa luôn seed | Thêm helper `resetCatalog(prisma)` xóa bảng catalog nhưng giữ seed; các suite content dùng helper này |

## Chỗ mơ hồ / không nhất quán (nhỏ)

| # | Task | Vấn đề | Sửa |
|---|---|---|---|
| A1 | Global + 11 | Global Constraints nói "khóa theo thứ tự entry key → job row, không bao giờ ngược lại", nhưng `ctx.tx` lấy `FOR SHARE` trên job row **trước**, rồi row processor mới lấy khóa entry. Thực tế không deadlock được (không ai giữ job row độc quyền rồi chờ khóa entry), nhưng hai câu mâu thuẫn | Sửa câu Global: job row (share) → entry key; heartbeat/acquire chỉ khóa job row |
| A2 | 18 | Lọc trước (prefilter) chạy trước kiểm `duplicate-key-in-file` | File có hai dòng trùng hệt: lần 1 dòng sau bị loại, lần 2 dòng sau thành `unchanged` → B2#10 và báo cáo lệch nhau giữa hai lần. Kiểm trùng khóa trong file trước, rồi mới lọc |
| A3 | 16–18 | Không định nghĩa khi nào dòng là `created` và khi nào là `updated` | Đề xuất: `created` nếu dòng tạo entry mới hoặc sense mới; `updated` nếu chỉ thêm level/biến thể/revision cho cái đã có; còn lại `unchanged` |
| A4 | 18 | B2#39 (cùng nguồn thì lô sau chờ lô trước) hiện chỉ đúng **nhờ** concurrency 1 và một worker. D14 nói muốn scale bằng cách thêm worker, nên B2#39 sẽ vỡ đúng lúc scale | Thêm khóa advisory theo `level_source_id` trong handler import (lô sau chờ), hoặc ghi rõ B2#39 phụ thuộc một worker |
| A5 | 2 | Prisma hỗ trợ `@@index([topicCodes], type: Gin)` trong schema, nên index GIN không cần viết SQL tay (bớt một chỗ lệch `migrate diff`) | Chuyển vào `content.prisma` |

## Kết quả (12/10/2026)

Chủ dự án chốt Q1 = (a). Mọi mục R1–R3, T1–T5, A1–A5 đã sửa vào plan. A4 lúc đầu định dùng `pg_advisory_lock` (khóa theo phiên),
nhưng khóa phiên gắn với một connection và pool của Prisma không bảo đảm mở khóa trên cùng connection. Đã đổi sang cột `exclusive_key` trong
`background_jobs` có partial unique index `WHERE status = 'running'` (Task 10, 11, 15). Job bị chặn giữ trạng thái `queued`, và reconciler
thêm lại sau.

## Câu hỏi cho chủ dự án (một câu)

**Q1 — B2#40 "level vẫn được lô khác dùng thì giữ".** `batch_records` chỉ ghi lô **tạo** bản ghi. Nếu lô 2 nhập lại đúng level đó, dòng của lô 2 là
`unchanged` và không để lại dấu vết. Hoàn tác lô 1 sẽ xóa level mà lô 2 cũng "khẳng định". Hai cách:
- (a) **Đề xuất:** hiểu "dùng" là "lô khác đã tạo bản ghi dựa vào nó" (ví dụ sense/level của lô 2 gắn vào entry của lô 1 → giữ entry). Level bị xóa;
  upload lại file lô 2 sẽ tạo lại (khóa dòng của lô 1 đã bị xóa cùng lúc). Không tốn gì thêm.
- (b) Ghi cả việc "chạm" (dòng `unchanged`) vào `batch_records`. Hoàn tác chính xác hơn, nhưng mỗi lần upload lại file 7.799 dòng sinh thêm ~7.800
  bản ghi, và lọc trước hàng loạt (D13) phải ghi thêm.
