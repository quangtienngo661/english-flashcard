# Decisions — v1-specs (đợt 1–3)

> Lý do từng lựa chọn, ghi tại lúc quyết định. Quyết định K#, N#, F# gốc do chủ dự án đưa ra hoặc duyệt, toàn văn ở
> `docs/specs/DECISIONS_2026-10-04.md`. Ở đây chỉ ghi phần liên quan đợt 1 và các lựa chọn riêng của spec.
> D12–D22 là các quyết định của đợt 2 và 3 (Identity, Learning, Pipeline, Entitlements, AI, Practice). **Không có hệ thống tham chiếu**, nên dòng "Diverges from the reference system" luôn là "no reference".

**Date:** 2026-10-04

---

## D1 — Có đưa bộ pattern "chuẩn bị rẻ" vào yêu cầu V1 không? (K2)

| Option | Pros | Cons |
|---|---|---|
| A — cả bộ 13 mục | Rẻ lúc làm sớm, đắt khi sửa sau khi có client | Phạm vi spec rộng hơn |
| B — chỉ phần khó đổi | Gọn hơn | Bỏ vài mục rẻ |
| C — không | Nhanh nhất | Sửa lỗi API, phân trang, danh tính sau khi có client rất tốn |

**Chosen:** A — chủ dự án chọn.
**Mechanism:** các quy ước SR2, SR7, SR8 của system spec.
**File:** `docs/specs/system-spec.md`

| | |
|---|---|
| **Authorised by** | Chủ dự án (K2, 04/10/2026); nguồn kỹ thuật R9–R12 là `documented (02/10)` |
| **Diverges from the reference system?** | no reference |
| **The answer, out loud** | Làm sớm vài quy ước rẻ để web và mobile không phải sửa lại khi đã có người dùng. |

**What this does not fix:** R9–R12 chưa được tải lại ngày 04/10; nếu build phụ thuộc nặng vào chi tiết một nguồn thì phải tải lại.

---

## D2 — Xóa tài khoản ngay hay có ân hạn? (K3)

| Option | Pros | Cons |
|---|---|---|
| A — xóa ngay sau xác nhận lại | Ít code, triệt để | Xóa nhầm không khôi phục được |
| B — ân hạn 30 ngày | Khôi phục được | Thêm trạng thái "chờ xóa" và job dọn |

**Chosen:** A — chủ dự án chọn.
**Mechanism:** SR11, tiêu chí S10, edge SE6.
**File:** `docs/specs/system-spec.md`

| | |
|---|---|
| **Authorised by** | Chủ dự án (K3); yêu cầu xóa trong app của store là R15 (`documented (02/10)`) |
| **Diverges from the reference system?** | no reference |
| **The answer, out loud** | Xóa ngay vì đơn giản và đúng với quyền xóa dữ liệu; bước xác nhận lại chặn xóa nhầm. |

**What this does not fix:** thời hạn xóa bản sao lưu và nghĩa vụ theo Luật 91/2025 (R16, chưa đọc nội dung) vẫn là `ASSUMPTION`.

---

## D3 — Ngôn ngữ giao diện và giải thích (K4)

| Option | Pros | Cons |
|---|---|---|
| A — chỉ tiếng Việt | Ít việc | Không đúng ý chủ dự án |
| B — Việt và Anh, chọn theo tiếng mẹ đẻ người học nhập lúc thiết lập, thêm ngôn ngữ bằng file dịch | Mở rộng sang ngôn ngữ khác không đổi cấu trúc | Nội dung giải thích phải soạn theo từng ngôn ngữ |

**Chosen:** B — chủ dự án chọn (chỉnh: hỏi tiếng mẹ đẻ thay vì lấy theo quốc gia).
**Mechanism:** SR3, S8, S9; CR7, C21.
**File:** `docs/specs/system-spec.md`, `docs/specs/module-spec-vocabulary-content.md`

| | |
|---|---|
| **Authorised by** | Chủ dự án (K4) |
| **Diverges from the reference system?** | no reference |
| **The answer, out loud** | Hỏi người học tiếng mẹ đẻ là cách chắc chắn nhất để chọn ngôn ngữ, và thêm ngôn ngữ chỉ là thêm tài nguyên. |

**What this does not fix:** bước cuối của chuỗi hiển thị (nghĩa tiếng Việt kèm nhãn "chưa có bản dịch" cho người có tiếng mẹ đẻ khác) là `ASSUMPTION`.

