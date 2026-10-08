# Design — Landing page Wordmet (`apps/web`)

> **Trạng thái 08/10/2026:** bản nháp chờ chủ dự án duyệt. Chưa có code. Sau khi duyệt → `writing-plans` → triển khai
> bằng skill `frontend-design`.
>
> **Sửa lần 2 (08/10):** đối chiếu lại Figma sau khi chủ dự án nhờ Codex sửa trang. Số mục FAQ, tên gói, câu hướng
> dẫn, chữ trên nút, quy tắc xuống dòng và chỗ lệch giữa form trên Figma với W4 đã cập nhật ở mục 4.4, 5, 8. Mục 5 mô
> tả trang **đúng như Figma lúc đọc** (đọc bằng script chỉ đọc, 08/10).

Ngày: 08/10/2026. Brainstorm qua `superpowers:brainstorming` ngày 07–08/10. Đầu vào:
[`LANDING_PAGE_CONTEXT_2026-10-07.md`](../../preparation/LANDING_PAGE_CONTEXT_2026-10-07.md) (quyết định L1–L6, phân
tích mục 10–11) và mockup Figma https://www.figma.com/design/NVyO0njIAcOUTAl85a1Xdx (4 trang: VI/EN × desktop
1440/mobile 390, cùng các component prototype). Quyết định và phương án đã bỏ:
[`../decisions/2026-10-08-landing-page-decisions.md`](../decisions/2026-10-08-landing-page-decisions.md).

**Nhãn:** **Chốt** = chủ dự án chọn trong chat. **Đề xuất** = trợ lý đề xuất, duyệt cùng doc này. **ASSUMPTION** =
chưa kiểm chứng. Tiêu chí dùng số hiệu `LP#`, trường hợp biên `LPE#` (theo `docs/specs/SPEC_WRITING_CONVENTIONS.md`).

## 1. Mục tiêu và tiêu chí xong

Dựng `apps/web` (Next.js) với landing page Wordmet hai ngôn ngữ đúng mockup Figma. Đây là phần đầu tiên của web sẽ lên
production. Landing đi trước Bước 2 (chốt 08/10).

**Xong khi:** mọi tiêu chí `LP#` ở mục 10 có test tự động chạy bằng một lệnh. CI có job `web` xanh (lint, typecheck,
unit, build, e2e). Một lượt xem tay bằng `pnpm --filter web start` trên desktop 1440 và mobile 390 khớp mockup cả VI và
EN.

**Ngoài phạm vi:** deploy, domain, nối Resend, công cụ đo lượt xem, nội dung pháp lý chính thức, app học (`app.`) và
trang admin (`admin.`). Chi tiết ở mục 12.

## 2. Quyết định

| # | Quyết định | Nguồn |
|---|---|---|
| L1–L6 | Trang giới thiệu sản phẩm dùng lâu dài; VI/EN; người tự học từ vựng; tên **Wordmet**; `admin.` gọi `admin-api.`; email Resend + Cloudflare Email Routing (tạm) | Context doc, chốt 07–08/10 |
| W1 | Landing trong `apps/web`, làm **trước Bước 2** | Chốt |
| W2 | i18n bằng **next-intl 4.14** | Chốt |
| W3 | Form email: **UI + Server Action**, lưu qua cổng `WaitlistStore`, chỉ có bản bộ nhớ. Chưa nối Resend | Chốt |
| W4 | Đồng ý chính sách bằng **ô tick bắt buộc** (bản B trên Figma) | Chốt |
| W5 | Test: **Vitest + Testing Library** và **Playwright + axe** | Chốt |
| W6 | Component không viết trong `page.tsx`. Trang chỉ ghép các section | Chốt (yêu cầu) |
| W7 | Tailwind **hạn chế giá trị raw**: mọi màu, cỡ chữ, bo góc, bóng, thời lượng chuyển động lấy từ token `@theme`. Có lệnh kiểm tự động (mục 6.3) | Chốt (yêu cầu) |
| W8 | **Ưu tiên render trên server.** Chỉ dùng Client Component khi cần hook. Danh sách đảo client ở mục 4.3 | Chốt (yêu cầu) |
| W9 | Metadata đầy đủ theo API của Next (mục 7) | Chốt (yêu cầu) |
| W10 | Chuyển động: CSS và một hook IntersectionObserver nhỏ, **không thêm thư viện animation** | Đề xuất |
| W11 | FAQ dùng `<details>`/`<summary>` gốc (không JS) với `name` chung để chỉ mở một mục | Đề xuất |
| W12 | Dải vuốt "How it works" trên mobile dùng CSS scroll-snap, không JS | Đề xuất |
| W13 | Thêm token màu chữ đậm hơn cho trạng thái đúng/sai và viền ô nhập, để đạt WCAG AA (mục 6.2) | Đề xuất |
| W14 | Trước khi ra mắt, trang mặc định `noindex`. Bật index bằng biến môi trường | Đề xuất |
| W15 | Token dùng rem; ba cỡ chữ lớn co giãn bằng `clamp()`; bề rộng cố định trên Figma đổi thành bề rộng tối đa hoặc tỉ lệ; không có chiều cao cố định (mục 6.4) | Chốt 08/10 |
| W16 | Dùng 4 skill của plugin `design` (Anthropic): `ux-copy` (soát chữ), `design-system` (soát token), `accessibility-review` và `design-critique` (soát trang thật). Không dùng `design-handoff` vì trùng mục 5–6 | Chốt 08/10 |

Phiên bản (đã kiểm `npm view` ngày 08/10/2026): `next` 16.4.0, `react`/`react-dom` 19.3.0, `tailwindcss` và
`@tailwindcss/postcss` 4.3.3, `next-intl` 4.14.9, `vitest` 5.0.3, `@testing-library/react` 16.3.3, `@playwright/test`
1.64.0, `@axe-core/playwright` 4.13.0, `zod` 4.6.5 (cùng bản với `apps/api`). Ghim bản chính xác (không `^`) như
`apps/api` đang làm với Prisma.

