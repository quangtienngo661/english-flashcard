# Đề xuất cải thiện sau khi xong giao diện người học (23/10/2026)

**Trạng thái:** đề xuất, **chưa quyết định**. Chủ dự án (23/10/2026): xem lại sau khi xong giao diện người học cho Bước 3–7 (hết M5b
của plan `docs/superpowers/plans/2026-10-22-giao-dien-nguoi-hoc.md`). Khi chọn một mục, mục đó đi qua quy trình thường: brainstorm → design →
decision record → plan.

Nguồn: đánh giá của Claude ngày 23/10/2026 trên `dev` @ `39f25c6` (M1–M5a đã merge), từ góc nhìn người học và giáo viên. Đối chiếu với design các
bước, [`APP_REFERENCES_FUTURE_IDEAS_2026-10-19.md`](APP_REFERENCES_FUTURE_IDEAS_2026-10-19.md) (ý tưởng I1–I13),
[`COMPETITOR_ANALYSIS_AI_ENGLISH_APPS_2026-09-30.md`](COMPETITOR_ANALYSIS_AI_ENGLISH_APPS_2026-09-30.md) và
[`SURVEY_ANALYSIS_2026-09-30.md`](SURVEY_ANALYSIS_2026-09-30.md). **Chưa có dữ liệu người dùng thật**: mọi nhận định dưới đây là giả thuyết, cần đo.

## 1. Nhận định tiềm năng

Điểm tổng (ý kiến, không phải số đo): **khoảng 6,5/10 về sản phẩm, thực thi tốt**. Nền chắc: lịch ôn rõ, chấm theo luật nên rẻ, hai ngôn ngữ, edge
case viết kỹ, có báo lỗi và trả lượt. Chưa chứng minh được việc người học quay lại hằng ngày. Đối thủ trực tiếp: Quizlet, Anki, Luyện Từ và AI chat phổ
thông (ChatGPT Study Mode, Gemini).

### 1.1 Góc nhìn người học

| Mạnh | Yếu |
|---|---|
| Gặp từ ở đâu cũng thêm được (nhận ra "went → go"), lưu câu ngữ cảnh | Không có âm thanh, không nghe được cách đọc |
| Kho từ CEFR-J có nghĩa tiếng Việt và chủ đề, mở app là có từ để học | Kết quả luyện không chạm lịch ôn trừ khi tự bấm (D16 Bước 3); "Đã biết" do người học tự chấm nên dễ ảo tưởng là đã thuộc |
| Luyện **dùng** từ trong câu (điền từ, chọn nghĩa trong câu, trắc nghiệm theo câu), không chỉ kiểm tra định nghĩa: đúng điểm khác biệt đã chọn | Điểm khác biệt nằm sau gói Dùng thử / Pro: gói Miễn phí không thấy câu AI |
| Người học chủ động: tự bấm Cần ôn lại / Đã biết, gợi ý nhiều nấc, Từ hay sai, báo lỗi được trả lượt | Đã bỏ đường vào "Điền từ từ câu bạn đã lưu" trên giao diện (D10 giao diện người học), dù kiểu câu này không tốn AI và rất cá nhân |
| Minh bạch về lượt, gói, giao dịch | Chưa có cảm giác tiến bộ (chuỗi ngày, mục tiêu tuần, số từ đã thuộc); khảo sát ghi người học "khó duy trì" |
| | Chưa có app điện thoại; thói quen học từ chủ yếu trên điện thoại |

### 1.2 Góc nhìn giáo viên

- Dùng được: kho từ theo trình độ, chủ đề và loại từ để giao cho học sinh; câu AI có kênh báo lỗi.
- Chưa dùng được để dạy: không có lớp, mã lớp, bộ từ chia sẻ, giao bài, hay theo dõi học sinh yếu từ nào. Admin hiện là công cụ soạn nội dung.
- Giáo viên và trung tâm là kênh có người dùng rẻ ở Việt Nam (B2B2C); hiện chưa khai thác.

## 2. Danh sách cải thiện (xếp theo hiệu quả trên chi phí)

