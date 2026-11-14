# Vận hành AI workspace

## Bộ ví dụ

Chọn operation, tìm từ/nghĩa hoặc lọc CEFR trong dev. Checkbox đầu bảng chọn trang 20 dòng. “Chọn toàn bộ … kết quả đang lọc” chọn qua các trang. Đổi filter/trang giữ lựa chọn; đổi operation bỏ chọn. Trước khi xóa, đọc tổng dev/held-out. Xóa chỉ tác động working examples; frozen versions và kết quả eval cũ vẫn còn.

## Thử cấu hình

Vào Cấu hình → Các bản nháp → Tạo nháp, đặt tên để phân biệt. Mỗi nháp có model, prompt, few-shot và settings riêng. Menu nháp có sửa, chạy thử/eval, nhân bản, publish và xóa.

Trong editor, có thể đổi model/prompt và chạy ngay bằng snapshot mà chưa lưu. Chạy thử chọn tối đa 5 từ dev, dùng search/CEFR. Nếu không chọn, server dùng tối đa5 dev examples; khi không có dev thì dùng few-shot như luồng cũ. Chạy bộ ví dụ là eval trên frozen version. Kết quả giữ đúng nội dung lúc bắt đầu; chỉnh form tiếp không sửa kết quả cũ. Bản live ở bên cạnh chỉ đổi khi publish/rollback.

## Publish

1. Xem kết quả eval và kiểm output dev; held-out chỉ hiển thị số liệu.
2. Lưu nháp. Nếu nội dung khớp snapshot eval hoàn tất cùng nháp trên frozen version mới nhất, publish-check dùng lại run đó.
3. Nếu báo thiếu baseline, chạy eval bản live trên cùng frozen version rồi kiểm lại.
4. Đọc và xác nhận cảnh báo chất lượng khi muốn tiếp tục. Không dùng quick-test vài từ thay eval đầy đủ.
5. Publish. Khi có version conflict, giữ nội dung đang sửa, tải bản mới và quyết định lưu lại.

Đổi tên/ghi chú không yêu cầu eval lại. Đổi model/prompt/few-shot/effort/thinking/tokens cần evidence khớp nội dung mới. Chốt bộ ví dụ mới cần eval trên phiên bản mới.

## Lịch sử và chi phí

Lịch sử tách Publish & rollback và Lịch sử prompt. Saved revisions của nháp đã publish/xóa vẫn được giữ; lịch sử trước mốc migration chỉ gồm dữ liệu còn tồn tại.

Chi phí → Theo lần chạy: mỗi eval, quick-test hoặc judge là một batch. Eval/judge có link qua lại; mở chi tiết để xem model/snapshot, tiến độ, token, calls/retry và chi phí. Running là tạm tính. Failed/cancelled vẫn giữ tiền đã phát sinh. “Chưa đủ giá” kèm subtotal và số calls chưa định giá, không có nghĩa toàn bộ miễn phí.

Quick-test giữ metadata và chi phí; nội dung hết hạn theo retention thì không xem lại được output. Mục Tổng hợp bao gồm usage người học và legacy calls chưa nhóm chắc chắn được.

## Xóa nháp

Nháp có run queued/running phải hủy run trước khi xóa. Xóa nháp không xóa lịch sử revision/eval/batch. Rollback chỉ thực hiện khi muốn chuyển bản live về cấu hình trước.