Đã đọc trong phiên (context7 / trang chính thức, 08/10):
- Next 16 đổi `middleware` thành `proxy.ts` với hàm `proxy`. Turbopack là mặc định. `next lint` bị bỏ, dùng ESLint CLI
  với `eslint-config-next/core-web-vitals`.
- Có các file metadata `opengraph-image`, `sitemap.ts`, `robots.ts`. JSON-LD render bằng thẻ `<script>` trên server,
  thay `<` bằng `<`.
- `next/font/google` có `Be_Vietnam_Pro` với subset `vietnamese`. Font này không phải variable font, nên phải liệt kê
  weight (font-data.json của Next, 08/10).
- next-intl 4.14 dùng `defineRouting`, `createMiddleware` trong `proxy.ts` và `getRequestConfig`. Trên Next ≥16.3,
  locale đọc qua `next/root-params`, không cần `setRequestLocale`, nhưng vẫn cần `generateStaticParams`. Có thể ghép
  logic riêng trước middleware. Kiểu message khai báo qua `AppConfig`.
- Tailwind 4: `@theme` sinh utility từ token. `@theme inline` để nối với biến font của `next/font`.
- `<details>` đạt Baseline từ 01/2020. MDN không ghi riêng mức hỗ trợ của thuộc tính `name`.

## 3. Cấu trúc thư mục

```
apps/web/
  package.json · next.config.ts · tsconfig.json · eslint.config.mjs · postcss.config.mjs
  vitest.config.ts · playwright.config.ts
  messages/vi.json · messages/en.json          # toàn bộ chữ của trang
  assets/fonts/BeVietnamPro-*.ttf              # chỉ cho ảnh OG (ImageResponse không đọc woff2)
  scripts/check-tailwind-raw.mjs               # W7
  src/
    proxy.ts                                   # chọn ngôn ngữ ở "/" rồi giao cho next-intl
    i18n/routing.ts · i18n/request.ts · i18n/navigation.ts · i18n/pick-locale.ts
    app/
      globals.css                              # @import tailwindcss + @theme (token)
      robots.ts · sitemap.ts · manifest.ts · icon.tsx
      [locale]/
        layout.tsx                             # <html lang>, font, provider, metadata gốc
        page.tsx                               # chỉ ghép các section
        opengraph-image.tsx
        privacy/page.tsx · terms/page.tsx      # bản nháp, noindex (mục 12)
        not-found.tsx
    components/
      ui/            Button · Chip · Container · SectionHeading · VisuallyHidden · Icon
      layout/        SiteHeader · LanguageSwitch · SiteFooter · SkipLink
      sections/      Hero · Problem · HowItWorks · AiPractice · Plans · Faq · FinalCta
      interactive/   ClozeCarousel · ClozeCard · Flashcard · WaitlistForm · Reveal   ('use client'; LanguageSwitch cũng là client)
      seo/           JsonLd
    features/waitlist/  schema.ts · actions.ts · store.ts · memory-store.ts
    lib/             site.ts (URL, cờ index) · cn.ts
  e2e/               *.spec.ts
```

Quy tắc W6: `page.tsx` chỉ import và xếp các section. Section là Server Component nhận chữ qua `getTranslations`.
Section nào cần tương tác thì nhúng một component trong `interactive/`, không tự thành Client Component.

## 4. Routing, render và i18n

### 4.1 URL và chọn ngôn ngữ (theo context doc 10.3, đề xuất D)

- `localePrefix: 'always'`, locales `['vi', 'en']`, `defaultLocale: 'vi'`. Trang ở `/vi` và `/en`, không bao giờ tự
  chuyển giữa hai trang này.
- Chỉ `/` tự chuyển, bằng `proxy.ts` gọi hàm thuần `pickLocale({ cookie, country, acceptLanguage })` theo thứ tự:
  1. cookie ngôn ngữ của next-intl (người dùng đã chọn);
  2. `country === 'VN'` → `vi`. Đọc từ `x-vercel-ip-country` hoặc `cf-ipcountry`; bỏ qua `XX`, `T1`;
  3. `Accept-Language` có `vi` → `vi`;
  4. còn lại → `en`.
- Phản hồi chuyển trang của `/` là 307, có `Cache-Control: private, no-store` và `Vary: Cookie, Accept-Language`.
  Mọi path khác giao cho `createMiddleware(routing)`.
- Đổi ngôn ngữ bằng `Link` của next-intl (`i18n/navigation.ts`), giữ nguyên path. next-intl tự lưu cookie khi người dùng
  vào path có tiền tố ngôn ngữ (**ASSUMPTION**: kiểm bằng e2e `LP5`).

### 4.2 Render

Mọi trang trong `[locale]` render tĩnh lúc build (`generateStaticParams` trả `vi`, `en`). Không đọc `cookies()` hoặc
`headers()` trong trang, vì làm vậy biến trang thành render động. Phần phụ thuộc request chỉ nằm ở `proxy.ts`. Test
`LP2` kiểm kết quả build: hai trang ghi là static.

### 4.3 Đảo client (W8): chỉ những chỗ cần hook

| Component | Vì sao phải ở client | Hook |
|---|---|---|
| `WaitlistForm` | Trạng thái gửi và lỗi trả về từ Server Action | `useActionState` |
| `ClozeCarousel` / `ClozeCard` | Câu đang xem, đáp án đã chọn, phím ←/→ | `useState`, `useReducer` |
| `Flashcard` | Mặt đang hiện | `useState` |
| `Reveal` | Hiện dần khi cuộn tới | `useEffect` + IntersectionObserver |
| `LanguageSwitch` | Giữ nguyên trang đang xem khi đổi ngôn ngữ (vd `/vi/privacy` → `/en/privacy`); layout không biết path hiện tại | `usePathname` |

