# Đợt cải thiện, nhóm B (chất lượng AI) — Design (29/10/2026)

> **Trạng thái 29/10/2026:** chủ dự án chốt mọi câu trong chat ("ok, các câu hỏi chốt hết", rồi N1–N3). Bản này đã sửa theo review độc lập
> [`../reviews/2026-10-29-nhom-b-design-review.md`](../reviews/2026-10-29-nhom-b-design-review.md) (R1–R22; cách xử lý từng mục ở cuối file review). Bốn câu hỏi thêm sau review
> đã chốt 30/10/2026 (§0). Plan: [`../plans/2026-10-29-nhom-b.md`](../plans/2026-10-29-nhom-b.md). Chưa có code.
> **Nguồn quyết định:** câu hỏi và trả lời [`../reviews/2026-10-29-nhom-b-questions.md`](../reviews/2026-10-29-nhom-b-questions.md) (mục "Kết quả chốt"); decision
> record [`../decisions/2026-10-29-nhom-b-chat-luong-ai-decisions.md`](../decisions/2026-10-29-nhom-b-chat-luong-ai-decisions.md) (D1–D36 và các câu nhóm B
> ngày 26/10); danh sách gốc [`../../preparation/IMPROVEMENT_PLAN_2026-10-28.md`](../../preparation/IMPROVEMENT_PLAN_2026-10-28.md) §4 (B1–B11).
> **Code đọc trên:** `origin/dev` @ `9b5288f`; mọi `path:line` và mã F1–F12 ở
> [`../../preparation/NHOM_B_CODE_FACTS_2026-10-29.md`](../../preparation/NHOM_B_CODE_FACTS_2026-10-29.md); các `path:line` thêm từ review ghi ở mục R tương ứng.
> **Số đo B1:** [`../../preparation/b1-eval/generate_cloze-2026-10-29-error-analysis.md`](../../preparation/b1-eval/generate_cloze-2026-10-29-error-analysis.md)
> (14 ví dụ × 2 model, mẫu nhỏ, sẽ chạy lại).

Ví dụ xuyên suốt: **Lan**, người học tiếng Việt, đang luyện `rhythm` (B2, âm nhạc). Câu AI "The drummer kept a steady ___" có `beat` cũng điền vừa: lỗi chính
B1 tìm ra (E1). Bạn (chủ dự án) là `admin` duy nhất.

## 0. Bốn câu hỏi thêm sau review (đã chốt 30/10/2026)

Chủ dự án bảo Claude đề xuất trước cả bốn ("các câu trên bạn đề xuất đi"), rồi chốt ("ok"). Chi tiết ở decision record D37–D40.

| Câu | Bối cảnh | Chốt | Ở đâu |
|---|---|---|---|
| Q-R1 (D37) | Trên DB mới cả 6 thao tác chưa có model; cổng đòi eval bản đang chạy làm mốc, mà bản không model thì không eval được (R1) | Bản đang chạy **không có model** thì không cần mốc; nháp vẫn phải có lần eval trọn trên phiên bản chốt có held-out; không có cảnh báo so sánh | §6.3 bước 2, B29 |
| Q-R1b (D38) | Sau vòng đời cấu hình, không còn cách tắt AI của riêng một thao tác đã có model (nháp không model thì không eval được) | Cho **publish một nháp không có model mà không cần eval**; admin web hỏi xác nhận; ghi vào lịch sử; rollback bật lại | §6.3b, B48 |
| Q-R3 (D39) | Trả lời câu luyện tập không ghi `learning_log` (chỉ hai nút "Cần ôn tập" / "Đã biết" ghi), nên người chỉ luyện tập bị tính "đã ngừng" (R3) | Bảng mới `learning_activity_days` ghi "người học có học ngày đó", gồm ôn, thêm / bỏ từ và trả lời câu luyện tập | §4, §10 |
| Q1 (D40) | Design §4 đặt FK `RESTRICT` (model từng dùng không bao giờ xóa được) nhưng §6.1 chỉ liệt kê bốn chỗ chặn (plan review P12) | Giữ chặn xóa (`RESTRICT`); model không muốn thấy thì đánh dấu `retired` (cột `lifecycle` đã có); ô chọn model ẩn model `retired` | §6.1, B49, B50 |

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
tác còn lại (D1), gồm tiêu chí "trỏ đúng nghĩa" của `generate_meaning_question` (D7, code không kiểm được, chờ judge sau B1 của thao tác đó); cụm động từ (T3, D32); thư
viện biểu đồ (D28); bỏ câu làm sẵn bằng bản cũ (D34).

## 2. Quyết định (tóm tắt)

Đầy đủ phương án và trade-off: decision record. Đợt này giữ luật "chủ dự án trả lời trước, Claude đề xuất sau"; câu nào chủ dự án để trống hay hỏi lại thì chốt theo
đề xuất của Claude (ghi rõ trong decision record).

| # | Chọn |
|---|---|
| D1 | Design phần không phụ thuộc B1 + judge "chỉ một đáp án" cho `generate_cloze` |
| D3 | Model sinh câu Anthropic hoặc OpenAI; judge **chỉ** Anthropic; judge không thấy tên model, nhà cung cấp, bản cấu hình, mã lần chạy; cảnh báo khi cùng Anthropic; hiệu chỉnh đầu so hai judge Anthropic |
| D5 | Câu 5: một design, nhiều plan, nhiều phiên; **đổi 29/10/2026 (chủ dự án): một plan, làm tuần tự** (§3, E12) |
| D7, D8 | Ô mong đợi bắt buộc cho `generate_cloze`, `generate_meaning_question`, `lookup_word`, `check_private_word`; file nhập hàng loạt có ô mong đợi và dev / held-out |
| D9, D10 | "Chốt phiên bản" bằng tay; held-out 30%; xem đầu vào hoặc đầu ra của ví dụ held-out (sau hộp hỏi) thì nó sang dev |
| D11 | Eval chạy luật Practice ở lần đầu, không viết lại `#2` |
| D12–D14 | Lúc đầu một judge "chỉ một đáp án"; một lời gọi judge chấm bao nhiêu tiêu chí là do cấu hình; judge chạy khi bật ô lúc chạy eval hoặc bấm nút trên lần chạy đã xong |
| D15–D17 | 30 nhãn, 85%, khớp theo đạt / không đạt (số phụ: khớp cả mức); chưa hiệu chỉnh vẫn hiện kèm nhãn; gắn nhãn ở bảng kết quả và màn riêng; đổi judge thì điểm cũ giữ, chấm lại được, biểu đồ đánh dấu chỗ đổi |
| D18 | Trần riêng 2 USD / ngày cho test + eval + judge; không cho chạy eval với model chưa nhập giá; trần lời gọi của người học chỉ đếm lời gọi của người học |
| D19 | Mọi việc mới chỉ `admin` |
| D20, D21 | So hai lần chạy chỉ khi cùng phiên bản; publish cần lần eval trọn của chính cấu hình đó trên một phiên bản đã chốt (có held-out), so với lần gần nhất của bản đang chạy trên cùng phiên bản; bản đang chạy chưa có thì eval nó trước; bản đang chạy không có model thì không cần mốc (D37); tắt một thao tác không cần eval (D38) |
| D22–D24 | Một cấu hình gồm prompt + model + effort + thinking + token; một bản nháp mỗi thao tác, lưu trên server; rollback về bản publish ngay trước, không cần eval |
| D25, D34 | Câu đã làm sẵn bằng bản cũ vẫn dùng (kể cả câu giữ tới 6 tháng) |
| D26, D35 | Chấm câu AI thật 7 ngày: tối đa N = 200 mỗi lần, ước tính chi phí trước; lọc thao tác, bản cấu hình, model, chỉ tài khoản test (= tài khoản `admin` / `editor`) |
| D27 | Đưa vào bộ ví dụ từ báo lỗi đã xác nhận và từ câu judge chấm không đạt; máy điền sẵn ô mong đợi; vào dev |
| D28, D29 | Biểu đồ tự vẽ; thêm 4 phần dashboard |
| D30, D31 | Chủ dự án tự chạy lần chạy thật 5 USD; Claude làm hết, chủ dự án review |
| D33 | Giữ luật chấm của Practice |
| D36, D39 | "Đang học" = có lần học trong N ngày gần nhất (N = 7); D7/D30 theo nhóm đăng ký cùng tuần; lần học ghi ở bảng `learning_activity_days` (gồm câu luyện tập) |
| D40 | Model từng dùng không xóa được; ẩn bằng `retired` |

