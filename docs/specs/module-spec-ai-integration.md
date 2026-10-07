# Module spec — AI Integration

> Sinh bởi `write-spec`, lần chạy `v1-specs`, đợt 3. Mẫu `module-spec.md`. Cách trích dẫn: **K#, N#, F#** =
> [DECISIONS](DECISIONS_2026-10-04.md) và [kế hoạch](SPEC_PLAN_AND_DECISIONS_2026-10-04.md); **R#** =
> [research.md](../tasks/v1-specs/research.md); **S#, SR#** = [system-spec](system-spec.md); **ER#** =
> [Entitlements](module-spec-entitlements-usage.md); **ASSUMPTION** = chưa có nguồn. Vùng cần Defense Analysis (lỗi AI)
> nằm ở mục **Defense Analysis** cuối file.

**Ngày:** 2026-10-04 · **Module:** AI Integration · **Spec run:** v1-specs

## Observed on

Không có hệ thống tham chiếu. Chưa chọn provider, chưa gọi AI thật, chưa có benchmark, chưa đo chi phí.

| Surface | How accessed | By whom | When |
|---|---|---|---|
| Quyết định về AI (K16, K17, K20, F27–F30, F39, F43, F43b, N5) | Chat | Chủ dự án | 02–04/10/2026 |
| Bản nháp rubric và Defense Analysis chấm bài | `V1_GRADING_RULES_DRAFT.md` | Trợ lý (đề xuất) | 02/10/2026 |

## Scope

Module sở hữu **một cổng duy nhất tới nhà cung cấp AI** (`AiProvider`) và mọi thứ quanh lời gọi: ba loại việc (**sinh bài điền từ**,
**tra nghĩa**, **dịch câu**), hợp đồng đầu vào và đầu ra, deadline, retry, kết quả và loại lỗi, idempotency theo `operation_id`,
nhật ký chi phí, ngân sách, công tắc tắt, và các biện pháp an toàn khi gửi dữ liệu. Ranh giới: AI Integration **không** quyết định
quyền hay hạn mức (Entitlements), **không** quyết định sư phạm hay chấm bài (Practice), và chỉ kiểm **hình dạng** đầu ra; luật ngữ nghĩa
của câu hỏi do Practice kiểm (K16).

**Ngoài phạm vi V1:** chọn provider và model (cấu hình, không nằm trong spec); AI soạn nháp nội dung (K1b); AI nhận xét hoặc sửa câu;
chatbot và RAG (V1.5); kiểm câu bằng một lần gọi AI thứ hai (K16, xét lại sau pilot); circuit breaker (chỉ khi có tín hiệu, AR14);
hội thoại nhiều lượt và âm thanh.

## Constraints

| Constraint | Imposed by | Why it is not the implementer's choice |
|---|---|---|
| Mọi lời gọi AI đi qua một cổng `AiProvider` có adapter giả cho test; provider và model chọn bằng cấu hình | Chủ dự án (K2, F27) | Cho phép đổi provider mà không đổi lõi (R40) |
| Mỗi lời gọi có deadline và retry hữu hạn có jitter | Chủ dự án (K2, F28) | R41; tránh retry dồn |
| Đầu ra theo schema cố định; sai schema coi là lỗi tạm | Chủ dự án (F27) | Quyết định kỹ thuật đã chốt |
| Chỉ gửi nội dung học cho provider, không gửi email hay định danh người dùng | Chủ dự án (F29) | Bảo vệ dữ liệu cá nhân |
| Từ riêng tư của người học khi gửi đi phải được nêu trong Privacy Policy | Chủ dự án (F29), store (R15) | Yêu cầu minh bạch |
| Điều khoản của provider về lưu và huấn luyện bằng dữ liệu gửi đi phải được xem trước khi bật cho người thật | Chưa có provider, nên chưa xác minh (F30) | Không biết trước nội dung |
| Chấm đáp án không dùng AI | Chủ dự án (K15, F32) | Quyết định sản phẩm |

