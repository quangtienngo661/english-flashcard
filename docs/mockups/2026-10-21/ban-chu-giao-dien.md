# Bản chữ giao diện — đợt giao diện (21/10/2026)

> **Trạng thái 21/10/2026: chủ dự án duyệt ở mốc 0** ("Ok bản chữ giao diện. Q1: đổi Level thành Trình độ. Q2: vẽ email người thao tác ở màn admin và ghi việc API trả email vào design §10."). Bản viết của Task 1 (plan [`../../superpowers/plans/2026-10-21-dot-giao-dien.md`](../../superpowers/plans/2026-10-21-dot-giao-dien.md)),
> theo design [`../../superpowers/specs/2026-10-21-dot-giao-dien-design.md`](../../superpowers/specs/2026-10-21-dot-giao-dien-design.md)
> (D1–D17) và research [`vietnamese-ux-writing-research.md`](vietnamese-ux-writing-research.md) (nguyên tắc N1–N20).
> Các màn vẽ sau **chép nguyên chữ** từ file này. Chữ trong ngoặc vuông `[ ]` là nút; chữ nghiêng là ghi chú cho người vẽ, không hiện trên màn.

Nhãn: **Chốt** = đã có trong D1–D17; **Đề xuất** = Claude đề xuất trong file này, chờ duyệt ở mốc 0; `ASSUMPTION` = chưa kiểm được.
Nguồn hành vi: design Bước 3–7 và đợt sửa Bước 0–3 trên nhánh này; con số và mã lỗi đối chiếu code `apps/api` (mục 9 ghi nguồn).

Mục lục: 1 Nguyên tắc dùng trong file · 2 Bảng thuật ngữ · 3 Mẫu chữ dùng chung · 4 Mảng A · 5 Mảng B · 6 Mảng C · 7 Mảng D (web, điện thoại) ·
8 Mảng E (admin) · 9 Nguồn số liệu · 10 Chữ cũ cần đổi trên page 08, 09 · 11 Kiểm.

---

## 1. Nguyên tắc dùng trong file (tóm tắt từ research)

| # | Luật | Ví dụ |
|---|---|---|
| 1 | Gọi người học là "bạn", bỏ đại từ khi câu vẫn rõ; app tự gọi "Wordmet", không "chúng tôi", không "mình" (N2) | "Wordmet tự nhận ra dạng chia." |
| 2 | Câu ngắn, chủ động; bớt "được", "sự", "việc", "các" thừa (N4, N5) | "Đã thêm vào nhóm “Du lịch”." |
| 3 | Nút là động từ nói đúng việc sẽ xảy ra; hộp hỏi không dùng "Có / Không", "OK" (N7, N9) | [Xóa nhóm] [Giữ nhóm] |
| 4 | Báo lỗi = chuyện gì xảy ra + làm gì tiếp; không "Rất tiếc!", không "!" (N8) | "Chưa tạo được câu. Thử lại." |
| 5 | Không "Vui lòng" trên nút, nhãn, gợi ý; trong câu chỉ khi lỗi do app bắt người học làm việc phiền (N13) | — |
| 6 | Viết hoa kiểu câu, không VIẾT HOA HẾT kể cả nhãn nhỏ (N14) | "Gói của bạn", không "GÓI CỦA BẠN" |
| 7 | Nút, nhãn, tiêu đề không có dấu chấm; câu trọn có dấu chấm; "…" là một ký tự; ngoặc kép cong “ ” (N11, N15) | "Đang tạo câu…" |
| 8 | Ngày, giờ, số, tiền theo `Intl` vi-VN (D17): "Chủ Nhật, 18/10", "18/10/2026", "20:00", "0:00", "7.799", "99.000 ₫"; không đặt thứ giữa câu | "Lượt câu AI mới có vào 15/11." |
| 9 | "Chưa" cho điều tạm thời, "không" cho điều cố định (N6) | "Gói Pro chưa mở bán" |
| 10 | Dấu thanh kiểu "hòa, thủy, khỏe, xóa" (D17) | "Xóa nhóm", không "Xoá nhóm" |
| 11 | Màn người học dùng "chọn" hoặc "bấm" trong câu hướng dẫn, không "click", "nhấp", "chạm" (N7) | "Bấm vào thẻ để lật" |
| 12 | Màn admin: nhãn tiếng Việt kiểu câu, tên khóa của API ở dòng phụ chữ đơn cách (N20) | "Số câu AI tạo trước · `practice.ai_prefetch_count`" |

Ngày "hôm nay" trong mọi mockup: **Chủ Nhật, 18/10/2026** (đã chạy `Intl` vi-VN, Node 24.11.0). Ngày khác dùng trong file: Thứ Tư, 21/10; 15/11 (mốc nạp lượt
tháng của ví dụ Pro); 31/12/2026 (hết hạn Pro do đội cấp); ngày sinh ví dụ 14/5/2008.

---

## 2. Bảng thuật ngữ (cuối cùng)

Mỗi khái niệm một từ. Cột "Tránh" gồm cả chữ tiếng Anh không được hiện trên màn người học.

| Khái niệm | Dùng | Tránh | Ghi chú |
|---|---|---|---|
| Tập từ người học tự lập | **nhóm** | bộ từ, bộ thẻ, danh sách, deck | |
| Một mục từ | **từ** | mục từ, word | "từ vựng" chỉ khi nói chung ("Ôn từ vựng theo lịch") |
| Một nghĩa của từ | **nghĩa** | nét nghĩa, sense | "định nghĩa tiếng Anh" là thứ khác (gợi ý, trang từ) |
| Thẻ ôn | **thẻ** | flashcard, card | "Ôn thẻ", không "Ôn flashcard" |
| Ôn theo lịch | **ôn**, phiên ôn | ôn luyện, review | |
| Làm câu hỏi | **luyện tập** (tên mục), **luyện**, phiên luyện | thực hành, bài tập, kiểm tra, quiz | |
| Một lượt ngồi ôn hoặc luyện | **phiên ôn**, **phiên luyện**; "phiên" một mình khi ngữ cảnh rõ | session, buổi, phiên đăng nhập | Lỗi hết phiên đăng nhập nói "Bạn cần đăng nhập lại." |
| Số phiên luyện mỗi ngày (Miễn phí 3) | **phiên** ("Phiên luyện hôm nay: 1/3", "Hết phiên luyện hôm nay") | lượt luyện, lượt | **Chốt D17** |
| Một lần trả lời một câu hỏi | **câu** ("5 câu gần nhất", "10 câu") | lượt, lần trả lời | **Chốt D17** |
| Kho lượt AI cho câu luyện | **lượt câu AI** | lượt bài AI, lượt AI, credit, "lượt" một mình | **Chốt D17** (kho `ai_practice`) |
| Kho lượt AI tra nghĩa | **lượt tra AI** | lượt AI tra nghĩa, lượt AI | **Chốt D17** (kho `ai_lookup`) |
| Câu hỏi do AI viết | **câu AI** | bài AI, câu hỏi AI | "300 câu AI mới mỗi tháng" |
| Loại câu hỏi luyện tập | **kiểu câu** | dạng bài, dạng câu, "dạng" một mình | Tránh trùng "dạng chia" |
| went của go | **dạng chia** (khi cụ thể: quá khứ, số nhiều, dạng -ing) | biến thể, inflection, "dạng" một mình | Lần đầu kèm ví dụ went → go |
| Gói | **gói Miễn phí**, **gói Dùng thử**, **gói Pro**; chip: "Miễn phí", "Dùng thử", "Pro" | Free, Trial, gói cước, thuê bao, tài khoản Pro | **Chốt D17** |
| Từ người học tự thêm | Nhãn **"Từ của tôi"**; trong câu: **"từ bạn tự thêm"** | từ riêng (trên màn), private word | **Chốt D17**. Tài liệu nội bộ, admin giữ "từ riêng" |
| Câu người học gặp từ ở ngoài | **câu đã gặp**; trong câu hướng dẫn: "câu bạn gặp" | câu ngữ cảnh, câu mẫu | "Câu ví dụ" để dành cho câu của từ điển và câu ví dụ của từ bạn tự thêm |
| Gợi ý khi làm câu | **gợi ý**; "Gợi ý 1/3" | mẹo, hint, nấc | **Chốt D17** |
| Nhãn nguồn của nghĩa do AI tra | **AI gợi ý** | AI tạo, máy dịch | **Chốt D17** |
| Bản dịch câu AI | **Bản dịch** + nhãn phụ **AI dịch** | bản dịch chuẩn | |
| Người học chỉ ra câu sai | **báo lỗi** (động từ và danh từ) | báo cáo, phản hồi, report | |
| Trả lượt cho câu AI lỗi | **trả lại lượt câu AI** ("Đã trả lại 1 lượt câu AI") | hoàn tiền, hoàn trả, refund | |
| Mức A1–C2 | **trình độ** ("Trình độ: A2", "Mọi trình độ"); mã CEFR giữ nguyên | level (trên màn người học) | **Chốt mốc 0** (Q1, theo N17) |
| Loại từ (verb, noun…) | Giữ nhãn tiếng Anh như từ điển: verb, noun, adjective, adverb | — | Là nội dung học, không phải khung giao diện (kiểu Cambridge) |
| Email | **email** | thư điện tử | |
| Mã OTP | **mã xác minh**, "mã 6 số" | OTP | |
| Ngăn Leitner | **ngăn** ("Ngăn 3 ngày") | hộp, cấp | Như màn hiện có |
| Đội vận hành | **đội Wordmet** | admin, ban quản trị (trên màn người học) | |

---

## 3. Mẫu chữ dùng chung

### 3.1 Mẫu câu

| Tình huống | Mẫu | Ví dụ |
|---|---|---|
| Lỗi | [chuyện gì xảy ra]. [làm gì tiếp]. | "Không kết nối được. Kiểm tra mạng rồi thử lại." |
| Hạn mức | hết cái gì · khi nào có lại · làm được gì ngay | "Hết phiên luyện hôm nay. Luyện tiếp từ 0:00 ngày mai. Trong lúc chờ, ôn thẻ không giới hạn." |
| Trống | chưa có gì + bước tiếp theo + nút | "Chưa có nhóm nào. Tạo nhóm đầu tiên để lưu từ bạn gặp. [Tạo nhóm đầu tiên]" |
| Hỏi lại (mất dữ liệu) | tiêu đề hỏi việc cụ thể? + hậu quả + [làm] [giữ] | "Xóa nhóm “Công nghệ”? … [Xóa nhóm và 12 từ] [Giữ nhóm]" |
| Đang chờ | "Đang … …" một ký tự "…" | "Đang tạo câu…", "Đang tra…", "Đang lưu…" |
| Thành công | "Đã …." | "Đã lưu từ “rizz” vào nhóm “Du lịch”." |

### 3.2 Nút dùng chung

[Thử lại] · [Hủy] · [Lưu] · [Lưu thay đổi] · [Xong] · [Quay lại] · [Đóng] · [Tiếp tục] · [Bỏ qua] · [Câu tiếp] · [Nộp] · [Gửi báo lỗi] · [Làm tiếp] ·
[Dừng, để sau] · [Xem Gói học]. Không dùng [OK], [Có], [Không], [Đồng ý], [Hủy bỏ].

### 3.3 Khóa AI cho gói Miễn phí (D6, dùng ở mọi chỗ có AI)

- Phần tử AI hiện bình thường, có icon ổ khóa và nhãn **Pro** (nhãn nhỏ, chữ "Pro").
- Bấm vào → một dòng ngay dưới phần tử: **"Dành cho gói Pro. Gói Pro chưa mở bán."** + link **[Xem Gói học]**. Không có nút mua, không giá.

### 3.4 Chip gói ở thanh trên

Web: chip cạnh avatar ghi **"Miễn phí"** / **"Dùng thử"** / **"Pro"** (bấm mở Gói học). Điện thoại: chip **"Miễn phí"** / **"Dùng thử"** / **"Pro"** như web.

---

## 4. Mảng A — sửa chỗ lệch (page 08, 09)

Tên khung theo quy ước hiện có; khung mới thêm hậu tố chữ cái (`K/01b`). Mỗi khung web có bản điện thoại cùng chữ, trừ khi ghi khác.

### 4.1 `K/01`, `M/01` — Đăng ký (thay form cũ)

