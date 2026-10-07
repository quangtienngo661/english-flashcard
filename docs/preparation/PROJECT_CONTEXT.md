# Project context

Cập nhật trạng thái: **02/10/2026, bản viết lại đầy đủ** sau khi chốt phạm vi V1, phạm vi spec và các
quyết định kỹ thuật. Các lần cập nhật trước chắp thêm ghi chú theo thời gian; bản này gộp lại thành
trạng thái hiện tại, còn lịch sử nằm ở bảng quyết định cuối file. Nguồn: cuộc trò chuyện **Business
Analysis** và các yêu cầu của người dùng trong workspace này.

Tài liệu liên quan: [bản tổng hợp để lưu vào document](PROJECT_DOCUMENTATION.md) (snapshot xuất trước
các quyết định cuối ngày 02/10), [lịch sử tiến trình đến 30/09](PROJECT_STATUS_2026-09-30.md),
[research danh sách từ, chi phí, ràng buộc phát hành, giấy phép](DATA_COST_LICENSE_RESEARCH_2026-10-02.md),
[pattern nên biết để tái sử dụng và mở rộng](ARCHITECTURE_PATTERNS_RESEARCH_2026-10-02.md).

**Cách đọc nhãn:** **Chốt** = người dùng nêu rõ. **Đề xuất** = trợ lý đề xuất, chưa được chọn.
**Giả định** = ghi `ASSUMPTION` trong spec cho đến khi có xác nhận. **Mở** = chưa quyết định.

## Mục tiêu đã thống nhất

Trong khoảng **2–3 tháng**, xây một sản phẩm có thể public, vận hành với người dùng thật và thử nghiệm
khả năng tạo doanh thu. Chưa chốt ngày bắt đầu, ngày release hay mục tiêu số lượng người dùng/doanh
thu. **Chốt 02/10:** giữ mục tiêu thử doanh thu trong mốc này, nhưng đo willingness to pay ngay trong
pilot mà không cần billing thật; billing làm sau. Cách đo cụ thể chưa chốt.

Project đồng thời là môi trường học Backend/Production Engineering và AI Systems. Thành công cần được
thể hiện bằng sản phẩm đã ship, dữ liệu sử dụng, khả năng vận hành và việc hiểu các quyết định trong hệ
thống.

## Thứ tự ưu tiên

**Problem → target users → core loop → MVP → deploy → real users → telemetry → failures →
improvements → hardening và scale.**

Trước khi mở rộng architecture, làm rõ: ai dùng, vấn đề gì, hiện họ giải quyết ra sao, giá trị khác
biệt, vòng sử dụng chính và lý do quay lại. Có giả thuyết monetization sớm; mức đầu tư vào billing phụ
thuộc vào nhu cầu đã kiểm chứng.

Mỗi hạng mục phải giúp tìm người dùng, giữ người dùng, thử doanh thu, cải thiện độ tin cậy hoặc giải
quyết bottleneck đã đo được. Sau đó kiểm tra: cần làm ngay hay có thể đưa vào backlog?

## V1 hiện tại: đã chốt và còn mở

Đây là bảng tóm tắt hiện hành. Chi tiết và lý do nằm ở các file được link.

