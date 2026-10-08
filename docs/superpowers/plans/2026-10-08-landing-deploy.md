# Deploy landing Wordmet lên Cloudflare + waitlist D1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Landing `apps/web` chạy trên Cloudflare Workers ở `wordmet.com`, email waitlist lưu bền trong D1, có chính sách bảo mật thật.

**Architecture:** Next.js 16 build qua `@opennextjs/cloudflare` thành một Worker (`wordmet-web`); trang tĩnh phục vụ từ assets,
Server Action `joinWaitlist` ghi vào D1 qua binding `DB`. `WaitlistStore` có thêm bản D1; bản bộ nhớ chỉ còn cho unit test.
E2E chạy trên runtime Worker thật (`wrangler dev`) với D1 local. Deploy bằng Workers Builds khi merge vào `main`.

**Tech Stack:** Next 16.4.0, next-intl 4.14.9, `@opennextjs/cloudflare` 1.20.7, `wrangler` 4.145.0, Cloudflare D1, Vitest 4.1.11,
Playwright 1.63.0, pnpm 11.6.0, Node 24.11.0.

**Spec:** `docs/superpowers/specs/2026-10-08-landing-deploy-design.md` (quyết định:
`docs/superpowers/decisions/2026-10-08-landing-deploy-decisions.md`). Nền: `docs/superpowers/specs/2026-10-08-landing-page-design.md`.

## Global Constraints

- Phụ thuộc mới ghim **chính xác** (không `^`): `@opennextjs/cloudflare` `1.20.7` (phát hành 29/09/2026), `wrangler` `4.145.0`
  (30/09/2026). Cả hai thoả peer: OpenNext cần `next >=16.3.8`, `wrangler ^4.125.0`. Nếu pnpm từ chối vì chính sách tuổi phiên
  bản, lùi về bản cũ hơn liền kề và ghi Ruling.
- Giữ `src/proxy.ts`; chỉ đổi thành `src/middleware.ts` khi LP4–LP7 đỏ trên Worker (DP11).
- Worker name `wordmet-web`; D1 `database_name` `wordmet-waitlist`; binding `DB`; thư mục migration `apps/web/migrations`.
- Bảng `waitlist(email TEXT PRIMARY KEY, locale TEXT NOT NULL CHECK (locale IN ('vi','en')), created_at TEXT NOT NULL)`.
- Log lỗi store: tên sự kiện `waitlist_store_failed`, kèm `error.name`; **không bao giờ** có email.
- Chữ hiển thị chỉ nằm trong `messages/vi.json` và `messages/en.json`; Tailwind không dùng giá trị raw (`pnpm lint` kiểm).
- Server component mặc định; client component chỉ khi cần hook.
- Trên máy Windows này, mọi lệnh build/dev cần `SWC_NATIVE_BINDING_CACHE='C:\Users\Tien Ngo\.cache\swc-native'` (README).
- Email: `hello@wordmet.com` (liên hệ chung, `NEXT_PUBLIC_CONTACT_EMAIL`), `ryan.ngo@wordmet.com` (cá nhân).
- Commit cục bộ trên `feat/landing-page` được phép; **không push** khi chủ dự án chưa yêu cầu.

## Review Focus

1. Worker chạy mà thiếu binding `DB` → form báo lỗi chung, log có tên sự kiện, không sập trang (Task 3, `storeFromEnv`).
2. Log khi store lỗi không chứa email người dùng (Task 3, test spy `console.error`).
3. Bấm link "Chính sách bảo mật" trong nhãn ô tick → mở `/privacy`, ô tick không đổi trạng thái (Task 4, e2e).
4. Hai request cùng email chạy song song → đúng một dòng (Task 2, `Promise.all`).
5. Sau khi chuyển sang build OpenNext, `/vi` và `/en` vẫn prerender, ảnh OG vẫn trả PNG 1200×630 trên Worker (Task 1:
   `assert:static` + `seo.spec.ts` chạy trên `wrangler dev`).

Ngoài tầm test tự động (kiểm tay ở Task 7): luật rate limiting trả 429 (DE6), chuyển hướng `www`, Email Routing.

## Sửa 08/10/2026: chạy kiểm tra Worker trong Docker trên Windows

Lần chạy Task 1 Step 4 đầu tiên: `opennextjs-cloudflare build` không chạy được trên Windows thuần (lần 1 `EPERM symlink`;
sau khi bật Developer Mode, lần 2 `Cannot read directory … Access is denied` khi esbuild đọc qua symlink). Chủ dự án chốt:

- **Bây giờ (A):** trên máy Windows, mọi bước cần runtime Worker (`cf:build`, e2e, `assert:static`) chạy bằng
  `pnpm cf:docker [tham số playwright]` (`apps/web/scripts/cf-docker.mjs`): container `node:24.11.0-bookworm` chép repo (bỏ
  `node_modules`, output build), cài phụ thuộc Linux, cài Chromium, chạy `CI=1 pnpm test:e2e` rồi `pnpm assert:static`; báo
  cáo Playwright chép ra `apps/web/.docker-out/`. Mọi lệnh "Run: `pnpm test:e2e …`" trong các task dưới hiểu là chạy qua
  `pnpm cf:docker …` trên máy này. `pnpm dev`, `pnpm test`, `pnpm lint`, `pnpm typecheck` vẫn chạy trên Windows. CI
  (Linux) và Workers Builds không đổi.
- **Next `16.3.8` (chốt 08/10):** trên Worker, Next `16.4.0` trả 500 mọi trang (`Unexpected loadManifest(
  /.next/server/preview-props.json) call!`) vì `@opennextjs/cloudflare` 1.20.7–1.20.9 chưa hỗ trợ file manifest mới của
  16.4. Đã thử vá OpenNext bằng `pnpm patch` rồi bỏ; chủ dự án chốt giữ `next` và `eslint-config-next` ở `16.3.8` (mức
  tối thiểu OpenNext ghi rõ). Nâng lại 16.4 khi changelog OpenNext ghi hỗ trợ.
- ESLint bỏ qua `.open-next/**`, `.wrangler/**`, `.docker-out/**`, `cloudflare-env.d.ts` (output sinh ra, không phải code).
- **Sau (B):** cài Ubuntu trong WSL làm môi trường làm việc lâu dài cho phần Worker — xem "Việc sau" ở cuối plan.

## Trước khi bắt đầu

Công việc landing trước đó còn **chưa commit** trên `feat/landing-page`. Commit nó trước (theo đề xuất 4 commit đã nêu và được chủ
dự án duyệt) để diff của plan này tách riêng. Không làm Task 1 khi cây làm việc còn thay đổi của landing.

---

### Task 1: Chạy landing trên runtime Worker (OpenNext + wrangler)

**Files:**
- Modify: `apps/web/package.json`, `pnpm-workspace.yaml` (`allowBuilds`), `apps/web/next.config.ts`,
  `apps/web/playwright.config.ts`, `apps/web/.gitignore`
- Create: `apps/web/wrangler.jsonc`, `apps/web/open-next.config.ts`, `apps/web/cloudflare-env.d.ts` (sinh bằng `cf-typegen`),
  `.node-version` (gốc repo, nội dung `24.11.0`)

**Interfaces:**
- Produces: scripts `cf:build` (`opennextjs-cloudflare build`), `cf:dev` (`wrangler dev --port 3100`), `deploy`
  (`opennextjs-cloudflare build && opennextjs-cloudflare deploy`), `cf-typegen` (`wrangler types --env-interface CloudflareEnv
  ./cloudflare-env.d.ts`); kiểu toàn cục `CloudflareEnv` có `DB: D1Database`.

- [ ] **Step 1: Cài phụ thuộc**

`pnpm --filter web add -E @opennextjs/cloudflare@1.20.7` và `pnpm --filter web add -D -E wrangler@4.145.0`. Nếu pnpm báo
`ERR_PNPM_IGNORED_BUILDS`, thêm đúng các gói nó liệt kê vào `allowBuilds` của `pnpm-workspace.yaml` (`true` cho gói native cần
chạy như `workerd`; `false` cho gói tuỳ chọn), mỗi dòng có comment lý do như các dòng hiện có.

- [ ] **Step 2: Viết cấu hình**

`wrangler.jsonc`: `name: "wordmet-web"`, `main: ".open-next/worker.js"`, `compatibility_date: "2026-09-30"`,
`compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"]`, `assets: { directory: ".open-next/assets", binding:
"ASSETS" }`, `services: [{ binding: "WORKER_SELF_REFERENCE", service: "wordmet-web" }]`, `d1_databases: [{ binding: "DB",
database_name: "wordmet-waitlist", database_id: "00000000-0000-0000-0000-000000000000", migrations_dir: "migrations" }]`
(id giả cho local; Task 7 thay id thật). Không khai báo R2 hay `images`.
`open-next.config.ts`: `export default defineCloudflareConfig();`.
`next.config.ts`: gọi `initOpenNextCloudflareForDev()` (import từ `@opennextjs/cloudflare`) trước `export default`.
`.gitignore`: thêm `.open-next/`, `.wrangler/`. Chạy `pnpm cf-typegen`.

