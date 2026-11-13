# Checklist tự kiểm đợt polish giao diện người học (12/11/2026)

Danh sách giao diện cần chủ dự án tự kiểm sau đợt polish (Part 10 của plan, mockup bản chốt
[`m9-ban-chot.html`](../mockups/2026-11-05-redesign-concepts/m9-ban-chot.html), artifact `Ccnn3iPkr3srNv7diobFkL`). Nhánh `feat/giao-dien-moi-polish`.
Checklist M1–M9 cũ vẫn dùng cho phần đợt này không đổi: [`giao-dien-moi-checklist.md`](giao-dien-moi-checklist.md). Mục "Đã biết, để đợt
polish" ở cuối file đó: các điểm theo mockup bản chốt nay đã làm, kiểm lại bằng file này.

Mỗi dòng: **Màn**, **Mở bằng**, **Kiểm gì**, **Sáng/Tối**, ô tick. URL thêm tiền tố `http://localhost:3001/vi/app` trừ khi ghi khác.

## 0. Bắt đầu

- **Stack của nhánh này:** từ worktree của nhánh `feat/giao-dien-moi-polish`, chạy `pnpm bootstrap` rồi `pnpm bootstrap seed` (thay container của
  bản checkout chính; chạy lại `pnpm bootstrap` ở bản checkout chính để quay về). Tài khoản như checklist cũ, mục 0.
- **Khổ:** 390, 768, 1024, 1440 (DevTools, Ctrl+Shift+M). **Sáng / tối:** Cài đặt → Giao diện.
- **Đối chiếu:** mockup bản chốt, mỗi màn một mục (nút Sáng/Tối ở đầu trang đổi mọi khung).
- **Tiếng Anh:** thêm một lượt `/en/app` cho Học, Phiên luyện, Ôn (chữ trong phiên phải giống hệt ở `/vi`).

## 1. Toàn app (kiểm ở mọi màn bạn đi qua)

| Điểm | Kiểm gì | Sáng/Tối | ☐ |
|---|---|---|---|
| Font | Nhãn nhỏ, số đếm, phím tắt, IPA là Noto Sans; không còn chữ kiểu máy đánh chữ (JetBrains Mono). Tiêu đề, từ lớn, số lớn vẫn Bricolage | Sáng | ☐ |
| Viết hoa nhãn | Nhãn nhỏ và chip bắt đầu bằng chữ hoa ("Hôm nay", "Câu AI", "Fill in the blank"); không còn nhãn viết thường toàn bộ | Sáng | ☐ |
| Góc bo | Phím tắt, nhãn 4 px; nút, ô nhập, chip 8; dòng danh sách, menu 10; card 14; hộp thoại, thẻ Học 16. Phần tử bên trong luôn bo ít hơn khung chứa | Sáng | ☐ |
| Không còn "ngăn" | Mọi chỗ gọi mức ôn là "Mới, Bậc 1 … Bậc 5", kèm "ôn lại sau N ngày" ở chỗ có chú thích | Cả hai | ☐ |
| Màu bậc | Mới xám; Bậc 1→5 xanh lá nhạt → đậm; Ưu tiên đỏ; Đến hạn vàng cam (chữ "Đến hạn" đủ đậm để đọc). Màu luôn đi kèm chữ hoặc số | Cả hai | ☐ |
| Tiêu đề trang, tiêu đề mục, card | Mỗi vai trò một kiểu: tiêu đề trang 44 px (30 trên điện thoại); tiêu đề mục 22 px (20); card bo 14, đệm 24 (20), không viền | Sáng | ☐ |
| Từ đích trong câu ví dụ | Mọi câu ví dụ (trang từ, Tra từ, thẻ Học, hộp Thêm câu…): in đậm, gạch chân màu nhấn; không còn nền vàng hay chữ xanh | Cả hai | ☐ |
| Mũi tên | Link chữ có mũi tên "→" ngắn, cùng nét (icon), không còn "⟶" dài mảnh | Sáng | ☐ |
| Thanh trên điện thoại | Cao 56 px; thanh tab dưới giữ như trước; icon tab Luyện tập vẫn là ngôi nhà (đã chốt giữ) | Cả hai | ☐ |
| Khung xương lúc tải | Tải lại cứng (Ctrl+Shift+R) ở Hôm nay, Luyện tập, Nhóm, một trang khác: nền mesh, thanh trên 64 px (56 điện thoại) có chỗ logo và tab; Hôm nay và Luyện tập hai cột từ 1280 px; Nhóm một khối băng chuyền; nội dung không nhảy khi trang thật hiện | Cả hai | ☐ |
| Toast chuỗi ngày | Học hoặc luyện xong lần đầu trong ngày | Toast trắng có viền, icon lửa trong ô nhỏ; nằm dưới, giữa màn hình, cả trong phiên (đổi 13/11, mục 11); không đè nút | Cả hai | ☐ |
| Màn mất mạng, không tìm thấy | DevTools → Offline rồi chuyển trang; mở một nhóm không tồn tại | Màn mới theo kiểu app (không còn kiểu cũ) | Sáng | ☐ |

