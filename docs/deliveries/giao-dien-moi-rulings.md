# Giao diện mới — các ruling khi thực thi

Chỗ lệch giữa plan/design và code mà người thực thi tự chốt được khi làm. Quyết định của chủ dự án không ghi ở đây (xem decision record).

Định dạng: `R<n> (dd/mm/yyyy, Task <id>): <chỗ lệch> → <chọn> → <vì sao>`

## Khối API

- R1 (10/11/2026, Task A1): tổng `totals.learned`, `reviewed`, `practice_sessions` của tháng → cộng các số của từng ngày (phiên qua nửa đêm tính ở cả hai ngày, từ học lại tính lại) → plan tự chốt, design chỉ định nghĩa số theo ngày.
- R2 (10/11/2026, Task A1): `result` của một từ có thể `null` → giữ `null` cho dòng `review` không có `rating` → hiện không chỗ ghi nào tạo dòng như vậy, nhưng cột cho phép.
- R3 (10/11/2026, Task A6): `next_lemma` chỉ xét 5 thẻ đầu mỗi nhóm; thẻ có nghĩa bị ẩn thì bỏ qua → một truy vấn cho mọi nhóm, một lần `cardContent` → nhóm có 5 thẻ đầu đều bị ẩn thì không hiện dòng "tiếp theo".
- R4 (10/11/2026, Task A7): `sessions/last` đếm `questions`, `correct` bằng một truy vấn riêng, không gọi `PracticeReviewsService.summary` → `summary` khóa phiên (`reviewableSession`) cho một lần đọc → nếu định nghĩa của `summary` đổi thì hai chỗ có thể lệch.
- R5 (10/11/2026, Task A9): smoke đăng ký 2 tài khoản (admin để đăng 3 từ kho chung, và người học), không phải 1 → từ kho chung cần admin; vẫn dưới giới hạn 5 lần mỗi giờ mỗi IP.

## M1

- R6 (10/11/2026, Task M1.1): `--ease-wm-close` = `cubic-bezier(0.4, 0, 1, 1)` → mục 5 của tài liệu motion không ghi đường cong đóng; lấy đường cong "tan" của mục 3.
- R7 (10/11/2026, Task M1.3): e2e font kiểm `document.fonts.check` bằng tên họ chữ đọc được từ `getComputedStyle`, không bằng chuỗi cố định `"Noto Sans"` → `next/font` có thể đổi tên họ chữ.
- R8 (10/11/2026, Task M1.6): `Card` bo `rounded-wm-xl` (20 px) → design cho card 14–28 px; khung Hôm nay dùng 20.
- R9 (10/11/2026, Task M1.7): `LockedFeature` chuyển vào `ui/ProBadge.tsx` cùng `ProBadge` → `ui/Switch` khóa cần nó, `ui/` không import `app-ui/`.
- R10 (10/11/2026, Task M1.8): lớp mờ sau hộp thoại = `mark-ink` 30% (navy ở cả hai chế độ) và token mới `--blur-wm-overlay: 3px` → tài liệu motion §5 ghi `rgb(27 36 68 / .30)` + `blur(3px)`; `ink` thành sáng ở chế độ Tối.
- R11 (10/11/2026, Task M1.9): "Báo lỗi của tôi" trỏ tới `/app/practice/history?tab=reports` cho tới M6 → plan tự chốt.
- R12 (10/11/2026, Task M1.9): nút đổi giao diện sáng/tối không có trong khung `54:502` lẫn `181:316` → thành một mục của menu ảnh đại diện, trước "Đăng xuất".
- R13 (10/11/2026, Task M1.9): `SearchStrip` giữ dưới thanh trên tới M4 → plan tự chốt; ô tìm trong thanh trên đến cùng M4.
- R14 (10/11/2026, Task M1.9): `Logo` cũ giữ cho trang chủ (LandingHeader, SiteFooter import nó) tới M8; logo mới là `AppLogo`. Chip gói ở thanh trên là liên kết tới Gói học → menu mới bỏ mục "Gói học", cần một đường tới trang này.
- R15 (10/11/2026, Task M1.9): ảnh đại diện nền `accent` một màu, không theo gradient tới `#3d78ff` của Figma → màu đó không có token.
- R16 (10/11/2026, Task M1.10): nút "+" nổi chỉ còn ở Hôm nay; test "phone: + button" của Một nhóm đổi thành kiểm nút "Thêm từ" trong trang → Figma có "+" chỉ ở Hôm nay (§5.4, plan tự chốt).
- R17 (10/11/2026, Task M1.10): xóa `features/learner/practice/BackLink.tsx` (liên kết quay lại chỉ hiện ở máy tính của Lịch sử, Từ hay sai, Giao dịch) → `BackLink` mới của `app-chrome` thay ở mọi cỡ.
- R18 (10/11/2026, Task M1.10): trang Gói học bỏ thanh trên riêng cùng nút "Đóng" (xóa test và khóa `App.plans.close`) → khung app đã có thanh tab để rời trang. Thanh chân trang bỏ khỏi app (khung Figma app không có), xóa khóa `App.chrome.footer`.
- R19 (10/11/2026, Task M1.11): Next 16.4.3 có `retry()` cho `error` (`dist/client/components/error-boundary.d.ts:6`) → dùng `retry`, không cần `reset`.

