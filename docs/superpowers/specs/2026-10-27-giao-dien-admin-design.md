# Đợt giao diện admin — Design (27/10/2026)

> **Quyết định:** [`../decisions/2026-10-27-giao-dien-admin-decisions.md`](../decisions/2026-10-27-giao-dien-admin-decisions.md) (AD0–AD14, T1–T9).
> **Câu hỏi và câu trả lời:** [`../reviews/2026-10-27-giao-dien-admin-questions.md`](../reviews/2026-10-27-giao-dien-admin-questions.md).
> **Đối chiếu API từng khung (`path:line`, `origin/dev` `6e72bb3`, chỉ đọc code):** [`content.md`](../../preparation/giao-dien-admin-facts/content.md),
> [`users-reports-grants-settings.md`](../../preparation/giao-dien-admin-facts/users-reports-grants-settings.md), [`ai.md`](../../preparation/giao-dien-admin-facts/ai.md).
> **Khung Figma:** file `7HcPAKLrWu32C27qYMJUOA`, page `04 Admin · Web`, section E1–E5. **Chữ:** [`ban-chu-giao-dien.md`](../../mockups/2026-10-21/ban-chu-giao-dien.md) §8.
> **Review độc lập (27/10/2026) và các chỗ đã sửa theo nó:** [`../reviews/2026-10-27-giao-dien-admin-design-review.md`](../reviews/2026-10-27-giao-dien-admin-design-review.md).
> **Luật từng màn:** design đợt giao diện [`2026-10-21-dot-giao-dien-design.md`](2026-10-21-dot-giao-dien-design.md) §6.4, §10.

Ví dụ xuyên suốt: **bạn** là `admin` (`owner@wordmet.com`); **Minh** là `editor` (`minh@wordmet.com`); **Lan** là người học gói Pro (`lan@example.com`).

## 1. Mục tiêu và phạm vi

**Mục tiêu.** Thay mọi mục "Sắp có" của `apps/admin` (trừ Dashboard) bằng màn thật, để bạn và Minh quản lý AI, cài đặt, báo lỗi, người dùng, cấp gói và nội dung
ngay trên admin, không gọi API bằng tay. Mốc quan trọng nhất là xong M1b: bạn chọn model, sửa prompt, chạy thử và chạy bộ ví dụ với key thật của mình. Đó là lần gọi AI
thật đầu tiên, và kết quả của nó là đầu vào cho design nhóm B.

**Làm:**
- 15 màn ở §6, theo khung page 04 (AD4, AD5).
- Menu 24 mục theo thanh bên Figma, gồm cả "Giao dịch" (đã có; thanh bên Figma chưa vẽ).
- Các thay đổi API nhỏ ở §5 (AD7, AD9, AD13, AD14).
- Ba điểm guideline cho màn mới (AD12).
- Bản vi và en (AD11).

**Không làm:**
- Dashboard (AD6): giữ "Sắp có".
- Phần của nhóm B: vòng đời prompt (bản nháp / publish / rollback), tiêu chí mong đợi, held-out, judge, dashboard AI.
- Sửa lại 6 màn cũ (Lô nhập, Publish, Xuất, Nguồn, Giao dịch, Nhân sự), trừ phần chúng dùng chung với màn mới (menu, router, component trong `ui/`, trang
  "không có quyền" ở `Shell`, §4.4).
- App Flutter, app người học.
- Gọi AI thật trong CI.

## 2. Quyết định (tóm tắt)

| # | Chọn |
|---|---|
| AD1 | Thứ tự AI → Cài đặt → Báo lỗi → Người học → Nội dung |
| AD2, AD4 | Hướng B đã chốt; code thẳng theo page 04; ghi chú "phần nhìn tạm" bị xóa |
| AD5, AD6 | 15 màn; Dashboard ngoài đợt |
| AD7 | Email người thao tác và người học (§5.1) |
| AD8 | 7 PR: M0 (phần chung) + 6 milestone M1a, M1b, M2, M3, M4, M5 (§3; M0 chủ dự án chốt 27/10/2026, T8) |
| AD9 | Việc API nhỏ làm trong đợt (§5) |
| AD10 | Xong khi: §8 |
| AD11 | vi + en |
| AD12 | Quyền và menu AI; bộ lọc trong URL, focus ô lỗi, cảnh báo rời form; sửa ghi chú cũ |
| AD13, AD14 | Quyền đọc cho editor (§5.2, §5.3) |
| T1–T9 | Đề xuất kỹ thuật (§3, §4, §5), chủ dự án duyệt cùng design ngày 27/10/2026; T6–T9 thêm sau review |

## 3. Milestone và nhánh

Mỗi milestone là một nhánh `feat/giao-dien-admin-<m>` tách từ `origin/dev` và một PR vào `dev` (AD8). Milestone sau tách từ `origin/dev` **sau khi** PR trước đã
merge, vì các milestone dùng chung `nav.ts`, `ui/`, `messages/*.json` và router.

M0 là PR phần chung, không có màn mới (T8, chủ dự án chốt 27/10/2026): phần rủi ro nhất (đổi router, R2) merge riêng và chạy lại toàn bộ test cũ trước khi có màn
AI, để M1a chỉ còn màn AI và API của nó.

| Milestone | Màn (khung) | API kèm theo | Chung |
|---|---|---|---|
| M0 — Khung chung | Trang "không có quyền" (A/71e, §4.4) | — | router mới (T2); một blocker ở `Shell` (§4.3, T6); menu 24 mục (mục chưa làm vẫn "Sắp có"); quyền AI; component dùng ở nhiều màn trong `ui/` (`ConfirmDialog`, `TextArea`, `Switch`, `NumberField`, `RadioGroup`; `Tabs` ở M2, chọn nhiều dòng ở M5); helper test với `createMemoryRouter`; mã lỗi client; `AI_FAKE_ENABLED` cho `admin-e2e-real`; tài khoản dùng chung trong `global-setup.ts` (§7) |
| M1a — AI, cấu hình | Tình trạng (A/84, A/84b), Model (A/80, A/80b), Thao tác (A/81), Prompt (A/82) | email người lưu prompt; `guard`; `test-quota`; `purpose` của lỗi gần nhất | — |
| M1b — AI, đo | Bộ ví dụ (A/83), Chi phí (A/85), Các lần gọi (A/86) | email người tạo ví dụ, người chạy | hook đọc lại trạng thái dùng chung cho lần chạy (§6.5) |
| M2 — Cài đặt hệ thống | A/70a–A/70f | `defaults` trong GET cài đặt | component Tabs |
| M3 — Báo lỗi | Báo lỗi (A/73, A/73e, A/74, A/74b, A/74c), Lý do (A/75, A/75b), Trả lượt (A/76), Dạng chia chưa biết (A/77, A/77b) | email người xử lý, người học, người sửa lý do; đọc một báo lỗi; quyền đọc lý do; `refundable`; chỉ số lựa chọn | — |
| M4 — Người học | Người dùng (A/71, A/71e, A/72, A/72b), Cấp gói (A/78–A/79e) | email người cấp, thu hồi, sửa, người học; tra một email; lọc theo email; `status`; lần sửa gần nhất | — |
| M5 — Nội dung | Từ (A/87), Nghĩa (A/88, A/88b), Chủ đề (A/89) | `missing[]` mọi bộ lọc | chọn nhiều dòng trong `DataList` |

Đợt chỉ được coi là xong khi M5 merge và các mục ở §9 đã sửa.

## 4. Phần chung của admin

### 4.1 Cấu trúc code (giữ như hiện có)

Mỗi màn là một thư mục `src/features/<tên>/`, gồm `<Tên>Page.tsx`, `<tên>-api.ts` (kiểu dữ liệu và hàm gọi API, như `transactions-api.ts`) và test đặt cạnh.
Phần gọi API và trạng thái tách khỏi phần hiển thị, để nhóm B thêm vào màn Prompt, Bộ ví dụ mà không viết lại (AD5). Màn chỉ dùng component trong `src/ui/` và
khung `Shell`; không tự tô màu, không tự đặt kích thước ngoài token.

