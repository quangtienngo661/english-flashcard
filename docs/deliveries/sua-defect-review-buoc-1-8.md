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
