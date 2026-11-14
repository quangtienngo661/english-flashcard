# Tiêu chuẩn tối thiểu để thương mại hóa app (19/10/2026)

Danh sách việc **phải có** trước khi thu đồng tiền đầu tiên, rút gọn từ
[COMMERCIALIZATION_READINESS_2026-10-19.md](COMMERCIALIZATION_READINESS_2026-10-19.md). URL nguồn của từng điều luật hay quy định
nằm trong báo cáo đó và trong [5 ghi chú bằng chứng](evidence/commercialization-2026-10-19/); file này chỉ ghi số hiệu để tra.

- **Phạm vi:** bán gói Pro cho người học ở Việt Nam, ra mắt trên web trước. Phần mobile ở mục H, chỉ cần khi lên App Store hoặc
  Google Play.
- **Không phải tư vấn pháp lý.** Số điều khoản đọc qua trang sao chép, cần đối chiếu lại trên vbpl.vn. Các câu ở mục I nên hỏi
  một công ty luật trước lần thu tiền đầu.
- **Cột "Dự án hôm nay"** lấy từ kiểm kê repo ngày 19/10/2026
  ([5_project_inventory.md](evidence/commercialization-2026-10-19/5_project_inventory.md)): **Có** = đã có code chạy; **Một
  phần** = có một phần, hoặc mới có trong spec/quyết định; **Chưa** = chưa có gì.
- Nhãn **UNVERIFIED** = chưa xác nhận được từ nguồn gốc; **ESTIMATE** = con số tự tính.

## A. Giấy tờ kinh doanh và thuế

| # | Việc phải có | Vì sao (nguồn) | Dự án hôm nay |
|---|---|---|---|
| A1 | Đăng ký ít nhất một **hộ kinh doanh** (đăng ký ở cấp xã, rẻ và nhanh). Chuyển sang công ty TNHH một thành viên khi cần tài khoản Apple dạng tổ chức, cổng thanh toán đòi pháp nhân, hoặc doanh thu gần 1 tỷ đ/năm | Nghị định 168/2025 Điều 82 khoản 3 không miễn đăng ký cho bán hàng online (suy luận, chưa cơ quan nào xác nhận) | Chưa |
| A2 | Gửi **thông báo website/app thương mại điện tử** qua Cổng Dịch vụ công và được UBND cấp tỉnh xác nhận **trước khi** mở thanh toán (trả lời trong 3 ngày làm việc); gắn biểu tượng liên kết online.gov.vn | Luật 122/2025 Điều 14 khoản 1; Nghị định 248/2026 Điều 23–24 | Chưa |
| A3 | Ghi sổ doanh thu. Hộ có doanh thu ≤ 1 tỷ đ/năm không nộp VAT và thuế TNCN, chỉ nộp tờ khai 01/TKN-CNKD trước 31/1 năm sau | Nghị quyết 198/2025 Điều 10; Nghị định 68/2026 và 141/2026 | Chưa |

## B. Thông tin và chính sách công khai

