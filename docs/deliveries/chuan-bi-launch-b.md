# Chuẩn bị launch đợt B — plan tóm tắt (04/11/2026)

Plan đầy đủ: [`../superpowers/plans/2026-11-04-chuan-bi-launch-b.md`](../superpowers/plans/2026-11-04-chuan-bi-launch-b.md). Design:
[`../superpowers/specs/2026-11-04-chuan-bi-launch-b-design.md`](../superpowers/specs/2026-11-04-chuan-bi-launch-b-design.md). Bản này là ảnh chụp lúc duyệt plan; as-built
nối tiếp bên dưới khi làm xong. M1 bắt đầu sau khi M3 của đợt A đã vào `dev`.

## M0 — Spike CSP `nonce` (song song đợt A M1)

1. Thử CSP có `nonce` cho `/app` trên bản build Worker (nhánh bỏ đi); ghi kết quả, quyết M4 làm được hay phải chờ OpenNext.

## M1 — Đơn hàng và payOS (API)

2. Thêm bảng đơn hàng, lần trả, kỳ trả trước, link payOS giả; thêm kỳ "3 tháng" và hai loại email mới vào ràng buộc.
3. Ba setting giá (79.000 / 199.000 / 599.000 ₫) và gửi bảng giá cho web.
4. Cấu hình payOS (thật, giả, tắt); API không khởi động khi thiếu biến hoặc bật bản giả ở production.
5. Hàm thuần: mã đơn, nội dung chuyển khoản `WM…`, khóa của lần trả, ngày bắt đầu và kết thúc kỳ, ngày "tới hết".
6. Tự kiểm chữ ký webhook payOS, đối chiếu với SDK; bỏ thông tin người chuyển khỏi dữ liệu thô.
7. Adapter payOS, bản giả và trang thanh toán giả cho test và smoke.
8. Đưa sự kiện "đã trả" sang bộ xử lý đơn hàng trước nhánh "không biết người dùng".
9. Kỳ trả trước thành nguồn Pro: gói, chu kỳ AI, kỳ sắp tới và "Pro tới hết" trong snapshot.
10. Bộ luật T1–T14 quyết mỗi lần trả: mở kỳ, nối kỳ, cần xem, hoàn tiền sau khi xóa tài khoản.
11. API tạo đơn và xem đơn của học viên; payOS lỗi thì đơn hỏng và cho bấm lại.
12. Job đối soát hằng giờ và nút kiểm ở trang về.
13. API admin cho đơn hàng (xác nhận tay, hủy, đã xử lý, thu hồi kỳ) và xóa tài khoản có đơn.
14. Lệnh đăng ký webhook payOS và smoke thanh toán với payOS giả; mở PR M1.

## M2 — Mua trên web, admin, email, văn bản

15. Email sắp hết hạn và biên nhận cho gói trả trước.
16. Trang gói: ba kỳ có giá, câu không hoàn tiền, nút Mua, đổi câu "Gói Pro chưa mở bán", nhắc mất thời gian Pro khi xóa tài khoản.
17. Trang về từ payOS: hỏi trạng thái đơn và báo kết quả.
18. Màn "Đơn hàng" của admin.
19. Viết lại Điều khoản phần thanh toán, thêm mục payOS và quảng cáo vào Chính sách bảo mật; thêm mục payOS vào checklist deploy; mở PR M2.

## M3 — Ai thấy quảng cáo, hộp thoại giới thiệu Pro

20. Luật ai thấy quảng cáo: Free, không phải staff, từ 16 tuổi.
21. Hộp thoại giới thiệu Pro khi chuyển tới Nhóm hoặc Tra từ, tần suất giới hạn; mở PR M3.

## M4 — AdSense vignette

22. CSP có `nonce` cho `/app`, kiểm `/app` dựng theo request và landing dựng sẵn, e2e CSP.
23. Chỉ nạp AdSense ở Nhóm và Tra từ, tải lại cả trang khi rời; chân trang app thành link thường; mở PR M4.
24. Chạy hết smoke; chủ dự án mua thật một kỳ sau deploy; bật AdSense sau khi Google duyệt; viết as-built.
