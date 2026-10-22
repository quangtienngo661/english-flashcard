# Figma node ids của các khung (22/10/2026)

File Figma `7HcPAKLrWu32C27qYMJUOA`. Lấy ngày 22/10/2026 bằng Figma MCP `get_metadata` (chỉ đọc, không sửa file) trên từng page (`254:8`, `284:8`, `2:5`, `2:2`); từ XML trả về chỉ giữ section ở cấp page và các khung con trực tiếp của section (page 04 có 15 khung Bước 2.5 nằm thẳng trên page, không trong section, ghi `-`). Thứ tự theo vị trí trên canvas: section từ trên xuống, trong section từ trên xuống rồi trái sang phải (khác thứ tự lớp ở `docs/mockups/2026-10-21/danh-sach-khung.md` ở vài chỗ). Đối chiếu tên với danh-sach-khung.md theo đúng chuỗi tên.

Mở một khung: `https://www.figma.com/design/7HcPAKLrWu32C27qYMJUOA/?node-id=<node id, đổi : thành ->`; với công cụ Figma MCP truyền node id nguyên dạng `254:8`.

| Page | Khung tìm thấy | Theo danh-sach-khung.md | Thiếu | Thêm ngoài danh sách |
|---|---|---|---|---|
| 08 Người học · Web (`254:8`) | 98 (97 `K/` + 1 khung so sánh màu) | 97 | 0 | 1 |
| 09 Người học · Điện thoại (`284:8`) | 101 | 96 | 0 | 5 |
| 04 Admin · Web (`2:5`) | 55 | 55 | 0 | 0 |
| 01 Foundations (`2:2`) | thành phần dùng chung, xem cuối file | - | - | - |

## Khác với danh-sach-khung.md

- Không thiếu khung nào trên cả ba page.
- Page 08 thêm 1 khung không mang tiền tố `K/`: `So sánh màu dải tra từ (chọn 1)` (`264:521`, section 0, khung so sánh màu, không phải màn).
- Page 09 thêm 5 khung `M/` chưa có trong danh sách: `M/21b Nhóm · danh sách lọc đang mở` (`428:5177`, section 2) và section mới `9 · Bản tối mẫu (điện thoại, Dark)` (`450:5219`) với 4 khung Dark: M/10, M/78a, M/62, M/50 (`450:5220`, `450:5282`, `450:5331`, `450:5406`).
- Tên section trên Figma dài hơn trong danh sách ở vài chỗ (ví dụ 08 `9 · Bước 7: luyện tập có AI (đợt giao diện)`, 09 `8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện)`, 04 `E3 · Người dùng, báo lỗi, lý do, trả lượt, dạng chia, cấp gói (A/71–A/79)`); bảng dưới dùng tên trên Figma.
- Chồng nhau trên canvas: page 04 `A/78d` (`414:3533`) và `A/79b` (`414:3823`) cùng vị trí (6240, 4800) trong section E3; page 09 section `6b` (y 9288, cao 2788) chồng lên section `7` (y 10588), nên các khung dài của 6b (M/L51, M/L55, M/L57) đè lên khung của section 7. Chụp màn hay xem theo node id, không theo vùng canvas.

## 08 Người học · Web (page `254:8`)

