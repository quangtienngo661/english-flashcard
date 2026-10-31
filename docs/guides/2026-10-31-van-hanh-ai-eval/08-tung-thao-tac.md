# 08. Từng thao tác

[README](README.md) · trước: [07](07-quyet-dinh-publish.md) · tiếp: [09 Vòng đầu tiên](09-vong-dau-tien-generate-cloze.md)

Thứ tự đề xuất: `generate_cloze` → `generate_sentence_mcq` → `generate_meaning_question` → `lookup_word` → `check_private_word`.
`translate_sentence` không có luồng người học dùng: bỏ qua (cuối file).

Chung cho mọi thao tác:
- Từ gợi ý trong bảng chỉ là gợi ý. Với cloze, mcq, meaning, **từ phải có trong kho** (cách kiểm: [03 §2](03-golden-set.md)); cấp độ
  và nghĩa lấy theo kho của bạn.
- Không dùng từ đang nằm trong ví dụ mẫu của prompt thao tác đó ([03 §2](03-golden-set.md)).
- Tiêu chí judge viết bằng tiếng Anh (câu hỏi ≤ 500 ký tự, mã dạng `single_answer`). Định nghĩa từng mức viết trong "Hướng dẫn" của
  judge, theo khung ở [05 §4](05-judge-va-gan-nhan.md).
- Ngưỡng chung ở [07](07-quyet-dinh-publish.md); phần "Ngưỡng riêng" dưới đây chỉ ghi chỗ khác.

---

## 1. `generate_cloze`: câu điền từ

**Cho Lan.** Lan thấy một câu tiếng Anh có một chỗ trống và nghĩa tiếng Việt của từ, gõ từ vào chỗ trống. Đúng khi gõ một trong các
dạng được nhận.

**Vào → ra.**
- Vào: `word` (1–100), `part_of_speech`, `level` (hoặc `null`), `meaning_vi` (1–300), `context_label` (hoặc `null`).
- Ra: một câu có đúng một `___`, bản dịch tiếng Việt cả câu, `accepted_answers` (1–5 dạng của từ).

**App tự kiểm.**
- Khuôn: một dòng; mọi chuỗi ≥ 3 dấu `_` gộp thành `___`; đúng một chỗ trống; câu ≤ 300, bản dịch ≤ 600, mỗi đáp án ≤ 100; bản dịch
  và đáp án không rỗng; 1–5 đáp án (sau khi bỏ trùng không phân biệt hoa thường); đáp án không chứa `_`.
- Luật: mọi đáp án là dạng hợp lệ của từ trong kho (`unknown-form:<dạng>` nếu không); câu không lộ từ ngoài chỗ trống (`reveals-word`).
- Mong đợi: có ≥ 1 đáp án và mọi đáp án nằm trong `forms`.

**Lỗi hay gặp** (B1, 28 câu, writer Anthropic; [B1](../../preparation/b1-eval/generate_cloze-2026-10-29-error-analysis.md)):
- **E1 có từ khác điền vừa**: lỗi chính, 10–12/14 câu, 5/14 ở mức nặng. Thường do câu quá chung chung, không có manh mối riêng cho
  từ ("Elephants are ___ animals" → `big`, `large`, `huge`).
- **E2** nhận dạng sai ngữ pháp ("will ___" mà nhận `deployed`). Mong đợi không bắt được ([03 §3](03-golden-set.md)).
- **E3** câu khó hơn cấp (`child` A1 trong câu có "abuse and neglect"). Hiếm.
- **E4** dùng sai từ loại (`cheap` thành trạng từ). Hiếm.
- Không thấy: sai nghĩa, lộ từ, nhiều chỗ trống, bản dịch sai ý (0/28).

