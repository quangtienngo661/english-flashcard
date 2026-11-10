# Review plan — số câu AI do người học chọn (09/11/2026)

Plan: `docs/superpowers/plans/2026-11-09-practice-ai-count.md`. Đối chiếu với design `docs/superpowers/specs/2026-11-09-practice-ai-count-design.md`, decision record
`docs/superpowers/decisions/2026-11-09-practice-ai-count-decisions.md` và code trên nhánh `feat/cloze-own-then-ai` (PR #248). Chỉ đọc code, không chạy test, DB hay Docker;
các phép tính đã chạy lại bằng `node`.

## Tóm tắt

Tổng: **2 Critical, 7 Important, 14 Minor**.

Ba phát hiện quan trọng nhất:
1. **C1:** Task 6 chuyển `gate` ra sau `sourceItems` cho mọi phiên. Bốn test hiện có pin thứ tự cũ sẽ đỏ, và client cũ không gửi `ai_count` đổi hành vi. Điều này trái với Global Constraint "old behaviour exactly".
2. **C2:** Smoke bước 9 chạy ngay sau bước 8, lúc lượt AI đã bị hạ về 1. Đường cũ cần 2 lượt, nên bước 9 nhận 403 chứ không phải `ai_planned 2`.
3. **I1:** Các test service ở Task 6 khẳng định giá trị `ai_planned`, nhưng `AiSessionPlanner` trong spec là mock. Vì vậy những test này không kiểm được gì.

Các phép tính đều đúng: `markAiSenses`, `roundOneAiLimit`, `markAiSensesRandom`, `plannedFromCount`, `evenWantsAi`, `aiCapOf` (kể cả 33% của 3), `aiCapExamples` và các số của smoke (xem mục cuối).

---

## C1 — Chuyển `gate` ra sau `sourceItems` cho mọi phiên làm đỏ 4 test và đổi hành vi client cũ

- **Severity:** Critical
- **Vị trí:** Task 6:
  - "start order" bước 4: "`gate(…)` — now **after** `sourceItems`";
  - Step 4: `pnpm test` → PASS;
  - Global Constraints: "No `ai_count` in the body ⇒ old behaviour exactly".
- **Bằng chứng:**
  - Code hiện nay gọi `gate` trước khi đọc phạm vi. `sessions.service.ts:115-116`: `const snapshot = await this.aiPlanner.gate(...)`, rồi mới `const items = await this.sourceItems(...)`.
  - Doc comment của `gate` ghi rõ thứ tự này. `ai-session-planner.service.ts:36`: "Step 2, before the words are read".
  - Bốn test pin thứ tự này và sẽ đỏ:
    - `sessions.service.spec.ts:294-303`: "Free, only AI cloze → still 403 entitlement-required before reading words". Test này có `expect(calls).not.toContain('practiceItems')`.
    - `:305-309`: "the AI gate runs before the words are read". Test này có `expect(calls.indexOf('gate')).toBeLessThan(calls.indexOf('practiceItems'))`.
    - `:358-365`: "own_then_ai on a plan without ai.practice → 403 entitlement-required before any word is read".
    - `:374-380`: "a refusal of the gate stops before any word is read and before the transaction".
  - Web hiện nay không gửi `ai_count`, nên sẽ thấy hành vi khác:
    - Nhóm rỗng khi AI đang tắt: trước đây trả 503 hoặc 403, nay trả 409 `group-empty`.
    - Nhóm của người khác: nay trả 404 trước 403 `plan-required`.
    - Mỗi lần `gate` từ chối, API đọc thêm phạm vi một lần.
- **Sửa plan (đề xuất):**
  - Khi `ai_count === undefined`, giữ `gate` trước `sourceItems`. Đường cũ giữ nguyên, bốn test trên giữ nguyên.
  - Chỉ đường có `ai_count` mới gọi `gate` sau `sourceItems`. Lý do: ở `scope_words`, `count` và `k0` phụ thuộc `items.length`.
  - Task 6 Step 1:
    - thêm một test cho thứ tự mới ở đường `ai_count`, ví dụ `calls.indexOf('practiceItems') < calls.indexOf('gate')`;
    - ghi rõ bốn test trên phải còn xanh.
  - Phương án khác: chuyển `gate` cho mọi phiên. Khi đó Task 6 phải sửa bốn test này, và Global Constraints phải bỏ chữ "exactly".

## C2 — Smoke bước 9 chạy khi lượt AI đã bị hạ về 1, nên nhận 403

- **Severity:** Critical
- **Vị trí:** Task 8 Step 1, mục 8 và 9.
- **Bằng chứng:**
  - Mục 8: "Units set to 1 (same way as the cloze smoke)". Skeleton hạ lượt bằng `INSERT INTO usage_records …` (`smoke-cloze-own-then-ai.mjs:391`). Nó chỉ trả lượt lại ở một bước sau, bằng `DELETE FROM usage_records …` (`:410`).
  - Mục 9 không gửi `ai_count`, dùng `types: ['mcq_definition','cloze']` (cloze AI) trên nhóm 4 từ. Đường cũ tính:
    - `limit = ceil(4×1÷2) = 2`;
    - `aiPlanned = min(2, 2+0) = 2`;
    - `needed = 2 − số từ có câu AI chưa hỏi`.
  - Nhóm 4 từ chưa có câu AI nào: mục 6 chỉ mở phiên, không gọi `next`. Vậy `needed = 2 > remaining 1`, và `AiSessionPlanner.plan` trả 403 `ai-quota-insufficient` (`ai-session-planner.service.ts:88-93`).
- **Sửa plan:**
  - Trước mục 9, xoá các dòng `usage_records` đã chèn (như skeleton dòng 410), rồi kiểm `unitsLeft` đã về số cũ. Cách khác: đưa mục 9 lên trước mục 8.
  - Mục 8 ghi rõ dùng nhóm nào, và khẳng định các từ của nhóm đó không có câu AI chưa hỏi, để `needed` đúng bằng 2.

## I1 — Test service ở Task 6 khẳng định `ai_planned`, nhưng planner trong spec là mock

- **Severity:** Important
- **Vị trí:** Task 6 Step 1, các dòng:
  - "→ `ai_planned` 3";
  - "→ `ai_planned` 5";
  - "`ai_planned` 2";
  - "`ai_planned` equal to the target";
  - Review Focus 1 "→ `ai_planned` 5".
- **Bằng chứng:**
  - `sessions.service.spec.ts:100`: `plan: vi.fn(async () => options.aiPlan ?? { aiPlanned: 0, aiSenseIds: [] })`. Giá trị `ai_planned` ở test service là số mock tự trả.
  - Đường planner thật (`realAiPlanner: true`, `:108-111`) dựng `new AiSessionPlanner(prisma, {} as AiService, …, {} as ContentService, {} as WordChecksRepository)`. Khi có kiểu AI, `plan()` gọi `this.content.practiceSenses` trên `{}` và crash.
- **Sửa plan:**
  - Test service ở Task 6 khẳng định hai thứ:
    - **input** của `aiPlanner.plan`: `count: target`, `aiCount: K`, `placement`, `types`, `clozeSource`, `available`;
    - `data` của `practiceSession.create`: `targetCount`, `types`, `clozeSource`, `aiPlacement`.
  - Ví dụ: "percent 50, count 10, ai_count 9 → `plan` nhận `aiCount: 5`".
  - Các con số `ai_planned` để ở Task 5, nơi planner chạy thật.
  - Nếu muốn khẳng định `ai_planned` ngay ở service, Task 6 phải ghi rõ cần mở rộng fake: `ContentService.practiceSenses`, `prisma.practiceQuestion.findMany`, `AiService.isReady`.

## I2 — "`gate` not called" mâu thuẫn với bước 4 của chính Task 6

- **Severity:** Important
- **Vị trí:**
  - Task 6 "start order" bước 4: "`gate(…)` … with the possibly reduced types (null when no AI type)";
  - test "`ai_count` 0 … `gate` not called";
  - test Review Focus 4: "AI switched off (`gate` would throw 503) → 201 … `gate` not called".
- **Bằng chứng:**
  - Hôm nay `gate` luôn được gọi, và tự trả `null` khi không còn kiểu AI (`ai-session-planner.service.ts:41`). Bước 4 đọc như "vẫn gọi `gate`, với `types` đã bỏ kiểu AI".
  - Mock `aiPlanner.gate` (`sessions.service.spec.ts:99`) không xét `types`. Nếu test Review Focus 4 cho mock ném 503, mà code làm theo bước 4, thì test đỏ. `expect(gate).not.toHaveBeenCalled()` cũng đỏ.
- **Sửa plan:** chọn một cách và ghi vào plan.
  - Đề xuất: "Không gọi `gate` khi `types` sau `withoutAi` không còn kiểu AI nào". Cách này khớp chữ của spec §4 bước 5 ("API không kiểm quyền AI (gate)"). Test khẳng định `aiPlanner.gate` not called.
  - Cách khác: vẫn gọi `gate`. Test dùng `realAiPlanner: true` và khẳng định `entitlements.snapshot` not called. Planner thật trả `{0, []}` mà không đụng `ContentService` khi không có kiểu AI.

## I3 — Thêm `aiPlacement` vào `PracticeSession` làm `tsc` đỏ ở 2 fixture; Task 4 không chạy `tsc`

- **Severity:** Important
- **Vị trí:** Task 4. Step 3–4 chỉ chạy `prisma generate`, test của view và `migrate diff`. Step 5 commit ngay sau đó.
- **Bằng chứng:**
  - `apps/api/tsconfig.json` không có `include`, nên `tsc --noEmit -p tsconfig.json` kiểm cả `*.spec.ts`. CI chạy đúng lệnh này (`.github/workflows/ci.yml:62`).
  - Hai fixture dựng `PracticeSession` đủ trường mà không ép kiểu:
    - `sessions.service.spec.ts:28-33`: `sessionRow = (…): PracticeSession => ({ … aiNoticeShown: false, ...overrides })`;
    - `sessions.ai.spec.ts:48-54`: `const session: PracticeSession = { … }`.
  - Prisma sinh `aiPlacement: string | null`, là trường bắt buộc trong type. Cả hai fixture gặp TS2741.
  - Lỗi chỉ lộ ra ở Task 6 Step 4. Commit của Task 4 và Task 5 sẽ không qua typecheck.
- **Sửa plan:**
  - Task 4 Files thêm hai spec này.
  - Step 3 thêm `aiPlacement: null` vào cả hai fixture, và thêm `aiPlacement?` vào `Options` của `sessions.ai.spec.ts` (Task 7 cần trường này).
  - Step 4 thêm `pnpm exec tsc --noEmit -p tsconfig.json` → 0 lỗi.

## I4 — Task 1 bỏ sót một test mặc định, test này sẽ đỏ ở Step 4

- **Severity:** Important
- **Vị trí:** Task 1 Step 1 và Step 4.
- **Bằng chứng:**
  - `settings.definitions.spec.ts:26-44` (`'design §9: defaults are …'`) dùng `toEqual` trên toàn bộ `toApiValues(SETTINGS_DEFAULTS)`. Khối `practice` ở dòng 33-37 liệt kê đúng 9 khóa.
  - Thêm 5 khóa thì test đỏ.
  - Plan có nhắc sửa test tương tự ở `app-config.view.spec.ts`, nhưng không nhắc test này.
- **Sửa plan:** thêm vào Step 1: "Cập nhật `'design §9: defaults are …'`: khối `practice` thêm `session_max_mode: 'fixed', ai_max_mode: 'percent', ai_max_fixed: 5, ai_max_percent: 50, ai_placement: 'even'`".

## I5 — Bước 7 của Task 6 chỉ ghi `available`; với `own_then_ai` phải truyền phía AI

- **Severity:** Important
- **Vị trí:** Task 6 "start order" bước 7: `aiPlanner.plan(learner, { types, clozeSource, count: target, kept, available, aiCount: K, placement }, snapshot)`.
- **Bằng chứng:**
  - Hôm nay `sessions.service.ts:131-132` truyền `aiAvailable`: là `aiSideAvailability(...)` khi nguồn là `own_then_ai`, còn lại là `availableBySense`.
  - Spec §5: với `own_then_ai`, từ đã có câu đã lưu không nhận chỗ AI.
  - Task 6 không nhắc `aiSideAvailability` ở đâu. Biến trong `keepAvailable` cũng tên là `availableBySense`. Người làm có thể truyền nhầm nó, khi đó từ có câu đã lưu bị đánh dấu AI và tốn lượt.
- **Sửa plan:**
  - Bước 7 ghi `available: aiAvailable`, kèm câu: "`aiSideAvailability` khi `clozeSource === 'own_then_ai'`, như hôm nay; chạy sau `withoutAi`, nên `k0 = 0` không gọi nó".
  - Thêm test: `own_then_ai`, `ai_count 2` → `plan` nhận `available` của phía AI. Làm như test hiện có ở `sessions.service.spec.ts:328-348`.

## I6 — Test "K = target_count, chỉ kiểu AI → 201" không qua với cài đặt mặc định

- **Severity:** Important
- **Vị trí:**
  - Task 6 Step 1: "`ai_count` equal to `target_count` with only AI types → 201";
  - spec §8: "K = `target_count`, `types` chỉ có kiểu AI → Hợp lệ".
- **Bằng chứng:**
  - Settings giả mặc định là `SETTINGS_DEFAULTS` (`sessions.service.spec.ts:97`), tức `ai_max_mode 'percent'` 50%.
  - Khi đó `K = min(ai_count, floor(target × 50 ÷ 100)) < target` với mọi target ≥ 1. Đã chạy `node` với target 1, 2, 5, 10, 20: không lần nào K bằng target.
  - Bước 6 của Task 6 vì vậy trả 400.
  - Hệ quả sản phẩm: với mặc định, phiên toàn câu AI không mở được qua đường mới. Web hiện nay vẫn mở được vì đi đường cũ.
- **Sửa plan:**
  - Test ghi rõ cài đặt: `ai_max_mode: 'percent', ai_max_percent: 100`, hoặc `ai_max_mode: 'fixed'` với `ai_max_fixed` ≥ target.
  - Ghi hệ quả này vào as-built (Task 12) để chủ dự án thấy trước đợt web. Hành vi đúng theo D2 và D16, nhưng dễ bất ngờ.

## I7 — Không có test cho schema của `ai_count` và `ai_placement`

- **Severity:** Important
- **Vị trí:** Task 6 Step 1.
- **Bằng chứng:**
  - Spec §4 bước 6 nêu "`ai_count` âm hoặc không phải số nguyên (schema)" là một trong các lỗi 400. Spec §9 ghi "Schema body".
  - Task 6 không có test `startBody` nào cho các giá trị: −1, 2.5, `'3'`, `ai_placement: 'learner'`, `'bogus'`.
  - Các test schema hiện có gọi thẳng `startBody.safeParse` (`sessions.service.spec.ts:367-372`, `:472-483`).
- **Sửa plan:** thêm test `it('startBody: ai_count is a whole number ≥ 0; ai_placement is even or random')`:
  - `ai_count` 0 và 3 → success;
  - −1, 2.5, `'3'` → false;
  - `ai_placement` `'even'`, `'random'` → success;
  - `'learner'`, `'bogus'` → false;
  - body recall có `ai_count: 3` → success.

---

## M1 — "Change the existing test that expects 400 for count above the maximum": không có test như vậy

- **Severity:** Minor
- **Vị trí:** Task 6 Step 1, dòng đầu.
- **Bằng chứng:**
  - Chỗ trả 400 có thật: `sessions.service.ts:101-103`.
  - Tìm `maxQuestionsPerSession|max_questions|count: 2[1-9]|validation-failed` trong `apps/api/src/practice/**/*.spec.ts` và `apps/api/scripts/smoke-*.mjs`: không test hay smoke nào pin chỗ 400 này.
- **Sửa plan:**
  - Đổi dòng đó thành "Add: fixed, count 25, max 20 → `targetCount` 20, không 400".
  - Sửa comment `sessions.controller.ts:25` ("The upper bound is max_questions_per_session, checked by the service.").

## M2 — Một số yêu cầu của spec chưa có test

- **Severity:** Minor
- **Vị trí:** Task 6, Task 10.
- **Thiếu:**
  - §8 "`own_then_ai`, điền từ là kiểu AI duy nhất, mọi từ đã có câu đã lưu, K 3 → `ai_planned` 0; vẫn cần phía AI sẵn sàng": không task nào có test.
  - §8 "`scope_words`, phạm vi 0 từ → 409": chưa có test ở chế độ `scope_words`. Test này pin rằng 409 `group-empty` xảy ra trước khi `count` thành 0. Nếu thứ tự đảo, lý do sẽ thành `no-word-fits-types`.
  - §6 "Số của chế độ bị ẩn vẫn giữ, đổi lại thì thấy số cũ": Task 10 không có test.
  - §6 ví dụ lịch sử "Cách xếp câu AI: Rải đều → Ngẫu nhiên": plan chỉ đổi giá trị sang nhãn. Dialog vẫn hiện mã khóa (`SettingsHistoryDialog.tsx:51`, `<code …>{row.key}</code>`).
- **Sửa plan:**
  - Thêm ba test cho ba dòng đầu.
  - Với lịch sử, chọn và ghi rõ: hiện thêm nhãn trường, hoặc giữ mã khóa và ghi là khác ví dụ của spec.

## M3 — `scope_words` có thể hỏi lại từ; chưa quyết định lưu gì khi K tạm > 0 mà K chốt = 0

- **Severity:** Minor
- **Vị trí:** Task 6 bước 3–6.
- **Bằng chứng:**
  - Khi `k0 > 0`, `keepAvailable` giữ cả từ chỉ làm được kiểu AI (`sessions.service.ts:200-219`).
  - Từ không được đánh dấu AI thì đi `ruleItem`. Không kiểu thường nào hợp thì trả `null` và từ bị bỏ (`:540-541`).
  - Ở `scope_words`, `target = kept.length`. Vòng 1 thiếu câu nên vào `waiting_continue` (`:544-546`). Người học bấm tiếp tục thì từ bị hỏi lại.
  - Trường hợp `own_then_ai` chỉ có `cloze` cũng vậy: từ chưa có câu đã lưu mà không được đánh dấu thì bị bỏ (test "known limit" ở `sessions.ai.spec.ts:380-387`).
  - Khi K tạm > 0 mà K chốt = 0, plan không chạy `withoutAi` lần nữa. Row lưu kiểu AI và `cloze_source` gốc cùng `ai_planned 0`. Spec không nói rõ trường hợp này.
- **Sửa plan:**
  - Ghi vào as-built như known limit. Cách khác: ở đường `ai_count`, tính `target` bằng số từ hỏi được bằng kiểu thường cộng `min(K, số từ làm được AI)`.
  - Ghi quyết định cho K chốt = 0 (giữ nguyên hay chạy `withoutAi`) và thêm một test.

## M4 — Lỗi 400 chỉ phụ thuộc input chạy sau khi kiểm lượt phiên và đọc phạm vi

- **Severity:** Minor
- **Vị trí:** Task 6 bước 1–3.
- **Bằng chứng:**
  - Hôm nay lỗi 400 của `count` chạy đầu tiên (`sessions.service.ts:101-103`), trước `checkQuota` (`:107`).
  - Plan đặt hai kiểm "`ai_count > 0` mà không có kiểu AI" và "`ai_count === 0` chỉ có kiểu AI" sau early quota, `assertEntitled` và `sourceItems`.
  - Hệ quả: người học đã hết phiên nhận 403, nhóm rỗng nhận 409, thay vì 400 cho body sai.
- **Sửa plan:**
  - Đưa hai kiểm này lên đầu `start`. Chúng chỉ phụ thuộc `types`, `cloze_source` và `ai_count`.
  - Trường hợp `ai_count > 0` nhưng `aiCap(count) = 0` vẫn kiểm sau, vì cần `count`.

## M5 — Chi tiết test admin

- **Severity:** Minor
- **Vị trí:** Task 10 Step 1 và Step 4.
- **Bằng chứng và sửa:**
  - **Fixture `values()`:** `SettingsPage.test.tsx:19` cho mọi kiểu không phải bool, time, ratio, usd giá trị `10`, nên khóa dạng `choice` nhận số 10. Hệ quả:
    - `visibleFields` ẩn `max_questions_per_session`, `ai_max_fixed` và `ai_max_percent` ngay từ đầu;
    - test "chọn Bằng số từ thì ẩn ô" qua mà không kiểm gì;
    - test ví dụ 30% cần `ai_max_mode: 'percent'`.

    Sửa: fixture dùng `kind === 'choice' ? options[0]`, và test 30% tự đặt chế độ percent.
  - **Query `Select`:** plan ghi "queried by role `combobox`". Test hiện có mở `Select` bằng `getByRole('button', { name: new RegExp(label) })` rồi `getByRole('option', …)` (`AiCostsBatches.test.tsx:53-54`), với `react-aria-components` 1.22.1. **ASSUMPTION:** ở phiên bản này trigger có role `button` (suy từ việc test hiện có dùng role đó). Sửa: query giống test hiện có.
  - **Bounds của e2e:** `BOUNDS.practice` ở `e2e/support/settings.ts:36` cần thêm `ai_max_fixed` và `ai_max_percent` `{ min: 0, max: 100 }`. Plan chỉ nhắc thêm DEFAULTS.
  - **Phạm vi e2e:** Step 4 chỉ chạy `settings.spec.ts`. Nhưng `ui-guidelines.spec.ts:446-456` kiểm tab Luyện tập ở 390 px không cuộn ngang (dòng ví dụ câu AI dài), và `a11y.spec.ts` có mở `/settings`. Sửa: chạy cả `pnpm test:e2e`.

## M6 — Lỗi trên ô bị ẩn, và dòng ví dụ khi ô số đang trống

- **Severity:** Minor
- **Vị trí:** Task 10, phần Behaviour.
- **Bằng chứng:**
  - `useFocusFirstError` lấy ô lỗi đầu tiên theo `FIELD_ORDER`. Nếu `getElementById` trả `null` thì dừng (`field-errors.ts:43-44`).
  - Một draft khôi phục có thể mang `ai_max_fixed: 500` trong khi chế độ là percent. `applyPatch` chỉ kiểm `Number.isInteger` (`settings-api.ts:151`). Server trả 400 cho một ô đang ẩn: không ô nào được focus, không thấy lỗi ở ô nào.
  - `aiCapExamples` tính từ draft. Khi ô số bị xoá trống (`null`), kết quả là `NaN`.
- **Sửa plan:**
  - Ô lỗi đang ẩn thì hiện lỗi ở hàng dropdown cha, hoặc tự đổi chế độ để hiện ô đó.
  - Ẩn dòng ví dụ khi giá trị không phải số nguyên.

## M7 — Cách viết test chưa chính xác

- **Severity:** Minor
- **Vị trí và sửa:**
  - **Task 4:** `sessionView({ ...row, … })`, nhưng `session-views.spec.ts` không có fixture `row`, chỉ có `item`. Ghi rõ cần thêm builder cho row.
  - **Task 6, "`sense_ids.length` 21":** `SessionView` không có `sense_ids` (`session-views.ts:4-13`). Dùng `words` 21, hoặc `data.senseIds.length` của `create`.
  - **Task 5, "3 units needed":** chỉ thấy được qua 403. Ghi: remaining 2 → 403 `needed 3`; remaining 3 → mở phiên. Ca "aiCount 4 … 1 unit left" cũng cần ghi `count`, `kept` và cách xếp.
  - **Task 7:**
    - "every one is AI": ghi ca cụ thể, ví dụ answered 16, budget 4 → câu AI.
    - Test Review Focus 5: ghi assertion. Ví dụ: đổi settings giả sang `aiPlacement: 'random'`, kết quả vẫn như test 1.
    - Phiên phải có `continued: true` mới sang vòng 2.

## M8 — `settings/index.ts` phải export các hằng số và type mới

- **Severity:** Minor
- **Vị trí:** Task 1 Files; Task 2 Consumes.
- **Bằng chứng:**
  - `apps/api/src/settings/index.ts:1`: "The only entry point other modules (Learning, Notifications) may import from Settings".
  - Task 2 cần `AiPlacementSetting`, `SCOPE_QUESTIONS_MAX` và các type mode, nhưng `index.ts` hiện chỉ export `SETTINGS_BOUNDS`, `SETTINGS_DEFAULTS` và `AppSettings`.
- **Sửa plan:** Task 1 Files thêm `settings/index.ts`.

## M9 — Comment và chữ lặp lại giá trị sẽ thành sai

- **Severity:** Minor
- **Vị trí:** Task 1, Task 6, Task 9.
- **Bằng chứng:**
  - `sessions.controller.ts:25` (cận trên của `count`).
  - `sessions.controller.ts:16-17`: danh sách trường mà recall bỏ qua, cần thêm `ai_count` và `ai_placement`.
  - `ai.constants.ts:89`: "a session keeps at most 100 words (`max_questions_per_session`)".
  - `settings-api.ts:34`: "The 56 keys". Tên test ở `settings-api.test.ts:16` cũng ghi 56 khóa.
  - Global Constraints ghi `SCOPE_QUESTIONS_MAX = 100` "tied to `SESSION_WORDS_MAX = 99`", nhưng không có test nào fail khi hai số này lệch nhau.
- **Sửa plan:**
  - Ghi các chỗ trên vào Files của task tương ứng.
  - Thêm test `SCOPE_QUESTIONS_MAX === SESSION_WORDS_MAX + 1`, đặt ở `practice`, nơi import được cả hai.

## M10 — Git: scope của commit, và một file untracked ở Task 11

- **Severity:** Minor
- **Vị trí:** Global Constraints; Task 0 Step 3; Task 11 Step 5; Task 12 Step 3.
- **Bằng chứng:**
  - **Scope:** `docs(practice)` chưa từng xuất hiện trong `git log`. Đếm trên 300 commit gần nhất:
    - `docs(deliveries)`: 17;
    - `docs(mockups)`: 10;
    - `docs(design)`: 7;
    - `docs(plans)`: 3.

    Global Constraints ghi scope `api, admin, docs`, mâu thuẫn với chính Task 0, Task 12 (`docs(practice)`) và Task 11 (`docs(mockups)`).
  - **File untracked:** Task 11 Step 5 ghi vào `docs/mockups/2026-11-05-redesign-concepts/app-redesign-plan.md` rồi commit. Cả thư mục này đang untracked: `git ls-files` không trả gì, `origin/dev` cũng không có. Commit file này đưa một tài liệu chủ dự án đọc lên PR. Ghi nhớ của dự án nói loại tài liệu này chỉ push khi chủ dự án yêu cầu.
- **Sửa plan:**
  - Global Constraints liệt kê `api, admin, design, deliveries, mockups`. Task 0 dùng `docs(design): …`, Task 12 dùng `docs(deliveries): …`.
  - Task 11 chỉ ghi node id vào `docs/deliveries/practice-ai-count.md` (Task 12 đã có mục này), hoặc hỏi chủ dự án trước khi commit `app-redesign-plan.md`.

## M11 — Chi tiết smoke

- **Severity:** Minor
- **Vị trí:** Task 8.
- **Bằng chứng và sửa:**
  - **Bộ lọc Ưu tiên:** spec §9 ghi "`scope_words` với Ưu tiên 4 từ". Smoke lại dùng một nhóm 4 từ riêng với `group_filter` `all`. Bộ lọc `priority` đi qua scope `group-priority` (`practice-reads.service.ts:38`) và chưa được thử. Sửa: dùng nhóm 10 từ, đánh dấu 4 từ ưu tiên, gửi `group_filter: 'priority'`.
  - **Nạp từ:** skeleton nạp 3 động từ vào một cặp topic/level (`smoke-cloze-own-then-ai.mjs:289`) rồi thêm vào nhóm theo topic/level (`:322`). Smoke mới cần 10 + 4 từ. Ghi rõ dùng hai cặp topic/level, hay thêm theo sense id.
  - **Hàm đi phiên:** `walk` của skeleton chỉ nhận `type === 'cloze'`. Với `mcq_definition`, hàm phải trả lời theo `answer_key.correct_index` đọc từ DB.
  - **Smoke chạy lại:** `start()` đổi cho mọi phiên, nên chạy lại cả `smoke:buoc-4` (phiên không AI, có `count 20`) và `smoke:dot-cai-thien-c` (mở phiên Ôn và phiên luyện tập).

## M12 — Chữ và bố cục admin lệch mockup và spec

- **Severity:** Minor
- **Vị trí:** Task 9, bảng copy và layout.
- **Bằng chứng:**
  - **Nhãn:** mockup đặt nhãn "Số câu tối đa mỗi phiên" (`vong-14-so-cau-ai.html:331`) và "Số câu AI tối đa mỗi phiên" (`:342`) cho hàng dropdown. Plan dùng "Cách tính số câu…" và "Cách tính số câu AI…".
  - **Gợi ý:** gợi ý trong mockup có "0 = không có câu AI, không vượt số câu của phiên" và "làm tròn xuống" (`:396-397`). Copy của plan không có `zeroMeaning.ai_max_fixed` và không có ghi chú làm tròn xuống.
  - **Thứ tự ô:** spec §6 ghi "Ba ô dropdown mới, đặt ngay dưới 'Số câu mặc định'". Mockup lại đặt dropdown số câu tối đa lên đầu. Plan theo mockup, nhưng không nói ra.
- **Sửa plan:** chốt nhãn (theo mockup hoặc giữ nhãn của plan), thêm hai chuỗi trên, và ghi một dòng rằng thứ tự theo mockup.

## M13 — Danh sách việc cho đợt web (Task 12) còn thiếu

- **Severity:** Minor
- **Vị trí:** Task 12 Step 1, danh sách "the web tasks for the new dialog".
- **Bằng chứng:**
  - `againBody` (`SessionSummary.tsx:29-39`) gửi lại `types`, `count: target_count`, và `cloze_source` chỉ khi là `'own'`. Khi hộp mới gửi `ai_count`:
    - "Luyện thêm một phiên" quay về cách chia cũ;
    - `types` đã lưu bị rút gọn khi `ai_count 0`;
    - `own_then_ai` đã lưu thành `own`.
  - Trong lúc chờ đợt web: ở `scope_words`, hộp hiện nay vẫn chặn số câu ở `max_questions_per_session` (`CustomizeDialog.tsx:85`). Trang admin lại ẩn ô này ở chế độ đó.
- **Sửa plan:** thêm hai ý này vào as-built.

## M14 — Planner vẫn đọc câu AI chưa hỏi khi `aiCount` = 0

- **Severity:** Minor
- **Vị trí:** Task 5.
- **Bằng chứng:**
  - Ca: K tạm > 0, K chốt = 0, kiểu AI còn trong `types`.
  - `plan()` vẫn chạy `findUnseen` cho từng từ làm được AI (`ai-session-planner.service.ts:65-73`), dù sau đó `limit = 0`.
- **Sửa plan:** thêm `if (input.aiCount === 0) return { aiPlanned: 0, aiSenseIds: [] }` ngay sau kiểm `aiTypes` và `snapshot`.

---

## Đã kiểm và thấy đúng

**Phép tính** (chạy lại bằng `node`, giải thuật đúng như plan mô tả):
- `markAiSenses`: 3 trên 10 từ → `s4, s7, s10`.
- `roundOneAiLimit`:
  - (4, 10, 10) → 4;
  - (8, 20, 8) → 3;
  - (5, 20, 8) → 2;
  - (3, 4, 4) → 3.
- `markAiSensesRandom`:
  - `() => 0` → `a, b, c, g`;
  - `() => 0.999` → `b, g, i, j`;
  - limit 0 → `[]`;
  - `{z}` → `a`;
  - limit 20 → đủ 10 từ.
- `plannedFromCount`: 3, 8, 0.
- `evenWantsAi` (planned 8, target 20): true, false, true, false. Chuỗi vòng 2 trở đi ra `100101001010`, tổng 8 câu AI.
- `aiCapOf`:
  - 50% của 7, 10, 20, 1 → 3, 5, 10, 0;
  - 10% của 5 → 0;
  - 100% của 10 → 10;
  - 0% của 10 → 0;
  - 33% của 3 → 0;
  - fixed 5, 15, 0 với 10 → 5, 10, 0.
- `aiCapExamples`: 3/5/10; 5/5/5; 2/3/6.
- `sessionMaxOf`: các ca trong plan.
- Smoke:
  - mục 2: K 3;
  - mục 3: K 5;
  - mục 4: target 20, đường cũ `ai_planned` 10 ≤ 17 lượt;
  - mục 6: count 4, K 2;
  - mục 7: hai ca 400;
  - mục 9: `ceil(4×1÷2) = 2`. Phép tính đúng, chỉ sai thứ tự chạy (xem C2).

**Khẳng định về code:**
- `start()` hiện nay gọi `gate` trước `sourceItems` (`sessions.service.ts:115-116`). Plan nói đúng.
- Lỗi 400 cho `count` vượt mức tối đa có ở `:101-103` và dùng đúng `ProblemDetailsException` mà plan trích.
- `withDefaults` lấp khóa mới và trả về mặc định cho giá trị lưu sai, qua `fieldSchema(...).safeParse` (`settings.definitions.ts:374-384`). `z.enum` sẽ loại `'bogus'`.
- `crossFieldViolations` ở `:339-348` là chỗ cần đổi.
- `startBody` là `strictObject`, nên recall nhận và bỏ qua trường mới. `startRecall` không đọc các trường đó.
- Hash idempotency băm cả body (`idempotency.interceptor.ts:50`), nên trường mới không làm sai replay.
- Ngoài `sessions.service.ts` và `session-views.ts`, không chỗ nào đọc `types` hay `cloze_source` của phiên. Lịch sử và báo lỗi không bị ảnh hưởng khi lưu `types` rút gọn.
- `prepare`:
  - lấy cửa sổ từ `aiSenseIds` theo thứ tự của `senseIds` (`:290`);
  - `markAiSensesRandom` trả kết quả theo thứ tự `kept`, nên không cần đổi `prepare`;
  - `aiStopped` không đổi.
- `wantsAi(session, senseId, round, budget, left, ruleCount)` ở `:577-581`, và `answered` ở `:502`, khớp với Task 7.

**Migration:**
- Migration mới nhất là `20261112150000_cloze_source_own_then_ai`. `20261113090000_…` đứng sau.
- Kiểu `text` khớp `String?`.
- CHECK constraint không ảnh hưởng `migrate diff`.

**Admin:**
- Hiện có 56 khóa, tab Luyện tập 9 khóa. Sau khi đổi: 61 khóa, tab Luyện tập 14 khóa, `[5, 6, 14, 22, 2, 10, 1, 1]`.
- Gợi ý của `default_questions_per_session` lấy từ `settings.cross.default_questions_per_session` ("và ≤ số tối đa"), qua `CROSS` trong `SettingsField.tsx:43, 57`. Plan nói đúng nguồn.
- Đã có `Select` dùng cho giờ gửi nhắc.
- `changedValues` và `applyPatch` hoạt động theo layout, nên ô ẩn vẫn giữ giá trị và vẫn được gửi khi lưu, đúng ý spec.
- Test e2e hiện có dùng ô `max_questions_per_session` (`e2e/settings.spec.ts`), nên việc plan thêm `session_max_mode: 'fixed'` vào DEFAULTS của e2e là cần.

**CI và quy trình:**
- `ci.yml` chạy cho api: lint, `tsc`, build, unit, schema drift; cho admin: lint, typecheck, unit, build, e2e mocked.
- Nhánh `feat/practice-ai-count` từ `origin/dev` sau PR #248, một PR vào `dev` qua `ship-pr`, title `feat(api): …` dưới 72 ký tự: đúng `CLAUDE.md` và `git-conventions.md`.
- Có plan tóm tắt ở `docs/deliveries/practice-ai-count.md` và có decision record.

**Độ phủ spec:**
- Các dòng §8 còn lại đều có task và test: không gửi `ai_count`; 1 từ; 300 từ; 24/21 từ; `count` 25; không gửi `count`; percent 50 với 7; percent 10 với 5; fixed 15; `ai_count` 0 cả ba ca; `ai_count` 3 không kiểu AI; K 3 chỉ kiểu AI; 5/3 từ; câu AI có sẵn; lượt 1/2; `even`/`random`; `learner` không gửi; admin đổi giữa phiên; phiên Ôn.
- Các dòng còn thiếu ghi ở M2, I6 và I7.

**Figma:** node id 55:306, 140:4049, 141:4147, 141:4320, 131:4524, 138:319, 138:398, 166:326 là **ASSUMPTION**, vì review này không mở Figma. Chữ trong các panel khớp mockup vòng 14: "Tối đa 3 câu AI, vì bạn còn 3 lượt", "Hết lượt câu AI tháng này.", "Trong đó …", hai câu lỗi, "Từ nào đã có câu bạn lưu …".
