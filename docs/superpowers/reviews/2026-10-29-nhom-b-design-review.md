# Nhóm B (chất lượng AI) — Review độc lập design (29/10/2026)

- **Design được review:** [`../specs/2026-10-29-nhom-b-chat-luong-ai-design.md`](../specs/2026-10-29-nhom-b-chat-luong-ai-design.md) (bản chờ chủ dự án đọc lại).
- **Đối chiếu với:** decision record [`../decisions/2026-10-29-nhom-b-chat-luong-ai-decisions.md`](../decisions/2026-10-29-nhom-b-chat-luong-ai-decisions.md); câu hỏi và trả lời
  [`2026-10-29-nhom-b-questions.md`](2026-10-29-nhom-b-questions.md) (mục "Kết quả chốt", N1–N3, Phần 0); câu 15–25 của
  [`2026-10-26-dot-cai-thien-questions.md`](2026-10-26-dot-cai-thien-questions.md) (gồm hai lượt "Kiểm câu trả lời"); code facts
  [`NHOM_B_CODE_FACTS_2026-10-29.md`](../../preparation/NHOM_B_CODE_FACTS_2026-10-29.md); nền: [`generate_cloze-2026-10-29-error-analysis.md`](../../preparation/b1-eval/generate_cloze-2026-10-29-error-analysis.md),
  [`IMPROVEMENT_PLAN_2026-10-28.md`](../../preparation/IMPROVEMENT_PLAN_2026-10-28.md) §4; luật repo: `CLAUDE.md` (D3 ranh giới module), `docs/specs/SPEC_WRITING_CONVENTIONS.md`,
  `~/.claude/rules/testing-boundaries.md`; "Xong khi" của Bước 7 (`2026-10-21-buoc-7-practice-ai-content-ai-design.md` §18) để so cách kiểm.
- **Code:** working tree nhánh `docs/nhom-b-design` @ `d148f9e` (= `origin/dev` @ `9b5288f` + một commit chỉ có docs, nên code giống `origin/dev`). Đường dẫn tương đối với
  `apps/api/` trừ khi bắt đầu bằng `apps/admin/`, `.github/` hay `docs/`. Không build, không chạy gì.
- **Cách làm:** mỗi khẳng định của design (và của code facts mà design dựa vào) được đọc lại trong code; chỗ không kiểm được ghi `ASSUMPTION`. Review design theo chính nó
  và theo các quyết định đã chốt, không theo `docs/specs/`.
- **Người review:** Claude, phiên review độc lập, chỉ đọc; file này là file duy nhất được viết.

Ví dụ dùng lại nhân vật của design: **Lan**, luyện `rhythm`; bạn (chủ dự án) là `admin` duy nhất.

---

## Tóm tắt

| # | Mức | Mục design | Một dòng | Cần chủ dự án quyết? |
|---|---|---|---|---|
| R1 | **Critical** | 6.1, 6.3, 6.6, 13, B17 | Bản đang chạy chưa có model (DB mới, production lúc launch, smoke) thì không eval được, nên cổng publish không bao giờ mở; hai `PUT` bị bỏ nên không còn đường nào khác để chọn model | Có (ngoại lệ của D21.5) |
| R2 | **Critical** | 4, 6.2, 6.3 | Lần eval của nháp không gắn với nội dung nháp: sửa nháp sau khi eval rồi publish được bản chưa từng eval; `ai_configs` không có cột `version` cho `expected_version` | Không |
| R3 | **Critical** | 10, D36 | "Lần học" = `learning_log`, nhưng trả lời câu luyện tập không ghi `learning_log`: người chỉ luyện tập bị tính là "đã ngừng". Decision record ghi sai bối cảnh ("ghi mỗi lần … luyện") | Có |
| R4 | Important | 6.6, 14 | Bỏ hai `PUT` làm vỡ job CI `admin-e2e-real`, `smoke:buoc-6`, `smoke:buoc-7`, `learner:setup`; câu "hiện không có công cụ ngoài admin web gọi" sai; hai `GET` "hiện tại" thành dữ liệu cũ | Không |
| R5 | Important | 5.4, B9 | Thao tác `judge` không vừa khung `define-operation` (đầu ra là mảng object; `checkOutput` không thấy tiêu chí đã gửi); chưa rõ `judge` có vào `AI_OPERATIONS` không | Không |
| R6 | Important | 7.1, 7.2 | Từ riêng lọt vào bộ ví dụ và judge: `ai_input.data` của câu MCQ / chọn nghĩa chứa từ riêng của bạn cùng nhóm; `context` gửi judge gồm từ riêng; lý do judge lưu mãi | Có (xác nhận cách che) |
| R7 | Important | 5.1, 5.3, 5.4, 6.3 | Held-out bị xem mà không chuyển sang dev qua trang "Các lần gọi", nút test (5 ví dụ đầu), màn gắn nhãn, danh sách "trước đạt nay trượt" | Không |
| R8 | Important | 5.1, 7.1, 7.2, 9 | Phần đọc / ghi xuyên module của P1, P4 chưa được thiết kế: điền sẵn `forms` trong `ai`, lọc "chưa chấm" và đọc `ai_call_contents` từ Practice, endpoint `from-source` ở module nào, lần chấm câu thật không nối được với điểm, Practice không có queue | Không |
| R9 | Important | 3 | P2 và P3 "song song" nhưng cùng sửa `runner.service.ts`, `eval-runs.service.ts`, `eval-job.ts`, `readiness`/`selection`, `reports.service.ts`; danh sách file thiếu `content/**`, `identity/**`, `settings/**` | Không |
| R10 | Important | 5.5, 13, B11 | Trần USD có thể vượt khi chạy song song; cạnh 2,00 chưa định nghĩa; judge chấm thêm trên lần chạy đã xong mà chạm trần thì sao; smoke với `fake` (giá luôn 0) không chạm được trần | Không |
| R11 | Important | 6.3, 5.3 | Cổng publish mơ hồ: chọn phiên bản chốt nào; so điểm judge của hai bản judge khác nhau; "xong trọn" khi có ví dụ lỗi hay judge không chấm được | Không |
| R12 | Important | 6.1, 6.5, 8 | Model bị xóa / xóa giá khi cấu hình còn trỏ tới; `ai_operation_settings` giữ FK nên model cũ không xóa được mãi; số cấu hình nối số prompt gộp nhầm các lần đổi model trước P3 | Không |
| R13 | Important | 6.2, 6.4 | "Muốn về xa hơn thì tạo nháp từ bản cũ" không làm được (nháp chỉ chép bản đang chạy); trạng thái sau rollback chưa ghi; decision record ghi "rollback nhiều lần" | Không |
| R14 | Important | 4, 5.1 | Dữ liệu có sẵn khi P1 migrate: 14 ví dụ B1 đã bị đọc chưa có `expected` / `split`, `items` Json của các lần chạy cũ; nếu chia ngẫu nhiên 30% vào held-out là sai D10 | Không |
| R15 | Important | 11 | When → Then thiếu các ca của chính cơ chế mới (xóa nháp khi đang chạy eval, chấm judge hai lần, lần chấm câu thật treo `running`, xóa lần chạy có nhãn…) | Không |
| R16 | Important | 12, 13 | "Xong khi" không gồm các smoke cũ và `admin-e2e-real` (sẽ vỡ, R4); B15, B20 cần Postgres thật mà chưa có chỗ chạy; smoke theo thứ tự ghi trong §13 kẹt ở bước đầu (R1) | Không |
| R17 | Minor | 5.2, 15 E2 | Port `EvalRuleCheck`: "token … như cách Practice đã dùng `AiService`" mơ hồ; cách đăng ký `onModuleInit` có tiền lệ và không vòng DI; còn thiếu hàm Content tra `(word, part_of_speech)` | Không |
| R18 | Minor | 5.1, 5.4, 8 | Vài phần quyết định bị bỏ lặng lẽ: tiêu chí "trỏ đúng nghĩa" của D7, "hiệu chỉnh đầu so hai judge Anthropic" của D3, "biểu đồ đánh dấu chỗ đổi" của D17 (a) | Có (ghi bỏ hay giữ) |
| R19 | Minor | 5.5, 5.4, 7.2, 10, 9 | Phần thêm không có trong quyết định và không nằm ở §15: dựng lại đầu vào sau 7 ngày, loại staff khỏi D7/D30, chặn `test` với model chưa có giá, `fake` làm judge, quyền `ai.view` cho retention | Có (duyệt cùng design) |
| R20 | Minor | 10 | D7/D30: múi giờ của lần học, cửa sổ tính cả ngày *d* không, tuần bắt đầu thứ mấy, tài khoản chưa xác nhận email, xóa từ riêng xóa luôn lần học | Không |
| R21 | Minor | 5.1 | Chia held-out "ngẫu nhiên từng ví dụ": bộ nhỏ có thể không có held-out nào (B1 → 422 mãi) | Không |
| R22 | Minor | decision record D12, D24, D36 | Decision record có một phương án không có trong file câu hỏi (D12), một trade-off ngược design (D24), một bối cảnh sai (D36) | Không |

