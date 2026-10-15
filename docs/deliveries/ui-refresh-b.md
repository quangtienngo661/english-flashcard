# Làm mới giao diện B — plan tóm tắt (15/10/2026)

Design: `docs/superpowers/specs/2026-10-15-ui-refresh-b-design.md`. Plan chi tiết: landing
`docs/superpowers/plans/2026-10-15-ui-refresh-b-landing.md`; admin `docs/superpowers/plans/2026-10-15-ui-refresh-b-admin.md`
(viết sau khi PR #19 merge, UB19).

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

## Admin (`apps/admin`), plan tóm tắt (15/10/2026)

Lúc viết plan, chủ dự án chốt thêm UB22 (màn hẹp hơn 1344px thì panel trượt đè lên bảng) và UB23 (toast và 4 hộp xác nhận
đóng ngay, không mờ dần). Ba điểm mở của landing được giải ở việc 1.

1. Admin dùng bộ token chung và font Lexend; thêm hai màu gờ vào bộ token; lần đầu kiểm màu thật trên trình duyệt.
2. Vẽ lại nút (dày, có gờ, lún khi bấm), ô nhập, ô chọn, ô tick, vùng thả file.
3. Vẽ lại nhãn trạng thái, ô số liệu, thông báo và bảng (tiêu đề cột dính, bấm cả dòng, dòng đang mở tô vàng).
4. Dựng khung mới: sidebar nằm trên nền, đổi ngôn ngữ và tài khoản ở chân sidebar, tiêu đề và nút chính trên tờ trắng, thanh xanh và ngăn kéo trên điện thoại.
5. Thêm hiệu ứng mở/đóng cho dialog, menu, ngăn kéo (không chạy khi máy bật giảm chuyển động).
6. **Điểm dừng:** gửi ảnh khung admin (1440 và 390), chờ bạn duyệt rồi mới làm tiếp.
7. Làm khung panel chi tiết: nằm cạnh bảng từ 1344px, trượt đè từ phải khi hẹp hơn.
8. Mở chi tiết lô nhập trong panel cạnh bảng, URL giữ nguyên.
9. Mở chi tiết publish job trong panel cạnh bảng, URL giữ nguyên.
10. Mở ba form (Upload CSV, Tạo publish job, Đăng ký nguồn) thành dialog đè lên bảng, URL giữ nguyên.
11. Thêm toast xác nhận khi đổi hoặc gỡ vai trò.
12. Sửa B25E30: refresh bị 429 thì chờ rồi thử lại, không đá về trang đăng nhập (test lỗi trước, sửa sau).
13. Kiểm toàn app: thời lượng chuyển động, accessibility (VI/EN, 1440/390), tên dài, chạy lại e2e với API thật.
14. Kiểm cuối, rà soát, chạy tay luồng Bước 2.5, gửi ảnh để bạn duyệt, cập nhật tài liệu, mở PR (không merge).

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

# Làm mới giao diện B — admin as-built (15/10/2026)

Nhánh `feat/ui-b-admin`, cắt từ `claude/gifted-booth-9229f5` (= `feat/ui-b-landing` + commit plan `d45743a`), vì PR #22 (landing,
có `packages/design-tokens`) chưa merge vào `dev`. Chạy theo cách Native (chủ dự án chọn): một phiên tự làm 13 task theo TDD,
một reviewer mới (opus) kiểm cả nhánh ở cuối. Sổ theo dõi và báo cáo review: `.superpowers/sdd/2026-10-15-ui-refresh-b-admin/`
(không commit).

## Đã làm

