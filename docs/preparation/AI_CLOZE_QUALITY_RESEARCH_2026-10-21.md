# Câu luyện do AI sinh: khi nào có hơn một đáp án đúng, và kiểm bằng gì — desk research (21/10/2026)

**Mục đích.** Bước 7 sẽ cho LLM (OpenAI hoặc Anthropic, admin chọn model) viết câu luyện cho một từ người học đang học, ví dụ
`deploy` = "triển khai phần mềm":

- **Cloze gõ đáp án:** "Our team will ___ the new version tonight." Người học gõ từ; chấm khớp chính xác với danh sách dạng
  đúng do LLM đưa. Vấn đề: `release` cũng vừa, nên người học gõ đúng nghĩa vẫn bị chấm sai.
- **Sentence MCQ:** "We ___ the app to the server yesterday." với `deployed / delivered / defended / delayed`; `delivered`
  có thể cũng đúng, tức có hai đáp án.

Luật của chủ dự án: một câu **không bao giờ** được có hơn một đáp án đúng. Hiện chỉ có kiểm rule (đúng một chỗ trống; đáp án
phải là dạng chia đã biết của từ đích). Tài liệu này gom số liệu có nguồn để chủ dự án tự chọn giữa ba hướng: (a) chỉ rule
check, (b) thêm một lời gọi AI "blind solve", (c) chỉ kiểm bằng AI cho sentence MCQ. **Tài liệu không chọn hướng nào.**

**Cách làm.** Tìm và đọc trong phiên ngày 21/10/2026. PDF được tải về và trích chữ bằng `pdftotext`; số trong bảng/biểu đồ bị
vỡ bố cục được đối chiếu bằng toạ độ chữ (PyMuPDF). Một số trang web đọc qua công cụ WebFetch (bản tóm tắt máy của trang
gốc). Không đọc được: bài VocQGen trên castledown.com (trang kiểm tra bot), bài "Docimological Quality Analysis…" trên
Springer (chuyển sang trang đăng nhập), help.openai.com (HTTP 403), infographic TOEFL của ETS (trả về HTML, không phải PDF),
bản gốc Gérard et al. 2026 (không tìm thấy; chỉ có số qua bài review [S7]).

**Nhãn nguồn.** **[primary]** = paper, tài liệu chính thức của vendor, hoặc blog của chính sản phẩm. **[secondary]** = số lấy
qua một bài khác tổng hợp lại. **Suy luận** = suy luận hoặc phép tính của người viết tài liệu này. `[S#]` trỏ tới danh sách
nguồn ở mục 3 (có URL). "repo" = file trong repo Wordmet đọc hôm nay.

**Từ ngữ dùng trong tài liệu.**

- *key*: đáp án đúng. *distractor*: đáp án sai cố ý trong MCQ. *cloze / FITB*: câu có chỗ trống.
- *blind solve*: lời gọi AI thứ hai, đưa câu có chỗ trống mà **không** cho biết đáp án, xem model điền gì; nếu nó điền từ
  khác (vd `release`) thì câu có thể mơ hồ.
- *LLM-as-judge*: model đọc câu kèm đáp án rồi chấm theo tiêu chí ("có distractor nào cũng đúng không?").
- *precision*: trong các câu bị gắn cờ, bao nhiêu câu thật sự xấu. *recall* (hay *sensitivity*): trong các câu xấu, bao nhiêu
  câu bị bắt. *specificity*: trong các câu tốt, bao nhiêu câu được để yên.
- *false reject*: câu tốt bị loại oan (tốn tiền sinh lại). *false accept*: câu xấu lọt qua (vi phạm luật "một đáp án").

---

## 1. Tóm tắt

1. **Không tìm thấy** nghiên cứu nào đo tỷ lệ câu cloze gõ đáp án do LLM viết cho một từ đích mà có từ khác cũng điền được.
   Số gần nhất chỉ là proxy: trong câu văn tự nhiên, mỗi từ đích có trung bình **4,1** từ thay thế được người chấm coi là chấp
   nhận [S1, primary]; cloze MCQ do chuyên gia ra đề (đề THPT Trung Quốc, CLOTH) có **12,8%** câu bị native speaker đánh giá là
   có hơn một lựa chọn vừa khít [S2, primary].
2. **MCQ có distractor cũng đúng:** GPT-4o sinh distractor 0-shot cho cloze: **16,9%** distractor "khó" và **6,8%** distractor
   "dễ" là invalid; 5-shot: **6,8% / 1,6%** (judge là GPT-4o) [S3, primary]. Pipeline GPT-3.5 có bước để GPT tự chấm ngữ nghĩa
   từng distractor vẫn để lọt **24/178 distractor (13,5%)** mà chuyên gia coi là đáp án chấp nhận được [S4, primary]. GPT-4 viết
   MCQ lập trình, prompt yêu cầu rõ luôn chỉ có một đáp án đúng: **4,9%** câu vẫn có nhiều đáp án đúng (câu người viết: 1,1%)
   [S5, primary].