Nghiên cứu về câu cloze trắc nghiệm do AI sinh cũng thấy lỗi "phương án khác cũng đúng" là phổ biến nhất
([Wang et al., 2024](https://arxiv.org/html/2403.02078v1)).

**Tiêu chí judge ứng viên** (ưu tiên theo thứ tự):

| Mã | Câu hỏi | Không đạt nặng | Không đạt nhẹ |
|---|---|---|---|
| `single_answer` | `Is the target word, in the forms listed in accepted_answers, the only answer a learner at this level would plausibly type in the blank?` | Một từ thông dụng ở cấp đó điền vừa tự nhiên, cùng nghĩa | Chỉ từ hiếm, trên cấp, hoặc biến thể rất gần điền vừa |
| `answers_fit_blank` | `Does every form in accepted_answers fit the blank grammatically in this sentence?` | Có dạng sai ngữ pháp ở chỗ trống mà người học dễ gõ, nên câu trả lời sai được chấm đúng | Dạng sai nhưng hầu như không ai gõ |
| `level_fit` | `Would a learner at the given level understand every other word in the sentence?` | Từ khó làm người học không hiểu câu | Một từ hơi trên cấp |
| `translation_correct` | `Does the Vietnamese translation say the same thing as the English sentence?` | Sai nghĩa | Đúng nghĩa nhưng vụng |

Lưu ý: nghĩa "Không đạt nặng" mặc định của app nói về người học viết khác rồi bị chấm sai. Với `answers_fit_blank`, cái hại là ngược
lại (sai mà được chấm đúng), nên định nghĩa lại rõ trong "Hướng dẫn". Thang nặng/nhẹ cho bản dịch theo kiểu MQM rút gọn (lỗi nghĩa nặng,
diễn đạt vụng nhẹ), phỏng theo cách chấm dịch bằng LLM ([Kocmi & Federmann, 2023](https://arxiv.org/abs/2310.13988)); chưa có nghiên cứu
riêng cho Anh → Việt. Chỉ dặn "câu ở cấp A2" trong prompt không bảo đảm cấp độ
([Malik et al., 2024](https://arxiv.org/abs/2406.03030)).

**30 ví dụ gợi ý.**

| Nhóm | Từ (từ loại, nghĩa) |
|---|---|
| Thông dụng (10) | `water` (noun), `happy` (adjective), `arrive` (verb), `decision` (noun), `although` (conjunction), `quickly` (adverb), `improve` (verb), `between` (preposition), `honest` (adjective), `environment` (noun) |
| Đa nghĩa (3) | `light` (adjective, nhẹ), `fair` (adjective, công bằng), `match` (noun, trận đấu) |
| Đồng nghĩa gần (3) | `begin` (start), `answer` (verb; reply), `shout` (yell) |
| Cụm động từ, ghi `verb` (2) | `give up` (từ bỏ), `look after` (chăm sóc) |
| Bất quy tắc (2) | `buy` (bought), `mouse` (mice) |
| Từ rất ngắn (1) | `ice` |
| Chuyên ngành (1) | `invoice` (`context_label` "kế toán") |
| Regression B1 (4) | `rhythm` (nhịp điệu; `beat`), `big` (`large`), `run` (điều hành; `owned`, `managed`), `subtle` (`slight`) |
| Bạn chọn (4) | ___ |

Held-out 9: ví dụ `honest`, `between`, `environment`, `fair`, `shout`, `look after`, `mouse`, `invoice`, `subtle` (đủ các nhóm).

**Ngưỡng riêng.** Tiêu chí chính là `single_answer`. Vì lỗi E1 khó (một số từ như `although` gần như không có câu chỉ một đáp án),
`fail_minor` nhiều là chấp nhận được; nhìn chủ yếu vào số "Không đạt nặng" (đề xuất ≤ 1/30).

---

## 2. `generate_sentence_mcq`: câu chọn đáp án

**Cho Lan.** Lan thấy câu có một chỗ trống và các lựa chọn: `answer_form` cùng 3 phương án nhiễu (`distractors`), chọn một.

**Vào → ra.**
- Vào: như cloze + `answer_form` (dạng đúng sẽ điền, 1–100) + `candidates` (3–6 từ để AI chọn phương án nhiễu).
- Ra: câu một chỗ trống, bản dịch, `distractors` đúng 3 cái.

App-facts không ghi app chọn `candidates` thế nào trong luồng người học. Trong golden set, bạn tự viết.

**App tự kiểm.**
- Khuôn: như cloze về chỗ trống; đúng 3 phương án nhiễu khác nhau, không rỗng, không chứa `_`, mỗi cái ≤ 100.
- Luật (`mcq-check`): 3 phương án nhiễu khác nhau, đều nằm trong `candidates`, không trùng `answer_form`, câu không lộ từ.
- Mong đợi: **không có**.

**Lỗi hay gặp.** Theo nghiên cứu về câu trắc nghiệm do AI sinh: phương án nhiễu hóa ra cũng đúng (phổ biến nhất), phương án nhiễu
lệch từ loại, lỗi ngoại/nội động từ ([Wang et al., 2024](https://arxiv.org/html/2403.02078v1)). Phương án nhiễu tốt thì gần nghĩa để
hợp lý nhưng vẫn sai ([Sun & Wang, 2024](https://arxiv.org/abs/2410.04266)). Trong app: AI chọn đúng từ đồng nghĩa gần trong
`candidates` làm phương án nhiễu (luật không bắt được).

**Tiêu chí judge ứng viên.**

| Mã | Câu hỏi | Không đạt nặng | Không đạt nhẹ |
|---|---|---|---|
| `single_correct_option` | `Among answer_form and the three distractors, is answer_form the only option that fits the blank?` | Một phương án nhiễu điền vừa tự nhiên, cùng nghĩa | Chỉ vừa khi hiểu gượng |
| `answer_fits` | `Does answer_form fit the blank grammatically and in meaning?` | Đáp án đúng lại không vừa (sai thì, sai dạng) | — |
| `distractors_plausible` | `Is each distractor grammatically possible in the blank but clearly wrong in meaning?` | (thường không dùng: lỗi này làm câu dễ hơn, không chấm sai người học) | Phương án nhiễu sai từ loại nên bị loại ngay |

**30 ví dụ gợi ý.** Phân nhóm như cloze. Điểm khác: `candidates` là chỗ tạo ca biên.

| `word` / `answer_form` | `candidates` | Thử gì |
|---|---|---|
| `rhythm` / `rhythm` | `beat`, `tempo`, `furniture`, `weather`, `promise` | Có tránh được `beat`, `tempo` không |
| `big` / `big` | `large`, `huge`, `quiet`, `early`, `thin` | Đồng nghĩa gần |
| `go` / `went` | `walked`, `drove`, `ate`, `slept`, `painted` | `answer_form` bất quy tắc; câu phải loại `walked`, `drove` |
| `honest` / `honest` | `heavy`, `late`, `wooden` | Đúng 3 ứng viên: không còn lựa chọn |
| `quickly` / `quickly` | `quick`, `slowly`, `table`, `happily`, `rapidly`, `never` | 6 ứng viên lẫn từ loại |
| `arrive` / `arrived` | `reached`, `left`, `cooked`, `opened` | `reached` cần tân ngữ: kiểm ngoại/nội động từ |

**Ngưỡng riêng.** Không có dòng mong đợi. Luật `mcq-check` nên gần 100% (đó là luật hình thức). Tiêu chí chính `single_correct_option`:
"Không đạt nặng" ≤ 1/30.

---

## 3. `generate_meaning_question`: hỏi nghĩa của từ trong câu

**Cho Lan.** Theo lời dặn khởi đầu: AI viết câu dùng từ đúng một lần với nghĩa `meaning_vi`, sao cho 3 nghĩa trong `other_meanings_vi`
không hợp. Lan đọc câu và chọn nghĩa đúng.

**Vào → ra.**
- Vào: như cloze + `other_meanings_vi` (**đúng 3** chuỗi, 1–300).
- Ra: câu (không xuống dòng, ≤ 300), bản dịch (≤ 600), `word_in_sentence` (dạng của từ chép y hệt trong câu, ≤ 100, không chứa `_`).

**App tự kiểm.**
- Luật: `word_in_sentence` là dạng hợp lệ và xuất hiện đúng một lần như một từ trọn vẹn (`unknown-form:<dạng>` hoặc `word-not-once`).
- Mong đợi: `word_in_sentence` nằm trong `forms`.

**Lỗi hay gặp** (chưa đo trên app; suy từ nhiệm vụ, `ASSUMPTION`): câu mơ hồ nên một nghĩa khác cũng hợp; câu dùng từ với nghĩa khác
`meaning_vi`; bản dịch sai.

**Tiêu chí judge ứng viên.**

| Mã | Câu hỏi | Không đạt nặng | Không đạt nhẹ |
|---|---|---|---|
| `meaning_unique` | `Does the sentence make the meaning in meaning_vi the only one that fits, so that none of other_meanings_vi fits?` | Một nghĩa trong `other_meanings_vi` hợp tự nhiên | Chỉ hợp khi hiểu gượng |
| `translation_correct` | `Does the Vietnamese translation say the same thing as the English sentence?` | Sai nghĩa | Vụng |

**30 ví dụ gợi ý.** Nhiều từ đa nghĩa hơn cloze; vẫn có vài từ một nghĩa (ca dễ).

| `word` (từ loại) | `meaning_vi` | `other_meanings_vi` |
|---|---|---|
| `light` (noun) | ánh sáng | nhẹ; châm, đốt; nhạt (màu) |
| `match` (noun) | trận đấu | que diêm; hợp với; đối thủ ngang sức |
| `fair` (adjective) | công bằng | hội chợ; (da, tóc) sáng màu; khá, tạm được |
| `run` (verb) | điều hành | chạy; chảy; ứng cử |
| `spring` (noun) | mùa xuân | lò xo; suối; nhảy bật lên |
| `water` (noun) | nước | lửa; đất; gió |

`other_meanings_vi` có thể là nghĩa thật khác của từ (khó) hoặc nghĩa sai không liên quan (dễ). Nên có cả hai. Một số "nghĩa khác" ở
trên khác từ loại với `word`: đó cũng là một ca biên. Tránh `deploy`, `bank` (ví dụ mẫu seed).

**Ngưỡng riêng.** Như chung; tiêu chí chính `meaning_unique`.

---

## 4. `lookup_word`: tra từ

**Cho Lan.** Lan gặp "children" khi đọc sách, tra trong app. AI trả lemma, từ loại, nghĩa tiếng Việt (theo câu ngữ cảnh nếu có), định
nghĩa tiếng Anh và 1–2 câu ví dụ cùng nghĩa.

**Vào → ra.**
- Vào: `text` (1–100, có thể là dạng chia hay viết sai), `context_sentence` (1–300 hoặc `null`).
- Ra: lemma (≤ 100), từ loại (thuộc danh sách), nghĩa và định nghĩa (≤ 300), 1–2 câu ví dụ (≤ 300).

**App tự kiểm.** Khuôn như trên. Luật: **"Không áp dụng"** (nên từ không cần có trong kho). Mong đợi: lemma và từ loại trùng (không
phân biệt hoa thường).

**Lỗi hay gặp** (`ASSUMPTION`, chưa đo): lemma sai với dạng bất quy tắc; từ loại sai theo ngữ cảnh (`leaves`); nghĩa bỏ qua câu ngữ
cảnh (từ đa nghĩa); câu ví dụ dùng nghĩa khác; trả lời dài dòng (judge có thể ưa câu dài: [Yan, 2024](https://eugeneyan.com/writing/llm-evaluators/)).

**Tiêu chí judge ứng viên.**

| Mã | Câu hỏi | Không đạt nặng | Không đạt nhẹ |
|---|---|---|---|
| `meaning_in_context` | `Does the Vietnamese meaning match how the word is used in context_sentence, or its most common meaning when there is no context?` | Sai nghĩa | Đúng nghĩa nhưng thiếu chính xác |
| `examples_same_sense` | `Do all example sentences use the word in the same meaning as the Vietnamese meaning given?` | Câu ví dụ dùng nghĩa khác | Câu ví dụ gượng |

**30 ví dụ gợi ý.**

| `text` | `context_sentence` | `expected` |
|---|---|---|
| `children` | The children are playing outside. | `child`, `noun` |
| `ran` | She ran to the bus stop. | `run`, `verb` |
| `leaves` | The leaves turn red in autumn. | `leaf`, `noun` |
| `leaves` | He leaves home at seven. | `leave`, `verb` |
| `mice` | `null` | `mouse`, `noun` |
| `gave up` | He gave up smoking last year. | `give up`, `verb` |
| `recieve` | `null` | `receive`, `verb` (viết sai) |
| `barks` | The dog barks at night. | `bark`, `verb` |

Giới hạn: ô mong đợi luôn cần một lemma và một từ loại, nên **không** diễn tả được "đây không phải từ tiếng Anh". Để ca vô nghĩa ra ngoài
golden set. Tránh ca mà chính bạn phân vân lemma (ví dụ `better` trong "I feel better": `good` hay `well`?), vì đáp án mẫu phải rõ tới mức
hai người chấm giống nhau ([Anthropic, 01/2026](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)). Tránh `went`,
`bank` (ví dụ mẫu seed).

**Ngưỡng riêng.** Mong đợi ≥ 95% là chính. "Câu AI thật" không chấm `lookup_word`, nên sau publish chỉ có báo lỗi và tự thử.

---

## 5. `check_private_word`: kiểm từ riêng

**Cho Lan.** Lan tự thêm từ "library = hiệu sách". AI trả `ok` nếu là từ tiếng Anh thật dùng đúng hoặc gần nghĩa `meaning_vi`, và
`not_recognized` nếu không phải tiếng Anh, viết sai, hoặc sai nghĩa. Lời dặn khởi đầu: phân vân thì `ok`.

**Vào → ra.** Vào: `word`, `part_of_speech`, `meaning_vi`. Ra: `verdict`. Số token đầu ra seed 300.

**App tự kiểm.** Khuôn (verdict là `ok` / `not_recognized`). Luật: "Không áp dụng". Mong đợi: verdict trùng.

**Hai kiểu sai, khác cái hại:**
- Nói `not_recognized` với từ đúng: Lan bị từ chối một từ thật, khó chịu.
- Nói `ok` với nghĩa sai: Lan học sai mà không biết.

Kiểu nào nặng hơn là bạn quyết. Đếm riêng hai kiểu trong "Kết quả từng ví dụ".

**Judge:** thường không cần; mong đợi đã chấm trọn kết quả. Chỉ cân nhắc khi muốn chấm lý do.

**30 ví dụ gợi ý** (cân bằng ~15 `ok` / ~15 `not_recognized`, theo file nghiên cứu §2):

| `word` | `part_of_speech` | `meaning_vi` | `expected` |
|---|---|---|---|
| `library` | noun | thư viện | `ok` |
| `library` | noun | hiệu sách | `not_recognized` (sai nghĩa, "bạn giả") |
| `lit` | adjective | rất vui, sôi động (lóng) | `ok` (lóng) |
| `give up` | verb | từ bỏ | `ok` |
| `recieve` | verb | nhận | `not_recognized` (viết sai) |
| `xin chào` | unspecified | xin chào | `not_recognized` (không phải tiếng Anh) |
| `blorft` | noun | cái bàn | `not_recognized` (vô nghĩa) |
| `borrow` | verb | cho mượn | `not_recognized` (ngược nghĩa với `lend`) |
| `sympathetic` | adjective | dễ thương | ca biên: bạn quyết trước |

Tránh `rizz`, `deplyo`, `bank` (ví dụ mẫu seed). Ca biên mà bạn còn phân vân: quyết đáp án trước khi nhập, ghi lý do vào `note`.

**Ngưỡng riêng.** Mong đợi ≥ 95% (≥ 29/30). Thêm: số lỗi của kiểu sai nặng hơn (theo lựa chọn của bạn) = 0.

---

## 6. `translate_sentence`

Không có luồng người học dùng: bỏ qua trong đợt này. App vẫn cho tạo ví dụ (`sentence`, 1–300; **không** có ô mong đợi) và chạy eval;
chỉ có lớp khuôn (bản dịch 1–600). Nếu sau này dùng, tiêu chí judge kiểu `translation_correct` ở trên là điểm bắt đầu.
