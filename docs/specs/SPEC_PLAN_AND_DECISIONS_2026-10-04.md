# Spec V1 — phạm vi và các decision cần chốt trước khi viết

Ngày: **04/10/2026**. Trạng thái: **lịch sử thảo luận.** Quyết định cuối cùng của bạn nằm ở [DECISIONS_2026-10-04.md](DECISIONS_2026-10-04.md); file này giữ phương án, lý do và các mặc định F1–F44. Chưa có spec nào được viết.
File này đóng vai trò `plan.md` của lần chạy `write-spec`: sau khi bạn chốt, nó được ghi lại thành
`decision.md` (kèm lý do từng quyết định) rồi mới bắt đầu viết spec.

**Nhãn:** **Chốt** = bạn đã nêu rõ. **Đề xuất** = trợ lý đề xuất, chưa được chọn. **Giả định** = ghi
`ASSUMPTION` trong spec. **Mở** = chưa quyết định. Nguồn các quyết định đã chốt:
[PROJECT_CONTEXT](../preparation/PROJECT_CONTEXT.md).

## 1. Sẽ viết những spec nào, và phạm vi từng spec

Một spec **mô tả hành vi quan sát được và ràng buộc**: ai làm gì thì hệ thống phản ứng ra sao, quy tắc
nghiệp vụ, tiêu chí «When … then …», trường hợp biên. Spec **không** mô tả bảng/cột, framework hay
màn hình; những thứ đó thuộc bước build sau (`build-feature` cho code, `build-ui` cho giao diện).

| # | Tài liệu | Làm gì (phạm vi) | Không làm (V1) | Phụ thuộc |
| --- | --- | --- | --- | --- |
| 00 | **System spec** (mỏng) | Phạm vi V1 và phần chưa làm; vai trò; thuật ngữ; định danh (user ID, sense ID, operation ID); ngôn ngữ học / giải thích / giao diện; quy ước API (lỗi, phân trang, idempotency, tương thích client); quyền khác hạn mức; snapshot và version bài; xóa tài khoản; log và dữ liệu cá nhân; điều kiện trước khi public | Chi tiết từng module; màn hình; hạ tầng và triển khai | — |
| 01 | **Identity & Access** | Đăng ký và đăng nhập email + mật khẩu; Google OAuth 2.0; OTP qua SMTP (chỉ xác minh email và quên mật khẩu); phiên nhiều thiết bị, logout một thiết bị; thu hồi phiên; chống dò mật khẩu; xóa tài khoản | Sign in with Apple (chỉ ghi ràng buộc trước khi ra iOS); MFA/TOTP; đổi email; màn danh sách thiết bị | 00 |
| 02 | **Vocabulary Content** | Catalog entry → sense → text theo language; level, topic, nguồn và giấy phép; từ chức năng ẩn khỏi bộ học mặc định; từ tùy chỉnh (private); tìm kiếm; điều kiện publish; sửa nội dung đã publish; màn hình ghi nguồn dữ liệu | Phrasal verb, collocation, idiom (chỉ chừa cột `entry_type`); ngôn ngữ học khác tiếng Anh; nguồn ngoài (xem K12) | 00 |
| 03 | **Learning** | Nhóm từ; thêm/bỏ từ; trạng thái ba mức do người học chọn; phiên flashcard; nhật ký thay đổi trạng thái (xem K14); đồng bộ giữa web và mobile | Lịch ôn thích ứng (SRS); streak/điểm; học offline | 00, 01, 02 |
| 04 | **Content Pipeline** | Import CEFR-J + Octanove vào catalog; AI soạn nháp nghĩa/ví dụ/chủ đề theo lô qua BullMQ; vòng đời draft → reviewed → published; chống trùng, retry, giới hạn lượt gọi, chạy tiếp sau gián đoạn; danh sách job lỗi | Nguồn ngoài chạy thật; giao diện admin (xem K1); biên soạn cho phrasal/idiom | 00, 02, 06 |
| 05 | **Entitlements & Usage** | Quyền theo feature với nguồn cấp (trial, subscription, cấp tay); trial 14 ngày tự kích hoạt; hạn mức và sổ ghi lượt dùng; giữ chỗ nguyên tử; **giao diện** với Billing | Thanh toán thật, giá, hóa đơn; số lượt cụ thể (bạn tính sau) | 00, 01 |
| 06 | **AI Integration** | Cổng `AiProvider` và adapter; sinh bài kèm giải thích và bản dịch; deadline, retry có jitter, định dạng đầu ra, nhật ký chi phí; lỗi AI | Chọn provider/model (cấu hình, không nằm trong spec); chatbot/RAG (V1.5); AI nhận xét/sửa câu | 00 |
| 07 | **Practice** | Mọi dạng bài: bài **không AI** theo definition (trắc nghiệm, đúng/sai, tự luận) và bài **điền từ AI**; snapshot; chấm bằng rule; kết quả đúng/sai kèm giải thích và bản dịch; idempotency khi nộp; lỗi AI là "chưa chấm được" | Bài tự viết câu; AI nhận xét/sửa câu; chấm câu mở | 00, 02, 03, 05, 06 |

