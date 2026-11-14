# Review nhánh `feat/giao-dien-moi-m8b` (giao diện mới, Part 8: trang công khai)

Ngày 11/11/2026. Người review độc lập, chỉ đọc. Phạm vi: `git diff origin/refactor/giao-dien-moi...HEAD`, bỏ hai commit plan `4bb42658`, `96eed890`.
Đối chiếu: plan `docs/superpowers/plans/2026-11-10-giao-dien-moi.md` "# Part 8" (constraints, Review Focus), quyết định QM8-1..QM8-9,
rulings R186–R248. Deviation đã có ruling không bị tính là lỗi, trừ khi ruling sai hoặc không an toàn (nói rõ ở từng mục).

## Đã chạy

| Lệnh | Kết quả |
|---|---|
| `pnpm --dir apps/web typecheck` | exit 0 |
| `pnpm --dir apps/web test` | 136 file, 1415 test, tất cả pass |
| `pnpm --dir apps/web lint` | exit 0 (ESLint + `check-tailwind-raw`) |

Không chạy build, e2e, `cf:docker` hay server nào. Mọi kết luận về runtime dưới đây là từ đọc code (kể cả code của Next 16.4.3 trong
`node_modules`), trừ chỗ ghi rõ có output.

## Tóm tắt

| # | Mức | Vấn đề |
|---|---|---|
| I1 | Important | Vệt sáng quanh thẻ Pro (Sweep, R216) không bao giờ hiện: hai callback cùng đăng ký một phần tử trên một IntersectionObserver dùng chung, cái sau ghi đè cái trước |
| I2 | Important | R211: dưới hero, mọi khối bị ẩn tới khi JS hydrate; mạng chậm, chunk lỗi (cả SRI) hoặc in trang đều thấy trang trống. Ruling chỉ tính trường hợp chunk lỗi |
| M1 | Minor | Trang Chính sách, Điều khoản, Nguồn dữ liệu, Đăng nhập, Đăng ký mất `og:image` / `twitter:image` vì `openGraph` của trang thay cả object |
| M2 | Minor | R239 (404 trống khi tắt JS): nguyên nhân đã xác định, có từ trước nhánh này, không có cách sửa rẻ đã kiểm |
| M3 | Minor | Deploy có thể ship giá và FAQ dự phòng mà không fail; chỉ checklist giữ |
| M4 | Minor | Test e2e "không JS" và "có chuyển động" không đo được opacity; không test nào chạm Sweep |
| M5 | Minor | CSP: hash của head script đúng nhưng hiện không được dùng; style inline phụ thuộc `CSP_INLINE_FALLBACK` |
| M6 | Minor | `/en/privacy` index được và trùng nội dung `/vi/privacy`; trang Chính sách index cả khi đang là bản nháp |
| M7 | Minor | README không ghi `LANDING_DATA_REQUIRED`, `LANDING_DATA_SOURCE` và việc build đọc API |
| M8 | Minor | Footer: `<ul class="contents">` có thể mất ngữ nghĩa danh sách ở Safari |

Tổng: 0 Critical, 2 Important, 8 Minor.

---

## I1 (Important): Sweep không bao giờ chạy

**Ở đâu:** `apps/web/src/site/interactive/motion.ts:37-59` (`observe`), `Sweep.tsx:196`, `Reveal.tsx:121`, `PricingSection.tsx:235-236`.

**Sai gì:** `observe()` giữ **một** callback cho mỗi phần tử trong mỗi observer dùng chung (`watches: Map<Element, Watch>`, dòng 54
`watches.set(el, watch)`). Thẻ Pro là `<Reveal loop>` chứa `<Sweep />`. Sweep lấy `light.parentElement`, chính là phần tử của Reveal, và gọi
`whileInView(card, …)` với `LOOP_VIEW`. Reveal cũng gọi `whileInView(el, …)` với `LOOP_VIEW` trên cùng phần tử đó. Hai lần cùng khóa
`"0.3|"`, nên dùng chung một entry.

React chạy effect của con trước cha. Thứ tự là:

