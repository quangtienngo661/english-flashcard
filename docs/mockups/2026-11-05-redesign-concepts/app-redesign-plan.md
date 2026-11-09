# Thiết kế lại app người học trên Figma: ý tưởng và dữ liệu thật (08/11/2026)

File Figma: `JKnyUUtGjpGpfKK4PqBfdY`. Style giữ theo landing bản 3:
- chữ Noto Sans và Bricolage;
- màu nhấn `#2445d6` trên navy;
- vàng chỉ để tô từ đích;
- nền sáng;
- glow nhẹ.

Mỗi dòng dữ liệu dưới đây đã đọc từ code trên `dev` (hoặc từ design đợt C nếu ghi rõ), không đoán.

## Ý tưởng chung (taste-skill: lấy từ chính chủ đề)

> Trong app, **sáu ngăn ôn của mỗi từ** (Mới, 1, 3, 7, 14, 30 ngày) trở thành **thanh ngăn**, một hình lặp lại ở mọi màn:
> trang một từ cho thấy từ đang ở ngăn nào, Hôm nay cho thấy bao nhiêu từ ở mỗi ngăn, trang nhóm cho thấy cả nhóm đang ở đâu,
> phiên Ôn cho thấy từ lên ngăn.

- Mỗi ngăn có một màu hạng nhẹ, mượn từ style K đã chọn: Mới xám, 1 ngày đồng, 3 ngày bạc, 7 ngày vàng, 14 ngày lục bảo, 30 ngày ánh kim. Màu chỉ để mã hoá ngăn, không thay màu nhấn.
- Từ đích trong câu luôn tô vàng, giống landing.
- "Đã thuộc" là nấc ≥ 4, tức đã đúng ở mốc 7 ngày (DC11 đợt C).

Tham khảo Dictionary.com (ảnh chủ dự án gửi 08/11), chỉ lấy ý:
- tab nhảy trong trang;
- thẻ đầu mục có phiên âm hai giọng;
- nghĩa đánh số theo loại từ;
- dạng khác của từ hiện thành chip;
- khối câu ví dụ có nguồn.

Không lấy:
- quảng cáo chéo;
- vòng quay từ ngẫu nhiên;
- dải logo ở chân trang.

## Khung app (`app-chrome`)

- **Thanh trên** (`TopBar.tsx`):
  - nền navy, logo, 4 tab: Hôm nay, Nhóm, Luyện tập, Tra từ;
  - nút "Thêm từ" kèm phím `N`;
  - "Gói học";
  - avatar, menu gồm Cài đặt, đổi giao diện sáng/tối, Đăng xuất;
  - chip gói: Miễn phí / Dùng thử / Pro.
- **Ô tìm** (`chrome.search`): chọn trình độ ("Mọi trình độ"), ô "Tìm từ", nút "Tra".
- **Phone:** tab bar dưới (`MobileTabBar.tsx`), nút + nổi (FAB) ở Hôm nay, Nhóm và Tra từ.
- **Cột phụ:** từ 1280 px (`AppShell` `aside`).

## Tra từ `/app/lookup` (`LookupPage.tsx`)

- **URL:** `?q=&level=&topic=&pos=&mine=`.
- **Bộ lọc:** "Trình độ: {value}", "Chủ đề: {value}", "Loại từ: {value}", "Chỉ từ của tôi", "Xóa lọc".
- **Bảng kết quả:** cột Từ, Loại từ, Nghĩa, Trình độ. Mỗi dòng có:
  - nút + ("Thêm “{word}”");
  - chip "Của tôi" nếu là từ riêng;
  - nút "Xem thêm" để tải trang kết quả tiếp.
- **Cột phụ (≥ 1280 px):** xem trước từ đang rê chuột, gồm:
  - trình độ, chủ đề, từ, loại từ, nghĩa;
  - "Câu mẫu";
  - [Thêm vào nhóm] [Mở trang từ].
- **"Thêm cả loạt"** (`addWord.bulkButton`): chỉ hiện khi có lọc trình độ, chủ đề hoặc loại từ, và không có chữ tìm hay lọc "Chỉ từ của tôi".
- **Trống:** "Không tìm thấy từ này" / "Thử bỏ bớt bộ lọc, hoặc tự thêm từ này với nghĩa của bạn." / [Thêm từ này].
- **API:** `GET /v1/words?…`, `GET /v1/words/{lemma}`.

## Trang một từ `/app/word?w=` (`WordPage.tsx`, `SenseBlock.tsx`, `LearningBlock.tsx`, `FormsLine.tsx`)

**Dữ liệu** (`word-api.ts`):
- `lemma`;
- `inflections[] {kind, form, has_page}`;
- `sections[] {pos, senses[]}`.

Mỗi sense có:
- `level`, `context_label`;
- `meaning.text` (Việt);
- `definition_en`;
- `examples[]` (hiện câu đầu);
- `topics[]`;
- `form_of`;
- `scope` catalog/private;
- `ai_suggested`;
- `sentence_count`.

Đợt C (M2, trên nhánh `feat/dot-c-*`) thêm:
- `ipa_uk`, `ipa_us` theo từng nghĩa, hiện kiểu Cambridge;
- hai giọng WaveNet UK và US.

**Trạng thái học** (`GET /v1/items?sense_ids=`): `level` (ngăn), `due_date`, `group_ids`.

**Chữ** (`App.word`):
- "Dạng chia:", "Là dạng chia của {base}:";
- "Thêm vào nhóm", "Đang học", "{count} câu đã gặp", "Bạn đang học";
- dòng của "Bạn đang học": Loại từ / Nghĩa / Nhóm / Câu đã gặp;
- "{group} · ngăn {days} ngày", "Thêm câu đã gặp", "Cùng chủ đề: {topic}";
- "Từ của tôi", "AI gợi ý", "Nguồn: AI gợi ý. Nghĩa này chưa ai duyệt, bạn nên kiểm lại.";
- [Sửa] [Xóa từ];
- không tìm thấy: "Không tìm thấy từ “{word}”" + [Thêm từ này].

**Hiện tại:** một card chứa mọi nghĩa; cột phụ có Bạn đang học, Thêm vào nhóm khác, Cùng chủ đề.

**Thiết kế mới:**
1. **Thẻ đầu mục:**
   - từ cỡ 64 px;
   - dải trình độ;
   - phiên âm UK và US, mỗi giọng một nút loa;
   - dòng dạng chia tô vàng (link tới trang của dạng đó);
   - chip chủ đề.
2. **Tab nhảy trong trang, dính khi cuộn:** Nghĩa · Câu đã gặp · Dạng chia · Cùng chủ đề.
3. **Nghĩa:**
   - nhóm theo loại từ, có tiêu đề loại từ;
   - mỗi nghĩa có số thứ tự, nghĩa Việt, định nghĩa Anh, câu mẫu (từ đích tô vàng, có nút loa);
   - bên phải là trạng thái học: chip ngăn có màu hạng, hoặc nút [Thêm vào nhóm].
