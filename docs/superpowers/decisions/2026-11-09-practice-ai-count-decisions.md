# Decisions — số câu AI do người học chọn, số câu tối đa theo cài đặt admin

Ngày 09/11/2026. Đi cùng design
[`../specs/2026-11-09-practice-ai-count-design.md`](../specs/2026-11-09-practice-ai-count-design.md). File này gom các quyết định đã chốt trong chat ngày
09/11/2026: các phương án thật sự đã đưa ra, trade-off, lựa chọn và ai chốt. Design nói làm thế nào; file này nói vì sao và đã bỏ gì.

**Nhãn:** ✅ = đã chọn. **Ai:**
- "Chủ dự án": chọn trực tiếp trong chat.
- "Chủ dự án nhờ đề xuất": chủ dự án bảo Claude đề xuất, rồi duyệt.
- "Duyệt cùng phần thiết kế": Claude đề xuất khi trình bày từng phần, chủ dự án trả lời "ok".

Theo luật "chủ dự án nghĩ trước" của dự án: Claude hỏi chỉ kèm bối cảnh, không nêu đề xuất; đề xuất đưa sau câu trả lời.

Ví dụ xuyên suốt: Lan có nhóm "IELTS" 300 từ: Mọi từ 300, Cần ôn 24, Ưu tiên 4, ngăn Mới 36.

## Tóm tắt

| # | Quyết định | Chọn | Ai |
|---|---|---|---|
| D1 | Người học hay hệ thống quyết định số câu AI? Admin giới hạn thế nào? | Người học chọn; admin đặt tối đa theo mức cố định hoặc tỉ lệ số câu của phiên | Chủ dự án |
| D2 | Số câu AI tối đa có vượt số câu của phiên? | Không | Chủ dự án ("khả năng là vậy") |
| D3 | Tổng số câu của phiên giữ như hiện nay hay đổi theo số từ? | Đổi theo số từ, tùy phạm vi (Mọi từ, Cần ôn, Ưu tiên, ngăn) | Chủ dự án |
| D4 | Admin cấu hình số câu tối đa của phiên ra sao? | Dropdown hai chế độ: mức cố định / bằng số từ của phạm vi | Chủ dự án |
| D5 | Chế độ theo số từ: bằng số từ hay nhân hệ số? | Bằng số từ | Chủ dự án |
| D6 | Ai chọn cách xếp câu AI? | Cả admin và người học | Chủ dự án |
| D7 | Admin và người học kết hợp thế nào? | Dropdown admin ba giá trị: Rải đều / Ngẫu nhiên / Để người học chọn | Chủ dự án |
| D8 | Mở hộp, ô "Số câu AI" có sẵn số nào? | 0 | Chủ dự án |
| D9 | Chọn nhiều câu AI hơn lượt còn lại? | Ô dừng ở số lượt còn lại | Chủ dự án |
| D10 | Đợt này làm tới đâu? | API, giao diện admin, Figma; không viết web người học | Chủ dự án |
| D11 | Chế độ theo số từ có trần không? | Trần 100 câu | Chủ dự án |
| D12 | Xếp câu AI bằng cách nào? | Đánh dấu từ (cách đang dùng) | Chủ dự án nhờ đề xuất |
| D13 | "Rải đều" có bỏ ưu tiên câu AI có sẵn không? | Không bỏ: giữ ưu tiên, chỉ cần rải rác | Chủ dự án, Claude đề xuất theo |
| D14 | Mặc định của các cài đặt | 20 câu, câu AI 50%, Rải đều | Duyệt cùng phần thiết kế |
| D15 | Số câu hoặc số câu AI vượt mức tối đa | Hạ số, không báo lỗi | Duyệt cùng phần thiết kế |
| D16 | Câu AI ít hơn số câu mà không có kiểu câu thường | 400 | Duyệt cùng mockup vòng 14 |
| D17 | Phần admin có vẽ trước không? | Có: mockup HTML vòng 14 cho cả admin và hộp | Chủ dự án |

## D1 — Ai quyết định số câu AI

