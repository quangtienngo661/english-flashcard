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

# Giao diện mới — plan tóm tắt, phần 5: M5 Luyện tập, Học, Ôn (10/11/2026)

Plan: "Part 5" trong file plan ở trên. Hai PR: M5a (`feat/giao-dien-moi-m5a`, sau khi M3 merge), rồi M5b (`feat/giao-dien-moi-m5b`, sau khi M5a merge).

**M5a — Luyện tập**
- M5.1: API trả ngăn hiện tại của từ khi trả lời và số câu đúng, sai của phiên đang dở; thêm kiểm vào smoke.
- M5.2: ô đáp án, thanh tiến độ, nút tăng giảm số, dòng phím tắt trong `ui/`.
- M5.3: dựng lại hộp Tùy chỉnh phiên (nhóm, ngăn, kiểu câu, câu AI, số câu, thứ tự) và các trạng thái lượt AI; gửi nguồn `own_then_ai`.
- M5.4: dựng lại màn phiên luyện (thanh phiên, thẻ câu, kết quả đúng/sai, ngăn lên, nút có phím).
- M5.5: dựng lại tổng kết phiên, trang Luyện tập, Từ hay sai.
- M5.6: chạy toàn bộ kiểm thử, chụp bộ ảnh `gm-m5a`, ghi as-built, mở PR.

**M5b — Học và Ôn**
- M5.7: chồng thẻ, kéo để chấm, đống chip từ, chuyển động tan mờ.
- M5.8: dựng lại Học (lật hai chiều, phím mũi tên, nhắc khi chưa lật, tổng kết) và đo khung hình.
- M5.9: dựng lại Ôn (trắc nghiệm theo nghĩa, gõ từ, dòng so chữ, màn xong), thêm e2e cho Ôn, mở PR.