Ngoài bảng: "Đã kiểm, không có vấn đề" và "ASSUMPTION" ở cuối file.

---

## R1 — Critical — Cổng publish kẹt khi bản đang chạy chưa có model

**Mục:** 6.1 ("Thao tác chưa chọn model vẫn chưa chọn model"), 6.3 bước 2, 6.6, 13, B17.

**Vấn đề.** Trên DB mới, cả 6 thao tác được seed với `model_ref NULL`. Sau P3, mỗi thao tác có một cấu hình `published` không có model. Muốn chọn model, bạn phải tạo nháp
có model, eval nháp, rồi publish. Nhưng bước 2 của cổng bắt có một lần chạy xong trọn của **bản đang chạy** *L* trên cùng phiên bản chốt, và *L* không có model nên không chạy
được (`model-not-set`). Hai `PUT` cũ bị bỏ (§6.6), nên không còn đường nào khác để đặt model. Kết quả: trên production lúc launch (DB mới), và trong `pnpm smoke:nhom-b`
"trên DB mới với model `fake`" (§13 bước "chạy eval bản đang chạy và nháp"), không thao tác nào có model được.

**Bằng chứng:** `prisma/migrations/20261020071131_ai/migration.sql` (INSERT `ai_operation_settings` với `model_ref` NULL cho 3 thao tác Bước 6) và
`prisma/migrations/20261022091000_buoc7_ai_operations/migration.sql` (3 thao tác Bước 7, NULL); `src/ai/eval/eval-runs.service.ts:73` (`model-not-set` khi tạo lần chạy);
`src/ai/runner/runner.service.ts:188-189` (đường admin trả `model-not-set`); D21.5 ("bản đang chạy chưa eval thì eval nó trước").

**Đề xuất.** Thêm một luật: bản đang chạy **không có model** thì không cần mốc so; publish chỉ cần lần chạy trọn của nháp (vẫn có held-out), không có cảnh báo so sánh
(không có người học nào đang dùng thao tác đó). Ghi thành B-case mới. Đây là ngoại lệ của câu chữ D21.5 (b), nên **cần chủ dự án xác nhận** dù đúng ý của D21 (mốc chỉ có
nghĩa khi người học đang dùng bản cũ). Sửa thứ tự smoke ở §13 cho khớp (chọn model lần đầu qua nháp → eval nháp → publish, rồi mới "eval bản đang chạy").

---

## R2 — Critical — Lần eval của nháp không gắn với nội dung nháp

**Mục:** 4 (`ai_configs`, `ai_eval_runs`), 6.2, 6.3.

**Vấn đề.** Nháp sửa được tại chỗ (`PUT …/:op/draft`), giữ nguyên id. Lần chạy chỉ lưu `config_id`. Ví dụ: bạn eval nháp *C* (prompt bản A + Haiku), rồi sửa nháp đổi sang
Sonnet hoặc sửa prompt, rồi publish. Cổng thấy "có một lần chạy xong trọn của *C*" và cho qua, dù cấu hình sắp chạy cho Lan **chưa từng được eval**. Điều này ngược D21
("đúng cấu hình sắp publish"; 21.1 đúng model). Thêm nữa: §6.2 ghi "Sửa nháp có `expected_version` như hiện nay" nhưng bảng `ai_configs` ở §4 không có cột `version` hay
`updated_at`, nên không có gì để so. Và mọi `ai_calls.prompt_revision` của các bản sửa khác nhau của cùng một nháp mang chung một số (§6.5).

Hiện nay vấn đề này không có vì lần chạy trên bản nháp chụp lại nội dung (`ai_eval_runs.draft` Json, CHECK `prompt_revision` XOR `draft`,
`prisma/migrations/20261020071131_ai/migration.sql`, dòng CHECK `ai_eval_runs_prompt_check`); design thay bằng `config_id` mà không giữ ảnh chụp.

**Đề xuất (kỹ thuật).** Thêm `ai_configs.version` (tăng mỗi lần sửa nháp); lần chạy lưu `config_version` (hoặc ảnh chụp nội dung như `draft` hiện nay). Cổng chỉ nhận lần chạy có
`config_version` = version hiện tại của nháp; request publish gửi `expected_version` của nháp và transaction publish kiểm nó (cùng lúc với `version` của con trỏ). Thêm
B-case: "Sửa nháp sau khi eval → `publish-check` báo `eval-required`".

---

## R3 — Critical — "Lần học" không gồm trả lời câu luyện tập

**Mục:** 10, D36; decision record D36 (bối cảnh).

**Vấn đề.** Design: "**Lần học** = một dòng `learning_log` (ôn, luyện, thêm, bỏ từ)". Decision record D36 ghi bối cảnh cho chủ dự án: "`learning_log` ghi mỗi lần ôn, luyện, thêm,
bỏ từ". Trong code, **trả lời một câu luyện tập không ghi `learning_log`**. Practice chỉ ghi khi người học bấm "Cần ôn tập" / "Đã biết" (từng câu hoặc ở màn tổng kết), là nút
tùy chọn. Ví dụ: Lan (Pro) mỗi ngày làm 2 phiên luyện tập 10 câu, không bấm hai nút đó, không ôn flashcard. Theo design, Lan "đã ngừng" sau 7 ngày, D7/D30 của nhóm Lan tụt.
Đây là đúng loại người học mà nhóm B muốn đo (người dùng câu AI). Chủ dự án chốt "tính theo lần học" dựa trên bối cảnh sai, nên đây là chỗ phải hỏi lại.

Thêm: `learning_log` của từ riêng bị xóa khi người học xóa từ đó, nên lịch sử hoạt động bị viết lại (R20).

**Bằng chứng:** `src/practice/answers/answers.service.ts:154` (trả lời chỉ gọi `learning.practiceCheck`, không ghi log); nơi ghi `learning_log`:
`src/learning/{backlog/backlog.service.ts:88, groups/groups.service.ts:115, items/items.service.ts:242, 253, practice/practice-review.service.ts:74, reviews/reviews.service.ts:62}`;
`src/learning/practice/practice-review.service.ts:74-79` (`origin: 'practice'`) chỉ được gọi từ `src/practice/reviews/practice-reviews.service.ts:34-49, 68-76` (nút);
`src/learning/quick-add/quick-add.service.ts:94` (xóa log khi xóa từ riêng); code facts §10 ghi đúng ("`origin='practice'` khi **bấm** trong phiên luyện").

**Đề xuất.** Hỏi lại chủ dự án (theo luật "chủ dự án trả lời trước"): lần học có gồm câu luyện tập đã trả lời không. Nếu có: thêm `practice_session_items.answered_at` (giữ 6
tháng, đủ cho D30). Learning không import được Practice (Practice import Learning), nên cần một port kiểu `PRIVATE_SENSES_CLEANUP` (`@Global` + `@Optional`,
`src/practice/maintenance/private-senses-cleanup.provider.ts:49-55`) hoặc tính ở Practice rồi gộp. Sửa câu bối cảnh của D36 trong decision record (R22).

---

## R4 — Important — Bỏ hai `PUT` làm vỡ CI và các script; hai `GET` "hiện tại" thành dữ liệu cũ

