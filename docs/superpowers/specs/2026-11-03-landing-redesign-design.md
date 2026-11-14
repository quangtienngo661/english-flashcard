# Design: landing Wordmet làm lại theo design system của app (`apps/web`, trang `/[locale]`)

> **Trạng thái 03/11/2026:** chờ chủ dự án duyệt. Chưa có code. Duyệt xong mới viết plan (`writing-plans`), rồi mới sửa code.

Ngày: 02–03/11/2026. Brainstorm qua `superpowers:brainstorming`, `impeccable` (shape, critique), `taste-skill` và `emil-design-eng`.

**Đầu vào:**
- Survey: `docs/preparation/LANDING_REDESIGN_SURVEY_2026-11-02.md` (lời hứa sai trên landing cũ, mục 8 là các câu trả lời).
- Research: `docs/preparation/LANDING_RESEARCH_2026-11-02.md` (6 landing tham khảo, design system của app, quy tắc giọng văn ở §5).
- Mockup đã chốt: `docs/mockups/2026-11-02-landing-v2/5-gioi-thieu.html` (+ `app.css`, `exercises.js`, `motion.js`, `practice.js`).
- Đánh giá: `critique-A.md`, `critique-B.md`, `danh-gia-mockup-1.md` (cùng thư mục mockup).
- Quyết định và các phương án đã bỏ: `docs/superpowers/decisions/2026-11-03-landing-redesign-decisions.md`.

**Nhãn:** **Chốt** = chủ dự án chọn trong chat. **Đề xuất** = Claude đề xuất, duyệt cùng doc này. **ASSUMPTION** = chưa kiểm chứng.
Tiêu chí dùng số hiệu `LR#`, trường hợp biên `LRE#`.

## 1. Mục tiêu và tiêu chí xong

Thay trang chủ landing (`/vi`) bằng thiết kế mockup 5. Trang giới thiệu Wordmet qua chính giao diện của app, cho người xem làm thử các
dạng bài, và dẫn tới **đăng ký tài khoản**. Trang dùng design system của app người học (token chung, Lexend, nút có gờ), có chế độ
sáng/tối, và nói đúng sự thật về sản phẩm.

**Xong khi:**
- Mọi tiêu chí `LR#` ở mục 11 có test tự động, chạy trong `pnpm --filter web test` (unit, component) và `test:e2e` (Playwright), CI job
  `web` xanh.
- `lint.mjs` của taste-skill và `impeccable detect` chạy trên các file landing. Mọi finding còn lại được ghi lý do giữ (mục 13).
- Chạy tay ở 1440, 768, 390 và 320, cả sáng và tối, khớp mockup 5. Ảnh chụp lưu vào `docs/deliveries/`.

**Không làm:** bản tiếng Anh (L3), ảnh chụp thật của app, giá gói Pro, cổng thanh toán, nội dung pháp lý đầy đủ (mục 12).

## 2. Quyết định