4. **Câu đã gặp:** câu người học tự ghi theo từng nghĩa, kiểu khối câu ví dụ có nguồn của Dictionary.com. Nguồn ở đây là "câu bạn gặp", kèm ngày thêm và nút [Thêm câu đã gặp].
5. **Cùng chủ đề:** chip các từ cùng chủ đề.
6. **Cột phụ, dính khi cuộn:**
   - "Bạn đang học": thanh ngăn 6 nấc đánh dấu ngăn hiện tại, ngày ôn tiếp (`due_date`), các nhóm kèm ngăn của từ trong nhóm đó;
   - [Thêm vào nhóm khác].

## Hôm nay `/app` (`TodayPage.tsx`, `QuickAddBox.tsx`, `groups/GroupCard.tsx`, `TopicSuggestions.tsx`)

**Dữ liệu** (`GET /v1/groups`), mỗi nhóm có:
- `name`, `total`;
- `today {priority, due, new}`;
- `cells[6] {level, total, due}`;
- `backlog`.

`learning.backlog_after_days` lấy từ app config.

**Hiện tại:**
- Khối chính: nhóm có thẻ chờ đầu tiên, kèm chip "Ôn tiếp · có thẻ ưu tiên", "{waiting} thẻ chờ hôm nay · nhóm có {total} từ", ô số ưu tiên / đến hạn / mới, nút "Ôn {count} thẻ" và "Hoặc học tất cả {total} từ".
- Tối đa 6 thẻ nhóm, mỗi thẻ có:
  - thanh ngăn;
  - "{n} từ · {n} từ lâu chưa ôn";
  - chip "{n} thẻ chờ" / "Xong hôm nay" / "Chưa có từ";
  - nút "Ôn {n} thẻ" / "Học lại cả nhóm" / "Thêm từ";
  - menu ⋯ (Đổi tên nhóm / Học tất cả {n} từ / Xóa nhóm).
- "Tạo nhóm nhanh theo chủ đề".
- Cột phụ:
  - "Thêm từ vừa gặp" (ô "Ví dụ: went", nút [Thêm]);
  - "{n} từ lâu chưa ôn" + [Xem];
  - "{n} từ theo ngăn" (đến hạn / tổng).
- Trống: "Chưa có nhóm nào" + [Tạo nhóm đầu tiên]. Xong: "Xong hết thẻ hôm nay. Mai ôn tiếp."

**Đợt C:**
- Nút Học và Ôn ngang nhau, không ghi số (DC3).
- "Đã thuộc" = nấc ≥ 4 (DC11).
- Toast chuỗi ngày "N ngày liên tiếp", hiện 3 giây, một lần mỗi ngày (DC9).

**Thiết kế mới:**
- Khối chính có số thẻ chờ cỡ lớn (ý từ style D) và thanh ngăn theo cột, có màu hạng.
- Khối **"Lần luyện gần nhất"** (điểm, các từ sai, [Luyện lại từ sai], "Xem lịch sử") là **đề xuất mới** theo R6. Dữ liệu lấy từ lịch sử luyện; trang Hôm nay hiện chưa có khối này.

## Các trang ngoài tab (vẽ 08/11/2026)

Chữ lấy từ `messages/vi.json` (`App.settings`, `App.transactions`, `App.plans`, `App.deleteAccount`), đọc ngày 08/11/2026.

- **Cài đặt:** mục lục dính bên trái (desktop), sáu card: Thông tin cá nhân, Gói và mức sử dụng (ba đồng hồ: phiên luyện hôm nay, lượt câu AI, lượt tra AI), Học tập (ngôn ngữ, giao diện Sáng/Tối/Theo hệ thống), Thông báo, Phím tắt (chỉ desktop), Tài khoản.
- **Lịch sử giao dịch:** bảng 6 cột (Ngày, Loại, Gói và kỳ, Số tiền, Kỳ được dùng, Trạng thái) + "Chi tiết"; dưới bảng là card "Gói học" và "Về giao dịch". Có một khung riêng cho hộp "Chi tiết giao dịch". Mobile là danh sách, chạm một dòng để xem chi tiết.
- **Xóa tài khoản:** hai card "Những gì bị xóa" / "Những gì còn được giữ", cảnh báo Pro còn lại sẽ mất, form xác nhận (tick, gõ lại email, mật khẩu, nút đỏ "Xóa vĩnh viễn").
- **Gói học:** dùng lại khối giá của landing (Pro có glow, ba ô kỳ), chữ theo app. Thêm bảng "So sánh chi tiết các gói". Số theo mặc định trong `apps/api/src/settings/settings.definitions.ts`: Free 3 phiên/ngày, 15 câu AI và 5 lượt tra AI/tháng; Pro 30, 300, 100; mỗi người tối đa 100 nhóm.
- **Đơn hàng:** card "Thanh toán thành công" (Gói, Số tiền, Mã đơn hàng; [Bắt đầu học] [Xem gói]); một khung gom bốn card trạng thái khác: đang kiểm tra, đang chờ xác nhận, đang được kiểm tra (kèm email hỗ trợ), đã hủy hoặc hết hạn.

## Sáu overlay (vẽ 08/11/2026)

Component `app-ui/Dialog.tsx`: hộp thoại ở giữa từ 768 px, sheet trượt từ dưới khi hẹp hơn. Figma vẽ đúng hai dạng này, trên trang phía sau đã phủ navy 45%.

| Overlay | Nguồn | Trang phía sau trong Figma | Thêm gì so với code |
|---|---|---|---|
| Thêm từ | `AddWordSheet.tsx` | Hôm nay | tô vàng "went" và mũi tên tới "go" ở dòng dạng chia |
| Thêm câu | `AddSentenceSheet.tsx` | Trang một từ | xem trước mặt sau thẻ, từ đích tô vàng |
| Thêm cả loạt | `BulkAddSheet.tsx` | Tra từ | bộ lọc hiện thành chip, chip ngăn Mới cạnh câu "Các từ chưa học vào ngăn Mới." |
| Kết quả tra bằng AI | `AiLookupResult.tsx` trong Thêm từ | Tra từ | card AI có viền sáng như gói Pro |
| Chọn nhóm | `DeckPickerDialog.tsx`, `GroupPicker.tsx` | Trang một từ | thanh ngăn nhỏ của mỗi nhóm (desktop) |
| Giới thiệu Pro | `house-ad/HouseAd.tsx` | Danh sách nhóm | viền sáng và glow như gói Pro, chip "Có AI" |

Hộp "Chi tiết giao dịch" hiện "Cổng thanh toán: payOS" vì app đang có dòng này (`transactions.detail.provider`); chủ dự án quyết có ẩn không.

## Vòng 6: bố cục Nhóm và Tra từ, màn Ôn (08/11/2026)