## 2. Hôm nay

| Màn | Mở bằng | Kiểm gì | Sáng/Tối | ☐ |
|---|---|---|---|---|
| Hôm nay | `/` | Thẻ nhóm ở "Nhóm của bạn" chỉ ghi số từ ("48 từ"), không còn "đã thuộc"; khối "Lần luyện gần nhất" không còn dòng "Sai: …"; khối "N từ theo bậc" có màu bậc và chú thích khi rê chuột | Cả hai | ☐ |
| "Tạo nhóm nhanh" | Cuối trang | Giữ thẻ có ô icon màu (đã chốt giữ) | Sáng | ☐ |

## 3. Nhóm và Một nhóm

| Màn | Mở bằng | Kiểm gì | Sáng/Tối | ☐ |
|---|---|---|---|---|
| Nhóm: băng chuyền Vòng cung | `/groups`, ← → hoặc bấm thẻ bên | Thẻ hai bên xếp theo vòng cung: thấp dần, nghiêng 8° và nhỏ 10% mỗi bậc; chuyển có độ nảy; quầng màu nhóm sau băng chuyền đổi màu theo nhóm; thẻ chỉ ghi "N từ"; bấm → năm lần nhanh không làm thẻ kẹt giữa chừng | Cả hai | ☐ |
| Nhóm: dưới băng chuyền | Cùng trang | "Nhịp ôn: Mới → Bậc 5" và thanh bậc tô màu; các nút hiện lần lượt khi đổi nhóm | Cả hai | ☐ |
| Nhóm: điện thoại | 390 px | Băng chuyền thu nhỏ (thẻ 210 px), không có nút mũi tên, vuốt đổi nhóm | Cả hai | ☐ |
| Tắt chuyển động | Bật "Reduce motion" trong hệ điều hành | Băng chuyền đổi nhóm không có animation | Sáng | ☐ |
| Một nhóm: đầu trang | Mở một nhóm | Tiêu đề không có ô màu phía trước; dòng "48 từ · tạo ngày …" | Cả hai | ☐ |
| Một nhóm: thanh bậc | Cùng trang | Mỗi đoạn một màu bậc, rộng theo số từ; chú thích dưới đủ chữ (không bị cắt "1 ng…"); rê chuột lên đoạn hiện tên bậc, số từ, "ôn lại sau N ngày" | Cả hai | ☐ |
| Một nhóm: chip lọc | Tất cả, Ưu tiên, Đến hạn, Mới, Bậc 1–5 | Một dòng, cao 36 px; cả chip mang màu của mức; số trong ô riêng; chip đang chọn đậm màu và có viền; bấm đổi danh sách | Cả hai | ☐ |
| Một nhóm: bảng từ | Máy tính | Bảng có tên cột Từ vựng, Loại từ, Nghĩa, Bậc, Trạng thái; cột Bậc có vạch màu và tên bậc; trạng thái tô màu (ưu tiên đỏ, đến hạn vàng cam, mới xám); mỗi hàng một đường kẻ | Cả hai | ☐ |
| Một nhóm: điện thoại | 390 px | Bảng thu thành dòng gọn, vẫn có hàng tên cột ở đầu | Cả hai | ☐ |

## 4. Trang một từ và Tra từ

| Màn | Mở bằng | Kiểm gì | Sáng/Tối | ☐ |
|---|---|---|---|---|
| Trang một từ | `/word?…` | Cụm phát âm UK/US và dạng chia nằm giữa hai đường kẻ rõ; UK và US đứng gần nhau; tab gạch dưới | Cả hai | ☐ |
| Từ riêng chưa có loại từ | Trang của một từ bạn tự thêm | Không còn chữ "unspecified" ở dòng phát âm, tiêu đề khối nghĩa, hộp Sửa từ và các bảng chọn | Sáng | ☐ |
| Khối "Bạn đang học" | Từ đang học | Thanh sáu mức đủ chữ "Mới, Bậc 1 … Bậc 5" (không bị cắt ở 1440); dòng "Bậc n · ôn lại sau N ngày" | Cả hai | ☐ |
| Tra từ | `/lookup` | Câu lọc ("314 từ · trình độ tất cả, chủ đề tất cả, loại từ tất cả"): phần bấm được có nền vàng, bấm mở menu; câu ví dụ trên giấy in đậm gạch chân | Cả hai | ☐ |

## 5. Luyện tập và Từ hay sai

