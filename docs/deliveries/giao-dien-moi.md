# Giao diện mới — plan tóm tắt, phần 1 (10/11/2026)

Plan: [`../superpowers/plans/2026-11-10-giao-dien-moi.md`](../superpowers/plans/2026-11-10-giao-dien-moi.md). Design: [`../superpowers/specs/2026-11-09-giao-dien-moi-design.md`](../superpowers/specs/2026-11-09-giao-dien-moi-design.md).
Phần 1 gồm chuẩn bị nhánh, toàn bộ API mới và đợt M1. M2–M9 mỗi đợt có phần plan riêng, viết và duyệt ngay trước đợt đó. QR4 (quảng cáo) chủ dự án gác lại ngày 10/11/2026: giữ DB38, plan giữ chỗ trống.

**Chuẩn bị**
- Task 0: gắn tag `archive/giao-dien-cu-2026-11` tại `dev`, đẩy tag; ghi file chỉ màn cũ nằm ở file nào; mở file rulings; tạo nhánh dài `refactor/giao-dien-moi`.

**API (nhánh `feat/giao-dien-moi-api`, một PR)**
- A1: kiểu dữ liệu của port Practice và các hàm thuần gộp số lịch học theo tháng, theo ngày, phân trang.
- A2: Practice đếm số phiên, số câu đã chấm theo ngày cho Learning qua port.
- A3: `GET /v1/me/calendar` (tổng theo tháng) và index `(user_id, local_date)` của `learning_log`.
- A4: `GET /v1/me/calendar/days/:date` (chi tiết một ngày, lọc theo loại, phân trang, số liệu thêm).
- A5: `GET /v1/me/streak` (chuỗi ngày học).
- A6: `GET /v1/groups` thêm từ tiếp theo và lần ôn gần nhất của mỗi nhóm.
- A7: `GET /v1/practice/sessions/last` (lần luyện gần nhất).
- A8: `GET /v1/public/prices` (giá Pro công khai, giới hạn theo IP).
- A9: smoke `smoke:giao-dien-moi` trên API thật, kiểm đủ các số; chạy lại smoke đợt C; mở PR.

**M1 — Nền (nhánh `feat/giao-dien-moi-m1`, một PR)**
- M1.1: bộ token `wm-` sáng và tối (màu, bo góc, bóng, cỡ chữ theo text style Figma, mờ, thời lượng) và test.
- M1.2: nối token vào `globals.css`, token font, nền lưới chấm, sửa `cn` để không mất cỡ chữ mới.
- M1.3: đổi Lexend sang Noto Sans, Bricolage Grotesque, JetBrains Mono; sửa test e2e font.
- M1.4: dời các file phát âm sang `lib/speech/`.
- M1.5: luật import theo thư mục và test cho luật đó.
- M1.6: nút, nút link, nút chữ, phím, card, nhãn, huy hiệu Pro, nền lưới chấm trong `ui/`.
- M1.7: ô nhập, ô tick, ô chọn, công tắc, nút chia đoạn trong `ui/`.
- M1.8: hộp thoại và tấm trượt theo chuyển động mới, toast, khung xương.
- M1.9: dựng lại thanh trên, thanh điện thoại, thanh tab dưới, menu ảnh đại diện, nút quay lại, cột phụ, nút + theo Figma.
- M1.10: tách route thành `(chrome)`, `(onboarding)`, `(focus)`; bỏ `AppShell` ở 17 chỗ; sửa test màn.
- M1.11: khung xương khi chuyển trang và khi tải cứng, màn lỗi có nút "Thử lại".
- M1.12: 5 mockup chế độ tối gửi chủ dự án duyệt; sửa tài liệu nguồn theo bảng chỗ lệch.
- M1.13: chạy toàn bộ kiểm thử, chụp ảnh bộ `gm-m1`, ghi as-built, mở PR.

**Giữ chỗ**
- Q4: quảng cáo và tải lại trang, viết khi chủ dự án quay lại QR4; tới lúc đó giữ DB38.

# Giao diện mới — plan tóm tắt, phần 2: M2 Đăng nhập và tài khoản (10/11/2026)

