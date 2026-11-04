# Chuẩn bị launch — code facts cho "Free có AI nhỏ, tắt trial" (2026-11-04)

> Khảo sát read-only cho design doc sắp viết. Nguồn: worktree `launch-prep-design` @ **a6b2bd15** (merge PR #210, nhánh
> `docs/launch-prep-design`), đọc file trực tiếp, không build, không chạy test, không đổi gì. Đường dẫn tính từ gốc repo. `file:line` ở a6b2bd15.
>
> Quyết định của chủ dự án làm đề bài: gói Free có **15 câu AI + 5 lượt tra AI mỗi tháng**, "tháng" = tháng dương lịch theo IANA timezone
> của người học; hai setting mới `free_ai_practice_per_cycle`, `free_ai_lookup_per_cycle`; **tắt trial** (không mở trial mới).
> File này chỉ ghi sự thật trong code. Chỗ nào chưa kiểm được ghi `ASSUMPTION`.

## 0. Các fact đổi cách thiết kế

| # | Fact | Ở đâu |
|---|---|---|
| F1 | Free AI = 0 nằm ở **một chỗ duy nhất**: `planNumbers()` ghi cứng `ai_practice: 0, ai_lookup: 0`. Kiểu `PlanNumbers.free` đã là `Record<Pool, number>` (có sẵn ô AI), chỉ có comment "Free AI is always 0". | `apps/api/src/entitlements/plan-numbers.ts:4-7`; `apps/api/src/entitlements/rules/plan-rules.ts:7-8` |
| F2 | Cổng AI trong API chỉ là **"limit của pool > 0"**, không nơi nào hỏi tên gói: `check()`, `features` trong snapshot, `decideReserve`. Grep `plan === / plan !==` trong `apps/api/src` chỉ ra quảng cáo (`plan === 'free'`) và dashboard Pro (`plan !== 'pro'`). Nên khi limit Free > 0 thì practice gate, AI lookup và ledger tự mở. | `entitlements.service.ts:93, 147-148, 178, 242`; `usage/ledger-rules.ts:32` |
| F3 | **Nguy hiểm nếu chỉ đổi số:** không có anchor thì không có cycle, và `used` bị coi là 0. `standing()`: `used = cycle ? aiUsed(...) : 0`. Free hiện không có anchor, nên Free có limit 15 mà vẫn không có cycle thì `used` luôn 0, `decideReserve` không bao giờ trả `quota-exhausted`: **AI không giới hạn cho Free**. Snapshot cũng trả `used 0`, `resets_at null`. | `usage/usage-ledger.service.ts:177-185`; `entitlements.service.ts:134-140`; `usage/ledger-rules.ts:33-35` |
| F4 | Cycle AI hiện tính **theo UTC từ một anchor** (cùng ngày, cùng giờ UTC mỗi tháng, kẹp ngày cuối tháng), không phải tháng dương lịch, không theo timezone người học. | `apps/api/src/entitlements/rules/cycle.ts:4, 11-18, 21-29` |
| F5 | Lượt dùng được **đếm theo khoảng thời điểm** `[start, end)` trên `confirmed_at` (use) và `credited_at` (credit). **Không có period key** trong `usage_records`; `system_date` là ngày Việt Nam, chỉ cho trần hệ thống. Nên tháng dương lịch theo zone chỉ cần tính ra hai thời điểm start/end; không cần migration để đếm. | `usage/usage.queries.ts:15-22, 52-60`; `apps/api/prisma/models/entitlements.prisma:172-174, 184-185` |
| F6 | Lượt đang giữ chỗ (`reserved`, chưa hết hạn 2 phút) được cộng vào `used` **bất kể cycle nào**. | `usage/usage.queries.ts:17-19`; `entitlements.constants.ts:4` |
| F7 | Có **bốn chỗ** tự tính cycle từ `resolve().anchor` + `cycleAt`, và cả bốn phải ra cùng một kết quả: snapshot, `standing` (reserve/confirm), `refund`, dashboard Pro. `resolve()` là hàm thuần, không có timezone trong input. | `entitlements.service.ts:134, 245`; `usage/usage-ledger.service.ts:148-150, 171-174, 180-184`; `rules/plan-rules.ts:77-83` |
| F8 | `UsageLedgerService` **không inject `IdentityService`**, nên ledger không biết timezone. `EntitlementsModule` đã import `IdentityModule`, `getProfile(userId, db)` nhận được `tx`, và `checkQuota` đã có mẫu `profile?.timezone ?? 'UTC'`. | `usage/usage-ledger.service.ts:33-40`; `entitlements.module.ts:33`; `apps/api/src/identity/profile/identity.service.ts:81-84`; `entitlements.service.ts:47, 103-104` |
| F9 | Refund cần anchor. Không có anchor thì trả `refunded: false`, nên câu AI lỗi của người dùng Free hiện **không hoàn được**. | `usage/usage-ledger.service.ts:148-149`; spec `usage/usage-ledger.service.spec.ts:271-274` |
| F10 | Đổi gói giữa tháng (theo cách đếm hiện tại): Pro → Free giữa tháng thì cửa sổ tháng dương lịch sẽ **đếm cả lượt đã dùng lúc còn Pro** trong tháng đó (vd dùng 200 lượt Pro, về Free ngày 20 thì Free 15 đã hết tới đầu tháng sau). Free → Pro: cycle Pro bắt đầu ở anchor, lượt Free trước đó không bị tính. Đây là suy ra từ query, chưa có test nào cho trường hợp này. | `usage/usage.queries.ts:52-56`; `rules/plan-rules.ts:97-107, 133` |
| F11 | Một `limits` grant có AI > 0 trên tài khoản Free hiện **neo cycle vào `startsAt` của grant** (B5E32). Grant chỉ có `practice_sessions_per_day` hoặc AI = 0 thì không neo. Khi Free có số AI riêng, design phải chọn: Free + limits grant theo anchor của grant hay theo tháng dương lịch. | `rules/plan-rules.ts:73-75, 109-113`; spec `rules/plan-rules.spec.ts:230-242` |
| F12 | Trần chung `ai_daily_cap` (mặc định 1000/ngày Việt Nam) đếm **mọi** lượt AI, không lọc theo gói, nên lượt của Free cũng ăn vào trần. Chạm trần → `ai-unavailable` kèm số giây tới nửa đêm Việt Nam. | `apps/api/src/settings/settings.definitions.ts:75`; `usage/usage.queries.ts:94-103`; `usage/ledger-rules.ts:40-46` |
| F13 | Trial **chỉ** bắt đầu từ event `subscription_started` có `trial_ends_at` của provider. Không có endpoint checkout. Adapter duy nhất là fake (chỉ đăng ký khi `BILLING_FAKE_ENABLED=true`). Đã có sẵn đường "trial bị từ chối" (D30): `trialAllowed = false` → `trial_denied`, user là Free tới lần trả tiền đầu, và gọi `endTrialNow`. | `billing/subscription-machine.ts:46-65, 290-293`; `billing/fake/fake-billing.adapter.ts:23, 38-39`; `billing/event-applier.service.ts:157-169, 208, 75-77` |
| F14 | Web học viên **chạy theo dữ liệu**: mở/khóa AI theo `features[...].allowed` và `pools`. Chỉ phần chữ nói "cần Pro" và một số chỗ hiển thị theo tên gói (chip Dùng thử, tiêu đề trang gói) là cố định. `AppConfig.plans.free` chưa có số AI. | `apps/web/src/features/learner/add-word/AiLookupPanel.tsx:44-49`; `apps/web/src/features/learner/practice/CustomizeDialog.tsx:82`; `apps/api/src/settings/app-config.view.ts:11, 28` |

