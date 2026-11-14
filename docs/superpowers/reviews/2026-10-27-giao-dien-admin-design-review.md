# Review design "Đợt giao diện admin" (27/10/2026)

Đối tượng: [`../specs/2026-10-27-giao-dien-admin-design.md`](../specs/2026-10-27-giao-dien-admin-design.md) (gọi tắt **design**, số dòng theo bản chưa commit
ngày 27/10/2026). Đọc kèm decision record, file câu hỏi, ba file đối chiếu API, bản chữ §8, design đợt giao diện §6.4/§10.
Code đọc trên `origin/dev` = `daf7cab` bằng `git show origin/dev:<path>`. Từ `6e72bb3` (mốc của ba file đối chiếu) tới `daf7cab`, `apps/api` chỉ đổi
6 file trong `src/learning/**` và `apps/admin` không đổi (`git diff --stat 6e72bb3 origin/dev -- apps/api apps/admin`), nên `path:line` của ba file đối
chiếu vẫn dùng được. Thư viện: `react-router` 8.4.0 trong `node_modules` của checkout này. Figma: xem khung A/71e (node `387:1767`).

## Kết luận

**Duyệt được sau khi sửa 6 điểm Important; không có Critical.** Mọi khẳng định về code mà tôi lấy mẫu (25 cái) đều đúng trên `origin/dev`, trừ ba chỗ nhỏ.
Các thay đổi API ở §5 đúng là chỉ thêm, và không đụng ranh giới module: mọi chỗ cần email đều đi qua `IdentityService` (`emailsOf`, `findUserIdByEmail` đã có).
Design cũng khớp decision record AD0–AD14 và T1–T5.

Phải sửa trước khi viết plan:
1. Phần "cảnh báo rời form" bằng `useBlocker` (§4.3) chưa tính tới ba cơ chế có thật trong admin: mỗi router chỉ được một blocker; đổi tab hay bộ lọc là đổi URL; hộp thoại là route con.
2. §4.4 và §6.10 nói "mở thẳng đường dẫn thì về trang đầu", nhưng khung A/71e và bản chữ §8.0 vẽ trang "Bạn không có quyền xem trang này."
3. Còn thiếu các trường hợp biên dùng chung cho mọi màn: phiên hết hạn khi đang sửa, 403 khi quyền bị thu, mạng rớt khi lưu với `expected_version`, Idempotency-Key khi gửi lại.
4. `usePollingStatus` không dùng nguyên được cho Bộ ví dụ.
5. Rủi ro R3 để mở có thể kéo theo một migration ở M4, trong khi đã có cách suy ra từ code mà không cần migration.
6. M1a quá lớn, và test trên stack thật dễ chạm giới hạn đăng ký 5 tài khoản mỗi giờ mỗi IP.

## Đã sửa vào design (27/10/2026, chủ dự án: "sửa đi")

Số dòng trong các mục phát hiện bên dưới là của bản design **trước khi sửa**. Bốn lựa chọn có tính quyết định được ghi thành T6–T9 trong decision record,
chờ duyệt cùng design.