Bối cảnh: hiện API tự tính số câu AI theo tỉ lệ kiểu câu; admin chỉ đặt mức tối đa cố định của phiên (20). Tin nhắn đầu của chủ dự án: "cho user có thể
chọn số lượng câu AI và tối đa là số câu hỏi trong một phiên … trong admin có thể chỉnh được thêm một option là điều chỉnh tối đa số câu luyện tập dựa trên
số từ trong một nhóm". Claude viết lại cách hiểu, trong đó ghi "Admin không đặt mức tối đa cố định nữa; số câu tối đa của phiên tính theo số từ trong nhóm".

Chủ dự án sửa: "thật ra nó sẽ là điều chỉnh số lượng câu AI trong một phiên, và tối đa số câu dựa trên config của admin, admin có thể set số câu tối đa theo
một mức cố định hoặc theo tỉ lệ dựa trên tổng số câu trong một phiên".

| Cách hiểu | Trade-off |
|---|---|
| Admin đặt số câu tối đa của phiên theo số từ của nhóm (cách hiểu đầu của Claude) | Không nói gì về số câu AI |
| ✅ Người học chọn số câu AI; admin đặt số câu AI tối đa theo mức cố định hoặc tỉ lệ số câu của phiên | Thêm hai cài đặt AI; phần "theo số từ" thành câu hỏi riêng (D3) |

## D2 — Số câu AI tối đa và số câu của phiên

Claude giả định: số câu AI không bao giờ vượt tổng số câu của phiên, kể cả ở mức cố định (mức 15, phiên 10 câu → tối đa 10). Chủ dự án: "khả năng là vậy".

| Phương án | Trade-off |
|---|---|
| ✅ Không vượt số câu của phiên | Một phiên không thể đòi nhiều câu AI hơn số câu |
| Cho vượt | Không có nghĩa: phiên chỉ có chừng đó câu |

## D3 — Tổng số câu của phiên

Bối cảnh: tin nhắn đầu có nhắc "dựa trên số từ trong một nhóm". Câu 2 hỏi phần này còn đổi không.

| Phương án đưa ra | Trade-off |
|---|---|
| (a) Giữ như hiện nay: một mức chung, ví dụ 20 | Không đổi; nhóm 4 từ vẫn cho 20 câu (mỗi từ hỏi 5 lần) |
| ✅ (b) Đổi theo số từ của nhóm | Phiên vừa với phạm vi; phải đếm số từ khi mở phiên |
| (c) Cách khác | — |

Chủ dự án chọn (b) và nói thêm: "còn tùy thuộc vào loại nhóm, ví dụ như mọi từ, cần ôn, ưu tiên, theo ngăn hoặc từ mới". Claude đọc code: các loại đó là
bộ lọc `group_filter` (`all`, `due`, `priority`, ngăn `0`–`5`, "Mới" là ngăn 0), nên số từ tính theo **phạm vi sau khi lọc**.

## D4 — Admin cấu hình số câu tối đa của phiên

Câu 3 đưa ra cách tính từ số từ:

| Phương án đưa ra | Trade-off |
|---|---|
| (a) Bằng số từ, chung cho mọi loại | Mỗi từ hỏi tối đa một lần |
| (b) Số từ nhân hệ số admin đặt | Mỗi từ hỏi tối đa "hệ số" lần |
| (c) Admin đặt quy tắc riêng cho từng loại | Linh hoạt nhất, nhiều ô cài đặt nhất |
| (d) Cách khác | — |

Chủ dự án trả lời bằng một cách khác: giữ cả mức cố định lẫn mức theo số từ, "trong admin có 2 option, một là tối đa theo admin set, 2 là tối đa dựa trên số
từ theo loại, thì nó nên là một dropbox trong admin chọn".

✅ Dropdown `session_max_mode`: Mức cố định / Bằng số từ của phạm vi. Mức cố định giữ ô số hiện có (`max_questions_per_session`), "để sau này có cần thì sẽ setup".

## D5 — Chế độ theo số từ: bằng hay nhân hệ số