3. **Prompt chặt và few-shot giảm mạnh nhưng chưa nghiên cứu nào đo được về 0** (số ở mục 2). Không tìm thấy số đo riêng cho
   cách "ép collocation mạnh / ngữ cảnh rất cụ thể" trong prompt LLM.
4. **Lời gọi thứ hai lọc distractor:** GPT-4o mini được hỏi distractor có vừa chỗ trống hơn đáp án gốc không, loại **21,31%**
   ứng viên; sau lọc, judge GPT-4o vẫn thấy **4,2%** distractor khó và **0%** distractor dễ là invalid [S3, primary].
5. **Blind solve cho cloze gõ đáp án** (GPT-4, 54 câu FITB trong sách hoá học): model điền khác từ gốc ở 11/54 câu; lấy "model
   điền khác" làm cờ "câu xấu" thì **precision 72,7%, recall 29,6%** so với dữ liệu học sinh [S6, primary]. Ví dụ bắt được: model
   điền `property` cho chỗ của `phenomenon`, hai từ đồng nghĩa đều đúng.
6. **Bản thân bộ kiểm cũng sai nhiều:** dùng "hai model cùng trả lời khác key" làm tín hiệu mơ hồ: sensitivity **35,3%**,
   specificity **92,9%**, precision **54,6%** [S7, secondary]; tiêu chí "More Than One Correct" do GPT-4 chấm trong SAQUET phân
   loại sai **50/271 câu (18,5%)** [S8, primary]; LLM tìm câu lỗi trong MMLU (gồm cả câu nhiều đáp án đúng) đạt F1 cao nhất
   **34,68%** [S9, primary]. Người chấm cũng lệch nhau: giữa các giáo viên, độ trùng (Jaccard) ở nhãn "distractor thật ra là đáp
   án đúng" chỉ **50,0%** với câu tiếng Anh [S10, primary]; reviewer của ETS đồng ý accept/reject **58–80%** [S11, primary].
7. **Sản phẩm thật:** Duolingo English Test cho 12 chuyên gia duyệt mọi item GPT-4 sinh, với nhiệm vụ ghi rõ là bảo đảm key đúng
   và distractor không thể là đáp án ("non-keyable") [S12, primary]; dù vậy dữ liệu pilot vẫn cho thấy khoảng **3%** distractor được người giỏi chọn
   nhiều hơn key [S13, primary]. VitalSource (hơn 2,5 triệu câu tự sinh) đã bỏ duyệt tay, gỡ câu sau khi ra mắt nếu có **hơn 1
   thumbs-down trong 100 học sinh đầu** [S6, primary]. Duolingo app chấm theo danh sách đáp án chấp nhận cộng nút báo "đáp án của
   tôi đúng"; chỉ khoảng **15%** báo cáo loại này được duyệt là đúng thật [S15, primary].
8. **Chi phí một lời gọi blind solve** (giả định 350–400 input, 60–150 output token, không reasoning): khoảng **20–37% một đơn
   vị Wordmet**; vd `gpt-6-luna` **1,7–3,0đ**/lần, `gpt-5.4-mini` **13,9–25,5đ**, `gpt-6.1-sol` **33,9–60,0đ** (Suy luận; giá
   và tỷ giá lấy từ repo [S20]). Nếu model sinh thêm ~500 reasoning token thì khoảng **1,2 đơn vị**/lần.
9. **Kiểm bằng logprobs** (hỏi model còn từ nào có xác suất cao cho chỗ trống) chỉ làm được với OpenAI (`top_logprobs` 0–20)
   [S16, primary], và repo ghi phải bỏ `top_logprobs` khi `reasoning.effort` khác `none` [S20]. Lớp tương thích OpenAI của
   Anthropic ghi `logprobs` là "Ignored" / "Always empty" [S17, primary]; không thấy tham số logprobs trong tài liệu Messages API
   (**ASSUMPTION**: Anthropic không có).
10. **Suy luận cho quyết định:** (a) rule check hiện tại không có cơ chế nào phát hiện "từ khác cũng điền được"; một rule dựa
    từ điển đồng nghĩa trong [S2] chỉ đạt F1 **2,87%** ở đúng việc này. (b) Blind solve bắt được một phần (recall ~30% ở [S6],
    nhưng [S6] đo mọi loại lỗi, không riêng nhiều đáp án) và khoảng 1/4 câu bị gắn cờ là câu tốt. (c) MCQ là tập đóng (3
    distractor) nên kiểm được từng lựa chọn và có số đo: còn 4,2% sau lọc [S3]. **Không phương án nào có số liệu chứng minh đạt
    "không bao giờ quá một đáp án đúng".**

