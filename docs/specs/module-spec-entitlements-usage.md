# Module spec — Entitlements & Usage

> Sinh bởi `write-spec`, lần chạy `v1-specs`, đợt 3. Mẫu `module-spec.md`. Cách trích dẫn: **K#, N#, F#** =
> [DECISIONS](DECISIONS_2026-10-04.md) và [kế hoạch](SPEC_PLAN_AND_DECISIONS_2026-10-04.md); **R#** =
> [research.md](../tasks/v1-specs/research.md); **S#, SR#** = [system-spec](system-spec.md); **IR#** =
> [Identity](module-spec-identity-access.md); **ASSUMPTION** = chưa có nguồn. Vùng cần Defense Analysis (quyền và hạn mức AI)
> nằm ở mục **Defense Analysis** cuối file.

**Ngày:** 2026-10-04 · **Module:** Entitlements & Usage · **Spec run:** v1-specs

> **Cấu trúc hạn mức chưa được chốt (K18 hoãn).** Chủ dự án đang tự nghiên cứu. Spec này mô tả những hành vi đúng với **mọi**
> cấu trúc có thể chọn (số lượt còn lại, cứng chặn, giữ chỗ nguyên tử, hiển thị cho người dùng) và đánh dấu `ASSUMPTION` ở những
> chỗ phụ thuộc cấu trúc. Con số giới hạn được viết là tham số `L`, không phải giá trị cụ thể.

## Observed on

Không có hệ thống tham chiếu. Chưa có số liệu sử dụng hay chi phí thật.

| Surface | How accessed | By whom | When |
|---|---|---|---|
| Quyết định về gói và quyền (K7, K17, K18, F31–F35) | Chat | Chủ dự án | 02–04/10/2026 |
| Cách các sản phẩm giới hạn lượt AI | Đọc trang chính thức và diễn đàn, xem `RESEARCH_AI_QUOTA_MODELS_2026-10-04.md` | Trợ lý | 04/10/2026 |

## Scope

Module sở hữu: **gói** (Free, Trial, Pro), **quyền theo feature** với **nguồn cấp** (trial tự kích hoạt, subscription, cấp tay bởi
admin), **hạn mức** và **sổ ghi lượt dùng** của người dùng, **giữ chỗ nguyên tử** trước khi gọi AI, và **giao diện với Billing** (nhận sự kiện
đăng ký, chưa có thanh toán). Ranh giới: chi phí và nhật ký từng lần gọi provider thuộc AI Integration; Practice và Content gọi Entitlements để kiểm quyền và giữ chỗ;
chấm đáp án bằng rule không cần quyền AI (SR4).

**Ngoài phạm vi V1:** thanh toán thật, giá, hóa đơn, tự động gia hạn (Apple In-App Purchase và Google Play Billing, R15); số lượt cụ thể
của trial và Pro (chủ dự án quyết sau); cấu trúc hạn mức cuối cùng (K18); trial nhiều lần.

## Constraints

| Constraint | Imposed by | Why it is not the implementer's choice |
|---|---|---|
| Free không có AI; Trial và Pro có AI; Pro có hạn mức cao hơn Trial | Chủ dự án (F31, K7) | Quyết định sản phẩm |
| Trial 14 ngày, người dùng tự kích hoạt, không cần billing, cần email đã xác minh | Chủ dự án (K7) | Quyết định sản phẩm |
| Quyền theo mã feature riêng, không có cờ `is_pro` chung; hạn mức tách khỏi quyền; có sổ lượt dùng | Chủ dự án (K2) | Cách dựng cho phép đổi gói và billing sau mà không sửa code gọi |
| Bán quyền Pro trong app trên iOS phải dùng In-App Purchase | Apple App Store Review Guidelines 3.1.1, ghi ở `DATA_COST_LICENSE_RESEARCH` mục 4 (R15 tóm tắt chưa nêu số mục) | Chính sách store; chỉ ảnh hưởng khi có billing |
| Billing không nằm trong V1; chỉ ghi giao diện | Chủ dự án | Quyết định sản phẩm |

## Business rules