| Phương án đưa ra | Trade-off |
|---|---|
| ✅ (a) Bằng số từ | Ưu tiên 4 từ tối đa 4 câu; mỗi từ hỏi tối đa một lần |
| (b) Số từ nhân hệ số admin nhập | Ưu tiên 4 từ hệ số 2 tối đa 8 câu; thêm một ô |
| (c) Cách khác | — |

Chủ dự án: "a".

## D6 — Ai chọn cách xếp câu AI

Bối cảnh: hiện ở vòng 1, câu AI rải đều theo thứ tự từ (từ có câu AI chưa hỏi được ưu tiên); từ vòng 2, bốc ngẫu nhiên.

| Phương án đưa ra | Trade-off |
|---|---|
| (a) Luôn ngẫu nhiên | Có thể hai câu AI liền nhau |
| (b) Luôn rải đều | Đều, nhưng đoán trước được |
| ✅ (c) Admin chọn bằng dropdown | Thêm một cài đặt |
| ✅ (d) Người học chọn trong hộp | Thêm một lựa chọn trong hộp |
| (e) Cách khác | — |

Chủ dự án: "c và d". Cách kết hợp chốt ở D7.

## D7 — Admin và người học kết hợp thế nào

| Phương án đưa ra | Trade-off |
|---|---|
| (a) Admin đặt mặc định, người học đổi được cho từng phiên | Hộp luôn có lựa chọn này |
| ✅ (b) Dropdown admin có ba giá trị: Rải đều, Ngẫu nhiên, Để người học chọn; chỉ giá trị thứ ba hiện lựa chọn trong hộp | Hộp gọn hơn khi admin đã chốt |
| (c) Cách khác | — |

Chủ dự án: "b".

## D8 — Mặc định của ô "Số câu AI"

| Phương án đưa ra | Trade-off |
|---|---|
| ✅ (a) 0 | Không tốn lượt nếu người học không để ý; muốn câu AI phải tự tăng |
| (b) Mức tối đa được phép | Dùng AI nhiều nhất; dễ tốn lượt ngoài ý muốn |
| (c) Một số mặc định admin đặt | Thêm một ô cài đặt |
| (d) Số chọn ở phiên trước | Cần nhớ lựa chọn |
| (e) Cách khác | — |

Chủ dự án: "a".

## D9 — Chọn nhiều câu AI hơn số lượt còn lại

| Phương án đưa ra | Trade-off |
|---|---|
| ✅ (a) Ô dừng ở số lượt còn lại, kèm dòng "Còn N lượt câu AI" | Không có lỗi khi bấm Bắt đầu |
| (b) Cho chọn, báo "Không đủ lượt câu AI" khi bấm Bắt đầu (403 như hiện nay) | Người học phải sửa rồi bấm lại |
| (c) Cho chọn, phiên vẫn mở, phần thiếu thành câu thường | Số câu AI thật khác số đã chọn |
| (d) Cách khác | — |

Chủ dự án: "a". Claude thêm (duyệt cùng D15): API vẫn kiểm lại lúc mở phiên và trả 403, vì lượt có thể bị dùng ở thiết bị khác.

## D10 — Phạm vi đợt này

| Phương án đưa ra | Trade-off |
|---|---|
| (a) Chỉ API và admin; hộp mới làm sau | API phải giữ cách chia cũ cho web hiện nay |
| (b) API, admin và hộp mới vòng 13 trong web | Phạm vi lớn nhất |
| (c) API, admin, thêm ô "Số câu AI" vào hộp cũ | Hộp cũ phải làm lại khi có hộp mới |
| (d) Cách khác | — |

✅ Chủ dự án chọn một cách khác: "làm api, admin giao diện và mockup figma, không viết web người học". Hệ quả: API giữ cách chia cũ khi không có `ai_count`.

## D11 — Trần của chế độ theo số từ

Bối cảnh: một nhóm chứa tới 2.000 từ (`items_per_group`, admin nâng được tới 10.000). Danh sách từ khác của phiên gửi cho AI khi viết câu điền từ giới hạn 99
từ (`SESSION_WORDS_MAX`).