Không cần client: header, footer, FAQ (`<details>`), dải vuốt mobile (scroll-snap), các section. Đảo client nhận chữ
đã dịch qua props từ Server Component. Layout có `NextIntlClientProvider messages={null}`: provider này chỉ cấp ngôn ngữ
cho `Link`/`usePathname` của next-intl, không gửi bộ chữ xuống trình duyệt (sửa khi làm Task 4, 08/10: không có
provider thì `LanguageSwitch` lỗi "No intl context found" và build hỏng).

### 4.4 Chữ

- Toàn bộ chữ trong `messages/{vi,en}.json`, nhóm theo section. Nguồn là **chữ hiện có trong Figma lúc triển khai**,
  vì chủ dự án đã sửa trực tiếp trên Figma. Không lấy từ context doc.
- Kiểu message khai báo qua `AppConfig` (lấy `en.json` làm chuẩn). Test `LP3` kiểm hai file có cùng tập key.
- Tiêu đề theo quy tắc đã chốt trên Figma: không dấu chấm cuối; tiêu đề hai vế thì xuống dòng.
- Trên Figma, chỗ xuống dòng có ba kiểu, nên chữ trong messages đánh dấu bằng ba thẻ rich text của next-intl:

  | Thẻ | Nghĩa | Chỗ dùng trên Figma (đọc 08/10) |
  |---|---|---|
  | `<br></br>` | Xuống dòng ở mọi kích thước | H1 và tiêu đề Vấn đề, cả VI và EN |
  | `<brMd></brMd>` | Chỉ xuống dòng từ `md` | Tiêu đề Cách hoạt động và tiêu đề AI (VI và EN); mô tả phần Vấn đề (**chỉ EN**) |
  | `<brSm></brSm>` | Chỉ xuống dòng dưới `md` | Mô tả phần Gói (**chỉ VI**: "…14 ngày dùng thử. / Không cần thẻ thanh toán.") |

  Vì chỗ xuống dòng khác nhau theo ngôn ngữ, thẻ nằm trong từng file messages chứ không nằm trong component. Một
  helper `richBreaks` (server) đổi ba thẻ thành `<br>` có class tương ứng (`md:hidden`, `hidden md:inline`). Danh sách
  trên đọc từ Figma ngày 08/10; khi trích chữ phải đọc lại.

## 5. Các phần của trang

Thứ tự trên Figma: Nav → Hero → Problem → How it works → AI → Plans → FAQ → Final CTA → Footer. Không có phần founder.
Desktop: khung 1440, lề hai bên 160 (nội dung 1120). Mobile: khung 390, lề 20. Khoảng cách dọc của section là 96
(desktop) và 56 (mobile); riêng Final CTA là 88/56. Chữ dưới đây là bản VI đọc ngày 08/10, chỉ để nhận diện; nguồn chữ
thật là Figma lúc triển khai (4.4). Bản EN có cùng cấu trúc. **Mọi số px trong mục này là số đo trên Figma ở 1440 và
390. Khi viết code, áp quy tắc ở 6.4** (rem, bề rộng tối đa, tỉ lệ, không có chiều cao cố định).

- **Nav (`SiteHeader`):** logo gồm ô vàng `marker` có chữ "_ _" và chữ "Wordmet". Desktop có link "Cách hoạt động"
  (`#how-it-works`), "Hỏi đáp" (`#faq`), `LanguageSwitch`, nút chính "Nhận thông báo ra mắt" (neo tới form ở Hero).
  Mobile chỉ có logo và `LanguageSwitch` sát lề phải. Có `SkipLink` tới `<main>`.
- **`LanguageSwitch`:** hai ô VI | EN trong khung bo tròn. Ô đang chọn nền `ink`, chữ `on-primary`. Đây là hai `Link`
  trỏ tới cùng path ở ngôn ngữ kia; ô đang chọn có `aria-current="true"`.
- **Hero:** chip "Luyện từ vựng từ những câu bạn đã đọc", H1, đoạn mô tả, `WaitlistForm`, dòng phụ "Miễn phí · Chỉ
  thông báo khi ra mắt".
  - Desktop: hai cột, cột chữ co giãn, cột phải là `ClozeCarousel` rộng 560, cách nhau 48. Form nằm ngang (ô email co
    giãn + nút).
  - Mobile: `ClozeCarousel` nằm ngay dưới H1, trước đoạn mô tả. Form xếp dọc, ô và nút rộng hết khung.
- **`ClozeCarousel`:** 3 câu (`deploy`, `assume`, `borrow`), mỗi câu là một `ClozeCard`.
  - Card giữa đủ cỡ. Hai card bên thu còn 0.86 và mờ còn khoảng 50%, ló ra ở mép.
  - Nút tròn ‹ › 36px nằm ở mép trái/phải, giữa chiều cao card. Nhãn đọc màn hình "Câu trước"/"Câu sau".
  - Vuốt bằng scroll-snap. Phím ←/→ khi carousel đang được focus.
  - Chiều cao khung theo card giữa, nên khi card hiện phần giải thích thì khung giãn, không cắt nội dung.
  - Desktop: card 440 trong khung 560. Mobile: card 290 trong khung 350.
- **`ClozeCard`:** đầu card có "Luyện thử · câu n/3" và chip "Câu bạn đã lưu · blog công nghệ". Tiếp theo là câu có chỗ
  trống và câu hướng dẫn "Chọn đáp án đúng". Cuối là 4 nút đáp án dạng viên thuốc, cao tối thiểu 44.

  | Trạng thái | Chỗ trống trong câu | Nút đáp án | Phần dưới |
  |---|---|---|---|
  | `unanswered` | Ô vàng `marker` "_____" | Viền thường | Câu hướng dẫn |
  | `wrong` | Chữ của đáp án đã chọn, viền đỏ | Nút đã chọn viền đỏ | "✗ Chưa đúng" + gợi ý; chọn lại được |
  | `correct` | Từ đúng, nền xanh nhạt, viền xanh | Nút đúng nền xanh nhạt | "✓ Đúng rồi!", giải thích, bản dịch, nút "Câu tiếp theo" |
  | `done` (sau câu 3) | — | — | "Bạn đã luyện xong 3 câu mẫu.", mô tả, nút "Nhận thông báo ra mắt" (cuộn tới form), nút "Luyện lại" |

  Câu nào cũng tương tác được (Figma chỉ nối prototype cho câu 1). Kết quả báo qua vùng `aria-live="polite"`. Dữ liệu
  3 câu (đáp án, gợi ý, giải thích, bản dịch) nằm trong messages. Câu 2 và 3 chưa có gợi ý, giải thích và bản dịch trên
  Figma. **Chốt 08/10:** trợ lý viết phần chữ này khi trích chữ (VI và EN), chủ dự án duyệt lúc review.