| Mục | Sửa ở design | Ghi chú |
|---|---|---|
| I1 | §4.3 viết lại "Cảnh báo rời form": một blocker ở `Shell`, chỉ chặn khi đổi `pathname`, lưu xong hết bẩn, hộp thoại tự hỏi; thêm hàng ở §6.7 | T6 |
| I2 | §4.4 trang "Bạn không có quyền xem trang này." theo A/71e, áp cả màn cũ; §6.10; §1 "Không làm"; test M0 ở §7 | T9: Claude chọn theo khung và bản chữ |
| I3 | §4.6 mới "Trường hợp biên chung" (Idempotency-Key qua `useSubmitAction`, 409 do chính lần lưu trước, chạy thử khi mạng rớt, phiên hết hạn → `sessionStorage`, 403 → `recheck()`, 429, URL lọc sai); thêm hàng ở §6.4, §6.5, §6.7, §6.8, §6.11, §6.12; R11 | — |
| I4 | §6.5 hook đọc lại nhận `isTerminal` riêng; ngưỡng worker 30 giây dùng lại `useQueuedTooLong`; bỏ R6 | — |
| I5 | §5.4 10.4 thứ tự tính `status` và cách suy `replaced`; R3 viết lại; test M4 | T7; chưa kiểm trên Postgres thật |
| I6 | §3 thêm M0; §4.2 router ở M0; §7 tài khoản dựng một lần (5 người, 4 lần đăng ký), các bước dựng báo lỗi AI; §8; R2, R8, R10 | T8, đổi số PR của AD8 |
| M1 | §4.5 bỏ `topic-exists`, thêm 9 mã của M5, grep lại mỗi milestone | — |
| M2 | §5.4 10.1 tên `RateLimiter`, cách đọc, số đếm vượt `max`, lần lỗi cũng trừ lượt; §6.4 | — |
| M3 | §6.4 ba trường hợp chọn ví dụ khi chạy thử | — |
| M4 | §5.4 10.10 thêm `purpose` vào `last_error`; §6.1 | việc API nhỏ (AD9) |
| M5 | §6.5 tỷ giá lấy từ `values.ai.usd_vnd_rate` | — |
| M6 | §5.1 mọi người thao tác có `system: boolean` | — |
| M7 | §4.1 ô nào dùng `TextArea`, ô nào một dòng | — |
| M8 | §1 "24 mục, gồm Giao dịch"; §4.4 đổi đường dẫn và nhóm | — |
| M9 | §6.8 dòng phụ trả lượt theo đúng điều kiện API (thêm `ai_operation_id`) | không thêm trường `would_refund` |
| M10 | §4.2 test cũ giữ `MemoryRouter`, helper `createMemoryRouter` mới ở M0 | — |
| M11 | §6.9 "Khác" ở cuối là do seed; màn xếp theo `position` | — |
| M12 | §7 M3 thêm test thêm và tắt lý do | — |

## Phát hiện

### I1 — Important · §4.3 (dòng 100–101), §4.2, §6.7 (dòng 301) · `useBlocker` va với ba cơ chế có thật của admin

**Vấn đề.**
- (a) **Mỗi router chỉ được một blocker.** Design áp cảnh báo cho cả trang có form lẫn "mọi hộp thoại có form", nên có lúc hai blocker cùng bật (ví dụ hộp
  lịch sử hoặc hộp xác nhận mở trên trang Cài đặt đang sửa). Khi đó react-router chỉ cảnh báo "A router only supports one blocker at a time" và chặn không đúng.
- (b) **Đổi tab hay bộ lọc là một lần điều hướng.** Tab Cài đặt ghi vào `?tab=` (§6.7) và bộ lọc ghi vào URL (§4.3). Một blocker kiểu "form đang bẩn thì chặn"
  sẽ hỏi "Rời trang?" mỗi lần bạn đổi tab khi đang sửa dở, trong khi luồng chính của §6.7 lại là "đổi ô ở hai tab rồi lưu".
- (c) **Hộp thoại form là route con.** Ví dụ `/sources/new`: nút Hủy và lúc lưu xong đều gọi `navigate('/sources')`. Blocker gắn trong hộp thoại sẽ chặn
  luôn cả lần đóng sau khi lưu thành công, và chặn nút Hủy mà không phân biệt.

**Bằng chứng.**
- `react-router` 8.4.0: `router/router.js:1221` `warning(false, "A router only supports one blocker at a time")`.
- `useBlocker` gọi `useDataRouterContext` (`lib/hooks.js:1254`, `:821-824`).
- Route con của hộp thoại: `apps/admin/src/app/routes.tsx` (`uploads/new`, `sources/new`). Lệnh đóng hộp: `SourcesPage.tsx:52,115,154`, `PublishJobsPage.tsx:115`.

**Đề xuất.** Ghi vào §4.3:
- Chỉ có **một** `useBlocker`, đặt ở `Shell`. Mỗi form tự đăng ký trạng thái "đang bẩn" qua một context, như kiểu `shell-slots`.
- Hàm `shouldBlock` chỉ chặn khi `nextLocation.pathname` khác trang của form đang bẩn. Đổi `search` trên cùng trang (tab, bộ lọc) thì không chặn.
- Ngay sau khi lưu xong, form bỏ dấu "bẩn" trước khi điều hướng.
- Hộp thoại: bấm Hủy hay Esc khi form bẩn thì hỏi trong chính hộp, không qua blocker.
- Thêm các hàng này vào bảng When → Then của §6.7 và §6.4.