| Phần tử | Chữ |
|---|---|
| Tiêu đề | Tạo tài khoản |
| Ô 1 | Nhãn "Tên" · gợi ý trong ô "Lan" |
| Ô 2 | Nhãn "Họ (không bắt buộc)" · gợi ý "Nguyễn" |
| Ô 3 | Nhãn "Ngày sinh" · giá trị ví dụ "14/5/2008" · dòng phụ "Wordmet dành cho người từ 13 tuổi." |
| Ô 4 | Nhãn "Email" · "lan@example.com" |
| Ô 5 | Nhãn "Mật khẩu" · dòng phụ "Tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt." |
| Ô tick | "Tôi đồng ý với **Điều khoản sử dụng** và **Chính sách bảo mật**." *(hai link: `/terms`, `/privacy`)* |
| Nút chính | [Tạo tài khoản] |
| Phụ | "Hoặc" · [Đăng nhập bằng Google] *(nhãn "Sắp có", Bước 8)* · "Đã có tài khoản? [Đăng nhập]" |
| Lỗi ô Tên trống | "Nhập tên của bạn." |
| Lỗi chưa tick | "Đồng ý với Điều khoản sử dụng và Chính sách bảo mật để tạo tài khoản." |

*Thứ tự ô theo plan: Tên, Họ trên cùng một hàng ở web; điện thoại xếp dọc. Độ dài tên: xem mục 9.*

### 4.2 `K/01b`, `M/01b` — Đăng ký, chưa đủ 13 tuổi (bỏ ngày 22/10/2026, thay bằng lỗi ngay ở ô Ngày sinh, mục 12)

| Phần tử | Chữ |
|---|---|
| Tiêu đề | Bạn chưa đủ 13 tuổi |
| Thân | Wordmet dành cho người từ 13 tuổi trở lên, nên chưa tạo được tài khoản cho bạn. |
| Nút | [Về trang chủ] |

### 4.3 Tấm Thêm từ — ô nhóm (D4): `K/40`, `K/41`, `M/50`, `M/51`, `M/52`; khung mới `K/40b`, `M/50b`

| Trạng thái | Chữ |
|---|---|
| Có nhóm dùng gần nhất | Nhãn "Lưu vào nhóm" · giá trị "Du lịch" *(nhóm dùng gần nhất; không còn "Mới thêm")* · nút [Lưu went] |
| Nhóm dùng gần nhất đã bị xóa | Nhãn "Lưu vào nhóm" · ô trống "Chọn nhóm" · lỗi khi bấm lưu: "Chọn một nhóm để lưu từ." |
| Chưa có nhóm nào (`K/40b`, `M/50b`) | "Bạn chưa có nhóm nào. Tạo nhóm đầu tiên để lưu từ này." · nút [Tạo nhóm đầu tiên] *(nút lưu ẩn tới khi có nhóm)* |
| Danh sách nhóm `K/42`, `M/52` | "Tìm hoặc tạo nhóm…" · "Dùng gần đây" · "Tất cả nhóm (100), A–Z" · nút [Lưu vào Du lịch] |

### 4.4 Câu đã gặp (D5): `K/44`, `M/53`, trang từ `K/31`, `M/41`; khung mới `K/44b`, `M/53b`

| Phần tử | Chữ |
|---|---|
| Dòng đầu tấm (`K/44`) | left, adverb: về phía bên trái · đã có 1 câu |
| Dòng phụ ô câu | Tối đa 300 ký tự. Câu hiện ở mặt sau thẻ, từ được tô. |
| `M/53` dòng phụ | Câu thứ 2 của nghĩa này *(bỏ "tối đa 5 câu")* |
| Trang từ, mỗi nghĩa | "3 câu đã gặp" *(link mở danh sách câu)*; nghĩa chưa có câu: không hiện dòng này |
| Chạm giới hạn (`K/44b`, `M/53b`) | Lỗi dưới ô câu: "Nghĩa này đã đủ số câu tối đa. Xóa bớt một câu để thêm câu mới." · link [Xem các câu đã gặp] |

*D5 để mở việc lỗi có kèm con số không; đã kiểm code: `409 sentence-limit-reached` không kèm con số và người học không đọc được giới hạn (mục 9), nên câu báo không ghi số.*

### 4.5 Mặt trước thẻ (D3): `K/20`, `K/21`, `M/30`, `M/31`, xem trước thẻ ở `K/11`, `M/20`

| Mặt | Chữ |
|---|---|
| Trước | Từ ("deploy") + loại từ ("verb"); nhãn "Ưu tiên" nếu có; "Bấm vào thẻ hoặc Space để lật" (web) · "Bấm vào thẻ để lật" (điện thoại) |
| Sau | Dạng chia · nghĩa ("triển khai") · câu ví dụ · "Câu bạn đã gặp" với từ được tô |

### 4.6 Từ hay sai: `K/56` (và `M/L56` ở mảng C)

| Phần tử | Chữ |
|---|---|
| Hộp "Từ vào và rời danh sách thế nào?" | Vào: sai 2 lần trong 5 câu gần nhất, ở mọi kiểu câu. |
| | Không tính: câu đúng nhờ gợi ý, và câu bạn đã báo lỗi mà đội Wordmet đang xem, đã sửa hoặc đã xác nhận lỗi. |
| | Rời: khi 5 câu gần nhất còn dưới 2 câu sai. |
| | Từ bạn đã bỏ khỏi việc học không nằm ở đây. |
| Cột | "5 câu gần nhất" |

### 4.7 Gói học: `K/52`, `K/52t`, `K/53`, `M/62` (và `M/62b` ở mảng C)

| Phần tử | Chữ |
|---|---|
| Nhãn đầu trang | Gói học |
| Tiêu đề | Học đều mỗi ngày, lên Pro khi cần |
| Công tắc kỳ hạn (mờ) | Theo năm · Theo tháng · "Giá và kỳ hạn hiện khi Pro mở bán" |
| Thẻ Miễn phí | "Gói của bạn" · **Miễn phí** · "Không cần thẻ ngân hàng" · "Phiên luyện hôm nay" · "1/3 đã dùng" · "Còn 2 phiên, mở lại lúc 0:00." · "Bạn đang dùng gói này" |
| Danh sách Miễn phí | Ôn thẻ, lịch ôn, nhắc học qua email · Tra từ, thêm nhanh, tối đa 100 nhóm · 3 phiên luyện mỗi ngày · Câu AI và tra bằng AI: cần gói Pro |
| Thẻ Pro | Nhãn "Chưa mở bán" · **Pro** · "Giá công bố khi mở bán" · "Nhiều phiên luyện hơn, có câu AI và tra bằng AI." |
| Danh sách Pro | 30 phiên luyện mỗi ngày · Tối đa 300 câu AI mới mỗi tháng* · 100 lượt tra AI mỗi tháng · Không quảng cáo |
| Chú thích * | *Câu AI có khi AI đang mở. Mỗi ngày cả hệ thống có một giới hạn chung; chạm giới hạn thì AI tạm dừng tới hôm sau.* |
| Dòng cuối | Wordmet chưa nhận thanh toán. Khi mở bán, bạn đăng ký ngay tại đây. · link [So sánh chi tiết các gói] |
| `K/53` (Pro do đội cấp) | Nhãn "Gói của bạn · Đội Wordmet tặng" · "Bạn đang dùng gói Pro" · "Đội Wordmet cấp từ 15/10/2026 tới hết 31/12/2026. Không thu tiền, không tự gia hạn." · "Phiên luyện hôm nay: 4/30 đã dùng" · "Còn 26 phiên, mở lại lúc 0:00." · "Lượt câu AI: còn 287/300 · Lượt tra AI: còn 96/100" · "Lượt câu AI mới có vào 15/11." · "Hết hạn thì tài khoản về gói Miễn phí; từ và lịch ôn giữ nguyên." |

*"Tối đa 300 câu AI mới mỗi tháng" là Chốt của design (mục 5, dòng A; design Bước 7 §19). "Không cần thẻ ngân hàng" thay "không cần thẻ" để không trùng "thẻ" ôn (bảng thuật ngữ).*

*Khối mức sử dụng ở trên ("Phiên luyện hôm nay", "Lượt câu AI: còn …") đã bỏ khỏi Gói học ở mốc A+B (mục 12, điểm 3, 6); chữ của khối nay nằm ở mục "Gói và mức sử dụng" của Cài đặt (`K/50`, `M/90`). Ghi sau review cuối.*

### 4.8 Hết phiên luyện: `K/55` (và `M/L55`)

| Phần tử | Chữ |
|---|---|
| Tiêu đề | Hết phiên luyện hôm nay |
| Phụ đề | Mai luyện tiếp nhé |
| Thân | Gói Miễn phí có 3 phiên luyện mỗi ngày, mở lại lúc 0:00. Trong lúc chờ, ôn thẻ không giới hạn. |
| Nút | [Ôn thẻ] *(bỏ [Xem gói học], D7)* |
| Thẻ phiên đang dở | "Nhóm Công nghệ, đã làm 3/10 câu. Phiên này đã tính vào hôm nay nên bạn vẫn làm tiếp được." · [Làm tiếp câu 4] |
| Thẻ cột phụ | "Phiên luyện hôm nay" · "đã dùng 3/3" · "Mở lại lúc 0:00, còn 2 giờ 40 phút." |

### 4.9 Ngày tháng (D17)

Mọi "Thứ Bảy, 18 tháng 10" và "Thứ Bảy, 18/10" → **"Chủ Nhật, 18/10"** (`K/10`, `K/40`, `K/41`, `M/10`–`M/13`).

### 4.10 Khung chữ dài nhất (Review Focus 1): `M/41b Trang từ: chữ dài nhất`

Một trang từ điện thoại dùng mẫu chữ dài nhất của đợt; các khung chữ dài của mảng C, D (`M/L63b`, `M/78d`) dùng lại mẫu này.

| Phần tử | Chữ mẫu (dài nhất) |
|---|---|
| Từ | underestimate *(13 ký tự)* |
| Loại từ, trình độ | verb · C1 |
| Nghĩa 1 | đánh giá thấp hơn thực tế về số lượng, khả năng hoặc tầm quan trọng của ai hoặc điều gì *(84 ký tự)* |
| Câu ví dụ | Never underestimate how long it takes to move a large application from one cloud provider to another. |
| Tên nhóm | Từ vựng IELTS Writing Task 2: môi trường và năng lượng tái tạo *(60 ký tự, tối đa của ô Tên nhóm)* |
| Câu đã gặp (300 ký tự) | *Một câu tiếng Anh đúng 300 ký tự, viết khi vẽ, có từ underestimate.* |
| Lý do báo lỗi dài nhất | Câu sai ngữ pháp hoặc không tự nhiên |
| Bản dịch dài | Đừng bao giờ đánh giá thấp thời gian cần để chuyển một ứng dụng lớn từ nhà cung cấp đám mây này sang nhà cung cấp khác. |

---

## 5. Mảng B — tài khoản

### 5.1 `K/90` — Menu avatar (web, D16)

| Phần tử | Chữ |
|---|---|
| Đầu menu | "Nguyễn Lan" · "lan@example.com" |
| Mục 1 | Cài đặt |
| Mục 2 | Gói học · *chip bên phải "Miễn phí"* |
| Mục 3 | Đăng xuất |

*Tên hiển thị = Họ + Tên ("Nguyễn Lan"); không có Họ thì chỉ Tên ("Lan").*

### 5.2 `M/90` — Cài đặt (điện thoại, mở bằng avatar; thay `M/60`)

| Nhóm | Hàng |
|---|---|
| Tài khoản | "Nguyễn Lan" · "lan@example.com · Đã xác minh email" · › *(mở `M/91`)* |
| Gói học | "Gói học" · chip "Miễn phí" · › *(bỏ nhãn "Bước 5")* |
| Học tập | "Ngôn ngữ" · "Nghĩa của từ và giao diện" · "Tiếng Việt"; "Giao diện" · "Sáng, tối hoặc theo máy" · "Theo hệ thống" |
| Nhắc học | "Nhắc học qua email" · "20:00, chỉ khi có thẻ chờ ôn" · công tắc |
| Cuối | [Đăng xuất] · "Xóa tài khoản" *(nhãn "Sắp có", Bước 8)* |

Web `K/50` (Cài đặt) giữ bố cục, đổi theo cùng chữ; bỏ hàng "Hạn mức nhóm, số từ và lượt AI · Bước 5" (thông tin này ở Gói học). Trang Cài đặt ở cả hai nền tảng **không có dải tra từ** (D16).

### 5.3 `K/91`, `M/91` — Cài đặt → Tài khoản

| Phần tử | Chữ |
|---|---|
| Tiêu đề | Tài khoản |
| Ô | "Tên" · "Lan" |
| Ô | "Họ (không bắt buộc)" · "Nguyễn" |
| Ô | "Ngày sinh" · "14/5/2008" |
| Ô chỉ đọc | "Email" · "lan@example.com" · nhãn "Đã xác minh" |
| Nút | [Lưu thay đổi] *(mờ tới khi có thay đổi)* |
| Báo sau khi lưu | Đã lưu thay đổi. |

*Sửa ngày sinh cần đổi API (design §10); màn vẽ theo hành vi sau khi đổi.*

### 5.4 `K/92`, `M/92` — Ngày sinh mới chưa đủ 13 tuổi

