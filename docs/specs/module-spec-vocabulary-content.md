# Module spec — Vocabulary Content

> Sinh bởi `write-spec`, lần chạy `v1-specs`, đợt 1. Mẫu `module-spec.md`. Cách trích dẫn: **K#, N#, F#** =
> [DECISIONS](DECISIONS_2026-10-04.md) và [kế hoạch](SPEC_PLAN_AND_DECISIONS_2026-10-04.md); **R#** =
> [research.md](../tasks/v1-specs/research.md); **S#** = [system-spec](system-spec.md); **ASSUMPTION** = chưa có nguồn.

**Ngày:** 2026-10-04 · **Module:** Vocabulary Content · **Spec run:** v1-specs

## Observed on

Không có hệ thống tham chiếu. Các số về dữ liệu nguồn được đo bằng script ngày 04/10/2026 (R1–R8).

| Surface | How accessed | By whom | When |
|---|---|---|---|
| `cefrj-vocabulary-profile-1.5.csv`, `octanove-vocabulary-profile-c1c2-1.0.csv` | Script Python đọc file CSV | Trợ lý | 04/10/2026 |
| Quyết định về nội dung (K1b, K4, K10–K12, K19, K20, K23) | Chat | Chủ dự án | 02–04/10/2026 |

## Scope

Module sở hữu **catalog từ vựng và từ riêng tư**: entry, sense, text theo ngôn ngữ, ví dụ, level, topic, nguồn
và giấy phép; vòng đời `draft → reviewed → published`; điều kiện publish; từ chức năng; tìm kiếm và duyệt;
sửa sau khi publish; **thêm nhanh từ gặp phải** qua chuỗi tra nghĩa (catalog → nguồn ngoài → AI → tự nhập);
câu ngữ cảnh của người học. Ranh giới: nhập hàng loạt, job nền và quy trình duyệt của owner thuộc **Content
Pipeline**, chỉ ghi vào Content qua thao tác publish; thêm vào nhóm và lịch ôn thuộc **Learning**; sinh câu
hỏi thuộc **Practice**.

**Ngoài phạm vi V1:** phrasal verb, collocation, idiom với ngữ nghĩa riêng (chỉ có cột `entry_type`, chỉ nhận
`word`); ngôn ngữ học khác tiếng Anh; AI soạn nháp (K1b); chọn provider từ điển ngoài (K20, điều kiện chặn khi
build, không phải điều kiện của spec); phát âm và âm thanh; nguồn dạng chia của từ (còn mở, xem CR16).

## Constraints

| Constraint | Imposed by | Why it is not the implementer's choice |
|---|---|---|
| Ghi nguồn và giấy phép từng mục level; dòng Octanove không sửa trực tiếp; điều khoản app không cấm sao chép phần dữ liệu CC BY-SA | Giấy phép CEFR-J, Octanove (R13, R14) | Điều kiện sử dụng dữ liệu |
| Cột `entry_type` tồn tại, V1 chỉ nhận `word` | Chủ dự án (K2) | Chuẩn bị mở rộng, khó đổi sau |
| Cấu trúc entry → sense → text theo ngôn ngữ; tiến độ bám sense ID | Chủ dự án (schema D) | Đã chốt 02/10 |
| Nội dung từ provider ngoài chỉ dùng khi giấy phép cho lưu vào từ riêng tư của từng người dùng | Điều khoản của provider (chưa chọn) | Không biết trước; chặn bước nguồn ngoài của chuỗi tra nghĩa nếu không đạt |
| Dữ liệu nguồn có định dạng CSV: `headword, pos, CEFR` (+ cột phụ) | Nguồn dữ liệu (R1) | Hình dạng file |

## Business rules

