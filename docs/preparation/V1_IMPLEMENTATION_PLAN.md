# Chuẩn bị triển khai V1 — cập nhật 02/10/2026

**Trạng thái:** baseline để bắt đầu làm việc, chưa phải Product Spec đã chốt. V1 có nền là bộ từ vựng theo level và chủ đề. Ngày 01/10/2026, người dùng bổ sung lại V1.5 với chatbot tra cứu và RAG có điều kiện; phạm vi này ở phần riêng bên dưới. Chưa có code ứng dụng trong workspace.

**Bổ sung đã xác nhận ngày 02/10:** cả Next.js web và Flutter mobile; level
A1–C2 với nhiều chủ đề; đăng nhập lần đầu và giữ đăng nhập đến logout; Free/Pro,
Pro có AI và trial 14 ngày; nguồn từ theo hướng hybrid. Provider, cách auth và quyền trial chưa chốt; Free AI
đang cân nhắc. [Schema nháp](V1_DATA_MODEL_DRAFT.md) và [rubric chấm nháp](V1_GRADING_RULES_DRAFT.md)
được viết để user rà, không phải quyết định đã accepted.

**Đồng bộ sau rà rủi ro ngày 02/10** (chi tiết ở [PROJECT_CONTEXT](PROJECT_CONTEXT.md) và
[research 02/10](DATA_COST_LICENSE_RESEARCH_2026-10-02.md)): nguồn metadata level chốt
CEFR-J + Octanove C1/C2; người dùng tự duyệt nội dung; làm một mình khoảng 4–6
giờ/ngày; xây và chạy local trước; deploy web trước nếu thủ tục store phức tạp,
mobile vẫn xây; BullMQ worker cho việc soạn nội dung ngay từ gói đầu, luồng người
dùng gọi AI trực tiếp; willingness to pay đo trong pilot, billing làm sau.

**Chốt thêm cuối ngày 02/10:** schema D; đăng nhập bằng email + mật khẩu tự làm, Google OAuth 2.0 và OTP qua SMTP; từ chức năng giữ trong DB, ẩn khỏi bộ học mặc định; Free không AI, từ trial trở lên có AI, Pro hạn mức cao hơn trial; phrasal verb, collocation, idiom để sau V1. Quyết định theo hướng reusable/scalable; pattern nên biết ở [pattern research](ARCHITECTURE_PATTERNS_RESEARCH_2026-10-02.md). Chi tiết trong [PROJECT_CONTEXT](PROJECT_CONTEXT.md).

**Rà thêm theo yêu cầu ngày 02/10:** [các hướng tiến hóa/scaling và trade-offs](SYSTEM_EVOLUTION_OPTIONS_2026-10-02.md)
đã được ghi cho toàn hệ thống. Schema vừa viết lại theo đa ngôn ngữ; các option
C/D và module/API/AI/entitlement/jobs/migration vẫn proposed. V1 cần chuẩn bị
boundary theo domain, không tự triển khai feature V3/V4/V5 chưa biết.

## Giá trị cần kiểm chứng

Giả thuyết: người học muốn tìm và gom từ phù hợp mục tiêu, ôn nhanh khi rảnh, rồi thử dùng chính các từ ấy trong một tình huống thay vì chỉ đọc nghĩa hoặc tự tổ chức nhiều công cụ. Mẫu khảo sát hiện chủ yếu là sinh viên; chưa chứng minh nhóm này sẽ dùng lặp lại hoặc trả tiền. V1 cần cho phép quan sát vòng sử dụng thật trước khi mở rộng.

## Phạm vi chức năng đang đề xuất

