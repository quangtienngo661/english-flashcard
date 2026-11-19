# Landing feedback — plan tóm tắt (19/11/2026)

Plan: `docs/superpowers/plans/2026-11-19-landing-feedback.md`. Design: `docs/superpowers/specs/2026-11-19-landing-feedback-design.md`.
Mock-up: `docs/mockups/2026-11-18-landing-gop-y/index.html`. Một nhánh `fix/landing-feedback` từ `origin/dev`, một PR vào `dev`.

0. Tạo nhánh, đưa design, decision record, plan và mock-up vào repo.
1. Tiêu đề hero một màu, bỏ key `accent`.
2. Bỏ dải chip trượt ngang và `Marquee`.
3. Ô số 1–4 trên dòng đúng/sai: nền trắng, chữ và viền màu dòng (landing và app).
4. Câu luyện minh họa: một dòng "7/20 · ✓ 5 · ✕ 1", câu hỏi chữ lớn, từ điền trong ô xanh, bỏ chữ Đúng/Sai trên dòng đáp án.
5. "Từ lúc gặp đến lúc dùng được" thành 4 bước đánh số theo thứ tự: Lưu từ → Nghe → Luyện → Ôn.
6. Hàm thuần cho khoảng cách vòng cung theo bề ngang và màu nhóm cố định theo thứ tự.
7. Vòng cung 5 nhóm chủ đề: tự chuyển 3,5 giây, dừng khi rê chuột, focus hoặc khi người dùng tự chuyển; từ hiện trên thẻ giữa.
8. Thay section nhóm bằng vòng cung (tiêu đề "Học theo nhóm chủ đề"), xóa `FlyIn`, chạy e2e trong Docker, xem bằng mắt 4 khổ sáng/tối, ghi
   as-built, mở PR.

Nhóm thứ 5 là Education, không phải IELTS như mock-up (chủ dự án chốt 19/11, D17).
