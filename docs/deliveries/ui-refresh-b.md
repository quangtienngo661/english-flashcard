# Làm mới giao diện B — plan tóm tắt (15/10/2026)

Design: `docs/superpowers/specs/2026-10-15-ui-refresh-b-design.md`. Plan chi tiết (landing):
`docs/superpowers/plans/2026-10-15-ui-refresh-b-landing.md`. Plan admin viết sau khi PR #19 merge (UB19).

## Landing (`apps/web`) và bộ token chung

1. Tạo package token dùng chung với bảng màu B, bo góc, bóng gờ, thời lượng và easing; landing chuyển sang dùng nó; thử cả admin đọc được rồi hoàn tác.
2. Đổi font landing và ảnh chia sẻ sang Lexend (cần bạn cho phép tải file font).
3. Vẽ lại nút, nền các phần, logo và nút đổi ngôn ngữ theo áo B.
4. Header dính kèm nút đăng ký từ 48rem trở lên; footer và màu thanh trình duyệt theo B.
5. Hero trên nền xanh, form đăng ký hai kiểu (nền xanh, nền vàng) vẫn giữ ô tick; dải CTA cuối màu vàng.
6. Viết phần lo hiệu ứng miếng dán bay vào chỗ trống, dọn ngay khi tab hiện lại.
7. Thay carousel ở Hero bằng một thẻ bài luyện: rung khi sai, bay vào khi đúng, nút "Câu tiếp", màn Xong.
8. **Điểm dừng:** gửi ảnh chụp khung landing (1440 và 390, VI và EN), chờ bạn duyệt rồi mới làm tiếp.
9. Vẽ lại các phần Vấn đề, Cách hoạt động, Luyện với AI, Hỏi đáp theo nhịp màu B.
10. Thêm nút đăng ký vào hai thẻ Gói học.
11. Rút mọi chuyển động của landing xuống tối đa 400ms và kiểm cả trang.
12. Chạy toàn bộ test, rà soát accessibility và thiết kế, chạy tay, cập nhật tài liệu, mở PR vào `dev` (không merge).

# Làm mới giao diện B — landing as-built (15/10/2026)

Nhánh `feat/ui-b-landing` (worktree `english-learning-wt-ui-b`), cắt từ `origin/dev` `a8fa89b`, PR #22 vào `dev` (chưa merge,
Auto-fix bật). Chạy theo cách Native (chủ dự án chọn): một phiên tự làm 11 task theo TDD, một reviewer mới kiểm cả nhánh ở cuối.

## Đã làm

| Task | Commit | Nội dung |
|---|---|---|
| 1 | `6090066` | Package `@wordmet/design-tokens` (`theme.css`): màu B, bo góc, bóng gờ, thời lượng `--transition-duration-*` (tên duy nhất mà `duration-*` của Tailwind v4 đọc; `--duration-fast` cũ không sinh CSS), easing; landing dùng nó; thử admin `vite build` đọc được package rồi hoàn tác |
| 2 | `a3bb6bb`, `4e9a03f` | Lexend qua `next/font`; ảnh OG bằng Lexend tĩnh (googlefonts/lexend, SIL OFL 1.1, tải khi chủ dự án cho phép) trên nền xanh |
| 3 | `636f2dc` | Nút 4 kiểu có gờ, tone Section, logo và VI/EN trên nền xanh, viền focus 3px |
| 4 | `b6b275b` | Header dính + nút đăng ký từ 48rem (UB16 cách 1), hai link nav từ 1024, footer trắng, `themeColor` |
| 5 | `cac016e` | Hero nền xanh (form trước thẻ trên điện thoại), form 2 tone giữ ô tick, `#waitlist-*` ở phần tử bọc còn sau khi đăng ký, CTA vàng |
| 6 | `d4d49ac` | `flyInto`: bản sao bay vào, dọn ở mốc sớm nhất (xong / 480ms / tab hiện lại) |
| 7 | `dce22c4` | Một thẻ bài luyện thay carousel; reducer giữ `tried`; keyframes chỉ qua `motion-safe:`; bỏ `Cloze.prev/next` |
| Điểm dừng A | `0df8288`, `b71d988` | Chủ dự án duyệt khung sau 2 lần sửa khoảng cách header → Hero (80 → 48 → 32px) |
| 8 | `ad1aec2` | Vấn đề, Cách hoạt động (thẻ màu; số + tiêu đề → mô tả → hình), dải AI tím nhạt, FAQ; nền trang trắng |
| 9 | `6d69e21` | Nút đăng ký ở hai thẻ Gói học (dùng lại `Nav.cta`) |
| 10 | `d4a660d` | Mọi chuyển động ≤ 400ms (reveal, lật thẻ 800 → 400ms; FAQ 250ms) |
| 11 | `405c40e`, `867df9b` | Rà soát accessibility: focus mất sau "Câu tiếp" (2.4.3), focus bị header dính che (WCAG 2.2 2.4.11), đọc số câu; test trước, sửa sau |
| Review | `6354b52`, `2781ca0` | Viền focus vàng trong thẻ trắng (1,38:1) → xanh; ô tick báo lỗi đỏ trên xanh (1,24:1) → vàng |
| Sau review | `e55e2b4`, `fe721b6` | H1 không còn dòng cuối một chữ (`text-wrap: pretty`, UB20) |

