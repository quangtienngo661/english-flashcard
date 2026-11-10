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

# Giao diện mới — plan tóm tắt, phần 7: M7 Cài đặt, tài khoản, gói học (11/11/2026)

Plan: "Part 7" trong file plan ở trên. Hai PR vào `refactor/giao-dien-moi`: M7a (`feat/giao-dien-moi-m7a`, sau khi PR M6 merge), rồi M7b (`feat/giao-dien-moi-m7b`, sau khi M7a merge). Không đổi API.

**M7a — Cài đặt, Tài khoản, Xóa tài khoản, Giao dịch**
- M7.1: tiêu đề trang theo Figma (44 / 30) cho mọi trang dùng chung, chấm trạng thái, hàm chia theo tháng, khung xương ba khối.
- M7.2: sửa bốn lỗi tìm thấy khi khảo sát: Xóa tài khoản lỗi không có chữ, thiếu câu báo "gói đang tự gia hạn", thẻ gói ở trang Giao dịch không có ngày với Pro mua qua payOS, cổng thanh toán hiện "payos" (test đỏ trước, sửa sau).
- M7.3: dựng lại Cài đặt (mục lục bên trái, thẻ từng mục, ngôn ngữ, giao diện, nhắc học, các dòng Tài khoản theo thứ tự Figma) và tô mục đang mở trong menu ảnh đại diện.
- M7.4: dựng lại Tài khoản (Hồ sơ, Email đăng nhập có nhãn đã xác minh, thẻ gói học).
- M7.5: dựng lại Xóa tài khoản (cột xác nhận bên trái ở máy tính, thông tin trước ở điện thoại; giữ đường xác nhận bằng Google và chặn khi gói đang tự gia hạn).
- M7.6: dựng lại Lịch sử giao dịch (chia theo tháng, dòng có chấm trạng thái, thẻ gói học) và hộp Chi tiết giao dịch (biên lai, nút chép mã giao dịch).
- M7.7: thêm e2e cho M7a, chạy toàn bộ kiểm thử, chụp bộ ảnh `gm-m7a`, ghi as-built, mở PR.

**M7b — Gói học, Đơn hàng, Giới thiệu Pro**
- M7.8: thẻ chọn kỳ (`ChoiceCard`), hàm tính giá gạch, phần trăm tiết kiệm, giá mỗi tháng; tách logic mua thành một hook, hành vi giữ nguyên.
- M7.9: dựng lại Gói học (hai thẻ gói, chọn kỳ bằng thẻ, nút "Mua gói Pro {kỳ}", chữ nhỏ và link Điều khoản, bảng so sánh luôn hiện) và hộp Hủy gói.
- M7.10: dựng lại trang Đơn hàng (thẻ đã thanh toán, các trạng thái chờ có chấm nhấp nháy, trạng thái đã dừng; báo cho trình đọc màn hình khi đổi trạng thái).
- M7.11: dựng lại hộp Giới thiệu Pro (viền navy, nhãn Pro, nút "Để sau"); không đụng phần quảng cáo (QR4).
- M7.12: xóa các file giao diện cũ trong `app-ui/` không còn ai dùng.
- M7.13: thêm e2e cho M7b, chạy toàn bộ kiểm thử, chụp bộ ảnh `gm-m7b`, ghi as-built, mở PR.

**Còn chờ chủ dự án:** không có câu hỏi mở. Các quyết định plan tự chốt nằm ở cuối Part 7 ("Decisions this part makes").

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
