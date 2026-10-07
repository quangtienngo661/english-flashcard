# Nguồn dữ liệu từ vựng cho V1 và hướng chatbot V1.5

Ngày nghiên cứu: **01/10/2026**. Phạm vi: tài liệu chính thức về dữ liệu/API, quyền sử dụng và độ phù hợp với app từ vựng theo level/chủ đề. Chưa lựa chọn nhà cung cấp, chưa import dữ liệu vào DB, chưa đo chất lượng hoặc chi phí production.

**Cập nhật 02/10/2026:** người dùng đã chọn hướng **hybrid**: catalog chính
trong DB app kết hợp nguồn ngoài. Đề xuất ngày 01/10 bên dưới là lịch sử research;
nguồn cụ thể và cơ chế nhập/duyệt/tra cứu chưa chốt.

## Kết luận đề xuất

**V1 nên đọc bộ từ đã duyệt từ PostgreSQL của app.** Dùng một nguồn dữ liệu được phép tái sử dụng làm nền, rồi bổ sung nội dung phục vụ người học. API bên ngoài có thể hỗ trợ nhập/enrich dữ liệu nếu điều khoản cho phép, hoặc làm tra cứu bổ sung; không nên là phụ thuộc bắt buộc cho mọi lần mở flashcard/danh sách.

Đây là **đề xuất của trợ lý, chưa được người dùng chốt**. “DB của mình” không có nghĩa phải tự gõ mọi từ, và cũng không có nghĩa sở hữu bản quyền dữ liệu đã nhập. Quyền dùng thương mại, lưu, chỉnh sửa, tái phân phối và dùng với AI phải xét theo từng nguồn/loại tài sản.

Người dùng xác nhận V1 có nền là bộ từ vựng theo level và chủ đề, tiếp tục có flashcard và bài tập AI theo phạm vi hiện tại. Người dùng bổ sung V1.5: chatbot tra cứu từ vựng, có thể triển khai RAG sớm nếu người học cần; response dự kiến có giải thích, definition, nghĩa và ví dụ, **format chốt sau**. Điều này thay thế yêu cầu bỏ toàn bộ mốc V1.5 trước đó, không khôi phục các tính năng hội thoại/voice từng đề xuất.

## API tra từ và bộ từ học khác nhau ở đâu

V1 cần hai lớp dữ liệu:

- **Nội dung từ điển:** từ/cụm từ, loại từ, từng nghĩa, định nghĩa, nghĩa tiếng Việt, ví dụ; phát âm nếu sau này có trong phạm vi.
- **Tổ chức học:** level, chủ đề, nhóm từ, mục đã chọn và trạng thái flashcard của từng người.

API lookup chỉ trả nội dung một entry chưa chắc cung cấp lớp tổ chức học. Dữ liệu level/chủ đề cũng chưa chắc có định nghĩa hoặc dịch. Cần phối hợp nguồn và biên tập, không coi một trường `definition` là bộ dữ liệu đầy đủ cho sản phẩm.

