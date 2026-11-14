# Mockup AI workspace — 31/10/2026

Mở `index.html` bằng trình duyệt. Đây là prototype độc lập, chưa phải implementation của app. Dữ liệu chỉ tồn tại trong memory của tab; reload để reset. Không gọi API hay nhà cung cấp AI.

## Các luồng để duyệt

1. **Cấu hình → Các bản nháp**: ba nháp mẫu, menu Sửa / Chạy thử / Chạy bộ ví dụ / Publish / Nhân bản / Xóa. Nút Tạo nháp mở form tên rồi chuyển vào trang sửa. Nháp đang chạy không được xóa.
2. **Trang sửa nháp**: đổi model/prompt, không lưu, bấm Chạy thử → tìm từ và lọc CEFR → tick tối đa 5 ví dụ dev. Kết quả minh họa có nhãn snapshot chưa lưu. Chạy bộ ví dụ tạo thêm batch đang chạy; nháp vẫn chưa lưu.
3. **Cấu hình → Lịch sử**: hai mục Publish & rollback / Lịch sử prompt. Bản đang chạy luôn cùng panel bên phải trên desktop. Mobile gọn thành panel mở rộng phía trên.
4. **Bộ ví dụ**: tick từng dòng, tick cả trang, chọn toàn bộ kết quả đang lọc, giữ lựa chọn khi chuyển trang, xác nhận số lượng trước khi xóa. Ví dụ held-out vẫn bị ẩn. Filter từ/level chỉ áp dụng dev để không suy ra nội dung held-out.
5. **Chi phí**: một dòng một batch Eval / Chạy thử / Judge, mở chi tiết tổng token/retry/chi phí và prompt snapshot. Có bộ lọc loại/trạng thái. Link Tổng hợp giải thích báo cáo cũ được giữ.

## Những gì chủ dự án yêu cầu / đã chốt

- Có checkbox và xóa nhiều / tất cả ở Bộ ví dụ.
- Có nhiều nháp của cùng một thao tác và thử song song.
- Có danh sách nháp và trang sửa riêng; menu thao tác trên mỗi dòng.
- Có picker từ trong bộ ví dụ, search và filter level.
- **Chạy tạm nội dung đang sửa, không lưu nháp** (trả lời trong chat 31/10).
- Hai trang Nháp / Lịch sử; bản đang chạy nằm cố định bên phải giữa hai trang.
- Panel bản đang chạy không có nút “Tạo nháp từ bản này” (chốt 01/11). Nút tạo ở danh sách nháp vẫn giữ.
- Chi phí liệt kê theo batch, không rải từng lời gọi/ví dụ.

## Đề xuất trong mockup, chưa phải quyết định đã chốt

- Có tên dễ nhớ cho mỗi nháp, và menu Nhân bản.
- “Tất cả” có hai phạm vi: trang đang xem và toàn bộ kết quả đang lọc. Lựa chọn được giữ qua trang/bộ lọc, số đếm luôn là tổng lựa chọn.
- Snapshot chạy tạm giữ cả model + prompt + few-shot + effort + thinking + output limit; không phụ thuộc nội dung nháp bị sửa sau đó.
- Publish vẫn cần nháp lưu và bằng chứng eval khớp snapshot. Lưu nháp sau eval có thể tái sử dụng eval nếu fingerprint nội dung giống hoàn toàn. Cơ chế so khớp này **chưa có trong app hiện tại**.
- Lịch sử prompt gồm: bản đã publish, lịch sử prompt cũ, và các revision từng lần lưu nháp. Mục cuối cần bổ sung lưu revision.
- Panel live dùng `sticky` trên desktop; mobile hiển thị gọn, bấm để mở.
- Giữ báo cáo chi phí tổng hợp toàn hệ thống; bảng batch mới tập trung việc admin. Không cộng batch lần nữa vào tổng ai_calls.

## Giới hạn của prototype

- Dữ liệu minh họa tập trung `generate_cloze`; đổi operation chỉ đổi context hiển thị, chưa có dataset riêng cho cả 6 operation.
- Bảng ví dụ có 40 dòng minh họa / 10 dòng mỗi trang để thử selection nhanh. Lần eval mẫu có 100 câu là dữ liệu riêng, không lấy từ 40 dòng này.
- Các nút Nhập hàng loạt, Thêm ví dụ, Chốt phiên bản, Export, Rollback và date filter chỉ mô tả hành động bằng thông báo. Không thực hiện nghiệp vụ thật.
- Lượt chạy mới không thực sự tiến triển. Không có polling/queue trong prototype.
- Quick-test output là mẫu ghi rõ “minh họa”, không phải AI sinh từ các từ được chọn.
- Publish demo chỉ có flow tối giản. Baseline, warnings, giá, giới hạn, stale và quyền vẫn phải giữ trong implementation sau này.
- Font Lexend lấy từ Google Fonts; nếu offline có fallback hệ thống.

## Có cần sửa API / DB không?

