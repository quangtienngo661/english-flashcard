# Code facts: quảng cáo cho người dùng Free (AdSense vignette + house ad) — 04/11/2026

Đầu vào cho design doc "launch prep — ads". Chỉ ghi sự thật đã đọc trong phiên này: code ở worktree `launch-prep-design`
(nhánh `docs/launch-prep-design`, HEAD `a6b2bd15`), và tài liệu chính thức đọc ngày 04/11/2026. Mỗi dòng có `path:line` hoặc URL.
Điểm chưa xác nhận được ghi `ASSUMPTION`. File này không đề xuất phương án; mục 8 chỉ liệt kê chỗ code hoặc tài liệu đụng với quyết định
của chủ dự án.

Quyết định của chủ dự án (đầu vào, không phải sự thật về code): ads chỉ cho Free, chỉ trong `/vi/app`, `/en/app`; khách chỉ thấy landing;
AdSense **Auto ads vignette** ở Hôm nay (`/app`), Nhóm (`/app/groups`), Tra từ (`/app/lookup`) và màn tổng kết phiên luyện, không bao giờ giữa
phiên; không video; tần suất thấp; song song có dialog tự làm quảng bá Pro (house ad) khi đổi trang, dùng `ads_interstitial_per_day`,
`ads_min_interval_minutes`; không đặt quảng cáo Google trong dialog tự làm; CSP có `nonce` chỉ cho `/app`; gắn TFAT cho người dưới 16 tuổi
(biết ngày sinh); xin đồng ý trước khi chạy ads cá nhân hoá (Luật 91/2025).

---

## 1. API

### 1.1 `ads` trong `GET /v1/me/entitlements`

- Kiểu trả về có `ads: { show: boolean; interstitial_per_day: number; min_interval_minutes: number }`
  (`apps/api/src/entitlements/entitlements.service.ts:42`).
- Cách tính: `show: entitlements.adsEnabled && resolved.plan === 'free'`; hai số còn lại lấy thẳng từ Settings
  (`entitlements.service.ts:177-180`). Gói `trial` và `pro` luôn `show: false`. Không có điều kiện về tuổi, vai trò staff hay đồng ý.
- `plan` lấy từ `resolve()` trên subscription và grant (`entitlements.service.ts:129-132`); không cache, mỗi lần gọi tính lại
  (`entitlements.service.ts:51-53`).
- Controller: chỉ cần đăng nhập, không cần `@LearnerContent()`; không có profile thì 404 (`apps/api/src/entitlements/api/me-entitlements.controller.ts:6-19`).
- Staff (`admin`, `editor`) không có grant thì là Free (CLAUDE.md của repo, mục Bước 5; spec `entitlements.service.spec.ts` có case
  "a staff user without grants is free" theo `docs/superpowers/plans/2026-10-19-buoc-5-entitlements.md:627`). Hệ quả: staff mở app người học
  cũng có `ads.show = true` khi bật công tắc.
- Smoke có bước B5#25 bật `ads_enabled` và kiểm Free thấy, Pro/trial không (`apps/api/scripts/smoke-buoc-5.mjs:658-668`).

### 1.2 Ba setting quảng cáo

| Key (API) | Mặc định | Biên | Nguồn |
|---|---|---|---|
| `entitlements.ads_enabled` | `false` | bool | `apps/api/src/settings/settings.definitions.ts:75`, `:199` |
| `entitlements.ads_interstitial_per_day` | `3` | 0–20 | `settings.definitions.ts:76`, `:123`, `:200` |
| `entitlements.ads_min_interval_minutes` | `10` | 1–240 | `settings.definitions.ts:76`, `:124`, `:201` |

- Lưu camelCase (`adsEnabled`, `adsInterstitialPerDay`, `adsMinIntervalMinutes`), API nói snake_case (`settings.definitions.ts:38`, `:260-262`).
- Giá trị lưu trong DB bị biên hiện tại từ chối thì quay về mặc định (`settings.definitions.ts:333-348`).
- Design Bước 5 §11 (Chốt D21): app **tự đếm** số lần đã hiện (server không biết quảng cáo đã hiện), chỉ hiện ở "chỗ nghỉ" (hết phiên luyện,
  hết lượt flashcard), không giữa câu hỏi; `ads_enabled` mặc định tắt, chỉ bật sau khi chốt tuổi tối thiểu và có bước hỏi đồng ý theo dõi quảng
  cáo (`docs/superpowers/specs/2026-10-19-buoc-5-entitlements-design.md:614-620`).
- Tên ở admin: "Bật quảng cáo", "Quảng cáo toàn màn mỗi ngày", "Khoảng cách giữa hai quảng cáo" (`apps/admin/messages/vi.json:2066-2068`;
  bản tiếng Anh `apps/admin/messages/en.json:2066-2068`). Form "Cài đặt hệ thống" liệt kê ba ô ở nhóm `entitlements`, kiểu `bool`, `int` đơn vị
  `times`, `int` đơn vị `minutes` (`apps/admin/src/features/settings/settings-api.ts:75-77`).
- `GET /v1/me/app-config` cũng đọc Settings mỗi request (`apps/api/src/settings/me-app-config.controller.ts:6-17`) nhưng kiểu web của nó
  không có số quảng cáo (`apps/web/src/app-shell/queries.ts:30-41`).

### 1.3 `GET /v1/me`: ngày sinh, múi giờ

- `Profile` có `timezone: string` và `birth_date: string | null` dạng `YYYY-MM-DD` (`apps/api/src/identity/profile/identity.service.ts:18-34`,
  `:56`). `GET /v1/me` trả `Profile` + `auth_method`, `sign_in_methods`, `terms_outdated` (`apps/api/src/identity/profile/profile.controller.ts:9-44`).