| Phương án đưa ra | Trade-off |
|---|---|
| ✅ (a) Trần 100 câu, admin không chỉnh | Phiên của phạm vi lớn bị cắt ở 100 |
| (b) Không trần, chấp nhận kiểm thiếu | Phiên trên 100 từ có thể có câu điền từ AI với hai đáp án đúng |
| (c) Không trần, gửi đủ danh sách cho AI | Prompt dài hơn nhiều, tốn và chậm hơn |
| (d) Cách khác | — |

Chủ dự án: "a".

## D12 — Cách xếp câu AI

Bối cảnh: hai cách chỉ khác nhau khi phiên có nhiều câu hơn số từ (chế độ Mức cố định). Chủ dự án xem minh họa ("visual mình xem") rồi bảo "bạn rec đi".

| Phương án đưa ra | Trade-off |
|---|---|
| ✅ (a) Đánh dấu từ khi mở phiên (cách đang dùng); vòng 2 trở đi: Ngẫu nhiên theo xác suất, Rải đều theo "chậm so với lịch" | Sửa ít; phần làm sẵn câu AI giữ nguyên; vòng 2 trở đi chỉ gần đều |
| (b) Lập danh sách vị trí câu AI khi mở phiên | Đúng vị trí ở mọi vòng; từ không dùng được AI rơi vào vị trí thì phải dời, có khi mất chỗ; phải viết lại phần làm sẵn |
| (c) Cách khác | — |

Claude đề xuất (a): ở chế độ theo số từ hai cách giống hệt nhau; (b) cũng không đều tuyệt đối vì phải dời chỗ; (a) ít rủi ro hơn. Chủ dự án duyệt Phần 3 sau đó.

## D13 — Ưu tiên câu AI có sẵn khi "Rải đều"

Bối cảnh: khi trình bày Phần 3, Claude đề xuất bỏ ưu tiên từ đã có câu AI chưa hỏi để vị trí đều tuyệt đối, và nói sai rằng lượt AI của người học không tăng.
Chủ dự án hỏi "là sao ta visual mình xem". Claude dựng minh họa, sửa lại: bỏ ưu tiên thì **lượt AI của người học cũng tăng**, vì câu dùng lại không tốn lượt.

| Phương án đưa ra | Trade-off |
|---|---|
| ✅ (1) Cách cũ: dùng câu có sẵn trước, các câu còn lại rải cách quãng | Tốn ít lượt nhất; câu AI có thể gần nhau |
| (2) Rải đều tuyệt đối, bỏ ưu tiên | Đều nhất; tốn nhiều lượt nhất |
| (3) Gần đều: lệch tối đa một câu để dùng câu có sẵn | Ở giữa hai cách trên |

Chủ dự án: "ý là rải rác thôi, dù gì nó cũng là thứ tự làm, không quá quan trọng". Claude đề xuất theo: giữ (1) cho Rải đều; Ngẫu nhiên cũng dùng câu có sẵn
trước, phần còn lại bốc ngẫu nhiên. Lượt AI không tăng so với hiện nay.

## D14 — Mặc định của các cài đặt

Claude đề xuất trong Phần 1, chủ dự án "ok": số câu tối đa Mức cố định 20 (như hiện nay); số câu mặc định 10; số câu AI tối đa Theo tỉ lệ 50%; cách xếp
Rải đều (gần cách hiện nay).

## D15 — Hạ số thay vì báo lỗi

Claude đề xuất trong Phần 2, chủ dự án "ok": `count` vượt số câu tối đa, hoặc `ai_count` vượt trần AI, bị hạ xuống, không trả 400. Lý do: số từ của phạm vi
và cài đặt admin có thể đổi giữa lúc mở hộp và lúc bấm Bắt đầu. 400 chỉ cho giá trị sai kiểu và các tổ hợp không chạy được (D16). Thay đổi nhỏ so với hiện nay:
`count` lớn hơn mức cố định trước đây bị 400.

## D16 — Không có kiểu câu thường cho các câu không phải AI