| Vùng | Chốt (người dùng) | Đề xuất hoặc giả định | Mở |
| --- | --- | --- | --- |
| Sản phẩm | App học từ vựng tiếng Anh theo level và chủ đề, có nhóm từ cá nhân, flashcard và bài thực hành AI. Điểm khác biệt muốn giữ: thực hành dùng từ đã chọn (các công cụ người dùng biết chủ yếu kiểm tra theo definition). Không muốn thu hẹp MVP, muốn một app hoàn chỉnh | Nhóm đầu tiên: sinh viên học tiếng Anh (là mẫu hiện có, chưa phải phân khúc đã xác nhận) | Problem cụ thể và retention chưa kiểm chứng |
| Nền tảng | Web Next.js và mobile Flutter trong V1; backend NestJS modular monolith + PostgreSQL | Cùng một backend cho hai client | Thứ tự làm giữa web và mobile; Android/iOS cụ thể |
| Nội dung | Level A1–C2; nhiều chủ đề (technology, marketing, business, food, daily life); nguồn **hybrid** (catalog chính trong DB, nguồn ngoài bổ sung hoặc tra cứu); metadata level từ **CEFR-J + Octanove C1/C2** (8.812 headword); người dùng **tự duyệt** nội dung | Gói pilot 300–500 từ; tự gán topic (CEFR-J không có technology/marketing/business) | Phiên bản CEFR-J (1.6 hay 1.5); nơi phát hành chính thức của Octanove; nghĩa Việt, ví dụ và topic phải biên soạn; provider API tra cứu ngoài; quy tắc nhập/duyệt |
| Schema | **Option D**: entry → sense → text theo language; tiến độ bám sense ID; tách ngôn ngữ học, ngôn ngữ giải thích và locale giao diện | Cột `entry_type` (V1 chỉ có `word`); level gắn ở entry/loại từ | Fallback khi thiếu bản dịch; sửa/xóa/retention |
| Loại mục và từ chức năng | Từ chức năng (`in`, `at`…) **giữ trong DB, ẩn khỏi bộ học mặc định** (cách B). Phrasal verb, collocation, idiom **không làm ở V1** | Một trường phân loại từ chức năng | Tên trường và quy tắc lọc cụ thể |
| Học và ôn | Flashcard ba trạng thái do người học chọn (chưa học, cần ôn tập, đã biết); thêm từ tùy chỉnh vào nhóm riêng; thêm các bài kiểm tra theo definition **không dùng AI** (trắc nghiệm, đúng/sai, tự luận) | Bài không AI làm phần Free; kết quả bài không tự đổi trạng thái thẻ | Chi tiết các dạng không AI, nhất là chấm tự luận thế nào khi không dùng AI |
| Bài thực hành AI | AI tạo bài **điền từ** vào câu; kết quả trả về **đúng/sai kèm giải thích vì sao dùng từ đó và bản dịch nguyên câu**; chấm tự động (so sánh lowercase, chấp nhận contraction ngữ pháp, không chấp nhận TY/GTG thay cụm đầy đủ). **Bài tự viết câu tạm thời chưa ở V1**; không có AI nhận xét/sửa câu | Sinh giải thích và bản dịch **cùng lúc với bài** (một lần gọi AI), chấm bằng rule nên nộp đáp án không tốn thêm lượt AI; lỗi AI là "chưa chấm được", không phải đáp án sai | Rubric và accepted forms của bài điền từ; model/provider AI; xử lý câu có nhiều đáp án hợp lý |
| Gói và quyền | **Free không dùng AI**; từ **trial 14 ngày** trở lên có AI; **Pro có mức dùng AI cao hơn trial**; trial do người dùng **tự kích hoạt khi cần**, kể cả trong pilot chưa có billing; billing làm sau | Quyền theo từng feature với nguồn cấp (trial, subscription, cấp tay); hạn mức tách khỏi quyền | **Số lượt AI của trial và Pro (người dùng sẽ tính sau)**; trial một lần mỗi tài khoản hay không; hết trial thì quay về Free; giá; nhà cung cấp thanh toán |
| Tài khoản | Đăng nhập lần đầu rồi giữ đăng nhập đến logout; **email + mật khẩu tự làm**; **OAuth 2.0 với Google**; **OTP gửi qua SMTP chỉ cho xác minh email và quên mật khẩu** (không dùng để đăng nhập); SMTP qua **Google** (đổi được nếu có vấn đề); **logout một thiết bị** (thiết bị nào đăng xuất thì chỉ thiết bị đó, một tài khoản vẫn đăng nhập nhiều thiết bị cùng lúc) | Bảng danh tính tách khỏi user; Argon2id; PKCE; Sign in with Apple khi ra iOS (Apple 4.8 yêu cầu khi có Google Sign-In) | Thời hạn hết hiệu lực và thu hồi phiên; xóa tài khoản và retention; điều kiện SMTP cho Gmail cá nhân |
| Chạy nền | **BullMQ worker chỉ cho việc nền thật** (soạn/import nội dung theo lô), dùng **từ gói nội dung pilot đầu tiên**, Redis chạy local bằng Docker. Luồng người dùng (tạo bài, chấm đáp án) gọi AI **trực tiếp trong request** | Việc nền cụ thể là **AI soạn nháp** nghĩa/ví dụ (đề xuất của trợ lý khi so phương án worker, bạn chọn phương án B nhưng chưa xác nhận riêng việc AI soạn; xem decision K1b trong `docs/specs`); khóa job lưu trong DB; vòng đời draft → reviewed → published | Thiết kế job: chống trùng, retry/backoff, giới hạn lượt gọi provider, chạy tiếp sau gián đoạn (cần Defense Analysis) |
| Hướng thiết kế | Quyết định theo hướng **reusable và scalable**, không chỉ vừa đủ cho V1; cần tài liệu pattern để tham khảo và áp dụng khi cần | Mỗi pattern tách phần chuẩn bị rẻ ở V1 và phần chỉ áp dụng khi có tín hiệu | Pattern nào thật sự áp dụng |
| Thực hiện và pilot | Làm một mình, khoảng 4–6 giờ/ngày (có thể 8); **xây và chạy local trước, chưa thu tiền thật**; deploy web trước nếu thủ tục store phức tạp, mobile vẫn xây để sẵn sàng; pilot kỳ vọng 10–30 người, không quá 50 | Chi phí chạy local gần như $0 | Kênh tuyển pilot; ngân sách bằng tiền; tiêu chí pilot và cách đo willingness to pay |
| Spec | Viết **hybrid**: một system spec mỏng + module spec cho 7 module V1 (xem *Điểm tiếp tục*). **Viết sau** | Hai lát: lát 1 không AI, lát 2 có AI | — |
| Sau V1 | V1.5: chatbot tra cứu từ vựng, RAG có điều kiện; phrasal verb/collocation/idiom; bài tự viết câu | — | Lịch thực hiện chưa có |

