# Decisions — Bước 2.5: Giao diện web quản trị (`apps/admin`)

Ngày: 14/10/2026. Đi kèm design doc
[`../specs/2026-10-14-buoc-2-5-admin-web-design.md`](../specs/2026-10-14-buoc-2-5-admin-web-design.md).
File này gom các quyết định trong phiên brainstorm 14/10/2026: mỗi quyết định có các phương án đã trình bày trong chat, trade-off,
phương án được chọn. Design doc mô tả *cách làm*; file này trả lời *tại sao chọn vậy và đã bỏ gì*.

**Nhãn:** ✅ = phương án được chọn. **Ai chốt:** "Chủ dự án" = chọn trực tiếp trong chat; "Chủ dự án (ok)" = trợ lý đề xuất và chủ
dự án trả lời "ok"; "Chủ dự án (yêu cầu)" = chủ dự án tự đưa ra yêu cầu, không phải chọn từ phương án.

## Tóm tắt

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| D1 | Chỗ đặt code `admin.` | App riêng `apps/admin` | Chủ dự án (sau 5 vòng) |
| D2 | Phạm vi màn hình | Đăng nhập + cấp vai trò + luồng CSV | Chủ dự án |
| D3 | Stack | Vite + React SPA | Chủ dự án (sau 4 vòng giải thích) |
| D4 | Deploy | Chạy local; deploy là bước riêng | Chủ dự án |
| D5 | Màn hình tài khoản | Đăng nhập/xuất + đăng ký + OTP + quên mật khẩu | Chủ dự án |
| D6 | Ngôn ngữ | vi + en | Chủ dự án (khác đề xuất) |
| D7 | Cách thiết kế giao diện | Figma trước, rồi code | Chủ dự án (khác đề xuất) |
| D8 | Trình tự Figma | Design doc → Claude dựng Figma → duyệt → code | Chủ dự án |
| D9 | Thiết bị | Responsive đầy đủ | Chủ dự án (khác đề xuất) |
| D10 | Test e2e | Đa số API giả, vài luồng chính API thật | Chủ dự án |
| D11 | Sửa backend | CORS + `endpoint` liệt kê publish job | Chủ dự án (khác đề xuất) |
| D12 | Người không có vai trò đăng nhập | Chặn ngay ở đăng nhập; chưa xác minh email thì sang màn OTP | Chủ dự án (yêu cầu) + Chủ dự án (ok) |
| D13 | Learner còn phiên vào trang admin | Đá về `/login` kèm thông báo | Chủ dự án (yêu cầu) |
| D14 | Đồng bộ đăng xuất giữa tab | `BroadcastChannel` | Chủ dự án |
| D15 | Hướng giao diện | Sidebar + thanh trên, mật độ cao, giữ thương hiệu landing | Chủ dự án (ok) |
| D16 | Đơn vị kích thước | Động (rem, `clamp()`, `minmax()`, container query) | Chủ dự án (yêu cầu) |
| D17 | Nguồn danh sách topic cho bộ lọc | Thêm `GET /v1/admin/taxonomy/topics` | Chủ dự án (phát sinh ở phiên review) |

**Kế thừa, không hỏi lại** (`2026-10-08-landing-page-decisions.md`): **L8** bố cục subdomain `<domain>` / `app.` / `admin.` /
`api.` (chủ dự án); **L5** `admin.` gọi host riêng `admin-api.<domain>` trỏ vào cùng API để cookie phiên không ghi đè nhau
(chủ dự án).

## D1 — Chỗ đặt code `admin.`

Bối cảnh: `apps/web` hiện chỉ là landing, ràng buộc chặt (`/vi`, `/en` bắt buộc build tĩnh — `assert:static`; Cloudflare Workers qua
OpenNext; Next ghim `16.3.8`; mọi push vào `main` tự deploy landing). Bước 3 cũng cần web cho learner.

**Vòng 1** — trợ lý hỏi đặt giao diện đăng nhập + admin (và app learner Bước 3) ở đâu:

| Phương án | Trade-off |
|---|---|
| App riêng `apps/app` (đề xuất) | Landing giữ nguyên; deploy riêng; app learner Bước 3 vào chung. Tốn thêm một app (tooling, deploy), chép một phần token/component |
| Mở rộng landing `apps/web` | Dùng chung tooling, i18n, component, một lần deploy. Route có đăng nhập trộn với trang tĩnh; sửa admin là deploy lại landing; phải chặn index admin; vẫn bị ghim Next |
| App riêng chỉ cho admin | Cô lập nhất cho admin; có thể thành 3 app web (landing, admin, learner) |

