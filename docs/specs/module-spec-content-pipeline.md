# Module spec — Content Pipeline

> Sinh bởi `write-spec`, lần chạy `v1-specs`, đợt 2. Mẫu `module-spec.md`. Cách trích dẫn: **K#, N#, F#** =
> [DECISIONS](DECISIONS_2026-10-04.md) và [kế hoạch](SPEC_PLAN_AND_DECISIONS_2026-10-04.md); **R#** =
> [research.md](../tasks/v1-specs/research.md); **S#, SR#** = [system-spec](system-spec.md); **C#, CR#** =
> [Vocabulary Content](module-spec-vocabulary-content.md); **ASSUMPTION** = chưa có nguồn.
> Vùng cần Defense Analysis (thiết kế job) nằm ở mục **Defense Analysis** cuối file.

**Ngày:** 2026-10-04 · **Module:** Content Pipeline · **Spec run:** v1-specs

## Observed on

Không có hệ thống tham chiếu. Hình dạng dữ liệu nguồn được đo bằng script ngày 04/10/2026 (R1–R8).

| Surface | How accessed | By whom | When |
|---|---|---|---|
| File CSV CEFR-J 1.5 và Octanove C1/C2 1.0 | Script Python | Trợ lý | 04/10/2026 |
| Quyết định về nhập và duyệt nội dung (K1, K1b, F22–F25) | Chat | Chủ dự án | 02–04/10/2026 |

## Scope

Module sở hữu **quy trình đưa nội dung vào catalog của owner**: đăng ký nguồn dữ liệu; **nhập file nguồn** (CEFR-J, Octanove) thành
entry, level và cờ từ chức năng; **soạn nội dung** bằng file CSV hoặc bằng giao diện (thêm một hoặc nhiều từ, sửa bản nháp);
**duyệt và publish** (qua thao tác của Content); **job nền** nhập và xuất hàng loạt, có trạng thái, báo cáo lỗi từng dòng, chạy
lại, hoàn tác theo lô. Ranh giới: Pipeline chỉ ghi vào catalog qua các thao tác tạo, sửa và publish của Vocabulary Content;
dữ liệu từ vựng, vòng đời và điều kiện publish do Content sở hữu (CR4, CR5, CR19). Giao diện admin làm sau bằng `build-ui`;
spec chỉ mô tả hành vi.

**Ngoài phạm vi V1:** AI soạn nháp và nguồn từ điển ngoài (K1b, K20: chừa chỗ cắm, giá trị `ai` và `external` của nguồn
bản nháp được dành sẵn nhưng chưa dùng); biên soạn phrasal verb, collocation, idiom; nhiều admin và phân vai trong admin; lịch
nhập định kỳ.

## Constraints

| Constraint | Imposed by | Why it is not the implementer's choice |
|---|---|---|
| Job nền chạy trên worker BullMQ với Redis | Chủ dự án (chọn phương án B cho worker, 02/10) | Quyết định kiến trúc; lý do dùng yếu đi sau K1b, sẽ xét lại ở Defense Analysis của module này |
| Khóa job gồm (nguồn, ID mục nguồn, revision nội dung) lưu trong DB với ràng buộc duy nhất | Chủ dự án (K2, F23) | Chọn vì job có thể chạy nhiều hơn một lần (R35) |
| Mỗi nguồn nhập phải có bản ghi nguồn gồm tên, phiên bản, URL, giấy phép, ghi nhận tác giả | Giấy phép CEFR-J, Octanove (R13, R14) | Điều kiện sử dụng dữ liệu |
| Dòng nguồn không bị sửa; level biên tập là bản ghi riêng | Giấy phép Octanove, CC BY-SA (R14) | Điều kiện sử dụng dữ liệu |
| Chỉ admin được dùng mọi thao tác của module | Chủ dự án (K1) | Quyết định sản phẩm |

## Business rules