---

## D4 — Điều kiện publish và số nghĩa ở pilot (K10)

| Option | Pros | Cons |
|---|---|---|
| A — một nghĩa chính mỗi (từ, loại từ); cần nghĩa Việt, ví dụ Anh, level, chủ đề; nhãn ngữ cảnh tùy chọn | Khối lượng duyệt vừa sức một người | Bài đa nghĩa chưa đủ nghĩa |
| B — soạn mọi nghĩa phổ biến | Phủ tốt hơn | Khối lượng duyệt tăng nhiều lần |

**Chosen:** A — chủ dự án chọn.
**Mechanism:** CR5, CR6, C1, C2.
**File:** `docs/specs/module-spec-vocabulary-content.md`

| | |
|---|---|
| **Authorised by** | Chủ dự án (K10) |
| **Diverges from the reference system?** | no reference |
| **The answer, out loud** | Chỉ một người duyệt, nên gói pilot một nghĩa chính; mô hình vẫn cho thêm nghĩa sau. |

**What this does not fix:** định nghĩa tiếng Anh là tùy chọn, nên "định nghĩa tiếng Anh luôn có" (N6) chưa được bảo đảm.

---

## D5 — Cách xác định từ chức năng (K11)

| Option | Pros | Cons |
|---|---|---|
| A — suy từ loại từ khi import, owner ghi đè | CEFR-J đã có loại từ; ít công | Rule theo loại từ có thể sai với vài từ |
| B — gán tay | Chính xác | Tốn công |

**Chosen:** A — chủ dự án chọn; tập loại từ cụ thể do trợ lý đề xuất từ số liệu thật (R7).
**Mechanism:** CR10, C4, C5, C6, CE2.
**File:** `docs/specs/module-spec-vocabulary-content.md`

| | |
|---|---|
| **Authorised by** | Chủ dự án (K11); tập loại từ và việc loại `number`, `interjection` là lựa chọn riêng của spec (mặc định, chưa được hỏi lại) |
| **Diverges from the reference system?** | no reference |
| **The answer, out loud** | Loại từ có sẵn trong dữ liệu nên dùng để gắn cờ, còn owner sửa được từng trường hợp. |

**What this does not fix:** `number` (30 dòng) và `interjection` (9 dòng) có thể nên được tính; chủ dự án chưa trả lời.

---

## D6 — Chuỗi tra nghĩa cho người học (K20, thay K12)

| Option | Pros | Cons |
|---|---|---|
| A — chỉ catalog + tự nhập | Rẻ, không phụ thuộc bên ngoài | Kém tiện, người học phải tự gõ nghĩa |
| B — nguồn từ điển ngoài | Tiện, có nội dung sẵn | Giấy phép lưu nội dung, quota, độ phủ chưa biết |
| C — AI tra nghĩa | Linh hoạt | Tốn hạn mức và tiền, có thể sai |
| Chuỗi B → C → A | Có phương án dự phòng ở mỗi bước | Phải spec nhiều nhánh |

**Chosen:** chuỗi B → C → A — chủ dự án chọn, kèm catalog luôn tra trước.
**Mechanism:** CR15, C13, C14, C15, C16, CE8.
**File:** `docs/specs/module-spec-vocabulary-content.md`

| | |
|---|---|
| **Authorised by** | Chủ dự án (K20); cách hiểu "xét lúc xây và chạy theo chuỗi" là của trợ lý, chủ dự án không phản đối |
| **Diverges from the reference system?** | no reference |
| **The answer, out loud** | Mỗi bước có đường lùi nên bước nào chưa dùng được thì vẫn ra được sản phẩm; tự nhập luôn còn. |

**What this does not fix:** chưa chọn provider, nên chưa biết bước B có qua được giấy phép lưu nội dung hay không (`ASSUMPTION`, chặn khi build); bước C phụ thuộc K18 (hoãn).

---

## D7 — Câu ngữ cảnh của người học thành bài điền từ không AI (K23)

| Option | Pros | Cons |
|---|---|---|
| A — có, chỉ lưu riêng tư | Ngữ cảnh thật, không tốn lượt AI, dùng được cho Free | Câu có thể nhạy cảm hoặc có bản quyền |
| B — không | Đơn giản | Mất điểm khác biệt chính |

