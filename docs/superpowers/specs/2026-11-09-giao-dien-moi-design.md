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
| App người học | khoảng 80 khung và 7 overlay | `/{locale}/app/(member)/*` |

- **Thêm:** API lịch học (tổng theo tháng, chi tiết một ngày) cho hai hộp Lịch và Ngày (§10).
- **Bỏ:** trang Lịch sử luyện tập (`/app/practice/history`), thay bằng hai hộp Lịch và Ngày; đường dẫn cũ chuyển hướng (§10.4).
- **Không đổi:** admin (`apps/admin` giữ hướng B và bộ token cũ), API ngoài phần lịch học, cách đăng nhập, cách thanh toán, cờ
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
| GM9 | Khung app | Thanh trên, tab dưới, nút lịch nằm trong layout theo nhóm route `(tabs)`, `(sub)`, `(onboarding)`, `(focus)` | Claude đề xuất, chủ dự án duyệt |
| GM10 | Component | Một bộ `src/ui/` cho cả web; phần trang công khai ở `src/site/` | Claude đề xuất, chủ dự án duyệt |
| GM11 | Chính sách, Điều khoản | Giữ cách đọc văn bản mỗi lần mở, không lưu đệm | Chủ dự án |
| GM12 | SEO | Các bổ sung ở §11 | Claude đề xuất, chủ dự án duyệt |
| GM13 | Bóng nút | Giữ bóng navy cho nút chính, bóng cùng màu cho nút xanh, đỏ; nút tắt không bóng | Chủ dự án (09/11/2026) |

**Đề xuất chưa chốt, chờ chủ dự án duyệt cùng bản viết này** (mỗi mục có lý do ở chỗ được nhắc):

| # | Đề xuất | Ở đâu |
|---|---|---|
| GM14 | Chỗ motion lệch giữa giao diện mới và code: lấy số của giao diện mới | §8.3 |
| GM15 | Mọi hộp thoại và tấm trượt dùng chung chuyển động của hộp Lịch | §8.2 |
| GM16 | Hộp Lịch và Ngày mở theo tham số trên URL (`?lich=`, `?ngay=`) | §5.6 |
| GM17 | Màn Ôn kiểu nhớ lại (`/app/recall`) chưa có khung Figma: vẽ mockup trước đợt M5 | §9, M5 |
| GM18 | Quy tắc "ba độ đậm 400/600/700" trong `ui-best-practices.md` sửa theo Figma (tiêu đề Bricolage 800) | §3.3 |

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
  thường cho nhãn nhỏ của app ("noun · A2", "câu 7 / 20"). Chữ đọc 16 px trở lên, line-height 160–170%.
- **Màu:** navy `#1e3a8a` chỉ cho nút chính, link và một điểm nhấn mỗi màn; vàng `#ffd84a` chỉ để tô từ đích. Link khác chữ thường bằng độ
  đậm hoặc mũi tên, không chỉ bằng màu (navy so với ink chỉ 1,47:1). Đúng / Sai luôn kèm icon và chữ.
- **Hành động phụ:** component "Nút chữ" (Thêm, Thường, Phụ, Xóa), không gạch chân; gạch chân chỉ cho liên kết giữa câu.
- **Truy cập:** viền focus 3 px màu nhấn; vùng chạm điện thoại ≥ 44 px; mọi màn dùng được bằng phím. Phím tắt theo Figma và trang mẫu:
  `N` Thêm từ, `/` tìm, Space lật thẻ, Enter, Esc (đã có trong code); `L` mở lịch, `F` chọn nhóm (mới).
- **Nền:** lưới chấm 20 px mờ dần ra mép, quầng navy góc trái trên và vàng góc phải dưới, trên mọi màn app (vòng 8–9).
- **Câu chữ:** theo `~/.claude/rules/vietnamese-writing.md`; không kể chi tiết hệ thống người học không cần (VietQR, payOS, ngăn ôn, hạn mức AI)
  trên trang công khai.

## 4. Git và cất code cũ

1. `git fetch`; tag `archive/giao-dien-cu-2026-11` tại `origin/dev` (commit có giao diện cũ cuối cùng); `git push origin archive/giao-dien-cu-2026-11`.
2. Nhánh `refactor/giao-dien-moi` từ cùng commit. Hook git chỉ nhận tên `<type>/<slug>` (`~/.claude/hooks/enforce-git-conventions.py:58`).
3. File `docs/deliveries/giao-dien-cu-map.md` (tạo ở bước này): mỗi màn cũ nằm ở file nào trong tag, và cách lấy lại:
   `git show archive/giao-dien-cu-2026-11:apps/web/src/features/learner/today/TodayPage.tsx` (xem) hoặc
   `git checkout archive/giao-dien-cu-2026-11 -- <path>` (lấy về).
4. Mỗi đợt: nhánh con từ `refactor/giao-dien-moi` (`feat/giao-dien-moi-m1`…), PR vào `refactor/giao-dien-moi`. CI chạy trên mọi PR
   (`.github/workflows/ci.yml:5–6`, `on: pull_request` không lọc nhánh đích). Hook hỏi chủ dự án mỗi lần merge vì nhánh đích không phải `dev`.