**Quyết định cũ bị đổi:**
- D15 Bước 6 (lưu prompt là chạy ngay) và cách lưu cài đặt thao tác (lưu là chạy ngay): thay bằng vòng đời cấu hình (§6).
- D18 Bước 6 (eval hoàn toàn tùy chọn): publish bắt buộc có eval (26/10 câu 17).
- D24 Bước 6 (một trần lời gọi đếm mọi mục đích): trần lời gọi chỉ đếm lời gọi của người học; việc của admin có trần USD riêng (§5.5).
- 26/10 câu 19 (judge khác nhà cung cấp): judge chỉ Anthropic, có cảnh báo (D3).
- 26/10 câu 21 (held-out 20%): 30% (D10). 26/10 câu 24 (thư viện biểu đồ): tự vẽ (D28).
- Quy ước `/v1` chỉ thêm, không đổi (SR7–SR14): hai `PUT` lưu prompt và lưu thao tác bị bỏ (§6.6); các script và test trong repo gọi chúng được sửa cùng PR.

## 3. Chia plan và phiên (D5)

Review (R9) cho thấy K2 và K3 cùng sửa phần lõi của `ai` (`runner.service.ts`, `eval-runs.service.ts`, `eval-job.ts`, `selection.ts`, `readiness.service.ts`,
`reports.service.ts`, `ai-api.ts`, màn eval), nên không chạy song song được mà không đụng nhau. **Chủ dự án chốt (29/10/2026): gộp thành một plan, làm tuần tự** theo
milestone (E12). Plan: [`../plans/2026-10-29-nhom-b.md`](../plans/2026-10-29-nhom-b.md).

```
M1 Golden set (P1) ──> M2 Vòng đời (P3) ──> M3 Judge (P2) ──> M4 Câu thật (P4) ──> M5 Dashboard (P5) ──> M6 D7/D30 (P6)
```

Tên P1–P6 dưới đây giữ để dẫn chiếu; thứ tự làm là M1–M6.

| Plan | Khối | Sau | File chính |
|---|---|---|---|
| P1 | K1 | — | `apps/api/src/ai/eval/**`, `src/ai/ai.service.ts` (đăng ký port), `prisma/models/ai.prisma` (bảng eval), `src/practice/eval-rules/**` (mới), `src/content/**` (tra mục kho theo `(lemma, pos)`), `src/ai/reports/reports.service.ts` (che held-out ở trang Các lần gọi), `src/ai/prompts/prompts.service.ts` (chạy thử chỉ lấy ví dụ dev); admin `features/ai/AiEvalPage*`, `bulk-examples.ts`, `ExampleDialog`, `EvalRunPanel`, `AiCallsPage` |
| P3 | K3 | P1 | `src/ai/configs/**` (mới), `src/ai/prompts/**`, `src/ai/models/**`, `src/ai/runner/{selection,runner.service}.ts`, `src/ai/eval/**` (lần chạy theo cấu hình), `src/ai/reports/**` (Tình trạng đọc cấu hình); `scripts/smoke-buoc-6.mjs`, `scripts/smoke-buoc-7.mjs`, `scripts/learner-test-setup.mjs`; admin `features/ai/AiPromptsPage*`, `AiOperationsPage*` (gộp thành trang Cấu hình), `apps/admin/e2e-real/support/ai-report.ts` |
| P2 | K2 | P3 | `src/ai/judge/**` (mới), `src/ai/operations/judge.ts` (mới), `src/ai/runner/{readiness,call-ledger,runner.service}.ts`, `src/ai/eval/**` (lượt chấm), `src/ai/configs/publish-check*` (thêm so tiêu chí judge), `src/ai/models/models.service.ts` (giá `fake` khi bật fake); admin `features/ai/judges/**` (mới), nhãn trong `EvalRunPanel` |
| P4 | K4 | P2 | `src/practice/quality/**` (mới), `src/practice/reports/**` (nút đưa vào bộ ví dụ), `src/identity/**` (`staffUserIds`), `src/ai/judge/**` (lượt chấm câu thật); admin `features/ai/real-questions/**` (mới), `features/reports/ReportDetail*` |
| P5 | K5 | P4 | `src/ai/reports/**`, `src/practice/reports/ai-quality*`, `src/entitlements/**` (`days_at_cap`), `src/settings/**` (đọc lịch sử một setting); admin `features/dashboard/**` (trừ file `retention*`) |
| P6 | K6 | P5 | `src/learning/**` (bảng `learning_activity_days`, ghi và đếm), `src/practice/answers/**` (gọi Learning ghi lần học khi trả lời), `src/identity/**` (`registrations`, danh sách xóa tài khoản); admin `features/dashboard/retention*` (mới) |

- Mỗi milestone một nhánh từ `origin/dev` sau khi milestone trước đã merge, có thể nhiều PR; PR vào `dev`.
- Làm tuần tự nên migration Prisma không trùng thứ tự, và các file nhiều milestone cùng thêm dòng (`src/settings/settings.definitions.ts`, trang Cài đặt, `ai.module.ts`,
  `apps/admin/src/app/nav.ts`, `messages` của admin) không xung đột.

## 4. Mô hình dữ liệu

Mọi bảng mới thuộc module `ai` (`prisma/models/ai.prisma`) trừ khi ghi khác; không `@relation` ra ngoài module (D3 Bước 0). FK chỉ trong module.

| Bảng | Thay đổi | Plan |
|---|---|---|
| `ai_eval_examples` | thêm `split` (`dev` / `held_out`), `expected` Json?, `source` (`manual` / `import` / `report` / `real_judge`), `source_ref` Text?, `revealed_at` | P1 |
| `ai_eval_sets` (mới) | phiên bản đã chốt: `operation`, `version` (tăng theo thao tác), `held_out_ratio`, `frozen_by`, `frozen_at`; unique `(operation, version)` | P1 |
| `ai_eval_set_items` (mới) | ảnh chụp lúc chốt: `set_id`, `example_id`, `split`, `input`, `expected` | P1 |
| `ai_eval_runs` | thêm `set_id`? (null = bộ đang soạn); `price_input`, `price_output` lúc tạo; `items` Json chuyển sang bảng. P3 thêm `config_id`, `config_version` (thay `prompt_revision` / `draft`) | P1, P3 |
| `ai_eval_run_items` (mới) | `run_id`, `example_id`, `split`, ảnh chụp `input` và `expected`, `status`, `reason`, `output`, `raw_output`, `rule` (`pass` / `fail` / `skipped` / `not_applicable` + vấn đề), `expected_result`, `latency_ms`, `cost_usd` | P1 |
| `ai_configs` (mới) | `operation`, `number`, `version` (tăng mỗi lần sửa nháp), `instructions`, `examples`, `model_ref` (FK `ai_models` RESTRICT), `effort`, `thinking`, `max_output_tokens`, `status` (`draft` / `published` / `retired`), `created_from` (cấu hình gốc), `created_by/at`, `published_by/at`, `note`; partial unique một `draft` mỗi thao tác | P3 |
| `ai_live_configs` (mới) | con trỏ "bản đang chạy" (26/10 câu 18): `operation` PK, `config_id`, `previous_config_id`?, `version` | P3 |
| `ai_config_events` (mới) | append-only: `publish` / `rollback`, ai, lúc nào, id hai lần chạy dùng làm bằng chứng, cảnh báo đã bỏ qua | P3 |
| `ai_judges` (mới) | `name`, `operations`, `active` | P2 |
| `ai_judge_revisions` (mới) | append-only: `judge_id`, `revision`, `criteria` Json (`[{code, question}]`), `instructions`, `examples`, `model_ref` (FK RESTRICT), `effort`, `thinking`, `max_output_tokens`, `saved_by/at` | P2 |
| `ai_judge_passes` (mới) | một lượt chấm: `judge_revision_id`, `kind` (`eval_run` / `real`), `eval_run_id`?, `filters` Json? (câu thật), `limit`?, `status` (`queued` / `running` / `finished` / `failed`), `error`, `total`, `judged`, `cost_usd`, `started_by`, thời gian, `heartbeat_at` | P2 (P4 thêm `real`) |
| `ai_judge_pass_items` (mới) | ảnh chụp đối tượng chấm: `pass_id`, `subject_kind` (`eval_item` / `real_question`), `subject_id`, `input`, `output`, `context`? | P2 |
| `ai_judge_scores` (mới) | `judge_revision_id`, `subject_kind`, `subject_id`, `criterion`, `verdict` (`pass` / `fail_major` / `fail_minor`, NULL = không chấm được), `problem`?, `reason`, `pass_id`, `call_id`, `created_at`; unique `(judge_revision_id, subject_kind, subject_id, criterion)` | P2 |
| `ai_labels` (mới) | nhãn người: `subject_kind`, `subject_id`, `criterion`, `verdict`, `labeled_by/at`; unique `(subject_kind, subject_id, criterion)` | P2 |
| `ai_calls` | `purpose` thêm `judge` (CHECK `ai_calls_purpose_check`); `prompt_revision` từ P3 mang số cấu hình (§6.5) | P2, P3 |
| `ai_prompts`, `ai_prompt_revisions`, `ai_operation_settings`, `ai_operation_setting_changes` | sau P3 chỉ còn để đọc lịch sử; gateway không đọc; FK `ai_operation_settings.model_ref` bỏ trong migration P3 (để model cũ xóa được) | P3 |
| `learning_activity_days` (mới, `learning.prisma`) | `user_id`, `local_date`; PK `(user_id, local_date)`; ghi kiểu upsert; xóa khi xóa tài khoản (D39) | P6 |
| settings `ai.*` | thêm `admin_daily_usd_cap` (2), `eval_held_out_ratio` (0,3), `judge_label_min` (30), `judge_agreement_min` (0,85), `real_judge_limit` (200); `learning.active_window_days` (7) | P1, P2, P4, P6 |

