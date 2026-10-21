# Bước 7 — Bộ câu hỏi cho chủ dự án (20/10/2026)

Bước 7 = bài luyện có AI (Practice) + bước AI khi tra nghĩa lúc thêm từ (Content). Chủ dự án muốn trả lời **một lượt** thay vì từng câu (20/10/2026),
nên mọi câu hỏi nằm trong file này.

**Cách trả lời**
- Viết ngay dưới dòng **Trả lời:** của từng câu, hoặc trả lời trong chat theo số câu. Ngắn cũng được: "a", "như Bước 4", "a, nhưng…".
- "bỏ qua" / "không biết" → Claude đề xuất cho câu đó (decision record ghi lại như vậy).
- Muốn Claude đề xuất trước ở câu nào thì ghi "đề xuất trước".
- Các hướng liệt kê **không theo thứ tự ưu tiên** và không có hướng nào là gợi ý của Claude (luật "chủ dự án trả lời trước"; câu 1 hỏi có giữ luật này không).
  Luôn được trả lời một hướng khác.
- Trả lời xong, Claude gửi lại **một lượt** đề xuất cho từng câu (đồng ý hay khác ở đâu, vì sao); anh/chị chốt. Rồi mới viết design.

Ví dụ xuyên suốt: **Lan**, người học tiếng Việt, gói Pro, đang học từ `deploy` (nghĩa "triển khai phần mềm") trong nhóm "IT".

---

## 0. Đã chốt từ trước, không hỏi lại

| Điều | Nguồn |
|---|---|
| Free không có bài AI; bài AI và AI tra nghĩa chỉ cho Trial, Pro (hoặc tài khoản được cấp con số lượt) | D4 Bước 4; Bước 5 §5 |
| Không có ngân hàng câu dùng chung; câu AI lưu riêng cho từng người học | D3 Bước 4 |
| Một câu **không bao giờ** có hơn một đáp án đúng; đáp án phải đúng dạng trong câu (`deploy` cho chỗ cần `deployed` là sai) | D6 Bước 4; Bước 4 §2 |
| Lượt AI: câu mới thành công 1 lượt; AI lỗi 0; làm lại câu đã lưu 0; câu không qua kiểm, AI tạo lại lần 2 vẫn 1 lượt; tra nghĩa 1 lượt dù dùng hay bỏ gợi ý; dịch bổ sung 1 lượt (trừ kho bài AI); staff xác nhận câu AI sai thì trả lượt | D10–D12 Bước 5 |
| Kho lượt: bài AI 300 / tháng, tra nghĩa 100 / tháng (Pro, Trial; admin chỉnh) | D18 Bước 5 |
| Chấm bằng luật, không dùng AI chấm | K15 |
| AI lỗi thì người học thấy "chưa tạo được câu", không bao giờ bị chấm "sai"; bấm lại cùng câu không bị trừ hai lượt | Bước 6 §4.4, §5.5 |
| Model, prompt, effort do admin chọn trong admin; chưa gọi nhà cung cấp thật lần nào | D6, D12, D19 Bước 6 |

---

## Phần 1 — Cách làm và phạm vi

### Câu 1. Luật hỏi ở Bước 7

Bước 3–6 giữ luật "chủ dự án trả lời trước, Claude đề xuất sau" (D27 Bước 4, D1 Bước 5, D1 Bước 6). File này đang viết theo luật đó.

Các hướng: (a) giữ cho Bước 7 · (b) bỏ: Claude đề xuất trước mọi câu · (c) giữ cho câu sản phẩm (người học thấy gì, trả tiền thế nào), Claude đề xuất trước
cho câu kỹ thuật · (d) khác.

**Trả lời:** a

### Câu 2. Chỉ API hay có cả màn hình

Bước 4, 5, 6 chỉ làm API; giao diện người học của Bước 3–6 vẫn chưa làm. Bài AI chỉ thử được bằng tay khi có màn hình, còn không thì thử bằng script như các
bước trước.

