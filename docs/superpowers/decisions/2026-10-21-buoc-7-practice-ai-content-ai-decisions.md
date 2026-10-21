# Decisions — Bước 7: Practice AI + Content AI (bài luyện có AI, AI tra nghĩa, báo lỗi và trả lượt; chỉ API)

Ngày: 20–21/10/2026. Đi kèm design doc [`../specs/2026-10-21-buoc-7-practice-ai-content-ai-design.md`](../specs/2026-10-21-buoc-7-practice-ai-content-ai-design.md).
File này gom mọi quyết định của brainstorm Bước 7, mỗi quyết định kèm các phương án **đã thật sự đưa ra** (trong file câu hỏi và trong chat), trade-off và lựa chọn.
Design mô tả *cách làm*; file này trả lời *tại sao chọn vậy và đã bỏ gì*. Nguồn: file câu hỏi
[`../reviews/2026-10-20-buoc-7-questions.md`](../reviews/2026-10-20-buoc-7-questions.md) (chủ dự án trả lời trong file) và nhật ký hỏi đáp bốn vòng
[`../reviews/2026-10-21-buoc-7-qa-log.md`](../reviews/2026-10-21-buoc-7-qa-log.md).

> **Trạng thái 21/10/2026:** 27 câu đã chốt (bốn vòng). Design đã viết và qua review độc lập
> ([`../reviews/2026-10-21-buoc-7-design-review.md`](../reviews/2026-10-21-buoc-7-design-review.md)); design đã sửa theo review (§0b). Năm câu sau review chốt thành D30–D34.
> Chủ dự án duyệt design ("ok viết plan luôn đi bạn"). **Đã chốt toàn bộ.**

**Nhãn:** ✅ = phương án được chọn. **Ai chốt:** "Chủ dự án" = chủ dự án chọn; "Đề xuất của Claude" = chủ dự án để trống hoặc trả lời "theo bạn đề xuất", Claude đề
xuất, chủ dự án đồng ý; "Duyệt cùng design" = Claude đề xuất trong design, chủ dự án duyệt cả bản.

**Cách hỏi ở Bước 7:** luật "chủ dự án trả lời trước, Claude đề xuất sau" (D1). Theo yêu cầu của chủ dự án (20/10), 27 câu viết sẵn trong một file để trả lời **một
lượt**; các phương án trong file không theo thứ tự ưu tiên, không có phương án nào là gợi ý của Claude. Sau đó Claude gửi đề xuất một lượt cho từng câu (vòng 1), chủ dự
án trả lời trong chat theo số câu (vòng 2–4). Câu cần số liệu có research riêng trong `docs/preparation/` (chất lượng câu AI; mô tả gói và luật; người học bản ngữ tiếng
Anh); research chỉ nêu dữ kiện. Mô phỏng bấm được trong chat: phiên có câu AI (câu 5–7), ba cách hiểu "câu chứa từ rồi chọn" (câu 16), luồng tra nghĩa (câu 18–20; làm
lại bản dễ hiểu hơn ở vòng 3 vì chủ dự án "chưa hiểu lắm" bản đầu).

## Tóm tắt