| Màn | Mở bằng | Kiểm gì | Sáng/Tối | ☐ |
|---|---|---|---|---|
| Luyện tập | `/practice` | Không còn box "Gần đây"; các dòng nguồn giữ ô icon và nút Tùy chỉnh (đã chốt giữ); tiêu đề mục và card một kiểu | Cả hai | ☐ |
| Tùy chỉnh phiên | Nút Tùy chỉnh | Hộp mở nhanh (tải trước khi rê chuột vào nút); không còn khung trống lâu | Sáng | ☐ |
| Từ hay sai, điện thoại | `/practice/weak` ở 390 px | Thẻ "Luyện từ hay sai" nằm ngay dưới tiêu đề, trước danh sách | Cả hai | ☐ |
| Từ hay sai, máy tính | 1440 px, đổi khổ qua lại 1280 | Cột phải không nhấp nháy hay tải lại khi đổi khổ | Sáng | ☐ |

## 6. Phiên luyện và Ôn (chữ giao diện tiếng Anh)

| Màn | Mở bằng | Kiểm gì | Sáng/Tối | ☐ |
|---|---|---|---|---|
| Chữ trong phiên | Mở phiên ở `/vi/app` | Mọi nút, nhãn, thông báo, tổng kết bằng tiếng Anh; số nhiều đúng ("1 card left", "2 cards left"); nghĩa tiếng Việt, câu dịch, câu hỏi theo nghĩa ở Ôn, tên nhóm vẫn tiếng Việt; "Back to home" về `/vi/app` | Cả hai | ☐ |
| Card câu hỏi | Câu bất kỳ | Chip loại câu ("Fill in the blank", "AI sentence"); không còn dòng hướng dẫn ("gõ từ còn thiếu…") | Cả hai | ☐ |
| Câu điền từ | Câu điền từ | Gõ thẳng vào chỗ trống trong câu; Enter thì kết quả thay ngay tại chỗ (sai: chữ gạch ngang khung đứt; đúng: khung xanh) | Cả hai | ☐ |
| Gợi ý | Mở gợi ý (H) | Ô gợi ý theo lưới ba cột (số, tên gợi ý, nội dung); "Hint 1 of 2"; "Show hint 2" nằm ở cột nội dung; chữ cái đầu dạng `e___` (giữ như cũ, QP3) | Cả hai | ☐ |
| "AI translation" | Trả lời xong một câu AI, ở `/vi` | Khối riêng ngay dưới câu: nền nhấn nhạt, viền, icon dịch, chip "AI translation" bên phải; ở `/en` không có khối này | Cả hai | ☐ |
| Panel "Not quite" | Trả lời sai | Đáp án thành dòng lớn ngay dưới tiêu đề, nền xanh nhạt; khoảng cách đều 16 px; sáng: đỏ đậm; tối: cam san hô | Cả hai | ☐ |
| Bảng phím | Máy tính | Dòng phím tắt ở giữa, ngay dưới panel | Sáng | ☐ |
| Ôn: so chữ | Gõ sai ở Ôn | "You typed / answer" thay ô gõ, nằm trong card | Cả hai | ☐ |
| Ôn: tổng kết điện thoại | Hết phiên Ôn ở 390 px | Tiêu đề đúng cỡ; hai ô "Sai, giữ bậc" / "Cần ôn lại" đúng màu (không đảo) | Cả hai | ☐ |
| Nút X | Mọi phiên | Nút đóng 32 px | Sáng | ☐ |

## 7. Học (Chồng thẻ tan mờ)

| Màn | Mở bằng | Kiểm gì | Sáng/Tối | ☐ |
|---|---|---|---|---|
| Học, máy tính | Nút Học ở một nhóm | Thẻ phía sau mờ theo độ sâu; chồng thẻ cách thanh đầu ~20 px; nút X góc phải, toast chuỗi ngày dưới nút X | Cả hai | ☐ |
| Ba nút | Cùng màn | Cao 40 px, chữ 14 px: "← Still learning [1]" chữ đỏ nền trắng, "↻ Flip card [Space]" nền nhấn, "✓ Know [2] →" chữ xanh nền trắng; mờ khi chưa lật; dưới có hàng chú thích phím (Space, 1/←, 2/→, Esc) | Cả hai | ☐ |
| Kéo thẻ | Kéo sang trái/phải | Thẻ nghiêng, hiện dấu; quá ~110 px hoặc vuốt nhanh thì chọn; thẻ phóng to rồi tan mờ; thẻ kế hiện từ mờ; chip tên từ rơi vào đống; chưa lật mà chọn thì thẻ lắc | Cả hai | ☐ |
| Bấm nhanh | Lật rồi bấm 2 hai lần thật nhanh | Chỉ ghi một câu trả lời | Sáng | ☐ |
| Đống | Hai bên | Số và nhãn ("Still learning", "Know") canh giữa, không có mũi tên | Cả hai | ☐ |
| Học, điện thoại | 390 px | Đống nằm dưới thẻ; hai nút bên là ô vuông chỉ có icon; "Flip card" rộng vừa; không hiện phím tắt; không có chip rơi vào đống; gợi ý "Tap the card to flip" | Cả hai | ☐ |

## 8. Hộp thoại và Thêm từ