Các hướng: (a) chỉ API, như Bước 4–6 · (b) API + màn hình người học cho riêng phần AI · (c) API + làm luôn giao diện người học còn thiếu của Bước 3–6 ·
(d) khác.

**Trả lời:** a

### Câu 3. "Xong khi" có gọi AI thật không; ai implement

Bước 6 xong mà chưa gọi OpenAI hay Anthropic thật lần nào: bộ nối thật mới được kiểm bằng phản hồi mẫu chép từ tài liệu (rủi ro ghi ở Bước 6 §19). Bước 7 là
lúc người học bắt đầu dùng AI. Gọi thật cần key của anh/chị trong `.env` và tốn tiền thật (ít, vì chỉ vài chục lời gọi).

- 3a. Các hướng: (a) như Bước 4–6: CI xanh + script smoke với bản giả, không gọi thật · (b) như (a), cộng một lần chạy thật bằng key của anh/chị (ví dụ tạo
  20 câu thật cho 20 từ, anh/chị đọc chất lượng) trước khi coi là xong · (c) gọi thật làm thành một việc riêng, trước Bước 7 · (d) khác.
- 3b. Implement như Bước 4–6 (các phiên chạy song song + một phiên điều phối)? Có / khác.

**Trả lời:** a

### Câu 4. Một design hay tách hai

Bước 7 có hai mảng dùng chung cổng AI nhưng đụng hai module khác nhau: **bài AI** (Practice, lớn) và **AI tra nghĩa** (Content, nhỏ hơn).

Các hướng: (a) một design, một plan · (b) một design, hai plan làm hai đợt (đợt nào trước?) · (c) hai design riêng (cái nào trước?) · (d) khác.

**Trả lời:** a

---

## Phần 2 — Bài AI trong phiên luyện (chung cho cả ba dạng bài AI)

Ba dạng bài AI của Bước 7: **điền từ** (phần 3), **"câu chứa từ rồi chọn"** (phần 4), **trắc nghiệm theo câu** (phần 5).

### Câu 5. Bài AI nằm ở đâu

Hiện Lan mở một phiên luyện, chọn nguồn (Hôm nay, Theo nhóm…), chọn dạng bài (trắc nghiệm, đúng/sai, gõ từ) và số câu. Mỗi phiên tính vào số phiên mỗi ngày
(Pro 30). Mỗi câu AI còn trừ thêm 1 lượt bài AI.

Các hướng: (a) dạng bài AI là các lựa chọn mới trong cùng phiên luyện (Lan có thể chọn "gõ từ + điền từ AI" trong một phiên) · (b) một chế độ riêng
"Luyện với AI", tách khỏi phiên luyện thường · (c) khác.

Câu phụ 5b (nếu chọn a): một phiên có câu AI vẫn tính là 1 phiên trong số phiên mỗi ngày, **và** mỗi câu AI trừ 1 lượt. Đúng ý không?

**Trả lời:** đào sâu vào a và b tại vì mình đang phân vân giữa 2 option, tạo visual cho mình xem mô phỏng

### Câu 6. AI không dùng được giữa phiên

Lan mở phiên 10 câu, chọn "điền từ AI + gõ từ". Tới câu 6 thì một trong các chuyện sau xảy ra: hết lượt bài AI của tháng; admin tắt AI; chạm trần AI toàn hệ
thống trong ngày; AI lỗi hoặc chậm quá 10 giây (cả lần thử lại).

Các hướng: (a) câu đó đổi sang dạng không AI Lan đã chọn (nếu có), báo một lần "AI tạm chưa dùng được, các câu còn lại không dùng AI" · (b) dừng phiên và báo
lý do · (c) bỏ từ đó, sang từ kế tiếp, lần sau thử AI lại · (d) xử lý khác nhau theo lý do (hết lượt khác với AI lỗi tạm thời): anh/chị ghi rõ · (e) khác.

