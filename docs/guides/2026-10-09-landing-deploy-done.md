# Đã làm gì: deploy landing lên Cloudflare + waitlist D1 (Task 1–6)

Đối chiếu ngày 09/10/2026. Đọc toàn bộ plan `docs/superpowers/plans/2026-10-08-landing-deploy.md`, spec, decisions,
code, cấu hình, lịch sử Git và báo cáo Playwright đang có trên nhánh `feat/landing-page`, đến commit `e3998b0`.
Khái niệm nền (DNS, Worker, D1, binding…) đã giải thích ở
`docs/guides/2026-10-08-landing-deploy-explained.md`; doc này chỉ nói **đã làm gì, khác plan chỗ nào, kiểm thế nào**.

Mỗi task có 4 phần: **Mục tiêu** (plan muốn gì) · **Đã làm** (file và cách chạy) · **Khác plan** (và lý do) ·
**Bằng chứng / tự kiểm**.

---

## Tóm tắt một trang

| Task | Kết quả | Commit | Khác plan? |
|---|---|---|---|
| 1. Chạy landing trên Worker | Code và cấu hình xong | `9f0cfa5`, bổ sung `e3998b0` | Next 16.3.8, Docker, font OG nhúng, `request.cf` cố định; bật observability |
| 2. Bảng D1 + nơi lưu | Xong | `3f2af7e` | Không |
| 3. Form ghi vào D1, log không lộ email | Xong | `3091056` | Bỏ 1 test cũ (đã lỗi thời) |
| 4. Chính sách bảo mật thật, bật link | Xong | `ec25dd9` | Gọn lại cách tạo link email |
| 5. Footer giữ trang; carousel | Xong | `b28582f` | Carousel **không cần sửa** (lỗi đã hết từ trước) |
| 6. CI + tài liệu | Cấu hình đã có; chưa xác minh CI trên GitHub | `b8945e9` | README và CLAUDE.md còn vài chỗ chưa cập nhật theo code mới |
| 7. Domain + Cloudflare thật | **Chưa đủ bằng chứng hoàn thành** | — | `database_id` vẫn là giá trị mẫu; chưa kiểm tra tài khoản Cloudflare, domain và bản production |

Kiểm lại trong lần đối chiếu này: Windows `typecheck`, `lint` và **58/58** unit test xanh (14 file test).
Báo cáo Playwright có sẵn ghi **91 passed, 0 failed, 0 flaky, 1 skipped** trên desktop/mobile. Lần chạy lại
`pnpm --filter web cf:docker` bị dừng trước khi build do Docker Desktop không kết nối được Linux engine;
vì vậy kết quả e2e có sẵn được ghi riêng với kết quả vừa chạy. Chi tiết ở mục kiểm chứng cuối tài liệu.

"Xong" ở đây mô tả phần triển khai trong repo. Các checkbox của plan vẫn là `- [ ]`; chúng chưa phản ánh tiến độ code.
Lịch sử Git xác nhận các thay đổi đã commit, nhưng không đủ để xác nhận mọi bước TDD đã từng chạy đỏ trước khi sửa,
hoặc dịch vụ trên Cloudflare đã được cấu hình. Tài liệu này không coi những việc đó là đã kiểm chứng.

---

## Bức tranh sau khi xong Task 1–6

```
Trình duyệt ─▶ Worker "wordmet-web" (Next 16.3.8 đóng gói bởi OpenNext 1.20.7)
                 ├─ /vi, /en                   → có kiểm tra prerender tại build
                 ├─ /privacy, /terms           → trang theo locale, xử lý qua OpenNext
                 ├─ CSS, JS, font, ảnh tĩnh     → binding ASSETS (.open-next/assets)
                 ├─ /                           → src/proxy.ts chọn ngôn ngữ (vẫn là proxy.ts)
                 ├─ /vi/opengraph-image/…       → ảnh PNG, font lấy từ chuỗi base64 trong code
                 └─ POST form                   → joinWaitlist → getWaitlistStore() → env.DB
                                                                                   │
                                                                         D1 "wordmet-waitlist"
                                                                         bảng waitlist (3 cột)
```

Repo đã có cách chạy D1 **local** (`apps/web/.wrangler/state`). Cấu hình **production** chưa được nối bằng ID thật:
`database_id` vẫn là `00000000-0000-0000-0000-000000000000`. Điều này không chứng minh tài khoản Cloudflare chưa có
database; nó chứng minh repo chưa trỏ tới một D1 production đã xác định.

