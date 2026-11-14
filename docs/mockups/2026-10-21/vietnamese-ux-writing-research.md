# Viết tiếng Việt cho giao diện Wordmet: research và hướng dẫn (21/10/2026)

Mục đích: chữ tiếng Việt trong Wordmet (app người học, web và điện thoại, cùng trang admin) đọc như người Việt tự viết, không
như bản dịch từ tiếng Anh, và dễ đọc với người học 13 tuổi trở lên. File này chỉ là research và đề xuất; **chủ dự án quyết**.
Chưa sửa code, Figma hay git.

Cách đọc nhãn trong file:

- `[S1]`… là nguồn ở mục (d) cuối file. Mọi nguồn đọc ngày 21/10/2026.
- **Suy luận**: ý của người viết, rút ra từ nguồn nhưng không nguồn nào nói thẳng.
- **ASSUMPTION**: điều chưa kiểm được trong phiên này.
- Ví dụ "Nên / Không nên" là chữ viết cho ngữ cảnh Wordmet, không trích từ nguồn (trừ chỗ ghi nguồn).

Thứ tự: (a) tóm tắt → (b) từng nguyên tắc → (c) điểm các nguồn không thống nhất → Rà chữ hiện có → Bảng thuật ngữ (nháp) →
Việc cần chủ dự án chốt → (d) nguồn.

---

## (a) Tóm tắt nguyên tắc

1. Viết lại như người Việt tự viết; không dịch từng chữ, không giữ cấu trúc câu tiếng Anh [S1][S2][S5].
2. Gọi người học là "bạn"; bỏ đại từ khi câu vẫn rõ; app tự gọi mình là "Wordmet", không "chúng tôi", không "mình" [S1][S7][S26].
3. Chọn chữ người dùng đã quen (mật khẩu, tải về, xem thêm), không chọn theo gốc Hán Việt hay thuần Việt [S1][S15][S24].
4. Câu ngắn, mỗi câu một ý, chủ động; bớt "được", "sự", "việc", "của", "các" thừa [S1][S2][S3][S16].
5. "Chưa" (sẽ có) khác "không" (không có): chọn có chủ ý [S1].
6. Nút bấm là động từ nói đúng việc sẽ xảy ra ("Xóa nhóm", "Thử lại"); không "OK", "Có", "Không" ở hộp hỏi [S7][S11].
7. Báo lỗi = chuyện gì xảy ra + làm gì tiếp; không đổ lỗi, không đùa, không "Rất tiếc!" thừa [S1][S7][S10].
8. Hộp xác nhận chỉ dùng khi mất dữ liệu hay tốn lượt; nói rõ hậu quả; nút "Xóa nhóm" / "Giữ lại" [S11].
9. "Vui lòng" chỉ khi bắt người dùng làm việc phiền hoặc lỗi do app; không bao giờ trên nút, nhãn, gợi ý [S8][S1][S2].
10. Viết hoa kiểu câu: chỉ chữ đầu và tên riêng (Wordmet, Pro, Google); không Viết Hoa Mỗi Chữ, không VIẾT HOA HẾT [S1][S2][S4].
11. Nút, nhãn, tiêu đề không có dấu chấm; câu trọn có dấu chấm; "…" là một ký tự; lỗi không dùng "!" [S4][S2].
12. Số và ngày theo chuẩn vi-VN: 7.799; 0,5; 80%; 17/10; "Thứ Bảy, 17 tháng 10"; 20:00. Lấy từ `Intl`, đừng tự ghép [S25][S1].
13. Giữ AI, Pro, email, CSV; Việt hóa phần còn lại khi có chữ quen; giải thích từ lạ bằng ví dụ ở lần đầu [S1][S4][S17].
14. Mỗi khái niệm một từ, theo bảng thuật ngữ; đặc biệt "lượt", "phiên", "thẻ", "dạng" đang mang nhiều nghĩa [S7][S1].
15. Giọng ấm và gọn như người kèm học: vui khi khen, nghiêm và rõ khi lỗi, tiền, dữ liệu [S7][S13][S3].

---

## (b) Từng nguyên tắc

### N1. Viết như người Việt tự viết, không dịch từng chữ

Microsoft yêu cầu người dịch hiểu ý cả trang rồi viết lại như tự mình viết, kể cả bỏ phần thừa; văn bản phải có "look and feel"
của sản phẩm viết bằng tiếng Việt từ đầu [S1 §2.1.1, §2.1.3, §5]. Mozilla và Gengo nói cùng ý: không dịch sát từng từ, tái cấu
trúc câu cho tự nhiên [S3][S5]. Với Wordmet, chuỗi gốc có thể là tiếng Việt luôn; nguyên tắc này áp cả khi viết bản tiếng Việt từ
bản nháp tiếng Anh của design.

| Nên | Không nên |
|---|---|
| Không lưu được từ. Thử lại sau ít phút. | Lưu từ thất bại. |
| Chưa tạo được câu. | Tạo câu hỏi không thành công. |
| Bạn cần đăng nhập lại. | Phiên đăng nhập của bạn đã hết hạn. |

Ví dụ của chính Microsoft: "Image save failed" thành "Không lưu được hình ảnh", không phải "Lưu hình ảnh thất bại"; "Failed to
download" thành "Không tải được", không phải "Tải về không thành công" [S1 §2.1.3, §2.1.4].

### N2. Xưng hô: "bạn", bỏ đại từ khi rõ, app tự gọi "Wordmet"

- **Người học là "bạn".** Microsoft dùng "bạn" xuyên suốt và tránh gọi người dùng ở ngôi thứ ba ("người dùng") vì nghe xa cách
  [S1 §2.1.2, §2.2]. Microsoft cũng cấm dùng anh, chị, ông, bà cho người chưa biết tuổi và giới; thay bằng "bạn" hoặc vai trò
  [S1 §3.1]. Wiktionary ghi một nghĩa của "bạn" là người xem một tác phẩm nói chung, không gắn tuổi [S21]. Google (trợ giúp Android)
  và Apple (trang hỗ trợ tiếng Việt) đều gọi người đọc là "bạn" [S29][S30]; MoMo, ELSA Speak cũng vậy [S26][S28]. "Bạn" hợp cả
  người lớn lẫn học sinh 13+, nên Wordmet không cần hai giọng.
- **Bỏ đại từ khi câu vẫn rõ.** Proton khuyên bỏ chủ ngữ "bạn/chúng tôi" và từ sở hữu khi có thể [S4]. Zalopay gần như không gọi
  thẳng người đọc mà vẫn rõ [S27]. Apple khuyên dùng từ sở hữu ("của bạn") dè dặt, và đã dùng thì đừng đổi góc nhìn [S7].
- **App tự gọi mình là "Wordmet".** Apple khuyên tránh "we" vì không rõ "we" là ai, nhất là trong lỗi [S7]. MoMo và ELSA tự gọi
  bằng tên thương hiệu [S26][S28]. "Mình" có ít nhất năm nghĩa (tôi, chúng ta, chính mình, bạn đời, quý khách) [S20], nên app tự
  xưng "mình" dễ bị đọc thành "chúng ta". "Quý khách" là giọng văn bản pháp lý, y tế [S22]: quá xa cho một app học.
- **Admin (nhân viên)**: không cần đại từ; nói về người học ở ngôi thứ ba ("người học", tên hoặc email) là đúng chỗ (**Suy luận**).

| Nên | Không nên |
|---|---|
| Ôn 10 thẻ | Bạn hãy ôn 10 thẻ của bạn |
| Wordmet tự nhận ra dạng chia. | Chúng tôi sẽ tự động nhận diện dạng chia cho bạn. |
| Còn 87 lượt AI | Số lượt AI còn lại của bạn là 87 |
| Đã lâu rồi bạn chưa vào học (email, cần đại từ) | Quý khách đã lâu không truy cập hệ thống |

### N3. Chữ quen hơn chữ "đúng gốc": khi nào dùng Hán Việt

Tiêu chí là **người đọc đã quen chữ đó chưa**, không phải chữ gốc Hán hay thuần Việt.

- Microsoft: dùng chữ đời thường, ngắn; ưu tiên chữ hai âm tiết hơn ba âm tiết; bỏ chữ cũ, quá trang trọng [S1 §2.1.2, §2.1.4, §3].
  Trong bảng "cổ điển → hiện đại" của Microsoft có cả chiều thuần Việt sang Hán Việt: "giấu" → "ẩn", vì "ẩn" là chữ quen trên giao
  diện; và "học" → "tìm hiểu" cho "learn" [S1 §2.1.4]. Với Wordmet, "học" đã là động từ chính, nên "Learn more" nên là "Tìm hiểu
  thêm" hoặc "Xem thêm".
