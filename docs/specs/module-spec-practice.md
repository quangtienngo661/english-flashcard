# Module spec — Practice

> Sinh bởi `write-spec`, lần chạy `v1-specs`, đợt 3. Mẫu `module-spec.md`. Cách trích dẫn: **K#, N#, F#** =
> [DECISIONS](DECISIONS_2026-10-04.md) và [kế hoạch](SPEC_PLAN_AND_DECISIONS_2026-10-04.md); **R#** =
> [research.md](../tasks/v1-specs/research.md); **S#, SR#** = [system-spec](system-spec.md); **C#, CR#** =
> [Vocabulary Content](module-spec-vocabulary-content.md); **LR#** = [Learning](module-spec-learning.md); **ER#** =
> [Entitlements](module-spec-entitlements-usage.md); **AR#** = [AI Integration](module-spec-ai-integration.md);
> **ASSUMPTION** = chưa có nguồn. Vùng cần Defense Analysis (chấm bài, lỗi AI, idempotency khi nộp đáp án) nằm ở mục
> **Defense Analysis** cuối file.

**Ngày:** 2026-10-04 · **Module:** Practice · **Spec run:** v1-specs

## Observed on

Không có hệ thống tham chiếu. Chưa gọi AI thật, chưa có bộ ví dụ được người duyệt, chưa đo độ chính xác chấm bài.

| Surface | How accessed | By whom | When |
|---|---|---|---|
| Quyết định về bài luyện (K15–K17, K22–K24, F36–F44, N4, N5, N10, N11) | Chat | Chủ dự án | 02–04/10/2026 |
| Bản nháp rubric chấm | `V1_GRADING_RULES_DRAFT.md` | Trợ lý (đề xuất, chưa chạy với model thật) | 02/10/2026 |

## Scope

Module sở hữu **mọi dạng bài**, **phiên luyện**, **câu hỏi** (kèm snapshot), **ngân hàng câu AI dùng chung**, **lượt làm bài** và **báo câu
lỗi**, **chấm bài bằng rule**, cùng **mức yếu** của từng từ và danh sách "từ hay sai". Năm dạng bài: (1) trắc nghiệm theo definition,
(2) đúng/sai theo definition, (3) gõ từ theo nghĩa ("tự luận"), (4) điền từ do AI sinh, (5) điền từ từ câu của chính người học (không AI).
Practice là bên **điều phối** việc tạo câu AI: xin giữ chỗ hạn mức (Entitlements) → lấy câu từ ngân hàng hoặc gọi AI Integration → xác nhận
hoặc nhả. Kết quả mỗi lượt được báo sang Learning để cập nhật lịch ôn. Ranh giới: nội dung từ vựng thuộc Content; lịch ôn thuộc Learning;
quyền và hạn mức thuộc Entitlements; gọi provider thuộc AI Integration.

**Ngoài phạm vi V1:** bài tự viết câu và AI nhận xét hoặc sửa câu (hoãn từ 02/10); chấm câu mở; kiểm câu AI bằng lần gọi AI thứ hai (K16);
điểm năng lực, streak, xếp hạng; hội thoại và âm thanh; bài cho phrasal verb, idiom.

## Constraints

| Constraint | Imposed by | Why it is not the implementer's choice |
|---|---|---|
| Chấm đáp án bằng rule, không gọi AI | Chủ dự án (K15, F32) | Nộp bài không tốn lượt AI; nhất quán |
| Bài điền từ AI chỉ có: câu có chỗ trống, dạng đáp án chấp nhận, bản dịch nguyên câu; **không có lời giải thích tự do của AI** | Chủ dự án (F43b, F39) | Quyết định sản phẩm |
| So sánh đáp án: chữ thường, cắt khoảng trắng, đồng nhất dấu nháy, contraction theo danh sách duyệt, không chấp nhận viết tắt kiểu tin nhắn (TY, GTG), **không dung sai chính tả** | Chủ dự án (F38; chữ thường, contraction, TY/GTG đã chốt 02/10) | Quy tắc chấm đã chốt |
| Kết quả bài làm không đổi trạng thái thẻ của người học | Chủ dự án (F21) | Quyết định sản phẩm |
| Câu từ từ riêng tư và câu ngữ cảnh của người học không bao giờ vào ngân hàng chung | Chủ dự án (K17, N4, N11) | Bảo vệ nội dung riêng |
| Nộp đáp án có `Idempotency-Key`; câu hỏi lưu snapshot | Chủ dự án (K2, F36, F37) | Đã chốt |
| Free dùng được bài không AI; bài AI cần quyền `ai.practice` | Chủ dự án (F31) | Quyết định sản phẩm |

## Business rules