**Mỗi module spec gồm:** phạm vi (kèm phần ngoài phạm vi), ràng buộc từ bên ngoài, quy tắc nghiệp vụ,
ít nhất ba tiêu chí «When … then …», ít nhất hai trường hợp biên, ghi chú hợp đồng giữa module. Năm
vùng đã đánh dấu cần Defense Analysis (job của Content Pipeline; đăng nhập, OTP, phiên; quyền và hạn
mức AI; chấm bài và lỗi AI; idempotency khi nộp đáp án) có thêm phần phân tích theo
[mẫu decision](../preparation/DECISION_ANALYSIS_TEMPLATE.md).

**Không viết trong lần này:** file `api-contract` (hợp đồng nằm trong từng module spec, OpenAPI sinh từ
code sau); thiết kế màn hình; ADR; kế hoạch test; hạ tầng và CI/CD; nội dung Privacy Policy/ToS;
Billing thật; V1.5.

**Nguồn trích:** không có hệ thống tham chiếu để quan sát, nên mỗi tiêu chí trích từ (a) quyết định bạn
đã chốt, (b) research đã có trong `docs/preparation/`, hoặc (c) được ghi `ASSUMPTION`. Cuối cùng có bảng
kiểm kê: mỗi tiêu chí → nguồn → mức độ chắc chắn.

**Ranh giới ghi dữ liệu giữa các module (đề xuất):**

| Module | Sở hữu đường ghi |
| --- | --- |
| Identity | user, identity, phiên, OTP |
| Content | entry, sense, text, topic, level, nguồn |
| Pipeline | job và bản nháp; chỉ đẩy lên Content qua thao tác publish |
| Learning | nhóm, trạng thái, nhật ký ôn |
| Practice | câu hỏi, lượt làm bài; **điều phối**: xin giữ chỗ hạn mức (Entitlements) → gọi AI (AI Integration) → xác nhận hoặc nhả |
| AI Integration | nhật ký chi phí từng lần gọi provider |
| Entitlements | quyền, nguồn cấp, sổ lượt dùng của người dùng |

Hai sổ cuối tách nhau vì chi phí provider và lượt bị trừ của người dùng không bằng nhau khi có retry.

**Thứ tự viết:** (1) System spec + Vocabulary Content, vì Practice phụ thuộc schema; (2) Identity,
Learning, Content Pipeline (lát 1, không AI); (3) Entitlements, AI Integration, Practice (lát 2, có
AI). Practice là một spec duy nhất nhưng phần không AI có thể build trước phần AI.

## 2. Decision cần bạn chốt (18 mục)

Mỗi mục có phương án và đề xuất. Nếu đồng ý hết, chỉ cần trả lời **"chốt hết theo đề xuất"**; nếu muốn
đổi, trả lời theo dạng `K5 B, K15 A`.

### Cross-cutting

**K1. Ai duyệt nội dung bằng cách nào (bề mặt duyệt).** Bạn tự duyệt (đã chốt), nhưng chưa nói duyệt trên cái gì.
- A. **CLI + CSV**: lệnh xuất bản nháp ra CSV, bạn sửa trong bảng tính, lệnh nhập lại và publish. Không có giao diện admin, không có vai trò admin trên HTTP.
- B. Admin API + trang admin trong Next.js (có vai trò admin). Dùng lại được lâu dài; thêm bề mặt phân quyền và vài ngày công.
- C. Sửa thẳng trong DB (SQL/Prisma Studio). Không tốn công build, dễ sai và không có vòng draft → reviewed rõ ràng.
- **Đề xuất: A.** Gói pilot 300–500 từ duyệt trong bảng tính nhanh hơn dựng UI; khi cần cho người khác duyệt thì nâng lên B. Ảnh hưởng: 04, 02, 01.

**K2. Bộ pattern "chuẩn bị rẻ" đưa vào spec V1.** Pattern research chưa pattern nào được chọn; bạn muốn reusable/scalable.
- A. **Đưa cả bộ 13 mục vào spec như yêu cầu:** `entry_type`; handler theo loại bài; cổng `AiProvider` + bản giả; deadline + retry hữu hạn có jitter; `operation_id`; quyền theo feature + sổ lượt dùng; bảng danh tính tách user; Argon2id; PKCE; khóa job lưu DB; lỗi Problem Details (RFC 9457); phân trang token; header `Idempotency-Key`.
- B. Chỉ phần ảnh hưởng dữ liệu và API (khó đổi sau): `entry_type`, danh tính, `operation_id`, Problem Details, phân trang, Idempotency-Key, quyền + sổ.
- C. Bỏ hết, làm tối giản.
- Phần "chỉ áp dụng khi có tín hiệu" (circuit breaker, cache, outbox, registry động, scheduler SRS) luôn **không** vào V1; spec chỉ ghi điều kiện kích hoạt.
- **Đề xuất: A.** Mỗi mục rất rẻ ở V1 và đắt khi sửa sau khi có client. Ảnh hưởng: tất cả module.

