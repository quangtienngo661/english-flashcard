# Decisions — Giao diện mới cho toàn bộ web

Design: [`../specs/2026-11-09-giao-dien-moi-design.md`](../specs/2026-11-09-giao-dien-moi-design.md). Nguồn: chat brainstorm với chủ dự án ngày
09/11/2026 (session `d98c23ae…`), sau các vòng mockup và Figma ghi ở
[`../../mockups/2026-11-05-redesign-concepts/app-redesign-plan.md`](../../mockups/2026-11-05-redesign-concepts/app-redesign-plan.md).

Cách hỏi theo luật của dự án: chủ dự án trả lời trước, Claude đề xuất sau. Câu GM1 vòng đầu chủ dự án bỏ qua ("tiếp tục đi"), nên Claude đề xuất
trước ở câu đó.

## Tóm tắt

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| GM1 | Phạm vi | Toàn bộ web: trang công khai, đăng nhập và tài khoản, app người học | Chủ dự án |
| GM2 | Cất code giao diện cũ | Tag git tại `dev` trước khi đổi; đẩy tag; file ghi màn → file | Chủ dự án (tag); Claude (đẩy tag, file ghi) |
| GM3 | Đưa lên `dev` | Nhánh dài `refactor/giao-dien-moi`, PR từng đợt vào nhánh đó, cuối cùng một PR vào `dev` | Chủ dự án (cách làm); Claude (tên nhánh) |
| GM4 | Chế độ tối | Giữ; mockup tối 5 màn trước khi chỉnh phần tối | Chủ dự án (giữ, mockup); Claude (5 màn), chủ dự án đồng ý |
| GM5 | Màu nhóm | Tính từ ID nhóm, không thêm API | Chủ dự án (không cần API); Claude (theo ID), chủ dự án đồng ý |
| GM6 | API lịch học | Làm trong đợt này | Chủ dự án |
| GM7 | Thứ tự đợt | M1 nền → M2 đăng nhập → M3 Hôm nay, Nhóm → M4 Tra từ, trang từ, Thêm từ → M5 Luyện tập, Ôn → M6 Lịch học → M7 Cài đặt, gói → M8 trang công khai → M9 chế độ tối, rà soát | Claude đề xuất; chủ dự án "ok" |
| GM8 | Cách render | App, đăng nhập: CSR + React Query; trang công khai dựng sẵn; không Server Actions | Claude đề xuất; chủ dự án duyệt ("Viết design doc") |
| GM9 | Khung app | Trong layout, chia nhóm route | Claude đề xuất; chủ dự án duyệt |
| GM10 | Component | Một bộ `src/ui/` cho cả web, phần trang công khai ở `src/site/` | Claude đề xuất; chủ dự án duyệt |
| GM11 | Chính sách, Điều khoản | Giữ đọc văn bản mỗi lần mở | Chủ dự án; Claude đồng ý |
| GM12 | SEO | Metadata, ảnh OG từng trang, sitemap, JSON-LD (VND, Organization), màu trình duyệt | Claude đề xuất; chủ dự án duyệt |
| GM13 | Bóng nút | Giữ bóng navy (và bóng cùng màu cho nút xanh, đỏ); nút tắt không bóng | Chủ dự án |
| GM14–GM18 | Đề xuất chưa chốt | Xem cuối file | Chờ chủ dự án |

## GM1. Phạm vi

Bối cảnh: file Figma mới có ba phần: trang công khai, đăng nhập và tài khoản, app người học.

**Vòng 1.** Claude hỏi, không đề xuất. Chủ dự án trả lời "tiếp tục đi", tức bỏ qua câu này; Claude đề xuất phương án 2.