| # | Quy tắc | Nguồn |
|---|---|---|
| PRC1 | **Dạng bài (handler).** Mỗi dạng bài là một handler cùng giao diện `tạo câu hỏi` và `chấm đáp án`, nhận biết bằng `type` và `payload_schema_version`; client phải chịu được `type` lạ. Năm `type` V1: `mcq_definition`, `true_false_definition`, `type_word`, `ai_cloze`, `learner_cloze` | K2, R43, SR7 |
| PRC2 | **Hướng bài không AI.** Câu hỏi đưa **nghĩa** (nghĩa theo tiếng mẹ đẻ và định nghĩa tiếng Anh nếu có) và người học trả lời bằng **từ tiếng Anh**. `mcq_definition`: chọn một trong 4 từ. `true_false_definition`: một cặp (từ, nghĩa), người học chọn đúng hay sai; cặp sai dùng nghĩa của một sense khác. `type_word` (K15): gõ từ theo nghĩa, chấm bằng rule so với dạng được chấp nhận của sense | K15, F42; 4 lựa chọn `ASSUMPTION` |
| PRC3 | **Đáp án nhiễu.** Lấy ngẫu nhiên từ catalog `published`, cùng loại từ và cùng level hoặc kề level (±1), loại entry từ chức năng và loại sense có cùng lemma (so sánh **không phân biệt hoa thường**, nên `March` và `march` không cùng xuất hiện) hoặc cùng `gloss`; cần ít nhất 3 ứng viên, thiếu thì nới tới ±2 rồi bất kỳ level; vẫn thiếu thì dạng bài này không khả dụng cho từ đó và từ bị bỏ qua. Nếu đáp án đúng là từ riêng tư thiếu loại từ hoặc level thì bỏ điều kiện thiếu đó. Từ riêng tư có thể là đáp án đúng nhưng không bao giờ làm đáp án nhiễu của người khác. Hai đáp án cùng đúng vì đồng nghĩa không tính được; người học báo câu (PRC18) và owner chặn cặp xấu | F42, K11; "±1", loại từ chức năng khỏi đáp án nhiễu và xử lý đồng nghĩa `ASSUMPTION` |
| PRC4 | **Bài từ câu của người học.** `learner_cloze`: lấy một câu ngữ cảnh **dùng được cho bài điền từ** (CR14) của người học, che token khớp (nguyên vẹn, không phân biệt hoa thường), người học điền. Đáp án chấp nhận là **dạng đúng như trong câu** cộng các biến thể chính tả được chấp nhận của entry; lemma hay dạng khác **không** được chấp nhận nếu khác dạng trong câu (ví dụ `deploy` cho chỗ trống `deployed` là sai). Không dùng AI, dùng được ở gói Free, không có bản dịch | K23, CR14; cách che và chấp nhận `ASSUMPTION` |
| PRC5 | **Bài điền từ AI.** `ai_cloze` cần quyền `ai.practice` và hạn mức. Luồng: (1) kiểm quyền và giữ chỗ một đơn vị (ER5; bị từ chối nếu công tắc tắt hoặc chạm trần chi, ER14, **kể cả khi câu sẽ lấy từ ngân hàng**); (2) tìm trong ngân hàng một câu cho sense đó mà người này **chưa gặp**, đã qua kiểm, không bị ẩn, và **nhận câu đó cho người này theo cách nguyên tử** (mỗi cặp (người học, câu) chỉ có một, nên hai yêu cầu song song không nhận cùng một câu); (3) không có thì gọi `generate_cloze` với `operation_id#1`; (4) kiểm rule (PRC6), không đạt thì sinh lại **một lần** với `operation_id#2`; (5) bổ sung bản dịch nếu thiếu (PRC9); (6) lưu snapshot cho người này, đưa câu vào ngân hàng nếu sense thuộc catalog, rồi xác nhận giữ chỗ. Thất bại ở bước nào thì **nhả** giữ chỗ và trả "chưa tạo được". Cả luồng có **trần thời gian 45 giây** (thấp hơn timeout 60 giây mặc định của nginx và Application Load Balancer, R48), được truyền xuống AI Integration làm deadline còn lại; sinh lại (bước 4) chỉ bắt đầu khi còn đủ thời gian; hết trần thì dừng và nhả. Gửi lại cùng khóa sau một thành công trả đúng câu đã tạo. Theo SR8, "chưa tạo được" (provider lỗi, kiểm rule không đạt hai lần, hết trần 45 giây, "tạm thời không khả dụng") là **thất bại tạm thời** nên gửi lại cùng khóa là lần thực hiện mới; chỉ "chưa có quyền" và "hết hạn mức" là kết quả được lưu cho khóa đó | K17, F41, F33, ER5, ER14, AR2, AR5; nhận nguyên tử, trần 45 giây `ASSUMPTION`; R48 |
| PRC6 | **Kiểm rule câu AI (trước khi người học thấy).** Câu có đúng một chỗ trống; mỗi dạng đáp án thuộc **dạng hợp lệ** của từ mục tiêu (PRC7); câu điền đáp án đầu tiên vào chỗ trống chứa dạng đó đúng một lần; đủ các trường; bản dịch có mặt khi người học không dùng tiếng Anh. Câu không đạt không bao giờ hiển thị | K16, F27; quy tắc dạng chia `ASSUMPTION` |
| PRC7 | **Dạng hợp lệ của một từ.** Gồm các dạng được chấp nhận của sense (CR22) và các dạng chia sinh theo bộ quy tắc cố định, áp dụng cho lemma **và cho từng biến thể chính tả được chấp nhận** (`analyse` cho `analysed`): thêm `s` hoặc `es`; đổi `y` thành `ies` hoặc `ied` **chỉ khi `y` đứng sau phụ âm**; thêm `ed` hoặc `d`; thêm `ing` có bỏ `e` hoặc gấp đôi phụ âm; cộng danh sách dạng bất quy tắc do owner duy trì. Dạng so sánh của tính từ và lemma nhiều từ (`look up`) là khoảng trống đã biết. Nguồn dữ liệu dạng chia **chưa có** (CR16), nên đây là chỗ còn mở và là rủi ro chính của việc kiểm rule | CR16, CR22; toàn bộ `ASSUMPTION` |
| PRC8 | **Ngân hàng câu.** Mỗi câu trong ngân hàng gắn với (sense, phiên bản prompt), các dạng đáp án, bản dịch **theo từng ngôn ngữ**, trạng thái (`active`, `hidden`, `removed`) và số lần bị báo lỗi. Chỉ sense catalog; chỉ câu đã qua PRC6; câu từ từ riêng tư hoặc câu ngữ cảnh của người học không bao giờ vào. Mỗi người dùng không gặp lại câu đã gặp | K17, N4, N5 |
| PRC9 | **Bản dịch thiếu.** Câu lấy từ ngân hàng mà chưa có bản dịch cho ngôn ngữ của người học thì xin AI Integration `translate_sentence` (ID dẫn xuất `operation_id#t`) **trước khi xác nhận** và lưu thêm vào câu; việc này nằm trong **cùng một đơn vị** đã giữ chỗ. Nếu dịch lỗi thì câu vẫn được phục vụ **không có bản dịch** (kết quả ghi "chưa có bản dịch") và vẫn tính đơn vị. Mỗi (câu, ngôn ngữ) chỉ có một lần dịch đang chạy tại một thời điểm; bản dịch đã lưu có thể bị báo lỗi như câu (PRC18) | N5, AR2; tính trong cùng đơn vị, chạy một lần và xử lý lỗi dịch `ASSUMPTION` |
| PRC10 | **Snapshot.** Mỗi câu hỏi của người học lưu mọi thứ cần để chấm: nội dung, dạng đáp án chấp nhận, phiên bản rubric và hồ sơ chuẩn hóa, ngôn ngữ dịch; sửa catalog sau đó không đổi câu | SR5, F36 |
| PRC11 | **Chấm bằng rule.** Chuẩn hóa đáp án: chuẩn Unicode NFC, cắt khoảng trắng, gộp khoảng trắng liên tiếp, đồng nhất dấu nháy cong thành thẳng, đưa về chữ thường; rồi so khớp chính xác với từng dạng chấp nhận **đã chuẩn hóa như vậy**. Contraction chỉ được chấp nhận khi nằm trong danh sách đáp án của câu đó (không có luật thay thế toàn cục); không chấp nhận viết tắt kiểu tin nhắn; **lỗi chính tả là sai** | F38, R45; NFC `ASSUMPTION` |
| PRC12 | **Đầu vào đáp án.** Đáp án rỗng hoặc dài hơn 100 ký tự bị từ chối bằng lỗi Problem Details (không phải "sai") | F38; số 100 `ASSUMPTION` |
| PRC13 | **Kết quả.** Chấm xong chỉ có `đúng` hoặc `sai` (không có "chưa chấm được" vì chấm bằng rule). Trả: kết quả, dạng đáp án đúng (hiện cả khi đúng), và **sau khi nộp** mới hiện bản dịch nguyên câu sang tiếng mẹ đẻ (với bài có câu) cùng định nghĩa tiếng Anh của từ nếu có, nếu không thì nghĩa của từ; không có giải thích tự do. Với sense catalog, định nghĩa là nội dung đã duyệt (N6); với từ riêng tư là nội dung người học đã lưu | F39, F40, N6 |
| PRC14 | **Một câu trả lời một lần.** Câu hỏi trả lời được một lần; sai thì hiện đáp án đúng và **không thử lại cùng câu**; người học có thể xin câu mới | F40 |
| PRC15 | **Nộp đáp án idempotent.** Mỗi lần nộp mang `Idempotency-Key`. Cùng key và cùng đáp án: trả đúng kết quả đã lưu, không chấm lại, không thêm lượt làm bài. Cùng key nhưng đáp án khác: từ chối. Câu đã được trả lời mà nộp bằng key khác: trả lỗi "đã trả lời" kèm kết quả đã lưu. Hai thiết bị nộp cùng lúc: đúng một lượt được ghi, bên kia nhận kết quả đó | F37, SR8, K2 |
| PRC16 | **Báo kết quả sang Learning.** Việc ghi lượt làm bài và cập nhật lịch ôn (báo `remembered` hoặc `forgotten` cho Learning kèm ID lượt làm bài, khóa idempotent, LR6) nằm trong **cùng một giao dịch DB** (hệ thống là modular monolith), nên không có trạng thái lượt đã ghi mà lịch chưa cập nhật; nếu giao dịch thất bại thì người học thử lại bằng cùng khóa | K22, LR6; cùng giao dịch `ASSUMPTION` |
| PRC17 | **Kết quả nào tác động vào lịch ôn.** Trả lời **sai** ở mọi dạng bài là `forgotten`. Trả lời **đúng** ở dạng cần tự nhớ (`type_word`, `ai_cloze`, `learner_cloze`) là `remembered`; trả lời đúng ở dạng chọn đáp án (`mcq_definition`, `true_false_definition`) **không** làm lịch tiến lên, vì đoán đúng khá dễ (minh họa: 1 trên 4 hoặc 1 trên 2 nếu đoán ngẫu nhiên đều): Practice **không gửi kết quả nào** sang Learning, nên lượt đó không tính vào số đã ôn hôm nay (LR7); số đo pilot về ôn tập vẫn đếm được từ lượt làm bài của Practice. Practice là bên **duy nhất** quyết định kết quả gửi sang Learning (LR6). Không bao giờ đổi trạng thái ba mức | K22, F21; phân biệt hai nhóm dạng bài là `ASSUMPTION` (tinh chỉnh K22) |
| PRC18 | **Báo câu lỗi.** Người học báo một câu họ đã thấy (hoặc bản dịch của nó) kèm mã lý do và ghi chú tùy chọn (tối đa 300 ký tự). Câu thuộc ngân hàng **bị ẩn ngay với mọi người**, số lần bị báo tăng, và owner sau đó khôi phục hoặc gỡ hẳn. Báo lỗi không đổi kết quả đã chấm. **Mọi lượt làm bài của một câu đang bị báo lỗi hoặc bị ẩn** không được tính vào mức yếu cho tới khi câu được khôi phục (khi đó các lượt tính lại). Mỗi người báo một câu một lần | K16, K17, N4, N10 |
| PRC19 | **Mức yếu.** Một sense là **yếu** với một người khi họ sai từ 2 lần trở lên trong 5 lượt chấm **được tính** gần nhất của sense đó (lượt của câu đang bị báo lỗi hoặc bị ẩn không được tính, PRC18, nên cửa sổ 5 lượt lùi xa hơn khi cần). "Từ hay sai" liệt kê các sense yếu, nhiều lần sai gần đây trước, kèm lý do dạng "sai 3 trong 5 lần gần nhất". Lỗi chính tả được tính là sai và chưa được tách riêng | K24, N10 |
| PRC20 | **Phiên luyện.** Người học chọn nguồn (một nhóm kèm lọc trạng thái, hoặc danh sách "hôm nay", hoặc "từ hay sai"), tập dạng bài và số câu (5 đến 20, mặc định 10). Thứ tự chọn từ: yếu và đến hạn, rồi đến hạn, rồi **từ mới**, rồi các từ còn lại. Loại sense retired, bị ẩn hoặc bỏ publish. Entry từ chức năng chỉ vào phiên khi người học đã tự thêm tay vào nhóm (CR10). Không có trạng thái phiên ở server; câu AI được tạo **từng câu khi được xin**, không tạo trước cả phiên | K24, F42, CR10, LR13; tạo từng câu `ASSUMPTION` |
| PRC21 | **Dạng bài khả dụng cho từng từ.** `learner_cloze` cần có câu ngữ cảnh; `ai_cloze` cần quyền AI và hạn mức; `mcq_definition` và `true_false_definition` cần đủ đáp án nhiễu (PRC3); `type_word` luôn khả dụng. Người dùng không có quyền AI mà chọn `ai_cloze` thì bị từ chối bằng lỗi nêu rõ cần quyền | F31, K23 |
| PRC22 | **Payload không lộ đáp án.** Câu hỏi gửi xuống client **không** chứa dạng đáp án chấp nhận hay bản dịch; hai thứ này chỉ trả sau khi nộp | V1_GRADING_RULES_DRAFT mục 5 (đề xuất), F39 |
| PRC23 | **Lịch sử.** Lưu mỗi lượt: câu hỏi, đáp án thô và đã chuẩn hóa, kết quả, thời điểm, dạng bài. Người học xem được lượt của chính mình (có phân trang); xóa cùng tài khoản; đáp án thô không vào log thông thường | F44, F4, SR9 |
| PRC24 | **Câu chưa trả lời.** Vẫn trả lời được sau này; câu chưa trả lời quá 30 ngày bị xóa | ASSUMPTION |
| PRC25 | **Công cụ owner.** Owner ẩn, gỡ hoặc khôi phục câu trong ngân hàng theo ID, theo sense, hoặc theo phiên bản prompt (để rút nhanh một lô câu xấu) | K17, AR12; thao tác theo phiên bản prompt `ASSUMPTION` |
| PRC26 | **Sense không còn publish.** Câu trong ngân hàng của sense bị retire hoặc bỏ publish chuyển `hidden`; câu hỏi đang làm vẫn chấm theo snapshot | CR17, SR5 |
| PRC27 | **Xóa tài khoản.** Xóa lượt làm bài, câu hỏi của người đó, danh sách câu đã gặp, và gỡ liên kết người dùng khỏi các báo lỗi đã gửi (nội dung báo lỗi giữ ẩn danh); câu trong ngân hàng không chứa dữ liệu cá nhân nên giữ nguyên | K3, SR11; giữ báo lỗi ẩn danh `ASSUMPTION` |
| PRC28 | **Xóa từ riêng tư.** Khi Content báo một từ riêng tư bị xóa, Practice xóa câu hỏi, lượt làm bài, danh sách câu đã gặp liên quan và câu ngữ cảnh của người đó, vì snapshot chứa lemma và nghĩa riêng | CR23; `ASSUMPTION` |

