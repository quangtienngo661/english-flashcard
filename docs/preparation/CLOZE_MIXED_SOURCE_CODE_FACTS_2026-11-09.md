# Code facts: trộn câu đã lưu và câu AI trong câu điền từ (09/11/2026)

Việc: chủ dự án chốt (09/11/2026) đổi hành vi "bật câu đã lưu thì câu điền từ AI tự tắt" (A11, đợt cải thiện A) thành
**"từ có câu đã lưu thì dùng câu đó, từ chưa có thì để AI viết"**. File này ghi code hiện tại, đọc ngày 09/11/2026 trên nhánh
`docs/ai-setup-approved` (trùng `dev` ở phần code). Đường dẫn tính từ gốc repo.

**Đây là ảnh chụp code TRƯỚC thay đổi.** Thay đổi đã làm (nguồn `own_then_ai`) ghi ở `docs/deliveries/cloze-own-then-ai.md`; các số dòng dưới đây không còn khớp sau khi sửa.

## 1. Hiện tại: một nguồn câu cho cả phiên

- `cloze` là **một** kiểu câu. Nguồn câu của nó là một giá trị cho cả phiên: `ClozeSource = 'ai' | 'own'`
  (`apps/api/src/practice/practice.types.ts:13`).
- Cột `practice_sessions.cloze_source` kiểu `TEXT`, có ràng buộc `CHECK ("cloze_source" IN ('ai', 'own'))`
  (`apps/api/prisma/migrations/20261022090000_buoc7_practice_ai/migration.sql:24,131`; model `apps/api/prisma/models/practice.prisma:23`).
  Thêm giá trị mới phải có migration sửa CHECK.
- Body `POST /v1/practice/sessions`: `cloze_source: z.enum(['ai', 'own']).optional()`, chỉ hợp lệ khi `types` có `cloze`
  (`apps/api/src/practice/sessions/sessions.controller.ts:28,32`).
- Mặc định: `clozeSource = types.includes('cloze') ? input.cloze_source ?? 'ai' : null` (`sessions.service.ts:113`).

## 2. Một kiểu câu là AI hay quy tắc: quyết định theo cả phiên

- `isAiType(type, clozeSource)`: `meaning_in_sentence`, `mcq_sentence` luôn là AI; `cloze` là AI khi nguồn là `'ai'`
  (`practice.types.ts:18-20`). Câu điền từ từ câu đã lưu là câu quy tắc, không tốn lượt AI.
- Phiên chia kiểu câu thành hai nhóm bằng hàm này: `aiTypesOf` và `ruleTypesOf` (`sessions.service.ts:536-543`).
  Với nguồn `own`, `cloze` nằm ở nhóm quy tắc; với `ai`, ở nhóm AI. **Không có trường hợp một từ dùng câu đã lưu, từ khác dùng AI.**
- Chọn câu cho một từ (`advance`, `sessions.service.ts:509-524`): nếu từ được đánh dấu AI (`wantsAi`) thì thử `aiSlot` với
  `aiTypes`; không được thì rơi xuống `ruleItem` với `ruleTypes` (B7E47).

## 3. Một từ nhận được câu điền từ khi nào

- `availableTypes` (`apps/api/src/practice/questions/question-types.ts:29`):
  nguồn `own` → chỉ khi từ có câu đã lưu mà `maskExample` che được (`ownSentence`); nguồn `ai` → khi `aiBase`
  (có nghĩa tiếng Việt, không phải từ chức năng, không bị đánh dấu "không nhận ra").
- `ownSentence` tính trong `QuestionBuilder.aiFacts` bằng `content.listSentences` (`question-builder.service.ts:89-90,110`);
  chỉ đọc câu đã lưu khi nguồn là `own`.
- `build()` (đường quy tắc) dựng câu điền từ từ câu đã lưu bằng `ownSentenceQuestion` (`question-builder.service.ts:131-143`);
  `extra` chỉ có khi nguồn là `own` (`:135`).
- Từ không còn kiểu nào hỏi được thì bị bỏ khỏi phiên lúc mở (`keepAvailable`, `sessions.service.ts:183-202`); không còn từ nào
  → lỗi `no-word-fits-types` (`:128`).

## 4. Lượt AI

