# Pagination cho trang chủ đề và card gợi ý

**Trạng thái:** chủ dự án đồng ý dùng design này để lập plan ngày 14/11/2026. Cơ sở: [audit](../../audit/2026-11-14-topic-suggestions-audit.md), [review độc lập](../reviews/2026-11-14-topic-pagination-design-review.md) và [implementation plan](../plans/2026-11-14-topic-pagination.md).

## Mục tiêu và quyết định

- **Chủ dự án chốt:** giữ trang chi tiết chủ đề, thêm pagination. Các card Hôm nay tiếp tục mở đúng topic và level tại trang này; các đường vào từ trang từ và từ group tiếp tục hoạt động.
- **Chủ dự án yêu cầu:** Hôm nay hiển thị tối đa 4 card random mỗi lần load. Random không đảm bảo khác tập cũ; nếu dưới 4 topic đủ điều kiện, hiển thị số hiện có. Một topic không xuất hiện hai lần trên cùng lượt. Giữ ngưỡng 10 sense và response shape hiện tại.
- **Chủ dự án chốt:** checkbox “Chọn tất cả” áp dụng cho từ chưa học trên trang hiện tại. Lựa chọn ở các trang khác được giữ. Nút riêng “Thêm tất cả từ chưa học” áp dụng toàn chủ đề ở level đang xem.
- **Đề xuất:** 20 sense/trang và nút Trang trước / Trang sau. Server tính số toàn bộ, đang học và chưa học theo topic + level. “Chưa học” nghĩa là người dùng chưa có learning item cho sense đó ở bất kỳ group nào.

## Hành vi đề xuất

1. Mở `/app/topic?code=…&level=…` hiển thị tên, tổng theo chủ đề, trạng thái học và tên group chứa sense ở trang đang xem. Chờ danh sách group tải xong trước khi cho thêm. Nếu link mang `group` hợp lệ, lấy group đó làm đích. Nếu vào trang không kèm `group`, ưu tiên group trùng tên topic + level hoặc đề xuất tạo group theo cơ chế hiện tại. Nếu tải lỗi hoặc mất quyền với group đích, hiển thị trạng thái tương ứng để người dùng thử lại hoặc chọn một group hợp lệ.
2. Trang sau / trước dùng cursor của `/v1/senses`, chỉ lấy trang cần thiết và trạng thái cho tối đa 20 sense; lưu cursor của trang đã đi qua. Render tối đa 20 dòng. Không tự quét hết page ở background. Tổng hiển thị do server tính, độc lập với số dòng đã tải; không suy ra tổng từ trang hiện tại.
3. Tick hoặc bỏ tick từng sense chưa học. “Chọn tất cả trên trang này” tick mọi sense chưa học đang hiển thị. Bỏ tick checkbox đó chỉ bỏ lựa chọn của trang hiện tại. Nút “Thêm từ đã chọn” hiện tổng mục đang tick trên tất cả trang đã chọn. Đổi topic hoặc level thì reset trang và lựa chọn. Đổi group đích vẫn giữ lựa chọn.
4. “Thêm từ đã chọn” gửi đúng các ID đang tick. “Thêm tất cả từ chưa học” gửi topic + level để server xác định tập đủ điều kiện lúc submit. Nút này hoạt động độc lập với checkbox, kể cả các sense ở trang chưa mở.
5. Server kiểm tra group đích, topic, level và trạng thái chưa học cho cả hai thao tác trước khi ghi. Khi thiếu chỗ, thêm theo thứ tự browse `/v1/senses` (rank, lemma, pos, sense_id) tới giới hạn group. Với thao tác theo ID, báo số đã thêm và các ID bị bỏ qua theo lý do, giữ tick cho mục còn đủ điều kiện nhưng chưa thêm vì thiếu chỗ. Với thao tác toàn bộ, báo số đủ điều kiện lúc submit, số đã thêm và số vượt số chỗ còn lại. Sau khi ghi, cập nhật tổng, group và trạng thái ở các trang đã xem.
6. Random card được tính mỗi lần thực sự mở/tải Hôm nay; kết quả giữ ổn định trong lần xem đó, không đổi chỉ vì focus tab, rerender hay request chạy lại. Có thể trùng ngẫu nhiên kết quả trước. Nếu request lỗi, không thay bằng gợi ý cũ mà không cho người dùng biết.

## Hướng kỹ thuật đề xuất