## 1. Plan resolve và cycle (`apps/api/src/entitlements/rules/plan-rules.ts`, `cycle.ts`, `plan-numbers.ts`)

**Cách resolve gói** (`resolve()`, `plan-rules.ts:77-135`; hàm thuần, chạy lại mỗi lần gọi, D28):
- Subscription: tính `effectiveStatus` (chuyển trạng thái theo thời gian, `plan-rules.ts:50-67`). `active` hoặc `grace` là Pro; `trialing` và
  `!trialDenied` là Trial (`plan-rules.ts:90-96`). Nếu có `quotaAnchorAt` thì đưa vào `anchors`; subscription Pro thì vào `proSources` (`plan-rules.ts:97-99`).
- Grant `plan` đang hiệu lực: Pro, anchor = `startsAt` (`plan-rules.ts:102-107`). Hiệu lực = chưa revoke, `startsAt <= now < endsAt` (`plan-rules.ts:69-71`).
- Grant `limits`: chỉ neo anchor khi **không** có Pro và không có Trial, và grant có AI > 0 (`plan-rules.ts:112-113`, `hasAiLimit` ở `:73-75`).
- Chọn gói: `pro ? 'pro' : trial ? 'trial' : 'free'` (`plan-rules.ts:115`). Limits: Pro dùng `numbers.pro`; Trial dùng số phiên của Pro + `numbers.trial`;
  Free dùng `numbers.free` (`plan-rules.ts:116-120`).
- Limits grant ghi đè từng key có mặt, grant tạo sau thắng (D19); value `0` cũng ghi đè vì chỉ `undefined` mới bị bỏ qua (`plan-rules.ts:125-131`).
  Hệ quả: admin có thể tắt AI của riêng một người Free bằng limits grant `ai_*: 0`. Grant có key `ai_*` (kể cả 0) chỉ `admin` được tạo
  (`grants/grant-rules.ts:17-19, 28`); trần của số trong grant lấy theo bound của Pro (`grants/grants.schemas.ts:14-16`).
- Anchor cuối cùng = anchor **mới nhất** trong `anchors`, không có thì `null` (`plan-rules.ts:133`).

**Kiểu:** `PlanNumbers = { free: Record<Pool, number>; pro: Record<Pool, number>; trial: Record<AiPool, number> }` (`plan-rules.ts:7-8`).
`Resolved = { plan, anchor: Date | null, limits, limitFrom, proSources }` (`plan-rules.ts:37-43`). `planNumbers(settings)` dựng nó từ Settings, Free AI ghi
cứng 0 (`plan-numbers.ts:4-13`); `EntitlementsService` re-export nó (`entitlements.service.ts:23`).

