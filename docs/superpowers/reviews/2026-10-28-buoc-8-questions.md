# Bước 8 — Bộ câu hỏi cho chủ dự án (28/10/2026)

Bước 8 = phần còn lại của Identity: **đăng nhập bằng Google** và **xóa tài khoản**, cộng những việc các bước trước đã ghi "để Bước 8" (dọn tài khoản chưa xác
nhận email, admin xóa người dùng, tên lấy từ Google, dấu vết trial sau khi xóa, giao dịch của người bị xóa). Quên mật khẩu đã làm ở Bước 1.

**Cách trả lời** (như Bước 7)
- Viết ngay dưới dòng **Trả lời:** của từng câu, hoặc trả lời trong chat theo số câu. Ngắn cũng được: "a", "b, nhưng…".
- "bỏ qua" / "không biết" → Claude đề xuất cho câu đó (decision record ghi lại như vậy). Muốn Claude đề xuất trước ở câu nào thì ghi "đề xuất trước".
- Các hướng liệt kê **không theo thứ tự ưu tiên**, không hướng nào là gợi ý của Claude (luật "chủ dự án trả lời trước"; câu 1 hỏi có giữ luật này không).
  Luôn được trả lời một hướng khác.
- Trả lời xong, Claude gửi lại **một lượt** đề xuất cho từng câu (đồng ý hay khác ở đâu, vì sao); anh/chị chốt. Rồi mới viết design.

Ví dụ xuyên suốt: **Lan**, người học, đăng ký bằng `lan@gmail.com` và mật khẩu, đã học 200 từ, có 15 từ riêng, đang dùng gói Pro.
Bằng chứng về code hiện tại: `docs/preparation/BUOC_8_CODE_FACTS_2026-10-28.md`.

---

## 0. Đã chốt từ trước, không hỏi lại

Muốn mở lại điều nào thì ghi ở cuối file; còn không thì design dùng nguyên như dưới.

| Điều | Nguồn |
|---|---|
| Xóa tài khoản là **xóa thật ngay** sau khi xác nhận lại, không có thời gian chờ để hối hận; chỉ giữ số liệu tổng hợp không định danh | K3, SR11 |
| Xác nhận lại khi xóa: nhập mật khẩu; tài khoản chỉ có Google thì đăng nhập Google lại. **Không** dùng mã OTP qua email | D12 (DECISIONS), IR18 |
| Thứ tự xóa: tài khoản chuyển "đang xóa" (mọi request của người đó bị từ chối, kể cả token còn hạn) → thu hồi mọi phiên → từng module xóa dữ liệu của mình → xóa người dùng cuối cùng; module lỗi thì thử lại tới khi xong | SR11, IR18 |
| Tài khoản tạo bằng Google coi như đã xác minh email | K7 |
| Cùng email ở Google và mật khẩu: tự liên kết khi email đã xác minh; nếu bản mật khẩu **chưa** xác minh thì bỏ mật khẩu đó, thu hồi phiên, rồi gắn Google (dữ liệu giữ) | K8, IR9 |
| Nhận người dùng Google theo mã `sub` của Google, không theo email; Google báo email chưa xác minh thì từ chối | IR8 |
| Khóa đăng nhập sau 10 lần sai mật khẩu không chặn đăng nhập Google | IR6 |
| Tài khoản chỉ có Google làm "Quên mật khẩu" xong thì có thêm mật khẩu | IR7 |
| Gửi thư báo cho chủ email khi liên kết Google vào tài khoản có sẵn và khi thêm mật khẩu vào tài khoản chỉ có Google | IR22 |
| Sign in with Apple nằm ngoài V1; bắt buộc trước khi ra bản iOS có nút Google (Apple 4.8). App Flutter chưa làm | Identity spec "Ngoài phạm vi", R15 |
| Cổng AI đã có sẵn hàm xóa theo người: xóa nội dung lời gọi AI, xóa `ai_operations`, giữ dòng chi phí nhưng bỏ `user_id` | Bước 6 design §12.2, B6E68 |
| Danh sách "dạng chia lạ" (`practice_unknown_forms`) không gắn với người nên giữ | Bước 7 §19 |
| Tài khoản thiếu ngày sinh hoặc chưa đồng ý điều khoản bị đưa tới màn "Bổ sung thông tin" (13 tuổi trở lên, ô đồng ý) trước khi vào app | AD18 (đợt admin); `apps/web/src/app-shell/RequireSession.tsx:75` |

---

## Phần 1 — Cách làm và phạm vi

