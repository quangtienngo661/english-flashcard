# Checklist kiểm tay — sửa 12 lỗi major của giao diện người học (26/10/2026)

PR [#141](https://github.com/quangtienngo661/english-flashcard/pull/141), nhánh `fix/ui-nguoi-hoc-major`. Audit: `docs/audit/2026-10-26-ui-nguoi-hoc-audit.md`.

## Chuẩn bị

- **Mở app của nhánh fix ở `http://localhost:5173/vi/app`**, không mở :3001. Cổng :3001 vẫn chạy code `dev` cũ, chưa có các sửa này.
  - App :5173 chạy trong container `wordmet-dev-app-fixui`, từ worktree `.claude/worktrees/fix-ui-nguoi-hoc-major`.
  - API ở :3000, DB `english_learning_learner_ui`.
- **Tài khoản thử** (mật khẩu là hằng `PASSWORD` trong `apps/api/scripts/learner-test-setup.mjs`):
  - `audit-pro@example.com`: gói Pro, 8 nhóm. Trong đó có nhóm tên là một chữ dài liền "Supercalifragilistic…", nhóm "Từ vựng chuyên ngành…" 60 ký tự, và nhóm "x" không có từ. Đã có lịch sử luyện tập và Từ hay sai.
  - `audit-free@example.com`: gói Miễn phí, chưa có gì.
- **Ảnh before/after để đối chiếu:** `docs/audit/2026-10-26-ui-nguoi-hoc/shots-before/` và `shots-after/`.
- **Bề ngang điện thoại:** Chrome DevTools → Toggle device toolbar (Ctrl+Shift+M) → đặt 375px.
- **Bản tối:** Cài đặt → Giao diện → Tối.
- **Giả lập API lỗi** (dùng cho #4, #5): DevTools → tab Network → chuột phải vào request → **Block request URL**. Bỏ chặn: tab "Network request blocking".

## Các mục kiểm

Mỗi dòng: làm gì → thấy gì là đúng. Đánh dấu `[x]` khi qua.

### #1 — Trang nhóm không tràn ngang

- [ ] Bề ngang 375px, vào Nhóm → mở nhóm "Supercalifragilistic…".
- [ ] Tên nhóm xuống dòng trong khung. Trang không kéo ngang được. Thấy đủ nút [Ôn 12 thẻ] và ⋯.
- [ ] Làm lại ở bản tối.

### #2 — [Luyện thêm một phiên] không dùng câu AI

- [ ] Chuẩn bị: mở trang một từ đang học (ví dụ `word?w=profit`) → [Thêm câu đã gặp], lưu 1–2 câu có chứa từ đó.
- [ ] Luyện tập → [Tùy chỉnh] → bật **"Điền từ vào câu bạn đã lưu"** → [Bắt đầu] → làm hết phiên.
- [ ] Ở màn Tổng kết, ghi lại "lượt câu AI" ở Cài đặt → bấm [Luyện thêm một phiên].
- [ ] Phiên mới vẫn là câu điền từ trong câu **bạn đã lưu**, không có nhãn câu AI. Lượt câu AI ở Cài đặt **không giảm**.
- [ ] (Tùy chọn) Làm lại với `audit-free`. [Luyện thêm một phiên] không báo "Dành cho gói Pro".

### #3 — Lớp phủ hộp thoại ở bản tối

- [ ] Bản tối, trang Tra từ → nhấn **N** để mở tấm "Bạn vừa gặp từ nào?".
- [ ] Trang phía sau **tối đi**, không bị phủ xám sáng.
- [ ] Bản sáng: lớp phủ trông như cũ.

### #4 — Tấm Thêm từ khi tra từ điển lỗi

- [ ] Tra từ → nhấn N → gõ "rizz". Trong Network, chặn request `/v1/lookup?q=rizz` rồi gõ thêm 1 ký tự và xóa đi để gọi lại.
- [ ] Tấm hiện khối lỗi có nút **[Thử lại]**, và vẫn có nút **[Tự nhập nghĩa]**.
- [ ] Bỏ chặn → bấm [Thử lại] → khối lỗi biến mất, hiện dòng "Wordmet chưa có từ “rizz”…" và hai nút [Tra bằng AI], [Tự nhập nghĩa].

### #5 — Trang nhóm khi tải thẻ lỗi

- [ ] Mở một nhóm. Chặn request `/v1/groups/<id>/queue`, rồi tải lại trang.
- [ ] Khối "Toàn bộ … từ" hiện lỗi kèm **[Thử lại]**. **Không** hiện câu "Nhóm chưa có từ nào."
- [ ] Bỏ chặn → [Thử lại] → danh sách từ hiện lại.

### #6 — Cỡ chữ tiêu đề Gói học và Tổng kết phiên

- [ ] Mở `/vi/app/plans`. Tiêu đề "Bạn đang dùng gói Pro" (gói Miễn phí: "Học đều mỗi ngày, lên Pro khi cần") phải **lớn hơn rõ** tên thẻ "Miễn phí" / "Pro".
- [ ] Đăng nhập `audit-free`, mở Gói học, xem thẻ Pro. Giá "XXX.000 ₫" to cỡ tên thẻ.
- [ ] Làm hết một phiên luyện. Tiêu đề "Xong N câu." to như "Xong N thẻ." của phiên ôn.

### #7 — Nhãn ở Lịch sử luyện tập

- [ ] Bề ngang 375px, mở Luyện tập → Lịch sử.
- [ ] Mỗi dòng có nhãn **"Bạn trả lời"** trên câu bạn gõ (chữ đỏ khi sai) và **"Đáp án"** trên đáp án đúng.
- [ ] Ở 1280px: nhãn trong dòng ẩn đi, tiêu đề cột "Bạn trả lời" / "Đáp án" ở đầu bảng vẫn còn.

### #8 — Bàn phím và trình đọc màn hình sau khi trả lời

- [ ] Bắt đầu một phiên luyện có câu trắc nghiệm. Bấm một đáp án bằng chuột.
- [ ] Sau khi có kết quả, nút chính (nút có nhãn **Enter**, ví dụ [Cần ôn lại] hoặc [Câu tiếp]) **đang có viền focus**. Nhấn Tab thì đi tới nút kế tiếp, không nhảy về đầu trang.
- [ ] Câu gõ từ: gõ sai rồi nhấn Enter. Con trỏ vẫn nằm trong ô gõ, gõ lại được ngay.
- [ ] Phiên ôn thẻ: lật thẻ → bấm [Đã biết]. Thẻ sau hiện ra và nút **[Lật thẻ]** đang focus. Nhấn Space lật được thẻ, chỉ lật một lần.
- [ ] (Tùy chọn, Windows) Bật Narrator (Ctrl+Win+Enter). Sau khi trả lời, Narrator đọc "Đúng rồi" / "Chưa đúng" kèm từ và nghĩa. Ở phiên ôn, Narrator đọc "Thẻ 2 trên N".

### #9 — Số có dấu chấm hàng nghìn

- [ ] Số thật trong dữ liệu thử đều nhỏ hơn 1.000 nên không thấy khác. Kiểm rằng các số nhỏ vẫn đúng như cũ: "12 thẻ", "đã dùng 0/30", "Câu 1/10".
- [ ] Muốn thấy số lớn: so `shots-before/d09-today-huge-*` ("262962") với `shots-after/d09-today-huge-*` ("262.962").
- [ ] Bản tiếng Anh (`/en/app`): số vẫn đúng, ví dụ "12 cards".

### #10 — Hàng Cài đặt bấm được cả hàng

- [ ] Bề ngang 375px, Cài đặt → bấm vào **chữ** "Lịch sử giao dịch" (không phải mũi tên) → mở trang Lịch sử giao dịch.
- [ ] Bấm vào chữ "Gói hiện tại" → mở Gói học.
- [ ] Dùng phím Tab: cả hàng có viền focus, Enter mở được trang.

### #11 — Từ hay sai với tên nhóm dài

- [ ] Bề ngang 375px, Luyện tập → Từ hay sai → ô Nhóm → chọn nhóm "Supercalifragilistic…".
- [ ] Tiêu đề "6 từ trong nhóm …" xuống dòng trong khung. Nút "Luyện 6 từ của nhóm …" nằm gọn trong thẻ, tên bị cắt bằng "…". Trang không kéo ngang được.

### #12 — Tên đọc của nút loa UK / US

- [ ] Mở trang từ, ví dụ `word?w=go`. DevTools → chuột phải vào nút **UK** → Inspect → tab **Accessibility** → Name.
- [ ] Name là **"UK, nghe giọng Anh"**. Nút US là **"US, nghe giọng Mỹ"**.
- [ ] Bấm nút: vẫn phát âm như cũ.

### Thêm từ review cả nhánh — tên nhóm dài ở chỗ khác

- [ ] Bề ngang 375px, trang Hôm nay. Nếu nhóm "Supercalifragilistic…" có từ lâu chưa ôn: dòng "Nhóm … quá hạn hơn N ngày" xuống dòng, trang không kéo ngang.
- [ ] Luyện tập, khi đang có phiên dở với nhóm đó: thẻ "Phiên đang dở" không tràn.

## Ghi kết quả

Mục nào chưa qua: ghi số mục, bề ngang, sáng/tối, kèm ảnh chụp. Tôi sửa bằng commit mới trên cùng PR.