| Section | Frame | Node id |
|---|---|---|
| 0 · Đọc trước (bố cục kết hợp) (`273:1293`) | K/00 Đọc trước | `261:521` |
| 0 · Đọc trước (bố cục kết hợp) (`273:1293`) | So sánh màu dải tra từ (chọn 1) | `264:521` |
| 1 · Đăng ký và đăng nhập (`273:1294`) | K/01 Đăng ký | `273:1302` |
| 1 · Đăng ký và đăng nhập (`273:1294`) | K/02 Đăng nhập | `273:1343` |
| 1 · Đăng ký và đăng nhập (`273:1294`) | K/03 Nhập mã xác minh | `273:1383` |
| 1 · Đăng ký và đăng nhập (`273:1294`) | K/04 Quên mật khẩu | `273:1422` |
| 1 · Đăng ký và đăng nhập (`273:1294`) | K/05 Đặt mật khẩu mới | `273:1450` |
| 1 · Đăng ký và đăng nhập (`273:1294`) | K/06 Chọn ngôn ngữ | `273:1483` |
| 1 · Đăng ký và đăng nhập (`273:1294`) | K/01b Đăng ký · ngày sinh chưa đủ 13 tuổi (báo ngay ở ô) | `341:8507` |
| 1 · Đăng ký và đăng nhập (`273:1294`) | K/93 Đăng nhập · tài khoản bị khóa | `328:13037` |
| 1 · Đăng ký và đăng nhập (`273:1294`) | K/06b Chọn ngôn ngữ · danh sách đang mở | `341:8909` |
| 2 · Hôm nay và nhóm (`273:1295`) | K/10 Hôm nay | `256:189` |
| 2 · Hôm nay và nhóm (`273:1295`) | K/16 Danh sách nhóm | `268:905` |
| 2 · Hôm nay và nhóm (`273:1295`) | K/11 Nhóm Công nghệ | `257:317` |
| 2 · Hôm nay và nhóm (`273:1295`) | K/12 Nhóm, lọc ngăn 1 ngày | `274:950` |
| 2 · Hôm nay và nhóm (`273:1295`) | K/13 Nhóm, menu ⋯ | `274:1196` |
| 2 · Hôm nay và nhóm (`273:1295`) | K/14 Xóa nhóm (cảnh báo) | `274:1513` |
| 2 · Hôm nay và nhóm (`273:1295`) | K/15 Từ lâu chưa ôn (IELTS) | `445:7913` |
| 2 · Hôm nay và nhóm (`273:1295`) | K/94 Hôm nay · chưa có nhóm | `328:12804` |
| 2 · Hôm nay và nhóm (`273:1295`) | K/90 Hôm nay · menu avatar mở | `328:13087` |
| 2 · Hôm nay và nhóm (`273:1295`) | K/17 Danh sách nhóm · Tạo nhóm | `335:2879` |
| 2 · Hôm nay và nhóm (`273:1295`) | K/17b Nhóm · Đổi tên nhóm | `335:3000` |
| 2 · Hôm nay và nhóm (`273:1295`) | K/16b Danh sách nhóm · 100 nhóm, có ô tìm | `335:3121` |
| 2 · Hôm nay và nhóm (`273:1295`) | K/10b Hôm nay · menu ⋯ của thẻ nhóm | `335:3288` |
| 2 · Hôm nay và nhóm (`273:1295`) | K/18 Chủ đề Kinh doanh · B1 · chọn từ | `336:3463` |
| 3 · Phiên ôn (`273:1296`) | K/20 Phiên ôn, mặt trước | `273:1505` |
| 3 · Phiên ôn (`273:1296`) | K/21 Phiên ôn, mặt sau | `273:1530` |
| 3 · Phiên ôn (`273:1296`) | K/22 Phiên ôn, kết thúc | `273:1574` |
| 4 · Tra từ và trang từ (`273:1297`) | K/30 Tra từ | `258:413` |
| 4 · Tra từ và trang từ (`273:1297`) | K/31 Trang từ: left | `259:508` |
| 4 · Tra từ và trang từ (`273:1297`) | K/32 Trang từ: go | `275:1233` |
| 4 · Tra từ và trang từ (`273:1297`) | K/33 Trang từ: went | `275:1420` |
| 5 · Thêm từ (`273:1298`) | K/40 Thêm từ (nhận ra went) | `275:7927` |
| 5 · Thêm từ (`273:1298`) | K/41 Tự nhập nghĩa | `275:8067` |
| 5 · Thêm từ (`273:1298`) | K/42 Thêm vào nhóm | `275:8211` |
| 5 · Thêm từ (`273:1298`) | K/43 Thêm cả loạt | `275:8778` |
| 5 · Thêm từ (`273:1298`) | K/44 Thêm câu đã gặp | `275:8964` |
| 5 · Thêm từ (`273:1298`) | K/40b Thêm từ · chưa có nhóm | `326:12207` |
| 5 · Thêm từ (`273:1298`) | K/44b Thêm câu đã gặp · nghĩa đã đủ câu | `327:10733` |
| 5 · Thêm từ (`273:1298`) | K/42b Thêm vào nhóm · đang gõ tên nhóm | `333:12049` |
| 5 · Thêm từ (`273:1298`) | K/42c Thêm vào nhóm · không có nhóm khớp | `333:12695` |
| 6 · Luyện tập (`273:1299`) | K/51 Luyện tập | `276:2349` |
| 6 · Luyện tập (`273:1299`) | K/54 Luyện tập · Tùy chỉnh phiên | `276:2708` |
| 6 · Luyện tập (`273:1299`) | K/55 Luyện tập · hết lượt hôm nay | `276:3140` |
| 6 · Luyện tập (`273:1299`) | K/56 Luyện tập · Từ hay sai | `276:3501` |
| 6 · Luyện tập (`273:1299`) | K/57 Luyện tập · Lịch sử | `276:3741` |
| 6 · Luyện tập (`273:1299`) | K/57b Luyện tập · Lịch sử trống (chưa làm câu nào) | `411:5825` |
| 7 · Phiên luyện (`273:1300`) | K/60 Phiên luyện · trắc nghiệm, chưa trả lời | `273:1598` |
| 7 · Phiên luyện (`273:1300`) | K/61 Phiên luyện · trắc nghiệm, chọn sai | `273:1657` |
| 7 · Phiên luyện (`273:1300`) | K/62 Phiên luyện · đúng/sai, trả lời đúng | `273:1731` |
| 7 · Phiên luyện (`273:1300`) | K/63 Phiên luyện · gõ từ theo câu, có gợi ý | `273:1800` |
| 7 · Phiên luyện (`273:1300`) | K/64 Phiên luyện · gõ từ, chưa đúng (làm lại) | `273:1849` |
| 7 · Phiên luyện (`273:1300`) | K/65 Phiên luyện · hết vòng 1, luyện lại thêm? | `273:1911` |
| 7 · Phiên luyện (`273:1300`) | K/66 Phiên luyện · báo lỗi câu | `273:1954` |
| 7 · Phiên luyện (`273:1300`) | K/67 Phiên luyện · tổng kết | `273:2069` |
| 8 · Gói học và cài đặt (`273:1301`) | K/52 Gói học (Free) | `265:844` |
| 8 · Gói học và cài đặt (`273:1301`) | K/53 Gói học (Pro do đội Wordmet cấp) | `277:2349` |
| 8 · Gói học và cài đặt (`273:1301`) | K/50 Cài đặt | `277:2441` |
| 8 · Gói học và cài đặt (`273:1301`) | K/52t Gói học (Free) · theme tối (tham khảo) | `260:508` |
| 8 · Gói học và cài đặt (`273:1301`) | K/91 Cài đặt · Tài khoản | `328:11013` |
| 8 · Gói học và cài đặt (`273:1301`) | K/92 Cài đặt · Tài khoản · ngày sinh chưa đủ 13 tuổi | `328:11159` |
| 9 · Bước 7: luyện tập có AI (đợt giao diện) (`357:3556`) | K/70 Tùy chỉnh phiên có kiểu câu AI · Pro | `357:3557` |
| 9 · Bước 7: luyện tập có AI (đợt giao diện) (`357:3556`) | K/70t Tùy chỉnh phiên có kiểu câu AI · Dùng thử | `359:3683` |
| 9 · Bước 7: luyện tập có AI (đợt giao diện) (`357:3556`) | K/70b Tùy chỉnh phiên · Miễn phí (kiểu câu AI có khóa) | `359:4099` |
| 9 · Bước 7: luyện tập có AI (đợt giao diện) (`357:3556`) | K/71 Tùy chỉnh phiên · không đủ lượt câu AI | `359:4527` |
| 9 · Bước 7: luyện tập có AI (đợt giao diện) (`357:3556`) | K/72 Tùy chỉnh phiên · AI tạm chưa dùng được | `359:4950` |
| 9 · Bước 7: luyện tập có AI (đợt giao diện) (`357:3556`) | K/73 Phiên luyện · đang tạo câu | `360:4197` |
| 9 · Bước 7: luyện tập có AI (đợt giao diện) (`357:3556`) | K/74a Phiên chỉ có câu AI · AI lỗi (ai-failed) | `360:4266` |
| 9 · Bước 7: luyện tập có AI (đợt giao diện) (`357:3556`) | K/74b Phiên chỉ có câu AI · hết lượt (quota-exhausted) | `360:4338` |
| 9 · Bước 7: luyện tập có AI (đợt giao diện) (`357:3556`) | K/74c Phiên chỉ có câu AI · cần gói (plan-required) | `360:4410` |
| 9 · Bước 7: luyện tập có AI (đợt giao diện) (`357:3556`) | K/74d Phiên chỉ có câu AI · AI đang tắt (ai-unavailable) | `360:4482` |
| 9 · Bước 7: luyện tập có AI (đợt giao diện) (`357:3556`) | K/74e Phiên chỉ có câu AI · từ bạn tự thêm chưa được nhận ra | `360:4554` |
| 9 · Bước 7: luyện tập có AI (đợt giao diện) (`357:3556`) | K/75 Phiên trộn · AI lỗi ở một câu, đổi kiểu câu (báo một lần) | `360:15451` |
| 9 · Bước 7: luyện tập có AI (đợt giao diện) (`357:3556`) | K/75b Phiên trộn · hết lượt câu AI giữa phiên | `360:15512` |
| 9 · Bước 7: luyện tập có AI (đợt giao diện) (`357:3556`) | K/76 Phiên trộn · AI chưa nhận ra từ bạn tự thêm | `360:15573` |
| 9 · Bước 7: luyện tập có AI (đợt giao diện) (`357:3556`) | K/77 Luyện tập · mở phiên mới khi còn phiên đang dở | `360:15650` |
| 9 · Bước 7: luyện tập có AI (đợt giao diện) (`357:3556`) | K/78a Câu AI · Điền từ vào câu · đang hỏi, gợi ý 2/3 | `362:4386` |
| 9 · Bước 7: luyện tập có AI (đợt giao diện) (`357:3556`) | K/78b Câu AI · Chọn nghĩa trong câu · đang hỏi | `362:4445` |
| 9 · Bước 7: luyện tập có AI (đợt giao diện) (`357:3556`) | K/78c Câu AI · Trắc nghiệm theo câu · đang hỏi | `362:4511` |
| 9 · Bước 7: luyện tập có AI (đợt giao diện) (`357:3556`) | K/79a Câu AI · đã nộp, đúng, có bản dịch | `362:4577` |
| 9 · Bước 7: luyện tập có AI (đợt giao diện) (`357:3556`) | K/79b Câu bạn đã lưu · đã nộp, không có bản dịch, không báo lỗi | `362:4659` |
| 9 · Bước 7: luyện tập có AI (đợt giao diện) (`357:3556`) | K/80 Báo lỗi câu AI · theo lý do | `363:4417` |
| 9 · Bước 7: luyện tập có AI (đợt giao diện) (`357:3556`) | K/80b Báo lỗi · lý do bắt buộc ghi chú | `363:4596` |
| 9 · Bước 7: luyện tập có AI (đợt giao diện) (`357:3556`) | K/81 Báo lỗi câu AI về từ bạn tự thêm · ô đồng ý | `363:4779` |
| 9 · Bước 7: luyện tập có AI (đợt giao diện) (`357:3556`) | K/82 Lịch sử luyện tập · tab Báo lỗi của tôi | `364:4453` |
| 9 · Bước 7: luyện tập có AI (đợt giao diện) (`357:3556`) | K/83 Lịch sử luyện tập · Báo lỗi của tôi trống | `364:4706` |
| 10 · Bước 7: tra bằng AI và từ của tôi (đợt giao diện) (`365:4576`) | K/85 Thêm từ · không tìm thấy, Tra bằng AI · Pro | `365:4577` |
| 10 · Bước 7: tra bằng AI và từ của tôi (đợt giao diện) (`365:4576`) | K/85t Thêm từ · Tra bằng AI · Dùng thử | `365:4878` |
| 10 · Bước 7: tra bằng AI và từ của tôi (đợt giao diện) (`365:4576`) | K/85b Thêm từ · Tra bằng AI có khóa · Miễn phí | `365:5179` |
| 10 · Bước 7: tra bằng AI và từ của tôi (đợt giao diện) (`365:4576`) | K/86 Kết quả tra bằng AI · AI gợi ý | `366:5018` |
| 10 · Bước 7: tra bằng AI và từ của tôi (đợt giao diện) (`365:4576`) | K/86b Kết quả tra bằng AI · nghĩa có sẵn trước, rồi AI gợi ý | `366:5315` |
| 10 · Bước 7: tra bằng AI và từ của tôi (đợt giao diện) (`365:4576`) | K/87 Sửa trước khi lưu (từ AI gợi ý) | `366:5621` |
| 10 · Bước 7: tra bằng AI và từ của tôi (đợt giao diện) (`365:4576`) | K/88 Trang từ của tôi · nhãn AI gợi ý | `367:5452` |
| 10 · Bước 7: tra bằng AI và từ của tôi (đợt giao diện) (`365:4576`) | K/85c Tra bằng AI · trạng thái phụ | `367:5650` |
| 11 · Bản tối mẫu (Dark, đợt giao diện) (`402:5517`) | K/10 Hôm nay · Dark | `402:5518` |
| 11 · Bản tối mẫu (Dark, đợt giao diện) (`402:5517`) | K/78a Câu AI · Điền từ vào câu · Dark | `402:5625` |
| 11 · Bản tối mẫu (Dark, đợt giao diện) (`402:5517`) | K/52 Gói học (Free) · Dark | `402:5677` |
| 11 · Bản tối mẫu (Dark, đợt giao diện) (`402:5517`) | K/40 Thêm từ (nhận ra went) · Dark | `402:5747` |