**Vì sao chụp ảnh:** hiện một lần chạy chỉ giữ `example_id` và đọc đầu vào khi job chạy (F6), nên sửa ví dụ sau đó làm lần chạy cũ đổi nghĩa. So hai lần chạy (D20) và nối
điểm judge, nhãn người cần chữ cố định. Lượt chấm câu thật chụp đầu vào lúc bắt đầu, nên nội dung hết hạn 7 ngày giữa chừng cũng không sao.

**Dữ liệu có sẵn khi P1 migrate (R14):** mọi ví dụ đang có (14 ví dụ B1 đã bị đọc) thành `split = 'dev'`, `source = 'manual'`, `expected` NULL; "Chốt phiên bản" trả 422 liệt
kê ví dụ thiếu `expected`. Kết quả của các lần chạy cũ chuyển sang `ai_eval_run_items` với `input` lấy từ ví dụ nếu còn, không thì NULL; các lần chạy cũ có `set_id` NULL nên
không so được, màn ghi "trước khi có phiên bản".

## 5. K1 + K2 — Eval, luật code, judge, nhãn, trần (P1, P2)

### 5.1 Bộ ví dụ (D7–D10)

- **Ô mong đợi** (`expected`), bắt buộc với 4 thao tác (D7, D8):

| Thao tác | `expected` | Đạt khi | Ai kiểm |
|---|---|---|---|
| `generate_cloze` | `{"forms": [...]}`: các dạng được nhận cho ví dụ này | mọi `accepted_answers` (đã chuẩn hóa) nằm trong `forms` | port Practice (§5.2) |
| `generate_meaning_question` | `{"forms": [...]}` | `word_in_sentence` nằm trong `forms` | port Practice |
| `lookup_word` | `{"lemma", "part_of_speech"}` | khớp cả hai (bỏ khoảng trắng hai đầu, chữ thường) | `ai` |
| `check_private_word` | `{"verdict"}` | khớp | `ai` |

  `forms` được điền sẵn khi tạo ví dụ, bằng hàm `formsOf(word, part_of_speech)` của port (mọi dạng của mục kho có cùng lemma và từ loại); người soạn bỏ bớt dạng không muốn
  nhận (ví dụ bỏ `deploying` nếu muốn câu dùng dạng gốc). Lỗi E2 ("will ___" nhận `deployed`) chỉ bắt được khi người soạn bỏ dạng đó; phần còn lại để judge. Tiêu chí "trỏ
  đúng nghĩa" của `generate_meaning_question` (D7) code không kiểm được: chờ judge sau B1 của thao tác đó (§1).
- **Dev / held-out (D10, R21):** ví dụ mới vào `held_out` khi tỉ lệ held-out của bộ đang soạn đang **dưới** `eval_held_out_ratio` (30%), ngược lại vào `dev`; nhập hàng loạt
  không có cột `split` thì áp luật này lần lượt từng dòng; có cột thì theo file (D8.2). Không có thao tác chuyển một ví dụ `dev` sang `held_out`.
- **Che held-out (R7).** Đầu vào, đầu ra, `expected`, `note`, lý do judge của ví dụ held-out không hiện ở bất cứ đâu khi chưa mở:
  - danh sách ví dụ: chỉ `id`, `split`;
  - kết quả lần chạy, màn so sánh, cảnh báo publish: chỉ số tổng của phần held-out, không liệt kê ví dụ;
  - trang **Các lần gọi**: lời gọi eval / judge của ví dụ held-out trả `content: null` kèm nhãn "held-out";
  - **chạy thử** (≤ 5 ví dụ): chỉ lấy ví dụ `dev`;
  - màn **Gắn nhãn**: bỏ qua ví dụ held-out.
- **Mở ví dụ held-out:** `POST …/examples/:id/reveal` (admin web hiện hộp hỏi trước). Ví dụ sang `dev`, ghi `revealed_at`; phiên bản đã chốt giữ ảnh chụp cũ, màn của phiên
  bản ghi "1 ví dụ held-out đã bị xem". Ví dụ đã xóa khỏi bộ đang soạn mà còn trong phiên bản chốt: mở được ảnh chụp, ghi `revealed_at` lên dòng `ai_eval_set_items`.
- **Chốt phiên bản (D9):** chụp bộ đang soạn thành `ai_eval_sets` version *n*. Bộ chốt không đổi nữa. 422 nếu thiếu `expected` (4 thao tác) hoặc không có ví dụ held-out nào.
- **Nhập hàng loạt:** admin web đọc thêm cột `expected` (JSON trong một ô CSV, hoặc field trong JSONL) và `split`; API `bulk` nhận `{input, note?, expected, split?}`.

### 5.2 Luật Practice trong eval (D11)

Luật nằm ở Practice và cần dạng từ từ Content (F5); `ai` không được import Content hay Practice (R17 Bước 6), và Practice, Content đều import `AiModule` (vòng nếu `ai` inject
provider của Practice). Cách làm (E2, R17):
- `AiService` có hàm `registerEvalRules(rules)`; Practice gọi nó trong `onModuleInit` của một provider (tiền lệ: `ContentService.registerEntryUsageProbe` và
  `PracticeEntryUsageProbe.onModuleInit`). Worker dựng cả `AppModule`, và Worker eval chỉ bắt đầu ở `onApplicationBootstrap`, sau mọi `onModuleInit`.
- Port gồm: `check(operation, input, output)` → `pass` / `fail` (+ vấn đề) / `skipped` (+ lý do); `formsOf(word, part_of_speech)` → danh sách dạng hoặc `null`;
  `matchesExpected(operation, output, expected)` (chuẩn hóa bằng `normalizeAnswer` của Practice, để `ai` không tự chuẩn hóa).
- Practice tìm mục **trong kho** (không xét từ riêng của ai) qua một hàm mới của Content tra theo `(lemma, pos)`; `part_of_speech = "unspecified"` thì gộp mọi mục cùng lemma.
  Dựng `PracticeSense` rồi gọi đúng `checkCloze` / `checkMeaning` / `checkMcq` đang dùng cho người học.
- Không có mục khớp (ví dụ từ lóng `lit`) → `skipped` (`not-in-catalog`). Port chưa đăng ký (unit test của `ai`) → `skipped` (`no-rules`). Thao tác không có luật Practice
  (`lookup_word`, `translate_sentence`, `check_private_word`) → `not_applicable`.
- Chỉ chạy lần đầu; không gọi `#2` (D11).

### 5.3 Lần chạy và so sánh (D20)