Component thêm vào `src/ui/` (đều dựng trên `react-aria-components`, như component hiện có):

| Component | Dùng ở |
|---|---|
| `Tabs` | Cài đặt hệ thống (6 tab) |
| `TextArea` (biến thể của `TextField`) | Lời dặn prompt, ghi chú ví dụ, ghi chú model. Lý do khóa tài khoản, lý do cấp / thu hồi / sửa ngày, tên lý do báo lỗi dùng `TextField` một dòng (lý do khóa không nhận ký tự điều khiển, `staff.schemas.ts:26-29`) |
| `Switch` | Ô bật/tắt ở Cài đặt, "Đang dùng" của lý do |
| `NumberField` | Ô số ở Cài đặt, Cấp gói, Thao tác |
| `RadioGroup` | Loại cấp gói (Gói Pro / Con số riêng) |
| Chọn nhiều dòng trong `DataList` | Thao tác hàng loạt ở Nghĩa |
| `ConfirmDialog` (biến thể của `Dialog`) | Thu hồi, Khóa, Xóa model, "Rời trang?" |

Ngày dùng `TextField type="date"` theo ngày Việt Nam, như màn Giao dịch (`TransactionsPage.tsx:133`).

### 4.2 Router (T2)

Admin đang dùng `BrowserRouter` (router khai báo). `useBlocker` của react-router 8.4.0 gọi `useDataRouterContext` và báo lỗi khi không có data router
(`node_modules/react-router/dist/development/lib/hooks.js:1254`, kiểm 27/10/2026). Đề xuất: ở M0 đổi sang `createBrowserRouter` + `RouterProvider`, chuyển cây
`AppRoutes` hiện có thành route object. Hành vi các route cũ giữ nguyên; `routes.test.tsx` và `shell-slots.test.tsx` chạy lại để chứng minh điều đó.
`SessionProvider` và `ToastRegion` vẫn bọc ngoài router như hiện nay (`App.tsx:28-34`; chúng không gọi hook của router).

Test đơn vị hiện dựng `MemoryRouter`. Hai helper dựng cả `<AppRoutes/>` (gồm `Shell`, nơi đặt blocker): `renderApp` của `features/staff/test-utils.tsx`
(11 file test dùng) và `renderWith` của `app/session-loading.test.tsx`. Dưới `MemoryRouter`, `useBlocker` báo lỗi "must be used within a data router", nên M0
chuyển hai helper này sang `createMemoryRouter` với cùng route object của app. `features/account/test-utils.tsx` và `ui/ui.test.tsx` không dựng `Shell`, giữ
nguyên (facts `plan-admin-client.md` §2).

Phương án bỏ: tự chặn click menu và dùng `beforeunload`. Cách này không bắt được nút Back, và mỗi chỗ điều hướng phải nhớ gọi.

### 4.3 Ba điểm guideline cho màn mới (AD12)

- **Bộ lọc trong URL:** mỗi danh sách đọc và ghi bộ lọc qua `useSearchParams`, ví dụ `/reports?status=open&source=ai`. Tải lại trang hay gửi link vẫn giữ bộ lọc;
  `page_token` không đưa vào URL (token gắn với bộ lọc, nên đổi bộ lọc thì về trang đầu; tải lại trang cũng về trang đầu). Giá trị lọc không hợp lệ trong URL
  (ví dụ `?status=foo`, ngày sai dạng) bị bỏ khi đọc URL, màn lọc như không có giá trị đó, thay vì gửi lên API để nhận 400.
- **Focus ô lỗi:** lưu bị 400 `validation-failed` thì gắn từng `violations[]` vào đúng ô và focus ô lỗi đầu tiên. Lỗi không gắn được vào ô nào thì hiện ở `Banner`
  đầu form.
- **Cảnh báo rời form (T6):** form có thay đổi chưa lưu thì hỏi "Rời trang? Thay đổi chưa lưu sẽ mất." [Ở lại] [Rời trang], và `useBeforeUnload` chặn đóng
  hay tải lại tab. Áp cho Cài đặt hệ thống, Prompt, Thao tác, Chi tiết nghĩa và mọi hộp thoại có form. Cách làm, theo ba ràng buộc của code:
  - **Một blocker duy nhất, đặt ở `Shell`.** react-router chỉ cho mỗi router một blocker; có hai thì chỉ cảnh báo "A router only supports one blocker at a
    time" (`router/router.js:1221`). Mỗi form báo "đang bẩn" cho `Shell` qua một context (cùng kiểu `shell-slots`), kèm đường dẫn trang của nó.
  - **Chỉ chặn khi đổi trang.** `shouldBlock` chặn khi `nextLocation.pathname` khác trang của form đang bẩn. Đổi `search` trên cùng trang (tab `?tab=` của
    Cài đặt, bộ lọc) không chặn, vì luồng chính của Cài đặt là sửa ở nhiều tab rồi lưu một lần.
  - **Lưu xong thì hết bẩn trước khi điều hướng.** Form bỏ dấu "bẩn" ngay khi lưu thành công, rồi mới `navigate` (ví dụ đóng hộp thoại route con như
    `/sources/new` → `/sources`).
  - **Hộp thoại tự hỏi khi đóng.** Hộp thoại form là route con (`routes.tsx`, `SourcesPage.tsx:52,154`). Bấm [Hủy], ✕ hay Esc khi form trong hộp đang bẩn thì
    hộp hỏi "Bỏ thay đổi?" ngay trong hộp, không qua blocker; rời sang trang khác thì blocker ở `Shell` hỏi như trên.

### 4.4 Menu và quyền (AD12, 13.1)

Menu theo thanh bên Figma (A/84) và bản chữ §8.0, thêm "Giao dịch" vào nhóm Người học (đã code ở M4b; thanh bên Figma chưa có mục này, sẽ vẽ bù). Mục nào người
dùng không đủ quyền thì không hiện.

Mở thẳng đường dẫn không đủ quyền (T9, chủ dự án chốt (a) ngày 27/10/2026): theo khung A/71e và bản chữ §8.0 (`ban-chu-giao-dien.md:572`), trang giữ tiêu đề của mục và hiện
thẻ "Bạn không có quyền xem trang này." [Về trang chủ] (về `homePath`). Hiện nay `Shell.tsx:132` chuyển hướng im lặng về trang đầu; M0 đổi chỗ đó, nên áp cho
cả màn cũ (ví dụ editor mở `/staff`) và sửa test `e2e/shell.spec.ts` tương ứng. `/` và đăng nhập xong vẫn về `homePath` như cũ.

So với `nav.ts` hiện có: `/reported` đổi thành `/reports`, `/irregular-forms` thành `/unknown-forms` và chuyển từ nhóm Luyện tập sang nhóm Nội dung (theo bản chữ
§8.0); `/words`, `/senses` đổi `needs: []` thành `content.edit`. Đường dẫn cũ chỉ là trang "Sắp có", không cần chuyển hướng (route `*` về `/`).

| Nhóm | Mục | Đường dẫn | Quyền | Milestone |
|---|---|---|---|---|
| Tổng quan | Dashboard ("Sắp có") | `/dashboard` | — | — |
| Nội dung | Từ | `/words` | `content.edit` | M5 |
| | Nghĩa | `/senses` | `content.edit` | M5 |
| | Chủ đề | `/topics` | `taxonomy.manage` | M5 |
| | Lô nhập, Publish job, Xuất CSV, Nguồn | (giữ) | (giữ) | đã có |
| | Dạng chia chưa biết | `/unknown-forms` | `content.edit` | M3 |
| Luyện tập | Báo lỗi | `/reports` | `content.edit` | M3 |
| | Lý do báo lỗi | `/report-reasons` | `settings.manage` | M3 |
| | Trả lượt | `/refunds` | `settings.manage` | M3 |
| Người học | Người dùng | `/users` | `roles.manage` | M4 |
| | Cấp gói và lượt | `/entitlements` | `entitlements.grant` | M4 |
| | Giao dịch | `/transactions` | `settings.manage` | đã có |
| AI | Tình trạng, Model, Thao tác, Prompt | `/ai/status`, `/ai/models`, `/ai/operations`, `/ai/prompts` | `settings.manage` | M1a |
| | Bộ ví dụ, Chi phí, Các lần gọi | `/ai/eval`, `/ai/costs`, `/ai/calls` | `settings.manage` | M1b |
| Hệ thống | Cài đặt hệ thống | `/settings` | `settings.manage` | M2 |
| | Vai trò & staff | `/staff` | `roles.manage` | đã có |

