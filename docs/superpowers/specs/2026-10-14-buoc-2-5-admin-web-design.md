# Design — Bước 2.5: Giao diện web quản trị (`apps/admin`)

> **Trạng thái 14/10/2026:** chủ dự án đã duyệt (sau phiên review 14/10/2026, xem "Sửa design sau phiên review" trong decisions).
> Chưa có code. Bước tiếp theo: `superpowers:writing-plans`.

Ngày: 14/10/2026. Phạm vi: Bước 2.5 trong `../../HANDOFF_2026-10-05_BUOC_0.md` §2, do chủ dự án chốt ở D9 của Bước 2
([`../decisions/2026-10-12-buoc-2-content-pipeline-decisions.md`](../decisions/2026-10-12-buoc-2-content-pipeline-decisions.md)):
giao diện web (đăng nhập, trang admin, cấp vai trò) ngay sau Bước 2, trước Bước 3. Brainstorm qua `superpowers:brainstorming`,
hỏi từng câu trong chat. Nền: Bước 0–1 trên `main`; Bước 2 đã merge vào `dev` (PR #16, `520b996`).
Quyết định và trade-off: [`../decisions/2026-10-14-buoc-2-5-admin-web-decisions.md`](../decisions/2026-10-14-buoc-2-5-admin-web-decisions.md).
Tài liệu tham khảo giao diện (số đo DOM): [`../../preparation/ADMIN_UI_REFERENCES_2026-10-14.md`](../../preparation/ADMIN_UI_REFERENCES_2026-10-14.md).

**Nhãn:** **Chốt** = chủ dự án chọn trong phiên. **Đề xuất** = trợ lý đề xuất, duyệt cùng doc. **ASSUMPTION** = chưa kiểm chứng
bằng chạy thật hoặc nguồn. Design doc là tài liệu chính thức để build (chủ dự án chốt 12/10/2026); spec trong `docs/specs/`
không sửa theo doc này. Criteria và edge cases dùng số hiệu `B25#`/`B25E#`.

## 1. Mục tiêu và tiêu chí xong

Cho `admin` và `editor` làm việc bằng trình duyệt thay cho curl/Postman: đăng nhập; `admin` cấp và gỡ vai trò; staff chạy trọn
luồng nội dung bằng CSV (đăng ký nguồn, upload, xem báo cáo, tải dòng lỗi, xuất, publish theo bộ lọc, hoàn tác lô). Người
sắp làm `editor` tự đăng ký và xác minh email ngay trên trang admin. Chạy **local**; chưa deploy.

**Xong khi:**
1. Mọi tiêu chí `B25#` ở mục 11 có test tự động (unit, e2e với API giả, hoặc e2e với API thật theo cột "Test" của bảng); test cũ
   của `apps/api` và `apps/web` vẫn xanh.
2. CI xanh trên PR vào `dev`, gồm hai job mới `admin` và `admin-e2e-real` (mục 10).
3. Chạy tay trên máy local và ghi lại trong `docs/deliveries/buoc-2-5.md`:
   - DB mới → `pnpm admin:grant` cho chủ dự án → đăng nhập `http://localhost:5173`.
   - Trình duyệt thứ hai: đăng ký editor → nhập OTP từ Mailpit → chủ dự án cấp `editor` → editor đăng ký nguồn CEFR-J 1.5 →
     upload **file CEFR-J 1.5 thật** (chỉ tạo entry + level, chưa có sense — B2#7 của Bước 2) → xem báo cáo → xuất danh sách
     `unpublishable` → điền nghĩa/ví dụ cho vài dòng → upload lại → publish lô vừa upload → theo dõi job → gọi API tìm kiếm bằng
     tài khoản learner và thấy các từ đó.
   - Learner bị chặn ngay ở đăng nhập. Gỡ quyền editor khi editor đang mở trang → editor bị đá về `/login`.
   - Thử ở bề rộng 390, 768, 1024, 1440.

## 2. Quyết định đã chốt (14/10/2026)

Chi tiết phương án và trade-off ở file decisions. Tóm tắt:

| # | Quyết định | Chọn | Nhãn |
|---|---|---|---|
| D1 | Chỗ đặt code `admin.` | App riêng `apps/admin`, Worker Cloudflare riêng | Chốt |
| D2 | Phạm vi màn hình | Đăng nhập + cấp vai trò + luồng CSV | Chốt |
| D3 | Stack | Vite + React SPA, chỉ file tĩnh | Chốt |
| D4 | Deploy | Chạy local; deploy API + admin là bước riêng | Chốt |
| D5 | Màn hình tài khoản | Đăng nhập/xuất, đăng ký, OTP, quên mật khẩu | Chốt |
| D6 | Ngôn ngữ | vi + en | Chốt |
| D7 | Cách thiết kế giao diện | Figma trước, rồi code | Chốt |
| D8 | Trình tự Figma | Design doc → Claude dựng Figma → chủ dự án duyệt → code | Chốt |
| D9 | Thiết bị | Responsive đầy đủ | Chốt |
| D10 | Test e2e | Đa số API giả, 4 luồng chính với API thật | Chốt |
| D11 | Sửa backend | CORS + `endpoint` liệt kê publish job (cộng D17) | Chốt |
| D12 | Người không có vai trò đăng nhập | Chặn ngay ở đăng nhập; ngoại lệ: chưa xác minh email thì chuyển sang màn OTP | Chốt |
| D13 | Learner còn phiên vào trang admin | Đá về `/login` kèm thông báo | Chốt |
| D14 | Đồng bộ đăng xuất giữa các tab | `BroadcastChannel` | Chốt |
| D15 | Hướng giao diện | Sidebar trái + thanh trên; mật độ cao; giữ màu/font landing | Chốt (ok) |
| D16 | Đơn vị kích thước | Động (rem, %, `clamp()`, `minmax()`, container query), không px cố định | Chốt |
| D17 | Nguồn danh sách topic cho bộ lọc | Thêm `GET /v1/admin/taxonomy/topics` | Chốt |

Kế thừa (đã chốt trước, không hỏi lại): **L8** bố cục subdomain `<domain>` / `app.` / `admin.` / `api.`; **L5** `admin.` gọi
host riêng `admin-api.<domain>` trỏ vào cùng API để cookie phiên của `app.` và `admin.` không ghi đè nhau
(`../decisions/2026-10-08-landing-page-decisions.md`).

## 3. Phạm vi: làm và để sau

**Làm:**
- `apps/admin` (mới): khung app, phiên đăng nhập, các màn hình ở mục 6, vi/en, responsive.
- `apps/api`: sửa CORS, thêm `GET /v1/admin/content/senses/publish-jobs` và `GET /v1/admin/taxonomy/topics` (mục 7). Không đổi
  schema DB, không migration.
- Figma cho mọi màn hình ở mục 6 (M0).
- CI: hai job mới.
- `apps/admin/wrangler.jsonc` viết sẵn (không deploy).

**Để sau** (mục 14): deploy; soạn từng sense; quản lý entry/variant/level/topic; đổi mật khẩu khi đang đăng nhập; dark mode; email
người tạo publish job; theo dõi lỗi giao diện kiểu Sentry.

## 4. Kiến trúc

```
Trình duyệt ── ① tải giao diện ──▶ admin.wordmet.com      Worker "wordmet-admin": chỉ file tĩnh (apps/admin/dist)
     │
     └──── ② gọi API thẳng ────▶ admin-api.wordmet.com   cùng tiến trình NestJS với api.wordmet.com (L5)

Local:  http://localhost:5173 (vite dev)  ──▶  http://localhost:3000 (pnpm start) + pnpm start:worker
```

Worker chỉ đưa file giao diện (bước ①). Mọi dữ liệu và thao tác đi thẳng từ trình duyệt tới NestJS (bước ②); Worker không làm
trung gian. Server của `admin.` không thấy được phiên, vì cookie `refresh_token` nằm trên host API (host-only,
`session-transport.ts`), nên không dùng server-side rendering.

**Package `apps/admin`** (phiên bản từ `npm view`, 14/10/2026; plan ghim đúng số):

| Việc | Thư viện | Phiên bản |
|---|---|---|
| Build | `vite` + `@vitejs/plugin-react` | `8.3.4` / `6.1.2` |
| UI | `react`, `react-dom` | `19.3.0` (khớp `apps/web`) |
| CSS | `tailwindcss` + `@tailwindcss/vite` | `4.3.3` (khớp `apps/web`; plugin Vite: plan kiểm bản) |
| Chuyển trang | `react-router` | `8.4.0` |
| Gọi API, polling | `@tanstack/react-query` | `5.104.2` |
| vi/en | `use-intl` (lõi của `next-intl`, chạy trong React thường — docs `next-intl`, context7 14/10/2026) | `4.14.9` |
| Component có sẵn bàn phím/screen reader, chưa có giao diện | `react-aria-components` | `1.22.1` |
| Kiểm dữ liệu form | `zod` | `4.6.5` (khớp `apps/web`) |
| Test | `vitest`, Testing Library, `msw`, `@playwright/test`, `@axe-core/playwright` | `4.1.11`, như `apps/web`, `3.0.3`, `1.63.0`, `4.13.0` |

Cấu trúc thư mục (đề xuất; plan chốt tên file): `src/app` (router, provider, layout), `src/auth` (phiên, refresh, chặn quyền,
`BroadcastChannel`), `src/api` (client fetch, Problem Details, `Idempotency-Key`), `src/features/{account,staff,sources,uploads,
export,publish-jobs}`, `src/ui` (component theo Figma), `src/i18n` + `messages/{vi,en}.json`.

**Cấu hình:**
- `VITE_API_BASE_URL`, ghi vào bundle lúc build. Build production **dừng với lỗi** nếu host không bắt đầu bằng `admin-api.`
  (trường hợp biên L5: trỏ nhầm sang `api.` thì cookie ghi đè quay lại). Chế độ dev chấp nhận `http://localhost:<port>`.
- `apps/admin/wrangler.jsonc` (theo docs Cloudflare Workers qua context7, 14/10/2026):
  ```jsonc
  {
    "name": "wordmet-admin",
    "compatibility_date": "2026-10-14",
    "assets": { "directory": "./dist", "not_found_handling": "single-page-application" },
    "routes": [{ "pattern": "admin.wordmet.com", "custom_domain": true }]
  }
  ```
  `single-page-application` trả `index.html` cho mọi đường dẫn không khớp file. Request tới file tĩnh miễn phí và không giới
  hạn (docs pricing). Không tạo project Workers Builds, không deploy (D4).
- `apps/api/.env.example`: `CORS_ORIGINS` thêm `http://localhost:5173`.
- Ngôn ngữ đang chọn lưu ở `localStorage` (chỉ ngôn ngữ, không bao giờ token); chưa có thì lấy theo `navigator.language`
  (`vi*` → vi, còn lại → en).

## 5. Phiên đăng nhập và chặn quyền

**Giữ token:** access token chỉ ở bộ nhớ của trang (biến JS), không lưu `localStorage`/`sessionStorage`. Refresh token là cookie
httpOnly do API đặt; JS không đọc được.

**Khởi động trang (mở mới hoặc F5):**
1. `POST /v1/auth/refresh` với `credentials: 'include'` và header `X-CSRF-Protection: 1`, body `{}`.
2. Thành công → `GET /v1/me` → có `staff_role`, `permissions`, `email_verified`.
3. Áp **luật cổng** (dưới). Refresh thất bại → màn `/login`.

**Luật cổng** (áp sau đăng nhập, sau khởi động, sau 403 `forbidden` — xem dưới, khi tab được focus lại):

| `staff_role` | `email_verified` | Hành động |
|---|---|---|
| `admin`/`editor` | — | Vào app; menu và nút theo `permissions` |
| `null` | `false` | Chuyển sang màn nhập OTP xác minh email (D12, ngoại lệ). Xác minh xong → đăng xuất → `/login` với "Email đã xác minh. Liên hệ admin để được cấp quyền." |
| `null` | `true` | `POST /v1/auth/logout` (kèm `X-CSRF-Protection: 1`) → xóa token trong bộ nhớ → `/login` với "Bạn không có quyền truy cập trang web này" (D12, D13) |

Server vẫn là lớp kiểm quyền thật: `PermissionGuard` đọc vai trò từ DB ở **mỗi** request (`permission.guard.ts:29-33`), nên gỡ
quyền có hiệu lực ngay ở server. Ẩn menu ở giao diện chỉ để gọn.

**401 khi gọi API:** refresh **một lần dùng chung** (nhiều request cùng nhận 401 thì cùng đợi một lượt refresh), rồi gửi lại
request gốc một lần. Refresh thất bại → `/login` với "Phiên đăng nhập đã hết hạn".

**403 khi gọi API — phân biệt theo `type`:**
- `forbidden` (từ `PermissionGuard`) có **hai nguyên nhân** trông giống hệt nhau: bị gỡ/hạ quyền, **hoặc** phiên đã bị thu hồi
  (đăng xuất ở thiết bị khác, đặt lại mật khẩu — `password.service.ts` gọi `revokeAllForUser`). Lý do: `AuthGuard` chỉ kiểm chữ
  ký JWT (`access-token.service.ts`, không đọc DB), còn `PermissionGuard` kiểm `session_chains.revoked_at` và trả 403, không 401
  (`permission.guard.ts:29-37`). `/me` không có `@RequirePermission` nên vẫn trả 200 với phiên đã thu hồi. Vì vậy giao diện
  **refresh trước** (dùng chung lượt refresh): thất bại → `/login` "Phiên đăng nhập đã hết hạn"; thành công → `/me` → luật cổng; còn
  vai trò nhưng request vẫn 403 → "Bạn không còn quyền làm thao tác này", vẽ lại menu.
- `profile-incomplete` (chỉ các route learner, `learner-content.guard.ts`) và `csrf-header-required` (lỗi lập trình): hiện câu
  tương ứng, **không** áp luật cổng.

**Đăng nhập:** `POST /v1/auth/login` `{ email, password, client: 'web', device_label: 'Wordmet Admin' }` → áp luật cổng.

**Đăng ký:** `POST /v1/auth/register` `{ email, password, timezone, client: 'web', device_label }`; `timezone` lấy từ
`Intl.DateTimeFormat().resolvedOptions().timeZone`. API cấp phiên và tự gửi mã OTP xác minh (`auth.service.ts:63-65`) → màn OTP.

**OTP xác minh:** `POST /v1/auth/verify-email` `{ code }` (cần access token). Gửi lại mã: `POST /v1/auth/otp`
`{ purpose: 'verify_email' }`.

**Quên mật khẩu:** `POST /v1/auth/otp` `{ purpose: 'reset_password', email }` → nhập mã và mật khẩu mới → `POST
/v1/auth/password/reset` `{ email, code, new_password }` (`password.schemas.ts`). Mật khẩu không đạt chính sách → 400
`validation-failed` kèm `violations` (`auth.service.ts`, `checkPasswordPolicy`); form đăng ký và đặt lại mật khẩu hiện danh sách đó
dưới ô mật khẩu.

**Đăng xuất:** `POST /v1/auth/logout` (kèm `X-CSRF-Protection: 1`) → xóa token → phát `{ type: 'logout' }` qua
`BroadcastChannel('wordmet-admin-auth')` → các tab khác nghe được thì xóa token và về `/login` (D14). Đăng nhập ở một tab cũng
phát `{ type: 'login' }`, để tab đang ở `/login` tự chạy lại bước khởi động.

## 6. Màn hình và luồng

Màn hình nào hiện tùy `permissions` từ `/me`. Bảng quyền là D6 của Bước 1 (`admin` và `editor` đều có các quyền `content.*`;
chỉ `admin` có `roles.manage`).

### 6.1 Tài khoản (công khai)

| Màn | Nội dung | API |
|---|---|---|
| Đăng nhập | Email, mật khẩu, link "Quên mật khẩu", link "Đăng ký"; vùng báo lỗi (gồm "không có quyền") | `auth/login`, `me`, `auth/logout` |
| Đăng ký | Email, mật khẩu | `auth/register` |
| Nhập OTP | Ô mã, "Gửi lại mã" (khóa đếm ngược khi 429) | `auth/verify-email`, `auth/otp` |
| Quên mật khẩu (2 bước) | Email → mã + mật khẩu mới | `auth/otp`, `auth/password/reset` |

### 6.2 Vai trò (`roles.manage`)

- Danh sách staff: email, vai trò, trạng thái xác minh; phân trang (`GET admin/staff`, `page_size`/`page_token`).
- Tìm theo email (`GET admin/users?email=`) → thẻ người dùng → chọn `editor` / `admin` / gỡ vai trò → hộp xác nhận →
  `PUT admin/users/:id/staff-role` `{ staff_role }`.
- Tự gỡ quyền admin của chính mình: hộp xác nhận cảnh báo riêng; thành công → đọc lại `/me` → luật cổng.

### 6.3 Nội dung — luồng CSV

| Màn | Quyền | Nội dung | API |
|---|---|---|---|
| Nguồn dữ liệu | `content.import` | Danh sách; form đăng ký nguồn (tên, phiên bản, URL, license, attribution, độ ưu tiên) | `GET/POST admin/content/sources` |
| Lô nhập | `content.import`; nút upload thêm `content.edit` | Danh sách lô (tên file, số dòng, trạng thái, thời điểm); form upload (file `.csv` ≤ 10 MB, chọn nguồn level nếu file có cột level) | `GET admin/content/uploads`, `POST admin/content/uploads` (multipart, `Idempotency-Key`) |
| Chi tiết lô | `content.import` | Trạng thái tự cập nhật; bộ đếm, cảnh báo; tải `rejected.csv`; "Publish lô này" (cần `content.publish`); "Hoàn tác lô" (cần thêm `content.edit`) | `GET .../uploads/:id`, `GET .../uploads/:id/rejected.csv`, `POST .../senses/publish-jobs` `{ filter: { batch_id } }`, `POST .../uploads/:id/revert` |
| Xuất CSV | `content.edit` | Bộ lọc: trạng thái, level, từ loại, topic (danh sách từ mục 7.3), lô → tải file | `GET admin/content/senses/export`, `GET admin/taxonomy/topics` |
| Publish job | `content.publish` | Danh sách (mới, mục 7); tạo job theo bộ lọc (level, topic, từ loại, lô); chi tiết job tự cập nhật; tải `report.csv` | `GET/POST .../senses/publish-jobs`, `GET .../publish-jobs/:id`, `GET .../publish-jobs/:id/report.csv`, `GET admin/taxonomy/topics` |

Level (A1–C2) và từ loại là danh sách cố định trong code API (`LEVELS`, `VALID_POS`); giao diện chép hai danh sách này thành hằng
số, plan ghi rõ nguồn để khi API đổi thì sửa theo.

**Tải file:** API cần `Authorization` nên không dùng link thường. Giao diện `fetch` → `Blob` → tạo link tạm và bấm thay người
dùng. Tên file do giao diện đặt: `rejected-<batch_id>.csv`, `publish-<job_id>.csv`, `senses-<yyyy-mm-dd>.csv`.

**`Idempotency-Key`:** mỗi lần người dùng gửi form upload, tạo publish job, hoặc xác nhận hoàn tác thì tạo một UUID mới
(`crypto.randomUUID()`). Gửi lại do lỗi mạng hoặc 409 "đang xử lý" thì giữ **cùng** key. Nội dung form đổi thì tạo key mới.

**Polling:** chi tiết lô và chi tiết job hỏi lại mỗi 2 giây khi trạng thái là `queued`/`running`; ra trạng thái kết thúc
(`succeeded`, `partial`, `failed` — `background-jobs.service.ts`, hàm `finish`) thì dừng (`refetchInterval` dạng hàm trả `false`, docs TanStack Query qua context7). Tab ẩn thì không hỏi (mặc định
`refetchIntervalInBackground: false`).

## 7. Thay đổi backend (`apps/api`)

### 7.1 CORS (`src/app.setup.ts`)

```ts
allowedHeaders: ['Authorization', 'Content-Type', 'X-CSRF-Protection', 'Idempotency-Key'],
exposedHeaders: ['Retry-After'],
```

Lý do: upload, tạo publish job và hoàn tác bắt buộc `Idempotency-Key` (`idempotency.interceptor.ts:38-40`). Danh sách cũ không
có header này, và thư viện `cors@2.8.6` trả đúng danh sách cấu hình, không phản chiếu header được hỏi (đã đọc
`lib/index.js`). Theo chuẩn Fetch, trình duyệt sẽ chặn request; **chưa chạy thử trên trình duyệt**, B25#12 kiểm bằng API thật.
`Retry-After` mở ra để giao diện đọc được số giây chờ khi 429/409. Không mở `Content-Disposition` (tên file do giao diện đặt).

### 7.2 `GET /v1/admin/content/senses/publish-jobs`

Thêm vào `src/content-pipeline/publish/publish-jobs.controller.ts`, kế thừa `@RequirePermission('content.publish')` của
controller. Chép đúng mẫu `GET admin/content/uploads` (`uploads-read.controller.ts`):
- Query `page_size` (1–100, mặc định 20), `page_token`.
- Sắp `job.createdAt desc, id asc`; con trỏ `{ created_at, id }` mã hóa bằng `encodeBoundToken` với binding riêng
  `{ route: 'publish-jobs', filters: {} }`.
- Mỗi mục: `id, status, filter, snapshot_count, not_ready_count, counters, created_at, started_at, finished_at`.
- Không trả người tạo (D3 của Bước 2: muốn lấy email phải gọi `IdentityService`; màn hình chưa cần).

Route không đụng `GET .../senses/:id` vì `:id` đã giới hạn dạng UUID từ Bước 2 (`docs/deliveries/buoc-2.md`); B25#15 khẳng định.

### 7.3 `GET /v1/admin/taxonomy/topics` (D17)

Lý do: bộ lọc topic cần danh sách. `GET /v1/topics` gắn `@LearnerContent()` nên staff chưa đặt `native_language` nhận 403
`profile-incomplete` (`learner-content.guard.ts`); controller quản trị chỉ có `POST`/`PATCH`.

- Thêm `@Get()` vào `TopicsController` (`src/content/taxonomy/topics.controller.ts`), kế thừa `@RequirePermission('taxonomy.manage')`
  (D6 Bước 1: `admin` và `editor` đều có).
- Trả `{ items: TopicView[] }` — đúng kiểu `TopicView` đã có (`code`, `names: { vi?, en? }`, `archived_at`), **gồm cả topic đã
  lưu trữ**, sắp theo `code`. Giao diện hiện tên theo ngôn ngữ đang chọn (thiếu thì `en`, rồi `code`) và đánh dấu topic đã lưu trữ.
- Không phân trang, theo tiền lệ `GET /v1/topics` (số topic nhỏ, do staff tự tạo). Nếu sau này cần phân trang thì khi không gửi
  `page_size` vẫn phải trả đủ danh sách như cũ, để không làm hỏng giao diện admin đang dùng.

## 8. Xử lý lỗi ở giao diện

Mọi lỗi API là Problem Details (`type, status, title, detail, operation_id`, đôi khi `violations`). Giao diện tra `type` ra câu
vi/en; `type` không có trong bảng → "Có lỗi xảy ra" kèm **mã lỗi** `operation_id` để tra log API. Các `type` hiện có trong
`apps/api/src` (đếm 14/10/2026, ~30 loại; plan lấy danh sách đủ từ code) gồm: `invalid-credentials`, `email-taken`, `invalid-otp`,
`email-already-verified`, `staff-role-rule`, `not-found`, `validation-failed`, `rate-limited`, `file-invalid`, `file-too-large`,
`payload-too-large`, `level-source-required`, `source-incomplete`, `source-exists`, `nothing-to-publish`, `batch-not-revertable`,
`batch-filter-unavailable`, `export-too-large`, `idempotency-key-abandoned`, `csrf-header-required`, `mail-unavailable`,
`invalid-token`, `forbidden`.

| Khi | Giao diện làm gì |
|---|---|
| 401 | Refresh dùng chung → gửi lại một lần (mục 5) |
| 403 | Theo `type` (mục 5): `forbidden` → refresh trước, rồi `/me` → luật cổng; loại khác → hiện câu, không áp luật cổng |
| 429 | Đọc `Retry-After`; khóa nút kèm đếm ngược |
| 400 `validation-failed` | Form đã tự kiểm trước khi gửi (zod, cùng giới hạn với API: email ≤ 320, `.csv` ≤ 10 MB…); lỗi server còn lọt → hiện danh sách `violations` ở đầu form |
| 409 "đang xử lý" (không có `type`, có `Retry-After`) | "Yêu cầu trước vẫn đang chạy"; tự gửi lại sau `Retry-After` giây với cùng key |
| 409 `idempotency-key-abandoned` | Tạo key mới, báo người dùng bấm lại |
| 400 "Idempotency-Key reused with a different payload" | Lỗi lập trình (key không được đổi theo form); hiện mã lỗi |
| Mất mạng / API tắt | Dải "Không kết nối được máy chủ" + "Thử lại"; giữ dữ liệu đang hiển thị |
| Lô `queued` quá 30 giây | Hiện thời gian chờ và gợi ý "Worker có đang chạy không?" (`ASSUMPTION` 30 giây, theo chu kỳ reconciler 30 giây của Bước 2) |

## 9. Giao diện: hướng thiết kế và Figma (M0)

**Hướng (D15)**, rút từ số đo shadcn/ui, GitHub, Atlassian, Stripe (`ADMIN_UI_REFERENCES_2026-10-14.md`):
- Bố cục: sidebar trái + thanh trên (tiêu đề trang, đổi VI/EN, menu tài khoản). Dưới `64rem` sidebar thành ngăn kéo mở bằng ☰.
- Mật độ: chữ nền nhỏ hơn landing, nút/ô nhập thấp hơn; tăng cỡ khi thiết bị cảm ứng.
- Thương hiệu: token màu và font Be Vietnam Pro của landing (`apps/web/src/app/globals.css`); đỏ `--color-danger` cho thao tác phá
  hủy (hoàn tác lô, gỡ vai trò); bo góc nhỏ hơn landing.
- Đăng nhập/đăng ký/OTP: thẻ giữa trang, logo ở trên.

**Kích thước động (D16).** Không dùng px cố định trong code; quy tắc W15 của landing áp nguyên:

| Thứ | Giá trị |
|---|---|
| Chữ nền UI | `0.875rem` |
| Lưới khung | `grid-template-columns: minmax(14rem, 16rem) 1fr` |
| Thanh trên | `min-height: 3.5rem` |
| Nút / ô nhập | `min-height: 2rem`; `2.75rem` khi `@media (pointer: coarse)` |
| Thẻ đăng nhập | `width: min(100% - 2rem, 25rem)` |
| Khoảng đệm vùng nội dung | `clamp(1rem, 2vw, 2rem)` |
| Bảng → thẻ xếp dọc | container query theo bề rộng khung chứa bảng (ngưỡng plan chốt theo Figma) |
| Sidebar → ngăn kéo | dưới `64rem` |
| Chiều cao | không đặt chiều cao cố định |

**M0 — Figma.** File: https://www.figma.com/design/coVHzJwTFgMbooUrty7sOq (Drafts của chủ dự án; đã tạo 4 trang rỗng
`Cover`, `Tài khoản`, `Vai trò`, `Nội dung — CSV`). Đã kiểm 14/10/2026: MCP Figma ghi được vào tài khoản (gói student, ghế Full),
font Be Vietnam Pro có sẵn.
- Token khai báo bằng biến Figma, ghi giá trị rem tương ứng với gốc 16px. Mọi khung dùng auto layout (Fill/Hug) với min/max
  width, không khung kích thước cố định.
- Vẽ bản vi ở bề rộng mẫu 1440 và 390; kéo thử 1024 và 768 để kiểm co giãn. Bản en chỉ khác chữ, không vẽ riêng.
- Danh sách khung: mọi màn ở mục 6.1–6.3, mỗi màn có trạng thái rỗng, đang tải, lỗi; chi tiết lô và chi tiết job thêm
  `queued` / `running` / `succeeded` / `partial` / `failed` / kẹt `queued`; đăng nhập thêm lỗi "không có quyền".
- Code chỉ bắt đầu (M2) khi chủ dự án duyệt Figma. Lúc code, đọc lại Figma để lấy chữ và số đo (như landing); chữ trong
  `messages/vi.json` lấy từ Figma lúc triển khai.

## 10. Mốc, kiểm thử, CI

```
M0 Figma ─────────────┐   Claude dựng, chủ dự án duyệt; song song với M1
M1 Backend ───────────┤   mục 7 (merge vào dev được độc lập)
                      ▼
M2 apps/admin: khung app, phiên, chặn quyền, tài khoản, vai trò, CI job `admin`
M3 apps/admin: luồng CSV, CI job `admin-e2e-real`, "Xong khi" chạy tay
```

| Loại test | Công cụ | Phạm vi |
|---|---|---|
| Unit/component | Vitest + Testing Library + `msw` | Luật cổng, refresh dùng chung, bảng câu lỗi, quy tắc `Idempotency-Key`, polling dừng, `BroadcastChannel`, kiểm `VITE_API_BASE_URL` |
| E2E API giả | Playwright (`page.route`) + axe | Mọi màn ở 1440 và 390; 429; lô kẹt; mất mạng |
| E2E API thật | Playwright với API + worker + Postgres + Redis + Mailpit thật | 4 luồng: (1) đăng ký → OTP từ Mailpit → xác minh; (2) admin cấp `editor` → editor vào được, learner bị chặn; (3) upload CSV có 1 dòng lỗi → báo cáo → `rejected.csv` → publish lô → job xong, có trong danh sách → hoàn tác; (4) hai tab refresh cùng lúc, đăng xuất tab A → tab B về `/login` |
| Backend (M1) | Vitest + e2e Testcontainers hiện có | Mở rộng test CORS D13 trong `test/app-setup.e2e-spec.ts`; e2e cho hai `endpoint` mới (mục 7.2, 7.3) |

**CI (`.github/workflows/ci.yml`, chạy trên pull request như hiện nay):**
- Job `admin`: install, lint, typecheck, unit, build, e2e API giả.
- Job `admin-e2e-real`: service Postgres, Redis, Mailpit; `pnpm db:setup`; build và chạy API + worker; build admin, phục vụ bằng
  `vite preview`; chạy 4 luồng thật. **Ước tính** thêm 5–8 phút mỗi PR, chưa đo.
- Job `api` hiện có tự chạy test mới của M1.

## 11. Acceptance criteria — «When … then …»

| # | Criterion | Test |
|---|---|---|
| B25#1 | When a user with a staff role logs in, then the app shell shows only the menu entries their `permissions` allow (`editor` sees no "Vai trò") | e2e giả |
| B25#2 | When a user whose `staff_role` is null and `email_verified` is true logs in, then `POST /auth/logout` is called, no access token remains in memory, and `/login` shows "Bạn không có quyền truy cập trang web này" (en: "You do not have access to this site") | unit + e2e thật |
| B25#3 | When a user whose `staff_role` is null and `email_verified` is false logs in, then the OTP screen opens; after a correct code the session is logged out and `/login` shows the "đã xác minh, liên hệ admin" message | e2e thật |
| B25#4 | When a page loads and the refresh cookie is valid, then the user lands in the app without typing a password; when it is missing or invalid, then `/login` opens | e2e thật |
| B25#5 | When several requests receive 401 at once, then exactly one refresh request is sent and each original request is retried once | unit |
| B25#6 | When an API call returns 403 `forbidden`, then the app refreshes first: if the refresh fails, `/login` shows the session-expired message; if it succeeds and `/me` shows `staff_role` null, the user is logged out and sent to `/login` with the no-access message; if `/me` still shows a role, the menu is redrawn from the new `permissions`. When a 403 has another `type` (`profile-incomplete`, `csrf-header-required`), the gate rule is not applied | unit + e2e thật |
| B25#6a | When the user's session is revoked elsewhere (password reset, logout on another device) while the admin tab holds a still-valid access token, then the next admin call (403 `forbidden`) ends at `/login` with the session-expired message, not the "không còn quyền" message | e2e thật |
| B25#7 | When the tab regains focus, then `/me` is fetched again and the gate rule is applied | unit |
| B25#8 | When the user logs out in tab A, then tab B clears its token and shows `/login` without any user action | unit + e2e thật |
| B25#9 | When an `admin` grants `editor` to a verified user found by email, then the staff list shows that user as `editor` and that user can log in to the app | e2e thật |
| B25#10 | When granting a role fails with `staff-role-rule` (unverified target, or removing the last admin), then a specific message is shown and the list is unchanged | e2e giả |
| B25#11 | When an upload is submitted, then the request carries a fresh `Idempotency-Key`; when it is retried after a network error, then the same key is sent; when the file or level source changes, then a new key is generated | unit |
| B25#12 | When the admin app at `http://localhost:5173` uploads a CSV to the real API, then the CORS preflight succeeds and the batch is created (202) | e2e thật |
| B25#13 | When a batch or publish job is `queued` or `running`, then its detail page refreshes about every 2 seconds and stops at a terminal status | unit |
| B25#14 | When a batch has rejected rows, then "Tải rejected.csv" downloads a file named `rejected-<batch_id>.csv` whose content equals the API response | e2e thật |
| B25#15 | When `GET /v1/admin/content/senses/publish-jobs` is called with three jobs and `page_size=2`, then the first page has the two newest jobs and a `next_page_token`, the second page has the oldest job and `next_page_token: null`, with no job repeated | e2e API |
| B25#16 | When the publish-jobs list receives a `page_token` minted by the uploads list or a malformed token, then it answers 400 `validation-failed` | e2e API |
| B25#17 | When a preflight asks for `Idempotency-Key`, then `Access-Control-Allow-Headers` includes it; when it asks for an unlisted header, then that header is not allowed; and responses carry `Access-Control-Expose-Headers: Retry-After` | e2e API |
| B25#17a | When `GET /v1/admin/taxonomy/topics` is called by an `editor` who has no `native_language`, then it returns 200 with every topic, archived ones included with `archived_at` set, ordered by `code`; a learner gets 403 `forbidden` | e2e API |
| B25#18 | When an API call returns 429 with `Retry-After: N`, then the triggering button is disabled with an N-second countdown | e2e giả |
| B25#19 | When an API error has an unknown `type`, then the message shows the generic text and the `operation_id` | unit |
| B25#20 | When a production build has `VITE_API_BASE_URL` whose host does not start with `admin-api.`, then the build fails with a message naming the variable | unit (script build) |
| B25#21 | When the viewport is narrower than `64rem`, then the sidebar is hidden behind a ☰ button that opens it as a drawer; every screen passes axe with no serious or critical violations at 390 and 1440 wide | e2e giả |
| B25#22 | When the language switch is set to EN, then all UI text comes from `messages/en.json` and the choice survives a reload | e2e giả |

## 12. Edge cases

| # | When | Then |
|---|---|---|
| B25E1 | Hai tab refresh cùng lúc khi access token hết hạn | Cả hai còn phiên nhờ cơ chế grace của Bước 1 (`REFRESH_GRACE_KEY`). **ASSUMPTION**, kiểm ở luồng thật (4) |
| B25E2 | Chạy `http://localhost` (không HTTPS) | Cookie `Secure; SameSite=Strict` vẫn được đặt và gửi, vì trình duyệt coi localhost là secure context và khác cổng vẫn cùng site. **ASSUMPTION**, kiểm ở luồng thật (1) |
| B25E3 | Learner đã đăng nhập ở `app.` (sau này) mở `admin.` | Không có phiên ở `admin.` (cookie host-only trên `api.` không gửi sang `admin-api.`, L5) → màn đăng nhập |
| B25E4 | Người dùng là admin cuối cùng tự gỡ vai trò | API từ chối `staff-role-rule`; giao diện báo "Không thể gỡ admin cuối cùng" |
| B25E5 | Admin tự hạ mình xuống `editor` (còn admin khác) | Thành công → đọc lại `/me` → menu bỏ mục "Vai trò", đang ở trang Vai trò thì chuyển về trang đầu |
| B25E6 | Đang mở chi tiết lô thì bị gỡ quyền | Lần polling kế tiếp nhận 403 → luật cổng → đá ra |
| B25E7 | Tab bỏ yên khi bị gỡ quyền | Không bị đá ngay (API không đẩy tin); bị đá khi tab được focus, polling, hoặc thao tác kế tiếp. Server đã chặn mọi thao tác từ lúc gỡ |
| B25E8 | Quên chạy `pnpm start:worker` | Lô đứng `queued`; sau 30 giây hiện gợi ý worker (mục 8) |
| B25E9 | Upload file `.csv` > 10 MB hoặc không phải `.csv` | Giao diện chặn trước khi gửi; nếu vẫn tới API thì hiện câu cho `file-too-large`/`file-invalid` |
| B25E10 | Publish lô không còn gì để publish | API trả 400 `nothing-to-publish`; giao diện báo "Không có mục nào đủ điều kiện publish" |
| B25E11 | Hoàn tác lô đã hoàn tác hoặc không hoàn tác được | `batch-not-revertable` → hiện lý do; nút ẩn khi `reverted: true` |
| B25E12 | Xuất CSV vượt 5.000 dòng (`EXPORT_MAX_ROWS`) | `export-too-large` → gợi ý thu hẹp bộ lọc |
| B25E13 | Trình duyệt chặn `BroadcastChannel` (hiếm) | Bỏ qua lặng lẽ; tab kia vẫn bị đá ở lần gọi API tiếp theo (401 → refresh thất bại) |
| B25E14 | Đăng ký với email đã có | `email-taken` → câu "Email đã được dùng"; link sang đăng nhập |
| B25E15 | Gửi lại OTP quá nhanh | 429 → nút "Gửi lại mã" đếm ngược theo `Retry-After` |
| B25E16 | `mail-unavailable` khi đăng ký hoặc gửi lại OTP | Báo "Không gửi được email, thử lại sau". Lúc đăng ký, API kiểm hạn mức mail **trước** khi tạo tài khoản (`auth.service.ts`, `budget.assertAvailable()`), nên chưa có tài khoản nào được tạo; người dùng đăng ký lại sau. Mail OTP gửi sau khi trả response (`afterResponse`), nên nếu gửi thất bại lúc đó thì tài khoản đã có, màn OTP cho "Gửi lại mã" |
| B25E17 | Hai job publish tạo cùng `created_at` | Thứ tự theo `id`, không trùng giữa hai trang (B25#15) |
| B25E18 | Đang lật trang danh sách publish job thì job mới được tạo | Trang sau không lặp và không mất; job mới chỉ hiện khi tải lại trang đầu |
| B25E19 | Learner đã có đủ 10 phiên (trần Bước 1) cố đăng nhập `admin.` | API mở phiên mới và **thu hồi phiên cũ nhất** của họ (`session.service.ts`, `startChain`), rồi giao diện đăng xuất phiên mới → learner mất một thiết bị cũ. Chấp nhận: hiếm, và chặn trước khi tạo phiên đòi đổi API |
| B25E20 | Staff đăng nhập cả `app.` (sau này) và `admin.` | Hai chuỗi phiên, tính 2 trong trần 10 thiết bị (trường hợp biên của L5) |
| B25E21 | File có cột level mà không chọn nguồn level | Giao diện đọc dòng header của file ngay trên trình duyệt; có cột `level` thì bắt chọn nguồn. Vẫn lọt tới API → `level-source-required` |
| B25E22 | Chọn nguồn level thiếu phiên bản hoặc license | API trả `source-incomplete`; form đăng ký nguồn ghi rõ hai ô này bắt buộc nếu nguồn dùng làm nguồn level |
| B25E23 | OTP sai quá số lần cho phép | API trả 429 `rate-limited` kèm `Retry-After` (`otp.service.ts`, `locked`) → ô mã và nút bị khóa có đếm ngược |

## 13. Tài liệu cần cập nhật sau khi duyệt

- `docs/HANDOFF_2026-10-05_BUOC_0.md` §2: dòng Bước 2.5 — có design (doc này), phạm vi theo D2, chạy local (D4); thêm một dòng
  "Deploy API + admin" là bước riêng chưa xếp chỗ.
- `CLAUDE.md`: mục "Current phase"/"Next" — Bước 2.5 có design; dòng Bước 2.5 trong "Architecture & Key Decisions".
- Sau khi plan xong: `docs/deliveries/buoc-2-5.md` (plan tóm tắt, rule `plan-summaries.md`).
- `docs/specs/` không sửa.

## 14. Ngoài phạm vi Bước 2.5

Deploy API, `admin-api.`, `admin.` (bước riêng; cần chọn hosting backend, Postgres/Redis bền, SMTP thật, secret, backup); soạn và
duyệt từng sense; quản lý entry/variant/level/topic; publish theo danh sách chọn tay; đổi mật khẩu khi đang đăng nhập; quản lý
thiết bị/phiên; dark mode; email người tạo publish job; theo dõi lỗi giao diện bên ngoài (Sentry…); app learner `app.` (Bước 3).

## 15. Rủi ro và việc còn mở

~~**Chờ bạn:** nguồn danh sách topic cho bộ lọc~~ **Đã chốt 14/10/2026 (D17):** thêm `GET /v1/admin/taxonomy/topics` (mục 7.3).

- **Ba `ASSUMPTION` chỉ kiểm được ở M2/M3:** cookie trên `http://localhost` (B25E2), refresh song song (B25E1), ngưỡng 30 giây
  cho lô kẹt (mục 8).
- **CORS chặn `Idempotency-Key`** mới khẳng định bằng đọc code `cors@2.8.6` và chuẩn Fetch, chưa chạy trên trình duyệt; B25#12 là
  chỗ kiểm.
- **Responsive đầy đủ** làm công Figma và test e2e tăng khoảng gấp đôi (ước tính).
- **Job CI thật** làm mỗi PR chạy lâu hơn (ước tính 5–8 phút, chưa đo).
- **Plugin Tailwind cho Vite** (`@tailwindcss/vite`) chưa kiểm phiên bản; plan kiểm.
- **Hai app web dùng chung token** bằng cách chép (`apps/web` → `apps/admin`), có thể lệch về sau. Tách package dùng chung để sau
  nếu lệch thật.
- **Deploy chưa có chỗ trong thứ tự bước**; Bước 3 (pilot) cần deploy, nên phải xếp trước pilot.
- **Rate limit chặn test e2e thật:** đăng ký giới hạn 5 lần/giờ/IP, mail 20/ngày/IP (`DEFAULT_LIMITS` trong `app-config.ts`,
  không đổi được bằng biến môi trường). Bốn luồng thật phải đăng ký **tổng cộng ≤ 5 tài khoản mỗi lần chạy**, không retry đăng ký;
  tài khoản phụ (learner bị chặn, admin) tạo bằng script seed hoặc CLI, không qua `auth/register`. Thử tay nhiều lần trong một giờ
  cũng sẽ chạm trần này.
- **Chi phí Cloudflare cho Worker thứ hai: 0 đồng** (docs Workers limits/pricing qua context7, 14/10/2026): gói Free cho 100
  Worker/tài khoản; request vào file tĩnh "free and unlimited" và không tính vào 100.000 request/ngày. Dùng chung với landing:
  3.000 phút Workers Builds/tháng và **1 build chạy cùng lúc** (build landing và admin xếp hàng). Tài khoản đang ở gói Free là
  `ASSUMPTION` (suy từ DP2 của design deploy landing, chưa xem dashboard). Chi phí thật của bước deploy nằm ở API + Postgres + Redis.