| Phần | Có trong baseline V1 | Giới hạn cần giữ |
| --- | --- | --- |
| Nguồn từ | Bộ từ theo A1–C2 và nhiều chủ đề như technology, marketing, business, food, daily life; thêm custom vào nhóm cá nhân. **Đã chọn hybrid:** catalog chính trong DB, độc lập flashcard; nguồn/API ngoài bổ sung hoặc tra cứu khi cần. | Metadata level chốt CEFR-J (A1–B2) + Octanove (C1–C2), tổng 8.812 headword ([research 02/10](DATA_COST_LICENSE_RESEARCH_2026-10-02.md)); phiên bản CEFR-J, nghĩa Việt/ví dụ/topic, độ phủ release, provider tra cứu ngoài và quy tắc nhập/duyệt/gọi ngoài chưa chốt. |
| Thẻ ôn | Xem nghĩa và ví dụ ngắn; người học tự gán “chưa học”, “cần ôn tập”, “đã biết”. | Không tự chuyển trạng thái thẻ chỉ vì một bài được chấm đúng. |
| Thực hành AI | Chọn nhóm từ → AI tạo bài điền từ hoặc tự viết câu dùng từ → người học nhập đáp án → app chấm đúng/sai tự động. | Không cần AI nhận xét/sửa câu; quy tắc chấm biến thể và câu mở cần cụ thể hóa. Chưa gồm hội thoại nhiều lượt hoặc voice. **Cập nhật cuối ngày 02/10:** chỉ còn bài điền từ (kèm giải thích và bản dịch); tự viết câu tạm thời chưa ở V1. |
| Quay lại | Lưu nhóm từ và trạng thái thẻ để mở lại; việc lưu lịch sử đáp án cần xác định theo nhu cầu pilot. | Chưa cần điểm năng lực phức tạp, streak hay lịch ôn thích ứng. |
| Nền tảng / tài khoản | Next.js web và Flutter mobile; login lần đầu và giữ đăng nhập đến logout. Đề xuất cùng backend và dữ liệu theo tài khoản. | Auth provider, expiry/revocation/logout qua thiết bị còn cần spec; chưa thiết kế học offline. |
| Gói / AI | Free/Pro; Pro có AI; trial 14 ngày. | Free AI đang cân nhắc; trial có quyền gì, bắt đầu khi nào, quota/giá và billing chưa chốt. Pro không mặc định AI vô hạn. |

Luồng tối thiểu để kiểm tra V1: **đăng nhập lần đầu → chọn/thêm từ → ôn thẻ → AI tạo bài khi có quyền → nhập đáp án → xem đúng/sai → quay lại ôn**. Tra cứu ngữ pháp độc lập và giải thích câu dài thuộc đề xuất cũ ở mục 14 của Product Discovery; chưa đưa vào baseline này vì hướng mới tập trung vào nhóm từ vựng.

## Thứ tự xây dựng

1. **Khóa user flow và phạm vi:** rà [user flow](V1_USER_FLOW_DRAFT.md), [schema custom/DB](V1_DATA_MODEL_DRAFT.md) và [rubric](V1_GRADING_RULES_DRAFT.md); hai nền tảng đã chọn, còn thứ tự implementation và phương thức auth. Chốt nguồn/tập nội dung nhỏ, quyền AI và quy tắc chấm.
2. **Vertical slice không AI:** login, tìm/chọn hoặc thêm từ, tạo nhóm, xem thẻ, đổi trạng thái, lưu và mở lại cùng tài khoản. Dùng chung API/schema cho hai client; chạy local trước. Thứ tự làm UI giữa web và mobile chưa chốt; deploy web trước nếu thủ tục store phức tạp.
3. **Thêm một lượt luyện AI:** làm bài điền từ/rules trước, rồi tự viết câu/rubric trong cùng V1. Trước gọi AI thật cần entitlement/quota cho Pro/trial và Free nếu cho AI. Đặt giới hạn input/output/cost; lỗi tạo/chấm không làm mất dữ liệu và không biến thành đáp án sai.
4. **Pilot với người học thật:** quan sát họ tự hoàn thành vòng học và tự quay lại. Đo bước bỏ dở, chất lượng phản hồi, thời gian chờ và chi phí mỗi lượt; so với cách họ dùng AI chat/flashcard hiện nay.
5. **Public V1:** thêm bảo vệ dữ liệu và quyền truy cập phù hợp cách lưu đã chọn, validation, theo dõi lỗi, khả năng khôi phục, CI/CD và triển khai tối giản. Redis/BullMQ worker đã có từ giai đoạn soạn nội dung (người dùng chọn 02/10); khi public cần quyết định job import chạy local hay trên server. Luồng người dùng chỉ chuyển sang queue khi đo thấy cần.

Song song bước 1–3: **soạn nội dung pilot qua BullMQ worker** (Redis local) — AI soạn nháp nghĩa/ví dụ cho gói pilot, người dùng tự duyệt, chỉ publish mục đã duyệt. Thiết kế job cần Defense Analysis (chống trùng, retry/backoff, giới hạn lượt gọi provider, chạy tiếp sau gián đoạn).

## Hoàn thành V1 nghĩa là gì

Một người dùng mới đăng nhập, tự chọn/thêm từ, hoàn tất flashcard, luyện AI khi có quyền, thấy đúng/sai theo rubric và quay lại thấy dữ liệu tài khoản. V1 gồm web Next.js và mobile Flutter; phạm vi Android/iOS và thứ tự release chưa chốt. Chủ dự án thấy số người bắt đầu/hoàn thành/quay lại, lỗi và chi phí AI, có cách khôi phục release lỗi. Chưa đặt ngưỡng thành công định lượng vì chưa có baseline thật.