Chủ dự án: "đợt mình có chốt `admin.<domain>`, kiểm tra lại". Trợ lý tìm thấy L8 và L5 (trên), cùng đề xuất chưa chốt ngày 08/10
trong `docs/preparation/LANDING_PAGE_CONTEXT_2026-10-07.md` §10.2: `admin.` là `apps/admin`, `app.` chạy từ `apps/web` chọn trang
theo host.

**Vòng 2** — code `admin.` nằm ở đâu:

| Phương án | Trade-off |
|---|---|
| ✅ App riêng `apps/admin` (đề xuất) | Code quản trị không lọt bundle landing/learner; URL API riêng cấu hình độc lập; deploy admin không đụng landing. Thêm một project |
| Chung `apps/web`, tách theo host | Dùng chung mọi thứ, một lần deploy. Code admin chung bundle/deploy với landing; hai URL API trong một app dễ nhầm |

Chủ dự án chọn `apps/admin`, rồi khi sang câu stack thì xin quay lại: nghiên cứu cách các công ty dựng `*.<domain>` (ví dụ OptiSigns).

**Vòng 3 — tra DNS OptiSigns** (`nslookup` qua 8.8.8.8, chủ IP qua RDAP ARIN, 14/10/2026): `optisigns.com`/`www.` → Webflow
(`www` CNAME `cdn.webflow.com`); `app.` và `qa3c.` → Cloudflare (header `Server: cloudflare`); `api.` → DigitalOcean
(`206.189.255.219`); `qa1.` và tên ngẫu nhiên → không tồn tại (không dùng wildcard). Kết luận: mỗi subdomain là một bản ghi DNS
riêng trỏ tới chỗ chạy riêng. Với Wordmet: `wordmet.com` đã ở Cloudflare DNS, landing gắn bằng Custom Domain trong
`apps/web/wrangler.jsonc`; `admin.wordmet.com` chỉ thêm một dòng tương tự. Tên subdomain độc lập với cách chia code.

**Vòng 4** — chủ dự án hỏi "trade off là gì". Trợ lý tự sửa một lý do yếu: Next.js tách JS theo route, nên "code admin không lọt
bundle landing" không đúng nếu chung app. Bảng trade-off thật:

| Khía cạnh | `apps/admin` riêng | Chung `apps/web` |
|---|---|---|
| Deploy | Sửa admin chỉ deploy admin | Mỗi lần sửa admin là build + deploy lại landing; lỗi build admin chặn bản sửa landing |
| Cấu hình API | Một app, một host `admin-api.` | Hai URL API trong một app; trỏ nhầm thì cookie ghi đè quay lại (rủi ro L5) |
| Ràng buộc kỹ thuật | Tự chọn stack | Mang theo ghim Next, `assert:static`, `proxy.ts` phải tách nhánh theo host, `robots`/`sitemap` phải loại `admin.` |
| Công dựng | Setup tooling, thêm project Cloudflare, thêm job CI, chép token/component | Dùng lại ngay |
| Kiểm soát truy cập sau này | Khóa riêng cả host `admin.` được | Khóa theo host trong cùng project |

**Vòng 5** — chủ dự án hỏi cấu hình Cloudflare. Trợ lý tra docs Cloudflare Workers (context7): Custom Domain tự tạo DNS và chứng
chỉ; Worker chỉ có file tĩnh dùng `assets.not_found_handling: "single-page-application"`. Nêu thêm: `admin-api.` cần chỗ chạy NestJS,
mà API chưa deploy ở đâu (dẫn tới D4). Chủ dự án chốt **`apps/admin` riêng**.

## D2 — Phạm vi màn hình

Bối cảnh: `roles.manage` chỉ `admin` có (D6 Bước 1), nên chỉ làm cấp vai trò thì `editor` vào `admin.` không có việc; D9 Bước 2 nhắc
"trang admin" trong ngữ cảnh soạn nội dung; chủ dự án dùng Excel là chính (D9-C Bước 2). Bước 2 có 47 endpoint quản trị.

