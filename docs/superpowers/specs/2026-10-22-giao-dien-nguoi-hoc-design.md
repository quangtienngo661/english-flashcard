# Giao diện người học trên web (Bước 3–7) — Design (22/10/2026)

> **Trạng thái 22/10/2026:** bản viết, chờ chủ dự án duyệt. Quyết định và các phương án đã đưa ra:
> [`../decisions/2026-10-22-giao-dien-nguoi-hoc-decisions.md`](../decisions/2026-10-22-giao-dien-nguoi-hoc-decisions.md).
> **Đầu vào:** mockup đã duyệt của đợt giao diện (Figma `7HcPAKLrWu32C27qYMJUOA`, page `08 Người học · Web`, page `09 Người học · Điện thoại`;
> design [`2026-10-21-dot-giao-dien-design.md`](2026-10-21-dot-giao-dien-design.md) D1–D17), bản chữ
> [`../../mockups/2026-10-21/ban-chu-giao-dien.md`](../../mockups/2026-10-21/ban-chu-giao-dien.md) (mục 12–16 ghi đè mục trước), research chữ
> [`../../mockups/2026-10-22/ui-copy-research-vi-en.md`](../../mockups/2026-10-22/ui-copy-research-vi-en.md), UI-CONTEXT §2, §9, §10, design và code Bước 3–7 trên `dev`.
> **Nhánh:** `claude/gallant-keller-bwo9dk` (cắt từ `origin/dev` @ `3299a4f`).

Nhãn: **Chốt** = chủ dự án chọn; **Đề xuất** = Claude đề xuất, chủ dự án đồng ý trong chat; **Claude tự quyết** = Claude chọn khi viết bản này, chủ dự án
xem ở danh sách cuối (mục 14); `ASSUMPTION` = chưa kiểm chứng. "Khung" là khung Figma (`K/xx` page 08, `M/xx` page 09).

## 1. Mục tiêu và bối cảnh

API của Bước 3–7 đã có trên `dev`; người học chưa có màn nào. Đợt mockup (21–22/10) đã vẽ đủ màn và chủ dự án duyệt từng mốc. Đợt này **code giao
diện web cho người học** trong `apps/web`, dưới `/vi/app/...` và `/en/app/...`, cho mọi thứ API đã làm được, theo mockup đã duyệt, cộng các thay đổi chủ
dự án nêu trong buổi brainstorm 22/10 (mục 6) và sáu việc API nhỏ mà các màn cần (mục 8).

Thành công = người học dùng được trọn vòng đăng ký → tạo nhóm → thêm từ → ôn → luyện (kể cả câu AI với AI giả) trên trình duyệt máy tính và điện thoại,
bằng tiếng Việt và tiếng Anh, sáng và tối; chủ dự án tự kiểm bằng tay theo tài liệu kiểm và không còn lỗi đã báo nào chưa xử lý (mục 11).

## 2. Quyết định (tóm tắt)

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| D1 | Chia mốc và PR | 5 mốc M1–M5 (M5 hai PR); mỗi mốc một PR vào `dev`; CI xanh → ảnh + tài liệu kiểm → chủ dự án "ok" phần hình → merge | Chủ dự án, theo đề xuất (chủ dự án nhờ đề xuất) |
| D2 | Việc API nhỏ | Làm cả sáu (a)–(f) ở mục 8, mỗi việc trong mốc đầu tiên cần nó | Chủ dự án ("làm toàn bộ"; (f) từ góp ý K/81) |
| D3 | Bản tối | Làm, ngay từ M1, chỉ trong `/app`; Sáng / Tối / Theo hệ thống lưu trên từng thiết bị (giữ D40 Bước 3) | Chủ dự án; cách làm theo đề xuất |
| D4 | "Xong khi" | Chủ dự án tự kiểm bằng tay theo tài liệu kiểm từng mốc, báo lỗi; Claude chạy thử với API thật và gửi ảnh trước khi giao | Chủ dự án; phần chạy thử theo đề xuất |
| D5 | Co giãn | Bề ngang điện thoại theo page 09; cửa sổ vừa một cột; từ 1280px hai cột như page 08; không vẽ thêm khung; Flutter để sau | Chủ dự án; mốc bề ngang theo đề xuất |
| D6 | Chữ giao diện | Research tiếng Việt + tiếng Anh, rồi chủ dự án chốt từng câu (mục 7) | Chủ dự án |
| D7 | Chân trang | Chỉ hiện link đã có trang; trang Liên hệ, Trợ giúp, Câu hỏi thường gặp, Gửi góp ý để một giai đoạn riêng | Chủ dự án; "chỉ hiện link có trang" theo đề xuất |
| D8 | Production khi còn chặn | Biến cấu hình tắt → `/vi/app/...` chuyển (307) về `/vi`, `/en/app/...` về `/en` | Chủ dự án; mã 307 theo đề xuất |
| D9 | Content-Security-Policy | Thêm trong đợt này, cho cả domain, kiểu SRI (băm script lúc build) | Chủ dự án |
| D10 | Hộp Tùy chỉnh phiên | Ba kiểu không AI luôn hiện; công tắc "Kiểu câu có AI" ẩn/hiện ba kiểu AI; bỏ ô "Câu lấy từ đâu?"; gói Miễn phí thấy công tắc nhưng không bật được; ô cùng cỡ, bỏ mô tả trong ô và chú thích dưới ô | Chủ dự án |
| D11 | Lỗi AI hiện với người học | `ai-failed` và `ai-unavailable` chỉ báo chung "hệ thống gặp lỗi", không nói nguyên nhân | Chủ dự án |
| D12 | Báo lỗi câu AI về từ người học tự thêm | Bỏ ô đồng ý "Cho đội Wordmet thấy từ này": báo lỗi thì đội Wordmet luôn thấy từ đó | Chủ dự án |
| D13 | Chữ tiếng Anh | Locale `en`, chính tả Mỹ, ngày có tên tháng, giờ 12 tiếng, sentence case, thuật ngữ ở mục 7.2 | Chủ dự án |
| D14 | Sửa chữ tiếng Việt | Các dòng ở mục 7.3 | Chủ dự án |
| D15 | Mức sử dụng | Mọi chỗ hiện mức đã dùng ghi luôn lúc được nạp lại (như "Resets at 7:20 PM" của Claude) | Chủ dự án |