Claude phát hiện khi vẽ mockup vòng 14: Lan tắt hết kiểu câu thường, chọn 3 câu AI trong phiên 10 câu, thì 7 câu còn lại không có kiểu nào để hỏi. Đề xuất: hộp
báo "Chọn ít nhất một kiểu câu không cần AI cho 7 câu còn lại", API trả 400. Chủ dự án "ok".

## D17 — Mockup phần admin

Claude định code thẳng phần admin (không có khung Figma cho trang cài đặt). Chủ dự án yêu cầu "mockup" cho cả phần admin và hộp. Mockup HTML vòng 14 vẽ cả
hai; chủ dự án "ok" sau khi xem. Figma vẫn chỉ vẽ hộp Tùy chỉnh phiên (Overlay 7).

## Đề xuất kỹ thuật được duyệt cùng thiết kế

| Chọn | Bỏ | Vì sao |
|---|---|---|
| Tỉ lệ AI làm tròn xuống (50% của 7 câu = 3) | Làm tròn lên | Không vượt tỉ lệ admin đặt |
| Chế độ theo số từ: số câu = số từ hỏi được bằng các kiểu đã chọn (phạm vi 24 từ, 21 từ hỏi được → 21 câu) | Đếm thô số từ của phạm vi | Đếm thô thì 3 từ bị hỏi lại, trái với "mỗi từ tối đa một lần" (D5) |
| Câu AI chỉ đặt vào từ thật sự dùng được AI; với `own_then_ai`, từ đã có câu đã lưu không nhận chỗ AI | Đặt theo tỉ lệ rồi để từ tự bỏ | Lan chọn 4 câu AI là được tới 4 câu AI; câu D3 của đợt `cloze-own-then-ai` hết cần |
| API kiểm lại lượt lúc mở phiên (403) dù hộp đã chặn | Tin con số của hộp | Lượt có thể bị dùng ở thiết bị khác |
| Body thêm `ai_count`, `ai_placement`; không gửi `ai_count` thì chạy cách cũ | Bắt buộc `ai_count` | Web hiện nay không đổi hành vi (D10) |
| `ai_placement` gửi lên bị bỏ qua khi admin đã chốt kiểu | Trả 400 | Hộp mở từ trước khi admin đổi cài đặt vẫn bấm Bắt đầu được |
| Cài đặt mới trả ở `GET /v1/me/app-config` | Một endpoint riêng | Web đã đọc endpoint này cho số câu tối đa và mặc định |
| Phiên lưu thêm `ai_placement` | Đọc lại cài đặt admin mỗi câu | Phiên đang mở không đổi khi admin đổi cài đặt |
| Ô số của chế độ bị ẩn vẫn giữ giá trị | Xóa khi đổi chế độ | Đổi qua lại không mất số đã đặt |

## Ghi chú

- Trong Phần 2, Claude viết nhầm endpoint là `GET /v1/app-config`; endpoint thật là `GET /v1/me/app-config` (`me-app-config.controller.ts`). Design dùng tên đúng.
- Sau review plan độc lập (`../reviews/2026-11-09-practice-ai-count-plan-review.md`), chủ dự án bảo "Sửa plan đi". Các chỉnh kỹ thuật đi kèm:
  - **Thứ tự kiểm ở client cũ giữ nguyên:** không gửi `ai_count` thì `gate` vẫn chạy trước khi đọc từ. Chỉ đường có `ai_count` mới kiểm sau khi đọc từ.
  - **`gate` không được gọi** khi phiên không còn kiểu AI nào.
  - **K chốt = 0 thì bỏ kiểu AI khỏi phiên**, như khi K tạm = 0.
  - **Thứ tự ô admin theo mockup:** "Số câu tối đa mỗi phiên" lên đầu tab; design §6 đã sửa theo.
  - **Mockup vòng 14 giữ ở máy,** không đưa vào PR, theo quy ước tài liệu chủ dự án đọc.
- **Còn chờ chủ dự án** (review I6): với mặc định 50%, phiên chỉ có kiểu câu AI không mở được qua đường mới.
  - Hiện plan theo D16: trả 400.
  - Phương án khác đã đưa ra: tự hạ số câu của phiên xuống bằng số câu AI tối đa.
