# Decisions — Đợt cải thiện C (Học / Ôn và chuỗi ngày; phiên âm và giọng đọc)

Ngày: 06–07/11/2026. Đi kèm design doc [`../specs/2026-11-06-dot-cai-thien-c-design.md`](../specs/2026-11-06-dot-cai-thien-c-design.md) và plan
[`../plans/2026-11-07-dot-cai-thien-c.md`](../plans/2026-11-07-dot-cai-thien-c.md). Nguồn: chat brainstorm 06/11/2026 (hai session, transcript `f88b58c8…` và
`a7482d05…`) và chat 07/11/2026 (viết design, plan). Mockup: `docs/mockups/2026-11-06-dot-cai-thien-c/{index,ipa,muc-tieu}.html`.

**Nhãn:** ✅ = phương án được chọn. **Ai chốt:** "Chủ dự án" = chủ dự án tự chọn; "Claude" = Claude đề xuất, chủ dự án không phản đối; "Claude (được giao)" =
chủ dự án giao Claude tự đề xuất câu đó (07/11/2026: "các câu hỏi bạn có thể tự đề xuất"), chủ dự án duyệt cùng plan.

## Tóm tắt

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| DC1 | Chia việc | Một design "đợt cải thiện", mỗi phần một milestone | Chủ dự án |
| DC2 | Thứ tự | M1 (C6) → M2 (C18); M3 (C7) để sau | Claude (thứ tự); chủ dự án (dời C7) |
| DC3 | Học và Ôn | Hai nút Học (lật thẻ) và Ôn (chọn / gõ từ theo nghĩa, không AI), bằng nhau, Ôn tô vàng, không số | Chủ dự án |
| DC4 | Lịch ôn khi Học | Từ mới học xong vào nấc 1; sau đó lật thẻ không đổi lịch, chỉ "Cần ôn lại" về nấc 1 | Chủ dự án |
| DC5 | Lịch ôn khi Ôn | Đúng + đến hạn: lên nấc; đúng + chưa đến hạn: giữ; sai: giữ | Chủ dự án |
| DC6 | Ôn gồm từ nào | Chỉ từ đã học (nấc ≥ 1); xong mà còn từ mới thì gợi ý Học | Chủ dự án |
| DC7 | Hạn mức | Phiên Ôn không tính vào số phiên luyện mỗi ngày; trang Luyện tập giữ nguyên | Chủ dự án |
| DC8 | Chuỗi ngày | Ngày có học thì tính; bỏ một ngày về 0 | Chủ dự án |
| DC9 | Hiện chuỗi | Toast kiểu chess.com, 3 s, một lần mỗi ngày sau lần học đầu | Chủ dự án (toast); Claude (lúc hiện) |
| DC10 | Nhắc giữ chuỗi | Email nhắc có thêm "sắp mất chuỗi N ngày" | Chủ dự án (cách làm: DC29) |
| DC11 | "Đã thuộc" | Nấc ≥ 4; rơi về nấc 1 thì trừ; hiện ở dòng tóm tắt nhóm và thẻ nhóm | Chủ dự án (mốc 7 ngày); Claude (trừ, chỗ hiện; "thẻ nhóm" thêm lúc viết design) |
| DC12 | Mục tiêu tuần, email tuần | Không làm đợt này | Claude (mục tiêu tuần; đưa email tuần ra khỏi đợt sau câu "khoan, cái này tí bàn" của chủ dự án) |
| DC13 | Phiên âm gắn ở đâu | Theo từng nghĩa, UK và US, hiện kiểu Cambridge | Chủ dự án (theo nghĩa, Cambridge; hai giọng: ngầm đồng ý qua mockup); Claude (gộp hiển thị) |
| DC14 | Ai thấy | Mọi gói | Chủ dự án |
| DC15 | Từ riêng | Một ô "Phiên âm" không bắt buộc, không chia UK / US | Chủ dự án |
| DC16 | Admin | Sửa được phiên âm từng nghĩa | Chủ dự án |
| DC17 | Hiện ở đâu | Thẻ flashcard, kết quả tra từ, trang một từ | Chủ dự án |
| DC18 | Nghĩa chưa có phiên âm | Chỉ nút loa, đọc nguyên chữ hoặc cụm | Chủ dự án |
| DC19 | Giọng đọc | Google Cloud TTS, giọng WaveNet, UK và US | Chủ dự án (chọn dòng WaveNet trong bảng giọng của Google: "vậy cái này đi") |
| DC20 | Tạo file | Tạo sẵn cho cả kho; đăng nghĩa mới thì tự tạo trong nền | Chủ dự án |
| DC21 | Đọc gì | Chỉ từ, không đọc câu ví dụ bằng Google | Chủ dự án |
| DC22 | Từ riêng có giọng không | Gửi Google chỉ chữ; chữ giống nhau dùng chung file | Chủ dự án (gửi Google); Claude (chỉ chữ, dùng chung) |
| DC23 | Gửi IPA cho Google | Mặc định chỉ chữ; từ nhiều cách đọc thì gửi kèm `<phoneme>` | Claude, chủ dự án đồng ý |
| DC24 | Khi chưa có file | Dùng tạm giọng trình duyệt | Claude |
| DC25 | Học lật thẻ nào (QC1) | Chỉ từ mới; hết từ mới hôm nay thì lật mọi từ đã học, không đổi lịch | Claude (được giao) |
| DC26 | "Cần ôn lại" rồi Ôn ngay (QC2) | Giữ: nấc 1, hôm nay, ưu tiên; Ôn đúng một từ ưu tiên chỉ bỏ cờ, hạn mai | Claude (được giao) |
| DC27 | Độ dài phiên Ôn (QC3) | Tối đa 10 câu (cài đặt sẵn có), không vòng 2, nút "Ôn" để làm tiếp | Claude (được giao) |
| DC28 | Ngày nào tính chuỗi (QC4) | Chỉ ngày học (lật thẻ, trả lời câu, nút sau câu); cột `studied` | Claude (được giao) |
| DC29 | Dòng "sắp mất chuỗi" (QC5) | Chỉ thêm vào email nhắc hiện có khi nó được gửi | Claude (được giao) |
| DC30 | Câu Ôn vào Luyện tập (QC6) | Tính vào "Từ hay sai", không vào lịch sử | Claude (được giao) |
| DC31 | Nguồn phiên âm (QC7) | Chỉ Wiktionary (bản trích Wiktextract) | Claude (được giao) |
| DC32 | Nút đọc câu ví dụ (QC8) | Giữ như hiện tại | Claude (được giao) |
| DC33 | Phiên âm từ riêng (QC9) | Mỗi nghĩa một ô | Claude (được giao) |
| DC34 | Nút loa khi chưa có file và máy thiếu giọng (QC10) | Nút mờ, rê / focus thấy "Đang tạo giọng đọc" | Claude (được giao) |
| DC35 | Cách thực thi | Phiên BE riêng (Sonnet 5.5, xhigh) làm API; phiên này làm UI khi API xong; song song thì BE trước | Chủ dự án |
| DC36 | Skill UI | `impeccable`, `emil-design-eng`, `web-design-guidelines`, một phần `taste-skill:redesign-skill`, `break-ui` | Chủ dự án (yêu cầu dùng); Claude (chọn và phân vai) |