## 09 Người học · Điện thoại (page `284:8`)

| Section | Frame | Node id |
|---|---|---|
| 0 · Đọc trước (điện thoại, bố cục kết hợp) (`284:157`) | M/00 Đọc trước | `294:2339` |
| 1 · Đăng ký và đăng nhập (`284:158`) | M/01 Đăng ký | `290:11353` |
| 1 · Đăng ký và đăng nhập (`284:158`) | M/02 Đăng nhập | `290:11388` |
| 1 · Đăng ký và đăng nhập (`284:158`) | M/03 Nhập mã xác minh | `290:11424` |
| 1 · Đăng ký và đăng nhập (`284:158`) | M/04 Quên mật khẩu | `290:11456` |
| 1 · Đăng ký và đăng nhập (`284:158`) | M/05 Đặt mật khẩu mới | `290:11475` |
| 1 · Đăng ký và đăng nhập (`284:158`) | M/06 Chọn ngôn ngữ | `290:11501` |
| 1 · Đăng ký và đăng nhập (`284:158`) | M/01b Đăng ký · ngày sinh chưa đủ 13 tuổi (báo ngay ở ô) | `341:8576` |
| 1 · Đăng ký và đăng nhập (`284:158`) | M/93 Đăng nhập · tài khoản bị khóa | `330:2810` |
| 1 · Đăng ký và đăng nhập (`284:158`) | M/06b Chọn ngôn ngữ · danh sách đang mở | `341:13926` |
| 2 · Hôm nay và nhóm (`284:159`) | M/10 Hôm nay | `285:135` |
| 2 · Hôm nay và nhóm (`284:159`) | M/11 Hôm nay, menu ⋯ (thẻ nhóm) | `287:278` |
| 2 · Hôm nay và nhóm (`284:159`) | M/12 Tấm Tạo mới | `287:537` |
| 2 · Hôm nay và nhóm (`284:159`) | M/13 Tạo nhóm | `287:715` |
| 2 · Hôm nay và nhóm (`284:159`) | M/15 Danh sách nhóm | `287:893` |
| 2 · Hôm nay và nhóm (`284:159`) | M/14 Danh sách nhóm, 100 nhóm | `287:1089` |
| 2 · Hôm nay và nhóm (`284:159`) | M/20 Nhóm Công nghệ | `290:828` |
| 2 · Hôm nay và nhóm (`284:159`) | M/21 Nhóm, cuộn tới danh sách từ | `290:1231` |
| 2 · Hôm nay và nhóm (`284:159`) | M/22 Xóa nhóm (hộp thoại) | `290:1837` |
| 2 · Hôm nay và nhóm (`284:159`) | M/24 Nhóm, lọc ngăn 1 ngày | `290:1463` |
| 2 · Hôm nay và nhóm (`284:159`) | M/23 Lâu chưa ôn (IELTS) | `290:2128` |
| 2 · Hôm nay và nhóm (`284:159`) | M/94 Hôm nay · chưa có nhóm | `330:2869` |
| 2 · Hôm nay và nhóm (`284:159`) | M/16 Chủ đề Kinh doanh · B1 · chọn từ | `337:2713` |
| 2 · Hôm nay và nhóm (`284:159`) | M/13b Đổi tên nhóm | `337:2948` |
| 2 · Hôm nay và nhóm (`284:159`) | M/21b Nhóm · danh sách lọc đang mở | `428:5177` |
| 3 · Phiên ôn (`284:160`) | M/30 Phiên ôn, mặt trước | `290:11523` |
| 3 · Phiên ôn (`284:160`) | M/31 Phiên ôn, mặt sau | `290:11548` |
| 3 · Phiên ôn (`284:160`) | M/32 Kết quả phiên ôn | `290:11590` |
| 4 · Tra từ và trang từ (`284:161`) | M/40 Tra từ | `292:1424` |
| 4 · Tra từ và trang từ (`284:161`) | M/41 Trang từ: left | `292:1752` |
| 4 · Tra từ và trang từ (`284:161`) | M/42 Trang từ: go | `292:2083` |
| 4 · Tra từ và trang từ (`284:161`) | M/43 Trang từ: went | `292:2386` |
| 4 · Tra từ và trang từ (`284:161`) | M/41b Trang từ: chữ dài nhất (Review Focus 1) | `327:11953` |
| 5 · Thêm từ (`284:162`) | M/50 Thêm từ (nhận ra went) | `292:12055` |
| 5 · Thêm từ (`284:162`) | M/51 Tự nhập nghĩa | `292:12326` |
| 5 · Thêm từ (`284:162`) | M/52 Lưu vào nhóm | `292:12595` |
| 5 · Thêm từ (`284:162`) | M/52b Lưu vào nhóm: đang gõ | `292:13220` |
| 5 · Thêm từ (`284:162`) | M/52c Lưu vào nhóm: không có nhóm khớp | `292:13507` |
| 5 · Thêm từ (`284:162`) | M/53 Thêm câu đã gặp | `292:13771` |
| 5 · Thêm từ (`284:162`) | M/44 Thêm cả loạt | `292:13976` |
| 5 · Thêm từ (`284:162`) | M/50b Thêm từ · chưa có nhóm | `327:11448` |
| 5 · Thêm từ (`284:162`) | M/53b Thêm câu đã gặp · nghĩa đã đủ câu | `327:11740` |
| 6 · Cài đặt, luyện tập, gói học (`284:163`) | M/90 Cài đặt (mở bằng avatar; trước đây M/60) | `293:2095` |
| 6 · Cài đặt, luyện tập, gói học (`284:163`) | M/62 Gói học (Free) | `293:2657` |
| 6 · Cài đặt, luyện tập, gói học (`284:163`) | M/63 Cài đặt, chọn giao diện | `293:2461` |
| 6 · Cài đặt, luyện tập, gói học (`284:163`) | M/91 Cài đặt · Tài khoản | `330:2509` |
| 6 · Cài đặt, luyện tập, gói học (`284:163`) | M/92 Cài đặt · Tài khoản · ngày sinh chưa đủ 13 tuổi | `330:2659` |
| 6 · Cài đặt, luyện tập, gói học (`284:163`) | M/62b Gói học (Pro do đội Wordmet cấp) | `354:3834` |
| 6b · Luyện tập (điện thoại, đợt giao diện) (`347:2942`) | M/L51 Luyện tập | `351:3202` |
| 6b · Luyện tập (điện thoại, đợt giao diện) (`347:2942`) | M/L55 Luyện tập · hết phiên luyện hôm nay | `351:3654` |
| 6b · Luyện tập (điện thoại, đợt giao diện) (`347:2942`) | M/L54 Luyện tập · Tùy chỉnh phiên | `351:4127` |
| 6b · Luyện tập (điện thoại, đợt giao diện) (`347:2942`) | M/L56 Luyện tập · Từ hay sai | `351:4532` |
| 6b · Luyện tập (điện thoại, đợt giao diện) (`347:2942`) | M/L57 Luyện tập · Lịch sử | `351:4924` |
| 6b · Luyện tập (điện thoại, đợt giao diện) (`347:2942`) | M/L57b Luyện tập · Lịch sử trống (chưa làm câu nào) | `411:10948` |
| 7 · Phiên luyện (điện thoại, đợt giao diện) (`347:2943`) | M/L60 Phiên luyện · trắc nghiệm, chưa trả lời | `348:2960` |
| 7 · Phiên luyện (điện thoại, đợt giao diện) (`347:2943`) | M/L61 Phiên luyện · trắc nghiệm, chọn sai | `348:3041` |
| 7 · Phiên luyện (điện thoại, đợt giao diện) (`347:2943`) | M/L62 Phiên luyện · đúng/sai, trả lời đúng | `348:3142` |
| 7 · Phiên luyện (điện thoại, đợt giao diện) (`347:2943`) | M/L63 Phiên luyện · gõ từ theo câu, có gợi ý | `348:3234` |
| 7 · Phiên luyện (điện thoại, đợt giao diện) (`347:2943`) | M/L64 Phiên luyện · gõ từ, chưa đúng (làm lại) | `348:3305` |
| 7 · Phiên luyện (điện thoại, đợt giao diện) (`347:2943`) | M/L65 Phiên luyện · hết vòng 1, luyện lại thêm? | `348:3396` |
| 7 · Phiên luyện (điện thoại, đợt giao diện) (`347:2943`) | M/L66 Phiên luyện · báo lỗi câu | `348:3458` |
| 7 · Phiên luyện (điện thoại, đợt giao diện) (`347:2943`) | M/L67 Phiên luyện · tổng kết | `348:3606` |
| 7 · Phiên luyện (điện thoại, đợt giao diện) (`347:2943`) | M/L63b Phiên luyện · gõ từ theo câu, câu dài nhất (Review Focus 1) | `354:3936` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/70 Tùy chỉnh phiên có kiểu câu AI · Pro | `371:4050` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/70b Tùy chỉnh phiên · Miễn phí (kiểu câu AI có khóa) | `371:5046` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/70t Tùy chỉnh phiên có kiểu câu AI · Dùng thử | `371:4548` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/71 Tùy chỉnh phiên · không đủ lượt câu AI | `371:5535` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/72 Tùy chỉnh phiên · AI tạm chưa dùng được | `371:6038` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/73 Phiên luyện · đang tạo câu | `369:3544` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/74a Phiên chỉ có câu AI · AI lỗi (ai-failed) | `369:3594` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/74b Phiên chỉ có câu AI · hết lượt (quota-exhausted) | `369:3651` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/74c Phiên chỉ có câu AI · cần gói (plan-required) | `369:3709` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/74d Phiên chỉ có câu AI · AI đang tắt (ai-unavailable) | `369:3765` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/74e Phiên chỉ có câu AI · từ bạn tự thêm chưa được nhận ra | `369:3822` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/75 Phiên trộn · AI lỗi ở một câu, đổi kiểu câu (báo một lần) | `369:3880` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/75b Phiên trộn · hết lượt câu AI giữa phiên | `369:3961` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/76 Phiên trộn · AI chưa nhận ra từ bạn tự thêm | `369:4042` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/77 Luyện tập · mở phiên mới khi còn phiên đang dở | `371:6540` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/78a Câu AI · Điền từ vào câu · đang hỏi, gợi ý 2/3 | `369:4127` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/78b Câu AI · Chọn nghĩa trong câu · đang hỏi | `369:4201` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/78c Câu AI · Trắc nghiệm theo câu · đang hỏi | `369:4280` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/78d Câu AI dài nhất · Điền từ vào câu, đủ 3 gợi ý (Review Focus 1) | `375:4502` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/79a Câu AI · đã nộp, đúng, có bản dịch | `369:4359` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/79b Câu bạn đã lưu · đã nộp, không có bản dịch, không báo lỗi | `369:4441` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/80 Báo lỗi câu AI · theo lý do | `369:4512` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/80b Báo lỗi · lý do bắt buộc ghi chú | `369:4649` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/81 Báo lỗi câu AI về từ bạn tự thêm · ô đồng ý | `369:4788` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/82 Lịch sử luyện tập · tab Báo lỗi của tôi | `373:16209` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/83 Lịch sử luyện tập · Báo lỗi của tôi trống | `373:16499` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/85 Thêm từ · không tìm thấy, Tra bằng AI · Pro | `377:4684` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/85b Thêm từ · Tra bằng AI có khóa · Miễn phí | `377:5604` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/85c Tra bằng AI · trạng thái phụ (điện thoại) | `378:5066` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/85t Thêm từ · Tra bằng AI · Dùng thử | `377:5144` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/86 Kết quả tra bằng AI · AI gợi ý | `377:6067` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/86b Kết quả tra bằng AI · nghĩa có sẵn trước, rồi AI gợi ý | `377:6530` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/87 Sửa trước khi lưu (từ AI gợi ý) | `377:7002` |
| 8 · Bước 7: luyện tập có AI (điện thoại, đợt giao diện) (`369:3543`) | M/88 Trang từ của tôi · nhãn AI gợi ý | `378:5097` |
| 9 · Bản tối mẫu (điện thoại, Dark) (`450:5219`) | M/10 Hôm nay · Dark | `450:5220` |
| 9 · Bản tối mẫu (điện thoại, Dark) (`450:5219`) | M/78a Câu AI · Điền từ vào câu · Dark | `450:5282` |
| 9 · Bản tối mẫu (điện thoại, Dark) (`450:5219`) | M/62 Gói học (Free) · Dark | `450:5331` |
| 9 · Bản tối mẫu (điện thoại, Dark) (`450:5219`) | M/50 Thêm từ (nhận ra went) · Dark | `450:5406` |

