# Module spec — Learning

> Sinh bởi `write-spec`, lần chạy `v1-specs`, đợt 2. Mẫu `module-spec.md`. Cách trích dẫn: **K#, N#, F#** =
> [DECISIONS](DECISIONS_2026-10-04.md) và [kế hoạch](SPEC_PLAN_AND_DECISIONS_2026-10-04.md); **R#** =
> [research.md](../tasks/v1-specs/research.md); **S#, SR#** = [system-spec](system-spec.md); **C#, CR#** =
> [Vocabulary Content](module-spec-vocabulary-content.md); **ASSUMPTION** = chưa có nguồn.

**Ngày:** 2026-10-04 · **Module:** Learning · **Spec run:** v1-specs

## Observed on

Không có hệ thống tham chiếu; spec dựa trên quyết định của chủ dự án (K13, K14, K19–K22, F18–F21) và research đã có.

| Surface | How accessed | By whom | When |
|---|---|---|---|
| Quyết định về học và ôn | Chat | Chủ dự án | 02–04/10/2026 |

## Scope

Module sở hữu **việc học của từng người**: nhóm từ, **mục học** (một người học + một sense) kèm trạng thái ba mức do người
học tự gán, **lịch ôn** do hệ thống tính (hộp ôn đơn giản), **nhật ký** append-only, danh sách "hôm nay cần ôn", **phiên
flashcard** và **luồng thêm nhanh** (điều phối Vocabulary Content để tra và tạo từ riêng tư, rồi đưa vào nhóm "Mới thêm"
và lịch ôn). Ranh giới: nội dung từ vựng thuộc Content; câu hỏi, chấm bài và danh sách "từ hay sai" thuộc Practice (Learning
chỉ nhận kết quả ôn từ Practice để cập nhật lịch).

**Ngoài phạm vi V1:** FSRS (xét sau pilot, K21); nhắc học bằng email hoặc push (K25); streak và điểm; học offline (F5);
thêm nhanh từ app khác trên mobile qua chia sẻ văn bản, extension trình duyệt (K19); nhóm lồng nhau hoặc chia sẻ nhóm.

## Constraints

| Constraint | Imposed by | Why it is not the implementer's choice |
|---|---|---|
| Lịch ôn là hộp ôn đơn giản, chưa dùng FSRS | Chủ dự án (K21) | Quyết định sản phẩm; chuyển FSRS sau pilot |
| Trạng thái ba mức là của người học và tách khỏi lịch ôn; kết quả bài làm không đổi trạng thái | Chủ dự án (K13, F21, K22) | Quyết định sản phẩm |
| Nhật ký append-only mỗi lần đổi trạng thái | Chủ dự án (K14) | Quyết định sản phẩm |
| Không có nhắc học | Chủ dự án (K25) | Quyết định sản phẩm |
| Chỉ online, hai client web và mobile đọc cùng dữ liệu | Chủ dự án (F5) | Giai đoạn V1 |

## Business rules