### I2 — Important · §4.4 (dòng 106), §6.10 (dòng 355) · Mâu thuẫn với khung A/71e và bản chữ

**Vấn đề.** Design ghi: editor mở thẳng đường dẫn chỉ dành cho admin thì "về trang đầu tiên được phép (`canAccess`, như hiện nay; khung A/71e)", và ở §6.10:
"Minh mở thẳng `/users` → Về trang đầu Minh được mở (A/71e)". Nhưng khung A/71e (Figma `387:1767`, đã xem) vẽ trang "Người dùng" với thẻ "Bạn không có quyền
xem trang này." và nút [Về trang chủ], thanh bên không có mục Người dùng. Bản chữ §8.0 (`ban-chu-giao-dien.md:572`) cũng ghi đúng như khung. Code hiện tại
thì chuyển hướng im lặng (`apps/admin/src/app/Shell.tsx:132` `<Navigate to={homePath(...)} replace />`).

**Đề xuất.** Chọn một và ghi rõ vào design: (a) theo khung và bản chữ, nghĩa là đổi `Shell.tsx:132` thành trang báo không có quyền. Việc này đổi hành vi của
cả màn cũ (Lô nhập…), nên phải sửa cả test e2e `shell.spec.ts`. Hoặc (b) giữ chuyển hướng, rồi sửa khung A/71e và bản chữ §8.0 trong §9. Đây là việc chọn
hành vi, nên hỏi chủ dự án như một quyết định (AD9: "việc đổi luật thì hỏi").

### I3 — Important · §6 (mọi bảng When → Then), §4.3 · Thiếu trường hợp biên dùng chung cho cơ chế của chính màn

Các bảng ở §6 phủ tốt lỗi nghiệp vụ (409, 400, 429 của từng API). Nhưng chưa có hàng nào cho các cơ chế dùng chung, theo đúng yêu cầu của
`SPEC_WRITING_CONVENTIONS.md`:

| When | Vì sao cần ghi | Bằng chứng |
|---|---|---|
| Phiên hết hạn (refresh thất bại) khi đang sửa Prompt, Cài đặt, Chi tiết nghĩa | `RequireSession` thay `<Outlet/>` bằng `<Navigate to="/login">`. Trang bị gỡ ngay trong lần render đó, nên chữ đang sửa (tới 8.000 ký tự) mất mà không có hộp "Rời trang?". Cần chọn một cách: giữ bản nháp (ví dụ `sessionStorage` theo khóa form, khôi phục sau khi đăng nhập lại về `from`), hoặc ghi rõ là chấp nhận mất | `apps/admin/src/app/RequireSession.tsx:12-14` |
| 403 `forbidden` khi quyền bị thu giữa phiên (admin đổi Minh từ `editor` về người học) | `me.permissions` ở client vẫn cũ, menu vẫn hiện mục, còn API trả 403 | `permission.guard.ts:33-43` đọc vai trò mới mỗi request |
| Mạng rớt khi lưu, rồi gửi lại `PUT` prompt / `PUT` thao tác | Hai endpoint này dùng `expected_revision` / `expected_version` và **không** có Idempotency-Key. Nếu lần đầu đã ghi mà mất response, lần gửi lại nhận 409 `prompt-revision-conflict` / `operation-settings-conflict`, và màn báo "Người khác vừa lưu" dù chính bạn vừa lưu. Màn nên tải lại bản mới nhất; nếu `revision` mới trùng chữ bạn đang có thì coi như đã lưu | `ai.md` §A/81, §A/82; `prompts.service.ts:98,106` (qua file đối chiếu) |
| Gửi lại request cần Idempotency-Key (Cài đặt `PUT`, chạy bộ ví dụ, cấp gói, xử lý báo lỗi, nhận dạng chia, thêm lý do) | Admin đã có luật gửi lại trong `useSubmitAction`: mạng rớt thì giữ key; 409 "đang chạy" thì tự gửi lại sau `Retry-After`; `idempotency-key-abandoned` thì đổi key; 429 thì khóa nút. Design nên ghi "mọi lệnh có Idempotency-Key dùng `useSubmitAction`", để màn mới không tự làm lại khác đi | `apps/admin/src/features/content/useSubmitAction.ts:9-60`, `api/idempotency.ts:5-15` |
| URL có giá trị lọc sai (`/reports?status=foo`), hoặc token trang cũ | API trả 400 `validation-failed` cho tham số sai. Màn nên bỏ giá trị không hợp lệ khi đọc URL, thay vì hiện lỗi | `admin-catalog.queries.ts:59-69` (qua `content.md`) |
| Bấm [Chạy thử] khi mạng rớt | Chạy thử không có Idempotency-Key và gọi AI thật (tốn tiền, tốn lượt). Gửi lại là một lần chạy mới, nên cần ghi "không tự gửi lại; người dùng bấm lại" | `admin-ai-prompts.controller.ts:47-56` (qua `ai.md`) |

