# Research: chặn dùng thử lại và giữ hồ sơ giao dịch sau khi xóa tài khoản

**Ngày:** 28/10/2026 · **Trạng thái:** research, **chưa phải quyết định**, không chọn phương án. **Không phải tư vấn pháp lý.**
**Đầu vào cho:** brainstorm Bước 8 (xóa tài khoản). Không lặp lại `research_notes/Phát hành app iOS và Android/policy_compliance.md` §2, §9
(Apple 5.1.1(v), Google Play, hạn 20 ngày của Nghị định 356) và `LEGAL_PAGES_RESEARCH_2026-10-11.md`; file này chỉ bổ sung.

**Cách đọc nguồn.** Mọi nguồn ở cuối file được mở trong phiên này (28/10/2026), trừ chỗ ghi **(chỉ tóm tắt tìm kiếm)**. Văn bản luật Việt Nam
đọc qua bản sao (hrspring.vn, hethongphapluat.com, caselaw.vn, luatvietnam.vn); Công báo và vbpl.moj.gov.vn không mở được (DNS lỗi), thuvienphapluat
trả 403. Trang hethongphapluat.com có đoạn quảng cáo "hệ thống AI"; chỉ dùng phần chữ luật. Mọi điểm luật là cách đọc của trợ lý, cần luật sư đối chiếu.

**Hiện trạng code (từ `docs/preparation/BUOC_8_CODE_FACTS_2026-10-28.md` §7):** `trial_history` có `user_id` unique và `(provider, payment_fingerprint)`
unique khi có fingerprint; không kiểm email. `billing_transactions` lưu số tiền, gói, ngày, `provider_transaction_id`; `billing_events.raw_payload`
có thể chứa email người mua. Xóa tài khoản xóa cả `trial_history` thì một người xóa rồi đăng ký lại cùng email được trial mới.

---

## 1. Câu 1: giữ một dấu tối thiểu để chặn trial lần hai sau khi xóa

### 1.1 Kết luận ngắn

1. Cả ba dạng dấu (fingerprint thẻ, hash/HMAC email, hay cả hai) **gần như chắc chắn vẫn là dữ liệu cá nhân** với chính app, vì mục đích của dấu
   là nhận lại cùng một người. Luật Việt Nam định nghĩa dữ liệu cá nhân gồm cả thông tin "giúp xác định" một người; EDPB nói dữ liệu đã
   pseudonymise vẫn là dữ liệu cá nhân. Nghĩa là giữ được hay không phụ thuộc vào **căn cứ giữ lại**, không phải vào việc đã băm.
2. Căn cứ có thể viện dẫn: Việt Nam có Điều 14 khoản 2 và Điều 19 khoản 1 điểm a, d Luật 91/2025 (từ chối xóa khi cần bảo vệ quyền lợi chính đáng,
   hoặc để thực hiện thỏa thuận); GDPR có Recital 47 (chống gian lận là lợi ích chính đáng). **Chưa nguồn nào nói thẳng "lạm dụng trial" thuộc các
   căn cứ này.** Đây là câu cho luật sư.
3. Google Play cho giữ dữ liệu sau xóa vì "fraud prevention" nếu nói rõ cho người dùng. Trang xóa tài khoản của Apple chỉ nhắc dữ liệu luật bắt
   buộc giữ, không nhắc chống gian lận. Apple coi email đã hash vẫn là "Email Address" khi khai App Privacy.
4. Mức bảo vệ thật sự thấp hơn vẻ ngoài: trên iOS và Android Pro phải bán qua store, và **store tự quyết ai được trial**, app không cần (và không
   có) fingerprint thẻ. Dấu của app chỉ có tác dụng ở kênh web. Paddle không trả fingerprint thẻ. Hash email dễ lách bằng một email mới.

### 1.2 Dấu còn là dữ liệu cá nhân không