| # | Quy tắc | Nguồn |
|---|---|---|
| CR1 | **Danh tính entry.** Entry xác định bởi (ngôn ngữ, lemma, loại từ). **Lemma phân biệt hoa thường**: `March` (tháng) khác `march`. Lemma có thể gồm nhiều từ (`according to`) và được cắt khoảng trắng đầu cuối. Entry mang một danh sách **biến thể**: biến thể chính tả (`analyze/analyse`) và bí danh hoặc viết tắt (`check-in counter` với `check-in`). Mỗi biến thể có cờ **chấp nhận làm đáp án**: bật mặc định cho biến thể chính tả, tắt khi owner đánh dấu là bí danh. Tìm kiếm khớp mọi biến thể; một biến thể có thể thuộc nhiều entry và khi đó chỉ dùng để tìm | R3, R4, R5, R6; cách lưu và cờ chấp nhận `ASSUMPTION` |
| CR2 | **Loại mục.** `entry_type` chỉ nhận `word` ở V1; giá trị khác bị từ chối | K2 |
| CR3 | **Phạm vi.** Mỗi entry là `catalog` (không chủ) hoặc `private` (một người học). Server quyết định phạm vi và chủ sở hữu, không tin client | SR9 |
| CR4 | **Vòng đời.** Sense catalog: `draft → reviewed → published`, ngoài ra `rejected` và `retired`. Chỉ `published` hiện với người học. Từ riêng tư không qua duyệt, hiện ngay với chủ của nó | F22 |
| CR5 | **Điều kiện publish.** Có nghĩa tiếng Việt (`gloss`), ít nhất một ví dụ tiếng Anh, ít nhất một level, ít nhất một chủ đề. Tùy chọn: định nghĩa tiếng Anh, nhãn ngữ cảnh ngắn. Thiếu thì publish bị từ chối kèm danh sách thiếu | K10 |
| CR6 | **Số nghĩa ở pilot.** Mỗi (từ, loại từ) có một nghĩa chính; mô hình cho nhiều nghĩa; mỗi sense có nhãn ngữ cảnh tùy chọn (ví dụ "tài chính", "địa lý") để phân biệt nghĩa | K10 |
| CR7 | **Text theo ngôn ngữ.** Mỗi (sense, ngôn ngữ) có tối đa một text hiện hành, kèm revision và trạng thái duyệt. V1: tiếng Việt (bắt buộc để publish) và tiếng Anh (định nghĩa, tùy chọn). Hiển thị theo tiếng mẹ đẻ: nghĩa ở ngôn ngữ đó nếu có; không thì định nghĩa tiếng Anh nếu có; không thì nghĩa tiếng Việt kèm nhãn "chưa có bản dịch" | K4; bước cuối `ASSUMPTION` |
| CR8 | **Level.** CEFR A1–C2, gắn ở mức entry (từ + loại từ). Mỗi bản ghi level lưu nguồn, phiên bản, giấy phép. Dòng import **không bao giờ bị sửa**; level biên tập là bản ghi riêng với cơ sở `editorial`. Khi hai nguồn cho level khác nhau cho cùng (lemma, loại từ) thì giữ cả hai và hiển thị mặc định theo CEFR-J; owner rà và ghi đè được. Từ riêng tư: level tùy chọn, nguồn `user` | R2, R13, R14; ưu tiên CEFR-J `ASSUMPTION` |
| CR9 | **Chủ đề.** Danh sách có kiểm soát, owner quản lý (khởi đầu: technology, marketing, business, food, daily life); một sense có nhiều chủ đề; ID chủ đề ổn định, tên theo ngôn ngữ; người học không tạo chủ đề nhưng chọn từ danh sách cho từ riêng tư | F13 |
| CR10 | **Từ chức năng.** Cờ ở mức entry, suy ra khi import từ loại từ thuộc {pronoun, preposition, determiner, conjunction, modal auxiliary, be-verb, do-verb, have-verb, infinitive-to} (274 dòng trong CEFR-J 1.5 và 6 dòng trong Octanove 1.0); `number` và `interjection` không gắn cờ. Owner ghi đè từng entry. Entry có cờ **không được chọn vào bộ học tự động**: thêm hàng loạt theo level hoặc chủ đề, và nguồn câu hỏi chọn theo level hoặc chủ đề. Chúng **vẫn hiện** khi tìm kiếm và duyệt, có nhãn. Một entry người học **đã tự thêm tay** vào nhóm thì được học và luyện như mọi từ khác, vì thêm tay là lựa chọn rõ ràng của họ | K11, R7; cách hiểu "bộ học mặc định" là phần chọn tự động `ASSUMPTION` (đã nêu ở DECISIONS mục 9) |
| CR11 | **Tìm kiếm.** Không phân biệt hoa thường; khớp tiền tố và chứa trên lemma và biến thể; không stemming hay fuzzy; trả sense `published` cộng từ riêng tư của chính người hỏi; có phân trang; mỗi kết quả kèm loại từ và level | F16, S2 |
| CR12 | **Duyệt.** Lọc theo level, chủ đề, loại từ; chỉ `published`; mặc định **gồm cả** entry có cờ từ chức năng kèm nhãn (có tham số để loại chúng ra); thứ tự ổn định theo lemma rồi loại từ | F16 (đã điều chỉnh), K11; thứ tự `ASSUMPTION` |
| CR13 | **Từ riêng tư.** Bắt buộc có nghĩa; loại từ, level, chủ đề tùy chọn. Trùng (lemma, loại từ) với entry catalog thì gợi ý dùng bản catalog nhưng vẫn cho tạo riêng; việc so "cùng lemma" cho cảnh báo trùng không phân biệt hoa thường (`Software` với `software`). Tối đa 1.000 từ mỗi người; nội dung riêng không bao giờ tự vào catalog. Giới hạn độ dài: lemma 100 ký tự, nghĩa 300 ký tự | F15; con số và so sánh không phân biệt hoa thường `ASSUMPTION` |
| CR14 | **Câu ngữ cảnh.** Người học gắn một câu (tối đa 300 ký tự, tối đa 5 câu mỗi sense) vào một sense; câu **luôn được lưu**. Câu **dùng được cho bài điền từ** khi có một token trùng nguyên vẹn, không phân biệt hoa thường, với lemma, một biến thể được chấp nhận, một dạng được chấp nhận (CR22) hoặc một dạng hợp lệ theo Practice (PRC7); nếu không có thì câu vẫn lưu nhưng bị đánh dấu "chưa dùng được cho bài điền từ" kèm lý do. Chỉ chủ sở hữu thấy; không bao giờ vào catalog hay ngân hàng câu chung; xóa cùng tài khoản | K23, N11; "5 câu" và cách khớp token `ASSUMPTION` |
| CR15 | **Chuỗi tra nghĩa khi thêm từ mới.** (1) catalog và từ riêng tư của chính người học; (2) nguồn từ điển ngoài nếu có cấu hình; (3) AI tra nghĩa nếu người học có quyền AI; (4) tự nhập. Nếu catalog đã có từ nhưng không đúng nghĩa người học gặp, họ chọn **"không phải nghĩa này"** để đi tiếp bước 2 đến 4. Kết quả bước 2 và 3 chỉ là **gợi ý**: người học xác nhận hoặc sửa, rồi lưu thành từ riêng tư có ghi nguồn; không bao giờ publish. Bước nào vắng hoặc lỗi thì chuyển bước sau; lỗi không bao giờ chặn tự nhập. Bước 3 do **Content điều phối hạn mức**: giữ chỗ `ai.lookup` bằng `operation_id` của yêu cầu tra, gọi `lookup_word`, **xác nhận** khi AI trả kết quả hợp lệ (đơn vị tính ngay lúc đó, không đợi người học xác nhận gợi ý), **nhả** khi lỗi; gửi lại cùng `operation_id` sau một thành công trả kết quả đã lưu, không gọi provider lần hai. Người học không có quyền AI thì bỏ qua bước 3. Bước nào có mặt tại thời điểm build do K20 quyết | K20, N13, SR8, ER5; "không phải nghĩa này" và thời điểm tính đơn vị `ASSUMPTION` (đã nêu ở DECISIONS mục 9) |
| CR16 | **Dạng chia và biến thể.** Khi người học nhập một dạng chia (`deployed`) hoặc biến thể Anh/Mỹ, hệ thống đưa về lemma nếu dạng đó đã biết; nguồn dữ liệu dạng chia **chưa có**. Biến thể chính tả của CEFR-J là dạng đã biết. Dạng chưa biết được coi là từ mới và đi vào chuỗi tra nghĩa | N12 (mở), R6; `ASSUMPTION` |
| CR17 | **Sửa sau publish.** Mọi chỉnh sửa một sense đã publish (lỗi chính tả, định dạng, đổi nội dung nhỏ), dù từ giao diện hay CSV, tạo một **revision bản nháp** cùng sense ID; nội dung hiển thị chỉ đổi khi owner publish revision (có thao tác "publish nhanh" một bước). "Thay nghĩa": tạo sense mới ở `draft`; khi nó được publish thì sense cũ chuyển `retired`. Sense retired vẫn nằm trong nhóm của người đã có, kèm nhãn "nghĩa đã đổi", không được đưa vào phiên học mới; không tự chuyển tiến độ. Bỏ publish không thay thế: ẩn khỏi duyệt và bộ học, vẫn nằm trong nhóm với nhãn | F14, SR6; mọi sửa đều qua revision `ASSUMPTION` (thay cho "hiện ngay" ở bản đầu) |
| CR18 | **Nguồn và ghi nhận.** Mọi bản ghi level và text lưu nguồn. Có một màn hình "Nguồn dữ liệu & giấy phép" liệt kê nguồn, phiên bản, giấy phép, ghi nhận tác giả; là điều kiện trước khi public | F17, R13, R14, SR15 |
| CR19 | **Thao tác admin.** Tạo và sửa bản nháp, đánh dấu `reviewed`, publish, bỏ publish, retire, ghi đè cờ từ chức năng, quản lý chủ đề. Chỉ admin. Publish là nguyên tử cho từng sense; publish theo lô xử lý từng mục độc lập | K1, S7; lô `ASSUMPTION` |
| CR20 | **Khóa duy nhất của catalog.** (ngôn ngữ, lemma phân biệt hoa thường, loại từ) duy nhất trong catalog. Dòng nguồn có (lemma, loại từ) trùng khóa này là cập nhật chứ không tạo entry mới | R3; ràng buộc import là của Pipeline |
| CR21 | **Xóa tài khoản.** Xóa từ riêng tư, text và ví dụ riêng, câu ngữ cảnh của người học đó; catalog không đổi | K3, S10 |
| CR22 | **Dạng được chấp nhận.** Mỗi sense có danh sách dạng được chấp nhận cho bài gõ từ và bài điền từ: mặc định gồm lemma và các biến thể được bật cờ chấp nhận (CR1); owner thêm được dạng chia hoặc dạng khác đã duyệt (ví dụ `deployed`). Từ riêng tư: lemma và biến thể người học nhập | K15, R6; mặc định `ASSUMPTION` |
| CR23 | **Xóa từ riêng tư.** Khi người học xóa một từ riêng tư, Content xóa entry, nghĩa, ví dụ và câu ngữ cảnh của nó, và báo để Learning và Practice xóa mục học, thành viên nhóm, lịch ôn, câu hỏi và lượt làm bài liên quan | K3 (cùng nguyên tắc xóa dữ liệu cá nhân); chi tiết `ASSUMPTION` |