## Business rules

| # | Quy tắc | Nguồn |
|---|---|---|
| AR1 | **Cổng và adapter.** Một cổng `AiProvider` với ba thao tác (AR2). Mỗi provider là một adapter; đổi provider hay model bằng cấu hình không đổi hợp đồng. Adapter giả hỗ trợ: thành công, timeout, 429 kèm thời gian chờ, lỗi 5xx, đầu ra sai schema, từ chối trả lời | K2, F27, R40 |
| AR2 | **Ba thao tác.** (a) `generate_cloze`: nhận từ, loại từ, level, nghĩa, nhãn ngữ cảnh, ngôn ngữ dịch; trả câu **có đúng một chỗ trống** và có độ khó bám level của từ mục tiêu, không cao hơn, danh sách dạng đáp án chấp nhận (không rỗng) và bản dịch nguyên câu hoàn chỉnh sang ngôn ngữ của người học (không cần khi đó là tiếng Anh). (b) `lookup_word`: nhận từ người học nhập (và câu chứa từ nếu họ cung cấp) và ngôn ngữ nghĩa; trả loại từ, lemma, nghĩa ngắn, định nghĩa tiếng Anh, 1–2 ví dụ; **chỉ là gợi ý, không có level**; định nghĩa do AI viết chỉ trở thành nội dung hiển thị khi người học xác nhận làm từ riêng tư (N6 chỉ áp dụng cho sense catalog). (c) `translate_sentence`: nhận câu hoàn chỉnh và ngôn ngữ đích; trả bản dịch | F43, F43b, K20, N5; thao tác (c) và nội dung đầu ra của (b) `ASSUMPTION` |
| AR3 | **Deadline và retry.** Mỗi lời gọi tới provider tối đa 20 giây. Luồng người dùng thử lại **tối đa một lần**, chỉ với lỗi tạm (timeout, 429, 5xx, đầu ra sai schema), chờ theo backoff mũ có Full Jitter, tối đa 5 giây; tôn trọng thời gian chờ provider nêu nếu nó nằm trong deadline tổng. Một lần thử lại chỉ bắt đầu khi thời gian còn lại của deadline tổng đủ cho thời gian chờ đã chọn cộng một lời gọi 20 giây; nếu không thì không thử lại. Không thử lại lỗi quyền, dữ liệu vào sai, từ chối trả lời hoặc hết ngân sách. Deadline tổng cho một thao tác là 45 giây hoặc thời gian còn lại mà bên gọi truyền xuống, lấy số nhỏ hơn | F28, R41; 45 giây, trần backoff và quy tắc vừa đủ thời gian `ASSUMPTION` |
| AR4 | **Loại kết quả.** `succeeded`, `transient_failure` (có thể thử lại sau), `permanent_failure`, `unavailable` (hết ngân sách hoặc công tắc tắt). Bên gọi chuyển mọi kết quả không thành công thành "chưa tạo được" hoặc bỏ qua bước, **không bao giờ** thành "đáp án sai" | F41 |
| AR5 | **Idempotency.** Mỗi thao tác ghi nhận theo `operation_id` (kèm loại, băm dữ liệu vào, trạng thái, kết quả). Cùng `operation_id` và cùng dữ liệu: nếu thao tác **đã thành công hoặc đã thất bại vĩnh viễn** thì trả kết quả đã lưu và **không gọi provider lần hai**; nếu **đang chạy** thì chờ kết quả (ở tầng API, SR8 trả "đang xử lý"); nếu **thất bại tạm thời** thì kết quả đó **không được lưu làm kết quả cuối**: gửi lại cùng `operation_id` là một lần thực hiện mới. Cùng `operation_id` nhưng dữ liệu khác: từ chối. Thao tác nhiều bước (ví dụ tạo lại câu sau khi kiểm rule không đạt) dùng **ID dẫn xuất** `operation_id#1`, `operation_id#2` do bên gọi sinh, mỗi ID lưu riêng nên tạo lại thật sự gọi provider. Kết quả thành công lưu tối thiểu 24 giờ rồi xóa | SR8, R12 (nguồn lưu cả lỗi; lỗi tạm không được lưu ở đây là lựa chọn riêng); 24 giờ, ID dẫn xuất `ASSUMPTION` |
| AR6 | **Nhật ký chi phí.** Mỗi lời gọi tới provider (kể cả lần thử lại) một bản ghi: `operation_id`, loại, provider, model, phiên bản prompt, token vào và ra, chi phí, độ trễ, trạng thái, lần thử thứ mấy. **Không lưu prompt hay phản hồi thô** theo mặc định. Liên kết tới người dùng bị xóa hoặc ẩn danh khi xóa tài khoản, số liệu tổng hợp được giữ | F30, F4, SR11; không lưu nội dung thô và ẩn danh khi xóa `ASSUMPTION` |
| AR7 | **Dữ liệu gửi đi.** Chỉ nội dung học: từ, loại từ, level, nghĩa, nhãn ngữ cảnh; câu ngữ cảnh chỉ được gửi khi chính người học cung cấp nó cho một lần tra nghĩa. Không bao giờ gửi email, tên, user ID hay thông tin phiên | F29; việc gửi câu do người học nhập vào lúc tra nghĩa `ASSUMPTION` |
| AR8 | **Chống chỉ thị chèn vào dữ liệu.** Mọi giá trị đưa vào lời gọi là dữ liệu, không phải chỉ thị; mô hình không có công cụ hay quyền truy cập DB; đầu ra luôn được kiểm là dữ liệu có cấu trúc trước khi dùng; độ dài đầu ra bị giới hạn | V1_GRADING_RULES_DRAFT mục 6 (đề xuất); số giới hạn `ASSUMPTION` |
| AR9 | **Kiểm hình dạng đầu ra.** Hợp lệ khi: đúng schema; `generate_cloze` có đúng một dấu chỗ trống, danh sách đáp án không rỗng và đã cắt khoảng trắng, bản dịch không rỗng khi được yêu cầu; câu tối đa 200 ký tự và bản dịch tối đa 400 ký tự. Kiểm ngữ nghĩa (đáp án có là dạng của từ không, câu có khớp nghĩa không) thuộc Practice | F27, K16; số `ASSUMPTION` |
| AR10 | **Ngân sách và công tắc.** Trần token cho mỗi lời gọi; công tắc và trần chi toàn hệ thống do **Entitlements** quyết định lúc giữ chỗ (ER14); AI Integration kiểm lại trước khi gọi provider và trả `unavailable` nếu chạm trần hoặc công tắc tắt, đồng thời theo dõi chi phí mỗi ngày để báo cho Entitlements | ER14; trần token `ASSUMPTION` |
| AR11 | **Giới hạn đồng thời.** Số lời gọi provider chạy cùng lúc bị giới hạn (mặc định 5); vượt thì chờ ngắn rồi trả `unavailable` kèm lỗi "đang bận" | R37; số `ASSUMPTION` |
| AR12 | **Phiên bản.** Mỗi thao tác ghi phiên bản prompt và schema; bản sinh ra mang phiên bản này để quay về phiên bản cũ bằng cấu hình | F36, V1_GRADING_RULES_DRAFT mục 8 |
| AR13 | **Cổng chất lượng trước khi bật cho người thật.** Có một bộ ví dụ nhỏ đã được người duyệt tiếng Anh xem (đúng, sai, thiếu ngữ cảnh, contraction, dạng chia, đa nghĩa, chỉ thị chèn vào dữ liệu) chạy với model và prompt dự định dùng; ghi riêng tỉ lệ đầu ra sai schema, độ trễ, chi phí. Chưa đặt ngưỡng vì chưa có tập nhãn | V1_GRADING_RULES_DRAFT mục 7 (đề xuất); tiêu chí phát hành **còn mở** |
| AR14 | **Circuit breaker chưa dùng ở V1.** Chỉ cân nhắc khi provider lỗi kéo dài làm các request dồn lại; V1 dựa vào deadline, giới hạn retry và giới hạn đồng thời | K2, R42 |
| AR15 | **Xóa tài khoản.** Xóa kết quả lưu của các thao tác thuộc người đó và gỡ liên kết người dùng khỏi nhật ký chi phí | K3, SR11 |

