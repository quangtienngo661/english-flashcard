# Audit và plan sơ bộ: gợi ý chủ đề trên Hôm nay

Ngày 14/11/2026. Phạm vi: code trong workspace và UI production; chưa thay đổi product code.

## Kiểm chứng production

- `/vi/app/topic?code=exam-vstep&level=B2` hiển thị **2.694 từ gợi ý**, **2.000 đang học** và **694 chưa học**. Ban đầu có 8 dòng và nút “Xem thêm 2.686 từ”; bấm nút hiển thị danh sách 2.694 dòng, không thấy pagination. Không thực hiện thao tác thêm từ.
- `/vi/app/lookup?level=B2&topic=exam-vstep` hiển thị **2.630 từ**, filter B2 / VSTEP và 20 kết quả trang đầu. Bấm “Trang sau” chuyển sang trang 2, có “Trang trước” và “Trang sau”. Chênh lệch là 64 giữa hai tổng; chưa xác định riêng nguyên nhân hoặc số nghĩa bị thiếu.
- Chưa thu network trace, đo thời gian, hay đối chiếu production revision với workspace. Số request ước tính bên dưới là suy luận từ code, không phải số đã quan sát trong browser.

## Phương án giữ trang chi tiết và thêm pagination

`GET /v1/senses` đã trả cursor nhưng không trả tổng; hiện trang lấy hết mọi trang rồi mới tính tổng, tổng chưa học và danh sách đã học. Pagination thực chất phải giới hạn cả dữ liệu tải lẫn số dòng render, không chỉ chia UI sau khi đã tải hết. Cần giải quyết count toàn bộ, giữ lựa chọn khi đổi trang, trạng thái đang học và hành vi “chọn tất cả” / “thêm cả” trên nhiều trang.

Không thể mặc định thay “thêm cả” bằng bulk filter hiện tại: topic picker chỉ thêm sense **chưa học ở bất kỳ group nào**, còn `items.service.ts` lọc sense **chưa có trong group đích**, nên có thể thêm cả sense đã học ở group khác. Hai hành vi cần được giữ hoặc thay đổi có chủ đích. Test cần bao gồm lỗi tải từng trang, chọn qua nhiều trang, mất/đổi group, total và dữ liệu thay đổi giữa các trang, cùng kiểm thử VSTEP thật.

## Yêu cầu

- Hôm nay hiển thị tối đa 4 card chủ đề ngẫu nhiên mỗi lần load trang.
- **Chủ dự án chốt sau audit:** giữ trang chi tiết chủ đề và thêm pagination; card vẫn mở đúng `level` và `topic` tại trang đó.
- Bản thiết kế đang đề xuất tại [design](../superpowers/specs/2026-11-14-topic-pagination-design.md).

## Kết quả audit

1. `apps/web/src/features/learner/groups/TopicSuggestions.tsx` cắt tối đa 4 card, nhưng `apps/api/src/content/taxonomy/topic-suggestions.service.ts` đặt `MAX_SUGGESTIONS = 3`. API xáo theo hash user ID và ngày local, nên cùng user cùng ngày nhận cùng kết quả. Đây là hành vi theo design cũ D17 (`docs/superpowers/specs/2026-10-22-giao-dien-nguoi-hoc-design.md` §8.8), cần thay theo yêu cầu mới; không phải lỗi CSS ẩn card thứ tư.
2. Card link tới `/app/topic?code=…&level=…`. `TopicPickerPage.tsx` lần lượt đọc toàn bộ `/v1/senses` với `page_size=100` cho tới khi hết cursor, rồi lần lượt gọi `/v1/items` theo từng 100 sense; query hoàn thành sau cả hai vòng. Với 2.694 sense đúng theo filter, code có thể cần 27 request senses và 27 request items, chưa tính các request khác. Đây là phân tích luồng code, không phải phép đo VSTEP thật: screenshot đếm 2.694 nhưng chưa xác nhận database hay network hiện tại.
3. Tra từ đã parse `level` và `topic` từ URL, gọi `/v1/words?page_size=20` và có nút chuyển trang theo cursor; hook còn prefetch tối đa trang kế tiếp. Xem `lookup-api.ts`, `LookupPage.tsx` và `lookup.test.tsx`. Vì vậy không cần tải 2.000 từ để xem trang đầu; số trang và thời gian thực tế chưa đo.
4. Trang chi tiết còn được link từ `apps/web/src/features/learner/word/WordPage.tsx` (Xem chủ đề) và `apps/web/src/features/learner/add-word/AddWordSheet.tsx` (chọn chủ đề trong một group, truyền `group`); không chỉ từ card Hôm nay. Đường thứ hai giữ group đích và chọn từng sense hoặc thêm cả bộ, nên thay bằng link Tra từ có thể đổi workflow. `apps/web/e2e-shots/shots.spec.ts` cũng lấy link từ card và giả định đó là trang chi tiết.
5. `topic-suggestions.queries.ts` đếm **sense catalog**, loại function words; `words.service.ts` nhóm theo **lemma** và có thể gồm private words của người học. Tại VSTEP · B2 trên production, trang topic hiển thị 2.694, Tra từ hiển thị 2.630; chưa phân tích đầy đủ nguyên nhân chênh lệch. Bulk add của Tra từ dùng filter catalog, bỏ function words và báo các mục bị bỏ qua (`BulkAddSheet.tsx`). Không hứa hai tổng trùng hoặc bulk add bằng số dòng Tra từ.