| Phần tử | Chữ |
|---|---|
| Ô Ngày sinh (viền đỏ) | "14/5/2015" |
| Lỗi dưới ô | Bạn cần đủ 13 tuổi để dùng Wordmet. |
| Nút | [Lưu thay đổi] *(mờ)* |

### 5.5 `K/93`, `M/93` — Đăng nhập, tài khoản bị khóa

| Phần tử | Chữ |
|---|---|
| Tiêu đề màn | Đăng nhập |
| Hộp báo (trên form) | **Tài khoản đang bị khóa** · "Bạn chưa đăng nhập được vào tài khoản này. Liên hệ đội Wordmet nếu bạn cần mở lại." |
| Form | Email, Mật khẩu giữ nguyên chữ đã nhập |

*`ASSUMPTION`: chưa có kênh liên hệ chính thức (email hỗ trợ); khi có thì thay câu cuối bằng địa chỉ cụ thể.*

### 5.6 `K/94`, `M/94` — Hôm nay khi chưa có nhóm (Review Focus 4)

| Phần tử | Chữ |
|---|---|
| Ngày | Chủ Nhật, 18/10 |
| Khối chính | **Chưa có nhóm nào** · "Tạo nhóm đầu tiên để lưu từ bạn gặp và ôn theo lịch." · [Tạo nhóm đầu tiên] |
| Khối phụ | "Tạo nhóm nhanh theo chủ đề" · "Kinh doanh · B1 · 52 từ" · [Tạo nhóm từ 52 từ này] |
| Ô thêm nhanh | "Thêm từ vừa gặp" · "Gõ từ bạn vừa gặp. Có câu chứa từ đó thì dán vào luôn. Wordmet tự nhận ra dạng chia, như went → go." |

---

## 6. Mảng C — điện thoại: Luyện tập và Gói học

Khung `M/L51`–`M/L57`, `M/L60`–`M/L67` dùng **đúng chữ của `K/51`–`K/57`, `K/60`–`K/67` sau khi áp bảng thuật ngữ** (mục 10). Chỗ điện thoại khác web:

| Khung | Khác web |
|---|---|
| `M/L51` Luyện tập | Bỏ khối "Phím tắt trong phiên"; thẻ "Phiên luyện hôm nay" lên đầu, dưới thanh trên; "Luyện theo nguồn khác" thành danh sách xếp dọc |
| `M/L54` Tùy chỉnh phiên | Toàn màn, nút [Bắt đầu 10 câu] cố định ở đáy |
| `M/L55` Hết phiên | Như 4.8 |
| `M/L56` Từ hay sai | Bảng thành danh sách thẻ: "deploy · triển khai" / "sai 3/5 · 21:06 hôm nay" |
| `M/L57` Lịch sử | Tab "Câu đã làm" · "Báo lỗi của tôi" (mảng D); mỗi câu một thẻ: "21:09 · Gõ từ · theo câu" / đề / "Bạn trả lời" / "Đáp án" / kết quả |
| `M/L60`–`M/L67` Phiên luyện | Toàn màn; chỉ dẫn phím tắt ("Bấm vào đáp án hoặc phím 1–4") → "Bấm vào đáp án. Chọn xong là chấm luôn." |
| `M/L63b` | Gõ từ theo câu với câu dài nhất (mẫu 4.10) |
| `M/62b` Gói học, Pro do đội cấp | Chữ của `K/53` (mục 4.7) |
| `M/60` → `M/90` | Hàng "Gói học" bỏ nhãn "Đang phát triển"/"Bước 5" |

---

## 7. Mảng D — Bước 7 cho người học

Khung web `K/70`–`K/88`; khung điện thoại `M/70`–`M/88` cùng số, cùng chữ (tấm từ đáy thay hộp giữa màn). Chữ ví dụ theo design Bước 7 §5.

### 7.1 Tên kiểu câu (dùng ở mọi màn)

| `type` | Tên trên màn | Dòng mô tả | Gói |
|---|---|---|---|
| `mcq` (Bước 4) | Trắc nghiệm | 4 lựa chọn, chọn từ đúng | Mọi gói |
| `true_false` (Bước 4) | Đúng/sai | Từ và nghĩa có khớp không | Mọi gói |
| `type_word` (Bước 4) | Gõ từ | Gõ lại từ tiếng Anh | Mọi gói |
| `cloze` | Điền từ vào câu | Gõ từ còn thiếu trong một câu | Dùng thử, Pro |
| `meaning_in_sentence` | Chọn nghĩa trong câu | Từ in đậm trong câu mang nghĩa nào | Dùng thử, Pro |
| `mcq_sentence` | Trắc nghiệm theo câu | Chọn từ điền vào chỗ trống | Dùng thử, Pro |

Nguồn câu của "Điền từ vào câu" (`cloze_source`): **"AI viết câu mới"** (`ai`, mặc định) · **"Câu bạn đã lưu"** (`own`). Mã `type` của Bước 4 lấy theo code (mục 9).

### 7.2 `K/70` (Pro), `K/70t` (Dùng thử), `K/70b` (Miễn phí) — Tùy chỉnh phiên có kiểu câu AI

| Phần tử | Chữ |
|---|---|
| Tiêu đề | Tùy chỉnh phiên |
| Nhóm | "Công nghệ · 18 từ" · chip lọc như `K/54` |
| Mục kiểu câu | "Kiểu câu" · "chọn một hoặc nhiều" · ba kiểu Bước 4 (7.1) |
| Mục AI | "Kiểu câu có AI" · nhãn **Pro** · ba kiểu AI (7.1) |
| Nguồn câu (khi chọn Điền từ vào câu) | "Câu lấy từ đâu?" · ◉ "AI viết câu mới" · ○ "Câu bạn đã lưu" · dòng phụ khi chọn câu đã lưu: "Bài từ câu bạn đã lưu không dùng lượt câu AI." |
| Kiểu đề | "Kiểu đề" · "cho kiểu Gõ từ" · Theo nghĩa · Theo câu · Trộn |
| Số câu | "Số câu" · "10" · "tối đa 20" |
| Dòng lượt (Pro, Dùng thử) | "Phiên này dùng tối đa 5 lượt câu AI · còn 287" |
| Dòng phiên | Miễn phí: "Dùng 1 trong 2 phiên còn lại hôm nay." · Pro, Dùng thử: "Dùng 1 trong 28 phiên còn lại hôm nay."; thẻ cột phụ ghi "Gói Pro" / "Gói Dùng thử" · "còn 28/30 phiên" *(sửa sau review cuối)* |
| Nút | [Bắt đầu 10 câu] |
| `K/70t` khác `K/70` | Chip "Dùng thử" · "còn 98" *(con số theo gói Dùng thử, mục 9)* |
| `K/70b` (Miễn phí) | Ba kiểu AI có ổ khóa + nhãn Pro, không tick được; bấm "Điền từ vào câu" → dòng "Dành cho gói Pro. Gói Pro chưa mở bán." + [Xem Gói học]; không có dòng lượt |

*`ASSUMPTION`: con số "tối đa N" app tính trước bằng công thức của API (làm tròn lên, design Bước 7 §6.1 bước 4); số thật (`ai_planned`) có sau khi mở phiên và luôn ≤ N.*

### 7.3 `K/71` — Không đủ lượt câu AI (403 `ai-quota-insufficient`)

Hộp báo ngay trên nút bắt đầu, trên màn `K/70`:

| Phần tử | Chữ |
|---|---|
| Tiêu đề hộp | Không đủ lượt câu AI |
| Thân | Phiên này cần 5 lượt câu AI, bạn còn 2. Lượt câu AI mới có vào 15/11. |
| Gợi ý | Giảm số câu, hoặc bỏ kiểu câu có AI rồi bắt đầu lại. |
| Nút | [Bỏ kiểu câu có AI] |

*Con số: `needed`, `remaining`, `resets_at` của lỗi (mục 9). Mốc nạp hiện ngày ngắn ("15/11"); cùng ngày thì giờ ("0:00").*

### 7.4 `K/72` — AI chưa sẵn sàng (503 `ai-unavailable` khi mở phiên)

| Phần tử | Chữ |
|---|---|
| Tiêu đề hộp | AI tạm chưa dùng được |
| Thân | Kiểu câu có AI đang tạm dừng. Bạn vẫn luyện được với các kiểu câu khác. |
| Nút | [Bỏ kiểu câu có AI] |

*Một câu cho mọi lý do (`model-not-set`, `provider-not-configured`, `daily-call-cap`, `ai-disabled`); người học không thấy chữ "model".*

### 7.5 `K/73` — Đang tạo câu (`preparing`)

| Phần tử | Chữ |
|---|---|
| Đầu phiên | "Luyện tập · Công nghệ" · "Câu 4/10" |
| Giữa màn | **Đang tạo câu…** · "Thường mất vài giây." |
| Nút | *không có* |

### 7.6 `K/74a`–`K/74d` — Phiên chỉ có kiểu câu AI, AI không dùng được (`ai_unavailable`)

Nút chung: [Thử lại] (gửi `retry_ai`) · [Dừng, để sau]. Dòng chung dưới nút: "Dừng thì phiên vẫn đang dở, bạn làm tiếp sau được."

| Khung | `reason` | Tiêu đề | Thân |
|---|---|---|---|
| `K/74a` | `ai-failed` | Chưa tạo được câu | AI gặp lỗi khi viết câu này. Câu này không tính lượt câu AI. |
| `K/74b` | `quota-exhausted` | Hết lượt câu AI | Lượt câu AI mới có vào 15/11. |
| `K/74c` | `plan-required` | Gói của bạn chưa có câu AI | Gói Pro của bạn đã hết hạn nên các câu AI còn lại không tạo được. *(Chỉ có nút vàng [Dừng, để sau]; không có [Thử lại] vì thử lại không được tới khi có gói. Sửa sau review cuối.)* |
| `K/74d` | `ai-unavailable` | AI đang tạm dừng | Wordmet tạm dừng AI. Thử lại sau ít phút. |
| `K/74a` + từ chưa nhận ra | `ai-failed` + `word-not-recognized` | Chưa tạo được câu | AI chưa nhận ra từ “rizz” bạn tự thêm. Kiểm lại từ này trong Từ của tôi. · link [Mở “rizz”] |

### 7.7 `K/75` — Phiên trộn: thông báo đổi kiểu câu (một lần mỗi phiên)

Dải báo trên câu hỏi (đóng được):

| Biến thể | Chữ |
|---|---|
| AI lỗi ở một câu | AI tạm chưa dùng được, câu này đổi sang kiểu câu khác. Không tính lượt câu AI. |
| Hết lượt giữa phiên | Hết lượt câu AI. Các câu còn lại của phiên dùng kiểu câu khác. Lượt câu AI mới có vào 15/11. |
| Gói hết hạn giữa phiên | Gói của bạn không còn câu AI. Các câu còn lại của phiên dùng kiểu câu khác. |
| AI tắt, chạm giới hạn chung | AI đang tạm dừng. Các câu còn lại của phiên dùng kiểu câu khác. |

### 7.8 `K/76` — Từ bạn tự thêm mà AI chưa nhận ra (`word-not-recognized`)

Dải báo: "AI chưa nhận ra từ “rizz” bạn tự thêm, nên câu này dùng kiểu câu khác. Kiểm lại từ trong Từ của tôi." · link [Mở “rizz”]

### 7.9 `K/77` — Mở phiên mới khi còn phiên đang dở (D9)

| Phần tử | Chữ |
|---|---|
| Tiêu đề hộp | Bạn có phiên đang dở 6/10 |
| Thân | Nhóm Công nghệ, đã làm 6/10 câu. Mở phiên mới sẽ đóng phiên này. |
| Nút | [Làm tiếp] · [Bỏ, mở phiên mới] |

### 7.10 `K/78a`–`K/78c` — Ba kiểu câu AI, đang hỏi

Đầu phiên chung: "Luyện tập · Công nghệ" · "Câu 4/10" · [Báo lỗi]. Nhãn nhỏ trên đề: **"Câu AI"**.

| Khung | Đề | Câu | Đáp án / ô | Gợi ý |
|---|---|---|---|---|
| `K/78a` Điền từ vào câu | Gõ từ còn thiếu, đúng dạng trong câu | We use Docker to ___ the app to the production server. | Ô gõ · [Nộp] · [Bỏ qua, xem đáp án] | [Gợi ý] → "Gợi ý 1/3: d…" → "Gợi ý 2/3: to move software to a server so that people can use it" → "Gợi ý 3/3: triển khai"; hết: "Hết gợi ý" |
| `K/78b` Chọn nghĩa trong câu | Từ in đậm trong câu này nghĩa là gì? | The team **deployed** the update to all servers. | triển khai (phần mềm) · giao hàng · bảo vệ · trì hoãn | [Gợi ý] → "Gợi ý 1/1: to move software to a server so that people can use it" |
| `K/78c` Trắc nghiệm theo câu | Chọn từ điền vào chỗ trống | We ___ the app to the server yesterday. | deployed · delivered · defended · delayed | [Gợi ý] → "Gợi ý 1/1: to move software to a server so that people can use it" |