## Acceptance criteria — «When … then …»

| # | Criterion | Cites |
|---|---|---|
| A1 | When `generate_cloze` succeeds, then the result has a sentence with exactly one blank, a non-empty list of accepted answer forms and, if the learner's language is not English, a translation of the completed sentence | F43b |
| A2 | When the learner's language is English, then no translation is requested or required | N5 |
| A3 | When the provider call times out, then one retry follows after a jittered backoff and, if it also times out, the result is `transient_failure` and no third call is made | F28 |
| A4 | When the provider answers 429 with a wait time that fits in the overall deadline, then the retry waits at least that long; when it does not fit, the result is `transient_failure` | R41 (wait handling `ASSUMPTION`) |
| A5 | When the provider output does not match the schema, then one retry is made and, if still invalid, the result is `transient_failure` and no partial content is passed on | F27 |
| A6 | When the provider answers with a permission or input error, or refuses to answer, then the result is `permanent_failure` and there is no retry | AR3 |
| A7 | When the same `operation_id` is sent again with the same data after a success, then the stored result is returned and the provider is not called | AR5 |
| A8 | When the same `operation_id` is sent with different data, then the call is rejected and nothing is sent to the provider | AR5 |
| A9 | When the same `operation_id` arrives while the first call is still running, then no second provider call is made and the caller gets the result of the first | AR5 |
| A10 | When a call is retried, then the cost log has one record per provider call, so two calls give two records | F30 |
| A11 | When a request is built for a learner, then the outbound payload contains no email, name, user ID or session data | F29 |
| A12 | When a word, gloss or sentence contains text that looks like an instruction, then the result is still only accepted if it has the required structure, and the instruction changes nothing | AR8 (`ASSUMPTION`) |
| A13 | When the configured provider or model is changed, then the operations and their contract stay the same, and tests run against the fake adapter without any paid call | F27 |
| A14 | When the system-wide daily budget is reached or the kill switch is on, then the result is `unavailable` and the provider is not called | ER14 (`ASSUMPTION`) |
| A15 | When `lookup_word` succeeds, then the result has a part of speech, a lemma, a short meaning, an English definition and one or two examples, is marked as a suggestion, and carries no level | AR2 |
| A16 | When `translate_sentence` succeeds, then the result is the translation of the sentence in the requested language | N5 |
| A17 | When any operation completes, then its prompt version and schema version are recorded and returned with the result | F36 |
| A18 | When more than the allowed number of provider calls are requested at once, then the extra ones wait briefly and then return `unavailable` with a "busy" error | AR11 (`ASSUMPTION`) |
| A19 | When a user deletes the account, then the stored results of that user's operations are removed and the cost log keeps only anonymous totals | K3 |
| A20 | When the owner enables AI features for pilot users, then an evaluation record from the reviewed example set exists | AR13 (`ASSUMPTION`) |
| A21 | When the same `operation_id` is sent again after a transient failure, then it is a new execution and the provider is called again | AR5 (`ASSUMPTION`) |
| A22 | When the caller regenerates a question using derived IDs `id#1` and `id#2`, then each ID causes its own provider call and is stored separately | AR5 (`ASSUMPTION`) |
| A23 | When `generate_cloze` is requested for a word of a given level, then the request asks for a sentence at or below that level, and the evaluation set checks it | F43 |

