# Sửa lỗi giao diện người học — plan tóm tắt (26/10/2026)

Nguồn: audit `docs/audit/2026-10-26-ui-nguoi-hoc-audit.md`. Chủ dự án đã chọn sửa 12 lỗi major #1–#12. Plan chi tiết ở
`docs/superpowers/plans/2026-10-26-sua-loi-ui-nguoi-hoc.md`. Làm trên nhánh `fix/ui-nguoi-hoc-major`, mở PR vào `dev`. Mỗi lỗi gồm hai commit: commit đầu là test fail, commit sau là phần sửa.

| Task | Việc |
|---|---|
| 0 | Cắt nhánh từ `origin/dev`. Chụp ảnh "before" cho những lỗi audit chưa có ảnh: tra từ lỗi, tải thẻ nhóm lỗi, Lịch sử và Từ hay sai có dữ liệu. |
| 1 | #1 #11: trang nhóm và nút Từ hay sai không còn tràn ngang khi tên nhóm là một chữ dài liền. |
| 2 | #3: lớp phủ hộp thoại làm trang tối đi ở bản tối, thay vì sáng lên. |
| 3 | #6: tiêu đề Gói học, giá tiền và tiêu đề Tổng kết phiên dùng cỡ chữ có token. Thêm test bắt class chữ không có token. |
| 4 | #9: mọi con số hiện có dấu chấm hàng nghìn theo vi-VN ("262.962"). |
| 5 | #4 #5: tấm Thêm từ và trang nhóm báo lỗi kèm [Thử lại] khi tải hỏng, không kẹt và không báo "chưa có từ". |
| 6 | #2: [Luyện thêm một phiên] giữ nguồn "câu bạn đã lưu", nên không trừ lượt câu AI. |
| 7 | #7: Lịch sử luyện tập có nhãn "Bạn trả lời" / "Đáp án" trên điện thoại và cho trình đọc màn hình. |
| 8 | #8: thông báo đúng/sai cho trình đọc màn hình. Sau khi trả lời, focus chuyển sang nút kế tiếp. Áp dụng cho phiên luyện và phiên ôn. |
| 9 | #10: ở Cài đặt, bấm vào bất cứ chỗ nào trên hàng "Lịch sử giao dịch" và "Gói hiện tại" cũng mở trang. |
| 10 | #12: tên đọc của nút loa bắt đầu bằng chữ nhìn thấy, ví dụ "UK, nghe giọng Anh". Chữ này là **đề xuất**, chờ chủ dự án duyệt. |
| 11 | Chạy lint, typecheck, unit test và e2e trong Docker. Push, mở PR, chờ CI xanh. |
| 12 | Chụp ảnh "after" (375/1280, sáng/tối). Chạy `/impeccable polish` trên các màn đã sửa. Cập nhật cột Trạng thái của audit và ghi as-built. Merge PR. |

# Sửa lỗi giao diện người học — as-built (26/10/2026)

Nhánh `fix/ui-nguoi-hoc-major`, cắt từ `origin/dev` `6e72bb3`, làm trong worktree `.claude/worktrees/fix-ui-nguoi-hoc-major`. Có 12 lỗi, mỗi lỗi một commit test fail rồi một commit sửa. #8 có hai commit sửa (một cho phiên luyện, một cho phiên ôn).

- **Kiểm:**
  - `pnpm test` (`apps/web`): 651/651.
  - `pnpm lint`, `pnpm typecheck`: xanh.
  - Hai test e2e mới chống cuộn ngang (#1, #11) chạy bằng `pnpm cf:docker`: trước khi sửa thì fail, sau khi sửa thì 4 passed (mobile và desktop).
  - Toàn bộ e2e: ghi trong mô tả PR.
- **Ảnh before/after:** 375/1280px, sáng/tối, ở `docs/audit/2026-10-26-ui-nguoi-hoc/shots-before/` và `shots-after/` (10 màn × 4 ảnh mỗi bên). #2 và #8 không có ảnh vì là hành vi; test của chúng là bằng chứng.
  - Dữ liệu thật: tài khoản thử `audit-pro@example.com` trên DB `english_learning_learner_ui`.
  - Ảnh after chụp trên app dev của nhánh, chạy trong container riêng `wordmet-dev-app-fixui` ở :5173. Lý do: :3001 là app dev của phiên khác, còn API chỉ cho phép CORS từ :3001 và :5173.
- **`/impeccable polish`:** launcher không tải được engine (không có mạng tới GitHub), nên tôi làm theo `reference/polish.md` bằng cách xem lại cặp ảnh của các màn đã sửa. Không thấy điểm mới nào thuộc phạm vi 12 lỗi. Câu "Có lỗi xảy ra. Thử lại sau." trong khối lỗi mới của #4 và #5 là dòng minor #16 của audit, chưa sửa.
- **Quyết định trong lúc làm (ledger):**
  - #11 sửa thêm tiêu đề "N từ trong nhóm {tên}", vì ảnh before cho thấy tiêu đề này cũng tràn.
  - #9: hai khóa `topic.learning` và `word.learning` giữ `{groups}` thường, vì đó là danh sách tên nhóm chứ không phải số.
  - #4: khi tra từ lỗi, nút có chữ "Tự nhập nghĩa".
  - #8: chỉ chuyển focus sang nút chính ở câu chọn. Câu gõ giữ focus trong ô gõ, theo hành vi đã duyệt và có test giữ.
  - #12: chữ mới "UK, nghe giọng Anh" / "US, nghe giọng Mỹ" (en "UK, British voice" / "US, American voice"), chủ dự án duyệt cùng plan.
- **Review cả nhánh** (reviewer opus): 0 Critical, 1 Important, 4 Minor.
  - Important đã sửa: tên nhóm dài liền còn làm tràn trang ở dòng backlog của Hôm nay, trang Từ lâu chưa ôn, thẻ phiên đang dở và dòng tổng kết phiên.
    - Thêm test e2e cho Hôm nay và trang Từ lâu chưa ôn: trước khi sửa thì fail, kể cả ở 1440px; sau khi sửa thì qua.
    - Thẻ phiên đang dở và dòng tổng kết dùng cùng cách sửa nhưng chưa có test riêng.
  - Minor để lại, chưa sửa:
    - Danh sách số trong test chữ thiếu `added`, `already`, `full`, `function`, `asked`, nên kết quả "Thêm cả loạt" vẫn in "1000" thay vì "1.000".
    - Ô "Ngăn" ở Tùy chỉnh phiên truyền chuỗi `'0'`…`'5'` vào `{n, number}`. Hiện vẫn in đúng, nhưng không có gì chặn nếu sau này truyền sai kiểu.
    - Lớp phủ ở bản sáng nhạt hơn khoảng 5/255 mỗi kênh màu.
    - Hàng Cài đặt có link bỏ qua `className` và bỏ `flex-wrap`.
- **e2e:**
  - Lần chạy đủ đầu tiên có 5 test fail. 2 test do nhánh này gây ra: hàm `fill` của e2e không thay được `{x, number}`, và `getByText` trùng với vùng đọc kết quả mới. Cả 2 đã sửa ở phía test.
  - m3 và m5a chập chờn, qua khi chạy lại.
  - Lần chạy đủ sau cùng: **321 passed, 0 failed, 0 flaky**.