- Tạo lần chạy: chọn bộ (một phiên bản đã chốt, hoặc bộ đang soạn), cấu hình (P1: bản đang chạy hoặc prompt nháp như hiện nay; từ P3: nháp hoặc bản đang chạy, ghi
  `config_id` + `config_version`), ô "Chấm bằng judge" (D14, từ P2). Lần chạy trên bộ đang soạn chỉ để thử nhanh: không so được, không dùng cho publish.
- Mỗi ví dụ có bốn kết quả: khuôn (như hiện nay), luật, ô mong đợi, judge (nếu có lượt chấm).
- **Xong trọn (R11):** lần chạy `finished` và mọi ví dụ có kết quả khuôn (không `skipped`). Ví dụ lỗi tạm thời (timeout, nhà cung cấp lỗi) tính là **không đạt** khuôn, màn ghi số.
  Lần chạy bị hủy, `stalled` hay chạm trần là `failed`, không trọn.
- **So hai lần chạy:** chỉ khi cùng `set_id` (D20). Màn so hiện tỉ lệ đạt của khuôn, luật, mong đợi ở hai lần, chia dev / held-out, và danh sách ví dụ **dev** "trước đạt, nay
  trượt" (held-out chỉ số). Tiêu chí judge chỉ so khi cả hai lần chạy có điểm của **cùng** một bản judge; không thì màn đưa nút "chấm cả hai bằng bản judge X".
- Lần chạy đã dùng làm bằng chứng publish (§6.3) không xóa được (409).

### 5.4 Judge (D3, D12–D17)

- **Judge là một cấu hình trên UI:** tên, thao tác được chấm, danh sách tiêu chí (mỗi tiêu chí một câu hỏi có `code`), prompt, model, effort, token. Một judge chấm mọi tiêu chí
  của nó trong **một** lời gọi; muốn tách thì tạo nhiều judge (D13). Lưu là thêm một bản (`ai_judge_revisions`); judge không phục vụ người học nên không có vòng đời publish,
  bản mới nhất là bản dùng (E4). Nút "Nhân bản judge" tạo judge mới cùng tiêu chí, để so hai model judge trên cùng bộ nhãn (D3: hiệu chỉnh đầu so hai judge Anthropic).
- **Thao tác gateway `judge` (E3, R5).** Kiểu `GatewayOperation` = 6 thao tác + `judge`, dùng cho runner và sổ chi phí (`ai_calls.operation` không có CHECK); kiểu
  `AiOperation` giữ 6 thao tác cho cấu hình, bộ ví dụ, trang Tình trạng. `judge` không có cấu hình thao tác, không có bộ ví dụ, không hiện ở trang Tình trạng.
  - Đầu vào: `{target_operation, input, output, criteria: [{code, question}], context?}`.
  - Đầu ra: ba mảng chuỗi cùng độ dài `{codes, verdicts, reasons}`, vừa khung `define-operation` (chỉ nhận chuỗi và mảng chuỗi). Gateway kiểm: ba mảng cùng độ dài,
    `verdicts` ∈ `pass` / `fail_major` / `fail_minor`. Dịch vụ judge kiểm thêm, vì nó biết tiêu chí đã gửi: mỗi `code` gửi đi có đúng một kết quả; thiếu hay thừa thì tiêu
    chí đó "không chấm được" (`verdict` NULL, `problem`).
- **Giấu tên (D3):** dữ liệu gửi judge chỉ gồm đầu vào, đầu ra, tiêu chí và `context` (câu thật). Không có model, nhà cung cấp, số cấu hình, mã lần chạy, `operation_id`.
- **Chỉ Anthropic (D3):** lưu judge với model không phải `anthropic` → 422; `fake` được nhận khi `AI_FAKE_ENABLED=true` (E13). Màn kết quả cảnh báo khi model sinh câu cũng Anthropic.
- **Judge có sẵn (D12):** migration tạo judge "Chỉ một đáp án" cho `generate_cloze`, một tiêu chí, **chưa chọn model**. Prompt khởi đầu ghi rõ mức (D33): `fail_major` khi từ
  khác điền vừa tự nhiên và là từ rất thông dụng ở level đó, hoặc là một từ khác trong danh sách đang luyện (chỉ có khi chấm câu thật); `fail_minor` khi chỉ từ đồng nghĩa hiếm
  hoặc biến thể gần (`though` cho `although`). Lý do một câu.
- **Lượt chấm (D14, D17):** ô bật lúc tạo lần chạy, hoặc nút "Chấm bằng judge" trên lần chạy đã xong; chọn judge. Mỗi lần là một `ai_judge_passes`, chạy trong worker `ai-eval`.
  Trạng thái lượt chấm tách khỏi trạng thái lần chạy: lượt chấm hỏng hay chạm trần không làm lần chạy `failed`. Bấm lại với cùng bản judge chỉ chấm đầu ra chưa có điểm hoặc
  "không chấm được" (không trả tiền hai lần). Chấm bằng bản judge mới: điểm cũ giữ, mỗi điểm ghi bản judge. Mỗi bản judge một lượt chạy mỗi lúc (409 nếu đang có).
- **Nhãn người (D16):** cột cạnh đầu ra trên bảng kết quả (chỉ ví dụ dev), và màn "Gắn nhãn" (lần lượt từng đầu ra dev hoặc câu thật, phím `1` đạt / `2` nặng / `3` nhẹ). Nhãn
  gắn theo đầu ra, dùng chung cho mọi bản judge; xóa lần chạy không xóa nhãn (nhãn nằm trên `ai_eval_run_items` được giữ; lần chạy có nhãn thì "xóa" chỉ ẩn).
- **Độ khớp (D15):** với mỗi (bản judge, tiêu chí): đầu ra có cả nhãn và điểm (bỏ "không chấm được"); khớp = cùng đạt hoặc cùng không đạt; số phụ = khớp cả mức. Đủ
  `judge_label_min` nhãn và khớp ≥ `judge_agreement_min` → "đã hiệu chỉnh"; chưa đủ → điểm vẫn hiện, gắn "chưa hiệu chỉnh".

### 5.5 Trần chi phí (D18, R10)

- Trần lời gọi mỗi ngày (`ai.daily_provider_calls_cap`) chỉ đếm `purpose = learner` (nay đếm mọi mục đích, F1). Số "lời gọi hôm nay" trên trang Tình trạng và dashboard đổi
  theo: hiện lời gọi của người học so với trần, và USD của admin hôm nay so với trần USD.
- Trần mới `ai.admin_daily_usd_cap` (2 USD; `null` = không trần, `0` = chặn hết): tổng `cost_usd` của `test`, `eval`, `judge` từ 0 giờ (giờ VN). Chặn khi **đã tiêu ≥ trần**.
  Kiểm trước **mỗi** lần gửi tới nhà cung cấp, kể cả lần thử lại thứ hai trong cùng lời gọi. Đây là trần mềm: các lời gọi đang chạy song song (tối đa `EVAL_JOB_CONCURRENCY`
  = 3 mỗi job, cộng chạy thử ở process API) chưa có dòng `ai_calls`, nên có thể vượt tối đa khoảng (số lời gọi đang bay) × (giá một lời gọi).
- Chạm trần giữa chừng: lần chạy (hay lượt chấm) dừng, `failed`, `error = 'admin-usd-cap'`, kết quả đã có giữ nguyên. Tạo lần chạy / lượt chấm / chạy thử khi đã chạm trần → 409.
- Model chưa nhập đủ giá (`price_input` hoặc `price_output` trống) không được dùng cho test, eval, judge (409 `model-price-missing`; chặn cả test là E14). Model `fake` có giá 0;
  khi `AI_FAKE_ENABLED=true`, model `fake` được nhập giá để smoke chạm được trần (E15).
- Giới hạn `ai.test` 20 lần / giờ giữ nguyên.

## 6. K3 — Vòng đời cấu hình (P3)

### 6.1 Một cấu hình

Cấu hình = `instructions` + `examples` (few-shot) + `model_ref` + `effort` + `thinking` + `max_output_tokens` của một thao tác, có `number` (tăng theo thao tác khi tạo nháp)
và `version` (tăng mỗi lần sửa nháp). Gateway đọc cấu hình mà `ai_live_configs` trỏ tới, mỗi lần gọi, không cache (như nay, F3).