Mục của milestone chưa làm vẫn hiện "Sắp có" (`available: false`) cho tới milestone đó. Ba mục AI cũ (`/ai/settings`, `/ai/costs`, `/ai/eval-sets`) được thay
bằng 7 mục trên. Quyền của nhóm AI đổi từ `roles.manage` sang `settings.manage`, đúng quyền cả 5 controller AI đòi. Hiện chỉ `admin` có cả hai quyền, nên không ai
thấy khác.

### 4.5 Lỗi, chữ, giờ

- `KNOWN_ERROR_SLUGS` (`src/api/problem.ts`) thêm các mã màn mới gặp: `version-conflict`, `lock-rule`, `report-not-open`, `resolve-status-not-allowed`,
  `report-reason-exists`, `grant-not-allowed`, `grant-not-active`, `model-exists`, `model-in-use`, `model-not-found`, `model-not-supported`,
  `provider-not-configured`, `provider-unavailable`, `model-not-set`, `operation-settings-conflict`, `prompt-revision-conflict`, `word-form-exists`,
  `stale-revision`, `publish-incomplete`, và các mã của thêm / lưu nghĩa ở M5: `sense-exists`, `replacement-exists`, `replacement-waiting`, `sense-retired`,
  `sense-entry-mismatch`, `revision-rejected`, `unknown-topic`, `topic-archived`, `too-many-examples` (`content/senses/senses.service.ts`,
  `admin-publish.controller.ts`, `publish.service.ts`, `import-content.ts`). `topic-exists` đã có (`problem.ts:58`). Danh sách này lấy bằng grep ngày 27/10;
  mỗi milestone grep lại các mã mà endpoint của màn ném ra và thêm mã còn thiếu. Câu chữ: lấy từ bản chữ §8 khi có; chưa có thì Claude viết theo văn phong
  bản chữ (nói chuyện gì xảy ra, rồi làm gì), ghi vào delivery record.
- API trải `extensions` ra **cấp trên cùng** của body (`problem-details.filter.ts:42-43`), còn `toApiError` của client bỏ mọi trường lạ (`problem.ts:79-87`).
  M0 cho `Problem` giữ thêm `reason?: string`. `grant-not-allowed` đọc `reason` để chọn câu: tài khoản staff, chính bạn, lượt AI chỉ admin đặt, người nhận đang trả tiền tự gia hạn (A/79b).
- Hai lỗi thinking ở Thao tác cùng là 400 `validation-failed`: màn khớp theo chuỗi violation (`thinking: this model cannot turn thinking off`,
  `thinking: off needs effort high or below`; `model-rules.ts:30,32`). Có unit test giữ hai chuỗi này.
- Mọi chữ có cả `vi.json` và `en.json` (AD11). Giờ hiển thị theo `Asia/Ho_Chi_Minh` như màn Giao dịch; ngày lọc là ngày Việt Nam, gửi API dạng mốc giờ `+07:00`
  (`transactions-api.ts`).

### 4.6 Trường hợp biên chung cho mọi màn

Mỗi bảng ở §6 chỉ ghi phần riêng của màn đó; các trường hợp dưới đây áp cho mọi màn.

- Mọi lệnh cần `Idempotency-Key` (lưu Cài đặt, chạy bộ ví dụ, cấp gói, xử lý báo lỗi, nhận dạng chia, thêm lý do) gửi qua `useSubmitAction`
  (`features/content/useSubmitAction.ts`, đang dùng ở Lô nhập, Publish), không tự viết lại luật gửi lại.
- Lệnh lưu có `expected_revision` / `expected_version` (Prompt, Thao tác) không có `Idempotency-Key`, nên gửi lại sau khi mạng rớt có thể bị 409 vì chính lần
  lưu trước của bạn.

| When | Then |
|---|---|
| Mạng rớt khi gửi một lệnh có `Idempotency-Key` | Giữ nguyên key, banner offline, [Thử lại] gửi lại cùng key (lần trước đã ghi thì API trả lại kết quả cũ); 409 "đang chạy" tự gửi lại sau `Retry-After`; 409 `idempotency-key-abandoned` đổi key, lần bấm sau là lần gửi mới |
| Đổi nội dung form sau một lần gửi lỗi | Key mới (fingerprint của form đổi, `api/idempotency.ts`) |
| Mạng rớt khi lưu Prompt / Thao tác, gửi lại nhận 409 conflict | Màn tải bản mới nhất. Nếu bản mới trùng đúng chữ (Prompt) hay lựa chọn (Thao tác) bạn đang có → báo "Đã lưu", không báo "người khác vừa lưu"; khác thì xử lý như conflict ở §6.3, §6.4 |
| Mạng rớt khi bấm [Chạy thử] | Không tự gửi lại (mỗi lần chạy thử gọi AI, tốn tiền và một lượt `ai.test`); báo lỗi mạng, bạn bấm lại nếu muốn |
| Phiên hết hạn khi đang sửa form (refresh thất bại) | `RequireSession` thay trang bằng `<Navigate to="/login">` (`RequireSession.tsx:12-14`), nên trang bị gỡ và blocker không kịp hỏi. Form dài (Prompt, Cài đặt, Chi tiết nghĩa) giữ bản đang sửa trong `sessionStorage` theo khóa `<màn>:<id>` mỗi khi đổi; đăng nhập lại về đúng `from` thì hỏi "Khôi phục thay đổi chưa lưu?" [Khôi phục] [Bỏ]. Lưu xong hoặc bấm [Bỏ] thì xóa bản giữ |
| Quyền bị thu giữa phiên (admin đổi Minh từ `editor` về người học) | API trả 403 `forbidden` (`PermissionGuard` đọc vai trò mới mỗi request, `permission.guard.ts:29-43`). Lớp gửi request đã tự làm mới phiên rồi gọi `recheck()` khi gặp 403 (`session-store.ts:179-193`), nên menu và `canAccess` theo quyền mới mà màn không phải làm gì; màn chỉ hiện câu của `forbidden`; trang không còn quyền thì hiện trang "không có quyền" (§4.4) |
| 429 `rate-limited` ở một lệnh ghi | Nút bị khóa và đếm lùi tới hết `Retry-After` (`useSubmitAction`) |
| Giá trị lọc sai trong URL | Bỏ giá trị đó khi đọc URL (§4.3) |

## 5. Thay đổi API

Mọi thay đổi chỉ **thêm**: thêm trường, thêm endpoint đọc, mở thêm quyền đọc. Không đổi hay xóa trường cũ (SR7, T1). Mỗi thay đổi có unit test ở `apps/api` và nằm
trong PR của milestone dùng nó.

### 5.1 Email người thao tác và người học (AD7, T1)

Trường uuid cũ giữ nguyên; thêm trường mới dạng `{ id, email }` cạnh nó, ở mọi response dùng cùng view (gồm cả response ghi: `PUT` prompt trả `get()`,
`POST` / `PATCH` ví dụ trả cùng view với danh sách), theo đúng kiểu `user: { id, email }` của API Giao dịch
(`transactions.service.ts:25,66-68`). Email lấy bằng `IdentityService.emailsOf(ids)`, gom một lần cho cả trang (không tra từng dòng). Người đã bị xóa hoặc không
tìm thấy thì `email: null`.

