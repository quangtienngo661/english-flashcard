# Làm mới giao diện landing theo hướng B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đổi lớp nhìn của landing (`apps/web`) sang hướng B (nền xanh `#2445d6`, Lexend, miếng dán vàng `#ffd84a`, motion có độ nảy ở bài điền từ), giữ nguyên hành vi, chữ và form waitlist; tạo package token dùng chung `packages/design-tokens` mà admin sẽ dùng ở plan sau.

**Architecture:** Màu, bo góc, bóng gờ, thời lượng, easing và font chuyển vào `packages/design-tokens/theme.css` (Tailwind v4 `@theme`); `apps/web/src/app/globals.css` `@import` file đó và chỉ giữ token riêng của landing (cỡ chữ, container, keyframes). Carousel ở Hero được thay bằng một thẻ (`ClozePractice` + `ClozeCard`); hiệu ứng miếng dán bay vào nằm trong helper DOM `src/lib/fly-into.ts` (Web Animations API, không thư viện). Các section chỉ đổi class.

**Tech Stack:** Next 16.3.8, React 19.3.0, next-intl 4.14.9, Tailwind 4.3.3 (`@tailwindcss/postcss`), Vitest 4.1.11 + Testing Library, Playwright 1.63.0 + axe 4.13.0, OpenNext Cloudflare 1.20.7. Không thêm dependency ngoài `@wordmet/design-tokens` (`workspace:*`).