### Câu 1. Luật hỏi ở Bước 8

Từ Bước 3 tới đợt admin, mọi câu quyết định đều theo luật "chủ dự án trả lời trước, Claude đề xuất sau". File này viết theo luật đó. Phần 7 có vài câu thuần kỹ
thuật (web nói chuyện với Google thế nào, việc xóa chạy ở đâu).

Các hướng: (a) giữ luật cho mọi câu, kể cả phần 7 · (b) bỏ: Claude đề xuất trước mọi câu · (c) giữ cho câu sản phẩm (phần 1–6), Claude đề xuất trước cho câu kỹ thuật
(phần 7) · (d) khác.

**Trả lời:**

### Câu 2. Làm những màn hình nào

Bước 4–7 làm API trước, màn hình làm ở đợt sau. Giờ màn người học và màn admin đều đã có. Web người học đang có hai chỗ giữ chỗ: nút "Đăng nhập bằng Google · Sắp có"
ở trang đăng nhập và đăng ký (bấm không được), và dòng "Xóa tài khoản · Sắp có" trong Cài đặt. Màn admin chưa có gì về xóa hay Google.
App Flutter chưa có, nên phần điện thoại (Google Sign-In trên Android/iOS) chỉ có thể là API để sẵn.

Các hướng:
- (a) chỉ API, màn hình để đợt sau
- (b) API + màn người học trên web: nút "Tiếp tục với Google" ở trang đăng nhập và đăng ký, luồng xóa tài khoản trong Cài đặt
- (c) như (b) + màn admin: thấy người dùng có Google hay mật khẩu, và các việc của admin ở phần 5
- (d) khác

**Trả lời:** c

### Câu 3. Một design hay tách hai

Hai mảng gần như độc lập: **đăng nhập Google** (chỉ Identity và trang đăng nhập) và **xóa tài khoản** (đụng mọi module, mọi bảng có dữ liệu của người học).

Các hướng: (a) một design, một plan · (b) một design, hai plan làm hai đợt (đợt nào trước?) · (c) hai design riêng (cái nào trước?) · (d) khác.

**Trả lời:** a

### Câu 4. "Xong khi" có đăng nhập Google thật không; ai implement

Thử Google thật cần anh/chị tạo một project trên Google Cloud và một OAuth client loại "Web", không tốn tiền. Google cho phép địa chỉ `http://localhost` làm chỗ quay
về sau khi đăng nhập, nên thử được trên máy. Khi project ở chế độ "Testing", chỉ tối đa 100 tài khoản Google có tên trong danh sách test đăng nhập được
(Google Cloud Help, đọc 28/10/2026). Không làm thì đăng nhập Google chỉ được kiểm bằng một "Google giả" trong test và script, giống AI ở Bước 6–7.

- 4a. Các hướng: (a) chỉ Google giả: CI xanh + script smoke · (b) như (a), cộng một lần anh/chị đăng nhập thật bằng tài khoản Google của mình trên máy trước khi coi là
  xong · (c) Google thật làm thành việc riêng sau Bước 8 · (d) khác.
- 4b. Implement như các đợt trước (các phiên chạy song song + một phiên điều phối, Claude tự review và chạy kiểm thật)? Có / khác.

**Trả lời:** đăng nhập google thật ngay đợt này luôn / có

### Câu 5. Nút Google có ở trang đăng nhập admin không

Admin và editor đăng nhập trang admin bằng email và mật khẩu. Nếu cho đăng nhập Google ở đó thì an toàn của tài khoản nhân sự phụ thuộc vào tài khoản Google của họ
(ví dụ họ có bật xác minh 2 bước ở Google không). Theo K8, một tài khoản nhân sự có email trùng tài khoản Google sẽ được tự liên kết.

Các hướng: (a) chỉ người học (web `/app`) · (b) cả người học và trang admin · (c) người học có; nhân sự có nút nhưng chỉ dùng được khi admin bật cho từng người ·
(d) khác. Kèm câu nhỏ: nếu (a), một người vừa là nhân sự vừa học (cùng email) đăng nhập Google ở `/app` thì vào `/app` bình thường, nhưng **không** dùng phiên đó vào
trang admin được — đồng ý không?

**Trả lời:** a

---

## Phần 2 — Đăng nhập bằng Google

### Câu 6. Người mới bấm Google lần đầu phải điền gì

