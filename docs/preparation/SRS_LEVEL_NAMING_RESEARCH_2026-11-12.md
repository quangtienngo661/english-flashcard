# Cách các app SRS đặt tên và tô màu các giai đoạn nhớ (12/11/2026)

## Tóm tắt (10 dòng)

1. App nào cũng có 5–10 giai đoạn. Tên có hai kiểu: số ("Level 1–5") hoặc tên ẩn dụ (WaniKani: Apprentice → Burned).
2. Không app nào trong nhóm kiểm được gọi giai đoạn là "ngăn/box" trên UI. Brainscape dùng thang tự đánh giá 1–5, MochiMochi dùng "Level 1–5", Clozemaster dùng phần trăm (0/25/50/75/100%).
3. MochiMochi (app Việt) gọi là "5 levels of memorization" (Level 1–5), chỉ Level 3 và 5 có chú thích ngắn hạn/dài hạn. Intervals: 24 giờ, 7 ngày, 1 tháng, 3 tháng, 6 tháng.
4. Clozemaster gần Wordmet nhất: 5 mức, intervals 1/10/30/180 ngày, sai thì về 0%. Wordmet cũng sai thì về mức đầu.
5. WaniKani: sai thì tụt nhiều bậc (không về hẳn đầu). Anki: có "relearning" sau khi sai; "mature" là interval từ 21 ngày.
6. Màu theo từng giai đoạn: không tài liệu chính thức nào trong nhóm kiểm công bố. WaniKani chỉ có màu ở dashboard, nguồn là cộng đồng (hồng, tím, xanh đậm, xanh nhạt), UNVERIFIED về mã màu.
7. Không tìm được nguồn chính thức cho eJOY, Prep (không tìm thấy trang mô tả): UNVERIFIED. Memrise, Duolingo, Quizlet, Busuu, Lingvist chỉ có thông tin một phần (xem bảng).
8. Khuyến nghị: "Cấp 1–5" kèm nhãn interval ("1 ngày", "3 ngày"...) trong tooltip/chi tiết; "Mới" cho cấp 0. Không tên ẩn dụ (khó dịch, đòi người học nhớ thêm một bảng).
9. Màu: ưu tiên đỏ, đến hạn hổ phách, mới xám trung tính, cấp 1→5 xanh lá nhạt→đậm. Ba bậc xanh nhạt nhất không đủ contrast 3:1 trên nền trắng (đo 1,40 / 1,74 / 2,28), nên cần viền hoặc số.
10. Màu không được là kênh duy nhất: mỗi chip và đoạn thanh có chữ hoặc số ("Cấp 3"), không chỉ một ô màu.

---

## 1. Bảng so sánh

"Công bố" = có trong tài liệu chính thức của app. Nguồn cộng đồng được đánh dấu.

