# Research: landing cho app học tập, và cách ghép với design system của app Wordmet

Ngày 02/11/2026. Viết sau khi chủ dự án trả lời S1–S3 (survey `LANDING_REDESIGN_SURVEY_2026-11-02.md`): ba mockup đầu "bố cục chưa ổn,
style lộn xộn, không ăn khớp với giao diện đã build", làm lại landing từ đầu, landing phải theo design system của app người học.

Nhãn: **Đ** = đã đọc hoặc xem trong phiên này. **S** = suy luận. Số liệu % từ blog agency là con số tham khảo, không phải nghiên cứu độc lập.

## 1. Sáu landing đã xem trực tiếp (02/11/2026, trình duyệt trong app, bề rộng 800)

| Trang | Màn đầu | Nút chính | Hình sản phẩm | Các phần sau | Dùng chung ngôn ngữ thiết kế với app? |
|---|---|---|---|---|---|
| Duolingo | Một câu "The most fun way to learn…", minh họa nhân vật, không có menu | "GET STARTED" và "I ALREADY HAVE AN ACCOUNT" (2 nút, không gì khác) | Minh họa, mascot | 4 khối chữ + hình xen kẽ: free. fun. effective / backed by science / stay motivated / personalized learning; danh sách khóa | **Có**: cùng font `duolingo-sans`, nút có gờ 3D giống hệt trong app |
| Speak | H1 + một câu + nút "Start Speaking for free", bên phải là ảnh người thật với **thẻ câu kèm bản dịch** | Get Started | Thẻ câu của app đặt lên ảnh, 7 video | "Three steps to spoken fluency", AI, testimonial, FAQ, CTA cuối | Có (font Axiforma, thẻ câu của app) |
| ELSA Speak (vn) | Banner khuyến mãi "Đầu tháng chốt deal", giá gạch | Nâng cấp ngay | Banner giá | Gói, đánh giá, đối tác, tin tức | Không; **ví dụ nên tránh**: màn đầu là khuyến mãi, không nói app làm gì |
| Quizlet | "How do you want to study?" + mô tả + "Sign up for free" | Sign up for free, phụ "I'm a teacher" | Dải thẻ các chế độ học, mỗi thẻ là một mảnh UI thật | 4 khối: Any input / Small habits / Your material / Empower students | Có (thẻ chế độ học lấy từ app) |
| Brilliant | H1 hai dòng, **một bài tương tác ngay giữa màn đầu** | Get started (phụ: I'm a learner / I'm a parent) | Chính bài học, bấm được | Số liệu, "Meet Koji", Effective and trusted, chủ đề | Có (bài tương tác chính là app) |
| Babbel | "Which language do you want to learn?" + nút chọn ngôn ngữ | Start learning | Ô chọn là hành động đầu tiên | Phương pháp, video, magazine, testimonial, FAQ 7 câu, CTA cuối | Một phần |

Điểm chung của các trang mạnh (Đ, S):
1. Màn đầu nói **một kết quả**, có **một nút chính** dẫn thẳng vào đăng ký; nút phụ chỉ là "đã có tài khoản".
2. Hình ở màn đầu là **sản phẩm đang chạy** (thẻ câu, bài tương tác, mảnh UI thật), không phải ảnh minh họa chung chung.
3. Landing **mặc đúng bộ đồ của app**: cùng font, nút, thẻ. Người bấm đăng ký không thấy "đổi sang trang khác". Đây đúng là lỗi chủ dự án nêu ở S1.
4. Phần sau: các khối "một ý + một mảnh sản phẩm", FAQ, rồi một CTA cuối nhắc lại nút chính.
5. Đánh giá của người dùng là đòn bẩy mạnh nhất trong các bài tổng hợp, nhưng Wordmet **không có** người dùng thật, nên thay bằng cho thử sản phẩm ngay trên trang.

## 2. Best practice đọc được (nguồn agency, mức tham khảo)

- Tiêu đề nói kết quả cụ thể người học đạt được, không nói "app thông minh hơn". Một mục tiêu chuyển đổi duy nhất, nhắc lại nút đó dọc trang;
  bớt link phụ (tỉ lệ link/mục tiêu càng gần 1:1 càng tốt). Form càng ít ô càng tốt. Nút ghi rõ hành động ("Bắt đầu học"), không "Gửi".
  Trang chậm trên điện thoại làm giảm chuyển đổi. [learnybox], [neelodigital], [applaunchpage], [elearningindustry]