## Hướng architecture ban đầu

| Thành phần | Vai trò và phạm vi |
| --- | --- |
| NestJS modular monolith | Backend có ranh giới module rõ; mỗi module sở hữu logic và đường ghi dữ liệu của mình. 7 module V1: Identity & Access, Vocabulary Content, Learning, Content Pipeline, Entitlements & Usage, AI Integration, Practice. Billing Integration chỉ ghi giao diện. |
| PostgreSQL | Lưu dữ liệu bền vững; schema D đã chốt, chi tiết bảng còn là bản nháp ([V1_DATA_MODEL_DRAFT](V1_DATA_MODEL_DRAFT.md)). |
| Redis / BullMQ / workers | **Chốt:** worker chỉ cho việc nền thật (soạn/import nội dung theo lô) từ gói pilot đầu; luồng người dùng gọi AI trực tiếp, có timeout và operation ID. Chi tiết job còn mở. |
| Docker | Đóng gói ứng dụng, Postgres và Redis cho môi trường local và triển khai nhất quán. |
| Observability | Đo sử dụng và vận hành, log có ngữ cảnh, theo dõi lỗi và health phù hợp MVP. |
| CI/CD | Kiểm tra và triển khai thay đổi; có cách phát hiện release lỗi và khôi phục. Chưa thiết kế. |
| Managed infrastructure | Ưu tiên khi hợp lý về chi phí và công sức vận hành; provider chưa chọn. Trước mắt chạy local. |
| Web / mobile | Next.js và Flutter dùng chung API; hợp đồng API theo hướng tương thích client cũ. |
| AI services | Gọi qua một port/adapter để đổi provider được; chỉ còn việc sinh bài kèm giải thích và bản dịch, và soạn nháp nội dung. Chưa chọn provider. |
| Gửi email | OTP và thư hệ thống qua SMTP của Google; đặt sau port `Mailer` để đổi nhà cung cấp mà không đụng phần lõi. |

Đây là hướng khởi đầu, **chưa phải Architecture Spec đã chốt**. Chưa chọn hosting/provider, ngân sách,
chi tiết queue (tên queue, concurrency, retry policy) hoặc model AI.