| Task | Commit | Nội dung |
|---|---|---|
| 1 | `e82406c`, `cffed3d` | Admin dùng `@wordmet/design-tokens` và Lexend; package thêm `danger-deep`, `canvas-deep`; test UBC1 và tương phản cho admin; e2e kiểm màu thật lần đầu. `ADMIN_E2E_PORT` cho e2e (cổng 5173 bị worktree khác giữ) |
| 2 | `9430a11` | Nút dày có gờ (lún khi bấm, chỉ khi cho phép chuyển động), ô nhập, Select, ô tick, vùng thả file |
| 3 | `0c8a390` | Nhãn trạng thái dạng viên (có thanh tiến độ), ô số liệu theo màu, banner, bảng nằm thẳng trên tờ trắng (tiêu đề dính, bấm cả dòng, dòng đang mở tô vàng) |
| 4 | `d75b2ab` | Khung mới: sidebar trên nền, VI/EN và tài khoản ở chân sidebar, tờ trắng có khe nút chính, thanh xanh + ngăn kéo dưới 64rem, AuthCard, `navGroups` viết thường |
| 5 | `559957a` | Hiệu ứng dialog, menu, ngăn kéo qua `data-entering/exiting` dưới `motion-safe:` |
| Điểm dừng A | `a3ed962`, `fa63b0b`, `ea2de9a`, `c4a3caa` | Chủ dự án duyệt sau 2 vòng: chân sidebar luôn thấy ở màn thấp; bảng chia cột theo tỉ lệ thay vì dồn sang phải |
| 6 | `f860f41` | `DetailPanel`: cột cạnh bảng hoặc dialog trượt từ phải; `usePresence`, `useMediaQuery`, `useRetained`, `focusRowLink` |
| 7 | `ebc2c2c`, `6c760a0` | Chi tiết lô thành panel (route lồng, URL giữ); axe quét sau khi hiệu ứng dừng; sửa bấm đúp dòng tạo 2 mục lịch sử |
| 8 | `8cf0ee1` | Chi tiết publish job thành panel |
| 9 | `3a77270` | Ba form thành dialog đè lên danh sách (URL giữ), chặn Esc khi đang gửi; `h1` luôn là tên mục menu |
| 10 | `27d75bc` | Toast khi đổi/gỡ vai trò (bọc `UNSTABLE_Toast` trong `ui/Toast.tsx`, vùng toast ngoài route) |
| 11 | `4e2c230`, `e7e6e8d` | B25E30: test tái hiện, rồi sửa: 429 khi làm mới phiên thì chờ `Retry-After` (10 giây nếu thiếu), thử tối đa 3 lần, màn tải đếm lùi; 3 lần 429 thì về đăng nhập kèm thông báo, không gọi logout |
| 12 | `7e2309b` | Đo chuyển động toàn app (UBC15), axe 11 màn × VI/EN × 1440/390, tên file dài trong panel |
| Review | `7452a19`→`b14efb5`, `7ccd263`→`0e0ae9f`, `a4ee3d0`→`60c9a18` | I1 panel giữ state của dòng trước (nút "Thử lại" có thể publish nhầm lô, B25E28); I3 danh sách không làm mới sau upload; I2 ngưỡng panel 84rem → 87rem. Mỗi lỗi: test đỏ trước, sửa sau |

## Kiểm chứng

- `pnpm lint` 0, `pnpm typecheck` 0, unit `pnpm test --maxWorkers=3` 276/276 (với số worker mặc định, máy đang tải nặng thì 1–2 `findBy`
  1 giây hết giờ ngẫu nhiên; chạy lại là qua), e2e API giả `pnpm test:e2e` 132 qua / 48 bỏ qua (test dành riêng một bề rộng),
  e2e API thật `pnpm test:e2e:real` 7/7 (trước đợt sửa sau review; CI `admin-e2e-real` sẽ chạy lại trên DB sạch).