```
Sweep effect   → watches.set(card, sweepWatch); io.observe(card)
Reveal effect  → watches.set(card, revealWatch)   // ghi đè sweepWatch
                 io.observe(card)                  // đã observe rồi: không làm gì
IO callback    → watches.get(card) = revealWatch   // sweepWatch không bao giờ được gọi
```

Hệ quả: `visible` trong Sweep luôn `false`, hai animation được tạo ra rồi `pause()` mãi, và `data-wm-on` không bao giờ được đặt lên
`[data-wm-sweep]`. CSS chỉ hiện nó ở `html.js [data-wm-sweep][data-wm-on]` (`globals.css:1335`); còn lại span mang class `hidden`.
Huy hiệu AI vẫn nhấp nháy (chúng dùng `data-wm-on` của Reveal), nên nhìn qua tưởng phần chuyển động thẻ Pro vẫn chạy.

**Kịch bản:** Lan mở `/vi` trên desktop, cuộn tới "Giá". Bốn huy hiệu AI nhấp nháy, nhưng vệt sáng chạy quanh viền thẻ Pro (Figma scene 6,
R216) không bao giờ xuất hiện. Không test nào bắt được, và bộ ảnh `gm-m8` chụp với `animations: 'disabled'` (R247), nên cũng không lộ ra.

**Sửa:** cho mỗi phần tử một tập callback, và chỉ `unobserve` khi tập rỗng:

```ts
watches: Map<Element, Set<Watch>>
// observe: (watches.get(el) ?? watches.set(el, new Set()).get(el)!).add(watch); io.observe(el)
// cleanup: set.delete(watch); if (set.size === 0) { watches.delete(el); io.unobserve(el) }
// callback: watches.get(r.target)?.forEach((w) => w(r.isIntersecting))
```

Test đỏ trước: hai `whileInView` trên cùng phần tử, observer giả báo `isIntersecting: true`, cả hai callback phải được gọi; và một test render
`PricingSection` thấy `[data-wm-sweep]` có `data-wm-on` sau khi observer báo.

**Độ chắc:** đọc code, chưa chạy trên trình duyệt. Cách kiểm nhanh: mở `/vi`, cuộn tới thẻ Pro, chạy
`document.querySelector('[data-wm-sweep]').hasAttribute('data-wm-on')` trong console.

---

## I2 (Important): khối dưới hero ẩn tới khi JS hydrate (R211)

**Ở đâu:** `apps/web/src/app/globals.css:1204-1210` (`html.js [data-wm-reveal…]:not([data-wm-in]) { opacity: 0 }`), `:1286-1291` (Nhóm từ),
`site/layout/site-head-script.ts:9` (thêm `js` trước khi có JS của React), `site/legal/LegalToc.tsx:133-157` (mục lục trên điện thoại cũng ẩn theo
`.js`).

**Câu hỏi 1 của brief:** có. Khi script inline đã thêm `js` mà JS của React không chạy, mọi khối dưới hero ở `opacity: 0` mãi mãi. Không có
timeout, không có luật CSS nào chỉ ẩn khi observer đã sẵn sàng. Trên trang pháp lý, mục lục điện thoại cũng ẩn và nút mở không hoạt động.

**Vì sao ruling chưa đủ an toàn:** R211 coi đây là rủi ro hiếm ("chunk JS không tải được"). Nhưng điều kiện thật là "cho tới khi hydrate xong",
nên có ba trường hợp thường gặp hơn:

1. **Mạng chậm.** HTML và CSS vẽ trước, `js` có ngay, còn bundle React có thể mất vài giây trên 3G. Lan cuộn xuống "Giá" thấy khoảng trống, tới
   khi hydrate xong mới hiện.
2. **SRI.** `experimental.sri` (`next.config.ts:35`) làm trình duyệt chặn mọi chunk có byte khác hash: proxy của công ty, chế độ tiết kiệm dữ
   liệu của nhà mạng, extension sửa script. Khi đó trang chỉ còn hero: Nhóm từ, Cách học, Giá, Hỏi đáp và thẻ cuối đều trống.