## Acceptance criteria — «When … then …»

| # | Criterion | Cites |
|---|---|---|
| C1 | When a sense has a Vietnamese gloss, at least one English example, a level and a topic and the owner publishes it, then it becomes visible to learners in search and browse | K10 |
| C2 | When the owner publishes a sense that lacks any of those four items, then publishing is refused with the list of missing items and the sense stays unpublished | K10 |
| C3 | When a learner searches or browses, then no sense in `draft`, `reviewed`, `rejected` or unpublished state is returned | F22 |
| C4 | When a learner searches for `in` or browses by level, then the function-word entries are returned and labelled as such | K11 |
| C5 | When a learner bulk-adds a level or topic to a group, then function-word entries are not added; when the learner adds one of them by hand, it is added | K11 |
| C6 | When the owner overrides the function-word flag of an entry, then default browse and bulk-add follow the new value | K11 |
| C7 | When learner B searches or requests the ID of learner A's private entry, then it is not returned and the ID answers "not found" | S6 |
| C8 | When a learner creates a private entry with only a gloss, then it is accepted and is visible only to that learner | F15 |
| C9 | When a learner creates a private entry whose lemma and part of speech match a published catalog entry, then the catalog entry is suggested and creating the private one is still allowed | F15 |
| C10 | When a learner already has 1,000 private entries and creates another, then the request is rejected with a Problem Details error | F15 (`ASSUMPTION` number) |
| C11 | When the owner edits a published sense, then a draft revision with the same sense ID is created and the live content changes only when it is published; when the owner replaces the meaning, then a new sense is created and the old one is retired when the new one is published | F14 |
| C12 | When a sense is retired, then learners who had it keep it in their groups marked "nghĩa đã đổi", it is not offered in new study sessions, and no progress is moved to another sense | F14 |
| C13 | When a learner adds a word and the catalog has it and the learner accepts that sense, then no external source or AI is called; when the learner says "not this meaning", then the chain continues with the external source, the AI lookup and manual entry | K20 |
| C14 | When a learner adds a word the catalog lacks and no external source is configured, then the AI lookup runs only if the learner is entitled, and otherwise the manual entry form is offered | K20 |
| C15 | When an external or AI step fails or times out, then the chain continues to the next step and the manual entry is still available | K20 |
| C16 | When a suggestion from an external source or AI is shown, then nothing is stored until the learner confirms or edits it, and then it is saved as a private entry that records its source | N13 |
| C17 | When a learner attaches a context sentence of at most 300 characters, then it is stored privately, marked usable for cloze when a whole token equals the word or one of its accepted forms and otherwise marked not usable with the reason; when it is longer than 300 characters, then it is rejected | K23 |
| C18 | When the same (lemma, part of speech) appears in CEFR-J and Octanove with different levels, then both level records are kept with their source and the CEFR-J level is shown by default | CR8 (`ASSUMPTION`) |
| C19 | When the owner adds an editorial level, then the imported source rows are unchanged and the editorial record shows its basis | R14 |
| C20 | When a learner searches `analyse`, then the entry whose headword is `analyze/analyse` is found | R6 |
| C21 | When the learner's native language is not Vietnamese, then the text shown is that language if present, else the English definition if present, else the Vietnamese gloss marked "chưa có bản dịch" | CR7 (`ASSUMPTION`) |
| C22 | When a learner deletes the account, then that learner's private entries, private texts, examples and context sentences are removed and the catalog is unchanged | K3 |
| C23 | When the owner adds an accepted form such as `deployed` to a sense, then it is stored with the sense and is returned to Practice as an accepted answer for that sense | K15 |
| C24 | When a learner deletes a private word, then its entry, texts, examples and context sentences are removed and Learning and Practice remove the items, group memberships, schedule, questions and attempts that depend on it | CR23 (`ASSUMPTION`) |

