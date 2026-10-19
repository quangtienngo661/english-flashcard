# Bước 5 — plan tóm tắt (19/10/2026)

Ảnh chụp lúc trình plan, chưa duyệt. Plan đầy đủ: [`../superpowers/plans/2026-10-19-buoc-5-entitlements.md`](../superpowers/plans/2026-10-19-buoc-5-entitlements.md);
design: [`../superpowers/specs/2026-10-19-buoc-5-entitlements-design.md`](../superpowers/specs/2026-10-19-buoc-5-entitlements-design.md).
Plan **chỉ có API** (D2); giao diện làm ở đợt sau.

Cách làm: các phiên Claude implement song song, một phiên điều phối (D27); **tối đa 4–5 phiên** (chủ dự án 19/10): ba phiên
implement và phiên điều phối, phiên điều phối tự chạy phần kiểm cuối. "Xong khi": xong mọi task, CI xanh trên mọi PR,
`pnpm smoke:buoc-5` chạy qua API thật trên DB mới hai lần (có và không có "hỏi lại trạng thái"), và `pnpm smoke:buoc-4` vẫn qua (D26, R5).

**Chia phiên:**
- **step-5-A — Nền móng, rồi Practice:** task 4 (merge trước tiên vì hai phiên kia chờ nó), 1, 2, 3; sau đó task 11 khi step-5-B xong 9–10.
- **step-5-B — Phần lõi:** task 5, 6, 9, 10, 12, 13, 14; bắt đầu khi task 4 đã merge.
- **step-5-C — Thanh toán và email:** task 7, 8, 15, 16, 17, 18, 19; bắt đầu khi task 4 đã merge.
- **step-5-coordinator (phiên điều phối):** commit và merge plan; tự mở step-5-A, rồi step-5-B và step-5-C (khi PR C1 đã merge) thành phiên con;
  merge các PR, báo phiên đang chờ; cuối cùng tự làm task 20–21 (kiểm cuối).
Muốn tách phần kiểm cuối ra một phiên riêng thì thành 5 phiên; không đổi gì khác.

**Cập nhật 19/10/2026 sau review plan** ([`../superpowers/reviews/2026-10-19-buoc-5-plan-review.md`](../superpowers/reviews/2026-10-19-buoc-5-plan-review.md),
21 phát hiện; chủ dự án: "sửa đi"): đã sửa hết phần kỹ thuật trong plan. Câu Q3 đã chốt thành **D35**: chỉ nhận gói tự gia hạn, người dùng
không phải nhớ ngày và tự trả; bỏ kiểu "app tự gia hạn" khỏi lõi (không còn sự kiện "thanh toán một lần", email "báo sắp hết hạn" và cài đặt của
nó). Câu Q4 đã chốt thành **D36**: bỏ email cảnh báo trần AI; API lượt AI của admin trả cờ "đã chạm ngưỡng" để màn admin tô vàng (đợt giao diện).
Câu Q2 đã chốt thành **D37**: bộ nối bắt buộc gửi mã giao dịch mỗi khi có trừ tiền (kể cả khi đổi tháng → năm); vẫn thiếu mã thì hoàn tiền chỉ
ghi lại và log, không cắt Pro. Câu Q1 đã chốt thành **D38**: muốn kéo dài hay dời ngày thì staff sửa ngày của chính lần cấp đó (API mới, có lịch sử
sửa), không tạo lần cấp mới; lần cấp Pro mới bắt đầu ở tương lai không thu hồi lần cũ. **Không còn câu nào chờ chủ dự án**; plan sẵn sàng để duyệt.

**Chọn kỹ thuật trong plan** (design không ghi; ghi vào design khi xong; đánh số như plan):
1. Thêm một cờ cấu hình báo "đây là production" (hiện chưa có), để production bỏ qua sự kiện `sandbox` và không bao giờ bật bộ nối giả.
2. Practice gọi "ghi nhận phiên" ở mọi lần ghi kết quả cuối; lần đầu được lưu, các lần sau bị bỏ qua — đúng nghĩa "câu đầu có kết quả".
3. Thêm ba cột (giao dịch đã trả cho kỳ đang dùng — để biết hoàn tiền có phải của kỳ đang dùng không, D34; mã gói của nhà cung cấp và mã
   người dùng gốc trên sự kiện) và một bảng riêng của bộ nối giả.