## Kiểm chứng

- Unit (`pnpm test`, Windows): 16 file, 78 test pass. `pnpm lint`, `pnpm typecheck` sạch.
- E2E (`pnpm cf:docker`, Worker OpenNext thật, desktop 1440 + mobile 390, axe, kiểm trang tĩnh): lần chạy đầy đủ cuối 104 pass /
  0 fail / 13 skip; một test chập chờn ở lần đó (đọc `outline-color` giữa lúc chuyển màu) đã sửa, rồi chạy lặp 3 lần 18/18; sau sửa
  H1 các nhóm bố cục, axe và không-JS pass (17/17).
- Build production: `pnpm cf:docker --build` (trên Windows `next build` không chạy được vì SWC native bị chặn).
- Review cả nhánh (reviewer mới, opus): "sẵn sàng sau khi sửa"; 0 critical, 3 important (2 lỗi code đã sửa theo cách test trước, 1 là
  quyết định design: chủ dự án giữ link từ 1024), 9 minor để lại.
- Chạy tay: chủ dự án xem bản chạy thật và ảnh ở điểm dừng; 20 ảnh VI/EN × 1440/390 chụp lại sau mọi thay đổi (không commit).
  Tab chạy nền (UBE7) thử tay: không còn miếng dán treo, **nhưng** miếng dán đã bay xong trước khi tab ẩn, nên đường "bị dừng giữa
  chừng" chỉ được kiểm bằng unit test (sự kiện giả lập). Giảm chuyển động và tắt JavaScript kiểm bằng e2e, không thử tay.

## Lệch so với plan (ruling)

- Build bằng `cf:docker --build` thay `pnpm build` (Windows).
- Ảnh OG tách khỏi Task 2, làm sau khi chủ dự án cho phép tải font.
- Link nav header từ 1024 và nút header cỡ nhỏ, để không tràn ở 768 với chữ 125% (chủ dự án giữ sau review, UB16 vòng 3).
- Chữ mục VI/EN chưa chọn màu trắng (axe đo màu nhạt cũ ≈ 4,1:1 trên nền pha).
- Miếng dán đã chọn ẩn bằng `invisible` thay `opacity-0` (rời khỏi tab order).
- Nền trang trắng thay `canvas` (Task 1 đổi tên cơ học làm trang pháp lý thành tím nhạt).
- Khoảng lệch dưới header dính: `scroll-padding-top` của trang thay `scroll-margin` từng đích (lo cả Tab lẫn link nhảy).
- RF1 chờ URL 15s (từng chập chờn 1 lần khi máy tải nặng).
- H1: `text-wrap: pretty` thay `balance` mà chủ dự án chọn, vì Chrome không cân dòng khi có `<br>` (UB20).

## Còn mở

- Việc nhỏ để lại: icon, apple-icon và manifest còn màu cũ (`theme_color` khác `viewport.themeColor`); ở chế độ tương phản cao của
  Windows, nút phụ, viền FAQ khi mở và vạch tiến độ mất đường viền; test RF5 không chứng minh được việc hiển thị ở chế độ tương phản
  cao; viền focus của skip link không thấy trên header xanh; chữ VI/EN khi rê chuột ≈ 3,95:1; nên chú thích chỗ biến font phụ thuộc
  `<html>`; header 1024 với chữ 125% chưa có test; nút VI/EN cao 32px (có từ trước).
- Cho plan admin: `--shadow-ledge-soft` dùng `#e3e6f4` trong khi design ghi `#dde1f5` cho tờ trắng admin; `--radius-control/panel`
  của admin (0,375rem) sẽ đụng giá trị của package; lần thử admin mới chứng minh đọc được package, chưa kiểm màu thật.
- Dev server Docker (cổng 3200) không tự cập nhật khi sửa file trên Windows: phải khởi động lại container.
- Plan admin: PR #19 đã merge vào `dev` (15/10/2026), nên đây là việc tiếp theo (UB19); đọc lại M3 đã merge trước khi viết.