| # | Việc phải có | Vì sao (nguồn) | Dự án hôm nay |
|---|---|---|---|
| B1 | Hiện danh tính chủ sở hữu: tên, địa chỉ, mã số thuế | Nghị định 248/2026 Điều 4 | Chưa |
| B2 | **Terms** (điều khoản sử dụng) tiếng Việt, chữ và nền tương phản rõ, không có điều khoản bất công (ví dụ bắt đồng ý thu dữ liệu mới cho ký hợp đồng). Không cần đăng ký mẫu với nhà nước | Luật 19/2023 Điều 25; Nghị định 55/2024 Điều 6; Quyết định 07/2024 | Một phần: bản nháp placeholder ([LegalDraft.tsx](../../apps/web/src/components/sections/LegalDraft.tsx)) |
| B3 | **Privacy Policy** tiếng Việt cho tài khoản người học, không chỉ cho waitlist | Luật 91/2025; Nghị định 356/2025 | Một phần: chỉ viết cho waitlist ([PrivacyPolicy.tsx](../../apps/web/src/components/sections/PrivacyPolicy.tsx)) |
| B4 | **Trang giá:** Free khác Pro ở đâu, giá đã gồm thuế chưa, chu kỳ, có tự gia hạn không, cách hủy, chính sách hoàn tiền | Nghị định 248/2026 Điều 6, 8, 10, 14, 17 | Một phần: chỉ có Free và Trial ([Plans.tsx](../../apps/web/src/components/sections/Plans.tsx)); giá Pro chưa chốt (K26) |
| B5 | Kênh hỗ trợ: email liên hệ trên web, mục "Trợ giúp / Liên hệ" trong app, trang FAQ | Luật 19/2023 Điều 37; Apple 1.5 | Chưa kiểm |
| B6 | Ghi nguồn dữ liệu cho người học xem: CEFR-J, Octanove (giấy phép CC BY-SA 4.0), AGID, WordNet | Điều khoản CEFR-J; CC BY-SA 4.0; SR15 | Một phần: có `GET /v1/sources`, chưa có màn hình; [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md) thiếu CEFR-J và Octanove |

## C. Dữ liệu cá nhân

Mức phạt cho tham khảo: thiếu thông báo xử lý dữ liệu hoặc không lưu vết đồng ý bị phạt 30–50 triệu đ; xử lý dữ liệu mà không có
đồng ý bị phạt 50–70 triệu đ (Nghị định 330/2026, nguồn thứ cấp).

| # | Việc phải có | Vì sao (nguồn) | Dự án hôm nay |
|---|---|---|---|
| C1 | Ô đồng ý **riêng cho từng mục đích**, để trống mặc định; server lưu thời điểm tick và phiên bản chính sách người dùng đã xem. Ví dụ: "Tôi đồng ý nhận email nhắc học" không được tick sẵn | Luật 91/2025 Điều 9; Nghị định 356/2025 | Chưa: form đăng ký chỉ có `email, password, timezone, client, device_label` (DB3) |
| C2 | Email quảng cáo cần đồng ý riêng và nút hủy nhận. Email biên lai, nhắc gia hạn và email bảo mật là tin dịch vụ, không cần | Nghị định 91/2020; Luật 19/2023 Điều 18 | Chưa |
| C3 | Chốt **tuổi tối thiểu** và hỏi tuổi khi đăng ký. Nếu nhận người dưới 16 tuổi thì cha mẹ phải đăng ký tài khoản bằng thông tin của cha mẹ | Luật 116/2025 Điều 16 khoản 2; Luật 91/2025 Điều 24 | Chưa: đề xuất cũ là 16+, chưa chốt |
| C4 | **Xóa tài khoản kèm dữ liệu** (vô hiệu hóa thôi là chưa đủ), làm ngay trong app; với Google Play thì thêm một trang web để yêu cầu xóa | Nghị định 356/2025 (xóa trong 20 ngày); Apple 5.1.1(v); Google Play account deletion | Một phần: có trong spec (SR11), chưa có code, dời sang Bước 8 |
| C5 | Một trang **bảng kê dữ liệu**: thu dữ liệu gì, lưu ở đâu, giữ bao lâu, gửi cho ai (email, AI, cổng thanh toán, analytics) | Best practice (ghi chú chất lượng §2) | Chưa |
| C6 | Quy trình khi lộ dữ liệu: báo cơ quan chuyên trách (A05, Bộ Công an) trong **72 giờ** | Luật 91/2025 Điều 23 | Chưa |
| C7 | Không đưa thông tin cá nhân vào URL, log hay công cụ theo dõi | SR10; ghi chú chất lượng §2 | Một phần: log đã che mật khẩu, OTP, token ([app-logger.ts](../../apps/api/src/common/logging/app-logger.ts)); URL và analytics chưa kiểm |

## D. Bán gói và thu tiền