- Hình sản phẩm đang chạy và demo tương tác làm tốt hơn ảnh stock; bằng chứng xã hội càng cụ thể càng có tác dụng, đặt gần màn đầu, còn lời khen
  chung chung thì gần như không có tác dụng. [saashero], [digitalapplied], [foundrycro]
- Edtech: chứng minh kết quả, cho thấy người học sẽ nhận được gì. [webanatomy], [swipepages]

## 3. Design system của app (nguồn: code `apps/web` và ảnh app 27/10)

| Thành phần | Trong app | Dùng ở landing |
|---|---|---|
| Thanh trên | Nền `navy #1b2444`, cao 64px, logo ô vàng "_ _" + chữ Wordmet, tab bo `0.75rem`, tab đang chọn nền vàng (`TopBar.tsx`) | Header landing là chính thanh này: logo, vài link neo, nút "Đăng nhập" kiểu tab, nút vàng "Đăng ký" |
| Nền trang | `canvas #f1f3fd`, thẻ trắng | Giữ; dải xanh than cho phần cần nhấn |
| Tiêu đề trang | Extrabold, vệt highlight vàng dưới nửa chữ (`PageTitle`, `@utility highlighter`) | Tiêu đề mỗi phần dùng đúng kiểu này. Đây là "chữ ký" của app, thay cho nhãn nhỏ viết hoa |
| Nút | `sticker` vàng + gờ `accent-deep` = **một hành động chính mỗi màn**; `quiet` trắng viền + gờ; `ink`; bo `0.875rem`; cao 40/44px (`Button.tsx`) | Nút "Đăng ký miễn phí" là `sticker`, mọi nút phụ là `quiet` |
| Thẻ | Trắng, viền `border`, bo 1–1.25rem, gờ `shadow-sheet` (`0 .3rem 0 canvas-deep`); thẻ "Hôm nay" nền `hero`, viền đậm; thẻ nhóm có đầu màu (tím nhạt, vàng nhạt, xanh lá nhạt, hồng nhạt) và thanh 6 ngăn | Mảnh sản phẩm dựng lại bằng chính các thẻ này, dữ liệu mẫu |
| Chip | Viên nhỏ: "Ôn tiếp" vàng, "29 thẻ chờ", số đếm | Chỉ dùng làm trạng thái trong mảnh sản phẩm, không đặt trên tiêu đề |
| Chữ | Lexend; h2 `clamp(1.75rem…2.5rem)`; body 1rem; ui 0.875rem | Giữ thang này, thêm một cỡ lớn cho H1 |
| Icon | `lucide-react`, nét đều | Cùng bộ, vẽ inline SVG trong mockup |
| Điện thoại | Thanh tab dưới 4 mục, mục đang chọn là viên vàng | Mảnh "app trên điện thoại" dùng đúng thanh này |
| Tối | `navy-card`, chữ `on-navy` | Landing có chế độ tối sau (chưa trong mockup) |

**Không lấy từ hướng B cũ của landing:** nền xanh `primary` phủ cả Hero, nhãn nhỏ viết hoa trên tiêu đề, ba thẻ màu đánh số 1-2-3, tiêu
đề căn giữa mọi phần. App không dùng những thứ này, và cả hai bộ skill đều tính chúng là "AI slop".

## 4. Bảy cách bố cục (cùng design system), và ba cách được chia

Theo `impeccable` (surface trong thế giới đã có): bảy bố cục xếp theo độ hợp, script `concept-seed --scope surface --mode persuade` chia ba
(seed `f0cfcbd38430f476`, chỉ số 6, 4, 2).