Đăng ký bằng mật khẩu hiện hỏi họ, tên, ngày sinh (từ 13 tuổi) và ô đồng ý điều khoản; sau đó màn "Chào mừng" hỏi tiếng mẹ đẻ. Google trả về email, tên và họ (có
thể thiếu họ), **không** có ngày sinh. Đã có sẵn màn "Bổ sung thông tin" hỏi ngày sinh và ô đồng ý cho tài khoản thiếu hai thứ đó (mục 0).

Ví dụ: Minh chưa có tài khoản, bấm "Tiếp tục với Google", chọn `minh@gmail.com`.

- 6a. Minh thấy gì tiếp theo: (a) vào thẳng màn "Bổ sung thông tin" sẵn có (ngày sinh, ô đồng ý), tên lấy từ Google, rồi màn "Chào mừng" · (b) một form đăng ký đầy đủ
  điền sẵn tên và email từ Google, Minh sửa được tên · (c) như (a) nhưng thêm ô sửa tên · (d) khác.
- 6b. Minh nhập ngày sinh cho thấy chưa đủ 13 tuổi. Lúc này tài khoản đã được tạo khi Minh bấm Google: (a) xóa ngay tài khoản vừa tạo (cùng đường xóa tài khoản),
  báo "chưa đủ tuổi" · (b) giữ tài khoản nhưng không cho vào app · (c) chỉ tạo tài khoản sau khi Minh điền xong ngày sinh và đồng ý (trước đó chưa có gì lưu lại) ·
  (d) khác.

**Trả lời:** 6a: a, 6b: c

### Câu 7. Tên lấy từ Google

Đợt sửa thiếu sót Bước 0–3 ghi "Bước 8 sẽ lấy tên từ Google" (D2). Câu hỏi là lấy lúc nào và có ghi đè tên Lan tự đặt không.

Các hướng: (a) chỉ lấy một lần khi tạo tài khoản bằng Google; sau đó tên do người học tự sửa · (b) mỗi lần đăng nhập Google thì cập nhật theo Google · (c) như (a), và
khi Lan (đã có tên) liên kết Google lần đầu thì **không** đổi tên của Lan · (d) khác. Kèm: dùng ảnh đại diện Google không (app hiện không có ảnh đại diện)? Có / không.

**Trả lời:** a

### Câu 8. Gắn và gỡ Google trong Cài đặt

Theo K8, Lan (mật khẩu, email đã xác minh) bấm "Tiếp tục với Google" bằng `lan@gmail.com` thì tự được liên kết. Câu này hỏi có cần chỗ **chủ động** quản lý cách đăng
nhập trong Cài đặt không.

- 8a. Các hướng: (a) không có mục nào; chỉ có tự liên kết theo email (K8) và thêm mật khẩu qua "Quên mật khẩu" (IR7) · (b) có mục "Cách đăng nhập": gắn Google, không gỡ ·
  (c) gắn và gỡ được, không gỡ được cách đăng nhập cuối cùng · (d) khác.
- 8b. Nếu 8a là (b) hoặc (c): Lan muốn gắn tài khoản Google `lan.work@gmail.com`, khác email trong app. (a) cho phép; email trong app vẫn là `lan@gmail.com` · (b) không
  cho, chỉ gắn Google có cùng email · (c) khác.

**Trả lời:** mình chưa hiểu câu này lắm

---

## Phần 3 — Người học tự xóa tài khoản

### Câu 9. Lan phải làm gì để xóa

Apple yêu cầu xóa được ngay trong app và không được làm khó; Google Play cũng vậy (nghiên cứu store 20/10/2026). Đã chốt: xác nhận bằng mật khẩu hoặc đăng nhập Google lại.
Luồng dự kiến: Cài đặt → "Xóa tài khoản" → màn cảnh báo (những gì bị xóa) → xác nhận → đăng xuất, màn "Đã xóa".

Ngoài mật khẩu, Lan còn phải: (a) không gì thêm · (b) tick ô "Tôi hiểu dữ liệu sẽ mất và không khôi phục được" · (c) gõ lại một chữ (ví dụ email của mình) · (d) khác.

**Trả lời:** b và c

### Câu 10. Tải dữ liệu về trước khi xóa

Store không bắt buộc. Lan có 200 từ đã học, 15 từ riêng và các câu ngữ cảnh tự viết.

Các hướng: (a) không có ở Bước 8 · (b) có nút tải file (ví dụ CSV từ riêng và câu ngữ cảnh) ở màn cảnh báo · (c) có ở Cài đặt, dùng được cả khi không xóa · (d) khác.

