# Decisions — câu điền từ: câu đã lưu trước, chưa có thì AI viết

Ngày 09/11/2026. Đi cùng design
[`../specs/2026-11-09-cloze-own-then-ai-design.md`](../specs/2026-11-09-cloze-own-then-ai-design.md). File này gom các quyết định đã chốt trong chat ngày 09/11/2026: các phương án
thật sự đã đưa ra, trade-off, lựa chọn và ai chốt. Design nói làm thế nào; file này nói vì sao và đã bỏ gì.

**Nhãn:** ✅ = đã chọn. **Ai:** "Chủ dự án" = chọn trực tiếp trong chat; "Cùng plan" = Claude đề xuất trong plan, chủ dự án duyệt plan (plan mode).

Ví dụ xuyên suốt: Lan (Pro) mở phiên 3 câu từ nhóm "Công việc", chọn Điền từ vào câu. Nhóm có `deploy` (Lan đã lưu "We deploy every Friday."), `mitigate` và `rollback` (chưa lưu câu nào).

## Tóm tắt

| # | Quyết định | Chọn | Ai |
|---|---|---|---|
| D1 | Phiên có trộn được câu đã lưu với câu AI không? | Có: sửa API, đổi quyết định A11 | Chủ dự án |
| D2 | Từ đã có câu đã lưu: dùng câu đó hay có lúc để AI viết? | Ưu tiên câu đã lưu; chưa có thì AI; người học không dùng AI thì bài tập khác | Chủ dự án |
| D3 | Con số "tối đa N lượt câu AI" trong hộp: mức tối đa hay sát thực tế? | **Chưa chốt**: chốt khi làm hộp mới | Hoãn (chủ dự án hỏi "là sao") |
| D4 | Sửa giao diện ở đâu? | Không sửa hộp hiện có; làm cùng hộp mới | Chủ dự án |
| D5 | Phạm vi đợt này | Chỉ API (cộng cờ `ai` trên mỗi câu) | Cùng plan |

## D1 — Trộn hay giữ như code

Bối cảnh: A11 (26/10/2026) cho điền từ từ câu đã lưu, và chốt "Pro bật cả hai thì câu điền từ AI tự tắt" vì API chỉ giữ một nguồn câu cho cả phiên; chủ dự án duyệt điều đó cùng design.
Với Lan: bật câu đã lưu thì `mitigate` và `rollback` không có câu điền từ nào, dù Lan là Pro. Chủ dự án hỏi "nếu chọn option đó rồi có mấy câu Lan không tự lưu thì sao"; Claude đọc code và trả lời
(từ chưa lưu câu bị bỏ khỏi phiên nếu chỉ chọn câu đã lưu; không tự chuyển sang AI), rồi đưa hai hướng.

| Phương án | Trade-off |
|---|---|
| Giữ như code (câu đã lưu bật thì câu AI tắt) | Không sửa API; không trộn được: từ chưa lưu câu không có câu điền từ |
| ✅ Sửa API để trộn (từ có câu đã lưu dùng câu đó, từ chưa có thì AI viết) | Một nguồn thứ ba, migration nhỏ, đổi cách đánh dấu từ AI và tính lượt AI; phía web phải làm theo |

Chủ dự án: "ừm chốt vậy đi, survey rồi lên plan mode sửa lại".

## D2 — Từ có câu đã lưu

Bối cảnh: hiện code chọn ngẫu nhiên một trong các câu đã lưu của từ; từ lặp ở vòng 2, vòng 3 mà người học chỉ lưu một câu thì gặp lại đúng câu cũ. Claude hỏi trước, không nêu đề xuất
(luật "chủ dự án nghĩ trước").

| Phương án | Trade-off |
|---|---|
| ✅ Luôn dùng câu đã lưu khi từ có câu | Không tốn lượt AI; câu có thể lặp ở vòng sau |
| Có lúc để AI viết câu mới cho từ đã có câu | Đa dạng hơn; tốn lượt AI, phức tạp hơn khi tính lượt |