---

## 2. Findings

### 2.1 Câu 1 — Tỷ lệ câu mơ hồ, có hơn một đáp án

| Nguồn | Model | Loại câu | Ai chấm, chấm gì | Số đo | Nhãn |
|---|---|---|---|---|---|
| Kang et al. 2025/2026 [S3] | GPT-4o (0-shot, 5-shot) | Distractor cho cloze MCQ dạng đoạn văn (CLOTH) | GPT-4o (1-shot) xem có lựa chọn nào phù hợp bằng hoặc hơn đáp án gốc | Invalid: 0-shot **6,8%** (dễ) / **16,9%** (khó); 5-shot **1,6% / 6,8%**. Model nhỏ fine-tune của tác giả: 0,2% / 5,1% | primary |
| Wang et al. 2023 [S4] | GPT-3.5 turbo | MCQ cloze từ vựng học thuật (AWL), 60 câu, 178 distractor | 2 chuyên gia, chuyên gia thứ ba phân xử | 59/178 distractor không đạt; trong đó **24** là "Acceptable answers" (từ cũng điền được) = **13,5%** tổng distractor, 40,7% số không đạt. 75% câu well-formed, 66,85% lựa chọn đạt | primary |
| Doughty et al. 2024 [S5] | GPT-4 | 651 MCQ lập trình Python | Người chấm theo tiêu chí | **4,9%** có nhiều đáp án đúng (câu người viết 1,1%); 81,7% qua mọi tiêu chí | primary |
| Zhang, Mita, Komachi 2023 [S2] | Không phải LLM | MCQ cloze: đề chuyên gia (CLOTH) và 4 bộ sinh tự động | 3 native speaker/câu (MTurk), bỏ câu không đồng thuận; Fleiss kappa 0,67 | Câu "not reliable" (hơn một lựa chọn vừa khít): đề chuyên gia **12,8%**; distractor từ dịch vòng (Panda) **22,1%**; Hill 9,2%; Random 5,6%; Jiang 3,9% | primary |
| Attali et al. 2022, Duolingo [S13] | Họ GPT-3 | Vocabulary-in-context (MCQ chỗ trống) trong bài đọc DET | Dữ liệu trả lời sau pilot (sau khi người duyệt) | Khoảng **3%** distractor có điểm tổng trung bình của người chọn cao hơn người chọn key; bỏ chúng thì tỷ lệ câu có độ phân biệt < 0,1 giảm 6% → 2% | primary |
| Felice et al. 2022, Cambridge [S18] | ELECTRA fine-tune (không phải LLM sinh câu) | Chọn chỗ trống cho open cloze trên văn bản có sẵn | 3 chuyên gia Cambridge (kappa 0,52) | 75–82% chỗ trống được chấm tốt; lý do "Too many possible answers" chỉ chiếm **0,87%** số chỗ trống bị loại | primary |
| Lee et al. 2021, SWORDS [S1] | — | Câu văn tự nhiên, thay một từ đích | Nhiều người chấm; "acceptable" = hơn 50% người chấm đồng ý | Trung bình **4,1** từ thay thế chấp nhận được cho mỗi từ đích | primary |
| Dittel et al. 2024, VitalSource [S6] | GPT-4 (làm người giải) | 54 câu FITB sinh bằng rule từ câu trong sách | So từ GPT-4 điền với từ gốc | GPT-4 điền khác từ gốc ở **11/54 (20,4%)** câu; có ca là từ đồng nghĩa đúng | primary |

**Không tìm được:** tỷ lệ câu cloze **gõ đáp án** do LLM viết riêng cho một từ đích (đúng tình huống Wordmet) mà có từ khác điền
được; số nội bộ của Duolingo app, Quizlet, Cambridge về chuyện này.

Ghi chú:

- [S2] cho thấy một trade-off đo được: bộ distractor càng "hợp lý" (khó) thì càng nhiều câu có hai đáp án (Panda 22,1% so với
  Random 5,6%). [S3] cho thấy cùng hướng: distractor khó có tỷ lệ invalid gấp 2,5–4 lần distractor dễ.
- **Suy luận** về ví dụ `deploy`: câu "Our team will ___ the new version tonight" đúng là tình huống của [S1]: `release`,
  `ship`, `launch` đều vừa. Câu cloze gõ đáp án là tập **mở** (người học gõ bất kỳ từ nào), còn MCQ là tập **đóng** (chỉ 3
  distractor phải kiểm), nên MCQ dễ kiểm hơn và đã có số đo, cloze gõ đáp án thì chưa.

### 2.2 Câu 2 — Kỹ thuật giảm câu mơ hồ và hiệu quả đo được