**K3. Xóa tài khoản.** Store yêu cầu xóa được trong app.
- A. **Xóa ngay** sau khi xác nhận lại (mật khẩu hoặc OTP): xóa dữ liệu cá nhân và học tập, giữ số liệu tổng hợp không định danh.
- B. Ân hạn 30 ngày (khôi phục được) rồi xóa hẳn bằng job; thêm trạng thái "chờ xóa" và job dọn.
- **Đề xuất: A.** Ít code hơn và triệt để hơn; đổi lại xóa nhầm không khôi phục được (nên có bước xác nhận). Thời hạn xóa bản sao lưu: `ASSUMPTION`, chưa đọc nội dung Luật 91/2025 về thời hạn xử lý. Ảnh hưởng: 00 và mọi module có dữ liệu người dùng.

**K4. Ngôn ngữ V1.** Schema D tách ngôn ngữ học, ngôn ngữ giải thích và ngôn ngữ giao diện.
- A. **Học: tiếng Anh. Giải thích: tiếng Việt. Giao diện: tiếng Việt**, chuỗi giao diện tách khỏi code (i18n-ready); `definition` tiếng Anh là trường tùy chọn.
- B. Như A nhưng giao diện có thêm tiếng Anh ngay trong V1.
- **Đề xuất: A.** Thêm giao diện tiếng Anh là thêm file chuỗi, làm sau được. Hệ quả: V1 chỉ có một ngôn ngữ giải thích nên chưa cần quy tắc fallback; mục chưa có bản tiếng Việt thì không publish được. Ảnh hưởng: 00, 02, 07.

### Identity & Access

**K5. Cơ chế phiên.** Web và mobile cùng một backend, nhiều thiết bị, logout một thiết bị.
- A. **Phiên opaque phía server cho cả hai client:** một bảng phiên (lưu hash token), web dùng cookie `HttpOnly`, mobile dùng bearer lưu trong secure storage. Logout = thu hồi đúng một dòng.
- B. JWT access ngắn hạn + refresh token xoay vòng. Ít truy vấn DB mỗi request, nhưng thu hồi trễ và thêm logic xoay vòng/phát hiện dùng lại token.
- C. Cookie cho web + JWT cho mobile (hai cơ chế).
- **Đề xuất: A.** Một cơ chế, thu hồi tức thời, hợp "logout một thiết bị"; mỗi request tốn một truy vấn DB, với 10–50 người dùng không đáng kể. Lưu ý (suy luận): RFC 9700 §2.2.2 nói về refresh token của OAuth, còn phiên của app là token riêng; §4.14 sau đó được agent kiểm chứng đọc (R22). Ảnh hưởng: 01, 00.

**K6. Thời hạn phiên.** Bạn muốn đăng nhập một lần giữ đến logout; OWASP Session Management khuyến nghị có idle và absolute timeout.
- A. **Không bao giờ hết hạn** đến khi logout hoặc bị thu hồi (đúng nghĩa đen).
- B. Idle **90 ngày** (trượt theo lần dùng), absolute **365 ngày**; hết hạn thì đăng nhập lại.
- C. Idle 30 ngày + absolute 90 ngày.
- **Đề xuất: B.** Gần đúng trải nghiệm "giữ đăng nhập" nhưng không để token sống vô hạn; chênh so với ý bạn ở chỗ sau 1 năm phải đăng nhập lại. Con số là `ASSUMPTION`. Ảnh hưởng: 01.

**K7. Xác minh email có bắt buộc không.**
- A. Bắt buộc **trước khi** dùng app.
- B. **Dùng được tính năng Free khi chưa xác minh; kích hoạt trial yêu cầu email đã xác minh.** Tài khoản Google tự động coi là đã xác minh (`email_verified`).
- C. Không bắt buộc, kể cả trial.
- **Đề xuất: B.** Giảm ma sát ở bước đăng ký, vẫn chặn việc tạo nhiều tài khoản ảo để lấy trial lặp. Ảnh hưởng: 01, 05.