| # | Quy tắc | Nguồn |
|---|---|---|
| LR1 | **Nhóm.** Danh sách phẳng của mỗi người học; tên duy nhất theo người học (không phân biệt hoa thường, đã cắt khoảng trắng, tối đa 60 ký tự); tạo, đổi tên, xóa. Nhóm mặc định **"Mới thêm"** được tạo khi dùng lần đầu, không xóa được, đổi tên được. Tối đa 100 nhóm mỗi người và 2.000 từ mỗi nhóm. Một sense nằm được trong nhiều nhóm; xóa nhóm **không** xóa trạng thái hay lịch ôn của từ | F18; con số và việc đổi tên `ASSUMPTION` |
| LR2 | **Mục học.** Một (người học, sense) có tối đa một mục học, tạo khi sense lần đầu được thêm vào một nhóm hoặc qua thêm nhanh. Mục mới có trạng thái `not_learned`, mức ôn 0 và đến hạn ngay. Mục tồn tại độc lập với nhóm cho tới khi người học chọn **bỏ khỏi việc học** (xóa trạng thái và lịch ôn, ghi nhật ký) hoặc xóa từ riêng tư hoặc xóa tài khoản | K13, F18; hành động "bỏ khỏi việc học" `ASSUMPTION` |
| LR3 | **Thêm vào nhóm.** Chỉ thêm được sense `published` hoặc từ riêng tư của chính người học; sense người khác hoặc chưa publish trả "không tìm thấy". Cặp (nhóm, sense) duy nhất. Thêm hàng loạt theo level hoặc chủ đề **không** thêm từ chức năng; người học vẫn thêm tay từng từ chức năng, và mục học đã thêm tay thì được học và luyện bình thường (CR10) | CR10, K11, SR9 |
| LR4 | **Trạng thái.** Ba giá trị `not_learned` (chưa học), `needs_review` (cần ôn tập), `known` (đã biết), **chỉ do người học đặt**; kết quả bài làm không đổi trạng thái | K13, F21 |
| LR5 | **Lịch ôn (hộp ôn).** Mỗi mục có mức 0 đến 5 và ngày đến hạn (theo múi giờ người học). Khoảng cách theo mức: 1, 3, 7, 14, 30 ngày cho mức 1 đến 5; mức 0 (mới) đến hạn ngay. Kết quả `remembered` khi mục **đang đến hạn**: mức tăng một (tối đa 5), ngày đến hạn = hôm nay + khoảng cách của mức mới. Ôn **sớm** (chưa đến hạn) mà nhớ: mức và ngày đến hạn giữ nguyên. Kết quả `forgotten` bất kỳ lúc nào: mức về 1, đến hạn ngày mai | K21, N7, N8; quy tắc ôn sớm, và mức 0 và mức 1 cho cùng khoảng cách ngày đầu `ASSUMPTION` |
| LR6 | **Nguồn kết quả ôn.** Learning **áp dụng đúng kết quả mà nguồn gửi tới**. Từ flashcard: người học chọn `known` thì là `remembered`; chọn `not_learned` hoặc `needs_review` thì là `forgotten`. Từ Practice: Practice là bên **duy nhất** đổi kết quả bài làm thành `remembered` hoặc `forgotten` (PRC17); Learning không tự suy từ đúng hay sai. Mỗi kết quả mang khóa duy nhất (operation ID hoặc ID lượt làm bài) nên một lượt chỉ cập nhật lịch **một lần** | K22, N8, PRC17, SR8 |
| LR7 | **Danh sách "hôm nay".** Gồm mục đã đến hạn hôm nay (theo múi giờ), tối đa **10 mục mới** (cũ nhất trước) và **50 mục ôn** (quá hạn lâu nhất trước, rồi mức thấp trước); phần còn lại vẫn đến hạn và chuyển sang ngày sau, không bị phạt. Số còn lại được tính **sau khi trừ những gì đã ôn hôm nay** (theo ngày địa phương, từ mọi nguồn): 50 trừ số mục đến hạn đã có kết quả ôn hôm nay, 10 trừ số mục mới đã ôn lần đầu hôm nay. Loại sense retired hoặc bị bỏ publish (CR17). Phiên người học tự chọn nhóm và bộ lọc không bị chặn bởi trần này nhưng vẫn được ghi và tính vào số đã ôn | N9, F20, CR17; ngoại lệ phiên tự chọn và cách tính số đã ôn `ASSUMPTION` |
| LR8 | **Phiên flashcard.** Chọn nguồn là một nhóm (kèm lọc trạng thái, mặc định `not_learned` và `needs_review`) hoặc danh sách "hôm nay"; thứ tự ngẫu nhiên; mỗi lần đánh dấu ghi ngay, không có trạng thái phiên ở server. Thẻ trả về: lemma, loại từ, level, nghĩa theo tiếng mẹ đẻ (CR7), nhãn ngữ cảnh, định nghĩa tiếng Anh nếu có, ví dụ, câu ngữ cảnh riêng của người học | F20, CR7, CR14 |
| LR9 | **Thêm nhanh.** Người học nhập từ (kèm câu chứa từ, tùy chọn). Learning gọi chuỗi tra nghĩa của Content (CR15) và trả: sense catalog khớp, hoặc gợi ý từ nguồn ngoài hoặc AI, hoặc form tự nhập. Yêu cầu tra mang `operation_id` (khóa của client); gửi lại cùng khóa sau một thành công trả kết quả đã lưu và không gọi nguồn ngoài hay AI lần hai; việc giữ chỗ hạn mức của bước AI do Content điều phối. Người học xác nhận một lựa chọn; khi đó Learning tạo từ riêng tư nếu cần (qua Content), lưu câu ngữ cảnh, tạo mục học và thêm vào nhóm "Mới thêm" (hoặc nhóm được chọn). Thao tác xác nhận mang `Idempotency-Key`, và từ góc nhìn người học là **tất cả hoặc không gì cả** | K19, K20, CR15, SR8; tính nguyên tử và chọn nhóm `ASSUMPTION` |
| LR10 | **Trùng.** Nếu sense đã có mục học thì thêm nhanh trả lại mục sẵn có kèm cờ "đã có" và vẫn lưu thêm câu ngữ cảnh nếu có | ASSUMPTION |
| LR11 | **Nhật ký.** Append-only, không sửa; chỉ bị xóa khi xóa tài khoản, hoặc khi xóa một từ riêng tư thì xóa các bản ghi của mục học thuộc từ đó (CR23). Các loại bản ghi: `item_added`, `item_removed`, `status_changed` (trạng thái cũ và mới), `review_outcome` (nguồn flashcard hoặc practice, kết quả, mức trước và sau, mục có đang đến hạn không, ngày đến hạn trước đó). Mỗi bản ghi có giờ server | K14; thêm các loại ngoài `status_changed` `ASSUMPTION` (lý do: FSRS nhận lịch sử ôn tập, R44) |
| LR12 | **Đồng thời.** Hai thiết bị đổi trạng thái cùng mục: ghi cuối cùng theo giờ server thắng. Tên nhóm và thành viên nhóm dùng kiểm tra phiên bản, bên thua được báo tải lại. Lịch ôn được server tính tuần tự theo thứ tự đến, nên kết quả thứ hai đến sau thấy mục không còn đến hạn và áp dụng quy tắc ôn sớm | F19, SR13; hệ quả "thấy mục không còn đến hạn" là suy luận từ LR5 |
| LR13 | **Sense retired hoặc bị bỏ publish.** Nằm lại trong nhóm kèm nhãn "nghĩa đã đổi", bị loại khỏi danh sách "hôm nay" và phiên mới, người học bỏ được; không tự chuyển tiến độ sang sense mới | CR17, F14 |
| LR14 | **Đo trong pilot.** Nhật ký đủ để tính: số từ thêm mỗi người mỗi tuần; tỉ lệ mục đến hạn được ôn trong 48 giờ; ngày có hoạt động (ít nhất một bản ghi) để tính quay lại sau 7 và 14 ngày. Tỉ lệ đúng ở lần làm thứ hai của từ yếu tính từ dữ liệu của Practice | K19–K25 (mục đo ở DECISIONS mục 8) |
| LR15 | **Múi giờ.** Ngày đến hạn là một **ngày theo lịch** của múi giờ người học lúc lên lịch; đổi múi giờ không tính lại các ngày đã lên lịch, nhưng "hôm nay" được tính theo múi giờ hiện tại | SR13; không tính lại `ASSUMPTION` |
| LR16 | **Xóa tài khoản.** Xóa nhóm, mục học, trạng thái, lịch ôn và nhật ký của người đó | K3, SR11 |