- `birth_date` có thể `null` (tài khoản admin tạo hoặc tài khoản cũ); web chặn mọi trang member và đưa về `/app/complete-profile` khi
  `birth_date === null`, chưa đồng ý điều khoản, hoặc `terms_outdated` (`apps/web/src/app-shell/RequireSession.tsx:75-77`). Vậy trong vùng
  member, ngày sinh luôn có.
- Tuổi tối thiểu đăng ký: `MIN_AGE = 13` (`apps/api/src/identity/profile/person.ts:3`); `isOldEnough(birthDate, today, minAge)` nhận tuổi làm
  tham số, 29/2 tính là 1/3 năm không nhuận (`person.ts:37-44`). "Hôm nay" khi đăng ký tính theo múi giờ người dùng (`apps/api/src/identity/auth/auth.service.ts:48-52`).
- Bản web: `isOldEnough(birthDate, today)` **cố định** `MIN_AGE = 13`, không nhận tham số tuổi (`apps/web/src/app-ui/date-of-birth.ts:3`, `:21-26`);
  `deviceToday()` lấy ngày theo múi giờ thiết bị (`date-of-birth.ts:37-39`). Kiểm "dưới 16" cần hàm mới hoặc thêm tham số.
- Web `Me` có `timezone`, `birth_date` (`apps/web/src/app-shell/session/session-store.ts:6-26`). Lần mở app đầu, web PATCH múi giờ thiết bị
  nếu khác (`RequireSession.tsx:42-52`).

## 2. Web app shell, điều hướng, màn tổng kết

### 2.1 Kiểu `Entitlements` ở web thiếu `ads`

- `apps/web/src/app-shell/queries.ts:11-27`: có `plan`, `sources`, `pools`, `features`, `ai_available`, `trial_eligible`; **không có `ads`**.
- `useEntitlements()` dùng React Query, key `['me','entitlements']` (`queries.ts:43-49`); QueryClient không retry, không đặt `staleTime`
  (`apps/web/src/app-shell/AppProviders.tsx:36-40`).
- `PlanChip` gọi `useEntitlements()` ở thanh trên của mọi trang dùng `AppShell` (`apps/web/src/app-chrome/PlanChip.tsx:4-19`,
  `apps/web/src/app-chrome/AppShell.tsx:86`), nên dữ liệu entitlements đã có sẵn trong cache trên các trang có chrome.

### 2.2 Cây route và layout

- Gốc: `src/app/[locale]/layout.tsx` (html, body, font) có `generateStaticParams()` cho `vi`, `en` (`apps/web/src/app/[locale]/layout.tsx:18-20`, `:34-47`).
- App người học: `src/app/[locale]/app/layout.app.tsx` chèn script chống nháy màu inline rồi `AppIntl` → `AppProviders`
  (`apps/web/src/app/[locale]/app/layout.app.tsx:10-21`). `metadata.robots` = noindex, nofollow (`layout.app.tsx:8`).
- Nhóm `(member)`: layout bọc `RequireSession` (`apps/web/src/app/[locale]/app/(member)/layout.app.tsx:5-7`). Nhóm `(auth)`: `AuthGate`
  (`(auth)/layout.app.tsx:5-7`).
- File route của app có đuôi `.app.tsx`; Next chỉ thấy khi `NEXT_PUBLIC_LEARNER_APP=on` (`apps/web/src/lib/learner-app-flag.ts:1-17`,
  `apps/web/next.config.ts:24-25`). Cờ tắt thì `proxy.ts` trả 307 `/{locale}/app/*` về `/{locale}` (`apps/web/src/proxy.ts:12-21`).
- Trang đích của ads: Hôm nay `(member)/page.app.tsx` → `TodayPage`; Nhóm `(member)/groups/page.app.tsx` → `GroupListPage`; Tra từ
  `(member)/lookup/page.app.tsx` → `LookupPage` trong `Suspense`. Ba trang này đều `AppShell variant="main"`
  (`apps/web/src/features/learner/today/TodayPage.tsx:37-38`, `groups/GroupListPage.tsx:43`, `lookup/LookupPage.tsx:39`).
- `RequireSession` khi chưa có phiên hoặc đang chuyển hướng chỉ vẽ `FullScreenSpinner` (`RequireSession.tsx:54-56`); lúc prerender trạng thái
  là `loading` nên HTML tĩnh của mọi trang member chỉ có spinner (`RequireSession.tsx:35`).

### 2.3 Điều hướng phía client

- Link trong app là `next/link` (soft navigation của App Router), ví dụ thanh trên, thanh tab điện thoại, chân trang
  (`apps/web/src/app-chrome/AppShell.tsx:5`, `MobileTabBar.tsx:4`, `TopBar.tsx:5`, `AppFooter.tsx:4`). Link của React Aria cũng đi qua
  `router.push` (`AppProviders.tsx:48-49`). Tra từ đổi query bằng `router.replace`/`router.push` (`features/learner/lookup/LookupPage.tsx:36`,
  `app-chrome/SearchStrip.tsx:67`).
- Chuyển trang **toàn phần** (full page load) dùng `hardReplace()` = `window.location.replace` (`apps/web/src/app-shell/navigate.ts:8-11`).
  Vào phiên luyện luôn bằng `hardReplace('/app/practice/session')` (`features/learner/practice/use-practice-starter.tsx:63`, `:128`;
  `practice/session/SessionSummary.tsx:65`).
- Không có router event tự viết (không có `popstate`, `routeChange`); chỗ đọc đường dẫn là `usePathname()` trong `TopBar`, `MobileTabBar`,
  `SearchStrip`, `RequireSession`, `AuthGate` (grep `usePathname` trong `apps/web/src`). `AppProviders` nằm ở layout của `/app` nên sống qua mọi
  soft navigation trong `/app` (`layout.app.tsx:15-19`); một full load (hardReplace, reload) dựng lại toàn bộ JS.