| Nguồn | Nói gì | Áp vào dấu trial |
|---|---|---|
| Luật 91/2025/QH15, Điều 2 khoản 1 | Dữ liệu cá nhân là thông tin xác định **hoặc giúp xác định** một con người cụ thể; sau khi khử nhận dạng thì không còn là dữ liệu cá nhân | Hash email do app tự tính lại được từ email đăng ký mới để khớp đúng người cũ: đó là "giúp xác định" (suy luận) |
| Luật 91/2025, Điều 2 khoản 11 | Khử nhận dạng là đổi hoặc xóa thông tin để tạo dữ liệu mới **không thể** xác định hoặc giúp xác định một người | Dấu trial được tạo ra chính để nhận lại người đó, nên khó gọi là đã khử nhận dạng (suy luận) |
| Nghị định 356/2025, Điều 11 khoản 2 điểm b | Với blockchain: chỉ lưu dữ liệu đã khử nhận dạng **hoặc** lưu giá trị băm | Nghị định coi hash là một biện pháp bảo vệ, nhưng đặt nó bên cạnh, không đồng nhất với "đã khử nhận dạng" (suy luận) |
| EDPB Guidelines 01/2025 (bản lấy ý kiến, thông qua 16/01/2025) | Dữ liệu pseudonymise mà gán lại được cho người bằng thông tin bổ sung vẫn là dữ liệu cá nhân. Hash không khóa bị dò ngược bằng cách băm các định danh đã biết rồi so khớp; nên dùng hàm một chiều có khóa bí mật (MAC/HMAC) với khóa đủ ngẫu nhiên | Hash email trần (SHA-256) gần như vô dụng về bảo mật vì email dễ đoán; HMAC có khóa tốt hơn nhưng vẫn là dữ liệu cá nhân với app (giữ khóa) |
| CJEU C-413/23 P, EDPS v SRB (04/9/2025), qua bài của Clifford Chance | Dữ liệu pseudonymise có thể **không** là dữ liệu cá nhân với bên nhận không có cách nhận dạng lại; bên giữ khóa thì vẫn là | App vừa giữ khóa vừa dùng dấu để khớp lại, nên không hưởng hướng đọc "tương đối" này (suy luận) |

Fingerprint thẻ của Stripe: app không đọc ngược được ra số thẻ, nhưng Stripe giữ ánh xạ, và app dùng nó để nhận ra cùng tấm thẻ ở tài khoản mới.
Theo hai nguồn trên, đó vẫn là dữ liệu pseudonymise, tức vẫn là dữ liệu cá nhân (suy luận, chưa nguồn nào nói riêng về fingerprint thẻ).

### 1.3 Có được giữ lại khi người dùng đã yêu cầu xóa không

**Việt Nam (Luật 91/2025, bản sao hrspring.vn):**
- Điều 14 khoản 2: không thực hiện yêu cầu xóa trong các trường hợp của Điều 19, hoặc khi việc xóa vi phạm nguyên tắc ở Điều 4 khoản 3.
- Điều 19 khoản 1 điểm a: xử lý không cần đồng ý để bảo vệ quyền, lợi ích chính đáng của mình trước hành vi xâm phạm, một cách cần thiết; bên
  kiểm soát **phải chứng minh** trường hợp này. Điểm d: thực hiện thỏa thuận của chủ thể với tổ chức, cá nhân liên quan.
- Điều 4 khoản 3 điểm c: chủ thể thực hiện quyền không được xâm phạm quyền, lợi ích hợp pháp của tổ chức, cá nhân khác.
- Điều 14 khoản 5: nếu không xóa được vì lý do chính đáng thì phải thông báo cho chủ thể.
- Điều 3 khoản 3: chỉ lưu trong thời gian phù hợp với mục đích xử lý.
- Suy luận: hướng có thể dùng là Terms ghi "mỗi người một lần dùng thử" (thỏa thuận, điểm d) cộng với điểm a; còn việc nhận trial lần hai có
  phải "hành vi xâm phạm" không thì **chưa rõ**.