## Edge cases

| # | Edge case | Expected | Cites |
|---|---|---|---|
| AE1 | The model returns two blanks, no blank, or an empty list of answers | The output is invalid; it is retried once and then fails as `transient_failure` | F27 |
| AE2 | The model returns text with HTML or markup | It is stored and shown only as plain text, never interpreted | ASSUMPTION |
| AE3 | The model answers in the wrong language for the translation | Not detectable by shape checks; it can be caught by the learner's "report question" action and by the evaluation set | K16 |
| AE4 | The first call took 19.9 seconds and the chosen backoff plus a full second call would pass the overall deadline | No retry is started; the result is `transient_failure` | AR3 (`ASSUMPTION`) |
| AE5 | The provider is down for a long time and every request waits the full deadline | Requests pile up; this is the trigger to add a circuit breaker later | R42 |
| AE6 | The database fails before the AI result was stored (first case) or after it was stored (second case) | First case: nothing is stored under the `operation_id`, so a retry calls the provider again and a second paid call is possible. Second case: the retry returns the stored result with no second call | AR5 |
| AE7 | The provider charges for a call that timed out on our side | The cost log records the call with an estimated cost flagged "estimated", the budget counts the estimate, and the user is not charged units | F33 |
| AE8 | A very long gloss or sentence is passed in | It is refused or truncated by the input limit before any call | AR8 (`ASSUMPTION`) |

