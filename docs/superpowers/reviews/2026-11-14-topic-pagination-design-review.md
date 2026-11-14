# Review độc lập design pagination chủ đề

14/11/2026. Reviewer mới đọc [design dự thảo](../specs/2026-11-14-topic-pagination-design.md) và đối chiếu với code. Kết luận là hướng giữ trang chi tiết, phân trang bằng cursor và đổi gợi ý khi mở Hôm nay phù hợp. Design cần làm rõ contract thêm từ trước khi viết implementation plan.

## Phát hiện theo mức độ

### P1. Bulk API hiện tại cho phép thêm sense đã học ở group khác

Design dòng 17 và 24–25 yêu cầu mọi mode của trang chủ đề chỉ thêm sense khớp topic và level, chưa học ở bất kỳ group nào tại thời điểm ghi. Nhánh `sense_ids` hiện kiểm tra visibility trước transaction rồi chỉ loại sense có trong **group đích**. Một người tick sense trên trang 1, thêm sense đó vào group A từ tab khác, sau đó submit vào group B vẫn có thể tạo link tới group B. Unit test hiện có chủ động kiểm tra hành vi link sense đã học từ group khác.

Contract cần ghi rõ cả hai mode `IDs đã chọn` và `thêm toàn bộ` đều kiểm tra eligibility trên server. Reuse Content service cho điều kiện browse và kiểm tra trạng thái học ngay trước khi ghi dưới `withLearnerLock` của Learning. Tách contract theo topic khỏi hành vi bulk đang được caller khác sử dụng. Test một case sense vẫn eligible làm control, cùng hai case đã học ở group khác và đã đổi topic hoặc level sau khi tick.

