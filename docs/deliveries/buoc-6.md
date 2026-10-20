# Bước 6 — plan tóm tắt (20/10/2026)

Ảnh chụp lúc trình plan, chưa duyệt; đã cập nhật sau review plan
([`../superpowers/reviews/2026-10-20-buoc-6-plan-review.md`](../superpowers/reviews/2026-10-20-buoc-6-plan-review.md)). Plan đầy đủ:
[`../superpowers/plans/2026-10-20-buoc-6-ai-integration.md`](../superpowers/plans/2026-10-20-buoc-6-ai-integration.md); design:
[`../superpowers/specs/2026-10-20-buoc-6-ai-integration-design.md`](../superpowers/specs/2026-10-20-buoc-6-ai-integration-design.md).
Plan **chỉ có API** (D8); màn hình admin chủ dự án tự làm sau. Không gọi thật nhà cung cấp trong "Xong khi" (D19).

Cách làm: các phiên Claude implement song song, một phiên điều phối (D20); giữ mức **tối đa 4–5 phiên** của chủ dự án (19/10): ba phiên
implement và phiên điều phối, phiên điều phối tự chạy phần kiểm cuối. "Xong khi": xong mọi task, CI xanh trên mọi PR, `pnpm smoke:buoc-6`
chạy qua API và worker thật trên DB mới với bản giả (B6#1–B6#30; B6#19 và B6#26 kiểm bằng unit test).

**Chia phiên:**
- **step-6-A — Nền móng, ba thao tác, model:** task 1, 2, 3 (merge trước tiên vì hai phiên kia chờ nó), rồi 4, 5, 6, rồi 13, 14.
- **step-6-B — Bộ nối nhà cung cấp, rồi bộ ví dụ:** task 7, 8, 9; sau đó 16, 18 khi bộ chạy (task 12) đã merge.
- **step-6-C — Bộ chạy, rồi các API bên trên:** task 10, 11, 12; sau đó 15, 17, 19.
- **step-6-coordinator (phiên điều phối):** merge plan sau khi duyệt; mở step-6-A, rồi step-6-B và step-6-C (khi PR A1 đã merge) thành phiên con;
  merge các PR, báo phiên đang chờ; cuối cùng tự làm task 20 (kiểm cuối).

**Chốt sau review plan** (chủ dự án trả lời trước, Claude đề xuất sau):
- **D26:** plan không chốt ngôn ngữ lời dặn, vì lời dặn sửa được trong admin; bản nạp ban đầu chỉ là điểm khởi đầu, viết tiếng Anh; câu chặn do code giữ viết tiếng Anh.
- **D27:** level không bắt buộc: có level thì dặn câu không khó hơn level đó, không có thì không nhắm trình độ nào.
- **D28:** ô số token vẫn để trống được với model Anthropic không cho biết số tối đa; khi đó gửi 16.000 (con số chờ xác nhận khi duyệt plan).

**Chọn kỹ thuật trong plan** (design không ghi; ghi vào design khi xong; đánh số như plan):
1. Bộ nối trả về chữ thô; cổng tự đọc JSON.
2. Sổ chi phí ghi kết quả từng lần gọi bằng một bộ chữ cố định; câu trả lời sai khuôn được ghi là "sai khuôn".
3. Lần gọi của chạy thử và bộ ví dụ ghi mã của admin đã bấm.
4. Nhận dạng "hết tiền / chạm giới hạn chi" theo đúng câu lỗi trên trang chính thức của hai nhà cung cấp; 429 khác của Anthropic là "quá nhiều lời gọi".
5. Lệnh thử AI trên máy có thêm lệnh con "xóa dữ liệu AI của một người".
6. Lời dặn ban đầu nằm trong code và trong một migration với cùng chữ; một unit test giữ hai bản khớp nhau.
7. Hàng đợi bộ ví dụ nối Redis có giới hạn thời gian như hàng đợi CSV; worker như hàng đợi nhắc học.
8. `.env.example` bật sẵn bản giả cho máy local; code mặc định vẫn tắt; hai key để trống.
9. Thông tin model lưu thành cột; "chưa biết các mức effort" lưu như "không có mức nào"; "tắt thinking" đổi sang đúng kiểu của model lúc gọi.
10. Mỗi lần chạy bộ ví dụ lưu sẵn tham số đã chốt, bản prompt dùng và danh sách ví dụ lúc bấm; chỉ chạy đúng danh sách đó.
11. Unit test so hằng số với Content cho các hằng số Content có export; giới hạn 2.000 ký tự của nhãn ngữ cảnh chỉ chép kèm ghi chú.
12. Đổi tên trường log có chữ `token`/`code`.
13. Ví dụ thứ 101 của một thao tác bị từ chối bằng lỗi kiểm dữ liệu thường.
14. Kết quả "đang chạy" không kèm lý do.
15. Báo cáo chi phí mặc định là hôm nay; khoảng dài hơn 366 ngày bị từ chối.
16. Tình huống giả "lỗi rồi được" lỗi ở mọi lần gọi lẻ.
17. Kết quả đã quá 24 giờ bị xóa ngay lúc đọc.
18. Trần lời gọi đặt bằng 0 thì báo "chưa dùng được" không kèm giờ thử lại.
19. Mã thao tác hoặc mã người dùng sai dạng là lỗi lập trình của bên gọi (ném lỗi), không phải một kết quả AI.
20. Có chỗ trong hàng đợi mà còn dưới 2 giây thì trả "bận", không gọi.
21. Chạy bộ ví dụ khi chưa có ví dụ nào bị từ chối; đọc lại model trả lỗi như lúc thêm; tra lời gọi của một mã không có thì trả danh sách rỗng; id không có thì trả 404.
22. Thêm vài hằng số cố định (độ dài ghi chú, giá tối đa, dạng mã thao tác, cận trên số token khi không biết, số 16.000 của D28).
23. Dịch vụ AI có thêm hàm "chạy thử một lần" cho lệnh thử AI trên máy.

**Chờ chủ dự án:** duyệt plan, kèm lời dặn + ví dụ ban đầu (phụ lục A của plan) và con số 16.000 của D28.

**M1 — Nền móng (luồng A, B, C)**
1. Thêm nhóm cài đặt `ai` (thời gian chờ, số lời gọi cùng lúc, trần lời gọi mỗi ngày, số ngày giữ nội dung, tỷ giá).
2. Thêm cấu hình key OpenAI/Anthropic và cờ bản giả (chặn khi production), giới hạn `ai.test` 20 lần/giờ, cài hai thư viện chính thức đã chốt phiên bản.
3. Tạo 10 bảng của AI kèm ba dòng lựa chọn ban đầu (chưa có model), các kiểu dữ liệu chung, hằng số cố định và module rỗng.
4. Định nghĩa ba thao tác: luật dữ liệu vào, khuôn JSON gửi nhà cung cấp, cách chuẩn hóa và kiểm câu trả lời.
5. Luật lưu prompt (lời dặn, tối đa 10 ví dụ đúng khuôn), cách ráp lời dặn + ví dụ + câu chặn, dấu vân tay của dữ liệu.
6. Nạp lời dặn ban đầu (đã duyệt) bằng migration và bộ đọc prompt hiện tại / theo lần sửa.
7. Ổ cắm chung cho nhà cung cấp, sổ đăng ký và bản giả với 10 tình huống.
8. Bộ nối OpenAI: ráp lời gọi, quy mọi lỗi theo bảng, đọc thông tin model, không để biến môi trường đổi địa chỉ gửi; kiểm bằng phản hồi mẫu, không gọi mạng.
9. Bộ nối Anthropic: như trên, gồm thinking, effort và đọc khả năng của model.

**M2 — Phần lõi (luồng D, E, F, G)**
10. Luật của bộ chạy: xử lý dòng đã có, thử lại nhanh một lần, quy kết quả và có lưu hay không, chọn số token gửi đi; tính chi phí và ước tính; hàng đợi lời gọi cùng lúc.
11. Đọc lựa chọn của thao tác, kiểm "dùng được không" (công tắc, model, key, trần lời gọi theo ngày giờ Việt Nam), ghi sổ chi phí và nội dung.
12. Bộ chạy đủ 8 bước (chống trùng 24 giờ, giành dòng, thời gian chờ là số nguyên, thử lại, kiểm khuôn trước khi ghi sổ) và dịch vụ cho module khác: kiểm dùng được không, gọi AI, chạy thử một lần, xóa dữ liệu theo người.
13. Danh sách model: thêm (kiểm mã, hỏi nhà cung cấp), sửa giá, đọc lại, xóa (chặn khi đang dùng, 404 khi không có), luật effort/thinking/số token; API admin.
14. Chọn model, effort, thinking, số token cho từng thao tác, có chống ghi đè và lịch sử; API admin.
15. API prompt: xem, lưu (chống ghi đè, lịch sử), xem lịch sử, chạy thử chữ đang sửa trên tối đa 5 ví dụ.
16. Bộ ví dụ: thêm/sửa/xóa ví dụ, chạy cả bộ ở worker qua hàng đợi riêng, ghi từng ví dụ ngay khi xong.
17. API tình trạng (dùng được không, lỗi gần nhất, số lời gọi hôm nay, cảnh báo model sắp ngừng), báo cáo chi phí, các lần gọi của một mã.
18. Bốn việc mỗi giờ: xóa kết quả hết hạn, xóa nội dung hết hạn, đọc lại thông tin model (mỗi dòng một lần), cứu lần chạy bộ ví dụ bị kẹt.
19. Lệnh thử AI trên máy (`pnpm ai:fake-call`, chạy song song, cùng hoặc khác mã, chạy thử, xóa dữ liệu một người) cho smoke.

**M3 — Kiểm cuối (luồng Z)**
20. Script `pnpm smoke:buoc-6` đi đủ B6#1–B6#30 và một cuộc đua 10 lời gọi cùng mã, chạy hai lần trên DB mới; CI xanh; ghi as-built.
