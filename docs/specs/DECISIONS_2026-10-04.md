# Quyết định cho spec V1 — bản ghi ngày 04/10/2026

File này ghi **các quyết định bạn đã đưa ra** trước khi viết spec, kèm phần nào là đề xuất của trợ lý mà bạn
chưa phản đối. Nó thay thế các mục trạng thái trong [SPEC_PLAN_AND_DECISIONS_2026-10-04.md](SPEC_PLAN_AND_DECISIONS_2026-10-04.md)
(file đó giữ lại như lịch sử thảo luận, kèm phương án và lý do). Bối cảnh sản phẩm:
[PROJECT_CONTEXT](../preparation/PROJECT_CONTEXT.md).

**Nhãn nguồn:**
- **Bạn chốt** = bạn nêu rõ trong chat.
- **Theo khuyến nghị** = bạn hỏi ý kiến, trợ lý khuyến nghị, bạn chưa xác nhận riêng. Đổi được bất cứ lúc nào trước khi viết spec.
- **Mặc nhiên** = trợ lý nêu cách hiểu, bạn không phản đối.
- **Hoãn** = bạn chủ động để lại; spec ghi `ASSUMPTION`.

## 1. Quyết định K1–K18

| # | Quyết định | Nguồn | Ghi chú |
| --- | --- | --- | --- |
| K1 | **Duyệt và nhập nội dung theo hướng hybrid:** nhập hàng loạt bằng CSV, và thêm một hoặc nhiều từ trong giao diện (trang admin của owner). Có vai trò admin | Bạn chốt (hybrid); phần "trang admin" là cách hiểu của trợ lý, **mặc nhiên** | Giao diện làm sau bằng `build-ui`, không nằm trong spec; spec chỉ mô tả hành vi |
| K1b | **Nguồn nghĩa và ví dụ: bạn tự soạn CSV (B); nguồn ngoài (C) chỉ ở mức cổng theo K12. V1 chưa tích hợp AI soạn nháp.** AI cho người dùng được ưu tiên; AI soạn nháp giữ lại làm hướng phát triển sau | Bạn chốt | Pipeline chừa chỗ để thêm nguồn "AI" sau này mà không đổi vòng đời draft → reviewed → published |
| K2 | Đưa cả bộ 13 mục "chuẩn bị rẻ" vào spec | Bạn chốt | `entry_type`; handler theo loại bài; cổng `AiProvider` + bản giả; deadline + retry hữu hạn có jitter; `operation_id`; quyền theo feature + sổ lượt dùng; bảng danh tính tách user; Argon2id; PKCE; khóa job lưu DB; lỗi Problem Details (RFC 9457); phân trang token; `Idempotency-Key` |
| K3 | Xóa tài khoản: **xóa ngay** sau khi xác nhận lại | Bạn chốt | Thời hạn xóa bản sao lưu: `ASSUMPTION` |
| K4 | **Hỏi người dùng tiếng mẹ đẻ** khi thiết lập lần đầu; giá trị đó là ngôn ngữ giao diện và ngôn ngữ giải thích mặc định, đổi được trong cài đặt. Ban đầu có tiếng Việt và tiếng Anh; thêm ngôn ngữ = thêm file dịch. Thiếu bản dịch thì dùng tiếng Anh | Bạn chốt | Locale thiết bị chỉ để gợi ý sẵn |
| K5 | **Phiên: access token (JWT, sống ngắn) + refresh token** cho cả web và mobile; refresh token lưu trong DB theo từng thiết bị, xoay vòng mỗi lần gia hạn; logout một thiết bị = thu hồi refresh token của thiết bị đó | **Theo khuyến nghị** | Bạn hỏi đâu là phổ biến và best practice; xem mục 3 |
| K6 | Hết hạn phiên: idle **90 ngày**, absolute **365 ngày** | Bạn chốt | Con số là `ASSUMPTION`; áp dụng cho refresh token |
| K7 | Xác minh email: dùng được tính năng Free khi chưa xác minh; **kích hoạt trial yêu cầu email đã xác minh**; Google tự coi là đã xác minh | Bạn chốt | |
| K8 | Cùng email ở Google và mật khẩu: **tự liên kết khi cả hai đã xác minh**; bản mật khẩu chưa xác minh thì vô hiệu và tạo identity Google | Bạn chốt | Cơ chế chống chiếm trước là suy luận, vào Defense Analysis |
| K9 | Mật khẩu: **tối thiểu 8 ký tự, bắt buộc chữ hoa, chữ thường, số, ký tự đặc biệt** | Bạn chốt | **Khác NIST SP 800-63B-4** (khuyến nghị 15 ký tự, không quy tắc thành phần); spec ghi rõ đây là lựa chọn của bạn |
| K10 | Mỗi (từ, loại từ) có **một nghĩa chính** ở pilot, schema vẫn cho nhiều nghĩa; mỗi sense có **nhãn ngữ cảnh ngắn tùy chọn**. Điều kiện publish: nghĩa tiếng Việt, ít nhất một ví dụ tiếng Anh, level, ít nhất một chủ đề; định nghĩa tiếng Anh tùy chọn | Bạn chốt | Bài đa nghĩa như `bank` chưa đủ nghĩa ở pilot |
| K11 | Từ chức năng: **tự suy từ loại từ khi import**, owner ghi đè được; **không nằm trong bộ học** (thêm hàng loạt, phiên học, nguồn câu hỏi) nhưng **vẫn hiện khi tìm kiếm và duyệt danh sách từ vựng** | Bạn chốt | Loại từ tính là từ chức năng: pronoun, preposition, determiner, conjunction, modal auxiliary, be-verb, do-verb, have-verb, infinitive-to (274 dòng trên 7.799 trong CEFR-J 1.5, đếm ngày 04/10/2026). `number` và `interjection` chưa tính (mặc định, chưa được hỏi lại) |
| K12 | ~~V1 chỉ khai báo cổng cho nguồn từ điển ngoài~~ **Được thay bởi K20** (chuỗi tra nghĩa, ngày 04/10 chiều) | Bạn chốt | Lịch sử: B → A → chuỗi B/C/A; xem mục 8 |
| K13 | Một trạng thái cho mỗi (người dùng, sense), dùng chung mọi nhóm | Bạn chốt | |
| K14 | Ghi nhật ký append-only mỗi lần đổi trạng thái | Bạn chốt | |
| K15 | "Tự luận" không AI = gõ từ tiếng Anh theo nghĩa/định nghĩa, chấm bằng rule | Bạn chốt | |
| K16 | Kiểm câu AI sinh chỉ bằng rule + nút "báo câu lỗi" | Bạn chốt | Đo tỉ lệ báo lỗi trong pilot để xét có cần kiểm bằng AI lần hai |
| K17 | Câu hỏi AI theo kiểu **hybrid**: lấy từ ngân hàng chung nếu có câu hợp lệ người này chưa gặp, thiếu thì sinh mới và câu đó vào ngân hàng; câu từ **từ tùy chỉnh** không bao giờ vào ngân hàng; câu bị báo lỗi bị ẩn ngay cho tới khi bạn rà | Bạn chốt (cách thức) | **Đơn vị trừ lượt: Hoãn**, phụ thuộc K18 |
| K18 | Cấu trúc hạn mức AI | **Hoãn**: bạn tự research rồi gửi report | Spec Entitlements ghi cấu trúc là `ASSUMPTION`. Tham khảo: [RESEARCH_AI_QUOTA_MODELS_2026-10-04.md](RESEARCH_AI_QUOTA_MODELS_2026-10-04.md) (mô hình grant và trần chi AI là đề xuất, chưa chốt) |