| Kỹ thuật | Cần thêm lời gọi model? | Hiệu quả đo được | Nguồn |
|---|---|---|---|
| Ghi luật "chỉ một đáp án đúng" trong prompt | Không | GPT-4 vẫn **4,9%** câu nhiều đáp án đúng | [S5, primary] |
| Few-shot (đưa ví dụ mẫu trong prompt) | Không (prompt dài hơn) | GPT-4o: distractor khó invalid 16,9% → **6,8%**; dễ 6,8% → **1,6%** | [S3, primary] |
| Ép collocation mạnh, ngữ cảnh cụ thể, câu dài hơn | Không | **Không tìm được số đo cho LLM.** Gián tiếp: [S18] ghi model ưu tiên đục lỗ những từ bị ngữ cảnh khoá chặt (vd `take`, `part` trong *take part in*) và tránh chỗ trống nhận nhiều đáp án (chỉ định tính); [S6]: thêm cả đoạn văn làm GPT-4 điền đúng từ gốc tăng 79,6% → **85,2%** (ngữ cảnh dài làm chỗ trống bớt mở) | [S18, S6, primary] |
| Model tự chấm trong cùng pipeline (generate-then-verify, cùng model) | Có hoặc gộp vào cùng lời gọi | GPT-3.5 tự chấm ngữ nghĩa từng distractor vẫn để lọt **13,5%** distractor đúng; bài báo cũng ghi GPT hay chấp nhận cả distractor sai ngữ pháp | [S4, primary] |
| Lời gọi riêng lọc distractor ("có vừa chỗ trống hơn đáp án không?") | Có (mỗi distractor, hoặc gộp theo câu) | GPT-4o mini 2-shot, chạy 3 lần: loại **21,31%** ứng viên; sau lọc judge GPT-4o còn thấy **4,2%** (khó) / **0%** (dễ) invalid. LanguageTool (rule ngữ pháp) loại thêm 2% | [S3, primary] |
| Blind solve (model điền chỗ trống không thấy đáp án; khác từ gốc → gắn cờ) | Có, 1 lời gọi/câu | GPT-4, temperature 0, chỉ một từ "best fits": precision **72,7%**, recall **29,6%**; có thêm đoạn văn: **75,0% / 22,2%** (nhãn = câu bị dữ liệu học sinh loại vì mọi lý do) | [S6, primary] |
| Hai model cùng trả lời khác key → xem lại vì có thể mơ hồ | Có, 2 lời gọi | Sensitivity **35,3%**, specificity **92,9%**, precision **54,6%**, NPV 85,5% (đề dược lâm sàng) | [S7, secondary] |
| Agreement filter (LLM tự chọn chỗ trống, giữ câu nếu trùng với rule) | Có | GPT-4o mini: câu trùng có thumbs-down 1,44 so với 1,94 mỗi 1.000 session; sau khi kiểm soát biến khác odds ratio **0,687 (−31%)** trên 1,3 triệu session; chỉ **18,8%** câu trùng | [S14, primary] |
| LLM lọc câu nguồn trước khi đục lỗ | Có | Câu làm từ các câu nguồn bị bộ lọc loại có khả năng bị thumbs-down **hơn 3 lần** (chỉ đọc trang tóm tắt) | [S19, primary] |
| LLM-as-judge theo rubric ("More Than One Correct") | Có | GPT-4 trong SAQUET sai **18,5%** (50/271 câu) ở tiêu chí này | [S8, primary] |
| n-best / likelihood bằng language model | Có (logprobs, hoặc chạy LM riêng) | DET chọn chỗ trống là từ model dự đoán mạnh, distractor có xác suất thấp nhưng không quá thấp; sau người duyệt vẫn còn ~**3%** distractor xấu (không tách được hiệu quả riêng của bước likelihood). Baseline không dùng LLM (GECToR) bắt câu nhiều đáp án: F1 **19,5%**. **Không tìm được số đo n-best của LLM cho việc phát hiện câu mơ hồ** | [S13, S2, primary] |
| Người duyệt | Không (tốn người) | DET: ≥3 lượt duyệt nội dung + 2 lượt duyệt công bằng mỗi câu; giữ 454/789 (58%) đoạn văn; ~15 phút/đoạn | [S13, primary] |

Ghi chú:

- Logprobs: OpenAI có `logprobs` / `top_logprobs` (0–20 token mỗi vị trí) [S16, primary]; repo ghi khi `reasoning.effort` khác
  `none` phải bỏ `top_logprobs` khỏi request [S20]. **Suy luận:** model không có mức `none` (`gpt-6.1-sol`, `gpt-6-astra` theo
  repo) thì không dùng được cách này; Anthropic cũng không (mục 1, ý 9). Cách này chỉ xem được xác suất token đầu của từ, không
  xem được cụm nhiều từ như `roll out` (Suy luận).
