# Chuẩn bị launch đợt B, M0 — spike CSP `nonce` trên bản build Worker (04/11/2026)

Task 1 của `docs/superpowers/plans/2026-11-04-chuan-bi-launch-b.md`; danh mục kiểm lấy từ design B §5.4. Mục đích: biết trước khi viết M4 liệu `/app` có chạy được với CSP
`nonce` + `'strict-dynamic'` trên OpenNext `1.20.13` hay không.

## Kết luận

**Qua, có điều kiện.** Trên bản build Worker (`opennextjs-cloudflare build` rồi `wrangler dev`, tức workerd cục bộ), `/vi/app*` và `/en/app` nhận đúng một CSP `nonce` mỗi request,
mọi script của Next đều mang nonce đó, và không có vi phạm CSP ở bốn trang cần kiểm. **M4 không phải dừng chờ OpenNext** (nếu kết luận này đứng vững sau deploy).

Ba chỗ **chưa kiểm được**, M4 phải xử lý hoặc ghi nhận:
1. **Turnstile của đợt A**: chờ code đợt A M1 (xem mục "Chờ đợt A M1"). Một bản thử cơ chế (không phải code đợt A) cho thấy cách nạp dưới `'strict-dynamic'` chạy được.
2. **Beacon Cloudflare Web Analytics chèn tự động ở edge**: không có trên `wrangler dev`, nên không thử được bản chèn thật. Đã chứng minh cơ chế: một `<script>` chèn vào HTML mà không có nonce bị chặn.
3. **CPU Worker thật**: workerd cục bộ không đo CPU. Chỉ có thời gian chờ (wall time) cục bộ, không so sánh được với giới hạn của Cloudflare. Phải đo sau deploy.

## Cách đã chạy

- Windows không build được OpenNext, nên chạy trong container `node:24.11.0-bookworm` (cùng cách `pnpm cf:docker`): `pnpm cf:build`, rồi `pnpm cf:dev` (`wrangler dev --port 3100`), rồi Playwright (Chromium headless) với
  `e2e/spike-csp.spec.ts`. Biến build như e2e của `apps/web`: `NEXT_PUBLIC_SITE_URL=http://localhost:3100`, `NEXT_PUBLIC_LEARNER_APP=on`, `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000`.