Dòng dưới cùng (như Bước 4): "Dùng gợi ý vẫn được chấm như thường, nhưng câu đúng nhờ gợi ý không có nút Đã biết."
`M/78d`: câu AI dài nhất (mẫu 4.10).

### 7.11 `K/79a`, `K/79b` — Đã nộp câu AI

| Khung | Chữ |
|---|---|
| `K/79a` câu AI (người học tiếng Việt) | "Đúng rồi" · "deployed · triển khai (phần mềm)" · "to move software to a server so that people can use it" · khối **Bản dịch** nhãn phụ **AI dịch**: "Chúng tôi dùng Docker để triển khai ứng dụng lên máy chủ chính thức." · [Cần ôn lại] [Đã biết] [Câu tiếp] · [Báo lỗi] |
| `K/79b` câu bạn đã lưu | Nhãn trên đề "Câu bạn đã lưu" · "Đúng rồi" · đáp án, nghĩa · **không** có khối Bản dịch · **không** có nút Báo lỗi |

*Câu của bản dịch là câu AI dịch, nên "Chúng tôi" ở đây là nội dung câu, không phải app tự xưng.*

### 7.12 `K/80` — Báo lỗi theo lý do

| Phần tử | Chữ |
|---|---|
| Tiêu đề | Báo lỗi câu này |
| Phụ đề | Câu AI · Điền từ vào câu · triển khai (phần mềm) |
| Câu hỏi | Lỗi gì? |
| Lý do (câu AI, theo thứ tự seed) | Nghĩa sai · Đáp án đúng mà bị chấm sai · Gợi ý sai · Khác · Câu sai ngữ pháp hoặc không tự nhiên · Có hơn một đáp án đúng · Câu dùng sai nghĩa của từ |
| Lý do (câu thường) | Nghĩa sai · Đáp án đúng mà bị chấm sai · Gợi ý sai · Khác |
| Ô ghi chú | "Ghi chú" · "không bắt buộc · 27/300" · gợi ý trong ô theo lý do, ví dụ "Từ nào khác cũng đúng?" |
| Ô ghi chú bắt buộc (biến thể) | "Ghi chú" · "bắt buộc · 0/300" · lỗi: "Ghi rõ lỗi để gửi báo lỗi này." |
| Dòng cuối | Đội Wordmet xem lại câu này. Trong lúc chờ, câu này không tính vào Từ hay sai. Nếu đúng là AI viết sai câu, bạn được trả lại 1 lượt câu AI. |
| Nút | [Hủy] · [Gửi báo lỗi] |
| Sau khi gửi | Đã gửi báo lỗi. Xem kết quả trong Lịch sử → Báo lỗi của tôi. |

*Danh sách lý do, ghi chú bắt buộc, có trả lượt: admin chỉnh được; màn vẽ theo seed (mục 9).*

### 7.13 `K/81` — Báo lỗi câu AI về từ bạn tự thêm (Review Focus 3)

Như `K/80`, thêm ô tick bắt buộc trên nút gửi:

| Phần tử | Chữ |
|---|---|
| Ô tick | Cho đội Wordmet thấy từ này |
| Dòng phụ | Nhân viên sẽ xem câu này và từ “rizz” bạn tự thêm để kiểm tra. |
| Nút gửi khi chưa tick | [Gửi báo lỗi] *(mờ)* |

### 7.14 `K/82` — Lịch sử luyện tập, tab "Báo lỗi của tôi" (D8)

| Phần tử | Chữ |
|---|---|
| Tiêu đề | Lịch sử luyện tập |
| Tab | Câu đã làm · Báo lỗi của tôi |
| Cột | Từ · Lý do · Ngày gửi · Kết quả |
| Dòng 1 | deploy · Có hơn một đáp án đúng · 18/10 · **Đang xem** |
| Dòng 2 | cache · Câu sai ngữ pháp hoặc không tự nhiên · 17/10 · **Đã xác nhận lỗi** · "Đã trả lại 1 lượt câu AI" |
| Dòng 3 | release · Nghĩa sai · 15/10 · **Đã sửa** |
| Dòng 4 | network · Đáp án đúng mà bị chấm sai · 14/10 · **Không có lỗi** |
| Dòng 5 | latency · Khác · 12/10 · **Đã xác nhận lỗi** · "Lượt câu AI này không trả lại được" |
| Dòng phụ dưới trạng thái "Đã xác nhận lỗi" (theo `refunded` của `GET /v1/practice/reports`) | `true`: "Đã trả lại 1 lượt câu AI" · `null` (đang chờ hệ thống trả): "Đang trả lại 1 lượt câu AI" · `false` (lý do không có trả lượt, hoặc câu không tính lượt): "Lượt câu AI này không trả lại được". *(Thêm sau review cuối.)* |

### 7.15 `K/83` — "Báo lỗi của tôi" trống (Review Focus 4)

"Bạn chưa báo lỗi câu nào." · "Gặp câu sai khi luyện tập, bấm Báo lỗi ngay trên câu đó. Kết quả hiện ở đây." · [Về Luyện tập]

### 7.15b `K/57b`, `M/L57b` — Lịch sử luyện tập trống, tab "Câu đã làm" (Review Focus 4; thêm khi đóng đợt, mục 13)

"Bạn chưa làm câu nào." · "Làm một phiên luyện, các câu bạn đã làm sẽ hiện ở đây." · [Về Luyện tập]

### 7.16 `K/85` (Pro), `K/85t` (Dùng thử), `K/85b` (Miễn phí) — Thêm từ có "Tra bằng AI"

| Phần tử | Chữ |
|---|---|
| Tiêu đề tấm | Thêm từ vừa gặp |
| Ô từ | "rizz" |
| Ô câu | "Câu bạn gặp (không bắt buộc)" · "That guy has so much rizz." |
| Không tìm thấy | Không tìm thấy “rizz” trong từ điển Wordmet. |
| Nút AI (Pro) | [Tra bằng AI] · dòng phụ "còn 96 lượt tra AI" |
| Ô tick (khi có câu) | Gửi kèm câu đã gặp cho AI *(mặc định không tick)* |
| Phụ | [Tự nhập nghĩa] |
| Sau "Không phải nghĩa này" | Khi từ có trong từ điển: link "Không phải nghĩa bạn cần?" → [Tra bằng AI] |
| `K/85t` | Như `K/85`, chip "Dùng thử", con số theo gói Dùng thử |
| `K/85b` (Miễn phí) | Nút [Tra bằng AI] có ổ khóa + nhãn Pro; bấm → "Dành cho gói Pro. Gói Pro chưa mở bán." + [Xem Gói học]; [Tự nhập nghĩa] vẫn dùng được |

Trạng thái phụ, vẽ gộp trong `K/85c`:

| Khi | Chữ |
|---|---|
| Đang tra (cả `409 ai-in-progress`) | Đang tra… |
| `503 ai-lookup-failed`, thử lại được | Chưa tra được từ này. Thử lại sau ít phút. [Thử lại] |
| `503 ai-lookup-failed`, không thử lại được | AI không tra được từ này. Bạn tự nhập nghĩa nhé. [Tự nhập nghĩa] |
| Hết lượt tra AI | Hết lượt tra AI. Lượt tra AI mới có vào 15/11. [Tự nhập nghĩa] |
| AI đang tạm dừng (`503 ai-unavailable`) | AI đang tạm dừng. Bạn tự nhập nghĩa nhé. [Tự nhập nghĩa] |

### 7.17 `K/86` — Kết quả tra bằng AI

| Phần tử | Chữ |
|---|---|
| Đầu | Kết quả cho “rizz” · "Đã dùng 1 lượt tra AI · còn 95" |
| Khối 1 (khi chữ có trong từ điển) | "Nghĩa có sẵn trong từ điển" · danh sách nghĩa · [Chọn] mỗi nghĩa |
| Khối 2 | Nhãn **AI gợi ý** · "rizz" · "noun · B2" · nghĩa "sức hút, khả năng tán tỉnh" · "Định nghĩa tiếng Anh (chỉ để tham khảo, không lưu): charm or the ability to attract someone" |
| Câu ví dụ AI | "He's got serious rizz." |
| Dòng phụ | AI gợi ý có thể sai. Kiểm lại trước khi lưu. |
| Nút | [Sửa rồi lưu] |

*Người học tiếng Anh thấy định nghĩa tiếng Anh làm nghĩa (design Bước 7 §11.1); mockup chỉ vẽ người học tiếng Việt.*

### 7.18 `K/87` — Sửa trước khi lưu

| Phần tử | Chữ |
|---|---|
| Tiêu đề | Sửa trước khi lưu |
| Ô | "Từ" · "rizz" |
| Ô | "Loại từ" · "noun" |
| Ô | "Nghĩa" · "sức hút, khả năng tán tỉnh" |
| Ô | "Trình độ" · "B2" |
| Ô | "Chủ đề (không bắt buộc)" · "Đời sống" |
| Ô | "Dạng chia của (không bắt buộc)" · trống |
| Câu ví dụ | "Câu ví dụ (tối đa 2)" · "He's got serious rizz." · [+ Thêm câu ví dụ] · dòng phụ "Tối đa 300 ký tự mỗi câu." |
| Nhóm | "Lưu vào nhóm" · "Du lịch" (D4) |
| Dòng phụ | Từ này mang nhãn AI gợi ý tới khi bạn sửa nghĩa, chủ đề hoặc câu ví dụ. |
| Nút | [Hủy] · [Lưu từ] |
| Sau khi lưu | Đã lưu “rizz” vào nhóm “Du lịch”. |

### 7.19 `K/88` — Trang từ bạn tự thêm có nhãn "AI gợi ý"

| Phần tử | Chữ |
|---|---|
| Đầu | "rizz" · "noun · B2" · nhãn "Từ của tôi" · nhãn **AI gợi ý** |
| Dòng nguồn | Nguồn: AI gợi ý. Nghĩa này chưa ai duyệt, bạn nên kiểm lại. |
| Nghĩa | sức hút, khả năng tán tỉnh |
| Câu ví dụ | "Câu ví dụ" · "He's got serious rizz." |
| Câu đã gặp | "1 câu đã gặp" · "That guy has so much rizz." |
| Nút | [Sửa] · [Xóa từ] · [+ Thêm vào nhóm] |
| Trong nhóm | "Đang học · Du lịch" |

### 7.20 Bản điện thoại `M/70`–`M/88`

Chữ như web. Khác: hộp báo của `K/71`, `K/72` là tấm từ đáy; `K/77` là tấm từ đáy; báo lỗi `K/80`, `K/81` là tấm toàn màn có nút gửi cố định ở đáy;
phiên luyện toàn màn, không thanh trên. Review Focus 2: `M/85`, `M/85t`, `M/85b` (tấm tra AI ở ba gói), `M/70`, `M/70t`, `M/70b`.

---

## 8. Mảng E — admin (page 04, mức khung)

Mức khung (D11): cấu trúc, cột, bộ lọc, trạng thái, khác nhau `admin` / `editor`. Người đọc là nhân viên: được dùng thuật ngữ kỹ thuật (model, prompt, token),
"từ riêng" thay "Từ của tôi", tên khóa API ở dòng phụ chữ đơn cách (N20). Tiền nhà cung cấp AI theo `Intl` vi-VN: "12,40 US$"; tiền quy đổi: "323.640 ₫".

### 8.0 Thanh bên admin (cập nhật `Admin/Sidebar`)

| Nhóm | Mục (`admin` thấy hết; *chỉ admin* = `editor` không thấy mục đó) |
|---|---|
| Tổng quan | Dashboard *(giữ placeholder, chưa có API)* |
| Nội dung | Từ · Nghĩa · Chủ đề · Lô nhập · Publish job · Xuất CSV · Nguồn · Dạng chia chưa biết |
| Luyện tập | Báo lỗi · Lý do báo lỗi *(chỉ admin)* · Trả lượt *(chỉ admin)* |
| Người học | Người dùng *(chỉ admin)* · Cấp gói và lượt |
| AI *(cả nhóm chỉ admin)* | Tình trạng · Model · Thao tác · Prompt · Bộ ví dụ · Chi phí · Các lần gọi |
| Hệ thống | Cài đặt hệ thống *(chỉ admin)* · Vai trò & staff *(chỉ admin)* |

Khung `A/73e` vẽ danh sách báo lỗi như `editor` thấy (thanh bên thiếu các mục chỉ admin). Mở thẳng đường dẫn của trang chỉ admin khi là `editor`: "Bạn không có quyền xem trang này." · [Về trang chủ].

### 8.1 `A/87` Từ, `A/88` Nghĩa (+ `A/88b` chi tiết), `A/89` Chủ đề — thay `A/D02`–`A/D04`