- `currentTab(pathname)` map đường dẫn sang tab: `/app` = today, `/app/(groups|group|topic|review)` = groups, `/app/practice…` = practice,
  `/app/(lookup|word)` = lookup (`apps/web/src/app-chrome/nav.ts:6-17`). Lưu ý `/app/review` thuộc tab Nhóm.

### 2.4 Phiên luyện và màn tổng kết

- Màn tổng kết **không phải route riêng**: là `phase.kind === 'summary'` bên trong `/app/practice/session`
  (`apps/web/src/features/learner/practice/session/PracticeSession.tsx:120`; kiểu `Phase` ở `use-practice-session.ts:68-77`). URL giữ nguyên
  `/{locale}/app/practice/session` từ câu đầu tới tổng kết.
- Vào tổng kết qua `toSummary()` khi API trả `finished`, khi người học chọn dừng ở vòng, hoặc bấm Esc/× (`use-practice-session.ts:176`, `:199-205`,
  `:300-312`). `toSummary` invalidate entitlements, groups, practice (`use-practice-session.ts:201-204`).
- Tải lại trang ở tổng kết: trang đọc lại `GET /v1/practice/sessions/current`; phiên đã xong thì 404 → phase `none` ("không có phiên")
  (`use-practice-session.ts:95-125`, `:137-143`). Tức là tổng kết chỉ hiện một lần, trong bộ nhớ.
- Rời tổng kết: `<Link href="/app/practice">` (soft) hoặc Enter → `hardReplace(practiceHref)` (full load) (`SessionSummary.tsx:153-160`,
  `PracticeSession.tsx:76-78`); "Luyện thêm một phiên" → `hardReplace('/app/practice/session')` (`SessionSummary.tsx:63-67`).
- Trang phiên không dùng `AppShell` (full screen, `PracticeSession.tsx:147-187`; route `(member)/practice/session/page.app.tsx:3-6`). Trong phiên,
  nút × khi chưa dừng được là `<Link href="/app/practice">` (`PracticeSession.tsx:151-159`); bàn phím Esc dừng phiên (`PracticeSession.tsx:62-68`).
- Flashcard: tổng kết cũng là trạng thái trong `/app/review` (`features/learner/review/ReviewSession.tsx:66`). Chủ dự án không chọn chỗ này.

## 3. CSP hiện tại và cách render

- CSP dựng ở `apps/web/src/lib/csp.ts:15-33`: `default-src 'self'`; `script-src 'self'` + hash (khi không dự phòng) +
  `https://static.cloudflareinsights.com` + `'unsafe-inline'` (khi dự phòng) + `'unsafe-eval'` (dev); `style-src 'self'` (+`'unsafe-inline'`);
  `img-src 'self' data: blob:`; `font-src 'self'`; `connect-src 'self'` + origin API + `https://cloudflareinsights.com`; `object-src 'none'`;
  `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'`; `upgrade-insecure-requests` ngoài dev. **Không có `frame-src`**.
- `CSP_INLINE_FALLBACK = true` (`csp.ts:5-6`): D20, bật từ Task 2 M1 (22/10/2026) vì `'self'` + SRI chặn script inline
  `self.__next_f.push(…)` mà Next stream RSC payload (as-built `docs/deliveries/giao-dien-nguoi-hoc.md:75-76`, `:216-218`). Khi dự phòng bật thì
  bỏ hash, vì có hash thì trình duyệt bỏ qua `'unsafe-inline'` (`csp.ts:17-18`; test `apps/web/src/lib/csp.test.ts:33-35`). Quyết định gốc D9, D20,
  D22: `docs/superpowers/specs/2026-10-22-giao-dien-nguoi-hoc-design.md:35`, `:46`, `:48`, §4.6 `:158-170`.
- Header đặt **một lần cho mọi đường dẫn** trong `next.config.ts` `headers()`: `source: '/:path*'`, chỉ khi `NODE_ENV === 'production'`
  (`apps/web/next.config.ts:13-19`, `:28-31`); bật `experimental.sri` sha256 (`next.config.ts:26-27`).
- Script chống nháy màu là `<script dangerouslySetInnerHTML>` trong `layout.app.tsx:14`, hash `THEME_SCRIPT_HASH`
  (`apps/web/src/app-shell/theme/theme-script.ts:3-6`); hash chỉ vào CSP khi không dự phòng (`csp.ts:18`).
- Proxy: `apps/web/src/proxy.ts` (tên file Next 16) chỉ làm redirect (cờ app, `/en` → `/vi`, chọn locale ở `/`) rồi `next-intl` middleware;
  **không đụng CSP**, không tạo nonce (`proxy.ts:11-44`). Matcher `'/((?!api|trpc|_next|_vercel|.*\\..*).*)'` (`proxy.ts:46-48`): bỏ đường có dấu
  chấm (vd `/ads.txt`), **không** bỏ request prefetch.
- Render: không trang `/app` nào có `export const dynamic` hay đọc `headers()`/`cookies()`/`connection()` (grep trong `apps/web/src`); chỉ
  `(site)/privacy/page.tsx:12` và `(site)/terms/page.tsx:12` là `force-dynamic` (đọc `GET /v1/legal/current` mỗi request).
- Design §4.1 chốt **mọi trang `/app` là trang tĩnh** (prerender lúc build), "hợp với CSP kiểu SRI (D9)"
  (`2026-10-22-giao-dien-nguoi-hoc-design.md:80-82`). CI giữ điều này: job `web` chạy `pnpm assert:static` với `NEXT_PUBLIC_LEARNER_APP=on`
  (`.github/workflows/ci.yml:107-111`); script fail nếu `/vi/app`, `/en/app` không có trong `.next/prerender-manifest.json`
  (`apps/web/scripts/assert-static.mjs:1-14`).