## 04 Admin · Web (page `2:5`)

| Section | Frame | Node id |
|---|---|---|
| - | A/01 Đăng nhập | `22:2` |
| - | A/02 Quên mật khẩu | `22:25` |
| - | A/03 Đổi mật khẩu (bắt buộc) | `26:1830` |
| - | A/10 Lô nhập | `22:43` |
| - | A/11 Upload CSV | `22:262` |
| - | A/12 Chi tiết lô | `22:386` |
| - | A/20 Publish job | `23:325` |
| - | A/21 Chi tiết publish job | `23:486` |
| - | A/30 Xuất CSV | `23:614` |
| - | A/40 Nguồn | `23:765` |
| - | A/50 Vai trò & staff | `23:908` |
| - | A/22 Tạo publish job | `26:1854` |
| - | A/41 Đăng ký nguồn | `26:1978` |
| - | A/51 Tạo tài khoản (hộp thoại) | `26:2117` |
| - | A/D01 Dashboard (đang phát triển) | `25:862` |
| E1 · Nội dung: Từ, Nghĩa, Chủ đề (A/87–A/89) (`395:2998`) | A/87 Từ | `395:2999` |
| E1 · Nội dung: Từ, Nghĩa, Chủ đề (A/87–A/89) (`395:2998`) | A/88 Nghĩa | `395:3514` |
| E1 · Nội dung: Từ, Nghĩa, Chủ đề (A/87–A/89) (`395:2998`) | A/88b Chi tiết nghĩa (người thao tác gần nhất) | `395:4038` |
| E1 · Nội dung: Từ, Nghĩa, Chủ đề (A/87–A/89) (`395:2998`) | A/89 Chủ đề | `395:4326` |
| E2 · Cài đặt hệ thống (A/70a–A/70f) (`397:3286`) | A/70a Cài đặt hệ thống · Nhắc học | `397:3287` |
| E2 · Cài đặt hệ thống (A/70a–A/70f) (`397:3286`) | A/70b Cài đặt hệ thống · Học và ôn | `397:3684` |
| E2 · Cài đặt hệ thống (A/70a–A/70f) (`397:3286`) | A/70c Cài đặt hệ thống · Luyện tập | `397:3943` |
| E2 · Cài đặt hệ thống (A/70a–A/70f) (`397:3286`) | A/70d Cài đặt hệ thống · Gói và lượt | `397:4231` |
| E2 · Cài đặt hệ thống (A/70a–A/70f) (`397:3286`) | A/70e Cài đặt hệ thống · Nội dung | `397:4607` |
| E2 · Cài đặt hệ thống (A/70a–A/70f) (`397:3286`) | A/70f Cài đặt hệ thống · AI | `397:4845` |
| E3 · Người dùng, báo lỗi, lý do, trả lượt, dạng chia, cấp gói (A/71–A/79) (`386:1697`) | A/71 Người dùng (chỉ admin) | `386:1698` |
| E3 · Người dùng, báo lỗi, lý do, trả lượt, dạng chia, cấp gói (A/71–A/79) (`386:1697`) | A/71e Người dùng · editor mở thẳng đường dẫn (không có quyền) | `387:1767` |
| E3 · Người dùng, báo lỗi, lý do, trả lượt, dạng chia, cấp gói (A/71–A/79) (`386:1697`) | A/72 Chi tiết người dùng · đang khóa | `387:1965` |
| E3 · Người dùng, báo lỗi, lý do, trả lượt, dạng chia, cấp gói (A/71–A/79) (`386:1697`) | A/72b Khóa tài khoản (hộp thoại) | `387:2293` |
| E3 · Người dùng, báo lỗi, lý do, trả lượt, dạng chia, cấp gói (A/71–A/79) (`386:1697`) | A/73 Báo lỗi · danh sách | `391:2300` |
| E3 · Người dùng, báo lỗi, lý do, trả lượt, dạng chia, cấp gói (A/71–A/79) (`386:1697`) | A/73e Báo lỗi · như editor thấy (lọc Chưa xử lý, trống) | `389:2436` |
| E3 · Người dùng, báo lỗi, lý do, trả lượt, dạng chia, cấp gói (A/71–A/79) (`386:1697`) | A/74 Chi tiết báo lỗi · câu AI, từ riêng được chia sẻ | `389:2667` |
| E3 · Người dùng, báo lỗi, lý do, trả lượt, dạng chia, cấp gói (A/71–A/79) (`386:1697`) | A/74b Chi tiết báo lỗi · câu thường về từ catalog, lựa chọn nhiễu là từ riêng (đã che) | `389:3075` |
| E3 · Người dùng, báo lỗi, lý do, trả lượt, dạng chia, cấp gói (A/71–A/79) (`386:1697`) | A/74c Chi tiết báo lỗi · đã xử lý (người xử lý, trả lượt, lỗi 409) | `389:3417` |
| E3 · Người dùng, báo lỗi, lý do, trả lượt, dạng chia, cấp gói (A/71–A/79) (`386:1697`) | A/75 Lý do báo lỗi (chỉ admin) | `393:2300` |
| E3 · Người dùng, báo lỗi, lý do, trả lượt, dạng chia, cấp gói (A/71–A/79) (`386:1697`) | A/75b Sửa lý do báo lỗi (hộp thoại) | `393:2876` |
| E3 · Người dùng, báo lỗi, lý do, trả lượt, dạng chia, cấp gói (A/71–A/79) (`386:1697`) | A/76 Trả lượt (chỉ admin) | `393:3535` |
| E3 · Người dùng, báo lỗi, lý do, trả lượt, dạng chia, cấp gói (A/71–A/79) (`386:1697`) | A/77 Dạng chia chưa biết (admin, editor) | `393:3990` |
| E3 · Người dùng, báo lỗi, lý do, trả lượt, dạng chia, cấp gói (A/71–A/79) (`386:1697`) | A/77b Dạng chia chưa biết · trống | `393:4368` |
| E3 · Người dùng, báo lỗi, lý do, trả lượt, dạng chia, cấp gói (A/71–A/79) (`386:1697`) | A/78 Cấp gói và lượt · danh sách và lịch sử | `394:2657` |
| E3 · Người dùng, báo lỗi, lý do, trả lượt, dạng chia, cấp gói (A/71–A/79) (`386:1697`) | A/78b Thu hồi (hộp thoại) | `394:3168` |
| E3 · Người dùng, báo lỗi, lý do, trả lượt, dạng chia, cấp gói (A/71–A/79) (`386:1697`) | A/78c Cấp gói và lượt · trống | `394:3719` |
| E3 · Người dùng, báo lỗi, lý do, trả lượt, dạng chia, cấp gói (A/71–A/79) (`386:1697`) | A/79 Cấp mới (admin) | `394:3994` |
| E3 · Người dùng, báo lỗi, lý do, trả lượt, dạng chia, cấp gói (A/71–A/79) (`386:1697`) | A/79e Cấp mới · như editor thấy (lỗi 409 grant-not-allowed) | `394:4288` |
| E3 · Người dùng, báo lỗi, lý do, trả lượt, dạng chia, cấp gói (A/71–A/79) (`386:1697`) | A/78d Sửa ngày lần cấp (hộp thoại) | `414:3533` |
| E3 · Người dùng, báo lỗi, lý do, trả lượt, dạng chia, cấp gói (A/71–A/79) (`386:1697`) | A/79b Cấp gói Pro cho người đang trả tiền (xác nhận tắt tự gia hạn) | `414:3823` |
| E4 · AI của Bước 6 (A/80–A/86, chỉ admin) (`399:3706`) | A/84 Tình trạng AI | `399:3707` |
| E4 · AI của Bước 6 (A/80–A/86, chỉ admin) (`399:3706`) | A/84b Tình trạng AI · lần đầu admin vào (chưa chọn model) | `399:4386` |
| E4 · AI của Bước 6 (A/80–A/86, chỉ admin) (`399:3706`) | A/80 Model | `399:5057` |
| E4 · AI của Bước 6 (A/80–A/86, chỉ admin) (`399:3706`) | A/80b Thêm model (hộp thoại) | `399:5435` |
| E4 · AI của Bước 6 (A/80–A/86, chỉ admin) (`399:3706`) | A/81 Thao tác | `400:3985` |
| E4 · AI của Bước 6 (A/80–A/86, chỉ admin) (`399:3706`) | A/82 Prompt (lời dặn, ví dụ, chạy thử, lịch sử) | `400:4436` |
| E4 · AI của Bước 6 (A/80–A/86, chỉ admin) (`399:3706`) | A/83 Bộ ví dụ và các lần chạy | `400:5124` |
| E4 · AI của Bước 6 (A/80–A/86, chỉ admin) (`399:3706`) | A/85 Chi phí AI | `400:5685` |
| E4 · AI của Bước 6 (A/80–A/86, chỉ admin) (`399:3706`) | A/86 Các lần gọi theo mã thao tác | `400:6197` |