5. Merge `dev` vào `refactor/giao-dien-moi` mỗi tuần và trước PR cuối, để PR cuối không xung đột lớn.
6. Xong M9: một PR `refactor/giao-dien-moi` → `dev`, mở qua skill `ship-pr`.

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
| Trang chủ, Nguồn dữ liệu, 404 | Dựng sẵn lúc build; Server Components; JS chỉ cho phần tương tác (`Reveal`, hỏi đáp, cửa sổ app minh họa) | Như hiện nay (`(site)/page.tsx`) |
| Chính sách, Điều khoản | Server render mỗi lần mở, đọc `GET /v1/legal/current` (đợi tối đa 2,5 giây; lỗi thì hiện bản nháp) | Giữ như hiện nay (GM11, `lib/legal.ts`) |
| Đăng nhập và tài khoản | Khung, tiêu đề, chữ render ở server; form là client component | Không index |
| App `/app` | Layout render theo request (`connection()` trong `app/layout.app.tsx`, để mỗi trang có nonce CSP riêng); nội dung là client component, dữ liệu qua React Query | Không index |

### 5.3 Không dùng Server Actions

Tài liệu Next 16.4 (Data Security guide, `use-server`): Server Action gọi được bằng POST trực tiếp, phải tự xác thực người dùng bên trong,
đọc phiên từ cookie hoặc header của server. Server Next không có phiên (§5.1), nên Server Action không biết người gọi là ai. Muốn dùng phải đổi
sang mô hình BFF: cookie phiên nằm ở `wordmet.com`, Next chuyển mọi lệnh gọi sang API. Việc đó đổi API và bảo mật; không làm trong đợt này.
Trang công khai không có form (danh sách chờ đã bỏ ngày 03/11/2026), nên cũng không cần.

### 5.4 Khung app nằm trong layout

Hiện nay 14 màn tự vẽ `<AppShell>` (`app-chrome/AppShell.tsx`), nên mỗi lần chuyển trang khung vẽ lại và mất trạng thái. Đổi thành:

```
app/[locale]/app/
├─ layout.app.tsx                 như hiện nay: nonce, theme script, AppIntl, AppProviders
├─ (auth)/layout.app.tsx          khung đăng nhập (panel navy ở đăng nhập, đăng ký; card giữa ở các trang khác)
└─ (member)/layout.app.tsx        RequireSession, AddWordProvider, hộp Lịch/Ngày, HouseAd, AdsenseLoader
   ├─ (tabs)/layout.app.tsx       thanh trên, tab dưới (điện thoại), nút lịch nổi, nút + nổi
   │   ├─ page.app.tsx            Hôm nay
   │   ├─ groups/  lookup/  practice/
   ├─ (sub)/layout.app.tsx        thanh trên, nút quay lại ở điện thoại, nút lịch nổi
   │   ├─ group/  group/backlog/  topic/  word/  practice/weak/  practice/history/ (chỉ chuyển hướng, §10.4)
   │   ├─ settings/  settings/account/  settings/delete-account/  settings/transactions/
   │   └─ plans/  plans/order/
   ├─ (onboarding)/layout.app.tsx khung card giữa như trang đăng nhập (khung Figma "Bổ sung hồ sơ", "Chào mừng"), cần phiên
   │   └─ complete-profile/  welcome/
   └─ (focus)/layout.app.tsx      không khung; nút lịch nằm trên thanh của phiên (điện thoại)
       └─ practice/session/  review/  recall/
```

- Thư mục có ngoặc không vào đường dẫn: `/vi/app/word` giữ nguyên. Một đoạn như `practice/` có thể nằm ở nhiều nhóm (`(tabs)/practice` cho
  `/app/practice`, `(focus)/practice/session` cho `/app/practice/session`) vì đường dẫn cuối khác nhau; plan kiểm bằng `next build`.
- Đuôi `page.app.tsx`, `layout.app.tsx` giữ theo D21 (`next.config.ts`, `pageExtensions`).
- Màn có cột phụ (từ 1280 px) khai báo cột phụ trong chính màn đó, không qua layout.
- `AddWordProvider` lên `(member)/layout` để hộp Thêm từ mở được từ mọi màn có thanh trên.

| Khi | Thì |
|---|---|
| Lan chuyển từ Hôm nay sang Nhóm | Thanh trên đứng yên, chữ đang gõ ở ô tìm còn nguyên, chỉ phần giữa đổi |
| Lan mở `/vi/app/practice/session` | Không có thanh trên, không có tab dưới; nút lịch nằm trên thanh của phiên ở điện thoại, nổi góc phải dưới ở máy tính |
| Phiên đăng nhập hết hạn khi đang ở `(sub)` | `RequireSession` chuyển về đăng nhập như hiện nay (E1–E11 của design giao diện người học) |

### 5.5 Đang tải và lỗi

- Mỗi nhóm route có `loading.app.tsx`: khung xương theo bố cục khung Figma của màn đầu nhóm, hiện ngay khi bấm chuyển trang.
- Mỗi nhóm route có `error.app.tsx`: chữ "chuyện gì xảy ra + việc cần làm", nút "Thử lại" gọi `reset()`. Lỗi chỉ thay phần giữa, khung còn.
- Lỗi dữ liệu trong màn (API trả Problem Details) giữ cách hiện nay (`app-shell/api/use-error-message.ts`).