- **Suy luận** về thiết kế blind solve: [S6] chỉ hỏi "một từ hợp nhất", nên chỉ bắt câu mà từ khác **thắng** từ gốc. Hỏi
  "liệt kê mọi từ điền được" có thể bắt thêm câu như `deploy`/`release` nhưng cũng tăng loại oan. Không tìm được số đo cho dạng
  liệt kê. Cũng không tìm được số so sánh "verifier khác model/khác provider với model sinh" so với "cùng model".

### 2.3 Câu 3 — Sản phẩm thật làm thế nào

| Sản phẩm | Sinh câu | Cổng chất lượng | Số liệu | Nguồn |
|---|---|---|---|---|
| Duolingo English Test (Interactive Reading, Item Factory, 2023) | GPT-4 sinh đoạn văn và câu hỏi; mỗi câu sinh một kho distractor, tự chọn tối đa 6 theo các chỉ số, gồm likelihood do LLM ước tính | **Người duyệt 100%**: 12 reviewer giàu kinh nghiệm sửa câu để key đúng, distractor hấp dẫn nhưng không thể là đáp án ("non-keyable"), chọn 4/6 distractor. Sau đó phân tích dữ liệu thí sinh | Đổi prompt, lọc chủ đề bằng GPT và thêm mô tả văn phong nâng tỷ lệ đoạn văn đạt (có sửa) 77,5% → 86,7%. Tỷ lệ giữ distractor 64–76% chỉ là so sánh hai cách sinh, vì reviewer buộc chọn 4/6 | [S12, primary] |
| Duolingo English Test (2022, practice test) | Họ GPT-3; chỗ trống và distractor chọn theo likelihood | Duyệt người nhiều lượt rồi phân tích tâm trắc sau pilot | ~3% distractor bị gỡ sau pilot (mục 2.1) | [S13, primary] |
| Duolingo app (bài học) | LLM sinh câu theo prompt do Learning Designer điền | Learning Designer chọn và sửa; chuyên gia dạy tiếng luôn quyết định cuối. Ví dụ: chọn 3 trong 10 câu model sinh | Chỉ có ví dụ, không có tỷ lệ chung | [S22, primary] |
| Duolingo app (chấm đáp án) | — | Chấm theo danh sách đáp án chấp nhận do người làm; người học bấm báo; model ML xếp hạng báo cáo để duyệt | Một câu tiếng Tây Ban Nha có **2.156** bản dịch tiếng Anh được chấp nhận; ~200.000 báo cáo/ngày; 72% là "My answer should have been accepted"; ~**15%** báo cáo loại này được duyệt là đúng (bài 2022) | [S15, primary] |
| VitalSource CoachMe (FITB trong sách điện tử) | Rule đục lỗ câu trong sách; LLM thử ở vai trò lọc | **Bỏ duyệt tay** khi quy mô lớn (duyệt tay không làm thay đổi đáng kể đánh giá của học sinh); hệ thống tự động gỡ câu sau khi ra mắt: điểm trung bình quá thấp, hoặc **>1 thumbs-down trong 100 học sinh đầu** | Hơn 2,5 triệu câu trong hơn 9.000 sách; trong mẫu 54 câu đã qua duyệt tay, 50% vẫn bị hệ thống gỡ. Các bộ lọc LLM ở mục 2.2 | [S6, S14, S19, primary] |
| ETS (NAEP, framework "Wilbur", 2026) | LLM sinh câu (GPT-4, sau đó GPT-5.2 trong một nghiên cứu) | Chuyên gia chấm theo rubric | Câu "Language Structures and Vocabulary" có tỷ lệ được chấp nhận **thấp nhất**; không câu nào được coi là sẵn sàng dùng thật; reviewer đồng ý accept/reject 58–80% | [S11, primary] |
| Cambridge (ALTA, nghiên cứu) | ELECTRA chọn chỗ trống open cloze | Chuyên gia Cambridge chấm | 75–82% chỗ trống tốt. **Không tìm được tài liệu về quy trình sản xuất đề thật** | [S18, primary] |
| Oak National Academy (Aila, UK) | LLM sinh bài học và quiz | LLM judge chấm chất lượng distractor, đối chiếu điểm của 20 giáo viên | Trong ±1 điểm (thang 1–5) so với giáo viên: 52% (prompt ngắn) → 62% (prompt 134 dòng) → **80%** (DSPy, 65 câu test); judge này chấm "distractor khác key ít hay nhiều", không chấm "distractor có đúng không" | [S21, primary] |
| Quizlet | — | **Không tìm được tài liệu kỹ thuật công khai** | — | — |

