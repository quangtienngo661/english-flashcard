# Quyết định — pagination chủ đề

Ngày 14/11/2026. [Design](../specs/2026-11-14-topic-pagination-design.md) · [Audit](../../audit/2026-11-14-topic-suggestions-audit.md) · [Implementation plan](../plans/2026-11-14-topic-pagination.md).

| Mục | Bối cảnh và các hướng | Chủ dự án trả lời | Trạng thái |
|---|---|---|---|
| Hướng điều hướng | Card tới Tra từ có filter, hoặc giữ topic picker và thêm pagination | “hướng này nhé”, chọn giữ trang chi tiết và thêm pagination | **Chốt**. Codex đồng ý vì trang còn được dùng từ trang từ và luồng group; giữ được workflow chọn sense và group. |
| Card gợi ý | Code đang trả tối đa 3 card, random theo ngày | Yêu cầu 4 card random mỗi lần load | **Chốt yêu cầu**; nếu ít hơn 4 topic hợp lệ, số card ít hơn là đề xuất trong design. |
| Chọn / thêm cả khi phân trang | Checkbox theo trang hoặc toàn topic, cả hai hướng có nút thêm toàn bộ từ chưa học | “trang hiện tại nhé” | **Chốt**. Checkbox chỉ tick hoặc bỏ tick sense chưa học của trang hiện tại. Lựa chọn qua các trang được giữ. Nút thêm toàn bộ từ chưa học vẫn áp dụng cho toàn topic và level. |
| Cỡ trang | Code hiện tại tải 100 sense/request và ban đầu hiện 8; Tra từ dùng 20/trang | Đồng ý lập plan sau khi xem tóm tắt cơ chế | **Giá trị trong plan** 20 sense/trang. |

Chủ dự án đồng ý lập plan ngày 14/11/2026. Implementation plan đang chờ review.