## Defense Analysis

Chưa chạy thử; chưa gọi AI thật. Vùng này nằm trong danh sách "cần Defense Analysis trước khi chốt spec" của chủ dự án (chấm bài và xử lý lỗi AI; phần chấm bài ở spec Practice).

**Đường đi bình thường.** Practice giữ chỗ hạn mức → gọi `generate_cloze` với `operation_id` → nhận câu đúng schema → Practice kiểm rule và lưu → xác nhận.

**Bất biến.** (1) Không lời gọi nào không có `operation_id`. (2) Một thao tác thành công chỉ tốn một lời gọi provider thành công. (3) Không bao giờ có dữ liệu định danh trong payload gửi đi. (4) Mọi lỗi thành `transient_failure`, `permanent_failure` hoặc `unavailable`, không bao giờ thành "sai". (5) Mọi lời gọi, kể cả lần thử lại, đều có một bản ghi chi phí.

| Case | Hành vi bảo vệ | Phát hiện → khôi phục | Kiểm chứng dự kiến |
|---|---|---|---|
| Provider timeout hoặc 429 hoặc 5xx | Deadline, một lần thử lại có jitter, rồi `transient_failure` (AR3, AR4) | Tỉ lệ lỗi và độ trễ theo thao tác | Adapter giả trả timeout, 429, 5xx |
| Đầu ra sai schema hoặc mâu thuẫn | Kiểm hình dạng, thử lại một lần, không chuyển nội dung dở dang (AR9) | Tỉ lệ đầu ra không hợp lệ | Adapter giả trả JSON hỏng |
| Gọi hai lần cho một thao tác (người dùng bấm hai lần, mạng chập chờn) | Idempotency theo `operation_id` (AR5) | Số lần trùng `operation_id` | Gửi hai lần; gửi đồng thời |
| Provider có kết quả nhưng DB chưa ghi | Kết quả lưu theo `operation_id` để gọi lại không tốn lần hai (AR5, AE6) | So khớp nhật ký chi phí và sổ lượt dùng | Ngắt sau khi provider trả lời |
| Provider tính phí lần timeout | Nhật ký ghi từng lời gọi; người dùng không bị trừ (AE7, F33) | Chi phí thực so với lượt xác nhận | So khớp theo `operation_id` |
| Chỉ thị chèn vào dữ liệu (từ riêng tư, câu của người học) | Dữ liệu là dữ liệu; kiểm cấu trúc đầu ra; mô hình không có công cụ (AR8) | Kiểm thử đối kháng, theo dõi đầu ra bất thường | Từ chứa "bỏ qua mọi quy tắc" |
| Lộ dữ liệu cá nhân cho provider | Chỉ gửi nội dung học (AR7) | Rà soát payload mẫu | Kiểm payload không chứa định danh |
| Chi phí vượt dự kiến | Trần token, trần chi mỗi ngày, công tắc tắt (AR10) | Cảnh báo chi tiêu | Giả lập chi phí tăng |
| Provider hỏng kéo dài làm request dồn | Giới hạn đồng thời, deadline tổng (AR3, AR11); circuit breaker khi có tín hiệu (AR14) | Số request chờ | Provider giả luôn chậm |
| Chất lượng sai nhưng JSON hợp lệ | Chỉ kiểm hình dạng ở đây; kiểm ngữ nghĩa ở Practice (K16); nút "báo câu lỗi"; bộ ví dụ đánh giá (AR13) | Tỉ lệ báo lỗi trong pilot | Bộ ví dụ có người duyệt |
| Đổi model hoặc prompt gây hồi quy | Phiên bản prompt và schema ghi trên mỗi kết quả; quay về bản cũ bằng cấu hình (AR12) | So sánh theo phiên bản | Chạy lại bộ ví dụ với bản cũ và mới |
| Quan sát | Log theo thao tác với `operation_id`, loại, model, token, chi phí, độ trễ, trạng thái; không lưu nội dung thô (AR6, F4) | Báo cáo theo ngày | Tìm một thao tác qua `operation_id` |
| Thử lại sau lỗi tạm bị trả lại đúng lỗi cũ | Lỗi tạm không lưu làm kết quả cuối; thử lại là lần thực hiện mới (AR5) | — | Gửi lại cùng `operation_id` sau timeout |
| Tạo lại câu dùng chính kết quả cũ | ID dẫn xuất cho từng lần tạo (AR5) | — | Kiểm rule không đạt rồi tạo lại |
| Tổng thời gian cho cả luồng tạo câu | Deadline tổng 45 giây cho mỗi thao tác; luồng Practice truyền deadline còn lại xuống để cả luồng không quá 45 giây (PRC5) | Độ trễ theo phân vị | Hai lần tạo liên tiếp gần trần |