| Phương án | Trade-off |
|---|---|
| ✅ Đăng nhập + cấp vai trò + luồng CSV (đề xuất) | Phần khó làm bằng curl nhất (multipart, theo dõi job); editor có việc. Soạn từng sense, taxonomy để sau. Bước lớn hơn ~gấp đôi (ước tính) |
| Chỉ đăng nhập + cấp vai trò | Nhỏ nhất; nội dung vẫn bằng curl; editor chưa làm được gì |
| Admin đầy đủ | Phủ gần hết 47 endpoint; phình bước, đẩy Bước 3 (pilot) lùi xa |

## D3 — Stack

Bối cảnh: cookie phiên nằm trên host API, server của `admin.` không thấy phiên; mọi dữ liệu do trình duyệt gọi API.

| Phương án | Trade-off |
|---|---|
| ✅ Vite + React SPA (đề xuất) | Chỉ file tĩnh, khớp cấu hình Worker assets-only; vẫn React + Tailwind + Vitest + Testing Library + Playwright như landing; không bị ghim Next. Khác framework với `apps/web`; tự chọn thư viện routing |
| Next.js static export | Cùng framework landing, build ra file tĩnh; mất phần lớn tính năng Next (server, middleware, route động cần `generateStaticParams`) mà vẫn mang độ phức tạp |
| Next.js + OpenNext Workers | Giống pipeline landing; có server nhưng server không dùng được phiên; thêm OpenNext và ghim Next |

Các vòng giải thích theo yêu cầu chủ dự án: (1) giải thích ba phương án bằng ví dụ mở `admin.wordmet.com/users`; (2) "vẫn gọi API
của worker hay server chính?" → Worker chỉ đưa file giao diện, trình duyệt gọi thẳng NestJS qua `admin-api.`; (3) "có scale up gì
không?" → docs Cloudflare: "Requests to static assets are free and unlimited"; tải thật nằm ở NestJS, giống nhau ở cả ba phương
án; thêm tính năng là thêm màn hình gọi API; khi cần server phía trước (ví dụ BFF) có thể gắn code Worker chạy trước file tĩnh
(`run_worker_first`) mà không viết lại giao diện. Chủ dự án chốt **Vite + React SPA**.

## D4 — Deploy

Bối cảnh: `admin-api.` phải trỏ tới NestJS chạy thật; hosting backend "Chưa chọn" (`LEGAL_PAGES_RESEARCH_2026-10-11.md`); Bước 0–2
chỉ chạy local.

| Phương án | Trade-off |
|---|---|
| ✅ Không, chạy local; deploy là bước riêng (đề xuất) | Bước 2.5 xong khi admin chạy local đủ luồng; `wrangler.jsonc` viết sẵn chưa deploy; deploy API là design riêng trước pilot Bước 3. Nội dung nhập bây giờ ở DB local, phải nhập lại lên prod (CSV nhập lại an toàn nhờ prefilter) |
| Có, gộp vào Bước 2.5 | `admin.wordmet.com` dùng thật khi xong; bước phình với cả loạt quyết định hạ tầng không liên quan giao diện |
| Deploy API trước, rồi mới làm 2.5 | Lùi giao diện; quyết định hosting làm sớm khi chưa có người dùng |

## D5 — Màn hình tài khoản

Bối cảnh: chỉ cấp được vai trò cho người đã xác minh email (`staff.service.ts:67`); app learner chưa có; admin đầu tiên tạo bằng
CLI `pnpm admin:grant`.

| Phương án | Trade-off |
|---|---|
| ✅ Đăng nhập/xuất + đăng ký + OTP + quên mật khẩu (đề xuất) | Editor tương lai tự đăng ký và xác minh trên `admin.`; không ai dùng curl; API đã đủ. Thêm ~4 màn; learner cũng đăng ký được qua `admin.` (vào thì bị chặn) |
| Chỉ đăng nhập/đăng xuất | Nhỏ nhất; editor mới phải đăng ký + xác minh bằng curl hoặc chờ Bước 3 |
| Đăng nhập/xuất + đổi mật khẩu | Không có đăng ký; editor mới vẫn cần curl |

## D6 — Ngôn ngữ

Chủ dự án hỏi thư viện i18n và `next-intl` là gì; trợ lý giải thích bằng ví dụ `messages/vi.json`/`en.json` và `t('…')` của landing.
Trợ lý ban đầu nói `next-intl` không dùng được ngoài Next; **sửa lại** sau khi tra docs (context7): lõi `use-intl` (`4.14.9`, cùng số
với `next-intl` của landing) chạy trong React thường với `IntlProvider` + `useTranslations`.