## 3. Phạm vi

**Làm:**
- Mọi khung người học của page 08 (trừ K/00 và 4 mẫu Dark, dùng để đối chiếu bản tối), dựng thành trang web co giãn theo D5; bản tối và bản tiếng Anh
  của mọi màn.
- Sáu việc API ở mục 8 (trong `apps/api`, có unit test và migration khi cần).
- Token màu còn thiếu và giá trị bản tối trong `packages/design-tokens`.
- CSP cho cả `apps/web` (landing và app).
- Tài liệu kiểm cho chủ dự án và một script dựng dữ liệu thử (mục 11).
- Cập nhật bản chữ (mục 17 mới) theo mục 6 và 7.

**Không làm:**
- Màn admin (page 04) và việc API "trả email người thao tác" (design đợt giao diện §10): thuộc đợt làm lại admin.
- App Flutter; push; các trang Liên hệ, Trợ giúp, Câu hỏi thường gặp, Gửi góp ý (D7); nội dung trang Điều khoản.
- Đăng nhập Google, xóa tài khoản (Bước 8): Cài đặt giữ dòng "Xóa tài khoản · Sắp có" như K/50.
- Sửa Figma theo các thay đổi của mục 6 (Claude tự quyết, mục 14): design này và bản chữ mục 17 là nguồn của các chỗ đổi.
- Sửa chữ landing và email của API (chủ dự án: giữ nguyên).
- Thanh toán, quảng cáo: như mockup (Pro "Chưa mở bán", giá giữ chỗ, không quảng cáo).
- Khung K/79b (đã nộp câu điền từ từ câu đã lưu): không còn đường tới, vì D10 bỏ ô "Câu lấy từ đâu?" (mục 6).

## 4. Kiến trúc

### 4.1 Vị trí, layout và đường dẫn

- Code nằm trong `apps/web`, cùng Next `16.3.8`, next-intl `4.14.9`, OpenNext Cloudflare như landing (giữ Next và `eslint-config-next` ở 16.3.8).
- Hiện `src/app/[locale]/layout.tsx` vừa là layout gốc (html, body, font) vừa gắn thanh trên, chân trang của landing. Tách thành: layout gốc giữ html, body,
  font, `NextIntlClientProvider`; landing (`page`, `terms`, `privacy`, trang 404) chuyển vào route group `(site)` có `SiteHeader`, `SiteFooter`; app
  người học ở `src/app/[locale]/app/` với layout riêng. URL của landing không đổi; e2e của landing phải xanh như cũ.
- **Mọi trang `/app` là trang tĩnh** (prerender lúc build, như `/vi`, `/en` hiện nay), chỉ dựng phần khung; dữ liệu lấy ở trình duyệt. Giá trị thay đổi
  (id nhóm, chữ của từ) nằm ở **query string**, không ở đoạn đường dẫn động (Claude tự quyết, mục 14): không có trang dựng phía server, hợp với "chạy hoàn
  toàn ở trình duyệt" và với CSP kiểu SRI (D9).
- Tiền tố ngôn ngữ của `/app` đi theo `native_language` của hồ sơ (đề xuất D39 Bước 3, áp trong đợt này): mở sai tiền tố thì app chuyển sang tiền tố
  đúng (giữ phần còn lại của đường dẫn); hồ sơ chưa có ngôn ngữ thì giữ tiền tố đang mở. Đổi ngôn ngữ ở Cài đặt = `PATCH /v1/me` rồi chuyển tiền tố.

| Đường dẫn (sau `/vi` hoặc `/en`) | Khung | Ghi chú |
|---|---|---|
| `/app` | K/10, K/10b, K/94 | Hôm nay |
| `/app/login` | K/02, K/93 | Đăng nhập; `?next=` để quay về trang định mở |
| `/app/register` | K/01, K/01b | Đăng ký |
| `/app/verify-email` | K/03 | Nhập mã xác minh |
| `/app/forgot-password`, `/app/reset-password` | K/04, K/05 | |
| `/app/welcome` | K/06, K/06b | Chọn ngôn ngữ lần đầu |
| `/app/groups` | K/16, K/16b, K/17 | Danh sách nhóm |
| `/app/group?id=` | K/11–K/14, K/17b | Trang nhóm |
| `/app/group/backlog?id=` | K/15 | Từ lâu chưa ôn |
| `/app/review?group=` | K/20–K/22 | Phiên ôn, toàn màn |
| `/app/topic?code=&level=` | K/18 | Chọn từ theo chủ đề |
| `/app/lookup?q=&level=&topic=&pos=&mine=` | K/30 | Tra từ |
| `/app/word?w=` | K/31–K/33, K/88 | Trang từ (chữ đúng hoa thường, D42 Bước 3) |
| (tấm mở trên trang đang xem) | K/40–K/44, K/40b, K/42b, K/42c, K/44b, K/85–K/87 | Thêm từ, Thêm câu, Tra bằng AI |
| `/app/practice` | K/51, K/54, K/55, K/77, K/70–K/72 | Luyện tập, hộp Tùy chỉnh phiên |
| `/app/practice/weak` | K/56 | Từ hay sai |
| `/app/practice/history?tab=` | K/57, K/57b, K/82, K/83 | Lịch sử luyện tập, tab Báo lỗi của tôi |
| `/app/practice/session` | K/60–K/67, K/73–K/76, K/78a–K/81 | Phiên luyện, toàn màn |
| `/app/plans` | K/52, K/53 | Gói học, phủ toàn màn |
| `/app/settings` | K/50 | Đích của link trong email nhắc (UI-CONTEXT §9) |
| `/app/settings/account` | K/91, K/92 | Tài khoản |

### 4.2 Phiên đăng nhập và gọi API (chép từ `apps/admin`, chưa tách package)