- **Problem:** nhãn "VẤN ĐỀ", tiêu đề hai dòng, mô tả. Hai card: desktop nằm cạnh nhau và cao bằng nhau; mobile xếp dọc.
  - Card trái "Chỉ lưu từ và nghĩa": `Flashcard` (mặt trước "deploy" và "Chạm để lật", mặt sau là nghĩa) và một câu chú
    thích. `Flashcard` là một `<button>` có `aria-pressed`, lật 3D bằng `rotateY` và `backface-visibility`.
  - Card phải "Với Wordmet", viền `primary`: ba câu điền từ tĩnh (`deploy` và `assume` ở trạng thái đúng, `borrow`
    còn trống) và một câu chú thích.
- **How it works (`#how-it-works`):** nhãn, tiêu đề, ba card bước, mỗi card gồm khung minh họa, số thứ tự trong ô tròn
  `ink`, tiêu đề, mô tả.
  - Bước 1: hai ô (Từ / Câu chứa từ) và nút "Lưu từ".
  - Bước 2: câu có chỗ trống và 3 chip dạng bài.
  - Bước 3: danh sách ôn. Mỗi dòng gồm từ ở trên và trạng thái ở dưới; dòng "Sai 2 lần · Ôn hôm nay" màu đỏ.
  - Desktop: lưới 3 cột, ba card cao bằng nhau. Mobile: dải vuốt tràn mép, card rộng 300, cách nhau 16, lề đầu và lề
    cuối đều 20. Không có chấm chỉ vị trí; card kế tiếp ló ra ở mép.
- **AI:** nhãn, tiêu đề, mô tả, 3 dòng lợi ích có dấu ✓, chip "Dùng thử 14 ngày · Thuộc gói Pro". Card ví dụ tĩnh
  "Câu do AI tạo · từ: assume" gồm câu có từ đúng, khung giải thích và bản dịch, dòng "⚑ Báo lỗi câu này" (chỉ để minh
  họa, không bấm được). Desktop hai cột (chữ | card 480); mobile xếp dọc.
- **Plans:** nhãn "GÓI HỌC", tiêu đề "Bắt đầu miễn phí", mô tả. Hai card, không ghi giá:
  - "Miễn phí" với chip "Không giới hạn thời gian" và 4 dòng ✓.
  - "Trải nghiệm AI" với chip "14 ngày", 4 dòng ✓, viền `primary`.
  - Desktop nằm cạnh nhau, cao bằng nhau; mobile xếp dọc.
- **FAQ (`#faq`):** nhãn "GIẢI ĐÁP", tiêu đề, danh sách rộng 800 trên desktop (hết khung trên mobile). **4 mục**, mục
  đầu mở sẵn:
  1. "Wordmet giúp tôi học từ vựng như thế nào?"
  2. "Wordmet có miễn phí không?"
  3. "Wordmet khác gì các ứng dụng học tiếng Anh khác?"
  4. "Câu tôi lưu có bị chia sẻ với người khác không?"

  Mỗi mục là một `<details name="faq">`: `<summary>` chứa câu hỏi và dấu +/−, mục đang mở viền `primary`. Câu trả lời
  lấy từ thuộc tính Answer của từng instance trên Figma.
- **Final CTA:** nền `primary`, tiêu đề "Bắt đầu với những từ bạn gặp hôm nay", `WaitlistForm` với nút kiểu phụ (nền
  trắng), dòng về chính sách. Desktop: form nằm ngang, căn giữa. Mobile: xếp dọc. Form có `id` riêng để không trùng
  với form ở Hero.
- **Footer:** link Chính sách bảo mật / Điều khoản sử dụng / Liên hệ (`mailto:`, địa chỉ đặt bằng biến môi trường) /
  đổi ngôn ngữ ("English" hoặc "Tiếng Việt"), dòng "© 2026 Wordmet". Desktop: bản quyền trái, link phải. Mobile: link
  thành lưới 2 cột, bản quyền ở dưới.

Hiệu ứng khi cuộn (`Reveal`): mờ → rõ và trượt lên dùng token `--spacing` và `--duration-reveal`, chạy một lần, card
trong cùng hàng lệch nhau một bước token. Khi `prefers-reduced-motion: reduce` thì tắt mọi chuyển động (trượt, lật,
scale của carousel), chỉ đổi trạng thái tức thì. Nội dung luôn có trong HTML, nên không có JS vẫn đọc được. Skill
`frontend-design` khuyên dùng chuyển động tiết chế; chủ dự án đã yêu cầu hiệu ứng khi cuộn nên vẫn giữ, nhưng biên
độ nhỏ.

## 6. Design token và quy tắc Tailwind

### 6.1 Token (`@theme` trong `globals.css`)

Lấy từ biến `Landing tokens` trong Figma, đặt tên theo vai trò:

- **Màu:** `bg` #FAF8F5, `surface` #FFFFFF, `ink` #1C1B22, `muted` #5E5B6B, `border` #E7E3DC, `primary` #2F5BEA,
  `primary-soft` #E8EEFF, `on-primary` #FFFFFF, `marker` #FFE08A, `success` #1F9D55, `success-soft` #E5F6EC,
  `danger` #D64545, cùng các token bổ sung ở 6.2.
- **Font:** `--font-sans` trỏ tới biến của `Be_Vietnam_Pro` (weight 400, 500, 600, 700, 800; subset `latin`,
  `vietnamese`; `display: swap`).