Plan: "Part 2" trong file plan ở trên. Nhánh `feat/giao-dien-moi-m2`, một PR vào `refactor/giao-dien-moi`. API không đổi.

- M2.1: ô mật khẩu có nút hiện/ẩn; ô nhập có chỗ đặt link ở dòng nhãn.
- M2.2: ô mã 6 số, chuyển hành vi gõ, dán, xóa từ trang xác minh email sang `ui/`.
- M2.3: nút Google, cờ, ô ngày sinh sang bộ `ui/` mới.
- M2.4: chuyển Turnstile vào `features/learner/auth/`; luôn hiện hay chỉ hiện khi cần theo câu QM2-1.
- M2.5: tách `(auth)` thành `(split)` (đăng nhập, đăng ký: hai cột, panel giới thiệu từ 1280 px) và `(card)` (năm trang còn lại); card giữa theo Figma; token cỡ tiêu đề.
- M2.6: phần dùng chung (tiêu đề, lỗi, nút Google, dòng "Hoặc") và dựng lại Đăng nhập.
- M2.7: dựng lại Đăng ký, thêm ô "Nhập lại mật khẩu" (chỉ kiểm ở giao diện).
- M2.8: dựng lại Xác minh email, Quên mật khẩu, Đặt mật khẩu mới (mã 6 ô, thêm "Nhập lại mật khẩu mới").
- M2.9: dựng lại Hoàn tất đăng ký Google, Đã xóa tài khoản, Bổ sung hồ sơ, Chào mừng.
- M2.10: chạy toàn bộ kiểm thử, chụp bộ ảnh `gm-m2`, ghi as-built, mở PR.

# Giao diện mới — plan tóm tắt, phần 3: M3 Hôm nay và Nhóm (10/11/2026)

Plan: "Part 3" trong file plan ở trên. Nhánh `feat/giao-dien-moi-m3`, một PR vào `refactor/giao-dien-moi`. API không đổi.

- M3.1: token màu ngăn, màu nhóm (viền, nhạt, nền chọn, màu chữ đậm ≥ 4,5:1) và token chuyển động của băng chuyền.
- M3.2: hàm màu nhóm theo ID, độ dày chồng thẻ, vị trí trên băng chuyền, thanh nhịp ôn.
- M3.3: chồng thẻ nhóm dùng chung, thanh ngăn, cặp nút Học · Ôn kiểu mới.
- M3.4: web đọc từ tiếp theo, lần ôn gần nhất, lần luyện gần nhất.
- M3.5: dựng lại Hôm nay (khối ôn tiếp, lần luyện gần nhất, 4 nhóm khác, cột phụ).
- M3.6: dựng lại Nhóm thành băng chuyền "Trượt mờ" và bảng chọn nhóm (phím F).
- M3.7: dựng lại Một nhóm (chip lọc, thanh nhịp ôn) và hiệu ứng thẻ bay khi mở, đóng nhóm.
- M3.8: dựng lại Từ lâu chưa ôn và Chủ đề với thanh nổi ở dưới.
- M3.9: chuyển năm hộp thoại của nhóm sang bộ mới.
- M3.10: chạy toàn bộ kiểm thử, đo khung hình băng chuyền, chụp bộ ảnh `gm-m3`, ghi as-built, mở PR.

# Giao diện mới — plan tóm tắt, phần 4: M4 Tra từ, trang một từ, Thêm từ (10/11/2026)

Plan: "Part 4" trong file plan ở trên. Nhánh `feat/giao-dien-moi-m4`, làm sau khi M3 merge, một PR vào `refactor/giao-dien-moi`.