**Chuyển dữ liệu:** migration tạo cho mỗi thao tác một cấu hình `published` từ prompt hiện tại + cài đặt hiện tại, `number` = `revision` hiện tại của prompt, và trỏ
`ai_live_configs` vào đó. Thao tác chưa chọn model vẫn chưa chọn model (lần chọn đầu theo D37). Trước P3, prompt và model đổi riêng (ở B1, prompt bản 3 chạy cả Haiku lẫn Sonnet), nên mọi
màn nhóm số liệu theo **cặp (số cấu hình, model)**, không theo số cấu hình một mình (R12).

**Model và cấu hình (R12, D40):** `ai_configs.model_ref` và `ai_judge_revisions.model_ref` có FK `RESTRICT`: model đã từng nằm trong **bất kỳ** cấu hình (kể cả `retired`)
hay bản judge nào thì không xóa được (409 `model-in-use`). Model không muốn thấy nữa thì đánh dấu `lifecycle = 'retired'`; ô chọn model ở trang Cấu hình và trang Judge ẩn
model `retired`, trừ model đang được chọn ở chính nháp / judge đó (hiện nay không ô nào lọc `retired`). Bỏ giá của model đang nằm trong nháp hay bản đang chạy: 409.

### 6.2 Nháp (D23)

- Mỗi thao tác tối đa một nháp, lưu trên server, admin khác thấy. `POST …/:op/draft` nhận `from_config_id` (mặc định bản đang chạy; cho phép một bản `retired` cũ, R13).
- Sửa nháp gửi `expected_version`; sai thì 409. Mỗi lần sửa tăng `version`, nên mọi lần chạy cũ của nháp hết dùng được cho publish (R2).
- Nháp chạy được test (≤ 5 ví dụ dev) và eval; người học không bao giờ dùng nháp.
- Xóa nháp khi nó có lần chạy `queued` / `running`: 409 (hủy lần chạy trước).
- **T2 — chặn ví dụ mẫu lệch:** khi **lưu** nháp (không phải lúc tạo), mỗi ví dụ few-shot đi qua `check` của port (§5.2). Ví dụ T1: đầu vào `instantaneous`, đáp án `brush` →
  `brush` không phải dạng của `instantaneous` → 422, chỉ ví dụ hỏng. Từ ngoài kho thì bỏ qua. Bản đang chạy có ví dụ hỏng (T1 chưa sửa) vẫn tạo nháp được; lưu thì bị chặn
  tới khi sửa.

### 6.3 Publish (D21, 26/10 câu 17)

Publish nháp *C* (`version` *v*) của thao tác *op* khi bản đang chạy là *L*:
1. *S* = phiên bản chốt **mới nhất** có held-out của *op* (R11). Phải có một lần chạy **xong trọn** (§5.3) của *C* trên *S* với `config_version` = *v*.
2. Phải có một lần chạy xong trọn của *L* trên *S*; chưa có thì `publish-check` báo `baseline-required` và màn đưa nút chạy *L* (21.5). Lấy lần gần nhất (21.4).
   *L* chưa có model (D37): không cần mốc; không có cảnh báo so sánh; bước 1 vẫn bắt buộc.
3. So *C* với *L* trên *S* (§5.3): cảnh báo nếu tỉ lệ đạt của một tiêu chí (khuôn, luật, mong đợi; tiêu chí judge chỉ khi cả hai có điểm của cùng bản judge) giảm quá 5 điểm
   %, hoặc có ví dụ dev trước đạt nay trượt, hoặc số ví dụ held-out trượt tăng. Cảnh báo không chặn.
4. Request `publish` gửi `expected_version` (*v*), `candidate_run_id`, `baseline_run_id` (đúng hai lần chạy `publish-check` đã dùng) và `acknowledge_warnings` khi có cảnh báo.
   Lệch bất kỳ cái nào → 409, màn tải lại `publish-check`.
5. Một transaction, kiểm `version` của con trỏ: *C* → `published`, *L* → `retired`, `ai_live_configs.config_id` = *C*, `previous_config_id` = *L*; ghi `ai_config_events` (id hai
   lần chạy, cảnh báo đã bỏ qua). Không còn nháp sau publish.

### 6.3b Tắt một thao tác (D38)

Nháp có `model_ref` NULL được publish **không cần** lần eval nào (bỏ bước 1–3 của §6.3); vẫn gửi `expected_version` và kiểm `version` của con trỏ (bước 4–5). Admin web hỏi
"Tắt AI của thao tác này? Người học sẽ nhận câu không AI." trước khi gửi. Ghi `ai_config_events` như mọi publish; rollback về bản trước để bật lại. Người học nhận câu không AI
như khi AI lỗi (luật dự phòng hiện có của Practice; tra từ AI báo không có).

### 6.4 Rollback (D24)

Chỉ về `previous_config_id`; không cần eval (24.2). Một transaction: bản đang chạy → `retired`, bản trước → `published`, con trỏ trỏ bản trước, `previous_config_id` = NULL; nháp
đang có giữ nguyên; ghi `ai_config_events`. Không rollback hai lần liên tiếp (409 `no-previous`). Muốn về xa hơn: tạo nháp `from_config_id` = bản cũ rồi publish qua cổng.

### 6.5 Câu đã làm sẵn và số cấu hình (D25, D34)

Không đổi cách dùng lại câu làm sẵn (`unseen-questions.ts`). `ai_calls.prompt_revision` và `practice_questions.ai_meta.prompt_revision` mang `number` của cấu hình từ P3;
tên cột giữ nguyên, nghĩa ghi trong comment của schema.

### 6.6 API bị bỏ hoặc đổi nguồn (R4)

- `PUT /v1/admin/ai/prompts/:op` và `PUT /v1/admin/ai/operations/:op` bị bỏ (404 sau P3), thay bằng các endpoint cấu hình (§9).
- `GET /v1/admin/ai/operations` và `GET /v1/admin/ai/prompts/:op` giữ khuôn trả về nhưng đọc **cấu hình đang chạy**; `GET …/prompts/:op/revisions` giữ để đọc lịch sử cũ.
  Trang Tình trạng và `used_by` của model đọc cấu hình.
- Trong repo có bốn chỗ gọi hai `PUT`: job CI `admin-e2e-real` (`apps/admin/e2e-real/support/ai-report.ts`, `chooseClozeModel`), `scripts/smoke-buoc-6.mjs`,
  `scripts/smoke-buoc-7.mjs`, `scripts/learner-test-setup.mjs`. P3 sửa cả bốn trong cùng PR, đi đúng đường thật: thêm ví dụ, chốt phiên bản, eval nháp (model `fake`, nhanh), publish
  (E16). Không làm đường tắt chỉ cho test.

## 7. K4 — Câu thật (P4)

### 7.1 Chấm câu AI 7 ngày qua (D26, D35)

- **Ai làm gì (R8, E8):** Practice chọn câu và dựng đầu vào chấm (dữ liệu là của Practice); `ai` chạy lượt chấm (lời gọi `judge`, trần USD, worker `ai-eval`, lưu điểm). Practice
  gọi `AiService.startJudgePass({judge_id, kind: 'real', filters, subjects})`; `subjects` là ảnh chụp (`subject_id` = id câu, `input`, `output`, `context`).
- **Nguồn:** `practice_questions` có `source = 'ai'`, tạo trong `content_retention_days` (7) ngày; đầu vào từ `practice_ai_requests.ai_input.data`, đầu ra gốc lấy qua
  `AiService.callContents(operationIds)` (nối bằng `ai_meta.call_operation_id`, F7). `content_retention_days = 0` → không có nguồn; màn ghi lý do.
- **Không bao giờ chấm (R6):** câu về từ riêng; câu có bất kỳ phương án nhiễu hay nghĩa sai nào lấy từ từ riêng (`mcq_sentence`, `meaning_in_sentence`); màn ghi số câu bỏ qua
  vì lý do này. `context` chỉ gồm các từ **trong kho** của cùng phiên. Vì vậy ảnh chụp và lý do của judge không chứa dữ liệu riêng của người học.
- **Lọc** (cả bốn, D26): thao tác, cặp (số cấu hình, model), "chỉ tài khoản test" = người học có `staff_role` (D35) lấy qua `IdentityService.staffUserIds()` (mới), vai trò **hiện
  tại** (cấp hay bỏ `editor` thì kết quả lọc đổi theo, cả với câu cũ).