## Acceptance criteria — «When … then …»

| # | Criterion | Cites |
|---|---|---|
| Q1 | When a multiple-choice question is made, then it has one correct word and three distractors drawn from published catalog senses of the same part of speech and the same or an adjacent level, never function words, never a sense with the same lemma ignoring case, and never another learner's private words | PRC3 |
| Q2 | When fewer than three distractor candidates exist, then the band is widened to ±2 and then to any level, and if still fewer than three the type is skipped for that word | F42 |
| Q3 | When a true/false question is made, then the false pairing uses the meaning of a different sense | F42 |
| Q4 | When a learner types `  Deploys ` for a sense whose accepted forms include `deploys`, then it is normalised and graded correct; when they type `deploi`, then it is graded wrong, with no tolerance for misspelling | F38 |
| Q5 | When the learner answers `I'm` and the accepted forms of that question list both `I am` and `I'm`, then it is correct; when the list has only one of them, then only that one is correct | R45 |
| Q6 | When the learner answers `ty` for `thank you`, then it is wrong | F38 |
| Q7 | When the answer is empty or longer than 100 characters, then the submission is refused with a Problem Details error and no attempt is recorded | PRC12 (`ASSUMPTION`) |
| Q8 | When a question is sent to the client, then the accepted answers and the translation are not in the payload; when the answer is submitted, then the result returns the correct form, the translation and the English definition | F39 |
| Q9 | When a wrong answer is submitted, then the correct form is shown and the same question cannot be answered again | F40 |
| Q10 | When the same submission is sent twice with the same `Idempotency-Key` and the same answer, then one attempt exists and the same result is returned | F37 |
| Q11 | When the same `Idempotency-Key` is used with a different answer, then the call is rejected and the first result stands | F37 |
| Q12 | When two devices submit different answers for the same question at the same time, then exactly one attempt is recorded and the other device receives that result | F37 |
| Q13 | When a Free user asks for an AI cloze question, then the request is refused with the entitlement-required error and no unit is held | F31 |
| Q14 | When a valid unseen bank question exists for the sense, then it is served without any AI call and the unit is confirmed | PRC5 |
| Q15 | When no bank question qualifies, then one is generated, must pass the rule checks, is stored for the learner, is added to the bank if the sense is in the catalog, and the unit is confirmed | K17 |
| Q16 | When a generated question fails the rule checks twice, then the learner sees "could not create", the reservation is released and nothing is saved | F41 |
| Q17 | When the provider fails or times out, then the learner sees "could not create", the reservation is released, and no result is ever recorded as a wrong answer | F41 |
| Q18 | When the target is a learner's private word, then an AI question may be generated for that learner but is never added to the bank | N4 |
| Q19 | When a learner-cloze question is made from a context sentence that is usable for cloze, then it needs no AI and no unit, and the accepted forms are the form that appears in the sentence plus accepted spelling variants, not other inflections | K23 |
| Q20 | When a learner reports a bank question, then it is hidden for everyone at once, the grade already given is unchanged, and the attempts on that question stop counting towards weakness until it is restored | PRC18 |
| Q21 | When the owner restores or removes a hidden question, then it becomes active again or is deleted from the bank | PRC25 (`ASSUMPTION`) |
| Q22 | When a learner answers a sense wrongly twice in their last five counted attempts, then it appears in "frequently wrong" with the reason, and attempts of reported or hidden questions are not counted | N10 |
| Q23 | When a session is built, then words are taken in the order: weak and due, due, new, others, and retired or hidden senses are excluded | K24 |
| Q24 | When a recognition question (multiple-choice or true/false) is answered correctly, then the schedule does not move up, and when it is answered wrongly, then the item is treated as forgotten | PRC17 (`ASSUMPTION`) |
| Q25 | When a production question (type-the-word or either cloze) is answered correctly, then the item is reported as remembered, once per attempt ID | K22 |
| Q26 | When a bank question has no translation in the learner's language, then a translation is made before the unit is confirmed and stored within the same reserved unit; when the translation fails, then the question is still served without a translation and the unit is still counted | PRC9 (`ASSUMPTION`) |
| Q27 | When the catalog sense is edited or retired after a question was created, then that question is still graded against its snapshot | F36 |
| Q28 | When a learner asks for AI questions on the same sense again, then they never receive a bank question they have already seen | K17 |
| Q29 | When a learner lists their history, then only their own attempts are returned | SR9 |
| Q30 | When a learner deletes the account, then their attempts, questions and seen records are removed and the bank questions stay | K3 |
| Q31 | When the owner turns AI exercise types on for pilot users, then an evaluation record exists | AR13 (`ASSUMPTION`) |
| Q32 | When a learner deletes a private word, then the questions, attempts and context sentences that contain its lemma or gloss are removed | CR23 (`ASSUMPTION`) |
| Q33 | When two requests for AI questions on the same sense arrive at once from two devices, then they receive different bank questions or one is generated, never the same question twice | PRC5 (`ASSUMPTION`) |
| Q34 | When creating an AI question takes longer than 45 seconds in total, then the flow stops, the reservation is released and the learner sees "could not create" | PRC5 (`ASSUMPTION`) |
| Q35 | When the AI feature switch is off or the daily budget is reached, then no AI question is served, not even from the bank, and no unit is held | ER14 (`ASSUMPTION`) |
| Q36 | When a learner sends the same key again after "could not create", then the flow runs again from the reservation step instead of returning the stored failure | SR8 (`ASSUMPTION`) |