- Chép `src/auth/session-store.ts`, `session-context.tsx`, `src/api/client.ts`, `problem.ts`, `idempotency.ts` (cùng test) sang `apps/web/src/app-shell/…`
  rồi sửa phần khác: `client: 'web'`, `device_label: 'Wordmet Web'`, tên `BroadcastChannel` và khóa `localStorage` riêng (`wordmet-web-auth`,
  `wordmet-web-logout-pending`), bỏ cổng staff (`gate`): người học nào đăng nhập được cũng vào app.
- Giữ nguyên các hành vi đã có: access token chỉ trong bộ nhớ; `refresh` bằng cookie với `X-CSRF-Protection: 1`, một lần refresh dùng chung cho mọi request
  gặp 401; tải lại trang thì `refresh` lại; `keepalive` khi rời trang (admin-refresh-keepalive); đăng xuất ở một tab báo các tab khác; 429 khi `refresh`
  thì thử lại theo `Retry-After` tối đa 3 lần; 5xx hay mất mạng lúc mở trang thì giữ phiên và cho thử lại.
- Khác admin: 403 `profile-incomplete` → `/app/welcome`; `must_change_password` (chỉ tài khoản staff tạo) → chuyển `/app/forgot-password` kèm một dòng giải
  thích (Claude tự quyết; người học thường không gặp).
- API gốc lấy từ `NEXT_PUBLIC_API_BASE_URL` lúc build. Build production (`deploy-web.yml`, `pnpm cf:build` với `NODE_ENV=production`) mà cờ app bật thì
  host phải bắt đầu bằng `api.` (cookie `refresh_token` host-only của `admin-api.` và `api.` không đè nhau); cờ tắt thì không cần biến này.
- Dữ liệu: TanStack Query (cùng phiên bản admin dùng). Mọi lệnh ghi có `Idempotency-Key` theo luật của API (mục 9, E9–E11).
- Múi giờ: đăng ký gửi múi giờ của trình duyệt (`Intl.DateTimeFormat().resolvedOptions().timeZone`); mỗi lần mở app, nếu khác `timezone` của hồ sơ thì
  `PATCH /v1/me` (B3E1). Múi giờ không hiện ở đâu (D32 Bước 3).

### 4.3 Chữ và định dạng

- next-intl. Chữ của app ở namespace `App` trong `messages/vi.json`, `messages/en.json` (landing giữ namespace riêng; app không tải chữ landing). App là
  client component nên layout `/app` gửi namespace `App` xuống client.
- Plural theo ICU (`{count, plural, one {…} other {…}}`) cho bản tiếng Anh; tiếng Việt viết một dạng `other` (research E4).
- Ngày, giờ, số theo `Intl` với locale `vi-VN` hoặc `en-US` và **múi giờ của người học** (không phải múi giờ của máy chủ build): `vi` "Chủ Nhật, 18/10",
  "20:00"; `en` "Sunday, Oct 18", "8:00 PM", "Dec 31, 2026" (D13).
- Lý do báo lỗi và tên chủ đề là dữ liệu từ API (theo ngôn ngữ người học), không nằm trong file chữ.

### 4.4 Màu, bản tối, font

- Màu chỉ khai báo trong `packages/design-tokens/theme.css` (UBC1). Thêm các biến Figma có mà file chưa có (`navy`, `navy-raised`, `session-card`,
  `highlight`, và biến nào khác page 08 dùng; giá trị đọc từ biến Figma, chế độ Light). Thêm khối giá trị tối (chế độ Dark của Figma; giá trị ở bản chữ
  mục 15, 16) dưới selector `[data-theme='dark']`.
- Chỉ layout `/app` gắn `data-theme` lên `<html>`; landing và admin không bao giờ có `data-theme`, nên không đổi gì với chúng.
- Lựa chọn Sáng / Tối / Theo hệ thống lưu trong `localStorage` của thiết bị (D40 Bước 3); mặc định Theo hệ thống (`prefers-color-scheme`). Một script nhỏ
  chạy trước khi vẽ trang để không nháy màu; script cố định nên CSP cho phép bằng hash (mục 4.6).
- `apps/web/src/styles/tokens.test.ts` kiểm tương phản cả hai chế độ (chữ ≥ 4,5:1, icon và viền ô nhập ≥ 3:1, như figma-checks).
- Font Lexend qua `next/font` như landing. Icon Lucide (`lucide-react`, như admin và Figma).

### 4.5 Chặn trên production (D8)

- Biến build `NEXT_PUBLIC_LEARNER_APP=on` bật app; thiếu hoặc khác `on` = tắt. `deploy-web.yml` không đặt biến này cho tới bước Deploy.
- Tắt: `proxy.ts` trả 307 từ `/{locale}/app` và mọi đường con về `/{locale}` (không giữ query), `Cache-Control: no-store`. Trang `/app` vẫn được build
  nhưng không tới được; `sitemap.ts` không có `/app`, `robots.ts` chặn `/*/app` ở mọi chế độ.
- Bật (máy chủ dự án, e2e, cloud): app chạy bình thường.

### 4.6 Content-Security-Policy (D9)

- Một header CSP cho mọi đường dẫn của `apps/web`, đặt trong `next.config.ts` `headers()`, bật `experimental.sri` (`sha256`). Khung chính (`ASSUMPTION`
  tới khi task kiểm xong): `default-src 'self'`; `script-src 'self'` + hash của script chống nháy màu; `style-src 'self'`; `img-src 'self' data: blob:`;
  `font-src 'self'`; `connect-src 'self'` + origin của API; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'`;
  `upgrade-insecure-requests` (trừ khi chạy local bằng http).
- **Rủi ro chưa kiểm:** trang App Router có script nhúng trong HTML (dữ liệu trang Next ghi vào); tài liệu Next 16.3.8 nói `script-src 'self'` đủ khi bật SRI
  nhưng chưa ai chạy thử với OpenNext Cloudflare. Task đầu của M1 build thật, mở landing và một trang `/app`, đọc lỗi CSP của trình duyệt. Chạy được thì
  giữ. Bị chặn thì **dừng, báo chủ dự án** chỗ hỏng và các cách (ví dụ thêm hash, nới `'unsafe-inline'` cho riêng phần đó) trước khi chọn.
