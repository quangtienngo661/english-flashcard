# Đợt cải thiện nhóm A — plan tóm tắt (26/10/2026)

Plan chi tiết: [`../superpowers/plans/2026-10-26-dot-cai-thien-a.md`](../superpowers/plans/2026-10-26-dot-cai-thien-a.md). Design:
[`../superpowers/specs/2026-10-26-dot-cai-thien-a-design.md`](../superpowers/specs/2026-10-26-dot-cai-thien-a-design.md). Năm PR vào `dev`, ba phiên song song: phiên 1 làm PR 1,
phiên 2 làm PR 2, phiên 3 làm PR 3 → 4 → 5.

**PR 1 — Xác nhận email trước khi có phiên (phiên 1)**
1. Đăng nhập đúng mật khẩu mà chưa xác nhận email thì trả 403 `email-not-verified` và gửi mã mới.
2. Đăng ký không còn cấp phiên đăng nhập; đăng ký lại vào email chưa xác nhận thì thay dữ liệu và gửi mã mới.
3. Nhập mã thành API công khai (email + mã + mật khẩu, kiểm mật khẩu trước), đúng thì cấp phiên; giới hạn theo IP.
4. Gửi lại mã bằng email, không cần đăng nhập.
5. Làm mới phiên từ chối tài khoản chưa xác nhận.
6. Sửa `learner:setup`, 6 smoke và admin e2e-real theo luồng mới, chạy lại hết.
7. Web: đăng ký không vào app; nhập mã xong mới có phiên.
8. Web: form đăng ký và đăng nhập đưa sang trang nhập mã; chữ "email đã có tài khoản" nhắc Quên mật khẩu.
9. Web: trang nhập mã không cần đăng nhập (ô email, gửi lại mã, đăng ký bằng email khác); bỏ lời mời xác nhận ở Cài đặt.
10. e2e đăng ký / đăng nhập theo luồng mới, chạy thật, ghi test flow.

**PR 2 — Thêm từ từ trang nhóm (phiên 2)**
11. Tấm Thêm từ có chế độ khoá nhóm, nhãn "Đã có trong nhóm".
12. Nút Thêm từ trên trang nhóm, thêm cả loạt qua trang Chọn từ theo chủ đề với nhóm chọn sẵn; e2e, chạy thật.

**PR 3 — Sửa lỗi "Xem đáp án" (phiên 3)**
13. Tái hiện lỗi bằng test, rồi cho xem đáp án câu điền từ trước lần thử đầu.

**PR 4 — Luyện tập (phiên 3)**
14. Bỏ chữ "trước" ở 5 lựa chọn thứ tự.
15. Hai nút sau khi trả lời, nút chính đổi theo trường hợp.
16. API: câu điền từ từ câu đã lưu không cần quyền AI.
17. Web: công tắc "Điền từ vào câu bạn đã lưu"; e2e, chạy thật.

**PR 5 — Nút loa (phiên 3)**
18. Component đọc bằng giọng của máy (UK · US, câu đã lưu chỉ giọng trên máy).
19. Gắn nút loa vào trang từ, thẻ ôn, kết quả luyện tập; e2e, nghe thử trên Windows.

**Đóng đợt**
20. Chạy smoke trên `dev`, viết as-built, cập nhật `CLAUDE.md` và danh sách cải thiện.

# Đợt cải thiện nhóm A — as-built (31/10/2026)

Đóng đợt theo Task 20 của plan. Code của đợt đã merge vào `dev` từ 26–28/10/2026; mục này chỉ ghi lại và chạy lại smoke trên `dev` hiện tại.

## PR

