# Design — Bước 5: Entitlements & Usage (gói, quyền, hạn mức, cổng thanh toán; chỉ API)

> **Trạng thái 19/10/2026: đã duyệt** ("Mình duyệt design Bước 5", 19/10). Mọi quyết định sản phẩm đã hỏi từng câu trong chat theo luật "chủ dự án trả lời
> trước, Claude đề xuất sau" (giữ ở Bước 5, D1). Ba phần trình bày trong chat (kiến trúc; dữ liệu và luật tính; API, thanh toán, mã lỗi, kiểm thử) chủ dự án đã
> duyệt; khi đọc bản viết, chủ dự án sửa hai chỗ (D29, D30) và duyệt các đề xuất còn lại. Bước tiếp: plan (`superpowers:writing-plans`), đọc lại code trên `dev`. Nhật ký hỏi đáp từng vòng: [`../reviews/2026-10-18-buoc-5-brainstorm-log.md`](../reviews/2026-10-18-buoc-5-brainstorm-log.md). Decision record:
> [`../decisions/2026-10-19-buoc-5-entitlements-decisions.md`](../decisions/2026-10-19-buoc-5-entitlements-decisions.md).

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
| D3 | Thanh toán | Dựng sẵn cổng chung (hộp sự kiện, chống trùng, chịu sai thứ tự, áp vào quyền Pro, hai kiểu gia hạn) + bộ nối giả; thêm nhà cung cấp thật sau |
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

## 3. Phạm vi

**Làm:** module `entitlements` trong `apps/api` (dữ liệu, luật tính gói và hạn mức, sổ lượt, cấp tay, trần AI và công tắc, cờ quảng cáo, cổng thanh toán và bộ
nối giả, email nhắc trial và email báo trước, job dọn); quyền `entitlements.grant`; nhóm cài đặt `entitlements` và các cài đặt mới của `learning`, `content`;
sửa nhỏ Practice, Learning, Content, Identity (mục 4); lệnh `pnpm billing:fake-event`, `pnpm entitlements:fake-ai`; script `pnpm smoke:buoc-5`.

**Không làm:**
- Giao diện (admin, người học), gắn SDK quảng cáo, bước hỏi đồng ý theo dõi quảng cáo.
- Mua, hủy, đổi gói từ phía app (trang thanh toán, trang quản lý gói): làm cùng bộ nối nhà cung cấp thật và giao diện; người dùng thao tác ở trang của nhà
  cung cấp hoặc store (Đề xuất, đã duyệt 19/10).
- Bộ nối nhà cung cấp thật (Paddle, VNPay, MoMo, Apple, Google…); chọn nhà cung cấp phụ thuộc hình thức kinh doanh, để trước khi ra mắt.
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
| ER11: cổng sự kiện billing | Hộp sự kiện chuẩn hóa + bộ nối theo nhà cung cấp; hai kiểu gia hạn | D3 |
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
  (V1 chỉ có bản giả)                                                  vai trò, ngôn ngữ; email admin)