## Edge cases

| # | Edge case | Expected | Cites |
|---|---|---|---|
| CE1 | `March` (A1) and `march` (B1) both exist in CEFR-J | Two distinct entries; importing the second never overwrites the first | R3 |
| CE2 | `in` appears as `preposition` (A1) and `adverb` (A2) | Two entries; the function-word flag is decided per entry, so the preposition is flagged and the adverb is not | R7 |
| CE3 | Headwords of several words (`according to`, `air conditioning`) and Octanove headwords with a trailing space (`turn to `, `laud `) | Accepted as `word` entries, whitespace trimmed; no phrasal-verb behaviour attached | R4 |
| CE4 | Octanove rows with an empty or invalid part of speech (`batter`, `remonstrate`) | Rejected into an error report for the owner; not imported silently | R8 |
| CE5 | 95 raw (lemma, part of speech) pairs, 97 under the entry key, have different levels in the two sources (`abolish`: B2 vs C2) | Both kept; CEFR-J shown by default; the owner can review them and add an editorial level | CR8 (`ASSUMPTION`) |
| CE6 | A learner enters an inflected form such as `deployed` and no known-forms source exists | Treated as a new word and sent through the lookup chain; the gap is visible, not hidden | N12 |
| CE7 | A learner enters a phrase of several words (`look up`) | Accepted as an ordinary `word` entry; no phrasal-verb rules apply | R4 |
| CE8 | A suggestion from an external source cannot be stored because the provider's terms forbid it | That step is skipped as if it were absent; the chain continues | ASSUMPTION |
| CE9 | A retired sense is still in a learner's group and in their review schedule | It stays visible with the marker, is not offered in new sessions, and the learner can remove it | F14 |
| CE10 | The owner edits a sense while a learner is mid-question on it | The question is graded against its snapshot | S11 |