Câu phụ 6b: nếu Lan **chỉ** chọn dạng bài AI thì sao?

**Trả lời:** cái này thì triển khai theo cách tính credit dự kiến (phải có pilot để đo thật nhưng tạm thời cứ đưa ra một con số phù hợp) xong rồi trừ vào lượng api còn lại trong db, trước khi tạo một phiên mới thì validate xem lượng api còn lại có đủ để tạo cho một phiên không, nếu không đủ thì báo lỗi đến learner, còn đủ thì cứ cho tạo như bình thường

### Câu 7. Chờ AI tạo câu

Một câu AI mất vài giây, xấu nhất khoảng 20 giây (10 giây mỗi lần gọi, có thể gọi 2 lần khi câu không qua kiểm).

Các hướng: (a) tạo khi Lan bấm "câu tiếp", Lan chờ, màn hình hiện "đang tạo câu…" · (b) tạo trước câu kế tiếp trong lúc Lan đang làm câu hiện tại: không phải
chờ, nhưng nếu Lan dừng phiên thì câu đã tạo trước bị bỏ · (c) khác.

Câu phụ 7b (nếu chọn b): câu tạo trước mà Lan không làm tới thì (x) vẫn trừ 1 lượt của Lan · (y) không trừ, anh/chị chịu tiền lời gọi đó · (z) giữ câu đó
lại cho phiên sau, không tạo lại.

**Trả lời:** theo hướng b, nhưng mình đang suy nghĩ theo hướng nếu một phiên đang dừng giữa chừng do sự cố hoặc do người dùng muốn dừng giữa chừng thì đưa trạng thái phiên đó sang paused (hoặc là un-done gì đó), các câu được tạo ra thì cứ giữ trong db, người dùng sẽ có 2 option: tạo phiên mới và bỏ phiên cũ (nếu tạo phiên mới thì + 1 phiên trong limit) hoặc là hoàn thành phiên cũ cho xong

### Câu 8. Luật của Bước 4 có áp nguyên cho bài AI không

Các luật đang có cho bài không AI:
1. Chấm: chuẩn hóa (bỏ khoảng trắng thừa, chữ hoa thường, dấu nháy cong) rồi so đúng từng chữ; sai chính tả là sai.
2. Gõ sai: chưa hiện đáp án; nút "Làm lại" (admin đặt số lần, trống = không giới hạn) và "Bỏ qua".
3. Gợi ý 2 nấc: nấc 1 định nghĩa ngắn hoặc câu ví dụ che từ; nấc 2 chữ cái đầu và số chữ. Dùng gợi ý vẫn chấm như thường, nhưng không được "Đã biết".
4. Sau mỗi câu: nút "Cần ôn tập" luôn có; "Đã biết" khi đúng, không gợi ý, từ tới hạn.
5. Câu sai tính vào "từ hay sai"; lịch sử giữ 6 tháng; có nút báo lỗi.

Câu hỏi: áp nguyên cả 5 điều cho bài AI? Nếu có điều nào khác, ghi số điều và muốn thế nào.

Câu phụ 8b: với câu điền từ AI, gợi ý nấc 1 là gì? Đề bài đã là một câu nên câu ví dụ không còn dùng làm gợi ý. Có thể là: nghĩa tiếng Việt của từ, định nghĩa
tiếng Anh, bản dịch cả câu (hiện bản dịch chỉ hiện **sau** khi nộp), hoặc khác.

**Trả lời:** có, với hint thì chữ cái đầu, definition và nghĩa tiếng Việt theo thứ tự

---

## Phần 3 — Bài điền từ AI

Ví dụ đề: "Our team will ___ the new version tonight." Lan gõ `deploy`.

### Câu 9. Câu lấy từ đâu

