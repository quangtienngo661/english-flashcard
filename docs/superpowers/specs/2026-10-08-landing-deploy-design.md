# Design — Deploy landing Wordmet lên Cloudflare, lưu waitlist bằng D1

Ngày 08/10/2026. Nhánh `feat/landing-page`. Nối tiếp `2026-10-08-landing-page-design.md` (gọi tắt "design landing"):
design đó để deploy, domain và store thật ngoài phạm vi (mục 13) và cấm deploy khi form còn lưu vào bộ nhớ (LPE12).
Design này gỡ đúng hai điều đó.

## 1. Mục tiêu và tiêu chí thành công

**Vì sao:** chủ dự án cần website chạy trên domain riêng để nộp đơn Claude for Startups (yêu cầu "a company email that
matches your website's domain"), và email người dùng nhập vào form không được mất.

**Thành công khi:**
- `https://wordmet.com/vi` và `/en` phục vụ landing hiện tại từ Cloudflare Workers; `/` chuyển hướng theo ngôn ngữ như
  design landing §4.1.
- Gửi form lưu một dòng vào D1; khởi động lại hay deploy lại không mất dữ liệu; chủ dự án xem và xuất được danh sách.
- `hello@wordmet.com` và `ryan.ngo@wordmet.com` nhận thư về Gmail cá nhân.
- Merge vào `main` thì Cloudflare tự build và deploy.
- Google index được trang (`NEXT_PUBLIC_INDEXABLE=true`).

**Ngoài phạm vi:** BE/NestJS và Neon; chép waitlist sang Postgres; gửi thư xác nhận hay thư ra mắt; gửi thư *từ*
`@wordmet.com`; Turnstile; Google Workspace; Terms chính thức; công cụ đo lượt xem.

## 2. Quyết định đã chốt (08/10/2026, chủ dự án)

| # | Quyết định | Chọn |
|---|---|---|
| DP1 | Nơi lưu waitlist | **Cloudflare D1**; chép sang Postgres để sau |
| DP2 | Chống spam | Giữ honeypot + **1 rate limiting rule** của Cloudflare (gói Free) |
| DP3 | Cách deploy | **Workers Builds** (Cloudflare tự build khi push vào `main`) |
| DP4 | Chính sách bảo mật | **Bản ngắn nhưng thật** cho việc thu email; Terms giữ bản nháp |
| DP5 | Index | **Mở ngay** khi lên `wordmet.com` |
| DP6–DP10 | Deploy và cấu hình Cloudflare (§5) | Duyệt 08/10; email cá nhân là `ryan.ngo@` |

Giữ `proxy.ts` (§3.1) chốt 08/10.

## 3. Kiến trúc

```
Trình duyệt ──▶ wordmet.com (DNS + Registrar: Cloudflare)
                  │  rate limiting rule (IP, 10 giây)
                  ▼
            Worker "wordmet-web" (Next.js 16 qua @opennextjs/cloudflare)
              ├─ Static assets: /vi, /en, /privacy, /terms, ảnh, sitemap… (prerender lúc build)
              ├─ middleware.ts: "/" → /vi | /en (cookie → cf-ipcountry → Accept-Language)
              └─ Server Action joinWaitlist ──▶ binding DB ──▶ D1 "wordmet-waitlist"
```

### 3.1 `proxy.ts`: giữ nguyên, đổi khi lỗi (chốt 08/10)

Next 16 chạy `proxy.ts` trên Node.js runtime, và mã nguồn `@opennextjs/cloudflare` ghi "Node middleware are not supported
on Cloudflare yet". Chủ dự án chốt **giữ `proxy.ts`**; chỉ khi chạy trên Worker thật mà `/` không chuyển hướng (test
`LP4–LP7` đỏ trên `pnpm preview`) mới đổi tên thành `src/middleware.ts` (hàm `middleware`, edge runtime), logic giữ nguyên.
Việc đổi tên khi đó ghi lại thành một dòng sửa có ngày trong doc này.

### 3.2 Ảnh OG

`opengraph-image.tsx` đọc font bằng `node:fs/promises`. Ảnh này không dùng dữ liệu theo request nên được prerender lúc
build; khi đó `node:fs` chạy trên máy build, không chạy trên Worker. Task đầu tiên xác nhận `.open-next/assets` có ảnh
PNG. Nếu ảnh vẫn được render trên Worker và lỗi: nhúng font bằng `import` thay vì `readFile`. Hành vi người dùng thấy
không đổi.