## Phương án cũ — không còn áp dụng

Các bước 2–4 dưới đây được ghi khi còn cân nhắc chuyển sang Tra từ; chủ dự án đã chọn giữ trang chi tiết. Bước 1 vẫn thuộc yêu cầu, các bước còn lại sẽ được thay bằng plan theo design mới sau khi được duyệt.

1. Đổi API suggestions thành tối đa 4 chủ đề khác nhau đủ ngưỡng hiện tại 10 sense. Random mỗi lần load thay cho seed theo ngày; thiết kế rõ refresh/refetch/cache để không tự đổi card bất ngờ trong một lần xem. Random có thể tình cờ cho kết quả giống lần trước; ít hơn 4 chủ đề hợp lệ thì chỉ hiện số có sẵn. Giữ response shape và xác định test deterministic bằng nguồn random kiểm soát được, tránh test xác suất.
2. Card Hôm nay dùng `lookupHref(locale, { level, topic })`. Tra từ giữ filter, phân trang hiện có; kiểm thử link có encoding đúng, cả `vi` và `en`, dữ liệu rỗng và điều hướng trang sau/trước. Xem lại text “Tạo nhóm nhanh theo chủ đề” vì card giờ mở Tra từ, và cả translations.
3. Xử lý đường vào trang chi tiết còn lại theo quyết định của chủ dự án; không xóa route hoặc bỏ khả năng chọn từng sense / giữ group đích khi chưa có quyết định. Sửa `e2e-shots/shots.spec.ts` để không giả định card dẫn tới topic picker.
4. Đánh giá hiển thị count dựa trên quyết định nội dung: số sense catalog và tổng lemma Tra từ không đồng nghĩa. Kiểm tra trên database thật có VSTEP và một topic đối chứng; xác định dữ liệu có function words, nhiều sense chung lemma và private words trước khi quyết định đổi count hay copy.
5. TDD: test API 0–4 chủ đề hợp lệ, ngưỡng, trùng topic, random có kiểm soát; test card/filters/URL và cache; test browser với VSTEP, xác nhận request trang đầu và prefetch hữu hạn, next/previous, group flow theo phạm vi đã chốt. Chạy test liên quan, lint/typecheck cho API và web; ghi kết quả thực tế. Cần dữ liệu thật để xác nhận hiệu năng, số lượng và những chênh lệch trên.

## Giới hạn kiểm chứng

Đã chạy test hiện có: `pnpm --filter api exec vitest run src/content/taxonomy/topic-suggestions.service.spec.ts` → 1 file, 8 test pass; `pnpm --filter web exec vitest run src/features/learner/today/today.test.tsx src/features/learner/lookup/lookup.test.tsx` → 2 file, 45 test pass. Các test dùng fixture/mock, xác nhận contract được test chứ không chứng minh dữ liệu hoặc network thật.

Đã kiểm chứng UI production như ghi ở đầu tài liệu; chưa query database hoặc đo network. Chưa xác nhận thời gian tải, số request thực tế, hay hệ thống đang chạy có cùng revision với workspace.