## Edge cases

| # | Edge case | Expected | Cites |
|---|---|---|---|
| QE1 | The sense is `analyze/analyse` and the learner types `analyse` | Correct, because the spelling variants are accepted forms | R6 |
| QE2 | Two senses share a lemma (for example two meanings of `bank`) | Distractors never include a sense of the same lemma; each sense is tracked and graded separately | PRC3 |
| QE3 | A sentence has two valid answers and only one is listed | Any other valid synonym is graded wrong; the learner can report the question | F38 |
| QE4 | The blank expects `deployed` and the learner types `deploy` | Wrong, because only the listed forms are accepted | F38 |
| QE5 | The model returns a valid irregular form such as `went` for `go`, or `analysed` for `analyze/analyse`, that the rule set does not know | The question is rejected by the rule check and regenerated once, which wastes cost; the owner can add the form to the irregular list | PRC7 (`ASSUMPTION`) |
| QE6 | A bank question's sense is retired | The bank question becomes hidden; questions already given still grade by snapshot | PRC26 |
| QE7 | The learner changes native language after a question was created | The question keeps the translation language of its snapshot; a new question uses the new language | ASSUMPTION |
| QE8 | The learner leaves the app while a question is being generated | The server finishes, the result is stored by `operation_id`, and the question can be answered later | AR5 |
| QE9 | The learner double-clicks "new question" without a retry key | Two separate requests are two questions and two units; the client must reuse the key on a real retry | SR8 |
| QE10 | The learner types the apostrophe as `’` or the word with a capital `I` | Normalised to a straight apostrophe and lowercase before comparison | F38 |
| QE11 | Someone sends many reports in a short time | The request rate is limited per user | SR14 |
| QE12 | A reported question had already been answered correctly and had moved the schedule | The schedule is not reverted; only the weakness count ignores the attempt | PRC18 |

