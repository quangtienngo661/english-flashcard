# Bước 7 — plan tóm tắt (21/10/2026)

Plan: [`../superpowers/plans/2026-10-21-buoc-7-practice-ai-content-ai.md`](../superpowers/plans/2026-10-21-buoc-7-practice-ai-content-ai.md) (23 task, 8 mốc; phụ lục A là prompt).
Design: [`../superpowers/specs/2026-10-21-buoc-7-practice-ai-content-ai-design.md`](../superpowers/specs/2026-10-21-buoc-7-practice-ai-content-ai-design.md).
Chỉ API; "Xong khi" = CI xanh trên mọi PR + `pnpm smoke:buoc-7` với AI giả trên DB mới (D3). Làm bằng các phiên song song + một phiên điều phối (D4).
Chủ dự án duyệt plan và bốn prompt ở phụ lục A, không đổi gì (21/10/2026).

> Viết trước plan đầy đủ theo yêu cầu của chủ dự án (21/10), rồi đối chiếu lại với plan: khớp, trừ task 4 được gộp vào task 2 (một migration cho cả Practice và
> Content). Số thứ tự dưới đây là số task trong plan.

## Mốc 1 — Nền (cài đặt, dữ liệu, kiểu)

1. Thêm cài đặt "số câu AI tạo trước" (mặc định 2, admin chỉnh 0–20).
2. Thêm bảng và cột của Practice: chỗ đang chờ của phiên, nguồn câu, thông tin lời gọi AI, "đã trừ lượt chưa", yêu cầu tạo câu, lý do báo lỗi (7 lý do ban đầu), dạng chia chưa biết, kết quả kiểm từ riêng.
3. Mở rộng kiểu dữ liệu của câu hỏi cho ba dạng mới, gợi ý nấc 3, bản dịch; các hằng số cố định.
4. (Gộp vào task 2) Thêm nguồn "AI gợi ý" cho từ riêng và bảng dạng chia bổ sung ở Content.

## Mốc 2 — Cổng AI

5. Thêm ba thao tác AI mới (câu chọn nghĩa, trắc nghiệm theo câu, kiểm từ riêng) với khuôn, luật và bản AI giả.
6. Nạp prompt ban đầu cho ba thao tác mới và bản prompt mới của điền từ (không đè bản admin đã sửa); sửa test kiểm prompt nạp sẵn.

## Mốc 3 — Content

7. Cho Practice đọc thêm loại từ, level, bản nội dung, dạng chia của nhiễu, nghĩa khác của cùng từ, nghĩa ngẫu nhiên, dạng chia bổ sung.
8. API cho staff nhận và gỡ dạng chia bổ sung.
9. Lưu gợi ý AI thành từ riêng kèm câu ví dụ và nhãn "AI gợi ý"; cho sửa câu ví dụ của từ riêng.
10. API "Tra bằng AI" (trừ lượt tra nghĩa, trả gợi ý kèm nghĩa catalog nếu có).

## Mốc 4 — Tạo câu AI (Practice)

11. Luật chọn dạng: từ nào làm được dạng nào, đánh dấu câu AI lúc mở phiên, số câu AI của phiên, ngân sách câu AI, xác suất ở vòng sau.
12. Dựng dữ liệu gửi AI và kiểm câu AI trả về (dạng hợp lệ, không lộ từ, nhiễu đúng danh sách), dựng câu hỏi từ kết quả.
13. Bộ tạo câu AI: yêu cầu tạo câu, kiểm sẵn sàng, kiểm từ riêng, giữ lượt, gọi AI, viết lại một lần, ghi câu có khóa, xác nhận lượt, chạy lại sau sự cố.
14. Tìm và dùng lại câu AI chưa từng hiện (cùng nội dung, nhiễu còn thấy được).

## Mốc 5 — Phiên luyện

15. Mở phiên có dạng mới: chặn Free, kiểm AI sẵn sàng, đánh dấu câu AI, kiểm đủ lượt trước.
16. `next` và `current` mới: chỗ đang chờ, "đang chuẩn bị", AI không dùng được, Thử lại, đổi sang dạng không AI, bài từ câu đã lưu.
17. API tạo trước K câu AI.
18. Gợi ý 3 nấc, bản dịch sau khi nộp, đáp án đúng của dạng mới trong lịch sử và kết quả.

## Mốc 6 — Báo lỗi và trả lượt

19. Danh sách lý do báo lỗi: API admin quản lý, API người học đọc theo loại câu.
20. Báo lỗi theo lý do: kiểm lý do và ghi chú bắt buộc, che từ riêng cho mọi dạng có lựa chọn, đồng ý khi báo câu AI của từ riêng; API "Báo lỗi của tôi".
21. Xác nhận lỗi câu AI và trả lượt (chỉ khi câu đã bị trừ), ghi vai trò người xử lý; danh sách trả lượt cho admin.
22. API cho staff xem và bỏ qua dạng chia chưa biết.

## Mốc 7 — Dọn dữ liệu

23. Job mỗi giờ giữ câu AI chưa từng hiện, xóa yêu cầu cũ, thử lại trả lượt; xóa từ riêng xóa yêu cầu và kết quả kiểm trước.

## Mốc 8 — Cổng "Xong khi"

24. Script `pnpm smoke:buoc-7` (chọn model giả cho các thao tác), chạy lại smoke Bước 4–6, ghi bản as-built.
