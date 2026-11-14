# Ra mắt bản web chính thức: còn thiếu gì về sản phẩm, tuân thủ và việc còn mở (21/10/2026)

Phạm vi: ra mắt **website** cho người học (trình duyệt; mobile ngoài phạm vi). Chỉ xét độ đầy đủ tính năng, tuân thủ, việc còn mở.
Không xét log/health/security header (agent khác) và khả năng chịu tải (agent khác). Việc chỉ đọc, không sửa code.

**Nguồn.**
- Code và docs: bản chụp nhánh `dev` @ `985531b` (merge PR #101). Đường dẫn dạng `apps/...`, `docs/...` bên dưới là của bản này.
- Docs chỉ có ở checkout chính, **chưa commit**, ghi `(main, chưa commit)`:
  - `docs/preparation/COMMERCIALIZATION_READINESS_2026-10-19.md` (gọi tắt **R**);
  - `docs/preparation/COMMERCIAL_MINIMUM_CHECKLIST_2026-10-19.md` (**CL**);
  - `docs/preparation/evidence/commercialization-2026-10-19/1_legal_vietnam.md` (**E**);
  - `docs/preparation/reports/Phát hành app iOS và Android.md` (**I**);
  - phần thêm 20/10 của `docs/mockups/2026-10-16/UI-CONTEXT.md`.
- Kiểm trực tiếp ngày 21/10 bằng `curl` tới site thật (chỉ đọc).
- Phần pháp lý (mục 6) và trạng thái review (mục 4) do hai subagent đọc, mình kiểm lại các dòng chính: `MIN_AGE = 13`, `ReminderPref enabled @default(true)`, `TRUST_PROXY ... .default(false)`, `deploy-checklist.md` chỉ có trên nhánh M5.

**Nhãn.**
- **xong**: có code chạy, hoặc quyết định đã chốt.
- **một phần**: mới có một phần, hoặc mới có trên giấy.
- **chưa có**: chưa có gì.
- `ASSUMPTION` / **UNVERIFIED**: chưa kiểm chứng.
- Tài liệu pháp lý trong repo đều tự ghi "không phải tư vấn pháp lý".

---

## Tóm tắt: những gì chặn ra mắt web, xếp theo mức chặn

1. **Chưa có app người học trên web.** `apps/web` chỉ có landing, `/privacy` và `/terms`. Không có route `/vi/app` hay `/en/app`. Trên production, `https://wordmet.com/vi/app` trả **404** (curl 21/10). API đã đủ cho hầu hết luồng học (mục 1). Giao diện thì mới ở Figma (40 màn web hướng G1; chủ dự án đánh giá "ổn khoảng 50%"), **chưa có plan giao diện**, chưa có dòng code nào.
2. **Catalog chưa có nghĩa tiếng Việt nào đã duyệt.** Lần chạy thật chỉ nạp 7.799 headword CEFR-J có level, `senses_created 0`. Đích là 8.812 từ (D6). **Chưa có bằng chứng** đã làm lô thử 20 từ (D5). Claude ước 73–440 giờ duyệt (`ASSUMPTION`). Đây là việc tay, không phải code (mục 7).
3. **Chưa deploy gì ngoài landing.** `api.wordmet.com` không trả lời (curl `000`). Repo không có Dockerfile hay file cấu hình hosting. Chưa chọn hosting, Postgres/Redis bền, nhà cung cấp email gửi đi, chỗ giữ secret, backup. Checklist Deploy mới nằm trên PR #102 **chưa merge** (mục 5). Không có email gửi đi thật thì không gửi được OTP, nên không ai đăng ký xong được.
4. **Nền pháp lý tối thiểu chưa có, kể cả khi chỉ ra mắt Free.**
   - `/privacy` chỉ viết cho waitlist; `/terms` là bản nháp; footer đang ẩn cả hai link.
   - API đã bắt người dùng tick đồng ý `TERMS_VERSION=2026-10-20`, một bản Terms **chưa tồn tại**.
   - Chưa có đồng ý theo từng mục đích: email nhắc học đang **bật sẵn**.
   - Mốc 13 tuổi không hỏi cha mẹ lệch Luật 116/2025 Điều 16 khoản 2 (phải hỏi luật sư).
   - Nghĩa vụ DPIA/CTIA (hồ sơ đánh giá tác động, hồ sơ chuyển dữ liệu ra nước ngoài) có thể áp từ lần xử lý dữ liệu đầu tiên (mục 6).
5. **Không có cách xóa tài khoản kèm dữ liệu.** Việc này thuộc Bước 8 và chưa có design. Theo tài liệu, Nghị định 356 cho khoảng 20 ngày để xử lý yêu cầu xóa (E, nguồn thứ cấp). Review 20/10 ghi N9 "càng cần có trước ra mắt" (mục 2, 6).
6. **Landing hứa điều sản phẩm không có.**
   - Landing ghi "14 ngày dùng thử, không cần nhập thẻ" (`apps/web/messages/vi.json:133,146`). Nhưng D15–D16 Bước 5 chốt trial 7 ngày, giữ thẻ, và chỉ có khi có thanh toán thật. Bước 5 đã ghi phải sửa (⚠9).
   - Landing ghi "Tự động ưu tiên những từ hay quên" (`vi.json:141`). Nhưng D16 Bước 3 chốt hệ thống **không tự** đổi mức, chỉ gợi ý.
7. **Vài quyết định của chủ dự án đang treo và quyết định phạm vi ra mắt:**
   - Ra mắt Free trước hay có Pro.
   - Có AI (Bước 7) lúc ra mắt không. Bảng câu hỏi Bước 7 chưa trả lời câu nào.
   - Chọn cổng thanh toán. **Mâu thuẫn:** R/CL đề xuất payOS trả trước, nhưng D35 Bước 5 chỉ nhận gói tự gia hạn và loại payOS, VNPay.
   - Tuổi tối thiểu (cần luật sư).

**Ra mắt Free trước được không:** được, theo tài liệu.
- Đăng ký hộ kinh doanh, thông báo website TMĐT và công khai danh tính theo Nghị định 248 đều gắn với lúc **thu tiền** (R:78, tiêu đề R:123).
- Code: mọi tài khoản là Free. Pro chỉ có khi staff cấp. Quảng cáo mặc định tắt (design Bước 5 §11).
- Điều kiện kèm theo: bỏ hẳn trial và Pro khỏi trang công khai, hoặc ghi "chưa mở bán" như Figma W/52–W/53.
- Luật dữ liệu cá nhân **vẫn áp đủ** (mục 6).

---

## 1. App người học trên web

**Trạng thái: chưa có (UI), xong phần lớn (API).**

### Code và production

- Trong `apps/web/src/app/[locale]/` chỉ có `page.tsx` (landing), `privacy/`, `terms/`, `not-found.tsx` và route bắt mọi đường dẫn khác `[...rest]/page.tsx`. Route này gọi `notFound()` (`apps/web/src/app/[locale]/[...rest]/page.tsx:4-5`).
- Không có thư mục `app/`. Không commit nào trên mọi nhánh chạm `apps/web/src/app/[locale]/app` (`git log --all`).
- Kiểm production 21/10:
  - `https://wordmet.com/` → 307 về `/vi`;
  - `/vi` → 200;
  - `/vi/app` → **404**;
  - `/vi/privacy`, `/vi/terms` → 200.

### "Chặn `/app/*` trên production" chưa có code

- Design Bước 3 §4 (`docs/superpowers/specs/2026-10-16-buoc-3-learning-design.md:89-90`) mới **đề xuất** "một biến cấu hình tắt `/vi/app/*` và `/en/app/*` (trả trang 'chưa mở')". Ca B3E32 (dòng 408) giao việc này cho plan giao diện.
- Trong code không có biến nào như vậy. Grep `LEARNER_APP|APP_ENABLED` trong `apps/web` ra 0 kết quả. Đối chứng: `LEARNER_APP_URL` vẫn tìm được trong `apps/api`.
- Middleware `apps/web/src/proxy.ts:9-27` chỉ chọn ngôn ngữ.
- Vậy hiện `/app/*` "bị chặn" chỉ vì **chưa có trang**. Biến cờ và trang "chưa mở" sẽ phải làm cùng app người học.

### Thiết kế giao diện

- UI-CONTEXT (`docs/mockups/2026-10-16/UI-CONTEXT.md`, phần dev):
  - quy trình chốt là mockup → chốt style → Figma → code (§1);
  - dòng 24: luật chặn production vẫn là "Đề xuất";
  - §7 còn 7 câu hỏi giao diện.
- Phần thêm ngày 20/10 (main, chưa commit):
  - chủ dự án chốt hướng **G1 "Bàn học"**;
  - page Figma "03 Người học · Web" có 40 màn, 8 section, gồm đăng ký, Hôm nay/nhóm, phiên ôn, tra từ, thêm từ, luyện tập, phiên luyện, gói học và cài đặt;
  - chủ dự án đánh giá "bố cục G1 mới ổn khoảng 50%, sẽ còn chỉnh";
  - chưa có bản tối;
  - còn chờ quyết định lưu trạng thái thu/mở sidebar.
- **Chưa có plan giao diện.** Không có file trong `docs/superpowers/plans/`, design Bước 3 §16–17 chỉ nói "plan giao diện viết ở phiên khác".

### Luồng người học: API có gì, UI có gì

API ở `apps/api/src/**/*.controller.ts`, tiền tố `/v1`.

| Luồng | API trên `dev` | UI web | Bằng chứng |
|---|---|---|---|
| Đăng ký (họ, tên, ngày sinh, tick đồng ý), OTP xác minh email, đăng nhập, làm mới phiên, đăng xuất, quên và đổi mật khẩu | **xong** | chưa có | `identity/auth/auth.controller.ts:19,31`; `otp.controller.ts:14,34`; `password.controller.ts:20,32`; `sessions/sessions.controller.ts:20,37`; `auth.schemas.ts:10-13` |
| Lần đầu chọn ngôn ngữ; múi giờ tự lấy | **xong** (`PATCH /me`: `native_language`, `timezone`) | chưa có | `identity/profile/profile.controller.ts:12,17`; `profile.schemas.ts:5-6` |
| Duyệt và tra từ theo level, chủ đề, loại từ; trang từ; tra cho thêm nhanh | **xong** | chưa có | `content/learner/learner-content.controller.ts:14-15,32,37,42`; `content/words/words.controller.ts:13,18,23`; `content/taxonomy/topics.controller.ts:43` |
| Nhóm từ: tạo, sửa, xóa, xem; thêm một nghĩa hoặc cả loạt theo level và chủ đề | **xong** | chưa có | `learning/groups/groups.controller.ts:19-49`; `learning/items/items.controller.ts:18,31,43,52,60,65`; `items.schemas.ts:11-12` |
| Flashcard và lịch ôn (queue, chấm 2 nút, danh sách cân nhắc, học lại) | **xong** | chưa có | `learning/queue/queue.controller.ts:14`; `learning/reviews/reviews.controller.ts:21`; `learning/backlog/backlog.controller.ts:22,31` |
| Luyện tập không AI (phiên, câu, trả lời, bỏ qua, gợi ý, tổng kết, từ hay sai, lịch sử, báo lỗi câu) | **xong** | chưa có | `practice/sessions/sessions.controller.ts:32-63`; `practice/answers/answers.controller.ts:25,38,45`; `practice/history/history.controller.ts:22,27`; `practice/reports/reports.controller.ts:22` |
| Từ riêng, thêm nhanh, câu đã gặp | **xong** | chưa có | `learning/quick-add/quick-add.controller.ts:37`; `content/private/my-words.controller.ts:38`; `learning/my-words/my-words-delete.controller.ts:18`; `content/sentences/sentences.controller.ts:29,53` |
| Cài đặt: bật hoặc tắt email nhắc học | **xong** | chưa có | `notifications/prefs/reminders.controller.ts:15,20` |
| Gói học: xem gói, lượt còn lại | **xong** (chỉ xem: `GET /me/entitlements`) | chưa có | `entitlements/api/me-entitlements.controller.ts:14` |
| Mua, hủy, đổi gói; trial | **chưa có**: không có API phía người học, người dùng thao tác ở trang của nhà cung cấp (design Bước 5 §3 "Không làm", §12.1) | chưa có | design Bước 5 dòng 205-206, 633 |
| Bài AI, AI tra nghĩa | **chưa có** (Bước 7) | chưa có | mục 2 |
| Đăng nhập Google, xóa tài khoản, xuất dữ liệu | **chưa có** (Bước 8) | chưa có | không có route nào (danh sách controller ở trên); HANDOFF §2 dòng 65 |
| Màn "Nguồn dữ liệu và giấy phép" (CEFR-J, Octanove, AGID) | **một phần**: có `GET /v1/sources` | chưa có | `content/sources/sources.controller.ts:25-29`; CL B6 |
| Trang trợ giúp và liên hệ trong app | chưa có | chưa có | CL B5 ("Chưa kiểm") |

---

## 2. Các bước còn phải xây

### Bước 7 (Practice AI + Content AI): **chưa có design**

- Nhánh `docs/buoc-7-design` chỉ có một commit `9d60618` (21/10, chưa vào `dev`). Commit này thêm hai file:
  - `docs/superpowers/reviews/2026-10-20-buoc-7-questions.md` (bảng câu hỏi cho chủ dự án);
  - `docs/preparation/BUOC_7_CODE_FACTS_2026-10-20.md`.
- Mọi dòng "**Trả lời:**" trong bảng câu hỏi còn trống. Các câu liên quan ra mắt:
  - Câu 2: Bước 7 có làm luôn giao diện người học còn thiếu của Bước 3–6 không.
  - Câu 3: "Xong khi" có gồm một lần gọi AI thật không.
- Trong `docs/superpowers/specs/` không có design Bước 7.

### Bước 8 (đăng nhập Google, xóa tài khoản): **chưa có gì**

- Không có nhánh, design hay commit nào (grep `buoc-8` trên `git log --all` ra 0).
- Phạm vi chỉ có một dòng ở `docs/HANDOFF_2026-10-05_BUOC_0.md:65`.
- Các bước khác đã để móc cho xóa tài khoản:
  - Bước 5 §18: xóa lần cấp, sổ lượt, gói đăng ký; còn mở câu giữ `trial_history` sau khi xóa;
  - Bước 6 §18: gọi `ai.deleteUserData`.

### Màn admin chưa làm, dù API đã có

Danh sách lấy từ `apps/admin/src/app/nav.ts:22-39`: mục `available: false` mở trang "Tính năng chưa có".

- Tổng quan (dashboard): chưa có cả API.
- Từ, Nghĩa, Chủ đề: API đã có.
- Câu bị báo lỗi: API `admin/practice/reports` đã có.
- Dạng bất quy tắc: chưa có API (Bước 7).
- Người dùng: API danh sách và khóa tài khoản đã có từ M2 của đợt sửa Bước 0–3. D8 của đợt sửa ghi admin web chưa có màn này.
- Cấp gói: API Bước 5 đã có.
- AI: cài đặt, chi phí, bộ ví dụ. API Bước 6 đã có. Chủ dự án tự làm (D8 Bước 6; design Bước 6 §18).
- **Trang "Thông báo & giới hạn"** (Bước 3): **không có cả mục trong menu**. API `admin/settings` đã có (`apps/api/src/settings/admin-settings.controller.ts:22,28,37`). UI-CONTEXT §7 câu 6 ghi "chưa có mockup".

Ảnh hưởng tới ra mắt: không có màn khóa tài khoản, cấp Pro, xử lý câu bị báo lỗi và chỉnh cài đặt thì mọi việc vận hành phải gọi API bằng tay.

### Lần gọi AI thật đầu tiên: **chưa làm**

- Bộ nối OpenAI và Anthropic mới chỉ được kiểm bằng phản hồi mẫu (design Bước 6 §19, D19).
- Việc phải làm "Trước khi ra mắt" (design Bước 6 §18):
  - tạo tài khoản nhà cung cấp;
  - tắt hoặc giới hạn tự nạp tiền, đặt giới hạn chi mỗi tháng;
  - Privacy ghi việc gửi dữ liệu cho OpenAI và Anthropic;
  - đối chiếu tuổi tối thiểu với quy định under-18 của OpenAI.
- Nếu ra mắt bản Free không AI (Free không có bài AI, D4 Bước 5), thì Bước 7 và lần gọi thật **không chặn** ra mắt. Đây là quyết định phạm vi của chủ dự án.

---

## 3. Thu tiền trên web

**Trạng thái: một phần.** Lõi cổng thanh toán đã xong, nhưng chỉ có nhà cung cấp giả. Chưa có trang mua.

### Code hiện có

- Lõi cổng thanh toán (`apps/api/src/entitlements/billing/`): hộp sự kiện, chống trùng, máy trạng thái gói, webhook `POST|GET /v1/billing/webhooks/:provider` (`webhook.controller.ts:22,27`).
- Bộ nối duy nhất là `fake` (thư mục `billing/fake`).
- Cấu hình (`apps/api/src/common/config/app-config.ts:215-219,232-240`): API từ chối khởi động khi bật cùng lúc `BILLING_PRODUCTION` với `BILLING_FAKE_ENABLED` hoặc `AI_FAKE_ENABLED`.

### Một nhà cung cấp thật cần gì

Theo design Bước 5 §9.1, §18 "Trước khi bán thật", §19:

- **Một bộ nối** có `verify` (kiểm chữ ký trên raw body và chuẩn hóa sự kiện) và `ack`; tùy chọn `fetchState`, `endTrialNow`, `cancelAtPeriodEnd`. Sự kiện trừ tiền phải mang `transaction_id` (D37).
- **Chỉ gói tự gia hạn** (D35): MoMo subscription, ZaloPay Auto Debit (bộ nối tự gọi lệnh trừ tiền tới ngày), Paddle, store. VNPay và payOS bị loại.
- **Trang thanh toán và trang quản lý gói**: chưa có trong phạm vi bước nào đã design.
- **Hình thức kinh doanh, luật sư, hóa đơn và thuế; sửa landing (⚠9).**
- **Rủi ro còn mở:**
  - MoMo subscription mở cho loại hình nào, hạn mức bao nhiêu: chưa xác minh.
  - Có thể chỉ còn trả bằng thẻ qua Paddle hoặc store.
  - D24 "không hoàn tiền gói năm" so với Luật 19/2023 Điều 42.
  - D29: email báo trước mỗi kỳ gia hạn **mặc định tắt**. CL D4 ghi đây là bắt buộc (≥ 7 ngày làm việc). Cần luật sư.
- Bảng so sánh nhà cung cấp: `docs/preparation/PAYMENT_PROVIDERS_RESEARCH_2026-10-18.md` §1–2.
  - Stripe không nhận người bán ở Việt Nam.
  - Paddle là bên bán thay (MoR), phí 5% + 50¢, nhận cá nhân.
  - VNPay, MoMo, ZaloPay cần hợp đồng merchant.
  - payOS nhận cá nhân, không có sandbox, không tự gia hạn.

### Mâu thuẫn chủ dự án cần chốt

- R (Q2, R:21-64) và CL D1 đề xuất kênh đầu tiên là **payOS, gói trả trước 1/3/12 tháng**.
- D35 Bước 5 (`docs/superpowers/decisions/2026-10-19-buoc-5-entitlements-decisions.md`, mục D35) đã bỏ kiểu "app tự gia hạn". Chủ dự án: "mình không design app theo hướng user phải nhớ đến ngày và chủ động trả".
- Muốn dùng payOS thì phải mở lại D35.

### Ra mắt Free trước

- **Được.**
  - Trial chỉ có khi có thanh toán thật (D15).
  - Pro có thể cấp tay (D9, API `admin/entitlements/grants`).
  - Nghĩa vụ hộ kinh doanh, thông báo TMĐT và Luật 19 về hợp đồng từ xa chỉ áp khi thu tiền (R:71-81; mục 6).
- **Phải làm kèm:**
  - sửa landing: bỏ "14 ngày dùng thử, không cần thẻ", hoặc ghi "chưa mở bán";
  - trang Gói học hiện Pro là "Chưa mở bán". Figma W/52–W/53 đã vẽ đúng kiểu này (UI-CONTEXT phần 20/10, main).

---

## 4. Lỗi chất lượng còn mở

Trạng thái lấy từ việc đọc code và tài liệu; mình không chạy test.

### Review 18/10 (`docs/superpowers/reviews/2026-10-18-buoc-0-4-code-review.md:65-85, 362-457`)

**3 lỗi Cao: đã sửa hết.** PR #98, mốc M1 của plan sửa Bước 0–3.

| ID | Lỗi | Bằng chứng đã sửa |
|---|---|---|
| C1 | `Idempotency-Key`: 10 request ghi cùng lúc → 10 lỗi 500 | `apps/api/src/common/idempotency/idempotency.service.ts:35-55,72,81-89`; T16: pool có `max` và timeout, `prisma.module.ts:25-29` |
| C2 | RAM tăng theo mỗi cách viết `timezone` | `identity/profile/timezone.ts:16-19`; LRU 500 ở `common/time/local-date.ts:18` |
| C3 | Lỗi 500 không để lại log | `problem-details.filter.ts:26-34`; smoke bỏ qua ca này, chỉ có unit test |

**Mức Trung bình:**
- **Đã sửa:**
  - T1/T15, T2, T3, T4, T6/T13 (câu có hai đáp án đúng): PR #100. T3 còn một khe hẹp.
  - T5/T14: PR #98.
  - T8–T11 (phiên admin): PR #101.
- **Không sửa bây giờ:** T7 ("Ôn tất cả" quá 1 s). Chấp nhận theo D39 Bước 4, đo lại "trước pilot" (`docs/deliveries/buoc-4.md:106`).
- **Để tới Deploy:** T12. `TRUST_PROXY` mặc định `false` (`app-config.ts:184-185`), nên sau proxy cả hệ thống chỉ có 5 lần đăng ký mỗi giờ. Rate limit tính IPv6 theo /128. **Cần sửa code** (`rate-limit.guard.ts:26`).

**Mức Thấp: khoảng 55 mục còn mở** ("để đợt sau", D11 của đợt sửa). Theo nhóm:
- ID2–ID9;
- CT3, CT4, CT7–CT9;
- PL5–PL14;
- LN2–LN8;
- AD5–AD11, AD13;
- FD5–FD12;
- DB12, DB16, DB17, DB19;
- PX3, PX5, PX6.

Mục cần chủ dự án chốt: ID4, FD8. DB13 mới sửa một phần. Mục gắn nhãn "deploy-checklist": AD12, L17, DB18, FD-dj.

### Đợt sửa Bước 0–3 (`docs/superpowers/plans/2026-10-20-buoc-0-3-fixes.md`)

| Mốc | PR | Trạng thái |
|---|---|---|
| M1 | #98 | merged |
| M2 | #99 | merged |
| M3 | #100 | merged |
| M4 | #101 | merged |
| **M5** (smoke, as-built, `docs/deliveries/deploy-checklist.md`) | #102, nhánh `test/buoc-0-3-m5-smoke` | **OPEN, chưa merge** |

- Trên `dev`, `docs/deliveries/deploy-checklist.md` chưa tồn tại (kiểm `ls`). Mình đọc nó qua `git show origin/test/buoc-0-3-m5-smoke:...`.
- Review 18/10 có đề nghị nhưng checklist **không có**:
  - DB17: CI pin action theo tag, `deploy-web` chạy tay được từ mọi nhánh;
  - PL5: đo lại thời gian revert;
  - T7: đo lại;
  - kiểm nhắc học khi chạy hai worker (`buoc-4.md:133`).

### Review nghiệp vụ DB (`docs/superpowers/reviews/2026-10-17-db-schema-business-review.md`)

**DB1, DB2, DB3: đã có trong code.**

| Mục | Review hỏi gì | Code trên `dev` |
|---|---|---|
| DB1 | Họ tên, ngày sinh | `prisma/models/identity.prisma:12-14`; `auth.schemas.ts:10-12`; chặn dưới 13 tuổi ở `auth.service.ts:49-51`, `MIN_AGE = 13` ở `identity/profile/person.ts:3` |
| DB2 | Ai review, publish, gỡ, retire một nghĩa | `prisma/models/content.prisma:103-104,128-130`; ghi ở `publish.service.ts:115-140`; publish lại vẫn giữ người publish gốc (`68abada`) |
| DB3 | Đồng ý điều khoản và tuổi tối thiểu | `identity.prisma:15-16` (`terms_accepted_at`, `terms_version`); `accept_terms: z.literal(true)` (`auth.schemas.ts:13`); `TERMS_VERSION` bắt buộc (`app-config.ts:197`) |

**Còn lại:**
- `TERMS_VERSION` thật.
- Luật sư xem mốc 13 tuổi (design sửa thiếu sót dòng 457-458).
- Màn admin cho họ tên và người dùng.
- Chưa kiểm việc nâng cấp các dòng `users` đã có từ trước (as-built M5 dòng 78).

### Quan sát thêm (chưa đối chiếu review)

- `SampleModule` của Bước 0 vẫn đăng ký trong `apps/api/src/app.module.ts:16,21`, nên route công khai `GET /v1/sample` sẽ có trên production. Grep `sample` trong hai file review 18/10 và 20/10 ra 0, tức chưa review nào nhắc.
- Review 18/10 dòng 520-521 ghi file `.verify-b25-accounts.md` ở gốc checkout chính có dòng chứa mật khẩu và token. File vẫn untracked theo `git status` đầu phiên. Subagent grep thấy nó chưa có trong `.gitignore`.

---

## 5. Kế hoạch Deploy đã thiết kế tới đâu

**Thời điểm:** Deploy làm "khi toàn bộ app hoàn chỉnh, trước ra mắt" (D3 vòng 3 Bước 3; `CLAUDE.md`, design Bước 3 §1).

### Domain và bố cục: đã chốt

| Host | Chạy gì | Trạng thái |
|---|---|---|
| `wordmet.com`, `www.wordmet.com` | Worker `wordmet-web` (landing; sau này cả app người học dưới `/vi/app`, `/en/app`, D15, D39) | **Đang chạy** (curl 21/10). `apps/web/wrangler.jsonc:1-24`; CD `.github/workflows/deploy-web.yml` deploy mỗi lần push `main` |
| `api.wordmet.com` | NestJS | Chưa có (curl `000`) |
| `admin.wordmet.com` | Worker `wordmet-admin`, chỉ file tĩnh | `apps/admin/wrangler.jsonc` viết sẵn, chưa deploy (D4 Bước 2.5) |
| `admin-api.wordmet.com` | Trỏ vào cùng tiến trình NestJS với `api.` | Build admin production dừng nếu host không bắt đầu bằng `admin-api.` (design Bước 2.5 §4, dòng 70, 90-92, 120-121; L5) |

- Cookie `refresh_token` host-only trên `api.`, `SameSite=Strict`, `path /v1/auth`.
- `CORS_ORIGINS` phải thêm `https://wordmet.com`.
- Cả domain cần CSP (design Bước 3 §4, dòng 85-93).

### Bước 2.5 §14: chưa chọn gì

Design Bước 2.5 §14 (`docs/superpowers/specs/2026-10-14-buoc-2-5-admin-web-design.md:471-473`) chỉ **liệt kê** việc phải chọn: hosting backend, Postgres/Redis bền, SMTP thật, secret, backup. Chi phí (dòng 502-505):
- Worker thứ hai: 0 đồng.
- Chi phí thật nằm ở API, Postgres và Redis.
- CL E1 ước khoảng 0,9–1,6 triệu đ/tháng (ESTIMATE, main).

### Bước 3 §14: những thứ chỉ kiểm được sau khi deploy

`docs/superpowers/specs/2026-10-16-buoc-3-learning-design.md:438-445`:
- đăng nhập và làm mới phiên giữa `wordmet.com` và `api.` (cookie, CORS, CSP);
- định tuyến `/app/*` và cờ chặn;
- email OTP và email nhắc tới hộp thư thật, không vào spam, link đúng domain;
- nhắc học đúng giờ địa phương khi server chạy UTC; Job Scheduler sống sót khi Redis khởi động lại;
- múi giờ trên thiết bị thật.

§15 thêm: cần SMTP thật và Redis bền cho Job Scheduler.

### Các bước sau thêm việc cho Deploy

- **Bước 5:** `BILLING_FAKE_ENABLED` không bao giờ bật ở production (R17).
- **Bước 6 §18:**
  - giới hạn hàng đợi AI đếm theo từng tiến trình;
  - key AI để trong kho bí mật;
  - worker phải chạy;
  - xem lại pool DB.
- **`deploy-checklist.md`** (nhánh M5, dòng 9-61):
  - `TRUST_PROXY`, gom IPv6 theo /64 (cần sửa code);
  - kiểm rate limit lúc đông người trên Postgres thật;
  - `DATABASE_POOL_MAX` và tổng số kết nối API + worker + CLI;
  - `TERMS_VERSION` thật;
  - chạy `pnpm db:normalize-timezones`;
  - luật sư xem mốc 13 tuổi;
  - `pnpm test:scale`;
  - security header cho admin (AD12) và API (FD-dj);
  - `LEARNER_APP_URL`;
  - quy ước migration `NOT VALID` / `CONCURRENTLY` (DB18).

### Còn mở, chưa chọn và chưa design

- Nhà cung cấp hosting cho API và worker. Repo không có Dockerfile, `fly.toml`, `render.yaml`, `Procfile` (kiểm bằng `find`).
- Postgres và Redis có quản lý.
- Vùng đặt server: đụng câu "lưu dữ liệu tại Việt Nam", mục 6d.
- Email gửi đi:
  - HANDOFF dòng 119 ghi "Gmail cá nhân làm SMTP chưa xác minh";
  - CL E7 bắt dùng nhà cung cấp uy tín, có SPF + DKIM + DMARC;
  - `.env.example:39` vẫn là `SMTP_FROM=no-reply@localhost`.
- Kho secret.
- Backup hằng ngày và khôi phục thử (CL E2).
- Staging (CL E4).
- Giám sát (CL E3).
- DNS cho `api.`, `admin.`, `admin-api.`.
- Branch protection trên `main` và `dev` (CLAUDE.md: "Not done yet").

---

## 6. Pháp lý và tuân thủ cho một website ở Việt Nam

Tài liệu chỉ đọc luật qua trang sao chép, nhiều điểm lấy từ nguồn thứ cấp. **Chưa có ý kiến luật sư** (R:5-6 đòi có ý kiến bằng văn bản "trước lần ra mắt có thu tiền đầu tiên").

**Viết tắt:**
- **L** = `docs/preparation/LEGAL_PAGES_RESEARCH_2026-10-11.md`
- **DS** = `docs/superpowers/specs/2026-10-20-buoc-0-3-fixes-design.md`
- **DR** = `docs/superpowers/decisions/2026-10-20-buoc-0-3-fixes-decisions.md`

### a. Trang Privacy và Terms: **một phần**

- `/privacy` có nội dung thật nhưng **chỉ cho waitlist**:
  - email, ngôn ngữ, thời điểm đăng ký, một cookie, Cloudflare D1, xóa qua email;
  - hiệu lực 08/10/2026 (`apps/web/src/components/sections/PrivacyPolicy.tsx:13`);
  - production 21/10 hiện "hiệu lực từ ngày 08/10/2026".
- `/terms` là bản nháp: production hiện "bản nháp. Nội dung chính thức sẽ được cập nhật trước khi Wordmet chính thức ra mắt" (`LegalDraft.tsx:4,10`; `noindex` ở `terms/page.tsx:11`).
- Footer không có link Privacy hay Terms (`SiteFooter.tsx:18`, commit `b2343e6` "hide privacy and terms links until launch"). Grep `href="/vi/privacy"` trên trang chủ production ra 0.
- Ô đồng ý của waitlist chỉ nêu tên chính sách, không có link (`features/waitlist/labels.tsx:4,16-21`). L:17, L:57 coi đây là trái yêu cầu "biết rõ" của Luật 91 Điều 9.
- Còn thiếu, theo L:13-14, 47-57:
  - ai chịu trách nhiệm dữ liệu;
  - căn cứ xử lý;
  - quyền của người dùng;
  - chuyển dữ liệu ra nước ngoài (Cloudflare, AI, email);
  - thời gian lưu;
  - trẻ em;
  - khiếu nại.
- Trang Privacy hứa xóa trong **30 ngày**, trong khi Nghị định 356 cho khoảng **20 ngày** (E:87; I:181 ghi "20, hoặc 30 nếu cần phối hợp bên xử lý").

### b. Lưu đồng ý và tuổi: **một phần**

**Dev đang lưu một lần đồng ý gộp:**
- `terms_accepted_at`, `terms_version` (`identity.prisma:15-16`);
- một giá trị dùng chung cho "Điều khoản + Chính sách bảo mật" (DS:105, 129);
- không bắt đồng ý lại khi đổi phiên bản (DR:112).

**Chưa có đồng ý theo từng mục đích** (email nhắc, AI, quảng bá):
- Grep `consent|opt_in|marketing` trong `apps/api` ra 0. Đối chứng: `accept_terms` có kết quả.
- Email nhắc học **bật sẵn**: `ReminderPref` "no row means on", `enabled @default(true)` (`apps/api/prisma/models/notifications.prisma:1-4`).
- R:175-176 dùng đúng ví dụ này để nói ô đồng ý phải để trống mặc định. E:299 chỉ xếp biên lai, email gia hạn và email bảo mật là tin dịch vụ, không nói tới email nhắc học. Cần luật sư.
- Một ô tick gộp có thể vướng Luật 91 Điều 9 khoản 4a và Luật 19 Điều 25. Đây là suy luận của subagent, cần luật sư.

**Tuổi:**
- D4 của đợt sửa chốt **13 tuổi, không có bước cha mẹ** (DR:19-21, 102-103).
- Theo E:149, Luật 116/2025 Điều 16 khoản 2 buộc **cha mẹ đăng ký tài khoản bằng thông tin của cha mẹ** khi trẻ dưới 16 dùng dịch vụ trực tuyến. DR và DS không nhắc điều này (grep ra 0).
- R:62 (Q5) và I:229 đề xuất 16+.
- DS:457-458 ghi "Cần luật sư xem trước ra mắt".

### c. Luật 91/2025 (PDPL) và Nghị định 356/2025: **chưa có**

- **DPIA:** nộp trong 60 ngày kể từ lần xử lý đầu, cập nhật 6 tháng một lần (E:90; R:100).
- **CTIA:** "dùng nền tảng ở nước ngoài" là chuyển dữ liệu ra nước ngoài (Điều 20). Ví dụ: Cloudflare, AI ở Mỹ, SMTP nước ngoài (E:89, 121; I:197).
- **Miễn trừ:**
  - Luật 91 Điều 38 miễn DPIA cho hộ kinh doanh và doanh nghiệp siêu nhỏ, nhưng **không** miễn CTIA. EY lại nói Nghị định 356 miễn cả CTIA. Hai nguồn mâu thuẫn, chưa giải (E:92-98, 133).
  - **Cá nhân chưa đăng ký** thì không thuộc danh sách miễn nào (E:121, 134; I:197, 259). Suy luận cần luật sư: đăng ký hộ kinh doanh **trước** khi ra mắt Free có thể có lợi.
  - Mất miễn trừ nếu xử lý dữ liệu nhạy cảm, hoặc từ 100.000 người trở lên.
  - "Lịch sử học là dữ liệu nhạy cảm?" là **UNVERIFIED** (E:116-120; R:48-49).
- **Sự cố:** báo trong 72 giờ (Điều 23), 24 giờ theo Luật 19 Điều 19 (E:91, 113). Chưa có quy trình (CL C6).
- **Xóa dữ liệu:** khoảng 20 ngày (E:87). Bước 8 chưa có design.
- **DPO:** cần khi mất miễn trừ; được thuê dịch vụ bên ngoài (E:99).

### d. Lưu dữ liệu tại Việt Nam và xác thực bằng số điện thoại: **UNVERIFIED**

- Luật 116/2025 Điều 25 khoản 3 và Nghị định 333/2026 (giữ log 12 tháng, xác thực bằng số điện thoại Việt Nam) (E:147-162; R:204-206).
- Chưa rõ nghĩa vụ áp tự động hay chỉ khi có yêu cầu; chưa rõ có phủ tới app không phải mạng xã hội không.
- Có thể xung đột với việc đặt Cloudflare D1 hoặc Postgres ở nước ngoài.
- Quyết định này **chặn việc chọn vùng hosting** ở mục 5.

### e. Luật Bảo vệ người tiêu dùng 19/2023: **chỉ khi thu tiền**

- Điều 37–38: thông tin trước khi ký; xem lại và tải hợp đồng; hủy và hoàn tiền trong 30 ngày.
- Điều 42 khoản 2: báo trước **≥ 7 ngày làm việc** trước mỗi lần thu phí và trước khi hết hạn.
- Điều 42 khoản 3: hủy bất cứ lúc nào, chỉ trả phần đã dùng.
- Điều 25: cấm điều khoản bất công.
- Nguồn: E:179-194; R:81, 157-169.
- Lệch với code: D29 (email báo trước mặc định tắt) và D24 (không hoàn tiền); design Bước 5 §19 ghi cần luật sư.

### f. Thương mại điện tử (Luật 122/2025, Nghị định 248/2026): **chưa có, chỉ cần khi thu tiền**

- Thông báo website TMĐT tới **UBND cấp tỉnh** (không phải Bộ Công Thương như hướng dẫn cũ) qua Cổng Dịch vụ công; trả lời trong 3 ngày làm việc; gắn biểu tượng online.gov.vn (E:44-56; R:146-153).
- Mốc là trước khi vận hành nền tảng "có chức năng đặt hàng online". R:78 ghi "trước khi mở thanh toán". Trang chỉ trưng bày thì không phải thông báo (E:49, nguồn thứ cấp).
- Công khai họ tên, địa chỉ, mã số thuế (Điều 4; CL B1).
- I:199 gọi văn bản hướng dẫn là "dự thảo"; E:46 ghi Nghị định 248 đã ban hành 30/6/2026. L:65 nhắc thêm hai thông tư TT 38/2025 và TT 26/2026 mà R và E không có.

### g. Hộ kinh doanh và thuế: **chưa có, chỉ khi thu tiền**

- Nghị định 168 Điều 82 khoản 3 không miễn đăng ký cho bán online (suy luận, E:17, 26).
- Thuế: doanh thu ≤ 1 tỷ đ/năm không chịu VAT và thuế TNCN, chỉ nộp tờ khai 01/TKN-CNKD (E:205-215; R:208-212). I:165 nêu ngưỡng 500 triệu theo Luật 109/2025; các nguồn mâu thuẫn.

### h. AI: **chưa có, chỉ khi bật AI**

- Luật AI 134/2025, Nghị định 142/2026: tự phân loại rủi ro; rủi ro trung bình thì thông báo Bộ KH&CN; báo sự cố (E:265-282; R:225-229).
- Gửi dữ liệu cho AI ở nước ngoài là chuyển dữ liệu ra nước ngoài (E:121).
- Thiết kế AR7: AI chỉ nhận nội dung học, không nhận email, tên hay user ID (L:38).
- Điều khoản nhà cung cấp:
  - Gemini cấm người dưới 18;
  - Anthropic bắt nói rõ người dùng đang tương tác với AI;
  - quy định under-18 của OpenAI là **UNVERIFIED** (R:395-399).
- Mốc 13 tuổi làm vấn đề này nặng hơn (design Bước 6 §18-19).

### i. Cookie và analytics: **xong cho hiện tại**

- Web không có script analytics hay quảng cáo nào (grep `analytics|gtag|posthog|plausible|...` trong `apps/web/src` ra 0).
- Cookie duy nhất là `NEXT_LOCALE` (`apps/web/src/i18n/routing.ts:3,9`). Kế hoạch là "không quảng cáo, không theo dõi" (L:96, 119).
- Không tài liệu nào đòi banner cookie cho cookie thiết yếu.
- Nếu bật quảng cáo: cần đồng ý cho theo dõi theo Luật 91 Điều 28 (I:187; design Bước 5 §11 đã khóa `ads_enabled` cho tới lúc đó).
- `observability` của Worker (`wrangler.jsonc:5`) có lẽ chỉ là log phía server (`ASSUMPTION`).

### j. Câu hỏi đã ghi "hỏi luật sư"

- R:48-52 (dữ liệu nhạy cảm, lưu tại Việt Nam, số điện thoại, cổng thanh toán nhận hộ kinh doanh).
- CL mục I (7 câu).
- E:418-426.
- L:139-140, L:160.
- DS:457-458 (mốc 13 tuổi).
- Thêm từ bản này: email nhắc học bật sẵn có cần đồng ý riêng không; ô tick gộp Terms và Privacy có đủ không.

---

## 7. Nội dung

**Trạng thái: chưa có.**

- **Kế hoạch (đã chốt):**
  - AI soạn nháp CSV ngoài app; chủ dự án duyệt; import bằng luồng CSV có sẵn; thử lô ~20 từ trước để đo thời gian duyệt (D5).
  - Đích **8.812 từ** trước ra mắt (D6). Sau D12 không còn mốc "lô đầu" (`docs/superpowers/decisions/2026-10-16-buoc-3-learning-decisions.md:25-26, 114-131`).
- **Bằng chứng đã nạp gì:** `docs/deliveries/buoc-3-test-flow.md:65` ghi lần chạy tay trên DB mới với file CEFR-J 1.5:
  - 7.799 dòng tạo mới, `senses_created 0`;
  - level A1 1.164, A2 1.411, B1 2.446, B2 2.778, **C1 0, C2 0** (dòng 67), tức Octanove C1/C2 chưa nạp;
  - sau đó chỉ điền nghĩa cho **6–7 dòng** thử (dòng 68-69).
  - Đây là DB local để test, không phải dữ liệu thật để ra mắt.
- **Lô thử 20 từ:** không tìm thấy bằng chứng đã làm.
  - Trong checkout chính chỉ có CSV nguồn (`cefrj-vocabulary-profile-1.5.csv`, `octanove-vocabulary-profile-c1c2-1.0.csv`) và fixture test.
  - Không có CSV nội dung đã soạn.
  - Kiểm kê 19/10 (`docs/preparation/evidence/commercialization-2026-10-19/5_project_inventory.md:43,150`, main) cũng kết luận "No content CSV in repo; 20-word trial not evidenced".
- **Giấy phép:**
  - CL F2: nên dùng CEFR-J 1.6 chính thức; repo đang nhập bản 1.5 từ mirror.
  - CL B6: `THIRD_PARTY_NOTICES.md` thiếu CEFR-J và Octanove.
  - CL J: xin Tono Lab xác nhận việc dùng CEFR-J cho mục đích thương mại (nên có).
- **Ước tính công duyệt:** 73–440 giờ (`ASSUMPTION`, D6).
- **Vướng phía công cụ:** P1 trong `buoc-3-test-flow.md:82-83`. Xuất "từ chưa có nghĩa" quá 5.000 dòng thì bị chặn `export-too-large` (`EXPORT_MAX_ROWS=5000`), phải xuất theo từng level.

---

## 8. Vận hành phía con người

**Trạng thái: một phần.**

- **Email liên hệ:**
  - `hello@wordmet.com` là email liên hệ của landing (`apps/web/src/lib/site.ts:4`; `deploy-web.yml` `NEXT_PUBLIC_CONTACT_EMAIL`).
  - Thư nhận được chuyển qua Cloudflare Email Routing về Gmail cá nhân. Có rule cho `hello@` và `ryan.ngo@` (design deploy landing dòng 16; L:33).
  - Guide 09/10 (`docs/guides/2026-10-09-landing-deploy-done.md:274-290`) ghi Task 7, gồm Email Routing, "chưa đủ bằng chứng hoàn thành". Mình không kiểm được hộp thư có nhận thư thật không.
- **Trong app:** chưa có trang trợ giúp hay liên hệ, chưa có quy trình khiếu nại (CL B5; R:88).
- **Tài khoản admin và editor:**
  - Admin đầu tiên tạo bằng `pnpm admin:grant <email>` (`apps/api/package.json:10`). Editor do admin tạo trên trang admin (D18–D21 Bước 2.5).
  - Trên production chưa có tài khoản nào vì chưa có API.
  - Theo D9 Bước 5, tài khoản staff dùng phía người học như Free.
- **Liên hệ khi có sự cố, quy trình sự cố, trang trạng thái, mục tiêu ổn định (SLO):** **chưa có** (R:117; CL C6, E3).
  - Grep `runbook|incident|on-call` trong `docs/` chỉ ra tài liệu chuẩn bị và spec, không có runbook nào.
  - Luật đòi báo sự cố dữ liệu trong 72 giờ tới A05 (mục 6c).
- **Người duyệt nội dung:** chỉ chủ dự án (D5). Không có người dự phòng.

---

## Bảng tổng hợp

Trạng thái: **xong** / **một phần** / **chưa có**.

### Bắt buộc trước launch (kể cả khi chỉ ra mắt Free)

| # | Việc | Trạng thái | Nguồn |
|---|---|---|---|
| B1 | App người học trên web (`/vi/app`, `/en/app`): đăng ký, OTP, đăng nhập, ngôn ngữ, tra từ, nhóm, flashcard, lịch ôn, thêm nhanh, từ riêng, luyện tập, cài đặt, gói học (xem) | chưa có (API xong) | mục 1; `apps/web/src/app/[locale]/`; curl `/vi/app` 404 |
| B2 | Plan giao diện người học; chốt nốt các câu giao diện còn mở | chưa có | UI-CONTEXT §7; phần 20/10 (main) |
| B3 | Cờ chặn và trang "chưa mở" cho `/app/*` tới khi Deploy xong (nếu `main` deploy trước) | chưa có (mới "Đề xuất") | design Bước 3:89-90, 408 |
| B4 | Nội dung: nghĩa tiếng Việt đã duyệt (đích 8.812 từ); làm lô thử 20 từ trước | chưa có | D5, D6; `buoc-3-test-flow.md:65-69` |
| B5 | Deploy API, worker, Postgres/Redis bền, admin, `api.`/`admin-api.` | chưa có | design 2.5 §14; curl `api.` 000 |
| B6 | Email gửi đi thật (OTP, nhắc học), có SPF, DKIM, DMARC | chưa có | CL E7; HANDOFF:119; `.env.example:39` |
| B7 | Merge M5 (#102) và làm hết `deploy-checklist.md`, gồm T12 (`TRUST_PROXY` và gom IPv6, cần sửa code) | một phần | mục 4, 5 |
| B8 | Kiểm các mục của design Bước 3 §14 sau khi deploy | chưa có | design Bước 3:438-445 |
| B9 | Privacy Policy đầy đủ cho tài khoản người học (tiếng Việt), bật lại link ở footer và form | một phần (chỉ waitlist) | `PrivacyPolicy.tsx`; `SiteFooter.tsx:18`; L |
| B10 | Terms thật; `TERMS_VERSION` khớp bản Terms đã đăng | chưa có (placeholder) | `LegalDraft.tsx`; `app-config.ts:197`; checklist M5:33 |
| B11 | Đồng ý theo từng mục đích, ít nhất cho email nhắc học (hiện bật sẵn); lưu vết | chưa có | `notifications.prisma:1-4`; R:175-176 |
| B12 | Chốt tuổi tối thiểu với luật sư (13 không hỏi cha mẹ, hay 16+) | một phần (code 13) | `person.ts:3`; DS:457-458; E:149 |
| B13 | Ý kiến luật sư về DPIA, CTIA, lưu dữ liệu tại Việt Nam (quyết định vùng hosting); cân nhắc đăng ký hộ kinh doanh trước để được miễn trừ | chưa có | mục 6c, 6d |
| B14 | Cách xóa tài khoản kèm dữ liệu trong khoảng 20 ngày (tự động ở Bước 8, hoặc quy trình tay tạm thời nếu luật sư cho phép: **suy luận**); sửa câu "30 ngày" trên Privacy | chưa có | CL C4; E:87; review 20/10 N9 |
| B15 | Quy trình sự cố dữ liệu 72 giờ; người liên hệ khi có sự cố | chưa có | CL C6; R:117 |
| B16 | Sửa landing: bỏ "14 ngày dùng thử, không cần thẻ" và "Tự động ưu tiên từ hay quên" cho khớp sản phẩm | chưa có | `vi.json:133,141,146`; ⚠9 Bước 5 |
| B17 | Kênh hỗ trợ: email trên web (có) + mục Trợ giúp/Liên hệ trong app; kiểm Email Routing nhận thư thật | một phần | `site.ts:4`; CL B5; guide 09/10:274-290 |
| B18 | Chủ dự án chốt phạm vi ra mắt: Free-only hay có Pro; có AI (Bước 7) không | chưa có | mục 2, 3 |

### Bắt buộc nếu ra mắt có thu tiền (thêm vào trên)

| # | Việc | Trạng thái | Nguồn |
|---|---|---|---|
| P1 | Hộ kinh doanh và mã số thuế; công khai danh tính chủ sở hữu | chưa có | CL A1, B1; R:71, 77 |
| P2 | Thông báo website TMĐT được UBND tỉnh xác nhận trước khi mở thanh toán | chưa có | CL A2; E:44-56 |
| P3 | Chọn cổng thanh toán; giải mâu thuẫn D35 (chỉ tự gia hạn) với đề xuất payOS trả trước; viết bộ nối thật | chưa có (chỉ có bộ nối giả) | design Bước 5 §9.1, §18; R Q2; D35 |
| P4 | Trang giá, trang thanh toán, trang quản lý và hủy gói | chưa có | CL B4, D2; design Bước 5 §3 |
| P5 | Luật 19: email báo trước ≥ 7 ngày làm việc (đang tắt, D29); cho hủy bất cứ lúc nào; chính sách hoàn tiền (D24) | một phần (có code, mặc định tắt) | CL D4, D5; design Bước 5 §19 |
| P6 | Chốt giá Pro (K26) | chưa có | CL D6; R Q6 |
| P7 | Màn admin cấp Pro và xem gói | chưa có (API xong) | `nav.ts:34` |

### Nên có lúc ra mắt

| # | Việc | Trạng thái | Nguồn |
|---|---|---|---|
| N1 | Màn admin: "Thông báo & giới hạn", người dùng và khóa tài khoản, câu bị báo lỗi | chưa có (API xong) | `nav.ts:22-39`; design Bước 3 §3 |
| N2 | Màn "Nguồn dữ liệu và giấy phép"; bổ sung CEFR-J và Octanove vào THIRD_PARTY_NOTICES | một phần | CL B6; `sources.controller.ts:25` |
| N3 | Dùng CEFR-J 1.6 chính thức; xin Tono Lab xác nhận dùng thương mại | một phần | CL F2, J |
| N4 | Gỡ `SampleModule` (`/v1/sample`) khỏi bản production | chưa có (quan sát, chưa review) | `app.module.ts:16,21` |
| N5 | Đo lại T7 và PL5; chạy tay nhắc học với hai worker | chưa có | `buoc-4.md:106,133`; review 18/10 |
| N6 | Backup, khôi phục thử, staging, giám sát (chi tiết ở agent hạ tầng) | chưa có | CL E2–E4 |
| N7 | Branch protection `main` và `dev` | chưa có | CLAUDE.md "Not done yet" |
| N8 | Xử lý `.verify-b25-accounts.md` (có mật khẩu và token, untracked, không có trong `.gitignore`) | chưa có | review 18/10:520-521 |

### Để sau

| # | Việc | Trạng thái | Nguồn |
|---|---|---|---|
| S1 | Bước 7 (AI): design, lần gọi thật, các việc trước ra mắt của Bước 6 §18, nghĩa vụ Luật AI | chưa có (bảng câu hỏi chưa trả lời) | nhánh `docs/buoc-7-design` @ `9d60618`; design Bước 6 §18-19 |
| S2 | Đăng nhập Google (Bước 8) | chưa có | HANDOFF:65 |
| S3 | Khoảng 55 lỗi mức Thấp của review 18/10 và 20/10 | chưa có | D11 đợt sửa |
| S4 | Quảng cáo (cần tuổi tối thiểu và đồng ý theo dõi) | chưa có (mặc định tắt) | design Bước 5 §11 |
| S5 | DPO; DPIA khi mất miễn trừ (≥ 100.000 người, hoặc dữ liệu nhạy cảm) | chưa có | CL J; E:99 |
| S6 | Dashboard admin; màn AI admin (chủ dự án tự làm, D8 Bước 6) | chưa có | `nav.ts:23,35-37` |
| S7 | Bản tối cho app web | chưa có | UI-CONTEXT 20/10 (main) |

---

## Chưa kiểm được

- **Trạng thái thật trên Cloudflare:**
  - Có Email Routing cho `hello@` không, hộp thư có nhận thư thật không.
  - Rule rate limit cho waitlist.
  - D1 production có migration chưa.
  - Mình chỉ thấy landing trả 200 và trang privacy và terms đang chạy.
- **`api.wordmet.com`:** curl trả `000` và `nslookup` không có trả lời. Có thể domain chưa có bản ghi, cũng có thể do DNS của máy này. Mình kết luận "chưa deploy" dựa thêm vào tài liệu.
- **Trạng thái "đã sửa" của C1–C3 và các lỗi Trung bình:** dựa trên đọc code và as-built tự báo. Không chạy test hay smoke nào trong phiên này. Smoke không phủ C3.
- **Khoảng 55 lỗi mức Thấp:** trạng thái "còn mở" lấy từ kiểm kê 20/10. Chưa đọc lại code của từng lỗi.
- **Nội dung trong DB local của chủ dự án:** kiểm kê 19/10 có chạy `SELECT count(*)` ra "4–20 nghĩa". Mình không truy vấn DB.
- **Figma page "03 Người học · Web":** mình chỉ đọc mô tả trong UI-CONTEXT (main, chưa commit), không mở Figma.
- **Các câu pháp lý ghi UNVERIFIED:** chưa câu nào được luật sư hay nguồn chính thức xác nhận. Các điểm mâu thuẫn giữa R, E và I (ngưỡng thuế, miễn CTIA, tên Nghị định 248, hai thông tư ở L:65) chưa giải.
- **Hai file PDF untracked về subscription billing** trong `docs/`: không đọc.
- **Phạm vi ra mắt:** không có tài liệu nào chốt ra mắt Free-only hay có Pro. Câu này để chủ dự án quyết.