**Đề xuất.** Thêm một mục §4.6 "Trường hợp biên chung" với các hàng trên. Mỗi màn ở §6 chỉ ghi phần khác đi.

### I4 — Important · §6.5 (dòng 273–274, 282) · `usePollingStatus` không dùng nguyên được, ngưỡng 60 giây mâu thuẫn với quy ước sẵn có

**Vấn đề.** `usePollingStatus<T extends { status: JobStatus }>` với `JobStatus = 'queued' | 'running' | 'succeeded' | 'partial' | 'failed'`, và `isTerminal`
chỉ biết `succeeded`, `partial`, `failed`. Lần chạy bộ ví dụ lại có `status` là `queued`, `running`, `finished`, `failed`. Dùng nguyên hook này thì TypeScript
báo lỗi; nếu ép kiểu cho qua thì lần chạy `finished` bị đọc lại mỗi 2 giây mãi. Thêm nữa, admin đã có `QUEUED_HINT_AFTER_S = 30` và `useQueuedTooLong` cho đúng
câu "worker chưa chạy" (B25E8), còn design lại đặt một `ASSUMPTION` mới là 60 giây (R6).

**Bằng chứng.** `apps/admin/src/features/jobs/usePollingStatus.ts:7-12,17-23,26-28`; `content-api.ts:11`; trạng thái lần chạy ở `ai.md` §A/83
(`eval-runs.service.ts:39,42`).

**Đề xuất.** Ghi: tổng quát hóa hook (nhận hàm `isTerminal` riêng), hoặc viết hook riêng cho eval. Dùng lại `useQueuedTooLong` với 30 giây và bỏ R6.

### I5 — Important · §5.4 10.4 (dòng 192), §10 R3 (dòng 442–444) · R3 để mở có thể đổi phạm vi M4; đã có cách suy ra không cần migration

**Vấn đề.** Design để việc chọn giữa (a) thêm cột (migration) và (b) chặn staff gõ chữ `replaced` "tới khi làm". Phương án (b) là đổi luật, phải hỏi; còn (a)
thêm migration vào M4. Code cho thấy còn một phương án (c) không cần migration. Khi cấp Pro bắt đầu ngay, lần cũ được ghi `revokedAt: now, revokedBy: actorId,
revokeReason: 'replaced'`, và lần mới được tạo **trong cùng transaction** với `createdAt: now`, `grantedBy: actorId`, cùng `userId`, `kind: 'plan'`. Vậy
"Bị thay thế" = có một lần cấp `plan` khác của cùng người học với `created_at = revoked_at` và `granted_by = revoked_by`. Một lần thu hồi bằng tay không thể
trùng mốc thời gian đó (nó cập nhật dòng ở một request khác). `ASSUMPTION`: chưa kiểm hai mốc `now` có bằng nhau tới từng mili giây trong DB; code dùng cùng
một biến `now`, nhưng Postgres giữ tới micro giây, còn `now` là `Date` của JS, chỉ tới mili giây.

**Bằng chứng.** `apps/api/src/entitlements/grants/grants.service.ts:100,124-137` (`const now = this.clock.now()`; `updateMany … revokedAt: now, revokedBy:
actorId, revokeReason: 'replaced'`; `create … createdAt: now`).

**Đề xuất.** Chốt ngay trong design, không để tới lúc code. Đề xuất (c), có unit test: thu hồi tay với lý do "replaced" vẫn ra `revoked`. Nếu không chọn (c)
thì hỏi chủ dự án trước khi viết plan, vì (a) có migration và (b) là đổi luật.