4. Endpoint nhận thông báo thanh toán đọc body thô bằng một bộ đọc riêng cho đúng đường đó, đặt trước bộ đọc JSON chung.
5. Lệnh thử lượt AI là một lệnh chạy trên máy (như `maintenance:run`), không mở endpoint test nào.
6. Chuyển hàm phân loại lỗi gửi email từ phần nhắc học sang phần mail chung, để Entitlements dùng được mà không phụ thuộc phần nhắc học.
7. ~~Email cảnh báo trần AI do job mỗi giờ tạo~~ — bỏ theo D36: không còn email cảnh báo; cờ "đã chạm ngưỡng" tính lúc đọc.

**M1 — Nền móng (luồng A, B, C, D)**
1. Thêm 15 cài đặt nhóm `entitlements`, nhóm mới `content` (từ riêng, câu ngữ cảnh) và hai giới hạn mới của `learning` (số nhóm, số từ mỗi nhóm).
2. Learning và Content đọc bốn giới hạn từ cài đặt thay cho hằng số; dữ liệu đang vượt mức mới giữ nguyên, chỉ chặn thêm mới.
3. Thêm quyền `entitlements.grant` cho `admin` và `editor`.
4. Bảng dữ liệu của Entitlements (lần cấp, lịch sử sửa ngày lần cấp, gói đăng ký, hộp sự kiện, lịch sử trial, sổ lượt, email cần gửi, bảng của bộ nối giả), các hằng số cố định và khóa.
5. Tính chu kỳ tháng theo mốc (31/01 → 28/02 → 31/03), ngày theo giờ Việt Nam cho trần AI, 0 giờ ngày mai theo giờ người học.
6. Tính "người này đang ở gói nào, mốc chu kỳ nào, mỗi kho được bao nhiêu" từ gói đăng ký và các lần cấp; chuyển trạng thái gói theo thời gian.
7. Máy trạng thái gói đăng ký theo đủ bảng trạng thái × sự kiện; luật thứ tự sự kiện (trạng thái theo thời điểm, cộng thêm luôn áp).
8. Giao diện chung của bộ nối nhà cung cấp, sổ đăng ký bộ nối, chữ ký và cách đọc sự kiện của bộ nối giả.

**M2 — Phần lõi (luồng E, F)**
9. Dịch vụ Entitlements thật: kiểm quyền có lý do, kiểm hạn mức phiên luyện, ghi nhận phiên, bức tranh gói của một người (lượt còn, ngày làm mới, quảng cáo, được trial không).
10. Sổ lượt AI: giữ, xác nhận, nhả, hoàn lượt; trần toàn hệ thống và công tắc AI (chỉ xếp hàng ở khóa chung khi đã qua các bước kiểm theo
    người; không mở thêm kết nối DB khi đang giữ khóa); job đánh dấu lượt giữ quá 2 phút.
11. Practice kiểm hạn mức phiên sau khi đóng phiên cũ, trả `quota-exhausted` kèm giờ làm mới, ghi nhận phiên khi câu đầu có kết quả.
12. Cấp tay: luật admin/editor, cấp gói là gói mới (lần cấp bắt đầu ngay thu hồi lần cũ, bắt đầu ở tương lai thì không; tắt tự gia hạn của gói trả tiền khi staff xác nhận), con số riêng, thu hồi, sửa ngày lần cấp (có lịch sử sửa), lịch sử có lọc.
13. API đọc: người học xem gói của mình; staff xem gói một người; admin xem lượt AI trong ngày so với trần, kèm cờ "đã chạm ngưỡng cảnh báo".
14. Lệnh thử lượt AI trên máy (giữ/xác nhận/nhả/hoàn, chạy song song nhiều lần, cho một hoặc nhiều người dùng cùng lúc) cho smoke.

**M3 — Thanh toán và email (luồng G, H)**
15. Cấu hình thanh toán (cờ production, bật bộ nối giả, khóa ký, tắt "hỏi lại trạng thái") và bộ nối giả có giữ trạng thái.
16. Endpoint nhận thông báo của nhà cung cấp (đọc raw body, tối đa 64 KB, nhận cả GET), lưu vào hộp sự kiện, chống trùng, trả lời ngay; lệnh gửi sự kiện giả.
17. Áp sự kiện vào gói: luật thứ tự, hỏi lại trạng thái khi cần (sau khi đã nhả khóa), luật một trial (tài khoản và thẻ; chỉ khi sự kiện thật
    sự bắt đầu một trial), môi trường, người dùng không nhận ra, hoàn tiền kỳ đang dùng.
18. Job thanh toán: thử áp lại sự kiện lỗi, chuyển trạng thái theo thời gian (kể cả gói quá kỳ chưa có thông báo; không ghi đè thay đổi vừa
    tới), xóa payload gốc sau 90 ngày.