- Dùng pagination cursor hiện có `/v1/senses` và `/v1/items?sense_ids=…` cho từng trang. Cần API đọc tổng và trạng thái học theo topic + level, do server tính dựa trên cùng tập catalog sense mở, live, không phải function word, displayed level giống trang hiện tại. Không để Content query trực tiếp bảng Learning: tuân thủ module ownership thông qua service/interface phù hợp.
- Tập lựa chọn trong UI là các ID đã tick qua các trang. Thao tác toàn chủ đề chỉ truyền filter, không cần tải hết sense về browser hay lưu danh sách bỏ chọn. Cả hai mode dùng contract dành cho trang chủ đề. Content cung cấp tập sense theo điều kiện browse, Learning kiểm tra owner/group, trạng thái học và giới hạn group dưới learner lock trước khi ghi. Bulk API hiện tại vẫn phục vụ các caller với contract của nó.
- Giữ group đích, payload có thứ tự và `Idempotency-Key` khi retry cùng lần thêm. Nếu gửi nhiều batch theo ID, theo dõi batch đã xác nhận, xử lý rate limit và báo kết quả một phần. Plan cần cụ thể hóa cách replay receipt khi response bị mất và cách refresh trạng thái mà vẫn giữ những mục hợp lệ chưa thêm.
- API gợi ý thay seed theo user/ngày bằng random theo lần mở Hôm nay. Web giữ kết quả ổn định trong mỗi lượt xem. Query chỉ trả tối đa bốn sample cho mỗi cặp topic + level đã chọn, giữ response shape, i18n và tên hiển thị. Đo chi phí query riêng với kích thước response.
- Đường đi cũ và contract của các màn khác được giữ. Không thay đổi trang Tra từ hay count của Tra từ trong phạm vi này.

## Edge cases When → Then

| When | Then |
|---|---|
| Topic không có sense hợp lệ | Hiện empty state, tổng 0, không gọi thao tác thêm. |
| Trang sau lỗi | Giữ selection và trang trước; báo lỗi, cho retry; không nhảy sang trang trống. |
| Cursor trả trang rỗng trong khi topic vẫn còn sense | Quay về trang hợp lệ và giữ các mục đã chọn còn đủ điều kiện. |
| Danh sách thay đổi trước submit | Với các mục đã tick, server chỉ xét các ID được gửi và báo mục không còn hợp lệ. Với “Thêm tất cả từ chưa học”, server tính theo dữ liệu lúc submit. |
| Một sense được học ở group khác sau khi người dùng chọn | Không thêm sense đó trong thao tác theo topic chưa học; cập nhật count và thông báo kết quả thực tế. |
| Bỏ tick checkbox của trang 2 | Bỏ các mục được chọn ở trang 2 và giữ các mục đã tick ở trang 1. Nút thêm toàn chủ đề vẫn áp dụng cho tập chưa học lúc submit. |
| Group bị xóa, hết chỗ, hoặc mất quyền | Không tạo group thay thế âm thầm; báo lỗi hoặc số bỏ qua đúng kết quả server; không mất lựa chọn trước khi người dùng xử lý. |
| Một batch thủ công thành công rồi batch tiếp theo lỗi | Báo rõ có thể đã thêm một phần; retry không tạo group mới hoặc thêm trùng, giữ thông tin đủ để tiếp tục an toàn. |
| Có ít hơn 4 topic đủ điều kiện | Hiện số có sẵn; 0 topic thì ẩn block như hiện nay. |

## Kiểm chứng trước khi hoàn tất

- Test server: phân trang, tổng, filter, các trạng thái học và quyền; thêm toàn bộ / theo ID / group đầy / concurrency / idempotency; regression test cho bulk caller hiện có.
- Test web: trang trước/sau, lỗi/retry, chọn qua trang, chọn tất cả và bỏ chọn, group đích, thêm một phần; i18n và responsive. Card: 0–4 topic, random có kiểm soát, cache và href chính xác.
- Browser với dữ liệu lớn và topic nhỏ đối chứng: network chứng minh trang đầu và chuyển trang chỉ tải dữ liệu tương ứng; DOM không render hàng nghìn dòng. Ghi request count, thời gian, account/test data và revision. Không thao tác thêm trên dữ liệu production của người dùng khi chưa có quyền cụ thể.
- Random được test bằng random source kiểm soát được, không dựa vào việc hai lần chạy tình cờ khác nhau.

## Rủi ro còn mở

- Tổng toàn topic và thêm toàn bộ đòi hỏi server work. Chi phí query và tính nhất quán khi thao tác đồng thời cần kiểm tra bằng dữ liệu thật.
- Kết quả hiển thị dựa trên receipt của lần ghi. Cần kiểm thử retry sau khi ghi thành công nhưng response bị mất, và trường hợp chỉ thêm được một phần do group đầy hoặc batch sau lỗi.
- URL production đã xác nhận 2.694 sense và 2.000 đang học; chưa có network trace hay timing làm baseline. Không suy diễn 54 request là số đã đo.
