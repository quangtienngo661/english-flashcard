# Toàn cảnh project đến 30/09/2026

Tài liệu này tổng hợp tiến trình từ cuộc trò chuyện **Business Analysis** đến hiện tại. Phân biệt **đã thống nhất**, **đã quan sát**, **giả thuyết** và **chưa làm**. Hiện đã chọn hướng app học từ vựng/flashcard/thực hành AI để **chuẩn bị V1**, nhưng chưa có ứng dụng được triển khai hoặc bằng chứng thị trường.

## 1. Mục tiêu và nguyên tắc khởi đầu

Người dùng muốn trong khoảng **2–3 tháng** xây và public một sản phẩm có người dùng thật, vận hành được, đo được hành vi sử dụng và thử khả năng tạo doanh thu. Đây cũng là môi trường học Backend/Production Engineering và AI Systems thông qua các quyết định và sự cố thực tế. Doanh thu và tăng trưởng là giả thuyết, chưa phải kết quả đã đạt.

Thứ tự đã thống nhất: **problem → target users → core loop → MVP → ship → users → telemetry → failures/improvements → hardening/scale**. Tránh xây hạ tầng phức tạp trước khi có bài toán và người dùng. Hướng kỹ thuật ban đầu là NestJS modular monolith, PostgreSQL, Redis/BullMQ và workers khi cần, Docker, observability, CI/CD và managed infrastructure nếu hợp lý. Object storage, caching và AI chỉ thêm theo yêu cầu cụ thể. Kafka/Kubernetes/microservices cần vấn đề đã đo và ADR; **chưa có Architecture Spec được chốt**. Xem [Project Context](PROJECT_CONTEXT.md).

Khi viết spec, ADR hoặc subsystem design có quyết định hành vi/độ tin cậy quan trọng, phải nhắc **“Decision này cần Defense Analysis trước khi chốt spec.”** Sau vài hint để người dùng tự reasoning, kiểm tra invariants, edge/failure cases, concurrency, duplicate/idempotency, partial failure, timeout/retry, security, observability, recovery, alternatives và trade-offs. Đây là checkpoint phân tích, không phải bước xin phép. Xem [Decision Analysis Template](DECISION_ANALYSIS_TEMPLATE.md).

## 2. Diễn biến product discovery

| Mốc | Việc đã làm / quyết định | Kết quả thực tế |
| --- | --- | --- |
| 29/09/2026 — chuyển sang workspace | Ghi mục tiêu, nguyên tắc sản phẩm/kỹ thuật và mẫu phân tích quyết định trong `outputs/`. | Có context làm việc liên tục; chưa chọn sản phẩm. |
| 29/09/2026 — xem lại ý tưởng | Người dùng chọn **xem lại ý tưởng sản phẩm**. App học từ vựng trong lịch sử không được coi là quyết định. | Bắt đầu từ nhóm có thể tiếp cận và vấn đề thật, không từ feature. |
| 29/09/2026 — case học ngôn ngữ với AI | Người dùng đặt câu hỏi: vì sao trả tiền cho app đặt/sửa câu khi ChatGPT/Claude/Gemini làm được? Đã hình thành giả thuyết về luyện dùng lại, lỗi lặp, giảm công sức tổ chức, mục tiêu cụ thể, giáo viên và chất lượng feedback. | Các hướng H1–H6 trong [Product Discovery](PRODUCT_DISCOVERY.md) đều **chưa được xác nhận**; “giảm thao tác” chưa đủ là value proposition. |
| 29/09/2026 — khảo sát | Soạn và xuất bản [Google Form](SURVEY_QUESTIONNAIRE.md); theo yêu cầu người dùng bỏ hai câu mở cuối và phần liên hệ. Form hiện có **19 câu / 6 phần**, không tự động thu email. | Có công cụ thu thập hành vi tự thuật; chưa phải phỏng vấn hay phép đo kết quả học. |
| 30/09/2026 — đọc phản hồi | Đọc bảng câu trả lời và lập [phân tích sơ bộ](SURVEY_ANALYSIS_2026-09-30.md). Người dùng xác nhận phần lớn người trả lời là sinh viên đại học, một số đang thực tập. | Bảng có **14 dòng**, **13 dòng có nội dung**, trong đó **12 đang học**. Đây là mẫu nhỏ và chưa biết kênh tuyển cụ thể/phản hồi thử. |
| 30/09/2026 — cộng đồng | Tìm chia sẻ công khai về học tiếng Anh với AI; lưu [nghiên cứu cộng đồng](COMMUNITY_RESEARCH_ENGLISH_AI_2026-09-30.md). | Có tình huống trực tiếp từ Reddit; không kiểm chứng được nội dung đủ tin cậy từ Facebook/Threads. Các bài đăng là gợi ý để hỏi tiếp, không đại diện thị trường. |
| 30/09/2026 — đối thủ | Đối chiếu tài liệu chính thức của ELSA, Speak, Duolingo Max, Loora và Praktika với ChatGPT/Gemini; lưu [bảng so sánh](COMPETITOR_ANALYSIS_AI_ENGLISH_APPS_2026-09-30.md). | App chuyên biệt đóng gói vòng luyện, phát âm và theo dõi lỗi; AI phổ thông cũng đã có voice, study mode, memory/quiz/lộ trình ở mức nhất định. Chưa chứng minh app nào thắng một baseline AI chat tốt cùng thời lượng. |
| 30/09/2026 — phản hồi định tính | Người dùng gửi ảnh hội thoại nêu tiêu chí app: tra cứu nhanh/đúng, danh sách từ/ngữ pháp hoặc bài tập chuẩn bị sẵn để ôn; lưu [ghi chép riêng](QUALITATIVE_FEEDBACK_2026-09-30.md). | Một ý kiến giả định, chưa có tình huống sử dụng hoặc quyết định mua đã xảy ra. Không cộng vào thống kê Google Form vì có thể trùng người. |
| 30/09/2026 — chuẩn bị V1 | Người dùng muốn bỏ mốc phát triển trung gian và tập trung triển khai V1. | Đã ghi [baseline và thứ tự xây dựng V1](V1_IMPLEMENTATION_PLAN.md); chi tiết user flow, AI, nội dung và nền tảng còn cần khóa trước spec. |