- **Cỡ chữ** (theo 6.4, đơn vị rem; mỗi token kèm `--line-height` và `--letter-spacing`). Số px ở đây là số đo
  Figma ở 390 → 1440:

  Mỗi cỡ chữ có trên Figma là một token. Component tự chọn token cho từng breakpoint (vd `text-body md:text-subtitle`).
  Ba cỡ lớn co giãn liên tục bằng `clamp()`, cho đúng số Figma ở 390 và 1440:

  | Token | Figma (px) | Giá trị |
  |---|---|---|
  | `display` | 36 (390) → 60 (1440) | `clamp(2.25rem, 1.6929rem + 2.2857vw, 3.75rem)` |
  | `cta` | 28 → 44 | `clamp(1.75rem, 1.3786rem + 1.5238vw, 2.75rem)` |
  | `h2` | 28 → 40 | `clamp(1.75rem, 1.4714rem + 1.1429vw, 2.5rem)` |
  | `title-lg` | 24 | `1.5rem` |
  | `h3` | 22 | `1.375rem` |
  | `title` | 20 | `1.25rem` |
  | `lead` | 19 | `1.1875rem` |
  | `subtitle` | 18 | `1.125rem` |
  | `body-lg` | 17 | `1.0625rem` |
  | `body` | 16 | `1rem` |
  | `label` | 15 | `0.9375rem` |
  | `small` | 14 | `0.875rem` |
  | `caption` | 13 | `0.8125rem` |

  Bộ cỡ chữ đo trên Figma ngày 08/10 (desktop: 13–20, 22, 24, 40, 44, 60; mobile: 13–18, 20, 28, 36). Cỡ của từng
  chữ trên mỗi breakpoint lấy theo Figma khi làm từng section.
- **Bo góc:** `--radius-sm` 0.5rem (8, ô chỗ trống), `--radius-control` 0.75rem (12, ô nhập, nút, ô trong khung minh họa;
  gộp cả 10 của Figma), `--radius-inner` 0.875rem (14, khung giải thích), `--radius-panel` 1rem (16, FAQ, flashcard),
  `--radius-card` 1.25rem (20, card), `--radius-feature` 1.5rem (24, card bài mẫu, card AI). Giá trị 999 dùng
  `rounded-full` có sẵn.
- **Bóng:** `--shadow-card` (0 1rem 2.5rem, ink 8%), `--shadow-control` (0 0.25rem 0.75rem, ink 12%).
- **Bề rộng tối đa** (namespace `--container-*`, sinh ra `max-w-*`): `content` 70rem (1120), `cta` 62.5rem (1000),
  `faq` 50rem (800), `heading` 47.5rem (760), `prose` 40rem (640), `carousel` 35rem (560), `aside` 30rem (480),
  `copy` 31.25rem (500).
- **Khoảng cách:** thang `--spacing` mặc định của Tailwind (0.25rem một bước). Mọi khoảng trong Figma là bội của 2px,
  nên đều có bậc tương ứng (vd 2px là `0.5`, 30px là `7.5`, 160px là `40`).
- **Chuyển động:** `--duration-fast` 150ms, `--duration-base` 250ms, `--duration-reveal` 400ms, `--duration-flip`
  450ms; `--ease-out` theo mockup.

### 6.2 Độ tương phản (W13, đo 08/10 bằng công thức WCAG)

| Cặp màu | Tỉ lệ | Chuẩn | Xử lý |
|---|---|---|---|
| `muted` trên `bg` / `surface` | 6,22 / 6,59 | ≥ 4,5 | Giữ |
| `primary` trên `surface`; `on-primary` trên `primary` | 5,52 | ≥ 4,5 | Giữ |
| `success` trên `success-soft` / `bg` | 3,11 / 3,29 | ≥ 4,5 với chữ thường | Thêm `success-strong` cho chữ |
| `danger` trên `bg` / `surface` | 4,13 / 4,38 | ≥ 4,5 | Thêm `danger-strong` cho chữ lỗi |
| `border` trên `surface` (viền ô nhập, ô tick) | 1,28 | ≥ 3 (WCAG 1.4.11) | Thêm `border-strong` cho ô nhập và ô tick. Viền card trang trí giữ `border` |

Mã màu cuối cùng của ba token mới sẽ do test `LP12` quyết định: test đọc token từ CSS và đòi ≥4,5 cho chữ, ≥3 cho viền
điều khiển. Ứng viên đã đo: `#B42318` trên `bg` đạt 6,20; `#8A8697` trên `surface` đạt 3,54; `#15803D` trên
`success-soft` mới đạt 4,47 nên cần đậm hơn. **Giá trị chốt khi làm Task 3 (08/10):** `success-strong` #147A3A (4,83
trên `success-soft`, 5,11 trên `bg`), `danger-strong` #B42318, `border-strong` #8A8697. Đây là chỗ lệch nhỏ so với Figma. Cập nhật lại biến trên Figma sau khi
chốt mã màu.

### 6.3 Không dùng giá trị raw (W7)

- Không viết giá trị tùy ý dạng `[...]` trong `className` (vd `text-[#2F5BEA]`, `p-[13px]`). Không dùng `style` inline,
  trừ biến CSS động của carousel (vd `--active-index`).
- `scripts/check-tailwind-raw.mjs` quét `src/**/*.tsx` tìm mẫu `-[` trong chuỗi class và thoát với mã lỗi nếu có. Chạy
  trong `pnpm lint` và CI. Muốn có ngoại lệ thì phải ghi chú `// raw-ok: <lý do>` ngay trên dòng đó.
- Ghép class bằng `cn()` (`clsx` + `tailwind-merge`); biến thể của component khai báo trong một map trong file
  component, không rải điều kiện khắp nơi.

### 6.4 Đơn vị và co giãn (W15, chốt 08/10)

Đo Figma ngày 08/10 (chỉ đọc): desktop có 173/191 phần tử co giãn theo khung hoặc ôm nội dung, mobile 181/189. Phần
còn lại là bề rộng hoặc chiều cao cố định. Quy tắc khi chuyển sang code:

- **Token dùng rem** (px ÷ 16): cỡ chữ, bo góc, bóng, khoảng cách, bề rộng tối đa. Nhờ vậy trang lớn lên theo cỡ chữ
  gốc mà người dùng đặt trong trình duyệt. Chỉ độ dày viền giữ px (`border` 1px, `border-2` 2px; viền 1.5px trên Figma
  dùng 2px).
- **Bề rộng cố định trên Figma đổi thành bề rộng tối đa, còn bề rộng thật co theo khung:**

  | Trên Figma | Trong code |
  |---|---|
  | Khối chữ cố định 760 / 640 / 500 / 1000 | `max-w-heading` / `max-w-prose` / `max-w-copy` / `max-w-cta`, bề rộng 100% |
  | Dải bài mẫu 560, card AI 480, danh sách FAQ 800 | `max-w-carousel`, `max-w-aside`, `max-w-faq`, bề rộng 100% |
  | Card bài mẫu 440 trong 560 (desktop), 290 trong 350 (mobile) | `w-4/5` của khung carousel, theo tỉ lệ |
  | Card bước 300 trên mobile | `w-4/5` của dải vuốt, `shrink-0` |
  | Ô email 300 ở Final CTA | Co giãn trong hàng form, tối đa theo `max-w-prose` |
  | Link footer 160 trên mobile | Lưới `grid-cols-2` |
  | Nội dung 1120 với lề 160 | `max-w-content mx-auto` với lề `px-5 md:px-10 xl:px-0`. Ở 1440, khung 70rem căn giữa tự để lại lề 160 (sửa khi làm Task 3: `xl:px-40` sẽ cộng lề hai lần) |

- **Không có chiều cao cố định.** Flashcard dùng `min-h-45` (11.25rem = 180). Ba card bước cao bằng nhau nhờ lưới:
  hàng card dùng `grid` và mỗi card là `grid-rows-subgrid row-span-4`, nên khung minh họa, số, tiêu đề và mô tả của
  ba card thẳng hàng mà không cần khung 250px. Trên mobile, dải vuốt dùng `flex items-stretch`.
- **Breakpoint:** chỉ dùng `md` (48rem) cho bố cục và `xl` (80rem) cho lề lớn. Màn ở giữa (768–1279) dùng lề `px-10`
  và cỡ chữ `clamp`; bố cục hai cột từ `md`.
- **Kiểm bằng test** `LP31` (token không chứa `px`, trừ độ dày viền) và `LP32` (trang vẫn đúng khi cỡ chữ gốc 125% và
  ở bề rộng 768).

## 7. Metadata và SEO (W9, W14)

- `lib/site.ts`: `siteUrl` lấy từ `NEXT_PUBLIC_SITE_URL` (mặc định `http://localhost:3000`). `indexable` lấy từ
  `NEXT_PUBLIC_INDEXABLE === 'true'` (mặc định `false`).
- Layout `[locale]`: `generateMetadata` trả `metadataBase`, `title` (`default` cùng `template: '%s · Wordmet'`),
  `description`, `applicationName`, `alternates.canonical` (`/vi` hoặc `/en`), `alternates.languages`
  (`vi`, `en`, `x-default: '/'`), `openGraph` (`type: website`, `locale: vi_VN | en_US`, `alternateLocale`,
  `siteName`, `url`), `twitter` (`summary_large_image`), `robots` (`index` theo `indexable`), `formatDetection`
  (tắt tự nhận số điện thoại), `icons`. Export `viewport` có `themeColor` bằng token `bg`.
- `opengraph-image.tsx` theo từng ngôn ngữ, 1200×630, dùng font TTF trong `assets/fonts` (giấy phép OFL, ghi vào
  README). `alt` lấy từ messages.
- `sitemap.ts`: `/vi` và `/en`, mỗi mục kèm `alternates.languages`. `robots.ts`: cho phép crawl khi `indexable`, chặn
  hết khi không, có link sitemap. `manifest.ts`: tên, màu, icon.
- JSON-LD (component `JsonLd` render trên server): `WebSite` (tên, url, `inLanguage`) và `SoftwareApplication`
  (`applicationCategory: EducationalApplication`, `operatingSystem: Web`, `offers` giá 0). Không đưa số người dùng
  hay đánh giá.
- `privacy`, `terms`: `robots: noindex` cho tới khi có nội dung chính thức.

## 8. Form email (W3, W4)

- `features/waitlist/schema.ts` (`zod`): `email` (trim, lowercase, định dạng email, ≤254 ký tự), `consent` phải là
  `'on'`, `locale` thuộc `vi`/`en`, `company` là trường bẫy bot, phải rỗng.
- `actions.ts` (`'use server'`), `joinWaitlist(prev, formData)` trả
  `{ status: 'idle' | 'invalid_email' | 'missing_consent' | 'success' | 'error', email? }`:
  - Bẫy bot có giá trị → trả `success` nhưng không lưu (không cho bot biết đã bị chặn).
  - Email đã có trong danh sách → vẫn trả `success` (chống dò email, context doc 11.2).
  - Lỗi của store → `error`, giữ lại email đã nhập.
- `store.ts`: interface `WaitlistStore { add(email, locale): Promise<'created' | 'exists'> }`. `memory-store.ts` là bản
  dùng cho dev và test. Chưa có store thật, nên Server Action lấy store từ một factory; khi `NODE_ENV=production` mà
  chưa cấu hình store thật thì log cảnh báo một lần. Nối Resend là việc riêng sau này.
- `WaitlistForm` (client): `<form action>` dùng `useActionState`. Có `<label>` thật cho ô email (có thể ẩn bằng
  `VisuallyHidden`), `type="email"`, `autoComplete="email"`, `inputMode="email"`, `required`. Ô tick có `<label>` bấm
  được, link mở Chính sách. Lỗi gắn vào ô bằng `aria-describedby` và `aria-invalid`. Thông báo thành công nằm trong
  `role="status"`. Khi đang gửi, nút bị khóa và đổi chữ. Không có JS thì form vẫn gửi được, nhờ Server Action hỗ trợ
  form HTML thường.