| Milestone | Endpoint | Trường cũ (giữ) | Trường thêm |
|---|---|---|---|
| M1a | `GET /v1/admin/ai/prompts/{op}`, `…/revisions` | `updated_by`, `saved_by` | `updated_by_user`, `saved_by_user` |
| M1b | `GET /v1/admin/ai/eval/examples`, `…/runs`, `…/runs/{id}` | `created_by`, `started_by` | `created_by_user`, `started_by_user` |
| M3 | `GET /v1/admin/practice/reports` (+ §5.4), response của `resolve` | `resolved_by` | `resolved_by_user` |
| M3 | `GET /v1/admin/practice/refunds` | `user_id`, `resolved_by` | `user`, `resolved_by_user` |
| M3 | `GET /v1/admin/practice/report-reasons` | `updated_by` | `updated_by_user` |
| M4 | `GET /v1/admin/entitlements/grants`, `POST`, `PATCH`, `revoke`, `GET …/users/{user_id}` | `user_id`, `granted_by`, `revoked_by`, `changes[].changed_by` | `user`, `granted_by_user`, `revoked_by_user`, `changes[].changed_by_user` |

Mọi object người thao tác **thêm mới trong đợt này** có cùng dạng `{ id, email, system }` (các object có sẵn như `reviewed_by` của nghĩa, `changed_by` của cài đặt, `locked_by` giữ dạng `{ id, email }`; màn coi thiếu `system` là `false`). Bản prompt seed do `AI_SYSTEM_ACTOR_ID` lưu (`ai.constants.ts:46`), không phải người thật: với
id đó API trả `{ id, email: null, system: true }`, màn hiện "Hệ thống"; mọi id khác có `system: false`.

### 5.2 Editor tra người học khi cấp gói (AD13)

- **Thêm** `GET /v1/admin/entitlements/lookup?email=` (quyền `entitlements.grant`, thuộc module Entitlements, gọi `IdentityService`). Email khớp **đúng**,
  không phân biệt hoa thường; không có tìm một phần, không có danh sách.
  - Tìm thấy: 200 `{ user: { id, email }, grantable: boolean, reason: 'self-grant' | 'target-is-admin' | 'target-is-staff' | null }`. Luật lấy từ `grant-rules.ts`,
    tính cho người đang gọi: với admin, `grantable` luôn `true`.
  - Không thấy: 404 `not-found`.
  - Giới hạn tần suất: thêm rule `entitlements.lookup`, 60 lần mỗi giờ mỗi người (`ASSUMPTION`: con số; đủ cho dùng tay, chặn dò email hàng loạt).
- **Thêm** bộ lọc theo email (API tự tra ra id; email không có tài khoản thì trả danh sách rỗng):
  - `GET /v1/admin/entitlements/grants`: thêm `user_email`, `granted_by_email`, cạnh `user_id`, `granted_by` cũ.
  - `GET /v1/admin/practice/refunds`: thêm `resolved_by_email`.

### 5.3 Editor đọc lý do báo lỗi (AD14)

- `GET /v1/admin/practice/report-reasons` đổi quyền ở method thành `content.edit`. Class giữ `settings.manage`, nên `POST` và `PATCH` vẫn chỉ admin.
  `PermissionGuard` lấy quyền ở method trước (`permission.guard.ts:22-24`).
- Mỗi báo lỗi trong `GET /v1/admin/practice/reports` thêm `refundable: boolean`, là giá trị **hiện tại** của lý do. Đúng giá trị mà luật trả lượt dùng lúc xác nhận
  (`refunds.ts:14-18`).

### 5.4 Việc API nhỏ khác (AD9)

| # | Milestone | Thêm | Cách làm |
|---|---|---|---|
| 10.1 | M1a | Số lần chạy thử còn lại (T3) | `GET /v1/admin/ai/test-quota` → `{ limit, remaining, resets_at }`, đọc rule `ai.test` của người đang gọi. Thêm vào lớp `RateLimiter` (`rate-limiter.service.ts:10`) một hàm đọc không trừ lượt: `findUnique` theo `key_windowStart` với khóa `ai.test:user:<userId>`. Số đếm tăng trước khi so `max` (`:28-34`), nên có thể vượt `max`: `remaining = max(0, limit − count)`. Cửa sổ là giờ tròn theo epoch (`:22-24`), trùng giờ tròn Việt Nam, nên `resets_at` là đầu giờ sau. `RateLimitGuard` đếm **trước** handler và trước `IdempotencyInterceptor` (`rate-limit.guard.ts:17-33`): lần chạy thử bị 400 / 409 và lần gửi lại chạy bộ ví dụ cùng key cũng trừ một lượt |
| 10.2 | M1a | Câu chặn cố định | `GET /v1/admin/ai/prompts/{op}` thêm `guard` (chữ của `PROMPT_GUARD`, chỉ đọc) |
| 10.3 | M5 | Cột "Thiếu" ở mọi bộ lọc | `GET /v1/admin/content/senses` trả `missing[]` cho mọi dòng, không chỉ khi `status=unpublishable` |
| 10.4 | M4 | Trạng thái lần cấp (T4, T7) | Mỗi lần cấp thêm `status`, do API tính theo thứ tự: `replaced` (xem dưới) → `revoked` (`revoked_at` có) → `expired` (`ends_at ≤ now`) → `scheduled` (`starts_at > now`) → `active`. **`replaced` (T7):** khi cấp Pro bắt đầu ngay, lần cũ được ghi `revokedAt: now, revokedBy: actorId, revokeReason: 'replaced'` và lần mới được tạo trong cùng transaction với `createdAt: now`, `grantedBy: actorId` (`grants.service.ts:100,124-137`). Vậy một lần cấp là `replaced` khi có một lần cấp `kind = plan` khác của cùng người học với `created_at = revoked_at` và `granted_by = revoked_by`; không cần cột mới, không đổi luật nhập lý do. Unit test: thu hồi tay với lý do gõ "replaced" vẫn ra `revoked` |
| 10.5 | M4 | Lần sửa gần nhất | Mỗi dòng của `GET …/grants` thêm `last_change` (cùng dạng `changes[]`, kèm `changed_by_user`) hoặc `null` |
| 10.6 | M3 | Mở một báo lỗi bằng link | Thêm `GET /v1/admin/practice/reports/{id}` (quyền `content.edit`, cùng dạng một dòng của danh sách) |
| 10.7 | M3 | Lựa chọn người học đã chọn | Snapshot báo lỗi **mới** thêm `learner.option_index`; báo lỗi cũ thiếu trường này thì màn ghi "Không rõ lựa chọn nào" khi hai lựa chọn cùng bị che |
| 10.8 | M2 | Giá trị mặc định | `GET /v1/admin/settings` thêm `defaults` (cùng dạng `values`, lấy từ `SETTINGS_DEFAULTS`) |
| 10.9 | M0 | Mã lỗi client | §4.5 |
| 10.10 | M1a | Mục đích của lỗi gần nhất | `GET /v1/admin/ai/status`: `operations[].last_error` thêm `purpose` (thêm cột `purpose` vào câu `DISTINCT ON`, `ai/reports/reports.service.ts:90-92,112`) |

## 6. Từng màn

Endpoint, trường và mã lỗi của từng phần tử nằm trong ba file đối chiếu API. Mục này chỉ ghi chỗ màn phải làm khác bản chữ hoặc phải tự ghép, và các trường hợp biên
(When → Then) của chính màn đó.

### 6.1 M1a — Tình trạng (A/84, A/84b)

- Nguồn: `GET /v1/admin/ai/status`. Sáu thao tác hiện đúng thứ tự `AI_OPERATIONS` (API đã trả đúng thứ tự). Lý do đổi từ mã sang chữ: `ai-disabled` → "AI đang tắt",
  `model-not-set` → "Chưa chọn model", `provider-not-configured` → "Nhà cung cấp chưa có key", `daily-call-cap` → "Chạm trần lời gọi".
- "Lỗi gần nhất" gồm cả lỗi của chạy thử và bộ ví dụ, không giới hạn ngày. Màn ghi kèm mục đích của lần gọi đó (`last_error.purpose`, 10.10), ví dụ
  "· chạy thử", và ghi chú dưới bảng "Gồm cả lỗi khi chạy thử và chạy bộ ví dụ".
- Dòng chưa sẵn sàng vì `model-not-set` có link sang Thao tác.