**K8. Cùng một email ở Google và email + mật khẩu.**
- A. **Tự liên kết khi cả hai email đã xác minh**; nếu bản mật khẩu chưa xác minh thì vô hiệu mật khẩu chưa xác minh và tạo identity Google (chống chiếm trước tài khoản).
- B. Không bao giờ tự liên kết: báo "email đã dùng, hãy đăng nhập bằng cách đã dùng".
- C. Liên kết thủ công trong cài đặt sau khi đăng nhập.
- **Đề xuất: A.** Người dùng không bị chia hai tài khoản; điều kiện xác minh chặn rủi ro chiếm tài khoản. Cơ chế chống chiếm trước là suy luận, chưa đọc nguồn riêng, sẽ vào Defense Analysis. Ảnh hưởng: 01.

**K9. Độ dài mật khẩu tối thiểu.** App không có MFA, mật khẩu là yếu tố duy nhất.
- A. 8 ký tự.
- B. 12 ký tự.
- C. **15 ký tự**, cho phép mọi ký tự và passphrase, không bắt quy tắc thành phần.
- **Đề xuất: C**, theo NIST SP 800-63B-4 (đã đọc 02/10: tối thiểu 15 khi mật khẩu là yếu tố duy nhất); đánh đổi là ma sát khi đăng ký. NIST áp cho hệ thống liên bang Mỹ, app không bắt buộc theo nên B cũng hợp lý. Ảnh hưởng: 01.

### Vocabulary Content và Content Pipeline

**K10. Mỗi entry có bao nhiêu nghĩa trong gói pilot, và điều kiện publish.** CEFR-J/Octanove chỉ có từ + loại từ + level, không có nghĩa.
- A. **Một nghĩa chính cho mỗi (từ, loại từ)** ở gói pilot; schema vẫn cho nhiều nghĩa. Điều kiện publish: có `gloss` tiếng Việt, ít nhất một ví dụ tiếng Anh, level, ít nhất một chủ đề; `definition` tiếng Anh tùy chọn.
- B. Soạn mọi nghĩa phổ biến cho từng từ. Phủ nội dung tốt hơn, khối lượng duyệt tăng nhiều lần.
- **Đề xuất: A.** Bạn là người duyệt duy nhất, 300–500 từ. Hệ quả: bài đa nghĩa như `bank` chưa đủ nghĩa ở pilot. Ảnh hưởng: 02, 04, 07.

**K11. Xác định từ chức năng (`in`, `at`…).** Đã chốt: giữ trong DB, ẩn khỏi bộ học mặc định.
- A. **Suy ra từ loại từ khi import** (giới từ, liên từ, mạo từ/determiner, đại từ, trợ động từ…) thành một cờ phân loại, cho phép owner ghi đè từng từ.
- B. Cờ gán thủ công từng từ.
- **Đề xuất: A.** CEFR-J đã có loại từ nên đỡ tay; danh sách loại từ nào tính là từ chức năng sẽ chốt trong spec Content. Ảnh hưởng: 02, 04.

**K12. Nguồn từ điển ngoài (phần "hybrid" bạn đã chọn).**
- A. **V1 chỉ có catalog trong DB; nguồn ngoài chỉ là cổng (port) khai báo, chưa triển khai.** Nội dung do AI soạn nháp và bạn duyệt, không sao chép văn bản từ điển bên thứ ba.
- B. Triển khai một provider tra cứu ngoài ngay trong V1.
- **Đề xuất: A.** Chưa chọn provider và chưa kiểm tra quyền lưu/dùng với AI; vẫn giữ đúng hướng hybrid vì có chỗ cắm vào. Ảnh hưởng: 02, 04.

### Learning

**K13. Phạm vi của trạng thái ba mức.**
- A. **Một trạng thái cho mỗi (người dùng, sense)**, dùng chung cho mọi nhóm chứa từ đó.
- B. Trạng thái riêng cho từng nhóm.
- **Đề xuất: A**, khớp bản nháp schema; một từ nằm trong hai nhóm vẫn là một mức bạn tự đánh giá. Ảnh hưởng: 03, 07.

**K14. Có ghi nhật ký từng lần đổi trạng thái (append-only) ở V1 không.**
- A. **Có:** mỗi lần đổi ghi một dòng (người dùng, sense, thời điểm, giá trị cũ → mới). Pilot cần dữ liệu để đo vòng học; thêm SRS sau này không phải thu thập lại; không đổi trải nghiệm.
- B. Chỉ lưu trạng thái hiện tại.
- **Đề xuất: A.** Khó bù dữ liệu sau; cái giá là một bảng nữa và phải xóa theo tài khoản. Ảnh hưởng: 03, 00 (xóa tài khoản).

### Practice, AI, Entitlements

