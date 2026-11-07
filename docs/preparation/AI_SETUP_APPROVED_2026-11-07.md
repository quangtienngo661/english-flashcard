# AI setup approved by the owner (07/11/2026)

The model, effort, prompt and judge for each AI task, approved by the owner on 07/11/2026 after the tests in
[`judge-compare-2026-11-07/comparison.md`](judge-compare-2026-11-07/comparison.md). Nothing here is published in the app yet; the owner
publishes later in Admin → AI (a draft per task, a run on the task's frozen test set, then Publish).

## Per task

| Task (admin label) | Model | Effort | Prompt | Judge (criterion) | Test result |
|---|---|---|---|---|---|
| Sinh câu điền từ (`generate_cloze`) | Claude Haiku 5.5 | max | [writer-prompt-draft.md](judge-compare-2026-11-07/writer-prompt-draft.md) | "Chỉ một đáp án", [judge-instructions-v2.md](judge-compare-2026-11-07/judge-instructions-v2.md) (`single_answer`) | 48/102 pass, 34 major (old Terra sentences: 30, 44) |
| Sinh câu chọn đáp án (`generate_sentence_mcq`) | Claude Haiku 5.5 | max | [mcq-writer-prompt.md](judge-compare-2026-11-07/mcq-writer-prompt.md) (starter + plan Appendix B) | "Một lựa chọn đúng", [mcq-judge-instructions.md](judge-compare-2026-11-07/mcq-judge-instructions.md) (`single_correct_option`, plan Appendix C2) | 20/20 pass |
| Sinh câu hỏi nghĩa (`generate_meaning_question`) | Claude Haiku 5.5 | max | starter, [meaning-writer-prompt.md](judge-compare-2026-11-07/meaning-writer-prompt.md) | "Một nghĩa đúng", [meaning-judge-instructions.md](judge-compare-2026-11-07/meaning-judge-instructions.md) (`single_meaning`, new) | 20/20 pass |
| Tra từ bằng AI (`lookup_word`) | Claude Haiku 5.5 | medium | starter, [lookup-writer-prompt.md](judge-compare-2026-11-07/lookup-writer-prompt.md) | "Đúng nghĩa tra", [lookup-judge-instructions.md](judge-compare-2026-11-07/lookup-judge-instructions.md) (`right_meaning`, new) | 20/20 on the key and the judge |
| Kiểm từ riêng (`check_private_word`) | Claude Haiku 5.5 | medium | starter, [private-writer-prompt.md](judge-compare-2026-11-07/private-writer-prompt.md) | none (yes/no answer, scored against a key) | 20/20 on the key |
| Dịch câu (`translate_sentence`) | none | — | — | — | no app feature calls it |

Every judge runs on **Claude Sonnet 5.5 at high effort**; the app accepts only an Anthropic model for a judge.

## Before publishing

1. **Time one real call of each max task.** No real call was timed: all tests ran as Claude Code sessions. The app stops a call after 10 s
   (Cài đặt hệ thống, `callTimeoutSeconds`), and earlier Haiku calls at default effort took up to 8.6 s. If a max call is cut off, raise the
   limit rather than the model. Needs the Anthropic key in the root `.env`.
2. **Show the two Claude models in the model list.** On the local database `claude-haiku-5-5` and `claude-sonnet-5-5` are marked hidden
   (AI → Model, "Đã ẩn").
3. **Review the test material written for these tests:** the inputs, answer keys and the three new judge texts (meaning, lookup and the
   multiple-choice one taken from plan Appendix C2) were written by Claude and have not been reviewed.

## Still open (not part of this approval)

- Whether a rare synonym (heed for attention) fails a fill-in question under the v2 judge.
- Whether to keep `single_answer` next to the session-words criterion `session_single_answer` (design §6.1 of the session synonyms work drops it).
- The 21 fill-in words no writer could make single-answer (increase/raise, revenue/income…); showing the first letter was the product option found.
- How much of the differences is chance: every set was written and judged once.