### I6 — Important · §3 (dòng 55), §7 (dòng 402–413), §10 R2 · M1a quá lớn; test trên stack thật dễ chạm giới hạn đăng ký

**Vấn đề.**
- (a) M1a gồm: đổi router (đụng mọi màn cũ, R2), menu 24 mục, đổi quyền AI, 7 component `ui/`, ba điểm guideline, mã lỗi client, 4 màn (6 khung), 3 thay đổi
  API, và bật `AI_FAKE_ENABLED` cho CI. Đây là PR lớn nhất đợt, mà lại gom phần rủi ro nhất (router) với phần quan trọng nhất (màn AI).
- (b) Giới hạn `auth.register.ip` là 5 tài khoản mỗi giờ mỗi IP. `global-setup.ts` hiện đã đăng ký 2 tài khoản (admin, learner). Các test mới cần Minh
  (`editor`), một người học có câu AI để báo lỗi (M3), và một người học để khóa và cấp gói (M4). Nếu mỗi test tự đăng ký thì sẽ chạm trần. Khóa người học
  dùng chung cũng thu hồi mọi phiên của người đó và làm hỏng các test khác.
- (c) M3 "dựng một báo lỗi câu AI qua API" cần cả chuỗi: cấp Pro, thêm model `fake`, chọn model cho thao tác, người học mở phiên có câu AI, trả lời, báo lỗi.
  Design ghi một dòng, nhưng đây là phần dựng dữ liệu tốn công nhất đợt.

**Bằng chứng.** `apps/api/src/common/config/app-config.ts:109` (`'auth.register.ip': { by: 'ip', max: 5, windowSeconds: 3600 }`);
`apps/admin/e2e-real/global-setup.ts:20-32`; `staff.service.ts:203-207` (khóa thì thu hồi phiên, qua file đối chiếu).

**Đề xuất.**
- Tách một PR "M0 — khung chung" trước M1a: data router, menu, quyền, component `ui/`, blocker (I1), mã lỗi client, `AI_FAKE_ENABLED` cho CI. Chạy lại toàn
  bộ test cũ. M1a sau đó chỉ còn màn AI và API của nó.
- §7 ghi rõ: tài khoản dựng một lần trong `global-setup` (tối đa 5, Minh tạo bằng `POST /v1/admin/users` nếu endpoint đó không tính vào giới hạn đăng ký;
  `ASSUMPTION`, chưa kiểm). Người học bị khóa là tài khoản riêng. Ghi các bước dựng báo lỗi AI ở M3.

### M1 — Minor · §4.5 (dòng 133–136) · Danh sách mã lỗi client thiếu và thừa

- `topic-exists` **đã có** trong `KNOWN_ERROR_SLUGS` (`apps/admin/src/api/problem.ts:58`).
- M5 (thêm nghĩa, lưu nghĩa) còn thiếu các mã API ném ra mà màn sẽ gặp: `sense-exists`, `replacement-exists`, `replacement-waiting`, `sense-retired`,
  `sense-entry-mismatch`, `revision-rejected`, `unknown-topic`, `topic-archived`, `too-many-examples` (tìm thấy trong `content/senses/senses.service.ts`,
  `admin-publish.controller.ts`, `publish.service.ts`, `import-content.ts`). Đề xuất: ghi "mọi mã mà endpoint của màn ném ra", rồi liệt kê lại theo grep.

### M2 — Minor · §5.4 10.1 (dòng 189), §6.4 (dòng 254) · `test-quota`: tên lớp, và số đếm giảm cả khi gọi lỗi

- Lớp tên là `RateLimiter` (file `rate-limiter.service.ts`), không phải `RateLimiterService` (`rate-limiter.service.ts:10`). Hàm đọc chỉ cần
  `findUnique` theo `key_windowStart`, với khóa `ai.test:user:<userId>`.
- `RateLimitGuard` gọi `hit` **trước** handler và trước `IdempotencyInterceptor` (`rate-limit.guard.ts:17-33`). Vì vậy một lần chạy thử bị 409
  `model-not-set` hay 400 vẫn trừ lượt, và gửi lại lần chạy bộ ví dụ với cùng Idempotency-Key cũng trừ lượt. Số đếm cũng vượt `max` (tăng trước khi kiểm,
  `:28-34`), nên `remaining = max(0, max − count)`. Ghi hai điều này vào §6.4 để test không đoán sai.