## M2

- R22 (10/11/2026, Task M2.2): chữ số trong ô mã dùng `text-wm-card-title` (24 px, Bricolage 700), không 28 px như Figma "Ô mã" → chưa có token 28 px, thêm token chỉ cho một chỗ thì thừa; ô 54/60 px vẫn đủ chỗ.
- R23 (10/11/2026, Task M2.2): `OtpField` có thêm `hideLabel` (tên nhóm chỉ cho trình đọc màn hình) → Xác minh email không vẽ nhãn trên hàng ô, tiêu đề trang đã nói "Nhập mã 6 số".
- R24 (10/11/2026, Task M2.5): đường ôn và sáu chấm ngăn trong panel thương hiệu vẽ bằng SVG trong code theo toạ độ khung `153:751`, chấm màu `ghost` / `accent`, ô màu của chip từ dùng `fail`, `mark`, `pass` → không tải ảnh SVG của Figma về; màu ngăn và màu nhóm có token ở M3.
- R25 (10/11/2026, Task M2.5): tiêu đề trang (`page-title`, 44 / 38) đậm 800, tiêu đề card (`card-heading`, 30 / 26) đậm 700 → bảng chỗ lệch §3.1 của design ("800 cho tiêu đề trang, 700 cho tiêu đề card"); Figma ghi Bold.
- R26 (10/11/2026, Task M2.5): `(split)` và `(card)` mỗi nhóm có `error.app.tsx` riêng, `(auth)/error.app.tsx` giữ lại → `AuthGate` không vẽ khung nữa, lỗi bắt ở `(auth)` sẽ hiện không có card.
- R27 (10/11/2026, Task M2.5): quầng sáng sau card và trong panel dựng bằng hai utility `auth-card-glow`, `auth-panel-glow` (gradient từ token màu) → không dùng ảnh elip của Figma, màu chỉ qua token.
- R28 (10/11/2026, Task M2.5): chữ mẫu tiếng Anh trên panel (`mitigate`, câu ví dụ, "Đề 12 · Writing") để nguyên trong code, các nhãn ("Thẻ từ · ngăn 7 ngày", "Hôm nay", "từ đến hạn", nghĩa tiếng Việt) vào `App.auth.showcase` → panel là hình minh họa, `aria-hidden`.
- R29 (10/11/2026, Task M2.7): Đăng ký bỏ dòng giới thiệu dưới tiêu đề ("Ôn từ vựng theo lịch…"), xóa khóa `register.subtitle` → khung `35:405` / `37:533` chỉ có tiêu đề "Tạo tài khoản".
- R30 (10/11/2026, Task M2.7): e2e tìm ô mật khẩu bằng `getByLabel(…, { exact: true })` → Playwright so nhãn theo chuỗi con, nên "Mật khẩu" trùng cả "Nhập lại mật khẩu" và nút mắt "Hiện mật khẩu".
- R31 (10/11/2026, Task M2.7): lỗi "Mật khẩu nhập lại chưa khớp." kiểm sau ô Tên (Tên trống báo trước) và trước khi gửi → một lần bấm chỉ báo một lỗi ở phía trình duyệt, như cách form đang làm với Tên.
- R32 (10/11/2026, Task M2.8): lỗi "mã chưa đúng" của Đặt mật khẩu mới hiện bằng dòng lỗi chung (`FormError`) ngay dưới hàng ô mã, không gắn vào từng ô → `OtpField` là một nhóm sáu ô; Figma không vẽ trạng thái lỗi của ô mã.
- R33 (10/11/2026, Task M2.8): email trong câu giới thiệu của Xác minh email giữ chữ thường, không in đậm như Figma `36:385` → tách email ra phần tử riêng làm vỡ test 16 và 29 (`getByText` câu đầy đủ) mà plan giữ nguyên.
- R34 (10/11/2026, Task M2.8): Xác minh email đặt nút "Xác minh" trước dòng "Gửi lại mã sau N giây", giữa card; "Gửi lại mã" là `TextButton` → thứ tự và căn giữa theo khung `36:385`.
- R35 (10/11/2026, Task M2.9): `google-complete.test.tsx` đổi `findByText(/minh@gmail.com/)` thành `findAllByText` (lần đầu ghim đúng 2 chỗ) → chip tài khoản Google `36:490` hiện email lần thứ hai; plan ghi test này giữ nguyên nhưng chip cũng do plan yêu cầu.
- R36 (10/11/2026, Task M2.9): `AuthHeading` có thêm `above` (chip Google, vòng tròn của Đã xóa tài khoản) và `centered`; `GoogleMark` được export từ `ui/GoogleButton` để chip dùng chung → một chỗ vẽ chữ G.