## DC1 — Chia việc

Câu 1 đầu brainstorm (phiên f88b58c8, 06/11/2026): ba cải thiện C6, C7, C18 độc lập nhau, chia thế nào. Claude hỏi trước, không đề xuất.

| Phương án | Trade-off |
|---|---|
| ✅ Một design chung kiểu "đợt cải thiện", ba milestone, giống cách nhóm A đã làm | (không nêu trade-off) |
| Ba design riêng, mỗi phần một chu trình design → plan → code | (không nêu trade-off) |

**Ai chốt:** Chủ dự án, "cách này". Sau khi C7 dời (DC2), đợt còn hai milestone.

## DC2 — Thứ tự

Câu 2 đầu brainstorm: làm phần nào trước. Chủ dự án trả lời "bạn rec đi".

Vòng 1 (đề xuất của Claude):

| Phương án | Trade-off |
|---|---|
| ✅ M1 C6 (động lực) → M2 C18 (IPA) → M3 C7 (bắt đầu theo mục tiêu) | C6 dùng lại dữ liệu đã có (ngày học, nấc ôn, email nhắc), ít rủi ro nhất, nhắm vào rủi ro "khó duy trì". C18 tách biệt hẳn. C7 lớn nhất, chưa có ngân hàng câu kiểm tra trình độ, dùng lại được C6 |

Vòng 2 (phiên a7482d05): khi hỏi M3, chủ dự án bỏ bài kiểm tra trình độ ("khoan, phần kiểm tra trình độ mình cân nhắc không thêm vào nha"). Claude vẽ mockup `muc-tieu.html` cho 6 câu còn mở. Chủ dự án dời cả C7: "mình nghĩ là cái này khoan hả làm, cứ để ở improvement đi rồi mình sẽ làm sau". ✅ M3 (C7) để sau, ghi ở dòng C7 của `IMPROVEMENT_IDEAS_2026-10-23.md`.

**Ai chốt:** Claude (thứ tự, chủ dự án giao "bạn rec đi"); chủ dự án (dời C7).

## DC3 — Học và Ôn

Ý gốc của chủ dự án, nêu khi trả lời câu "đã thuộc" (vòng câu hỏi M1 đầu tiên): "ở nhóm thì nó sẽ có 2 option: 1 là học, 2 là ôn, ôn thì sẽ cho người dùng luyện tập ở dưới dạng luyện tập không AI (trắc nghiệm, nhập từ,...), còn học thì sẽ cho người dùng lật flashcard".

Vòng 1 — câu AI nằm ở đâu ("Chưa rõ 2"):

| Phương án | Trade-off |
|---|---|
| ✅ Giữ trang Luyện tập riêng cho câu AI | (không nêu trade-off) |
| Cho bật câu AI ngay trong "Ôn" | (không nêu trade-off) |
| Bỏ hẳn trang Luyện tập | (không nêu trade-off) |

Chủ dự án: "giữ trang luyện tập y nguyên như hiện tại, chủ yếu là ôn ở đây mình sẽ áp dụng giống như các app khác như study4 làm, ví dụ khi bấm luyện tập thì chỉ cho 'trắc nghiệm chọn từ theo nghĩa hoặc definition' hoặc là 'nhập từ theo nghĩa hoặc definition'".

Vòng 2 — mockup `index.html` (6 bản, cùng ngày):

| Bản | Nội dung | Phản hồi của chủ dự án |
|---|---|---|
| 1 | Trang nhóm có hai lựa chọn Học và Ôn; thẻ "tuần này" ở cột phải trang Hôm nay | Gửi hình mẫu: "thiết kế như hình mình gửi, làm nổi bật chữ ôn lên, các trang còn lại giữ nguyên như hiện tại" |
| 2 | Hai nút Học và Ôn ở thẻ to trang Hôm nay, thẻ nhóm, trang nhóm; nút Ôn to hơn, tô vàng; nhóm không có từ đến hạn chỉ có "Học N từ mới" | "dùng /taste-skill:redesign-existing-projects làm lại xem" |
| 3 | Thêm trạng thái thẻ nhóm: "xong hôm nay" (một nút "Ôn lại tùy thích" kèm dòng "ôn lại lúc này không đổi lịch ôn"), chỉ có từ mới (một nút "Học 12 từ mới") | "cân đối lại size của 2 button học và ôn, không cần to quá, cái nổi bật mình nói ở đây là về màu sắc, size thì 2 cái có thể bằng nhau" |
| 4 | Hai nút bằng nhau, Ôn chỉ nổi nhờ màu vàng | "mấy cái chú thích như ôn lại lúc này,.... chưa có từ nào,... xóa đi, còn ôn lại tùy thích thì để ôn tập là được rồi" |
| 5 | Bỏ chú thích; "Ôn lại tùy thích" → "Ôn tập" | "học và ôn được rồi, đâu cần để số đâu bạn" |
| ✅ 6 | Nút chỉ còn chữ "Học", "Ôn" (bản cuối, commit `fd0ef1d0`; trạng thái "Xong hôm nay" với nút "Ôn tập") | "tạm ổn rồi, M1 xong rồi thì qua M2" |

**Ai chốt:** Chủ dự án.

## DC4 — Lịch ôn khi Học và DC5 — Lịch ôn khi Ôn

"Chưa rõ 1: cái nào làm thay đổi lịch ôn?" Hiện tại chỉ lật thẻ đổi lịch; trang Luyện tập không tự đổi lịch. Ví dụ `luggage` của Lan ở nấc 7 ngày, đến hạn hôm nay.

Vòng 1:

| Phương án | Trade-off |
|---|---|
| (a) Ôn làm đổi lịch: gõ đúng lên nấc 14 ngày, gõ sai về nấc 1 ngày; Học chỉ xem thẻ, không đổi lịch | (không nêu trade-off) |
| (b) Cả Học lẫn Ôn đều đổi lịch | (không nêu trade-off) |
| (c) Chỉ Học đổi lịch, như bây giờ; Ôn chỉ để luyện tập | (không nêu trade-off) |