- e2e: một test đọc header CSP và bắt sự kiện `securitypolicyviolation` trên landing và vài trang app; không được có vi phạm.

### 4.7 Co giãn (D5)

| Bề ngang | Bố cục |
|---|---|
| < 768px | Như page 09: thanh trên (logo, chip gói, avatar, dải tra) ở trang chính; tab dưới Hôm nay · Nhóm · Luyện tập · Tra từ; nút + nổi ở Hôm nay, Danh sách nhóm, Tra từ; trang con có nút quay lại; nút chính (Kiểm tra, Bắt đầu, Gửi báo lỗi, Lưu) dính ở đáy (UI-CONTEXT §10) |
| 768–1279px | Thanh trên hai tầng của page 08; một cột, nội dung cột phụ xuống dưới nội dung chính |
| ≥ 1280px | Như page 08: nội dung tối đa 1440px, cột phụ 360px |

Tấm, hộp thoại: điện thoại mở dạng tấm từ đáy (như page 09), web dạng hộp giữa màn. Phiên ôn, phiên luyện, Gói học luôn toàn màn.

### 4.8 Thư viện thêm vào `apps/web`

Cùng phiên bản `apps/admin` đang khóa trong `pnpm-lock.yaml` (không thêm phiên bản mới): `@tanstack/react-query` 5.104.2, `react-aria-components` 1.22.1
(hộp thoại, menu, ô chọn, công tắc có sẵn bàn phím và ARIA), `lucide-react` 1.55.0; dev: `msw` 3.0.3 cho unit test. Phải kiểm build OpenNext và cỡ bundle
sau khi thêm (`ASSUMPTION`: không vướng gì với React 19.3 vì admin đã dùng).

## 5. Màn và hành vi theo mốc

Mỗi mốc làm đủ khung của nó ở cả vi/en, sáng/tối, ba bề ngang; chữ lấy từ bản chữ (mục 12–16, cộng mục 17 mới). Chỉ ghi ở đây những gì bản chữ và mockup
chưa nói.

### M1 — Khung app, tài khoản, Cài đặt (1 PR)

- Phần dùng chung: layout `/app`, thanh trên hai tầng (Hôm nay · Nhóm · Luyện tập · Tra từ, nút Thêm từ (mở tấm ở M3; trước M3 nút ẩn), chip gói, avatar,
  dải tra (gửi sang `/app/lookup` ở M3; trước M3 ẩn)), chân trang (D7), menu avatar (K/90), tab dưới và nút + của điện thoại, khung trang con, tấm/hộp
  thoại dùng chung, thông báo (toast), trạng thái tải và lỗi chung, cờ chặn (4.5), CSP (4.6), token và bản tối (4.4).
- Màn: K/01, K/01b, K/02, K/93, K/03, K/04, K/05, K/06, K/06b, K/50, K/91, K/92.
- Luồng: đăng ký (Tên, Họ, Ngày sinh, email, mật khẩu, ô đồng ý Điều khoản + Chính sách bảo mật trỏ `/{locale}/terms`, `/{locale}/privacy`) → mã xác minh →
  chọn ngôn ngữ → Hôm nay. API không chặn người chưa xác minh email; Cài đặt hiện trạng thái email và mời xác minh khi chưa xác minh (D36 Bước 3).
  K/03 làm đúng như Figma (có hay không có lối bỏ qua theo khung).
- Cài đặt (K/50): thông tin cá nhân, gói và mức sử dụng (từ `GET /v1/me/entitlements`, D15), học tập (Ngôn ngữ, Giao diện), thông báo (nhắc học qua email,
  `GET/PATCH /v1/me/reminders`), phím tắt (chỉ web), tài khoản (Đăng xuất, Xóa tài khoản "Sắp có").
- Việc API (a): sửa ngày sinh (mục 8).

### M2 — Học và ôn (1 PR)

- Màn: K/10, K/10b, K/94, K/16, K/16b, K/17, K/17b, K/11, K/12, K/13, K/14, K/15, K/18, K/20, K/21, K/22.
- Phiên ôn: `GET /groups/{id}/queue?mode=due|all`, `POST /reviews` (mỗi lần bấm một `review_id` mới); phím Space, 1, 2, Esc như mockup; mặt trước từ + loại
  từ, mặt sau nghĩa + câu đã gặp tô từ (D3 đợt giao diện).
- Thẻ chủ đề và K/18: thêm cả chủ đề bằng bộ lọc (đã có), thêm từng từ đã tick bằng việc API (c).
- Từ lâu chưa ôn (K/15): `GET /groups/{id}/backlog`, `POST /items/relearn`.

### M3 — Tra từ và thêm từ (1 PR)

- Màn: K/30, K/31, K/32, K/33, K/40, K/40b, K/41, K/42, K/42b, K/42c, K/43, K/44, K/44b.
- Tấm Thêm từ chọn sẵn nhóm dùng gần nhất (D4 đợt giao diện; nhớ trong `localStorage`); nhóm đó đã bị xóa thì trống; chưa có nhóm thì "Tạo nhóm đầu tiên".
- Trang từ: số câu đã gặp mỗi nghĩa, danh sách câu và xóa câu dùng việc API (e).

### M4 — Luyện tập và Gói học (1 PR)

- Màn: K/51, K/54 (bố cục mới của D10, chưa có công tắc AI), K/55, K/56, K/57, K/57b, K/82, K/83, K/77, K/60–K/67, K/52, K/53.
- Từ hay sai theo nhóm (K/56) dùng việc API (b); thứ tự lý do báo lỗi và chữ tiếng Anh của lý do dùng việc API (d).
- Phiên đang dở (D9 đợt giao diện): thẻ ở cột phụ; chỉ hỏi khi mở phiên mới lúc còn phiên cũ.

### M5a — Phiên có câu AI (1 PR)

