# Review design Bước 5 (Entitlements & Usage, chỉ API) — trước khi viết plan (19/10/2026)

**Đã đọc:** design [`../specs/2026-10-19-buoc-5-entitlements-design.md`](../specs/2026-10-19-buoc-5-entitlements-design.md) (678 dòng),
decision record [`../decisions/2026-10-19-buoc-5-entitlements-decisions.md`](../decisions/2026-10-19-buoc-5-entitlements-decisions.md) (D1–D30),
nhật ký [`2026-10-18-buoc-5-brainstorm-log.md`](2026-10-18-buoc-5-brainstorm-log.md); review Bước 4 và mục 0 của design Bước 4 làm mẫu. Code đọc trên
nhánh `docs/buoc-5-design-review` (= `origin/dev` @ `7ede16d`); mọi `file:dòng` code dưới đây là của commit đó, đường dẫn tính từ `apps/api/` trừ khi ghi
khác. "Dòng N" không kèm tên file là dòng của file design.

**Phạm vi:** chỗ tự mâu thuẫn trong design; design ↔ decision record ↔ nhật ký; design ↔ code trên `dev`; chỗ thiếu khiến người viết plan phải đoán;
tiêu chí không kiểm được bằng `pnpm smoke:buoc-5`. Không bàn lại D1–D30; một quyết định chỉ được nêu khi nó tự mâu thuẫn hoặc không build được như viết.
Chỉ đọc, không chạy gì (không build, không test, không server).

**Kết quả:** 2 Cao, 13 Trung bình, 10 Thấp. 4 câu cần chủ dự án trả lời (mục 4).

## 1. Kết luận

Chưa nên viết plan nguyên văn theo design: hai chỗ Cao đều ở cổng thanh toán (mục 9) và sẽ làm người đã trả tiền mất Pro. Phần lõi (gói, sổ lượt, cấp
tay, sửa Practice/Learning/Content, Settings) build được trên code hiện tại; móc "ghi nhận phiên" vào `writeFinal` của Practice làm được, rẻ và an toàn
race (mục 6). Việc cần làm trước plan:
1. **R1** — luật "sự kiện cũ hơn `last_event_at` → `stale`" áp cho cả sự kiện cộng thêm (`payment_succeeded`, `renewed`), làm mất kỳ đã trả khi IPN tới ngược thứ tự.
2. **R2** — chuyển trạng thái theo thời gian + `expired` là trạng thái cuối: `renewed` tới trễ sau khi job ghi `expired` thì không còn đường về `active`; ngược lại gói không bao giờ nhận sự kiện nữa thì Pro mãi. Cần Q1.
3. **R3** — bảng trạng thái 9.4 chỉ định nghĩa khoảng 20 trên 84 cặp, trong khi mục 17 hứa unit test "mọi cặp".
4. **R5, R4** — `pnpm smoke:buoc-4` sẽ hỏng (learner mới thành Free, 3 phiên/ngày); câu "không thể vượt quá con số" ở 7.4 sai vì có một race.
Phần thanh toán có thể plan sau phần lõi (mục 5) để hai chỗ Cao không chặn phần pilot cần.

## 2. Bảng phát hiện