## Các lựa chọn cần khóa trước khi viết spec/đặt code

- **Nền tảng:** đã chọn cả Next.js web và Flutter mobile; thứ tự làm và Android/iOS cần xác định theo thời gian thực tế, không tự bỏ một nền tảng khỏi V1.
- **Nguồn từ ban đầu:** phạm vi A1–C2/nhiều chủ đề đã được nêu; metadata level chốt CEFR-J + Octanove ngày 02/10 ([research 02/10](DATA_COST_LICENSE_RESEARCH_2026-10-02.md)); người dùng tự duyệt nội dung. Phiên bản CEFR-J, nguồn phát hành Octanove, tập nội dung publish và topic còn mở; không tự hứa catalog toàn diện.
- **AI V1:** người dùng đã chọn bài điền từ và tự viết câu, đều chấm đúng/sai tự động, không yêu cầu AI nhận xét/sửa câu. Cần chốt quy tắc chấm biến thể và câu hợp lệ khác nhau; pilot phải kiểm tra tình huống chấm nhầm.
- **Tài khoản và dữ liệu:** login lần đầu/giữ đăng nhập đã chốt về trải nghiệm; rà schema, chọn auth và behavior expiry/revocation, quyền sửa/xóa, retention/backup. Đồng bộ qua backend là đề xuất, chưa có offline flow.
- **Gói/trial:** Free/Pro và trial 14 ngày đã chốt hướng; Đã chốt 02/10: Free không AI, trial do người dùng tự kích hoạt khi cần. Còn mở: quota, giá, cách thu phí/auto-charge, trial một lần hay không. Login không đặt lại trial. Ngày 02/10: billing làm sau; willingness to pay đo trong pilot không cần billing thật; trial không cần billing (sửa cuối ngày 02/10).
- **Giới hạn pilot:** người dùng làm một mình, khả năng 4–6 giờ/ngày (có thể 8); pilot kỳ vọng 10–30 người, không quá 50; kênh tuyển và ngân sách bằng tiền chưa chốt; không tự đặt cam kết release.

**Decision này cần Defense Analysis trước khi chốt spec.** Khi cụ thể hóa tạo bài, chấm đúng/sai và lưu dữ liệu, trước tiên tự trả lời: Nếu bài AI có nhiều đáp án hợp lý thì app chấm thế nào? Nếu gửi đáp án hai lần thì kết quả nào được lưu? Kết quả chấm có nên thay đổi trạng thái thẻ do người học chọn không? Sau đó dùng [mẫu decision analysis](DECISION_ANALYSIS_TEMPLATE.md) để kiểm tra các case còn thiếu ở mức phù hợp.

## Readiness trước triển khai — rà ngày 02/10/2026

**Kết luận rà:** đã đủ context về hướng sản phẩm, tính năng chính, luồng học và giới hạn V1 để viết Product Spec ngắn. Chưa đủ chi tiết hành vi/dữ liệu để triển khai V1 hoàn chỉnh một cách nhất quán. Không cần mở thêm vòng discovery lớn để bắt đầu; những giả thuyết về retention/chi trả tiếp tục kiểm chứng qua pilot.

| Quyết định còn mở | Cần khóa gì | Thời điểm cần |
| --- | --- | --- |
| Nền tảng | Next.js + Flutter đã chọn; thứ tự implementation, Android/iOS còn mở. | Trước scaffold client và lập lịch làm. |
| Bộ từ đầu tiên | A1–C2/nhiều chủ đề đã nêu; metadata chốt CEFR-J + Octanove, người dùng tự duyệt (02/10). Số lượng release, phiên bản CEFR-J, nghĩa/ví dụ và topic còn mở. | Trước import/publish nội dung thật; mẫu tự biên soạn có thể dùng prototype. |
| Tài khoản và dữ liệu cá nhân | Login lần đầu/giữ đăng nhập đã chọn; schema custom và shared account DB là đề xuất; auth, expiry/revocation, quyền sửa/xóa/retention cần chốt. | Trước phần lưu nhóm/trạng thái; access control từ khi có dữ liệu riêng. |
| Chấm bài | Lowercase/contraction/no TY-GTG đã chọn; rubric nghĩa/ngữ pháp mục tiêu, dung sai typo/lỗi nhỏ, accepted forms và cách xử lý chấm nhầm còn draft. | Trước chấm bài; đánh giá model/rubric trước pilot câu mở. **Cập nhật cuối ngày 02/10:** rubric câu tự viết chưa cần cho V1 vì bài tự viết câu tạm chưa làm; còn bài điền từ. |
| Gói/trial | Free/Pro, Pro AI, trial 14 ngày đã chọn; Đã chốt 02/10: Free không AI, trial do người dùng tự kích hoạt. Còn mở: quota/giá/auto-charge. | Quyền/quota trước gọi AI thật; billing trước nhận tiền hoặc tự thu phí. |
| Giới hạn thực hiện | Thời gian làm đã có (4–6 giờ/ngày, một mình); quy mô pilot kỳ vọng 10–30 người. Còn ngân sách AI/hạ tầng bằng tiền, hạn mức pilot và kênh tuyển người dùng thử. | Nền tảng/thời gian đủ để lập thứ tự công việc; quota/provider trước gọi AI thật; hạ tầng/pilot trước public. |

