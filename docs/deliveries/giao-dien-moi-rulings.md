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
- R20 (10/11/2026, Task M1.13): e2e bắt hai lỗi do M1.10 → `AddWordProvider` nằm ở layout `(chrome)` nên sống qua lần chuyển trang; nó tự đóng tấm Thêm từ khi `pathname` đổi (trước M1.10 mỗi trang có provider riêng nên tự đóng). `main` của `AppChrome` về `block` như `AppShell` cũ: là `flex-col` thì khối trang có `mx-auto` co theo nội dung, email dài làm trang Cài đặt rộng 431 px ở 390 px.
- R21 (10/11/2026, Task M1.13): `pnpm cf:docker` chép cả repo bằng `tar`, không loại `.claude/worktrees` (khoảng 90 worktree) nên chạy 55 phút vẫn chưa xong bước chép → e2e chạy từ một worktree tách riêng `english-learning-gm-m1-e2e` ở cùng commit. Script chưa sửa (ngoài phạm vi).
- R22 (10/11/2026, Task M3.1): `-ink` của màu nhóm lấy màu chữ đậm Figma vẽ (≥ 4,5:1 trên trắng); nhóm 4 (lục) và 6 (lam) Figma không vẽ → `color-mix(in oklab, màu 65%, #1b2444)` = `#376d45`, `#29629d`. Thay mức "chính màu đó, ≥ 3:1" của design §7.4.
- R23 (10/11/2026, Task M3.1): thêm `--color-wm-group-empty-{soft,wash,ink}` (ink = `#525a78`) để nhóm trống có cùng dạng token với 7 màu; `--radius-wm-xs` 3px cho ô màu 9px (chú thích, hàng ngăn).
- R24 (10/11/2026, Task M3.1): nền và chấm của ngăn 30 ngày là gradient trong biến `--color-wm-*` → chỉ dùng làm `background-image`; ô phẳng "Từ theo ngăn" và chấm ở hàng từ dùng `stage-5-solid`.
- R25 (10/11/2026, Task M3.2): độ dày chồng theo `layers` của prototype (> 16 → 3, > 6 → 2, > 0 → 1); Hôm nay tối đa 2. "nhịp ôn": rộng theo số từ của ngăn, phần tô theo số thẻ chờ (khớp 6 + 9 + 9 = 24 của Figma). Thứ tự băng chuyền: `sortForToday`, nhóm trống cuối.
- R26 (10/11/2026, Task M3.3): chồng thẻ là một thiết kế co theo `em` (290×368 px ở 16px), CSS đặt trong `globals.css` (`.gstack*`) thay vì khoảng 30 class tùy ý cần `raw-ok`; `data-size` chọn cỡ chữ gốc.
- R27 (10/11/2026, Task M3.3): `DeckButtons` bỏ icon và prop `size` (Figma vẽ nút chỉ có chữ, rộng 148px do nơi dùng đặt); `ButtonLink` có `data-variant` như `Button` để test đọc nút chính.
- R28 (10/11/2026, Task M3.4): làm M3.4 trước M3.3 vì `GroupStack` đọc `next_lemma`, `last_reviewed`.
- R29 (10/11/2026, Task M3.5): tiêu đề và số lớn ở Hôm nay, Nhóm, Một nhóm, Tồn đọng, Chủ đề dùng thang cỡ chữ mặc định của Tailwind (`text-3xl`…`text-8xl`) vì Figma đặt cỡ tay; đổi sang `text-wm-page-title` khi M2 đã vào nhánh dài.
- R30 (10/11/2026, Task M3.5): ngày của "Lần luyện gần nhất" = `local_date` định dạng ở UTC (đã là ngày của người học); tên nhóm bỏ khi `group_id` null hoặc không có trong `GET /v1/groups`. Link "Xem tất cả N nhóm →" luôn hiện như Figma.
- R31 (10/11/2026, Task M3.6): bảng chọn nhóm = `DialogTrigger`/`Popover`/`Dialog` của react-aria và ô tìm `role="combobox"` + danh sách `aria-activedescendant` tự viết (con trỏ ở ô tìm), không dùng `ListBox`. `Enter` đưa nhóm vào giữa băng chuyền và đóng bảng (theo test của plan), không mở trang nhóm.
- R32 (10/11/2026, Task M3.6): test "← trong ô Thêm từ vừa gặp" đổi sang ô tìm trên thanh trên vì trang Nhóm không có ô Thêm từ vừa gặp.
- R33 (10/11/2026, Task M3.6): băng chuyền vẽ cả chồng ±3 (ẩn, mờ 0) để nhóm đi vào ±2 có chuyển động; độ mờ 3,6/7,2px theo tài liệu motion (khung Figma vẽ 1,8/3,6px).
- R34 (10/11/2026, Task M3.6): `waiting`, `sortForToday` dời sang `deck-actions.ts`, xóa `GroupCard.tsx` (Hôm nay và Nhóm không còn thẻ cũ). Test đổi tên khi xung đột phiên bản, xóa nhóm và bản tiếng Anh dời sang `group-page.test.tsx` vì menu ⋯ chỉ còn ở Một nhóm.
- R35 (10/11/2026, Task M3.7): `flip.ts` đọc token motion qua `getComputedStyle`, cùng số làm giá trị dự phòng (jsdom). Đóng nhóm: các phần tan 150ms, nhớ khung chồng, Nhóm bay chồng giữa về; mở nhóm chưa chạy bước làm mờ băng chuyền 170ms của prototype (plan chỉ nêu `rememberRect`).
- R36 (10/11/2026, Task M3.7): chữ trạng thái ở hàng từ dùng `wm-ink` (Figma tô màu đậm của nhóm); "Bỏ … khỏi nhóm" giữ ở cuối hàng dạng nút chữ xám có dấu ✕, tên đọc như cũ (Figma không vẽ; plan).
- R37 (10/11/2026, Task M3.7): file `loading` riêng cho `(today)`, `groups`, `group`; `group/backlog` dùng lại khung xương trung tính để không nhận khung của Một nhóm.
- R38 (10/11/2026, Task M3.8): Chủ đề giữ nút "Thêm cả N từ" dạng nút chữ ở đầu trang (Figma không vẽ; test cũ cần) vì thanh nổi chỉ hiện khi đã chọn từ; mỗi danh sách hiện 6 (Tồn đọng) / 8 (Chủ đề) hàng đầu rồi "Xem thêm N từ" như Figma.
- R39 (10/11/2026, Task M3.5–M3.9): gộp thành một commit vì bỏ thẻ cũ, dời `waiting`/`sortForToday` và file chữ dùng chung cắt ngang các task; tách ra sẽ có commit không build được.