| # | Quy tắc | Nguồn |
|---|---|---|
| ER1 | **Gói và feature.** Ba gói: Free, Trial, Pro. Mã feature: `ai.practice` (bài điền từ do AI sinh), `ai.lookup` (AI tra nghĩa khi thêm từ), `practice.basic` (bài không AI). Free chỉ có `practice.basic`; Trial và Pro có thêm hai feature AI. Các tính năng khác (nhóm, flashcard, lịch ôn, từ riêng tư) không gắn quyền | F31, F34, K20; tên mã feature và `ai.lookup` `ASSUMPTION` |
| ER2 | **Nguồn cấp.** Mỗi quyền hiệu lực có nguồn: `trial`, `subscription` hoặc `admin_grant`, cùng thời điểm bắt đầu, hết hạn (có thể không có với subscription) và lý do. Quyền hiệu lực của một người là hợp của các quyền chưa hết hạn | F31, R36 |
| ER3 | **Trial.** Người dùng tự kích hoạt bằng thao tác rõ ràng; yêu cầu email đã xác minh (hỏi Identity); mỗi tài khoản một lần; kéo dài 14 ngày kể từ lúc kích hoạt; hết hạn thì về Free và giữ nguyên dữ liệu học; đăng nhập hay xóa phiên không đặt lại hay kéo dài trial. Vì một hộp thư có thể xác minh nhiều địa chỉ (IR1), "một trial mỗi tài khoản" không bó được trial theo người; chấp nhận ở pilot | K7; "một lần mỗi tài khoản", "hết trial về Free" và việc chấp nhận rủi ro `ASSUMPTION` (chủ dự án để tính sau) |
| ER4 | **Kiểm khi tạo, không kiểm khi chấm.** Quyền AI và hạn mức được kiểm lúc tạo nội dung AI (câu hỏi, tra nghĩa). Chấm đáp án bằng rule không cần quyền, nên câu hỏi đã tạo vẫn nộp được sau khi trial hết | F32, SR4 |
| ER5 | **Giữ chỗ nguyên tử và vòng đời.** Trước khi gọi AI, bên gọi xin **giữ chỗ** một đơn vị với một `operation_id` (phạm vi theo người dùng và feature). Trạng thái: `reserved → confirmed` (AI thành công), `reserved → released` (lỗi hoặc hết thời gian), `reserved → expired` (không xác nhận sau 2 phút, tự nhả); `released` và `expired` là trạng thái cuối của giữ chỗ đó. **Thử lại sau lỗi tạm là một giữ chỗ mới** với cùng `operation_id`; cùng `operation_id` khi giữ chỗ cũ còn `reserved` hoặc đã `confirmed` trả về chính giữ chỗ đó. Xác nhận muộn sau `expired` được chấp nhận **chỉ khi còn đơn vị**; nếu không thì kết quả vẫn giao cho người dùng **miễn phí** và ghi log, nên không bao giờ vượt mức | F33, SR8; vòng đời, 2 phút và xác nhận muộn `ASSUMPTION` |
| ER6 | **Đơn vị.** Mặc định: **một câu hỏi AI phục vụ thành công là một lượt**, dù lấy từ ngân hàng hay sinh mới; một lần AI tra nghĩa trả kết quả hợp lệ là một lượt, tính ngay lúc AI trả kết quả chứ không đợi người học xác nhận gợi ý (CR15). Chi phí provider ghi riêng ở AI Integration | K17 (đơn vị hoãn), F33; toàn bộ là `ASSUMPTION` |
| ER7 | **Hết hạn mức thì chặn cứng.** Không có vượt mức; từ chối bằng lỗi Problem Details nêu loại "hết hạn mức" và thời điểm được dùng lại hoặc hết hạn. Các tính năng không AI không bị ảnh hưởng | K18 (cứng chặn thuộc phương án đề xuất), F33 |
| ER8 | **Hiển thị.** Người học xem được quyền hiện có, số lượt còn lại và thời điểm hạn mức làm mới hoặc quyền hết hạn | R39 (cộng đồng phàn nàn việc không thấy mức dùng); `ASSUMPTION` |
| ER9 | **Đổi chính sách.** Thay đổi con số hạn mức chỉ áp dụng cho lần kiểm sau; lượt đã xác nhận không tính lại; nếu giới hạn mới thấp hơn lượng đã dùng thì số còn lại là 0, không âm | ASSUMPTION |
| ER10 | **Cấp tay.** Admin cấp một quyền hoặc thêm lượt cho một người dùng với lý do và thời hạn; mọi lần cấp ghi sổ, xem được và thu hồi được. Trong pilot, Pro chỉ có được qua cấp tay | F31, K1 |
| ER11 | **Giao diện Billing.** Có một cổng nhận sự kiện đăng ký (bắt đầu, gia hạn, hủy, hết hạn) để tạo hoặc kết thúc quyền nguồn `subscription`; mỗi sự kiện có ID ngoài nên xử lý trùng lặp và sai thứ tự không tạo quyền thừa. V1 không có nhà cung cấp nối vào | F35, SR8; xử lý sai thứ tự `ASSUMPTION` |
| ER12 | **Sổ lượt dùng.** Append-only: người dùng, feature, `operation_id`, số đơn vị, trạng thái (`reserved`, `confirmed`, `released`, `expired`), thời điểm. Xóa cùng tài khoản; chỉ số liệu tổng hợp không định danh được giữ | K2, SR11 |
| ER13 | **Cửa sổ thời gian.** Nếu hạn mức tính theo ngày hoặc tháng thì ranh giới theo múi giờ của người dùng; nếu tính theo tổng trong thời hạn cấp thì theo thời điểm bắt đầu và hết hạn của quyền | SR13, K18 (cấu trúc hoãn) |
| ER14 | **Công tắc và trần chi AI toàn hệ thống (một chủ duy nhất).** Entitlements là nơi quyết định: khi giữ chỗ cho **bất kỳ** feature AI nào, nếu công tắc tắt hoặc trần chi hôm nay đã chạm thì giữ chỗ bị từ chối với lỗi "tạm thời không khả dụng", **kể cả khi câu sẽ lấy từ ngân hàng mà không gọi AI**; không trừ lượt của người dùng và các tính năng không AI vẫn chạy. AI Integration kiểm lại trước khi gọi provider như lớp bảo vệ thứ hai | RESEARCH_AI_QUOTA (đề xuất, chưa chốt); `ASSUMPTION` |
| ER15 | **Thao tác cho module khác.** `kiểm quyền`, `xem còn lại`, `giữ chỗ`, `xác nhận`, `nhả`; ba thao tác cuối idempotent theo `operation_id` | SR8, F33 |
| ER16 | **Xóa tài khoản.** Xóa quyền, nguồn cấp và sổ lượt dùng của người đó | K3, SR11 |
| ER17 | **Vòng đời của `ai.lookup`.** Content (bước 3 của chuỗi tra nghĩa) là bên điều phối: giữ chỗ bằng `operation_id` của yêu cầu tra → `lookup_word` → xác nhận khi thành công, nhả khi lỗi; thử lại sau lỗi tạm theo ER5 | CR15, F33 |