- **Ba chế độ build** (`NEXT_PUBLIC_SPIKE_MODE`):
  - `baseline`: mã không đổi (CSP `/app` trong `next.config.ts` `headers()`, `/vi/app` dựng sẵn). Chuẩn so sánh, và là đối chứng để chắc công cụ đo thấy được "không có nonce".
  - `control`: proxy tạo nonce **và** `next.config.ts` `headers()` vẫn đặt CSP cũ cho `/app` (đúng cấu hình của issue OpenNext #1302).
  - `spike`: proxy tạo nonce, `headers()` bỏ `/app`, layout `/app` gọi `await connection()`.
- Mã spike ở commit `65438668` trên nhánh cục bộ `chore/launch-b-csp-nonce-spike` (không push, không PR). Đổi tên từ `spike/launch-b-csp-nonce` vì hook git của máy này chỉ nhận type
  `feat|fix|docs|test|refactor|chore|ci|build`. Log thô: thư mục ghi chú chung của nhóm session (ngoài repo), thư mục con `m0-spike-raw`.
- Playwright chỉ chạy project `desktop`, một trình duyệt (Chromium). Không thử Firefox, Safari.

## Kết quả theo danh mục §5.4

| Mục kiểm | Kết quả | Bằng chứng (`spike`, trừ khi ghi khác) |
|---|---|---|
| Mọi `<script>` có `nonce` bằng nonce trong header | **Đạt**, với một ngoại lệ có chủ ý | `/vi/app`: 25 thẻ script, 24 mang đúng nonce của header. Thẻ còn lại là script chống nháy màu (inline, bắt đầu `(function(){var c='system';try{c=localStorage.getItem('wordmet-web.the…`), được cho phép bằng `'sha256-…'` trong `script-src`. `/vi/app/login`: 26 thẻ, 25 có nonce. Cùng mẫu ở `/register`, `/forgot-password`, `/groups`, `/en/app`. 6 thẻ có `integrity` (SRI) như trước: SRI và nonce sống chung |
| Hai request khác nonce | **Đạt** | 6 đường `/app` × 2 request: `nonceDiffers: true` cả sáu |
| Đối chứng cho công cụ đo | **Đạt** | `baseline` `/vi/app`: `nonce: null`, 0/29 script có nonce, `x-nextjs-prerender: 1`, `s-maxage=31536000`. `spike`: `cache-control: private, no-cache, no-store, max-age=0, must-revalidate`, không có `x-nextjs-prerender`. Prerender manifest của `spike` chỉ có `/en /vi` (của `baseline` có thêm 52 đường `/app`) |
| Script chống nháy màu chạy | **Đạt**, bằng chứng gián tiếp | 0 vi phạm `script-src-elem | inline` ở các trang `/app`, trong khi probe không nonce ở cùng chế độ báo ra đúng loại vi phạm đó (nên công cụ thấy được inline bị chặn). `data-theme=dark` đúng khi đặt `wordmet-web.theme=dark` trong localStorage. Lưu ý: `ThemeProvider` (`app-shell/theme/ThemeProvider.tsx:44-46`) cũng đặt `data-theme` sau hydrate, nên giá trị `dark` một mình không chứng minh script inline chạy; bằng chứng chính là không có vi phạm |
| Beacon Cloudflare chèn tự động | **Cơ chế đã chứng minh, bản chèn thật chưa thử** | Chèn `<script src=…/beacon.min.js>` vào HTML (giống chèn ở edge): `spike` không nonce → `script-src-elem …beacon.min.js` bị chặn; có nonce → không vi phạm; `baseline` (host được cho phép) → không vi phạm, đủ `injected: 1`. Giả định A6 đúng về cơ chế. Edge của Cloudflare có chèn kèm nonce hay không: không biết, không kiểm được cục bộ |
| Turnstile `/vi/app/login`, `/register`, `/forgot-password` | **Chờ đợt A M1** cho code thật; xem bản thử cơ chế bên dưới | |
| Không vi phạm CSP ở `/vi`, `/vi/app`, `/vi/app/login`, `/vi/app/groups` | **Đạt** | `violations: []` ở cả 4 trang (và `/register`, `/forgot-password`); `hydrated: true` ở cả 6. `/vi/app/groups` với người học đã đăng nhập (mock API) hiện đúng "Nhóm của bạn". Lỗi console còn lại là 401 do mock "chưa đăng nhập", không phải CSP |
| Điều hướng mềm trong app | **Đạt** | `/groups` → `/lookup` → `/groups` bằng bấm link: `softNav: true` (dấu trên `window` còn nguyên), 0 vi phạm. Lần chạy 2 có một lần không thấy link Nhóm ngay sau khi sang Tra từ (test chưa chờ ổn định); lần chạy 3 có chờ 1,5 s thì không lặp lại. Chưa có lời giải thích chắc chắn, không thấy vi phạm CSP ở cả hai lần |
| Landing, `/terms`, `/privacy` giữ nguyên | **Đạt** | `/vi`, `/vi/terms`, `/vi/privacy` vẫn một CSP cũ, không nonce (`spike` và `baseline` như nhau); `/vi` vẫn prerender |
| CPU Worker một trang `/app` | **Không đo được cục bộ** | Wall time cục bộ, 30 request tuần tự, p50: `spike` `/vi/app` 40 ms (lần 1: 48), `/vi/app/login` 44 ms (39); `baseline` `/vi/app` 100 ms (100–122 qua ba lần), `/vi/app/login` 104 ms. Dựng theo request **không** chậm hơn ở đây, vì `baseline` cục bộ đọc trang dựng sẵn qua tầng cache giả (`x-nextjs-cache: MISS` mọi lần). Số này không nói gì về CPU thật hay về cache của Cloudflare |

## Đối chứng `control`: hai CSP cùng lúc

Chế độ `control` (proxy nonce **và** `headers()` còn CSP cho `/app`) **không** tái hiện kiểu "mất nonce" của issue #1302: 24/25 script vẫn có đúng nonce. Nhưng header phản hồi
là **hai chính sách nối bằng dấu phẩy** (nonce của proxy, rồi CSP cũ của `headers()`), và trình duyệt áp **cả hai** (giao của chúng). Hệ quả đo được: script Turnstile có nonce đúng vẫn bị chặn
(`script-src-elem …challenges.cloudflare.com/turnstile/v0/api.js`) vì chính sách cũ không có host đó; `spike` cho qua cùng thẻ. Vậy việc bỏ CSP của `/app` khỏi `next.config.ts` (design §5.4) là **bắt buộc**,
lý do là hai chính sách chồng nhau, không (chỉ) là mất nonce.

Về #1302: theo trang issue và PR opennextjs-aws #1339 (tra 04/11/2026 qua tìm kiếm, chưa đọc hết thread), có hai giả thuyết nguyên nhân (workerd lược header request, hoặc CSP của `next.config` ghi đè CSP của proxy
phía request). Spike không tái hiện lỗi mất nonce ở `wrangler dev` với `1.20.13`; **không có nghĩa** là không xảy ra trên Cloudflare đã deploy.