**Còn chờ chủ dự án:** QM5-1 (merge PR #249 trước M5?), QM5-2 (thẻ ở Học tan ngay hay chờ lưu xong).

# Giao diện mới — plan tóm tắt, phần 6: M6 Lịch học (10/11/2026)

Plan: "Part 6" trong file plan ở trên. Nhánh `feat/giao-dien-moi-m6`, làm sau khi M4 (PR #257) merge, một PR vào `refactor/giao-dien-moi`. M6.9 chờ M5a và M5b merge; nếu phần còn lại xong trước thì M6.9 thành PR thứ hai.

- M6.1: API danh sách "Báo lỗi của tôi" trả thêm từ, kiểu câu, cờ câu AI; thêm kiểm vào smoke.
- M6.2: hàm ngày theo múi giờ người học, query chuỗi ngày và lịch; cập nhật chuỗi ngày từ câu trả lời; route mặc định cho test.
- M6.3: nút lịch nổi có chuỗi ngày, xếp trên nút "+" ở Hôm nay (điện thoại), ẩn ở Từ tồn đọng và Chủ đề; phím L.
- M6.4: mở hộp Lịch, Ngày theo `?lich=`, `?ngay=` với ba luật nút Quay lại; link "Mở lịch học" ở Hôm nay và Luyện tập mở hộp Lịch.
- M6.5: dựng hộp Lịch (tổng tháng, lưới ngày có chấm và dải ngày liền nhau, phím mũi tên, đổi tháng).
- M6.6: dựng hộp Ngày (lọc, thẻ Học, Ôn, Luyện tập theo từng phiên, "+N từ", "Xem đủ N câu", trạng thái trống).
- M6.7: trang Lịch sử luyện tập cũ chỉ còn chuyển hướng sang hộp Lịch, Ngày hoặc trang Báo lỗi; xóa trang cũ.
- M6.8: trang "Báo lỗi của tôi" trong Cài đặt (chia theo tháng), dòng trong Cài đặt, mục trong menu ảnh đại diện, câu báo sau khi gửi báo lỗi.
- M6.9: nút lịch trên thanh của phiên luyện, Học, Ôn ở điện thoại.
- M6.10: thêm e2e mở lịch và xem một ngày, chạy toàn bộ kiểm thử, chụp bộ ảnh `gm-m6`, ghi as-built, mở PR.

**Còn chờ chủ dự án:** QM6-1 (dòng báo lỗi trên điện thoại có hiện ngày gửi không).

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

# Giao diện mới — as-built M2 Đăng nhập và tài khoản (10/11/2026)

Nhánh `feat/giao-dien-moi-m2`, PR vào `refactor/giao-dien-moi` (mở sau khi PR M1 #251 merge). API không đổi. Rulings R22–R36 ở
[`giao-dien-moi-rulings.md`](giao-dien-moi-rulings.md). Chủ dự án chốt QM2-1 ngày 10/11/2026: ô Turnstile **luôn hiện**.

**Đã làm**
- `src/ui/`: `PasswordField` (nút mắt hiện/ẩn, không gửi form), `TextField` có chỗ đặt link ở dòng nhãn, `OtpField` (6 ô: gõ, dán, xóa lùi, mã tự điền từ
  điện thoại hay trình quản lý mật khẩu), `GoogleButton`, `DateOfBirthField`, `Flag`. `date-of-birth` sang `lib/`; đường dẫn cũ trong `app-ui/` chỉ còn
  re-export tới M8.
- `(auth)` tách thành `(split)` (Đăng nhập, Đăng ký: cột form 400 px, panel thương hiệu 640 px từ 1280 px, chân trang) và `(card)` (5 trang còn lại: card
  480 px, hai quầng sáng). `AuthGate` không vẽ khung nữa; ngoại lệ B8-2 giữ nguyên. Card của `(onboarding)` dùng cùng khung. Thay LR43 (03/11/2026).
- Token mới trong `packages/design-tokens/web.css`: `page-title` 44, `page-title-mobile` 38, `card-heading` 30, `card-heading-mobile` 26.
- 9 trang dựng lại trên kit mới; `features/learner/auth/**` (trừ test) không còn import `@/app-ui/*`. Ô "Nhập lại mật khẩu" ở Đăng ký và "Nhập lại mật
  khẩu mới" ở Đặt mật khẩu mới chỉ kiểm ở giao diện: nhập lệch thì không gửi gì, lỗi dưới ô; body gửi API như cũ. Mã đặt lại thành 6 ô.
- Turnstile (`TurnstileWidget`, `use-turnstile`) chuyển vào `features/learner/auth/`; test ghim tùy chọn hiện nay (không có `appearance`).

**Kiểm**
- Web: lint, typecheck qua; `pnpm test` 106 file, 1063 test qua (sau khi merge đầu nhánh M1 `8a142dc0`).
- Admin (token đổi): lint, typecheck, test 1397 qua; build qua với biến của CI (`VITE_API_BASE_URL=https://admin-api.wordmet.com`, khóa Turnstile thử).
- E2e `pnpm cf:docker` toàn bộ trước khi merge M1: 360 qua, 5 hỏng, 4 flaky. Cả 5 hỏng là đúng 5 lỗi M1 đã sửa sau đó trên nhánh M1 (R20 của M1).
  Sau khi merge M1, chạy lại các spec liên quan (`cai-thien-a-group`, `overflow`, `m5a`, `m1`, `b8-set-password`, `landing`, `csp`): 154 qua, 6 flaky
  (qua ở lần thử lại), 2 hỏng ở `m5a` trên mobile (phiên luyện AI, không thuộc M2; lượt đó chạy cùng lúc `pnpm bootstrap` đang build). CI của PR chạy lại toàn bộ.
- Review cuối cả nhánh (subagent): 0 Critical, 1 Important (mã tự điền vào ô 1 chỉ giữ số cuối) đã sửa bằng test đỏ rồi fix; 3 Minor để lại (dưới).

**Ảnh `gm-m2`** (390 và 1440 px, sáng; 18 ảnh ở `apps/web/test-results/shots/gm-m2/`, không commit)

| Trang | Figma | Ảnh |
|---|---|---|
| Đăng nhập | `35:308` / `37:485` | `vi-light-login-{1440,390}.png` |
| Đăng ký | `35:405` / `37:533` | `vi-light-register-…` |
| Xác minh email | `36:385` / `37:623` | `vi-light-verify-email-…` |
| Quên mật khẩu | `36:417` / `37:656` | `vi-light-forgot-password-…` |
| Đặt mật khẩu mới | `36:447` / `37:687` | `vi-light-reset-password-…` |
| Hoàn tất đăng ký Google | `36:490` / `37:731` | `vi-light-google-complete-…` |
| Đã xóa tài khoản | `36:549` / `37:791` | `vi-light-account-deleted-…` |
| Bổ sung hồ sơ | `36:564` / `37:807` | `vi-light-complete-profile-…` |
| Chào mừng | `36:591` / `37:835` | `vi-light-welcome-…` |

Ảnh chụp bằng API giả của e2e trong `cf:docker`, không bằng `SHOTS_MILESTONE=gm-m2 pnpm shots`: lệnh đó cần app ở :3001 với API thật, mà cổng 3001
đang do container `english-learning-web-1` của `pnpm bootstrap` giữ và API chỉ cho CORS từ 3000, 3001. Bộ `gm-m2` đã có trong `e2e-shots/shots.spec.ts`
để chạy với stack thật sau này.

**Chưa kiểm / rủi ro**
- Chưa chụp chế độ Tối và tiếng Anh cho M2 (plan chỉ yêu cầu sáng, tiếng Việt).
- Minor để lại: (1) phím Tab tới "Quên mật khẩu?" trước ô Mật khẩu (thứ tự Figma vẽ); (2) chữ "Đề 12" trên panel thương hiệu (ẩn với trình đọc màn hình) vẫn
  tiếng Việt ở `/en`; (3) lỗi "mã chưa đúng" ở Đặt mật khẩu mới chưa gắn `aria-describedby` vào nhóm ô mã (R33).
- `m5a` chạy lại riêng: 21 qua, 1 flaky (qua ở lần thử lại); hai lần hỏng trước là do máy đang build `bootstrap` cùng lúc. `m5a` vẫn hay flaky trên mobile (cả lượt đầu).
- Chưa xem trên điện thoại thật; mã tự điền chỉ kiểm bằng test jsdom.
- Xác minh email: đi một mạch từ Đăng ký hay Đăng nhập thì chỉ có ô mã (Figma `36:385`). Tải lại trang, mở tab mới hay trình duyệt tự tải lại tab thì mất mật khẩu trong bộ nhớ, nên trang hỏi thêm ô "Mật khẩu" vì `POST /v1/auth/verify-email` cần mật khẩu để đăng nhập. Chủ dự án xem và giữ như vậy (10/11/2026). Ảnh `vi-light-verify-email-*` mở thẳng trang nên có ô này.

# Giao diện mới — as-built M3 Hôm nay và Nhóm (10/11/2026)

Nhánh `feat/giao-dien-moi-m3`, PR vào `refactor/giao-dien-moi`. API không đổi. Quyết định khi làm: R37–R54 trong `giao-dien-moi-rulings.md`.

**Đã làm**
- Token màu ngăn, màu nhóm theo ID (viền, nhạt, nền chọn, màu chữ ≥ 4,5:1), token chuyển động của băng chuyền; hàm `groupColorIndex` (FNV-1a), `groupTone`, độ dày chồng, vị trí băng chuyền, thanh nhịp ôn.
- `GroupStack` (một thiết kế co theo `em`, ba trạng thái: thường, xong hôm nay, trống), `ui/StageBar`, `DeckButtons` trên `ui/ButtonLink` (nút có việc chờ là nút chính navy).
- Web đọc `next_lemma`, `last_reviewed` và `GET /v1/practice/sessions/last` (204 → không có khối).
- Hôm nay: khối "ôn tiếp", "Lần luyện gần nhất" (link "Luyện lại từ sai →", "Mở lịch học" tới trang lịch sử cũ cho tới M6), tối đa 4 thẻ nhóm khác (nhóm trống cũng là thẻ, chủ dự án 10/11/2026), dòng "Xong hôm nay", chủ đề gợi ý dạng thẻ nhỏ có trình độ, từ mẫu và số từ (chủ dự án yêu cầu làm đẹp hơn hàng chữ của Figma), cột phụ.
- Nhóm: băng chuyền "Trượt mờ" (← →, vuốt, cuộn ngang, nút mũi tên; ↓ mở nhóm), bảng chọn nhóm phím F (tìm không dấu, ba nhóm chú thích, ↑ ↓ Enter Esc), dòng `aria-live`, chồng bên cạnh `inert`.
- Một nhóm: đầu trang có chồng thẻ, chip hôm nay, thanh nhịp ôn có nhãn; chip lọc thay ô chọn; hàng từ 5 cột; thẻ bay khi mở và đóng nhóm. **Khối xem trước thẻ đã bỏ theo quyết định QM3-1 của chủ dự án ("Bỏ như Figma").**
- Từ lâu chưa ôn và Chủ đề: số lớn, đoạn giải thích, danh sách có chọn tất cả, thanh nổi ở dưới chỉ hiện khi đã chọn từ.
- Năm hộp thoại (Tạo, Đổi tên, Xóa nhóm, Bỏ từ khỏi nhóm, Bỏ N từ khỏi việc học) chuyển sang `ui/Dialog`; hộp xóa có khối cảnh báo theo thẻ "Xác nhận xóa".
- File `loading` riêng cho Hôm nay, Nhóm, Một nhóm; xóa `GroupCard.tsx`, khóa chữ không còn dùng.

**Kiểm**
- Web: lint, typecheck qua; `pnpm test` 112 file, 1149 test qua (sau khi merge M1, M2). Admin: lint, typecheck, build qua; test có 16 test quá thời gian khi máy bận, chạy lại riêng 9 file đó qua 246/246.
- E2e `pnpm cf:docker` (m1, m2, m3, cai-thien-a-group, overflow, csp; 390 và 1440): 101 qua, 6 qua ở lần thử lại, 0 hỏng, sau khi sửa 2 test ở khổ điện thoại.
- Chủ dự án tự thử bản `pnpm bootstrap` của nhánh này (10/11/2026): "không có vấn đề gì, ổn".
- Khung hình băng chuyền: đo trên trang Nhóm có 8 nhóm, CPU chậm 4× (CDP), Chromium headless trong container Linux không GPU, đếm `requestAnimationFrame` trong 700 ms sau mỗi lần đổi nhóm: trung vị 10,4 khung/giây (6 lần: 11,7; 10,4; 9,1; 0,8; 0,1; 16,9). Số này thấp hơn nhiều so với máy thật vì không có GPU; chưa đo trên điện thoại thật.

**Chưa kiểm / rủi ro**
- **Bộ ảnh `gm-m3` chưa chụp được.** Script đã có (`SHOTS_MILESTONE=gm-m3 pnpm shots`); stack `pnpm bootstrap` ở cổng 3001 đang chạy code của bản checkout chính, còn app của nhánh này chạy ở cổng khác thì API từ chối Origin. Chạy lại script khi stack ở 3001 là code của nhánh này.
- Xóa nhóm từ Một nhóm: e2e desktop thấy lần tải lại trang Nhóm (`hardReplace`) chưa xong trong thời gian của test; bản điện thoại chuyển trang bình thường; unit test xác nhận gọi `hardReplace('/vi/app/groups')`. Đường này có từ trước M3.
- Tiêu đề và số lớn dùng thang cỡ chữ mặc định của Tailwind (R44); đổi sang token tiêu đề của M2 ở đợt sau.
- Màu nhóm, màu ngăn ở chế độ tối dùng giá trị sáng cho tới M9.

# Giao diện mới — as-built M4 Tra từ, trang một từ, Thêm từ (10/11/2026)

Nhánh `feat/giao-dien-moi-m4`, PR vào `refactor/giao-dien-moi`. Quyết định khi làm: R60–R81 trong `giao-dien-moi-rulings.md` (lúc làm đánh số R55–R76, đổi số khi merge PR #256 vì PR đó đã dùng R55–R59).

**Đã làm**
- API (M4.1): `GET /v1/words` thêm `ipa` (UK, không có thì US, không có thì phiên âm riêng), `example` (câu đầu của cùng nghĩa với `meaning_preview`) và `total` (số từ khớp bộ lọc, cả khi trang nằm sau từ cuối). Smoke `smoke:giao-dien-moi` bước 11 đối chiếu với `GET /v1/words/{lemma}`.
- `ui/` (M4.2, M4.7): `SpeakButton`, `PronunciationLine` chuyển từ `app-ui` (đường cũ chỉ còn re-export cho ôn tập và luyện tập tới M5), `Dialog` có `size` `md|lg|xl`, `showToast(…, { timeout })`, `ui/States` (`EmptyState`, `ErrorState` kiểu mới).
- Ô "Tìm từ" có phím `/` trong thanh trên từ 768 px (M4.3); `SearchStrip` đã xóa; trên Tra từ ô này ẩn.
- Năm hộp Thêm từ (M4.4): nút "Lưu" (khóa mới `saveShort`, trang landing vẫn "Lưu {word}"), dòng dạng gốc "went → go · quá khứ của go", hàng nghĩa có radio hoặc dấu "đã có trong nhóm", Hộp 4 hai cột với thẻ xem trước, Hộp 5 có ô màu nhóm và thanh sáu ngăn nhỏ, Hộp 2 có thẻ "mặt sau thẻ"; hộp Thêm từ nạp bằng `next/dynamic`.
- Tra từ (M4.5): ô tìm lớn, câu bộ lọc có menu cho trình độ, chủ đề, loại từ, trang từ điển (đầu trang chạy, chữ cái, mục có IPA, loại từ viết tắt, "của tôi", câu ví dụ tô từ), "Trang sau →" / "← Trang trước" theo cursor (trang đã xem không gọi lại), thẻ nhấc lên với UK/US và ngăn đang học, sáu chồng nhóm bấm để thêm (một lần ghi mỗi lần bấm, "✓ đã có"), "Nhóm khác hoặc tạo nhóm mới", "Mở trang từ →". Điện thoại: thẻ và chồng đứng trước trang.
- Trang một từ (M4.6, subagent): tiêu đề 84/56 px, UK/US theo loại từ, "dạng chia", tab nhảy trong trang, nghĩa theo loại từ với ngăn hoặc "Thêm vào nhóm", "Câu bạn đã gặp", "Bạn đang học", "Cùng chủ đề"; từ của tôi có "Sửa từ", "Xóa từ" ở đầu trang.
- File `loading` cho Tra từ và trang một từ.

**Kiểm**
- API: lint, `tsc --noEmit`, build qua; `pnpm test` 5185/5187: 2 test `admin-grant.spec.ts` quá 5 s khi máy bận, chạy riêng 9/9 (giống R61). Smoke 13/13 (M4.1).
- Web: lint, typecheck qua; `pnpm vitest run --maxWorkers=3` 115 file, 1192 test qua (sau khi merge PR #256). Chạy đủ worker trên máy bận thì 1–3 test quá thời gian, chạy riêng qua.
- Admin: lint, typecheck, build (biến môi trường như CI) qua; `vitest --maxWorkers=2` 105 file, 1397 test qua (lượt đủ worker có 13 test quá thời gian).
- `rg "@/app-ui/" src/features/learner/{lookup,word,add-word}` (trừ test): không còn.
- E2e `pnpm cf:docker` (m1, m2, m3, m5b, cai-thien-a-group, cai-thien-a-speak, overflow; 390 và 1440): lượt đầu bắt 2 lỗi tương phản thật ở Tra từ (R80) và các test còn ghim giao diện cũ; sau khi sửa, m3 và m5b chạy lại 38 qua, 3 qua ở lần thử lại, 0 hỏng; m2 qua (3 qua ở lần thử lại). E2e chưa chạy lại sau khi merge PR #256.
- Review cuối cả nhánh (subagent): 0 Critical, 2 Important đã sửa bằng test đỏ rồi fix (thẻ lấy đúng nghĩa của mục, rê chuột không đổi mục chọn; R81), 7 Minor để lại (dưới).

**Bộ ảnh `gm-m4`: chưa chụp.** Script đã có (`SHOTS_MILESTONE=gm-m4 pnpm shots`, Figma Tra từ `85:3218` / `85:3667`, trang một từ `118:4413` / `118:4714`, Hộp 1 `73:580` / `73:966`, Hộp 2 `73:1167` / `73:1465`, Hộp 3 `73:1701` / `73:1925`, Hộp 4 `75:1071` / `75:1346`, Hộp 5 `75:1548` / `75:1849`). Lệnh cần app của nhánh này ở cổng 3001 với API thật; cổng 3001 đang là stack `pnpm bootstrap` của bản checkout chính (giống M3). Hộp 4 cần tra AI trả lời được (model cho `lookup_word` hoặc `AI_FAKE_ENABLED=true`).

**Minor để lại (review cuối)**
1. `WordPage.tsx`: id `pos-modal auxiliary` có dấu cách, `aria-labelledby` của khối "modal auxiliary" không trỏ được.
2. `AddSentenceSheet`: `save.submit()` không truyền payload; gửi lỗi mạng rồi đổi chữ hoặc nghĩa thì dùng lại cùng Idempotency-Key.
3. Tra từ: lúc đang tải hoặc lỗi, câu bộ lọc đọc "0 từ …".
4. Tra từ: "Trang sau →" thay cả trang bằng khung xương, focus bàn phím rơi về `body`; nút Back của trình duyệt đưa về trang 1.
5. Điện thoại: chọn mục ở dưới thì thẻ đổi ở chỗ đã cuộn khuất.
6. `TopSearch` vẫn gắn phím `/` dưới 768 px (ô bị ẩn) và trong menu bộ lọc (`role=menu`).
7. `marked` khớp theo đầu từ ("go" tô "good"); mini bar trong Hộp 5 làm tên radio dài ra (nên `aria-hidden`).

**Chưa kiểm / rủi ro**
- Chưa xem trên trình duyệt thật ở mọi khổ (chỉ e2e và axe); chưa chụp ảnh đối chiếu Figma.
- Thanh trên ở đúng 768 px (logo, bốn tab, Thêm từ, ô tìm, chip gói, avatar) chưa đo có tràn ngang không.
- Thẻ cũ không bay đi khi đổi mục, chỉ thẻ mới tới (R71).

# Giao diện mới — as-built M5a Luyện tập, Tùy chỉnh phiên, phiên luyện (10/11/2026)

Nhánh `feat/giao-dien-moi-m5a`, PR vào `refactor/giao-dien-moi`. Quyết định khi làm: R84–R104 trong `giao-dien-moi-rulings.md` (lúc làm đánh số R55–R80, đổi số
hai lần khi merge PR #256 và #257). QM5-1 = có: #249 (số câu AI do người học chọn) vào `dev`, rồi vào nhánh dài qua PR #255, nên hộp Tùy chỉnh phiên theo vòng 14.

**Đã làm**
- API (M5.1): câu trả lời có `level` (ngăn sau khi chấm); session view có `correct`, `wrong` để thanh phiên đếm đúng sau khi tải lại. Smoke bước 6 kiểm cả hai.
- `ui/` (M5.2): `AnswerOption`, `ProgressBar`, `Stepper`, `KeyLegend`; `Kbd` rộng theo chữ ("Enter", "Esc").
- Tùy chỉnh phiên (M5.3): cột "Từ" (danh sách nhóm, "Mọi từ / Cần ôn / Ưu tiên", "Chỉ một ngăn") cho Theo nhóm và Từ hay sai; bốn hàng kiểu câu, "Gõ từ" có
  "Theo nghĩa / Theo câu / Trộn" trên hàng; "Câu AI viết" là ô − / + từ 0 với dòng "Tối đa N câu AI · còn M lượt" (hoặc "vì bạn còn M lượt", "Hết lượt…",
  "Xem gói Pro"); hai kiểu AI, "Trắc nghiệm theo câu" có "Chọn nghĩa / Chọn từ / Trộn"; "Xếp câu AI" khi admin để người học chọn; chân hộp có số câu (và "tối đa N"
  ở chế độ theo số từ), thứ tự, "Bắt đầu N câu →", "Trong đó N câu AI, rải đều." Gửi `ai_count`, `ai_placement`, `cloze_source: 'own_then_ai'`; `againBody` gửi lại.
- Phiên luyện (M5.4, dùng chung với Ôn): thanh phiên một thanh tiến độ, "câu n / N", chip ✓/✗; card câu hỏi với chip kiểu câu, "câu AI" và Báo lỗi theo `item.ai`
  (Ôn không có); chỗ trống tô xanh hoặc đỏ sau khi trả lời; panel kết quả nằm dưới card với "Ngăn 1 ngày → Ngăn 3 ngày"; "Chưa đúng" khi còn làm lại; trắc nghiệm
  bằng `AnswerOption` ("Bạn chọn", "Đáp án đúng"); bảng phím theo trạng thái; file `loading` cho nhóm `(focus)`.
- Trang Luyện tập, Tổng kết, Từ hay sai (M5.5): thẻ "Luyện nhanh" với số lớn và câu ví dụ, "Phiên đang dở" dưới thẻ, một card các nguồn, cột phải Gần đây và Phím
  trong phiên; Tổng kết có vòng tròn "16/20 câu đúng" và khối hiện 400 ms cách 90 ms (dùng chung với Học); Từ hay sai có chip ✓/✗ thay "sai x/y".

**Kiểm**
- API: `tsc` qua; `pnpm test` 362 file, 5273/5273. Smoke `smoke:giao-dien-moi` 13/13 trên DB mới (`english_learning_smoke_gm`, API ở :3200), output trong
  `giao-dien-moi-smoke-output.txt`.
- Web: lint, typecheck qua; `vitest run` 117 file, 1211/1211 (trước hai sửa của review; sau đó 680/680 ở `features/learner`, 227/227 ở practice và `ui`).
- Admin: lint, typecheck, build (biến môi trường như CI) qua; `vitest run` 1405/1406, test hỏng (`AiConfigsPage` xóa nháp) chạy riêng 24/24.
- E2e `pnpm cf:docker` cả bộ: 368 qua, 3 qua ở lần thử lại, 38 skip, 1 hỏng (`m5a` "AI failure" trên điện thoại, kẹt ở "Đang tải…" của lớp đăng nhập khi máy đang
  chạy test API cùng lúc); chạy lại riêng 4/4 qua. Ba spec luyện tập (`m4`, `m5a`, `cai-thien-a-practice`) sau M5.3: 74/74.
- Review cuối cả nhánh (subagent, Opus): 0 Critical, 1 Important (sau 403 thiếu lượt AI, hộp vẫn cho chọn quá số lượt thật), 6 Minor. Đã sửa Important và Minor M1
  (Enter sau "Chưa đúng" gửi lại đúng từ sai; nâng lên vì bảng phím mới chỉ vào nó), mỗi cái test đỏ rồi fix.

**Ảnh `gm-m5a`** (390 và 1440 px, sáng; 22 ảnh ở `apps/web/test-results/shots/gm-m5a/`, không commit): trang Luyện tập, hộp Tùy chỉnh phiên ở 4 trạng thái (mặc định;
3 câu AI và câu đã lưu; thiếu lượt AI; không còn kiểu câu), phiên ở 4 trạng thái (câu điền từ; "Chưa đúng" còn làm lại; "Đúng rồi" với ngăn; trắc nghiệm chọn sai),
Tổng kết, Từ hay sai. Chụp bằng API giả trong `cf:docker` như M2, vì cổng 3000/3001 đang là stack `pnpm bootstrap` của bản checkout chính; spec chụp là file tạm,
không commit. Xem ảnh lần đầu bắt hai lỗi hiển thị (chữ "Enter" tràn ô phím; chân hộp xuống dòng), đã sửa.

**Minor để lại (review cuối)**
1. Bảng phím ghi "H Gợi ý" và "Esc Dừng phiên" khi ô gõ đang được chọn, nhưng trong ô gõ H là chữ và Esc đầu tiên chỉ rời ô.
2. Giữ phím H mở liền mọi mức gợi ý (không chặn `e.repeat`).
3. Ô phím làm tên nút khác giữa điện thoại và máy tính ("Câu tiếp Enter"); nên `aria-hidden` ô phím và dùng `aria-keyshortcuts`.
4. Chế độ theo số từ: lúc danh sách nhóm của Từ hay sai đang tải, số câu tạm là 1.
5. Hộp mở trên nhóm đầu tiên kể cả khi nhóm đó chưa có từ (bắt đầu sẽ báo 409).

**Chưa kiểm / rủi ro**
- Chưa chạy với API thật ở trình duyệt; ảnh và e2e đều dùng API giả.
- Chưa chụp chế độ tối, tiếng Anh, 1024 px.
- Chưa xem trên điện thoại thật.
- "Luyện thêm một phiên" xin lại `ai_planned` (số câu AI phiên trước dùng thật), không phải số người học đã chọn (R101).

# Giao diện mới — as-built M5b Học (chồng thẻ), Ôn (so chữ) (11/11/2026)

Nhánh `feat/giao-dien-moi-m5b`, PR vào `refactor/giao-dien-moi`. Quyết định khi làm: R107–R113 trong `giao-dien-moi-rulings.md`. QM5-2 = (a) (chủ dự án 11/11/2026):
thẻ Học tan ngay khi chấm, việc lưu chạy sau lưng.

**Đã làm**
- Chồng thẻ (M5.7): `lib/stack-motion.ts` (tan, đến, rung, về chỗ, chip bay vào, số nảy; giảm chuyển động chỉ còn đổi độ mờ ≤ 200 ms); `review/useCardDrag.ts` (kéo
  ngang quá 110 px hoặc vuốt nhanh thì chấm, thẻ chưa lật chỉ nhích và nhắc); `review/CardStack.tsx` (tối đa 3 thẻ phía sau, chỉ thẻ trên cùng gọi
  `GET /v1/words/{lemma}`, dấu "Cần ôn lại · về ngăn 1 ngày" / "Đã biết · lên ngăn X"); `review/Pile.tsx`, `ui/WordChip.tsx`; CSS `.cstack*` trong `globals.css`.
- Học (M5.8): hai chồng "Cần ôn lại" / "Đã biết" hai bên thẻ, nút trả lời `aria-disabled` tới khi lật, Space lật hai chiều, 1/← và 2/→ chấm, Esc dừng; thanh
  tiến độ với "còn N thẻ"; lưu lần lượt sau lưng, lưu hỏng thì lùi về đúng thẻ đó (R107); tổng kết có vòng "x/y thẻ đã biết" và danh sách từ của từng chồng.
- Ôn (M5.9): dòng so chữ `recall/CompareLine` khi gõ sai rồi bấm "Xem đáp án"; tổng kết Ôn có vòng "x/y từ đúng"; e2e đầu tiên của trang Ôn (`e2e/app/recall.spec.ts`).

**Kiểm**
- Web: lint, typecheck qua; `vitest run` 120 file, 1236/1236 (trước ba sửa của review); sau sửa, review/recall/practice 217/217.
- E2e `cf:docker` cả bộ: 375 qua, 1 qua ở lần thử lại (`cai-thien-a-practice` desktop, chờ URL phiên), 38 skip, 0 hỏng. Sau sửa của review: `m2`, `cai-thien-a-speak`,
  `recall` 47 qua, 1 skip.
- Khung hình Học, 20 thẻ, CPU chậm 4 lần, Chromium headless không GPU, API giả: 40,8 fps, trung vị 16,7 ms, p95 50 ms, 21 khung trên 50 ms trong 739 khung (khoảng 18 giây).
- Review cuối cả nhánh (subagent, Opus): 0 Critical, 2 Important, 9 Minor. Đã sửa, test đỏ rồi fix: (I1) Esc hoặc thẻ cuối khi còn lần lưu đang chờ hiện tổng kết
  ngay, Enter rời trang có thể bỏ các lần lưu chưa gửi, nay hiện spinner tới khi lưu xong; (I2) dấu kéo của lần chấm trước hiện trên thẻ sau khi lật bằng Space;
  (Minor 3, nâng lên vì Review Focus 3) giảm chuyển động mà thẻ phía sau vẫn phóng to và làm mờ khi kéo.
- Lint bắt thêm một giá trị Tailwind thô chưa đánh dấu ở lưới Học (commit M5.8); đã đánh dấu `raw-ok`.

**Ảnh `gm-m5b`** (390 và 1440 px, sáng; 15 ảnh ở `apps/web/test-results/shots/gm-m5b/`, không commit): Học mặt trước, mặt sau, đang kéo (1440), tổng kết; Ôn trắc
nghiệm, chọn sai, so chữ, tổng kết. Ảnh kéo cho thấy chữ trên thẻ bị bôi chọn khi kéo; đã sửa (`user-select: none`) nhưng chưa chụp lại.

**Minor để lại (review cuối)**
1. Kéo ngay lúc thẻ mới đang đến (300 ms) thì thẻ không theo tay, rồi nhảy.
2. Lưu hỏng và một phím bấm rơi đúng vào khoảng giữa hai lần render có thể ghi sai thẻ vào chồng.
3. Key của thẻ đang tan trùng nếu chấm lại cùng thẻ trong khoảng 240 ms sau lưu hỏng.
4. Thẻ đang tan mất dòng dạng từ và đổi chiều cao.
5. `CompareLine` là `role="group"` chỉ có con `aria-hidden`, trình đọc màn hình có thể bỏ qua khi duyệt.
6. "Xem đáp án" trả ô gõ về từ sai đầu tiên, bỏ phần đang gõ lại.
7. Lùi về thẻ 1 sau lưu hỏng thì focus không về nút lật.

**Chưa kiểm / rủi ro**
- Chưa chạy với API thật ở trình duyệt; ảnh, e2e và đo khung hình đều dùng API giả.
- Chưa thử trên điện thoại thật: kéo ngang để chấm trong khi mặt sau dài vẫn cuộn dọc (`touch-action: pan-y`), tốc độ khung hình có GPU.
- Chưa chụp chế độ tối, tiếng Anh, 1024 px; ảnh kéo chưa chụp lại sau sửa bôi chọn.

# Giao diện mới — as-built M6 Lịch học (11/11/2026)

Nhánh `feat/giao-dien-moi-m6`, PR vào `refactor/giao-dien-moi`. Quyết định khi làm: R114–R132 trong `giao-dien-moi-rulings.md` (đánh số tiếp từ R106 của M5a; đổi số nếu M5b dùng trùng). QM6-1: chủ dự án chọn B (R130). M6.9 (nút lịch trên thanh phiên ở điện thoại) chưa làm, chờ M5b merge, sẽ là PR thứ hai từ `feat/giao-dien-moi-m6-session`.

**Đã làm**
- API (M6.1): `GET /v1/practice/reports` thêm `lemma` (một lần `ContentService.cardContent` cho cả trang), `question_type`, `ai`. Smoke bước 12; `smoke:giao-dien-moi` nhận `SMOKE_GM_SUFFIX` (R115).
- Ngày theo múi giờ người học (M6.2): `lib/learner-date.ts` (`todayIn`, `monthOf`, `addDays`, `addMonths`, `elapsedDays`…), `format.date` thêm `monthYear` ("Tháng 11, 2026") và `monthLabel` ("tháng 11, 2026"); query `useStreak`, `useCalendarMonth`, `useCalendarDay`, `useDayAnswers`; câu trả lời có `streak` ghi thẳng vào cache chuỗi ngày (phiên luyện, Ôn, Học).
- Nút lịch nổi (M6.3): dải tháng "T11" / "Nov", ngày hôm nay, huy hiệu chuỗi ngày (ẩn khi 0), chú thích "Lịch học" + phím L, rê chuột tải trước tháng. Điện thoại: nằm trên nút "+" ở Hôm nay (cách 12 px), ẩn ở Từ tồn đọng và Chủ đề. Layout `(focus)` có nút trên máy tính. `AddFab` chuyển từ Hôm nay vào chồng nút của `AppChrome`.
- Host lịch (M6.4): `?lich=` / `?ngay=` theo ba luật của design §5.6, `history.state` đánh dấu bước của tab này (R119, R131, R132), phím L bật / tắt, hai hộp nạp bằng `next/dynamic`. "Mở lịch học" ở Hôm nay và "Gần đây" của Luyện tập là `CalendarLink`.
- Hộp Lịch (M6.5): tổng tháng ("7/8", "55", "130", "4"), lưới ngày có chấm và dải ngày liền nhau, phím mũi tên, Enter, đổi tháng (mốc 2026-01, khóa tháng sau ở tháng hiện tại), "Về hôm nay", trạng thái tải và lỗi. Token mới `--color-wm-practice`, `--color-wm-practice-ink` (R124).
- Hộp Ngày (M6.6): ngày trước / sau, câu tóm tắt, bộ lọc Tất cả / Học / Ôn / Luyện, thẻ Học (chip theo màu nhóm, 10 chip rồi "+N từ"), thẻ Ôn (Đã biết / Cần ôn lại), thẻ Luyện tập theo từng phiên với "Xem đủ N câu", ba trạng thái trống.
- Trang lịch sử cũ (M6.7): `/app/practice/history` chỉ còn chuyển hướng phía server (`?tab=reports` → Báo lỗi, `?date=` → `?ngay=`, còn lại `?lich`); xóa `HistoryPage`, `MyReportsTab` và key `App.practice.history`.
- "Báo lỗi của tôi" (M6.8): `/app/settings/reports`, chia theo tháng, dòng có ngày (điện thoại ở đầu dòng 2, R130), kiểu câu, "câu AI" / "Đã trả lại 1 lượt câu AI", trạng thái có chấm; dòng trong Cài đặt, mục menu ảnh đại diện, câu báo sau khi gửi báo lỗi.

**Kiểm**
- API: lint, `tsc --noEmit`, build qua; `pnpm test` 362 file, 5275/5275. Smoke 14/14 trên DB mới (`giao-dien-moi-smoke-output.txt`).
- Web: lint (gồm `check-tailwind-raw`), typecheck qua; `vitest run` 128 file, 1280/1280.
- Admin (token đổi): lint, typecheck, build (biến môi trường như CI) qua; `vitest run` 1394/1406 lượt đầu (12 test quá thời gian khi máy bận), chạy lại riêng 216/216.
- E2e `pnpm cf:docker` cả bộ, lượt đầu: 376 qua, 38 skip, 4 hỏng (2 test × 2 khổ: axe tương phản ở số ngày ngoài tháng; redirect `?date=` không mở Ngày). Sau R132: `m4`, `m6`, `overflow` 61/61. Lượt cả bộ cuối (sau mọi sửa): 381 qua, 38 skip, 1 flaky (`landing.spec.ts` LR45 ở 320 px, qua ở lần thử lại, không thuộc M6), 0 hỏng.
- Review cuối cả nhánh (subagent Opus): 1 Important (Lịch tự mở lại sau khi đóng hộp mở từ link) và 5 Minor; đã sửa Important và Minor #5 (phím số lọt xuống phiên), mỗi cái test đỏ rồi fix (R131).

**Ảnh `gm-m6`** (390 và 1440 px, sáng, tiếng Việt; 14 ảnh ở `apps/web/test-results/shots/gm-m6/`, không commit). Chụp bằng API giả trong `cf:docker` như M2, M5a (spec chụp là file tạm), vì cổng 3000/3001 đang là stack `pnpm bootstrap` của bản checkout chính. Bộ `gm-m6` cho stack thật đã có trong `e2e-shots/shots.spec.ts`.

| Màn | Figma (desktop / phone) | Ảnh |
|---|---|---|
| Hôm nay có nút lịch | `117:4425` / `117:4712`, nút `95:343` | `vi-light-today-calendar-button-…` |
| Lịch | `102:3278` / `102:3948` | `vi-light-month-…` |
| Ngày (hai phiên, có câu sai) | `103:3820` / `103:4248` | `vi-light-day-…`, `vi-light-day-bottom-…` |
| Ngày trống | không có frame | `vi-light-day-empty-…` |
| Báo lỗi của tôi | `211:5827` / `211:6061` | `vi-light-reports-…` |
| Cài đặt có dòng Báo lỗi | `120:4295` / `120:4559` | `vi-light-settings-row-…` |

**Minor để lại (review cuối)**
1. Trong Ngày, sau khi lùi qua đầu tháng (01/11 → 31/10), nút ghi "Lịch tháng 10" nhưng quay lại về Lịch tháng 11 (mục lịch sử cũ).
2. Ngày có hơn 100 mục: "+N từ" có thể ghi "+0 từ" khi trang sau còn mục; hơn 200 mục thì trang 3 không tải.
3. "Xem đủ N câu": hàm tải trang mới mỗi lần render, có thể hủy trang đang tải rồi tải lại; khối phiên cũ có thể trống tới khi tải xong.
4. Mở `?ngay=` từ link ở tab mới rồi bấm Back hai lần thì rời app (R119, theo luật 3 của design).

**Chưa kiểm / rủi ro**
- Chưa chạy với API thật trong trình duyệt; ảnh và e2e dùng API giả.
- Chuyển cảnh Lịch ↔ Ngày chưa trượt ±22 px, đổi ngày chưa nhích 4 px (R126).
- Chưa chụp chế độ tối, tiếng Anh, 1024 px; màu tối của token luyện tập là tạm (R124).
- Chưa xem trên điện thoại thật.

# Giao diện mới — as-built M6.9 Nút lịch trong thanh phiên (11/11/2026)

Nhánh `feat/giao-dien-moi-m6-session` (cắt từ `feat/giao-dien-moi-m6` sau khi hợp nhất M5b), PR thứ hai của M6. Quyết định: R133.

- Điện thoại: phiên luyện, Ôn và Học có nút lịch 32 × 34 ở cuối hàng đầu (Figma `95:344`), bấm mở Lịch; máy tính giữ nút nổi của layout `(focus)`.
- Test: 3 unit cho nút (`calendar-bar-button.test.tsx`), 3 unit cho thanh phiên (phiên luyện, Ôn có `L` trong ô trả lời, Học), 1 e2e ở 390 và 1440 px trong `m6.spec.ts`.

**Chưa kiểm:** chưa xem trên điện thoại thật; nút trong thanh chưa có ảnh chụp riêng.