## Acceptance criteria — «When … then …»

| # | Criterion | Cites |
|---|---|---|
| L1 | When a learner creates a group with a name that already exists for them (ignoring case and surrounding spaces), then the request is rejected with a Problem Details error | LR1 (`ASSUMPTION`) |
| L2 | When a learner deletes a group, then the senses in it keep their status and review schedule and still appear in the "today" list when due | F18 |
| L3 | When a learner adds a published sense to a group for the first time, then a learning item is created with status `not_learned`, level 0 and due today | LR2 |
| L4 | When a learner adds a sense that belongs to someone else or is not published, then the response is "not found" | S6 |
| L5 | When a learner bulk-adds a level or a topic, then function-word senses are not added; when the learner adds one by hand, it is added and then studied like any other | K11 |
| L6 | When a learner sets a status, then it is stored, a `status_changed` record with old and new value is appended to the log, and no review result in Practice ever changes it | K14 |
| L7 | When a due item is marked `known`, then its level goes up by one (at most 5) and its due date is today plus the interval of the new level | K21 |
| L8 | When a due item is marked `not_learned` or `needs_review`, or answered wrongly in Practice, then its level becomes 1 and it is due tomorrow | N8 |
| L9 | When an item that is not yet due is marked `known`, then its level and due date do not change | LR5 (`ASSUMPTION`) |
| L10 | When Practice reports the outcome of an attempt twice with the same attempt ID, then the schedule is updated only once | SR8 |
| L11 | When the "today" list is requested, then it contains at most 10 new and 50 review items, the longest-overdue first, items already reviewed today count against those caps, and the rest stay due for the following day | N9 |
| L12 | When a learner starts a flashcard session on a group, then the default filter is `not_learned` plus `needs_review`, the order is random, and each marking is stored immediately | F20 |
| L13 | When a learner confirms a quick-add for a word the catalog has, then the sense is linked without creating a private entry, the item is created and added to "Mới thêm" | K19 |
| L14 | When a learner confirms a manually typed word with a context sentence, then a private entry and the sentence are created through Content, the item is added to "Mới thêm", and either everything is saved or nothing is | LR9 (`ASSUMPTION`) |
| L15 | When the same quick-add confirmation is sent twice with the same `Idempotency-Key`, then only one item exists afterwards | SR8 |
| L16 | When a quick-add targets a sense the learner already learns, then the existing item is returned flagged as already added and no duplicate is created | LR10 (`ASSUMPTION`) |
| L17 | When the lookup chain has no external or AI step available, then quick-add still works through manual entry | K20 |
| L18 | When a sense is retired or unpublished, then it stays in the learner's groups marked "nghĩa đã đổi", disappears from the "today" list and new sessions, and the learner can remove it | CR17 |
| L19 | When two devices change the status of the same item at nearly the same time, then the later write by server time wins; when they rename the same group, then the later one is told to refresh | F19 |
| L20 | When the log is read for a pilot user, then the weekly count of added words, the share of due items reviewed within 48 hours, and the active days can be computed from it | K14 |
| L21 | When a learner chooses "remove from learning", then the status and schedule are deleted and an `item_removed` record is appended | LR2 (`ASSUMPTION`) |
| L22 | When a learner deletes the account, then the learner's groups, items, statuses, schedules and log are removed | K3 |
| L23 | When Practice sends `remembered` or `forgotten` for an attempt, then Learning applies exactly that outcome and does not derive one from correct or incorrect itself | K22 |
| L24 | When the same quick-add lookup is sent twice with the same key after a success, then the external source and the AI are called at most once | SR8 |