### 3.3 Nơi lưu (`WaitlistStore`)

- **`src/features/waitlist/d1-store.ts`** — `createD1Store(db: D1Database): WaitlistStore`. Nhận D1 từ ngoài vào, không
  tự đi tìm binding, nên test được độc lập.
- **`store.ts`** — `getWaitlistStore()` thành `async`: lấy `env.DB` qua `getCloudflareContext({ async: true })` rồi trả
  `createD1Store(env.DB)`. Không có binding → ném lỗi (không âm thầm rơi về bộ nhớ). Bỏ cảnh báo "in-memory store"
  vì nhánh đó không còn trong production.
- **`memory-store.ts`** — giữ, chỉ dùng trong unit test của `handleJoin`.
- **`actions.ts`** — `await getWaitlistStore()`.
- **`join.ts`** — chuẩn hoá email (trim + lowercase) trước khi lưu; khối `catch` **ghi log** `waitlist_store_failed`
  kèm tên lỗi, **không** ghi email (sửa điểm review "catch nuốt lỗi").

### 3.4 Bảng D1

`apps/web/migrations/0001_waitlist.sql`, áp dụng bằng `wrangler d1 migrations apply`:

```sql
CREATE TABLE waitlist (
  email      TEXT PRIMARY KEY,
  locale     TEXT NOT NULL CHECK (locale IN ('vi', 'en')),
  created_at TEXT NOT NULL
);
```

`add()` chạy `INSERT INTO waitlist (email, locale, created_at) VALUES (?, ?, ?) ON CONFLICT(email) DO NOTHING`;
`meta.changes === 1` → `'created'`, `0` → `'exists'`. `created_at` là ISO 8601 UTC, đồng thời là thời điểm người dùng
tick đồng ý (form không gửi được nếu chưa tick). Email gửi lại không cập nhật `locale` hay `created_at`.

### 3.5 Cấu hình trong repo

- `apps/web/wrangler.jsonc`: `name: "wordmet-web"`, `main: ".open-next/worker.js"`, `compatibility_flags:
  ["nodejs_compat", "global_fetch_strictly_public"]`, `assets` từ `.open-next/assets`, `d1_databases` binding `DB`
  (`database_name: "wordmet-waitlist"`, `migrations_dir: "migrations"`). Không dùng R2/ISR cache (trang tĩnh, không
  revalidate).
- `apps/web/open-next.config.ts`: cấu hình mặc định `defineCloudflareConfig()`.
- `next.config.ts`: gọi `initOpenNextCloudflareForDev()` để `pnpm dev` có binding D1 local (`.wrangler/state`).
- `package.json` (`apps/web`): thêm `@opennextjs/cloudflare` và `wrangler` (ghim chính xác, bản đã phát hành ít nhất một
  tuần); scripts `preview` (`opennextjs-cloudflare build && opennextjs-cloudflare preview`), `deploy`
  (`opennextjs-cloudflare build && opennextjs-cloudflare deploy`), `db:migrate:local`, `db:migrate:remote`,
  `cf-typegen` (sinh kiểu `CloudflareEnv`).
- `.node-version` ở gốc repo: `24.11.0`. `.gitignore`: `.open-next/`, `.wrangler/`.

## 4. Trang Chính sách bảo mật (DP4)

`/privacy` bỏ dòng "bản nháp", bỏ `noindex`, giữ trong sitemap.

**Bật lại link tới `/privacy`** (đang bị khoá vì chính sách còn là nháp): cụm "Chính sách bảo mật" trong câu đồng ý của
form (`features/waitlist/labels.tsx`, hiện là `<span role="link" aria-disabled="true">`) và link "Chính sách bảo mật" ở
footer (`SiteFooter.tsx`, cùng kiểu) trở lại thành `Link` thật. Bấm link trong nhãn ô tick **không** được đổi trạng thái
ô tick (theo HTML, kích hoạt phần tử tương tác bên trong `<label>` không kích hoạt nhãn); e2e kiểm cả hai: bấm link →
mở `/privacy` và ô tick không đổi. `/terms` vẫn là nháp nên link Terms ở footer giữ như hiện tại.

Nội dung VI/EN, ngắn, chỉ nói điều đang thật sự xảy ra:

- **Thu gì:** địa chỉ email, ngôn ngữ trang lúc đăng ký, thời điểm đăng ký.
- **Để làm gì:** chỉ để báo khi Wordmet mở cho người dùng. Không bán, không chia sẻ cho bên khác.
- **Lưu ở đâu:** cơ sở dữ liệu Cloudflare D1 thuộc tài khoản của Wordmet.
- **Xoá thế nào:** gửi thư tới `hello@wordmet.com`; xoá trong vòng 30 ngày.
- **Thay đổi:** khi Wordmet có tài khoản người dùng, chính sách này sẽ được viết lại và báo cho người đã đăng ký.
- Ngày hiệu lực.

Câu chữ chính xác (VI/EN) chủ dự án duyệt trong plan. `/terms` giữ bản nháp và `noindex`.

## 5. Deploy và cấu hình Cloudflare

| # | Đề xuất | Lý do |
|---|---|---|
| DP6 | Workers Builds: root directory `apps/web`; build command `pnpm opennextjs-cloudflare build`; deploy command `pnpm opennextjs-cloudflare deploy`; watch paths `apps/web/**`, `pnpm-lock.yaml`, `.node-version`; build variables `NODE_VERSION=24.11.0`, `PNPM_VERSION=11.6.0`, `NEXT_PUBLIC_SITE_URL=https://wordmet.com`, `NEXT_PUBLIC_INDEXABLE=true`, `NEXT_PUBLIC_CONTACT_EMAIL=hello@wordmet.com` | Sửa BE không kéo deploy web; phiên bản khớp máy và CI |
| DP7 | **Tắt build cho nhánh khác `main`** (non-production branch builds) | Bản preview dùng chung binding D1 → sẽ ghi email thử vào bảng thật |
| DP8 | Domain: Worker gắn **Custom Domain** `wordmet.com`; `www.wordmet.com` chuyển 301 về `wordmet.com` (Redirect Rule) | Một địa chỉ chuẩn, khớp canonical |
| DP9 | Rate limiting rule: path bắt đầu bằng `/vi` hoặc `/en`, **20 request / 10 giây / IP**, chặn 10 giây | Server Action POST vào chính đường dẫn trang; người xem bình thường không tới ngưỡng |
| DP10 | Email Routing: `hello@` và `ryan.ngo@` → Gmail cá nhân (đã xác minh) | Miễn phí, đủ để nhận thư xác minh khi nộp đơn |

Migration production chạy tay một lần trước deploy đầu (`pnpm db:migrate:remote`), và mỗi khi thêm file migration.
Workers Builds không tự chạy migration (giữ đơn giản; bảng hiếm khi đổi).

**Việc chỉ chủ dự án làm được:** mua `wordmet.com`; `wrangler login`; tạo D1 (`wrangler d1 create wordmet-waitlist`,
dán `database_id` vào `wrangler.jsonc`); kết nối repo GitHub với Workers Builds; bật Email Routing và xác minh Gmail;
tạo rate limiting rule và redirect `www`. Plan ghi từng bước bấm.

**Xem và xuất danh sách:** `wrangler d1 execute wordmet-waitlist --remote --command "SELECT * FROM waitlist ORDER BY
created_at"` (thêm `--json` để xuất), hoặc tab D1 trên dashboard.

**Khôi phục:** D1 Time Travel luôn bật, gói Free giữ 7 ngày lịch sử. Không làm backup riêng ở giai đoạn waitlist.

## 6. Sửa trước khi mở công khai

- Lỗi carousel "bấm › lần đầu không cuộn" (code review 08/10). Carousel đã được viết lại sau review; plan đo lại bằng
  e2e kiểm vị trí cuộn. Nếu còn lỗi thì sửa theo TDD; nếu hết thì giữ test làm bảo hiểm.
- Link đổi ngôn ngữ ở footer giữ trang hiện tại (điểm review). Các điểm review khác giữ nguyên trạng thái.

## 7. Edge cases (When → Then)