| # | Quy tắc | Nguồn |
|---|---|---|
| PR1 | **Bản ghi nguồn.** Mỗi **nguồn bên thứ ba** (CEFR-J, Octanove) phải được đăng ký (tên, phiên bản, URL, giấy phép, ghi nhận) trước khi nhập; thiếu phiên bản hoặc giấy phép thì từ chối nhập. File do owner tự soạn (PR5) thuộc nguồn `owner` có sẵn và không cần giấy phép. Trước lần nhập thật đầu tiên owner xác nhận phiên bản CEFR-J và nơi phát hành chính thức của Octanove | CR18, R13, R14; việc xác nhận phiên bản còn mở; nguồn `owner` `ASSUMPTION` |
| PR2 | **Nhập file nguồn.** Mỗi dòng `headword, pos, CEFR` tạo hoặc cập nhật một **entry** catalog, một **bản ghi level** (kèm nguồn, phiên bản, giấy phép) và cờ từ chức năng suy từ loại từ (CR10). Nhập file nguồn **không tạo sense**, nên chưa có gì hiện ra với người học | CR8, CR10, CR20, R1 |
| PR3 | **Kiểm dòng nguồn.** Cắt khoảng trắng đầu cuối; loại từ rỗng hoặc ngoài tập hợp lệ thì loại dòng vào báo cáo lỗi (ví dụ `batter` rỗng, `remonstrate` có `vern`); level ngoài A1–C2 thì loại dòng; **khóa dòng nguồn** là (dạng đầu trước dấu `/` của headword, loại từ), phân biệt hoa thường (`March` khác `march`); headword nhiều từ được nhận; headword dạng `a/b` thành một entry với các dạng còn lại làm biến thể (dạng đầu là dạng chính). Khóa trùng trong cùng file: cùng level thì gộp thành một; **khác level** (Octanove có 21 khóa như vậy, ví dụ C1 và C2) thì giữ **cả hai bản ghi level** và đánh dấu để owner rà, giống PR4. Cột phụ của file nguồn (như `notes` của Octanove, dùng để phân biệt nghĩa ở 45 dòng) được giữ làm gợi ý khi soạn, không dùng để suy ra gì ở V1 | R3, R4, R6, R8, R46; chọn dạng đầu làm dạng chính, gộp và đánh dấu `ASSUMPTION` |
| PR4 | **Hai nguồn level khác nhau.** Cùng (lemma, loại từ) có ở hai nguồn với level khác nhau (95 cặp theo chuỗi viết thường, 97 theo khóa entry của PR3) thì giữ **cả hai** bản ghi level, hiển thị mặc định theo CEFR-J; owner rà và ghi đè bằng level biên tập | CR8, R2 |
| PR5 | **Soạn bằng CSV.** File UTF-8 có dòng tiêu đề, các cột: `lemma`, `pos` (bắt buộc), `sense_id`, `revision`, `context_label`, `gloss_vi`, `definition_en`, `example_en_1`, `example_en_2`, `example_en_3`, `topics` (mã chủ đề ngăn bởi `;`), `accepted_forms` (ngăn bởi `;`), `replace_meaning` (`true` để thay nghĩa). Cột lạ bị bỏ qua và báo cảnh báo. **Xác định sense của một dòng:** có `sense_id` thì là sense đó (và `revision` là bắt buộc); không có thì tìm sense hiện có khớp (lemma, loại từ, `context_label`, nhãn rỗng nghĩa là nghĩa chính). Không khớp (nhãn ngữ cảnh mới) thì tạo **sense mới** (nghĩa thứ hai). Khớp và `gloss_vi` không đổi thì tạo revision; khớp nhưng `gloss_vi` **đổi** mà không có `sense_id` hoặc `replace_meaning=true` thì dòng bị từ chối kèm lý do. Dòng **không có** `sense_id` khớp một sense đang có revision bản nháp chưa publish (ví dụ owner đang sửa trong giao diện) cũng bị từ chối là xung đột, kèm hướng dẫn dùng `sense_id` và `revision`. `replace_meaning=true` tạo sense mới thay sense khớp, sense cũ retired khi sense mới được publish. Dòng chưa đủ điều kiện publish vẫn lưu `draft` | K1, CR5, CR6, CR17, CR22; tên cột và cách khớp `ASSUMPTION` |
| PR6 | **Thêm trong giao diện.** Owner dán một hoặc nhiều dòng, mỗi dòng gồm `lemma` và `pos` (bắt buộc; thiếu `pos` thì giao diện hỏi chọn trong các loại từ đã có của lemma). Với mỗi dòng: entry chưa có thì tạo entry và một sense `draft` rỗng; entry đã có nhưng **chưa có sense** (trạng thái thường gặp sau khi nhập file nguồn) thì tạo sense `draft` rỗng; entry đã có sense thì báo "đã có sense" kèm liên kết và không tạo mới (muốn thêm nghĩa khác thì dùng CSV với `context_label` mới hoặc thao tác thêm nghĩa trong giao diện). Cảnh báo khi lemma chỉ khác hoa thường một entry sẵn có (`Software` với `software`). Sửa bản nháp trong giao diện dùng cùng quy tắc kiểm như CSV | K1, CR1; cảnh báo hoa thường `ASSUMPTION` |
| PR7 | **Vòng đời.** `draft → reviewed → published`, ngoài ra `rejected` và `retired`, điều khiển qua thao tác của Content. Chọn nhiều sense để đổi trạng thái là xử lý **từng mục độc lập**: mục không đạt điều kiện (ví dụ thiếu chủ đề khi publish) bị từ chối kèm lý do, mục còn lại vẫn qua | F22, CR4, CR5, CR19 |
| PR8 | **Không đổi trực tiếp nội dung đang hiển thị.** Dòng nhập nhắm tới sense đã `published` (theo PR5) tạo **revision bản nháp** của sense đó; nội dung hiển thị chỉ đổi khi owner publish revision. Cùng quy tắc cho sửa trong giao diện (CR17) | CR17; việc nhập không đổi trực tiếp `ASSUMPTION` |
| PR9 | **Khóa chống trùng.** Mỗi dòng có khóa (nguồn, khóa dòng, revision nội dung): **khóa dòng** là (lemma phân biệt hoa thường, loại từ) cho file nguồn và (lemma, loại từ, sense theo PR5) cho file soạn; **revision nội dung** là băm của nội dung dòng đã chuẩn hóa. Cùng khóa thì bỏ qua, không tạo bản ghi mới; cùng khóa dòng nhưng nội dung đổi thì xử lý theo PR8. Ràng buộc duy nhất nằm trong DB, không dựa vào việc queue chặn job trùng | F23, K2, R32, R35 |
| PR10 | **Job.** Nhập và xuất chạy như job nền với trạng thái `queued`, `running`, `succeeded`, `failed`, `partial`; số dòng đã xử lý, tạo mới, cập nhật, không đổi, bị loại; báo cáo lỗi tải được (CSV, có số dòng và lý do). Xử lý **từng dòng trong giao dịch riêng**; cả job không phải một giao dịch | F23, F24; hình dạng báo cáo `ASSUMPTION` |
| PR11 | **Chạy lại và lỗi tạm.** Job bị gián đoạn được xử lý lại nhưng **không tạo trùng**: dòng đã xử lý bị bỏ qua nhờ PR9. Đơn vị thử lại là **dòng**: lỗi tạm của một dòng thử lại tối đa 3 lần với backoff mũ có jitter; job nền cũng thử lại cả job tối đa 3 lần, bỏ qua các dòng đã xong. Hết lần thì job `failed` kèm báo cáo. Có thể chạy lại **chỉ các dòng bị loại** sau khi sửa | F24, R33, R35, R41; đơn vị thử lại `ASSUMPTION` |
| PR12 | **Trạng thái trong DB là chuẩn, job có hợp đồng thuê.** Hàng đợi chỉ là cơ chế chạy; trạng thái job và khóa dòng nằm trong DB. Mỗi job đang chạy giữ một **hợp đồng thuê** gia hạn bằng nhịp tim; job chỉ bị coi là treo khi hợp đồng hết hạn, khi đó worker khác mới được nhận lại và worker cũ **mất quyền ghi**. Nếu hàng đợi mất dữ liệu (Redis mất) thì job còn `queued` hoặc `running` quá hạn thuê trong DB được đưa lại vào hàng đợi | K2, R32, R35; hợp đồng thuê `ASSUMPTION` |
| PR13 | **Một lần một nguồn.** Không chạy hai job nhập của cùng một nguồn song song; job thứ hai chờ | ASSUMPTION |
| PR14 | **Giới hạn file.** File soạn (PR5): tối đa 5.000 dòng và 5 MB, cột bắt buộc `lemma` và `pos`. File nguồn (PR2): tối đa 20.000 dòng và 10 MB, cột bắt buộc `headword`, `pos`, `CEFR` (CEFR-J có 7.799 dòng, R1). Vượt giới hạn, thiếu dòng tiêu đề hoặc thiếu cột bắt buộc thì từ chối cả file trước khi xử lý. BOM UTF-8 được chấp nhận | ASSUMPTION |
| PR15 | **Xuất để soạn.** Xuất bản nháp được chọn ra CSV kèm `sense_id` và `revision`; nhập lại dòng có `revision` cũ hơn bản hiện tại bị loại là xung đột, và `revision` là bắt buộc khi có `sense_id`. Ô bắt đầu bằng `=`, `+`, `-`, `@` được vô hiệu khi xuất để bảng tính không chạy thành công thức; khi nhập lại, tiền tố vô hiệu được gỡ trước khi so sánh nên xuất rồi nhập lại không đổi nội dung | K1; chống chèn công thức và việc gỡ tiền tố `ASSUMPTION` (không có nguồn) |
| PR16 | **Hoàn tác theo lô.** Hoàn tác một lô xóa **những bản ghi lô đó đã tạo** và chưa từng publish (sense bản nháp, bản ghi level, và entry chỉ khi không còn bản ghi nào của lô khác tham chiếu), **cùng với khóa dòng của lô**, nên nhập lại cùng file sẽ tạo lại chúng. Phần đã publish và entry đang được lô khác dùng không bị đụng; hoàn tác báo những gì đã bỏ qua | ASSUMPTION |
| PR17 | **Nguồn bản nháp.** Mỗi revision bản nháp ghi `draft_source` là `csv` hoặc `ui`; `external` và `ai` dành sẵn cho sau V1 và chưa có đường nào tạo ra chúng | K1b, K20 |
| PR18 | **Quyền và log.** Chỉ admin; log mỗi job mang `operation_id`, số liệu và thời gian; job này không chứa dữ liệu của người học | K1, SR9, F4 |

