# Review độc lập — design "Chuẩn bị launch, đợt B" (04/11/2026)

- **Đối tượng:** [`../specs/2026-11-04-chuan-bi-launch-b-design.md`](../specs/2026-11-04-chuan-bi-launch-b-design.md) (bản ở commit `69c5bc31`, nhánh `docs/launch-prep-design`).
- **Đọc kèm:** decision record [`../decisions/2026-11-04-chuan-bi-launch-b-decisions.md`](../decisions/2026-11-04-chuan-bi-launch-b-decisions.md); code facts
  [`billing`](../../preparation/LAUNCH_PREP_CODE_FACTS_2026-11-04-billing.md), [`ads`](../../preparation/LAUNCH_PREP_CODE_FACTS_2026-11-04-ads.md); design A
  [`../specs/2026-11-04-chuan-bi-launch-a-design.md`](../specs/2026-11-04-chuan-bi-launch-a-design.md); design và decisions Bước 5 (D21, D24, D28, D31, D35, D37, D38);
  `CLAUDE.md`; `docs/specs/SPEC_WRITING_CONVENTIONS.md`.
- **Code:** đọc trực tiếp trên worktree, `apps/**` giống hệt `origin/dev` @ `a6b2bd15` (HEAD chỉ thêm tài liệu). Mọi `path:line` dưới đây tính từ gốc repo.
- **Nguồn ngoài, đọc 04/11/2026:** https://payos.vn/docs/api/ ; https://payos.vn/docs/du-lieu-tra-ve/webhook ; https://payos.vn/docs/du-lieu-tra-ve/return-url ;
  mã nguồn SDK chính thức `payOSHQ/payos-lib-node` nhánh `main` (đọc bằng `gh api`; `src/resources/v2/payment-requests/payment-requests.ts` sửa lần cuối
  2025-08-26, `src/resources/webhooks/webhook.ts`, `src/client.ts`); `npm view @payos/node` → `2.0.5`, sửa 2026-03-05.
- **Quy ước:** quyết định của chủ dự án (DB1–DB27) không bàn lại, trừ chỗ ghi rõ là không an toàn, mâu thuẫn hoặc không dựng được như viết.

## §0 Tóm tắt

**Kết luận: chưa viết plan được.** Hướng đi đúng: tách bảng `billing_orders` / `prepaid_periods`, dùng lại inbox, khóa user, giá chốt lúc tạo đơn, không đụng máy trạng thái
subscription. Nhưng phần tiền còn **hai lỗi Critical**:
- Một lần trả tiền chưa có "danh tính" duy nhất khi nó đi vào bằng ba đường (webhook, job đối soát, admin). Các luật cho đơn đã `paid` mâu thuẫn nhau, nên có một đường
  bấm được tạo hai kỳ cho một lần trả.
- Tiền tới sau khi tài khoản đã xóa sẽ rơi vào nhánh `unknown-user` có sẵn. Nhánh này xóa sạch payload, nên đơn không bao giờ thành `needs_review` và admin không còn dữ liệu
  để hoàn tiền.

Phần quảng cáo có hai việc phải sửa trước khi viết plan. Danh sách loại trừ của AdSense chưa khớp quyết định "chỉ Nhóm, Tra từ". Logic `ads.show` mới (tuổi, staff) lại nằm ở M4,
trong khi hộp thoại giới thiệu Pro ở M3 đã cần nó.

| Mức | Số | Mã |
|---|---|---|
| Critical | 2 | RB-1, RB-2 |
| Important | 14 | RB-3 … RB-16 |
| Minor | 8 | RB-17 … RB-24 |

## Findings

### RB-1 — Một lần trả tiền chưa có danh tính duy nhất; luật cho đơn đã `paid` tự mâu thuẫn (Critical)

**Mục design:** §3.3 (dòng 132–139), §3.5 (159–169), §3.7 (187–188), §3.10 hàng 4 (dòng 216) và hàng 10 (dòng 222).

**Bằng chứng.**
- Inbox chỉ chặn trùng theo `dedupe_key = provider:environment:externalEventId` (`apps/api/src/entitlements/billing/billing-adapter.ts:44-46`, unique ở
  `apps/api/prisma/models/entitlements.prisma:88`). Hai đường vào khác `externalEventId` thì thành hai sự kiện.
- Design có ba đường vào cho cùng một lần trả: webhook (`reference`), job đối soát "tạo sự kiện như webhook" (§3.5) và nút "Đã nhận tiền" với mã tham chiếu admin tự gõ (§3.7).
  Design không nói hai đường sau lấy `externalEventId` từ đâu.
- §3.10 hàng 4: đơn đã `paid` nhận webhook `reference` khác → "kỳ thứ hai xếp nối tiếp". §3.10 hàng 10: đơn admin đã xác nhận nhận webhook `reference` khác → `needs_review`.
  Hai trường hợp này giống hệt nhau với applier (đơn `paid`, reference mới), nên applier không phân biệt được.
- §3.5 ghi `paid` không có trạng thái ra ("—"). Hàng 10 lại đưa một đơn `paid` sang `needs_review`. Mà "Đã nhận tiền" được phép trên đơn `needs_review` (§3.7) và luôn tạo kỳ.

**Đường tạo hai kỳ cho một lần trả:**

```
14:00  Lan trả 199.000 ₫; webhook chưa tới
14:20  admin bấm "Đã nhận tiền", gõ mã FT2611…  → đơn paid, kỳ #1
15:05  payOS gửi webhook, reference = mã của payOS (≠ FT2611…)
       → hàng 10: đơn thành needs_review   (hoặc hàng 4: kỳ #2 nối tiếp)
15:10  admin thấy đơn needs_review, bấm "Đã nhận tiền" → kỳ #2
```