## Defense Analysis

Chưa chạy thử; chưa gọi AI thật. Vùng này nằm trong danh sách "cần Defense Analysis trước khi chốt spec" của chủ dự án (chấm bài, lỗi AI, idempotency khi nộp đáp án).

**Đường đi bình thường.** Người học xin một câu → (nếu AI) giữ chỗ → có câu từ ngân hàng hoặc sinh mới → hiển thị không kèm đáp án → người học nộp bằng khóa → chấm bằng rule → ghi lượt và cập nhật lịch trong một giao dịch → hiển thị kết quả, bản dịch, định nghĩa.

**Bất biến.** (1) Mỗi câu hỏi được trả lời tối đa một lần và có tối đa một lượt làm bài. (2) Không bao giờ có "sai" do lỗi hệ thống. (3) Payload câu hỏi không chứa đáp án. (4) Câu từ nội dung riêng không bao giờ vào ngân hàng chung. (5) Mỗi đơn vị giữ chỗ được xác nhận hoặc nhả. (6) Cùng một người không nhận hai lần cùng một câu ngân hàng. Nguồn phân tích gốc: `V1_GRADING_RULES_DRAFT.md` mục 6, điều chỉnh vì chấm bằng rule thay cho chấm bằng AI.

| Case | Hành vi bảo vệ | Phát hiện → khôi phục | Kiểm chứng dự kiến |
|---|---|---|---|
| Đáp án rỗng hoặc quá dài | Từ chối bằng lỗi dữ liệu vào, không tính sai, không tạo lượt (PRC12) | Mã lỗi | Câu trắng, dán đoạn dài |
| Contraction, hoa thường, dấu nháy, đa nghĩa | Chuẩn hóa một chiều và so với danh sách dạng chấp nhận của câu (PRC11) | Đối chiếu bộ ví dụ có nhãn | `I'm` và `I am`, `’` và `'`, `bank` hai nghĩa |
| AI sinh câu sai (đúng cấu trúc nhưng sai nghĩa, hai đáp án hợp lý) | Kiểm rule (PRC6) và nút báo lỗi ẩn câu ngay (PRC18); kiểm bằng AI lần hai chỉ xét sau pilot (K16) | Tỉ lệ báo lỗi mỗi 100 câu | Bộ ví dụ có người duyệt (AR13) |
| Kiểm rule loại nhầm câu đúng (dạng bất quy tắc) | Sinh lại một lần; owner bổ sung danh sách bất quy tắc (PRC7, QE5) | Tỉ lệ câu bị loại và chi phí sinh lại | Câu có `went`, `children` |
| Model trả sai format hoặc mâu thuẫn | AI Integration kiểm hình dạng và thử lại (AR9); Practice kiểm ngữ nghĩa (PRC6); không thành công thì nhả giữ chỗ (PRC5) | Tỉ lệ đầu ra không hợp lệ | Adapter giả trả JSON hỏng |
| Nộp hai lần hoặc hai thiết bị nộp khác nhau | Một lượt duy nhất theo key và theo câu; bên sau nhận kết quả đã lưu (PRC15) | Số lần trùng key | Bấm đúp; hai thiết bị nộp khác đáp án |
| Provider có kết quả nhưng DB chưa ghi | Kết quả AI lưu theo `operation_id` để hỏi lại không tốn lần hai (AR5); giữ chỗ hết hạn thì không trừ người dùng (ER5) | So khớp chi phí và sổ lượt dùng | Ngắt sau khi provider trả lời |
| Lượt làm bài đã ghi nhưng cập nhật lịch ôn thất bại | Trả kết quả cho người học; thử lại idempotent theo ID lượt (PRC16, LR6) | Bản ghi chưa áp dụng | Ngắt giữa ghi lượt và cập nhật lịch |
| Timeout và retry khi tạo câu | Deadline và một lần thử lại ở AI Integration (AR3); người học thấy "chưa tạo được", không bao giờ "sai" (PRC5, F41) | Độ trễ và tỉ lệ lỗi | Provider chậm hoặc lỗi |
| Hết trial hoặc đua hạn mức khi đang làm | Quyền kiểm lúc tạo (ER4); chấm không cần quyền (E12 của Entitlements); giữ chỗ nguyên tử (ER5) | Nhật ký sổ lượt dùng | Hết trial giữa tạo câu và nộp đáp án |
| Chỉ thị chèn vào dữ liệu | Từ riêng tư và câu của người học là dữ liệu; đầu ra chỉ nhận khi đúng cấu trúc; câu từ nội dung riêng không vào ngân hàng chung (AR8, PRC8) | Kiểm thử đối kháng | Từ chứa "bỏ qua mọi quy tắc" |
| Lộ đáp án qua payload hoặc gian lận | Câu hỏi gửi xuống không có đáp án và bản dịch (PRC22) | Rà soát payload | Gọi API câu hỏi và kiểm các trường |
| Đoán may làm lịch ôn tăng giả | Đúng ở dạng chọn đáp án không đẩy lịch lên (PRC17) | Theo dõi tỉ lệ đúng theo dạng bài | Trả lời đúng một câu trắc nghiệm rồi xem lịch |
| Câu lỗi làm một từ bị coi là yếu oan | Loại lượt của câu bị báo lỗi, cần ít nhất 2 lần sai (PRC19, N10) | Tỉ lệ báo lỗi theo câu | Một câu lỗi bị nhiều người sai |
| Một lô câu xấu đã vào ngân hàng | Owner ẩn theo phiên bản prompt hoặc theo sense (PRC25) | Báo lỗi tăng đột biến | Ẩn theo phiên bản prompt |
| Rò dữ liệu riêng qua ngân hàng chung | Chỉ sense catalog vào ngân hàng; câu từ từ riêng tư và câu ngữ cảnh không bao giờ vào (PRC8) | Kiểm thử đối kháng | Tạo câu AI cho từ riêng tư rồi kiểm ngân hàng |
| Quan sát | Log theo `operation_id`, dạng bài, kết quả, độ trễ; không ghi đáp án thô (PRC23, F4). Số đo: tỉ lệ sinh thành công, tỉ lệ trúng ngân hàng, tỉ lệ báo lỗi theo dạng bài, độ chính xác theo dạng bài, độ chính xác lần hai của từ yếu | Báo cáo hằng ngày | Tìm một lượt qua `operation_id` |
| Hoàn tác | Quay về phiên bản prompt cũ bằng cấu hình, ẩn câu của phiên bản xấu (AR12, PRC25); không chấm lại âm thầm lịch sử | Báo lỗi tăng sau khi đổi | Chạy lại bộ ví dụ với hai phiên bản |
| Tạo lại câu dùng chính kết quả cũ | ID dẫn xuất `operation_id#1`, `#2` cho từng lần tạo (PRC5, AR5) | — | Kiểm rule không đạt rồi tạo lại |
| Hai yêu cầu song song nhận cùng một câu ngân hàng | Nhận nguyên tử theo cặp (người học, câu) (PRC5, Q33) | Số lần nhận trùng | Hai thiết bị cùng xin câu cho một từ |
| Hai người cùng thêm bản dịch cho một câu | Mỗi (câu, ngôn ngữ) chỉ một lần dịch đang chạy; lỗi dịch không làm mất câu (PRC9) | — | Hai yêu cầu cùng ngôn ngữ mới |
| Client hết thời gian chờ khi tạo câu rồi gửi lại | Gửi lại cùng khóa: nếu lần đầu còn chạy thì nhận "đang xử lý", nếu đã xong thì nhận đúng câu đó, nếu lỗi tạm thì là lần thực hiện mới (SR8, PRC5); trần 45 giây cho cả luồng | Số yêu cầu "đang xử lý" | Ngắt kết nối giữa chừng rồi gửi lại |
| Báo lỗi bị lạm dụng | Mỗi người báo một câu một lần, giới hạn tần suất (PRC18, SR14); owner xem danh sách | Số báo lỗi bất thường theo người | Một người báo hàng loạt câu |