### 5.6 Hộp thoại và tham số URL

- Hộp Lịch mở bằng `?lich=2026-11`, hộp Ngày bằng `?ngay=2026-11-08` trên đường dẫn đang đứng (GM16). Lý do: nút Quay lại của trình duyệt đóng hộp;
  link "Mở lịch học" ở Hôm nay và đường dẫn cũ `/app/practice/history` mở thẳng hộp.
- Các hộp khác (Thêm từ, Thêm câu, Thêm cả loạt, Chọn nhóm, Tùy chỉnh phiên, Giới thiệu Pro, Chi tiết giao dịch) giữ trạng thái trong React như hiện nay.

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
- Đo trước và sau: cột "First Load JS" của `next build` cho mọi route `/app`. Không route nào nặng hơn bản cũ quá 10%; quá thì ghi lý do vào rulings.

### 5.8 Font và chữ dịch

- `next/font/google` cho ba font, đều có bộ `vietnamese` (đã kiểm `font-data.json` của Next 16.4.3): `Noto_Sans` (biến thiên `wght`),
  `Bricolage_Grotesque` (biến thiên `opsz`, `wdth`, `wght`), `JetBrains_Mono` (`preload: false`). Biến CSS `--font-sans`, `--font-display`, `--font-mono`.
  Thay `Lexend` ở `app/[locale]/layout.tsx:12`.
- Ảnh OG đang nhúng font Lexend (`og-fonts.generated.ts`): sinh lại bằng `pnpm gen:og-fonts` với Noto Sans và Bricolage.
- Chữ dịch giữ cách hiện nay: trang công khai không gửi chữ xuống trình duyệt (`messages={null}` ở root); app chỉ gửi namespace `App`
  (`app-shell/AppIntl.tsx`).

## 6. Cấu trúc thư mục `apps/web/src`

```
app/                    chỉ khai báo route: page/layout mỏng, metadata, loading, error, sitemap, robots, manifest, ảnh OG
ui/                     một bộ component cho cả web (thay app-ui/ và components/ui/), §7.5
styles/                 fonts.ts, nền lưới chấm, keyframe motion, test token
site/                   phần riêng của trang công khai: landing/, legal/, seo/, layout/ (thay components/*)
app-chrome/             viết lại: TopBar, MobileTabBar, AvatarMenu, CalendarButton, PageHeader
app-shell/              giữ nguyên: gọi API, phiên đăng nhập, React Query, cấu hình, theme
features/learner/<khu>/ mỗi khu: <Khu>Page.tsx, các phần con, queries.ts, test
i18n/  lib/             giữ
```

Luật phụ thuộc, giữ bằng `no-restricted-imports` trong `eslint.config.mjs`:

| Thư mục | Được import | Không được import |
|---|---|---|
| `ui/` | `lib/`, `styles/` | `features/`, `app-shell/`, `site/`, `app-chrome/` |
| `site/` | `ui/`, `lib/`, `i18n/` | `features/`, `app-shell/`, `app-chrome/` |
| `app-chrome/` | `ui/`, `app-shell/`, `lib/` | `site/` |
| `features/learner/*` | `ui/`, `app-shell/`, `app-chrome/`, `lib/` | `site/` |

`app-ui/`, `components/` xóa khi không còn file nào dùng (cuối M8); bản cũ nằm trong tag.

## 7. Token, theme, font, màu nhóm

### 7.1 Chỗ đặt token

- Thêm `packages/design-tokens/web.css` (Light) và `web-dark.css` (Dark). `apps/web/src/app/globals.css` import hai file này thay cho
  `theme.css`, `dark.css`, `island.css`. Admin giữ `theme.css` (`apps/admin/src/styles/globals.css:2`).
- Màu chỉ khai báo trong package, như luật hiện nay (README của package; `apps/web/src/styles/tokens.test.ts` kiểm tương phản LP12 và việc app
  không tự khai báo màu UBC1). Hai test này đổi sang đọc `web.css`, `web-dark.css`.
- `dark.css`, `island.css`, `dark-pastel.css` không còn ai dùng sau M8 thì xóa ở M9; README của package cập nhật.

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

Bộ "Wordmet số đo" (19 biến, một chế độ): bo góc `md` 10, `lg` 14, `xl` 20, `2xl` 28, `pill` 999, `button` 10, `modal` 16, cùng các biến còn lại
đọc lúc làm M1 bằng `get_variable_defs`.

Bóng (Light; bản Dark theo mockup tối, GM4):

| Token | Giá trị |
|---|---|
| `--shadow-card` | `0 1px 2px rgb(27 36 68 / .06), 0 10px 28px -14px rgb(27 36 68 / .20)` |
| `--shadow-row` | `0 1px 2px rgb(27 36 68 / .06), 0 4px 12px -8px rgb(27 36 68 / .16)` |
| `--shadow-pop` | `0 2px 6px rgb(27 36 68 / .08), 0 24px 56px -24px rgb(27 36 68 / .34)` |
| `--shadow-btn` (nút chính) | `0 6px 14px -8px rgb(30 58 138 / .55)` |
| nút xanh / đỏ | `0 6px 14px -8px rgb(27 122 70 / .6)` / `0 6px 14px -8px rgb(184 53 42 / .6)` |
| nút phụ | `inset 0 0 0 1.5px var(--line), 0 4px 10px -8px rgb(30 58 138 / .45)` |