---

## Task 1 — Chạy landing trên runtime Worker

**Mục tiêu (plan):** thêm OpenNext + wrangler, cấu hình Worker, chạy lại toàn bộ e2e cũ trên runtime Worker để chắc
chuyển chỗ chạy không làm hỏng gì.

**Đã làm:**

| File | Vai trò |
|---|---|
| `apps/web/wrangler.jsonc` | Khai báo Worker `wordmet-web`, entry `.open-next/worker.js`, ASSETS, service tự tham chiếu, binding D1 `DB` → `wordmet-waitlist`; ID còn là giá trị mẫu; `observability.enabled = true` |
| `apps/web/open-next.config.ts` | Cấu hình OpenNext mặc định |
| `apps/web/next.config.ts` | Gọi `initOpenNextCloudflareForDev()` để `pnpm dev` có binding D1 local |
| `apps/web/cloudflare-env.d.ts` | Kiểu `CloudflareEnv { DB: D1Database }`, sinh bằng `pnpm cf-typegen` |
| `apps/web/package.json` | Thêm `@opennextjs/cloudflare 1.20.7`, `wrangler 4.145.0`; scripts `cf:build`, `cf:dev`, `deploy`, `cf-typegen`, `cf:docker`, `gen:og-fonts` |
| `.node-version` (gốc repo) | `24.11.0` — máy bạn, CI và Cloudflare cùng một bản Node |
| `pnpm-workspace.yaml` | Cho phép script cài đặt của `workerd`, `@swc/core`, `unrs-resolver` (pnpm 11 chặn mặc định); tắt `@parcel/watcher` |
| `apps/web/eslint.config.mjs` | Bỏ qua thư mục sinh ra: `.open-next/`, `.wrangler/`, `.docker-out/`, `cloudflare-env.d.ts` |
| `apps/web/playwright.config.ts` | e2e chạy trên Worker: `cf:build → db:migrate:local → e2e-cf.mjs → cf:dev` (cổng 3100) |

**Khác hoặc bổ sung so với các bước ban đầu:**

1. **Không build được trên Windows → chạy trong Docker.**
   Lần 1 lỗi `EPERM symlink`; bật Developer Mode thì lần 2 lỗi `Access is denied` khi đọc qua symlink. OpenNext tự cảnh
   báo "not fully compatible with Windows". Giải pháp (bạn chọn A): `apps/web/scripts/cf-docker.mjs` — chép repo vào
   container Linux `node:24.11.0-bookworm`, cài phụ thuộc Linux, build, chạy e2e, chạy `assert:static`, chép báo cáo
   ra `apps/web/.docker-out/`. Lệnh: `pnpm cf:docker` (trong `apps/web`). WSL Ubuntu (cách B) để sau.
2. **Next hạ từ 16.4.0 xuống 16.3.8.**
   Theo ghi chú sửa ngày 08/10 trong plan, bản 16.4 đã trả 500 với lỗi
   `Unexpected loadManifest(/.next/server/preview-props.json) call!`. Repo hiện ghim Next và `eslint-config-next`
   cùng `16.3.8`; OpenNext vẫn `1.20.7`. Đây là quyết định xử lý tương thích đã ghi trong plan, không phải lỗi
   được tái hiện lại trong lần viết tài liệu này.
3. **Font ảnh OG nhúng vào code.**
   Thay việc đọc file font tại runtime bằng dữ liệu được nhúng trong bundle. Cách đang dùng:
   `scripts/gen-og-fonts.mjs` đổi 2 file font thành chuỗi base64 trong
   `src/app/[locale]/og-fonts.generated.ts` (~360 KB, **file sinh ra, đừng sửa tay**; đổi font thì chạy
   `pnpm gen:og-fonts`). `opengraph-image.tsx` giải mã chuỗi đó thay vì đọc file.