| # | Việc phải có | Vì sao (nguồn) | Dự án hôm nay |
|---|---|---|---|
| D1 | Chọn kênh thu tiền trên web. Stripe không hỗ trợ Việt Nam. Ba hướng còn lại: **payOS** (cá nhân đăng ký bằng CCCD, quét mã VietQR, không tự gia hạn, tức bán gói trả trước 1/3/12 tháng); **token** của VNPAY, MoMo hay ZaloPay (tự gia hạn, cần hợp đồng merchant); **Paddle** (công ty đứng tên bán thay mình, phí 5% + 50¢) | Ghi chú thanh toán; Stripe global | Chưa chọn |
| D2 | Luồng đặt mua: hiện đủ điều khoản trước khi trả tiền, cho xem lại và sửa đơn, cho tải hợp đồng, lưu dữ liệu giao dịch | Luật 122/2025 Điều 12, 16; Luật 19/2023 Điều 37–38 | Chưa |
| D3 | Server là nơi **duy nhất** quyết định ai có Pro: nhận lời báo "đã trả" tự động từ cổng (`webhook`), rồi ghi quyền kèm ngày hết hạn | Ghi chú thanh toán, mục cross-platform | Một phần: `entitlements` hiện luôn trả "được phép" ([entitlements.service.ts](../../apps/api/src/entitlements/entitlements.service.ts)); billing dời sang V1.5 (F35) |
| D4 | Email nhắc **≥ 7 ngày làm việc** trước mỗi lần thu phí và trước khi gói hết hạn. Theo suy luận, gói trả trước cũng cần | Luật 19/2023 Điều 42 khoản 2 | Chưa: có thể tái dùng hạ tầng email nhắc học của Bước 3 |
| D5 | Cho hủy bất cứ lúc nào, người dùng chỉ trả phần đã dùng; nếu thông tin trước khi bán thiếu hoặc sai thì cho hủy trong 30 ngày và hoàn tiền trong 30 ngày | Luật 19/2023 Điều 38, 42 khoản 3 | Chưa |
| D6 | Chốt giá Pro. Quy tắc K26 (gói năm = 12 × giá tháng × 90%) đang lệch mức đối thủ, vì đối thủ bán gói năm chỉ bằng khoảng 25–50% giá 12 tháng | K26; bảng giá đối thủ trong báo cáo | Chưa: giá tháng chưa chốt |
| D7 | *Chỉ khi tự trừ thẻ định kỳ:* điều khoản gói nằm ngay cạnh ô nhập thẻ; email xác nhận kèm cách hủy; cho hủy online; nhắc ≥ 7 ngày trước khi hết dùng thử; chuyển người dùng sang trang của cổng (không nhúng ô thẻ vào trang mình); tự khai PCI DSS SAQ A và quét lỗ hổng mỗi quý | Visa; Mastercard Rules 5.4.1; PCI DSS v4.0.1 SAQ A, FAQ 1588 | Không áp dụng nếu dùng payOS |

## E. Kỹ thuật và vận hành (mức tối thiểu cho một người làm)