Chủ dự án chọn gần (a) nhưng sửa phần Học: "học thì tính vào nấc 1 ngày, sau nấc đó thì khi học không làm thay đổi lịch, chỉ có ôn tập làm thay đổi lịch thôi, nếu người dùng ấn cần ôn lại thì cho quay về nấc 1". ✅ DC4.

Vòng 2 (6 câu nhỏ sau mockup bản 1):

| Câu | Phương án đưa ra | Chủ dự án |
|---|---|---|
| Ôn mà trả lời sai | Tự về nấc 1 ngay, hay hiện nút "Cần ôn lại" để Lan bấm (giống trang Luyện tập) | ✅ "sai thì giữ nguyên nấc hoặc cần ôn lại nếu người dùng muốn về nấc 1" |
| Ôn từ chưa đến hạn mà đúng thì lịch có đổi không (hiện tại "Đã biết" trước hạn giữ lịch) | Đổi / giữ | ✅ "tới hạn thì mới đổi mốc, còn chưa tới hạn mà ôn lại thì giữ nguyên mốc" |
| Trong Học còn nút "Cần ôn lại" không; bấm thì về nấc 1 | Còn / không | ✅ "còn" |

**Ai chốt:** Chủ dự án (cả DC4 và DC5).

## DC6 — Ôn gồm từ nào

Câu kèm theo "Chưa rõ 1": từ mới (nấc 0) có phải Học trước rồi mới vào Ôn không.

| Phương án | Trade-off |
|---|---|
| ✅ Có: Ôn chỉ gồm từ đã học; ôn xong mà nhóm còn từ mới thì gợi ý học tiếp | (không nêu trade-off) |
| Không: từ mới cũng vào Ôn | (không nêu trade-off) |

**Ai chốt:** Chủ dự án, "đúng rồi, trong trường hợp nếu ôn trong nhóm mà có các từ mới, thì chỉ ôn những từ đã học, không ôn những từ chưa học, sau khi ôn hết các từ đã học rồi thì gợi ý cho người dùng là có muốn học những từ chưa học không".

## DC7 — Hạn mức

Chủ dự án nêu tách Học/Ôn "đồng nghĩa với việc sẽ tăng giới hạn số phiên mà người dùng có thể học trong 1 ngày". "Chưa rõ 3": hiện Free 3 phiên/ngày, Pro 30. Claude hỏi: phiên Ôn có tính vào giới hạn không; Học có giới hạn không; con số mới cho Free là bao nhiêu.

| Phương án | Trade-off |
|---|---|
| ✅ Phiên Ôn không tính vào hạn mức; con số giữ cho admin chỉnh | (không nêu trade-off) |
| Phiên Ôn tính vào hạn mức, đặt con số mới cho Free | (không nêu trade-off) |

**Ai chốt:** Chủ dự án, "mình nhớ là có thể chỉnh được trong admin mà đúng không, còn phiên ôn thì mình nghĩ không cần cộng vào hạn mức". Claude kiểm code: Free đặt được 1–50 phiên/ngày. Trang Luyện tập giữ nguyên theo câu trả lời ở DC3.

## DC8 — Chuỗi ngày

Câu 2 của M1: app đã ghi một "ngày có học" mỗi khi ôn một thẻ hoặc trả lời xong một câu luyện.

| Phương án | Trade-off |
|---|---|
| ✅ Chỉ cần như vậy là đủ | (không nêu trade-off) |
| Phải học tối thiểu một lượng nào đó | (không nêu trade-off) |
| ✅ Bỏ một ngày thì chuỗi về 0 ngay | (không nêu trade-off) |
| Được bỏ lỡ vài ngày mà vẫn giữ chuỗi | (không nêu trade-off) |

**Ai chốt:** Chủ dự án, "đúgn" (cho "chỉ cần như vậy là đủ") và "cái này" (cho "bỏ một ngày thì chuỗi về 0 ngay"). Hoạt động nào được tính chi tiết hơn: DC28.

## DC9 — Hiện chuỗi

Câu 4 của M1 hỏi chỗ hiện (trang chủ app, màn tổng kết sau phiên, trang cài đặt, chỗ khác); chủ dự án chưa trả lời câu này mà đổi hướng qua mockup.

| Vòng | Phương án | Kết quả |
|---|---|---|
| 1 | Mockup bản 1: thẻ ở cột phải trang Hôm nay gồm chuỗi ngày, mục tiêu tuần (7 ô), số "đã thuộc"; dòng nhắc giữ chuỗi khi chưa học | Chủ dự án: "về phần streak thì mình nghĩ nên làm một cái toast thông báo số ngày giữ chuỗi là được, giống như chess.com làm ấy" |
| 2 | Toast kiểu chess.com ở cuối màn hình: số ngày liên tiếp + 7 ô của tuần, tự tắt sau vài giây | Chủ dự án: "toast giảm nhỏ size xuống … toast chỉ cần đơn giản là một tí motion + chuỗi ngày, không cần quá chi tiết" |
| ✅ 3 | Bản 4: viên nhỏ, ngọn lửa bật lên rồi nảy nhẹ + "13 ngày liên tiếp", tự tắt sau 3 giây; bỏ 7 ô, dòng phụ, nút Đóng; máy bật giảm chuyển động thì không nảy | Được giữ tới bản cuối, chủ dự án duyệt M1 ("tạm ổn rồi") |

Lúc hiện: Claude đề xuất ở bản 2 "hiện một lần mỗi ngày, ngay sau lần học đầu tiên của ngày đó"; chủ dự án không phản đối.

**Ai chốt:** Chủ dự án (toast); Claude (lúc hiện).

## DC10 — Nhắc giữ chuỗi

Câu 6 của M1: Lan có chuỗi 12 ngày mà hôm nay chưa học, email nhắc học hiện có có nói thêm "bạn sắp mất chuỗi 12 ngày" không.

| Phương án | Trade-off |
|---|---|
| ✅ Có | (không nêu trade-off) |
| Không | (không nêu trade-off) |

**Ai chốt:** Chủ dự án, "có nhé". Cách làm cụ thể: DC29.

## DC11 — "Đã thuộc"

Câu 1 của M1: lịch ôn 6 nấc (0–5), khoảng ôn 1, 3, 7, 14, 30 ngày.

Vòng 1:

| Phương án | Trade-off |
|---|---|
| Ở nấc 5 | (không nêu trade-off) |
| Từ nấc 4 trở lên | (không nêu trade-off) |
| Đã ôn đúng ở mốc 30 ngày | (không nêu trade-off) |
| ✅ Cách khác (chủ dự án nêu): vượt mốc 7 ngày | (không nêu trade-off) |

Chủ dự án: "nếu vượt qua mốc 7 ngày trở đi thì tính là đã thuộc". Claude diễn lại: đúng ở lần ôn mốc 7 ngày → từ lên nấc 14 ngày (nấc 4) → "đã thuộc".

Vòng 2 — từ rơi về nấc 1 có bị trừ không, và hiện ở đâu. Ví dụ Lan có 38 từ đã thuộc, `luggage` ở nấc 4 bị "Cần ôn lại":

| Phương án | Trade-off |
|---|---|
| ✅ 37: đếm theo nấc hiện tại | Quên thì bị trừ |
| 38: đếm số từ đã từng vượt mốc 7 ngày | Con số chỉ tăng, không bao giờ giảm |
| ✅ Hiện ở dòng tóm tắt của trang nhóm ("12 từ đã thuộc", như mockup) | (không nêu trade-off) |
| Hiện trong toast | (không nêu trade-off) |

Chủ dự án hỏi lại "là sao", rồi qua 4 lượt không trả lời và chuyển M2. Claude tạm chốt: "đếm theo nấc hiện tại, tức từ nấc 4 trở lên. Từ nào rơi về nấc 1 thì bị trừ ra. Số này hiện ở dòng tóm tắt của trang nhóm", kèm "Nếu bạn không đồng ý chỗ nào thì nói mình sửa"; chủ dự án không phản đối.

**Ai chốt:** Chủ dự án (mốc 7 ngày); Claude (trừ, chỗ hiện).

## DC12 — Mục tiêu tuần, email tuần

Câu 3 và câu 5 của M1.

Mục tiêu tuần, vòng 1:

| Phương án | Trade-off |
|---|---|
| Đo bằng số ngày học / số thẻ ôn / số từ mới / số phiên luyện | (không nêu trade-off) |
| Lan tự chọn con số / app đặt sẵn rồi Lan sửa được | (không nêu trade-off) |
| Tuần bắt đầu thứ Hai / Chủ nhật | (không nêu trade-off) |

Chủ dự án hỏi lại "là như thế nào", rồi "là sao". Vòng 2 (sau khi có toast): Claude hỏi trước hết "có cần mục tiêu tuần không", nếu có thì đếm theo số ngày học hay số từ, hiện ở đâu (ví dụ trong toast). Không có câu trả lời. Claude tạm chốt: "chưa làm ở đợt này. Toast chuỗi ngày đã lo phần động lực." ✅

Email tóm tắt tuần: Claude hỏi ngày giờ gửi, nội dung, bật sẵn hay Lan tự bật, tuần không học có gửi không, dùng chung công tắc email nhắc hay tách. Chủ dự án: "Lan tự bật hoặc tắt, ví dụ cho mình chỗ này". Claude đưa ví dụ email và hỏi tiếp (mặc định bật hay tắt, 19h tối Chủ nhật, tuần không học). Chủ dự án: "khoan, cái này tí bàn". Claude: "Email tóm tắt tuần để bàn sau như bạn nói, chưa vào đợt này." ✅

**Ai chốt:** Claude (mục tiêu tuần); chủ dự án (email tuần dời).

## DC13 — Phiên âm gắn ở đâu

Câu 1–2 của M2.

Vòng 1 — một giọng hay hai giọng (chỉ hiện một phiên âm, ví dụ US, hay cả UK và US cạnh hai nút loa). Chủ dự án hỏi lại "nếu làm 2 giọng, phần voice cho 2 giọng nên tích hợp như thế nào". Claude trả lời bằng cách đặt mỗi phiên âm cạnh nút loa của nó (`UK /…/ 🔊   US /…/ 🔊`); phần giọng đọc đi tiếp ở DC19. Không có câu "chọn một giọng" riêng; UK và US được giữ trong mọi mockup sau đó.

Vòng 2 — gắn theo gì:

| Phương án | Trade-off |
|---|---|
| Một phiên âm chung cho cả chữ | (không nêu trade-off) |
| Theo từ + loại từ | `record` danh từ /ˈrek.ɔːd/ và động từ /rɪˈkɔːd/ tách được, nhưng `lead` "chì" /led/ và "dẫn đầu" /liːd/ cùng là danh từ thì không tách được |
| ✅ Theo nghĩa (chủ dự án nêu) | Tách được `lead`. Nguồn IPA ghi theo từ hoặc loại từ, nên lúc nhập chép cho mọi nghĩa rồi admin sửa tay |

Chủ dự án: "gắn ở sense được không, vẽ mockup giúp mình". Claude vẽ `ipa.html`.

Vòng 3 — cách hiện: chủ dự án gửi trang Cambridge ("xem qua trang này đi"). Claude sửa mockup: phiên âm dưới từ + loại từ, `UK 🔊 /…/  US 🔊 /…/`; nghĩa đọc giống nhau gộp, hiện một lần; nghĩa đọc khác có phiên âm riêng ở nghĩa đó (`lead` "chì" /led/). ✅ Chủ dự án không phản đối, trả lời tiếp các câu khác.

**Ai chốt:** Chủ dự án (theo nghĩa, Cambridge); Claude (gộp hiển thị).

## DC14 — Ai thấy

Câu 4 của M2.

| Phương án | Trade-off |
|---|---|
| Khóa sau gói Pro | (không nêu trade-off) |
| ✅ Mọi người đều thấy | (không nêu trade-off) |

**Ai chốt:** Chủ dự án, "mọi người đều thấy".

## DC15 — Từ riêng

Câu 5 của M2: từ riêng do người học tự thêm có cần phiên âm không, lấy từ đâu.

| Phương án | Trade-off |
|---|---|
| Tra trong cùng bộ dữ liệu theo chữ | (không nêu trade-off) |
| Để trống | (không nêu trade-off) |
| ✅ Ô nhập phiên âm cho người học, không chia UK / US; không nhập thì để trống (chủ dự án nêu) | (không nêu trade-off) |

**Ai chốt:** Chủ dự án, "người dùng không thêm thì để trống, nên có box nhập phiên âm cho người dùng, không theo giọng mỹ hay giọng anh mà theo phát âm người dùng thêm". Mockup `ipa.html` màn "Từ riêng của bạn": ô "Phiên âm (không bắt buộc)". Một ô hay mỗi nghĩa một ô: DC33.

## DC16 — Admin

Câu 6 của M2: admin có sửa được phiên âm không (dữ liệu nguồn sai hoặc thiếu).