| R# | Mức | Mục design | Vấn đề | Đề xuất ngắn | Cần chủ dự án quyết? |
|---|---|---|---|---|---|
| R1 | **Cao** | 9.2, 9.3, 9.4 | "Cũ hơn `last_event_at` → `stale`" áp cho mọi sự kiện; sai với sự kiện cộng thêm (`payment_succeeded`, `renewed`); payload chuẩn hóa chưa định nghĩa; chưa có luật khi hai sự kiện cùng `occurred_at` | Ghi payload tối thiểu từng sự kiện; tách sự kiện trạng thái (theo thứ tự) và sự kiện cộng thêm (áp idempotent theo mã giao dịch, kỳ = max) | Không |
| R2 | **Cao** | 9.4, 5.4 | Dòng `active` "hết kỳ không gia hạn → `expired`" + tính lúc đọc + job ghi; `expired` không có lối ra → `renewed` tới trễ làm mất Pro vĩnh viễn. Nếu chỉ tin sự kiện: gói im lặng (và `trialing` quá `trial_ends_at`) là Pro mãi | Chỉ hết hạn theo thời gian khi `cancel_at_period_end` hoặc `renewal = app`; cho `renewed` ra khỏi `expired`; luật cho gói quá kỳ chưa có sự kiện | **Có (Q1)** |
| R3 | Trung bình | 9.4, 17 | Ma trận 6 trạng thái × 14 sự kiện thiếu phần lớn ô (hủy trong trial, `grace` + `expired`/`revoked`, `expired` + mọi sự kiện, sự kiện cho gói chưa có dòng…) | Thêm ma trận đủ, ô không nghĩa = "ghi lại, không đổi, log" | Không |
| R4 | Trung bình | 7.4, 4 | Race: mở phiên mới đúng lúc câu đầu của phiên cũ đang ghi → phiên thứ 4 được tính. Câu "không thể vượt quá" (dòng 281) sai | Kiểm hạn mức sau khi `updateMany` đóng phiên cũ (đã chờ khóa dòng) | Không |
| R5 | Trung bình | 17, 19 | `smoke:buoc-4` dùng một learner mới, mở và trả lời nhiều hơn 3 phiên → 403 `quota-exhausted` sau Bước 5; không nằm trong "Xong khi" nên plan sẽ không thấy | Task trong plan: smoke Bước 4 cấp con số riêng cho learner của nó; ghi as-built | Không |
| R6 | Trung bình | 12.4, 7.1, 19 | "Nhận transaction của bên gọi" + `pg_advisory_xact_lock`: Bước 7 giữ khóa chung suốt lời gọi AI → mọi lời gọi AI xếp hàng một; hai `reserve` trong một transaction → deadlock | Ghi hợp đồng: không gọi AI khi đang giữ khóa; một `reserve` mỗi transaction; kết quả `reserve` nói `reserved`/`confirmed` | Không |
| R7 | Trung bình | 7.1 | `confirm` muộn khi dòng đã bị job hoặc lần `reserve` thử lại ghi `released`: chưa định nghĩa; không phân biệt "nhả vì AI lỗi" với "hết hạn" | Bảng luật `confirm` theo trạng thái dòng; thêm lý do nhả | Không |
| R8 | Trung bình | 5.5, 2 (D19), B5E28 | "Không có chuyện tặng thêm lượt" sai (có ví dụ cho thêm 200 lượt); B5E28 làm Lan có 0 lượt từ 30/11 tới 15/12, khác cách đọc "chu kỳ giữ như cũ"; chưa nói nguồn nào tính vào mốc | Sửa câu, thêm bảng ví dụ hai chiều; chủ dự án xác nhận hệ quả | **Có (Q2, xác nhận)** |
| R9 | Trung bình | 6, 14, B5E60–61 | `entitlement_notices` chỉ có `sent_at`, `MailDispatcher` gửi kiểu bắn rồi quên → B5E60 (không gửi trùng) và B5E61 (thử lại giờ sau) không cùng đạt được; cửa sổ gửi và chỗ gửi chưa định nghĩa | Thêm `state` như `reminder_deliveries`; dùng lại cách gửi của nhắc học; ghi cửa sổ gửi, không gửi khi `trial_denied` | Không |
| R10 | Trung bình | 9.1, 9.2, B5#10 | Khi nào dùng `fetchState` (mọi sự kiện, chỉ khi `stale`?) chưa rõ; bộ nối giả lấy "trạng thái thật" ở đâu chưa có; B5#10 kiểm đường nào không rõ | Ghi luật dùng `fetchState`, nguồn trạng thái của bộ nối giả, smoke chạy cả hai đường | Không |
| R11 | Trung bình | 9.4 (app tự gia hạn), 6 | `payment_succeeded` gắn vào dòng `subscriptions` nào (`external_subscription_id`)? Mua lại sau `expired`, mua năm khi đang có tháng chưa định nghĩa | Mã gói tự sinh, một dòng mỗi người mỗi nhà cung cấp; luật mua lại | Không |
| R12 | Trung bình | 10, 12.2, 12.5 | Khoảng hợp lệ của "con số riêng" chưa có; `starts_at` quá khứ/tương lai; con số phiên = 0 trả `resets_at` không bao giờ đúng; editor thu hồi được lần cấp "AI: 0" của admin; API 2 thiếu `not-found` | Khoảng = khoảng của cài đặt tương ứng; luật `starts_at`; Q3 | **Có (Q3)** |
| R13 | Trung bình | 16, 17 | B5#24 cần hơn 1.000 từ riêng (rate limit 30/phút → hơn 34 phút); "đồng hồ giả" trong API thật không có; B5#16 phụ thuộc thứ tự; B5#28 không có chỗ quan sát `endTrialNow`; chạy đua 2 lời gọi là may rủi | Seed bằng `psql` hoặc kiểm cùng luật trên nhóm/câu ngữ cảnh; liệt kê cột lùi ngày; N lời gọi song song | Không |
| R14 | Trung bình | 6, 7, 9.2 | Trùng unique trong transaction (P2002) làm hỏng cả transaction Postgres; `recordPracticeSession` chạy trong transaction ghi đáp án | `INSERT … ON CONFLICT DO NOTHING` (đã có tiền lệ) hoặc kiểm trước dưới khóa | Không |
| R15 | Trung bình | 12.1, 4 | `@LearnerContent()` trả 403 `profile-incomplete` cho tài khoản chưa có `native_language` (người mới, staff) trái B5#1, B5E41; và làm Entitlements import Content → vòng import khi Content import Entitlements ở Bước 7 | Chỉ cần đăng nhập (AuthGuard chung) | Không |
| R16 | Thấp | 9.2 | Webhook cần raw body để kiểm chữ ký; giới hạn 64 KB khác parser chung 100 kb; VNPay IPN là GET | `rawBody: true`, parser riêng cho route, nhận GET khi bộ nối cần | Không |
| R17 | Thấp | 9.1 | "Không bao giờ bật bộ nối giả ở production" chỉ là kỷ luật cấu hình; luật cho sự kiện `sandbox` ở production chưa có | Ghi vào bước Deploy; luật `environment` | Không |
| R18 | Thấp | 14, B5E61 | Email thanh toán đi `tryConsume()` không trần → ăn được phần 20% để dành cho OTP, trái "không chặn OTP" | Trần riêng (ví dụ 95%) | Không |
| R19 | Thấp | 4 (bảo trì), 9.2 | `MaintenanceScheduler` giả định job chạy song song vô hại; job mới (áp lại sự kiện, email, ghi trạng thái) không vô hại | Claim dòng (`FOR UPDATE SKIP LOCKED`), kiểm lại trạng thái dưới khóa | Không |
| R20 | Thấp | 4 (Identity) | `getProfile` đã trả `staff_role`, chỉ "danh sách email admin" là mới; test quyền B2#67 và các fake của Practice phải sửa | Sửa bảng mục 4; ghi vào plan | Không |
| R21 | Thấp | 7.2 | Điều kiện hoàn lượt "đã dùng > 0" tính cả dòng `reserved` → lượt hoàn có thể "để dành"; dòng `credit` chưa nói dùng mốc thời gian nào | Điều kiện theo `confirmed − credit`; ghi cột thời gian của `credit` | Không |
| R22 | Thấp | nhiều | Chữ và nhất quán nhỏ (`retry_after`/`retry-after`, kiểu `subject_id`, "≥" và "cao hơn", thứ tự lý do từ chối…) | Sửa chữ | Không |
| R23 | Thấp | 6 | `raw_payload` (có email người mua) giữ mãi | Job xóa `raw_payload` sau N ngày | Không (đề xuất) |
| R24 | Thấp | 9.4 | Hoàn tiền **một phần** (research nói có) bị xử lý như hoàn toàn phần → mất Pro | Q4 | **Có (Q4)** |
| R25 | Thấp | 8 | Đường sự kiện (D30) không đòi email đã xác minh như `trial_eligible`; hai tài khoản cùng thẻ bắt đầu trial cùng lúc | Ghi rõ; thêm B5E | Không |

## 3. Chi tiết

### R1 (Cao) — luật `stale` sai với sự kiện cộng thêm; payload chuẩn hóa chưa định nghĩa

**Vấn đề.** Dòng 330-331: sự kiện có `occurred_at` cũ hơn `last_event_at` của gói thì `stale`, không áp. Luật "bản ghi mới nhất thắng" chỉ đúng khi mỗi
sự kiện mang **toàn bộ trạng thái** của gói. Mục 9.3 (dòng 333-347) chỉ ghi ý nghĩa từng sự kiện, không nói payload chuẩn hóa mang gì. Ba trường hợp sai:
- `payment_succeeded` (app tự gia hạn, dòng 367-368, B5E56): hai lần trả tiền T1 < T2, IPN của T2 tới trước → T1 tới sau bị `stale` → người dùng mất 30
  ngày đã trả. VNPay thử gửi IPN tới 10 lần, cách 5 phút (`docs/preparation/PAYMENT_PROVIDERS_RESEARCH_2026-10-18.md` dòng 47, 419), nên tới trễ là chuyện
  thường.
- `renewed` (T1) tới sau `cancel_scheduled` (T2 > T1): nếu `cancel_scheduled` không mang `current_period_end` mới thì `renewed` bị bỏ, kỳ không được dời, người
  đã trả kỳ mới mất Pro ở cuối kỳ cũ.
- Hai sự kiện cùng `occurred_at` (thường gặp khi nhà cung cấp phát nhiều sự kiện cho một giao dịch): `<` hay `≤` chưa chốt; `≤` thì sự kiện thứ hai bị bỏ.