**K15. "Tự luận" không dùng AI nghĩa là gì và chấm thế nào.** Đây là chỗ mơ hồ nhất còn lại trong phạm vi bài không AI.
- A. **Gõ từ theo định nghĩa/nghĩa:** hiện nghĩa tiếng Việt (và định nghĩa tiếng Anh nếu có), người học gõ từ tiếng Anh; chấm bằng rule: so khớp sau chuẩn hóa với danh sách dạng được chấp nhận (từ gốc, biến thể chia từ đã duyệt).
- B. Gõ định nghĩa/nghĩa theo từ cho trước; cần chấm ngữ nghĩa nên **phải dùng AI**, trái với "không dùng AI".
- C. Bỏ "tự luận" khỏi V1, chỉ giữ trắc nghiệm và đúng/sai.
- **Đề xuất: A.** Duy nhất là phương án vừa không AI vừa chấm được chính xác. Hệ quả: bài này tương tự điền từ nhưng không có câu; danh sách dạng chấp nhận phải có trong nội dung. Ảnh hưởng: 07, 02.

**K16. Kiểm tra câu do AI sinh trước khi cho người học thấy.** Rubric yêu cầu có đáp án và biến thể hợp lệ trước khi hiển thị.
- A. **Chỉ kiểm bằng rule:** ô trống đúng một lần, đáp án khớp một dạng của từ mục tiêu, đủ trường, schema hợp lệ; có nút "báo câu lỗi" để bạn rà.
- B. Rule + gọi AI lần hai để kiểm lại câu. Chính xác hơn, tăng chi phí và độ trễ gấp đôi.
- **Đề xuất: A**, rồi đo tỉ lệ báo lỗi trong pilot để quyết định có cần B. Rủi ro chưa kiểm chứng: câu nhiều đáp án hợp lý lọt qua rule. Ảnh hưởng: 07, 06.

**K17. Câu hỏi AI sinh theo từng người hay dùng chung một ngân hàng; "đơn vị hạn mức" là gì.**
- A. **Sinh theo yêu cầu cho từng người dùng;** một lượt hạn mức = một câu sinh thành công. Câu vẫn lưu snapshot nên sau này có thể dùng chung.
- B. Sinh trước cho từng sense, lưu ngân hàng, mọi người dùng chung; hạn mức đếm theo phiên luyện. Rẻ hơn và duyệt trước được, nhưng ít đa dạng và cần thêm pipeline sinh/duyệt câu.
- **Đề xuất: A.** Khớp mô hình "Free không AI, trial/Pro có hạn mức", đơn giản nhất; B là tối ưu chi phí khi có số đo. Chi phí AI pilot đang ước dưới $1–15/tháng (giả định chưa đo). Ảnh hưởng: 05, 06, 07.

**K18. Cấu trúc hạn mức (số lượt bạn tính sau).**
- A. **Cấu hình theo (gói, feature) gồm giới hạn và cửa sổ**, cửa sổ chọn được: theo ngày (múi giờ Asia/Ho_Chi_Minh), theo tháng, hoặc tổng trong thời hạn cấp (ví dụ cả trial 14 ngày). Hết hạn mức thì chặn cứng, không cho vượt.
- B. Chỉ hỗ trợ theo ngày.
- **Đề xuất: A.** Số cụ thể là bạn quyết sau, spec chỉ giữ cấu trúc; giá trị mẫu trong spec ghi `ASSUMPTION`. Ảnh hưởng: 05.

## 3. Mặc định mình sẽ dùng nếu bạn không đổi

Đây là các chi tiết dẫn xuất từ quyết định đã chốt hoặc từ research, không cần bạn xét từng cái.
Nói tên mục nếu muốn đổi. Các con số được đánh dấu `ASSUMPTION` trong spec.