**Level cần giữ ngữ cảnh của nguồn.** English Vocabulary Profile phân biệt level của cả các nghĩa khác nhau; do đó không nên mặc định mọi nghĩa của một từ có cùng level. Đây là gợi ý cho cách tổ chức nội dung, không phải quyết định schema. Nguồn EVP công khai không cho phép dùng thương mại; trang contact hiện cũng nói không cấp phép dữ liệu EVP/EGP cho mục đích thương mại. [EVP](https://englishprofile.org/?menu=english-vocabulary-profile), [điều kiện cấp phép](https://englishprofile.org/?menu=contact-us).

## Các nguồn đã kiểm tra

| Nguồn | Cung cấp gì hữu ích | Giới hạn cần tính | Đánh giá cho V1 |
| --- | --- | --- | --- |
| **CEFR-J Wordlist 1.6** | 7.801 mục phân biệt theo loại từ, A1–B2; một phần phân loại chủ đề, nhất là danh từ. Nguồn chính thức cho phép dùng thương mại và chỉnh sửa với ghi nguồn phù hợp. | Là danh sách học, không phải từ điển Anh–Việt hoàn chỉnh; level không chi tiết tới mọi nghĩa. | **Ưu tiên thử làm nền metadata** cho DB. [Nguồn chính thức](https://www.cefr-j.org/download.html#cefrj_wordlist). |
| **Wiktionary qua Wiktextract/Kaikki** | Dữ liệu download được, có nghĩa, loại từ, biến thể, thông tin dịch và ví dụ khi có. Có dữ liệu từ bản Wiktionary tiếng Việt. | Không thấy trường CEFR trong mô tả đã đọc; chủ đề không mặc định trùng bộ chủ đề học của app. Độ đủ và chất lượng phải kiểm tra. Dữ liệu mở có nghĩa vụ ghi nguồn/share-alike; audio/hình cần kiểm tra riêng. | Có thể dùng làm nguồn import bổ sung nếu chấp nhận điều kiện của nội dung. [Wiktextract](https://github.com/tatuylonen/wiktextract), [Kaikki downloads](https://kaikki.org/dictionary/rawdata.html), [Wiktionary copyrights](https://en.wiktionary.org/wiki/Wiktionary:Copyrights). |
| **Free Dictionary API — dictionaryapi.dev** | API miễn phí tra từ tiếng Anh; response mẫu có định nghĩa, loại từ, phát âm, ví dụ. | Tài liệu đã đọc không có lookup theo CEFR/chủ đề hay nghĩa Việt. License mã nguồn không tự xác định quyền của mọi nội dung/media trả về. Chưa xác minh runtime trong phiên này. | Phù hợp thử adapter/demo; chưa chọn làm nguồn duy nhất. [API](https://dictionaryapi.dev/), [repo của tác giả](https://github.com/meetDeveloper/freeDictionaryAPI). |
| **Cambridge Dictionary API / licensed data** | Có từ điển learner, tra entry, phát âm và topic/thesaurus endpoints. Có kênh thỏa thuận cấp phép dữ liệu. | Phải xác nhận dataset, giá, quyền lưu và quyền dùng với AI. Danh sách API công khai đã đọc không liệt kê Anh–Việt; chưa kiểm chứng gói đáp ứng toàn bộ CEFR/chủ đề cần dùng. | Phương án có ngân sách; chưa thể mặc định mua API là được import/RAG. [API overview](https://dictionary-api.cambridge.org/api/about), [data licensing](https://dictionary.cambridge.org/license). |
| **Oxford Dictionaries API** | Dữ liệu tra từ có định nghĩa, dịch/phát âm và thông tin từ vựng. | Điều khoản thương mại: app tra từ độc lập cần chấp thuận; lưu/cache lâu dài cần thỏa thuận Enterprise; điều khoản tiêu chuẩn hạn chế dùng nội dung với AI, gồm grounding. Không đồng nhất API này với Oxford Learner/wordlists. | **Chưa phù hợp làm nguồn mặc định cho DB + AI** theo điều khoản tiêu chuẩn đã đọc. [Terms, mục 5.2 và 6.1](https://developer.oxforddictionaries.com/api-terms-and-conditions), [FAQ](https://developer.oxforddictionaries.com/faq). |
| **Merriam-Webster** | Có API nội dung learner/ESL và các từ điển khác. | Miễn phí chỉ trong điều kiện phi thương mại và tối đa 1.000 query/ngày/key; dùng thương mại cần thỏa thuận. Vẫn cần lớp level/chủ đề và nội dung Việt riêng. | Có thể đánh giá chất lượng khi có điều kiện thương mại phù hợp. [API overview](https://www.dictionaryapi.com/), [FAQ](https://dictionaryapi.com/info/frequently-asked-questions). |

**CEFR-J đáng thử nhất cho phần level/chủ đề.** Metadata mẫu CSV được kiểm tra từ bản 1.5 mirror có các cột headword, POS, CEFR và ba cột phân loại; có nhiều ô chủ đề rỗng. Khi sử dụng nên lấy bản chính thức 1.6, lưu version và ghi nguồn, thay vì coi mirror cũ là bản mới nhất. [CSV đã kiểm tra](https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/master/cefrj-vocabulary-profile-1.5.csv), [mirror và điều kiện từng tập dữ liệu](https://github.com/openlanguageprofiles/olp-en-cefrj).

Với CC BY-SA, nội dung có thể dùng thương mại nhưng phần thích nghi cần tuân thủ giấy phép tương ứng; không suy ra toàn bộ mã app phải dùng cùng giấy phép chỉ vì gọi API hoặc lưu nội dung. Phải xác định phần nào là nội dung thích nghi và giữ ghi nguồn/license khi phân phối. [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), [Wikimedia mô tả quyền tái sử dụng](https://enterprise.wikimedia.com/project-data/wiktionary-api/).

## So sánh cách đưa dữ liệu vào sản phẩm

| Phương án | Ưu điểm | Công việc/chi phí còn lại | Khi phù hợp |
| --- | --- | --- | --- |
| Gọi API mỗi lần tra | Khởi đầu nhanh với nội dung sẵn có. | Quyền dùng và quota; chờ mạng; xử lý timeout/429; không tự giải quyết danh sách level/chủ đề. | Tra cứu bổ sung, demo hoặc khi hợp đồng/API đáp ứng đúng nhu cầu. |
| Tự biên soạn toàn bộ trong DB | Kiểm soát tập từ, nghĩa Việt, ví dụ và chất lượng. | Công biên tập/kiểm chứng là bottleneck, không phải dung lượng DB. | Tập nội dung ban đầu nhỏ và mục tiêu học cụ thể. |
| Import nguồn hợp lệ → biên tập → publish trong DB | Không nhập lại từ đầu; lookup ổn định; giữ metadata học của app. | Làm sạch, match loại từ/nghĩa, bổ sung phần thiếu, duyệt và ghi nguồn. | **Đề xuất cho V1.** |
| Mua dataset/license có quyền lưu | Nội dung chuyên nghiệp, giảm công tự xây từ điển. | Phí/hợp đồng; vẫn cần xác nhận CEFR, chủ đề, Việt và AI. | Khi ngân sách và phạm vi nội dung đủ rõ. |

**Cách bắt đầu đề xuất:** thử một tập nhỏ có vài chủ đề và level cần cho pilot; nhập headword/POS/level cùng nguồn, sau đó tự biên soạn hoặc lấy nội dung được phép dùng để bổ sung định nghĩa, nghĩa Việt và ví dụ. Chỉ publish những mục đủ nội dung đã duyệt. AI có thể hỗ trợ bản nháp nhưng không tự biến nội dung/level chưa kiểm chứng thành dữ kiện chính thức.

Tách **catalog do app duyệt** với **từ người dùng tự thêm**. Từ riêng không tự trở thành từ công khai; một từ tùy chỉnh có thể chưa có level/chủ đề. Trạng thái ôn thuộc người học và không bị reset khi app cập nhật định nghĩa.

Không ước lượng phí provider bằng con số chưa có báo giá. Khi chọn nguồn, tính cả phí nội dung/API, thời gian duyệt mỗi mục, tỷ lệ thiếu Việt/ví dụ, số lượt gọi ngoài nếu có và chi phí AI. Một DB tự quản lý chỉ tiết kiệm phí API runtime khi có quyền lưu nội dung và đã tính công biên tập.

## Kiểm chứng đã thực hiện và giới hạn

- Đọc tài liệu/API/licensing chính thức, gồm trang tải CEFR-J và header/mẫu CSV mirror. Một số trang Cambridge/pricing không mở trực tiếp được; thông tin liên quan được đối chiếu từ trang chính thức được search index và tài liệu API. Chưa có credential/hợp đồng để kiểm tra gói trả phí.
- Thử GET Free Dictionary API với 8 input, mỗi request timeout 12 giây. Cả 8 thất bại ở tầng mạng trong môi trường thực hiện; chưa nhận HTTP response hoặc payload. Metadata probe lưu tại `work/dictionary_api_probe_2026-10-01.json`.
- Không dùng probe trên để kết luận API đã ngừng hoạt động, từ không tồn tại hoặc latency production. Chưa đo coverage, completeness hay accuracy thực tế. Các nhận xét trường dữ liệu của API dựa vào tài liệu mẫu, không phải payload live.

## Defense Analysis cho quyết định nguồn dữ liệu — draft

**Decision này cần Defense Analysis trước khi chốt spec.** Ba hint để reasoning trước: Nếu “bank” có hai nghĩa, flashcard đang học nghĩa nào? Nếu API trả dữ liệu nhưng không cho lưu/dùng với AI, bước nào được phép thực hiện? Nếu import chạy lại hoặc bộ từ thay đổi, làm sao giữ trạng thái của người học?

Happy path đề xuất: lấy nguồn được phép dùng → nhập vùng draft → kiểm tra/biên tập → publish version → app tra/lọc trong DB → người học lưu tham chiếu đến nội dung và giữ trạng thái riêng.

| Nhóm case | Hành vi mong đợi và xử lý đề xuất | Phát hiện, recovery và kiểm chứng |
| --- | --- | --- |
| Invariants | Chỉ publish nội dung được quyền sử dụng; mỗi mục học nhận diện nghĩa/loại từ; provenance và level source rõ; trạng thái riêng không lẫn catalog. | Kiểm tra dữ liệu trước publish; gỡ nội dung sai quyền theo nguồn, giữ dữ liệu học còn được phép giữ; rà một batch có lỗi. |
| Edge cases | Nhiều nghĩa, cụm từ, biến thể Anh/Mỹ, khác viết hoa; thiếu ví dụ/Việt/level. Giữ entry/nghĩa riêng, cho chọn nghĩa; thiếu level ghi chưa phân loại. | Danh sách coverage thiếu và sample review; bổ sung/sửa draft; kiểm tra `bank`, `Polish/polish`, cụm nhiều từ và mục custom. |
| Failure modes | API/DB lỗi, payload đổi hoặc batch hỏng: không publish dữ liệu chưa qua kiểm tra; phần catalog đã publish tiếp tục dùng khi API nguồn lỗi. | Log mã lỗi/schema; retry job nhập phù hợp hoặc phục hồi DB; giả lập lỗi provider và dữ liệu sai. |
| Concurrency/races | Hai import/editor cùng sửa không âm thầm ghi đè; không thay ID của nghĩa đã được người học lưu. | Version/kiểm tra xung đột; người biên tập resolve và publish lại; thử sửa cùng một mục từ. |
| Idempotency/duplicates | Import lại cùng source/version không thêm bản trùng hoặc reset trạng thái; không dùng riêng text của từ làm khóa gộp mọi nghĩa. | Mapping nguồn/entry/nghĩa và batch ID; đối chiếu count, chạy lại batch mẫu. Schema/khóa cụ thể chưa chốt. |
| Partial failures | Import có thể dở dang, nhưng catalog công khai không ở trạng thái nửa cập nhật. | Staging và publish theo batch/version; report mục lỗi; tiếp tục hoặc bỏ batch, kiểm tra kill process giữa import. |
| Timeout/retry | Timeout lookup không có nghĩa từ không tồn tại; phân biệt not-found/429/5xx. Retry có giới hạn; cache chỉ trong quyền được cấp. | Metric theo loại lỗi; giữ catalog hoặc cho người học thêm mục riêng khi phù hợp; giả lập 404/429/timeout. |
| Security/abuse | Key ở backend; validate input và escape dữ liệu hiển thị; từ người dùng riêng theo quyền; nội dung retrieved là dữ liệu, không phải instruction cho AI. | Test quyền giữa hai người và input độc hại; chặn nguồn/mục lỗi, xoay key nếu lộ; quota cho tác vụ trả phí. |
| Observability | Đo missing-field, từ không tìm thấy, lỗi nhập, độ trễ provider và chi phí; không log toàn bộ nội dung riêng theo mặc định. | Dashboard/log theo batch và nguồn; sample review cho lỗi nội dung khó đo tự động. |
| Recovery/rollback | Sửa/gỡ nghĩa không xóa trạng thái học một cách vô tình; có phiên bản nội dung và backup. Nghĩa buộc gỡ theo quyền cần xử lý cả bản sao liên quan. | Rollback version, hướng dẫn gỡ theo source; thử restore và kiểm tra mục đã lưu trước cập nhật. |
| Alternatives/trade-offs | DB nội dung duyệt giảm phụ thuộc runtime nhưng tăng công biên tập; API giảm công nhập nhưng thêm hợp đồng/quota và mapping. | Đo trên tập mẫu rồi mới chốt. Xem lại nếu công duyệt vượt khả năng hoặc API/license mới đáp ứng tốt hơn. |

Đây là phân tích để chọn hướng; chưa chốt schema, pipeline nhập, provider, quota hoặc SLA. Redis/queue không tự động cần thiết cho bước lựa chọn nguồn này.

## V1.5: chatbot tra cứu và RAG có điều kiện

**Đã ghi nhận theo yêu cầu người dùng:** chatbot tra từ qua AI; cân nhắc RAG sớm khi có nhu cầu. Các phần nội dung dự kiến là giải thích, definition, nghĩa và ví dụ; chưa chốt field name, schema, cách hiển thị, nguồn ngoài và giới hạn chatbot.

Đề xuất đường đơn giản đầu tiên: nhận câu hỏi → tìm từ/nghĩa phù hợp trong dữ liệu được phép dùng → đưa dữ liệu đó cho AI → nhận response theo format để app hiển thị. Tra từ chính xác hoặc lọc topic/level có thể bắt đầu bằng query DB. Chỉ thử semantic/vector retrieval khi câu hỏi ngữ cảnh/diễn đạt lại cần nó; đánh giá trên cùng tập truy vấn trước khi thêm hạ tầng. RAG có thể dùng keyword, vector hoặc hybrid retrieval; không mặc định phải có vector database riêng. [Microsoft: retrieval choices](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/rag/rag-information-retrieval).

**Response có cấu trúc và RAG là hai lựa chọn riêng:** format giúp app đọc/hiển thị; retrieval cung cấp căn cứ nội dung. JSON đúng cấu trúc vẫn có thể sai ngữ nghĩa; phải kiểm tra nội dung và cách xử lý không tìm thấy nguồn. [Google: structured output và validation](https://ai.google.dev/gemini-api/docs/structured-output#best-practices).

Điều kiện để đưa vào thực hiện: có người học cần tra bằng ngôn ngữ tự nhiên/ngữ cảnh; corpus đủ chất lượng và có quyền dùng với AI; xác định cách chọn nghĩa, báo không đủ dữ liệu, giới hạn chi phí/độ trễ và format. Chưa cam kết chatbot trả đúng mọi câu hỏi, chưa quyết định cung cấp câu trả lời không có nguồn khi catalog thiếu.