| Màn | Mở bằng | Kiểm gì | Sáng/Tối | ☐ |
|---|---|---|---|---|
| Mọi hộp thoại | Thêm từ, Tạo nhóm, Đổi tên, Xóa, Báo lỗi, Chi tiết giao dịch, Hủy gói… | Nút × trong ô vuông có viền ở góc; "Hủy" là chữ (không phải nút viền); lựa chọn nền trắng; không hộp nào có hai nút cùng tên "Đóng" | Cả hai | ☐ |
| Chọn nhóm (cách B) | `N` → gõ một từ → ô "Lưu vào nhóm" | Không radio; mỗi dòng có chồng thẻ nhỏ màu nhóm, nhấc lên khi chọn, ✓ cuối dòng; dòng chọn nhuộm màu nhóm | Cả hai | ☐ |
| Lưu nhiều nhóm | Chọn 2–3 nhóm | Cuối hộp "Đã chọn n nhóm" và nút "Lưu vào n nhóm"; ô "Lưu vào nhóm" hiện các nhóm thành chip màu; lưu xong từ có trong cả các nhóm; mở lại hộp thì các nhóm vừa chọn đã chọn sẵn | Cả hai | ☐ |
| Giới hạn | Chọn nhóm thứ 11 | Không chọn quá 10 nhóm | Sáng | ☐ |
| Nhóm đầy | Lưu vào một nhóm đã đầy (nếu có dữ liệu) | Báo tên nhóm đầy, không lưu nhóm nào | Sáng | ☐ |
| Hộp 4 (Tra bằng AI) | Thêm từ chưa có trong từ điển, máy tính | Hai cột từ đầu hộp: trái ô nhập và kết quả, phải thẻ xem trước ngang ô "Từ" | Cả hai | ☐ |

## 9. Đăng nhập và Đăng ký

| Màn | Mở bằng | Kiểm gì | Sáng/Tối | ☐ |
|---|---|---|---|---|
| Panel giới thiệu | `/vi/app/register`, `/vi/app/login` ở 1440 | Nền đậm hơn; đường nhớ qua Mới → Bậc 1…5 (1, 3, 7, 14, 30 ngày) có chip từ chạy dọc và đổi màu theo bậc; thẻ từ lần lượt mitigate, allocate, viable, deteriorate, coherent; thẻ luyện gõ từ, nhấn Enter, chuyển xanh "Đúng · lên Bậc n"; số từ đến hạn giảm dần | Cả hai | ☐ |
| Chip nền | Cùng màn | Chip "deadline", "negotiate" mờ, nằm dưới thẻ, không bị thẻ che | Sáng | ☐ |
| Ô nhập | Cùng màn | Viền ô rõ trên nền mesh; quầng sau card thấy được | Cả hai | ☐ |
| Tắt chuyển động | Reduce motion | Panel đứng yên ở khung cuối | Sáng | ☐ |

## 10. Chưa kiểm hoặc đã biết

- **Chưa chạy trên stack thật:** đợt polish chỉ kiểm bằng unit test và e2e (API giả); chưa ai mở các màn trên bằng trình duyệt với dữ liệu thật.
  Checklist này là lần đầu.
- **Gợi ý chữ cái đầu** giữ ba gạch (QP3); chữ đầu viết hoa từ 13/11 (`E___`, mục 11).
- **Điện thoại thật** (đo khung hình, QM9-7) vẫn là việc trước PR cuối vào `dev`, xem checklist cũ.

## 11. Sửa sau test tay (Part 11 và các vòng 13/11/2026)

Gồm các chỗ bạn chốt trên trang review (f01–f19) và các chỗ bạn gửi trong chat ngày 13/11. Đó là các commit sau `8c1b6a06` trên nhánh này, đến `202ff33f`.
App đã chạy `pnpm bootstrap`. Đăng nhập bằng `lan.local@example.com`.

### Nhóm, Hôm nay, Thêm từ, Lịch