**Tính cycle từ anchor** (`cycle.ts`):
- `addMonthsClamped(anchor, k)`: cùng ngày và giờ **UTC**, sang `k` tháng, ngày kẹp về ngày cuối tháng (`cycle.ts:11-18`).
- `cycleAt(anchor, now)`: `[addMonthsClamped(k), addMonthsClamped(k+1))` chứa `now`; `now < anchor` thì `k = 0` (`cycle.ts:21-29`).
- `aiDay(now)` / `nextAiDayStart(now)`: ngày của trần hệ thống, zone `AI_DAY_ZONE = 'Asia/Ho_Chi_Minh'` (`cycle.ts:32-39`; `entitlements.constants.ts:7`).
- Test: `apps/api/src/entitlements/rules/cycle.spec.ts:7-20` (D13, anchor 31/01 không trôi).

**Không có anchor:** `snapshot` cho `cycle = null` → `used 0`, `resets_at null` (`entitlements.service.ts:134-140`); `standing` cho `used 0`,
`cycleEnd null` (`usage-ledger.service.ts:182-184`); `refund` trả `false` (`usage-ledger.service.ts:148-149`); dashboard Pro bỏ qua user đó (`entitlements.service.ts:248-249`).
Nay vô hại chỉ vì Free limit = 0. Xem F3.

## 2. Ledger lượt AI

**Bảng** `usage_records` (`apps/api/prisma/models/entitlements.prisma:162-187`): `pool` (`practice_sessions | ai_practice | ai_lookup`), `operation_id`, `kind`
(`use | credit`), `status` (`reserved | confirmed | released`), `release_reason`, `local_date` (ngày của người học, chỉ cho phiên luyện), `system_date`
(ngày Việt Nam, cho pool AI), `reserved_at / expires_at / confirmed_at / released_at / credited_at`, `note` (id báo lỗi của refund).
Index `(user_id, pool, confirmed_at)` và `(pool, system_date)` (`:184-185`). CHECK và unique một phần ở migration:
`apps/api/prisma/migrations/20261019094400_entitlements/migration.sql:222-226` (giá trị enum), `:234` (một use còn sống cho mỗi operation),
`:236` (một credit cho mỗi operation), `:238`. Không có bảng counter (D28) và không có cột period.

**Các bước** (`apps/api/src/entitlements/usage/usage-ledger.service.ts`; mỗi lời gọi là một transaction ngắn riêng):
- `reserve`: `lockPool` → các row của operation `FOR UPDATE` → `standing` → `decideReserve` → nếu qua thì `lockAiDaily` → `capUsed` → `decideCap`
  → INSERT `reserved` với `system_date = aiDay(now)`, hết hạn sau 120 s (`:42-79`; khóa `entitlements.locks.ts:20-27`; TTL `entitlements.constants.ts:4`).
- `decideReserve`: AI tắt hoặc cap = 0 → `ai-unavailable`; `limit === 0` → `plan-required`; `used >= limit` → `quota-exhausted`, `resets_at = cycleEnd`
  (`usage/ledger-rules.ts:17-37`). `decideCap`: `cap === null` hoặc `capUsed < cap` thì cho qua (`ledger-rules.ts:40-46`).
- `confirm` / late-confirm dùng `remainingWithoutRow = limit - used` (`usage-ledger.service.ts:81-117`; `ledger-rules.ts:49-60`). `release` (`:120-134`).
  Job hằng giờ đánh `released` cho reservation hết hạn (`usage/usage-expire.job.ts`, register `entitlements-usage-expire`).
- `refund`: mỗi operation một credit; chỉ khi `confirmed - credits > 0` trong **cycle hiện tại**; cần anchor (`usage-ledger.service.ts:140-160`).
  Người gọi: `apps/api/src/practice/reports/reports.service.ts:247-254` (chỉ pool `ai_practice`).

**Đếm** (`apps/api/src/entitlements/usage/usage.queries.ts`):
- `aiUsed = confirmed trong cycle + reserved chưa hết hạn (mọi cycle) − credit trong cycle`, không âm (`:15-22`); `confirmedInCycle` lọc `confirmed_at`
  (`:52-56`); `creditsInCycle` lọc `credited_at` (`:58-60`); `aiUsedMany` làm như vậy cho nhiều user trong một query, dùng cho dashboard (`:28-50`).
- `capUsed(day)`: cả hai pool AI theo `system_date`, không lọc user hay gói (`:94-103`). `aiDays` (dashboard) cũng không lọc gói (`:70-84`).

**Trần hệ thống:** `ai_daily_cap` mặc định 1000, `null` = không trần, 0 = tắt AI; `ai_cap_alert_percent` mặc định 75, chỉ là màu cảnh báo cho admin
(`settings.definitions.ts:34-37, 75, 121-122`; `entitlements/api/ai-usage.ts:32-35`). Snapshot báo `cap_reached` (`entitlements.service.ts:176`). Riêng
gateway AI có thêm trần lời gọi provider `ai.daily_provider_calls_cap` (mặc định 3000), kiểm ở readiness (`settings.definitions.ts:80`;
`apps/api/src/ai/runner/readiness.service.ts:35`).

## 3. Settings: thêm một key từ đầu tới cuối