```

Entitlements chỉ gọi module khác qua service được export (D3 của Bước 0–4): mỗi module sở hữu `prisma/models/<module>.prisma`; không `@relation` qua ranh
giới; tham chiếu chéo là cột UUID. Không module nào import Entitlements ngoài Practice (đã có), Content (Bước 7) và chính các controller của nó.

| Module | Bước 5 cần | Mới hay có sẵn |
|---|---|---|
| Identity | Múi giờ, ngôn ngữ (`getProfile`); email đã xác minh (`isEmailVerified`); địa chỉ email (`verifiedEmails`); **vai trò staff của người cấp và người nhận**; **danh sách email các `admin`** (cảnh báo trần) | Có sẵn ba hàm đầu; mới: hàm đọc vai trò và hàm danh sách admin. Thêm `entitlements.grant` vào `ROLE_PERMISSIONS` của `admin`, `editor` |
| Settings | Nhóm `entitlements` (mục 13); thêm khóa vào `learning`; nhóm mới `content` | Mới, cùng cơ chế các nhóm có sẵn (khoảng cho phép, `version`, lịch sử, `settings.manage`) |
| Practice | Gọi kiểm hạn mức phiên khi mở phiên; gọi **ghi nhận phiên** khi câu đầu tiên của phiên có kết quả cuối; trả mã lỗi theo lý do | Sửa nhỏ (⚠4) |
| Learning | Đọc `groups_per_user`, `items_per_group` từ Settings thay hằng số | Sửa nhỏ |
| Content | Đọc `private_words_per_user`, `sentences_per_sense` từ Settings thay hằng số | Sửa nhỏ |
| Mail (common) | Gửi email nhắc trial, báo trước khi trừ tiền/hết hạn, cảnh báo trần **không bị trần 80% của email nhắc học** (đi đường thiết yếu như OTP), vẫn tính vào hạn mức ngày | Có sẵn `MailDispatcher`, `MailBudget` (`REMINDER_MAIL_SHARE = 0.8`); cách gắn cụ thể ở plan |
| Bảo trì | Job mỗi giờ: thử áp lại sự kiện lỗi, gửi email đến hạn, đánh dấu giữ chỗ quá hạn, chuyển trạng thái theo thời gian (hết chờ → khóa, hết kỳ → hết hạn) | Có sẵn `MaintenanceScheduler` (mỗi giờ, trong tiến trình API) |

**Sửa Practice (⚠4, Đề xuất, đã duyệt 19/10):**
- `check(userId, 'practice.basic')` từ nay nghĩa là "tài khoản được dùng bài luyện không AI" (mọi gói đều được); Practice giữ cuộc gọi này ở `start` và `next`
  như hiện nay. Kiểm **hạn mức phiên** là một cuộc gọi riêng chỉ ở `start` (`checkQuota(userId, 'practice_sessions')`), để phiên đã mở làm được tới hết.
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
   hạn và chưa thu hồi); `trial` nếu nguồn duy nhất là gói đăng ký đang `trialing`; còn lại `free`. Thời hạn các nguồn **không nối tiếp**.
2. **Con số của mỗi kho:** lấy số của gói hiện tại (Trial dùng số trial cho hai kho AI, số Pro cho phiên luyện). Nếu có **cấp tay "con số riêng"** còn hạn cho
   kho đó thì dùng con số riêng, cao hay thấp đều được; nhiều lần đặt cho cùng một kho đang hiệu lực thì **lần tạo sau cùng thắng**.
3. **Quyền AI:** `ai.practice` / `ai.lookup` được phép khi con số của kho tương ứng > 0. Vì vậy staff đặt "lượt bài AI: 500" cho một tài khoản Free (tài khoản
   test) thì tài khoản đó dùng được AI; đặt 0 cho một tài khoản Pro lạm dụng thì chặn AI của tài khoản đó.
4. **Còn lại** = `max(0, con số − đã dùng)`; "đã dùng" tính ở mục 7.2. Con số hạ thấp hơn số đã dùng thì còn 0, không âm (ER9).
5. **Quảng cáo:** hiện khi công tắc quảng cáo bật **và** gói hiện tại là `free` (con số riêng không đổi việc này).

### 5.5 Chu kỳ (Chốt D13, D14; chi tiết Đề xuất, đã duyệt 19/10)

- **Kho phiên luyện:** theo **ngày địa phương** của người học (múi giờ hồ sơ, SR13). Một phiên thuộc ngày của lúc câu đầu tiên có kết quả.
- **Kho AI:** chu kỳ **một tháng** tính từ một **mốc** (thời điểm, UTC):
  - Mốc của gói đăng ký = lúc bắt đầu gói; **trial chuyển sang trả phí thì mốc đặt lại = lúc trừ tiền lần đầu**; đổi tháng ↔ năm giữ mốc.
  - Mốc của cấp tay "một gói" = `starts_at` của lần cấp. Mốc của cấp tay "con số riêng" cho tài khoản không có nguồn Pro = `starts_at` của lần cấp đó.
  - Nhiều nguồn cùng hiệu lực: dùng mốc **sớm nhất** trong các nguồn đang hiệu lực. Khi nguồn đó hết, mốc chuyển sang mốc sớm nhất còn lại; lượt đã dùng
    trong chu kỳ mới tính theo mốc mới vẫn được đếm (không có chuyện tặng thêm lượt).
  - Chu kỳ thứ k bắt đầu ở cùng ngày, cùng giờ của mốc trong tháng thứ k sau mốc; tháng thiếu ngày thì **lùi về ngày cuối tháng nhưng mốc không trôi**
    (31/01 → 28/02 → 31/03 → 30/04).
- **Không cộng dồn:** sang chu kỳ mới, lượt chưa dùng mất; số đã dùng của chu kỳ mới bắt đầu từ 0.
- **Gói năm** làm mới mỗi tháng như gói tháng.

## 6. Dữ liệu (`entitlements.prisma`, mới; Đề xuất, đã duyệt 19/10)

Mọi bảng có `user_id` là UUID thường, không khóa ngoại sang module khác.

| Bảng | Mỗi dòng | Cột chính | Ràng buộc, index |
|---|---|---|---|
| `entitlement_grants` | Một lần cấp tay | `id`, `user_id`, `kind` (`plan` / `limits`), `plan` (`pro`, khi `kind = plan`), `limits` (jsonb: `practice_sessions_per_day`, `ai_practice_per_cycle`, `ai_lookup_per_cycle`, chỉ khóa nào có thì thay), `starts_at`, `ends_at` (bắt buộc), `reason` (bắt buộc, ≤ 300 ký tự), `granted_by`, `granted_by_role`, `revoked_at`, `revoked_by`, `revoke_reason`, `created_at` | `ends_at > starts_at`; index `(user_id, ends_at)`, `(granted_by, created_at)` |
| `subscriptions` | Một gói đăng ký từ một nhà cung cấp | `id`, `user_id`, `provider`, `environment` (`sandbox` / `production`), `external_subscription_id`, `renewal` (`provider` = nhà cung cấp tự gia hạn / `app` = thanh toán một lần), `interval` (`month` / `year`), `status` (mục 9.4), `trial_ends_at`, `trial_denied` (D30), `current_period_start`, `current_period_end`, `grace_ends_at`, `cancel_at_period_end`, `pending_interval`, `quota_anchor_at`, `last_event_at`, `created_at`, `updated_at` | Unique `(provider, environment, external_subscription_id)`; index `(user_id, status)` |
| `billing_events` | Một thông báo nhận từ nhà cung cấp (hộp sự kiện) | `id`, `provider`, `environment`, `dedupe_key`, `external_event_id`, `type` (đã chuẩn hóa, mục 9.3), `occurred_at`, `received_at`, `user_id` (null khi không nhận ra), `subscription_id`, `payload` (jsonb đã chuẩn hóa), `raw_payload` (jsonb), `status` (`pending` / `applied` / `stale` / `ignored` / `failed`), `error`, `attempts`, `processed_at` | Unique `dedupe_key`; index `(status, received_at)` |
| `trial_history` | Một lần đã dùng trial | `id`, `user_id`, `provider`, `payment_fingerprint` (mã nhận diện thẻ do nhà cung cấp trả, null nếu không có), `started_at` | Unique `user_id`; unique một phần `(provider, payment_fingerprint)` khi fingerprint không null |
| `usage_records` | Một dòng trong sổ lượt | `id`, `user_id`, `pool` (`practice_sessions` / `ai_practice` / `ai_lookup`), `operation_id`, `kind` (`use` / `credit`), `status` (`reserved` / `confirmed` / `released`), `local_date` (kho phiên luyện), `system_date` (ngày giờ Việt Nam, kho AI), `reserved_at`, `expires_at`, `confirmed_at`, `released_at`, `note` (ví dụ `late-confirm-free`, mã báo cáo khi hoàn lượt), `created_at` | Unique một phần `(user_id, pool, operation_id)` khi `kind = use` và `status` ∈ (`reserved`, `confirmed`); unique `(user_id, pool, operation_id)` khi `kind = credit`; index `(user_id, pool, confirmed_at)`, `(pool, system_date)` |
| `entitlement_notices` | Một email đã gửi (chống gửi trùng) | `id`, `user_id` (null với cảnh báo trần), `kind` (`trial_started` / `trial_reminder` / `renewal_notice` / `expiry_notice` / `ai_cap_alert`), `subject_id` (gói đăng ký, hoặc ngày với cảnh báo trần), `period_key`, `sent_at` | Unique `(kind, subject_id, period_key)` |

- **Không có bảng "bộ đếm"** (D28): còn lại luôn tính từ các dòng trong sổ.
- `raw_payload` có thể chứa email của người mua; chỉ dùng để tra lỗi, không đưa vào log (SR10); xử lý khi xóa tài khoản ghi ở mục 18 (Bước 8).
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
  6. Trần toàn hệ thống đã chạm (mục 7.3) → `ai-unavailable` kèm `retry_after` (0 giờ ngày sau, giờ Việt Nam).
  7. Ghi dòng `use`, `reserved`, `expires_at = now + 2 phút`, `system_date` = ngày giờ Việt Nam.
- **`confirm`**: dòng `reserved` chưa quá hạn → `confirmed`. Dòng đã quá 2 phút (xác nhận muộn): nếu vẫn còn lượt khi không tính dòng này thì `confirmed`; nếu
  không thì `released` với `note = late-confirm-free` và kết quả vẫn giao cho người học (không bao giờ vượt mức, ER5). Gọi lại trên dòng đã `confirmed` → trả kết
  quả cũ.
- **`release`**: `reserved` → `released`; gọi lại → không đổi gì.
- **Thử lại sau lỗi tạm** là một lần `reserve` mới với cùng `operation_id` (dòng cũ đã `released`).
- **AI gọi lần 2 vì câu không qua kiểm tra** (D11) nằm trong cùng một lượt: Practice (Bước 7) chỉ `confirm` một lần.
- **Làm lại câu AI đã lưu** không gọi `reserve` (D10). **Dịch bổ sung** dùng kho `ai_practice` (Đề xuất, đã duyệt 19/10).

### 7.2 Đếm "đã dùng"

- Kho AI: trong chu kỳ hiện tại (mục 5.5), **đã dùng** = số dòng `use` `confirmed` có `confirmed_at` trong chu kỳ + số dòng `use` `reserved` chưa quá 2 phút −
  số dòng `credit` trong chu kỳ; không nhỏ hơn 0.
- Kho phiên luyện: số dòng `use` `confirmed` có `local_date` = hôm nay theo giờ hiện tại của người học.
- **Hoàn lượt** (D10, D19): `refund(userId, pool, operationId, reportId)` ghi một dòng `credit` vào **chu kỳ hiện tại**, idempotent theo `operation_id`. Nếu đã
  dùng của chu kỳ hiện tại đang là 0 thì không ghi (không hoàn được, không "để dành"). Bước 7 gọi khi staff xác nhận câu AI sai.

### 7.3 Trần AI toàn hệ thống và công tắc (D2, D18, ER14)

- **Công tắc** `entitlements.ai_enabled` (mặc định bật): tắt thì mọi `reserve` của kho AI → `ai-unavailable`; lượt không bị trừ; bài không AI chạy bình thường.
- **Trần** `entitlements.ai_daily_cap` (mặc định 1.000 lượt): đếm mọi dòng `use` của hai kho AI có `system_date` = hôm nay (giờ `Asia/Ho_Chi_Minh`, `ASSUMPTION`
  cố định trong code), tính cả `reserved` chưa quá hạn. Đếm dưới khóa chung `entitlements.ai_daily`, nên chính xác tuyệt đối; mọi lần giữ lượt AI của mọi người xếp
  hàng qua khóa này (chấp nhận được vì số lời gọi AI cùng lúc vốn bị giới hạn 5, AR11).
- **Cảnh báo** khi đã dùng chạm `ai_cap_alert_percent` (mặc định 75; để trống = không cảnh báo): email cho mọi `admin` đã xác minh email, tối đa **một lần mỗi
  ngày** (`entitlement_notices` kind `ai_cap_alert`).
- AI Integration (Bước 6) kiểm lại công tắc trước khi gọi provider (AR10); trần bằng tiền xét ở Bước 6.

### 7.4 Phiên luyện (D5)

- `checkQuota(userId, 'practice_sessions')` khi mở phiên: đã dùng hôm nay ≥ con số → 403 `quota-exhausted`, `resets_at` = 0 giờ ngày mai theo giờ người học.
- `recordPracticeSession(tx, userId, sessionId, localDate)`: ghi dòng `use` `confirmed` với `operation_id = session_id`; idempotent. Practice gọi khi câu đầu tiên
  của phiên có kết quả cuối (mục 4). Mở phiên rồi bỏ khi chưa trả lời câu nào không tốn lượt.
- Một người chỉ có một phiên đang mở (Bước 4), nên không thể vượt quá con số bằng cách mở song song.

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

## 9. Cổng thanh toán (Chốt D3, D23–D25; chi tiết Đề xuất, đã duyệt 19/10)

### 9.1 Bộ nối (adapter)

Mỗi nhà cung cấp một bộ nối cùng một giao diện:

| Hàm | Làm gì | Bắt buộc |
|---|---|---|
| `verify(request)` | Kiểm chữ ký theo cách của nhà cung cấp; đọc và **chuẩn hóa** thành danh sách sự kiện (mục 9.3) | Có |
| `ack(result)` | Trả lời HTTP đúng kiểu nhà cung cấp đòi (ví dụ VNPay JSON mã `00`/`02`, MoMo HTTP 204, Apple 200) | Có |
| `fetchState(externalSubscriptionId)` | Hỏi lại trạng thái thật (Stripe, Google, Apple có) | Không |
| `endTrialNow(externalSubscriptionId)` | Kết thúc trial và trừ tiền ngay (mục 8) | Không |

V1 chỉ có bộ nối **giả** (`fake`): chữ ký HMAC bằng `BILLING_FAKE_SECRET`; chỉ bật khi `BILLING_FAKE_ENABLED=true` (không bao giờ ở production); có
`fetchState` và `endTrialNow` để test hai đường. Lệnh `pnpm billing:fake-event` ký và gửi sự kiện giả tới API đang chạy (đi qua đúng endpoint thật), không mở
endpoint test nào.

### 9.2 Nhận sự kiện

`POST /v1/billing/webhooks/{provider}` (công khai, không đăng nhập):
1. Bộ nối kiểm chữ ký. Sai → 400, **không lưu**, log `billing_signature_invalid` (không ghi payload).
2. Lưu từng sự kiện vào `billing_events` với `dedupe_key` = `provider:environment:external_event_id` (nhà cung cấp không có mã sự kiện thì ghép mã đơn của app +
   mã giao dịch). Trùng → bỏ qua, coi như đã nhận.
3. `ack` ngay (kịp các hạn 5–15 giây của nhà cung cấp).
4. Áp từng sự kiện (mục 9.4) trong transaction riêng, khóa theo người dùng. Lỗi → `failed`, `attempts + 1`; job mỗi giờ thử lại các dòng `failed` và các dòng
   `pending` quá 5 phút (tiến trình chết sau khi đã trả lời nhà cung cấp); quá 5 lần (`ASSUMPTION`) thì dừng và log `billing_event_stuck` để staff xem.
- Endpoint không có người dùng nên không dùng rule giới hạn theo người (SR14); chữ ký được kiểm trước mọi việc khác; body tối đa 64 KB (`ASSUMPTION`).
- **Nhận ra người dùng:** sự kiện mang `app_user_id` (UUID của Wordmet, gắn lúc tạo trang thanh toán). Không nhận ra → `ignored`, log.
- **Sai thứ tự:** sự kiện có `occurred_at` cũ hơn `last_event_at` của gói → `stale`, không áp. Bộ nối có `fetchState` thì áp trạng thái hỏi lại được thay vì tin
  thứ tự.

### 9.3 Sự kiện chuẩn hóa

| Sự kiện | Ý nghĩa |
|---|---|
| `subscription_started` | Gói mới (có thể kèm `trial_ends_at`) |
| `renewed` | Trừ tiền kỳ mới thành công (gồm lần đầu sau trial, và thu lại được sau khi lỗi) |
| `renewal_failed` | Trừ tiền lỗi (có thể kèm `grace_ends_at` của store) |
| `grace_ended` | Hết thời gian chờ, khóa (store báo; còn lại job tự tính) |
| `cancel_scheduled` / `cancel_unscheduled` | Tắt / bật lại tự gia hạn |
| `expired` | Hết hẳn |
| `revoked` | Cắt ngay (ví dụ chargeback, store thu hồi) |
| `refunded` / `refund_reversed` | Hoàn tiền do store, nhà cung cấp, ngân hàng; rút lại lần hoàn tiền |
| `plan_changed` | Tháng → năm có hiệu lực ngay |
| `plan_change_scheduled` / `plan_change_canceled` | Năm → tháng chờ hết năm; hủy lần đổi đang chờ |
| `payment_succeeded` | Kiểu "app tự gia hạn": thanh toán một lần thành công cho N ngày |

### 9.4 Trạng thái gói đăng ký

| Trạng thái | Pro? | Vào khi | Ra khi |
|---|---|---|---|
| `trialing` | Có (trial), trừ khi `trial_denied` (D30) | `subscription_started` có trial | `renewed` → `active` (mốc mới); `renewal_failed` → `grace`; `expired` |
| `active` | Có | `subscription_started`, `renewed`, `refund_reversed` (kỳ chưa hết), `payment_succeeded` | `renewal_failed` → `grace`; hết kỳ không gia hạn → `expired` |
| `grace` | Có | `renewal_failed` | `renewed` → `active`; `grace_ends_at` qua → `on_hold` |
| `on_hold` | **Không** (khóa: như Free nhưng gói chưa hủy; dữ liệu giữ nguyên; trả được tiền là có Pro lại) | Hết thời gian chờ | `renewed` → `active`; nhà cung cấp bỏ cuộc → `expired` |
| `expired` | Không | `expired`; hết kỳ khi `cancel_at_period_end`; kiểu "app tự gia hạn" hết kỳ | Mua lại = gói mới |
| `revoked` | Không | `revoked`; `refunded` cho kỳ hiện tại | `refund_reversed` → `active` nếu kỳ chưa hết |

- **Gia hạn lỗi (D23):** `grace_ends_at` = (lúc lỗi hoặc cuối kỳ, lấy mốc muộn hơn) + `grace_days` (mặc định 7); store gửi thời hạn riêng thì dùng của store.
  Trong lúc chờ, chu kỳ lượt mới vẫn mở như đã trả (Đề xuất, đã duyệt 19/10). Trên mobile làm theo sự kiện store (Apple cho chọn 3, 16, 28 ngày).
- **Hủy (D24):** `cancel_scheduled` → vẫn Pro tới `current_period_end`, rồi `expired`. Không hoàn tiền từ phía app.
- **Hoàn tiền từ bên ngoài:** `refunded` cho kỳ hiện tại → `revoked` ngay; cho kỳ đã qua → ghi lại, không đổi quyền; `refund_reversed` → trả lại trạng thái nếu
  kỳ chưa hết.
- **Đổi tháng ↔ năm (D25):** `plan_changed` (tháng → năm) đổi `interval` và kỳ, **giữ mốc chu kỳ**; `plan_change_scheduled` ghi `pending_interval = month`, có
  hiệu lực ở `renewed` kế tiếp; `plan_change_canceled` xóa `pending_interval`. Trong lúc chờ không đổi gì.
- **Kiểu "app tự gia hạn"** (cổng Việt Nam thu một lần): `payment_succeeded` cấp `active` tới `paid_at + 30` hoặc `+ 365` ngày; mua thêm khi còn hạn thì nối
  vào cuối kỳ của **chính gói đó**; hết kỳ không mua → `expired`. Email báo trước khi hết hạn (mục 14).
- **Chuyển trạng thái theo thời gian** (hết chờ, hết kỳ) được **tính lúc đọc** (gói `grace` mà `grace_ends_at` đã qua được coi là `on_hold`), và job mỗi giờ ghi
  lại cho đúng.

## 10. Cấp tay (Chốt D6–D9, D19, D20)

- **Quyền `entitlements.grant`** (`admin`, `editor`). Luật kiểm ở server:

| Việc | `admin` | `editor` |
|---|---|---|
| Cấp "một gói" Pro | Ai cũng được, kể cả chính mình | Chỉ tài khoản **không có vai trò staff**, không phải chính mình |
| Cấp "con số riêng" phiên luyện | Ai cũng được | Như trên |
| Cấp "con số riêng" lượt AI | Ai cũng được | **Không** |
| Thu hồi | Mọi lần cấp | Chỉ lần cấp trên tài khoản không có vai trò staff |
| Xem lịch sử | Có | Có |

- Mọi lần cấp **bắt buộc** `ends_at` (sau `starts_at` và sau lúc cấp) và `reason`; `starts_at` mặc định là lúc cấp. Không có giới hạn độ dài tối đa (D20 chỉ bắt
  buộc có hạn).
- Có hiệu lực ngay ở lần kiểm kế tiếp (không cache, mục 5.4). Thu hồi: `revoked_at`; quyền tính lại ngay; lượt đã dùng không tính lại.
- Người nhận sau đó thành staff: lần cấp vẫn giữ; `editor` không thu hồi được nữa (`grant-not-allowed`).
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

### 12.1 Người học (`@LearnerContent()` như Learning, Practice)

| # | API | Làm gì |
|---|---|---|
| 1 | `GET /v1/me/entitlements` | `plan` (`free` / `trial` / `pro`); `sources` (loại, `ends_at` hoặc `renews_at`, `cancel_at_period_end`, `pending_interval`, `status`); với mỗi kho: `limit`, `used`, `remaining`, `resets_at`; `features` (`ai.practice`, `ai.lookup` được phép hay không, lý do); `ai_available` (công tắc, trần); `ads`; `trial_eligible` |

Mua, hủy, đổi gói: không có ở Bước 5 (mục 3).

### 12.2 Staff

| # | API | Quyền | Khóa chống trùng | Làm gì |
|---|---|---|---|---|
| 2 | `POST /v1/admin/entitlements/grants` | `entitlements.grant` | `Idempotency-Key` | Body: `user_id`, `kind`, `plan` hoặc `limits`, `starts_at?`, `ends_at`, `reason`. Luật mục 10 |
| 3 | `POST /v1/admin/entitlements/grants/{id}/revoke` | `entitlements.grant` | Tự nhiên (thu hồi lần hai trả kết quả cũ) | Body: `reason` |
| 4 | `GET /v1/admin/entitlements/grants` | `entitlements.grant` | — | Lọc `user_id`, `granted_by`, `active`, `expiring_within_days`; phân trang `page_size` + `page_token` |
| 5 | `GET /v1/admin/entitlements/users/{user_id}` | `entitlements.grant` | — | Như API 1 cho một người học, kèm danh sách nguồn và các lần cấp |
| 6 | `GET /v1/admin/entitlements/ai-usage?date=` | `settings.manage` | — | Lượt AI của ngày (giờ Việt Nam) so với trần, số đang giữ, công tắc |

Các con số và công tắc chỉnh qua API cài đặt có sẵn `/v1/admin/settings` (`settings.manage`, mục 13).

### 12.3 Thanh toán

| # | API | Làm gì |
|---|---|---|
| 7 | `POST /v1/billing/webhooks/{provider}` | Mục 9.2. V1 chỉ có `fake` |

### 12.4 Dịch vụ cho module khác (export từ `entitlements/index.ts`)

| Hàm | Ai gọi | Ghi chú |
|---|---|---|
| `check(userId, feature)` → `{ allowed: true } \| { allowed: false, reason, resets_at? }` | Practice (có), Content (Bước 7) | Giữ chữ ký của Bước 4, thêm lý do |
| `checkQuota(userId, 'practice_sessions')` | Practice khi mở phiên | Mục 7.4 |
| `recordPracticeSession(tx, userId, sessionId, localDate)` | Practice | Mục 7.4 |
| `reserve` / `confirm` / `release(userId, pool, operationId)` | Practice, Content (Bước 7) | Mục 7.1; nhận transaction của bên gọi nếu cần |
| `refund(userId, pool, operationId, reportId)` | Practice (Bước 7, xử lý báo lỗi câu AI) | Mục 7.2 |

### 12.5 Mã lỗi (Problem Details; Đề xuất, đã duyệt 19/10)

| Mã | Status | API | Khi |
|---|---|---|---|
| `entitlement-required` | 403 | Practice, Bước 7 | Lý do `plan-required`: tính năng cần Pro hoặc con số = 0 (mã có sẵn từ Bước 4) |
| `quota-exhausted` | 403 | Practice mở phiên, Bước 7 | Hết phiên hôm nay hoặc hết lượt AI chu kỳ này; kèm `resets_at`. Không dùng 429 để khỏi lẫn với chống spam |
| `ai-unavailable` | 503 | Bước 7 | Công tắc AI tắt hoặc chạm trần toàn hệ thống; kèm `retry-after` |
| `grant-not-allowed` | 409 | 2, 3 | Kèm `reason`: `target-is-staff`, `self-grant`, `ai-limits-admin-only`, `target-is-admin` |
| `grant-not-active` | 409 | 3 | Lần cấp đã hết hạn (đã thu hồi thì trả kết quả cũ) |
| `validation-failed` | 400 | 2, 3, 6 | Thiếu `reason` hoặc `ends_at`; `ends_at` đã qua hoặc trước `starts_at`; con số ngoài khoảng; `kind` không khớp nội dung |
| `not-found` | 404 | 3, 5 | Lần cấp, người dùng không có |
| `forbidden` | 403 | 2–6 | Không có quyền staff tương ứng (có sẵn từ Bước 1) |
| (theo bộ nối) | 400 / 2xx | 7 | Sai chữ ký → 400; còn lại trả lời theo kiểu nhà cung cấp |
| `rate-limited` | 429 | API ghi | Có sẵn (`user.write` cho API 2, 3) |

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
| `expiry_notice_days_before` | 7 | để trống = tắt, hoặc 1–30 | Đề xuất, đã duyệt 19/10 (email gói "app tự gia hạn" sắp hết) |
| `ai_enabled` | bật | bật / tắt | Chốt D2 |
| `ai_daily_cap` | 1.000 | 0–100.000 | Chốt D18 |
| `ai_cap_alert_percent` | 75 | để trống = không cảnh báo, hoặc 50–95 | Chốt D18 |
| `ads_enabled` | tắt | bật / tắt | Chốt D21 (mặc định tắt: đề xuất đã duyệt) |
| `ads_interstitial_per_day` | 3 | 0–20 | Chốt D21 |
| `ads_min_interval_minutes` | 10 | 1–240 | Chốt D21 |

Thêm vào nhóm `learning`: `groups_per_user` 100 (10–1.000), `items_per_group` 2.000 (100–10.000). Nhóm `content` (mới): `private_words_per_user` 10.000
(1.000–100.000), `sentences_per_sense` 20 (5–100). Chốt D17, D18; khoảng là ASSUMPTION.

**Cố định trong code:** thời gian giữ chỗ 2 phút (ER5); giờ Việt Nam cho ngày của trần AI; số lần thử áp lại một sự kiện (5).

Đổi con số giữa chu kỳ (ER9): áp ở lần kiểm kế tiếp; lượt đã dùng không tính lại; còn lại không âm. Giảm `items_per_group`, `groups_per_user` dưới số đang có:
dữ liệu cũ giữ nguyên, chỉ chặn thêm mới (như luật hiện nay).

## 14. Email (Đề xuất, đã duyệt 19/10 trừ chỗ ghi khác)

| Email | Gửi khi | Cho ai |
|---|---|---|
| Bắt đầu trial | Áp `subscription_started` có trial | Người học |
| Nhắc trial | `trial_ends_at − trial_reminder_days_before` | Người học |
| Báo trước khi trừ tiền kỳ mới (D29: **mặc định tắt**) | `current_period_end − renewal_notice_days_before`, gói tự gia hạn, chưa đặt hủy; chỉ khi cài đặt có số | Người học |
| Báo sắp hết hạn | `current_period_end − expiry_notice_days_before` (mặc định 7) của gói "app tự gia hạn" | Người học |
| Cảnh báo trần AI | Lượt AI trong ngày chạm `ai_cap_alert_percent` | Mọi `admin` đã xác minh email |

- Gửi bằng hạ tầng email Bước 3 (`MailDispatcher`); **không bị trần 80% của email nhắc học** (đi như OTP) nhưng vẫn tính vào hạn mức ngày (`mailDailyBudget`
  trong cấu hình; cách gắn cụ thể ở plan).
- Job mỗi giờ (`MaintenanceScheduler`) tìm email đến hạn; `entitlement_notices` chặn gửi trùng; trễ tối đa khoảng một giờ.
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
| B5E15 | Đã dùng chạm 75% trần lần hai trong cùng ngày (sau khi admin tăng trần rồi giảm lại) | Không gửi cảnh báo lần hai trong ngày (`entitlement_notices`) |
| B5E16 | Không có `admin` nào đã xác minh email khi cần cảnh báo | Không gửi; log `ai_cap_alert_no_recipient` |
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
| B5E28 | Lan trả Pro tới 30/11, ngày 15/11 được cấp "Pro tới 15/12" (D19) | Pro tới 15/12; chu kỳ AI giữ mốc cũ tới 30/11, sau đó theo mốc 15/11; lượt đã dùng trong chu kỳ đang chạy vẫn tính |
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
| B5E56 | `payment_succeeded` (app tự gia hạn) khi gói đó còn 10 ngày | Kỳ nối thêm 30/365 ngày từ cuối kỳ hiện tại |
| B5E57 | Gói "app tự gia hạn" hết kỳ, không mua lại | `expired`; email báo sắp hết hạn đã gửi trước `expiry_notice_days_before` ngày (mặc định 7) |
| B5E58 | Người dùng có cùng lúc gói Apple và gói web (Apple 3.1.3(b)) | Hai nguồn Pro; Pro khi còn ít nhất một; mốc theo nguồn bắt đầu sớm nhất |
| B5E59 | Tài khoản đang "đang xóa" (SR11, khi Bước 8 có trạng thái này) nhận sự kiện thanh toán | Sự kiện lưu, không áp (`ignored`, lý do `user-deleting`); không ghi dữ liệu mới cho người đó |

### 15.5 Email, dữ liệu, giới hạn

| # | When | Then |
|---|---|---|
| B5E60 | Job chạy hai lần cùng giờ (hai tiến trình API) | `entitlement_notices` unique: một email |
| B5E61 | Hạn mức email ngày đã hết | Email thanh toán không gửi được, log; job thử lại giờ sau; không chặn OTP |
| B5E62 | Log của webhook, cấp tay, sổ lượt (SR10) | Mang `operation_id`; không có số thẻ, email, `raw_payload` |
| B5E63 | Người học gọi `GET /v1/me/entitlements` liên tục | Chỉ đọc, không ghi gì; Bước 5 không thêm rule giới hạn cho API đọc (SR14 chỉ đòi cho API ghi) |
| B5E64 | Admin giảm `groups_per_user` dưới số nhóm một người đang có | Nhóm cũ giữ nguyên; tạo nhóm mới bị từ chối như luật hiện nay |
| B5E65 | Admin đặt `ai_daily_cap = 0` | Mọi `reserve` AI → `ai-unavailable` (như tắt công tắc) |

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
| B5#16 | Đặt `ai_daily_cap = 2`; ba người dùng `reserve` | Hai lượt được, lần ba `ai-unavailable`; email cảnh báo 75% gửi một lần cho admin |
| B5#17 | Tắt `ai_enabled` | `reserve` → `ai-unavailable`; phiên luyện không AI vẫn mở được |
| B5#18 | Admin cấp "Pro tới ngày X" cho người học Free | `plan = pro` ngay; lịch sử có dòng; thu hồi → Free ngay |
| B5#19 | Editor cấp cho editor khác / cho chính mình / đặt lượt AI | 409 `grant-not-allowed` đúng lý do |
| B5#20 | Admin đặt "lượt bài AI: 0" cho Pro | `reserve` → `entitlement-required` |
| B5#21 | Lọc lịch sử `granted_by = editor`, `expiring_within_days = 7` | Chỉ các lần cấp đúng điều kiện |
| B5#22 | Hoàn lượt một câu đã trừ trong chu kỳ | Còn lại tăng 1; hoàn lần hai không đổi |
| B5#23 | Admin đổi `free_practice_sessions_per_day` thành 5 | Free mở được phiên thứ 4, 5 ngay trong ngày |
| B5#24 | Admin đổi `private_words_per_user` thành 1.000 khi người học có 1.200 từ riêng | Từ cũ giữ; thêm từ riêng mới bị từ chối |
| B5#25 | Bật `ads_enabled` | Free: `ads.show = true` kèm tần suất; Pro, trial: `false` |
| B5#26 | Webhook sai chữ ký | 400; không có dòng sự kiện |
| B5#27 | `GET /v1/admin/entitlements/ai-usage` bằng tài khoản editor | 403 `forbidden` |
| B5#28 | Fake: `subscription_started` có trial cho tài khoản đã có `trial_history` (D30) | `plan = free` trong thời gian trial; log `trial_reuse_detected`; fake `endTrialNow` được gọi; sau `renewed` thì `plan = pro` |

## 17. Kiểm thử và "Xong khi" (Chốt D26, D27)

1. **CI xanh trên mọi PR** (`ci.yml`: lint, typecheck, build, unit, kiểm migration khớp schema). **Unit** cho các hàm thuần, theo bảng ví dụ: tính gói từ nhiều
   nguồn (mục 5.4), chu kỳ theo mốc (31/01 → 28/02 → 31/03; mốc đổi khi nguồn sớm nhất hết), ngày địa phương của phiên, đếm đã dùng và hoàn lượt (mục 7.2), máy trạng
   thái gói (bảng 9.4, mọi cặp trạng thái × sự kiện), luật sai thứ tự, luật cấp tay (bảng mục 10), chuẩn hóa và chữ ký của bộ nối giả.
2. **`pnpm smoke:buoc-5`** qua API và worker thật trên database mới `english_learning_smoke_b5` (như `smoke:buoc-4`): các bước B5#1–B5#28, dùng
   `pnpm billing:fake-event` và `pnpm entitlements:fake-ai`; đồng hồ giả hoặc lùi ngày bằng SQL như Bước 4; đọc Mailpit cho email.
3. **Không có e2e backend** (D38 Bước 4): khóa và chạy đua (B5E1, B5E11) **chỉ** được kiểm bằng smoke (request song song thật trên Postgres). Ghi ở rủi ro.
4. Task cuối của plan chạy (1) và (2), ghi as-built vào `docs/deliveries/buoc-5.md`. Implement: các phiên khác, một phiên điều phối; plan có mục brief cho phiên điều phối.

## 18. Ảnh hưởng tới các bước sau

- **Bước 6 (AI Integration):** kiểm lại `ai_enabled` trước khi gọi provider (AR10); sổ chi phí từng lần gọi; xét thêm trần bằng tiền và đối chiếu sổ lượt với sổ chi
  phí theo `operation_id`. Chọn model phải tính chi phí mỗi lượt so với giá Pro (Sonnet tầm trung có thể ngang giá gói, theo research).
- **Bước 7 (Practice AI, Content AI):** gọi `reserve` / `confirm` / `release` cho `ai_practice`, `ai_lookup`; một lượt cho cả lần tạo lại; làm lại câu đã lưu không
  `reserve`; dịch bổ sung dùng `ai_practice`; báo lỗi câu AI và staff xác nhận sai → `refund`. Content kiểm `ai.lookup` ở bước AI của chuỗi tra nghĩa; Free bỏ qua bước AI.
- **Bước 8 (Identity còn lại):** xóa tài khoản xóa lần cấp, sổ lượt, gói đăng ký, thông báo của người đó (ER16); còn mở: giữ `trial_history` (mã thẻ) sau khi xóa để chặn
  trial lại hay không (đụng SR11); giữ hóa đơn cho thuế; trạng thái "đang xóa" cho B5E59.
- **Đợt giao diện:** trang gói của người học (lượt còn lại, ngày làm mới, nút lên Pro), thông báo hết lượt và mời lên Pro, quảng cáo (SDK, hỏi đồng ý, tuổi tối
  thiểu), màn admin cấp tay và lịch sử, trang cài đặt (nhóm `entitlements`, `learning`, `content`), trang "cách trừ lượt AI" (ý I12).
- **Trước khi bán thật:** chọn nhà cung cấp theo hình thức kinh doanh (cá nhân, hộ kinh doanh, công ty); viết bộ nối; trang thanh toán và quản lý gói; cấu hình store
  (Apple: thứ hạng gói tháng/năm trong nhóm để tháng → năm là nâng cấp; grace 3 hoặc 16 ngày; Google: base plan và replacement mode); luật sư (mục 19); sửa landing (⚠9);
  hóa đơn và thuế.

## 19. Rủi ro và việc còn mở

- **Pháp lý (cần luật sư trước khi bán):** Điều 42 Luật 19/2023/QH15 (chấm dứt bất kỳ lúc nào, chỉ trả phần đã dùng, "trừ trường hợp có thỏa thuận khác") so với D24
  không hoàn tiền gói năm; báo trước ≥ 7 ngày làm việc so với trial 7 ngày lịch (email lúc bắt đầu trial là phần báo trước); email báo trước mỗi kỳ gia hạn có bắt buộc
  không (`renewal_notice_days_before`, mặc định tắt theo D29); hóa đơn điện tử và thuế khi bán dịch vụ số. Luật chỉ đọc qua trang thứ ba.
- **Không có e2e backend:** khóa, chạy đua, transaction chỉ được kiểm bằng smoke; unit dùng mock không bắt được lỗi SQL.
- **Khóa chung của trần AI** tuần tự hóa mọi lần giữ lượt AI của mọi người; ổn ở quy mô pilot (AR11: 5 lời gọi cùng lúc), phải đo lại nếu người dùng tăng nhiều.
- **Trần bằng lượt lệch tiền thật:** lần gọi lại (~10%), đổi model; Bước 6 có sổ chi phí thì xét trần bằng tiền.
- **Mốc chu kỳ khi nhiều nguồn chồng nhau** (mục 5.5) có thể làm người học thấy ngày làm mới đổi khi một nguồn hết (B5E28); hiếm, chấp nhận.
- **Mã nhận diện thẻ** không phải nhà cung cấp nào cũng có (chưa kiểm từng bên); khi không có, "một trial theo thẻ" không chặn được.
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
được trả lời ở D6–D8 và ⚠8) và `docs/HANDOFF_2026-10-05_BUOC_0.md` §2 (dòng Bước 5: thêm cổng thanh toán giả, quảng cáo, phiên luyện Free). Memory
`project_limits_by_subscription.md` sửa theo D4, D17 (giới hạn không theo gói). `docs/specs/` không sửa. Decision record viết cùng PR này. Landing sửa khi chốt câu chữ
gói (⚠9), không thuộc PR này.