- **Mỗi lần bấm:** tối đa `real_judge_limit` (200) câu, mới nhất trước, chưa được bản judge đó chấm (Practice hỏi `AiService.judgedSubjects(revisionId, ids)`). Trước khi chạy, màn
  hiện số câu và chi phí ước tính (số câu × chi phí trung bình mỗi lời gọi của bản judge đó ở các lượt trước; chưa có lượt nào thì "chưa ước tính được"). Mỗi bản judge một lượt
  chạy mỗi lúc. Lượt treo được dọn như `stalled` của eval.
- **Kết quả:** trang riêng (từng câu, điểm, lý do, nút gắn nhãn, nút "Đưa vào bộ ví dụ") và số tổng trên dashboard (§8).

### 7.2 Đưa vào bộ ví dụ (D27)

- **Nút ở:** trang chi tiết báo lỗi đã `confirmed` của câu AI; mỗi dòng "không đạt" ở §7.1. Chỉ `admin` thấy (D19; báo lỗi do cả `editor` xử lý được, F10). Không có nút cho câu
  thuộc diện "không bao giờ chấm" ở §7.1.
- **Endpoint ở Practice** (dữ liệu là của Practice / Content): `POST /v1/admin/practice/eval-examples/from-source` (`settings.manage`), gọi `AiService.createEvalExample({operation,
  input, expected, note, source, source_ref, split: 'dev'})`.
- **Đầu vào:** lấy nguyên `practice_ai_requests.ai_input.data` khi còn (7 ngày); quá 7 ngày thì dựng lại từ nội dung hiện tại của nghĩa trong kho (E17): phương án nhiễu và nghĩa
  khác là chọn mới, nghĩa có thể đã sửa; hộp thoại ghi rõ.
- **Ô mong đợi:** máy điền sẵn (`forms` qua port), người bấm sửa. **Split:** luôn `dev`.

## 8. K5 — Dashboard (P5, D28, D29)

Thêm vào trang `/dashboard` (quyền `ai.view`, biểu đồ tự vẽ):
1. **Số ngày chạm trần**: so mỗi ngày với trần **của chính ngày đó** (giá trị cuối ngày), đọc lịch sử `entitlements.ai_daily_cap` qua `SettingsService` (F2); hiện nay so với trần
   hiện tại.
2. **Eval gần nhất mỗi thao tác**: lần chạy xong trọn gần nhất của bản đang chạy trên phiên bản đã chốt mới nhất; tỉ lệ đạt khuôn, luật, mong đợi, judge; dev và held-out.
3. **Điểm judge theo thao tác và cặp (số cấu hình, model)**, từ eval và từ câu thật, kèm "đã / chưa hiệu chỉnh"; biểu đồ đánh dấu chỗ đổi bản judge (D17).
4. **Câu thật 7 ngày**: lượt chấm gần nhất, tỉ lệ `pass` / `fail_major` / `fail_minor` theo thao tác.

Kèm sửa: báo cáo `ai-quality` đếm thêm báo lỗi `confirmed` (F11 nay bỏ sót).

## 9. API (tóm tắt; chi tiết ở plan)

Mọi endpoint mới cần `settings.manage` (D19), trừ phần đọc dashboard (`ai.view`). Lỗi theo Problem Details; tạo lần chạy, lượt chấm có `Idempotency-Key`. Thao tác có tác dụng
phụ (`reveal`) là `POST`.

| Plan | Endpoint |
|---|---|
| P1 | `POST /v1/admin/ai/eval/sets` (chốt phiên bản), `GET …/sets?operation`; `POST …/examples/:id/reveal`; `GET …/examples/forms?word&part_of_speech`; `bulk` nhận `expected`, `split`; `POST …/runs` nhận `set_id`; `GET …/runs/:id/items`; `GET …/runs/compare?a=&b=` |
| P3 | `GET /v1/admin/ai/configs/:op` (đang chạy, nháp, trước đó), `POST …/:op/draft` (`from_config_id?`), `PUT …/:op/draft`, `DELETE …/:op/draft`, `POST …/:op/draft/test`, `GET …/:op/publish-check`, `POST …/:op/publish`, `POST …/:op/rollback`, `GET …/:op/history`; `POST …/eval/runs` nhận `config: 'live' \| 'draft'` |
| P2 | `GET/POST /v1/admin/ai/judges`, `PUT …/judges/:id` (thêm bản), `POST …/judges/:id/clone`, `GET …/judges/:id/revisions`; `POST …/eval/runs/:id/judge-passes`, `GET …/judge-passes/:id`; `PUT /v1/admin/ai/labels`; `GET …/judges/:id/agreement` |
| P4 | `POST /v1/admin/practice/real-judge` (lọc, `judge_id`), `GET …/real-judge/estimate`, `GET …/real-judge/passes`, `GET …/real-judge/passes/:id/items`; `POST /v1/admin/practice/eval-examples/from-source` (`report_id` hoặc `question_id`) |
| P5 | mở rộng `GET /v1/admin/ai/dashboard`, `…/practice/ai-quality`, `…/entitlements/ai-usage/days` (thêm field, không đổi field cũ) |
| P6 | `GET /v1/admin/learning/retention?from&to` (`ai.view`, E18) |

**Hàm mới giữa các module (R8):** `AiService.registerEvalRules`, `startJudgePass`, `judgedSubjects`, `callContents`, `createEvalExample`; `ContentService` tra mục kho theo
`(lemma, pos)`; `IdentityService.staffUserIds()`, `IdentityService.registrations(from, to)` (P6). Không module nào đọc bảng của module khác.

## 10. K6 — D7/D30 (P6, D36)

- **Lần học (D39):** một dòng `learning_activity_days(user_id, local_date)`, ghi kiểu upsert (một dòng mỗi người mỗi ngày) bởi `LearningService.recordActivity(userId,
  localDate)` ở mọi chỗ Learning đang ghi `learning_log` (ôn, thêm / bỏ từ, hai nút "Cần ôn tập" / "Đã biết") và khi Practice nhận một câu trả lời (Practice đã import
  Learning, nên gọi thẳng). Bảng chỉ có số từ lúc thêm; hiện chưa có người học thật nên không mất gì. Xóa tài khoản xóa các dòng của người đó; xóa từ riêng thì không.
- **Ngày của một lần học:** `local_date` của người học (ngày theo múi giờ người đó), cùng cách tính ngày với `learning_log`. Nhóm đăng ký theo tuần giờ VN, tuần bắt đầu thứ Hai.
- **Đang học** (vào ngày *d*): có lần học trong cửa sổ [*d* − *N* + 1, *d*] (*N* = `learning.active_window_days` = 7, tính cả ngày *d*). **Đã ngừng:** đã có ít nhất một lần
  học, nhưng không có lần học nào trong cửa sổ đó.
- **D7 / D30** của một nhóm: % người trong nhóm còn "đang học" ở ngày đăng ký + 7 / + 30. Nhóm chưa tới ngày đó thì để trống.
- **Không tính (E18):** tài khoản `admin` / `editor` (vai trò hiện tại; là tài khoản test, D35); tài khoản chưa xác nhận email; tài khoản đã xóa (không còn dữ liệu).
- **Dashboard:** số đang học và đã ngừng hôm nay; bảng nhóm theo tuần với D7, D30 và số người.

Ví dụ: Lan đăng ký 1/11, học 3/11, 5/11, 6/11 rồi nghỉ. Ngày 8/11 (D7) Lan vẫn "đang học" (lần học cuối 6/11, trong cửa sổ 2/11–8/11). Từ 13/11 Lan "đã ngừng". D30 (1/12)
Lan không còn đang học.

## 11. When → Then