| # | Câu | Quyết định | Phương án chọn | Ai chốt |
|---|---|---|---|---|
| D1 | 1 | Luật hỏi | (a) Giữ: chủ dự án trả lời trước | Chủ dự án |
| D2 | 2 | Phạm vi | (a) Chỉ API | Chủ dự án |
| D3 | 3a | "Xong khi" có gọi AI thật | (a) Không; chủ dự án tự chạy thật sau | Chủ dự án (khác đề xuất (b) của Claude) |
| D4 | 3b | Ai implement | Các phiên song song + phiên điều phối | Chủ dự án |
| D5 | 4 | Một hay hai design | (a) Một design, một plan | Chủ dự án |
| D6 | 5 | Bài AI nằm ở đâu | (a) Trong phiên luyện thường; 1 phiên + 1 lượt mỗi câu AI | Chủ dự án (sau mô phỏng) |
| D7 | 6 | AI không dùng được | Kiểm lượt trước khi mở phiên, không trừ trước; bảng xử lý sự cố giữa phiên | Chủ dự án (hướng riêng của chủ dự án; chi tiết: đề xuất của Claude) |
| D8 | 7 | Chờ AI tạo câu | (b) Tạo trước K câu (admin, mặc định 2); phiên "đang dở"; câu tạo sẵn không mất lượt | Chủ dự án (K: đề xuất của Claude) |
| D9 | 8 | Luật Bước 4 cho bài AI; gợi ý | Áp nguyên 5 luật; điền từ 3 nấc (chữ cái đầu không số chữ → định nghĩa → nghĩa Việt); dạng chọn 1 nấc (định nghĩa) | Chủ dự án |
| D10 | 9 | Câu điền từ lấy từ đâu | (d) Lan chọn khi mở phiên: AI viết / câu đã lưu | Chủ dự án |
| D11 | 10 | Điền từ từ câu đã lưu | Chỉ Trial/Pro (Free không có bài điền từ); không trừ lượt; AI không làm gì | Chủ dự án (sau khi bác (c) của Claude) |
| D12 | 11 | Dùng lại câu AI | (1) Luôn câu AI mới; câu tạo sẵn chưa từng hiện dùng lại 0 lượt; 11b: trang Lịch sử là đủ | Chủ dự án (câu tạo sẵn, 11b: đề xuất của Claude) |
| D13 | 12 | Từ đồng nghĩa vừa chỗ trống | Ba lớp chặn; chấm chặt, được làm lại | Chủ dự án (theo hướng của chủ dự án; chi tiết: đề xuất của Claude) |
| D14 | 13 | Kiểm câu AI trước khi Lan thấy | Không lời gọi kiểm riêng; AI tự rà trong lời gọi tạo câu | Chủ dự án (khác đề xuất (b) của Claude) |
| D15 | 14 | Dạng chia bảng không biết | (c) Danh sách bổ sung; `admin` và `editor` | Chủ dự án |
| D16 | 15 | Người học `en` | Không có ca riêng: từ không có nghĩa tiếng Việt thì không có dạng AI | Chủ dự án (cách làm cụ thể: đề xuất của Claude) |
| D17 | 16 | "Câu chứa từ rồi chọn" | (a) Chọn nghĩa của từ trong câu; nghĩa sai từ dữ liệu, không AI | Chủ dự án |
| D18 | 17 | Trắc nghiệm theo câu | 17a (b) AI viết câu mới; 17b nhiễu trong nhóm, cùng dạng | Chủ dự án |
| D19 | 18 | Khi nào gọi AI tra nghĩa | (b) Chỉ khi Lan bấm nút | Chủ dự án (sau khi xem bảng quyền gói) |
| D20 | 19 | Gửi câu Lan gặp cho AI | (c) Lan tự tick mỗi lần | Chủ dự án |
| D21 | 20 | AI trả từ gốc có trong catalog | (b) Hiện cả hai, catalog trước | Chủ dự án |
| D22 | 21 | Lưu gợi ý thành từ riêng | 21a có, 21b có, 21c có | Chủ dự án |
| D23 | 22 | Từ điển ngoài | (a) Bỏ qua ở Bước 7 | Chủ dự án |
| D24 | 23 | Dịch bổ sung | Bỏ nút dịch; bản dịch đi kèm câu AI hiện sau khi nộp | Chủ dự án |
| D25 | 24 | Lý do báo lỗi | Admin quản lý danh sách lý do (mẫu báo lỗi) | Chủ dự án (hướng riêng của chủ dự án; chi tiết: đề xuất của Claude) |
| D26 | 25 | Câu AI cho từ riêng | AI kiểm từ riêng trước; cho báo lỗi câu AI của từ riêng | Chủ dự án (kiểm trước: hướng của chủ dự án; báo lỗi: đề xuất của Claude) |
| D27 | 26 | Ai xác nhận để trả lượt | 26a (a) `admin` và `editor`; `editor` trả ngay, `admin` xem lại; 26b chỉ báo trong app | Chủ dự án (chi tiết: đề xuất của Claude) |
| D28 | 27 | Con số mới | (a) Admin chỉnh được hết | Chủ dự án |
| D29 | (vòng 3) | Lượt AI tra nghĩa | (ii) Bỏ giới hạn bằng cài đặt có sẵn, không đổi code | Chủ dự án |
| D30 | R2 (sau review) | Lượt của chu kỳ trước được trả không | (a) Trả vào chu kỳ hiện tại như Bước 5 | Chủ dự án ("ok", giữ cách design tạm viết) |
| D31 | R8 (sau review) | Ô định nghĩa khi lưu gợi ý AI | (b) Không thêm | Chủ dự án ("ok", giữ cách design tạm viết) |
| D32 | R17 (sau review) | `graded_wrong` có trả lượt cho câu AI | (b) Không (admin đổi được) | Chủ dự án ("ok", giữ cách design tạm viết) |
| D33 | R18 (sau review) | Staff xử lý báo cáo của chính mình | (b) Được, `admin` thấy trong danh sách | Chủ dự án ("ok", giữ cách design tạm viết) |
| D34 | R23 (sau review) | Bản dịch cho hai dạng chọn | (a) Có, cho cả ba dạng AI | Chủ dự án ("ok", giữ cách design tạm viết) |

## D1 — Luật hỏi ở Bước 7 (câu 1)

Bối cảnh: Bước 3–6 giữ luật "chủ dự án trả lời trước, Claude đề xuất sau" (D27 Bước 4, D1 Bước 5, D1 Bước 6).

| Phương án | Trade-off |
|---|---|
| ✅ (a) Giữ cho Bước 7 | Chủ dự án tự nghĩ trước, hiểu hệ thống; nhiều vòng hơn |
| (b) Bỏ: Claude đề xuất trước mọi câu | Nhanh hơn; dễ chỉ duyệt |
| (c) Giữ cho câu sản phẩm, Claude đề xuất trước cho câu kỹ thuật | Cân bằng |

Claude đồng ý.

## D2 — Chỉ API hay có màn hình (câu 2)

| Phương án | Trade-off |
|---|---|
| ✅ (a) Chỉ API, như Bước 4–6 | Thử bằng script; chưa thử tay được |
| (b) API + màn người học cho riêng phần AI | Thử tay được; thêm việc giao diện |
| (c) API + toàn bộ giao diện người học còn thiếu của Bước 3–6 | Rất nhiều việc |

Claude đồng ý; các mô phỏng chỉ để chọn cách chạy.

## D3 — "Xong khi" có gọi AI thật không (câu 3a)

Bối cảnh: Bước 6 chưa gọi thật lần nào (rủi ro Bước 6 §19); Bước 7 là lúc người học bắt đầu dùng AI.

| Phương án | Trade-off |
|---|---|
| ✅ (a) CI xanh + smoke với bản giả, không gọi thật | Không tốn tiền; chất lượng câu và tỉ lệ bị loại chưa đo |
| (b) Như (a) + một lần chạy thật bằng key của chủ dự án (ví dụ 20 câu cho 20 từ) | Đo được chất lượng; tốn ít tiền (Claude ước dưới khoảng 15.000đ) |
| (c) Gọi thật thành một việc riêng trước Bước 7 | Biết sớm; trễ Bước 7 |