| Thay đổi | Hiện tại, đã đọc code | Tác động đề xuất |
|---|---|---|
| Checkbox, chọn cả trang / kết quả, search / sort | `DataList` đã có `selection`; list trả toàn bộ working set tối đa 1000 | Frontend có thể làm bằng component hiện có |
| Xóa hàng loạt | Controller chỉ có `DELETE examples/:id`, có rate limit; không có bulk delete | Có thể gọi API cũ tuần tự nhưng nên thêm bulk endpoint có kết quả xóa/thất bại rõ ràng, kiểm quyền và race. Không nên bắn đồng thời 1000 request |
| Nhiều nháp mỗi operation | DB có partial unique `ai_configs_one_draft_key` trên operation khi status draft; service trả `draft-exists` | **Cần migration và API**: bỏ ràng buộc một nháp, danh sách nháp, định danh draft ID cho get/save/delete/test/eval/publish/check |
| Chạy song song | Eval hiện chọn `config: live/draft` theo operation, không chọn một draft trong nhiều draft | API phải nhận draft ID hoặc snapshot và vẫn giữ giới hạn concurrency/cost. Worker đã có run ID nhưng chưa kiểm chứng khả năng nhiều nháp |
| Chạy tạm model/prompt chưa lưu | Draft test đọc bản lưu trên DB; eval config dùng ID/version; legacy prompt payload chỉ dùng model live | **Cần API + snapshot data model**. Payload legacy không đủ để test model chưa lưu. Lưu ảnh chụp bất biến và fingerprint; không tự gắn evidence của snapshot khác vào publish |
| Picker search / CEFR | Ví dụ dev đã có input.level; held-out chỉ trả id/split | Frontend có thể fetch/filter dataset hiện có, giữ limit 5 ở server và không đưa held-out vào picker |
| Trang lịch sử riêng | Có config events history và prompt revisions cũ | Đổi bố cục/routes là frontend. Nếu yêu cầu lưu mỗi lần sửa prompt nháp thì cần revision storage/API |
| Bản live bên phải | Đã có get config/live | Frontend layout |
| Chi phí theo batch | Costs chỉ group theo day/operation/model/purpose/outcome; eval và judge có run/pass ID, quick test mỗi item có `test-UUID` riêng | **Cần API** trả batch list/detail, token totals gồm retry/cached/reasoning, known/unknown cost. Eval/judge có thể tái dùng run/pass; quick test cần batch ID chung. Có cần migration toàn cục hay chỉ cho test batch phải chốt khi implementation |

## Bằng chứng repo đã đọc

- `PRODUCT.md`: người dùng, Wordmet, direction B và constraints. Lưu ý file tập trung learner; admin source dưới đây là bằng chứng style trực tiếp.
- `CLAUDE.md`, `AGENTS.md`: workflow, module ownership, giữ app thật cho tới khi duyệt thiết kế.
- `packages/design-tokens/theme.css`: Lexend; primary #2445d6, accent #ffd84a, ink #0f1a3d, canvas #f1f3fd.
- `apps/admin/src/styles/globals.css`, `ui/Button.tsx`, `app/Shell.tsx`, `app/nav.ts`: mật độ, sidebar, highlighter vàng, flat ledge, responsive.
- `docs/superpowers/specs/2026-10-29-nhom-b-chat-luong-ai-design.md` §4, §6, §9: một nháp/operation là quyết định cũ; sửa nhiều nháp sẽ thay D22–D24 tương ứng.
- `apps/api/prisma/migrations/20261030100000_nhom_b_m2_configs/migration.sql`: partial unique một nháp.
- `apps/api/src/ai/configs/configs.service.ts`: createDraft, saveDraft, testDraft (đọc saved draft).
- `apps/api/src/ai/api/admin-ai-configs.controller.ts`: endpoint theo operation, chưa có draft ID.
- `apps/api/src/ai/eval/eval-runs.service.ts`: configToRun và run snapshots hiện tại.
- `apps/api/src/ai/eval/eval-examples.service.ts`: list che held-out, remove xóa working example.
- `apps/api/src/ai/api/admin-ai-eval.controller.ts`: list, single delete và rate limit.
- `apps/api/src/ai/reports/reports.service.ts`: costs tổng hợp từ ai_calls; nhóm hiện có.
- `apps/api/src/ai/eval/eval-job.ts`: operation ID `eval-runId-exampleId`.
- `apps/admin/src/features/ai/configs/{AiConfigsPage,DraftEditor,PublishPanel}.tsx`: layout hiện tại và dirty gate.
- `apps/admin/src/features/ai/{AiEvalPage,AiCostsPage}.tsx`, `ui/DataList.tsx`: list/paging, báo cáo và selection component.

## Kiểm tra prototype

- Render Chromium 1440px và 390px; kiểm ảnh của danh sách nháp, picker, lịch sử, chi phí và mobile.
- Chọn toàn bộ 40 kết quả và mở/hủy xác nhận xóa.
- Tìm dev, chọn 1 từ để chạy thử; đổi model chưa lưu rồi chạy eval: không tự lưu nháp.
- Không phát sinh page error trong lượt kiểm; không overflow toàn trang ở 390px (các bảng có vùng cuộn riêng).
- Detector: 1 advisory về flat offset shadow. Giữ theo design direction B đang dùng trong repo (không phải style mới).

Chưa kiểm bằng người dùng thật; đây là bản để chủ dự án duyệt luồng và bố cục trước khi lập plan sửa app.
