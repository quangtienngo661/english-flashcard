# AI eval: các cách làm tốt nhất, áp dụng cho app học từ vựng (31/10/2026)

Tài liệu nghiên cứu cho chủ dự án, người tự chạy eval cho 6 AI operation của app: `generate_cloze`, `generate_meaning_question`,
`generate_sentence_mcq`, `lookup_word`, `check_private_word`, `translate_sentence` (chưa dùng). App đã có golden set theo từng
operation, chia dev / held-out (~30%, held-out bị ẩn), phiên bản set đóng băng, code rule của Practice chạy trong eval, LLM judge
(model khác, mỗi tiêu chí trả `pass` / `fail_major` / `fail_minor` kèm lý do ngắn, không biết model nào viết), nhãn người với %
agreement và cờ "calibrated" (≥30 nhãn, ≥85% agreement), so sánh run và publish gate cảnh báo khi pass rate giảm >5 điểm, ví dụ dev
bị regress, hoặc lỗi held-out tăng. Writer là model OpenAI; judge sẽ là model Anthropic. Golden set bắt đầu ~30 ví dụ mỗi operation.

**Cách đọc.** Mỗi khẳng định có URL nguồn ngay bên cạnh. Chỗ nào không tìm được nguồn thì ghi `ASSUMPTION`. Chỗ nào là phép tính
của tài liệu này (không phải con số của nguồn) thì ghi "tính toán". Các nguồn được đọc trực tiếp ngày 31/10/2026; một số là
preprint chưa qua peer review, đã ghi rõ.

---

## 1. Error analysis trước tiên: đọc output, rồi mới đo