- M4.1: API danh sách từ trả thêm phiên âm, câu ví dụ, tổng số từ khớp bộ lọc; thêm kiểm vào smoke.
- M4.2: nút loa, dòng phiên âm sang `ui/`; hộp thoại có cỡ 860 px; toast đặt được thời gian.
- M4.3: chuyển ô tìm từ lên thanh trên, bỏ dải tìm cũ dưới thanh trên.
- M4.4: dựng lại năm hộp Thêm từ, Thêm câu, Thêm cả loạt, Kết quả tra AI, Chọn nhóm; nút lưu "Lưu".
- M4.5: dựng lại Tra từ thành trang từ điển, thẻ nhấc lên, bấm chồng nhóm để thêm.
- M4.6: dựng lại trang một từ (UK/US, tab nhảy trong trang, câu đã gặp, cột "Bạn đang học", "Cùng chủ đề") và ba hộp Sửa từ, Xóa từ, Câu đã gặp.
- M4.7: chạy toàn bộ kiểm thử, chụp bộ ảnh `gm-m4`, ghi as-built, mở PR.

# Giao diện mới — as-built API (10/11/2026)

Nhánh `feat/giao-dien-moi-api`, 9 commit `f33dd0fe`…`5f9ca6fc`, PR vào `refactor/giao-dien-moi`. Rulings R1–R5 ở [`giao-dien-moi-rulings.md`](giao-dien-moi-rulings.md).

**Đã làm**
- `GET /v1/me/calendar?month=YYYY-MM`: số từ học mới, số lần ôn, số phiên luyện của từng ngày trong tháng và tổng tháng. Tháng ngoài 2026-01…2100-12 → 400.
- `GET /v1/me/calendar/days/:date`: số liệu một ngày (`learned`, `reviewed`, `reviewed_known`, `reviewed_again`, `learned_groups`, `practice_questions`), danh sách từ lọc theo `kind`, phân trang; `page_token` gắn với ngày và `kind`, dùng sai → 400.
- Practice đếm phiên và câu đã chấm theo ngày cho Learning qua port `PRACTICE_DAY_COUNTS`; Learning không đọc bảng của Practice.
- `GET /v1/me/streak`: `{ days, studied_today }` theo múi giờ người học.
- `GET /v1/groups`: thêm `next_lemma` (thẻ đầu của hàng đợi `mode=due`) và `last_reviewed` (`lemma`, `at`) cho mỗi nhóm.
- `GET /v1/practice/sessions/last`: phiên luyện gần nhất có câu đã chấm (số câu, đúng, sai, tối đa 4 từ sai); chưa có → 204.
- `GET /v1/public/prices`: giá Pro 1, 3, 12 tháng, không cần đăng nhập, 60 lần một phút mỗi IP.
- Index `learning_log (user_id, local_date)` (migration `20261113100000_learning_log_user_local_date`).

**Kiểm**
- `pnpm lint`, `tsc --noEmit`, `pnpm build` qua; `pnpm test` 361 file, 5177 test qua.
- Migration trên DB mới `english_learning_smoke_gm`: `prisma migrate diff --exit-code` báo "No difference detected".
- `pnpm smoke:giao-dien-moi`: 12 bước qua; `pnpm smoke:dot-cai-thien-c` trên DB mới riêng: 14 bước qua. Output: [`giao-dien-moi-smoke-output.txt`](giao-dien-moi-smoke-output.txt).
- `pnpm test:scale`: `GET /v1/groups` với 100 nhóm × 2.000 từ, median 399 ms (ngưỡng 500 ms) khi chạy một mình. Lần đầu chạy song song với `pnpm test` đo 582 ms.

**Chưa kiểm / rủi ro**
- `GET /v1/groups` còn khoảng 100 ms tới ngưỡng ở 100 nhóm × 2.000 từ; đo lại trên máy chủ thật trước launch.
- Chưa có giao diện nào gọi các endpoint mới; M2 trở đi mới dùng.

# Giao diện mới — as-built M1 (10/11/2026)

Nhánh `feat/giao-dien-moi-m1`, PR vào `refactor/giao-dien-moi`. Rulings R6–R21 ở [`giao-dien-moi-rulings.md`](giao-dien-moi-rulings.md).