| # | When | Then |
|---|---|---|
| B1 | Chốt phiên bản khi bộ đang soạn không có ví dụ held-out nào, hoặc có ví dụ thiếu `expected` | 422, liệt kê lý do / ví dụ |
| B2 | Ví dụ thiếu `expected` cho một trong 4 thao tác (tạo, sửa, nhập) | 422 theo ví dụ / số dòng |
| B3 | Đọc ví dụ held-out (danh sách, chi tiết, kết quả lần chạy, so sánh) | chỉ `id`, `split`, số tổng; không lộ đầu vào, đầu ra, lý do |
| B4 | `POST …/examples/:id/reveal` | ví dụ sang `dev`, `revealed_at` ghi; phiên bản đã chốt giữ ảnh chụp, màn ghi "1 ví dụ held-out đã bị xem" |
| B5 | Sửa ví dụ đã nằm trong một phiên bản chốt | bộ đang soạn đổi; phiên bản chốt và lần chạy cũ không đổi |
| B6 | Trang Các lần gọi mở lời gọi eval / judge của ví dụ held-out | `content: null`, nhãn "held-out" |
| B7 | Chạy thử khi bộ có cả dev và held-out | chỉ lấy ví dụ dev |
| B8 | Luật Practice không tìm thấy mục `(word, part_of_speech)` trong kho | `rule = skipped` (`not-in-catalog`); tỉ lệ luật tính trên ví dụ không bị bỏ qua, màn ghi số bị bỏ qua |
| B9 | Thao tác không có luật Practice | `rule = not_applicable`, khác `skipped` |
| B10 | So hai lần chạy khác `set_id`, hoặc một lần chạy trên bộ đang soạn | 409 `eval-set-mismatch` |
| B11 | So tiêu chí judge khi hai lần chạy được chấm bằng hai bản judge khác nhau | không so tiêu chí đó; màn đưa nút chấm cả hai bằng một bản |
| B12 | Lưu judge với model `openai` | 422 `judge-provider`; `anthropic` được nhận; `fake` chỉ khi `AI_FAKE_ENABLED=true` |
| B13 | Judge trả ba mảng lệch độ dài hay `verdict` lạ | gateway coi là sai khuôn; mọi tiêu chí của đầu ra đó "không chấm được" |
| B14 | Judge trả thiếu một `code` đã gửi | tiêu chí đó "không chấm được"; tiêu chí khác giữ điểm |
| B15 | Bấm chấm lần hai cùng bản judge trên cùng lần chạy | chỉ chấm đầu ra chưa có điểm hoặc "không chấm được"; không trả tiền hai lần |
| B16 | Hai lượt chấm cùng bản judge cùng lúc | lượt sau 409 |
| B17 | Tiêu chí có 29 nhãn, khớp 100% | "chưa hiệu chỉnh" (chưa đủ 30) |
| B18 | Lần chạy chạm trần USD ở ví dụ 40/100 | dừng, `failed` + `admin-usd-cap`, 39 ví dụ giữ; không trọn nên không dùng cho publish |
| B19 | Lượt chấm judge trên lần chạy đã xong chạm trần | chỉ lượt chấm `failed`; lần chạy vẫn `finished` |
| B20 | Đã tiêu đúng 2,00 USD, trần 2,00 | lời gọi admin tiếp theo bị chặn |
| B21 | Trần lời gọi của người học: admin vừa chạy eval 3000 lời gọi | Lan vẫn có câu AI (chỉ lời gọi `learner` được đếm) |
| B22 | Chạy eval / test / judge với model chưa nhập giá | 409 `model-price-missing` |
| B23 | Tạo nháp khi đã có nháp | 409; trả nháp hiện có |
| B24 | Hai admin cùng sửa nháp | người lưu sau 409 theo `expected_version` |
| B25 | Sửa nháp sau khi eval rồi publish | `publish-check` báo `eval-required` (lần chạy cũ mang `config_version` cũ) |
| B26 | Xóa nháp khi lần chạy của nó đang `queued` / `running` | 409 |
| B27 | Publish khi nháp chưa có lần chạy trọn trên *S* | 409 `eval-required` |
| B28 | Publish khi bản đang chạy chưa có lần chạy trên *S* | 409 `baseline-required`; màn đưa nút chạy bản đang chạy |
| B29 | Bản đang chạy chưa có model, nháp có model và lần chạy trọn | publish được, không cần mốc, không cảnh báo so sánh (D37) |
| B30 | Publish có cảnh báo, không gửi `acknowledge_warnings`, hoặc gửi id lần chạy khác `publish-check` | 409 kèm cảnh báo / lý do |
| B31 | Hai admin publish cùng lúc | một người thành công; người kia 409 theo `version` của con trỏ |
| B32 | Rollback khi không có `previous_config_id` | 409 `no-previous` |
| B33 | Xóa lần chạy đã làm bằng chứng publish | 409 |
| B34 | Xóa model nằm trong nháp, bản đang chạy, bản trước, hoặc judge đang dùng | 409 |
| B35 | Lan có câu `rhythm` làm sẵn bằng cấu hình 3, admin publish cấu hình 4 | Lan vẫn nhận câu cấu hình 3 (D34); điểm của nó tính cho cấu hình 3 |
| B36 | Ví dụ few-shot của nháp có đáp án không phải dạng của từ (T1) | lưu nháp 422, chỉ ví dụ hỏng; tạo nháp vẫn được |
| B37 | Hai admin bấm "Chốt phiên bản" cùng lúc | một thành công; người kia 409 (unique `(operation, version)`) |
| B38 | Chấm câu thật khi nội dung gốc đã quá 7 ngày, hoặc `content_retention_days = 0` | câu đó không nằm trong nguồn; màn ghi lý do |
| B39 | Câu MCQ có một phương án là từ riêng của Lan | không được chấm, không có nút đưa vào bộ ví dụ; tính vào số "bỏ qua vì có từ riêng" |
| B40 | Chấm câu thật, lọc "chỉ tài khoản test", không có tài khoản staff nào luyện | 0 câu; không gọi AI |
| B41 | Lượt chấm câu thật chết giữa chừng | sau 15 phút không heartbeat → `failed` + `stalled`, như eval |
| B42 | Bấm "Đưa vào bộ ví dụ" trên báo lỗi 10 ngày tuổi | đầu vào dựng lại từ nội dung nghĩa; hộp thoại ghi phương án nhiễu khác câu gốc |
| B43 | `editor` mở báo lỗi đã xác nhận | không thấy nút "Đưa vào bộ ví dụ" |
| B44 | Trần lượt AI đổi trong ngày | ngày đó so với giá trị cuối ngày; trước lần lưu đầu tiên dùng giá trị mặc định |
| B45 | Người đăng ký chưa từng học | không "đang học", không "đã ngừng"; vẫn tính vào mẫu số của nhóm |
| B46 | Nhóm đăng ký tuần này, chưa tới ngày +7 | D7 để trống |
| B47 | Người học được cấp `editor` sau khi đăng ký | bị loại khỏi D7/D30 và tính là tài khoản test, cả cho quá khứ |
| B48 | Publish nháp không có model, không có lần chạy nào | được (D38); người học nhận câu không AI; rollback bật lại bản trước |
| B49 | Xóa model chỉ nằm trong một cấu hình `retired` | 409 `model-in-use` (D40) |
| B50 | Model `retired` | không hiện trong ô chọn model, trừ khi đang là model của chính nháp / judge đó |
| B51 | Lan trả lời 3 câu luyện tập và ôn 5 thẻ trong cùng một ngày | một dòng `learning_activity_days` cho ngày đó |

## 12. Kiểm thử

Theo `~/.claude/rules/testing-boundaries.md`: lệnh mặc định chỉ unit và component.
- Hàm thuần có test biên: kiểm `expected` theo từng thao tác; chia held-out theo tỉ lệ (bộ 0, 1, đúng 30%); "xong trọn"; so hai lần chạy (tỉ lệ, "trước đạt nay trượt", ngưỡng 5
  điểm % đúng tại cạnh, hai bản judge khác nhau); kiểm đầu ra judge theo tiêu chí đã gửi; độ khớp và hiệu chỉnh (29 / 30 nhãn, 84,9% / 85%); trần USD (1,99 / 2,00, `null`, `0`);
  cửa sổ "đang học" (ngày *d* − 6 và *d* − 7); D7/D30 với nhóm chưa đủ ngày.
- Service (Prisma giả): luật publish và rollback, mọi 409 ở §11, ảnh chụp phiên bản, đổi cách đếm trần lời gọi, job eval dừng ở trần.
- Khóa thật (B24, B31, B37): chạy trong smoke bằng hai request song song (E19); không thêm lệnh Testcontainers mới.
- Admin web: behavioural test theo role và chữ hiển thị (hộp hỏi held-out, cảnh báo publish, gắn nhãn bằng phím).
- Fake provider trả đầu ra cho thao tác `judge` để smoke chạy không cần key.

