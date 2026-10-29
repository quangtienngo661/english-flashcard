# Review độc lập Bước 5 — Entitlements (29/10/2026)

Phạm vi: Bước 5 (gói Free/Trial/Pro, phiên luyện Free, sổ lượt AI, trần `ai_daily_cap` và công tắc, cấp tay của staff, cổng thanh toán với
bộ nối giả, email trial/gia hạn, cài đặt quảng cáo), bảng `billing_transactions` (M4b của đợt giao diện người học) và "Hủy gói" của Bước 8 ở mức
sổ tiền/lượt. Reviewer chỉ đọc code và tài liệu trên nhánh `docs/review-buoc-1-8` (cắt từ `origin/dev` @ `867d385`), không sửa code, không chạy
migration, không đụng DB. **Không chạy được unit test** trong worktree này: không có `node_modules` và `src/generated` (`ls apps/api/node_modules
apps/api/src/generated` → "No such file or directory"); cài dependency nằm ngoài phạm vi read-only. Bằng chứng test chỉ là CI của từng PR (đã kiểm
bằng `gh`, mục a).

Nguồn đã đọc: design `docs/superpowers/specs/2026-10-19-buoc-5-entitlements-design.md`, decisions (D7, D32), as-built `docs/deliveries/buoc-5.md`,
`docs/deliveries/buoc-5-smoke-output.txt`, `docs/deliveries/deploy-checklist.md`, M4b trong `docs/deliveries/giao-dien-nguoi-hoc.md` và ledger,
`docs/preparation/IMPROVEMENT_PLAN_2026-10-28.md`, `docs/preparation/PRODUCTION_READINESS_2026-10-21.md`; code `apps/api/src/entitlements/**`,
`apps/api/prisma/models/entitlements.prisma`, migration `20261019094400_entitlements` và `20261023100000_billing_transactions`,
`apps/api/scripts/smoke-buoc-5.mjs`, các chỗ Practice/Content gọi `reserve`/`confirm`/`release`/`refund`/`checkQuota`.

## (a) Bảng "Xong khi" (design §17, as-built `buoc-5.md` mục "Xong khi")