## Bản thử cơ chế Turnstile (KHÔNG phải code đợt A)

Tiêm vào HTML `/vi/app/login` bằng Playwright, sitekey thử của Cloudflare `1x00000000000000000000AA`, đợi 12 s:

| Cách nạp `api.js` | `baseline` | `control` | `spike` |
|---|---|---|---|
| `<script nonce=N src=api.js>` | bị chặn (host không được phép) | bị chặn (chính sách cũ chồng lên) | **chạy**, `turnstile` có, token có, 0 vi phạm |
| `<script src=api.js>` không nonce | bị chặn | bị chặn | bị chặn (`script-src-elem` api.js và inline) |
| script có nonce tạo thẻ `<script src=api.js>` bằng JS | bị chặn | bị chặn | **chạy**, token có, 0 vi phạm |

Cách thứ ba (script đã tin cậy tự thêm thẻ, không nonce trên thẻ mới) là cách `'strict-dynamic'` cho phép, và là kiểu một component React hoặc `next/script` nạp script. `frame-src https://challenges.cloudflare.com` đủ cho widget
(không vi phạm `frame-src`). Chưa thử `next/script` thật, chưa thử code đợt A.

## Chờ đợt A M1

Dòng Turnstile trong bảng trên còn mở. Lúc kiểm: `feat/launch-a-m1-turnstile` (worktree `focused-leakey-3ecd5f`) vẫn ở `a642d7cf`, cùng commit với nhánh này, chưa có code Turnstile; `dev` cũng chưa có. Khi M1 của đợt A vào `dev`, cần
chạy lại đúng mục này: mở `/vi/app/login`, `/register`, `/forgot-password` với chế độ `spike`, kiểm widget chạy và 0 vi phạm. Cách chạy: `node scripts/spike-docker.mjs spike` trên nhánh spike, với
`SPIKE_GREP="turnstile"`; hoặc viết lại thành test của Task 22 (e2e `csp.spec.ts`, LB3E8).

## Công thức cho Task 22 (đã chạy được trong spike)

```ts
// proxy.ts, nhánh /{vi,en}/app*, sau các redirect hiện có
const nonce = btoa(crypto.randomUUID());
const csp = buildAppCsp(nonce, ...);                       // chuỗi §5.4
const requestHeaders = new Headers(request.headers);
requestHeaders.set('Content-Security-Policy', csp);         // Next đọc nonce từ header của REQUEST
const response = handleI18nRouting(new NextRequest(request, { headers: requestHeaders }));  // next-intl giữ header này
response.headers.set('Content-Security-Policy', csp);       // và đặt trên response
return response;
```

- `next.config.ts` `headers()`: `source: '/((?!vi/app|en/app).*)'` (cho `/vi`, `/en`, `/terms`, `/privacy` giữ CSP cũ; kiểm: `/vi/app` chỉ còn một chính sách). Cạnh phụ: mẫu này cũng bỏ `/vi/apple…`, không có đường nào như vậy.
- `layout.app.tsx` thành `async` và `await connection()`: đủ để `/vi/app` hết prerender (manifest chỉ còn `/en /vi`).
- `CSP_INLINE_FALLBACK` không cần cho `/app` nữa: script RSC inline của Next đã mang nonce (24/25 thẻ), nên `'unsafe-inline'` trong chuỗi §5.4 chỉ còn là dự phòng cho trình duyệt không hiểu nonce. Chưa thử trình duyệt cũ.
- Spike đặt thêm header request `x-nonce` (theo mẫu trong tài liệu Next) nhưng không có mã nào đọc nó; không thử bỏ. Task 22 có thể bỏ nếu test vẫn xanh.

## Rủi ro và việc cho M4

