# Nối tiếp chuyển động khi đổi flashcard

Trong phiên Học, khi chấm một thẻ, thẻ kế tiếp đổi từ bản xem trước phía sau thành thẻ có đầy đủ nội dung. Hiện tại animation đưa thẻ mới về `translateY(16px) scale(.92)`, `blur(10px)` và opacity `.55` trước khi đi lên. Sau khi người học kéo qua ngưỡng, thẻ xem trước có thể đã ở `translateY(4px) scale(.99)`, rõ và đục hoàn toàn. Bước nhảy ở giữa hai trạng thái làm đứt chuyển động.

Chọn phương án **Nối tiếp khi thả** từ mockup. Khi chấm bằng vuốt, nút hoặc phím, đọc `transform`, `filter` và `opacity` đang hiển thị của thẻ ngay sau thẻ trên cùng. Thẻ kế tiếp bắt đầu từ ba giá trị này và tiến đến trạng thái nghỉ theo curve và thời lượng hiện tại. Đọc computed style lúc chấm để lấy giá trị đang được nội suy nếu hiệu ứng theo tay chưa chạy xong.

| Khi | Thì |
|---|---|
| Thả sau khi kéo qua ngưỡng, hoặc vuốt nhanh hợp lệ | Thẻ kế tiếp bắt đầu từ trạng thái đang hiển thị lúc thả, kể cả khi nó vẫn đang di chuyển. |
| Chấm bằng nút hoặc phím | Thẻ kế tiếp đi lên từ vị trí của nó trong chồng thẻ. |
| Thả dưới ngưỡng, hủy thao tác hoặc thẻ chưa lật | Luồng hiện tại xử lý như trước, không tạo trạng thái để chuyển thẻ. |
| Bật reduced motion | Dùng fade hiện tại, tối đa 140 ms. |
| Hết bộ thẻ hoặc lưu lỗi làm app trả về thẻ trước | Chỉ dùng trạng thái đã chụp cho đúng thẻ kế tiếp của lượt chấm đó. |

Phạm vi là frontend phiên flashcard. Phương án giữ hiệu ứng tan mờ và render thẻ đầy đủ khi nó lên trên cùng. Nó giải quyết bước nhảy do điểm bắt đầu. Chi phí render và độ mượt trên Android thật cần được đo riêng.

Xong khi regression test chứng minh khung hình đầu tiên dùng các giá trị đã lấy, các test chấm và rollback vẫn xanh, và browser check so được computed style trước lúc thả với keyframe đầu tiên sau lúc thả. Nếu chưa kết nối Android, báo rõ giới hạn của phép đo.