## Defense Analysis (rút gọn)

Nguồn phân tích: `V1_DATA_MODEL_DRAFT.md` mục 5 (đề xuất) cộng quyết định đã chốt. Chưa có thử nghiệm.

| Case | Hành vi bảo vệ | Phát hiện → khôi phục | Kiểm chứng dự kiến |
|---|---|---|---|
| Nghĩa giữa hai ngôn ngữ không cùng một sense | Mỗi text thuộc một sense; "thay nghĩa" tạo sense mới (CR17) | Owner rà; unpublish text hoặc tách sense | `bank` ngân hàng và bờ sông không nhập chung sense |
| Publish giữa chừng bị lỗi | Publish nguyên tử từng sense; lô xử lý từng mục (CR19) | Báo cáo mục lỗi → publish lại cùng mục | DB lỗi giữa lô |
| Hai thiết bị hoặc hai lần sửa đồng thời | Sửa dùng kiểm tra phiên bản; thất bại thì báo tải lại | Xung đột → đọc lại trạng thái | Hai owner sửa cùng sense |
| Lộ từ riêng tư | Kiểm chủ sở hữu ở mọi truy cập; ID của người khác trả "không tìm thấy" (S6) | Kiểm thử đối kháng: đoán ID | Hai người học thử ID của nhau |
| Nội dung từ nguồn ngoài hoặc AI sai | Chỉ là gợi ý, người học xác nhận; không vào catalog (CR15) | Người học sửa; owner không bị ảnh hưởng | Nguồn trả dữ liệu rỗng hoặc sai |
| Câu ngữ cảnh chứa nội dung nhạy cảm hoặc có bản quyền | Chỉ lưu riêng tư, giới hạn độ dài, xóa cùng tài khoản (CR14) | — | Câu dài, câu chứa markup |