| When | Then |
|---|---|
| DB mới, bạn vào lần đầu | 6 dòng "Chưa sẵn sàng · Chưa chọn model" (A/84b), mỗi dòng có link [Chọn model] → `/ai/operations` |
| `ai_enabled` tắt | Mọi dòng "AI đang tắt"; khối đầu "AI toàn hệ thống: Đang tắt" có link sang Cài đặt tab AI |
| `today.cap` là `null` | "Lời gọi hôm nay: 1.240" (không có "/…") |
| Model đang chọn sắp ngừng (≤ 30 ngày) | Cột cảnh báo "Ngừng ngày 30/11/2026" (badge vàng) |

### 6.2 M1a — Model (A/80, A/80b)

- Thêm, sửa giá, đọc lại thông tin, xóa: như bảng `ai.md` §A/80. Model `fake` có giá 0 (API tự đặt). Form thêm chỉ cho chọn nhà cung cấp có key
  (`providers` của `status`).
- Câu cho lỗi bản chữ chưa có: `model-not-found` "Nhà cung cấp không có model này. Kiểm lại tên model."; `model-not-supported` "Model này chưa dùng được với Wordmet.";
  `provider-unavailable` "Nhà cung cấp đang không trả lời. Thử lại sau ít phút."

| When | Then |
|---|---|
| Xóa model đang được thao tác dùng | Nút [Xóa] vẫn bấm được; API 409 `model-in-use` → "Model đang được thao tác dùng, chưa xóa được." kèm tên thao tác lấy từ `used_by` của dòng model (lỗi 409 không mang danh sách, `models.service.ts:60`) |
| Thêm model khi nhà cung cấp chưa có key | Không có trong danh sách chọn; gọi thẳng API vẫn bị 409 `provider-not-configured` → câu bản chữ |
| Model chưa có giá | Cột giá "Chưa có giá"; ước tính "—"; chi phí lời gọi của model này tính vào "Lời gọi chưa có giá" (A/85) |
| Hai tab cùng sửa giá | Lần lưu sau ghi đè (API không có version cho model); chấp nhận, vì chỉ admin sửa |

### 6.3 M1a — Thao tác (A/81)

- Ghép hai API: `GET /v1/admin/ai/operations` (thao tác) và `GET /v1/admin/ai/models` (lấy `effort_choices`, `thinking_off_available` theo `model.id`). Sắp theo
  thứ tự `AI_OPERATIONS`, không theo a→z của API.
- Lưu từng dòng: `PUT /v1/admin/ai/operations/{op}` với `expected_version`. Chọn "Không có model" là tắt thao tác.

| When | Then |
|---|---|
| Đổi model sang model không có mức effort đang chọn | Effort về "Mặc định" trên form trước khi lưu; dòng phụ "Model này không có mức <x>" |
| Model không tắt được thinking | Lựa chọn "Tắt" bị ẩn; nếu API vẫn trả lỗi violation thinking → câu bản chữ ở đúng ô Thinking |
| Hai tab cùng lưu một thao tác | Tab sau nhận 409 `operation-settings-conflict` → câu bản chữ + [Tải lại]; ô đang sửa giữ nguyên tới khi bấm tải lại |
| Rời trang khi một dòng chưa lưu | Hộp "Rời trang?" (§4.3) |
| Lưu xong | Toast "Đã lưu. Áp từ lần gọi sau."; Tình trạng (A/84) đổi khi mở lại |

### 6.4 M1a — Prompt (A/82)

- Chọn thao tác (6), rồi hiện lời dặn (≤ 8.000 ký tự, bộ đếm dưới ô), ví dụ (≤ 10 cặp vào/ra), "Dữ liệu prompt nhận" (`input_fields`), câu chặn cố định (`guard`,
  chỉ đọc), bản số, [Lưu].
- [Chạy bộ ví dụ với bản này] (từ M1b): chạy cả Bộ ví dụ với bản đang sửa, không cần lưu (§6.5).
- [Chạy thử]: gửi bản đang sửa (chưa lưu) cùng tối đa 5 ví dụ đã chọn từ Bộ ví dụ (`example_ids`). Không chọn ví dụ nào thì API tự lấy **5 ví dụ đầu của Bộ
  ví dụ** (cũ trước); Bộ ví dụ trống thì lấy ví dụ trong prompt; cả hai đều trống thì API 400 → "Cần ít nhất một ví dụ để chạy thử."
  (`ai/prompts/prompts.service.ts:176-192`). Màn ghi rõ trước khi chạy: "Chạy với: 3 ví dụ đã chọn" / "5 ví dụ đầu của Bộ ví dụ" / "ví dụ trong prompt".
- Dòng "Còn 17/20 lần chạy thử trong giờ này (dùng chung với Bộ ví dụ)" đọc từ `test-quota` khi mở màn và sau mỗi lần chạy, kể cả lần bị lỗi (lần lỗi cũng trừ
  lượt, 10.1).
- Lịch sử: bản, thời điểm, người lưu (email hoặc "Hệ thống"), [Xem] mở chữ của bản đó ở chế độ chỉ đọc kèm nút [Chép vào ô sửa]. "Muốn quay về bản cũ: mở bản đó rồi
  lưu lại." (D15 Bước 6; nhóm B sẽ đổi).

| When | Then |
|---|---|
| Thao tác chưa có model, bấm [Chạy thử] | 409 `model-not-set` → "Thao tác này chưa có model. Chọn model ở Thao tác." + link |
| Hết lượt chạy thử trong giờ | Nút [Chạy thử] vẫn bấm được; 429 → "Đã dùng hết 20 lần chạy thử trong giờ này. Thử lại lúc 15:00." (giờ từ `Retry-After`) |
| Người khác vừa lưu cùng prompt | 409 `prompt-revision-conflict` → câu bản chữ; chữ bạn đang sửa giữ nguyên trong ô, có [Tải bản mới] (mở bản mới ở cạnh để chép tay). Nếu bản mới trùng đúng chữ bạn đang có (lần lưu của chính bạn mà mất response) → "Đã lưu" (§4.6) |
| Phiên hết hạn khi đang sửa | Bản đang sửa giữ trong `sessionStorage`; đăng nhập lại thì hỏi khôi phục (§4.6) |
| Lời dặn quá 8.000 ký tự | Bộ đếm đỏ, [Lưu] vẫn bấm được; API 400 → lỗi gắn vào ô, focus ô (§4.3) |
| Một lời gọi trong chạy thử lỗi | Mẫu đó hiện trạng thái, lý do; các mẫu khác vẫn hiện kết quả |
| Rời trang khi chưa lưu | Hộp "Rời trang?" |

### 6.5 M1b — Bộ ví dụ (A/83)

- Ví dụ theo thao tác (≤ 100): thêm, sửa, xóa. Form ví dụ dựng theo `input_fields` của thao tác. [Chạy bộ ví dụ] ở màn này dùng "Prompt hiện tại"
  (`prompt: 'current'`). Chạy với bản đang sửa thì bấm [Chạy bộ ví dụ với bản này] ở màn Prompt (gửi `prompt: { instructions, examples }`), rồi màn chuyển sang
  lần chạy đó ở đây.
- Lần chạy: trạng thái, tiến độ, hợp lệ, thời gian trung bình, chi phí (US$; ₫ tính ở client bằng `values.ai.usd_vnd_rate` của `GET /v1/admin/settings`, ghi
  "theo tỷ giá hôm nay"), model, bản prompt ("Bản nháp" khi `prompt_revision` là `null`), người chạy.
- Đang chạy thì đọc lại mỗi 2 giây, tab ẩn thì không đọc, như màn Lô nhập. `usePollingStatus` hiện chỉ nhận `JobStatus` (`queued`, `running`, `succeeded`,
  `partial`, `failed`) và `isTerminal` không biết `finished` của lần chạy (`features/jobs/usePollingStatus.ts:12,17`; `content-api.ts:11`), nên M1b đổi hook
  nhận thêm hàm `isTerminal` riêng (mặc định giữ hàm cũ, màn cũ không đổi). Với lần chạy: `finished` và `failed` là kết thúc.
- `POST …/eval/runs` cần `Idempotency-Key` (lớp `idempotency.ts` của client đã có).