**Phương án thay thế và vì sao bị loại (ngắn).** (a) AI chấm đáp án: bị loại ở K15 và F32 vì tốn lượt, kém nhất quán, rủi ro chấm nhầm. (b) Chấp nhận mọi từ đồng nghĩa hoặc mọi dạng của lemma: bị loại vì chấm sai nghĩa; thay bằng danh sách dạng chấp nhận có duyệt và nút báo lỗi. (c) Sinh trước cả phiên: bị loại vì tốn lượt cho câu không dùng (PRC20).

### Bổ sung theo mẫu Defense Analysis (05/10/2026)

Theo `docs/preparation/DECISION_ANALYSIS_TEMPLATE.md`. Gồm hai vùng của Practice: chấm bài và lỗi AI, và idempotency khi nộp đáp án. Chưa chạy thử; con số dung lượng là ước tính từ giả định sử dụng.

| Nhóm case | Phân tích |
|---|---|
| Tiến hóa và tương thích | Dạng bài mới là một handler mới với `type` và `payload_schema_version` mới; client phải chịu `type` lạ (PRC1, SR7), nên client cũ không hỏng. Ngôn ngữ học mới cần hồ sơ chuẩn hóa và bộ dạng hợp lệ riêng; hiện chỉ có hồ sơ tiếng Anh, được ghi trong snapshot (PRC10). Đổi rubric hoặc phiên bản chuẩn hóa không chấm lại lịch sử: câu cũ chấm theo snapshot của nó. Thêm ngôn ngữ dịch không đổi câu, chỉ thêm bản dịch theo từng ngôn ngữ (PRC8, PRC9) |
| Năng lực và chi phí vận hành | Lượt làm bài lớn dần: với giả định 50 người, 30 lượt mỗi người mỗi ngày, 50 × 30 × 365 = 547.500 lượt mỗi năm (`ASSUMPTION` về mức sử dụng); cần chỉ mục theo (người học, sense, thời gian) cho truy vấn 5 lượt gần nhất của mức yếu (PRC19). Đáp án nhiễu chỉ lấy từ sense **đã publish** (PRC3), tức khoảng 300–500 ở pilot chứ không phải cả danh sách nguồn; truy vấn rẻ, nhưng với loại từ ít gặp (adverb, adjective ở C1–C2) có thể thiếu 3 ứng viên và phải nới band hoặc bỏ dạng bài. Cần đếm lại sau khi có gói pilot thật. Tỉ lệ trúng ngân hàng quyết định chi phí AI: càng cao càng ít lời gọi (K17); chưa đo. Mỗi lượt nộp là một ghi đồng bộ gồm cả cập nhật lịch ôn trong cùng giao dịch (PRC16) |
| Đánh đổi chấp nhận | Không dung sai chính tả (F38): chặt, dễ gây bực nhưng nhất quán và không phải đoán; câu đúng bị loại nhầm do thiếu dạng bất quy tắc (QE5) đổi lấy việc không cần nguồn dạng chia; đúng ở trắc nghiệm không đẩy lịch (PRC17) đổi lấy lịch không tăng giả |