**Phương án thay thế và vì sao bị loại.** (a) Gọi provider trực tiếp từ từng module: bị loại vì mất khả năng đổi provider và kiểm thử bằng adapter giả (K2, R40). (b) Hàng đợi cho luồng người dùng: bị loại ở quyết định worker (02/10), chỉ xét khi thời gian chờ quá dài. (c) Circuit breaker: chưa dùng, điều kiện kích hoạt ở AR14 (R42).

### Bổ sung theo mẫu Defense Analysis (05/10/2026)

Theo `docs/preparation/DECISION_ANALYSIS_TEMPLATE.md`. Chưa gọi AI thật; con số dung lượng là ước tính từ tham số trong spec.

| Nhóm case | Phân tích |
|---|---|
| Tiến hóa và tương thích | Đổi provider hoặc model là đổi cấu hình và adapter, hợp đồng ba thao tác không đổi (AR1, R40). Thêm thao tác AI mới (chatbot V1.5) là thêm một thao tác vào cổng, kèm schema và phiên bản prompt riêng (AR12). Thêm ngôn ngữ dịch: `translate_sentence` nhận ngôn ngữ đích theo danh sách cho phép; chất lượng bản dịch tiếng Việt và các ngôn ngữ khác phải qua bộ ví dụ đánh giá (AR13) trước khi bật. Câu và bản dịch đã lưu mang phiên bản prompt nên đổi prompt không làm hỏng dữ liệu cũ (AR12) |
| Năng lực và chi phí vận hành | Giới hạn 5 lời gọi cùng lúc, mỗi lời gọi tối đa 20 giây (AR3, AR11) nghĩa là trong trường hợp xấu nhất, khi mọi lời gọi chạm 20 giây, thông lượng **chỉ còn** khoảng 0,25 lời gọi mỗi giây, tức khoảng 900 lời gọi mỗi giờ; lời gọi nhanh hơn thì thông lượng cao hơn. Pilot tối đa 50 người nên nhỏ hơn mức này (chưa đo nhu cầu). Chi phí mỗi lời gọi chưa đo; kiểm soát bằng trần token, trần chi mỗi ngày và công tắc (AR10, ER14). Mỗi lần thử lại là một lời gọi có phí, nên tỉ lệ thử lại phải được theo dõi (AR6) |
| Đánh đổi chấp nhận | Chỉ kiểm hình dạng đầu ra ở đây, ngữ nghĩa kiểm ở Practice (AR9, K16); câu có thể sai dù đúng cấu trúc, được giảm bằng nút báo lỗi thay vì lần gọi AI thứ hai (K16); không lưu prompt và phản hồi thô (AR6) đổi lấy riêng tư, mất khả năng xem lại chi tiết một lần sinh sai |

