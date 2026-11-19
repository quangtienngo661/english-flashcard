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

# Landing feedback — as-built (19/11/2026)

- Hero dùng một màu cho tiêu đề và bỏ dải chip trượt. Section nhóm dùng carousel 5 chủ đề với Education ở vị trí thứ 5 theo D17 và F.22.
- Demo luyện tập dùng một dòng 7/20, ✓ 5, ✕ 1 trên desktop, chữ câu hỏi 22/26 px và ô đáp án xanh. Bốn bước đi theo thứ tự Lưu từ → Nghe → Luyện → Ôn ở cả desktop và mobile.
- Khôi phục ô số 1–4 từ `md` trong lựa chọn của app vì `origin/dev` đã bỏ ô số. Sau khi chấm, ô số ở dòng đúng/sai dùng nền surface và chữ, viền theo màu trạng thái. Màn luyện giữ accessible name của nút.
- Chuyển phần hình học thuần của arc về `src/lib/group-carousel.ts` để giữ import boundary giữa landing và learner app. Các export cũ tiếp tục dùng được.
- Kiểm bằng Chromium và đối chiếu mock-up ở 1440, 1280, 1024 và 390 px, sáng và tối. Kiểm mẫu Travel ở giữa, các thẻ ở mép mờ dần, màu chữ và nền chip, câu hỏi, badge và các bước. Sau khi chỉnh padding, cả năm mốc Ôn cùng hàng tại 1024 px.
- Chromium ghi nhận carousel đổi thẻ sau 3,55 giây, các chip rise cách nhau 70 ms, focus giữ nguyên thẻ và click thẻ bên dừng tự chạy. Với JavaScript tắt ở 390 px, Travel và 5 từ mẫu hiện sẵn.
- Đã chọn sai một câu trắc nghiệm trên frontend learner kết nối API và Postgres local riêng. API chấm HTTP 200 `wrong`. Ảnh sáng/tối xác nhận dòng đúng và dòng đã chọn sai đều có badge theo trạng thái.
- Ảnh trong [landing-feedback-shots](./landing-feedback-shots/). Landing dùng cổng 3200, learner app 3201 và API 3310 vì stack khác đang dùng cổng mặc định.

## Kết quả kiểm tra

- `pnpm test` đạt 1.766 test trong 163 file. `pnpm lint` và `pnpm typecheck` exit 0.
- `docker info` trả 28.5.1. Lượt `pnpm cf:docker` toàn bộ đã build và chạy Playwright, sau đó dừng với exit 143 sau các retry lỗi trong app (timeout M1/M2 và assertion saved-sentence). Không có verdict pass cho full suite local.
- `pnpm cf:docker e2e/landing.spec.ts e2e/a11y.spec.ts` exit 0 trên bản cuối của Task 8. Worker build thành công, 102 test pass và 8 test skip theo project. Axe chạy trên `/vi` và `/en` ở cả hai theme. `assert-render-mode` xác nhận landing static và `/app` không prerender.
- Full suite cần verdict CI của PR trước khi merge. Kiểm bằng mắt dùng Chromium, với viewport mobile mô phỏng 390 px.