**Mục:** 6.6, 14 ("hiện không có, theo code facts §11").

**Vấn đề.** Code facts §11 chỉ liệt kê màn admin, không nói "không có ai khác gọi". Trong repo có bốn chỗ gọi `PUT /v1/admin/ai/operations/:op` (và smoke Bước 6 gọi cả
`PUT …/prompts/:op`):
- `apps/admin/e2e-real/support/ai-report.ts:38-48` (`chooseClozeModel`, dùng ở `m1b.real.spec.ts:31` và `ai-report.ts:106, 138, 144` để đổi qua lại `fake:ok` ↔ `fake:bad-form`).
  Đây là job CI `admin-e2e-real` (`.github/workflows/ci.yml:162`), chạy trên mọi PR: PR của P3 sẽ đỏ.
- `scripts/smoke-buoc-6.mjs:234, 389-403, 505-507`; `scripts/smoke-buoc-7.mjs:338`; `scripts/learner-test-setup.mjs:333` (`pnpm learner:setup`, test flow của chủ dự án).

Sau P3, mỗi lần các test này đổi model phải đi qua nháp → eval trên phiên bản chốt có held-out → publish (và R1 trên DB mới). Ngoài ra, §6.6 giữ "các `GET` lịch sử", nhưng
`GET /v1/admin/ai/operations` và `GET /v1/admin/ai/prompts/:op` không phải lịch sử: chúng trả model / prompt **đang dùng** từ `ai_operation_settings` / `ai_prompts`, hai bảng
mà sau P3 gateway không đọc nữa. Giữ chúng là trả số sai (`src/ai/reports/reports.service.ts:99` cũng đọc `ai_operation_settings` để hiện model trên trang Tình trạng).

**Đề xuất.** Sửa §14; thêm vào phạm vi P3: viết lại `chooseClozeModel`, hai smoke, `learner-test-setup.mjs` (cùng PR), hoặc một endpoint chỉ bật khi `AI_FAKE_ENABLED=true`
để test đặt cấu hình trực tiếp (cần ghi rõ là đường riêng cho test). Hai `GET` hiện tại: bỏ cùng hai `PUT`, hoặc đổi sang đọc cấu hình đang chạy. Trang Tình trạng và
`models.service.ts` (`used_by`, `remove`) đổi sang đọc cấu hình (R12).

---

## R5 — Important — Thao tác `judge` không vừa khung `define-operation`

**Mục:** 5.4 ("định nghĩa trong code như 6 thao tác hiện có", "Gateway kiểm khuôn như mọi thao tác"), B9.

**Vấn đề.**
1. Khung chỉ nhận trường đầu ra là chuỗi hoặc mảng chuỗi (`output: Record<string, typeof STRING | typeof STRING_LIST>`); `rawShape` từ chối mọi thứ khác. Đầu ra
   `{results: [{code, verdict, reason}]}` là mảng object → luôn `shape`.
2. B9 ("thiếu tiêu chí → sai khuôn") cần biết tiêu chí đã gửi, nhưng `checkOutput(value)` chỉ nhận đầu ra.
3. Không rõ `judge` có vào `AI_OPERATIONS` không. Nếu có: trang Tình trạng duyệt `AI_OPERATIONS` và đọc `ai_operation_settings` cho từng thao tác, nên `judge` luôn hiện
   "chưa chọn model"; P3 "tạo cho mỗi thao tác một cấu hình" sẽ tạo cả cấu hình cho `judge`; dropdown bộ ví dụ cho phép tạo ví dụ eval cho `judge`; muốn có dòng
   `ai_operation_settings` thì phải sửa CHECK. Nếu không: `ExecuteInput`, `AiMeta.operation`, `ai_calls.operation` đều dùng kiểu `AiOperation`.

**Bằng chứng:** `src/ai/operations/define-operation.ts:24, 32-43, 55`; `src/ai/operations/text-rules.ts:39-43`; `src/ai/ai.types.ts:3-6`; `src/ai/reports/reports.service.ts:99-100, 113`;
CHECK `ai_operation_settings_operation_check` (`prisma/migrations/20261022091000_buoc7_ai_operations/migration.sql`, đầu file); `ai_calls.operation` không có CHECK (đã kiểm).

**Đề xuất (kỹ thuật).** Tách hai kiểu: `GatewayOperation` (6 thao tác + `judge`) cho runner và sổ chi phí; `AiOperation` (6 thao tác) cho cấu hình, bộ ví dụ, Tình trạng.
Định nghĩa `judge` riêng ngoài `define` (hoặc mở rộng `OperationSpec` cho mảng object), với hàm kiểm nhận cả đầu vào, để B9 so đúng danh sách `code`. Ghi rõ "không chấm
được" lưu ở đâu (`ai_judge_scores.verdict` CHECK chỉ có 3 giá trị) và có thử lại không (R15).

---

## R6 — Important — Từ riêng lọt vào bộ ví dụ và vào judge

**Mục:** 7.1 (`context`), 7.2 (đầu vào lấy nguyên `practice_ai_requests.ai_input.data`).

**Vấn đề.** Design chỉ loại câu **về** từ riêng. Nhưng với `mcq_sentence` và `meaning_in_sentence`, đầu vào gửi AI có `candidates` / `other_meanings_vi` lấy từ các từ cùng nhóm
của người học, và các từ đó có thể là **từ riêng** của họ (Content trả mọi nghĩa người đó thấy được, gồm nghĩa riêng; đáp án có `option_private` cho đúng trường hợp này).
"Đưa vào bộ ví dụ" chép nguyên `ai_input.data` nên chép luôn từ riêng của Lan vào bộ ví dụ, nơi giữ mãi và mọi admin đọc được. Đây đúng là điều 26/10 câu 21.3 muốn tránh
("đưa dữ liệu riêng của Lan cho nhân viên xem mãi mãi"). Tương tự, `context` gửi judge ("các từ khác trong cùng phiên luyện") có thể chứa từ riêng; `reason` của judge có thể
nhắc lại chúng và nằm trong `ai_judge_scores` vô thời hạn, không nằm trong luồng xóa tài khoản của Bước 8.

**Bằng chứng:** `src/practice/ai/ai-question-generator.service.ts:206-222` (`practiceCandidates(userId, mateIds, …)`, `pickMcqForm`, `pickWrongMeanings` trên các từ cùng nhóm);
`src/content/practice/practice-senses.ts:49-50` (`visibleSenseCondition`: nghĩa người xem thấy được, gồm nghĩa riêng; `scope: 'catalog' | 'private'` ở dòng 17);
`src/practice/practice.types.ts:43` (`option_private`); `src/practice/reports/snapshot.ts:7-12` (chỉ báo cáo mới che).

**Đề xuất.** Khi dựng đầu vào cho "Đưa vào bộ ví dụ": bỏ câu có bất kỳ phương án riêng nào, hoặc thay phương án riêng bằng từ trong kho rồi ghi rõ trên hộp thoại. `context`
cho judge chỉ gồm từ trong kho. Thêm `ai_judge_scores` / `ai_labels` của câu thật vào danh sách việc của luồng xóa tài khoản (hoặc xóa theo `history_months` như câu). Cách
che là kỹ thuật, nhưng việc "không để từ riêng nằm trong `context` của judge" nên được chủ dự án xác nhận cùng design.

---

## R7 — Important — Held-out bị xem mà không chuyển sang dev

**Mục:** 5.1 (D10: "thấy đầu vào **hoặc** đầu ra đều tính là đã xem"), 5.3, 5.4 (gắn nhãn), 6.3 (cảnh báo).

**Vấn đề.** Design chỉ che ở danh sách ví dụ và kết quả lần chạy. Còn ít nhất năm đường khác cho thấy đầu vào / đầu ra của ví dụ held-out mà không đi qua `reveal`:
1. Trang **Các lần gọi**: mỗi lời gọi eval có `operation_id = eval-<runId>-<exampleId>`; `GET /v1/admin/ai/calls?operation_id=…` trả nguyên `request` (đầu vào) và `response`
   (đầu ra) trong 7 ngày. Test e2e `m1b.real.spec.ts:73-88` làm đúng việc này.