3. **In trang.** Khối CSS nằm trong `@media (prefers-reduced-motion: no-preference)`, và media `print` cũng khớp điều kiện này. In `/vi` trước
   khi cuộn hết thì các phần chưa vào màn hình ra giấy trắng.

**Sửa (rẻ, chọn một):**

- (a) Đưa observer vào chính script inline: sau `classList.add('js')`, chờ `DOMContentLoaded`, rồi dùng một IntersectionObserver thuần đặt
  `data-wm-in` cho `[data-wm-reveal]:not([data-wm-in])`. Khối hiện mà không cần React; `Reveal` vẫn chạy như cũ (nó bỏ qua phần tử đã có
  `data-wm-in`). Phải cập nhật `SITE_HEAD_SCRIPT_HASH` (test đã tự tính lại).
- (b) Lưới an toàn: script inline đặt `setTimeout(() => { if (!html.classList.contains('wm-live')) html.classList.remove('js') }, 3000)`, và một
  client component gốc thêm `wm-live` khi mount.
- Cả hai cách đều nên thêm `@media print { html.js [data-wm-reveal], html.js [data-wm-reveal] [data-wm-word], html.js [data-group-card] { opacity: 1 !important; animation: none !important } }`.

Test: e2e chặn `/_next/static/chunks/*` bằng `page.route(...).abort()`, đợi quá thời gian timeout, rồi dùng helper `faded()` (đã có trong
`landing.spec.ts:137`) để kiểm không còn chữ nào trong suốt.

---

## M1 (Minor): trang con mất ảnh OG và Twitter

**Ở đâu:** `apps/web/src/lib/metadata.ts:86-99` (`pageMetadata`), `:105-113` (`authMetadata`); ảnh ở `src/app/[locale]/opengraph-image.tsx`.

**Sai gì:** Next gộp ảnh của file `opengraph-image` vào `openGraph.images` **tại segment chứa file** (`[locale]`)
(`node_modules/next/dist/lib/metadata/metadata-resolution-primitives.js:113-121`). Segment con có khóa `openGraph` thì
`mergeMetadata` thay cả object (`:145-148`), và segment con không có file ảnh nên không được thêm lại. `twitter` cũng vậy (`:150-153`), và
bước hậu xử lý chỉ chép ảnh từ `openGraph` sang `twitter`, mà `openGraph` lúc này cũng không có ảnh. R232 nói đúng về title và
`siteName`, nhưng không nói tới ảnh.

**Kịch bản:** ai đó dán link `wordmet.com/vi/privacy` hoặc `/vi/app/register` vào Zalo hay Facebook: preview không có ảnh. Trước nhánh này,
trang Chính sách không đặt `openGraph`, nên vẫn kế thừa ảnh. Test `seo.spec.ts` chỉ kiểm `og:image` trên `/vi`.

**Sửa:** trong `pageMetadata` và `authMetadata`, thêm `images` trỏ vào ảnh của `[locale]` (ví dụ `/${locale}/opengraph-image`, kèm `width`,
`height`, `alt`), hoặc đặt một file `opengraph-image` ở `(site)/(pages)`. Thêm một dòng vào test Chính sách của `seo.spec.ts`:
`og:image` phải có.

**Độ chắc:** đọc mã Next, chưa build. Kiểm bằng `curl` trang `/vi/privacy` của một bản build.

---

## M2 (Minor): R239, trang 404 trống khi tắt JS

**Câu hỏi 2 của brief.**

**Nguyên nhân (đã kiểm):** HTML server trả về là shell lỗi của Next, không phải trang 404. Bằng chứng là bản HTML 404 đã lưu trong scratchpad
của phiên (`nf.html`, 22:14, do phiên chính lấy). Nó bắt đầu bằng `<html id="__next_error__">`, và `<body>` chỉ có `<div hidden=""><!--$--><!--/$--></div>`
cùng các script.