## Acceptance criteria — «When … then …»

`L` là giới hạn đã cấu hình cho gói và feature; giá trị do chủ dự án quyết định sau (K18).

| # | Criterion | Cites |
|---|---|---|
| E1 | When a Free user asks for an AI feature, then the request is refused with a Problem Details error that says the entitlement is required and the trial can be activated, while non-AI features keep working | F31 |
| E2 | When a user with a verified email activates the trial, then `ai.practice` and `ai.lookup` are granted with source `trial` for 14 days from that moment, and the remaining uses are shown | K7 |
| E3 | When a user whose email is not verified tries to activate the trial, then the request is refused | K7 |
| E4 | When a user who has already used the trial tries to activate it again, then the request is refused | ER3 (`ASSUMPTION`) |
| E5 | When the trial period ends, then AI features are refused, and non-AI features and all learning data are unchanged | ER3 (`ASSUMPTION`) |
| E6 | When a reservation is made and then confirmed, then the remaining uses go down by one unit | F33 |
| E7 | When a reservation is made and the AI call then fails or times out, then the reservation is released and the remaining uses are unchanged | F33 |
| E8 | When a reservation is never confirmed, then it expires after 2 minutes and is released | ER5 (`ASSUMPTION`) |
| E9 | When two requests ask for the last remaining unit at the same moment, then exactly one reservation is granted and the other is refused | F33 |
| E10 | When the same `operation_id` is used to reserve twice while the first reservation is active or confirmed, then the same reservation is returned and only one unit is held; when the first one was released, then a new reservation is made | SR8 |
| E11 | When the remaining uses are 0, then an AI request is refused with a hard stop that states when the feature can be used again or when the entitlement ends | ER7 |
| E12 | When a question was created while the trial was active and the answer is submitted after the trial ended, then it is graded normally | F32 |
| E13 | When an admin grants an entitlement with a reason and an expiry, then the user can use the AI feature until the expiry, the grant is visible in the ledger, and revoking it ends the access | F31 |
| E14 | When a non-admin tries to grant an entitlement, then the request is refused | K1 |
| E15 | When the configured limit is lowered below the units already used, then the remaining uses are 0, not negative | ER9 (`ASSUMPTION`) |
| E16 | When the system-wide daily AI budget is reached, then AI features answer "temporarily unavailable" without consuming the user's units, and non-AI features keep working | ER14 (`ASSUMPTION`) |
| E17 | When a subscription event with an already processed external ID arrives, then no second entitlement is created | F35 |
| E18 | When a user views the entitlements, then the features, the remaining uses and the renewal or expiry time are shown | ER8 (`ASSUMPTION`) |
| E19 | When a Free user triggers quick-add for a word the catalog lacks, then the AI lookup step is skipped and manual entry is offered | K20 |
| E20 | When a user deletes the account, then the entitlements, grants and usage ledger of that user are removed | K3 |
| E21 | When a confirmation arrives after its reservation expired and a unit remains, then it is counted; when no unit remains, then the result is delivered without a charge and the limit is not exceeded | ER5 (`ASSUMPTION`) |
| E22 | When the AI feature switch is off or the daily budget is reached, then a reservation is refused even if the question would come from the shared bank | ER14 (`ASSUMPTION`) |
| E23 | When an AI lookup succeeds but the learner then discards the suggestion, then the unit is still counted | ER6 (`ASSUMPTION`) |