## 2. Hệ quả: phạm vi spec thay đổi thế nào

| Thay đổi | Từ quyết định | Ảnh hưởng |
| --- | --- | --- |
| Content Pipeline **không còn phụ thuộc AI Integration** ở V1. Nguồn bản nháp là `csv` và `external`; chừa chỗ cho `ai` sau | K1b | Lát 1 thật sự không AI; AI Integration chỉ phục vụ Practice |
| Việc nền của worker chỉ còn **import CSV** (hàng loạt, có kiểm tra và báo cáo lỗi từng dòng). Hướng dùng worker từ gói pilot đầu vẫn giữ | K1b, K12 | **Rủi ro:** import 300–500 dòng CSV nhỏ, nên lý do dùng BullMQ yếu đi nhiều (lý do ban đầu là AI soạn nháp hàng nghìn từ, nay đã bỏ). Nên xét lại ở bước Defense Analysis của Pipeline: giữ để học và sẵn cho nguồn ngoài/AI sau, hay import trực tiếp trong request |
| Identity có **vai trò admin**; Pipeline có **API admin** (thêm từ, nhập/xuất CSV, duyệt, publish) | K1 | Thêm bề mặt phân quyền vào Defense Analysis của Identity |
| Content có cổng **nguồn từ điển ngoài** chỉ khai báo, chưa có provider; khi triển khai sau, kết quả luôn là draft, ghi nguồn và giấy phép từng dòng, không tự publish | K12 | Spec ghi hợp đồng của cổng; không có tiêu chí nào phụ thuộc một provider cụ thể |
| Identity: phiên = access JWT + refresh token xoay vòng theo thiết bị; Defense Analysis cho xoay vòng và dùng lại refresh token | K5 | Logout có độ trễ tối đa bằng tuổi thọ access token |
| Onboarding hỏi tiếng mẹ đẻ; một thuộc tính điều khiển giao diện và ngôn ngữ giải thích mặc định | K4 | Nghĩa tiếng Anh và tiếng Việt là hai ngôn ngữ giải thích; chỉ nghĩa Việt bắt buộc để publish |
| Practice: câu hỏi AI có hai nguồn (ngân hàng, sinh mới) | K17 | Cần theo dõi câu người này đã gặp, ẩn câu bị báo lỗi, không đưa câu từ từ tùy chỉnh vào ngân hàng |