## Thành phần dùng chung đặt ngay trên page 08 và 09 (ngoài section)

Các khung màn ở 08/09 dùng các component này (đếm instance theo tên trong XML: 08 có 54 `Thanh trên…`, 50 `Chân trang (web)`, 68 `Thẻ nhóm (lưới)`; 09 có 55 instance tên `tabbar`, 14 `Đầu màn (điện thoại…)`, 38 `Đầu màn · trang con (có dải tra)`).

| Page | Thành phần | Node id | Biến thể (node id) |
|---|---|---|---|
| 08 | Thanh trên (web, bố cục kết hợp) (bộ biến thể) | `254:333` | Active=Hôm nay `254:9`, Active=Nhóm `267:794`, Active=Luyện tập `254:90`, Active=Tra từ `254:171`, Active=Không `254:252` |
| 08 | Thẻ nhóm (lưới) (component) | `256:168` | - |
| 08 | Chân trang (web) (component) | `443:6928` | - |
| 09 | Đầu màn (điện thoại, bố cục kết hợp) (component) | `284:9` | - |
| 09 | Thanh tab (điện thoại, bố cục kết hợp) (bộ biến thể) | `284:156` | Active=Hôm nay `284:31`, Active=Nhóm `284:56`, Active=Luyện tập `284:81`, Active=Tra từ `284:106`, Active=Không `284:131` |
| 09 | Đầu màn · trang con (điện thoại, có dải tra) (component) | `332:2670` | - |
| 09 | Đầu màn · trang con (điện thoại, không dải tra) (component) | `332:2693` | - |
## 01 Foundations (page `2:2`): thành phần dùng chung