Vòng 1: chủ dự án (a); Claude đề xuất khác, (b), vì bản giả luôn trả câu đúng khuôn nên không đo được tỉ lệ câu bị luật loại (tiền và trải nghiệm). Vòng 3: chủ dự án
"mình sẽ tự test sau" → giữ (a). Rủi ro ghi ở design §20.

## D4 — Ai implement (câu 3b)

Chủ dự án để trống ở vòng 1; Claude đề xuất "có, như Bước 4–6 (các phiên song song + phiên điều phối)". Vòng 3: chủ dự án "song song".

## D5 — Một design hay tách hai (câu 4)

| Phương án | Trade-off |
|---|---|
| ✅ (a) Một design, một plan | Một chỗ đọc; plan lớn (chia mốc) |
| (b) Một design, hai plan hai đợt | Giao từng phần |
| (c) Hai design riêng (Practice AI, Content AI) | Mỗi phần gọn; hai lần duyệt |

Claude đồng ý; plan chia mốc để làm song song.

## D6 — Bài AI nằm ở đâu (câu 5)

Bối cảnh: phiên luyện Bước 4 (nguồn, dạng bài, số câu); mỗi phiên tính vào số phiên mỗi ngày (Pro 30); mỗi câu AI trừ 1 lượt. Chủ dự án phân vân (a) và (b), xin
mô phỏng; Claude dựng mô phỏng `buoc7_q5_q6_q7_practice_session_sim` (hai hướng, kéo số lượt còn lại, giả lập AI lỗi, dừng giữa chừng).

| Phương án | Trade-off |
|---|---|
| ✅ (a) Dạng AI là lựa chọn mới trong phiên luyện thường | Có đường lui khi AI lỗi (đổi sang dạng không AI); một chỗ luyện, dùng lại mọi thứ của Bước 4; một phiên có hai bộ đếm |
| (b) Chế độ "Luyện với AI" riêng | Dễ giải thích ("AI = lượt"), chỗ mời lên Pro rõ; không có đường lui; hai loại phiên phải phân biệt nhiều chỗ |

Claude đề xuất (a). Câu 5b (nếu a): một phiên có câu AI tính 1 phiên **và** mỗi câu AI 1 lượt. Vòng 3: chủ dự án "ok".

## D7 — AI không dùng được giữa phiên (câu 6)

Phương án trong file câu hỏi:

| Phương án | Trade-off |
|---|---|
| (a) Câu đó đổi sang dạng không AI Lan đã chọn, báo một lần | Phiên chạy tiếp |
| (b) Dừng phiên, báo lý do | Rõ; mất phần còn lại |
| (c) Bỏ từ đó, sang từ kế tiếp, lần sau thử AI lại | Không gián đoạn; từ bị bỏ |
| (d) Xử lý khác nhau theo lý do | Đúng từng ca; phức tạp hơn |

**Vòng 1:** chủ dự án trả lời theo hướng riêng: "triển khai theo cách tính credit dự kiến … trừ vào lượng api còn lại trong db, trước khi tạo một phiên mới thì validate
xem lượng api còn lại có đủ để tạo cho một phiên không, nếu không đủ thì báo lỗi đến learner, còn đủ thì cứ cho tạo như bình thường".

Claude đồng ý **kiểm trước**, khác ở hai điểm: (1) không cần pilot để ước số lượt và **không trừ trước**: số lượt một phiên cần = số câu AI của phiên (luật Bước 5: 1 câu
thành công = 1 lượt); trừ trước cần kiểu "giữ lượt cả phiên" mà Bước 5 không có (giữ chỗ sống 2 phút), tức sửa Bước 5; kiểm trước là đủ vì mỗi người chỉ có một phiên mở;
(2) đề xuất bảng xử lý những chuyện kiểm trước không chặn được (AI lỗi ở một câu; hết lượt giữa phiên; AI tắt hoặc chạm trần), theo hướng (a) khi Lan có chọn dạng không AI
và "dừng ở câu đó, [Thử lại] [Dừng, để sau]" khi chỉ chọn dạng AI (câu 6b).

Vòng 4: chủ dự án "ok".

## D8 — Chờ AI tạo câu (câu 7)

| Phương án | Trade-off |
|---|---|
| (a) Tạo khi Lan bấm "câu tiếp", Lan chờ | Đơn giản; mỗi câu AI chờ vài giây tới ~20 giây |
| ✅ (b) Tạo trước câu kế tiếp trong lúc Lan làm câu hiện tại | Không phải chờ; câu tạo trước có thể bị bỏ nếu Lan dừng |

Câu 7b (câu tạo trước mà Lan không làm tới): (x) vẫn trừ lượt · (y) không trừ, chủ dự án chịu tiền · (z) giữ cho phiên sau, không tạo lại.

**Vòng 1:** chủ dự án chọn (b) và thêm: phiên dừng giữa chừng (sự cố hoặc Lan tự dừng) chuyển "paused / đang dở", câu đã tạo giữ trong DB, Lan chọn làm tiếp phiên cũ
hoặc bỏ và mở phiên mới (+1 phiên). Claude đồng ý; thêm: "đang dở" gần như đã có ở Bước 4 (phiên chưa xong vẫn mở), chỉ cần app hỏi; đếm phiên như Bước 5; 7b chọn (z) và
câu tạo sẵn **không bao giờ mất lượt** (dùng ở lần sau từ đó có câu AI).