## Edge cases

| # | Edge case | Expected | Cites |
|---|---|---|---|
| EE1 | The trial is activated from two devices at the same moment | Exactly one trial is created | ER3 (`ASSUMPTION`) |
| EE2 | The trial ends while a reservation made before the end is still in flight | The operation accepted before the end may finish and is confirmed | ASSUMPTION |
| EE3 | A confirmation arrives after the reservation has already expired | It is counted if a unit remains; otherwise the result is delivered free and logged, so the limit is never exceeded | ER5 (`ASSUMPTION`) |
| EE4 | A subscription event for the end of a period arrives before the event for its start | The final state follows the event timestamps and external IDs, and no extra entitlement is created | ER11 (`ASSUMPTION`) |
| EE5 | A Trial entitlement and an admin grant are active together | Their limits add up for the same feature | ASSUMPTION (depends on K18) |
| EE6 | A question comes from the shared bank and no AI call is made | It still costs one unit | ER6 (`ASSUMPTION`) |
| EE7 | A learner changes time zone and the limit is per day | The window follows the current time zone and a day is not counted twice | SR13 |
| EE8 | The owner turns the AI feature switch off | AI features answer "temporarily unavailable" and no unit is consumed | ER14 (`ASSUMPTION`) |

## Defense Analysis

Chưa chạy thử. Vùng này nằm trong danh sách "cần Defense Analysis trước khi chốt spec" của chủ dự án. Phần phụ thuộc cấu trúc hạn mức (K18) được ghi rõ.

**Đường đi bình thường.** Người dùng kích hoạt trial → xin tạo một câu AI → giữ chỗ → câu được phục vụ → xác nhận → số lượt còn lại giảm một và hiển thị.