19. Email: bắt đầu trial, nhắc trial, báo trước gia hạn (mặc định tắt); gửi từng email một;
    trần 95% hạn mức email.

**M4 — Kiểm cuối (luồng Z)**
20. Sửa `smoke:buoc-4` để learner của nó được cấp thêm số phiên (sau Bước 5 learner đó là Free, 3 phiên/ngày).
21. Viết `smoke:buoc-5` chạy đủ B5#1–B5#35 và các ca chạy đua với 10 request song song (cả nhiều người dùng cùng lúc); chạy hai lần, có và
    không có "hỏi lại trạng thái"; ghi as-built.

# Bước 5 — as-built (19/10/2026)

Design: [`2026-10-19-buoc-5-entitlements-design.md`](../superpowers/specs/2026-10-19-buoc-5-entitlements-design.md) (mục 0 có bảng "Khi implement" và
ghi chú as-built ở cuối mục 0); decisions D1–D40: [`2026-10-19-buoc-5-entitlements-decisions.md`](../superpowers/decisions/2026-10-19-buoc-5-entitlements-decisions.md);
plan: [`2026-10-19-buoc-5-entitlements.md`](../superpowers/plans/2026-10-19-buoc-5-entitlements.md). **Chỉ API** (D2); giao diện làm ở đợt sau.

**Trạng thái:** 21 task đã vào `dev`; mỗi PR CI xanh (4/4 job) trước khi merge. Chưa lên `main`. Làm bằng ba phiên Claude song song
(step-5-A, step-5-B, step-5-C) và phiên điều phối step-5-coordinator (D27), không dùng Codex. Theo chủ dự án 19/10, step-5-B và step-5-C được mở
ngay, không chờ PR C1 merge: hai phiên cắt nhánh từ nhánh của C1 và chỉ mở PR sau khi C1 đã merge.

| PR | Phiên | Nội dung |
|---|---|---|
| #62 | điều phối | Docs: plan, review plan, D35–D38, research gia hạn tay, `CLAUDE.md` |
| #63 C1 | A | Task 4: schema 8 bảng, migration `20261019094400_entitlements`, hằng số, khóa |
| #64 A1 | A | Task 1–2: cài đặt nhóm `entitlements`, `content`, hai giới hạn `learning`; Learning và Content đọc giới hạn từ Settings |
| #65 B1 | A | Task 3: quyền `entitlements.grant` |
| #66 C2 | B | Task 5–6: chu kỳ và nửa đêm theo múi giờ; tính gói, mốc, giới hạn; chuyển trạng thái theo thời gian |
| #67 D1 | C | Task 7–8: máy trạng thái 91 ô, thứ tự sự kiện, cổng bộ nối, định dạng bộ nối giả |
| #68 E1 | B | Task 9–10: dịch vụ Entitlements, sổ lượt AI (giữ, xác nhận, nhả, hoàn), trần và công tắc AI, job lượt giữ quá hạn |
| #69 G1 | C | Task 15–16: cấu hình thanh toán, bộ nối giả có trạng thái, webhook, `pnpm billing:fake-event` |
| #70 F1 | A | Task 11: Practice kiểm hạn mức phiên, ghi nhận phiên ở kết quả cuối đầu tiên |
| #71 G2 | C | Task 17–18: áp sự kiện, job thanh toán |
| #73 H1 | C | Task 19: email trial và gia hạn |
| #72 E2 | B | Task 12–14: cấp tay (tạo, thu hồi, sửa ngày, lịch sử), API đọc, `pnpm entitlements:fake-ai`; sửa `getProfile(userId, tx?)` |
| #74 G3 | C | **Ngoài plan, D39:** hỏi lại nhà cung cấp sau khi hoàn tiền cắt Pro; job hỏi lại 3 ngày; bộ nối giả nhớ giao dịch kỳ đang dùng (migration `20261019111147_fake_billing_transaction`) |
| #75 G4 | C | **Ngoài plan:** bộ nối giả tính lại trạng thái từ mọi sự kiện theo `occurred_at` (B5E102; migration `20261019112136_fake_billing_history`) |
| #76 Z1 | điều phối | Task 20–21: `smoke:buoc-4` có bước cấp lượt, `pnpm smoke:buoc-5`, D39 vào design và decision record, as-built này |
| #77 G5 | C | **Ngoài plan, D40:** `plan_changed` khi gói đang `grace` → `active`, xóa `grace_ends_at`, mốc mới; bộ nối giả cũng về `active` |
| PR docs | điều phối | D40 vào design và decision record; cập nhật as-built này |