Các giá trị bóng lấy từ trang mẫu vòng 15 sau lượt unslop và lượt trả bóng nút (`vong-15-polish-9-trang.html`), khớp style Shadow/Card, Row, Pop
trong Figma.

### 7.3 Màu ngăn

Sáu ngăn (Mới, 1, 3, 7, 14, 30 ngày) mỗi ngăn một màu hạng (xám, đồng, bạc, vàng, lục bảo, ánh kim), lấy từ component "Chip ngăn" (`54:656`)
ở trang Hệ thống. Màu ngăn chỉ để mã hóa ngăn, không thay màu nhấn (`app-redesign-plan.md`, "Ý tưởng chung").

### 7.4 Màu nhóm (GM5)

Hiện nay màu tính theo vị trí nhóm trong danh sách (`features/learner/groups/GroupCard.tsx:27`, xoay vòng 4 nền). Thiết kế mới dùng màu làm dấu
nhận ra nhóm ở băng chuyền, bảng chọn nhóm, Hôm nay; thứ tự nhóm đổi theo số thẻ đến hạn, nên tính theo vị trí thì màu đổi giữa các lần mở.

- **Bảng màu** (viền nhóm đọc trong các khung Nhóm, Hôm nay, Chọn nhóm, 09/11/2026), theo thứ tự chỉ số 0–6: `#e5603f` cam, `#149384` lục lam,
  `#7a55d3` tím, `#d99a17` hổ phách, `#4a9637` lục, `#d2427a` hồng, `#2a86d1` lam. Nhóm chưa có từ nào dùng `#64708c` (khung "nhóm trống").
  Các màu nhạt hơn trong Figma là thẻ phía sau của chồng (tô nhạt từ màu nhóm), không phải màu riêng.
- **Hàm:** `groupColorIndex(id) = fnv1a32(id.toLowerCase()) mod 7`, hàm thuần trong `lib/`, không phụ thuộc React.
- Bản Dark của bảy màu chốt cùng mockup tối (GM4).

| Khi | Thì |
|---|---|
| Lan mở Nhóm hôm nay rồi ngày mai, thứ tự nhóm đã đổi | Mỗi nhóm giữ đúng màu cũ |
| Lan đăng nhập trên máy khác | Cùng màu, vì chỉ phụ thuộc ID |
| Hai nhóm ra cùng chỉ số | Hai nhóm cùng màu; chấp nhận được với 7 màu; tên nhóm vẫn khác |
| "Du lịch Nhật" chưa có từ | Viền `#64708c`; thêm từ đầu tiên thì về màu theo ID |
| ID viết hoa và viết thường | Cùng màu (hàm hạ chữ trước khi băm) |
| Màu nhóm dùng cho chữ (số thẻ chờ "24") | Chữ lớn ≥ 24 px; kiểm tương phản ≥ 3:1 trên nền trắng ở M3; màu nào không đạt thì dùng bản đậm hơn của màu đó cho chữ |

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
| Chip ngăn `54:656` | `StageChip`; thêm `StageBar` (thanh sáu ngăn) | |
| Chip từ `96:322` | `WordChip` | |
| Nút loa `54:657` | `SpeakButton` | Dùng lại logic `app-ui/speech.ts`, `audio-player.ts` |
| Ô ngày lịch `96:404` | phần của hộp Lịch | |
| Nền app/Lưới chấm `95:315`, `95:321` | `DotGridBackground` | CSS, không ảnh |
| Nút lịch nổi `95:343`, Nút lịch trong thanh `95:344` | `CalendarButton` (`app-chrome/`) | Phím `L` |
| Thanh trên app (Desktop theo tab, Mobile) `54:502`, `54:503` | `TopBar` (`app-chrome/`) | Kính mờ: `backdrop-filter: blur(24px) saturate(1.6)` |
| Thanh tab dưới `54:637` | `MobileTabBar` (`app-chrome/`) | |
| Menu ảnh đại diện `181:316` | `AvatarMenu` (`app-chrome/`) | |
| Logo `3:14`, Thanh trên/Chân trang `5:2`, `9:93`, `7:209`, `9:100` | `site/layout/*` | Trang công khai |
| (không có component) | `Dialog`, `Sheet`, `Toast`, `Card`, `Tag`, `ProgressBar` + số đúng/sai, `Skeleton` | Dựng theo khung và §3.3 |

Mỗi component có test hành vi (theo role và chữ hiển thị) ở `ui/*.test.tsx`.

## 8. Motion

### 8.1 Nguồn và token

Mọi số ở [`motion-va-chuyen-canh.md`](../../mockups/2026-11-05-redesign-concepts/motion-va-chuyen-canh.md) §1–§6, §8. Token thêm vào
`web.css`: đường cong chính `--ease-out-strong` `cubic-bezier(0.23, 1, 0.32, 1)` (đã có tên này trong `globals.css`), lò xo `--ease-spring`,
mức mờ `--blur-sm` 6px, `--blur-md` 12px, `--blur-lg` 18px, thời lượng ra 150–170ms và vào 300–340ms. Component dùng token, không viết số rời.