Chỉ tên và node id. Page 01 **không có** component cho thanh trên, chân trang, ô nhập, dropdown, chip, thẻ, công tắc bật/tắt hay hộp thoại/tấm
(bottom sheet) của người học: thanh trên, chân trang và thẻ nhóm nằm ngay trên page 08/09 (bảng ở trên); ô nhập (`input …`), `lọc (dropdown)`, `chip …`,
`thẻ …`, menu và hộp thoại được vẽ thẳng bằng layer thường trong từng khung (không phải instance), nên phải lấy từ khung màn tương ứng.

| Thành phần | Node id | Biến thể / phần con (node id) |
|---|---|---|
| Button (bộ biến thể) | `3:71` | Style=Sticker, Size=Large `3:51`; Style=Sticker, Size=Medium `3:53`; Style=Quiet, Size=Large `3:55`; Style=Quiet, Size=Medium `3:57`; Style=Ink, Size=Large `3:59`; Style=Ink, Size=Medium `3:61`; Style=Danger, Size=Large `3:63`; Style=Danger, Size=Medium `3:65`; Style=OnField, Size=Large `3:67`; Style=OnField, Size=Medium `3:69` |
| (mờ) Nền họa tiết học từ (web) (component, 1920×1080) | `440:268` | - (page 08 dùng 12 instance tên `(mờ) Nền họa tiết học từ`) |
| Cờ ngôn ngữ (đợt giao diện, 22/10) (khung) | `341:8896` | flag/vi `341:8885`; flag/en `341:8889` |
| Badge/Đang phát triển (component) | `3:181` | - |
| Icons (khung, 30 icon 24×24) | `3:2` | icon/today `3:7`; icon/practice `3:11`; icon/search `3:15`; icon/settings `3:19`; icon/back `3:23`; icon/more `3:28`; icon/close `3:32`; icon/plus `3:35`; icon/check `3:38`; icon/lock `3:42`; icon/crown `3:45`; icon/upload `3:50`; icon/lightbulb `207:202`; icon/flag `207:206`; icon/history `207:211`; icon/target `207:216`; icon/star `207:219`; icon/layers `207:224`; icon/folder `207:227`; icon/sliders `207:238`; icon/chevron-down `207:241`; icon/minus `207:244`; icon/info `207:249`; icon/circle-x `207:254`; icon/circle-check `207:258`; icon/calendar `207:264`; icon/rotate-ccw `207:268`; icon/skip-forward `207:272`; icon/panel-left-close `240:296`; icon/panel-left-open `240:301` |
| TabBar (điện thoại) (bộ biến thể, bản 4 tab cũ; page 09 dùng `Thanh tab (điện thoại, bố cục kết hợp)` `284:156`) | `3:180` | Active=Hôm nay `3:72`; Active=Luyện tập `3:99`; Active=Tra từ `3:126`; Active=Cài đặt `3:153` |
| Sidebar (người học web) (bộ biến thể; không thấy instance tên Sidebar trong khung page 08, page 08 dùng `Thanh trên` `254:333`) | `15:430` | Thu gọn=Không: Hôm nay `15:40`, Luyện tập `15:105`, Tra từ `15:170`, Cài đặt `15:235`, Công nghệ `15:300`, IELTS `15:365`, Gói học `214:198`; Thu gọn=Có: Hôm nay `237:179`, Luyện tập `237:230`, Tra từ `237:281`, Cài đặt `237:332`, Công nghệ `237:383`, IELTS `237:434`, Gói học `237:485` |
| iOS/Status bar (iPhone 16) (khung máy, không phải UI app) | `58:226` | Text=Dark `58:198`; Text=Light `58:212` |
| iOS/Home indicator (khung máy, không phải UI app) | `58:231` | Tone=Dark `58:227`; Tone=Light `58:229` |

Khác trên page 01, chỉ cho admin: `Admin/NavItem` `21:151` (State=Default `21:142`, Active `21:144`, Dev `21:146`), `Admin/Sidebar` `21:152`,
`Kit admin · mẫu (script figma-adminkit.js dùng; không phải màn)` `413:477` (mẫu panel, setting, ô nhập, công tắc `switch on` `413:505`, tabs).