## Acceptance criteria — «When … then …»

| # | Criterion | Cites |
|---|---|---|
| P1 | When an import of a third-party source (CEFR-J or Octanove) is started and the source has no version or licence recorded, then it is refused before any row is read | R14 |
| P2 | When a CEFR-J row `analyze/analyse, verb, B1` is imported, then one catalog entry with the spelling variant, a level record naming the source and version, and the function-word flag are created, and no sense exists, so learners see nothing | R6 |
| P3 | When the same file is imported again, then no new entries or level records are created and the report shows the rows as unchanged | F23 |
| P4 | When a file contains the rows `March, noun, A1` and `march, noun, B1`, then two distinct entries are created | R3 |
| P5 | When a row has an empty or invalid part of speech such as `batter` with none, then only that row is rejected into the error report with its row number and the other rows are processed | R8 |
| P6 | When the same (lemma, part of speech) comes from both sources with different levels, then both level records are kept and CEFR-J is shown by default | R2 |
| P7 | When a row's part of speech is `preposition`, then the entry is flagged as a function word; when it is `noun`, it is not | R7 |
| P8 | When the worker dies in the middle of a job and the job runs again, then rows already processed are skipped and no duplicate is created | R35 |
| P9 | When the same job is enqueued twice or the queue loses track of a finished job, then each row is still applied once | R32 |
| P10 | When a transient failure occurs, then the row is retried at most 3 times with exponential backoff and jitter, and after that the job ends `failed` or `partial` with a report | F24 |
| P11 | When an authoring CSV row names a new lemma and part of speech, then a draft sense is created with the given fields, even if it is not yet publishable | K1 |
| P12 | When an authoring row names a published sense, by `sense_id` or by the same lemma, part of speech and context label, without changing its gloss, then a draft revision is created and the live content is unchanged until the owner publishes it | CR17 |
| P13 | When an authoring row names a topic code that does not exist, then that row is rejected | CR9 |
| P14 | When an exported row is edited and imported with a `revision` older than the current one, then the row is rejected as a conflict | PR15 (`ASSUMPTION`) |
| P15 | When the owner pastes five lines of word and part of speech, then for each line an entry and an empty draft sense are created as needed, and a word that already has a sense is reported instead of duplicated | K1 |
| P16 | When the owner publishes ten selected senses and three lack a required item, then seven are published and three are refused with their reasons | F22 |
| P17 | When a non-admin calls any Pipeline operation, then it is refused | K1 |
| P18 | When a batch is reverted, then the unpublished records the batch created are deleted together with its row keys, entries still used by another batch are kept, and published records are untouched | PR16 (`ASSUMPTION`) |
| P19 | When the owner opens a finished job, then its status, counts and the downloadable error report are shown | F23 |
| P20 | When an authoring file has more than 5,000 rows or 5 MB, or a source file more than 20,000 rows or 10 MB, then it is refused before processing | PR14 (`ASSUMPTION`) |
| P21 | When a second import of the same source is started while one is running, then it waits for the first | PR13 (`ASSUMPTION`) |
| P22 | When an exported cell starts with `=`, `+`, `-` or `@`, then it is neutralised so a spreadsheet does not run it as a formula | PR15 (`ASSUMPTION`) |
| P23 | When an editorial level is added to an imported entry, then the imported level row is unchanged | R14 |
| P24 | When an authoring row for `bank`, noun, carries a context label that no existing sense has and no `sense_id`, then a new sense is created and the published sense is untouched | PR5 (`ASSUMPTION`) |
| P25 | When an authoring row matches a published sense by key without a `sense_id` but changes its gloss, then the row is rejected with the reason | PR5 (`ASSUMPTION`) |
| P26 | When a batch is reverted and the same file is imported again, then its entries and level records are created again | PR16 (`ASSUMPTION`) |
| P27 | When a source file has the same (headword, part of speech) twice with levels C1 and C2, then both level records are kept and flagged for review | R46 |
| P28 | When a worker stops sending its heartbeat, then another worker takes the job only after the lease expires and the first worker can no longer write | PR12 (`ASSUMPTION`) |