**Bất biến.** (1) Số đã xác nhận không bao giờ vượt giới hạn. (2) Mỗi `operation_id` có tối đa một giữ chỗ đang hoạt động. (3) Giữ chỗ không xác nhận tự hết hạn. (4) Chấm đáp án không bao giờ cần quyền. (5) Thay đổi chính sách không tính lại lượt đã dùng. (6) Một nơi duy nhất quyết định công tắc và trần chi AI.

| Case | Hành vi bảo vệ | Phát hiện → khôi phục | Kiểm chứng dự kiến |
|---|---|---|---|
| Hai request cùng giành lượt cuối | Giữ chỗ nguyên tử: chỉ một bên được (ER5) | Số từ chối do hết hạn mức theo ngày | Hai request song song khi còn 1 lượt |
| Giữ chỗ rồi tiến trình chết (rò rỉ giữ chỗ) | Giữ chỗ tự hết hạn sau 2 phút và được nhả (ER5) | Số giữ chỗ hết hạn theo ngày | Dừng tiến trình giữa giữ chỗ và xác nhận |
| Provider trả kết quả nhưng chưa kịp xác nhận | Gọi lại với cùng `operation_id` lấy được cùng kết quả đã lưu ở AI Integration, rồi xác nhận; nếu không gọi lại thì giữ chỗ hết hạn và người dùng không bị trừ, chi phí provider vẫn được ghi | So khớp sổ lượt dùng với nhật ký chi phí theo `operation_id` | Ngắt sau khi provider trả lời |
| Trial hết giữa luồng | Tác vụ đã nhận trước khi hết hạn được hoàn tất (EE2); chấm đáp án không cần quyền (ER4) | — | Hết trial giữa tạo câu và nộp đáp án |
| Đổi chính sách giữa chu kỳ (người dùng phàn nàn bị khóa bất ngờ, R39) | Áp dụng cho lần kiểm sau, không tính lại lượt đã dùng; số còn lại không âm (ER9) | — | Hạ giới hạn khi người dùng đã dùng nhiều |
| Lạm dụng trial bằng nhiều tài khoản | Cần email đã xác minh (K7), một trial mỗi tài khoản (ER3). Rủi ro còn lại: xóa tài khoản rồi đăng ký lại để có trial mới, vì xóa tài khoản xóa cả dấu vết trial; chấp nhận ở pilot (tối đa 50 người) | Số trial kích hoạt theo ngày | Đăng ký, kích hoạt, xóa, đăng ký lại |
| Cấp tay sai hoặc bị lạm dụng | Phải có lý do và thời hạn, ghi sổ, thu hồi được (ER10) | Danh sách cấp tay | Cấp rồi thu hồi |
| Sự kiện subscription trùng hoặc sai thứ tự (khi có billing) | Khử trùng theo ID ngoài; trạng thái theo thời điểm sự kiện (ER11) | — | Gửi trùng, gửi ngược thứ tự |
| Chi phí AI vượt dự kiến | Trần chi toàn hệ thống mỗi ngày (ER14); cảnh báo khi gần chạm (`ASSUMPTION`: 80% trần) | Cảnh báo chi tiêu | Giả lập chi phí tăng |
| Quyền cũ nằm trong cache | Kiểm quyền và hạn mức khi tạo luôn đọc trạng thái chính thức; cache chỉ dùng cho hiển thị (V1_DATA_MODEL_DRAFT mục 5, đề xuất) | — | Đọc ngay sau khi đổi gói |
| Người dùng không biết mình đã dùng bao nhiêu | Hiển thị còn lại và hạn (ER8) | — | Kiểm màn hình hạn mức |
| Quan sát | Số lượt giữ chỗ, xác nhận, nhả, hết hạn mỗi ngày; số lần từ chối do hết hạn mức; số trial kích hoạt; không ghi nội dung câu hỏi (F4) | Báo cáo hằng ngày | Tìm một thao tác qua `operation_id` |
| Khôi phục | Công tắc tắt tính năng AI không tốn lượt (EE8) | — | Bật và tắt công tắc |
| Xác nhận bị mất sau khi AI đã trả kết quả | Giữ chỗ hết hạn thì không trừ người dùng; gọi lại cùng `operation_id` lấy kết quả đã lưu rồi xác nhận bằng giữ chỗ mới; xác nhận muộn được xử lý theo ER5 | So khớp sổ lượt dùng với nhật ký chi phí theo `operation_id` | Ngắt giữa AI trả lời và xác nhận |
| Thử lại sau khi giữ chỗ đã nhả; phạm vi của khóa | Thử lại là giữ chỗ mới với cùng `operation_id`; khóa có phạm vi theo người dùng và feature nên một khóa hằng số lỗi của client không trả kết quả của người khác (ER5, SR8) | — | Gửi lại sau lỗi tạm; hai người dùng dùng cùng một khóa |
| Hết quyền giữa một luồng dài (tạo câu mất tối đa 45 giây) | Tác vụ nhận trước khi hết hạn được hoàn tất (EE2); thời hạn giữ chỗ 2 phút dài hơn thời gian tạo câu tối đa của Practice (PRC5) | — | Hết trial khi đang tạo câu |
| Quy trình đối soát | Mỗi ngày so sổ lượt dùng (đã xác nhận) với nhật ký chi phí của AI Integration theo `operation_id`: lệch thì ghi báo cáo cho owner; không tự chỉnh số lượt người dùng | Báo cáo đối soát hằng ngày | Tạo lệch cố ý rồi chạy đối soát |
| Nhiều tài khoản từ một hộp thư (`+nhãn`, dấu chấm) | Chấp nhận ở pilot (IR1, ER3); theo dõi số trial theo ngày | Số trial kích hoạt bất thường | Đăng ký `a+1@`, `a+2@` rồi kích hoạt trial |

