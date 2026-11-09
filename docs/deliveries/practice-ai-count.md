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
