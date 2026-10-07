# Spec / ADR — Decision & Defense Analysis

Mẫu dùng cho một decision quan trọng. **Chưa có decision thực tế được chốt trong
file này.** Điền trực tiếp vào spec/ADR của subsystem khi đã xác định phạm vi.
Mức chi tiết phù hợp với ảnh hưởng của decision.

## 1. Context và decision

- ID / tiêu đề: [điền]
- Trạng thái: [draft / proposed / accepted / superseded]
- Feature / core loop liên quan: [điền]
- Problem cần giải quyết và bằng chứng: [điền]
- Ràng buộc: [thời gian, chi phí, dữ liệu, vận hành]
- Yêu cầu hiện tại đã xác nhận: [tách khỏi kịch bản tương lai]
- Trục mở rộng cần xét: [ngôn ngữ/nội dung/type/provider/plan/client/tải; không tự thêm feature V3/V4/V5]
- Nguồn research và suy luận áp dụng: [nguồn primary; giới hạn của việc áp dụng]
- Decision đề xuất: [điền]
- Hành vi người dùng sẽ quan sát được: [điền]
- Diễn giải cho người mới: [một ví dụ input → trách nhiệm từng phần → dữ liệu/ID được giữ → output; giải nghĩa thuật ngữ trước khi dùng]

## 2. Hint trước khi phân tích

**Decision này cần Defense Analysis trước khi chốt spec.**

Chọn một vài câu hỏi sát decision để người dùng reasoning trước:

- Điều gì phải luôn đúng, kể cả khi request/job chạy hai lần?
- Nếu hai thao tác cùng thay đổi một dữ liệu, kết quả nào được phép xảy ra?
- Nếu một bước đã thành công nhưng bước tiếp theo thất bại, ai biết trạng thái cuối cùng?
- Nếu timeout xảy ra, làm sao biết thao tác đã thực hiện hay chưa?
- Làm sao phát hiện lỗi, debug và đưa người dùng trở lại trạng thái hợp lệ?

Ghi câu trả lời, bổ sung case còn thiếu và giữ rõ câu hỏi chưa có đáp án.

## 3. Invariants và happy path

Invariants: [liệt kê điều luôn phải đúng; mô tả state transitions nếu liên quan].

Happy path: [input → các bước → output / trạng thái cuối].

Ranh giới: [transaction, process, hệ thống ngoài, chủ sở hữu dữ liệu].

## 4. Case cần kiểm tra

Mỗi dòng cần có: **tình huống → hành vi mong đợi → cách bảo vệ/xử lý → cách phát
hiện → cách recovery → cách kiểm chứng**. Nếu không áp dụng, ghi lý do.

| Nhóm case | Câu hỏi gợi ý | Phân tích / câu hỏi còn mở |
| --- | --- | --- |
| Invariants | Điều nào không được vi phạm? Cơ chế nào bảo vệ điều đó? | [điền] |
| Edge cases | Input rỗng/sai/quá lớn, dữ liệu cũ/bị xóa, trạng thái không hợp lệ? | [điền] |
| Failure modes | DB, Redis, worker, dịch vụ ngoài hoặc process lỗi ở từng bước? | [điền] |
| Concurrency / races | Hai request/job, cập nhật và xóa, cancel và complete cùng xảy ra? | [điền] |
| Idempotency / duplicates | Duplicate đến từ đâu? Cách nhận diện, phạm vi và thời hạn dedupe? | [điền] |
| Partial failures | Một side effect hoàn tất nhưng bước khác lỗi; reconciliate hoặc bù trừ ra sao? | [điền] |
| Timeout / retry | Timeout có nghĩa gì? Lỗi nào retry được, giới hạn, backoff và điểm dừng? | [điền] |
| Security / abuse | Quyền trên từng tài nguyên, dữ liệu nhạy cảm, spam và giới hạn chi phí? | [điền] |
| Observability | Tín hiệu nào phát hiện lỗi; correlation, log/metric và alert nào cần? | [điền] |
| Recovery / rollback | Khôi phục dữ liệu/job, replay, deploy rollback và migration compatibility? | [điền] |
| Alternatives | Phương án đơn giản hơn là gì? Đánh đổi khác nhau ở đâu? | [điền] |
| Trade-offs | Chấp nhận chi phí, độ trễ, consistency và công sức vận hành nào? | [điền] |
| Evolution / compatibility | Thêm ngôn ngữ/type/provider/plan ảnh hưởng model, API, client cũ và dữ liệu đã lưu thế nào? | [điền] |
| Capacity / operating cost | Bottleneck nào đã đo; option tăng tải làm đổi pool, concurrency, consistency và chi phí thế nào? | [điền] |

## 5. So sánh và quyết định

| Phương án | Đáp ứng yêu cầu | Failure / hạn chế | Chi phí và vận hành | Lý do chọn hoặc bỏ |
| --- | --- | --- | --- | --- |
| A | [điền] | [điền] | [điền] | [điền] |
| B | [điền] | [điền] | [điền] | [điền] |

Phần làm ở V1 / boundary chuẩn bị / phần trì hoãn: [điền; tránh framework tổng quát cho feature chưa biết].
Ảnh hưởng migration và client compatibility của từng option: [điền].

Hướng đang nghiêng (vẫn proposed): [điền].
Decision accepted: [chỉ điền khi người dùng chọn/cho phép implementation rõ; research hoặc đề nghị hướng không tự là acceptance].
Giả định và rủi ro chấp nhận: [điền].

Điều kiện xem xét lại: [tín hiệu/giới hạn đo được hoặc requirement mới]. Nếu
đề xuất Kafka/Kubernetes/microservices, chỉ ra vấn đề hiện tại và vì sao các
phương án ít phức tạp hơn không đủ.

## 6. Verification và readiness

- Case quan trọng và kiểm chứng phù hợp: [test, manual check, failure simulation hoặc đo đạc].
- Evidence và giới hạn: [nguồn, môi trường, thời điểm; tách production và load test].
- Runbook tối thiểu: [phát hiện → chẩn đoán → xử lý → xác minh khôi phục].
- Câu hỏi còn mở / xử lý trì hoãn: [ảnh hưởng, cách giải quyết, thời điểm cần chốt].

Chỉ ghi decision đã chốt khi hành vi quan trọng, invariants và cách xử lý failure
được xác định ở mức phù hợp. Phần trì hoãn phải có lý do và ảnh hưởng rõ. Checkpoint
này phục vụ reasoning và review; không tự tạo yêu cầu xin phép cho công việc đã
được người dùng giao.