| When | Then |
|---|---|
| Thêm ví dụ thứ 101 | 400 → "Mỗi thao tác tối đa 100 ví dụ." |
| Chạy khi thao tác chưa có model | 409 `model-not-set` → như Prompt |
| Đóng trang khi lần chạy đang chạy | Lần chạy vẫn tiếp tục ở worker; mở lại thấy tiến độ mới |
| Worker không chạy | Lần chạy đứng ở "Đang chờ"; quá `QUEUED_HINT_AFTER_S` (30 giây, dùng lại `useQueuedTooLong` như Lô nhập, B25E8) màn ghi "Chưa có worker nhận lần chạy này." |
| Mạng rớt khi bấm [Chạy bộ ví dụ] | Gửi lại cùng `Idempotency-Key` (§4.6): lần trước đã tạo thì API trả lại cùng `run_id`, không tạo lần chạy thứ hai; lượt `ai.test` vẫn bị trừ thêm (10.1) |
| Lần chạy lỗi | "Lỗi" + `error`; không tự chạy lại |

### 6.6 M1b — Chi phí (A/85), Các lần gọi (A/86)

- Chi phí: từ ngày, đến ngày (≤ 366 ngày; mặc định hôm nay), nhóm theo 5 kiểu, dòng tổng. "Chi phí là ước tính từ số token và giá đã nhập."
- Các lần gọi: tìm theo `operation_id` (dán từ báo lỗi A/74 hoặc log). Cột Nội dung: còn thì "Còn tới 25/10" + [Xem]; `null` thì "Không còn nội dung" (API không phân
  biệt "đã xóa" với "không lưu").

| When | Then |
|---|---|
| Khoảng ngày > 366 hoặc từ > đến | Lỗi ở ô ngày trước khi gọi API; API 400 cũng gắn vào ô |
| Không có lời gọi nào với mã | "Không có lời gọi nào với mã này." (API trả 200 rỗng) |
| Mở A/86 từ báo lỗi | Link ở A/74 mở `/ai/calls?operation_id=<mã>` (bộ lọc trong URL) |

### 6.7 M2 — Cài đặt hệ thống (A/70a–A/70f)

- Một trang, 6 tab, một nút [Lưu thay đổi] cho cả trang. Chỉ gửi khóa đã đổi, kèm `version` (`PUT` cần `Idempotency-Key`). Dòng phụ mỗi ô: "`khóa` · khoảng … · mặc
  định …", lấy từ `bounds` và `defaults` (10.8).
- Tab đang mở ghi vào URL (`/settings?tab=ai`). Tab có ô đã đổi mang dấu chấm.
- Khối đầu tab Gói và lượt: `GET /v1/admin/entitlements/ai-usage` (A/70d).
- [Lịch sử thay đổi] mở hộp: khóa, cũ → mới, email người đổi, thời điểm, phân trang.

| When | Then |
|---|---|
| Đổi ô ở hai tab rồi lưu | Một lần `PUT` gửi cả hai; thành công → toast "Đã lưu" và dấu chấm mất |
| Đổi tab khi đang có ô chưa lưu | Không hỏi "Rời trang?" (chỉ đổi `?tab=`, §4.3); ô đã đổi ở tab cũ giữ nguyên, tab đó mang dấu chấm |
| Sửa một ô rồi trả về đúng giá trị cũ | Ô đó không còn tính là đã đổi; không còn ô nào đổi thì dấu chấm mất và không hỏi khi rời trang |
| Phiên hết hạn khi đang sửa | Thay đổi chưa lưu giữ trong `sessionStorage`; đăng nhập lại thì hỏi khôi phục (§4.6) |
| Số mặc định của phiên > số tối đa | API 400 violation `values.practice.default_questions_per_session` → lỗi ở đúng ô, chuyển sang tab chứa ô đó, focus ô |
| Người khác vừa lưu | 409 `version-conflict` → câu bản chữ + [Tải lại]; tải lại thì mất thay đổi chưa lưu (hỏi trước) |
| Ô có thể để trống | Ô trống gửi `null`; dòng phụ đúng nghĩa từng khóa (`renewal_notice_days_before` trống = không gửi; `ai_cap_alert_percent` trống = không tô vàng; khóa khác = không giới hạn) |
| Rời trang khi chưa lưu | Hộp "Rời trang?" |

### 6.8 M3 — Báo lỗi (A/73, A/73e, A/74, A/74b, A/74c)

- Danh sách mặc định lọc "Chưa xử lý" (`status=open`), để câu trống "Không còn báo lỗi chưa xử lý." đúng. Bộ lọc Lý do lấy từ `report-reasons` (editor đọc được, §5.3).
- Cột Từ = `question_snapshot.correct.lemma`, Kiểu câu = `question_snapshot.type`, Lý do = `reason_label` (theo ngôn ngữ người học lúc gửi; màn hiện thêm nhãn của
  lý do theo ngôn ngữ admin nếu khác).
- Chi tiết mở bằng `/reports/{id}` (§5.4 10.6). Không có nhãn "Người học đồng ý cho xem từ này" (AD5).
- Nút theo nguồn câu: câu thường [Không có lỗi] [Đã sửa]; câu AI [Không có lỗi] [Xác nhận lỗi] và dòng phụ trả lượt khi `ai_charged`, `ai_operation_id`
  khác `null` và `refundable` (đúng điều kiện API dùng, `reports.service.ts:211-213`, `refunds.ts:14-18`). Câu AI có link sang Các lần gọi theo
  `call_operation_id`.
- Câu thường chọn [Đã sửa]: dòng phụ "Sửa nội dung ở Nghĩa" + link sang nghĩa của từ đó (M5; trước M5 link mở `/senses` "Sắp có").

| When | Then |
|---|---|
| Minh và bạn cùng bấm xử lý một báo lỗi | Người sau nhận 409 `report-not-open` → "Báo lỗi này đã được xử lý." và màn tải lại báo lỗi đó |
| Mạng rớt khi bấm xử lý, rồi [Thử lại] | Cùng `Idempotency-Key` (§4.6): lần trước đã ghi thì API trả lại kết quả cũ, không báo `report-not-open` |
| Admin đổi `refundable` của lý do khi Minh đang mở báo lỗi | Dòng phụ trả lượt theo lần tải gần nhất; kết quả thật là `refunded` trong response của [Xác nhận lỗi] |
| Xác nhận lỗi, trả lượt chưa xong | "Chưa trả được, hệ thống thử lại mỗi giờ" (`refunded = null`) |
| Xác nhận lỗi, `refunded = false` | "Không trả lượt" (không ghi lý do cụ thể; API không nói vì sao) |
| Hai lựa chọn cùng bị che, báo lỗi cũ | "Không rõ lựa chọn nào" thay cho nhãn "Người học chọn" |
| Gửi trạng thái sai loại câu (không thể qua UI) | 409 `resolve-status-not-allowed` → câu chung "Không xử lý được báo lỗi này. Tải lại trang." |
| Mở `/reports/{id}` không tồn tại | "Không tìm thấy báo lỗi này." + link về danh sách |

### 6.9 M3 — Lý do (A/75, A/75b), Trả lượt (A/76), Dạng chia chưa biết (A/77, A/77b)

- Lý do: thêm, sửa, tắt / bật (không xóa). Mã: "Bắt đầu bằng chữ, 2–40 ký tự a–z, 0–9, _" (theo API, sửa bản chữ). Lý do "Khác" ở cuối là do seed đặt
  `position = 1000` (`prisma/migrations/20261023090000_report_reasons_order_labels/migration.sql:3`); màn xếp đúng theo `position` của API, không tự dời "Khác",
  nên admin đổi thứ tự thì thứ tự mới được giữ.
- Trả lượt: lọc theo email người xử lý (§5.2), từ ngày, đến ngày. Cột Báo lỗi là link `/reports/{report_id}`; cột Người học là email.
- Dạng chia chưa biết: cột Từ gốc hiện `lemma_key` (chữ thường); [Nhận dạng này] cần `Idempotency-Key`; [Hoàn tác] trong toast.