- [ ] **Step 3: Đổi webServer của Playwright sang Worker**

`command: 'pnpm cf:build && pnpm db:migrate:local && pnpm cf:dev'` — `db:migrate:local` có ở Task 2; trong task này tạm dùng
`'pnpm cf:build && pnpm cf:dev'` và Task 2 bổ sung. `env` giữ `NEXT_PUBLIC_SITE_URL: baseURL`.

- [ ] **Step 4: Chạy toàn bộ kiểm tra trên runtime Worker**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e && pnpm assert:static`
Expected: tất cả xanh (53 unit, 70 e2e như trước). Hai chỗ có thể đỏ, và cách xử lý đã chốt:
- `locale.spec.ts` LP4–LP7 đỏ (`/` không chuyển hướng) → đổi `src/proxy.ts` thành `src/middleware.ts`, hàm `middleware`, giữ
  `config.matcher`; ghi Ruling và thêm một dòng sửa có ngày vào §3.1 của spec.
- `seo.spec.ts` "opengraph-image returns image/png" đỏ → trong `opengraph-image.tsx` thay `readFile` bằng nạp font qua
  `fetch(new URL('../../../assets/fonts/…ttf', import.meta.url))`; ghi Ruling.
Lỗi khác: dùng superpowers:systematic-debugging, không sửa triệu chứng.

- [ ] **Step 5: Commit**

```bash
git add .node-version pnpm-workspace.yaml pnpm-lock.yaml apps/web
git commit -m "build(web): run the landing on cloudflare workers via opennext"
```

### Task 2: Bảng D1 và `createD1Store`

**Files:**
- Create: `apps/web/migrations/0001_waitlist.sql`, `apps/web/src/features/waitlist/d1-store.ts`,
  `apps/web/src/features/waitlist/d1-store.test.ts`, `apps/web/src/test/d1.ts` (helper test)
- Modify: `apps/web/package.json` (scripts), `apps/web/playwright.config.ts` (thêm `db:migrate:local` vào webServer)

**Interfaces:**
- Consumes: `WaitlistStore` (`store.ts`): `add(email: string, locale: AppLocale): Promise<'created' | 'exists'>`.
- Produces: `createD1Store(db: D1Database, now?: () => Date): WaitlistStore`; scripts `db:migrate:local`
  (`wrangler d1 migrations apply wordmet-waitlist --local`), `db:migrate:remote` (`… --remote`); helper test
  `openTestD1(): Promise<{ db: D1Database; dispose(): Promise<void> }>`.

- [ ] **Step 1: Viết migration** với đúng câu `CREATE TABLE` trong Global Constraints.

- [ ] **Step 2: Viết helper `openTestD1()`** trong `src/test/d1.ts`: `getPlatformProxy<CloudflareEnv>({ persist: false })` từ
`wrangler`, đọc mọi file `migrations/*.sql` theo thứ tự tên, tách theo `;`, bỏ đoạn rỗng, chạy từng câu bằng
`db.prepare(sql).run()`; trả `{ db: env.DB, dispose }`.

- [ ] **Step 3: Viết test thất bại** `d1-store.test.ts` (một `openTestD1()` cho cả file trong `beforeAll`, `DELETE FROM waitlist`
trong `beforeEach`, `dispose` trong `afterAll`; timeout `beforeAll` 60 s):

```ts
it('first add → created, row has email, locale and ISO created_at', async () => {
  const store = createD1Store(db, () => new Date('2026-10-08T03:04:05.000Z'));
  expect(await store.add('ten@gmail.com', 'vi')).toBe('created');
  expect(await db.prepare('SELECT * FROM waitlist').all()).toMatchObject({
    results: [{ email: 'ten@gmail.com', locale: 'vi', created_at: '2026-10-08T03:04:05.000Z' }],
  });
});
it('same email again → exists, row unchanged (locale and created_at kept)', …); // add 'vi' rồi 'en' → 'exists', locale vẫn 'vi'
it('DE2 two concurrent adds of one email → one created, one exists, one row', async () => {
  const store = createD1Store(db);
  const results = await Promise.all([store.add('a@b.co', 'en'), store.add('a@b.co', 'en')]);
  expect(results.sort()).toEqual(['created', 'exists']);
  expect((await db.prepare('SELECT COUNT(*) AS n FROM waitlist').first())?.n).toBe(1);
});
it('locale outside vi/en is rejected by the table', async () => {
  await expect(db.prepare("INSERT INTO waitlist VALUES ('x@y.co', 'fr', '2026-10-08')").run()).rejects.toThrow();
});
```

- [ ] **Step 4: Chạy** `pnpm vitest run src/features/waitlist/d1-store.test.ts` — Expected: FAIL, `createD1Store` chưa tồn tại.

- [ ] **Step 5: Viết `createD1Store`**: `INSERT INTO waitlist (email, locale, created_at) VALUES (?1, ?2, ?3) ON CONFLICT(email) DO
NOTHING`, `created_at = now().toISOString()`, `result.meta.changes === 1 ? 'created' : 'exists'`. Email nhận vào đã được
`emailSchema` chuẩn hoá; store không chuẩn hoá lại.

- [ ] **Step 6: Chạy lại** test trên — Expected: 4 PASS. Rồi `pnpm test` — Expected: toàn bộ xanh.

- [ ] **Step 7: Thêm scripts migrate**, cập nhật webServer thành `pnpm cf:build && pnpm db:migrate:local && pnpm cf:dev`.

- [ ] **Step 8: Commit**

```bash
git add apps/web/migrations apps/web/src/features/waitlist/d1-store.ts apps/web/src/features/waitlist/d1-store.test.ts apps/web/src/test/d1.ts apps/web/package.json apps/web/playwright.config.ts
git commit -m "feat(web): add d1 waitlist store"
```

### Task 3: Form ghi vào D1; log lỗi không có email

**Files:**
- Modify: `apps/web/src/features/waitlist/store.ts`, `actions.ts`, `join.ts`, `join.test.ts`
- Create: `apps/web/src/features/waitlist/store.test.ts`, `apps/web/e2e/waitlist.spec.ts`, `apps/web/e2e/d1.ts`

**Interfaces:**
- Consumes: `createD1Store` (Task 2).
- Produces: `storeFromEnv(env: Partial<CloudflareEnv>): WaitlistStore` (ném `Error('waitlist: missing DB binding')` khi thiếu
  `DB`); `getWaitlistStore(): Promise<WaitlistStore>` = `storeFromEnv((await getCloudflareContext({ async: true })).env)`;
  e2e helper `queryLocalD1(sql: string): Array<Record<string, unknown>>` (chạy `pnpm exec wrangler d1 execute wordmet-waitlist
  --local --json --command <sql>` bằng `execFileSync`, trả `results` của phần tử đầu).

- [ ] **Step 1: Test thất bại**

`store.test.ts`:
```ts
it('Review Focus 1: no DB binding → throws a named error', () => {
  expect(() => storeFromEnv({})).toThrow('waitlist: missing DB binding');
});
```
`join.test.ts` thêm:
```ts
it('Review Focus 2: store failure is logged without the email', async () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const failing: WaitlistStore = { add: async () => Promise.reject(new TypeError('D1_ERROR')) };
  await handleJoin(failing, idle, form({ email: 'secret@gmail.com', consent: 'on' }));
  expect(spy).toHaveBeenCalledWith('waitlist_store_failed', { error: 'TypeError' });
  expect(JSON.stringify(spy.mock.calls)).not.toContain('secret@gmail.com');
  spy.mockRestore();
});
```
`e2e/waitlist.spec.ts`:
```ts
test('DE1/DE2 sign-up writes one normalized row; signing up again keeps one row', async ({ page }) => {
  const email = `e2e-${Date.now()}-${test.info().project.name}@example.com`;
  for (const typed of [`  ${email.toUpperCase()} `, email]) {
    await page.goto('/en');
    const form = page.locator('#waitlist-hero');
    await form.getByRole('textbox', { name: 'Email address' }).fill(typed);
    await form.getByRole('checkbox').check();
    await form.getByRole('button', { name: 'Get notified at launch' }).click();
    await expect(page.getByRole('status')).toContainText("You're on the list!");
  }
  expect(queryLocalD1(`SELECT email, locale FROM waitlist WHERE email = '${email}'`)).toEqual([{ email, locale: 'en' }]);
});
```

- [ ] **Step 2: Chạy** `pnpm vitest run src/features/waitlist` và `pnpm playwright test e2e/waitlist.spec.ts --project=desktop`
Expected: FAIL (`storeFromEnv` không tồn tại; không có log; D1 không có dòng vì form còn ghi vào bộ nhớ).

- [ ] **Step 3: Sửa code**
- `store.ts`: thêm `storeFromEnv`, đổi `getWaitlistStore` thành async như Interfaces; bỏ biến `store` dùng chung, bỏ nhánh
  memory và cảnh báo `console.warn`.
- `actions.ts`: `handleJoin(await getWaitlistStore(), prev, form)` — đặt trong `try`; nếu `getWaitlistStore()` ném thì log như
  dưới và trả `{ status: 'error', email: String(form.get('email') ?? '') }`.
- `join.ts`: trong `catch (error)`: `console.error('waitlist_store_failed', { error: error instanceof Error ? error.name :
  'unknown' })`.

- [ ] **Step 4: Chạy lại** hai lệnh ở Step 2 — Expected: PASS. Rồi `pnpm typecheck && pnpm test && pnpm test:e2e` — Expected:
tất cả xanh (`page.spec.ts` LP14–LP16 giờ ghi vào D1 local).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/waitlist apps/web/e2e/waitlist.spec.ts apps/web/e2e/d1.ts
git commit -m "feat(web): store waitlist sign-ups in d1"
```

### Task 4: Chính sách bảo mật thật; bật lại link

**Files:**
- Create: `apps/web/src/components/sections/PrivacyPolicy.tsx`, `apps/web/e2e/privacy.spec.ts`
- Modify: `apps/web/src/app/[locale]/privacy/page.tsx`, `apps/web/messages/vi.json`, `apps/web/messages/en.json`,
  `apps/web/src/features/waitlist/labels.tsx`, `apps/web/src/components/layout/SiteFooter.tsx`, `apps/web/src/app/sitemap.ts`,
  `apps/web/e2e/seo.spec.ts`

**Interfaces:**
- Produces: `PrivacyPolicy()` (server component, không props) đọc namespace `Legal.privacy`.

- [ ] **Step 1: Test thất bại** `e2e/privacy.spec.ts`:
```ts
test('Review Focus 3: policy link in the consent label opens /privacy and leaves the box unticked', async ({ page }) => {
  await page.goto('/en');
  const form = page.locator('#waitlist-hero');
  await form.getByRole('link', { name: 'Privacy Policy' }).click();
  await expect(page).toHaveURL(/\/en\/privacy$/);
  await page.goBack();
  await expect(page.locator('#waitlist-hero').getByRole('checkbox')).not.toBeChecked();
});
test('footer Privacy Policy is a real link', async ({ page }) => {
  await page.goto('/vi');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Chính sách bảo mật' }).click();
  await expect(page).toHaveURL(/\/vi\/privacy$/);
});
test('privacy page follows the site robots setting, is not a draft, and names the contact address', async ({ page }) => {
  // e2e builds without NEXT_PUBLIC_INDEXABLE, so the whole site is noindex (LP11); the page must not add its own override.
  const robotsOf = async (path: string) => {
    await page.goto(path);
    return page.locator('meta[name="robots"]').getAttribute('content');
  };
  for (const locale of ['vi', 'en']) {
    expect(await robotsOf(`/${locale}/privacy`)).toBe(await robotsOf(`/${locale}`));
    await page.goto(`/${locale}/privacy`);
    await expect(page.getByRole('main')).toContainText('hello@wordmet.com');
    await expect(page.getByRole('main')).not.toContainText(locale === 'vi' ? 'bản nháp' : 'draft');
  }
});
```
`seo.spec.ts` sitemap test thêm: `expect(xml).toMatch(/<loc>[^<]+\/vi\/privacy<\/loc>/)`.

- [ ] **Step 2: Chạy** `pnpm playwright test e2e/privacy.spec.ts e2e/seo.spec.ts --project=desktop` — Expected: FAIL (link là
`span role=link`, trang là bản nháp, sitemap thiếu privacy).

- [ ] **Step 3: Sửa code**
- `labels.tsx`: phần `link` trở lại `<Link href="/privacy" className="font-semibold underline underline-offset-2">` (import
  `Link` từ `@/i18n/navigation`); sửa comment đầu file.
- `SiteFooter.tsx`: mục privacy thành `<Link href="/privacy" className={link}>`; bỏ hằng `item` nếu không còn dùng.
- `privacy/page.tsx`: render `<PrivacyPolicy />`; `generateMetadata` bỏ `robots`, giữ `title` và `canonical`, thêm
  `description: t('privacy.intro')`.
- `sitemap.ts`: thêm `/vi/privacy` và `/en/privacy` (`changeFrequency: 'yearly'`, `priority: 0.3`, alternates vi/en).
  (Spec §4 ghi "giữ trong sitemap" nhưng sitemap hiện chỉ có `/vi`, `/en` — Ruling: thêm vào.)
- `PrivacyPolicy.tsx`: `Container` + `h1` (`privacyTitle`) + dòng ngày hiệu lực + 5 mục `h2`/`p` theo chữ dưới đây; email lấy
  từ `site.contactEmail` truyền vào placeholder `{email}` và hiển thị thành link `mailto:`. Kiểu chữ dùng lại token như
  `LegalDraft` (`text-h2` cho h1, `text-h3`/`text-body` cho mục).
- Messages `Legal.privacy` (chủ dự án duyệt chữ khi duyệt plan):

| key | vi | en |
|---|---|---|
| `effective` | Có hiệu lực từ ngày {date}. | Effective {date}. |
| `intro` | Trang này nói rõ Wordmet làm gì với email bạn để lại khi đăng ký nhận thông báo. | This page explains what Wordmet does with the email address you leave when you sign up for launch updates. |
| `collectTitle` | Wordmet lưu gì | What Wordmet stores |
| `collectBody` | Địa chỉ email của bạn, ngôn ngữ của trang lúc bạn đăng ký (tiếng Việt hoặc tiếng Anh) và thời điểm đăng ký. Trang chỉ dùng một cookie để nhớ ngôn ngữ bạn chọn; không có cookie quảng cáo hay công cụ theo dõi. | Your email address, the language of the page when you signed up (Vietnamese or English) and the time you signed up. The site uses one cookie to remember your language choice; there are no advertising cookies or trackers. |
| `useTitle` | Dùng để làm gì | How it is used |
| `useBody` | Chỉ để gửi thư báo khi Wordmet mở cho người dùng. Wordmet không bán và không chia sẻ email của bạn với bên nào khác. | Only to email you when Wordmet opens to users. Wordmet does not sell or share your email address with anyone. |
| `storeTitle` | Lưu ở đâu | Where it is stored |
| `storeBody` | Trong cơ sở dữ liệu Cloudflare D1 thuộc tài khoản của Wordmet. Cloudflare cung cấp hạ tầng và chỉ xử lý dữ liệu thay mặt Wordmet. | In a Cloudflare D1 database in Wordmet's account. Cloudflare provides the infrastructure and processes the data only on Wordmet's behalf. |
| `deleteTitle` | Xoá email của bạn | Removing your email |
| `deleteBody` | Gửi thư tới {email} từ địa chỉ đã đăng ký. Wordmet xoá email khỏi danh sách trong vòng 30 ngày và báo lại cho bạn. | Write to {email} from the address you signed up with. Wordmet removes it from the list within 30 days and lets you know. |
| `changesTitle` | Khi chính sách thay đổi | Changes to this policy |
| `changesBody` | Khi Wordmet có tài khoản người dùng, chính sách này sẽ được viết lại, và Wordmet sẽ báo cho những người đã đăng ký trước khi áp dụng. | When Wordmet adds user accounts, this policy will be rewritten, and Wordmet will tell everyone on the list before it applies. |

`{date}` = `08/10/2026` (vi) / `8 October 2026` (en); nếu deploy đầu rơi vào ngày khác, đổi thành ngày deploy và ghi Ruling.
Bỏ key `draftNotice` khỏi namespace chỉ khi không còn dùng — `/terms` vẫn dùng nên giữ.

- [ ] **Step 4: Chạy lại** lệnh Step 2 — Expected: PASS. Rồi `pnpm lint && pnpm typecheck && pnpm test:e2e` — Expected: tất cả
xanh, gồm `a11y.spec.ts` (axe trên trang có link mới).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src apps/web/messages apps/web/e2e
git commit -m "feat(web): publish the waitlist privacy policy and link to it"
```

### Task 5: Footer giữ trang khi đổi ngôn ngữ; carousel cuộn đúng

**Files:**
- Create: `apps/web/src/components/layout/FooterLanguageLink.tsx` (client)
- Modify: `apps/web/src/components/layout/SiteFooter.tsx`, `apps/web/e2e/page.spec.ts`, `apps/web/e2e/chrome.spec.ts`;
  `apps/web/src/components/interactive/cloze/ClozeCarousel.tsx` chỉ khi test carousel đỏ

**Interfaces:**
- Produces: `FooterLanguageLink({ locale, label, className }: { locale: AppLocale; label: string; className: string })` —
  `Link` từ `@/i18n/navigation` với `href={usePathname()}`, `locale`, `lang`, `hrefLang`.

- [ ] **Step 1: Test thất bại**

`chrome.spec.ts`:
```ts
test('footer language link keeps the current page', async ({ page }) => {
  await page.goto('/vi/privacy');
  await page.getByRole('contentinfo').getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/en\/privacy$/);
});
```
`page.spec.ts` trong `describe('cloze carousel')`:
```ts
test('Review#1 each › click centres the newly active card', async ({ page }) => {
  await page.goto('/en');
  for (const expected of [1, 2]) {
    await page.getByRole('button', { name: 'Next sentence' }).click();
    await expect.poll(() => page.evaluate((i) => {
      const track = document.querySelector('.carousel-track') as HTMLElement;
      const slide = track.children[i] as HTMLElement;
      const t = track.getBoundingClientRect(), s = slide.getBoundingClientRect();
      return (Math.min(s.right, t.right) - Math.max(s.left, t.left)) / s.width;
    }, expected)).toBeGreaterThan(0.95);
  }
});
```

- [ ] **Step 2: Chạy** `pnpm playwright test e2e/chrome.spec.ts e2e/page.spec.ts` — Expected: test footer FAIL (về `/en`).
Test carousel: carousel đã được viết lại sau review 08/10, có thể đã PASS. Nếu PASS, ghi vào ledger "Review#1 không còn tái
hiện" và giữ test làm bảo hiểm; nếu FAIL, dùng superpowers:systematic-debugging để tìm vì sao lần cuộn bị bỏ qua.

- [ ] **Step 3: Sửa code**: `SiteFooter` dùng `<FooterLanguageLink locale={other} label={t('switchLanguage')} className={link} />`
thay cho thẻ `<a>`. Carousel: chỉ sửa nguyên nhân Step 2 tìm được.

- [ ] **Step 4: Chạy lại** Step 2 — Expected: PASS cả hai project. Rồi `pnpm lint && pnpm test:e2e` — Expected: xanh.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src apps/web/e2e
git commit -m "fix(web): keep the page when switching language from the footer"
```
(Nếu có sửa carousel, commit riêng: `fix(web): centre the active cloze card after each step`.)

### Task 6: CI và tài liệu

**Files:**
- Modify: `.github/workflows/ci.yml` (job `web`), `apps/web/README.md`, `CLAUDE.md` (gốc repo: một mục ngắn "Landing — as-built")

- [ ] **Step 1: Sửa job `web`**: bỏ bước `Build` riêng (webServer của Playwright build một lần bằng `cf:build`); đặt bước
`Static pages` (`pnpm assert:static`) **sau** bước E2E. Giữ `Install Playwright Chromium` trước E2E.

- [ ] **Step 2: Kiểm cục bộ đúng thứ tự CI**: `pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test &&
CI=1 pnpm test:e2e && pnpm assert:static` trong `apps/web` — Expected: tất cả xanh.

- [ ] **Step 3: README** `apps/web`: thay mục "Not production-ready yet" bằng mục "Deploy (Cloudflare)" gồm: các script mới,
D1 local nằm ở `.wrangler/state`, cách xem danh sách (`pnpm exec wrangler d1 execute wordmet-waitlist --remote --command
"SELECT * FROM waitlist ORDER BY created_at"`), cách xoá một email (DE10), `db:migrate:remote` trước deploy khi có migration mới,
D1 Time Travel 7 ngày. Bảng Environment thêm cột "Production" với giá trị DP6.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml apps/web/README.md CLAUDE.md
git commit -m "ci(web): build once with opennext; document the cloudflare deploy"
```

### Task 7: Cấu hình Cloudflare và deploy đầu (chủ dự án làm, trợ lý hướng dẫn và kiểm)

Không có code mới trừ `database_id`. Mỗi bước ghi kết quả vào ledger. Trợ lý không đăng nhập, không mua, không thanh toán thay.

- [ ] **Step 1 (chủ dự án):** mua `wordmet.com` ở Cloudflare Registrar; `pnpm exec wrangler login` trong `apps/web`.
- [ ] **Step 2:** `pnpm exec wrangler d1 create wordmet-waitlist` → dán `database_id` vào `wrangler.jsonc`; `pnpm db:migrate:remote`.
Commit: `chore(web): point wrangler at the production d1 database`.
- [ ] **Step 3 (chủ dự án, cần duyệt push):** push nhánh, mở PR, chờ CI xanh, merge vào `main` theo luật repo.
- [ ] **Step 4 (chủ dự án, dashboard):** Workers & Pages → Create → Import repository → chọn repo; root directory `apps/web`;
build command `pnpm opennextjs-cloudflare build`; deploy command `pnpm opennextjs-cloudflare deploy`; production branch `main`;
**tắt** non-production branch builds (DP7); watch paths `apps/web/**`, `pnpm-lock.yaml`, `.node-version`; build variables
`NODE_VERSION=24.11.0`, `PNPM_VERSION=11.6.0`, `NEXT_PUBLIC_SITE_URL=https://wordmet.com`, `NEXT_PUBLIC_INDEXABLE=true`,
`NEXT_PUBLIC_CONTACT_EMAIL=hello@wordmet.com`. Nếu build lỗi vì pnpm workspace: chạy `pnpm deploy` từ máy (với các biến trên)
cho lần đầu và ghi Ruling.
- [ ] **Step 5 (dashboard):** Worker `wordmet-web` → Settings → Domains → thêm Custom Domain `wordmet.com`; Rules → Redirect Rules
→ `www.wordmet.com/*` 301 về `https://wordmet.com/$1` (cần bản ghi DNS proxied cho `www`).
- [ ] **Step 6 (dashboard):** Security → WAF → Rate limiting rules: path bắt đầu bằng `/vi` hoặc `/en`; 20 request / 10 giây / IP;
action Block 10 giây.
- [ ] **Step 7 (dashboard):** Email → Email Routing → bật; thêm và xác minh Gmail cá nhân làm destination; rule `hello@` và
`ryan.ngo@` → Gmail.
- [ ] **Step 8 (trợ lý kiểm, có output):**
  - `curl -sI https://wordmet.com/` → 307 tới `/vi` hoặc `/en`; `curl -sI https://www.wordmet.com/` → 301 tới `https://wordmet.com/`.
  - `curl -s https://wordmet.com/robots.txt` → `Allow: /` và `Sitemap: https://wordmet.com/sitemap.xml`; `/vi` không có `noindex`.
  - Ảnh OG của `/vi` trả `image/png`.
  - Gửi form bằng `smoke-<ngày>@example.com` → `wrangler d1 execute wordmet-waitlist --remote --command "SELECT …"` thấy đúng
    một dòng → `DELETE` dòng đó.
  - Chủ dự án gửi thư tới `hello@wordmet.com` và `ryan.ngo@wordmet.com` → về Gmail.
  - Gửi 25 request nhanh tới `/vi` → thấy 429 (DE6), rồi hết sau 10 giây.

## Self-review

- Spec coverage: §3.1 → T1; §3.2 → T1 Step 4; §3.3–3.4 → T2–T3; §3.5 → T1–T2; §4 → T4; §5 → T7 (+ T6 README); §6 → T5;
  §7 DE1–DE5 → T2–T3, DE6/DE8/DE11 → T7, DE7 → T2 webServer local, DE9 → `locale.spec.ts` trên Worker (T1), DE10/DE12 → README
  T6; §8 → T1–T6; §9 rủi ro → T1 Step 4 và T7 Step 4 lối lùi.
- Kiểu xuyên task: `createD1Store`, `storeFromEnv`, `getWaitlistStore` (async), `openTestD1`, `queryLocalD1`, `CloudflareEnv.DB`
  dùng nhất quán.

## Việc sau (không thuộc lần triển khai này)

### B. Môi trường WSL Ubuntu cho phần Worker (chốt 08/10/2026, làm sau)

Mục tiêu: chạy `cf:build`, `cf:dev`, e2e và `wrangler` trực tiếp trong Linux, không phải dựng container mỗi lần.

1. Chủ dự án cài Ubuntu (`wsl --install -d Ubuntu`, cần quyền admin, có thể phải khởi động lại).
2. Trong Ubuntu: cài Node `24.11.0` (theo `.node-version`) và pnpm `11.6.0` (corepack).
3. Clone repo vào ổ của Linux (`~/code/english-learning`), không làm việc trên `/mnt/e/…` vì đọc file qua ổ Windows chậm.
4. `pnpm install`, `pnpm exec playwright install --with-deps chromium`, chạy `pnpm test:e2e` trong `apps/web`: kết quả phải
   giống `pnpm cf:docker`.
5. `wrangler login` trong Ubuntu nếu dùng lệnh `--remote` từ đây.
6. Ghi vào README `apps/web` và `CLAUDE.md`; giữ `cf:docker` cho máy không có WSL.

Rủi ro cần xem khi làm: hai bản clone (Windows và WSL) lệch nhau; Docker Desktop đã có bản WSL `docker-desktop`, cài Ubuntu
không ảnh hưởng nó (`CHƯA KIỂM`).