**Vòng 2:** chủ dự án hỏi "tại sao lại không tạo N câu?". Claude trả lời ba cách:

| Phương án | Trade-off |
|---|---|
| Tạo trước 1 câu | Lượt trừ dần, lời gọi trải đều; có thể phải chờ khi Lan làm nhanh hơn AI |
| ✅ Tạo trước K câu, admin đặt, mặc định 2 | Gần như không phải chờ; lượt vẫn trừ dần; K = N thì thành "tạo đủ N" |
| Tạo đủ N câu lúc mở phiên | Không phải chờ sau lúc mở; lượt tụt ngay khi mở; mỗi lần mở phiên dồn 5–10 lời gọi cùng lúc |

**Vòng 3:** chủ dự án hỏi "có bị tình trạng k + 1 không"; Claude: không tạo quá số câu AI của phiên, không trừ hai lần (mã cố định mỗi câu), chỉ phải chờ khi Lan làm nhanh
hơn AI. **Vòng 4:** chủ dự án "ok" → K, mặc định 2.

## D9 — Luật Bước 4 cho bài AI; gợi ý (câu 8)

Năm luật Bước 4: chấm chuẩn hóa so đúng từng chữ; gõ sai có "Làm lại"/"Bỏ qua"; gợi ý 2 nấc; nút sau câu; "từ hay sai", lịch sử 6 tháng, báo lỗi. Câu 8b: gợi ý nấc 1 của
điền từ AI là gì (nghĩa tiếng Việt, định nghĩa tiếng Anh, bản dịch cả câu, khác).

- Vòng 1: chủ dự án "có, với hint thì chữ cái đầu, definition và nghĩa tiếng Việt theo thứ tự". Claude đồng ý cho điền từ AI (3 nấc) và đề xuất cho hai dạng chọn: trắc
  nghiệm theo câu 1 nấc định nghĩa; "câu chứa từ rồi chọn" không có gợi ý.
- Vòng 2: chủ dự án "điền từ chỉ gợi ý chữ cái đầu, không gợi ý bao nhiêu ký tự; còn về dạng chọn thì chỉ gợi ý định nghĩa; câu chứa từ rồi chọn là câu gì?" → dạng chọn
  (cả hai): 1 nấc định nghĩa (thay đề xuất "không gợi ý" của Claude). Claude giải thích lại dạng "câu chứa từ rồi chọn" và hỏi điền từ chỉ một nấc hay ba nấc.
- Vòng 3: chủ dự án "điền từ thì ba nấc gợi ý, bỏ số chữ".

Áp cả cho bài điền từ từ câu đã lưu (cùng là điền từ; duyệt cùng design).

## D10 — Câu điền từ lấy từ đâu (câu 9)

| Phương án | Trade-off |
|---|---|
| (a) AI viết câu mới | Câu chuẩn; tốn lượt |
| (b) Câu ngữ cảnh của Lan | Câu Lan đã gặp; có thể sai chính tả, dài, dạng khác |
| (c) Cả hai: có câu của Lan dùng trước, không có thì AI viết | Tự động |
| ✅ (d) Cả hai, Lan chọn khi mở phiên | Lan quyết định |

Claude đồng ý; thêm luật: chọn "Câu bạn đã lưu" mà từ không có câu dùng được → dạng khác Lan chọn, không có thì bỏ qua từ.

## D11 — Bài điền từ từ câu của Lan (câu 10)

| Phương án | Trade-off |
|---|---|
| (a) Gói trả phí, trừ 1 lượt | Nhất quán với "bài điền từ là tính năng AI"; trừ lượt cho việc không gọi AI |
| ✅ (b) Gói trả phí, không trừ lượt | Pro có thêm quà; không gọi AI nên không tốn lượt |
| (c) Cho cả Free (như K23) | Free có thêm lý do lưu câu |

Câu 10b (AI làm gì với câu của Lan): dịch (tốn lượt) · kiểm dùng đúng nghĩa · ✅ không làm gì.

Vòng 1: chủ dự án để trống; Claude đề xuất (c) + 10b không làm gì. Vòng 2: chủ dự án "trong trường hợp free plan thì không cho làm điền từ luôn, tại vì nó có chứa yếu tố
AI" → bác (c). Claude hỏi Trial/Pro có trừ lượt không, đề xuất không (bài không gọi AI). Vòng 3: chủ dự án "không" → (b).

## D12 — Dùng lại câu AI đã lưu (câu 11)

Phương án trong file câu hỏi: (a) luôn câu mới · (b) dùng lại câu cũ trước · (c) Lan chọn khi mở phiên · (d) chỉ dùng lại câu Lan từng làm sai.

Vòng 1: chủ dự án đắn đo vì Pro mô tả là AI tạo câu; dùng câu có sẵn có thể sai với mô tả gói, "app bị phạt hoặc bị cấm"; nhờ Claude đưa vài hướng. Claude đưa 5 hướng:

| Hướng | Trade-off |
|---|---|
| ✅ (1) Luôn câu mới | Mô tả gói luôn đúng; lượt tiêu nhanh hơn |
| (2) Lan chọn "Câu AI mới" / "Ôn câu AI đã làm (không trừ lượt)" | Minh bạch; thêm lựa chọn |
| (3) Tự dùng lại câu cũ khi có | Rủi ro mô tả sai nếu gói không ghi |
| (4) Hết lượt thì mời ôn câu cũ | Không chặn cứng |
| ✅ (5) Câu tạo sẵn chưa từng hiện luôn dùng trước | Lan chưa thấy câu đó, với Lan vẫn là câu mới |