**Spec:** [`../specs/2026-10-15-ui-refresh-b-design.md`](../specs/2026-10-15-ui-refresh-b-design.md) (UB1–UB19, UBC1–UBC18, UBE1–UBE35; đọc §2–§5, §7.1–§7.4, §8–§10 trước mọi task). Phương án đã bỏ: [`../decisions/2026-10-15-ui-refresh-b-decisions.md`](../decisions/2026-10-15-ui-refresh-b-decisions.md). Hành vi gốc của landing: [`../specs/2026-10-08-landing-page-design.md`](../specs/2026-10-08-landing-page-design.md) (LP#, LPE#). Hình tham chiếu: [`../../mockups/2026-10-15/landing-b.html`](../../mockups/2026-10-15/landing-b.html). Plan này chỉ gồm landing và package token; plan admin viết sau khi PR #19 merge (UB19).

## Global Constraints

- Đường dẫn tính từ `apps/web/` trừ khi bắt đầu bằng `packages/`, `docs/` hoặc là file ở gốc repo. Lệnh chạy từ `apps/web/`. Trên Windows: lint, typecheck, unit, `pnpm build` chạy trực tiếp; e2e chạy bằng `pnpm cf:docker [Playwright args]` (OpenNext không build được trên Windows, README §Windows).
- Nhánh `feat/ui-b-landing` cắt từ `origin/dev`, làm trong worktree riêng (`superpowers:using-git-worktrees`); thư mục chính đang ở `docs/buoc-2-5-design` với file chưa commit, không đụng tới. Commit local bình thường; push và mở PR vào `dev` không cần hỏi; **merge chỉ khi chủ dự án yêu cầu**; quét secret trước mỗi lần push. Conventional Commits, kết bằng dòng `Co-Authored-By` của phiên.
- Không thêm thư viện (UB1). Ngoại lệ duy nhất: `"@wordmet/design-tokens": "workspace:*"` trong `apps/web/package.json`.
- Không đổi chữ (UB5, UB17). Thay đổi duy nhất ở `messages/{vi,en}.json`: xóa `Cloze.prev` và `Cloze.next` (Task 7, không còn chỗ dùng). Nút ở header và Gói học dùng `Nav.cta` có sẵn.
- Không đổi hành vi waitlist (UB4): không sửa `src/features/waitlist/**` (schema, action, store, labels); ô tick vẫn bắt buộc.
- Không sửa `apps/admin/**` trừ lần chạy thử ở Task 1 (hoàn tác, không commit).
- W6 (không định nghĩa component trong `page.tsx`/`layout.tsx`), W7 (không giá trị Tailwind tùy ý `-[...]`, không `style={}` trong `.tsx` trừ dòng có `// raw-ok:` ngay trên), W8 (`'use client'` chỉ khi gọi hook), W15 (token theo rem).
- **Tên token Tailwind v4 (đã kiểm 15/10/2026):** class `duration-*` chỉ đọc `--transition-duration-*`. Một lần build thử với `@theme { --duration-fast: 150ms }` cho ra **không có rule nào** cho `duration-fast`. `ease-*` đọc `--ease-*`, `animate-*` đọc `--animate-*`. Vì vậy các tên `--duration-instant/fast/base/slow` trong spec §4.4 được khai báo là `--transition-duration-instant/fast/base/slow`. Hệ quả: các class `duration-fast` hiện có trong landing đang không có tác dụng; chúng chỉ có hiệu lực từ Task 1.
- Motion (UB18): mọi chuyển động landing ≤ 400ms; `--ease-spring` chỉ dùng cho miếng dán bay, ô trống nảy, thẻ rơi vào. Keyframes chỉ gắn qua `motion-safe:`; mọi lời gọi `element.animate` phải kiểm `useReducedMotion()` trước (UBE1: quy tắc CSS giảm chuyển động trong `globals.css` không chặn Web Animations API).
- Trạng thái app không bao giờ chờ chuyển động (spec §7, nguyên tắc chung).
- Màu chỉ khai báo trong package (UBC1): sau Task 1, `src/app/globals.css` không còn dòng `--color-`.

## Review Focus

1. **Nút đăng ký ở header khi đang ở `/vi/privacy` hoặc `/en/terms`** (từ `md`): người dùng mong về trang chủ và thấy form. Test ở Task 4.
2. **Đăng ký thành công rồi bấm lại nút đăng ký** (header, Gói học, màn Xong): form đã đổi thành thông báo thành công, nên đích `#waitlist-hero` phải còn tồn tại, nếu không nút sẽ không làm gì. Test ở Task 5.
3. **Đổi ngôn ngữ (rời trang) khi miếng dán đang bay:** bản sao được gắn vào `document.body`, nằm ngoài cây React, nên unmount không tự gỡ nó. Mong đợi: không còn bản sao nào. Test ở Task 7.
4. **Bề rộng 768 bản EN và cỡ chữ gốc 125%:** header (hai link, VI/EN, nút) không được xuống hàng, và đích cuộn không bị header dính (cao hơn) che. Test ở Task 4.
5. **Windows chế độ tương phản cao (forced colors):** miếng dán và ô tick chỉ phân biệt bằng màu nền, nên ở chế độ này sẽ mất viền. Mong đợi: vẫn thấy viền. Test ở Task 5 (ô tick) và Task 7 (miếng dán).

---

### Task 1: Package `@wordmet/design-tokens` và chuyển token màu, bo góc, bóng, motion

**Files:**
- Create: `packages/design-tokens/package.json`, `packages/design-tokens/theme.css`, `packages/design-tokens/README.md`
- Modify: `package.json` (dependency), `pnpm-lock.yaml` (qua `pnpm install`), `src/app/globals.css`, `src/styles/tokens.test.ts`, và các file dùng token bị đổi tên: `src/components/ui/{Section,Button}.tsx`, `src/components/sections/{Problem,HowItWorks,Hero,Faq,AiPractice,Plans}.tsx`, `src/components/layout/{SiteHeader,SiteFooter,Logo}.tsx`, `src/components/interactive/{WaitlistForm,Flashcard,Reveal}.tsx`, `src/components/interactive/cloze/{ClozeCard,ClozeCarousel}.tsx`

**Interfaces:**
- Produces: CSS `@import '@wordmet/design-tokens/theme.css';` và các token dưới đây (tên là hợp đồng cho mọi task sau và cho plan admin).

`packages/design-tokens/package.json`: `{ "name": "@wordmet/design-tokens", "version": "0.0.1", "private": true, "exports": { "./theme.css": "./theme.css" } }`.

`theme.css` (một khối `@theme`, giá trị lấy nguyên từ spec §4.1, §4.4, §4.5):

```css
@theme {
  --color-primary: #2445d6;      --color-primary-deep: #1a32a6;  --color-primary-soft: #eceffe;
  --color-on-primary: #ffffff;   --color-on-primary-muted: #dfe5ff;
  --color-accent: #ffd84a;       --color-accent-deep: #c9a21a;   --color-accent-soft: #fff4c7;
  --color-ink: #0f1a3d;          --color-muted: #4d5577;         --color-placeholder: #5f6688;
  --color-surface: #ffffff;      --color-canvas: #f1f3fd;
  --color-border: #e3e6f4;       --color-border-strong: #7d84a8;
  --color-success: #1b7a46;      --color-success-soft: #e3f4ea;  --color-warning: #7a5200;
  --color-danger: #b8352a;       --color-danger-soft: #fde8e5;   --color-neutral-soft: #eef0f5;
  --color-wrong-chip: #ffd3cd;   --color-wrong-chip-deep: #d99b92;

  --radius-sm: 0.5rem; --radius-control: 0.75rem; --radius-inner: 0.875rem;
  --radius-panel: 1rem; --radius-card: 1.25rem; --radius-feature: 1.5rem;

  --shadow-ledge: 0 0.25rem 0 rgb(15 26 61 / 0.35);
  --shadow-ledge-accent: 0 0.25rem 0 var(--color-accent-deep);
  --shadow-ledge-wrong: 0 0.25rem 0 var(--color-wrong-chip-deep);
  --shadow-ledge-card: 0 1.5rem 0 var(--color-primary-deep);
  --shadow-ledge-soft: 0 0.3rem 0 var(--color-border);

  --transition-duration-instant: 100ms; --transition-duration-fast: 150ms;
  --transition-duration-base: 250ms;    --transition-duration-slow: 400ms;
  --motion-wiggle: 300ms; --motion-pop: 320ms; --motion-toast: 300ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-enter: cubic-bezier(0.05, 0.7, 0.1, 1);
  --ease-exit: cubic-bezier(0.3, 0, 0.8, 0.15);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

Đổi tên trong landing (cơ học, chưa đổi bố cục; áp cho cả class có tiền tố như `hover:bg-bg`): `bg-bg` → `bg-canvas`; `bg-marker` → `bg-accent`; `*-success-strong` → `*-success`; `*-danger-strong` → `*-danger`; `shadow-card`/`shadow-control` → `shadow-ledge-soft`; `ease-out` → `ease-standard`. `globals.css` bỏ mọi `--color-*`, `--radius-*`, `--shadow-*`, `--duration-*`, `--ease-out`; giữ `--text-*`, `--container-*`, `--transition-duration-{carousel,carousel-drag,reveal,flip,faq}` (Task 7 và Task 10 xử lý tiếp) và khối `@theme inline` của font (Task 2 xử lý).

- [ ] **Step 1: Viết test đỏ** trong `src/styles/tokens.test.ts`: đọc theme bằng `createRequire(import.meta.url).resolve('@wordmet/design-tokens/theme.css')` (đồng thời chứng minh app giải được package), gộp với `globals.css` cho LP31.
  - `LP12 text and control colors meet WCAG contrast`: chữ ≥ 4,5 cho `ink/surface, ink/canvas, ink/accent, ink/accent-soft, ink/wrong-chip, muted/surface, muted/canvas, muted/primary-soft, muted/accent, primary/surface, primary/primary-soft, on-primary/primary, on-primary-muted/primary, success/surface, success/success-soft, danger/surface, danger/danger-soft, warning/accent-soft, placeholder/surface, placeholder/canvas`; viền ≥ 3 cho `border-strong/surface, border-strong/canvas, on-primary/primary, ink/accent, accent/primary, primary/accent, primary/surface`.
  - `LP31 size tokens use rem and the clamp tokens hit the Figma sizes`: như hiện nay, `radius`/`shadow` đọc từ package.
  - `UBC1 apps/web declares no color tokens`: `globals.css` không khớp `/--color-/`.
- [ ] **Step 2:** `pnpm test src/styles/tokens.test.ts` → FAIL (`Cannot find module '@wordmet/design-tokens/theme.css'`).
- [ ] **Step 3:** Tạo ba file của package; README gồm bảng token (tên → giá trị → dùng ở) chép từ spec §4.1 và danh sách cặp tương phản ở Step 1. Thêm dependency vào `apps/web/package.json`, chạy `pnpm install` ở gốc repo. Trong `globals.css` thêm `@import '@wordmet/design-tokens/theme.css';` ngay sau `@import 'tailwindcss';`, xóa các token đã chuyển, rồi đổi tên trong các file ở trên.
- [ ] **Step 4:** `pnpm test` → PASS toàn bộ; `pnpm lint`, `pnpm typecheck` sạch; `pnpm build` thành công (`ASSUMPTION` của spec §3 với Turbopack được kiểm ở bước này).
- [ ] **Step 5: Chạy thử với admin, không commit.** Thêm `"@wordmet/design-tokens": "workspace:*"` vào `apps/admin/package.json`, `pnpm install`, thêm cùng dòng `@import` vào `apps/admin/src/styles/globals.css` ngay sau `@import 'tailwindcss';`, chạy `pnpm --filter admin build`. Đạt khi build xong và `apps/admin/dist/assets/*.css` chứa `#ffd84a`. Sau đó `git checkout -- apps/admin pnpm-lock.yaml` và `pnpm install`; `git status` không còn thay đổi nào dưới `apps/admin`. Nếu Next hoặc Vite không giải được `@import`: dùng phương án dự phòng của spec §3 cho app đó (chép `theme.css` vào app kèm test so khớp nội dung), ghi lý do vào delivery record.
- [ ] **Step 6: Commit** `feat(tokens): add shared design-tokens package with the B palette and motion`

### Task 2: Font Lexend và ảnh chia sẻ (OG)

**Files:**
- Modify: `src/app/[locale]/layout.tsx`, `src/app/globals.css`, `packages/design-tokens/theme.css`, `src/app/[locale]/opengraph-image.tsx`, `scripts/gen-og-fonts.mjs`, `src/app/[locale]/og-fonts.generated.ts` (sinh ra), `assets/fonts/*`, `e2e/chrome.spec.ts`

**Interfaces:**
- Produces: `--font-sans: var(--font-lexend, 'Lexend'), ui-sans-serif, system-ui, sans-serif;` trong `theme.css`; `og-fonts.generated.ts` export `lexendRegular`, `lexendExtraBold` (base64).

- [ ] **Step 1: Sửa test đỏ** `e2e/chrome.spec.ts` → `Review#1 H1 renders in Lexend with Vietnamese glyphs`: `family` khớp `/Lexend/`, `document.fonts.check(...)` là `true`.
- [ ] **Step 2:** `layout.tsx`: `Lexend({ subsets: ['latin', 'vietnamese'], display: 'swap', variable: '--font-lexend' })` thay `Be_Vietnam_Pro`; `<html className={lexend.variable}>`. Chuyển `--font-sans` vào `theme.css`, xóa khối `@theme inline` ở `globals.css`. Phần dự phòng `'Lexend'` trong `var()` là bắt buộc (spec §4.3).
- [ ] **Step 3: Font cho OG, cần chủ dự án cho phép tải file.** Hỏi trước, nêu rõ tên file, nguồn và dung lượng: hai bản tĩnh `Lexend-Regular.ttf` (400) và `Lexend-ExtraBold.ttf` (800) kèm `OFL.txt`, lấy từ repo gốc của Lexend hoặc gói tải của Google Fonts. Đặt vào thư mục `assets/fonts/` mới tạo (tải vào thư mục riêng, không chạy file nào từ đó). Thay `OFL.txt`, cập nhật `assets/fonts/README.md` (nguồn, giấy phép), xóa hai file Be Vietnam Pro. Kiểm `OFL.txt` đúng là SIL OFL 1.1 (`ASSUMPTION` của spec §4.3); nếu không đúng thì dừng và báo.
- [ ] **Step 4:** `gen-og-fonts.mjs` đọc hai file Lexend và export `lexendRegular`, `lexendExtraBold`; chạy `pnpm gen:og-fonts`. `opengraph-image.tsx` (W7 không áp vì là route ảnh): `fontFamily: 'Lexend'`, nền `#2445d6`, logo `_ _` nền `#ffd84a` chữ `#0f1a3d`, tiêu đề `#ffffff`, dòng chip `#dfe5ff`; giữ comment "mirrors the design tokens".
- [ ] **Step 5:** `pnpm test`, `pnpm lint`, `pnpm build` sạch; `pnpm cf:docker --project=desktop e2e/chrome.spec.ts e2e/seo.spec.ts` → PASS. Mở `/vi/opengraph-image` trên bản `pnpm dev` và nhìn tận mắt ảnh có dấu tiếng Việt đúng.
- [ ] **Step 6: Commit** `feat(web): switch the landing and og image to lexend`

### Task 3: Thành phần cơ bản theo áo B

**Files:**
- Modify: `src/components/ui/{Button,ButtonLink,Section,SectionHeading,Chip}.tsx`, `src/components/layout/{Logo,LanguageSwitch}.tsx`, `src/app/globals.css` (viền focus), `src/components/ui/ui.test.tsx`, `src/components/layout/language-switch.test.tsx`

**Interfaces:**
- Produces: `type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ink'` (bỏ `inverse`); `buttonBase`, `buttonVariants` export như cũ. `Section` prop `tone: 'surface' | 'tint' | 'primary' | 'accent'` (bỏ `bg`). `Logo` prop `tone?: 'default' | 'onPrimary'`.

Kiểu: `primary` = `bg-primary text-on-primary shadow-ledge`; `accent` = `bg-accent text-ink shadow-ledge`; `ink` = `bg-ink text-on-primary`; `secondary` = `bg-surface text-ink ring-2 ring-inset ring-border-strong`. `buttonBase` thêm `transition duration-instant ease-standard active:translate-y-1 active:shadow-none motion-reduce:active:translate-y-0`, giữ `min-h-11`. Section tones: `surface` → `bg-surface`, `tint` → `bg-primary-soft`, `primary` → `bg-primary text-on-primary`, `accent` → `bg-accent`. Viền focus toàn trang `3px solid var(--color-primary)`, offset 3px; trong `.bg-primary` dùng `--color-accent`; trong `.bg-accent` dùng `--color-primary`. LanguageSwitch trên nền xanh: khung `bg-on-primary/15`, mục đang chọn `bg-ink text-on-primary`, mục khác `text-on-primary-muted hover:text-on-primary`.

- [ ] **Step 1: Sửa test đỏ** `ui.test.tsx`: `Button exposes the four B variants with min height 44` (mỗi variant có đúng class nền/chữ ở trên và `min-h-11`); `Section maps each tone to its background`. `language-switch.test.tsx`: giữ hành vi, thêm assert mục đang chọn có `bg-ink`.
- [ ] **Step 2:** `pnpm test src/components/ui src/components/layout` → FAIL.
- [ ] **Step 3:** Sửa các component; đổi mọi chỗ gọi `tone="bg"` thành `tone="surface"` (`HowItWorks`, `Plans`). Variant `inverse` không có chỗ nào gọi (đã grep 15/10/2026: `WaitlistForm` tone `inverse` dùng nút `secondary`), nên chỉ cần xóa khỏi `buttonVariants`.
- [ ] **Step 4:** `pnpm test`, `pnpm lint`, `pnpm typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(web): restyle buttons, sections, logo and language switch for direction b`

### Task 4: Header dính từ `md` kèm nút đăng ký, footer, màu thanh trình duyệt

**Files:**
- Modify: `src/components/layout/{SiteHeader,SiteFooter}.tsx`, `src/components/ui/Section.tsx`, `src/app/globals.css`, `src/app/[locale]/layout.tsx`, `e2e/page.spec.ts`

**Interfaces:**
- Consumes: `buttonBase`, `buttonVariants.accent` (Task 3), `Logo tone="onPrimary"`.
- Produces: token `--spacing-header: 4.5rem` (class `min-h-header`, `md:scroll-mt-header`); quy ước đích cuộn dùng `scroll-mt-4 md:scroll-mt-header`.

Header (UB16, cách 1): `<header className="bg-primary md:sticky md:top-0 md:z-40">`, hàng có `md:min-h-header`; logo `tone="onPrimary"`; hai link hiện có `text-on-primary-muted hover:text-on-primary`; nút là `Link` của next-intl `href="/#waitlist-hero"`, class `cn(buttonBase, buttonVariants.accent, 'hidden md:inline-flex')`, chữ `t('cta')`. Dưới `md`: không dính, không nút. Footer: `bg-surface border-t border-border`, nội dung giữ nguyên. `viewport.themeColor = '#2445d6'` (comment: khớp token `primary`).

- [ ] **Step 1: Viết test e2e đỏ** trong `describe('layout')` của `page.spec.ts`:
  - `UBC5 at 1440 and 768 the header stays on top and its CTA scrolls to the hero form`: ở 1440 và 768 (VI và EN), cuộn tới `#faq`, `header` có `boundingBox().y` bằng 0; bấm link tên `copy[locale].Nav.cta` trong `banner`; `#waitlist-hero` nằm trong viewport và `top ≥ header.bottom − 1`.
  - `UB16 below md the header has no CTA and scrolls away`: ở 390, link `Nav.cta` trong `banner` không hiện; sau khi cuộn 600px, `header.boundingBox().y < 0`.
  - `RF1 header CTA from a legal page lands on the home form`: ở 1440, mở `/vi/privacy`, bấm nút → URL khớp `/\/vi#waitlist-hero$/`, `#waitlist-hero` hiện.
  - `RF4 at 768 with 125% root text the header stays on one row and anchors clear it`: 768 × (VI, EN), chèn `html { font-size: 125% !important; }`; mọi con trực tiếp của hàng header có cùng `top` ±2; bấm nút → `#waitlist-hero` có `top ≥ header.bottom − 1`; `scrollWidth ≤ innerWidth`.
  - `UBE12 without JavaScript the header CTA still jumps to the form` (trong khối `without JavaScript`, chỉ project `desktop`): bấm nút → URL khớp `#waitlist-hero$`, `#waitlist-hero` nằm trong viewport.
- [ ] **Step 2:** `pnpm cf:docker e2e/page.spec.ts -g "UBC5|UB16|RF1|RF4|UBE12"` → FAIL.
- [ ] **Step 3:** Sửa header, footer, `Section` (`scroll-mt-4 md:scroll-mt-header`), thêm `--spacing-header`, đổi `themeColor`.
- [ ] **Step 4:** Chạy lại 4 test trên cùng LP24, `skip link moves focus to main`, `Review#3` (thêm `copy.en.Nav.cta` vào danh sách phải gặp ở desktop) → PASS.
- [ ] **Step 5: Commit** `feat(web): add the sticky header cta from md and restyle the footer`

### Task 5: Hero trên nền xanh, form waitlist hai tone, dải CTA vàng

**Files:**
- Modify: `src/components/interactive/WaitlistForm.tsx`, `src/components/interactive/waitlist-form.test.tsx`, `src/components/sections/{Hero,FinalCta}.tsx`, `e2e/page.spec.ts`

**Interfaces:**
- Produces: `WaitlistForm` prop `tone: 'onPrimary' | 'onAccent'` (thay `default`/`inverse`); phần tử bọc ngoài cùng `<div id={`waitlist-${idPrefix}`} className="scroll-mt-4 md:scroll-mt-header">` chứa form **hoặc** thông báo thành công; thẻ `<form>` không còn `id`.

Tone theo spec §5.3: `onPrimary` (ô email `bg-surface`, không viền; nút `accent`; ô tick `size-5 border-2 border-on-primary checked:bg-accent checked:border-accent`, dấu ✓ `text-ink`; nhãn `text-on-primary-muted`), `onAccent` (ô email `ring-2 ring-inset ring-ink`; nút `ink`; ô tick `border-ink checked:bg-ink`, dấu ✓ `text-accent`; nhãn `text-muted`). Lỗi ở cả hai tone: `self-start rounded-sm bg-surface px-2.5 py-1.5 text-danger` (`danger` trên `accent` chỉ 4,24). Placeholder `placeholder:text-placeholder`. Thành công ở cả hai tone: `bg-surface text-ink`. Hero: `bg-primary text-on-primary`; mô tả và ghi chú `text-on-primary-muted`; thứ tự DOM chip → H1 → mô tả → form → ghi chú → khung bài luyện (`lg:col-start-2 lg:row-start-1 lg:row-span-5`), để trên điện thoại form đứng trước thẻ. FinalCta: `bg-accent`, tiêu đề `text-ink`, `tone="onAccent"`.

- [ ] **Step 1: Viết test đỏ** trong `waitlist-form.test.tsx`: đổi prop `tone` ở các test cũ (`default` → `onPrimary`, `inverse` → `onAccent`), giữ mọi assert hành vi; thêm `RF2 after success the waitlist-<prefix> wrapper still exists and holds the status message` (mock action trả `success` → `container.querySelector('#waitlist-hero')` khác `null` và chứa `role="status"`); thêm `LPE8 the two forms keep distinct ids`. E2E `page.spec.ts`: `S5.1 at 390 the hero form is inside the first screen` (390×844, `/vi`: đáy của `#waitlist-hero` ≤ 844); `RF5 the consent checkbox keeps a visible border in forced-colors mode` (`page.emulateMedia({ forcedColors: 'active' })`, ở cả hai form `getComputedStyle(cb).borderTopStyle` khác `'none'` và `borderTopWidth ≥ 2px`).
- [ ] **Step 2:** `pnpm test src/components/interactive/waitlist-form.test.tsx` → FAIL.
- [ ] **Step 3:** Sửa `WaitlistForm`, `Hero`, `FinalCta`.
- [ ] **Step 4:** `pnpm test` PASS; `pnpm cf:docker e2e/page.spec.ts -g "S5.1|RF5|LP14|LP30|LP27"` PASS (LP14–LP16 và LP30 dùng `#waitlist-hero …` nên vẫn chạy với phần tử bọc ngoài).
- [ ] **Step 5: Commit** `feat(web): put the hero and final cta on the b fields with two form tones`

### Task 6: Helper `flyInto` (miếng dán bay vào, dọn ở mốc sớm nhất)

**Files:**
- Create: `src/lib/fly-into.ts`, `src/lib/fly-into.test.ts`

**Interfaces:**
- Produces: `export type FlyOptions = { durationMs: number; easing: string; onLand: () => void }` và `export function flyInto(source: HTMLElement, target: HTMLElement, options: FlyOptions): () => void`. Giá trị trả về là hàm `cancel`.

Hành vi: tạo bản sao của `source` với `aria-hidden="true"`, `data-flyer=""`, `position: fixed` đúng ô chữ nhật của `source`, `pointer-events: none`, `z-index: 50`, `margin: 0`; gắn vào `document.body`; `animate` một `translate` từ tâm `source` tới tâm `target`. `land()` chạy **một lần** ở mốc sớm nhất trong ba (UB14): `animation.finished`; `setTimeout(durationMs + 80)`; sự kiện `visibilitychange` với `document.visibilityState === 'visible'`. `land()` gỡ bản sao, xóa hẹn giờ và listener, rồi gọi `onLand`. `cancel()` gọi `animation.cancel()`, gỡ bản sao, xóa hẹn giờ và listener, **không** gọi `onLand`; lỗi từ `finished` bị reject do cancel thì bỏ qua. Nếu `source.animate` không tồn tại: gọi `onLand` ngay, trả về hàm rỗng. Style của bản sao gán qua `element.style` trong file `.ts` (W7 chỉ quét `.tsx`).

- [ ] **Step 1: Viết test đỏ** (`// @vitest-environment jsdom`, `vi.useFakeTimers()`, mock `Element.prototype.animate` trả `{ finished, cancel: vi.fn() }` với `finished` điều khiển được):
  - `UBE5 lands once when the animation finishes` (`onLand` 1 lần, không còn `[data-flyer]`).
  - `UBE6 lands at durationMs + 80 when finished never resolves` (479ms chưa, 480ms rồi, với `durationMs: 400`).
  - `UBE7 lands at once when the tab becomes visible` (`visibilityState` `hidden` → sự kiện → chưa; `visible` → sự kiện → đã gọi, chưa cần chạy hẹn giờ).
  - `lands at most once when all three triggers fire`.
  - `UBE8 cancel removes the clone without landing and stops the timer` (`cancel()`, chạy 1000ms: `onLand` 0 lần, `animation.cancel` 1 lần, không còn `[data-flyer]`).
  - `the clone is aria-hidden and ignores the pointer`.
  - `without the Web Animations API it lands immediately`.
- [ ] **Step 2:** `pnpm test src/lib/fly-into.test.ts` → FAIL.
- [ ] **Step 3:** Viết `fly-into.ts`.
- [ ] **Step 4:** `pnpm test src/lib/fly-into.test.ts` → PASS; `pnpm lint` sạch.
- [ ] **Step 5: Commit** `feat(web): add the flyInto helper with earliest-of-three cleanup`

### Task 7: Bài điền từ một thẻ (`ClozePractice`), bỏ carousel

**Files:**
- Create: `src/components/interactive/cloze/ClozePractice.tsx`, `src/components/interactive/cloze/cloze-practice.test.tsx`
- Modify: `src/components/interactive/cloze/{cloze-state.ts,cloze-state.test.ts,ClozeCard.tsx}`, `src/components/sections/Hero.tsx`, `src/app/globals.css`, `messages/{vi,en}.json`, `e2e/page.spec.ts`, `e2e/a11y.spec.ts`
- Delete: `src/components/interactive/cloze/ClozeCarousel.tsx`, `src/components/interactive/cloze/cloze-carousel.test.tsx`

**Interfaces:**
- Consumes: `flyInto` (Task 6), `Button variant="ink"` (Task 3), `useReducedMotion`.
- Produces: `ClozePractice({ items: ClozeItem[]; labels: ClozeLabels; ctaHref: string })` (`'use client'`); `ClozeItem` không đổi; `ClozeLabels` bỏ `prev`, `next`. Reducer: mỗi phần tử của `results` thành `{ status: ClozeStatus; picked?: string; tried: string[] }`; action chỉ còn `pick | next | restart`.

Hành vi theo spec §5.2. Cụ thể:
- Chọn từ đã có trong `tried`, hoặc chọn khi câu đã `correct`, trả lại đúng state cũ.
- Miếng dán là `<button>` với `aria-disabled` (không dùng `disabled`); click khi `aria-disabled="true"` thì bỏ qua. Mỗi miếng có `border-2 border-transparent` để hiện viền ở chế độ forced colors.
- Kiểu miếng dán:
  - bình thường: `bg-accent shadow-ledge-accent`;
  - đã chọn sai: `bg-wrong-chip shadow-ledge-wrong motion-safe:animate-wiggle`;
  - mờ sau khi đúng: `opacity-35`;
  - miếng đã chọn đúng trong lúc bay: `opacity-0`.
- Ô trống hiện `?` cho tới khi `landed`, rồi hiện từ, màu `text-success border-success`, nảy bằng `motion-safe:animate-pop`.
- Khi chọn đúng: nếu `reduced` thì `landed = true` ngay. Nếu không, đọc `--transition-duration-slow` và `--ease-spring` từ `getComputedStyle(document.documentElement)` (thiếu giá trị thì dùng `400` và `cubic-bezier(0.34, 1.56, 0.64, 1)`), gọi `flyInto`, giữ hàm `cancel` trong ref.
- Focus chuyển sang nút `nextSentence` khi câu sang `correct`.
- "Câu tiếp", "Luyện lại" và unmount đều gọi `cancel` trước.
- Vùng `aria-live` (`data-testid="cloze-live"`) giữ nguyên logic chữ của bản cũ. `labels.headers[i]` render bằng `VisuallyHidden`. Đầu thẻ có `sourceChip` và 3 vạch tiến độ (`bg-success` khi câu xong, `bg-primary-soft` khi chưa).
- Thẻ: `data-testid="cloze-card"`, `rounded-feature bg-surface text-ink p-5 md:p-7 shadow-ledge-card md:tilt-card motion-safe:animate-card-in`, bọc trong `<section aria-label={labels.region}>`.

`globals.css`:
- thêm `@utility tilt-card { rotate: -1.5deg; }`;
- thêm `@theme` gồm `--animate-card-in: card-in var(--transition-duration-slow) var(--ease-spring) both`, `--animate-wiggle: wiggle var(--motion-wiggle) var(--ease-standard)`, `--animate-pop: pop var(--motion-pop) var(--ease-spring)`, cùng ba `@keyframes` lấy từ mockup B (`card-in` từ `opacity: 0; transform: translateY(2rem) rotate(3deg)`, `wiggle` 25/50/75% −6°/5°/−2°, `pop` 40% `scale(1.12)`);
- bỏ `@utility carousel-track` và `--transition-duration-carousel*`;
- đổi `--container-carousel` thành `--container-practice: 35rem`.

- [ ] **Step 1: Viết test reducer đỏ** (`cloze-state.test.ts`): `LP20` cập nhật kỳ vọng (`{ status: 'wrong', picked: 'delay', tried: ['delay'] }`); `UBE14 re-picking a tried wrong word returns the same state`; xóa test `prev`/`goTo`; giữ `LP21 next from the last item sets done; restart resets…`.
- [ ] **Step 2: Viết test component đỏ** (`cloze-practice.test.tsx`, jsdom, mock `matchMedia` như test cũ, mock `Element.prototype.animate`):
  - `LP20 the live region announces the wrong title, then the correct title with explanation and translation`.
  - `UBE15 a wrong sticker becomes aria-disabled and keeps focus`.
  - `UBE16 the right sticker dims the others and moves focus to the next button`.
  - `UBC4 next through every sentence shows Done; Again returns to sentence 1` (`doneCta` có `href="#waitlist-hero"`).
  - `UBE1 with reduced motion a right pick never calls animate and fills the gap at once`.
  - `with motion the gap shows ? until the sticker lands, then the answer`.
  - `UBE8 next during the flight leaves no [data-flyer] and shows the new sentence`.
  - `RF3 unmounting during the flight leaves no [data-flyer] in document.body`.
  - `UBE14 a double click on the right sticker animates once`.
- [ ] **Step 3:** `pnpm test src/components/interactive/cloze` → FAIL.
- [ ] **Step 4:** Sửa reducer, viết `ClozePractice`, viết lại `ClozeCard` (chỉ phần hiển thị, nhận state và ref qua props), cập nhật `Hero` (bỏ `prev`/`next` khỏi `labels`), xóa hai file carousel, xóa `Cloze.prev`/`Cloze.next` ở cả hai file messages, sửa `globals.css`.
- [ ] **Step 5: Sửa e2e:**
  - Xóa `describe('cloze carousel')` cùng các helper `activeSlide`, `expectCenteredSlide`, `dragActiveCard`.
  - Thêm `describe('cloze practice')` gồm:
    - `LP20/UBC4 wrong then right, then next to Done and Again` (`/en`);
    - `UBE11 without JavaScript the card shows sentence 1 with ? and four stickers` (trong khối `without JavaScript`);
    - `UBE1/UBE2 with reduce a wrong then right pick runs no animation` (trong khối `with reduce`: bấm `delay` rồi `deploy`, sau mỗi lần bấm `document.getAnimations().length` bằng 0; cuối cùng ô trống có chữ `deploy`);
    - `RF5 stickers keep a visible border in forced-colors mode`.
  - `Review#3`: danh sách phải gặp đổi thành `['delay', copy.en.Nav.cta]`.
  - `Review#5`: bộ chọn `[aria-roledescription="slide"] *` đổi thành `[data-testid="cloze-card"] *`.
  - `a11y.spec.ts`: bấm `deploy` trong `getByRole('region', { name: copy[locale].Cloze.region })`.
- [ ] **Step 6:** `pnpm test`, `pnpm lint`, `pnpm typecheck` PASS; `pnpm cf:docker` (cả `desktop` và `mobile`) PASS.
- [ ] **Step 7: Commit** `feat(web): replace the hero carousel with a single practice card`

### Checkpoint A: chủ dự án duyệt ảnh khung landing (UB11, UBC18)

- [ ] Chạy `pnpm cf:docker e2e/visual.spec.ts`, lấy ảnh trong `.docker-out/test-results/visual/` (`cf-docker.mjs` chép `test-results` ra đó); chụp thêm Hero ở trạng thái đúng/sai/Xong ở 1440 và 390 × VI/EN bằng trình duyệt trên bản `pnpm dev`.
- [ ] Gửi ảnh cho chủ dự án và **dừng** cho tới khi được duyệt. Sửa theo góp ý trước Task 8; mỗi lần sửa là một commit `fix(web): …`.

### Task 8: Các section còn lại theo áo B

**Files:**
- Modify: `src/components/sections/{Problem,HowItWorks,AiPractice,Faq}.tsx`, `src/components/sections/{LegalDraft,PrivacyPolicy}.tsx` và `src/app/[locale]/not-found.tsx` (chỉ nếu còn class lệch token), `e2e/page.spec.ts`

**Interfaces:**
- Consumes: `Section` tones (Task 3).

Theo spec §5.1:
- **Problem:** thẻ flashcard `bg-neutral-soft`, cột Wordmet `bg-primary-soft` (bỏ viền 2px), từ `s1`/`s2` `bg-success-soft text-success`, từ `s3` `bg-accent`.
- **HowItWorks:** thứ tự trong thẻ là số + `h3` → mô tả → hình (vẫn `lg:row-span-4 lg:grid-rows-subgrid`), nền thẻ theo thứ tự `bg-primary-soft` / `bg-accent-soft` / `bg-success-soft`, khung hình `bg-surface`. Dải vuốt trên điện thoại giữ nguyên (LP29).
- **AiPractice:** `tone="tint"`; thẻ minh họa `bg-surface shadow-ledge-soft`.
- **Faq:** mỗi mục `bg-primary-soft`, bỏ viền; khi mở thì `ring-2 ring-primary`.
- **Trang pháp lý và 404:** chỉ đổi màu nếu còn chỗ lệch.

- [ ] **Step 1: Viết test e2e đỏ** `S5.1 section backgrounds follow the B rhythm`: ở `/vi`, nền tính được (computed `background-color`) của từng section theo thứ tự là Hero `rgb(36, 69, 214)`, AiPractice `rgb(236, 239, 254)`, FinalCta `rgb(255, 216, 74)`; các section còn lại có nền trắng.
- [ ] **Step 2:** `pnpm cf:docker e2e/page.spec.ts -g "S5.1 section"` → FAIL.
- [ ] **Step 3:** Sửa các section.
- [ ] **Step 4:** Chạy lại cùng `steps equal height at 1440`, LP22, LP23, LP29, LP32, `Review#5` → PASS.
- [ ] **Step 5: Commit** `feat(web): restyle problem, steps, ai practice and faq for direction b`

### Task 9: Thẻ Gói học có nút đăng ký (UB7)

**Files:**
- Modify: `src/components/sections/Plans.tsx`, `e2e/page.spec.ts`

**Interfaces:**
- Consumes: `ButtonLink` (Task 3), chuỗi `Nav.cta`.

Mỗi thẻ thêm ở chân một `ButtonLink href="#waitlist-hero"` với chữ `t('cta')` của namespace `Nav`: gói `free` dùng `variant="secondary"`, gói `trial` dùng `variant="primary"`. Thẻ `trial` giữ viền `border-2 border-primary`, thêm `shadow-ledge-soft`. Hai thẻ cao bằng nhau, nút nằm ở đáy (`mt-auto`).

- [ ] **Step 1: Viết test e2e đỏ** `UBC6 each plan button scrolls to the hero form`: ở 1440 và 390 (VI), bấm từng nút trong section Gói học → `#waitlist-hero` nằm trong viewport.
- [ ] **Step 2:** chạy → FAIL. **Step 3:** sửa `Plans.tsx`. **Step 4:** chạy lại cùng LP24 → PASS.
- [ ] **Step 5: Commit** `feat(web): add waitlist buttons to the plan cards`

### Task 10: Thời lượng chuyển động ≤ 400ms và kiểm toàn trang (UB18)

**Files:**
- Modify: `src/app/globals.css`, `src/components/interactive/{Reveal,Flashcard}.tsx`, `src/components/sections/Faq.tsx`, `src/components/interactive/reveal.test.tsx`, `e2e/page.spec.ts`

Cụ thể:
- `Reveal`: `duration-slow ease-enter`, trễ `{ 0: 'delay-0', 1: 'delay-40', 2: 'delay-60' }`; vẫn dùng `translate-y-4 opacity-0` cho trạng thái ẩn (LP26 dựa vào hai class này).
- `Flashcard`: `duration-slow ease-standard`.
- FAQ: `--transition-duration-faq: 250ms`.
- Xóa `--transition-duration-reveal` và `--transition-duration-flip` khỏi `globals.css`.

- [ ] **Step 1: Viết test đỏ:** `reveal.test.tsx` thêm `step 2 uses a 60ms delay and the slow duration`. Thêm e2e `UBC8 no transition or animation on the landing lasts longer than 400ms`, chạy ở `/vi` và `/en`:
  - cuộn hết trang, mở một mục FAQ, lật flashcard, chọn đúng ở bài điền từ;
  - với mọi phần tử, lấy giá trị lớn nhất của các phần tử trong `getComputedStyle(el).transitionDuration` và `animationDuration` (danh sách cách nhau dấu phẩy, đơn vị `s` hoặc `ms`);
  - với mọi `document.getAnimations()`, lấy `effect.getTiming().duration`, gọi ngay sau lần chọn đúng;
  - kỳ vọng: không giá trị nào > 400.
- [ ] **Step 2:** `pnpm test src/components/interactive/reveal.test.tsx` và `pnpm cf:docker e2e/page.spec.ts -g UBC8` → FAIL (reveal và flip đang 800ms).
- [ ] **Step 3:** sửa token và component.
- [ ] **Step 4:** chạy lại cùng LP26 (cả hai test), `flashcard.test.tsx` → PASS.
- [ ] **Step 5: Commit** `fix(web): cap landing motion at 400ms`

### Task 11: Kiểm toàn bộ, rà soát, cập nhật tài liệu, mở PR

**Files:**
- Modify: `docs/deliveries/ui-refresh-b.md` (as-built), `CLAUDE.md` (một dòng trỏ tới design và delivery), `docs/HANDOFF_2026-10-05_BUOC_0.md` §2 (dòng "Làm mới giao diện B" trước "Deploy API + admin"), `docs/superpowers/specs/2026-10-08-landing-page-design.md` §6 (một dòng: token đã chuyển sang `packages/design-tokens`, xem design B)

- [ ] **Step 1:** Trên Windows: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm assert:static`. Sau đó `pnpm cf:docker` (cả hai project). Ghi số test pass/fail vào delivery record kèm output.
- [ ] **Step 2:** Dùng hai skill W16 trên trang thật: `design:accessibility-review` và `design:design-critique`. Báo phát hiện cho chủ dự án dưới dạng phương án, không tự sửa phần đã duyệt.
- [ ] **Step 3: Chạy tay "Xong khi" của spec §1** trên `pnpm cf:dev` (trong Docker), ở VI/EN × 1440/390:
  - bật giảm chuyển động (DevTools Rendering);
  - tắt JavaScript;
  - tab chạy nền: bấm đúng rồi chuyển tab ngay, quay lại thì không còn miếng dán treo (UBE7);
  - chụp ảnh từng trường hợp vào `docs/deliveries/ui-refresh-b/` và ghi kết quả.
- [ ] **Step 4:** Cập nhật bốn tài liệu ở trên. Commit `docs: record the landing refresh as-built and point to the b design`.
- [ ] **Step 5:** Quét secret trên diff (`git diff origin/dev...HEAD`, tìm token, khóa, mật khẩu). Push `feat/ui-b-landing`, mở PR vào `dev` với tóm tắt và link tới design, plan, delivery. Báo nhánh, upstream, `git log --oneline origin/dev..HEAD`. **Không merge.**