| PR | Task | Nội dung | Merge |
|---|---|---|---|
| [#133](https://github.com/quangtienngo661/english-flashcard/pull/133) | 13 | Cho "Xem đáp án" câu điền từ trước lần thử đầu (tính là sai); test đỏ trước | 26/10 |
| [#134](https://github.com/quangtienngo661/english-flashcard/pull/134) | 14–17 | Chữ thứ tự, hai nút sau khi trả lời, câu điền từ từ câu đã lưu cho mọi gói (C15, C16, C2, C3) | 26/10 |
| [#135](https://github.com/quangtienngo661/english-flashcard/pull/135) | 11–12 | Thêm từ từ trang nhóm (C14) | 26/10 |
| [#136](https://github.com/quangtienngo661/english-flashcard/pull/136) | 18–19 | Nút loa bằng giọng của máy (C1) | 26/10 |
| [#137](https://github.com/quangtienngo661/english-flashcard/pull/137) | 1–10 | Xác nhận email trước khi có phiên (C13) | 26/10 |
| [#138](https://github.com/quangtienngo661/english-flashcard/pull/138) | — | Sửa ba smoke lệch với code, thấy khi làm #137 ([`stale-smokes.md`](stale-smokes.md)) | 26/10 |
| [#139](https://github.com/quangtienngo661/english-flashcard/pull/139) | — | Code review sau khi merge ([`../superpowers/reviews/2026-10-26-dot-cai-thien-a-code-review.md`](../superpowers/reviews/2026-10-26-dot-cai-thien-a-code-review.md)) | 26/10 |
| [#140](https://github.com/quangtienngo661/english-flashcard/pull/140) | — | Mã bị khoá thì trỏ sang Quên mật khẩu (chủ dự án chọn B cho I1 của review) | 26/10 |
| [#158](https://github.com/quangtienngo661/english-flashcard/pull/158) | — | Bỏ link "Gõ nhầm email? Đăng ký bằng email khác" ở trang nhập mã (chủ dự án 28/10) | 28/10 |

## Số test

Đo ở code review trên `dev` @ `fae324d` (sau #133–#137): API unit 2566 pass (191 file), web unit 637 pass (69 file). CI xanh 4/4 (`api`, `web`, `admin`,
`admin-e2e-real`) trên mỗi PR. Từ đó tới nay các đợt sau đã thêm test; số hiện tại xem as-built của nhóm B.

## Khác plan

- #134: chữ phím tắt Enter ("Kiểm tra, rồi nút đậm") do Claude đặt, design §8 chưa có.
- #137: `takePendingPassword` tách thành `readPendingPassword` + `clearPendingPassword` (React Strict Mode có thể chạy initializer hai lần); gửi lại mã dùng `store.send`
  như trang Quên mật khẩu; chữ khoá mã hiện "2 phút" / "24 giờ" thay vì số giây.
- #135: hai ô chọn chủ đề / trình độ dùng `placeholder="—"` (trước hiện "Select an item").
- Ai làm: Task 1–8, 11, 12, 18 do Codex viết, Claude review; Task 9 (phần code), 10, 19 do Claude viết vì Codex hết hạn mức (chủ dự án đồng ý).
- Sau plan: #140 và #158 đổi trang nhập mã. Dòng 9 ở mục 1 của [`dot-cai-thien-a-checklist.md`](dot-cai-thien-a-checklist.md) (link "Gõ nhầm email") không còn đúng.

## Minor để lại

Bảy điểm M1–M7 của code review, không sửa: M1 đăng ký email mới cũng tính vào giới hạn email; M2 design A13-2d mâu thuẫn A13-2c (code theo A13-2c); M3 hai loại
429 hiện cùng một câu; M4 máy chỉ có giọng `en-AU` / `en-IN` thì không có nút loa; M5 nhãn đọc màn hình "Nghe giọng Anh" khác chữ "UK"; M6 hai lần đăng ký cùng lúc
một email mới, lần sau nhận 409; M7 tài khoản chưa xác nhận tạo trước C13 bị người khác đăng ký lại được (cần xem nếu DB có tài khoản thật trước khi lên production).

## Smoke khi đóng đợt (Task 20 Step 1)

`dev` @ `018e1465` (sau PR #198), API build mới. Mỗi smoke trên một DB mới, API + worker trên :3100, không đọc `apps/api/.env`, không key nhà cung cấp, model fake.
Output đầy đủ: [`dot-cai-thien-a-smoke-output.txt`](dot-cai-thien-a-smoke-output.txt).

| Lệnh | Kết quả |
|---|---|
| `smoke:buoc-0-3-fixes` | ALL STEPS MATCHED |
| `smoke:buoc-2` | ALL CHECKS PASSED |
| `smoke:buoc-4` | ALL CHECKS PASSED (20 phiên, 43 câu trả lời) |
| `smoke:buoc-5`, fetchState OFF | ALL CHECKS PASSED |
| `smoke:buoc-6` | passed, 32 bước |
| `smoke:buoc-7` | passed, 30 bước |
| `learner:setup --plan pro`, hai lần | cả hai lần xong, lần hai không lỗi |

`smoke:buoc-6` (B6#30) dừng rồi bật lại container Redis dùng chung; stack dev của chủ dự án vẫn `healthy` sau đó.

## Chưa làm hoặc chưa kiểm

- Admin `e2e-real` (Task 6 Step 3) không chạy lại lúc đóng đợt; dựa vào CI xanh của mỗi PR sau đó.
- `smoke:buoc-5` chỉ chạy chế độ fetchState OFF như Task 6 ghi; chế độ ON đã chạy ở các đợt sau (#187).
- Chủ dự án chưa tự bấm [`dot-cai-thien-a-checklist.md`](dot-cai-thien-a-checklist.md): các dòng không có ✓ chưa ai bấm tay.
- Giọng `en-GB` trên Chrome / Edge thật, Android, iOS: chưa kiểm (M4, nghi vấn (b) của review).
- I1 của review (khoá mã người khác 24 giờ) chỉ suy ra từ code, chưa chạy kịch bản trên API thật.