Bằng chứng: [items.service.ts](../../../apps/api/src/learning/items/items.service.ts#L92), [unit test cho sense đang học ở group khác](../../../apps/api/src/learning/items/items.service.spec.ts#L157), [learner-content.service.ts](../../../apps/api/src/content/learner/learner-content.service.ts#L105).

### P1. Checkbox toàn topic cần quy tắc về số đếm, payload và kết quả

Design dòng 16–18 vừa mô tả số đã chọn chính xác, vừa tính lại tập eligible khi submit. Ví dụ chọn tất cả trừ A. Nếu A trở thành đang học giữa lúc chọn và submit, lấy tổng chưa học mới rồi trừ số ID bỏ chọn sẽ đếm thiếu một sense. Nhãn số đã chọn và thông báo kết quả cần phân biệt số lúc xem với tập thực sự được xét lúc ghi. Với filter động không có snapshot, server chỉ biết các sense thỏa filter lúc chạy, nên không thể phân loại chính xác những sense đã rời khỏi tập kể từ lúc tick.

Cách gửi danh sách bỏ chọn cũng cần một contract. Node serialize `excluded_sense_ids` với 1 UUID cho 63 byte, và 2.693 UUID cho **105.051 byte**. Parser JSON chung đặt **100 KB = 102.400 byte**. Đây là kiểm tra kích thước dữ liệu, chưa gửi request. Số ID có thể xảy ra nếu người học mới chọn toàn bộ topic cỡ VSTEP rồi bỏ chọn gần hết. Nếu giữ checkbox toàn topic, cần chốt transport, giới hạn, cách retry và số liệu receipt có thể tính được.

**Quyết định sản phẩm còn mở** — Checkbox chọn các sense chưa học của trang hiện tại và giữ các mục đã tick qua nhiều trang, hoặc checkbox chọn toàn chủ đề và cho bỏ tick từng sense ở các trang. Cả hai có nút riêng **Thêm tất cả từ chưa học** toàn chủ đề. Phạm vi theo trang thay đổi hành vi checkbox hiện tại nhưng bỏ được danh sách loại trừ toàn topic. Phạm vi toàn topic giữ hành vi hiện tại, cần xử lý thêm count, payload và dữ liệu đổi trong lúc chọn.

Bằng chứng: [design](../specs/2026-11-14-topic-pagination-design.md#L16), [parser JSON](../../../apps/api/src/app.setup.ts#L45), [checkbox hiện tại](../../../apps/web/src/features/learner/groups/TopicPickerPage.tsx#L191).

### P1. Khóa group đích và payload khi submit hoặc retry

`useGroups().data` chưa về được chuyển thành `[]`, rồi lựa chọn mặc định có thể rơi vào tạo group mới. Khi pager đã hiện trước khi fetch group kết thúc, người mở từ `?group=…` có thể bấm thêm vào group mới. Cần chờ xác định group đích và phân biệt đang tải, fetch lỗi và group thực sự không còn hợp lệ. Nếu group bị xóa sau khi xác định, giữ lựa chọn và cho người dùng chọn lại.

Nếu batch 1 đã ghi và batch 2 mất response, retry bằng payload được tính lại có thể gửi cùng key với tập ID khác. Interceptor trả 400 khi payload khác. Cần giữ group đích, thứ tự ID và key cố định trong cùng lần thêm. Nếu nhiều batch, giữ tiến độ, báo số đã xác nhận và kiểm thử lỗi mạng sau commit. Mặc định `user.write` là 30 request/phút và API bulk hiện tại nhận tối đa 100 ID mỗi request, nên trường hợp lớn cần xử lý cả 429. Phần retry sau khi server đã commit nhưng chưa lưu receipt cần đặc biệt rõ trong plan vì wrapper lưu receipt sau khi handler trả kết quả.

Bằng chứng: [TopicPickerPage.tsx](../../../apps/web/src/features/learner/groups/TopicPickerPage.tsx#L66), [useSubmitOnce](../../../apps/web/src/app-shell/use-submit-once.ts#L26), [idempotency interceptor](../../../apps/api/src/common/idempotency/idempotency.interceptor.ts#L89), [thứ tự commit và receipt](../../../apps/api/src/common/idempotency/idempotency.service.ts#L69), [rate limit](../../../apps/api/src/common/config/app-config.ts#L176), [schema bulk](../../../apps/api/src/learning/items/items.schemas.ts#L10).

### P2. Giới hạn dữ liệu sample ở tầng database

API gợi ý lấy toàn bộ sense khớp mỗi cặp topic + level từ database, rồi mới xáo và cắt còn bốn sample trong service. Mỗi lần mở Hôm nay sẽ gọi lại đường đọc này theo design. Giới hạn số dòng sample SQL trả về và đo chi phí query trên VSTEP cùng một topic nhỏ đối chứng. Cần kiểm tra cả số dòng trả về lẫn database timing, vì một query vẫn có thể scan nhiều dòng dù chỉ trả vài sample.

Bằng chứng: [topic-suggestions.queries.ts](../../../apps/api/src/content/taxonomy/topic-suggestions.queries.ts#L51), [topic-suggestions.service.ts](../../../apps/api/src/content/taxonomy/topic-suggestions.service.ts#L70).

### P2. Bổ sung quy tắc khi dữ liệu hoặc cursor đổi

Khi hàng cuối trang tiếp theo bị xóa sau lúc cursor được phát, response có thể rỗng trong khi total topic vẫn lớn hơn 0. Design cần một quy tắc quay về trang hợp lệ, reset cursor và lựa chọn khi đổi topic hoặc level, và làm mới trạng thái học của các trang đã xem sau khi thêm. Tiêu chí nghiệm thu cần tách số request và số dòng browser nhận khỏi thời gian query tổng. Giữ budget trang đầu và chuyển trang hữu hạn, kiểm thử trên topic lớn và topic đối chứng đủ nhỏ để không có trang sau.

Bằng chứng: [design](../specs/2026-11-14-topic-pagination-design.md#L14), [query cursor và page size](../../../apps/api/src/content/learner/learner-content.service.ts#L76), [query key hiện tại](../../../apps/web/src/features/learner/groups/TopicPickerPage.tsx#L78).

## Phạm vi review

Ảnh hưởng chính gồm trang chủ đề, service đọc Content và thao tác thêm của Learning, cùng API gợi ý Hôm nay. Các ví dụ concurrency, payload và cursor ở trên là kết quả đọc code hoặc mô phỏng kích thước, chưa được tái hiện trên production. Chưa đo timing, query plan hoặc network trace cho VSTEP và chưa có implementation để xác nhận cải thiện hiệu năng.

Baseline ngày 14/11/2026. Vitest API chạy `items.service.spec.ts`, `items.schemas.spec.ts`, `topic-suggestions.service.spec.ts` và `topic-suggestions.queries.spec.ts`, kết quả 4 file, 31 test pass. Vitest web chạy `topic-picker.test.tsx`, kết quả 1 file, 14 test pass. Đây là test code hiện tại dùng mock, phục vụ đối chiếu hành vi đang có.
