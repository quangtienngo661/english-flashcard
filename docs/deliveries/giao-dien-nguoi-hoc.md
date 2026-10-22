# Giao diện người học trên web — plan tóm tắt (22/10/2026)

Plan: [`../superpowers/plans/2026-10-22-giao-dien-nguoi-hoc.md`](../superpowers/plans/2026-10-22-giao-dien-nguoi-hoc.md) (48 task, 7 PR).
Design: [`../superpowers/specs/2026-10-22-giao-dien-nguoi-hoc-design.md`](../superpowers/specs/2026-10-22-giao-dien-nguoi-hoc-design.md) (D1–D22).
Decisions: [`../superpowers/decisions/2026-10-22-giao-dien-nguoi-hoc-decisions.md`](../superpowers/decisions/2026-10-22-giao-dien-nguoi-hoc-decisions.md).
Một session, nhánh `claude/gallant-keller-bwo9dk`, mỗi mốc một PR vào `dev`. Mỗi mốc: CI xanh → Claude chạy với API thật, gửi ảnh (đặt cạnh khung Figma) và tài
liệu kiểm → chủ dự án "ok" phần hình → merge. Chủ dự án kiểm bằng tay trên `dev` theo
[`giao-dien-nguoi-hoc-test-flow.md`](giao-dien-nguoi-hoc-test-flow.md) (viết dần theo mốc).

## M1 — Khung app, tài khoản, Cài đặt (PR 1)

1. Tách layout landing và app; cờ `NEXT_PUBLIC_LEARNER_APP` (tắt: `/app` chuyển về landing, code app không vào bản build).
2. CSP kiểu SRI (dự phòng `'unsafe-inline'` nếu bị chặn), cho phép Cloudflare Web Analytics.
3. Token màu từ biến Figma, bản tối, chọn Sáng / Tối / Theo hệ thống.
4. Phiên đăng nhập và gọi API chép từ admin; chuyển tiền tố ngôn ngữ theo hồ sơ, tự cập nhật múi giờ.
5. Chữ của app (vi/en), định dạng ngày giờ tiền theo múi giờ người học; bản chữ mục 17.
6. Bộ thành phần giao diện và khung app (thanh trên, chân trang, menu avatar, tab dưới điện thoại).
7. API (g): con số cho người học, nghĩa ở Từ hay sai, ngày bắt đầu gói.
8. API (a): sửa ngày sinh (13+).
9. Đăng ký, đăng nhập, mã xác minh, quên mật khẩu, chọn ngôn ngữ.
10. Cài đặt và Tài khoản.
11. Dữ liệu thử (CSV mẫu ~300 nghĩa + script), e2e, tài liệu kiểm M1, chạy thật, gửi duyệt.

## M2 — Hôm nay, nhóm, phiên ôn (PR 2)

12. API (c): thêm theo danh sách từ đã tick. 13. API (h): gợi ý chủ đề đổi mỗi ngày.
14. Dữ liệu nhóm. 15. Hôm nay. 16. Danh sách nhóm, tạo / đổi tên / xóa. 17. Trang nhóm. 18. Từ lâu chưa ôn. 19. Chọn từ theo chủ đề. 20. Phiên ôn.
21. e2e, tài liệu kiểm M2, chạy thật, gửi duyệt.

## M3 — Tra từ, thêm từ (PR 3)

22. API (e): danh sách câu đã gặp, số câu ở trang từ. 23. Tra từ. 24. Trang từ. 25. Tấm Thêm từ. 26. Thêm câu đã gặp, thêm cả loạt.
27. e2e, tài liệu kiểm M3, chạy thật, gửi duyệt.

## M4 — Luyện tập, Gói học (PR 4)

28. API (b): Từ hay sai theo nhóm. 29. API (d): "Khác" cuối, lý do tiếng Anh ngắn. 30. Trang Luyện tập, Tùy chỉnh phiên (bố cục mới), hết phiên.
31. Phiên luyện (không AI). 32. Từ hay sai, Lịch sử, Báo lỗi của tôi. 33. Gói học.
34. e2e, tài liệu kiểm M4, chạy thật, gửi duyệt.

## M4b — Lịch sử giao dịch (PR 5)

35. **Vẽ khung Figma** (web, điện thoại, admin) → **chủ dự án duyệt trước khi code**. 36. API (i): lưu giao dịch. 37. API (i): đọc giao dịch (người học,
admin). 38. Màn Lịch sử giao dịch. 39. Màn Giao dịch trong admin. 40. e2e, tài liệu kiểm, chạy thật, gửi duyệt.

## M5a — Luyện tập có câu AI (PR 6)

41. API (f): báo lỗi từ riêng không cần ô đồng ý. 42. Công tắc "Kiểu câu có AI". 43. Đang tạo câu, AI lỗi, thông báo đổi kiểu câu.
44. Ba kiểu câu AI, gợi ý, bản dịch, báo lỗi câu AI. 45. e2e, tài liệu kiểm, chạy thật, gửi duyệt.

## M5b — Tra bằng AI, Từ của tôi (PR 7)

46. Tra bằng AI trong tấm Thêm từ. 47. Sửa trước khi lưu, trang Từ của tôi. 48. e2e, tài liệu kiểm, chạy thật; as-built, UI-CONTEXT, CLAUDE.md; gửi duyệt.

## Điểm dừng hỏi chủ dự án trong lúc làm

- Task 1: cách bỏ code `/app` khỏi bản build không chạy được với Next 16.3.8 + OpenNext.
- Task 2: ghi lại nếu phải dùng dự phòng `'unsafe-inline'` (đã chốt, không hỏi lại).
- Task 35: duyệt khung Figma Lịch sử giao dịch.
- Mỗi mốc: duyệt hình trước khi merge.