- Màn: K/70, K/70t, K/70b (công tắc của D10), K/71, K/72, K/73, K/74a–K/74e, K/75, K/75b, K/76, K/78a, K/78b, K/78c, K/79a, K/80, K/80b, K/81.
- `preparing`: hiện "Đang tạo câu…", gọi lại `next` sau `retry_after_seconds` (mặc định 2s), không có nút; sau mỗi câu hiện ra gọi `prepare` (không chờ).
- Báo lỗi câu AI về từ người học tự thêm theo D12 và việc API (f).
- Chạy thử với AI giả (`AI_FAKE_ENABLED=true`, model `fake:*`; mục 11).

### M5b — Tra bằng AI và Từ của tôi (1 PR)

- Màn: K/85, K/85t, K/85b, K/85c, K/86, K/86b, K/87, K/88.
- `POST /lookup/ai` có `Idempotency-Key` riêng mỗi lần bấm; gặp 409 thì gửi lại **cùng** key sau `Retry-After` (research của agent API, mục 9 E11).

## 6. Thay đổi so với mockup đã duyệt (chủ dự án, 22/10)

| Chỗ | Mockup | Đổi thành |
|---|---|---|
| Hộp Tùy chỉnh phiên (K/54, K/70, K/70t, K/70b, K/71, K/72 và M/…) | Khối "Kiểu câu có AI" luôn hiện; ô "Câu lấy từ đâu?"; mô tả trong mỗi ô; chú thích dưới "Kiểu đề", "Số câu" | Ba ô Trắc nghiệm, Đúng/sai, Gõ từ luôn hiện; dưới đó công tắc **"Kiểu câu có AI"** + nhãn Pro: bật thì hiện ba ô Điền từ vào câu, Chọn nghĩa trong câu, Trắc nghiệm theo câu và dòng "Phiên này dùng tối đa N lượt câu AI · còn M"; tắt thì ẩn. **Bỏ** ô "Câu lấy từ đâu?" (điền từ luôn là câu AI viết mới). Ô cùng cỡ, không mô tả trong ô, không chú thích dưới ô (D10) |
| Công tắc với gói Miễn phí | (khối AI hiện, có ổ khóa) | Công tắc hiện mờ, không bật được, nhãn Pro; bấm vào hiện dòng D6 "Dành cho gói Pro. Gói Pro chưa mở bán." + [Xem Gói học] (Claude tự quyết) |
| Công tắc nhớ lựa chọn | — | Nhớ lần chọn trước trên thiết bị (Claude tự quyết) |
| Lỗi AI (K/72, K/74a, K/74d, K/75) | Nói nguyên nhân (AI lỗi, AI đang tạm dừng, chưa sẵn sàng) | Chỉ nói hệ thống gặp lỗi (D11): K/72 "Hệ thống đang gặp lỗi, chưa dùng được kiểu câu có AI. Bỏ kiểu câu AI để bắt đầu, hoặc thử lại sau."; K/74a, K/74d "Hệ thống đang gặp lỗi." + [Thử lại] [Để sau]; K/75 "Câu này chuyển sang kiểu câu thường." Hết lượt (K/74b) và cần gói (K/74c) giữ như mockup |
| Báo lỗi câu AI về từ tự thêm (K/81) | Ô tick "Cho đội Wordmet thấy từ này" bắt buộc | Không có ô tick; một dòng "Đội Wordmet sẽ thấy từ “rizz” bạn tự thêm để kiểm tra." (D12; câu chữ Claude tự quyết) |
| Nút ghép hai vế | [Dừng, để sau], [Bỏ, mở phiên mới], [Bỏ qua, xem đáp án] | [Để sau], [Mở phiên mới], [Xem đáp án] |
| "Kiểm lại" (K/74a, K/76, K/86, K/88) | "Kiểm lại từ trong Từ của tôi" | "Xem lại …" |
| Nút gửi câu trả lời (K/78a và mọi câu gõ) | [Nộp] | [Kiểm tra] |
| Câu hướng dẫn thao tác | "Bấm vào thẻ hoặc Space để lật" | "chọn" cho thứ trên màn, "nhấn" cho phím: "Chọn thẻ hoặc nhấn Space để lật" |
| Viết hoa tên trang | [Xem Gói học] / [Xem gói học] lẫn lộn | Hoa khi là tên trang ("Xem Gói học"), thường khi là danh từ chung ("gói Pro") |
| Số đếm | "1/3 đã dùng" và "đã dùng 3/3" | "đã dùng 1/3" mọi chỗ |
| Mức sử dụng (Cài đặt, thẻ phiên luyện, Gói học) | Có chỗ chưa ghi lúc nạp lại | Mọi chỗ ghi lúc nạp lại theo `resets_at`: hôm nay/ngày mai ghi giờ ("Mở lại lúc 0:00", "Resets at 12:00 AM"), xa hơn ghi ngày ("Lượt câu AI mới có vào 15/11") (D15) |
| Chân trang | 3 nhóm link | Chỉ link có trang: Giới thiệu (về landing), Gói học, Điều khoản sử dụng, Chính sách bảo mật; bỏ cột Hỗ trợ và link Liên hệ; trong `/app` không có dòng đổi ngôn ngữ (Claude tự quyết; ngôn ngữ đổi ở Cài đặt vì đổi cả nghĩa) |

## 7. Chữ giao diện

### 7.1 Nguyên tắc

Bản chữ đã duyệt (mục 1–3, 12–16) giữ nguyên trừ chỗ đổi ở mục 6 và 7.3. Bản tiếng Anh **viết lại ngắn gọn theo thói quen tiếng Anh**, giữ nghĩa và hành vi,
không dịch sát (ví dụ "Hết phiên luyện hôm nay…" → "You've used today's practice sessions."). Luật tiếng Anh (D13):
- Sentence case mọi chỗ; không viết hoa hết.
- App tự xưng "we" **chỉ khi lỗi do app** ("We couldn't save your word."); còn lại không chủ ngữ hoặc "Wordmet".
- Hộp hỏi xóa: nút hành động nói việc ("Delete deck"), nút còn lại **"Cancel"** (bản tiếng Việt vẫn [Giữ nhóm]).
- Không "please", "sorry", không "!" trong lỗi; dấu "…" một ký tự; ngoặc kép cong.
- Chính tả Mỹ (practice, color); ngày "Sunday, Oct 18", "Dec 31, 2026"; giờ "8:00 PM", "12:00 AM".
- Bản `en` không ghi tổng số nấc gợi ý ("Hint", không "Hint 1/3"); bản `vi` giữ "Gợi ý 2/3".
- Độ dài kiểm khi code: ảnh chụp bản tiếng Anh ở 390px và 1440px cho mọi màn (D6, câu 32).