- **Lệch giữa Figma và W4 (đọc 08/10):** trên trang Figma, form ở Hero không có phần đồng ý; Final CTA dùng dòng chữ
  "Khi đăng ký, bạn đồng ý với Chính sách bảo mật." (bản A). Ô tick (bản B) chỉ có trên bảng "States – Email form
  (VI)". **Chốt 08/10:** cả hai form đều có ô tick bắt buộc (W4). Phần này thiết kế thẳng trong code UI, **không sửa
  Figma**. Cách làm:
  - Ô tick nằm dưới hàng ô email + nút, thay cho dòng chữ ở Final CTA.
  - Ô vuông 20px, viền `border-strong`, khi tick thì nền `primary` và dấu ✓ màu `on-primary`.
  - Nhãn bấm được, cỡ chữ `small`; "Chính sách bảo mật" là link.
  - Vùng bấm gồm cả nhãn, cao tối thiểu 44.
  - Lỗi thiếu đồng ý hiện ngay dưới, viền ô chuyển `danger-strong`.
  - Trên nền `primary` của Final CTA: chữ và viền ô dùng `on-primary`. Trạng thái đã tick đảo màu (nền `on-primary`,
    dấu ✓ `primary`). Độ tương phản kiểm bằng test `LP12`.
- Chữ trạng thái (lỗi email, thiếu đồng ý, đang gửi, thành công, lỗi mạng) lấy từ bảng "States – Email form (VI)".
  Chữ trên nút theo trang ("Nhận thông báo ra mắt"), vì bảng còn ghi chữ cũ "Nhận tin khi ra mắt". Bảng chỉ có bản VI,
  nên chữ trạng thái bản EN phải dịch khi trích chữ.

## 9. Test (W5)

- **Vitest** (`environment: jsdom` cho component, `node` cho phần còn lại):
  - `pickLocale` với đủ tổ hợp cookie / country / Accept-Language.
  - Hai file messages cùng tập key, không có chuỗi rỗng.
  - Schema và action của waitlist với memory store: mỗi nhánh trạng thái.
  - Reducer của cloze: chọn sai, chọn đúng, chuyển câu, Done, làm lại.
  - Token màu đạt ngưỡng tương phản (`LP12`).
  - Component: Flashcard lật và `aria-pressed`; ClozeCard công bố kết quả; WaitlistForm hiện đúng lỗi.
- **Playwright** (Chromium, hai viewport 1440×900 và 390×844; chạy trên `next build && next start`):
  - Chuyển trang ở `/` theo header.
  - Đổi ngôn ngữ và cookie.
  - Luồng form.
  - Luồng carousel bằng chuột và bằng bàn phím.
  - FAQ chỉ mở một mục (bỏ qua nếu trình duyệt không hỗ trợ `name`).
  - Không cuộn ngang ở 390px.
  - axe không có vi phạm mức `serious`/`critical` ở cả hai ngôn ngữ và hai viewport.
  - Các thẻ metadata có mặt.
- **CI:** thêm job `web` vào `.github/workflows/ci.yml`: install → lint (ESLint, `check-tailwind-raw`) → `tsc --noEmit`
  → unit → build → cài trình duyệt Playwright → e2e. Job `api` không đổi.

## 10. Tiêu chí — «When … then …»

| # | When | Then |
|---|---|---|
| LP1 | Chạy `pnpm --filter web build` | Build xong, không lỗi type hay lint |
| LP2 | Đọc kết quả build | `/vi` và `/en` là trang tĩnh (prerender) |
| LP3 | So `vi.json` với `en.json` | Cùng tập key, không có giá trị rỗng |
| LP4 | Request `/` có header `x-vercel-ip-country: VN` và không có cookie | 307 tới `/vi`, có `Cache-Control: private, no-store` |
| LP5 | Request `/` có cookie ngôn ngữ `en` và header quốc gia `VN` | 307 tới `/en` (cookie thắng) |
| LP6 | Request `/` không có header quốc gia, `Accept-Language: vi-VN` | 307 tới `/vi` |
| LP7 | Request `/` không có header quốc gia, `Accept-Language: en-US` | 307 tới `/en` |
| LP8 | Mở `/vi` từ một IP ngoài Việt Nam | Trả 200 tiếng Việt, không chuyển trang |
| LP9 | Bấm VI/EN trong header ở `/vi` | Sang `/en`. Lần mở `/` sau đó vào `/en` |
| LP10 | Xem nguồn HTML của `/vi` và `/en` | Có `title`, `description`, `canonical`, `hreflang` vi/en/x-default, `og:*`, `twitter:*`, JSON-LD hợp lệ, `<html lang>` đúng |
| LP11 | `NEXT_PUBLIC_INDEXABLE` không đặt | `robots.txt` chặn hết, trang có `noindex` |
| LP12 | Chạy test token | Mọi cặp chữ/nền đạt ≥4,5, viền ô nhập và ô tick đạt ≥3 |
| LP13 | Chạy `check-tailwind-raw` trên `src` | Không còn class giá trị tùy ý chưa ghi chú `raw-ok` |
| LP14 | Gửi form với email sai định dạng | Hiện lỗi dưới ô (`aria-invalid`), không lưu, giữ chữ đã nhập |
| LP15 | Gửi form email đúng nhưng chưa tick | Hiện lỗi đồng ý, không lưu |
| LP16 | Gửi form email đúng, đã tick | Hiện thông báo thành công trong `role="status"`; store có email đã chuẩn hóa |
| LP17 | Gửi lại cùng email | Vẫn hiện thành công; store không có bản ghi trùng |
| LP18 | Trường bẫy bot có giá trị | Hiện thành công; store không lưu |
| LP19 | Store ném lỗi | Hiện lỗi "chưa gửi được", giữ email |
| LP20 | Trong carousel chọn sai rồi chọn đúng | Lần lượt hiện báo sai rồi báo đúng (kèm giải thích và bản dịch), có thông báo qua `aria-live` |
| LP21 | Bấm › ba lần, hoặc ← → khi carousel đang focus | Chuyển câu đúng thứ tự. Sau câu 3 hiện Done; nút "luyện lại" về câu 1 |
| LP22 | Bấm flashcard hoặc nhấn Enter/Space khi focus | Lật mặt, `aria-pressed` đổi |
| LP23 | Mở một mục FAQ | Mục đang mở trước đó tự đóng (trình duyệt hỗ trợ `name`) |
| LP24 | Viewport 390 | `document.scrollingElement.scrollWidth` ≤ 390 |
| LP25 | Chạy axe ở 2 ngôn ngữ × 2 viewport | Không có vi phạm `serious` hoặc `critical` |
| LP26 | Bật `prefers-reduced-motion: reduce` | Không có transform hay animation khi cuộn, lật, đổi câu |
| LP27 | Tắt JS rồi mở `/vi` | Đọc được toàn bộ chữ, FAQ mở/đóng được, form vẫn gửi được |
| LP28 | Card giữa của carousel chuyển sang `correct` (có giải thích và bản dịch) | Khung carousel cao lên theo card; không phần nào bị cắt (ở cả 1440 và 390) |
| LP29 | Ở 390, cuộn dải "How it works" tới hết | Khoảng từ cạnh phải card cuối tới mép màn hình bằng khoảng từ mép trái tới card đầu (20) |
| LP30 | Mở `/vi` và `/en` | FAQ có đúng 4 mục, mục đầu mở sẵn; cả form ở Hero và ở Final CTA đều có ô tick đồng ý |
| LP31 | Đọc các token `--text-*`, `--radius-*`, `--shadow-*`, `--container-*` trong `globals.css` | Không giá trị nào chứa `px`; ba token `clamp()` cho đúng 36/28/28px ở 390 và 60/44/40px ở 1440 |
| LP32 | Đặt cỡ chữ gốc của trang thành 125% (giống người dùng chỉnh cỡ chữ trình duyệt); xem ở 390 và 768 | Chữ thân lớn lên 25%, không có cuộn ngang, không chữ nào bị cắt |