2. Nút **chạy thử** (≤ 5 ví dụ): không gửi `example_ids` thì lấy **5 ví dụ đầu** của bộ, có thể là held-out, và trả đầu ra. `POST …/:op/draft/test` của P3 sẽ thừa hưởng.
3. Màn **Gắn nhãn** (D16, "lần lượt từng đầu ra"): gắn nhãn một đầu ra held-out là đọc nó.
4. **So hai lần chạy** và **cảnh báo publish**: "danh sách ví dụ trước đạt nay trượt" (D17 26/10 "liệt kê từng ví dụ") nếu hiện chữ thì lộ held-out.
5. `reason` của judge thường trích câu AI.

Thêm: `reveal` làm qua `GET` có tác dụng phụ (chuyển sang dev, ghi `revealed_at`); admin web có thể tự gọi lại / prefetch.

**Bằng chứng:** `src/ai/reports/reports.service.ts:218-240` (`calls` trả `content.request`, `content.response`); `src/ai/api/admin-ai-reports.controller.ts:37-39`;
`src/ai/prompts/prompts.service.ts:190-203` (5 ví dụ đầu theo `created_at`); `src/ai/eval/eval-job.ts:82` (`callOperationId: eval-${run.id}-${exampleId}`).

**Đề xuất (kỹ thuật).** Trang Các lần gọi: lời gọi eval của ví dụ held-out trả `content: null` kèm "held-out" (hoặc coi việc xem là `reveal`, có hộp hỏi). Chạy thử: chỉ lấy ví
dụ `dev`. Màn gắn nhãn: mặc định bỏ ví dụ held-out; muốn gắn thì qua hộp hỏi `reveal`. So sánh / cảnh báo: với held-out chỉ hiện số. `reveal` là `POST`. Thêm các ca này vào §11.

---

## R8 — Important — Phần đọc / ghi xuyên module của P1, P4 chưa được thiết kế

**Mục:** 5.1 ("`forms` được điền sẵn từ kho từ … máy kiểm trong module `ai`"), 7.1, 7.2, 9 (P4).

**Vấn đề.** Theo D3, chỉ module chủ bảng được truy vấn bảng đó. Design để lại năm chỗ không làm được như đang viết:
1. **Điền sẵn `forms`** khi tạo ví dụ ở trang eval (module `ai`) cần dạng từ của Content; port ở §5.2 chỉ có `check(…)`.
2. **Chấm câu thật** ở Practice cần: điểm của bản judge (để lọc "chưa được bản judge đó chấm", bảng `ai_judge_scores` của `ai`), nội dung gốc (`ai_call_contents`, của `ai`),
   bản judge (`ai_judge_revisions`), và một lời gọi mục đích `judge` có trần USD. `AiService` hiện chỉ có `run` cho `purpose: 'learner'` và `runAdminTest`.
3. **`POST /v1/admin/ai/eval/examples/from-source`** nằm dưới `/v1/admin/ai`, nhưng dữ liệu (báo lỗi, `ai_input`, nội dung nghĩa khi dựng lại) là của Practice / Content, mà `ai`
   không import được Practice (Practice import `AiModule`). P4 ghi file chính là `src/practice/reports/**`.
4. **Lần chấm câu thật không nối được với kết quả của nó:** `practice_real_judge_runs` không có bảng ví dụ; `ai_judge_scores` khóa theo `(judge_revision_id, subject_kind,
   subject_id, criterion)`, không có `run_id`. `GET …/real-judge-runs/:id/items` không dựng được.
5. **"Chạy trong worker"**: Practice không có queue nào (chỉ `ai`, `content-pipeline`, `notifications` có BullMQ Worker). Identity cũng chưa có hàm trả danh sách staff hay ngày
   đăng ký hàng loạt (P4, P6 cần).

**Bằng chứng:** `src/ai/ai.service.ts:23-81` (các hàm public); `src/ai/ai.module.ts:48` (`exports: [AiService]`); `src/practice/practice.module.ts:40`;
`src/identity/profile/identity.service.ts` (các hàm: `getProfile`, `emailsOf`, `findUserIdByEmail`…, không có hàm staff / ngày đăng ký); `grep "new Worker("` →
`src/ai/eval/eval-queue.service.ts`, `src/content-pipeline/jobs/*`, `src/notifications/scheduler/reminder-queue.service.ts`.

**Đề xuất (kỹ thuật).** Thêm vào design một mục "API giữa các module" liệt kê: port Practice → `ai` gồm `check` và `formsOf(word, pos)`; các hàm mới của `AiService`
(`judge(…)` với `purpose: 'judge'`, `judgedSubjects(revisionId, kind, ids)`, `callContents(operationIds)`, `createEvalExample({…, source, source_ref, split: 'dev'})`);
`IdentityService.staffUserIds()`, `IdentityService.registrations(from, to)`. Đặt controller `from-source` ở Practice. Thêm `practice_real_judge_items(run_id, question_id)`
(hoặc `run_ref` trên điểm). Ghi rõ queue của lần chấm câu thật (dùng lại `ai-eval` qua `AiService` hay queue mới của Practice) và job dọn lần chấm treo (R15).

---

## R9 — Important — P2 và P3 không tách file được; danh sách file thiếu

**Mục:** 3.

**Vấn đề.** Bảng §3 hứa file riêng "để hai phiên không đụng nhau", nhưng:
- `src/ai/runner/runner.service.ts`: P3 đổi chỗ đọc prompt / selection (`:137`, `:188`, `:193`); P2 thêm mục đích `judge` và kiểm trần USD ở đường admin (`:179-201`).
- `src/ai/eval/eval-runs.service.ts` (tạo lần chạy): P2 thêm 409 `model-price-missing`; P3 đổi `prompt: 'current' | draft` sang `config_id`.
- `src/ai/eval/eval-job.ts:99-117`: P3 đổi cách dựng prompt / selection từ cấu hình; P2 thêm judge sau mỗi ví dụ và kiểm trần.
- `src/ai/runner/readiness.service.ts` (P2) phụ thuộc `SelectionReader` (`selection.ts:61-65`, P3).
- `src/ai/reports/reports.service.ts:95-113`: P3 phải đổi chỗ đọc model của Tình trạng; P2 đổi nghĩa `countToday` mà Tình trạng hiển thị.
- `apps/admin/src/features/ai/ai-api.ts`, màn tạo lần chạy (`AiEvalPage`, `EvalRunPanel`) bị cả P2 (ô judge, nhãn) và P3 (chọn cấu hình) sửa.
- `src/settings/settings.definitions.ts` và trang Cài đặt bị P1, P2, P4, P6 sửa.
- Cổng publish của P3 so "mỗi tiêu chí judge" là khái niệm của P2: không plan nào nhận việc nối hai phần nếu chạy song song.

Danh sách file cũng thiếu: `src/content/**` (P1: tra mục theo `(word, part_of_speech)`, R17), `src/identity/**` (P4, P6, R8), `src/settings/**` (P5: đọc lịch sử
`entitlements.ai_daily_cap` qua `SettingsService`; Entitlements không đọc thẳng `app_setting_changes`). P6 ghi "Phụ thuộc: —" nhưng D32 nói "chạy sau cùng".
"Sinh lại migration nếu trùng thứ tự" là đổi tên thư mục migration mà DB local của bạn có thể đã áp (`ASSUMPTION` về cách `prisma migrate deploy` xử lý).

**Đề xuất.** Chọn một trong hai (kỹ thuật): (a) chạy P3 trước P2 (P3 sở hữu `runner`, `selection`, `eval-runs`, `eval-job`; P2 làm sau trên nền đó); (b) giữ song song nhưng tách
một PR "nền" nhỏ chạy trước cả hai (thêm `GatewayOperation`, mục đích `judge`, chỗ gắn kiểm trần, `config_id` nullable) để hai plan chỉ cắm vào điểm đã có. Bổ sung file
còn thiếu; ghi rõ P6 chạy cuối hay song song.

---

## R10 — Important — Trần USD: vượt trần, cạnh, và smoke không chạm được

