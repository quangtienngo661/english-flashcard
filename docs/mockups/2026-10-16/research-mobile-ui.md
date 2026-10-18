# Nghiên cứu UI mobile: app học tiếng Anh và layout chung (17/10/2026)

Mục đích: danh sách để chủ dự án tự phân tích rồi đưa ra hướng thiết kế mobile mới cho Wordmet. Theo quy tắc Bước 3
(chủ dự án nghĩ trước), file này **chỉ liệt kê và mô tả đánh đổi, không đề xuất phương án**. Mỗi ý có nguồn; ý nào chưa
kiểm chứng được ghi rõ "chưa xác minh".

Đối chiếu nhanh với Wordmet hiện tại (Figma `7HcPAKLrWu32C27qYMJUOA`, mockup v3.1): 4 tab dưới (Hôm nay, Luyện tập, Tra từ,
Cài đặt), nút nổi "Thêm từ", Hôm nay là danh sách nhóm (deck), phiên ôn toàn màn hình nền xanh, thẻ lật bằng chạm, 2 nút
"Cần ôn lại" / "Đã biết", trang từ kiểu từ điển.

---

## A. App học tiếng Anh và từ vựng

| # | App | Điều hướng và màn chính | Cách ôn / thẻ | Điểm đáng xem khi so với Wordmet | Nguồn |
|---|---|---|---|---|---|
| A1 | **Duolingo** | Thanh tab dưới cố định. Màn chính là một "path": các vòng tròn bài học xếp dọc, đi lần lượt, chia theo unit (từ 11/2022 thay cho "tree"). Tab riêng cho Quests, Practice Hub (gói trả phí), leaderboard, profile. Đợt làm lại tab 04/02/2026: tiêu đề căn trái cùng vị trí, ít kiểu chữ hơn, dùng khoảng trắng thay cho khung bao | Bài học ngắn nhiều dạng câu (chọn, gõ, nói); ôn được trộn sẵn vào path | Path dẫn người học từng bước, ít phải tự chọn. Wordmet thì để người học tự chọn nhóm từ | [Path 2022](https://blog.duolingo.com/new-duolingo-home-screen-design), [Core tabs 2026](https://blog.duolingo.com/core-tabs-redesign) |
| A2 | **Anki** (AnkiMobile, AnkiDroid) | Màn đầu là **danh sách deck**, mỗi deck ghi số thẻ New / Learn / Due hôm nay. Chạm deck → màn tổng quan → "Study Now" | Lật thẻ rồi chấm 4 nút Again / Hard / Good / Easy; mỗi nút hiện ngày ôn tiếp theo. Có thể chỉ dùng Again và Good. AnkiDroid 2.23 thêm tùy chọn ẩn Hard/Easy và đưa số thẻ lên toolbar | Gần Wordmet nhất về cấu trúc (deck + lịch ôn). Wordmet có 2 nút và lịch cố định 1/3/7/14/30 | [Anki manual](https://docs.ankiweb.net/studying.html), [AnkiDroid new study screen](https://forums.ankiweb.net/t/new-study-screen-official-thread/67394) |
| A3 | **Quizlet** | Home dạng **feed** gồm "Study Bites" (hoạt động ngắn như Flashcards, Match), thẻ tiến độ, gợi ý nội dung; có ô tìm kiếm ở home. Tên các tab dưới: **chưa xác minh** | Chế độ Flashcards chia thẻ thành "Know" / "Still learning". Có lướt trái/phải hay không: **chưa xác minh** từ nguồn chính thức | Home dạng feed khác hẳn kiểu "danh sách deck" | [Quizlet help: home feed](https://help.quizlet.com/hc/en-au/articles/38999971996301-Navigating-your-home-feed-on-mobile-devices), [App Store](https://apps.apple.com/om/app/quizlet-study-with-flashcards/id546473125?l=ar) |
| A4 | **MochiMochi** (VN) | Màu tươi, có linh vật. Bố cục tab cụ thể: **chưa xác minh** | **5 cấp độ nhớ**; ôn bằng bài kiểm tra nhanh; qua thì lên cấp, quên thì về cấp 1. Nhắc ôn vào "Thời điểm vàng" | Cấp độ giống ý tưởng ngăn Leitner của Wordmet, nhưng Mochi **tự** lên/xuống cấp; Wordmet để người học tự bấm | [mochidemy.com](https://mochidemy.com/en/) |
| A5 | **Drops** | Thanh tab dưới đơn giản; phiên học giới hạn 5 phút | Thẻ có **hình minh họa thay cho bản dịch**; **lướt lên = đã biết, lướt xuống = muốn học**; đọc to từ; rung phản hồi | Thao tác bằng cử chỉ thay cho nút | [DesignRush](https://www.designrush.com/best-designs/apps/drops), [Android Authority](https://cellphoneplans.androidauthority.com/CellPhones/Guides/drops-the-language-learning-app) |
| A6 | **Memrise** (bản mới, cập nhật trang 17/09/2025) | Chia khu: My Lessons (lộ trình), Wordlists theo mục tiêu (du lịch, công việc...), **My Words** (từ điển cá nhân để luyện), My Activities (bảng tổng kết) | Lặp lại ngắt quãng trong My Lessons; video người bản xứ | "My Words" gần với "Từ của tôi" của Wordmet | [Memrise new experience](https://explore.memrise.com/new-experience) |
| A7 | **Busuu** | Có tab **Review**; trong app chọn "Vocabulary" ở thanh trượt phía trên. Tab Learn có nút "Next up" để học tiếp chỗ đang dở (bản làm lại 10/2017) | Ôn trộn từ yếu / vừa / mạnh; iOS có thêm kiểu flashcard và gõ. Review chỉ dành cho gói Premium | Tab ôn riêng, tách khỏi tab học | [Busuu help: review](https://help.busuu.com/hc/en-gb/articles/16941990776593-How-can-I-review-my-vocabulary), [Busuu blog 2017](https://blog.busuu.com/?p=10024) |
| A8 | **LingQ** | Học qua bài đọc | Từ trong bài **tô màu theo trạng thái**: xanh dương = mới, vàng = đang học (cấp 1–4: New, Recognized, Familiar, Learned), không màu = đã biết. Người học tự đổi cấp; cấp quyết định tần suất ôn | Cách hiển thị "mức nhớ" ngay trên chữ, lúc đọc | [LingQ support](https://lingq-support.groovehq.com/help/can-you-explain-a-lingqs-status) |
| A9 | **Brainscape** | Flashcard theo bộ | Sau khi lật thẻ, người học **tự chấm độ tự tin 1–5**; điểm thấp thì thẻ quay lại sớm ("confidence-based repetition") | Người học tự quyết định mức, giống tinh thần Wordmet nhưng thang 5 bậc | [Wikipedia](https://en.wikipedia.org/wiki/Brainscape) |
| A10 | **Vocabulary – Learn words daily** (Monkey Taps) | Mỗi lần **cuộn** hiện một từ; có **widget màn hình khóa** và nhắc nhở tùy chỉnh | Thẻ từ ngắn: nghĩa ở giữa, kèm gợi ý cách dùng. Có lướt hay không: **chưa xác minh** | Học "thụ động" qua widget, không cần mở app | [App Store](https://apps.apple.com/app/id1084540807), [Screensdesign](https://screensdesign.com/showcase/vocabulary-learn-words-daily) |
| A11 | **ELSA Speak** (VN) | Tập trung luyện phát âm. Bố cục home: **chưa xác minh** (có thư viện 159 màn ở Screensdesign) | Không phải flashcard | Nên xem phần onboarding và paywall nếu cần | [Screensdesign ELSA](https://screensdesign.com/apps/elsa-speak-english-learning/) |

Ghi chú: các nguồn bên thứ ba ở A5, A9, A10 là bài review, không phải tài liệu của chính hãng.

---

## B. Các mẫu layout mobile chung

Mỗi mẫu ghi: nó là gì, khi nào hợp, đánh đổi. Wordmet đang dùng mẫu nào thì ghi "(đang dùng)".

### Điều hướng chính

| # | Mẫu | Là gì | Hợp khi | Đánh đổi | Nguồn |
|---|---|---|---|---|---|
| B1 | **Thanh tab dưới** (đang dùng) | 3–5 mục cố định ở đáy, mỗi mục có icon + chữ | App có 3–5 khu dùng thường xuyên | Quá 5 mục thì không vừa. Material: dưới 3 mục thì dùng tab trong trang. Apple: giữ thanh tab hiện khi đổi khu, chỉ để màn modal che | [Material 3](https://m3.material.io/components/navigation-bar/guidelines), [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/tab-bars) |
| B2 | **Tab dưới + nút nổi (FAB)** (đang dùng) | Tab để chuyển khu; một nút nổi cho hành động chính | Có một hành động làm rất thường xuyên (như "Thêm từ") | Material: đặt FAB **bên phải, phía trên** thanh tab, không đè lên thanh | Material 3 (như trên) |
| B3 | **Nút hành động ở giữa thanh tab** (kiểu dấu "+" giữa) | Một ô trong thanh tab mở hành động thay vì mở khu | Muốn hành động chính nằm ngay vùng ngón cái | Apple ghi rõ thanh tab là để **điều hướng, không phải để làm hành động**; hành động nên ở toolbar | Apple HIG (như trên) |
| B4 | **Menu ẩn** (hamburger, ngăn kéo bên) | Gom điều hướng vào một nút mở menu | Nhiều mục, ít dùng | NN/g (2016, 179 người): điều hướng ẩn ít được thấy hơn. Trên mobile, trang có menu ẩn chỉ 44–56% người dùng menu, trang hiện một phần đạt 89%. Nếu có 4–5 mục thì nên để hiện | [NN/g](https://www.nngroup.com/articles/find-navigation-mobile-even-hamburger/) |
| B5 | **Tab trên / segmented control trong trang** | Chuyển giữa các phần **cùng loại** trong một màn (ví dụ "Từ vựng / Ngữ pháp") | Nội dung liên quan nằm trong cùng một khu | Material: tab dưới cho các trang khác nhau, tab trên cho nội dung liên quan trong một trang | Material 3 (như trên); Busuu dùng thanh trượt trên trong tab Review (A7) |
| B6 | **Thanh tab tự thu nhỏ khi cuộn** | Cuộn xuống thì thanh tab gọn lại, cuộn lên hiện lại | Màn có danh sách dài | Material: không ẩn khi đang dùng trình đọc màn hình. Apple (iOS, Liquid Glass): thanh tab nổi trên nội dung, có thể thu nhỏ khi cuộn nếu kèm phụ kiện; có thể có tab tìm kiếm riêng ở cuối thanh | Material 3, Apple HIG (như trên) |

### Cách trình bày nội dung trên màn chính

| # | Mẫu | Là gì | Hợp khi | Đánh đổi | Ví dụ |
|---|---|---|---|---|---|
| B7 | **Danh sách deck kèm số đếm** (đang dùng, dạng nhóm) | Mỗi dòng một bộ thẻ, ghi số thẻ đến hạn | Người học tự chọn bộ để ôn | Người học phải tự quyết định ôn gì | Anki (A2) |
| B8 | **Một thẻ lớn "việc tiếp theo"** | Màn chính nổi bật một việc nên làm ngay, phần còn lại xếp dưới | Muốn giảm số lần phải chọn | Ẩn bớt các lựa chọn khác | Busuu "Next up" (A7); thẻ deck nổi bật trên Hôm nay của Wordmet |
| B9 | **Lộ trình (path)** | Chuỗi bước đi lần lượt | Khóa học có thứ tự sẵn | Không hợp với từ người học tự thêm, vì từ của mỗi người không có thứ tự chung | Duolingo (A1) |
| B10 | **Feed** | Các thẻ hoạt động, tiến độ, gợi ý xếp thành luồng cuộn | Nhiều loại hoạt động ngắn | Khó biết "hôm nay xong chưa" | Quizlet (A3) |
| B11 | **Bảng điều khiển (dashboard)** | Số liệu và tiến độ tổng | Người học thích xem số | Nhiều số dễ rối | Memrise My Activities (A6) |

### Màn làm việc tập trung (ôn thẻ, thêm từ)

| # | Mẫu | Là gì | Hợp khi | Đánh đổi | Nguồn / ví dụ |
|---|---|---|---|---|---|
| B12 | **Màn toàn màn hình (modal)** (đang dùng cho phiên ôn) | Che cả thanh tab, chỉ còn nút thoát | Việc ngắn, cần tập trung, có điểm kết thúc | Apple: đây là ngoại lệ hợp lệ duy nhất để che thanh tab | Apple HIG |
| B13 | **Bottom sheet** (đang dùng cho Thêm từ trên điện thoại) | Tấm trượt lên từ đáy, vẫn thấy một phần màn phía sau | Thao tác ngắn, vài lựa chọn, cần nhìn nội dung phía sau | NN/g (06/2023): không dùng để thay cho chuyển trang, không xếp chồng sheet, không cho nội dung dài; nên có nút X rõ ràng và hỗ trợ nút Back. Nói sheet giúp "dễ với tới" là **phần lớn không đúng** | [NN/g](https://www.nngroup.com/articles/bottom-sheet/) |
| B14 | **Lật thẻ bằng chạm + nút chấm** (đang dùng) | Chạm để lật, rồi bấm nút kết quả | Cần chính xác, ít bấm nhầm | Thêm một bước bấm | Anki 4 nút (A2), Wordmet 2 nút |
| B15 | **Lướt thẻ** (swipe) | Lướt theo một hướng để báo "biết" hay "chưa biết" | Thao tác nhanh, cảm giác như chơi | Dễ lướt nhầm; khó cho người dùng trình đọc màn hình. Material dành cử chỉ lướt cho thẻ hoặc hành động, **không** dùng để chuyển giữa các tab | Drops (A5); [Material 3](https://m3.material.io/components/navigation-bar/guidelines) |
| B16 | **Người học tự chấm thang nhiều bậc** | 3–5 nút hoặc thang tự tin | Muốn lịch ôn sát với mức nhớ | Nhiều nút thì chậm, dễ phân vân; Anki cho ẩn bớt nút | Brainscape 1–5 (A9), Anki 4 nút (A2) |

### Trang từ và tra từ

| # | Mẫu | Là gì | Ví dụ |
|---|---|---|---|
| B17 | **Trang từ kiểu từ điển** (đang dùng) | Một trang cho mỗi từ gốc, chia theo loại từ, mỗi nghĩa một dòng; dạng chia (went, gone) là mục riêng có liên kết về từ gốc | Cambridge Dictionary (đã xem ở buổi brainstorm 16/10) |
| B18 | **Tô màu trạng thái ngay trên chữ** | Từ trong câu hoặc bài đọc mang màu theo mức nhớ | LingQ (A8) |
| B19 | **Từ điển cá nhân** | Một khu riêng chứa từ người học đã lưu | Memrise My Words (A6); "Từ của tôi" của Wordmet hiện là một bộ lọc trong Tra từ |

### Ngoài app

| # | Mẫu | Là gì | Ví dụ |
|---|---|---|---|
| B20 | **Widget, màn hình khóa** | Hiện một từ mỗi ngày ngoài app | Vocabulary (A10) |
| B21 | **Thông báo nhắc ôn** | Nhắc đúng lúc cần ôn | Mochi "Thời điểm vàng" (A4); Wordmet Bước 3 nhắc qua email, push để sau |

### Ràng buộc chung khi thiết kế cho ngón tay

- **Vùng chạm tối thiểu 1 cm × 1 cm** (kích thước thật trên màn) — [NN/g 05/2019](https://www.nngroup.com/articles/touch-target-size/).
- **Nhãn chữ bắt buộc** dưới icon tab, 1–2 từ, không cắt chữ — Material 3; Apple khuyên dùng một từ nếu được.
- **Không tắt hoặc ẩn một tab khi khu đó chưa có nội dung**: giữ tab và giải thích vì sao trống — Apple HIG. (Wordmet đang giữ tab Luyện tập với trang "đang phát triển".)
- **Cách cầm máy** (Hoober, 2013, 780 người đang chạm màn): 49% một tay, 36% nâng một tay chạm tay kia, 15% hai tay. **Lưu ý:** năm 2017 chính tác giả nói hình "vùng ngón cái" trong bài là từ mẫu không chính thức và gây hiểu nhầm. Nghiên cứu sau của ông cho thấy người ta chạm vùng **giữa màn** nhiều hơn, nhanh hơn và chính xác hơn các mép và góc — [UXmatters](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php).

---

## C. Nơi xem ảnh màn hình thật

| Nơi | Có gì | Chi phí |
|---|---|---|
| [Mobbin](https://mobbin.com/) | Thư viện màn, luồng (onboarding, paywall...), mẫu UI của app thật trên mobile và web | Có gói miễn phí nhưng giới hạn; gói trả phí mở đủ thư viện, tìm kiếm, luồng |
| [Screensdesign](https://screensdesign.com/) | Ảnh màn và video từng luồng (Busuu 89 màn, ELSA 159 màn, Vocabulary...) | Xem được phần đầu; phần sau gắn nhãn "Unlock Pro" |
| [Page Flows](https://pageflows.com/) | Video ghi lại luồng người dùng, có chú thích | Trả phí: dùng thử 3 ngày 2,95 USD; 39 USD/quý hoặc 99 USD/năm |
| App Store / Google Play | Ảnh quảng bá của từng app | Miễn phí; ảnh do hãng chọn, không đủ mọi màn |

---

## D. Câu hỏi để bạn tự phân tích (chưa có đề xuất)

1. Màn đầu tiên khi mở app nên là gì: danh sách nhóm (B7), một việc tiếp theo (B8), feed (B10) hay dashboard (B11)?
2. "Thêm từ" nằm ở đâu: nút nổi (B2), ô giữa thanh tab (B3), hay trong tab Tra từ?
3. Bao nhiêu tab, gồm những tab nào? Có giữ tab Luyện tập khi tab đó chưa có nội dung không?
4. Phiên ôn: chạm lật + nút (B14), lướt (B15), hay cả hai? Mấy nút chấm (B16)?
5. Mức nhớ của từ hiện ở đâu: chỉ trong trang nhóm (hộp Leitner), hay cả trên chữ khi đọc (B18)?
6. "Từ của tôi" là bộ lọc trong Tra từ, hay một khu riêng (B19)?
7. Có cần widget màn hình khóa không (B20), hay để Flutter làm sau?

## Chưa xác minh

- Tên các tab dưới của Quizlet, Mochi, ELSA hiện nay.
- Quizlet có dùng lướt trái/phải để chia thẻ hay không.
- App Vocabulary (Monkey Taps) có thao tác lướt hay chỉ cuộn.
- Số liệu Drops (giới hạn miễn phí, giá) không khớp nhau giữa các bài review; không dùng ở đây.

## Nguồn chính đã đọc trong buổi này

Duolingo blog ([2022](https://blog.duolingo.com/new-duolingo-home-screen-design), [2026](https://blog.duolingo.com/core-tabs-redesign));
[Anki manual](https://docs.ankiweb.net/studying.html); [AnkiDroid forum](https://forums.ankiweb.net/t/new-study-screen-official-thread/67394);
[Material 3 navigation bar](https://m3.material.io/components/navigation-bar/guidelines); [Apple HIG tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) (cập nhật 08/06/2026);
[NN/g hidden navigation](https://www.nngroup.com/articles/find-navigation-mobile-even-hamburger/); [NN/g bottom sheet](https://www.nngroup.com/articles/bottom-sheet/);
[NN/g touch target](https://www.nngroup.com/articles/touch-target-size/); [UXmatters, Hoober](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php);
[MochiMochi](https://mochidemy.com/en/); [Memrise](https://explore.memrise.com/new-experience); [Busuu help](https://help.busuu.com/hc/en-gb/articles/16941990776593-How-can-I-review-my-vocabulary);
[LingQ support](https://lingq-support.groovehq.com/help/can-you-explain-a-lingqs-status); [Brainscape (Wikipedia)](https://en.wikipedia.org/wiki/Brainscape);
[Mobbin](https://mobbin.com/); [Page Flows](https://pageflows.com/); [Screensdesign](https://screensdesign.com/).
