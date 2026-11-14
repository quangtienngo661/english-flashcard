# Review độc lập — Đợt giao diện người học và Đợt giao diện admin (29/10/2026)

Phạm vi: `apps/web` dưới `/vi/app`, `/en/app` (M1–M5b, PR #123–#128, #131) và 24 mục admin trong `apps/admin` (PR #144–#171), cùng các endpoint API mà
hai đợt thêm. Không xét đợt cải thiện nhóm A, nhóm B, Bước 8. Đọc trên worktree `review-buoc-1-8-b95feb`, nhánh `docs/review-buoc-1-8` (cắt từ `origin/dev`,
HEAD `867d385`). Chỉ đọc code: không sửa code, không chạy migration, không gọi AI hay Google thật, không đụng DB.

**Giới hạn của review này:** worktree không có `node_modules` và review không cài phụ thuộc, nên **không chạy lại unit test hay e2e**. Số test chỉ lấy
từ as-built; bằng chứng "test xanh" là trạng thái CI trên GitHub (đọc bằng `gh pr view`). Không mở trình duyệt, không so Figma.

Mức: **Cao** (lỗ bảo mật, sai tiền/lượt, mất dữ liệu, quyền sai, tài liệu hứa điều code không làm ở chỗ quan trọng, có kịch bản hỏng cụ thể), **Vừa**, **Thấp**.

## (a) Bảng "Xong khi"

### Người học (design `2026-10-22-giao-dien-nguoi-hoc-design.md` §11, §10)

| # | Mục | Trạng thái | Bằng chứng |
|---|---|---|---|
| 1 | CI xanh ở mọi PR | **Verified** | `gh pr view 123..128,131`: cả 4 check (`api`, `web`, `admin`, `admin-e2e-real`) = SUCCESS ở cả 7 PR, base `dev` |
| 2 | Mỗi mốc Claude chạy thật, gửi ảnh đặt cạnh khung Figma; chủ dự án "ok" phần hình rồi mới merge | **Một phần** | As-built ghi đã chạy thật (M2 "132 ảnh" `giao-dien-nguoi-hoc.md:106`; M5a 36 ảnh `:193`; M5b 48 ảnh `ledger:418`). Ảnh **không nằm trong repo** (`apps/web/test-results/shots/*`, "không commit", `giao-dien-nguoi-hoc.md:170`, `ledger:418`); `git ls-files` không có ảnh mốc nào của đợt, chỉ có ảnh audit sau đó (`docs/audit/2026-10-26-*`). Từ M4 chủ dự án bỏ bước duyệt ảnh (`giao-dien-nguoi-hoc.md:169`). Không có bằng chứng "đặt cạnh khung Figma" (UW-8) |
| 3 | Tài liệu kiểm mỗi mốc | **Verified (có file)** | `giao-dien-nguoi-hoc-test-flow.md` có mục M1 (`:60`), M2 (`:90`), M3 (`:123`), M4 (`:154`), M4b (`:189`), M5a (`:215`), M5b (`:242`). Mọi lệnh `pnpm …` trong file có trong `scripts` của `package.json` tương ứng (lệnh ở mục d) |
| 4 | Script dữ liệu thử + CSV ~300 nghĩa, chỉ chạy khi AI/billing giả | **Có file, review không chạy** | `apps/api/scripts/learner-test-setup.mjs` (kiểm `AI_FAKE_ENABLED`, `BILLING_FAKE_ENABLED` ở `:223-235`); `scripts/fixtures/learner-sample.csv` 304 dòng (303 nghĩa + header) |
| 5 | Chủ dự án tự kiểm theo tài liệu kiểm (D4); lỗi đã sửa hoặc ghi lại | **Chưa làm** | Không có dòng kết quả nào trong test flow (grep "đã chạy / kết quả" không thấy). Đã biết (D4) |
| §10 | e2e CSP không có vi phạm | **Verified trong CI** | `apps/web/e2e/csp.spec.ts:20-38` (landing và `/vi/app`); job `web` SUCCESS |
| §10 | e2e "cờ tắt → 307" (build riêng hoặc test `proxy.ts`) | **Configured, chưa verified trên bản build** | Chỉ có unit test hàm `learnerAppRedirect` (`src/lib/learner-app-flag.test.ts:3-31`); `proxy.ts` không có test; CI chỉ build với cờ bật (UW-3) |

### Admin (design `2026-10-27-giao-dien-admin-design.md` §8)

| # | Mục (mỗi milestone) | Trạng thái | Bằng chứng |
|---|---|---|---|
| 1 | CI xanh (`api`, `web`, `admin`, `admin-e2e-real`) | **Verified** | `gh pr view 144..171`: mọi PR MERGED vào `dev`, cả 4 check SUCCESS |
| 2 | e2e trên stack thật của milestone qua trong CI | **Verified cho M0–M5**; không có cho phần thêm sau plan | `apps/admin/e2e-real/m0…m5.real.spec.ts`; job chạy `pnpm test:e2e:real` (`.github/workflows/ci.yml:257`). #157 (AD18), #163/#171 (dashboard), #165 (nhập hàng loạt), #169 (sửa/xóa) không có spec stack thật (UA-3) |
| 3 | Ảnh màn thật cạnh khung trong delivery record | **Một phần** | Ảnh đã commit: m0 14, m1a 8, m1b 10, m2 17, m3 18, m4 22, m5 12 (`git ls-files docs/deliveries/giao-dien-admin/<m>`). "Cạnh khung Figma từng điểm" chưa làm: `giao-dien-admin.md:176, 236, 360, 447, 620` |
| 4 | Mục test flow của milestone | **Verified cho M0–M5** | `giao-dien-admin-test-flow.md:39` (M0) … `:216` (M5). Không có mục cho #157, #163, #165, #169 (UA-3) |
| Cả đợt | M5 merge; §9 tài liệu đã sửa; as-built | **Gần đủ** | M5 = #154 merged. §9: `CLAUDE.md`, `buoc-2-5.md`, bản chữ §8 đã sửa (`giao-dien-admin.md:623-630`); memory `project_admin_ui_refactor.md` đã sửa (file ghi `modified: 2026-10-27`, dù as-built `:618` ghi "không sửa ở đây"); **Figma "Giao dịch" chưa vẽ** (`:617`) |

## (b) Mục còn mở và nơi theo dõi

| Mục | Còn mở? | Theo dõi ở đâu |
|---|---|---|
| D4: chủ dự án tự chạy test flow người học | Mở | Chỉ ở `giao-dien-nguoi-hoc.md:223` và handoff §0b; **không** có trong `IMPROVEMENT_PLAN_2026-10-28.md` |
| Test flow admin do chủ dự án chạy (AD10, không chặn merge) | Không có ghi nhận đã chạy | Không theo dõi riêng. Lần gọi AI thật đầu tiên (28/10) chỉ có số liệu ở `IMPROVEMENT_PLAN` §1, chưa có as-built |
| Cỡ Worker khi bật app | Mở (đã sửa nhận định 26/10: không có giới hạn sau nén) | `deploy-checklist.md` mục "Giao diện người học" |
| Kiểm lỗi CSP trên production; chính sách bảo mật nhắc Cloudflare Web Analytics; host `api.` | Mở | `deploy-checklist.md` (cả ba); host `api.` còn có chặn lúc build `apps/web/src/app-shell/config.ts:20-22` |
| Security header cho admin tĩnh | Mở | `deploy-checklist.md` mục "Admin web" |
| Email trong URL `reset-password?email=` | Mở | Chỉ ở `ledger:69` ("minor (deferred)"); không có ở checklist (UW-1) |
| Hoàn tiền nhiều lần / đảo thứ tự làm lệch trạng thái lịch sử giao dịch (M4b Minor M2) | Mở, còn trong code | Chỉ ở `ledger:283`; không có ở mục "Nhà cung cấp thanh toán thật" của `deploy-checklist.md` (UW-2) |
| Minor để lại của từng mốc người học (M1 2, M2 ~12, M3 ~11, M4 8, M4b 4, M5a 6, M5b 6) | Mở | Chỉ ở ledger (`:68-69, 103-114, 149, 193-200, 283-285, 333, 354, 411-414`). Đáng chú ý vì dính lượt AI: M5b M3 (chờ 409 `ai-in-progress` quá 60 s thì bỏ key, bấm lại có thể trừ lượt lần hai) và M5b M5 (đóng tấm khi đang tra AI mất kết quả đã trừ lượt), `ledger:411-412`. Rủi ro thấp vì gọi AI có trần 10 s + một lần thử lại |
| Minor của đợt sửa lỗi UI người học (số "1000" thay "1.000", …) | Mở | `sua-loi-ui-nguoi-hoc.md:41-45` (UW-5) |
| Bề ngang 768–1279 px không có khung; chữ tiếng Anh chưa ai duyệt (design người học §12) | Mở | Không theo dõi sau design |
| Admin "chưa kiểm": hộp A/79b và dải `not_supported` trên stack thật; "Rời trang?" và thanh khôi phục trong trình duyệt thật; hộp của AD18, #165, #169; worker thật dừng gọi AI giữa chừng | Mở | `giao-dien-admin.md:189, 464, 571, 607-608, 619-620`; không có trong `IMPROVEMENT_PLAN` |
| Điểm nhỏ admin (NUL trong ô tìm, đếm lùi khi khóa bị 429, ô ngày `mm/dd/yyyy`) | Mở | `IMPROVEMENT_PLAN` A6 (đã theo dõi, không đề xuất lại) |
| Dashboard thiếu hai số | **Đã xong** (PR #171) nhưng tài liệu vẫn ghi mở | UA-2 |
| R3 (`replaced` dựa vào hai mốc giờ bằng nhau) | Đã kiểm trên Postgres thật | `giao-dien-admin.md:459` (e2e M4) |
| R4 (giới hạn `lookup` 60/giờ là `ASSUMPTION`) | Đã làm theo giả định, độ hợp lý chưa đo | `giao-dien-admin.md:134-135` |
| `router.replace` chập chờn trên bản build Worker → dùng `location.replace` | Cách tránh vẫn giữ | `giao-dien-nguoi-hoc.md:81-82` |

## (c) Phát hiện

Không có phát hiện mức **Cao**. Các điểm rủi ro cao được hỏi đều đã kiểm và thấy đúng (cuối mục này).

### Web người học

<a id="uw-1"></a>
**UW-1 — Vừa — Email của người học nằm trong URL của màn đặt lại mật khẩu**
- Bằng chứng: `apps/web/src/features/learner/auth/ForgotPasswordForm.tsx:27` `hardReplace(\`/${locale}/app/reset-password?email=${encodeURIComponent(email.trim())}\`)`;
  `ResetPasswordForm.tsx:26` đọc lại `params.get('email')`. `hardReplace` là tải trang đầy đủ, nên URL này là một request tới Worker. `apps/web/wrangler.jsonc`
  có `"observability": { "enabled": true }`. Màn xác minh email đã tránh đúng việc này bằng `sessionStorage` (`src/app-shell/session/pending-email.ts:6-23`).
  Đã biết: `ledger:69` "reset-password ?email= lands in browser history" (deferred).
- Kịch bản hỏng: Lan đặt lại mật khẩu trên máy dùng chung; lịch sử trình duyệt và gợi ý thanh địa chỉ hiện `…/reset-password?email=lan@example.com`. Với
  observability bật, URL kèm email nằm trong log Workers của Cloudflare (`ASSUMPTION`: Workers Logs ghi URL đầy đủ của request, chưa kiểm trong tài liệu
  Cloudflare). Hiện chưa xảy ra trên production vì `/app` chưa lên `main`.
- Đề xuất: dùng lại `pending-email.ts` cho luồng quên mật khẩu (giống xác minh email); nếu giữ, thêm một dòng vào `deploy-checklist.md` (chính sách bảo mật
  và thời hạn log).

<a id="uw-2"></a>
**UW-2 — Vừa — Lịch sử giao dịch ghi sai khi hoàn tiền nhiều lần hoặc hoàn tiền sau khi đã hủy hoàn tiền (việc API (i) của M4b)**
- Bằng chứng: `apps/api/src/entitlements/billing/transactions.repository.ts:72-90`. Dòng hoàn tiền chèn bằng `createMany … skipDuplicates`, khóa duy nhất
  là `(provider, environment, provider_transaction_id, kind)` (`prisma/models/entitlements.prisma:151`, migration `20261023100000_billing_transactions`
  dòng 32). Vì vậy lần hoàn tiền thứ hai của cùng giao dịch không được ghi. Sau `refund_reversed` (`:82-86`) dòng hoàn tiền thành `reversed`; một
  `refunded` mới đặt lại giao dịch gốc thành `refunded` (`:79`), còn dòng hoàn tiền vẫn `reversed`. Reviewer M4b đã thấy (Minor M2, `ledger:283`), để lại.
- Kịch bản hỏng: khi có nhà cung cấp thật hỗ trợ hoàn tiền từng phần, Lan được hoàn 50.000 ₫ rồi thêm 30.000 ₫. Màn Lịch sử giao dịch của Lan và màn Giao dịch
  của admin chỉ hiện một dòng 50.000 ₫. Hoặc: hoàn tiền → hủy hoàn tiền → hoàn tiền lại thì giao dịch gốc ghi "Đã hoàn tiền" mà dòng hoàn tiền ghi "Đã hủy
  hoàn tiền". Chỉ là bảng lịch sử, quyền lợi gói không đổi. Hiện chỉ có cổng giả.
- Đề xuất: thêm một mục vào phần "Nhà cung cấp thanh toán thật" của `deploy-checklist.md`, trỏ `ledger:283`; sửa khi tích hợp nhà cung cấp thật.

<a id="uw-3"></a>
**UW-3 — Thấp — Bản build production (cờ tắt) chưa từng được build hay test trong CI**
- Bằng chứng: CI build `apps/web` với `NEXT_PUBLIC_LEARNER_APP: 'on'` (`.github/workflows/ci.yml:111`, `apps/web/playwright.config.ts` env). Chặn 307 chỉ
  có unit test của hàm (`src/lib/learner-app-flag.test.ts`), không có test `proxy.ts`. `deploy-web.yml` build với cờ tắt (không đặt biến) và không chạy test.
  Production hôm nay: `git show origin/main:apps/web/src/lib/learner-app-flag.ts` → "not in 'origin/main'", `curl https://wordmet.com/vi/app` → `404`
  (`main` chưa có code app; cơ chế chặn chưa từng deploy).
- Kịch bản hỏng: lần đầu PR `dev` → `main`, bản landing cờ tắt deploy thẳng mà chưa ai chạy e2e trên đúng cấu hình đó. Hậu quả giới hạn: trang app không vào
  bản build (`next.config.ts` `pageExtensions`), nên kể cả `proxy.ts` hỏng thì `/app` ra 404, không lộ app.
- Đề xuất: một bước CI build cờ tắt rồi kiểm `/vi/app` → 307 và landing 200, hoặc một unit test gọi thẳng `proxy()`.

<a id="uw-4"></a>
**UW-4 — Thấp — CSP dùng `'unsafe-inline'` cho script (D20), không có mục xem lại trước khi bật `/app`**
- Bằng chứng: `apps/web/src/lib/csp.ts:6` `CSP_INLINE_FALLBACK = true`, `:21`. Quyết định D20 có trade-off rõ (`decisions/2026-10-22-giao-dien-nguoi-hoc-decisions.md:38, 114, 217`;
  bỏ nonce vì "trang động, tốn CPU Worker gói Free"). Phần còn lại giữ chặt: access token chỉ trong bộ nhớ (`session-store.ts:72`, không ghi storage, không gửi qua
  `BroadcastChannel`, `:364-370`); refresh token là cookie `httpOnly`, `secure`, `sameSite: 'strict'`, `path: '/v1/auth'` (`apps/api/src/identity/sessions/session-transport.ts:13-15`);
  chỉ hai chỗ `dangerouslySetInnerHTML`, đều an toàn (`layout.app.tsx:14` script hằng; `JsonLd.tsx:21` đã escape `<`).
- Kịch bản: CSP không chặn script nhúng nếu sau này có lỗi XSS; lớp bảo vệ duy nhất là React tự escape.
- Đề xuất: không bắt buộc. Nếu muốn, thêm một dòng ở `deploy-checklist.md` "xem lại nonce/hash trước khi bật `/app`".

<a id="uw-5"></a>
**UW-5 — Thấp — Một số con số vẫn in không dấu chấm hàng nghìn**
- Bằng chứng: `apps/web/messages/vi.json:725-726, 898-899` dùng `{added}`, `{already}`, `{full}`, `{function}` dạng thường; danh sách `NUMERIC` của test
  (`src/i18n/messages.test.ts:21-22`) thiếu các tên này. Đã biết: `sua-loi-ui-nguoi-hoc.md:42`.
- Kịch bản: "Thêm cả loạt" 1.000 từ hiện "Đã thêm 1000 từ…".
- Đề xuất: đổi sang `{added, number}` … và thêm tên vào `NUMERIC`.

<a id="uw-6"></a>
**UW-6 — Thấp — Vài test người học assert class CSS**
- Bằng chứng: `apps/web/src/features/learner/practice/session/practice-session.test.tsx:114` (`font-bold`), `:116` (`sm:grid-cols-2`), `:135` (`text-caption`),
  `:335-342` (class motion); tương tự ở `review-session.test.tsx` (7 chỗ `toHaveClass`), `group-page.test.tsx` (4). Rule `testing-boundaries.md`: test vỡ khi
  markup đổi mà hành vi không đổi là test sai. Đa số test khác query theo role/text (59 file `getByRole`, 0 snapshot).
- Đề xuất: giữ class motion (khó test khác), bỏ các assert bố cục như `font-bold`, `sm:grid-cols-2`.

<a id="uw-7"></a>
**UW-7 — Thấp — Lớp phiên và client API chép từ admin, đã lệch nhau, không ghi là nợ kỹ thuật**
- Bằng chứng: `apps/admin/src/auth/session-store.ts` 374 dòng, `apps/web/src/app-shell/session/session-store.ts` 429 dòng; sau khi thay tên khóa
  `wordmet-admin`/`wordmet-web`, `diff` còn 133 dòng khác. `client.ts`, `idempotency.ts` chỉ khác 1 dòng. Design §4.2 chọn "chép, chưa tách package";
  không thấy mục theo dõi việc tách (grep "tách package|packages/api-client" trong `docs/preparation`, `docs/deliveries` không có; `packages/` chỉ có `design-tokens`).
- Kịch bản: sửa lỗi refresh/429/keepalive ở một app mà quên app kia.
- Đề xuất: ghi một dòng vào danh sách cải thiện; tách khi app Flutter hay app thứ ba cần.

<a id="uw-8"></a>
**UW-8 — Thấp — Ảnh chạy thật của các mốc người học không có trong repo**
- Bằng chứng: như hàng 2 của bảng (a). Ngược lại, admin commit 101 ảnh vào `docs/deliveries/giao-dien-admin/`.
- Đề xuất: không cần làm lại; ghi rõ trong as-built người học rằng "Xong khi" mục 2 chỉ có bằng chứng bằng lời từ M4.

<a id="uw-9"></a>
**UW-9 — Thấp — Tài liệu người học còn ghi admin "Sắp có"**
- Bằng chứng: handoff `giao-dien-nguoi-hoc-handoff-2026-10-23.md:30-31` ("các màn admin 'Sắp có' cần design + plan riêng") và `giao-dien-nguoi-hoc.md:224`.
  `CLAUDE.md` bảo đọc §0b của handoff trước. Thực tế 24/24 mục `available: true` (`apps/admin/src/app/nav.ts`, đếm `grep -c`).
- Đề xuất: thêm một dòng "đã xong ở đợt admin" vào §0b.

### Admin

<a id="ua-1"></a>
**UA-1 — Thấp — Bản tiếng Anh của Bộ ví dụ vẫn ghi trần 100**
- Bằng chứng: `apps/admin/messages/en.json:409` `"Examples ({count}/100)"`, `:410` "Up to 100 examples per operation…"; bản vi `vi.json:409`
  `"Ví dụ ({count}/1.000)"`; code `EVAL_EXAMPLES_PER_OPERATION_MAX = 1000` (`apps/api/src/ai/ai.constants.ts:35`). Test parity chỉ so khóa, không so con số.
  Lệnh so con số giữa vi/en của admin chỉ ra đúng 2 khóa này.
- Kịch bản: admin dùng tiếng Anh có 150 ví dụ thấy "Examples (150/100)".
- Đề xuất: sửa hai chuỗi en.

<a id="ua-2"></a>
**UA-2 — Thấp — Tài liệu còn ghi "dashboard thiếu hai số" dù PR #171 đã làm; decision record chưa có quyết định dashboard**
- Bằng chứng: `CLAUDE.md:311` "Not done: the dashboard's two missing numbers"; `giao-dien-admin.md:612`. PR #171 merged (`git merge-base --is-ancestor 9e35eb5 HEAD`
  → đúng), commit `4fb733d` "add the first-try rejection rate and the Pro usage spread…", màn gọi `getAiUsagePro` (`features/dashboard/DashboardPage.tsx:48`).
  `decisions/2026-10-27-giao-dien-admin-decisions.md:20` AD6 vẫn "Ngoài đợt, giữ 'Sắp có'"; không có AD cho `ai.view` (as-built `:600-601` đã tự ghi điều này).
- Đề xuất: sửa hai dòng tài liệu; thêm một AD (ví dụ AD19) cho dashboard `ai.view`, editor xem cả tiền.

<a id="ua-3"></a>
**UA-3 — Thấp — Phần thêm sau plan chưa có mục test flow, chưa có e2e stack thật, chưa mở trình duyệt thật**
- Bằng chứng: `grep -n -i "dashboard|hàng loạt|bulk|Tạo người dùng|Đặt lại mật khẩu|xóa nguồn|Dừng|xóa từ" giao-dien-admin-test-flow.md` chỉ khớp ba dòng không
  liên quan (`:98`, `:130`, `:229`). `e2e-real/` chỉ có `admin`, `m0`–`m5`, `delete-user`. AD18 (tạo/sửa người dùng, đặt lại mật khẩu): chỉ unit test
  (`UserEdit.test.tsx`); `e2e/users.spec.ts` không có test tạo/sửa (`:26, 68, 83, 97`). Có e2e mock cho sửa/xóa Nguồn, dừng lô xuất bản, Bộ ví dụ
  (`e2e/sources.spec.ts:43-59` …) và dashboard (`e2e/shell.spec.ts:58-68`). As-built tự ghi "chưa kiểm" (`giao-dien-admin.md:571, 607-608, 619-620`).
  API của AD18 đã chạy thật qua HTTP (`:569-570`); việc dừng lần chạy có kiểm trạng thái trước mỗi lời gọi trả tiền (`ai/eval/eval-runs.repository.ts:78-81`).
- Kịch bản: lỗi giao diện ở hộp Đặt lại mật khẩu hay Nhập hàng loạt chỉ lộ khi chủ dự án dùng lần đầu; không có hướng dẫn nào để chủ dự án tự kiểm.
- Đề xuất: thêm mục "Thêm sau plan" vào test flow admin; đưa các mục "chưa kiểm" này vào `IMPROVEMENT_PLAN` (hiện chỉ A6 được theo dõi).

<a id="ua-4"></a>
**UA-4 — Thấp — Khóa chữ của admin không được kiểm lúc typecheck**
- Bằng chứng: admin dùng `use-intl` (`apps/admin/package.json:25`) không khai báo `AppConfig` (`src/vite-env.d.ts` không có); web có
  (`apps/web/src/global.d.ts`). Script đối chiếu khóa (mục d) thấy **0 khóa thiếu** ở cả hai app hôm nay, nhưng khóa ghép bằng template không được kiểm.
- Đề xuất: thêm `declare module 'use-intl' { interface AppConfig { Messages: typeof en } }` như web.

<a id="ua-5"></a>
**UA-5 — Thấp — Số màn và quyền lệch giữa design, as-built và code (đều có giải thích, chỉ là chữ)**
- Bằng chứng: design admin §1 ghi "15 màn ở §6", bảng §3 liệt kê 17 màn menu (M1a 4 + M1b 3 + M2 1 + M3 4 + M4 2 + M5 3); `CLAUDE.md` ghi "24 admin screens",
  thực ra là 24 mục menu, trong đó 6 màn có từ trước và dashboard thêm sau. Design §4.4: `/users` = `roles.manage`, `/dashboard` = "—"; code
  `nav.ts`: `users.read` (AD18) và `ai.view` (#163).
- Đề xuất: sửa câu "24 admin screens" thành "24 mục menu (17 màn mới + dashboard + 6 màn cũ)".

<a id="ua-6"></a>
**UA-6 — Thấp — Test admin dựa vào `data-testid` nhiều hơn web**
- Bằng chứng: 32 file test admin dùng `getByTestId`; nhiều nhất `getByTestId('detail-panel')` (44 lần, ví dụ `features/publish-jobs/PublishJobs.test.tsx:186, 228, 231`).
  Dùng để khoanh vùng, assert bên trong vẫn theo role. 0 snapshot.
- Đề xuất: cho panel chi tiết `role="region"` có tên, rồi query bằng tên đó.

<a id="ua-7"></a>
**UA-7 — Thấp — Email nằm trong URL của admin (bộ lọc và tra cứu)**
- Bằng chứng: bộ lọc `user_email`, `granted_by_email`, `resolved_by_email` ghi vào URL (design §4.3); tra cứu `GET /v1/admin/entitlements/lookup?email=`
  (`features/entitlements/entitlements-api.ts:90`). API không log URL: chỉ log route pattern (`apps/api/src/common/problem-details/problem-details.filter.ts:27-31`).
- Kịch bản: email người học nằm trong lịch sử trình duyệt của staff và log truy cập của hosting (`ASSUMPTION`, tùy hosting lúc Deploy). Chỉ staff.
- Đề xuất: ghi nhận; xét lại khi chọn hosting (log truy cập).

### Đã kiểm, thấy đúng (không phải phát hiện)

- **Route admin bị ẩn ở UI nhưng API không chặn:** không thấy. Mọi file `@Controller('admin…')` (27 file, 30 controller) có `@RequirePermission` ở class
  hoặc ở từng method (`admin-entitlements.controller.ts`: 5 route, 5 decorator). Guard dùng `getAllAndOverride` (method thắng class,
  `identity/staff/permission.guard.ts:24-26`) và đọc vai trò từ DB mỗi request. Editor gọi thẳng API `settings.manage` (AI, cài đặt, giao dịch, trả lượt,
  `ai-usage`) → 403, vì `ROLE_PERMISSIONS.editor` không có `settings.manage`, `roles.manage` (`identity/identity.types.ts:9-18`).
- **Quyền UI khớp quyền API:** từng mục `nav.ts` đối chiếu với controller tương ứng; mỗi mục editor thấy thì API cho editor (ví dụ `/reports` cần
  `content.edit` và màn đọc `GET report-reasons` đã đổi sang `content.edit`, `admin-report-reasons.controller.ts:22-23`). Nút chỉ admin được ẩn đúng: khóa/sửa
  người dùng (`UserDetail.tsx:45`), lượt AI hôm nay (`GrantsPage.tsx:253`), con số AI riêng (`GrantDialog.tsx:75`), link Các lần gọi (`ReportDetail.tsx:83`).
  Dashboard (`ai.view`) chỉ gọi bốn endpoint `ai.view` (`features/dashboard/dashboard-api.ts:64-69`), không có link sang trang `settings.manage`.
- **Endpoint xóa mới (#169):** Nguồn: xóa cứng bằng một câu lệnh có điều kiện (chỉ `third_party`, không mức độ từ, lô nhập hay khóa dòng nào dùng), khóa ngoại
  `entry_levels` RESTRICT làm lớp chặn cuối, nguồn `owner` và AGID được bảo vệ (`content/sources/sources.service.ts:132-150`); mọi cột trỏ tới nguồn đều
  được kiểm (`prisma/models/content.prisma:83-89`, `pipeline.prisma:29, 76`). Từ: xóa cứng, fail-closed, trong một transaction có khóa key và `FOR UPDATE`,
  từ chối nếu từng publish, có liên kết dạng chia, câu người học, hoặc probe của module khác báo đang dùng; probe thiếu thì không xóa
  (`content/catalog/entry-delete.service.ts:45-92`, `entry-usage.ts:5-17`). Lần chạy Bộ ví dụ: chỉ xóa lần `finished`/`failed`, `ai_calls` (chi phí) giữ
  nguyên, không bảng nào trỏ tới `ai_eval_runs` (`ai/eval/eval-runs.service.ts:142-155`). Lô xuất bản: chỉ dừng, không xóa (`publish-jobs.service.ts:23-37`).
  Quyền: Nguồn `content.import`, Từ `content.edit`, lần chạy `settings.manage`, lô `content.publish`, khớp menu.
- **Token phía web:** access token chỉ trong bộ nhớ; refresh là cookie `httpOnly` + `secure` + `sameSite=strict` + `path=/v1/auth`, refresh cần
  `X-CSRF-Protection: 1` (`session-transport.ts:13-45`). `localStorage` chỉ giữ giao diện, công tắc và nhóm dùng gần nhất; `sessionStorage` giữ email chờ
  xác minh và cờ đăng xuất.
- **`/app/*` bị chặn ở đâu:** ba lớp: (1) `next.config.ts` chỉ thêm đuôi `app.tsx` vào `pageExtensions` khi cờ bật (`src/lib/learner-app-flag.ts:14-17`),
  nên code app không vào bản build; (2) `src/proxy.ts:12-19` trả 307 về `/{locale}`, `no-store`; (3) `robots.ts:8-9` chặn `/*/app`. `deploy-web.yml` không
  đặt `NEXT_PUBLIC_LEARNER_APP` (grep chỉ thấy `ci.yml:111, 226`).
- **i18n:** cả hai app có test vi/en cùng khóa (`apps/admin/src/i18n/parity.test.ts`, `apps/web/src/i18n/messages.test.ts:34-41`); không thấy khóa dùng trong
  code mà thiếu trong `en.json` (mục d).

## (d) Lệnh tìm "không có" và đối chứng

| Kết luận | Lệnh | Kết quả | Đối chứng (thứ chắc chắn có) |
|---|---|---|---|
| Không controller admin nào thiếu kiểm quyền | `grep -rln "@Controller('admin" --include=*.ts apps/api/src \| … grep -c "RequirePermission("` | 27 file, mọi file ≥ 1 | Cùng lệnh in đúng số 3 cho `staff.controller.ts`, 5 cho `admin-entitlements.controller.ts` (khớp số decorator đếm tay) |
| Không route `admin-entitlements` nào thiếu decorator | `grep -cE "@(Get\|Post\|Patch\|Put\|Delete)\(" admin-entitlements.controller.ts` | 5 route | 5 `@RequirePermission` (lệnh trên) |
| Token không nằm trong storage | `grep -rn "localStorage\|sessionStorage" apps/web/src` (bỏ test) | Không có dòng nào chứa token | Lệnh tìm ra `theme.ts:10`, `last-group.ts:6`, `AiTypesToggle.tsx:15`, `pending-email.ts:6` |
| Không chỗ chèn HTML thô nguy hiểm | `grep -rn "dangerouslySetInnerHTML\|innerHTML\s*=" apps/web/src apps/admin/src` | 2 chỗ, đều an toàn | Chính 2 chỗ đó là đối chứng (`layout.app.tsx:14`, `JsonLd.tsx:21`) |
| Không khóa chữ thiếu trong `en.json` | Script `keys.mjs` (scratchpad, đọc `useTranslations('ns')` và `t('…')` dạng chuỗi) | admin: 1325 khóa, 0 thiếu; web: 1067 khóa, 0 thiếu | Bản đầu của script (một namespace mỗi biến) báo 52 và 156 "thiếu" giả, chứng tỏ script có đọc file và có báo |
| Con số lệch giữa vi/en (admin) chỉ ở 2 khóa | `node -e` so các chữ số trong từng cặp chuỗi vi/en | admin: 2 (`ai.eval.examples`, `ai.eval.examplesHint`) | Web cùng lệnh ra 9 cặp, đều là chữ-so-với-số ("Thêm 1 câu" / "One more question"), chứng tỏ lệnh có so |
| Cờ app không bật ở deploy | `grep -rn "LEARNER_APP" .github apps/web/wrangler.jsonc apps/web/package.json` | Không có trong `deploy-web.yml` | Tìm ra `ci.yml:111`, `ci.yml:226` |
| API không log URL (có query) | `grep -rn "originalUrl\|req.url\|request.url" apps/api/src/common` | Chỉ `problem-details.filter.ts:31` (route) và `:49` (`instance` trong body trả về) | Chính hai dòng đó |
| Không bảng nào trỏ tới `ai_eval_runs` | `grep -n -i "evalRun\|eval_run" prisma/models/*.prisma`; `grep "ai_eval_runs" migrations/*/migration.sql \| grep -i references` | Chỉ model, không `REFERENCES` | `model AiEvalRun` tìm ra ở `ai.prisma:182` |
| Mọi cột trỏ tới nguồn đều được kiểm khi xóa | `grep -rn -i "source_id\|sourceId\|level_source" prisma/models/*.prisma` | 3 cột: `entry_levels.source_id`, `import_batches.level_source_id`, `import_row_keys.source_id` | Cả 3 có trong câu `DELETE … NOT EXISTS` (`sources.service.ts:136-140`) |
| Test flow admin không có mục cho phần thêm sau plan | `grep -n -i "dashboard\|hàng loạt\|bulk\|Tạo người dùng\|Đặt lại mật khẩu\|xóa nguồn\|Dừng\|xóa từ" giao-dien-admin-test-flow.md` | Không có mục | Lệnh khớp 3 dòng không liên quan (`:98`, `:130`, `:229`), chứng tỏ có đọc file |
| Lệnh trong hai test flow đều tồn tại | `grep -ohE "pnpm [a-z:][a-z0-9:-]+"` hai file, so với `scripts` của 4 `package.json` | 11 lệnh, đều có | `dev:app` (web), `learner:setup` (api), `test:e2e:real` (admin) |
| Ảnh mốc người học không có trong repo | `git ls-files \| grep -iE "\.(png\|jpg\|webp)$" \| grep -iv "giao-dien-admin/"` | Chỉ ảnh `docs/audit/2026-10-26-*` | `git ls-files docs/deliveries/giao-dien-admin \| wc -l` = 101 |
| Việc tách client chung chưa được theo dõi | `grep -rln "tách package\|shared package\|packages/api-client\|chưa tách" docs/preparation docs/deliveries docs/superpowers/specs` | Chỉ 2 design (nơi quyết định chép) | `ls packages` → `design-tokens` |
