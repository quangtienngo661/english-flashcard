# Số câu AI do người học chọn — plan tóm tắt (09/11/2026)

Design: [`../superpowers/specs/2026-11-09-practice-ai-count-design.md`](../superpowers/specs/2026-11-09-practice-ai-count-design.md).
Quyết định: [`../superpowers/decisions/2026-11-09-practice-ai-count-decisions.md`](../superpowers/decisions/2026-11-09-practice-ai-count-decisions.md).
Plan: [`../superpowers/plans/2026-11-09-practice-ai-count.md`](../superpowers/plans/2026-11-09-practice-ai-count.md).

Phạm vi: API, giao diện admin, Figma; không viết web người học. Một nhánh `feat/practice-ai-count` từ `dev`, mở sau khi PR #248 đã vào `dev`; một PR.

## Việc làm, theo thứ tự

0. Tạo nhánh từ `dev` (sau PR #248), commit design, decision record, plan, review và file này; mockup giữ ở máy.
1. Thêm 5 cài đặt luyện tập: cách tính số câu tối đa, cách tính và mức câu AI tối đa, cách xếp câu AI. Trả các cài đặt này cho web qua `app-config`.
2. Viết các hàm tính: số câu tối đa của phiên, số câu AI tối đa, kiểu xếp, bỏ kiểu AI khi số câu AI là 0.
3. Viết các hàm xếp câu AI: số câu AI ở vòng 1, đánh dấu ngẫu nhiên, luật rải đều cho vòng sau.
4. Thêm cột lưu kiểu xếp câu AI của phiên (migration), trả trong session view.
5. Bộ lập kế hoạch AI nhận số câu AI người học chọn.
6. Mở phiên với `ai_count`: hạ số thay vì báo lỗi, chế độ theo số từ không hỏi lại từ, 3 lỗi 400 mới. Không gửi `ai_count` thì chạy như cũ.
7. Rải đều câu AI ở vòng 2 trở đi.
8. Smoke mới trên API và worker thật (AI giả), chạy lại hai smoke cũ.
9. Admin: kiểu ô chọn một, thứ tự ô trong tab Luyện tập, nhãn tiếng Việt.
10. Admin: ô dropdown, ẩn hoặc hiện ô số theo chế độ, dòng ví dụ số câu AI, lịch sử ghi nhãn tiếng Việt, e2e.
11. Figma: vẽ lại hộp Tùy chỉnh phiên (Overlay 7) và bảng trạng thái theo mockup vòng 14.
12. Viết as-built, trỏ từ CLAUDE.md, mở PR.

# Số câu AI do người học chọn — as-built (09/11/2026)

Nhánh `feat/practice-ai-count` từ `dev` sau khi PR #248 vào `dev` (merge `50b632e7`). Làm theo plan, Task 0–12; các chỗ lệch plan ghi ở cuối.

## Đã làm

**API (`apps/api`)**
- 5 cài đặt mới trong `practice`: `session_max_mode` (`fixed` | `scope_words`, mặc định `fixed`), `ai_max_mode` (`fixed` | `percent`, mặc định `percent`),
  `ai_max_fixed` (0–100, mặc định 5), `ai_max_percent` (0–100, mặc định 50), `ai_placement` (`even` | `random` | `learner`, mặc định `even`).
  Cài đặt dạng chọn một là loại mới: `z.enum`, không có bound; JSON lưu từ trước nhận mặc định, giá trị lạ về mặc định. Kiểm "mặc định ≤ tối đa" chỉ ở `fixed`.
  `GET /v1/me/app-config` trả thêm 5 trường và `scope_questions_max` (100). File: `src/settings/settings.definitions.ts`, `app-config.view.ts`, `index.ts`.
- Hàm thuần: `src/practice/sessions/session-limits.ts` (`sessionMaxOf`, `aiCapOf`, `placementOf`, `withoutAi`, `ruleTypesFor`);
  `src/practice/ai/ai-plan.ts` thêm `roundOneAiLimit`, `markAiSensesRandom`, `plannedFromCount`, `evenWantsAi`.
- Cột `practice_sessions.ai_placement` (`even` | `random` | null), migration `20261113090000_practice_session_ai_placement`; session view có `ai_placement`.
- `POST /v1/practice/sessions` nhận `ai_count` (số nguyên ≥ 0) và `ai_placement` (`even` | `random`). Không gửi `ai_count`: chia câu AI như cũ, `gate` vẫn chạy
  trước khi đọc từ, `ai_placement` null. Thay đổi chung cho mọi client: `count` quá mức tối đa bị hạ, không còn 400; chế độ `scope_words` áp cho cả client cũ.
  Có `ai_count`: đọc từ trước, tính K tạm từ `count`; K tạm 0 thì bỏ kiểu AI và không gọi `gate`; K chốt theo `target_count`; planner nhận K và cách xếp.
  File: `sessions.controller.ts`, `sessions.service.ts`, `src/practice/ai/ai-session-planner.service.ts`.
- Vòng 2 trở đi: phiên `even` dùng luật rải đều; phiên `random` và phiên cũ giữ xác suất r ÷ q. Cách xếp đọc từ dòng phiên, admin đổi giữa chừng không ảnh hưởng.
- Smoke mới `pnpm smoke:practice-ai-count` (`scripts/smoke-practice-ai-count.mjs`).

**Admin (`apps/admin`)**
- `FieldSpec.kind` thêm `choice` (`options`, `showWhen`); `visibleFields`, `parentOf`, `aiCapExamples` trong `src/features/settings/settings-api.ts`. Tổng 61 khóa;
  tab Luyện tập theo thứ tự mockup: Số câu tối đa (chọn một + ô Mức cố định), Số câu mặc định, Số câu AI tối đa (chọn một + ô Mức cố định hoặc Tỉ lệ, dòng ví dụ),
  Cách xếp câu AI.
- `SettingsField.tsx` vẽ ô chọn một bằng `Select`; `SettingsPage.tsx` gộp ô số phụ vào hàng của ô chọn (`role="group"`), lỗi của ô đang ẩn hiện ở hàng cha và focus
  vào select; `SettingsHistoryDialog.tsx` hiện nhãn trường (ô phụ có tiền tố nhãn cha) và nhãn giá trị ("Rải đều → Ngẫu nhiên"). Chuỗi vi/en trong `messages/*.json`.
- e2e mocked: fixtures `e2e/support/settings.ts` có 5 khóa mới; test mới ở `e2e/settings.spec.ts`.

**Figma** (file `JKnyUUtGjpGpfKK4PqBfdY`, trang "App người học", Overlay 7)
- Ba khung chính (desktop 140:4049, phone 141:4147, phone cuộn 141:4320): công tắc "Câu AI viết" thành ô − / + ở 0 (169:5265, 169:5273, 169:5281);
  dòng "Tối đa 5 câu AI · còn 280 lượt" dưới tiêu đề; hai hàng câu AI mờ.
- Bảng trạng thái 131:4524: bỏ "AI khóa ở Miễn phí"; ô 143:4319 thành "Câu đã lưu + AI"; ô mới 169:5306 "3 câu AI", 169:5328 "Còn 3 lượt",
  169:5349 "Hết lượt", 169:5372 "Để người học chọn", 169:5387 "Theo số từ", 169:5413 hai dòng lỗi.
- Mockup: artifact "Số câu AI và cài đặt luyện tập" (https://claude.ai/artifact/XfUFzh8YsXnRVwTYTE2uAy), bản ở máy `docs/mockups/2026-11-05-redesign-concepts/vong-14-so-cau-ai.html`.

## Kiểm

- API: `pnpm test` 354 file, 5202/5202 pass; `tsc` 0 lỗi; lint 2 cảnh báo có từ trước ở file không đụng; drift check sạch.
- Admin: `pnpm test` 105 file, 1406/1406 pass; typecheck 0 lỗi; lint sạch; `pnpm test:e2e` (mocked, cả desktop và mobile, gồm `ui-guidelines` và `a11y`) 304 passed.
- Smoke trên API và worker thật, AI giả, mỗi smoke một DB mới: `smoke:practice-ai-count` 14/14; `smoke:buoc-4`, `smoke:buoc-7`, `smoke:cloze-own-then-ai`,
  `smoke:dot-cai-thien-c` đều pass. Output: `docs/deliveries/practice-ai-count-smoke-output.txt`.
- Figma: chụp 4 khung trước và sau; phone giữ lề 16 px, nút − / + 44 × 44, màu và bo góc gắn biến.
- Chưa thử với AI thật; chưa có web người học gửi `ai_count`.

## Giới hạn đã biết

- Mặc định 50%: phiên chỉ có kiểu câu AI không mở được bằng đường mới (400), vì số câu AI luôn nhỏ hơn số câu (review I6; câu hỏi mở trong plan, giữ 400 theo D16).
- Chế độ `scope_words`: từ giữ lại chỉ hợp kiểu AI mà không được đánh dấu AI thì bị bỏ ở vòng 1; phiên tới `waiting_continue` và tiếp tục thì hỏi lại từ (review M3).
- Đường `ai_count`: K tạm > 0 mà K chốt = 0 (ít từ hỏi được) thì `gate` đã chạy; AI tắt toàn hệ thống lúc đó vẫn trả 503.

## Việc cho đợt web (hộp Tùy chỉnh phiên mới)

- Gửi `ai_count` và `ai_placement` (chỉ khi admin để `learner` và có ít nhất 1 câu AI).
- Tính mức tối đa từ `/v1/me/app-config`: `session_max_mode`, `max_questions_per_session`, `scope_questions_max`, `ai_max_mode`, `ai_max_fixed`, `ai_max_percent`;
  số câu AI tối đa còn bị chặn bởi số lượt AI còn lại.
- Con số "Cần ôn" của nhóm là `today.priority + today.due + today.new`, không phải `today.due`.
- Hai dòng lỗi: "Chọn ít nhất một kiểu câu AI." và "Chọn ít nhất một kiểu câu không cần AI cho N câu còn lại."
- `againBody` (`SessionSummary.tsx`) gửi lại `ai_count`, `ai_placement`, và `types`, `cloze_source` ban đầu, vì `types` lưu trong phiên có thể đã bị bỏ kiểu AI.
- Tới lúc đó hộp hiện nay vẫn chặn `count` ở `max_questions_per_session`, kể cả khi admin chọn `scope_words` (`CustomizeDialog.tsx:85`).

## Lệch plan (đã ghi trong ledger)

- Commit Task 0 rút ngắn còn 72 ký tự theo hook ("…design, decisions, plan, review").
- Task 6: có `ai_count` > 0, chỉ kiểu AI và K tạm = 0 thì trả 400 ngay (nếu không sẽ thành 409 `no-word-fits-types`), đúng D16 và §8 của design.
- Task 8: smoke chạy với biến môi trường xuất sẵn (bộ biến của CI, secret sinh mới) vì worktree không có `.env`; commit sau Task 9.
- Task 11: "Hàng kiểu câu" không có biến thể tắt, nên hàng AI mờ bằng opacity 0,45 như hàng nhóm tắt; dòng lượt AI cũ được sửa và dời lên thay vì thêm dòng mới;
  ô "Câu đã lưu + AI" dùng lại ô 143:4319.