**So sánh phương án chấm và nguồn câu**

| Phương án | Đáp ứng yêu cầu | Hạn chế | Chi phí và vận hành | Lý do |
|---|---|---|---|---|
| Chấm A. Bằng rule (đã chọn) | Nhất quán, không tốn lượt AI, không phụ thuộc provider | Cần danh sách dạng chấp nhận, loại nhầm khi thiếu dạng | Thấp | Chọn (K15, F32) |
| Chấm B. Bằng AI | Linh hoạt với câu mở | Tốn lượt, kém nhất quán, rủi ro chấm nhầm | Cao | Loại |
| Chấm C. Rule trước, AI khi không khớp | Giảm loại nhầm | Phức tạp, vẫn tốn lượt | Trung bình | Chưa cần |
| Nguồn câu A. Sinh theo từng người | Đa dạng | Tốn lượt mỗi câu | Cao | Một phần của hybrid |
| Nguồn câu B. Ngân hàng dùng chung | Rẻ, duyệt trước được | Ít đa dạng, câu xấu lan nhanh | Thấp | Một phần của hybrid |
| Nguồn câu C. Hybrid (đã chọn, K17) | Ngân hàng trước, sinh khi thiếu | Cần theo dõi câu đã gặp và báo lỗi | Trung bình | Chọn |