| Phương án | Trade-off |
|---|---|
| Chỉ tiếng Việt (đề xuất) | Không thư viện; chữ gom một file để sau thêm en dễ |
| ✅ vi + en | Sẵn sàng cho editor không nói tiếng Việt; thêm thư viện i18n, mọi câu viết hai lần |
| Chỉ tiếng Anh | Khớp tên trường/endpoint; khác thói quen báo cáo tiếng Việt |

## D7 — Cách thiết kế giao diện

| Phương án | Trade-off |
|---|---|
| Token landing + bộ component có sẵn, không Figma (đề xuất) | Nhanh, đủ cho công cụ nội bộ; trông "chuẩn admin", không chăm chi tiết như landing |
| ✅ Figma trước, rồi code | Giống quy trình landing; duyệt từng màn trước khi code; thêm một vòng thiết kế, lùi Bước 3 |
| Tự viết component từ đầu theo token landing | Không thêm thư viện UI; tự làm bảng, dialog, combobox cùng accessibility — tốn công, dễ sót |

## D8 — Trình tự Figma

| Phương án | Trade-off |
|---|---|
| ✅ Design doc → Claude dựng Figma → chủ dự án duyệt → code (đề xuất) | Doc chốt đủ màn hình/luồng/trạng thái nên Figma không thiếu màn; code đọc theo Figma lúc triển khai như landing |
| Chủ dự án tự vẽ Figma, Claude viết doc theo | Kiểm soát hình ảnh hoàn toàn; tốn thời gian chủ dự án; doc chờ Figma |
| Claude dựng Figma ngay lúc brainstorm | Xem hình trước khi chốt doc; vẽ trước khi chốt màn/luồng dễ phải vẽ lại |

Kiểm 14/10/2026 theo yêu cầu "chạy mcp đi": MCP Figma ghi được vào tài khoản chủ dự án (gói student, ghế Full); đã tạo file
https://www.figma.com/design/coVHzJwTFgMbooUrty7sOq với 4 trang rỗng; font Be Vietnam Pro có sẵn.

## D9 — Thiết bị

| Phương án | Trade-off |
|---|---|
| Desktop là chính, mobile chỉ không vỡ (đề xuất) | Một bộ Figma; ít test hơn |
| ✅ Responsive đầy đủ | Figma cả desktop và mobile như landing; gấp đôi công Figma và test giao diện |
| Chỉ desktop | Nhỏ nhất; mở bằng điện thoại có thể không dùng được |

## D10 — Test e2e

| Phương án | Trade-off |
|---|---|
| ✅ Cả hai: đa số API giả, 3–4 luồng chính API thật (đề xuất) | Trạng thái hiếm test nhanh, ổn định bằng API giả; luồng thật bắt lỗi nối ghép (CORS, cookie, CSRF header) mà API giả che mất. Job CI chậm hơn, cấu hình dài hơn |
| Chỉ API giả | Nhanh, CI đơn giản; không bắt được lỗi cookie/CORS/CSRF, phải kiểm tay |
| Chỉ API thật | Sát thực tế nhất; khó tạo trạng thái hiếm, CI chậm nhất |

## D11 — Sửa backend

Bối cảnh: phiên trước ghi "không cần code backend mới". Rà code phiên này thấy sai: CORS `allowedHeaders` (`app.setup.ts:16`) chỉ
gồm `Authorization`, `Content-Type`, `X-CSRF-Protection`, trong khi upload, publish job, hoàn tác bắt buộc `Idempotency-Key`
(`idempotency.interceptor.ts:40`); `cors@2.8.6` trả đúng danh sách cấu hình. Thêm: `Retry-After` chưa expose; không có endpoint
liệt kê publish job.

| Phương án | Trade-off |
|---|---|
| Chỉ sửa cấu hình CORS (đề xuất) | Nhỏ nhất để luồng CSV chạy; không có trang lịch sử publish |
| ✅ CORS + endpoint liệt kê publish job | Có trang lịch sử publish; thêm một endpoint + test, Bước 2.5 có code backend thật |
| Không sửa backend | Upload/publish/hoàn tác không chạy được từ `admin.` — phải bỏ khỏi phạm vi D2 |