| Màn | Mở bằng | Kiểm gì | Sáng/Tối | ☐ |
|---|---|---|---|---|
| Vầng sáng Nhóm (f01, 13/11) | `/groups`, đổi nhóm bằng ← → | Vầng sáng ở giữa phía trên trang, màu theo nhóm giữa, đổi màu trong 0,7 s; không thấy cạnh hay khung chữ nhật | Cả hai | ☐ |
| Khối dưới băng chuyền (f02) | `/groups` | Hàng 1: Học và Ôn cùng rộng. Hàng 2 ở giữa: "Xem nhóm →" và "Thêm từ". Chú thích bậc một dòng từ 768 px | Sáng | ☐ |
| Màn thấp (f13) | `/groups` ở 1280×800, 1024×768; điện thoại ngang 844×390 | Học và Ôn thấy ngay, không phải cuộn. Điện thoại ngang thành hai cột. Nút lịch không đè thẻ | Sáng | ☐ |
| Thẻ nhóm ở Hôm nay (f18) | `/`, rê chuột hoặc Tab vào thẻ nhóm | Thẻ nâng lên 6 px, bóng đậm theo màu nhóm | Cả hai | ☐ |
| Chân hộp thoại (f03, D1) | Thêm từ → Nhập nghĩa → Chọn nhóm | Chân hộp có đường kẻ. "Quay lại" dạng chữ, cách nút chính 12 px. Bước chọn nhóm ghi "Xong", form ghi "Lưu vào n nhóm" | Sáng | ☐ |
| Nhóm hiện hai lần (f03) | Hộp chọn nhóm khi có "Dùng gần đây" | Mỗi nhóm hiện một lần; danh sách dưới có tiêu đề "Nhóm khác (n)" | Sáng | ☐ |
| Dòng từ trong hộp chọn nhóm (13/11) | Tra từ → thêm vào nhóm khác | Dòng "afford, verb: …" là chữ thường, không còn nền vàng | Cả hai | ☐ |
| Hộp Ngày (f19) | Lịch → bấm một ngày | Không còn nút lọc "Luyện" và khối phiên luyện; dòng tóm tắt vẫn ghi số câu luyện | Cả hai | ☐ |
| Nút lọc Tất cả / Học / Ôn (13/11) | Hộp Ngày | Nền xanh rất nhạt. Nút đang chọn nền trắng, viền xanh, không còn nền xanh đậm | Sáng | ☐ |
| "1 card waiting" (D8) | `/en/app/groups`, nhóm có 1 thẻ chờ | Ghi "1 card waiting" | Sáng | ☐ |
| Tra từ khi đang tải (defect) | `/lookup`, mạng chậm (DevTools → Slow 3G) | "Nhóm khác" bị khóa cho tới khi danh sách tải xong | Sáng | ☐ |

### Tùy chỉnh phiên

| Màn | Mở bằng | Kiểm gì | Sáng/Tối | ☐ |
|---|---|---|---|---|
| Ô số (f16) | Luyện tập → Tùy chỉnh | Ô 36 px có − và +. Gõ 7 rồi Enter thì thành 7. Gõ 99 rồi bấm ra ngoài thì về mức tối đa. Xóa trống thì giữ số cũ | Sáng | ☐ |
| Nút phạm vi (f17, 13/11) | Tùy chỉnh: Theo nhóm | "Mọi từ / Cần ôn / Ưu tiên": mỗi lựa chọn có ô số vuông riêng, nằm gọn trong viên. Viên đang chọn là ô vuông bo góc, cao 28 px. Cả thanh không lòi ra mép | Cả hai | ☐ |
| Mọi nút chia đoạn (13/11) | Tùy chỉnh; Cài đặt | "Theo nghĩa / Theo câu / Trộn", "Chọn nghĩa / Chọn từ / Trộn" và các nút ở Cài đặt có góc vuông bo nhẹ, không còn hình viên thuốc | Sáng | ☐ |
| Danh sách Thứ tự (13/11) | Tùy chỉnh → Thứ tự | Mọi lựa chọn hiện đủ chữ, không có "…" | Sáng | ☐ |
| Tooltip "?" (13/11) | Rê chuột vào "?" cạnh "Điền từ vào câu bạn đã lưu" | Chữ đọc rõ ở cả hai theme (theme tối: nền sáng, chữ tối) | Tối | ☐ |

### Phiên luyện, Học, Ôn

| Màn | Mở bằng | Kiểm gì | Sáng/Tối | ☐ |
|---|---|---|---|---|
| Không còn phím trên nút (f14) | Học, Ôn, phiên luyện ở 1280 | Nút không có ô phím. Hàng chú thích phím vẫn còn, phím tắt vẫn chạy | Sáng | ☐ |
| Gợi ý chữ cái đầu (f04, 13/11) | Phiên luyện, câu điền từ → Gợi ý | Chữ đầu viết hoa, gạch nối liền: "L___"; cỡ chữ 19 px | Tối | ☐ |
| Panel sai dạng vé (f05) | Trả lời sai một câu | Trượt ra từ dưới thẻ. Đầu vé ghi "Not quite", có đường đục lỗ. Dòng lớn nhất là nghĩa; đáp án nhỏ màu xanh, kèm nút nghe. Nền đỏ nhạt | Cả hai | ☐ |
| Notch của vé (13/11) | Cùng màn, theme tối | Hai chỗ khuyết ở hai đầu đường đục lỗ là lỗ thật (nhìn thấy nền trang), không phải chấm tối | Tối | ☐ |
| Panel đúng và panel thử lại (D2, D3) | Trả lời đúng; gõ sai câu còn được thử lại; mở gợi ý trước khi trả lời | Cùng dáng vé; panel đúng màu xanh, có "Bậc 1 → Bậc 2". Đã mở gợi ý thì vé nằm dưới hộp gợi ý | Cả hai | ☐ |
| Nút trên điện thoại (13/11) | Panel thử lại ở 390 và 320 | Các nút xếp dọc, rộng hết panel, không dồn sang phải | Sáng | ☐ |
| Từ chọn sai trong câu (f05) | Trắc nghiệm theo câu, chọn sai | Từ bạn chọn bị gạch trong câu, đứng trước từ đúng | Sáng | ☐ |
| Ô gõ trong câu (f15) | Câu điền từ, gõ 3 rồi 12 chữ | Ô giãn theo chữ, không thừa chỗ | Sáng | ☐ |
| Vị trí câu hỏi (13/11) | Phiên luyện ở 1280 | Khối câu hỏi thấp hơn trước một chút, vẫn ở trên giữa màn hình | Sáng | ☐ |
| Thẻ Học (13/11) | Nhóm → Học ở 1280×900 | Thẻ 360 × 470 px như artifact "Chồng thẻ tan mờ". Màn thấp hơn 736 px thì thẻ thấp lại | Cả hai | ☐ |
| Toast chuỗi ngày (13/11) | Học hoặc luyện xong lần đầu trong ngày | Toast nằm dưới, giữa màn hình | Sáng | ☐ |