**Đề xuất (kỹ thuật).** Ghi vào 9.3 payload tối thiểu của mỗi sự kiện chuẩn hóa (`current_period_start/end`, `trial_ends_at`, `cancel_at_period_end`,
`interval`, mã giao dịch hoặc mã kỳ). Chia hai loại: sự kiện **trạng thái** (`cancel_*`, `plan_change_*`, `expired`, `revoked`, `grace_ended`) áp theo
`occurred_at`, hòa thì theo thứ tự nhận; sự kiện **cộng thêm** (`renewed`, `payment_succeeded`, `refunded` theo kỳ) luôn áp, idempotent theo mã giao dịch,
`current_period_end = max(cũ, kỳ trong sự kiện)`, không bị `stale`. Thêm B5E: hai `payment_succeeded` tới ngược thứ tự → kỳ dài bằng tổng hai lần; `renewed`
tới sau `cancel_scheduled` → kỳ vẫn được dời.

### R2 (Cao) — chuyển trạng thái theo thời gian và `expired` là trạng thái cuối

**Vấn đề.** Bảng 9.4: `active` "Ra khi … hết kỳ không gia hạn → `expired`" (dòng 354); `expired` "Ra khi: Mua lại = gói mới" (dòng 357), tức không có
cặp nào ra khỏi `expired`; dòng 369-370 cho tính chuyển trạng thái lúc đọc và job mỗi giờ ghi lại. Hai cách đọc đều sai:
1. Đọc "hết kỳ không gia hạn" là theo thời gian: với gói nhà cung cấp tự gia hạn, `renewed` thường tới sau cuối kỳ vài phút tới vài giờ. Job ghi `expired`,
   rồi `renewed` tới → không có chuyển trạng thái → người đã trả mất Pro vĩnh viễn (phải "mua lại"). Cùng chuyện với `cancel_unscheduled` tới trễ.
2. Đọc là chỉ sự kiện `expired` mới kết thúc: gói `active` không bao giờ nhận thêm sự kiện (webhook mất, nhà cung cấp không gửi lại) là Pro mãi. `trialing`
   (dòng 353) không có luật thời gian nào sau `trial_ends_at`, nên trial bị mất sự kiện cũng là Pro mãi.
Dòng "Vào khi" của `expired` (dòng 357), ngoài sự kiện `expired`, chỉ liệt kê `cancel_at_period_end` và app tự gia hạn, khác dòng `active`.

**Đề xuất.** Kỹ thuật: (a) chỉ hết hạn theo thời gian khi `cancel_at_period_end` (kể cả trong trial) hoặc `renewal = app`; (b) `renewed`,
`payment_succeeded`, `refund_reversed` có `occurred_at` sau lúc hết hạn và kỳ còn hiệu lực thì đưa gói từ `expired` về `active` (hoặc không ghi `expired` cho
gói còn có thể gia hạn). Phần còn lại là quyết định sản phẩm (Q1): gói tự gia hạn đã quá cuối kỳ (hoặc quá `trial_ends_at`) mà chưa có sự kiện nào thì có
còn Pro không. Thêm B5E cho mỗi nhánh.

### R3 (Trung bình) — ma trận trạng thái × sự kiện chưa đủ

**Vấn đề.** Mục 17 dòng 633 hứa unit test "máy trạng thái gói (bảng 9.4, mọi cặp trạng thái × sự kiện)". 6 trạng thái × 14 sự kiện (9.3) = 84 ô; bảng 9.4
định nghĩa khoảng 20. Các ô người viết plan phải đoán, ví dụ: `trialing` + `cancel_scheduled` (hủy trong trial; `current_period_end` lúc trial là gì; hết trial
thì `expired` lúc nào); `trialing` + `plan_changed`; `grace` + `expired` / `revoked` / `cancel_scheduled`; `grace_ended` có ở 9.3 nhưng `grace` trong 9.4 chỉ ra
theo thời gian; `on_hold` + `revoked` / `cancel_scheduled`; `revoked` + `refund_reversed` khi kỳ đã hết; `expired` + mọi sự kiện (xem R2); `subscription_started`
lặp cho một `external_subscription_id` đã có; sự kiện cho gói **chưa có dòng** (ví dụ `renewed` tới trước `subscription_started`: tạo dòng hay `ignored`?);
`payment_succeeded` cho gói `expired` (xem R11).

**Đề xuất (kỹ thuật).** Thêm ma trận đủ vào 9.4; ô không có nghĩa = "ghi `applied`, không đổi trạng thái, log `billing_event_noop`" (hoặc `ignored`, chọn
một). Ghi riêng luật cho sự kiện của gói chưa có dòng.

### R4 (Trung bình) — race khi mở phiên làm vượt con số một phiên

**Vấn đề.** Dòng 279-281: kiểm hạn mức khi mở phiên, ghi nhận khi câu đầu có kết quả; "Một người chỉ có một phiên đang mở … nên không thể vượt quá con số".
Code: `start` lấy khóa `practice.user` (`src/practice/sessions/sessions.service.ts:67-68`), kiểm quyền ngay (`:69`), rồi mới đóng phiên đang mở bằng
`updateMany` (`:95-97`). Đường trả lời **không** lấy khóa `practice.user`; nó chỉ khóa dòng phiên `FOR UPDATE` (`src/practice/answers/answers.service.ts:146-150`
qua `lockOpen`, `src/practice/sessions/sessions.service.ts:174-190`); khóa `practice.user` chỉ có ở `sessions.service.ts:68` và `reports/reports.service.ts:54`.
Xen kẽ: T1 = câu đầu của phiên A (ghi phiên thứ 3, chưa commit); T2 = mở phiên B, đếm được 2 → cho qua; `updateMany` của T2 chờ khóa dòng A; T1 commit; T2 đóng
A, tạo B; câu đầu của B → phiên thứ 4. Chỉ cần hai tab, nên câu "không thể vượt quá" sai (vượt một phiên).

**Đề xuất (kỹ thuật).** Trong `start`, gọi `checkQuota` **sau** `updateMany` đóng phiên cũ (lệnh đó đã chờ khóa dòng; ở READ COMMITTED lệnh đếm sau đó thấy dòng
của T1), hoặc khóa dòng phiên đang mở `FOR UPDATE` trước khi đếm. Từ chối thì rollback nên B5E21 ("phiên đang mở giữ nguyên") vẫn đúng. Sửa câu dòng 281,
thêm B5E.

### R5 (Trung bình) — `pnpm smoke:buoc-4` sẽ hỏng sau Bước 5

**Vấn đề.** Dòng 670 ghi "mọi tài khoản là Free (3 phiên/ngày)", nhưng không nhắc script kiểm của Bước 4. `scripts/smoke-buoc-4.mjs` đăng ký một learner mới
(`:197`) rồi mở và trả lời nhiều phiên trong cùng ngày (`start` ở `:242-246`, gọi ở `:257` trong vòng lặp, `:299`, `:375` trong vòng lặp, `:387`, `:392`,
`:401`, `:466`). Từ phiên được tính thứ 4, `POST /v1/practice/sessions` trả 403 `quota-exhausted` và `want(…, 201)` (`:243`) dừng script. "Xong khi" của Bước 5
chỉ chạy `smoke:buoc-5`, nên plan sẽ không thấy.