**Suy luận:** có hai kiểu cổng. Kiểu thi high-stakes (DET, ETS) cho người duyệt mọi câu rồi kiểm thêm bằng dữ liệu thí sinh.
Kiểu luyện tập quy mô lớn (VitalSource, Duolingo app) chấp nhận sai sót, sửa sau khi ra mắt bằng tín hiệu người học (thumbs-down,
nút báo, danh sách đáp án được mở rộng dần). Không sản phẩm nào đọc được công bố chỉ dựa vào kiểm tự động trước khi ra mắt mà
tuyên bố không có câu nhiều đáp án.

### 2.4 Câu 4 — Bộ kiểm tự nó sai bao nhiêu

| Bộ kiểm | Loại oan (false reject) | Lọt (false accept) | Nguồn |
|---|---|---|---|
| Blind solve GPT-4 trên 54 câu FITB | 3/11 câu bị gắn cờ là câu học sinh không loại (precision 72,7%) | 19/27 câu xấu không bị gắn cờ (recall 29,6%); nhiều câu xấu vì lý do khác mơ hồ | [S6, primary] |
| Hai model cùng trả lời khác key | precision 54,6%, tức ~45% cờ là câu tốt; specificity 92,9% | sensitivity 35,3%, tức ~65% câu xấu lọt | [S7, secondary] |
| GPT-4 chấm "More Than One Correct" (SAQUET) | Tổng sai 18,5%; tác giả ghi GPT-4 thường không xác định được câu có đúng một lựa chọn đúng hay không | (gộp trong 18,5%) | [S8, primary] |
| LLM tìm câu lỗi trong MMLU (mọi loại lỗi) | — | F1 cao nhất 34,68%, F2 cao nhất 40,29% (Claude 3 Opus, 2024); có RAG thì recall tới 83,91% nhưng F1 28,09% | [S9, primary] |
| GPT-3.5 tự chấm distractor | — | 24/178 distractor đúng lọt qua | [S4, primary] |
| GPT-4o làm judge thay người | — | Xếp hạng độ khó distractor: tương quan GPT–người 0,54, người–người 0,62 (không có bảng nhầm lẫn cho tính hợp lệ) | [S3, primary] |
| Prompt judge khi đổi snapshot model | MSE tăng 1,40 → 1,62 khi đổi `gpt-4o-2024-08-06` → `gpt-4o-2024-11-20` | | [S21, primary] |

**Người chấm cũng không phải chuẩn tuyệt đối:** Jaccard giữa giáo viên ở nhãn "True Answer" (distractor trùng một phần hoặc toàn
bộ với key) là 50,0% (tiếng Anh) và 33,3% (địa lý) [S10, primary]; kappa 0,67 cho nhãn "có hơn một lựa chọn vừa" [S2, primary];
kappa 0,52 (đồng ý 75,93%) khi chấm chỗ trống open cloze [S18, primary]; reviewer ETS đồng ý accept/reject 58–80% [S11, primary].
Hệ quả: tỷ lệ lỗi nhỏ (vài %) khó đo chính xác vì chính nhãn đúng/sai cũng lệch.

**Suy luận (phép tính minh hoạ, không phải số đo):** áp sensitivity 35% và specificity 93% của [S7] vào một kho câu giả định có
5% câu mơ hồ: số câu bị gắn cờ đúng = 5% × 35% ≈ 1,8% kho; số câu tốt bị gắn cờ oan = 95% × 7% ≈ 6,7% kho. Tức là mỗi câu xấu bắt
được sẽ kéo theo khoảng 4 câu tốt bị sinh lại. Với luật của chủ dự án, loại oan chỉ tốn tiền và thời gian sinh lại; lọt mới vi
phạm luật, nên recall là con số quyết định, và recall đo được trong các nguồn đều dưới 40% ([S6], [S7]).

### 2.5 Câu 5 — Kích thước và chi phí một lời gọi kiểm

**Giả định token (Suy luận):**

- Hướng dẫn cố định (vai trò, luật, định dạng JSON): ~200–300 token.
- Câu: ≤ 25 từ ≈ 33 token theo quy tắc "1 token ≈ 4 ký tự hoặc 0,75 từ tiếng Anh" [S23, primary]; nghĩa tiếng Việt kèm theo
  (vd "triển khai phần mềm") ~10–20 token (Suy luận; quy tắc của OpenAI chỉ cho tiếng Anh). MCQ thêm 4 lựa chọn ~10 token.
- Output: JSON kiểu `{"fills":["deploy","release","ship"],"only_target_fits":false}` ~20–60 token; kèm lý do ngắn ~150 token.
- Hai kịch bản: **A** = 350 input + 60 output; **B** = 400 input + 150 output; **C** = B cộng ~500 reasoning token (tính như
  output). Số reasoning token thật chưa đo (repo cũng ghi chưa đo [S20]).