| # | Đề xuất | Vì sao | Chi phí, chạm quyết định nào |
|---|---|---|---|
| C1 | **Phát âm bằng giọng đọc của trình duyệt** (`speechSynthesis`) ở trang từ, thẻ ôn, kết quả luyện | Lấp khoảng trống lớn nhất của người học | Gần như 0 đồng, không cần API; một nút loa. Giọng phụ thuộc máy (cần kiểm trên Windows, Android, iOS) |
| C2 | **Kết quả luyện gợi ý cập nhật lịch ôn**: trả lời sai trong Luyện tập thì hỏi "Đưa vào ưu tiên?" (mặc định có), hoặc thêm cài đặt bật tự động | Nối hai vòng ôn và luyện; bớt chuyện tự chấm sai | Nới D16 Bước 3 ("hệ thống không bao giờ tự đổi mức") thành tùy chọn bật; `learning_log` đã đủ dữ liệu |
| C3 | **Đưa lại "Điền từ từ câu bạn đã lưu"** thành một nguồn trong Tùy chỉnh phiên, mở cho gói Miễn phí | Không tốn AI, cá nhân hóa, cho người học lý do lưu câu | Chỉ giao diện: API Bước 7 đã có (`cloze_source: own`); đổi D10 giao diện người học và luật gói của kiểu câu này |
| C4 | **Cho gói Miễn phí nếm câu AI** (ví dụ 3 câu AI mỗi ngày, ý tưởng I4) | Người dùng phải thấy điểm khác biệt trước khi trả tiền | Đổi F31 (Free không có AI); kho lượt AI theo ngày (sổ lượt Bước 5 đã có kiểu kho theo ngày); giữ trần chi phí toàn hệ thống `ai_daily_cap` |
| C5 | **Bài "Đặt câu với từ này"**, AI chấm và nhận xét ngắn | Tự viết ra câu (generation effect) nhớ lâu hơn nhận diện; AI chat phổ thông không tự gói được việc này vào lịch ôn | Đổi quyết định 02/10/2026 (tạm bỏ góp ý câu); tốn AI nên dành cho Pro; một thao tác AI mới, luật chấm và báo lỗi |
| C6 | **Động lực nhẹ**: chuỗi ngày, mục tiêu tuần, "đã thuộc N từ", email tóm tắt tuần | Giữ người dùng quay lại mà không cần xu, cửa hàng (I1, I2 là bản nặng hơn) | Nhỏ; số liệu đã có trong `learning_log`; email dùng hạ tầng nhắc học Bước 3 |
| C7 | **Bắt đầu theo mục tiêu**: bài kiểm tra trình độ 2 phút, gợi ý bộ từ theo mục tiêu (IELTS, TOEIC, đi làm, chuyên ngành) | Tránh màn trống, có giá trị ngay ngày đầu | Dùng kho từ hiện có; cần soạn vài "lộ trình" (bộ lọc trình độ + chủ đề có sẵn) |
| C8 | **PWA cài được + nút chia sẻ để thêm từ** trên điện thoại, trước khi làm Flutter | Thêm từ ngay lúc đang đọc trên điện thoại | Manifest + service worker + Web Share Target; không đổi API; kiểm với CSP và OpenNext (D20, D21) |
| C9 | **Lớp học tối giản cho giáo viên**: mã lớp, bộ từ chia sẻ, bảng "từ cả lớp hay sai" (ý tưởng I8) | Mở kênh B2B2C | Lớn: module hoặc phần Learning mới, quyền mới, quyền riêng tư của học sinh. Nên để sau V1 |
| C10 | **Đo trước khi mở rộng**: một lần gọi AI thật bằng khóa của chủ dự án, tỷ lệ câu AI bị luật loại, giữ chân D7/D30 | Hiện chất lượng câu AI và độ giữ chân đều chưa biết | Design Bước 6 §19, Bước 7 §20 đã nêu; telemetry (thứ tự ưu tiên trong `PROJECT_CONTEXT.md`) |

## 3. Đề xuất thứ tự

1. **Làm ngay sau M5b (rẻ, không tốn AI, tăng giá trị hằng ngày):** C1, C3, C2.
2. **Cần chủ dự án chốt về sản phẩm và chi phí trước:** C4, C5.
3. **Trước khi tìm người dùng thật:** C10, C6, C7.
4. **Khi có app điện thoại hoặc trước Flutter:** C8.
5. **Sau V1:** C9.

## 4. Câu hỏi mở cho lúc xem lại

- C2: gợi ý từng lần (hỏi) hay cài đặt bật/tắt một lần? Mặc định nào?
- C3: kiểu câu từ câu đã lưu có thuộc gói Miễn phí không (hiện thuộc Dùng thử / Pro theo Bước 7)?
- C4: bao nhiêu lượt mỗi ngày, kho riêng hay chung với Dùng thử, ảnh hưởng chi phí dự kiến?
- C5: chấm theo tiêu chí nào (đúng nghĩa của từ, ngữ pháp, tự nhiên), và câu bị chấm sai thì người học khiếu nại thế nào?
- C9: giáo viên có cần gói riêng không, học sinh dưới 13 tuổi thì sao (luật tuổi từ đợt sửa Bước 0–3)?