| Phương án | Trade-off |
|---|---|
| ✅ Có | (không nêu trade-off) |
| Không | (không nêu trade-off) |

**Ai chốt:** Chủ dự án, "có". Mockup `ipa.html` màn "Admin sửa nghĩa": ô UK và US theo từng nghĩa.

## DC17 — Hiện ở đâu

Câu 3 của M2.

| Phương án | Trade-off |
|---|---|
| ✅ Mặt thẻ flashcard | (không nêu trade-off) |
| ✅ Trang một từ | (không nêu trade-off) |
| ✅ Kết quả tra từ | (không nêu trade-off) |
| Màn báo đúng/sai khi Ôn | (không nêu trade-off) |

Vòng 1: chủ dự án "flashcard và tra từ". Vòng 2: Claude hỏi trang một từ (mở ra khi bấm một kết quả tra từ) có tính là "tra từ" không; chủ dự án "uwmf" (gõ nhầm "ừm"), Claude ghi nhận là có.

**Ai chốt:** Chủ dự án.

## DC18 — Nghĩa chưa có phiên âm

Câu 7 của M2 ("từ không có trong nguồn thì sao"); chủ dự án hỏi "là sao", Claude giải thích bằng cụm `look after` và vẽ ba cách ở màn cuối `ipa.html`.

| Phương án | Trade-off |
|---|---|
| A: ẩn hẳn dòng phiên âm | (không nêu trade-off) |
| B: ghi "Chưa có phiên âm" | (không nêu trade-off) |
| ✅ C: chỉ còn nút loa | (không nêu trade-off) |

**Ai chốt:** Chủ dự án, "chỉ còn nút loa, cho hệ thốgn đọc theo cụm đó".

## DC19 — Giọng đọc

Vòng 1 — máy không có giọng UK thì sao (âm thanh lúc đó lấy từ giọng cài sẵn trên máy):

| Phương án | Trade-off |
|---|---|
| A. Ẩn nút loa UK, vẫn hiện chữ phiên âm UK | Đơn giản; Lan biết cách đọc qua chữ, chỉ không nghe được |
| B. Nút loa UK mờ, rê chuột thì báo và chỉ cách cài giọng | Lan hiểu vì sao không nghe được; phải viết hướng dẫn riêng cho từng hệ điều hành |
| C. Phát bằng giọng US thay thế | Bấm UK vẫn có tiếng nhưng là giọng Mỹ, dễ hiểu sai |
| D. File âm thanh làm sẵn trên máy chủ (C19) | Máy nào cũng nghe được hai giọng; tốn tiền tạo và lưu khoảng 7.800 từ × 2 giọng, phải mở CSP cho file âm thanh |
| ✅ Dịch vụ đọc giọng bên thứ ba (chủ dự án nêu) | Dẫn tới research nhà cung cấp |

Chủ dự án: "thì ý là mình muốn tích hợp công cụ bên thứ 3 để làm giọng đọc".

Vòng 2 — nhà cung cấp (research `TTS_PROVIDERS_RESEARCH_2026-11-06.md`, `LOCAL_TTS_MODELS_RESEARCH_2026-11-06.md`, `APP_PRONUNCIATION_AUDIO_SURVEY_2026-11-06.md`). Chủ dự án hỏi thêm "có kéo model AI về đọc được kh bạn, chạy local trên host" và "các app họ tích hợp như thế nào".

| Phương án | Trade-off |
|---|---|
| ✅ Google Cloud TTS | 63 giọng UK; đọc theo IPA được; coi file tạo ra là dữ liệu của khách hàng; không lưu chữ gửi đi; từ Việt Nam chỉ đăng ký bằng thẻ tín dụng; phải bật thanh toán kể cả trong hạn mức miễn phí; gọi bằng service account nên không bị giới hạn "test user" như Drive (suy ra, chưa thấy trang Google ghi thẳng) |
| Microsoft Azure Speech | 20 giọng UK; đọc theo IPA được nhưng gặp ký hiệu lạ là báo lỗi; không lưu chữ; chưa đọc được điều khoản lưu file; có Việt Nam trong danh sách quốc gia |
| Amazon Polly | 4 giọng UK; đọc theo IPA được; cho lưu file rõ ràng; mặc định có thể dùng nội dung để cải thiện dịch vụ trừ khi tắt; AWS từ Việt Nam chưa kiểm |
| OpenAI TTS | Không có giọng theo vùng; không thấy tài liệu đọc theo IPA; giữ chữ 30 ngày; model TTS hiện tại bị gỡ khỏi API ngày 06/01/2027 |
| ElevenLabs | Bản miễn phí cấm dùng thương mại; mặc định có thể dùng nội dung |
| Cloudflare | Không thấy tài liệu đọc theo IPA |
| Tự chạy Kokoro-82M | Apache-2.0, có UK và US, nhận phiên âm, chạy CPU; tác giả ghi đọc câu ngắn kém (một từ đơn là câu rất ngắn); 8 giọng UK chất lượng thấp (cao nhất B-); đứng yên từ 04/2025; sinh sẵn trên máy chủ dự án khoảng 11 giờ CPU; đọc theo yêu cầu cần thêm service Python |
| Piper / XTTS / F5 | Piper: license nhiều giọng không rõ cho thương mại; XTTS, F5 cấm thương mại |

Vòng 3 — loại giọng của Google (chủ dự án hỏi "3 loại giọng khác gì nhau và có ảnh hưởng gì không"):

| Phương án | Trade-off |
|---|---|
| Standard | "Cost efficient", công nghệ cũ nhất; 7 giọng UK; nhận `<phoneme>`; miễn phí 4 triệu ký tự/tháng, sau đó $4 / 1 triệu |
| ✅ WaveNet | Học từ giọng người thật, "ấm và giống người hơn" Standard; 7 giọng UK, 10 giọng US; nhận `<phoneme>` (bản chính thức); giá như Standard. Bảng giá xếp vào "Legacy TTS models"; Google từng thay giọng `en-GB-Wavenet-*` bằng giọng "tương tự" (04/2023) |
| Neural2 | Cùng công nghệ Custom Voice; 7 giọng UK; nhận `<phoneme>`; miễn phí 1 triệu, sau đó $16 / 1 triệu |
| Chirp 3 HD | Mới nhất, ngữ điệu tự nhiên; 30 giọng UK; `<phoneme>` đang Preview nên rủi ro nhất nếu dựa vào IPA; miễn phí 1 triệu, sau đó $30 / 1 triệu |