## 3. K5: phần khuyến nghị

Bạn hỏi phương án nào phổ biến và là best practice. Không có một phương án thắng tuyệt đối; điều đã đọc:
- Hướng dẫn xác thực chính thức của NestJS (đọc ngày 04/10/2026 qua công cụ tóm tắt trang, chưa đọc nguyên văn) dùng **session phía server với cookie `HttpOnly` cho web** và **JWT access token ngắn hạn + refresh token xoay vòng cho mobile**; access token sống 15 phút vì token đã phát ra vẫn hợp lệ cho tới khi hết hạn.
- RFC 9700 §2.2.2 (đã đọc): refresh token của client công khai **phải** bị ràng buộc theo người gửi hoặc dùng xoay vòng. Chi tiết phát hiện dùng lại ở §4.14.2 sau đó được agent kiểm chứng đọc: dùng lại token cũ thì thu hồi, không có khoảng ân hạn (R22).

Khuyến nghị của trợ lý (suy luận, không có số liệu về mức độ phổ biến): chọn access + refresh cho cả hai client vì mobile là client hạng nhất, cookie không tự nhiên với app Flutter, bạn đã quen mô hình này, và một cơ chế cho cả hai client ít code hơn hai cơ chế. Phiên opaque đơn giản hơn nhưng bạn chưa quen; trợ lý đã nghiêng về nó trước đó và đổi ý vì các lý do trên.

## 4. K12 và K1b: việc còn thiếu để làm thật (K12 đã được thay bởi K20, mục 8)

- **Bạn sẽ chốt lại sau.** Khi quay lại cần quyết hai việc: chọn provider (bảng so sánh sơ bộ ở [01/10](../preparation/VOCABULARY_DATA_RESEARCH_2026-10-01.md) có Wiktextract/Kaikki, Free Dictionary API, Cambridge, Oxford, Merriam-Webster; chưa đo độ phủ, quyền lưu/cache/dùng với AI chưa xác nhận) và nguồn ngoài dùng cho ai (chỉ owner làm giàu bản nháp, hay cả người học tra từ chưa có trong catalog).
- Trong lúc đó, nguồn nghĩa và ví dụ duy nhất ở V1 là CSV và trang admin do bạn soạn.