**Chosen:** A — chủ dự án chọn.
**Mechanism:** CR14, C17, C22.
**File:** `docs/specs/module-spec-vocabulary-content.md`

| | |
|---|---|
| **Authorised by** | Chủ dự án (K23); giới hạn 300 ký tự và 5 câu mỗi sense là `ASSUMPTION` |
| **Diverges from the reference system?** | no reference |
| **The answer, out loud** | Dùng câu người học đã gặp là điều ChatGPT không có sẵn, lại rẻ vì chấm bằng rule. |

**What this does not fix:** nội dung câu do người dùng nhập chưa được kiểm duyệt; chỉ giảm rủi ro bằng cách giữ riêng tư và giới hạn độ dài.

---

## D8 — Lemma phân biệt hoa thường (lựa chọn riêng của spec)

| Option | Pros | Cons |
|---|---|---|
| A — phân biệt hoa thường | `March` (tháng, A1) và `march` (B1) là hai entry đúng như dữ liệu nguồn | Khớp tìm kiếm phải không phân biệt hoa thường riêng |
| B — gộp về chữ thường | Đơn giản | Mất phân biệt tên riêng và danh từ chung; dữ liệu nguồn có 58 headword chứa chữ hoa |

**Chosen:** A.
**Mechanism:** CR1, CR20, CE1; tìm kiếm không phân biệt hoa thường ở CR11.
**File:** `docs/specs/module-spec-vocabulary-content.md`

| | |
|---|---|
| **Authorised by** | Finding R3 và R5 (verified 04/10/2026): hai dòng `March` và `march` cùng loại từ khác level |
| **Diverges from the reference system?** | no reference |
| **The answer, out loud** | Nguồn dữ liệu đã tách `March` và `march`, gộp thì mất một level và nghĩa. |

**What this does not fix:** cách xử lý khi người học gõ `march` mà muốn tháng 3 chưa được nghĩ tới.

---

## D9 — Hai nguồn level khác nhau cho cùng một từ

| Option | Pros | Cons |
|---|---|---|
| A — giữ cả hai, hiển thị mặc định theo CEFR-J, owner rà và ghi đè bằng level biên tập | Không mất dữ liệu, giữ đúng nguồn | Chọn CEFR-J là phỏng đoán |
| B — theo level cao hơn | Có quy tắc đơn giản | Không có căn cứ chọn cao hơn |
| C — theo Octanove | — | CEFR-J là nguồn chính cho A1–B2 |

**Chosen:** A.
**Mechanism:** CR8, C18, C19, CE5.
**File:** `docs/specs/module-spec-vocabulary-content.md`

| | |
|---|---|
| **Authorised by** | neither — our own trade-off; finding R2 chỉ cho thấy có 95 cặp khác nhau, không cho biết nguồn nào đúng hơn |
| **Diverges from the reference system?** | no reference |
| **The answer, out loud** | Chưa biết nguồn nào đúng hơn nên giữ cả hai và để owner rà 95 cặp; mặc định CEFR-J vì là nguồn chính cho A1–B2. |

**What this does not fix:** chưa xác minh nguồn nào đáng tin hơn cho các cặp bất đồng; đây là `ASSUMPTION` mà owner cần rà.

---

## D10 — Headword nhiều từ có được nhận không

| Option | Pros | Cons |
|---|---|---|
| A — nhận như entry `word` | Dữ liệu nguồn có sẵn 144 + 10 dòng nhiều từ | Có thể lẫn với phrasal verb sau này |
| B — từ chối ở V1 | Giữ ranh giới "chỉ từ đơn" | Mất 154 dòng và chặn người học nhập cụm |

**Chosen:** A.
**Mechanism:** CR1, CE3, CE7.
**File:** `docs/specs/module-spec-vocabulary-content.md`

| | |
|---|---|
| **Authorised by** | Finding R4 (verified 04/10/2026); K2 chỉ yêu cầu chừa `entry_type`, không cấm cụm từ |
| **Diverges from the reference system?** | no reference |
| **The answer, out loud** | Dữ liệu nguồn đã có cụm như `according to`; từ chối thì mất dữ liệu, nên nhận nhưng chưa gắn quy tắc phrasal verb. |

**What this does not fix:** khi thêm `entry_type` mới, các dòng nhiều từ hiện có có thể phải phân loại lại.

---

## D11 — Truy cập tài nguyên của người khác trả "không tìm thấy"