**Đã làm**
- Token `wm-` sáng và tối trong `packages/design-tokens` (`web.css`, `web-dark.css`): màu, bo góc, bóng, cỡ chữ theo text style Figma, độ mờ, thời lượng chuyển động; nối vào `globals.css` cùng nền lưới chấm.
- Font Noto Sans, Bricolage Grotesque, JetBrains Mono qua `next/font` thay Lexend.
- `src/ui/`: nút, nút link, nút chữ, phím, card, nhãn, huy hiệu Pro, ô nhập, ô tick, công tắc, nút chia đoạn, ô chọn, hộp thoại và tấm trượt theo chuyển động mới, toast, khung xương. Chưa màn nào dùng; M2 trở đi dùng.
- Khung app làm lại theo Figma: thanh trên (logo, 4 tab, Thêm từ với phím N, chip gói, menu ảnh đại diện), thanh trên điện thoại, thanh tab dưới, liên kết quay lại, cột phụ, nút "+" ở Hôm nay.
- Route tách thành `(chrome)`, `(onboarding)`, `(focus)`; khung nằm ở layout; `AppShell` bỏ. Các màn bên trong vẫn là màn cũ; M2–M9 làm lại từng màn.
- Khung xương khi chuyển trang và khi tải cứng; màn lỗi có nút "Thử lại" cho từng nhóm route.
- Luật import theo thư mục (`ui`, `site`, `app-chrome`, `features`) trong ESLint, có test; file phát âm dời sang `lib/speech/`.
- 5 mockup chế độ Tối: https://claude.ai/artifact/GKfEHX3Yeq4LqXKRF8kuDM; tài liệu nguồn sửa theo bảng chỗ lệch.
- Bộ ảnh `SHOTS_MILESTONE=gm-m1 pnpm shots`: đăng nhập; Hôm nay, Nhóm, một nhóm, Cài đặt; sáng và tối; 390 và 1440 px.

**Kiểm**
- Web: lint, typecheck qua; `pnpm test` 104 file, 1038 test qua.
- E2e `pnpm cf:docker` (chạy từ worktree riêng, R21): lần đầu 5 test hỏng, cả 5 do M1.10 (tấm Thêm từ không đóng khi chuyển trang; trang Cài đặt và Tồn đọng tràn ngang ở 390 px). Đã sửa (R20, và `BackLink` cắt tên dài). Lần chạy đầy đủ sau hai sửa đầu: 364 qua, 1 hỏng (Tồn đọng, đã sửa bằng `BackLink`), 33 skip có chủ ý; sau sửa cuối, ba spec liên quan (`overflow`, `cai-thien-a-group`, `chrome`) qua 36/36. CI của PR chạy lại toàn bộ.
- `assert:render-mode` trên bản build của `pnpm bootstrap`: trang chủ tĩnh, không trang nào dưới `/app` được prerender.
- Ảnh `gm-m1`: 20 ảnh ở `apps/web/test-results/shots/gm-m1/` (không commit).

**Chưa kiểm / rủi ro**
- Ảnh chụp cả trang cắt nền lưới chấm và thanh tab dưới ở khoảng 900 px vì hai phần này là `fixed`; trên trình duyệt thật chúng phủ màn hình.
- Bóng ở chế độ Tối, màu nhóm và màu ngăn ở chế độ Tối chưa có trong Figma; mockup tối chờ chủ dự án duyệt.
- Font và layout mới chưa xem trên điện thoại thật.

**Review cuối nhánh M1 (reviewer riêng, 10/11/2026)**
- Đã sửa: thẻ lồng thẻ ở trang đăng nhập và onboarding (`CardFrame` bỏ thẻ, `AuthCard` giữ thẻ của nó); tab thanh trên gãy hai dòng ở 768 px (chữ một dòng, dưới 1024 px ẩn icon, khoảng cách nhỏ hơn). Đã xem trên `pnpm bootstrap` ở 390 và 768 px.
- Để lại, ghi cho M2+: khung xương thấp hơn header thật khoảng 50 px khi tải cứng; trên điện thoại chỉ tới Gói học qua Cài đặt; màn lỗi không tự hết khi chỉ đổi `?id=` (bấm "Thử lại" hoặc đổi trang); ô tìm ở `SearchStrip` giữ chữ chưa gửi khi đổi tab; tên truy cập của logo đặt bằng `aria-label` trên `span`; phím N vẫn mở Thêm từ khi menu ảnh đại diện đang mở.
