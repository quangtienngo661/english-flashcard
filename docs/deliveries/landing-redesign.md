# Landing làm lại — plan tóm tắt (03/11/2026)

Design: `docs/superpowers/specs/2026-11-03-landing-redesign-design.md`. Plan đầy đủ: `docs/superpowers/plans/2026-11-03-landing-redesign.md`.
Nhánh `feat/landing-redesign` (tách từ `docs/landing-redesign`), một PR vào `dev` khi xong.

1. Cho landing dùng chung theme sáng/tối và nút đổi theme của app.
2. Thêm toàn bộ chữ của landing mới vào messages (tiếng Anh tạm giữ chữ Việt), đổi tiêu đề và mô tả trang.
3. Thêm kiểu nút của app (vàng có gờ, nút viền) và vài token chuyển động cho landing.
4. Viết hai hàm thuần: chấm đáp án gõ, và tính đường cong ghi nhớ.
5. Dựng thanh trên và màn đầu mới; bỏ nút đổi ngôn ngữ.
6. Dựng cửa sổ app 5 tab (Ôn thẻ lật được, Nhóm từ, Luyện tập AI, Tra từ, Thêm từ mới).
7. Dựng phần "Vì sao từ vựng nhanh bị quên" với đường cong minh họa.
8. Dựng phần 7 dạng bài làm thử được.
9. Dựng phần ôn đúng lúc, từ gặp hằng ngày, gói, hỏi đáp (có chuyển động khi mở), kêu gọi cuối; sửa chân trang.
10. Ghép trang mới, xóa các section và chữ của landing cũ.
11. Xóa waitlist và kho D1, sửa lệnh e2e và trang chính sách bảo mật cho khớp.
12. Chuyển `/en` về `/vi`, bỏ `/en` khỏi sitemap và metadata.
13. Viết lại test e2e cho landing mới (đăng ký, tràn màn hình, theme, giảm chuyển động, không JS, axe, CSP).
14. Chạy cửa kiểm taste-skill và impeccable, chạy tay 4 bề rộng × 2 theme, ghi as-built và deploy checklist.