| Option | Pros | Cons |
|---|---|---|
| A — "không tìm thấy" | Không lộ tài nguyên có tồn tại | Khó phân biệt lỗi khi debug |
| B — "bị cấm" | Rõ ràng | Lộ rằng ID tồn tại |

**Chosen:** A.
**Mechanism:** SR9, S6, C7.
**File:** `docs/specs/system-spec.md`

| | |
|---|---|
| **Authorised by** | neither — our own trade-off; cơ sở là mức "Private leak/abuse" trong Defense Analysis nháp |
| **Diverges from the reference system?** | no reference |
| **The answer, out loud** | Không để người khác đoán ID để biết nó có tồn tại. |

**What this does not fix:** chưa kiểm thử đối kháng.

---

## D12 — Xác nhận xóa tài khoản bằng cách nào (lệch nhẹ so với lời K3)

| Option | Pros | Cons |
|---|---|---|
| A — mật khẩu, hoặc đăng nhập Google mới nếu chỉ có Google | Khớp ranh giới "OTP chỉ cho xác minh email và quên mật khẩu" | K3 ghi "mật khẩu hoặc OTP" |
| B — OTP gửi email | Khớp lời K3 | Thêm mục đích thứ ba cho OTP, trái ranh giới đã chốt; email làm yếu tố xác nhận (R27) |

**Chosen:** A.
**Mechanism:** IR18, tiêu chí I23, và SR11 của system spec (đã sửa).
**File:** `docs/specs/module-spec-identity-access.md`, `docs/specs/system-spec.md`

| | |
|---|---|
| **Authorised by** | neither — our own trade-off: K3 nói "mật khẩu hoặc OTP" còn quyết định OTP nói chỉ hai mục đích; hai câu mâu thuẫn nhau và mình chọn giữ ranh giới OTP |
| **Diverges from the reference system?** | no reference; **lệch lời K3** (bỏ nhánh OTP), cần chủ dự án xác nhận |
| **The answer, out loud** | OTP chỉ được dùng để xác minh email và quên mật khẩu, nên người chỉ có Google xác nhận bằng cách đăng nhập Google lại. |

**What this does not fix:** nếu chủ dự án muốn OTP cũng dùng cho xóa tài khoản thì phải đổi ranh giới OTP và IR4.

---

## D13 — Phiên: access JWT + refresh token xoay vòng theo thiết bị, có khoảng ân hạn (K5, K6, N2)

| Option | Pros | Cons |
|---|---|---|
| A — phiên opaque phía server | Thu hồi tức thì, đơn giản | Chủ dự án quen JWT; mỗi request tra DB |
| B — access JWT 15 phút + refresh xoay vòng (chọn theo khuyến nghị) | Mô hình phổ biến cho mobile; một cơ chế cho hai client | Logout trễ tối đa 15 phút; cần phát hiện dùng lại token |
| C — cookie cho web, JWT cho mobile | Khớp hướng dẫn NestJS | Hai cơ chế |

**Chosen:** B. Khoảng ân hạn 10 giây cho request gia hạn song song là lựa chọn riêng của spec.
**Mechanism:** IR10 đến IR13, I16, I17, IE1, IE2.
**File:** `docs/specs/module-spec-identity-access.md`

| | |
|---|---|
| **Authorised by** | K5 (theo khuyến nghị, chủ dự án chưa xác nhận riêng), K6 (chốt); R22 và R31 (đọc 04/10 qua tóm tắt); khoảng ân hạn và 15 phút là `ASSUMPTION` |
| **Diverges from the reference system?** | no reference |
| **The answer, out loud** | Hai token là mô hình chuẩn cho mobile và web dùng chung, refresh xoay vòng theo yêu cầu của RFC 9700 §2.2.2; ân hạn tránh thu hồi oan khi hai tab cùng gia hạn. |

**What this does not fix:** RFC 9700 §4.14.2 đã được agent kiểm chứng đọc (dùng lại token cũ thì thu hồi, không có khoảng ân hạn), nên khoảng ân hạn 10 giây là **ngoại lệ do spec tự chọn**, giữ cặp token dạng mã hóa tối đa 10 giây và không áp dụng khi chuỗi đã bị thu hồi; logout vẫn còn tối đa 15 phút trễ với access token đã cấp.

---

## D14 — Khi Google trùng email với tài khoản mật khẩu chưa xác minh (K8)