**Mục:** 5.5, 13, B11, §15 E7.

**Vấn đề.**
1. **Vượt trần.** Kiểm "trước mỗi lời gọi" bằng tổng `cost_usd` đã ghi. Lời gọi đang chạy chưa có dòng `ai_calls`. Một lần chạy chạy 3 ví dụ cùng lúc
   (`EVAL_JOB_CONCURRENCY`), cộng lần chấm judge, lần chấm câu thật và nút chạy thử ở process API, nên có thể vượt trần vài lời gọi. Lần thử lại `#2`/attempt 2 trong
   `callProvider` không đi qua chỗ kiểm nếu kiểm đặt ở đầu đường admin. Design không nói "trần mềm, vượt tối đa bao nhiêu".
2. **Cạnh.** §12 đòi test "đúng tại cạnh 2,00" nhưng §5.5 không nói đã tiêu đúng 2,00 thì chặn hay chưa; `admin_daily_usd_cap` có nhận `null` (không trần) hay `0` không.
3. **Chấm judge trên lần chạy đã xong** (nút D14 c) mà chạm trần: theo câu chữ §5.5, "lần chạy dừng, trạng thái `failed`", tức lần chạy **đã xong trọn** (dùng được cho
   publish) thành `failed`.
4. **Smoke.** Model `fake` luôn có giá 0 (code ép giá 0 khi thêm model `fake`), nên "đặt trần thấp" không bao giờ chạm được; chỉ trần = 0 mới chặn, và khi đó lần chạy bị chặn
   ngay lúc tạo (409), không thử được B11 (dừng giữa chừng).
5. Đổi `countToday` sang chỉ đếm `learner` cũng đổi số "lời gọi hôm nay" trên Tình trạng và dashboard (`reports.service.ts:101`); nên ghi.

**Bằng chứng:** `src/ai/ai.constants.ts:36` (`EVAL_JOB_CONCURRENCY = 3`); `src/ai/eval/eval-job.ts:75-89`; `src/ai/runner/runner.service.ts:213-254` (hai attempt trong một
lần `callProvider`); `src/ai/runner/call-ledger.service.ts:45-48`; `src/ai/models/models.service.ts:103-106` (giá `fake` = 0).

**Đề xuất (kỹ thuật).** Ghi rõ: chặn khi `đã tiêu ≥ trần`; trần mềm, vượt tối đa ≈ (số lời gọi admin đang chạy) × (giá một lời gọi); kiểm cả trước attempt 2. Trạng thái của lần chấm
judge tách khỏi trạng thái lần chạy (vd. `judge_status` / bảng lần chấm), chạm trần thì chỉ lần chấm dừng. Smoke: thêm một model giả có giá (vd. cho phép `fake` nhập giá khi
`AI_FAKE_ENABLED`), hoặc thử dừng giữa chừng bằng unit test của job và chỉ thử "409 khi tạo" trong smoke.

---

## R11 — Important — Cổng publish: các chỗ hai người làm sẽ làm khác nhau

**Mục:** 6.3, 5.3.

**Vấn đề và câu trích.**
1. "Phải có một lần chạy **xong trọn** của *C* trên **một** phiên bản đã chốt *S*". *C* có lần chạy trên S1 và S3, *L* chỉ có trên S1: cổng dùng S1 (đề thi cũ) được không? Dashboard
   §8.2 dùng "phiên bản đã chốt **mới nhất**"; cổng thì không nói.
2. "cảnh báo nếu tỉ lệ đạt của … mỗi tiêu chí judge có trên cả hai". Lần chạy của *L* có thể được chấm bằng bản judge 1, của *C* bằng bản judge 2 (D17). So hai tỉ lệ của hai bản
   judge khác nhau là so hai thước đo khác nhau: cảnh báo giả hoặc bỏ sót.
3. "xong trọn": `finished` hiện chỉ nghĩa là mọi ví dụ đã được xử lý, kể cả ví dụ `transient_failure` (timeout) hay `skipped`; và lần chạy bật judge mà một số đầu ra "không chấm
   được" (B9). Có tính là trọn không?
4. B18: cảnh báo tính lúc gọi; giữa `publish-check` và `publish`, một lần chạy mới của *L* xong làm "lần gần nhất" đổi. `acknowledge_warnings: true` xác nhận bộ cảnh báo nào?

**Bằng chứng:** `src/ai/eval/eval-job.ts:75-91` (`finish` sau khi mọi ví dụ có kết quả, bất kể `status` từng ví dụ); design §8.2, §6.3.

**Đề xuất (kỹ thuật).** *S* = phiên bản chốt mới nhất có held-out của thao tác (hoặc admin chọn, nhưng *L* phải trên đúng *S* đó). Tiêu chí judge chỉ được so khi cả hai lần chạy có
điểm của **cùng** bản judge; không thì màn đưa nút "chấm lại cả hai bằng bản judge X". "Xong trọn" = `finished` và mọi ví dụ có kết quả khuôn (không `skipped`); ví dụ lỗi tạm thời
tính là không đạt, ghi rõ. Request publish gửi kèm id hai lần chạy dùng để so (hoặc mã băm bộ cảnh báo); khác thì 409.

---

## R12 — Important — Model bị xóa hoặc mất giá khi cấu hình còn trỏ tới; số cấu hình cũ gộp nhầm

**Mục:** 6.1 (chuyển dữ liệu), 6.4, 6.5, 8.3; 4 (`ai_configs.model_ref`, `ai_judge_revisions.model_ref`).

**Vấn đề.**
1. Xóa model hiện chỉ kiểm `ai_operation_settings` và FK `ON DELETE RESTRICT` của bảng đó. Sau P3 bảng này đứng yên ("chỉ còn để đọc lịch sử"), nên model nào đang nằm trong đó
   **không bao giờ xóa được**, còn model của cấu hình đang chạy / nháp / bản trước / judge thì xóa được nếu `ai_configs.model_ref` không có FK. Design không ghi FK cho hai cột mới.
   Rollback về bản có model đã xóa: không có B-case.
2. Xóa giá model (`PATCH` đặt `price_input` = null) khi nó là model của *L*: lần chạy mốc của *L* bị 409 `model-price-missing` (R1 lặp lại theo cách khác).
3. "`number` = `revision` hiện tại của prompt (để các số `prompt_revision` cũ … vẫn đúng nghĩa)". Chỉ đúng phần prompt. Trước P3, prompt và model đổi riêng: ở B1, prompt bản 3 đã
   chạy với cả Haiku và Sonnet. Sau P3, "cấu hình 3" trên dashboard (§8.3) và bộ lọc "số cấu hình" (§7.1) gộp cả hai model làm một.

**Bằng chứng:** `src/ai/models/models.service.ts:153-157` (`remove`), `:187, 211` (`used_by` đọc `ai_operation_settings`); `prisma/migrations/20261020071131_ai/migration.sql:218` (FK RESTRICT);
code facts F3 (prompt và setting version độc lập); `ai_calls.model` và `ai_meta.model` có lưu riêng (code facts F7, §1).

**Đề xuất (kỹ thuật).** FK `RESTRICT` từ `ai_configs.model_ref` và `ai_judge_revisions.model_ref` tới `ai_models`; `remove` kiểm cấu hình `draft`/`published` và con trỏ
`previous_config_id`, judge đang `active`; bỏ FK (hoặc đặt NULL) ở `ai_operation_settings` trong migration P3. Bỏ giá của model đang có trong cấu hình đang chạy hay nháp: 409 hoặc cảnh
báo. Dashboard và bộ lọc nhóm theo `(số cấu hình, model)` cho các dòng trước P3, hoặc đánh số cấu hình mới từ một mốc riêng và ghi "trước P3" cho số cũ.

---

## R13 — Important — Rollback: đường "về xa hơn" không làm được

**Mục:** 6.2 ("Tạo nháp = chép bản đang chạy"), 6.4; decision record D24.