Chủ dự án trả lời trước khi nghe đề xuất: "có từ câu đã lưu thì ưu tiên dùng cái đó, còn không có thì dùng AI, trong trường hợp người dùng không dùng AI để làm thì lấy các bài tập khác
fallback thay thế". Ba ý: (1) từ có câu đã lưu → dùng câu đó; (2) chưa có → AI viết; (3) người học không dùng AI → từ chưa có câu nhận kiểu bài tập khác. Ý (3) đã đúng với `cloze_source: own`
hiện có ("từ không có câu nhận kiểu khác"); client gửi `own` khi người học tắt AI.

## D3 — Con số lượt AI trong hộp (chưa chốt)

Bối cảnh: lúc mở hộp, web chưa biết bao nhiêu từ có câu đã lưu, nên dòng "Phiên này dùng tối đa N lượt câu AI" là mức tối đa tính như mọi từ đều cần AI. Ví dụ phiên 10 câu có thể hiện "tối đa 5"
nhưng thực tế chỉ dùng 2 vì 3 từ đã có câu đã lưu.

| Phương án | Trade-off |
|---|---|
| Giữ mức tối đa | Không thêm API; con số có thể lớn hơn thực tế |
| Con số sát thực tế | Phải thêm API đếm số từ có câu đã lưu trong phạm vi phiên |

Chủ dự án: "là sao". Chưa có lựa chọn; việc này chỉ ảnh hưởng giao diện nên chốt khi làm hộp mới (Claude đã đưa vào danh sách việc của đợt hộp mới và sẽ giải thích lại bằng ví dụ).

## D4 — Giao diện

| Phương án | Trade-off |
|---|---|
| Sửa hộp Tùy chỉnh phiên đang có trong code ngay | Có ngay; phần giao diện sau phải làm lại theo hộp mới |
| ✅ Đợi hộp mới "hai cột gọn" và làm cùng | API xong trước, giao diện chờ; không làm hai lần |

Chủ dự án: "không sửa, đợi refactor làm luôn".

## D5 — Phạm vi đợt này

Chỉ API, một PR vào `dev`. API **không** đổi hành vi cũ (client hiện tại không gửi nguồn mới), nên merge không làm người học thấy thay đổi nào. Cờ `ai` trên mỗi câu được thêm vì hộp mới cần nó.

## Đề xuất kỹ thuật được duyệt cùng plan

| Chọn | Bỏ | Vì sao |
|---|---|---|
| Giá trị mới `own_then_ai`, giữ nguyên nghĩa của `ai` và `own` | Đổi nghĩa `own` thành "mỗi từ một nguồn" | Client cũ và test cũ không đổi; có thể quay về |
| Mỗi lần hỏi có "vai" (`own` / `ai`) trong `availableTypes` | Một kiểu mới `cloze_own` trong `QuestionType` | Không đổi cột `types` (CHECK), không đổi báo cáo và lịch sử đang đếm theo `cloze` |
| `start` hỏi thêm một lần "phía AI" cho các từ đã giữ và đưa cho `plan` | Sửa `AiSessionPlanner` | Planner đã chọn từ theo bản đồ nó nhận; không phải đụng chỗ tính lượt |
| `ruleTypesOf` thêm `cloze` khi nguồn là `own_then_ai` | Tách một danh sách riêng cho phiên trộn | Fallback và đường `ruleItem` dùng lại nguyên |
| Cờ `ai` trên mỗi câu (`question.source === 'ai'`) | Web tiếp tục suy ra từ `session.cloze_source` | Phiên trộn có cả câu đã lưu lẫn câu AI; chỉ web biết nhãn nào cho câu nào |
| Không thêm API đếm câu đã lưu; không sửa web | | D3 và D4 |

## Ghi chú sau khi làm (09/11/2026)

- Plan nháp từng viết "phiên trộn cần Pro". Smoke cho thấy sai: từ đợt chuẩn bị launch A, gói Miễn phí có 15 lượt câu AI mỗi tháng, nên Free mở được phiên `own_then_ai`.
  Quyết định không đổi; chỉ mô tả phạm vi gói được sửa. Chi tiết ở delivery record.