Claude đề xuất (1) + (5) + (2) + (4). Research ([`AI_PLAN_CLAIMS_RESEARCH_2026-10-21.md`](../../preparation/AI_PLAN_CLAIMS_RESEARCH_2026-10-21.md)): không luật hay luật
store nào cấm dùng lại; rủi ro nằm ở chữ của gói, và con số "300" cần kèm điều kiện trần toàn hệ thống và công tắc AI. Vòng 2: chủ dự án "thế thì learner thà dùng câu đã học
hoặc câu có sẵn, tại sao lại dùng AI làm gì? … pro đã hứa là dùng AI thì cứ cho dùng AI như bình thường thôi" → (1), bỏ (2) và (4) (ôn câu AI cũ là "hướng phát triển"
sau). Vòng 4: câu tạo sẵn chưa từng hiện, chủ dự án "theo bạn đề xuất" → (5).

Câu 11b (xem lại câu AI cũ): Claude đề xuất trang "Lịch sử" của Bước 4 là đủ; chủ dự án không nêu khác.

## D13 — Từ đồng nghĩa cũng vừa chỗ trống (câu 12)

Phương án trong file: (a) sai như hiện nay, báo lỗi được · (b) đúng nếu AI đã liệt kê từ đó · (c) không chấm sai, báo "đúng nghĩa nhưng bài cần từ khác", cho làm lại.

Vòng 1: chủ dự án "phải handle làm sao để đừng lấy ngữ cảnh chung chung, mà lấy chi tiết hơn cho đúng với việc sử dụng từ đó". Claude đồng ý mục tiêu, đề xuất ba lớp: (1) lời
dặn tạo câu có manh mối cụ thể; (2) AI giải thử trước khi Lan thấy; (3) còn lọt thì chấm theo (a), Lan được làm lại, gợi ý chữ cái đầu, báo lỗi và trả lượt. Vòng 2: chủ
dự án "ok". Lớp (2) đổi thành "AI tự rà trong cùng lời gọi" theo D14.

## D14 — Kiểm câu AI trước khi Lan thấy (câu 13)

Phương án trong file:

| Phương án | Trade-off |
|---|---|
| (a) Chỉ kiểm bằng luật (K16), theo dõi tỉ lệ báo lỗi | Rẻ nhất; câu nhiều đáp án lọt nhiều nhất |
| (b) Thêm một lần AI đọc lại mọi câu AI | Ít câu xấu nhất; thêm một lời gọi mỗi câu (chủ dự án chịu), chậm hơn vài giây |
| (c) AI đọc lại chỉ ở trắc nghiệm theo câu | Kiểm chỗ hại nhất |

Vòng 1: chủ dự án xin phân tích sâu. Claude đề xuất (b), kèm bảng "luật bắt được gì" và research
([`AI_CLOZE_QUALITY_RESEARCH_2026-10-21.md`](../../preparation/AI_CLOZE_QUALITY_RESEARCH_2026-10-21.md)): dặn rõ "chỉ một đáp án" vẫn ~4,9% câu nhiều đáp án; lời gọi kiểm
thứ hai còn sót (lọc nhiễu còn 4,2%; giải thử câu gõ bắt ~30% câu xấu); tiền kiểm ~20–37% một lượt; không cách nào đạt tuyệt đối. Vòng 2: chủ dự án "không tối ưu về mặt chi
phí lắm, nó nên kiểm ở bước tạo câu như câu 12 nói rồi, nên câu này có thể bỏ qua". Claude hỏi lại cách hiểu: không lời gọi kiểm riêng; AI tự rà trong lời gọi tạo câu; dạng
chọn đưa sẵn nhiễu / nghĩa sai vào lời gọi đó; báo lỗi + trả lượt là lớp bảo vệ chính. Vòng 3: chủ dự án "ok".

Hệ quả ghi ở design §0, §20: D6 Bước 4 ("không bao giờ hơn một đáp án") không đạt tuyệt đối; trên thực tế là chặn hết mức lúc tạo + báo lỗi + trả lượt.

## D15 — Dạng chia AI dùng mà bảng không biết (câu 14)

| Phương án | Trade-off |
|---|---|
| (a) Giữ: bị loại thì tạo lại một lần, vẫn loại thì "chưa tạo được" | Không thêm việc; câu đúng bị loại nhầm |
| (b) Khi bảng không biết, nhận thêm dạng theo quy tắc cố định | Tự động; quy tắc có thể sai |
| ✅ (c) Staff có danh sách dạng chia bổ sung | Đúng khi staff thấy câu bị loại nhầm; phải có người làm |

Câu 14b: ✅ `admin` và `editor` (quyền `content.edit`) · chỉ `admin`. Chủ dự án "c, admin và editor đều được". Claude đồng ý; chi tiết: danh sách theo chữ, không ghi
người học.

## D16 — Người học có tiếng mẹ đẻ là tiếng Anh (câu 15)

Phương án trong file: (a) không có bài AI ở V1 · (b) có cho từ catalog, không cho từ riêng của họ · (c) có cho mọi từ: sửa thao tác tạo câu của Bước 6.

Chủ dự án: "không quan trọng chỗ này, không có case riêng biệt … nếu được thì bạn có thể research". Claude đề xuất cách không cần ca riêng nào (thực chất là (b)): dạng AI cần
nghĩa tiếng Việt; từ catalog luôn có nên người học `en` vẫn có; từ riêng của họ không có thì dùng dạng khác; không sửa cổng AI. Research
([`ENGLISH_NATIVE_LEARNERS_RESEARCH_2026-10-21.md`](../../preparation/ENGLISH_NATIVE_LEARNERS_RESEARCH_2026-10-21.md)): không có số người bản ngữ ở app từ vựng nào; app
cho người bản ngữ ra đề bằng định nghĩa tiếng Anh; sau này cần thì thêm một thao tác mới. Vòng 2: chủ dự án "ok".