**Đề xuất (kỹ thuật).** Một task trong plan: `smoke:buoc-4` đăng ký admin (đã có `registerAdmin`, `:104`) và cấp con số riêng `practice_sessions_per_day` cho
learner của nó trước khi luyện; chạy lại `smoke:buoc-4` trong task cuối và ghi vào as-built. Ghi thêm vào mục 19: tài khoản dùng để test tay cũng cần cấp.

### R6 (Trung bình) — hợp đồng transaction với Bước 7

**Vấn đề.** Dòng 435: `reserve` / `confirm` / `release` "nhận transaction của bên gọi nếu cần". Khóa là `pg_advisory_xact_lock` (dòng 241), giữ tới hết
transaction của bên gọi. Nếu Bước 7 làm `reserve → gọi AI → lưu câu → confirm` trong một transaction, khóa chung `entitlements.ai_daily` bị giữ suốt lời
gọi AI (vài giây) → mọi lời gọi AI của cả hệ thống chạy lần lượt từng cái, trái giả định "AR11: 5 lời gọi cùng lúc" ở dòng 659. Thêm: hai `reserve` trong một
transaction (ví dụ `ai_practice` rồi `ai_lookup`) phá luật "khóa người trước, khóa chung sau" (dòng 241-242): T1 giữ (u, practice) và khóa chung, chờ (u, lookup);
T2 giữ (u, lookup), chờ khóa chung → deadlock (Postgres hủy một bên, người học thấy 500). Bước 2 của `reserve` trả "chính dòng đó" kể cả khi đã `confirmed`
(dòng 243): bên gọi cần biết để **không** gọi AI lần nữa.

**Đề xuất (kỹ thuật).** Ghi vào 7.1 và mục 18 (Bước 7): mỗi `reserve` / `confirm` / `release` commit trong transaction ngắn của nó (hoặc transaction của bên gọi
chỉ khi transaction đó commit trước khi gọi AI); không bao giờ gọi AI khi còn giữ khóa của Entitlements; tối đa một `reserve` mỗi transaction (hoặc lấy mọi
khóa (người, kho) theo thứ tự cố định trước khóa chung); kết quả `reserve` có `state: reserved | confirmed`.

### R7 (Trung bình) — `confirm` muộn trên dòng đã bị nhả

**Vấn đề.** Dòng 250-252 giả định dòng còn `reserved` khi `confirm` tới muộn. Nhưng dòng 237 (job mỗi giờ ghi `released`) và dòng 243-244 (`reserve` thử lại ghi
`released` trước) có thể đã nhả dòng đó. `confirm` gặp `released` thì chưa có luật (lỗi? giao kết quả không trừ?). Design dùng một trạng thái `released` cho cả
"AI lỗi, bên gọi nhả" và "hết 2 phút"; ER5 tách `expired`. `confirm` sau khi bên gọi đã nhả (lỗi lập trình) không nên trừ; `confirm` sau khi hết hạn thì theo luật
xác nhận muộn. Nếu `reserve` thử lại đã tạo dòng mới cùng `operation_id`, `confirm` nhắm dòng nào cũng chưa nói.

**Đề xuất (kỹ thuật).** Thêm cột hoặc `note` lý do nhả (`released` / `expired`). Bảng luật `confirm`: `reserved` còn hạn → `confirmed`; `reserved` quá hạn hoặc
nhả vì hết hạn → luật xác nhận muộn (chỉ đổi sang `confirmed` khi không có dòng khác cùng `operation_id` đang `reserved`/`confirmed`, để không đụng unique một
phần); nhả do bên gọi → không đổi, trả `released`; nhiều dòng → dòng mới nhất. Thêm B5E cho từng ô.

### R8 (Trung bình) — mốc chu kỳ khi nguồn sớm nhất hết

**Vấn đề.** Dòng 206-207: "Khi nguồn đó hết, mốc chuyển sang mốc sớm nhất còn lại; lượt đã dùng trong chu kỳ mới tính theo mốc mới vẫn được đếm (không có
chuyện tặng thêm lượt)". Câu trong ngoặc sai, và hệ quả theo hai chiều chưa được viết ra:
- **Cho thêm lượt:** cấp tay G Pro từ 01/11 (mốc 01/11), gói đăng ký S từ 20/11 (mốc 20/11). Dùng 200 lượt ngày 05–15/11 và 100 lượt ngày 21–24/11 → chu kỳ
  [01/11, 01/12) đã dùng 300, còn 0. Ngày 25/11 G bị thu hồi → mốc 20/11, chu kỳ [20/11, 20/12) đã dùng 100 → còn 200.
- **Bớt lượt (B5E28, dòng 547):** Lan dùng 300 lượt ngày 16–29/11. Từ 30/11 mốc là 15/11, chu kỳ [15/11, 15/12) đã dùng 300 → **0 lượt tới 15/12**. Nhật ký
  ghi phương án (i) chủ dự án tạm chốt là "chỉ ngày hết hạn Pro chuyển sang 15/12, **chu kỳ lượt AI giữ như cũ**" (nhật ký dòng 499-500, 514-518); §2 D19 (dòng
  82) cũng viết "chu kỳ lượt giữ như cũ". Phần 2 của design (đã duyệt) thêm "theo mốc của nguồn còn lại", nhưng con số cụ thể chưa được đưa ra.
- Chưa nói nguồn nào tính vào mốc: cấp tay "con số riêng" khi đã có nguồn Pro (dòng 205 chỉ nói "cho tài khoản không có nguồn Pro"), gói `grace`, `trialing`
  có `trial_denied`, lần cấp có `starts_at` ở tương lai.

**Đề xuất.** Sửa câu trong ngoặc; đưa hai ví dụ trên vào 5.5 và B5E28 kèm con số; liệt kê trạng thái nguồn nào tính vào mốc; bảng ví dụ này là đầu vào của
unit test "mốc đổi khi nguồn sớm nhất hết" (dòng 632). Chủ dự án xác nhận hệ quả hoặc chọn cách khác (Q2). Ghi chú kỹ thuật: cách "giữ nhịp cũ" cần lưu mốc
đang dùng (hiện không có bảng trạng thái theo người, D28).

### R9 (Trung bình) — email: trạng thái gửi, thử lại, cửa sổ gửi