- **Prefetch**: một lần tải `/vi/app/groups` bắn 15 request `_rsc` (prefetch của các link; `baseline` 17). Ở `spike` mỗi request là một lần chạy Worker, không còn trang dựng sẵn. Chưa đo CPU của từng request;
  cần xem trên Worker thật, có thể cần `prefetch={false}` cho link trong app (`ASSUMPTION`, chưa kiểm).
- **Giới hạn CPU theo gói Cloudflare** (theo trang Limits của Cloudflare, tra 04/11/2026 qua tìm kiếm, chưa mở trang gốc): gói Free 10 ms CPU mỗi request, gói Paid mặc định 30 giây (tối đa 5 phút). Chưa biết
  Wordmet dùng gói nào. Nếu là Free thì dựng `/app` theo request là rủi ro thật. Việc cho M4: đo "CPU time" trên Worker đã deploy (Observability hoặc `wrangler tail`) và ghi vào `deploy-checklist.md`
  (đúng yêu cầu Task 22 Step 2).
- **Beacon**: kiểm trong Cloudflare dashboard xem Web Analytics đang chèn tự động hay snippet tay. Nếu tự động: tắt, đặt snippet tay có `nonce` (LB3E9), hoặc nhận beacon bị chặn. Cách kiểm sau deploy: một tuần
  `Content-Security-Policy-Report-Only` như design §5.4 đã định, đọc Console ở `/vi/app`.
- **Kiểm lại trên Cloudflare đã deploy** (cùng #1302): header phản hồi `/vi/app` có đúng một chính sách, script có nonce. Việc này là một dòng trong checklist deploy.
- **`proxy.ts` chạy trên Node runtime** ở OpenNext; build in dòng `WARN Node.js middleware support is experimental in cloudflare` (cả ở `baseline`, nên không phải do spike). Không đổi gì, chỉ ghi để M4 biết.
- Chưa thử phần in đậm của §5.4 (`'unsafe-eval'`, `https:`, `http:` ở các directive; chỉ có khi bật AdSense), chưa thử `/en/app` trong trình duyệt (chỉ header và nonce), chưa thử API ở origin khác `localhost` (`connect-src` lấy đúng `http://localhost:3000` baked lúc build).

## Bằng chứng trích (log `spike`, chế độ `spike`)

```
SPIKE[spike] headers /vi/app          scripts 25, withHeaderNonce 24, integrity 6, cache-control "private, no-cache, no-store, max-age=0, must-revalidate", nonceDiffers true
SPIKE[spike] headers /vi/app/login    scripts 26, withHeaderNonce 25, nonceDiffers true
SPIKE[spike] headers /vi, /vi/terms, /vi/privacy   nonce null, một CSP cũ ("default-src 'self'; script-src 'self' https://static.cloudflareinsights.com 'unsafe-inline' …")
SPIKE[spike] browser  /vi, /vi/app(→login), /vi/app/login, /vi/app/register, /vi/app/forgot-password, /vi/app/groups   violations [], hydrated true, theme "dark"
SPIKE[spike] beacon   {"withNonce":false,"injected":1,"violations":["script-src-elem | https://static.cloudflareinsights.com/beacon.min.js | "]}
SPIKE[spike] beacon   {"withNonce":true,"injected":1,"violations":[]}
SPIKE[spike] turnstile nonce-tag               violations [], turnstileGlobal "object", token "present"
SPIKE[spike] turnstile no-nonce-tag            violations [api.js, inline], turnstileGlobal "undefined", token "absent"
SPIKE[spike] turnstile loaded-by-nonce-script  violations [], turnstileGlobal "object", token "present"
SPIKE[control] /vi/app csp  = "<nonce CSP>, <old CSP>"   (hai chính sách nối bằng dấu phẩy)
SPIKE[control] turnstile nonce-tag  violations [api.js]  (bị chặn bởi chính sách cũ)
prerendered routes (spike): /en /vi        (baseline: /en /vi + 50 đường /app)
```

CSP của `spike` ở `/vi/app`, đúng chuỗi §5.4 chưa có phần in đậm:
`default-src 'self'; script-src 'nonce-{N}' 'strict-dynamic' 'sha256-4qCbwRV0mTFT1agN4flhun8CI1pHQO8k/Bd4U69TcB0=' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' http://localhost:3000 https://cloudflareinsights.com; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`