## D17 — "Câu chứa từ rồi chọn" chọn gì (câu 16)

Phương án (mô phỏng `buoc7_q16_item_types`):

| Phương án | Trade-off |
|---|---|
| ✅ (a) Chọn nghĩa của từ trong câu | Kiểm hiểu nghĩa theo ngữ cảnh; nghĩa sai lấy từ nội dung đã duyệt; rủi ro hai đáp án thấp |
| (b) Chọn bản dịch đúng của cả câu | Kiểm hiểu cả câu; AI viết bản dịch sai dễ ra hai bản cùng đúng; ngược D24 |
| (c) Bốn câu có từ đó, chọn câu dùng đúng | Kiểm cách dùng; AI cố ý viết câu sai, câu "sai" có khi chỉ lạ |

Câu 16b (nghĩa sai lấy từ đâu): các nghĩa khác của chính từ đó · nghĩa của từ khác trong nhóm · AI tự viết.

Vòng 1: chủ dự án xin phân tích và bối cảnh; Claude đề xuất (a), 16b theo thứ tự: nghĩa khác của chính từ → nghĩa của từ cùng nhóm → không bao giờ AI viết; ghi chưa đo được bao
nhiêu từ có ≥ 2 nghĩa (DB thử CEFR-J: 7.799 từ, 7 nghĩa, nội dung chưa soạn). Vòng 2: chủ dự án "a hoặc c, cả 2 đều ổn; 16b: có thể lấy nghĩa tiếng Việt của bất kỳ từ nào
trong dữ liệu, không dùng AI (hoặc theo option 1 của bạn)". Claude đề xuất (a) vì (c) cần AI viết 3 câu sai và phải kiểm thêm; 16b thêm bậc 3 "nghĩa của từ bất kỳ trong dữ
liệu" theo ý chủ dự án. Vòng 3: chủ dự án "a".

## D18 — Trắc nghiệm theo câu (câu 17)

17a (câu): (a) câu ví dụ catalog · ✅ (b) AI viết câu mới · (c) câu AI đã lưu của Lan · (d) câu ngữ cảnh của Lan.
17b (nhiễu): ✅ (x) lấy trong nhóm, AI kiểm từng nhiễu · (y) AI tự đề xuất 3 nhiễu.

Vòng 1: chủ dự án "phải tạo câu làm sao để 1 câu chỉ có thể dùng một từ duy nhất … kiểm tra ngữ cảnh của từ". Claude đề xuất 17a (b), 17b (x) chia cùng dạng rồi AI kiểm.
Vòng 2: chủ dự án "17a: nếu là bài AI thì AI viết câu mới luôn; 17b: nếu là câu AI thì như bạn đề xuất". Phần "AI kiểm" đổi theo D14: nhiễu đưa sẵn vào lời gọi tạo câu.

## D19 — Khi nào gọi AI tra nghĩa (câu 18)

| Phương án | Trade-off |
|---|---|
| (a) Tự động khi catalog và từ riêng không có chữ đó | Có gợi ý ngay; mất lượt cho chữ gõ nhầm |
| ✅ (b) Chỉ khi Lan bấm "Tra bằng AI" | Lan quyết định lúc tiêu lượt; thêm một lần bấm |
| (c) Tự động khi không có; bằng nút khi có mà sai nghĩa | Lai |

Vòng 1: chủ dự án chưa hiểu các hướng; Claude giải thích lại bằng ví dụ (`deplyo`, `rizz`, `deploy` sai nghĩa), đề xuất (b). Vòng 2: chủ dự án "cho mình xem lại quyền hạn gói
pro trước khi mình chốt"; Claude gửi bảng quyền Free/Trial/Pro và mô phỏng làm lại. Vòng 3: chủ dự án "b".

## D20 — Có gửi câu Lan gặp cho AI không (câu 19)

| Phương án | Trade-off |
|---|---|
| (a) Gửi khi Lan có nhập câu | AI chọn nghĩa đúng hơn; chữ Lan gõ tới nhà cung cấp |
| (b) Không bao giờ gửi | Riêng tư nhất; tra kém chính xác hơn |
| ✅ (c) Lan tự chọn mỗi lần (ô tick) | Lan quyết định |

Chủ dự án "c". Claude đồng ý; thêm: mặc định không tick; chính sách riêng tư ghi.

## D21 — AI trả về một từ gốc đã có trong catalog (câu 20)

| Phương án | Trade-off |
|---|---|
| (a) Hiện nghĩa catalog thay gợi ý AI | Nội dung đã duyệt; nghĩa catalog sai nghĩa Lan gặp thì Lan phải tự nhập |
| ✅ (b) Hiện cả hai, Lan chọn | Nội dung đã duyệt đứng trước; vẫn lấy được gợi ý AI |
| (c) Chỉ gợi ý AI | Đơn giản; tạo từ riêng trùng catalog |

Vòng 1: chủ dự án xin chi tiết; Claude giải thích bằng bảng và mô phỏng, đề xuất (b), nghĩa catalog trước. Vòng 3: chủ dự án "b".

## D22 — Lưu gợi ý của AI thành từ riêng (câu 21)

Ba câu có/không: 21a Lan sửa mọi ô trước khi lưu · 21b lưu câu ví dụ AI làm câu ví dụ của từ riêng · 21c ghi nguồn "AI gợi ý".