| When | Then |
|---|---|
| Thêm lý do trùng mã | 409 `report-reason-exists` → "Đã có lý do mã này." ở ô Mã |
| Tắt một lý do | Người học không thấy lý do đó nữa; báo lỗi cũ giữ tên lúc gửi (ghi chú dưới bảng) |
| Trang dạng chia rỗng nhưng còn `next_page_token` | Màn tự tải trang sau (tối đa 5 lần liền), rồi mới hiện câu trống A/77b |
| Nhận dạng đã có | 409 `word-form-exists` → "Dạng này đã có." và dòng biến mất khi tải lại |
| [Hoàn tác] sau khi nhận | `DELETE …/word-forms/{id}`; dòng hiện lại |

### 6.10 M4 — Người dùng (A/71, A/71e, A/72, A/72b)

- Tìm từ 2 ký tự, lọc Tất cả / Đang hoạt động / Đang khóa, 20 người mỗi trang (bộ lọc trong URL). Chi tiết `/users/{id}`.
- [Khóa tài khoản] không hiện với chính bạn và với `admin`; API vẫn chặn (409 `lock-rule`).

| When | Then |
|---|---|
| Gõ 1 ký tự | Không gọi API; dòng phụ "Gõ từ 2 ký tự" |
| Khóa người đang có phiên | Họ bị đăng xuất mọi thiết bị (API); màn hiện "Đang khóa từ … · bởi <email bạn>" |
| Minh mở thẳng `/users` | Tiêu đề "Người dùng", thẻ "Bạn không có quyền xem trang này." [Về trang chủ]; thanh bên không có mục Người dùng (A/71e, §4.4) |
| Mở `/users/{id}` không tồn tại | "Không tìm thấy người dùng này." |

### 6.11 M4 — Cấp gói và lượt (A/78, A/78b, A/78c, A/78d, A/79, A/79b, A/79e)

- Danh sách: lọc theo email người học, email người cấp (§5.2), còn hiệu lực, sắp hết hạn trong N ngày. Trạng thái lấy `status` của API (10.4). Khối "Lượt AI hôm nay"
  chỉ admin (`ai-usage` cần `settings.manage`).
- Cấp mới: ô email → `GET …/lookup` khi rời ô hoặc bấm [Kiểm]. Thấy và `grantable` → hiện email đã xác nhận; `grantable = false` → câu theo `reason` ngay dưới ô,
  nút [Cấp] không gửi. Editor không thấy hai ô lượt AI (A/79e).
- Người nhận đang trả tiền tự gia hạn: lần gửi đầu nhận 409 `grant-not-allowed` `reason: target-has-paid-subscription` → hộp xác nhận A/79b → gửi lại với
  `confirm_turn_off_paid_renewal: true` và `Idempotency-Key` mới.
- Sửa ngày (A/78d): "Lần sửa trước" lấy `last_change` (10.5).

| When | Then |
|---|---|
| Minh gõ email của một editor khác | `lookup` trả `grantable: false`, `reason: target-is-staff` → "Editor không cấp được cho tài khoản staff." |
| Sửa ô email sau khi đã [Kiểm] | Kết quả tra cũ bị bỏ; [Cấp] chỉ gửi khi email trong ô đúng là email vừa tra (tra lại khi rời ô) |
| `lookup` bị 429 (quá 60 lần mỗi giờ) | Câu chung của `rate-limited` kèm giờ thử lại dưới ô email; [Cấp] không gửi |
| Email không có tài khoản | 404 → "Không có tài khoản với email này." |
| Cấp Pro bắt đầu ngay khi Lan đang có lần cấp Pro | Ghi chú bản chữ hiện trước khi gửi; sau khi cấp, dòng cũ thành "Bị thay thế" |
| `paid_renewal_action = not_supported` | "Đã cấp. Chưa tắt được tự gia hạn ở cổng thanh toán; người học vẫn có thể bị trừ tiền kỳ sau." (badge vàng) |
| Thu hồi lần đã hết hạn | 409 `grant-not-active` → câu bản chữ |
| Sửa ngày bắt đầu của lần đã bắt đầu | Ô Từ ngày chỉ đọc; API 400 nếu vẫn gửi |

### 6.12 M5 — Từ (A/87), Nghĩa (A/88, A/88b), Chủ đề (A/89)

- Từ: tìm, lọc (trình độ, có / chưa có nghĩa, trình độ lệch nhau, lô nhập), thao tác dòng, [Dán danh sách từ] (≤ 500 dòng `lemma,pos`, kết quả từng dòng:
  tạo / đã có / sai). Mỗi từ mới được tạo kèm một nghĩa rỗng (API), nên kết quả có link "Soạn nghĩa" sang `/senses/{sense_id}`. "Có nghĩa" tính cả nghĩa đã
  ngừng dùng (API); dòng phụ ở bộ lọc ghi rõ điều này.
- Nghĩa: lọc, chọn nhiều dòng, 5 thao tác hàng loạt (≤ 500), kết quả từng dòng (`ok` / lý do). Cột Thiếu từ `missing[]` (10.3).
- Chi tiết nghĩa `/senses/{id}`: người thao tác gần nhất (đã có email). "Đổi trạng thái gần nhất" suy hành động từ `state` (`unpublished` = gỡ khỏi app, `retired` =
  ngừng dùng, `open` = publish). Khi có bản nháp mới sau publish, dòng Review / Publish là `null` → "Bản nháp chưa review"; không hiện "Publish: —".
- Chủ đề: thêm, sửa tên, lưu trữ / dùng lại (không xóa); danh sách không phân trang (API trả hết).

| When | Then |
|---|---|
| Thao tác hàng loạt có dòng lỗi | Bảng kết quả: số dòng thành công, từng dòng lỗi kèm lý do (`stale-revision` "Nghĩa đã đổi, tải lại", `publish-incomplete` kèm phần thiếu) |
| Lưu bản nháp khi người khác vừa lưu | 409 `stale-revision` → "Nghĩa này vừa được sửa. Tải lại để xem bản mới." |
| Lưu và publish khi thiếu nội dung | 422 `publish-incomplete` → gắn lỗi vào ô thiếu, focus ô đầu |
| Lưu với chủ đề đã lưu trữ | Lưu được; toast ghi chủ đề bị bỏ (`dropped_topics`) |
| Rời chi tiết nghĩa khi chưa lưu | Hộp "Rời trang?" |
| Phiên hết hạn khi đang sửa nghĩa | Bản đang sửa giữ trong `sessionStorage`; đăng nhập lại thì hỏi khôi phục (§4.6) |

## 7. Kiểm thử

- **API (`apps/api`):** unit test cho mỗi thay đổi ở §5: trường email (gồm người không tìm thấy và tác nhân hệ thống), `lookup` (mỗi `reason`, 404, giới hạn tần
  suất), quyền đọc lý do (editor đọc được, không sửa được), `refundable`, `test-quota` (gồm số đếm vượt `max` và cửa sổ mới), `guard`, `purpose` của lỗi gần
  nhất, `missing[]`, `status` lần cấp (đủ 5 giá trị, gồm thu hồi tay với lý do "replaced" ra `revoked`), `last_change`, đọc một báo lỗi, `option_index`,
  `defaults`, `system` của người thao tác.
- **Admin unit (`apps/admin`):** hàm `*-api.ts` (dựng query, đổi ngày Việt Nam, bỏ giá trị lọc sai trong URL), đổi mã → chữ, luật ẩn / hiện nút theo quyền,
  component mới trong `ui/`, router mới (route cũ giữ nguyên), blocker ở `Shell` (chặn khi đổi trang, không chặn khi đổi `search`, không chặn sau khi lưu),
  giữ và khôi phục bản đang sửa trong `sessionStorage`.
- **Admin e2e mock (`e2e/`):** mỗi màn các trường hợp biên ở §6 (lỗi 409, 400, 429, rỗng, quyền editor). Thêm màn mới vào `a11y.spec.ts` và `ui-guidelines.spec.ts`.
- **Admin e2e trên stack thật (`e2e-real/`, AD10):** mỗi màn có ghi dữ liệu một test đi luồng chính:

| Milestone | Test |
|---|---|
| M0 | 8 test cũ vẫn qua trên router mới; Minh (`editor`) mở `/staff` thấy trang "không có quyền" |
| M1a | Thêm model `fake`; chọn cho `generate_cloze`; Tình trạng "Sẵn sàng"; sửa lời dặn, lưu, chạy thử ra kết quả |
| M1b | Thêm ví dụ; chạy bộ ví dụ; lần chạy tới "Xong"; Chi phí có dòng; tìm lần gọi theo `operation_id` |
| M2 | Đổi một ô ở hai tab, lưu; lịch sử có hai dòng với email admin |
| M3 | Dựng một báo lỗi câu AI qua API; Minh lọc theo lý do, xác nhận lỗi; Trả lượt có dòng với email; admin thêm một lý do rồi tắt nó; nhận một dạng chia rồi hoàn tác |
| M4 | Khóa và mở khóa Khoa; Minh tra email Lan, cấp Pro, sửa ngày, thu hồi; admin cấp Pro bắt đầu ngay cho Lan hai lần, lần đầu thành "Bị thay thế" |
| M5 | Sửa trình độ một từ; lưu bản nháp một nghĩa, publish hàng loạt; thêm và lưu trữ một chủ đề |

  Job `admin-e2e-real` thêm `AI_FAKE_ENABLED=true` (T5). Dữ liệu dựng qua API trong `global-setup.ts` hoặc ngay trong test; không có lời gọi AI thật.

  **Tài khoản.** `auth.register.ip` chỉ cho 5 lần đăng ký mỗi giờ mỗi IP (`apps/api/src/common/config/app-config.ts:109`), và `global-setup.ts` đã đăng ký
  2 (admin, learner; `e2e-real/global-setup.ts:20-32`). Vì vậy M0 dựng mọi tài khoản **một lần** trong `global-setup.ts` và lưu vào state, không test nào tự
  đăng ký: admin, learner (đã có), Minh (`editor`, tạo bằng `POST /v1/admin/users` với `must_change_password: false`), "Lan" (người học để báo lỗi và cấp
  gói), "Khoa" (người học **chỉ** để khóa / mở khóa, vì khóa thu hồi mọi phiên của người đó). Lan và Khoa tạo như editor rồi đổi `staff_role` về `null`
  (`POST /v1/admin/users` dùng rule `user.write`, không tính vào `auth.register.ip`, `staff.controller.ts:36-54`), rồi `PATCH /v1/me` `native_language: 'vi'`
  (thiếu thì mọi route người học trả 403 `profile-incomplete`). Số lần đăng ký giữ là 2.

  **Dựng báo lỗi câu AI (M3)**, qua API trong `global-setup.ts`: admin thêm model `fake` và chọn cho `generate_cloze` → cấp Pro cho Lan → Lan thêm một từ vào
  nhóm, mở phiên luyện, nhận câu AI, trả lời → Lan gửi báo lỗi với lý do có trả lượt. Plan ghi từng lệnh gọi, vì đây là phần dựng dữ liệu dài nhất đợt.
- **Chạy thật (Claude, mỗi milestone):** API + worker thật, Postgres, Redis, Mailpit, AI giả. Đi hết các màn của milestone ở 1440 và 390; ảnh màn thật đặt cạnh khung
  Figma tương ứng, lưu trong delivery record.
- **Test flow cho chủ dự án** (AD10, không chặn merge): thêm mục admin vào `docs/deliveries/giao-dien-admin-test-flow.md`, gồm cách gọi AI thật bằng key của bạn ở
  M1b (thêm model, chọn cho thao tác, đặt trần lời gọi, chạy bộ ví dụ).

## 8. Xong khi

Mỗi milestone (M0 cũng vậy; ở M0, mục 3 là ảnh các màn cũ trên router mới và trang "không có quyền" cạnh A/71e):
1. CI xanh trên PR (`api`, `web`, `admin`, `admin-e2e-real`).
2. Test e2e trên stack thật của milestone (§7) qua trong CI.
3. Claude đã chạy thật và lưu ảnh màn cạnh khung trong `docs/deliveries/giao-dien-admin.md`.
4. Mục test flow của milestone đã viết.

Cả đợt: M5 merge; §9 đã sửa; as-built ghi vào `docs/deliveries/giao-dien-admin.md`.

## 9. Tài liệu phải sửa

- `CLAUDE.md`: bỏ câu "admin UI will probably be refactored… treat the current visual layer as provisional" và "Known items left for that refactor: B25E30…"
  (AD2, AD12); cập nhật dòng "admin screens other than Giao dịch show Sắp có"; thêm mục "Đợt giao diện admin — plan & as-built".
- Memory `project_admin_ui_refactor.md`: ghi việc làm lại đã xong qua UI refresh B (AD2).
- `docs/deliveries/buoc-2-5.md`: ghi B25E30 đã sửa ở UI refresh B (trỏ `ui-refresh-b.md:123`).
- Bản chữ `ban-chu-giao-dien.md` §8: bỏ nhãn A/74 "Người học đồng ý cho xem từ này"; sửa luật mã lý do A/75b; thêm câu cho các lỗi mới ở §4.5, §6.
- Figma page 04: thêm mục "Giao dịch" vào thanh bên (vẽ bù, không chặn code).

## 10. Rủi ro và chỗ chưa kiểm

- **R1 — Chưa gọi API thật để đối chiếu.** Ba file đối chiếu chỉ đọc code ở `6e72bb3`. Test e2e trên stack thật của từng milestone là chỗ bắt lệch.
- **R2 — Đổi router (T2) đụng mọi màn cũ.** Giảm rủi ro: làm riêng ở PR M0 (T8), chạy lại toàn bộ test admin (unit, mock, thật) trước khi có màn mới.
- **R3 — Phân biệt "Bị thay thế" với "Đã thu hồi" (10.4).** Đã chọn cách suy theo lần cấp mới cùng mốc (T7), không cần migration. Hai mốc bằng nhau vì cả hai
  ghi cùng biến `now` của JS (độ chính xác mili giây), và lần mới ghi `createdAt: now` thay cho mặc định micro giây của cột (`grants.service.ts:135-136`).
  Chưa chạy thật: test e2e trên stack thật của M4 (cấp Pro hai lần cho Lan, thấy "Bị thay thế") xác nhận hai cột bằng nhau trong Postgres. Nếu sai, quay về hai cách cũ: (a) thêm cột đánh dấu (migration) hoặc (b) chặn
  staff gõ chữ `replaced` (đổi luật, phải hỏi chủ dự án).
- **R4 — Giới hạn tần suất `lookup` (60/giờ) là `ASSUMPTION`.**
- **R5 — Nhóm B sẽ sửa Prompt và Bộ ví dụ.** Hai màn dựng theo API hiện có (D15, D18 Bước 6); phần hiển thị có thể phải đổi khi có bản nháp / publish và tiêu chí.
- **R6 — (bỏ)** Ngưỡng "Chưa có worker" dùng lại 30 giây của Lô nhập (§6.5).
- **R7 — Chuỗi violation của hai lỗi thinking** là chữ tiếng Anh trong code API; đổi chữ ở API thì màn mất câu riêng (có unit test giữ, §4.5).
- **R8 — Đợt dài (7 PR gồm M0, ~40 khung).** Thứ tự AD1 bảo đảm phần quan trọng nhất (AI) xong trước; nếu cần dừng sớm thì cắt từ M5 ngược lên.
- **R9 — Checkout chính của chủ dự án chậm 25 commit so với `dev` và `.env` thiếu `ADMIN_APP_URL`, `LEARNER_APP_URL`, `TERMS_VERSION`** (thấy khi chạy admin ngày
  27/10). Test flow ghi cách sửa.
- **R10 — (đã rõ)** `POST /v1/admin/users` dùng rule `user.write`, không tính vào giới hạn đăng ký (facts `plan-api-domain.md` §7).
- **R11 — Giữ bản đang sửa trong `sessionStorage` (§4.6)** chỉ trong một tab, mất khi đóng tab; chữ prompt và cài đặt nằm trên máy cho tới khi lưu hoặc bỏ
  (không chứa mật khẩu hay token).