### 7.2 Thuật ngữ tiếng Anh (Chốt)

| Tiếng Việt | Tiếng Anh |
|---|---|
| nhóm | deck |
| ôn, phiên ôn | review, review session |
| luyện tập, phiên luyện | practice, practice session |
| phiên | session |
| câu (một lần trả lời) | question |
| lượt câu AI · lượt tra AI | AI credits, kèm tên kho ("AI credits for questions", "AI credits for lookups") |
| gói Miễn phí / Dùng thử / Pro | Free / Trial / Pro |
| Từ của tôi | My words |
| câu đã gặp, câu bạn đã lưu | saved sentences |
| dạng chia | forms ("Forms: going · went · gone") |
| báo lỗi | Report ("My reports") |
| trả lại lượt câu AI | return ("1 AI credit returned") |
| ngăn | stage (theo số ở Tùy chỉnh phiên "Stage 2", theo ngày ở chỗ khác "3-day stage", như bản tiếng Việt) |
| Cần ôn lại / Đã biết | Still learning / Know |

Chữ còn lại (tab, nút chung, kiểu câu…) chọn trong các phương án của research (mục B2, B3, C) theo luật 7.1; chủ dự án xem ở ảnh tiếng Anh của từng mốc.

### 7.3 Đổi chữ tiếng Việt (Chốt)

- Lỗi AI: mục 6 (D11). Báo lỗi từ tự thêm: mục 6 (D12).
- Giữ "câu" cho một lần trả lời; giữ hai tên "câu đã gặp" / "Câu bạn đã lưu"; giữ "ngăn" và cách gọi hiện tại (theo số ở Tùy chỉnh phiên, theo ngày ở chỗ khác).
- Nút một động từ, "Xem lại", [Kiểm tra], "chọn" / "nhấn", viết hoa tên trang, "đã dùng 1/3": mục 6.
- Bỏ mô tả trong ô kiểu câu và chú thích dưới "Kiểu đề", "Số câu" (D10).
- Lý do báo lỗi: "Khác" luôn cuối; tiếng Anh rút gọn (việc API (d)).

### 7.4 Bản chữ

Thêm **mục 17** vào bản chữ: các chỗ đổi của mục 6 và 7.3 (chữ tiếng Việt cuối cùng) và bảng thuật ngữ tiếng Anh 7.2. Chữ tiếng Anh từng màn nằm trong
`messages/en.json`, không chép vào bản chữ.

## 8. Việc API

(điền ở bước sau)

## 9. Trường hợp biên của giao diện (When → Then)

Các luật chung của API (SR7–SR14: Problem Details, `Idempotency-Key`, giới hạn ghi, múi giờ) áp vào giao diện như sau. Chữ cụ thể lấy từ bản chữ hoặc mục 17;
chỗ bản chữ chưa có, Claude viết theo mẫu §3.1 của bản chữ (chuyện gì xảy ra + làm gì tiếp).

**Phiên đăng nhập**

| # | Khi | Thì |
|---|---|---|
| E1 | Mở một trang `/app/...` khi chưa đăng nhập (refresh trả 401) | Chuyển `/app/login?next=<đường dẫn đang mở>`; đăng nhập xong về `next`. `next` chỉ nhận đường dẫn bắt đầu bằng `/{locale}/app` (chống chuyển ra ngoài) |
| E2 | Bấm link trong email nhắc (`/vi/app/settings`) khi chưa đăng nhập | Như E1: đăng nhập rồi vào Cài đặt (B3E34) |
| E3 | Access token hết hạn giữa chừng (401) | Một lần `refresh` dùng chung cho mọi request đang chờ; được thì gửi lại; không được thì về đăng nhập với dòng "Bạn cần đăng nhập lại." |
| E4 | `refresh` trả 429 | Thử lại theo `Retry-After`, tối đa 3 lần; vẫn 429 thì về đăng nhập **có** dòng báo (khác admin B25E30, chưa có dòng báo) |
| E5 | Mở trang khi API trả 5xx hoặc mất mạng | Giữ phiên; màn "Không kết nối được. Kiểm tra mạng rồi thử lại." + [Thử lại] |
| E6 | Đăng xuất ở tab khác | Tab này về đăng nhập (`BroadcastChannel`) |
| E7 | Đăng xuất mà request không tới server | Giữ cờ "đang chờ đăng xuất"; tải lại không tự vào lại; thử đăng xuất lại (như admin FE38) |
| E8 | Đăng nhập đúng mật khẩu nhưng tài khoản bị khóa (403 `account-locked`) | K/93. Đang dùng mà bị khóa: lần `refresh` sau thất bại → như E3 |
| E9 | API học trả 403 `profile-incomplete` (chưa chọn ngôn ngữ) | Chuyển `/app/welcome`; chọn xong quay lại trang định mở |
| E10 | Mở `/en/app/...` trong khi hồ sơ là `vi` (hoặc ngược lại) | Chuyển sang tiền tố của hồ sơ, giữ đường con và query (4.1) |
| E11 | Múi giờ của thiết bị khác hồ sơ | `PATCH /v1/me` một lần mỗi lần mở app; lỗi thì bỏ qua, lần mở sau thử lại (B3E1) |

**Gọi API**