**Vấn đề.** `entitlement_notices` chỉ có `sent_at` (dòng 224). `MailDispatcher.runNow` không trả kết quả; lỗi và hết hạn mức chỉ được log
(`src/common/mail/mail-dispatcher.service.ts:34-36, 66-82`). Ghi dòng chống trùng **trước** khi gửi (để đạt B5E60, hai tiến trình) thì lần gửi lỗi không bao
giờ được thử lại (trái B5E61 "job thử lại giờ sau"); ghi **sau** khi gửi thì hai tiến trình gửi hai lần. Code đã có cách giải đúng bài này cho email nhắc học:
dòng `reminder_deliveries` với `sending | sent | failed`, `classifyMailError`, gọi thẳng `MailBudget.tryConsume` và `Mailer.send`
(`src/notifications/scheduler/reminder-send.service.ts:45-91`, `prisma/models/notifications.prisma:10-23`). Ngoài ra chưa định nghĩa:
- Email bắt đầu trial gửi lúc áp sự kiện (bảng dòng 488) hay do job (dòng 496)? Cảnh báo trần gửi trong `reserve` hay do job? (ảnh hưởng B5#4, B5#16.)
- Job trễ (API tắt) tới sau `trial_ends_at` thì còn gửi nhắc trial không; sự kiện trial tới muộn hơn mốc nhắc thì gửi cả hai cùng lúc?
- `trial_denied` (D30) thì không được gửi "bắt đầu trial" và "nhắc trial"; trial đã đặt hủy thì có nhắc không.
- `subject_id` vừa là UUID gói vừa là ngày (dòng 224) → cột phải là text; `period_key` của từng loại chưa ghi.

**Đề xuất (kỹ thuật).** Thêm `state` (`sending`/`sent`/`failed`) và `attempts` cho `entitlement_notices`, dùng lại cách gửi của nhắc học; mỗi loại email có cửa
sổ `[due, deadline)` (nhắc trial: deadline = `trial_ends_at`); không gửi email trial khi `trial_denied`; ghi chỗ gửi của từng loại; `period_key` từng loại.
Trial đã đặt hủy có nhắc hay không: Đề xuất "không" (không còn lần trừ tiền để báo), chủ dự án duyệt khi đọc.

### R10 (Trung bình) — `fetchState` và trạng thái của bộ nối giả

**Vấn đề.** Dòng 330-331: "Bộ nối có `fetchState` thì áp trạng thái hỏi lại được thay vì tin thứ tự". Bộ nối giả có `fetchState` (dòng 315-316). Vậy B5#10
(dòng 609, "`expired` cũ thành `stale`") kiểm đường nào? Nếu luôn hỏi lại thì không bao giờ có `stale` với bộ nối giả. "Trạng thái thật" của bộ nối giả nằm ở
đâu chưa nói: API là tiến trình riêng, `pnpm billing:fake-event` chỉ gửi webhook. `fetchState` lỗi (mạng) thì làm gì cũng chưa có.

**Đề xuất (kỹ thuật).** Ghi: gọi `fetchState` khi nào (mọi sự kiện / chỉ khi `stale` / khi sự kiện không đủ payload), nó ghi đè những cột nào, lỗi thì rơi về
luật thứ tự; bộ nối giả giữ trạng thái theo `external_subscription_id` từ chính các sự kiện đã ký (hoặc một bảng riêng của bộ nối giả) và có cờ tắt
`fetchState` để smoke chạy cả hai đường.

### R11 (Trung bình) — gói "app tự gia hạn" là dòng nào

**Vấn đề.** `subscriptions` unique `(provider, environment, external_subscription_id)` (dòng 220), nhưng thanh toán một lần không có mã gói của nhà cung cấp
(dòng 324 dùng "mã đơn của app + mã giao dịch" cho chống trùng). Chưa định nghĩa: `payment_succeeded` ghi vào dòng nào; mua lại sau `expired` là dòng mới (dòng
357 "Mua lại = gói mới") hay nối dòng cũ (dòng 368 "nối vào cuối kỳ của chính gói đó"); đang có gói tháng mà mua gói năm; `interval` lấy từ đâu; mốc lượt của
lần mua lại.

**Đề xuất (kỹ thuật).** Mã gói tự sinh, ví dụ `app:<user_id>` một dòng mỗi người mỗi nhà cung cấp; còn hạn → nối kỳ (năm nối 365 ngày); đã `expired` → kích hoạt
lại dòng đó với mốc mới = lúc trả; `interval` theo lần trả gần nhất. Thêm B5E.

### R12 (Trung bình) — luật nhập của cấp tay

**Vấn đề.**
- Dòng 447 "con số ngoài khoảng" → 400, nhưng khoảng của `limits` (dòng 219) không được ghi ở đâu. Editor đặt được `practice_sessions_per_day: 1000000`, trái
  ý D5 "không để không giới hạn".
- `starts_at` (dòng 384): được lùi về quá khứ không (mốc chu kỳ lùi theo, đếm cả lượt cũ)? Được đặt ở tương lai không (thu hồi trước khi bắt đầu)?
- `practice_sessions_per_day: 0` → `checkQuota` trả 403 `quota-exhausted` kèm `resets_at` 0 giờ mai, nhưng mai vẫn 0.
- Dòng 381: editor thu hồi được **mọi** lần cấp trên người học, kể cả lần admin đặt "lượt bài AI: 0" để chặn lạm dụng (B5E31) → editor gián tiếp mở lại AI, trái
  tinh thần D6/D7 "editor không cấp lượt AI tùy ý". Đây là câu sản phẩm (Q3).
- `not-found` (dòng 448) chỉ ghi cho API 3, 5; API 2 với `user_id` không tồn tại trả gì chưa có.

**Đề xuất.** Kỹ thuật: khoảng của mỗi khóa = khoảng của cài đặt tương ứng ở mục 13 (cho phép 0); `starts_at` từ lúc cấp trừ vài phút lệch đồng hồ tới tương lai;
con số 0 của kho phiên → lý do `plan-required`, không có `resets_at`; API 2 thêm 404. Q3 cho việc editor thu hồi.

### R13 (Trung bình) — tiêu chí khó kiểm bằng smoke

**Vấn đề.**
- B5#24 (dòng 623): `private_words_per_user` thấp nhất là 1.000 (dòng 476), nên learner phải có hơn 1.000 từ riêng. `POST` từ riêng đi rule `user.write`
  (`src/content/private/my-words.controller.ts:41`), 30 lần/phút (`src/common/config/app-config.ts:98`) → hơn 34 phút chỉ để tạo dữ liệu.
- "Đồng hồ giả" (B5#5, B5#7, B5#11, B5#15): API chạy `SystemClock` (`src/common/common.module.ts:22`), không có đồng hồ giả trong server đang chạy; chỉ còn cách
  lùi ngày bằng SQL như `smoke-buoc-4.mjs:68-69, 500-504`. Cần ghi cột nào được lùi ở bước nào (`trial_ends_at`, `grace_ends_at`, `current_period_end`,
  `expires_at`), để smoke không kiểm chính giả định của nó.
- B5#16 (dòng 615): trần đếm toàn hệ thống trong ngày; các bước trước của smoke (B5#14, #15, #20, #22) đã dùng lượt AI hôm nay → đặt `ai_daily_cap = 2` có thể đã
  chạm trước khi ba người dùng gọi.
- B5#28 (dòng 627) "fake `endTrialNow` được gọi": chưa có chỗ quan sát (log hay dòng DB).
- B5#14: hai lời gọi song song có thể không chồng nhau, nên test qua cả khi thiếu khóa.

**Đề xuất (kỹ thuật).** B5#24: seed bằng `psql` hoặc kiểm cùng luật trên `groups_per_user` (thấp nhất 10) hay `sentences_per_sense` (thấp nhất 5); ghi bảng "bước
smoke → cột lùi ngày"; B5#16 đặt trần = số đã dùng hôm nay + 2; bộ nối giả ghi một dòng hoặc log `fake_end_trial_now`; B5#14 bắn N (ví dụ 20) `reserve` song song
khi còn 1 lượt, mong đúng 1 thành công.

### R14 (Trung bình) — trùng unique bên trong transaction

**Vấn đề.** Trong Postgres, một `INSERT` vi phạm unique (Prisma P2002) làm hỏng cả transaction; bắt lỗi trong JS rồi chạy tiếp sẽ gặp "current transaction is
aborted". `recordPracticeSession` chạy trong transaction ghi đáp án (dòng 154-155); nếu cài bằng `create` + bắt P2002 thì lần trả lời thứ hai của phiên sẽ
rollback cả đáp án. Cùng rủi ro: bước 2 của `reserve`, `refund` (unique `credit`), `entitlement_notices`, chống trùng `billing_events` khi một request chứa nhiều
sự kiện.

**Đề xuất (kỹ thuật).** Ghi vào mục 6/7: dùng `INSERT … ON CONFLICT DO NOTHING` (đã có tiền lệ với index một phần:
`src/content/catalog/entries.service.ts:49`) hoặc kiểm trước dưới khóa (người, kho); không dựa vào bắt P2002 trong transaction dùng chung.

### R15 (Trung bình) — `GET /v1/me/entitlements` dùng `@LearnerContent()`

**Vấn đề.** Dòng 402. `LearnerContentGuard` trả 403 `profile-incomplete` khi chưa có `native_language` (`src/content/learner/learner-content.guard.ts:20-21`).
Tài khoản vừa đăng ký (B5#1, dòng 600, "Người học mới") và staff chưa chọn tiếng mẹ đẻ (B5E41) sẽ nhận 403 thay vì gói Free. Thêm: decorator nằm trong Content
(`src/content/index.ts:23`), nên Entitlements import Content; Bước 7 Content import Entitlements (dòng 139) → vòng import Content ↔ Entitlements, trái hướng một
chiều của D3 (decorator chạy lúc nạp module nên vòng ESM dễ cho `undefined`).

**Đề xuất (kỹ thuật).** API 1 chỉ cần đăng nhập (AuthGuard chung). Email theo ngôn ngữ (dòng 297) cần luật khi `native_language` null (ví dụ tiếng Việt).

### R16 (Thấp) — webhook: raw body, 64 KB, GET

`src/main.ts:13` tắt body parser mặc định, `src/app.setup.ts:10` dùng parser JSON chung 100 kb, không bật `rawBody`. Chữ ký HMAC tính trên JSON đã parse rồi
`stringify` lại sẽ chạy với bộ nối giả nhưng hỏng với bên thật. Nest đang cài (12.1.2) truyền tùy chọn `rawBody` vào `useBodyParser`
(`node_modules/.pnpm/@nestjs+core@12.1.2_*/node_modules/@nestjs/core/nest-application.js:256-257`, repo gốc) → bật `rawBody: true` ở `NestFactory.create` và cho
bộ nối giả ký trên byte thô. Giới hạn 64 KB (dòng 328) khác 100 kb chung: cần parser riêng cho route hoặc kiểm độ dài. VNPay gửi IPN bằng **GET**
(`PAYMENT_PROVIDERS_RESEARCH_2026-10-18.md` dòng 47, 211), route chỉ có `POST` (dòng 426); app chưa có parser `urlencoded`. Không chặn V1, nhưng "cổng chung" nên cho
bộ nối chọn method.

### R17 (Thấp) — bộ nối giả ở production; sự kiện `sandbox`

`AppConfig` không có cờ môi trường (`src/common/config/app-config.ts:28-84`), nên "không bao giờ bật ở production" (dòng 315) chỉ dựa vào cấu hình; bật nhầm cộng lộ
`BILLING_FAKE_SECRET` = ai cũng tự cấp Pro. Đề xuất: đưa vào danh sách kiểm của bước Deploy; route `fake` trả 404 khi tắt. Luật cho sự kiện `environment =
sandbox` khi chạy production chưa có (store có thể gửi giao dịch sandbox tới server thật, chưa kiểm) → ghi cho lúc viết bộ nối thật.

### R18 (Thấp) — email thanh toán và phần dành cho OTP

`MailDispatcher` gọi `tryConsume()` không trần (`src/common/mail/mail-dispatcher.service.ts:71`); nhắc học dùng trần 80% (`src/notifications/provider/email.provider.ts:26`,
`REMINDER_MAIL_SHARE` ở `src/common/mail/mail-budget.service.ts:10`). Email thanh toán "đi như OTP" (dòng 494) ăn được 20% cuối dành cho OTP, trái B5E61 "không chặn
OTP". Đề xuất: `tryConsume({ ceiling: 0.95 })` (`mail-budget.service.ts:35, 55`), vẫn ngoài trần 80% như chủ dự án duyệt.

### R19 (Thấp) — job chạy song song

`MaintenanceScheduler` ghi "chạy cùng job trên nhiều instance là vô hại: mọi job chỉ xóa hoặc null dòng hết hạn" (`src/common/maintenance/maintenance.scheduler.ts:12-13`).
Job Bước 5 (áp lại sự kiện `failed`/`pending`, gửi email, ghi trạng thái theo thời gian) không vô hại. Đề xuất: lấy dòng bằng `FOR UPDATE SKIP LOCKED`, phần áp sự
kiện đọc lại `status` dưới khóa và bỏ qua dòng không còn `pending`/`failed`; sửa chú thích của scheduler.

### R20 (Thấp) — Identity và test có sẵn

Bảng mục 4 (dòng 143) ghi "mới: hàm đọc vai trò"; `getProfile` đã trả `staff_role` (`src/identity/profile/identity.service.ts:15, 34`), chỉ "danh sách email admin
đã xác minh" là mới (`verifiedEmails` không lọc vai trò, `:79-86`). Test B2#67 khẳng định đúng danh sách quyền (`src/identity/identity.types.spec.ts:5-12`) → phải sửa
khi thêm `entitlements.grant`. `entitlements.service.spec.ts:7` tạo service không tham số; các fake `EntitlementsService` trong spec của Practice cần thêm `checkQuota`.
`apps/admin/src/auth/session-store.ts:5` chỉ là kiểu TS, không kiểm lúc chạy → thêm quyền không làm hỏng đăng nhập admin.

### R21 (Thấp) — hoàn lượt và dòng `credit`

Dòng 260-264: "đã dùng" gồm cả dòng `reserved` còn hạn; điều kiện hoàn "đã dùng > 0" vì vậy có thể ghi `credit` khi chỉ có một lượt đang giữ; lượt đó sau bị nhả
→ `credit` thừa trừ vào lượt dùng sau trong cùng chu kỳ ("để dành", trái dòng 264). Đề xuất: điều kiện `confirmed − credit > 0` trong chu kỳ. Ghi `credit` dùng cột
thời gian nào để xếp vào chu kỳ (`confirmed_at` = lúc ghi). Kho phiên đếm theo `local_date` nhưng index chỉ có `(user_id, pool, confirmed_at)` (dòng 223).

### R22 (Thấp) — chữ và nhất quán

- `retry_after` (dòng 248) với header `retry-after` (dòng 444): chọn một (header như 429, cộng extension nếu muốn).
- "≥ số của Free" (dòng 460) với D5 "Pro giới hạn **cao hơn**" (dòng 68).
- Dòng 503 dẫn ER7 và ER10 nhưng không B5E nào ghi hai mã này (nội dung có ở B5E21, B5E36); ER7 còn đòi nêu "thời điểm được dùng lại **hoặc hết hạn**": khi
  gói hết trước ngày làm mới, `resets_at` nên là lúc gói hết hoặc kèm `ends_at`.
- Dòng 192 "`trial` nếu nguồn duy nhất là gói `trialing`": có thêm lần cấp "con số riêng" thì vẫn là `trial`.
- Editor tự cấp cho mình: `self-grant` hay `target-is-staff` (dòng 445, B5E33) — ghi thứ tự kiểm.
- `resets_at` của kho AI khi không có chu kỳ (Free, con số 0): `null`.
- API 1 không trả `reason`, `granted_by` của lần cấp cho người học.
- "Mốc = lúc trừ tiền lần đầu" (dòng 204, B5#6): `occurred_at` của `renewed` hay `current_period_start`.
- "Cố định trong code" (dòng 479) thiếu 64 KB và ngưỡng `pending` 5 phút.
- B5#21 "`granted_by = editor`": `granted_by` là ID người cấp, không phải vai trò.
- `paid_at + 30 ngày` (dòng 367) với chu kỳ lượt theo tháng lịch: ghi rõ là cố ý.

### R23 (Thấp) — `raw_payload`

Dòng 221, 227: `raw_payload` có thể chứa email người mua, giữ không thời hạn, kể cả dòng `ignored` không gắn với ai. Đề xuất: job bảo trì xóa `raw_payload` sau N ngày
(`ASSUMPTION` 90) với dòng `applied`/`ignored`/`stale`; giữ `payload` đã chuẩn hóa.

### R24 (Thấp) — hoàn tiền một phần

Nhật ký dòng 626 (research): hoàn tiền hoặc chargeback từ bên ngoài "có thể một phần". Dòng 363: `refunded` cho kỳ hiện tại → `revoked` ngay, không phân biệt. Hoàn
20% để xoa dịu khách sẽ cắt Pro của người đó. Câu sản phẩm (Q4).

### R25 (Thấp) — D30 trên đường sự kiện

`trial_eligible` đòi email đã xác minh (dòng 288), còn luật ở đường sự kiện (dòng 293-295) chỉ xét `trial_history`: tài khoản chưa xác minh nhận trial từ store vẫn được
Pro. Hai tài khoản cùng thẻ bắt đầu trial cùng lúc: cả hai qua kiểm, một bên vi phạm unique `(provider, payment_fingerprint)` → `failed` → áp lại → `trial_denied`; tự
đúng sau một vòng job nhưng chậm tới một giờ. Ghi rõ hai điểm và thêm B5E.

## 4. Câu hỏi cho chủ dự án

Mỗi câu nêu bối cảnh và các phương án, không phương án nào được đề xuất trước (luật "chủ dự án trả lời trước").

**Q1 (R2) — Gói tự gia hạn qua nhà cung cấp đã qua cuối kỳ (hoặc hết trial) mà Wordmet chưa nhận sự kiện nào.** Bối cảnh: sự kiện gia hạn thường tới trễ vài phút
tới vài giờ; đôi khi mất hẳn. Phương án: (a) vẫn Pro cho tới khi nhà cung cấp báo (`renewed`, `renewal_failed` hoặc `expired`); (b) vẫn Pro thêm một khoảng (ví dụ bằng
`grace_days`) rồi khóa như `on_hold` cho tới khi có sự kiện; (c) khóa ngay ở cuối kỳ cho tới khi có `renewed`; (d) cách khác.

**Q2 (R8) — Người có nhiều nguồn Pro, nguồn có mốc sớm nhất hết.** Ví dụ ở R8: có lúc người học được thêm 200 lượt, có lúc 0 lượt suốt hai tuần. Phương án: (a) như design:
theo mốc của nguồn còn lại, đếm lượt từ đầu chu kỳ của mốc đó; (b) giữ nhịp chu kỳ cũ cho tới khi không còn nguồn Pro nào (cần lưu mốc đang dùng); (c) bắt đầu chu kỳ
mới ngay lúc nguồn cũ hết, số đã dùng về 0; (d) cách khác.

**Q3 (R12) — Editor thu hồi lần cấp có con số lượt AI do admin đặt** (ví dụ "lượt bài AI: 0" để chặn một tài khoản lạm dụng). Phương án: (a) được, như luật hiện tại
(mọi lần cấp trên người học); (b) không, lần cấp có khóa lượt AI chỉ admin thu hồi; (c) editor chỉ thu hồi lần cấp do editor tạo; (d) cách khác.

**Q4 (R24) — Hoàn tiền một phần từ store, nhà cung cấp hoặc ngân hàng cho kỳ hiện tại.** Phương án: (a) như hoàn toàn phần: mất Pro ngay; (b) giữ Pro, chỉ ghi lại;
(c) cắt ngắn kỳ theo tỉ lệ tiền hoàn; (d) cách khác.

## 5. Gợi ý chia plan

Khối lượng (`ASSUMPTION`, theo cỡ Bước 3 = 22 task, Bước 4 = 20 task): khoảng 28–34 task, lớn hơn Bước 4. Đề xuất một plan có bốn milestone, hoặc hai plan nối tiếp
(5a = M1–M2 kèm phần smoke tương ứng; 5b = M3). Lý do tách: V1 không thu tiền (F35), pilot chỉ cần M1–M2 (cấp tay, hạn mức, Practice); R1–R3, R9–R11 chỉ chặn M3.
Trade-off của hai plan: thêm một lần review và một bản as-built; đổi lại phần lõi lên `dev` sớm mà không chờ cổng thanh toán.

| Luồng | Nội dung | Phụ thuộc | Milestone |
|---|---|---|---|
| A | Settings: nhóm `entitlements`, `content`, khóa mới của `learning`, luật chéo Pro ≥ Free; Learning và Content đọc 4 giới hạn từ Settings | — | M1 |
| B | Identity: `entitlements.grant`, danh sách email admin; sửa test quyền | — | M1 |
| C | `entitlements.prisma` + migration; hàm thuần: tính gói từ nguồn, mốc và chu kỳ, đếm đã dùng, luật cấp tay, máy trạng thái (ma trận R3); unit theo bảng ví dụ | — | M1 |
| D | Sổ lượt: `checkQuota`, `recordPracticeSession`, `reserve`/`confirm`/`release`/`refund`, công tắc, trần, khóa; `pnpm entitlements:fake-ai`; sửa Practice (R4, R14) | C | M2 |
| E | API cấp tay, thu hồi, lịch sử, xem một người, `ai-usage`, `GET /v1/me/entitlements` (R15) | C, B | M2 |
| F | Cổng thanh toán: route webhook (R16), giao diện bộ nối, bộ nối giả + `pnpm billing:fake-event`, hộp sự kiện, áp sự kiện, thứ tự (R1), `fetchState` (R10), trial và D30, app tự gia hạn (R11) | C | M3 |
| G | Email và job (R9, R18, R19): thông báo trial, nhắc trial, báo trước, sắp hết hạn, cảnh báo trần; chuyển trạng thái theo thời gian (R2) | F, D | M3 |
| H | `pnpm smoke:buoc-5` (R13), sửa `smoke:buoc-4` (R5), as-built `docs/deliveries/buoc-5.md` | tất cả | M4 |

A, B, C song song; sau C thì D, E, F song song; G sau F. Mỗi milestone một PR vào `dev` như Bước 4.

## 6. Đã kiểm và không thấy vấn đề

- **Hiện trạng ở mục 1 khớp code:** `Feature = 'practice.basic'`, `check` luôn cho phép (`src/entitlements/entitlements.service.ts:3, 11-13`); Practice gọi `check` ở
  `start` và trong `next` khi có câu để tạo, từ chối 403 `entitlement-required` (`src/practice/sessions/sessions.service.ts:42-43, 69, 198-200, 277`); bốn hằng số và
  chỗ dùng (`learning/groups/groups.service.ts:49`, `learning/items/items.service.ts:63, 83`, `content/private/private-words.service.ts:134`,
  `content/sentences/sentences.service.ts:38`); quyền (`src/identity/identity.types.ts:4-11`).
- **Móc ghi nhận phiên (câu hỏi riêng của người giao việc):** `writeFinal` là chỗ duy nhất ghi kết quả cuối (`src/practice/answers/answers.service.ts:111-121`), dùng cho
  cả trả lời (`:78`) và Bỏ qua (`:92`); `void` ghi ở chỗ khác (`src/practice/sessions/sessions.service.ts:312-315`), đúng ý "không tính `void`". `writeFinal` chạy trong
  transaction đã khóa dòng phiên `FOR UPDATE` (`answers.service.ts:146-150`), và `local_date` được tính ngay đó (`:118`) → `recordPracticeSession(tx, …)` cùng
  transaction làm được; "câu đầu có kết quả cuối" xác định an toàn race bằng một `INSERT … ON CONFLICT DO NOTHING` theo `session_id` (R14) mà không cần đếm. Tiền lệ
  module khác nhận transaction của Practice: `src/learning/practice/practice-review.service.ts:31`. Một phiên mở mỗi người: index một phần
  (`prisma/migrations/20261018150000_practice/migration.sql:133`).
- **Settings:** số để trống (`nullable`) đã có cơ chế (`src/settings/settings.definitions.ts:39, 50, 72, 83, 110`; lưu JSON null ở `src/settings/settings.service.ts:70-71`),
  mặc định null đã có (`typeWordMaxRetries`), boolean đã có (`reminders.enabled`), luật chéo đã có chỗ (`settings.definitions.ts:130-137`) → `ai_cap_alert_percent`,
  `renewal_notice_days_before`, `expiry_notice_days_before`, `ai_enabled`, Pro ≥ Free làm được. Thêm nhóm cần sửa `FIELDS` và danh sách nhóm cứng trong
  `toApiValues` (`:115`). `get()` đọc DB mỗi lần, không cache (`settings.service.ts:36-43`) → "có hiệu lực ở lần kiểm kế tiếp" và B5#23 đúng. Settings chỉ import
  Identity, Learning đã import Settings, Content import Settings không tạo vòng.
- **Quyền staff:** guard đọc vai trò từ DB mỗi request (`src/identity/staff/permission.guard.ts:29-35`) → "người nhận sau đó thành staff" được xét đúng lúc thu hồi.
- **Đường email thiết yếu có sẵn:** OTP đi `MailDispatcher.afterResponse` → `tryConsume()` không trần (`src/identity/auth/otp.service.ts:84`,
  `src/common/mail/mail-dispatcher.service.ts:71`), nhắc học có trần 80% → "không bị trần 80%" làm được (xem R9, R18 về cách gắn).
- **Khóa advisory:** mẫu `pg_advisory_xact_lock(hashtextextended(…))` có ở nhiều module (`practice/practice-lock.ts:8`, `learning/learning-lock.ts:5`,
  `content/private/private-words.service.ts:79`); thứ tự "người trước, chung sau" của một lần `reserve` không tự deadlock (xem R6 cho nhiều lần trong một transaction).
- **Idempotency cho API 2:** interceptor khóa theo `(key, user, path)` và băm body (`src/common/idempotency/idempotency.interceptor.ts`) → B5E37 làm được (khác body → 400).
- **Problem Details** có `extensions` (`sessions.service.ts:44-46`) → `resets_at`, `reason` làm được. Rule `user.write` có sẵn cho API 2, 3.
- **Bảo trì và smoke:** `MaintenanceScheduler` chạy mỗi giờ trong tiến trình API (`maintenance.scheduler.ts:8, 54`), `pnpm maintenance:run` chạy tay được cho smoke;
  smoke Bước 4 đã có mẫu `psql` lùi ngày (`scripts/smoke-buoc-4.mjs:68-69`). CI không chạy smoke và không đòi biến môi trường mới nếu `BILLING_FAKE_*` là tùy chọn
  (`.github/workflows/ci.yml`; `.env.example`).
- **Raw body:** Nest 12.1.2 đã cài hỗ trợ `rawBody` cùng `useBodyParser` (xem R16) → kiểm chữ ký trên byte thô làm được.
- **Decision record ↔ design §2 ↔ nhật ký:** đối chiếu D1–D30 từng dòng; ngoài R8 (cách đọc "chu kỳ giữ như cũ") không thấy chỗ nói khác. Con số D18 khớp mục 13;
  D29, D30 khớp mục 8, 13, 14, B5E55, B5#28; bảng quyền D6–D8 khớp mục 10 và B5E33–B5E38.
- **Đánh số:** B5E1–B5E65 và B5#1–B5#28 liên tục, không trùng; các tham chiếu mục (4, 5.5, 7.3, 7.4, 9.4, 13, 14) trỏ đúng chỗ.
- **Edge case theo `SPEC_WRITING_CONVENTIONS.md`:** 11/13 luật cấp trên được dẫn ở dòng 503 có B5E ghi đúng mã (ER7, ER10 có nội dung nhưng không ghi mã, R22);
  SR11 (B5E59) chỉ kiểm được khi Bước 8 có trạng thái "đang xóa" (bảng `users` hiện chỉ có `status` mặc định `active`, `prisma/models/identity.prisma:8`), đúng như design ghi.

**Chưa kiểm được:** hành vi thật của nhà cung cấp (độ trễ `renewed` của Paddle/Stripe, store gửi giao dịch sandbox tới server thật, hoàn tiền một phần) chỉ dựa vào
research, không đọc lại tài liệu gốc; `createMany({ skipDuplicates })` của Prisma với index một phần không thử (R14 đề xuất SQL thô có tiền lệ); không chạy build,
test hay smoke nào.