**Công việc trợ lý có thể tiếp tục từ context đã có:** gom Product Spec V1 ngắn cùng tiêu chí nghiệm thu; đề xuất quy tắc hành vi cho các mục mở, làm Defense Analysis đúng phần cần thiết; từ đó suy ra data model/module/API và chia các lát triển khai nhỏ. Lựa chọn thuộc ý định sản phẩm và chi phí của người dùng phải được ghi rõ, không âm thầm coi là đã đồng ý. Các quy tắc kỹ thuật thông thường có thể được đề xuất/thiết kế mà không biến mọi chi tiết thành câu hỏi xin phép.

**Trước public:** phải có nội dung được phép sử dụng, kiểm tra quyền truy cập dữ liệu riêng, validation, giới hạn tác vụ trả phí, khả năng theo dõi lỗi/chi phí và backup/restore phù hợp. Hosting, credential và release checks có thể chuẩn bị trong quá trình xây; chưa cần đầy đủ để bắt đầu một prototype.

**Có thể để sau bước bắt đầu V1:** schema response/RAG của V1.5, catalog toàn diện, điểm/streak hoặc scale. Giá cuối/billing có thể làm sau prototype, nhưng quyền/quota phải có trước AI thật và billing phải được chốt trước nhận tiền/auto-charge. Việc đo nhu cầu trả tiền vẫn thuộc pilot.

## Khả năng tiến hóa cần rà cùng spec V1

Đây là **hướng đề xuất, chưa chốt cách triển khai**. So sánh options và giữ
chi phí V1 trước khi scaffold, không đồng nhất “để scale sau” với bỏ qua model:

- Nội dung: entry/sense/text theo language hoặc item+text ít bảng hơn; stable
  ID, private ownership, provenance/review, ngôn ngữ học/giải thích/UI tách nhau.
- Modules: sở hữu đường ghi rõ trong modular monolith; contract không expose
  toàn bộ ORM; cross-module joins/transactions ghi dependency và chi phí tách.
- Web/mobile: API DTO/OpenAPI có compatibility policy, payload/rubric/content
  version; product version không tự là API major version.
- AI/plan: adapter/capability, normalization theo ngôn ngữ đang học; entitlement
  theo feature + atomic usage/reservation, không cờ Pro chung rải toàn app.
- Vận hành: operation ID/recovery, pagination/query/pool budget, snapshot và
  expand/backfill/contract; nếu có critical async thì cần durable handoff,
  idempotent consumer, không chỉ in-memory event.

Cache, replica, partition, retrieval engine, offline sync hoặc tách service
theo need/measurement; không lấy V3/V4/V5 làm lý do tự thêm Kafka/K8s. Mỗi
decision ghi option/cost/failure/migration, phần làm V1, điều kiện đổi hướng
và status. Chưa có benchmark/capacity claim hoặc feature tương lai accepted.

## V1.5 — chatbot tra cứu từ vựng, có điều kiện

**Người dùng yêu cầu bổ sung ngày 01/10/2026:** có thể triển khai RAG sớm khi người học cần tra cứu từ vựng bằng chatbot AI. Response sơ bộ có giải thích, definition, nghĩa và ví dụ; **format sẽ chốt sau**. Chưa đặt lịch thực hiện và không khôi phục những tính năng hội thoại nhiều lượt/voice từng đề xuất trước đây.

Đề xuất bắt đầu bằng lookup từ/nghĩa trong DB và AI trình bày theo format; thử retrieval theo ngữ nghĩa nếu câu hỏi theo ngữ cảnh cần nó. Chọn keyword/vector/hybrid sau khi đo chất lượng, không mặc định cần vector database riêng. Điều kiện thực hiện: có nhu cầu người dùng, dữ liệu đủ tốt và có quyền dùng với AI, quy tắc chọn nghĩa/không tìm thấy, giới hạn chi phí và format đủ rõ. Xem [ghi chú RAG và nguồn dữ liệu](VOCABULARY_DATA_RESEARCH_2026-10-01.md).