**Ai chốt:** Chủ dự án, "vậy cái này đi" (trích dòng WaveNet). Chủ dự án không nói tên Google riêng; Google được chọn qua câu hỏi chi phí và điều kiện của Google rồi chọn loại giọng WaveNet của Google.

## DC20 — Tạo file

Câu 2 trong bốn câu TTS: cách tạo âm thanh.

Vòng 1:

| Phương án | Trade-off |
|---|---|
| Tạo sẵn file cho cả kho từ rồi lưu | (không nêu trade-off) |
| Gọi dịch vụ khi người học bấm nghe rồi lưu bản đã gọi | (không nêu trade-off) |
| Kết hợp: kho từ tạo sẵn, từ riêng gọi khi cần | (không nêu trade-off) |

Chủ dự án hỏi "vậy cứ mỗi lần thêm từ mới vào hệ thống là phải tạo thêm 1 file? … scale lên tầm vài chục đến vài trăm nghìn từ thì thế nào", rồi "hệ thốgn handle như thế nào", "ý mình là tạo file âm thanh á". Claude giải thích: khi admin đăng nghĩa mới, hệ thống tự tạo file UK, US trong nền (hàng việc thứ tư cạnh `content-import`, `content-publish`, `content-inflections`); file gắn với cách đọc, không với nghĩa; 300.000 từ khoảng 12 GB trên R2, chưa tới $0,1/tháng. Claude nêu thêm một cách cho kho rất lớn: chỉ tạo sẵn khoảng 8.000–10.000 từ thông dụng, từ hiếm chờ người đầu tiên bấm nghe (suy luận, chưa đo).

Vòng 2:

| Phương án | Trade-off |
|---|---|
| ✅ Tạo sẵn cả kho; admin đăng nghĩa mới thì hệ thống tự tạo file trong nền | (không nêu trade-off ở câu này; chi phí cả kho nằm trong hạn mức miễn phí của WaveNet) |

**Ai chốt:** Chủ dự án, "ok".

## DC21 — Đọc gì

| Phương án | Trade-off |
|---|---|
| ✅ Chỉ từ | Ít ký tự; câu ví dụ làm sau được mà không sửa phần đã làm (Claude, sau khi chủ dự án chọn) |
| Thêm câu ví dụ | Tốn ký tự gấp nhiều lần từ; thêm 2 câu mỗi từ khoảng $0–160 |
| Cả từ và câu riêng của người học | Câu riêng có thể chứa thông tin cá nhân, gửi ra nước ngoài dính tới hồ sơ chuyển dữ liệu |

**Ai chốt:** Chủ dự án, "chỉ từ".

## DC22 — Từ riêng có giọng không

| Phương án | Trade-off |
|---|---|
| ✅ Gửi cho Google đọc rồi lưu file | Chữ của người học đi ra nước ngoài |
| Dùng giọng trình duyệt như hiện nay | (không nêu trade-off) |

Chủ dự án: "gửi google". Claude đồng ý, kèm ba điều: chính sách bảo mật ghi tên Google là bên xử lý chữ để đọc giọng; giới hạn độ dài (đề xuất tối đa 100 ký tự, chủ dự án chốt con số); chữ giống nhau dùng chung một file. Chỉ gửi chữ, không gửi phiên âm người học tự gõ, vì có thể sai ký hiệu làm Google đọc sai hoặc báo lỗi.

Vòng giới hạn độ dài: chủ dự án hỏi "model có giới hạn ký tự hay sao?". Claude: Google cho 5.000 byte mỗi request; app đã chặn từ riêng tối đa 100 ký tự (`LEMMA_MAX`), nên không cần thêm giới hạn; trường hợp xấu nhất hạn mức miễn phí đủ khoảng 20.000 từ riêng mới mỗi tháng. ✅ Không thêm giới hạn. Chủ dự án: "ok".

**Ai chốt:** Chủ dự án (gửi Google); Claude (chỉ chữ, dùng chung file, không thêm giới hạn).

## DC23 — Gửi IPA cho Google

Câu 4 trong bốn câu TTS: gửi kèm IPA để Google đọc đúng theo nghĩa, hay chỉ gửi chữ. Chủ dự án hỏi lại "bên model có nhận diện được từ tiếng anh mà không cần ipa đúng không"; Claude: đúng với đa số từ, IPA chỉ cần cho từ viết giống mà đọc khác (`lead`, `record`, `read`, `live`, `wind`).

Vòng 1:

| Phương án | Trade-off |
|---|---|
| Gửi IPA cho mọi từ | Mỗi từ tốn gấp khoảng 6–8 lần ký tự (cả kho khoảng 1,1 triệu ký tự, vẫn miễn phí với WaveNet); đọc đúng theo nghĩa |
| Chỉ cho những từ có nhiều cách đọc | (không nêu trade-off ở vòng này) |
| Không gửi cho từ nào | Google tự đoán cách đọc |

Chủ dự án: "vậy không cần gửi ipa".

Vòng 2 — Claude đề xuất khác một chỗ:

| Phương án | Trade-off |
|---|---|
| Không gửi IPA cho từ nào | `lead` chỉ có một file; nghĩa "chì" hiện /led/ mà bấm loa nghe /liːd/. Ghi vào design như hạn chế đã biết |
| ✅ Mặc định chỉ gửi chữ; từ có các nghĩa mang phiên âm khác nhau thì tự gửi kèm IPA cho từng cách đọc | Admin không làm gì thêm, chi phí trong hạn mức miễn phí. Rủi ro: IPA nguồn có thể chứa ký hiệu Google không hỗ trợ; chưa thử nên chưa biết Google đọc theo IPA có chuẩn không |

**Ai chốt:** Claude đề xuất, chủ dự án đồng ý: "ok".

## DC24 — Khi chưa có file

Claude nêu trong luồng tạo giọng (trả lời câu "hệ thốgn handle như thế nào"): "Chưa có, vì việc tạo giọng đang chờ hoặc bị lỗi, thì dùng tạm giọng của trình duyệt như hiện nay. Nút loa không bao giờ bị hỏng." Kèm: trang admin hiện trạng thái "Có giọng" / "Đang tạo" / "Lỗi" và nút "Tạo lại".

| Phương án | Trade-off |
|---|---|
| ✅ Dùng tạm giọng của trình duyệt khi file đang tạo hoặc tạo lỗi | Nút loa không bao giờ bị hỏng |

Không có phương án khác được đưa ra cho câu này. Chủ dự án không phản đối (lượt sau hỏi cách tạo file âm thanh). Máy cũng không có giọng đó thì sao: DC34.

**Ai chốt:** Claude (luồng §5.5).