Shell này được tạo ở `node_modules/next/dist/server/app-render/app-render.js:1322-1328` (`getErrorRSCPayload`: `html#__next_error__`,
`head` rỗng, `body` rỗng). Next tới nhánh "errorRecovery" (`:2476-2500`) khi `notFound()` thoát ra khỏi lần render SSR. Nhánh này cũng là chỗ
đặt status 404. Ở đây `notFound()` được gọi từ `[...rest]/page.tsx`. Ranh giới `not-found.tsx` của `(site)` là một class error boundary,
nên khi SSR nó không bắt được lỗi. App lại không có `app/layout.tsx` gốc (root layout là `[locale]/layout.tsx`), nên Next không có trang
`_not-found` có layout để vẽ server-side. Kết quả là body rỗng, và client tự render 404 từ RSC payload sau khi chạy JS. `<div hidden>`
mà R239 thấy là Suspense rỗng của metadata, không phải nội dung 404. Thiếu luôn `lang` trên `<html>`.

**Có từ trước không:** có. `origin/refactor/giao-dien-moi` có cùng cấu trúc: `src/app/[locale]/(site)/[...rest]/page.tsx` gọi `notFound()`,
`src/app/[locale]/(site)/not-found.tsx`, và không có `app/layout.tsx` (đã kiểm bằng `git ls-tree` và `git show`). Nhánh này chỉ đổi nội dung của
`not-found.tsx`.

**Sửa rẻ:** chưa thấy cách nào đã kiểm. Hai hướng đáng thử, đều là `ASSUMPTION`:

- `experimental.globalNotFound` cùng `app/global-not-found.tsx`. Config hiện có `globalNotFound: false`. Chưa rõ nhánh errorRecovery có
  dùng nó cho `notFound()` lồng hay không.
- Không ném `notFound()`: `[...rest]` render thẳng nội dung 404, còn status 404 đặt ở proxy. Cách này phức tạp hơn.

Mức Minor: có JS thì trang hiện đúng và status vẫn 404. Ruling để mở là hợp lý.

---

## M3 (Minor): deploy có thể ship dữ liệu dự phòng mà không fail

**Câu hỏi 3 của brief.**

**Ở đâu:** `next.config.ts:56-65`, `scripts/read-landing-data.mjs:65-81`, `.github/workflows/deploy-web.yml:27-32`.

**Sai gì:** mặc định là fail-open. `deploy-web.yml` không đặt `NEXT_PUBLIC_API_BASE_URL`, `API_INTERNAL_BASE_URL` hay
`LANDING_DATA_REQUIRED`. Vì vậy build trên runner gọi `http://localhost:3000`, không ai trả lời, in một dòng cảnh báo rồi dùng giá và FAQ dự
phòng, và job vẫn xanh. Cùng lúc job đặt `NEXT_PUBLIC_INDEXABLE: 'true'`, nên JSON-LD `Offer` gửi cho Google cũng dùng giá dự phòng. Chỉ có
`deploy-checklist.md:193` và `:216` giữ việc này.

**Kịch bản:** trước launch, chủ dự án đổi giá 3 tháng trong admin hoặc sửa FAQ bản nháp (QM8-6). Ai đó quên mục checklist: `wordmet.com`
hiện giá và câu hỏi cũ, còn trang Gói học trong app hiện giá mới.

**Phần còn lại của câu hỏi 3:**

- Lộ secret: không. Chuỗi chỉ gồm `{prices, faq}` lấy từ hai endpoint công khai. `WORDMET_LANDING_DATA_READ` chỉ nằm trong `process.env` lúc
  build và không được inline.
- `assert:render-mode` vẫn giữ `/vi` và `/en` là trang tĩnh. Nó chạy trong CI (`ci.yml:108`) và `cf:docker`, nhưng **không** chạy trong
  `deploy-web.yml`. Điều này có từ trước. Đường inline env tới server component đã được kiểm thật ở R193.

**Sửa:** fail-closed khi build cho production. Ví dụ `required: process.env.LANDING_DATA_REQUIRED === '1' || (process.env.NEXT_PUBLIC_INDEXABLE === 'true' && process.env.LANDING_DATA_SOURCE !== 'fallback')`.
Cho tới khi có `api.wordmet.com`, `deploy-web.yml` phải ghi rõ `LANDING_DATA_SOURCE: fallback`, để việc dùng dữ liệu dự phòng là một lựa chọn
nhìn thấy được, không phải một dòng cảnh báo trong log.

