# AI workspace — quyết định đã chốt

Nguồn: owner duyệt plan 01/11/2026 và mockup 31/10/2026. Tất cả là owner-decided trừ ghi chú triển khai.

1. Nhiều nháp độc lập theo operation; CRUD/test/publish dùng draft ID. Xóa mềm và giữ revision/evidence.
2. Chạy nội dung form tạm, không tự lưu; save đúng snapshot dùng lại eval nếu đủ điều kiện publish.
3. Fingerprint chỉ bao gồm nội dung ảnh hưởng execution, không tên/note/giá; giữ strings và few-shot order.
4. Hai trang Nháp/Lịch sử với live panel chung; không tạo nháp từ panel live.
5. Quick-test chọn tối đa 5 dev examples, có search/CEFR, server kiểm lại ID và không chấp nhận held-out.
6. Chi phí mặc định theo batch, retry nằm trong tổng ledger; giữ Tổng hợp và usage người học.
7. Bulk delete chọn trang/toàn kết quả lọc, giữ selection qua page/filter; wrong-operation atomic, missing IDs retry-safe; không xóa frozen snapshots.
8. Migration chỉ backfill lịch sử có chứng cứ; không tạo batch quick-test legacy suy đoán, không dựng các lần save cũ.
9. Giữ baseline/warnings/rate/cost/concurrency, judge logic và learner flows.

Implementation ruling: initial imported revisions có fingerprint NULL và derive canonical hash khi đọc; revision mới ghi hash. SQL jsonb serialization không được coi mặc định tương đương canonical JSON của application. Giá tại execution được giữ ở run và ledger; metadata sau khi hết content retention vẫn đọc được.