| # | Việc phải có | Vì sao (nguồn) | Dự án hôm nay |
|---|---|---|---|
| E1 | `Deploy` thật: hosting, Postgres và Redis không mất dữ liệu khi khởi động lại, secrets nằm ngoài repo | ASVS V13.3.1; Apple 2.1 (backend phải chạy khi Apple review) | Chưa: không có Dockerfile hay cấu hình hosting. Chi phí ~0,9–1,6 triệu đ/tháng (ESTIMATE) |
| E2 | Backup Postgres hằng ngày, thêm một bản sao ở nhà cung cấp khác; **khôi phục thử** vào một DB trống trước khi ra mắt và mỗi quý, ghi lại thời gian khôi phục | Google SRE: backup chỉ có giá trị khi đã khôi phục thử thành công | Chưa |
| E3 | Giám sát: công cụ gom lỗi (Sentry, gói miễn phí); kiểm tra `/health` từ bên ngoài, báo qua email hoặc điện thoại khi sập; mục tiêu ổn định khoảng 99,5% mỗi 4 tuần (≈ 3,6 giờ ngừng mỗi 30 ngày, con số tự chọn) | Google SRE Workbook | Một phần: có controller `health`, còn lại chưa |
| E4 | Môi trường **staging** riêng (DB và secrets riêng); migration chạy ở staging trước; backup ngay trước mỗi migration trên production | Ghi chú chất lượng §3 | Chưa |
| E5 | Sửa 3 lỗi nặng của review 18/10: C1 (10 lượt ghi cùng lúc đều lỗi 500), C2 (bộ nhớ phình theo `timezone`), C3 (lỗi 500 không ghi log). Sửa thêm T12: để mặc định `TRUST_PROXY=false` thì cả hệ thống chỉ đăng ký được 5 tài khoản mỗi giờ. Và T6: câu trắc nghiệm có thể có hai đáp án đúng | [Review 18/10](../superpowers/reviews/2026-10-18-buoc-0-4-code-review.md) | Chưa: cả 3 lỗi nặng còn trong code |
| E6 | Bảo mật mức **OWASP ASVS 5.0 L1** đầy đủ, cộng các mục L2 sau: băm mật khẩu chậm (argon2id); chặn mật khẩu đã bị lộ; OTP chỉ dùng một lần, có hạn, giới hạn số lần thử; chống bot; secrets trong kho quản lý riêng; không log secrets; log sự kiện đăng nhập; thông báo lỗi chung chung; header CSP; cho xem và thu hồi phiên đăng nhập; tắt debug. Bỏ quy tắc bắt mật khẩu có chữ hoa, số, ký tự đặc biệt (K9 trái với ASVS V6.2.5). Tự quét bằng OWASP ZAP với staging. **Pen test không bắt buộc** | OWASP ASVS 5.0.0; ghi chú chất lượng §1 | Một phần: đã có argon2id, rate limit, che log; các mục còn lại chưa kiểm từng mục |
| E7 | Email: tên miền riêng, gửi qua một nhà cung cấp email uy tín (không dùng SMTP Gmail cá nhân), có SPF + DKIM + DMARC `p=none` (bản ghi DNS chứng minh email đúng là của tên miền mình), tách email giao dịch khỏi email quảng cáo | Quy định người gửi của Gmail: mọi người gửi cần SPF hoặc DKIM và tỷ lệ spam < 0,3%; từ 11/2025 Gmail từ chối thư không đạt | Chưa: đang định dùng SMTP Gmail cá nhân |

## F. Nội dung

| # | Việc phải có | Vì sao (nguồn) | Dự án hôm nay |
|---|---|---|---|
| F1 | Nghĩa tiếng Việt đã duyệt cho các từ người học sẽ gặp (mục tiêu D6: 8.812 từ trước ra mắt) | Điều kiện sản phẩm | Chưa: các DB thử chỉ có 4–20 nghĩa; ước 73–440 giờ duyệt (`ASSUMPTION`) |
| F2 | Dùng CEFR-J bản 1.6 chính thức và ghi nguồn; không dùng danh sách Oxford 3000/5000 hay Cambridge EVP (không có điều khoản cho dùng lại) | Trang tải CEFR-J; ghi chú chất lượng §7 | Một phần: repo đang nhập bản 1.5 từ mirror |
| F3 | Không làm tính năng kiểu mạng xã hội (chia sẻ nhóm từ công khai, bình luận, bảng xếp hạng có tên tự đặt), để khỏi phải xin giấy phép | Nghị định 147/2024 Điều 24 khoản 2 | Chưa kiểm: giữ như một ràng buộc khi thiết kế |

## G. Nếu gói Pro có AI