---

## M4 (Minor): vài test không đo được điều chúng mô tả

**Câu hỏi 8 của brief.**

- **`toBeVisible()` không xét opacity.** Đã đọc `playwright-core@1.63.0` `coreBundle.js` (`computeBox`): visible = có box và `visibility`
  không phải hidden. Không có kiểm opacity. Vì vậy "LR26 without JavaScript" (`e2e/landing.spec.ts:192-199`) và "LR25 … shows every section
  heading" (`:173-177`) vẫn pass dù các tiêu đề ở `opacity: 0`. Ví dụ: nếu một thay đổi sau này bỏ tiền tố `html.js` khỏi luật ẩn, LR26
  không fail. LR25 vẫn có `faded()` ở test bên trên nên được che. **Sửa:** gọi `faded()` trong LR26, như LR25 đang làm.
- **Có chuyển động, sau khi cuộn:** LR35 (`:182-189`) chỉ kiểm h1 và đoạn dẫn của hero. Không test nào kiểm rằng, với chuyển động bật, mọi
  khối đạt opacity 1 sau khi cuộn hết trang. `scrollThrough()` đã có sẵn, và một assert `faded()` sau nó sẽ đủ.
- **Sweep:** không có test unit hay e2e nào. Một test như vậy đã bắt được I1.
- Các test khác có control và giá trị cụ thể: `motion.test.tsx` có control `> 5`, giá `[0, 79000, 199000, 599000]`, `−16%` / `−37%`, 44 px,
  hash recompute. Không thấy test nào pass vô nghĩa ngoài các chỗ trên.

---

## M5 (Minor): CSP

**Câu hỏi 4 của brief.**

- `SITE_HEAD_SCRIPT_HASH` khớp đúng script. `site-head-script.test.ts` tính lại sha256 và pass trong lần chạy ở trên. React SSR in
  `dangerouslySetInnerHTML` nguyên văn.
- Nhưng hiện hash này **không được gửi đi**. `CSP_INLINE_FALLBACK = true` (`src/lib/csp.ts:9`) làm `buildCsp` bỏ mọi hash và dùng
  `'unsafe-inline'` (`:19-21`). Ngày tắt fallback, cần nhớ thêm hai điều:
  - `style-src` cũng mất `'unsafe-inline'`. Khi đó mọi thuộc tính `style="…"` do SSR in ra đều bị chặn: `--wm-delay`, `--wm-blur` của
    Reveal, `--wm-i` của SplitWords (nhịp từng chữ), `CODE_GLOW` của 404. Kết quả là nhịp chữ và delay sai, dù không vỡ bố cục.
  - Các script `self.__next_f.push` của Next là lý do fallback được bật.
- JSON-LD là `type="application/ld+json"`, không chạy nên không cần hash. Không thấy script inline nào khác.

**Sửa:** chưa cần làm gì. Ghi điều kiện của `style-src` vào chú thích của `CSP_INLINE_FALLBACK` hoặc vào `deploy-checklist`.

---

## M6 (Minor): SEO khi `NEXT_PUBLIC_INDEXABLE=true`

**Câu hỏi 5 của brief.** Đọc `sitemap.ts`, `robots.ts`, `metadata.ts`, `JsonLd.tsx`. Không thấy lỗi chặn. Có ba điểm nhỏ:

- `/en/privacy` có `index: true` và canonical trỏ chính nó (`privacy/page.tsx:21`, `metadata.ts:94-97`). Khi admin chưa viết bản tiếng Anh,
  `pickLanguage` trả bản tiếng Việt, nên Google thấy hai URL index được cùng một văn bản, và hreflang `en` trỏ tới văn bản tiếng Việt.
  `/en/privacy` cũng không có trong sitemap. **Sửa:** `index: locale === 'vi' || legal.privacy.en !== null`, hoặc cho `/en/privacy` canonical
  về `/vi/privacy` khi chưa có bản tiếng Anh.