**GDPR (tham chiếu, nếu có người dùng EU):** Điều 17(1)(a) chỉ buộc xóa khi dữ liệu không còn cần cho mục đích; Recital 47 nói xử lý thật sự cần
để chống gian lận là lợi ích chính đáng. ICO cho phép, với marketing, giữ một "suppression list" gồm **vừa đủ** thông tin để tôn trọng lựa chọn
của người đó về sau, và không có quyền tự động xóa khỏi danh sách này. Dấu trial giống về hình thức nhưng ICO không nói về trial; dùng làm
phép so sánh, không phải căn cứ. Trang của ICO về quyền xóa không nhắc chống gian lận; bản sao lưu phải được đưa "beyond use".

### 1.4 Apple và Google Play nói gì

- **Apple, trang "Offering account deletion":** chỉ nói dữ liệu **luật bắt buộc** giữ; nếu vậy phải cho người dùng biết cái gì giữ, cái gì không.
  Trang không nhắc fraud hay security. Apple có chấp nhận lý do "chống lạm dụng trial" khi review không thì **chưa xác minh**.
- **Apple, App Privacy details:** mục đích "App Functionality" có ghi rõ ngăn gian lận. Loại "Email Address" có ghi **gồm cả email đã hash**.
  Dữ liệu coi là "linked to the user" trừ khi đã bỏ định danh trước khi thu và app không tìm cách nối lại; dấu trial sinh ra để nối lại nên phải
  khai là linked (suy luận).
- **Google Play, account deletion:** app có thể giữ một số dữ liệu vì lý do chính đáng như security, fraud prevention, regulatory compliance,
  nhưng phải nói rõ cách giữ, ví dụ trong privacy policy.
- **Google Play, Data safety:** dữ liệu thu dưới dạng pseudonymous vẫn phải khai; vẫn được chọn nhãn "người dùng yêu cầu xóa được" dù giữ lại
  một phần vì tuân thủ luật hoặc **abuse prevention**; có mục đích "Fraud prevention, security, and compliance".

### 1.5 Bảo vệ thật sự được bao nhiêu

| Kênh | Ai quyết ai được trial | Dấu của app có tác dụng không |
|---|---|---|
| iOS, Apple IAP (bắt buộc ở Việt Nam, xem `in_app_payments.md`) | Apple: mỗi người chỉ được **một** introductory offer cho mỗi subscription group, kể cả khách quay lại | Gần như không: xóa tài khoản Wordmet không đặt lại quyền của Apple Account (suy luận); app cũng không nhận thông tin thẻ |
| Android, Google Play Billing | Offer "New customer acquisition": Play xét người dùng chưa từng có subscription này; Play có thể phát hiện người lách. Nếu chọn "Developer determined" thì app tự xét | Chỉ khi chọn "Developer determined"; app không nhận fingerprint thẻ |
| Web, Stripe | App tự xét | `card.fingerprint` định danh **số thẻ**, dùng được để thấy hai khách hàng dùng cùng thẻ. Với Apple Pay, Google Pay thì có thể là số đã token hóa, nên cùng thẻ qua ví khác ra fingerprint khác. Stripe Radar có sẵn control "free trial abuse" (chặn trial rủi ro cao, gồm cùng thẻ nhiều tài khoản, thẻ trả trước, thẻ ảo); giá và vùng hỗ trợ chưa kiểm |
| Web, Paddle | App tự xét | Payment method đã lưu của Paddle chỉ có loại thẻ, 4 số cuối, hạn, tên chủ thẻ; **không có fingerprint**. Không tìm thấy tài liệu chống lạm dụng trial của Paddle |
| Ví Việt Nam (MoMo, ZaloPay, VNPay) | App tự xét | **Chưa nghiên cứu** họ có trả định danh ổn định nào không |

Email: Gmail bỏ qua dấu chấm (`john.smith` và `johnsmith` là một hộp thư) và nhận thư gửi tới `ten+bat_ky@`. Chuẩn hóa (chữ thường, bỏ dấu chấm và
phần `+...` với gmail.com) chặn được hai mẹo này, nhưng tạo một email mới là miễn phí; Stripe cũng viết rằng chỉ kiểm email thì yếu và khuyên
kết hợp nhiều tín hiệu (đọc trong kết quả tìm kiếm, trang Stripe resources **chưa mở**). Kết luận (suy luận): (c) chặn người lười, không chặn
người cố ý; (b) chặn tốt hơn nhưng chỉ ở web với Stripe, và lách được bằng thẻ hoặc ví khác.

