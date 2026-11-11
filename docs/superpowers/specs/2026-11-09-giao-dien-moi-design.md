# Giao diện mới cho toàn bộ web (trang công khai, đăng nhập, app người học) — Design (09/11/2026)

> **Trạng thái 09/11/2026:** quyết định đã chốt trong chat với chủ dự án; chờ chủ dự án đọc bản viết này trước khi lập plan. Chưa có code.
> Decision record: [`../decisions/2026-11-09-giao-dien-moi-decisions.md`](../decisions/2026-11-09-giao-dien-moi-decisions.md).
> **Thiết kế:** Figma `JKnyUUtGjpGpfKK4PqBfdY` ("Wordmet — Trang công khai (redesign 11/2026)"), ba trang "Trang công khai" (`0:1`),
> "Đăng nhập và tài khoản" (`35:307`), "App người học" (`55:306`); component, biến và style ở trang "Hệ thống" (`2:2`).
> **Context UI và motion:** thư mục [`../../mockups/2026-11-05-redesign-concepts/`](../../mockups/2026-11-05-redesign-concepts/), xem §3.
> **Code đọc trên:** `origin/dev` @ `50b632e7` (09/11/2026). Mỗi `path:line` dưới đây đọc ngày 09/11/2026.

Ví dụ xuyên suốt: **Lan**, người học tiếng Việt, có 5 nhóm ("Đề 12 · Writing" 48 từ, "Đề 9 · Listening" 40 từ, "Đề 14 · Reading" 36 từ,
"Từ gặp ngoài đời" 22 từ, "Du lịch Nhật" 0 từ). Hôm nay Lan có 24 thẻ chờ ở "Đề 12 · Writing".

## 1. Mục tiêu và phạm vi

Đưa thiết kế mới trong Figma vào toàn bộ `apps/web`, giữ nguyên hành vi nghiệp vụ, và cất code giao diện cũ để lấy lại khi cần.

| Phần | Khung Figma | Đường dẫn |
|---|---|---|
| Trang công khai | 10 khung (5 trang × máy tính, điện thoại) | `/{locale}`, `/privacy`, `/terms`, `/sources`, trang 404 |
| Đăng nhập và tài khoản | 18 khung (9 trang × 2) | `/{locale}/app/(auth)/*`, `/app/complete-profile`, `/app/welcome` |
| App người học | 81 khung (73 khung lúc review, tính cả 16 khung overlay; thêm 8 khung màn Ôn ngày 09/11/2026) | `/{locale}/app/(member)/*` |

- **Thêm:** API lịch học (tổng theo tháng, chi tiết một ngày) cho hai hộp Lịch và Ngày (§10); API cho các chỗ Figma cần dữ liệu khác: thẻ nhóm
  "tiếp theo", "ôn gần nhất", khối "Lần luyện gần nhất", số liệu trong hộp Ngày, chuỗi ngày trên nút lịch (§10.5, QR2); giá công khai cho trang
  chủ đọc lúc build (§10.6, QR3); trang "Báo lỗi của tôi" trong Cài đặt (QR1).
- **Bỏ:** trang Lịch sử luyện tập (`/app/practice/history`), thay bằng hai hộp Lịch và Ngày; đường dẫn cũ chuyển hướng (§10.4).
- **Không đổi:** admin (`apps/admin` giữ hướng B và bộ token cũ), API ngoài phần lịch học và các chỗ QR2 chọn thêm API, cách đăng nhập, cách thanh toán, cờ
  `NEXT_PUBLIC_LEARNER_APP` (app vẫn chặn trên production tới khi Deploy).
- **Màu nhóm** tính từ ID nhóm, không thêm dữ liệu (§7.4).

## 2. Quyết định

Bảng đầy đủ kèm mọi phương án đã đưa ra: decision record. Tóm tắt:

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| GM1 | Phạm vi | Toàn bộ web: trang công khai, đăng nhập và tài khoản, app người học | Chủ dự án |
| GM2 | Cất code cũ | Tag git `archive/giao-dien-cu-2026-11` tại `dev` trước khi đổi; đẩy tag lên GitHub; một file ghi màn nào ở file nào | Chủ dự án (tag); Claude (đẩy tag, file ghi) |
| GM3 | Đưa lên `dev` | Nhánh dài `refactor/giao-dien-moi`; mỗi đợt một hoặc vài PR vào nhánh đó; xong hết thì một PR vào `dev` | Chủ dự án (nhánh riêng, gộp một lần); Claude (tên nhánh theo hook) |
| GM4 | Chế độ tối | Giữ; mockup tối 5 màn để chủ dự án duyệt trước khi chỉnh phần tối | Chủ dự án |
| GM5 | Màu nhóm | Tính từ ID nhóm, không thêm API | Chủ dự án (không cần API); Claude (theo ID) |
| GM6 | API lịch học | Làm trong đợt này | Chủ dự án |
| GM7 | Thứ tự đợt | M1–M9 ở §9 | Claude đề xuất, chủ dự án đồng ý |
| GM8 | Cách render | App và đăng nhập: CSR với React Query; trang công khai: dựng sẵn; không Server Actions | Claude đề xuất, chủ dự án duyệt |
| GM9 | Khung app | Thanh trên, tab dưới, nút lịch nằm trong layout theo nhóm route `(chrome)`, `(onboarding)`, `(focus)`; `(auth)` tách `(split)`, `(card)` | Claude đề xuất, chủ dự án duyệt; sửa sau review (I5, M8) |
| GM10 | Component | Một bộ `src/ui/` cho cả web; phần trang công khai ở `src/site/` | Claude đề xuất, chủ dự án duyệt |
| GM11 | Chính sách, Điều khoản | Giữ cách đọc văn bản mỗi lần mở, không lưu đệm | Chủ dự án |
| GM12 | SEO | Các bổ sung ở §11 | Claude đề xuất, chủ dự án duyệt |
| GM13 | Bóng nút | Giữ bóng navy cho nút chính, bóng cùng màu cho nút xanh, đỏ; nút tắt không bóng | Chủ dự án (09/11/2026) |

**GM14–GM18** (Claude đề xuất lúc viết; chủ dự án xem khảo sát và mockup rồi chốt ngày 09/11/2026):

| # | Quyết định | Ở đâu | Trạng thái |
|---|---|---|---|
| GM14 | Chỗ motion lệch giữa giao diện mới và code: lấy số của giao diện mới cho cả sáu chỗ | §8.3 | Chốt |
| GM15 | Mọi hộp thoại và tấm trượt dùng chung chuyển động của hộp Lịch | §8.2 | Chốt |
| GM16 | Hộp Lịch và Ngày mở theo tham số trên URL (`?lich=`, `?ngay=`); đổi tháng, đổi ngày chỉ thay địa chỉ | §5.6 | Chốt (phần đổi tháng, ngày: Claude đề xuất theo khảo sát) |
| GM17 | Tên theo code đợt C: Học = lật thẻ (`/app/review`), Ôn = chọn hoặc gõ từ theo nghĩa (`/app/recall`); Figma sửa theo. Màn Ôn chưa có khung Figma | §9, M3, M5 | Chốt phần tên |
| GM18 | Giữ Bricolage 800 cho tiêu đề và số lớn; quy tắc sửa thành "400, 600, 700 cho chữ thường; 800 cho tiêu đề và số lớn Bricolage" | §3.3 | Chốt, đã sửa `ui-best-practices.md` |
| GM19 | Màn Ôn không nhận lỗi gõ nhỏ: gõ đúng hẳn mới tính đúng | §9 M5 | Chốt |
| GM20 | Điều kiện từ khảo sát: mờ tối đa 12px trên điện thoại, khối tổng kết 400ms, hộp đóng 150ms, tiêu đề xuống dòng line-height ≥ 1,15 | §3.3, §8 | Chốt |