| Option | Pros | Cons |
|---|---|---|
| A — xóa mật khẩu và phiên, giữ người dùng và dữ liệu, gắn Google | Người dùng thật không mất dữ liệu; kẻ chiếm trước mất quyền | Dữ liệu do kẻ chiếm trước tạo (nếu có) được giữ |
| B — xóa cả người dùng chưa xác minh rồi tạo mới | Sạch tuyệt đối | Người dùng thật mất mọi thứ đã làm khi chưa xác minh |

**Chosen:** A.
**Mechanism:** IR9, I15.
**File:** `docs/specs/module-spec-identity-access.md`

| | |
|---|---|
| **Authorised by** | K8 (chốt), phần "giữ dữ liệu" là lựa chọn riêng; cơ chế chống chiếm trước là suy luận, chưa có nguồn |
| **Diverges from the reference system?** | no reference |
| **The answer, out loud** | Mất mật khẩu thì kẻ chiếm trước không vào được nữa, còn người thật vừa chứng minh quyền sở hữu hộp thư bằng Google. |

**What this does not fix:** dữ liệu mà kẻ chiếm trước đã tạo vẫn nằm trong tài khoản; rủi ro thấp vì app không có nội dung chia sẻ. Phương án khác có nguồn: hướng dẫn NestJS (R31) xử lý đúng trường hợp này theo hướng ngược lại, **từ chối** đăng nhập Google cho tài khoản mật khẩu chưa xác minh (403) thay vì trao tài khoản; chủ dự án có thể chọn hướng đó.

---

## D15 — Mật khẩu 8 ký tự kèm quy tắc thành phần (K9)

| Option | Pros | Cons |
|---|---|---|
| A — 8 ký tự + chữ hoa, thường, số, đặc biệt (chủ dự án chọn) | Quen thuộc với người dùng | Khác NIST (15 ký tự, không quy tắc thành phần); quy tắc thành phần làm giảm độ mạnh thực tế (suy luận) |
| B — 15 ký tự, không quy tắc | Theo NIST (R27) | Ma sát khi đăng ký |

**Chosen:** A — chủ dự án chọn.
**Mechanism:** IR3, I3.
**File:** `docs/specs/module-spec-identity-access.md`

| | |
|---|---|
| **Authorised by** | Chủ dự án (K9) |
| **Diverges from the reference system?** | no reference; **lệch khuyến nghị NIST** (R27), đã được nêu và chủ dự án giữ lựa chọn |
| **The answer, out loud** | Đây là lựa chọn sản phẩm của chủ dự án; rủi ro mật khẩu yếu được giảm bằng Argon2id và giới hạn thử sai. |

**What this does not fix:** chưa có kiểm tra mật khẩu đã lộ (breached-password check); chưa đọc nguồn nên chưa đưa vào.

---

## D16 — Khóa đăng nhập chỉ chặn đăng nhập mật khẩu (F7)

| Option | Pros | Cons |
|---|---|---|
| A — khóa chỉ cho đăng nhập mật khẩu của tài khoản đó | Kẻ tấn công không khóa được người dùng thật khỏi Google hay đặt lại | Mật khẩu vẫn bị dò trong lúc chưa khóa |
| B — khóa mọi đường vào tài khoản | Chặt hơn | Cho phép tấn công từ chối dịch vụ lên một tài khoản |

**Chosen:** A.
**Mechanism:** IR6, I11.
**File:** `docs/specs/module-spec-identity-access.md`

| | |
|---|---|
| **Authorised by** | F7 (mặc định đã duyệt); phần "không chặn Google và đặt lại" là lựa chọn riêng, suy luận |
| **Diverges from the reference system?** | no reference |
| **The answer, out loud** | Khóa mọi đường vào thì ai biết email của bạn cũng khóa được bạn; chỉ khóa đường mật khẩu thì vẫn chặn dò mật khẩu. |

**What this does not fix:** chưa có CAPTCHA hay phát hiện bất thường theo IP ngoài giới hạn tần suất.

---

## D17 — Nhập file nguồn không tạo sense, và nhập không đổi trực tiếp nội dung đang hiển thị

| Option | Pros | Cons |
|---|---|---|
| A — nhập tạo entry và level, không tạo sense; dòng nhập khớp sense đã publish tạo revision bản nháp | Không có gì hiện ra với người học khi chưa soạn xong; nội dung đang hiển thị không bị sửa ngầm | Thêm bước publish revision |
| B — nhập ghi thẳng vào nội dung hiện hành | Ít bước | File sai làm hỏng nội dung đang hiển thị |

