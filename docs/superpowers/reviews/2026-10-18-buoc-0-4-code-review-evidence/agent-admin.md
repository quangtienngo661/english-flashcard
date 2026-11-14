# Review độc lập — slice `AD`: web quản trị `apps/admin` (Bước 2.5 + UI refresh B + bản sửa keepalive)

Ngày 18/10/2026. Reviewer độc lập (chưa từng viết code này). Snapshot đọc: `.claude/worktrees/review-buoc-0-4/` (detached tại
`origin/dev` = `dc4cbe0`). Mọi đường dẫn dưới đây tính từ gốc snapshot, trừ khi ghi rõ. **Chỉ đọc tĩnh:** không chạy test, không
Docker, không trình duyệt. "CONFIRMED" = đã lần theo code từ đầu tới cuối (kể cả mã thư viện trong `node_modules` khi cần);
"SUSPECTED" = phụ thuộc thời điểm, cần chạy probe.

**Kết luận ngắn:** không thấy lỗ hổng mức Cao. Token giữ đúng chỗ (access token trong bộ nhớ, refresh token là cookie `httpOnly`),
không có sink XSS, không có open redirect, mọi thao tác đều bị API chặn theo quyền ở mỗi request, cờ `must_change_password` không
lách được. Có 4 điểm Trung bình, đều nằm ở cách xử lý lỗi của phiên và thông báo lỗi: refresh trả 5xx bị coi là hết phiên (đăng
xuất thật mọi tab), đăng xuất nuốt lỗi của server (cookie 90 ngày vẫn sống, F5 là vào lại), không bao giờ hiện `operation_id`
(B25#19), và 5 form không khóa nút khi 429 (B25#18). Thêm 9 điểm Thấp.

---

## 1. Phạm vi đã đọc

Ba lượt đọc: (1) design + tài liệu đã biết + lớp phiên/API client; (2) mọi màn hình và component có hành vi; (3) đối chiếu phía API,
mã thư viện, test và CI.

**Code `apps/admin` (đọc hết):** `src/auth/*` (`session-store.ts`, `session-context.tsx`, `gate.ts`, `use-can.ts`,
`password-policy.ts`, `test-support.ts`), `src/api/*` (`client.ts`, `problem.ts`, `download.ts`, `idempotency.ts`,
`use-error-message.ts`), `src/app/*` (`App.tsx`, `routes.tsx`, `RequireSession.tsx`, `Shell.tsx`, `nav.ts`, `offline.tsx`,
`SessionLoading.tsx`, `shell-slots.tsx`), `src/features/**` (account, staff, sources, uploads, export, publish-jobs, jobs, content,
coming-soon), `src/ui/*` có hành vi (`DataList`, `DetailPanel`, `Dialog`, `Toast`, `FileDrop`, `Button`, `TextField`, `Select`,
`ListState`, `Banner`, `use-presence`, `use-retained`, `focus-row-link`, `use-media-query`), `src/i18n/*`, `src/config.ts`,
`src/api-base-url-guard.ts`, `src/resolve-api-base-url.ts`, `messages/vi.json` (hết), `messages/en.json` (grep), `vite.config.ts`,
`vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`, `playwright.real.config.ts`, `wrangler.jsonc`, `package.json`,
`index.html`, `.env.example`, `.gitignore`, `tsconfig.json`, `eslint.config.mjs`, `scripts/check-tailwind-raw.mjs`.

**Test:** `e2e-real/**` (hết), `e2e/support/mock-api.ts`, `e2e/account.spec.ts`; `session-store.test.ts` (các test phiên),
`session-context.test.tsx`, `account/test-utils.tsx`, `ChangePasswordPage.test.tsx` (phần đầu); các file test còn lại đọc qua danh
sách tên test. CI: `.github/workflows/ci.yml` (job `admin`, `admin-e2e-real`).

**Phía API (để xác nhận server chặn):** `identity/auth/{auth,password,otp}.controller.ts`, `password.service.ts`,
`auth.service.ts` (login), `credential-decision.ts`, `auth.schemas.ts`, `otp.service.ts` (phần reset);
`identity/sessions/{sessions.controller,session-transport,auth.guard}.ts`, `session.service.ts` (refresh, grace, TTL);
`identity/staff/{permission.guard,staff.controller,staff.schemas}.ts`, `staff.service.ts` (setStaffRole, listStaff);
`identity.types.ts`, `profile.controller.ts`, `identity.service.ts` (shape `/me`); decorator quyền của mọi controller nội dung
(`uploads`, `uploads-read`, `publish-jobs`, `senses-export`, `sources`, `topics`); `common/idempotency/*`;
`common/problem-details/problem-details.filter.ts` (grep); `app.setup.ts` (CORS); `common/config/app-config.ts` (rate limit, TTL,
`IMPORT_MAX_BYTES`); `mail-budget.service.ts`, `csv-writer.spec.ts` (grep).

**Mã thư viện (đọc trong `node_modules` của snapshot):** `react-router@8.4.0` (`lib/router/history.js`, `utils.js`
`resolvePath`/`matchRoutesImpl`/`compilePath`, `hooks.js`, `components.js`, `router/navigation.js`),
`@tanstack/query-core@5.104.2` (`queryObserver.js`, phần `refetchInterval`), `vite@8.3.4` (mặc định `build.sourcemap`).

**Tài liệu:** design Bước 2.5 (hết, nhất là §4, §5, §6, §8, §10–§12, §15), decision record 2.5 (D12–D17, D27, mục sửa sau
review), design keepalive (hết), review keepalive (hết), review UI-B admin (hết), `docs/deliveries/buoc-2-5.md`,
`buoc-2-5-test-flow.md`, `ui-refresh-b.md`, `admin-refresh-keepalive.md` (hết); design UI-B chỉ phần hành vi (UB10, UBE20–UBE35).

---

## 2. Bảng tóm tắt

| ID | Mức | Phát hiện (1 dòng) | file:dòng | Trạng thái |
|---|---|---|---|---|
| AD1 | Trung bình | Refresh trả 5xx bị coi là "hết phiên": giữa phiên thì gọi logout thật + đá mọi tab; lúc mở trang thì về `/login` không báo | `apps/admin/src/auth/session-store.ts:195-196`, `:237-240`, `:150`, `:165-172` | CONFIRMED |
| AD2 | Trung bình | Đăng xuất nuốt lỗi của server: giao diện báo đã đăng xuất nhưng cookie refresh (tới 90 ngày) vẫn sống, F5 là vào lại | `apps/admin/src/auth/session-store.ts:119-128` | CONFIRMED |
| AD3 | Trung bình | Lỗi lạ/5xx chỉ hiện "Có lỗi xảy ra", không bao giờ hiện `operation_id` (B25#19, §8); test B25#19 không kiểm chữ hiển thị | `apps/admin/src/api/use-error-message.ts:10-12`, `apps/admin/src/api/problem.ts:86,92-96` | CONFIRMED |
| AD4 | Trung bình | 429 chỉ khóa nút + đếm ngược ở upload/publish/hoàn tác/quên mật khẩu; đăng nhập, đổi mật khẩu bắt buộc, đổi vai trò, tạo tài khoản, đăng ký nguồn thì không (B25#18) | `LoginPage.tsx:39`, `ChangePasswordPage.tsx:59`, `RoleDialog.tsx:64`, `CreateAccountDialog.tsx:70`, `SourcesPage.tsx:113` | CONFIRMED |
| AD5 | Thấp | `/me` lỗi ngay sau đăng nhập hoặc sau đổi mật khẩu thì form đứng yên, không có câu nào | `apps/admin/src/auth/session-store.ts:131-134`, `:104`, `:116` | CONFIRMED |
| AD6 | Thấp | Tab đang ở `/change-password` không kiểm lại `/me` khi được focus (B25#7, B25E26) | `apps/admin/src/auth/session-context.tsx:27-33` | CONFIRMED |
| AD7 | Thấp | Tab đã đăng nhập lặng lẽ chạy API bằng tài khoản khác (đăng nhập ở tab khác) mà vẫn hiện danh tính cũ | `apps/admin/src/auth/session-store.ts:77`, `:227-242` | CONFIRMED |
| AD8 | Thấp | `recheck()` ghi đè trạng thái `signed-out` mới hơn (đăng xuất lúc `/me` đang chạy) → tab quay lại app | `apps/admin/src/auth/session-store.ts:131-139` | SUSPECTED |
| AD9 | Thấp | Panel chi tiết lô/job vẫn hỏi lại mỗi 2 giây khi lời gọi lỗi (id lạ/sai dạng) | `apps/admin/src/features/jobs/usePollingStatus.ts:21` | CONFIRMED |
| AD10 | Thấp | Lỗi HTTP của danh sách phụ (topic, lô, nguồn level) bị nuốt: ô chọn rỗng, không báo | `apps/admin/src/features/content/FilterFields.tsx:41-42`, `apps/admin/src/features/uploads/UploadForm.tsx:34,161` | CONFIRMED |
| AD11 | Thấp | Câu `errors.mail-unavailable` nói "chưa tạo tài khoản" nhưng cũng hiện ở "Quên mật khẩu → Gửi mã" | `apps/admin/messages/vi.json:21`, `apps/admin/src/features/account/ForgotPasswordPage.tsx:62` | CONFIRMED |
| AD12 | Thấp | Bản deploy tĩnh chưa có security header (CSP, chống nhúng iframe, `nosniff`, `Referrer-Policy`) | `apps/admin/wrangler.jsonc:1-6` (không có `_headers`) | CONFIRMED |
| AD13 | Thấp | Trạng thái B25E30 trong design 2.5, `buoc-2-5.md` và `CLAUDE.md` đã cũ (code đã sửa) | `docs/superpowers/specs/2026-10-14-buoc-2-5-admin-web-design.md:461`, `docs/deliveries/buoc-2-5.md:92`, `CLAUDE.md:32` | CONFIRMED |

---

## 3. Từng phát hiện

### AD1 — Trung bình — Refresh trả 5xx bị coi là "hết phiên"

**Chỗ lỗi:** `apps/admin/src/auth/session-store.ts:195-196` (mọi status khác 429 đều là `'failed'`), `:237-240` (`authed`:
`'failed'` → `logout('expired')`), `:150` (nhánh 403 `forbidden` cũng vậy), `:165-172` (lúc khởi động: `'failed'` hoặc lỗi mạng →
`signed-out`, không notice).

**Cơ chế:**
```ts
// runRefresh()
this.token = null;
if (res.status !== 429) return 'failed';      // 500/502/503/504 đều vào đây
// authed()
if (refreshed === 'failed') {
  await this.logout('expired');               // POST /v1/auth/logout + phát 'logout' cho mọi tab
  return res;
}
```

**Vì sao sai:** design §5 viết gộp "Refresh thất bại → `/login` với 'Phiên đăng nhập đã hết hạn'", không tách lỗi máy chủ (design
im lặng về 5xx). Kỳ vọng hợp lý — cũng là chính lý do chủ dự án đã chốt cho 429 ở B25E30/UBE34 ("429 không làm mất phiên, cookie
refresh vẫn tốt") — là chỉ 401 `invalid-token` mới chứng tỏ phiên hết; lỗi máy chủ thì không. Design §8 dòng "Mất mạng / API tắt →
dải 'Không kết nối được máy chủ' + 'Thử lại'; giữ dữ liệu đang hiển thị" cho thấy ý đồ: sự cố máy chủ thì giữ người dùng lại.

**Hậu quả:**
- *Giữa phiên:* access token sống 15 phút (`ACCESS_TOKEN_TTL_SECONDS` mặc định 900, `apps/api/src/common/config/app-config.ts:174`).
  Nếu lúc nó hết hạn API đang restart/deploy (proxy trả 502/503) hoặc DB chập (transaction refresh có `maxWait: 5_000`,
  `apps/api/src/identity/sessions/session.service.ts:17`, rate limiter cũng ghi DB) thì request kế tiếp 401 → refresh 5xx →
  `logout('expired')`. Nếu logout tới được API: chuỗi phiên **bị thu hồi thật**, cookie bị xóa. Dù logout lỗi: vẫn phát `logout`
  qua `BroadcastChannel` → **mọi tab** về `/login` "Phiên đăng nhập đã hết hạn"; mất nội dung đang gõ (form tạo tài khoản, form
  nguồn…).
- *Lúc mở trang/F5:* refresh 5xx hoặc lỗi mạng → `/login` trống, không nói gì về máy chủ. Người dùng đăng nhập lại → thêm một
  chuỗi phiên (tính vào trần 10 thiết bị), trong khi chỉ cần F5 khi API lên lại.
- Sau bước "Deploy API + admin", mỗi lần deploy API là một cửa sổ như vậy cho mọi staff đang mở admin.

**Đã loại trừ:** (1) `fetch` không ném lỗi với 5xx — đó là `Response` bình thường (`res.ok` false), nên đi vào nhánh `'failed'`,
không phải nhánh lỗi mạng; (2) mất mạng thật giữa phiên thì đúng: `postRefresh` ném `TypeError` → client đổi thành `NetworkError`
(`apps/admin/src/api/client.ts:16-20`) → dải offline, không đăng xuất — chỉ 5xx là sai; (3) API có thể trả 5xx ở refresh: `refresh()`
chạy rate limiter + transaction có `withUserLock` (`session.service.ts:86-92`), lỗi DB thành 500.

**Probe đề xuất** (Vitest, `apps/admin/src/auth/session-store.test.ts`, dùng helper có sẵn):
```ts
it('a 5xx on the refresh after a 401 keeps the session: no server logout, no broadcast', async () => {
  const hub = channelHub();
  const other = newStore({ 'POST /v1/auth/refresh': () => tokenResponse('t'), 'GET /v1/me': ok(makeMe()) }, hub.create());
  await other.store.bootstrap();
  const { store, count } = newStore({
    'POST /v1/auth/login': () => tokenResponse('tok-1'),
    'GET /v1/me': ok(makeMe()),
    'GET /v1/x': () => problem(401, 'invalid-token'),
    'POST /v1/auth/refresh': () => problem(503, ''),
    'POST /v1/auth/logout': noContent,
  }, hub.create());
  await store.login('s@example.com', 'pw');
  await expect(createApiClient({ send: store.send }).get('/v1/x')).rejects.toBeInstanceOf(ApiError);
  expect(count('POST', '/v1/auth/logout')).toBe(0);     // nghi ngờ thực tế: 1
  expect(store.state.status).toBe('signed-in');         // nghi ngờ thực tế: signed-out, notice 'expired'
  expect(other.store.state.status).toBe('signed-in');   // nghi ngờ thực tế: signed-out (nhận broadcast)
});
```
Trên stack thật: chạy API với `ACCESS_TOKEN_TTL_SECONDS=20`, đăng nhập, `docker pause` Postgres, đợi 25 giây, bấm một mục menu →
quan sát `POST /v1/auth/refresh` 500 rồi `POST /v1/auth/logout`; `docker unpause`, F5 ở tab khác → kỳ vọng vẫn đăng nhập; nghi ngờ
thực tế: về `/login` (nếu logout đã tới API thì phải đăng nhập lại).

**Cách sửa gợi ý:** `runRefresh` chỉ trả `'failed'` khi 401 (và 403 `csrf-header-required`); 5xx trả một kết quả riêng (vd.
`'unavailable'`) để request gốc kết thúc như lỗi mạng (dải offline + "Thử lại"), còn bootstrap giữ màn tải kèm nút thử lại thay vì
`/login`.

---

### AD2 — Trung bình — Đăng xuất nuốt lỗi của server; cookie refresh vẫn sống

**Chỗ lỗi:** `apps/admin/src/auth/session-store.ts:119-128`.

**Cơ chế:**
```ts
async logout(notice: Notice | null = null): Promise<void> {
  try {
    await this.raw('/v1/auth/logout', json('POST', {}, this.csrf()), this.token);  // không kiểm res.ok
  } catch {
    // The local session ends either way; the server-side chain expires on its own.
  }
  this.token = null;
  this.set({ status: 'signed-out', notice });
  this.broadcast({ type: 'logout' });
}
```
Phía API: `POST /v1/auth/logout` thu hồi chuỗi phiên theo cookie rồi xóa cookie (`apps/api/src/identity/sessions/sessions.controller.ts:37-50`).
Cookie là `httpOnly` trên host API (`session-transport.ts:14`) nên JS của admin không tự xóa được. Thời hạn: 90 ngày không dùng /
365 ngày tuyệt đối (`session.service.ts:195`).

**Vì sao sai:** design §5 chỉ viết luồng thành công ("POST logout → xóa token → phát logout"), im lặng khi logout lỗi. Kỳ vọng hợp
lý: người bấm "Đăng xuất" tin rằng trình duyệt không còn phiên; nếu server chưa thu hồi được thì phải nói ra hoặc thử lại. Chú thích
trong code sai về hệ quả: chuỗi phiên không "tự hết" trong 90 ngày, và cookie vẫn nằm trong trình duyệt.

**Hậu quả:** staff bấm "Đăng xuất" đúng lúc API trả 5xx, 429 (`auth.logout.ip` 60/phút/IP, `app-config.ts`) hoặc mạng chập → thấy
`/login`, yên tâm rời máy. Người kế tiếp dùng cùng trình duyệt chỉ cần F5 hoặc mở lại `admin.` → bootstrap refresh bằng cookie còn
hạn → vào thẳng app với quyền của người trước (admin thì có cả "Vai trò & staff"). Các tab khác cũng nhận `logout` và về `/login`,
càng củng cố cảm giác đã đăng xuất. Đây khác với ca "đóng tab giữa lúc logout" mà review keepalive đã để ngoài (Declined): ở đây
trang vẫn mở và *biết* request lỗi, nhưng nuốt lỗi.

**Đã loại trừ:** (1) server cần cookie để thu hồi (`readRefreshToken`, `session-transport.ts:33-45`) — không tới server thì chuỗi
còn nguyên; (2) bootstrap không có cờ "vừa đăng xuất": `runBootstrap` → refresh → `/me` → `signed-in` (`session-store.ts:158-173`);
(3) test `session-store.test.ts:326` khẳng định chỉ trạng thái local (cố ý), không có quyết định nào của chủ dự án về việc không báo
cho người dùng (đã tìm trong decision record 2.5 và design keepalive).

**Probe đề xuất** (Playwright, `e2e-real`, context riêng để không ăn ngân sách refresh của câu chuyện):
```ts
const ctx = await browser.newContext(); const page = await ctx.newPage();
await signIn(page, state.admin.email, adminPassword); await expect(page).toHaveURL(/\/uploads$/);
await page.route('**/v1/auth/logout', (r) => r.abort());
await page.getByRole('button', { name: new RegExp(`${vi.shell.account}:`) }).click();
await page.getByRole('menuitem', { name: vi.shell.logout }).click();
await expect(page).toHaveURL(/\/login$/);
await page.unroute('**/v1/auth/logout');
await page.reload();
await expect(page).toHaveURL(/\/login$/);   // kỳ vọng của người dùng; nghi ngờ thực tế: về /uploads, đã đăng nhập
```
Bản API giả: `signedInAs(page, 'admin', { 'POST /v1/auth/logout': () => ({ status: 503 }) })`, đăng xuất, `page.reload()` → thấy
`/uploads` (mock refresh luôn 200, đóng vai cookie còn hạn).

**Cách sửa gợi ý:** kiểm `res.ok`; khi logout lỗi vẫn xóa token local nhưng hiện banner trên `/login` "Chưa đăng xuất được khỏi máy
chủ — Thử lại" (nút gọi lại logout, có thể kèm `keepalive`).

---

### AD3 — Trung bình — Không bao giờ hiện `operation_id` (B25#19, §8)

**Chỗ lỗi:** `apps/admin/src/api/use-error-message.ts:10-12`, `apps/admin/src/api/problem.ts:92-96`; câu `errors.generic` = "Có lỗi
xảy ra" không có chỗ cho mã (`apps/admin/messages/vi.json:3`).

**Cơ chế:**
```ts
// use-error-message.ts:10-12
if (error instanceof ApiError) return t(errorMessageKey(error.problem));   // → 'errors.generic'
...
return t('errors.generic');
// problem.ts:86 — có đọc vào nhưng không ai dùng
if (typeof body.operation_id === 'string') problem.operation_id = body.operation_id;
```
`grep operation_id apps/admin/src` chỉ thấy `problem.ts:7,86` và test; không component nào hiển thị.

**Vì sao sai:** design §8: "`type` không có trong bảng → 'Có lỗi xảy ra' kèm **mã lỗi** `operation_id` để tra log API"; dòng 400
"Idempotency-Key reused…": "hiện mã lỗi"; B25#19: "then the message shows the generic text and the `operation_id`". API gửi
`operation_id` trong mọi Problem Details (`apps/api/src/common/problem-details/problem-details.filter.ts:37`).

**Hậu quả:** khi API trả 500 (vd. DB lỗi lúc tạo publish job) hoặc một `type` mới chưa có trong bảng, staff chỉ thấy "Có lỗi xảy
ra" — không có mã để gửi cho người vận hành, tra log phải mò theo giờ. Trong pilot đây là đường duy nhất để staff báo lỗi chính xác.
Test B25#19 (`apps/admin/src/api/problem.test.ts:21`) vẫn xanh vì chỉ kiểm key `errors.generic` và việc parse — nên tiêu chí "Xong
khi" mục 1 (mọi `B25#` có test) đang được tính là đạt dù hành vi chưa có.

**Đã loại trừ:** (1) không có chỗ nào khác nối mã vào banner (grep cả `src/`); (2) `errors.generic` vi/en không có placeholder;
(3) mock e2e cũng gửi `operation_id: 'op-e2e'` (`apps/admin/e2e/support/mock-api.ts:28`) nên không phải do mock thiếu.

**Probe đề xuất** (Playwright API giả, có thể thành test hồi quy):
```ts
await signedInAs(page, 'editor', {
  'GET /v1/admin/content/sources': () => ({ json: { items: [] } }),
  'POST /v1/admin/content/sources': () => problem(500, 'brand-new-type'),   // body có operation_id 'op-e2e'
});
await page.goto('/sources/new');
await page.getByLabel(`${vi.sources.form.name} *`).fill('X');
await page.getByLabel(`${vi.sources.form.version} *`).fill('1');
await page.getByLabel(`${vi.sources.form.license} *`).fill('L');
await page.getByRole('button', { name: vi.sources.form.save }).click();
await expect(page.getByRole('alert')).toContainText('op-e2e');   // theo design: qua; thực tế: chỉ "Có lỗi xảy ra"
```

**Cách sửa gợi ý:** khi key là `errors.generic` (hoặc status ≥ 500), nối mã: vd. câu `"Có lỗi xảy ra (mã lỗi: {id})"`; sửa test
B25#19 để kiểm chữ hiển thị chứ không chỉ key.

---

### AD4 — Trung bình — 429 không khóa nút ở 5 form (B25#18, §8)

**Chỗ lỗi:** `apps/admin/src/features/account/LoginPage.tsx:39`, `ChangePasswordPage.tsx:59`,
`apps/admin/src/features/staff/RoleDialog.tsx:64`, `CreateAccountDialog.tsx:70`, `apps/admin/src/features/sources/SourcesPage.tsx:113`.

**Cơ chế:** chỉ `useSubmitAction.ts:45` (publish lô, hoàn tác, tạo publish job), `UploadForm.tsx:97` và
`ForgotPasswordPage.tsx:61,85` đọc `retryAfterSeconds` và khóa nút. 5 form trên chỉ:
```ts
} catch (e) {
  setError(errorMessage(e));   // 429 → "Thao tác quá nhanh, hãy đợi một lát"; nút vẫn bấm được
}
```

**Vì sao sai:** design §8 bảng: "429 | Đọc `Retry-After`; khóa nút kèm đếm ngược" (áp cho mọi lời gọi); B25#18: "When an API call
returns 429 with `Retry-After: N`, then the triggering button is disabled with an N-second countdown".

**Hậu quả** (ca thực tế nhất): đổi mật khẩu bắt buộc — nhập sai mật khẩu hiện tại 10 lần thì API khóa 15 phút và trả 429 với
`Retry-After` tới 900 giây (`apps/api/src/identity/auth/credential-decision.ts:22-25`, `password.service.ts:85-86`). Editor mới chỉ
thấy "Thao tác quá nhanh, hãy đợi một lát", nút vẫn sáng, bấm lại vẫn 429, không biết phải đợi 15 phút. Đăng nhập:
`auth.login.ip` 20 lần/phút/IP (văn phòng chung IP có thể chạm). Đổi vai trò / tạo tài khoản / đăng ký nguồn: `user.write` 30/phút
mỗi người (admin thao tác hàng loạt). Không mất dữ liệu; hại ở chỗ thông báo mơ hồ và người dùng bấm lặp vô ích.

**Đã loại trừ:** (1) API có gửi `Retry-After` cho các route này: filter đặt header khi có `retryAfterSeconds`
(`problem-details.filter.ts:22-23`), rate limiter tính nó (`rate-limiter.service.ts:39`), CORS mở header này (`app.setup.ts:17`);
(2) `Button` chỉ khóa khi `isPending` (`apps/admin/src/ui/Button.tsx:31-32`), request xong là mở lại; (3) Xuất CSV và "Tìm theo
email" là GET không gắn `@RateLimit` nên không tính.

**Probe đề xuất** (Vitest, `ChangePasswordPage.test.tsx`, dùng `open()`/`fill()` có sẵn):
```ts
it('B25#18: a 429 Retry-After 900 on the change locks the button with a countdown', async () => {
  await open({ 'POST /v1/auth/password/change': () => new Response(
    JSON.stringify({ type: 'http://api.test/problems/rate-limited', status: 429, title: 'x' }),
    { status: 429, headers: { 'content-type': 'application/problem+json', 'retry-after': '900' } }) });
  await fill('Wrong-pass-1!', GOOD, GOOD);
  expect(await screen.findByRole('button', { name: /900/ })).toBeDisabled();  // thực tế: không có, "Đổi mật khẩu" vẫn bật
});
```
Tương tự cho `LoginPage` (`POST /v1/auth/login` → 429 `retry-after: 30`).

**Cách sửa gợi ý:** tách nhánh 429 của `useSubmitAction` thành một hook dùng chung (vd. `useRateLimitLock`) và gắn cho 5 form.

---

### AD5 — Thấp — `/me` lỗi sau đăng nhập hoặc sau đổi mật khẩu: không có câu nào

**Chỗ lỗi:** `apps/admin/src/auth/session-store.ts:131-134`, dùng ở `login()` `:104` và `changePassword()` `:116`.

**Cơ chế:**
```ts
async recheck(): Promise<void> {
  const res = await this.authed('/v1/me', { method: 'GET', headers: {} });
  if (!res.ok) return;          // 5xx → không đổi trạng thái, không ném lỗi
```
`login()`/`changePassword()` vì thế không ném → `LoginPage.tsx:36-43` và `ChangePasswordPage.tsx:53-59` không có gì để hiện.

**Vì sao sai:** design §8 (mọi lỗi API có câu); design im lặng về `/me` lỗi ngay sau đăng nhập. Kỳ vọng hợp lý: báo lỗi và cho thử
lại.

**Hậu quả:** (a) đăng nhập đúng mật khẩu nhưng `/me` 500 → nút hết quay, form đứng yên, không chữ nào; bấm lại → API tạo thêm một
chuỗi phiên mỗi lần (trần 10 thiết bị, B25E19). (b) Đổi mật khẩu bắt buộc **đã thành công** nhưng `/me` 500 → form đổi mật khẩu vẫn
hiện, không báo gì; editor tưởng chưa đổi, điền lại mật khẩu tạm làm "hiện tại" → "Mật khẩu hiện tại không đúng" → dễ đi tới khóa
15 phút (và theo AD4 chỉ thấy "Thao tác quá nhanh").

**Đã loại trừ:** `authed` chỉ xử lý 401 (`:230`); 5xx đi thẳng ra; không caller nào kiểm trạng thái sau `recheck`.

**Probe đề xuất** (Vitest, `LoginPage.test.tsx` với `renderAccount`): routes `'POST /v1/auth/refresh': () => problem(401,'invalid-token')`,
`'POST /v1/auth/login': () => tokenResponse('t')`, `'GET /v1/me': () => problem(500, '')` → điền email/mật khẩu, bấm "Đăng nhập" →
kỳ vọng có `role="alert"`; thực tế nghi ngờ: không có alert, vẫn ở `/login`.

**Cách sửa gợi ý:** `recheck()` ném `ApiError` khi `/me` không ok (trừ khi đã đăng xuất trong lúc chờ), để form hiện câu lỗi.

---

### AD6 — Thấp — Tab ở `/change-password` không kiểm lại `/me` khi được focus (B25#7, B25E26)

**Chỗ lỗi:** `apps/admin/src/auth/session-context.tsx:27-33`.

**Cơ chế:**
```ts
const signedIn = state.status === 'signed-in';
useEffect(() => {
  if (!signedIn) return;                 // trạng thái 'change-password' bị loại
  const onFocus = () => void store.recheck();
```
`changePassword()` cũng không phát gì qua `BroadcastChannel` (`session-store.ts:109-117`).

**Vì sao sai:** B25#7 "When the tab regains focus, then `/me` is fetched again and the gate rule is applied" (không giới hạn trạng
thái); D13 "kiểm `/me` … khi tab được focus lại"; B25E26 (đổi mật khẩu bắt buộc khi đang mở hai tab).

**Hậu quả:** editor mở admin ở hai tab, cả hai ở `/change-password` (chung một chuỗi phiên vì chung cookie). Đổi xong ở tab A → tab A
vào app. Sang tab B: vẫn form đổi mật khẩu. Điền mật khẩu tạm làm "hiện tại" → "Mật khẩu hiện tại không đúng" (lặp 10 lần là khóa 15
phút). Điền mật khẩu mới làm "hiện tại" → API đổi mật khẩu lần nữa và thu hồi phiên của tab A. Chỉ F5 mới gỡ.

**Đã loại trừ:** `/me` không có `@RequirePermission`, nên một lần recheck sẽ thấy `must_change_password: false` và đưa tab B vào app
— chỉ thiếu cái kích hoạt; không có polling/query nào chạy ở trạng thái này (Shell không render).

**Probe đề xuất** (Vitest, `session-context.test.tsx`): `/me` trả `must_change_password: true` lần đầu, `false` các lần sau; chờ
`change-password`; `act(() => window.dispatchEvent(new Event('focus')))`; kỳ vọng `count('GET','/v1/me') === 2` và trạng thái
`signed-in`; thực tế nghi ngờ: 1 lần, vẫn `change-password`.

**Cách sửa gợi ý:** cho focus recheck chạy cả ở `change-password`; hoặc phát `{ type: 'login' }` sau khi đổi mật khẩu thành công.

---

### AD7 — Thấp — Tab đã đăng nhập lặng lẽ đổi sang tài khoản khác

**Chỗ lỗi:** `apps/admin/src/auth/session-store.ts:77` (chỉ xử lý `login` khi `signed-out`), `:227-242` (refresh sau 401 không đọc
lại `/me`).

**Cơ chế:**
```ts
} else if (type === 'login' && this.state.status === 'signed-out') {  // tab đang signed-in bỏ qua tin 'login'
...
// authed(): refresh 'ok' → gửi lại request với token mới; state.me giữ nguyên
return this.raw(path, init, this.token);
```

**Vì sao sai:** design §5 chỉ nói tab đang ở `/login` tự khởi động lại; im lặng về tab đang đăng nhập. Kỳ vọng hợp lý: tab không được
hiện danh tính X trong khi gọi API bằng danh tính Y.

**Hậu quả:** tab 1: admin X. Tab 2 cùng trình duyệt: đăng nhập editor Y (vd. admin thử tài khoản editor vừa tạo) → cookie refresh
thành của Y. Tab 1 vẫn hiện email X, menu admin; khi access token của X hết hạn (≤ 15 phút), 401 → refresh bằng cookie của Y → mọi
thao tác sau đó (upload, publish, hoàn tác) chạy dưới tên Y, log API ghi Y, màn hình ghi X. Không vượt quyền (server xét quyền của
Y; vào "Vai trò & staff" sẽ gặp 403 → luật cổng → chỉnh lại), nhưng sai người chịu trách nhiệm trên log. Hết khi tab được focus lại.

**Đã loại trừ:** server không có lý do chặn (access token của Y hợp lệ); focus recheck sửa được nhưng tab đang dùng thì không có sự
kiện focus.

**Probe đề xuất** (Vitest, `session-store.test.ts`):
```ts
let meId = 'x';
const { store } = newStore({
  'POST /v1/auth/login': () => tokenResponse('tok-x'),
  'GET /v1/me': () => Response.json(makeMe({ id: meId })),
  'GET /v1/x': (c) => (c.headers.Authorization === 'Bearer tok-x' ? problem(401, 'invalid-token') : Response.json({})),
  'POST /v1/auth/refresh': () => { meId = 'y'; return tokenResponse('tok-y'); },
});
await store.login('x@example.com', 'pw');
await createApiClient({ send: store.send }).get('/v1/x');
expect((store.state as { me: Me }).me.id).toBe('y');   // thực tế nghi ngờ: 'x'
```

**Cách sửa gợi ý:** nhận `login` lúc đang `signed-in` thì chạy refresh + `recheck()`; hoặc sau mỗi refresh, nếu `sub` của access token
mới khác `me.id` thì `recheck()`.

---

### AD8 — Thấp — `recheck()` ghi đè `signed-out` mới hơn → tab quay lại app (SUSPECTED)

**Chỗ lỗi:** `apps/admin/src/auth/session-store.ts:131-139`.

**Cơ chế:** `recheck()` không kiểm token/trạng thái có bị đổi trong lúc chờ `/me`:
```ts
const res = await this.authed('/v1/me', ...);      // trong lúc chờ: logout() đặt token=null, state signed-out
...
if (next === 'app') this.set({ status: 'signed-in', me });   // ghi đè
```
`/me` chỉ cần chữ ký JWT (`apps/api/src/identity/sessions/auth.guard.ts`, không kiểm chuỗi đã thu hồi), nên vẫn 200 sau logout.

**Vì sao sai:** design §5: đăng xuất → xóa token → về `/login`. Kỳ vọng: không có đường nào từ `signed-out` về `signed-in` mà không
qua đăng nhập/khởi động.

**Hậu quả:** tab B vừa F5 (bootstrap đang chờ `/me`) đúng lúc tab A đăng xuất — hoặc focus recheck chạy đúng lúc bấm đăng xuất: tab
B vào lại app với `token = null` → query 401 → refresh (cookie đã xóa) → `logout('expired')` → `/login` "Phiên đăng nhập đã hết hạn"
thay vì đăng xuất bình thường, kèm một broadcast thừa. Nếu logout ở tab A đã lỗi phía server (AD2) thì refresh thành công và tab B
đăng nhập lại hẳn.

**Đã loại trừ:** single-flight `bootstrapping` không giúp vì logout không hủy bootstrap; `this.token` bị đặt `null` nhưng `recheck`
không đọc lại trước khi `set`. SUSPECTED vì cần đúng thời điểm (cửa sổ = độ trễ `/me`).

**Probe đề xuất** (Vitest): `/me` trả chậm 20 ms; `const p = store.recheck(); await store.logout(); await p;` → kỳ vọng
`store.state.status === 'signed-out'`; nghi ngờ thực tế: `signed-in` với `store.hasAccessToken === false`.

**Cách sửa gợi ý:** nhớ token lúc gửi `/me`; khi trả về mà `this.token` đã khác (hoặc một bộ đếm "thế hệ" tăng ở mỗi logout đã đổi)
thì bỏ kết quả.

---

### AD9 — Thấp — Panel chi tiết vẫn hỏi lại mỗi 2 giây khi lời gọi lỗi

**Chỗ lỗi:** `apps/admin/src/features/jobs/usePollingStatus.ts:21`.

**Cơ chế:** `refetchInterval: (query) => (isTerminal(query.state.data?.status) ? false : POLL_INTERVAL_MS)` — khi lỗi và chưa có
`data` thì luôn 2000. TanStack Query 5.104.2 tính lại interval sau mỗi lần cập nhật query (`queryObserver.js:460-462` →
`#updateTimers`) và không xét trạng thái lỗi khi đặt timer (`queryObserver.js:274-276, 290-296`, trong
`node_modules/.pnpm/@tanstack+query-core@5.104.2/.../build/modern/`).

**Vì sao sai:** design §6.3 "Polling … khi `queued`/`running` … ra trạng thái kết thúc thì dừng"; không có trạng thái nào thì không
có lý do hỏi mãi. UBE24 chỉ nói panel hiện lỗi.

**Hậu quả:** mở `/uploads/<id lạ>` (link cũ, gõ tay, id sai dạng) → panel lỗi nhưng cứ 2 giây gọi API (400/404) khi panel còn mở và
tab còn focus. Tốn request. Nếu sau này có lệch quyền giữa route và API (403 `forbidden` mà `/me` vẫn đủ quyền), mỗi lần hỏi kéo
theo một refresh + `/me`, chạm giới hạn 10 refresh/phút rồi bị đẩy ra `/login` "rate-limited".

**Đã loại trừ:** `retry: false` (`apps/admin/src/app/offline.tsx:17`) chỉ tắt retry tức thời, không tắt interval; tab ẩn không hỏi
(đúng). Hôm nay route và API dùng cùng quyền nên kịch bản 403 chưa xảy ra.

**Probe đề xuất** (Vitest, `usePollingStatus.test.tsx`, fake timers): `fetcher = vi.fn().mockRejectedValue(new ApiError({ type: 'x/not-found', slug: 'not-found', status: 404, title: 'x' }, null))`;
render hook; `await vi.advanceTimersByTimeAsync(6000)`; kỳ vọng `fetcher` gọi 1 lần; nghi ngờ thực tế: 4 lần.

**Cách sửa gợi ý:** `refetchInterval: (q) => (q.state.data === undefined && q.state.status === 'error') || isTerminal(q.state.data?.status) ? false : 2000`
(nút "Thử lại" của `ListState` vẫn có).

---

### AD10 — Thấp — Lỗi HTTP của danh sách phụ bị nuốt

**Chỗ lỗi:** `apps/admin/src/features/content/FilterFields.tsx:41-42` (topic và lô cho bộ lọc của Xuất CSV / Tạo publish job),
`apps/admin/src/features/uploads/UploadForm.tsx:34,161` (nguồn level).

**Cơ chế:** `items={[all, ...(topics.data ?? []).map(…)]}`, `items={(sources.data ?? []).map(…)}` — không đọc `isError`. Dải offline
chỉ bật với `NetworkError` (`offline.tsx:19`), không với 4xx/5xx.

**Vì sao sai:** design §8 (mọi lỗi có câu; không nuốt lỗi). Design im lặng về danh sách phụ.

**Hậu quả:** `GET /v1/admin/content/sources` trả 500 → editor upload file CEFR (có cột level) → ô "Nguồn level" trống → bấm Upload →
"Hãy chọn nguồn level cho file có cột level", không chọn được gì, không biết vì sao. Bộ lọc topic rỗng ở Xuất CSV → tưởng chưa có
topic. Ghi chú: trang Xuất CSV (`content.edit`) còn gọi `GET uploads` (`content.import`) và `GET topics` (`taxonomy.manage`); hôm
nay `admin` và `editor` có cả ba quyền (`apps/api/src/identity/identity.types.ts:9-10`), nhưng nếu tách quyền sau này thì bộ lọc sẽ
rỗng im lặng theo đúng cơ chế này.

**Đã loại trừ:** không có `ListState`/banner nào gắn với hai query này (đọc hết `FilterFields.tsx`, `UploadForm.tsx`).

**Probe đề xuất** (Vitest, `UploadForm.test.tsx`): `'GET /v1/admin/content/sources': () => problem(500, '')`, chọn file có header
`headword,cefr`, mở ô "Nguồn level" → kỳ vọng có câu lỗi/nút thử lại; nghi ngờ thực tế: danh sách rỗng, không câu nào.

**Cách sửa gợi ý:** khi query lỗi, hiện một dòng lỗi nhỏ + "Thử lại" dưới ô chọn.

---

### AD11 — Thấp — `errors.mail-unavailable` sai ngữ cảnh ở "Quên mật khẩu"

**Chỗ lỗi:** `apps/admin/messages/vi.json:21`, `apps/admin/messages/en.json:21`; dùng ở `ForgotPasswordPage.tsx:62` qua `errorMessage(e)`.

**Cơ chế:** `POST /v1/auth/otp` (reset) gọi `budget.assertAvailable()` (`apps/api/src/identity/auth/otp.service.ts:93`) → 503
`mail-unavailable` (`mail-budget.service.ts:30`). Câu toàn cục: "Hiện chưa gửi được email nên chưa tạo tài khoản. Vui lòng thử lại
sau ít phút." (`staff.create.mailUnavailable` có câu y hệt nhưng không component nào dùng.)

**Vì sao sai:** câu được viết cho B25E16 (tạo tài khoản); ở quên mật khẩu không có tài khoản nào đang được tạo. Design im lặng; kỳ
vọng hợp lý: câu đúng ngữ cảnh.

**Hậu quả:** staff quên mật khẩu đúng lúc hết hạn mức mail ngày → đọc "chưa tạo tài khoản" → tưởng tài khoản của mình không tồn tại.

**Đã loại trừ:** `ForgotPasswordPage.tsx:59-63` không có nhánh riêng cho slug này; `errorMessageKey` trả `errors.mail-unavailable`.

**Probe đề xuất** (Vitest, `ForgotPasswordPage.test.tsx`): `'POST /v1/auth/otp': () => problem(503, 'mail-unavailable')` → gửi email
→ `expect(screen.getByRole('alert')).not.toHaveTextContent(/tạo tài khoản/)` — thực tế: có.

**Cách sửa gợi ý:** câu toàn cục trung tính ("Chưa gửi được email, vui lòng thử lại sau ít phút"); `CreateAccountDialog` dùng
`staff.create.mailUnavailable` đã có sẵn.

---

### AD12 — Thấp — Chưa có security header cho bản deploy tĩnh

**Chỗ lỗi:** `apps/admin/wrangler.jsonc:1-6`; không có `apps/admin/public/_headers` (không có thư mục `public/`); `index.html` không
có CSP.

**Cơ chế:** Worker chỉ phục vụ file tĩnh với header mặc định.

**Vì sao sai:** design §4 im lặng. Kỳ vọng hợp lý cho một trang quản trị: chặn bị nhúng iframe (`frame-ancestors 'none'`), CSP giới
hạn script về `'self'` (lớp phòng thủ thứ hai: access token nằm trong bộ nhớ JS nên một lỗi XSS là chiếm được phiên), `nosniff`,
`Referrer-Policy`.

**Hậu quả:** hiện chưa deploy (D4) nên chưa ai bị. Khi deploy: không có CSP để chặn một XSS tương lai (vd. từ thư viện); trang nhúng
được vào iframe (rủi ro clickjacking thấp vì cookie `SameSite=Strict` không gửi trong iframe khác site, trang nhúng sẽ ở màn đăng
nhập).

**Đã loại trừ:** không có header trong `wrangler.jsonc`, `index.html`, `vite.config.ts`. Cloudflare có thể đặt header ở cấp zone —
ngoài repo, `ASSUMPTION` là chưa có.

**Probe đề xuất:** sau `pnpm build`: `ls apps/admin/dist/_headers` (không có). Sau deploy:
`curl -sI https://admin.wordmet.com | grep -iE 'content-security|frame|nosniff|referrer'` (rỗng).

**Cách sửa gợi ý:** đưa vào checklist bước "Deploy API + admin": thêm `public/_headers` (Workers Static Assets đọc `_headers` —
`ASSUMPTION`, kiểm docs Cloudflare lúc làm) với `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: no-referrer`, CSP `script-src 'self'; connect-src https://admin-api.wordmet.com; font-src https://fonts.gstatic.com; style-src 'self' https://fonts.googleapis.com`
(cần thử: React Aria đặt `style` inline cho popover, có thể phải cho `style-src-attr 'unsafe-inline'`).

---

### AD13 — Thấp — Trạng thái B25E30 trong tài liệu đã cũ

**Chỗ:** `docs/superpowers/specs/2026-10-14-buoc-2-5-admin-web-design.md:461` ("**Hiện tại:** app coi như mất phiên và mở `/login`
không thông báo … sửa khi refactor"), `docs/deliveries/buoc-2-5.md:92`, `CLAUDE.md:32` ("Known items left for that refactor: B25E30").

**Thực tế code:** đã sửa ở UI refresh B Task 11 (`docs/deliveries/ui-refresh-b.md:123`): `apps/admin/src/auth/session-store.ts:183-202`
chờ `Retry-After` (10 giây nếu thiếu), thử tối đa 3 lần, màn tải đếm lùi (`apps/admin/src/app/SessionLoading.tsx:14-23`); 3 lần 429
→ `/login` kèm notice `rate-limited` (`session-store.ts:221-224`, `LoginPage.tsx:51`), không gọi logout, không broadcast.

**Hậu quả:** phiên sau (hoặc người refactor admin) đọc `CLAUDE.md` sẽ đi sửa lại một lỗi đã sửa, hoặc coi hành vi hiện tại là lỗi.

**Cách sửa gợi ý:** cập nhật 3 chỗ, trỏ sang `ui-refresh-b.md` Task 11 và `admin-refresh-keepalive.md`. (Probe: không cần — đối
chiếu chữ.)

---

## 4. Test gaps (quan trọng)

| # | Tiêu chí | Thiếu gì | Bằng chứng |
|---|---|---|---|
| TG1 | B25#19 | Test chỉ kiểm key `errors.generic` và việc parse `operation_id`, không kiểm chữ hiển thị → xanh trong khi tiêu chí chưa đạt (AD3) | `apps/admin/src/api/problem.test.ts:21` |
| TG2 | B25#18 | Chỉ có test cho tạo publish job (`PublishJobs.test.tsx:159`, `e2e/publish-jobs.spec.ts:34`) và upload (`UploadForm.test.tsx:189`); không có cho đăng nhập, đổi mật khẩu bắt buộc, đổi vai trò, tạo tài khoản, đăng ký nguồn (AD4) | danh sách test |
| TG3 | B25#5 trên stack thật | `e2e-real` không bao giờ chạm đường "access token hết hạn giữa phiên → 401 → refresh dùng chung → gửi lại": CI không đặt `ACCESS_TOKEN_TTL_SECONDS` (mặc định 900, `app-config.ts:174`), cả bộ chạy chưa tới 1 phút. Đường thật gồm preflight CORS của refresh `keepalive` khi request khác đang chờ, gửi lại `FormData` + `Idempotency-Key` sau 401 — chỉ có unit với `fetch` giả. Gợi ý: một spec chạy API với `ACCESS_TOKEN_TTL_SECONDS=5`, upload sau khi token hết hạn, kỳ vọng 202 và đúng một `POST /v1/auth/refresh` | `.github/workflows/ci.yml:161-255`, `e2e-real/admin.real.spec.ts` |
| TG4 | §5 refresh/logout lỗi | Không test nào cho refresh trả 5xx; test duy nhất về logout lỗi chỉ kiểm trạng thái local, không kiểm người dùng được báo (AD1, AD2) | `session-store.test.ts:326` |
| TG5 | B25#7 | Chỉ phủ `signed-in` và `signed-out`, không có `change-password` (AD6) | `session-context.test.tsx:33,47` |

---

## 5. Đã kiểm, không thấy vấn đề

**Token và CSRF (mục 1):**
- Access token chỉ ở biến private của `SessionStore` (`apps/admin/src/auth/session-store.ts:49`). Không dùng
  `localStorage`/`sessionStorage`/IndexedDB/`document.cookie` cho phiên (grep: chỉ `src/i18n/locale.ts:8,18` lưu ngôn ngữ). Refresh
  token là cookie `httpOnly; Secure; SameSite=Strict; Path=/v1/auth` (`apps/api/src/identity/sessions/session-transport.ts:14`).
- **Phạm vi thiệt hại nếu có XSS:** kẻ tấn công gọi được `POST /v1/auth/refresh` với `credentials: 'include'` + header CSRF (CORS cho
  phép origin admin, `apps/api/src/app.setup.ts:13-17`) để lấy access token mới liên tục chừng nào trang còn mở — tức là chiếm phiên
  dù token để ở đâu; `httpOnly` chỉ ngăn mang refresh token 90 ngày ra khỏi trình duyệt. Vì vậy điều quan trọng là không có sink XSS:
  grep `dangerouslySetInnerHTML|innerHTML|insertAdjacentHTML|t.rich|href={…}|window.open|location.href` trong `src/` → 0 (trừ 1 test);
  chuỗi từ server/CSV (tên file, warnings, email, tên nguồn) đều render dạng text React (`BatchPanel.tsx:110,164-168`,
  `StaffPage.tsx:24,93`, `SourcesPage.tsx:28-31`); `use-intl` `t()` chèn biến dạng text. `rowHref`/`Link` chỉ ghép id vào đường dẫn
  nội bộ; `focusRowLink` so sánh chuỗi, không dựng selector (`src/ui/focus-row-link.ts`).
- `X-CSRF-Protection: 1` có ở hai lời gọi dùng cookie: refresh (`session-store.ts:211`) và logout (`:121`); server bắt buộc khi có
  cookie (`session-transport.ts:41-43`). Các lời gọi thay đổi dữ liệu khác chỉ dùng Bearer → không bị CSRF.
- `credentials: 'include'` ở mọi request (`session-store.ts:247`, `src/api/client.ts:17`); cookie `Path=/v1/auth` nên chỉ đi tới
  `/v1/auth/*`; API `credentials: true` + danh sách origin cố định (`app.setup.ts:13-17`).
- Guard `VITE_API_BASE_URL`: build production bắt host bắt đầu bằng `admin-api.` (`src/resolve-api-base-url.ts:14-16`), chỉ chạy khi
  `vite build` (`src/api-base-url-guard.ts:11-13`), runtime cũng kiểm (`src/config.ts:6`); test B25#20 có. Guard chấp nhận `http:` và
  mọi domain có tiền tố `admin-api.` — đúng chữ design §4; `http:` dưới trang `https:` bị chặn mixed content nên hỏng ồn ào.
- Bundle: chỉ `VITE_API_BASE_URL`; `.env` và `e2e-real/.state.json` (mật khẩu test) bị ignore (`apps/admin/.gitignore`); source map
  tắt (Vite 8.3.4 mặc định `sourcemap: false`, `node_modules/.pnpm/vite@8.3.4_.../vite/dist/node/chunks/node.js:34473`;
  `vite.config.ts` không bật).

**Refresh (mục 2):**
- Single-flight: `refresh()` dùng chung một promise (`session-store.ts:176-181`); request về 401 sau khi request khác đã refresh thì gửi
  lại ngay với token mới (`:232`); test B25#5 (`session-store.test.ts:130`) và ca trễ (`:161`).
- Gửi lại đúng một lần; lần gửi lại vẫn 401 thì trả về luôn (`:227-242`); nhánh 403 không gửi lại (`:142-156`). Không thấy vòng lặp.
- `keepalive` + đường dự phòng + chặn khi `pagehide` (`:210-218`) khớp RK8 vòng 3; B25E30 (`:188-202`, `:221-224`) khớp UBE34.
- Hai tab refresh cùng lúc: server có ân hạn 10 giây trả cùng token kế tiếp (`apps/api/src/identity/sessions/session.service.ts:178`),
  chỉ thu hồi khi dùng lại ngoài ân hạn (`:169`); e2e thật B25E1 (`e2e-real/admin.real.spec.ts:206-219`).
- Mất mạng giữa phiên: `NetworkError` → dải offline (`client.ts:16-20`, `src/app/offline.tsx:19`), không đăng xuất.

**Đăng xuất (mục 3):** gọi server kèm cookie + CSRF (`session-store.ts:121`), xóa token và state (`:125-126`), phát `logout`
(`:127`); tab khác xóa token, về `/login` (`:74-76`); `BroadcastChannel` bị chặn thì bỏ qua (`session-context.tsx:10-14`,
`session-store.ts:254-260`). Test B25#8 unit (`session-store.test.ts:272`) và e2e thật (`admin.real.spec.ts:221-224`). (Ngoại trừ AD2.)

**Chặn theo quyền (mục 4) — UI chỉ để gọn, server chặn thật ở mỗi request bằng DB (`apps/api/src/identity/staff/permission.guard.ts:29-35`):**

| Hành động UI | UI ẩn/chặn | Route API | Quyền server |
|---|---|---|---|
| Trang Lô nhập, chi tiết lô, tải `rejected.csv` | nav `content.import` (`src/app/nav.ts`), `Shell.tsx:132` | `GET admin/content/uploads[/:id][/rejected.csv]` | `content.import` (`uploads-read.controller.ts:23`) |
| Upload CSV | `useCan('content.edit')` (`UploadsPage.tsx:26`) | `POST admin/content/uploads` | `content.import` + `content.edit` (`uploads.controller.ts:26`) |
| Hoàn tác lô | `useCan('content.edit')` (`BatchPanel.tsx:36`) | `POST uploads/:id/revert` | như trên |
| Publish lô, tạo/xem publish job | `useCan('content.publish')` (`BatchPanel.tsx:35`, `PublishJobsPage.tsx:39`), nav | `GET/POST admin/content/senses/publish-jobs…` | `content.publish` (`publish-jobs.controller.ts:35`) |
| Xuất CSV | nav `content.edit` | `GET admin/content/senses/export` | `content.edit` (`senses-export.controller.ts:8`) |
| Nguồn (xem/đăng ký) | nav `content.import` | `GET/POST admin/content/sources` | `content.import` (`sources.controller.ts:9`) |
| Danh sách topic cho bộ lọc | theo trang | `GET admin/taxonomy/topics` | `taxonomy.manage` (`topics.controller.ts:13`) |
| Vai trò & staff, tạo tài khoản | nav `roles.manage` (`nav.ts:38`) | `GET staff`, `GET users`, `PUT users/:id/staff-role`, `POST users` | `roles.manage` (`staff.controller.ts:11`) |

Đi thẳng URL tới trang không có quyền → `Shell.tsx:132` đẩy về `homePath`; không có vòng chuyển hướng (`/dashboard` không cần quyền
nên luôn là điểm dừng, `nav.ts:50,58`).

**`must_change_password` (mục 5):** luật cổng `src/auth/gate.ts:4-7`; `RequireSession.tsx:14`, `LoginPage.tsx:25`,
`ForgotPasswordPage.tsx:37` đều đẩy về `/change-password`; route `*` về `/` rồi qua `RequireSession` (`routes.tsx:51`). Server:
`PermissionGuard` trả 403 `password-change-required` cho mọi route `@RequirePermission` (`permission.guard.ts:36-39`); `/me`, refresh,
logout, change, reset không có guard này. Đổi/đặt lại mật khẩu tắt cờ (`apps/api/src/identity/auth/password.service.ts:71,114`).
Không lách được bằng URL. e2e B25#27 (`e2e/account.spec.ts:53`, `e2e-real/admin.real.spec.ts:73-75`).

**Chuyển hướng sau đăng nhập (mục 6):** `from` lấy từ router state (`LoginPage.tsx:17`), không từ query string; chỉ
`RequireSession.tsx:12` đặt, bằng `pathname + search` của một route được bảo vệ (route matching không gộp `//`, nên `//host` không
khớp route bảo vệ nào: `react-router/dist/production/lib/router/utils.js:239-246,503-524`). Thêm hai lớp của React Router 8.4.0:
`resolvePath` gộp `//` (`utils.js:559`), `Navigate`/`useNavigate` gọi `validateNavigationTarget(…, "reject")`
(`components.js:427`, `hooks.js:294`, `router/navigation.js:30-42`) → không điều hướng ra origin khác. Không có open redirect.

**XSS (mục 7):** xem mục 1. Tên file tải về do giao diện đặt (`rejected-<id>.csv`, `publish-<id>.csv`, `senses-<ngày>.csv`), tải qua
object URL (`src/api/download.ts:2-12`). CSV injection: `rejected.csv`/export do API sinh và đã chặn ký tự công thức đầu ô
(`apps/api/src/content-pipeline/upload/csv-writer.spec.ts:15-16`, B2#54) — kiểm nhanh, thuộc slice API.

**Luồng CSV (mục 8):**
- Giới hạn file: client `10 * 1024 * 1024` (`UploadForm.tsx:18,65`) bằng đúng server `IMPORT_MAX_BYTES` mặc định 10 485 760
  (`app-config.ts:177`) + giới hạn multer (`apps/api/src/content-pipeline/content-pipeline.module.ts:34`); kiểm đuôi `.csv` (`:60`).
- `Idempotency-Key`: upload (`client.ts:43`, fingerprint `UploadForm.tsx:49`), publish lô (`BatchPanel.tsx:47`), tạo publish job
  (`PublishJobForm.tsx`), hoàn tác (`RevertDialog.tsx`, mount mỗi lần mở → key mới). Lỗi mạng giữ key; 409 "đang xử lý" gửi lại sau
  `Retry-After` cùng key; `idempotency-key-abandoned` đổi key (`useSubmitAction.ts:42-49`). Phía server, dòng idempotency được tạo
  trong cùng transaction với handler (`apps/api/src/common/idempotency/idempotency.service.ts:51,68`), nên handler lỗi (4xx) thì
  rollback → gửi lại cùng key là chạy lại thật, không phát lại lỗi cũ.
- Chống bấm đúp: `busy` ref ở mọi form + `Button` bỏ `onPress` và đổi `type` khi `isPending` (`src/ui/Button.tsx:31-32`); có e2e
  "double-click sends one POST" cho upload, publish job, đổi vai trò, tạo tài khoản, hoàn tác.
- Polling: 2 giây, dừng ở `succeeded/partial/failed` (`usePollingStatus.ts:11,21`); tab ẩn không hỏi (TanStack
  `queryObserver.js:294`, mặc định `refetchIntervalInBackground: false`); đóng panel thì unmount nên dừng; B25#13 unit + e2e.
  (Ngoại trừ AD9.)
- "Publish lô này" chỉ khi `succeeded/partial` và chưa hoàn tác (`BatchPanel.tsx:81-83`, B25E28); bộ lọc rỗng phải xác nhận
  (`PublishJobForm.tsx:34,41`, B25E29).

**Problem Details (mục 9):** parse cả body không phải JSON (`src/api/problem.ts:70-90`); 401 → refresh; 403 theo `type`
(`session-store.ts:142-156`; `profile-incomplete`, `csrf-header-required`, `staff-role-rule` không qua luật cổng, test
`session-store.test.ts:226`); 404 `not-found` → "không tìm thấy" ở tìm email (`src/features/staff/staff-api.ts:16-23`); 409 không
`type` → "đang chạy" + tự gửi lại (`problem.ts:94`); 409 có `type` (`email-taken`, `staff-role-rule`) → câu riêng; mọi slug đã biết có
câu vi/en (`problem.test.ts:57`); 413 (`payload-too-large`, `file-too-large`) có câu. (Ngoại trừ AD3, AD4, AD5, AD10, AD11.)

**Cấp vai trò (mục 10):** hộp xác nhận cho cấp và gỡ (`RoleDialog.tsx`), cảnh báo riêng khi tự gỡ quyền admin (`RoleDialog.tsx:29-30`);
tự hạ quyền → đọc lại `/me` → menu đổi, rời trang Vai trò (`StaffPage.tsx:186`; test B25E5 `StaffPage.test.tsx:142`); admin cuối cùng
→ "Không thể gỡ admin cuối cùng" (`RoleDialog.tsx:60-63`; server `staff.service.ts` `setStaffRole`); người chưa xác minh → nút tắt +
server chặn. Tạo tài khoản: hộp xác nhận nhắc lại email, không bao giờ hiện mật khẩu (`CreateAccountDialog.tsx`; e2e thật
`admin.real.spec.ts:67`), ô mật khẩu `autoComplete="new-password"`.

**Cấu hình (mục 11):** `wrangler.jsonc` đúng design §4 (SPA fallback, không deploy); không có bí mật trong bundle; source map tắt.
(Ngoại trừ AD12.)

**Test thật (mục 12):** `e2e-real` phủ: đăng nhập (`signIn`), refresh khi F5 (B25#4), keepalive khi rời trang (RKC3), hai tab refresh
cùng lúc (B25E1), đăng xuất đồng bộ tab (B25#8), từ chối quyền khi gỡ vai trò (B25#6) và learner bị chặn (B25#2), phiên bị thu hồi
nơi khác (B25#6a), luồng CSV đầu-cuối (đăng ký nguồn → upload → `partial` → `rejected.csv` → publish → job xong → danh sách → hoàn
tác, B25#12/B25#14). Thiếu: xem TG3.

---

## 6. Declined to judge / Ngoài phạm vi

**Declined to judge:**
- Lớp hiển thị (theo ghi chú của chủ dự án).
- Nhánh 403 `forbidden` → refresh OK → không gửi lại request gốc (`session-store.ts:146-150`): khớp B25#6 ("menu vẽ lại"); chỉ báo sai
  "không còn quyền" ở ca hiếm "chuỗi bị thu hồi nhưng cookie đã mới" (vd. trần 10 thiết bị, B25E19). Design §5 viết "request vẫn 403"
  có thể hiểu là gửi lại để kiểm — để chủ dự án quyết.
- `POST /v1/admin/users` không có `Idempotency-Key` (design §7.4 không đòi): lỗi mạng sau khi server đã tạo → lần bấm lại nhận
  `email-taken` kèm hướng dẫn "Tìm theo email". Hiếm, có đường thoát.
- Cache TanStack Query không xóa khi đăng xuất: dữ liệu là nội dung chung cho mọi staff; danh sách staff chỉ render cho `roles.manage`.
  Không thấy rò rỉ thực tế.
- `useErrorMessage` coi mọi `TypeError` là mất mạng (`use-error-message.ts:11`): lỗi lập trình trong khối `try` sẽ hiện "Không kết nối
  được máy chủ". Chưa thấy chỗ nào tạo ra được.
- Đã biết, không báo lại: B25E30 (đã sửa — xem AD13 về tài liệu); M5/M8/M9/M11 của review UI-B; logout không `keepalive` khi đóng tab,
  RKE4, Firefox/Safari với `keepalive`, M1/M2 của review keepalive; các điểm guideline chưa sửa (`buoc-2-5.md:80-82`); giới hạn đã
  chấp nhận (bộ lọc lô 20 mới nhất, chi tiết job không hiện bộ lọc, danh sách lô không hiện "Đã hoàn tác"); React Aria theo ngôn ngữ
  trình duyệt.

**Ngoài phạm vi (slice API):**
- `POST .../senses/publish-jobs` không kiểm trạng thái lô (B25E28): panel cũ đã dừng polling vẫn có thể publish phần còn lại của lô
  vừa bị người khác hoàn tác; UI chỉ chặn được khi dữ liệu còn mới.
- `/me` và `AuthGuard` chấp nhận access token của chuỗi đã thu hồi (có chủ đích, design §5) — là điều kiện để AD8 xảy ra.
- Giới hạn `auth.logout.ip` 60/phút/IP có thể làm logout trả 429 — góp phần vào AD2.

---

## 7. Chưa kiểm

- Không chạy gì (theo luật của đợt review): mọi kết luận là đọc tĩnh; AD8 cần chạy probe để xác nhận cửa sổ thời gian; các probe
  khác dùng để biến phát hiện thành test hồi quy.
- Chưa đọc hết các spec e2e API giả (chỉ đọc tên test, `account.spec.ts`, `support/mock-api.ts`); chưa đọc plan chi tiết Bước 2.5
  và plan UI-B.
- Design UI-B chỉ đọc phần hành vi (UB10, UBE20–UBE35).
- Không kiểm Firefox/Safari; không kiểm package `@wordmet/design-tokens`; không đọc sâu logic grace/reuse phía server ngoài các dòng
  đã dẫn.