## Edge cases

| # | Edge case | Expected | Cites |
|---|---|---|---|
| PE1 | A CSV starts with a UTF-8 byte-order mark; another is not valid UTF-8 | The first is accepted; the second is refused with a clear message | PR14 (`ASSUMPTION`) |
| PE2 | The same row key appears twice in one authoring file | The first row is kept and later ones are rejected with the reason "duplicate key in file" | PR5 (`ASSUMPTION`) |
| PE3 | A cell contains commas, quotes or line breaks | It is read according to standard CSV quoting and stored unchanged | ASSUMPTION |
| PE4 | Redis loses its data while the database says a job is `running` | The job is put back in the queue and finishes without duplicates | PR12 |
| PE5 | A worker stops responding while its job is `running` | After the lease expires the job is re-queued and the first worker can no longer write, so no source runs twice | PR12 (`ASSUMPTION`) |
| PE6 | The owner edits a draft in the interface while an import updates the same draft | The import row is rejected as a conflict instead of overwriting the edit, both when it carries an old `revision` and when it has no `sense_id` | PR5, PR15 (`ASSUMPTION`) |
| PE7 | An authoring row targets a retired sense | The row is rejected with the reason "sense retired" | CR17 (`ASSUMPTION`) |
| PE8 | A headword has a trailing space such as `turn to ` | It is trimmed before the key is built | R4 |
| PE9 | `accepted_forms` contains the lemma itself or a repeated form | Duplicates are removed | CR22 (`ASSUMPTION`) |
| PE10 | A cell is longer than 2,000 characters | The row is rejected | ASSUMPTION |