**Trả lời:** xóa tài khoản là mặc định mất dữ liệu

### Câu 11. Đang có gói Pro trả tiền

Hiện chỉ có nhà cung cấp thanh toán **giả**; gói Pro tự gia hạn (D35 Bước 5). Apple, với gói mua qua App Store, yêu cầu báo người dùng hủy gia hạn ở Apple trước, vì app
không tự hủy hộ được; app web thì có thể tự gọi nhà cung cấp hủy gia hạn.

Lan còn 20 ngày Pro đã trả tiền và bấm xóa: (a) app tự hủy gia hạn rồi xóa luôn; phần còn lại không hoàn tiền · (b) không cho xóa tới khi Lan tự hủy gia hạn ·
(c) app tự hủy gia hạn, xóa luôn, hoàn tiền phần còn lại · (d) khác. Gói Pro do staff cấp tay (không tiền) thì xóa luôn, không hỏi gì — đồng ý không?

**Trả lời:** có anthropic và openai rồi, kiểm tra lại, theo hướng b. Gói do staff cấp miễn không tự gia hạn thì có thể xóa, còn tự động gia hạn ở một tài khoản thì không cho xóa

### Câu 12. Đăng ký lại cùng email sau khi xóa

Trial 7 ngày chỉ một lần cho mỗi tài khoản và mỗi thẻ (D22 Bước 5). Code hiện chặn theo **mã tài khoản** và **mã thẻ do nhà cung cấp tính**, không theo email.
Đăng ký lại sau khi xóa sẽ ra một mã tài khoản mới, nên chỉ còn mã thẻ chặn được trial lại, và chỉ khi dấu vết đó được giữ.

Hôm sau Lan đăng ký lại bằng `lan@gmail.com`: (a) được, như người mới hoàn toàn, có trial lại · (b) được, nhưng app vẫn chặn trial lại theo thẻ (giữ mã thẻ, không giữ email) ·
(c) được, và chặn cả trial theo email (giữ một bản băm của email) · (d) khác.

**Trả lời:** bạn research kĩ phần này và cho mình đề xuất

### Câu 13. Thư xác nhận

Apple yêu cầu báo cho người dùng khi việc xóa xong. Thư gửi tới chính email đang bị xóa.

Các hướng: (a) một thư "Tài khoản của bạn đã được xóa" khi xong · (b) không gửi thư, chỉ màn "Đã xóa" trên app · (c) thư cả lúc bắt đầu và lúc xong · (d) khác.

**Trả lời:** a

---

## Phần 4 — Dữ liệu nào xóa, dữ liệu nào giữ

Đã chốt (mục 0): xóa dữ liệu cá nhân và dữ liệu học của người đó, chỉ giữ số liệu tổng hợp không định danh. Bảng dưới là những chỗ còn phải quyết; danh sách đầy đủ mọi
bảng có dữ liệu theo người ở file code facts.

Theo code hôm nay có 53 cột ở 10 module trỏ tới một người dùng. Chỉ 4 bảng của Identity tự xóa theo khi xóa người dùng; mọi bảng ở module khác phải tự xóa.

| Nhóm dữ liệu của Lan | Ví dụ | Đã có hướng | Câu |
|---|---|---|---|
| Tài khoản, mật khẩu, phiên, mã OTP | `users`, `password_credentials`, `session_chains` | Xóa (mục 0) | — |
| Dữ liệu học | nhóm từ, thẻ, lịch ôn, nhật ký ôn | Xóa (mục 0) | — |
| Chữ Lan tự viết | 15 từ riêng, câu ngữ cảnh, tên nhóm | Xóa (mục 0) | — |
| Bài luyện | phiên, câu hỏi, câu trả lời Lan gõ, câu AI làm riêng cho Lan | Xóa (Bước 4 §15, Bước 7 §19) | — |
| Cài đặt nhắc học, nhật ký thư nhắc | `reminder_prefs`, `reminder_deliveries` | Xóa (mục 0) | — |
| Gói và lượt | lần cấp, gói đăng ký, sổ lượt AI, thư gói | Xóa (ER16) | 16 |
| Nhật ký gọi AI | chi phí từng lần gọi, nội dung gửi AI (giữ 7 ngày) | Giữ dòng chi phí, bỏ tên; xóa nội dung (mục 0) | — |
| Báo lỗi Lan gửi | lý do, ghi chú tự viết, bản chụp câu hỏi | **Chưa** | 14 |
| Giao dịch tiền | số tiền, mã giao dịch, sự kiện thanh toán thô | **Chưa** | 15 |
| Dấu vết "đã dùng trial" | mã tài khoản, mã thẻ | **Chưa** | 12 |
| Vết "ai đã làm" khi Lan là nhân sự | ai review, ai xuất bản, ai cấp gói | **Chưa** | 18 |