| # | Khi | Thì |
|---|---|---|
| E12 | Người học bấm một lệnh ghi có `Idempotency-Key` | Mỗi lần bấm một key mới; gửi lại vì mất mạng thì dùng **cùng** key |
| E13 | 409 "đang chạy" (`about:blank` + `Retry-After`) | Giữ trạng thái đang chờ, gửi lại cùng key sau `Retry-After` |
| E14 | 409 `idempotency-key-abandoned` | Tạo key mới, gửi lại một lần; lỗi nữa thì báo lỗi chung |
| E15 | 429 `rate-limited` khi ghi (30/phút), ôn (120/phút), trả lời (120/phút), báo lỗi (20/giờ) | Báo "Bạn thao tác hơi nhanh. Thử lại sau N giây." (N từ `Retry-After`); nút đó khóa tới hết thời gian |
| E16 | 400 `validation-failed` có `violations` | Lỗi dưới đúng ô; không có ô tương ứng thì báo chung |
| E17 | 404 khi mở `group?id=` của nhóm đã bị xóa (ví dụ ở tab khác), hoặc query sai dạng | Màn "Không tìm thấy nhóm này." + link về Danh sách nhóm; tương tự với từ, chủ đề |
| E18 | 409 `version-conflict` khi đổi tên nhóm | Tải lại tên mới, báo "Nhóm vừa được đổi ở nơi khác. Xem lại rồi lưu." |
| E19 | Mất mạng khi bấm "Đã biết"/"Cần ôn lại" trong phiên ôn | Giữ thẻ, cho thử lại với **cùng** `review_id` (API bỏ trùng) |

**Cờ chặn, CSP, bản tối**

| # | Khi | Thì |
|---|---|---|
| E20 | Build không có `NEXT_PUBLIC_LEARNER_APP=on`, ai đó mở `/vi/app/group?id=…` | 307 về `/vi`; không lộ trang app nào |
| E21 | `localStorage` bị chặn hoặc trống (cửa sổ riêng tư) | Giao diện theo hệ thống, ô nhóm ở tấm Thêm từ trống, công tắc AI tắt; app vẫn chạy (mọi lần đọc ghi bọc try/catch) |
| E22 | Đổi Sáng/Tối ở một tab | Các tab khác đổi theo (sự kiện `storage`) |
| E23 | Trình duyệt báo vi phạm CSP | Không được xảy ra ở trang nào; e2e bắt `securitypolicyviolation` (4.6) |

**Gói và lượt**

| # | Khi | Thì |
|---|---|---|
| E24 | Gói đổi khi hộp Tùy chỉnh phiên đang mở (ví dụ hết Dùng thử), người học mở phiên có kiểu AI → 403 `entitlement-required` | Công tắc AI tắt và khóa, hiện dòng D6, tải lại `/me/entitlements`; phiên không mở |
| E25 | Gói Miễn phí hết phiên luyện trong ngày (403 `quota-exhausted`, `resets_at`) | K/55, ghi giờ mở lại theo `resets_at` (D15) |
| E26 | Một kho lượt không có `resets_at` hoặc không giới hạn | Không ghi thời điểm nạp lại; hiện số còn lại nếu có (`ASSUMPTION`: kiểm hình dạng thật của `pools` khi code M1) |
| E27 | Mở phiên có kiểu AI mà không đủ lượt (403 `ai-quota-insufficient`) | K/71: còn bao nhiêu, cần bao nhiêu, lúc nạp lại |
| E28 | Mở phiên có kiểu AI khi admin tắt AI hoặc chưa chọn model (503 `ai-unavailable`) | K/72 với câu chung của D11 |

**Phiên luyện và tra AI**

| # | Khi | Thì |
|---|---|---|
| E29 | `next` trả `preparing` | "Đang tạo câu…", gọi lại sau `retry_after_seconds`; sau 60 giây vẫn `preparing` thì hiện "Hệ thống đang gặp lỗi." + [Thử lại] [Để sau] (Claude tự quyết, tránh chờ mãi) |
| E30 | `next` trả `ai_unavailable` với `ai-failed` hoặc `ai-unavailable` | K/74a, K/74d với câu chung của D11; [Thử lại] gửi `retry_ai: true`; [Để sau] về Luyện tập, phiên vẫn mở |
| E31 | `next` trả `ai_unavailable` với `quota-exhausted` hoặc `plan-required` | K/74b (kèm giờ nạp lại), K/74c như mockup |
| E32 | Phiên trộn có `notice: ai-fallback` | K/75: "Câu này chuyển sang kiểu câu thường.", chỉ lần đầu trong phiên (API đã đánh dấu) |
| E33 | `notice: word-not-recognized` | K/76 với link "Xem lại từ trong Từ của tôi" tới trang từ đó |
| E34 | Rời trang giữa phiên luyện | Phiên giữ ở server; trang Luyện tập hiện thẻ phiên đang dở (D9 đợt giao diện) |
| E35 | Bấm mở phiên mới khi `GET /practice/sessions/current` còn phiên | K/77 trước khi gửi `POST /practice/sessions`; [Làm tiếp] mở phiên cũ, [Mở phiên mới] mở phiên mới (API đóng phiên cũ) |
| E36 | Trả lời một câu đã trả lời ở tab khác (409 `already-answered` kèm `result`) | Hiện kết quả trả về, không báo lỗi |
| E37 | 409 `session-closed` | "Phiên này đã kết thúc." + về Luyện tập |
| E38 | Tra bằng AI trả 409 `ai-in-progress` | Giữ "Đang tra…", gửi lại cùng key sau `Retry-After` |
| E39 | Tra bằng AI trả 503 `ai-lookup-failed` hoặc `ai-unavailable` | Câu chung của D11; có [Thử lại] khi `retryable` |
| E40 | Tra bằng AI trả 403 `quota-exhausted` | "Hết lượt tra AI." + lúc nạp lại (D15) |
| E41 | Người học `en` | Không có bản dịch câu; gợi ý không ghi tổng; nghĩa là định nghĩa tiếng Anh (design Bước 7 D16) |

**Co giãn**

| # | Khi | Thì |
|---|---|---|
| E42 | Đổi bề ngang cửa sổ (hoặc xoay điện thoại) khi đang mở tấm hay đang làm phiên | Bố cục đổi theo 4.7, dữ liệu đang nhập và vị trí trong phiên giữ nguyên |

## 10. Kiểm thử

- **Unit (Vitest + Testing Library, `apps/web`):** mỗi store, hook và component có hành vi (phiên đăng nhập chép từ admin kèm test của nó, client API, định
  dạng ngày giờ theo múi giờ, plural, theme, cờ chặn, chuyển tiền tố, từng màn với API giả bằng `msw`). Viết test trước (TDD).