## Edge cases

| # | Edge case | Expected | Cites |
|---|---|---|---|
| LE1 | A learner returns after 60 days with 400 items due | Only 10 new and 50 review items appear per day, the rest wait; levels are not demoted by the absence | N9 |
| LE2 | A learner changes time zone | Already scheduled due dates are not recomputed; "today" follows the new zone | LR15 (`ASSUMPTION`) |
| LE3 | Two devices review the same due item within seconds | The first result updates the schedule; the second finds the item no longer due and follows the early-review rule | LR12 |
| LE4 | A sense in a learner's group is retired and replaced by a new sense | No progress is moved; the learner can add the new sense, which starts at level 0 | F14 |
| LE5 | A private word is deleted by its learner | Its item, status, schedule and group membership are removed | CR23 (`ASSUMPTION`) |
| LE6 | The group cap of 2,000 senses is reached | Adding is refused with a Problem Details error | LR1 (`ASSUMPTION`) |
| LE7 | The lookup chain fails or times out in the middle of a quick-add | The learner is offered manual entry; nothing is half-saved | K20 |
| LE8 | A review outcome from Practice arrives for an item the learner has removed from learning | It is ignored and logged without recreating the item | ASSUMPTION |
| LE9 | A function-word item added by hand reaches its due date | It appears in the "today" list like any other item | LR3 |
| LE10 | A learner marks a card while offline | Not supported; the client must retry online (V1 is online-only) | F5 |
| LE11 | A learner has already reviewed 50 due items today and asks for the "today" list again | No further review items are offered until tomorrow, while a self-chosen group session is still allowed | LR7 (`ASSUMPTION`) |