**Hiện có** (`apps/api/src/settings/settings.definitions.ts`): kiểu `entitlements` (`:26-41`), mặc định `pro_ai_practice_per_cycle 300`,
`pro_ai_lookup_per_cycle 100`, `trial_ai_practice_per_cycle 300`, `trial_ai_lookup_per_cycle 100`, `trial_reminder_days_before 3` (`:72-77`). Bound
`pro_*/trial_* {min 0, max 5000}`, `trial_reminder_days_before {3, 6}` (`:114-119`). Không có setting nào cho độ dài trial hay để bật/tắt trial.

**Thêm `free_ai_*` cần sửa ở:**
1. Kiểu `AppSettings.entitlements` (`settings.definitions.ts:26-41`).
2. `SETTINGS_DEFAULTS.entitlements` (`:72-77`).
3. `SETTINGS_BOUNDS.entitlements` (`:111-126`). Ràng buộc giữa nhiều field (kiểu "Free ≤ Pro") thì thêm vào `crossFieldViolations` (`:303-312`);
   mẫu đang có: `pro_practice_sessions_per_day ≥ free_practice_sessions_per_day` (`:309-310`, bound `at_least` ở `:113`).
4. `settingsValuesPatchSchema.entitlements` (`:186-203`).
5. `FIELDS` (API key ↔ field đã lưu; thứ tự này là thứ tự của `toApiValues`, của lịch sử và của `valuesAt`) (`:227-277`).
- Không cần migration dữ liệu: `withDefaults` lấy mặc định cho key chưa lưu, và cho cả value đã lưu mà bound hiện tại từ chối (`:338-347`);
  `SettingsService.current()` luôn đi qua nó (`settings.service.ts:44-47`).
- `GET /v1/admin/settings` trả `values`, `defaults`, `bounds` (`admin-settings.controller.ts:22-26`); `PUT` dùng schema ở trên (`:28-35`).
- Màn học viên: `GET /v1/me/app-config` → `appConfigView` (`me-app-config.controller.ts:10-17`). `plans.free` hiện chỉ có `practice_sessions_per_day`;
  `trial` và `pro` có số AI (`app-config.view.ts:10-14, 27-35`). Muốn trang gói hiện "15 câu AI / 5 lượt tra" thì phải thêm vào đây và vào kiểu web
  `AppConfig` (`apps/web/src/app-shell/queries.ts:36-40`).
- `planNumbers()` đọc field mới (`plan-numbers.ts:7`).

**Admin** (`apps/admin`): layout `SETTINGS_LAYOUT.entitlements` có 16 key; comment ghi "The 49 keys" (`apps/admin/src/features/settings/settings-api.ts:35, 62-79`).
Nhãn ở `apps/admin/messages/vi.json:2053-2070` (`settings.fields.entitlements.*`), `en.json` cùng dòng (vd `en.json:2058`). Có `notes`, `zeroMeaning`, `cross`,
`emptyMeaning` cho gợi ý dưới ô nhập (`vi.json:1996-2012`; dùng ở `SettingsField.tsx:48-52`). Admin có test bắt `vi`/`en` phải cùng bộ key
(`apps/admin/src/i18n/parity.test.ts`). Nhãn hiện có chữ "Dùng thử": `pro_practice_sessions_per_day` "…gói Pro và Dùng thử", `trial_*`
(`apps/admin/messages/vi.json:2055, 2058-2061`).

**Test ghim danh sách setting** (sẽ đỏ khi thêm key):
- `apps/api/src/settings/settings.definitions.spec.ts:6-12` (`ENTITLEMENT_DEFAULTS_API`), `:74-79` (mảng 16 value theo thứ tự), `:118-125` (thứ tự key),
  `:127-145` (biên min/max của từng key), `:147-156` (chỉ hai key được `null`).
- `apps/api/src/settings/app-config.view.spec.ts:7-17` (nếu `plans.free` có thêm số AI).
- `apps/admin/src/features/settings/settings-api.test.ts:15-18` (49 key; số key mỗi tab `[5, 6, 9, 16, 2, 10, 1]`).
- Fixture e2e mock của admin: `apps/admin/e2e/support/settings.ts:16, 44` (value và bound).

## 4. Cổng AI: ở đâu, điều kiện chính xác