Còn mở từ Bước 4 (D2). **Câu ngữ cảnh** = câu Lan gặp ở ngoài và lưu khi thêm từ (tối đa 20 câu mỗi nghĩa). Hiện chưa bài luyện nào dùng câu ngữ cảnh. Câu của
Lan có thể sai chính tả, dài, hoặc chứa từ ở dạng khác (`deployed`). Che từ trong câu của Lan làm được bằng luật, không cần AI (như đề gõ từ theo câu ví dụ
của Bước 4).

Các hướng: (a) AI viết câu mới · (b) dùng câu ngữ cảnh của Lan · (c) cả hai: có câu của Lan thì dùng trước, không có thì AI viết · (d) cả hai, Lan chọn khi mở
phiên · (e) khác.

**Trả lời:** d

### Câu 10. Bài điền từ từ câu của chính Lan (chỉ hỏi nếu câu 9 không phải a)

Bài này không cần gọi AI để che từ. Bước 4 (D4) chốt "bài điền từ AI là tính năng gói trả phí"; bài từ câu của người học không AI thì chưa ai chốt.

Các hướng: (a) gói trả phí, trừ 1 lượt bài AI · (b) gói trả phí, không trừ lượt · (c) cho cả Free (như K23 ban đầu) · (d) khác.

Câu phụ 10b: AI có làm gì với câu của Lan không? Ví dụ: dịch câu sang tiếng Việt (tốn lượt); kiểm câu có dùng từ đúng nghĩa không; không làm gì.

**Trả lời:** 

### Câu 11. Dùng lại câu AI đã lưu

Bước 4 (D3) để mở: "dùng lại câu AI đã lưu, khi tới Bước 7 thì tính tiếp". Làm lại câu đã lưu không trừ lượt (D10 Bước 5).

Ví dụ: tuần sau Lan luyện lại `deploy`.

Các hướng: (a) luôn câu mới (1 lượt mỗi lần) · (b) dùng lại câu cũ trước (câu Lan chưa gặp lại lâu nhất), hết câu cũ mới tạo · (c) Lan chọn "câu mới" hay "câu
đã có" khi mở phiên · (d) chỉ dùng lại câu Lan từng làm sai · (e) khác.

Câu phụ 11b: xem lại các câu AI cũ: trang "Lịch sử" của Bước 4 (lọc theo ngày, theo từ) là đủ, hay cần thêm danh sách "Câu AI của tôi"?

**Trả lời:** chỗ này mình khá là đắn đo, bởi vì nếu người dùng đã thanh toán pro rồi mà chức năng lại không đáp ứng được gói pro đưa ra (ví dụ dùng câu có sẵn thay vì để cho AI gen) thì nó lại không đúng với gói mô tả -> người dùng phát hiện thì sẽ có khả năng app bị phạt hoặc bị cấm,.... nên mình chưa có hướng xử lý cho phần này, bạn có thể đề xuất một vài hướng để mình xem

### Câu 12. Từ đồng nghĩa cũng vừa chỗ trống

Với "Our team will ___ the new version tonight", Lan gõ `release`: cũng vừa câu, nhưng bài hỏi `deploy`. Luật D6 nói câu phải viết sao cho chỉ một từ hợp, nhưng
AI vẫn có thể viết câu như vậy. Còn mở từ Bước 4 §15: "đáp án thay thế có gồm từ đồng nghĩa khác chữ không".

Các hướng: (a) sai, như hiện nay; Lan báo lỗi được · (b) đúng nếu AI đã liệt kê `release` trong các đáp án chấp nhận · (c) không chấm sai: báo "đúng nghĩa,
nhưng bài cần một từ khác", cho làm lại · (d) khác.

**Trả lời:** mình nghĩ là phải handle làm sao để đừng lấy ngữ cảnh chung chung, mà lấy chi tiết hơn cho đúng với việc sử dụng từ đó, chứ không phải một câu dùng được nhiều từ

### Câu 13. Kiểm câu AI trước khi Lan thấy