**Phương án thay thế và vì sao chưa chọn.** (a) Cửa sổ theo ngày hoặc tháng, (b) mô hình grant có hạn dùng và sổ ghi (mượn từ Stripe billing credits, R38), (c) chỉ theo ngày. Spec giữ hành vi chung vì chủ dự án đang nghiên cứu cấu trúc (K18); mô hình grant và các so sánh nằm ở `RESEARCH_AI_QUOTA_MODELS_2026-10-04.md`.

### Bổ sung theo mẫu Defense Analysis (05/10/2026)

Theo `docs/preparation/DECISION_ANALYSIS_TEMPLATE.md`. Chưa chạy thử; ước tính dung lượng dựa trên giả định sử dụng, không phải số đo.

| Nhóm case | Phân tích |
|---|---|
| Tiến hóa và tương thích | Thêm gói, feature hoặc thay con số hạn mức là đổi dữ liệu cấu hình, không đổi code gọi (mã feature riêng, K2, R36). Feature AI mới (chatbot V1.5) chỉ là một mã feature mới. Nối billing sau này đi qua cổng sự kiện (ER11) mà không đổi quy tắc kiểm quyền. Chuyển sang mô hình grant sau K18 chỉ đổi cách tính "còn lại", không đổi giao diện giữ chỗ, xác nhận, nhả (ER15). Response của quyền chỉ thêm field (SR7) nên client cũ vẫn chạy |
| Failure modes (xác nhận bị lỗi) | Xác nhận lỗi sau khi AI đã trả kết quả: giữ chỗ hết hạn thì người dùng không bị trừ, chi phí provider vẫn được ghi, và gọi lại cùng `operation_id` lấy kết quả đã lưu (ER5, Defense Analysis ở trên). Entitlements lỗi: tính năng AI trả "tạm thời không khả dụng", tính năng không AI vẫn chạy (ER14) |
| Năng lực và chi phí vận hành | Mỗi câu AI tạo ra khoảng hai bản ghi sổ (giữ chỗ và xác nhận). Với giả định 50 người, 20 câu mỗi người mỗi ngày: 50 × 20 × 365 = 365.000 yêu cầu mỗi năm, tức khoảng 0,73 triệu bản ghi; nhỏ với PostgreSQL nhưng cần chỉ mục theo (người dùng, feature, thời gian) (`ASSUMPTION` về mức sử dụng). Giữ chỗ là một ghi nguyên tử trên bộ đếm của (người dùng, feature), nên hai yêu cầu của cùng một người bị tuần tự hóa; người khác không bị ảnh hưởng. Giữ chỗ hết hạn được **tính lúc đọc** (giữ chỗ quá 2 phút không còn tính vào số đang giữ), nên không cần tiến trình nền quét định kỳ, hợp với quyết định chỉ dùng worker cho việc nhập nội dung. Chi phí AI mỗi câu chưa đo; trần chi mỗi ngày (ER14) là lớp bảo vệ |
| Đánh đổi chấp nhận | Hạn mức cứng không cho vượt (ER7) đổi lấy việc người dùng thấy bị chặn; đơn vị tính cả khi câu lấy từ ngân hàng (ER6) đổi lấy sự đơn giản cho người dùng, chi phí thực của chủ dự án thấp hơn; một hộp thư tạo nhiều tài khoản thử (IR1, ER3) được chấp nhận ở pilot |