### 8.2 Theo màn

| Màn | Chuyển động | Mục trong tài liệu motion |
|---|---|---|
| Ôn (flashcard) | Chồng thẻ tan mờ: lật 300ms, kéo, ngưỡng 110px hoặc 0,55 px/ms, thẻ tan, thẻ mới từ mờ thành nét, chip vào đống, số đếm nảy, màn xong phiên | §2 |
| Nhóm | Băng chuyền "Trượt mờ" quay vòng, đổi nhóm 620ms, mở và đóng nhóm (FLIP 380ms), bảng chọn nhóm (phím F) | §3 |
| Tra từ | "Từ hóa thẻ": thẻ cũ tan, thẻ mới tới, toast "Đã thêm…" 2,4 giây | §4 |
| Lịch, Ngày | Nút lịch nổi, lớp mờ 200ms, hộp 240ms, tấm trượt từ 60px, sang Ngày trượt ±22px 220ms | §5 |
| Mọi hộp thoại và tấm trượt (GM15) | Cùng chuyển động của hộp Lịch: lớp mờ 200ms, hộp 240ms đường cong chính, tấm trượt từ `translateY(60px)` kèm hiện dần | §5, §6 |
| Nút | Rê chuột `brightness(1.12)` 200ms; bấm `scale(.97)` 150ms | §6 |
| Đơn hàng | Chấm "đang chờ" nhấp nháy 1,4 giây cho tới khi đơn đổi trạng thái (ngoại lệ duy nhất của luật không lặp) | §6 |
| Trang chủ | `hero-in`, `hero-window-in`, `Reveal`, hỏi đáp 280ms như hiện nay | §7 (landing) |
| Trang chủ cảnh 3–6 trong Figma (đoạn văn đổi màu, vệt sáng viền phần cuối, 404 hiện từ mờ, viền Pro sáng chạy) | Chưa có số: chốt số ở M8 rồi ghi bổ sung vào tài liệu motion | §7 |
| Phiên luyện | Câu mới, đáp án đúng, chọn sai: dùng lại `card-rise`, `pop-in`, `wiggle-soft` hiện có cho tới khi tài liệu motion có số riêng | §7, §9 |

### 8.3 Chỗ lệch giữa giao diện mới và code (GM14: lấy số của giao diện mới)

| Chỗ | Lấy | Thay cho |
|---|---|---|
| Lật thẻ ôn | 300ms đường cong chính | 280ms `--ease-standard` |
| Sang thẻ mới ở Ôn | Thẻ cũ tan mờ, thẻ mới từ mờ thành nét | `card-rise` 200ms |
| Hộp thoại | 240ms đường cong chính, nhích 12px | `dialog-in` 250ms |
| Tấm trượt | Từ `translateY(60px)` kèm hiện dần | Từ `translateY(100%)` |
| Bấm nút | `scale(.97)` | Lún gờ 0,18rem (`pressed`, kiểu hướng B) |
| Màn tổng kết | Khối từ mờ thành nét 520ms, cách nhau 90ms | `summary-in` 250ms, 50ms |

### 8.4 Giảm chuyển động

Theo tài liệu motion §8: chỉ giữ đổi `opacity` và màu tối đa 200ms; thẻ ôn đổi mặt bằng `opacity`; băng chuyền đổi ngay; hộp và tấm trượt không
chạy hiệu ứng. Giữ hai cơ chế hiện có: quy tắc cuối `globals.css` (mọi thời lượng về 0.01ms) và `lib/use-reduced-motion.ts` (trả `true` lúc
render ở server). Kéo thẻ vẫn theo tay.

## 9. Các đợt và màn

Mỗi đợt một hoặc vài PR vào `refactor/giao-dien-moi`. ID là khung Figma (máy tính / điện thoại).

**M1 — Nền.** Token và font (§7, §5.8); `ui/` (§7.5); khung app trong layout (§5.4) với `loading`/`error` (§5.5); nền lưới chấm; luật phụ thuộc
(§6). Các màn cũ chạy tạm trong khung mới. Làm 5 mockup tối (Hôm nay, Nhóm băng chuyền, Phiên luyện lúc trả lời sai, hộp Thêm từ, Đăng nhập)
bằng HTML từ biến Dark của Figma, gửi chủ dự án duyệt (GM4); phần tối sửa ở M9.

**M2 — Đăng nhập và tài khoản** (trang `35:307`).

| Đường dẫn | Khung |
|---|---|
| `/app/login` | Đăng nhập `35:308` / `37:485` |
| `/app/register` | Đăng ký `35:405` / `37:533` (thêm ô "Nhập lại mật khẩu", chỉ kiểm ở giao diện; API không đổi) |
| `/app/verify-email` | Xác minh email `36:385` / `37:623` |
| `/app/forgot-password` | Quên mật khẩu `36:417` / `37:656` |
| `/app/reset-password` | Đặt mật khẩu mới `36:447` / `37:687` |
| `/app/google/complete` | Hoàn tất đăng ký Google `36:490` / `37:731` |
| `/app/account-deleted` | Đã xóa tài khoản `36:549` / `37:791` |
| `/app/complete-profile` | Bổ sung hồ sơ `36:564` / `37:807` |
| `/app/welcome` | Chào mừng: chọn ngôn ngữ `36:591` / `37:835` |