## Defense Analysis

Chưa chạy thử; mọi dòng là hành vi mong muốn. Vùng này nằm trong danh sách "cần Defense Analysis trước khi chốt spec" của chủ dự án.

**Đường đi bình thường.** Owner đăng ký nguồn → nhập file nguồn (entry, level, cờ từ chức năng) → soạn bằng CSV hoặc giao diện → rà → publish từng sense hoặc theo lô → người học thấy sense `published`.

**Bất biến.** (1) Mỗi (nguồn, khóa dòng, revision nội dung) chỉ được áp dụng một lần. (2) Nội dung đang hiển thị chỉ đổi khi owner publish. (3) Dòng nguồn không bao giờ bị sửa; level biên tập là bản ghi riêng. (4) Người học chỉ thấy `published`. (5) Trạng thái job và khóa dòng trong DB là chuẩn; hàng đợi chỉ là cơ chế chạy. (6) Một nguồn không có hai job nhập chạy cùng lúc.

| Case | Hành vi bảo vệ | Phát hiện → khôi phục | Kiểm chứng dự kiến |
|---|---|---|---|
| Xử lý một dòng nhiều lần (retry, job treo, worker khác nhận lại) | Khóa (nguồn, khóa dòng, revision) duy nhất trong DB; ghi theo kiểu upsert (PR9, R35) | Báo cáo job hiển thị số dòng "không đổi" | Chạy cùng một file hai lần; dừng worker giữa chừng |
| Job trùng trong queue, hoặc queue quên job đã xóa | DB là chuẩn, không dựa vào chống trùng của queue (PR9, PR12, R32) | — | Thêm job hai lần; xóa job đã xong rồi thêm lại |
| Dòng "độc" luôn lỗi | Chỉ lỗi tạm được thử lại (tối đa 3 lần); lỗi kiểm dữ liệu không thử lại, dòng vào báo cáo và job vẫn chạy tiếp (PR3, PR10, PR11) | Báo cáo lỗi có số dòng và lý do | File có một dòng loại từ lỗi |
| Lỗi giữa chừng khiến chỉ một phần dòng đã vào | Mỗi dòng một giao dịch; trạng thái `partial`; chạy lại chỉ dòng bị loại; hoàn tác theo lô cho phần chưa publish (PR10, PR11, PR16) | Số dòng đã xử lý so với tổng | DB lỗi giữa lô |
| Worker chết hoặc job treo | Xử lý lại, bỏ qua dòng đã xong (PR11); job treo quá hạn bị đánh dấu `failed` (PE5) | Cảnh báo job `failed` hoặc `running` quá lâu | Kill worker |
| Redis mất dữ liệu | Trạng thái job trong DB; đưa lại vào hàng đợi (PR12) | So sánh job trong DB với hàng đợi | Xóa Redis lúc đang chạy |
| Hai owner hoặc hai file cùng lúc | Một job nhập mỗi nguồn (PR13); sửa bản nháp kiểm `revision` (PR15, PE6) | Báo cáo xung đột | Hai file cùng nguồn; sửa tay lúc nhập |
| File quá lớn hoặc sai định dạng | Từ chối trước khi xử lý (PR14, PE1) | Thông báo lỗi rõ | File 6.000 dòng; file không phải UTF-8 |
| Chèn công thức vào bảng tính (CSV injection) | Vô hiệu ô bắt đầu bằng `=`, `+`, `-`, `@` khi xuất (PR15) | — | Nghĩa bắt đầu bằng `=` |
| Nội dung từ file bị coi là lệnh | Mọi giá trị trong file là dữ liệu; không chạy, không dịch (PR3, PR5) | — | Ô chứa markup hoặc câu giống chỉ thị |
| Quan sát | Log mỗi job với `operation_id`, số liệu, thời gian; cảnh báo job `failed` (PR18) | Số job lỗi theo ngày | Tìm job lỗi qua `operation_id` |
| Hoàn tác và khôi phục | Hoàn tác theo lô, kèm xóa khóa dòng của lô để nhập lại được (PR16); bỏ publish; retire (CR17, CR19) | — | Hoàn tác một lô rồi nhập lại; hoàn tác khi entry được lô khác dùng |
| Job "zombie" (worker chậm nhưng chưa chết) và job bị nhận lại | Hợp đồng thuê có nhịp tim; worker cũ mất quyền ghi khi thuê hết hạn (PR12, PE5) | Job `running` không có nhịp tim | Dừng nhịp tim của một worker đang chạy |
| Nhập đang chạy trong khi owner publish hoặc sửa cùng sense | Nhập chỉ tạo revision bản nháp; xung đột bị phát hiện qua `revision` (PR8, PR15, PE6) | Báo cáo xung đột | Publish một sense lúc import đang cập nhật nó |
| Đơn vị thử lại và tổng thời gian | Thử lại theo dòng (3 lần) và theo job (3 lần), bỏ qua dòng đã xong (PR11) | Số lần thử lại theo job | Dòng lỗi tạm; job bị gián đoạn |

