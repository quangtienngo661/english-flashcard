# Chuẩn bị launch đợt A — plan tóm tắt (04/11/2026)

Plan đầy đủ: [`../superpowers/plans/2026-11-04-chuan-bi-launch-a.md`](../superpowers/plans/2026-11-04-chuan-bi-launch-a.md). Design:
[`../superpowers/specs/2026-11-04-chuan-bi-launch-a-design.md`](../superpowers/specs/2026-11-04-chuan-bi-launch-a-design.md). Bản này là ảnh chụp lúc duyệt plan; as-built
nối tiếp bên dưới khi làm xong.

## M1 — Turnstile và security header

1. Thêm cấu hình Turnstile cho API (thật, giả, tắt; bắt buộc khai báo) và giới hạn số lần kiểm captcha theo IP.
2. Viết client gọi Cloudflare kiểm token, bản thật và bản giả; thử lại một lần, tách "bị từ chối" với "không gọi được".
3. Bắt token Turnstile ở đăng ký, đăng nhập, xin mã; Cloudflare lỗi thì đăng nhập vẫn qua, đăng ký và xin mã trả 503.
4. Cho các smoke và e2e admin gửi token giả.
5. Thêm security header cho API.
6. Thêm widget Turnstile vào đăng ký, đăng nhập, quên mật khẩu, gửi lại mã của web; lấy token mới sau mỗi lần gửi.
7. Mở CSP cho Turnstile và thêm ba header của web; build production fail khi thiếu site key; e2e trang đăng nhập với widget thật.
8. Thêm widget vào đăng nhập và quên mật khẩu của admin; header tĩnh cho admin; build fail khi thiếu site key.
9. Cập nhật checklist deploy, chạy tay với khóa test của Cloudflare, mở PR M1.

## M2 — Đợt sửa sau review

10. PR tài liệu: các mục review chỉ cần sửa tài liệu (checklist production, sự thật pháp lý, design cũ, việc để sau).
11. Bỏ script test chết, sửa nhãn, bắt key dịch sai lúc typecheck ở admin, bỏ assert theo class ở ba test web.
12. Sửa lỗi hoàn lượt AI khi không có lượt dùng đã xác nhận trong chu kỳ (test đỏ trước).
13. Sửa mốc chu kỳ AI khi subscription gia hạn: lấy thời điểm sớm hơn (test đỏ trước).
14. Đọc nghĩa hiển thị và xóa mục học dưới khóa của người học (test đỏ trước).
15. Giới hạn số lần chạy lại job theo số đã lưu trong DB (test đỏ trước).
16. Dọn bảng cửa sổ OTP và ngân sách mail cũ.
17. Gộp hàm ghi dòng xuất dùng chung cho hai controller.
18. Admin: lọc ký tự lạ ở ô tìm, đếm ngược khi bị khóa đăng nhập, ngày theo ngôn ngữ, xuất từ chưa có nghĩa, giới hạn xuất 10.000 dòng.
19. E2e "Đặt mật khẩu" cho tài khoản chỉ có Google; mở PR code của M2.
20. Chạy tay checklist dev, các lượt kiểm còn treo và đo tải; ghi kết quả.

## M3 — Lượt AI cho Free, tắt trial

21. Hàm tính chu kỳ AI theo tháng dương lịch cho gói Free.
22. Ghi lúc một nguồn Pro kết thúc và gói của mỗi lượt dùng (migration, hàm tính thời điểm kết thúc).
23. Ghi thời điểm kết thúc ở mọi chỗ đổi trạng thái subscription; tải thêm các nguồn đã kết thúc trong tháng.
24. Ba setting mới: lượt câu AI, lượt tra AI mỗi tháng cho Free, trần AI mỗi ngày riêng của Free.
25. Sổ lượt, snapshot, hoàn lượt và trần Free dùng chu kỳ mới.
26. Tắt trial cho người mới; sửa ba script đang dựa vào trial.
27. Web và landing hiện lượt AI của Free, bỏ câu trial.
28. Smoke cho lượt AI của Free (Pro về Free hai cách, hết lượt, trần ngày).
29. Sửa bản nháp Chính sách bảo mật và Điều khoản theo lượt AI của Free và việc tắt trial.
30. Chạy hết smoke trên DB mới, chạy tay, viết as-built.