### Trang chủ và Đăng ký

| Màn | Mở bằng | Kiểm gì | Sáng/Tối | ☐ |
|---|---|---|---|---|
| Hero (f08, f09, D5) | `http://localhost:3001/vi` | Không còn viên nhãn. Thẻ luyện gõ từ vào ô vừa chữ, rồi chuyển xanh "Đúng · lên Bậc n". Thẻ từ đổi lần lượt 5 từ | Cả hai | ☐ |
| Màu loang phần Giá (f06) | `/vi#gia` | Nhiều quầng mờ trôi chậm, phủ đều cả khối, không thành một cục | Tối | ☐ |
| Thẻ Pro (13/11) | `/vi#gia` | Đường sáng chạy trên viền thẻ, không có vệt mờ lồi ra ngoài. Không còn dòng "Không hoàn tiền sau khi đã thanh toán." | Tối | ☐ |
| "Luyện trong câu" (f07) | `/vi#cach-hoc` | Phần luyện nằm ngay dưới mô tả, không bị đẩy xuống đáy card | Sáng | ☐ |
| Link thanh trên (f10) | Trang chủ | "Nhóm từ", "Cách học", "Giá" chữ đậm; rê chuột thì đổi sang màu nhấn | Sáng | ☐ |
| Không chỉ IELTS (f11, D6) | Trang chủ, khối Nhóm từ | Không còn viên "IELTS Writing · Đề 12…". Có chữ "Bài báo sáng nay" và "Từ của mỗi bài thành một nhóm." | Sáng | ☐ |
| Panel đăng ký (f12, 13/11) | `/vi/app/register` ở 1440 và 1920; thu nhỏ trang (Ctrl −) | Không còn dòng chú thích ở góc dưới phải. Panel rộng theo màn (640–896 px), cảnh bên trong phóng theo. Thẻ từ ở trên trái, thẻ Hôm nay bên phải, thẻ bài tập ở dưới. Không thẻ nào đè đường nhớ | Cả hai | ☐ |
| Panel lúc tải (13/11) | Tải lại `/vi/app/register` | Thẻ luyện không nhảy từ ô xanh về ô trống; vòng lặp đi tiếp sang từ sau | Sáng | ☐ |

### Đã biết, chưa làm

- **Nhãn Bậc 3** trên panel đăng ký nằm bên phải chấm, trong khi hình vẽ để bên trái. Để bên trái thì nhãn đè lên thẻ từ.
- **Thẻ từ trên panel đăng ký** chỉ dời sang phải 12 px và hẹp đi 12 px. Dời xa hơn thì góc thẻ đè lên đường đi của các từ.
- **Trang Gói trong app** vẫn có một dòng về hoàn tiền, nội dung khác dòng đã bỏ ở trang chủ.
- **Viền ô nhập** #c7cad3 trên nền trắng chỉ đạt khoảng 1,6:1, dưới mức 3:1 của WCAG. Để cho một đợt a11y riêng.
- **D9, để sau:**
  - Nút X 32 px trên điện thoại.
  - Nút Kiểm tra cho ô điền từ trên điện thoại.
  - Tên nút đóng khác nhau giữa các phiên.
  - Toast ở góc đè lên thẻ.
  - Cách viết hoa "Tiếp theo" / "Ôn gần nhất".
  - Khay xám ở Tùy chỉnh phiên.
  - "Lần luyện gần nhất" chưa sang cột phải.
  - audit2.
- **Chưa chạy** lượt e2e đầy đủ sau các vòng sửa ngày 13/11.

## 12. Sửa theo audit giao diện 13/11 (Part 12, lỗi Cao và Trung bình)