**Vấn đề.** §6.4: "muốn về xa hơn thì tạo nháp **từ bản cũ** và publish lại". §6.2 và §9 (`POST …/:op/draft`, không có tham số nguồn) chỉ cho chép bản đang chạy. Đường thoát duy
nhất mà design hứa không làm được. Ngoài ra chưa ghi: sau rollback *C* → *L*, *C* thành `retired` hay gì; *L* trở lại `published`; nháp đang có (nếu có) giữ nguyên hay bị bỏ;
`ai_config_events` ghi gì. Decision record D24 ghi trade-off "muốn về xa hơn thì rollback **nhiều lần** hoặc publish lại", trong khi design cấm rollback hai lần liên tiếp.

**Đề xuất (kỹ thuật).** `POST …/:op/draft` nhận `from_config_id` (mặc định bản đang chạy). Ghi bảng trạng thái cho publish và rollback. Sửa trade-off của D24 trong decision record
cho khớp design (hoặc ngược lại; cả hai đều thỏa D24 (a) "chỉ về bản publish ngay trước", nên đây là chọn kỹ thuật).

---

## R14 — Important — Dữ liệu có sẵn khi P1 migrate

**Mục:** 4 (`ai_eval_examples.split`, `expected`; "`items` Json chuyển sang bảng"), 5.1.

**Vấn đề.** DB của bạn đã có 14 ví dụ `generate_cloze` của B1 và hai lần chạy (error analysis, phần nguồn). Design không nói:
- 14 ví dụ cũ vào `dev` hay chia 30%. Chúng đều đã bị đọc (Claude đọc từng đầu ra, bạn xem lại), nên theo D10 chỉ có thể là `dev`. Chia ngẫu nhiên vào held-out là trái D10.
- Ví dụ cũ chưa có `expected` (bắt buộc với 4 thao tác, B2): "Chốt phiên bản" có nhận chúng không.
- `items` Json của hai lần chạy cũ thành dòng `ai_eval_run_items` thế nào khi không có ảnh chụp `input` (F6), và chúng có `set_id` null nên không so được (cũng nên ghi).

**Đề xuất (kỹ thuật).** Migration đặt mọi ví dụ có sẵn `split = 'dev'`, `source = 'manual'`, `expected` NULL; "Chốt phiên bản" trả 422 liệt kê ví dụ thiếu `expected`; dòng kết quả cũ chuyển
sang bảng với `input` lấy từ ví dụ nếu còn, không thì NULL, kèm ghi chú "trước P1". Thêm ba B-case.

---

## R15 — Important — When → Then thiếu các ca của chính cơ chế mới

**Mục:** 11. Theo `SPEC_WRITING_CONVENTIONS.md`, mỗi cơ chế mới cần ca biên của riêng nó. Ngoài các ca đã nêu ở R1, R2, R7, R10–R14, còn thiếu:

| Ca | Nên ra sao (đề xuất) |
|---|---|
| Xóa nháp (`DELETE …/draft`) khi một lần chạy của nháp đang `queued`/`running` | 409, hoặc hủy lần chạy trước; không để job đọc cấu hình đã mất |
| Xóa một lần chạy đã dùng làm bằng chứng publish, hoặc có nhãn người trên kết quả | Lần chạy dùng cho publish không xóa được (hoặc `ai_config_events` chụp lại số); nhãn không mất theo |
| Bấm "Chấm bằng judge" hai lần trên cùng lần chạy, cùng bản judge | Lần sau chỉ chấm đầu ra chưa có điểm; không lỗi unique, không trả tiền hai lần |
| Judge trả sai khuôn (B9) | Ghi "không chấm được" ở đâu; có thử lại khi bấm lại không; tỉ lệ judge tính trên đầu ra chấm được, màn ghi số không chấm được |
| Lần chấm câu thật (P4) chết giữa chừng, treo `running` | Job dọn như `stalled` của eval (`src/ai/maintenance/ai-maintenance.ts`) |
| Hai lần chấm câu thật cùng lúc, cùng bản judge | Một lần chạy mỗi lúc (409), hoặc lần sau bỏ câu lần trước đã nhận |
| `ai.content_retention_days = 0` | Chấm câu thật không có nguồn; màn ghi lý do thay vì "0 câu" |
| Port luật chưa được đăng ký (unit test của `ai`, hoặc process thiếu Practice) | `rule = 'skipped'` với lý do riêng, không lỗi |
| Thao tác không có luật Practice (`lookup_word`, `translate_sentence`, `check_private_word`) | "không áp dụng", khác với `skipped` (không có mục trong kho) của B6 |
| Ví dụ few-shot của cấu hình đang chạy đã hỏng (T1 chưa sửa) khi "Tạo nháp = chép bản đang chạy" | Tạo nháp được; lưu nháp bị 422 tới khi sửa (ghi rõ T2 áp lúc lưu, không lúc tạo) |
| Hai admin bấm "Chốt phiên bản" cùng lúc | Một thành công; người kia 409 (unique `(operation, version)`) |
| Reveal một ví dụ held-out đã bị xóa khỏi bộ đang soạn nhưng còn trong phiên bản chốt | Màn mở ảnh chụp; không có gì để chuyển sang dev; ghi `revealed_at` ở đâu |
| Người học được cấp `editor` sau đó, hoặc bị bỏ `editor` | Bộ lọc "tài khoản test" và loại khỏi D7/D30 dùng vai trò hiện tại; ghi rõ là tính lại cả quá khứ |

---

## R16 — Important — Kiểm thử và "Xong khi"

**Mục:** 12, 13.

**Vấn đề.**
1. Bước 7 ghi "Xong khi" gồm cả các smoke cũ vẫn qua (`smoke:buoc-4/5/6` cùng `smoke:buoc-7`) và lưu output vào `docs/deliveries/…-smoke-output.txt`. Design nhóm B không có hai
   điều này, trong khi P2 (đếm trần, giá), P3 (bỏ `PUT`) chắc chắn làm vỡ `smoke:buoc-6`, `smoke:buoc-7`, `learner:setup` và job CI `admin-e2e-real` (R4).
2. B15, B20 (hai admin sửa nháp / publish cùng lúc) chỉ kiểm thật được trên Postgres. Theo `testing-boundaries.md`, loại này là service test với Testcontainers, ở lệnh riêng; repo
   API hiện chỉ có `test:scale` (`apps/api/package.json:22-26`). §12 ghi "Service: publish và rollback (mọi 409 ở §11)" mà không nói chạy ở đâu; unit test với Prisma giả không
   chứng minh được khóa `version`.
3. Thứ tự smoke ở §13 kẹt ở bước "chạy eval bản đang chạy" trên DB mới (R1), và bước "chạm trần USD (đặt trần thấp)" không làm được với `fake` (R10).
4. Sáu plan, nhiều PR, nhiều phiên song song: chưa ghi cổng chạy thật của từng plan (đợt sửa Bước 0–3 có cổng runtime theo milestone), hay chỉ một smoke ở cuối.

**Đề xuất (kỹ thuật).** "Xong khi" thêm: `smoke:buoc-6`, `smoke:buoc-7`, `learner:setup` (sau khi sửa) và `admin-e2e-real` xanh; output lưu
`docs/deliveries/nhom-b-smoke-output.txt`. Thêm lệnh `test:integration` (Testcontainers) cho publish / rollback / nháp, hoặc ghi rõ smoke có bước chạy song song hai request.
Mỗi plan có một đoạn smoke của mình, chạy khi PR của plan đó merge.

---

## R17 — Minor — Port `EvalRuleCheck`: cơ chế và phần còn thiếu

**Mục:** 5.2, §15 E2.

**Vấn đề.** "`ai` khai báo một port `EvalRuleCheck` (**token** + interface …); Practice cung cấp implementation khi module khởi động, **như cách Practice đã dùng `AiService`**." Hai cách
đọc: (a) một Nest provider token do Practice cung cấp và `ai` inject: `AiModule` phải import `PracticeModule`, mà Practice và Content đều import `AiModule` → vòng import / DI;
(b) Practice tự đăng ký lúc `onModuleInit` vào một hàm của `AiService`. Tiền lệ đúng của (b) có sẵn: `ContentService.registerEntryUsageProbe` và
`PracticeEntryUsageProbe.onModuleInit`. Kiểm (b) an toàn: worker dựng cả `AppModule` (gồm Practice), và Worker eval chỉ bắt đầu ở `onApplicationBootstrap`, sau mọi `onModuleInit`.
"Như cách Practice đã dùng `AiService`" chỉ chiều ngược lại.