### 1.6 Sản phẩm khác ghi gì

| Sản phẩm | Ghi gì (diễn giải) | Nguồn |
|---|---|---|
| Netflix (Terms of Use, cập nhật 10/4/2026) | Netflix tự quyết ai được offer; hộ có tài khoản hiện tại hoặc gần đây có thể không được; có thể dùng device ID, phương thức thanh toán, thông tin liên hệ để xét | Mở |
| Spotify (Privacy Policy, hiệu lực 01/7/2026) | Sau khi xóa vẫn giữ một số dữ liệu lâu hơn cho mục đích hẹp; có thể từ chối xóa khi cần để bảo vệ dịch vụ khỏi gian lận. Không nhắc riêng trial | Mở |
| Google (trang lưu giữ dữ liệu) | Giữ một số dữ liệu lâu hơn để chống gian lận, lạm dụng; dữ liệu thanh toán giữ theo yêu cầu thuế, kế toán. Không có con số | Mở |
| Proton (Privacy Policy, 12/5/2026) | Email, số điện thoại, IP dùng để xác minh chống spam, nếu lưu lâu thì chỉ lưu dạng hash mật mã; không nói về trial | Mở |
| Freebuff (sản phẩm nhỏ, policy cập nhật 18/10/2026) | Khi xóa tài khoản giữ **keyed hash** của email, số điện thoại, device ID cùng trạng thái giới hạn, để xóa tài khoản không đặt lại giới hạn; giữ "lâu chừng nào còn cần hợp lý" | Mở |
| Optimeta | Giữ hash fingerprint vô thời hạn để chặn lạm dụng trial sau khi xóa | **Chỉ tóm tắt tìm kiếm** |

Không tìm được privacy policy của một app học ngôn ngữ lớn (Duolingo, Babbel, ELSA) nói về dấu trial sau khi xóa; Duolingo chỉ thấy qua bản
tóm tắt bên thứ ba.

### 1.7 Giữ bao lâu

Không nguồn nào đã mở đưa ra con số chung. Các mẫu thấy được: không nêu thời hạn (Google, Spotify), "lâu chừng nào còn cần" (Freebuff), vô thời hạn
(Optimeta, chỉ tóm tắt tìm kiếm). Ràng buộc duy nhất có văn bản là nguyên tắc lưu "phù hợp với mục đích" (Luật 91/2025 Điều 3 khoản 3). Các cách
đặt thời hạn có thể bàn (suy luận, chưa chọn): theo vòng đời ưu đãi (bỏ dấu khi đổi chính sách trial), theo thời gian cố định (ví dụ 1–3 năm),
hoặc vô thời hạn. Vô thời hạn khó chứng minh là "cần thiết" với một trial 7 ngày.

---

## 2. Câu 2: giữ hồ sơ giao dịch thanh toán sau khi xóa (Việt Nam)

### 2.1 Kết luận ngắn

1. Luật Kế toán 2015 áp cho cả **hộ kinh doanh** và doanh nghiệp: chứng từ dùng ghi sổ, sổ kế toán, báo cáo tài chính giữ **ít nhất 10 năm**;
   chứng từ không dùng trực tiếp để ghi sổ giữ ít nhất 5 năm; tính từ ngày kết thúc kỳ kế toán năm. Theo một nguồn thứ cấp, chế độ kế toán mới
   cho hộ kinh doanh (Thông tư 152/2025) ghi tối thiểu **5 năm**.
2. Luật Quản lý thuế 2025: quá thời hiệu phạt vẫn phải nộp đủ thuế thiếu trong **10 năm** trở về trước kể từ khi phát hiện. Đây là thời hạn
   truy thu, không phải thời hạn lưu; nhưng là lý do thực tế để giữ chứng cứ doanh thu 10 năm (suy luận).
3. Nghĩa vụ giữ nằm ở **tài liệu kế toán** (hóa đơn, chứng từ, báo cáo payout, sổ), không nhất thiết ở bảng `billing_transactions` của app. Bán
   qua Apple, Google hay Paddle thì bên đó bán cho người mua; tài liệu của Wordmet là báo cáo và khoản payout (suy luận cho Apple, Google).
