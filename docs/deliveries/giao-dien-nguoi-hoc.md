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

# M1 — as-built (23/10/2026)

Nhánh `feat/giao-dien-nguoi-hoc-m1` (cắt từ `origin/dev` @ `87502c0`), thực hiện kiểu Native (`executing-plans`), một commit mỗi task.

**Đã có:** cờ `NEXT_PUBLIC_LEARNER_APP` (tắt: `/…/app/*` → 307 về landing, code app không vào bản build); CSP; màu từ biến Figma + bản tối;
lớp phiên và API chép từ admin; chữ `App` vi/en và định dạng theo múi giờ người học; bộ thành phần và khung app (thanh trên, chân trang, menu
avatar, tab dưới điện thoại); API (g) `GET /v1/me/app-config`, nghĩa ở Từ hay sai, `starts_at` của nguồn gói; API (a) sửa ngày sinh 13+; đăng ký,
đăng nhập, mã xác minh, quên/đặt mật khẩu, chọn ngôn ngữ; Cài đặt, Tài khoản; CSV mẫu 303 nghĩa + `pnpm learner:setup`; e2e M1 (luồng, axe
vi/en × sáng/tối × 1440/390, không cuộn ngang, CSP); `pnpm shots` chụp ảnh trên stack thật. Hôm nay chỉ có khung (M2).

**Đo và kết quả kiểm**
- Cỡ Worker (gzip, `wrangler deploy --dry-run`): landing không app 2.941,92 KiB; bật app (Task 1) 2.943,28 KiB. Gói Free khoảng 3.072 KiB:
  **sát giới hạn** — mỗi mốc sau phải đo lại (checklist Deploy).
- CSP: `'self'` + SRI chặn script nhúng `self.__next_f.push(…)` của Next (68 báo `script-src-elem inline`, không có lỗi style) → bật dự phòng D20
  (`'unsafe-inline'` cho script và style; khi dự phòng bật thì không đưa hash vào, vì hash làm trình duyệt bỏ qua `'unsafe-inline'`).
- Unit: web 289, API (toàn bộ) xanh; e2e app + CSP trên bản build Worker: xem PR.

**Khác plan / cần chủ dự án biết**
- `border-strong` bản tối dùng `#6b7491` thay `#59627d` của Figma: giá trị Figma chỉ 2,33:1 trên nền thẻ tối, dưới mức 3:1 của viền ô nhập.
- Chuyển trang sau form và ở cổng phiên dùng tải trang đầy đủ (`location.replace`): trên bản build Worker, `router.replace` đôi khi không chuyển
  trang (e2e). Rủi ro cần theo dõi ở M2: nếu link thường cũng chập chờn.
- Trên Windows, `next dev` không chạy được (SWC bị chặn): `pnpm dev:app` chạy dev server trong container Linux.
- Cài đặt bản điện thoại theo M/90 (Ngôn ngữ, Giao diện là hàng "giá trị ›" mở tấm chọn; Đăng xuất là nút rộng cuối trang); web theo K/50.
- Admin mở bằng `127.0.0.1:5173` phải gọi API bằng `http://127.0.0.1:3000` (cookie `refresh_token` chỉ gửi cùng host).
- `apps/api/.env` cũ thiếu `ADMIN_APP_URL`, `LEARNER_APP_URL`, `TERMS_VERSION` (API không khởi động); tài liệu kiểm ghi cách sửa.
- File CSV mẫu ghi đè nghĩa trùng từ + loại từ: chạy `learner:setup` trên DB riêng nếu DB có nội dung thật (đã làm vậy khi chạy thật).
- Chưa làm ở M1 (để mốc dùng tới): `Tabs`, dải tra từ, `Menu` chung, `useFormat.relativeDays`.