Còn thiếu: Content chưa có hàm tìm mục kho theo `(lemma, pos)` (chỉ có `practiceSenses` theo `sense_id`), phải là chỉ kho (không trúng từ riêng của ai đó); `part_of_speech =
"unspecified"` thì tra thế nào; so `forms` trong `ai` dùng chuẩn hóa nào (`normalizeAnswer` nằm ở `practice/grading`, `ai` không import được).

**Bằng chứng:** `src/practice/practice.module.ts:40`; `src/content/content.module.ts:43` (Content import `AiModule`); `src/content/content.service.ts:53`;
`src/practice/entry-usage.probe.ts:16-18`; `src/worker.ts:11-13`; `src/ai/eval/eval-queue.service.ts:36-45`; `src/content/content.service.ts:220-222`.

**Đề xuất.** Ghi rõ cách (b), đặt tên hàm đăng ký; thêm hàm Content tra theo `(lemma, pos)` chỉ trong kho vào phạm vi P1 (R9); việc so `forms` giao cho chính port (Practice), không
để `ai` tự chuẩn hóa.

---

## R18 — Minor — Vài phần quyết định bị bỏ lặng lẽ

**Mục:** 5.1, 5.4, 8.

- **D7:** bảng được giữ có dòng `generate_meaning_question` = "đáp án đúng trỏ đúng **nghĩa** mục tiêu". Design đổi `expected` thành `{"forms": […]}` và chỉ kiểm `word_in_sentence`
  là một dạng của từ, trùng với luật `checkMeaning` đã chạy. Tiêu chí "trỏ đúng nghĩa" không còn ai kiểm (code không kiểm được, cũng chưa có judge).
- **D3** (chọn): "hiệu chỉnh đầu so **hai** judge Anthropic với nhãn của bạn". Design và "Xong khi" chỉ có một judge, một model.
- **D17** (c) = (a) + (b); (a) gồm "biểu đồ đánh dấu chỗ đổi" bản judge. Dashboard §8.3 không nhắc.

**Đề xuất.** Ghi mỗi điểm vào §14 (bỏ, vì sao) hoặc thêm vào design; điểm D7 cần chủ dự án biết là tiêu chí đó chuyển sang "chờ judge".

---

## R19 — Minor — Phần thêm chưa được duyệt, không có trong §15

**Mục:** 5.5, 5.4 (B8), 7.2 (B24), 10, 9 (P6).

Không quyết định nào nói các điểm sau, và §15 (đề xuất kỹ thuật duyệt cùng design) cũng không có:
- Dựng lại đầu vào từ nội dung nghĩa khi báo lỗi quá 7 ngày (§7.2, B24); phương án nhiễu chọn mới, nghĩa có thể đã sửa (khác bản `sense_revision_id` lúc tạo câu).
- Loại tài khoản `admin`/`editor` khỏi D7/D30 (§10). D35 chỉ định nghĩa "tài khoản test" cho bộ lọc chấm câu thật.
- Chặn cả `test` (không chỉ eval) với model chưa nhập giá (§5.5). D18 chọn "không cho chạy **eval** với model chưa nhập giá".
- Nhận model `fake` làm judge (B8). D3: "judge **chỉ** Anthropic".
- Quyền `ai.view` (cả `editor`) cho `GET /v1/admin/learning/retention` (§9).

**Đề xuất.** Thêm năm dòng vào §15 (đa số hợp lý, ví dụ chặn `test` là cần để trần USD đếm được) để chủ dự án duyệt cùng design.

---

## R20 — Minor — D7/D30: các chi tiết làm hai người tính khác nhau

**Mục:** 10.

- "có lần học trong *N* ngày tính tới *d*": ví dụ Lan ngụ ý cửa sổ là `[d − 6, d]` (tính cả *d*); nên ghi thẳng.
- Ngày của lần học: `learning_log.local_date` (múi giờ của người học) hay `at` đổi sang giờ VN; nhóm tuần theo giờ VN, tuần bắt đầu thứ Hai?
- Tài khoản chưa xác nhận email vẫn nằm trong mẫu số tới khi Bước 8 dọn (`identity.unverified_cleanup_days` = 7), rồi biến mất: D7 của nhóm đổi sau đó.
- Xóa từ riêng xóa luôn `learning_log` của từ đó (`src/learning/quick-add/quick-add.service.ts:94`): "đang học" của quá khứ có thể đổi.
- Thêm vào §14 cùng ý "tài khoản đã xóa".

---

## R21 — Minor — Chia held-out ngẫu nhiên từng ví dụ

**Mục:** 5.1 ("chọn ngẫu nhiên lúc tạo").

Với 14 ví dụ và xác suất 30% mỗi ví dụ, xác suất không có held-out nào ≈ 0,7¹⁴ ≈ 0,7%; với 5 ví dụ ≈ 17%. Khi đó "Chốt phiên bản" bị B1 chặn, và không có cách nào chuyển một ví dụ
`dev` sang held-out (đúng D10: ví dụ đã xem không thể là held-out; nhưng ví dụ chưa ai xem thì có thể). Hai cách đọc "chọn ngẫu nhiên": tung đồng xu mỗi ví dụ, hay giữ tỉ lệ
(ví dụ mới vào held-out khi tỉ lệ hiện tại < 30%). 26/10 (Kiểm câu trả lời, câu 21) có ý "khi tăng tỉ lệ thì chỉ lấy thêm từ các ví dụ mới".
**Đề xuất:** giữ tỉ lệ theo bộ đang soạn (không tung độc lập), ghi rõ cả khi nhập hàng loạt không có cột `split`.

---

## R22 — Minor — Decision record so với file câu hỏi

- **D12:** dòng "Giữ nhiều ứng viên ngay" không phải một phương án được trình bày (câu 12 đưa danh sách ứng viên để đánh dấu giữ / bỏ, rồi một đề xuất). Theo luật decision record
  ("không bịa thêm phương án"), nên đổi thành "đánh dấu giữ các ứng viên khác" hoặc bỏ dòng.
- **D24:** trade-off "rollback nhiều lần hoặc publish lại" không có trong file câu hỏi và ngược design §6.4 (R13).
- **D36:** bối cảnh "`learning_log` ghi mỗi lần ôn, **luyện**, thêm, bỏ từ" sai (R3).

Các quyết định khác (D1–D11, D13–D23, D25–D35, các câu 26/10): phương án và "ai chốt" khớp file câu hỏi (xem dưới).

---

## Đã kiểm, không có vấn đề

- **Code facts F1–F11** đúng với code: F1 `call-ledger.service.ts:45-48`, `readiness.service.ts:26-39`; F2 `entitlements.service.ts:199-213`; F3 `runner.service.ts:137, 188, 193`,
  `selection.ts:61-65`; F4/F6 `eval-runs.service.ts` (tạo lần chạy lưu `exampleIds`, selection), `eval-job.ts:68-117` (đọc `input` lúc chạy, giá hiện tại); F5 `define-operation.ts`,
  `practice/ai/ai-checks.ts:29-57`; F7 `ai-question-generator.service.ts:141` (`aiMeta = {...result.meta, call_operation_id}`); F8 `unseen-questions.ts:11-24`,
  `practice-cleanup.service.ts:38-42` (D34 đúng: câu chưa hỏi giữ tới `history_months`, dùng lại không xét bản prompt / model); F9 `identity.prisma` chỉ có `staff_role`; F10
  `identity.types.ts:9-18`; F11 `ai-quality.service.ts:62-68`.
