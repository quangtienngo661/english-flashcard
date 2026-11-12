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
| Toast chuỗi ngày | Học hoặc luyện xong lần đầu trong ngày | Toast trắng có viền, icon lửa trong ô nhỏ; trong phiên nằm góc phải dưới nút X; không đè nút | Cả hai | ☐ |
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
- **Gợi ý chữ cái đầu** giữ `e___` (QP3), khác mockup `e_______`: đúng như đã chốt.
- **Điện thoại thật** (đo khung hình, QM9-7) vẫn là việc trước PR cuối vào `dev`, xem checklist cũ.