**Nguyên tắc thiết kế đã nêu (02/10/2026):** mọi hướng cần xét khả năng thêm ngôn ngữ, nội dung, loại
mục, provider, gói, client và tăng tải qua các version sau; không hardcode ngôn ngữ giải thích vào cột
nội dung lõi; tách khả năng tiến hóa sản phẩm với scaling tải và chi phí. Người dùng muốn quyết định
**reusable và scalable**, chưa quen nhiều pattern, nên nhờ research và sẽ áp dụng khi cần. Research và
đề xuất không tự thành quyết định: chỉ lựa chọn được người dùng xác nhận mới ghi là đã chốt. V3/V4/V5
chưa có feature nào được nêu. Xem [các phương án toàn hệ thống](SYSTEM_EVOLUTION_OPTIONS_2026-10-02.md)
và [pattern nên biết](ARCHITECTURE_PATTERNS_RESEARCH_2026-10-02.md); chưa pattern nào được chọn áp dụng.

Kafka, Kubernetes và microservices chỉ được xem xét khi dữ liệu chỉ ra vấn đề cụ thể của giải pháp
hiện tại. ADR phải ghi vấn đề, bằng chứng, phương án thay thế, chi phí vận hành và trade-offs.

Public MVP cần các biện pháp bảo vệ dữ liệu, quyền truy cập, validation và recovery phù hợp với chức
năng thực tế. Sau release, ưu tiên hardening sâu hơn theo lỗi, rủi ro và telemetry: idempotency,
concurrency, retry/backoff, xử lý job thất bại, rate limiting, backup/restore, migrations và rollback.

## Checkpoint khi viết spec, ADR hoặc subsystem design

Chủ động nhắc: **“Decision này cần Defense Analysis trước khi chốt spec.”**

Bắt đầu bằng một vài câu hỏi/hint để người dùng tự reasoning, rồi kiểm tra các case còn thiếu. Khi
được yêu cầu phân tích đầy đủ, đi thẳng vào phân tích.

Checklist gồm: happy path; invariants; edge cases; failure modes; concurrency và race conditions;
idempotency và duplicate; partial failure; timeout và retry; security và abuse; observability; recovery
và rollback; alternatives và trade-offs.

Mỗi case cần có hành vi mong đợi, cách xử lý, cách phát hiện, cách khôi phục và bằng chứng kiểm chứng
phù hợp. Những phần chưa quyết định phải ghi rõ. Dùng [mẫu phân tích decision](DECISION_ANALYSIS_TEMPLATE.md)
khi bắt đầu một decision quan trọng; checkpoint này không tạo thêm bước xin phép.

Các decision hiện cần Defense Analysis trước khi chốt spec: thiết kế job của Content Pipeline, đăng
nhập và quên mật khẩu (OTP, giới hạn thử, phiên), quyền và hạn mức AI, chấm bài điền từ và xử lý lỗi
AI, idempotency của thao tác gửi đáp án.

## Bằng chứng cần tích lũy

- Product: người dùng thật, activation, sử dụng lặp lại/retention, feedback và thử nghiệm doanh thu.
- Engineering: deployment thực tế, CI/CD, quan sát lỗi, background processing, bảo vệ dữ liệu và recovery.
- Decisions: ADR/engineering journal ghi context, alternatives, decision, trade-offs, failure modes và evidence.
- Operations: postmortem khi có incident; benchmark trước/sau khi tối ưu; chi phí phục vụ người dùng khi đo được.

Ghi riêng **real traffic → production evidence** và **load test → capacity evidence**. Chưa có số liệu.

## Bằng chứng và nghiên cứu đã có