**Phương án thay thế và điều kiện xét lại (ghi trung thực, không phải quyết định mới).** Chủ dự án đã chọn worker BullMQ từ gói pilot đầu. Sau K1b, việc nền chỉ còn
nhập và xuất CSV (file soạn tối đa 5.000 dòng, file nguồn 20.000), nên có hai phương án rẻ hơn:
nhập trực tiếp trong request kèm tiến độ để hỏi lại, hoặc một lệnh CLI. Giữ BullMQ có lợi là sẵn cho nguồn ngoài và AI sau này, và retry,
hàng đợi, chạy lại đã có sẵn; cái giá là thêm Redis và một tiến trình. Điều kiện xét lại: sau pilot, nếu chỉ có import CSV nhỏ và
chi phí vận hành Redis lớn hơn lợi ích.

### Bổ sung theo mẫu Defense Analysis (05/10/2026)

Theo `docs/preparation/DECISION_ANALYSIS_TEMPLATE.md`. Chưa chạy thử; các con số dung lượng là ước tính, không phải số đo.

| Nhóm case | Phân tích |
|---|---|
| Tiến hóa và tương thích | Nguồn bản nháp mới (`external`, `ai`) chỉ thêm giá trị `draft_source` (PR17), không đổi vòng đời. Thêm ngôn ngữ giải thích thì file soạn có cột mới tùy chọn (ví dụ `gloss_<ngôn ngữ>`): file cũ không có cột đó vẫn nhập được vì cột tùy chọn được phép thiếu, còn file mới nhập vào hệ thống cũ thì cột lạ bị bỏ qua kèm cảnh báo (PR5). Giá trị `entry_type` ngoài `word` bị từ chối (CR2). Dòng thiếu cột tùy chọn vẫn hợp lệ. Định dạng CSV chưa có số phiên bản: thêm khi đổi cột theo cách không tương thích (`ASSUMPTION`) |
| Năng lực và chi phí vận hành | Nút cổ chai thật là thời gian owner rà nội dung, không phải máy. File nguồn tối đa 20.000 dòng, mỗi dòng một giao dịch (PR10, PR14); chưa đo thời gian nhập 7.799 dòng. Kế hoạch đo: nhập thử file CEFR-J trên máy local và ghi thời gian, số giao dịch, bộ nhớ trước khi chốt giới hạn. Redis và worker thêm một dịch vụ cần theo dõi (xem so sánh bên dưới) |
| Đánh đổi chấp nhận | Xử lý từng dòng thay vì một giao dịch lớn: được khả năng chạy tiếp và báo lỗi từng dòng, mất tính "tất cả hoặc không gì". Publish theo lô xử lý từng mục độc lập: được tiến độ một phần, mất tính đồng bộ cả lô |