**So sánh phương án tích hợp AI**

| Phương án | Đáp ứng yêu cầu | Hạn chế | Chi phí và vận hành | Lý do |
|---|---|---|---|---|
| A. Mỗi module gọi provider trực tiếp | Nhanh nhất lúc đầu | Mất khả năng đổi provider và kiểm thử bằng adapter giả; retry và chi phí rải rác | Thấp lúc đầu, cao sau | Loại (K2, R40) |
| B. Một cổng `AiProvider` có adapter (đã chọn) | Đổi provider bằng cấu hình; một chỗ cho deadline, retry, nhật ký chi phí | Thêm một lớp | Trung bình | Chọn |
| C. Đưa lời gọi của người dùng qua hàng đợi | Chịu tải và lỗi tốt hơn | Thêm độ trễ và Redis cho luồng người dùng | Cao | Chỉ xét khi thời gian chờ quá dài |

**Runbook tối thiểu.** Phát hiện: tỉ lệ lỗi và độ trễ theo thao tác, tỉ lệ đầu ra không hợp lệ, tỉ lệ thử lại, chi phí mỗi ngày so với trần. Chẩn đoán: tìm bản ghi chi phí theo `operation_id`, so phiên bản prompt và model. Xử lý: bật công tắc tắt AI; quay về phiên bản prompt cũ bằng cấu hình (AR12); đổi provider bằng cấu hình; ẩn câu của phiên bản xấu ở Practice (PRC25). Xác minh: chạy lại bộ ví dụ đánh giá với bản mới và cũ, so tỉ lệ đầu ra không hợp lệ, độ trễ, chi phí.

**Câu hỏi còn mở.** Provider và model chưa chọn; điều khoản dữ liệu của provider (F30) chưa xác minh; ngưỡng đánh giá (AR13) chưa đặt vì chưa có tập nhãn; chất lượng bản dịch tiếng Việt chưa đo.

## Cross-module contract notes

| Với module | AI Integration hứa hoặc cần |
|---|---|
| Practice | Cung cấp `generate_cloze` và `translate_sentence`; trả `succeeded` hoặc một loại lỗi (AR4); Practice kiểm ngữ nghĩa, gắn bản sinh vào snapshot, và luôn chuyển lỗi thành "chưa tạo được" |
| Vocabulary Content | Cung cấp `lookup_word` cho bước C của chuỗi tra nghĩa (CR15); kết quả chỉ là gợi ý |
| Entitlements & Usage | Báo chi phí mỗi lời gọi để theo dõi trần chi toàn hệ thống (ER14); **không** kiểm quyền (bên gọi đã giữ chỗ trước khi gọi) |
| Identity & Access | Nhận lệnh xóa dữ liệu theo người dùng (AR15) |
| Content Pipeline | Không dùng ở V1 (K1b); cổng chừa chỗ cho nguồn "ai" sau này |

## Provenance markers used above

- **K#** — quyết định đã chốt; **N#, F#** — mặc định hoặc đề xuất mang nhãn riêng ở nguồn (nhiều F# có con số là `ASSUMPTION`; F43b là bổ sung ở DECISIONS mục 5); **R#** — finding trong `research.md` (R12, R37, R40–R42 là `documented (02/10)`).
- **S#, SR#, ER#, CR#** — spec khác. **ASSUMPTION** — không có nguồn; được mang vào báo cáo cuối.
