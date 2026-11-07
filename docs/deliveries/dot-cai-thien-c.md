# Đợt cải thiện C — plan tóm tắt (07/11/2026)

Plan đầy đủ: [`../superpowers/plans/2026-11-07-dot-cai-thien-c.md`](../superpowers/plans/2026-11-07-dot-cai-thien-c.md). Design:
[`../superpowers/specs/2026-11-06-dot-cai-thien-c-design.md`](../superpowers/specs/2026-11-06-dot-cai-thien-c-design.md). Decision record:
[`../superpowers/decisions/2026-11-06-dot-cai-thien-c-decisions.md`](../superpowers/decisions/2026-11-06-dot-cai-thien-c-decisions.md).

Phiên BE (Sonnet 5.5, xhigh) làm Task 1–23; phiên UI làm Task 24–31 khi API nó cần đã vào `dev`.

**BE1 — Học và Ôn (API)**
1. Thêm hai luật lịch: Học (chỉ từ mới lên nấc 1) và Ôn (đúng + đến hạn thì lên nấc; đúng một từ ưu tiên chỉ bỏ cờ).
2. Lật thẻ dùng luật Học; hàng thẻ có thêm chế độ "chỉ từ mới"; phát lại lần lật thẻ trả đúng cờ ưu tiên.
3. Migration: loại phiên `practice` / `recall`, kết quả lịch của từng câu, một phiên mở cho mỗi loại.
4. Learning: danh sách "từ đã học" của nhóm (trong trần ôn) và ghi kết quả Ôn vào lịch.
5. Mở phiên Ôn: không trừ lượt, không đóng phiên Luyện tập đang dở, tối đa 10 câu.
6. Câu trả lời cuối của phiên Ôn đổi lịch và trả kết quả lịch về app.
7. Tổng kết phiên Ôn (lên nấc, đúng giữ nấc); lịch sử Luyện tập bỏ phiên Ôn.

**BE2 — Chuỗi ngày**
8. Đánh dấu ngày học riêng với ngày chỉ thêm / xoá từ; biết lần học đầu tiên trong ngày.
9. Tính chuỗi ngày; trả số chuỗi ở lần học đầu tiên trong ngày.
10. Thêm dòng "Bạn đang có chuỗi N ngày" vào email nhắc khi chưa học hôm nay.

**BE3 — Phiên âm**
11. Thêm cột phiên âm UK / US (và ô của từ riêng) vào bản sửa của nghĩa, kiểm ký hiệu, giữ hash cũ.
12. Admin sửa phiên âm qua API; CSV nhập / xuất có cột phiên âm.
13. Người học ghi phiên âm cho từ riêng, mỗi nghĩa một ô.
14. Trả phiên âm cùng mọi nghĩa (thẻ, trang từ, tra từ).

**BE4 — Giọng đọc**
15. Cấu hình Google TTS và kho file R2, bản giả để chạy local.
16. Tính khoá file và đổi ký hiệu IPA sang bảng của Google.
17. Bảng file giọng đọc; tạo việc sau khi đăng nghĩa hoặc lưu từ riêng; trả URL file cùng nghĩa.
18. Gọi Google trong hàng việc nền: thử lại, lỗi không thử lại, trần ký tự mỗi ngày.
19. Vòng quét việc bị bỏ dở, dọn file không dùng, trạng thái giọng và nút "Tạo lại" cho admin.

**BE5 — Nạp dữ liệu và kiểm cuối**
20. Lệnh dựng CSV phiên âm từ dữ liệu Wiktionary (kiểm dữ liệu thật trước).
21. Lệnh tạo giọng đọc cho cả kho.
22. Trang nguồn dữ liệu hiện Wiktionary.
23. Smoke cho cả đợt, chạy lại smoke cũ; ghi việc trước launch và chính sách bảo mật.

**FE1 — Học / Ôn và chuỗi ngày trên web**
24. Cặp nút Học · Ôn ở thẻ nhóm, trang nhóm, trang Hôm nay; số "đã thuộc".
25. Trang Học mở theo chế độ "chỉ từ mới" hoặc "mọi từ".
26. Trang Ôn và màn xong phiên Ôn.
27. Toast chuỗi ngày.

**FE2 — Phiên âm và giọng đọc trên web và admin**
28. Admin: ô phiên âm, trạng thái giọng, ô trần ký tự TTS.
29. Nút loa phát file có sẵn, rơi về giọng máy; CSP cho phép file âm thanh.
30. Dòng phiên âm ở thẻ, trang một từ, tra từ, form từ riêng.
31. Review giao diện bằng các skill UI, kiểm trên bản build; viết checklist cho chủ dự án.