- Một UX writer Việt kể chuyện nhóm đặt "mật mã" thay "mật khẩu" rồi phải đổi lại; và nút "Xem kỹ hơn" bị khách yêu cầu đổi thành
  "Xem thêm" vì người dùng đã quen [S15].
- Nghiên cứu độ khó văn bản tiếng Việt (Le và cộng sự, 2024) thử dùng tỉ lệ từ Hán Việt và từ mượn làm đặc trưng, và thấy nó **làm
  mô hình kém đi**; tác giả cho rằng cùng một từ Hán Việt có thể thuộc nhiều tầng nghĩa tùy ngữ cảnh [S24]. Tức là chưa có bằng
  chứng "Hán Việt thì khó".

Dùng Hán Việt khi nó là chữ đã quen (mật khẩu, đăng nhập, cài đặt, thông báo, điều khoản) hoặc khi chữ thuần Việt mơ hồ hay quá
suồng sã. Bỏ Hán Việt kiểu hành chính khi nó chỉ thêm độ trang trọng (**Suy luận** từ [S1 §2.1.4]):

| Nên | Không nên |
|---|---|
| Tạo nhóm | Khởi tạo nhóm |
| Luyện tập | Tiến hành luyện tập / Thực hiện luyện tập |
| Đang xử lý… | Hệ thống đang trong quá trình xử lý |
| Đổi tên | Chỉnh sửa tên gọi |
| Xem thêm | Xem chi tiết hơn |

### N4. Câu ngắn, mỗi câu một ý, chủ động

- Microsoft: đoạn ngắn, câu đơn giản, nhắm một động từ mỗi câu; đọc to để kiểm [S1 §3.2]. Dùng câu rút gọn khi có thể: "Nếu bạn vẫn
  còn sự cố" thành "Nếu còn sự cố"; "Hãy bắt đầu sử dụng phiên bản đầy đủ ngay" thành "Dùng ngay phiên bản đầy đủ" [S1 §4.1.15].
- Mozilla: chuyển câu bị động tiếng Anh thành chủ động; tránh lối danh từ hóa; hai câu ngắn hơn một câu dài [S2][S3].
- Câu dưới khoảng 15 từ dễ hiểu hơn (Thùy Dương, dẫn American Press Institute; số liệu gốc là tiếng Anh) [S14].
- Bản tiếng Việt thường dài hơn tiếng Anh khoảng 30–35% [S23]; màn điện thoại hẹp, nên càng phải gọt (**Suy luận**: thiết kế
  khung chữ theo bản tiếng Việt, không theo bản tiếng Anh).

| Nên | Không nên |
|---|---|
| Đã thêm vào nhóm “Du lịch”. | Từ đã được thêm thành công vào nhóm "Du lịch" của bạn. |
| Câu này do AI viết. | Câu này đã được tạo ra bởi AI. |
| Đang tạo câu… | Việc tạo câu hỏi đang được tiến hành, vui lòng chờ trong giây lát. |

### N5. Các kiểu "văn dịch" hay gặp

| Kiểu | Không nên | Nên | Nguồn |
|---|---|---|---|
| "được" bị động thừa | Nhóm đã được tạo. | Đã tạo nhóm. | Mozilla [S2]; Gengo [S5]; mẫu của Microsoft "Đã cài đặt các bản cập nhật" [S1 §2.2.2] |
| "bị" cho việc trung tính | Phiên bị kết thúc. | Phiên đã kết thúc. | **Suy luận**: "bị" báo điều bất lợi, giữ cho cảnh báo thật ("12 từ sẽ bị bỏ khỏi việc học") |
| Chuỗi "của" | Số lượt AI còn lại của gói của bạn | Gói của bạn còn 87 lượt AI | Microsoft: chỉ thêm "của" khi cần rõ nghĩa [S1 §4.1.10]; Apple, Proton: bớt từ sở hữu [S7][S4] |
| Danh từ hóa "sự / việc / quá trình" | Đã xảy ra sự cố trong quá trình tải. | Không tải được. | Mozilla [S3]; Microsoft: không thêm "việc" trước động từ làm chủ ngữ [S1 §4.1.17]; báo Tuổi Trẻ phân tích các câu "sự…" dịch sát [S16] |
| "Bạn có chắc chắn muốn … không?" + Có / Không | Bạn có chắc chắn muốn thực hiện thao tác này không? [Có] [Không] | Xóa nhóm “Du lịch”? [Xóa nhóm] [Giữ lại] | NN/g: câu hỏi chung chung vô ích, nút phải nói kết quả [S11] |
| "các / những" thừa | Các cài đặt; Xóa các từ đã chọn | Cài đặt; Xóa 5 từ đã chọn | Mozilla: "Settings" là "Thiết lập", không "Các thiết lập" [S2] |
| "thất bại / không thành công" | Kết nối thất bại. | Không kết nối được. | Microsoft [S1 §2.1.3, §5.5.2] |
| "Hãy" trên mọi nút | Hãy bắt đầu học | Bắt đầu học | Microsoft: câu rút gọn [S1 §4.1.15]; Proton: nút dùng động từ nguyên dạng [S4] |
| Dịch thán từ | Ối! Có gì đó không ổn rồi! | Không tải được câu. Thử lại. | Apple: "oops" thường thừa, nghe không thật [S7]; Microsoft: viết lại câu đùa tiếng Anh thành câu báo lỗi rõ [S1 §2.1.3] |
| Viết Hoa Kiểu Tiêu Đề Anh | Thêm Từ Mới | Thêm từ mới | Mozilla [S2]; Microsoft [S1 §4.1.5] |

### N6. "Chưa" và "không": chọn có chủ ý

Microsoft phân biệt: "không biết" (nói chung), "chưa biết" (chưa, nhưng sẽ hoặc muốn biết), "chẳng biết" (không quan tâm)
[S1 §4.1.17]. Trên giao diện, "chưa" báo trạng thái tạm và giữ hy vọng; "không" báo điều cố định (**Suy luận** áp vào UI).

| Nên | Ghi chú |
|---|---|
| Gói Pro chưa mở bán | Sẽ mở; đúng ý |
| AI tạm chưa dùng được | Tạm thời; đúng ý |
| Chưa tạo được câu. Thử lại. | Thử lại có thể được |
| Không tìm thấy từ “xyz” | Kết quả cố định cho truy vấn này |
| Tránh: "Gói Pro không khả dụng" | Đọc như sẽ không bao giờ có, và "khả dụng" là chữ dịch |

### N7. Nút bấm

- Apple: nút và link gần như luôn nên là động từ; rõ hơn khéo ("Send" tốt hơn "Let's do it!"); giữ một kiểu chữ cho các bước của
  cùng một luồng ("Tiếp tục" hay "Tiếp", rồi "Xong") [S7].
- NN/g: nút trong hộp hỏi phải tóm tắt kết quả, ví dụ "Delete file" / "Keep file" [S11].
- Proton: nút dùng động từ nguyên dạng ("Sao chép tệp"), không có dấu chấm [S4]. Microsoft: "hủy", "nhập" thay cho "hủy bỏ",
  "nhập vào" [S1 §2.1.2]; Mozilla cũng chọn "hủy" vì ngắn [S2].
- Chọn động từ hợp cả chuột và cảm ứng: Microsoft dùng "chọn" thay "nhấp" [S1 §3.2]; Apple: đừng nói "click" trên máy cảm ứng
  [S7]. Trong câu hướng dẫn của Wordmet (web và điện thoại) nên dùng "chọn" hoặc "bấm", tránh "click", "nhấp chuột", "chạm"
  (**Suy luận**).
- Độ dài: 1–3 chữ, tối đa khoảng 4 chữ trên điện thoại (**Suy luận**; nguồn chỉ nói "càng ngắn càng tốt" [S1 §5.5]).

| Nên | Không nên |
|---|---|
| Ôn 10 thẻ | Bắt đầu phiên ôn tập ngay bây giờ |
| Tạo nhóm | OK |
| Thử lại | Hãy thử lại lần nữa nhé! |
| Xong | Hoàn tất quá trình |
| Xóa nhóm / Giữ lại | Đồng ý / Hủy bỏ |