| Khung | Phần tử | Chữ |
|---|---|---|
| `A/87` | Tiêu đề, ô tìm | Từ · "Tìm theo từ hoặc cách viết khác" |
| | Bộ lọc | Trình độ (A1–C2) · Có nghĩa / Chưa có nghĩa · Trình độ lệch nhau · Lô nhập |
| | Cột | Từ · Loại từ · Trình độ hiển thị · Nghĩa (số nghĩa, trạng thái) · Từ chức năng · Cách viết khác |
| | Thao tác dòng | Sửa trình độ · Sửa cách viết khác · Đánh dấu từ chức năng *(quyền `taxonomy.manage`)* · Thêm nghĩa |
| | Thêm cả loạt | [Dán danh sách từ] · "Mỗi dòng một từ: lemma,pos (tối đa 500 dòng)" |
| `A/88` | Tiêu đề, bộ lọc | Nghĩa · Trạng thái: Thiếu nội dung / Bản nháp đang mở / Đã publish · Trình độ · Loại từ · Chủ đề · Lô nhập |
| | Cột | Từ · Loại từ · Nghĩa tiếng Việt · Trình độ · Trạng thái · Bản sửa · Thiếu *(gloss / ví dụ / trình độ)* |
| | Thao tác hàng loạt | [Đánh dấu đã review] · [Từ chối] · [Publish] · [Gỡ khỏi app] · [Ngừng dùng] |
| `A/88b` | Khối người thao tác (gần nhất) | "Review: lan.editor@wordmet.com · Chủ Nhật, 18/10, 9:12" · "Publish: an.admin@wordmet.com" · "Đổi trạng thái gần nhất: an.admin@wordmet.com · gỡ khỏi app · 18/10, 10:05" |
| | Ghi chú | Chỉ lưu lần gần nhất, không có lịch sử. |
| | Nội dung | Nghĩa tiếng Việt · Định nghĩa tiếng Anh · Câu ví dụ (tối đa 3) · Chủ đề · Dạng được chấp nhận · [Lưu bản nháp] · [Lưu và publish] |
| `A/89` | Tiêu đề, cột | Chủ đề · Mã · Tên tiếng Việt · Tên tiếng Anh · Trạng thái (Đang dùng / Đã lưu trữ) |
| | Thao tác | [Thêm chủ đề] · Sửa tên · Lưu trữ / Dùng lại *(quyền `taxonomy.manage`; không xóa)* |

### 8.2 `A/70a`–`A/70f` Cài đặt hệ thống (D10; thay nội dung `A/60`, bỏ khối "Mẫu email")

Đầu trang: "Cài đặt hệ thống" · tab Nhắc học · Học và ôn · Luyện tập · Gói và lượt · Nội dung · AI · [Lưu thay đổi] · link [Lịch sử thay đổi] (khóa, giá trị cũ → mới,
email người đổi, thời điểm). Mỗi ô: nhãn · dòng phụ "`khóa` · khoảng … · mặc định …". Ô để trống được ghi "Để trống = không giới hạn". Lỗi lưu: "Có người vừa lưu
cài đặt khác. Tải lại để xem bản mới." (409 `version-conflict`); "Giá trị ngoài khoảng cho phép." (400). Ghi chú cuối tab Nhắc học: "Mẫu email: bàn sau."

| Tab | Nhãn ô (khóa · khoảng · mặc định) |
|---|---|
| `A/70a` Nhắc học | Bật nhắc học toàn hệ thống (`enabled`, bật/tắt, bật) · Giờ gửi theo giờ người học (`send_time`, 06:00–22:00, mỗi 15 phút, 20:00) · Khoảng cách tối thiểu giữa hai email nhắc (`min_gap_days`, 1–7 ngày, 2) · Vắng bao lâu thì gửi "Đã lâu rồi bạn chưa vào học" (`inactive_after_days`, 3–30 ngày, 7) · Vắng bao lâu thì ngừng nhắc (`stop_after_days`, 30–180 ngày và lớn hơn ô trên, 60) |
| `A/70b` Học và ôn | Từ mới mỗi nhóm mỗi ngày (`new_per_group_per_day`, 1–100, 20) · Từ ôn mỗi nhóm mỗi ngày (`reviews_per_group_per_day`, 10–500 hoặc để trống, 100) · Quá hạn bao lâu thì vào danh sách cân nhắc (`backlog_after_days`, 30–365 ngày, 60) · Số nhóm mỗi người (`groups_per_user`, 10–1.000, 100) · Số từ mỗi nhóm (`items_per_group`, 100–10.000, 2.000) |
| `A/70c` Luyện tập | Số câu tối đa mỗi phiên (`max_questions_per_session`, 5–100, 20) · Số câu mặc định (`default_questions_per_session`, 1–100 và ≤ số tối đa, 10) · Giữ lịch sử luyện tập (`history_months`, 3–24 tháng, 6) · Tỉ lệ cặp đúng ở câu Đúng/sai (`true_false_true_percent`, 20–80%, 50%) · Tự đóng phiên bỏ dở sau (`idle_session_close_hours`, 1–168 giờ, 24) · Số báo lỗi mỗi giờ mỗi người (`reports_per_hour`, 5–100, 20) · Độ dài tối đa của định nghĩa làm gợi ý (`hint_definition_max_chars`, 80–500 ký tự, 200) · Số lần làm lại khi gõ sai (`type_word_max_retries`, 1–10 hoặc để trống, để trống) · Số câu AI tạo trước (`ai_prefetch_count`, 0–20, 0 = tắt, 2) |
| `A/70d` Gói và lượt | Phiên luyện mỗi ngày, gói Miễn phí (`free_practice_sessions_per_day`, 1–50, 3) · Phiên luyện mỗi ngày, gói Pro và Dùng thử (`pro_practice_sessions_per_day`, 1–200 và ≥ gói Miễn phí, 30) · Lượt câu AI mỗi tháng, Pro (`pro_ai_practice_per_cycle`, 0–5.000, 300) · Lượt tra AI mỗi tháng, Pro (`pro_ai_lookup_per_cycle`, 0–5.000, 100) · Lượt câu AI mỗi tháng, Dùng thử (`trial_ai_practice_per_cycle`, 0–5.000, 300) · Lượt tra AI mỗi tháng, Dùng thử (`trial_ai_lookup_per_cycle`, 0–5.000, 100) · Số ngày ân hạn (`grace_days`, 0–16, 7) · Nhắc trước khi hết dùng thử (`trial_reminder_days_before`, 1–6 ngày, 2) · Nhắc trước khi gia hạn (`renewal_notice_days_before`, 1–30 ngày hoặc để trống = không gửi, để trống) · Bật AI toàn hệ thống (`ai_enabled`, bật) · Trần lượt AI mỗi ngày, toàn hệ thống (`ai_daily_cap`, 0–100.000, 1.000) · Tô vàng khi dùng tới (`ai_cap_alert_percent`, 50–95% hoặc để trống, 75%) · Bật quảng cáo (`ads_enabled`, tắt) · Quảng cáo toàn màn mỗi ngày (`ads_interstitial_per_day`, 0–20, 3) · Khoảng cách giữa hai quảng cáo (`ads_min_interval_minutes`, 1–240 phút, 10) |
| `A/70d` khối đầu | "Lượt AI hôm nay: 812/1.000 (81%)" *(tô vàng khi ≥ ngưỡng)* · "Đã xác nhận 790 · đang giữ chỗ 22" · "Tính theo ngày giờ Việt Nam." |
| `A/70e` Nội dung | Số từ riêng mỗi người (`private_words_per_user`, 1.000–100.000, 10.000) · Số câu đã gặp mỗi nghĩa (`sentences_per_sense`, 5–100, 20) |
| `A/70f` AI | Thời gian chờ mỗi lời gọi (`call_timeout_seconds`, 3–30 giây, 10) · Số lời gọi cùng lúc (`max_concurrent_calls`, 1–500, 50) · Trần lời gọi nhà cung cấp mỗi ngày (`daily_provider_calls_cap`, 0–1.000.000 hoặc để trống, 3.000) · Giữ nội dung lời gọi (`content_retention_days`, 0–30 ngày, 0 = không lưu, 7) · Tỷ giá USD → VND (`usd_vnd_rate`, 10.000–100.000, 26.100) |

### 8.3 `A/71` Người dùng, `A/72` Chi tiết, `A/72b` Khóa tài khoản (chỉ admin; thay `A/D07`)

| Khung | Phần tử | Chữ |
|---|---|---|
| `A/71` | Ô tìm | "Tìm theo email, họ hoặc tên (từ 2 ký tự)" · dòng phụ "Không phân biệt hoa thường; có phân biệt dấu." |
| | Lọc | Tất cả · Đang hoạt động · Đang khóa |
| | Cột | Email · Họ tên · Vai trò (admin / editor / người học) · Email đã xác minh · Trạng thái · Ngày tạo · Lần cuối vào |
| | Chân bảng | "Mới nhất trước · 20 người mỗi trang" · [Trang sau] |
| | Trống | Không có ai khớp “ngoc”. Thử tìm theo email. |
| `A/72` | Thông tin | Email · Tên · Họ · Ngày sinh "14/5/2008" · Đồng ý điều khoản "18/10/2026, 9:00 · bản 2026-10-01" · Vai trò · Trạng thái |
| | Khi đang khóa | "Đang khóa từ 18/10/2026, 10:20 · bởi an.admin@wordmet.com" · "Lý do: Gửi báo lỗi rác nhiều lần." · [Mở khóa] |
| | Khi đang hoạt động | [Khóa tài khoản] *(không có với chính mình và với `admin`)* |
| `A/72b` | Hộp khóa | **Khóa tài khoản lan@example.com?** · "Người này bị đăng xuất khỏi mọi thiết bị và không đăng nhập được tới khi mở khóa." · ô "Lý do (1–500 ký tự, một dòng)" · [Khóa tài khoản] [Giữ nguyên] |
| | Lỗi | "Không khóa được chính bạn hoặc một admin." (409 `lock-rule`) |

### 8.4 Báo lỗi: `A/73` danh sách, `A/73e` (editor), `A/74` chi tiết và xử lý (thay `A/D05`)

| Khung | Phần tử | Chữ |
|---|---|---|
| `A/73` | Lọc | Trạng thái: Chưa xử lý / Không có lỗi / Đã sửa / Đã xác nhận lỗi · Lý do (danh sách lý do) · Nguồn câu: Câu thường / Câu AI |
| | Cột | Từ · Kiểu câu · Lý do · Nguồn · Ghi chú · Ngày gửi · Trạng thái · Người xử lý |
| | Trống | Không còn báo lỗi chưa xử lý. |
| `A/74` | Câu | Đề (từ riêng đã che: "[từ riêng của người học]", "[nghĩa của từ riêng]") · đáp án đúng · gợi ý đã xem · câu trả lời của người học |
| `A/74b` *(sửa sau review cuối)* | Câu thường về từ catalog, lựa chọn nhiễu là từ riêng | "Báo lỗi · server" · "Câu thường · Trắc nghiệm" · Từ "server" (không che) · Đáp án đúng "máy chủ" · lựa chọn "máy chủ" (Đáp án đúng), "[nghĩa của từ riêng]" (đã che), "bộ nhớ đệm", "[nghĩa của từ riêng]" (đã che · Người học chọn) · Lý do "Nghĩa sai" · [Không có lỗi] [Đã sửa]. Câu thường mà từ đang hỏi là từ riêng thì không báo lỗi được (Bước 4 D36, `report-not-available`), nên không có màn cho trường hợp đó. |
| | Câu AI có từ riêng được chia sẻ | Nhãn "Người học đồng ý cho xem từ này" · từ đang hỏi không bị che; các lựa chọn khác vẫn che *(Review Focus 3)* |
| | Thông tin AI | Mã thao tác · Mã lời gọi · Model · Bản prompt |
| | Nút, câu thường | [Không có lỗi] · [Đã sửa] |
| | Nút, câu AI | [Không có lỗi] · [Xác nhận lỗi] · dòng phụ khi lý do có trả lượt: "Xác nhận lỗi sẽ trả lại 1 lượt câu AI cho người học." |
| | Đã xử lý | "Đã xác nhận lỗi · editor · 18/10/2026, 11:02" · "Đã trả lại 1 lượt câu AI" / "Không trả lượt (lý do không có trả lượt)" / "Chưa trả được, hệ thống thử lại mỗi giờ" |
| | Lỗi | "Báo lỗi này đã được xử lý." (409 `report-not-open`) |

### 8.5 `A/75` Lý do báo lỗi, `A/75b` thêm/sửa (chỉ admin)

