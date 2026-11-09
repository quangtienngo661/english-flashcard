# Câu điền từ: câu đã lưu trước, chưa có thì AI viết — design

Ngày 09/11/2026. Trạng thái: quyết định đã chốt trong chat với chủ dự án ngày 09/11/2026; plan đã được duyệt (plan mode). Phạm vi: **API**.
Decision record: `docs/superpowers/decisions/2026-11-09-cloze-own-then-ai-decisions.md`. Code facts: `docs/preparation/CLOZE_MIXED_SOURCE_CODE_FACTS_2026-11-09.md`.
Delivery record: `docs/deliveries/cloze-own-then-ai.md`.

## 1. Vì sao

Quyết định A11 (đợt cải thiện A, 26/10/2026) cho phép điền từ từ câu đã lưu, nhưng API chỉ giữ **một** nguồn cho câu điền từ của cả phiên
(`practice_sessions.cloze_source` là `ai` hoặc `own`). Hệ quả: Pro bật câu đã lưu thì câu điền từ AI tự tắt, và từ chưa lưu câu nào không có câu điền từ.

Chủ dự án muốn: **từ có câu đã lưu thì ưu tiên dùng câu đó; chưa có thì AI viết; người học không dùng AI thì lấy bài tập khác thay thế.**

Ví dụ xuyên suốt: Lan (Pro) mở phiên 3 câu từ nhóm "Công việc", chọn Điền từ vào câu. Nhóm có `deploy` (Lan đã lưu "We deploy every Friday."), `mitigate` và `rollback` (chưa lưu câu nào).
Phiên cũ: Lan chọn một nguồn cho cả phiên. Phiên mới: `deploy` hỏi từ câu của Lan ("We ___ every Friday."), `mitigate` và `rollback` do AI viết; chỉ hai câu sau tốn lượt AI.

## 2. Mục tiêu, không mục tiêu

- Một nguồn mới `own_then_ai` cho `cloze_source`; hành vi của `ai` và `own` **không đổi**.
- Chọn câu theo từng từ, không thêm API đếm câu đã lưu.
- Lượt AI chỉ tính cho từ thực sự cần AI.
- **Không** đổi web: hộp Tùy chỉnh phiên hiện có không gửi nguồn mới (chủ dự án: giao diện làm cùng hộp mới).
- **Không** thêm quyền, cột, bảng mới; migration chỉ nới một ràng buộc CHECK.

## 3. Cách hoạt động

Mỗi lần hỏi về `cloze`, một từ có hai "phía":

| Phía | Dựng | Điều kiện của từ |
|---|---|---|
| câu đã lưu (`own`) | `build()` → `ownSentenceQuestion`, `source = own_sentence` | có câu đã lưu mà `maskExample` che được |
| AI (`ai`) | yêu cầu AI qua `aiSlot`/`prepare`, `source = ai` | `aiBase` (có nghĩa tiếng Việt, không phải từ chức năng, không bị đánh dấu "không nhận ra") **và không** có câu đã lưu |

Bảng chân trị của `availableTypes('cloze')` với nguồn `own_then_ai`:

| Vai hỏi | Có câu đã lưu | Đủ điều kiện AI | Kết quả |
|---|---|---|---|
| `own` | có | bất kỳ | có |
| `own` | không | bất kỳ | không |
| `ai` | có | bất kỳ | không |
| `ai` | không | có | có |
| `ai` | không | không | không |
| không nêu (lúc giữ từ khi mở phiên) | có hoặc không | có hoặc không | có khi **một trong hai** đủ |

Luồng:

1. `start`: `gate` coi `cloze` là kiểu AI (cần `ai.practice`, AI bật, chưa chạm trần, `generate_cloze` có model). Giữ từ bằng `availability` không nêu vai. Rồi hỏi thêm `availability`
   với `chosenTypes` = các kiểu AI và `clozeRole: 'ai'` cho các từ đã giữ, đưa kết quả cho `AiSessionPlanner.plan`: từ đã có câu đã lưu không có `cloze` ở phía AI nên không bị đánh dấu AI vì kiểu này.