4. Luật bảo vệ dữ liệu cho phép giữ khi luật khác bắt buộc (Luật 91/2025 Điều 3 khoản 3, Điều 14 khoản 1 điểm c), nhưng phải báo người dùng.

### 2.2 Thời hạn lưu

| Văn bản | Nội dung | Nguồn |
|---|---|---|
| Luật Kế toán 88/2015/QH13, Điều 2 khoản 4, 6 | Áp dụng cho doanh nghiệp, **hộ kinh doanh**, tổ hợp tác | hethongphapluat.com |
| Luật Kế toán, Điều 41 khoản 1, 3, 5 | Bảo quản đầy đủ, an toàn; đưa vào lưu trữ trong 12 tháng sau kỳ kế toán năm; ít nhất 5 năm (tài liệu quản lý, chứng từ không dùng trực tiếp ghi sổ), ít nhất 10 năm (chứng từ dùng trực tiếp ghi sổ và lập báo cáo tài chính, sổ, báo cáo tài chính năm), vĩnh viễn (tài liệu có tính sử liệu) | hethongphapluat.com |
| Nghị định 174/2016, Điều 10, 12, 13, 15 | Lưu điện tử được nếu an toàn, bảo mật, tra cứu được suốt thời hạn. Điều 12 (5 năm): phiếu thu, phiếu chi… không lưu trong bộ tài liệu kế toán. Điều 13 (10 năm): chứng từ dùng ghi sổ, bảng kê, sổ chi tiết và tổng hợp, báo cáo; và mọi tài liệu khác không thuộc Điều 12, 14. Điều 15: tính từ ngày kết thúc kỳ kế toán năm | caselaw.vn |
| Thông tư 152/2025/TT-BTC (ban hành 31/12/2025, hiệu lực 01/01/2026, thay Thông tư 88/2021) | Chế độ kế toán hộ kinh doanh, cá nhân kinh doanh; tài liệu kế toán lưu tối thiểu 05 năm; ghi sổ giấy hoặc điện tử | **Chỉ nguồn thứ cấp** (sapo.vn), chưa mở văn bản |
| Luật Quản lý thuế 108/2025/QH15 (hiệu lực 01/7/2026; Điều 13 và hóa đơn điện tử của hộ, cá nhân kinh doanh từ 01/01/2026) | Điều 44 khoản 7: thời hiệu phạt 2 năm (thủ tục), 5 năm (trốn thuế, khai sai). Khoản 8: vẫn phải nộp đủ thuế thiếu trong 10 năm trở về trước kể từ ngày phát hiện. Điều 12 khoản 5: khai bổ sung trong 5 năm | hrspring.vn (file .docx của Luật) |

### 2.3 Hộ kinh doanh so với công ty

- Cả hai thuộc phạm vi Luật Kế toán (Điều 2). Khác nhau ở chế độ kế toán chi tiết: công ty theo Nghị định 174 (5/10 năm như trên); hộ kinh doanh
  theo Thông tư 152/2025, mà nguồn thứ cấp nói là tối thiểu 5 năm. **Chưa đọc văn bản Thông tư** để biết nó có giữ mức 10 năm cho một loại chứng
  từ nào không, và mức 5 năm của Thông tư so thế nào với mức 10 năm của Luật.
- **Cá nhân chưa đăng ký hộ kinh doanh** (tình trạng hiện nay của chủ dự án, theo `LEGAL_PAGES_RESEARCH_2026-10-11.md` §1): chưa nghiên cứu nghĩa
  vụ kế toán. `in_app_payments.md` ghi: với cá nhân, hộ kinh doanh ở Việt Nam, Apple, Google khấu trừ thuế thay; với công ty thì công ty tự kê khai.
- Luật 91/2025 miễn một số nghĩa vụ (DPIA, CTIA) cho hộ kinh doanh, doanh nghiệp siêu nhỏ; không có miễn trừ nào liên quan đến xóa dữ liệu
  (xem `policy_compliance.md` §9).