| # | When | Then |
|---|---|---|
| DE1 | Email có chữ hoa hoặc khoảng trắng hai đầu (`  An@X.com `) | Lưu `an@x.com`; gửi lại `an@x.com` → `exists`, vẫn báo thành công |
| DE2 | Bấm đúp hoặc hai tab gửi cùng email cùng lúc | `ON CONFLICT DO NOTHING` → đúng một dòng; cả hai thấy thành công |
| DE3 | D1 lỗi (mạng, quá 100.000 lần ghi/ngày, bảng chưa migrate) | Form hiện lỗi chung (`error`), giữ email đã nhập; log `waitlist_store_failed` + tên lỗi, không có email |
| DE4 | Worker thiếu binding `DB` (cấu hình sai) | `getWaitlistStore()` ném lỗi → như DE3; smoke test sau deploy (gửi một email thử rồi xoá) phát hiện |
| DE5 | Ô honeypot có giá trị | Báo thành công, không ghi D1 |
| DE6 | Một IP vượt 20 request/10 giây | Cloudflare trả 429 trong 10 giây. Server Action nhận phản hồi không phải của Next → React ném lỗi lên error boundary, trang hiện lỗi chung. Chấp nhận: chỉ xảy ra khi gửi dồn bất thường |
| DE7 | `pnpm dev` hoặc `pnpm preview` trên máy | Ghi vào D1 local trong `.wrangler/state`, không chạm bảng production |
| DE8 | Push lên nhánh khác `main` | Không build (DP7) nên không có bản preview ghi vào D1 thật |
| DE9 | Request `/` có `cf-ipcountry: VN` | 307 → `/vi`. `cf-ipcountry: XX` hoặc `T1` → bỏ qua, xét `Accept-Language` (LPE1). LPE3 của design landing chốt: trên Cloudflare chỉ có `cf-ipcountry` |
| DE10 | Người dùng xin xoá email | Chủ dự án chạy `DELETE FROM waitlist WHERE email = ?` bằng `wrangler d1 execute --remote` trong 30 ngày |
| DE11 | Build trên Workers Builds lỗi | Bản đang chạy giữ nguyên (deploy chỉ xảy ra khi build xong); xem log build trên dashboard |
| DE12 | `NEXT_PUBLIC_*` đổi trên dashboard | Chỉ có hiệu lực ở lần build sau (biến được nhúng lúc build) |

## 8. Kiểm thử

- **Unit (Vitest):** `d1-store` chạy với **D1 thật trên máy** qua `getPlatformProxy()` của wrangler (SQLite của
  Miniflare, áp migration trước mỗi file test), không mock: `created`, `exists`, chuẩn hoá, ràng buộc `locale`.
  `handleJoin`: chuẩn hoá email, log khi store ném lỗi và log không chứa email.
- **E2E (Playwright):** webServer đổi từ `next start` sang `pnpm preview` (runtime Worker thật, D1 local). Toàn bộ e2e
  hiện có phải xanh trên runtime này, đặc biệt `LP4–LP7` (middleware). Thêm: gửi form → đọc D1 local
  (`wrangler d1 execute --local`) thấy đúng một dòng; gửi lại cùng email → vẫn một dòng; carousel bấm › → card mới nằm giữa
  dải.
- **CI (`ci.yml` job `web`):** thêm bước áp migration local trước e2e. Bước `pnpm build` hiện có đổi thành build OpenNext
  (dùng lại cho e2e, bớt một lần build).
- **Sau deploy (tay, theo checklist trong plan):** mở `https://wordmet.com` → chuyển đúng ngôn ngữ; gửi email thử → thấy
  dòng trong D1 remote → xoá; gửi thư tới `hello@wordmet.com` → về Gmail; `robots.txt` cho phép index; ảnh OG mở được.

## 9. Rủi ro còn lại

- `next-intl` middleware và `next/og` chưa chạy thử trên Worker trong repo này: task đầu kiểm.
- Windows: `wrangler`/Miniflare chạy `workerd` native; lỗi quyền kiểu `@swc/core` (README) có thể lặp lại. Chưa kiểm.
- Workers Builds với pnpm workspace chưa có tài liệu xác nhận; lần build đầu có thể phải chỉnh. Lối lùi: deploy tay
  `pnpm deploy` từ máy chủ dự án cho lần đầu.
- Gói Free giới hạn 10 ms CPU mỗi request. Trang tĩnh phục vụ từ assets; middleware và Server Action ngắn. Chưa đo.
- DE6: người dùng thật bị chặn nếu ngưỡng quá thấp (ví dụ nhiều người chung một IP công cộng). Theo dõi sau ra mắt.