| Phần tử | Chữ |
|---|---|
| Cột | Thứ tự · Mã · Tên tiếng Việt · Tên tiếng Anh · Áp cho (Câu AI / Câu thường / Cả hai) · Bắt buộc ghi chú · Có trả lượt · Đang dùng |
| Nút | [Thêm lý do] · Sửa · Tắt / Bật *(không có xóa)* |
| Ghi chú | Lý do đã tắt không hiện cho người học; báo lỗi cũ giữ tên lúc gửi. |
| Form `A/75b` | Mã (chỉ đặt khi tạo, a–z, 0–9, _) · Tên tiếng Việt · Tên tiếng Anh (1–100 ký tự) · Gợi ý trong ô ghi chú, tiếng Việt / tiếng Anh (không bắt buộc, tối đa 200) · Áp cho · Bắt buộc ghi chú · Có trả lượt (chỉ có tác dụng với câu AI) · Thứ tự (0–10.000) · [Lưu] |

### 8.6 `A/76` Trả lượt (chỉ admin)

| Phần tử | Chữ |
|---|---|
| Lọc | Người xử lý · Từ ngày · Đến ngày |
| Cột | Báo lỗi · Người học · Người xử lý · Vai trò · Tự xử lý báo lỗi của mình · Trả lượt (Đã trả / Không trả / Đang thử lại) · Thời điểm |
| Ghi chú | Không thu hồi được lượt đã trả. |
| Trống | Chưa có lần xác nhận lỗi nào trong khoảng này. |

### 8.7 `A/77` Dạng chia chưa biết, `A/77b` trống (`admin`, `editor`; thay `A/D06`)

| Phần tử | Chữ |
|---|---|
| Mô tả | Dạng AI đã dùng mà bảng dạng chia chưa có. Có thể lẫn từ đồng nghĩa, cụm nhiều chữ, lỗi chính tả. |
| Cột | Từ gốc · Dạng AI dùng · Số lần bị loại · Lần đầu · Lần gần nhất |
| Nút | [Nhận dạng này] · [Bỏ qua] |
| Sau khi nhận | Đã thêm “went” vào dạng chia của “go”. · [Hoàn tác] *(gỡ dạng vừa nhận, `DELETE /v1/admin/content/word-forms/{id}`; thêm khi đóng đợt, mục 13)* |
| Trống `A/77b` | Chưa có dạng chia nào cần xem. Khi AI dùng một dạng bảng chưa biết, dạng đó hiện ở đây. |

### 8.8 `A/78` Cấp gói và lượt, `A/79` cấp mới, `A/79e` (editor) — thay `A/D08`

| Khung | Phần tử | Chữ |
|---|---|---|
| `A/78` | Khối đầu (chỉ admin) | "Lượt AI hôm nay: 812/1.000" |
| | Lọc | Người học · Người cấp · Còn hiệu lực · Sắp hết hạn trong … ngày |
| | Cột | Người học · Loại (Gói Pro / Con số riêng) · Con số · Từ ngày · Tới ngày · Người cấp · Vai trò · Lý do · Trạng thái (Đang hiệu lực / Chưa bắt đầu / Đã thu hồi / Đã hết hạn / Bị thay thế) |
| | Thao tác | Sửa ngày · Thu hồi (ô lý do 1–300) |
| | Trống | Chưa cấp gói hay con số riêng cho ai. [Cấp mới] |
| `A/79` | Form | Người học (tìm theo email) · Loại: ◉ Gói Pro ○ Con số riêng · Phiên luyện mỗi ngày (0–200) · Lượt câu AI mỗi tháng (0–5.000) · Lượt tra AI mỗi tháng (0–5.000) · Từ ngày (mặc định bây giờ) · Tới ngày · Lý do · [Cấp] |
| | Ghi chú | Cấp gói Pro bắt đầu ngay sẽ thay lần cấp gói đang có. Lượt AI mới tính theo chu kỳ tháng từ ngày bắt đầu. |
| `A/79e` | Khác của editor | Không có hai ô lượt AI · không chọn được tài khoản staff hay chính mình · không có khối "Lượt AI hôm nay" · lỗi: "Editor không cấp được cho tài khoản này." (409 `grant-not-allowed`) |
| `A/78d` *(mục 13)* | Hộp Sửa ngày (D38 Bước 5) | **Sửa ngày lần cấp của ngoc.tran@example.com** · "Gói Pro · đang hiệu lực từ 22/10/2026" · Từ ngày (chỉ sửa khi chưa bắt đầu) · Tới ngày · Lý do (bắt buộc) · "Dời ra hay rút ngắn đều được, miễn ngày mới vẫn ở tương lai. Lượt AI không đếm lại." · "Lần sửa trước: 20/10/2026 · an.admin@wordmet.com · tới 21/11 → 21/12 · Kéo dài cho lớp IELTS" · lỗi 409 `grant-not-active`: "Lần cấp này đã thu hồi hoặc đã hết hạn." · [Hủy] [Lưu ngày mới] |
| `A/79b` *(mục 13)* | Xác nhận khi người nhận đang trả tiền tự gia hạn (D32 Bước 5, `confirm_turn_off_paid_renewal`) | **Cấp gói Pro cho minh.le@example.com?** · "Người này đang trả tiền cho gói Pro và đang tự gia hạn. Cấp gói sẽ:" · "tắt tự gia hạn của gói trả tiền, không hoàn tiền;" · "phần kỳ đã trả còn lại vẫn là Pro;" · "thu hồi lần cấp gói đang có (nếu có) và đếm lượt AI lại từ hôm nay." · [Giữ nguyên] [Cấp và tắt tự gia hạn] |

### 8.9 AI của Bước 6 (chỉ admin; thay `A/D09`–`A/D11`)

| Khung | Phần tử | Chữ |
|---|---|---|
| `A/84` Tình trạng | Cột theo 6 thao tác (`generate_cloze`, `lookup_word`, `translate_sentence`, `generate_meaning_question`, `generate_sentence_mcq`, `check_private_word`) | Thao tác · Sẵn sàng · Lý do (AI đang tắt / Chưa chọn model / Nhà cung cấp chưa có key / Chạm trần lời gọi) · Model · Lỗi gần nhất · Cảnh báo model sắp ngừng |
| | Khối hôm nay | "Lời gọi hôm nay: 1.240/3.000" · "Lỗi: 12 (0,04 US$)" · "Chi phí hôm nay: 2,31 US$ · 60.291 ₫" · "Nhà cung cấp có key: OpenAI · Anthropic · Fake" · "AI toàn hệ thống: Đang bật" |
| | Trạng thái đầu tiên admin gặp | 6 thao tác "Chưa sẵn sàng · Chưa chọn model" |
| `A/80` Model | Cột | Nhà cung cấp · Model id · Giá đầu vào / đầu vào cache / đầu ra (US$ mỗi 1 triệu token) · Ghi chú · Thao tác đang dùng · Vòng đời · Ước tính mỗi lời gọi · Kiểm tra thông tin lần cuối |
| | Nút | [Thêm model] · Sửa giá · [Đọc lại thông tin] · Xóa |
| | Lỗi | "Model đang được thao tác dùng, chưa xóa được." (409 `model-in-use`) · "Nhà cung cấp chưa có key." · "Model đã có." |
| `A/81` Thao tác | Cột | Thao tác · Model · Effort (Mặc định / các mức model có) · Thinking (Mặc định / Tắt) · Số token đầu ra tối đa |
| | Lỗi | "Có người vừa đổi thao tác này. Tải lại để xem bản mới." (409) · "Model này không tắt được thinking." · "Tắt thinking cần effort high trở xuống." |
| | Ghi chú | Chọn "Không có model" là tắt thao tác. Áp từ lần gọi sau. |
| `A/82` Prompt | Khối | Lời dặn (tối đa 8.000 ký tự) · Ví dụ (tối đa 10, mỗi ví dụ một cặp vào/ra) · "Dữ liệu prompt nhận: word, part_of_speech, level, meaning_vi, context_label" · Câu chặn cố định (không sửa được) · Bản số 3 · [Lưu] |
| | Chạy thử | [Chạy thử] · "Còn 17/20 lần chạy thử trong giờ này (dùng chung với Bộ ví dụ)" · kết quả từng mẫu: đầu vào · trạng thái · lý do · đầu ra |
| | Lịch sử | Bản · Thời điểm lưu · [Xem] · "Muốn quay về bản cũ: mở bản đó rồi lưu lại." |
| | Lỗi *(mục 13)* | "Có người vừa lưu prompt này. Tải lại để xem bản mới." (409 `prompt-revision-conflict`) |
| `A/83` Bộ ví dụ | Khối | Ví dụ theo thao tác (tối đa 100) · [Thêm ví dụ] · [Chạy bộ ví dụ] (prompt hiện tại / bản nháp) |
| | Lần chạy | Trạng thái (Đang chờ / Đang chạy / Xong / Lỗi) · Tiến độ "12/20" · Hợp lệ · Thời gian trung bình · Chi phí · Model · Bản prompt |
| `A/85` Chi phí | Lọc | Từ ngày · Đến ngày (tối đa 366 ngày) · Nhóm theo: Ngày / Thao tác / Model / Mục đích / Kết quả |
| | Cột | Nhóm · Lời gọi · Token đầu vào · Token cache · Token đầu ra · Token suy luận · Chi phí US$ · Chi phí ₫ · Lời gọi chưa có giá |
| | Ghi chú | Chi phí là ước tính từ số token và giá đã nhập. |
| `A/86` Các lần gọi | Ô tìm | "Mã thao tác (operation_id)" · [Tìm] |
| | Cột | Lần thử · Mục đích · Thao tác · Model · Kết quả · HTTP · Token · Chi phí · Thời gian · Nội dung (còn tới 25/10 / đã xóa) |
| | Trống | Không có lời gọi nào với mã này. |

---

## 9. Nguồn số liệu

Đối chiếu code `apps/api` trên nhánh này (21/10/2026); bằng chứng chi tiết từng dòng (`path:line`) ở file làm việc `.superpowers/sdd/2026-10-21-dot-giao-dien/api-facts.md`
(không commit). Những điểm ảnh hưởng tới chữ:

| Chữ trên màn | Dựa vào |
|---|---|
| Tên: bắt buộc, 1–50 ký tự; Họ: không bắt buộc | `given_name` bắt buộc, `family_name` không (`auth.schemas.ts`, `person.ts`) |
| Màn chưa đủ 13 tuổi | `400 age-below-minimum` |
| Tài khoản bị khóa | `403 account-locked`, chỉ khi đúng mật khẩu |
| Sửa ngày sinh | `PATCH /v1/me` hiện **không** nhận `birth_date` (đổi API là việc sau, design §10) |
| Câu đã gặp chạm giới hạn | `409 sentence-limit-reached`, không kèm con số; người học không đọc được giới hạn |
| Gói Miễn phí / Dùng thử / Pro | Phiên luyện 3 / 30 / 30 mỗi ngày; lượt câu AI 0 / 300 / 300; lượt tra AI 0 / 100 / 100 mỗi chu kỳ tháng; phiên mở lại 0:00 giờ người học |
| Không đủ lượt câu AI | `403 ai-quota-insufficient` kèm `remaining`, `needed`, `resets_at` |
| AI chưa sẵn sàng khi mở phiên | `503 ai-unavailable` (`model-not-set`, `provider-not-configured`, `daily-call-cap`, `ai-disabled`) |
| Lý do báo lỗi | 7 lý do seed, cả 7 `note_required = false` (biến thể ghi chú bắt buộc vẽ cho trường hợp admin bật); câu thường thấy 4, câu AI thấy 7; ghi chú tối đa 300 |
| Tra bằng AI lỗi | `503 ai-lookup-failed`: `retryable` false chỉ với lỗi vĩnh viễn; `409 ai-in-progress` coi như đang tra |
| Gợi ý | Mức 1–3; gõ từ Bước 4 mức 2 = chữ cái đầu và số chữ |
| Admin: "ai làm" | Chỉ cài đặt (lịch sử), khóa tài khoản và người thao tác trên nghĩa có email; cấp gói, prompt, bộ ví dụ, báo lỗi chỉ trả mã người dùng. **Chốt mốc 0 (Q2):** khung vẫn vẽ email người thao tác; API trả email là việc ngoài đợt (design §10) |
| Admin: 41 cài đặt | `settings.definitions.ts`: reminders 5, learning 5, practice 9, entitlements 15, content 2, ai 5 |
| Admin: 6 thao tác AI | Sau Bước 7 có 6 thao tác, đều seed không có model |

---

## 10. Chữ cũ cần đổi trên page 08, 09 (cho Task 5)

Đọc từ chữ hiển thị thật của mọi text layer đang hiện trên page 08 (`254:8`) và 09 (`284:8`) bằng `use_figma` ngày 21/10/2026 (không đọc tên layer).
Cột "Task" ghi task nào đổi: **5** = chỉ đổi chữ (Task 5); **3**, **4**, **6** = đổi cùng lúc sửa màn ở task đó. Khung `K/00`, `M/00` ("Đọc trước", ghi chú cho người
vẽ) và bảng so sánh màu không đổi ở Task 5; Task 12 cập nhật.