### 2.4 Giữ ở dạng không định danh có đủ không

- **Hóa đơn có phải ghi người mua không.** Nghị định 123/2020 Điều 10 khoản 5, sửa bởi Nghị định 70/2025 (hiệu lực 01/6/2025), theo bài của
  luatvietnam.vn: người mua không có mã số thuế thì không ghi mã số thuế; người mua **cung cấp** mã số thuế hoặc số định danh cá nhân thì phải
  ghi; khoản 14 miễn thông tin người mua cho một số trường hợp bán lẻ (siêu thị, xăng dầu, tem vé…). Bán dịch vụ online cho cá nhân có phải ghi
  **tên** người mua không thì **chưa xác minh** (chưa mở văn bản Nghị định). Hóa đơn đã phát hành là tài liệu kế toán, không được sửa để bỏ tên.
- **Ai phát hành hóa đơn cho người mua.** Paddle là merchant of record: Paddle bán cho người mua và nhận rủi ro thuế; mỗi lần payout Paddle tự lập
  "reverse invoice" gửi người bán. Stripe: Wordmet là người bán, phải tự lập hóa đơn nếu thuộc diện. Apple, Google: vai trò người bán ở Việt Nam
  **chưa xác minh** trong phiên này.
- **Bảng của app.** Một bảng chỉ còn số tiền, ngày, gói, `provider_transaction_id` không có `user_id`: theo Luật Kế toán đây không thay được
  chứng từ gốc nằm ở provider hoặc hệ thống hóa đơn, mà chỉ là bản đối chiếu (suy luận). `provider_transaction_id` vẫn tra ngược được ra
  người mua trên dashboard của provider, nên vẫn là dữ liệu cá nhân dạng pseudonymous theo Điều 2 khoản 1 (suy luận); giữ được vì luật kế toán
  nếu nó thật sự là một phần hồ sơ kế toán. `billing_events.raw_payload` có thể chứa email: là phần nên tách bạch khi quyết định giữ gì.

### 2.5 Luật về xóa nói gì về lưu theo luật khác

- Luật 91/2025: Điều 3 khoản 3 (lưu theo mục đích, "trừ trường hợp pháp luật có quy định khác"); Điều 14 khoản 1 điểm c (xóa khi **hết** thời hạn
  lưu theo pháp luật); Điều 14 khoản 5 (không xóa được vì lý do chính đáng thì phải báo chủ thể).
- Nghị định 356/2025 (qua luatvietnam.vn): Điều 5 khoản 4 (phản hồi yêu cầu xóa trong 2 ngày làm việc, thực hiện trong 20 ngày, 30 ngày nếu cần bên
  xử lý hoặc bên thứ ba); Điều 9 khoản 2 điểm c (bên kiểm soát phải có chính sách lưu, xóa, hủy đúng pháp luật). Không thấy danh sách riêng các
  trường hợp được giữ lại (bản đọc được bị cắt sau Điều 37).
- Apple: dữ liệu luật bắt buộc giữ thì phải nói rõ cái gì giữ, cái gì không. Google Play: nói rõ trong privacy policy.
- GDPR Điều 17(3)(b) chỉ miễn xóa khi nghĩa vụ đến từ luật **EU hoặc nước thành viên**; nghĩa vụ kế toán Việt Nam tự nó không phải căn cứ này với
  người dùng EU (suy luận, cần luật sư nếu có người dùng EU). Điều 17(3)(e) (khiếu kiện) là căn cứ khác.

---

## 3. Bảng tổng hợp để quyết định