Theo K16, câu AI chỉ được kiểm bằng luật: đúng một chỗ trống, và đáp án phải là một dạng của đúng từ đó (theo bảng dạng chia). Nút báo lỗi lo phần còn lại.
Luật **không** phát hiện được câu sai nghĩa, câu không tự nhiên, hay câu có hai từ cùng vừa (câu 12).

Các hướng: (a) chỉ kiểm bằng luật (K16), theo dõi tỉ lệ báo lỗi · (b) thêm một lần AI đọc lại câu trước khi đưa Lan: thêm một lời gọi, anh/chị chịu tiền,
không trừ thêm lượt của Lan, câu chậm hơn vài giây · (c) AI đọc lại chỉ ở trắc nghiệm theo câu (bắt buộc, phần 5), điền từ chỉ kiểm bằng luật · (d) khác.

**Trả lời:** phân tích sâu giúp mình

### Câu 14. AI dùng một dạng chia mà bảng dạng chia không biết

Bảng dạng chia (AGID) đã có `went`, `gone`… nên chỗ hở chủ yếu là từ riêng (chỉ có bản thư viện tự sinh) và từ hiếm. Ví dụ: từ riêng `vibe-code`, AI viết
`vibe-coded` mà bảng không có → luật kiểm loại câu → AI tạo lại một lần (anh/chị chịu tiền lần 2) → vẫn bị loại → "chưa tạo được câu", không trừ lượt.

Các hướng: (a) giữ như vậy · (b) khi bảng không biết, nhận thêm dạng theo quy tắc cố định (`-s`, `-ed`, `-ing`…) · (c) staff có một danh sách dạng chia để bổ
sung khi thấy câu bị loại nhầm (CLAUDE.md đang ghi việc này cho Bước 7) · (d) khác.

Câu phụ 14b (nếu chọn c): ai được sửa danh sách đó: staff có quyền sửa nội dung (`admin` và `editor`), hay chỉ `admin`?

**Trả lời:** c, admin và editor đều được

### Câu 15. Người học có tiếng mẹ đẻ là tiếng Anh

V1 chỉ dịch sang tiếng Việt (N5). Thao tác tạo câu của cổng AI (Bước 6) **bắt buộc** có nghĩa tiếng Việt. Từ catalog luôn có nghĩa tiếng Việt; từ riêng của một
người học tiếng Anh thì chỉ có định nghĩa tiếng Anh.

Các hướng: (a) người học tiếng Anh không có bài AI ở V1 · (b) có bài AI cho từ catalog, không có cho từ riêng của họ · (c) có cho mọi từ: sửa thao tác tạo câu của
Bước 6 để nhận định nghĩa tiếng Anh thay nghĩa tiếng Việt (một sửa nhỏ ở Bước 6, sẽ ghi rủi ro) · (d) khác.

**Trả lời:** không quan trọng chỗ này, không có case riêng biệt cho chuyện này, nhưng nếu được thì bạn có thể research để mình có thêm insight

---

## Phần 4 — Dạng "câu chứa từ rồi chọn"

### Câu 16. Người học chọn cái gì

Ở Bước 4 anh/chị đề ra dạng này ("đưa một câu chứa từ, người học chọn"), nhưng chưa nói chọn gì (D2 Bước 4).

Các hướng (ví dụ với từ `deploy`):
- (a) **Chọn nghĩa của từ trong câu đó.** Đề: "The company **deployed** soldiers to the border." Chọn: "điều quân" / "triển khai phần mềm" / "trì hoãn" /
  "giao hàng". Kiểm Lan có hiểu nghĩa theo ngữ cảnh không; hợp với từ nhiều nghĩa.
- (b) **Chọn bản dịch đúng của cả câu** (4 bản dịch tiếng Việt).
- (c) **Bốn câu đều có từ đó, chọn câu dùng từ đúng**; ba câu kia AI cố ý viết sai nghĩa hoặc sai ngữ pháp.
- (d) Khác: anh/chị mô tả.