**Chosen:** A.
**Mechanism:** PR2, PR8, P2, P12.
**File:** `docs/specs/module-spec-content-pipeline.md`

| | |
|---|---|
| **Authorised by** | neither — our own trade-off; cơ sở là R1–R2: danh sách nguồn chỉ có từ, loại từ, level |
| **Diverges from the reference system?** | no reference |
| **The answer, out loud** | Nhập file là việc dễ sai, nên chỉ vào bản nháp; người học chỉ thấy những gì bạn đã publish. |

**What this does not fix:** nếu owner gửi sai file nhiều lần, số revision bản nháp tăng; hoàn tác theo lô chỉ áp dụng cho phần chưa publish.

---

## D18 — Giữ worker BullMQ dù chỉ còn import CSV nhỏ

| Option | Pros | Cons |
|---|---|---|
| A — giữ worker BullMQ (chủ dự án đã chọn) | Sẵn cho nguồn ngoài và AI sau; retry, hàng đợi, chạy lại có sẵn | Thêm Redis và một tiến trình cho việc nhỏ |
| B — import trong request kèm tiến độ | Đơn giản | Mất cơ chế retry và chạy lại có sẵn |
| C — lệnh CLI | Đơn giản nhất | Không có giao diện, trái K1 hybrid |

**Chosen:** A theo quyết định cũ; spec ghi rõ điều kiện xét lại.
**Mechanism:** mục "Phương án thay thế và điều kiện xét lại" và các quy tắc PR9 đến PR12.
**File:** `docs/specs/module-spec-content-pipeline.md`

| | |
|---|---|
| **Authorised by** | Chủ dự án (chọn phương án B cho worker ngày 02/10); lý do ban đầu (AI soạn nháp hàng nghìn từ) đã bị bỏ ở K1b |
| **Diverges from the reference system?** | no reference |
| **The answer, out loud** | Giữ vì đã quyết và vì sẵn cho nguồn ngoài hoặc AI sau này, nhưng spec ghi thẳng rằng lý do yếu đi và khi nào xét lại. |

**What this does not fix:** chưa có bằng chứng đo cho thấy Redis đáng công vận hành ở quy mô 300–500 từ.

---

## D19 — Lịch ôn: hộp ôn 6 mức, ôn sớm không tăng mức (K21)

| Option | Pros | Cons |
|---|---|---|
| A — hộp ôn đơn giản (chủ dự án chọn), ôn sớm không tăng mức | Dễ giải thích; không bị tăng giả khi ôn sớm | Mức 0 và mức 1 cho cùng khoảng cách ngày đầu |
| B — FSRS | Chính xác hơn | Cần mỗi lần ôn có mức đánh giá; chưa tra thư viện; chủ dự án hoãn đến sau pilot |

**Chosen:** A.
**Mechanism:** LR5, LR6, L7, L8, L9.
**File:** `docs/specs/module-spec-learning.md`

| | |
|---|---|
| **Authorised by** | K21 và N7–N9 (khoảng cách 1, 3, 7, 14, 30 ngày, trần ôn); quy tắc ôn sớm và việc mức 0 lên mức 1 là lựa chọn riêng, `ASSUMPTION`; hộp ôn là kiến thức chung chưa tra nguồn |
| **Diverges from the reference system?** | no reference |
| **The answer, out loud** | Hộp ôn đủ để đo xem người học có quay lại không; chuyển FSRS sau khi có số liệu, vì nhật ký giữ đủ dữ liệu. |

**What this does not fix:** các con số chưa được thử với người thật; mức 0 và mức 1 dẫn tới cùng ngày đến hạn đầu tiên cho cả nhớ và quên.

---

## D20 — Chỉ trả lời đúng ở dạng tự nhớ mới đẩy lịch ôn lên (tinh chỉnh K22)

| Option | Pros | Cons |
|---|---|---|
| A — đúng ở dạng chọn đáp án không đẩy lịch; sai thì về mức đầu ở mọi dạng | Không bị tăng giả do đoán (1 trên 4, 1 trên 2) | Lệch nhẹ so với lời K22 "kết quả bài làm tác động vào lịch ôn" |
| B — mọi kết quả tác động như nhau | Đúng lời K22 | Trắc nghiệm đoán may làm lịch tăng giả |