Nguồn: [report audit](../audit/2026-11-13-web-design-guidelines-review.md) và [trang ảnh minh họa lỗi](../audit/2026-11-13-web-review-shots/index.html)
(ảnh "trước"). Các commit sau `32760f84` trên nhánh này. Chạy lại `pnpm bootstrap` từ worktree của nhánh rồi đăng nhập `lan.local@example.com`.
Mã ở cột đầu khớp mã trong report. T2, T12, T19 đã gỡ khỏi report (không phải lỗi) nên không có ở đây.
Khổ: đổi cỡ bằng DevTools (Ctrl+Shift+M). Mục ghi "trình đọc màn hình" thì kiểm bằng NVDA (Windows) hoặc Narrator (Win+Ctrl+Enter).

### Cao

| Mã | Màn | Mở bằng | Kiểm gì | Sáng/Tối | ☐ |
|---|---|---|---|---|---|
| C1 | Header | `/`, khổ 1024 và 1279 | Chỗ ô Tìm từ giờ là nút tròn kính lúp; bấm sang Tra từ. Nhấn `/` cũng sang Tra từ. Ở 1280 và 1440 vẫn là ô tìm đủ rộng, gõ thấy cả chữ | Cả hai | ☐ |
| C2 | Một nhóm | `/groups` → mở nhóm "Kinh doanh · B1", khổ 1024 | Một cột: thẻ nhóm ở trên, bảng từ ở dưới, đủ rộng. "presentation" nằm trên một dòng, "Từ mới" một dòng. Ở 1280 và 1440 mới chia hai cột | Cả hai | ☐ |

### Trung bình