- Cửa sổ `floor(now / 3600 s)` theo giờ UTC, trùng giờ tròn Việt Nam (+07:00), nên `resets_at` = đầu giờ sau là đúng (`:22-24`).

### M3 — Minor · §6.4 (dòng 252–253) · Chạy thử khi không chọn ví dụ nào

API: không gửi `example_ids` thì lấy **5 ví dụ đầu của Bộ ví dụ** nếu có; nếu Bộ ví dụ trống mới dùng ví dụ trong prompt
(`ai/prompts/prompts.service.ts:176-192`). Design chỉ nói hai trường hợp "đã chọn" và "Bộ ví dụ trống". Nên ghi thêm trường hợp thứ ba vào bảng.

### M4 — Minor · §6.1 (dòng 208) · "Ghi kèm mục đích nếu API có trường này"

API **không** trả mục đích trong `last_error`: chỉ có `{ at, outcome, http_status }`, và câu truy vấn không chọn `purpose` (`ai/reports/reports.service.ts:90-92,112`).
Bỏ chữ "nếu", chọn hẳn một: thêm `purpose` vào `last_error` (chỉ thêm, một cột vào `DISTINCT ON`), hoặc chỉ ghi chú dưới bảng.

### M5 — Minor · §6.5 (dòng 272) · ₫ "theo tỷ giá hôm nay" lấy ở đâu

Lần chạy chỉ có `cost_usd`. Client cần tỷ giá: `values.ai.usd_vnd_rate` của `GET /v1/admin/settings` (admin đọc được), hoặc thêm `cost_vnd` vào lần chạy
(chỉ thêm). Ghi rõ nguồn.

### M6 — Minor · §5.1 (dòng 164) · `system: true` chỉ có ở một trường hợp

`{ id, email: null, system: true }` làm object người thao tác có hai dạng. Nên luôn trả `system: boolean` (mặc định `false`), hoặc chỉ dùng
`id === AI_SYSTEM_ACTOR_ID` ở client (hằng số đã cố định, `ai/ai.constants.ts:46`).

### M7 — Minor · §4.1 (dòng 77) · `TextArea` cho "lý do" không hợp lý do khóa tài khoản

Lý do khóa không được có ký tự điều khiển, nên không có xuống dòng (`staff.schemas.ts:26-29`, qua file đối chiếu §2.3). Ô đó phải là `TextField` một dòng.
Ghi rõ ô nào dùng `TextArea`.

### M8 — Minor · §4.4 (dòng 108–127), §1 (dòng 20) · Đổi đường dẫn và nhóm chưa ghi; "24 mục" hai cách hiểu

- `nav.ts` hiện có `/reported`, `/irregular-forms` (nhóm `practice`). Design dùng `/reports`, `/unknown-forms`, và chuyển "Dạng chia chưa biết" sang nhóm
  Nội dung. Việc chuyển nhóm khớp bản chữ §8.0 (`ban-chu-giao-dien.md:566`), nhưng design không nói là đang đổi tên và đổi nhóm (`apps/admin/src/app/nav.ts:31-32`).
- "Menu 24 mục theo thanh bên Figma, thêm Giao dịch": bảng §4.4 đếm ra 24 mục **đã gồm** Giao dịch. Viết lại "24 mục, gồm Giao dịch".

### M9 — Minor · §6.8 (dòng 319) · Điều kiện trả lượt

API trả lượt khi `question_source = ai`, `confirmed`, `ai_charged`, `ai_operation_id` khác null, và lý do `refundable` (`practice/reports/reports.service.ts:211-213`,
`refunds.ts:14-18`). Dòng phụ ở màn chỉ xét `ai_charged` và `refundable`. Không sai thực tế (câu AI luôn có `ai_operation_id`), nhưng có thể cho
`refundable` của báo lỗi tính sẵn cả điều kiện đó (tên `would_refund`), để màn không phải tự ghép luật.

### M10 — Minor · §4.2 (dòng 90), §10 R2 · Test đơn vị dùng `MemoryRouter`