| # | Quyết định | Nguồn |
|---|---|---|
| Q1 | Bố cục: mockup 5 "Giới thiệu Wordmet". Màn đầu giới thiệu app qua một cửa sổ app có 5 phần; sau đó là vấn đề người học, các dạng bài làm thử được, ôn đúng lúc, từ gặp hằng ngày, gói, hỏi đáp | Chốt (02–03/11, qua 5 vòng mockup) |
| Q2 | Dùng thử Pro theo D15/D16 Bước 5: 7 ngày, cần thẻ thanh toán | Chốt |
| Q3 | Nút chính dẫn tới trang đăng ký tài khoản, không còn waitlist. Làm landing hoàn chỉnh ngay; Worker `wordmet-web` đang tắt, xong thì deploy | Chốt |
| Q4 | `impeccable` dẫn quy trình; luật và máy đo của `taste-skill` làm cửa kiểm; cả hai chạy trong chuỗi superpowers | Chốt (Claude đề xuất "trong chuỗi superpowers") |
| S1 | Landing phải ăn khớp với giao diện app đã build | Chốt |
| S2 | Làm lại trang từ đầu (không vá trang cũ), dùng design system của app | Chốt (Claude đọc S1 + S2 cùng nhau; chủ dự án không phản bác) |
| L1 | Theo cài đặt máy, kèm nút đổi sáng/tối | Chốt |
| L2 | Xóa toàn bộ waitlist, kể cả cấu hình D1 | Chốt |
| L3 | Bản tiếng Anh làm ở một đợt sau | Chốt |
| L4 | Trong lúc chưa có tiếng Anh: `/en` chuyển về `/vi`, ẩn nút "English" trên landing | Chốt |
| C1 | Chữ: ngắn, giọng chuyên nghiệp (quy tắc ở research §5); nút là "Đăng ký"; thẻ bài tập không có dòng hướng dẫn, không "Báo lỗi", không khung "Đúng rồi/Chưa đúng"; gói Pro không ghi "Chưa mở bán"; gói Miễn phí không có dòng về AI | Chốt (các vòng góp ý 02–03/11) |
| C2 | Tiêu đề section không có vệt highlight vàng; tiêu đề chính cỡ vừa (≤ 3.5rem) | Chốt |
| C3 | Khối Đăng ký / Đăng nhập ở màn đầu nằm bên trái, dưới lời giới thiệu | Chốt |
| C4 | Hỏi đáp: 4 câu, thanh câu hỏi rộng hết cột nội dung, mở/đóng có chuyển động | Chốt |
| D1 | Theme dùng lại bộ có sẵn của app: `app-shell/theme` (khóa `wordmet-web.theme`), `THEME_SCRIPT` (đã có hash trong CSP), màu tối của `packages/design-tokens` | Đề xuất |
| D2 | Chỉ trang chủ `/en` chuyển về `/vi`. App `/en/app` giữ nguyên tiếng Anh. `/en/privacy`, `/en/terms` giữ nguyên | Đề xuất |
| D3 | `en.json` mang cùng khóa `Landing` với `vi.json`, tạm thời giữ chữ tiếng Việt, để giữ test LP3 (hai file cùng khóa). Thay ở đợt tiếng Anh | Đề xuất |
| D4 | Tên dạng bài và câu chữ trong các mảnh app lấy từ chính chuỗi của app (`App.practice.session.kind`, `App.review.*`, `App.addWord.*`), không viết lại | Đề xuất |
| D5 | Không thêm thư viện. Chuyển động bằng CSS và `Reveal` có sẵn | Đề xuất (giữ W10 của landing cũ) |

## 3. Cấu trúc trang và chữ

Thứ tự: thanh trên → Màn đầu (+ cửa sổ app) → Vì sao từ vựng nhanh bị quên → Nhiều dạng bài luyện tập → Ôn tập đúng thời điểm → Từ gặp
hằng ngày → Gói → Hỏi đáp → Kêu gọi cuối → Chân trang. Chữ dưới đây là bản chốt (VI), trích từ mockup 5 ngày 03/11.

- **Thanh trên** (giống `TopBar` của app, nền `navy`, cao 64px): logo · Tính năng · Dạng bài · Gói học · Hỏi đáp · nút đổi theme ·
  Đăng nhập (`navy-raised`) · **Đăng ký** (sticker). Dưới 36rem: chỉ logo, nút theme, Đăng ký. Dưới 60rem: ẩn 4 link neo.
- **Màn đầu:** H1 "Học từ vựng tiếng Anh, / ghi nhớ và vận dụng" (xuống dòng sau dấu phẩy, ≤ 3.5rem).
  Lời giới thiệu: "Ôn thẻ theo lịch, luyện tập cùng AI và lưu từ mới bạn gặp mỗi ngày."
  Hàng nút bên trái: **Đăng ký** · "Đã có tài khoản? Đăng nhập". Ghi chú: "Miễn phí, không cần thẻ thanh toán."