**Chosen:** A.
**Mechanism:** PRC17, Q24, Q25.
**File:** `docs/specs/module-spec-practice.md`

| | |
|---|---|
| **Authorised by** | neither — our own trade-off; K22 nói bài làm sai thì ôn sớm hơn, không nói trả lời đúng ở trắc nghiệm có đẩy lịch lên không |
| **Diverges from the reference system?** | no reference; tinh chỉnh K22, cần chủ dự án xác nhận |
| **The answer, out loud** | Đoán đúng không chứng minh nhớ, nên không cho nó làm lịch ôn xa ra. |

**What this does not fix:** chưa đo tỉ lệ đoán đúng thực tế.

---

## D21 — Spec hạn mức viết theo hành vi, giữ cấu trúc là ASSUMPTION (K18 hoãn)

| Option | Pros | Cons |
|---|---|---|
| A — hành vi đúng với mọi cấu trúc, con số là tham số `L` | Không khóa quyết định chủ dự án đang nghiên cứu | Một số tiêu chí chưa cụ thể |
| B — chọn một cấu trúc (cửa sổ hoặc grant) | Tiêu chí cụ thể hơn | Quyết thay chủ dự án |

**Chosen:** A.
**Mechanism:** ghi chú đầu `module-spec-entitlements-usage.md`, ER5 đến ER9, ER13, EE5.
**File:** `docs/specs/module-spec-entitlements-usage.md`

| | |
|---|---|
| **Authorised by** | K18 (hoãn, chủ dự án tự research); mô hình grant và trần chi AI là đề xuất trong `RESEARCH_AI_QUOTA_MODELS_2026-10-04.md`, chưa chốt |
| **Diverges from the reference system?** | no reference |
| **The answer, out loud** | Chủ dự án đang nghiên cứu cấu trúc hạn mức nên spec chỉ khóa các hành vi đúng với mọi cấu trúc. |

**What this does not fix:** đơn vị trừ lượt (ER6), cách các nguồn quyền cộng dồn (EE5) và trần chi AI (ER14) là `ASSUMPTION` cho đến khi K18 được chốt.

---

## D22 — Kiểm rule câu AI cần "dạng hợp lệ" của từ, nhưng chưa có nguồn dạng chia (K16)

| Option | Pros | Cons |
|---|---|---|
| A — dạng được chấp nhận của sense + bộ quy tắc chia cố định + danh sách bất quy tắc do owner duy trì | Làm được ngay không cần nguồn ngoài | Bất quy tắc và ngoại lệ có thể làm loại nhầm câu đúng |
| B — chờ có nguồn dữ liệu dạng chia | Chính xác hơn | Chặn tính năng AI cho đến khi có nguồn |

**Chosen:** A, ghi rõ là `ASSUMPTION` và là rủi ro chính của kiểm rule.
**Mechanism:** PRC6, PRC7, QE5, CR16, CR22.
**File:** `docs/specs/module-spec-practice.md`, `docs/specs/module-spec-vocabulary-content.md`

| | |
|---|---|
| **Authorised by** | K16 (kiểm chỉ bằng rule) và K15 (danh sách dạng chấp nhận phải có trong nội dung); quy tắc chia là lựa chọn riêng, suy luận |
| **Diverges from the reference system?** | no reference |
| **The answer, out loud** | K16 buộc phải kiểm đáp án có là dạng của từ không; chưa có dữ liệu dạng chia nên dùng quy tắc cố định cộng danh sách owner bổ sung, chấp nhận loại nhầm một ít câu. |

**What this does not fix:** tỉ lệ loại nhầm chưa đo; cần bộ ví dụ có người duyệt (AR13).

---

## Reversals

| Decision | Reversed by | What changed underneath it |
|---|---|---|
| K12 B (một provider trong V1) | K12 A, rồi K20 | Chủ dự án hoãn việc chọn provider, rồi muốn chuỗi tra nghĩa có dự phòng |
| K1b: AI soạn nháp | Chủ dự án (K1b) | AI soạn nháp là đề xuất của trợ lý, không phải quyết định; chủ dự án ưu tiên AI cho người dùng và tự soạn CSV |

## Path notes

| Date | What moved |
|---|---|
| 2026-10-04 | Chưa có |