Ngoài `routes.test.tsx` và `shell-slots.test.tsx`, các helper `features/account/test-utils.tsx`, `features/staff/test-utils.tsx`, `ui/ui.test.tsx` và
`app/session-loading.test.tsx` đều dựng `MemoryRouter`. Màn mới nào gọi `useBlocker` phải test bằng `createMemoryRouter`, nên cần thêm một helper dùng chung.
`SessionProvider` và `ToastRegion` đang nằm ngoài router (`App.tsx:28-34`), và vẫn ngoài được khi đổi sang `RouterProvider` vì không gọi hook router
(đã grep `useNavigate` trong `apps/admin/src`: chỉ nằm trong các trang).

### M11 — Minor · §6.9 (dòng 334) · "Khác luôn ở cuối"

Seed đã đặt `position = 1000` cho `other` (`prisma/migrations/20261023090000_report_reasons_order_labels/migration.sql:3`), nhưng admin vẫn sửa được thứ tự.
Ghi rõ đây là seed hay là màn tự xếp "Khác" xuống cuối.

### M12 — Minor · §7 (dòng 402–411) · Chưa đủ "mỗi màn có ghi dữ liệu một e2e thật" (AD10)

Lý do báo lỗi (A/75: thêm, sửa, tắt) có ghi dữ liệu nhưng không có test trên stack thật trong bảng M3. Đề xuất: thêm "admin thêm lý do, tắt lý do".

## Đã kiểm, thấy đúng (trên `origin/dev`)

| # | Khẳng định của design | Bằng chứng |
|---|---|---|
| 1 | Admin dùng `BrowserRouter` + `<Routes>` | `apps/admin/src/app/App.tsx:3,29-31`, `routes.tsx:26` |
| 2 | `useBlocker` cần data router, `hooks.js:1254`, react-router 8.4.0 | `apps/admin/package.json` (`react-router` 8.4.0); `lib/hooks.js:1254,821-824` |
| 3 | `routes.test.tsx`, `shell-slots.test.tsx` có | `git ls-tree` `apps/admin/src/app/` |
| 4 | `PermissionGuard` lấy quyền ở method trước class (`:22-24`) | `identity/staff/permission.guard.ts:22-24` |
| 5 | Đã có tiền lệ quyền ở method ghi đè class trong cùng controller | `practice/reports/admin-reports.controller.ts:29-30,53-54` |
| 6 | Lý do báo lỗi: class `settings.manage`, GET/POST/PATCH không có quyền riêng | `admin-report-reasons.controller.ts:16-43` |
| 7 | `refundable` hiện tại của lý do là thứ luật trả lượt dùng khi xác nhận | `reports.service.ts:203,211-213`; `refunds.ts:14-18` |
| 8 | Dạng `user: { id, email }` của Giao dịch (`:25,66-68`) | `entitlements/transactions/transactions.service.ts:25,66-68` |
| 9 | `IdentityService.emailsOf` gom theo trang, id không thấy thì bỏ qua (→ `email: null`) | `identity/profile/identity.service.ts:107-113` |
| 10 | Lọc theo email do API tra ra id; email không có tài khoản thì trả rỗng (tiền lệ) | `transactions.service.ts:55-59`; `identity.service.ts:116-121` |
| 11 | `AI_SYSTEM_ACTOR_ID` ở `ai.constants.ts:46` | `ai/ai.constants.ts:46` |
| 12 | Hai chuỗi violation thinking ở `model-rules.ts:30,32` | `ai/models/model-rules.ts:28-33` |
| 13 | `PROMPT_GUARD` là hằng, API không trả | `ai/prompts/prompt-rules.ts:9` |
| 14 | Cửa sổ rate limit theo giờ tròn (`:23-24`); `ai.test` 20/giờ theo user, dùng chung với eval | `common/rate-limit/rate-limiter.service.ts:22-24`; `common/config/app-config.ts:127`; `ai/api/admin-ai-eval.controller.ts:62` |
| 15 | Status trả 6 thao tác đúng thứ tự `AI_OPERATIONS` | `ai/reports/reports.service.ts:95` |
| 16 | Cả 5 controller AI đòi `settings.manage` ở class | `ai/api/admin-ai-{eval,models,operations,prompts,reports}.controller.ts` (`:25,:17,:13,:20,:17`) |
| 17 | `nav.ts` dùng `roles.manage` cho AI, 3 mục AI, `/transactions` dùng `settings.manage` | `apps/admin/src/app/nav.ts:18-19,35-38` |
| 18 | Bảng §4.4 đếm đủ 24 mục, khớp thanh bên bản chữ §8.0 | `ban-chu-giao-dien.md:563-570` |
| 19 | `canAccess` theo mục cha nên `/reports/{id}` theo quyền `/reports`; `/report-reasons` không bị nhầm vào `/reports` | `nav.ts:55-62` |
| 20 | `SETTINGS_DEFAULTS` có; trả `defaults` chỉ cần `toApiValues(SETTINGS_DEFAULTS)` | `settings/settings.definitions.ts:46,234`; `admin-settings.controller.ts:23-26` |
| 21 | Violation chéo trả đúng khóa `values.practice.default_questions_per_session` (§6.7) | `settings.definitions.ts:252-261` |
| 22 | `missing[]` chỉ có khi `status=unpublishable` | `content/catalog/admin-catalog.queries.ts:154-158,247-249` |
| 23 | Thay thế lần cấp ghi `revoke_reason = 'replaced'` (`:124-130`) | `entitlements/grants/grants.service.ts:124-130` |
| 24 | `lookup` tính được bằng `grantRefusal` sẵn có; thứ tự lý do khớp design (`self-grant` → `target-is-admin` → `target-is-staff`) | `entitlements/grants/grant-rules.ts:23-30`; `grants.service.ts:101-108` (dùng `IdentityService.getProfile`) |
| 25 | `option_index` dễ thêm: `answer_raw` đã là chỉ số lựa chọn | `practice/reports/snapshot.ts:25-26` |
| 26 | Snapshot báo lỗi không trả người gửi, nên AD7 không thêm email người học ở Báo lỗi là đúng | `reports.service.ts:45-55` |
| 27 | `TransactionsPage.tsx:133` là ô ngày `type="date"`; `usePollingStatus.ts:7` là `POLL_INTERVAL_MS = 2000` | hai file đó |
| 28 | `admin-e2e-real` đã chạy worker; chưa có `AI_FAKE_ENABLED` (đúng là phải thêm, T5) | `.github/workflows/ci.yml`, job `admin-e2e-real` (dòng `nohup node dist/worker.js`) |
| 29 | Ranh giới module: email, `lookup`, lọc theo email đều đi qua `IdentityService`; AI module đã import `IdentityModule` | `ai/ai.module.ts:2,33`; Practice, Entitlements đã inject `IdentityService` |
| 30 | §5 chỉ thêm: trường mới cạnh trường cũ, endpoint đọc mới, mở rộng quyền đọc một endpoint, trường mới trong snapshot mới | đọc từng mục §5.1–§5.4 với code ở trên |