- **Cửa sổ app** (thanh `navy` có logo và 5 tab kiểu tab của app; dưới 60rem thanh tab cuộn ngang trong cửa sổ):

  | Tab | Tiêu đề / mô tả / ý | Mảnh app (dữ liệu mẫu) |
  |---|---|---|
  | Ôn thẻ | Ôn tập theo lịch / Lật thẻ, tự đánh giá. Wordmet xếp lịch ôn cho từng từ. / Sáu ngăn, từ Mới đến 30 ngày; Kèm câu mẫu và câu đã gặp | Màn ôn thẻ: "Kinh doanh · B1", thanh tiến độ, "Thẻ 4 trên 29", thẻ lật được (negotiate ↔ nghĩa, câu mẫu, câu bạn đã gặp), "Bấm vào thẻ hoặc Space để lật", nút Cần ôn lại / Đã biết |
  | Nhóm từ | Nhóm từ vựng / Bộ từ theo trình độ A1–C2, theo chủ đề hoặc do bạn tự tạo. / Tạo nhóm nhanh theo chủ đề | 2 thẻ nhóm (thanh 6 ngăn, số thẻ chờ) + khối "Tạo nhóm nhanh theo chủ đề · Ẩm thực A2" |
  | Luyện tập AI | Luyện tập với AI / Nhiều dạng bài trong mỗi phiên. Gói Pro có thêm câu do AI biên soạn. / Chấm điểm theo quy tắc; Luyện riêng từ hay sai | Thẻ câu "Câu AI · Điền từ vào câu" đã trả lời đúng (ô nhập xanh) + một dòng "AI dịch" |
  | Tra từ | Tra cứu từ vựng / Nghĩa, câu mẫu, phát âm và dạng chia trên một trang. / Pro: tra cứu bằng AI | Trang từ "profit" |
  | Thêm từ mới | Thêm từ mới / Nhập từ và câu chứa từ. Wordmet tự nhận diện dạng chia. / Tự nhập nghĩa khi kho chưa có | Hộp "Bạn vừa gặp từ nào?" (went → go, câu, nhóm, "Lưu go") |

- **Vì sao từ vựng nhanh bị quên:** "Nhận biết nghĩa là chưa đủ / Bạn cần tự dùng từ trong câu." · "Thiếu ôn tập, trí nhớ suy giảm / Ôn
  đúng thời điểm giúp nhớ lâu hơn." + đường cong minh họa (ôn ở 1, 3, 7, 14, 30 ngày; chú thích "Có ôn tập · Không ôn tập · Hình minh họa").
- **Nhiều dạng bài luyện tập:** "Chọn một dạng để làm thử." Danh sách 7 dạng bên trái (dưới 60rem: dải cuộn ngang), thẻ câu hỏi làm
  được bên phải. Dòng cuối: "AI chỉ biên soạn câu hỏi; đáp án chấm theo quy tắc."
- **Ôn tập đúng thời điểm:** "Từ đã nhớ lên ngăn sau, từ chưa nhớ quay về ngăn đầu." · Email nhắc khi đến hạn · Ôn thẻ không giới hạn.
  Mảnh: bảng "430 từ theo ngăn" có chip "Dữ liệu mẫu", thanh theo tỉ lệ; thẻ "Từ hay sai" ("Sai 2 trong 5 lần gần nhất.").
- **Từ gặp hằng ngày thành bài luyện tập** (nền `navy`): "Lưu từ kèm câu đã gặp để luyện điền từ với chính câu đó." Hộp thêm từ
  (borrow) → "tạo bài điền từ" → thẻ "Câu bạn đã lưu".