## 3. Bằng chứng đã có và cách diễn giải

Khảo sát sơ bộ: trong 12 phản hồi đang học, **8 chọn khó duy trì học đều là trở ngại ảnh hưởng nhiều nhất** (7/11 nếu bỏ một phản hồi có nhiều câu tự thuật vô nghĩa). **9/12 tự khai dùng AI gần đây** ở một câu hỏi, nhưng có **4/12 câu trả lời về việc dùng AI không nhất quán** giữa hai câu của form. Trong 6 người trả lời câu mở về điều AI còn thiếu, **5 nói AI đáp ứng đủ**; đây là câu không bắt buộc. **7/13 phản hồi có nội dung nói không chi tiền học ngoại ngữ trong 3 tháng**. Các tỷ lệ chỉ mô tả mẫu này; chưa chứng minh retention, nguyên nhân bỏ học, hiệu quả app hoặc willingness to pay.

Nghiên cứu cộng đồng cho thấy một số người dùng AI phổ thông để chuẩn bị/chỉnh câu và luyện nói; có trường hợp luyện nhiều vẫn khó dùng tiếng Anh trong tình huống công việc, trong khi người khác thấy công cụ miễn phí đủ cho tác vụ tạo bài/luyện tập. Điều này mở **giả thuyết** về khoảng cách giữa bài luyện và nhiệm vụ thật, chất lượng feedback và vòng ôn lỗi. Không có bằng chứng rằng mọi người gặp cùng problem hoặc sẽ trả tiền để giải quyết.

Đối chiếu đối thủ chỉ xác nhận **tính năng công bố**: ELSA nhấn vào phản hồi phát âm chi tiết; Speak/Loora dùng lỗi để gợi ý luyện lại; Duolingo Max/Praktika chuẩn bị hội thoại có lộ trình, điều khiển và feedback. Không được xem sự tồn tại của tính năng hay điểm do app tự chấm là bằng chứng về khả năng giao tiếp ngoài đời. AI phổ thông là phương án thay thế nghiêm túc, gồm cả chế độ học và voice.

## 4. Kết luận làm việc hiện tại

**Đã chọn hướng làm V1 để kiểm chứng:** người học chọn/thêm nhóm từ, ôn flashcard và dùng từ trong một bài thực hành AI ngắn. Đây là hướng xây sản phẩm, chưa phải bằng chứng giá trị tăng thêm so với AI miễn phí. Nhóm sinh viên là **mẫu discovery hiện có**, chưa phải phân khúc đã xác nhận. Vấn đề khó duy trì học là tín hiệu cần hỏi sâu, không tự động dẫn đến feature nhắc học/streak.

Chưa có Product Spec, Architecture Spec, ADR cho một subsystem thực tế, prototype/app, code sản phẩm, CI/CD, deployment, người dùng của app, telemetry sản phẩm hay thử nghiệm thu tiền. Google Form đã xuất bản là **công cụ khảo sát**, không phải sản phẩm MVP được ship.

## 5. Đường đi tiếp theo

1. **Rà và khóa baseline V1** trong [kế hoạch triển khai](V1_IMPLEMENTATION_PLAN.md): vẽ một user flow, xác định nội dung từ ban đầu, nền tảng đầu tiên và dạng thực hành AI ngắn. Không thêm hội thoại nhiều lượt hay mốc mở rộng trung gian.
2. **Viết Product Spec/Defense Analysis đúng mức cần thiết**, rồi dựng vertical slice chọn từ → flashcard → một lượt AI → lưu và quay lại. Chỉ dùng các thành phần hạ tầng đáp ứng luồng đã chốt.
3. **Pilot và public**, quan sát người học tự hoàn thành/quay lại, lỗi, độ trễ và chi phí AI. Tiếp tục phỏng vấn hành vi và so với cách họ dùng AI miễn phí; chỉ thử giá trả tiền khi đã có tín hiệu giá trị tăng thêm.

Chưa đặt ngưỡng thành công định lượng, ngân sách, thời gian làm mỗi tuần hay ngày release. Những điều này cần được chốt khi chuẩn bị pilot; không suy ra từ mục tiêu 2–3 tháng.
