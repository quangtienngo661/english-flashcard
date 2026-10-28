# Tiêu chuẩn thương mại hóa và khả năng kiếm doanh thu của dự án (19/10/2026)

> **Đây là tài liệu nghiên cứu, không phải tư vấn pháp lý.** Nhiều văn bản luật chỉ đọc được qua trang sao chép
> (hethongphapluat.com, dulieuphapluat.vn) vì cổng chính thức chặn truy cập trong phiên nghiên cứu, nên số điều khoản cần
> đối chiếu lại trên Công báo hoặc vbpl.vn trước khi dùng cho hồ sơ. Ghi chú pháp lý khuyến nghị **xin một ý kiến pháp lý
> ngắn bằng văn bản từ một công ty luật Việt Nam trước lần ra mắt có thu tiền đầu tiên**
> ([1_legal_vietnam.md](evidence/commercialization-2026-10-19/1_legal_vietnam.md), mục Q9).
>
> Bằng chứng gốc, đọc khi cần chi tiết:
> [1 — pháp lý Việt Nam](evidence/commercialization-2026-10-19/1_legal_vietnam.md) ·
> [2 — App Store, Google Play, thanh toán](evidence/commercialization-2026-10-19/2_app_stores_payments.md) ·
> [3 — chất lượng sản phẩm và kỹ thuật](evidence/commercialization-2026-10-19/3_product_quality_standards.md) ·
> [4 — thị trường và unit economics](evidence/commercialization-2026-10-19/4_market_unit_economics.md) ·
> [5 — kiểm kê dự án](evidence/commercialization-2026-10-19/5_project_inventory.md).
>
> Nhãn giữ nguyên như trong ghi chú: **UNVERIFIED** = chưa xác nhận được từ nguồn gốc trong phiên nghiên cứu;
> **ESTIMATE** = con số tự tính từ giả định đã nêu; **ASSUMPTION** = giá trị đầu vào tự chọn; *(secondary)* = nguồn thứ cấp
> (công ty luật, nhà cung cấp, báo), không phải văn bản gốc. Tỷ giá dùng cho mọi phép đổi: 1 USD = 26.300 VND (ASSUMPTION,
> theo Vietcombank 02/07/2026 qua [topi.vn](https://topi.vn/usd-to-vnd-theo-ty-gia-vietcombank.html)).

## Tóm tắt để quyết định

**Kết luận.** Dự án *có thể* thương mại hóa (bán lấy tiền) hợp pháp ở Việt Nam, nhưng **hôm nay chưa thu được đồng nào** và
**chưa có bằng chứng sẽ có lãi**. Luật mới cho phép một cá nhân sở hữu website hay app tự bán dịch vụ của mình
([Luật 122/2025 Điều 3](https://hethongphapluat.com/luat-thuong-mai-dien-tu-2025.html)), và không tìm thấy quy định nào đòi
giấy phép giáo dục cho app tự học (kết luận này dựa trên việc *không tìm thấy*, chưa nguồn chính thức nào xác nhận). Điều kiện
là: đăng ký ít nhất một hộ kinh doanh, có thông báo website thương mại điện tử được xác nhận, bộ chính sách tiếng Việt, cơ chế
xin đồng ý dữ liệu, và bán qua kênh thanh toán đúng luật của từng nền tảng. Về tiền, ở mức giá giữa (79.000 đ/tháng,
499.000 đ/năm) cần khoảng **162 / 535 / 1.281 người trả tiền** để lãi **5 / 20 / 50 triệu đ/tháng**, tức khoảng
**5,4k / 18k / 43k người dùng hoạt động mỗi tháng** nếu 3% trong số đó trả tiền (ESTIMATE, xem mục cuối); mốc 20 triệu tương
đương ~US$1.000 doanh thu định kỳ mỗi tháng, mức mà chỉ **17,3% app đạt được trong 2 năm đầu**
([RevenueCat](https://www.revenuecat.com/state-of-subscription-apps)).

**Năm điểm chặn lớn nhất**
1. **Chưa có thứ gì để người học trả tiền:** chưa có giao diện người học, chưa có app mobile, module quyền dùng tính năng
   (`entitlements`) chỉ là placeholder luôn trả "được phép", không có code thanh toán, không có AI, mà AI là thứ duy nhất
   phân biệt Pro với Free ([entitlements.service.ts](../../apps/api/src/entitlements/entitlements.service.ts);
   [kiểm kê §0–2](evidence/commercialization-2026-10-19/5_project_inventory.md)).
2. **Nội dung gần như trống:** 7.799 từ đã có cấp độ nhưng các DB thử chỉ có 4–20 nghĩa tiếng Việt; duyệt đủ 8.812 từ ước
   **73–440 giờ** (`ASSUMPTION`, D5/D6 trong [quyết định Bước 3](../superpowers/decisions/2026-10-16-buoc-3-learning-decisions.md)).
3. **Nền pháp lý chưa có:** chưa đăng ký kinh doanh, chưa thông báo TMĐT, Privacy chỉ viết cho waitlist, Terms là bản nháp,
   form đăng ký không lưu đồng ý và tuổi, chưa có chức năng xóa tài khoản.
4. **Chưa vận hành được:** API và DB chưa `deploy` (chưa đưa lên máy chủ thật trên internet), chưa có backup hay giám sát;
   3 lỗi nặng C1–C3 từ review 18/10 vẫn còn trong code; test tự động chạy với DB thật cho API đã bị xóa (D38).
5. **Nhu cầu chưa kiểm chứng:** dữ liệu người dùng duy nhất là khảo sát 13 phiếu; D12 dời việc tìm người dùng tới khi app
   hoàn chỉnh ([SURVEY_ANALYSIS](SURVEY_ANALYSIS_2026-09-30.md)).

**Rủi ro chưa kiểm chứng (UNVERIFIED, chính là các câu cần hỏi luật sư):** (a) lịch sử học có thể bị xếp là "dữ liệu nhạy
cảm" theo Nghị định 356/2025, khi đó mất miễn trừ và phải nộp hồ sơ đánh giá tác động trong 60 ngày từ lần xử lý đầu;
(b) nghĩa vụ lưu dữ liệu người dùng tại Việt Nam (Luật 116/2025 Điều 25, Nghị định 333/2026) có thể xung đột với Cloudflare
và máy chủ đặt ở nước ngoài; (c) Nghị định 333 có thể bắt xác thực tài khoản bằng số điện thoại Việt Nam; (d) chưa rõ cá nhân
chưa đăng ký có được bán gói định kỳ không, và cổng thanh toán nào nhận hộ kinh doanh làm merchant (người bán đứng tên hợp đồng).

**Quyết định cần chủ dự án chốt**

| # | Quyết định | Đề xuất | Trade-off chính |
|---|---|---|---|
| Q1 | Hình thức kinh doanh | Đăng ký **hộ kinh doanh** trước lần thu tiền đầu; chuyển **công ty TNHH một thành viên** khi doanh thu gần 1 tỷ đ/năm, hoặc khi cần tài khoản Apple dạng tổ chức hay cổng tự gia hạn bằng VND | Chịu trách nhiệm bằng toàn bộ tài sản; App Store hiện tên thật của chủ dự án; cổng có thể đòi "xác thực tổ chức" (UNVERIFIED) |
| Q2 | Kênh thu tiền đầu tiên | **Web, gói trả trước 1/3/12 tháng qua payOS (chuyển khoản quét mã VietQR)**: cá nhân đăng ký bằng CCCD, giữ ~97,5–100% giá | Không tự gia hạn nên dễ rơi rụng; điều khoản payOS cho cá nhân bán gói số chưa rõ; ở khối Ấn Độ + Đông Nam Á chỉ 0,8% doanh thu app đến từ web |
| Q3 | Bản ra mắt có gồm Flutter không | **Web trước, mobile sau khi đã có người trả tiền** | 66% lượt cài app ở VN là Android, và tìm kiếm trên store là kênh ghi chú xếp thử đầu tiên (chưa kiểm); mobile thêm In-App Purchase, US$99/năm, ~3 tuần thử kín trên Google Play |
| Q4 | Kiểm chứng trước hay sau khi xây Bước 5–8 | **Xem lại D12:** đưa giao diện mỏng + cấp Pro bằng tay (ER10) cho 10–30 người để đo tỷ lệ trả tiền thật | Đảo một quyết định đã chốt; V1 đầy đủ chậm lại; mẫu nhỏ nên kết quả nhiễu |
| Q5 | Tuổi tối thiểu, rồi mới tới nhà cung cấp AI | **Chốt tuổi trước** (đề xuất cũ: 16+), rồi mới chọn provider; Gemini API chỉ dùng được nếu app chặn người dưới 18 | 16+ hay 18+ đều mất phần học sinh; nhận người dưới 16 thì tài khoản phải do cha mẹ đăng ký |
| Q6 | Pro bán gì, giá bao nhiêu | **Chốt giá tháng và xem lại K26** (gói năm = 12 × giá tháng × 90%): đối thủ bán gói năm chỉ bằng ≈25–50% giá 12 tháng, và mô hình doanh thu dùng giá năm không khớp K26; thử bán cả tiện ích không-AI, không chỉ AI | Đổi K26 đã chốt 16/10; chuyển tính năng khỏi Free trái với thẻ "Sử dụng vĩnh viễn" trên landing |

## Bảng kiểm: yêu cầu, nguồn và hiện trạng dự án

Trạng thái: **Đã xây** (built, có code chạy), **Mới thiết kế** (designed only, có trong spec hay quyết định nhưng chưa có
code), **Chưa có** (missing). Hiện trạng lấy từ [5_project_inventory.md](evidence/commercialization-2026-10-19/5_project_inventory.md)
(HEAD `9deb8d4`); đường dẫn trỏ tới file trong repo. Cột công sức chỉ điền khi ghi chú có con số.

### Bắt buộc trước khi thu tiền lần đầu

| Yêu cầu | Nguồn | Hiện trạng dự án (19/10/2026) | Công sức / chi phí |
|---|---|---|---|
| Sản phẩm người học dùng được: giao diện người học, quyền Pro ghi trên server, tính năng Pro chạy thật | Điều kiện sản phẩm; Apple 2.1, 4.2 nếu lên iOS | **Chưa có.** `apps/web/src/app/[locale]/` chỉ có landing, privacy, terms; [entitlements.service.ts](../../apps/api/src/entitlements/entitlements.service.ts) luôn trả `{ allowed: true }`; không có `AiProvider` trong `apps/api/src`; Bước 3–4 chỉ có API ([buoc-4.md](../deliveries/buoc-4.md)) | Ghi chú không ước tính |
| Nội dung: nghĩa tiếng Việt đã duyệt cho các từ trong catalog | D6 (mục tiêu 8.812 từ trước ra mắt) | **Chưa có.** Nhập file CEFR-J thật cho "senses_created 0" ([PROJECT_ASSESSMENT](PROJECT_ASSESSMENT_2026-10-15.md)); không có CSV nội dung trong repo, chưa thấy đợt thử 20 từ | 73–440 giờ duyệt (`ASSUMPTION`, D5/D6) |
| Hình thức kinh doanh (hộ kinh doanh hoặc công ty) và mã số thuế | Nghị định 168/2025 Điều 82 khoản 3; Nghị định 248/2026 Điều 4 | **Chưa có.** Chủ dự án đang là cá nhân ([LEGAL_PAGES_RESEARCH §4](LEGAL_PAGES_RESEARCH_2026-10-11.md)) | Vốn, lệ phí lập công ty: UNVERIFIED |
| Thông báo website/app TMĐT được UBND cấp tỉnh xác nhận **trước khi** mở thanh toán; gắn biểu tượng liên kết online.gov.vn | Luật 122/2025 Điều 14 khoản 1; Nghị định 248/2026 Điều 23–24, 45 | **Chưa có** | Trả lời trong 3 ngày làm việc sau khi hồ sơ đủ (Phụ lục I) |
| Thông tin bắt buộc hiển thị: tên, địa chỉ, mã số thuế chủ sở hữu; Terms; giá ghi rõ đã gồm thuế chưa; cách thanh toán; chính sách hoàn tiền; Privacy | Nghị định 248/2026 Điều 4, 6, 8, 10, 14, 17 | **Chưa có (một phần).** Privacy chỉ cho waitlist ([PrivacyPolicy.tsx](../../apps/web/src/components/sections/PrivacyPolicy.tsx)); Terms là bản nháp ([LegalDraft.tsx](../../apps/web/src/components/sections/LegalDraft.tsx)); trang giá chỉ có Free và Trial ([Plans.tsx](../../apps/web/src/components/sections/Plans.tsx)) | — |
| Luồng đặt mua: hiện đủ điều khoản trước khi đặt, cho xem lại và sửa, tải được hợp đồng, lưu dữ liệu hợp đồng 3 năm (ngắn hơn cho hộ kinh doanh) | Luật 122/2025 Điều 12, 16; Luật 19/2023 Điều 37–38 | **Chưa có** (không có code billing) | — |
| Gói định kỳ: báo trước ≥ 7 ngày làm việc trước mỗi lần thu phí và trước khi hết hạn; hủy bất cứ lúc nào; hoàn tiền trong 30 ngày khi hủy hợp lệ; không điều khoản bất công | Luật 19/2023 Điều 25, 38, 42; Nghị định 55/2024 Điều 6 | **Chưa có.** Hạ tầng email nhắc học của Bước 3 có thể tái dùng (suy luận, [buoc-3.md](../deliveries/buoc-3.md)) | — |
| Dữ liệu cá nhân: thông báo xử lý tiếng Việt; đồng ý theo từng mục đích, không tick sẵn, có lưu vết (thời điểm, phiên bản); đồng ý riêng cho email quảng cáo; kênh yêu cầu quyền; quy trình sự cố 72 giờ (A05) và 24 giờ (luật người tiêu dùng) | Luật 91/2025 Điều 9–10, 23; Nghị định 356/2025; Luật 19/2023 Điều 18–19; Nghị định 91/2020 | **Chưa có.** Body đăng ký chỉ có `email, password, timezone, client, device_label` ([auth.schemas.ts](../../apps/api/src/identity/auth/auth.schemas.ts)); model `User` không có cột đồng ý hay tuổi ([identity.prisma](../../apps/api/prisma/models/identity.prisma)); DB3 "Nên xong trước pilot" ([DB review](../superpowers/reviews/2026-10-17-db-schema-business-review.md)) | — |
| Người dùng nhỏ tuổi: hỏi tuổi; dưới 16 thì cha mẹ đăng ký bằng thông tin của cha mẹ; từ 7 tuổi cần cả trẻ lẫn cha mẹ đồng ý khi Điều 24 áp dụng | Luật 116/2025 Điều 16 khoản 2; Luật 91/2025 Điều 24; Luật Trẻ em 102/2016 Điều 1 | **Chưa có.** Tuổi tối thiểu (đề xuất 16+) chưa chốt ([LEGAL_PAGES_RESEARCH §9](LEGAL_PAGES_RESEARCH_2026-10-11.md)) | — |
| Xóa tài khoản trong app, xóa cả dữ liệu (Google Play đòi thêm link web) | Apple 5.1.1(v); Google Play account deletion; Nghị định 356/2025 (xóa trong 20 ngày) | **Mới thiết kế.** SR11 ([system-spec.md](../specs/system-spec.md)); chưa có route xóa; dời sang Bước 8 ([DB review §6](../superpowers/reviews/2026-10-17-db-schema-business-review.md)) | — |
| Thuế: sổ doanh thu; hộ dưới 1 tỷ đ/năm nộp mẫu 01/TKN-CNKD trước 31/1; khai mã số thuế cho Apple và Google | Nghị quyết 198/2025 Điều 10; Nghị định 68/2026 + 141/2026; Nghị định 117/2025 | **Chưa có** | — |
| Kênh thanh toán và server tự ghi quyền Pro khi nhận báo "đã trả" (webhook web; thông báo của Apple/Google; xác nhận đơn Google trong 3 ngày) | Apple 3.1.1; Google Play Payments policy; vòng đời subscription của Google | **Mới thiết kế.** Billing chỉ là giao diện (ER11), "thanh toán thật ... ngoài phạm vi V1" ([module-spec-entitlements-usage.md](../specs/module-spec-entitlements-usage.md)); F35 dời billing sang V1.5 | RevenueCat miễn phí dưới US$2.500 doanh thu theo dõi/tháng, sau đó 1% |
| Giá Pro | K26 | **Chưa có.** "Giá tháng chưa chốt" ([DECISIONS §11](../specs/DECISIONS_2026-10-04.md)) | — |
| Kênh liên hệ và quy trình khiếu nại trên web và trong app | Luật 19/2023 Điều 37; Apple 1.5 | Ghi chú kiểm kê không kiểm mục này | — |
| Ghi công nguồn dữ liệu cho người học xem (trích dẫn CEFR-J, CC BY-SA cho Octanove, thông báo AGID/WordNet) | Điều khoản CEFR-J; CC BY-SA 4.0; SR15 | **Đã xây một phần.** Có `GET /v1/sources` ([sources.controller.ts](../../apps/api/src/content/sources/sources.controller.ts)) và model `DataSource` ([content.prisma](../../apps/api/prisma/models/content.prisma)); chưa có màn hình cho người học; [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md) chưa có mục CEFR-J/Octanove | — |
| `Deploy` thật: hosting, Postgres/Redis bền, SMTP thật, secrets, backup kèm diễn tập khôi phục, công cụ gom lỗi, kiểm tra sống từ bên ngoài | SRE (best practice); ASVS V13.3.1 (L2); Apple 2.1 (back end phải chạy khi review) | **Chưa có.** Không có Dockerfile hay cấu hình hosting; Deploy dời tới "khi toàn bộ app hoàn chỉnh" (D3, [quyết định Bước 3](../superpowers/decisions/2026-10-16-buoc-3-learning-decisions.md)) | ~US$35–60 ≈ 0,9–1,6 triệu đ/tháng (ESTIMATE); Sentry có gói miễn phí |
| Sửa 3 lỗi nặng C1–C3 | [Review 18/10](../superpowers/reviews/2026-10-18-buoc-0-4-code-review.md); ASVS V16 (L2); OWASP API4 | **Đã xây nhưng còn lỗi:** [idempotency.service.ts](../../apps/api/src/common/idempotency/idempotency.service.ts), [local-date.ts](../../apps/api/src/common/time/local-date.ts), [problem-details.filter.ts](../../apps/api/src/common/problem-details/problem-details.filter.ts) | — |
| Email giao dịch vào được hộp thư: tên miền riêng, SPF/DKIM/DMARC | Hướng dẫn người gửi của Gmail (mọi người gửi cần SPF hoặc DKIM, tỷ lệ spam < 0,3%) | **Chưa có.** Dự định dùng SMTP Gmail cá nhân, giới hạn chưa có nguồn ([buoc-1.md](../deliveries/buoc-1.md)) | — |
| Nếu Pro bán AI: công bố và xin phép trước khi gửi dữ liệu cho AI bên thứ ba; điều khoản provider về người dưới 18; nhãn "AI tạo"; nút báo lỗi; trần chi phí | Apple 5.1.2(i), 1.2; điều khoản Gemini API; hướng dẫn của Anthropic cho người dưới 18; OWASP API4, LLM10 | **Mới thiết kế.** K16, K17, ER14 (`ASSUMPTION`), AR1–AR14 ([module-spec-ai-integration.md](../specs/module-spec-ai-integration.md)); provider chưa chọn; luồng báo lỗi đã có cho câu không-AI (PR #55, [buoc-4.md](../deliveries/buoc-4.md)) | AI ~2–3 đ/câu (ESTIMATE) |
| Nếu bán trên mobile: tài khoản Apple và Google, In-App Purchase / Play Billing, không chỉ đường sang web, Sign in with Apple nếu có đăng nhập Google, nhãn quyền riêng tư và Data safety, xếp hạng tuổi riêng cho VN, privacy manifest, target API 36, Xcode 26 | Apple 3.1.1, 3.1.1(a), 4.8, 5.1.1, 2.3.6; Google Play Payments, Data safety, target API | **Chưa có.** Không có `pubspec.yaml`; D2 "Chỉ web; Flutter sau" | Apple US$99/năm; Google US$25 một lần; thêm ~3 tuần cho cổng thử kín |

### Bắt buộc trước khi mở rộng

| Yêu cầu | Nguồn | Hiện trạng dự án (19/10/2026) | Công sức / chi phí |
|---|---|---|---|
| Hồ sơ đánh giá tác động xử lý dữ liệu (DPIA) trong 60 ngày từ lần xử lý đầu; hồ sơ chuyển dữ liệu ra nước ngoài trong 60 ngày từ lần chuyển đầu; cập nhật 6 tháng/lần khi thay đổi. **Có thể phải làm ngay từ đầu** nếu lịch sử học là dữ liệu nhạy cảm (UNVERIFIED) | Luật 91/2025 Điều 20–22, 38; Nghị định 356/2025 | **Chưa có** | A05 xem trong 15 ngày, bên nộp có 30 ngày bổ sung (EY, *secondary*) |
| Quyết định lưu dữ liệu tài khoản và log tại VN (hoặc bản sao lấy ra được); giữ log ≥ 12 tháng | Luật 116/2025 Điều 25 khoản 3; Nghị định 333/2026 Điều 16, 19–20 | **Chưa quyết.** Landing và waitlist đang chạy trên Cloudflare Workers + D1 ([wrangler.jsonc](../../apps/web/wrangler.jsonc)) | Áp dụng tự động hay chỉ khi có yêu cầu: UNVERIFIED |
| Xác thực tài khoản bằng số điện thoại VN hoặc số định danh, nếu Nghị định 333 phủ tới app không phải mạng xã hội | Nghị định 333/2026 | **Chưa có** (chỉ email) | Phạm vi: UNVERIFIED |
| Tự phân loại rủi ro AI; thông báo Bộ KH&CN nếu rủi ro trung bình; báo sự cố trong 72 giờ (khẩn) hoặc 5 ngày làm việc | Luật AI 134/2025; Nghị định 142/2026 Điều 6–12, 19 | **Chưa có** (chưa có AI) | — |
| Doanh thu hộ > 1 tỷ đ/năm: khai VAT 5% và thuế TNCN, hóa đơn điện tử bắt buộc; cân nhắc chuyển công ty | Nghị định 68/2026, 141/2026 | Chưa tới ngưỡng | — |
| Cán bộ bảo vệ dữ liệu (DPO) khi mất miễn trừ | Nghị định 356/2025 | Chưa áp dụng | Được thuê dịch vụ DPO bên ngoài |
| Nộp lại thông báo TMĐT trong 20 ngày làm việc khi đổi tên miền, người chịu trách nhiệm, chính sách | Nghị định 248/2026 Điều 23 khoản 3 | Chưa áp dụng | — |
| Nếu tự trừ thẻ định kỳ (ví dụ token VNPAY): điều khoản đặt ngay cạnh ô nhập thẻ, email xác nhận kèm cách hủy, hủy online, nhắc ≥ 7 ngày trước khi hết dùng thử, nhắc 7–30 ngày trước khi gia hạn gói năm; PCI DSS SAQ A, quét lỗ hổng mỗi quý | Mastercard Rules 5.4.1; Visa "Trial Subscription Updates"; PCI DSS v4.0.1 SAQ A, FAQ 1588 | Chưa áp dụng | — |
| Khôi phục test tự động chạm Postgres/Redis thật; sửa 16 lỗi mức trung bình (T1–T14 …) | [Review 18/10](../superpowers/reviews/2026-10-18-buoc-0-4-code-review.md); D38 | **Đã xóa** e2e backend ở PR #57 ([buoc-4.md](../deliveries/buoc-4.md)) | — |
| Hiệu năng: Core Web Vitals đạt "good"; Android crash < 1,09%, ANR < 0,47%; không treo > 250 ms trên iOS | web.dev; Android vitals; Apple 2.1 | **Chưa đo** cho phần người học (chưa có); T7: luyện tập nguồn "all" 1.267 ms so với ngân sách < 1 s | — |

### Nên có

| Yêu cầu | Nguồn | Hiện trạng dự án (19/10/2026) | Công sức / chi phí |
|---|---|---|---|
| WCAG 2.2 AA cho web người học và app (không bắt buộc với app tư nhân ở VN) | Thông tư 26/2020/TT-BTTTT; EAA (miễn cho doanh nghiệp siêu nhỏ) | **Đã xây một phần:** CI của landing chạy Playwright + axe ([ci.yml](../../.github/workflows/ci.yml)) | — |
| Pen test bên thứ ba (không luật nào bắt); tự kiểm theo ASVS L1 + một số mục L2; quét lỗ hổng thư viện trong CI | OWASP ASVS 5.0.0 | **Chưa có.** CI không có quét lỗ hổng dependency | — |
| Mục tiêu độ ổn định (SLO), checklist xử lý sự cố, nơi đăng trạng thái | Google SRE Workbook; NIST SP 800-61r3 | **Chưa có** | — |
| Bảo vệ nhánh `main`/`dev` (bắt PR, bắt CI xanh) | [CLAUDE.md](../../CLAUDE.md), mục Branching model | **Chưa làm** (việc của chủ dự án trong GitHub) | — |
| Xin Tono Lab xác nhận bằng văn bản việc dùng CEFR-J thương mại; chuyển sang bản 1.6 chính thức | [Trang tải CEFR-J](https://www.cefr-j.org/download.html) | Repo dùng bản 1.5 từ mirror, chưa kiểm bản 1.6 ([buoc-2.md](../deliveries/buoc-2.md)) | — |
| Nhãn "AI tạo" trên mọi nội dung AI; DPIA tự nguyện; rà GDPR/COPPA trước khi nhận người dùng EU/Mỹ | Nghị định 142/2026; GDPR Điều 3, 8; COPPA | **Chưa có** | — |
| Đo giữ chân ngày 1/7/30 và tỷ lệ hoàn thành lượt ôn; đặt ngưỡng pilot; quảng cáo chỉ nói "dùng spaced repetition", không hứa "nhanh gấp 2" | Cepeda 2006; Donoghue & Hattie 2021 | **Mới thiết kế:** chỉ số có trong [DECISIONS §8](../specs/DECISIONS_2026-10-04.md), ngưỡng chưa có (Q-D) | — |

## Luật Việt Nam cho phép cá nhân bán, nhưng đòi đăng ký và thông báo trước ngày thu tiền

Câu hỏi đầu tiên là ai đứng tên bán. Luật Thương mại điện tử 122/2025/QH15 (hiệu lực 01/7/2026) gọi một website hay app tự bán
hàng hoặc dịch vụ của chính mình là "nền tảng thương mại điện tử kinh doanh trực tiếp" và nói rõ **tổ chức hoặc cá nhân** đều
được lập ([Luật 122/2025, bản sao hethongphapluat](https://hethongphapluat.com/luat-thuong-mai-dien-tu-2025.html)); Nghị định
248/2026 Điều 4 cho cá nhân khai tên, địa chỉ cư trú và mã số thuế cá nhân ([Nghị định 248/2026, bản sao dulieuphapluat](https://dulieuphapluat.vn/van-ban/thuong-mai-van-ban/nghi-dinh-2482026nd-cp-huong-dan-luat-thuong-mai-dien-tu-1389723.html)).
Nhưng luật đăng ký kinh doanh hẹp hơn: Nghị định 168/2025 Điều 82 khoản 3 chỉ miễn đăng ký hộ kinh doanh cho một danh sách nghề
thu nhập thấp như bán hàng rong hay "làm dịch vụ có thu nhập thấp", và **bán hàng online không có trong danh sách**
([Nghị định 168/2025 Điều 82](https://hethongphapluat.com/nghi-dinh-168-2025-nd-cp-ve-dang-ky-doanh-nghiep/dieu-82)). Ghi chú
pháp lý suy ra rằng bán gói trả tiền định kỳ mà không đăng ký có rủi ro bị coi là kinh doanh không đăng ký; đây là suy luận,
chưa có cơ quan nào xác nhận. **Hộ kinh doanh** (hình thức đăng ký ở cấp xã, rẻ và nhanh) không phải pháp nhân, tức pháp luật
không coi nó là một "người" riêng tách khỏi chủ, nên chủ chịu trách nhiệm bằng toàn bộ tài sản cá nhân; **công ty TNHH một thành
viên** là pháp nhân, chủ chỉ chịu trong phần vốn góp, đổi lại phải làm kế toán, xuất hóa đơn điện tử từ lần bán đầu và nộp thuế
thu nhập doanh nghiệp ([MISA AMIS](https://amis.misa.vn/250389/nen-thanh-lap-cong-ty-hay-ho-kinh-doanh-ca-the/) *(secondary)*).
Một trang tư vấn thuế còn nói chủ hộ kinh doanh đã đăng ký thuộc diện bảo hiểm xã hội bắt buộc từ 01/7/2025
([ketoanthuanthien.vn](https://ketoanthuanthien.vn/hoi-dap/ban-hang-online-facebook-tiktok-co-bat-buoc-dang-ky-ho-kinh-doanh-khong/)
*(secondary, chỉ thấy qua tóm tắt tìm kiếm)*). Lựa chọn này còn quyết định tên hiện trên App Store: Apple chỉ nhận đăng ký dạng
"Organization" từ một pháp nhân có mã D-U-N-S (một mã số doanh nghiệp Apple yêu cầu), còn tài khoản cá nhân hiển thị **tên thật
của chủ dự án** làm người bán ([Apple Enroll](https://developer.apple.com/programs/enroll/)). Chưa có nguồn gốc nào cho biết
VNPAY, MoMo, payOS hay OnePay có nhận cá nhân chưa đăng ký làm merchant không.

Thứ hai là thủ tục trước khi mở thanh toán. Từ **01/7/2026**, Nghị định 52/2013 và 85/2021 hết hiệu lực; một website hoặc app có
chức năng đặt hàng online phải **thông báo và được xác nhận trước khi vận hành** (Luật 122 Điều 14 khoản 1;
[Điều 14](https://hethongphapluat.com/luat-thuong-mai-dien-tu-2025/dieu-14)). Cơ quan xác nhận nay là **UBND cấp tỉnh**, trả lời
trong **3 ngày làm việc** khi hồ sơ đủ (Nghị định 248 Điều 23–24, Phụ lục I), nộp qua Cổng Dịch vụ công Quốc gia
([Tenzen](https://tenzen.vn/huong-dan-thong-bao-website-bo-cong-thuong-theo-nghi-dinh-248-2026/) *(secondary)*), sau đó gắn biểu
tượng xác nhận dẫn tới online.gov.vn ([Lawgical](https://lawgical.vn/vi-du/website-ban-hang-co-phai-thong-bao-voi-bo-cong-thuong-khong)
*(secondary)*). Dịch vụ dùng trực tiếp trên nền tảng, như một gói Pro trong app, nằm trong phạm vi (Nghị định 248 Điều 15
khoản 1). Trang bán phải hiển thị ở chỗ dễ thấy hoặc qua link rõ ràng: danh tính chủ sở hữu, quyền và nghĩa vụ các bên, giá ghi
rõ đã gồm thuế và phí chưa, cách thanh toán và hoàn tiền, chính sách đổi trả có điều kiện, thời hạn và chi phí của mỗi bên
(Điều 4, 6, 8, 10, 14, 17). Các hướng dẫn cũ liệt kê "9 tài liệu" hay ghi Bộ Công Thương xác nhận là đã lỗi thời. Hai điểm còn
mở: mức phạt khi vận hành chưa được xác nhận theo chế độ mới là **UNVERIFIED**, và chưa xác nhận được app chỉ bán qua
In-App Purchase có cần thông báo riêng với website không (cách đọc an toàn là có).

Thứ ba là luật bảo vệ người tiêu dùng, nơi đặt ra hầu hết quy tắc cho gói **subscription** (gói trả tiền định kỳ, tự gia hạn,
ví dụ 79.000 đ mỗi tháng). Luật 19/2023/QH15 và Nghị định 55/2024 (hiệu lực 01/7/2024) coi gói Pro vừa là giao dịch từ xa vừa là
dịch vụ liên tục: phải cung cấp thông tin trước khi ký (Điều 37), cho xem lại và tải hợp đồng (Điều 38 khoản 1), cho hủy trong
**30 ngày** nếu thông tin thiếu hoặc sai và hoàn tiền trong 30 ngày (Điều 38 khoản 3–4), **báo trước ít nhất 7 ngày làm việc**
trước mỗi lần thu phí và trước khi hết hạn hợp đồng (Điều 42 khoản 2), và cho hủy bất cứ lúc nào, chỉ trả phần đã dùng (Điều 42
khoản 3) ([Luật 19/2023, bản sao](https://hethongphapluat.com/luat-bao-ve-quyen-loi-nguoi-tieu-dung-2023.html)). Nói cụ thể: một
người mua gói năm gia hạn ngày 1/12 phải nhận email nhắc trước đó ít nhất 7 ngày làm việc. Điều 25 cấm 15 loại điều khoản bất
công, trong đó có việc bắt đồng ý thu thập dữ liệu làm điều kiện ký hợp đồng. Không cần đăng ký mẫu hợp đồng với cơ quan nhà
nước, vì danh mục của Quyết định 07/2024/QĐ-TTg không có giáo dục online
([caselaw.vn](https://caselaw.vn/van-ban-phap-luat/509624-quyet-dinh-so-07-2024-qd-ttg-ngay-20-06-2024-cua-thu-tuong-chinh-phu-ve-danh-muc-san-pham-hang-hoa-dich-vu-phai-dang-ky-hop-dong-theo-mau-dieu-kien-giao-dich-chung);
danh mục đối chiếu qua [Luật Minh Khuê](https://luatminhkhue.vn/danh-muc-san-pham-hang-hoa-dich-vu-phai-dang-ky-hop-dong-theo-mau-tu-01-7-2024.aspx)
*(secondary)*), nhưng Terms vẫn phải theo quy tắc trình bày của Nghị định 55 Điều 6 (tiếng Việt, chữ và nền tương phản)
([MOIT](https://moit.gov.vn/tin-tuc/bao-chi-voi-nguoi-dan/nhung-diem-moi-cua-nghi-dinh-so-55-2024-nd-cp-quy-dinh-chi-tiet-mot-so-dieu-cua-luat-bao-ve-quyen-loi-nguoi-tieu-dung-20.html)).

Thứ tư, và là phần rủi ro nhất, là dữ liệu cá nhân. Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 và Nghị định 356/2025 có hiệu lực từ
**01/01/2026**; Nghị định 356 thay Nghị định 13/2023 ([EY](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/ey-vietnam-legal-alert-march-2026-decree-no356-2025-nd-cp-providing-detailed-guidance-for-implementation-of-personal-data-protection-law-viet.pdf)
*(secondary)*). Sự đồng ý phải riêng cho từng mục đích, kiểm chứng được, và **"sự im lặng hoặc không phản hồi không được coi là
sự đồng ý"** (Điều 9) ([Luật 91/2025, bản sao](https://hethongphapluat.com/luat-bao-ve-du-lieu-ca-nhan-2025.html)); Nghị định 356
thêm rằng phải lưu vết đồng ý theo thời điểm và nội dung, và không được để sẵn ô "đồng ý". Ví dụ: ô "Tôi đồng ý nhận email nhắc
học" phải để trống mặc định, và server lưu lại lúc người dùng tick cùng phiên bản chính sách họ đã xem. Bên xử lý dữ liệu phải
báo sự cố cho cơ quan chuyên trách trong **72 giờ** (Điều 23), nộp **hồ sơ đánh giá tác động xử lý dữ liệu (DPIA)** cho Cục A05
Bộ Công an trong 60 ngày từ lần xử lý đầu (Điều 21–22), và nộp hồ sơ **chuyển dữ liệu ra nước ngoài** trong 60 ngày từ lần chuyển
đầu; điều luật nói rõ việc "sử dụng nền tảng ở ngoài lãnh thổ" để xử lý dữ liệu thu ở Việt Nam cũng tính là chuyển ra nước ngoài
(Điều 20 khoản 1 điểm c), nghĩa là dùng Cloudflare hay gọi một API AI đặt ở Mỹ đều thuộc diện này. Hộ kinh doanh và doanh
nghiệp siêu nhỏ được miễn DPIA và cán bộ bảo vệ dữ liệu, doanh nghiệp nhỏ được miễn 5 năm, nhưng **mất miễn trừ khi xử lý dữ
liệu nhạy cảm** hoặc khi đã xử lý dữ liệu của **≥ 100.000 người** (Điều 38; EY). Hai điểm mâu thuẫn chưa giải: Luật 91 Điều 38
không miễn Điều 20 (hồ sơ chuyển ra nước ngoài), trong khi EY nói Nghị định 356 miễn cả hồ sơ này; và Nghị định 356 được cho là đã
chuyển "dữ liệu theo dõi hành vi, hoạt động sử dụng ... các dịch vụ khác trên không gian mạng" sang nhóm nhạy cảm (EY;
[Luật Việt An](https://luatvietan.vn/diem-moi-cua-nghi-dinh-356-2025-so-voi-nghi-dinh-13-2023-ve-huong-dan-bao-ve-du-lieu-ca-nhan.html)
*(secondary)*), nên **lịch sử ôn tập, chuỗi ngày học và danh sách từ hay sai có thể là dữ liệu nhạy cảm (UNVERIFIED)**. Mức phạt
không nhỏ: Nghị định 330/2026 (hiệu lực 19/8/2026) phạt 30–50 triệu đ khi không có thông báo xử lý hoặc không lưu vết đồng ý,
50–70 triệu đ khi xử lý mà không có đồng ý ([Luật Việt An về Nghị định 330/2026](https://luatvietan.vn/nghi-dinh-330-2026-nd-cp.html)
*(secondary; một bài khác ghi "Nghị định 363/2026", mâu thuẫn)*), và trần phạt của luật là 3 tỷ đ cho tổ chức, 5% doanh thu năm
trước nếu vi phạm chuyển dữ liệu ra nước ngoài, cá nhân bằng một nửa (Luật 91 Điều 8). Đối chiếu với dự án: chính sách hiện tại
chỉ mô tả waitlist ([PrivacyPolicy.tsx](../../apps/web/src/components/sections/PrivacyPolicy.tsx)), còn form đăng ký không lưu
đồng ý nào ([auth.schemas.ts](../../apps/api/src/identity/auth/auth.schemas.ts)); mở tài khoản cho công chúng lúc này là thu dữ
liệu học tập mà không có cơ sở đồng ý.

Thứ năm là an ninh mạng và người nhỏ tuổi. Luật An ninh mạng 116/2025/QH15 (hiệu lực 01/7/2026) giữ nghĩa vụ cho cả doanh nghiệp
trong nước lẫn nước ngoài thu dữ liệu người dùng phải **lưu dữ liệu đó tại Việt Nam** (Điều 25 khoản 3), và quy định trẻ em dùng
dịch vụ trực tuyến thì **cha mẹ đăng ký tài khoản bằng thông tin của cha mẹ** (Điều 16 khoản 2)
([Luật 116/2025, bản sao](https://hethongphapluat.com/luat-an-ninh-mang-2025.html); [Điều 16](https://hethongphapluat.com/luat-an-ninh-mang-2025/dieu-16)).
"Trẻ em" là người dưới 16 tuổi ([LuatVietnam](https://luatvietnam.vn/tin-phap-luat/tre-em-la-nguoi-duoi-bao-nhieu-tuoi-230-35818-article.html)
*(secondary)*). Nghị định 333/2026 liệt kê dữ liệu phải lưu (tên tài khoản, thời gian dùng, email, IP đăng nhập cuối, số điện
thoại), giữ ≥ 24 tháng kể từ khi có yêu cầu lưu ([VACIF](https://vacif.com/nghi-dinh-333-2026-nd-cp-nhung-quy-dinh-moi-ve-an-ninh-mang-doanh-nghiep-can-luu-y/)
*(secondary)*), giữ log ≥ 12 tháng, và xác thực tài khoản khi đăng ký bằng số điện thoại Việt Nam hoặc số định danh
([Safegate](https://safegate.vn/vi/post/nghi-dinh-3332026nd-cp-quy-dinh-chi-tiet-luat-an-ninh-mang-160.htm) *(secondary)*). Ba
điểm **UNVERIFIED** quyết định chi phí hạ tầng: nghĩa vụ lưu tại Việt Nam áp dụng tự động hay chỉ khi Bộ Công an yêu cầu; quy tắc
xác thực bằng số điện thoại có phủ tới app không phải mạng xã hội không; và Nghị định 53/2022 còn hiệu lực không sau khi luật gốc
bị thay. Nếu áp dụng tự động, việc để dữ liệu trên Cloudflare D1 hay Postgres ở nước ngoài sẽ không đạt.

Về thuế, năm 2026 dễ thở hơn cho người bán nhỏ. **Thuế khoán và lệ phí môn bài bị bỏ từ 01/01/2026** (Nghị quyết 198/2025
Điều 10) ([Tuổi Trẻ](https://tuoitre.vn/plo/bo-thue-khoan-tu-nam-2026-ho-kinh-doanh-can-lam-gi-post885846.html) *(secondary)*), và
Nghị định 141/2026 nâng ngưỡng: hộ kinh doanh có doanh thu **≤ 1 tỷ đ/năm** không nộp VAT (thuế giá trị gia tăng) và thuế thu
nhập cá nhân (TNCN), chỉ nộp tờ khai doanh thu mẫu 01/TKN-CNKD trước 31/1 năm sau; trên 1 tỷ thì bắt buộc hóa đơn điện tử
([einvoice.vn](https://einvoice.vn/tin-tuc/hkd-doanh-thu-1ty-nam) *(secondary)*). Store thì khấu trừ thuế tại nguồn (trừ trước khi
trả tiền cho người bán): Nghị định 117/2025 bắt nền tảng có chức năng thanh toán, kể cả nước ngoài, khấu trừ 5% VAT và 2% TNCN
cho dịch vụ của hộ và cá nhân ([EY Tax News](https://taxnews.ey.com/news/2025-1337-vietnam-promulgates-decree-on-tax-administration-for-business-activities-on-e-commerce-and-digital-platforms-of-households-and-individuals)
*(secondary)*). Ngưỡng 1 tỷ có chặn được khoản khấu trừ của store không, và tiền đã bị khấu trừ có lấy lại được không, đều
**UNVERIFIED**. Nếu đi đường công ty: thuế thu nhập doanh nghiệp 15% khi doanh thu ≤ 3 tỷ đ, và Luật VAT 48/2024 Điều 5 khoản 21
để phần mềm và dịch vụ phần mềm ngoài diện VAT ([MISA SME](https://sme.misa.vn/345925/ban-phan-mem-co-chiu-thue-gtgt-khong/)
*(secondary)*); gói học online có được tính là "dịch vụ phần mềm" không thì cần hỏi cơ quan thuế.

Còn lại là giấy phép ngành và AI. Theo Nghị định 147/2024 Điều 24 khoản 2, trang chỉ đăng nội dung của chính chủ sở hữu không cần
giấy phép; chỉ khi thành **mạng xã hội** (người dùng đăng và chia sẻ công khai) hoặc trang tổng hợp mới cần
([Điều 24](https://hethongphapluat.com/nghi-dinh-147-2024-nd-cp-quan-ly-cung-cap-su-dung-dich-vu-internet-va-thong-tin-tren-mang/dieu-24)),
nên tránh các tính năng như chia sẻ nhóm từ công khai, bình luận, bảng xếp hạng có tên tự đặt. Giấy phép của Sở GD&ĐT áp cho
**trung tâm** ngoại ngữ tổ chức dạy, không thấy quy định nào cho app tự học ([Giáo dục Việt Nam](https://giaoduc.net.vn/tu-vu-mac-edu-day-tieng-anh-chui-can-tang-cuong-giam-sat-day-ngoai-ngu-online-post253371.gd)
*(secondary)*). Luật Trí tuệ nhân tạo 134/2025 (hiệu lực 01/3/2026) và Nghị định 142/2026 (hiệu lực 01/5/2026) xếp AI theo mức rủi
ro; hệ thống "rủi ro trung bình", tức người dùng có thể không biết mình đang dùng nội dung AI, phải thông báo Bộ KH&CN trước khi
dùng, còn chỉnh sửa văn bản như sửa lỗi, tóm tắt, dịch được miễn dán nhãn ([Luật Việt An về Nghị định 142/2026](https://luatvietan.vn/nghi-dinh-142-2026-nd-cp-huong-dan-luat-tri-tue-nhan-tao.html)
*(secondary)*). Ghi chú pháp lý cho rằng một dòng "câu hỏi do AI tạo" hiện rõ có lẽ giữ hệ thống ở mức rủi ro thấp, nhưng điều đó
**UNVERIFIED**. Email quảng cáo cần đồng ý riêng và nút hủy theo Nghị định 91/2020, Luật 91 Điều 9 và Luật 19 Điều 18; email
nhắc gia hạn, biên lai và email bảo mật là tin dịch vụ, không cần đồng ý quảng cáo.

## Trên iOS và Android, Pro phải bán qua In-App Purchase và app không được nhắc tới giá web

Ở cả hai store, **In-App Purchase** (mua ngay trong app qua hệ thống thanh toán của Apple hoặc Google; họ trừ tiền người dùng và
giữ hoa hồng) là bắt buộc để mở khóa tính năng. Apple 3.1.1 nêu đích danh subscription và nội dung premium là phải bán qua IAP, và
3.1.1(a) cấm nút, link hay lời mời dẫn sang chỗ trả tiền khác ở **mọi storefront trừ Mỹ** ([App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/));
quy tắc này gọi là anti-steering. Google Play cũng bắt Play Billing và cấm dẫn sang phương thức khác; các chương trình cho phép
thanh toán thay thế chỉ có ở Úc, Brazil, Indonesia, Nhật, Nam Phi, Anh, EEA, Hàn Quốc, Ấn Độ và Mỹ, **không có Việt Nam**
([Play Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738);
[User choice billing](https://support.google.com/googleplay/android-developer/answer/13821247)). Một cửa hẹp có ích: Apple 3.1.3(b)
cho người đã mua trên web dùng Pro trong app iOS, **với điều kiện Pro cũng bán được bằng IAP trong app**, và cho phép quảng bá
giá web bên ngoài app, ví dụ qua email. App từ vựng không phải "reader app" (loại đó chỉ gồm báo, tạp chí, sách, audio, nhạc,
video), nên không được đặt link ra web. Google có cho mở Pro mua trên web bên trong app Android hay không là **UNVERIFIED**.

Trang mời mua cũng có chuẩn. Apple đòi hiện tên gói, thời hạn, những gì người dùng nhận được, **giá gia hạn đầy đủ là con số nổi
bật nhất**, thời lượng dùng thử và giá sau dùng thử, link Terms và Privacy; giá "quy ra mỗi tháng" của gói năm chỉ được để phụ
([Apple: Auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/)). Gói phải kéo dài ít nhất 7 ngày và
dùng được trên mọi thiết bị của người dùng (3.1.2(a)). Google cấm gói năm mà hiện giá tháng nổi bật, cấm đặt tên gói định kỳ là
"Free Trial", và bắt có cách hủy online dễ dùng ([Subscriptions policy](https://support.google.com/googleplay/android-developer/answer/9900533)).

Chi phí và thuế mỗi store khác nhau. Apple thu US$99/năm, hoa hồng 15% trong Small Business Program cho người có ≤ US$1 triệu
doanh thu năm trước ([Small Business Program](https://developer.apple.com/app-store/small-business-program/)); nếu ngoài chương
trình thì 30% năm đầu của mỗi người đăng ký, 15% từ năm thứ hai. Với cá nhân ở Việt Nam, Apple khấu trừ **2% thuế TNCN** và áp
**5% thuế nhà thầu nước ngoài** lên chính phần hoa hồng của Apple ([Apple Developer News, 21/8/2025](https://developer.apple.com/news/?id=qs5bol0));
ghi chú thị trường không tìm thấy bản thông báo gốc này nên ghi UNVERIFIED, còn Apple có thu thêm VAT với cá nhân Việt Nam
không là **UNVERIFIED**. Apple trả tiền trong 45 ngày sau tháng tài chính ([App Store Connect Help](https://developer.apple.com/help/app-store-connect/getting-paid/overview-of-receiving-payments));
nhận bằng VND hay phải USD là **UNVERIFIED**. Google thu US$25 một lần ([Get started](https://support.google.com/googleplay/android-developer/answer/6112435)),
**15% cho mọi subscription tự gia hạn bất kể doanh thu**, và cơ cấu phí mới 2026 chỉ áp cho Mỹ, EEA, Anh, Úc, Nhật
([Service fees](https://support.google.com/googleplay/android-developer/answer/112622)). Với hộ kinh doanh hoặc cá nhân ở Việt Nam,
Google thu và nộp thay 5% trên doanh thu bán cho người Việt và đòi số định danh cá nhân 12 số ([Tax rates and VAT](https://support.google.com/googleplay/android-developer/answer/138000);
[Help 9384608](https://support.google.com/googleplay/android-developer/answer/9384608?hl=en)); một bản trích từ tìm kiếm ghi 2%,
mâu thuẫn với trang 5% đang hiển thị, còn Google có khấu trừ thêm TNCN không là **UNVERIFIED**. Google trả tiền về Việt Nam bằng
USD hoặc EUR ([Supported locations](https://support.google.com/googleplay/android-developer/answer/9306917)).

Có ba rào cản thủ tục cho mobile. Một: tài khoản Google Play **cá nhân** tạo sau 13/11/2023 phải chạy **bản thử kín (closed test)
với ít nhất 12 người, liên tục 14 ngày** trước khi được phát hành, rồi chờ duyệt thường dưới 7 ngày, tức thêm khoảng 3 tuần
([App testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465)). Hai: nếu thêm đăng nhập
Google, Apple 4.8 đòi một cách đăng nhập tương đương bảo vệ quyền riêng tư, trên thực tế là Sign in with Apple; hiện dự án chỉ có
email + mật khẩu ([buoc-1.md](../deliveries/buoc-1.md)) nên đang được miễn. Ba: cả hai store đòi **xóa tài khoản ngay trong app**
và xóa luôn dữ liệu, chỉ vô hiệu hóa là không đủ; Google đòi thêm một trang web để yêu cầu xóa mà không cần cài app
([Apple: account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/);
[Google: account deletion](https://support.google.com/googleplay/android-developer/answer/13327111)). Kèm theo là các mức sàn
kỹ thuật: app mới và bản cập nhật trên Play phải nhắm Android 16 (API 36) từ 31/8/2026
([Target API](https://developer.android.com/google/play/requirements/target-sdk)); app tải lên Apple phải build bằng Xcode 26 từ
28/4/2026 ([Apple upcoming requirements](https://www.developer.apple.com/news/upcoming-requirements/), qua tóm tắt tìm kiếm);
Flutter nằm trong danh sách SDK cần privacy manifest, tức tệp khai báo app đọc dữ liệu gì
([Third-party SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/)); nhãn quyền riêng tư của Apple
và form Data safety của Google là bắt buộc; từ 18/6/2026 app trên App Store Việt Nam có xếp hạng tuổi riêng 00+/12+/16+/18+ theo
Nghị định 147 Điều 38 ([Apple Developer News, 21/5/2026](https://developer.apple.com/news/?id=qs5bol0)); và nếu dữ liệu người học
đi tới một AI bên thứ ba, Apple 5.1.2(i) đòi công bố và **xin phép rõ ràng trước**. Khi chạy thật, Google cảnh báo trên trang app
nếu tỷ lệ crash vượt 1,09% hoặc tỷ lệ ANR (app "đơ" không phản hồi) vượt 0,47% ([Android vitals](https://developer.android.com/topic/performance/vitals)).

Khi bán cùng lúc trên web, iOS và Android, server phải là nơi duy nhất quyết định ai đang có Pro. Ghi chú thanh toán đề xuất mô
hình dưới đây, trong đó "webhook" là lời báo tự động từ cổng thanh toán gửi về server rằng đơn đã trả:

```
iOS In-App Purchase ── thông báo App Store Server + Server API ─────────┐
Android Play Billing ── thông báo RTDN → subscriptionsv2.get, xác nhận ≤ 3 ngày ─┼─→ entitlement(user_id, nguồn, trạng thái, hết_hạn) → kiểm quota
Web (payOS / MoMo / VNPAY / Paddle) ── webhook / IPN ─────────────────┘
```

Pro được cấp nếu **bất kỳ** nguồn nào còn hiệu lực hoặc đang trong thời gian ân hạn. Google hoàn tiền tự động nếu đơn subscription
mới không được xác nhận trong **3 ngày** ([Subscription lifecycle](https://developer.android.com/google/play/billing/lifecycle/subscriptions));
Apple thử thu lại 60 ngày khi gia hạn lỗi, Google giữ tài khoản ở trạng thái "hold" 60 ngày trừ thời gian ân hạn. RevenueCat
(dịch vụ trung gian gom trạng thái mua hàng từ Apple và Google về một chỗ) miễn phí tới US$2.500 doanh thu theo dõi mỗi tháng, sau
đó lấy 1% ([RevenueCat pricing](https://www.revenuecat.com/pricing/)); nó có nhận thanh toán từ payOS, MoMo hay VNPAY không là
**UNVERIFIED**, và phần Web Billing của nó chạy trên Stripe nên có lẽ không dùng được cho người bán ở Việt Nam (suy luận).

## Trên web, cá nhân chỉ thu tiền dễ bằng gói trả trước qua VietQR

**Stripe không hỗ trợ Việt Nam** ([Stripe global](https://stripe.com/global)), nên đường quen thuộc của dev nước ngoài bị đóng.
Còn bốn hướng. Đường nhanh nhất cho một cá nhân là **payOS**: đăng ký "với 1 chiếc CCCD", nhận tiền qua chuyển khoản quét mã
VietQR vào chính tài khoản ngân hàng của mình, gói BIDV-1K miễn phí 1.000 giao dịch/năm đến 31/12/2026, nhưng trang của họ không
nhắc tới thu định kỳ ([payOS](https://payos.vn/)); trên thực tế nghĩa là bán **gói trả trước** ("Pro 1/3/12 tháng") và người dùng
tự trả lại khi hết hạn. Điều khoản payOS có cho cá nhân bán gói số không, và phí sau 31/12/2026, đều chưa rõ. Theo suy luận từ
Luật 19 Điều 42 khoản 2, gói trả trước vẫn cần email báo trước ngày hết hạn. Đường thứ hai là thu định kỳ bằng VND qua **token**
(thẻ hoặc ví đã lưu dưới dạng mã để server trừ tiền mà người dùng không phải nhập lại): VNPAY có API token nhưng tài liệu không
nói có trừ được mà không cần OTP không ([VNPAY token](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-token/token.html)), MoMo
có loại "Subscription" nhưng phải có tài khoản doanh nghiệp và qua form thẩm định ([MoMo tokenization](https://developers.momo.vn/v3/docs/payment/guides/aio-tokenization-payment/)),
ZaloPay có Agreement Pay ([ZaloPay](https://docs.zalopay.vn/docs/specs/agreement-pay), qua tóm tắt tìm kiếm). Cả ba đều cần ký
hợp đồng merchant; giấy tờ cụ thể và mức phí công khai đều **UNVERIFIED** (thường thương lượng). Mức phí duy nhất tìm được là QR
qua đối tác VNPAY ở Nam A Bank: 0,5% giá trị (biểu phí 15/6/2026, qua tóm tắt tìm kiếm). Đường thứ ba là **merchant of record
(MoR)**, tức một công ty đứng tên người bán thay mình, tự thu thuế, xử lý hoàn tiền và tranh chấp thẻ rồi trả phần còn lại:
Paddle không liệt Việt Nam vào danh sách bị loại và lấy 5% + 50¢ mỗi giao dịch ([Paddle countries](https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle);
[Paddle pricing](https://www.paddle.com/pricing)), Lemon Squeezy trả tiền về ngân hàng Việt Nam với cùng mức phí
([Lemon Squeezy countries](https://docs.lemonsqueezy.com/help/getting-started/supported-countries)). Rủi ro: Paddle có nhận cá
nhân không là **UNVERIFIED**; Lemon Squeezy đang chuyển sang "Stripe Managed Payments" ([Lemon Squeezy pricing](https://www.lemonsqueezy.com/pricing))
mà Stripe không hỗ trợ Việt Nam (**UNVERIFIED**); và người Việt chủ yếu trả bằng ví hay QR nên trang thanh toán thẻ quốc tế có thể
chuyển đổi kém (**UNVERIFIED**). Đường thứ tư là chỉ bán trong app qua store. Dữ liệu chung cho thấy web khó: ở khối Ấn Độ + Đông
Nam Á chỉ **0,8% doanh thu** app subscription đến từ mua trên web ([RevenueCat](https://www.revenuecat.com/state-of-subscription-apps)).

Nếu tự trừ thẻ định kỳ, mạng thẻ có luật riêng. Theo bản FAQ của Mastercard nằm trong repo (Mastercard Rules 5.4.1, hiệu lực
22/9/2022), điều khoản gói (giá, chu kỳ, thời lượng dùng thử, giá sau dùng thử) phải hiện **ngay cùng lúc với ô nhập thẻ**, để
trong link hay phải cuộn xuống là không đạt; phải có email xác nhận kèm cách hủy, cách hủy online, và với gói thu từ 6 tháng trở
lên một lần (ví dụ gói năm) phải nhắc 7–30 ngày trước kỳ thu, email này tách khỏi email quảng cáo
(`docs/subscription-recurring-payments-and-negative-option-billing-merchants–faqs.pdf`, không có URL; trang luật công khai
[Mastercard Rules](https://www.mastercard.us/en-us/business/overview/support/rules.html) chưa được mở). Visa đòi người dùng
đồng ý rõ ràng, gửi xác nhận cả khi chưa thu đồng nào, nhắc **ít nhất 7 ngày** trước khi hết dùng thử hay đổi giá, và cho hủy
online ([Visa flier](https://usa.visa.com/content/dam/VCOM/global/support-legal/documents/visa-new-subscription-rules-flier.pdf)).
Thông báo đẩy (push) trong app không tính là biên lai; email hoặc SMS thì tính. Ví MoMo, ZaloPay và chuyển khoản VietQR không phải
giao dịch thẻ nên không bị các luật này ràng buộc trực tiếp. Về bảo mật thẻ, nếu số thẻ chỉ đi qua cổng thanh toán thì áp
PCI DSS v4.0.1 SAQ A (bản tự khai cho người bán không chạm số thẻ): không bắt pen test nhưng vẫn bắt quét lỗ hổng từ bên ngoài
mỗi quý ([Adyen](https://docs.adyen.com/development-resources/pci-dss-compliance-guide/vulnerability-scanning-regulation));
**chuyển người dùng sang trang của cổng (redirect)** thì tránh được tiêu chí chống tấn công script, còn nhúng ô nhập thẻ của cổng
vào trang mình (iframe) thì không ([PCI SSC FAQ 1588](https://pcisecuritystandards.org/faq/articles/Frequently_Asked_Question/how-does-an-e-commerce-merchant-meet-the-saq-a-eligibility-criteria-for-scripts)).
Cổng Việt Nam có thực sự đòi người bán nhỏ nộp SAQ không là **UNVERIFIED**.

## Không luật nào bắt pen test, nhưng ba lỗi nặng, chưa deploy và catalog trống đủ để chặn ra mắt

Về bảo mật, chuẩn được công nhận là **OWASP ASVS 5.0.0** (bộ tiêu chuẩn kiểm tra bảo mật web, ra 30/5/2025): cấp L1 gồm 70 trên
345 yêu cầu và là mức tối thiểu, mà chính OWASP nói một startup giai đoạn đầu ít dữ liệu nhạy cảm có thể nhắm trước; cấp L2 là mức
OWASP nói hầu hết ứng dụng nên hướng tới ([ASVS 5.0 "What is the ASVS"](https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/5.0/en/0x03-What-is-the-ASVS.md);
[ASVS 5.0.0 CSV](https://github.com/OWASP/ASVS/releases/download/v5.0.0_release/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv)).
Không luật hay store nào bắt pen test cho sản phẩm này (suy luận từ việc không tìm thấy). Dự án đã có nhiều thứ thuộc L2: băm mật
khẩu bằng `argon2` 0.45.1 ([password-hasher.service.ts](../../apps/api/src/identity/auth/password-hasher.service.ts)), không ghi
mật khẩu/OTP/token vào log ([app-logger.ts](../../apps/api/src/common/logging/app-logger.ts)), giới hạn tần suất theo người dùng
và IP (các con số là `ASSUMPTION`, [app-config.ts](../../apps/api/src/common/config/app-config.ts)); review 18/10 không tìm thấy lỗ
nào để người học này xem dữ liệu của người khác, mọi route `/v1/admin/**` đều có kiểm quyền, và không có chỗ chèn mã độc vào trang
([review 18/10](../superpowers/reviews/2026-10-18-buoc-0-4-code-review.md)). Một điểm lệch đáng sửa: quy tắc K9 bắt mật khẩu có chữ
hoa, chữ thường, số và ký tự đặc biệt ([DECISIONS](../specs/DECISIONS_2026-10-04.md)), trong khi ASVS L1 mục V6.2.5 yêu cầu
**không** áp quy tắc thành phần như vậy (suy luận từ việc đặt hai ghi chú cạnh nhau). OWASP API4:2023 còn coi việc không đặt trần
chi tiêu cho dịch vụ trả tiền theo lượt (email OTP, gọi AI) là một lỗ hổng ([API4:2023](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/)).

Phần chặn thật nằm ở ba lỗi nặng còn nguyên trong code. C1: cơ chế idempotency (bảo đảm bấm "lưu" hai lần chỉ ghi một lần) chạy
ngoài transaction đang giữ khóa, nên với pool 10 kết nối mặc định, **10 lượt ghi đồng thời đều trả lỗi 500 sau ~5 giây**, và một
khóa hết hạn có thể làm ghi trùng ([idempotency.service.ts](../../apps/api/src/common/idempotency/idempotency.service.ts),
[prisma.module.ts](../../apps/api/src/common/db/prisma.module.ts)). C2: mỗi cách viết `timezone` khác nhau được lưu vào bộ nhớ mãi
mãi (~29 KB mỗi cái), nên một người dùng có thể làm API phình bộ nhớ không giới hạn ([local-date.ts](../../apps/api/src/common/time/local-date.ts)).
C3: lỗi 500 **không được ghi log** ([problem-details.filter.ts](../../apps/api/src/common/problem-details/problem-details.filter.ts)).
Gộp C1 với C3, chỉ cần khoảng 10 người bấm cùng lúc là có lỗi mà không để lại dấu vết. Thêm vào đó, sau D38 không còn test tự động
nào chạm Postgres/Redis thật cho API, nên lỗi tranh chấp đồng thời và lỗi phân quyền có thể lọt qua CI xanh
([buoc-4.md](../deliveries/buoc-4.md)); T12 cho thấy cấu hình mặc định `TRUST_PROXY=false` sẽ dồn mọi người đứng sau proxy vào
một IP, tức **cả hệ thống chỉ đăng ký được 5 tài khoản mỗi giờ**; và T6 cho thấy câu trắc nghiệm có thể có hai đáp án đúng, một lỗi
người trả tiền sẽ thấy ngay.

Về vận hành, chuẩn tham chiếu là sách SRE của Google: đừng nhắm 100%, đặt SLO (mục tiêu độ ổn định tự đặt, ví dụ 99,5% request
không lỗi trong 4 tuần) từ hiệu năng thực tế, và nhớ rằng **backup chỉ có giá trị khi đã khôi phục thử thành công**
([SRE Workbook](https://sre.google/workbook/implementing-slos/); [SRE Book: Data Integrity](https://sre.google/sre-book/data-integrity/)).
Ghi chú chất lượng coi mức tối thiểu cho một người làm là: một SLO đo từ bên ngoài (99,5% ≈ 3,6 giờ ngừng mỗi 30 ngày), kiểm tra
sống trên `/health`, công cụ gom lỗi như Sentry (gói miễn phí đủ dùng, [Sentry pricing](https://sentry.io/pricing/)), backup
Postgres hằng ngày kèm diễn tập khôi phục mỗi quý, một môi trường staging, và migration kiểu "mở rộng rồi thu hẹp" của Prisma. Dự
án hiện **không có gì** trong số đó ngoài controller `health`: không Dockerfile, không cấu hình hosting, không chính sách backup,
không công cụ giám sát; admin có `wrangler.jsonc` nhưng chưa có workflow nào deploy nó ([kiểm kê §6](evidence/commercialization-2026-10-19/5_project_inventory.md)).
Email cũng là điểm yếu: Gmail đòi mọi người gửi có SPF hoặc DKIM (bản ghi DNS chứng minh email đúng là từ tên miền của mình), tỷ
lệ spam < 0,3%, và từ 11/2025 bắt đầu từ chối thư không đạt ([Gmail sender guidelines](https://support.google.com/a/answer/81126);
[FAQ](https://support.google.com/a/answer/14229414)); dự án định dùng SMTP Gmail cá nhân mà giới hạn chưa có nguồn, trong khi cả
OTP lẫn email nhắc gia hạn bắt buộc theo Luật 19 đều phụ thuộc vào nó. Hiệu năng và khả năng tiếp cận ít áp lực hơn: Core Web
Vitals "good" là LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 ở phân vị 75 ([web.dev](https://web.dev/articles/vitals)); WCAG 2.2 AA là
chuẩn thực tế nhưng **không bắt buộc với app tư nhân ở Việt Nam**, vì Thông tư 26/2020 chỉ bắt cơ quan nhà nước, báo chí và đơn
vị dịch vụ công ([caselaw.vn](https://caselaw.vn/van-ban-phap-luat/374305-thong-tu-so-26-2020-tt-btttt-ngay-23-09-2020-cua-bo-truong-bo-thong-tin-va-truyen-thong-quy-dinh-ve-viec-ap-dung-tieu-chuan-cong-nghe-ho-tro-nguoi-khuyet-tat-tiep-can-su-dung-san-pham-dich-vu-thong-tin-va-truyen-thong)),
và Đạo luật Tiếp cận châu Âu miễn cho doanh nghiệp dịch vụ dưới 10 người và ≤ €2 triệu doanh thu ([EUR-Lex](https://eur-lex.europa.eu/eli/dir/2019/882/oj)).

Nội dung là tài sản lớn nhất còn thiếu, và là sức lao động chứ không phải code. Nguồn cấp độ hiện tại cho phép dùng thương mại:
CEFR-J dùng được cho cả nghiên cứu lẫn thương mại, miễn là ghi nguồn đúng cách ([CEFR-J](https://www.cefr-j.org/download.html)),
Octanove C1/C2 theo CC BY-SA 4.0, tức dùng thương mại được nếu ghi công và nếu phần chỉnh sửa cũng phát hành cùng giấy phép
([olp-en-cefrj](https://github.com/openlanguageprofiles/olp-en-cefrj)). Ba lỗ hổng: trang chính thức chỉ còn bản 1.6 trong khi
repo nhập bản 1.5 từ mirror; một đoạn tiếng Nhật được tóm tắt là nếu dùng cho công việc kiểu giám sát hay tương tự thì phải hỏi
trước và có thể bị tính phí (đọc qua công cụ tóm tắt, nên đọc lại bằng người biết tiếng Nhật); và ranh giới share-alike khi thêm nghĩa
tiếng Việt lên các dòng Octanove chưa được xác minh. Oxford 3000/5000 và English Vocabulary Profile của Cambridge không có điều
khoản cho dùng lại, nên coi như giữ mọi quyền (UNVERIFIED). Văn bản do AI tạo hoàn toàn không được bảo hộ bản quyền ở Mỹ
([Copyright Office](https://copyright.gov/newsnet/2025/1060.html)) và, từ 01/4/2026, ở Việt Nam nếu không có đóng góp sáng tạo
đáng kể của con người ([Vietnam Briefing](https://www.vietnam-briefing.com/news/vietnam-amends-intellectual-property-law-key-changes-for-businesses.html)
*(secondary)*); nghĩa là chính bước người duyệt và sửa nghĩa mới tạo ra giá trị mà đối thủ không chép được.

Với AI, điều khoản của nhà cung cấp đã thu hẹp lựa chọn. Gemini API cấm dùng trong app hướng tới, hoặc nhiều khả năng có, người
dưới 18 sử dụng, và gói miễn phí cho Google dùng dữ liệu để cải tiến sản phẩm ([Gemini API terms](https://ai.google.dev/gemini-api/terms));
Anthropic cho phép phục vụ người dưới 18 nhưng bắt công bố rằng người dùng đang tương tác với AI và khuyến nghị xác minh tuổi, lọc
nội dung ([Anthropic: serving minors](https://support.claude.com/en/articles/9307344-responsible-use-of-anthropic-s-models-guidelines-for-organizations-serving-minors));
quy tắc cho người dưới 18 trong API của OpenAI là **UNVERIFIED**. Thiết kế hiện có của dự án đã khớp phần lớn mức tối thiểu ghi
chú đề ra (kiểm câu AI bằng rule, nút báo lỗi, chỉ gửi nội dung học chứ không gửi email hay tên, trần chi tiêu toàn hệ thống), nhưng
trần chi tiêu ER14 và con số hạn mức vẫn là `ASSUMPTION` và provider chưa được chọn ([module-spec-ai-integration.md](../specs/module-spec-ai-integration.md)).
Cuối cùng, về lời quảng cáo: ôn ngắt quãng (spaced repetition) và tự kiểm tra là hai kỹ thuật có bằng chứng mạnh nhất
([Cepeda 2006](https://pubmed.ncbi.nlm.nih.gov/16719566/); [Donoghue & Hattie 2021](https://www.frontiersin.org/articles/10.3389/feduc.2021.581216/full)),
nên nói "dùng phương pháp ôn ngắt quãng có nghiên cứu ủng hộ" là được; còn "nhớ gấp 2" thì cần dữ liệu của chính app.

## Cần khoảng 160, 535 và 1.280 người trả tiền để lãi 5, 20 và 50 triệu đồng mỗi tháng

Thị trường không phải giới hạn. Con số hẹp và sát nhất là thị trường học tiếng Anh số ở Việt Nam **US$43,1 triệu năm 2025**, tăng
~12%/năm ([IMARC](https://www.imarcgroup.com/report/en/vietnam-digital-english-language-learning-market), báo cáo trả phí, không
thấy phương pháp); Việt Nam có 85,6 triệu người dùng internet ([DataReportal](https://datareportal.com/reports/digital-2026-vietnam)),
và iOS chiếm 33%, Android 66% lượt cài app năm 2025 ([AppsFlyer](https://www.appsflyer.com/resources/reports/app-marketing-vietnam-report/)).
Thứ khó là **tỷ lệ người trả tiền**: không có khảo sát nào riêng cho Việt Nam; con số gần nhất là khối Ấn Độ + Đông Nam Á, nơi trung
vị chỉ **0,7% lượt tải trở thành người trả tiền sau 35 ngày** (nhóm tốt nhất 1,9%), so với 2,0% toàn cầu, và chỉ 15,2% người dùng
thử chuyển sang trả tiền ([RevenueCat](https://www.revenuecat.com/state-of-subscription-apps)); khoảng 7–10% người chơi game mobile
ở Việt Nam có chi tiền ([PocketGamer.biz](https://www.pocketgamer.biz/vietnams-mobile-games-market-reached-825m-in-revenue-in-2025)).
App giáo dục giữ người kém: khoảng 14–15% còn quay lại ngày 1, ~6% ngày 7, **~2–3% ngày 30** ([Phiture](https://phiture.com/mobilegrowthstack/managing-retention-rate-benchmarks-and-expectations/)
*(secondary)*).

Giá của đối thủ tạo khung cho giá Pro. Gói năm phổ biến nằm quanh **600 nghìn – 1,1 triệu đ**, với TFlat là mốc thấp bất thường
(199.000 đ/năm, và 199.000 đ "trọn đời"). Bảng dưới rút từ App Store Việt Nam ngày 19/10/2026; thời hạn của các mục không có nhãn là
suy luận của ghi chú thị trường.

| App | Trọng tâm | Giá (19/10/2026) | Nguồn |
|---|---|---|---|
| MochiVocab | Từ vựng + ôn ngắt quãng (VN, tài khoản cá nhân) | 6 tháng 699.000; 12 tháng 999.000 / 1.049.000; 3 năm 1.999.000 / 2.099.000 | [App Store VN](https://apps.apple.com/vn/app/id1484058499) |
| Lingoland | Từ vựng + ôn ngắt quãng + chatbot AI (VN) | Tháng 199.000; năm 599.000–799.000; trọn đời 1.399.000–1.999.000 | [App Store VN](https://apps.apple.com/vn/app/id1616303464) |
| TFlat | Từ điển + từ vựng (VN, tài khoản cá nhân) | Tháng 19.000; năm 199.000; "trọn đời" 199.000 | [App Store VN](https://apps.apple.com/vn/app/id591049834) |
| Duolingo | Tổng quát | Super 599.000 / 689.000 / 860.000 (thời hạn không ghi; có lẽ là gói năm) | [App Store VN](https://apps.apple.com/vn/app/duolingo-language-lessons/id570060128) |
| ELSA Speak | Phát âm | Tháng 145.000; năm 769.000 / 1.095.000 | [App Store VN](https://apps.apple.com/vn/app/elsa-speak-ti%E1%BA%BFng-anh-ai/id1083804886) |
| Memrise | Từ vựng / video | Tháng 280.000; năm 1.199.000; trọn đời 5.399.000 | [App Store VN](https://apps.apple.com/vn/app/id635966718) |

Tính từ các mục có nhãn rõ tháng và năm (ESTIMATE): gói năm của ELSA bằng ~44% giá 12 tháng, Lingoland ~25–33%, Memrise ~36%,
LingoDeer ~50%, chỉ TFlat ~87%. K26 của dự án (gói năm = 12 × giá tháng × 90%, [DECISIONS §11](../specs/DECISIONS_2026-10-04.md))
nằm ngoài khoảng đó. Với giá tháng 79.000 đ, gói năm theo K26 là **853.200 đ**, gần gấp 1,7 lần mức 499.000 đ mà mô hình dưới đây
dùng; nếu giữ 499.000 đ/năm thì K26 kéo giá tháng xuống ~46.200 đ. Mô hình vì vậy chưa khớp quyết định đã chốt, và đó là lý do Q6
nằm trong danh sách quyết định.

**Mô hình unit economics (từ [4_market_unit_economics.md](evidence/commercialization-2026-10-19/4_market_unit_economics.md) §5).**
Giả định, đều là ASSUMPTION/ESTIMATE: (1) người trả tiền chia 70% gói năm, 30% gói tháng; (2) giữ lại 80% giá sau phí store và
thuế; (3) chi phí AI 2.000 đ mỗi người trả tiền mỗi tháng, gấp đôi mức của người dùng nặng trên Claude Haiku 5.5 hay Gemini 2.5
Flash-Lite (~2–3 đ mỗi câu, với 400 token vào + 150 token ra mỗi câu); (4) chi phí cố định 1,5 triệu đ/tháng (máy chủ API + worker +
Postgres + Redis US$24–48, backup, tên miền, email US$5–10, Apple US$99/năm); (5) một người trả tiền ở lại trung bình **L = 10
tháng**; (6) 3% người dùng hoạt động mỗi tháng (MAU) là người trả tiền, khoảng 2–5%; (7) "lãi" là sau mọi chi phí trên, trước
công sức của chủ dự án và trước thuế ngoài 2% đã tính; (8) tỷ lệ lượt tải thành người trả tiền 0,7% (trung vị) hoặc 1,9% (nhóm
tốt), theo RevenueCat khối Ấn Độ + Đông Nam Á.

Doanh thu mỗi người trả tiền mỗi tháng (ESTIMATE, đơn vị VND):

| Kịch bản | Giá tháng | Giá năm | Doanh thu gộp mỗi người-tháng (70/30) | Thực nhận × 0,80 | Trừ AI 2.000 = đóng góp |
|---|---|---|---|---|---|
| Thấp (gần TFlat/Lingoland) | 49.000 | 299.000 | 32.100 | 25.700 | **23.700** |
| Giữa (dưới Duolingo Super) | 79.000 | 499.000 | 52.800 | 42.200 | **40.200** |
| Cao (ngang ELSA/MochiVocab) | 129.000 | 899.000 | 91.100 | 72.900 | **70.900** |

Ví dụ kịch bản Giữa: 0,7 × 499.000/12 + 0,3 × 79.000 = 29.110 + 23.700 = 52.810 đ.

Số người trả tiền cần có = (mục tiêu lãi + 1,5 triệu chi phí cố định) / đóng góp mỗi người (ESTIMATE):

| Lãi mục tiêu / tháng | Thấp | Giữa | Cao |
|---|---|---|---|
| 5 triệu đ (~US$190) | ~274 | **~162** | ~92 |
| 20 triệu đ (~US$760) | ~907 | **~535** | ~303 |
| 50 triệu đ (~US$1.900) | ~2.173 | **~1.281** | ~726 |

Số người dùng hoạt động mỗi tháng (MAU) cần có = người trả tiền / tỷ lệ trả tiền (ESTIMATE):

| Mục tiêu | Thấp @3% / @5% | Giữa @3% / @5% | Cao @3% / @5% |
|---|---|---|---|
| 5 triệu | 9,1k / 5,5k | **5,4k / 3,2k** | 3,1k / 1,8k |
| 20 triệu | 30k / 18k | **18k / 11k** | 10k / 6,1k |
| 50 triệu | 72k / 43k | **43k / 26k** | 24k / 14,5k |

Số lượt cài mới cần có **mỗi tháng, đều đặn** = người trả tiền / L / tỷ lệ chuyển đổi (ESTIMATE):

| Mục tiêu | Thấp @0,7% / @1,9% | Giữa @0,7% / @1,9% | Cao @0,7% / @1,9% |
|---|---|---|---|
| 5 triệu | 3,9k / 1,4k | **2,3k / 0,85k** | 1,3k / 0,5k |
| 20 triệu | 13k / 4,8k | **7,6k / 2,8k** | 4,3k / 1,6k |
| 50 triệu | 31k / 11,4k | **18,3k / 6,7k** | 10,4k / 3,8k |

Mô hình nhạy nhất với **tỷ lệ chuyển đổi và giá**, gần như không nhạy với chi phí AI; giảm L từ 10 xuống 5 tháng thì số lượt cài
cần có tăng gấp đôi; bán toàn bộ qua web VietQR (giữ ~97% thay vì 80%) giảm số người trả tiền cần có ~18% nhưng đổi lại phải gia
hạn tay. Mô hình bỏ qua hoàn tiền (Adapty toàn cầu 8,3%), khuyến mãi và công sức chủ dự án. Đối chiếu: kịch bản Giữa/20 triệu là
~28 triệu đ doanh thu gộp, tức ~US$1.070 doanh thu định kỳ mỗi tháng (MRR), đúng mốc mà chỉ 17,3% app đạt trong 2 năm; kịch bản
Giữa/50 triệu cần ~43k MAU, xấp xỉ MochiVocab theo ước tính bên thứ ba (~43K MAU, "<$10K" doanh thu/tháng, +9,2K lượt cài iOS/tháng)
([AppGoblin MochiVocab](https://appgoblin.info/apps/1484058499)). Một hệ quả về thuế (ESTIMATE): doanh thu gộp năm của kịch bản Giữa
là ~103 / ~339 / ~812 triệu đ cho ba mục tiêu, **cả ba đều dưới ngưỡng 1 tỷ đ/năm** của Nghị định 141/2026, dù ngưỡng đó có áp
cho cá nhân chưa đăng ký hay không vẫn UNVERIFIED.

**Quảng cáo trả tiền không hoàn vốn.** Với kịch bản Giữa, một người trả tiền mang về ~422.000 đ (~US$16) suốt đời, nên mỗi lượt cài
chỉ đáng ~US$0,11–0,30 (ESTIMATE); trong khi giá mỗi lượt cài ở châu Á – Thái Bình Dương là US$1,50–3,00
([Mapendo](https://mapendo.co/blog/cost-per-install-by-country-2025)) và trên Facebook cho app giáo dục trung bình US$104
([Superads](https://www.superads.ai/facebook-ads-costs/cost-per-app-install/education)), tức đắt gấp **~5–27 lần** giá trị một
người trả tiền. Tăng trưởng phải tự nhiên: tìm kiếm trên store bằng từ khóa tiếng Việt (MochiVocab đứng #94, TFlat #54 trong bảng
Giáo dục miễn phí), video ngắn do chính chủ dự án làm, nhóm học Facebook, giáo viên giao danh sách từ cho lớp, và chỉ thuê
creator nhỏ (~US$200–600 mỗi người theo ước tính chưa kiểm của [Scrumball](https://www.scrumball.com/ranking/top-teacher-influencers-on-tiktok-in-vietnam))
khi đã đo được tỷ lệ chuyển đổi tự nhiên. TFlat và MochiVocab, cả hai đều đăng dưới tên cá nhân, cho thấy một nhóm rất nhỏ có thể
đạt quy mô này (đội thật sự có phải một người không là UNVERIFIED).

**Rủi ro thị trường.** Doanh thu tập trung cực độ: **10% app giáo dục đứng đầu lấy 96% doanh thu** của cả nhóm
([Adapty](https://adapty.io/state-of-in-app-subscriptions-report/)). Mốc giá thấp và gói trọn đời phổ biến (TFlat, Lingoland, ELSA,
Memrise, Monkey) kéo giá xuống, và gói trọn đời buộc app gánh chi phí AI và máy chủ cho người dùng cũ mãi mãi. Động lực thi cử
đang yếu đi: tiếng Anh thành môn tự chọn trong kỳ thi tốt nghiệp THPT từ 2025, số bài thi tiếng Anh giảm từ 906.549 (2024) xuống
334.547 (2026) ([Đại biểu Nhân dân](https://daibieunhandan.vn/50-diem-thi-tieng-anh-duoi-trung-binh-danh-gia-sat-nang-luc-hoc-sinh-10422161.html)).
Và quan trọng nhất cho thiết kế gói: 5/6 câu trả lời mở trong khảo sát nói chat AI đã đủ dùng ([SURVEY_ANALYSIS](SURVEY_ANALYSIS_2026-09-30.md)),
nên **câu hỏi AI đơn thuần bị chat AI miễn phí làm được**; gói trả tiền phải bán thứ công cụ miễn phí không đóng gói sẵn, như thêm
nhanh từ gặp ở bất kỳ đâu, lịch ôn tự động trên web và mobile, catalog theo cấp độ và chủ đề. Trong khi đó Free hiện đã phủ toàn bộ
vòng học không-AI, và giá trị trả tiền dựa hoàn toàn vào Bước 6–7 chưa có code ([kiểm kê §2](evidence/commercialization-2026-10-19/5_project_inventory.md)).

**Đính chính cho tài liệu cũ trong repo (giữ từ ghi chú thị trường §0).** [COMPETITOR_ANALYSIS](COMPETITOR_ANALYSIS_AI_ENGLISH_APPS_2026-09-30.md)
xếp Video Call vào Duolingo Max, nay đã cũ vì thư cổ đông Q2 2026 nói phần lớn người đăng ký Super mới đã có Video Call
([Duolingo Q2 2026, SEC](https://www.sec.gov/Archives/edgar/data/0001562088/000162828026053299/q2fy26duolingo6-30x26share.htm));
tài liệu đó cũng không có giá và không có đối thủ Việt (MochiVocab, TFlat, Lingoland, Prep). Trong
[DATA_COST_LICENSE_RESEARCH](DATA_COST_LICENSE_RESEARCH_2026-10-02.md) §3.1, giá Gemini/OpenAI lấy từ trang thứ cấp nay khớp trang
chính thức, nhưng Claude Haiku 4.5 (US$1/US$5 mỗi triệu token) đã thành "legacy" và có Haiku 5.5 rẻ hơn 10 lần (US$0,10/US$0,50)
([Claude pricing](https://claude.com/pricing)); ước tính của nó còn tính "5 câu chấm" bằng AI trong khi câu điền chỗ trống giờ chấm
bằng rule, nên chi phí AI mỗi phiên chỉ còn phần sinh câu; mục phí cổng thanh toán "chưa tra" nay được lấp một phần ở trên.
[SURVEY_ANALYSIS](SURVEY_ANALYSIS_2026-09-30.md) tự ghi là không cho biết gì về việc người học có chịu trả tiền cho một app mới.

## Kết luận

Thứ quyết định dự án có kiếm được tiền hay không không phải code hay luật, mà là hai con số chưa ai đo: bao nhiêu phần trăm người
dùng chịu trả tiền, và họ ở lại bao lâu. Thủ tục pháp lý tối thiểu đi nhanh (hộ kinh doanh rẻ và nhanh theo ghi chú pháp lý,
thông báo TMĐT được trả lời trong 3 ngày làm việc; bộ chính sách tiếng Việt vẫn cần luật sư xem), còn hai việc dài nhất là duyệt nghĩa cho catalog (73–440 giờ, ASSUMPTION) và tìm bằng
chứng người dùng; thứ tự hiện tại lại đặt cả bằng chứng (D12) lẫn Deploy (D3) ở cuối, sau Bước 5–8 và có thể cả Flutter. Một bản
web mỏng, bán gói trả trước qua payOS hoặc cấp Pro bằng tay (ER10) cho vài chục người, sẽ biến ba giả định nặng nhất của mô hình (tỷ
lệ trả tiền, L, tỷ lệ gói năm) thành số đo trước khi đầu tư thêm, và quyết định đó cũng định luôn cấu trúc giá Q6.

AI là chỗ lệch lớn nhất giữa tiền và rủi ro. Về tiền, nó gần như miễn phí (~2–3 đ mỗi câu); về pháp lý và nền tảng, nó là phần nặng
nhất: gửi dữ liệu người học tới một API ở nước ngoài kéo theo hồ sơ chuyển dữ liệu ra nước ngoài, nghĩa vụ xin phép của Apple, điều
khoản về người dưới 18 của provider và Luật AI, dù tính năng đó miễn phí hay trả tiền. Đồng thời, đó lại là thứ chat AI miễn phí làm
được. Vì vậy nên coi quyết định tuổi tối thiểu (Q5) là quyết định gốc: nó chọn luôn provider (Gemini bị loại nếu nhận người dưới 18),
luồng tài khoản cha mẹ (Luật 116 Điều 16), xếp hạng tuổi trên store và mức rủi ro dữ liệu; và nên thử bán phần "đóng gói" không-AI
trước khi đặt cả gói Pro lên AI.

## Ghi chú phụ

1. Hai file PDF dưới `docs/` bị đặt tên sai. `docs/subscription-recurring-payments-and-negative-option-billing-merchants–faqs.pdf` là
   FAQ và nội dung luật **của Mastercard** cho người bán subscription (file ghi "Mastercard first announced these requirements in
   September 2021"), không phải của Visa; `...–faqs-1.pdf` hoàn toàn không phải tài liệu mạng thẻ mà là **thư cổ đông Q2 2026 của
   Duolingo** ([2_app_stores_payments.md](evidence/commercialization-2026-10-19/2_app_stores_payments.md), đầu file). Cả hai đều
   chưa được commit.
2. File gốc chưa commit `.verify-b25-accounts.md` được review 18/10 báo là chứa các dòng mật khẩu, token và secret, và **không nằm
   trong `.gitignore`** ([review 18/10](../superpowers/reviews/2026-10-18-buoc-0-4-code-review.md), mục "Tài liệu và quy trình");
   lần nghiên cứu này không mở file đó. Nên xóa hoặc thêm vào `.gitignore` trước lần push tiếp theo.
3. Ghi chú kiểm kê (viết ở HEAD `9deb8d4`) thấy [CLAUDE.md](../../CLAUDE.md) lỗi thời về tình trạng build: nó ghi "next is
   Bước 3" trong khi Bước 3 và Bước 4 đã xong trên `dev`. Kiểm lại lúc viết báo cáo này: PR #59 (commit `dab4fe4`, merge 19/10/2026
   01:26) đã sửa, dòng 16 của CLAUDE.md giờ ghi Bước 0–4 đã làm, Bước 3 chỉ phần hệ thống, Bước 4 chỉ API. Phần vẫn còn lỗi thời là
   dòng trạng thái landing "Status: Tasks 1-3 done; 4-7 in progress", trong khi đã có workflow deploy landing và `database_id` D1
   thật (bằng chứng hoàn thành Task 7 vẫn còn thiếu theo hướng dẫn 09/10).
