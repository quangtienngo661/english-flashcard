# Design — Bước 5: Entitlements & Usage (gói, quyền, hạn mức, cổng thanh toán; chỉ API)

> **Trạng thái 19/10/2026: đã duyệt** ("Mình duyệt design Bước 5", 19/10). Mọi quyết định sản phẩm đã hỏi từng câu trong chat theo luật "chủ dự án trả lời
> trước, Claude đề xuất sau" (giữ ở Bước 5, D1). Ba phần trình bày trong chat (kiến trúc; dữ liệu và luật tính; API, thanh toán, mã lỗi, kiểm thử) chủ dự án đã
> duyệt; khi đọc bản viết, chủ dự án sửa hai chỗ (D29, D30) và duyệt các đề xuất còn lại. Bước tiếp: plan (`superpowers:writing-plans`), đọc lại code trên `dev`.
>
> **Cập nhật 19/10/2026, sau review độc lập** ([`../reviews/2026-10-19-buoc-5-design-review.md`](../reviews/2026-10-19-buoc-5-design-review.md), 25 phát hiện):
> bốn câu sản phẩm đã chốt (D31–D34); các sửa kỹ thuật chủ dự án duyệt hết cùng ngày ("ok"). Danh sách ở mục 0, bảng "Sau review độc lập". Nhật ký hỏi đáp từng vòng: [`../reviews/2026-10-18-buoc-5-brainstorm-log.md`](../reviews/2026-10-18-buoc-5-brainstorm-log.md). Decision record:
> [`../decisions/2026-10-19-buoc-5-entitlements-decisions.md`](../decisions/2026-10-19-buoc-5-entitlements-decisions.md).
>
> **Cập nhật 19/10/2026, sau review plan** ([`../reviews/2026-10-19-buoc-5-plan-review.md`](../reviews/2026-10-19-buoc-5-plan-review.md)): **D35** — chỉ nhận gói tự
> gia hạn, bỏ kiểu "app tự gia hạn" khỏi lõi; **D36** — bỏ email cảnh báo trần AI, chỉ báo trên màn admin; **D37** — bộ nối bắt buộc gửi mã giao dịch, không
> biết giao dịch của kỳ đang dùng thì hoàn tiền chỉ ghi lại; **D38** — staff sửa ngày của lần cấp đang có (API mới, có lịch sử), lần cấp Pro bắt đầu ở tương lai
> không thu hồi lần cũ. Danh sách chỗ sửa ở mục 0, bảng "Sau review plan". Không còn câu mở của review plan.
>
> **Cập nhật 19/10/2026, khi implement** (câu của phiên implement step-5-C, hỏi qua step-5-coordinator): **D39** — hoàn tiền cắt Pro thì hệ thống tự hỏi lại
> nhà cung cấp ngay sau đó, job mỗi giờ hỏi lại gói bị cắt trong 3 ngày. Danh sách chỗ sửa ở mục 0, bảng "Khi implement".

Ngày: 18–19/10/2026. Brainstorm qua `superpowers:brainstorming` trên nhánh `docs/buoc-5-design` (cắt từ `origin/dev` @ `dc4cbe0`, fast-forward lên
`9deb8d4` ngày 19/10). Design liên quan: [Bước 4](2026-10-18-buoc-4-practice-design.md) (mục 12: chỗ kiểm quyền tạm), [Bước 3](2026-10-16-buoc-3-learning-design.md)
(mục 9: cài đặt; D23: giới hạn thành hạn mức theo gói).