| # | Mục hứa | Bằng chứng | Trạng thái |
|---|---|---|---|
| 1 | CI xanh trên mọi PR (#62–#77, docs D40 #78) | `gh pr view <n> --json statusCheckRollup` cho #62–#78: mỗi PR `MERGED base=dev`, 4/4 job `SUCCESS` (api lint/typecheck/build/unit/schema drift; web; admin; admin-e2e-real) | **Verified** |
| 2 | Unit theo bảng ví dụ (91 ô máy trạng thái, luật cấp tay, chu kỳ…) | Có spec (`subscription-machine.spec.ts` 646 dòng, `grant-rules.spec.ts`, `cycle.spec.ts`, `ledger-rules.spec.ts`…); số 1338 do as-built ghi; xanh trong CI | Verified qua CI; **chưa đo "răng"** (không có Stryker: `ls apps/api \| grep -i stryker` rỗng) |
| 3 | `smoke:buoc-5` fetchState **bật**, DB mới | `buoc-5-smoke-output.txt:7-134`, `ALL CHECKS PASSED in 206262ms (run id dcbc35d7; fetchState ON)`, 39 bước | **Verified**, trên code `4357411` (trước G5 #77, as-built `buoc-5.md:165`) |
| 4 | `smoke:buoc-5` fetchState **tắt**, DB mới | `buoc-5-smoke-output.txt:136-263`, `run id 6fd0071b; fetchState OFF` | **Đã chạy**, nhưng không bước nào có kỳ vọng khác giữa hai chế độ (B5-4) → không chứng minh hai đường khác nhau |
| 5 | Chạy đua B5E1/B5#14 (10 reserve, còn 1 lượt) | Bước [23]: `1 reserved, 9 quota-exhausted; one reserved row` (cả hai lần chạy) | **Verified** (chưa chứng minh test fail khi bỏ khóa, B5-8) |
| 6 | Chạy đua B5E11 (10 người, trần còn 1) | Bước [27]: `1 reserved, 9 ai-unavailable across 10 learners` | **Verified** (như trên) |
| 7 | Chạy đua B5E73 (mở phiên vs câu đầu) | Bước [8]: `start 0×, answer 10×` mỗi lần | **Một phần**: nhánh "mở phiên thắng" chưa từng xảy ra (as-built tự ghi `buoc-5.md:122-123`) |
| 8 | `smoke:buoc-4` sau Bước 5 (B5#34) | `buoc-5-smoke-output.txt:337` `ALL CHECKS PASSED … run id e8ba4423`; đối chứng âm mục 4 (`:366` thiếu bước cấp → 403 `quota-exhausted`) | **Verified**, có đối chứng |
| 9 | D39 tin hoàn tiền sai thứ tự (B5E102, B5E103) | Chỉ unit (`event-applier.service.spec.ts:549`); smoke không có bước đảo thứ tự | **Configured** (unit), chưa verified ở runtime |
| 10 | D40 `plan_changed` khi `grace` (G5 #77) | Unit + "một lần chạy thật trên API của step-5-C" (`buoc-5.md:165-166`), không lưu output | **Configured** |
| 11 | Chạy lại `smoke:buoc-5` sau Bước 6–8 | `buoc-7.md:103-104` (dev `c1d5feb`, ON 218 s, OFF 232 s); `buoc-8.md:114` (ON 431 s, OFF 253 s) | **Chỉ có câu tóm tắt**, không lưu output (grep `smoke:buoc-5` trong `buoc-7/8-smoke-output.txt`: 0 dòng) |
| 12 | M4b `billing_transactions` | CI #127 4/4 `SUCCESS`; e2e web 12 + admin 4 (as-built `giao-dien-nguoi-hoc.md:181`); "chạy thật webhook giả → 4 dòng" (không output) | Verified qua CI/e2e; runtime chỉ tóm tắt |
| 13 | "Hủy gói" (Bước 8) | `buoc-8-smoke-output.txt:33-34` và `:121-122`: `cancel → 202, flag true on return; again → 409` | **Verified** |
| 14 | Log không lộ email, lý do cấp, `raw_payload` (B5E62) | As-built nói đã grep log (log nằm ở scratch, không lưu). Code: mọi `logger.*` trong `entitlements` chỉ mang id/enum (mục d, lệnh 5) | Code-level verified; lời khẳng định runtime không tái lập được |

## (b) Mục "chưa làm", ASSUMPTION, rủi ro mở — còn mở không, theo dõi ở đâu

| Mục | Còn mở? | Theo dõi ở |
|---|---|---|
| Pháp lý: D24 không hoàn tiền gói năm vs Điều 42 Luật 19/2023; email báo trước gia hạn (D29) | Mở | Chỉ design §19 và as-built. `deploy-checklist.md`: `grep -c "Điều 42"` = 0 (B5-9) |
| Không có e2e backend; khóa/chạy đua chỉ kiểm bằng smoke | Mở (chấp nhận, D38 Bước 4) | design §17.3, §19 |
| Khóa chung `entitlements.ai_daily` chưa đo dưới tải | Mở | design §19; deploy-checklist không có (`grep -c "khóa chung\|ai_daily"` = 1, là dòng 87 về chi phí AI, không phải đo tải) (B5-9) |
| Trần tính bằng lượt lệch tiền thật | Một phần (Bước 6 có trần lần gọi provider) | deploy-checklist:87 |
| D32: store không tắt được tự gia hạn khi staff cấp Pro (`ASSUMPTION` Apple) | Mở, "xử lý sau" | design §10, §19; deploy-checklist:150 chỉ nói `cancelAtPeriodEnd` chung |
| D37 bộ nối phải gửi `transaction_id`; D39 chỉ tự sửa khi có `fetchState` | Mở (chưa có bộ nối thật) | design §9.1, §19; deploy-checklist: `fetchState` 0 dòng, `transaction_id` 0 dòng (B5-9) |
| `BILLING_FAKE_ENABLED` không bao giờ bật ở production (R17, design §9.1 hứa "ghi vào checklist bước Deploy") | **Chưa ghi vào checklist** | Chỉ `PRODUCTION_READINESS_2026-10-21.md:204,249` (G0-2) (B5-2) |
| B5E76 không đạt (`confirm` theo dòng mới nhất), "Bước 7 xem lại khóa theo lần thử" | Mở | Chỉ `buoc-5.md:142-143,157`; `grep -rln B5E76 docs` → chỉ 3 file của Bước 5, Bước 7 không nhắc |
| `zonedMidnight` chọn nửa đêm thứ hai khi nửa đêm lặp | Mở (2026–2030 không gặp) | Chỉ `buoc-5.md:159` |
| Hai lần cấp Pro "bắt đầu ngay" đua nhau cùng còn hiệu lực | Mở; còn trong code: `now` lấy trước transaction (`grants.service.ts:133`), `updateMany … startsAt: { lte: now }` (`:160-163`) | Chỉ `buoc-5.md:160` |
| `page_token` tự chế với id không phải uuid → 500 (trái system-spec S3) | Mở; còn trong code: `cursorSchema = z.strictObject({ created_at: …, id: z.string() })` (`grants.service.ts:67`) | `buoc-5.md:161`, ledger M4b M3 (`giao-dien-nguoi-hoc-ledger.md:284`) |
| Cập nhật `paid_renewal_action` sau commit lỗi → thử lại tạo lần cấp thứ hai | Mở (D32 thu hồi lần trước bằng `replaced`, không sai tiền) | Chỉ `buoc-5.md:162` |
| Log thu hồi / sửa ngày ghi trước commit | Mở (`grants.service.ts:210`, `:243` nằm trong `$transaction`) | Chỉ `buoc-5.md:163` |
| M4b Minor M2–M5 (hoàn tiền nhiều lần, hoàn trước giao dịch gốc, hoàn lại sau khi hủy hoàn; chỉ mục theo `created_at`…) | Mở | Chỉ ledger `giao-dien-nguoi-hoc-ledger.md:283-285` |
| Mọi con số mặc định là `ASSUMPTION` (90 ngày `raw_payload`, 64 KB, 5 lần thử, 3 ngày hỏi lại, `Asia/Ho_Chi_Minh`) | Mở | design §13, `entitlements.constants.ts:28-58` |
| Trial lại sau khi xóa tài khoản | **Đã chốt** ở Bước 8 D12 (xóa `trial_history`, đăng ký lại có trial) | `2026-10-28-buoc-8-identity-remainder-design.md:32`; code `account-deletion.provider.ts:96` |
| B5E59 (sự kiện thanh toán của tài khoản "đang xóa") | Thay bằng B8E25 (sau khi xóa → `ignored`, `unknown-user`) | `buoc-8 design:557`; `event-applier.service.ts:102-108` |

## (c) Phát hiện

<a id="b5-1"></a>
### B5-1 — Vừa — Editor "nạp lại" lượt AI cho người học bằng cách cấp lại Pro, vượt ý của D7

- **Mô tả:** D7 cho editor cấp Pro "kèm lượt AI cố định của gói", trade-off ghi rõ "Lượt AI của gói bị chặn bởi con số gói và trần mỗi ngày"
  (decisions `2026-10-19-buoc-5-entitlements-decisions.md:183`). D32 (chốt sau) làm mỗi lần cấp Pro bắt đầu ngay là **gói mới**, đặt lại mốc chu kỳ.
  Hai luật gộp lại: editor cấp Pro lần nữa thì người học có ngay một chu kỳ 300 lượt mới. Không luật nào giới hạn số lần.
- **Bằng chứng:** `grants.service.ts:158-171` (lần cấp `plan` bắt đầu ngay thu hồi lần cũ bằng `replaced`, tạo lần mới `startsAt = now`; refusal duy
  nhất là `grantRefusal`, `:138-142`); `grant-rules.ts:23-30` (editor + `kind: 'plan'` + người học thường → `null`); `plan-rules.ts:103-107` (lần cấp
  `plan` đẩy `startsAt` vào `anchors`) và `:133` (mốc = nguồn bắt đầu muộn nhất); `cycle.ts:21-29` (chu kỳ tính từ mốc);
  `usage.queries.ts:52-56` (chỉ đếm `confirmed_at` trong chu kỳ). Lệnh tìm `actorRole` trong `grants.service.ts` (mục d, lệnh 4): chỉ dùng cho
  `grantRefusal` và cột `granted_by_role`, không có kiểm nào khác cho editor.
- **Kịch bản hỏng:** editor cấp Lan "Pro 30 ngày" ngày 1/11; Lan dùng hết 300 lượt bài AI ngày 5/11; editor cấp lại "Pro 30 ngày" ngày 5/11 → lần
  1/11 bị `replaced`, mốc = 5/11, chu kỳ [5/11, 5/12) đã dùng 0 → thêm 300 lượt; lặp lại mỗi ngày. Chặn duy nhất là `ai_daily_cap` (1.000 lượt/ngày
  **toàn hệ thống**), nên một tài khoản có thể ăn hết trần của mọi người. Lịch sử cấp vẫn ghi `granted_by`, admin xem được (D7) nhưng không có cảnh báo.
  Lập lịch lần cấp ở tương lai (D38) cũng đặt lại mốc khi nó bắt đầu.
- **Đề xuất (cần chủ dự án chốt):** (a) lần cấp `plan` thay một lần cấp `plan` khác thì **giữ mốc cũ** (chỉ đặt lại khi thay gói trả tiền hoặc khi
  chưa có nguồn Pro) — ít đổi nhất; (b) chỉ admin được đặt lại mốc, lần cấp của editor giữ mốc; (c) chấp nhận và thêm cảnh báo "cấp lại nhiều lần"
  trên màn admin. Khuyến nghị (a). Thêm unit test "editor cấp lại Pro giữa chu kỳ → đã dùng không về 0".

<a id="b5-2"></a>
### B5-2 — Vừa — Chặn bộ nối giả ở production là fail-open; lời hứa "ghi vào checklist Deploy" chưa làm

- **Mô tả:** design §9.1 (`…-design.md:452-453`) hứa `BILLING_FAKE_ENABLED` "không bao giờ ở production; ghi vào checklist bước Deploy, R17".
  Code chỉ từ chối khởi động khi **cùng lúc** `BILLING_PRODUCTION=true`; `BILLING_PRODUCTION` mặc định `false`, code không đọc `NODE_ENV`.
- **Bằng chứng:** `app-config.ts:238-241` (`BILLING_PRODUCTION: booleanString.default(false)`), `:261-265` (chỉ kiểm khi `BILLING_PRODUCTION`);
  `apps/api/.env.example:61-62` (`BILLING_PRODUCTION=false`, `BILLING_FAKE_ENABLED=true`); `fake-billing.adapter.ts:38-40` (đăng ký route
  `/v1/billing/webhooks/fake` khi `fakeEnabled`). `grep -n "BILLING" docs/deliveries/deploy-checklist.md` → chỉ dòng 125, 127 (mục Google) và 150 (bộ
  nối thật), **không có mục** "tắt bộ nối giả / bật `BILLING_PRODUCTION`". Đối chứng: `GOOGLE_FAKE_ENABLED` có mục riêng (2 dòng). Việc này chỉ nằm
  ở `PRODUCTION_READINESS_2026-10-21.md:204,249` (G0-2), không phải file checklist mà `CLAUDE.md` chỉ định. Test cấu hình có răng cho ca "cùng bật"
  (`app-config.spec.ts:296-299`).
- **Kịch bản hỏng:** môi trường deploy tạo từ `.env.example`, quên đặt `BILLING_PRODUCTION=true` → webhook giả mở công khai; ai có
  `BILLING_FAKE_SECRET` (secret sinh ngẫu nhiên, nên cần lộ secret) gửi `renewed` có chữ ký → Pro cho bất kỳ `app_user_id`; sự kiện `sandbox` cũng được áp
  (R17 tắt). Cùng cờ đó cũng là lớp chặn duy nhất của AI giả.
- **Đề xuất:** thêm ngay một mục vào `deploy-checklist.md` (đặt `BILLING_PRODUCTION=true`, không đặt `BILLING_FAKE_ENABLED`, `AI_FAKE_ENABLED`); trước
  launch làm G0-2 (một biến môi trường production fail-closed, mặc định từ chối mọi đồ giả).

<a id="b5-3"></a>
### B5-3 — Vừa — Hoàn tiền → hủy hoàn → hoàn lại cùng giao dịch: lần hoàn thứ hai bị bỏ qua, người dùng giữ Pro

- **Mô tả:** sự kiện cộng thêm (`refunded`, `renewed`) chống trùng theo `(provider, environment, type, transaction_id)` với bất kỳ dòng `applied` nào.
  Sau `refunded` → `refund_reversed`, một `refunded` mới của **cùng** giao dịch (mã sự kiện khác) bị coi là trùng.
- **Bằng chứng:** `event-applier.service.ts:128-136` (`findFirst({ provider, environment, type, transactionId, status: 'applied' })` → `ignored`,
  `duplicate-transaction`, không hỏi lại `fetchState` vì trả `none`); `subscription-machine.ts:216-222` (`refund_reversed` trên `revoked` → `active`).
  Unit test chỉ có ca "trùng → ignored" (`event-applier.service.spec.ts:388-396`), không có chuỗi hoàn–hủy hoàn–hoàn lại (grep
  `refund.*again\|second refund\|refunded again` trong spec: 0 dòng). Ledger M4b M2 (`giao-dien-nguoi-hoc-ledger.md:283`) chỉ ghi phần lịch sử giao dịch
  lệch trạng thái, không ghi phần quyền Pro.
- **Kịch bản hỏng:** Lan `active`, giao dịch t1. Nhà cung cấp gửi `refunded(t1)` → `revoked`; `refund_reversed(t1)` → `active`; sau đó hoàn lại thật
  `refunded(t1)` (sự kiện mới) → `ignored` → Lan vẫn Pro tới hết kỳ dù đã được hoàn tiền; lịch sử giao dịch vẫn ghi "thành công". Hiện không xảy ra
  được (chỉ có bộ nối giả), sẽ xảy ra khi có bộ nối thật mà nhà cung cấp phát chuỗi này.
- **Đề xuất:** chống trùng `refunded` theo mã lần hoàn (refund id) hoặc theo mã sự kiện; hoặc cho `refunded` áp lại khi đã có `refund_reversed`
  `applied` mới hơn cho cùng giao dịch. Viết test đỏ trước cho chuỗi trên.

<a id="b5-4"></a>
### B5-4 — Vừa — "Chạy smoke cả hai chế độ fetchState" không kiểm được khác biệt; D39, D40 không có bước smoke

- **Mô tả:** design §17.2 đòi "chạy cả hai đường có và không có `fetchState`". Smoke chạy hai lần, nhưng `MODE` chỉ dùng để kiểm cấu hình và in
  dòng chữ; không bước nào kỳ vọng kết quả khác nhau theo chế độ. Đường quan trọng nhất của `fetchState` (D39: tin hoàn tiền tới sai thứ tự → hỏi lại
  → có Pro lại, B5E102/B5E103) không có bước smoke; D40 (G5 #77) cũng không.
- **Bằng chứng:** `grep -n "MODE" apps/api/scripts/smoke-buoc-5.mjs` → dòng 25-26, 31-32, 38, 202, 683 (kiểm biến môi trường, in), không có `if (MODE…)`
  quanh `check(...)`. Bằng chứng duy nhất API chạy đúng chế độ ON là "3 dòng `billing_state_refetched`" trong log (`buoc-5.md:118-119`), log không được
  lưu. As-built tự ghi D40 không có bước smoke (`buoc-5.md:165-166`).
- **Kịch bản hỏng:** API bỏ qua `BILLING_FAKE_FETCH_STATE`, hoặc bước hỏi lại sau hoàn tiền (`event-applier.service.ts:190-195`, `:210-229`) hỏng
  → cả hai lần smoke vẫn `ALL CHECKS PASSED`. Tức là "Xong khi" mục 2 trông như đã kiểm hai đường nhưng thực ra kiểm một bộ kỳ vọng hai lần.
- **Đề xuất:** thêm bước B5E102 vào smoke với kỳ vọng theo chế độ (ON: `refunded` m1 trước `plan_changed` y1 → vài giây sau `active`; OFF: giữ
  `revoked`), và một bước D40; lưu số dòng `billing_state_refetched` của mỗi chế độ vào output.

<a id="b5-5"></a>
### B5-5 — Thấp — Mốc chu kỳ của `renewed` là `current_period_start`, không phải "lúc trừ tiền"; mốc ở tương lai làm lượt dùng không được đếm

- **Mô tả:** design §5.5 (`…-design.md:305`): "trial chuyển sang trả phí thì đặt lại = **lúc trừ tiền lần đầu**"; kích hoạt lại "= lúc trả". Code
  đặt mốc = `event.currentPeriodStart`. Nếu kỳ mới bắt đầu sau lúc nhận sự kiện, `cycleAt` trả `k = 0` → chu kỳ `[mốc, mốc + 1 tháng)`, và mọi lượt
  xác nhận trước mốc không thuộc chu kỳ nào.
- **Bằng chứng:** `subscription-machine.ts:88` (`quotaAnchorAt: event.currentPeriodStart` cho `trialing`/`expired`/`revoked`), `:130` (tạo mới);
  `cycle.ts:21-28` (`k = max(0, …)` khi `now < anchor`); `usage.queries.ts:52-56` (đếm `confirmed_at >= cycle.start`); `usage-ledger.service.ts:183`.
  Smoke gửi `current_period_start = now` nên không gặp (bước [11]).
- **Kịch bản hỏng:** (`ASSUMPTION`: một nhà cung cấp, ví dụ store, báo `renewed` trước khi kỳ mới bắt đầu, `current_period_start` = hạn cũ.) Trial
  của Lan hết lúc 10:00 mai, `renewed` tới 10:00 hôm nay với kỳ bắt đầu 10:00 mai → trong 24 giờ, mỗi lượt Lan dùng được xác nhận rồi rơi khỏi số
  đếm → không giới hạn lượt, chỉ còn trần toàn hệ thống chặn. Chưa xảy ra được với bộ nối giả.
- **Đề xuất:** mốc = `min(currentPeriodStart, occurredAt)` (đúng chữ "lúc trừ tiền"), hoặc kẹp mốc ≤ `now` trong `resolve`; unit test với kỳ bắt đầu ở
  tương lai.

<a id="b5-6"></a>
### B5-6 — Thấp — Xác nhận muộn không kiểm trần toàn hệ thống; design nói trần "chính xác tuyệt đối"

- **Mô tả:** chỉ `reserve` lấy `lockAiDaily` và đếm trần. `confirm` muộn (dòng đã quá 2 phút, đã không còn được tính vào trần) chuyển thành
  `confirmed` mà không kiểm trần, nên tổng đã xác nhận trong ngày có thể vượt `ai_daily_cap`.
- **Bằng chứng:** `usage-ledger.service.ts:65-69` (trần chỉ ở `reserve`), `:81-117` (`confirm` chỉ `lockPool`); `ledger-rules.ts:235-246`
  (`decideConfirm` không có đầu vào trần); design `…-design.md:399-401` ("chính xác tuyệt đối"). Bước 7 có đường xác nhận muộn thật:
  `sessions.service.ts:290-293` (`lateConfirm`).
- **Kịch bản hỏng:** trần 1.000, Lan giữ lượt thứ 1.000; xác nhận của Lan trễ quá 2 phút → lượt hết hạn, An giữ được lượt "thứ 1.000"; xác nhận muộn
  của Lan tới → ngày đó có 1.001 lượt đã xác nhận. Vượt tối đa bằng số lần xác nhận muộn; trần lần gọi provider của Bước 6 là lớp riêng.
- **Đề xuất:** sửa chữ design ("chính xác khi giữ chỗ; xác nhận muộn có thể vượt") hoặc cho xác nhận muộn kiểm trần dưới `lockAiDaily`.

<a id="b5-7"></a>
### B5-7 — Thấp — `refund` không kiểm thao tác đó đã thật sự bị trừ

- **Mô tả:** `refund(userId, pool, operationId)` chỉ kiểm "đã có dòng `credit` cho thao tác này chưa" và "chu kỳ còn lượt đã xác nhận chưa được
  hoàn"; không kiểm có dòng `use` `confirmed` cho chính `operationId`. Đúng hay sai phụ thuộc hoàn toàn bên gọi.
- **Bằng chứng:** `usage-ledger.service.ts:140-159` (chỉ `kind: 'credit'` ở `:145`, đếm theo chu kỳ ở `:151-153`); bên gọi hiện nay chặn bằng
  `aiCharged` (`reports.service.ts:229-231`, `refunds.ts:17`), và `aiCharged` chỉ bật khi `confirm` trả `confirmed`
  (`ai-question-generator.service.ts:146-147`, `sessions.service.ts:291-292`, hàm `lateConfirm` dòng 290). Không có unit test "hoàn một thao tác chưa bị trừ" (`usage-ledger.service.spec.ts:232-269`).
- **Kịch bản hỏng:** một bên gọi mới (ví dụ Content khi có báo lỗi tra AI) truyền mã của một lần tra đã `released` → người học được cộng 1 lượt không
  có thật. Hiện chưa có bên gọi nào như vậy.
- **Đề xuất:** trong `refund`, đòi có dòng `use` `confirmed` cho `(user, pool, operation_id)`; thêm test.

<a id="b5-8"></a>
### B5-8 — Thấp — Test chạy đua có thật nhưng chưa chứng minh có răng

- **Mô tả:** unit test của sổ lượt dùng Prisma giả, không có test đồng thời (grep `concurren\|parallel\|Promise.all` trong spec của `entitlements`: 1
  dòng, là tên một test truy vấn, không phải chạy song song). Chạy đua thật chỉ ở smoke: B5E1, B5E11 qua `pnpm entitlements:fake-ai --parallel 10`
  (`fake-ai-args.ts:56-69`, `Promise.all` trong một tiến trình, pool DB mặc định 20 nên 10 transaction song song thật). Không có ghi chép nào cho thấy
  bỏ `lockPool` / `lockAiDaily` thì smoke đỏ. B5E73 chạy 10 vòng, cả 10 lần "câu trả lời thắng" (`buoc-5.md:122-123`), nên smoke không phân biệt
  "hai request chồng nhau và bị chặn đúng" với "hai request chạy nối tiếp".
- **Bằng chứng:** `smoke-buoc-5.mjs:290-320`, `:498-552`; `buoc-5-smoke-output.txt` bước [8].
- **Đề xuất:** một lần chạy có chủ đích trên nhánh nháp: bỏ `lockPool` → B5E1 phải đỏ; bỏ `lockAiDaily` → B5E11 phải đỏ; ghi kết quả vào as-built
  (luật "test phải có răng" của `testing-boundaries.md`).

<a id="b5-9"></a>
### B5-9 — Thấp — Việc "trước khi bán thật" của Bước 5 chưa vào `deploy-checklist.md`

- **Mô tả:** `CLAUDE.md` nói việc trước launch gom ở `deploy-checklist.md`. Các việc của design §18–19 không có ở đó: luật sư về D24/Điều 42 và email
  báo trước gia hạn; bộ nối thật phải gửi `transaction_id` (D37) và nên có `fetchState` (D39); đo khóa chung trần AI dưới tải; R17 (B5-2).
- **Bằng chứng:** `grep -c` trên `deploy-checklist.md`: `Điều 42` 0, `fetchState` 0, `transaction_id\|mã giao dịch` 0; `Bước 5` 2 dòng (87, 93: chi phí
  AI, chữ ký webhook). Đối chứng: `luật sư` 2 dòng (mục Bước 0–3 và Bước 8).
- **Đề xuất:** thêm một mục "Bước 5" vào checklist trỏ về design §18–19.

### Không phát hiện vấn đề (đã kiểm, có bằng chứng)

- **Trừ lượt đồng thời:** `reserve` khóa `pg_advisory_xact_lock` theo `(user, pool)` rồi mới đếm, khóa chung `entitlements.ai_daily` trước khi đếm trần
  và ghi, cùng một transaction (`usage-ledger.service.ts:44-78`, `entitlements.locks.ts:10-27`); thứ tự khóa cố định, `confirm`/`release`/`refund` chỉ
  khóa `(user, pool)` nên không deadlock với nhau. Mỗi lần gọi là transaction riêng (`this.prisma.$transaction`), bên gọi không truyền `tx` (R6).
- **Trừ hai lần khi thử lại:** `reserve` cùng `operation_id` trả dòng đang giữ / đã xác nhận (`ledger-rules.ts:211-216`); unique một phần
  `usage_records_live_use_key` (migration `20261019094400_entitlements/migration.sql:234`); bộ sinh câu AI dùng `request.id` làm `operation_id`
  (`ai-question-generator.service.ts:109`), tra AI dùng mã suy từ `Idempotency-Key` (`ai-lookup.service.ts:50-51`).
- **Hoàn lượt một lần:** kiểm `credit` dưới `lockPool` (`usage-ledger.service.ts:144-147`) + unique `usage_records_credit_key` (migration `:236`).
- **Phiên luyện Free:** `checkQuota` chạy sau `updateMany` đóng phiên cũ, dưới `withPracticeLock` (`sessions.service.ts:136-145`); ghi phiên
  `ON CONFLICT DO NOTHING` trong transaction ghi đáp án (`answers.service.ts:143`, `entitlements.service.ts:116-121`); `void` không qua `writeFinal`
  (`sessions.service.ts:651`).
- **Ranh giới ngày:** phiên luyện theo múi giờ hồ sơ (`entitlements.service.ts:103-110`, `answers.service.ts:136`); trần theo `Asia/Ho_Chi_Minh`
  (`cycle.ts:32-38`); chu kỳ tháng kẹp cuối tháng không trôi mốc (`cycle.ts:11-18`).
- **Webhook:** HMAC `timingSafeEqual` trên raw body (`fake-wire.ts:15-20`), raw parser riêng 64 KB (`app.setup.ts:15-18`), chống trùng theo
  `dedupe_key` unique + `skipDuplicates` (`billing-inbox.service.ts:86-111`), sai thứ tự theo `occurred_at`/`last_event_at` + `fetchState`
  (`event-applier.service.ts:137-142`), áp sau khi trả lời, khóa `lockUser` + dòng `FOR UPDATE` (`:111-112`), job dùng `FOR UPDATE SKIP LOCKED`
  (`billing-jobs.service.ts:76-79`). Chống phát lại cho bộ nối thật đã ở `deploy-checklist.md:93`.
- **Quyền cấp tay (D6–D8, D33, D38):** `@RequirePermission('entitlements.grant')` (`admin-grants.controller.ts:13`); editor: tự cấp, cho admin, cho staff,
  khóa `ai_*` (kể cả 0) đều bị từ chối, áp cả cho thu hồi và sửa ngày, vai trò người nhận đọc lại lúc thu hồi (`grant-rules.ts:18-30`,
  `grants.service.ts:138-142`, `:202-206`, `:223-227`, `:361-374`); quyền chỉ cho `admin`, `editor` (`identity.types.ts:11,17`); khoảng con số
  0–200 / 0–5.000 (`grants.schemas.ts:13-17`).
- **Ranh giới module D3:** không module nào khác truy vấn bảng của Entitlements; Entitlements không truy vấn bảng module khác (mục d, lệnh 7).
- **Log:** không có trường email, lý do cấp, payload, số tiền, fingerprint (mục d, lệnh 5); `ProblemDetailsFilter` không log URL (`problem-details.filter.ts:26-33`).
- **Migration/index:** sổ lượt có `(user_id, pool, confirmed_at)`, `(pool, system_date)`, unique một phần, index một phần cho dòng đang giữ (migration
  `:190-238`); `billing_transactions` có `(user_id, occurred_at desc, id desc)`, `(occurred_at desc, id desc)`, unique `(provider, environment,
  provider_transaction_id, kind)`, CHECK tiền/tiền tệ cùng null (migration `20261023100000_billing_transactions`). Đếm phiên theo `local_date` dùng
  tiền tố `(user_id, pool)`, đủ ở quy mô hiện tại.
- **Số liệu khớp design §13:** mọi khóa, mặc định, khoảng của nhóm `entitlements`, `content`, `learning` trùng (`settings.definitions.ts:58-63`,
  `:95-110`) — free 3 (1–50), pro 30 (1–200, ≥ free), AI 300/100, trial 300/100, `grace_days` 7 (0–16), `ai_daily_cap` 1.000 (0–100.000), cảnh báo 75
  (50–95, trống được), quảng cáo tắt/3/10, từ riêng 10.000, câu 20, nhóm 100, từ/nhóm 2.000. Không có giá trong design (V1 không thu tiền), nên không có
  chỗ lệch giá.
- **"Hủy gói" (Bước 8):** chỉ gọi `cancelAtPeriodEnd` ngoài khóa, không ghi tiền hay lượt (`subscription-cancel.service.ts:32-52`); xóa tài khoản giữ
  sổ lượt và giao dịch dưới mã ẩn danh, khóa `lockUser` rồi ba `lockPool` (`account-deletion.provider.ts:82-101`).

## (d) Lệnh tìm "không có" kèm đối chứng

1. Trần trong `confirm`: `grep -n "lockAiDaily\|capUsed\|lockPool" apps/api/src/entitlements/usage/usage-ledger.service.ts` → `lockAiDaily` / `capUsed`
   chỉ ở dòng 65-68 (`reserve`); `lockPool` ở 46, 85, 123, 144 (đối chứng: lệnh đọc đúng file, thấy khóa của cả bốn hàm).
2. Mục R17 trong checklist: `grep -n "BILLING" docs/deliveries/deploy-checklist.md` → 125, 127, 150 (không có mục tắt bộ nối giả). Đối chứng:
   `grep -c "GOOGLE_FAKE_ENABLED"` = 2.
3. Smoke có kỳ vọng theo chế độ: `grep -n "MODE" apps/api/scripts/smoke-buoc-5.mjs` → 25, 26, 31, 32, 38, 202, 683, không có nhánh kiểm. Đối chứng: cùng
   lệnh thấy dòng in `fetchState mode ON/OFF` (202) khớp output.
4. Kiểm riêng cho editor khi cấp lại Pro: `grep -n "actorRole" apps/api/src/entitlements/grants/grants.service.ts` → 137, 139, 168, 187, 189, 195, 203,
   217, 224, 240 (chỉ `grantRefusal` và cột vai trò). Đối chứng: thấy cả ba đường create/revoke/update.
5. Log lộ dữ liệu: `grep -rn "logger\.\(info\|warn\|error\)" apps/api/src/entitlements --include=*.ts | grep -v spec | grep -iE "email|reason|payload|amount|fingerprint"`
   → 3 dòng, đều là `reason` dạng mã cố định (`sandbox-in-production`, lý do bỏ qua thư). Đối chứng: tổng số lời gọi logger không tính spec = 32.
6. B5E76 được Bước 7 xem lại: `grep -rln "B5E76" docs` → chỉ `buoc-5.md`, plan và design Bước 5. Đối chứng: chính lệnh đó thấy `buoc-5.md`.
7. Ranh giới D3: `grep -rnE "\.(usageRecord|entitlementGrant|entitlementGrantChange|subscription|billingEvent|trialHistory|billingTransaction|entitlementNotice|fakeBillingSubscription)\.|FROM (usage_records|…)" apps/api/src --include=*.ts | grep -v "apps/api/src/entitlements/" | grep -v spec`
   → rỗng. Đối chứng: cùng mẫu bên trong `entitlements` khớp 10 file. Chiều ngược: `grep -rnE "(tx|db|prisma)\.(user|practice…|learning…|sense|word|aiCall|aiRequest|setting…)\." apps/api/src/entitlements` → rỗng.
8. `refund` kiểm dòng `use`: `sed -n 140,160p usage-ledger.service.ts | grep -n kind` → chỉ `kind: 'credit'` (dòng 145) và câu `INSERT … 'credit'`. Đối chứng:
   lệnh đọc đúng đoạn hàm (thấy câu `INSERT`).
9. Chạy lại `smoke:buoc-5` có lưu output: `grep -n "smoke:buoc-5\|smoke-buoc-5\|fetchState O"` trên mọi `docs/deliveries/*smoke-output*.txt` → chỉ
   `buoc-5-smoke-output.txt`. Đối chứng: lệnh thấy 4 dòng trong file đó.
10. Test đồng thời trong unit: `grep -rn "concurren\|parallel\|Promise.all" apps/api/src/entitlements --include=*.spec.ts` → 1 dòng (`usage.queries.spec.ts:26`,
    "parallel arrays"). Đối chứng: `find apps/api/src/entitlements -name '*.spec.ts' | wc -l` = 35.
11. Mutation testing: `ls apps/api | grep -i stryker` → rỗng; `grep -rln "stryker\|mutation" docs/deliveries` → rỗng.
12. CI: `gh pr view <n> --json number,state,mergedAt,baseRefName,statusCheckRollup` cho n = 62…78 và 127 → mọi PR `MERGED`, base `dev`, 4/4 `SUCCESS`.