Thứ tự merge thật: C1, A1, B1, C2, D1, E1, G1, F1, G2, H1, E2, G3, G4, Z1, G5. G2 và H1 merge trước E2, vì E2 phải merge `dev` lại do xung đột một dòng ở
`entitlements.module.ts`. Phiên điều phối tự gỡ xung đột E1–G1 cho G1: gộp hai danh sách provider, rồi chạy lint, tsc, build, 1137 test trước khi push.

**Số test:**
- Unit API: **1338** (97 file) sau G5 #77 (1336 trên `dev` @ `4357411` và nhánh Z1); cuối Bước 4 là 772. Theo PR (trên nhánh hoặc trên bản gộp với `dev`
  lúc mở PR): C1 775, B1 773, A1 790, C2 828, D1 973, E1 1100, F1 1110, G1 1137, G2 1176, H1 1212, E2 1316, G3 1333, G4 1336, G5 1338.
- Không có e2e backend (D38 Bước 4). Lần cuối trên Z1: lint 0 lỗi (1 cảnh báo cũ ở `mail-dispatcher.service.ts`), `tsc --noEmit` 0, build qua,
  `prisma migrate diff --exit-code` 0.

**"Xong khi" (D26):**
1. CI xanh trên mọi PR (#62–#77).
2. `pnpm smoke:buoc-5` qua API và worker thật, mỗi lần trên database mới `english_learning_smoke_b5`:
   - fetchState **bật**: **ALL CHECKS PASSED**, 39 bước, 206 giây (run id `dcbc35d7`);
   - fetchState **tắt**: **ALL CHECKS PASSED**, 39 bước, 207 giây (run id `6fd0071b`).
3. `pnpm smoke:buoc-4` (B5#34) trên cùng code, database mới: **ALL CHECKS PASSED**, 20 phiên, 47 câu trả lời (run id `e8ba4423`). Trước khi thêm
   bước cấp lượt, nó hỏng đúng ở phiên thứ 4 với 403 `quota-exhausted`.
Output đầy đủ: [`buoc-5-smoke-output.txt`](buoc-5-smoke-output.txt). Log API của hai lần chạy `smoke:buoc-5`: 0 dòng mức `error`; không có email nào
(`@example.com`: 0 dòng), không có lý do cấp, không có `raw_payload`. Đối chứng: log có 20 dòng `entitlement_grant_created`, 1 dòng `trial_reuse_detected`, và
ở chế độ bật có 3 dòng `billing_state_refetched` (B5#10 sự kiện cũ, B5#12 và B5#33 hỏi lại sau hoàn tiền, D39).

Smoke kiểm: B5#1–B5#33 và B5#35 theo thứ tự plan (B5#3 trước B5#2), cộng ba ca chạy đua (Review Focus 1), đọc lại bằng `psql`:
- **B5E73:** 10 vòng "mở phiên mới" đua với "câu trả lời đầu của phiên đang mở" khi đã có 2 phiên được tính. Mỗi vòng đúng một bên thắng, và không
  lần nào quá 3 phiên được tính. Cả 10 vòng đều là câu trả lời thắng, nên nhánh "mở phiên thắng" chỉ được unit test giữ.
- **B5E1 / B5#14:** 10 lần giữ lượt song song khi còn 1 lượt → 1 `reserved`, 9 `quota-exhausted`; `usage_records` có đúng 1 dòng `reserved`.
- **B5E11:** 10 người, trần toàn hệ thống còn 1 lượt → 1 `reserved`, 9 `ai-unavailable`.

Script được sửa nhiều lần trước khi qua; mọi lần đều là lỗi của script hoặc của cách chạy, không phải lỗi sản phẩm:
- **"fetch failed" sau các khoảng nghỉ:** gặp ở B5E73 sau 60 giây chờ, và ở B5#22 sau khoảng 4 giây chạy hai lệnh CLI. API và worker vẫn sống; runner
  ghi mã thoát của từng tiến trình để kiểm. Server đóng kết nối keep-alive để không sau 5 giây, đúng lúc client gửi lại trên kết nối đó →
  `ECONNRESET`. Smoke giờ thử lại tối đa hai lần khi lỗi mạng và in nguyên nhân; mỗi lần chạy còn gặp đúng một lần, ở B5#22.
- **Đọc sai nguyên nhân lúc đầu:** phiên điều phối tưởng có thứ bên ngoài dừng worker (mã 143). Thật ra mã 143 là do chính runner dừng tiến trình sau
  khi smoke đã hỏng.

**Chỗ lệch plan đã chấp nhận** (chi tiết trong body từng PR và trong ghi chú bàn giao của các phiên):
- C1: không có CHECK cho `billing_events.type` (danh sách loại thuộc track D) và `revoke_reason` (chữ tự do).
- A1: `SettingsService.get(tx?)`, để Learning và Content đọc giới hạn qua `tx` khi đang giữ khóa người học. Mặc định từ riêng 1.000 → 10.000 và
  câu/nghĩa 5 → 20, đúng D18.
- C2: `grace` không có `grace_ends_at` hết ở `current_period_end + grace_days` (D23); `grace` đã đặt hủy hết ở `grace_ends_at` thành `expired`;
  `trialing` không có `trial_ends_at` dùng `current_period_end`.
- D1, G1: `applyFetched` theo luật phiên điều phối chốt (ghi vào design mục 9.2): ngày null không ghi đè; kỳ đổi → `current_transaction_id` null;
  `grace_ends_at` chỉ giữ khi `grace` → `grace`. Plan ghi "chỉ ghi đè sáu cột".
- E1: **B5E76 không đạt.** `confirm` làm việc trên dòng `use` mới nhất (bảng R7 của design 7.1), mà API chỉ có `operation_id`. Hai cách đều trừ tối đa
  1 lượt mỗi thao tác. Khóa theo lần thử để Bước 7 xem lại.
- E2: `IdentityService.getProfile(userId, tx?)` (sửa file của Identity, phiên điều phối cho phép), để `checkQuota(tx)` không mở kết nối thứ hai khi
  Practice đang giữ khóa (plan review #2, step-5-A phát hiện sau F1). Phần rà mọi đường đang giữ khóa nằm trong body PR #72.
- G3, G4: hai PR ngoài plan và hai migration mới (plan ghi "chỉ Task 4 thêm migration"). Tên thư mục migration đều mới hơn mọi migration trên `dev`
  lúc merge.
- Z1: smoke tạo learner bằng `psql` (đăng ký chỉ cho 5 lần mỗi IP mỗi giờ) và đọc gói của họ qua `GET /v1/admin/entitlements/users/{id}`.
  B5#24 dùng 1.000 dòng SQL và giới hạn 1.000 (mức thấp nhất cho phép), thay cho 10.001 dòng. Runner chạy không có `.env`: cấu hình lấy từ
  `.env.example`, secret sinh trong shell (hook chặn ghi `.env` bằng script).

**Rủi ro còn mở** (design mục 19, thêm phần thấy trong lúc làm):
- Mọi rủi ro của design mục 19 vẫn còn: pháp lý (cần luật sư trước khi bán), không có e2e backend, khóa chung của trần AI chưa đo dưới tải, trần tính bằng
  lượt, mốc chu kỳ khi nhiều nguồn chồng nhau, store không tắt được tự gia hạn khi staff cấp Pro (D32, xử lý sau), mã thẻ không phải bên nào cũng có, D35
  thu hẹp lựa chọn ở Việt Nam, mọi con số là `ASSUMPTION`, sau Bước 5 mọi tài khoản là Free.
- **D39 chỉ tự sửa khi bộ nối có `fetchState`.** Bộ nối không có thì tin hoàn tiền tới sai thứ tự có thể cắt Pro nhầm (B5E102, B5E103).
- **B5E76 không đạt** (xem trên).
- **Các điểm nhỏ để lại** (review độc lập của step-5-B):
  - `zonedMidnight` chọn nửa đêm thứ hai ở múi giờ phía đông khi nửa đêm lặp lại; 2026–2030 không có múi nào như vậy.
  - Hai lần cấp Pro "bắt đầu ngay" đua nhau có thể cùng còn hiệu lực.
  - `page_token` bị sửa tay với id không phải uuid trả 500.
  - Bước cập nhật `paid_renewal_action` sau commit mà lỗi thì lần thử lại có thể tạo lần cấp thứ hai.
  - Log của thu hồi và sửa ngày ghi trước commit.
- Smoke chạy đua chỉ kiểm trên một máy, với Postgres và Redis local.
- **Hai lần smoke chạy trước G5 #77.** G5 chỉ đổi ô `plan_changed` × `grace` của máy trạng thái và bộ nối giả; không bước smoke nào đi qua ô này. G5 được
  kiểm bằng unit test (bảng 91 ô, B5E105) và một lần chạy thật trên API của step-5-C. Smoke không thêm bước cho D40.
