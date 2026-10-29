# Nhóm B (chất lượng AI) — plan tóm tắt (29–30/10/2026)

Plan: [`../superpowers/plans/2026-10-29-nhom-b.md`](../superpowers/plans/2026-10-29-nhom-b.md) (một plan, làm tuần tự M1 → M6, rồi phần đóng đợt). Design:
[`../superpowers/specs/2026-10-29-nhom-b-chat-luong-ai-design.md`](../superpowers/specs/2026-10-29-nhom-b-chat-luong-ai-design.md). Mỗi milestone một nhánh từ `dev`, PR vào
`dev` khi CI xanh. Bản này viết lại 30/10/2026 sau review plan (đánh số task mới) và sau các chốt D37–D40.

## M1 — Bộ ví dụ (golden set)

1. Hàm thuần: kiểu dữ liệu, kiểm ô mong đợi, chia dev / held-out, thống kê lần chạy.
2. Setting tỉ lệ held-out (mặc định 30%).
3. Bảng phiên bản bộ ví dụ, bảng kết quả từng ví dụ, migration chuyển dữ liệu cũ (ví dụ cũ vào dev).
4. Kết quả chạy thành dòng có ảnh chụp; bỏ cột Json cũ.
5. Cổng luật cho eval; job eval ghi kết quả luật và ô mong đợi.
6. Content tra dạng từ theo lemma; Practice cung cấp luật cho eval.
7. API ví dụ: split, ô mong đợi, nguồn, che held-out, điền sẵn dạng từ, tạo ví dụ từ module khác.
8. Chốt phiên bản, mở ví dụ held-out (chuyển sang dev), danh sách id bị che.
9. Chạy eval trên phiên bản đã chốt; kết quả chia dev / held-out.
10. So hai lần chạy cùng phiên bản.
11. Che held-out ở trang Các lần gọi và nút chạy thử.
12. Admin: client API và ô mong đợi trong hộp thoại ví dụ.
13. Admin: trang eval có dòng held-out, nút mở, chốt phiên bản, danh sách phiên bản.
14. Admin: nhập hàng loạt có cột ô mong đợi và split.
15. Admin: chạy trên phiên bản; hiện kết quả luật và ô mong đợi.
16. Admin: màn so hai lần chạy.
17. Admin: trang Các lần gọi, ô tỉ lệ held-out, e2e giả lập và e2e thật.
18. Smoke `smoke:nhom-b` phần M1.
19. Kiểm toàn bộ M1.

## M2 — Vòng đời cấu hình

1. Bảng cấu hình, con trỏ bản đang chạy, sự kiện publish / rollback.
2. Luật cổng publish dạng hàm thuần (bản đang chạy chưa có model thì không cần mốc, D37).
3. Nháp: đọc, tạo, lưu (chặn ví dụ mẫu lệch), xóa, chạy thử.
4. Chạy eval theo cấu hình.
5. Kiểm trước publish, publish, tắt AI một thao tác (D38), rollback, lịch sử.
6. Admin: trang "Cấu hình" — bản đang chạy và nháp; ô chọn model ẩn model `retired` (D40).
7. Admin: trang "Cấu hình" — publish, hộp hỏi khi tắt AI, rollback, lịch sử.
8. Chuyển gateway sang đọc cấu hình đang chạy (migration chép prompt và cài đặt hiện có).
9. Endpoint cũ đọc cấu hình đang chạy; chặn xóa model đã từng dùng; bỏ hai `PUT`.
10. Các script (hai smoke cũ, `learner:setup`) publish theo đường thật.
11. Admin: một mục "Cấu hình" trong menu, bỏ trang cũ, e2e giả lập.
12. E2e thật đi theo đường cấu hình.
13. Smoke phần M1 chạy trên nháp, phần M2, kiểm chạy thật của milestone.

## M3 — Judge