- Trang Chính sách index cả khi `legal` là `null` (đang hiện thông báo bản nháp), và sitemap vẫn liệt kê nó. **Sửa:** chỉ index khi có văn
  bản đã đăng.
- `sitemap.ts:24` gọi API lúc build với timeout 2,5 s. Không có API thì chỉ mất ngày, đúng như chú thích.

---

## M7 (Minor): README thiếu biến build mới

**Ở đâu:** `apps/web/README.md:22-32` (bảng Environment).

**Sai gì:** bảng không có `LANDING_DATA_REQUIRED`, `LANDING_DATA_SOURCE`, và không nói `next build` đọc `/v1/public/prices` và
`/v1/public/faq` qua `API_INTERNAL_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL`. Người deploy đọc README sẽ không biết có fallback. Thêm ba dòng.

---

## M8 (Minor): danh sách trong footer

**Ở đâu:** `apps/web/src/site/layout/SiteFooter.tsx:81` (`<ul className="contents md:flex …">`).

**Sai gì:** dưới md, `display: contents` trên `<ul>`. Một số bản Safari bỏ role của phần tử `display: contents`, nên VoiceOver không đọc "danh
sách 4 mục". Đây là `ASSUMPTION` theo các lỗi WebKit đã biết, chưa thử trên máy thật. **Sửa:** giữ `<ul>` là flex wrap thật, đưa dòng
copyright ra ngoài, hoặc thêm `role="list"`.

---

## Các câu hỏi còn lại của brief

**6. Code `/app` bị đổi.** Ngoài hai lần dời (`AppLogo` sang `ui/Logo.tsx`: `CardFrame`, `PhoneHeader`, `TopBar`; `periodOffer` sang
`lib/`: `PlansPage`, `use-buy-order`) và R240 (`ui/button-styles.ts`, `Button.tsx` re-export), có:

- `(auth)/layout.app.tsx` và `(split)/register/page.app.tsx` thêm `generateMetadata`. Đã có ruling R235.
- `app-chrome/ThemeToggle.tsx` bị xóa (wrapper không ai dùng, R186).
- `viewport.themeColor` trong `[locale]/layout.tsx` đổi từ navy sang màu nền. Layout gốc này `/app` dùng chung, nên màu thanh trình duyệt
  trong app cũng đổi theo. Design §11 có nêu, nhưng nên biết là nó chạm `/app`.

Không thấy thay đổi nào khác.

**7. Accessibility.**

| Mục | Kết quả |
|---|---|
| Heading | Thứ tự đúng: h1 hero, h2 mỗi mục, h3 trong thẻ; pháp lý h1, rồi h2/h3 của markdown và h2 của callout; Nguồn dữ liệu h1, h2, h3 |
| Landmark | Header, main, footer đúng; 404 có main và footer, không có banner (có test) |
| Skip link | Có, trỏ `#main`, và `main` có `tabIndex=-1` |
| Theme radio group | Có tên ("Giao diện"), hai radio 44 px |
| FAQ | `details` / `summary` gốc, mục mở có `name="faq"` |
| SplitWords | Tên heading là câu đầy đủ (có test) |
| Target 44 px | Có e2e đo ở 390 px |

Không thấy lỗi ngoài M8. Việc không có nút dừng chuyển động là quyết định QM8-3′ của chủ dự án, nên không tính.

**9. Dead code, key thừa, import file đã xóa.** Typecheck pass, nên không còn import nào tới `src/components/**` hay `app-chrome/Logo`.
`vi.json` và `en.json` có cùng bộ key. Lần quét key (lỏng: tìm tên key trong mã nguồn) không thấy key nào không còn được đọc. `HIDDEN_START`
được export từ `motion.ts` nhưng chỉ test dùng; chấp nhận được.

## Chưa kiểm

- I1 và M1 chưa thấy trên trình duyệt hay trên một bản build. Mỗi cái có một lệnh kiểm ghi ở mục tương ứng.
- Không chạy e2e, không build.
- Hướng sửa của M2 chưa thử.