**Người làm thực tế khuyên gì.** Trước khi viết judge hay chọn chỉ số, đọc output thật và ghi chú lỗi. Hamel Husain và Shreya
Shankar mô tả quy trình ba bước ([evals FAQ, 09/2026](https://hamel.dev/blog/posts/evals-faq/)):

- **Open coding:** đọc từng trace (một lần gọi AI cùng input/output), viết ghi chú tự do về cái sai. Tự gán nhãn ít nhất 30 trace
  trước khi xem gợi ý của agent; với mỗi trace chỉ ghi **lỗi đầu tiên**, vì lỗi phía trên thường kéo theo lỗi phía dưới.
- **Axial coding:** gom các ghi chú thành một failure taxonomy (danh mục kiểu lỗi), đếm số lỗi mỗi loại.
- **Theoretical saturation:** đọc tiếp cho tới khi trace mới không còn lộ ra kiểu lỗi mới. Nguồn gợi ý một pool ~100 trace đa
  dạng, đọc ít nhất 100, mỗi chu kỳ 2–4 tuần làm lại với ≥100 trace mới, giữa các chu kỳ đọc 10–20 trace mỗi tuần.
- Mức tối thiểu: mỗi khi đổi lớn, dành 30 phút đọc 20–50 output.
- Tác giả cho biết họ dành "60-80%" thời gian phát triển cho error analysis và evaluation.

**Vì sao.** Tiêu chí đánh giá không thể viết xong trước khi nhìn output. Nghiên cứu EvalGen gọi đây là *criteria drift*: "users need
criteria to grade outputs, but grading outputs helps users define criteria" ([Shankar et al., 04/2024](https://arxiv.org/abs/2404.12272)).
Một số tiêu chí chỉ xuất hiện sau khi thấy output cụ thể. Anthropic cũng nói "read the transcripts": ví dụ một benchmark nội bộ cho
Opus 4.5 42% vì lỗi grader và đề mơ hồ, sửa xong thì lên 95% ([Anthropic, 01/2026](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)).

**Cạm bẫy.** Dùng metric "có sẵn" (helpfulness, coherence, ROUGE, BERTScore) làm thước đo chất lượng: "Generic evaluations waste time
and create false confidence" ([evals FAQ](https://hamel.dev/blog/posts/evals-faq/)). Giao error analysis cho người ngoài khi chưa có
rubric nội bộ ([evals FAQ](https://hamel.dev/blog/posts/evals-faq/)).

**Áp dụng cho app này.**
- Trước khi viết thêm tiêu chí judge cho `generate_cloze`, đọc 30–50 output thật và ghi lỗi đầu tiên của mỗi cái (ví dụ: "chỗ trống
  điền được cả *big* lẫn *large*", "bản dịch tiếng Việt dịch sai nghĩa", "câu quá khó so với cấp độ"). Gom lại thành taxonomy riêng
  cho từng operation; mỗi loại lỗi lớn sẽ thành một tiêu chí.
- Chủ dự án là "benevolent dictator": một người quyết định chuẩn ([evals FAQ](https://hamel.dev/blog/posts/evals-faq/)). Không cần
  hội đồng.

---

## 2. Xây golden set: kích thước, độ phủ, dev / held-out

**Kích thước.** Anthropic: "20-50 simple tasks drawn from real failures is a great start"; giai đoạn đầu thay đổi có tác động lớn
nên mẫu nhỏ là đủ thấy ([Anthropic, 01/2026](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)). Hamel: bộ eval
lặp lại "often grow to 100 or more examples", kích thước cuối do độ phủ quyết định ([evals FAQ](https://hamel.dev/blog/posts/evals-faq/));
Hamel cũng gợi ý bắt đầu ~30 ví dụ khi xây dataset cho judge ([Hamel, LLM-as-a-Judge guide](https://hamel.dev/blog/posts/llm-judge/)).
Ở chiều thống kê, Evan Miller (Anthropic) kết luận eval mới nên có khoảng 1.000 câu để phát hiện chênh lệch 3 điểm
([Miller, 11/2024](https://arxiv.org/html/2411.00640v1)). Hai con số này không mâu thuẫn: 20–50 đủ để *thấy* lỗi lớn, không đủ để
*đo* chênh lệch nhỏ (mục 5).

**Độ phủ và edge case.** Anthropic docs: thiết kế eval phản ánh phân bố task thật và "Don't forget to factor in edge cases", gồm input
không liên quan / không tồn tại, input quá dài, input xấu, và ca mơ hồ mà chính người cũng khó thống nhất
([Anthropic docs, Define success criteria and build evaluations](https://platform.claude.com/docs/en/docs/test-and-evaluate/develop-tests)).
Bộ ca phải cân bằng: "Test both the cases where a behavior should occur and where it shouldn't"
([Anthropic, 01/2026](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)). OpenAI: trộn dữ liệu production,
ví dụ do chuyên gia viết và log cũ; gồm ca thường, ca biên và ca adversarial
([OpenAI, Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)).

**Expected answer.** Mỗi task nên có lời giải tham chiếu qua được mọi grader, để chứng minh task giải được; một task 0% qua nhiều lần
thử thường là task hỏng chứ không phải model kém. Tiêu chí của task tốt: "two domain experts would independently reach the same
pass/fail verdict" ([Anthropic, 01/2026](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)).

**Synthetic vs real.** Sinh dữ liệu theo *dimension* (ví dụ: loại từ × cấp độ × số nghĩa) thay vì xin "test query" chung chung; viết tay
~20 tuple trước rồi mới nhân rộng; synthetic không cho biết lỗi phổ biến tới đâu ngoài thực tế và kém tin cậy với ngôn ngữ ít tài
nguyên ([evals FAQ](https://hamel.dev/blog/posts/evals-faq/)).

**Dev vs held-out, và khi held-out bị "dùng hết".** Dùng đi dùng lại một held-out để chọn phương án sẽ làm overfit chính held-out đó
("Reusing a holdout set adaptively multiple times can easily lead to overfitting to the holdout set itself";
[Dwork et al., 2015](https://arxiv.org/abs/1506.02629)). Không tìm được nguồn nào lượng hoá "bao nhiêu lần xem thì held-out hết giá
trị" cho eval LLM. Quy tắc thực hành dưới đây là `ASSUMPTION` suy ra từ nguyên lý đó: mỗi lần nhìn kết quả held-out rồi sửa prompt
theo nó, held-out mất một phần tính độc lập; khi đã sửa prompt *vì* một ví dụ held-out cụ thể, ví dụ đó nên chuyển sang dev và thay
bằng ví dụ mới.

**Cạm bẫy.** Eval bão hoà: "An eval at 100% tracks regressions but provides no signal for improvement"
([Anthropic, 01/2026](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)). Contamination: đưa ví dụ golden vào
few-shot của prompt writer làm eval đo trí nhớ chứ không đo năng lực (`ASSUMPTION`, suy từ nguyên lý held-out ở trên; không tìm được
nguồn riêng cho eval prompt).

**Áp dụng cho app này.**
- 30 ví dụ/operation là đủ để bắt đầu, nhưng phủ có chủ đích: với `generate_cloze` nên có từ đa nghĩa, từ có dạng bất quy tắc
  (`go/went`), cụm động từ, từ có đồng nghĩa gần (dễ sinh câu nhiều đáp án). Với `check_private_word` cân bằng ca `ok` và
  `not_recognized`, kể cả ca từ có thật nhưng nghĩa tiếng Việt sai.
- Ví dụ trong few-shot của prompt writer không được nằm trong golden set (cả dev lẫn held-out).
- Lấy ví dụ mới từ lỗi thật (báo lỗi của người học, report reasons) để làm mới set theo từng phiên bản đóng băng.

---

## 3. Code check, LLM judge hay người chấm

**Khuyến nghị chung.** Anthropic docs xếp thứ tự: code-based grading "Fastest and most reliable, extremely scalable" nhưng thiếu sắc
thái; human grading "Most flexible and high quality, but slow and expensive. Avoid if possible"; LLM-based grading nhanh, linh hoạt,
"Test to ensure reliability first, then scale"
([Anthropic docs](https://platform.claude.com/docs/en/docs/test-and-evaluate/develop-tests)). Anthropic engineering tóm lại: dùng
grader tất định khi có thể, LLM grader khi cần, người chấm một cách dè sẻn; người chấm là chuẩn vàng để calibrate
([Anthropic, 01/2026](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)).

**Vì sao.** Code check rẻ, chạy được mỗi lần đổi; LLM judge cần 100+ nhãn và bảo trì liên tục
([evals FAQ](https://hamel.dev/blog/posts/evals-faq/)). Code check vẫn cần ít nhất một ví dụ Pass và một ví dụ Fail cho mỗi điều kiện
([evals FAQ](https://hamel.dev/blog/posts/evals-faq/)).

**Áp dụng cho app này.**
- Code (đã có, giữ và mở rộng): đúng một `___`; từ đích hoặc accepted forms khớp chỗ trống; distractor lấy đúng từ danh sách candidate
  cho sẵn, không trùng đáp án; JSON đúng schema; `lookup_word` trả part of speech thuộc tập cho phép.
- LLM judge: những gì cần hiểu nghĩa: "chỉ một đáp án điền được", "câu dùng đúng nghĩa được chọn của từ đa nghĩa", "bản dịch tiếng Việt
  đúng nghĩa", "distractor sai rõ ràng nhưng hợp ngữ pháp".
- Người: chủ dự án gán nhãn để calibrate judge và đọc mẫu trước mỗi lần publish (mục 7).

---

## 4. Thiết kế LLM judge

**Binary hay thang điểm.** Hamel: ưu tiên pass/fail, "Numeric labels are advanced and usually not necessary"; muốn đo tiến bộ dần thì
dùng nhiều sub-check binary thay vì thang 1–5 ([evals FAQ](https://hamel.dev/blog/posts/evals-faq/)). OpenAI: pairwise hoặc pass/fail
đáng tin hơn ([OpenAI](https://developers.openai.com/api/docs/guides/evaluation-best-practices)). Eugene Yan: mặc định binary cho tiêu
chí khách quan và báo cáo recall/precision; pairwise cho tiêu chí chủ quan ([Yan, 08/2024](https://eugeneyan.com/writing/llm-evaluators/)).
Bằng chứng không một chiều: một preprint 01/2026 thấy thang 0–5 cho alignment người–LLM cao nhất khi gộp 6 benchmark, và cảnh báo con
số gộp che khác biệt giữa task ([Li et al., 2026, preprint](https://arxiv.org/abs/2601.03444)). Kết luận trung lập: binary là mặc định
của người làm thực tế; thang nào tốt hơn cho *task của bạn* thì phải đo bằng nhãn người.

**Một tiêu chí mỗi judge.** "we recommend building a separate judge for each type of failure"; chỉ đưa judge phần ngữ cảnh nó cần,
ngữ cảnh thừa gây "context rot" ([evals FAQ](https://hamel.dev/blog/posts/evals-faq/)).

**Viết prompt judge.** Rubric rõ, định nghĩa thuật ngữ, ràng buộc output ("Output only 'yes' or 'no'"), và cho judge suy luận trước khi
cho điểm bằng thinking ([Anthropic docs](https://platform.claude.com/docs/en/docs/test-and-evaluate/develop-tests)). OpenAI cũng khuyên
judge "reason before scoring" ([OpenAI](https://developers.openai.com/api/docs/guides/evaluation-best-practices)). Cho judge một lối thoát
kiểu "Unknown" ([Anthropic, 01/2026](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)). Few-shot cho judge: dùng
chính các ví dụ chuyên gia đã chấm kèm critique; critique phải đủ chi tiết để dùng làm few-shot
([Hamel, LLM-as-a-Judge guide](https://hamel.dev/blog/posts/llm-judge/)). Lưu ý riêng cho judge Claude đời mới: trên Opus 5.5, Sonnet
5.5 và một số model khác, prompt bắt model viết lập luận ra (ví dụ trong thẻ `<thinking>`) "may be declined"; nên dựa vào thinking
có sẵn, hạ `effort` nếu cần tiết kiệm ([Anthropic, Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)).
Trường "lý do ngắn" sau verdict có bị ảnh hưởng không thì chưa kiểm: `ASSUMPTION` là không, vì đó là một trường output chứ không phải
yêu cầu viết lập luận; nên thử với model judge thật.

**Bias: position và verbosity.** Position bias không ngẫu nhiên, khác nhau theo judge và task, và bị chi phối mạnh nhất bởi khoảng cách
chất lượng giữa hai lời giải ([Shi et al., 2024/2025](https://arxiv.org/abs/2406.07791)). Theo tổng hợp của Eugene Yan, trong nghiên
cứu MT-Bench gpt-3.5 có position bias ở 50% ca, claude-v1 70%; hai model này chọn câu dài hơn trên 90% thời gian
([Yan, 08/2024](https://eugeneyan.com/writing/llm-evaluators/), tổng hợp từ [Zheng et al., 2023](https://arxiv.org/abs/2306.05685)).
OpenAI khuyên kiểm soát độ dài câu trả lời ([OpenAI](https://developers.openai.com/api/docs/guides/evaluation-best-practices)). App này
chấm từng output một (pointwise) theo tiêu chí, không so cặp, nên position bias ít liên quan hơn; verbosity bias vẫn có thể đẩy
`lookup_word` dài dòng lên (`ASSUMPTION`).

**Bias: self-preference, và blinding có giải quyết không.** Bằng chứng, trình bày trung lập:
- Model judge cho output của chính nó điểm cao hơn trong khi người chấm thấy ngang nhau; GPT-4 và Llama 2 phân biệt được output của
  mình với model khác "out of the box" với độ chính xác đáng kể; sau fine-tune, khả năng tự nhận ra tương quan tuyến tính với mức
  self-preference ([Panickssery, Bowman, Feng, 04/2024](https://arxiv.org/abs/2404.13076)).
- Trong nghiên cứu của Wataoka et al., judge **không được cho biết** văn bản nào là của mình mà vẫn có self-preference; GPT-4 có mức
  bias lớn nhất trong 8 model; judge ưa văn bản có perplexity thấp (quen thuộc với nó) hơn người, bất kể ai viết, và output của chính
  nó thường có perplexity thấp hơn. Một số model nhỏ lại đánh giá thấp output của mình
  ([Wataoka, Takahashi, Ri, 10/2024](https://arxiv.org/html/2410.21819v1)).
- Ở mức "họ model": một preprint 09/2026 trên 4 họ model open-weight thấy judge cùng họ cho thêm 3,4–8,4 điểm phần trăm; kiểm soát
  likelihood của judge làm hệ số giảm 61% nhưng vẫn còn dư ([Awuni et al., 2026, preprint](https://arxiv.org/abs/2609.17857)).
- Anthropic docs: "Generally best practice to evaluate with a different model from the one used to generate the evaluated output"
  ([Anthropic docs](https://platform.claude.com/docs/en/docs/test-and-evaluate/develop-tests)).

Đọc bằng chứng: **ẩn tên model không đủ để loại self-preference**, vì cơ chế được đề xuất là độ quen thuộc của văn phong, không phải
cái nhãn. Nhưng với cấu hình hiện tại (writer OpenAI, judge Anthropic), judge không chấm output của chính nó hay cùng họ, nên dạng bias
này phần lớn không áp dụng; điều này đến từ việc khác họ model, không đến từ blinding. Nó sẽ quay lại khi (a) app thêm writer Anthropic,
hoặc (b) dùng judge Anthropic để so writer OpenAI với writer Anthropic. Giới hạn: các nghiên cứu trên chủ yếu ở dạng so cặp (pairwise),
không phải chấm theo tiêu chí pass/fail; không tìm được nghiên cứu đo trực tiếp dạng của app.

**Calibrate với nhãn người.** Báo cáo TPR và TNR, không chỉ raw agreement: judge luôn "pass" trên dữ liệu có 5% lỗi vẫn đạt 95%
agreement mà không bắt được lỗi nào ([Hamel, LLM-as-a-Judge guide](https://hamel.dev/blog/posts/llm-judge/)). Hamel khuyên 100–200 nhãn
cho mỗi failure mode, chia train 10–20% / dev 40–45% / test 40–45%, mỗi set dev và test có 30–50 Pass và 30–50 Fail khi có thể; dưới 60
ví dụ thì confidence interval thường quá rộng ([evals FAQ](https://hamel.dev/blog/posts/evals-faq/);
[Hamel, LLM-as-a-Judge guide](https://hamel.dev/blog/posts/llm-judge/)). Ví dụ Honeycomb đạt >90% agreement sau ba vòng
([Hamel, LLM-as-a-Judge guide](https://hamel.dev/blog/posts/llm-judge/)). Judge không hoàn hảo làm pass rate thô bị lệch; một bài ICML
2026 đề xuất hiệu chỉnh pass rate theo sensitivity/specificity đo trên tập nhãn người và báo khoảng tin cậy gồm cả bất định của tập
calibrate ([Lee et al., 2025/2026](https://arxiv.org/abs/2511.21140)). Judge có thể dễ dãi với lỗi: trong tổng hợp của Eugene Yan,
evaluator bắt >95% bản tóm tắt đúng nhưng chỉ 30–60% bản sai ([Yan, 08/2024](https://eugeneyan.com/writing/llm-evaluators/)).

Tính toán cho cờ "calibrated" của app: 30 nhãn với 26 khớp (86,7%) có khoảng tin cậy 95% (Wilson) khoảng **70–95%**. Nếu 90% output
là pass, một judge luôn trả `pass` cũng đạt ~90% agreement.

**Giữ judge cập nhật.** Làm lại quy trình sau thay đổi lớn như đổi model ([Hamel, LLM-as-a-Judge guide](https://hamel.dev/blog/posts/llm-judge/));
theo dõi criteria drift ([Shankar et al.](https://arxiv.org/abs/2404.12272)).

**Áp dụng cho app này.**
- Bổ sung TPR và TNR (tính trên `fail_major` + `fail_minor` gộp thành "fail") cạnh % agreement; coi cờ "calibrated" là "đủ để bắt
  đầu tin", không phải "đã chứng minh". Cố gắng có ≥10–15 ca fail thật trong tập nhãn của mỗi tiêu chí (`ASSUMPTION`: con số tối thiểu
  để TNR/TPR có nghĩa; nguồn khuyên 30–50 mỗi lớp).
- Mỗi tiêu chí một câu hỏi rõ, có định nghĩa và 2–3 ví dụ đã chấm kèm critique của chủ dự án.
- Nếu sau này thêm writer Anthropic: dùng judge OpenAI cho output Anthropic (hoặc hai judge khác họ), đừng dựa vào blinding.

---

## 5. Thống kê cho eval nhỏ

**Khuyến nghị.** Báo cáo standard error và khoảng tin cậy 95% cạnh mỗi điểm; với điểm 0/1, SE = √(p(1−p)/n), CI ≈ p ± 1,96·SE; cluster
SE khi câu hỏi theo nhóm (SE cluster có thể lớn gấp ~3 lần SE thường); so hai phiên bản bằng **paired difference** trên cùng câu hỏi
(tương quan 0,5 giảm phương sai một phần ba); làm power analysis trước; chạy nhiều lần mỗi câu (K lần) để giảm nhiễu; **không** hạ
temperature để giảm phương sai vì có thể gây bias ([Miller, 11/2024](https://arxiv.org/html/2411.00640v1);
[Anthropic, A statistical approach to model evals, 11/2024](https://www.anthropic.com/research/statistical-approach-to-model-evals)).

**Con số (tính toán, khoảng Wilson 95%).**

| Số ví dụ | Pass rate quan sát | Khoảng tin cậy 95% |
|---|---|---|
| 9 (held-out ~30% của 30) | 7/9 = 78% | 45–94% |
| 20 | 80% | 58–92% |
| 30 | 80% | 63–90% |
| 50 | 80% | 67–89% |
| 100 | 80% | 71–87% |

So hai phiên bản prompt (tính toán, α = 0,05 hai phía, power 80%):
- Hai bộ ví dụ **khác nhau** (không paired): phát hiện 80% → 90% cần ~199 ví dụ mỗi bên; 80% → 85% cần ~905.
- **Cùng** bộ ví dụ (paired, kiểu McNemar): phụ thuộc bao nhiêu ví dụ đổi kết quả. Nếu 15% ví dụ đổi kết quả và lợi ròng 10 điểm thì cần
  ~115 ví dụ; nếu 12% đổi và lợi ròng 5 điểm thì cần ~374. Tỉ lệ đổi kết quả là `ASSUMPTION` để minh hoạ.
- Trên 30 ví dụ, sign test chính xác: bản mới sửa 5 ví dụ, hỏng 0 → p ≈ 0,06; sửa 6, hỏng 0 → p ≈ 0,03; sửa 6, hỏng 1 → p ≈ 0,13.

**Quy tắc thực hành.**
- Với 30 ví dụ, 5 điểm = 1,5 ví dụ. Mọi chênh lệch dưới ~15 điểm trên tổng pass rate đều có thể là nhiễu.
- Nhìn **từng ví dụ đổi kết quả** (sửa được gì, làm hỏng gì) thay vì nhìn hai con số tổng. Đây chính là paired analysis ở dạng đơn giản.
- Chạy writer 2–3 lần mỗi ví dụ khi muốn so hai prompt: với 198 câu, tăng K từ 1 lên 10 giảm mức chênh lệch nhỏ nhất phát hiện được từ
  13,2% xuống 7,5% ([Miller](https://arxiv.org/html/2411.00640v1)). Không cộng K lần chạy như K ví dụ độc lập.
- Ví dụ cùng một từ (nhiều nghĩa của một từ đa nghĩa) là một cluster; nhiều ví dụ cùng từ làm kết quả trông chắc hơn thực tế.

**Áp dụng cho app này.**
- Cảnh báo ">5 điểm" của publish gate trên 30 ví dụ sẽ bật khi chỉ 2 ví dụ đổi kết quả: coi nó là tín hiệu "đi đọc 2 ví dụ đó", không
  phải bằng chứng regression.
- Lỗi held-out trên ~9 ví dụ chỉ có ý nghĩa khi là lỗi *mới* ở ví dụ cụ thể; con số % held-out quá nhiễu để so.
- Hiển thị khoảng tin cậy cạnh pass rate trong màn so sánh run (tính toán Wilson như trên) để không đọc nhầm nhiễu thành tiến bộ.

---

## 6. Prompt engineering cho task sinh dữ liệu có cấu trúc

**Anthropic (judge).** Coi Claude như "a brilliant but new employee", giải thích *vì sao* của mỗi chỉ dẫn; ví dụ few-shot là "one of the
most reliable ways to steer" format và cấu trúc, cần relevant, diverse ("vary enough that Claude doesn't pick up unintended patterns"),
bọc trong `<example>`; "Include 3–5 examples"; dùng thẻ XML tách instructions / context / input; nói điều cần làm thay vì điều cấm
([Anthropic, Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)).
Prefill không còn được hỗ trợ từ Claude 4.6; để ép format dùng structured outputs hoặc tool có enum cho bài phân loại (hợp với verdict
`pass` / `fail_major` / `fail_minor`) ([cùng nguồn](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)).
Thinking: Opus 5.5 luôn bật adaptive thinking; độ suy nghĩ chỉnh bằng `effort`; `budget_tokens` báo lỗi 400 từ Claude 4.7
([cùng nguồn](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)).

**OpenAI (writer).** Hướng dẫn cho GPT-5.6 Sol: mô tả đích đến, tiêu chí thành công và hình dạng output thay vì kê từng bước; chỉ dùng
ALWAYS/NEVER cho bất biến thật; "conflicting rules can create more instability than missing detail"; bỏ ví dụ không thay đổi hành vi;
đổi một nhóm chỉ dẫn mỗi lần rồi chạy lại cùng eval; "Do not rewrite a working prompt stack all at once"
([OpenAI, Prompting guidance for GPT-5.6 Sol](https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6)). Reasoning effort:
bắt đầu `medium`, `low` cho việc cần nhanh nếu giữ chất lượng, `high`/`xhigh` "only when evals show a meaningful gain"; giá trị hỗ trợ
khác nhau theo model ([cùng nguồn](https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6);
[OpenAI, Reasoning models](https://developers.openai.com/api/docs/guides/reasoning)). "Treat `reasoning.effort` as a tuning knob, not the
primary way to recover quality" ([OpenAI, Reasoning](https://developers.openai.com/api/docs/guides/reasoning)).

**Structured outputs.** OpenAI Structured Outputs với `strict: true` bảo đảm output khớp JSON Schema (JSON mode chỉ bảo đảm JSON hợp lệ);
ví dụ của OpenAI đều đặt `additionalProperties: false` và liệt kê mọi trường trong `required`; refusal có thể không theo schema nên phải
kiểm tra trước khi parse; output bị cắt do hết token có status `incomplete`
([OpenAI, Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)). Schema bảo đảm *hình dạng*, không bảo
đảm *nội dung đúng*: code rule và judge vẫn cần (`ASSUMPTION` hiển nhiên, không cần nguồn).

**Temperature.** Không hạ temperature để giảm nhiễu eval ([Miller](https://arxiv.org/html/2411.00640v1)). Model reasoning của OpenAI có
nhận `temperature` hay không phụ thuộc model và mức effort; chỉ tìm được thảo luận cộng đồng, không có trang chính thức đã kiểm
(`ASSUMPTION`; [OpenAI community](https://community.openai.com/t/temperature-in-gpt-5-models/1337133)). Kiểm API reference của đúng model
trước khi đặt.

**Versioning.** Lưu prompt trong Git, "versioned, reviewed, and deployed atomically with the application code"
([evals FAQ](https://hamel.dev/blog/posts/evals-faq/)).

**Cạm bẫy few-shot.** Ví dụ tự vi phạm quy tắc (ví dụ cloze mẫu có hai đáp án điền được) dạy model điều ngược với chỉ dẫn; ví dụ giống
nhau làm model chép chi tiết (cùng chủ đề, cùng cấu trúc câu). Nguồn trực tiếp chỉ nói "diverse ... unintended patterns" và "conflicting
rules" ở trên; phần "ví dụ vi phạm quy tắc" là `ASSUMPTION` suy ra từ hai điều đó.

**Áp dụng cho app này.**
- Chạy chính code rule của Practice trên từng ví dụ few-shot trong prompt writer; ví dụ nào trượt thì bỏ.
- Đổi một thứ mỗi lần (prompt, model, effort), mỗi thay đổi một run so sánh trên cùng phiên bản golden set.
- Thử `effort` thấp hơn một nấc cho `generate_cloze` / `generate_sentence_mcq` (task ngắn) và giữ lại chỉ khi eval không tụt.

---

## 7. "Đủ tốt để publish": gate và theo dõi sau publish

**Khuyến nghị.** Phân biệt capability eval (bắt đầu ở pass rate thấp, đo tiến bộ) với regression eval (gần 100%, chặn lùi); capability
eval đã cao thì "tốt nghiệp" sang regression suite ([Anthropic, 01/2026](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)).
Hamel: cẩn thận khi tối ưu pass rate cao, 70% có thể là một bài test hữu ích; báo "pass all" rate (một ví dụ chỉ pass khi qua mọi check)
thay vì điểm tổng có trọng số; nhóm check theo mức độ chặn release ([evals FAQ](https://hamel.dev/blog/posts/evals-faq/)).
Không lớp eval nào bắt hết lỗi ("Swiss cheese"): eval tự động trước launch, monitoring production, A/B khi đủ traffic, đọc feedback và
transcript định kỳ, nghiên cứu người để calibrate ([Anthropic, 01/2026](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)).

**Monitoring.** Lấy mẫu trace thật, chạy evaluator bất đồng bộ (thường là judge không cần đáp án mẫu); theo dõi confidence interval và
điều tra khi cận dưới vượt ngưỡng; đưa kiểu lỗi mới từ production về bộ eval; check rẻ chạy mọi trace, judge đắt chạy trên mẫu hằng đêm
([evals FAQ](https://hamel.dev/blog/posts/evals-faq/)). Tiêu chí thành công tốt phải specific, measurable, achievable, relevant
([Anthropic docs](https://platform.claude.com/docs/en/docs/test-and-evaluate/develop-tests)).

**Tuyệt đối hay tương đối.** Không tìm được nguồn bắt buộc một cách. Từ các nguồn trên: regression eval mang tính tuyệt đối (gần 100%
trên ca cũ), còn chất lượng chung so với baseline. Cách app đang làm (chủ dự án tự quyết, gate cảnh báo tương đối) phù hợp khi set nhỏ
(`ASSUMPTION` dựa trên mục 5: ngưỡng tuyệt đối trên 30 ví dụ có sai số ±14 điểm).

**Áp dụng cho app này (checklist trước publish).**
- 0 lỗi code rule; mọi ví dụ "regression" (ca từng sai đã sửa) vẫn pass.
- Đọc danh sách ví dụ đổi kết quả so với bản đang chạy, không chỉ con số.
- Đọc tay 10–20 output mới trên từ ngoài golden set (spot check).
- Sau publish: lấy mẫu output thật mỗi tuần cho judge chấm; ví dụ người học báo lỗi được thêm vào phiên bản set tiếp theo.

---

## 8. Riêng cho nội dung học ngôn ngữ

**Tiêu chí cloze / MCQ trong nghiên cứu.** Wang et al. (Waseda) đánh giá 60 câu cloze trắc nghiệm do GPT-3.5 sinh cho Academic Word
List: stem tốt khi hiểu được mà không cần đáp án, không lỗi ngữ pháp, dùng đáp án theo cách chuẩn; distractor tốt khi hợp ngữ pháp với
stem nhưng sai nghĩa, và bị loại nếu nó cũng là đáp án chấp nhận được. Kết quả: 75% stem tốt, 66,85% distractor tốt; 24 distractor
hoá ra cũng là đáp án đúng, 19 lệch từ loại, 8 lỗi ngoại/nội động từ ([Wang, Rose, Orita, Sugawara, 03/2024](https://arxiv.org/html/2403.02078v1)).
Với cloze mở (không có lựa chọn), CLOZER dùng masked language model để sinh câu chỉ chấp nhận đáp án gốc, kiểm trên 1.600 câu trả lời
([Matsumori et al., 2022/2023](https://arxiv.org/abs/2205.07202)). Distractor nên gần nghĩa để hợp lý nhưng vẫn sai
([Sun & Wang, 2024](https://arxiv.org/abs/2410.04266)).

**Cấp độ CEFR.** Nghiên cứu Duolingo/Stanford so few-shot prompting, fine-tune và RL để điều khiển độ khó văn bản cho người học; prompting
cho thấy chênh lệch lớn giữa GPT-4 và model mở, và model riêng (CALM) vượt GPT-4 với chi phí thấp hơn nhiều
([Malik, Mayhew, Piech, Bicknell, ACL Findings 2024](https://arxiv.org/abs/2406.03030)). Nghĩa là chỉ dặn "câu ở cấp A2" trong prompt
không bảo đảm cấp độ; cần đo.

**Chất lượng bản dịch.** GEMBA-MQM dùng GPT-4 với 3-shot cố định để đánh dấu error span trong bản dịch mà không cần bản dịch tham chiếu;
tác giả khuyên thận trọng vì phụ thuộc model đóng ([Kocmi & Federmann, 2023](https://arxiv.org/abs/2310.13988)). GEMBA V2 (WMT 2025) cho
model ghi lỗi theo MQM, quy ra điểm với trọng số 25/5/1 theo mức nặng, chấm mỗi đoạn 10 lần và gộp, đứng đầu theo tương quan trung bình
trên tập WMT24 ([Junczys-Dowmunt, 2025](https://aclanthology.org/2025.wmt-1.67/)). Không tìm được nghiên cứu riêng cho Anh → Việt trong
lượt tìm này.

**Áp dụng cho app này.**
- `generate_cloze` / `generate_sentence_mcq`: tiêu chí judge chính là "chỉ một đáp án" (theo Wang et al., đây là lỗi distractor phổ biến
  nhất) và "distractor hợp từ loại / ngữ pháp" (lỗi phổ biến thứ hai; một phần bắt được bằng code nếu biết part of speech của candidate).
- Cấp độ: một code check rẻ là so từ trong câu với danh sách CEFR-J app đã có, cảnh báo khi có từ cao hơn cấp đích (`ASSUMPTION`:
  ý tưởng, chưa có nguồn đo hiệu quả).
- Bản dịch tiếng Việt trong `generate_cloze`: tiêu chí judge theo kiểu MQM rút gọn (sai nghĩa = `fail_major`, diễn đạt vụng = `fail_minor`),
  khớp với thang hiện có của app.

---

## 9. Kiểm soát chi phí eval và judge

- **Batch:** OpenAI Batch API giảm 50% so với gọi đồng bộ, xong trong 24 giờ ([OpenAI, Batch API](https://developers.openai.com/api/docs/guides/batch)).
  Anthropic Message Batches giảm 50%, phần lớn batch xong dưới 1 giờ, tối đa 24 giờ; giảm giá batch cộng dồn được với prompt caching
  ([Anthropic, Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing)).
- **Prompt caching:** Anthropic: ghi cache 5 phút = 1,25× giá input, đọc cache 0,1× (Opus 5.5 và Sonnet 5.5: 0,05×), prompt tối thiểu 512
  token cho Opus 5.5 / Sonnet 5.5 / Haiku 5.5 ([Anthropic, Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)).
  OpenAI: caching tự động, prefix tối thiểu 1.024 token cho GPT-5.6 trở đi, đọc cache 0,1×; đặt phần cố định ở đầu prompt
  ([OpenAI, Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)).
- **Thứ tự check:** code trước, judge sau; dùng judge nhỏ hơn nếu alignment với nhãn người tương đương; eval luôn pass thì chạy thưa hoặc
  bỏ ([evals FAQ](https://hamel.dev/blog/posts/evals-faq/)).
- **Ensemble:** theo tổng hợp của Eugene Yan, một panel model nhỏ (PoLL) tương quan với người cao hơn GPT-4 đơn lẻ với 1/7 chi phí
  ([Yan, 08/2024](https://eugeneyan.com/writing/llm-evaluators/)).

**Áp dụng cho app này.**
- Chạy judge qua batch khi không cần kết quả ngay (run eval ban đêm); đặt rubric + few-shot của judge ở đầu prompt để được cache.
- Chỉ gọi judge cho output đã qua code rule; output trượt code rule đã là fail.
- Khi so hai prompt: chạy judge trên ví dụ đổi kết quả và mẫu ngẫu nhiên, không cần cả set mỗi lần (`ASSUMPTION`: tiết kiệm hợp lý,
  không có nguồn đo).

---

## (a) Tóm tắt 15 nguyên tắc

1. Đọc output thật trước khi viết tiêu chí; ghi lỗi đầu tiên của mỗi output, gom thành taxonomy.
2. Tiêu chí sẽ đổi khi bạn đọc thêm output; coi rubric là bản nháp sống.
3. Bắt đầu 20–50 ví dụ lấy từ lỗi thật; phủ có chủ đích (từ đa nghĩa, bất quy tắc, đồng nghĩa gần, ca `not_recognized`).
4. Mỗi ví dụ có đáp án mẫu mà hai người hiểu biết sẽ chấm giống nhau.
5. Ví dụ đã được dùng để sửa prompt thì không còn là held-out; chuyển sang dev và thay mới.
6. Không để ví dụ golden lọt vào few-shot của writer.
7. Code check trước, judge sau, người chấm để calibrate.
8. Một judge một tiêu chí, verdict binary (hoặc pass / fail_major / fail_minor), có định nghĩa và ví dụ đã chấm.
9. Calibrate judge bằng TPR và TNR, không chỉ % agreement; 30 nhãn chỉ là điểm khởi đầu.
10. Ẩn tên model không loại được self-preference; giữ judge khác họ với writer.
11. Trên 30 ví dụ, chênh lệch dưới ~15 điểm có thể là nhiễu; đọc từng ví dụ đổi kết quả.
12. Mỗi lần đổi một thứ (prompt, model, effort) và chạy lại cùng phiên bản set.
13. Few-shot của writer phải tự qua được code rule; ví dụ phải đa dạng.
14. Trước publish: 0 lỗi code rule, ca regression còn pass, đọc tay 10–20 output mới.
15. Sau publish: lấy mẫu output thật cho judge chấm định kỳ, đưa lỗi mới về golden set; dùng batch và caching để giữ chi phí thấp.

---

## (b) Nguồn

| # | Tiêu đề | Tác giả / tổ chức | Ngày | URL |
|---|---|---|---|---|
| 1 | AI Evals: Everything You Need to Know (evals FAQ) | Hamel Husain, Shreya Shankar | 18/09/2026 (sửa 21/09/2026) | https://hamel.dev/blog/posts/evals-faq/ |
| 2 | Using LLM-as-a-Judge For Evaluation: A Complete Guide | Hamel Husain | 29/10/2024 (sửa 01/09/2026) | https://hamel.dev/blog/posts/llm-judge/ |
| 3 | Who Validates the Validators? Aligning LLM-Assisted Evaluation of LLM Outputs with Human Preferences | Shankar, Zamfirescu-Pereira, Hartmann, Parameswaran, Arawjo (UIST '24) | 18/04/2024 | https://arxiv.org/abs/2404.12272 |
| 4 | Demystifying evals for AI agents | Anthropic Engineering | 09/01/2026 | https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents |
| 5 | Define success criteria and build evaluations | Anthropic docs | đọc 31/10/2026 | https://platform.claude.com/docs/en/docs/test-and-evaluate/develop-tests |
| 6 | Prompting best practices | Anthropic docs | đọc 31/10/2026 | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices |
| 7 | Batch processing | Anthropic docs | đọc 31/10/2026 | https://platform.claude.com/docs/en/build-with-claude/batch-processing |
| 8 | Prompt caching | Anthropic docs | đọc 31/10/2026 | https://platform.claude.com/docs/en/build-with-claude/prompt-caching |
| 9 | A statistical approach to model evals | Anthropic | 19/11/2024 | https://www.anthropic.com/research/statistical-approach-to-model-evals |
| 10 | Adding Error Bars to Evals: A Statistical Approach to Language Model Evaluations | Evan Miller | 01/11/2024 | https://arxiv.org/abs/2411.00640 |
| 11 | Evaluation best practices | OpenAI | đọc 31/10/2026 | https://developers.openai.com/api/docs/guides/evaluation-best-practices |
| 12 | Prompting guidance for GPT-5.6 Sol | OpenAI | đọc 31/10/2026 | https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6 |
| 13 | Reasoning models | OpenAI | đọc 31/10/2026 | https://developers.openai.com/api/docs/guides/reasoning |
| 14 | Structured Outputs | OpenAI | đọc 31/10/2026 | https://developers.openai.com/api/docs/guides/structured-outputs |
| 15 | Batch API | OpenAI | đọc 31/10/2026 | https://developers.openai.com/api/docs/guides/batch |
| 16 | Prompt caching | OpenAI | đọc 31/10/2026 | https://developers.openai.com/api/docs/guides/prompt-caching |
| 17 | Temperature in GPT-5 models (thảo luận cộng đồng, không chính thức) | OpenAI Developer Community | không rõ ngày | https://community.openai.com/t/temperature-in-gpt-5-models/1337133 |
| 18 | LLM Evaluators Recognize and Favor Their Own Generations | Panickssery, Bowman, Feng | 15/04/2024 | https://arxiv.org/abs/2404.13076 |
| 19 | Self-Preference Bias in LLM-as-a-Judge | Wataoka, Takahashi, Ri (SB Intuitions) | 29/10/2024 | https://arxiv.org/abs/2410.21819 |
| 20 | Who Judges Matters: Measuring Family-Conditioned Preference in LLM-as-Judge Panels (preprint) | Awuni et al. | 15/09/2026 | https://arxiv.org/abs/2609.17857 |
| 21 | Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena | Zheng et al. (NeurIPS 2023) | 2023 | https://arxiv.org/abs/2306.05685 |
| 22 | Judging the Judges: A Systematic Study of Position Bias in LLM-as-a-Judge | Shi et al. (AACL-IJCNLP 2025) | 06/2024, sửa 11/2025 | https://arxiv.org/abs/2406.07791 |
| 23 | Evaluating the Effectiveness of LLM-Evaluators (aka LLM-as-Judge) | Eugene Yan | 08/2024 | https://eugeneyan.com/writing/llm-evaluators/ |
| 24 | Grading Scale Impact on LLM-as-a-Judge (preprint) | Li et al. | 06/01/2026 | https://arxiv.org/abs/2601.03444 |
| 25 | How to Correctly Report LLM-as-a-Judge Evaluations | Lee, Zeng, Jeong, Sohn, Lee (ICML 2026) | 11/2025, sửa 05/2026 | https://arxiv.org/abs/2511.21140 |
| 26 | Automated Generation of Multiple-Choice Cloze Questions for Assessing English Vocabulary Using GPT-turbo 3.5 | Wang, Rose, Orita, Sugawara | 04/03/2024 | https://arxiv.org/abs/2403.02078 |
| 27 | Mask and Cloze: Automatic Open Cloze Question Generation using a Masked Language Model | Matsumori et al. (IEEE Access 2023) | 2022 | https://arxiv.org/abs/2205.07202 |
| 28 | Constructing Cloze Questions Generatively | Sun, Wang | 05/10/2024 | https://arxiv.org/abs/2410.04266 |
| 29 | From Tarzan to Tolkien: Controlling the Language Proficiency Level of LLMs for Content Generation | Malik, Mayhew, Piech, Bicknell (ACL Findings 2024) | 05/06/2024 | https://arxiv.org/abs/2406.03030 |
| 30 | GEMBA-MQM: Detecting Translation Quality Error Spans with GPT-4 | Kocmi, Federmann (WMT 2023) | 21/10/2023 | https://arxiv.org/abs/2310.13988 |
| 31 | GEMBA V2: Ten Judgments Are Better Than One | Marcin Junczys-Dowmunt (WMT 2025) | 11/2025 | https://aclanthology.org/2025.wmt-1.67/ |
| 32 | Generalization in Adaptive Data Analysis and Holdout Reuse (bản dài của "The reusable holdout", Science 2015) | Dwork, Feldman, Hardt, Pitassi, Reingold, Roth | 2015 | https://arxiv.org/abs/1506.02629 |

**Chưa kiểm được / để ngỏ:** (1) không có nguồn lượng hoá khi nào held-out "hết giá trị" cho eval LLM; (2) không có nghiên cứu đo
self-preference trong dạng chấm pointwise pass/fail theo tiêu chí như app; (3) không có trang chính thức OpenAI xác nhận model reasoning
nào nhận `temperature`; (4) không tìm được nghiên cứu đánh giá dịch Anh → Việt bằng LLM; (5) các con số khoảng tin cậy và cỡ mẫu ở mục 5 là
tính toán theo công thức chuẩn (Wilson, hai tỉ lệ, McNemar), không phải số của nguồn; (6) một số nguồn là preprint (#20, #24) hoặc tổng hợp
lại số liệu của bài khác (#23 lấy từ #21).