- e2e CSP: `apps/web/e2e/csp.spec.ts` bắt `securitypolicyviolation`, mở `/vi` và `/vi/app`, đòi không có vi phạm, kiểm header chứa
  `default-src 'self'` và `frame-ancestors 'none'`. e2e chạy trên bản build Worker: `pnpm cf:build && node scripts/e2e-cf.mjs && pnpm cf:dev`
  (`apps/web/playwright.config.ts:18-25`).
- OpenNext: `defineCloudflareConfig()` mặc định, không override (`apps/web/open-next.config.ts:1-3`); Worker `wordmet-web`, `nodejs_compat`,
  assets binding, `WORKER_SELF_REFERENCE` (`apps/web/wrangler.jsonc:1-21`). Phiên bản: `next 16.4.3`, `@opennextjs/cloudflare 1.20.13`,
  `wrangler 4.153.0`, `react-aria-components 1.22.1` (`apps/web/package.json:26-61`).
- Cỡ Worker: gzip bật app hết đợt người học 3.761,49 KiB (`docs/deliveries/deploy-checklist.md:98-107`). Trang giới hạn Cloudflare (cập nhật
  29/10/2026, đọc 04/11): 64 MiB **chưa nén** cho cả Free và Paid, "There is no compressed size limit", khởi động ≤ 1 giây
  (https://developers.cloudflare.com/workers/platform/limits/). Trang chủ OpenNext Cloudflare vẫn ghi 3 MiB Free / 10 MiB Paid sau nén
  (https://opennext.js.org/cloudflare, đọc 04/11): hai nguồn mâu thuẫn, trang của Cloudflare là nguồn gốc của giới hạn.
- Checklist Deploy đã có các mục CSP liên quan: kiểm Console không lỗi CSP trên production sau lần đầu CSP lên `main` (`deploy-checklist.md:108-110`);
  Bot Fight Mode và Turnstile đều chèn JS cần CSP cho phép (`deploy-checklist.md:80-86`).

## 4. Next.js 16 và OpenNext: CSP có nonce

Nguồn chính: https://nextjs.org/docs/app/guides/content-security-policy (`lastUpdated: 2026-03-20`, đọc 04/11/2026; trang không ghi số
phiên bản, đây là bản "latest" dùng `proxy.ts`).

- Tạo nonce trong `proxy.ts`: `Buffer.from(crypto.randomUUID()).toString('base64')`, đặt **trên request** cả `x-nonce` và
  `Content-Security-Policy`, trả `NextResponse.next({ request: { headers } })`, rồi đặt `Content-Security-Policy` trên response. Mẫu
  `script-src 'self' 'nonce-…' 'strict-dynamic'`, `style-src 'self' 'nonce-…'`.
- Next tự gắn nonce: lúc render "Next.js parses the `Content-Security-Policy` header and extracts the nonce", rồi gắn cho framework scripts,
  page bundles, "Inline styles and scripts generated by Next.js", và `<Script>` có prop `nonce`. Đã kiểm trong bản cài: Next 16.4.3 đọc header
  **request** `content-security-policy` (hoặc `-report-only`), lấy nonce đầu tiên trong `script-src` (không có thì `default-src`)
  (`node_modules/.pnpm/next@16.4.3_…/node_modules/next/dist/server/route-modules/app-page/parse-request-headers.js:30-31`,
  `dist/server/app-render/get-script-nonce-from-header.js:12`).
- Bắt buộc render động: "you **must use dynamic rendering to add nonces**"; "Static pages are generated at build time, when no request or
  response headers exist—so no nonce can be injected"; khi dùng nonce thì "Static optimization and Incremental Static Regeneration (ISR) are
  disabled", không cache CDN mặc định, PPR "incompatible". Ép động bằng `await connection()` (`next/server`).
- Đọc nonce ở Server Component: `(await headers()).get('x-nonce')`, truyền vào `<Script nonce={nonce}>`.
- Matcher khuyên dùng: bỏ `api`, `_next/static`, `_next/image`, `favicon.ico`, và bỏ prefetch bằng `missing: [{ type: 'header', key:
  'next-router-prefetch' }, { type: 'header', key: 'purpose', value: 'prefetch' }]`.
- SRI (experimental) là cách thay nonce để giữ trang tĩnh; giới hạn "Build-time only: Cannot handle dynamically generated scripts". Dự án đang
  dùng SRI nhưng đã phải bật `'unsafe-inline'` (mục 3).
- `'strict-dynamic'` (MDN, sửa 12/08/2026, đọc 04/11: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src):
  tin script có nonce/hash và mọi script nó nạp; "any allowlist or source expressions such as `'self'` or `'unsafe-inline'` will be ignored".
  Hash vẫn có hiệu lực, nên script chống nháy màu có thể giữ hash.
- **OpenNext Cloudflare, lỗi đang mở:** issue #1302 "CSP request header stripped on Cloudflare — Next.js automatic script nonce doesn't work"
  (mở 04/07/2026, còn Open; https://github.com/opennextjs/opennextjs-cloudflare/issues/1302, đọc 04/11). Bình luận 24/10/2026 tái hiện trên
  **`@opennextjs/cloudflare 1.20.13`** (đúng bản của dự án) với cấu hình giống dự án: nonce CSP đặt trong middleware **và** một CSP không nonce,
  có `'unsafe-inline'` đặt trong `next.config` `headers()`. Nguyên nhân người bình luận nêu: `routingHandler` gộp header của `next.config` lên
  header response của middleware, rồi `requestHandler` chép mọi `x-middleware-response-*` vào request, ghi đè CSP có nonce bằng CSP của
  `next.config`, nên Next không thấy nonce. Không có maintainer xác nhận. PR sửa opennextjs-aws #1339 "fix: do not copy response headers onto the
  request headers" còn **Open**, chưa có số bản phát hành (https://github.com/opennextjs/opennextjs-aws/pull/1339, đọc 04/11).
- Trang OpenNext Cloudflare: "Node Middleware … are not yet supported" (https://opennext.js.org/cloudflare, đọc 04/11); trang known-issues không
  nói gì về CSP/nonce (https://opennext.js.org/cloudflare/known-issues). `proxy.ts` hiện có của dự án đã chạy trên bản build Worker trong e2e
  (mục 3), nên proxy chạy được; nonce qua proxy trên Worker thì **chưa ai chạy thử** trong repo.
- Cloudflare Web Analytics: trang CSP của Cloudflare chỉ ghi `script-src static.cloudflareinsights.com; connect-src cloudflareinsights.com`,
  không nói beacon chèn tự động có mang nonce hay không, và Cloudflare không sửa CSP của origin
  (https://developers.cloudflare.com/fundamentals/reference/policies-compliances/content-security-policies/, cập nhật 20/04/2026, đọc 04/11).

## 5. Google AdSense (help chính thức, đọc 04/11/2026; các trang không ghi ngày cập nhật, chỉ "©2026 Google")

### 5.1 CSP cho AdSense — https://support.google.com/adsense/answer/16283098?hl=en

- "we only support strict CSP (option 2)", vì domain của mã AdSense đổi theo thời gian (không có danh sách domain để allowlist).
- Header mẫu, gọi là các directive "the AdSense code specifically supports": `object-src 'none'`; `script-src 'nonce-{random}' 'unsafe-inline'
  'unsafe-eval' 'strict-dynamic' https: http:`; `base-uri 'none'`; `report-uri …`. Câu cảnh báo: "More restrictive policies may break without
  notice." Trang không nói gì về `frame-src`, `img-src`, `connect-src`, `style-src`, `default-src`.
- "apply the nonce to every script tag on your page, including the AdSense code"; mẫu gắn nonce cho cả thẻ loader
  `adsbygoogle.js?client=ca-pub-…` (`async`, `crossorigin="anonymous"`) và script inline `adsbygoogle.push`.
- Khuyên thử trước bằng `Content-Security-Policy-Report-Only`.
- Đối chiếu với CSP hiện tại: `default-src 'self'` (không có `frame-src`, `img-src` chỉ `'self' data: blob:`, `connect-src` chỉ self + API +
  beacon) chặt hơn mẫu của Google; `script-src` có `'unsafe-eval'` trong mẫu Google nhưng CSP dự án chỉ cho ở dev (`csp.ts:21`).

### 5.2 Đặt mã Auto ads

- Mã đặt trong `<head>`, khuyên đặt trên mọi trang; mẫu là `<script async src="…adsbygoogle.js?client=ca-pub-…" crossorigin="anonymous">`
  (https://support.google.com/adsense/answer/9274516?hl=en). Trang không nói gì về SPA, chèn mã động hay `next/script`.
- Cài đặt Auto ads theo site: công tắc tổng; Intent-driven formats; Overlay formats (Anchor, **Vignette**, Side rail); In-page formats (Banner,
  Multiplex); Excluded areas; Excluded pages (https://support.google.com/adsense/answer/9305577?hl=en). Muốn chỉ có vignette thì tắt các định dạng
  khác trong UI.

### 5.3 Vignette

- Định nghĩa: "full-screen ads that appear between page loads and can be skipped by users at any time"; "By default, vignette ads appear when a
  user clicks on a link on your site" (https://support.google.com/adsense/answer/16531962?hl=en).
- Tần suất: mặc định 10 phút, chọn từ 1 phút tới 1 giờ; đặt ở Ads → Edit site → Overlay formats → Vignette ads → Advanced settings
  (https://support.google.com/adsense/answer/13956167?hl=en).
- Advanced settings còn có "Allow vignette ads on screens wider than 1000px, like desktop" và "Allow additional triggers for vignette ads"
  (https://support.google.com/adsense/answer/9305577?hl=en).
- Trigger bổ sung (thông báo 09/02/2026, tự bật sau một tháng nếu không opt-out): bỏ ẩn tab/cửa sổ; bấm thanh điều hướng trình duyệt (desktop);
  mở trang cùng site ở tab mới rồi chuyển sang; tới cuối phần `main` article rồi cuộn lên hoặc sau 5 s (mobile)/10 s (desktop); **không thao tác
  ≥ 30 giây rồi thao tác lại**; nút Back (Chrome, Edge, Opera). Tắt ô "Allow additional triggers" thì "also turns off the existing triggers";
  "We will continue to respect your existing frequency cap settings" (https://support.google.com/adsense/answer/16853623?hl=en).
- Nút Back không còn kích hoạt vignette từ 15/06/2026, không cần làm gì (https://support.google.com/adsense/answer/17048667).
- Chặn từng link: thêm `data-google-vignette="false"` vào thẻ `<a>` (https://support.google.com/adsense/answer/17016693).
- Loại trừ trang: "This page only" (khớp đúng URL) hoặc "All pages under this section" (theo tiền tố); "Auto ads doesn't support URLs that
  contain fragments", không nhận `#` và `?`; có hiệu lực tới 1 giờ sau "Apply to site". Trang không nói rõ có chặn vignette hay không
  (https://support.google.com/adsense/answer/9262311?hl=en).
- Video: không tìm thấy trang help nào có công tắc "không video" cho vignette/Auto ads (đã đọc 9305577, 16531962, 13956167, 16853623).
- SPA / soft navigation: không trang help nào đã đọc nói vignette hoạt động thế nào khi đổi route bằng History API (16531962, 16853623,
  2806011 "AdSense code for dynamically generated pages").

### 5.4 Ads không cá nhân hoá, đồng ý

- `(adsbygoogle=window.adsbygoogle||[]).requestNonPersonalizedAds=1;` đặt trước lệnh push, một dòng mỗi trang; `pauseAdRequests=1` rồi
  `pauseAdRequests=0` để chờ đồng ý ("Without making this call, no ads will be shown"); có ví dụ cho Auto ads; cần đồng ý cookie "even for
  non-personalized ads" ở nước áp ePrivacy (https://support.google.com/adsense/answer/9042142?hl=en).
- NPA không dùng cookie để nhắm mục tiêu nhưng "do still use cookies or mobile ad identifiers for frequency capping and aggregated ad
  reporting"; "ads personalization settings can be managed in any region globally"
  (https://support.google.com/adsense/answer/9007336?hl=en).
- Privacy & messaging có 4 loại thông điệp: European regulations (EEA, UK, Thụy Sĩ), US state regulations, Ad blocking recovery, Offerwall (Beta);
  **không có loại cho Việt Nam** (https://support.google.com/adsense/answer/10923959?hl=en).
- EEA/UK (từ 16/01/2024) và Thụy Sĩ (từ 31/07/2024): ads cá nhân hoá cần CMP được Google chứng nhận, tích hợp IAB TCF; không có thì "may be
  eligible for non-personalized ads or limited ads" (https://support.google.com/adsense/answer/13554116?hl=en).
- Pháp lý Việt Nam đã có trong repo (nguồn thứ cấp, không đọc lại phiên này): Luật 91/2025 Điều 28 — quảng cáo theo hành vi hoặc cá nhân hoá chỉ
  thu dữ liệu qua theo dõi web/app khi có đồng ý (`docs/preparation/ADS_INTEGRATION_RESEARCH_2026-10-19.md:205-216`, `:353-355`).

### 5.5 TFAT (tag for age treatment)

- TFAT thay TFUA/TFCD ("now deprecated"); giá trị `1` = child, `2` = teen, `0` = unspecified. Child: tắt ads cá nhân hoá, remarketing, request
  tới vendor bên thứ ba; teen: tắt ads cá nhân hoá và remarketing, thêm bảo vệ cho teen. Trang không nêu ngưỡng tuổi nào
  (https://support.google.com/adsense/answer/9007197?hl=en). Thông báo 18/05/2026: "TFAT replaces the legacy tagForChildDirectedTreatment
  (TFCD)" (https://support.google.com/adsense/announcements/9189068?hl=en).
- Cú pháp web (adsbygoogle async): thuộc tính `data-tag-for-age-treatment="1|2|0"` **trên thẻ `<ins class="adsbygoogle">`**, không phải trên
  loader; tag trong ad request "will take precedence over any applicable site-level settings"; mức site thì báo qua Search Console
  (https://support.google.com/adsense/answer/3248194). Auto ads không có thẻ `<ins>`; trang không nói cách gắn TFAT cho Auto ads.

### 5.6 `ads.txt`, crawler, chính sách nội dung

- Dòng `google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0`; đặt ở gốc domain (`example.com/ads.txt`); "not mandatory, but it's highly
  recommended"; vài ngày tới một tháng mới phản ánh (https://support.google.com/adsense/answer/12171612?hl=en). Repo chưa có `apps/web/public/`
  (lệnh `ls apps/web/public` không có kết quả); matcher của proxy bỏ đường có dấu chấm nên `/ads.txt` không qua proxy (`proxy.ts:47`).
- Crawler `Mediapartners-Google` tuân robots.txt nhưng trang chặn bằng `User-agent: *` "the AdSense crawler will still crawl these pages"; chỉ
  vào URL có gắn ad tag (https://support.google.com/adsense/answer/99376?hl=en).
- Trang sau đăng nhập: cần tài khoản đã kích hoạt, xác minh site ở Search Console, tạo "crawler login" với URL login, phương thức GET/POST,
  tham số; "your server will return a cookie for logged-in access" (https://support.google.com/adsense/answer/161351?hl=en).
- Chính sách: không đặt ads Google ở màn không có nội dung của publisher hoặc nội dung giá trị thấp, màn "used for alerts, navigation or other
  behavioral purposes", màn "dead end" (vd "Thank You, Exit, Error pages")
  (https://support.google.com/publisherpolicies/answer/11112688?hl=en).

## 6. Lưu trữ trình duyệt và dialog có sẵn

- `localStorage` đang dùng: theme `wordmet-web.theme` (`apps/web/src/app-shell/theme/theme.ts:10`, `:19`), nhóm lưu gần nhất
  `wordmet-web.last-group` (`features/learner/add-word/last-group.ts:2-17`), công tắc câu AI và câu của mình (`features/learner/practice/AiTypesToggle.tsx:15`,
  `:23`; `OwnSentencesToggle.tsx:11`, `:19`). `sessionStorage`: email chờ xác minh (`app-shell/session/pending-email.ts:6-23`), cờ đăng xuất đang chờ
  (`session-store.ts:388`, `:413-414`). Không key nào gắn theo user id.
- Mẫu chuẩn: key tiền tố `wordmet-web.`, mọi đọc/ghi bọc `try/catch`, lỗi thì coi như trống (`last-group.ts:4-17`).
- `BroadcastChannel` đã dùng để đồng bộ phiên giữa các tab (`app-shell/session/session-context.tsx:16-18`).
- Dialog dùng chung: `apps/web/src/app-ui/Dialog.tsx:29-72` (React Aria `ModalOverlay` + `Modal` + `Dialog`): giữa màn từ 768 px, sheet dưới
  dưới 768 px; props `isOpen`, `onOpenChange`, `title`, `closeLabel` (nút ×), `footer`, `isDismissable`. Nút Pro có sẵn: `ProBadge`,
  `LockedFeature` dẫn về `/app/plans` (`apps/web/src/app-ui/Locked.tsx:7-30`). Trang Gói học đã ghi Pro "Không quảng cáo"
  (`apps/web/messages/vi.json:1525-1529`, `:1542`; `features/learner/plans/CompareTable.tsx:15`; landing `vi.json:229`).

## 7. Landing, chính sách bảo mật, robots

- Chính sách bảo mật và điều khoản: `/[locale]/privacy`, `/[locale]/terms`, `force-dynamic`, đọc Markdown admin đăng qua `GET /v1/legal/current`
  ở server mỗi request, hết 2,5 s hoặc chưa đăng thì hiện "bản nháp" (`apps/web/src/app/[locale]/(site)/privacy/page.tsx:11-40`,
  `apps/web/src/lib/legal.ts:25-43`).
- Bản nháp nội dung nằm ở nhánh `docs/web-launch-research` (commit `fc834f11`, 04/11/2026), chưa có trong DB:
  `docs/preparation/legal-drafts/chinh-sach-bao-mat.draft.md` dòng 52 và 106 hứa "không sử dụng dữ liệu cho quảng cáo"; dòng 128 Cloudflare
  "đếm lượt xem trang mà không xác định từng cá nhân"; mục 10 Cookie (dòng 175-177) ghi "không dùng cookie quảng cáo hay cookie theo dõi"; ghi chú
  dòng 42-43 "Khi bật quảng cáo cho gói Miễn phí, phải sửa mục 3, 5 và 10". Bản tiếng Anh `privacy-policy.en.draft.md:128-130` cùng ý.
  (Đọc bằng `git show docs/web-launch-research:<path>`.)
- Cloudflare Web Analytics là bên thứ ba duy nhất được phép, ở mọi trang kể cả `/app` (D22, `csp.ts:1-3`); checklist có mục chính sách bảo mật
  phải nhắc nó (`deploy-checklist.md:111-112`).
- `robots.ts`: khi `NEXT_PUBLIC_INDEXABLE=true` thì `allow: '/'`, `disallow: '/*/app'`; ngược lại chặn `/` và `/*/app`, cho `userAgent: '*'`
  (`apps/web/src/app/robots.ts:5-11`, `apps/web/src/lib/site.ts:3`). Không có rule riêng cho `Mediapartners-Google`.
- Phiên web: `refresh_token` là cookie `httpOnly`, `secure`, `sameSite: 'strict'`, `path: '/v1/auth'` do **API** đặt (host `api.`); refresh cần
  thêm header `X-CSRF-Protection: 1` (`apps/api/src/identity/sessions/session-transport.ts:13-45`). `wordmet.com` không tự đặt cookie đăng nhập nào.

## 8. Chỗ code hoặc tài liệu đụng với quyết định của chủ dự án (sự thật, chưa phải phương án)

1. **Nonce cần render động, nhưng repo đang bắt `/app` phải tĩnh.** Next: "must use dynamic rendering to add nonces" (mục 4). Repo: design §4.1
   "Mọi trang `/app` là trang tĩnh" và CI `assert:static` fail nếu `/vi/app`, `/en/app` không prerender (mục 3). Locale layout có
   `generateStaticParams` (`[locale]/layout.tsx:18-20`).
2. **CSP đang đặt ở `next.config` cho mọi đường, gồm `/app`** (`next.config.ts:28-31`). Đây chính là cấu hình mà issue OpenNext #1302 báo làm mất
   nonce trên `@opennextjs/cloudflare 1.20.13`; bản sửa chưa phát hành (mục 4).
3. **CSP hiện tại sẽ chặn AdSense:** không `frame-src` (rơi về `default-src 'self'`, theo MDN `script-src` chỉ nói fallback về `default-src`; với
   `frame-src` xem ASSUMPTION A5), `img-src` và `connect-src` hẹp; Google chỉ hỗ trợ strict CSP và cảnh báo policy chặt hơn "may break" (mục 5.1).
4. **`'strict-dynamic'` bỏ qua host allowlist**, nên beacon Cloudflare Web Analytics (`static.cloudflareinsights.com`, chèn ở edge) chỉ chạy nếu
   mang nonce; tài liệu Cloudflare không nói beacon có nonce (mục 4).
5. **Màn tổng kết dùng chung URL với phiên luyện** (`/app/practice/session`, mục 2.4). Loại trừ trang của AdSense theo URL (không nhận `?`, `#`) nên
   không tách được "trong phiên" và "tổng kết"; ad code có trên trang này thì link × trong phiên (`PracticeSession.tsx:156`) và các trigger bổ sung
   (không thao tác 30 s rồi thao tác lại, bỏ ẩn tab) cũng chạy trong phiên (mục 5.3). Tắt "Allow additional triggers" cũng tắt các trigger có sẵn.
6. **Vào phiên luyện là full load** (`hardReplace`), còn đổi trang thường là soft navigation `next/link` (mục 2.3). Vignette mặc định gắn với
   "clicks on a link"; hành vi với soft navigation không có trong tài liệu (ASSUMPTION A1).
7. **Tần suất có hai nơi:** AdSense vignette đặt trong UI AdSense (1 phút–1 giờ, mặc định 10 phút); `ads_min_interval_minutes` của dự án là 1–240
   và `ads_interstitial_per_day` 0–20 (mục 1.2), không đẩy sang AdSense.
8. **TFAT cho Auto ads chưa có cú pháp chính thức:** tài liệu chỉ có `data-tag-for-age-treatment` trên `<ins>` (mục 5.5). Web chưa có hàm "dưới 16"
   (`date-of-birth.ts:21-26` cố định 13).
9. **Không có thông điệp đồng ý cho Việt Nam** trong Privacy & messaging (mục 5.4): phần xin đồng ý cho người dùng Việt Nam phải tự làm, rồi dùng
   `requestNonPersonalizedAds` / `pauseAdRequests`. NPA vẫn dùng cookie cho frequency cap.
10. **Crawler không đọc được nội dung `/app`:** HTML tĩnh chỉ có spinner (`RequireSession.tsx:35`, `:55`); crawler login cần server trả cookie đăng
    nhập, trong khi phiên web dựa vào cookie `path=/v1/auth` trên host API cộng header CSRF (mục 7). `robots.ts` chặn `/*/app` cho `*`, nhưng
    AdSense crawler vẫn vào trang bị chặn bằng `*` (mục 5.6).
11. **`ads.show` không xét tuổi, vai trò staff hay đồng ý** (mục 1.1); staff Free cũng thấy ads.
12. **Chính sách bảo mật bản nháp hứa không quảng cáo, không cookie quảng cáo** (mục 7); trang Gói học đã hứa Pro "Không quảng cáo".
13. **Màn tổng kết và chính sách "dead end"/"Exit":** Google cấm ads ở màn kiểu "Thank You, Exit, Error" (mục 5.6). Màn tổng kết có số đúng/sai và
    danh sách từ (`SessionSummary.tsx:94-165`); có tính là "nội dung của publisher" hay không là đánh giá chính sách (ASSUMPTION A9).

## 9. ASSUMPTION (chưa xác nhận trong phiên này)

- **A1.** Vignette có hiện khi bấm `next/link` (soft navigation, Next gọi `preventDefault`) hay chỉ khi điều hướng toàn trang; có tự đổi soft navigation
  thành full load không. Không trang help nào nói về SPA. Cần thử trên bản build thật với tài khoản AdSense.
- **A2.** Page exclusion của Auto ads đánh giá theo URL lúc nạp trang hay theo URL hiện tại sau soft navigation; và có chặn vignette khi rời hay khi tới
  trang bị loại trừ. Tài liệu 9262311 không nói.
- **A3.** Nonce qua `proxy.ts` chạy được trên OpenNext 1.20.13 khi **không** đặt CSP cho `/app` trong `next.config` `headers()` (theo phân tích ở
  issue #1302, ghi đè chỉ xảy ra khi `next.config` có CSP cùng tên). Chưa chạy thử; chưa có maintainer xác nhận nguyên nhân.
- **A4.** Next 16 `proxy.ts` mặc định chạy runtime nào trên OpenNext và có bị xếp vào "Node Middleware … not yet supported" không; proxy hiện tại chạy
  được trong e2e Worker, nhưng chưa kiểm phần đặt header request.
- **A5.** `frame-src` thiếu thì rơi về `child-src` rồi `default-src` (quy tắc CSP Level 3); MDN trang `script-src` đã đọc chỉ ghi fallback của
  `script-src`, chưa mở trang `frame-src`.
- **A6.** Beacon Cloudflare Web Analytics chèn tự động có mang nonce khi CSP có nonce không (tài liệu Cloudflare chỉ nói điều này cho JavaScript
  Detections, theo kết quả tìm kiếm, chưa mở trang đó).
- **A7.** Cách gắn TFAT cho Auto ads (không có `<ins>`): thuộc tính trên loader, `adsbygoogle.push({...})`, hay chỉ mức site qua Search Console.
- **A8.** Có cách nào chặn video trong vignette (Blocking controls hoặc cài đặt khác): không tìm thấy trong các trang đã đọc.
- **A9.** Màn tổng kết phiên luyện có bị coi là màn "Exit"/không nội dung theo Publisher Policies không.
- **A10.** Ảnh hưởng của render động `/app` lên Worker (CPU mỗi request, giới hạn request/ngày của gói Free): chưa đọc trang giá/giới hạn request.
  Chỉ biết `/privacy`, `/terms` đã render động trên Worker (`deploy-checklist.md:177-178` ghi "chưa đo tải").
- **A11.** Dùng `next/script` (có `nonce`) để nạp `adsbygoogle.js` thay cho thẻ `<script>` dán nguyên trong `<head>` có được Google chấp nhận không.
- **A12.** Không có crawler login thì ads trên `/app` vẫn phục vụ được hay bị hạn chế (161351 không nói).
- **A13.** Cookie mà NPA dùng cho frequency cap có cần đồng ý theo Luật 91/2025 không: là câu hỏi pháp lý, repo chỉ có nguồn thứ cấp.

## 10. Nguồn ngoài đã đọc (04/11/2026)

- Next.js CSP guide: https://nextjs.org/docs/app/guides/content-security-policy (lastUpdated 2026-03-20)
- MDN `script-src`: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src (sửa 12/08/2026)
- OpenNext Cloudflare: https://opennext.js.org/cloudflare ; https://opennext.js.org/cloudflare/known-issues
- OpenNext issue #1302: https://github.com/opennextjs/opennextjs-cloudflare/issues/1302 ; PR #1339: https://github.com/opennextjs/opennextjs-aws/pull/1339
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/ (cập nhật 29/10/2026)
- Cloudflare CSP: https://developers.cloudflare.com/fundamentals/reference/policies-compliances/content-security-policies/ (cập nhật 20/04/2026)
- AdSense: 16283098 (CSP), 9274516 (đặt mã), 9305577 (Auto ads settings), 16531962 (vignette), 13956167 (tần suất), 16853623 (trigger bổ sung),
  17048667 (bỏ trigger Back), 17016693 (`data-google-vignette`), 9262311 (loại trừ trang), 9042142 (NPA, pause), 9007336 (cá nhân hoá),
  10923959 (loại thông điệp), 13554116 (CMP EEA/UK/CH), 9007197 và 3248194 (TFAT), 12171612 (ads.txt), 99376 (crawler), 161351 (crawler login),
  2806011 (trang động), thông báo 9189068 — tất cả dưới `https://support.google.com/adsense/answer/<id>` (thông báo: `/adsense/announcements/9189068`).
- Publisher Policies: https://support.google.com/publisherpolicies/answer/11112688?hl=en
