# 05. Judge và gắn nhãn

[README](README.md) · trước: [04](04-chay-eval-va-doc-ket-qua.md) · tiếp: [06 Prompt](06-prompt.md)

## 1. Khi nào đáng có judge

Judge đáng khi lỗi **cần hiểu nghĩa** (code không bắt được) và **hay gặp**. Ví dụ: "có từ khác điền vừa" ở cloze (B1: 10–12/14 câu).
Không cần judge cho thứ luật đã bắt (một chỗ trống, đáp án là dạng của từ) hay lỗi chưa từng thấy (B1: sai nghĩa 0/28).

Judge cần nhãn và bảo trì liên tục; code check rẻ, chạy được mỗi lần đổi ([evals FAQ](https://hamel.dev/blog/posts/evals-faq/)).
Thứ tự: code trước, judge khi cần, người chấm để kiểm judge
([Anthropic, 01/2026](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)).

## 2. Judge trong app

- Trang "Judge": "Thêm judge"; mỗi hàng "Sửa", "Nhân bản judge", "Độ khớp". Không có nút xóa judge.
- Một judge: tên, các thao tác nó chấm, bật/tắt. Mỗi **bản** (revision) có: 1–10 tiêu chí (mỗi tiêu chí một mã `code` dạng
  `single_answer` và một câu hỏi `question` ≤ 500 ký tự), "Hướng dẫn" (≤ 8000 ký tự), "Ví dụ mẫu" (≤ 10), model, effort, thinking, số
  token đầu ra tối đa.
- **Chỉ model Anthropic.** Gợi ý của app: "Judge chỉ dùng model Anthropic và không được biết model nào viết câu."
- Judge nhận đúng 5 trường: `target_operation`, `input`, `output`, `criteria` (mã + câu hỏi), `context` (`null` khi chấm eval;
  `{"session_words": [...]}` khi chấm câu thật). Không có tên model, nhà cung cấp, số cấu hình.
- Judge trả cho mỗi tiêu chí: `pass` / `fail_major` / `fail_minor` và lý do (≤ 1000 ký tự). App hiện là "Đạt" / "Không đạt nặng" /
  "Không đạt nhẹ".
- Nghĩa app dùng: **Đạt** = câu trả lời cho câu hỏi là có. **Không đạt nặng** = không, và người học biết từ vẫn có thể viết khác rồi
  bị chấm sai. **Không đạt nhẹ** = không, nhưng chỉ ở mức nhỏ ít người gặp.
- "Không chấm được": lời gọi lỗi, tiêu chí bị bỏ sót (`missing`), trả hai lần (`duplicate`), verdict lạ (`invalid-verdict`). Lượt sau
  chấm lại các câu này.
- Có sẵn judge seed "Chỉ một đáp án" (bản 1, **chưa có model**, đang bật, chấm `generate_cloze`), tiêu chí `single_answer`.

## 3. Thiết kế tiêu chí

- **Một câu hỏi, một lỗi.** Mỗi loại lỗi lớn từ error analysis thành một tiêu chí. Nguồn khuyên "a separate judge for each type of
  failure" và chỉ đưa ngữ cảnh judge cần ([evals FAQ](https://hamel.dev/blog/posts/evals-faq/)).
- **Viết sao cho "có" = tốt.** "Is X the only answer that fits?" chứ không "Does another word fit?".
- **Ưu tiên kiểu đạt/không đạt.** Người làm thực tế mặc định binary; nhiều kiểm nhỏ thay cho thang 1–5
  ([evals FAQ](https://hamel.dev/blog/posts/evals-faq/); [OpenAI](https://developers.openai.com/api/docs/guides/evaluation-best-practices)).
  Ba mức của app vẫn là binary ở lớp ngoài (đạt / không đạt), thêm độ nặng. Bằng chứng không một chiều: một preprint thấy thang 0–5
  khớp người tốt nhất khi gộp 6 benchmark ([Li et al., 2026](https://arxiv.org/abs/2601.03444)).
- **Định nghĩa từng mức bằng ví dụ** trong "Hướng dẫn", không chỉ bằng lời.

**Một judge nhiều tiêu chí hay nhiều judge?**

| Cách | Được | Mất |
|---|---|---|
| Một judge, 2–3 tiêu chí | Một lời gọi chấm cả ba, rẻ hơn | Sửa một tiêu chí là bản mới, cả judge chấm lại từ đầu |
| Mỗi tiêu chí một judge (đề xuất khi bắt đầu) | Sửa tiêu chí này không đụng tiêu chí kia; đúng lời khuyên của nguồn | Nhiều lời gọi hơn |

Nhãn gắn theo **mã tiêu chí**, dùng chung cho mọi bản judge. Đổi câu chữ mà giữ nghĩa → giữ mã, nhãn cũ vẫn dùng được. Đổi **nghĩa**
tiêu chí → đặt mã mới, vì nhãn cũ trả lời câu hỏi khác.

## 4. Viết "Hướng dẫn" cho judge

Cấu trúc: (1) bối cảnh và vì sao; (2) dữ liệu nhận được; (3) cách quyết từng tiêu chí, từng bước; (4) định nghĩa ba mức kèm ví dụ;
(5) bỏ qua gì; (6) viết lý do thế nào. Cơ sở: rubric rõ, định nghĩa thuật ngữ, giải thích *vì sao*, nói điều cần làm thay vì điều cấm
([Anthropic docs](https://platform.claude.com/docs/en/docs/test-and-evaluate/develop-tests);
[Anthropic, Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)).
App tự nối câu chặn cố định vào cuối, bạn không cần viết.

**Ví dụ đầy đủ: "Chỉ một đáp án" cho `generate_cloze`** (dán vào "Hướng dẫn"; prompt của app viết bằng tiếng Anh):

```text
You check fill-in-the-blank vocabulary questions written for Vietnamese learners of English.

Why this matters: a learner who knows the target word reads the sentence and types one answer. Only the forms listed in
accepted_answers are marked correct. If another word fits the blank just as well, a learner who answered correctly is told
they are wrong. That is the failure you are looking for.

What you receive (JSON): target_operation; input (word, part_of_speech, level, meaning_vi, context_label); output (the
sentence with exactly one blank "___", accepted_answers, and a Vietnamese translation of the sentence); criteria (codes and
questions); context (null for test examples; for real questions, context.session_words lists other words the learner is
studying in the same session).

How to decide single_answer:
1. Read the sentence as a learner at the given CEFR level would.
2. List the words such a learner would plausibly type: synonyms, near-synonyms, words that often go with the words around
   the blank, and every word in context.session_words when it is present.
3. For each candidate, check: is the sentence still grammatical and natural, with the same meaning?
4. Forms and spelling variants of the target word are not other answers.

Verdicts:
- pass: no other word a learner at this level would plausibly type fits. Fixed expressions and clear clues count, for example
  "the river burst its ___" points only to "banks".
- fail_major: a common word at or below the given level fits naturally with the same meaning, for example "The drummer kept
  a steady ___" fits "beat" as well as "rhythm"; or any word in context.session_words fits.
- fail_minor: only a rare word, a word above the learner's level, or a very close variant fits, for example "although" and
  "though", so few learners would be affected.

Judge only whether one answer fits. Do not judge the translation, the difficulty or the style; other criteria cover them.

Reason: name every other word that fits, in quotes, and why. For pass, name the clue that rules out the closest alternative.
Keep it under 300 characters. If you cannot decide between two verdicts, choose the one you lean towards and start the
reason with "UNSURE:".
```

Giải thích bằng tiếng Việt, so với bản seed:
- **Thêm "vì sao"** (Lan gõ đúng mà bị chấm sai). Anthropic khuyên giải thích lý do của mỗi chỉ dẫn.
- **Thêm quy trình 4 bước**: buộc judge liệt kê từ ứng viên rồi thử từng từ, thay vì cảm tính.
- **Ví dụ cho từng mức**, lấy từ B1: `beat` cho `rhythm` (nặng), `though` cho `although` (nhẹ), "burst its ___" (đạt).
- **"Bỏ qua gì"**: để judge không trừ điểm vì bản dịch, việc của tiêu chí khác.
- **Lý do phải nêu từ cạnh tranh**: khi gắn nhãn bạn kiểm nhanh được judge có đúng không.
- **"UNSURE:"** là lối thoát vì app chỉ có ba mức. Nguồn khuyên cho judge một lối thoát kiểu "Unknown"
  ([Anthropic, 01/2026](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)); cách làm qua tiền tố lý do là
  `ASSUMPTION`, chưa thử.
- **Không yêu cầu viết lập luận** trong thẻ `<thinking>`: với Claude đời mới yêu cầu này "may be declined"; dựa vào thinking có sẵn
  ([Anthropic, Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)).
  Trường lý do ngắn có bị ảnh hưởng không thì chưa kiểm (`ASSUMPTION`: không).

Câu hỏi tiêu chí (giữ mã `single_answer`): `Is the target word, in the forms listed in accepted_answers, the only answer a learner at this level would plausibly type in the blank?`

**"Ví dụ mẫu" cho judge (tùy chọn, 2–3 cái).** Dùng câu bạn đã chấm kèm lời phê đủ chi tiết
([Hamel, LLM-as-a-Judge](https://hamel.dev/blog/posts/llm-judge/)), đa dạng, 3–5 ví dụ là tốt
([Anthropic, Prompting](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)).
Lấy từ B1 các từ **không** có trong golden set (`book` nặng, `fast` nhẹ, `go` đạt) để không đo độ khớp trên chính câu judge đã thấy
(`ASSUMPTION`). Dạng một ví dụ:

```json
{"input": {"target_operation": "generate_cloze",
           "input": {"word": "book", "part_of_speech": "verb", "level": "A2", "meaning_vi": "đặt (vé, phòng)", "context_label": null},
           "output": {"sentence": "Last week we ___ two tickets for the concert online.", "accepted_answers": ["booked"], "translation_vi": "Tuần trước chúng tôi đã đặt hai vé xem hòa nhạc trên mạng."},
           "criteria": [{"code": "single_answer", "question": "Is the target word, in the forms listed in accepted_answers, the only answer a learner at this level would plausibly type in the blank?"}],
           "context": null},
 "output": {"codes": ["single_answer"], "verdicts": ["fail_major"], "reasons": ["\"bought\", \"ordered\" and \"reserved\" fit naturally with the same meaning at A2."]}}
```

Đầu ra của `generate_cloze` có ba trường `sentence`, `accepted_answers`, `translation_vi` (đúng như ví dụ mẫu của prompt `generate_cloze`). Sai khuôn thì app từ chối khi lưu.

## 5. Chọn model judge

| Lựa chọn | Được | Mất |
|---|---|---|
| Model nhỏ (lớp Haiku; B1 dùng id `claude-haiku-5-5`) | Rẻ | Có thể bỏ sót E1 tinh |
| Model giữa (lớp Sonnet; B1 dùng `claude-sonnet-5-5`) — đề xuất để bắt đầu | Cân bằng | Đắt hơn ~12 lần Haiku khi làm writer ở B1 |
| Model lớn | Có thể khớp người nhất | Đắt nhất |

So sánh chất lượng giữa các lớp là `ASSUMPTION`. Cách đo: khi đã có ≥ 30 nhãn, "Nhân bản judge", đổi model bản sao sang lớp nhỏ hơn,
chấm cùng lần chạy, so "Độ khớp". Khớp ngang nhau thì dùng model rẻ ([evals FAQ](https://hamel.dev/blog/posts/evals-faq/)). Lúc đầu để
thinking bật: nguồn khuyên judge suy luận trước khi chấm ([Anthropic docs](https://platform.claude.com/docs/en/docs/test-and-evaluate/develop-tests);
[OpenAI](https://developers.openai.com/api/docs/guides/evaluation-best-practices)).

> **Ẩn tên model có đủ chống thiên vị không? Hai quan điểm.**
> *Chủ dự án:* judge không bao giờ biết model nào viết câu, nên thiên vị cùng họ không còn đáng lo.
> *Nghiên cứu:* judge vẫn ưa văn bản "quen" với nó (perplexity thấp) dù **không** được cho biết ai viết
> ([Wataoka et al., 2024](https://arxiv.org/html/2410.21819v1)); judge cùng họ cho thêm 3,4–8,4 điểm (preprint,
> [Awuni et al., 2026](https://arxiv.org/abs/2609.17857)). Cái giúp ở đây là writer OpenAI, judge Anthropic: khác họ, nên phần lớn
> dạng thiên vị này không áp dụng ([Anthropic docs](https://platform.claude.com/docs/en/docs/test-and-evaluate/develop-tests) cũng khuyên
> dùng model khác model viết). Nó quay lại nếu sau này có writer Anthropic. App nhắc khi cả hai cùng Anthropic: "Model viết câu và judge
> cùng là Anthropic: judge có thể dễ dãi với văn phong cùng họ." Chưa có nghiên cứu đo đúng kiểu chấm pass/fail từng tiêu chí của app.

## 6. Chạy lượt chấm

- Lúc bắt đầu lần chạy: trang "Bộ ví dụ" → tick "Chấm bằng judge" (chỉ cho bản đang chạy).
- Trên lần chạy đã xong (kể cả lần chạy nháp): từ panel lần chạy, hoặc "Chấm cả hai bằng {name}" khi so hai lần chạy.
- Lượt chấm mọi ví dụ đúng khuôn, **cả dev lẫn held-out**. Một bản judge chỉ có một lượt đang chạy (`judge-pass-running`). **Không có
  nút dừng.** Chạm trần USD → lượt lỗi `admin-usd-cap`, phần đã chấm giữ lại. Không tính vào 20 lượt/giờ.
- Chấm lại chỉ chấm câu chưa có verdict đủ mọi tiêu chí. Bản judge mới → chấm lại từ đầu.

## 7. Gắn nhãn

Mở bằng link "Gắn nhãn lần lượt" trong panel lần chạy (hoặc trong kết quả chấm câu thật). Màn "Gắn nhãn · {judge}": "Đạt (1)",
"Không đạt nặng (2)", "Không đạt nhẹ (3)", "Bỏ qua", "Trước". Mở ở câu chưa gắn đầu tiên.

Quy tắc:
1. **Gắn nhãn mà không nhìn verdict của judge.** Màn "Gắn nhãn" chỉ hiện "Đầu vào", "Đầu ra", "Tiêu chí" và ba nút, không hiện verdict, có chủ ý. Đừng mở panel lần chạy (cột "Judge") ở tab bên cạnh để xem trước. Nhìn trước thì nhãn
   của bạn bị kéo theo judge, và độ khớp đo sai.
2. Chấm đúng câu hỏi của tiêu chí, không chấm thứ khác.
3. Phân vân → "Bỏ qua", quay lại sau.
4. Ghi ra giấy những câu bạn chấm 2 hoặc 3 (từ + câu rút gọn), cần cho mục 8.

Không gắn được: ví dụ held-out, ví dụ không đúng khuôn, lần chạy đã ẩn. Nhãn là một cho mỗi (đầu ra, mã tiêu chí), dùng chung mọi bản.

**Số học vòng 1:** một lần chạy có ~21 ví dụ dev → tối đa 21 nhãn mỗi tiêu chí, **chưa đủ 30**. Gắn nhãn thêm lần chạy thứ hai (sau
khi sửa prompt) để lên ~42. Đừng hạ "Số nhãn tối thiểu để tin judge" cho nhanh: 30 đã là mức khởi đầu.

## 8. Đọc "Độ khớp" và giới hạn của nó

Trang "Judge" → "Độ khớp" → panel "Độ khớp với nhãn · {name}": "khớp đạt/không đạt" (đạt vs không đạt) và "khớp cả mức" (đúng cả
nặng/nhẹ). "Đã hiệu chỉnh" khi đủ số nhãn **và** tỉ lệ khớp đạt/không đạt ≥ ngưỡng, tính riêng từng (bản, tiêu chí).

Giới hạn, phải tự bù:
- 26/30 khớp (86,7%) có khoảng tin cậy 95% khoảng 70–95% (tính toán, file nghiên cứu §4). "Đã hiệu chỉnh" = đủ để bắt đầu tin, chưa
  phải đã chứng minh.
- **Judge luôn nói "Đạt" vẫn khớp cao** khi phần lớn câu tốt: 90% câu tốt → 90% khớp mà không bắt được lỗi nào
  ([Hamel, LLM-as-a-Judge](https://hamel.dev/blog/posts/llm-judge/)). Judge thường dễ dãi với lỗi: bắt > 95% câu đúng nhưng chỉ 30–60%
  câu sai ([Yan, 2024](https://eugeneyan.com/writing/llm-evaluators/)).
- Vì vậy **tự đếm**: trong N câu bạn chấm không đạt, judge bắt được mấy? Ví dụ "bạn 8 câu không đạt, judge bắt 7". App không hiện số
  này; dùng danh sách ở mục 7 đối chiếu với điểm judge từng câu. Mục tiêu (`ASSUMPTION`, nguồn khuyên 30–50 mỗi lớp): ≥ 10–15 câu
  không đạt thật trong tập nhãn của mỗi tiêu chí.
- Cảnh báo judge khi publish **không** xét judge đã hiệu chỉnh hay chưa.

## 9. Khi nào đổi judge, và đổi thì mất gì

Đổi khi: judge bỏ sót câu bạn chấm không đạt; khớp dưới ngưỡng; sau khi đổi model writer ([Hamel, LLM-as-a-Judge](https://hamel.dev/blog/posts/llm-judge/));
khi bạn hiểu tiêu chí khác đi ([Shankar et al.](https://arxiv.org/abs/2404.12272)).

Đổi tiêu chí, hướng dẫn, ví dụ mẫu, model, effort, thinking hay số token → **bản mới**. Bản mới có điểm và độ khớp riêng, bắt đầu từ
0; nhãn của bạn vẫn còn. Phải chấm lại các lần chạy đã gắn nhãn để có độ khớp của bản mới. Đổi tên, thao tác, bật/tắt không sinh bản
mới ("Đã lưu (không đổi bản).").