Câu phụ 16b (nếu chọn a): ba nghĩa sai lấy từ đâu: các nghĩa khác của chính từ đó; nghĩa của các từ khác trong nhóm của Lan (như trắc nghiệm Bước 4); hay AI tự
viết?

**Trả lời:** phân tích chi tiết hơn và cho mình ngữ cảnh

---

## Phần 5 — Trắc nghiệm theo câu (dời từ Bước 4, D34)

Ví dụ đề: "We ___ the app to the server yesterday." Bốn lựa chọn: `deployed` / `delivered` / `defended` / `delayed`. Bước 4 bỏ dạng này vì `delivered` cũng vừa
câu, tức có hai đáp án đúng, mà không có AI thì không kiểm được. Theo Bước 5, mỗi câu dạng này trừ 1 lượt bài AI.

### Câu 17. Câu và đáp án nhiễu lấy từ đâu

- 17a. Câu: (a) câu ví dụ có sẵn trong catalog (như đề gõ từ theo câu của Bước 4) · (b) AI viết câu mới · (c) câu AI đã lưu của Lan (từ bài điền từ) · (d) câu
  ngữ cảnh của Lan · (e) khác (có thể chọn nhiều).
- 17b. Ba đáp án nhiễu: (x) vẫn lấy trong các nhóm của Lan (như trắc nghiệm Bước 4); AI chỉ kiểm từng đáp án có vừa câu không và loại cái vừa · (y) AI tự đề
  xuất 3 đáp án không vừa câu (có thể là từ Lan chưa học) · (z) khác.

**Trả lời:** như mình nói, phải tạo câu làm sao để 1 câu chỉ có thể dùng một từ duy nhất, tránh tạo câu mà có hơn 1 đáp án, kiểm tra ngữ cảnh của từ để có thể tạo câu cho chính xác

---

## Phần 6 — AI tra nghĩa khi thêm từ

Hiện tại (Bước 3): Lan gõ một chữ ở "Thêm nhanh" → app tra catalog, từ riêng của Lan và bảng dạng chia → Lan chọn nghĩa có sẵn, hoặc bấm "không phải nghĩa này" để
tự nhập. Bước 7 chen bước AI vào giữa. Mỗi lần gọi AI tra nghĩa trừ 1 lượt (kho 100 / tháng), dù Lan dùng hay bỏ gợi ý. AI trả về: loại từ, từ gốc, nghĩa tiếng
Việt, định nghĩa tiếng Anh, 1–2 câu ví dụ. Free không có bước này (đã chốt ở Bước 5).

### Câu 18. Khi nào gọi AI tra nghĩa

Ví dụ: Lan gõ `rizz` (catalog không có), hoặc gõ `deploy` nhưng nghĩa trong catalog không phải nghĩa Lan gặp.