| App | Số giai đoạn và tên | Số hay tên | Intervals | Sai thì | Màu theo giai đoạn |
|---|---|---|---|---|---|
| WaniKani | 9 giai đoạn, 5 nhóm: Apprentice 1–4, Guru 1–2, Master, Enlightened, Burned. https://knowledge.wanikani.com/wanikani/srs-stages/ | Tên nhóm + số phụ | Chuẩn: 4 giờ, 8 giờ, 1 ngày, 2 ngày, 1 tuần, 2 tuần, 1 tháng, 4 tháng. Level 1–2 của app có lịch Apprentice nhanh hơn (2 giờ, 4 giờ, 8 giờ, 1 ngày). Cùng nguồn. | Tụt bậc = (số lần sai chia 2, làm tròn lên) x hệ số phạt (2 nếu từ giai đoạn 5 trở lên, 1 nếu dưới), thấp nhất giai đoạn 1. Cùng nguồn. Burned thì ngừng ôn, có thể "unburn" về Apprentice. | Trang knowledge không nói màu. Cộng đồng nói có 4 màu dễ phân biệt: hồng, tím, xanh đậm, xanh nhạt, và chỉ hiện ở dashboard: https://community.wanikani.com/t/color-coding-why-does-pink-mean-both-kanji-and-apprentice/46196 (nguồn cộng đồng, UNVERIFIED mã màu). |
| Anki | Trạng thái: New, Learning, To Review (màn deck). https://docs.ankiweb.net/studying.html. Thống kê còn có Relearning và Mature (interval từ 21 ngày): https://docs.ankiweb.net/stats.html. "Young" không được định nghĩa ở trang này. | Tên, không số | Do deck options (learning steps, FSRS...) quyết định, không cố định. https://docs.ankiweb.net/studying.html | Nút Again; thẻ vào relearning. https://docs.ankiweb.net/stats.html | Trang docs không nêu màu của biểu đồ Card Counts. UNVERIFIED. |
| Brainscape | Thang tự đánh giá 1–5, chỉ nêu rõ 1 = "not at all", 5 = "totally confident". https://www.brainscape.com/academy/confidence-based-repetition-definition | Số | Không có lịch cố định theo ngày; 1–2 quay lại sớm, 4–5 muộn. Cùng nguồn. Một trang academy khác nêu ước lượng 1 = vài phút, 2 = 10+ phút, 3 = vài giờ, 4 = vài ngày (qua kết quả tìm kiếm, chưa mở trang gốc): https://brainscape.com/academy/science-never-forgetting-spaced-repetition | Người học tự chọn lại mức thấp. | Không xác nhận. UNVERIFIED. |
| Bunpro | 12 SRS stage, chia Beginner 1–4, Adept, Seasoned, Expert (có phụ cấp), Master. Qua tìm kiếm trích từ support và community, chưa mở trang gốc: https://community.bunpro.jp/t/statistics-and-intervals/108424 | Tên + số phụ | Hai danh sách khác nhau trong cộng đồng (bản bắt đầu 4 giờ, 8 giờ, 1 ngày...), không xác nhận được bản nào hiện hành. UNVERIFIED. | UNVERIFIED | Không xác nhận. |
| Clozemaster | 5 mức mastery theo %: 0, 25, 50, 75, 100. https://docs.clozemaster.com/article/103-how-do-points-work | Phần trăm | Sau 25%: 1 ngày; sau 50%: 10 ngày; sau 75%: 30 ngày; sau 100%: 180 ngày. Cùng nguồn. | Sai ở bất kỳ mức nào thì về 0%. Cùng nguồn. | Không xác nhận. |
| MochiMochi (app Việt, bản MochiKanji) | "5 levels of memorization", Level 1–5; Level 3 = short-term memory, Level 5 = long-term memory, các mức khác không có tên. https://mochidemy.com/support/?p=29 | Số + 2 chú thích | Level 1: 24 giờ, Level 2: 7 ngày, Level 3: 1 tháng, Level 4: 3 tháng, Level 5: 6 tháng. Đây là thời gian một chữ có thể để không ôn trước khi dễ quên (cách trang mô tả). Cùng nguồn. | Trang khác nói đúng thì lên mức, mức cao xuất hiện ít hơn: https://mochidemy.com/support/?p=3993. Sai thì về đâu: không nêu. UNVERIFIED. | Không nêu màu. |
| Memrise | Trang help có "lịch ôn" nhưng bản fetch bị 403, không đọc được danh sách. https://memrise.zendesk.com/hc/articles/360015889057 | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED. Một bài của bên thứ ba nói tiến độ vẽ bằng các giai đoạn lớn của bông hoa: https://www.fluentu.com/blog/memrise-review/ (không chính thức). |
| Duolingo | Không tìm thấy trang help chính thức giải thích thanh "strength" ở tab Words. Chỉ có wiki fan nói strength theo 4 vạch, đặt về 4 vạch khi luyện: https://duolingo.fandom.com/wiki/Practice?oldid=8799 (wiki fan, có thể lỗi thời, và đánh dấu decay là tính năng đã ngừng). | Thanh/vạch | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| Quizlet | 3 nhóm theo tiến độ: Not Studied, Still Learning, Mastered. https://help.quizlet.com/hc/articles/360048803491 (qua kết quả tìm kiếm). Không tìm thấy trang help nào nêu spaced repetition. | Tên | Không có | Không nêu | Không xác nhận |
| Lingvist | Không có hệ thống level tên; mỗi từ có interval riêng, đúng thì dài ra. https://lingvist.com/blog/spaced-repetition-in-learning/ | Không hiện | Tùy từ | Từ sai nhiều thì lặp thường hơn (theo help). | Không |
| Busuu | Có Vocabulary Trainer với spaced repetition, và nút "Strengthen Vocabulary" cho từ sai. https://www.busuu.com/en/how-to/vocabulary-trainer. Không tìm thấy bảng cấp độ chính thức. | UNVERIFIED | UNVERIFIED | Từ sai được gom lại để luyện | UNVERIFIED |
| Readlang, eJOY, Prep và app Việt khác | Chưa tìm được nguồn chính thức. Readlang không được tra cứu riêng; eJOY và Prep không được tra cứu. | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED |

Một lỗ hổng cần nói rõ: màu theo giai đoạn gần như không có trong tài liệu chính thức. Muốn biết thật thì phải mở app và đo bằng DevTools hoặc ảnh chụp màn hình. Việc đó chưa làm.

## 2. Điều rút ra cho Wordmet

- Ladder 0 / 1 / 3 / 7 / 14 / 30 ngày và "sai về mức 1" gần với Clozemaster (sai về 0%) và MochiMochi (5 level, interval tăng dần). Không cần đổi cơ chế để khớp với thói quen của người học.
- Số 5 mức được dùng ở ba chỗ: Brainscape (thang 1–5), MochiMochi (Level 1–5), Clozemaster (5 bước sau mức 0). Con số 5 không lạ với người học.
- Tên ẩn dụ (WaniKani) đi cùng một chuỗi dài hơn (9 giai đoạn) và cần giải thích. Với 5 mức thì lợi ích nhỏ.
- Chỉ Level 3 và 5 của MochiMochi có chú thích ("ngắn hạn", "dài hạn"). Đây là mẫu đáng tham khảo nếu Wordmet muốn thêm nhãn mà không đặt tên cả sáu mức.

## 3. Ba cách đặt tên cho 6 giai đoạn (mới + 5)

| Phương án | Hiển thị | Ưu | Nhược |
|---|---|---|---|
| A. Cấp số | Mới, Cấp 1, Cấp 2, Cấp 3, Cấp 4, Cấp 5 (tooltip: "ôn lại sau 3 ngày") | Ngắn, không cần dịch thêm, giống MochiMochi ("Level 1–5"); không mâu thuẫn "ưu tiên" và "đến hạn" vì đó là cờ khác | Số không cho biết ý nghĩa; người học có thể tưởng "Cấp 5" là độ khó, không phải độ nhớ |
| B. Nhãn interval (giữ như hiện tại, bỏ chữ "ngăn") | Mới, 1 ngày, 3 ngày, 7 ngày, 14 ngày, 30 ngày | Nói thẳng việc sẽ xảy ra, khớp lịch ôn | Hiểu nhầm: "3 ngày" là "đã học 3 ngày" hay "ôn sau 3 ngày". Chip dài hơn, khó vừa mobile. Gắn chặt vào hằng số `LEVEL_INTERVALS`, đổi ladder là đổi chữ |
| C. Tên tiếng Việt | Mới, Làm quen, Nhớ tạm, Khá chắc, Chắc, Thuộc (ví dụ, UNVERIFIED về cách người học hiểu) | Dễ cảm nhận tiến bộ, không cần số | Phải dịch và dạy bảng tên; thứ bậc giữa "Khá chắc" và "Chắc" không rõ; không dùng được trong tiếng Anh nếu đổi ngôn ngữ UI (cần cặp tên) |

