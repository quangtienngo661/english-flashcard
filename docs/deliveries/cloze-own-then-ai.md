# Câu điền từ: câu đã lưu trước, chưa có thì AI viết — plan tóm tắt (09/11/2026)

Design: [`../superpowers/specs/2026-11-09-cloze-own-then-ai-design.md`](../superpowers/specs/2026-11-09-cloze-own-then-ai-design.md). Quyết định:
[`../superpowers/decisions/2026-11-09-cloze-own-then-ai-decisions.md`](../superpowers/decisions/2026-11-09-cloze-own-then-ai-decisions.md). Code facts trước khi sửa:
[`../preparation/CLOZE_MIXED_SOURCE_CODE_FACTS_2026-11-09.md`](../preparation/CLOZE_MIXED_SOURCE_CODE_FACTS_2026-11-09.md).
Một nhánh `feat/cloze-own-then-ai`, một PR vào `dev`. **Chỉ API**: hộp Tùy chỉnh phiên đang có trong web giữ nguyên, giao diện làm cùng đợt dựng hộp mới
(chủ dự án, 09/11/2026).

## Việc làm, theo thứ tự

1. Viết test đỏ cho nguồn mới: hàm thuần, builder, planner, service, view; chạy thấy đỏ đúng lý do.
2. Thêm giá trị `own_then_ai` cho nguồn câu điền từ: kiểu, schema của body, migration cho ràng buộc trong DB.
3. Quyết định câu điền từ là câu đã lưu hay câu AI theo từng từ (hai "phía": phía câu đã lưu, phía AI).
4. Lúc mở phiên, đánh dấu từ cần AI và tính lượt AI chỉ theo phía AI; lúc hỏi, làm trước và gọi AI chỉ cho phía AI.
5. Mỗi câu trả về có cờ `ai` (câu này do AI viết).
6. Smoke mới `smoke:cloze-own-then-ai` trên API và worker thật với AI giả; chạy lại `smoke:buoc-7`.
7. Tài liệu, mở PR.

Việc để dành cho đợt dựng hộp mới: mục cuối file này.

---

# Câu điền từ: câu đã lưu trước, chưa có thì AI viết — as-built (09/11/2026)

## Đã làm

Phiên có nguồn câu điền từ `own_then_ai` (chỉ client mới gửi; web hiện tại vẫn gửi `own` hoặc không gửi gì và chạy như cũ):

| Từ | Câu điền từ | Lượt AI |
|---|---|---|
| có câu đã lưu che được (`maskExample`) | dựng từ câu đã lưu, `source = own_sentence`, `item.ai = false` | không tốn |
| chưa có câu đã lưu, đủ điều kiện AI | AI viết, `source = ai`, `item.ai = true` | tốn như câu AI |
| chưa có câu, AI hỏng giữa phiên, phiên còn kiểu quy tắc khác | kiểu quy tắc khác đã chọn, như fallback hiện có | không tốn |

Thay đổi (đường dẫn từ `apps/api/`):

- `src/practice/practice.types.ts`: `ClozeSource` thêm `'own_then_ai'`; `isAiType('cloze', 'own_then_ai')` là true (cả phiên coi như phiên AI: cần quyền AI,
  AI đang bật, lượt AI); kiểu `ClozeRole = 'own' | 'ai'`; hàm `usesSavedSentences`.
- `src/practice/questions/question-types.ts`: `availableTypes` nhận thêm vai (`clozeRole`) trong `AiTypeFacts`; vai `own` cần câu đã lưu che được; vai `ai` chỉ nhận từ
  **không** có câu đã lưu mà đủ điều kiện AI; không nêu vai (lúc giữ từ khi mở phiên) thì một trong hai là đủ.
- `src/practice/questions/question-builder.service.ts`: `availability` nhận `clozeRole`; đọc câu đã lưu cho cả hai phía; `build` luôn hỏi phía câu đã lưu.
- `src/practice/sessions/sessions.service.ts`: `start` hỏi thêm một lần "phía AI" cho các từ đã giữ và đưa kết quả đó cho `AiSessionPlanner.plan`; `prepare` và `aiSlot`
  hỏi với vai `ai`; `ruleTypesOf` thêm `cloze` khi nguồn là `own_then_ai`.
- `src/practice/sessions/sessions.controller.ts`: body nhận `cloze_source: 'own_then_ai'` (chỉ cùng `cloze`); `session-views.ts`: item có `ai: boolean`.
- Migration `prisma/migrations/20261112150000_cloze_source_own_then_ai`: ràng buộc `practice_sessions_cloze_source_check` nhận thêm `own_then_ai`.
- `AiSessionPlanner` không đổi code: nó nhận bản đồ "phía AI" từ `start` nên không đánh dấu AI cho từ đã có câu đã lưu; thêm test cho hợp đồng đó.

Kiểm:

