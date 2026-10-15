# Design — Làm mới giao diện landing (`apps/web`) và admin (`apps/admin`) theo hướng B

> **Trạng thái 15/10/2026:** chủ dự án đã duyệt. **Landing đã làm** theo plan
> [`../plans/2026-10-15-ui-refresh-b-landing.md`](../plans/2026-10-15-ui-refresh-b-landing.md) trên nhánh `feat/ui-b-landing`
> (PR #22 vào `dev`); as-built và các chỗ lệch ở [`../../deliveries/ui-refresh-b.md`](../../deliveries/ui-refresh-b.md).
> **Admin chưa làm:** PR #19 (M3) đã merge vào `dev` ngày 15/10/2026. Plan admin:
> [`../plans/2026-10-15-ui-refresh-b-admin.md`](../plans/2026-10-15-ui-refresh-b-admin.md) (chờ chủ dự án duyệt); lúc viết plan
> chủ dự án chốt thêm UB22, UB23.

Ngày: 15/10/2026. Brainstorm qua `superpowers:brainstorming` cùng ngày (12 câu hỏi Q1–Q12 và 5 phần design, chủ dự án duyệt
từng phần). Quyết định và mọi phương án đã đưa ra: [`../decisions/2026-10-15-ui-refresh-b-decisions.md`](../decisions/2026-10-15-ui-refresh-b-decisions.md).

**Đầu vào:**
- Mockup chủ dự án chọn 15/10/2026: [`landing-b.html`](../../mockups/2026-10-15/landing-b.html), [`admin-b.html`](../../mockups/2026-10-15/admin-b.html)
  (mục lục [`index.html`](../../mockups/2026-10-15/index.html); `landing-a.html` và `admin.html` là phương án bị loại).
- Nguyên tắc motion có nguồn: [`MOTION_AND_DESIGN_BEST_PRACTICES_2026-10-15.md`](../../preparation/MOTION_AND_DESIGN_BEST_PRACTICES_2026-10-15.md).
- Audit landing: [`LANDING_PAGE_UI_UX_OPTIMIZATION_CONTEXT.md`](../../LANDING_PAGE_UI_UX_OPTIMIZATION_CONTEXT.md).
- Design trước đó, vẫn là nguồn cho **hành vi**: landing [`2026-10-08-landing-page-design.md`](2026-10-08-landing-page-design.md)
  (W1–W16, LP#, LPE#), admin [`2026-10-14-buoc-2-5-admin-web-design.md`](2026-10-14-buoc-2-5-admin-web-design.md) (D1–D28, B25#, B25E#).

**Nhãn:** **Chốt** = chủ dự án chọn trong chat. **Đề xuất** = trợ lý đề xuất, duyệt cùng doc này. **ASSUMPTION** = chưa
kiểm chứng. Quyết định `UB#`, tiêu chí `UBC#`, trường hợp biên `UBE#`.

## 1. Mục tiêu và tiêu chí xong

Đổi lớp nhìn thấy của landing và admin sang hướng B "Năng lượng": nền xanh thương hiệu `#2445d6`, chữ Lexend, đáp án dạng
miếng dán vàng `#ffd84a`, motion có độ nảy ở đúng những chỗ mang thông tin. Admin mặc áo B nhưng giữ sidebar của admin A.
Hành vi của hai app giữ nguyên, trừ các ngoại lệ ghi ở mục 2.

**Xong khi (lúc triển khai):** mọi `UBC#` ở mục 10 có test tự động hoặc bước chạy tay ghi rõ; CI xanh trên PR vào `dev`
(job `web`, `admin`, `admin-e2e-real`); chủ dự án duyệt ảnh chụp hai lần (UB11); chạy tay landing (VI/EN × 1440/390, bật
giảm chuyển động, tắt JavaScript) và chạy lại luồng "Xong khi" của Bước 2.5 trên admin mới
(`docs/deliveries/buoc-2-5-test-flow.md`).

**Xong khi (việc thiết kế này):** doc này và decision record được chủ dự án duyệt. Không commit khi chưa được yêu cầu.

## 2. Quyết định

| # | Quyết định | Nguồn |
|---|---|---|
| UB1 | Phạm vi: **chỉ phần nhìn**: token, font, bố cục, motion. Giữ stack (Next 16 / Vite + React Aria / Tailwind v4), route và code hành vi; không thêm thư viện animation. Ngoại lệ có chốt riêng: UB8, UB9, UB10, UB12 | Chốt (Q1) |
| UB2 | Thứ tự: landing ngay → admin sau khi PR #19 (M3) merge vào `dev` → Deploy API + admin → Bước 3 | Chốt (Q2) |
| UB3 | Token dùng chung đặt trong package workspace `packages/design-tokens` (một file `theme.css`), mỗi app `@import` rồi thêm token riêng | Chốt (Q3) |
| UB4 | Form waitlist **giữ ô tick bắt buộc** (W4), vẽ lại theo áo B. Server, schema và test của waitlist không đổi | Chốt (Q4) |
| UB5 | Landing giữ đủ 7 phần và **toàn bộ chữ đã duyệt**; mockup chỉ quyết phong cách | Chốt (Q5) |
| UB6 | Bài điền từ ở Hero: **một thẻ** như mockup B, bỏ carousel (vuốt, kéo, mũi tên, phím ←→); giữ nội dung (gợi ý, giải thích, bản dịch, màn Xong) | Chốt (Q6) |
| UB7 | Thêm nút đăng ký ở header và ở hai thẻ Gói học, đều cuộn tới form Hero. Không thêm huy hiệu ở phần Vấn đề | Chốt (Q7) |
| UB8 | Chi tiết lô nhập và chi tiết publish job: **panel bên cạnh bảng, giữ URL** (`/uploads/:id`, `/publish-jobs/:id`) bằng route lồng | Chốt (Q8) |
| UB9 | Ba form (Upload CSV, Tạo publish job, Đăng ký nguồn): **dialog đè lên bảng, giữ URL** (`/uploads/new`, `/publish-jobs/new`, `/sources/new`) | Chốt (Q9) |
| UB10 | Sửa B25E30 (refresh trả 429 làm mất phiên) trong **một task riêng** của plan admin, hai commit: test lỗi trước, sửa sau | Chốt (Q10) |
| UB11 | Bản tham chiếu hình ảnh là **mockup HTML**; không vẽ Figma. Sau task dựng khung của mỗi app, chụp ảnh 1440 và 390 (landing thêm VI/EN) để chủ dự án duyệt trước khi làm tiếp. Figma cũ (`NVyO0…`, `coVHz…`) ghi là lỗi thời | Chốt (Q11) |
| UB12 | Toast chỉ cho **đổi vai trò và gỡ vai trò** (hai thao tác hiện xong mà không báo gì) | Chốt (Q12) |
| UB13 | Menu admin **giữ icon Lucide** (chủ dự án yêu cầu ngày 14/10), dù mockup B không có | Chốt (duyệt phần 3) |
| UB14 | Miếng dán đang bay mà chưa xong được dọn ở mốc sớm nhất: chuyển động xong, 480ms sau khi bấm, hoặc **ngay khi tab hiện lại** | Chốt (duyệt phần 4, chủ dự án sửa) |
| UB15 | Hai chỗ sửa màu so với mockup để đạt luật tương phản của dự án: viền ô nhập `#7d84a8`, chữ gợi ý (placeholder) `#5f6688` (mục 4.2) | Đề xuất (duyệt phần 1) |
| UB16 | Header landing **dính ở đầu màn hình** khi cuộn, để nút đăng ký ở header luôn thấy, **chỉ từ `md` (48rem)**. Dưới 48rem header giữ như hiện nay: không dính, không nút (chữ `Nav.cta` không vừa một hàng ở 390/320) | Đề xuất (duyệt phần 2); chủ dự án sửa lúc viết plan: "cách 1" |
| UB17 | Nút ở header và hai thẻ Gói học dùng lại chuỗi `Nav.cta` có sẵn ("Đăng ký nhận tin ra mắt" / "Get notified at launch"; đang có trong cả hai file messages nhưng chưa dùng). Landing không thêm chuỗi chữ mới | Đề xuất (duyệt phần 2) |
| UB18 | Mọi chuyển động trên landing ≤ 400ms: lật flashcard, hiện dần khi cuộn đang 800ms → 400ms; trễ giữa các khối ≤ 60ms; thẻ bài luyện "rơi vào" lúc tải trang 400ms (mockup để 600ms) | Đề xuất (duyệt phần 2) |
| UB19 | Một design doc, **hai plan**: plan landing viết ngay sau khi duyệt; plan admin viết sau khi PR #19 merge | Đề xuất (duyệt phần 5) |
| UB22 | Panel chi tiết chỉ nằm cạnh bảng khi màn đủ rộng để bảng vẫn là bảng (từ `87rem`, 1392px; sửa từ 84rem sau review cuối vì phép tính thiếu phần lề của tờ trắng); hẹp hơn thì panel trượt đè từ phải, có nền mờ (như điện thoại) | Chốt (lúc viết plan admin) |
| UB23 | Hiệu ứng lúc đóng (150ms) có ở menu, ngăn kéo, panel và 3 form dialog; **toast và 4 hộp xác nhận đóng ngay** | Chốt (lúc viết plan admin) |

Ngoại lệ của UB1 tóm lại: UB8 và UB9 đổi cách route hiển thị (URL không đổi), UB10 sửa một lỗi hành vi đã ghi sẵn, UB12
thêm phản hồi mới. Mọi thứ khác của lớp hành vi giữ nguyên: phiên đăng nhập và luật cổng, API client (`Idempotency-Key`,
Problem Details, polling 2 giây), bảng câu lỗi, B25E1–E29, server và schema waitlist, i18n.

## 3. Kiến trúc

```
packages/design-tokens/            (mới, private workspace package, không có dependency)
  package.json                     name "@wordmet/design-tokens", exports "./theme.css"
  theme.css                        @theme: màu B, font, motion, bo góc, bóng "gờ"
  README.md                        bảng token, cặp màu đã kiểm tương phản
        │ @import "@wordmet/design-tokens/theme.css";
   ┌────┴────────────────────────────────┐
apps/web/src/app/globals.css          apps/admin/src/styles/globals.css
  + cỡ chữ landing (clamp, LP31)        + mật độ admin (chữ, chiều cao nút/ô nhập)
  + container, nền trắng                + nền canvas, khung sidebar
```

- `pnpm-workspace.yaml` đã có `packages/*`; CI (`ci.yml`, `deploy-web.yml`) và `pnpm cf:docker` đều chạy
  `pnpm install --frozen-lockfile` ở gốc repo (đã đọc 15/10/2026), nên package được cài ở mọi nơi build. Mỗi app khai báo
  `"@wordmet/design-tokens": "workspace:*"`.
- Tài liệu Tailwind v4 (context7, 15/10/2026, trang "Theme variables → Sharing across projects") cho phép đặt `@theme` trong
  file riêng của một package monorepo rồi `@import`. **ASSUMPTION:** Next 16.3.8 (Turbopack, `@tailwindcss/postcss`) và
  Vite 8.3.4 (`@tailwindcss/vite`) đều giải được `@import` theo tên package. Task đầu của plan landing kiểm cả hai; nếu một
  bên không được, phương án dự phòng là chép `theme.css` vào app đó kèm test so khớp (phương án B của Q3).
- **Màu chỉ khai báo trong package.** Không app nào khai báo `--color-*` riêng. Test tương phản LP12 (`apps/web/src/styles/tokens.test.ts`)
  đổi sang đọc file của package; admin không có token màu riêng nên không cần test riêng.
- Kiểm giá trị raw (`scripts/check-tailwind-raw.mjs`, W7) giữ ở cả hai app: mọi góc nghiêng, bóng gờ, đường cong easing mới đều
  thành token.

## 4. Token chung (`packages/design-tokens/theme.css`)

### 4.1 Màu

Tên vai trò hiện có (`primary`, `ink`, `muted`, `surface`, `border`, `success`, `danger`…) giữ nguyên để component ít phải
sửa; chỉ đổi giá trị và thêm vai trò mới. Tên cuối cùng chốt trong plan.

| Vai trò | Giá trị | Dùng ở |
|---|---|---|
| `primary` | `#2445d6` | nền Hero và header landing, nút chính, thanh trên admin bản điện thoại, viền focus trên nền sáng |
| `primary-deep` | `#1a32a6` | gờ dưới nút chính, bóng gờ của thẻ bài luyện |
| `primary-soft` | `#eceffe` | ô số liệu, dải "Luyện với AI", nhãn "Đang chạy", vùng thả file |
| `accent` | `#ffd84a` | miếng dán đáp án, nút trên nền xanh, dải CTA cuối, bút dạ quang của mục menu đang chọn, viền focus trên nền xanh |
| `accent-soft` | `#fff4c7` | dòng đang mở trong bảng, nhãn "Một phần", ô "Cập nhật" |
| `ink` | `#0f1a3d` | chữ chính, nút trên nền vàng, toast |
| `muted` | `#4d5577` | chữ phụ |
| `surface` | `#ffffff` | tờ trắng admin, thẻ, nền landing |
| `canvas` | `#f1f3fd` | nền admin, nền ô nhập admin |
| `line` | `#e3e6f4` | đường kẻ bảng, viền panel |
| `line-input` | `#7d84a8` | viền ô nhập, ô tick, nút phụ (UB15) |
| `placeholder` | `#5f6688` | chữ gợi ý trong ô nhập (UB15) |
| `success` / `success-soft` | `#1b7a46` / `#e3f4ea` | đúng, hoàn tất |
| `warning` | `#7a5200` | chữ trên `accent-soft` |
| `danger` / `danger-soft` | `#b8352a` / `#fde8e5` | sai, thất bại, thao tác phá hủy |
| `neutral-soft` | `#eef0f5` | nhãn "Đang chờ", "Đã hoàn tác", ô "Không đổi" |
| `wrong-chip` | `#ffd3cd` | miếng dán đã chọn sai |

### 4.2 Tương phản (đã đo 15/10/2026, công thức WCAG giống LP12)

Mọi cặp chữ/nền dùng trong hai mockup đạt ≥ 4,5:1, ví dụ: trắng trên `primary` 7,25; `ink` trên `accent` 12,28; `muted`
trên `canvas` 6,59; `success` trên `success-soft` 4,69; `danger` trên `danger-soft` 4,99; `warning` trên `accent-soft` 6,27;
chữ phụ `#dfe5ff` trên `primary` 5,79; chữ ô tick `#c9d2ff` trên `primary` 4,88; `muted` trên `accent` 5,27. Viền focus vàng trên
xanh 5,24 và xanh trên vàng 5,24 (≥ 3 cho thành phần không phải chữ).

Hai chỗ mockup trượt luật của dự án, sửa bằng UB15:

| Chỗ | Mockup | Đo | Sửa | Đo |
|---|---|---|---|---|
| Ô nhập admin (nền `canvas` trên tờ trắng, không viền) | không viền / `#c4c9e2` | 1,14 / 1,64 (cần ≥ 3, LP12) | viền 1,5px `line-input` `#7d84a8` | 3,66 trên trắng, 3,31 trên `canvas` |
| Chữ gợi ý trên `canvas` | `#6a7192` | 4,32 | `placeholder` `#5f6688` | 5,07 trên `canvas`, 5,61 trên trắng |

### 4.3 Font

- **Lexend**, bản variable (trục `wght` 100–900), bộ chữ `latin` + `vietnamese`; đã kiểm có trong dữ liệu font của `next`
  16.3.8 (`next/dist/compiled/@next/font/dist/google/font-data.json`).
- Landing: `next/font/google` (`Lexend`, `subsets: ['latin', 'vietnamese']`, `display: 'swap'`, `variable: '--font-lexend'`),
  thay `Be_Vietnam_Pro` trong `app/[locale]/layout.tsx`. Font tự host lúc build như hiện nay.
- Admin: đổi link Google Fonts trong `index.html` từ Be Vietnam Pro sang Lexend (`wght@400;500;600;800`). Không thêm thư viện.
- Token: `--font-sans: var(--font-lexend, 'Lexend'), system-ui, sans-serif`. Phần dự phòng `'Lexend'` trong `var()` là bắt buộc:
  admin không có biến `--font-lexend`, và một `var()` không có dự phòng sẽ làm hỏng cả khai báo.
- Ảnh chia sẻ (`opengraph-image.tsx`, `og-fonts.generated.ts`, `scripts/gen-og-fonts.mjs`) đổi sang Lexend và màu B.
  **ASSUMPTION:** Lexend dùng giấy phép SIL OFL 1.1; kiểm file `OFL.txt` khi lấy file TTF vào `apps/web/assets`.

### 4.4 Motion

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--duration-instant` | 100ms | rê chuột, nhấn nút (nút lún xuống) |
| `--duration-fast` | 150ms | đổi màu, đóng menu/popover/dialog/panel |
| `--duration-base` | 250ms | mở dialog, panel, ngăn kéo; mở FAQ |
| `--duration-slow` | 400ms | miếng dán bay vào, thẻ rơi vào, lật flashcard, hiện dần khi cuộn |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | đổi trạng thái tại chỗ (M3 Standard) |
| `--ease-enter` | `cubic-bezier(0.05, 0.7, 0.1, 1)` | đi vào (M3 Emphasized decelerate) |
| `--ease-exit` | `cubic-bezier(0.3, 0, 0.8, 0.15)` | đi ra (M3 Emphasized accelerate) |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | chỉ: miếng dán bay vào, ô trống "nảy", thẻ rơi vào, toast hiện ra |

Ngoài 4 thời lượng trên còn đúng ba con số riêng, đặt thành token cùng chỗ: rung khi sai 300ms, ô trống nảy 320ms, toast hiện
300ms. Nguồn số: §2 của tài liệu motion (NN/g ≥ 500ms "lê thê"; Carbon, Material 3).

### 4.5 Bo góc và bóng "gờ"

Bóng của B là một **gờ đặc** dưới vật (không mờ): `0 0.25rem 0 <màu đậm hơn>` cho nút landing, `0 0.18rem 0` cho nút admin,
`0 1.5rem 0 primary-deep` cho thẻ bài luyện, `0 0.3rem 0 #dde1f5` cho tờ trắng admin. Bo góc: nút/ô nhập `0.75–0.875rem`,
thẻ `1.25–1.5rem`, dialog `1.5rem`. Giá trị cụ thể lấy từ mockup, đặt thành token trong plan.

## 5. Landing (`apps/web`)

### 5.1 Trang và nhịp màu (UB5)

| Phần | Nền | Ghi chú |
|---|---|---|
| Header | `primary` | Logo (`_ _` trên nền vàng), hai link hiện có (**từ `lg`**: ở 768 không đủ chỗ; chủ dự án giữ sau review, xem decision record UB16), VI/EN. Từ `md`: **dính** (`position: sticky; top: 0`) và có nút `Nav.cta` (UB7, UB16, UB17). Dưới `md`: không dính, không nút, như hiện nay; không được gây cuộn ngang (LP24) |
| Hero | `primary` | Desktop hai cột: chip + H1 + mô tả + form + ghi chú bên trái, thẻ bài luyện bên phải (nghiêng −1,5°, gờ `primary-deep`). Dưới `52rem` một cột theo thứ tự chữ → form → thẻ (form nằm trong màn đầu, mục 2 của audit). Dưới `34rem` thẻ đứng thẳng |
| Vấn đề | `surface` | Thẻ flashcard kiểu cũ nền `neutral-soft`; cột Wordmet nền `primary-soft` |
| Cách hoạt động | `surface` | 3 thẻ màu `primary-soft` / `accent-soft` / `success-soft`. Thứ tự trong thẻ: số + tiêu đề → mô tả → hình minh họa (mục 5 của audit). Dải vuốt trên điện thoại (W12, LP29) giữ nguyên |
| Luyện với AI | `primary-soft` | Dải tím nhạt để ngắt nhịp |
| Gói học | `surface` | Thẻ "Trải nghiệm AI" viền `primary` + gờ. Mỗi thẻ thêm một nút `Nav.cta` dẫn tới `#waitlist-hero` (UB7): gói Miễn phí nút phụ, gói AI nút chính |
| Hỏi đáp | `surface` | `<details>` như cũ (W11), mỗi mục là thẻ `primary-soft`; mở 250ms (đang 350ms) |
| CTA cuối | `accent` | Tiêu đề màu `ink`, form nút `ink`, ô nhập viền `ink` |
| Footer | `surface` | Logo, link như cũ |

Trang Chính sách, Điều khoản, 404 dùng chung token (nền trắng, Lexend, link `primary`). `viewport.themeColor` đổi thành
`#2445d6` (khớp header). Phần nào không có trong mockup thì dựng từ token và component chung, rồi qua bước duyệt ảnh (UB11).

### 5.2 Bài điền từ một thẻ (UB6)

- File: `components/interactive/cloze/`. `ClozeCarousel.tsx` thay bằng một thẻ (đổi tên thành `ClozeCard` hoặc `ClozePractice`
  trong plan); bỏ toàn bộ logic kéo, vuốt, mũi tên, phím ←→, `carousel-track`, token `carousel*`.
- Đầu thẻ: chữ nguồn (`Cloze.sourceChip`) và 3 vạch tiến độ (vạch xong màu `success`). `Cloze.header` ("Câu {current}/{total}")
  vẫn đọc cho trình đọc màn hình.
- Câu tiếng Anh cỡ lớn; chỗ trống `?` gạch dưới `primary`. Bốn miếng dán `accent` có gờ.
- **Chọn sai:** miếng dán rung 300ms, đổi sang `wrong-chip`, đặt `aria-disabled="true"` (không dùng `disabled`, để focus không
  rơi mất), hiện `Cloze.wrongTitle` + gợi ý. Chọn tiếp được các miếng khác.
- **Chọn đúng:** các miếng khác mờ 35% và `aria-disabled`; bản sao của miếng đã chọn (`aria-hidden`) bay vào chỗ trống 400ms
  `--ease-spring`; ô trống điền từ, đổi `success`, nảy 320ms; hiện `Cloze.correctTitle` + giải thích + bản dịch như hiện nay; nút
  `Cloze.nextSentence` hiện ra và **nhận focus**.
- Sau câu 3, "Câu tiếp" dẫn tới màn Xong như hiện nay (`doneTitle`, `doneBody`, nút `doneCta` tới `#waitlist-hero`, nút `replay`).
- `cloze-state.ts`: giữ reducer; thêm `tried: string[]` cho mỗi câu để mọi miếng đã chọn sai vẫn bị khóa (hiện chỉ nhớ lần chọn
  cuối). Bỏ action `prev` và `goTo` (không còn nút hay phím nào gọi tới) cùng test của chúng; giữ `pick`, `next`, `restart`.
- Vùng `aria-live` (`cloze-live`) đọc kết quả như hiện nay (LP20).
- Thẻ "rơi vào" lúc tải trang: CSS `@keyframes` 400ms `--ease-spring`, chỉ khai báo trong
  `@media (prefers-reduced-motion: no-preference)`; không phụ thuộc JavaScript.

### 5.3 Form waitlist (UB4)

Giữ nguyên `WaitlistForm.tsx` về hành vi (bảy trạng thái, ô tick bắt buộc, `aria-describedby`, Server Action chạy không cần
JS). Chỉ đổi hai `tone`:

| | Trên nền `primary` (Hero) | Trên nền `accent` (CTA cuối) |
|---|---|---|
| Ô email | nền trắng, không viền (trắng trên xanh 7,25) | nền trắng, viền trong 2px `ink` |
| Nút gửi | `accent`, chữ `ink`, gờ `primary-deep` | `ink`, chữ trắng |
| Ô tick | 1,25rem, viền 2px trắng; đã tick: nền `accent`, dấu ✓ `ink` | viền 2px `ink`; đã tick: nền `ink`, dấu ✓ `accent` |
| Chữ ô tick | `#dfe5ff` (5,79) | `muted` (5,27) |
| Lỗi | chữ `danger` trên ô trắng nhỏ (như `inverse` hiện nay; 5,86) | như bên trái: `danger` trên `accent` chỉ đạt 4,24 (đo 15/10/2026), nên cũng dùng ô trắng |

Hai `tone` đổi tên theo nền (`onPrimary`, `onAccent`) trong plan. LP12 thêm các cặp của bảng này.

### 5.4 Header dính và cuộn tới form (UB16)

- `SiteHeader` dính ở đầu màn hình từ `md`; dưới `md` cuộn theo trang như hiện nay. Chiều cao tối thiểu đặt bằng token rem để
  co theo cỡ chữ (LP32).
- Đích cuộn (`#waitlist-hero`, `#how-it-works`, `#faq`) có `scroll-margin-top` bằng chiều cao header (token) từ `md`, để header
  không che. `Section` hiện dùng `scroll-mt-4`; đổi sang token mới (dưới `md` giữ `scroll-mt-4`).
- Đo ở phiên viết plan (15/10/2026, Lexend thật): logo + VI/EN + nút `Nav.cta` không vừa một hàng ở 390 và 320, nên dưới `md`
  không có nút (UB16).
- Không cần JavaScript: link `#…` thường, `html { scroll-behavior: smooth }` đã có và tắt khi giảm chuyển động.

### 5.5 Motion landing (UB18)

| Chỗ | Hiện tại | Mới |
|---|---|---|
| `Reveal` (hiện dần khi cuộn) | 800ms, trễ 80/160ms | 400ms `--ease-enter`, trễ 0/40/60ms; giữ hành vi (SSR hiện sẵn, chạy một lần, tôn trọng giảm chuyển động) |
| Lật flashcard | 800ms | 400ms |
| FAQ | 350ms | 250ms |
| Carousel | 800ms | bỏ (UB6) |
| Miếng dán bay / ô trống nảy / rung khi sai | không có | 400 / 320 / 300ms |
| Thẻ rơi vào lúc tải | không có | 400ms |
| Nút | đổi màu 150ms | lún 0,25rem 100ms khi nhấn, đổi màu 100ms |

## 6. Admin (`apps/admin`, sau khi PR #19 merge)

### 6.1 Khung (`app/Shell.tsx`)

- Nền `canvas`. **Sidebar của admin A:** nằm thẳng trên nền, không bóng, không viền; tiêu đề nhóm viết thường như câu (sentence
  case, bỏ `uppercase`); mục đang mở in đậm và tô vàng như bút dạ quang (dải `accent` ở nửa dưới chữ); rê chuột nền `primary` 7%.
  Giữ icon Lucide (UB13) và 16 mục / 6 nhóm của `nav.ts`.
- Chân sidebar: đổi ngôn ngữ VI/EN và nút tài khoản (avatar chữ đầu email + email). Menu tài khoản giữ các mục hiện có, chỉ đổi
  chỗ (từ thanh trên xuống chân sidebar, popover mở lên trên).
- **Tờ trắng duy nhất** (`surface`, bo `1.25rem`, gờ `#dde1f5`): đầu tờ là tiêu đề trang (h1 lấy từ `navLabelKey` như hiện nay)
  và nút chính bên phải (ví dụ "Upload CSV"). Thanh trên cùng hiện có bị bỏ ở desktop. Trang đặt nút chính vào đầu tờ qua một
  khe (slot) của Shell; cách làm chọn trong plan.
- Dưới `64rem` (`--breakpoint-shell`): thanh trên màu `primary` (☰ + logo), sidebar thành ngăn kéo trượt từ trái 250ms, chân
  ngăn kéo có VI/EN và tài khoản. Tờ trắng bo hai góc trên.
- Đăng nhập, quên mật khẩu, đổi mật khẩu bắt buộc (`AuthCard`): thẻ trắng giữa nền `canvas`, logo ở trên.
- Banner mất mạng (`offline.tsx`) và trang "Tính năng chưa có" (`ComingSoonPage`) nằm trong tờ trắng.

### 6.2 Thành phần (`src/ui/*`)

- **Nút** (`Button.tsx`): dày, có gờ; nhấn thì lún 0,18rem trong 100ms. `primary` xanh gờ `primary-deep`; `secondary` trắng viền
  `line-input`; `danger` đỏ gờ đậm; `ghost` chữ `primary`. Chiều cao theo mockup **2,5rem**, 2,75rem khi `pointer: coarse`
  (đề xuất; hiện tại 2rem / 2,75rem). Giữ cách xử lý `isPending` hiện có.
- **Ô nhập, Select, ô tick, vùng thả file:** nền `canvas`, viền `line-input` (UB15), focus viền 2px `primary` và nền trắng.
- **Nhãn trạng thái** (`StatusBadge.tsx`): dạng viên tròn: Đang chờ `neutral-soft`/`muted`, Đang chạy `primary-soft`/`primary` +
  thanh tiến độ, Hoàn tất `success-soft`/`success`, Một phần `accent-soft`/`warning`, Thất bại `danger-soft`/`danger`, Đã hoàn tác
  `neutral-soft`/`muted`.
- **Ô số liệu** (`Stat.tsx`): ô màu theo ý nghĩa (Tạo mới `primary-soft`, Cập nhật `accent-soft`, Không đổi `neutral-soft`, Bị loại
  `danger-soft` + số màu `danger`), số to, chữ số đều (`tabular-nums`).
- **Bảng** (`DataList.tsx`): tiêu đề cột dính khi cuộn; dòng bấm được (rê chuột nền `#f5f6ff`); dòng đang mở panel nền
  `accent-soft`. **Giữ** hành vi đổi sang thẻ xếp dọc khi khung hẹp hơn `--container-list` (40rem) như hiện nay. Link hành động
  `whitespace-nowrap` (lỗi "Detail / s").
- **Dialog** (`Dialog.tsx`): bo `1.5rem`, gờ mờ; lớp nền tối hiện 200ms / ẩn 150ms; hộp hiện 250ms (mờ + dịch 0,5rem + phóng
  0,97→1, `--ease-enter`), ẩn 150ms (`--ease-exit`). **Không nảy.** Riêng 4 hộp xác nhận (hoàn tác lô, đổi vai trò, tạo tài
  khoản, publish toàn bộ) được tạo mới mỗi lần mở nên **đóng ngay**, không có 150ms (UB23).
- **Menu / popover:** hiện 200ms (mờ + trượt 0,25rem theo hướng mở), ẩn 150ms; cách nút kích hoạt 0,25rem.
- **Toast** (mới, UB12): component riêng `ui/Toast.tsx` bọc `UNSTABLE_ToastRegion`/`UNSTABLE_Toast` của `react-aria-components`
  1.22.1 (đã kiểm có export 15/10/2026), để khi API đổi chỉ sửa một file. Nền `ink`, giữa đáy màn hình, hiện 300ms `--ease-spring`,
  **ẩn ngay** (UB23: Toast của React Aria 1.22.1 không có trạng thái `entering`/`exiting`, chỉ hỗ trợ View Transitions; đã đọc
  file kiểu 15/10/2026), tự tắt sau 5 giây, có nút "Đóng" màu `accent`. Hai chuỗi chữ mới (VI/EN) cho đổi vai trò và gỡ vai trò.

### 6.3 Panel chi tiết (UB8)

```
/uploads          → UploadsPage (bảng)
/uploads/:id      → UploadsPage (bảng) + BatchPanel bên phải      (trước: BatchPage thay cả trang)
/publish-jobs/:id → PublishJobsPage (bảng) + PublishJobPanel      (trước: PublishJobPage thay cả trang)
```

- Route lồng trong `app/routes.tsx`: trang danh sách là route cha có `<Outlet />` cho panel. Nội dung panel lấy từ
  `BatchPage`/`PublishJobPage` hiện có (polling, nút Publish/Hoàn tác/Tải file, quy tắc B25E28), bỏ link "← quay lại".
- Từ `87rem` (UB22): tờ trắng chia hai cột, panel rộng `26rem`, viền trái 2px `line`, dính khi cuộn. Panel không chặn trang
  (không modal): bảng vẫn bấm được. Mở lần đầu: trượt 1,5rem từ phải + mờ, 250ms `--ease-enter`; đóng 150ms `--ease-exit`.
- Dưới `87rem` (UB22; trước đây ghi "dưới `64rem`"): panel là dialog modal rộng `min(26rem, 100%)` trượt đè từ phải, nền mờ
  phía sau, giữ focus bên trong, có nút ✕; trên điện thoại nó phủ cả màn hình. Lý do: ở 1280 nếu chia đôi thì bảng còn dưới
  `40rem` và tự đổi thành thẻ.
- Đóng: nút ✕, phím Esc khi focus trong panel, hoặc Back của trình duyệt → về `/uploads`.
- Khi polling của panel thấy lô sang trạng thái kết thúc, làm mới truy vấn danh sách (`['uploads']`) để nhãn của dòng khớp panel
  (UBE27). Publish job làm tương tự.

### 6.4 Form trong dialog (UB9)

```
/uploads/new       → UploadsPage (bảng) + dialog UploadForm
/publish-jobs/new  → PublishJobsPage (bảng) + dialog PublishJobForm
/sources/new       → SourcesPage (bảng) + dialog SourceForm
```

- Cùng kiểu route lồng như 6.3. Nội dung form giữ nguyên (kiểm file, đọc header CSV, chọn nguồn level, `Idempotency-Key`, câu lỗi).
- Đóng dialog ("Hủy", Esc, bấm ra ngoài, Back) → về trang danh sách. Khi đang gửi (`isDismissable` false, như `Dialog.tsx` hiện
  có) thì Esc và bấm ra ngoài không đóng.
- Gửi xong điều hướng như hiện nay (`/uploads/:id`, `/publish-jobs/:id`), nên dialog đóng và panel mở.
- Luật quyền của các URL này giữ đúng như hiện nay (`canAccess` theo mục menu; nút mở form ẩn khi thiếu quyền, `useCan`).

### 6.5 B25E30 (UB10)

- Hiện tại: `POST /v1/auth/refresh` trả 429 (lúc khởi động hoặc giữa phiên) → `session-store.ts` coi như mất phiên → `/login` không báo.
- Mới (đề xuất, chốt trong plan): 429 **không** làm mất phiên. Lúc khởi động: giữ màn đang tải, hiện "Thử lại sau N giây"
  (N lấy từ `Retry-After`; thiếu header thì 10 giây), hết giờ tự thử lại. Giữa phiên: request đang chờ được giữ lại và thử lại sau
  N giây. Sau 3 lần 429 liên tiếp mới về `/login`, kèm thông báo. 401/400 vẫn xử lý như cũ.
- Một chuỗi chữ mới (VI/EN). Hai commit: test tái hiện lỗi trước, sửa sau.

### 6.6 Motion admin

Nhịp "productive": chỉ chuyển động khi đáp lại một thao tác. Hover và đổi màu 100ms; nút lún 100ms; menu 200/150ms; dialog
250/150ms (nền 200/150ms; 4 hộp xác nhận đóng ngay, UB23); panel và ngăn kéo 250/150ms; toast hiện 300ms, ẩn ngay (UB23).
Chuyển trang, đổi bộ lọc, bảng tải xong: **không**
chuyển động. Độ nảy chỉ ở toast (và cảm giác "lún" của nút). Mọi animation khai báo bằng `data-entering`/`data-exiting` của React
Aria và **chỉ** trong `motion-safe:` (`prefers-reduced-motion: no-preference`), xem UBE20–UBE23.

## 7. Trường hợp biên (When → Then)

Nguyên tắc chung cho cả hai app: **chuyển động chỉ để trang trí; trạng thái của app không bao giờ chờ chuyển động.** Đáp án, lời
giải, nút, URL, lệnh gọi API, việc làm mới truy vấn đều xảy ra ngay lúc thao tác; chuyển động chạy song song.

### 7.1 Landing: giảm chuyển động

| # | When | Then |
|---|---|---|
| UBE1 | Máy bật giảm chuyển động, chọn đáp án đúng | Không tạo bản sao bay, không nảy; ô trống điền từ ngay và đổi màu `success` (đổi màu không tính là motion theo WCAG 2.3.3). Hiệu ứng bay dùng Web Animations API (`element.animate`), **không** bị quy tắc CSS `animation-duration: 0.01ms !important` trong `globals.css` tác động, nên code phải tự kiểm `useReducedMotion()` trước khi gọi `animate` |
| UBE2 | Giảm chuyển động, chọn đáp án sai | Không rung; miếng dán đổi `wrong-chip`, hiện gợi ý |
| UBE3 | Giảm chuyển động, tải trang và cuộn | Thẻ không rơi vào (keyframes chỉ khai báo trong `no-preference`); góc nghiêng −1,5° giữ (tĩnh, không phải motion); `Reveal` không ẩn nội dung; flashcard đổi mặt tức thì; FAQ mở tức thì; cuộn tới form không mượt (đã có, LP26) |
| UBE4 | Người dùng đổi cài đặt giảm chuyển động khi trang đang mở | `useReducedMotion` nghe sự kiện `change` nên lần bấm kế tiếp theo cài đặt mới; chuyển động đang chạy dở thì chạy hết |

### 7.2 Landing: chuyển động không chạy xong (tab chạy nền, trình duyệt ghìm khung hình)

| # | When | Then |
|---|---|---|
| UBE5 | Chọn đúng rồi chuyển sang tab khác ngay | Đáp án, lời giải, vạch tiến độ, nút "Câu tiếp" đã có trong state lúc bấm. Bản sao bay (`aria-hidden`, không nhận bấm) được gỡ ở **mốc sớm nhất** (UB14): promise `finished` của animation; hẹn giờ 480ms (400ms + 80ms); hoặc `visibilitychange` báo `document.visibilityState === 'visible'` → gỡ ngay, trong một khung hình. Không có `animationend` nào làm điều kiện |
| UBE6 | Tab vẫn hiện nhưng animation không chạy (`finished` không resolve) | Hẹn giờ 480ms gỡ bản sao; ô trống đã điền từ state |
| UBE7 | Tab chạy nền đủ lâu để trình duyệt ghìm hẹn giờ (≥ 1 giây) | Mốc `visibilitychange` gỡ bản sao ngay khi người dùng quay lại; không còn miếng dán treo trên màn hình (yêu cầu của chủ dự án, UB14) |
| UBE8 | Bấm "Câu tiếp" hoặc "Luyện lại" khi bản sao đang bay | `animation.cancel()`, gỡ bản sao, xóa hẹn giờ, rồi hiện câu mới; câu mới không còn bản sao nào |
| UBE9 | Đổi ngôn ngữ hoặc rời trang khi đang bay | Khi component unmount: hủy animation, xóa hẹn giờ, gỡ listener `visibilitychange`; không có `setState` sau unmount |
| UBE10 | Cuộn trang hoặc đổi cỡ cửa sổ trong 400ms bay | Điểm đích tính lúc bấm, bản sao có thể lệch đích; chấp nhận, vì nó bị gỡ khi xong và ô trống luôn điền từ state |

### 7.3 Landing: tắt JavaScript

| # | When | Then |
|---|---|---|
| UBE11 | Tắt JavaScript, mở `/vi` | HTML có thẻ bài luyện câu 1 với chỗ trống `?` và bốn miếng dán; bấm không có tác dụng. Thẻ rơi vào bằng CSS nên vẫn hiện đủ, **không** có trạng thái ban đầu trong suốt chờ JavaScript. Phần còn lại như LP27: đọc được toàn bộ chữ, FAQ mở/đóng, form gửi được và ô tick vẫn bắt buộc (kiểm trên server) |
| UBE12 | Tắt JavaScript, bấm nút ở header hoặc ở Gói học | Link `#waitlist-hero` thường; trình duyệt cuộn tới form; `scroll-margin-top` giữ form không bị header dính che |
| UBE13 | Có JavaScript, trước khi hydrate xong | `useReducedMotion` trả `true` ở server (đã có), nên HTML đầu tiên không có chuyển động do JS; thẻ rơi vào là CSS nên không phụ thuộc thời điểm hydrate |

### 7.4 Landing: thao tác và bố cục

| # | When | Then |
|---|---|---|
| UBE14 | Bấm đúp đáp án đúng, hoặc bấm nhanh hai miếng | Reducer bỏ qua mọi lần chọn sau khi câu đã `correct`; miếng đã chọn sai nằm trong `tried`, bấm lại không làm gì |
| UBE15 | Người dùng bàn phím chọn sai | `aria-disabled` giữ focus trên miếng vừa chọn; Tab đi tiếp sang miếng kế |
| UBE16 | Người dùng bàn phím chọn đúng | Miếng đã chọn mờ đi; focus chuyển sang "Câu tiếp"; vùng `aria-live` đọc kết quả (LP20) |
| UBE17 | Cỡ chữ gốc 125% (LP32), hoặc bề rộng 320 | Thẻ nghiêng và header không gây cuộn ngang (LP24); từ `md`, header cao lên theo rem và `scroll-margin-top` cao theo |
| UBE18 | Lexend rộng hơn Be Vietnam Pro | Không chữ nào bị cắt hay xuống dòng giữa từ ở 1280, 768, 390 và 125%; ở 768 (bản EN và VI) nút ở header không đẩy VI/EN hay hai link xuống dòng |

### 7.5 Admin: chuyển động

| # | When | Then |
|---|---|---|
| UBE20 | Máy bật giảm chuyển động | Dialog, menu, panel, ngăn kéo, toast hiện/ẩn ngay; nút không lún, chỉ đổi màu. Vì animation chỉ khai báo trong `motion-safe:`, React Aria thấy 0 animation đang chạy và gỡ phần tử ngay (`useAnimation` trong `react-aria` 3.53.1 gọi `onEnd()` khi danh sách rỗng, đã đọc mã 15/10/2026) |
| UBE21 | Đóng dialog/panel/menu rồi chuyển tab ngay | React Aria chờ promise `finished` của mọi animation đang chạy rồi mới gỡ phần tử (đã đọc mã). Tab ẩn có thể làm việc gỡ chậm lại; người dùng không thấy. App không chờ việc này: điều hướng, làm mới truy vấn, gọi API đã xảy ra lúc thao tác. **ASSUMPTION:** khi tab hiện lại, animation đã quá giờ nên `finished` resolve ở khung hình đầu và phần tử biến mất ngay (đồng hồ của document timeline vẫn chạy khi tab ẩn); plan có test |
| UBE22 | Animation đóng bị hủy giữa chừng (đổi `animation-name`, gỡ class, `display: none` trên phần tử đang `data-exiting`) | `finished` bị reject; React Aria nuốt lỗi (`.catch(() => {})`) và **không** gọi `onEnd`, nên phần tử không bao giờ được gỡ: lớp phủ kẹt trên màn hình (đã đọc mã). Quy tắc: kiểu animation chỉ gắn qua `data-entering`/`data-exiting`; không gắn/gỡ class hay đổi `display` của phần tử đang đóng. Test e2e mở rồi đóng nhanh 10 lần, kiểm không còn lớp phủ |
| UBE23 | Mở lại một dialog/menu đang đóng dở | React Aria đặt trạng thái về mở (`useExitAnimation`: đang `exiting` mà `isOpen` thành `true` thì về `open`, đã đọc mã); không kẹt, không nháy |

### 7.6 Admin: panel và dialog theo URL

| # | When | Then |
|---|---|---|
| UBE24 | Mở thẳng `/uploads/:id` (dán link, tải lại trang) | Bảng + panel; focus vào tiêu đề panel. Lô không tồn tại hoặc lỗi tải → panel hiện trạng thái lỗi như `BatchPage` hiện nay; bảng vẫn dùng được |
| UBE25 | Panel đang mở, bấm dòng khác | URL đổi; panel đổi nội dung, không chạy lại hiệu ứng vào; polling chuyển sang lô mới (query key theo `id`) |
| UBE26 | Đóng panel bằng ✕, Esc hoặc Back | Về `/uploads`; hiệu ứng ra 150ms; focus về link của dòng vừa mở nếu dòng còn trên trang, không thì về tiêu đề trang |
| UBE27 | Polling của panel thấy lô sang `succeeded`/`partial`/`failed` | Làm mới truy vấn danh sách để nhãn của dòng khớp panel. Publish job tương tự |
| UBE28 | Bị gỡ quyền khi panel đang mở (B25E6) | Như cũ: lần polling kế nhận 403 → luật cổng → đá ra |
| UBE29 | Bề rộng dưới `87rem` (UB22) | Panel là dialog modal trượt đè từ phải (cả màn hình trên điện thoại), focus giữ trong panel; Back đóng panel |
| UBE30 | Đang gửi form trong dialog, người dùng bấm Back | URL về danh sách, dialog đóng, request vẫn chạy; xong thì điều hướng như hiện nay (`/uploads/:id` → panel mở). Giống hành vi của trang form hiện tại khi rời trang giữa chừng |
| UBE31 | Upload xong | Dialog đóng (150ms) và panel mở (250ms) gần như cùng lúc; chấp nhận hai hiệu ứng chồng nhau |
| UBE32 | Mở thẳng `/uploads/new` khi thiếu `content.edit` | Giữ đúng hành vi hiện có của route (không đổi luật quyền trong lần làm mới này); API vẫn chặn khi gửi |

### 7.7 Admin: toast và phiên

| # | When | Then |
|---|---|---|
| UBE33 | Đổi hoặc gỡ vai trò xong | Toast hiện 5 giây, có nút Đóng, trình đọc màn hình đọc được (vùng toast của React Aria); nhiều toast liên tiếp xếp chồng; giảm chuyển động thì không nảy. Lỗi vẫn hiện bằng `Banner` trong dialog như hiện nay |
| UBE34 | `POST /v1/auth/refresh` trả 429 (B25E30) | Theo 6.5: không mất phiên, chờ `Retry-After` rồi thử lại; 3 lần 429 liên tiếp mới về `/login` kèm thông báo |
| UBE35 | Chữ dài hơn vì Lexend (tên file dài, email dài) | Không cột nào làm link hành động xuống dòng; tên file và email cắt bằng `…` hoặc xuống dòng theo từ, không theo ký tự |

## 8. Test

- **Giữ** mọi test hành vi hiện có của hai app. Chỉ sửa test gắn với thứ đã đổi:
  - Landing: LP21 (đổi câu bằng ›/←→ → bằng "Câu tiếp"), LP28 (khung carousel cao theo thẻ → bỏ), `cloze-carousel.test.tsx`
    đổi theo component mới, LP12/LP31 đọc file token của package, `visual.spec.ts` (chỉ chụp ảnh, không kiểm) chụp lại.
  - Admin: test route và component của chi tiết lô, publish job, ba form (`routes.test.tsx`, `BatchPage.test.tsx`,
    `UploadForm.test.tsx`, `PublishJobs.test.tsx`, `SourcesPage.test.tsx`, `e2e/batch.spec.ts`, `e2e/publish-jobs.spec.ts`,
    `e2e/uploads.spec.ts`) đổi bộ chọn phần tử; các kiểm URL giữ nguyên vì URL không đổi. `e2e-real` 4 luồng phải xanh.
- **Thêm:**
  - Reducer: `tried` khóa từng đáp án sai (UBE14).
  - Component bài điền từ: dọn bản sao ở cả 3 mốc (`finished`, 480ms, `visibilitychange`) bằng fake timers và giả sự kiện
    (UBE5–UBE9); giảm chuyển động không gọi `animate` (UBE1); focus sau khi chọn đúng/sai (UBE15, UBE16).
  - E2E landing: giảm chuyển động (mở rộng LP26 cho bài điền từ); tắt JavaScript (mở rộng LP27: thẻ hiện đủ, nút header cuộn
    tới form); header dính không che form; đo mọi `transition`/`animation` khai báo trên trang ≤ 400ms (UBC8).
  - E2E admin: mở/đóng dialog và panel nhanh 10 lần (UBE22); mở thẳng `/uploads/:id` (UBE24); đổi dòng khi panel mở (UBE25);
    dòng bảng đổi theo khi panel báo xong (UBE27); toast khi đổi vai trò (UBE33); giảm chuyển động không có animation (UBE20);
    tab ẩn rồi hiện lại khi đang đóng dialog (UBE21, `ASSUMPTION`: Playwright giả `visibilityState` được hay không, plan kiểm).
  - B25E30: test unit tái hiện 429 → mất phiên (commit 1, đỏ), rồi sửa (commit 2, xanh).
  - axe ở hai app × VI/EN × 1440/390: không vi phạm `serious`/`critical` (LP25 và tương đương cho admin).
- **CI:** không thêm job; `web`, `admin`, `admin-e2e-real` chạy trên PR như hiện nay.

## 9. Mốc và nhánh

```
1. Token chung ──► 2. Landing: khung ──► [duyệt ảnh] ──► 3. Landing: phần còn lại ──► PR vào dev
   (kiểm @import cả hai app)  (font, header, Hero, bài điền từ)           (6 phần, form, test)
                                                    chờ PR #19 merge
4. Admin: khung ──► [duyệt ảnh] ──► 5. Admin: panel, dialog, toast, B25E30, test ──► PR vào dev
→ Deploy API + admin → Bước 3
```

- Plan landing: nhánh `feat/ui-b-landing` từ `dev`; gồm task tạo `packages/design-tokens`. Task 1 kiểm `@import` ở **cả hai**
  app: `apps/web` bằng `next build`; `apps/admin` (đã có trên `dev` từ PR #18) bằng một lần `vite build` thử rồi hoàn tác, không
  commit thay đổi nào vào `apps/admin` trên nhánh landing (phần admin thuộc plan admin, tránh đụng PR #19).
- Plan admin: viết sau khi PR #19 merge; nhánh `feat/ui-b-admin` từ `dev`.
- Landing lên wordmet.com chỉ khi chủ dự án yêu cầu PR `dev` → `main` (`deploy-web.yml`).

## 10. Tiêu chí chấp nhận (When → Then)

| # | When | Then |
|---|---|---|
| UBC1 | Build hai app | Cả hai lấy màu, font, motion từ `@wordmet/design-tokens`; không file nào trong `apps/*` khai báo `--color-*` |
| UBC2 | Chạy test tương phản | Mọi cặp chữ/nền ≥ 4,5; viền ô nhập, ô tick, viền focus ≥ 3 (gồm các cặp ở 4.2 và 5.3) |
| UBC3 | Mở `/vi`, `/en` | Chữ là Lexend (bộ vietnamese); không còn request font Be Vietnam Pro |
| UBC4 | Ở Hero chọn sai rồi đúng | Sai: rung, `wrong-chip`, `aria-disabled`, gợi ý. Đúng: bay vào, giải thích + bản dịch, "Câu tiếp" nhận focus. Sau câu 3: màn Xong; "Luyện lại" về câu 1 (thay LP21) |
| UBC5 | Ở bề rộng ≥ 48rem, cuộn giữa trang, bấm nút ở header | Header vẫn ở đầu màn hình; trang cuộn tới form Hero, form không bị header che. Dưới 48rem header không có nút và cuộn theo trang |
| UBC6 | Bấm nút ở thẻ Gói học | Cuộn tới form Hero |
| UBC7 | Mở hai form | Cả hai có ô tick bắt buộc (LP30) với kiểu ở 5.3; gửi thiếu tick vẫn báo lỗi (LP15) |
| UBC8 | Đo mọi `transition`/`animation` CSS và Web Animations trên landing | Không thời lượng nào > 400ms |
| UBC9 | Chạy lại LP24, LP25, LP26, LP27, LP29, LP32 | Đều xanh |
| UBC10 | Mở admin ở 1440 | Sidebar trên nền, không bóng, mục đang mở tô vàng, có icon; VI/EN và tài khoản ở chân sidebar; tiêu đề trang và nút chính trên tờ trắng |
| UBC11 | Mở admin ở 390 | Thanh trên màu `primary`, ☰ mở ngăn kéo từ trái; không cuộn ngang |
| UBC12 | Bấm một dòng ở Lô nhập / Publish job | URL `/uploads/:id` / `/publish-jobs/:id`; bảng còn thấy, panel bên phải; đóng panel về danh sách |
| UBC13 | Bấm "Upload CSV" / "Tạo publish job" / "Đăng ký nguồn" | URL `…/new`; dialog đè lên bảng; gửi xong mở panel tương ứng (form nguồn: về danh sách như hiện nay) |
| UBC14 | Đổi hoặc gỡ vai trò | Toast xác nhận |
| UBC15 | Đo chuyển động admin | Không gì > 300ms (toast 300ms; còn lại ≤ 250ms); chuyển trang không chuyển động |
| UBC16 | Chạy toàn bộ test admin (unit, e2e, e2e-real) | Xanh; B25E1–E29 giữ nguyên hành vi |
| UBC17 | Refresh trả 429 | Theo UBE34 (B25E30 đã sửa) |
| UBC18 | Chụp ảnh khung (UB11) | Chủ dự án duyệt ảnh landing (VI/EN × 1440/390) và admin (1440/390) trước khi làm phần còn lại |

## 11. Ngoài phạm vi

Chế độ tối; app học (`app.`); đổi stack hay thêm thư viện animation; cập nhật Figma (ghi lỗi thời); số người đăng ký và các dấu
hiệu "bằng chứng xã hội" (chưa có số liệu thật); đổi chữ đã duyệt ngoài các chuỗi mới ở 6.2 và 6.5; nội dung pháp lý; deploy
admin (bước "Deploy API + admin" riêng); hàng mới nháy vàng trong bảng (mockup có, không mang thêm thông tin vì dòng mới đã được chọn).

## 12. Rủi ro và việc còn mở

- **`@import` CSS từ package workspace** chạy được với Turbopack và Vite là `ASSUMPTION` (mục 3). Kiểm ở task 1; dự phòng: chép
  vào từng app kèm test so khớp.
- **Lớp phủ kẹt** nếu animation đóng bị hủy (UBE22): hành vi có thật trong mã `react-aria` 3.53.1, đã đọc. Chặn bằng quy tắc và
  test; nâng bản React Aria thì đọc lại.
- **Toast còn nhãn `UNSTABLE_`** trong `react-aria-components` 1.22.1: API có thể đổi khi nâng bản; đã bọc trong `ui/Toast.tsx`.
- **Animation đóng khi tab hiện lại** xong ở khung hình đầu là `ASSUMPTION` (UBE21).
- **Lexend rộng hơn** font hiện tại: chữ tiếng Việt dài dễ xuống dòng (UBE18, UBE35). Kiểm ở 1280, 390, 125%.
- **Giấy phép Lexend** (OFL) cho file TTF của ảnh chia sẻ là `ASSUMPTION` (4.3).
- **Điện thoại không có lối tắt tới form khi đang ở giữa trang** (UB16): đổi lại không thêm chữ và không mất chiều cao màn hình;
  form Hero nằm trong màn đầu và dải CTA ở cuối trang vẫn còn.
- **Admin phụ thuộc PR #19.** Nếu M3 còn đổi các trang chi tiết hay form, plan admin đọc lại trước khi viết (UB19).
- **Pháp lý của ô tick** không đổi so với trước: việc ô tick đủ theo Điều 9 Luật 91/2025 vẫn là `ASSUMPTION` (LEGAL_PAGES_RESEARCH_2026-10-11).
- ~~**Nơi commit tài liệu**~~ **Đã chốt 15/10/2026:** doc này, decision record, plan, delivery, mockup và hai tài liệu nghiên
  cứu đi cùng PR #22 (commit docs riêng).

## 13. Tài liệu cần cập nhật sau khi duyệt

- `CLAUDE.md`: một dòng trỏ tới doc này trong mục build order và "Other Notes".
- `docs/HANDOFF_2026-10-05_BUOC_0.md` §2: thêm dòng "Làm mới giao diện B" trước "Deploy API + admin".
- `docs/deliveries/ui-refresh-b.md`: tạo khi viết plan (plan tóm tắt, theo `~/.claude/rules/plan-summaries.md`).
- Design admin Bước 2.5 §9: ghi Figma `coVHz…` đã lỗi thời, trỏ tới doc này. Design landing §6: ghi token đã chuyển vào package.