| # | Việc phải có | Vì sao (nguồn) | Dự án hôm nay |
|---|---|---|---|
| G1 | Chọn nhà cung cấp AI **sau khi** chốt tuổi tối thiểu (C3): Gemini API cấm app nhiều khả năng có người dưới 18 dùng; Anthropic cho phép nhưng bắt nói rõ người dùng đang tương tác với AI | Gemini API terms; hướng dẫn của Anthropic cho tổ chức phục vụ người dưới 18 | Chưa chọn provider |
| G2 | Dùng gói trả phí (dữ liệu không bị dùng để huấn luyện mô hình); câu lệnh gửi AI chỉ chứa từ và nghĩa, không chứa email hay tên | Gemini API terms; ghi chú chất lượng §2 | Một phần: thiết kế đã quy định chỉ gửi nội dung học |
| G3 | Xin phép rõ ràng trước khi gửi dữ liệu cho AI bên thứ ba; ghi việc dùng AI trong Terms và Privacy | Apple 5.1.2(i); Luật 91/2025 Điều 20 (dùng API ở nước ngoài tính là chuyển dữ liệu ra nước ngoài) | Chưa |
| G4 | Nhãn "do AI tạo", nút "Báo lỗi", kiểm câu bằng rule, lọc nội dung xấu | Apple 1.2; OWASP LLM Top 10 2025; Luật AI 134/2025 | Một phần: kiểm bằng rule và nút báo lỗi đã có trong thiết kế (K16); luồng báo lỗi đã chạy cho câu không-AI |
| G5 | Trần chi phí ba lớp: hạn mức mỗi người, trần mỗi ngày cho toàn hệ thống (ER14), trần mỗi tháng đặt ở phía provider, báo động khi dùng tới 50% và 80% | OWASP API4:2023, LLM10 | Một phần: ER14 và hạn mức là `ASSUMPTION`, chưa có code |
| G6 | Tự phân loại mức rủi ro của AI; nếu là "rủi ro trung bình" thì thông báo Bộ Khoa học và Công nghệ | Luật AI 134/2025; Nghị định 142/2026 | Chưa |

## H. Nếu bán trên mobile (thêm vào các mục trên)

| # | Việc phải có | Vì sao (nguồn) |
|---|---|---|
| H1 | Tài khoản Apple US$99/năm: tài khoản cá nhân thì App Store hiện tên thật của chủ dự án, tài khoản dạng tổ chức cần pháp nhân và mã D-U-N-S. Tài khoản Google US$25 một lần; tài khoản cá nhân mới phải chạy **bản thử kín với ≥ 12 người, liên tục 14 ngày** (thêm khoảng 3 tuần) | Apple Enroll; Google Play testing requirements |
| H2 | Bán Pro bằng **In-App Purchase** (Apple) và Play Billing (Google); ở Việt Nam không được đặt nút hay link dẫn sang giá web. Người đã mua trên web chỉ dùng được Pro trong app iOS nếu Pro cũng bán được bằng IAP | Apple 3.1.1, 3.1.1(a), 3.1.3(b); Google Play Payments policy |
| H3 | Trang mời mua: **giá gia hạn đầy đủ là con số nổi bật nhất**, kèm thời hạn, quyền lợi, link Terms và Privacy; gói kéo dài ít nhất 7 ngày; không đặt tên gói định kỳ là "Free Trial" | Apple subscriptions; Apple 3.1.2(a); Google Subscriptions policy |
| H4 | Có Sign in with Apple nếu app có đăng nhập bằng Google | Apple 4.8 |
| H5 | Xóa tài khoản trong app (như C4) | Apple 5.1.1(v); Google Play |
| H6 | Nhãn quyền riêng tư của Apple, form Data safety của Google, privacy manifest (Flutter nằm trong danh sách SDK phải có), xếp hạng tuổi riêng cho Việt Nam (00+/12+/16+/18+) | Apple, Google; Nghị định 147 Điều 38 |
| H7 | Target Android API 36 (từ 31/8/2026); build iOS bằng Xcode 26 (từ 28/4/2026) | Google target API; Apple upcoming requirements |
| H8 | Server xác nhận đơn Google trong **3 ngày**, quá hạn thì Google tự hoàn tiền; nhận thông báo từ App Store Server. RevenueCat miễn phí dưới US$2.500 doanh thu theo dõi mỗi tháng | Vòng đời subscription của Google; RevenueCat pricing |
| H9 | Tỷ lệ crash < 1,09% và tỷ lệ ANR (app đơ, không phản hồi) < 0,47% | Android vitals |
| H10 | Khai mã số thuế hoặc CCCD 12 số cho Apple và Google. Store khấu trừ thuế trước khi trả tiền: Apple 2% thuế TNCN, Google thu và nộp thay 5% VAT; Google có trừ thêm thuế TNCN không thì chưa rõ | Nghị định 117/2025; trang thuế của Apple và Google (một phần UNVERIFIED) |