| Phương án | Lưu gì sau khi xóa | Bảo vệ được gì | Rủi ro pháp lý và store | Privacy policy phải nói gì |
|---|---|---|---|---|
| (a) Không giữ gì | Không gì của trial | Không chặn ở web; iOS và Android vẫn do store chặn (Apple mỗi người một offer mỗi group; Play xét "new customer" nếu không chọn "Developer determined") | Thấp nhất; đúng với chữ "xóa ngay" của SR11 | Không cần mục riêng; chỉ ghi dữ liệu luật buộc giữ (mục 2) |
| (b) Chỉ fingerprint thẻ | `provider`, `payment_fingerprint`, ngày trial; không `user_id`, không email | Chặn cùng thẻ ở web khi provider là Stripe; lách được bằng thẻ khác, ví (Apple Pay, Google Pay ra token khác); **Paddle không có fingerprint**; ví Việt Nam chưa rõ | Vẫn là dữ liệu cá nhân pseudonymous (suy luận); cần căn cứ Điều 19 khoản 1 điểm a hoặc d; Google cho giữ vì fraud prevention nếu nói rõ; Apple không nói | Giữ định danh thẻ do provider cấp (không phải số thẻ) để mỗi thẻ chỉ một trial; giữ bao lâu; căn cứ; quyền khiếu nại |
| (c) HMAC email đã chuẩn hóa | HMAC có khóa bí mật của email (chữ thường, bỏ dấu chấm và `+tag` với Gmail), ngày trial | Chặn đăng ký lại cùng email trên mọi kênh do app xét; lách được bằng email mới (miễn phí) | Vẫn là dữ liệu cá nhân (app giữ khóa và tính lại được); Apple khai là "Email Address", linked, App Functionality; Google khai email cho "Fraud prevention"; hash không khóa thì yếu theo EDPB | Giữ một mã một chiều tính từ email chỉ để chặn trial lần hai, không dùng vào việc khác; giữ bao lâu; căn cứ |
| (d) Cả (b) và (c) | Cả hai, không liên kết với nhau ngoài ngày trial | Cao nhất trong bốn, vẫn lách được bằng email mới cộng thẻ khác | Cộng rủi ro của (b) và (c); nhiều dữ liệu hơn thì khó chứng minh "vừa đủ" hơn | Cả hai đoạn trên |
| T1. Hồ sơ giao dịch đầy đủ | `billing_transactions` giữ `user_id` (tài khoản đã xóa) | Đối chiếu, khiếu nại, kiểm tra thuế | Giữ được nếu là tài liệu kế toán (Điều 41, 5 hoặc 10 năm); phải báo người dùng (Điều 14 khoản 5, Apple) | Giữ hồ sơ thanh toán theo luật kế toán, thuế trong N năm, rồi xóa |
| T2. Hồ sơ giao dịch bỏ định danh | Số tiền, ngày, gói, `provider_transaction_id`, không `user_id`, không `raw_payload` | Như T1 cho đối chiếu; mất khả năng tra theo người trong app | `provider_transaction_id` vẫn tra ngược qua provider (pseudonymous); chứng từ gốc vẫn ở provider hoặc hệ thống hóa đơn | Như T1 |

Ngoài bốn phương án: chống lạm dụng ở phía provider (Stripe Radar "free trial abuse") không cần app giữ gì sau xóa, nhưng chỉ có với Stripe và
chưa kiểm chi phí. Cách nào cũng phải khớp lời hứa đang có trong SR11 ("chỉ giữ số liệu tổng hợp không định danh"): (b), (c), (d), T1, T2 đều làm
lời hứa đó phải sửa.

## 4. Chưa xác minh

- Văn bản chính thức (Công báo) của Luật 91/2025, Nghị định 356/2025, Nghị định 123/2020 và 70/2025, Luật Kế toán, Nghị định 174/2016: chỉ đọc
  bản sao; Nghị định 356 đọc qua công cụ tóm tắt và bị cắt sau Điều 37.
- Điều 41 Luật Kế toán và Nghị định 174/2016 có bị sửa sau 2024 không; văn bản Thông tư 152/2025 (mức 5 năm chỉ từ nguồn thứ cấp).
- "Lạm dụng trial" có thuộc Điều 19 khoản 1 điểm a Luật 91/2025 không; Apple có chấp nhận giữ dữ liệu vì chống lạm dụng khi review không.
- Bản cuối của EDPB Guidelines 01/2025 (chỉ đọc bản lấy ý kiến); bản án SRB chỉ đọc qua bài của Clifford Chance.
- Ví Việt Nam có định danh thẻ hoặc ví ổn định không; Paddle có cơ chế chống lạm dụng trial nội bộ không.
- Vai trò người bán của Apple, Google ở Việt Nam; nghĩa vụ kế toán của cá nhân chưa đăng ký kinh doanh; hóa đơn bán dịch vụ online cho cá nhân có
  bắt buộc ghi tên người mua không.