2. `next`/`advance`: từ được đánh dấu AI đi `aiSlot` (hỏi `availability` với vai `ai`); mọi từ khác đi `ruleItem`, nơi `cloze` nằm trong danh sách kiểu quy tắc (`ruleTypesOf` thêm `cloze` khi nguồn
   là `own_then_ai`) và `build()` hỏi phía câu đã lưu.
3. `prepare` (làm trước câu AI) chỉ tạo yêu cầu cho từ mà phía AI cho phép.
4. Item trả về có `ai: boolean` = `question.source === 'ai'`, vì `session.cloze_source` không còn đủ để biết một câu là AI hay câu đã lưu.

## 4. Edge cases (When → Then)

| When | Then |
|---|---|
| từ có câu đã lưu, nguồn `own_then_ai`, chọn `cloze` | hỏi từ câu đó, `own_sentence`, không tốn lượt, `item.ai = false` |
| từ không có câu đã lưu, đủ điều kiện AI | AI viết, tốn lượt |
| từ có câu đã lưu nhưng `maskExample` không che được (câu không chứa từ) | coi như chưa có: AI viết |
| từ có câu đã lưu và phiên còn chọn `mcq_sentence`/`meaning_in_sentence` | từ vẫn có thể đánh dấu AI cho các kiểu đó; `cloze` của từ vẫn là câu đã lưu |
| từ chưa có câu đã lưu và không đủ điều kiện AI (không có nghĩa tiếng Việt, từ chức năng, bị đánh dấu "không nhận ra"), phiên không còn kiểu nào hỏi được từ này | từ bị bỏ khỏi phiên lúc mở; không còn từ nào → 409 `practice-no-words`, `no-word-fits-types` |
| vòng 2 trở đi, từ có câu đã lưu được rút vào "chỗ AI" theo xác suất | `aiSlot` hỏi vai `ai`, không có `cloze` → rơi xuống `ruleItem`, không tốn lượt |
| lượt AI không đủ cho các từ cần AI | 403 `ai-quota-insufficient` (`remaining`, `needed`), tính theo từ phía AI; không mở phiên |
| AI tắt, chạm trần, hoặc `generate_cloze` chưa có model | 503 `ai-unavailable` ngay lúc mở, kể cả khi mọi từ đã có câu đã lưu (giới hạn đã biết) |
| tài khoản Miễn phí | `features['ai.practice']` mặc định cho phép (15 lượt/tháng từ đợt chuẩn bị launch A): phiên mở được; đặt `free_ai_practice_per_cycle = 0` thì 403 `plan-required` như trước |
| AI hỏng giữa phiên, từ chưa có câu đã lưu, phiên còn kiểu quy tắc khác | từ nhận kiểu quy tắc đó, thông báo `ai-fallback` lần đầu (hành vi A3 cũ) |
| như trên nhưng phiên chỉ có `cloze` | từ bị bỏ qua lặng lẽ; không còn từ nào → `waiting_continue` (giới hạn đã biết) |
| `cloze_source: 'own_then_ai'` mà `types` không có `cloze` | 400 (refine hiện có) |
| nguồn lạ (`mixed`) | 400 |
| client cũ gửi `own` hoặc `ai` hoặc không gửi | như trước |
| item của câu từ câu đã lưu | `reportable: false` như trước (không đổi) |

## 5. Giới hạn và việc để dành

- `ai_planned` là mức tối đa (công thức không đổi): xem delivery record.
- Chưa có API đếm số từ có câu đã lưu trong phạm vi phiên, nên hộp sau này chỉ biết mức tối đa lượt AI (câu 2 của decision record, chưa chốt).
- Phần web (hộp mới) làm cùng đợt dựng hộp mới: danh sách việc ở cuối delivery record.

## 6. Kiểm

Test đỏ trước (hàm thuần `availableTypes`, `isAiType`, `QuestionBuilder`, `AiSessionPlanner`, `SessionsService`, `itemView`, schema body); `pnpm test`, lint, `tsc`, `prisma migrate diff`;
smoke mới `smoke:cloze-own-then-ai` trên API và worker thật với AI giả (kiểm cả ràng buộc CHECK trong Postgres); chạy lại `smoke:buoc-7`.