## I. Hỏi luật sư trước lần thu tiền đầu (đều UNVERIFIED)

1. Lịch sử ôn tập, chuỗi ngày học và danh sách từ hay sai có bị xếp là **dữ liệu nhạy cảm** theo Nghị định 356/2025 không? Nếu
   có, hộ kinh doanh mất miễn trừ và phải nộp hồ sơ đánh giá tác động xử lý dữ liệu (DPIA) trong 60 ngày.
2. Hồ sơ **chuyển dữ liệu ra nước ngoài** có được miễn cho hộ kinh doanh không? Luật 91 Điều 38 không miễn, còn EY nói Nghị định
   356 có miễn.
3. Nghĩa vụ **lưu dữ liệu người dùng tại Việt Nam** (Luật 116/2025 Điều 25, Nghị định 333/2026) áp dụng tự động hay chỉ khi Bộ
   Công an yêu cầu? Đặt server hoặc Cloudflare ở nước ngoài có được không?
4. Việc **xác thực tài khoản bằng số điện thoại Việt Nam** (Nghị định 333/2026) có áp dụng cho một app không phải mạng xã hội không?
5. App chỉ bán qua In-App Purchase có phải gửi thông báo thương mại điện tử riêng, ngoài thông báo cho website, không?
6. Ngưỡng 1 tỷ đ/năm có làm store ngừng khấu trừ thuế không, và tiền đã bị khấu trừ có lấy lại được không?
7. payOS, VNPAY hay MoMo có nhận hộ kinh doanh hoặc cá nhân bán gói học số không?

## J. Chưa bắt buộc lúc ra mắt (làm khi mở rộng)

- **Bắt buộc khi lớn lên:**
  - DPIA và hồ sơ chuyển dữ liệu ra nước ngoài, nếu câu I.1 và I.2 cho phép hoãn; khi đã xử lý dữ liệu của ≥ 100.000 người thì
    hết miễn trừ.
  - Cán bộ bảo vệ dữ liệu (DPO), thuê dịch vụ bên ngoài cũng được.
  - Doanh thu > 1 tỷ đ/năm: khai VAT 5% và thuế TNCN, bắt buộc hóa đơn điện tử.
  - Khi đổi tên miền, người chịu trách nhiệm hoặc chính sách: nộp lại thông báo thương mại điện tử trong 20 ngày làm việc.
- **Nên có:**
  - Khôi phục test tự động chạy trên Postgres và Redis thật (đã xóa ở D38); sửa 16 lỗi mức trung bình của review 18/10.
  - Core Web Vitals đạt mức "good": LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1.
  - WCAG 2.2 AA: không bắt buộc với app tư nhân ở Việt Nam (Thông tư 26/2020).
  - Pen test thuê ngoài, trang trạng thái hệ thống, bảo vệ nhánh `main`/`dev` trên GitHub.
  - Xin Tono Lab xác nhận bằng văn bản việc dùng CEFR-J cho mục đích thương mại.
  - Rà GDPR và COPPA trước khi nhận người dùng ở EU hoặc Mỹ.