| Phương án | Trade-off |
|---|---|
| 1. Chỉ app người học | Gọn nhất; trang đăng nhập và trang công khai giữ giao diện cũ |
| 2. App người học cùng đăng nhập và tài khoản | Hai phần cùng nằm dưới `/app`, dùng chung khung, ô nhập, nút. Claude nói trang công khai đã có style mới từ đợt landing (PR #205, #208); câu này sai, xem vòng 2 |
| 3. Cả ba, gồm trang công khai | Làm một lần cho mọi trang |

**Vòng 2.** Chủ dự án hỏi "làm toàn bộ luôn được không". Claude kiểm code: cả web đang dùng font Lexend và màu `#2445d6` từ bộ token dùng chung với
admin, còn Figma dùng Noto Sans, Bricolage, JetBrains Mono và navy `#1e3a8a`; đổi font và màu là đổi cả web một lần. Claude đồng ý, sửa câu sai ở vòng 1.

✅ Phương án 3.

## GM2. Cất code giao diện cũ

| Phương án | Trade-off |
|---|---|
| ✅ A. Tag git tại `dev` trước khi đổi, xóa dần code cũ khỏi `dev`, cần thì lấy file từ tag | Repo gọn; phải dùng lệnh git để xem code cũ |
| B. Dời code cũ vào `apps/web/src/legacy/` | Mở editor là thấy; lint, typecheck, test vẫn chạy qua hoặc phải loại trừ; dễ import nhầm |
| C. Chạy song song hai giao diện bằng công tắc hoặc đường dẫn riêng | So sánh trực tiếp; giữ hai bản chạy được, test gấp đôi |

Chủ dự án chọn A. Claude thêm: đẩy tag lên GitHub để không mất; một file ghi màn nào ở file nào trong tag.

## GM3. Cách đưa lên `dev`

| Phương án | Trade-off |
|---|---|
| A. Từng nhóm màn, mỗi nhóm một PR vào `dev` | PR nhỏ; trong lúc chuyển, app có cả màn mới lẫn cũ |
| B. Làm hết trên một nhánh dài, gộp một lần | `dev` chỉ một kiểu; PR rất lớn, khó review, dễ xung đột |
| ✅ C (chủ dự án đưa ra). Nhánh riêng; PR từng đợt merge vào nhánh đó; xong hết thì merge một lượt vào `dev` | PR từng đợt vẫn nhỏ và có CI; `dev` không có giao diện nửa mới nửa cũ; PR cuối lớn nhưng từng phần đã review |

Claude thêm: tên `refactor/giao-dien-moi` vì hook chặn tên trơn `refactor`; CI chạy trên PR vào mọi nhánh (`ci.yml` không lọc nhánh đích);
hook hỏi chủ dự án mỗi lần merge vì nhánh đích không phải `dev`; merge `dev` vào nhánh định kỳ.

## GM4. Chế độ tối

Bối cảnh: code có nút đổi sáng/tối; Figma có biến màu Dark nhưng chưa vẽ màn tối.

| Phương án | Trade-off |
|---|---|
| Giữ, màu suy ra từ biến | Chưa ai duyệt bằng mắt |
| Tạm tắt tới khi vẽ | Mất tính năng đang có |
| Vẽ màn tối trong Figma trước khi code | Thêm việc vẽ trước |

✅ Chủ dự án: giữ, nhưng vẽ trước mockup vài trang để xem. Claude đề xuất 5 màn: Hôm nay, Nhóm (băng chuyền), Phiên luyện lúc trả lời sai,
hộp Thêm từ, Đăng nhập. Chủ dự án đồng ý ("ok").

## GM5. Màu nhóm

Bối cảnh: Figma dùng màu riêng cho mỗi nhóm; DB chưa có cột màu.

| Phương án | Trade-off |
|---|---|
| Thêm API và cột lưu màu | Người học có thể chọn màu; thêm migration, endpoint, chỗ chọn màu |
| ✅ Tính màu từ ID nhóm | Không thêm dữ liệu; mỗi nhóm giữ màu cố định trên mọi máy; chưa tự chọn được, hai nhóm có thể trùng màu |
| (giữ như hiện nay) Tính theo vị trí trong danh sách | Đang dùng (`GroupCard.tsx:27`); màu đổi khi thứ tự nhóm đổi, nên không làm dấu nhận ra nhóm được |

Chủ dự án hỏi API có cần không vì giao diện hiện tại vẫn có màu mà không cần dữ liệu. Claude kiểm code, đề xuất tính từ ID. Chủ dự án đồng ý.

## GM6. API lịch học

| Phương án | Trade-off |
|---|---|
| ✅ Làm API trong đợt này | Hai hộp Lịch và Ngày chạy đủ khi gộp |
| Dựng giao diện trước bằng dữ liệu đang có, API đợt sau | Đợt này nhẹ hơn; hộp Ngày thiếu danh sách từ |

Chủ dự án: "làm luôn".

## GM7. Thứ tự đợt

Claude đề xuất chín đợt như bảng tóm tắt; chủ dự án "ok".

## GM8–GM10, GM12. Cấu trúc FE và SEO

Chủ dự án yêu cầu theo best practice của Next.js (CSR, SSR, Server Actions, component dùng chung, metadata SEO) và xem cấu trúc trước khi viết.
Claude kiểm code và tài liệu Next 16.4:
- Phiên đăng nhập nằm ở trình duyệt (token trong bộ nhớ tab; cookie gia hạn chỉ tới host của API), nên dữ liệu người học phải tải ở trình duyệt
  và Server Actions không biết người gọi.
- Phương án được nhắc nhưng không làm: chuyển sang mô hình BFF (cookie phiên ở `wordmet.com`, Next chuyển lệnh gọi sang API). Lý do: đổi API và
  bảo mật, ngoài phạm vi.
- Đề xuất: khung app vào layout theo nhóm route, `loading`/`error` theo nhóm, tải code hộp nặng khi mở, tải trước dữ liệu, `next/font` cho ba font,
  một bộ `ui/`, các bổ sung SEO.

Chủ dự án bấm "Viết design doc" sau khi xem: duyệt. Lúc viết, Claude thêm nhóm `(onboarding)` cho "Bổ sung hồ sơ" và "Chào mừng" (khung Figma
của hai trang này là card giữa như trang đăng nhập).

## GM11. Chính sách và Điều khoản

| Phương án | Trade-off |
|---|---|
| ✅ Giữ như hiện nay: đọc văn bản mỗi lần mở | API sập thì hiện bản nháp; chậm thêm một lượt gọi API; luôn đúng bản app yêu cầu đồng ý; không thêm hạ tầng |
| Lưu đệm 1 giờ (ISR, R2) | API sập vẫn hiện bản cũ; nhanh; có thể lệch tối đa 1 giờ với bản app yêu cầu đồng ý (muốn hết lệch thì thêm bảng D1 và lệnh gọi từ API sang web); thêm bucket R2 và cấu hình |

Chủ dự án hỏi hệ quả và chi phí. Claude kiểm bảng giá R2 (gói miễn phí mỗi tháng: 10 GB, 1 triệu lượt ghi, 10 triệu lượt đọc): chi phí gần như 0;
khác biệt nằm ở độ lệch và việc thêm hạ tầng. Chủ dự án thấy giữ như hiện nay không có vấn đề; Claude đồng ý.

## GM13. Bóng nút

**Vòng 1.** Lượt unslop vòng 15 bỏ bóng mọi nút (mockup và Figma) theo quy tắc "nút không bóng".

**Vòng 2.** Chủ dự án thấy bóng ổn, xem ảnh so sánh có bóng / không bóng, chọn "Trả bóng lại".

✅ Nút chính bóng navy, nút xanh và đỏ bóng cùng màu, nút phụ bóng navy rất nhẹ, nút tắt không bóng.

## Đề xuất kỹ thuật viết cùng design, chờ chủ dự án duyệt

| # | Đề xuất | Lý do | Bỏ gì |
|---|---|---|---|
| GM14 | Sáu chỗ motion lệch (lật thẻ, sang thẻ mới, hộp thoại, tấm trượt, bấm nút, màn tổng kết): lấy số của giao diện mới | Một ngôn ngữ chuyển động (mờ, đường cong chính) | Bỏ `pressed` lún gờ và các keyframe kiểu hướng B ở các chỗ đó |
| GM15 | Mọi hộp thoại và tấm trượt dùng chuyển động của hộp Lịch | Tài liệu motion §6 ghi các hộp khác chưa có hiệu ứng riêng | Không thiết kế chuyển động riêng cho từng hộp |
| GM16 | Hộp Lịch và Ngày theo tham số URL | Nút Quay lại đóng hộp; link và đường dẫn cũ mở thẳng hộp | Intercepting routes của Next (phức tạp hơn khi hộp mở trên mọi màn) |
| GM17 | Vẽ mockup `/app/recall` trước M5 | Màn có trong code (đợt C) nhưng không có khung Figma | Tự dựng không có khung |
| GM18 | Sửa `ui-best-practices.md` cho khớp Bricolage 800 trong Figma | Quy tắc ghi "ba độ đậm 400, 600, 700" | |