## Cross-module contract notes

| Với module | Content hứa hoặc cần |
|---|---|
| Learning | Cung cấp thao tác **tra và tạo từ riêng tư** để Learning thêm vào nhóm "Mới thêm" và lịch ôn; cung cấp danh sách theo level/chủ đề **đã loại từ chức năng** cho thêm hàng loạt; báo sense retired để Learning gắn nhãn |
| Practice | Báo sense retired, bỏ publish hoặc xóa từ riêng tư để Practice ẩn câu của sense đó (PRC26, PRC28). Cung cấp level theo entry, loại từ, cờ từ chức năng và chủ đề để chọn đáp án nhiễu cùng loại từ và cùng band level; cung cấp **danh sách dạng được chấp nhận** của sense (CR22, gồm biến thể chính tả R6); câu ngữ cảnh của người học chỉ Practice của chính người đó dùng |
| Content Pipeline | Nhận bản nháp qua thao tác tạo và sửa draft, chấp nhận khóa duy nhất ở CR20, trả báo cáo lỗi từng dòng; không có đường ghi nào khác vào catalog |
| Entitlements & Usage | Bước AI tra nghĩa cần một mã feature riêng (đề xuất `ai.lookup`, `ASSUMPTION`) và có thể tính hạn mức theo K18 (hoãn) |
| AI Integration | Bước AI tra nghĩa gọi AI Integration như một việc thứ hai ngoài sinh bài; đầu ra phải theo schema cố định và chỉ là gợi ý |
| Identity & Access | Thao tác admin cần vai trò admin; xóa tài khoản gọi thao tác xóa dữ liệu riêng tư theo người dùng |

## Provenance markers used above

- **K#** — quyết định đã chốt; **N#, F#** — mặc định hoặc đề xuất mang nhãn riêng ở `DECISIONS` và `SPEC_PLAN_AND_DECISIONS` (N7–N11 là `ASSUMPTION`, N12 là Mở, N13 là Đề xuất, nhiều F# có con số là `ASSUMPTION`).
- **R#** — finding trong `research.md`; R1–R8 là `verified` ngày 04/10/2026, R9–R16 là `documented (02/10)`.
- **S#, SR#** — tiêu chí hoặc quy tắc trong `system-spec.md`.
- **ASSUMPTION** — không có nguồn; được mang vào báo cáo cuối.