- Review cả nhánh (reviewer mới, opus): "sẵn sàng sau khi sửa"; 0 critical, 3 important (đã sửa, xem bảng), 12 minor để lại.
- Ảnh 1440/1280/390 (VI, thêm EN ở 1440) gồm panel, dialog, toast: `VISUAL=1 pnpm test:e2e e2e/visual.spec.ts` → `test-results/visual/`.
- B25E30 chạy thật (script tạm, tài khoản e2e, 14 lần tải lại nhanh): API trả 429 `Retry-After: 35`, màn tải đếm lùi 34 → 4 giây rồi
  thử lại; lần thử lại nhận **401 `invalid-token`** và về `/login` không kèm thông báo. Giả thuyết (khớp số đếm, chưa chứng minh):
  vài lần làm mới đã xoay token ở server nhưng câu trả lời bị lần tải lại kế tiếp cắt, cookie giữ token cũ, quá 10 giây ân hạn thì
  bị coi là dùng lại và chuỗi bị thu hồi. Đây là hành vi phía server có từ trước, ngoài phạm vi nhánh này.

## Lệch so với plan (ruling)

- `DetailPanel` nhận children (`PanelHead/Body/Footer`) thay vì props `title/status/footer`, để hook dữ liệu (polling) dừng khi panel đóng.
- Ngưỡng panel `87rem` thay `84rem`: phép tính của plan thiếu lề hai bên của tờ trắng (review I2); giữ đúng ý UB22 "chỉ chia đôi khi bảng vẫn đủ rộng".
- Viền ô nhập 2px thay 1,5px (Tailwind `ring/border` chỉ nhận số px nguyên).
- Khối trong tờ trắng ở mọi trang (không chỉ Vai trò) dùng viền `border-2` thay thẻ trắng có gờ.
- Bảng dùng `table-auto` với tỉ lệ cột, các ô ngắn không xuống dòng (góp ý ở điểm dừng A).
- UBE22 (mở/đóng menu nhanh) kiểm bằng chuột: menu mở lại trong 150ms đang đóng thì không nhận focus nên Esc không tới (React Aria).
- Test axe chờ hiệu ứng dừng rồi mới quét (dialog đang hiện dần làm chữ mờ, đo tương phản sai).
- e2e API thật chạy trên stack có sẵn: API của worktree `english-learning-wt-m1` với DB `english_learning_b25manual` (DB chạy tay của chủ
  dự án) và dev server của nhánh này; lần chạy đã ghi tài khoản/nguồn/lô thử vào DB đó.

## Còn mở

- **Cần chủ dự án quyết hoặc biết:** dữ liệu thử đã ghi vào `english_learning_b25manual`; B25E30 vẫn có thể mất phiên khi tải lại
  thật nhanh do xoay token (ở trên); UBE21 (đóng dialog rồi chuyển tab ngay) chưa thử tay vì Playwright không làm tab ẩn được.
- 12 minor của review (`final-review.md` trong sổ theo dõi), tóm tắt: focus về dòng chưa đúng ở dạng panel trượt đè (UBE26) và đôi khi
  thừa một lần; bấm ✕ hai lần nhanh tạo 2 mục lịch sử; selector từ URL chưa escape; panel dính `top-0` để hở 1,75rem ở đáy khi cuộn;
  câu đếm lùi nằm trong vùng `role=status`; import vòng `shortId`; kéo cửa sổ qua ngưỡng làm mất dialog hoàn tác đang mở; `aside`
  nằm trong `main` (axe mức moderate); thêm 401 trong lúc chờ 429 giữa phiên.
- Rà soát thiết kế (của phiên): trên điện thoại mục menu trong ngăn kéo cao 33px (bản cũ ~40px), VI/EN 32px, ☰/✕/"Chi tiết" 40px
  (đạt mức 24px của WCAG 2.2 AA, dưới 44px dự án dùng cho nút gửi); chân panel ở 1440 xuống 2 hàng; viên "Một phần" gần mất viền
  trên dòng đang chọn (cùng nền vàng nhạt); danh sách menu cuộn được mà không có dấu hiệu.
- PR #22 chưa merge: PR admin đặt base `feat/ui-b-landing`, đổi base sang `dev` khi #22 merge.