| Tính năng | Kiểm ở đâu | Điều kiện | Tốn lượt? |
|---|---|---|---|
| Mở phiên có kiểu câu AI | `AiSessionPlanner.gate` (`apps/api/src/practice/ai/ai-session-planner.service.ts:40-49`), gọi từ `sessions.service.ts:109` | Chỉ khi có kiểu AI (`isAiType`: `cloze` nguồn `ai`, `meaning_in_sentence`, `mcq_sentence`; `practice.types.ts:18-20`). `snapshot.features['ai.practice'].allowed` (= limit > 0) phải true, nếu không thì 403 `entitlement-required`; AI tắt hoặc chạm trần → 503; operation chưa sẵn sàng → 503 | Không (chỉ đọc) |
| Đủ lượt cho cả phiên | `AiSessionPlanner.plan` (`:55-95`) | `pool.remaining < needed` → 403 `ai-quota-insufficient` kèm `remaining`, `needed`, `resets_at`; `needed = planned − số từ đã đánh dấu có sẵn câu AI chưa gặp` (`ai-plan.ts:18-26`) | — |
| `cloze` nguồn `own` (câu học viên đã lưu) | `isAiType` false (`practice.types.ts:18-20`); planner comment đợt cải thiện A C3 (`ai-session-planner.service.ts:36-38`) | Mở cho mọi gói | Không |
| `availableTypes` | `apps/api/src/practice/questions/question-types.ts:23-35` | Chỉ điều kiện dữ liệu (có nghĩa tiếng Việt, đủ distractor, không phải function word, private word không bị từ chối), **không** điều kiện gói | — |
| Sinh câu AI | `AiQuestionGenerator` (`ai-question-generator.service.ts:109-149`) | `reserve` → gọi AI → ghi câu → `confirm`; lỗi thì `release` (`:123, 131, 144`). Bị từ chối `plan-required` / `quota-exhausted` / `ai-unavailable` thì dừng AI của phiên (`:110-114, 171`) | 1 lượt `ai_practice` cho mỗi câu, tính lúc **ghi** câu chứ không phải lúc học viên thấy |
| Câu AI làm sẵn trước | `sessions.service.ts:220-227`, setting `practice.ai_prefetch_count` mặc định 2 (`settings.definitions.ts:70`) | Làm trước tối đa K câu cho các từ đã đánh dấu | Có, lúc ghi (xem dòng trên); câu chưa hỏi được dùng lại ở phiên sau (`findUnseen`, `ai-session-planner.service.ts:70-72`) |
| `check_private_word` | `ai-question-generator.service.ts:83-95` | Mỗi nội dung private word kiểm một lần, kết quả lưu lại | **Không**, không giữ lượt (B7E23, `:83`) |
| `POST /v1/lookup/ai` | `apps/api/src/content/lookup/ai-lookup.controller.ts:21-37` → `AiLookupService.lookup` (`ai-lookup.service.ts:38-76`) | `entitlements.check(userId, 'ai.lookup')` (= limit `ai_lookup` > 0) → 403 `entitlement-required` (`:40-41`); readiness → 503; `reserve` bị từ chối → `refusalProblem` (`:51-52`); chỉ `confirm` khi kết quả hợp lệ (`:76`) | 1 lượt `ai_lookup` |
| `translate_sentence` | Chỉ có trong module AI (operation, prompt, adapter) và CLI `pnpm ai:fake-call` (`apps/api/src/cli/ai-fake-call-args.ts:8, 100`). Các chỗ gọi `ai.run(` ngoài module AI: `ai-lookup.service.ts:56`, `ai-question-generator.service.ts:89, 158, 162`, CLI | Không có endpoint học viên nào gọi | Không đi qua ledger |

Map lỗi sang HTTP: `plan-required` → 403 `entitlement-required`, `quota-exhausted` → 403 kèm `resets_at`, `ai-unavailable` → 503 (`entitlements/refusal.ts:4-22`).

## 5. Timezone

- Lưu ở `users.timezone`, `String` NOT NULL (`apps/api/prisma/models/identity.prisma:7`). Đặt lúc đăng ký (email `auth.service.ts:48-49, 71`; Google
  `google-auth.service.ts:244-246, 266`), đổi được qua `PATCH /v1/me` (`identity/profile/identity.service.ts:156-172`). `canonicalTimeZone` chỉ nhận tên
  IANA (bỏ offset như `+07:00`), `normalizeStoredTimeZone` cho dữ liệu cũ (`identity/profile/timezone.ts:16-33`).
- Hệ quả cho tháng dương lịch: học viên **đổi timezone giữa tháng** làm cửa sổ `[start, end)` dịch tới khoảng một ngày, vì lượt AI đếm theo thời điểm
  (F5) chứ không theo khóa tháng đã lưu.
- Phiên luyện mỗi ngày của Free làm khác: ngày lưu lúc ghi câu trả lời đầu (`local_date = localDate(profile.timezone, now)`,
  `apps/api/src/practice/answers/answers.service.ts:136-143`), đếm theo ngày đã lưu (`usage.queries.ts:63-67`), `resets_at = nextLocalMidnight(zone, now)`
  (`entitlements.service.ts:103-111, 141-143`). Không có profile thì dùng `'UTC'` (`entitlements.service.ts:47`).
- Helper có sẵn (`apps/api/src/common/time/local-date.ts`): `localDate(zone, at)` → `YYYY-MM-DD` (`:32-35`), `zonedMidnight(zone, date)` → thời điểm
  UTC của 00:00 ngày đó, đã xử lý DST (`:49-55`), `nextLocalMidnight` (`:58-60`), `dateValue` / `dateString` / `addDays` / `daysBetween` (`:69-85`);
  `dayRange` cho báo cáo (`day-range.ts:11-20`). **Chưa có helper tháng**: grep `monthStart|startOfMonth|addMonths|firstOfMonth` chỉ ra `cycle.ts`
  (UTC, theo anchor). Đầu tháng theo zone = `zonedMidnight(zone, localDate(zone, now).slice(0, 7) + '-01')`; đầu tháng sau cần viết thêm phép cộng tháng trên chuỗi ngày.