| Chữ cũ | Chữ mới | Ở đâu | Task |
|---|---|---|---|
| Free *(chip thanh trên)* | Miễn phí | Thanh trên web `254:333`, mọi K có thanh trên | 5 |
| Gói Free | Gói Miễn phí *(thẻ trong K/51, K/54, K/55)*; chip điện thoại: Miễn phí | K/51, K/54, K/55; đầu màn điện thoại `284:9`, mọi M có đầu màn | 5 |
| Free *(tên gói, Gói học)* | Miễn phí | K/52, K/52t, M/62 | 5 |
| Miễn phí, không cần thẻ | Không cần thẻ ngân hàng | K/52, K/52t, K/53, M/62 | 5 |
| GÓI HỌC | Gói học | K/52, K/52t, K/53, M/62 | 5 |
| CHƯA MỞ BÁN | Chưa mở bán | K/52, K/52t, M/62 | 5 |
| GÓI CỦA BẠN · ĐỘI WORDMET TẶNG | Gói của bạn · Đội Wordmet tặng | K/53 | 5 |
| Ôn flashcard, lịch ôn, nhắc học qua email | Ôn thẻ, lịch ôn, nhắc học qua email | K/52, K/52t, K/53, M/62 | 5 |
| Tra từ, thêm nhanh, 100 nhóm | Tra từ, thêm nhanh, tối đa 100 nhóm | K/52, K/52t, K/53, M/62 | 5 |
| Bài AI và AI tra nghĩa (cần Pro, sắp có) | Câu AI và tra bằng AI: cần gói Pro | K/52, K/52t, K/53, M/62 | 5 |
| Nhiều lượt luyện hơn, thêm bài AI khi tính năng ra mắt. | Nhiều phiên luyện hơn, có câu AI và tra bằng AI. | K/52, K/52t, M/62 | 5 |
| 300 lượt bài AI mỗi tháng | Tối đa 300 câu AI mới mỗi tháng* + chú thích (mục 4.7) | K/52, K/52t, K/53, M/62 | 3 |
| 100 lượt AI tra nghĩa mỗi tháng | 100 lượt tra AI mỗi tháng | K/52, K/52t, K/53, M/62 | 5 |
| Hết hạn Pro thì tài khoản tự về Free | Hết hạn Pro thì tài khoản tự về gói Miễn phí | K/53 | 5 |
| Hết hạn thì tài khoản về Free; từ và lịch ôn giữ nguyên. | Hết hạn thì tài khoản về gói Miễn phí; từ và lịch ôn giữ nguyên. | K/53 | 5 |
| Bài AI 0/300 · AI tra nghĩa 0/100: sắp có, lượt mới vào 15/11. | Lượt câu AI: còn 287/300 · Lượt tra AI: còn 96/100 / Lượt câu AI mới có vào 15/11. | K/53 | 3 |
| Thứ Bảy, 18 tháng 10 | Chủ Nhật, 18/10 | K/10, K/40, K/41 | 3 |
| Thứ Bảy, 18/10 | Chủ Nhật, 18/10 | M/10, M/11, M/12, M/13 | 3 |
| Mọi level | Mọi trình độ | Thanh trên web, mọi K có dải tra | 5 |
| Level *(nút chọn ở đầu màn điện thoại; cột ở K/30)* | Trình độ | `284:9`, mọi M có đầu màn; K/30, K/43 | 5 |
| Level A2 · Level: A2 | Trình độ A2 · Trình độ: A2 | K/30, K/43, M/40, M/44 | 5 |
| Gõ từ, dán câu bạn gặp. Wordmet tự nhận ra dạng chia. | Gõ từ bạn vừa gặp. Có câu chứa từ đó thì dán vào luôn. Wordmet tự nhận ra dạng chia, như went → go. | K/10, K/40, K/41, M/10–M/12 | 5 |
| Không làm gì. Wordmet không bao giờ tự xoá từ. | Không làm gì. Wordmet không bao giờ tự xóa từ. | K/15 | 5 |
| Từ về ngăn Mới và được tính như từ mới hôm nay. | Từ về ngăn Mới, tính như từ mới hôm nay. | K/15 | 5 |
| App nhận ra đây là quá khứ của | Wordmet nhận ra đây là quá khứ của | K/41 | 5 |
| Nhập email của bạn. Nếu email có tài khoản, mã đặt lại sẽ được gửi tới đó. | Nhập email của bạn. Nếu email này có tài khoản, Wordmet gửi mã đặt lại tới đó. | K/04 | 5 |
| Chạm vào thẻ để lật · Chạm thẻ để lật | Bấm vào thẻ để lật | M/20, M/21, M/24, M/30 | 5 |
| Tìm hoặc tạo nhóm... | Tìm hoặc tạo nhóm… *(một ký tự "…")* | K/42, M/52 | 5 |
| Tạo nhóm "du l" | Tạo nhóm “du l” | M/52b | 5 |
| Chưa có nhóm nào tên "phỏng vấn". | Chưa có nhóm nào tên “phỏng vấn”. | M/52c | 5 |
| Tất cả nhóm (101), A–Z | Tất cả nhóm (100), A–Z | K/42, M/52 | 3 |
| Mới thêm · Lưu vào Mới thêm | Du lịch · Lưu vào Du lịch *(nhóm dùng gần nhất, D4)* | M/50, M/51, M/52 | 3 |
| left, adverb: về phía bên trái. Mỗi nghĩa giữ được 5 câu, nghĩa này đang có 1. | left, adverb: về phía bên trái · đã có 1 câu | K/44 | 3 |
| Tối đa 300 ký tự. Câu này hiện ở mặt trước thẻ, từ được che. | Tối đa 300 ký tự. Câu hiện ở mặt sau thẻ, từ được tô. | K/44 | 3 |
| Câu thứ 2, tối đa 5 câu | Câu thứ 2 của nghĩa này | M/53 | 3 |
| 27 từ trong 3 nhóm. 10 câu, trộn ba dạng bài. | 27 từ trong 3 nhóm. 10 câu, trộn ba kiểu câu. | K/51, K/54 | 5 |
| Lượt luyện hôm nay | Phiên luyện hôm nay | K/51, K/54, K/55 | 5 |
| Sai từ 2 lần trong 5 lượt gần nhất. Xếp theo mức thấp trước. | Sai 2 lần trong 5 câu gần nhất. Xếp theo ngăn thấp trước. | K/51, K/54, K/55 | 5 |
| Ôn tất cả *(nguồn luyện)* | Luyện tất cả | K/51, K/54, K/55 | 5 |
| Dạng bài *(nhãn)* | Kiểu câu | K/54, K/57 | 5 |
| cho bài gõ từ | cho kiểu Gõ từ | K/54 | 5 |
| Nhóm này có 5 từ cần ôn hôm nay. Hết 5 câu đầu, Wordmet hỏi bạn có muốn ôn lại thêm không. | Nhóm này có 5 từ cần ôn hôm nay. Hết 5 câu đầu, Wordmet hỏi bạn có muốn luyện lại thêm không. | K/54 | 5 |
| Hết lượt luyện hôm nay | Hết phiên luyện hôm nay | K/55 | 5 |
| Gói Free có 3 phiên luyện mỗi ngày, mở lại lúc 0:00. Trong lúc chờ, ôn flashcard không giới hạn. | Gói Miễn phí có 3 phiên luyện mỗi ngày, mở lại lúc 0:00. Trong lúc chờ, ôn thẻ không giới hạn. | K/55 | 5 |
| Ôn flashcard *(nút)* | Ôn thẻ | K/55 | 5 |
| Xem gói học *(nút)* | *bỏ nút* (D7) | K/55 | 3 |
| Hết lượt luyện hôm nay. Mở lại lúc 0:00, còn 2 giờ 40 phút. | Hết phiên luyện hôm nay. Mở lại lúc 0:00, còn 2 giờ 40 phút. | K/55 | 5 |
| Nhóm Công nghệ, đã làm 3/10 câu. Phiên này đã tính lượt nên bạn vẫn làm tiếp được. | Nhóm Công nghệ, đã làm 3/10 câu. Phiên này đã tính vào hôm nay nên bạn vẫn làm tiếp được. | K/55 | 5 |
| 5 lượt gần nhất | 5 câu gần nhất | K/56 | 5 |
| Mức thấp trước, trộn ba dạng bài. Đúng 4 lần liền là từ rời danh sách. | Ngăn thấp trước, trộn ba kiểu câu. Đúng 4 lần liền là từ rời danh sách. | K/56 | 5 |
| Vào: sai từ 2 lần trong 5 lượt gần nhất, ở mọi dạng bài. · Không tính: … khi đội Wordmet chưa xem xong. · Rời: khi 5 lượt gần nhất còn dưới 2 lượt sai. | Chữ mục 4.6 | K/56 | 3 |
| 10 lượt | 10 câu | K/57 | 5 |
| Gợi ý 1 | Gợi ý 1/2 | K/63 | 5 |
| Xem gợi ý 2: chữ cái đầu và số chữ | Xem gợi ý 2/2: chữ cái đầu và số chữ | K/63 | 5 |
| Dùng gợi ý vẫn được chấm như thường, nhưng lượt đúng nhờ gợi ý không có nút Đã biết. | Dùng gợi ý vẫn được chấm như thường, nhưng câu đúng nhờ gợi ý không có nút Đã biết. | K/63 | 5 |
| Phiên đặt 10 câu, nhưng nhóm Du lịch chỉ có 5 từ cần ôn hôm nay. Ôn lại thêm 5 câu với chính các từ này? Wordmet xáo thứ tự và đổi dạng bài khi được. | Phiên đặt 10 câu, nhưng nhóm Du lịch chỉ có 5 từ cần ôn hôm nay. Luyện lại thêm 5 câu với chính các từ này? Wordmet xáo thứ tự và đổi kiểu câu khi được. | K/65 | 5 |
| Ôn lại thêm 5 câu *(nút)* | Luyện lại thêm 5 câu | K/65 | 5 |
| Wordmet chỉ hỏi một lần. Ôn lại vẫn nằm trong phiên này, không tốn thêm lượt. | Wordmet chỉ hỏi một lần. Luyện lại vẫn nằm trong phiên này, không tính thêm phiên. | K/65 | 5 |
| Lý do khác | Khác | K/66 | 5 |
| Đội Wordmet xem lại câu này. Trong lúc chờ, lượt này không tính vào Từ hay sai; kết quả đã chấm giữ nguyên. | Đội Wordmet xem lại câu này. Trong lúc chờ, câu này không tính vào Từ hay sai; kết quả đã chấm giữ nguyên. | K/66 | 5 |
| Nhóm Công nghệ, trộn ba dạng bài. Hôm nay còn 1/3 phiên luyện. | Nhóm Công nghệ, trộn ba kiểu câu. Hôm nay còn 1/3 phiên luyện. | K/67 | 5 |
| Bước 8 *(nhãn ở Đăng nhập bằng Google, Xóa tài khoản)* | Sắp có | K/01, K/02, K/50, M/01, M/02, M/60 | 5 |
| Hạn mức nhóm, số từ và lượt AI · Bước 5 *(hàng Cài đặt)* | *bỏ hàng* (thông tin ở Gói học) | K/50 | 4 |
| Bước 5 *(nhãn hàng Gói học)* · Đang phát triển | *bỏ nhãn* | M/60 | 6 |

Không đổi (đã đúng bảng thuật ngữ): "Ôn 10 thẻ", "Học tất cả 18 từ", "40 từ lâu chưa ôn", "Thêm từ vừa gặp", "Cần ôn lại", "Đã biết", "Phiên đang dở",
"Gói Pro chưa mở bán", "Tra trong 7.799 từ", "Báo lỗi", "Tạo nhóm", "Từ của tôi", "Chỉ từ của tôi", tên loại từ tiếng Anh (verb, noun…).

---

## 11. Kiểm

### 11.1 Mỗi dòng design §5 có khung