Job đối soát cũng mở đường này nếu nó dựng sự kiện theo `orderCode` thay vì theo `reference`. SDK cho thấy làm đúng được: `PaymentLink.transactions[]` có `reference`,
`amount`, `transactionDateTime` (`payos-lib-node/src/resources/v2/payment-requests/payment-requests.ts`, type `PaymentLink`, `Transaction`). Trang API thì không mô tả các trường
của `transactions`. Ngoài ra `reference` chỉ được giả định là duy nhất (code facts billing §11 mục 7). Nếu hai đơn có trùng `reference`, inbox bỏ mất lần trả thứ hai: Lan trả
tiền mà không có Pro. Dòng giao dịch cũng bị `skipDuplicates` nuốt (`apps/api/src/entitlements/billing/transactions.repository.ts:99-100`).

**Đề xuất sửa.**
1. Định nghĩa danh tính của một lần chuyển là `payos:production:<orderCode>:<reference>`, dùng chung cho webhook và đối soát (lấy từ `transactions[]`). Lần admin xác nhận dùng
   `manual:<order_id>`. Lưu nguồn xác nhận trên đơn (`paid_via = webhook | reconcile | manual`).
2. Viết bảng quyết định của `OrderApplier` theo (trạng thái đơn × nguồn × reference đã thấy chưa), ví dụ:

   | Đơn | Sự kiện tới | Kết quả |
   |---|---|---|
   | `pending` | payOS, tổng đã trả = số đơn | `paid`, tạo kỳ |
   | `pending` | payOS, tổng ≠ số đơn | `needs_review`, không tạo kỳ |
   | `paid` (manual), chưa có reference payOS | payOS, số tiền = số đơn | gắn reference vào đơn, **không** tạo kỳ |
   | `paid` (payOS, ref R1) | payOS ref R2 | theo P11: kỳ nối tiếp (hoặc cờ xem lại, nhưng phải là **một** luật) |
   | đơn đã có kỳ | admin "Đã nhận tiền" | 409, không tạo kỳ |

3. `needs_review` chỉ dành cho đơn **chưa có kỳ**. Bất thường trên đơn đã có kỳ thì ghi một cờ hay ghi chú riêng, không lùi trạng thái.
4. "Đã nhận tiền": khóa user → khóa đơn, đòi đơn chưa có kỳ. Bấm lần hai → 409 (đây là cơ chế cho câu "bấm hai lần không tạo hai kỳ" ở §3.7).

### RB-2 — Tiền tới sau khi xóa tài khoản bị nhánh `unknown-user` xóa sạch; Q-B7 không làm được như viết (Critical)

**Mục design:** §3.3 dòng 138 ("adapter tra `order_code` → order → user"), §3.5, §3.9 (204–207), DB21.

**Bằng chứng.**
- Khi xóa tài khoản, eraser đổi `user_id` của dòng tiền thành một id ngẫu nhiên (`apps/api/src/entitlements/account-deletion.provider.ts:100-101`). Design áp đúng cách đó cho
  `billing_orders`.
- Adapter tra đơn sẽ trả `appUserId = anonId`. Applier gọi `getProfile(anonId)` → `null` → `ignored`/`unknown-user`, rồi xóa `appUserId`, `payload`, `rawPayload`
  (`apps/api/src/entitlements/billing/event-applier.service.ts:62,102-108`). Kết quả: đơn không thành `needs_review`, chỉ còn một dòng log `warn`.