**Khớp decision record:** AD1 (§3 thứ tự), AD2/AD12-13.3 (§9), AD4 (§7 ảnh cạnh khung), AD5 (15 màn, bỏ nhãn A/74 ở §6.8), AD6, AD7 (§5.1, đủ 6 chỗ
của câu 8), AD8, AD9 (§5.4 đủ 10.1–10.9), AD10 (§8, trừ M12), AD11, AD12 (§4.3, §4.4), AD13 (§5.2 gồm cả lọc email ở A/76, A/78), AD14 (§5.3), T1–T5. Không
thấy AD nào bị hiểu khác. R3 chưa chốt là chỗ T4 còn treo (I5).

## Chưa kiểm được

- Chưa gọi API thật; mọi điểm ở trên là đọc code (giống R1 của design).
- Figma: chỉ xem A/71e. Chưa so các khung A/70–A/90 khác với từng bảng §6.
- I5 (c): chưa kiểm `revoked_at` của lần cũ và `created_at` của lần mới có bằng nhau tới từng mili giây trong DB (`ASSUMPTION`).
- I6: chưa kiểm `POST /v1/admin/users` (tạo staff) có tính vào `auth.register.ip` không (`ASSUMPTION`).
- I3, hàng phiên hết hạn: kết luận "mất dữ liệu" suy từ `RequireSession.tsx:12-14` (trang bị gỡ khi trạng thái thành `signed-out`). Chưa chạy thử trong trình duyệt.
- Chưa đo thời gian của `admin-e2e-real` khi có thêm khoảng 14 test.