Ô Turnstile giữ như hiện nay (`use-turnstile.tsx`); câu "chỉ hiện khi cần" còn chờ chủ dự án (`app-redesign-plan.md`, cuối mục "Bỏ chữ gạch chân").

**M3 — Hôm nay và Nhóm.**

| Đường dẫn | Khung |
|---|---|
| `/app` | Hôm nay `117:4425` / `117:4712` |
| `/app/groups` | Nhóm băng chuyền `82:3213` / `82:3368`; mở chọn nhóm `84:3173` / `84:3399` |
| `/app/group` | Một nhóm `84:3552` / `84:3749` |
| `/app/group/backlog` | Từ tồn đọng `97:3085` / `97:3239` |
| `/app/topic` | Chủ đề `98:3127` / `98:3297` |

Màu nhóm theo §7.4. Link "Xem lịch sử" ở Hôm nay đã đổi thành "Mở lịch học" trong Figma; trước M6 link này mở trang lịch sử cũ.

**M4 — Tra từ, trang một từ, Thêm từ.**

| Đường dẫn / hộp | Khung |
|---|---|
| `/app/lookup` | Tra từ "Từ hóa thẻ" `85:3218` / `85:3667` |
| `/app/word` | Trang một từ `118:4413` / `118:4714` |
| Hộp Thêm từ | Overlay 1 `73:580` / `73:966` (nút lưu "Lưu", không "Lưu {word}": `messages/vi.json`, khóa `save`) |
| Hộp Thêm câu | Overlay 2 `73:1167` / `73:1465` |
| Hộp Thêm cả loạt | Overlay 3 `73:1701` / `73:1925` |
| Hộp Kết quả tra bằng AI | Overlay 4 `75:1071` / `75:1346` (mẫu 1C vòng 15) |
| Hộp Chọn nhóm | Overlay 5 `75:1548` / `75:1849` |

**M5 — Luyện tập và Ôn.**

| Đường dẫn / hộp | Khung |
|---|---|
| `/app/practice` | Luyện tập `99:3169` / `99:3391` |
| Hộp Tùy chỉnh phiên | Overlay 7 `131:3890` / `131:4232`; các trạng thái khác `131:4522`; điện thoại cuộn cuối `141:4320` |
| `/app/practice/session` | Vừa trả lời đúng `100:3164` / `100:3291`; gõ sai còn làm lại `178:5326` / `178:5442`; sai đã xem đáp án `178:5546` / `178:5657`; trắc nghiệm chọn sai `178:5755` / `178:5895`; tổng kết `119:4608` / `119:4701` |
| `/app/practice/weak` | Từ hay sai `119:4317` / `119:4482` |
| `/app/review` | Ôn: mặt trước `80:3228`, đã lật (điện thoại) `80:3321`, đang kéo sang Đã biết `80:3429`, xong phiên `80:3557` / `80:3601` |
| `/app/recall` | Chưa có khung (GM17): mockup HTML theo phong cách Phiên luyện, chủ dự án duyệt trước khi code |

Hộp Tùy chỉnh phiên làm luôn các việc đã ghi cho "đợt dựng hộp mới" ở `docs/deliveries/cloze-own-then-ai.md` §"Việc cho đợt dựng hộp mới":
gửi `cloze_source: 'own_then_ai'` khi bật cả câu đã lưu và câu AI; nhãn AI và nút báo lỗi theo `item.ai`; `againBody` gửi lại nguồn mới; đổi dòng
`ownReplacesAi`. Nếu design `2026-11-09-practice-ai-count` (số câu AI do người học chọn) đã có API trước M5 thì hộp theo API đó; nếu chưa,
hộp theo API hiện có và phần số câu AI làm khi API đó xong.

**M6 — Lịch học.** API §10; hộp Lịch `102:3278` / `102:3948`, hộp Ngày `103:3820` / `103:4248`; nút lịch nổi trên mọi màn app (trừ overlay);
bỏ trang Lịch sử luyện tập (§10.4); link "Mở lịch học" ở Hôm nay mở hộp Lịch.

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

**M8 — Trang công khai và SEO** (trang `0:1`): Trang chủ `5:13` / `9:108`; Chính sách bảo mật `14:172` / `17:260`; Điều khoản sử dụng `15:190` /
`17:355`; Nguồn dữ liệu `16:210` / `18:283`; 404 `16:317` / `18:358`. SEO §11. Chuyển phần còn lại của `components/` sang `site/`, xóa `app-ui/`
và `components/`.

**M9 — Chế độ tối và rà soát.** Sửa phần tối theo mockup đã duyệt; xóa token cũ không dùng (§7.1); chạy toàn bộ kiểm thử §13; chụp mọi màn so với
Figma; mở PR cuối vào `dev`.

## 10. API lịch học (M6)

### 10.1 Dữ liệu sẵn có

- `learning_log`: mỗi lượt học, ôn, thêm, bỏ một từ; có `kind`, `level_before`, `level_after`, `rating`, `origin`, `local_date` theo múi giờ của
  người học lúc ghi (`apps/api/prisma/models/learning.prisma:50–79`). Không có khóa ngoại tới từ: xóa từ vẫn giữ log (D33).