- Admin hoàn tiền tay thì cần tài khoản người chuyển. Dữ liệu đó chỉ có trong `counterAccountName/Number/BankName` của webhook (`WebhookData`,
  `payos-lib-node/src/resources/webhooks/webhook.ts`), và đúng phần này bị xóa. Payload mẫu của payOS còn để trống các trường này (https://payos.vn/docs/du-lieu-tra-ve/webhook).
  Email người dùng cũng đã bị xóa. Hệ thống sẽ "thu tiền mà không cung cấp dịch vụ", đúng phương án DB21 đã loại.
- Design ghi "đơn `pending` gọi `cancelCheckout`" khi xóa tài khoản. Nhưng `erase` chạy trong transaction (`apps/api/src/identity/deletion/account-eraser.ts:21-23`), gọi payOS ở
  đó là trái R6. Người học tự xóa thì cũng không có hook nào chạy trước `erase` (chỉ admin có `turnOffRenewalForAdminDelete`, `account-eraser.ts:26-31`).

**Đề xuất sửa.**
- Với `payment_succeeded`, rẽ sang `OrderApplier` **trước** nhánh `unknown-user`, và tìm đơn theo `orderCode` + `paymentLinkId`. Đơn đã ẩn danh → `needs_review`, lý do
  `account-deleted`.
- Giữ trên đơn đó đúng các trường cần để hoàn tiền (tên, số tài khoản, ngân hàng người chuyển, số tiền, reference), kèm luật lưu giữ (xóa khi admin đánh dấu đã hoàn, hoặc sau N
  ngày). Ghi điều này vào Chính sách bảo mật (xem RB-15).
- Nói rõ trường hợp trường người chuyển rỗng: admin liên hệ payOS hoặc ngân hàng, hoặc chấp nhận rủi ro. Ghi vào §10.
- Bỏ `cancelCheckout` khỏi bước xóa (link chỉ sống 15 phút), hoặc gọi sau khi commit và bỏ qua nếu lỗi.
- Thêm hàng When → Then.

### RB-3 — `order_code` chưa có cách sinh; webhook thử của payOS dùng `orderCode: 123` và được ký bằng khóa thật (Important)

**Mục design:** §3.2 (`order_code bigint`), §3.3 dòng 138–139, 142.

**Bằng chứng.**
- `confirm-webhook` gửi dữ liệu mẫu đã ký HMAC tới URL (https://payos.vn/docs/api/; comment của `Webhooks.confirm` trong SDK). Payload mẫu có `orderCode: 123`,
  `amount: 3000`, `paymentLinkId: "124c33…"`.
- Nếu `order_code` lấy từ sequence bắt đầu ở 1, thì sau đơn thứ 123, mỗi lần chạy lại `pnpm payos:confirm-webhook` (đổi URL, đổi domain) sẽ bắn vào một đơn thật. Đơn `pending`
  → `needs_review`. Đơn `paid` → rơi vào RB-1.
- payOS không công bố giới hạn của `orderCode`. SDK khai `orderCode: number`, nên phải ≤ `Number.MAX_SAFE_INTEGER`.

**Đề xuất sửa.**
- Ghi rõ cách sinh: số nguyên trong `[10^9, 2^53−1]` (sequence `START` lớn hoặc ngẫu nhiên có unique), không bao giờ dưới 10^6.
- `OrderApplier` chỉ nhận sự kiện khi `data.paymentLinkId` trùng `billing_orders.payment_link_id`, `success === true` và `data.code === '00'`. Ngược lại → `ignored`, vẫn trả 2xx.
- Thêm hàng When → Then "webhook thử khi đăng ký".

### RB-4 — Job đánh `expired` đua với thanh toán phút chót và với webhook (Important)

**Mục design:** §3.5 (dòng 161, 164, 166–168), §3.10 hàng 5 và 9.

**Bằng chứng.**
- Bảng ghi "quá `expires_at` → `expired` (job)" mà không hỏi payOS trước, cũng không ghi điều kiện khi cập nhật.
- Job chạy mỗi giờ ở **cả** API và worker (`apps/api/src/common/maintenance/maintenance.scheduler.ts:11-14,55`).
- Hai đường sai:
  - (a) Lan trả lúc phút 14:50, webhook tới chậm. Job đã đánh `expired`, webhook tới sau → `needs_review`. Lan trả đúng hạn mà phải chờ admin.
  - (b) Job đọc `pending`, gọi payOS, trong lúc đó webhook ghi `paid`, rồi job ghi đè thành `expired`.
- §3.10 hàng 5 hứa "30 phút". Job chạy mỗi giờ, cộng thêm "quá vài phút", nên thực tế có thể tới khoảng 60 phút.

**Đề xuất sửa.**
- Chỉ chuyển `expired` khi `getCheckout` báo `EXPIRED`/`CANCELLED` (SDK có cả hai, xem RB-5), hoặc khi đã quá `expires_at` + một khoảng đệm mà payOS vẫn không báo `PAID`.
- Ghi bằng `UPDATE … WHERE status = 'pending'` dưới khóa đơn.
- Tiền tới đơn `expired` mà payOS báo giao dịch trước `expires_at` (cộng khoảng đệm) thì mở kỳ như thường. Chỉ tiền thật sự muộn mới `needs_review`.
- Sửa chữ "30 phút" cho khớp nhịp job. Có thể thêm việc trang về (§3.6) nhờ API hỏi payOS ngay khi đơn còn `pending` (xem RB-23).

### RB-5 — Chưa ánh xạ đủ trạng thái payOS, chưa xử lý trả nhiều lần; chưa rõ cách vào `cancelled` (Important)

**Mục design:** §3.3 (`getCheckout` → `CheckoutState`), §3.5, DB16.

**Bằng chứng.**
- SDK khai `PaymentLinkStatus = PENDING | CANCELLED | UNDERPAID | PAID | EXPIRED | PROCESSING | FAILED`, kèm `amountPaid`, `amountRemaining`
  (`payos-lib-node/.../payment-requests.ts`). Vậy payOS có khái niệm trả thiếu rồi trả tiếp.
- Design so số tiền **từng** webhook với số đơn. Lan chuyển 100.000 rồi 99.000 cho đơn 199.000 → hai webhook đều lệch → `needs_review` mãi, dù tổng đã đủ.
- Đường vào `cancelled` ("Lan bấm hủy trên trang payOS") không có cơ chế. Code facts §11 mục 1 cho rằng webhook chỉ gửi khi trả thành công. Query `cancel=true&status=CANCELLED`
  trên `cancelUrl` thì không có chữ ký (https://payos.vn/docs/du-lieu-tra-ve/return-url).
- DB16 coi trả sai tiền là "hiếm, vì VietQR Pro chặn sai số tiền". Nhưng §3.4 lại chọn mô tả 9 ký tự, là quy tắc của tài khoản **không** liên kết qua payOS. Chưa rõ FAQ về
  VietQR Pro có áp cho loại tài khoản đó không. Nếu không, trả sai tiền, trả muộn và trả hai lần không còn hiếm.

**Đề xuất sửa.**
- Bảng ánh xạ từ 7 trạng thái payOS sang trạng thái đơn và hành động của job.
- So **tổng** `amount` các lần chuyển đã nhận của đơn (hoặc `amountPaid`) với `amount_minor`.
- `cancelled` chỉ khi API tự hỏi `getCheckout` (web trên `cancelUrl` gọi API, API kiểm), không tin query.
- Ghi loại tài khoản ngân hàng sẽ dùng và sửa đánh giá "hiếm" trong §10 cho đúng.

### RB-6 — `returnUrl` dùng `?id=` trùng với `id` mà payOS gắn thêm (Important)

**Mục design:** §3.1 dòng 60, §3.6 dòng 176.

**Bằng chứng.** payOS gắn `code`, `id` (paymentLinkId), `cancel`, `status`, `orderCode` vào `returnUrl` và `cancelUrl`. Tài liệu không nói query có sẵn của shop được giữ hay không
(https://payos.vn/docs/du-lieu-tra-ve/return-url). Với `/app/plans/order?id=<uuid>`, trang về có thể nhận hai `id` hoặc chỉ nhận `id` của payOS.

**Đề xuất sửa.** Đặt tên khác (`?order=<uuid>`) và bỏ qua mọi query của payOS. Trạng thái luôn hỏi API.

### RB-7 — Tạo đơn khi payOS lỗi hoặc quá thời gian: chưa có luật (Important)

**Mục design:** §3.1, §3.5, §3.10.

**Bằng chứng.** Design ghi "tạo order `pending` ──► payOS: tạo payment link" mà không nói:
- thứ tự transaction: gọi payOS không được nằm trong transaction hay khóa (R6, `billing-adapter.ts:29-33`);
- payOS hết 5 s hoặc trả lỗi thì đơn ở trạng thái nào và API trả mã gì;
- lần thử lại cùng `Idempotency-Key` có dùng lại `orderCode` không. payOS từ chối mã trùng ("Đơn thanh toán đã tồn tại", https://payos.vn/docs/api/);
- link đã được tạo ở payOS nhưng ta không nhận được câu trả lời thì xử lý ra sao.

`callAdapter` chỉ `Promise.race` mà không hủy lời gọi (`apps/api/src/entitlements/billing/adapter-call.ts:3-19`). SDK thì hủy thật nhờ `AbortSignal.timeout` (`payos-lib-node/src/client.ts`),
nên đặt `timeout` của SDK nhỏ hơn 5 s là đúng.

**Đề xuất sửa.**
- Commit đơn trước, gọi payOS ngoài transaction, rồi cập nhật đơn.
- Lỗi → đơn `failed` (thêm vào CHECK) hoặc `cancelled`, trả 503 `provider-unavailable` để interceptor nhả key. Lần thử lại là đơn mới, `orderCode` mới.
- Job đối soát bỏ qua đơn không có `payment_link_id`, hoặc hỏi payOS theo `orderCode` rồi hủy link.
- Thêm hàng When → Then.

### RB-8 — Port `PaymentProvider` chưa khớp port có sẵn và các test đang ghim (Important)

**Mục design:** §3.3 (dòng 116–139).

**Bằng chứng.**
- Chưa rõ `PaymentProvider` thay `BillingAdapter` (đổi tên) hay là một lớp thứ hai với registry thứ hai. Registry, applier, hủy gói và xóa tài khoản đều dùng `BillingAdapter`
  (`billing-adapter.registry.ts`, `account-deletion.provider.ts:34,66-68`).
- `ParsedEvent.externalSubscriptionId` là `string` bắt buộc (`billing-adapter.ts:20`) và được ghi vào inbox (`billing-inbox.service.ts:43`). Design không nói payOS điền gì vào đó.
  Cột thì đã cho phép null (`entitlements.prisma:90`).
- Thêm `payment_succeeded` vào `EVENT_TYPES` làm đỏ test đang ghim: `expect(EVENT_TYPES).toHaveLength(13)` và `not.toContain('payment_succeeded')`
  (`apps/api/src/entitlements/billing/subscription-machine.spec.ts:301-302`). Nó cũng làm vỡ ma trận 91 ô (`:297`) và cho parser giả nhận loại mới (`fake/fake-wire.ts:133`).
- Không thêm vào `ADDITIVE_TYPES` thì `eventKind` coi nó là `state` (`billing.types.ts:22-26`).
- Adapter tra DB trong `verify` (design dòng 138): adapter thành phụ thuộc bảng đơn, và kết quả tra đã cũ khi applier chạy lại sau (đọc lúc nhận, apply lúc khác; xem RB-2).
- `CheckoutState` chưa có trường nào.

**Đề xuất sửa.**
- Giữ tên `BillingAdapter`, thêm ba method tùy chọn `createCheckout`, `getCheckout`, `cancelCheckout`, dùng chung registry. MoMo sau này dùng `createCheckout` để mở liên kết lần
  đầu và `verify` cho các lần trừ tiền, nên vẫn khớp.
- Để `payment_succeeded` ngoài `EVENT_TYPES` (một hằng `ORDER_EVENT_TYPES` riêng, kind `additive`), cho `externalSubscriptionId` được null trong type.
- Adapter chỉ trả `orderCode`, `paymentLinkId`, `amount`, `reference`. `OrderApplier` tìm đơn và user dưới khóa.
- Ghi `CheckoutState = { status, amount, amountPaid, transactions: [{ reference, amount, transactionDateTime }] }` theo SDK.

### RB-9 — Luật nối kỳ bỏ sót grant bắt đầu ở tương lai; "now" chưa định nghĩa; ngày hiển thị lệch giờ hết thật (Important)

**Mục design:** §3.2 dòng 94, 110–112; §3.1 dòng 62; §3.6 dòng 175; §3.10 hàng 1–2.

**Bằng chứng.**
- **Grant tương lai.** Luật chỉ xét "grant gói Pro **đang chạy**". D38 cho tạo grant Pro bắt đầu ở tương lai mà không thu hồi gì
  (`docs/superpowers/decisions/2026-10-19-buoc-5-entitlements-decisions.md:622-660`). Lan mua lúc grant tháng 12 chưa bắt đầu → kỳ đã trả chạy song song với grant → mất ngày đã trả,
  trái P11 "không mất ngày". Kỳ trả trước bị thu hồi ở giữa chuỗi cũng tạo khoảng trống mà design chưa nói.
- **"now".** `now` là giờ apply, `occurredAt` hay `transactionDateTime` (chuỗi không có múi giờ, `ASSUMPTION` 9)? Sự kiện chờ job thử lại (5 phút) hoặc đối soát (tới 1 giờ) sẽ
  dời ngày bắt đầu.
- **Giờ hết và chữ "tới hết".** `addMonthsClamped` tính theo UTC (`apps/api/src/entitlements/rules/cycle.ts:11-18`). Web hiện ngày "tới hết" bằng `ends_at − 1 ms`
  (`apps/web/src/features/learner/plans/PlansPage.tsx:20`). Kỳ hết lúc 10:02 ngày 05/12 sẽ hiện "tới hết 05/12", nhưng Pro mất lúc 10:02.
  - Các ví dụ trong design không cùng quy ước: §3.10 dùng 10:02; §3.6 "05/12/2026 – 04/01/2027" ngầm coi kỳ hết lúc nửa đêm.
  - Ba kỳ 1 tháng nối nhau từ 31/01 trôi ngày (31/01 → 28/02 → 28/03 → 28/04), còn một kỳ 3 tháng thì tới 30/04.

**Đề xuất sửa.**
- `starts_at = max(giờ apply, điểm hết của khoảng Pro liền mạch tính từ mọi grant Pro chưa thu hồi, kể cả grant tương lai, và mọi kỳ trả trước)`.
- `transactionDateTime` chỉ để hiển thị.
- Chọn **một** quy ước giờ hết: hoặc làm tròn `ends_at` tới hết ngày theo timezone của học viên, hoặc hiển thị kèm giờ. Áp chung cho trang gói, biên nhận và email sắp hết hạn.
- Thêm hàng When → Then cho grant tương lai, kỳ bị thu hồi ở giữa và ngày cuối tháng.

### RB-10 — Chưa khớp với design A: cửa sổ Free sau khi hết kỳ trả trước (Important)

**Mục design:** §3.2 dòng 104, §3.10 hàng 12; design A §6.2 (Q-A7), §6.4.

**Bằng chứng.**
- Q-A7 cho cửa sổ Free bắt đầu ở `max(đầu tháng, lúc kết thúc nguồn Pro/trial gần nhất)`, do `resolve()` trả về (design A dòng 205–206).
- Loader hiện chỉ đọc grant có `endsAt > now` và subscription chưa `expired`/`revoked` (`apps/api/src/entitlements/sources/sources.repository.ts:38-44`). Nếu loader `prepaid_periods`
  làm theo mẫu đó, `resolve()` không biết kỳ trả trước vừa hết.
- Hệ quả: Lan hết kỳ lúc 05/12 10:02. Lượt AI dùng từ 01/12 tới 05/12 (lúc còn Pro) bị trừ vào 15 lượt Free, trái Q-A7. §3.10 hàng 12 chỉ ghi "lượt AI theo tháng dương lịch (đợt A)".
- Hai design cùng sửa `settings.definitions.ts` và test đếm key (A ghi admin "51 key", B thêm 3), `appConfigView.plans` và kiểu web `AppConfig`.
- Design A §6.4 để lại cho B câu khóa "Dành cho gói Pro. Gói Pro chưa mở bán." (`apps/web/messages/vi.json:341`, `:1017`, và `en.json` cùng dòng). §3.6 của B không nhận việc này.

**Đề xuất sửa.**
- B ghi rõ kỳ trả trước là một "nguồn Pro" mà điểm hết của nó đi vào mốc của Q-A7. Loader đọc thêm kỳ trả trước gần nhất đã hết trong tháng (chưa thu hồi; đã thu hồi thì lấy
  `revoked_at`). Thêm test.
- Liệt kê các file hai đợt cùng sửa.
- Đưa hai câu "chưa mở bán" vào §3.6.

### RB-11 — Hộp thoại giới thiệu Pro (M3) cần `ads.show` mới, nhưng phần đó nằm ở M4 (Important)

**Mục design:** §4 dòng 229, §5.4 dòng 279–281, §6 dòng 303–304.

**Bằng chứng.**
- Q-B11 và Q-B13 áp cho cả hộp thoại ("cả hộp thoại giới thiệu Pro", §9 dòng 340). Nhưng việc "tuổi" nằm ở M4, mà M4 chờ deploy và Google duyệt.
- `ads.show` hiện chỉ là `adsEnabled && plan === 'free'` (`apps/api/src/entitlements/entitlements.service.ts:177-180`).
- Nếu M3 chạy trước M4, người dưới 16 tuổi và staff sẽ thấy hộp thoại.

**Đề xuất sửa.** Chuyển phần `ads.show` (Free, không staff, đủ 16 tuổi theo `birth_date` và timezone; `birth_date` null thì `false`) cùng test và kiểu web sang M3 (hoặc M1). M4 chỉ còn AdSense.

### RB-12 — Danh sách loại trừ của AdSense không khớp "chỉ Nhóm, Tra từ"; A1, A2 chưa có phương án dự phòng (Important)

**Mục design:** §4 dòng 229, §5.1 dòng 246–249, §5.6, §8 dòng 322; DB13.

**Bằng chứng.**
- Loại trừ là danh sách chặn. Các route `/app` hiện có (`find apps/web/src/app/[locale]/app -name page.app.tsx`) mà danh sách không chặn:
  - `group`, `group/backlog`, `topic`, `word`;
  - các trang `(auth)`: `login`, `register`, `forgot-password`, `reset-password`, `verify-email`, `google/complete`, `account-deleted`.
- Script AdSense nạp một lần rồi ở lại suốt các lần chuyển trang mềm. Chân trang của app dẫn ra landing, `/terms`, `/privacy` bằng `next/link` (`apps/web/src/app-chrome/AppFooter.tsx:4,28-51`),
  nên vignette có thể theo ra cả các trang đó.
- Hộp thoại tính theo trang **đích** (§4). Vignette do Google quyết khi bấm link trên trang **có mã**. Chữ "Nhóm" cũng chưa rõ: `currentTab` gộp `groups|group|topic|review`
  vào tab Nhóm (`apps/web/src/app-chrome/nav.ts:6-17`).
- A1 (vignette có hiện khi chuyển trang mềm không) và A2 (loại trừ có áp sau khi chuyển trang mềm không) đã ghi ở §5.6, nhưng chưa có luật nếu kết quả là "không".

**Đề xuất sửa.**
- Chốt "Nhóm" là `/app/groups` hay cả tab Nhóm.
- Hoặc loại trừ đủ mọi route còn lại (liệt kê cả `/en`), hoặc sửa chữ DB13 và §8 cho đúng điều sẽ xảy ra.
- **Không nạp script ở `/app/practice/session`.** Trang này luôn vào bằng tải lại cả trang (`apps/web/src/features/learner/practice/use-practice-starter.tsx:63,128`), nên "không hiện
  lúc làm câu" không còn phụ thuộc A2.
- Link rời `/app` dùng `<a>` thường.
- Luật dự phòng: A2 sai → chỉ nạp script khi tải trang ở Nhóm/Tra từ và ép tải lại cả trang khi vào vùng bị loại trừ. A1 sai → ghi rõ là chấp nhận doanh thu gần 0 hay quay về hộp thoại.

### RB-13 — CSP của `/app`: lệch mẫu Google, chưa cụ thể, chưa tính Turnstile của đợt A (Important)

**Mục design:** §5.3 dòng 263–275; design A §4.3 dòng 96–97.

**Bằng chứng.**
- (a) Header mẫu Google "specifically supports" có `'unsafe-eval'` và cảnh báo "More restrictive policies may break without notice"
  (https://support.google.com/adsense/answer/16283098, theo code facts ads §5.1). Design bỏ `'unsafe-eval'` mà không ghi lý do.
- (b) `frame-src`, `img-src`, `connect-src` "đủ rộng" chưa có giá trị cụ thể, nên plan không viết được test.
- (c) Đợt A thêm `https://challenges.cloudflare.com` vào `script-src` và `frame-src` cho Turnstile. Turnstile nằm ở `/app/(auth)/login`, `register`, `forgot-password`, tức là trong vùng CSP
  `nonce` mới. Với `'strict-dynamic'`, danh sách host bị bỏ qua. Spike phải kiểm cả đăng nhập, nếu không đợt B có thể làm hỏng đợt A.
- (d) Ranh giới CSP theo document chỉ đứng được khi landing → `/app` là tải lại cả trang. Hiện đúng như vậy (`ButtonLink` là `<a>`: `apps/web/src/components/ui/ButtonLink.tsx:10-11`;
  `Hero.tsx:34`), nhưng không có test nào ghim điều này.
- (e) Bỏ `/app` khỏi `assert:static` (`apps/web/scripts/assert-static.mjs`) làm mất cái đang giữ D9/§4.1, mà chưa có gì thay.

**Đề xuất sửa.**
- Viết chuỗi CSP đầy đủ cho `/app`, theo mẫu Google (có `'unsafe-eval'`), hoặc ghi rõ chỗ lệch và kiểm nó trong Report-Only.
- Danh mục spike: nonce trên mọi script, script chống nháy màu (hash), beacon Cloudflare, Turnstile ở đăng nhập, không vi phạm ở `/vi` và `/vi/app/login`.
- Thay `assert:static` bằng một kiểm tra fail khi landing không còn tĩnh hoặc `/app` không có nonce. Mở rộng `apps/web/e2e/csp.spec.ts`.

### RB-14 — Dùng `PAYOS_*` thật mà chưa có luật bật và đăng ký; nhiều `ASSUMPTION` về payOS chưa có phương án dự phòng (Important)

**Mục design:** §3.3 dòng 140–146, §3.4 dòng 155, §3.5 dòng 166, §10 dòng 348–349.

**Bằng chứng (đối chiếu 04/11/2026).**

| Sự thật | Tài liệu nói gì | Design phụ thuộc mà chưa có dự phòng |
|---|---|---|
| `expiredAt` | "Unix Timestamp và kiểu Int32", không nói đơn vị (https://payos.vn/docs/api/) | Hạn 15 phút. Nếu payOS hiểu sai đơn vị, link còn trả được lâu hơn, và ta không tự hủy |
| `description` | 9 ký tự với tài khoản không liên kết | Mã `WM7KQ2PB` (8 ký tự) đúng, nhưng cách sinh và tính duy nhất chưa ghi |
| `orderCode` | integer, không có giới hạn, trùng bị từ chối | RB-3, RB-7 |
| Trạng thái | trang API chỉ có `PENDING`, `CANCELLED`; SDK có 7 | RB-5 |
| `webhooks.verify` của SDK | là `async` và so bằng `!==` (`payos-lib-node/src/resources/webhooks/webhook.ts`). Code facts §10.2 ghi "đồng bộ" là sai | Design muốn `timingSafeEqual`, nghĩa là tự viết. Nên ghi rõ "không dùng `webhooks.verify`" |
| Gửi lại webhook | không công bố | Toàn bộ RB-1, RB-4 |

**Đề xuất sửa.**
- Gửi `expiredAt = floor(ms/1000)`, có test ghim, và **ngoài ra** tự gọi `cancelCheckout` cho đơn quá hạn (job), để hạn 15 phút không phụ thuộc payOS hiểu đúng đơn vị.
- Ghi cách sinh `description` (từ `orderCode`, base32, không dấu).
- Nhóm mọi `ASSUMPTION` payOS vào một bảng "kiểm ở lần mua thật đầu tiên", mỗi dòng có cách kiểm và luật nếu sai.

### RB-15 — Riêng tư: dữ liệu người chuyển từ payOS chưa được quyết; Chính sách bảo mật chỉ được sửa cho quảng cáo, ở M4 (Important)

**Mục design:** §3.3, §3.9, §5.5, §6.

**Bằng chứng.**
- Webhook mang `counterAccountName`, `counterAccountNumber`, `counterAccountBankName` (`WebhookData` của SDK; payload mẫu). `raw_payload` giữ 90 ngày; comment của model chỉ nhắc
  "May hold the buyer's email" (`apps/api/prisma/models/entitlements.prisma:103-104`).
- Design không nói giữ trường nào trong `payload` hay trên đơn, không nói có gửi `buyerName`/`buyerEmail` cho payOS không, và chỉ sửa Chính sách bảo mật ở M4 cho quảng cáo.
- Bán qua payOS từ M2 là chuyển dữ liệu cho một bên thứ ba mới.
- Logger chỉ che theo **tên key** (`apps/api/src/common/logging/app-logger.ts:15`). `counter_account_number` không khớp mẫu, nên không được log các trường này.

**Đề xuất sửa.**
- Ghi danh sách trường được giữ: `payload` chuẩn hóa chỉ có `orderCode`, `paymentLinkId`, `amount`, `reference`, `transactionDateTime`. Không giữ `counterAccount*`, trừ trường hợp
  RB-2.
- Không gửi trường `buyer*`.
- Thêm mục payOS (bên xử lý, dữ liệu, thời gian giữ) vào Chính sách bảo mật **ở M2**, trước khi bán.
- Cấm log các trường người chuyển.

### RB-16 — Bảng When → Then thiếu các ca đua, ca sự cố và toàn bộ phần quảng cáo (Important)

**Mục design:** §3.10; §4 và §5 không có bảng nào.

**Bằng chứng.** `docs/specs/SPEC_WRITING_CONVENTIONS.md` (mục "How to apply") đòi bảng edge case cho ca đua, sự cố và chỗ nối tạm. Design dẫn R6, R17, SR10, D28, D35, D21 và
`Idempotency-Key`, nhưng §3.10 chỉ có đường chính và vài ca trùng.

**Đề xuất sửa.** Thêm và đánh số các hàng (vd `BB#1…`) để test của plan dẫn được. Ngoài các hàng đã nêu ở RB-1 tới RB-9:
- hai đơn của cùng Lan thành `paid` cùng lúc (khóa user bảo đảm nối kỳ đúng);
- admin xác nhận ở hai tab;
- grant Pro tạo đè lên kỳ trả trước đang chạy;
- xóa tài khoản khi có kỳ tương lai và đơn `pending`;
- đổi giá giữa lúc tạo đơn và lúc trả;
- API chết khi payOS gửi webhook.

Cho quảng cáo:
- `ads.show` với `birth_date` null;
- tròn 16 tuổi hôm nay theo timezone;
- staff có Pro;
- bộ đếm hộp thoại qua nửa đêm theo giờ của Lan, đổi tài khoản cùng máy, `ads_interstitial_per_day = 0`;
- Lan vừa mua Pro thì hộp thoại tắt (invalidate entitlements);
- vignette khi chuyển trang mềm vào trang bị loại trừ.

### RB-17 — Chữ còn sót từ các vòng trước (Minor)

- §2 hàng Q5, Q6 (dòng 41) vẫn ghi "cờ tuổi cho người dưới 16; hỏi đồng ý trước khi cá nhân hóa", đã bị Q-B11, Q-B12 thay. Ghi "(thay bởi Q-B11, Q-B12)".
- §6 M2 (dòng 302) "biên nhận nếu chọn": Q-B4 đã chọn có. M4 (dòng 304) "đồng ý": không còn hộp thoại xin đồng ý.
- D21 Bước 5 ("chỉ ở chỗ nghỉ", "bật sau khi có bước hỏi đồng ý", `docs/superpowers/decisions/2026-10-19-buoc-5-entitlements-decisions.md:363-379`) bị đổi mà design không
  dẫn. Nên ghi "thay D21 phần chỗ đặt và đồng ý" cạnh chỗ ghi "mở lại D35".
- Phần "quyết định của chủ dự án" ở đầu code facts ads (dòng 8–12; mục 8 điểm 5, 8, 9) vẫn là bản cũ (Hôm nay, tổng kết, TFAT, hỏi đồng ý). Thêm một dòng "đã thay bởi Q-B10–Q-B12".

### RB-18 — Chi tiết email (Minor)

- `payment_receipt` cần `period_key` và `window_ends_at` (NOT NULL, nằm trong unique; `entitlements.prisma:189-210`). `deliver` hiện chỉ truyền một ngày lấy từ `period_key`
  (`apps/api/src/entitlements/notices/notice-sender.service.ts:101-105`), nên phải tải đơn và kỳ theo `subject_key` để có số tiền, mã, ngày.
- Mọi email đang có câu hủy ở "App Store, Google Play" (`apps/api/src/entitlements/notices/entitlement-mail.ts:15-18,61`). Biên nhận cũng phải bỏ câu này, không chỉ email sắp hết hạn.
- "Còn kỳ nối tiếp thì bỏ" nên tính cả grant Pro nối sau.

### RB-19 — Hình dạng snapshot cho kỳ chưa bắt đầu (Minor)

Đưa kỳ tương lai vào `sources[]` sẽ làm sai các chỗ lấy nguồn đầu tiên: `PlansPage.tsx:42`, `TransactionsPage.tsx:81-82`. `DeleteAccountPage.tsx:35` và `SubscriptionRows` cũng đọc
`sources`. Đề xuất thêm `status: 'upcoming'` hoặc một trường `upcoming_periods` riêng, và liệt kê đủ chỗ web đọc `sources`.

### RB-20 — Mô hình dữ liệu nhỏ (Minor)

- `prepaid_periods` thiếu `revoked_by`. Grant có cột này, và `ACCOUNT_DATA_MAP` sẽ cần nó là `keep-id`, cùng `billing_orders.confirmed_by`.
- `billing_orders` chưa có luật giữ theo `transactionRetentionYears`: job hiện chỉ cắt `billing_transactions`.
- Đừng thêm `quarter` vào type `Interval` dùng chung với subscription (`entitlements.types.ts:18`). Dùng một type riêng cho giao dịch.
- Bản giả nên ghi `environment = 'sandbox'` để dữ liệu local không trông như production.
- `getCheckout` của bản giả cần trạng thái lưu trong DB (job chạy ở worker), tức một bảng giả mới. Nếu bảng có `user_id` thì thêm vào `ACCOUNT_DATA_MAP`.

### RB-21 — Ranh giới module và tuổi (Minor)

`isOldEnough(birthDate, today, minAge)` nằm trong `apps/api/src/identity/profile/person.ts:37-44`. Theo D3, Entitlements chỉ nên gọi service của Identity. Nên thêm hàm
`IdentityService.isAtLeast(profile, 16, now)` hoặc tính trong Identity. Ghi rõ `birth_date` null (tài khoản admin tạo) thì không có quảng cáo.

### RB-22 — Thứ tự milestone và "Xong khi" (Minor)

- Spike CSP không cần deploy hay Google duyệt. Nó chạy được trên `pnpm cf:build && pnpm cf:dev`, và kết quả của nó đổi CI (`assert:static`) cùng design người học §4.1. Nên làm sớm
  (song song M1), không để ở M4.
- `resolve()` đổi, nên "Xong khi" thêm `smoke:buoc-7` (Pro qua grant, lượt AI) ngoài smoke 5, 8.
- Ghi rõ: Google từ chối thì đợt B coi là xong với M1–M3.

### RB-23 — Vận hành (Minor)

- Thêm vào `docs/deliveries/deploy-checklist.md`: cho `/v1/billing/webhooks/payos` qua WAF và Bot Fight Mode (đã có mục Bot Fight Mode, `deploy-checklist.md:80-86`); chạy
  `payos:confirm-webhook` sau mỗi lần đổi domain.
- Trang về nên nhờ API hỏi `getCheckout` ngay (có giới hạn tần suất) khi đơn còn `pending` quá N giây, thay vì để Lan chờ job mỗi giờ.

### RB-24 — Admin và văn bản (Minor)

- "Admin thấy khoảng trống ở màn Đơn hàng" (§3.2 dòng 111–112) chưa có trong mô tả màn (§3.7 chỉ có số tiền, mã, sự kiện). Thêm ngày kỳ và khoảng Pro hiện có của học viên. Thu
  hồi kỳ trả trước chưa có endpoint hay chỗ trên giao diện.
- "Đã nhận tiền" nên đòi `Idempotency-Key` và lý do.
- Giá "từ 79.000 ₫" trong hộp thoại phải đọc từ setting.
- Đăng bản Điều khoản mới (§3.6) làm mọi học viên có `terms_outdated` và bị giữ ở `complete-profile` (`apps/web/src/app-shell/RequireSession.tsx:75-77`). Nên chọn thời điểm đăng.

## Đã kiểm và thấy đúng

- **Không dùng `subscriptions` hay grant cho kỳ trả trước:** đúng với code. CHECK `granted_by_role`, grant mới thu hồi grant đang chạy, lịch sử trộn grant với `billing_transactions`
  (code facts billing §2, kiểm lại `sources.repository.ts`, `account-deletion.provider.ts`). Bảng riêng không đụng `effectiveStatus` hay `isAutoRenewing`.
- **Kỳ trả trước không chặn tự xóa tài khoản:** `renewing()` chỉ xét subscription (`account-deletion.provider.ts:43-54`).
- **Thứ tự khóa:** khóa user → khóa đơn khớp với thứ tự có sẵn (`billing_events` → `lockUser` → hàng subscription). Eraser cũng lấy `lockUser` trước (`account-deletion.provider.ts:84`),
  nên apply và xóa tài khoản chạy nối tiếp, không đua.
- **Lịch sử giao dịch không trùng dòng:** mua không tạo grant, nên chỉ có một dòng `purchase`. Unique `(provider, environment, provider_transaction_id, kind)` có sẵn.
- **Log:** mẫu che key có chữ `code` đúng như code facts (`app-logger.ts:15`), nên dùng `order_ref` là đúng.
- **Webhook:** raw body có sẵn cho chữ ký nằm trong body (`webhook.controller.ts:35-40`). Thời hạn 5 s và mẫu "fake bật cùng `BILLING_PRODUCTION` thì không khởi động" có sẵn.
- **SDK payOS:** `@payos/node` 2.0.5 (npm, sửa 2026-03-05). Mặc định `timeout` 60 s, `maxRetries` 2 (`src/client.ts`). SDK hủy lời gọi bằng `AbortSignal.timeout`, nên đặt
  timeout ≤ 5 s có tác dụng thật. `PaymentLink.transactions[].reference` có thật, nên đối soát dùng lại được `reference`.
- **Dữ liệu cho `ads.show`:** có đủ trong `snapshot`. `Profile` có `staff_role`, `birth_date`, `timezone` (`apps/api/src/identity/profile/identity.service.ts:18-34`). Trong vùng
  member, `birth_date` luôn có (`RequireSession.tsx:75-77`).
- **Landing và phiên luyện:** landing vào `/app` bằng `<a>` (tải lại cả trang). Vào phiên luyện bằng `hardReplace`.
- **CSP và Worker:** nonce cần render động, và `assert:static` đang bắt `/app` tĩnh, đúng như design nói (`assert-static.mjs`, `next.config.ts:28-31`). Matcher của proxy bỏ đường có dấu
  chấm, nên `/ads.txt` không đi qua proxy (`proxy.ts:46-48`). Thư mục `apps/web/public/` chưa có.
- **Quyết định đã chốt:** việc bỏ Hôm nay nhất quán ở §2, §4, §5.1, §5.2, §8 và DB13. Mở lại D35 ghi rõ ở P1. "Không hoàn tiền" (L6) khớp D24. Mỗi lần thu có mã giao dịch (`reference`)
  khớp D37. Quyền tính lúc đọc (D28), nên kỳ tương lai tự có hiệu lực mà không cần job.