- `gate` chạy trước khi đọc từ: có kiểu AI thì cần `ai.practice`, AI đang bật, chưa chạm trần, từng operation sẵn sàng
  (`apps/api/src/practice/ai/ai-session-planner.service.ts:40-49`). Câu đã lưu không qua cổng này (mọi gói, đợt cải thiện A C3).
- `plan`: từ "có thể AI" là từ có ít nhất một kiểu AI hỏi được (`:61`); số từ đánh dấu AI tối đa `ceil(count × số kiểu AI ÷ số kiểu)`
  (`:74`, `ai-plan.ts:18-21`); kiểm `pool.remaining` với số cần (`:85-93`).
- Web ước lượng cùng công thức: `ceil(count × aiChosen ÷ chosenTypes)` (`apps/web/src/features/learner/practice/CustomizeDialog.tsx:112-115`).
  Không có API đếm số từ có câu đã lưu trong phạm vi phiên (A11).
- Làm trước (`prepare`) và ô AI (`aiSlot`) gọi `availability` với `aiTypes` và nguồn của phiên (`sessions.service.ts:283-286,581-583`).

## 5. Câu đã lưu được ghi là gì

- `practice_questions.source` ∈ `'rule' | 'ai' | 'own_sentence'` (CHECK ở migration Bước 7 `:135`; `QuestionSource` `practice.types.ts:12`).
- Item trả cho web **không có** `source`; chỉ có `reportable` tính từ `question.source` (`apps/api/src/practice/sessions/session-views.ts:45-46`).

## 6. Web

- Công tắc riêng "Điền từ vào câu bạn đã lưu" (`OwnSentencesToggle`), nhớ trên máy (`CustomizeDialog.tsx:91,210`).
- Loại trừ: bật câu đã lưu thì ô `cloze` AI bị tắt và mờ, kèm dòng `ownReplacesAi`
  (`AiTypesToggle.tsx:87-93`; `CustomizeDialog.tsx:108`; chữ ở `apps/web/messages/vi.json:1262`).
- Gửi lên: `types` có `cloze` khi bật câu đã lưu, và `cloze_source: 'own'` (`CustomizeDialog.tsx:109,149`);
  `StartBody.cloze_source?: 'own'`, `PracticeSessionView.cloze_source: 'ai' | 'own' | null` (`practice-api.ts:40,61`).
- Web suy ra câu nào là AI **theo cả phiên**:
  - nhãn AI và loại báo lỗi: `isAi(item, session)` = kiểu AI hoặc `cloze` khi `session.cloze_source === 'ai'` (`session/PracticeSession.tsx:193-194`);
  - có làm trước câu AI không: `asksAi` (`session/use-practice-session.ts:103-104`);
  - "Luyện thêm một phiên" gửi lại `cloze_source: 'own'` (`session/SessionSummary.tsx:36`).
- Admin chỉ đọc `question.source` trên dashboard (`apps/admin/src/features/dashboard/DashboardPage.tsx:30`), không đọc `cloze_source`.

## 7. Test và smoke đụng tới

- API: `sessions.service.spec.ts`, `sessions.ai.spec.ts`, `question-types.spec.ts`, `practice.types.spec.ts`,
  `ai-session-planner.service.spec.ts` (trong `apps/api/src/practice/`).
- Web: `ai-toggle.test.tsx`, `practice-home.test.tsx`, `session/practice-session.test.tsx`, `session/ai-questions.test.tsx`,
  `session/ai-states.test.tsx`; e2e `apps/web/e2e/app/m4.spec.ts`, `m5a.spec.ts`, `cai-thien-a-practice.spec.ts`, `cai-thien-a-speak.spec.ts`.
- Smoke có `cloze_source`: `apps/api/scripts/smoke-buoc-7.mjs`, `smoke-nhom-b.mjs`, `smoke-session-synonyms.mjs`.

## 8. Tài liệu nhắc hành vi cũ

- Quyết định A11: `docs/superpowers/decisions/2026-10-26-dot-cai-thien-a-decisions.md` (mục A11).
- Câu hỏi 14: `docs/superpowers/reviews/2026-10-26-dot-cai-thien-questions.md:234-244`.
- Code facts đợt A: `docs/preparation/DOT_CAI_THIEN_A_CODE_FACTS_2026-10-26.md` (mục A).