Các hướng: (a) tự động gọi khi catalog và từ riêng không có chữ đó · (b) chỉ khi Lan bấm nút "Tra bằng AI" (nút hiện khi không thấy từ, hoặc sau "không phải
nghĩa này") · (c) tự động khi không có; bằng nút khi có mà sai nghĩa · (d) khác.

**Trả lời:** mình chưa hiểu các option lắm, phân tích sâu hơn giúp mình

### Câu 19. Có gửi câu Lan gặp cho AI không

Ở "Thêm nhanh" Lan có thể gõ kèm câu đã gặp. Gửi câu này giúp AI chọn đúng nghĩa, nhưng chữ Lan gõ sẽ đi tới OpenAI / Anthropic (chính sách riêng tư phải ghi).

Các hướng: (a) gửi khi Lan có nhập câu · (b) không bao giờ gửi · (c) Lan tự chọn mỗi lần (ô tick "gửi kèm câu để tra chính xác hơn") · (d) khác.

**Trả lời:** c

### Câu 20. AI trả về một từ gốc đã có trong catalog

Ví dụ: Lan gõ `deployments`, bảng dạng chia không biết chữ này → AI nói từ gốc là `deployment`, mà `deployment` có trong catalog (nghĩa đã duyệt).

Các hướng: (a) hiện nghĩa catalog thay cho gợi ý của AI (vẫn tính 1 lượt) · (b) hiện cả hai, Lan chọn · (c) chỉ hiện gợi ý của AI · (d) khác.

**Trả lời:** chi tiết hơn đi

### Câu 21. Lưu gợi ý của AI thành từ riêng

Lan đồng ý với gợi ý thì gợi ý thành **từ riêng** của Lan (chỉ Lan thấy, không vào catalog). Ba câu có / không:
- 21a. Lan sửa được mọi ô trước khi lưu (loại từ, nghĩa…)?
- 21b. Lưu luôn 1–2 câu ví dụ của AI làm câu ví dụ của từ riêng? Hiện từ riêng không có câu ví dụ nào, nên không có gợi ý nấc 1 và không có đề gõ từ theo câu. Lưu
  thì có hai thứ đó, nhưng câu do AI viết, không ai duyệt.
- 21c. Từ riêng ghi nguồn "AI gợi ý" cho Lan thấy?

**Trả lời:** b

### Câu 22. Từ điển ngoài

K20 (04/10) định chuỗi tra nghĩa: catalog → **từ điển ngoài** → AI → tự nhập. Tới giờ chưa chọn từ điển ngoài nào (giấy phép, độ phủ, chi phí chưa tìm hiểu).

Các hướng: (a) Bước 7 bỏ qua từ điển ngoài: chuỗi là catalog → AI → tự nhập · (b) Bước 7 tìm hiểu và gắn một từ điển ngoài (cần research trước) · (c) khác.

**Trả lời:** chưa hiểu câu hỏi 

---

## Phần 7 — Dịch bổ sung

### Câu 23. Nút "Dịch câu này" ở đâu

Bước 5 đã chốt dịch bổ sung trừ 1 lượt bài AI, nhưng chưa nói dịch câu nào. Câu AI điền từ đã kèm sẵn bản dịch lúc tạo (không tốn thêm). Câu ví dụ trong catalog
hiện chỉ có tiếng Anh.

- 23a. Nút xuất hiện ở đâu (chọn nhiều được): câu ví dụ catalog trên flashcard và trang từ · câu ngữ cảnh của Lan · đề gõ từ theo câu ví dụ (sau khi nộp) · đề
  trắc nghiệm theo câu (sau khi nộp) · không làm dịch bổ sung ở Bước 7 · khác.
- 23b. Bản dịch có lưu lại để lần sau Lan xem không bị trừ lượt nữa? Có / không.

**Trả lời:** bỏ phần dịch này dược không, trong catalog chỉ hiện ví dụ như cambridge làm, không có dịch ngay lúc tra từ trong catalog

---

## Phần 8 — Báo lỗi câu AI và trả lượt

### Câu 24. Lý do báo lỗi cho câu AI

Bước 4 có 4 lý do: nghĩa sai, chấm sai, gợi ý sai, khác.

Các hướng: (a) giữ 4 lý do · (b) thêm lý do riêng cho câu AI, ví dụ: câu sai ngữ pháp hoặc không tự nhiên · có hơn một đáp án đúng · bản dịch sai · câu không
đúng nghĩa của từ (anh/chị chọn) · (c) khác.

**Trả lời:** chỗ lỗi này để cho admin tự động configure trên một trang, mình nghĩ admin có thể thiết lập template cho learner để báo lỗi, chi tiết hơn chắc mình sẽ để bạn phân tích sâu chỗ này, nó giống như kiểu learner chọn lỗi => chi tiết lỗi => confirm và gửi bản template đến cho admin hoặc editor trong một bảng quản lý của admin

### Câu 25. Câu AI cho từ riêng của Lan

Bước 4 (D36): câu hỏi về từ riêng **không có nút báo lỗi**, vì staff không được thấy từ riêng. Với câu AI, không báo lỗi được nghĩa là không bao giờ được trả lượt.
Ví dụ: từ riêng `vibe check` của Lan, AI viết một câu sai nghĩa.

Các hướng: (a) giữ D36: không báo lỗi, không trả lượt · (b) cho báo lỗi; staff thấy từ riêng và câu (chính sách riêng tư phải ghi) · (c) cho báo lỗi và trả
lượt ngay, không cần staff xem (có thể bị lạm dụng: báo mọi câu để lấy lại lượt) · (d) khác.

**Trả lời:** chỗ này để AI handle kiểm tra các từ riêng trước, nếu từ hợp lệ hoặc có ý nghĩa thì sẽ tạo câu, không thì AI sẽ báo lỗi về cho learner kiểm tra lại từ

### Câu 26. Ai xác nhận câu AI sai để trả lượt

Báo lỗi Bước 4 do staff có quyền sửa nội dung xử lý (`admin` và `editor`). Bước 5 (D6) cho `editor` cấp gói Pro nhưng không đặt con số lượt AI tùy ý.

- 26a. Các hướng: (a) cả `admin` và `editor` (như báo lỗi Bước 4) · (b) chỉ `admin` · (c) khác.
- 26b. Lan có được báo "đã trả lại 1 lượt" không? (Báo bằng email, hay chỉ hiện trong app khi có giao diện.)

**Trả lời:** 26a: a, lưu ý là chỉ có lỗi và confirm lỗi đúng thì mới có thể trả lượt, nhưng mình sẽ cân nhắc là có nên đưa admin duyệt hay không để tránh editor lạm dụng; 26b: có thể là push notification hoặc email, tùy ý

---

## Phần 9 — Con số

### Câu 27. Các con số mới

Bước 7 sẽ có vài con số mới, ví dụ: tỉ lệ câu AI khi phiên trộn nhiều dạng, số lần dùng lại một câu AI, thời gian chờ tối đa cho một câu. Ở Bước 4 anh/chị chọn
"admin chỉnh được toàn bộ" (⚠6).

Các hướng: (a) admin chỉnh được hết · (b) cố định trong code, đổi bằng sửa code · (c) tùy từng số: Claude liệt kê trong design, anh/chị đánh dấu · (d) khác.

**Trả lời:** a

---

## Không hỏi: phần kỹ thuật, Claude đề xuất trong design (anh/chị duyệt cùng design)

- Tách lời gọi AI ra khỏi transaction khi tạo câu (`next()`, `current()`), và khỏi các API có chống gửi trùng (Bước 6 §4.4). Design "Sửa thiếu sót Bước 0–3"
  (D12) sẽ đổi cơ chế chống gửi trùng; design Bước 7 phải khớp với nó.
- Lưu mã lời gọi AI và model, bản prompt đã dùng cạnh mỗi câu AI, để tra một câu bị báo lỗi về đúng lời gọi đã tạo ra nó (Bước 6 §18).
- Thao tác mới ở cổng AI (kiểm đáp án nhiễu, dạng "câu chứa từ rồi chọn"…) và lời dặn ban đầu của chúng (anh/chị duyệt chữ ở plan, như Bước 6).
- Dữ liệu đưa cho AI: Practice hiện không đọc loại từ và level của từ; phải đọc thêm từ Content.
- Đáp án nhiễu chia cùng dạng với đáp án đúng ở trắc nghiệm theo câu (`deployed` → `delivered`, `defended`).
- Mã lỗi, edge case When → Then, script smoke, "Xong khi" theo câu 3.

Bằng chứng code (đã đọc trên `dev` @ `47ca600`): [`../../preparation/BUOC_7_CODE_FACTS_2026-10-20.md`](../../preparation/BUOC_7_CODE_FACTS_2026-10-20.md).