- `learning_activity_days`: một dòng mỗi người mỗi ngày có hoạt động, `studied` = có học thật (`learning.prisma:81–91`).
- `GET /v1/practice/history?date=YYYY-MM-DD` đã lọc phiên luyện theo ngày, có phân trang (`practice/history/history.controller.ts:8–33`).

### 10.2 Endpoint

Module Learning sở hữu cả hai (nó sở hữu hai bảng trên). Số phiên luyện mỗi ngày lấy qua service Practice export ra, không truy vấn bảng của
Practice (luật ranh giới module D3).

**`GET /v1/me/calendar?month=YYYY-MM`**

```json
{
  "month": "2026-11",
  "days": [{ "date": "2026-11-08", "learned": 10, "reviewed": 22, "practice_sessions": 1 }],
  "totals": { "study_days": 6, "learned": 41, "reviewed": 130, "practice_sessions": 5 }
}
```

- `days` chỉ có ngày có ít nhất một trong ba số lớn hơn 0, xếp tăng dần theo ngày.
- `learned`: số từ có lượt học đầu tiên trong ngày (từ ngăn Mới lên ngăn 1, DC4 của đợt C). `reviewed`: số lượt ôn còn lại trong ngày.
  Cột và điều kiện chính xác (`kind`, `level_before`, `origin`) chốt ở bước "code facts" của plan, kèm test cho từng loại dòng log.

**`GET /v1/me/calendar/days/YYYY-MM-DD?kind=all|learned|reviewed&page_size=&page_token=`**

```json
{
  "date": "2026-11-08",
  "counts": { "learned": 10, "reviewed": 22, "practice_questions": 18 },
  "items": [{ "kind": "reviewed", "item_id": "…", "lemma": "mitigate", "group_id": "…", "result": "known", "times": 2 }],
  "next_page_token": null
}
```

- Mỗi từ một dòng mỗi loại trong ngày; `result` là kết quả lần cuối (`known` / `again`), `times` là số lần.
- Câu luyện tập của ngày lấy từ `GET /v1/practice/history?date=` hiện có; hộp Ngày gọi cả hai.
- Phân trang theo quy ước chung: `page_size` mặc định 20, tối đa 100, `page_token` mờ (SR của system-spec).

### 10.3 Trường hợp biên

| Khi | Thì |
|---|---|
| `month` sai dạng (`2026-13`, `26-11`) | 400 Problem Details, `type` chỉ ra tham số nào sai |
| `date` không có thật (`2026-02-30`) | 400 Problem Details |
| Tháng hoặc ngày ở tương lai theo múi giờ của Lan | 200, không có dòng nào, tổng bằng 0 |
| Tháng trước khi Lan tạo tài khoản | 200, rỗng |
| Lan đổi múi giờ giữa tháng | Mỗi dòng giữ `local_date` lúc ghi; lịch theo `local_date`, không tính lại |
| Một từ được học rồi ôn lại cùng ngày | Có một dòng `learned` và một dòng `reviewed` |
| Một từ ôn 3 lần trong ngày, lần cuối "Cần ôn lại" | Một dòng `reviewed`, `result: "again"`, `times: 3` |
| Từ riêng đã bị xóa | Dòng vẫn có (log giữ, D33); `lemma` lấy từ dữ liệu còn lại nếu có, không có thì `null` và web ghi "Từ đã xóa", không có link |
| Ngày có 300 lượt ôn | Phân trang 20 dòng một lần; `counts` vẫn đúng tổng |
| Ngày chỉ có thêm hoặc bỏ từ (`studied = false`) | Không tính là ngày có học; không có trong `days` |
| Không đăng nhập | 401 như mọi endpoint của người học |
| Gọi quá nhanh | 429 kèm `Retry-After` theo giới hạn chung |
| Tài khoản bị xóa | Dữ liệu đã xóa cùng tài khoản; không có gì để trả |

Hàm gộp số theo ngày và theo tháng là hàm thuần, test đủ các dòng trên.

### 10.4 Trang Lịch sử luyện tập

`/app/practice/history` thành trang server chỉ chuyển hướng: có `?date=` thì sang `/app/practice?ngay=<date>`, không có thì sang
`/app/practice?lich=<tháng hiện tại>`. `features/learner/practice/HistoryPage.tsx` xóa (còn trong tag).

## 11. SEO và metadata (M8)

**Đã có, giữ:** `buildMetadata` (`lib/metadata.ts`: canonical, hreflang chỉ cho ngôn ngữ có landing, OG, Twitter, robots theo
`NEXT_PUBLIC_INDEXABLE`); `JsonLd` (WebSite, SoftwareApplication); ảnh OG theo ngôn ngữ (`app/[locale]/opengraph-image.tsx`); `robots.ts` chặn
`/*/app`; `/app` có `robots: noindex` (`app/layout.app.tsx:9`).

**Thêm:**

