# Sửa defect từ review Bước 1–8 — plan tóm tắt (29/10/2026)

Nguồn: [review 29/10/2026](../superpowers/reviews/2026-10-29-buoc-1-8-review.md) (PR #184). Plan đầy đủ:
[`2026-10-29-sua-defect-review-buoc-1-8.md`](../superpowers/plans/2026-10-29-sua-defect-review-buoc-1-8.md). Không thêm e2e backend (chủ dự án,
29/10/2026): test mới đều là unit test. Mỗi defect là 2 commit (test đỏ, rồi fix). Bốn PR vào `dev`.

## PR 1 — practice và AI (`fix/review-practice-ai`)
1. B7-1: `GET /practice/sessions/current` không tạo yêu cầu AI, trả `preparing: true` và giữ notice.
2. B7-3: bộ tạo câu trả lại lượt khi `ai.run` ném lỗi.
3. B4-3: đáp án gõ chứa ký tự NUL trả 400 thay vì 500.
4. B6-2: `pnpm ai:fake-call` từ chối khi `.env` có key thật.
5. B6-3: log che `context_sentence`; log `google_sign_in_failed` không còn bị che trường lỗi.

## PR 2 — identity (`fix/review-identity`)
6. B2-1: test duyệt mọi route `/v1/admin/**` phải có quyền.
7. B25-1: test cho lớp chặn "bắt đổi mật khẩu" của guard.
8. B1-3: khóa tài khoản và nâng vai trò không tạo ra admin bị khóa; "admin cuối" chỉ đếm admin đang hoạt động.
9. B1-4: CLI `admin:grant` từ chối tài khoản bị khóa hoặc đang xóa.
10. B1-6: `password/reset` tốn cùng thời gian băm cho email có và không có tài khoản.
11. B1-10: đăng ký từ chối email không có dấu chấm ở phần domain.
12. B1-9: lỗi khi nhả `Idempotency-Key` được ghi log.

## PR 3 — billing và thư nhắc (`fix/review-billing-mail`)
13. B5-3 + UW-2: hoàn tiền → hủy hoàn → hoàn lại cùng giao dịch được áp dụng đúng.
14. B3-3: lỗi DB khi gửi thư nhắc không bị coi là "có thể đã giao".
15. B3-4: lần thử lại do SMTP tạm lỗi có log.

## PR 4 — web và admin (`fix/review-learner-web`)
16. B8-2: người đã đăng nhập mở được trang quên mật khẩu (nút "Đặt mật khẩu" của tài khoản chỉ có Google).
17. UW-1: email không còn nằm trong URL đặt lại mật khẩu.
18. UA-1: bản tiếng Anh của admin ghi trần 1,000 ví dụ.
19. UW-5: số trong các thông báo thêm từ được định dạng.
20. B8-7: màn xóa tài khoản không nói lượt dùng bị xóa.

# Sửa defect review Bước 1–8 — as-built (29/10/2026)

Bốn PR đã merge vào `dev` (CI 4/4 xanh trên mỗi PR; không migration, không e2e backend): **PR 1** [#185](https://github.com/quangtienngo661/english-flashcard/pull/185)
(B7-1, B7-3, B4-3, B6-2, B6-3), **PR 2** [#186](https://github.com/quangtienngo661/english-flashcard/pull/186) (B2-1, B25-1, B1-3, B1-4, B1-6, B1-10, B1-9),
**PR 3** [#187](https://github.com/quangtienngo661/english-flashcard/pull/187) (B5-3 + UW-2, B3-3, B3-4), **PR 4** [#188](https://github.com/quangtienngo661/english-flashcard/pull/188)
(B8-2, UW-1, UA-1, UW-5, B8-7). Mỗi defect là 2 commit (test đỏ, rồi fix), trừ B2-1 và B25-1 chỉ thêm test. Test cuối: API 3160 unit (PR 2) / 3148 (PR 3), web 728, admin 906;
`tsc --noEmit` và lint sạch.

## Khác với plan

- **B1-3:** không đổi phép đếm "admin cuối" sang `status: 'active'`. Chỉ hai lệnh ghi (khóa, nâng vai trò, cả CLI) thành `updateMany` có điều kiện, nên không thể có admin bị khóa; quy tắc đếm hiện có (P16, M6) giữ nguyên.
- **B7-3:** khi `ai.run` ném lỗi, bộ tạo câu trả lại lượt, đánh dấu `ai-failed` và log `ai_question_exception`, **không ném lại** (để phiên rơi về câu không AI thay vì lỗi 500).
- **B1-10:** thêm `isValidEmailSyntax` cho đăng ký và tạo/sửa email staff; `normalizeEmail` không đổi để tài khoản cũ có domain không chấm vẫn đăng nhập được.
- **B5-3:** không migration: refund mới hơn lần `refund_reversed` gần nhất thì áp dụng; refund cũ hơn nó (gửi lại với event id mới) vẫn là duplicate.
- **UW-5:** sửa bằng cách mở rộng danh sách placeholder số trong `apps/web/src/i18n/messages.test.ts`, rồi sửa 7 message (vi 4, en 3).

## Bằng chứng đã chạy

- Răng của test: bỏ `@RequirePermission` ở controller nguồn → test B2-1 đỏ, liệt kê 4 route; tắt nhánh `mustChangePassword` trong `PermissionGuard` → test B25-1 đỏ; hoàn lại sau khi thử.
- Smoke hồi quy trên bản gộp cục bộ của PR 1–3 (API + worker thật, cổng 3300, AI giả, DB mới): `pnpm smoke:buoc-0-3-fixes` ALL STEPS MATCHED; `pnpm smoke:buoc-7` 30 bước qua; `pnpm smoke:buoc-8` 20/20; `pnpm smoke:buoc-5` fetchState ON, ALL CHECKS PASSED. Output: `sua-defect-review-buoc-1-8-smoke-output.txt`.
  Không chạy lại `smoke:buoc-5` fetchState OFF, `smoke:buoc-4` và `smoke:buoc-6`.
- Lần chạy đầu của smoke 7, 8, 5 hỏng ở bước setup vì API của lần chạy trước còn giữ cổng 3300 (script dọn của tôi chưa kill hết); đã dọn và chạy lại, không liên quan tới code.

## Chưa kiểm

- **Trình duyệt thật cho PR 4:** chưa mở nút "Đặt mật khẩu" (tài khoản chỉ có Google) và trang reset trong trình duyệt; chỉ có unit test (AuthGate, ForgotPassword/ResetPassword, delete-account, messages) và CI e2e có sẵn.
- B1-3 chạy đua chỉ được chứng minh ở mức: câu lệnh ghi có điều kiện (unit, mock) và smoke thuận; chưa có test hai transaction đồng thời trên Postgres (không thêm e2e backend theo quyết định của chủ dự án).
- Chưa làm trong đợt này (cần quyết định hoặc ngoài phạm vi): B5-1, B7-2, X-3, B2-2, index (R1), phần cần DB của R2, R4, R12, R13, các mục Thấp còn lại ở §7b của improvement plan (R14).