**Chờ chủ dự án** (từ review độc lập `../reviews/2026-11-09-giao-dien-moi-design-review.md`; mockup các cách:
[`../../mockups/2026-11-05-redesign-concepts/review-4-quyet-dinh.html`](../../mockups/2026-11-05-redesign-concepts/review-4-quyet-dinh.html),
artifact https://claude.ai/artifact/JAZaHRrKFbLUTMavXWVuuB):

| # | Câu hỏi | Ảnh hưởng tới |
|---|---|---|
| QR1 | ✅ Chốt 10/11/2026: một dòng trong Cài đặt và một mục trong menu ảnh đại diện, cùng mở trang `/app/settings/reports` (§9 M6) | §9 M6, §10.4 |
| QR2 | ✅ Chốt 10/11/2026: cả bốn chỗ thêm API (§10.5) | §1, §9 M3, M6, §10.5 |
| QR3 | ✅ Chốt 10/11/2026: đọc giá lúc build (§10.6) | §9 M8, §10.6, §11 |
| QR4 | ⏸ Gác lại 10/11/2026 (chủ dự án: "tạm thời gác lại, mình tính sau"): đợt này giữ DB38; các cách và trade-off ở decision record | §5.4, §8.2 |
| QR5 | ✅ Chốt 10/11/2026: giữ màu nhóm tính theo ID, chấp nhận khả năng trùng màu (5 nhóm: 85% có ít nhất một cặp trùng) | §7.4 |

## 3. Context UI và motion

### 3.1 Nguồn và thứ tự ưu tiên

| Nguồn | Có gì | Ưu tiên khi lệch |
|---|---|---|
| Figma `JKnyUUtGjpGpfKK4PqBfdY` | Bố cục, câu chữ, trạng thái, component, biến màu (Light, Dark), số đo, style chữ và bóng | 1: nguồn đúng cho giao diện |
| [`ui-best-practices.md`](../../mockups/2026-11-05-redesign-concepts/ui-best-practices.md) | Quy tắc kiểm được: thứ bậc, khoảng cách, bo góc, bóng, tương phản đã đo, chữ, form, câu chữ | 2 |
| [`motion-va-chuyen-canh.md`](../../mockups/2026-11-05-redesign-concepts/motion-va-chuyen-canh.md) | Mọi thông số chuyển động đã chốt và motion đang chạy trong code | Nguồn duy nhất cho số motion |
| [`app-redesign-plan.md`](../../mockups/2026-11-05-redesign-concepts/app-redesign-plan.md) | Từng màn nối với API và file code, quyết định qua các vòng, ID khung Figma | Nguồn cho dữ liệu và hành vi từng màn |
| [`style-da-chon.md`](../../mockups/2026-11-05-redesign-concepts/style-da-chon.md), [`chong-the-DESIGN.md`](../../mockups/2026-11-05-redesign-concepts/chong-the-DESIGN.md) | Hướng D (Tiêu điểm) và K (Thẻ bài); thiết kế chồng thẻ ôn | Tham khảo |
| Trang mẫu HTML `vong-*.html`, `chong-the-mo.html` | Hành vi tương tác chạy được: băng chuyền, lịch, Tùy chỉnh phiên, chín màn vòng 15 | Tham khảo hành vi; số đo theo Figma |
| [`../../audit/2026-11-09-figma-audit.md`](../../audit/2026-11-09-figma-audit.md) | Lỗi Figma đã sửa, việc code còn để lại (ví dụ ô "Nhập lại mật khẩu") | Danh sách việc |

Thư mục mockup và bản audit Figma chưa có trong git (09/11/2026). Commit cùng design này để nhánh làm việc có đủ context.

**Lệch giữa các nguồn:** Figma thắng về giao diện; hành vi API thắng về nghiệp vụ. Ví dụ: chữ trong Figma hứa điều API không làm thì sửa chữ,
không sửa API. Mỗi lần tự chốt một chỗ lệch thì ghi vào `docs/deliveries/giao-dien-moi-rulings.md` (mã R1, R2…), giống cách Bước 8 làm.

**Chỗ lệch đã biết** (review M14, M7), chốt luôn để người code không phải đoán. Tài liệu nguồn sửa theo trong PR đầu của M1:

| Chỗ | Lệch | Lấy |
|---|---|---|
| Thời lượng vào trang, vào phần | `ui-best-practices.md` mục 7: 600–900ms; tài liệu motion: vào 300–340ms | Tài liệu motion (§8) |
| Phần tử tròn hẳn | `ui-best-practices.md`: công tắc, nút chia đoạn, ảnh đại diện; Figma: thêm nút tăng giảm số câu, huy hiệu | Figma |
| Bóng dưới thanh trên | Tài liệu motion §6: có bóng navy; Figma: lớp "Bóng dưới" ẩn ở thanh máy tính (lượt unslop), còn ở thanh điện thoại | Không có bóng ở cả hai |
| Màu nhấn | `app-redesign-plan.md` dòng 5 còn ghi `#2445d6` | `#1e3a8a` (biến Figma) |
| Khoảng cách | Bậc 4…120 và lưới 4 px; vài lề lẻ trong Figma (card đăng nhập 25, 41) | Lưới 4 px; lề lẻ làm tròn về bậc gần nhất |
| Chữ đọc | §3.3 16 px, 160–170%; Figma dùng nhiều `Body/Small` 14 px, 150% | Chữ đọc chính 16 px; chữ phụ 14 px theo text style Figma |
| Độ đậm Bricolage | GM18 nói 800; text style `Display/Card title` là 700 | 800 cho tiêu đề trang và số lớn; 700 cho tiêu đề card |
| Bóng nút | Trang mẫu vòng 15: `0 6px 14px -8px`; Figma: `0 10px 28px -10px` | Figma (§7.2) |

### 3.2 Cách đọc một khung Figma khi code

1. Lấy khung theo ID ở §9 bằng Figma MCP: `get_screenshot` để nhìn, `get_design_context` để lấy cấu trúc, `get_variable_defs` để lấy biến.
2. Màu, bo góc, bóng lấy từ token (§7), không chép số hex hay px rời. `scripts/check-tailwind-raw.mjs` (chạy trong `pnpm lint`) đã chặn giá trị Tailwind thô.
3. Chữ lấy đúng như khung, đặt vào `messages/vi.json`; bản tiếng Anh viết theo nghĩa tương ứng (§12).
4. Mỗi màn có khung máy tính 1440 và điện thoại 390. Khoảng giữa hai cỡ (768–1279) chưa vẽ: theo quy tắc lưới §3.3 và kiểm ở 768, 1024.
5. Trạng thái không có khung (đang tải, trống, lỗi, mất mạng) theo khung gần nhất cùng màn và quy tắc ở `ui-best-practices.md` §6, §9.

### 3.3 Quy tắc giao diện cần giữ khi code (rút từ `ui-best-practices.md` và Figma)

- **Lưới:** máy tính cột nội dung 1160 px, lề 140 px; điện thoại lề 16 px. Bậc khoảng cách 4, 8, 12, 16, 24, 32, 56, 80, 120.
- **Bo góc:** nút 10 (`radius/button`), hộp thoại, tấm trượt, menu nổi, thanh nổi 16 (`radius/modal`), card 14–28, ô nhập và ô tìm 10, tab 8,
  nhãn và chip đếm 6, card trong hộp thoại 12. Chỉ công tắc, nút chia đoạn, ảnh đại diện tròn hẳn.
- **Bóng:** card `--shadow-card`, ô chọn và chip `--shadow-row`, hộp thoại và menu `--shadow-pop` (ba bóng màu ink); nút chính bóng navy (GM13).
- **Chữ:** Noto Sans cho chữ đọc và nút; Bricolage Grotesque cho tiêu đề và số lớn (ExtraBold 800 như Figma, GM18); JetBrains Mono 12 px chữ
  thường cho nhãn nhỏ của app ("noun · A2", "câu 7 / 20"). Chữ đọc 16 px trở lên, line-height 160–170%. Tiêu đề có thể xuống dòng dùng
  line-height ≥ 1,15 (dấu tiếng Việt chồng hai tầng ở độ đậm 800); 1,0 chỉ cho số và tiêu đề một dòng; không cắt tiêu đề bằng `overflow: hidden`.
- **Màu:** navy `#1e3a8a` chỉ cho nút chính, link và một điểm nhấn mỗi màn; vàng `#ffd84a` chỉ để tô từ đích. Link khác chữ thường bằng độ
  đậm hoặc mũi tên, không chỉ bằng màu (navy so với ink chỉ 1,47:1). Đúng / Sai luôn kèm icon và chữ.
- **Hành động phụ:** component "Nút chữ" (Thêm, Thường, Phụ, Xóa), không gạch chân; gạch chân chỉ cho liên kết giữa câu.
- **Truy cập:** viền focus 3 px màu nhấn; vùng chạm điện thoại ≥ 44 px; mọi màn dùng được bằng phím. Phím tắt theo Figma và trang mẫu:
  `N` Thêm từ, `/` tìm, Space lật thẻ, Enter, Esc (đã có trong code); `L` mở lịch, `F` chọn nhóm (mới).
- **Nền:** "Mesh + hạt" (hướng 4 của vòng 8, chủ dự án chốt 10/11/2026, QBG): bốn quầng navy, vàng, lục, navy nhạt phủ lớp hạt nhiễu mịn, trên mọi màn app và trang đăng nhập; khối vẫn trắng, có bóng. Lưới chấm của vòng 9 đã bỏ.
- **Câu chữ:** theo `~/.claude/rules/vietnamese-writing.md`; không kể chi tiết hệ thống người học không cần (VietQR, payOS, ngăn ôn, hạn mức AI)
  trên trang công khai.

## 4. Git và cất code cũ

1. `git fetch`; tag `archive/giao-dien-cu-2026-11` tại `origin/dev` (commit có giao diện cũ cuối cùng);
   `git push origin refs/tags/archive/giao-dien-cu-2026-11`. Hook git chặn dạng không có `refs/tags/` vì coi đó là tên nhánh (review M1, đã chạy thử).
2. Nhánh `refactor/giao-dien-moi` từ cùng commit. Hook git chỉ nhận tên `<type>/<slug>` (`~/.claude/hooks/enforce-git-conventions.py:58`).
3. File `docs/deliveries/giao-dien-cu-map.md` (tạo ở bước này): mỗi màn cũ nằm ở file nào trong tag, và cách lấy lại:
   `git show archive/giao-dien-cu-2026-11:apps/web/src/features/learner/today/TodayPage.tsx` (xem) hoặc
   `git checkout archive/giao-dien-cu-2026-11 -- <path>` (lấy về).
4. Mỗi đợt: nhánh con từ `refactor/giao-dien-moi` (`feat/giao-dien-moi-m1`…), PR vào `refactor/giao-dien-moi`. CI chạy trên mọi PR
   (`.github/workflows/ci.yml:5–6`, `on: pull_request` không lọc nhánh đích). Hook hỏi chủ dự án mỗi lần merge vì nhánh đích không phải `dev`.
5. Merge `dev` vào `refactor/giao-dien-moi` mỗi tuần và trước PR cuối, để PR cuối không xung đột lớn.
6. Xong M9, đợt polish (QM9-1) và M8c: một PR `refactor/giao-dien-moi` → `dev`, mở qua skill `ship-pr`.

| Khi | Thì |
|---|---|
| Một PR khác vào `dev` sửa file mà nhánh này đã viết lại | Lúc merge `dev` vào nhánh: giữ giao diện mới, đưa hành vi của bản sửa vào; ghi vào rulings |
| `dev` thêm màn hoặc tính năng giao diện mới trong lúc làm | Màn đó vào đợt gần nhất còn mở; nếu đợt đã xong thì thêm vào M9 |
| Cần xem lại màn cũ khi đang code | Lấy từ tag, không giữ code cũ trong cây làm việc |
| Ai đó định sửa tag | Không: tag cố định; không force push (hook chặn) |

## 5. Kiến trúc render

### 5.1 Điều quyết định: server của web không biết ai đăng nhập

- Access token chỉ nằm trong bộ nhớ tab (`apps/web/src/app-shell/session/session-store.ts`, trường `token` riêng của `SessionStore`).
- Refresh token là cookie `httpOnly`, `secure`, `SameSite=Strict`, `path: '/v1/auth'`, không có `Domain`, do API đặt
  (`apps/api/src/identity/sessions/session-transport.ts:13–15`), nên chỉ đi tới host của API. Web gọi API với `credentials: 'include'`
  (`app-shell/api/client.ts:20`).
- Vì vậy server Next không có thông tin người học. Dữ liệu riêng của người học tải ở trình duyệt.

### 5.2 Cách render từng khu

| Khu | Render | Ghi chú |
|---|---|---|
| Trang chủ, 404 | Dựng sẵn lúc build; Server Components; JS chỉ cho phần tương tác (`Reveal`, hỏi đáp, cửa sổ app minh họa) | Như hiện nay (`(site)/page.tsx`; `scripts/assert-render-mode.mjs` kiểm trong CI) |
| Chính sách, Điều khoản, Nguồn dữ liệu | Server render mỗi lần mở: đọc `GET /v1/legal/current` hoặc `GET /v1/sources` (đợi tối đa 2,5 giây; lỗi thì hiện bản nháp) | Giữ như hiện nay (GM11; `lib/legal.ts`, `lib/sources.ts`; cả ba `force-dynamic`) |
| Đăng nhập và tài khoản | Khung, tiêu đề, chữ render ở server; form là client component | Không index |
| App `/app` | Layout render theo request (`connection()` trong `app/layout.app.tsx`, để mỗi trang có nonce CSP riêng); nội dung là client component, dữ liệu qua React Query | Không index |

### 5.3 Không dùng Server Actions

Tài liệu Next 16.4 (Data Security guide, `use-server`): Server Action gọi được bằng POST trực tiếp, phải tự xác thực người dùng bên trong,
đọc phiên từ cookie hoặc header của server. Server Next không có phiên (§5.1), nên Server Action không biết người gọi là ai. Muốn dùng phải đổi
sang mô hình BFF: cookie phiên nằm ở `wordmet.com`, Next chuyển mọi lệnh gọi sang API. Việc đó đổi API và bảo mật; không làm trong đợt này.
Trang công khai không có form (danh sách chờ đã bỏ ngày 03/11/2026), nên cũng không cần.

### 5.4 Khung app nằm trong layout

Hiện nay 17 chỗ tự vẽ `<AppShell>` (`app-chrome/AppShell.tsx`: 14 màn feature, `AuthGate`, `complete-profile`, `welcome`), nên mỗi lần chuyển
trang khung vẽ lại và mất trạng thái. Figma: mọi màn điện thoại không phải phiên đều có cùng thanh trên và thanh tab dưới (36 instance mỗi loại),
kể cả trang phụ; nút "Quay lại" nằm trong nội dung trang; trang phụ dùng biến thể `Tab=Không` (`149:4381`, `149:4350`) (review I5). Vì vậy tab
và trang phụ chung một layout. Đổi thành:

```
app/[locale]/app/
├─ layout.app.tsx                 như hiện nay: nonce, theme script, AppIntl, AppProviders
├─ (auth)/layout.app.tsx          AuthGate (giữ ngoại lệ B8-2: người đã đăng nhập vẫn mở được quên, đặt lại mật khẩu)
│   ├─ (split)/layout.app.tsx     hai cột, panel navy: login/  register/
│   └─ (card)/layout.app.tsx      card giữa: verify-email/  forgot-password/  reset-password/  google/complete/  account-deleted/
└─ (member)/layout.app.tsx        RequireSession, trạng thái hộp Lịch/Ngày, HouseAd, AdsenseLoader
   ├─ (chrome)/layout.app.tsx     AddWordProvider, thanh trên, thanh tab dưới (điện thoại), nút lịch nổi; tab đang sáng (hoặc Không) theo pathname
   │   ├─ page.app.tsx            Hôm nay
   │   ├─ groups/  lookup/  practice/  practice/weak/  practice/history/ (chỉ chuyển hướng, §10.4)
   │   ├─ group/  group/backlog/  topic/  word/
   │   ├─ settings/  settings/account/  settings/delete-account/  settings/transactions/
   │   └─ plans/  plans/order/
   ├─ (onboarding)/layout.app.tsx card giữa như trang đăng nhập (khung "Bổ sung hồ sơ", "Chào mừng"), cần phiên
   │   └─ complete-profile/  welcome/
   └─ (focus)/layout.app.tsx      không khung; nút lịch nằm trên thanh của phiên (điện thoại)
       └─ practice/session/  review/  recall/
```

- Thư mục có ngoặc không vào đường dẫn: `/vi/app/word` giữ nguyên. Một đoạn như `practice/` nằm được ở nhiều nhóm (`(chrome)/practice` cho
  `/app/practice`, `(focus)/practice/session` cho `/app/practice/session`) vì đường dẫn cuối khác nhau (tài liệu Next 16.4, route groups).
- Nút "Quay lại" và nút "+" nổi do từng màn tự khai báo trong nội dung (Figma: nút + chỉ ở Hôm nay `117:4712`).
- Nút lịch nổi ẩn ở Từ tồn đọng và Chủ đề trên điện thoại, để không chồng thanh nổi (`app-redesign-plan.md`, vẽ lại vòng 15).
- `(auth)` tách hai nhóm con vì layout server không biết đường dẫn đang mở; khung hai cột chỉ cho đăng nhập, đăng ký (Figma `35:308`, `35:405`).
- Đuôi `page.app.tsx`, `layout.app.tsx` giữ theo D21 (`next.config.ts`, `pageExtensions`).
- Màn có cột phụ (từ 1280 px) khai báo cột phụ trong chính màn đó, không qua layout.
- `AddWordProvider` lên `(chrome)/layout`, không lên `(member)`: provider bật phím `N` toàn trang (`add-word-context.tsx:23–33`), nên đặt ở
  `(member)` sẽ bật `N` cả trong phiên luyện và trang onboarding (hôm nay không có).
- Bỏ `<AppShell>` ở 17 chỗ gọi (code facts web §9.3): `back` (10 chỗ) thành `BackLink` trong nội dung trang, `aside` (6 chỗ) thành
  `PageColumns` (cột phụ từ 1280 px); `PlansPage`, `OrderReturnPage` và các màn phiên bỏ `<main id="main">` riêng (layout đã có).
- `SearchStrip` chỉ xóa chữ khi tham số `q` hoặc `level` đổi; hiện nó xóa khi bất kỳ tham số nào đổi (`SearchStrip.tsx:40–46`), nên `?id=`,
  `?lich=`, `?ngay=` sẽ xóa chữ đang gõ.

| Khi | Thì |
|---|---|
| Lan chuyển từ Hôm nay sang Nhóm, hoặc từ Nhóm vào Một nhóm | Thanh trên, thanh tab dưới đứng yên, chữ đang gõ ở ô tìm còn nguyên, chỉ phần giữa đổi (trừ người có quảng cáo, xem QR4) |
| Lan mở `/vi/app/practice/session` | Không có thanh trên, không có tab dưới; nút lịch nằm trên thanh của phiên ở điện thoại, nổi góc phải dưới ở máy tính |
| Phiên đăng nhập hết hạn khi đang ở `(chrome)` | `RequireSession` chuyển về đăng nhập như hiện nay (E1–E11 của design giao diện người học) |
| Lan (Miễn phí, có quảng cáo) rời Nhóm hoặc Tra từ | Theo DB38: trang tải lại cả document, khung mất trạng thái, không có FLIP; QR4 gác lại nên giữ như vậy |

### 5.5 Đang tải và lỗi

- `loading.app.tsx` đặt theo từng route có bố cục riêng (Hôm nay, Nhóm, Một nhóm, Tra từ, trang một từ, Luyện tập), khung xương theo khung Figma
  của route đó; các route còn lại dùng một khung xương trung tính (tiêu đề và ba khối). `loading` chỉ hiện khi chuyển trang mềm. Next nhận đuôi
  `.app.tsx` cho mọi file đặc biệt, không chỉ page, layout (review M5, đã đọc app loader của Next).
- Lần tải cứng (mở app, tải lại): `RequireSession` hiện khung xương thay cho vòng chờ toàn màn (`FullScreenSpinner`,
  `app-shell/RequireSession.tsx:54–55`). `RequireSession` nằm trên mọi nhóm con, nên khung xương chọn hình theo `usePathname()`: trang của
  `(chrome)` có thanh trên và tab dưới; phiên và onboarding thì không. Vẫn giữ `role="status"` và chữ "Đang tải…" (test `RequireSession.test.tsx:57–63`).
- Mỗi nhóm route có `error.app.tsx`: chữ "chuyện gì xảy ra + việc cần làm", nút "Thử lại" gọi `retry()` (cách Next 16.3+ khuyên dùng; `reset()`
  chỉ khi không muốn tải lại dữ liệu). Lỗi chỉ thay phần giữa, khung còn.
- Lỗi dữ liệu trong màn (API trả Problem Details) giữ cách hiện nay (`app-shell/api/use-error-message.ts`).

### 5.6 Hộp thoại và tham số URL

- Hộp Lịch mở bằng `?lich=2026-11`, hộp Ngày bằng `?ngay=2026-11-08` trên đường dẫn đang đứng (GM16). Lý do: nút Quay lại của trình duyệt đóng hộp;
  link "Mở lịch học" ở Hôm nay và đường dẫn cũ `/app/practice/history` mở thẳng hộp.
- Các hộp khác (Thêm từ, Thêm câu, Thêm cả loạt, Chọn nhóm, Tùy chỉnh phiên, Giới thiệu Pro, Chi tiết giao dịch) giữ trạng thái trong React như hiện nay.
- Ba luật lịch sử trình duyệt (khảo sát `GIAO_DIEN_MOI_GM14_GM18_SURVEY_2026-11-09.md`, GM16):
  1. Mở hộp Lịch, sang hộp Ngày: thêm một bước vào lịch sử. Đổi tháng, đổi ngày (‹ ›, phím mũi tên), lọc trong hộp: chỉ thay địa chỉ, không thêm bước.
  2. Nút đóng và Esc chỉ lùi lịch sử khi hộp được mở trong phiên này (đánh dấu ở `history.state`); hộp mở từ link hoặc sau khi tải lại thì đóng
     bằng cách bỏ tham số (thay địa chỉ), để đóng hộp không làm rời app.
  3. Mở thẳng `?ngay=` từ link: app thay địa chỉ thành `?lich=<tháng>` rồi thêm bước `?ngay=`, để Quay lại từ hộp Ngày về hộp Lịch.
- Đổi tham số bằng `window.history.pushState` / `replaceState`, không qua `router.push`: `/app` render theo request (`connection()`), nên
  `router.push` gọi lại server mỗi lần đổi ngày. `useSearchParams` tự theo hai lệnh này (tài liệu Next 16.4, "Linking and navigating").
- Thành phần đọc `useSearchParams` bọc trong `Suspense`, để build không vỡ nếu sau này bỏ `connection()`.
- Trạng thái hộp nằm ở `(member)/layout.app.tsx` (một chỗ cho mọi màn), không ở từng màn.

| Khi | Thì |
|---|---|
| `?lich=2026-13` hoặc `?ngay=2026-02-30` | Bỏ tham số (thay URL, không thêm lịch sử), không mở hộp |
| `?ngay=` là ngày tương lai theo múi giờ của Lan | Mở hộp Ngày với nội dung trống "Chưa tới ngày này" |
| Có cả `?lich=` và `?ngay=` | Mở hộp Ngày; Quay lại về hộp Lịch của tháng chứa ngày đó |
| Lan bấm Esc ở hộp Ngày | Về hộp Lịch (`app-redesign-plan.md`, vòng 9); Esc ở hộp Lịch thì đóng hẳn |

### 5.7 Tải nhẹ hơn

- Hộp nặng tải code khi mở lần đầu bằng `next/dynamic`: Thêm từ (và Thêm câu, Thêm cả loạt, Kết quả tra AI, Chọn nhóm), Tùy chỉnh phiên,
  Lịch và Ngày, Giới thiệu Pro. Code hiện chưa dùng `dynamic(` ở `features/` và `app-chrome/`.
- Rê chuột hoặc focus vào tab, thẻ nhóm thì `queryClient.prefetchQuery` cho màn đó; `Link` của Next giữ prefetch mặc định.
- Đo trước và sau: Next 16 đã bỏ cột "First Load JS" khỏi output `next build` (tài liệu nâng cấp lên 16). Next 16.4.3 ghi
  `.next/diagnostics/route-bundle-stats.json` (trường `firstLoadUncompressedJsBytes`, chỉ khi build bằng Turbopack; file này là chi tiết nội bộ
  của Next, không có trong tài liệu). Một script `scripts/compare-bundle-stats.mjs` so file đó của bản cũ (build ở tag lưu trữ) với bản mới cho
  mọi route `/vi/app/**`, fail khi route nào nặng hơn quá 10%; quá thì ghi lý do vào rulings. Nếu Next đổi định dạng file, dùng "Total JavaScript"
  của Lighthouse trên Hôm nay, Nhóm, Phiên luyện.

### 5.8 Font và chữ dịch

- `next/font/google` cho ba font, đều có bộ `vietnamese` (đã kiểm `font-data.json` của Next 16.4.3): `Noto_Sans` (biến thiên `wght`),
  `Bricolage_Grotesque` (biến thiên `opsz`, `wdth`, `wght`), `JetBrains_Mono` (`preload: false`). Cả ba khai ở root layout
  (`app/[locale]/layout.tsx`, thay `Lexend` dòng 12), biến `--font-noto-sans`, `--font-bricolage`, `--font-jetbrains-mono` gắn trên `<html>`. Token
  Tailwind khai bằng `@theme inline` tên `--font-wm-sans`, `--font-wm-display`, `--font-wm-mono`: không trùng `--font-sans` của `theme.css` (admin
  dùng) và `--font-mono` mặc định của Tailwind (code facts web S5).
- `next/font` mặc định chỉ tải trục `wght`. Không khai `axes` cho Bricolage (`opsz`, `wdth`): khảo sát GM18 đo file trục `wght` khoảng 41 KB, thêm hai
  trục thì khoảng 131 KB. JetBrains Mono `preload: false`: tải sớm ở root layout thì trang công khai cũng tải; chữ nhãn có thể đổi font sau khi
  tải xong (`display: swap`, `adjustFontFallback` giảm nhảy chữ).
- Ảnh OG đang nhúng font Lexend: `scripts/gen-og-fonts.mjs` đọc cứng `assets/fonts/Lexend-*.ttf`, `og-fonts.test.ts` kiểm `lexendRegular`,
  `lexendExtraBold`, `opengraph-image.tsx` dùng `fontFamily: 'Lexend'`. `next/og` cần file TTF tĩnh. Thêm TTF tĩnh Noto Sans (có tiếng Việt) và
  Bricolage ExtraBold vào `assets/fonts/` kèm giấy phép OFL, sửa script và test, ghi cỡ Worker trước và sau (file nhúng hiện 274 KB; mục Worker của
  `deploy-checklist.md`) (review M10).
- Chữ dịch giữ cách hiện nay: trang công khai không gửi chữ xuống trình duyệt (`messages={null}` ở root); app chỉ gửi namespace `App`
  (`app-shell/AppIntl.tsx`).

## 6. Cấu trúc thư mục `apps/web/src`

```
app/                    chỉ khai báo route: page/layout mỏng, metadata, loading, error, sitemap, robots, manifest, ảnh OG
ui/                     một bộ component cho cả web (thay app-ui/ và components/ui/), §7.5
styles/                 fonts.ts, nền mesh + hạt, keyframe motion, test token
site/                   phần riêng của trang công khai: landing/, legal/, seo/, layout/ (thay components/*)
app-chrome/             viết lại: TopBar, MobileTabBar, AvatarMenu, CalendarButton, PageHeader
app-shell/              giữ nguyên: gọi API, phiên đăng nhập, React Query, cấu hình, theme
features/learner/<khu>/ mỗi khu: <Khu>Page.tsx, các phần con, queries.ts, test
i18n/  lib/             giữ
```

Luật phụ thuộc là **danh sách cấm**, giữ bằng `no-restricted-imports` trong `eslint.config.mjs` (luật này chỉ chặn theo danh sách cấm). Viết
theo import thật đang có (review I10):

| Thư mục | Không được import | Ghi chú |
|---|---|---|
| `ui/` | `@/features/*`, `@/app-shell/*`, `@/app-chrome/*`, `@/site/*` | Logic phát âm dời sang `lib/` (bảng dưới) |
| `site/` | `@/features/*`, `@/app-chrome/*` | Được import `@/app-shell/theme/*` và `@/app-shell/config` (landing cần theme; `lib/legal.ts`, `lib/sources.ts` đọc config) |
| `app-chrome/` | `@/site/*` | Được import các context, API mà khung cần từ `features/` (Thêm từ, phím `/` tìm từ, hộp Lịch) |
| `features/learner/*` | `@/site/*` | |

Dời file trong đợt này:

| File hiện tại | Tới | Đợt |
|---|---|---|
| `features/learner/word/pronunciation.ts`, `app-ui/speech.ts`, `app-ui/audio-player.ts` | `lib/speech/` | M1 (để `ui/SpeakButton` không import `features/`) |
| `components/landing/*`, `components/sections/*`, `components/layout/*`, `components/seo/*`, `components/interactive/*` | `site/landing/`, `site/legal/`, `site/layout/`, `site/seo/`, `site/interactive/` | M8 |
| `components/ui/*` | thay bằng `ui/*` và `site/layout/` | M8 |
| `app-ui/*` còn lại | thay bằng `ui/*`; file không còn ai dùng thì xóa | M1–M7; phần còn lại ở đợt polish sau M9 (QM8-9, QM9-1) |

Ngoại lệ (code facts web S10, S11): luật của `ui/` bỏ qua file test (`src/ui/**/*.test.{ts,tsx}`), vì `renderApp` (`app-ui/test-utils.tsx`)
import `@/app-shell/*`; `TurnstileWidget` không vào `ui/` (import `@/app-shell/config`), chuyển sang `features/learner/auth/` ở M2;
`app-ui/speech-test-support.ts` dời cùng `lib/speech/`.

Một test lint dùng `ESLint.lintText` với đường dẫn ảo (ví dụ `src/ui/Probe.tsx` import `@/features/...`) và kiểm có lỗi, để luật có "răng";
không ghi file mẫu lên đĩa (sẽ làm `pnpm lint` của CI fail); timeout riêng 30 giây (lần chạy đầu khoảng 3,2 giây). `components/` xóa ở M8;
`app-ui/` xóa ở đợt polish sau M9 (QM8-9, QM9-1); bản cũ nằm trong tag.

## 7. Token, theme, font, màu nhóm

### 7.1 Chỗ đặt token

Chuyển tiếp trong lúc màn cũ còn chạy (review I4). Token cũ và mới trùng tên mà khác nghĩa: cũ `accent` = vàng `#ffd84a`, `primary` = `#2445d6`,
`ink` = `#0f1a3d`; mới `accent` = navy `#1e3a8a`, `mark` = vàng, `ink` = `#1b2444`. Code web dùng tên cũ khắp nơi (`bg-canvas`, `bg-navy`,
`shadow-ledge`, `rounded-control`, `bg-primary-soft`, `pastel-island`…).

- Thêm `packages/design-tokens/web.css` (Light) và `web-dark.css` (Dark), mọi tên mang tiền tố `wm-` (ví dụ `--color-wm-accent`,
  `--radius-wm-button`, `--shadow-wm-card`), nên không trùng tên cũ. Thêm `./web.css`, `./web-dark.css` vào trường `exports` của
  `packages/design-tokens/package.json`; thiếu thì `@import` và `createRequire(...).resolve(...)` trong `tokens.test.ts` báo
  `ERR_PACKAGE_PATH_NOT_EXPORTED`.
- M1–M7: `apps/web/src/app/globals.css` import cả bộ cũ (`theme.css`, `dark.css`, `island.css`) và bộ mới. Màn đã làm lại chỉ dùng token `wm-`.
- Đợt polish sau M9 (QM8-9, QM9-1; danh sách việc ở delivery record, mục "Việc dọn chuyển sang đợt polish"): khi `grep` không còn class cũ trong
  `apps/web/src`, bỏ import bộ cũ khỏi web. Một test kiểm không còn class của bộ cũ trong `apps/web/src`. M8 chỉ bỏ class cũ ở trang công khai.
- Không sửa, không xóa gì trong `theme.css`: admin vẫn import (`apps/admin/src/styles/globals.css:2`) và có test riêng đọc nó
  (`apps/admin/src/styles/tokens.test.ts:8`). `dark.css`, `island.css`, `dark-pastel.css` xóa ở đợt polish, sau khi web hết class cũ và kiểm admin không import
  (QM9-1; M9b chỉ chuyển `color-scheme: dark` sang `web-dark.css`).
- Màu chỉ khai báo trong package, như luật hiện nay (README của package; UBC1). Kích thước trong token `wm-` viết bằng `rem`, như LP31 bắt với
  `theme.css` (10 px = `0.625rem`).
- Test mới cho `web.css`, `web-dark.css` (LP12 hiện chỉ đọc `theme.css`, nên tự nó không đỏ): cặp tương phản sáng và tối, hai file có cùng bộ
  khóa `--color-wm-*`, không có `px` trong `--radius-wm-*`, `--shadow-wm-*`. `text-classes.test.ts` thêm tên `--color-wm-*`, `--text-wm-*` vào danh
  sách cho phép; `lib/cn.ts` thêm các cỡ chữ `wm-` vào nhóm `font-size`, không thì `tailwind-merge` bỏ mất cỡ chữ khi đi cùng màu chữ (code facts
  web S6, S7, S13). README của package thêm mục bộ `wm-`.

### 7.2 Giá trị từ Figma (đọc 09/11/2026)

Bộ "Wordmet" (Light / Dark):

| Biến | Light | Dark |
|---|---|---|
| `color/bg` | `#f6f7fa` | `#0f1220` |
| `color/surface` | `#ffffff` | `#171b2a` |
| `color/ink` | `#1b2444` | `#eceef5` |
| `color/muted` | `#525a78` | `#a6adc4` |
| `color/ghost` | `#c9cedc` | `#353c53` |
| `color/line` | `#e1e5ee` | `#2a3044` |
| `color/accent` | `#1e3a8a` | `#8da2ff` |
| `color/accent-soft` | `#e7ecf8` | `#1f2747` |
| `color/on-accent` | `#ffffff` | `#0f1220` |
| `color/mark` | `#ffd84a` | `#ffd84a` |
| `color/mark-ink` | `#1b2444` | `#1b2444` |
| `color/pass` / `pass-soft` | `#1b7a46` / `#e4f2ea` | `#62c98f` / `#142a1e` |
| `color/fail` / `fail-soft` | `#b8352a` / `#f8e7e5` | `#ff8d80` / `#311a18` |

Bộ "Wordmet số đo" (19 biến, một chế độ): bo góc `sm` 6, `md` 10, `lg` 14, `xl` 20, `2xl` 28, `pill` 999, `button` 10, `modal` 16, cùng các biến
còn lại đọc lúc làm M1 bằng `get_variable_defs`. Giá trị Dark của biến màu ở bảng trên đọc bằng Plugin API (`valuesByMode`) ngày 09/11/2026;
`get_variable_defs` chỉ trả chế độ Light.

Bóng (Light; bản Dark theo mockup tối, GM4):

| Token | Giá trị |
|---|---|
| `--shadow-card` | `0 1px 2px rgb(27 36 68 / .06), 0 10px 28px -14px rgb(27 36 68 / .20)` |
| `--shadow-row` | `0 1px 2px rgb(27 36 68 / .06), 0 4px 12px -8px rgb(27 36 68 / .16)` |
| `--shadow-pop` | `0 2px 6px rgb(27 36 68 / .08), 0 24px 56px -24px rgb(27 36 68 / .34)` |
| `--shadow-wm-btn` (nút chính) | `0 10px 28px -10px rgb(30 58 138 / .34)` |
| nút xanh / đỏ | `0 10px 26px -14px rgb(27 122 70 / .35)` / `0 10px 24px -8px rgb(184 53 42 / .30)` |
| nút phụ (`Shadow/Soft`) | `0 1px 2px rgb(27 36 68 / .05), 0 14px 34px -14px rgb(27 36 68 / .22)` |

Card, Row, Pop lấy từ ba effect style cùng tên trong Figma (đã đọc ngày 09/11/2026). Bóng nút lấy từ Figma, không lấy trang mẫu vòng 15 (review M7):
nút chính và nút đỏ là bóng đặt tay trên từng nút sau lượt "trả bóng nút"; nút xanh lấy từ biến thể `Lựa chọn / Trạng thái=Đúng` (`3:35`); nút phụ
dùng effect style `Shadow/Soft` của biến thể `Nút / Kiểu=Phụ` (`3:8`). Nút bị tắt không có bóng.

### 7.3 Màu ngăn

Sáu ngăn (Mới, 1, 3, 7, 14, 30 ngày) mỗi ngăn một màu hạng (xám, đồng, bạc, vàng, lục bảo, ánh kim), lấy từ component "Chip ngăn" (`54:656`)
ở trang Hệ thống. Component này dùng màu đặt tay, không gắn biến; mã màu đọc bằng Plugin API ngày 10/11/2026:

| Ngăn | Nền | Chấm | Chữ |
|---|---|---|---|
| Mới (0) | `#eef0f4` | `#9aa3b1` | `#525a78` |
| 1 ngày | `#f7e8dc` | `#c07a45` | `#7c4a28` |
| 3 ngày | `#edf0f4` | `#98a2b0` | `#4d5664` |
| 7 ngày | `#fbf0c8` | `#d4a72c` | `#6f5208` |
| 14 ngày | `#dcf3ea` | `#1f9d75` | `#0c654c` |
| 30 ngày | gradient `#ffe0f2` → `#fff2d1` (35%) → `#dbffeb` (70%) → `#d9f0ff` | gradient góc `#ff8ad9` → `#ffd46b` → `#8cffb5` → `#7ad6ff` | `#3b2f6b` |

Chữ trên nền đều ≥ 5,9:1. Khai báo `--color-wm-stage-<n>-bg|dot|ink` trong `web.css`; bản tối chốt cùng mockup tối (GM4), trước đó dùng giá trị sáng. Màu ngăn chỉ để mã hóa ngăn, không thay màu nhấn
(`app-redesign-plan.md`, "Ý tưởng chung").

### 7.4 Màu nhóm (GM5)

Hiện nay màu tính theo vị trí nhóm trong danh sách (`features/learner/groups/GroupCard.tsx:27`, xoay vòng 4 nền). Thiết kế mới dùng màu làm dấu
nhận ra nhóm ở băng chuyền, bảng chọn nhóm, Hôm nay; thứ tự nhóm đổi theo số thẻ đến hạn, nên tính theo vị trí thì màu đổi giữa các lần mở.

- **Bảng màu** (viền nhóm đọc trong các khung Nhóm, Hôm nay, Chọn nhóm, 09/11/2026), theo thứ tự chỉ số 0–6: `#e5603f` cam, `#149384` lục lam,
  `#7a55d3` tím, `#d99a17` hổ phách, `#4a9637` lục, `#d2427a` hồng, `#2a86d1` lam. Nhóm chưa có từ nào dùng `#64708c` (khung "nhóm trống").
  Các màu nhạt hơn trong Figma là thẻ phía sau của chồng (tô nhạt từ màu nhóm), không phải màu riêng.
- **Hàm:** `groupColorIndex(id) = fnv1a32(id.toLowerCase()) mod 7`, hàm thuần trong `lib/`, không phụ thuộc React, chỉ trả chỉ số.
- **Token:** `--color-wm-group-0` … `--color-wm-group-6`, `--color-wm-group-empty` (viền, nền nhạt) và `--color-wm-group-0-ink` … (chữ) trong
  `web.css`, `web-dark.css`; component dùng token theo chỉ số, không viết hex trong `lib/` hay `style=` (luật UBC1 và `check-tailwind-raw.mjs`).
- **Màu cho chữ** (số thẻ chờ "24"): tương phản trên trắng đo được `#d99a17` 2,45, `#e5603f` 3,46, `#149384` 3,79, `#4a9637` 3,68, `#2a86d1` 3,87,
  `#d2427a` 4,37, `#7a55d3` 5,16 (review M6). Chỉ hổ phách dưới 3:1, nên `--color-wm-group-3-ink` = `#bb8414` (3,27:1); sáu màu còn lại dùng
  chính nó làm `-ink`. Kiểm ≥ 3:1 (chữ ≥ 24 px) trong test token.
- Bản Dark của bảy màu chốt cùng mockup tối (GM4); trên nền tối `#7a55d3` chỉ 3,32 và `#64708c` 3,46.
- **Xác suất trùng màu** (review M6): với 7 màu, 3 nhóm có 39% khả năng có ít nhất một cặp trùng, 5 nhóm 85%. Chủ dự án giữ cách theo ID (QR5).

| Khi | Thì |
|---|---|
| Lan mở Nhóm hôm nay rồi ngày mai, thứ tự nhóm đã đổi | Mỗi nhóm giữ đúng màu cũ |
| Lan đăng nhập trên máy khác | Cùng màu, vì chỉ phụ thuộc ID |
| Hai nhóm ra cùng chỉ số | Hai nhóm cùng màu; tên nhóm vẫn khác (xác suất ở trên, QR5) |
| "Du lịch Nhật" chưa có từ | Viền `#64708c`; thêm từ đầu tiên thì về màu theo ID |
| ID viết hoa và viết thường | Cùng màu (hàm hạ chữ trước khi băm) |
| Màu nhóm dùng cho chữ (số thẻ chờ "24") | Dùng token `-ink` của màu đó (≥ 3:1), không dùng màu viền |

Test pin chỉ số chính xác cho ít nhất 7 ID mẫu và kiểm hàm luôn trả số nguyên trong [0, 6].

### 7.5 Component dùng chung (`src/ui/`)

Dựng trên `react-aria-components` 1.22.1 (đã có) cho phần cần truy cập bằng phím: hộp thoại, menu, công tắc, nút chia đoạn, ô chọn.

| Component Figma (trang Hệ thống) | Component code | Ghi chú |
|---|---|---|
| Nút (Chính, Phụ) `3:12` | `Button` | Bo `radius/button`; bóng theo §7.2; trạng thái tắt không bóng; vùng chạm ≥ 44 px ở điện thoại |
| Nút chữ (Thêm, Thường, Phụ, Xóa) `166:326` | `TextButton` | Không nền, không gạch chân |
| Phím `3:17` | `Kbd` | |
| Ô nhập (Thường, Đang nhập, Lỗi) `34:345`, Ô mã `34:364` | `Field`, `OtpField` | Nhãn trên ô, ràng buộc dưới ô, lỗi ngay dưới ô |
| Ô tick `34:355`, Ô chọn nhỏ `96:315` | `Checkbox` | |
| Ô chọn `46:326`, Menu chọn ngôn ngữ `46:327` | `Select` | |
| Thẻ chọn `34:383` | `ChoiceCard` | Chọn kỳ gói Pro |
| Nút Google `34:366` | `GoogleButton` | |
| Công tắc `138:324` | `Switch` | |
| Nút chia đoạn `138:319` | `Segmented` | |
| Hàng nhóm `138:339`, Hàng kiểu câu `138:398` | phần của Tùy chỉnh phiên (`features/learner/practice`) | Không đưa vào `ui/` vì chỉ một màn dùng |
| Lựa chọn (Thường, Đúng, Sai) `3:51` | `AnswerOption` | Ô đáp án trắc nghiệm của Phiên luyện và màn Ôn |
| Thẻ từ `3:28` | `site/landing` (thẻ minh họa ở trang chủ) | Chỉ trang công khai dùng |
| Chip ngăn `54:656` | `StageChip`; thêm `StageBar` (thanh sáu ngăn) | |
| Chip từ `96:322` | `WordChip` | |
| Nút loa `54:657` | `SpeakButton` | Dùng lại logic `app-ui/speech.ts`, `audio-player.ts` |
| Ô ngày lịch `96:404` | phần của hộp Lịch | |
| Nền app `95:315`, `95:321` (mesh + hạt từ 10/11/2026) | `DotGridBackground`, đổi tên `AppBackground` ở M9a | CSS, hạt bằng SVG `feTurbulence` nhúng `data:` |
| Nút lịch nổi `95:343`, Nút lịch trong thanh `95:344` | `CalendarButton` (`app-chrome/`) | Phím `L` |
| Thanh trên app (Desktop theo tab, Mobile) `54:502`, `54:503` | `TopBar` (`app-chrome/`) | Kính mờ: `backdrop-filter: blur(24px) saturate(1.6)` |
| Thanh tab dưới `54:637` | `MobileTabBar` (`app-chrome/`) | |
| Menu ảnh đại diện `181:316` | `AvatarMenu` (`app-chrome/`) | |
| Logo `3:14`, Thanh trên/Chân trang `5:2`, `9:93`, `7:209`, `9:100` | `site/layout/*` | Trang công khai |
| (không có component) | `Dialog`, `Sheet`, `Toast`, `Card`, `Tag`, `ProgressBar` + số đúng/sai, `Skeleton` | Dựng theo khung và §3.3 |

Mỗi component có test hành vi (theo role và chữ hiển thị) ở `ui/*.test.tsx`.

## 8. Motion

### 8.1 Nguồn và token

Mọi số ở [`motion-va-chuyen-canh.md`](../../mockups/2026-11-05-redesign-concepts/motion-va-chuyen-canh.md) §1–§6, §8. Dùng lại hai đường
cong đã có cùng giá trị: `--ease-out-strong` `cubic-bezier(0.23, 1, 0.32, 1)` (`globals.css:155`) và `--ease-spring` (`theme.css:78`). Token mới
trong `web.css`: mức mờ `--blur-wm-sm` 6px, `--blur-wm-md` 12px, `--blur-wm-lg` 18px (không đè `--blur-sm/md/lg` mặc định của Tailwind), thời lượng
`--transition-duration-wm-out` 160ms, `--transition-duration-wm-in` 320ms. Mức mờ trên điện thoại (dưới) là rule `@media` riêng ngoài khối `@theme`,
vì `@theme` chỉ chứa biến và `@keyframes`. Component dùng token, không viết số rời.

Điều kiện từ khảo sát (chủ dự án đồng ý 09/11/2026):
- Dưới 768 px, `--blur-wm-lg` bằng 12px: mức mờ khi chuyển cảnh trên điện thoại tối đa 12px.
- Hộp thoại và tấm trượt đóng trong 150ms, đường cong tăng tốc (GM15).
- Trước khi gộp vào `dev`: đo một phiên Học 20 thẻ trên Android tầm thấp và Safari iOS (DevTools Performance, CPU chậm 4–6 lần), ghi số khung
  hình vào delivery record.

### 8.2 Theo màn

| Màn | Chuyển động | Mục trong tài liệu motion |
|---|---|---|
| Học (lật thẻ, GM17) | Chồng thẻ tan mờ: lật 300ms, kéo, ngưỡng 110px hoặc 0,55 px/ms, thẻ tan, thẻ mới từ mờ thành nét, chip vào đống, số đếm nảy, màn xong phiên | §2 |
| Nhóm | Băng chuyền "Trượt mờ" quay vòng, đổi nhóm 620ms, mở và đóng nhóm (FLIP 380ms), bảng chọn nhóm (phím F) | §3 |
| Tra từ | "Từ hóa thẻ": thẻ cũ tan, thẻ mới tới, toast "Đã thêm…" 2,4 giây | §4 |
| Lịch, Ngày | Nút lịch nổi, lớp mờ 200ms, hộp 240ms, tấm trượt từ 60px, sang Ngày trượt ±22px 220ms | §5 |
| Mọi hộp thoại và tấm trượt (GM15) | Cùng chuyển động của hộp Lịch: lớp mờ 200ms, hộp 240ms đường cong chính, tấm trượt từ `translateY(60px)` kèm hiện dần | §5, §6 |
| Nút | Rê chuột `brightness(1.12)` 200ms; bấm `scale(.97)` 150ms | §6 |
| Đơn hàng | Chấm "đang chờ" nhấp nháy 1,4 giây cho tới khi đơn đổi trạng thái (ngoại lệ duy nhất của luật không lặp) | §6 |
| Trang chủ, 404 (QM8-3, chủ dự án 11/11/2026) | Hiệu ứng theo landing bản 3 (`landing-mo.html`, artifact `LxqBqZYrXejQt8cci67ucF`): chữ hiện từng từ từ mờ sang nét, khối hiện khi cuộn tới, thẻ nổi nhấp nhô và lệch theo chuột, dải từ chạy ngang, bộ thẻ bay vào, ô demo tự chạy, quầng sáng quanh thẻ phần cuối. Phần bản 3 không có (chữ chủ đề đổi trong nhãn hero, viền Pro sáng chạy, 404) lấy số ở các cảnh Figma trang `2:3`. Điện thoại mờ tối đa 12 px; không có nút dừng (QM8-3′, rủi ro §15); người bật giảm chuyển động thấy ngay trạng thái cuối. Đoạn văn đổi màu ẩn như Figma | §7 |
| Phiên luyện | Câu mới, đáp án đúng, chọn sai: dùng lại `card-rise`, `pop-in`, `wiggle-soft` hiện có cho tới khi tài liệu motion có số riêng | §7, §9 |

### 8.3 Chỗ lệch giữa giao diện mới và code (GM14: lấy số của giao diện mới)

| Chỗ | Lấy | Thay cho |
|---|---|---|
| Lật thẻ ôn | 300ms đường cong chính | 280ms `--ease-standard` |
| Sang thẻ mới ở Ôn | Thẻ cũ tan mờ, thẻ mới từ mờ thành nét | `card-rise` 200ms |
| Hộp thoại | 240ms đường cong chính, nhích 12px | `dialog-in` 250ms |
| Tấm trượt | Từ `translateY(60px)` kèm hiện dần | Từ `translateY(100%)` |
| Bấm nút | `scale(.97)` | Lún gờ 0,18rem (`pressed`, kiểu hướng B) |
| Màn tổng kết | Khối từ mờ thành nét 400ms, cách nhau 90ms (tài liệu motion ghi 520ms; khảo sát: quá mốc 500ms của NN/g) | `summary-in` 250ms, 50ms |

### 8.4 Giảm chuyển động

Theo tài liệu motion §8: chỉ giữ đổi `opacity` và màu tối đa 200ms; thẻ ôn đổi mặt bằng `opacity`; băng chuyền đổi ngay; hộp và tấm trượt không
chạy hiệu ứng. Giữ hai cơ chế hiện có: quy tắc cuối `globals.css` (mọi thời lượng về 0.01ms) và `lib/use-reduced-motion.ts` (trả `true` lúc
render ở server). Kéo thẻ vẫn theo tay.

### 8.5 Truy cập của các màn có chuyển động (review M13)

- **Băng chuyền Nhóm:** vùng băng chuyền có `role="region"` và nhãn; chồng giữa là phần tử bấm được duy nhất; các chồng bên cạnh đang mờ là `inert`;
  đổi nhóm thì một vùng `aria-live="polite"` đọc tên nhóm và số thẻ chờ.
- **Kéo thẻ ở Học:** luôn có hai nút "Cần ôn lại", "Đã biết" và phím tương ứng, nên không bắt buộc kéo (WCAG 2.2, tiêu chí 2.5.7).
- **Phím tắt một chữ** (`L`, `F`, `N`, `/`): bỏ qua khi con trỏ đang ở ô nhập, ô chọn hay vùng sửa chữ (ví dụ ô gõ đáp án ở Phiên luyện, màn Ôn).
- **Hiệu năng:** đo khung hình hoặc INP của Học (chồng thẻ) và Nhóm (băng chuyền) trên điện thoại tầm thấp (CPU chậm 4×), cùng lần đo ở §8.1.

## 9. Các đợt và màn

Mỗi đợt một hoặc vài PR vào `refactor/giao-dien-moi`. ID là khung Figma (máy tính / điện thoại).

**M1 — Nền.** Token và font (§7, §5.8); `ui/` (§7.5); khung app trong layout (§5.4) với `loading`/`error` (§5.5); nền lưới chấm; luật phụ thuộc
(§6), dời file phát âm sang `lib/speech/`. Các màn cũ chạy tạm trong khung mới (token cũ còn import, §7.1). Sửa các tài liệu nguồn theo bảng
chỗ lệch ở §3.1. Bỏ `<AppShell>` ở 17 chỗ gọi (§5.4); `renderApp` thêm tùy chọn bọc khung app cho test màn cần `<main>`, nút + nổi hay hộp
Thêm từ (`group-list.test.tsx:56–57`, `group-page.test.tsx:60,69,300,307,319`). Test đỏ vì đổi font và sửa trong cùng PR: `e2e/chrome.spec.ts:4–15`
(ghim H1 là Lexend). Font ảnh OG đổi ở M8 cùng trang công khai.
Làm 5 mockup tối (Hôm nay, Nhóm băng chuyền, Phiên luyện lúc trả lời sai, hộp Thêm từ, Đăng nhập) bằng HTML từ biến Dark của Figma, gửi chủ dự
án duyệt (GM4); phần tối sửa ở M9. Bản tối được chốt sau đó bằng trang so sánh và mockup bản chốt (QM9-2, QM9-3), thay cho 5 mockup này.

**M2 — Đăng nhập và tài khoản** (trang `35:307`).

| Đường dẫn | Khung |
|---|---|
| `/app/login` | Đăng nhập `35:308` / `37:485` |
| `/app/register` | Đăng ký `35:405` / `37:533` (thêm ô "Nhập lại mật khẩu", chỉ kiểm ở giao diện; API không đổi) |
| `/app/verify-email` | Xác minh email `36:385` / `37:623` |
| `/app/forgot-password` | Quên mật khẩu `36:417` / `37:656` |
| `/app/reset-password` | Đặt mật khẩu mới `36:447` / `37:687` (thêm ô "Nhập lại mật khẩu mới", Figma `153:705`, `153:728`; chỉ kiểm ở giao diện) |
| `/app/google/complete` | Hoàn tất đăng ký Google `36:490` / `37:731` |
| `/app/account-deleted` | Đã xóa tài khoản `36:549` / `37:791` |
| `/app/complete-profile` | Bổ sung hồ sơ `36:564` / `37:807` |
| `/app/welcome` | Chào mừng: chọn ngôn ngữ `36:591` / `37:835` |

Ô Turnstile giữ như hiện nay (`use-turnstile.tsx`); câu "chỉ hiện khi cần" còn chờ chủ dự án (`app-redesign-plan.md`, cuối mục "Bỏ chữ gạch chân").
`(auth)` tách `(split)` và `(card)` (§5.4). `AuthGate` giữ ngoại lệ B8-2: người đã đăng nhập (tài khoản chỉ có Google) vẫn mở được quên mật khẩu,
đặt mật khẩu (`features/learner/auth/AuthGate.tsx:12–13,31`; e2e `b8-set-password.spec.ts`).

**M3 — Hôm nay và Nhóm.**

| Đường dẫn | Khung |
|---|---|
| `/app` | Hôm nay `117:4425` / `117:4712` |
| `/app/groups` | Nhóm băng chuyền `82:3213` / `82:3368`; mở chọn nhóm `84:3173` / `84:3399` |
| `/app/group` | Một nhóm `84:3552` / `84:3749` |
| `/app/group/backlog` | Từ tồn đọng `97:3085` / `97:3239` |
| `/app/topic` | Chủ đề `98:3127` / `98:3297` |

Nút Học · Ôn theo DC3 của đợt C (GM17): hai nút bằng nhau, không có số; nút có việc đang chờ là nút chính navy (hướng B tô nền vàng, giao
diện mới dành vàng cho từ đích), nút còn lại là nút phụ. Figma đã sửa ở Hôm nay, Nhóm, Một nhóm và trang nền của Overlay 1, 6.
Thẻ nhóm "tiếp theo", "ôn gần nhất" và khối "Lần luyện gần nhất" ở Hôm nay dùng API mới ở §10.5 (QR2), làm trong đợt này. Nút "Luyện lại từ
sai →" của khối đó mở trang Từ hay sai (`/app/practice/weak`). Hộp thoại có trong code
nhưng chưa có khung Figma, làm trong đợt này theo `Dialog` chung (GM15), quy tắc §3.3 và hộp gần nhất trong Figma (hộp xóa theo Xóa tài khoản):
Tạo, Đổi tên, Xóa nhóm (`GroupDialogs.tsx`); Bỏ từ khỏi nhóm, Bỏ N từ khỏi việc học. Ảnh chụp các hộp này vào delivery record để chủ dự án xem.
Màu nhóm theo §7.4. Link "Xem lịch sử" ở Hôm nay đã đổi thành "Mở lịch học" trong Figma; trước M6 link này mở trang lịch sử cũ.

**M4 — Tra từ, trang một từ, Thêm từ.**

| Đường dẫn / hộp | Khung |
|---|---|
| `/app/lookup` | Tra từ "Từ hóa thẻ" `85:3218` / `85:3667` |
| `/app/word` | Trang một từ `118:4413` / `118:4714` |
| Hộp Thêm từ | Overlay 1 `73:580` / `73:966` (nút lưu "Lưu", không "Lưu {word}": `messages/vi.json`, khóa `App.addWord.save`, dòng 933) |
| Hộp Thêm câu | Overlay 2 `73:1167` / `73:1465` |
| Hộp Thêm cả loạt | Overlay 3 `73:1701` / `73:1925` |
| Hộp Kết quả tra bằng AI | Overlay 4 `75:1071` / `75:1346` (mẫu 1C vòng 15) |
| Hộp Chọn nhóm | Overlay 5 `75:1548` / `75:1849` |

Hộp chưa có khung Figma, làm theo cách ở M3: Sửa từ, Xóa từ (`MyWordDialogs.tsx`), Câu đã gặp (`SavedSentencesDialog.tsx`).

**M5 — Luyện tập và Ôn.**

| Đường dẫn / hộp | Khung |
|---|---|
| `/app/practice` | Luyện tập `99:3169` / `99:3391` |
| Hộp Tùy chỉnh phiên | Overlay 7 `131:3890` / `131:4232`; các trạng thái khác `131:4522`; điện thoại cuộn cuối `141:4320` |
| `/app/practice/session` | Vừa trả lời đúng `100:3164` / `100:3291`; gõ sai còn làm lại `178:5326` / `178:5442`; sai đã xem đáp án `178:5546` / `178:5657`; trắc nghiệm chọn sai `178:5755` / `178:5895`; tổng kết `119:4608` / `119:4701` |
| `/app/practice/weak` | Từ hay sai `119:4317` / `119:4482` |
| `/app/review` (Học, lật thẻ) | Mặt trước `80:3228`, đã lật (điện thoại) `80:3321`, đang kéo sang Đã biết `80:3429`, xong phiên `80:3557` / `80:3601` (tên khung đổi từ "Ôn" sang "Học" ngày 09/11/2026, GM17) |
| `/app/recall` (Ôn, chọn hoặc gõ từ theo nghĩa) | Trắc nghiệm theo nghĩa `208:5655` / `208:5778`; gõ từ theo nghĩa `209:5683` / `209:5802`; gõ sai, so chữ với đáp án `209:5902` / `209:6003` (dòng so chữ là đề xuất, code chưa có); xong phiên `209:6089` / `209:6195`. Gõ đúng hẳn mới tính đúng, không nhận lỗi gõ nhỏ (chủ dự án 09/11/2026) |

Hộp Tùy chỉnh phiên làm luôn các việc đã ghi cho "đợt dựng hộp mới" ở `docs/deliveries/cloze-own-then-ai.md` §"Việc cho đợt dựng hộp mới":
gửi `cloze_source: 'own_then_ai'` khi bật cả câu đã lưu và câu AI; nhãn AI và nút báo lỗi theo `item.ai`; `againBody` gửi lại nguồn mới; đổi dòng
`ownReplacesAi`. Nếu design `2026-11-09-practice-ai-count` (số câu AI do người học chọn) đã có API trước M5 thì hộp theo API đó; nếu chưa,
hộp theo API hiện có và phần số câu AI làm khi API đó xong.

Khung trạng thái `131:4522` có trạng thái "AI khóa ở gói Miễn phí", nhưng từ đợt A M3 gói Miễn phí có 15 lượt câu AI
(`docs/deliveries/cloze-own-then-ai.md`): làm theo API (Miễn phí dùng được câu AI tới khi hết lượt), ghi rulings. Hộp chưa có khung Figma, làm
theo cách ở M3: Báo lỗi câu này (`ReportDialog.tsx`), Phiên đang dở (`CurrentSessionCard.tsx`). Câu xác nhận sau khi gửi báo lỗi ("Xem kết quả trong
Lịch sử → Báo lỗi của tôi") đổi theo QR1.

**M6 — Lịch học.** API §10; hộp Lịch `102:3278` / `102:3948`, hộp Ngày `103:3820` / `103:4248`; nút lịch nổi trên mọi màn app (trừ overlay; trên
điện thoại ẩn ở Từ tồn đọng, Chủ đề); bỏ trang Lịch sử luyện tập (§10.4); link "Mở lịch học" ở Hôm nay mở hộp Lịch. Nút lịch đọc chuỗi ngày từ
`GET /v1/me/streak` (§10.5). Số liệu thêm của hộp Ngày theo §10.5.

"Báo lỗi của tôi" (QR1) chuyển trong cùng đợt, để không lúc nào mất lối vào:
- Trang `/app/settings/reports` (nhóm `(chrome)`, `Tab=Không`), dựng lại từ `MyReportsTab.tsx` hiện có, dùng `GET /v1/practice/reports` như hiện nay.
- Lối vào: một dòng "Báo lỗi của tôi" trong Cài đặt (cạnh "Lịch sử giao dịch") và một mục cùng tên trong menu ảnh đại diện (component `181:316`).
  Nếu M7 chưa làm lại Cài đặt thì thêm dòng vào trang Cài đặt cũ.
- Câu sau khi gửi báo lỗi đổi thành "Đã gửi báo lỗi. Xem kết quả trong Cài đặt → Báo lỗi của tôi." (`App.practice.session.report.done`).
- `/app/practice/history?tab=reports` chuyển tới `/app/settings/reports` (§10.4).
- Figma (vẽ 10/11/2026): trang `211:5827` (máy tính) / `211:6061` (điện thoại), dựng từ khung Lịch sử giao dịch, chia theo tháng, mỗi dòng: ngày
  gửi, "từ · lý do", kiểu câu (và "Đã trả lại 1 lượt câu AI" khi có), trạng thái có chấm màu; dòng "Báo lỗi của tôi" trong mục Tài khoản của Cài đặt
  (`120:4295`, `120:4559`, `181:5456`, `181:5748`); mục có icon cờ trong component "Menu ảnh đại diện" (`181:316`). Link ở chân hộp Lịch đã bỏ.

**M7 — Cài đặt, tài khoản, gói học.**

| Đường dẫn / hộp | Khung |
|---|---|
| `/app/settings` | Cài đặt `120:4295` / `120:4559`; menu ảnh đại diện mở `181:5456` / `181:5748` |
| `/app/settings/account` | Tài khoản `121:4297` / `121:4404` (email chỉ đọc, như `AccountPage.tsx`) |
| `/app/settings/delete-account` | Xóa tài khoản `121:4503` / `121:4634` (cột nhập bên trái) |
| `/app/settings/transactions` | Lịch sử giao dịch `122:4203` / `122:4354`; chi tiết `122:4484` / `182:5856` |
| `/app/plans` | Gói học `123:4196` / `123:4401` |
| `/app/plans/order` | Đơn hàng đã thanh toán `123:4598` / `123:4690`; trạng thái khác `123:4774` |
| Hộp Giới thiệu Pro (`HouseAd`) | Overlay 6 `75:2094` / `75:2373` |

Hộp Hủy gói (`SubscriptionRows.tsx`, `SettingsPage.tsx`) chưa có khung Figma, làm theo cách ở M3.

**M8 — Trang công khai và SEO** (trang `0:1`): Trang chủ `5:13` / `9:108`; Chính sách bảo mật `14:172` / `17:260`; Điều khoản sử dụng `15:190` /
`17:355`; Nguồn dữ liệu `16:210` / `18:283`; 404 `16:317` / `18:358`. SEO §11. Bảng giá trang chủ đọc giá lúc build (QR3, §10.6; trang chủ hiện
không ghi giá: `components/landing/Plans.tsx:31`). Font ảnh OG (§5.8). Chuyển phần còn lại của `components/` sang `site/` và xóa `components/`.
Quyết định của chủ dự án khi viết plan (QM8, decision record, 11/11/2026):
- Thanh trên: hai nút Đăng nhập (trắng) và Đăng ký (navy) thay "Dùng thử"; nút sáng/tối ở thanh trên trên máy tính, ở chân trang trên điện thoại.
- Bảng giá: ba giá Pro tĩnh kèm phần trăm giảm, không chọn kỳ, không nút mua (QM8-2).
- Chuyển động theo §8.2 (QM8-3).
- Chính sách, Điều khoản: khung theo Figma; chủ dự án bỏ phần đầu trùng trong văn bản ở admin; dòng meta có số phiên bản (QM8-4).
- Nguồn dữ liệu: không có nhãn "Dùng cho"; dòng ghi công hiện cả trên điện thoại (QM8-5).
- Hỏi đáp trên trang chủ do admin quản lý (§10.7), đọc lúc build cùng giá; Claude viết nháp câu trả lời (QM8-6).
- Favicon và ảnh chia sẻ: vẽ khung trong Figma, chủ dự án duyệt, rồi mới code (QM8-7).
- Không thuộc M8: xóa `app-ui/` và bỏ import token cũ (chuyển sang đợt polish sau M9, QM8-9, QM9-1); các chỗ sửa từ audit 11/11 (QM8-8).

**M9 — Kiểm thử và chế độ tối** (QM9-1: làm tuần tự M9a rồi M9b, một PR vào `refactor/giao-dien-moi` sau M9b).

- **M9a — Kiểm thử thành script, tải sau, dọn nhỏ.**
  - Script giữ trong repo (QM9-4): khóa chữ không dùng và hình dạng JSON-LD (chạy trong bộ unit, nên CI chạy); so dung lượng JS với bản cũ, ngưỡng
    10% (§5.7; bước riêng trong job `web` của CI); Lighthouse (lệnh tay); bộ ảnh `gm-m9`: mọi màn ở 390, 768, 1024, 1440, sáng và tối (lệnh tay,
    stack thật; QM9-5); đo khung hình trên điện thoại thật qua chung Wi-Fi với máy tính (QM9-6).
  - Tải sau (§5.7): Tùy chỉnh phiên và Giới thiệu Pro qua `next/dynamic`, như Thêm từ, Lịch, Ngày.
  - Đổi tên `DotGridBackground` thành `AppBackground`; ghi việc đo lại `GET /v1/groups` trên máy chủ thật vào `deploy-checklist.md`.
- **M9b — Chế độ tối theo bản chốt** (QM9-2, QM9-3; số đo ở `docs/mockups/2026-11-05-redesign-concepts/m9-ban-chot.html`, mục Hệ thống):
  - nút chính không bóng ở chế độ tối; mọi bóng tối dùng đen thay navy (§7.2 thêm giá trị tối cho mọi `--shadow-wm-*`, 11 khóa sau M8b);
  - lớp mờ sau hộp thoại: đen 55% ở chế độ tối (thay R10 cho chế độ tối; chế độ sáng giữ navy 30%);
  - giấy từ điển tối: nền `#1e2334`, viền `#2e3449`, chữ theo token tối (thay R71, R80);
  - màu nhóm tối: số (`-ink`) là bản sáng hơn, đạt từ 4,6:1 trên dòng đang chọn; `-wash` 16% và `-soft` 34% màu nhóm trộn với nền card;
  - nền mesh tối: quầng vàng 12%; hạt là nhiễu thô, `soft-light` 7% (theo landing bản 3);
  - nền nhạt tối nâng lên để màu không chìm: `accent-soft` 20%, `pass-soft` 18%, `fail-soft` 18% màu trên nền card (lệch khỏi Figma Dark, QM9-3);
  - box "Chưa đúng" ở chế độ tối dùng cam san hô `#e5603f` (nền 16%, viền 55%, tiêu đề `#e87052`); chế độ sáng giữ đỏ đậm của `fail`;
  - token mới cho màu mức (Mới, Bậc 1–5, ưu tiên, đến hạn), có giá trị sáng và tối; đợt polish dùng chúng thay màu ngăn;
  - `color-scheme: dark` chuyển từ `dark.css` sang `web-dark.css`.

**Đợt polish — sau M9, plan riêng** (QM9-1). Mọi chỗ còn lại của mockup bản chốt, danh sách đầy đủ ở
`docs/preparation/GIAO_DIEN_MOI_M9_TRA_LOI_2026-11-11.md`, mục "Đã chốt cho mockup đầy đủ": 25 chỗ lệch theo lựa chọn của chủ dự án; đổi "ngăn"
thành "Mới, Bậc 1–5"; góc bo mức C; bỏ JetBrains Mono; chip lọc, bảng từ và thanh tiến độ của Một nhóm; Nhóm kiểu Vòng cung; Học theo "Chồng
thẻ tan mờ"; chữ trong phiên bằng tiếng Anh; lưu một từ vào nhiều nhóm (API cần `group_ids`); xóa `app-ui/` và token cũ; chụp lại chỗ 24.

**PR cuối** `refactor/giao-dien-moi` → `dev` sau M9, đợt polish và M8c.

## 10. API lịch học (M6)

### 10.1 Dữ liệu sẵn có

- `learning_log`: mỗi lượt học, ôn, thêm, bỏ, học lại một từ; có `kind`, `answer`, `level_before`, `level_after`, `rating`, `origin`, `local_date`
  theo múi giờ của người học lúc ghi (`apps/api/prisma/models/learning.prisma:50–79`). Code facts đầy đủ:
  `docs/preparation/GIAO_DIEN_MOI_PLAN_CODE_FACTS_2026-11-10-api.md`. Bỏ một từ khỏi việc học giữ log (D33), nhưng **xóa từ riêng xóa luôn log
  của từ đó** (`quick-add.service.ts:95`); `learning_activity_days` không bị xóa.
- `learning_activity_days`: một dòng mỗi người mỗi ngày có hoạt động, `studied` = có học thật (`learning.prisma:81–91`).
- `GET /v1/practice/history?date=YYYY-MM-DD` lọc **câu trả lời** theo `local_date`, chỉ của phiên `kind='practice'` (phiên Ôn không vào, DC30),
  có phân trang (`practice/history/history.controller.ts:8–35`, `history.service.ts:102–104`). `practice_sessions` không có `local_date`; chỉ
  `practice_session_items.local_date` có, và đã có index `(user_id, local_date)` (`practice.prisma:92,111`).
- `learning_log.kind` có `review`, `item_added`, `item_removed`, `relearn`; `rating` chỉ là `'Good'` hoặc `'Again'` (CHECK ở
  `20261017210000_learning/migration.sql:85,87`; `answer` là `known` / `review`); `origin` là `null` (lật thẻ ở Học), `'practice'` (nút "Cần ôn tập /
  Đã biết" trong phiên luyện, `group_id` null), `'recall'` (câu cuối của phiên Ôn). Mọi dòng `review` hiện có đều có `rating`.
- `practice_sessions` không có cột `finished`, `finished_at`, `local_date`; `status` ∈ `active`, `waiting_continue`, `finished`, `abandoned`.
  Job dọn dẹp xóa câu luyện cũ hơn `historyMonths` (mặc định 6 tháng, `practice-cleanup.service.ts:38`); `learning_log` không bị dọn.

### 10.2 Endpoint

Module Learning sở hữu cả hai endpoint (nó sở hữu hai bảng trên). Số phiên luyện và số câu đến từ Practice qua một **port do Learning khai báo,
Practice cung cấp**, token `PRACTICE_DAY_COUNTS` (chuỗi, như `PRIVATE_SENSES_CLEANUP`), hai hàm:
- `countByLocalDate(userId, from, to): Promise<{ date: string; sessions: number; questions: number; correct: number }[]>`;
- `sessionsOfDay(userId, date): Promise<{ sessionId: string; firstPosition: number; lastPosition: number; questions: number; correct: number }[]>`.

Lý do: `PracticeModule` đã import `LearningModule` (`practice.module.ts:7,46`); Learning import ngược lại sẽ thành vòng (review I3). Provider đặt
trong `@Global()` `PracticePortsModule` (`practice/maintenance/private-senses-cleanup.provider.ts:57–63`, đăng ký ở `app.module.ts`), không trong
`PracticeModule` (không có `exports`). Learning inject **không** `@Optional()`, để thiếu provider thì ứng dụng không khởi động thay vì trả số 0.
Múi giờ lấy bằng `IdentityService.getProfile(userId).timezone` (`Learner` không có múi giờ), như `QueueService.today`.

**Định nghĩa** (review I2; bước code facts của plan chỉ kiểm định nghĩa khớp các chỗ ghi log, không đổi định nghĩa):

| Số | Định nghĩa |
|---|---|
| `learned` của một ngày | Số `item_id` khác nhau có dòng `kind='review'`, `level_before = 0`, `level_after ≥ 1` trong ngày, mọi `origin` (lượt đưa từ khỏi ngăn Mới: lật thẻ ở Học, nút trong phiên luyện; DC4 đợt C). Từ đã "học lại" (`kind='relearn'`, về ngăn 0) học lại lần sau thì tính `learned` lần nữa |
| `reviewed` của một ngày | Số **lượt**: số dòng `kind='review'` còn lại trong ngày (không thỏa điều kiện `learned`), mọi `origin` |
| `practice_sessions` của một ngày | Số `session_id` khác nhau có câu đã chấm trong ngày theo đúng bộ lọc của history (`result IN ('correct','wrong')`, phiên `kind='practice'`, `history.service.ts:103`); phiên qua nửa đêm tính ở cả hai ngày |
| `practice_questions` của một ngày | Số câu đã chấm trong ngày theo cùng bộ lọc |
| `result` của một từ | `rating` của lượt cuối đổi tên: `'Good'` → `known`, `'Again'` → `again` |
| `study_days` của tháng | Số dòng `learning_activity_days` có `studied = true` trong tháng |
| "Một từ" | Một `item_id` (một nghĩa đã lưu), không phải một lemma |

**`GET /v1/me/calendar?month=YYYY-MM`**

```json
{
  "month": "2026-11",
  "days": [{ "date": "2026-11-08", "learned": 10, "reviewed": 22, "practice_sessions": 1 }],
  "totals": { "study_days": 6, "learned": 41, "reviewed": 130, "practice_sessions": 5 }
}
```

- `days` chỉ có ngày có ít nhất một trong ba số lớn hơn 0, xếp tăng dần theo ngày.
- `month` bắt buộc; web tính tháng hiện tại theo `me.timezone` của người học.
- Trường thêm cho hộp Ngày và nút lịch (số Đã biết / Cần ôn lại, số nhóm, tóm tắt phiên, chuỗi ngày) theo QR2.

**`GET /v1/me/calendar/days/YYYY-MM-DD?kind=all|learned|reviewed&page_size=&page_token=`**

```json
{
  "date": "2026-11-08",
  "counts": { "learned": 10, "reviewed": 22, "practice_questions": 18 },
  "items": [{ "kind": "reviewed", "item_id": "…", "lemma": "mitigate", "group_id": "…", "result": "known", "times": 2 }],
  "next_page_token": null
}
```

- Mỗi `(item_id, kind)` một dòng trong ngày; `result` theo bảng định nghĩa (`known` / `again`), `times` là số lượt; `lemma` lấy qua
  `ContentService.cardContent` (chỉ trả nghĩa còn hiện, gọi một lần cho cả trang), không có thì `null`; `group_id` là nhóm của
  lượt cuối (`null` khi lượt cuối có `origin='practice'`; web hiện không chấm màu).
- `counts` luôn là tổng của cả ngày, không đổi theo `?kind=`. `kind` mặc định `all`.
- Thứ tự: giờ của lượt cuối, mới trước; cùng giờ thì theo `item_id`. `page_token` gắn với `(date, kind)` như history (`encodeBoundToken`,
  `history.service.ts:130`): dùng token của ngày khác hay `kind` khác thì 400.
- Câu luyện tập của ngày lấy từ `GET /v1/practice/history?date=` hiện có; hộp Ngày gọi cả hai.
- Phân trang theo quy ước chung: `page_size` mặc định 20, tối đa 100, `page_token` mờ (SR của system-spec).

### 10.3 Trường hợp biên

| Khi | Thì |
|---|---|
| `month` sai dạng (`2026-13`, `26-11`) hoặc thiếu | 400 `validation-failed`, `violations` nêu `month` (`problem-details.filter.ts:79-89`, Zod qua `@Query({ schema })`) |
| `month` ngoài khoảng 2026-01 tới 2100-12 (ví dụ `0001-01`) | 400 `validation-failed`, `violations` nêu `month` |
| `date` không có thật (`2026-02-30`) | 400 `validation-failed`, `violations` nêu `date` |
| Tháng hoặc ngày ở tương lai theo múi giờ của Lan | 200, không có dòng nào, tổng bằng 0 |
| Tháng trước khi Lan tạo tài khoản | 200, rỗng |
| Lan đổi múi giờ giữa tháng | Mỗi dòng giữ `local_date` lúc ghi; lịch theo `local_date`, không tính lại |
| Một từ được học rồi ôn lại cùng ngày | Có một dòng `learned` và một dòng `reviewed` |
| Một từ ôn 3 lần trong ngày, lần cuối "Cần ôn lại" | Một dòng `reviewed`, `result: "again"`, `times: 3` |
| Từ riêng đã bị xóa | Log của từ đó đã bị xóa cùng từ: số của các ngày cũ giảm theo; ngày chỉ có từ đó vẫn tính trong `study_days` nhưng không có trong `days` |
| Nghĩa trong kho chung bị ẩn hoặc gỡ sau khi đã học | Dòng vẫn có; `lemma = null`; web ghi "Từ không còn trong kho", không có link |
| Tháng cũ hơn 6 tháng | `learned`, `reviewed` vẫn đủ; `practice_sessions`, `practice_questions` bằng 0 vì job dọn dẹp đã xóa câu luyện (`historyMonths`) |
| Ngày có 300 lượt ôn | Phân trang 20 dòng một lần; `counts` vẫn đúng tổng |
| Ngày chỉ có thêm hoặc bỏ từ (`studied = false`) | Không tính là ngày có học; không có trong `days` |
| Không đăng nhập | 401 như mọi endpoint của người học |
| Ngày chỉ có lượt lật thẻ ở Học với từ đã học | Tính vào `reviewed` (mọi `origin`) |
| Một từ mới bấm "Cần ôn lại" ngay lần học đầu | Một dòng `learned` (lượt có `level_before = 0`); không có dòng `reviewed` |
| Tài khoản bị xóa | Dữ liệu đã xóa cùng tài khoản; không có gì để trả |

Hàm gộp số theo ngày và theo tháng là hàm thuần, test đủ các dòng trên. Hai endpoint lịch không có giới hạn tốc độ riêng (SR14 chỉ áp cho endpoint
ghi); `GET /v1/public/prices` có giới hạn theo IP (§10.6), theo tiền lệ `@Get('complete') @Public() @RateLimit('auth.google.ip')`.

**Index:** `learning_log` chỉ có index `(user_id, group_id, local_date)` và `(user_id, item_id)` (`learning.prisma:76–77`); truy vấn theo tháng
của một người mọi nhóm không dùng hết index đầu. Thêm `@@index([userId, localDate])` vào model và migration
`CREATE INDEX "learning_log_user_id_local_date_idx"` (tên Prisma tự sinh, để kiểm drift của CI không lệch); thư mục migration đặt tên sau
`20261112150000_cloze_source_own_then_ai` (dấu thời gian các migration đang đi trước lịch) (review M17).

**Khoảng trống chấp nhận:** không còn backend e2e (D38), nên truy vấn SQL chỉ được kiểm qua smoke (ngày hôm nay); ca đổi múi giờ, qua nửa đêm, từ
đã xóa chỉ có hàm thuần kiểm.

### 10.4 Trang Lịch sử luyện tập

`/app/practice/history` thành trang server chỉ chuyển hướng, giữ locale: có `?date=` thì sang `/{locale}/app/practice?ngay=<date>`; không có thì
sang `/{locale}/app/practice?lich` (không giá trị) và web tự tính tháng theo `me.timezone`, vì server Worker chạy giờ UTC, lệch tháng với người học
UTC+7 trong 7 giờ đầu tháng (review M4). `?tab=reports` chuyển tới `/{locale}/app/settings/reports` (QR1). `features/learner/practice/HistoryPage.tsx`
xóa (còn trong tag).

### 10.5 API thêm theo QR2 (chủ dự án: "toàn bộ thêm API", 10/11/2026)

| Endpoint | Module | Thêm gì | Đợt |
|---|---|---|---|
| `GET /v1/groups` | Learning | Mỗi nhóm thêm `next_lemma: string \| null` và `last_reviewed: { lemma: string \| null, at } \| null` | M3 |
| `GET /v1/practice/sessions/last` (mới) | Practice | `{ id, group_id, local_date, last_answer_at, finished, questions, correct, wrong_count, wrong_lemmas }`; 204 khi chưa có phiên nào | M3 |
| `GET /v1/me/calendar/days/{date}` | Learning (+ port Practice) | `counts.reviewed_known`, `counts.reviewed_again`, `counts.learned_groups`; `practice_sessions: [{ session_id, first_position, last_position, questions, correct }]` | M6 |
| `GET /v1/me/streak` (mới) | Learning | `{ days, studied_today }`, dùng lại `streakAsOf` (`learning/learning.service.ts:61–62`) | M6 |

**Định nghĩa:**

| Trường | Định nghĩa |
|---|---|
| `next_lemma` | Lemma của thẻ đầu tiên mà hàng đợi `GET /v1/groups/:id/queue?mode=due` trả lúc này (ưu tiên theo `added_at, id` → đến hạn theo `due_date, level, added_at, id` → mới theo `added_at, id`, trong giới hạn còn lại của ngày; `queue.queries.ts:70-90`); `null` khi hàng đợi trống. Tính bằng một truy vấn mới cho mọi nhóm (dựa theo `todayIdsQuery`, `practice-reads.queries.ts:29-67`, thêm thứ tự và `group_id`), không sửa `groupStatsQuery` (job nhắc nhở dùng chung) |
| `last_reviewed` | Dòng `learning_log` `kind='review'` mới nhất có `group_id` của nhóm (`DISTINCT ON (group_id) … ORDER BY at DESC`); `lemma` qua `ContentService.cardContent`, nghĩa không còn hiện thì `null`; nhóm chưa ôn lần nào thì `last_reviewed = null` |
| `sessions/last` | Phiên `kind='practice'` có câu đã chấm mới nhất; `finished = (status = 'finished')`; `local_date`, `last_answer_at` lấy từ câu đã chấm cuối; `questions`, `correct` dùng lại `PracticeReviewsService.summary` (`practice-reviews.service.ts:73-95`); `wrong_lemmas` tối đa 4 lemma khác nhau của câu sai theo thứ tự trả lời, lemma lấy từ câu hỏi đã lưu (`answer_key->'reveal'->>'lemma'`, như history); `group_id` `null` khi phiên không theo nhóm. Tên nhóm web lấy từ `GET /v1/groups` |
| `reviewed_known`, `reviewed_again` | Số lượt ôn trong ngày theo `rating` (`'Good'`, `'Again'`); tổng hai số bằng `reviewed` |
| `learned_groups` | Số `group_id` khác nhau (không tính `null`) trong các dòng học mới của ngày |
| `practice_sessions` | Mỗi phiên có câu trả lời trong ngày một mục; `first_position`, `last_position` là vị trí câu nhỏ nhất, lớn nhất được trả lời trong ngày đó; `questions`, `correct` chỉ đếm câu của ngày đó. Practice cung cấp qua port ở §10.2 |
| `streak` | Theo DC8 đợt C: số ngày học liên tiếp tính tới hôm nay (hoặc hôm qua nếu hôm nay chưa học), `studied_today` cho biết hôm nay đã học chưa |

| Khi | Thì |
|---|---|
| Nhóm trống hoặc hôm nay không còn thẻ nào | `next_lemma = null`; thẻ nhóm không hiện dòng "tiếp theo" |
| 50 nhóm | `GET /v1/groups` tính hai trường bằng một truy vấn cho mọi nhóm và một lần `cardContent` cho mọi lemma, không gọi hàng đợi từng nhóm; `pnpm test:scale` (100 nhóm × 2.000 từ, < 500 ms, chạy tay) vẫn qua |
| Thẻ đầu hàng đợi là nghĩa vừa bị ẩn | Bỏ qua thẻ đó, lấy thẻ kế (hàng đợi cũng bỏ thẻ không có `cardContent`, `queue.service.ts:105-108`) |
| Lan chưa luyện phiên nào | `sessions/last` trả 204; Hôm nay không hiện khối "Lần luyện gần nhất" |
| Phiên gần nhất không có câu sai | `wrong_lemmas = []`; khối ẩn nút "Luyện lại từ sai" |
| Lan vừa học xong lượt đầu trong ngày | Câu trả lời của API đã kèm chuỗi ngày (như hiện nay); web cập nhật bộ đệm của `GET /v1/me/streak`, không gọi lại |
| Lan đổi múi giờ | `streak` theo `local_date` lúc ghi, như `streakAsOf` hiện nay |

### 10.6 Giá công khai cho trang chủ (QR3)

- `GET /v1/public/prices` (đã làm ở Part 1 của plan; `@Public()`, module Settings, controller theo mẫu `legal/public-legal.controller.ts`):
  `{ currency: 'VND', prices: { '1': number, '3': number, '12': number } }`, đọc cùng cài đặt với `GET /v1/me/app-config`
  (`settings/app-config.view.ts:13–16,42`; mặc định 79.000, 199.000, 599.000 ở `settings.definitions.ts:86`). Hiện giá chỉ có ở endpoint cần đăng nhập
  đó. Giới hạn theo IP bằng một luật mới `public.prices.ip` (60 lần mỗi phút).
- Trang chủ đọc giá **lúc build**, nên vẫn dựng sẵn. Bảng giá và JSON-LD dùng cùng số. Cách đọc (Part 8, QM8): `next.config.ts` thành hàm async,
  lúc `next build` gọi `GET /v1/public/prices` và `GET /v1/public/faq` (§10.7), đợi tối đa 5 giây mỗi lần, rồi đưa kết quả vào `env`
  (`WORDMET_LANDING_DATA`); Next thay `process.env.WORDMET_LANDING_DATA` bằng giá trị đó lúc build. `site/landing/landing-data.ts` đọc biến này, thiếu
  thì dùng `site/landing/landing-data.fallback.ts`.
- Build không đọc được dữ liệu: khi biến `LANDING_DATA_REQUIRED=1` thì build fail; khi không có biến (CI của PR, máy dev, `cf:docker`) thì dùng bản
  dự phòng và in cảnh báo. M8 **chưa** đặt biến này trong `deploy-web.yml`, vì workflow đó chưa có địa chỉ API (`NEXT_PUBLIC_API_BASE_URL` trống,
  code facts M8 site §0): đặt cả hai lúc Deploy (`deploy-checklist.md`).
- Đổi giá trong admin thì phải deploy lại web để trang chủ đổi theo. Ghi vào `deploy-checklist.md`. Trang Gói học và lúc thanh toán vẫn đọc giá
  thật từ API như hiện nay.

| Khi | Thì |
|---|---|
| Admin đổi giá 1 tháng từ 79.000 ₫ thành 89.000 ₫, chưa deploy lại | Trang chủ còn ghi 79.000 ₫; trang Gói học và thanh toán ghi 89.000 ₫ |
| Deploy thật mà API không trả lời | Build fail, bản đang chạy giữ nguyên |
| PR chạy CI không có API | Build dùng giá dự phòng, có cảnh báo; test pin giá dự phòng khớp `settings.definitions.ts` |

### 10.7 Hỏi đáp trang chủ do admin quản lý (QM8-6, chủ dự án 11/11/2026)

- **Module mới `faq`** (`apps/api/src/faq`, `prisma/models/faq.prisma`), chép cấu trúc của Legal. Không gộp vào Legal, vì số phiên bản của
  Legal là phiên bản điều khoản người học phải đồng ý lại (code facts M8 FAQ §2).
- **Bảng `landing_faq_items`:** thứ tự (số), câu hỏi, câu trả lời (chữ thường, có xuống dòng), đã đăng hay chưa, `row_version`, người tạo, người
  sửa, thời gian. Chỉ tiếng Việt, vì trang chủ tiếng Anh chưa phục vụ (L4).
- **Đọc công khai:** `GET /v1/public/faq` (`@Public()`, luật giới hạn riêng `public.faq.ip` 60 lần mỗi phút) trả
  `{ items: [{ question, answer }] }`, chỉ câu đã đăng, theo thứ tự rồi theo thời gian tạo.
- **Admin** (`settings.manage`): danh sách, thêm, sửa có kiểm `expected_version` (lệch thì 409 `faq-version-conflict`), xóa. Màn admin
  "Hỏi đáp trang chủ" ghi rõ trang chủ chỉ đổi sau lần deploy web tiếp theo.
- **Câu ban đầu:** migration nạp 6 câu, câu trả lời do Claude viết nháp và đã kiểm với code. Chủ dự án kiểm lại trong admin.
- **Web đọc lúc build**, cùng lượt với giá (§10.6). Danh sách rỗng thì trang chủ không có phần Hỏi đáp.

| Khi | Thì |
|---|---|
| Admin thêm câu, chưa tick "Đăng" | `GET /v1/public/faq` không có câu đó; trang chủ không đổi |
| Admin đăng câu, chưa deploy lại web | Trang chủ vẫn hiện danh sách lúc build trước |
| Hai admin cùng sửa một câu | Người lưu sau nhận 409 `faq-version-conflict`, tải lại rồi sửa |
| Build không gọi được API | Dùng 6 câu dự phòng trong code (cùng nội dung câu ban đầu), có cảnh báo; `LANDING_DATA_REQUIRED=1` thì build fail |

## 11. SEO và metadata (M8)

**Đã có, giữ:** `buildMetadata` (`lib/metadata.ts`: canonical, hreflang chỉ cho ngôn ngữ có landing, OG, Twitter, robots theo
`NEXT_PUBLIC_INDEXABLE`); `JsonLd` (WebSite, SoftwareApplication); ảnh OG theo ngôn ngữ (`app/[locale]/opengraph-image.tsx`); `robots.ts` chặn
`/*/app`; `/app` có `robots: noindex` (`app/[locale]/app/layout.app.tsx:9`). Điều khoản và Nguồn dữ liệu đang tự đặt `robots: noindex`
(`terms/page.tsx:18`, `sources/page.tsx:16`); Chính sách theo `NEXT_PUBLIC_INDEXABLE`.

**Thêm:**

| Việc | Chi tiết |
|---|---|
| Metadata từng trang công khai | Chính sách, Điều khoản, Nguồn dữ liệu có title, description, canonical, OG `url` riêng. Hiện Chính sách chỉ có description khi chưa đăng bản nào (`privacy/page.tsx:21`); Điều khoản, Nguồn dữ liệu không có description |
| hreflang trang pháp lý | `/en/privacy`, `/en/terms`, `/en/sources` vẫn được phục vụ (chỉ trang chủ `/en` chuyển hướng, `lib/landing-locale.ts:7–11`). `alternates` của trang đè hết `alternates` của layout, nên mỗi trang tự khai canonical và hreflang `vi`, `en` của chính nó |
| Ảnh OG từng trang | `opengraph-image.tsx` trong thư mục `privacy/`, `terms/`, `sources/`, dựng bằng font mới |
| Favicon, icon app, ảnh OG theo nhận diện mới (QM8-7) | Figma chưa có khung: Claude vẽ khung "Favicon" và "Ảnh chia sẻ 1200 × 630" ở trang `0:1`, chủ dự án duyệt, rồi `icon.svg`, `apple-icon.tsx`, `opengraph-image.tsx` làm theo. Bỏ dấu "_ _" vàng và nền navy cũ |
| Sitemap | Chỉ liệt kê trang được index (đưa trang `noindex` vào sitemap là tự mâu thuẫn). Lúc launch thêm `privacy`; `terms`, `sources` chỉ vào khi bỏ `noindex` của chúng (việc của launch, ghi ở `deploy-checklist.md`). `lastModified` lấy từ ngày hiệu lực văn bản. Một test ghim danh sách sitemap theo `NEXT_PUBLIC_INDEXABLE` (mẫu ở `lib/landing-locale.test.ts`) |
| JSON-LD | `SoftwareApplication.offers` đang ghi `price: '0'`, `priceCurrency: 'USD'` (`components/seo/JsonLd.tsx`, chuyển sang `site/seo/`): đổi sang `VND`; giá các kỳ Pro lấy cùng số đọc lúc build như bảng giá (§10.6); thêm `Organization` (tên, url, logo). Rich result SoftwareApplication của Google bắt buộc có `aggregateRating` hoặc `review`, Wordmet không có và không bịa: mục tiêu là markup hợp lệ (Schema Markup Validator), không phải rich result |
| Trang đăng nhập, đăng ký | Vẫn `noindex`, có title và description để link chia sẻ hiện đúng |
| Màu trình duyệt | `viewport.themeColor` và `manifest.ts:9–10` theo màu nền (`#f6f7fa` sáng, `#0f1220` tối), vì thanh trên mới là kính sáng trên nền, không phải dải navy |

| Khi | Thì |
|---|---|
| `NEXT_PUBLIC_INDEXABLE` chưa bật | robots chặn hết như hiện nay; sitemap vẫn sinh nhưng chỉ có trang chủ |
| `/en` chưa có bản dịch landing (L4) | hreflang trang chủ chỉ `vi` và `x-default`; `/en` vẫn chuyển sang `/vi`. Trang pháp lý có cả `vi`, `en` |
| API văn bản pháp lý không trả lời khi Google đọc trang | Trang hiện thông báo bản nháp (như GM11); description của trang là câu bản nháp |

## 12. Câu chữ

- Chữ theo khung Figma, ghi vào `messages/vi.json`. Mọi khóa đổi trong `vi.json` thì đổi cả `en.json` theo nghĩa tương ứng.
- Khóa không còn màn nào dùng thì xóa ở cùng PR.
- Trang công khai: theo luật chữ của chủ dự án (không kể VietQR, payOS, ngăn ôn, hạn mức AI); landing tiếng Anh vẫn chưa dịch (L4).

## 13. Kiểm thử

| Loại | Lệnh | Gồm |
|---|---|---|
| Unit, component (web) | `pnpm test` trong `apps/web` | Test hành vi mỗi component `ui/` và mỗi màn, theo role và chữ; chữ đổi theo Figma thì test sửa theo cùng PR |
| Unit (API) | `pnpm test` trong `apps/api` | Hàm gộp lịch (§10.3), controller hai endpoint, service Practice export |
| Hàm thuần mới | trong bộ unit | `groupColorIndex` (§7.4); đọc tham số `?lich=`, `?ngay=` (§5.6) |
| Lint, typecheck, build | `pnpm lint`, `pnpm typecheck`; bản build production là `cf:build` chạy trong `pnpm test:e2e` (job `web` của CI không có bước `pnpm build` riêng) | Có luật phụ thuộc §6 và test lint |
| Render mode | `pnpm assert:render-mode` (đang chạy trong CI, `ci.yml:108`) | Trang chủ vẫn dựng sẵn |
| Admin | `pnpm lint`, `typecheck`, `test`, `build` trong `apps/admin` | Đợt này sửa `packages/design-tokens`; admin không được đổi |
| e2e web | `pnpm test:e2e` (Playwright, `apps/web/e2e`; chạy `cf:build` của OpenNext, trên Windows qua `pnpm cf:docker`) | Sửa journey trong cùng PR với màn; thêm journey mở lịch và xem một ngày ở M6 |
| Smoke API mới | `pnpm smoke:giao-dien-moi` trong `apps/api` (mới; API và worker thật, DB và `JOB_QUEUE_PREFIX` riêng; giữ giới hạn 5 lần đăng ký mỗi IP mỗi giờ) | Tạo learner, học 2 từ, ôn 1 từ, luyện 1 phiên; kiểm số trong tháng và ngày, `next_lemma`, `last_reviewed`, `sessions/last`, `streak`, giá công khai khớp tuyệt đối (chỉ kiểm được ngày hôm nay, §10.3) |
| Ảnh so với Figma | `pnpm shots` (cần tài khoản học thật, `SHOTS_EMAIL`/`SHOTS_PASSWORD`) | Bộ khóa mới `gm-m1` … `gm-m9` thay `m1`…`m5b` của đợt cũ; `gm-m9` chụp mọi màn ở 390, 768, 1024, 1440, sáng và tối (QM9-5); ảnh ghi vào delivery record |
| Truy cập | `e2e/a11y.spec.ts` (trang công khai), `e2e/support/axe.ts` trong từng journey app | Mỗi journey mới gọi axe trên màn của nó |
| Khóa chữ không dùng | `apps/web/scripts/check-message-keys.mjs`, chạy trong bộ unit (CI) qua `check-message-keys.test.ts` (M9a) | Khóa `messages/vi.json` không còn được gọi trong `src/`; khóa dùng động ghi vào danh sách cho phép; LP3 vẫn kiểm hai file cùng khóa |
| Lighthouse, Schema Markup Validator | `pnpm lighthouse` (lệnh tay, M9a); JSON-LD kiểm hình dạng trong `site/seo/JsonLd.test.tsx`, Schema Markup Validator chạy tay một lần | Ghi điểm SEO, Performance (máy tính, điện thoại) của trang chủ và một trang pháp lý; JSON-LD hợp lệ |
| Dung lượng JS | `apps/web/scripts/compare-bundle-stats.mjs` so với `bundle-baseline.json` (§5.7; bước riêng trong job `web` của CI, M9a) | Không route `/vi/app/**` nào nặng hơn bản cũ quá 10% |
| Khung hình | DevTools Performance, CPU chậm 4–6× (§8.1, §8.5); điện thoại thật mở web qua chung Wi-Fi (QM9-6) | Học, Nhóm trên Android tầm thấp và Safari iOS |

Hành vi mới (API lịch, màu nhóm, tham số URL, chuyển hướng trang lịch sử, ô nhập lại mật khẩu) viết test trước, chạy thấy đỏ rồi mới code.

## 14. Xong khi

**Mỗi đợt:** CI xanh trên PR vào `refactor/giao-dien-moi`; ảnh mọi khung của đợt đặt cạnh khung Figma trong delivery record
`docs/deliveries/giao-dien-moi.md`; chỗ lệch đã ghi rulings.

**Cả đợt:**
- Mọi khung ở §9 có màn tương ứng; `/app/recall` có màn theo mockup đã duyệt.
- Bản chốt M9 đã duyệt (QM9-2, QM9-3; 12/11/2026) và phần tối đã sửa theo; đợt polish đã làm xong các chỗ còn lại của bản chốt.
- `app-ui/`, `components/`, `HistoryPage.tsx`, token cũ không dùng đã xóa; tag `archive/giao-dien-cu-2026-11` có trên GitHub; `giao-dien-cu-map.md` đủ màn.
- `pnpm test`, lint, typecheck, build của web, API và admin xanh; `assert:render-mode` qua; e2e web qua; `smoke:giao-dien-moi` qua trên DB mới;
  so dung lượng JS qua; điểm Lighthouse, kết quả Schema Markup Validator và số khung hình trên điện thoại đã ghi.
- QR1–QR3, QR5 đã chốt và design đã sửa theo; QR4 gác lại (giữ DB38), trừ khi chủ dự án chốt trước PR cuối.
- PR `refactor/giao-dien-moi` → `dev` CI xanh.

## 15. Rủi ro và chỗ chưa kiểm

- **Nhánh dài lệch `dev`:** trong lúc làm, `dev` còn nhận việc khác (ví dụ `practice-ai-count`: design và plan có trong cây làm việc, chưa vào
  `dev`). Merge `dev` vào nhánh mỗi tuần.
- **Test e2e đổi nhiều:** các journey dựa vào chữ hiển thị; chữ đổi theo Figma thì phải sửa nhiều test. Sửa trong cùng PR với màn.
- **Ba font** nặng hơn một font Lexend: đo dung lượng JS và font (§5.7, §5.8) và Lighthouse; trang công khai chỉ tải sớm Noto Sans và Bricolage.
- **Chế độ tối** chưa ai nhìn cho tới khi có mockup ở M1.
- **Khoảng 768–1279 px** chưa có khung Figma; kiểm ở 768 và 1024, chỗ nào xấu thì ghi rulings.
- **`/app/recall`** chưa có khung.
- **Turnstile "chỉ hiện khi cần"** còn chờ chủ dự án.
- **Lịch học:** định nghĩa các số đã viết ở §10.2; bước code facts của plan kiểm chúng khớp mọi chỗ ghi `learning_log`. Truy vấn SQL chỉ được smoke
  kiểm ngày hôm nay.
- **Quảng cáo:** theo DB38, người Miễn phí có quảng cáo bị tải lại trang khi rời Nhóm, Tra từ (QR4, gác lại 10/11/2026).
- **11 hộp thoại chưa có khung Figma** (§9 M3–M7): dựng theo `Dialog` chung và hộp gần nhất; chủ dự án xem qua ảnh trong delivery record.
- **Gói Miễn phí và câu AI:** một khung Figma (`131:4522`) vẽ AI khóa ở Miễn phí, lệch API hiện có; làm theo API.
- **Ảnh OG:** thêm TTF Noto Sans có tiếng Việt làm Worker lớn hơn; đo ở M8.
- **Trang chủ không có nút dừng chuyển động** (QM8-3′, chủ dự án chọn): dải từ, vệt sáng, quầng sáng chạy liên tục, chưa đạt WCAG 2.2.2 (mức A). Người
  bật giảm chuyển động trong máy vẫn thấy trang đứng yên.
- **Hỏi đáp và giá trên trang chủ chỉ đổi sau khi deploy lại web** (QR3, QM8-6): admin đăng xong, trang chủ vẫn hiện bản cũ tới lần deploy sau.
- **Văn bản pháp lý trùng phần đầu** cho tới khi chủ dự án sửa trong admin (QM8-4): trước đó trang có hai tiêu đề và hai mục lục.
- **Không còn link Gói học và Hỏi đáp ở chân trang** (theo Figma): người ở trang pháp lý về bảng giá qua link "Giá" ở thanh trên.
- **Font nhãn:** JetBrains Mono không tải sớm, nên nhãn nhỏ có thể đổi font sau lần vẽ đầu.
- **Hook hỏi mỗi lần merge** PR vào nhánh dài: thêm một bước bấm cho chủ dự án ở mỗi đợt.
