# AI workspace: nhiều nháp, snapshot và batch

Ngày chốt: 01/11/2026. Nguồn: plan owner duyệt trong chat; mockup `../../mockups/2026-10-31-ai-workspace/index.html`.

Thiết kế này thay thế quy tắc một nháp của nhóm B §6.2/B23; các quy tắc judge, held-out, caps, baseline và cảnh báo publish tiếp tục áp dụng.

## Luồng

Danh sách nháp → mở một draft ID → sửa form → chạy tạm bằng snapshot → đọc kết quả → lưu → publish-check → xác nhận cảnh báo → publish. Bản live chỉ đổi ở bước cuối. Mỗi nháp có revision bất biến; xóa là soft delete và không xóa evidence.

Hai trang Các bản nháp / Lịch sử dùng cùng panel live: sticky bên phải desktop, thu gọn ở mobile. Chỉ danh sách có nút tạo; panel live không có nút tạo nháp. Lịch sử prompt phải xem được cả revisions của nháp đã xóa/publish và lịch sử legacy.

## Dữ liệu và tính tương thích

`ai_configs` thêm tên, thời điểm sửa, soft delete, fingerprint. `ai_config_revisions` giữ lần lưu hiện có và các lần lưu mới; migration không dựng lịch sử đã mất. ID-based endpoints kiểm operation và trạng thái. Legacy singular mutations từ chối `draft-selection-required` khi có nhiều nháp.

Snapshot chứa operation và toàn bộ nội dung thực thi: model reference, instructions, ordered few-shot, effort, thinking, output limit; resolved model/provider/prices lưu lúc tạo run. Canonical SHA256 sắp object keys đệ quy; không trim nội dung hay đổi thứ tự array. Tên/note/giá/actor/time/version không tham gia hash. Worker đọc snapshot thay vì nháp đang sửa; legacy runs chưa có snapshot giữ đường đọc cũ.

Candidate phải cùng draft ID, operation, fingerprint, hoàn tất và không hidden trên frozen set mới nhất. Test tối đa 5 từ không thay eval đầy đủ. Publish giữ optimistic version và live-pointer CAS; dirty form cần lưu và kiểm lại.

`ai_batches` giữ metadata lâu dài; calls liên kết batch_id, mỗi attempt/retry tính một lần từ ledger Decimal. Eval và judge là hai batch có parent link. Quick-test không lưu input/output lâu dài; lấy nội dung từ call_contents còn hạn. Legacy chỉ backfill khi exact operation ID xác định chắc run/pass; calls còn lại giữ trong Tổng hợp.

## When → Then

| When | Then |
|---|---|
| Hai nháp cùng operation chạy đồng thời | Mỗi run/batch giữ snapshot và draft ID riêng |
| Save trong lúc eval chạy | Worker tiếp tục snapshot cũ; save không đổi kết quả |
| Save nội dung đúng snapshot | Có thể dùng lại eval cùng nháp nếu đủ set/baseline/gate |
| Chỉ đổi tên hoặc note | Không buộc eval lại |
| Đổi model/prompt/few-shot/settings | Fingerprint đổi; không dùng nhầm evidence |
| Chốt frozen set mới | Candidate phải ở set mới |
| Hai admin save/publish | Version/CAS cho một lần thắng; giữ nội dung đang sửa khi conflict |
| Delete khi còn queued/running | Từ chối và hướng dẫn hủy |
| Bulk delete chứa operation khác | Toàn request thất bại; không xóa một phần |
| Bulk delete ID đã mất | Trả already_missing_ids; frozen snapshots giữ nguyên |
| Search/CEFR trên bộ ví dụ | Chỉ tìm dev; không suy ra level/nội dung held-out |
| Calls thiếu giá | Hiển thị subtotal đã biết và số calls chưa có giá |
| Failed/cancelled | Giữ chi phí phát sinh và metadata |
| Nội dung quick-test hết hạn | Lịch sử còn số liệu, nội dung báo hết hạn |
| Run/pass bị xóa | Batch metadata cuối cùng vẫn đọc được |

## Giới hạn

Không đổi learner flows, không Export, không đổi judge active-pass rule hoặc caps. Snapshot chứng minh nội dung đã chạy, không hứa output tái lập. Chỉ fake provider cho automatic tests; owner thử provider thật riêng.