**Cách tính:** giá Standard USD/1M token ở repo §2 và tỷ giá 26.100đ/USD ở repo §15 [S20]; chi phí = input × giá input + output ×
giá output; "% đơn vị" so với 1 đơn vị Wordmet = 600 input + 500 output token (repo §15). Không tính caching, thuế, phí đổi ngoại
tệ. Cột "1 đơn vị" khớp bảng 15.1 của repo.

| Model | 1 đơn vị (repo) | A: 350/60 | B: 400/150 | C: 400/650 |
|---|---|---|---|---|
| `gpt-6-luna` | 8,1đ | 1,70đ (21%) | 3,00đ (37%) | 9,53đ (118%) |
| `gpt-5.6-luna` | 18,8đ | 3,71đ (20%) | 6,79đ (36%) | 22,45đ (119%) |
| `gpt-5.4-nano` | 19,4đ | 3,78đ (19%) | 6,98đ (36%) | 23,29đ (120%) |
| `gpt-5-mini` | 30,0đ | 5,42đ (18%) | 10,44đ (35%) | 36,54đ (122%) |
| `gpt-5.4-mini` | 70,5đ | 13,90đ (20%) | 25,45đ (36%) | 84,17đ (119%) |
| `gpt-6.1-sol` | 161,8đ | 33,93đ (21%) | 60,03đ (37%) | 190,53đ (118%) |

- Theo repo, `gpt-6.1-sol` thấp nhất là `low` nên luôn có reasoning token [S20]: với model này kịch bản C sát thực tế hơn A/B.
- Model Anthropic: repo §15 không có giá Anthropic nên **không quy đổi** ở đây.
- **Suy luận** về sinh lại: nếu bộ kiểm loại tỷ lệ r câu và câu bị loại được sinh lại rồi kiểm lại, chi phí mỗi câu được giữ ≈
  (G + V) / (1 − r), với G = chi phí sinh, V = chi phí kiểm. Ví dụ `gpt-6-luna`, G = 8,1đ, V = 3,0đ, r = 20% (cỡ tỷ lệ gắn cờ
  11/54 ở [S6] và 21,31% ứng viên bị loại ở [S3]): ≈ 13,9đ mỗi câu được giữ, so với 8,1đ khi không kiểm.
- Kiểm cho MCQ có thể gộp cả 3 distractor vào một lời gọi, nên kích thước tương tự kịch bản A/B (Suy luận).

### 2.6 Những gì chưa có câu trả lời

- Tỷ lệ câu cloze gõ đáp án do LLM viết cho một từ đích có từ khác điền được (mục 2.1).
- Hiệu quả đo được của việc ép collocation/ngữ cảnh cụ thể trong prompt LLM.
- Blind solve dạng "liệt kê mọi từ điền được" và blind solve bằng model/provider khác model sinh: chưa thấy số.
- Số của Quizlet, quy trình sản xuất đề thật của Cambridge, bản gốc Gérard et al. 2026, số liệu VocQGen (GPT-4) bị chặn đọc.
- Các con số trong [S6], [S7], [S8], [S9] đến từ môn hoá, dược, lập trình hoặc câu kiến thức, không phải câu từ vựng tiếng Anh;
  [S1], [S2], [S18] không dùng LLM sinh câu. Áp chúng vào Wordmet là Suy luận.

---

## 3. Nguồn

- [S1] Lee et al. (2021), "Swords: A Benchmark for Lexical Substitution with Improved Data Coverage and Quality", NAACL 2021 —
  https://arxiv.org/abs/2106.04102 — [primary] (2021, trước khoảng 2022–2026; dùng làm số nền)
- [S2] Zhang, Mita, Komachi (2023), "Cloze Quality Estimation for Language Assessment", Findings of EACL 2023 —
  https://aclanthology.org/2023.findings-eacl.39.pdf — [primary]
- [S3] Kang, Jeon, Hwang, Lee (POSTECH, Mila), "Difficulty-Controllable Cloze Question Distractor Generation" —
  https://arxiv.org/abs/2511.01526 (bản ACL 2026: https://aclanthology.org/2026.acl-long.854.pdf) — [primary]
- [S4] Wang et al. (2023), "Automated Generation of Multiple-Choice Cloze Questions for Assessing English Vocabulary Using
  GPT-turbo 3.5", NLP4DH 2023 — https://arxiv.org/abs/2403.02078 · https://aclanthology.org/2023.nlp4dh-1.7/ — [primary]
- [S5] Doughty et al. (2024), "A Comparative Study of AI-Generated (GPT-4) and Human-crafted MCQs in Programming Education",
  ACE 2024 — https://arxiv.org/abs/2312.03173 — [primary]
- [S6] Dittel, Clark, Van Campenhout, Johnson (VitalSource, 2024), "Exploring Large Language Models for Evaluating Automatically
  Generated Questions", workshop tại AIED 2024 — https://ceur-ws.org/Vol-3772/paper4short.pdf — [primary]