| Mã | Màn | Mở bằng | Kiểm gì | Sáng/Tối | ☐ |
|---|---|---|---|---|---|
| T1 | Nút lịch nổi | `/practice` ở 1024×768 (có phiên đang dở); `/plans`, `/settings`, `/` ở 1024 và 1280 | Nút lịch nằm ở làn riêng bên phải, không đè "Làm tiếp câu …" hay số liệu nào. Từ 1440 trở lên nội dung rộng như cũ | Sáng | ☐ |
| T1 | Nút lịch, nút "+" trên điện thoại | `/`, `/plans`, `/settings` ở 390, cuộn xuống rồi dừng, rồi cuộn lên | Cuộn xuống thì hai nút trượt xuống khuất; dừng khoảng nửa giây hoặc cuộn lên thì hiện lại. Không còn che giá "mỗi tháng" hay "Xem tất cả" lúc đang đọc | Cả hai | ☐ |
| T3–T5 | Ô nhập từ | Hôm nay: ô "Thêm từ vừa gặp"; header: ô Tìm từ (1440); `/lookup`; hộp Thêm từ (phím N) | Gõ một từ sai chính tả kiểu "mitigatee": không có gạch đỏ, không bật danh sách gợi ý tự điền. Ô ở Hôm nay có chữ gợi ý "Ví dụ: mitigate…". Trên iPhone chữ đầu không tự viết hoa | Sáng | ☐ |
| T6 | Đăng ký | Đăng xuất → `/register`, để trống, bấm "Tạo tài khoản" | Nút bấm được (không mờ). Hiện lỗi dưới từng ô thiếu: "Nhập tên của bạn.", "Chọn ngày sinh.", "Nhập email.", "Nhập mật khẩu.", lỗi đồng ý điều khoản dưới ô tick. Con trỏ nhảy vào ô Tên | Sáng | ☐ |
| T6 | Các form khác | `/forgot-password`, `/reset-password`, `/verify-email`, để trống rồi bấm nút | Mỗi form báo lỗi ngay dưới ô thiếu (ô mã: "Nhập đủ 6 số của mã."), con trỏ vào ô đầu tiên, không gửi gì lên server | Sáng | ☐ |
| T7 | Đăng ký, lỗi từ server | `/register`, dùng email đã có `lan.local@example.com`, điền đủ còn lại | Lỗi "email đã dùng" hiện dưới ô Email và con trỏ nhảy vào ô Email | Sáng | ☐ |
| T8 | Lỗi được đọc | Như T6, bật trình đọc màn hình | Khi con trỏ vào ô lỗi, trình đọc màn hình đọc tên ô rồi đọc câu lỗi | Sáng | ☐ |
| T27 | Đăng nhập trống | `/login`, để trống, bấm "Đăng nhập" | Báo "Nhập email." và "Nhập mật khẩu." dưới hai ô, con trỏ vào ô Email. Không còn câu "Email hoặc mật khẩu chưa đúng." (DevTools → Network: không có request đăng nhập) | Cả hai | ☐ |
| T9 | Captcha không tải được | Chỉ kiểm được khi bật captcha thật (site key Turnstile); DevTools → Network → chặn `challenges.cloudflare.com`, mở `/register` | Báo lỗi đỏ "Không tải được bước xác minh." và nút "Tải lại bước xác minh"; bỏ chặn rồi bấm nút thì captcha hiện lại. Lúc captcha đang chạy, cạnh nút có dòng "Đang xác minh…" | Sáng | ☐ |
| T10 | Công tắc chuyển động (đã bỏ 14/11) | Trang chủ `http://localhost:3001/vi`, cuộn xuống chân trang | Không còn công tắc "Chuyển động"; chỉ còn công tắc Giao diện. Hiệu ứng lặp chỉ dừng khi máy bật giảm chuyển động | Cả hai | ☐ |
| T10 | Phần minh họa ở trang đăng ký | `/register` ở 1440, chờ khoảng 20 giây | Các từ chạy dọc đường một vòng rồi dừng ở chỗ nghỉ; chữ gõ dừng ở từ cuối. Không chạy lặp mãi | Cả hai | ☐ |
| T11 | Viền ô chọn, rãnh công tắc | `/lookup` ô "Chỉ từ của tôi"; `/settings` công tắc "Nhắc học qua email" (tắt) | Viền ô vuông và rãnh công tắc lúc tắt đậm rõ hơn trước, nhìn ra ngay trên nền trắng và nền tối | Cả hai | ☐ |
| T13 | Chữ màu nhóm 3 | Hộp Thêm từ, chọn một nhóm màu vàng cam (nhóm thứ 4 trong danh sách màu) | Chữ tên nhóm trên chip nền vàng nhạt tối hơn, dễ đọc | Sáng | ☐ |
| T14 | Cuộn tới mục trên điện thoại | Trang chủ ở 390: bấm Tab nhiều lần qua các link; trang `/vi/terms`: bấm mục lục | Phần tử đang focus hoặc tiêu đề mục không nằm dưới thanh trên | Sáng | ☐ |
| T15 | Gợi ý trong phiên | Ôn hoặc Phiên luyện, bấm "Hint" | Con trỏ chuyển vào dòng gợi ý vừa mở (có viền focus khi dùng Tab); trình đọc màn hình đọc nội dung gợi ý | Sáng | ☐ |
| T16 | Lật thẻ ở Học | `/review?…` từ nút "Học", nhấn Space | Trình đọc màn hình đọc "Mặt sau: …" kèm nghĩa vừa hiện | Sáng | ☐ |
| T17 | Ô gõ đáp án trên điện thoại | Phiên luyện có câu Gõ từ, khổ 390 (chế độ điện thoại của DevTools) | Bàn phím không tự bật khi câu hiện; chạm vào ô mới gõ được. Trên máy tính ô vẫn tự focus | Sáng | ☐ |
| T18 | Nút Lật thẻ trên điện thoại | Học ở 390 (chế độ điện thoại) | Nút Lật thẻ không tự có viền focus khi vào thẻ mới. Trên máy tính vẫn có, Space vẫn lật | Sáng | ☐ |
| T20 | Tổng kết phiên | Làm hết một phiên luyện có câu sai | Mỗi nút "Cần ôn lại" được trình đọc màn hình đọc kèm tên từ ("Cần ôn lại: release"); bấm xong đọc "Đã thêm…" | Sáng | ☐ |
| T21 | AI không dùng được | Chỉ kiểm được khi AI lỗi hoặc hết lượt câu AI giữa phiên | Trình đọc màn hình đọc ngay tiêu đề lỗi khi màn đổi | Sáng | ☐ |
| T22 | Tùy chỉnh phiên | Luyện tập → Tùy chỉnh, bỏ tick cả ba kiểu câu | Dòng lỗi hiện; trình đọc màn hình đọc dòng đó, và khi tới nút "Bắt đầu" thì đọc lý do nút bị tắt | Sáng | ☐ |
| T23 | Báo lỗi câu hỏi | Trong phiên → "Report"; DevTools → Network → chặn `report-reasons` rồi mở lại | Lúc tải thấy "Loading…"; lỗi thì có dòng lỗi và nút "Try again", bỏ chặn rồi bấm thì danh sách lý do hiện | Sáng | ☐ |
| T24 | Tiêu đề hộp Ngày | Lịch → bấm một ngày, ở `/vi/app` và `/en/app` | Tiếng Việt "05/11" như cũ; tiếng Anh "Nov 5" | Cả hai | ☐ |
| T25 | Đổi ngày trong hộp Ngày | Hộp Ngày → nút ngày sau / ngày trước, bật trình đọc màn hình | Đọc một câu gọn kiểu "thứ năm 05/11: …", không đọc cả các nhãn nút lọc | Sáng | ☐ |
| T26 | Bảng từ trên điện thoại | Một nhóm ở 390, trình đọc màn hình (Narrator: phím T để nhảy bảng) | Bảng được nhận là bảng, mỗi dòng có 4 ô | Sáng | ☐ |

### Đi kèm (Thấp, sửa cùng đợt)

| Mã | Màn | Mở bằng | Kiểm gì | Sáng/Tối | ☐ |
|---|---|---|---|---|---|
| L38 | Hộp Ngày | Một ngày không học hay ôn từ nào | Câu trống ghi "Không học hay ôn từ nào trong ngày này." | Sáng | ☐ |