1. Theo chân một từ: từ "borrow" gặp trong câu → thêm → ngăn 1 → luyện → ngăn 30; mỗi phần là một chặng.
2. **Thử trước, đăng ký sau**: màn đầu là một phiên luyện ngắn chạy được (như Brilliant); xong phiên thì hiện thẻ kết quả kèm nút đăng ký.
3. Cửa trước của app: màn đầu là màn "Hôm nay" của app với dữ liệu mẫu, ô đăng ký đặt ở chỗ ô "Thêm từ vừa gặp".
4. **Trưng bày theo bốn tab của app**: Hôm nay, Nhóm, Luyện tập, Tra từ; bấm tab nào thì phần trưng bày đổi theo (như Quizlet).
5. Chọn trình độ trước (như Babbel): A1–C2, chọn xong thấy vài từ của trình độ đó và nút đăng ký.
6. **Một ngày với Wordmet**: buổi sáng ôn thẻ, ban ngày gặp từ và thêm, buổi tối luyện; theo đúng hai tình huống chính trong `PRODUCT.md`.
7. Trả lời câu hỏi của người học: trang xếp theo câu hỏi, mỗi câu trả lời là một mảnh sản phẩm.

Ba mockup làm theo 6 (dẫn đầu), 4 và 2. Không dùng trang chọn của `impeccable`; thay bằng ba trang HTML đầy đủ theo yêu cầu "show 3 trang
mockup" của chủ dự án.

## Nguồn

- [learnybox] https://learnybox.com/en/blog/landing-page-best-practices/
- [neelodigital] https://neelodigital.com/blog/landing-page-best-practices
- [applaunchpage] https://www.applaunchpage.com/blog/optimize-app-landing-page-higher-conversions
- [elearningindustry] https://elearningindustry.com/high-converting-course-landing-page-the-ultimate-guide-and-examples
- [saashero] https://www.saashero.net/content/b2b-saas-landing-page-examples/
- [digitalapplied] https://www.digitalapplied.com/blog/landing-page-conversion-study-2000-pages-tested-2026
- [foundrycro] https://foundrycro.com/blog/landing-page-social-proof-benchmarks-2026/
- [webanatomy] https://www.webanatomy.ai/best-landing-pages/edtech
- [swipepages] https://swipepages.com/blog/11-best-education-landing-page-examples-of-2026/
- Trang đã xem: duolingo.com, speak.com, vn.elsaspeak.com, quizlet.com, brilliant.org, babbel.com

## 5. Giọng văn tiếng Việt (bổ sung 03/11/2026)

Chủ dự án thấy chữ ở mockup 5 "chưa chuyên nghiệp" nhưng độ dài đã ổn. Đã đọc chữ trên trang tiếng Việt của PREP (trang chủ và bài ra mắt
Prep Vocab), ELSA Speak (vn), MoMo, Monkey (Đ, 03/11/2026). Duolingo và Quizlet trả bản tiếng Anh từ trình duyệt này nên không dùng được.

Cách các trang này viết (Đ):
- Tiêu đề tính năng là cụm danh từ, gọn và có chủ thể rõ: "Lộ trình toàn diện", "Kho truyện tương tác", "Quản lý chi tiêu đơn giản",
  "Từ điển ngữ cảnh & chi tiết từ", "Thiết kế lộ trình học cá nhân hóa".
- Dùng từ Hán Việt phổ thông cho giọng trang trọng vừa phải: ghi nhớ, vận dụng, tra cứu, biên soạn, tối ưu, theo dõi tiến bộ, cá nhân hóa.
- Câu mô tả theo mẫu "[sản phẩm] giúp bạn …" hoặc động từ đứng đầu ("Hiển thị rõ…", "Phân tích…").
- Không dùng khẩu ngữ: "lo", "thì", "mới", "nhé", "giờ", "luôn".

Nên tránh (ELSA là ví dụ ngược): chữ in hoa để nhấn, "độc quyền", "top thế giới", "chuẩn như người bản ngữ", giá gạch, mã giảm giá.
Những câu này là lời hứa không chứng minh được, trái với `PRODUCT.md` ("không phóng đại").

**Rủi ro định vị (Đ):** Prep Vocab, ứng dụng từ vựng của PREP, đang dùng đúng thông điệp "Học đến khi dùng được, không chỉ để nhớ".
Tiêu đề "nhớ lâu và dùng được" của Wordmet rất gần câu này. Điểm Wordmet khác (S): câu luyện lấy từ chính câu người học đã gặp, AI chỉ
soạn câu còn đáp án chấm theo quy tắc, và lịch 6 ngăn.