## D12 — Người không có vai trò đăng nhập

Trợ lý đề xuất ở Phần 1 của design: learner đăng nhập được nhưng chỉ thấy trang "không có quyền" và nút đăng xuất. **Chủ dự án yêu
cầu đổi:** chặn ngay lúc đăng nhập, báo "bạn không có quyền truy cập trang web này". Cách làm: API vẫn cấp phiên khi đúng mật khẩu,
giao diện gọi `/me`, thấy `staff_role = null` thì gọi `logout` ngay và báo lỗi trên form.

Phát sinh khi viết Phần 2: người đã đăng ký nhưng bỏ dở OTP sẽ kẹt mãi (phải xác minh mới được cấp vai trò). Trợ lý đề xuất ngoại
lệ: `staff_role = null` **và** chưa xác minh → chuyển sang màn OTP; đã xác minh → báo lỗi. **Chủ dự án: "ok".**

## D13 — Learner còn phiên vào trang admin

**Chủ dự án yêu cầu:** đá learner ra trang login ngay và báo không có quyền. Trợ lý đối chiếu: `PermissionGuard` đọc vai trò từ DB ở
mỗi request (`permission.guard.ts:29-33`) nên server chặn ngay; theo L5 phiên ở `app.` không mang sang `admin.`. Giao diện kiểm
`/me` khi tải trang, khi API trả 403, khi tab được focus lại. Giới hạn đã nói rõ: tab bỏ yên không bị đá đúng giây bị gỡ quyền vì
API không đẩy tin; mọi thao tác đã bị server chặn.

## D14 — Đồng bộ đăng xuất giữa tab

Trợ lý nêu ở Phần 4 là đề xuất tùy chọn (~20 dòng code; không làm thì tab B hiển thị dữ liệu cũ tới lần gọi API kế tiếp).

| Phương án | Trade-off |
|---|---|
| ✅ Dùng `BroadcastChannel` | Tab khác về `/login` ngay khi một tab đăng xuất |
| Không dùng | Ít code hơn; tab khác chỉ biết ở lần gọi API kế tiếp (401 → refresh hỏng) |

## D15 — Hướng giao diện

Chủ dự án yêu cầu tham khảo layout được đánh giá cao hoặc trang doanh nghiệp lớn qua DOM. Trợ lý đo bằng trình duyệt tích hợp:
shadcn/ui `dashboard-01`, GitHub (Primer), Atlassian navigation system, trang đăng nhập Stripe; Polaris và Tailwind Plus không đo
được (bị từ chối / bắt đăng nhập). Số đo: `docs/preparation/ADMIN_UI_REFERENCES_2026-10-14.md`. Đề xuất: sidebar trái + thanh trên
mỏng; chữ nền và nút nhỏ hơn landing; sidebar thành ngăn kéo trên mobile; giữ màu/font landing; đăng nhập là thẻ giữa trang; dark
mode ngoài phạm vi. **Chủ dự án: "ok".**

## D16 — Đơn vị kích thước

**Chủ dự án yêu cầu:** thiết kế theo kích cỡ động, không px tĩnh. Trợ lý đổi các con số px của D15 sang đơn vị động theo quy tắc W15
của landing (rem; `minmax()` cho sidebar; `min-height` thay chiều cao cố định; `min(100% - 2rem, 25rem)` cho thẻ đăng nhập;
`clamp()` cho khoảng đệm; container query cho bảng → thẻ; `@media (pointer: coarse)` cho cỡ chạm); Figma dùng auto layout + biến
token. **Chủ dự án: "ok".** Bảng giá trị ở mục 9 của design.

## D17 — Nguồn danh sách topic cho bộ lọc (phiên review 14/10/2026)

Phát hiện khi chủ dự án nhờ review lại spec: bộ lọc topic (Xuất CSV, tạo publish job) không có nguồn danh sách. `GET /v1/topics`
gắn `@LearnerContent()` — staff chưa đặt `native_language` nhận 403 `profile-incomplete`; `admin/taxonomy/topics` chỉ có
`POST`/`PATCH`.