## 6. Web học viên (`apps/web`)

- **Kiểu:** `Entitlements` (`plan`, `sources`, `pools`, `features`, `ai_available`, `trial_eligible`) ở `apps/web/src/app-shell/queries.ts:11-27`;
  `AppConfig.plans` ở `:36-40` (`free` chỉ có `practice_sessions_per_day`; `trial` có số AI nhưng không chỗ nào trong `src` dùng; `trial_eligible`
  chỉ có trong kiểu).
- **Trang gói** `/app/plans` (`apps/web/src/features/learner/plans/PlansPage.tsx`): thẻ Free có dòng `freeList.ai` với `included: false` (`:71-76`); tiêu đề
  và dòng phụ cho Trial (`:47, 53`); thẻ Pro lấy số từ `plans.pro` (`:89-95`). Bảng so sánh ghi cứng `'—'` ở ô AI của Free (`CompareTable.tsx:13-14`).
  Chữ: `App.plans.freeList.ai` "Câu AI và tra bằng AI: cần gói Pro" (`apps/web/messages/vi.json:1523`; en "AI questions and AI lookup: Pro only",
  `en.json:1523`), `proLine` (`vi.json:1516`), `proList` (`:1525-1530`), `footnote` nói về trần chung (`:1531`), `titleTrial` / `trialUntil` (`:1496, 1500`),
  `compareTable.ai` / `.lookup` (`:1540-1541`).
- **Mức dùng** (Cài đặt → "Gói và mức sử dụng", `apps/web/src/features/learner/settings/UsageSection.tsx`): `limit === 0` thì hiện chip `needsPro`
  "Cần gói Pro" (`:48-56`; `vi.json:465`). Ngược lại hiện `còn X/Y`, và nếu có `resets_at` thì hiện dòng hồi lượt: hôm nay/mai theo giờ, xa hơn theo ngày
  (`:57-66`; `refill.ts:10-13`, tính theo zone của học viên). Chữ `aiPracticeRefill`, `aiLookupRefill`, `…Time` (`vi.json:467-470`). Free hiện có `resets_at null`
  (F3) nên không hiện dòng hồi lượt.
- **Công tắc "Kiểu câu có AI"** (`apps/web/src/features/learner/practice/AiTypesToggle.tsx:70-108`): `allowed = features['ai.practice'].allowed`
  (`CustomizeDialog.tsx:82`). Khi allowed, nhãn **vẫn gắn chip "Pro"** (`AiTypesToggle.tsx:77-81`); khi khóa, `Switch` hiện chip Pro và bấm vào thì hiện
  `LockedFeature` (`apps/web/src/app-ui/Switch.tsx:23-46`; `Locked.tsx:19-30`; `App.ui.lockedLine` "Dành cho gói Pro. Gói Pro chưa mở bán.", `vi.json:341`).
  Dòng lượt cần cho phiên: `needed = ceil(count × số kiểu AI / số kiểu)` so với `remaining` (`CustomizeDialog.tsx:112-115`; `vi.json:1224`).
- **Nút "Tra bằng AI"** (`apps/web/src/features/learner/add-word/AiLookupPanel.tsx`): `allowed = features['ai.lookup'].allowed ?? true` (`:44`). Bị khóa
  thì nút gắn khóa + chip Pro, bấm thì hiện `LockedFeature` và không gửi gì (`:49, 86-92, 113`); 403 `entitlement-required` cũng ra dòng đó (`:58-60`).
  Chip "Dùng thử" chỉ khi `plan === 'trial'` (`:97-99`; `vi.json:958`). Dòng `còn N lượt tra AI` khi `pool.limit > 0` (`:95-101`).
- **Landing:** bảng Free/Pro, hai dòng AI (`proP2`, `proP3`) có Free = Không (`apps/web/src/components/landing/Plans.tsx:34-42, 78-80`); câu trial dưới bảng
  (`Plans.tsx:96-98`): `Landing.plans.trial` "Dùng thử 7 ngày, cần thẻ thanh toán. Hủy trước hạn không mất phí." (`vi.json:230`). Trong `en.json` câu này
  cũng là tiếng Việt (`en.json:230`). FAQ `a2` liệt kê gói Miễn phí không có AI (`vi.json:240`). Web có test bắt `vi`/`en` cùng bộ key
  (`apps/web/src/i18n/messages.test.ts:33-36`).
- **Chỗ khác có chữ trial:** chip gói ở shell `App…plan.trial` (`vi.json:313`), loại giao dịch "Dùng thử" (`vi.json:551, 578, 597`), nhãn gói ở phiên luyện
  (`vi.json:1125`), comment "Trial and Pro" ở `practice-api.ts:13`.

## 7. Tắt trial

**Trial bắt đầu ở đâu:**
- Chỉ từ `subscription_started` có `trialEndsAt !== null` (`billing/billing.types.ts:44-49`). `started()` đặt `status = 'trialing'`,
  `trialDenied = !ctx.trialAllowed`, `quotaAnchorAt = occurredAt` (`billing/subscription-machine.ts:46-65`). `startsTrial()` chỉ đúng với row mới hoặc
  row `expired`/`revoked` được kích lại (`:290-293`).