| Việc | Chi tiết |
|---|---|
| Metadata từng trang công khai | Chính sách, Điều khoản, Nguồn dữ liệu có title, description, canonical, OG `url` riêng; hiện Chính sách và Điều khoản chỉ có description khi chưa đăng bản nào |
| Ảnh OG từng trang | `opengraph-image.tsx` trong thư mục `privacy/`, `terms/`, `sources/`, dựng bằng font mới |
| Sitemap | Thêm `privacy`, `terms`, `sources` khi bỏ chặn index lúc launch, `lastModified` lấy từ ngày hiệu lực văn bản (nếu đọc được) |
| JSON-LD | `SoftwareApplication.offers` đang ghi `price: '0'`, `priceCurrency: 'USD'` (`components/seo/JsonLd.tsx`, chuyển sang `site/seo/`): đổi sang `VND`, thêm các kỳ gói Pro, giá lấy cùng nguồn với bảng giá trang chủ; thêm `Organization` (tên, url, logo) |
| Trang đăng nhập, đăng ký | Vẫn `noindex`, có title và description để link chia sẻ hiện đúng |
| Màu trình duyệt | `viewport.themeColor` và `manifest.ts` theo navy mới và nền tối mới |

| Khi | Thì |
|---|---|
| `NEXT_PUBLIC_INDEXABLE` chưa bật | robots chặn hết như hiện nay; sitemap vẫn sinh nhưng chỉ có trang chủ |
| `/en` chưa có bản dịch landing (L4) | hreflang chỉ `vi` và `x-default`; `/en` vẫn chuyển sang `/vi` |
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
| Lint, typecheck, build | `pnpm lint`, `pnpm typecheck`, `pnpm build` | Có luật phụ thuộc §6 |
| e2e web | `pnpm test:e2e` (Playwright, `apps/web/e2e`) | Sửa các journey hiện có theo màn mới cuối mỗi đợt; thêm journey mở lịch và xem một ngày ở M6 |
| Smoke API lịch | `pnpm smoke:giao-dien-moi` (mới, trên API và worker thật, DB mới) | Tạo learner, học 2 từ, ôn 1 từ, luyện 1 phiên; kiểm số trong tháng và ngày khớp tuyệt đối |
| Ảnh so với Figma | `pnpm shots` | Mọi khung §9, máy tính 1440 và điện thoại 390; ảnh ghi vào delivery record |
| Truy cập | `apps/web/e2e/a11y.spec.ts` | Mọi màn mới |
| Lighthouse, Rich Results Test | chạy tay ở M9 | Ghi điểm SEO, Performance (máy tính, điện thoại) của trang chủ và một trang pháp lý vào delivery record |
| First Load JS | `next build` | So với bản cũ (§5.7) |

Hành vi mới (API lịch, màu nhóm, tham số URL, chuyển hướng trang lịch sử, ô nhập lại mật khẩu) viết test trước, chạy thấy đỏ rồi mới code.

## 14. Xong khi

**Mỗi đợt:** CI xanh trên PR vào `refactor/giao-dien-moi`; ảnh mọi khung của đợt đặt cạnh khung Figma trong delivery record
`docs/deliveries/giao-dien-moi.md`; chỗ lệch đã ghi rulings.

**Cả đợt:**
- Mọi khung ở §9 có màn tương ứng; `/app/recall` có màn theo mockup đã duyệt.
- 5 mockup tối đã duyệt và phần tối đã sửa theo.
- `app-ui/`, `components/`, `HistoryPage.tsx`, token cũ không dùng đã xóa; tag `archive/giao-dien-cu-2026-11` có trên GitHub; `giao-dien-cu-map.md` đủ màn.
- `pnpm test`, lint, typecheck, build của web và API xanh; e2e web qua; `smoke:giao-dien-moi` qua trên DB mới; điểm Lighthouse và Rich Results đã ghi.
- PR `refactor/giao-dien-moi` → `dev` CI xanh.

## 15. Rủi ro và chỗ chưa kiểm

- **Nhánh dài lệch `dev`:** trong lúc làm, `dev` còn nhận việc khác (ví dụ `practice-ai-count`: design và plan có trong cây làm việc, chưa vào
  `dev`). Merge `dev` vào nhánh mỗi tuần.
- **Test e2e đổi nhiều:** các journey dựa vào chữ hiển thị; chữ đổi theo Figma thì phải sửa nhiều test. Sửa trong cùng PR với màn.
- **Ba font** nặng hơn một font Lexend: đo First Load JS và Lighthouse; chỉ tải sớm Noto Sans và Bricolage.
- **Chế độ tối** chưa ai nhìn cho tới khi có mockup ở M1.
- **Khoảng 768–1279 px** chưa có khung Figma; kiểm ở 768 và 1024, chỗ nào xấu thì ghi rulings.
- **`/app/recall`** chưa có khung.
- **Turnstile "chỉ hiện khi cần"** còn chờ chủ dự án.
- **Lịch học:** cách tách "học mới" và "ôn" trong `learning_log` chưa đối chiếu từng dòng code (§10.2); làm ở bước code facts của plan.
- **Màu nhóm dùng cho chữ** có thể không đạt 3:1 với vài màu (hổ phách `#d99a17` trên trắng): kiểm ở M3.
- **`ui-best-practices.md`** ghi "ba độ đậm 400, 600, 700" trong khi Figma dùng Bricolage 800 cho tiêu đề (GM18).
- **Hook hỏi mỗi lần merge** PR vào nhánh dài: thêm một bước bấm cho chủ dự án ở mỗi đợt.
