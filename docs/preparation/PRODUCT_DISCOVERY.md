# Product Discovery — bản nháp

Trạng thái: sau giai đoạn xem lại ý tưởng ngày 29/09/2026, **người dùng yêu cầu
chuẩn bị V1 cho hướng app từ vựng/flashcard/thực hành AI** ngày 30/09/2026.
Đây là nơi thu thập thông tin và giả thuyết, chưa phải Product Spec V1. Các ô
chưa có dữ kiện được giữ mở; mục 26 ghi lựa chọn **hybrid cho nguồn từ vựng**,
mục 27 ghi bản bàn giao context ngày 02/10/2026, mục 28 ghi các lựa chọn sau rà
rủi ro cùng ngày. Provider API tra cứu ngoài, schema và các hướng thiết kế khác
vẫn chưa chốt.

## 1. Hướng sản phẩm

| Câu hỏi | Nội dung hiện tại |
| --- | --- |
| Sản phẩm muốn xây là gì? | V1 có nền là bộ từ điển/từ vựng theo level và chủ đề, thêm nhóm từ cá nhân, flashcard và bài điền từ/tự viết câu chấm đúng/sai. V1.5 có hướng chatbot tra cứu/RAG có điều kiện; format chốt sau. |
| Nền tảng / phạm vi nội dung | Người dùng chọn cả Next.js web và Flutter mobile; level A1–C2, nhiều chủ đề; nguồn theo hướng hybrid (catalog DB + nguồn ngoài). Provider và độ phủ khi release chưa chốt. |
| Nhóm người dùng đầu tiên là ai? | Sinh viên học tiếng Anh là nhóm giả định vì có trong mẫu khảo sát; chưa chốt phân khúc hẹp hơn. |
| Có thể tiếp cận họ ở đâu/bằng cách nào? | Kênh cụ thể chưa biết; pilot kỳ vọng 10–30 người, không quá 50 (người dùng nêu 02/10). |
| Có bao nhiêu thời gian mỗi tuần và budget cho project? | Làm một mình, khả năng 4–6 giờ/ngày, có thể 8 (người dùng nêu 02/10). Ngân sách bằng tiền chưa có con số; trước mắt chạy local. Ước lượng ở [research 02/10](DATA_COST_LICENSE_RESEARCH_2026-10-02.md#3-chi-phí). |

### Thu thập cơ hội trước khi chọn ý tưởng

Điểm bắt đầu: 1–3 nhóm người dùng hiểu rõ hoặc tiếp cận được. Với mỗi nhóm,
ghi công việc họ làm thường xuyên, trở ngại thực tế và cách xử lý hiện tại.
Chỉ điền những điều đã biết; phần suy đoán đánh dấu là giả thuyết.

| Nhóm người dùng | Công việc / problem | Cách tiếp cận | Bằng chứng đã có | Cần tìm hiểu tiếp |
| --- | --- | --- | --- | --- |
| [chưa có] | [chưa có] | [chưa có] | [chưa có] | [chưa có] |

Khi có các hướng cụ thể, so sánh theo:

- Mức độ ảnh hưởng và tần suất của problem.
- Khả năng tiếp cận người dùng, quan sát hành vi và nhận feedback.
- Cách họ đang giải quyết và lý do có thể thử giải pháp mới.
- Core loop có thể ship trong phạm vi thời gian và budget hay không.
- Giả thuyết trả tiền, chi phí phục vụ và phụ thuộc vào dịch vụ ngoài.

Chưa chấm điểm hay chọn hướng khi chưa có dữ kiện. AI có thể hỗ trợ phân tích
và xây dựng; nhu cầu cần được kiểm chứng bằng hành vi của người dùng thật.

## 2. Problem và cách giải quyết hiện tại

Mô tả một tình huống cụ thể:

> Khi **[người dùng]** muốn **[đạt kết quả]** trong **[bối cảnh]**, họ gặp
> **[trở ngại]**. Hiện họ dùng **[cách giải quyết]**, nhưng vẫn mất
> **[thời gian/chi phí/cơ hội]** vì **[hạn chế]**.

| Điều cần hiểu | Dữ kiện / giả thuyết |
| --- | --- |
| Lần gần nhất người dùng gặp vấn đề này | Chưa có dữ kiện. |
| Tần suất và mức độ ảnh hưởng | Chưa có dữ kiện. |
| Cách họ xử lý hiện nay và kết quả | Chưa có dữ kiện. |
| Vì sao họ sẽ thử hoặc chuyển sang sản phẩm này | Có các giả thuyết cho case luyện câu ở mục 8; chưa được kiểm chứng hoặc chọn làm value proposition. |
| Bằng chứng từ hành vi hoặc trao đổi với người dùng | Chưa có. |

## 3. Giá trị và core loop

Giá trị đề xuất: giúp **[nhóm người dùng]** đạt **[kết quả cụ thể]** bằng
**[cách làm]**; kiểm chứng qua **[hành vi/kết quả có thể quan sát]**.

Core loop đang đề xuất: **cần học một nhóm từ → chọn/thêm từ và ôn thẻ → AI tạo bài điền từ/tự viết câu → nhập đáp án, xem đúng/sai → quay lại ôn**.

Chưa điền feature trước khi làm rõ hành động chính và giá trị người dùng nhận
được. Nếu có AI, mô tả lợi ích cho hành động này và cách đánh giá đầu ra.

## 4. Ranh giới MVP

| Nội dung | Quyết định |
| --- | --- |
| Luồng hoàn chỉnh đầu tiên cần ship | Baseline đề xuất ở mục 16; chưa khóa user flow chi tiết. |
| Input → xử lý → output của luồng này | Nhóm từ → bài điền từ/tự viết câu do AI tạo → người học nhập đáp án → chấm đúng/sai; không có bước góp ý/sửa câu trong V1 theo mục 17. |
| Những tính năng cần để thực hiện core loop | Nguồn từ ban đầu/tự thêm, nhóm cá nhân, flashcard ba trạng thái, một lượt AI ngắn và lưu để quay lại. |
| Những phần có thể làm thủ công lúc thử nghiệm | Chưa chốt. |
| Những phần để sau MVP | Chưa đưa hội thoại nhiều lượt, voice, chấm phát âm, giáo trình và gamification vào baseline V1. |
| Dữ liệu và quyền truy cập cần bảo vệ khi public | Nhóm/trạng thái/custom theo tài khoản, session và quyền Pro/trial. Có schema/Defense Analysis nháp ở mục 22; auth, retention và policy chi tiết chưa chốt. |

## 5. Thử nghiệm nhu cầu và monetization

| Nội dung | Giả thuyết cần chốt |
| --- | --- |
| Người dùng đầu tiên và cách mời họ dùng thử | Chưa chốt; chưa thực hiện liên hệ. |
| Hành vi nào chứng tỏ họ nhận được giá trị | Chưa chốt. |
| Vì sao và khi nào họ quay lại | Chưa chốt. |
| Ai có thể trả tiền, trả cho giá trị gì | Thu phí AI; Free/Pro, Pro có AI và trial 14 ngày được người dùng nêu ngày 02/10. Free AI và quyền trial còn mở; người mua, giá/quota và willingness to pay chưa chốt/kiểm chứng. Không mặc định miễn điều kiện dữ liệu nguồn khi chỉ thu phí AI. |
| Cách thử willingness to pay phù hợp MVP | Người dùng chọn 02/10: đo trong pilot, không cần billing thật; billing làm sau. Cách đo cụ thể chưa chốt. |
| Chi phí chính để phục vụ core loop | Ước lượng 02/10 (giả định, chưa đo): AI pilot 30 người khoảng <$1–15/tháng tùy model; xem [research 02/10](DATA_COST_LICENSE_RESEARCH_2026-10-02.md#3-chi-phí). |
| Kết quả nào dẫn tới tiếp tục, thay đổi hoặc dừng giả thuyết | Chưa chốt. |

## 6. Telemetry cần định nghĩa từ core loop

Sau khi chốt luồng chính, định nghĩa sự kiện bắt đầu, sự kiện nhận giá trị đầu
tiên, sử dụng lặp lại, thất bại trong luồng và chi phí xử lý nếu liên quan.
Chốt thời gian quan sát và tiêu chí thành công trước khi diễn giải số liệu.
Hiện chưa đặt chỉ tiêu hoặc báo cáo số người dùng.

## 7. Điều kiện chuyển sang Product Spec V1

- Có target user, problem, cách giải quyết hiện tại và value proposition đủ rõ.
- Có một core loop với ranh giới MVP cụ thể và cách kiểm chứng nhu cầu.
- Có giả thuyết monetization, kế hoạch tiếp cận người dùng và telemetry ban đầu.
- Giả thuyết và dữ kiện được phân biệt; các câu hỏi còn mở có cách kiểm chứng.

Sau đó mới cụ thể hóa module, data model, async flow và deployment. Mỗi decision
quan trọng trong spec dùng [Defense Analysis](DECISION_ANALYSIS_TEMPLATE.md).

## 8. Case analysis — AI phổ thông có thể thay thế việc đặt và sửa câu

Ngày: 29/09/2026. Phạm vi: phân tích hành vi và giả thuyết giá trị cho một case
học ngôn ngữ; chưa chọn product, phân khúc hoặc viết spec triển khai.

### Điều người dùng đã nêu

- ChatGPT, Claude hoặc Gemini có thể được dùng để đặt câu hỏi/đặt câu và sửa câu; vì vậy người dùng đặt vấn đề về lý do trả tiền cho app.
- Giảm thao tác và sử dụng với tần suất cao là lợi ích khả dĩ, nhưng người dùng chưa thấy đủ thuyết phục.
- Người dùng muốn được hỗ trợ phân tích hành vi, các nguyên nhân và cách kiểm chứng giá trị, đồng thời hiểu cách phân chia việc reasoning với AI.

Đây là vấn đề người dùng nêu, không phải dữ liệu phỏng vấn khách hàng. Chưa có
bằng chứng về retention, willingness to pay hoặc hiệu quả học của app.

### Thông tin đối chiếu từ nguồn chính thức

ChatGPT Study mode có thể tạo câu hỏi luyện tập, kiểm tra hiểu biết và dùng
Memory để cá nhân hóa khi khả dụng và được bật. Tính năng chịu giới hạn của
plan/model như bình thường. Vì thế không giả định AI phổ thông chỉ trả lời
một lần hoặc không thể cá nhân hóa. [OpenAI Help Center](https://help.openai.com/en/articles/11780217-using-study-mode-in-chatgpt).

Gemini có Guided Learning, tạo quizzes và flashcards từ notes; Google cũng
đã công bố việc dùng past chats để cá nhân hóa câu trả lời. [Google Gemini updates](https://blog.google/products-and-platforms/products/gemini/gemini-drop-august-2025/).

Anki đã có active recall và spaced repetition. Lưu từ và đặt lịch ôn đơn thuần
không mặc nhiên tạo khác biệt. [Anki Manual](https://docs.ankiweb.net/background.html).

Nghiên cứu tổng hợp 48 thí nghiệm có bằng chứng hỗ trợ spaced practice trong
học ngôn ngữ thứ hai. Điều này hỗ trợ phương pháp học; không chứng minh app
cụ thể hiệu quả hơn hoặc khách hàng sẽ trả tiền. [Kim & Webb, 2022](https://onlinelibrary.wiley.com/doi/abs/10.1111/lang.12479).

### Nhận định làm việc

Nếu giá trị chính chỉ là tạo hoặc sửa một câu bằng AI, hiện chưa có cơ sở đủ
mạnh để kỳ vọng người học trả tiền. Tần suất cao có thể làm convenience đáng
giá, nhưng cũng có thể giúp người học thành thạo workflow AI miễn phí hơn.

Cần phân biệt số thao tác, công sức tổ chức việc học, kết quả học và willingness
to pay. App có thể tạo giá trị bằng việc gỡ một điểm nghẽn xuyên suốt quá trình
học, nhưng phải chứng minh lợi ích tăng thêm so với cách thay thế tốt mà người
học có thể sử dụng.

### Các giả thuyết cần kiểm chứng

| ID | Problem giả định | Giá trị app có thể tạo | Bằng chứng cần quan sát |
| --- | --- | --- | --- |
| H1 | Hiểu từ khi đọc nhưng không tự dùng được khi viết/nói. | Yêu cầu tự vận dụng, nhận feedback, kiểm tra lại ở ngữ cảnh mới sau một khoảng thời gian. | Khả năng dùng đúng trên nhiệm vụ mới, không chỉ nhớ câu đã sửa. |
| H2 | Được sửa rồi nhưng vẫn lặp lại cùng một lỗi. | Ghi nhận lỗi theo thời gian, chọn bài ôn liên quan và cho thấy lỗi còn tái diễn hay không. | Lỗi cũ giảm trên cơ hội sử dụng mới, so với workflow thay thế. |
| H3 | Muốn học nhưng thường phải tự chọn nội dung, soạn prompt, chuyển dữ liệu và lên lịch ôn. | Một buổi luyện tập rõ ràng, vừa thời gian, nối tiếp từ lần trước. | Bớt công sức chuẩn bị; tự bắt đầu và hoàn thành buổi học nhiều hơn. |
| H4 | Có một mục tiêu cụ thể với hậu quả hoặc deadline rõ. | Luyện đúng tình huống, như email công việc hoặc phỏng vấn, với tiêu chí đánh giá minh bạch. | Người dùng tiếp tục luyện và chấp nhận một offer thực tế gắn với mục tiêu. |
| H5 | Giáo viên cần tổ chức bài luyện và theo dõi ai chưa làm/chưa tiến bộ. | Giao bài, tổng hợp lỗi và báo cáo để giáo viên hành động. | Giáo viên tiết kiệm công sức và có willingness to pay; đây là hướng khác với B2C. |
| H6 | Người học khó phân biệt sửa lỗi thực sự với đổi phong cách hoặc thay đổi ý nghĩa. | Feedback phân biệt lỗi/cách diễn đạt thay thế, giữ ý nghĩa, có rubric và kiểm chứng chất lượng. | Đánh giá trên tập ví dụ thực tế, kiểm tra bởi người có chuyên môn khi cần. |

Tất cả H1–H6 hiện **chưa được kiểm chứng**. Không đưa toàn bộ vào MVP. AI phổ
thông và app học chuyên dụng cũng có thể phục vụ nhiều nhu cầu này; cần chọn
problem đủ cụ thể và đo giá trị tăng thêm. Dùng cùng một model không tự tạo
ra chất lượng tốt hơn. Nhắc học hoặc streak cũng không tự chứng minh retention.

### Ví dụ core loop để thử, chưa phải quyết định

Người học gặp một từ/cụm từ trong ngữ cảnh thật → lưu ngữ cảnh → tự dùng trong
câu mới → nhận feedback → lỗi cần luyện được đưa vào lần ôn sau → thử lại sau
vài ngày với tình huống mới → theo dõi khả năng sử dụng.

Lời hứa giả định: giúp người học sử dụng lại được những từ/cụm từ họ đã gặp
và giảm lỗi lặp lại. Chưa được phép diễn giải lời hứa này thành kết quả đã có.

### Cách kiểm chứng đề xuất

1. Chọn một nhóm tiếp cận được và trao đổi với khoảng 5–8 người để tìm pattern ban đầu. Hỏi lần gần nhất gặp vấn đề, cách xử lý, tần suất, hậu quả và những công cụ đã dùng/bỏ. Mẫu nhỏ phục vụ discovery, không đại diện thị trường.
2. Chọn một giả thuyết nổi bật, thử workflow nhỏ hoặc có hỗ trợ thủ công trong khoảng 7–14 ngày. So với AI phổ thông có prompt phù hợp, kết hợp flashcards/lịch ôn nếu đó là cách thay thế khả thi. Không cố làm baseline kém đi để tạo lợi thế giả.
3. Ghi thời gian chuẩn bị, số buổi tự quay lại, mức hoàn thành, lỗi lặp lại và kiểm tra trì hoãn ở ngữ cảnh mới. Nếu so sánh hiệu quả học, chú ý thời lượng luyện, độ khó và khác biệt giữa người học; pilot chưa đủ cho kết luận nhân quả mạnh.
4. Thử offer có giá cụ thể và phạm vi có thể cung cấp thực sự, như pilot có trả phí hoặc chương trình theo mục tiêu. Một lời khen hay câu trả lời hypothetical về giá chưa đủ; cần hành vi sử dụng và cam kết trả tiền có thật. Không thu tiền cho lời hứa chưa có khả năng thực hiện.

Đặt tiêu chí trước khi chạy pilot. Nếu người học không có pain lặp lại, không
quay lại hoặc làm tốt tương đương với giải pháp thay thế, chưa có bằng chứng
để tiếp tục thu phí cho giả thuyết đó. Nếu có sử dụng nhưng không trả tiền,
cần kiểm tra lại phân khúc, giá, offer và giá trị tăng thêm. Cũng cần tính chi
phí AI/vận hành ở mức sử dụng dự kiến trước khi định giá.

Giả thuyết monetization: thuê bao nếu nhu cầu lặp lại; gói theo mục tiêu nếu
nhu cầu theo đợt; giáo viên có thể là người trả tiền nếu chọn H5. Chưa chọn
mô hình hoặc mức giá.

### Phân chia việc phân tích

- Người dùng sở hữu problem, quyết định, bằng chứng thực tế và lý do lựa chọn; tự nêu giả thuyết ban đầu cùng điều có thể bác bỏ nó.
- AI hỗ trợ tìm nguồn, so sánh lựa chọn, mở rộng giả thuyết, phản biện, chuẩn bị câu hỏi và tổng hợp dữ liệu đã cung cấp.
- Khách hàng thật cung cấp bằng chứng về hành vi, kết quả và willingness to pay; suy luận của AI không thay thế được dữ liệu này.

Vòng làm việc đề xuất: người dùng mô tả giả thuyết ngắn → AI phản biện và bổ
sung → cùng xác định cách bác bỏ → kiểm chứng nhỏ với người thật → cập nhật
quyết định. Không cần tự nghiên cứu mọi thứ, nhưng cần hiểu và defend được
kết luận mình dùng để xây sản phẩm.

## 9. Khảo sát hành vi — sẵn sàng thu thập dữ liệu

Người dùng yêu cầu một bộ câu hỏi khảo sát, muốn tạo Google Form và sẽ gửi
kết quả sau vài ngày. Bộ câu hỏi được lưu trong
[Survey Questionnaire](SURVEY_QUESTIONNAIRE.md).

Phạm vi: hành vi học ngoại ngữ gần đây, lần dùng AI cụ thể, cách xử lý trở
ngại, việc sử dụng lại kiến thức và lựa chọn từng chi tiền. Form có nhánh cho
người đang học, người dùng/chưa dùng AI và người ngừng hoặc chưa học.

Trạng thái ngày 29/09/2026: đã tạo và xuất bản form qua trình duyệt sau khi người
dùng đăng nhập; Drive MCP không có thao tác Google Forms. Theo yêu cầu người
dùng, đã bỏ hai câu bổ sung trải nghiệm/liên hệ và phần G; hiện còn 19 câu trong
6 phần. Lời mở đầu và thông báo xác nhận đã bỏ lời mời liên hệ. Đã kiểm tra
phần F là trang cuối với nút gửi; không thu email tự động. Không gửi phản hồi
thử hoặc lời mời đến người khác. Link khảo sát giữ nguyên.

- [Link trả lời để chia sẻ](https://docs.google.com/forms/d/e/1FAIpQLScok6j9f3DL1kz62ZFxI4tAUxAVZtCr7riA5aqNtCil3OLKGA/viewform?usp=publish-editor).
- [Link chỉnh sửa và xem câu trả lời](https://docs.google.com/forms/d/1ANBSFx6VNIZKdb9N_WJQINmGdLyK9GMFg-JSMKf8_4A/edit).

Lúc tạo form chưa có dữ liệu. Ngày 30/09/2026, người dùng đã gửi link bảng trả
lời; phân tích sơ bộ được ghi ở mục 10. Cần bổ sung nhóm và kênh tuyển người
trả lời, rồi đối chiếu những tình huống cụ thể với H1–H4/H6 trước khi chọn
hướng trao đổi hoặc thử pilot. Chưa có quyết định product mới hoặc bằng chứng
willingness to pay cho app mới.

## 10. Phản hồi khảo sát sơ bộ — 30/09/2026

Đã đọc [bảng câu trả lời](https://docs.google.com/spreadsheets/d/1nkaFL-fvVcpjz-OeLdqOIvTe_sd6qmL3hCtCHrWm114/edit?gid=2119001038) ở chế độ chỉ đọc và ghi [phân tích sơ bộ](SURVEY_ANALYSIS_2026-09-30.md).
Bảng có 14 dòng, 1 dòng trống toàn bộ câu hỏi hiện tại; trong 12 phản hồi đang
học, 8 chọn khó duy trì học đều đặn. Có 9 người khai dùng AI gần đây ở Q11,
nhưng 4/12 câu trả lời về công cụ dùng ở Q08 không nhất quán với Q11. Năm trong
sáu người trả lời câu mở về điều AI còn thiếu cho biết AI đáp ứng đủ. Dữ liệu
chưa xác nhận giá trị tăng thêm hoặc willingness to pay của app mới.

Người dùng xác nhận đa số người trả lời là sinh viên đại học; một số đang thực
tập nhưng phần lớn vẫn là sinh viên. Trong bảng, 10/12 người đang học chọn
“đang đi học” hoặc “vừa đi học vừa đi làm”. Không đồng nhất nhóm vừa học vừa
làm với thực tập sinh khi chưa có dữ kiện từng người. Mẫu này chưa đại diện cho
người đi làm nói chung.

Cần xác nhận kênh tuyển cụ thể, phản hồi thử nếu có và nguyên nhân cụ thể đằng sau
việc học không đều; tìm người có tình huống lặp lại để phỏng vấn. H3 (quy trình
học liền mạch) chỉ là một giả thuyết để kiểm chứng, không phải feature đã chốt.
Product, target user, core loop và MVP vẫn để mở.

## 11. Desk research cộng đồng về học tiếng Anh với AI — 30/09/2026

Đã lưu [nghiên cứu cộng đồng và nguồn trực tiếp](COMMUNITY_RESEARCH_ENGLISH_AI_2026-09-30.md). Tìm bài công khai trên Facebook và Threads nhưng chưa có thảo luận người học ở hai nền tảng đó đủ nội dung để kiểm chứng; các quan sát cụ thể hiện đến từ Reddit, chủ yếu r/vozforums. Đây là lời kể tự chọn mẫu, không đại diện cho thị trường.

Các tình huống đáng điều tra tiếp: người học có thể dùng AI để soạn/luyện/sửa miễn phí nhưng vẫn vấp khi dùng tiếng Anh trong tình huống thật; người khác thấy công cụ miễn phí đã đủ và không muốn mua app chỉ để shadowing/chép chính tả. Tranh luận về độ tin cậy của feedback và trải nghiệm hội thoại AI chưa có kết luận chung. Những nghiên cứu thực nghiệm được ghi trong bản nghiên cứu hỗ trợ AI như công cụ thực hành và việc tự truy hồi trước khi xem đáp án trong một số nhiệm vụ, nhưng không chứng minh app riêng có giá trị tăng thêm hoặc khả năng bán.

**Hướng thử ưu tiên:** phỏng vấn sinh viên có một tình huống gần đây cần nói/viết tiếng Anh (có thể gồm sinh viên thực tập), quan sát cách họ dùng AI phổ thông hiện tại, rồi so sánh một workflow ngắn gắn với tình huống thật với cách dùng AI miễn phí tốt của chính họ. Theo dõi việc quay lại, khả năng tự dùng trong tình huống mới và nỗ lực bỏ ra; chỉ thử offer trả phí khi đã nhìn thấy giá trị tăng thêm. Chưa chọn phân khúc, core loop, MVP hay monetization.

## 12. App học tiếng Anh có AI so với chat phổ thông — 30/09/2026

Đã đối chiếu [ELSA, Speak, Duolingo Max, Loora và Praktika](COMPETITOR_ANALYSIS_AI_ENGLISH_APPS_2026-09-30.md) bằng tài liệu tính năng chính thức. Các app chủ yếu đóng gói toàn bộ vòng luyện: lựa chọn nội dung, hội thoại phù hợp trình độ, feedback về lời nói, lưu lỗi/từ và gợi ý bài tiếp theo. ELSA có chẩn đoán phát âm ở mức âm/trọng âm/ngữ điệu. Đây là **năng lực công bố**, chưa phải bằng chứng app tạo kết quả học tốt hơn AI phổ thông.

ChatGPT hiện có Study Mode, Voice và Memory trong điều kiện khả dụng; Gemini có Guided Learning và Study Notebooks với quiz, lộ trình và dashboard. Vì vậy nhiều điểm từng được coi là lợi thế riêng của app đã có trong AI phổ thông. Chưa có comparator trực tiếp chứng minh một app chuyên biệt thắng một workflow AI chat tốt cùng thời lượng; khả năng trả tiền của nhóm sinh viên khảo sát cũng chưa được xác nhận. Product, phân khúc đầu tiên, core loop và MVP tiếp tục để mở.

## 13. Phản hồi định tính từ ảnh chụp — 30/09/2026

Người dùng gửi một ảnh hội thoại; đã ghi [nội dung và câu hỏi kiểm chứng](QUALITATIVE_FEEDBACK_2026-09-30.md), không lưu tên người trả lời. Một người nêu tiêu chí app: tiện lợi, tra từ/ngữ pháp nhanh, đúng và không lan man. Khi được hỏi điều kiện chi tiền, họ đề xuất app tự chuẩn bị danh sách từ/ngữ pháp để ôn khi rảnh hoặc tự tạo bài tập. Họ cũng nói nhu cầu mỗi người khác nhau.

Đây là **một ý kiến về app mong muốn và điều kiện trả tiền giả định**, chưa phải hành vi mua, tần suất gặp pain hoặc bằng chứng tiến bộ học. Không rõ người này có trùng với một dòng Google Form; giữ độc lập, không cộng vào thống kê khảo sát. Giả thuyết để thử: **tra cứu đúng ngữ cảnh → lưu nội dung đáng học → ôn/vận dụng sau đó**. Cần quan sát lần tra cứu gần nhất, cách người này hiện lưu và ôn, ví dụ câu trả lời lan man/sai, và đối chiếu với ChatGPT/Gemini hoặc công cụ họ đang dùng trước khi chọn feature.

## 14. Đề xuất phạm vi app V1 để người dùng chốt — 30/09/2026

Theo yêu cầu người dùng, dừng mở rộng nghiên cứu và gom các tín hiệu thành một phương án **để chốt tính năng**, chưa phải Product Spec hay quyết định đã xác nhận.

**Nhóm khởi đầu đề xuất:** sinh viên đại học đang học tiếng Anh, có lúc cần tra từ/cấu trúc/câu và muốn ôn ngắn khi rảnh. Chọn vì đây là nhóm phần lớn trong mẫu hiện có, không phải vì mẫu đã chứng minh nhu cầu đại diện.

**Một vòng sử dụng đề xuất:** gặp từ/cấu trúc/câu cần hiểu → tra cứu ngắn gọn theo ngữ cảnh → lưu mục muốn học → app tạo vài câu hỏi/bài tập từ các mục đã lưu → người học tự trả lời → AI sửa và cho thử lại → lần mở sau thấy nội dung cần ôn.

**Bốn khả năng V1 đề xuất:** (1) tra cứu/giải thích từ, ngữ pháp hoặc câu theo ngữ cảnh, câu trả lời gọn và hữu ích; (2) lưu mục đã tra vào danh sách cá nhân; (3) tạo buổi ôn ngắn từ mục đã lưu, ưu tiên để người học tự tạo câu/trả lời trước khi xem gợi ý; (4) AI phản hồi câu trả lời và giữ mục chưa vững cho lần ôn tiếp theo. Chất lượng, độ trễ và mức độ chính xác cần kiểm tra trên ví dụ thực tế; không hứa mọi phản hồi đều đúng.

**Ngoài phạm vi V1 đề xuất:** voice tutor toàn diện, chấm phát âm chi tiết, khóa học nhiều cấp độ, mạng xã hội, gamification phức tạp và hệ thống thanh toán đầy đủ. Vẫn giữ giả thuyết monetization để thử sau khi có người hoàn thành và quay lại vòng học chính.

Cơ sở: khảo sát nhỏ ghi 8/12 người đang học chọn khó duy trì đều, 5/6 câu mở về AI còn thiếu nói AI đủ dùng; một phản hồi ảnh nêu nhu cầu tra cứu nhanh/đúng và chuẩn bị danh sách/bài tập. Các tín hiệu này **không chứng minh** app đề xuất hiệu quả hoặc được trả tiền. Người dùng sẽ chốt/sửa phạm vi trước khi vẽ luồng giả định của user.

## 15. Điều chỉnh đang cân nhắc: nguồn từ, flashcard và AI — 30/09/2026

**Người dùng đang cân nhắc**, chưa chốt: tìm/thêm từ theo chủ đề, trình độ hoặc tự nhập; ôn bằng flashcard với trạng thái “chưa học”, “cần ôn tập”, “đã biết”; thực hành cùng AI trên nhóm từ vựng đã chọn. Cần xem lại luồng AI trước khi quyết định phạm vi cuối và vẽ user flow.

**Luồng AI ở bản đề xuất trước:** chỉ lấy mục đã tra/lưu → tạo câu hỏi hoặc bài tập → người học trả lời → AI sửa → đưa mục chưa vững vào lần ôn sau. Luồng này gắn quá chặt với tra cứu, chưa dùng các nhóm từ theo chủ đề/trình độ/tự chọn và chưa phân biệt việc người học tự đánh dấu flashcard với kết quả AI chấm.

**Luồng AI được đề xuất để người dùng xem xét:** người học chọn một nhóm từ → ôn hoặc xem nhanh flashcard → bấm thực hành với AI → app chọn một ít từ từ nhóm, ưu tiên “cần ôn” → AI đặt một tình huống/câu hỏi ngắn có cơ hội dùng các từ ấy → người học tự viết/trả lời → AI chỉ ra từ dùng đúng, từ dùng chưa đúng và một cách sửa ngắn → người học thử lại → kết quả được ghi cho buổi luyện sau. Không ép mọi từ vào một câu thiếu tự nhiên. Trạng thái flashcard là đánh giá của người học; đề xuất không tự chuyển sang “đã biết” chỉ vì một câu trả lời đúng.

**Đề xuất giới hạn ban đầu:** thực hành dạng văn bản ngắn trước; hội thoại giọng nói/phát âm để sau. Đây là lựa chọn phạm vi, chưa được người dùng xác nhận. Điểm cần người dùng chốt là dạng thực hành AI (viết câu ngắn hay hội thoại) và quy tắc thay đổi trạng thái flashcard; sau đó mới vẽ luồng giả định.

## 16. Chuyển sang chuẩn bị V1 — 30/09/2026

**Người dùng xác nhận:** bỏ mốc phát triển trung gian đã đề xuất và chuẩn bị triển khai V1. Không đưa hội thoại nhiều lượt hay các ý tưởng mở rộng của mốc đó vào backlog hiện tại.

**Baseline triển khai đang đề xuất:** tìm/chọn hoặc tự thêm từ vào nhóm → ôn flashcard với ba trạng thái do người học chọn → luyện một tình huống văn bản ngắn với AI từ nhóm đó → nhận góp ý ngắn, thử lại và lưu kết quả để hỗ trợ buổi ôn tiếp. Đây là cách diễn giải gọn từ mục 15 để lập kế hoạch; người dùng chưa xác nhận từng chi tiết của AI flow, phạm vi tra cứu/ngữ pháp, nền tảng đầu tiên và cách cung cấp danh sách từ theo chủ đề/trình độ.

Xem [kế hoạch bắt đầu V1](V1_IMPLEMENTATION_PLAN.md). Phần discovery trước đây giữ lại làm lịch sử và bằng chứng, không thay thế quyết định phạm vi V1 hiện tại.

## 17. Điều chỉnh AI V1 — 01/10/2026

**Người dùng xác nhận:** bỏ bước AI đưa góp ý/sửa câu và thử lại trong luồng V1. AI tạo bài, người học nhập đáp án và app chấm **đúng/sai tự động**. Hai dạng bài được chọn là **điền từ vào chỗ trống** và **tự viết câu dùng từ**; không chọn dịch câu. Các ý tưởng phản hồi dài trong mục 14–16 là lịch sử đề xuất, không còn là phạm vi V1 hiện tại.

**Cần cụ thể hóa trước spec:** bài điền từ cần đáp án kỳ vọng và biến thể được chấp nhận; bài tự viết câu có nhiều đáp án đúng nên chấm nhị phân bằng AI có nguy cơ sai. Giữ giao diện kết quả ngắn theo yêu cầu và kiểm tra lỗi chấm qua pilot. Xem [user flow hiện tại](V1_USER_FLOW_DRAFT.md) và [kế hoạch V1](V1_IMPLEMENTATION_PLAN.md).

## 18. Đánh giá khả quan của V1 — 01/10/2026

**Nhận định của trợ lý, không phải kết quả thị trường:** V1 đủ cụ thể để làm pilot và học về hành vi người dùng, nhưng hiện chưa có căn cứ nói sẽ thu hút nhiều người dùng hoặc tạo doanh thu. Vòng chọn từ → flashcard → bài AI → đúng/sai có thể hữu ích nếu nhanh, nội dung phù hợp và người học tự quay lại; các điểm này chưa được đo.

**Bằng chứng hiện có:** khảo sát nhỏ ghi 8/12 người đang học chọn khó duy trì đều; 5/6 người trả lời câu hỏi mở về AI còn thiếu nói AI đáp ứng đủ. Một phản hồi định tính nêu sự tiện lợi, tra nhanh/đúng và danh sách/bài tập chuẩn bị sẵn như điều kiện chi tiền giả định. Không suy ra nhu cầu trả tiền hoặc retention từ những tín hiệu này.

**Cạnh tranh được kiểm tra lại:** [ChatGPT Study Mode](https://help.openai.com/en/articles/11780217-using-study-mode-in-chatgpt) có thể tạo câu hỏi/quiz; [ChatGPT Flashcards](https://help.openai.com/en/articles/20001533-flashcards-in-chatgpt) cho tạo, đánh dấu và lưu thẻ để ôn; [Quizlet Learn](https://quizlet.com/features/learn) có flashcard và bài tập viết, còn [Quizlet AI Study Tools](https://quizlet.com/features/ai-study-tools) tạo bài luyện từ nội dung người dùng. Đây là tính năng do nhà cung cấp mô tả, không phải bằng chứng chúng tạo kết quả học tốt hơn. Tuy nhiên, tổ hợp tính năng V1 hiện chưa đủ là khác biệt rõ khi tiếp cận đại chúng.

**Rủi ro cần quan sát:** (1) người học không tự quay lại dù thích demo; (2) bài tập/chấm đúng-sai tự viết câu có thể sai hoặc thiếu giải thích khiến họ mất tin tưởng; (3) khó tiếp cận người dùng mới khi sản phẩm chưa gắn với một mục tiêu học cụ thể. Hướng thử khả thi là chọn một nhóm/ngữ cảnh hẹp có thể tiếp cận, cho họ tự dùng V1 trong 1–2 tuần và so với ChatGPT/Quizlet hoặc cách đang dùng. Ghi nhận lượt quay lại tự phát, chọn app này thay cho cách cũ, mức tin vào kết quả chấm và chi phí phục vụ. Mở rộng nhóm hoặc thử giá sau khi thấy tín hiệu lặp lại, không suy ra trước.

## 19. Nguồn từ V1 và bổ sung V1.5 — 01/10/2026

**Người dùng xác nhận:** nền của V1 là bộ từ điển/từ vựng theo level và chủ đề. Yêu cầu research lấy từ API bên ngoài hay quản lý nội dung trong DB của app. Đồng thời bổ sung V1.5: chatbot AI tra cứu từ vựng, có thể triển khai RAG sớm nếu người học cần; response sơ bộ có giải thích, definition, nghĩa và ví dụ, **format chốt sau**. Yêu cầu này thay thế việc bỏ toàn bộ mốc V1.5 ở mục 16; không khôi phục các tính năng khác của mốc cũ.

Đã ghi [nghiên cứu nguồn từ ngày 01/10](VOCABULARY_DATA_RESEARCH_2026-10-01.md) dựa trên nguồn chính thức, gồm CEFR-J, Wiktionary/Kaikki và các dictionary API. **Đề xuất chưa chốt:** dùng DB app để phục vụ catalog đã duyệt, thử CEFR-J làm metadata level/chủ đề, bổ sung nội dung hợp lệ và biên tập phần định nghĩa/Việt/ví dụ. API chỉ là một cách cấp/enrich dữ liệu; gọi được API không tự cấp quyền lưu, chỉnh sửa hay dùng với AI. Chưa import hoặc đo độ phủ/chất lượng thực tế. Probe Free Dictionary API thất bại ở tầng mạng trong môi trường này, không dùng làm bằng chứng API ngừng hoạt động.

**V1.5 vẫn có điều kiện:** nhu cầu chatbot phải xuất hiện và dữ liệu phải đủ chất lượng/quyền sử dụng. Có thể bắt đầu từ tra DB đúng từ/nghĩa rồi AI trình bày; chưa chọn vector retrieval, provider hoặc schema response. Phân biệt format có cấu trúc với nguồn grounding của RAG. Xem [kế hoạch V1 và mục V1.5](V1_IMPLEMENTATION_PLAN.md).

## 20. Định hướng thu phí AI và quyền dùng dữ liệu — 01/10/2026

**Định hướng người dùng nêu:** thương mại hóa tính năng AI, không thu riêng bộ từ vựng. Chưa chốt cách đóng gói/gói miễn phí/giá và chưa có hành vi trả tiền thực tế.

**Đối chiếu điều khoản:** thu phí AI không tự làm việc dùng dữ liệu của bên khác trở thành phi thương mại. Oxford định nghĩa Commercial Use gồm dùng nội dung/API trong sản phẩm có lợi ích thương mại trực tiếp hoặc gián tiếp; Merriam-Webster xét app thương mại. CEFR-J cho phép dùng wordlist thương mại khi ghi nguồn. Quyền lưu/chỉnh sửa/dùng với AI vẫn phải xét riêng; không ghi nhận kết luận “không ảnh hưởng gì” cho mọi nguồn. [Oxford terms](https://developer.oxforddictionaries.com/api-terms-and-conditions), [Merriam-Webster FAQ](https://dictionaryapi.com/info/frequently-asked-questions), [CEFR-J](https://www.cefr-j.org/download.html#cefrj_wordlist).

Đề xuất triển khai tiếp tục là chọn dữ liệu có quyền dùng phù hợp và nội dung tự biên soạn hoặc được cấp phép. Mô hình thu phí AI khả thi về hướng sản phẩm; license dữ liệu, nhà cung cấp AI và willingness to pay chưa được xác nhận cho một cấu hình cuối cùng.

## 21. Rà context trước triển khai — 01/10/2026

Theo yêu cầu người dùng, đã rà [context](PROJECT_CONTEXT.md), user flow, kế hoạch và các phần đang mở. **Đánh giá của trợ lý:** đủ context về hướng sản phẩm/tính năng/luồng V1 để viết Product Spec ngắn, chưa đủ để code V1 hoàn chỉnh mà không tự đoán các hành vi quan trọng. Năm nhóm quyết định còn mở được ghi trong [readiness của kế hoạch V1](V1_IMPLEMENTATION_PLAN.md): nền tảng, bộ từ đầu tiên, tài khoản/dữ liệu cá nhân, tiêu chí chấm bài và giới hạn chi phí/thời gian/pilot.

Không yêu cầu thêm nghiên cứu thị trường diện rộng trước khi bắt đầu prototype. Cần giải quyết các lựa chọn này theo bước implementation mà chúng ảnh hưởng; RAG/response V1.5, billing đầy đủ và catalog toàn diện không là điều kiện cho bước bắt đầu V1. Chưa có code hoặc bằng chứng sử dụng production.

## 22. Sáu annotations: nền tảng, dữ liệu, tài khoản, chấm và gói — 02/10/2026

**Yêu cầu/xác nhận trực tiếp của người dùng:**

1. Cả web và mobile trong V1: web Next.js, mobile Flutter. Thứ tự làm và Android/iOS chưa nêu.
2. Level A1–C2; nhiều chủ đề, ví dụ technology, marketing, business, food, daily life. Nguồn sẽ research, chưa có catalog/độ phủ đã xác minh.
3. Đăng nhập lần đầu, giữ đăng nhập đến khi logout. Custom theo schema: người dùng yêu cầu liệt kê để có thể chỉnh và giải thích cách lưu DB.
4. Hoa/thường convert lowercase; chấp nhận contraction ngữ pháp như I am/I'm, không chấp nhận nhắn tin TY/GTG thay cụm đầy đủ.
5. Chưa tính thời gian/budget; cần research. Có Free/Pro, Pro dùng AI, trial 14 ngày. Free không có AI là phương án đang cân nhắc, không phải quyết định đã chốt.
6. Người dùng yêu cầu phân tích tiêu chí chấm câu tự viết.

**Đề xuất của trợ lý, chưa được người dùng chốt:**

- [Schema dữ liệu V1](V1_DATA_MODEL_DRAFT.md): hai client dùng chung backend/DB; item gắn một nghĩa, catalog và custom private; nhóm lưu tham chiếu, trạng thái gắn user/item. Field custom, session, entitlement/usage và Defense Analysis được liệt kê để rà. Chưa tạo DB hoặc chọn auth provider.
- [Rubric chấm V1](V1_GRADING_RULES_DRAFT.md): đúng khi thực sự dùng đúng từ mục tiêu, nghĩa đang luyện, ngữ pháp trực tiếp của từ và câu đủ rõ. Dung sai lỗi nhỏ ngoài từ mục tiêu cần khóa bằng ví dụ. Lỗi AI/không đủ căn cứ giữ chưa chấm; không tính sai; UI kết quả vẫn đúng/sai, không khôi phục góp ý/sửa câu.
- Giữ input gốc cùng bản lowercase để audit/ngữ nghĩa; contraction tùy ngữ cảnh, không replace 's/'d toàn cục. Chuẩn hóa không đồng nghĩa chấp nhận typo/synonym tùy ý.
- Giữ trải nghiệm login bằng session có gia hạn/thu hồi, không token vô hạn. Phải chốt ngoại lệ hết hạn/thu hồi và logout một/toàn bộ thiết bị.

**Còn mở trước implementation tương ứng:** nguồn A1–C2 và người duyệt; schema/rubric cuối; phương thức auth; quyền AI của Free/trial; trial bắt đầu khi nào, quota/giá/auto-charge; retention/xóa dữ liệu và ngân sách/thời gian/pilot. CEFR-J đã nghiên cứu chỉ phủ A1–B2, không ghi nguồn này là lời giải đủ A1–C2. *(Cập nhật sau ở mục 28: thêm Octanove cho C1–C2; người dùng tự duyệt; đã có thời gian làm và quy mô pilot.)* Chưa có kết quả model, DB hoặc production evidence mới; các ví dụ chấm là kỳ vọng phân tích.

Cập nhật [kế hoạch](V1_IMPLEMENTATION_PLAN.md) và [user flow](V1_USER_FLOW_DRAFT.md) theo các lựa chọn mới; không mở thêm tính năng V1.5 hoặc đi sâu market discovery trong bước rà này.

## 23. Thiết kế có thể tiến hóa và scaling: chỉ phương án — 02/10/2026

**Yêu cầu trực tiếp của người dùng:** schema không nên chỉ đóng theo yêu cầu
hiện tại, ví dụ chỉ nghĩa tiếng Việt. Rà các phần khác để có hướng mở rộng qua
V3/V4/V5…, research thực hành/phương pháp hệ thống lớn; đề cao trade-off.
Người dùng nhấn mạnh **chỉ đưa hướng triển khai, chưa chốt**. Đây là nguyên
tắc làm việc được ghi nhận, không là acceptance của bất kỳ kiến trúc nào.

**Đã thực hiện:** [research/options toàn hệ thống](SYSTEM_EVOLUTION_OPTIONS_2026-10-02.md)
dựa trên primary sources W3C/Wikibase, Microsoft, GitHub Engineering,
PostgreSQL, Google AIP/SRE, AWS, Stripe và OpenTelemetry. Các áp dụng cho app
là đề xuất/suy luận riêng, không claim mọi hệ thống lớn cùng một architecture.

- [Schema hiện tại](V1_DATA_MODEL_DRAFT.md) được viết lại, so sánh cột cố định,
  JSONB, item+localized text và entry+sense+localized text. Đang nghiêng option
  cuối cho catalog dài hạn, option ít bảng hơn vẫn để so sánh; chưa selected.
  Proposal meaning_vi ở mục 22 là lịch sử, không schema đang nghiêng mới nhất.
- Rà ownership/module, API/client compatibility, payload/rubric version,
  adapter AI, identities, feature entitlement/usage, billing events,
  operation/outbox, search/RAG derived index, sync, cache/replica,
  partition/migration/rollback và observability.
- Tách extensibility sản phẩm với capacity scaling: chưa có data/load test
  để hứa số user/RPS hoặc chọn topology. Chuẩn bị boundary/identity/contract
  khi có ích cho domain; infrastructure và generic frameworks theo nhu cầu.
- V3/V4/V5 chưa có feature được người dùng nêu; không thêm roadmap giả định.
  V1.5 chatbot/RAG vẫn có điều kiện theo quyết định trước.

Cập nhật context, kế hoạch, schema, grading note, template decision và AGENTS.md
để các bước sau giữ trade-offs/migration/evolution và trạng thái proposed rõ.
Chưa tạo app code/DB, chưa migration thật hoặc có evidence production mới.

## 24. Quan sát Network để học cách tải dữ liệu — 02/10/2026

Người dùng yêu cầu kiểm tra request của trang từ vựng lớn, ví dụ Cambridge.
Đã ghi [báo cáo Network và evidence](NETWORK_INSPECTION_2026-10-02.md).
Cambridge bị Cloudflare chặn ở phiên Chrome tự động và in-app browser, nên
chưa có trace nội dung từ điển thật của Cambridge. Longman và Wiktionary tải
được: nội dung chính có sẵn trong HTTP HTML, tìm kiếm gợi ý dùng request riêng;
Longman tải MP3 sau bấm phát âm, search chuyển document qua redirect; cache
header khác nhau theo asset/endpoint. Đây là quan sát trình duyệt, chưa biết
backend DB/cache/service của họ.

Đề xuất tham khảo cho V1: payload theo nhóm nhỏ, lật flashcard tại client,
search gọn, asset có version/cache phù hợp và AI chỉ gọi khi bắt đầu luyện.
Không tự thêm audio vào phạm vi và không biến cache/async proposal thành spec
đã chốt. Báo cáo có các bước tự ghi Network của Cambridge trong phiên truy cập
bình thường của người dùng; các snapshot riêng lẻ chưa phải benchmark hiệu năng.

## 25. Giải thích cho người mới và tổng hợp session qua sub-agent — 02/10/2026

**Yêu cầu trực tiếp:** giải thích rõ hơn các hướng thiết kế bằng ngôn ngữ cho
người mới; giao một sub-agent phân tích session
`01a0f4ef-e954-78a2-b323-e521ba4776c9` về các trang từ điển.

Đã dùng một sub-agent, đọc đúng **Business Analysis (Working) (2)** qua ba
trang pagination, hết 21 lượt, và đối chiếu báo cáo/log Network đã lưu.
Không gửi tin nhắn hoặc thao tác trong thread đó. Xem [tổng hợp session](DICTIONARY_API_SESSION_SUMMARY_2026-10-02.md).

**Evidence:** session gần nhất quan sát Network website. Longman/Wiktionary
có trace thành công, Cambridge/Merriam-Webster/WordReference bị chặn trong
các phiên thử. HTML chứa nội dung chính; search gợi ý có request riêng;
Longman tải MP3 sau bấm nghe. Longman autocomplete payload chưa được kiểm tra,
không gọi là JSON thuần. Cache header không chứng minh DB/Redis/microservices.

**Chưa có evidence từ session này:** API commercial, giá/quota/SLA, license
lưu/chỉnh sửa/AI, A1–C2, topic hoặc nội dung Việt/đa ngôn ngữ đầy đủ. Research
nguồn ở mục 19/20 là evidence riêng; không suy ra quyền tích hợp từ endpoint
quan sát được trong browser.

[Bản giải thích cho người mới](SYSTEM_DESIGN_BEGINNER_GUIDE_2026-10-02.md)
dùng ví dụ bank để diễn giải entry/sense/localized text, progress theo ID,
module trong cùng backend, adapter/contract, quyền feature/operation/version
và tăng tải. Thêm ngôn ngữ/type/server trong ví dụ không tự thành roadmap;
Tại thời điểm tổng hợp, fetch trực tiếp, catalog DB và hybrid còn proposed.
Lựa chọn sau đó được ghi ở mục 26; chưa có code/import hoặc provider được chọn.

## 26. Chốt hướng dữ liệu hybrid — 02/10/2026

**Người dùng đã xác nhận:** chọn hybrid. Catalog từ vựng chính tồn tại trong
DB app, độc lập flashcard; nguồn/API ngoài bổ sung hoặc tra cứu khi cần.

**Còn mở:** nguồn/provider và quyền sử dụng; phạm vi nội dung đầu tiên;
mapping vào schema; quy tắc lưu, duyệt, cập nhật; điều kiện gọi ngoài và xử lý
quota/lỗi. Không mặc định dữ liệu ngoài được tự động nhập hoặc publish.
Schema và thiết kế subsystem vẫn là đề xuất; chưa triển khai hay đo chất lượng.
Lựa chọn nguồn hybrid không tự đưa chatbot/RAG V1.5 vào V1 hoặc chọn hybrid retrieval.

## 27. Tổng hợp để lưu document dự án — 02/10/2026

Theo yêu cầu người dùng, tạo [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)
làm bản tổng hợp context hiện tại, gồm mục tiêu, scope/flow V1, lựa chọn hybrid,
options dữ liệu/hệ thống/chấm, evidence, lịch sử quyết định và phần còn mở.
Gói ZIP đi kèm giữ file nguồn, evidence và mục lục để lưu/bàn giao.

Đây là xuất tài liệu từ context đã có, không là Product Spec/Architecture Spec
accepted, không có research hoặc phản hồi khảo sát mới và không bắt đầu code.

## 28. Rà rủi ro, nguồn A1–C2 và giới hạn thực hiện — 02/10/2026

**Người dùng nêu/chọn:**

- Điểm khác biệt muốn giữ: thực hành đặt câu với từ người dùng chọn; các công cụ
  họ đang dùng chủ yếu kiểm tra theo definition. Ngoài bài AI, có thể thêm kiểm
  tra theo definition không cần AI. Góp ý/sửa câu tạm chưa làm. Không thu hẹp MVP.
- Muốn kiến trúc theo hướng scale up để dùng được khi mở rộng sau này.
- Làm một mình, khả năng 4–6 giờ/ngày (có thể 8); xây và chạy local trước; deploy
  web trước nếu thủ tục store phức tạp, mobile vẫn xây; tự duyệt nội dung; pilot
  kỳ vọng 10–30 người, không quá 50.
- Nguồn metadata level: **CEFR-J + Octanove C1/C2**. Worker: **BullMQ chỉ cho việc
  soạn/import nội dung, dùng ngay từ gói pilot đầu tiên**; luồng người dùng gọi AI
  trực tiếp. Doanh thu: giữ mục tiêu thử doanh thu, đo willingness to pay trong
  pilot không cần billing thật.

**Bằng chứng** (chi tiết ở [research 02/10](DATA_COST_LICENSE_RESEARCH_2026-10-02.md)):
CEFR-J + Octanove = 8.812 headword A1–C2, chỉ có từ + loại từ + level; nhiều thuật
ngữ chuyên ngành không có trong danh sách nào. Quizlet gỡ Q-Chat từ 06/2025, không
nêu lý do. Google Play yêu cầu closed test ≥12 tester × 14 ngày với tài khoản cá
nhân mới; Apple yêu cầu In-App Purchase cho mở khóa tính năng và login bảo vệ riêng
tư khi có Google Sign-In; Octanove là CC BY-SA 4.0.

**Còn mở:** phiên bản CEFR-J (1.6 chính thức hay 1.5 mirror), nơi phát hành chính
thức của Octanove, topic và nghĩa Việt, cách đo willingness to pay, kênh tuyển
pilot, thiết kế job worker (cần Defense Analysis), ToS/Privacy Policy. Trạng thái
mới nhất xem [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).

## 29. Chốt phạm vi spec và bốn điểm còn mở — 02/10/2026

**Người dùng chọn:** spec theo hướng hybrid — một system spec mỏng cộng module spec cho 7 module
V1 (Identity & Access, Vocabulary Content, Learning, Content Pipeline, Entitlements & Usage, AI
Integration, Practice); viết sau.

**Người dùng chốt:** schema D; đăng nhập bằng email + mật khẩu tự làm, OAuth 2.0 Google và OTP qua
SMTP; từ chức năng theo cách B; Free không AI, từ trial trở lên có AI, Pro hạn mức cao hơn trial;
phrasal verb, collocation, idiom để sau V1; quyết định theo hướng reusable/scalable và cần tài liệu
pattern.

**Làm rõ cuối ngày 02/10:** OTP chỉ dùng cho xác minh email và quên mật khẩu (bỏ OTP đăng nhập); khi người
học điền từ vào câu do AI sinh, kết quả là đúng/sai kèm giải thích và bản dịch nguyên câu; người
dùng tự kích hoạt trial khi cần, kể cả trong pilot chưa có billing.

**Chốt tiếp cuối ngày 02/10:** bài tự viết câu tạm thời chưa ở V1; logout một thiết bị (chỉ thiết bị đang
đăng xuất; xác nhận cuối ngày 02/10); số lượt AI của trial/Pro và trial một lần hay không sẽ tính
sau; nhà cung cấp SMTP là Google (đổi được nếu có vấn đề).

**Bằng chứng:** [pattern research, nguồn chính thức](ARCHITECTURE_PATTERNS_RESEARCH_2026-10-02.md).
Chưa có spec hay code.