| Phương án | Trade-off |
|---|---|
| ✅ Thêm `GET admin/taxonomy/topics` (đề xuất) | Dropdown chuẩn, không gõ sai; quyền `taxonomy.manage` (admin và editor đều có). Thêm một endpoint nhỏ + test vào M1 |
| Ô gõ tay mã topic | Không đổi backend; phải nhớ mã; gõ sai thì kết quả rỗng mà không báo lỗi |
| Dùng `GET /v1/topics` của learner | Không đổi backend; staff phải đặt `native_language` trước (chưa có màn hồ sơ) và trộn route learner vào admin |

## Sửa design sau phiên review (14/10/2026)

Chủ dự án nhờ review lại spec; trợ lý đối chiếu với code và sửa các lỗi của chính bản nháp (không phải quyết định mới):

- **"Xong khi" chạy không được:** file CEFR-J gốc chỉ tạo entry + level, không có sense (B2#7 Bước 2), nên "publish lô" sẽ ra
  `nothing-to-publish`. Sửa thành: upload → xuất `unpublishable` → điền nghĩa vài dòng → upload lại → publish.
- **403 có hai nguyên nhân giống nhau:** `AuthGuard` chỉ kiểm chữ ký JWT; `PermissionGuard` trả 403 (không 401) khi phiên đã bị thu
  hồi; `/me` vẫn 200. Bản nháp sẽ báo nhầm "không còn quyền" sau khi đặt lại mật khẩu hoặc đăng xuất ở máy khác. Sửa: 403
  `forbidden` → refresh trước. Thêm B25#6a.
- **403 khác loại** (`profile-incomplete`, `csrf-header-required`) không áp luật cổng.
- **Thiếu trạng thái job `partial`**: thêm vào polling và danh sách khung Figma.
- Thêm B25E19–E23 (mất phiên cũ khi đủ 10 phiên, header có cột level, nguồn thiếu phiên bản/license, OTP bị khóa); rủi ro rate
  limit đăng ký 5/giờ/IP với test e2e thật; chi phí Worker thứ hai (0 đồng, theo docs); ngôn ngữ lưu `localStorage`.

## Đề xuất kỹ thuật duyệt cùng design (không hỏi riêng)

| Chủ đề | Chọn | Phương án bỏ | Lý do |
|---|---|---|---|
| Thư viện | `react-router` 8.4.0, `@tanstack/react-query` 5.104.2, `use-intl` 4.14.9, `react-aria-components` 1.22.1, `msw` 3.0.3 | TanStack Router; tự viết fetch/polling; `react-i18next`; Radix | Phổ biến, đủ cho phạm vi; `use-intl` cùng API với landing; React Aria có sẵn bàn phím/screen reader để vẽ theo Figma |
| Giữ access token | Chỉ trong bộ nhớ | `localStorage` | Tránh script lạ đọc trộm; refresh cookie đã khôi phục được phiên khi F5 |
| Refresh khi 401 | Một lượt dùng chung, gửi lại một lần | Mỗi request tự refresh | Tránh nhiều refresh song song |
| `Idempotency-Key` | Key mới mỗi lần gửi form; giữ key khi thử lại; đổi form thì key mới | Key cố định theo màn hình | Khớp luật API (cùng key khác payload bị từ chối) |
| Polling | 2 giây khi `queued`/`running`; dừng khi xong; dừng khi tab ẩn | WebSocket/SSE | API không có kênh đẩy; polling đủ cho vài người dùng |
| Lô kẹt `queued` | Gợi ý "Worker có đang chạy?" sau 30 giây (`ASSUMPTION`) | Không báo | Quên chạy worker local là lỗi im lặng đã biết |
| Tải file | `fetch` → `Blob`, tên file do giao diện đặt | Link thường; expose `Content-Disposition` | API cần `Authorization` header |
| Người tạo publish job | Không trả | Gọi `IdentityService` lấy email | Màn hình chưa cần; giữ ranh giới D3 Bước 2 |
| Kiểm cấu hình build | Build production dừng nếu host API không bắt đầu bằng `admin-api.` | Chỉ ghi chú trong README | Bắt trường hợp biên L5 ngay lúc build |
| E2E API giả | Playwright `page.route` | MSW trong trình duyệt | Không thêm runtime vào trình duyệt test |
| CI | Thêm job `admin` và `admin-e2e-real` | Gộp vào job `web` | Hai app độc lập; job thật cần service riêng |
| BFF (server giữ cookie thay trình duyệt) | Không làm | D trong bảng L5 | L5 đã chọn tách host; không cần server |