**So sánh phương án cho cách chạy job nhập và xuất**

| Phương án | Đáp ứng yêu cầu | Hạn chế | Chi phí và vận hành | Lý do |
|---|---|---|---|---|
| A. Worker BullMQ với Redis (đã chọn 02/10) | Retry, chạy lại, trạng thái job; sẵn cho nguồn ngoài và AI sau | Có thể chạy hơn một lần (R35) nên phải idempotent; Redis có thể mất dữ liệu | Thêm Redis và một tiến trình | Chủ dự án chọn; lý do yếu đi sau K1b nên ghi điều kiện xét lại |
| B. Nhập trong request, có tiến độ để hỏi lại | Đủ cho file nhỏ | Mất cơ chế retry và chạy lại có sẵn; request dài | Không thêm dịch vụ | Xét lại nếu pilot chỉ có import CSV nhỏ |
| C. Lệnh CLI | Đơn giản nhất | Không có giao diện, trái K1 hybrid | Thấp nhất | Loại |

**Runbook tối thiểu.** Phát hiện: cảnh báo job `failed`, `partial`, hoặc `running` quá hạn thuê. Chẩn đoán: mở báo cáo lỗi của job, tìm log theo `operation_id`, so trạng thái job trong DB với hàng đợi (PR12). Xử lý: sửa dòng lỗi rồi chạy lại **chỉ các dòng bị loại**; nếu hàng đợi mất dữ liệu thì đưa lại job từ DB; nếu lô sai thì hoàn tác theo lô (PR16). Xác minh: số đã xử lý bằng số tạo mới + cập nhật + không đổi + bị loại; người học chỉ thấy sense `published`.