- [S7] Moore & Diana (2026), "AI-Enabled Quality Assurance for Multiple-Choice Assessment Items", AIME-Con 2026 —
  https://aclanthology.org/2026.aimecon-wip.58.pdf — [primary] cho nhận định của chính bài review; [secondary] cho số của Gérard
  et al. (2026, British Journal of Clinical Pharmacology 92(8):2574–2583) mà bài này trích
- [S8] Moore et al. (2024), "An Automatic Question Usability Evaluation Toolkit" (SAQUET) — https://arxiv.org/abs/2405.20529 —
  [primary]
- [S9] Gema et al., "Are We Done with MMLU?" (MMLU-Redux), NAACL 2025 — https://arxiv.org/abs/2406.04127 — [primary]
- [S10] Bitew, Deleu, Develder, Demeester, "Distractor generation for multiple-choice questions with predictive prompting and
  large language models" — https://arxiv.org/abs/2307.16338 — [primary]
- [S11] Meador (ETS, 2026), "From Expert Approval to Validity Evidence: Evaluating AI-Generated Assessment Items", AIME-Con 2026 —
  https://aclanthology.org/2026.aimecon-sessions.18.pdf — [primary]
- [S12] Chen, Zhang, Runge, Church (Duolingo, 2026), "Responsible AI in the Duolingo English Test: Case Studies with Automatic
  Item Creation and Session-Level Quality Monitoring", AIME-Con 2026 — https://aclanthology.org/2026.aimecon-sessions.12.pdf —
  [primary]
- [S13] Attali et al. (Duolingo, 2022), "The interactive reading task: Transformer-based automatic item generation", Frontiers in
  Artificial Intelligence 5 — https://pmc.ncbi.nlm.nih.gov/articles/PMC9354894/ — [primary]
- [S14] Johnson, Dittel, Van Campenhout (VitalSource, 2025), "Improving automatically generated fill-in-the-blank answer selection
  with an LLM-based agreement filter", workshop EDM 2025 —
  https://research.vitalsource.com/publications/improving-automatically-generated-fill-in-the-blank-answer-selection-with-an-llm-based-agreement-filter
  (PDF: https://drive.google.com/file/d/1qJzkLz78t1afIJ4KKKxI7tCxrhWklOcP/view) — [primary]
- [S15] Duolingo Blog (Rowan Mockler, 29/03/2022), "How user reports improve course content" —
  https://blog.duolingo.com/how-user-reports-improve-course-content — [primary]
- [S16] OpenAI API reference, Chat Completions create (`logprobs`; `top_logprobs` là số nguyên 0–20) —
  https://developers.openai.com/api/reference/ruby/resources/chat/subresources/completions/methods/create — [primary]
- [S17] Anthropic, "OpenAI SDK compatibility" (bảng trường: `logprobs`, `top_logprobs` "Ignored"; response `logprobs` "Always
  empty") — https://platform.claude.com/docs/en/api/openai-sdk — [primary]
- [S18] Felice, Taslimipoor, Buttery (Cambridge ALTA, 2022), "Constructing Open Cloze Tests Using Generation and Discrimination
  Capabilities of Transformers", Findings of ACL 2022 — https://arxiv.org/abs/2204.07237 — [primary]
- [S19] Van Campenhout, Johnson, Dittel (VitalSource, 2025), "Refining sentence selection for automatic cloze question generation
  with large language models", L@S 2025 —
  https://research.vitalsource.com/publications/refining-sentence-selection-for-automatic-cloze-question-generation-with-large-language-models
  (DOI https://doi.org/10.1145/3698205.3733926) — [primary], chỉ đọc trang tóm tắt
- [S20] repo: `docs/preparation/OPENAI_API_RESEARCH_2026-10-19.md` — §2 (giá model, mức reasoning effort), §15 (đơn vị 600
  input + 500 output, tỷ giá 26.100đ/USD, bảng VND/đơn vị), ghi chú [S19] trong file đó (bỏ `top_logprobs` khi effort khác
  `none`)
- [S21] Oak National Academy Engineering (25/08/2026), "Optimising prompts at Oak: our 134 line Multiple Choice Question quality
  judge-prompt became four sentences, and halved our error rate using DSPy" —
  https://engineering.thenational.academy/p/optimising-prompts-at-oak-our-134 — [primary]
- [S22] Duolingo Blog (Parker Henry, 22/06/2023), bài về cách dùng large language model để viết bài học —
  https://blog.duolingo.com/large-language-model-duolingo-lessons/ — [primary]
- [S23] OpenAI, "Advanced usage" (quy tắc ước lượng: 1 token ≈ 4 ký tự ≈ 0,75 từ tiếng Anh) —
  https://developers.openai.com/api/docs/guides/advanced-usage — [primary]