| Mảng (§5) | Nội dung | Khung |
|---|---|---|
| A | Form đăng ký mới, lỗi dưới 13 tuổi | `K/01`, `M/01`, `K/01b`, `M/01b` (4.1, 4.2) |
| A | Tấm Thêm từ bỏ chọn sẵn "Mới thêm" (D4) | `K/40`, `K/40b`, `M/50`–`M/52`, `M/50b` (4.3) |
| A | Bỏ "tối đa 5 câu" (D5) | `K/44`, `K/44b`, `M/53`, `M/53b`, trang từ (4.4) |
| A | "Tất cả nhóm (101)" → 100 | `K/42`, `M/52` (4.3) |
| A | Mặt trước thẻ (D3) | `K/20`, `K/21`, `M/30`, `M/31` (4.5) |
| A | Từ hay sai ghi đủ trạng thái báo lỗi | `K/56`, `M/L56` (4.6) |
| A | "300 câu AI mới mỗi tháng" kèm điều kiện | `K/52`, `K/52t`, `K/53`, `M/62`, `M/62b` (4.7) |
| A | Màn hết lượt bỏ "Xem gói học" (D7) | `K/55`, `M/L55` (4.8) |
| A (D17) | Ngày "Thứ Bảy, 18 tháng 10" | `K/10`, `K/40`, `K/41`, `M/10`–`M/13` (4.9) |
| B | Menu avatar web | `K/90` (5.1) |
| B | Cài đặt → Tài khoản, lỗi dưới 13 tuổi | `M/90`, `K/91`, `M/91`, `K/92`, `M/92` (5.2–5.4) |
| B | Đăng nhập khi bị khóa | `K/93`, `M/93` (5.5) |
| C | Luyện tập, tùy chỉnh, phiên luyện, kết thúc, Từ hay sai, Lịch sử, hết lượt trên điện thoại | `M/L51`–`M/L57`, `M/L60`–`M/L67` (6) |
| C | Gói học Miễn phí và Pro được cấp trên điện thoại | `M/62`, `M/62b` (4.7, 6) |
| D | Mở phiên có dạng AI, khóa của Miễn phí, không đủ lượt | `K/70`, `K/70t`, `K/70b`, `K/71`, `K/72` (7.2–7.4) |
| D | Đang tạo câu; ba kiểu câu AI; câu bạn đã lưu | `K/73`, `K/78a`–`K/78c`, `K/79a`, `K/79b` (7.5, 7.10, 7.11) |
| D | AI không dùng được + [Thử lại] [Dừng, để sau]; đổi kiểu câu; từ chưa nhận ra | `K/74a`–`K/74d`, `K/75`, `K/76` (7.6–7.8) |
| D | Hỏi khi mở phiên mới lúc còn phiên cũ | `K/77` (7.9) |
| D | Báo lỗi theo lý do + dòng đồng ý từ riêng; tab "Báo lỗi của tôi" | `K/80`–`K/83` (7.12–7.15) |
| D | Thêm từ có "Tra bằng AI", kết quả, form sửa, nhãn "AI gợi ý" | `K/85`, `K/85t`, `K/85b`, `K/85c`, `K/86`–`K/88` (7.16–7.19) |
| D (điện thoại) | Mọi màn trên | `M/70`–`M/88` (7.20) |
| E | Từ, Nghĩa (người thao tác), Chủ đề | `A/87`, `A/88`, `A/88b`, `A/89` (8.1) |
| E | Cài đặt hệ thống 6 tab | `A/70a`–`A/70f` (8.2) |
| E | Người dùng, khóa/mở | `A/71`, `A/72`, `A/72b` (8.3) |
| E | Báo lỗi, xác nhận + trả lượt | `A/73`, `A/73e`, `A/74` (8.4) |
| E | Lý do báo lỗi; trả lượt; dạng chia chưa biết | `A/75`, `A/75b`, `A/76`, `A/77`, `A/77b` (8.5–8.7) |
| E | Cấp gói và lượt | `A/78`, `A/79`, `A/79e` (8.8) |
| E | AI của Bước 6 | `A/80`–`A/86` (8.9) |
| F | Bản tối mẫu | Không có chữ mới (dùng chữ của `K/10`, `K/78a`, `K/52`, `K/40`) |
| G | Prototype | Không có chữ mới |

### 11.2 Mỗi dòng design §6.2 có khung

| Khi (§6.2) | Khung |
|---|---|
| Miễn phí mở hộp chọn kiểu câu | `K/70b` |
| Dùng thử / Pro chọn điền từ: nguồn câu | `K/70`, `K/70t` |
| Dòng "Phiên này dùng N lượt câu AI" | `K/70`, `K/70t` |
| 403 `ai-quota-insufficient` | `K/71` |
| 503 `ai-unavailable` (chưa chọn model) | `K/72` |
| `preparing` | `K/73` |
| Phiên chỉ AI, `ai_unavailable`, bốn lý do | `K/74a`–`K/74d` |
| Phiên trộn, AI lỗi một câu | `K/75` |
| Từ riêng AI không nhận ra | `K/76`, `K/74a` (biến thể) |
| Đang hỏi câu AI: gợi ý 3 nấc / 1 nấc, bỏ qua | `K/78a`–`K/78c` |
| Đã nộp: đáp án, nghĩa, bản dịch | `K/79a`, `K/79b` |
| Báo lỗi theo lý do; ghi chú bắt buộc; tick từ riêng; không báo lỗi với câu đã lưu | `K/80`, `K/81`, `K/79b` |
| Tab "Báo lỗi của tôi" | `K/82`, `K/83` |
| Mở phiên mới lúc còn phiên đang dở | `K/77` |

Design §6.3 (tra AI, từ riêng): `K/85`, `K/85t`, `K/85b`, `K/86`, `K/87`, `K/88`.

### 11.3 Kiểm chữ (grep trên file này, 21/10/2026)

*Review cuối (22/10/2026) tìm ra 5 chữ "Lượt mới có vào 15/11." và "Lượt này không trả lại được" còn sót trên màn người học và trong file này; đã sửa thành "Lượt câu AI …" / "Lượt tra AI …", tìm lại trên page 08, 09: 0 chỗ; trong file này: 0 chỗ ngoài chính ghi chú này.*

- "lượt" trên màn người học: mọi chỗ là "lượt câu AI" hoặc "lượt tra AI". Các chỗ "lượt" còn lại nằm ở cột "Chữ cũ", cột "Tránh" của bảng thuật ngữ, ghi chú
  cho người vẽ, hoặc màn admin. Màn admin giữ tên đã chốt "Gói và lượt" (D10), "Cấp gói và lượt" (design §5) và nhãn "Lượt AI hôm nay" (trần chung của hai kho).
- "Vui lòng": không có trong nút, nhãn hay câu nào (chỉ xuất hiện trong luật ở mục 1).
- "..." ba dấu chấm: chỉ ở cột "Chữ cũ" của mục 10.
- "xoá", "hoà", "thuỷ", "khoẻ": chỉ ở cột "Chữ cũ".

---

## 12. Sửa sau mốc A+B, vòng 1 (22/10/2026)

Chủ dự án góp 9 điểm khi xem ảnh mốc A+B. Chữ của các khung đổi hoặc thêm:

| Điểm | Khung | Chữ |
|---|---|---|
| 3, 6 Cài đặt chia mục; mức sử dụng nằm ở Cài đặt, bỏ khỏi Gói học | `K/50`, `M/90` (và nền `M/63`) | Mục "Thông tin cá nhân": Họ và tên · "Nguyễn Lan" · [Sửa]; Ngày sinh · "14/5/2008" · [Sửa]; Email · "lan@example.com · Đã xác minh". Mục "Gói và mức sử dụng": Gói hiện tại · "Miễn phí" · [Xem gói học]; "Phiên luyện hôm nay" · "1/3 đã dùng" · "Còn 2 phiên, mở lại lúc 0:00."; "Lượt câu AI" · nhãn "Cần gói Pro"; "Lượt tra AI" · nhãn "Cần gói Pro" (gói Pro, Dùng thử: thanh "còn 287/300", "Lượt câu AI mới có vào 15/11."). Mục "Học tập": Ngôn ngữ, Giao diện. Mục "Thông báo": Nhắc học qua email. Mục "Phím tắt" (chỉ web). Mục "Tài khoản": Đăng xuất · "Thoát khỏi thiết bị này"; Xóa tài khoản · "Sắp có". [Sửa] mở `K/91`, `M/91`. Gói học (`K/52`, `K/52t`, `K/53`, `M/62`) bỏ khối "Phiên luyện hôm nay". |
| 4 Từ hay sai theo nhóm | `K/56` | Hàng "Nhóm": chip "Tất cả nhóm · 6" · "Công nghệ · 3" (đang chọn) · "IELTS · 2" · "Du lịch · 1"; tiêu đề bảng "3 từ trong nhóm Công nghệ"; nút "Luyện 3 từ của nhóm Công nghệ". |
| 5 Bỏ dòng "Tra từ / …", "Nhóm / …"; điện thoại: nút quay lại thay logo ở trang con | Mọi trang con của page 08, 09 | Đầu màn trang con: "‹" + nơi quay về: "Nhóm" (trang nhóm), "Tra từ" (trang từ), "Cài đặt" (Tài khoản, Giao diện), "Quay lại" (Cài đặt mở từ avatar). Component mới: "Đầu màn · trang con (điện thoại, có dải tra)", "… (điện thoại, không dải tra)". |
| 7 Chủ đề gợi ý: 3–5 từ + xem thêm để chọn từ | Thẻ chủ đề ở `K/16`, `K/94`, `M/15`, `M/94`; màn mới `K/18`, `M/16` | Thẻ: 4 dòng "budget · ngân sách"… · nút [Xem thêm và chọn từ]. Màn chọn: "Kinh doanh · B1" · "52 từ gợi ý. Chọn từ bạn muốn học, hoặc thêm cả chủ đề." · ô "Chọn tất cả (50 từ chưa học)" · "Đã chọn 3 từ" · mỗi dòng: ô tick, từ, loại từ, nghĩa, trình độ; từ đang học: "Đang học · Công việc" (không tick được) · "Còn 44 từ. Cuộn để xem thêm." · thanh đáy: "Thêm vào" · "Nhóm mới “Kinh doanh · B1” ▾" · [Thêm cả 50 từ] [Thêm 3 từ đã chọn]. |
| 8 Web có đủ phần điện thoại có | `K/17`, `K/17b`, `K/16b`, `K/10b`, `K/42b`, `K/42c`; điện thoại thêm `M/13b` | Tạo nhóm: "Tạo nhóm" · "Tên nhóm" · "Du lịch Nhật" · "12/60" · [Hủy] [Tạo nhóm]. Đổi tên nhóm: "Đổi tên nhóm" · [Hủy] [Lưu tên mới]. 100 nhóm: "100 nhóm · 3.120 từ" · ô "Tìm trong 100 nhóm". Menu ⋯ thẻ nhóm ở Hôm nay: Đổi tên nhóm · Học tất cả 18 từ · Xóa nhóm. Lưu vào nhóm khi đang gõ: "du l" · [Tạo nhóm “du l”] · "Kết quả (5)"; không có nhóm khớp: "Chưa có nhóm nào tên “phỏng vấn”." · [Tạo nhóm và lưu]. |
| 2 Form điện thoại gọn hơn | `M/01`–`M/05`, `M/93`, `M/91`, `M/92` | Không đổi chữ; ô nhập cao 44px, khoảng cách giữa ô nhỏ lại. |
| 9 Khoảng trống sau khi bỏ dải tra | `M/90`, `M/91`, `M/92`, `M/63` | Không đổi chữ. |
| 1 Chưa đủ 13 tuổi: chặn ngay ở form, không có màn riêng (chủ dự án, vòng 2) | `K/01b`, `M/01b` (thay màn cũ) | Ô Ngày sinh viền đỏ, giá trị "14/5/2015"; dòng dưới ô (thay dòng phụ): "Bạn cần đủ 13 tuổi để dùng Wordmet."; nút [Tạo tài khoản] mờ. Mục 4.2 không còn dùng. |
| Vòng 2: chọn ngôn ngữ bằng danh sách thả xuống có cờ | `K/06`, `K/06b`, `M/06`, `M/06b` | Nhãn "Ngôn ngữ" (web) / "Ngôn ngữ của nghĩa và giao diện" (điện thoại); ô thả xuống: cờ Việt Nam + "Tiếng Việt" + mũi tên; danh sách mở: cờ Việt Nam "Tiếng Việt" (đang chọn, dấu tick), cờ Anh "English"; nút [Tiếp tục]. Component cờ `flag/vi`, `flag/en` ở 01 Foundations (màu cờ cố định, không theo biến). |
| Vòng 2: gờ dưới của nút bị cắt | Mọi nút có gờ đặc trên page 04, 08, 09 | Không đổi chữ. Khung bọc nút không còn cắt nội dung (83 khung bọc), nên gờ 4px dưới nút hiện đủ. Script kiểm thêm chỉ số `ledgeClipped`. |

## 13. Thêm khi đóng đợt (22/10/2026, sau bước đối chiếu đủ màn)

Bước đối chiếu (`kiem-du-man.md`) thấy bốn chỗ chưa có màn; vẽ bù và ghi chữ ở các mục trên:

| Chỗ thiếu | Khung | Chữ |
|---|---|---|
| Review Focus 4: lịch sử luyện tập trống | `K/57b`, `M/L57b` | mục 7.15b |
| Gỡ dạng chia vừa nhận (design Bước 7 §10) | `A/77` | mục 8.7, [Hoàn tác] |
| Sửa ngày lần cấp (D38 Bước 5), xác nhận tắt tự gia hạn (D32 Bước 5) | `A/78d`, `A/79b` | mục 8.8 |
| Lỗi lưu prompt khi người khác vừa lưu (409) | `A/82` | mục 8.9 |