| Nội dung | Trạng thái |
| --- | --- |
| Khảo sát | Google Form 19 câu/6 phần. Ngày 30/09/2026 đọc bảng: 14 dòng, 13 có nội dung; trong 12 người đang học, 8 chọn khó duy trì đều đặn. Mẫu chủ yếu là sinh viên đại học, một số đang thực tập (người dùng xác nhận). Chất lượng dữ liệu và kênh tuyển cần xác minh; chưa xác nhận retention hoặc chi trả. Xem [phân tích sơ bộ](SURVEY_ANALYSIS_2026-09-30.md). |
| Cộng đồng | [Desk research ngày 30/09](COMMUNITY_RESEARCH_ENGLISH_AI_2026-09-30.md): quan sát trực tiếp đến từ Reddit, chưa kiểm chứng được Facebook/Threads. AI phổ thông là cách thay thế mạnh cho việc tạo/sửa câu. |
| Đối thủ | [So sánh ELSA, Speak, Duolingo Max, Loora, Praktika với AI chat phổ thông](COMPETITOR_ANALYSIS_AI_ENGLISH_APPS_2026-09-30.md): lợi thế công bố ở vòng luyện tích hợp, phát âm và theo dõi lỗi; chưa có bằng chứng kết quả/chi trả. Xem thêm [đánh giá V1 ngày 01/10](PRODUCT_DISCOVERY.md#18-đánh-giá-khả-quan-của-v1--01102026). |
| Phản hồi định tính | Một ý kiến giả định về tra cứu nhanh/đúng và danh sách/bài tập chuẩn bị sẵn ([ghi chép](QUALITATIVE_FEEDBACK_2026-09-30.md)); chưa chứng minh willingness to pay, không cộng vào mẫu khảo sát. |
| Công cụ luyện đặt câu (02/10) | Quizlet gỡ Q-Chat từ 06/2025, trang chính thức không nêu lý do; "Ask Quizlet" không có chế độ đặt câu; có app ngách viết câu + AI phản hồi, không nhắm người Việt. Xem [research](DATA_COST_LICENSE_RESEARCH_2026-10-02.md#2-công-cụ-luyện-đặt-câu-và-quizlet-q-chat). |
| Danh sách từ (đo 02/10) | CEFR-J (A1–B2) + Octanove (C1–C2) = 8.812 headword, chỉ có từ + loại từ + level; nhiều thuật ngữ chuyên ngành không có trong danh sách. Oxford 5000 không dùng vì chưa rõ quyền thương mại. Xem [research](DATA_COST_LICENSE_RESEARCH_2026-10-02.md#1-danh-sách-từ-vựng-a1c2--đo-tại-đây) và [nguồn dữ liệu 01/10](VOCABULARY_DATA_RESEARCH_2026-10-01.md). |
| Chi phí | Chạy local ~$0 (kể cả Redis bằng Docker); public ~$5–20/tháng hạ tầng + $25 Google Play + $99/năm Apple; AI pilot dưới $1–15/tháng tùy model (giả định token chưa đo). Chưa gồm Redis + worker trên server. Xem [research](DATA_COST_LICENSE_RESEARCH_2026-10-02.md#3-chi-phí). |
| Ràng buộc phát hành | Google Play: tài khoản cá nhân mới cần closed test ≥12 tester liên tục ≥14 ngày. Apple: mở khóa Pro phải dùng In-App Purchase (3.1.1); Google Sign-In đi kèm login bảo vệ riêng tư (4.8). Không có Mac: iOS chỉ build qua cloud và chạy qua TestFlight. Vercel Hobby chỉ phi thương mại. Xem [research](DATA_COST_LICENSE_RESEARCH_2026-10-02.md#4-ràng-buộc-phát-hành--tài-liệu-chính-thức). |
| Giấy phép dữ liệu và điều khoản | CEFR-J cần ghi nguồn; Octanove (CC BY-SA 4.0) cần ghi tác giả + giấy phép và điều khoản app không được cấm sao chép phần dữ liệu này. Store yêu cầu Privacy Policy và xóa tài khoản trong app; Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 hiệu lực từ 01/01/2026. Đề xuất: màn hình "Nguồn dữ liệu & giấy phép"; không sửa trực tiếp dòng Octanove mà thêm level biên tập riêng. Chưa soạn ToS/Privacy Policy. Xem [research](DATA_COST_LICENSE_RESEARCH_2026-10-02.md#5-giấy-phép-dữ-liệu-và-điều-khoản-người-dùng). |
| Pattern (02/10) | [Danh mục pattern, nguồn chính thức](ARCHITECTURE_PATTERNS_RESEARCH_2026-10-02.md): loại mục mở rộng, dạng bài, gọi AI, quyền và hạn mức, đăng nhập (có lưu ý NIST về OTP qua email, đăng nhập mobile, SMTP), job nền, API/client, lịch ôn. Chỗ còn thiếu nằm ở mục 9 của file. |
| Network các trang từ điển | [Quan sát](NETWORK_INSPECTION_2026-10-02.md) và [tổng hợp session](DICTIONARY_API_SESSION_SUMMARY_2026-10-02.md): bài học tải theo nhóm nhỏ, gợi ý khi gõ, asset cache theo version; không suy ra backend nội bộ, không thêm audio. [Bản giải thích cho người mới](SYSTEM_DESIGN_BEGINNER_GUIDE_2026-10-02.md). |
| Bản nháp thiết kế | [Schema](V1_DATA_MODEL_DRAFT.md), [rubric chấm](V1_GRADING_RULES_DRAFT.md) (phần câu mở giữ để dùng sau), [user flow](V1_USER_FLOW_DRAFT.md), [kế hoạch V1](V1_IMPLEMENTATION_PLAN.md). Đều là đề xuất, không phải spec đã accepted. |
| Product Spec / Architecture Spec / ADR | **Chưa có.** Phạm vi spec đã chốt (hybrid, 7 module), viết sau. |
| Implementation và production | **Chưa bắt đầu**: `english-learning` chỉ có `docs/`, chưa có git repo hay code. Project chưa được thêm vào `projects/` của harness (người dùng sẽ tự thêm). Chạy local trước, chưa thu tiền thật. |
| Chưa có bằng chứng | Retention, willingness to pay, hiệu quả học, độ chính xác chấm bài, chi phí AI thực tế, capacity/traffic. |

## Điểm tiếp tục

**Bước kế tiếp: viết spec theo hướng hybrid.** Một system spec mỏng + module spec cho **7 module V1**.
Skill `write-spec` chạy trong plan mode với một gate duy nhất là duyệt plan.

- **System spec** (xuyên module): phạm vi V1 và phần chưa làm; định danh (user ID, sense ID,
  operation ID); ngôn ngữ học, ngôn ngữ giải thích, locale giao diện; snapshot và version của bài;
  quyền tách khỏi hạn mức; quy ước lỗi, phân trang, tương thích client web và mobile.
- **Module spec:** Identity & Access, Vocabulary Content, Learning, Content Pipeline (mới, do chọn
  worker), Entitlements & Usage, AI Integration, Practice. Billing chỉ ghi giao diện.
- **Thứ tự:** system spec và Content trước (Practice quyết định schema), rồi **lát 1 không AI**
  (Identity, Content, Learning, Content Pipeline), sau đó **lát 2 có AI** (Entitlements, AI Integration,
  Practice).
- **Không có hệ thống tham chiếu để quan sát:** mỗi tiêu chí trích từ quyết định đã xác nhận hoặc
  research; chỗ chưa có nguồn đánh dấu `ASSUMPTION`. Các chỗ đã biết sẽ là `ASSUMPTION`: số lượt AI
  của trial và Pro, trial một lần hay không, hết trial thì quay về Free, thời hạn và thu hồi phiên.
- **Đã chốt (04/10):** [các quyết định cho spec](../specs/DECISIONS_2026-10-04.md); phương án và lý do ở
  [file kế hoạch](../specs/SPEC_PLAN_AND_DECISIONS_2026-10-04.md). Còn hoãn: hạn mức AI (K18). Chiều 04/10 V1 được mở rộng (K19–K25): thêm nhanh từ gặp phải, chuỗi tra nghĩa, lịch ôn tự động, dồn bài vào từ yếu, bài điền từ từ câu của người học; không có nhắc học. Spec ghi vào `docs/specs/`, dữ liệu chạy ở `docs/tasks/v1-specs/`; project chưa nằm trong
  `projects/` của harness nên áp quy tắc đường dẫn mặc định, không commit vì chưa có git repo.

**Song song hoặc sau spec:** vertical slice không AI chạy local (đăng nhập → chọn/thêm từ → nhóm →
flashcard → lưu và mở lại); chọn gói nội dung pilot nhỏ (đề xuất 300–500 từ) từ CEFR-J + Octanove, tự
gán topic và tự duyệt nghĩa/ví dụ qua BullMQ worker; dựng màn hình ghi nguồn dữ liệu; thêm quyền và
hạn mức AI trước khi gọi AI thật. Trước import: chọn phiên bản CEFR-J và xác minh nơi phát hành
Octanove. Sau đó pilot với 10–30 người, đo vòng học, chất lượng bài, chi phí AI và willingness to pay.

**Còn mở, không chặn việc viết spec:** thời hạn hết hiệu lực và thu hồi phiên (trợ lý sẽ đề xuất trong
spec Identity); số lượt AI và trial; chi tiết các bài không AI; kênh tuyển pilot và tiêu chí pilot.

Khảo sát, phản hồi định tính, nghiên cứu cộng đồng và so sánh đối thủ là dữ liệu đầu vào và giới hạn
của giả thuyết; chúng chưa chứng minh retention, hiệu quả học hoặc willingness to pay. Tiếp tục thu
thập bằng chứng khi V1 có người dùng. V1.5 (chatbot/RAG) làm theo nhu cầu và điều kiện dữ liệu; không
mặc định đưa RAG vào V1.

## Quyết định product đã ghi nhận

| Ngày | Quyết định | Ý nghĩa cho bước tiếp theo |
| --- | --- | --- |
| 29/09/2026 | Xem lại ý tưởng sản phẩm. | Bắt đầu từ người dùng và problem; app học từ vựng chỉ là ý tưởng trong lịch sử, chưa được chọn. |
| 30/09/2026 | Chuẩn bị triển khai V1 của hướng app từ vựng/flashcard/thực hành AI; bỏ mốc phát triển trung gian đã đề xuất. | Khóa phạm vi và user flow V1, không đưa tính năng của mốc mở rộng vào backlog. |
| 01/10/2026 | Bỏ AI góp ý/sửa câu trong V1; chọn bài điền từ và tự viết câu, nhập đáp án rồi chấm đúng/sai tự động. | Cụ thể hóa quy tắc chấm. **Sau đó bị thu hẹp ngày 02/10:** tự viết câu tạm chưa ở V1. |
| 01/10/2026 | Xác nhận nền V1 là bộ từ theo level/chủ đề; yêu cầu research nguồn. Bổ sung lại V1.5 với chatbot tra từ và RAG có điều kiện. | Không khôi phục những feature V1.5 cũ. |
| 02/10/2026 | Qua sáu annotations: web Next.js + mobile Flutter; level A1–C2, nhiều chủ đề; login lần đầu, giữ đăng nhập đến logout; lowercase và contraction ngữ pháp; Free/Pro, Pro có AI, trial 14 ngày. | Cơ sở của V1; các chi tiết còn mở ở thời điểm đó được chốt ở các dòng dưới. |
| 02/10/2026 | Yêu cầu thiết kế có thể tiến hóa qua version sau, research thực hành hệ thống lớn và so sánh trade-offs toàn hệ thống; chỉ hướng triển khai, chưa chốt. | Schema tránh cột nghĩa cố định theo ngôn ngữ; thêm module/contracts/migration/capacity options và nguyên tắc proposed/accepted. |
| 02/10/2026 | Chọn **hybrid cho nguồn từ vựng**: catalog chính trong DB tồn tại độc lập flashcard, nguồn/API ngoài bổ sung hoặc tra cứu khi cần. | Chưa chọn provider ngoài, cơ chế nhập/duyệt, điều kiện gọi ngoài. V1.5 vẫn có điều kiện. |
| 02/10/2026 | Yêu cầu tổng hợp toàn bộ file context để lưu vào document dự án. | Tạo [bản tổng hợp](PROJECT_DOCUMENTATION.md) và gói ZIP tại thời điểm xuất; snapshot, không cập nhật theo các quyết định sau. |
| 02/10/2026 | Phản hồi rà rủi ro: giữ điểm khác biệt là thực hành dùng từ đã chọn; thêm kiểm tra theo definition không cần AI; tạm chưa đưa lại góp ý/sửa câu; không thu hẹp MVP; muốn kiến trúc theo hướng scale up. | Research nguồn C1–C2, Q-Chat, chi phí và giấy phép ở [research 02/10](DATA_COST_LICENSE_RESEARCH_2026-10-02.md). |
| 02/10/2026 | Giới hạn thực hiện: làm một mình, 4–6 giờ/ngày (có thể 8); xây và chạy local trước, chưa thu tiền thật; deploy web trước nếu thủ tục store phức tạp, mobile vẫn xây; tự duyệt nội dung; pilot 10–30 người, không quá 50. | Chưa cần hosting, phí store hay thanh toán ở giai đoạn local. iOS chưa chạy thật được cho đến khi có tài khoản Apple Developer. |
| 02/10/2026 | **Phương án B cho worker**: BullMQ chỉ cho việc nền thật (soạn/import nội dung theo lô); tạo bài và chấm đáp án của người dùng gọi AI trực tiếp. Đã so với A (không worker, dùng script) và C (mọi lần gọi AI qua queue). | Cần Redis cho phần import. Xem lại để chuyển luồng người dùng sang queue nếu đo thấy chờ quá lâu, provider trả 429 thường xuyên, hoặc muốn tạo bài trước. |
| 02/10/2026 | Chốt nguồn metadata level **CEFR-J + Octanove**; **dùng worker ngay từ gói pilot đầu**; **giữ mục tiêu thử doanh thu**, đo willingness to pay trong pilot không cần billing. | Trước import: chọn phiên bản CEFR-J và xác minh nơi phát hành Octanove. Cách đo willingness to pay và tiêu chí pilot chưa chốt. |
| 02/10/2026 | Chọn phạm vi spec **hybrid**: một system spec mỏng + module spec cho 7 module V1; billing chỉ ghi giao diện. | Viết sau; hai lát; xem *Điểm tiếp tục*. |
| 02/10/2026 | Chốt bốn điểm còn mở: **schema D**; **đăng nhập** email + mật khẩu tự làm và Google OAuth 2.0, kèm OTP qua SMTP; **từ chức năng cách B**; **AI theo bậc** (Free không AI, từ trial trở lên có AI, Pro hạn mức cao hơn trial). Thêm: phrasal verb, collocation, idiom để sau V1; quyết định hướng reusable/scalable, cần tài liệu pattern. | Content cần trường loại mục và trường phân loại từ chức năng; Entitlements cần quyền theo feature với nguồn cấp; Identity cần bảng danh tính tách khỏi user. |
| 02/10/2026 | Làm rõ cuối ngày: OTP **chỉ** cho xác minh email và quên mật khẩu (bỏ OTP để đăng nhập); kết quả bài điền từ trả **đúng/sai kèm giải thích và bản dịch nguyên câu**; trial do người dùng **tự kích hoạt khi cần**, không cần billing. | OTP nằm trong ngoại lệ của NIST (xem pattern research mục 5). Trial không còn phụ thuộc billing nên pilot dùng được AI. |
| 02/10/2026 | Chốt tiếp cuối ngày: **bài tự viết câu tạm thời chưa ở V1**; **logout một thiết bị**; nhà cung cấp SMTP là **Google** (đổi được nếu có vấn đề); **số lượt AI của trial/Pro và trial một lần hay không sẽ tính sau**. | Practice chỉ còn bài điền từ; rubric câu mở giữ để dùng sau. Spec đánh dấu `ASSUMPTION` ở các mục tính sau. |

Khi có dữ kiện mới, cập nhật trạng thái và quyết định trong các file hiện tại. Các thông tin cá nhân từ
cuộc trò chuyện cũ không thuộc context project này.