| # | Mặc định | Module |
| --- | --- | --- |
| F1 | Spec viết bằng tiếng Việt, giữ nguyên thuật ngữ kỹ thuật tiếng Anh | tất cả |
| F2 | API có tiền tố `/v1`; trong v1 chỉ thêm, không đổi nghĩa field; client bỏ qua field/enum lạ | 00 |
| F3 | ID là UUID mờ (không lộ thứ tự); thời gian UTC ISO 8601; ID sense không tái sử dụng | 00 |
| F4 | Log không chứa mật khẩu, OTP, token hay câu trả lời thô; có `operation_id` để lần theo | 00 |
| F5 | V1 chỉ online, chưa có đồng bộ offline | 00, 03 |
| F6 | OTP: 6 chữ số, hiệu lực 10 phút, dùng một lần, tối đa 5 lần thử, gửi lại sau 60 giây, tối đa 5 lần gửi mỗi giờ mỗi email, lưu dạng hash, phản hồi giống nhau dù email có tồn tại hay không (nguyên tắc: OWASP đã đọc; con số: `ASSUMPTION`) | 01 |
| F7 | Chống dò mật khẩu: sau 10 lần sai liên tiếp phải chờ 15 phút theo tài khoản, cộng giới hạn theo IP; thông báo lỗi chung chung (`ASSUMPTION` số) | 01 |
| F8 | Đặt lại mật khẩu thu hồi mọi phiên; đổi mật khẩu thu hồi các phiên khác, giữ phiên hiện tại | 01 |
| F9 | Logout chỉ thu hồi phiên của thiết bị đang gọi; V1 chưa có màn danh sách thiết bị | 01 |
| F10 | V1 không hỗ trợ đổi email; email chuẩn hóa chữ thường; khóa danh tính Google là `sub` | 01 |
| F11 | Sign in with Apple ghi thành ràng buộc trước khi phát hành iOS (Apple 4.8), không build ở lát 1 | 01 |
| F12 | Gửi thư qua cổng `Mailer`; local dùng SMTP giả (Mailpit); production dùng SMTP Google, đổi được | 01 |
| F13 | Chủ đề khởi đầu: technology, marketing, business, food, daily life; owner quản lý danh sách; một sense có nhiều chủ đề | 02 |
| F14 | Sửa lỗi chính tả giữ nguyên ID sense; đổi bản chất nghĩa tạo sense mới, sense cũ retired, tiến độ cũ giữ và đánh dấu "nghĩa đã đổi", không tự chuyển tiến độ | 02, 03 |
| F15 | Từ tùy chỉnh: bắt buộc có nghĩa; loại từ và level tùy chọn (level ghi nguồn `user`); trùng từ catalog thì gợi ý dùng bản catalog nhưng vẫn cho tạo riêng; tối đa 1.000 từ tùy chỉnh mỗi người (`ASSUMPTION`); nội dung riêng không bao giờ tự vào catalog | 02 |
| F16 | Tìm kiếm không phân biệt hoa thường, khớp tiền tố và chứa; không stemming/fuzzy ở V1; từ chức năng vẫn tìm được và thêm tay vào nhóm được, chỉ ẩn khỏi duyệt và bộ học mặc định | 02 |
| F17 | Màn hình "Nguồn dữ liệu & giấy phép" là điều kiện trước khi public (không cần khi chạy local); dòng Octanove không sửa trực tiếp, level biên tập là bản ghi riêng | 02 |
| F18 | Từ mới thêm có trạng thái "chưa học"; nhóm là danh sách phẳng, tên duy nhất theo người dùng, một từ nằm được nhiều nhóm; xóa nhóm không xóa trạng thái từ | 03 |
| F19 | Hai thiết bị đổi cùng trạng thái: ghi đè theo thời điểm server (last-write-wins); đổi tên nhóm và thành viên dùng kiểm tra version | 03 |
| F20 | Phiên flashcard: chọn nhóm và lọc theo trạng thái (mặc định "chưa học" + "cần ôn tập"), thứ tự ngẫu nhiên, mỗi lần đánh dấu ghi ngay | 03 |
| F21 | Kết quả bài Practice không tự đổi trạng thái thẻ (đã chốt 02/10) | 03, 07 |
| F22 | Vòng đời nội dung: draft → reviewed → published, thêm rejected và retired; chỉ published hiện cho người học | 04, 02 |
| F23 | Khóa job = (nguồn, ID mục nguồn, revision nội dung/phiên bản prompt), ràng buộc duy nhất trong DB; ghi bằng upsert; job chạy lại không tạo trùng | 04 |
| F24 | Retry tối đa 3 lần, backoff mũ có jitter; giới hạn lượt gọi theo hạn mức provider; job hết lần thử vào danh sách lỗi trong DB, xem và chạy lại bằng lệnh (`ASSUMPTION` số) | 04 |
| F25 | Import CEFR-J/Octanove idempotent, ghi nguồn + phiên bản + giấy phép; chạy lại không nhân đôi | 04, 02 |
| F26 | AI soạn nháp: nghĩa tiếng Việt, định nghĩa tiếng Anh, 1–3 ví dụ, gợi ý chủ đề; tất cả vào trạng thái draft | 04, 06 |
| F27 | Cổng `AiProvider` có adapter giả cho test; provider và model chọn bằng cấu hình, spec không chọn; đầu ra theo schema cố định, sai schema coi là lỗi tạm | 06 |
| F28 | Timeout mỗi lần gọi 20 giây; luồng người dùng retry tối đa 1 lần, pipeline tối đa 3 lần (`ASSUMPTION` số) | 06 |
| F29 | Chỉ gửi nội dung học (từ, loại từ, nghĩa, level) cho provider, không gửi email hay ID người dùng; từ tùy chỉnh khi gửi đi phải được nêu trong Privacy Policy | 06 |
| F30 | Mỗi lần gọi ghi: `operation_id`, loại, model, token, chi phí, độ trễ, trạng thái. Điều khoản provider về dùng dữ liệu để huấn luyện **chưa xác minh** vì chưa chọn provider | 06 |
| F31 | Quyền theo feature code (ví dụ `ai.practice`); nguồn cấp: trial tự kích hoạt, subscription (nối sau), `admin_grant` qua CLI; trong pilot Pro chỉ cấp tay | 05 |
| F32 | Quyền AI kiểm tra lúc **tạo** bài; chấm đáp án bằng rule nên **không cần** quyền AI, bài đã tạo vẫn nộp được sau khi trial hết | 05, 07 |
| F33 | Giữ chỗ hạn mức nguyên tử trước khi gọi provider; thành công mới trừ; provider lỗi hoặc timeout thì nhả; chi phí provider luôn ghi riêng | 05, 06 |
| F34 | Free: không AI; các tính năng khác không giới hạn theo gói, chỉ có giới hạn chống lạm dụng chung | 05 |
| F35 | Billing chỉ ghi giao diện: sự kiện nguồn cấp subscription và trạng thái chuẩn hóa; không thanh toán ở V1 | 05 |
| F36 | Câu hỏi lưu snapshot (nội dung, đáp án chấp nhận, version rubric); sửa catalog sau đó không đổi bài đang làm | 07 |
| F37 | Mỗi lần nộp mang `operation_id` (header `Idempotency-Key`); nộp lại trả đúng kết quả đã lưu; cùng ID nhưng nội dung khác bị từ chối | 07 |
| F38 | Chuẩn hóa so sánh: lowercase, trim, gộp khoảng trắng, đồng nhất dấu nháy; contraction chấp nhận theo danh sách đáp án đã duyệt cho từng câu; không chấp nhận TY/GTG; **không dung sai chính tả** (sai chính tả là sai) | 07 |
| F39 | Sau khi nộp mới hiện giải thích tiếng Việt và bản dịch nguyên câu (hiện trước sẽ lộ đáp án) | 07 |
| F40 | Trả lời sai thì hiện đáp án đúng, không thử lại cùng câu; có nút "báo câu lỗi" lưu cho bạn rà | 07 |
| F41 | Tạo bài AI lỗi hoặc quá thời gian: báo "chưa tạo được", không trừ lượt, không lưu bài hỏng; không bao giờ biến lỗi hệ thống thành "sai" | 07, 06 |
| F42 | Bài không AI: nguồn câu hỏi là từ trong nhóm của người học (có thể lọc trạng thái); 10 câu mỗi phiên (5–20); hướng định nghĩa/nghĩa → từ; đáp án nhiễu lấy từ catalog cùng loại từ và cùng band level, ngẫu nhiên, cần ít nhất 3 ứng viên, thiếu thì mở rộng band | 07 |
| F43 | Độ khó câu AI bám level của từ mục tiêu, không cao hơn | 07, 06 |
| F44 | Lưu lịch sử từng lượt làm bài (câu hỏi, đáp án, kết quả) để đo trong pilot; xóa theo tài khoản; người dùng chỉ truy cập câu hỏi và lượt của chính mình | 07, 00 |