## DC25 — Học lật thẻ nào (QC1)

Đọc code thấy hàng thẻ `mode=due` gồm ưu tiên, đến hạn và từ mới (`queue.service.ts:84-93`). Với DC4, lật thẻ không đổi lịch từ đã học, nên câu hỏi là thẻ
nào xuất hiện khi Lan bấm Học ở nhóm Du lịch (5 từ mới, 8 đến hạn).

| Phương án | Trade-off |
|---|---|
| ✅ (a) chỉ từ mới; nhóm hết từ mới thì Học lật lại mọi từ đã học, không đổi lịch | Học và Ôn tách rõ; từ đến hạn chỉ giảm khi vào Ôn. Cần mode mới `new` cho hàng thẻ |
| (b) từ mới trước, rồi tới mọi từ đã học | Một phiên dài; lật từ đến hạn mà lịch không đổi, Lan tưởng đã ôn |
| (c) cách khác | (không có đề xuất cụ thể) |

**Ai chốt:** Claude (được giao). Lý do: DC4 làm việc lật từ đến hạn trở thành "xem lại", nên đặt nó ở chỗ chỉ hiện khi hết từ mới.

## DC26 — "Cần ôn lại" đưa từ về nấc 1 thì ôn lại lúc nào (QC2)

Code hiện tại: "Cần ôn lại" → nấc 1, đến hạn hôm nay, ưu tiên (`schedule.ts:40`). Với DC5, Lan bấm "Cần ôn lại" cho `luggage` rồi vào Ôn trả lời đúng là lên nấc 2
trong ngày.

| Phương án | Trade-off |
|---|---|
| (a) giữ như hiện tại | Không đổi gì; một lần đúng ngay sau khi quên đã đủ lên nấc |
| (b) về nấc 1, đến hạn ngày mai | Phải đổi `applyAnswer`, mà hàm đó dùng chung với trang Luyện tập (DC7 giữ nguyên trang đó); Lan không thử lại được trong ngày |
| ✅ (c) đến hạn hôm nay, nhưng lần Ôn đúng đầu tiên trong ngày chỉ bỏ cờ ưu tiên, không lên nấc | Thử lại ngay được; lên nấc chỉ từ ngày mai. Chỉ `applyRecall` có luật này; nút "Cần ôn lại" và trang Luyện tập không đổi |

**Ai chốt:** Claude (được giao).

## DC27 — Một phiên Ôn dài bao nhiêu (QC3)

| Phương án | Trade-off |
|---|---|
| (a) mọi từ đến hạn của nhóm trong một phiên (trần 100 từ một nhóm một ngày) | Một lần là xong ngày; phiên có thể rất dài trên điện thoại |
| ✅ (b) phiên 10 câu như Luyện tập, bấm "Ôn" để làm phiên sau | Dùng lại `practice.defaultQuestionsPerSession`; phiên ngắn. Ôn hết 40 từ đến hạn cần 4 phiên |
| (c) con số khác | (không có đề xuất cụ thể) |

**Ai chốt:** Claude (được giao). Phiên Ôn không có vòng 2: số câu = min(10, số từ dùng được).

## DC28 — Ngày nào tính vào chuỗi (QC4)

Lúc brainstorm Claude nói app ghi "ngày có học" khi ôn thẻ hoặc trả lời câu luyện; chủ dự án chọn "chỉ cần như vậy". Code thật còn ghi khi thêm từ, xoá từ, xoá
nhóm, bấm "Học lại" (`items.service.ts:247,262`, `groups.service.ts:122`, `backlog.service.ts:94`).

| Phương án | Trade-off |
|---|---|
| Mọi ngày có hoạt động đều tính (dùng bảng như hiện tại) | Không đổi DB; Lan chỉ thêm 3 từ cũng giữ chuỗi |
| ✅ Chỉ ngày có học: lật thẻ, câu trả lời cuối của Ôn / Luyện tập, nút "Cần ôn lại" / "Đã biết" | Đúng điều đã nói lúc brainstorm; cần cột `studied` (dòng cũ đặt `true`) |

**Ai chốt:** Claude (được giao), theo câu trả lời "chỉ cần như vậy" của chủ dự án lúc brainstorm.

## DC29 — Dòng "sắp mất chuỗi" gửi thế nào (QC5)

Email nhắc chỉ gửi khi còn thẻ chờ, cách nhau ít nhất 2 ngày (`minGapDays`), không xem hôm nay đã học chưa, chữ cố định (`reminder-message.ts:16-33`).

| Phương án | Trade-off |
|---|---|
| ✅ (a) chỉ thêm dòng chuỗi vào email nhắc khi email đó được gửi như bây giờ | Ít đổi nhất, không thêm email. Có tối chuỗi sắp mất mà không có email nào |
| (b) thêm một email riêng "sắp mất chuỗi" mỗi tối khi chuỗi ≥ N ngày và chưa học | Nhắc đúng lúc; thêm một loại email, tốn hạn mức gửi thư |
| (c) sửa email nhắc: không gửi khi hôm nay đã học, ngày chuỗi sắp mất thì gửi dù chưa đủ 2 ngày | Nhắc đúng lúc hơn; đổi luật gửi đã ổn định từ Bước 3 |

**Ai chốt:** Claude (được giao). Dòng chỉ thêm khi chuỗi ≥ 2 và hôm nay chưa học. Đo xem có cần (b) / (c) sau khi có người học thật.

## DC30 — Câu trả lời trong Ôn có vào trang Luyện tập không (QC6)

| Phương án | Trade-off |
|---|---|
| (a) tính vào "Từ hay sai" và lịch sử | Lịch sử Luyện tập lẫn phiên Ôn mà Lan không mở từ trang đó |
| ✅ (b) tính vào "Từ hay sai", không vào lịch sử | Từ sai ở Ôn vẫn được đề xuất luyện; lịch sử chỉ có phiên Luyện tập |
| (c) không tính vào đâu | Mất tín hiệu từ hay sai |

**Ai chốt:** Claude (được giao).

## DC31 — Lấy phiên âm từ nguồn nào (QC7)

Hai nguồn đã đọc giấy phép 26/10/2026: Wiktionary (UK và US, CC BY-SA 4.0: dùng thương mại được, ghi công, phần IPA lấy về chia sẻ lại cùng giấy phép); CMUdict (chỉ
US, ARPAbet phải đổi sang IPA, giấy phép kiểu BSD).