**So sánh phương án cấu trúc hạn mức (K18, chưa chốt)**

| Phương án | Đáp ứng yêu cầu | Hạn chế | Chi phí và vận hành | Lý do |
|---|---|---|---|---|
| A. Cửa sổ theo ngày hoặc tháng | Quen thuộc, dễ giải thích | Ranh giới ngày theo múi giờ (SE3, EE7); khó cấp thêm cho người thử | Thấp | Chờ chủ dự án |
| B. Grant có hạn dùng và sổ ghi (R38) | Trial là một grant 14 ngày; cấp thêm là grant mới; thay cho `admin_grant` | Nhiều khái niệm hơn | Trung bình | Chờ chủ dự án; mô hình mượn từ Stripe |
| C. Chỉ theo ngày | Đơn giản nhất | Không biểu diễn được "tổng trong 14 ngày" | Thấp nhất | Chờ chủ dự án |

**Runbook tối thiểu.** Phát hiện: báo cáo đối soát hằng ngày lệch (sổ lượt dùng với nhật ký chi phí AI), số giữ chỗ hết hạn tăng, số lần từ chối do hết hạn mức tăng đột biến, ngân sách chi đạt 80%. Chẩn đoán: tra theo `operation_id` ở cả hai sổ. Xử lý: nhả giữ chỗ kẹt, chỉnh bằng một lần cấp tay có lý do, bật công tắc tắt AI khi chi phí vượt. Không tự chỉnh số lượt của người dùng. Xác minh: số còn lại bằng giới hạn trừ đi tổng đã xác nhận.

**Câu hỏi còn mở.** Cấu trúc hạn mức, đơn vị trừ lượt, trần chi AI (K18, chủ dự án đang nghiên cứu); số lượt trial và Pro; trial một lần mỗi tài khoản hay mỗi người.

## Cross-module contract notes

| Với module | Entitlements hứa hoặc cần |
|---|---|
| Practice | Cung cấp `kiểm quyền`, `giữ chỗ`, `xác nhận`, `nhả` cho `ai.practice`; `practice.basic` cho bài không AI. Practice là bên điều phối và **luôn** gọi xác nhận hoặc nhả (SR note: Practice điều phối) |
| Vocabulary Content | Bước AI tra nghĩa (CR15) dùng `ai.lookup` và có thể tính một lượt (ER6) |
| AI Integration | Báo chi phí mỗi lần gọi cho bộ theo dõi trần chi toàn hệ thống (ER14); không quyết định quyền |
| Identity & Access | Hỏi "email đã xác minh chưa" khi kích hoạt trial (IR5); nhận lệnh xóa dữ liệu theo người dùng |
| Billing (sau V1) | Cổng nhận sự kiện đăng ký (ER11) |

## Provenance markers used above

- **K#** — quyết định đã chốt; **N#, F#** — mặc định hoặc đề xuất mang nhãn riêng ở nguồn (nhiều F# có con số là `ASSUMPTION`); **R#** — finding trong `research.md` (R15, R36 là `documented (02/10)`; R39 là `documented (04/10)` cho trang Claude và Notion).
- **S#, SR#, IR#** — spec khác. **ASSUMPTION** — không có nguồn; được mang vào báo cáo cuối.