**Câu hỏi còn mở.** Redis có đáng vận hành ở quy mô pilot (chờ số đo); có cần số phiên bản cho định dạng CSV; xử lý cột `notes` của Octanove ngoài việc giữ làm gợi ý.

## Cross-module contract notes

| Với module | Pipeline hứa hoặc cần |
|---|---|
| Vocabulary Content | Pipeline **chỉ** ghi vào catalog qua các thao tác của Content: tạo entry, tạo và sửa bản nháp, thêm bản ghi level, đặt cờ từ chức năng, đổi trạng thái, publish. Content kiểm điều kiện publish (CR5), khóa duy nhất (CR20) và vòng đời (CR4); Pipeline không ghi trực tiếp vào bảng của Content |
| Identity & Access | Dùng vai trò admin và chuỗi phiên còn hiệu lực cho mọi thao tác (IR17) |
| AI Integration, nguồn ngoài | Không có ở V1; giá trị `draft_source` `ai` và `external` dành sẵn |
| Learning, Practice | Chỉ thấy sense `published`; Pipeline không giao tiếp trực tiếp |

## Provenance markers used above

- **K#** — quyết định đã chốt; **N#, F#** — mặc định hoặc đề xuất mang nhãn riêng ở nguồn (nhiều F# có con số là `ASSUMPTION`); **R#** — finding trong `research.md` (R1–R8 là `verified` ngày 04/10; R13, R14, R32–R35, R41 là `documented (02/10)`).
- **S#, SR#, C#, CR#** — spec khác. **ASSUMPTION** — không có nguồn; được mang vào báo cáo cuối.