## 13. Xong khi

- CI xanh mỗi PR, gồm job `admin-e2e-real` (P3 sửa `chooseClozeModel`).
- Mỗi milestone có một đoạn smoke của mình, chạy khi PR cuối của milestone merge; cuối đợt `pnpm smoke:nhom-b` trên DB mới với model `fake` (có giá, E15), theo thứ tự: chọn model lần đầu
  (D37) → tạo ví dụ có ô mong đợi → chốt phiên bản → eval bản đang chạy và nháp, có judge → gắn nhãn → so → publish có cảnh báo (kèm hai publish song song) → rollback →
  chạm trần USD → chấm câu thật của một tài khoản `editor` → đưa vào bộ ví dụ → đọc dashboard và D7/D30. Output lưu `docs/deliveries/nhom-b-smoke-output.txt`.
- Các smoke cũ vẫn qua sau khi sửa: `smoke:buoc-6`, `smoke:buoc-7`, và `learner:setup` chạy được.
- Chủ dự án tự chạy một lần thật với key của mình, ngân sách 5 USD (D30): eval `generate_cloze` trên phiên bản chốt có held-out; judge "Chỉ một đáp án" bằng **hai** model
  Anthropic (judge gốc và bản nhân bản, D3); gắn 30 nhãn; xem độ khớp của từng judge.

## 14. Rủi ro và chỗ chưa kiểm

- **Số B1 nhỏ:** 14 ví dụ mỗi model; ngưỡng 85%, 30 nhãn, 2 USD, 5 điểm % đều là `ASSUMPTION`, sửa được trên UI.
- **Judge cùng họ:** Haiku sinh câu và judge cũng Anthropic; giấu tên không chặn được thiên vị theo văn phong (`ASSUMPTION`, chưa kiểm nguồn). Số đo độ khớp với nhãn của
  bạn là chỗ phát hiện.
- **Câu cũ còn lâu:** sau launch, publish để chữa lỗi nặng thì câu lỗi đã làm sẵn còn tới người học tới 6 tháng (D34).
- **Tài khoản test = staff:** tài khoản người học riêng muốn được tính phải được cấp `editor`, và khi đó vào được trang admin (D35).
- **Trần USD mềm:** có thể vượt vài lời gọi khi chạy song song (§5.5).
- **Luật trong eval tra theo `(word, part_of_speech)`:** một từ có nhiều mục cùng từ loại (hiếm) thì gộp mọi dạng; từ ngoài kho bỏ qua luật.
- **Tiêu chí "trỏ đúng nghĩa"** của `generate_meaning_question` chưa ai kiểm cho tới khi có judge cho thao tác đó (D7, D1).
- **Mục nhiều chữ** (`bus stop`): chưa kiểm câu điền từ có một hay hai chỗ trống (T3).
- **D7/D30:** chỉ có số từ lúc có bảng `learning_activity_days` (D39); tài khoản đã xóa không còn dòng nào, nên nhóm cũ thiếu người.
- **Model không xóa được** khi đã từng nằm trong một cấu hình hay judge (D40): danh sách model chỉ dài thêm; dùng `retired` để ẩn.
- **Tắt một thao tác không qua eval** (D38): một cú bấm nhầm tắt AI của thao tác đó tới khi rollback (có hộp hỏi).
- **Làm tuần tự:** sáu milestone nối tiếp (§3), nên thời gian tới lúc xong dài hơn cách chia nhiều phiên song song.
- **Ước tính chi phí chấm câu thật** dựa trên các lượt trước; lượt đầu không ước tính được.
- `ASSUMPTION` từ review: cách `prisma migrate deploy` xử lý migration đến trễ thứ tự (tránh bằng luật đặt tên ở §3).
- Comment cũ trong code (F12) sửa khi chạm tới file đó.

## 15. Đề xuất kỹ thuật (duyệt cùng design)

| # | Chọn | Bỏ | Vì sao |
|---|---|---|---|
| E1 | Ảnh chụp ví dụ ở phiên bản chốt, ở từng kết quả chạy và ở từng đối tượng chấm; kết quả chạy thành bảng | Giữ `items` Json và đọc đầu vào lúc chạy | So lần chạy và nối điểm, nhãn cần chữ cố định (F6) |
| E2 | Port luật do Practice đăng ký vào `AiService` lúc `onModuleInit`, gồm `check`, `formsOf`, `matchesExpected`; tra kho theo `(lemma, pos)` | `sense_id` bắt buộc trong ví dụ; viết lại luật trong `ai`; inject provider của Practice vào `ai` | Giữ R17 Bước 6, tránh vòng import; ví dụ vẫn viết bằng chữ như B1 |
| E3 | Thao tác gateway `judge` (kiểu `GatewayOperation`), đầu ra ba mảng chuỗi; bảng judge do admin tạo | Mỗi judge một thao tác trong code; đầu ra mảng object | Thêm judge không cần deploy; vừa khung `define-operation` mà không cần nhà cung cấp hỗ trợ object lồng |
| E4 | Judge lưu là bản mới, không publish; có nút nhân bản | Judge cùng vòng đời cấu hình | Judge không phục vụ người học |
| E5 | `ai_configs` có `version` + con trỏ `ai_live_configs`; số cấu hình nối số revision prompt; số liệu nhóm theo cặp (số cấu hình, model) | Thêm trạng thái vào bảng cũ; đánh số lại từ đầu | Một cụm một số; số cũ vẫn đúng nghĩa cho phần prompt |
| E6 | Bỏ hai `PUT` cũ; hai `GET` đọc cấu hình đang chạy | Cho `PUT` ghi vào nháp | Tránh API đổi nghĩa ngầm |
| E7 | Kiểm trần USD trước mỗi lần gửi nhà cung cấp, trần mềm | Ước tính, chặn trước khi bắt đầu | Giữ kết quả đã có; vượt tối đa vài lời gọi |
| E8 | Practice chọn câu thật và dựng đầu vào; `ai` chạy lượt chấm và lưu điểm | Đặt cả hai ở một module | Mỗi module chỉ đọc bảng của mình; dùng lại worker `ai-eval` |
| E9 | D7/D30 tính lúc đọc | Bảng tổng hợp theo ngày | Đủ nhanh với số người học hiện tại (`ASSUMPTION`) |
| E10 | Luật chia held-out giữ tỉ lệ của bộ đang soạn | Tung ngẫu nhiên từng ví dụ | Bộ nhỏ không bị kẹt không có held-out (R21) |
| E11 | Ví dụ có sẵn khi migrate vào `dev`, `expected` NULL; kết quả cũ chuyển sang bảng | Chia lại 30% | Các ví dụ đó đã bị đọc (D10) |
| E12 | Một plan, làm tuần tự M1–M6 (P1 → P3 → P2 → P4 → P5 → P6); **chủ dự án chốt 29/10/2026** | Nhiều plan, P2 và P3 song song (D5) | P2, P3 sửa chung lõi `ai` (R9); P6 vẫn sau cùng như D32 |
| E13 | Judge nhận model `fake` khi `AI_FAKE_ENABLED=true` | Chỉ `anthropic` | Smoke chạy không cần key |
| E14 | Chặn cả `test` với model chưa nhập giá | Chỉ chặn eval (đúng câu chữ D18) | Trần USD phải đếm được mọi việc của admin |
| E15 | Model `fake` được nhập giá khi `AI_FAKE_ENABLED=true` | Giá `fake` luôn 0 | Smoke chạm được trần USD |
| E16 | Script và e2e đổi model qua đường nháp → eval → publish | Một endpoint tắt chỉ cho test | Không có cửa sau trên API thật |
| E17 | Dựng lại đầu vào từ nội dung nghĩa khi báo lỗi quá 7 ngày | Không cho đưa vào bộ ví dụ sau 7 ngày | Báo lỗi được xử lý muộn vẫn dùng được |
| E18 | D7/D30 loại tài khoản staff và chưa xác nhận email; endpoint dùng `ai.view` | Tính mọi tài khoản; chỉ `admin` | Tài khoản test làm sai số; số đọc được như các phần khác của dashboard |
| E19 | Khóa song song kiểm bằng hai request trong smoke | Thêm lệnh Testcontainers mới | Repo chỉ có `test:scale`; smoke đã là cổng "Xong khi" |