- **R17 (Bước 6):** code `src/ai/**` không import Content hay Practice (chỉ `ai.constants.spec.ts` import Content để so hằng số).
- **CHECK:** `ai_calls_purpose_check` (`learner/test/eval`) phải đổi để thêm `judge` (design ghi P2); `ai_calls.operation` không có CHECK; CHECK thao tác chỉ ở
  `ai_operation_settings`. Báo lỗi `status` CHECK `open/no_error/fixed/confirmed` (`20261022090000_buoc7_practice_ai/migration.sql:127`), trả lượt `refunds.ts:14-18`: design không đổi
  luật trả lượt, chỉ thêm đếm `confirmed` (đúng F11).
- **Publish / rollback trong một transaction** có kiểm `version` của con trỏ: máy chủ chết giữa chừng không để lại nửa trạng thái; B20 đúng về nguyên tắc (cần thêm R2, R11.4).
- **`app_setting_changes`** có lịch sử `entitlements.ai_daily_cap` (append-only, `settings.service.ts:70-75`) nên B27 làm được; trước lần lưu đầu tiên thì dùng giá trị mặc định.
- **Worker** dựng cả `AppModule` (`worker.ts:11-13`), nên port do Practice đăng ký có mặt khi job eval chạy (R17).
- **Model `fake`** luôn có giá 0 (`models.service.ts:103-106`), nên luật "không chạy với model chưa nhập giá" không làm vỡ các test dùng `fake` (khác với chuyện trần, R10).
- **Quyết định được phản ánh đúng:** D1, D4, D5 (chia plan), D6, D8, D9, D10 (30%, xem đầu vào hoặc đầu ra, hộp hỏi), D11, D12 (một judge, một tiêu chí, chưa chọn model),
  D13 (một judge = một lời gọi; muốn tách thì tạo nhiều judge: là một cách "tùy chỉnh trên giao diện"), D14, D15, D16, D19, D20, D21 (trừ R1, R2, R11), D22, D23, D25, D26, D27, D28,
  D29, D30, D31, D32 (T1 ngoài code, T2 vào K3, T3 bỏ và ghi rủi ro, T4 vào B1), D33 (mức nặng / nhẹ trong prompt judge), D34, D35, các câu 26/10: 16, 17 (cảnh báo, bắt buộc
  eval, 5 điểm %, đổi model qua cổng), 18 (con trỏ riêng, không canary), 20 (ba mức + lý do), 22, 23 (để sau), 24 (trong `apps/admin`, chỉ trên màn), 25.
- **Decision record so với file câu hỏi:** phương án và "ai chốt" khớp ở D1–D11, D13–D23, D25–D35, N1–N3 và bảng 26/10 (trừ R22). D24 ghi "Duyệt cùng design" cho 24.2 khớp
  "Kết quả chốt" (24.2 do Claude đề xuất lúc chốt).
- **Kiểm thử §12** đúng `testing-boundaries.md` ở phần lệnh mặc định chỉ unit / component, test hành vi theo role và chữ hiển thị, pin giá trị tại cạnh (29/30 nhãn, 84,9 / 85%).

## ASSUMPTION

- Cách Nest xử lý một module `@Global` (kiểu `PracticePortsModule`) vừa import `ContentModule` vừa cấp provider cho `AiModule`: chưa kiểm tài liệu Nest trong phiên này. R17 đề xuất
  cách đăng ký `onModuleInit` để không phụ thuộc điều này.
- `prisma migrate deploy` khi một migration có timestamp cũ hơn tới sau, hoặc khi một migration đã áp bị đổi tên (R9): chưa kiểm tài liệu Prisma trong phiên này.
- Anthropic / OpenAI structured output nhận mảng object lồng trong schema của judge (R5): chưa kiểm tài liệu nhà cung cấp trong phiên này.
- Số xác suất ở R21 là tính tay, không chạy code.

---

## Cách xử lý (Claude, 29/10/2026, sau khi chủ dự án bảo "sửa đi")

Mình tự kiểm lại trong code hai mục R3 (`practice/reviews/practice-reviews.service.ts:21-34`, chỉ hai nút ghi `learning_log`) và R4 (bốn chỗ gọi `PUT` trong
`apps/admin/e2e-real/support/ai-report.ts:45`, `scripts/smoke-buoc-6.mjs`, `scripts/learner-test-setup.mjs:333`) trước khi sửa. Mọi sửa nằm trong design
(`../specs/2026-10-29-nhom-b-chat-luong-ai-design.md`) và decision record.

| # | Xử lý | Ở đâu trong design |
|---|---|---|
| R1 | **Chờ chủ dự án** (Q-R1); smoke và B29 trỏ tới câu này | §0, §6.3 bước 2, §11 B29, §13 |
| R2 | `ai_configs.version`; lần chạy ghi `config_version`; publish gửi `expected_version` và id hai lần chạy | §4, §6.2, §6.3, B25 |
| R3 | **Chờ chủ dự án** (Q-R3); sửa bối cảnh D36 trong decision record | §0, §10, decision record D36 |
| R4 | `GET` đọc cấu hình đang chạy; P3 sửa e2e-real, hai smoke, `learner:setup` cùng PR, đi đường thật (E16) | §6.6, §3, §13 |
| R5 | `GatewayOperation` tách `AiOperation`; đầu ra `judge` là ba mảng chuỗi; dịch vụ judge kiểm theo tiêu chí; "không chấm được" = `verdict` NULL | §5.4, §4, B13, B14 |
| R6 | Không chấm, không đưa vào bộ ví dụ câu có phương án là từ riêng; `context` chỉ từ trong kho | §7.1, §7.2, B39 |
| R7 | Che held-out ở trang Các lần gọi, chạy thử, màn gắn nhãn, so sánh, cảnh báo; `reveal` là `POST` | §5.1, §5.3, B3, B6, B7 |
| R8 | Mục "Hàm mới giữa các module"; endpoint `from-source` ở Practice; `ai_judge_passes` + `ai_judge_pass_items` thay bảng của Practice; lượt chấm chạy ở worker `ai-eval` | §4, §7, §9 |
| R9 | Chuỗi P1 → P3 → P2 → P4 → P5, P6 song song (E12); thêm file thiếu | §3 |
| R10 | Chặn khi đã tiêu ≥ trần; `null` / `0`; trần mềm, kiểm cả lần thử lại; lượt chấm tách trạng thái; `fake` có giá khi bật fake (E15) | §5.5, B18–B20 |
| R11 | *S* = phiên bản chốt mới nhất; so judge chỉ cùng bản; định nghĩa "xong trọn"; request publish gửi id hai lần chạy | §5.3, §6.3, B11, B30 |
| R12 | FK `RESTRICT` cho hai `model_ref` mới; bỏ FK cũ; chặn xóa model / xóa giá; nhóm theo cặp (số cấu hình, model) | §4, §6.1, B34 |
| R13 | `from_config_id`; bảng trạng thái của publish và rollback; sửa trade-off D24 | §6.2, §6.4, decision record D24 |
| R14 | Ví dụ có sẵn vào `dev`, `expected` NULL, chốt bị 422; kết quả cũ chuyển sang bảng (E11) | §4 |
| R15 | Thêm các ca vào bảng When → Then | §11 (B15, B16, B26, B33, B36–B38, B41, B47 …) |
| R16 | "Xong khi" gồm `admin-e2e-real`, smoke cũ, output file, đoạn smoke từng plan; khóa song song kiểm trong smoke (E19) | §12, §13 |
| R17 | Ghi rõ cách đăng ký `onModuleInit`; hàm Content tra `(lemma, pos)`; port tự chuẩn hóa | §5.2, E2 |
| R18 | D7 "trỏ đúng nghĩa" ghi là chờ judge; D3 hai judge Anthropic có nút nhân bản và trong "Xong khi"; D17 đánh dấu chỗ đổi trên biểu đồ | §1, §5.1, §5.4, §8, §13, §14 |
| R19 | Năm phần thêm đưa vào §15 (E13, E14, E17, E18) để duyệt cùng design | §15 |
| R20 | Cửa sổ tính cả ngày *d*; ngày theo `local_date`; tuần giờ VN bắt đầu thứ Hai; loại tài khoản chưa xác nhận; rủi ro xóa từ riêng | §10, §14 |
| R21 | Luật giữ tỉ lệ (E10) | §5.1 |
| R22 | Sửa D12, D24, D36 trong decision record | decision record |