- **Màn Ôn:** chủ dự án chọn style artifact "Chồng thẻ tan mờ" (`chong-the-mo.html`) thay bản Figma trước. Figma đã vẽ lại 5 khung ở hàng y=14000: mặt trước, đang kéo sang "Đã biết" (máy tính), đã lật (điện thoại), xong phiên (cả hai). Chữ theo `App.review` trong `messages/vi.json`; nút cuối là "Về trang chủ", không phải "Ôn lại từ đầu" của bản demo.
- **Nhóm và Tra từ:** 10 hướng bố cục trong `vong-6-nhom-tra-tu.html` (artifact https://claude.ai/artifact/T55WS4KFo3asFFu9VdPLbL). Lượt 1 ghép style (Mục lục, Bìa sưu tập, Chồng thẻ, Bảng ngăn, Bàn làm việc); lượt 2 theo nguyên tắc thiết kế (Một việc trước, Theo trạng thái, Một tay, Bản tin, Ngữ cảnh trước). Chờ chủ dự án chọn; khung Nhóm và Tra từ hiện có trong Figma là bản cũ.
- **Dữ liệu đã kiểm:** `GET /v1/groups` có `today {priority, due, new}`, `cells[6]`, `backlog`. Không có API dự báo số thẻ đến hạn theo ngày, nên mẫu 10 (lịch 7 ngày) cần API mới.

## Vòng 7: đào sâu chồng thẻ và trang từ điển (08/11/2026)

Chủ dự án chốt hướng ở vòng 6: Tra từ theo trang từ điển của mẫu 4 "Bảng ngăn" (ý ổn nhưng chưa đặc sắc), Nhóm đào sâu mẫu 3 "Chồng thẻ".
File `vong-7-chong-the-tu-dien.html` (artifact https://claude.ai/artifact/6z635GjwYNpctydnMoNHJD):

- **Nhóm:** N1 Chiều sâu (nhóm đang chọn nét, nhóm khác mờ), N2 Băng chuyền, N3 Mép thẻ theo ngăn (mép thẻ tô màu ngăn, thẻ chờ nhô ra), N4 Xòe bài (5 thẻ sắp ôn), N5 Hộp phiếu (mỗi nhóm là một thẻ chia có lẫy).
- **Tra từ:** T1 Lẫy chữ cái (lẫy A–Z ở mép trang, tiêu đề chạy, chữ đầu mục chia âm tiết), T2 Cờ đánh dấu (cờ màu ngăn cho từ đang học), T3 Từ hóa thẻ (mục được chọn nhấc lên thành thẻ; thêm vào nhóm bằng cách bấm chồng của nhóm).
- N4 cần API trả vài thẻ đầu của mỗi nhóm (hiện chỉ màn Ôn lấy). Chờ chủ dự án chọn.

## Chốt và vẽ Figma (08/11/2026)

- **Nhóm:** băng chuyền N2, kiểu "Trượt mờ", quay vòng. Thẻ giữa nét, hai thẻ kề mờ, thẻ xa ẩn. Mặt thẻ: tên nhóm to nhất, số thẻ chờ màu nhóm, dòng nhỏ "tiếp theo · từ". Màu bìa nhóm chỉ ở viền thẻ và quầng sáng (đề xuất mới, app chưa có màu nhóm). Chọn nhóm ở xa bằng nút tên nhóm có ô tìm (phím F). Mở nhóm: bấm thẻ giữa, bấm "Xem nhóm" hoặc ↓; phần khác mờ đi khoảng 0,17 giây, thẻ bay lên thành đầu trang nhóm.
- **Tra từ:** T3 "Từ hóa thẻ": ô tìm nổi bật ở đầu, câu bộ lọc, trang từ điển một cột, chữ cái vần nhỏ, mục đang chọn nhấc lên thành thẻ, thêm vào nhóm bằng cách bấm chồng của nhóm.
- **Thanh trên cùng:** kính mờ cho cả app (component trong Figma đã đổi).
- **Figma:** Nhóm (y=6000, kèm trạng thái mở nút chọn nhóm ở x=2100 và 3640), Một nhóm (y=8000), Tra từ (y=2000). Nền mờ của các overlay 3, 4, 6 đã đổi sang trang mới.
- **Hôm nay (cùng ngày):** phần "Nhóm của bạn" dùng thẻ tên nhóm như trang Nhóm (4 nhóm khác còn thẻ chờ; điện thoại cuộn ngang); nhóm đã xong và nhóm trống gom thành một dòng chữ; khối "Ôn tiếp" có viền và quầng màu nhóm.
- **Còn kiểu cũ ở Hôm nay:** cặp nút Ôn/Học và biểu đồ cột trong khối "Ôn tiếp"; 4 thẻ "Tạo nhóm nhanh theo chủ đề" có vạch màu trên đầu.

## Vòng 8: polish nền và 7 màn phụ (08/11/2026)

Trang mẫu `vong-8-polish.html` (https://claude.ai/artifact/9qmMN3pWp1VtvPPZsvzvb9). Màn: Từ tồn đọng, Lịch sử luyện tập, Phiên luyện (vừa trả lời đúng), Luyện tập, Chủ đề, Ôn xong phiên, Ôn mặt trước (chỉ đổi nền). Mỗi màn có 5 hướng nền và bề mặt:

1. **Vở kẻ:** dòng kẻ ngang navy 9% cách 32 px, lề đỏ ở 88 px; khối trắng không viền.
2. **Lưới chấm + quầng:** chấm 20 px mờ dần ra mép, quầng navy góc trái trên và vàng góc phải dưới; khối chỉ có viền 1 px.
3. **Dải tiêu đề + số chìm:** dải navy nhạt sau phần đầu; con số chính của màn in chìm 330 px ở góc dưới, nấp sau các khối.
4. **Mesh + hạt + kính:** bốn quầng navy, vàng, lục có hạt nhiễu; khối kính mờ viền sáng.
5. **Chồng giấy:** nền gạch chéo mảnh; mỗi khối là tờ giấy có hai tờ lệch phía sau.

Sửa "AI slop" chung cho mọi hướng: bỏ thanh chọn nền navy đậm (Từ tồn đọng), bỏ 3 thẻ giải thích bằng nhau, chip bo tròn lặp ở mỗi dòng thay bằng số tabular và thanh ngắn, lưới 2 × 2 thẻ nguồn luyện thay bằng danh sách, bỏ quầng vàng vô nghĩa và khối "Đúng rồi" tách rời ở Phiên luyện, bỏ vạch màu bên trái tiêu đề Chủ đề. Chờ chủ dự án chọn hướng trước khi vẽ Figma.

## Vòng 9: hướng 2 có bóng, nút lịch nổi và modal Lịch học (08/11/2026)

Chủ dự án chọn hướng 2 (lưới chấm + quầng) và muốn khối có bóng; bỏ trang Lịch sử luyện tập, thay bằng lịch xem từng ngày; mọi màn có nút nổi mở lịch; lịch là modal, không phải trang riêng. Trang mẫu `vong-9-lich.html` (https://claude.ai/artifact/XJxqbQ6KnZ6ZrKxqyje5Qe).

- **Khối:** viền 1 px + bóng hai lớp màu navy (`--shadow-card`), không dùng bóng đen.
- **Nút lịch nổi:** tờ lịch nhỏ (dải navy "T11", số ngày hôm nay, nhãn vàng số ngày liên tiếp) ở góc dưới phải; trên thanh tab ở điện thoại; phím L. Cuối mỗi màn chừa 124 px (điện thoại 100 px) để nút không che nội dung cuối.
- **Điện thoại trong phiên Luyện tập / Ôn** (không có thanh tab): nút lịch nằm trên thanh trên cùng, không nổi, vì nút nổi che nút "Đã biết". Đề xuất, chờ chủ dự án duyệt.
- **Modal Lịch học:** trái là lịch tháng T2 → CN, các ngày có học liền nhau nối bằng dải nhạt, chấm navy / lục / vàng = học từ mới / ôn / luyện tập, tổng tháng (ngày có học, từ mới, lượt ôn, phiên luyện). Phải là chi tiết ngày đang chọn: từ đã học (chấm màu nhóm), từ đã ôn (Đã biết / Cần ôn lại), các câu luyện tập; lọc Tất cả · Học · Ôn · Luyện. Phím mũi tên đổi ngày, Esc đóng. Điện thoại: tấm trượt từ dưới lên. "Báo lỗi của tôi" thành liên kết ở chân modal.
- **API:** DB có `learning_log.local_date` và `learning_activity_days`; `GET /v1/practice/history?date=` đã lọc theo ngày. Chưa có endpoint tổng theo tháng và danh sách từ đã học / đã ôn của một ngày cho người học: phải thêm khi làm thật.
- **Sửa cùng ngày (chủ dự án):** không để từ đã học và lịch chung một modal. Nay là hai modal thay chỗ nhau. **Lịch** chỉ có lịch tháng, tổng tháng và một dòng số lượt của ngày đang chọn, không liệt kê từ. Bấm một ngày (hoặc Enter) thì modal **Ngày** thay chỗ: từ đã học, từ đã ôn, câu luyện tập, có lọc; ‹ › sang ngày khác; "‹ Lịch tháng 11" hoặc Esc quay lại Lịch. Trên điện thoại cả hai dùng chung một tấm trượt, đổi nội dung tại chỗ.
- **Sửa tiếp (chủ dự án):** bỏ dòng "ngày đang chọn" dưới lịch tháng; modal Lịch chỉ còn lịch.

## Vẽ Figma vòng 8–9 (08/11/2026)

File `JKnyUUtGjpGpfKK4PqBfdY`, trang "App người học"; đoạn "App: đoạn 7" ở trang Ghi chú.

- **Component mới (trang Hệ thống):** `Nền app/Lưới chấm — Desktop` và `— Mobile` (lưới chấm là một vector vì Figma không nhận fill lặp mẫu qua API), `Nút lịch nổi` (Lớn, Nhỏ; thuộc tính Ngày, Tháng, Chuỗi), `Nút lịch trong thanh`, `Ô chọn nhỏ`, `Chip từ` (Thường, Cần ôn), `Ô ngày lịch` (Desktop/Mobile × Thường, Chọn, Hôm nay, Ngoài tháng, Tương lai). Style bóng `Shadow/Card`, `Shadow/Pop` (màu navy).
- **Vẽ lại, thay khung cũ cùng chỗ:** Từ tồn đọng (y=10000), Chủ đề (y=12000), Luyện tập (y=16000), Phiên luyện vừa trả lời đúng (y=18000).
- **Ôn (y=14000):** năm khung có nền mới; hai khung xong phiên có tóm tắt mới.
- **Lịch sử luyện tập (y=20000):** khung cũ đã gỡ, thay bằng modal Lịch (x=0, 1540) và modal Ngày (x=2100, 3640), dựng trên trang Luyện tập phía sau và lớp nền mờ.
- **Nút lịch nổi** gắn vào mọi màn app khác (28 khung, không gắn vào overlay). Hai liên kết "Xem lịch sử" ở Hôm nay đổi thành "Mở lịch học".
- **Phủ nền (chủ dự án, cùng ngày):** nền lưới chấm phủ thêm 28 màn app còn lại và trang phía sau 12 overlay.
- **Chưa làm:** bản Dark của lưới chấm.
- **Thanh trên cùng (chủ dự án, cùng ngày):** thêm bóng và tăng blur. Trong Figma: effect style `Glass/Header` (blur nền 24), đường kẻ dưới là stroke, bóng là dải gradient navy 18 px "Bóng dưới" trong component. Bóng đổ của Figma tính theo độ đục nên loang lổ dưới nền kính, vì vậy không dùng. Trang mẫu HTML vòng 9: blur 24 và `box-shadow` navy.

## Vòng 10: các màn còn lại (08/11/2026)

Chủ dự án hỏi còn màn nào chưa làm lại, rồi chọn "Làm hết". Trang mẫu `vong-10-con-lai.html` (https://claude.ai/artifact/EPETkKUKK2FXSvpRCaU9S8): 12 màn (Hôm nay, Trang một từ, Từ hay sai, Phiên luyện tổng kết, Cài đặt, Tài khoản, Xóa tài khoản, Lịch sử giao dịch và hộp chi tiết, Gói học, Đơn hàng thành công và các trạng thái khác) và 6 overlay. Câu chữ lấy đúng từ khung Figma hiện có.

- **AI slop đã sửa, lặp ở nhiều màn:** icon trong ô vuông màu ở đầu khối, hai ba ô số bằng nhau, nút trắng nổi có bóng, khung trong khung (khối màu chứa thẻ trắng), khối AI tô gradient, chip trạng thái dạng viên. Thay bằng: số lớn làm điểm nhìn, nút chính một màu và việc phụ là liên kết, chấm màu kèm chữ, danh sách kẻ mảnh.
- **Hôm nay:** thanh chia ba màu thay ba ô số và biểu đồ "nhịp ôn"; "Học cả 48 từ" thành liên kết; lần luyện gần nhất dùng dải 20 vạch; thẻ chủ đề thành hàng chữ. Bỏ nhãn "5 ngày liên tiếp" (nút lịch đã có). Sửa thứ: 08/11/2026 là chủ nhật, 07/11 là thứ bảy.
- **Gói học, Giới thiệu Pro:** giữ viền và quầng của Pro như landing.
- **Đề xuất chữ mới:** liên kết "Để sau" ở overlay Giới thiệu Pro.
- Chờ chủ dự án duyệt rồi vẽ Figma.

## Vẽ Figma vòng 10 (08/11/2026)

Đoạn "App: đoạn 8" ở trang Ghi chú. Thay khung cũ ở cùng vị trí: Trang một từ (y=0), Hôm nay (y=4000), Phiên luyện tổng kết (y=18000, thêm bản điện thoại ở x=3640), Từ hay sai (y=22000), Cài đặt (y=24000), Tài khoản (y=27000), Xóa tài khoản (y=29000), Lịch sử giao dịch và hộp chi tiết (y=31000, 32086), Gói học (y=33200), Đơn hàng và các trạng thái khác (y=35200, 36300). Sáu overlay (y=38000–43500) có hộp thoại mới; trang phía sau của overlay 1, 2, 5 thay bằng Hôm nay và Trang một từ mới.

- Hôm nay giữ thẻ nhóm và viền "Ôn tiếp" của vòng 7 (chép từ khung cũ). Toast "5 ngày liên tiếp" (Đợt C, hiện sau câu trả lời đầu tiên trong ngày) không còn vẽ trong khung Hôm nay.
- Điện thoại Hôm nay: nút "+" thêm từ có từ trước, nút lịch xếp ngay phía trên.
- Nút "Phụ" trong app: viền 1,5 px thay bóng nổi; component gốc giữ nguyên vì landing dùng.

## Motion

Mọi chuyển động và chuyển cảnh đã chốt, motion đang chạy trong code và các chỗ hai bên lệch nhau: `motion-va-chuyen-canh.md` (08/11/2026).

## Overlay 7 "Tùy chỉnh phiên" (09/11/2026)

Hộp này có trong code (`apps/web/src/features/learner/practice/CustomizeDialog.tsx`) nhưng chưa có khung Figma bản mới. Đã vẽ ở y=44600: máy tính (hộp 600 px trên trang Luyện tập), điện thoại (tấm trượt, phần giữa cuộn, nút bắt đầu dính đáy), và khung các trạng thái khác (AI khóa ở gói Miễn phí, điền từ bằng câu đã lưu, không đủ lượt câu AI, hết phiên hôm nay). Ghi chú Figma: "App: đoạn 9".

Còn 11 hộp thoại trong code chưa có khung Figma bản mới: Tạo nhóm, Đổi tên nhóm, Xóa nhóm, Bỏ từ khỏi nhóm, Bỏ N từ khỏi việc học, Sửa từ, Xóa từ, Câu đã gặp, Báo lỗi câu này, Phiên đang dở, Hủy gói.

## Vòng 11: bố cục "Tùy chỉnh phiên" (09/11/2026)

Hai chỗ chủ dự án thấy chưa hợp lý ở Overlay 7:
- "Kiểu đề" cho Gõ từ nằm xa ô Gõ từ.
- Hai dropdown Lọc từ và Ngăn không nhãn, chọn cái này thì cái kia về mặc định.

Trang mẫu `vong-11-tuy-chinh.html` (artifact `6Puihc3mM34BkxR3bQr6p1`) có 5 bố cục, bấm thử được, đủ máy tính, điện thoại, gói Pro và Miễn phí:
1. Ba bước.
2. Hai cột.
3. Ma trận "đề × cách trả lời". Gộp Gõ từ theo câu, Điền từ (AI) và câu đã lưu thành một ô có ba nguồn câu.
4. Câu ghép.
5. Gọn, mở từng dòng.

Chủ dự án yêu cầu (09/11/2026): gộp "Chọn nghĩa trong câu" và "Trắc nghiệm theo câu" vì cả hai là trắc nghiệm. Ở cả 5 bản, hai kiểu này thành một ô "Trắc nghiệm theo câu" (AI), bên trong chọn "Hỏi: Chọn nghĩa / Chọn từ / Trộn". Trộn gửi cả hai kiểu của code. Ma trận bản 3 còn 2 hàng (đề là nghĩa, đề là câu).

Cùng ngày, áp `ui-best-practices.md` cho cả 5 bản. Danh sách thay đổi nằm ở cuối trang mẫu, mục "Đã áp nguyên tắc". Một script đã kiểm cả nền sáng lẫn nền tối, máy tính lẫn điện thoại:
- 3 cỡ chữ (24, 16, 14) và nhãn 12. Ngoại lệ: câu ở bản 4 trên điện thoại cỡ 20.
- 3 độ đậm, 2 họ chữ, không còn chữ in hoa toàn bộ.
- Viền ô tick tương phản 3,34:1 ở nền sáng, 4,30:1 ở nền tối.
- Trên điện thoại không còn chỗ bấm nào thấp hơn 44 px.

Bản 3 và 4 bỏ công tắc AI.

## Vòng 12: "Tùy chỉnh phiên" bản gọn (09/11/2026)

Chủ dự án thấy 5 bản vòng 11 vẫn rối. Người dùng cần thao tác nhanh, dễ nhìn, không khó hiểu.

Trang mẫu `vong-12-tuy-chinh-gon.html` (artifact `13XXMaEywXrAZNWVg3o81F`) có 3 bố cục:
1. Thẻ kiểu luyện.
2. Kiểu luyện lên đầu.
3. Ba hàng.

Cả 3 bản dùng chung hướng:
- Chọn 1 trong 4 **kiểu luyện**: Trộn đủ kiểu, Chọn đáp án, Gõ từ, Câu AI viết. Danh sách kiểu câu chỉ mở khi bấm "Tự chọn kiểu câu".
- Số câu là 4 nút 5, 10, 15, 20. Bỏ nút −/+, nên mất các số lẻ như 12.
- Ngăn và Thứ tự nằm trong "Thêm tùy chọn".
- Lượt AI chỉ báo khi không đủ, ngay trên nút Bắt đầu.
- API không đổi.

## Vòng 13: quay lại bản 2 "Hai cột", làm gọn (09/11/2026)

Chủ dự án chọn quay lại bản 2 "Hai cột" của vòng 11 và yêu cầu làm gọn bằng skill `taste-skill:redesign-existing-projects`. Lý do: ô chọn to, bố trí chưa ổn.

Trang mẫu `vong-13-hai-cot-gon.html` (artifact `Fk5yMKD1Ykdjn19UcF4Mdt`) chỉ có một bố cục:
- Kiểu câu là danh sách, mỗi kiểu một hàng 40 px, không viền, không mô tả.
- Nút chọn đề nằm ngay trên hàng của nó, chỉ hiện khi hàng được chọn.
- Nhóm là danh sách, không cuộn. Nhóm chưa có từ thì mờ và không chọn được.
- Lọc từ là 3 nút liền một hàng.
- Nút chữ "Chỉ một ngăn" nằm cùng hàng tiêu đề "Từ · N từ" (chủ dự án yêu cầu, 09/11/2026).
- Chân hộp một hàng: số câu (−/+), thứ tự và nút Bắt đầu.
- Trên máy tính hộp không cuộn.

Chức năng giữ như code: nút −/+, công tắc AI, dòng lượt AI. Bộ chữ dự án giữ nguyên, không đổi font như skill gợi ý.

**Chốt (chủ dự án, 09/11/2026):** vòng 13 là bản dùng cho "Tùy chỉnh phiên".

Bản điện thoại được canh lại cho đều trước khi vẽ (đo bằng script):
- Mọi khối cách mép 16 px; nhóm cách nhóm 24 px; tiêu đề cách nội dung 12 px.
- Nút chọn đề chạy từ đầu chữ tới mép phải của hàng.
- Số câu và Thứ tự thành hai hàng trong phần cuộn; chân tấm chỉ còn nút Bắt đầu.

Để sau, chưa làm: cho một phiên trộn câu đã lưu và câu AI (quyết định A11 giữ nguyên: mỗi phiên một nguồn `cloze_source`). Muốn trộn phải sửa API, cần một thiết kế riêng.

## Vẽ Figma Overlay 7 theo vòng 13 (09/11/2026)

**Trang "Hệ thống"**, khung "Thành phần · Tùy chỉnh phiên (vòng 13)" ở dưới cùng:
- Component "Nút chia đoạn" (Đang chọn), "Công tắc" (Bật), "Hàng nhóm" (Đã chọn).
- Component "Hàng kiểu câu": Đã chọn × Thiết bị; thuộc tính Nhãn, Có tùy chọn, Có ghi chú, Ghi chú.
- Text style mới "Body/Small strong" (14, SemiBold); effect style mới "Shadow/Row".

**Trang "App người học"**, y=44600:
- Máy tính: hộp 840 px vẽ lại.
- Điện thoại: tấm trượt vẽ lại.
- Thêm khung "Mobile 390, cuộn xuống cuối" ở x=1540, y=45544.
- Khung các trạng thái nay có 6 trạng thái: gói Miễn phí, bật câu đã lưu, chọn một ngăn, không đủ lượt câu AI, không chọn kiểu câu nào, hết phiên hôm nay.

Màu, bo góc và chữ đều gắn biến và style của file.

## Audit Figma toàn file (09/11/2026)

Báo cáo đầy đủ: `docs/audit/2026-11-09-figma-audit.md`. Đã làm trong lượt này:
- Logo đổi thành "wordmet.".
- Các trang tài khoản không còn sáng tab nào.
- Sửa lỗi trên điện thoại: nút nổi che chữ, gợi ý phím, chip lọc xuống nhiều hàng, cách nhóm nhãn ở kết quả tra AI.
- Bỏ placeholder trong ô nhập, thêm ô nhập lại mật khẩu.
- Mảng nền xanh ở trang đăng nhập có thêm chi tiết mờ.
- Thẻ "Thanh toán thành công" làm gọn.

Chủ dự án chốt 09/11/2026: giữ JetBrains Mono cho nhãn nhỏ của app người học; `ui-best-practices.md` đã ghi ngoại lệ. Bản thử Noto Sans (5 cặp khung) để ở section "Thử font nhãn" cuối trang App người học, chưa áp dụng.

Trang một từ (09/11/2026, chủ dự án yêu cầu):
- Phần đầu có thẻ "Phát âm và dạng chia":
  - từ loại là nhãn có nền, cột nhãn rộng 76 px trên máy tính;
  - IPA UK và US cỡ 16 đậm, kèm component Nút loa;
  - dạng chia thành chip, dạng gốc tô nền.
- Bỏ dòng "A2–B1 · Công việc" phía trên từ.
- Trình độ và chủ đề chuyển vào thẻ "Cùng chủ đề":
  - máy tính: ở cột phải, dưới thẻ "Bạn đang học";
  - điện thoại: ở cuối trang.
- Trên điện thoại, UK và US xếp hai dòng.

Chỉnh lại cùng ngày (chủ dự án: "làm nổi bật vừa thôi"):
- Phần phát âm bỏ nền thẻ và bóng. Từ loại chỉ còn chữ mono navy. Nút loa 28 px. Dạng chia là một dòng 16 px, dạng gốc in đậm.
- Thẻ "Cùng chủ đề" có nhãn "cùng chủ đề" và tiêu đề "Công việc"; bên phải ghi "trình độ A2–B1".
- Sau đó tên chủ đề thành nhãn có nền: nền color/accent-soft, chữ color/accent, bo 10. Lý do: nhãn và tiêu đề cùng màu tối, khó phân biệt.

## Bỏ chữ gạch chân kiểu liên kết (09/11/2026)

Chủ dự án không thích chữ gạch chân kiểu liên kết cho các hành động. Bảng 5 mẫu (A Viền, B Nền nhạt, C Chữ và icon, D Vòng icon, E Theo vai trò) nằm ở section "Mẫu nút thay chữ gạch chân", cuối trang App người học. Chủ dự án chọn **C**.

- Component mới "Nút chữ" ở trang Hệ thống. Thuộc tính Nhãn; kiểu Thêm (icon +), Thường, Phụ (chữ xám), Xóa (chữ đỏ). Không có chiều cao tối thiểu trong Figma; vùng bấm 44 px do code lo.
- Trang App người học: thay 182 chữ gạch chân (tính cả các bản sao trang nền phía sau hộp thoại). Gồm 148 Thường, 20 Thêm, 12 Phụ, 2 Xóa.
- Trang đăng nhập không có chữ gạch chân.
- Trang công khai chỉ có một liên kết nằm giữa câu, giữ nguyên.
- Số "5" gạch chân trong ô lịch "Hôm nay" là dấu ngày hôm nay, giữ nguyên.

Nút lưu ở hộp "Thêm từ" đổi từ "Lưu go" thành "Lưu" (chủ dự án, 09/11/2026). **Việc code để sau:** `apps/web/messages/vi.json` dòng 933 vẫn là `"save": "Lưu {word}"`, cần đổi thành "Lưu" (và bản tiếng Anh tương ứng) khi làm giao diện.
- Từ cùng chủ đề xếp lưới 2 cột: mỗi ô có từ và trình độ của từ đó, nền color/bg.
- Cuối thẻ là link "Xem chủ đề Công việc →".

Còn chờ quyết: có cho ô Turnstile chỉ hiện khi cần hay không.

## Vòng 15: polish chín trang, mỗi trang 5 mẫu (09/11/2026)

File `vong-15-polish-9-trang.html`, artifact https://claude.ai/artifact/6BVCmS5vDFZtSMbfaPfBLE. Chủ dự án gửi 9 ảnh Figma, nhờ polish, vẽ 5 mẫu mỗi trang, thêm bóng cho mọi card, và thêm trạng thái trả lời sai cho trang câu hỏi.

Chín trang: Thêm từ (kết quả tra AI), Tài khoản, Cài đặt · Đăng xuất, Phiên luyện, Chi tiết giao dịch, Lịch sử giao dịch, Xóa tài khoản, Từ lâu chưa ôn, Chủ đề. Mỗi trang có máy tính và điện thoại, xem từng mẫu hoặc cả 5 mẫu cùng lúc.

- **Bóng:** mọi card dùng `--shadow-card` (bóng navy hai lớp); ô chọn, chip, ô từ dùng `--shadow-row`; hộp thoại, thanh nổi, menu dùng `--shadow-pop`. Quy tắc mới trong `ui-best-practices.md` mục 3.
- **Phiên luyện, ba trạng thái sai** lấy từ code (`AnswerFeedback.tsx`, `TypeWordQuestion.tsx`):
  - gõ sai, còn làm lại: "Chưa đúng", "Kiểm tra chính tả rồi gõ lại…", nút Làm lại / Gợi ý / Xem đáp án;
  - sai, đã xem đáp án: từ gõ sai gạch ngang, đáp án đúng bên cạnh; Cần ôn lại là nút chính, Câu tiếp giữ lịch;
  - trắc nghiệm chọn sai: ô "Bạn chọn" đỏ, ô "Đáp án đúng" xanh.
- **Lệch giữa Figma và app:** khung "vừa trả lời đúng" vẽ gợi ý đã mở cùng nút "Đã biết". App không có nút Đã biết khi đúng nhờ gợi ý. Mẫu vòng 15 bỏ gợi ý đã mở; khung Figma cần sửa theo.
- **Tài khoản:** email trong code chỉ đọc (`AccountPage.tsx`), Figma vẽ như ô sửa được. Mẫu vòng 15 vẽ email là chữ kèm chip "Đã xác minh".
- Chữ mới (đề xuất) ghi trong ghi chú từng mẫu trên trang, ví dụ "Phiên đăng nhập", "Sao chép", "nối tiếp kỳ đang dùng".
- Kiểm bằng Playwright cả 120 tổ hợp: không lỗi script, không tràn mép, vùng chạm điện thoại ≥ 44 px, chỉ ba họ chữ, mọi card có bóng.

Chủ dự án chọn (09/11/2026):

| Trang | Mẫu |
|---|---|
| 1 Thêm từ · tra AI | C Có thẻ xem trước |
| 2 Tài khoản | A Hai nhóm một card |
| 3 Cài đặt · Đăng xuất | E Trong menu ảnh đại diện |
| 4 Phiên luyện | E Thẻ kéo ra |
| 5 Chi tiết giao dịch | A Biên lai |
| 6 Lịch sử giao dịch | B Theo tháng |
| 7 Xóa tài khoản | B Hai cột, tráo lại: cột nhập bên trái, danh sách bên phải (điện thoại: danh sách trước) |
| 8 Từ lâu chưa ôn | A Thanh chọn nổi |
| 9 Chủ đề | A Thanh thêm nổi |

## Vẽ lại Figma theo mẫu vòng 15 (09/11/2026)

Trang "App người học" (55:306), file `JKnyUUtGjpGpfKK4PqBfdY`.

| Trang | Khung (máy tính / điện thoại) | Đã làm |
|---|---|---|
| Phiên luyện 4E | 100:3164 / 100:3291 | Câu hỏi là card riêng, kết quả là tấm kéo ra bên dưới (chồng 26/22 px). Bỏ gợi ý đã mở ở trạng thái đúng. Vạch câu 7 màu xanh. |
| Phiên luyện, 3 trạng thái mới | 178:5326 / 178:5442 (gõ sai, còn làm lại); 178:5546 / 178:5657 (sai, đã xem đáp án); 178:5755 / 178:5895 (trắc nghiệm chọn sai) | Hàng y=18000, bên phải các khung cũ. Câu chữ và nút theo `AnswerFeedback.tsx`, `TypeWordQuestion.tsx`. |
| Thêm từ 1C | Overlay 4: 75:1071 / 75:1346 | Hộp 860 px, hai cột; thẻ xem trước nghiêng nhẹ. Điện thoại xếp dọc, thẻ xem trước gọn. |
| Tài khoản 2A | 121:4297 / 121:4404 | Nhóm "Hồ sơ" và "Email đăng nhập" (email là chữ, kèm chip Đã xác minh); card "Gói Pro" riêng. |
| Cài đặt 3E | 120:4295 / 120:4559, khung mới 181:5456 / 181:5748 | "Đăng xuất" thành nút chữ có icon. Component mới "Menu ảnh đại diện" (181:316, trang Hệ thống). Hai khung mới ở y=24000 có menu đang mở. |
| Chi tiết giao dịch 5A | 122:4484, khung mới 182:5856 | Kiểu biên lai: số tiền ở giữa, đường cắt nét đứt, các dòng không kẻ. Nền phía sau là trang lịch sử mới. Thêm bản điện thoại (tấm trượt từ dưới). |
| Lịch sử giao dịch 6B | 122:4203 / 122:4354 | Xếp theo tháng, bấm cả dòng (mũi tên ›), card "Pro tới hết 07/02/2027". Bỏ khối "Về giao dịch" như mẫu B. |
| Xóa tài khoản 7B tráo | 121:4503 / 121:4634 | Máy tính: form 400 px bên trái, danh sách bên phải. Cảnh báo đỏ vào trong form. Điện thoại: danh sách trước. |
| Từ lâu chưa ôn 8A | 97:3085 / 97:3239 | Thanh chọn nổi ở đáy ("Bỏ khỏi việc học" chữ đỏ). |
| Chủ đề 9A | 98:3127 / 98:3297 | Thanh "thêm vào" nổi ở đáy. |

- 8A và 9A: khung cao bằng màn hình (900 / 844) để thấy thanh nổi đè lên danh sách. Trên điện thoại ẩn nút lịch nổi để không chồng thanh.
- Bóng: card mới dùng Shadow/Card. 44 thẻ phía sau trong các chồng thẻ thêm Shadow/Row. Thẻ đang làm mờ (layer blur) giữ nguyên.
- Lưu ý khi viết script: màu biến có độ mờ phải truyền màu thật vào paint gốc của `setBoundVariableForPaint`. Truyền màu đen thì Figma vẽ ra màu đen.

Còn lại:
- Nút chữ "Đăng xuất" có icon là khung tự dựng, chưa thành biến thể của component "Nút chữ".
- Mẫu 6B không còn chú thích các loại giao dịch (Mua, Hoàn tiền, Cấp gói).
- Chưa có bản Dark.

Đầu phiên luyện (chủ dự án, 09/11/2026): thay 20 vạch đúng/sai bằng một thanh tiến độ liền (tô navy tới câu đang làm) và hai chip đếm, ✓ số câu đúng (xanh) và ✗ số câu sai (đỏ), đặt sau "câu 7 / 20". Điện thoại ghi "7/20". Đã sửa cả 8 khung Phiên luyện.

Sau đó (chủ dự án: "sửa toàn bộ") bỏ kiểu vạch ở mọi chỗ còn lại trên trang App người học:
- Khung tổng kết phiên: thanh đầy, chip ✓16 ✗4; điện thoại ghi "20/20".
- "Lần luyện gần nhất" ở Hôm nay (và bản nền sau hộp Thêm từ), modal Ngày ở Lịch học: thanh hai màu theo tỉ lệ đúng/sai (xanh/đỏ), kèm chip ✓ ✗.
- Từ hay sai, cột "5 câu gần nhất" của mỗi từ: chip ✓ ✗ (bỏ thứ tự đúng/sai theo thời gian).
- Phiên Ôn: thanh tiến độ tô tới thẻ đang ôn, không thêm chip vì hai chồng "Cần ôn lại / Đã biết" đã hiện số.
- Trang mockup vòng 15: đầu phiên cũng đổi theo.
- Giữ nguyên: thanh "Ngăn" ở hộp Chọn nhóm (phân bố từ theo ngăn, không phải đúng/sai) và section thử font.

## Bo góc nút và hộp thoại bớt tròn (09/11/2026)

Chủ dự án: hộp thoại và nút bấm đang hơi tròn, sửa toàn bộ.

- Hai biến mới trong bộ "Wordmet số đo": `radius/button` = 10, `radius/modal` = 16. Muốn chỉnh tiếp thì đổi giá trị biến.
- Gắn `radius/button`: component "Nút" (Chính, Phụ), "Nút Google", nút "Thêm từ" trong 5 biến thể Thanh trên app/Desktop, 37 nút tự dựng ở trang App người học (Cần ôn lại, Đã biết, Câu tiếp, Gợi ý, Làm lại, các "Nút: …"). Mọi chỗ dùng component Nút ở các trang đổi theo, không có chỗ nào ghi đè.
- Gắn `radius/modal`: 25 hộp thoại, tấm trượt (chỉ góc trên), thanh nổi ở trang App người học, và component "Menu ảnh đại diện".
- Giữ tròn hẳn: chip, nhãn, tab điều hướng, ô tìm ở thanh trên, công tắc, nút chia đoạn, ô chọn số câu.
- Trang mockup vòng 15 đổi theo (nút 10 px, hộp thoại 16 px). Quy tắc mới ghi ở `ui-best-practices.md` mục 3.
- Code (`apps/web`) chưa đổi.

## Unslop trang mockup vòng 15 (09/11/2026)

Chủ dự án: dùng /unslop, sửa trực tiếp trên mockup. Mức slop nhẹ, nên chỉ polish theo hướng đã có (navy, Bricolage + Noto + JetBrains Mono, lưới chấm). Figma đổi theo ở mục sau.

- Khoảng cách: 138 khai báo padding, margin, gap đưa về lưới 4 px (giữ các bước 2–6 px trong control nhỏ).
- Màu: bóng card, hàng, hộp nổi đổi từ ánh navy (accent) sang ink trung tính, nhỏ hơn. Bỏ bóng màu dưới nút (navy, xanh, đỏ) và dưới thanh trên. Trang "Từ lâu chưa ôn": thanh và số ngày quá hạn thành xám, chỉ số 18 còn màu đỏ.
- Icon: nét 2 → 1,75; cỡ lẻ 13, 15, 17 px → 16 px.
- Chữ: tiêu đề trang -0,035em → -0,025em, số lớn -0,05em → -0,035em. Chữ "Pro" ở thanh trên thành chữ xám, bỏ nền.
- Chi tiết: ô tìm 10 px, tab đang chọn và mục lục 8 px, nhãn (điền từ vào câu, câu AI, từ điển, AI gợi ý), chip đúng/sai, chip Đã xác minh 6 px, nút đóng 10 px, card trong hộp thoại 12 px, hover nút chữ 8 px. Ô chọn bỏ quầng 3 px, giữ viền accent.
- Giữ nguyên, ghi làm gợi ý: quầng navy và vàng ở góc nền (chủ dự án đã chọn ở vòng 8), chữ Bricolage 800 cho tiêu đề và số lớn (nét riêng của hướng D), bóng card (chủ dự án yêu cầu, chỉ làm dịu).

## Figma theo lượt unslop vòng 15 (09/11/2026)

Chủ dự án chọn "Đổi Figma theo". Phạm vi: trang App người học và các component app ở trang Hệ thống. Không đụng "Bảng mẫu" (bảng so sánh mẫu cũ) và section thử font.

- Style bóng: Shadow/Card, Shadow/Row, Shadow/Pop đổi sang màu ink (27 36 68), cùng giá trị với mockup. Mọi chỗ dùng style đổi theo.
- Bóng nút: 66 nút tự dựng bỏ bóng; nút "Thêm từ" trong 5 biến thể Thanh trên app/Desktop bỏ bóng. 27 bóng tự đặt còn ánh navy (FAB, ô tìm lớn, các hộp trạng thái) đổi sang ink và nhạt hơn. Bỏ 10 quầng viền trang trí (hộp Giới thiệu Pro, thẻ Pro, ô tìm lớn); giữ quầng focus của "Ô nhập".
- Bo góc: tab thanh trên 8, ô tìm thanh trên 10 (`radius/md`), mục menu ảnh đại diện 8, Chip ngăn 6; ở trang app: 64 chip đúng/sai và nhãn (từ loại, AI gợi ý, từ điển, Đã xác minh) 6, nút Đóng và ô Lọc từ 10, 25 card trong hộp thoại và tấm trượt 12.
- Chữ "Pro" ở thanh trên: bỏ nền và padding, chữ màu muted.
- Thanh trên: ẩn lớp "Bóng dưới".
- Icon: nét mặc định (2 trên khung 24) đổi thành 1,75 ở 260 icon; 48 icon cỡ 15, 17, 18 (tab thanh trên, menu) đưa về 16. Icon nét dày có chủ ý (dấu tick, dấu x) giữ nguyên.
- Chữ: 217 chữ Bricolage ExtraBold có khoảng chữ chặt (từ -2,6% trở xuống) nới ra còn 70% (ví dụ -3,6% → -2,5%, -5% → -3,5%).
- Từ tồn đọng (97:3085, 97:3239): thanh quá hạn xám (muted 55%), số ngày muted SemiBold; số 18 giữ đỏ.
- Khoảng cách: 2.127 giá trị padding và gap (1.070 frame) ở trang app và 70 ở component app đưa về lưới 4 px. Giữ các giá trị lẻ thập phân của thẻ thu nhỏ (chồng thẻ) và mọi giá trị biến. Bảy tấm trượt điện thoại cao thêm 14–57 px nên kéo lại sát đáy khung.
- Chưa đổi: component "Nút" Kiểu=Chính vẫn có bóng navy (trang công khai dùng chung); nút tăng giảm số câu và huy hiệu vẫn tròn. Code (`apps/web`) chưa đổi.

## Trả bóng nút (09/11/2026)

Chủ dự án xem bản so sánh có bóng và không bóng, chọn giữ bóng nút. Phần bỏ bóng nút ở hai mục trên được hoàn lại; các thay đổi khác của lượt unslop giữ nguyên.

- Figma, trang App người học: 57 nút nền navy lấy lại bóng navy (30 58 138, 34%, y 10, blur 28, spread -10); 2 nút "Xóa vĩnh viễn" lấy lại bóng đỏ; 6 nút chọn nhóm lấy lại bóng ink nhẹ; 2 nút nổi "+" trên điện thoại về lại bóng navy. 3 nút bị tắt ở các trạng thái của Tùy chỉnh phiên giữ không bóng.
- Figma, Hệ thống: nút "Thêm từ" trong 5 biến thể Thanh trên app/Desktop lấy lại bóng navy. Trang công khai không đổi gì.
- Mockup vòng 15: `--shadow-btn`, `.btn.ok`, `.btn.bad`, `.btn.sec` về lại giá trị trước unslop (chế độ tối vẫn không bóng nút như trước). Kiểm tự động 120 tổ hợp qua; artifact bản 6.
- Quy tắc ở `ui-best-practices.md` mục 3 sửa theo.

## Học · Ôn theo đợt C và màn Ôn trong Figma (09/11/2026)

Chủ dự án chốt GM17 của design giao diện mới: tên theo code đợt C (DC3). "Học" là lật thẻ (`/app/review`), "Ôn" là chọn hoặc gõ từ theo nghĩa
(`/app/recall`). Rồi chọn "Vẽ trong Figma".

- **Nút:** "Ôn 24 thẻ" + "Học cả 48 từ" thành hai nút bằng nhau "Học" (nút phụ) và "Ôn" (nút chính, vì có thẻ đến hạn), không số. Sửa ở Hôm nay,
  Nhóm (băng chuyền và lúc mở chọn nhóm), Một nhóm, trang nền của Overlay 1 và 6 (12 chỗ). Máy tính 148 px mỗi nút; điện thoại chia đều chỗ còn lại.
- **Component Nút** (Chính, Phụ) căn chữ giữa, để nút rộng cố định không lệch chữ sang trái. Nút ôm chữ không đổi gì.
- **Khung lật thẻ** đổi tên "Ôn — …" thành "Học — …"; nhãn "ôn nhóm" thành "học nhóm". Chữ trong phiên ("Đóng phiên ôn", "Cần ôn lại") giữ như code.
- **Màn Ôn mới**, hàng y=52000, dựng từ khung Phiên luyện:
  - trắc nghiệm theo nghĩa `208:5655` (máy tính) / `208:5778` (điện thoại);
  - gõ từ theo nghĩa `209:5683` / `209:5802`;
  - gõ sai, so chữ với đáp án `209:5902` / `209:6003` (dòng so chữ là đề xuất, code chưa có);
  - xong phiên `209:6089` / `209:6195`: "Xong 8 từ.", vòng 6/8, bốn ô Đúng lên ngăn · Đúng giữ ngăn · Sai giữ ngăn · Cần ôn lại, "Còn 6 từ mới
    trong nhóm này" với nút Học và "Về trang chủ".
- Màn Ôn không có nhãn AI, không có nút báo lỗi.
- **Còn mở:** gõ sai một chữ nhỏ có tính là đúng không.