### Câu 14. Báo lỗi Lan đã gửi

Lan đã báo 3 câu AI sai, có ghi chú tự viết. Bản chụp câu hỏi trong báo lỗi có thể chứa chính câu Lan tự viết (câu điền từ làm từ câu đã lưu của Lan). Spec Practice ghi
"giữ ẩn danh" nhưng chỉ là `ASSUMPTION` (PRC27). Hiện báo lỗi đã xử lý tự xóa sau 6 tháng (cài đặt `historyMonths`); báo lỗi đã được staff xác nhận còn gắn với một
lần trả lượt.

Các hướng: (a) xóa hẳn · (b) giữ báo lỗi, bỏ tên người gửi, **xóa** ghi chú tự viết · (c) giữ cả ghi chú, chỉ bỏ tên người gửi · (d) khác.

**Trả lời:** cb

### Câu 15. Giao dịch tiền

Bảng giao dịch có số tiền, gói, ngày, mã giao dịch của nhà cung cấp; sự kiện thanh toán thô có thể chứa email người mua (đang tự xóa sau 90 ngày, Bước 5). Sổ sách
thuế có thể buộc giữ lâu hơn; **chưa có ý kiến luật sư**, thời hạn giữ theo luật Việt Nam chưa nghiên cứu.

Các hướng: (a) xóa hết như mọi dữ liệu khác · (b) giữ giao dịch nhưng bỏ mọi thứ chỉ ra người (id, email), giữ N năm · (c) giữ nguyên tới khi có ý kiến luật sư · (d) khác.

**Trả lời:** b

### Câu 16. Số liệu trên dashboard sau khi xóa

Dashboard AI tính thẳng từ các dòng gốc, không có bảng số liệu tổng hợp riêng. Ví dụ biểu đồ "lượt AI theo ngày" đếm các dòng trong sổ lượt (`usage_records`). Xóa sổ
lượt của Lan thì các cột ngày cũ trên biểu đồ **thấp xuống**, dù đã chốt "giữ số liệu tổng hợp không định danh".

Các hướng: (a) chấp nhận số cũ thấp xuống · (b) giữ các dòng sổ lượt nhưng bỏ mã người (chỉ còn ngày, loại lượt) · (c) trước khi xóa, cộng số của Lan vào một bảng tổng
hợp theo ngày, rồi xóa dòng gốc · (d) khác.

**Trả lời:** b

---

## Phần 5 — Admin và tài khoản nhân sự

### Câu 17. Admin xóa tài khoản người học

Đợt admin để việc này cho Bước 8 (câu 8 của đợt đó). Trường hợp cần: người học gửi email xin xóa, tài khoản rác, yêu cầu theo luật (Nghị định 356/2025: làm trong 20
ngày, theo nghiên cứu 20/10/2026, chưa phải ý kiến luật sư).

Các hướng: (a) không, chỉ người học tự xóa · (b) admin xóa được, dùng cùng đường xóa; editor không · (c) như (b) và phải ghi lý do, người học nhận thư · (d) khác.

**Trả lời:** giải thích thêm phần này, cho mình context ví dụ

### Câu 18. Tài khoản nhân sự bị xóa

Nhiều chỗ ghi "ai đã làm" bằng id nhân sự (ai review, ai xuất bản một nghĩa, ai cấp gói, ai tạo lô nhập, ai đổi cài đặt). 13 cột trong số đó hiện **bắt buộc có giá
trị**, nên "để trống" cần sửa cấu trúc bảng. Màn admin đã chịu được id không còn tài khoản (hiện không có email). Luật hiện có: không bao giờ còn 0 admin.

- 18a. Một editor muốn tự xóa tài khoản: (a) được, vai trò mất theo · (b) phải nhờ admin bỏ vai trò trước · (c) nhân sự không tự xóa được; chỉ admin xóa · (d) khác.
  Admin cuối cùng thì không xóa được, trong mọi hướng.
- 18b. Sau khi xóa, các chỗ ghi "ai đã làm" hiện: (a) "Người dùng đã xóa" (giữ id trơ, không còn email) · (b) để trống · (c) khác.