**Nhãn:** **Chốt** = chủ dự án chọn trong chat (mã D# của decision record). **Đề xuất, đã duyệt 19/10** = Claude đề xuất khi trình một phần design, chủ
dự án duyệt cả phần. **Đề xuất** = Claude đề xuất trong bản viết này, chưa được duyệt riêng (chủ dự án duyệt khi đọc doc). **ASSUMPTION** = con số hoặc
giả định chưa kiểm chứng. Design doc là tài liệu chính thức để build; `docs/specs/` là khung ban đầu, không sửa theo doc này (chủ dự án, 12/10/2026). Mã
spec (ER#, K#, F#…) chỉ để truy nguồn. Tiêu chí `B5#`, edge case `B5E#`.

**Research đi kèm** (đều trong `docs/preparation/`, mỗi ý có nguồn và nhãn): nhà cung cấp thanh toán
[`PAYMENT_PROVIDERS_RESEARCH_2026-10-18.md`](../../preparation/PAYMENT_PROVIDERS_RESEARCH_2026-10-18.md), trial
[`TRIAL_MODELS_RESEARCH_2026-10-18.md`](../../preparation/TRIAL_MODELS_RESEARCH_2026-10-18.md), giới hạn gói Free
[`FREE_PLAN_LIMITS_RESEARCH_2026-10-18.md`](../../preparation/FREE_PLAN_LIMITS_RESEARCH_2026-10-18.md), hạn mức AI
[`AI_QUOTA_BENCHMARK_RESEARCH_2026-10-19.md`](../../preparation/AI_QUOTA_BENCHMARK_RESEARCH_2026-10-19.md), quảng cáo
[`ADS_INTEGRATION_RESEARCH_2026-10-19.md`](../../preparation/ADS_INTEGRATION_RESEARCH_2026-10-19.md), vòng đời gói
[`SUBSCRIPTION_LIFECYCLE_RESEARCH_2026-10-19.md`](../../preparation/SUBSCRIPTION_LIFECYCLE_RESEARCH_2026-10-19.md), tham khảo app khác
[`APP_REFERENCES_FUTURE_IDEAS_2026-10-19.md`](../../preparation/APP_REFERENCES_FUTURE_IDEAS_2026-10-19.md).

## 0. Đọc trước: những chỗ đổi so với quyết định cũ

| # | Đổi gì | Từ | Thành | Quyết định |
|---|---|---|---|---|
| ⚠1 | Trial | K7: người học tự bật, không cần thẻ, 14 ngày | **Giữ thẻ, không hủy thì tự lên Pro; 7 ngày**; chỉ có khi có thanh toán thật. Trước đó người học có AI chỉ qua cấp tay | D15, D16 |
| ⚠2 | Gói Free | F34: Free không giới hạn theo gói trừ AI | Free giới hạn **số phiên luyện không AI mỗi ngày** (mặc định 3) | D4, D5 |
| ⚠3 | Giới hạn nhóm, từ riêng, câu ngữ cảnh | D23 Bước 3: thành hạn mức theo gói | **Không theo gói**; thành cài đặt chung admin chỉnh (trần kỹ thuật) | D4, D17 |
| ⚠4 | Chỗ kiểm tạm của Bước 4 | D25 Bước 4: Bước 5 thay phần bên trong, không sửa Practice | Thay phần bên trong **và** sửa nhỏ Practice: đếm phiên khi câu đầu có kết quả, kiểm hạn mức lúc mở phiên, mã lỗi theo lý do | mục 4 |
| ⚠5 | Hạn mức AI (K18 hoãn) | Chưa có cấu trúc | Lượt mỗi tháng, hai kho riêng, làm mới theo ngày bắt đầu gói, không cộng dồn; gói năm làm mới mỗi tháng (trả lời câu mở thứ nhất của K26) | D10–D14 |
| ⚠6 | Trần chi AI (ER14) | Tính bằng tiền | **Đếm bằng lượt** toàn hệ thống mỗi ngày (giờ Việt Nam) | D18 |
| ⚠7 | Hủy gói năm (câu mở thứ hai của K26) | Chưa có | **Không hoàn tiền**, dùng tới hết kỳ đã trả; cần luật sư trước khi bán gói năm (mục 19) | D24 |
| ⚠8 | Quyền staff | D6 Bước 1: `entitlements.grant` (admin, editor), `ai.settings` (admin) | `entitlements.grant` có luật riêng cho `editor`; **bỏ `ai.settings`**, dùng lại `settings.manage` | D6–D8; mục 10 |
| ⚠9 | Landing | "Dùng thử 14 ngày miễn phí", "Không cần nhập thẻ thanh toán" | Phải sửa khi chốt câu chữ gói (chủ dự án: "sửa được") | D4, D15 |
| ⚠10 | Quảng cáo | Chưa có | Free có quảng cáo, trial và Pro không; công tắc mặc định **tắt** | D21 |

### Sau review độc lập (19/10/2026)

Mỗi dòng ứng với một phát hiện của file review. **Chốt** = chủ dự án trả lời (D31–D34). **Đề xuất, đã duyệt 19/10** = sửa kỹ thuật Claude đề xuất theo review,
chủ dự án đọc danh sách một dòng mỗi điểm và trả lời "ok". **Sửa** = chữ cũ hoặc chỗ sai so với code, không đổi quyết định nào.

| # | Điểm | Nhãn | Mục |
|---|---|---|---|
| R1 | Thông báo chia hai loại: **trạng thái** (áp theo `occurred_at`) và **cộng thêm** (`renewed`, `refunded`; `payment_succeeded` bỏ theo D35: luôn áp, chống trùng theo mã giao dịch, không bao giờ `stale`); payload tối thiểu từng loại | Đề xuất, đã duyệt 19/10 | 9.2, 9.3 |
| R2 | Hết hạn theo thời gian chỉ khi đã đặt hủy cuối kỳ (gói "app tự gia hạn" bỏ theo D35); `renewed` tới muộn luôn trả về `active`; gói quá kỳ chưa có thông báo theo D31 | Chốt D31 + đề xuất đã duyệt | 9.4 |
| R3 | Bảng đủ 7 cột trạng thái (gồm "chưa có dòng") × 13 loại thông báo (14 trước D35) | Đề xuất, đã duyệt 19/10 | 9.4 |
| R4 | Kiểm hạn mức phiên **sau** khi đóng phiên cũ (đã chờ khóa dòng), bịt kẽ hở tính được phiên thứ 4 | Đề xuất, đã duyệt 19/10 | 4, 7.4 |
| R5 | Plan có task sửa `smoke:buoc-4` (learner của nó thành Free, 3 phiên/ngày) | Đề xuất, đã duyệt 19/10 | 17 |
| R6 | Hợp đồng cho bên gọi: không gọi AI khi đang giữ khóa của Entitlements; tối đa một `reserve` mỗi transaction; `reserve` trả trạng thái | Đề xuất, đã duyệt 19/10 | 7.1, 18 |
| R7 | Bảng luật `confirm` theo trạng thái dòng; lưu lý do nhả | Đề xuất, đã duyệt 19/10 | 6, 7.1 |
| R8 | Mốc chu kỳ theo **nguồn Pro bắt đầu gần nhất**; cấp Pro là gói mới (D32); bảng ví dụ | Chốt D32 | 5.5, 10 |
| R9 | Email có trạng thái gửi, cửa sổ gửi, gửi theo cách của email nhắc học; không gửi email trial khi `trial_denied` | Đề xuất, đã duyệt 19/10 | 6, 14 |
| R10 | Luật dùng `fetchState`; bộ nối giả giữ trạng thái và có cờ tắt `fetchState` | Đề xuất, đã duyệt 19/10 | 9.1, 9.2 |
| R11 | ~~Gói "app tự gia hạn": một dòng mỗi người mỗi nhà cung cấp (`app:<user_id>`); luật mua lại~~ **Bỏ theo D35** | Đề xuất, đã duyệt 19/10; bỏ 19/10 | 9.4 |
| R12 | Khoảng hợp lệ của con số riêng; luật `starts_at`; số phiên = 0 → `plan-required`; API cấp thêm 404; editor không thu hồi lần cấp có lượt AI | Chốt D33 + đề xuất đã duyệt | 10, 12 |
| R13 | Smoke: tạo dữ liệu lớn bằng SQL, lùi thời gian bằng SQL (liệt kê cột), N request song song | Đề xuất, đã duyệt 19/10 | 17 |
| R14 | Ghi sổ bằng `INSERT … ON CONFLICT DO NOTHING` (tiền lệ trong repo) để lỗi trùng không làm hỏng transaction ghi đáp án | Đề xuất, đã duyệt 19/10 | 7 |
| R15 | API xem gói chỉ cần đăng nhập, không `@LearnerContent()` (tài khoản mới, staff gọi được; tránh vòng import Content ↔ Entitlements) | Đề xuất, đã duyệt 19/10 | 12.1 |
| R16 | Webhook đọc raw body, giới hạn 64 KB riêng cho route, nhận cả GET (VNPay IPN) | Đề xuất, đã duyệt 19/10 | 9.2 |
| R17 | Thông báo `sandbox` không áp ở production | Đề xuất, đã duyệt 19/10 | 9.2 |
| R18 | Email thanh toán dùng tối đa 95% hạn mức email ngày, chừa phần cho OTP | Đề xuất, đã duyệt 19/10 | 4, 14 |
| R19 | Job mới nhận dòng bằng `FOR UPDATE SKIP LOCKED`, kiểm lại trạng thái dưới khóa | Đề xuất, đã duyệt 19/10 | 4, 9.2, 14 |
| R20 | `getProfile` đã trả `staff_role`; chỉ danh sách email admin là mới (bỏ theo D36); test quyền và fake của Practice phải sửa | Sửa | 4 |
| R21 | Điều kiện hoàn lượt theo số **đã xác nhận** (không tính dòng đang giữ); thời điểm của dòng `credit` | Đề xuất, đã duyệt 19/10 | 7.2 |
| R22 | Chữ và nhất quán nhỏ | Sửa | nhiều |
| R23 | Xóa `raw_payload` sau 90 ngày (`ASSUMPTION`) | Đề xuất, đã duyệt 19/10 | 6, 9.2 |
| R24 | Hoàn tiền (kể cả một phần) cho kỳ đang dùng → mất Pro ngay; hủy không hoàn → giữ tới hết kỳ; hoàn tiền áp cho kỳ của giao dịch được hoàn | Chốt D34 | 9.4 |
| R25 | Đường thông báo trial không đòi email đã xác minh (khác `trial_eligible`); hai tài khoản cùng thẻ bắt đầu trial cùng lúc | Đề xuất, đã duyệt 19/10 | 8, 15 |

### Sau review plan (19/10/2026)

Review plan: [`../reviews/2026-10-19-buoc-5-plan-review.md`](../reviews/2026-10-19-buoc-5-plan-review.md) (21 phát hiện kỹ thuật đã sửa vào plan; 4 câu sản phẩm Q1–Q4).
Research cho Q3: [`EARLY_MANUAL_RENEWAL_RESEARCH_2026-10-19.md`](../../preparation/EARLY_MANUAL_RENEWAL_RESEARCH_2026-10-19.md).

| # | Điểm | Nhãn | Mục sửa |
|---|---|---|---|
| D35 | **Chỉ nhận gói tự gia hạn** (store, Paddle/Stripe, MoMo subscription, ZaloPay Auto Debit). Bỏ kiểu "app tự gia hạn" (người dùng tự trả từng kỳ, VNPay/payOS): bỏ sự kiện `payment_succeeded`, cột `subscriptions.renewal`, dòng `app:<user_id>` (R11), 30/365 ngày, email "báo sắp hết hạn" và cài đặt `expiry_notice_days_before`, ca B5E56, B5E57, B5E69. Với MoMo/ZaloPay, việc Wordmet gọi lệnh trừ tiền mỗi kỳ nằm trong bộ nối (khi viết bộ nối thật), bộ nối báo `renewed` / `renewal_failed` như mọi nhà cung cấp | Chốt D35 (cách (e): chủ dự án; bỏ khỏi lõi: đề xuất Claude, chủ dự án chốt) | 2, 3, 6, 9.1, 9.2, 9.3, 9.4, 13, 14, 15.4, 15.6, 18, 19 |
| D36 | **Bỏ email cảnh báo trần AI**; chạm `ai_cap_alert_percent` (giữ, mặc định 75) thì API lượt AI của admin trả `alert_reached = true` để màn admin tô vàng (đợt giao diện). Bỏ loại thông báo `ai_cap_alert`, danh sách email admin của Identity, ca B5E15, B5E16, phần email của B5#16 | Chốt D36 (bỏ email: chủ dự án; chi tiết: đề xuất Claude, chủ dự án chốt) | 2, 4, 6, 7.3, 12.2, 13, 14, 15.1, 16, 18 |
| D37 | **Bộ nối bắt buộc gửi mã giao dịch** mỗi khi có trừ tiền: `subscription_started` không có trial, `plan_changed` có trả tiền ngay (mã của kỳ mới), `renewed`; tin đầu thiếu mã thì bộ nối tự hỏi thêm nhà cung cấp. Hai sự kiện đó cập nhật "giao dịch của kỳ đang dùng", nên B5E87 chạy đúng. Vẫn nhận `refunded` khi không biết giao dịch của kỳ đang dùng → **chỉ ghi lại và log** `billing_refund_unmatched`, không cắt Pro (ca mới B5E93) | Chốt D37 (đề xuất Claude sau khi chủ dự án nói "khó xảy ra", chủ dự án chốt) | 2, 9.1, 9.3, 9.4, 15.7 |
| D38 | **Sửa ngày lần cấp** thay vì tạo lần cấp mới: API `PATCH /v1/admin/entitlements/grants/{id}` đổi `ends_at` (dời ra hay rút ngắn, vẫn ở tương lai) và `starts_at` (chỉ khi chưa bắt đầu); luật quyền như thu hồi; bảng lịch sử sửa `entitlement_grant_changes`. Vẫn cho tạo lần cấp bắt đầu ở tương lai (R12); lần cấp Pro mới bắt đầu ở tương lai **không thu hồi** lần cũ (D32 chỉ áp cho lần cấp bắt đầu ngay); chồng ngày thì cả hai cùng tính | Chốt D38 (sửa ngày, không thu hồi: chủ dự án; chi tiết: đề xuất Claude, chủ dự án "ok") | 2, 6, 10, 12.2, 12.5, 15.7, 16 |

### Khi implement (19/10/2026)

Câu do phiên implement nêu khi viết bộ áp sự kiện (Task 17), chuyển cho chủ dự án qua phiên điều phối; luật "chủ dự án trả lời trước, Claude đề xuất sau" (D1).

| # | Điểm | Nhãn | Mục sửa |
|---|---|---|---|
| D39 | **Hoàn tiền tới sai thứ tự** (Review Focus 2 của plan): tin `refunded` của giao dịch cũ tới trước `plan_changed` của kỳ mới, hoặc `refund_reversed` tới trước `refunded`, làm gói bị cắt nhầm. Mỗi lần `refunded` cắt Pro (`revoked`), sau khi transaction commit hệ thống **tự hỏi lại nhà cung cấp** (`fetchState`, nếu bộ nối có) và theo trạng thái thật; hỏi lỗi thì **job mỗi giờ hỏi lại** các gói `revoked` trong **3 ngày** gần nhất (`ASSUMPTION`). Không thêm luật tự sửa trong bảng 9.4 (phương án (i)) | Chốt D39 (hệ thống tự kiểm tra: chủ dự án; cách (ii): đề xuất Claude, chủ dự án chốt) | 2, 9.2, 9.4, 13, 15.7, 19 |
| — | **Kết quả `fetchState` thiếu dữ liệu** (câu Q-C2 của step-5-C): ngày null không ghi đè ngày đang lưu; kỳ đổi → `current_transaction_id` = null; `grace_ends_at` giữ khi `grace` → `grace`, còn lại null; `grace` không có hạn hết ở cuối kỳ + `grace_days` | Phiên điều phối chốt vì design đã quyết (D23, D34, D37; Review Focus 5 của plan "không bao giờ Pro vô hạn"); không đổi hành vi đã chốt | 9.2 |

### As-built (19/10/2026)

Chi tiết, PR và số liệu: [`docs/deliveries/buoc-5.md`](../../deliveries/buoc-5.md) mục "as-built". Lựa chọn kỹ thuật của plan (design không ghi), như đã làm:
1. `BILLING_PRODUCTION=true|false` (mặc định `false`) báo API là production (R17); `true` cùng `BILLING_FAKE_ENABLED=true` là lỗi cấu hình.
2. Practice gọi `recordPracticeSession` ở **mọi** lần ghi kết quả cuối; `ON CONFLICT DO NOTHING` giữ lần đầu, tức "câu đầu có kết quả" (mục 4).
3. Thêm cột ngoài mục 6: `subscriptions.current_transaction_id` (D34, D37), `billing_events.external_subscription_id`, `billing_events.app_user_id`; bảng
   riêng của bộ nối giả `fake_billing_subscriptions`, sau thêm `current_transaction_id` và `history` (D39, B5E102).
4. Webhook đọc raw body bằng bộ đọc riêng cho đường đó, đặt trước bộ đọc JSON chung.
5. `pnpm entitlements:fake-ai` là lệnh chạy trên máy (dựng app context, gọi `EntitlementsService` trên database thật); không có endpoint test.
6. `classifyMailError` chuyển từ `src/notifications/scheduler/` sang `src/common/mail/`.
7. Không có email cảnh báo trần AI (D36); `alert_reached` tính lúc đọc.

Chỗ khác design khi làm:
- **B5E76 không đạt:** `confirm` theo dòng `use` mới nhất (bảng R7 mục 7.1); API chỉ có `operation_id`. Cả hai cách đều trừ tối đa 1 lượt mỗi thao tác;
  Bước 7 xem lại khóa theo lần thử.
- `grace` đã đặt hủy cuối kỳ → `expired` khi hết `grace_ends_at`. `trialing` không có `trial_ends_at` → dùng `current_period_end`.
- Không có CHECK cho `billing_events.type` và `revoke_reason`.
- Đọc Settings và hồ sơ người dùng qua `tx` khi đang giữ khóa: `SettingsService.get(tx?)`, `IdentityService.getProfile(userId, tx?)`.
- Không thêm mã lỗi nào ngoài mục 12.5.

## 1. Mục tiêu và bối cảnh

Bước 5 dựng module `entitlements`: mỗi người dùng **được dùng tính năng nào** (quyền) và **dùng được bao nhiêu** (hạn mức), theo gói **Free / Trial / Pro**,
cộng các phần đi kèm: cấp tay của staff, sổ lượt dùng, trần AI toàn hệ thống và công tắc, cờ quảng cáo, và **cổng thanh toán** trung lập với nhà cung cấp.
**Bước 5 chỉ làm API** (D2): màn admin, màn người học, gắn quảng cáo thật làm ở đợt giao diện.

Hiện trạng trên `dev` @ `9deb8d4` (đã đọc 19/10):
- `apps/api/src/entitlements/entitlements.service.ts`: `check(userId, feature)` luôn trả `{ allowed: true }`; `Feature = 'practice.basic'`.
- Practice gọi `check(userId, 'practice.basic')` ở `sessions.service.ts` khi **mở phiên** (`start`) và **trước khi tạo câu** (`next`), từ chối bằng 403
  `entitlement-required`.
- Bốn giới hạn là hằng số: `GROUPS_MAX = 100`, `GROUP_ITEMS_MAX = 2000` (`learning.constants.ts`), `PRIVATE_WORDS_MAX = 1_000`, `SENTENCES_PER_SENSE_MAX = 5`
  (`content.constants.ts`).
- Chưa có quyền `entitlements.grant`, `ai.settings` (`identity.types.ts`). Settings có nhóm `reminders`, `learning`, `practice`, quyền `settings.manage` chỉ `admin`.
- AI chưa có: Bước 6 làm cổng gọi AI và sổ chi phí, Bước 7 làm bài AI và bước AI tra nghĩa. Nên phần lượt AI ở Bước 5 được test bằng **bên gọi AI giả**.
- V1 không thu tiền (F35). Nên cổng thanh toán ở Bước 5 được test bằng **nhà cung cấp giả**; thêm nhà cung cấp thật sau chỉ là viết thêm một bộ nối (D3).
- Bước 4 đã bỏ e2e backend (D38 Bước 4): "Xong khi" là CI (lint, typecheck, build, unit, kiểm migration khớp schema) + smoke.

## 2. Quyết định (tóm tắt)

Đủ phương án và trade-off: decision record. Nhật ký: brainstorm log.

| # | Chủ đề | Chốt |
|---|---|---|
| D1 | Cách làm việc | Giữ như Bước 4: chủ dự án trả lời trước, không có phần lõi chủ dự án tự viết, chỉ review |
| D2 | Phạm vi | Gói và kiểm quyền thật; trial; cấp tay; hạn mức theo gói; lượt AI và giữ chỗ; công tắc AI; trần AI toàn hệ thống; người học xem gói; **chỉ API** |
| D3 | Thanh toán | Dựng sẵn cổng chung (hộp sự kiện, chống trùng, chịu sai thứ tự, áp vào quyền Pro; chỉ kiểu tự gia hạn theo D35) + bộ nối giả; thêm nhà cung cấp thật sau |
| D4 | Mỗi gói gồm gì | Học và ôn: mọi gói. Bài luyện không AI: Free có giới hạn, Pro nhiều hơn. Bài AI: Pro (và trial). 2.000 từ/nhóm là chống spam chung. Từ riêng, câu ngữ cảnh: không theo gói. Lịch sử 6 tháng: chung. Landing sửa được |
| D5 | Giới hạn bài luyện Free | Theo **số phiên mỗi ngày**; số câu mỗi phiên là con số chung; Pro **giới hạn cao hơn**, không để không giới hạn |
| D6 | Staff làm gì | Cấp gói: admin, editor (editor không cấp cho admin). Con số riêng không dính AI: cả hai. Lượt AI: admin. Tự cấp: admin. Thu hồi, xem lịch sử: cả hai. Con số gói, công tắc, trần: admin |
| D7 | Editor cấp gói Pro | Cấp gói bình thường (kèm lượt AI cố định của gói); **không** cấp con số lượt AI tùy ý; admin xem lịch sử của editor và thu hồi |
| D8 | Editor cấp/thu hồi cho ai | Chỉ tài khoản người học thường (không staff) |
| D9 | Staff dùng phía người học | Như Free; admin cấp gói hoặc con số khi cần test |
| D10 | Một lượt AI | Câu AI mới thành công: 1; lỗi/quá thời gian: 0; làm lại câu đã lưu: 0; tra nghĩa (dùng hay bỏ): 1; dịch bổ sung: 1; câu AI staff xác nhận sai: hoàn lại |
| D11 | AI tạo lại lần 2 | Vẫn 1 lượt (chủ dự án chịu tiền lần gọi thứ hai) |
| D12 | Kho lượt | Mỗi tính năng AI một kho riêng (bài AI; tra nghĩa) |
| D13 | Chu kỳ | Mỗi tháng tính từ ngày bắt đầu gói; gói năm cũng làm mới mỗi tháng |
| D14 | Cộng dồn | Không; sang chu kỳ mới số đã dùng về 0 nếu còn gói |
| D15 | Trial | Giữ thẻ, không hủy thì tự lên Pro; chỉ khi có thanh toán thật |
| D16 | Trong trial | Như Pro đầy đủ (tạm; số lượt trial admin chỉnh); dài **7 ngày** |
| D17 | Số nhóm | Không theo gói |
| D18 | Con số | Free 3 phiên/ngày, Pro và trial 30; bài AI 300, tra nghĩa 100 mỗi tháng; trần AI toàn hệ thống **1.000 lượt/ngày** (đếm bằng lượt); cảnh báo 75%; 10.000 từ riêng; 20 câu ngữ cảnh/nghĩa; giữ 100 nhóm, 2.000 từ/nhóm, 20 câu/phiên; admin chỉnh mọi số |
| D19 | Nhiều nguồn quyền | Staff **đặt thẳng** con số cho tài khoản (thay số của gói khi còn hạn, cao hay thấp đều được); thấp hơn số đã dùng thì còn 0; hoàn lượt = giảm số đã dùng; thời hạn không nối tiếp (Pro khi còn ít nhất một nguồn); cấp thêm Pro chỉ dời ngày hết hạn, chu kỳ lượt giữ như cũ (khi nguồn cũ hết thì theo mốc của nguồn còn lại, phần 2 đã duyệt, mục 5.5) |
| D20 | Hạn cấp tay | Mọi lần cấp có ngày hết hạn, ai cấp cũng vậy |
| D21 | Quảng cáo | Quyền "không quảng cáo" theo gói (Free hiện; trial, Pro không) + cấu hình tần suất ở server, admin chỉnh |
| D22 | Nhắc trial, một trial | App tự gửi email (ưu tiên) và nhà cung cấp/store gửi thêm; mỗi người một trial theo **tài khoản và thẻ** |
| D23 | Gia hạn lỗi | Giữ Pro thêm 7 ngày (admin chỉnh 0–16) rồi khóa; lần trừ tiền đầu sau trial cùng luật; mobile theo store |
| D24 | Hủy gói | Không hoàn tiền, dùng tới hết kỳ đã trả, ghi rõ trong điều khoản |
| D25 | Đổi tháng ↔ năm | Tháng → năm đổi ngay (nhà cung cấp tính tiền chênh); năm → tháng là "đổi đang chờ", có hiệu lực khi hết năm, hủy được |
| D26 | "Xong khi" | Như Bước 4: xong mọi task, CI xanh trên mọi PR, `pnpm smoke:buoc-5` qua API thật trên DB mới |
| D27 | Ai implement | Như Bước 4: các phiên khác implement, một phiên điều phối |
| D28 | Sổ lượt | Cách (A): mỗi lần kiểm đếm các dòng trong sổ, khóa theo (người, kho) |
| D29 | Email báo trước mỗi kỳ gia hạn | Làm sẵn nhưng **mặc định tắt** (các app thường chỉ báo ở trial); bật nếu luật sư nói bắt buộc |
| D30 | Trial lần hai | Chỉ một trial; **hệ thống Wordmet quyết**: tài khoản hoặc thẻ đã dùng trial thì không có Pro trong trial đó, kể cả khi nhà cung cấp hoặc store đã bắt đầu trial |
| D31 | Gói tự gia hạn quá cuối kỳ (hoặc hết trial) mà chưa có thông báo (sau review) | Vẫn Pro thêm `grace_days` (7) rồi khóa như `on_hold` tới khi có thông báo |
| D32 | Cấp gói khi người nhận đã có nguồn Pro (sau review) | Cấp Pro là **gói mới**: lần cấp cũ tự thu hồi, mốc chu kỳ đặt lại; người đang trả tiền tự gia hạn → tắt tự gia hạn, không hoàn tiền, phần kỳ đã trả còn lại vẫn Pro; staff phải xác nhận; mốc theo nguồn Pro bắt đầu gần nhất. App không tắt được tự gia hạn trên store (Apple, chưa kiểm): **xử lý sau** |
| D33 | Editor thu hồi lần cấp có con số lượt AI (sau review) | Không; lần cấp có con số lượt AI chỉ admin thu hồi |
| D34 | Hoàn tiền một phần (sau review) | Có hoàn tiền (kể cả một phần) cho kỳ đang dùng thì mất Pro ngay; hủy không hoàn tiền thì giữ tới hết kỳ; hoàn tiền chủ động **chỉ admin** làm |
| D35 | Gói phải tự gia hạn (sau review plan) | Chỉ nhận gói tự gia hạn; người dùng không phải nhớ ngày và tự trả. Bỏ kiểu "app tự gia hạn" (trả tay từng kỳ) khỏi lõi; MoMo/ZaloPay tự trừ tiền mỗi kỳ qua bộ nối |
| D36 | Cảnh báo trần AI (sau review plan) | Không gửi email; chạm ngưỡng (mặc định 75%) thì màn admin tô vàng (đợt giao diện) |
| D37 | Hoàn tiền khi không biết giao dịch của kỳ đang dùng (sau review plan) | Bộ nối bắt buộc gửi mã giao dịch mỗi khi có trừ tiền (cả khi đổi tháng → năm); vẫn thiếu mã thì hoàn tiền chỉ ghi lại và log, không cắt Pro |
| D38 | Kéo dài, hẹn trước lần cấp (sau review plan) | Staff sửa ngày của lần cấp đang có (có lịch sử sửa) thay vì tạo lần cấp mới; lần cấp Pro bắt đầu ở tương lai không thu hồi lần cũ |
| D39 | Hoàn tiền tới sai thứ tự (khi implement) | Hoàn tiền cắt Pro → hệ thống tự hỏi lại nhà cung cấp ngay sau đó; lỗi thì job mỗi giờ hỏi lại gói bị cắt trong 3 ngày; không thêm luật tự sửa |

## 3. Phạm vi

**Làm:** module `entitlements` trong `apps/api` (dữ liệu, luật tính gói và hạn mức, sổ lượt, cấp tay, trần AI và công tắc, cờ quảng cáo, cổng thanh toán và bộ
nối giả, email nhắc trial và email báo trước, job dọn); quyền `entitlements.grant`; nhóm cài đặt `entitlements` và các cài đặt mới của `learning`, `content`;
sửa nhỏ Practice, Learning, Content, Identity (mục 4); lệnh `pnpm billing:fake-event`, `pnpm entitlements:fake-ai`; script `pnpm smoke:buoc-5`.

**Không làm:**
- Giao diện (admin, người học), gắn SDK quảng cáo, bước hỏi đồng ý theo dõi quảng cáo.
- Mua, hủy, đổi gói từ phía app (trang thanh toán, trang quản lý gói): làm cùng bộ nối nhà cung cấp thật và giao diện; người dùng thao tác ở trang của nhà
  cung cấp hoặc store (Đề xuất, đã duyệt 19/10).
- Bộ nối nhà cung cấp thật (Paddle, MoMo, ZaloPay, Apple, Google…); chọn nhà cung cấp phụ thuộc hình thức kinh doanh, để trước khi ra mắt. Chỉ nhà cung cấp có
  gia hạn tự động (D35); VNPay, payOS (người dùng tự trả từng kỳ) không dùng cho gói tháng/năm.
- Gọi AI thật (Bước 6–7). Trần chi tính bằng tiền (xét ở Bước 6 khi có sổ chi phí).
- Xóa tài khoản (Bước 8). Mã giảm giá, mã giới thiệu, xu và cửa hàng (ý tưởng ở `APP_REFERENCES_FUTURE_IDEAS_2026-10-19.md`).
- Flutter.

**Đổi so với spec Entitlements** (spec chỉ là khung; ghi để truy nguồn, không sửa spec):

| Spec | Design Bước 5 | Vì sao |
|---|---|---|
| ER1: 3 mã feature; Free chỉ có `practice.basic`, các tính năng khác không gắn quyền | Thêm kho **phiên luyện mỗi ngày** cho `practice.basic`; thêm cờ quảng cáo | D4, D5, D21 |
| ER3, E2–E4: trial tự kích hoạt, không thẻ, 14 ngày | Trial giữ thẻ do nhà cung cấp quản lý, 7 ngày; một trial theo tài khoản và thẻ | D15, D16, D22 |
| ER5: giữ chỗ, 2 phút, xác nhận muộn | Giữ nguyên; đếm "hết hạn" lúc đọc | D28 |
| ER6: đơn vị `ASSUMPTION` | Chốt bảng đơn vị | D10, D11 |
| ER10: cấp tay, `entitlements.grant` gồm editor | Luật riêng cho editor; con số riêng đặt thẳng | D6–D8, D19, D20 |
| ER11: cổng sự kiện billing | Hộp sự kiện chuẩn hóa + bộ nối theo nhà cung cấp; chỉ kiểu tự gia hạn | D3, D35 |
| ER13: cửa sổ theo ngày/tháng hoặc theo grant | Tháng theo mốc bắt đầu gói (UTC); ngày theo giờ người học cho phiên luyện | D13, D5 |
| ER14: trần chi bằng tiền | Trần bằng lượt (giờ Việt Nam) | D18 |
| F34 | Free giới hạn phiên luyện | D5 |
| K17 (ngân hàng câu, đơn vị hoãn) | Không còn ngân hàng (D3 Bước 4); đơn vị chốt | D10 |

## 4. Kiến trúc (Đề xuất, đã duyệt 19/10)

```
 Practice (mở phiên; câu AI ở Bước 7) ── kiểm / giữ / trừ / trả / ghi phiên ─┐
 Content (AI tra nghĩa, Bước 7) ─────────────────────────────────────────────┤
                                                                             ▼
                                      Entitlements (module mới)
   gói của từng người · cấp tay · sổ lượt · trần AI cả hệ thống · cờ quảng cáo · cổng thanh toán · email
              ▲                              ▲                          ▲
  Bộ nối nhà cung cấp thanh toán   Settings (các con số admin chỉnh)   Identity (múi giờ, email đã xác minh,
  (V1 chỉ có bản giả)                                                  vai trò, ngôn ngữ)
```

Entitlements chỉ gọi module khác qua service được export (D3 của Bước 0–4): mỗi module sở hữu `prisma/models/<module>.prisma`; không `@relation` qua ranh
giới; tham chiếu chéo là cột UUID. Không module nào import Entitlements ngoài Practice (đã có), Content (Bước 7) và chính các controller của nó.

| Module | Bước 5 cần | Mới hay có sẵn |
|---|---|---|
| Identity | Múi giờ, ngôn ngữ, **vai trò staff** (`getProfile` đã trả `staff_role`); email đã xác minh (`isEmailVerified`); địa chỉ email (`verifiedEmails`) (danh sách email các `admin` cho cảnh báo trần bỏ theo D36) | Có sẵn. Thêm `entitlements.grant` vào `ROLE_PERMISSIONS` của `admin`, `editor`; test bảng quyền hiện có và các fake của Identity, Entitlements trong test Practice phải sửa theo (R20) |
| Settings | Nhóm `entitlements` (mục 13); thêm khóa vào `learning`; nhóm mới `content` | Mới, cùng cơ chế các nhóm có sẵn (khoảng cho phép, `version`, lịch sử, `settings.manage`) |
| Practice | Gọi kiểm hạn mức phiên khi mở phiên; gọi **ghi nhận phiên** khi câu đầu tiên của phiên có kết quả cuối; trả mã lỗi theo lý do | Sửa nhỏ (⚠4) |
| Learning | Đọc `groups_per_user`, `items_per_group` từ Settings thay hằng số | Sửa nhỏ |
| Content | Đọc `private_words_per_user`, `sentences_per_sense` từ Settings thay hằng số | Sửa nhỏ |
| Mail (common) | Gửi email bắt đầu trial, nhắc trial, báo trước khi trừ tiền (D35 bỏ email hết hạn, D36 bỏ email cảnh báo trần) **không bị trần 80% của email nhắc học**, nhưng có **trần riêng 95%** hạn mức ngày để chừa phần cho OTP (R18) | Có sẵn `MailBudget.tryConsume({ ceiling })`, `REMINDER_MAIL_SHARE = 0.8`; cách gửi có trạng thái như email nhắc học (mục 14) |
| Bảo trì | Job mỗi giờ: thử áp lại sự kiện lỗi, gửi email đến hạn, đánh dấu giữ chỗ quá hạn, chuyển trạng thái theo thời gian (mục 9.4), hỏi lại trạng thái (`fetchState`) cho gói quá kỳ chưa có thông báo, xóa `raw_payload` cũ | Có sẵn `MaintenanceScheduler` (mỗi giờ, trong tiến trình API). Scheduler giả định job chạy song song vô hại; job mới **không** vô hại nên mỗi job nhận dòng bằng `FOR UPDATE SKIP LOCKED` và kiểm lại trạng thái dưới khóa (R19) |

**Sửa Practice (⚠4, Đề xuất, đã duyệt 19/10):**
- `check(userId, 'practice.basic')` từ nay nghĩa là "tài khoản được dùng bài luyện không AI" (mọi gói đều được); Practice giữ cuộc gọi này ở `start` và `next`
  như hiện nay. Kiểm **hạn mức phiên** là một cuộc gọi riêng chỉ ở `start` (`checkQuota(userId, 'practice_sessions')`), để phiên đã mở làm được tới hết.
  Gọi **sau** lệnh `updateMany` đóng phiên đang mở trong `start` (lệnh này chờ khóa dòng phiên, nên câu đầu đang ghi của phiên cũ đã commit và được đếm; R4).
  Từ chối thì rollback cả transaction, phiên đang mở giữ nguyên.
- Khi câu đầu tiên của một phiên có kết quả cuối (`correct` hoặc `wrong`, kể cả Bỏ qua; không tính `void`), Practice gọi `recordPracticeSession` trong
  **cùng transaction** ghi câu trả lời (cách Learning nhận transaction của Practice ở R2 Bước 4).
- Từ chối do hết phiên: 403 `quota-exhausted` kèm `resets_at`; lý do khác giữ 403 `entitlement-required`.

## 5. Gói, quyền, kho lượt

### 5.1 Mã quyền và kho lượt

| Mã | Loại | Ai có | Kho lượt |
|---|---|---|---|
| `practice.basic` | Quyền dùng bài luyện không AI | Mọi gói | `practice_sessions`: số phiên **mỗi ngày** theo giờ người học |
| `ai.practice` | Quyền tạo câu AI (điền từ, "câu chứa từ rồi chọn", trắc nghiệm theo câu; dịch bổ sung) | Trial, Pro; hoặc con số riêng > 0 | `ai_practice`: lượt **mỗi chu kỳ tháng** |
| `ai.lookup` | Quyền AI tra nghĩa khi thêm từ | Trial, Pro; hoặc con số riêng > 0 | `ai_lookup`: lượt mỗi chu kỳ tháng |
| (cờ) "không quảng cáo" | Không phải mã kiểm; trả trong API xem gói | Trial, Pro | — |

### 5.2 Mỗi gói (mặc định, admin chỉnh; D18)

| | Free | Trial | Pro |
|---|---|---|---|
| Học, ôn, flashcard, lịch ôn, nhắc học, thêm nhanh | Có | Có | Có |
| Phiên luyện không AI mỗi ngày | 3 | 30 (dùng số của Pro) | 30 |
| Lượt bài AI mỗi chu kỳ | 0 | 300 (cài đặt riêng, mặc định = Pro) | 300 |
| Lượt AI tra nghĩa mỗi chu kỳ | 0 | 100 (cài đặt riêng, mặc định = Pro) | 100 |
| Quảng cáo (khi công tắc bật) | Có | Không | Không |
| Nhóm, từ mỗi nhóm, từ riêng, câu ngữ cảnh, câu mỗi phiên, lịch sử | Chung: 100, 2.000, 10.000, 20, 20, 6 tháng | Chung | Chung |

### 5.3 Nguồn quyền

| Nguồn | Từ đâu | Cho gì |
|---|---|---|
| Free | Mặc định | Số của Free |
| Gói đăng ký | Nhà cung cấp thanh toán báo về qua cổng (mục 9) | Trial hoặc Pro khi trạng thái còn hiệu lực (mục 9.4) |
| Cấp tay "một gói" | Staff (mục 10) | Pro từ `starts_at` tới `ends_at` |
| Cấp tay "con số riêng" | Staff (mục 10) | Thay số của một hoặc vài kho từ `starts_at` tới `ends_at` |

### 5.4 Luật tính "người này được gì lúc này" (Chốt D19; chi tiết Đề xuất, đã duyệt 19/10)

1. **Gói hiện tại:** `pro` nếu có ít nhất một nguồn Pro đang hiệu lực (gói đăng ký `active`, `grace`, hoặc đã đặt hủy mà chưa hết kỳ; cấp tay "một gói" còn
   hạn và chưa thu hồi); `trial` nếu nguồn duy nhất là gói đăng ký đang `trialing`; còn lại `free`. Thời hạn các nguồn **không nối tiếp**. Gói đăng ký quá
   cuối kỳ chưa có thông báo vẫn tính là nguồn Pro trong `grace_days` (D31, mục 9.4). Cấp "một gói" là gói mới, thu hồi lần cấp gói cũ (D32, mục 10).
2. **Con số của mỗi kho:** lấy số của gói hiện tại (Trial dùng số trial cho hai kho AI, số Pro cho phiên luyện). Nếu có **cấp tay "con số riêng"** còn hạn cho
   kho đó thì dùng con số riêng, cao hay thấp đều được; nhiều lần đặt cho cùng một kho đang hiệu lực thì **lần tạo sau cùng thắng**.
3. **Quyền AI:** `ai.practice` / `ai.lookup` được phép khi con số của kho tương ứng > 0. Vì vậy staff đặt "lượt bài AI: 500" cho một tài khoản Free (tài khoản
   test) thì tài khoản đó dùng được AI; đặt 0 cho một tài khoản Pro lạm dụng thì chặn AI của tài khoản đó.
4. **Còn lại** = `max(0, con số − đã dùng)`; "đã dùng" tính ở mục 7.2. Con số hạ thấp hơn số đã dùng thì còn 0, không âm (ER9).
5. **Quảng cáo:** hiện khi công tắc quảng cáo bật **và** gói hiện tại là `free` (con số riêng không đổi việc này).

### 5.5 Chu kỳ (Chốt D13, D14; chi tiết Đề xuất, đã duyệt 19/10)

- **Kho phiên luyện:** theo **ngày địa phương** của người học (múi giờ hồ sơ, SR13). Một phiên thuộc ngày của lúc câu đầu tiên có kết quả.
- **Kho AI:** chu kỳ **một tháng** tính từ một **mốc** (thời điểm, UTC):
  - Mốc của gói đăng ký = `quota_anchor_at`: lúc bắt đầu gói; **trial chuyển sang trả phí thì đặt lại = lúc trừ tiền lần đầu**; gói kích hoạt lại sau `expired` hoặc
    `revoked` thì đặt lại = lúc trả; đổi tháng ↔ năm giữ mốc.
  - Mốc của cấp tay "một gói" = `starts_at` của lần cấp. Mốc của cấp tay "con số riêng" có khóa `ai_*` > 0 cho tài khoản không có nguồn Pro = `starts_at` của lần cấp đó.
  - **Nhiều nguồn cùng hiệu lực (Chốt D32): dùng mốc của nguồn bắt đầu gần nhất** ("gói mới kích hoạt"). Nguồn tính vào mốc: gói đăng ký `trialing` (không
    `trial_denied`), `active`, `grace`, đang trong thời gian chờ thông báo (D31), hoặc đã đặt hủy mà chưa hết kỳ; cấp tay "một gói" đã bắt đầu, chưa hết, chưa thu hồi.
    Khi nguồn đó hết, mốc là mốc của nguồn bắt đầu gần nhất còn lại; lượt đã dùng trong chu kỳ tính theo mốc đó vẫn được đếm.
  - Ví dụ (R8):

    | Chuyện xảy ra | Mốc | Lượt bài AI |
    |---|---|---|
    | Lan trả Pro từ 1/11; ngày 15/11 staff cấp "Pro tới 15/12" (D32: tắt tự gia hạn gói trả tiền) | 15/11 | Chu kỳ [15/11, 15/12) mới: đủ 300 |
    | Gói trả tiền hết 30/11 (đã tắt tự gia hạn) | Vẫn 15/11 | Không đổi |
    | 15/12 lần cấp hết, không còn nguồn Pro | — | Free: 0 |
    | Lan được cấp từ 1/11; ngày 20/11 tự mua Pro | 20/11 | Chu kỳ mới từ 20/11: đủ 300 |
    | Lan đang trả Pro (mốc 1/11, đã tắt tự gia hạn tới 30/11) được cấp 15/11–20/11 | 15/11, rồi từ 20/11 là 1/11 | Từ 20/11 đếm lại chu kỳ [1/11, 1/12), gồm cả lượt dùng từ 15/11; hiếm, chấp nhận |
  - Chu kỳ thứ k bắt đầu ở cùng ngày, cùng giờ của mốc trong tháng thứ k sau mốc; tháng thiếu ngày thì **lùi về ngày cuối tháng nhưng mốc không trôi**
    (31/01 → 28/02 → 31/03 → 30/04).
- **Không cộng dồn:** sang chu kỳ mới, lượt chưa dùng mất; số đã dùng của chu kỳ mới bắt đầu từ 0.
- **Gói năm** làm mới mỗi tháng như gói tháng.

## 6. Dữ liệu (`entitlements.prisma`, mới; Đề xuất, đã duyệt 19/10)

Mọi bảng có `user_id` là UUID thường, không khóa ngoại sang module khác.

| Bảng | Mỗi dòng | Cột chính | Ràng buộc, index |
|---|---|---|---|
| `entitlement_grants` | Một lần cấp tay | `id`, `user_id`, `kind` (`plan` / `limits`), `plan` (`pro`, khi `kind = plan`), `limits` (jsonb: `practice_sessions_per_day`, `ai_practice_per_cycle`, `ai_lookup_per_cycle`, chỉ khóa nào có thì thay), `starts_at`, `ends_at` (bắt buộc), `reason` (bắt buộc, ≤ 300 ký tự), `granted_by`, `granted_by_role`, `revoked_at`, `revoked_by`, `revoke_reason` (gồm `replaced` khi bị lần cấp gói mới thay, D32), `paid_renewal_action` (`turned_off` / `not_supported` / null, D32), `created_at` | `ends_at > starts_at`; index `(user_id, ends_at)`, `(granted_by, created_at)` |
| `entitlement_grant_changes` | Một lần sửa ngày của một lần cấp (D38) | `id`, `grant_id`, `changed_by`, `changed_by_role`, `old_starts_at`, `new_starts_at`, `old_ends_at`, `new_ends_at`, `reason` (bắt buộc, ≤ 300 ký tự), `created_at` | Index `(grant_id, created_at)`; cùng module nên `grant_id` có khóa ngoại tới `entitlement_grants` |
| `subscriptions` | Một gói đăng ký từ một nhà cung cấp | `id`, `user_id`, `provider`, `environment` (`sandbox` / `production`), `external_subscription_id`, `interval` (`month` / `year`) (cột `renewal` bỏ theo D35: mọi gói đều tự gia hạn), `status` (mục 9.4), `trial_ends_at`, `trial_denied` (D30), `payment_fingerprint`, `current_period_start`, `current_period_end`, `grace_ends_at`, `cancel_at_period_end`, `pending_interval`, `quota_anchor_at`, `last_event_at`, `created_at`, `updated_at` | Unique `(provider, environment, external_subscription_id)`; index `(user_id, status)` |
| `billing_events` | Một thông báo nhận từ nhà cung cấp (hộp sự kiện) | `id`, `provider`, `environment`, `dedupe_key`, `external_event_id`, `type` (đã chuẩn hóa, mục 9.3), `kind` (`state` / `additive`, R1), `transaction_id` (mã giao dịch hoặc mã kỳ, với sự kiện cộng thêm), `occurred_at`, `received_at`, `user_id` (null khi không nhận ra), `subscription_id`, `payload` (jsonb đã chuẩn hóa), `raw_payload` (jsonb; xóa sau 90 ngày, R23), `status` (`pending` / `applied` / `stale` / `ignored` / `failed`), `error`, `attempts`, `processed_at` | Unique `dedupe_key`; index `(status, received_at)` |
| `trial_history` | Một lần đã dùng trial | `id`, `user_id`, `provider`, `payment_fingerprint` (mã nhận diện thẻ do nhà cung cấp trả, null nếu không có), `started_at` | Unique `user_id`; unique một phần `(provider, payment_fingerprint)` khi fingerprint không null |
| `usage_records` | Một dòng trong sổ lượt | `id`, `user_id`, `pool` (`practice_sessions` / `ai_practice` / `ai_lookup`), `operation_id`, `kind` (`use` / `credit`), `status` (`reserved` / `confirmed` / `released`), `release_reason` (`caller` = bên gọi nhả / `expired` = quá 2 phút / `late-confirm-free`, R7), `local_date` (kho phiên luyện), `system_date` (ngày giờ Việt Nam, kho AI), `reserved_at`, `expires_at`, `confirmed_at`, `released_at`, `credited_at` (dòng `credit`), `note` (mã báo cáo khi hoàn lượt), `created_at` | Unique một phần `(user_id, pool, operation_id)` khi `kind = use` và `status` ∈ (`reserved`, `confirmed`); unique `(user_id, pool, operation_id)` khi `kind = credit`; index `(user_id, pool, confirmed_at)`, `(pool, system_date)` |
| `entitlement_notices` | Một email cần gửi (chống gửi trùng, theo dõi gửi; R9) | `id`, `user_id`, `recipient_user_id`, `kind` (`trial_started` / `trial_reminder` / `renewal_notice`; `expiry_notice` bỏ theo D35, `ai_cap_alert` bỏ theo D36), `subject_key` (chuỗi: mã gói đăng ký), `period_key`, `state` (`pending` / `sending` / `sent` / `failed` / `skipped`), `due_at`, `window_ends_at`, `attempts`, `last_error_at`, `sent_at` | Unique `(kind, subject_key, period_key, recipient_user_id)`; index `(state, due_at)` |

- **Không có bảng "bộ đếm"** (D28): còn lại luôn tính từ các dòng trong sổ.
- `raw_payload` có thể chứa email của người mua; chỉ dùng để tra lỗi, không đưa vào log (SR10); job xóa sau **90 ngày** (`ASSUMPTION`, cố định trong code, R23);
  xử lý khi xóa tài khoản ghi ở mục 18 (Bước 8).
- Mọi lệnh ghi có thể trùng ràng buộc unique bên trong một transaction lớn (ghi nhận phiên trong transaction ghi đáp án; dòng `credit`; `trial_history`) dùng
  `INSERT … ON CONFLICT DO NOTHING` bằng SQL thô như các chỗ đã có trong repo, không để lỗi trùng (Prisma `P2002`) làm hỏng cả transaction Postgres (R14).
- Không lưu số thẻ; `payment_fingerprint` là mã do nhà cung cấp tính, không đảo ngược ra số thẻ (`ASSUMPTION` theo từng nhà cung cấp, chưa kiểm).

## 7. Sổ lượt (Chốt D10–D12, D28; chi tiết Đề xuất, đã duyệt 19/10)

### 7.1 Vòng đời một lượt AI (ER5)

```
reserve ──► reserved ──confirm──► confirmed        (AI trả kết quả: trừ hẳn)
               │──release──► released              (AI lỗi, quá thời gian: trả lại)
               └──(2 phút không ai xác nhận)──► coi như released lúc đọc; job mỗi giờ ghi released
```

- **`reserve(userId, pool, operationId)`** trong một transaction:
  1. Khóa `pg_advisory_xact_lock` theo `(user, pool)`; với kho AI khóa thêm một khóa chung `entitlements.ai_daily` (mục 7.3). Thứ tự khóa cố định: khóa người
     trước, khóa chung sau.
  2. Có dòng `use` cùng `(user, pool, operation_id)` đang `reserved` chưa quá 2 phút hoặc đã `confirmed` → trả **chính dòng đó** (idempotent, SR8). Dòng
     `reserved` đã quá 2 phút thì ghi `released` trước rồi đi tiếp (để ràng buộc unique không chặn lần thử lại).
  3. Công tắc AI tắt → từ chối `ai-unavailable`.
  4. Quyền (mục 5.4): con số = 0 → lý do `plan-required` (bên gọi trả 403 `entitlement-required`).
  5. Còn lại của người (mục 7.2) = 0 → `quota-exhausted` kèm `resets_at` (đầu chu kỳ sau).
  6. Trần toàn hệ thống đã chạm (mục 7.3) → `ai-unavailable` kèm `retry-after` (tới 0 giờ ngày sau, giờ Việt Nam).
  7. Ghi dòng `use`, `reserved`, `expires_at = now + 2 phút`, `system_date` = ngày giờ Việt Nam.
- **`confirm`**: dòng `reserved` chưa quá hạn → `confirmed`. Dòng đã quá 2 phút (xác nhận muộn): nếu vẫn còn lượt khi không tính dòng này thì `confirmed`; nếu
  không thì `released` với `note = late-confirm-free` và kết quả vẫn giao cho người học (không bao giờ vượt mức, ER5). Gọi lại trên dòng đã `confirmed` → trả kết
  quả cũ.
- **`release`**: `reserved` → `released`; gọi lại → không đổi gì.
- **Thử lại sau lỗi tạm** là một lần `reserve` mới với cùng `operation_id` (dòng cũ đã `released`).
- **AI gọi lần 2 vì câu không qua kiểm tra** (D11) nằm trong cùng một lượt: Practice (Bước 7) chỉ `confirm` một lần.
- **Làm lại câu AI đã lưu** không gọi `reserve` (D10). **Dịch bổ sung** dùng kho `ai_practice` (Đề xuất, đã duyệt 19/10).
- **`reserve` trả** `{ state: 'reserved' | 'confirmed', expires_at }` (dòng cũ đã `confirmed` thì bên gọi biết lượt đã trừ, không gọi AI lại) hoặc lý do từ chối.
- **Hợp đồng với bên gọi (R6):** mỗi `reserve` / `confirm` / `release` chạy và **commit trong transaction ngắn của riêng nó**; bên gọi chỉ được truyền transaction
  của mình nếu transaction đó commit **trước** khi gọi AI. **Không bao giờ gọi AI khi còn giữ khóa của Entitlements** (khóa chung `entitlements.ai_daily` sẽ làm mọi
  lời gọi AI xếp hàng một). Tối đa **một** `reserve` mỗi transaction (hai `reserve` trong một transaction có thể deadlock với khóa chung).
- **Luật `confirm` theo trạng thái dòng (R7):**

  | Dòng `use` mới nhất của `(user, pool, operation_id)` | `confirm` làm gì |
  |---|---|
  | `reserved`, chưa quá 2 phút | → `confirmed` |
  | `reserved` quá 2 phút, hoặc `released` với lý do `expired` | Xác nhận muộn: còn lượt (không tính dòng này) và không có dòng khác cùng `operation_id` đang `reserved`/`confirmed` → `confirmed`; ngược lại → `released`, `release_reason = late-confirm-free`, kết quả vẫn giao |
  | `released` với lý do `caller` (bên gọi đã nhả vì AI lỗi) | Không đổi; trả `released` |
  | `confirmed` | Trả kết quả cũ, không trừ thêm |
  | Không có dòng | Trả `not-found` cho bên gọi (lỗi lập trình), log |

### 7.2 Đếm "đã dùng"

- Kho AI: trong chu kỳ hiện tại (mục 5.5), **đã dùng** = số dòng `use` `confirmed` có `confirmed_at` trong chu kỳ + số dòng `use` `reserved` chưa quá 2 phút −
  số dòng `credit` trong chu kỳ; không nhỏ hơn 0.
- Kho phiên luyện: số dòng `use` `confirmed` có `local_date` = hôm nay theo giờ hiện tại của người học.
- **Hoàn lượt** (D10, D19): `refund(userId, pool, operationId, reportId)` ghi một dòng `credit` vào **chu kỳ hiện tại** (`credited_at` = lúc hoàn, quyết định nó
  thuộc chu kỳ nào), idempotent theo `operation_id`. Điều kiện (R21): số dòng `use` **đã xác nhận** trong chu kỳ hiện tại − số `credit` trong chu kỳ > 0; không tính
  dòng đang giữ. Không thỏa thì không ghi (không hoàn được, không "để dành"). Bước 7 gọi khi staff xác nhận câu AI sai.

### 7.3 Trần AI toàn hệ thống và công tắc (D2, D18, ER14)

- **Công tắc** `entitlements.ai_enabled` (mặc định bật): tắt thì mọi `reserve` của kho AI → `ai-unavailable`; lượt không bị trừ; bài không AI chạy bình thường.
- **Trần** `entitlements.ai_daily_cap` (mặc định 1.000 lượt): đếm mọi dòng `use` của hai kho AI có `system_date` = hôm nay (giờ `Asia/Ho_Chi_Minh`, `ASSUMPTION`
  cố định trong code), tính cả `reserved` chưa quá hạn. Đếm dưới khóa chung `entitlements.ai_daily`, nên chính xác tuyệt đối; mọi lần giữ lượt AI của mọi người xếp
  hàng qua khóa này (chấp nhận được vì số lời gọi AI cùng lúc vốn bị giới hạn 5, AR11).
- **Cảnh báo (D36):** khi đã dùng trong ngày (đã xác nhận + đang giữ chưa quá hạn) chạm `ceil(ai_daily_cap × ai_cap_alert_percent / 100)` (mặc định 75; để trống =
  không cảnh báo; trần = 0 thì không cảnh báo), API lượt AI của admin (mục 12.2, API 6) trả `alert_reached = true` để màn admin tô vàng (đợt giao diện). **Không gửi
  email**, không có job; tính lúc đọc.
- AI Integration (Bước 6) kiểm lại công tắc trước khi gọi provider (AR10); trần bằng tiền xét ở Bước 6.

### 7.4 Phiên luyện (D5)

- `checkQuota(userId, 'practice_sessions')` khi mở phiên: đã dùng hôm nay ≥ con số → 403 `quota-exhausted`, `resets_at` = 0 giờ ngày mai theo giờ người học.
- `recordPracticeSession(tx, userId, sessionId, localDate)`: ghi dòng `use` `confirmed` với `operation_id = session_id`; idempotent. Practice gọi khi câu đầu tiên
  của phiên có kết quả cuối (mục 4). Mở phiên rồi bỏ khi chưa trả lời câu nào không tốn lượt.
- Một người chỉ có một phiên đang mở (Bước 4). `checkQuota` chạy **sau** lệnh đóng phiên cũ trong `start` (mục 4, R4): lệnh đó chờ khóa dòng phiên, nên nếu câu
  đầu của phiên cũ đang được ghi thì nó commit trước và được đếm. Nhờ vậy mở phiên đúng lúc câu đầu của phiên cũ đang ghi không tạo được phiên thứ 4.

## 8. Trial (Chốt D15, D16, D22)

- Trial là trạng thái `trialing` của một gói đăng ký do **nhà cung cấp** quản lý (giữ thẻ; không hủy thì tự trừ tiền khi hết trial; hủy thì dùng tới hết trial).
  Trước khi có thanh toán thật **không có trial**; người học có AI chỉ qua cấp tay.
- **Độ dài 7 ngày** cấu hình ở nhà cung cấp hoặc store; Wordmet dùng `trial_ends_at` trong sự kiện. Apple chỉ cho trial 1 hoặc 2 tuần, khớp 7 ngày.
- **Ai được trial:** tài khoản chưa có `trial_history`, có email đã xác minh (giữ tinh thần K7), và (trên web) thẻ chưa từng dùng trial nếu nhà cung cấp trả mã
  nhận diện thẻ. API xem gói trả `trial_eligible` để trang thanh toán sau này không mời trial sai người. Trên mobile store tự cấp offer (Apple: một introductory
  offer mỗi nhóm gói cho mỗi Apple ID), nhưng Wordmet vẫn áp luật một trial theo tài khoản (D30, ngay dưới).
- **Chỉ một trial, do hệ thống Wordmet quyết** (Chốt D30): khi tạo trang thanh toán, tài khoản không `trial_eligible` thì trang đó **không có trial**. Hai
  trường hợp lọt qua bước này: thẻ chỉ lộ ra **sau khi** người dùng nhập ở trang của nhà cung cấp (thẻ đã dùng trial), và trên mobile store tự cấp introductory
  offer theo Apple ID / tài khoản Google (một người có thể dùng Apple ID khác). Khi đó gói báo về là `trialing` nhưng tài khoản hoặc thẻ đã có trong
  `trial_history`: Wordmet **không cho Pro trong thời gian trial đó** (gói được ghi `trial_denied`; người dùng vẫn là Free) và bộ nối gọi `endTrialNow` nếu nhà
  cung cấp hỗ trợ (trừ tiền ngay, có `renewed` thì là Pro như người mua bình thường). Log `trial_reuse_detected`.
- **Email** (D22; Đề xuất, đã duyệt 19/10): (1) lúc bắt đầu trial: điều khoản, ngày sẽ trừ tiền, số tiền nếu sự kiện có, cách hủy; (2) **2 ngày** trước ngày trừ
  tiền (`trial_reminder_days_before`, ngày 5 của trial 7 ngày). Email của nhà cung cấp hoặc store là thêm. Ngôn ngữ theo tiếng mẹ đẻ (K4).
- Trong trial: như Pro, hai kho AI dùng số trial (mặc định = Pro); mốc chu kỳ = lúc bắt đầu trial; trial chuyển sang trả phí → mốc mới, đủ lượt Pro; lượt trial
  không chuyển sang Pro.
- Trừ tiền lần đầu sau trial bị lỗi: như gia hạn lỗi (mục 9.4, D23).
- Gói `trial_denied` không nhận email bắt đầu trial và nhắc trial (R9).
- Đường thông báo (`subscription_started` có trial) **không** đòi email đã xác minh: điều kiện này chỉ ở `trial_eligible` khi tạo trang thanh toán; nếu nhà cung cấp
  vẫn bắt đầu trial cho tài khoản chưa xác minh thì trial vẫn tính (ghi `trial_history`) (R25).
- Hai tài khoản cùng một thẻ bắt đầu trial gần như cùng lúc: unique `(provider, payment_fingerprint)` của `trial_history` → tài khoản tới sau bị `trial_denied` (R25).

## 9. Cổng thanh toán (Chốt D3, D23–D25, D31, D34; chi tiết Đề xuất, đã duyệt 19/10)

### 9.1 Bộ nối (adapter)

Mỗi nhà cung cấp một bộ nối cùng một giao diện:

| Hàm | Làm gì | Bắt buộc |
|---|---|---|
| `verify(request)` | Kiểm chữ ký theo cách của nhà cung cấp trên **raw body**; đọc và **chuẩn hóa** thành danh sách sự kiện (mục 9.3) | Có |
| `ack(result)` | Trả lời HTTP đúng kiểu nhà cung cấp đòi (ví dụ VNPay JSON mã `00`/`02`, MoMo HTTP 204, Apple 200) | Có |
| `fetchState(externalSubscriptionId)` | Hỏi lại trạng thái thật (Stripe, Google, Apple có) | Không |
| `endTrialNow(externalSubscriptionId)` | Kết thúc trial và trừ tiền ngay (mục 8) | Không |
| `cancelAtPeriodEnd(externalSubscriptionId)` | Tắt tự gia hạn thay người dùng (D32) | Không |

V1 chỉ có bộ nối **giả** (`fake`): chữ ký HMAC bằng `BILLING_FAKE_SECRET`; chỉ bật khi `BILLING_FAKE_ENABLED=true` (không bao giờ ở production; ghi vào checklist
bước Deploy, R17). Bộ nối giả **giữ trạng thái** của từng gói giả từ chính các sự kiện đã ký gửi (một bảng riêng của bộ nối giả, không thuộc dữ liệu thật), nên
`fetchState` trả được "trạng thái thật"; có cờ `BILLING_FAKE_FETCH_STATE=false` để smoke chạy cả đường không có `fetchState` (R10). Có cả `endTrialNow`,
`cancelAtPeriodEnd`. Lệnh `pnpm billing:fake-event` ký và gửi sự kiện giả tới API đang chạy (đi qua đúng endpoint thật), không mở endpoint test nào.

**Chỉ gói tự gia hạn (D35).** Người dùng không phải nhớ ngày và tự trả. Nhà cung cấp tự trừ tiền mỗi kỳ (store, Paddle/Stripe) thì báo `renewed` / `renewal_failed`
như bảng 9.3. Nhà cung cấp cho app gọi lệnh trừ tiền tới ngày (MoMo subscription, ZaloPay Auto Debit): việc gọi lệnh trừ, thử lại khi lỗi nằm **trong bộ nối** của
nhà cung cấp đó (viết cùng bộ nối thật), và bộ nối báo kết quả về lõi bằng chính `renewed` / `renewal_failed`. Lõi không phân biệt hai cách này. Cổng chỉ thu một lần
(VNPay, payOS) không dùng cho gói tháng/năm.

**Mã giao dịch bắt buộc (D37).** Mỗi sự kiện ứng với một lần trừ tiền phải mang `transaction_id` của lần đó: `subscription_started` không có trial, `plan_changed` có
trả tiền ngay (tháng → năm), `renewed`. Tin của nhà cung cấp thiếu mã thì bộ nối tự hỏi thêm (ví dụ Google luôn phải gọi lại API sau mỗi tin báo; Apple kèm sẵn thông
tin giao dịch; Paddle có `transaction_id` ở tin tạo gói — tài liệu đọc 19/10). Lõi dùng mã này để biết "giao dịch của kỳ đang dùng" (D34).

### 9.2 Nhận sự kiện

`POST /v1/billing/webhooks/{provider}` và `GET` cùng đường (cho nhà cung cấp gọi bằng GET như VNPay IPN), công khai, không đăng nhập (R16):
1. Đọc **raw body** (Nest `rawBody`), giới hạn **64 KB** riêng cho route này (`ASSUMPTION`). Bộ nối kiểm chữ ký. Sai → 400, **không lưu**, log
   `billing_signature_invalid` (không ghi payload).
2. Lưu từng sự kiện vào `billing_events` với `dedupe_key` = `provider:environment:external_event_id` (nhà cung cấp không có mã sự kiện thì ghép mã đơn của app +
   mã giao dịch). Trùng → bỏ qua, coi như đã nhận.
3. `ack` ngay (kịp các hạn 5–15 giây của nhà cung cấp).
4. Áp từng sự kiện (mục 9.4) trong transaction riêng, khóa theo người dùng. Lỗi → `failed`, `attempts + 1`; job mỗi giờ nhận các dòng `failed` và các dòng
   `pending` quá 5 phút (tiến trình chết sau khi đã trả lời nhà cung cấp) bằng `FOR UPDATE SKIP LOCKED` (R19) rồi thử lại; quá 5 lần (`ASSUMPTION`) thì dừng và log
   `billing_event_stuck` để staff xem.
- Endpoint không có người dùng nên không dùng rule giới hạn theo người (SR14); chữ ký được kiểm trước mọi việc khác.
- **Môi trường (R17):** API chạy production chỉ áp sự kiện `environment = production`; sự kiện `sandbox` tới production → lưu, `ignored`, log. Môi trường khác áp cả hai.
- **Nhận ra người dùng:** sự kiện mang `app_user_id` (UUID của Wordmet, gắn lúc tạo trang thanh toán). Không nhận ra → `ignored`, log.
- **Thứ tự (R1):**
  - Sự kiện **trạng thái** (`kind = state`: `cancel_scheduled`, `cancel_unscheduled`, `plan_change_scheduled`, `plan_change_canceled`, `plan_changed`, `expired`,
    `revoked`, `grace_ended`, `renewal_failed`, `refund_reversed`, `subscription_started`) áp theo `occurred_at`: cũ hơn `last_event_at` của gói → `stale`, không áp;
    bằng nhau → áp theo thứ tự nhận.
  - Sự kiện **cộng thêm** (`kind = additive`: `renewed`, `refunded`) **luôn áp**, chống trùng theo `transaction_id`; không bao giờ `stale`;
    `current_period_end = max(cũ, kỳ trong sự kiện)`; `last_event_at = max(cũ, occurred_at)` (để sự kiện trạng thái cũ hơn tới sau vẫn bị `stale`, B5E43).
- **`fetchState` (R10):** dùng khi (a) sự kiện trạng thái bị `stale`, (b) payload thiếu trường tối thiểu, (c) gói quá cuối kỳ chưa có thông báo (D31, job mỗi giờ),
  (d) ngay sau khi một `refunded` cắt Pro (`revoked`), sau commit; hỏi lỗi thì job mỗi giờ hỏi lại các gói `revoked` trong 3 ngày gần nhất (D39).
  Kết quả ghi đè `status`, `current_period_start/end`, `trial_ends_at`, `cancel_at_period_end`, `interval`; lỗi hoặc bộ nối không có → rơi về luật thứ tự ở trên.
  Khi implement (phiên điều phối chốt theo design, 19/10): một ngày null trong kết quả không ghi đè ngày đang lưu (không bao giờ thành Pro vô hạn); kỳ đổi qua
  `fetchState` → `current_transaction_id` = null, hoàn tiền lúc đó chỉ ghi lại (D34, D37); `grace_ends_at` giữ khi gói đang `grace` và vẫn `grace`, còn lại null, và
  `grace` không có `grace_ends_at` hết ở `current_period_end + grace_days` (D23).

### 9.3 Sự kiện chuẩn hóa (payload tối thiểu, R1)

Mọi sự kiện có: `provider`, `environment`, `external_event_id` (hoặc thay thế), `external_subscription_id`, `app_user_id`, `occurred_at`.

| Sự kiện | Loại | Ý nghĩa | Thêm bắt buộc |
|---|---|---|---|
| `subscription_started` | trạng thái | Gói mới (có thể kèm trial) | `interval`, `current_period_start/end`, `trial_ends_at?`, `payment_fingerprint?`; `transaction_id` khi không có trial (D37) |
| `renewed` | cộng thêm | Trừ tiền kỳ mới thành công (gồm lần đầu sau trial, và thu lại được sau khi lỗi) | `transaction_id`, `current_period_start/end`, `interval` |
| `renewal_failed` | trạng thái | Trừ tiền lỗi | `grace_ends_at?` (store gửi) |
| `grace_ended` | trạng thái | Hết thời gian chờ, khóa (store báo) | — |
| `cancel_scheduled` / `cancel_unscheduled` | trạng thái | Tắt / bật lại tự gia hạn | — |
| `expired` | trạng thái | Hết hẳn (gồm nhà cung cấp bỏ cuộc thu tiền) | — |
| `revoked` | trạng thái | Cắt ngay (ví dụ chargeback, store thu hồi) | — |
| `refunded` | cộng thêm | Hoàn tiền (toàn bộ hoặc một phần) cho một giao dịch | `transaction_id` của giao dịch được hoàn, `amount?` |
| `refund_reversed` | trạng thái | Rút lại lần hoàn tiền | `transaction_id` |
| `plan_changed` | trạng thái | Tháng → năm có hiệu lực ngay | `interval`, `current_period_start/end`, `transaction_id` của lần trả cho kỳ mới (D37) |
| `plan_change_scheduled` / `plan_change_canceled` | trạng thái | Năm → tháng chờ hết năm; hủy lần đổi đang chờ | `interval` (với `scheduled`) |

13 loại. `payment_succeeded` (kiểu "app tự gia hạn": thanh toán một lần cho N ngày) **bỏ theo D35**.

### 9.4 Trạng thái gói đăng ký

| Trạng thái | Pro? | Ghi chú |
|---|---|---|
| `trialing` | Có (trial), trừ khi `trial_denied` (D30) | |
| `active` | Có | |
| `grace` | Có | Gia hạn lỗi, đang chờ thu lại (D23) |
| `on_hold` | **Không** (khóa: như Free nhưng gói chưa hủy; dữ liệu giữ nguyên; trả được tiền là có Pro lại) | |
| `expired` | Không | **Không phải đường cụt**: `renewed` tới sau vẫn đưa về `active` (R2) |
| `revoked` | Không | Do `revoked` hoặc hoàn tiền kỳ đang dùng (D34) |

**Bảng đủ: trạng thái × sự kiện (R3).** "Ghi" = lưu sự kiện, không đổi trạng thái, log. "Mốc mới" = đặt lại `quota_anchor_at`.

| Sự kiện | Chưa có dòng | `trialing` | `active` | `grace` | `on_hold` | `expired` | `revoked` |
|---|---|---|---|---|---|---|---|
| `subscription_started` | Tạo `trialing` (có trial; D30 có thể `trial_denied`) hoặc `active`; mốc = lúc bắt đầu | Ghi | Ghi | Ghi | Ghi | Kích hoạt lại: `active` (hoặc `trialing` + kiểm D30), mốc mới | Như `expired` |
| `renewed` | Tạo `active` (log `started-missing`), mốc = lúc trả | `active`, **mốc mới** (trial → trả phí) | `active`, dời kỳ; có `pending_interval` thì đổi `interval` | `active` | `active` | `active`, mốc mới | `active`, mốc mới |
| `renewal_failed` | Ghi | `grace` | `grace` | Giữ (cập nhật `grace_ends_at` nếu store gửi muộn hơn) | Giữ | Ghi | Ghi |
| `grace_ended` | Ghi | `on_hold` | `on_hold` | `on_hold` | Giữ | Ghi | Ghi |
| `cancel_scheduled` | Ghi | `cancel_at_period_end = true` | Như trái | Như trái | Như trái | Ghi | Ghi |
| `cancel_unscheduled` | Ghi | `cancel_at_period_end = false` | Như trái | Như trái | Như trái | Ghi | Ghi |
| `expired` | Ghi | `expired` | `expired` | `expired` | `expired` | Giữ | Giữ `revoked` |
| `revoked` | Ghi | `revoked` | `revoked` | `revoked` | `revoked` | `revoked` | Giữ |
| `refunded` | Ghi | Ghi (trial không có giao dịch) | Giao dịch là kỳ đang dùng → `revoked`; kỳ khác → ghi (D34); không biết giao dịch của kỳ đang dùng → ghi, log `billing_refund_unmatched` (D37) | Như `active` | Như `active` | Ghi | Ghi |
| `refund_reversed` | Ghi | Ghi | Ghi | Ghi | Ghi | Ghi | Kỳ của giao dịch chưa hết → `active`; hết → `expired` |
| `plan_changed` | Ghi | Đổi `interval`, giữ `trialing` | Đổi `interval` và kỳ, **giữ mốc**; giao dịch của kỳ đang dùng = mã trong sự kiện (D37) | Như `active` | Ghi | Ghi | Ghi |
| `plan_change_scheduled` | Ghi | `pending_interval` | `pending_interval` | `pending_interval` | Ghi | Ghi | Ghi |
| `plan_change_canceled` | Ghi | Xóa `pending_interval` | Như trái | Như trái | Như trái | Ghi | Ghi |

13 sự kiện × 7 cột = 91 ô (dòng `payment_succeeded` bỏ theo D35). "Giao dịch của kỳ đang dùng" (D34, D37) lấy mã từ `subscription_started` không có trial,
`renewed` và `plan_changed`.

**Chuyển theo thời gian** (tính lúc đọc; job mỗi giờ ghi lại, nhận dòng bằng `FOR UPDATE SKIP LOCKED`):

| Khi | Thì |
|---|---|
| `trialing` / `active`, chưa đặt hủy, quá `trial_ends_at` / `current_period_end`, chưa có thông báo (D31) | Vẫn Pro thêm `grace_days`; job mỗi giờ gọi `fetchState` nếu bộ nối có; quá khoảng → `on_hold` tới khi có thông báo |
| `grace`, quá `grace_ends_at` | `on_hold` |
| Đã đặt hủy cuối kỳ (`cancel_at_period_end`), quá cuối kỳ | `expired` |
| `on_hold` | Giữ tới khi có thông báo (`renewed`, `expired`, `revoked`) |
| `revoked`, trong 3 ngày kể từ lúc cắt (D39) | Job mỗi giờ gọi `fetchState` nếu bộ nối có, theo trạng thái thật; quá 3 ngày → giữ |

- **Gia hạn lỗi (D23):** `grace_ends_at` = (lúc lỗi hoặc cuối kỳ, lấy mốc muộn hơn) + `grace_days` (mặc định 7); store gửi thời hạn riêng thì dùng của store.
  Trong lúc chờ, chu kỳ lượt mới vẫn mở như đã trả. Trên mobile làm theo sự kiện store (Apple cho chọn 3, 16, 28 ngày).
- **Hủy (D24):** `cancel_scheduled` → vẫn Pro tới `current_period_end`, rồi `expired`. Không hoàn tiền từ phía app.
- **Hoàn tiền (D34):** có hoàn tiền (kể cả một phần) cho **kỳ của giao dịch đang dùng** → mất Pro ngay (`revoked`); hoàn cho giao dịch khác (ví dụ Apple tự hoàn phần
  tháng chưa dùng khi người dùng nâng lên năm: kỳ đang dùng là kỳ năm, mã của nó tới cùng `plan_changed`, D37) → chỉ ghi lại. Không biết giao dịch của kỳ đang dùng (bộ
  nối thiếu mã, D37) → chỉ ghi lại, log `billing_refund_unmatched` để admin xem. Hoàn tiền chủ động **chỉ admin** làm, bằng tay ở trang quản lý của nhà cung cấp;
  admin muốn đền bù mà không cắt Pro thì cấp thêm (mục 10) thay vì hoàn tiền.
  **Tin tới sai thứ tự (D39):** ví dụ Lan nâng tháng → năm, Apple hoàn phần tháng (m1); tin "hoàn m1" tới trước tin `plan_changed` mang mã năm (y1) → Wordmet vẫn coi
  m1 là giao dịch của kỳ đang dùng nên cắt Pro, và `plan_changed` tới sau bị `stale` hoặc rơi vào ô "Ghi" của `revoked`. Hay `refund_reversed` tới trước `refunded` →
  `refund_reversed` chỉ ghi lại, `refunded` tới sau cắt Pro. Vì vậy mỗi lần `refunded` cắt Pro, sau commit hệ thống hỏi lại nhà cung cấp (`fetchState`) và theo trạng
  thái thật (Lan có Pro lại sau vài giây); hỏi lỗi thì job mỗi giờ hỏi lại trong 3 ngày. Bộ nối không có `fetchState` → giữ `revoked` (mục 19).
- **Đổi tháng ↔ năm (D25):** như bảng: `plan_changed` giữ mốc; `plan_change_scheduled` có hiệu lực ở `renewed` kế tiếp; hủy lần đổi đang chờ thì xóa.
- ~~**Kiểu "app tự gia hạn" (R11)**~~ **bỏ theo D35**: không còn gói người dùng tự trả từng kỳ (mục 9.1).

## 10. Cấp tay (Chốt D6–D9, D19, D20, D32, D33, D38; chi tiết Đề xuất, đã duyệt 19/10)

- **Quyền `entitlements.grant`** (`admin`, `editor`). Luật kiểm ở server:

| Việc | `admin` | `editor` |
|---|---|---|
| Cấp "một gói" Pro | Ai cũng được, kể cả chính mình | Chỉ tài khoản **không có vai trò staff**, không phải chính mình |
| Cấp "con số riêng" phiên luyện | Ai cũng được | Như trên |
| Cấp "con số riêng" lượt AI | Ai cũng được | **Không** |
| Thu hồi lần cấp **không** có con số lượt AI | Mọi lần cấp | Chỉ lần cấp trên tài khoản không có vai trò staff |
| Thu hồi lần cấp **có** con số lượt AI (kể cả "lượt AI: 0") | Có | **Không** (D33) |
| Sửa ngày lần cấp **không** có con số lượt AI (D38) | Mọi lần cấp | Chỉ lần cấp trên tài khoản không có vai trò staff |
| Sửa ngày lần cấp **có** con số lượt AI (D38) | Có | **Không** (như D33) |
| Xem lịch sử | Có | Có |

- **Cấp "một gói" Pro là gói mới (D32):** lần cấp **bắt đầu ngay** (không có `starts_at`, hoặc `starts_at` ≤ lúc cấp) thu hồi lần cấp "một gói" khác đang hiệu lực
  của người đó (`revoke_reason = replaced`, người thu hồi = người cấp mới); mốc chu kỳ lượt AI đặt lại = `starts_at` của lần cấp mới (mục 5.5). Lần cấp **bắt đầu ở
  tương lai** không thu hồi gì (D38): nếu hai lần cấp chồng ngày nhau thì cả hai cùng tính, Pro tới ngày kết thúc muộn hơn, và từ ngày lần mới bắt đầu, mốc lượt AI là
  `starts_at` của lần mới (nguồn bắt đầu gần nhất).
- **Sửa ngày lần cấp (D38):** muốn kéo dài hoặc dời ngày thì sửa chính lần cấp đó, không tạo lần cấp mới. Đổi `ends_at`: dời ra sau hay rút ngắn đều được, ngày mới
  > max(`starts_at`, lúc sửa). Đổi `starts_at`: chỉ khi lần cấp **chưa bắt đầu**, ngày mới không sớm hơn lúc sửa quá 5 phút; đã bắt đầu thì `starts_at` cố định (là
  mốc lượt AI). Lần cấp đã thu hồi hoặc đã hết hạn → 409 `grant-not-active`. Bắt buộc `reason`. Mỗi lần sửa ghi một dòng `entitlement_grant_changes` (ngày cũ → mới,
  người sửa, lý do); gửi lại đúng ngày đang có thì không ghi gì (tự nhiên idempotent). Sửa ngày không gọi lại `cancelAtPeriodEnd` của bộ nối.
- **Người nhận đang có gói trả tiền tự gia hạn** (`trialing`, `active`, `grace`, chưa đặt hủy): body phải có `confirm_turn_off_paid_renewal: true`, thiếu → 409
  `grant-not-allowed` / `target-has-paid-subscription`. Có → ghi lần cấp, rồi gọi `cancelAtPeriodEnd` của bộ nối; thành công → `paid_renewal_action = turned_off`,
  nhà cung cấp sẽ gửi `cancel_scheduled`. **Không hoàn tiền.** Lần cấp hết trước kỳ đã trả thì phần kỳ đã trả còn lại vẫn là Pro (gói đăng ký vẫn hiệu lực tới cuối
  kỳ). Bộ nối không tắt được (ví dụ Apple: `ASSUMPTION` chỉ người dùng tự hủy, chưa kiểm) → lần cấp vẫn tạo, `paid_renewal_action = not_supported`, log
  `paid_renewal_not_cancelled` cho staff — **xử lý sau** (chủ dự án 19/10, mục 19).
- **Người tự mua Pro trong lúc đang được cấp:** lần cấp giữ; mốc đặt lại theo gói vừa mua (nguồn bắt đầu gần nhất).
- **Nhập (R12):**
  - Mọi lần cấp **bắt buộc** `ends_at` và `reason`. `starts_at` mặc định là lúc cấp; được đặt ở tương lai (lần cấp chưa bắt đầu không tính, thu hồi trước khi bắt đầu
    được); không sớm hơn lúc cấp quá 5 phút (lệch đồng hồ). `ends_at` > max(`starts_at`, lúc cấp). Không có giới hạn độ dài tối đa (D20 chỉ bắt buộc có hạn).
  - Khoảng hợp lệ của con số riêng = khoảng của cài đặt tương ứng ở mục 13, **cho phép 0**: `practice_sessions_per_day` 0–200, `ai_practice_per_cycle` 0–5.000,
    `ai_lookup_per_cycle` 0–5.000. `kind = limits` phải có ít nhất một khóa.
  - Đặt `practice_sessions_per_day = 0` → mở phiên trả lý do `plan-required` (403 `entitlement-required`), không có `resets_at` (ngày mai vẫn 0).
  - `user_id` không tồn tại → 404 `not-found`.
- Có hiệu lực ngay ở lần kiểm kế tiếp (không cache, mục 5.4). Thu hồi: `revoked_at`; quyền tính lại ngay; lượt đã dùng không tính lại.
- Người nhận sau đó thành staff: lần cấp vẫn giữ; `editor` không thu hồi, không sửa ngày được nữa (`grant-not-allowed`).
- Staff dùng phía người học như Free (D9); cần test thì `admin` cấp.
- Lịch sử lọc được theo người học, người cấp, còn hiệu lực, **sắp hết hạn trong N ngày** (Đề xuất, đã duyệt 19/10).

## 11. Quảng cáo (Chốt D21)

- API xem gói trả `ads`: `show` (công tắc bật **và** gói `free`), `interstitial_per_day`, `min_interval_minutes`. App **tự đếm** số lần đã hiện theo cấu hình
  này (server không thấy quảng cáo đã hiện), chỉ hiện ở **chỗ nghỉ** (hết một phiên luyện, hết một lượt flashcard), không bao giờ giữa một câu hỏi (Đề xuất, đã
  duyệt 19/10).
- Công tắc `entitlements.ads_enabled` mặc định **tắt**: chỉ bật sau khi chốt **tuổi tối thiểu** (DB3, review schema 17/10) và có bước hỏi đồng ý theo dõi quảng
  cáo (Luật Bảo vệ dữ liệu cá nhân 2025, Điều 28, theo research); quảng cáo che nội dung phải tắt được bằng một chạm (Nghị định 342/2025, theo research).
- Không có quảng cáo "xem để nhận thưởng"; không gửi nội dung học hay dữ liệu cá nhân cho SDK quảng cáo (việc của đợt giao diện).

## 12. API

### 12.1 Người học (chỉ cần đăng nhập; R15)

API 1 chỉ cần đăng nhập (guard xác thực chung), **không** dùng `@LearnerContent()`: tài khoản mới chưa có hồ sơ và tài khoản staff vẫn gọi được, và Entitlements
không phải import Content (tránh vòng import khi Content import Entitlements ở Bước 7). `resets_at` của kho phiên luyện tính theo múi giờ hồ sơ; chưa có thì UTC.

| # | API | Làm gì |
|---|---|---|
| 1 | `GET /v1/me/entitlements` | `plan` (`free` / `trial` / `pro`); `sources` (loại, `ends_at` hoặc `renews_at`, `cancel_at_period_end`, `pending_interval`, `status`); với mỗi kho: `limit`, `used`, `remaining`, `resets_at`; `features` (`ai.practice`, `ai.lookup` được phép hay không, lý do); `ai_available` (công tắc, trần); `ads`; `trial_eligible` |

Mua, hủy, đổi gói: không có ở Bước 5 (mục 3).

### 12.2 Staff

| # | API | Quyền | Khóa chống trùng | Làm gì |
|---|---|---|---|---|
| 2 | `POST /v1/admin/entitlements/grants` | `entitlements.grant` | `Idempotency-Key` | Body: `user_id`, `kind`, `plan` hoặc `limits`, `starts_at?`, `ends_at`, `reason`, `confirm_turn_off_paid_renewal?`. Luật mục 10 (D32, D33, R12) |
| 3 | `POST /v1/admin/entitlements/grants/{id}/revoke` | `entitlements.grant` | Tự nhiên (thu hồi lần hai trả kết quả cũ) | Body: `reason` |
| 3b | `PATCH /v1/admin/entitlements/grants/{id}` | `entitlements.grant` | Tự nhiên (gửi lại đúng ngày đang có không đổi gì) | Body: `starts_at?`, `ends_at?` (ít nhất một), `reason`. Sửa ngày lần cấp (D38, mục 10); trả lần cấp kèm lịch sử sửa |
| 4 | `GET /v1/admin/entitlements/grants` | `entitlements.grant` | — | Lọc `user_id`, `granted_by`, `active`, `expiring_within_days`; phân trang `page_size` + `page_token` |
| 5 | `GET /v1/admin/entitlements/users/{user_id}` | `entitlements.grant` | — | Như API 1 cho một người học, kèm danh sách nguồn và các lần cấp (mỗi lần cấp kèm lịch sử sửa ngày, D38) |
| 6 | `GET /v1/admin/entitlements/ai-usage?date=` | `settings.manage` | — | Lượt AI của ngày (giờ Việt Nam) so với trần, số đang giữ, công tắc, `alert_reached` (đã chạm ngưỡng cảnh báo, D36) |

Các con số và công tắc chỉnh qua API cài đặt có sẵn `/v1/admin/settings` (`settings.manage`, mục 13).

### 12.3 Thanh toán

| # | API | Làm gì |
|---|---|---|
| 7 | `POST` và `GET /v1/billing/webhooks/{provider}` | Mục 9.2. V1 chỉ có `fake` |

### 12.4 Dịch vụ cho module khác (export từ `entitlements/index.ts`)

| Hàm | Ai gọi | Ghi chú |
|---|---|---|
| `check(userId, feature)` → `{ allowed: true } \| { allowed: false, reason, resets_at? }` | Practice (có), Content (Bước 7) | Giữ chữ ký của Bước 4, thêm lý do |
| `checkQuota(userId, 'practice_sessions')` | Practice khi mở phiên | Mục 7.4 |
| `recordPracticeSession(tx, userId, sessionId, localDate)` | Practice | Mục 7.4 |
| `reserve` / `confirm` / `release(userId, pool, operationId)` | Practice, Content (Bước 7) | Mục 7.1; mỗi lần một transaction ngắn; không gọi AI khi đang giữ khóa (R6) |
| `refund(userId, pool, operationId, reportId)` | Practice (Bước 7, xử lý báo lỗi câu AI) | Mục 7.2 |

### 12.5 Mã lỗi (Problem Details; Đề xuất, đã duyệt 19/10)

| Mã | Status | API | Khi |
|---|---|---|---|
| `entitlement-required` | 403 | Practice, Bước 7 | Lý do `plan-required`: tính năng cần Pro hoặc con số = 0 (mã có sẵn từ Bước 4) |
| `quota-exhausted` | 403 | Practice mở phiên, Bước 7 | Hết phiên hôm nay hoặc hết lượt AI chu kỳ này; kèm `resets_at`. Không dùng 429 để khỏi lẫn với chống spam |
| `ai-unavailable` | 503 | Bước 7 | Công tắc AI tắt hoặc chạm trần toàn hệ thống; kèm `retry-after` |
| `grant-not-allowed` | 409 | 2, 3, 3b | Kèm `reason`: `target-is-staff`, `self-grant`, `ai-limits-admin-only` (đặt, thu hồi hoặc sửa ngày, D33, D38), `target-is-admin`, `target-has-paid-subscription` (thiếu xác nhận, D32) |
| `grant-not-active` | 409 | 3, 3b | Lần cấp đã hết hạn (thu hồi: đã thu hồi thì trả kết quả cũ); sửa ngày: lần cấp đã thu hồi hoặc đã hết hạn (D38) |
| `validation-failed` | 400 | 2, 3, 3b, 6 | Thiếu `reason` hoặc `ends_at`; `ends_at` đã qua hoặc trước `starts_at`; con số ngoài khoảng; `kind` không khớp nội dung; sửa `starts_at` của lần cấp đã bắt đầu, hoặc body sửa ngày không có ngày nào (D38) |
| `not-found` | 404 | 2, 3, 3b, 5 | Lần cấp, người dùng không có |
| `forbidden` | 403 | 2–6 | Không có quyền staff tương ứng (có sẵn từ Bước 1) |
| (theo bộ nối) | 400 / 2xx | 7 | Sai chữ ký → 400; còn lại trả lời theo kiểu nhà cung cấp |
| `rate-limited` | 429 | API ghi | Có sẵn (`user.write` cho API 2, 3, 3b) |

## 13. Cài đặt (Settings; mọi con số `ASSUMPTION` trừ chỗ ghi Chốt; quyền `settings.manage`)

Nhóm `entitlements` (mới):

| Khóa | Mặc định | Khoảng admin chỉnh | Nhãn |
|---|---|---|---|
| `free_practice_sessions_per_day` | 3 | 1–50 | Chốt D18 (khoảng: ASSUMPTION) |
| `pro_practice_sessions_per_day` | 30 | 1–200, ≥ số của Free | Chốt D18 |
| `pro_ai_practice_per_cycle` | 300 | 0–5.000 | Chốt D18 (tạm, theo đề xuất) |
| `pro_ai_lookup_per_cycle` | 100 | 0–5.000 | Chốt D18 (tạm, theo đề xuất) |
| `trial_ai_practice_per_cycle` | 300 | 0–5.000 | Chốt D16 (mặc định = Pro) |
| `trial_ai_lookup_per_cycle` | 100 | 0–5.000 | Chốt D16 |
| `grace_days` | 7 | 0–16 | Chốt D23 |
| `trial_reminder_days_before` | 2 | 1–6 | Chốt D22 (2 ngày: đề xuất đã duyệt) |
| `renewal_notice_days_before` | **để trống (tắt)** | để trống = tắt, hoặc 1–30 (9 ngày ≈ 7 ngày làm việc) | Chốt D29: mặc định tắt, bật nếu luật sư nói bắt buộc |
| ~~`expiry_notice_days_before`~~ | — | — | **Bỏ theo D35** (chỉ dùng cho gói "app tự gia hạn") |
| `ai_enabled` | bật | bật / tắt | Chốt D2 |
| `ai_daily_cap` | 1.000 | 0–100.000 | Chốt D18 |
| `ai_cap_alert_percent` | 75 | để trống = không cảnh báo, hoặc 50–95 | Chốt D18; từ D36 là ngưỡng tô vàng trên màn admin, không gửi email |
| `ads_enabled` | tắt | bật / tắt | Chốt D21 (mặc định tắt: đề xuất đã duyệt) |
| `ads_interstitial_per_day` | 3 | 0–20 | Chốt D21 |
| `ads_min_interval_minutes` | 10 | 1–240 | Chốt D21 |

Thêm vào nhóm `learning`: `groups_per_user` 100 (10–1.000), `items_per_group` 2.000 (100–10.000). Nhóm `content` (mới): `private_words_per_user` 10.000
(1.000–100.000), `sentences_per_sense` 20 (5–100). Chốt D17, D18; khoảng là ASSUMPTION.

**Cố định trong code:** thời gian giữ chỗ 2 phút (ER5); giờ Việt Nam cho ngày của trần AI; số lần thử áp lại một sự kiện (5); giữ `raw_payload` 90 ngày (R23);
trần email thanh toán 95% hạn mức email ngày (R18); body webhook 64 KB (R16); hỏi lại gói bị cắt trong 3 ngày (D39). Đều là `ASSUMPTION`.

Đổi con số giữa chu kỳ (ER9): áp ở lần kiểm kế tiếp; lượt đã dùng không tính lại; còn lại không âm. Giảm `items_per_group`, `groups_per_user` dưới số đang có:
dữ liệu cũ giữ nguyên, chỉ chặn thêm mới (như luật hiện nay).

## 14. Email (Đề xuất, đã duyệt 19/10 trừ chỗ ghi khác)

| Email | Gửi khi | Cho ai |
|---|---|---|
| Bắt đầu trial | Áp `subscription_started` có trial | Người học |
| Nhắc trial | `trial_ends_at − trial_reminder_days_before` | Người học |
| Báo trước khi trừ tiền kỳ mới (D29: **mặc định tắt**) | `current_period_end − renewal_notice_days_before`, gói tự gia hạn, chưa đặt hủy; chỉ khi cài đặt có số | Người học |
| ~~Báo sắp hết hạn~~ | **Bỏ theo D35** (gói "app tự gia hạn" không còn) | — |
| ~~Cảnh báo trần AI~~ | **Bỏ theo D36** (chỉ tô vàng trên màn admin, mục 7.3) | — |

- **Gửi có trạng thái (R9):** job mỗi giờ (`MaintenanceScheduler`) tạo dòng `entitlement_notices` `pending` cho email đến hạn (unique chặn tạo trùng), nhận dòng
  bằng `FOR UPDATE SKIP LOCKED`, gửi theo cách của email nhắc học Bước 3 (bảng có trạng thái gửi, không dùng kiểu "bắn rồi quên"), ghi `sent` / `failed` (`attempts`
  + 1, thử lại giờ sau). Quá `window_ends_at` mà chưa gửi được → `skipped`, log. Cửa sổ: nhắc trial tới `trial_ends_at`; báo trước gia hạn tới `current_period_end`.
  Trễ tối đa khoảng một giờ.
- **Hạn mức email (R18):** không bị trần 80% của email nhắc học, nhưng dùng trần riêng **95%** hạn mức ngày (`MailBudget.tryConsume({ ceiling: 0.95 })`), chừa phần
  còn lại cho OTP.
- Gói `trial_denied` không nhận email trial (D30). Ngôn ngữ theo tiếng mẹ đẻ (K4).
- Email báo trước khi trừ tiền kỳ mới (D29): chủ dự án thấy các app thường chỉ báo ở trial, không báo mỗi lần gia hạn → **mặc định tắt**, giữ sẵn để bật nếu
  luật sư nói Điều 42 Luật Bảo vệ quyền lợi người tiêu dùng 2023 (báo việc nộp phí ≥ 7 ngày làm việc trước khi hết hạn dịch vụ liên tục, theo research) áp cho gói
  tự gia hạn.

## 15. Edge cases (When → Then)

Mỗi luật cấp trên được dẫn (SR4, SR8, SR9, SR10, SR11, SR13, SR14, ER5, ER7, ER9, ER10, ER11, ER14) có ca riêng cho cách làm của Bước 5 (quy ước
`SPEC_WRITING_CONVENTIONS.md`).

### 15.1 Sổ lượt và trần

| # | When | Then |
|---|---|---|
| B5E1 | Còn 1 lượt, hai tab gọi `reserve` cùng lúc (ER5) | Khóa `(user, pool)`: một bên được `reserved`, bên kia `quota-exhausted`; không bao giờ có hai dòng giữ cho lượt cuối |
| B5E2 | Gọi `reserve` hai lần cùng `operation_id` khi dòng đầu đang `reserved` (SR8) | Lần hai trả chính dòng đó; chỉ một lượt bị giữ |
| B5E3 | `reserve` cùng `operation_id` sau khi dòng cũ đã `released` | Dòng mới (thử lại là giữ chỗ mới, ER5) |
| B5E4 | Hai người dùng dùng cùng một chuỗi `operation_id` | Không ảnh hưởng nhau (khóa và unique theo `(user, pool, operation_id)`) |
| B5E5 | Server chết giữa `reserve` và `confirm` | Sau 2 phút dòng không còn được đếm (tính lúc đọc); job mỗi giờ ghi `released`; người học không bị trừ |
| B5E6 | `confirm` tới sau 2 phút, vẫn còn lượt | `confirmed`, trừ 1 |
| B5E7 | `confirm` tới sau 2 phút, đã hết lượt (người học dùng lượt khác trong lúc đó) | `released`, `note = late-confirm-free`; kết quả vẫn giao; không vượt mức (ER5) |
| B5E8 | `confirm` gọi lại trên dòng đã `confirmed` | Trả kết quả cũ, không trừ thêm |
| B5E9 | Trial hoặc gói hết hạn trong lúc một lượt đang `reserved` (EE2) | `confirm` vẫn nhận (tác vụ đã nhận trước khi hết hạn); lần `reserve` sau → `entitlement-required` |
| B5E10 | Câu AI tạo khi còn trial, nộp đáp án sau khi trial hết (SR4, ER4) | Chấm bình thường; chấm không đi qua Entitlements |
| B5E11 | Trần toàn hệ thống còn 1 lượt, hai người dùng khác nhau cùng `reserve` (ER14) | Khóa chung: một bên được, bên kia `ai-unavailable`; không ai bị trừ lượt khi bị từ chối |
| B5E12 | Đã dùng 999/1.000 của trần, 3 lượt đang `reserved` của người khác chưa quá hạn | Đếm cả 3 → chạm trần → `ai-unavailable` cho tới khi có lượt được nhả hoặc sang ngày mới |
| B5E13 | Qua 0 giờ giờ Việt Nam | Trần đếm lại từ 0; dòng `reserved` lúc 23:59 thuộc ngày cũ theo `system_date` |
| B5E14 | Admin tắt công tắc AI khi đang có lượt `reserved` | `confirm` của lượt đang giữ vẫn nhận; mọi `reserve` mới → `ai-unavailable`; bài không AI chạy bình thường |
| B5E15 | ~~Đã dùng chạm 75% trần lần hai trong cùng ngày~~ | **Bỏ theo D36** (không còn email cảnh báo) |
| B5E16 | ~~Không có `admin` nào đã xác minh email khi cần cảnh báo~~ | **Bỏ theo D36** |
| B5E17 | Admin hạ `pro_ai_practice_per_cycle` từ 300 xuống 100 khi một người đã dùng 150 (ER9) | Còn lại 0, không âm; lượt đã dùng không tính lại; kỳ sau dùng 100 |
| B5E18 | Hoàn lượt khi chu kỳ hiện tại đã dùng 0 | Không ghi `credit`; trả `refunded: false`; lượt đó không "để dành" |
| B5E19 | Hoàn lượt hai lần cho cùng một câu | Một dòng `credit` (idempotent theo `operation_id`) |
| B5E20 | Hoàn lượt cho câu tạo ở chu kỳ trước | Trừ vào số đã dùng của chu kỳ hiện tại (D19) |

### 15.2 Phiên luyện

| # | When | Then |
|---|---|---|
| B5E21 | Free đã có 3 phiên được tính hôm nay, mở phiên thứ 4 | 403 `quota-exhausted`, `resets_at` = 0 giờ mai giờ người học; phiên đang mở (nếu có) giữ nguyên |
| B5E22 | Mở phiên, không trả lời câu nào, mở phiên khác | Không tốn lượt; phiên cũ `abandoned` như Bước 4 |
| B5E23 | Phiên thứ 3 mở lúc 23:58, câu đầu có kết quả lúc 00:01 | Phiên tính vào **ngày mới** (ngày của câu đầu có kết quả) |
| B5E24 | Người học đổi múi giờ trong ngày (SR13, SE3) | "Hôm nay" theo múi giờ hiện tại; phiên đã tính giữ `local_date` cũ; có thể được thêm hoặc bớt phiên trong ngày đổi, chấp nhận |
| B5E25 | Câu đầu tiên của phiên thành `void` (từ bị gỡ) | Chưa tính phiên; tính khi có câu đầu tiên `correct` hoặc `wrong` |
| B5E26 | Trong phiên đã tính, gói chuyển Pro → Free giữa chừng | Phiên làm tiếp tới hết (kiểm hạn mức chỉ khi mở phiên) |
| B5E27 | Ghi nhận phiên lỗi (DB) khi đang ghi câu trả lời | Cùng transaction: rollback cả hai; gửi lại là lần thực hiện mới (Bước 4 B4E23) |

### 15.3 Gói, nguồn, cấp tay

| # | When | Then |
|---|---|---|
| B5E28 | Lan trả Pro tự gia hạn (mốc 1/11), ngày 15/11 được cấp "Pro tới 15/12" có `confirm_turn_off_paid_renewal` (D19, D32) | Bộ nối tắt tự gia hạn (gói trả tiền hết 30/11, không trừ kỳ sau, không hoàn tiền); mốc mới 15/11, chu kỳ [15/11, 15/12) đủ lượt; Pro tới 15/12 |
| B5E29 | Pro 300 lượt, admin đặt "lượt bài AI: 500 tới 31/12" | Con số 500 tới 31/12, rồi về 300; đã dùng giữ nguyên |
| B5E30 | Hai lần đặt con số riêng cho cùng kho cùng hiệu lực | Lần tạo sau cùng thắng; thu hồi lần đó thì lần trước có hiệu lực lại |
| B5E31 | Admin đặt "lượt bài AI: 0" cho một tài khoản Pro | `ai.practice` → `entitlement-required` tới khi hết hạn lần đặt |
| B5E32 | Tài khoản Free được admin đặt "lượt bài AI: 500" | Dùng được bài AI; mốc chu kỳ = `starts_at` của lần đặt; vẫn thấy quảng cáo nếu công tắc bật |
| B5E33 | Editor cấp cho một `admin`, cho một `editor` khác, hoặc cho chính mình (D6, D8) | 409 `grant-not-allowed` với `target-is-admin` / `target-is-staff` / `self-grant`; không lưu gì |
| B5E34 | Editor đặt con số riêng lượt AI | 409 `grant-not-allowed` / `ai-limits-admin-only` |
| B5E35 | Editor cấp "Pro 30 ngày" cho người học (D7) | Được; người học có lượt AI cố định của Pro; lịch sử ghi `granted_by`, `granted_by_role = editor` |
| B5E36 | Cấp thiếu `ends_at` hoặc `ends_at` đã qua (D20) | 400 `validation-failed` |
| B5E37 | Gửi lại `POST grants` cùng `Idempotency-Key`, cùng body / khác body (SR8) | Trả kết quả cũ / từ chối theo luật khóa chung |
| B5E38 | Người học được editor cấp, sau đó thành `editor` | Lần cấp giữ; editor khác thu hồi → 409 `target-is-staff`; admin thu hồi được |
| B5E39 | Thu hồi lần cấp đã hết hạn | 409 `grant-not-active` |
| B5E40 | Người học (không staff) gọi API staff (SR9) | 403 `forbidden` |
| B5E41 | Staff mở `GET /v1/me/entitlements` của chính mình (D9) | Như mọi người dùng: Free nếu không có lần cấp |

### 15.4 Thanh toán

| # | When | Then |
|---|---|---|
| B5E42 | Cùng một sự kiện tới hai lần (ER11, E17) | Lần hai trùng `dedupe_key` → bỏ qua, trả lời nhà cung cấp như đã nhận; không tạo quyền thừa |
| B5E43 | `expired` tới trước `renewed` của cùng kỳ (EE4) | `renewed` có `occurred_at` cũ hơn `last_event_at` → `stale`; bộ nối có `fetchState` thì áp trạng thái hỏi lại |
| B5E44 | Chữ ký sai | 400, không lưu sự kiện, log không có payload |
| B5E45 | Sự kiện không nhận ra người dùng | `ignored`, log; không lỗi với nhà cung cấp |
| B5E46 | Áp sự kiện lỗi (DB) | `failed`; job thử lại tối đa 5 lần rồi log `billing_event_stuck` |
| B5E47 | Gia hạn lỗi ngày 15/11, `grace_days` = 7 (D23) | Pro tới 22/11; chu kỳ lượt mới mở; 22/11 chưa thu được → `on_hold` (khóa); thu được 25/11 → `active`, Pro lại ngay |
| B5E48 | Trừ tiền lần đầu sau trial lỗi | Như B5E47 (cùng luật) |
| B5E49 | `cancel_scheduled` rồi `cancel_unscheduled` trước cuối kỳ | Vẫn Pro; gia hạn như thường |
| B5E50 | `cancel_scheduled`, tới cuối kỳ (D24) | `expired` lúc `current_period_end` (tính lúc đọc, job ghi lại); về Free; dữ liệu học giữ nguyên |
| B5E51 | `refunded` cho kỳ hiện tại, rồi `refund_reversed` | `revoked` ngay (không còn Pro); sau đó `active` lại nếu kỳ chưa hết |
| B5E52 | Năm → tháng (`plan_change_scheduled`), rồi người dùng hủy lần đổi (D25) | `pending_interval` xóa; gói năm gia hạn như thường |
| B5E53 | Năm → tháng chờ, tới `renewed` cuối năm | `interval = month`; mốc chu kỳ giữ nguyên |
| B5E54 | Tháng → năm giữa kỳ (`plan_changed`) | `interval = year`, kỳ mới theo sự kiện; mốc chu kỳ và số đã dùng của chu kỳ hiện tại giữ |
| B5E55 | Gói báo về là trial cho tài khoản đã có `trial_history`, hoặc thẻ đã dùng trial (D22, D30) | `trial_denied`: không có Pro trong thời gian trial (vẫn Free); bộ nối có `endTrialNow` → gọi, có `renewed` thì Pro như mua thường; log `trial_reuse_detected` |
| B5E56 | ~~`payment_succeeded` (app tự gia hạn) khi gói đó còn 10 ngày~~ | **Bỏ theo D35** (giữ mã để không đánh số lại) |
| B5E57 | ~~Gói "app tự gia hạn" hết kỳ, không mua lại~~ | **Bỏ theo D35** |
| B5E58 | Người dùng có cùng lúc gói Apple và gói web (Apple 3.1.3(b)) | Hai nguồn Pro; Pro khi còn ít nhất một; mốc theo nguồn bắt đầu gần nhất (D32) |
| B5E59 | Tài khoản đang "đang xóa" (SR11, khi Bước 8 có trạng thái này) nhận sự kiện thanh toán | Sự kiện lưu, không áp (`ignored`, lý do `user-deleting`); không ghi dữ liệu mới cho người đó |

### 15.5 Email, dữ liệu, giới hạn

| # | When | Then |
|---|---|---|
| B5E60 | Job chạy hai lần cùng giờ (hai tiến trình API) | Unique chặn tạo trùng dòng; `FOR UPDATE SKIP LOCKED` chặn gửi trùng: một email |
| B5E61 | Đã chạm trần 95% hạn mức email ngày | Email thanh toán chưa gửi, dòng `failed`, thử lại giờ sau (trong cửa sổ); OTP vẫn còn 5% |
| B5E62 | Log của webhook, cấp tay, sổ lượt (SR10) | Mang `operation_id`; không có số thẻ, email, `raw_payload` |
| B5E63 | Người học gọi `GET /v1/me/entitlements` liên tục | Chỉ đọc, không ghi gì; Bước 5 không thêm rule giới hạn cho API đọc (SR14 chỉ đòi cho API ghi) |
| B5E64 | Admin giảm `groups_per_user` dưới số nhóm một người đang có | Nhóm cũ giữ nguyên; tạo nhóm mới bị từ chối như luật hiện nay |
| B5E65 | Admin đặt `ai_daily_cap = 0` | Mọi `reserve` AI → `ai-unavailable` (như tắt công tắc) |

### 15.6 Thêm sau review độc lập (19/10/2026)

| # | When | Then |
|---|---|---|
| B5E66 | Job đã ghi gói `expired`, rồi `renewed` của kỳ mới tới muộn (R2) | `active`, mốc mới; Pro lại ngay |
| B5E67 | Gói tự gia hạn quá cuối kỳ 3 ngày chưa có thông báo nào (D31) | Vẫn Pro; job gọi `fetchState` nếu có; quá `grace_days` (7) vẫn chưa có → `on_hold` tới khi có thông báo |
| B5E68 | Trial quá `trial_ends_at` chưa có thông báo (D31) | Như B5E67 |
| B5E69 | ~~Hai `payment_succeeded` (gói app tự gia hạn) tới ngược thứ tự (R1)~~ | **Bỏ theo D35** |
| B5E70 | `renewed` tới sau `cancel_scheduled` có `occurred_at` muộn hơn (R1) | `renewed` vẫn áp, kỳ dời; `cancel_at_period_end` giữ `true` (hết kỳ mới thì `expired`) |
| B5E71 | Hai sự kiện trạng thái cùng `occurred_at` | Áp theo thứ tự nhận |
| B5E72 | Sự kiện `sandbox` tới API chạy production (R17) | Lưu, `ignored`, log |
| B5E73 | Mở phiên mới đúng lúc câu đầu của phiên cũ đang được ghi, Free đã có 2 phiên (R4) | Phiên cũ được tính (3); `checkQuota` chạy sau lệnh đóng phiên cũ nên thấy 3 → mở phiên mới bị 403 `quota-exhausted`; không có phiên thứ 4 |
| B5E74 | Bên gọi giữ một transaction và gọi `reserve` hai lần (R6) | Không được làm (hợp đồng mục 7.1); plan có test chặn ở Practice/Content (Bước 7) |
| B5E75 | `confirm` trên dòng bên gọi đã nhả vì AI lỗi (R7) | Không đổi, trả `released` |
| B5E76 | `confirm` muộn khi đã có một dòng mới cùng `operation_id` đang `reserved` (R7) | Dòng cũ → `released` (`late-confirm-free`); dòng mới không bị ảnh hưởng |
| B5E77 | Ghi nhận phiên khi dòng của phiên đó đã có (gọi lại) (R14) | `ON CONFLICT DO NOTHING`; transaction ghi đáp án không hỏng |
| B5E78 | Admin cấp Pro lần hai cho người đang có lần cấp Pro (D32) | Lần cũ `revoked`, `revoke_reason = replaced`; mốc = `starts_at` lần mới; đủ lượt |
| B5E79 | Cấp Pro cho người đang trả tiền tự gia hạn mà thiếu `confirm_turn_off_paid_renewal` (D32) | 409 `grant-not-allowed` / `target-has-paid-subscription`; không lưu gì |
| B5E80 | Cấp Pro cho người đang trả tiền qua nhà cung cấp không tắt được tự gia hạn (D32) | Lần cấp tạo; `paid_renewal_action = not_supported`; log cho staff; gói trả tiền vẫn tự gia hạn (xử lý sau) |
| B5E81 | Lần cấp Pro 15/11–20/11 cho người có gói trả tiền đã tắt tự gia hạn tới 30/11 | 20/11–30/11 vẫn Pro (gói trả tiền); mốc từ 20/11 là mốc của gói trả tiền (bảng ví dụ 5.5) |
| B5E82 | Editor thu hồi lần cấp "lượt bài AI: 0" do admin đặt (D33) | 409 `grant-not-allowed` / `ai-limits-admin-only` |
| B5E83 | Cấp với `practice_sessions_per_day = 0` (R12) | Mở phiên → 403 `entitlement-required`, không có `resets_at` |
| B5E84 | Cấp với `starts_at` ở tương lai, rồi thu hồi trước khi bắt đầu (R12) | Chưa bắt đầu thì không tính; thu hồi được; không đổi gì cho người học |
| B5E85 | Cấp cho `user_id` không tồn tại (R12) | 404 `not-found` |
| B5E86 | `refunded` một phần cho giao dịch của kỳ đang dùng (D34) | `revoked`, mất Pro ngay |
| B5E87 | Apple tự hoàn phần tháng chưa dùng khi người dùng nâng lên gói năm (D34) | Giao dịch được hoàn không phải kỳ đang dùng (kỳ năm) → chỉ ghi; vẫn Pro |
| B5E88 | Hoàn lượt khi chu kỳ chỉ có lượt đang giữ, chưa có lượt đã xác nhận (R21) | Không ghi `credit` |
| B5E89 | Hai tài khoản cùng một thẻ bắt đầu trial gần như cùng lúc (R25) | Unique `(provider, payment_fingerprint)`: tài khoản tới sau `trial_denied` |
| B5E90 | Gói báo trial cho tài khoản chưa xác minh email (R25) | Trial vẫn tính (điều kiện email chỉ ở `trial_eligible`); ghi `trial_history` |
| B5E91 | Tài khoản mới chưa có hồ sơ, hoặc staff, gọi `GET /v1/me/entitlements` (R15) | 200; `resets_at` của phiên luyện theo UTC nếu chưa có múi giờ |
| B5E92 | Job dọn `raw_payload` chạy (R23) | Dòng sự kiện cũ hơn 90 ngày: `raw_payload` = null; các cột chuẩn hóa giữ |

### 15.7 Thêm sau review plan (19/10/2026)

| # | When | Then |
|---|---|---|
| B5E93 | `refunded` tới cho gói `active` mà Wordmet không biết giao dịch của kỳ đang dùng (bộ nối thiếu mã, D37) | Ghi lại, log `billing_refund_unmatched`; vẫn Pro (không tự cắt) |
| B5E94 | `subscription_started` không có trial, hoặc `plan_changed` tháng → năm, tới mà thiếu `transaction_id` (D37) | Như sự kiện thiếu trường tối thiểu (mục 9.2): bộ nối có `fetchState` thì hỏi lại; không có thì `ignored`, log `billing_event_incomplete` |
| B5E95 | Lan được cấp Pro 1/11–30/11; ngày 20/11 admin sửa `ends_at` thành 31/12 (D38) | Pro tới 31/12; mốc lượt AI vẫn 1/11 (chu kỳ không đếm lại); một dòng `entitlement_grant_changes` (30/11 → 31/12, người sửa, lý do) |
| B5E96 | Sửa `starts_at` của lần cấp đã bắt đầu (D38) | 400 `validation-failed`; không đổi gì |
| B5E97 | Editor sửa ngày lần cấp có con số lượt AI, hoặc lần cấp của một `admin` / `editor` khác (D38) | 409 `grant-not-allowed` / `ai-limits-admin-only` / `target-is-admin` / `target-is-staff`; không đổi gì |
| B5E98 | Sửa ngày lần cấp đã thu hồi hoặc đã hết hạn (D38) | 409 `grant-not-active` |
| B5E99 | Lan được cấp Pro tới 30/11; ngày 10/11 editor tạo lần cấp Pro 1/12–31/12 (D38) | Lần cũ **không** bị thu hồi; Lan Pro liên tục tới 31/12; từ 1/12 mốc lượt AI = 1/12 |
| B5E100 | Gửi lại `PATCH` với đúng ngày đang có (D38) | 200, lần cấp như cũ; không ghi thêm dòng lịch sử |
| B5E101 | Rút ngắn `ends_at` về một ngày đã qua (D38) | 400 `validation-failed` (muốn dừng ngay thì thu hồi) |
| B5E102 | Lan `active` tháng (giao dịch m1) nâng lên năm (y1); `refunded` m1 tới **trước** `plan_changed` y1 (D39) | `refunded` cắt Pro (`revoked`); sau commit hệ thống gọi `fetchState` → nhà cung cấp trả `active`, kỳ năm → ghi đè, Lan Pro lại; `current_transaction_id` = null (kỳ đổi qua `fetchState`); `plan_changed` y1 tới sau mà không `stale` thì đặt lại mã y1, bị `stale` thì mã vẫn null tới `renewed` kế tiếp (hoàn tiền lúc đó chỉ ghi lại, D37). Bộ nối không có `fetchState` → giữ `revoked` |
| B5E103 | `refund_reversed` tới **trước** `refunded` của cùng giao dịch (D39) | `refund_reversed` chỉ ghi lại (gói đang `active`); `refunded` cắt Pro; `fetchState` sau commit → nhà cung cấp trả `active` → Pro lại |
| B5E104 | `fetchState` sau lần cắt vì hoàn tiền bị lỗi hoặc quá `BILLING_ADAPTER_TIMEOUT_MS` (D39) | Giữ `revoked`, log `billing_state_refetch_failed`; job mỗi giờ hỏi lại gói đó tới khi được, tối đa 3 ngày kể từ lúc cắt; nhà cung cấp cũng trả `revoked` → giữ |

## 16. Acceptance criteria (When → Then)

| # | When | Then |
|---|---|---|
| B5#1 | Người học mới gọi `GET /v1/me/entitlements` | `plan = free`; phiên luyện 3/ngày; hai kho AI 0; `ai.practice`, `ai.lookup` không được phép; `ads.show = false` (công tắc tắt); `trial_eligible = true` nếu email đã xác minh |
| B5#2 | Free mở phiên luyện thứ 4 trong ngày (đã trả lời câu đầu ở 3 phiên trước) | 403 `quota-exhausted` kèm `resets_at` |
| B5#3 | Free mở phiên rồi bỏ khi chưa trả lời, 5 lần | Vẫn mở được phiên (không tốn lượt) |
| B5#4 | Fake: `subscription_started` có trial 7 ngày | `plan = trial`; email bắt đầu trial trong Mailpit; `trial_history` có dòng |
| B5#5 | Đồng hồ giả tới `trial_ends_at − 2 ngày`, chạy job | Email nhắc trial, đúng một lần |
| B5#6 | Fake: `renewed` sau trial | `plan = pro`; mốc chu kỳ = lúc `renewed`; hai kho AI đủ 300/100 |
| B5#7 | Fake: `renewal_failed`, đồng hồ +3 ngày, rồi +8 ngày | +3 ngày: vẫn Pro (`grace`); +8 ngày: không còn Pro (`on_hold`) |
| B5#8 | Fake: `renewed` khi đang `on_hold` | Pro lại ngay |
| B5#9 | Fake: gửi cùng một sự kiện hai lần | Một dòng sự kiện `applied`; trạng thái không đổi lần hai |
| B5#10 | Fake: `expired` (cũ) tới sau `renewed` (mới) | `expired` thành `stale`; vẫn Pro |
| B5#11 | Fake: `cancel_scheduled`, đồng hồ qua cuối kỳ | Pro tới cuối kỳ, rồi Free |
| B5#12 | Fake: `refunded` rồi `refund_reversed` | Mất Pro, rồi có lại |
| B5#13 | Fake: `plan_change_scheduled` (năm → tháng), `plan_change_canceled` | `pending_interval` có rồi mất; Pro suốt |
| B5#14 | `entitlements:fake-ai` gọi `reserve` song song 2 lần khi còn 1 lượt | Đúng một `reserved`; một `quota-exhausted` |
| B5#15 | `reserve` rồi không xác nhận, đồng hồ +3 phút | Còn lại trở về như cũ |
| B5#16 | Đặt `ai_daily_cap = 2`; ba người dùng `reserve` | Hai lượt được, lần ba `ai-unavailable`; `GET /v1/admin/entitlements/ai-usage` trả `alert_reached = true` (D36: không có email) |
| B5#17 | Tắt `ai_enabled` | `reserve` → `ai-unavailable`; phiên luyện không AI vẫn mở được |
| B5#18 | Admin cấp "Pro tới ngày X" cho người học Free | `plan = pro` ngay; lịch sử có dòng; thu hồi → Free ngay |
| B5#19 | Editor cấp cho editor khác / cho chính mình / đặt lượt AI | 409 `grant-not-allowed` đúng lý do |
| B5#20 | Admin đặt "lượt bài AI: 0" cho Pro | `reserve` → `entitlement-required` |
| B5#21 | Lọc lịch sử `granted_by = editor`, `expiring_within_days = 7` | Chỉ các lần cấp đúng điều kiện |
| B5#22 | Hoàn lượt một câu đã trừ trong chu kỳ | Còn lại tăng 1; hoàn lần hai không đổi |
| B5#23 | Admin đổi `free_practice_sessions_per_day` thành 5 | Free mở được phiên thứ 4, 5 ngay trong ngày |
| B5#24 | Admin đổi `private_words_per_user` về mức thấp hơn số từ riêng người học đang có (dữ liệu tạo sẵn bằng SQL, R13) | Từ cũ giữ; thêm từ riêng mới bị từ chối |
| B5#25 | Bật `ads_enabled` | Free: `ads.show = true` kèm tần suất; Pro, trial: `false` |
| B5#26 | Webhook sai chữ ký | 400; không có dòng sự kiện |
| B5#27 | `GET /v1/admin/entitlements/ai-usage` bằng tài khoản editor | 403 `forbidden` |
| B5#28 | Fake: `subscription_started` có trial cho tài khoản đã có `trial_history` (D30) | `plan = free` trong thời gian trial; log `trial_reuse_detected`; trạng thái bộ nối giả cho thấy `endTrialNow` đã được gọi; sau `renewed` thì `plan = pro` |
| B5#29 | Fake: gói `active`, lùi `current_period_end` về 3 ngày trước bằng SQL, không gửi sự kiện (D31) | Vẫn Pro; lùi thêm 8 ngày → `on_hold` |
| B5#30 | Fake: `expired`, rồi `renewed` của kỳ mới (R2) | `plan = pro` lại |
| B5#31 | Admin cấp Pro cho người đang có gói fake tự gia hạn, có xác nhận (D32) | Lần cấp tạo; bộ nối giả ghi đã tắt tự gia hạn; mốc mới; đủ lượt |
| B5#32 | Editor thu hồi lần cấp có con số lượt AI (D33) | 409 `grant-not-allowed` / `ai-limits-admin-only` |
| B5#33 | Fake: `refunded` một phần cho giao dịch của kỳ đang dùng (D34) | Mất Pro ngay |
| B5#34 | `pnpm smoke:buoc-4` chạy lại sau Bước 5 (R5) | Qua (learner của nó được cấp con số phiên riêng ở đầu script) |
| B5#35 | Admin sửa `ends_at` của một lần cấp Pro đang chạy ra sau một tháng (D38) | `GET /v1/me/entitlements` thấy nguồn đó `ends_at` mới; lượt AI không đổi chu kỳ; `GET /v1/admin/entitlements/users/{id}` thấy dòng lịch sử sửa |

## 17. Kiểm thử và "Xong khi" (Chốt D26, D27)

1. **CI xanh trên mọi PR** (`ci.yml`: lint, typecheck, build, unit, kiểm migration khớp schema). **Unit** cho các hàm thuần, theo bảng ví dụ: tính gói từ nhiều
   nguồn (mục 5.4), chu kỳ theo mốc (31/01 → 28/02 → 31/03; bảng ví dụ mốc ở 5.5), ngày địa phương của phiên, đếm đã dùng và hoàn lượt (mục 7.2), luật `confirm`
   (bảng 7.1), máy trạng thái gói (bảng 9.4 **từng ô**, và bảng chuyển theo thời gian), luật thứ tự hai loại sự kiện (9.2), luật cấp tay (bảng mục 10), chuẩn hóa và
   chữ ký của bộ nối giả.
2. **`pnpm smoke:buoc-5`** qua API và worker thật trên database mới `english_learning_smoke_b5` (như `smoke:buoc-4`): các bước B5#1–B5#35, dùng
   `pnpm billing:fake-event` và `pnpm entitlements:fake-ai`; đọc Mailpit cho email. API thật **không có đồng hồ giả**: "qua thời gian" làm bằng cách lùi mốc thời gian
   bằng SQL như Bước 4 (R13). Cột cần lùi: `subscriptions.trial_ends_at`, `current_period_start/end`, `grace_ends_at`; `usage_records.reserved_at`, `expires_at`,
   `confirmed_at`, `local_date`, `system_date`; `entitlement_grants.starts_at`, `ends_at`; `entitlement_notices.due_at`. Dữ liệu lớn (ví dụ hơn 1.000 từ riêng cho B5#24)
   tạo bằng SQL thay vì gọi API (rate limit `user.write` 30 lần/phút sẽ cần hơn 30 phút). Kiểm chạy đua bằng **N request song song** (ví dụ 10, không phải 2) để giảm
   may rủi; chạy cả hai đường có và không có `fetchState` (cờ của bộ nối giả).
3. **Không có e2e backend** (D38 Bước 4): khóa và chạy đua (B5E1, B5E11, B5E73) **chỉ** được kiểm bằng smoke (request song song thật trên Postgres). Ghi ở rủi ro.
4. **Plan có task sửa `smoke:buoc-4`** (R5): learner của script đó thành Free (3 phiên/ngày) sau Bước 5, nên script cấp cho learner một con số phiên riêng ở đầu
   (qua API cấp tay bằng tài khoản admin của script); chạy lại `smoke:buoc-4` là một bước của "Xong khi" (B5#34).
5. Task cuối của plan chạy (1), (2) và `smoke:buoc-4`, ghi as-built vào `docs/deliveries/buoc-5.md`. Implement: các phiên khác, một phiên điều phối; plan có mục
   brief cho phiên điều phối.
6. **Gợi ý chia plan** (review mục 5, ước lượng 28–34 task): một plan bốn milestone, hoặc hai plan nối tiếp — **5a phần lõi** (gói, sổ lượt, cấp tay, Settings, sửa
   Practice/Learning/Content, API người học và staff, smoke phần lõi) và **5b cổng thanh toán và email** (bộ nối giả, hộp sự kiện, máy trạng thái, trial, email). Chọn
   cách chia khi viết plan.

## 18. Ảnh hưởng tới các bước sau

- **Bước 6 (AI Integration):** kiểm lại `ai_enabled` trước khi gọi provider (AR10); sổ chi phí từng lần gọi; xét thêm trần bằng tiền và đối chiếu sổ lượt với sổ chi
  phí theo `operation_id`. Chọn model phải tính chi phí mỗi lượt so với giá Pro (Sonnet tầm trung có thể ngang giá gói, theo research).
- **Bước 7 (Practice AI, Content AI):** gọi `reserve` / `confirm` / `release` cho `ai_practice`, `ai_lookup` theo hợp đồng mục 7.1 (mỗi lần một transaction ngắn;
  không gọi AI khi đang giữ khóa; một `reserve` mỗi transaction; R6); một lượt cho cả lần tạo lại; làm lại câu đã lưu không `reserve`; dịch bổ sung dùng
  `ai_practice`; báo lỗi câu AI và staff xác nhận sai → `refund`. Content kiểm `ai.lookup` ở bước AI của chuỗi tra nghĩa; Free bỏ qua bước AI.
- **Bước 8 (Identity còn lại):** xóa tài khoản xóa lần cấp, sổ lượt, gói đăng ký, thông báo của người đó (ER16); còn mở: giữ `trial_history` (mã thẻ) sau khi xóa để chặn
  trial lại hay không (đụng SR11); giữ hóa đơn cho thuế; trạng thái "đang xóa" cho B5E59.
- **Đợt giao diện:** trang gói của người học (lượt còn lại, ngày làm mới, nút lên Pro), thông báo hết lượt và mời lên Pro, quảng cáo (SDK, hỏi đồng ý, tuổi tối
  thiểu), màn admin cấp tay và lịch sử, trang cài đặt (nhóm `entitlements`, `learning`, `content`), trang "cách trừ lượt AI" (ý I12), màn lượt AI trong ngày tô
  vàng khi `alert_reached` (D36).
- **Trước khi bán thật:** chọn nhà cung cấp theo hình thức kinh doanh (cá nhân, hộ kinh doanh, công ty), **chỉ nhà cung cấp có gia hạn tự động** (D35); viết bộ nối
  (với MoMo subscription, ZaloPay Auto Debit: bộ nối có job gọi lệnh trừ tiền tới ngày và thử lại khi lỗi); trang thanh toán và quản lý gói; cấu hình store
  (Apple: thứ hạng gói tháng/năm trong nhóm để tháng → năm là nâng cấp; grace 3 hoặc 16 ngày; Google: base plan và replacement mode); luật sư (mục 19); sửa landing (⚠9);
  hóa đơn và thuế.

## 19. Rủi ro và việc còn mở

- **Pháp lý (cần luật sư trước khi bán):** Điều 42 Luật 19/2023/QH15 (chấm dứt bất kỳ lúc nào, chỉ trả phần đã dùng, "trừ trường hợp có thỏa thuận khác") so với D24
  không hoàn tiền gói năm; báo trước ≥ 7 ngày làm việc so với trial 7 ngày lịch (email lúc bắt đầu trial là phần báo trước); email báo trước mỗi kỳ gia hạn có bắt buộc
  không (`renewal_notice_days_before`, mặc định tắt theo D29); hóa đơn điện tử và thuế khi bán dịch vụ số. Luật chỉ đọc qua trang thứ ba.
- **Không có e2e backend:** khóa, chạy đua, transaction chỉ được kiểm bằng smoke; unit dùng mock không bắt được lỗi SQL.
- **Khóa chung của trần AI** tuần tự hóa mọi lần giữ lượt AI của mọi người; ổn ở quy mô pilot (AR11: 5 lời gọi cùng lúc), phải đo lại nếu người dùng tăng nhiều.
- **Trần bằng lượt lệch tiền thật:** lần gọi lại (~10%), đổi model; Bước 6 có sổ chi phí thì xét trần bằng tiền.
- **Mốc chu kỳ khi nhiều nguồn chồng nhau** (mục 5.5): mốc theo nguồn bắt đầu gần nhất (D32); khi nguồn đó hết trước nguồn cũ, chu kỳ quay về mốc của nguồn cũ và
  đếm cả lượt đã dùng (B5E81); hiếm, chấp nhận.
- **App không tắt được tự gia hạn trên store khi staff cấp Pro** (D32): `ASSUMPTION` Apple chỉ cho người dùng tự hủy, chưa kiểm; Google Play có API hủy cho developer
  (chưa kiểm). Chủ dự án 19/10/2026: **"cái này sẽ handle sau"** — xử lý khi viết bộ nối Apple/Google; tới lúc đó lần cấp vẫn tạo, `paid_renewal_action =
  not_supported`, log cho staff, và người dùng có thể vẫn bị store trừ tiền kỳ sau.
- **Hoàn tiền chủ động chỉ admin làm** (D34), bằng tay ở trang quản lý của nhà cung cấp; app không có nút hoàn tiền. Hoàn tiền (kể cả một phần) cắt Pro của kỳ đó;
  muốn đền bù mà giữ Pro thì cấp thêm.
- **Tin hoàn tiền tới sai thứ tự chỉ tự sửa khi bộ nối có `fetchState`** (D39). Bộ nối giả, Stripe, Google, Apple có (mục 9.1); MoMo, ZaloPay chưa kiểm. Bộ nối
  không có `fetchState` thì người dùng có thể mất Pro nhầm (B5E102, B5E103) tới khi bộ nối đó tự có luật (phương án (i) của D39) hoặc admin cấp tay. Lúc hỏi lại,
  người dùng mất Pro vài giây (tới 1 giờ nếu lần hỏi đầu lỗi).
- **Mã nhận diện thẻ** không phải nhà cung cấp nào cũng có (chưa kiểm từng bên); khi không có, "một trial theo thẻ" không chặn được.
- **Chỉ gói tự gia hạn (D35)** thu hẹp lựa chọn ở Việt Nam: VNPay, payOS không dùng được cho gói. MoMo subscription mở cho loại hình kinh doanh nào, hạn mức bao nhiêu
  **chưa xác minh** (research 18/10); ZaloPay Auto Debit có lúc đòi người dùng xác minh. Nếu cả hai không dùng được, người dùng Việt Nam chỉ trả bằng thẻ qua
  Paddle/Stripe hoặc qua store, không có ví hay QR.
- **Trial lại sau khi xóa tài khoản** (Bước 8, đụng SR11).
- **Thẻ hết tiền** dùng được tối đa 7 ngày trial + 7 ngày chờ Pro; chặn bởi một trial theo tài khoản và thẻ.
- **Paddle không lên lịch đổi tần suất** (chỉ đổi ngay); "năm → tháng chờ hết năm" trên Paddle phải làm ở bộ nối (suy luận `do_not_bill`, chưa kiểm).
- **Apple không có grace 7 ngày** (chỉ 3, 16, 28): khi lên store chọn số gần nhất.
- **Email thanh toán ăn vào hạn mức email ngày** (Gmail cá nhân làm SMTP chưa xác minh khả năng, HANDOFF §6).
- **Tuổi tối thiểu chưa chốt** (DB3): chặn việc bật quảng cáo và có thể ảnh hưởng chính sách store về trial, thanh toán của trẻ vị thành niên.
- **Mọi con số mặc định và khoảng cho phép là `ASSUMPTION`** (mục 13), trừ chỗ ghi Chốt; hai con số lượt AI là "tạm" (D18).
- **Sau khi Bước 5 lên, mọi tài khoản là Free** (3 phiên luyện/ngày), kể cả tài khoản của chủ dự án và tài khoản test; `admin` tự cấp Pro hoặc con số riêng khi cần (D9).

## 20. Tài liệu cần cập nhật sau khi duyệt

Một PR docs nhỏ riêng: `CLAUDE.md` (trỏ tới design Bước 5; mục "Việc phải phân tích khi tới bước tương ứng": các ý Bước 5–6 về `entitlements.grant`, `ai.settings` đã
được trả lời ở D6–D8, D33 và ⚠8) và `docs/HANDOFF_2026-10-05_BUOC_0.md` §2 (dòng Bước 5: thêm cổng thanh toán giả, quảng cáo, phiên luyện Free). Memory
`project_limits_by_subscription.md` đã xóa (19/10, thay bởi D4, D17). `docs/specs/` không sửa. Decision record cập nhật cùng PR review này (D31–D34). Landing sửa
khi chốt câu chữ gói (⚠9), không thuộc PR này.
