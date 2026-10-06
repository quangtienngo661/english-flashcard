# Context dự án — bản tổng hợp để lưu vào document

Ngày tổng hợp: **02/10/2026**, sau quyết định chọn nguồn từ vựng **hybrid**.
Phạm vi: tổng hợp tài liệu trong workspace; không có vòng khảo sát, research
provider hoặc kiểm thử sản phẩm mới trong lần tổng hợp này.

Đây là tài liệu bàn giao context, **chưa phải Product Spec hay Architecture
Spec đã chốt**. Các file nguồn và bằng chứng được giữ trong gói ZIP đi kèm.

## Mục lục

1. [Mục tiêu và nguyên tắc làm việc](#1-mục-tiêu-và-nguyên-tắc-làm-việc)
2. [Hướng sản phẩm và giá trị cần kiểm chứng](#2-hướng-sản-phẩm-và-giá-trị-cần-kiểm-chứng)
3. [Yêu cầu đã xác nhận](#3-yêu-cầu-đã-xác-nhận)
4. [Luồng V1 và giới hạn phạm vi](#4-luồng-v1-và-giới-hạn-phạm-vi)
5. [Nguồn từ vựng hybrid](#5-nguồn-từ-vựng-hybrid)
6. [Hướng dữ liệu và hệ thống — còn là đề xuất](#6-hướng-dữ-liệu-và-hệ-thống--còn-là-đề-xuất)
7. [Quy tắc chấm bài — phần đã chốt và phần draft](#7-quy-tắc-chấm-bài--phần-đã-chốt-và-phần-draft)
8. [Khảo sát và research đã có](#8-khảo-sát-và-research-đã-có)
9. [Lịch sử các quyết định quan trọng](#9-lịch-sử-các-quyết-định-quan-trọng)
10. [Phần còn mở và bước triển khai kế tiếp](#10-phần-còn-mở-và-bước-triển-khai-kế-tiếp)
11. [Checkpoint Defense Analysis](#11-checkpoint-defense-analysis)
12. [Danh mục toàn bộ file context](#12-danh-mục-toàn-bộ-file-context)

## Cách đọc trạng thái

| Nhãn | Ý nghĩa |
| --- | --- |
| **Đã xác nhận / đã chốt** | Yêu cầu hoặc lựa chọn được người dùng nêu rõ. |
| **Đề xuất / draft** | Phương án để xem xét; không tự thành yêu cầu đã được chọn. |
| **Bằng chứng** | Điều đã đọc hoặc quan sát, luôn đi cùng ngày, mẫu và giới hạn. |
| **Giả thuyết** | Nhận định về giá trị, hành vi hoặc doanh thu cần kiểm chứng. |
| **Lịch sử / thay thế** | Đề xuất hoặc trạng thái cũ; không dùng để ghi đè quyết định mới. |

Khi tài liệu cũ khác trạng thái hiện tại, ưu tiên yêu cầu người dùng mới nhất,
[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md), mục 26 trở đi của
[PRODUCT_DISCOVERY.md](PRODUCT_DISCOVERY.md) và trạng thái tóm tắt trong bản này.
Các file research theo ngày là bằng chứng tại thời điểm nghiên cứu, không phải
cam kết về tính năng, giá hoặc điều khoản hiện hành của nhà cung cấp.

## 1. Mục tiêu và nguyên tắc làm việc

Trong khoảng **2–3 tháng**, xây và public một sản phẩm thật, vận hành được với
người dùng thật và thử nghiệm khả năng tạo doanh thu. Ngày bắt đầu, ngày release,
ngân sách, số người dùng và doanh thu mục tiêu chưa được chốt.

Project đồng thời phục vụ việc học Backend/Production Engineering và AI Systems
qua những quyết định, số liệu và sự cố thực tế. Thành công cần thể hiện bằng
sản phẩm ship được, hiểu hành vi hệ thống và có khả năng phát hiện/khôi phục lỗi.

Thứ tự ưu tiên đã thống nhất:

**Problem → target users → core loop → MVP → shipping → real users → telemetry
→ failures/improvements → hardening → scale.**

Người dùng muốn giữ trọng tâm triển khai V1; không mở thêm các vòng discovery
quá sâu làm lệch mục tiêu. Tuy vậy, các giả thuyết retention và chi trả vẫn cần
được kiểm chứng qua pilot, không coi là đã đúng chỉ vì quyết định xây app.

Khi đề xuất kỹ thuật, phải giải thích dễ hiểu và so sánh công xây dựng, vận hành,
failure handling, migration/rollback, trade-offs và điều kiện đổi phương án.
Thiết kế cần xét khả năng tiến hóa, nhưng không tự xây feature V3/V4/V5 chưa nêu.

## 2. Hướng sản phẩm và giá trị cần kiểm chứng

**Hướng đã chọn để chuẩn bị V1:** app học từ vựng tiếng Anh theo level và chủ đề,
có nhóm từ cá nhân, flashcard và thực hành AI trên các nhóm từ đó.

Giả thuyết giá trị: giúp người học tìm/gom từ phù hợp, ôn khi rảnh và thử dùng
chính các từ đó trong bài tập, giảm công tự tổ chức qua nhiều công cụ. Đây là
giả thuyết để xây và đo, chưa là bằng chứng người dùng sẽ quay lại hoặc trả tiền.

Mẫu discovery hiện có chủ yếu là sinh viên đại học, một số đang thực tập.
Sinh viên học tiếng Anh là nhóm giả định đầu tiên; phân khúc hẹp hơn, mục tiêu
học và kênh tuyển pilot chưa được chọn.

ChatGPT/Claude/Gemini và các công cụ flashcard là phương án thay thế cần tính
đến. Tạo câu hỏi bằng AI hoặc giảm thao tác riêng lẻ chưa đủ chứng minh giá trị
trả phí. Cần quan sát người học tự quay lại và lựa chọn app thay cách đang dùng.

## 3. Yêu cầu đã xác nhận

| Phần | Yêu cầu / lựa chọn đã ghi nhận | Phần chưa chốt |
| --- | --- | --- |
| Nền tảng | **Web Next.js + mobile Flutter** trong V1. | Thứ tự implementation/release; Android/iOS cụ thể. |
| Nội dung | Học tiếng Anh; level **A1–C2**; nhiều chủ đề, ví dụ technology, marketing, business, food, daily life. | Bộ từ, số lượng và độ phủ thực tế khi release. |
| Nguồn từ | **Hybrid:** catalog chính ở DB app, nguồn ngoài bổ sung hoặc tra cứu khi cần. | Provider và quy tắc vận hành hai đường dữ liệu. |
| Tài khoản | Đăng nhập lần đầu; giữ trải nghiệm đăng nhập đến khi người dùng logout. | Auth provider; gia hạn/hết hạn/thu hồi phiên; logout một hay mọi thiết bị. |
| Nhóm cá nhân | Chọn từ và tự thêm nội dung tùy chỉnh để học. | Form/schema custom, sửa/xóa và các giới hạn. |
| Flashcard | Các trạng thái **chưa học, cần ôn tập, đã biết** trong baseline V1. | Identity tiến độ, xung đột và hành vi chi tiết khi sửa nội dung. |
| AI V1 | Tạo bài **điền từ** hoặc **tự viết câu dùng từ**; app chấm **đúng/sai tự động**. | Rubric, accepted forms, model và xử lý chấm nhầm. |
| Chuẩn hóa đáp án | So sánh lowercase; chấp nhận contraction ngữ pháp tương đương như I am/I'm. | Dung sai typo, chia từ và các trường hợp phụ thuộc ngữ cảnh. |
| Viết tắt chat | Không coi TY/GTG tương đương các cụm đầy đủ. | Không suy diễn thành cấm mọi thuật ngữ viết tắt như API/CPU. |
| Gói | **Free/Pro**, Pro có AI, **trial 14 ngày**. | Free có AI hay không; quyền/trigger trial; quota, giá, billing/auto-charge. |
| Mở rộng V1.5 | Chatbot tra cứu từ vựng, cân nhắc RAG sớm nếu có nhu cầu. | Lịch làm, retrieval, provider và response format. |
| Tiến hóa hệ thống | Xét đa ngôn ngữ, content, type, provider, plan, client compatibility, tải và chi phí. | Option schema/module/subsystem cụ thể. |

Định hướng thu phí là tính năng AI. Quyền dùng dữ liệu nguồn vẫn cần được
xác minh cho cấu hình sản phẩm thực tế; chưa có provider/hợp đồng đã được chọn.

## 4. Luồng V1 và giới hạn phạm vi

Đây là **baseline và tình huống giả định**, chưa phải flow đã được quan sát ở app:

1. Người dùng đăng nhập lần đầu.
2. Tìm/chọn từ theo level và chủ đề, hoặc tự thêm từ.
3. Lưu vào nhóm học cá nhân.
4. Ôn flashcard và tự đánh dấu trạng thái.
5. Khi có quyền AI, chọn bài điền từ hoặc tự viết câu từ nhóm đó.
6. Nhập đáp án và xem đúng/sai sau khi chấm thành công.
7. Quay lại thấy nhóm và trạng thái đã lưu.

Đề xuất kỹ thuật hiện tại là web/mobile cùng đọc dữ liệu theo tài khoản qua
backend. Việc dùng cùng backend, tiến độ theo nghĩa, ưu tiên từ cần ôn và
hiển thị nghĩa mục tiêu vẫn cần spec; không coi toàn bộ flow nháp là acceptance.

Các giới hạn hiện tại:

- Người dùng đã bỏ luồng AI góp ý/sửa câu dài và thử lại với tutor khỏi V1.
- V1 chưa gồm hội thoại nhiều lượt, voice/phát âm hoặc dịch câu như loại bài.
- Streak, lịch ôn thích ứng, điểm năng lực và offline sync chưa nằm trong baseline.
- Không tự mở rộng thành tra ngữ pháp độc lập hoặc sao chép toàn bộ feature đối thủ.
- Chatbot/RAG V1.5 là nhánh có điều kiện; hybrid nguồn dữ liệu không tự đưa nó vào V1.

Đề xuất giữ trạng thái flashcard do người học chọn độc lập kết quả bài tập.
AI timeout/chấm lỗi nên hiển thị chưa xử lý được, không tính đáp án sai; hành vi
retry/quota/lưu kết quả vẫn cần được chốt trong subsystem spec.

Chi tiết: [V1_USER_FLOW_DRAFT.md](V1_USER_FLOW_DRAFT.md),
[V1_IMPLEMENTATION_PLAN.md](V1_IMPLEMENTATION_PLAN.md).

## 5. Nguồn từ vựng hybrid

**Đã chốt hướng:** từ vựng là dữ liệu riêng tồn tại trong DB app, không cần
được tạo flashcard trước mới tồn tại. Catalog chính được kết hợp với nguồn/API
ngoài để bổ sung nội dung hoặc phục vụ tra cứu khi cần.

| Lớp dữ liệu | Vai trò | Trạng thái thiết kế |
| --- | --- | --- |
| Catalog từ vựng | Nội dung từ/nghĩa, level/chủ đề và nguồn của app. | DB là hướng đã chọn; schema và quy trình publish còn draft. |
| Nhóm học | Tập nội dung người dùng muốn học. | Đề xuất lưu tham chiếu tới ID nội dung, không copy toàn bộ từ điển vào mỗi nhóm. |
| Trạng thái người học | Chưa học/cần ôn/đã biết theo tài khoản. | Đề xuất tách khỏi nội dung catalog; cách gắn ID còn cần chọn. |
| Flashcard | Cách trình bày dữ liệu để ôn. | Không phải nguồn gốc tồn tại của từ vựng. |
| Nguồn ngoài | Bổ sung dữ liệu hoặc tra cứu theo nhu cầu. | Chưa chọn provider, trigger, caching, import hoặc fallback. |

Research ngày 01/10 phân biệt **API lookup một từ** với **bộ dữ liệu học theo
level/chủ đề**: một nguồn có định nghĩa chưa chắc có CEFR/topic hoặc nghĩa Việt.
CEFR-J đã nghiên cứu chỉ A1–B2; phần C1–C2, độ phủ topic và nội dung cần bổ sung.
Các nguồn được xem gồm CEFR-J, Wiktionary/Kaikki, Free Dictionary API,
Cambridge, Oxford và Merriam-Webster; chưa nguồn nào được chọn triển khai.

Ưu điểm dự kiến của hybrid là giữ nội dung học trong app và mở đường bổ sung.
Đánh đổi là công nhập/duyệt/cập nhật, mapping nghĩa giữa các nguồn và vận hành
hai đường dữ liệu. Đây chưa là kết quả đo về latency, chi phí hay reliability.

Các lựa chọn còn mở: metadata level ở entry hay sense, ID/mapping, quyền lưu
và dùng với AI, attribution, refresh nội dung, xử lý từ không có và provider lỗi.
Không mặc định kết quả ngoài được tự động nhập hoặc publish vào catalog.

Nguồn chi tiết và Defense Analysis draft:
[VOCABULARY_DATA_RESEARCH_2026-10-01.md](VOCABULARY_DATA_RESEARCH_2026-10-01.md),
[DICTIONARY_API_SESSION_SUMMARY_2026-10-02.md](DICTIONARY_API_SESSION_SUMMARY_2026-10-02.md).

## 6. Hướng dữ liệu và hệ thống — còn là đề xuất

### 6.1. Hướng architecture khởi đầu

| Thành phần | Vai trò / mức chốt |
| --- | --- |
| NestJS modular monolith | Hướng ban đầu: một backend, module có trách nhiệm rõ. Chưa chốt module/API chi tiết. |
| PostgreSQL | Hướng lưu dữ liệu bền vững. Chưa tạo DB, chọn ORM hoặc cấu hình production. |
| Redis/BullMQ/workers | Dùng khi có background task hoặc nhu cầu cụ thể; không mặc định mọi lượt AI phải qua queue. |
| Docker, observability, CI/CD | Hướng vận hành đã thống nhất; pipeline, deployment và ngưỡng cảnh báo chưa thiết kế cuối. |
| Managed infrastructure | Cân nhắc theo chi phí và công vận hành; chưa chọn hosting/provider. |
| Cache, CDN, object storage, retrieval | Thêm khi flow/nội dung hoặc đo đạc cho thấy cần. |

Kafka, Kubernetes và microservices cần vấn đề cụ thể đã đo, alternatives và
ADR giải thích chi phí. Không có benchmark/RPS hay production traffic để hứa
mức chịu tải; capacity test tương lai phải tách khỏi bằng chứng traffic thật.

### 6.2. Schema đa ngôn ngữ đang so sánh

Không tiếp tục lấy cột `meaning_vi` cố định trong nội dung lõi làm hướng
thiết kế mới. Các option hiện tại:

| Option | Lợi ích | Đánh đổi |
| --- | --- | --- |
| A. Cột theo từng ngôn ngữ | Ít bảng, dễ làm bản đầu. | Thêm ngôn ngữ phải đổi schema; không phù hợp hướng tiến hóa đã yêu cầu. |
| B. JSONB map bản dịch | Thêm ngôn ngữ linh hoạt. | Khó quản lý duyệt/nguồn/validation từng bản và cập nhật đồng thời. |
| C. Item theo một nghĩa + localized texts | Đa ngôn ngữ, ít bảng hơn D. | Thông tin từ/loại từ có thể lặp giữa các nghĩa. |
| D. Entry → sense → localized texts | Tách từ, nghĩa và cách diễn đạt, thuận lợi catalog nhiều nghĩa. | Thêm bảng/join và công mapping/import/validation. |

Trợ lý đang nghiêng **D**, với **C** là phương án ít công hơn. **Người dùng chưa
chọn C hoặc D**; chọn hybrid nguồn dữ liệu không đồng nghĩa chọn schema D.

Entry là từ/cụm từ và loại từ; sense là một nghĩa; localized text là cách giải
thích nghĩa đó bằng một ngôn ngữ. Ví dụ bank/ngân hàng và bank/bờ sông là hai
nghĩa. Đề xuất tiến độ bám ID nghĩa, không bám chuỗi dịch, để sửa giải thích
không vô tình reset tiến độ. Thay bản chất/tách/gộp nghĩa vẫn cần mapping.

Tách ngôn ngữ đang học, ngôn ngữ giải thích và locale UI. V1 học tiếng Anh;
schema có khả năng chứa language tag không tự thêm nội dung hay grader cho
ngôn ngữ khác. Thêm nội dung mới vẫn cần biên tập và kiểm chứng.

### 6.3. Ranh giới đề xuất để tiến hóa

Các nhóm trách nhiệm đang đề xuất: Identity/Access, Vocabulary Content,
Learning, Practice, AI Integration, Entitlements/Usage và Billing khi thu phí.
Đây là ranh giới code trong modular monolith, không phải danh sách microservices.

Các hướng cần cân nhắc trong spec: ID nội bộ ổn định; scope/owner cho custom;
provider adapter; API DTO có compatibility policy cho Flutter cũ; version cho
question/prompt/rubric và snapshot đề; quyền feature tách usage; operation ID
để nhận diện retry. Chưa chốt interface, bảng hoặc framework cụ thể.

Tăng tải bắt đầu từ workload và bottleneck đo được: query/index/pagination,
connection/concurrency budget, tài nguyên, cache/replica nếu phù hợp; partition
hoặc tách service là decision sau. Phải tính consistency, private data,
migration/rollback và chi phí. V3/V4/V5 chưa có feature được xác định.

Chi tiết: [V1_DATA_MODEL_DRAFT.md](V1_DATA_MODEL_DRAFT.md),
[SYSTEM_EVOLUTION_OPTIONS_2026-10-02.md](SYSTEM_EVOLUTION_OPTIONS_2026-10-02.md).
Giải thích cho người mới:
[SYSTEM_DESIGN_BEGINNER_GUIDE_2026-10-02.md](SYSTEM_DESIGN_BEGINNER_GUIDE_2026-10-02.md).

## 7. Quy tắc chấm bài — phần đã chốt và phần draft

**Đã xác nhận:** lowercase khi so sánh, contraction ngữ pháp tương đương và
không tự mở rộng TY/GTG. Hai loại bài và UI đúng/sai đã được chọn.

**Đề xuất cho bài điền từ:** tạo trước đáp án và biến thể hợp lệ; chuẩn hóa rồi
chấm bằng rules nếu đủ. Không mặc định mọi synonym hoặc mọi dạng chia từ đều
đúng. Bài có nhiều đáp án cần làm rõ hoặc bổ sung accepted forms trước phát hành.

**Rubric tự viết câu đang đề xuất**, chưa có kết quả model thực tế:

1. Có vận dụng từ mục tiêu, không chỉ nhắc tên từ.
2. Đúng nghĩa đang luyện, không cần giống câu mẫu.
3. Đúng ngữ pháp trực tiếp của cách dùng từ mục tiêu.
4. Câu đủ rõ; dung sai lỗi nhỏ ngoài mục tiêu phải được chốt bằng ví dụ.

Đề xuất giữ câu gốc và bản so sánh; contraction phải xét ngữ cảnh, không replace
mọi `'s` thành is. Lỗi hệ thống/format/không đủ căn cứ giữ trạng thái chưa chấm,
không gán sai. Kết quả chấm không tự đổi trạng thái thẻ người học đã chọn.

Trước pilot câu mở, cần tập đáp án có nhãn người duyệt và đo chấm nhầm,
ungradable, tính nhất quán, latency/cost. Không coi JSON hợp lệ hoặc confidence
model là bằng chứng câu được chấm đúng. Ngưỡng phát hành chưa được chọn.

Chi tiết và case failure:
[V1_GRADING_RULES_DRAFT.md](V1_GRADING_RULES_DRAFT.md).

## 8. Khảo sát và research đã có

### 8.1. Khảo sát hành vi

Google Form hiện được ghi nhận có **19 câu / 6 phần**. Đã bỏ hai câu cuối về
bổ sung trải nghiệm và thông tin liên hệ theo yêu cầu người dùng. Không tự thu
email; chưa đọc lại cài đặt hoặc dữ liệu live trong lần tổng hợp này.

- [Link trả lời khảo sát](https://docs.google.com/forms/d/e/1FAIpQLScok6j9f3DL1kz62ZFxI4tAUxAVZtCr7riA5aqNtCil3OLKGA/viewform?usp=publish-editor).
- [Link chỉnh sửa Form](https://docs.google.com/forms/d/1ANBSFx6VNIZKdb9N_WJQINmGdLyK9GMFg-JSMKf8_4A/edit).
- [Bảng phản hồi](https://docs.google.com/spreadsheets/d/1nkaFL-fvVcpjz-OeLdqOIvTe_sd6qmL3hCtCHrWm114/edit?gid=2119001038).

**Snapshot phân tích ngày 30/09/2026**, không phải số hiện tại trên Sheets:

| Quan sát | Số liệu và giới hạn |
| --- | --- |
| Phản hồi | 14 dòng, 13 dòng có nội dung, 12 chọn đang học. Chưa chứng minh người trả lời duy nhất. |
| Mẫu | Người dùng xác nhận phần lớn là sinh viên đại học, một số đang thực tập; kênh tuyển cụ thể chưa biết. |
| Khó duy trì học | 8/12 chọn là trở ngại ảnh hưởng nhiều nhất; 7/11 nếu bỏ dòng có tự thuật vô nghĩa. |
| Dùng AI gần đây | 9/12 theo Q11; Q08/Q11 bất nhất ở 4/12, nên cần thận trọng. |
| AI còn thiếu gì | Trong 6 câu mở có trả lời, 5 nói đáp ứng đủ; câu không bắt buộc. |
| Khoản chi | 7/13 nói không chi trong 3 tháng; khoản chi cụ thể phần lớn thiếu/bất nhất. |

Các con số chỉ mô tả mẫu thuận tiện nhỏ. Chưa chứng minh nhu cầu trả tiền,
nguyên nhân bỏ học, hiệu quả học hoặc retention của app.
Chi tiết: [SURVEY_QUESTIONNAIRE.md](SURVEY_QUESTIONNAIRE.md),
[SURVEY_ANALYSIS_2026-09-30.md](SURVEY_ANALYSIS_2026-09-30.md).

### 8.2. Phản hồi định tính, cộng đồng và đối thủ

Một ảnh hội thoại nêu mong muốn tiện, tra nhanh/đúng, danh sách từ/ngữ pháp hoặc
bài tập chuẩn bị sẵn để ôn lúc rảnh. Đây là ý kiến giả định của một người,
không phải hành vi mua; không cộng vào thống kê khảo sát vì có thể trùng mẫu.

Research cộng đồng ngày 30/09 kiểm chứng được thảo luận Reddit, chưa có bài
Facebook/Threads đủ nội dung để xác minh. Các tình huống gợi ý nhu cầu luyện
theo ngữ cảnh, tin vào feedback và vận dụng lại; không đại diện toàn thị trường.

Research đối thủ ngày 30/09 xem tính năng công bố của ELSA, Speak, Duolingo Max,
Loora, Praktika và AI phổ thông. Bài học là tích hợp nội dung, bước luyện tiếp
và dữ liệu theo thời gian có thể tạo giá trị; chưa có phép so sánh độc lập chứng
minh app mình thắng workflow AI chat tốt cùng thời lượng. Voice/feedback của
đối thủ không tự trở thành feature V1.

### 8.3. Nghiên cứu Network các trang từ điển

Session liên quan:
[Business Analysis (Working) (2)](codex://threads/01a0f4ef-e954-78a2-b323-e521ba4776c9).
Đã được sub-agent tổng hợp theo yêu cầu trước đây; quan sát Network ngày 02/10.

Longman/Wiktionary có trace tải trang thành công: nội dung trong HTML và request
gợi ý riêng; Longman phát sinh MP3 khi bấm nghe. Cambridge/Merriam-Webster/
WordReference bị chặn trong các phiên thử, chưa có trace nội dung thật tương ứng.

Đây là evidence về hành vi trình duyệt, không xác minh API thương mại, license,
giá/quota hoặc backend DB/Redis/microservices. Hybrid nguồn dữ liệu khác với
hybrid retrieval trong RAG. Các TTL quan sát không là TTL đã chọn cho app.

## 9. Lịch sử các quyết định quan trọng

| Ngày | Quyết định / thay đổi | Trạng thái sau thay đổi |
| --- | --- | --- |
| 29/09 | Chuyển context Business Analysis sang workspace; xem lại ý tưởng. | Chưa chọn sản phẩm ở thời điểm đó; bắt đầu discovery. |
| 29–30/09 | Tạo khảo sát, bỏ hai câu cuối; đọc phản hồi, research cộng đồng/đối thủ. | Có tín hiệu discovery, chưa có bằng chứng thị trường của app. |
| 30/09 | Tập trung chuẩn bị V1 app từ vựng/flashcard/AI; bỏ mốc trung gian đã đề xuất. | Các flow AI sửa câu khi đó chỉ là đề xuất cũ. |
| 01/10 | Bỏ AI góp ý/sửa câu và tutor retry; chọn điền từ/tự viết câu chấm đúng/sai. | Đây là hướng AI V1 hiện tại. |
| 01/10 | Xác nhận nền bộ từ theo level/chủ đề; bổ sung lại V1.5 chatbot/RAG có điều kiện. | Không khôi phục các feature V1.5 cũ khác. |
| 02/10 | Next.js + Flutter; A1–C2/nhiều chủ đề; login; lowercase/contraction; Free/Pro/trial. | Chi tiết nội dung/auth/rubric/quota còn mở. |
| 02/10 | Yêu cầu hướng thiết kế tiến hóa và trade-offs toàn hệ thống. | Schema đa ngôn ngữ và subsystem options vẫn draft. |
| 02/10 | **Chọn hybrid cho nguồn từ vựng.** | Catalog DB + nguồn ngoài; chưa chọn provider/cơ chế import/schema. |

## 10. Phần còn mở và bước triển khai kế tiếp

**Trạng thái thực tế:** workspace có tài liệu, Form và phân tích research.
Chưa có app code, DB được tạo, Product/Architecture Spec được chốt, deployment,
CI/CD thực thi, model evaluation, capacity test, người dùng app hoặc thử thu tiền.

| Nhóm còn mở | Cần làm rõ | Thời điểm cần |
| --- | --- | --- |
| Nội dung/nguồn hybrid | Provider, quyền dùng, tập nội dung, C1–C2/topic, mapping/duyệt/cập nhật và lookup ngoài. | Trước import/publish/tích hợp thật. |
| Data model/custom | Chọn C/D, trường custom, scope, semantic ID, sửa/xóa/retention và fallback ngôn ngữ. | Trước lưu dữ liệu sản phẩm. |
| Auth/client | Phương thức login, phiên/thu hồi/logout, thứ tự Next.js/Flutter và Android/iOS. | Khi scaffold và xây lưu dữ liệu tài khoản. |
| Chấm AI | Accepted forms, rubric/dung sai, model, corpus và xử lý chấm nhầm. | Trước chấm thật và pilot câu mở. |
| Plan/trial/usage | Free AI, quyền/trigger trial, quota, tác vụ dở dang khi hết quyền và giá/billing. | Quyền/hạn mức trước AI thật; billing trước thu tiền. |
| Khả năng thực hiện | Giờ làm mỗi tuần, budget AI/hạ tầng, người dùng pilot, lịch release. | Trước cam kết lịch và chi phí thực tế. |
| Vận hành public | Hosting, validation/access, quan sát lỗi/cost, backup/restore và rollback. | Chuẩn bị trong quá trình xây; kiểm chứng trước public. |

Thứ tự triển khai đang đề xuất:

1. Viết Product Spec V1 ngắn; cụ thể hóa các mục mở đúng phần cần triển khai,
   với Defense Analysis và trade-offs. Chọn tập nội dung nhỏ để thử.
2. Vertical slice không AI: login → chọn/thêm từ → nhóm → flashcard → lưu → quay lại.
3. Thêm quyền/quota và bài điền từ; thêm chấm câu tự viết sau khi đánh giá rubric/model.
4. Pilot: đo hoàn thành, tự quay lại, chấm nhầm, latency và cost; đối chiếu cách đang dùng.
5. Public V1 với các kiểm tra vận hành phù hợp; hardening/scale theo evidence.

V1 vẫn gồm cả hai client đã chọn; thứ tự làm còn mở. Không cần catalog toàn
diện, billing phức tạp hay RAG để bắt đầu prototype. Không mặc định Pro AI vô hạn.
Chưa đặt ngưỡng thành công hoặc thông số SLA khi chưa có baseline/budget.

## 11. Checkpoint Defense Analysis

Yêu cầu làm việc đã thống nhất khi viết spec, ADR hoặc subsystem design có
quyết định hành vi/độ tin cậy quan trọng:

> **Decision này cần Defense Analysis trước khi chốt spec.**

Bắt đầu bằng vài câu hỏi/hint để người dùng reasoning; nếu được yêu cầu đầy đủ,
phân tích trực tiếp. Các nhóm phải xét: happy path, invariants, edge cases,
failure modes, concurrency/races, idempotency/duplicates, partial failures,
timeout/retry, security/abuse, observability, recovery/rollback, alternatives
và trade-offs; thêm evolution/compatibility và capacity/cost khi liên quan.

Mỗi case ghi: **hành vi mong đợi → bảo vệ/xử lý → phát hiện → khôi phục → kiểm
chứng**. Phần không liên quan có lý do; phần chưa chốt giữ rõ trạng thái.
Đây là checkpoint reasoning/review, không thêm bước xin phép cho việc đã được giao.

Mẫu nguồn: [DECISION_ANALYSIS_TEMPLATE.md](DECISION_ANALYSIS_TEMPLATE.md).
Các bảng case trong research/schema/grading là draft, không phải test đã chạy.

## 12. Danh mục toàn bộ file context

Các file dưới đây nằm trong `outputs/` của gói ZIP. Bản tổng hợp này dùng để
đọc/copy vào document; file nguồn giữ chi tiết, liên kết và lịch sử.

| File | Nội dung | Cách dùng / trạng thái |
| --- | --- | --- |
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | Mục tiêu, ràng buộc, trạng thái và quyết định hiện tại. | Đọc đầu tiên khi tiếp tục công việc. |
| [PRODUCT_DISCOVERY.md](PRODUCT_DISCOVERY.md) | Product brief và lịch sử discovery/quyết định. | Có cả lịch sử; hybrid ở mục 26, bàn giao tài liệu ở mục 27. |
| [V1_IMPLEMENTATION_PLAN.md](V1_IMPLEMENTATION_PLAN.md) | Phạm vi, readiness, thứ tự làm và V1.5 có điều kiện. | Kế hoạch baseline; chưa là spec accepted. |
| [V1_USER_FLOW_DRAFT.md](V1_USER_FLOW_DRAFT.md) | Một vòng dùng V1 và các câu hỏi hành vi. | Flow giả định, chưa quan sát/kiểm chứng ở app. |
| [V1_DATA_MODEL_DRAFT.md](V1_DATA_MODEL_DRAFT.md) | Options schema đa ngôn ngữ, custom, ID/owner và case failure. | C/D chưa chọn; chưa tạo DB. |
| [V1_GRADING_RULES_DRAFT.md](V1_GRADING_RULES_DRAFT.md) | Chuẩn hóa, điền từ, rubric câu mở và failure/recovery. | Rubric draft; chưa có model evaluation. |
| [SYSTEM_EVOLUTION_OPTIONS_2026-10-02.md](SYSTEM_EVOLUTION_OPTIONS_2026-10-02.md) | Options module/API/AI/usage/jobs/search/migration/tải và primary sources. | Đề xuất/trade-offs; không phải topology cuối. |
| [VOCABULARY_DATA_RESEARCH_2026-10-01.md](VOCABULARY_DATA_RESEARCH_2026-10-01.md) | So sánh nguồn/API/DB, quyền dữ liệu, coverage và hướng V1.5. | Research có ngày; cập nhật đã chọn hybrid, provider còn mở. |
| [DECISION_ANALYSIS_TEMPLATE.md](DECISION_ANALYSIS_TEMPLATE.md) | Template spec/ADR và checklist Defense Analysis. | Mẫu làm việc, không phải ADR accepted. |
| [SURVEY_QUESTIONNAIRE.md](SURVEY_QUESTIONNAIRE.md) | 19 câu, 6 phần, nhánh/cài đặt và link Form. | Tài liệu khảo sát; ghi chép lúc tạo/kiểm tra, không là snapshot phản hồi. |
| [SURVEY_ANALYSIS_2026-09-30.md](SURVEY_ANALYSIS_2026-09-30.md) | Số liệu, chất lượng dữ liệu và giới hạn mẫu. | Snapshot 30/09; nhận định trước quyết định xây V1 giữ làm lịch sử. |
| [QUALITATIVE_FEEDBACK_2026-09-30.md](QUALITATIVE_FEEDBACK_2026-09-30.md) | Tổng hợp ảnh phản hồi, không lưu danh tính người trả lời. | Một ý kiến giả định, không cộng mẫu khảo sát. |
| [COMMUNITY_RESEARCH_ENGLISH_AI_2026-09-30.md](COMMUNITY_RESEARCH_ENGLISH_AI_2026-09-30.md) | Chia sẻ cộng đồng, nguồn học tập và giới hạn diễn giải. | Desk research định tính; không biến feature gợi ý thành scope V1. |
| [COMPETITOR_ANALYSIS_AI_ENGLISH_APPS_2026-09-30.md](COMPETITOR_ANALYSIS_AI_ENGLISH_APPS_2026-09-30.md) | Đối chiếu app AI và chat phổ thông. | Tính năng công bố tại ngày nghiên cứu; chưa kiểm thử hiệu quả độc lập. |
| [DICTIONARY_API_SESSION_SUMMARY_2026-10-02.md](DICTIONARY_API_SESSION_SUMMARY_2026-10-02.md) | Tổng hợp session từ điển và phân biệt Network/API/license. | Evidence + áp dụng đề xuất; đã ghi chọn hybrid sau đó. |
| [NETWORK_INSPECTION_2026-10-02.md](NETWORK_INSPECTION_2026-10-02.md) | Quan sát request/search/audio/cache và giới hạn. | Không suy ra backend nội bộ hay quyền tích hợp. |
| [SYSTEM_DESIGN_BEGINNER_GUIDE_2026-10-02.md](SYSTEM_DESIGN_BEGINNER_GUIDE_2026-10-02.md) | Giải nghĩa schema/sense/module/adapter/contract và scale. | Tài liệu giải thích bằng ví dụ, không là feature/spec được chọn. |
| [PROJECT_STATUS_2026-09-30.md](PROJECT_STATUS_2026-09-30.md) | Diễn biến đến 30/09. | Lịch sử; xem bản này/context để có trạng thái 02/10. |

Phụ lục trong gói:

- `AGENTS.md`: nguyên tắc workspace và checkpoint khi tiếp tục làm với agent.
- [NETWORK_OBSERVATIONS_2026-10-02.json](NETWORK_OBSERVATIONS_2026-10-02.json)
  và [LONGMAN_INTERACTIONS_2026-10-02.json](LONGMAN_INTERACTIONS_2026-10-02.json): evidence Network đã lọc.
- `work/dictionary_api_probe_2026-10-01.json`: metadata lần thử API thất bại tầng mạng.
- `SURVEY_FORM_PREVIEW.png`, `SURVEY_FORM_UPDATED.png`: ảnh kiểm tra Form được file khảo sát tham chiếu.
- `README.md`: cách sử dụng gói; `MANIFEST.json`: danh sách file và SHA-256 để kiểm tra bản lưu.

Không có bản export phản hồi cá nhân từ Sheets trong workspace/gói này; bảng
gốc được tham chiếu bằng link. Các raw Network scratch khác không cần để tiếp
tục project nên không đưa vào gói. Gói là bản lưu ngày 02/10, không tự đồng bộ
với những thay đổi sau đó trong workspace hoặc Google Form/Sheets.