- **Unit (`apps/api`):** mỗi việc API có test ở service và controller như các bước trước; migration qua kiểm drift của CI.
- **e2e (Playwright, job `web` của CI):** dựng bản Cloudflare như hiện nay với `NEXT_PUBLIC_LEARNER_APP=on`; API giả bằng `page.route` (không có API thật
  trong CI, như e2e mock của admin). Mỗi mốc có luồng chính của nó; axe không lỗi nghiêm trọng ở mọi trang × vi/en × 1440/390 × sáng/tối; test CSP (4.6);
  test cờ tắt chuyển 307 (build riêng hoặc test của `proxy.ts`). e2e landing giữ nguyên và phải xanh.
- **Chạy thật (Claude, mỗi mốc, trong cloud):** API + worker + Postgres + Redis + Mailpit (Docker, image qua `mirror.gcr.io`), `AI_FAKE_ENABLED=true`,
  `BILLING_FAKE_ENABLED=true`; đi hết tài liệu kiểm của mốc, chụp ảnh vi/en, sáng/tối, 390/1440, đặt cạnh khung Figma.

## 11. "Xong khi" và tài liệu kiểm (D4)

1. CI xanh ở mọi PR của đợt.
2. Mỗi mốc: Claude chạy thật và gửi ảnh (đặt cạnh khung Figma) + tài liệu kiểm; chủ dự án "ok" phần hình thì merge vào `dev`.
3. Tài liệu kiểm `docs/deliveries/giao-dien-nguoi-hoc-test-flow.md`, một mục mỗi mốc: dựng trên máy Windows (PowerShell), dữ liệu cần có, rồi từng màn:
   bước làm → kết quả mong đợi → khung Figma; kiểm ở vi/en, sáng/tối, cửa sổ hẹp.
4. Script dựng dữ liệu thử `apps/api/scripts/learner-test-setup.mjs` (gọi API admin như các smoke): thêm model AI giả và chọn `fake:ok` cho các thao tác
   Bước 7; cấp gói Pro hoặc Dùng thử cho một email; chỉ chạy khi `AI_FAKE_ENABLED=true`, `BILLING_FAKE_ENABLED=true`.
5. Chủ dự án kiểm bằng tay trên `dev` theo tài liệu kiểm; lỗi báo được sửa bằng PR `fix/` vào `dev`. Đợt xong khi chủ dự án đã chạy hết các mục và mọi lỗi
   đã báo được sửa hoặc ghi lại.

## 12. Rủi ro và việc còn mở

- **CSP + SRI với OpenNext** chưa chạy thử (4.6); có thể phải quay lại hỏi.
- **Khối lượng:** khoảng 90 khung × hai thứ tiếng × hai chế độ; mỗi mốc là một PR lớn. Plan chia task nhỏ trong mốc.
- **Bề ngang 768–1279px chưa có khung**; Claude dựng theo luật 4.7, chủ dự án xem qua ảnh 1024px.
- **Cookie local:** admin (`localhost:5173`) và app người học (`localhost:3001`) cùng gọi API `localhost:3000` nên dùng chung cookie `refresh_token`; đăng
  nhập một bên làm bên kia mất phiên. Tài liệu kiểm hướng dẫn mở admin bằng `127.0.0.1` (khác host nên khác cookie). Production không gặp vì hai host API khác
  nhau.
- **Kiểu "Điền từ vào câu" từ câu đã lưu** (D11 Bước 7) không còn đường vào từ giao diện (D10); API giữ nguyên.
- Chữ tiếng Anh của mọi màn chưa ai duyệt trước; chủ dự án xem qua ảnh mỗi mốc.

## 13. Tài liệu cần cập nhật

- Decision record (cùng nhánh); plan (sau khi bản này được duyệt) và plan tóm tắt `docs/deliveries/giao-dien-nguoi-hoc.md`.
- Bản chữ mục 17 (7.4); UI-CONTEXT §10 thêm một đoạn trỏ tới đợt này; `.env.example` của API (`CORS_ORIGINS` thêm `http://localhost:3001`);
  README `apps/web` (chạy app người học, biến môi trường); CLAUDE.md (một mục "Giao diện người học").
- Khi xong: as-built trong `docs/deliveries/giao-dien-nguoi-hoc.md`; design Bước 7 ghi rằng D12 đổi luật đồng ý và D10 bỏ đường vào điền từ từ câu đã lưu.

## 14. Claude tự quyết (chủ dự án xem khi đọc)

1. Mọi trang `/app` tĩnh, giá trị thay đổi ở query string (`/app/group?id=`, `/app/word?w=`) (4.1).
2. Tiền tố ngôn ngữ theo hồ sơ, mở sai thì chuyển (đề xuất D39 Bước 3 còn chờ, áp trong đợt này) (4.1).
3. `must_change_password` của người học → màn Quên mật khẩu (4.2).
4. Thư viện: TanStack Query, React Aria, Lucide, msw cùng phiên bản admin (4.8).
5. Cổng chạy local của app người học: `pnpm dev --port 3001` (khớp `LEARNER_APP_URL` trong `.env.example` của API).
6. Công tắc AI nhớ lần chọn trên thiết bị; công tắc khóa với gói Miễn phí hiện dòng D6 khi bấm (mục 6).
7. Các chỗ AI khác với gói Miễn phí giữ D6 đã duyệt: nút "Tra bằng AI" mờ + nhãn Pro; hai dòng lượt AI trong Cài đặt ghi "Cần gói Pro".
8. Dòng báo ở K/81 khi không còn ô đồng ý: "Đội Wordmet sẽ thấy từ “rizz” bạn tự thêm để kiểm tra." (mục 6).
9. Chân trang trong `/app` không có dòng đổi ngôn ngữ (mục 6).
10. Không sửa Figma theo mục 6; design này và bản chữ mục 17 là nguồn (mục 3).
11. Không dựng K/79b (mục 3).
12. Script dựng dữ liệu thử cho chủ dự án (mục 11).