**Runbook tối thiểu cho lỗi chấm hoặc câu AI.** Phát hiện: tỉ lệ báo lỗi mỗi 100 câu theo dạng bài và phiên bản prompt tăng, tỉ lệ kiểm rule loại câu tăng. Chẩn đoán: xem các câu bị báo, phiên bản prompt, phần dạng hợp lệ nào thiếu. Xử lý: ẩn theo phiên bản prompt hoặc theo sense (PRC25), bổ sung dạng chấp nhận hoặc danh sách bất quy tắc, quay về prompt cũ. Không chấm lại âm thầm lịch sử. Xác minh: chạy lại bộ ví dụ có người duyệt (AR13); tỉ lệ báo lỗi giảm.

**Runbook tối thiểu cho nộp đáp án trùng.** Phát hiện: số lần trùng `Idempotency-Key` và số lỗi "đã trả lời". Chẩn đoán: tra lượt làm bài theo `operation_id` và câu hỏi. Xử lý: kết quả đã lưu là chuẩn, không chấm lại; nếu cập nhật lịch ôn bị thiếu thì chạy lại bước báo kết quả theo ID lượt (PRC16, LR6). Xác minh: mỗi câu có đúng một lượt và một lần cập nhật lịch.

**Câu hỏi còn mở.** Tỉ lệ đoán đúng thực tế ở trắc nghiệm; danh sách dạng bất quy tắc cần bao nhiêu mục; ngưỡng đánh giá chất lượng câu AI (chưa có tập nhãn); nguồn dữ liệu dạng chia (CR16) vẫn chưa có.

## Cross-module contract notes

| Với module | Practice hứa hoặc cần |
|---|---|
| Entitlements & Usage | Cần `kiểm quyền`, `giữ chỗ`, `xác nhận`, `nhả` cho `ai.practice`; Practice **luôn** xác nhận hoặc nhả mỗi giữ chỗ; bài không AI chỉ cần `practice.basic` |
| AI Integration | Cần `generate_cloze` và `translate_sentence` với `operation_id`; Practice kiểm ngữ nghĩa kết quả (PRC6) và chuyển mọi lỗi thành "chưa tạo được" |
| Vocabulary Content | Cần sense `published`, nghĩa theo ngôn ngữ, định nghĩa tiếng Anh, level, loại từ, cờ từ chức năng, dạng được chấp nhận (CR22), biến thể chính tả, câu ngữ cảnh của người học (CR14); không dùng nội dung riêng của người khác |
| Learning | Cần nhóm, trạng thái, danh sách "hôm nay" làm nguồn câu hỏi; **gửi** kết quả ôn `remembered` hoặc `forgotten` kèm ID lượt làm bài; không bao giờ đổi trạng thái |
| Identity & Access | Dùng user ID, tiếng mẹ đẻ (ngôn ngữ dịch) và múi giờ; nhận lệnh xóa dữ liệu theo người dùng |
| Content Pipeline | Không giao tiếp trực tiếp |

## Provenance markers used above

- **K#** — quyết định đã chốt; **N#, F#** — mặc định hoặc đề xuất mang nhãn riêng ở nguồn (N10, N11 là `ASSUMPTION`; nhiều F# có con số là `ASSUMPTION`; F43b là bổ sung ở DECISIONS mục 5); **R#** — finding trong `research.md` (R6 là `verified`; R43, R45 là `documented (02/10)`).
- **S#, SR#, C#, CR#, LR#, ER#, AR#** — spec khác. **ASSUMPTION** — không có nguồn; được mang vào báo cáo cuối.