**Khuyến nghị: A kèm interval trong chi tiết.** Chip và thanh hiển thị "Cấp 1…5" và "Mới"; tooltip hoặc dòng phụ hiển thị "ôn lại sau N ngày". Lý do: ngắn, không mơ hồ về nghĩa (cấp càng cao càng chắc), và interval nằm ở một chỗ duy nhất nên đổi ladder không đổi nhãn. Rủi ro: nhãn "Cấp N" không tự giải thích; cần dòng giải thích một lần ở lần đầu hoặc ở phần trợ giúp.

Ghi chú: các từ "Cấp 1–5" cũng có thể bị nhầm với cấp độ từ (A1–C2/CEFR) mà app dùng để lọc từ theo trình độ. Cần kiểm xem trang Học/Ôn có chỗ nào hiện cả hai. Chưa kiểm trong code (nằm ngoài phạm vi nghiên cứu này).

## 4. Gợi ý bảng màu

Ba màu trạng thái và một dải xanh. Hex là đề xuất ban đầu, chưa thử trên giao diện thật. Contrast đo bằng công thức WCAG 2.x trên nền trắng `#FFFFFF`, tính trong session này.

| Vai trò | Màu đề xuất | Contrast với trắng | Dùng cho |
|---|---|---|---|
| Ưu tiên | `#C62828` | 5,62 | Chữ, viền, đoạn thanh |
| Đến hạn | `#B45309` (chữ/viền), nền chip `#FEF3C7` | 5,02 | Chữ, viền; `#F59E0B` làm đoạn thanh chỉ đạt 2,15 nên chỉ dùng với viền/số |
| Mới | `#64748B` | 4,76 | Trung tính |
| Cấp 1 | `#86EFAC` | 1,40 | Đoạn thanh |
| Cấp 2 | `#4ADE80` | 1,74 | Đoạn thanh |
| Cấp 3 | `#22C55E` | 2,28 | Đoạn thanh |
| Cấp 4 | `#16A34A` | 3,30 | Đoạn thanh |
| Cấp 5 | `#15803D` | 5,02 | Đoạn thanh |

## 5. Accessibility

- Màu không được là kênh duy nhất (WCAG 2.x, 1.4.1). Mỗi chip phải có chữ ("Cấp 3", "Đến hạn", "Ưu tiên") và mỗi đoạn thanh có số hoặc nhãn riêng, hoặc tooltip/`aria-label`. Phân biệt đỏ và xanh lá là vấn đề thật với người mù màu đỏ–xanh; hổ phách và xanh lá cũng gần nhau với một số loại mù màu. Chính app WaniKani có người dùng viết script đổi màu vì độ tương phản: https://community.wanikani.com/t/better-contrast-for-colourblindness-colour-change-script/8844 (nguồn cộng đồng).
- Chữ cần 4,5:1; thành phần giao diện và đồ họa cần 3:1 (WCAG 2.x). Theo số đo trên, ba bậc xanh nhạt nhất (Cấp 1–3) không đạt 3:1 trên nền trắng. Hướng xử lý: viền 1 px bằng `#15803D` quanh mỗi đoạn, hoặc chữ số đậm trên đoạn; dải này cũng cần kiểm lại trên nền tối.
- Khoảng cách giữa các bậc xanh liền kề nhỏ nên không nên dựa vào màu để phân biệt Cấp 2 và Cấp 3; số/nhãn gánh việc đó.
- Cần chạy lại kiểm contrast trên nền tối (dark mode của M9) và trên nền chip thật; số liệu trên chỉ tính với nền trắng. UNVERIFIED cho dark mode.

## 6. Chưa xác nhận

- Màu từng giai đoạn của mọi app (không có tài liệu chính thức).
- Toàn bộ eJOY, Prep, Readlang; phần lớn Memrise, Duolingo, Busuu, Bunpro (chỉ có thông tin gián tiếp).
- Trang `docs.wanikani.com` không truy cập được trong session này; dùng `knowledge.wanikani.com`.
- Cách người học Việt hiểu các nhãn ở mục 3 (chưa thử với người dùng).