**Trả lời:** 
- 18a: đã là nhân sự thì admin phải quản lý ở chỗ tài khoản, nên editor chỉ có quyền hạn được cho phép theo bảng đã chốt
- 18b: a

### Câu 19. Dọn tài khoản chưa từng xác nhận email

Từ đợt cải thiện A, tài khoản chưa xác nhận email không vào được app nhưng vẫn nằm trong DB và giữ chỗ email; `deploy-checklist.md` ghi "làm cùng phần xóa tài khoản
của Bước 8". Đăng ký lại vào email chưa xác nhận đã được thay dữ liệu bằng lần mới (A5).

Các hướng: (a) làm ở Bước 8: tự xóa sau N ngày, dùng cùng đường xóa (N = ?) · (b) để tới Deploy · (c) không dọn · (d) khác.

**Trả lời:** a

### Câu 20. Trang web xin xóa tài khoản (Google Play)

Google Play đòi thêm một trang web công khai để người dùng xin xóa tài khoản mà không cần cài lại app, khai trong mục Data safety. Chỉ cần khi app Android lên Google Play.

Các hướng: (a) làm ở Bước 8 (một trang trên landing: đăng nhập rồi xóa, dùng chung luồng ở câu 9) · (b) làm ở Bước 8 dạng form gửi yêu cầu, admin xử lý (cần câu 17) ·
(c) để tới khi làm app Android · (d) khác.

**Trả lời:** c

---

## Phần 6 — Còn lại

### Câu 21. Thời hạn xóa trong bản sao lưu

Sau khi xóa, dữ liệu của Lan vẫn nằm trong bản sao lưu DB cho tới khi bản đó hết hạn. Hiện chưa có backup nào (chưa deploy); chính sách riêng tư phải ghi thời hạn này.

Các hướng: (a) chốt con số ở Bước 8 (N ngày) · (b) để Deploy chốt cùng cách backup · (c) khác.

**Trả lời:** hình như mình không có chốt sao lưu dữ liệu, khi xóa thì cũgn đã cảnh báo trước người dùng 2 lớp, nên mình nghĩ không cần sao lưu dữ liệu của tài khoản đã xóa, có đề xuất khác hoặc theo ý mình thì tùy bạn quyết chỗ này
 
---

## Phần 7 — Câu kỹ thuật

Câu 1 = (c) thì Claude đề xuất trước ở phần này, anh/chị chỉ cần đọc đề xuất. Câu 1 = (a) thì trả lời như các phần trên.

### Câu 22. Web nói chuyện với Google thế nào

API ở `api.<domain>`, web người học ở domain gốc; phiên web dùng cookie `HttpOnly` của API. Spec chốt OAuth "authorization code + PKCE" (IR8).

Các hướng: (a) chuyển trang qua API: web gửi Lan tới API, API chuyển tới Google, Google quay về API, API đặt cookie rồi đưa Lan về web · (b) web nhận mã từ Google rồi gửi
mã cho API đổi · (c) dùng nút Google của thư viện Google trên web (lấy ID token, không có PKCE) · (d) khác.

**Trả lời:**

### Câu 23. Việc xóa chạy ở đâu

Xóa đụng hàng chục bảng ở 7 module. Spec đòi "lỗi giữa chừng thì thử lại tới khi xong".

Các hướng: (a) chạy ngay trong request, một transaction; lỗi thì để tài khoản "đang xóa" và một việc định kỳ thử lại · (b) request chỉ đặt "đang xóa", worker (BullMQ) xóa
và thử lại · (c) khác.

**Trả lời:** a

### Câu 24. Chặn tài khoản "đang xóa" ở mọi request

Hiện guard chỉ kiểm chữ ký token, không đọc DB ở mỗi request (Bước 1). Theo đọc code (chưa chạy thử), tài khoản bị admin khóa hôm nay vẫn dùng được các màn người học
tới khi access token hết hạn (tối đa 15 phút). Chặn "đang xóa" ngay cả khi token còn hạn (đã chốt) cần thêm một lần đọc; cách chọn ở đây có thể áp luôn cho tài khoản bị khóa.

Các hướng: (a) đọc DB mỗi request · (b) đọc qua bộ nhớ đệm ngắn (vài giây) · (c) thu hồi phiên rồi chấp nhận access token còn sống tối đa 15 phút, nhưng mọi lệnh ghi
của người "đang xóa" bị từ chối ở tầng dữ liệu · (d) khác.

**Trả lời:** là sao

---

## Muốn mở lại điều đã chốt (mục 0)

(ghi ở đây nếu có)