- Applier: nếu `startsTrial` thì ghi `trial_history` (unique theo user, và theo payment fingerprint cho mỗi provider); ghi không được thì
  `trialAllowed = false` → `trial_denied`, log `trial_reuse_detected` (`billing/event-applier.service.ts:157-166`; `prisma/models/entitlements.prisma:119-127`;
  migration `:232`). Sau commit, trial bị từ chối thì gọi `adapter.endTrialNow` (`event-applier.service.ts:75-77, 208`). Trial được nhận thì ghi notice
  `trial_started` (`:191-201`) và một giao dịch loại `trial` (`:187-188`; `billing/transactions.repository.ts:57`).
- `trialing` → `renewed` thì thành `active` và đặt lại anchor = đầu kỳ (`subscription-machine.ts:73-91, 136`).
- Gói Trial: `trialing && !trialDenied` (`plan-rules.ts:93`); limits = số phiên Pro + `trial_ai_*` (`:118-119`). Trial bị từ chối được tính là Free, không có anchor
  (`plan-rules.spec.ts:154-160`).

**Email nhắc:** planner tìm `trialing`, `trialDenied = false`, `trialEndsAt` trong `trial_reminder_days_before` ngày tới (`notices/notice-planner.service.ts:22-29`);
sender bỏ qua (`skipped`) email trial của trial bị từ chối (`notice-sender.service.ts:79-80`); nội dung `trial_started`, `trial_reminder`
(`notices/entitlement-mail.ts:21-38`). CHECK của kind: `migration.sql:227`.

**`trial_eligible`:** `email_verified && !trialUsed` (`entitlements.service.ts:181`; `sources.repository.ts:83-85`). Web không dùng ngoài khai báo kiểu (F14).

**Không có đường nào để học viên tự bắt đầu trial trong app:** các route của Entitlements chỉ gồm `me/entitlements` GET, `me/subscriptions/:id/cancel`, webhook
`billing/webhooks/:provider`, grant của admin, transactions (grep `@Controller|@Post`). Adapter duy nhất là `FakeBillingAdapter`, chỉ đăng ký khi
`BILLING_FAKE_ENABLED=true` (`billing/fake/fake-billing.adapter.ts:18-20, 23, 38-39`; `billing/billing-adapter.ts:34-39`).

**Các đường đã có để chặn trial mới mà không gỡ logic** (sự thật về cơ chế; chọn cái nào là việc của design):
- Đường D30 sẵn có: cho `trialAllowed = false` vô điều kiện (vd theo một setting mới), chặn ngay trước `applyEvent` (`event-applier.service.ts:157-169`).
  Kết quả đã có test: row `trialing|trial_denied`, gói Free, gọi `endTrialNow`, email trial bị bỏ qua (`scripts/smoke-buoc-5.mjs:451-463`). Lưu ý: hiện
  đường này **vẫn ghi `trial_history`** trước khi quyết định (`:160-165`), nên user bị chặn vẫn bị tính là "đã dùng trial".
- `trial_eligible` phải thành `false` khi trial tắt, nếu client nào còn đọc nó (`entitlements.service.ts:181`).
- Dữ liệu và cấu hình đang bắt đầu trial: `apps/api/scripts/learner-test-setup.mjs:346-362` (`--plan trial`), `smoke-buoc-5.mjs:353-378, 451-463, 659-661`,
  `smoke-buoc-8.mjs:589-600`.
- `ASSUMPTION`: phía provider thật (chưa có adapter) có thể cấu hình sản phẩm không có trial; chưa kiểm vì chưa có provider thật.

## 8. Admin

- **Học viên cụ thể:** API `GET /v1/admin/entitlements/users/:user_id` trả snapshot (pools, features, sources) + grants, quyền `entitlements.grant`
  (`apps/api/src/entitlements/api/admin-entitlements.controller.ts:23-29`). **Không màn admin nào gọi nó**: grep `entitlements/users` trong
  `apps/admin/src` và `apps/admin/e2e` không ra gì (đối chứng: grep `entitlements/grants` ra `entitlements-api.ts:25, 77`). Chi tiết user
  (`users-api.ts:65`) không có gói hay mức dùng AI. Dialog cấp gói có ô `ai_practice_per_cycle`, `ai_lookup_per_cycle` (tối đa 5000)
  (`apps/admin/src/features/entitlements/GrantDialog.tsx:36-41`).
- **Dashboard AI:** `ai-usage/days` gồm lượt theo ngày, số người học, ngày chạm trần, refund, đếm **mọi gói** (`entitlements.service.ts:203-222`;
  `usage.queries.ts:70-90`). `ai-usage/pro` chỉ tính người `plan === 'pro'` (`entitlements.service.ts:230-256`, lọc ở `:242`; ứng viên
  `sources.repository.ts:72-80`); thẻ admin ghi "Người dùng gói Pro…" (`apps/admin/src/features/dashboard/DashboardPage.tsx:395-413`; chữ ở
  `apps/admin/messages/vi.json`, `dashboard.usage.pro.*`). Free có AI thì vẫn vào tổng theo ngày nhưng không có phân bố theo hạn mức nào.
  `ai-usage` (ngày hôm nay, `settings.manage`) đếm cả hệ thống (`admin-entitlements.controller.ts:53-57`).