4. **e2e dùng vị trí giả cố định.**
   `wrangler dev` lấy vị trí thật của máy (VN); OpenNext chép quốc gia đó vào header, nên test LP7 ("không có quốc gia,
   trình duyệt tiếng Anh → /en") luôn ra `/vi`. Trên production hành vi này là **đúng**. `scripts/e2e-cf.mjs` ghi một
   `request.cf` không có quốc gia vào `.wrangler/e2e-cf.json`; Playwright trỏ biến `CLOUDFLARE_CF_FETCH_PATH` vào đó.
   LP4 vẫn tự gửi header quốc gia VN như cũ.
5. **Bật log và thêm chế độ build riêng cho Docker (commit `e3998b0`).**
   Wrangler đã có `observability.enabled = true`. `pnpm cf:docker --build` chỉ build, bỏ cài Chromium/e2e,
   chép `.open-next` từ Linux về máy Windows để dùng Wrangler với artifact đó. Ba biến `NEXT_PUBLIC_*` được truyền
   từ host vào container nếu đã đặt. Chế độ này không tự deploy và không tự đặt các giá trị production.

**`proxy.ts`:** giữ nguyên đúng quyết định DP11. OpenNext in cảnh báo "Node.js middleware support is experimental" nhưng
LP4–LP7 đều xanh trên Worker, nên **không** cần đổi sang `middleware.ts`.

**Tự kiểm:** `pnpm cf:docker` trong `apps/web` (cần Docker Linux engine đang chạy) → mong đợi cuối log có `passed`
và `Static: /vi, /en`, exit code 0. `assert:static` đọc `.next/prerender-manifest.json`, yêu cầu có chính xác
hai route `/vi` và `/en`; nó không tự xác nhận mọi trang khác đều tĩnh.

### Vai trò của OpenNext và các trường Wrangler

Next.js tạo output riêng của Next. OpenNext chuyển output đó thành entry `.open-next/worker.js` và các assets
để Wrangler chạy hoặc deploy. Vì vậy Wrangler ở project này không đọc trực tiếp các component TSX rồi tự build Next.

| Trường | Ý nghĩa trong project |
|---|---|
| `name: wordmet-web` | Tên Worker sẽ được quản lý trên Cloudflare |
| `main: .open-next/worker.js` | Entry đã build mà Wrangler thực thi |
| `compatibility_date` | Mốc chọn hành vi tương thích của runtime; khác với phiên bản package Wrangler |
| `nodejs_compat` | Bật các API Node được runtime Workers hỗ trợ, phục vụ output Next/OpenNext |
| `ASSETS` | Binding để phục vụ file từ `.open-next/assets` |
| `WORKER_SELF_REFERENCE` | Service binding trỏ lại Worker cùng tên, nằm trong cấu hình OpenNext của ứng dụng |
| `DB` | Binding mà code dùng để truy cập D1; tên database và ID được khai báo cùng binding |
| `observability` | Cấu hình thu thập log khi Worker được deploy |

Không có binding R2 hay Images trong cấu hình hiện tại, đúng phạm vi plan.

---

## Task 2 — Bảng D1 và nơi lưu `createD1Store`

**Mục tiêu:** bảng 3 cột; email mới → thêm, email đã có → bỏ qua; test với D1 local qua runtime Wrangler,
thay vì mock hàm ghi database. Đây là môi trường mô phỏng D1 trên máy, không kết nối D1 production.

**Đã làm:**

| File | Vai trò |
|---|---|
| `apps/web/migrations/0001_waitlist.sql` | `CREATE TABLE waitlist (email TEXT PRIMARY KEY, locale … CHECK (locale IN ('vi','en')), created_at TEXT NOT NULL)` |
| `apps/web/src/features/waitlist/d1-store.ts` | `createD1Store(db, now?)`: `INSERT … ON CONFLICT(email) DO NOTHING`; `meta.changes === 1` → `'created'`, ngược lại `'exists'` |
| `apps/web/src/test/d1.ts` | `openTestD1()`: `getPlatformProxy({ configPath, persist: false })`, lấy binding DB, đọc các file SQL theo tên rồi áp dụng; trả DB và hàm dispose |
| `apps/web/src/features/waitlist/d1-store.test.ts` | 4 test (bên dưới) |
| `apps/web/package.json`, `apps/web/playwright.config.ts` | Scripts `db:migrate:local`, `db:migrate:remote`; e2e áp migration local trước khi chạy Worker |

4 test: lần đầu → `created` và dòng đúng 3 giá trị · gửi lại → `exists`, dòng **không đổi** (ngôn ngữ, thời điểm giữ nguyên)
· hai lần gửi **cùng lúc** → đúng 1 `created`, 1 `exists`, 1 dòng · ngôn ngữ `fr` → bảng từ chối.

**Khác plan:** helper truyền thêm `configPath` tuyệt đối tới `wrangler.jsonc` để xác định cấu hình rõ ràng.
Interface `createD1Store(db, now?)`, SQL và hành vi vẫn đúng plan.

**Bằng chứng:** 4 test D1 nằm trong bộ 58 test vừa chạy thành công. Đọc code xác nhận dùng câu SQL có tham số
`?1, ?2, ?3` và ràng buộc ở database. Không sửa code để thử mutation trong lần đối chiếu này.

---

## Task 3 — Form ghi vào D1; log lỗi không có email

**Mục tiêu:** bỏ bộ nhớ tạm, form ghi D1; thiếu binding hay D1 lỗi thì form báo lỗi chung + log tên lỗi, **không** log email.

**Đã làm:**

| File | Thay đổi |
|---|---|
| `src/features/waitlist/store.ts` | `storeFromEnv(env)`: thiếu `DB` → ném `waitlist: missing DB binding`. `getWaitlistStore()` (async) lấy `env` qua `getCloudflareContext`. Đã **xoá** biến bộ nhớ dùng chung và cảnh báo "in-memory store" |
| `src/features/waitlist/actions.ts` | Nếu lấy store lỗi → log `waitlist_store_failed { error: <tên lỗi> }`, trả `error` kèm email người dùng đã gõ (để họ không phải gõ lại) |
| `src/features/waitlist/join.ts` | Khối `catch` giờ log `waitlist_store_failed` (trước đây nuốt lỗi im lặng) |
| `src/features/waitlist/store.test.ts` | Test thiếu binding |
| `src/features/waitlist/join.test.ts` | Test log có tên lỗi và **không** chứa `secret@gmail.com` |
| `e2e/waitlist.spec.ts`, `e2e/d1.ts` | Gõ email viết hoa + khoảng trắng, gửi 2 lần, rồi đọc thẳng D1 local: đúng **1 dòng**, email đã viết thường, `locale = en` |

Chuẩn hoá email (bỏ khoảng trắng, viết thường) **đã có sẵn** trong `schema.ts` từ landing, không thêm lần nữa.
`memory-store.ts` vẫn còn, chỉ dùng trong unit test.

### Một lần gửi form đi qua những bước nào

1. `WaitlistForm` gọi Server Action `joinWaitlist` với `FormData`.
2. `joinWaitlist` gọi `getWaitlistStore()` để lấy context Cloudflare và binding `DB`. Nếu bước này lỗi,
   action ghi tên sự kiện/tên lỗi rồi trả trạng thái `error`, giữ email đã nhập cho giao diện.
3. `handleJoin` kiểm honeypot, email, consent và locale. Email được trim + lowercase; email dài hơn 254 ký tự
   hoặc locale ngoài `vi/en` bị từ chối. Honeypot có nội dung thì trả success mà không gọi `store.add`.
4. `createD1Store.add` ghi SQL có tham số. Khoá chính email và `ON CONFLICT DO NOTHING` xử lý trùng ngay ở database,
   tránh cách "SELECT trước, INSERT sau" vốn có thể đua nhau khi hai request tới cùng lúc.
5. Email mới hoặc đã tồn tại đều được `handleJoin` trả thành công. Trạng thái nội bộ `created/exists` không được dùng
   để công khai cho người gửi biết email đó đã có trong danh sách hay chưa.
6. Khi lệnh ghi lỗi, chỉ `error.name` được log; không log email, thông điệp lỗi hay đối tượng lỗi đầy đủ.

`created_at` là thời điểm server ghi dòng đầu tiên bằng `now().toISOString()`, không phải thời điểm chính xác người
dùng bấm checkbox. Gửi trùng giữ nguyên timestamp và locale của lần đầu.

**Khác plan:** bỏ test cũ "LPE12 cảnh báo đúng 1 lần khi production dùng bộ nhớ" — tính năng đó đã bị xoá đúng spec §3.3.

**Bằng chứng:** test thiếu binding và test log vừa chạy xanh; báo cáo Playwright có sẵn ghi 2/2 test trong
`waitlist.spec.ts` xanh (desktop/mobile). Test đọc D1 kiểm chính xác email chuẩn hoá và `locale = en`.
Nhánh lỗi khi `joinWaitlist` lấy context/store được xác nhận bằng đọc code; chưa có test riêng gọi Server Action
với binding bị gỡ, nên chưa coi đó là một failure test xuyên suốt trình duyệt → Worker.

**Observability đã bật trong repo**, bằng `"observability": { "enabled": true }` ở `wrangler.jsonc`
(commit `e3998b0`). Khi cấu hình này được deploy, Worker có cấu hình thu thập log. Việc log production đã xuất hiện
trên dashboard vẫn cần kiểm tra sau deploy; bật một dòng trong repo chưa xác nhận bản đang chạy trên Cloudflare.

---

## Task 4 — Chính sách bảo mật thật; bật lại link

**Mục tiêu:** `/privacy` thành bản thật (VI/EN), bỏ `noindex` riêng; link chính sách trong câu đồng ý và ở footer trở lại
link thật; bấm link không làm tick ô.

**Đã làm:**

| File | Thay đổi |
|---|---|
| `src/components/sections/PrivacyPolicy.tsx` (mới) | Tiêu đề, ngày hiệu lực (08/10/2026 · 8 October 2026), giới thiệu, 5 mục; email liên hệ thành link `mailto:` |
| `messages/vi.json`, `messages/en.json` | Khối `Legal.privacy` — **đúng từng chữ** trong bảng của plan; `draftNotice` giữ lại vì `/terms` vẫn là nháp |
| `src/app/[locale]/privacy/page.tsx` | Dùng `PrivacyPolicy`, bỏ `robots: noindex` riêng, thêm `description` |
| `src/features/waitlist/labels.tsx` | "Chính sách bảo mật" trong câu đồng ý: `<span aria-disabled>` → `Link` thật |
| `src/components/layout/SiteFooter.tsx` | Mục chính sách: `<span aria-disabled>` → `Link` thật (link Terms giữ nguyên) |
| `src/app/sitemap.ts` | Thêm `/vi/privacy`, `/en/privacy` |
| `e2e/privacy.spec.ts`, `e2e/seo.spec.ts` | 3 test: bấm link trong câu đồng ý → mở `/en/privacy`, quay lại ô **chưa tick**; link footer mở `/vi/privacy`; trang theo đúng cài đặt robots của site, không còn chữ "nháp", có `hello@wordmet.com`. Sitemap có trang chính sách |

**Khác plan:**
- Plan nói "giữ privacy trong sitemap" nhưng sitemap cũ không có → đã **thêm**.
- `deleteBody` trong messages bọc `<link>{email}</link>` để component tạo `mailto:` bằng `privacy.rich`.
  Nội dung hiển thị vẫn theo câu chữ đã duyệt; không cần bộ dịch phụ.

**Bằng chứng:** báo cáo Worker có sẵn ghi 6/6 test `privacy.spec.ts` xanh (3 test × desktop/mobile).
Code xác nhận sitemap có cả `/vi/privacy`, `/en/privacy`; `/terms` vẫn dùng `LegalDraft` và `noindex` riêng.
Ngày hiệu lực đang cố định 08/10/2026; plan yêu cầu đổi nếu ngày deploy đầu khác, nên còn phải soát ở Task 7.

---

## Task 5 — Footer giữ trang khi đổi ngôn ngữ; carousel

**Mục tiêu:** đang ở `/vi/privacy` bấm "English" → `/en/privacy` (trước: về `/en`). Đo lỗi carousel "bấm › lần đầu
không cuộn", còn thì sửa.

**Đã làm:**

| File | Thay đổi |
|---|---|
| `src/components/layout/FooterLanguageLink.tsx` (mới, client) | Lấy đường dẫn hiện tại (`usePathname`) và tạo link sang ngôn ngữ kia, giống cách `LanguageSwitch` ở header |
| `src/components/layout/SiteFooter.tsx` | Thay thẻ `<a href="/en">` bằng `FooterLanguageLink` |
| `e2e/chrome.spec.ts` | Test footer giữ trang |
| `e2e/page.spec.ts` | Test: mỗi lần bấm ›, card mới hiện ≥ 95% trong khung |

**Khác plan:** `ClozeCarousel.tsx` không có commit thay đổi trong phần deploy; lịch sử file chỉ có commit landing
`deab488`. Plan cho phép giữ nguyên nếu lỗi không còn tái hiện. Repo có test kiểm card mới hiển thị hơn 95% trong
khung sau mỗi lần bấm Next, bảo vệ hành vi cuộn. Phép đo này xác nhận độ hiển thị, không đo chính xác tâm hình học.

**Bằng chứng:** báo cáo hiện có ghi 8/8 test `chrome.spec.ts` xanh và 41 pass/1 skip trong `page.spec.ts`,
bao gồm kiểm footer và carousel. Không có log chạy trước sửa được xác minh trong lần đối chiếu này.

---

## Task 6 — CI và tài liệu

**Đã làm:**

| File | Thay đổi |
|---|---|
| `.github/workflows/ci.yml` (job `web`) | Bỏ bước `Build` riêng (Playwright tự build một lần bằng OpenNext); `assert:static` chạy **sau** e2e. Job `api` không đụng |
| `apps/web/README.md` | Mục "Deploy (Cloudflare)": bảng script, D1 local ở đâu, xem danh sách email, xoá một email (cảnh báo `--remote` = production), migrate trước khi deploy, Time Travel 7 ngày, biến `NEXT_PUBLIC_*` nướng lúc build, ghi chú Windows/Docker; bảng biến môi trường thêm cột Production |
| `CLAUDE.md` | Mục "Landing (apps/web) — as-built" |

**Khác plan:** chuỗi CI đúng mục tiêu build một lần, nhưng `CLAUDE.md` vẫn ghi "Tasks 1-3 done; 4-7 in progress",
trong khi Task 4–5 đã có code và test. README chưa liệt kê chế độ `cf:docker --build` được thêm ở commit `e3998b0`.
Đây là độ lệch tài liệu; chức năng và script tương ứng đã tồn tại.

**Chưa kiểm:** chưa đọc kết quả CI của nhánh này trên GitHub. Có báo cáo e2e Linux trước đó, nhưng lần đối chiếu
này chỉ chạy lại lint, typecheck, unit; Docker engine không sẵn sàng nên chưa chạy lại toàn chuỗi Linux.

---

## Task 7 — Những phần còn cần xác minh trên Cloudflare

Đây là phần vận hành bên ngoài repo. Tên Worker, database và domain trong code mới thể hiện cấu hình dự định;
chúng chưa chứng minh các tài nguyên đã được tạo hoặc đang chạy.

| Bước trong plan | Repo hiện có gì | Bằng chứng còn cần để kết luận hoàn thành |
|---|---|---|
| 1. Domain và đăng nhập | Domain dự định `wordmet.com`; Wrangler đã cài ở package `web` | Quyền sở hữu domain và đăng nhập thành công trong đúng tài khoản |
| 2. D1 production | Migration và script remote đã có; `database_id` còn là giá trị mẫu | ID thật trong cấu hình; migration đã áp lên đúng D1 remote |
| 3. Push, PR và merge | Code nằm trên `feat/landing-page`, các task đã có commit | PR, CI xanh và trạng thái merge trên GitHub |
| 4. Workers Builds | Repo đã có build/deploy script | Cấu hình dashboard đúng thư mục `apps/web`, nhánh `main`, biến build; tắt non-production branch builds |
| 5. Domain và redirect | Code có metadata và locale routing | HTTPS hoạt động trên domain thật; `www` chuyển 301 về domain chính |
| 6. Rate limiting | Honeypot có trong code | Rule trên dashboard; kiểm trả 429 và hết chặn theo plan |
| 7. Email Routing | Contact dùng `hello@wordmet.com` | Rule nhận thư cho `hello@` và `ryan.ngo@`; destination đã xác minh và nhận được thư thử |
| 8. Smoke test | Test tự động local và cách đọc D1 đã có | Form trên domain thật ghi một dòng D1 remote; robots/index/OG đúng; dọn email thử theo plan |

Task 7 chưa được thực hiện trong lần đối chiếu này. Không dùng test D1 local hoặc báo cáo Playwright để suy ra
domain, Email Routing, rate limiting hay dữ liệu production đã hoạt động.

---

## Ngoài plan nhưng đã giao

| Thứ | Ở đâu |
|---|---|
| Doc giải thích hệ thống cho chủ dự án | `docs/guides/2026-10-08-landing-deploy-explained.md` (`0b79484`) |
| Plan B (môi trường WSL) | cuối plan, mục "Việc sau" |
| Doc này | `docs/guides/2026-10-09-landing-deploy-done.md` |

---

## Kiểm chứng trong lần đối chiếu này

### Những lệnh vừa chạy

Các lệnh dưới được gọi từ gốc repo, với `SWC_NATIVE_BINDING_CACHE` trỏ tới cache SWC của người dùng:

| Lệnh | Kết quả |
|---|---|
| `pnpm --filter web exec wrangler --version` | `4.145.0`, exit 0 |
| `pnpm --filter web typecheck` | Qua, exit 0 |
| `pnpm --filter web lint` | Qua ESLint và kiểm giá trị Tailwind raw, exit 0 |
| `pnpm --filter web test` | 14 file, 58 test passed, exit 0 |
| `pnpm --filter web cf:docker` | Chưa vào build/test; `docker run` exit 125 vì kết nối Docker Linux engine bị EOF |
| Kiểm Docker sau lỗi | Không còn tìm thấy named pipe `dockerDesktopLinuxEngine` |

Docker bị lỗi ở hạ tầng chạy container; kết quả đó không phải lỗi của một test ứng dụng. Chưa chạy lại e2e thành công
trong lần đối chiếu này. Không thay đổi Docker Desktop hoặc môi trường hệ thống để viết tài liệu.

### Báo cáo Worker có sẵn

Đã đọc dữ liệu `report.json` được nhúng trong `apps/web/.docker-out/playwright-report/index.html`, đồng thời kiểm
`apps/web/.docker-out/test-results/.last-run.json` có `status: passed`, `failedTests: []`.
Báo cáo bắt đầu lúc **00:37 ngày 09/10/2026, giờ Việt Nam**, thời gian e2e khoảng 95 giây.

| Nhóm e2e | Passed | Failed | Skipped |
|---|---:|---:|---:|
| `a11y.spec.ts` | 4 | 0 | 0 |
| `chrome.spec.ts` | 8 | 0 | 0 |
| `locale.spec.ts` | 16 | 0 | 0 |
| `page.spec.ts` | 41 | 0 | 1 |
| `privacy.spec.ts` | 6 | 0 | 0 |
| `seo.spec.ts` | 10 | 0 | 0 |
| `visual.spec.ts` | 4 | 0 | 0 |
| `waitlist.spec.ts` | 2 | 0 | 0 |
| **Tổng** | **91** | **0** | **1** |

Test touch swipe được skip ở project desktop vì không có `hasTouch`; bản mobile có touch chạy bình thường.
Báo cáo không có flaky test. Nó là bằng chứng của lần chạy trước, không chứng minh toàn bộ HEAD `e3998b0`
đã được chạy lại hoặc production đã hoạt động. Riêng `Static: /vi, /en` không có log mới trong lần đối chiếu này;
script và manifest build được đọc để xác nhận cấu trúc kiểm tra, cần chạy lại `cf:docker` để có kết quả mới.

---

## Lệnh Wrangler đúng trong monorepo này

Ở gốc repo, `package.json` chỉ có script `test:e2e` của API. Wrangler là devDependency của `apps/web`,
nên gọi nó qua package đó:

```powershell
# Từ E:\Working\Working project\english-learning
pnpm --filter web exec wrangler --version
pnpm --filter web exec wrangler login
```

Hoặc chuyển thư mục trước:

```powershell
Set-Location 'E:\Working\Working project\english-learning\apps\web'
pnpm exec wrangler login
```

`pnpm create wrangler` trong log của bạn đã chạy gói `create-wrangler@0.5.1`, một công cụ tạo `wrangler.toml`
từ template và yêu cầu `--input`. Nó không cài CLI `wrangler` vào package hiện tại. Project đã có cả dependency
Wrangler và `wrangler.jsonc`, nên không cần tạo lại hay thêm một bản Wrangler ở root để giải quyết lỗi này.

Cloudflare hướng dẫn cài Wrangler local trong project tại
[Install/Update Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/).
Các lệnh dưới là hướng dẫn; login, tạo tài nguyên remote và deploy chưa được chạy trong lần đối chiếu này.

### Hai cách phát triển local khác nhau

| | `pnpm --filter web dev` | `pnpm --filter web cf:dev` |
|---|---|---|
| Script thực tế | `next dev` | `wrangler dev --port 3100` |
| Cổng | 3000 | 3100 |
| Input | Source Next.js đang sửa | Worker đã build ở `.open-next/worker.js` |
| Cập nhật khi sửa TSX | Next dev rebuild và cập nhật giao diện | Cần build lại Next/OpenNext để có artifact mới |
| D1 | Binding local nhờ `initOpenNextCloudflareForDev()` | Binding local do Wrangler cung cấp |
| Mục đích | Viết tính năng và kiểm UI hằng ngày | Kiểm bản build trong runtime Workers trước deploy |

Wrangler hỗ trợ chạy local, nhưng với cấu hình hiện tại nó không thay thế bước build Next.js.
Project chủ động giữ cả hai chế độ. Trên Windows, phần build Worker đi qua Docker; plan WSL để sau.

Thử form khi phát triển bằng Next dev, từ gốc repo:

```powershell
$env:SWC_NATIVE_BINDING_CACHE = Join-Path $env:USERPROFILE '.cache\swc-native'
pnpm --filter web db:migrate:local
pnpm --filter web dev
```

Mở `http://localhost:3000/vi`. Trong terminal khác ở gốc repo, xem dữ liệu thử:

```powershell
pnpm --filter web exec wrangler d1 execute wordmet-waitlist --local --command "SELECT email, locale, created_at FROM waitlist ORDER BY created_at"
```

Thử bản Worker trên Windows khi Docker Linux engine hoạt động:

```powershell
$env:NEXT_PUBLIC_SITE_URL = 'http://localhost:3100'
$env:NEXT_PUBLIC_INDEXABLE = 'false'
$env:NEXT_PUBLIC_CONTACT_EMAIL = 'hello@wordmet.com'
pnpm --filter web cf:docker --build
pnpm --filter web db:migrate:local
pnpm --filter web cf:dev
```

Chỉ chạy các bước sau khi bước trước thành công. `--build` chép `.open-next` về host, không chép `.next`;
vì vậy chạy `assert:static` trên host sau bước này có thể đọc `.next` cũ. Chuỗi `cf:docker` mặc định kiểm static
ngay trong container sau e2e, là đường kiểm tra được dùng trong plan.

### Dữ liệu thử nằm ở đâu

| Cách chạy | Nơi giữ dữ liệu |
|---|---|
| Next dev trên Windows | D1 local ở `.wrangler/state` của `apps/web` |
| Wrangler dev trên Windows | D1 local ở `.wrangler/state` của `apps/web` |
| Test `openTestD1()` | Runtime local riêng với `persist: false`, không giữ lại sau dispose |
| E2E qua `cf:docker` | `.wrangler/state` trong `/work/apps/web` của container; helper không chép database về host |
| D1 remote sau Task 7 | Database Cloudflare được xác định bởi ID thật; dùng lệnh `--remote` |

Email tạo bởi e2e Docker không nhất thiết xuất hiện trong D1 local trên máy Windows. Docker chỉ chép báo cáo test
ra host ở chế độ kiểm tra, còn chế độ `--build` chép artifact Worker.

---

## Những độ lệch giữa plan và project cần ghi nhớ

| Điểm | Thực tế đã đối chiếu |
|---|---|
| Checkbox plan vẫn để trống | Code và commit của Task 1–6 đã có; không dùng checkbox để kết luận chưa triển khai |
| Tech Stack đầu plan ghi Next 16.4.0 | Ghi chú sửa trong cùng plan và package hiện tại dùng 16.3.8 |
| Architecture trong spec vẽ `middleware.ts` | Code vẫn là `proxy.ts`, đúng quyết định DP11; test locale trong báo cáo cũ xanh |
| Spec nói script `preview` | Package hiện tại dùng `cf:build`, `cf:dev`, `cf:docker`; không có script `preview` |
| Plan dự kiến 53 unit, 70 e2e | Hiện vừa chạy 58 unit; báo cáo e2e ghi 92 trường hợp, gồm 91 pass và 1 skip |
| Bản doc cũ nói chưa bật observability | Đã bật ở commit `e3998b0`; còn cần xác minh log của bản deploy |
| CLAUDE.md ghi chỉ Task 1–3 xong | Lỗi cập nhật trạng thái tài liệu; Task 4–5 cũng có triển khai và test |
| README chưa có `cf:docker --build` | Script đã hỗ trợ từ commit `e3998b0` |
| Chính sách ngày hiệu lực 08/10/2026 | Cần soát lại theo ngày deploy đầu như plan yêu cầu |
| Rate limiting, Email Routing, Workers Builds | Thuộc cấu hình Cloudflare ở Task 7; chưa được xác minh bằng repo |

Sau phần triển khai trong repo, các việc còn lại trực tiếp thuộc plan là: chạy lại kiểm tra Worker khi Docker
hoạt động, xác minh CI trên GitHub và thực hiện/kiểm Task 7. WSL Ubuntu là phần "Việc sau", chưa có bằng chứng
đã hoàn tất trong lần đối chiếu này.
