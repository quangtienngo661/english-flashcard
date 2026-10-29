# Đợt cải thiện, nhóm B (chất lượng AI) — Design (29/10/2026)

> **Trạng thái 29/10/2026:** chủ dự án chốt mọi câu trong chat ("ok, các câu hỏi chốt hết", rồi N1–N3); bản viết này **chờ chủ dự án đọc lại**. Chưa có code, chưa
> có plan.
> **Nguồn quyết định:** câu hỏi và trả lời [`../reviews/2026-10-29-nhom-b-questions.md`](../reviews/2026-10-29-nhom-b-questions.md) (mục "Kết quả chốt"); decision
> record [`../decisions/2026-10-29-nhom-b-chat-luong-ai-decisions.md`](../decisions/2026-10-29-nhom-b-chat-luong-ai-decisions.md) (D1–D36 và các câu nhóm B
> ngày 26/10); danh sách gốc [`../../preparation/IMPROVEMENT_PLAN_2026-10-28.md`](../../preparation/IMPROVEMENT_PLAN_2026-10-28.md) §4 (B1–B11).
> **Code đọc trên:** `fix/web-next-16-4` @ `3016b1b` (`apps/api`, `apps/admin` giống `dev` sau PR #182); mọi `path:line` và mã F1–F12 ở
> [`../../preparation/NHOM_B_CODE_FACTS_2026-10-29.md`](../../preparation/NHOM_B_CODE_FACTS_2026-10-29.md).
> **Số đo B1:** [`../../preparation/b1-eval/generate_cloze-2026-10-29-error-analysis.md`](../../preparation/b1-eval/generate_cloze-2026-10-29-error-analysis.md)
> (14 ví dụ × 2 model, mẫu nhỏ, sẽ chạy lại).

Ví dụ xuyên suốt: **Lan**, người học tiếng Việt, đang luyện `rhythm` (B2, âm nhạc). Câu AI "The drummer kept a steady ___" có `beat` cũng điền vừa: lỗi chính
B1 tìm ra (E1). Bạn (chủ dự án) là `admin` duy nhất.

## 1. Mục tiêu và phạm vi

Sau đợt này, đổi prompt hay model của một thao tác AI không còn là "bấm lưu rồi hy vọng": bạn soạn nháp, chạy trên một bộ ví dụ có đề thi riêng, xem luật code và
judge chấm, so với bản đang chạy, rồi mới publish; tệ thì rollback. Và bạn thấy được câu AI thật trong 7 ngày qua tốt tới đâu, cùng người học có quay lại không.

| Khối | Việc | Quyết định |
|---|---|---|
| K1 Golden set | Ô mong đợi, dev / held-out, "Chốt phiên bản", luật code chạy trong eval, so hai lần chạy | D7–D11, D20 |
| K2 Judge | Judge là cấu hình trên UI, chỉ model Anthropic, giấu tên model; nhãn người; độ khớp; trần USD riêng cho việc của admin | D3, D12–D19 |
| K3 Vòng đời cấu hình | Prompt + model + effort + token thành một cấu hình: nháp → eval → publish (cổng cảnh báo) → rollback; chặn ví dụ mẫu lệch (T2) | D21–D25, D32 |
| K4 Câu thật | "Chấm câu AI 7 ngày qua"; "Đưa vào bộ ví dụ" | D26, D27, D34, D35 |
| K5 Dashboard | 4 phần thêm; biểu đồ tự vẽ | D28, D29 |
| K6 D7/D30 | Người học còn đang học hay đã ngừng | D6, D36 |

**Việc không cần code, làm trước hoặc song song (chủ dự án):** T1 sửa ví dụ mẫu lệch của prompt `generate_cloze` bản 3 trên trang Prompt; chạy lại B1 với mẫu lớn hơn,
thêm thử `effort` / `thinking` (T4), và chạy B1 cho 5 thao tác còn lại (D1, D2). Kết quả B1 của 5 thao tác đó quyết định judge nào thêm cho chúng, ở một lượt hỏi đáp sau.

**Không làm trong đợt này:** canary; online eval chạy theo lịch; judge trong `prepare` (mốc 3%); cảnh báo qua email; Postman (D4); `also_fits` (D33); judge cho 5 thao
tác còn lại (D1); cụm động từ (T3, D32); thư viện biểu đồ (D28); bỏ câu làm sẵn bằng bản cũ (D34).

## 2. Quyết định (tóm tắt)

Đầy đủ phương án và trade-off: decision record. Đợt này giữ luật "chủ dự án trả lời trước, Claude đề xuất sau"; câu nào chủ dự án để trống hay hỏi lại thì chốt theo
đề xuất của Claude (ghi rõ trong decision record).

| # | Chọn |
|---|---|
| D1 | Design phần không phụ thuộc B1 + judge "chỉ một đáp án" cho `generate_cloze` |
| D3 | Model sinh câu Anthropic hoặc OpenAI; judge **chỉ** Anthropic; judge không thấy tên model, nhà cung cấp, bản cấu hình, mã lần chạy; cảnh báo khi cùng Anthropic |
| D5 | Một design, nhiều plan, chạy song song nhiều phiên có phiên điều phối (§3) |
| D7, D8 | Ô mong đợi bắt buộc cho `generate_cloze`, `generate_meaning_question`, `lookup_word`, `check_private_word`; file nhập hàng loạt có ô mong đợi và dev / held-out |
| D9, D10 | "Chốt phiên bản" bằng tay; held-out 30%; xem đầu vào hoặc đầu ra của ví dụ held-out (sau hộp hỏi) thì nó sang dev |
| D11 | Eval chạy luật Practice ở lần đầu, không viết lại `#2` |
| D12–D14 | Lúc đầu một judge "chỉ một đáp án"; một lời gọi judge chấm bao nhiêu tiêu chí là do cấu hình; judge chạy khi bật ô lúc chạy eval hoặc bấm nút trên lần chạy đã xong |
| D15–D17 | 30 nhãn, 85%, khớp theo đạt / không đạt (số phụ: khớp cả mức); chưa hiệu chỉnh vẫn hiện kèm nhãn; gắn nhãn ở bảng kết quả và màn riêng; đổi judge thì điểm cũ giữ, chấm lại được |
| D18 | Trần riêng 2 USD / ngày cho test + eval + judge; không cho chạy với model chưa nhập giá; trần lời gọi của người học chỉ đếm lời gọi của người học |
| D19 | Mọi việc mới chỉ `admin` |
| D20, D21 | So hai lần chạy chỉ khi cùng phiên bản; publish cần lần eval trọn của chính cấu hình đó trên một phiên bản đã chốt (có held-out), so với lần gần nhất của bản đang chạy trên cùng phiên bản; bản đang chạy chưa có thì eval nó trước |
| D22–D24 | Một cấu hình gồm prompt + model + effort + thinking + token; một bản nháp mỗi thao tác, lưu trên server; rollback về bản publish ngay trước, không cần eval |
| D25, D34 | Câu đã làm sẵn bằng bản cũ vẫn dùng (kể cả câu giữ tới 6 tháng) |
| D26, D35 | Chấm câu AI thật 7 ngày: tối đa N = 200 mỗi lần, ước tính chi phí trước; lọc thao tác, bản cấu hình, model, chỉ tài khoản test (= tài khoản `admin` / `editor`) |
| D27 | Đưa vào bộ ví dụ từ báo lỗi đã xác nhận và từ câu judge chấm không đạt; máy điền sẵn ô mong đợi; vào dev |
| D28, D29 | Biểu đồ tự vẽ; thêm 4 phần dashboard |
| D30, D31 | Chủ dự án tự chạy lần chạy thật 5 USD; Claude làm hết, chủ dự án review |
| D33 | Giữ luật chấm của Practice |
| D36 | "Đang học" = có lần học trong N ngày gần nhất (N = 7); D7/D30 theo nhóm đăng ký cùng tuần |

**Quyết định cũ bị đổi:**
- D15 Bước 6 (lưu prompt là chạy ngay) và cách lưu cài đặt thao tác (lưu là chạy ngay): thay bằng vòng đời cấu hình (§6).
- D18 Bước 6 (eval hoàn toàn tùy chọn): publish bắt buộc có eval (26/10 câu 17).
- D24 Bước 6 (một trần lời gọi đếm mọi mục đích): trần lời gọi chỉ đếm lời gọi của người học; việc của admin có trần USD riêng (§5.5).
- 26/10 câu 19 (judge khác nhà cung cấp): judge chỉ Anthropic, có cảnh báo (D3).
- 26/10 câu 21 (held-out 20%): 30% (D10). 26/10 câu 24 (thư viện biểu đồ): tự vẽ (D28).
- Quy ước `/v1` chỉ thêm, không đổi (SR7–SR14): hai `PUT` lưu prompt và lưu thao tác bị bỏ (§6.6). Đây là API chỉ admin web gọi.

## 3. Chia plan và phiên (D5)

```
P1 Golden set ──┬──> P2 Judge ──────┬──> P4 Câu thật ──> P5 Dashboard
                └──> P3 Vòng đời ───┘                         ▲
P6 D7/D30 (độc lập, chạy sau cùng theo D32) ─────────────────┘ (chỉ thêm một khối vào trang dashboard)
```

| Plan | Khối | Phụ thuộc | File chính (để hai phiên không đụng nhau) |
|---|---|---|---|
| P1 | K1 | — | `apps/api/src/ai/eval/**`, `prisma/models/ai.prisma` (bảng eval), `src/practice/ai/eval-checks*` (mới); admin `features/ai/AiEvalPage*`, `bulk-examples.ts`, `ExampleDialog`, `EvalRunPanel` |
| P2 | K2 | P1 | `src/ai/judge/**` (mới), `src/ai/runner/{readiness,call-ledger}*`, settings `ai.*`; admin `features/ai/judges/**` (mới), phần nhãn trong `EvalRunPanel` |
| P3 | K3 | P1 | `src/ai/configs/**` (mới), `src/ai/prompts/**`, `src/ai/models/operation-settings*`, `src/ai/runner/selection.ts`; admin `features/ai/AiPromptsPage*`, `AiOperationsPage*` (gộp thành trang Cấu hình) |
| P4 | K4 | P2 | `src/practice/quality/**` (mới), `src/practice/reports/**` (nút đưa vào bộ ví dụ); admin `features/ai/real-questions/**` (mới), `features/reports/ReportDetail*` |
| P5 | K5 | P2, P3, P4 | `src/ai/reports/**`, `src/practice/reports/ai-quality*`, `src/entitlements/**` (`days_at_cap`); admin `features/dashboard/**` |
| P6 | K6 | — | `src/learning/**` (truy vấn hoạt động), endpoint mới; admin một khối mới trong `features/dashboard/` (riêng file `retention*`) |

- P2 và P3 chạy song song sau P1. Cả hai cùng thêm migration Prisma: mỗi plan một file migration riêng; phiên merge sau rebase lên `dev` và sinh lại migration nếu
  trùng thứ tự. `ai.prisma` bị hai plan sửa ở các model khác nhau.
- Mỗi plan một nhánh từ `origin/dev`, có thể nhiều PR; PR vào `dev`. Phiên điều phối giữ thứ tự merge theo sơ đồ trên.
- `src/ai/ai.module.ts`, `apps/admin/src/app/nav.ts`, `messages` của admin bị nhiều plan sửa: mỗi plan chỉ thêm dòng của mình; xung đột gộp lúc merge.

## 4. Mô hình dữ liệu

Mọi bảng mới thuộc module `ai` (`prisma/models/ai.prisma`) trừ khi ghi khác; không `@relation` ra ngoài module (D3 Bước 0).

| Bảng | Thay đổi | Plan |
|---|---|---|
| `ai_eval_examples` | thêm `split` (`dev` / `held_out`), `expected` Json?, `source` (`manual` / `import` / `report` / `real_judge`), `source_ref` Text?, `revealed_at` (lúc ví dụ held-out bị xem) | P1 |
| `ai_eval_sets` (mới) | phiên bản đã chốt: `operation`, `version` (tăng theo thao tác), `held_out_ratio`, `frozen_by`, `frozen_at`; unique `(operation, version)` | P1 |
| `ai_eval_set_items` (mới) | ảnh chụp lúc chốt: `set_id`, `example_id`, `split`, `input`, `expected` | P1 |
| `ai_eval_runs` | thêm `set_id`? (null = chạy trên bộ đang soạn, không dùng để so hay publish), `config_id`? (P3), `judge` (bật / tắt lúc tạo), giá model lúc tạo; `items` Json chuyển sang bảng | P1 (P3 thêm `config_id`) |
| `ai_eval_run_items` (mới) | `run_id`, `example_id`, `split`, ảnh chụp `input` và `expected`, `status`, `output`, `raw_output`, `rule` (kết quả luật Practice), `expected_result`, `latency_ms`, `cost_usd` | P1 |
| `ai_judges` (mới) | `name`, `operations` (thao tác được chấm), `active` | P2 |
| `ai_judge_revisions` (mới) | append-only: `judge_id`, `revision`, `criteria` Json (`[{code, question, severity_hint}]`), `instructions`, `examples`, `model_ref`, `effort`, `thinking`, `max_output_tokens`, `saved_by/at` | P2 |
| `ai_judge_scores` (mới) | `judge_revision_id`, `subject_kind` (`eval_item` / `real_question`), `subject_id`, `criterion`, `verdict` (`pass` / `fail_major` / `fail_minor`), `reason`, `call_id`, `created_at`; unique `(judge_revision_id, subject_kind, subject_id, criterion)` | P2 |
| `ai_labels` (mới) | nhãn người: `subject_kind`, `subject_id`, `criterion`, `verdict`, `labeled_by/at`; unique `(subject_kind, subject_id, criterion)` | P2 |
| `ai_configs` (mới) | `operation`, `number`, `instructions`, `examples`, `model_ref`, `effort`, `thinking`, `max_output_tokens`, `status` (`draft` / `published` / `retired`), `created_by/at`, `published_by/at`, `note`; partial unique một `draft` mỗi thao tác (D23) | P3 |
| `ai_live_configs` (mới) | con trỏ "bản đang chạy" (26/10 câu 18): `operation` PK, `config_id`, `previous_config_id`, `version` | P3 |
| `ai_config_events` (mới) | append-only: publish, rollback, ai, lúc nào, cảnh báo đã bỏ qua | P3 |
| `practice_real_judge_runs` (mới, `practice.prisma`) | `filters`, `limit`, `status`, `judged`, `cost_usd`, `started_by`, thời gian | P4 |
| `ai_calls` | `purpose` thêm `judge`; `prompt_revision` từ P3 mang số cấu hình (§6.5) | P2, P3 |
| `ai_prompts`, `ai_prompt_revisions`, `ai_operation_settings`, `ai_operation_setting_changes` | sau P3 chỉ còn để đọc lịch sử; gateway không đọc nữa | P3 |
| settings `ai.*` | thêm `admin_daily_usd_cap` (2), `judge_label_min` (30), `judge_agreement_min` (0.85), `real_judge_limit` (200), `eval_held_out_ratio` (0.3); `learning.active_window_days` (7) | P1, P2, P4, P6 |

**Vì sao chụp ảnh ví dụ lúc chốt và lúc chạy:** hiện một lần chạy chỉ giữ `example_id` và đọc đầu vào khi job chạy (F6), nên sửa ví dụ sau đó làm lần chạy cũ đổi
nghĩa. So hai lần chạy (D20) chỉ đúng khi cả hai chấm trên cùng chữ.

## 5. K1 + K2 — Eval, luật code, judge, nhãn, trần (P1, P2)

### 5.1 Bộ ví dụ (D7–D10)

- **Ô mong đợi** (`expected`), bắt buộc với 4 thao tác (D7, D8); máy kiểm trong module `ai`, không gọi AI:

| Thao tác | `expected` | Đạt khi |
|---|---|---|
| `generate_cloze` | `{"forms": [...]}`: các dạng được nhận cho ví dụ này | mọi `accepted_answers` nằm trong `forms` |
| `generate_meaning_question` | `{"forms": [...]}` | `word_in_sentence` nằm trong `forms` |
| `lookup_word` | `{"lemma", "part_of_speech"}` | khớp cả hai |
| `check_private_word` | `{"verdict"}` | khớp |

  `forms` được điền sẵn từ kho từ (mọi dạng của mục có cùng lemma và từ loại) khi tạo ví dụ; người soạn bỏ bớt dạng không muốn nhận. Ví dụ `deploy`: bỏ `deploying`
  nếu muốn câu dùng dạng gốc. Lỗi E2 ("will ___" nhận `deployed`) chỉ bắt được khi người soạn bỏ dạng đó; phần còn lại để judge.
- **Dev / held-out:** ví dụ mới vào theo tỉ lệ `eval_held_out_ratio` (30%) bằng cách chọn ngẫu nhiên lúc tạo; file nhập hàng loạt có cột `split` thì theo file (D8.2).
  Ví dụ held-out trả về API danh sách **không có** `input`, `expected`, `note`, chỉ `id`, `split`. Xem một ví dụ held-out (trang chi tiết, hoặc kết quả của nó trong
  một lần chạy) cần `reveal: true`; API khi đó chuyển nó sang `dev`, ghi `revealed_at` (D10). Admin web hiện hộp hỏi trước khi gửi.
- **Chốt phiên bản (D9):** nút "Chốt phiên bản" chụp bộ đang soạn thành `ai_eval_sets` version *n*. Bộ chốt không đổi nữa; ví dụ sửa sau đó chỉ vào bản kế tiếp.
- **Nhập hàng loạt:** admin web đọc thêm cột `expected` (JSON trong một ô CSV, hoặc field trong JSONL) và `split`; API `bulk` nhận `{input, note?, expected, split?}`.

### 5.2 Luật Practice trong eval (D11)

Luật nằm ở Practice và cần dạng từ từ Content (F5); `ai` không được import Content (R17). Cách làm (đề xuất kỹ thuật):
- `ai` khai báo một port `EvalRuleCheck` (token + interface: `check(operation, input, output) → {status: 'pass' | 'fail' | 'skipped', problems[]}`); Practice cung cấp
  implementation khi module khởi động, như cách Practice đã dùng `AiService`.
- Practice tìm mục trong kho theo `(word, part_of_speech)` của đầu vào, dựng `PracticeSense` rồi gọi đúng `checkCloze` / `checkMeaning` / `checkMcq` đang dùng cho người học.
  Không có mục khớp (ví dụ từ lóng `lit`) → `skipped`, lần chạy ghi rõ số ví dụ bị bỏ qua luật.
- Chỉ chạy lần đầu; không gọi `#2` (D11). Kết quả lưu ở `ai_eval_run_items.rule`.

### 5.3 Lần chạy và so sánh (D20)

- Tạo lần chạy: chọn bộ (một phiên bản đã chốt, hoặc bộ đang soạn), cấu hình (nháp hoặc bản đang chạy; P3), ô "Chấm bằng judge" (D14). Lần chạy trên bộ đang soạn chỉ để
  thử nhanh: không so được, không dùng cho publish.
- Mỗi ví dụ có bốn kết quả: khuôn (như hiện nay), luật, ô mong đợi, judge (nếu bật). Ví dụ held-out: kết quả từng ví dụ bị che, chỉ có số tổng, trừ khi admin mở (D10).
- **So hai lần chạy:** chỉ khi cùng `set_id` (D20). Màn so hiện tỉ lệ đạt của từng tiêu chí ở hai lần, chia dev / held-out, và danh sách ví dụ "trước đạt, nay trượt".

### 5.4 Judge (D3, D12–D17)

- **Judge là một cấu hình trên UI:** tên, thao tác được chấm, danh sách tiêu chí (mỗi tiêu chí một câu hỏi), prompt, model, effort, token. Một judge chấm mọi tiêu chí
  của nó trong **một** lời gọi; muốn tách thì tạo nhiều judge (D13). Lưu là thêm một bản (`ai_judge_revisions`); judge không phục vụ người học nên không cần vòng đời
  publish, bản mới nhất là bản dùng.
- **Một thao tác gateway mới `judge`** (định nghĩa trong code như 6 thao tác hiện có): đầu vào `{target_operation, input, output, criteria, context?}`, đầu ra
  `{results: [{code, verdict, reason}]}`, `verdict` ∈ `pass` / `fail_major` / `fail_minor`. Gateway kiểm khuôn như mọi thao tác; `context` chỉ có khi chấm câu thật (§7.1).
- **Giấu tên (D3):** dữ liệu gửi judge chỉ gồm đầu vào của ví dụ và đầu ra AI. Không có model, nhà cung cấp, số cấu hình, mã lần chạy, `operation_id`.
- **Chỉ Anthropic (D3):** lưu judge với model không phải `anthropic` (hay `fake` khi chạy thử) → 422. Màn kết quả hiện cảnh báo khi model sinh câu cũng là Anthropic.
- **Judge có sẵn (D12):** migration tạo judge "Chỉ một đáp án" cho `generate_cloze`, một tiêu chí, **chưa chọn model** (như các thao tác Bước 6, 7). Prompt khởi đầu ghi
  rõ mức (D33): `fail_major` khi từ khác điền vừa tự nhiên và là từ rất thông dụng ở level đó, hoặc là một từ khác trong danh sách đang luyện (chỉ có khi chấm câu thật);
  `fail_minor` khi chỉ từ đồng nghĩa hiếm hoặc biến thể gần (`though` cho `although`). Lý do một câu.
- **Khi nào chạy (D14):** ô bật lúc tạo lần chạy, hoặc nút "Chấm bằng judge" trên lần chạy đã xong; chọn judge nào. Chấm lại bằng bản judge mới (D17): cùng nút, điểm cũ giữ,
  mỗi điểm ghi bản judge.
- **Nhãn người (D16):** gắn ở cột cạnh đầu ra trên bảng kết quả, và ở màn "Gắn nhãn" (lần lượt từng đầu ra, phím `1` đạt / `2` nặng / `3` nhẹ). Nhãn gắn theo đầu ra,
  dùng chung cho mọi bản judge.
- **Độ khớp (D15):** với mỗi (bản judge, tiêu chí): số đầu ra có cả nhãn và điểm; khớp = cùng đạt hoặc cùng không đạt; số phụ = khớp cả mức. Đủ `judge_label_min` nhãn
  và khớp ≥ `judge_agreement_min` → "đã hiệu chỉnh"; chưa đủ → điểm vẫn hiện, gắn "chưa hiệu chỉnh".

### 5.5 Trần chi phí (D18)

- Trần lời gọi mỗi ngày (`ai.daily_provider_calls_cap`) chỉ đếm `purpose = learner` (F1 nay đếm mọi mục đích).
- Trần mới `ai.admin_daily_usd_cap` (2 USD): tổng `cost_usd` của `test`, `eval`, `judge` từ 0 giờ (giờ VN). Kiểm trước mỗi lời gọi trả tiền của các mục đích đó; chạm trần thì
  lần chạy dừng, trạng thái `failed`, `error = 'admin-usd-cap'`, ví dụ đã chấm giữ nguyên. Tạo lần chạy khi đã chạm trần → 409.
- Model chưa nhập đủ giá (`price_input` hoặc `price_output` trống) không được dùng cho test, eval, judge (409 `model-price-missing`), vì không đếm được USD. Model `fake` có
  giá 0 khi seed cho smoke.
- Giới hạn `ai.test` 20 lần / giờ giữ nguyên.

## 6. K3 — Vòng đời cấu hình (P3)

### 6.1 Một cấu hình

Cấu hình = `instructions` + `examples` (few-shot) + `model_ref` + `effort` + `thinking` + `max_output_tokens` của một thao tác, có `number` tăng dần. Gateway đọc cấu hình
mà `ai_live_configs` trỏ tới, mỗi lần gọi (như nay đọc `ai_prompts` + `ai_operation_settings`, không cache, F3).

**Chuyển dữ liệu:** migration tạo cho mỗi thao tác một cấu hình `published` từ prompt hiện tại + cài đặt hiện tại, `number` = `revision` hiện tại của prompt (để các số
`prompt_revision` cũ trong `ai_calls` và `practice_questions.ai_meta` vẫn đúng nghĩa), và trỏ `ai_live_configs` vào đó. Thao tác chưa chọn model vẫn chưa chọn model.

### 6.2 Nháp (D23)

Mỗi thao tác tối đa một nháp, lưu trên server, admin khác thấy. Tạo nháp = chép bản đang chạy. Sửa nháp có `expected_version` như hiện nay. Nháp chạy được test (≤ 5 ví dụ)
và eval; người học không bao giờ dùng nháp.

**T2 — chặn ví dụ mẫu lệch:** khi lưu nháp, mỗi ví dụ few-shot đi qua cùng luật Practice của §5.2 (ví dụ T1: đầu vào `instantaneous`, đáp án `brush` → `brush` không
phải dạng của `instantaneous` → lỗi). Lưu bị từ chối (422, liệt kê ví dụ hỏng); từ không có trong kho thì bỏ qua luật.

### 6.3 Publish (D21, 26/10 câu 17)

Publish nháp *C* của thao tác *op* khi bản đang chạy là *L*:
1. Phải có một lần chạy **xong trọn** của *C* trên một phiên bản đã chốt *S* (gồm cả held-out). Lần chạy bị hủy, dừng giữa chừng hoặc chạm trần không tính (21.3).
2. Phải có một lần chạy xong trọn của *L* trên cùng *S*; chưa có thì màn yêu cầu chạy *L* trước (21.5). Lấy lần gần nhất (21.4).
3. So *C* với *L* trên *S*: cảnh báo nếu tỉ lệ đạt của một tiêu chí (khuôn, luật, mong đợi, mỗi tiêu chí judge có trên cả hai) giảm quá 5 điểm %, hoặc có ví dụ trước đạt
   nay trượt. Cảnh báo không chặn: admin xác nhận rồi publish; cảnh báo đã bỏ qua ghi vào `ai_config_events`.
4. Publish: *C* thành `published`, *L* thành `retired`, `ai_live_configs` trỏ *C*, `previous_config_id` = *L*. Một transaction, kiểm `version` của con trỏ.

### 6.4 Rollback (D24)

Chỉ về `previous_config_id`; không cần eval (24.2). Sau rollback, `previous_config_id` trống, nên không rollback hai lần liên tiếp; muốn về xa hơn thì tạo nháp từ bản
cũ và publish lại (qua cổng).

### 6.5 Câu đã làm sẵn và số cấu hình (D25, D34)

Không đổi cách dùng lại câu làm sẵn (`unseen-questions.ts`). `ai_calls.prompt_revision` và `practice_questions.ai_meta.prompt_revision` mang `number` của cấu hình từ P3;
tên cột giữ nguyên, nghĩa ghi trong comment của schema.

### 6.6 API bị bỏ

`PUT /v1/admin/ai/prompts/:op` và `PUT /v1/admin/ai/operations/:op` bị bỏ (trả 404 sau P3), thay bằng các endpoint cấu hình (§9). Chỉ admin web gọi hai endpoint này;
admin web đổi cùng PR. Các `GET` lịch sử giữ để đọc lịch sử cũ.

## 7. K4 — Câu thật (P4)

### 7.1 Chấm câu AI 7 ngày qua (D26, D35)

- Thuộc module Practice (dữ liệu là của Practice); Practice gọi thao tác `judge` qua `AiService`.
- **Nguồn:** `practice_questions` có `source = 'ai'`, tạo trong `content_retention_days` (7) ngày, còn nội dung gốc trong `ai_call_contents` (nối qua
  `ai_meta.call_operation_id`, F7). Câu về **từ riêng** của người học không bao giờ được chấm (26/10 câu 21).
- **Lọc** (cả bốn, D26): thao tác, số cấu hình, model, "chỉ tài khoản test" = người học có `staff_role` (`admin` / `editor`, D35; Practice hỏi `IdentityService`).
- **Mỗi lần bấm:** tối đa `real_judge_limit` (200) câu, mới nhất trước, chưa được bản judge đó chấm. Trước khi chạy, màn hiện số câu và chi phí ước tính (số câu × chi phí
  trung bình mỗi lời gọi của bản judge đó trong các lần trước; chưa có lần nào thì "chưa ước tính được"). Chạy trong worker, tính vào trần USD của admin (§5.5).
- `context` gửi judge: các từ khác trong cùng phiên luyện (để D33 phân mức). Không có tên model hay số cấu hình.
- **Kết quả:** trang riêng (từng câu, điểm, lý do, nút gắn nhãn, nút "Đưa vào bộ ví dụ") và số tổng trên dashboard (§8).

### 7.2 Đưa vào bộ ví dụ (D27)

- **Nút ở:** trang chi tiết báo lỗi đã `confirmed` của câu AI; mỗi dòng "không đạt" ở §7.1. Chỉ `admin` thấy (D19; báo lỗi do cả `editor` xử lý được, F10).
- **Đầu vào:** lấy nguyên `practice_ai_requests.ai_input.data` khi còn (7 ngày); quá 7 ngày thì dựng lại từ nội dung của nghĩa (`sense_id`), khi đó phương án nhiễu và nghĩa
  khác là chọn mới, không giống hệt câu gốc (ghi rõ trên hộp thoại).
- **Ô mong đợi:** máy điền sẵn (`forms` từ kho từ), người bấm sửa. **Split:** luôn `dev`. `source` = `report` / `real_judge`, `source_ref` = mã báo lỗi hoặc mã câu.
- Câu về từ riêng: không có nút.

## 8. K5 — Dashboard (P5, D28, D29)

Thêm vào trang `/dashboard` (quyền `ai.view`, biểu đồ tự vẽ):
1. **Số ngày chạm trần**: so mỗi ngày với trần **của chính ngày đó**, đọc từ `app_setting_changes` (key `entitlements.ai_daily_cap`, F2); hiện nay so với trần hiện tại.
2. **Eval gần nhất mỗi thao tác**: lần chạy xong trọn gần nhất của bản đang chạy trên phiên bản đã chốt mới nhất; tỉ lệ đạt khuôn, luật, mong đợi, judge; dev và held-out.
3. **Điểm judge theo thao tác và số cấu hình**, từ eval và từ câu thật, kèm "đã / chưa hiệu chỉnh".
4. **Câu thật 7 ngày**: lần chấm gần nhất, tỉ lệ `pass` / `fail_major` / `fail_minor` theo thao tác.

Kèm sửa: báo cáo `ai-quality` đếm thêm báo lỗi `confirmed` (F11 nay bỏ sót).

## 9. API (tóm tắt; chi tiết ở plan)

Mọi endpoint mới cần `settings.manage` (D19), trừ phần dashboard (`ai.view`). Lỗi theo Problem Details; tạo lần chạy có `Idempotency-Key`.

| Plan | Endpoint |
|---|---|
| P1 | `POST /v1/admin/ai/eval/sets` (chốt phiên bản), `GET …/sets?operation`; `GET …/examples/:id?reveal=true`; `bulk` nhận `expected`, `split`; `POST …/runs` nhận `set_id`, `judge`; `GET …/runs/:id/items?reveal=<example_id>`; `GET …/runs/compare?a=&b=` |
| P2 | `GET/POST /v1/admin/ai/judges`, `PUT …/judges/:id` (thêm bản), `GET …/judges/:id/revisions`; `POST …/eval/runs/:id/judge`; `PUT /v1/admin/ai/labels` (một hoặc nhiều nhãn); `GET …/judges/:id/agreement` |
| P3 | `GET /v1/admin/ai/configs/:op` (đang chạy, nháp, trước đó), `POST …/:op/draft`, `PUT …/:op/draft`, `DELETE …/:op/draft`, `POST …/:op/draft/test`, `GET …/:op/publish-check`, `POST …/:op/publish`, `POST …/:op/rollback`, `GET …/:op/history` |
| P4 | `POST /v1/admin/practice/real-judge-runs` (lọc, `limit`), `GET …/real-judge-runs`, `GET …/:id/items`, `GET …/real-judge-runs/estimate`; `POST /v1/admin/ai/eval/examples/from-source` (`report_id` hoặc `question_id`) |
| P5 | mở rộng `GET /v1/admin/ai/dashboard`, `…/practice/ai-quality`, `…/entitlements/ai-usage/days` (thêm field, không đổi field cũ) |
| P6 | `GET /v1/admin/learning/retention?from&to` (`ai.view`) |

## 10. K6 — D7/D30 (P6, D36)

- **Lần học** = một dòng `learning_log` (ôn, luyện, thêm, bỏ từ). Module Learning xuất một hàm đếm theo ngày; Identity cho ngày đăng ký (`users.created_at`).
- **Đang học** (vào ngày *d*): có lần học trong `learning.active_window_days` (*N* = 7) ngày tính tới *d*. **Đã ngừng:** đã có ít nhất một lần học, nhưng *N* ngày liền gần
  nhất không có.
- **D7 / D30** của một nhóm (người đăng ký cùng tuần, tuần theo giờ VN): % người trong nhóm còn "đang học" ở ngày đăng ký + 7 / + 30. Nhóm chưa tới ngày đó thì để trống.
- **Không tính:** tài khoản `admin` / `editor` (là tài khoản test, D35); tài khoản đã xóa (không còn dữ liệu).
- **Dashboard:** số đang học và đã ngừng hôm nay; bảng nhóm theo tuần với D7, D30 và số người.

Ví dụ: Lan đăng ký 1/11, học 3/11, 5/11, 6/11 rồi nghỉ. Ngày 8/11 (D7) Lan vẫn "đang học" (lần học cuối 6/11, trong 7 ngày). Từ 13/11 Lan "đã ngừng". D30 (1/12) Lan
không còn đang học.

## 11. When → Then

| # | When | Then |
|---|---|---|
| B1 | Chốt phiên bản khi bộ đang soạn không có ví dụ held-out nào | 422: phiên bản để publish cần held-out |
| B2 | Ví dụ thiếu `expected` cho một trong 4 thao tác (tạo, sửa, nhập) | 422 theo ví dụ / số dòng |
| B3 | Admin mở ví dụ held-out không gửi `reveal: true` | 409 `held-out-hidden`; không đổi gì |
| B4 | Mở ví dụ held-out với `reveal: true` | ví dụ sang `dev`, `revealed_at` ghi; phiên bản đã chốt giữ ảnh chụp cũ, màn ghi "1 ví dụ held-out đã bị xem" |
| B5 | Sửa ví dụ đã nằm trong một phiên bản chốt | bộ đang soạn đổi; phiên bản chốt và lần chạy cũ không đổi |
| B6 | Luật Practice không tìm thấy mục `(word, part_of_speech)` trong kho | `rule = skipped`; tỉ lệ luật tính trên ví dụ không bị bỏ qua, màn ghi số bị bỏ qua |
| B7 | So hai lần chạy khác `set_id`, hoặc một lần chạy trên bộ đang soạn | 409 `eval-set-mismatch` |
| B8 | Lưu judge với model `openai` | 422 `judge-provider`; `anthropic` và `fake` được nhận |
| B9 | Judge trả `verdict` ngoài ba giá trị, hay thiếu tiêu chí | gateway coi là sai khuôn như mọi thao tác; điểm của đầu ra đó là "không chấm được", không tính vào độ khớp |
| B10 | Tiêu chí có 29 nhãn, khớp 100% | "chưa hiệu chỉnh" (chưa đủ 30) |
| B11 | Lần chạy chạm trần USD ở ví dụ 40/100 | dừng, `failed` + `admin-usd-cap`, 39 ví dụ đã chấm giữ; không dùng được cho publish |
| B12 | Trần lời gọi của người học: admin vừa chạy eval 3000 lời gọi | Lan vẫn có câu AI (chỉ lời gọi `learner` được đếm) |
| B13 | Chạy eval với model chưa nhập giá | 409 `model-price-missing` |
| B14 | Tạo nháp khi đã có nháp | 409; trả nháp hiện có |
| B15 | Hai admin cùng sửa nháp | người lưu sau nhận 409 theo `expected_version` |
| B16 | Publish khi nháp chưa có lần chạy trọn trên phiên bản chốt | 409 `eval-required` |
| B17 | Publish khi bản đang chạy chưa có lần chạy trên cùng phiên bản | 409 `baseline-required`; màn đưa nút chạy bản đang chạy |
| B18 | Publish có cảnh báo, admin không gửi `acknowledge_warnings` | 409 kèm danh sách cảnh báo; gửi lại có `acknowledge_warnings: true` thì publish |
| B19 | Rollback khi không có `previous_config_id` | 409 `no-previous` |
| B20 | Hai admin publish cùng lúc | một người thành công; người kia 409 theo `version` của con trỏ |
| B21 | Lan có câu `rhythm` làm sẵn bằng cấu hình 3, admin publish cấu hình 4 | Lan vẫn nhận câu cấu hình 3 (D34); điểm của nó tính cho cấu hình 3 |
| B22 | Chấm câu thật khi đã quá 7 ngày, nội dung gốc đã xóa | câu đó không nằm trong nguồn |
| B23 | Chấm câu thật, lọc "chỉ tài khoản test", không có tài khoản staff nào luyện | 0 câu; không gọi AI |
| B24 | Bấm "Đưa vào bộ ví dụ" trên báo lỗi 10 ngày tuổi | đầu vào dựng lại từ nội dung nghĩa; hộp thoại ghi phương án nhiễu khác câu gốc |
| B25 | Báo lỗi về từ riêng | không có nút |
| B26 | `editor` mở báo lỗi đã xác nhận | không thấy nút "Đưa vào bộ ví dụ" |
| B27 | Ngày chạm trần khi trần đổi trong ngày | dùng giá trị trần cuối ngày đó (lần đổi cuối trước 24 giờ) |
| B28 | Người đăng ký chưa từng học | không "đang học", không "đã ngừng"; vẫn tính vào mẫu số của nhóm |
| B29 | Nhóm đăng ký tuần này, chưa tới ngày +7 | D7 để trống |
| B30 | Ví dụ few-shot của nháp có đáp án không phải dạng của từ (T1) | lưu nháp 422, chỉ ví dụ hỏng |

## 12. Kiểm thử

Theo `~/.claude/rules/testing-boundaries.md`: lệnh mặc định chỉ unit và component.
- Hàm thuần có test biên: kiểm `expected` theo từng thao tác; chia held-out theo tỉ lệ; so hai lần chạy (tỉ lệ, "trước đạt nay trượt", ngưỡng 5 điểm % đúng tại cạnh);
  độ khớp và trạng thái hiệu chỉnh (29 / 30 nhãn, 84,9% / 85%); trần USD (đúng tại cạnh 2,00); cửa sổ "đang học" (ngày *N* và *N*+1); D7/D30 với nhóm chưa đủ ngày.
- Service: publish và rollback (mọi 409 ở §11), ảnh chụp phiên bản, đổi cách đếm trần lời gọi.
- Admin web: behavioural test theo role và chữ hiển thị (hộp hỏi held-out, cảnh báo publish, gắn nhãn bằng phím).
- Fake provider trả đầu ra cho thao tác `judge` để smoke chạy không cần key.

## 13. Xong khi

- CI xanh mỗi PR.
- `pnpm smoke:nhom-b` trên DB mới với model `fake`: tạo ví dụ có ô mong đợi → chốt phiên bản → chạy eval bản đang chạy và nháp, có judge → gắn nhãn → so → publish có cảnh
  báo → rollback → chạm trần USD (đặt trần thấp) → chấm câu thật của một tài khoản `editor` → đưa vào bộ ví dụ → đọc dashboard và D7/D30.
- Chủ dự án tự chạy một lần thật với key của mình, ngân sách 5 USD (D30): eval `generate_cloze` trên phiên bản chốt có held-out, judge "Chỉ một đáp án" bằng model Anthropic,
  gắn 30 nhãn, xem độ khớp.

## 14. Rủi ro và chỗ chưa kiểm

- **Số B1 nhỏ:** 14 ví dụ mỗi model; ngưỡng 85%, 30 nhãn, 2 USD, 5 điểm % đều là `ASSUMPTION`, sửa được trên UI.
- **Judge cùng họ:** Haiku sinh câu và judge cũng Anthropic; giấu tên không chặn được thiên vị theo văn phong (`ASSUMPTION`, chưa kiểm nguồn). Số đo độ khớp với nhãn của
  bạn là chỗ phát hiện.
- **Câu cũ còn lâu:** sau launch, publish để chữa lỗi nặng thì câu lỗi đã làm sẵn còn tới người học tới 6 tháng (D34).
- **Tài khoản test = staff:** tài khoản người học riêng muốn được tính phải được cấp `editor`, và khi đó vào được trang admin (D35).
- **Luật trong eval tra theo `(word, part_of_speech)`:** một từ có nhiều mục cùng từ loại (hiếm) thì gộp mọi dạng; từ ngoài kho bỏ qua luật.
- **Mục nhiều chữ** (`bus stop`): chưa kiểm câu điền từ có một hay hai chỗ trống (T3).
- **D7/D30:** tài khoản đã xóa mất `learning_log`, nhóm cũ thiếu người; mở app mà không học không được tính.
- **Bỏ hai `PUT`** là ngoại lệ của quy ước chỉ thêm (§6.6); nếu có công cụ ngoài admin web gọi chúng thì vỡ (hiện không có, theo code facts §11).
- **Ước tính chi phí chấm câu thật** dựa trên các lần trước; lần đầu không ước tính được.
- Comment cũ trong code (F12) sửa khi chạm tới file đó.

## 15. Đề xuất kỹ thuật (duyệt cùng design)

| # | Chọn | Bỏ | Vì sao |
|---|---|---|---|
| E1 | Ảnh chụp ví dụ ở phiên bản chốt và ở từng kết quả chạy; kết quả chạy thành bảng | Giữ `items` Json và đọc đầu vào lúc chạy | So hai lần chạy và nối điểm judge, nhãn cần chữ cố định (F6) |
| E2 | Port `EvalRuleCheck` do Practice cung cấp, tra kho theo `(word, part_of_speech)` | Thêm `sense_id` bắt buộc vào ví dụ; viết lại luật trong `ai` | Giữ R17; ví dụ vẫn viết bằng chữ như B1; một nơi giữ luật |
| E3 | Thao tác gateway `judge` chung + bảng `ai_judges` / `ai_judge_revisions` cho cấu hình do admin tạo | Mỗi judge một thao tác trong code | Admin thêm judge trên UI không cần deploy (26/10 câu 19, D13) |
| E4 | Judge lưu là bản mới, không publish | Cho judge cùng vòng đời cấu hình | Judge không phục vụ người học; điểm đã ghi bản judge (D17) |
| E5 | Bảng `ai_configs` + con trỏ `ai_live_configs`; số cấu hình nối tiếp số revision prompt | Thêm trạng thái vào `ai_prompts` và `ai_operation_settings` | Một cụm có một số (D22); con trỏ sẵn cho canary sau |
| E6 | Bỏ hai `PUT` cũ | Giữ chúng ghi vào nháp | Một API làm hai việc khác cũ sẽ đánh lừa |
| E7 | Trần USD kiểm trước mỗi lời gọi, chạm trần thì dừng lần chạy | Ước tính và chặn trước khi bắt đầu | Chi phí thật mỗi câu dao động; dừng giữa chừng vẫn giữ kết quả đã có |
| E8 | Chấm câu thật đặt ở Practice | Đặt ở `ai` | Dữ liệu câu, phiên, từ riêng và tài khoản là của Practice / Identity |
| E9 | D7/D30 tính lúc đọc từ `learning_log` | Bảng tổng hợp theo ngày | Đủ nhanh với số người học hiện tại (`ASSUMPTION`); thêm bảng khi chậm |