- Grep `plan|free|'pro'` trong `apps/api/src/ai/reports/*.ts` và `apps/api/src/practice/quality/*.ts`: không có điều kiện gói nào (chỉ có một comment
  "plan choice" ở `reports.service.ts:21`).

## 9. Test đang giả định Free AI = 0 (sẽ đỏ hoặc phải đổi)

**API unit** (settings mock lấy từ `SETTINGS_DEFAULTS`, vd `entitlements.service.spec.ts:51`, nên đổi mặc định là đỏ):
- `apps/api/src/entitlements/rules/plan-rules.spec.ts:8-12` (`NUMBERS.free` AI 0), `:133-140` (B5#1), `:154-160` (trial bị từ chối = Free, AI 0),
  `:175-182` (Free, anchor null), `:212-221` (limits grant, `ai_practice: 0` từ plan), `:230-237` (B5E32 anchor = grant), `:239-242` (không anchor),
  `:251-258` (B5E84 AI 0, anchor null), `:319-324` (grant hết → Free, anchor null, AI 0).
- `apps/api/src/entitlements/entitlements.service.spec.ts:74-91` (B5#1: snapshot Free AI 0/0, `resets_at null`, hai feature `plan-required`), `:196-200`,
  `:203-207` (B5#20 dòng đầu: user mới → `plan-required`).
- `apps/api/src/entitlements/usage/usage-ledger.service.spec.ts:127` (`{ subscriptions: [] }` → `plan-required`), `:271-274` (không anchor → `refunded false`).
- `apps/api/src/settings/settings.definitions.spec.ts` và `app-config.view.spec.ts` (mục 3).
- Không tự đỏ vì mock sẵn "không được phép", nhưng đang mô tả "Free = không AI": `practice/ai/ai-session-planner.service.spec.ts:62-68` (B7E1),
  `content/lookup/ai-lookup.service.spec.ts:62-65`, `practice/sessions/sessions.service.spec.ts:263, 293`.
- Vẫn đúng (là luật "limit 0 → plan-required", không phải luật về Free): `usage/ledger-rules.spec.ts:41-42`, `practice/ai/ai-question-generator.service.spec.ts:143`.

**Smoke** (chạy với API thật nên sẽ đỏ):
- `apps/api/scripts/smoke-buoc-5.mjs:236-240` (user mới: AI pools 0, không feature AI, `trial_eligible true`).
- `apps/api/scripts/smoke-buoc-7.mjs:879-885` (Free: cloze AI, `meaning_in_sentence`, AI lookup → 403 `entitlement-required`, không có row usage).
- Trial: `smoke-buoc-5.mjs:353-378, 451-463, 659-661`; `smoke-buoc-8.mjs:589-600`.

**Web/admin** (fixture tự viết "Free = AI 0", không tự đỏ; chữ đổi thì đỏ):
- `apps/web/src/features/learner/settings/settings.test.tsx:74-79` ("Free: hai dòng AI ghi Cần gói Pro, không có dòng hồi lượt").
- `apps/web/src/features/learner/practice/ai-toggle.test.tsx:29-50` (fixture), `:77-83` (K/70b), `:147-158` (403 → về Free, ghim chữ `lockedLine`).
- `apps/web/src/features/learner/add-word/ai-lookup.test.tsx:25-33` (fixture), `:70-76` (K/85b), `:169-173` (E24, user Pro nhận 403; ghim chữ `lockedLine`).
- `apps/web/e2e/support/fixtures.ts:17-23` (Free pool 0, `plan-required`), `apps/web/e2e/app/m5b.spec.ts:80-93` (Free thấy dòng khóa; Trial thấy chip).
- `apps/web/src/components/landing/sections.test.tsx:12-21` (bảng: hai dòng AI Free = Không), `:38-41` (câu trial bị ghim nguyên văn).
- `apps/web/src/app-ui/ui-kit.test.tsx:65` (chữ `lockedLine`).
- `apps/admin/src/features/settings/settings-api.test.ts:15-18`; `apps/admin/e2e/support/settings.ts:16, 44`.

## 10. ASSUMPTION và chỗ chưa kiểm

- Không chạy test, build hay smoke nào; mọi chỗ "sẽ đỏ" ở mục 9 là suy ra từ việc đọc code.
- `ASSUMPTION`: production chưa có row `trialing` hay row usage thật (theo `CLAUDE.md`, chưa deploy); chưa đọc DB nào.
- `ASSUMPTION`: provider thanh toán thật có thể tắt trial ở phía nó; chưa có adapter thật để kiểm (mục 7).
- Chưa đọc lý do trong design Bước 5 cho việc cycle theo UTC từ anchor (§5.5, D13 được dẫn trong comment `cycle.ts:4`) và cho `limits` grant neo anchor (§5.5).
- Chưa đọc `apps/admin/e2e/settings.spec.ts` và `entitlements.spec.ts` đầy đủ: grep `trial` trong hai file không ra gì, nhưng chưa kiểm có assert số key hay không.
- Chưa kiểm chữ en của landing: `en.json:230` là câu tiếng Việt, chưa rõ landing chỉ có tiếng Việt là cố ý hay không.