Vòng 1: chủ dự án "b"; Claude hiểu là "21b: có", đề xuất có cả ba. Vòng 3: chủ dự án "ok" → cả ba có.

## D23 — Từ điển ngoài (câu 22)

| Phương án | Trade-off |
|---|---|
| ✅ (a) Bỏ qua: catalog → AI → tự nhập | Không thêm bộ nối, không giấy phép; mọi chữ lạ dựa vào AI |
| (b) Tìm hiểu và gắn một từ điển ngoài | Nội dung do người làm từ điển viết; giá, giấy phép (cấm lưu, chia sẻ lại), Anh–Anh |

Vòng 1: chủ dự án chưa hiểu câu hỏi; Claude giải thích lại, đề xuất (a), xét lại khi gợi ý AI sai nhiều. Vòng 2: chủ dự án "ok".

## D24 — Dịch bổ sung (câu 23)

Câu 23a (nút ở đâu, chọn nhiều): câu ví dụ catalog · câu ngữ cảnh · đề gõ từ theo câu ví dụ · đề trắc nghiệm theo câu · không làm ở Bước 7. 23b: lưu bản dịch?

Vòng 1: chủ dự án "bỏ phần dịch này được không, trong catalog chỉ hiện ví dụ như cambridge làm" → không làm dịch bổ sung. Claude đồng ý; hỏi một ý: bản dịch đi kèm sẵn câu
điền từ AI hiện sau khi nộp hay bỏ hẳn; đề xuất hiện. Vòng 2: chủ dự án "ok" (Claude hiểu là đồng ý hiện bản dịch đi kèm). Design áp cho cả ba dạng AI (duyệt cùng
design).

## D25 — Lý do báo lỗi cho câu AI (câu 24)

Phương án trong file: (a) giữ 4 lý do · (b) thêm lý do riêng cho câu AI · (c) khác.

Vòng 1: chủ dự án theo hướng riêng: "admin tự động configure trên một trang … thiết lập template cho learner để báo lỗi … learner chọn lỗi => chi tiết lỗi => confirm và gửi
bản template đến cho admin hoặc editor trong một bảng quản lý". Claude đồng ý, đề xuất: "mẫu" = danh sách lý do do `admin` quản lý (tên, dòng gợi ý chi tiết, loại câu áp
dụng, bắt buộc ghi chi tiết, được trả lượt, bật/tắt, thứ tự); thêm sẵn 3 lý do cho câu AI; không làm form nhiều ô. Vòng 2: chủ dự án "ok".

## D26 — Câu AI cho từ riêng của Lan (câu 25)

Phương án trong file: (a) giữ D36: không báo lỗi, không trả lượt · (b) cho báo lỗi, staff thấy từ riêng · (c) cho báo lỗi và trả lượt ngay không cần staff.

Vòng 1: chủ dự án theo hướng riêng: "AI handle kiểm tra các từ riêng trước, nếu từ hợp lệ hoặc có ý nghĩa thì sẽ tạo câu, không thì AI sẽ báo lỗi về cho learner kiểm tra lại
từ". Claude đồng ý (kiểm một lần mỗi từ riêng, nhớ tới khi Lan sửa từ, không trừ lượt), và thêm (b): kiểm trước không hết câu xấu, nên cho báo lỗi câu AI của từ riêng, Lan
thấy dòng "nhân viên sẽ xem câu này". Vòng 2: chủ dự án "ok".

## D27 — Ai xác nhận câu AI sai để trả lượt (câu 26)

26a: ✅ (a) `admin` và `editor` · (b) chỉ `admin`. 26b: Lan có được báo "đã trả lại 1 lượt"?

Vòng 1: chủ dự án "26a: a, lưu ý là chỉ có lỗi và confirm lỗi đúng thì mới có thể trả lượt, nhưng mình sẽ cân nhắc là có nên đưa admin duyệt hay không để tránh editor lạm
dụng; 26b: có thể là push notification hoặc email, tùy ý". Claude đề xuất: `editor` xác nhận là trả ngay, `admin` có danh sách "lượt đã trả theo người xác nhận" (như cách
Bước 5 làm với lần cấp Pro của `editor`); không có nút thu hồi; nếu muốn hai bước (`editor` đề xuất, `admin` duyệt) cũng làm được. 26b: chỉ báo trong app (chưa có push),
không email cho từng lượt. Vòng 2: chủ dự án "ok".

## D28 — Con số mới (câu 27)

| Phương án | Trade-off |
|---|---|
| ✅ (a) Admin chỉnh được hết | Linh hoạt; nhiều cài đặt |
| (b) Cố định trong code | Ít cài đặt; đổi phải sửa code |
| (c) Tùy từng số | Cân bằng |

Chủ dự án "a". Design liệt kê con số mới (`practice.ai_prefetch_count`) và các con số kỹ thuật cố định để chủ dự án duyệt (design §14).

## D29 — Lượt AI tra nghĩa (vòng 3)

Bối cảnh: khi xem bảng quyền gói (Bước 5 §5.2), chủ dự án ghi ở dòng "AI tra nghĩa khi thêm từ": "mình đang tính bỏ cái này đi, dù gì cũng chỉ là tra nghĩa, không tốn quá
nhiều chi phí cho một lần gọi". Claude hỏi lại bỏ cái gì:

| Phương án | Trade-off |
|---|---|
| (i) Giữ như Bước 5: 100 lượt/tháng | Không đổi gì |
| ✅ (ii) Bỏ giới hạn cho Trial/Pro bằng cách admin nâng con số trong cài đặt có sẵn (ví dụ 2.000) | Không đổi code; trần toàn hệ thống vẫn chặn lạm dụng |
| (iii) Cho cả Free | Đổi quyết định Bước 5 (Free luôn 0 lượt AI); chịu tiền AI của người dùng Free |
| (iv) Bỏ hẳn tính năng AI tra nghĩa | Bớt việc Bước 7 |