| Phương án | Trade-off |
|---|---|
| ✅ (a) chỉ Wiktionary | Một nguồn, có cả UK và US; từ không khớp để trống (DC18). Phải ghi công và cho tải lại phần IPA |
| (b) Wiktionary, thiếu US thì lấy CMUdict | Bù thêm US; thêm bước đổi ARPAbet, hai nguồn ghi công |
| (c) tìm thêm nguồn khác trước khi chốt | Chậm đợt C |

**Ai chốt:** Claude (được giao). Bản trích dùng: Wiktextract raw data của kaikki.org (JSONL nén 2,9 GB, đọc trang 07/11/2026); cấu trúc trường `sounds` chưa
kiểm trên dữ liệu thật: plan Task 20 bước 1 kiểm trước khi viết code.

## DC32 — Nút loa của câu ví dụ (QC8)

| Phương án | Trade-off |
|---|---|
| ✅ (a) giữ như hiện tại (giọng máy; câu riêng chỉ giọng cài trên máy) | Không tốn gì, câu không rời máy |
| (b) bỏ | Bớt một nút; mất cách nghe câu |

**Ai chốt:** Claude (được giao).

## DC33 — Phiên âm của từ riêng gắn theo từ hay theo nghĩa (QC9)

| Phương án | Trade-off |
|---|---|
| (a) một ô cho cả từ | Đúng chữ "một ô" của DC15; phải lưu trên `Entry` (khác mọi nội dung khác) hoặc chép vào mọi nghĩa |
| ✅ (b) mỗi nghĩa một ô | Theo cách nội dung đang lưu (trên bản sửa của nghĩa); `bass` /bæs/ và /beɪs/ đúng. Form thêm từ vẫn một ô vì từ mới có một nghĩa |

**Ai chốt:** Claude (được giao).

## DC34 — File UK đang tạo mà máy không có giọng UK (QC10)

| Phương án | Trade-off |
|---|---|
| (a) ẩn nút loa UK | Dòng phiên âm nhảy chỗ khi file xong |
| ✅ (b) hiện nút mờ, rê vào thấy "Đang tạo giọng đọc" | Bố cục ổn định; Lan biết vì sao chưa nghe được |
| (c) đọc bằng giọng US của máy | Nghe giọng Mỹ dưới nhãn UK: sai |

**Ai chốt:** Claude (được giao).

## DC35 — Cách thực thi

Chủ dự án 07/11/2026: "sau khi mình approve plan, bạn tạo một phiên mới chạy sonnet 5.5 xhigh cho phần BE, còn ở phiên này bạn sẽ phát triển UI khi BE xong,
còn nếu phát triển song song thì BE trước, FE sau". Không có phương án khác được đưa ra. Plan chia lại 6 PR của design thành 5 PR BE (Task 1–23) và 2 PR FE
(Task 24–31), với mục "Hợp đồng API" là chỗ hai phiên cùng dựa vào.

## DC36 — Skill cho phần giao diện

Chủ dự án yêu cầu dùng "taste skill, impeccable, emil, ui guideline", Claude phân tích và chọn. Kết quả (plan, mục "Skill UI"):

| Skill | Chọn | Lý do |
|---|---|---|
| `impeccable:impeccable` | ✅ chính, mọi task FE | Viết cho product UI, làm việc trên design system có sẵn |
| `emil-design-eng` | ✅ toast chuỗi, nút loa | Hai chỗ có chuyển động |
| `anthropic-skills:web-design-guidelines` | ✅ review cuối | a11y, guideline |
| `taste-skill:redesign-skill` | ✅ một phần (trạng thái, nội dung) | Phần đổi font / màu / layout đụng token hướng B |
| `taste-skill` chính (`design-taste-frontend`) | ✗ | Tự ghi không dành cho màn app |
| `break-ui` | ✅ thêm | Dữ liệu xấu nhất cho dòng phiên âm, số chuỗi |

Đợt C vẽ trên giao diện hiện có; hướng redesign D + K (07/11/2026) chưa có design nên không áp.

## Đề xuất kỹ thuật duyệt cùng design và plan

| Đề xuất | Chọn | Bỏ | Lý do |
|---|---|---|---|
| Phiên Ôn | Một loại phiên Practice (`kind = 'recall'`) | Phiên riêng trong Learning | Dùng lại dựng câu, chấm điểm, gợi ý, phương án nhiễu |
| Phiên mở | Index "một phiên mở" theo `(user_id, kind)` | Một phiên mở mỗi người | Mở Ôn không đóng phiên Luyện tập đang dở |
| Log của câu Ôn | `learning_log` có `group_id`, `section`, `origin: 'recall'`, `review_id` null | Ghi qua `practiceReview` (không nhóm) | Trần ôn của nhóm vẫn đếm; `review_id` của câu để dành cho nút "Cần ôn lại" |
| Phát lại `review_id` | Đọc `priority` từ item | Suy từ `answer` | Luật Học mới để "Đã biết" giữ cờ ưu tiên |
| Phiên âm | Trên `SenseRevision` | Trên `Sense` | Đi qua nháp → duyệt → đăng → hoàn tác |
| Ký hiệu cho Google | Lưu như nguồn ghi, đổi sang bảng của Google lúc gửi (`toGooglePhonemes`) | Chặn ký hiệu ngoài bảng Google khi lưu (bản design đầu) | Bảng Google (đọc 07/11/2026) không có `ɝ`, `ɾ`, `e` UK: chặn khi lưu loại nhiều phiên âm đúng |
| Hàng việc TTS | BullMQ riêng `content-tts`, trạng thái ở `speech_audio` | `background_jobs` | Bảng đó cần `created_by`, `operation_id` mỗi việc; hợp lô CSV |
| Khoá file | `sha256(voice|text|phonemes)`, dùng chung theo chữ | URL lưu trên nghĩa | Không xoá theo người; đổi giọng là đổi khoá |
| Kho file | R2 qua API S3, fake ghi thư mục local + route dev | MinIO trong Docker | Không thêm service; CI và smoke chạy không cần mạng |
| Nạp phiên âm | CLI dựng CSV → nhập CSV → đăng hàng loạt | Đường ghi mới | Dùng lại đường nhập và đăng có sẵn; test giữ "CSV chỉ cột phiên âm không đụng trường khác" |
| Dòng cũ của `learning_activity_days` | Đặt `studied = true` | Để `false` | Chưa có người học thật; không làm đứt chuỗi của tài khoản thử |
| Thư viện | `@google-cloud/text-to-speech` 7.2.0, `@aws-sdk/client-s3` 3.1156.0 (bản đã ra hơn 14 ngày) | Bản mới nhất (`client-s3` 3.1164.0 ra 06/11/2026) | Bản vừa ra chưa có thời gian lộ lỗi; ghi số cố định, không `^` |