1. Hàm thuần: kiểu judge, đổi câu trả lời judge thành điểm, đếm, độ khớp, trần admin.
2. Setting trần USD admin, số nhãn tối thiểu, độ khớp tối thiểu.
3. Bảng judge và migration; tạo sẵn judge "Chỉ một đáp án".
4. Thao tác gateway `judge`.
5. Trần lời gọi chỉ đếm người học; kiểm USD admin trước mỗi lần gửi.
6. Việc admin dừng khi chạm trần và cần model có giá.
7. API judge: danh sách, tạo, lưu bản mới, nhân bản, lịch sử; chặn xóa model của judge.
8. Bắt đầu lượt chấm trên lần chạy hoặc trên đối tượng cho sẵn.
9. Job chấm, hàng đợi, bật judge lúc tạo lần chạy, dọn lượt treo.
10. Nhãn người và độ khớp.
11. Điểm judge trên lần chạy, trong màn so sánh; ẩn lần chạy có nhãn thay vì xóa.
12. Tiêu chí judge trong cổng publish.
13. Che lời gọi judge của ví dụ held-out; đọc nội dung lời gọi cho M4.
14. Admin: client, ô setting, mục đích `judge`.
15. Admin: trang "Judge" — danh sách, sửa, nhân bản, lịch sử, độ khớp.
16. Admin: judge trong form tạo lần chạy và bảng lần chạy.
17. Admin: judge trong màn so sánh và màn publish.
18. Admin: màn "Gắn nhãn" với phím 1 / 2 / 3.
19. E2e giả lập, kiểm truy cập, e2e thật.
20. Smoke phần M3.
21. Kiểm toàn bộ M3.

## M4 — Câu AI thật

1. `ai` đọc lượt chấm câu thật.
2. Test ghim luật lượt chấm của M3 cho câu thật.
3. Identity trả danh sách tài khoản staff.
4. Hàm thuần: nhận diện từ riêng, đọc đầu ra gốc, từ cùng phiên.
5. Ước tính và bắt đầu lượt chấm câu thật; setting giới hạn 200 câu.
6. Danh sách lượt chấm và kết quả.
7. "Đưa vào bộ ví dụ" từ báo lỗi đã xác nhận hoặc từ câu thật.
8. Admin: client, hộp thoại đưa vào bộ ví dụ, nút trên trang báo lỗi.
9. Admin: trang "Câu AI thật".
10. Câu thật trong màn "Gắn nhãn".
11. Smoke phần M4.
12. Kiểm toàn bộ M4.

## M5 — Dashboard

1. Settings trả giá trị một setting tại các thời điểm cho trước.
2. Số ngày chạm trần so với trần của chính ngày đó.
3. Đếm điểm judge và các bản judge kèm độ hiệu chỉnh.
4. Eval gần nhất của bản đang chạy mỗi thao tác.
5. Nhóm điểm judge từ eval; điểm câu thật cho Practice.
6. Dashboard AI có các khối mới.
7. Báo cáo chất lượng đếm báo lỗi đã xác nhận (sửa lỗi, hai commit).
8. Điểm câu thật trên dashboard.
9. Admin: khối hôm nay, ngày chạm trần theo trần của ngày, báo lỗi đã xác nhận.
10. Admin: thẻ eval, judge, câu thật; biểu đồ đánh dấu chỗ đổi bản judge.
11. Smoke phần M5.
12. Kiểm toàn bộ M5.

## M6 — D7/D30

1. Bảng `learning_activity_days`, xóa theo tài khoản.
2. Setting số ngày của cửa sổ "đang học" (mặc định 7).
3. Hàm thuần: tuần, cửa sổ, nhóm đăng ký, số hôm nay.
4. Ghi một "lần học" ở mọi chỗ ghi `learning_log` và mỗi câu luyện tập được trả lời.
5. Identity trả danh sách người đăng ký trong khoảng ngày.
6. Báo cáo giữ chân và endpoint `GET /v1/admin/learning/retention`.
7. Admin: thẻ D7/D30 trên dashboard, ô setting trên trang Cài đặt.
8. Smoke phần M6.
9. Kiểm toàn bộ M6.

## Đóng đợt

1. Smoke cuối và các smoke cũ trên DB mới.
2. Ghi as-built.
3. Lần chạy thật của chủ dự án (5 USD, hai model judge Anthropic, 30 nhãn).