## 5. Mặc định F1–F44 vẫn hiệu lực, trừ các điều chỉnh sau

Các mặc định nằm ở [mục 3 của file kế hoạch](SPEC_PLAN_AND_DECISIONS_2026-10-04.md#3-mặc-định-mình-sẽ-dùng-nếu-bạn-không-đổi).

| Mặc định | Điều chỉnh |
| --- | --- |
| F16 | Từ chức năng **vẫn hiện** khi tìm kiếm và duyệt; chỉ bị loại khỏi bộ học (K11) |
| F24 | Retry áp dụng cho job **import CSV**; giới hạn lượt gọi nguồn ngoài và AI soạn nháp chưa cần ở V1 |
| F21 | Kết quả bài làm **không đổi trạng thái** ba mức nhưng **có tác động vào lịch ôn** (K22) |
| F26 | **Bỏ ở V1** (AI soạn nháp, K1b); chừa chỗ cắm cho sau |
| F28 | Timeout và retry của AI chỉ áp dụng cho luồng người dùng |
| F31 | Nguồn cấp `admin_grant` giữ nguyên cho tới khi K18 chốt; nếu chọn mô hình grant thì gộp vào đó |
| F39 | Sau khi nộp mới hiện kết quả đúng/sai kèm **bản dịch nguyên câu sang tiếng mẹ đẻ của người học** và **định nghĩa tiếng Anh của từ**. **Không còn lời giải thích tự do của AI** (bạn làm rõ 04/10) |
| F43 | **Giữ nguyên bản gốc:** độ khó câu AI bám level của từ mục tiêu, không cao hơn (hàng này từng bị ghi đè nhầm bằng định nghĩa đầu ra; phục hồi sau kiểm chứng) |
| F43b | Đầu ra của AI khi sinh bài chỉ gồm: câu có chỗ trống, danh sách đáp án chấp nhận, bản dịch nguyên câu (bạn làm rõ 04/10) |

**Mặc định mới:**

| # | Mặc định |
| --- | --- |
| N1 | Vai trò admin gán cho tài khoản owner bằng cấu hình hoặc lệnh khởi tạo; không có màn quản lý admin ở V1 (`ASSUMPTION`) |
| N2 | Access token sống 15 phút (`ASSUMPTION`); refresh token là chuỗi ngẫu nhiên lưu dạng hash trong DB, mỗi thiết bị một dòng; dùng lại refresh token đã xoay vòng thì thu hồi cả chuỗi của thiết bị đó (theo hướng dẫn NestJS và RFC 9700 §4.14.2, đã được agent kiểm chứng đọc: không có khoảng ân hạn; khoảng ân hạn 10 giây trong spec Identity là lựa chọn riêng của spec, `ASSUMPTION`) |
| N3 | Khi nguồn ngoài được triển khai (sau V1), bản nháp từ đó luôn là draft, không tự publish; mỗi dòng ghi nguồn và giấy phép |
| N4 | Câu hỏi AI vào ngân hàng chỉ khi từ nằm trong catalog (không phải từ tùy chỉnh) và đã qua kiểm rule; câu bị báo lỗi bị ẩn ngay |
| N5 | Phần phụ thuộc ngôn ngữ của một câu chỉ là **bản dịch**. Câu, chỗ trống và đáp án chấp nhận dùng chung mọi ngôn ngữ; bản dịch lưu riêng theo ngôn ngữ. V1 chỉ cần tiếng Việt (người học có tiếng mẹ đẻ là tiếng Anh thì không cần bản dịch). Thiếu bản dịch ngôn ngữ của người dùng thì xử lý theo K17/K18 (`ASSUMPTION`: sinh bản dịch bổ sung có tính một lượt hay không chưa chốt) |
| N6 | Định nghĩa tiếng Anh hiển thị lấy từ nội dung catalog đã duyệt (`definition`), **không để AI viết**; từ nào chưa có định nghĩa thì hiển thị nghĩa (`gloss`) bằng ngôn ngữ của người học. Đề xuất, bạn chưa xác nhận: nếu muốn luôn có định nghĩa tiếng Anh thì phải bắt buộc `definition` khi publish (đổi K10) |

## 6. Còn mở và `ASSUMPTION` khi viết spec

| Mục | Trạng thái |
| --- | --- |
| K18 và đơn vị trừ lượt của K17 | Hoãn; bạn gửi report. Ảnh hưởng spec Entitlements và Practice (đợt 3) |
| Số lượt AI của trial và Pro; trial một lần mỗi tài khoản; hết trial về Free | `ASSUMPTION` (bạn để tính sau) |
| Provider tra cứu ngoài và điều khoản lưu dữ liệu | **Điều kiện chặn khi build** (K20); chưa chọn |
| Các con số: OTP, khóa đăng nhập, retry, timeout, giới hạn từ tùy chỉnh, TTL access token, idle/absolute | `ASSUMPTION` (xem file kế hoạch mục 3) |
| Thời hạn xóa dữ liệu theo luật và bản sao lưu; điều khoản dữ liệu của provider AI; Gmail cá nhân làm SMTP | Chưa xác minh |
| Phiên bản CEFR-J và nơi phát hành chính thức của Octanove | Xác minh trước khi import; không chặn spec |

## 7. Bước tiếp theo

Chạy `write-spec` theo ba đợt: (1) system spec + Vocabulary Content, dừng cho bạn xem; (2) Identity, Learning, Content Pipeline;
(3) Entitlements, AI Integration, Practice. Spec ở `docs/specs/`, dữ liệu chạy ở `docs/tasks/v1-specs/`. Không commit vì
`english-learning` chưa có git repo.

## 8. Mở rộng V1 (04/10/2026, chiều): giữ chân và gom từ thật

Bạn chọn đưa ba thứ vào V1: gom từ thật của người học, lịch ôn tự động, dồn bài vào chỗ yếu. Lý do và bằng chứng: xem lượt thảo luận cùng ngày (khảo sát 8/12 khó duy trì học đều; phản hồi định tính "tra nhanh → lưu → ôn lúc rảnh"). Các quyết định bên dưới **bổ sung** K1–K18; chỗ nào mâu thuẫn thì mục này thắng.

| # | Quyết định | Nguồn | Ghi chú |
| --- | --- | --- | --- |
| K19 | **Thêm nhanh từ gặp phải**: người học nhập từ, kèm câu chứa từ (tùy chọn); lưu vào nhóm mặc định "Mới thêm" và vào lịch ôn. Làm trên **web** trước; chia sẻ văn bản từ app khác trên mobile để sau | Bạn chốt | Gặp dạng chia (`deployed` so với `deploy`) là chỗ khó chưa có giải pháp đã kiểm chứng |
| K20 | **Chuỗi tra nghĩa cho người học, thay K12:** làm theo thứ tự ưu tiên **nguồn từ điển ngoài (B) trước; không được thì AI tra nghĩa (C); không được nữa thì chỉ catalog + tự nhập (A)**. Catalog luôn được tra trước. "Không được" xét **lúc xây** (provider có phù hợp về giấy phép, độ phủ, chi phí không), và spec định nghĩa chuỗi để một bước vắng mặt thì chuyển bước sau | Bạn chốt; cách hiểu "xét lúc xây và chạy theo chuỗi" là của trợ lý, **mặc nhiên** | **Việc chọn provider thành điều kiện chặn khi build.** Bước AI chỉ cho người có quyền AI (trial/Pro), Free rơi xuống tự nhập (`ASSUMPTION`); bước AI tính vào hạn mức theo K18 (hoãn) |
| K21 | **Lịch ôn tự động bằng hộp ôn đơn giản (A)**; FSRS (B) xét sau khi pilot có số liệu | Bạn chốt | Nhật ký đổi trạng thái (K14) giữ lại để chuyển được |
| K22 | **Kết quả bài làm tác động vào lịch ôn** (làm sai thì ôn sớm hơn); trạng thái ba mức vẫn không tự đổi (F21 giữ nguyên) | Bạn chốt ("khả năng cao là có"), nên coi là chốt, nhắc lại nếu đổi ý | Tách **trạng thái** (người học tự gán) khỏi **lịch ôn** (hệ thống tính) |
| K23 | **Biến câu người học gặp thành bài điền từ không AI**: che từ đó trong câu của họ, chấm bằng rule | Bạn chốt | Dùng được cho cả Free; câu chỉ lưu riêng tư và không bao giờ vào ngân hàng chung (N4) |
| K24 | **Dồn bài vào chỗ yếu**: chọn từ cho phiên luyện theo thứ tự yếu và đến hạn, rồi đến hạn, rồi từ mới; người học xem được danh sách "từ hay sai" | Bạn chốt | Chỉ tính kết quả chấm bằng rule; loại câu đã bị báo lỗi |
| K25 | **Không làm nhắc học** (email/push) ở V1 | Bạn chốt | Pilot đo việc **tự quay lại**; không có nhắc nên lịch ôn chỉ có tác dụng khi họ tự mở app |

### Hệ quả cho phạm vi spec

| Module | Thêm vào spec |
| --- | --- |
| Learning | Lịch ôn (hộp ôn), danh sách "hôm nay cần ôn", nhóm mặc định "Mới thêm", trần số từ ôn mỗi ngày, cập nhật lịch từ kết quả flashcard và bài làm |
| Vocabulary Content | Thêm nhanh, chuỗi tra nghĩa (catalog → nguồn ngoài → AI → tự nhập), khớp theo dạng chia, câu ngữ cảnh riêng của người học |
| Practice | Chọn từ theo mức yếu và đến hạn; bài điền từ từ câu của người học (rule, không AI); không thêm câu của người học vào ngân hàng |
| AI Integration | Thêm một việc thứ hai ngoài sinh bài: **tra nghĩa** (bước C của chuỗi) |
| Entitlements | Bước AI tra nghĩa là một feature có quyền riêng (`ASSUMPTION`) và có thể tính hạn mức (K18 hoãn) |
| Content Pipeline | Nguồn ngoài (nếu chọn) dùng cho cả owner làm giàu bản nháp lẫn người học tra nghĩa; cổng dùng chung |
| Identity | Không đổi |

**Phụ thuộc đổi:** Vocabulary Content giờ phụ thuộc cổng nguồn ngoài và (tùy chọn) AI Integration, nên lát 1 không còn hoàn toàn "không AI" nếu bước C được dùng. Thứ tự viết đề xuất: giữ như cũ, nhưng spec Learning (có lịch ôn) và Content (có chuỗi tra nghĩa) trở thành hai spec lớn nhất; hai thứ này là lõi giữ chân nên nên cho pilot **sớm** (lát 1) trước khi có AI.

### Mặc định mới

| # | Mặc định | Nhãn |
| --- | --- | --- |
| N7 | Lịch ôn có các mức khoảng cách 1, 3, 7, 14, 30 ngày; từ mới đến hạn ngay | `ASSUMPTION` (hộp ôn là kiến thức chung của trợ lý, chưa tra nguồn) |
| N8 | Quy tắc cập nhật: người học chọn "đã biết" hoặc bài làm đúng thì lên một mức; chọn "chưa học" hoặc "cần ôn tập" hoặc bài làm sai thì về mức đầu. Dùng chính ba trạng thái, không thêm nút đánh giá | `ASSUMPTION`; trộn tự đánh giá với kết quả nhớ, xem lại sau pilot |
| N9 | Trần mỗi ngày: tối đa 50 từ ôn và 10 từ mới (`ASSUMPTION`); nghỉ nhiều ngày thì dồn lại và chia dần, không bắt ôn một lúc | `ASSUMPTION` |
| N10 | "Từ yếu" = sai từ 2 lần trở lên trong 5 lần làm gần nhất; câu đã bị báo lỗi không được tính; lỗi chính tả không được tách riêng ở V1 | `ASSUMPTION` |
| N11 | Câu của người học tối đa 300 ký tự, chỉ lưu riêng tư của họ, bị xóa khi xóa tài khoản | `ASSUMPTION` |
| N12 | Khớp từ người học nhập với catalog: so khớp theo dạng gốc và các dạng đã biết; chưa có quy tắc đưa dạng chia về dạng gốc, nên spec ghi hành vi mong muốn và phần chưa giải quyết | Mở |
| N13 | Chuỗi tra nghĩa: kết quả từ nguồn ngoài hoặc AI luôn là **gợi ý để người học xác nhận**, lưu thành từ riêng tư của họ, không vào catalog; ghi nguồn từng dòng | Đề xuất |

### Điều kiện chặn và rủi ro mới

- **Chọn provider tra cứu ngoài là việc phải làm trước khi build** (K20). Bảng so sánh sơ bộ 01/10 có Wiktextract/Kaikki (CC BY-SA), Free Dictionary API, Cambridge, Oxford, Merriam-Webster. Rủi ro chính: điều khoản **lưu nội dung của provider vào từ riêng tư của từng người dùng**, vì ví dụ Merriam-Webster chỉ miễn phí cho phi thương mại. Nếu không qua được, chuyển sang AI (C), rồi sang tự nhập (A).
- **Phạm vi V1 lớn hơn đáng kể** trong khi làm một mình. Học được gì từ pilot sớm hơn phụ thuộc việc lát 1 (thêm nhanh + lịch ôn, không AI) xong trước.
- **Đo trong pilot:** từ thêm mỗi người mỗi tuần; tỉ lệ từ đến hạn được ôn trong 48 giờ; quay lại sau 7 và 14 ngày; tỉ lệ đúng ở lần làm thứ hai của từ yếu.

## 9. Chỗ spec lệch hoặc tinh chỉnh quyết định của bạn (cần bạn xác nhận)

Khi viết đợt 2 và 3, mình gặp những chỗ phải chọn mà quyết định gốc chưa nói rõ hoặc nói hai điều mâu thuẫn. Ghi lại để bạn duyệt; lý do và phương án ở `docs/tasks/v1-specs/decision.md`.

| # | Chỗ | Spec chọn gì | Quyết định gốc | Ở đâu |
| --- | --- | --- | --- | --- |
| D12 | Xác nhận xóa tài khoản | Mật khẩu, hoặc đăng nhập Google mới nếu chỉ có Google; **không** dùng OTP | K3 ghi "mật khẩu hoặc OTP" nhưng OTP chỉ dành cho xác minh email và quên mật khẩu | Identity IR18 |
| D20 | Trả lời đúng ở trắc nghiệm hoặc đúng/sai | Không đẩy lịch ôn lên (đoán may); sai thì vẫn về mức đầu | K22 chỉ nói "kết quả bài làm tác động vào lịch ôn" | Practice PRC17 |
| D22 | Kiểm rule câu AI | Cần "dạng hợp lệ" của từ: dạng chấp nhận + quy tắc chia cố định + danh sách bất quy tắc owner duy trì | K16 kiểm chỉ bằng rule; chưa có nguồn dữ liệu dạng chia | Practice PRC6, PRC7 |
| D14 | Google trùng email với tài khoản mật khẩu chưa xác minh | Xóa mật khẩu và phiên, **giữ dữ liệu**, gắn Google | K8 ghi "vô hiệu và tạo identity Google" | Identity IR9 |
| D13 | Phiên | Access JWT 15 phút + refresh xoay vòng, ân hạn 10 giây cho request gia hạn song song | K5 theo khuyến nghị, bạn chưa xác nhận riêng | Identity IR10–IR13 |
| D21 | Hạn mức | Hành vi chung cho mọi cấu trúc; đơn vị và trần chi AI là `ASSUMPTION` | K18 hoãn | Entitlements ER5–ER14 |
| D18 | Worker BullMQ | Giữ theo quyết định cũ, ghi điều kiện xét lại | Lý do ban đầu (AI soạn nháp) đã bỏ ở K1b | Pipeline, mục thay thế |
| F02 (CR10) | Từ chức năng người học tự thêm tay vào nhóm | Được học và luyện bình thường; chỉ việc **chọn tự động** (thêm hàng loạt, nguồn câu hỏi theo level hoặc chủ đề) loại chúng | K11 nói "không nằm trong bộ học" và "thêm tay vào nhóm được" nhưng không nói thêm tay rồi có học không | Content CR10, Learning LR3, Practice PRC20 |
| F16 (IR2) | Đăng ký email đã có tài khoản | Trả lỗi "email đã được dùng" (không che được vì K7 cho dùng Free ngay khi chưa xác minh); quên mật khẩu, gửi lại OTP và đăng nhập vẫn không tiết lộ | K7 chọn dùng Free khi chưa xác minh | Identity IR2 |
| F43 (CR15) | Catalog đã có từ nhưng sai nghĩa | Người học chọn "không phải nghĩa này" để đi tiếp chuỗi tra nghĩa | K20 nói tra catalog trước; K10 chỉ một nghĩa chính ở pilot | Content CR15 |
| F44 (CR17) | Sửa sense đã publish | Mọi sửa đi qua revision bản nháp rồi publish (có "publish nhanh"), không hiện ngay | F14 phân biệt sửa nhỏ và thay nghĩa nhưng không nói sửa nhỏ có hiện ngay không | Content CR17, Pipeline PR8 |
| F42 (CR7) | Người có tiếng mẹ đẻ khác Việt và Anh | Thiếu bản dịch thì hiện định nghĩa tiếng Anh, rồi nghĩa tiếng Việt kèm nhãn "chưa có bản dịch" | K4 ghi "thiếu bản dịch thì dùng tiếng Anh" | Content CR7 |
| F45 | Độ khó câu AI | Giữ nguyên F43 gốc (bám level, không cao hơn); đầu ra AI là F43b | Hàng F43 ở mục 5 từng ghi đè nhầm bản gốc | AI Integration AR2 |
| F54 | Mở rộng nhỏ | Chọn tiếng mẹ đẻ là bước bắt buộc trước khi dùng nội dung (IR16); nhóm mặc định "Mới thêm" chưa dịch; `admin_grant` qua API admin thay vì CLI (ER10); chọn nhóm ngay lúc thêm nhanh (LR9) | K4, F31, K19 | Identity, Learning, Entitlements |
| F58 | Google trùng email với tài khoản mật khẩu chưa xác minh | Nguồn (hướng dẫn NestJS) chọn từ chối; spec giữ K8 (gắn Google, xóa mật khẩu); bạn có thể chọn hướng từ chối | K8 | decision D14 |
| F19 | Nhãn của N# và F# | Các spec ghi rõ N7–N11 là `ASSUMPTION`, N12 Mở, N13 Đề xuất; lịch ôn và mức yếu là `ASSUMPTION` theo chính ghi nhận của bạn | — | Chân trang mọi spec |

**Đã chốt ngày 05/10/2026 ("chốt hết theo đề xuất"):** nhóm A giữ nguyên như spec (từ chức năng thêm tay được học; đăng ký lộ email đã tồn tại; ân hạn 10 giây khi gia hạn token; K8 gắn Google và xóa mật khẩu; trắc nghiệm và đúng/sai đúng không đẩy lịch lên). Nhóm B giữ mặc định (mọi sửa sense đã publish qua revision và có "publish nhanh"; nút "không phải nghĩa này"; xác nhận xóa tài khoản không dùng OTP; thứ tự hiển thị khi thiếu bản dịch). Trần thời gian tạo câu AI **hạ từ 60 xuống 45 giây** (Practice PRC5 và Q34, AI Integration AR3 truyền deadline còn lại), vì nginx và Application Load Balancer có timeout mặc định 60 giây (R48).