- Test đỏ trước: 24 test mới đỏ, test cũ không đổi; sau khi sửa code: toàn bộ API **5122 test (353 file)** xanh, `tsc` 0 lỗi, lint chỉ còn hai cảnh báo có từ trước, `prisma migrate diff` không lệch.
- Smoke `pnpm smoke:cloze-own-then-ai` trên DB sạch: 10 bước đạt, output ở [`cloze-own-then-ai-smoke-output.txt`](cloze-own-then-ai-smoke-output.txt). Đáng chú ý: Postgres thật nhận giá trị mới
  (ràng buộc CHECK); ba từ, một từ có câu đã lưu → `ai_planned 2`, từ đó hỏi từ câu đã lưu, hai từ kia do AI, lượt AI 20 → 18; cả ba từ đã lưu → `ai_planned 0`, 0 yêu cầu AI,
  lượt AI giữ nguyên; thiếu lượt (cần 2, còn 1) → 403 `ai-quota-insufficient` trước khi mở phiên; nguồn `own` và `ai` giữ nguyên.
- `pnpm smoke:buoc-7` chạy lại trên DB sạch: 30 bước đạt (một lần `ECONNRESET` keep-alive, script tự thử lại).

## Phát hiện khi làm

- **Gói Miễn phí không bị chặn AI nữa.** Từ đợt chuẩn bị launch A (M3), `freeAiPracticePerCycle` mặc định là 15, nên `features['ai.practice'].allowed` là true cho Free; chỉ khi đặt về 0 mới
  là `plan-required`. Plan nháp của phiên này từng viết "cần Pro"; smoke bắt được chỗ sai (bước 10 lần đầu), và giả định đó đã bị bỏ. Hệ quả cho hộp mới: không còn lý do khóa
  ô "Câu AI" ở Free theo kiểu "cần Pro"; Free thấy dòng lượt AI còn lại. Các mockup vòng 11–13 và khung Figma Overlay 7 đang vẽ trạng thái "AI bị khóa ở Miễn phí": cần xem lại khi vẽ hộp mới.
- Smoke đầu tiên cũng có một lỗi của chính script (xóa câu thiếu `Idempotency-Key`); đã sửa, output ở file trên là lần chạy lại trên DB sạch.

## Giới hạn đã biết

1. **`ai_planned` là mức tối đa** (công thức giữ nguyên, kiểm bằng `aiPlanned` trong `dist`). Ở vòng 2 trở đi, từ đã có câu đã lưu không bao giờ dùng AI, nhưng vẫn nằm trong số "chỗ có thể là AI".
   Phiên 10 câu trên 3 từ, một từ có câu đã lưu: đặt trước 9 lượt AI (`aiPlanned(10, 1, 1, 2, 3) = 9`), thực tế dùng ít hơn. Hệ quả: có thể bị từ chối (403 `ai-quota-insufficient`)
   khi lượt AI còn lại thực ra đủ; không bao giờ trừ quá. Chưa có test ghim riêng cho chênh lệch này.
2. **Mở phiên vẫn cần phía AI sẵn sàng**, kể cả khi mọi từ đã có câu đã lưu: `gate` kiểm quyền, AI đang bật, chưa chạm trần và `generate_cloze` có model. AI tắt thì phiên `own_then_ai`
   bị từ chối (503), dù không cần gọi AI (test ở `ai-session-planner.service.spec.ts`). Client có thể gửi `own` khi biết mọi từ đã có câu.
3. **Phiên chỉ có `cloze` (nguồn `own_then_ai`) và AI hỏng:** từ chưa có câu đã lưu bị bỏ qua lặng lẽ; nếu không còn từ nào hỏi được, phiên vào `waiting_continue` với 0 câu và
   không hiện màn "AI không dùng được" (vì `cloze` cũng nằm trong nhóm quy tắc). Có test ghim hành vi này (`sessions.ai.spec.ts`, "known limit"). Khi phiên có thêm kiểu quy tắc khác
   (hộp mới luôn nên có) thì fallback hoạt động như cũ.
4. Hộp Tùy chỉnh phiên cũ không gửi nguồn mới, nên người học **chưa thấy** thay đổi nào cho tới khi dựng hộp mới.

## Việc cho đợt dựng hộp mới (hai cột gọn, vòng 13)

- Khi bật "Điền từ vào câu bạn đã lưu" **và** chọn "Điền từ vào câu" bằng AI: gửi `cloze_source: 'own_then_ai'`; chỉ bật câu đã lưu: gửi `own` như cũ. Bỏ việc làm mờ ô AI và dòng `ownReplacesAi`
  (`messages/vi.json`, `en.json`): thay bằng một dòng nói "Từ nào đã có câu bạn lưu thì dùng câu đó, từ khác do AI viết".
- Nhãn AI và nút báo lỗi theo `item.ai` của từng câu, không theo `session.cloze_source` (`PracticeSession.tsx` `isAi`, `use-practice-session.ts` `asksAi`).
- `againBody` (`SessionSummary.tsx`) gửi lại `own_then_ai`; kiểu `StartBody.cloze_source` và `PracticeSessionView.cloze_source` thêm giá trị mới (`practice-api.ts`).
- Câu D3 của decision record (con số lượt AI trong hộp): thay bằng `practice-ai-count` (người học chọn số câu AI; con số đó là số lượt tối đa phiên dùng).
- Gói Miễn phí: xem phát hiện ở trên.

## Việc của chủ dự án

Không có việc nào trước khi dựng hộp mới. Muốn thử tay bằng API: đăng nhập learner Pro, lưu một câu cho một từ trong nhóm, `POST /v1/practice/sessions` với `types: ['cloze']`,
`cloze_source: 'own_then_ai'`, rồi gọi `next`; câu từ câu đã lưu có `ai: false`.