## 5. Nguồn

Đã mở trong phiên:
- Luật 91/2025/QH15 (bản sao): https://hrspring.vn/van-ban-phap-luat/91-2025-qh15-625628/
- Nghị định 356/2025/NĐ-CP (bản sao): https://luatvietnam.vn/dan-su/nghi-dinh-356-2025-nd-cp-quy-dinh-chi-tiet-luat-bao-ve-du-lieu-ca-nhan-422896-d1.html
- Luật Kế toán 2015, Điều 2 và 41: https://hethongphapluat.com/luat-ke-toan-2015/dieu-2 , https://hethongphapluat.com/luat-ke-toan-2015/dieu-41
- Nghị định 174/2016/NĐ-CP: https://caselaw.vn/van-ban-phap-luat/116303-nghi-dinh-174-2016-nd-cp-huong-dan-luat-ke-toan
- Luật Quản lý thuế 108/2025/QH15 (.docx): https://hrspring.vn/wp-content/uploads/2026/07/luat-so-108_2025_qh15.docx
- Thông tư 152/2025 (thứ cấp): https://www.sapo.vn/blog/thong-tu-152-2025-tt-btc
- Hóa đơn, Nghị định 70/2025 (thứ cấp): https://luatvietnam.vn/thue-phi-le-phi/co-dung-phai-ghi-ma-so-thue-hoac-cccd-nguoi-mua-tren-hoa-don-dien-tu-tu-01-6-565-102183-article.html ,
  https://hcc.nghean.gov.vn/tin-tong-hop/nghi-dinh-so-70-2025-nd-cp-sua-doi-bo-sung-quy-dinh-noi-dung-cua-hoa-don-2221.html
- EDPB Guidelines 01/2025 on Pseudonymisation: https://www.edpb.europa.eu/system/files/2025-01/edpb_guidelines_202501_pseudonymisation_en.pdf
- EDPS v SRB (bình luận): https://www.cliffordchance.com/insights/resources/blogs/talking-tech/en/articles/2025/09/pseudonymized-data-after-edps-v-srb.html
- GDPR Điều 17, Recital 47: https://gdpr-info.eu/art-17-gdpr/ , https://gdpr-info.eu/recitals/no-47/
- ICO: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-erasure/ ,
  https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/direct-marketing-guidance/respect-peoples-preferences/
- Apple: https://developer.apple.com/support/offering-account-deletion-in-your-app/ , https://developer.apple.com/app-store/app-privacy-details/ ,
  https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions
- Google Play: https://support.google.com/googleplay/android-developer/answer/13327111 , https://support.google.com/googleplay/android-developer/answer/10787469 ,
  https://support.google.com/googleplay/android-developer/answer/12154973
- Stripe: https://docs.stripe.com/api/payment_methods/object.md?query=card , https://docs.stripe.com/radar/free-trial-abuse
- Paddle: https://developer.paddle.com/api-reference/payment-methods/list-payment-methods , https://www.paddle.com/blog/what-is-merchant-of-record ,
  https://www.paddle.com/help/manage/get-paid/do-i-need-to-invoice-paddle-for-my-payout
- Gmail: https://support.google.com/mail/answer/7436150 , https://support.google.com/a/users/answer/9308648
- Policy của sản phẩm khác: https://help.netflix.com/legal/termsofuse , https://www.spotify.com/us/legal/privacy-policy/ ,
  https://policies.google.com/technologies/retention , https://proton.me/legal/privacy , https://freebuff.com/privacy-policy

Chỉ tóm tắt tìm kiếm: Optimeta https://www.optimeta.tech/privacy ; Stripe resources "Free trial abuse: tactics, signals, and prevention"
https://stripe.com/resources/more/free-trial-abuse-tactics-signals-and-prevention ; Duolingo qua ConductAtlas https://conductatlas.com/platform/duolingo/ .