Cẩn thận với "Hủy": trong hộp "Hủy gói Pro?" mà nút phụ cũng là "Hủy" thì người dùng không biết bấm gì; dùng "Hủy gói" / "Giữ gói"
(**Suy luận** từ [S11]).

### N8. Báo lỗi

- Microsoft: câu báo lỗi ở dạng trần thuật, dùng một mẫu cố định cho cùng một ý ("Không tìm thấy…", "Không kết nối được"); có dấu
  chấm cuối câu; mẫu lỗi mật khẩu: "Mật khẩu không đúng, xin thử lại." [S1 §2.2.1, §5.5.2].
- Apple: đặt lỗi sát chỗ sai, không đổ lỗi, nói rõ cách sửa ("Choose a password with at least 8 characters" tốt hơn "That password is
  too short"); bỏ "oops", "uh-oh" [S7].
- NN/g: mô tả đúng vấn đề, gợi cách sửa, giọng tích cực, không đổ lỗi, không dùng thuật ngữ kỹ thuật, giữ lại dữ liệu người dùng đã
  nhập, tránh đùa vì người dùng gặp lỗi nhiều lần [S10].
- Một công ty Việt (SlimCRM) cũng nêu "Đã xảy ra lỗi" là ví dụ kém vì thiếu nguyên nhân và bước tiếp theo [S31].

Mẫu Wordmet: **[chuyện gì xảy ra]. [làm gì tiếp]** (**Suy luận** gộp từ các nguồn trên).

| Nên | Không nên |
|---|---|
| Không kết nối được. Kiểm tra mạng rồi thử lại. | Lỗi! Đã có lỗi xảy ra. |
| Email cần có dạng ten@vidu.com | Email không hợp lệ |
| Mật khẩu cần ít nhất 8 ký tự | Bạn nhập mật khẩu sai định dạng |
| Mã đã hết hạn. Gửi mã mới? [Gửi mã mới] | OTP expired |

### N9. Hộp xác nhận cho thao tác mất dữ liệu

NN/g: chỉ hỏi lại cho việc có hậu quả nghiêm trọng, nhất là không hoàn tác được; hỏi lại việc thường ngày làm người dùng bấm theo
quán tính; hộp phải nhắc lại yêu cầu và nói máy sắp làm gì; có "Hoàn tác" thì tốt hơn hỏi lại [S11]. Câu hỏi dạng "Bạn có muốn…
không?" bản thân không sai tiếng Việt (Microsoft dùng "Bạn có muốn tiếp tục không?" [S1 §2.2.1]); cái sai là hỏi chung chung và nút
"Có / Không".

Ví dụ Wordmet (xóa nhóm còn từ chỉ nằm trong nhóm đó):

> **Xóa nhóm “Du lịch”?**
> 12 từ chỉ có trong nhóm này sẽ bị bỏ khỏi việc học. Không lấy lại được.
> [Xóa nhóm] [Giữ lại]

Không hỏi lại cho: bỏ một thẻ khỏi phiên, đổi tên nhóm, tắt nhắc học (có thể bật lại) (**Suy luận** từ [S11]).

### N10. Thông báo hạn mức, lượt

Không nguồn nào trong danh sách viết riêng về thông báo hạn mức. Gộp từ hướng dẫn báo lỗi [S10] và AI [S12] (**Suy luận**):
nói **hết cái gì**, **khi nào có lại**, **làm được gì ngay**; không làm người học thấy có lỗi; chỉ mời nâng cấp khi thật sự mua được
(hiện "Gói Pro chưa mở bán").

| Nên | Không nên |
|---|---|
| Hết phiên luyện hôm nay. Luyện tiếp từ 0:00 ngày mai. (chữ "phiên" hay "lượt" tùy Q1) | Bạn đã sử dụng hết số lượt cho phép! |
| Phiên này dùng 5 lượt AI (còn 87) | Thao tác này sẽ tiêu tốn 5 credit |
| Đã trả lại 1 lượt AI cho câu bạn báo lỗi. | Lượt của bạn đã được hoàn trả thành công. |

(Giờ "0:00" theo múi giờ của người học, đúng Bước 5; đã kiểm nghĩa, chưa kiểm chữ trên màn W/55.)

### N11. Trạng thái trống (empty state)

Apple: màn trống phải chỉ bước tiếp theo, kèm nút hoặc link nếu được; màn trống thường tạm thời nên đừng đặt thông tin quan trọng ở
đó [S7].

| Nên | Không nên |
|---|---|
| Chưa có nhóm nào. Tạo nhóm đầu tiên để lưu từ bạn gặp. [Tạo nhóm] | Không có dữ liệu |
| Không có từ nào cần ôn hôm nay. [Học từ mới] | Danh sách trống |
| Không tìm thấy “recieve”. Có phải “receive”? | 0 kết quả |

(Dòng gợi chính tả chỉ là ví dụ chữ; app hiện có gợi ý như vậy hay không thì chưa kiểm, **ASSUMPTION**.)

### N12. Nói rõ phần nào do AI làm, và khi AI hỏng thì sao

People + AI Guidebook (Google PAIR): nói càng cụ thể càng tốt về giới hạn của hệ thống; giải thích vì sao không có kết quả và đưa
đường khác; khi AI hỏng, cách dễ nhất thường là để người dùng tự làm; có lúc phải nói thẳng hệ thống đã sai; viết như người, không
như máy [S12]. Apple: đổi tông theo tình huống [S7].

| Nên | Không nên |
|---|---|
| AI gợi ý (nhãn cạnh nghĩa do AI tra) | Nghĩa (không nhãn, như thể đã được duyệt) |
| AI tạm chưa dùng được. Câu này đổi sang kiểu không cần AI, không tính lượt AI. | Lỗi AI. Đã chuyển dạng. |
| Đang tạo câu… | Hệ thống AI đang xử lý yêu cầu của bạn |
| Bản dịch (AI dịch) | Bản dịch chuẩn |

("Không tính lượt" khớp design Bước 7: câu đổi sang kiểu không AI thì không trừ lượt, mục AC4 trên `origin/dev`.)

### N13. "Vui lòng", "hãy", "xin", "nhé"

- Microsoft tiếng Việt: "Please" là "Vui lòng" (dạng lịch sự) và không được viết tắt; nhưng ở cột "hiện đại", "Please wait" là
  "Xin chờ" chứ không "Vui lòng đợi" [S1 §2.1.4, §4.1.1, §4.1.17]. Câu mệnh lệnh trong hướng dẫn thêm "Hãy"; trong mệnh đề phụ thì
  không cần [S1 §4.1.17].
- Microsoft tiếng Anh: tránh "please", trừ khi bắt người dùng làm việc phiền hoặc lỗi do app [S8].
- Mozilla: "Please…" là "Vui lòng…", không dùng "Làm ơn…" hay "Xin hãy…" [S2]. Proton dùng "Vui lòng" trong lỗi [S4].
- Trợ giúp Android tiếng Việt dùng "hãy nhấn" trong câu hướng dẫn, không thấy "vui lòng" trong phần đọc được [S29].
- "Nhé", "nha": không nguồn chính thức nào trong danh sách bàn. 1-StopAsia xếp giọng có "nha!" vào nhóm thương hiệu trẻ, khác hẳn
  giọng tài chính hay pháp lý [S22]. **Suy luận**: "nhé" hợp lời khen, nhắc học, email; không dùng trong lỗi, tiền, xóa dữ liệu.

| Nên | Không nên |
|---|---|
| Kết nối bị ngắt. Vui lòng đăng nhập lại. (lỗi do app, bắt làm việc phiền) | Vui lòng nhập email (nhãn ô nhập) |
| Gõ từ bạn vừa gặp | Vui lòng gõ từ vào ô bên dưới |
| Giỏi lắm! Mai ôn tiếp nhé. | Lỗi kết nối rồi nhé! |

### N14. Viết hoa

- Microsoft tiếng Việt: chỉ viết hoa chữ đầu câu; nút, menu, tiêu đề chỉ hoa chữ đầu ("Chọn tất cả", không "Chọn Tất Cả"); tên
  riêng hoa mọi chữ ("Việt Nam") [S1 §4.1.5].
- Mozilla: tránh Viết Hoa Kiểu Title Tiếng Anh ("Thiết lập hệ thống") [S2]. Proton: chỉ hoa chữ đầu câu và tên người, sản phẩm, nơi
  chốn; phân vân thì viết thường; chữ sau dấu hai chấm cùng dòng viết thường [S4].
- Microsoft tiếng Anh: không viết hoa toàn bộ để nhấn mạnh [S9]. Apple: chọn một kiểu cho mỗi loại thành phần và giữ suốt app [S7].
- Thực tế: trang chủ MoMo dùng nút VIẾT HOA HẾT; trang ELSA trộn "Đăng Ký Demo", "Xem Thêm" với "Mua ngay" [S26][S28]. Đây là
  trang marketing, không phải giao diện app, nhưng cho thấy dễ trộn kiểu nếu không có quy định.

| Nên | Không nên |
|---|---|
| Thêm từ vừa gặp | Thêm Từ Vừa Gặp |
| Gói Pro chưa mở bán | GÓI PRO CHƯA MỞ BÁN |
| Hộp Leitner (tên riêng) | hộp leitner |
| Lưu ý: nhóm này còn 12 từ (chữ sau dấu hai chấm cùng dòng viết thường [S4]) | Lưu ý: Nhóm Này Còn 12 Từ |

### N15. Dấu câu và khoảng trắng

- Không cách trước `. , ; : ? ! ) ”`, có một dấu cách sau; không cách sau `( “`; số và đơn vị cách bằng non-breaking space; số và
  `%` viết liền (80%) [S1 §4.1.14, §4.1.16].
- Không có dấu phẩy trước "và", "hoặc" [S1 §4.1.14][S4].
- "…" là **một ký tự** (U+2026), không phải ba dấu chấm [S2].
- Tiêu đề, link, nút, ô chọn không có dấu chấm cuối, trừ khi có hơn một câu; thay "!" bằng "."; tránh ngoặc đơn bằng cách viết lại;
  khoảng "từ… đến" thay cho gạch ngang; "và" thay cho "&" [S4]. Microsoft cũng khuyên viết "và" thay "&" vì trình đọc màn hình đọc
  sai [S1 §3.2].
- Ngoặc kép cong “…” trong câu; dấu chấm, phẩy đặt sau ngoặc đóng [S1 §4.1.14][S4].

| Nên | Không nên |
|---|---|
| Đang tạo câu… (một ký tự) | Đang tạo câu... (ba dấu chấm) |
| Hết lượt hôm nay (tiêu đề, không chấm) | Hết lượt hôm nay. |
| Gõ từ, dán câu bạn gặp. Wordmet tự nhận ra dạng chia. (hai câu, có chấm) | Gõ từ, dán câu bạn gặp, Wordmet tự nhận ra dạng chia |
| Thêm vào nhóm “Du lịch”. | Thêm vào nhóm "Du lịch" . |

### N16. Số, ngày, giờ, tiền

Kiểm trong phiên bằng `Intl` của Node 24.11.0 (ICU 77.1, CLDR 47.0), locale `vi-VN`, múi giờ `Asia/Ho_Chi_Minh` [S25]:

| Cần hiện | `Intl` cho ra | Ghi chú |
|---|---|---|
| Số nguyên | `7.799`, `8.812` | Dấu chấm ngăn hàng nghìn, đúng [S1 §4.1.14] |
| Số thập phân | `1.234.567,5` | Dấu phẩy thập phân; số nhỏ hơn 1 có số 0 trước: 0,5 [S5][S4] |
| Phần trăm | `80%` | Không cách [S1 §4.1.16] |
| Tiền | `99.000 ₫` | Các nguồn khác nhau, xem mục (c) điểm 8 |
| Ngày, có thứ | `Thứ Bảy, 17 tháng 10` | `weekday: long, day: numeric, month: long` |
| Ngày đầy đủ | `Thứ Bảy, 17 tháng 10, 2026` | `dateStyle: full` |
| Ngày ngắn | `17/10` | `day: numeric, month: numeric` |
| Ngày ngắn có năm | `5/3/2026` | Không thêm số 0 |
| Giờ | `20:00` | 24 giờ |
| Tương đối | `Hôm qua`, `Ngày mai`, `3 ngày trước` | Viết hoa sẵn chữ đầu |

Bẫy đã thấy khi chạy:

- `{ day: '2-digit', month: '2-digit' }` cho ra `17-10` (gạch ngang), không phải `17/10`. Dùng `numeric`.
- `RelativeTimeFormat` trả "Hôm qua" viết hoa; đặt giữa câu thì phải viết thường.
- 18/10/2026 là **Chủ Nhật**, không phải Thứ Bảy (17/10/2026 mới là Thứ Bảy). Ví dụ "Thứ Bảy, 18 tháng 10" trong brief sẽ sai nếu
  là năm 2026; luôn để `Intl` tính thứ.
- Nghị định 30/2020 bắt thêm số 0 trước ngày nhỏ hơn 10 và tháng 1, 2 ("ngày 05/3") [S18], nhưng đó là quy định cho văn bản hành
  chính; app không bắt buộc theo (**Suy luận**).

Số đếm viết bằng chữ số trên giao diện ("Ôn 10 thẻ", "1 lượt AI") [S1 §4.1.11]. Tiếng Việt không thêm dấu số nhiều vào danh từ
("5 ngày", không "5 ngàys") [S6], và không cần "các" khi đã có số [S2].

### N17. Từ mượn và tên sản phẩm

- Microsoft: giữ nguyên chữ viết tắt tiếng Anh, không tự đặt chữ viết tắt tiếng Việt; có thể thêm danh từ chung phía trước ("Số
  PIN"); cân nhắc trình độ người đọc (người dùng phổ thông cần "danh sách phân phối", không phải "DL"); giữ từ mượn khi dịch ra gây
  mơ hồ (OK, tab), khi đã quen, khi bản dịch quá dài, hoặc khi là khái niệm mới; "ID" thay cho "mã định danh"; tên thương hiệu không
  dịch, tên tính năng thì dịch được [S1 §2.1.4, §4.1.2, §4.1.4, §5.2].
- Proton: chọn giữa từ Anh và từ Việt theo cái người ta tìm nhiều hơn; giữ từ Anh phổ biến, không thêm "s"; tránh lạm dụng từ Anh
  [S4].
- Quy định soạn văn bản pháp luật Việt Nam: ngôn ngữ phải "chính xác, phổ thông", diễn đạt rõ, dễ hiểu; từ nước ngoài chỉ dùng khi
  không có từ Việt tương ứng, hoặc dùng thẳng nếu đã thông dụng; thuật ngữ chuyên môn phải giải thích [S17]. Không ràng buộc app,
  nhưng là chuẩn "tiếng Việt dễ hiểu" chính thức gần nhất tìm được.
- **Suy luận** riêng cho Wordmet: người học đang học tiếng Anh, nên chữ tiếng Anh trong khung giao diện dễ lẫn với nội dung học.
  Giữ khung giao diện bằng tiếng Việt khi có chữ quen; chữ tiếng Anh dành cho từ đang học.

| Từ | Đề xuất | Lý do |
|---|---|---|
| AI | Giữ "AI" | Ai cũng biết; "trí tuệ nhân tạo" dài, chỉ hợp văn bản pháp lý |
| Pro | Giữ "Pro" (tên gói) | Tên riêng của gói, như tên sản phẩm [S1 §5.2] |
| Free | "Miễn phí" (đề xuất; chủ dự án chốt) | Có chữ Việt quen tương ứng [S17][S4] |
| Trial | "Dùng thử" | Như trên |
| email | Giữ "email" | Microsoft dùng "email" trong câu mẫu [S1 §2.1.3]; "thư điện tử" của Mozilla là cách cũ [S2] |
| OTP | "mã xác minh" (có thể kèm "OTP" khi cần) | **Suy luận**: học sinh 13+ có thể chưa quen "OTP"; mẫu "Số PIN" cho phép ghép danh từ chung + viết tắt [S1 §4.1.2] |
| CSV | "tệp CSV" (chỉ admin) | Người đọc là nhân viên [S1 §2] |
| flashcard | "thẻ" | Ngắn; xem bảng thuật ngữ |
| level (A1–C2) | "trình độ A2" | Chữ Việt quen; giữ mã CEFR |
| model, prompt, token (admin) | Giữ nguyên | Người đọc kỹ thuật được dùng thuật ngữ kỹ thuật [S1 §2] |

### N18. Nhất quán thuật ngữ

Apple: lập danh sách từ chung và theo nó; giữ một cách gọi cho cùng một bước [S7]. Microsoft: dùng một câu chuẩn cho các lỗi cùng
nghĩa, giữ thuật ngữ nhất quán trong sản phẩm [S1 §4.1.2, §5.5.2]. Thùy Dương: cần một "bộ quy chuẩn nội dung" để cả nhóm viết cùng
giọng [S13]. Bảng thuật ngữ nháp ở cuối file; các xung đột đang có:

- **"lượt"** đang mang ba nghĩa: số phiên luyện mỗi ngày ("Lượt luyện hôm nay", "Hết lượt hôm nay"), lượt AI ("Phiên này dùng 5
  lượt AI", "Đã trả lại 1 lượt") và một lần trả lời câu (màn W/56 "lượt bạn đã báo lỗi", theo `figma-review.md`).
- **"phiên"**: phiên ôn, phiên luyện; nếu viết "phiên đăng nhập" ở màn lỗi sẽ thành nghĩa thứ ba.
- **"thẻ"**: thẻ ôn; ở màn thanh toán (Bước 5) sẽ có thẻ ngân hàng.
- **"dạng"**: dạng chia (went → go) và dạng câu luyện tập ("câu này dùng dạng khác").
- **"gợi ý"**: gợi ý khi làm bài (3 nấc) và nhãn nguồn "AI gợi ý".

### N19. Giọng: ấm mà không trẻ con

- Microsoft: ấm và thoải mái, gọn và rõ, sẵn lòng giúp; viết như lời nói hằng ngày chứ không như văn kỹ thuật [S1 §2, §2.1].
- Mozilla: tôn trọng nhưng không quá trang trọng; vui nhưng không xuề xòa hay sến [S3].
- Thùy Dương: khác biệt nằm ở tính cách thương hiệu, không phải ở chỗ cố viết cho hài; chọn 3–4 nét giọng, rồi tăng giảm tông theo
  tình huống (lỗi, thành công) [S13]. Không chơi chữ khi đang hướng dẫn hay giải thích [S15].
- Apple: giọng giữ nguyên, tông đổi theo ngữ cảnh: nghiêm khi có việc nghiêm, nhẹ khi chúc mừng [S7].
- 1-StopAsia: thang trang trọng từ pháp lý, y tế ("Quý khách vui lòng…") đến game, giới trẻ (tiếng lóng, trộn tiếng Anh) [S22].
  **Suy luận**: Wordmet nằm giữa, gần giáo dục: "bạn", câu đời thường, không tiếng lóng, không "teencode", không trộn tiếng Anh vào
  câu ("Let's go!").

| Tình huống | Nên | Không nên |
|---|---|---|
| Xong phiên ôn | Xong 10 thẻ. Mai ôn tiếp nhé. | Đỉnh của chóp! Quá xịn luôn! |
| Lỗi mạng | Không kết nối được. Kiểm tra mạng rồi thử lại. | Toang rồi bạn ơi :( |
| Hết lượt | Hết phiên luyện hôm nay. Luyện tiếp từ 0:00 ngày mai. (tùy Q1) | Hết lượt rồi, nâng cấp đi! |

### N20. Màn admin (nhân viên)

Microsoft: dùng thuật ngữ kỹ thuật cho người đọc kỹ thuật, chữ phổ thông cho người dùng phổ thông [S1 §2]. **Suy luận** cho admin
Wordmet: nhãn cài đặt là cụm danh từ ngắn kiểu câu, kèm đơn vị và tên khóa (`ai_daily_cap`) ở dòng phụ chữ đơn cách để đối chiếu
với design; tiền nhà cung cấp AI giữ USD, mã tiền sau số ("12,40 USD") theo Proton [S4]; vẫn theo N8 cho lỗi, N9 cho xóa.

| Nên | Không nên |
|---|---|
| Trần lượt AI mỗi ngày (toàn hệ thống) · `ai_daily_cap` | AI_DAILY_CAP |
| Báo lỗi chưa xem: 12 | Pending reports: 12 |
| Lượt AI đã trả | Refund log |
| Chi phí hôm nay: 12,40 USD | Cost today: $12.40 |

---

## (c) Các điểm nguồn không thống nhất

Nêu cả hai phía; chủ dự án chọn.

1. **Dùng "vui lòng" nhiều hay ít.** Microsoft tiếng Việt coi "Vui lòng" là dạng lịch sự chuẩn cho "Please" và có cả "Vui lòng thử
   lại sau!" trong ví dụ [S1 §2.1.3, §4.1.17]. Microsoft tiếng Anh lại bảo tránh "please" trừ hai trường hợp [S8]. Cùng hướng dẫn
   tiếng Việt, cột "hiện đại" chọn "Xin chờ" thay "Vui lòng đợi" [S1 §2.1.4]. Mozilla và Proton dùng "Vui lòng" [S2][S4].
2. **Dấu chấm cuối câu báo lỗi.** Microsoft: có dấu chấm sau câu báo lỗi [S1 §5.5.2]. Proton: nhãn lỗi ngắn không có dấu chấm
   ("Lỗi xác minh chữ ký") [S4]. Hai cách khớp nhau nếu quy ước: câu trọn có chấm, nhãn ngắn không.
3. **Viết hoa kiểu tiêu đề.** Microsoft vừa bảo chỉ hoa chữ đầu [S1 §4.1.5] vừa "chấp nhận" kiểu hoa mỗi chữ cho danh từ ghép, ví dụ
   "Mô tả Nhà cung cấp Dữ liệu Tin cậy" [S1 §4.1.6, §4.1.10]. Mozilla và Proton không chấp nhận [S2][S4]. Trang marketing của MoMo,
   ELSA trộn cả ba kiểu [S26][S28].
4. **Viết hoa thứ trong tuần.** CLDR (dữ liệu chuẩn mà `Intl` dùng) cho ra "Thứ Bảy", "Chủ Nhật" [S25]. Nghị định 30/2020 và Proton
   viết "thứ Hai", "tháng Năm": chỉ hoa âm tiết chỉ ngày, tháng, và chỉ khi không dùng chữ số [S18][S4]. Ở đầu dòng thì hai cách
   giống nhau ("Thứ Bảy, 17 tháng 10"); khác nhau khi ngày nằm giữa câu.
5. **Vị trí dấu thanh ("hoà" hay "hòa", "thuỷ" hay "thủy").** Quy định chính tả sách giáo khoa 2018 (Quyết định 1989/QĐ-BGDĐT) đặt
   dấu trên âm chính: "hoà nhạc", "quý hoá", "thuỷ thủ", "mạnh khoẻ", và viết "i" trong "kỉ niệm", "lí luận" [S19]. Microsoft và
   Mozilla viết "hủy", "cá nhân hóa" [S1][S2]. Cả hai đều đúng chính tả hiện hành; cần chọn một và giữ. **Suy luận**: nếu Wordmet
   cho tìm theo nghĩa tiếng Việt, phần tìm kiếm nên coi "hoà" và "hòa" là một.
6. **App xưng "chúng tôi".** Microsoft dùng "chúng tôi" cho phía sản phẩm ("chúng tôi sẽ kích hoạt…") và nói nó tạo cảm giác gần
   gũi [S1 §2.2.2, §2.2.4]. Apple bảo tránh "we" vì không rõ là ai [S7]. Proton bỏ đại từ, nhưng nút mời liên hệ vẫn dùng "chúng
   tôi" [S4]. MoMo tự gọi "MoMo"; ELSA dùng cả "ELSA" và "chúng tôi" [S26][S28].
7. **"Của tôi" hay "của bạn" trên nhãn.** Microsoft dịch "Remember my password" là "Lưu mật khẩu của tôi" [S1 §2.1.1]. Apple khuyên
   bớt từ sở hữu và không đổi góc nhìn giữa "tôi" và "bạn" [S7]; Proton bỏ từ sở hữu khi được [S4]. Liên quan trực tiếp đến nhãn
   "Từ của tôi" / "Chỉ từ của tôi" đang có, trong khi app gọi người học là "bạn".
8. **Viết tiền.** CLDR: "99.000 ₫" [S25]. Gengo: ký hiệu "đ" sau số, có cách [S5]. Proton: mã tiền sau số ("30 EUR"), không dùng ký
   hiệu [S4].
9. **Viết giờ.** CLDR: "20:00" [S25]. Proton ghi kiểu "9:25 chiều" [S4]. Lời nói hằng ngày là "8 giờ tối" (**Suy luận**, không có
   nguồn).
10. **Từ mượn.** Hướng dẫn Mozilla (sửa lần cuối 2019) dịch "Email" là "Thư điện tử" [S2]; Microsoft dùng "email" [S1]. Proton chọn
    theo tần suất tìm kiếm [S4]; quy định văn bản pháp luật chỉ cho dùng từ nước ngoài khi không có từ Việt hoặc đã thông dụng [S17].
11. **"Xong" hay "Hoàn tất".** Mozilla chọn "hoàn tất" vì ngắn hơn "hoàn thành" và lịch sự hơn "xong" [S2]. Microsoft dùng "Cài đặt
    xong." trong ví dụ [S1 §4.1.14]. Apple dùng "Done" để báo hết luồng [S7].
12. **Đùa trong lỗi.** NN/g: tránh đùa vì người dùng gặp lỗi nhiều lần, chỉ chấp nhận chút mới lạ khi sự cố hiếm và nặng [S10].
    Thùy Dương khen một trang lỗi vui ("Page đang nghỉ ốm") khi dùng đúng chỗ [S15].
13. **Dấu chấm than.** Microsoft có "Có lỗi!" và "Vui lòng thử lại sau!" trong ví dụ [S1 §2.1.3, §2.2.2]. Proton thay mọi "!" bằng "."
    [S4]. Apple bỏ thán từ kiểu "oops" [S7].
14. **Gạch ngang cho khoảng.** Microsoft cho dùng gạch ngang "2-5 giờ chiều" [S1 §4.1.14]. Proton thay bằng "Từ… đến" [S4].
15. **Hán Việt có làm khó đọc không.** Microsoft ưu tiên chữ đời thường, ngắn [S1 §2.1.2, §3]; nghiên cứu Le và cộng sự (2024) không
    thấy tỉ lệ Hán Việt giúp đo độ khó [S24]. Hai nguồn không mâu thuẫn trực tiếp: Microsoft nói về độ quen, nghiên cứu nói về gốc từ.

---

## Rà chữ hiện có

Đều là **đề xuất**; chủ dự án quyết. "Giữ" nghĩa là đã đọc tự nhiên. Mã N# trỏ về mục (b).

### Chữ đang có trong mockup

| Chữ hiện tại | Nhận xét | Đề xuất | Nguyên tắc |
|---|---|---|---|
| Ôn 10 thẻ | Tự nhiên: động từ + số + danh từ, ngắn | Giữ | N7 |
| Học tất cả 18 từ | Tự nhiên | Giữ; nếu chật trên điện thoại: "Học cả 18 từ" | N4, N7 |
| 40 từ lâu chưa ôn | Tự nhiên, gọn; "chưa" đúng ý | Giữ | N6 |
| Thêm từ vừa gặp | Tự nhiên | Giữ | N1 |
| Gõ từ, dán câu bạn gặp. Wordmet tự nhận ra dạng chia. | Hiểu được, nhưng hai mệnh lệnh nối bằng dấu phẩy đọc hơi cụt; "dạng chia" là thuật ngữ, người 13 tuổi có thể chưa hiểu | "Gõ từ bạn vừa gặp. Có câu chứa từ đó thì dán vào luôn. Wordmet tự nhận ra dạng chia, như went → go." (**ASSUMPTION**: ô câu là tùy chọn; nếu bắt buộc thì bỏ "Có… thì") | N4, N17, bảng thuật ngữ "dạng chia" |
| Cần ôn lại | Tự nhiên | Giữ | N1 |
| Đã biết | Tự nhiên | Giữ | N1 |
| Phiên đang dở | Tự nhiên, đời thường | Giữ; nếu cùng chỗ có cả phiên ôn và phiên luyện: "Phiên luyện đang dở" | N18 |
| Hết lượt hôm nay | Tự nhiên, nhưng "lượt" ở đây là phiên luyện, trong khi chỗ khác "lượt" là lượt AI | Theo quyết định Q1 bên dưới, ví dụ "Hết phiên luyện hôm nay" + dòng phụ "Luyện tiếp từ 0:00 ngày mai." | N10, N18 |
| Gói Pro chưa mở bán | Tự nhiên; "chưa" báo sẽ có; "mở bán" là chữ thương mại quen | Giữ | N6 |
| Tra trong 7.799 từ | Tự nhiên cho ô tìm; số đúng chuẩn vi-VN | Giữ; lấy số từ `Intl.NumberFormat('vi-VN')` | N16 |
| Lượt luyện hôm nay | Rõ trong ngữ cảnh, nhưng cùng vấn đề "lượt" | Theo Q1, ví dụ "Phiên luyện hôm nay: 2/3" | N18 |
| Đang phát triển | Đúng cho admin | Giữ ở admin; nếu xuất hiện bên người học: "Sắp có" | N19, N20 |
| Báo lỗi | Tự nhiên, nói đúng việc | Giữ | N7 |
| Tạo nhóm | Tự nhiên | Giữ | N7 |

### Chữ cho các màn sắp làm (Bước 7, admin)

| Chữ dự kiến | Nhận xét | Đề xuất | Nguyên tắc |
|---|---|---|---|
| đang tạo câu | Thiếu hoa đầu câu và dấu "đang chạy" | "Đang tạo câu…" (… là một ký tự) | N14, N15 |
| AI tạm chưa dùng được, câu này dùng dạng khác | Vế đầu tốt. Vế sau: "dạng" trùng với "dạng chia"; chưa nói câu này có tốn lượt không | "AI tạm chưa dùng được. Câu này đổi sang kiểu không cần AI, không tính lượt AI." | N8, N12, N18 |
| Thử lại | Tốt | Giữ | N7 |
| Tra bằng AI | Tự nhiên | Giữ; vì tra nghĩa bằng AI có hạn mức riêng (Bước 5), cân nhắc hiện số còn lại bên cạnh nút, ví dụ "Tra bằng AI · còn 98 lượt" | N10, N12 |
| AI gợi ý | Tốt cho nhãn nguồn: "gợi ý" báo đây là đề xuất, nên kiểm lại | Giữ làm nhãn nguồn; xem Q4 về chữ "gợi ý" | N12, N18 |
| Gợi ý 3 nấc | "Nấc" là chữ của design, người học không cần thấy | Nút "Gợi ý"; khi đã mở: "Gợi ý 1/3", "Gợi ý 2/3", "Gợi ý 3/3"; hết thì "Hết gợi ý" | N4, bảng thuật ngữ "gợi ý" |
| Bản dịch sau khi trả lời | Nên báo là AI dịch, vì bản dịch đi kèm câu AI | Tiêu đề "Bản dịch", nhãn phụ "AI dịch" | N12 |
| Có hơn một đáp án đúng | Tự nhiên, ngắn | Giữ; trong danh sách lý do không có dấu chấm | N15 |
| Đã trả lại 1 lượt | Rõ, nhưng "lượt" chưa nói lượt gì | "Đã trả lại 1 lượt AI." Có chỗ thì thêm lý do: "vì câu bạn báo lỗi đã được xác nhận" | N10, N18 |
| Màn admin: cài đặt, báo lỗi, trả lượt, model, prompt, chi phí AI | Chưa có chữ cụ thể để rà | Theo N20: nhãn tiếng Việt kiểu câu, kèm đơn vị và tên khóa; tiền USD viết "12,40 USD" | N20 |

---

## Bảng thuật ngữ (nháp)

Mỗi khái niệm một từ ưu tiên. **Đề xuất, chủ dự án chốt.** Cột "Tránh" gồm cả chữ tiếng Anh không nên hiện ra giao diện người học.

| Khái niệm | Từ ưu tiên | Tránh | Lý do (một dòng) |
|---|---|---|---|
| nhóm (tập từ người học tự lập) | nhóm | bộ từ, bộ thẻ, danh sách, thư mục, deck | Đã dùng khắp UI ("Tạo nhóm"); "bộ thẻ" gợi bộ làm sẵn |
| từ (một mục từ) | từ | mục từ, từ vựng (cho một từ), word | "Từ vựng" là tập hợp; "mục từ" là chữ của người làm từ điển |
| nghĩa (một nghĩa của từ) | nghĩa | nét nghĩa, sense; "định nghĩa" khi ý là nghĩa | Bước 7 dùng "định nghĩa tiếng Anh" và "nghĩa tiếng Việt" cho hai nấc gợi ý khác nhau, nên giữ tách |
| thẻ (thẻ ôn) | thẻ | flashcard, card; ở màn thanh toán luôn ghi "thẻ ngân hàng" | Ngắn, quen; tránh trùng thẻ thanh toán của Bước 5 |
| ôn (ôn thẻ theo lịch) | ôn (nút, câu ngắn); ôn tập (tiêu đề nếu cần) | ôn luyện, review | Tách khỏi "luyện tập"; "ôn luyện" trộn hai hoạt động |
| luyện tập (làm câu hỏi) | luyện tập (tên mục); luyện (trong cụm "phiên luyện") | thực hành, bài tập, kiểm tra, quiz, practice | Hai hoạt động khác nhau phải có hai động từ khác nhau |
| phiên (một lượt ngồi ôn hoặc luyện) | phiên ôn, phiên luyện; "phiên" một mình chỉ khi ngữ cảnh rõ | phiên đăng nhập (trên UI người học), session; "buổi" (xem ghi chú) | Đã dùng trong design và UI; lỗi đăng nhập nói "Bạn cần đăng nhập lại" |
| lượt | **lượt AI** (luôn có chữ "AI") | "lượt" đứng một mình; credit, xu, điểm | Đang mang ba nghĩa (Q1); gắn "AI" thì hết nhầm |
| gói (Free / Trial / Pro) | gói Pro, gói Miễn phí, dùng thử | gói cước, thuê bao, subscription, tài khoản Pro | "Gói cước", "thuê bao" là chữ nhà mạng |
| từ riêng (từ người học tự thêm) | Trên UI: "Từ của tôi" (nhãn) và "từ bạn tự thêm" (trong câu); tài liệu nội bộ giữ "từ riêng" | "từ riêng" trên UI, từ cá nhân, private word | "Từ riêng" dễ đọc thành "danh từ riêng"; xem Q2 |
| câu đã gặp (câu người học gặp từ ở ngoài) | câu đã gặp; trong câu hướng dẫn: "câu bạn gặp" | câu ngữ cảnh, câu mẫu, câu ví dụ, context sentence | "Câu ví dụ" để dành cho câu của catalog; "ngữ cảnh" là thuật ngữ |
| dạng chia (went của go) | dạng chia; khi hiện cụ thể thì gọi tên: quá khứ, số nhiều, dạng -ing | biến thể, biến tố, inflection, "dạng" đứng một mình | Quen từ "chia động từ" ở trường; lần đầu kèm ví dụ went → go |
| kiểu câu (loại câu hỏi luyện tập) | kiểu câu | dạng, dạng câu, dạng bài | Tránh trùng "dạng chia" (thêm vào bảng vì câu thông báo AI cần nó) |
| gợi ý (khi làm câu) | gợi ý; "Gợi ý 1/3" | mẹo, trợ giúp, hint, nấc | "Nấc" là chữ của design |
| báo lỗi (người học chỉ ra câu sai) | báo lỗi (động từ và danh từ: "12 báo lỗi chưa xem") | báo cáo, phản hồi, khiếu nại, report | Nói đúng việc; "báo cáo" nghe như văn bản |
| trả lượt (trả lượt AI cho câu lỗi) | trả lại lượt AI ("Đã trả lại 1 lượt AI") | hoàn tiền, hoàn trả, bồi hoàn, refund | Không dính tiền thật; "hoàn tiền" làm người học tưởng được trả tiền |
| AI gợi ý (nhãn nguồn của nghĩa do AI tra) | AI gợi ý | AI tạo, AI-generated, máy dịch, trí tuệ nhân tạo | "Gợi ý" nói rõ đây là đề xuất có thể sai, người học nên kiểm [S12] |

Ghi chú về "phiên": "phiên" có sắc thái hơi kỹ thuật (phiên bản, phiên giao dịch); "buổi" ("buổi học") là chữ đời thường hơn cho một
lần ngồi học. Đề xuất vẫn giữ "phiên" vì design và mọi màn đã dùng, và "buổi" gợi thời lượng dài. Đây là nhận xét, không có nguồn.

---

## Việc cần chủ dự án chốt

Nêu các phương án, không xếp hạng; bảng thuật ngữ ở trên chỉ là bản nháp để có chỗ bắt đầu.

- **Q1. "Lượt" mang ba nghĩa.** (a) "lượt" chỉ dùng cho lượt AI; số phiên luyện mỗi ngày gọi bằng "phiên" ("Phiên luyện hôm nay:
  2/3"); một lần trả lời gọi là "câu" hay "lần trả lời". (b) giữ "lượt luyện" và "lượt AI", luôn có chữ đi kèm, "lượt" không bao giờ
  đứng một mình. (c) cách khác của bạn.
- **Q2. Nhãn cho từ người học tự thêm.** "Từ của tôi" (đang có), "Từ của bạn", "Từ tự thêm", "Từ riêng".
- **Q3. Tên gói Free và Trial trên UI.** "Miễn phí" / "Dùng thử", hay giữ "Free" / "Trial".
- **Q4. Chữ "gợi ý" dùng cho cả gợi ý làm bài lẫn nhãn "AI gợi ý".** Giữ cả hai, hay đổi một bên (ví dụ nhãn "AI tra").
- **Q5. Kiểu đặt dấu thanh**: "hoà, thuỷ, khoẻ" (sách giáo khoa 2018) hay "hòa, thủy, khỏe" (Microsoft, Mozilla).
- **Q6. Thứ trong tuần giữa câu**: "thứ Bảy" (Nghị định 30) hay "Thứ Bảy" (CLDR, kết quả mặc định của `Intl`).
- **Q7. Giờ trong câu**: "20:00" hay "8 giờ tối".
- **Q8. Tiền VND khi mở bán Pro**: "99.000 ₫", "99.000đ" hay "99.000 VND".

---

## (d) Nguồn

Đọc ngày 21/10/2026, trừ khi ghi khác. "Ngày nguồn" là ngày đăng hoặc cập nhật mà trang tự ghi.

| # | Nguồn | Loại | Ngày nguồn | URL |
|---|---|---|---|---|
| S1 | Microsoft, *Vietnamese Localization Style Guide* (60 trang; trích theo số mục) | Hướng dẫn chính thức | PDF sửa 05/09/2024 (metadata) | https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf |
| S2 | Mozilla l10n, *Style Guide Vietnamese (vi)* | Hướng dẫn cộng đồng mã nguồn mở | Commit cuối 03/07/2019 | https://github.com/mozilla-l10n/styleguides/blob/main/docs/vi/README.md |
| S3 | Mozilla l10n, *Hướng dẫn của Firefox về viết nội dung phù hợp với địa phương* | Hướng dẫn cộng đồng | Không ghi | https://github.com/mozilla-l10n/styleguides/blob/main/docs/vi/firefox_marketing.md |
| S4 | Proton, *Guidance for Vietnamese* | Hướng dẫn cho người dịch | 28/10/2025 | https://localize.proton.me/t/guidance-for-vietnamese/3345 |
| S5 | Gengo, *Style guide* (tiếng Việt) | Hướng dẫn của công ty dịch | Không ghi | https://gengo.com/vi/?p=85205 |
| S6 | Onetime Secret, *Hướng dẫn dịch thuật cho tiếng Việt* | Hướng dẫn mã nguồn mở | Tạo 20/01/2026 | https://docs.onetimesecret.com/vi/translations/for-translators |
| S7 | Apple, *Human Interface Guidelines: Writing* (đọc qua JSON của trang) | Hướng dẫn nền tảng (tiếng Anh) | Cập nhật 16/12/2025 | https://developer.apple.com/design/human-interface-guidelines/writing |
| S8 | Microsoft Writing Style Guide, *please* | Hướng dẫn chính thức (tiếng Anh) | 19/01/2018 | https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/p/please |
| S9 | Microsoft Writing Style Guide, *Capitalization* | Hướng dẫn chính thức (tiếng Anh) | 26/08/2024 | https://learn.microsoft.com/en-us/style-guide/capitalization |
| S10 | Tim Neusesser, Evan Sunwall (NN/g), *Error-Message Guidelines* | Nghiên cứu UX | 14/05/2023 | https://www.nngroup.com/articles/error-message-guidelines/ |
| S11 | Jakob Nielsen (NN/g), *Confirmation Dialogs Can Prevent User Errors — If Not Overused* | Nghiên cứu UX | 18/02/2018, rà lại 07/08/2026 | https://www.nngroup.com/articles/confirmation-dialog/ |
| S12 | Google PAIR, *People + AI Guidebook: Errors + Graceful Failure* | Hướng dẫn thiết kế AI | Không ghi | https://pair.withgoogle.com/chapter/errors-failing/ |
| S13 | Thùy Dương, *Đi tìm tính cách và giọng điệu cho ứng dụng* (Great UX Writing #8) | UX writer Việt | 08/11/2022 | https://greatuxwriting.substack.com/p/ieu-gi-lam-nen-su-khac-biet-ve-noi |
| S14 | Thùy Dương, *Một vài nguyên tắc viết đơn giản, nhưng hiệu quả bất ngờ* | UX writer Việt | 06/11/2024 | https://greatuxwriting.substack.com/p/cach-viet-ngan-gon-de-hieu |
| S15 | Thùy Dương, *Một sai lầm phổ biến của UX Writer mới vào nghề* | UX writer Việt | 02/11/2024 | https://greatuxwriting.substack.com/p/mot-sai-lam-pho-bien-cua-ux-writer |
| S16 | Nghĩa KB, *Tiếng Việt trên nhiều bài báo cũng đang khá "lạ"* (Tuổi Trẻ) | Báo, về văn dịch | 26/08/2010 | https://tuoitre.vn/tieng-viet-tren-nhieu-bai-bao-cung-dang-kha-la-397288.htm |
| S17 | TS. Nguyễn Thị Hà, *Những yếu tố tác động đến việc sử dụng ngôn ngữ trong văn bản quy phạm pháp luật* (trích Luật Ban hành VBQPPL 2015 Điều 8, Nghị quyết 351/2017, Nghị định 34/2016) | Tạp chí Quản lý nhà nước | 20/03/2025 | https://www.quanlynhanuoc.vn/2025/03/20/nhung-yeu-to-tac-dong-den-viec-su-dung-ngon-ngu-trong-van-ban-quy-pham-phap-luat/ |
| S18 | LuatVietnam, *Cách viết hoa thứ, tháng đúng chuẩn Nghị định 30/2020/NĐ-CP* (trích Phụ lục I, II) | Bài pháp luật, trích văn bản gốc | 30/10/2024 | https://luatvietnam.vn/hanh-chinh/cach-viet-hoa-thu-thang-dung-chuan-nghi-dinh-30-2020-nd-cp-570-99688-article.html |
| S19 | Quyết định 1989/QĐ-BGDĐT (25/05/2018) về chính tả trong chương trình, sách giáo khoa (toàn văn trên Hoatieu) | Văn bản nhà nước | 25/05/2018 | https://hoatieu.vn/phap-luat/quyet-dinh-1989-qd-bgddt-2018-quy-dinh-chinh-ta-chuong-trinh-sach-giao-khoa-giao-duc-pho-thong-214530 |
| S20 | Wiktionary, *mình* (mục tiếng Việt) | Từ điển mở | Không ghi | https://en.wiktionary.org/wiki/m%C3%ACnh |
| S21 | Wiktionary, *bạn* (mục tiếng Việt) | Từ điển mở | Không ghi | https://en.wiktionary.org/wiki/b%E1%BA%A1n |
| S22 | Rosen Ivanov (1-StopAsia), *Adapting Content for Vietnam: Formal vs. Informal Language* (PDF) | Công ty bản địa hóa | PDF tạo 28/08/2025 (metadata) | https://www.1stopasia.com/blog/wp-content/uploads/articles-download/Adapting-Content-for-Vietnam-Formal-vs-Informal-Language.pdf |
| S23 | Justin Duckers (AppTweak), *How to Localize Your App for Vietnam* | Bài ASO | 26/02/2024 | https://www.apptweak.com/en/aso-blog/how-to-localize-your-app-in-vietnamese |
| S24 | Hung Tuan Le và cộng sự, *A study of Vietnamese readability assessing through semantic and statistical features* (arXiv:2411.04756) | Nghiên cứu (preprint) | 07/11/2024 | https://arxiv.org/abs/2411.04756 |
| S25 | Dữ liệu CLDR qua `Intl` của Node v24.11.0 (ICU 77.1, CLDR 47.0), chạy trong phiên này | Dữ liệu chuẩn, kiểm trực tiếp | Chạy 21/10/2026 | https://cldr.unicode.org/ |
| S26 | MoMo, trang chủ (quan sát chữ thật) | Thực tế công ty Việt | Đọc 21/10/2026 | https://www.momo.vn/ |
| S27 | Zalopay, trang chủ (quan sát chữ thật) | Thực tế công ty Việt | Đọc 21/10/2026 | https://zalopay.vn/ |
| S28 | ELSA Speak Việt Nam, trang chủ (quan sát chữ thật) | Thực tế công ty edtech gốc Việt | Đọc 21/10/2026 | https://vn.elsaspeak.com/ |
| S29 | Google, *Khám phá thiết bị Android của bạn* (Trợ giúp Android, tiếng Việt) | Chữ tiếng Việt của Google | Đọc 21/10/2026 | https://support.google.com/android/answer/9079644?hl=vi |
| S30 | Apple, trang hỗ trợ iPhone tiếng Việt (vị trí) | Chữ tiếng Việt của Apple | Đọc 21/10/2026 | https://support.apple.com/vi-vn/guide/iphone/iph3dd5f9be/ios |
| S31 | SlimCRM, *UX Writing là gì? Tầm quan trọng, lợi ích và ví dụ* | Blog công ty phần mềm Việt | 12/07/2024 | https://blog.slimcrm.vn/chuyendoiso/UX_Writing |
| S32 | Khúc Cẩm Huyên (Keyframe), *Giải mã 5 bí ẩn về UX Writer* (ví dụ tooltip phải gói trong 2 dòng) | UX writer Việt | Không ghi rõ | https://keyframe.vn/bai-viet/giai-ma-5-bi-an-ve-ux-writer-30.html |

Tài liệu nội bộ dùng để đối chiếu chữ và nghĩa: `docs/mockups/2026-10-21/figma-review.md`, `docs/mockups/2026-10-16/UI-CONTEXT.md`
(working tree), design Bước 5 và Bước 7 trên `origin/dev` (`docs/superpowers/specs/2026-10-19-buoc-5-entitlements-design.md`,
`docs/superpowers/specs/2026-10-21-buoc-7-practice-ai-content-ai-design.md`).

### Chưa đọc được hoặc không tìm thấy

- **Apple**: không tìm thấy hướng dẫn văn phong tiếng Việt công khai. Bộ glossary bản địa hóa của Apple
  (https://developer.apple.com/localization/resources) theo các nguồn cũ cần đăng nhập Apple Developer; chưa thử, **ASSUMPTION**.
- **Google**: không tìm thấy hướng dẫn tiếng Việt công khai. Trang Material Design 3 (content design) chỉ chạy bằng JavaScript, công
  cụ của phiên này không đọc được; dùng chữ tiếng Việt thật trên trang trợ giúp Android thay thế [S29].
- **MoMo, Zalo, Tiki, VNG, Base, Grab Việt Nam**: không tìm thấy bộ hướng dẫn UX writing công khai. Chỉ quan sát chữ trên trang
  chủ (trang marketing, không phải màn app) [S26][S27][S28].
- **Bài phỏng vấn UX writer Gojek (Nguyễn Minh Nhựt) trên Advertising Vietnam**: trang trả 403, không đọc được
  (https://advertisingvietnam.com/khi-content-writer-re-huong-lam-ux-writer-tao-ra-y-tuong-dot-pha-nhung-phai-biet-cach-don-gian-hoa-san-pham-l18662).
- **Wiki Mozilla nhóm tiếng Việt** (https://wiki.mozilla.org/L10n:Teams:vi): trả 503; đã đọc bản hướng dẫn trên GitHub thay thế [S2].
- **Hướng dẫn tiếng Việt của WordPress Polyglots, translatewiki**: không tìm thấy trang hướng dẫn.
- **Công thức độ khó văn bản tiếng Việt của Nguyễn và Henkin (1982, 1985)**: chỉ thấy trích dẫn, không đọc được bản gốc.
- **Nhóm cộng đồng UX writing Việt trên Facebook, LinkedIn**: cần đăng nhập, không đọc.