Một lần tra ~6–190đ tùy model. Chủ dự án chọn (ii). Claude đã đọc `settings.definitions.ts` trên `dev`: khoảng cho phép 0–5.000, nên 2.000 không cần sửa code. Rủi ro: hai kho
AI dùng chung trần `ai_daily_cap` (1.000/ngày).

## D30–D34 — Năm câu sau review độc lập của design

Bối cảnh: review độc lập ([`../reviews/2026-10-21-buoc-7-design-review.md`](../reviews/2026-10-21-buoc-7-design-review.md)) tìm ra năm chỗ là quyết định của chủ dự án.
Claude hỏi theo luật "chủ dự án trả lời trước": chỉ bối cảnh và các hướng, không có đề xuất; design ghi tạm một cách và đánh dấu "chờ". Chủ dự án trả lời "ok viết plan luôn đi
bạn"; Claude nói rõ trong chat là hiểu thành **giữ cách design đang tạm viết cho cả năm câu** (đổi được trước khi thực thi), và chủ dự án không nêu khác.

| # | Câu | Các hướng đã đưa | Chọn |
|---|---|---|---|
| D30 | R2: lượt bị trừ ngày 30/11, staff xác nhận lỗi ngày 2/12 (chu kỳ mới) | (a) trả vào chu kỳ hiện tại như `refund` của Bước 5 (R21) · (b) không trả lượt của chu kỳ trước (thêm một hàm đọc nhỏ ở Bước 5) · (c) khác | ✅ (a) |
| D31 | R8: AI tra nghĩa trả cả định nghĩa tiếng Anh; từ riêng của người học `vi` chỉ lưu nghĩa tiếng Việt | (a) thêm ô định nghĩa (từ riêng có thêm nấc gợi ý) · (b) không lưu định nghĩa · (c) khác | ✅ (b) |
| D32 | R17: AI quên một dạng đúng (`has deployed`), Lan bị "Chưa đúng" rồi báo "Đáp án đúng mà bị chấm sai" | (a) trả lượt khi là câu AI · (b) không trả (admin đổi được) · (c) khác | ✅ (b) |
| D33 | R18: `editor` cũng học, tự báo rồi tự xác nhận câu AI của mình | (a) chặn: không ai xử lý báo cáo của chính mình · (b) cho phép, `admin` thấy trong danh sách trả lượt · (c) khác | ✅ (b) |
| D34 | R23: câu 23 chỉ hỏi về điền từ AI | (a) bản dịch cho cả ba dạng AI · (b) chỉ điền từ AI · (c) khác | ✅ (a) |

## Đề xuất kỹ thuật duyệt cùng design

Chủ dự án duyệt design 21/10/2026 ("ok viết plan luôn đi bạn"). Danh sách đầy đủ ở design §22 (T1–T12 và T1b–T1d sau review); tóm tắt:

- **Chọn:** yêu cầu tạo câu riêng (`practice_ai_requests`) và hai transaction ngắn quanh mỗi lời gọi AI; "chỗ đang chờ" lưu trên phiên (`pending_ai_request_id`); lưu
  `ai_input` để chạy lại đúng dữ liệu; `ai_charged` trên câu để chỉ trả lượt khi câu đã bị trừ; app gọi `POST /prepare` để tạo trước; đánh dấu câu AI vòng 1 lúc mở phiên (từ
  vị trí 2, ưu tiên từ có câu tạo sẵn); câu chưa từng hiện là câu không có lần hỏi, khớp bản nội dung và nhiễu còn thấy được; hai thao tác mới nhận sẵn nhiễu / nghĩa sai;
  giữ `generate_cloze`, thêm một bản prompt không đè bản admin đã sửa; `check_private_word` nhớ theo mã nội dung; lý do báo lỗi là bảng dữ liệu; job mỗi giờ thử lại `refund`;
  tra AI dùng `@Idempotent({ timeoutSeconds: 60 })` với mã thao tác băm từ key; dạng chia bổ sung theo chữ ở Content; job dọn giữ câu AI chưa từng hiện.
- **Bỏ:** giữ `advance` trong một transaction (giữ kết nối trong lúc chờ AI); tạo lần hỏi trước với `question_id` null (phải sửa mọi chỗ đọc lần hỏi); server tự tạo trước
  sau khi trả `next` hoặc qua BullMQ (trái luật "luồng người học gọi AI trong request"); lưu thứ tự vòng ≥ 2 để tạo trước cả vòng sau (hiếm, đổi sau được); sửa khuôn
  `generate_cloze` hay thêm lời gọi kiểm riêng (D14, không đổi Bước 6); dựa vào `refund` của Bước 5 để biết câu đã bị trừ (nó không tìm theo mã); sửa `entry_inflections`
  từng entry (phải mở từ riêng của người khác).

## Chỗ Claude đề xuất trước khi chủ dự án trả lời

- Trước khi chủ dự án trả lời: Claude viết lại cách hiểu Bước 7 (mục tiêu, ràng buộc, "xong khi") trong chat để chủ dự án sửa; chủ dự án không sửa.
- Mọi đề xuất của vòng 1 đưa ra **sau** khi chủ dự án trả lời file câu hỏi; câu chủ dự án để trống (3b, 10) hoặc "phân tích sâu" thì Claude đề xuất, decision record ghi
  như trên.
- Không phương án nào trong file câu hỏi đánh dấu "Recommended".