## Defense Analysis (rút gọn)

| Case | Hành vi bảo vệ | Phát hiện → khôi phục | Kiểm chứng dự kiến |
|---|---|---|---|
| Kết quả ôn tới hai lần (thử lại, hai thiết bị) | Khóa duy nhất theo operation ID hoặc ID lượt làm bài (LR6) | Bản ghi `review_outcome` trùng khóa → bỏ qua | Gửi hai lần cùng ID |
| Thêm nhanh lỗi giữa chừng (đã tạo từ riêng tư nhưng chưa thêm vào nhóm) | Tất cả hoặc không gì cả (LR9); thử lại với cùng `Idempotency-Key` cho cùng kết quả | Log theo `operation_id` | Ngắt giữa tạo từ và thêm vào nhóm |
| Hai thiết bị ôn cùng mục | Server tính tuần tự, ôn sớm không tăng mức (LR5, LR12) | — | Hai kết quả `remembered` cùng lúc |
| Dồn việc sau thời gian dài vắng | Trần 10 mới và 50 ôn mỗi ngày (LR7) | — | 400 mục đến hạn |
| Múi giờ và ranh giới ngày | Ngày theo lịch của múi giờ hiện tại, không tính lại ngày đã lên lịch (LR15) | — | Đổi múi giờ lúc nửa đêm |
| Nội dung bị đổi trong lúc đang học | Sense retired ở lại trong nhóm kèm nhãn, bị loại khỏi phiên mới (LR13) | — | Retire một sense đang có lịch |
| Lộ dữ liệu giữa người học | Mọi nhóm, mục và nhật ký chỉ thuộc chủ sở hữu (S6) | Kiểm thử đối kháng | Người B đoán ID nhóm của người A |
| Nhật ký phình to | Chỉ ghi bốn loại bản ghi, append-only; xóa theo tài khoản | Theo dõi kích thước | Một người dùng ôn 50 mục mỗi ngày trong một năm |

## Cross-module contract notes

| Với module | Learning hứa hoặc cần |
|---|---|
| Vocabulary Content | Cần tra theo chuỗi (CR15), tạo từ riêng tư, lưu câu ngữ cảnh (CR14), danh sách theo level hoặc chủ đề đã loại từ chức năng (CR10), và thông báo sense retired hoặc bỏ publish (CR17) |
| Practice | Cung cấp danh sách "hôm nay" và nhóm làm nguồn câu hỏi; **nhận** kết quả ôn từ Practice qua một thao tác idempotent theo ID lượt làm bài (LR6); Practice không bao giờ đổi trạng thái |
| Identity & Access | Dùng user ID và múi giờ của người học |
| Entitlements & Usage | Không gắn quyền: mọi tính năng của Learning dùng được ở gói Free (F34) |

## Provenance markers used above

- **K#** — quyết định đã chốt; **N#, F#** — mặc định hoặc đề xuất mang nhãn riêng ở nguồn (N7–N11 là `ASSUMPTION`; nhiều F# có con số là `ASSUMPTION`); **R#** — finding trong `research.md` (R44 là `documented (02/10)`).
- **S#, SR#, C#, CR#** — spec khác cùng đợt. **ASSUMPTION** — không có nguồn; được mang vào báo cáo cuối.