## 4. Đã chốt trước đó, không hỏi lại

Schema D (entry → sense → text theo language); từ chức năng giữ trong DB và ẩn khỏi bộ học mặc định;
phrasal verb/collocation/idiom sau V1; AI V1 chỉ điền từ (kết quả đúng/sai kèm giải thích và bản dịch
nguyên câu), tự viết câu để sau; email + mật khẩu tự làm, Google OAuth 2.0, OTP qua SMTP chỉ cho xác
minh email và quên mật khẩu, SMTP qua Google; logout một thiết bị (nhiều thiết bị đăng nhập cùng lúc);
Free không AI, trial 14 ngày tự kích hoạt và Pro có AI, Pro cao hơn trial; BullMQ chỉ cho việc nền
(soạn và import nội dung), luồng người dùng gọi AI trực tiếp; chạy local trước, chưa thu tiền thật;
bạn tự duyệt nội dung. Chi tiết: [PROJECT_CONTEXT](../preparation/PROJECT_CONTEXT.md).

## 5. `ASSUMPTION` chắc chắn xuất hiện trong spec

Số lượt AI của trial và Pro; trial chỉ một lần mỗi tài khoản (đề xuất: có, và cần email đã xác minh);
hết trial thì về Free; thời hạn phiên (K6); các con số OTP, khóa đăng nhập, retry, timeout, giới hạn từ
tùy chỉnh (mục 3); thời hạn xử lý xóa dữ liệu theo luật và bản sao lưu; điều khoản dùng dữ liệu của
provider AI; điều kiện SMTP với Gmail cá nhân; phiên bản CEFR-J và nơi phát hành chính thức của
Octanove (xác minh trước khi import, không chặn spec).

## 6. Sau khi bạn chốt

1. Chạy `write-spec` với plan = file này đã chốt; ghi lại `decision.md` (kèm phần *Defence* cho từng
   quyết định) và `checkpoint-1.md`; dữ liệu chạy lưu ở `docs/tasks/v1-specs/`, spec ở `docs/specs/`.