- **Bắt đầu miễn phí:** Miễn phí (Ôn thẻ, lịch ôn tự động · Tra cứu, thêm từ mới · 3 phiên luyện tập mỗi ngày · nút Đăng ký) và Pro
  (Thêm phiên luyện tập · Câu luyện tập AI · Tra cứu bằng AI · Không quảng cáo · "Dùng thử 7 ngày, cần thẻ thanh toán. Hủy trước hạn không
  mất phí."). Không ghi giá.
- **Câu hỏi thường gặp** (4 câu, câu đầu mở sẵn): Wordmet khác flashcard ở điểm nào? / Ngoài thẻ, Wordmet có bài tập vận dụng và lịch ôn
  tự động cho từng từ. · Wordmet có miễn phí không? / Có. Gói Miễn phí gồm ôn thẻ, tra cứu và 3 phiên luyện tập mỗi ngày. · AI có chấm
  điểm không? / Không. AI chỉ biên soạn câu hỏi; đáp án chấm theo quy tắc. · Nên bắt đầu thế nào? / Chọn một nhóm theo trình độ hoặc chủ đề
  và ôn mỗi ngày.
- **Kêu gọi cuối** (nền `navy`): "Bắt đầu học cùng Wordmet" · Đăng ký · "Miễn phí, không cần thẻ thanh toán."
- **Chân trang:** logo · Gói học · Hỏi đáp · Liên hệ (mailto, như cũ) · Điều khoản sử dụng · Chính sách bảo mật · © năm Wordmet. Không có
  "English" (L4). Link pháp lý theo cờ ẩn/hiện hiện có.

### 3.1 Bảy dạng bài (dữ liệu mẫu, D4)

| Dạng (chuỗi app) | Gói | Cách trả lời | Mẫu |
|---|---|---|---|
| Trắc nghiệm | Miễn phí | Chọn 1 trong 4 | Nghĩa "triển khai, phát hành" (nhãn "phần mềm") → deploy / delay / deliver / decide |
| Đúng/sai | Miễn phí | Chọn Đúng/Sai | "borrow" · "cho mượn" → Sai |
| Gõ từ · theo nghĩa | Miễn phí | Gõ | "cho rằng, mặc định là đúng" → assume |
| Điền từ vào câu (câu bạn đã lưu) | Miễn phí | Gõ | "Can I ___ your charger for a minute?" → borrow |
| Điền từ vào câu · Câu AI | Pro | Gõ | "The team ___ the fix last night." → deployed |
| Chọn nghĩa trong câu · Câu AI | Pro | Chọn 1 trong 4 | "Don't **assume** everyone has read the email." → cho rằng |
| Trắc nghiệm theo câu · Câu AI | Pro | Chọn 1 trong 4 | "Could you ___ me your pen for a second?" → lend |

Hành vi (giản lược từ phiên luyện thật, C1):
- **Dạng chọn:** bấm một ô thì ô đúng hiện xanh kèm dấu ✓, ô chọn sai hiện đỏ kèm dấu ✗ và rung 300ms. Không cho chọn lại.
- **Dạng gõ:**
  - Gõ đúng (so khớp sau khi bỏ khoảng trắng hai đầu và không phân biệt hoa thường) thì ô nhập xanh.
  - Gõ sai thì ô đỏ kèm "Lần n", và hiện hai nút Gợi ý (chữ cái đầu và số chữ) / Xem đáp án.
  - Xem đáp án thì ô hiện đáp án trên nền đỏ.
- **Sau khi trả lời:** hai nút "Làm lại" và "Dạng bài tiếp theo". Nhãn phím (1–4, Enter, H) chỉ hiện từ 48rem, như app.
- **Không gọi API nào.** Mọi dữ liệu nằm trong messages.

## 4. Kiến trúc

**Đề xuất.** Trang vẫn ghép section trong `app/[locale]/(site)/page.tsx` (W6), render trên server. Phần cần JavaScript là các "đảo client"
nhỏ, nhận chữ qua props như landing cũ (`NextIntlClientProvider messages={null}`).

```
(site)/layout.tsx  ── THEME_SCRIPT + ThemeProvider (app-shell) ── LandingHeader ── <main> ── SiteFooter
(site)/page.tsx    ── Hero ─ AppShowcase* ─ WhyForget ─ ExerciseGallery* ─ ReviewTiming ─ MetOutside ─ Plans ─ Faq ─ FinalCta
                       *: đảo client (tab, lật thẻ, bài tập); còn lại là server component
```

| Phần | Vị trí đề xuất | Ghi chú |
|---|---|---|
| `LandingHeader` | `components/landing/` | Dùng lại `app-chrome/Logo`, `ThemeToggle` (đảo client) |
| `Hero` | `components/landing/` | Link `/{locale}/app/register`, `/{locale}/app/login` |
| `AppShowcase` | `components/landing/showcase/` | Tab theo mẫu ARIA tabs (←/→, Home/End), 5 panel; panel ẩn bằng `hidden` |
| `ReviewCardDemo` | `components/landing/showcase/` | Nút lật (`aria-pressed`), hai mặt chung một ô grid để thẻ cao theo mặt dài hơn |
| Mảnh Nhóm / Câu AI / Tra từ / Thêm từ | `components/landing/showcase/` | Tĩnh, đánh dấu `data-ui` |
| `WhyForget` + `ForgettingCurve` | `components/landing/` | SVG render trên server; tọa độ do hàm thuần `forgettingCurve()` tính |
| `ExerciseGallery` | `components/landing/exercises/` | Đảo client; logic chấm là hàm thuần `checkTyped()`, `pickResult()` |
| `ReviewTiming`, `MetOutside`, `Plans`, `Faq`, `FinalCta` | `components/landing/` | `Faq` dùng `<details name>` như cũ (không JS) |
| `SiteFooter` | sửa file có sẵn | Bỏ link "English" (L4) |

**Token và style:** chỉ dùng token trong `packages/design-tokens` và `globals.css` (W7, `check-tailwind-raw`). Những giá trị mockup có mà
token chưa có (bóng gờ của thẻ câu, cỡ chữ cửa sổ app) được thêm thành token, không viết giá trị raw. Cụ thể sẽ liệt kê trong plan.

**Xóa (L2):**
- `components/sections/*` cũ, `components/interactive/{cloze,Flashcard,WaitlistForm}` và test của chúng.
- `features/waitlist/*`, `migrations/0001_waitlist.sql`, `src/test/d1.ts`, `e2e/waitlist.spec.ts`, `e2e/d1.ts`.
- Binding `d1_databases` trong `wrangler.jsonc`, kiểu `DB` trong `cloudflare-env.d.ts`.
- Các namespace messages của landing cũ: `Hero`, `Cloze`, `Problem`, `Steps`, `Ai`, `Plans`, `Faq`, `FinalCta`, `Waitlist`.

Database D1 trên Cloudflare chủ dự án tự xóa nếu muốn.

## 5. Theme (L1, D1)

`(site)/layout.tsx` chèn `THEME_SCRIPT` (đã có hash trong CSP, `next.config.ts`) và bọc trang trong `ThemeProvider` của app. Nút đổi theme
trên thanh trên là `ThemeToggle` của app. Màu tối lấy từ cùng file token tối mà app dùng. **ASSUMPTION:** `ThemeToggle` và
`ThemeProvider` dùng được ngoài `AppProviders` mà không kéo theo query client hay session; plan kiểm trước khi dựng. Nếu không được thì tách
phần theme ra một provider nhỏ, không đổi hành vi app.

`viewport.themeColor` đổi từ `primary #2445d6` sang `navy` (sáng) và `navy-card` (tối), vì thanh trên giờ là navy.

## 6. Chuyển động (Emil Kowalski, taste-skill)

- **Vào trang:** mỗi phần hiện dần và nhích lên 16px khi cuộn tới (`Reveal`), cách nhau 70ms. Riêng màn đầu không có hiệu ứng.
- **Lật thẻ:** `rotateY` 320ms, `cubic-bezier(0.23, 1, 0.32, 1)`.
- **Hỏi đáp:** câu trả lời giãn ra 280ms (`::details-content` + `interpolate-size`), chữ hiện mờ dần, dấu + xoay 45°.
- **Nút:** lún xuống gờ 0.18rem khi bấm. Hover chỉ chạy trên thiết bị có chuột (`hover: hover`).
- **Bài tập:** ô chọn sai rung 300ms.
- `prefers-reduced-motion`: bỏ mọi dịch chuyển, chỉ giữ đổi độ mờ ≤ 200ms.
- Không có JS hoặc observer không chạy: nội dung vẫn hiện, vì lớp ẩn chỉ bật khi có JS và có failsafe.

## 7. Ngôn ngữ và đường dẫn (L3, L4, D2, D3)

- `proxy.ts`: request tới đúng `/en` (trang chủ) trả 307 về `/vi`, giữ query. `/` vẫn chọn ngôn ngữ như cũ; nếu chọn `en` thì đi `/en` rồi
  về `/vi`. Đợt tiếng Anh sẽ bỏ redirect này.
- `LanguageSwitch` và link "English" ở chân trang bị ẩn trên landing.
- Metadata `alternates.languages` và `sitemap.ts` chỉ còn `vi` (cùng `x-default`).
- `en.json`: namespace `Landing` mang chữ tiếng Việt tạm thời (D3).

## 8. SEO, metadata, CSP

- `Metadata.title`: "Wordmet · Học từ vựng tiếng Anh, ghi nhớ và vận dụng". `description`: lời giới thiệu ở màn đầu.
- Ảnh OG: giữ cơ chế cũ, đổi chữ theo tiêu đề mới.
- JSON-LD: giữ.
- CSP: không thêm script inline mới ngoài `THEME_SCRIPT` (đã có hash). Không tải tài nguyên ngoài (font qua `next/font`).

## 9. Liên kết tới app

Nút Đăng ký và Đăng nhập trỏ tới `/{locale}/app/register` và `/{locale}/app/login`. Khi build với `NEXT_PUBLIC_LEARNER_APP` khác `on`, các
đường này quay về landing (E20 có sẵn). Vì vậy bản deploy landing mới phải bật app cùng lúc (mục 13).

## 10. Dữ liệu và chữ trong messages

Namespace mới `Landing` gồm `nav`, `hero`, `showcase.{review,groups,practice,lookup,addWord}`, `why`, `exercises.items[7]`, `review`,
`metOutside`, `plans`, `faq`, `final`, `footer`. Tên dạng bài lấy từ `App.practice.session.kind`. Chữ nút trong mảnh app lấy từ
`App.review`, `App.addWord`. Dữ liệu mẫu (negotiate, profit, Kinh doanh · B1…) nằm trong `Landing`, không lấy từ API.

## 11. Tiêu chí (When → Then)

Unit/component (Vitest + Testing Library, truy vấn theo role và chữ):

| # | Khi | Thì |
|---|---|---|
| LR1 | `checkTyped('deployed', '  Deployed ')` | đúng; `checkTyped('deployed', 'deploy')` sai |
| LR2 | `forgettingCurve()` với lịch 1, 3, 7, 14, 30 | điểm đầu ở y nhớ = 1; ngay sau mỗi mốc ôn, y = 1; trong mỗi đoạn, giá trị giảm dần |
| LR3 | Bấm tab "Tra từ" | đúng 1 tabpanel hiện, tiêu đề "Tra cứu từ vựng"; tab có `aria-selected=true` |
| LR4 | Focus tab đầu, nhấn → rồi End | focus và chọn lần lượt sang tab 2, rồi tab cuối |
| LR5 | Bấm thẻ ôn | nút có `aria-pressed=true`; mặt sau có "đàm phán, thương lượng" |
| LR6 | Dạng Trắc nghiệm, bấm "delay" | ô "delay" là sai, ô "deploy" là đúng, các ô bị khóa, hiện "Làm lại" và "Dạng bài tiếp theo" |
| LR7 | Dạng gõ, gõ "x" rồi Kiểm tra | ô nhập ở trạng thái sai kèm "Lần 1"; có nút Gợi ý và Xem đáp án; không có khung "Đúng rồi/Chưa đúng" |
| LR8 | Sau LR7, bấm Gợi ý | hiện "Chữ cái đầu: …"; nút Gợi ý bị khóa |
| LR9 | Bấm Xem đáp án | ô hiện đáp án, trạng thái sai, khóa nhập |
| LR10 | Bấm "Dạng bài tiếp theo" ở dạng cuối | quay về dạng đầu, focus ở nút chọn dạng |
| LR11 | `messages` | `vi` và `en` cùng khóa (LP3 giữ); không namespace landing cũ nào còn lại |

E2E (Playwright, bản build):

| # | Khi | Thì |
|---|---|---|
| LR20 | Mở `/vi`, bấm Đăng ký ở màn đầu | URL là `/vi/app/register` (build bật app) |
| LR21 | Mở `/en` | 307 về `/vi`; trang không có link "English" |
| LR22 | Ở 320, 390, 768, 1440: mở từng tab, lật thẻ, mở từng dạng bài | không phần tử nào tràn khỏi khung chứa; `scrollWidth` = bề rộng màn |
| LR23 | Bấm nút đổi theme sang tối, tải lại, mở `/vi/app/login` | `<html data-theme="dark">` ở cả hai trang (`wordmet-web.theme` = `dark`) |
| LR24 | Hệ thống ở chế độ tối, chưa chọn gì | trang render tối, không nháy sáng (theme script chạy trước khi vẽ) |
| LR25 | `reducedMotion: 'reduce'` và cuộn hết trang | mọi phần hiện đủ; không có `transform` khác `none` trên `.reveal` |
| LR26 | Chặn file JS của đảo client | mọi chữ vẫn đọc được; tab đầu hiện; hỏi đáp mở/đóng được |
| LR27 | axe trên `/vi`, sáng và tối | không có vi phạm serious/critical |
| LR28 | CSP | không có vi phạm (giữ E23) |
| LR29 | Mở hỏi đáp câu 2 | câu 1 đóng; chiều cao câu 2 tăng dần (đo giữa chừng nhỏ hơn cuối) trên Chromium |
| LR30 | `/vi` | không còn form email nào; không request nào tới server action waitlist |

## 12. Trường hợp biên

| # | Khi | Thì |
|---|---|---|
| LRE1 | `localStorage` bị chặn (chế độ riêng tư) | theme theo máy, nút đổi vẫn chạy trong phiên (hành vi có sẵn của `theme.ts`) |
| LRE2 | Màn 320px | thanh trên chỉ còn logo, nút theme, Đăng ký; tab cửa sổ app cuộn ngang trong cửa sổ, trang không cuộn ngang |
| LRE3 | Mặt sau thẻ dài hơn mặt trước (điện thoại) | thẻ cao theo mặt dài hơn, không đè nút (lỗi đã gặp ở mockup) |
| LRE4 | Gõ đáp án có khoảng trắng hai đầu hoặc chữ hoa | vẫn tính đúng |
| LRE5 | Gõ rỗng rồi Kiểm tra | không làm gì (nút Kiểm tra bị khóa khi ô rỗng, như app) |
| LRE6 | Trình duyệt chưa hỗ trợ `::details-content` | hỏi đáp mở/đóng tức thì, không lỗi |
| LRE7 | Build tắt app (`NEXT_PUBLIC_LEARNER_APP` ≠ `on`) | link Đăng ký quay về landing (E20); ghi trong deploy checklist rằng landing mới cần bật app |
| LRE8 | Người dùng có cookie `NEXT_LOCALE=en` vào `/` | đi `/en` rồi về `/vi` (2 redirect); chấp nhận tới đợt tiếng Anh |

## 13. Rủi ro và việc còn mở

- **Định vị gần Prep Vocab** ("Học đến khi dùng được, không chỉ để nhớ"; research §5). Tiêu đề hiện tại vẫn gần. Chưa đổi; chủ dự án quyết.
- **`/privacy` chỉ nói về waitlist.** Đợt này chỉ bỏ đoạn waitlist; chính sách đầy đủ (tài khoản, AI, dữ liệu học) là việc pháp lý riêng
  (`LEGAL_AND_PILOT_RESEARCH_2026-11-02.md`).
- **Taste-skill sẽ còn báo** `few-pictures` (không có ảnh thật), `gradient` cũ đã bỏ, `shadow` (gờ là design system của app, giữ có chủ
  đích). Ghi trong delivery.
- **Deploy:** landing mới chỉ đúng khi bật app cùng lúc và có API thật. Ghi thêm vào `docs/deliveries/deploy-checklist.md`.
- **ASSUMPTION ở mục 5** (ThemeProvider ngoài AppProviders): plan kiểm đầu tiên.
- Câu "dạng quá khứ của go" trong mảnh Thêm từ là chữ đoán; plan đối chiếu với chuỗi thật của app (`addWord.recognized` + tên dạng).