## 11. Trường hợp biên

| # | When | Then |
|---|---|---|
| LPE1 | Header quốc gia là `XX`, `T1` hoặc rỗng (chạy local, Tor) | Bỏ qua bước quốc gia, xét `Accept-Language` |
| LPE2 | Cookie ngôn ngữ có giá trị lạ (vd `fr`) | Coi như không có cookie |
| LPE3 | Có cả `x-vercel-ip-country` và `cf-ipcountry` | Ưu tiên `x-vercel-ip-country` (**ASSUMPTION**: hosting chưa chọn; chốt khi deploy) |
| LPE4 | Truy cập `/vi/khong-ton-tai` | `not-found` theo ngôn ngữ, trả 404 |
| LPE5 | Truy cập `/fr` | Kết thúc ở trang 404 theo ngôn ngữ. next-intl có thể chuyển `/fr` thành `/vi/fr` hoặc `/en/fr` trước, vì nó coi `fr` là một path chứ không phải ngôn ngữ (**ASSUMPTION**, e2e kiểm) |
| LPE6 | Gửi form hai lần liên tiếp (bấm đúp) | Nút bị khóa khi đang gửi. Nếu vẫn gửi trùng, store trả `exists` nên không có bản ghi trùng |
| LPE7 | Email có hoa thường hoặc khoảng trắng thừa | Chuẩn hóa trước khi lưu và so trùng |
| LPE8 | Hai form (Hero và Final CTA) trên cùng một trang | `id` của input và lỗi khác nhau; gửi form này không đổi trạng thái form kia |
| LPE9 | Khách đang ở chế độ giảm chuyển động mà vuốt carousel | Đổi câu tức thì, không có hiệu ứng scale |
| LPE10 | Trình duyệt không hỗ trợ `<details name>` | Nhiều mục FAQ mở được cùng lúc. Chấp nhận |
| LPE11 | Server khởi động lại | Memory store mất dữ liệu. Chấp nhận vì chỉ dùng cho dev |
| LPE12 | Production chưa cấu hình store thật | Log cảnh báo một lần lúc khởi tạo; form vẫn trả thành công và lưu vào bộ nhớ. **Không được deploy thật trước khi nối store** (mục 13) |

## 12. Ngoài phạm vi

Deploy, hosting và domain. Nối Resend và gửi thư. Cloudflare Web Analytics. Nội dung chính thức của Chính sách bảo mật
và Điều khoản: chỉ dựng trang nháp `noindex`, nội dung pháp lý phải viết và kiểm riêng trước khi ra mắt. Dải gợi ý
"View in English?". App học, trang admin, `admin-api.`. Cập nhật lại các biến màu trên Figma theo 6.2 (việc trên Figma,
không phải code). Chỉnh các "dấu hiệu trang mẫu" mà skill `frontend-design` nêu (chờ chủ dự án quyết).

## 13. Rủi ro và việc còn mở

- **Chưa có store thật.** Không được deploy production khi form vẫn lưu vào bộ nhớ, vì email người dùng sẽ mất.
- **Pháp lý:** ô tick an toàn hơn theo Luật BVDLCN 2025 là `ASSUMPTION`, vì chưa đọc văn bản gốc.
- **next-intl và cookie:** cách next-intl lưu cookie khi đổi ngôn ngữ chưa chạy thử; `LP5` và `LP9` sẽ kiểm.
- **Màu mới lệch Figma:** ba token ở 6.2 khiến mockup lệch nhẹ so với code cho tới khi cập nhật Figma.
- **Ảnh OG** cần file TTF của Be Vietnam Pro trong repo (OFL); phải ghi nguồn tải và giấy phép.
- **Hai form trên một trang** là lựa chọn của mockup; nếu thấy thừa có thể bỏ form ở Final CTA, chỉ để nút cuộn lên.