2. Viết theo ba đợt như mục 1; cuối cùng báo cáo một lần kèm bảng kiểm kê nguồn trích. Không dừng giữa chừng.
3. Không commit: `english-learning` chưa có git repo và chưa nằm trong `projects/` của harness; việc
   `git init` là quyết định riêng của bạn. Khi bạn chuyển thư mục vào `projects/`, đường dẫn tương đối giữ nguyên.

## 7. Cập nhật 04/10/2026: câu trả lời của bạn

| # | Trạng thái | Nội dung |
| --- | --- | --- |
| K1 | **Chốt (đổi)** | Hybrid: nhập CSV hàng loạt **và** thêm một hoặc nhiều từ trong giao diện (trang admin của owner). Kéo theo: vai trò admin trong Identity, API admin trong Pipeline; giao diện làm sau bằng `build-ui`, không nằm trong spec. Chờ bạn xác nhận cách hiểu |
| K2 | Chốt | A, cả bộ 13 mục |
| K3 | Chốt | A, xóa ngay sau xác nhận |
| K4 | **Chốt (đổi)** | Giao diện có tiếng Việt và tiếng Anh, chọn theo locale của người dùng, mở rộng thêm ngôn ngữ bằng file dịch. Chờ bạn xác nhận cách hiểu; điều kiện publish nội dung vẫn đề xuất: bắt buộc nghĩa Việt, định nghĩa Anh tùy chọn |
| K5 | Mở | Bạn nghĩ đăng nhập luôn dùng JWT; đã giải thích, chờ chọn |
| K6 | Chốt | B (idle 90 ngày, absolute 365 ngày) |
| K7 | Chốt | B |
| K8 | Chốt | A |
| K9 | **Chốt (đổi)** | Tối thiểu 8 ký tự, bắt buộc có chữ hoa, chữ thường, số, ký tự đặc biệt. **Khác NIST** (NIST khuyến nghị 15 ký tự và không bắt quy tắc thành phần); đã ghi nhận là lựa chọn của bạn |
| K10 | Chốt | A, kèm nhãn ngữ cảnh ngắn tùy chọn cho mỗi sense |
| K11 | Mở | Đang giải thích thêm |
| K12 | Chốt | A |
| K13 | Chốt | A |
| K14 | Chốt | A |
| K15 | Chốt | A |
| K16 | Chốt | A |
| K17 | Mở | Bạn muốn hybrid; đã đề xuất cách làm, chờ xác nhận |
| K18 | Mở | Đã research ([RESEARCH_AI_QUOTA_MODELS_2026-10-04.md](RESEARCH_AI_QUOTA_MODELS_2026-10-04.md)); đề xuất đổi sang mô hình grant |

### Cập nhật lần 2 (04/10/2026)

| # | Trạng thái | Nội dung |
| --- | --- | --- |
| K1b | **Mới, mở** | Nguồn nghĩa và ví dụ cho catalog. **AI soạn nháp là đề xuất của trợ lý** (xuất hiện khi so phương án worker 02/10; bạn chọn phương án B nhưng chưa xác nhận riêng việc AI soạn). CEFR-J/Octanove không có nghĩa nên phải có một nguồn: (A) AI soạn nháp, bạn duyệt; (B) bạn tự viết toàn bộ, không AI; (C) nguồn ngoài (hoãn theo K12) |
| K4 | Chốt (chỉnh) | Khi thiết lập lần đầu hỏi người dùng **tiếng mẹ đẻ**; giá trị đó quyết định ngôn ngữ giao diện và ngôn ngữ giải thích mặc định, đổi được trong cài đặt; locale thiết bị chỉ để gợi ý sẵn. Ngôn ngữ chưa có bản dịch thì dùng tiếng Anh |
| K5 | Mở | Bạn hỏi có phải access token + refresh token: đúng, đó là phương án B; đã trả lời, chờ chọn |
| K9 | Chốt | OK như đã ghi |
| K11 | Chốt (chỉnh F16) | Từ chức năng **không nằm trong bộ học** (thêm hàng loạt, phiên học, nguồn câu hỏi) nhưng **vẫn hiện khi tìm kiếm và khi duyệt danh sách từ vựng** (có thể gắn nhãn). `number` và `interjection` chưa tính là từ chức năng (mặc định, chưa được hỏi lại) |
| K17 | Chốt một phần | Cách thức hybrid (ưu tiên ngân hàng, thiếu thì sinh, câu từ từ tùy chỉnh không vào ngân hàng, câu bị báo lỗi bị ẩn) **OK**. Đơn vị trừ lượt **mở**, phụ thuộc K18 |
| K18 | **Hoãn** | Bạn sẽ tự research rồi gửi report. Trong lúc chờ, spec Entitlements ghi cấu trúc là `ASSUMPTION`; mô hình grant và trần chi AI toàn hệ thống nằm ở mục research như đề xuất, chưa chốt |
