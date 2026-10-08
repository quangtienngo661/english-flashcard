# Landing page: context và research

Ngày: 07/10/2026. Trạng thái: **tài liệu đầu vào**, chưa phải design doc. Theo luật của repo, chưa viết code
hay scaffold cho landing page cho tới khi có design doc và plan được duyệt. File này là đầu vào cho bước
`brainstorming` đó.

**Cách đọc nhãn:** **Chốt** = chủ dự án nêu rõ. **Đề xuất** = trợ lý đề xuất, chưa được chọn. `ASSUMPTION` =
chưa xác minh. **Mở** = chưa quyết định.

## 1. Quyết định đã chốt (07/10/2026)

| # | Câu hỏi | Chốt |
| --- | --- | --- |
| L1 | Việc chính của trang | **Giới thiệu và tập trung vào sản phẩm.** Trang là cửa vào lâu dài của sản phẩm trên production, không phải trang waitlist tạm thời hay trang viết riêng cho chương trình Claude for Startups |
| L2 | Ngôn ngữ | **Đổi được giữa tiếng Anh và tiếng Việt** |
| L3 | Đối tượng trang nói tới | **Người tự học từ vựng nói chung** (không thu hẹp về sinh viên hay người luyện thi) |
| L4 | Tên sản phẩm và domain | **Wordmet** (chốt 08/10). Ngày 08/10 tra RDAP thì `wordmet.com` và `wordmet.app` đều chưa có chủ, phải tra lại trước khi mua. Rủi ro đã biết: người Việt có thể đọc *met* thành "mệt". Chưa tra nhãn hiệu |
| L5 | Chống ghi đè cookie giữa `app.` và `admin.` (08/10) | **Tách host:** `admin.` gọi `admin-api.<domain>` (xem 10.2) |
| L6 | Email (08/10) | **Tạm chấp nhận:** Resend để gửi và lưu danh sách, Cloudflare Email Routing để nhận (xem 10.6) |

Hệ quả của L3: đối tượng rộng thì dễ bị so ngay với Duolingo, Quizlet và ChatGPT miễn phí. Trang phải dựa vào
điểm khác biệt cụ thể (mục 3) thay vì lời hứa chung kiểu "học tiếng Anh hiệu quả".

## 2. Sản phẩm được phép nói gì

Nguồn là các quyết định V1 đã chốt (K# trong [DECISIONS_2026-10-04.md](../specs/DECISIONS_2026-10-04.md),
bảng V1 trong [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)). Trang chỉ được nói những gì V1 có. Phần nào chưa
chạy lúc trang lên production thì phải ghi "sắp có" hoặc bỏ đi.

### Có trong V1

| Tính năng | Diễn đạt cho người dùng | Nguồn |
| --- | --- | --- |
| Thêm nhanh từ gặp phải, kèm câu chứa từ | "Gặp từ mới ở đâu, lưu ngay, kèm câu bạn đã đọc" | K19 (web trước) |
| Câu của người học thành bài điền từ, chấm bằng rule, **có ở gói Free** | "Câu bạn gặp trở thành bài luyện của chính bạn" | K23 |
| Kho từ theo level A1–C2 và chủ đề, nghĩa tiếng Việt, có ví dụ | "Hoặc chọn từ kho từ theo trình độ và chủ đề" | PROJECT_CONTEXT, K10 |
| Flashcard ba trạng thái do người học chọn (chưa học, cần ôn tập, đã biết) | "Tự đánh dấu từ nào đã thuộc" | PROJECT_CONTEXT |
| Bài không AI: trắc nghiệm, đúng/sai, gõ từ theo nghĩa | "Luyện miễn phí với nhiều dạng bài" | PROJECT_CONTEXT, K15 |
| Lịch ôn tự động, làm sai thì từ quay lại sớm hơn | "Từ nào hay sai sẽ quay lại sớm hơn" | K21, K22 |
| Phiên luyện ưu tiên từ yếu, có danh sách "từ hay sai" | "Biết rõ mình đang yếu từ nào" | K24 |
| AI tạo bài điền từ, kèm **giải thích vì sao dùng từ đó** và **bản dịch cả câu** (trial 14 ngày và Pro) | "Câu mới cho đúng từ bạn đang học, có giải thích và bản dịch" | PROJECT_CONTEXT |
| Giao diện và ngôn ngữ giải thích tiếng Việt hoặc tiếng Anh | Khớp với L2 | K4 |
| Đăng nhập email hoặc Google | Chỉ ghi ở nút đăng ký | PROJECT_CONTEXT |

### Không được nói (V1 không có)

- **Nhắc học** bằng email hoặc push (K25). Không viết "nhắc bạn ôn đúng lúc", mà viết "xếp lịch ôn".
- AI nhận xét hoặc sửa câu người học tự viết; bài tự viết câu (V1.5).
- Chatbot hoặc gia sư AI, RAG, "AI nhớ lỗi của bạn" (V1.5, có điều kiện).
- Phát âm, nói, nghe; phrasal verb, collocation, idiom.
- App mobile, cho tới khi app thật sự lên store (K19 làm web trước).
- Số người dùng, đánh giá sao, cam kết kết quả học ("nhớ gấp 3 lần"…): chưa có dữ liệu.
- Tên nhà cung cấp AI: chưa chọn ([module-spec-ai-integration.md](../specs/module-spec-ai-integration.md)).
- Giá Pro và số lượt AI: chưa chốt (K18).

## 3. Định vị (đề xuất)

**Đối thủ người đọc sẽ nghĩ tới ngay:**

| Đối thủ | Họ làm tốt | Khoảng trống [TÊN] lấp được |
| --- | --- | --- |
| Clozemaster | Bài điền từ trong câu thật, có ôn lặp lại, 50+ ngôn ngữ | Câu lấy từ kho chung. Không luyện được từ **bạn** vừa gặp, trong câu **bạn** đã đọc |
| Quizlet, Anki | Flashcard, ôn lặp lại | Chủ yếu kiểm tra nghĩa, ít luyện cách dùng từ trong câu |
| Duolingo | Học theo lộ trình, thói quen hằng ngày | Lộ trình cố định, không xoay quanh từ của riêng bạn |
| ChatGPT miễn phí | Giải thích, đặt câu ví dụ theo yêu cầu | Không nhớ bạn đã lưu từ gì, sai từ nào, khi nào cần ôn |

Lưu ý từ survey: 5/6 người trả lời câu mở cho rằng AI miễn phí đã đủ
([SURVEY_ANALYSIS_2026-09-30.md](SURVEY_ANALYSIS_2026-09-30.md)). Câu "sao không dùng ChatGPT?" phải được trả
lời trên trang, ở phần FAQ.

**Câu định vị (đề xuất):** Với người tự học tiếng Anh hay gặp từ mới khi đọc và xem nhưng học xong lại quên,
[TÊN] là sổ từ vựng biến chính những câu họ gặp thành bài luyện, rồi tự xếp lịch ôn theo những từ họ hay sai.
Khác với flashcard thông thường, người học luyện **cách dùng** từ trong câu, không chỉ nhớ nghĩa.

## 4. Research: điều gì làm landing page hiệu quả

### Nguyên tắc có nguồn tin cậy

1. **Người đọc quyết định ở lại hay rời trang trong khoảng 10 giây đầu.** NN/g, dựa trên nghiên cứu của
   Microsoft Research (2010, 205.873 trang): khả năng rời trang cao nhất ở 10 giây đầu; người ở lại 30 giây
   thường ở lại vài phút. NN/g kết luận phải nói rõ giá trị sản phẩm trong 10 giây.
   → Hero phải trả lời ngay: cái này là gì, cho ai, khác gì.
2. **Người đọc lướt, không đọc từng chữ.** Theo nghiên cứu của NN/g được trích lại, 79% người thử lướt trang
   mới, 16% đọc từng chữ. Nguồn thứ cấp, chưa đọc bài gốc. → Mỗi section cần tiêu đề nói được ý chính, đoạn
   văn ngắn.
3. **Kết quả cụ thể thắng mô tả quy trình.** Bài phân tích trang Babbel chê hero nói "do chuyên gia thiết kế"
   (cách làm) mà không nói người học đạt được gì. Bài về Drops chê hero bỏ mất hai điểm khác biệt thật (học
   qua hình, 5 phút mỗi ngày). Nguồn: landingdoctors.com, ý kiến bên thứ ba.
   → Đưa điểm khác biệt của [TÊN] lên hero, đừng để ở dưới.
4. **Nút bấm phải nói rõ bấm vào thì có gì.** Cũng bài về Babbel: "Start learning" gây băn khoăn có phải trả
   tiền không; họ đề xuất kiểu "Thử bài đầu miễn phí, không cần thẻ". → Ghi rõ "miễn phí" và việc xảy ra sau
   khi bấm.
5. **Khi chưa có người dùng, đừng giả bằng chứng.** Các bài tổng hợp trang pre-launch gợi ý bằng chứng không
   cần sản phẩm đã chạy: câu chuyện founder, số người đăng ký thật. Nguồn: getlaunchlist.com, thứ cấp.
   → Dùng phần founder và một bài luyện mẫu thay cho testimonial.

Các con số kiểu "headline tăng conversion 3 lần", "trung bình 2,35%" xuất hiện nhiều trong blog nhưng không
dẫn nguồn gốc, nên **không dùng** làm căn cứ.

### Trang tham khảo

| Trang | Cách đọc | Đáng học | Không nên chép |
| --- | --- | --- | --- |
| [Clozemaster](https://www.clozemaster.com/) | Đọc trực tiếp 07/10 | Hero ngắn ("Get fluent faster.") + **một bài điền từ mẫu ngay trong hero**. "Why it works" bốn thẻ, "How it works" ba bước, testimonial, CTA nhắc lại ở cuối. Nói thẳng "Free to play" | Testimonial từ store (chưa có). Lời hứa "fastest way" (không chứng minh được) |
| [Speak](https://www.speak.com/) | Qua bản tóm tắt WebFetch | Ba bước Learn, Practice, Apply có ảnh màn hình. Phần "Built by experts, powered by AI" giải thích AI làm gì. FAQ có câu so sánh với Duolingo và chatbot | Giải thưởng, "15M+ downloads" (chưa có) |
| [ELSA Speak VN](https://vn.elsaspeak.com/) | Đọc trực tiếp 07/10 | Viết tiếng Việt gần gũi. Nêu cụ thể AI làm gì (chấm 5 yếu tố). Có câu chuyện founder | Trang quá dày: banner khuyến mãi, bảng giá, blog lặp. Dồn nhiều số liệu tự công bố. Không hợp giai đoạn của [TÊN] |
| Babbel, Drops (qua bài phân tích) | landingdoctors.com | Bài học ở nguyên tắc 3–4 phía trên | — |
| [Quizlet](https://quizlet.com/) | Đọc trực tiếp 08/10 | Ba khối "Start strong / Stay on track / Finish strong" xoay quanh "your own material", rất gần ý "từ của bạn". Mỗi khối một tiêu đề ngắn và một câu giải thích | Phần dành cho giáo viên (không phải đối tượng) |
| [Duolingo](https://www.duolingo.com/) | Đọc trực tiếp 08/10 | Khẩu hiệu ba chữ ("free. fun. effective."), các khối lợi ích ngắn ("backed by science", "stay motivated", "personalized learning") | Nhắc học bằng mascot (V1 không có nhắc học, K25) |
| [Lingvist](https://lingvist.com/) | Đọc trực tiếp 08/10 | Chọn ngôn ngữ ngay đầu trang, trích nhiều đánh giá của người dùng, có khối số liệu | Testimonial và số liệu (chưa có) |

**Mockup v1 (08/10):** dựng trên Figma theo cấu trúc mục 5, bản tiếng Việt, desktop 1440px:
https://www.figma.com/design/NVyO0njIAcOUTAl85a1Xdx. Đây là bản để thảo luận, chưa chốt.

## 5. Cấu trúc trang (đề xuất)

Một trang chính, hai ngôn ngữ, cùng cấu trúc. Phần chữ dưới đây là bản nháp để thảo luận, chưa chốt.

**0. Thanh trên cùng:** logo `[TÊN]`, nút đổi ngôn ngữ VI/EN, "Đăng nhập", nút chính. Không thêm menu khác.

**1. Hero.** Mục tiêu: trả lời "là gì, cho ai, khác gì" trong 10 giây.

- VI: **"Học những từ bạn thật sự gặp."**
  Phụ đề: "Lưu từ mới kèm câu bạn vừa đọc. [TÊN] biến câu đó thành bài điền từ và xếp lịch ôn cho bạn. Từ nào
  hay sai sẽ quay lại sớm hơn."
- EN: **"Learn the words you actually meet."**
  Sub: "Save a new word with the sentence you found it in. [TÊN] turns it into fill-in-the-blank practice and
  schedules your reviews. Words you miss come back sooner."
- Bên cạnh: **một bài điền từ mẫu bấm thử được** (học Clozemaster), ví dụ câu có `deploy` bị che, 4 lựa chọn,
  bấm xong hiện đúng/sai, giải thích và bản dịch. Bài mẫu viết sẵn, không cần backend.
- Nút: xem mục 6.

**2. Vấn đề.** Ngắn, 2–3 câu. Ví dụ: "Bạn gặp từ hay khi đọc bài, lưu vào ghi chú, rồi quên. Flashcard giúp
nhớ nghĩa, nhưng đến lúc cần dùng lại không biết đặt vào câu thế nào." Đây là giả thuyết, chưa được kiểm chứng
bằng phỏng vấn (PRODUCT_DISCOVERY mục 2 còn trống).

**3. Cách hoạt động (ba bước):**

1. **Lưu từ:** thêm nhanh từ bạn gặp kèm câu, hoặc chọn từ kho theo trình độ A1–C2 và chủ đề.
2. **Luyện trong câu:** điền từ vào chính câu bạn gặp, trắc nghiệm, gõ từ theo nghĩa.
3. **Ôn đúng lúc:** lịch ôn tự động, từ sai quay lại sớm hơn, xem danh sách "từ hay sai".

Mỗi bước có ảnh màn hình. Hiện chưa có giao diện, nên chỗ này để trống cho tới khi `apps/web` có màn thật.
Ảnh mockup chỉ dùng nếu ghi rõ là bản thiết kế.

**4. AI giúp gì.** Nói cụ thể, không nói chung chung: "AI viết câu mới cho đúng từ bạn đang học, kèm giải thích
vì sao từ đó hợp câu và bản dịch tiếng Việt. Đáp án được chấm bằng quy tắc, nộp bài không tốn lượt AI." Ghi rõ
AI có ở bản dùng thử 14 ngày và Pro. Nếu sau này chọn Claude làm provider thì thêm một dòng nêu tên; trước đó
không nêu.

**5. Miễn phí và nâng cấp.** Chỉ hai ý cho tới khi chốt giá (K18): "Miễn phí: lưu từ, flashcard, lịch ôn, bài
luyện không AI." và "Dùng thử AI 14 ngày, tự bật khi cần." Không đưa bảng giá.

**6. Người làm ra [TÊN].** Thay cho testimonial khi chưa có người dùng: 2–3 câu về founder làm một mình, vì sao
làm sản phẩm này, cách liên hệ. Có thể bỏ nếu bạn không muốn nêu tên. **Mở.**

**7. FAQ (4–6 câu):** Có miễn phí không? Khác Quizlet/Anki ở đâu? **Sao không dùng ChatGPT?** Có app điện thoại
không (trả lời trung thực: web trước)? Dữ liệu và câu tôi lưu có bị chia sẻ không (câu riêng không vào kho
chung, N4/K23)?

**8. CTA cuối trang:** nhắc lại nút chính.

**9. Footer:** liên hệ, Chính sách bảo mật, Điều khoản, đổi ngôn ngữ.

## 6. Nút chính theo giai đoạn (đề xuất)

Vì trang lên production và dùng lâu dài (L1), nút chính đổi theo trạng thái sản phẩm. Phần còn lại của trang
giữ nguyên.

| Giai đoạn | Nút chính | Sau khi bấm |
| --- | --- | --- |
| Trước khi app mở | "Nhận thông báo khi mở" / "Get notified at launch" | Ô nhập email. Cần đồng ý chính sách bảo mật (mục 8) |
| Pilot (10–30 người) | "Đăng ký dùng thử sớm" / "Request early access" | Form ngắn hoặc mời qua email |
| Mở công khai | "Bắt đầu miễn phí" / "Start free" | Trang đăng ký của app |

## 7. Đổi ngôn ngữ (L2)

- Hai ngôn ngữ có cùng nội dung và cùng cấu trúc. Không để bản nào thiếu section.
- **Đề xuất:** mỗi ngôn ngữ một URL riêng (ví dụ `/vi`, `/en`) để chia sẻ link đúng ngôn ngữ. Đây là cách làm
  phổ biến, chưa kiểm tra tài liệu Next.js trong phiên này.
- **Mở:** ngôn ngữ mặc định khi lần đầu vào trang. Phân tích và đề xuất ở 10.3 (chọn theo vị trí, chỉ tại `/`).
- App đã chốt hỏi tiếng mẹ đẻ khi thiết lập (K4). Landing page có thể truyền ngôn ngữ đang chọn sang app làm
  gợi ý. **Đề xuất,** chưa thiết kế.

## 8. Pháp lý tối thiểu

Ngay khi trang thu email (giai đoạn đầu tiên ở mục 6) là đã xử lý dữ liệu cá nhân. Luật Bảo vệ dữ liệu cá nhân
2025 (Luật số 91/2025/QH15) và Nghị định 356/2025/NĐ-CP có hiệu lực từ 01/01/2026, thay Nghị định 13/2023.
Người dùng có quyền được biết, đồng ý hoặc rút lại đồng ý, và yêu cầu xóa. Nguồn: luatvietnam.vn, lsvn.vn (thứ
cấp). Chưa đọc văn bản gốc, không phải tư vấn pháp lý.
→ Tối thiểu cần: trang Chính sách bảo mật nói thu gì, để làm gì, xóa thế nào; ô đồng ý cạnh form email; cách
yêu cầu xóa.

## 9. Liên quan tới Claude for Startups

Không phải mục tiêu chính (L1), nhưng trang theo cấu trúc trên đã đủ để người duyệt trả lời ba câu: làm gì,
cho ai, AI đóng vai trò gì. Điều kiện chính thức chỉ là email cùng domain với website
([claude.com/programs/startups](https://claude.com/programs/startups), đọc 07/10). Chương trình không có hạn chót
nộp; credits hết hạn sau 6 tháng. Vì vậy nên nộp gần Bước 6.

## 10. Còn mở: phân tích và đề xuất (08/10/2026)

Tất cả mục dưới đây là **đề xuất**, chưa chốt. Bản 07/10 ghi "mọi công cụ đo đều kéo theo cookie banner". Câu
đó **sai**: có công cụ đo không dùng cookie (xem 10.5).

Ràng buộc đã có sẵn: Bước 1 chốt **web và API cùng tên miền gốc** (D13 trong
[design Bước 1](../superpowers/specs/2026-10-07-buoc-1-identity-core-design.md)), vì cookie refresh token dùng
`SameSite=Strict`. Mọi phương án domain bên dưới đều phải giữ điều này.

### 10.1 Tên sản phẩm và domain

| Phương án đuôi domain | Giá đăng ký / gia hạn mỗi năm | Ghi chú |
| --- | --- | --- |
| ✅ `.com` | US$10,46 / 10,46 | Quen thuộc nhất, gia hạn không tăng giá |
| `.app` | US$8,20 / 14,20 | Rẻ năm đầu, gia hạn đắt hơn `.com` |
| `.dev` | US$12,20 / 12,20 | Gợi cảm giác công cụ cho lập trình viên, lệch đối tượng |
| `.ai` | US$80 / 80 | Gấp khoảng 8 lần `.com`, chưa có lợi gì ở giai đoạn này |
| `.vn` | Không có trên Cloudflare | Phải mua qua nhà đăng ký Việt Nam. Thủ tục chưa kiểm tra (`ASSUMPTION`) |

Giá là giá Cloudflare Registrar (không cộng phí, chỉ thu phí registry và ICANN theo trang chính thức). Bảng số
lấy từ cfdomainpricing.com, trang bên thứ ba, dữ liệu ngày 07/10/2026.

**Quy trình đề xuất:** liệt kê 10–20 tên → loại tên khó đọc với người Việt hoặc người nói tiếng Anh → tìm trên
App Store và Google Play, loại tên trùng hoặc gần trùng app học ngôn ngữ → tra nhãn hiệu tại Cục Sở hữu trí tuệ
(chưa kiểm tra cách tra, `ASSUMPTION`) → tìm `.com` còn trống.

**Đề xuất:** `.com`, mua qua Cloudflare Registrar. Lý do: DNS, nhận email (10.6) và công cụ đo (10.5) nằm chung
một chỗ, miễn phí. Bố cục subdomain xem 10.2.

**Domain miễn phí (bổ sung 08/10).** Cách duy nhất tìm được là **GitHub Student Developer Pack**, chỉ dành cho
sinh viên đã được GitHub Education xác minh. Pack có ba ưu đãi về domain:

| Nhà cung cấp | Được gì (theo trang của pack, 08/10) | Gia hạn sau năm đầu |
| --- | --- | --- |
| Namecheap | "1 year domain name registration on the .me TLD" | Chưa kiểm tra (`ASSUMPTION`) |
| Name.com | Một domain miễn phí, chọn trong hơn 25 đuôi (ví dụ `.app`, `.dev`, `.live`, `.studio`, `.software`). Pack không ghi thời hạn | Trên Cloudflare, `.app` US$14,20 và `.dev` US$12,20. Giá gia hạn tại Name.com chưa kiểm tra |
| .TECH | "One standard .TECH domain free for 1 year" | Chưa kiểm tra (`ASSUMPTION`) |

Lưu ý:
- Miễn phí chỉ ở **năm đầu**. Từ năm thứ hai trả giá gia hạn, nên tiết kiệm thật chỉ khoảng một năm phí.
- Ưu đãi gắn với **đuôi do nhà cung cấp chọn**, không có `.com`. Đổi đuôi sau này đồng nghĩa đổi tên miền và email
  của sản phẩm, rất tốn công. Vì vậy chọn đuôi theo thương hiệu trước, xét ưu đãi sau.
- Không tìm thấy nguồn đáng tin nào cho `.com` miễn phí. Subdomain miễn phí (dạng `ten.mien-mien-phi.org`) không
  phù hợp làm thương hiệu sản phẩm và chưa được kiểm tra.

**Chủ dự án là sinh viên (08/10)**, nên đường miễn phí dùng được sau khi GitHub Education xác minh. So chi phí 3
năm, chỉ tính giá Cloudflare: `.app` miễn phí năm đầu rồi 2 × US$14,20 = US$28,40, còn `.com` là 3 × US$10,46 =
US$31,38. Gần bằng nhau, nên **chọn theo tên nào còn trống**: `.com` trống thì lấy `.com`, không thì `.app` qua
ưu đãi Name.com.

**Đề xuất cập nhật (bản trước):** nếu bạn đủ điều kiện GitHub Education *và* một tên `.app` hoặc `.dev` hợp thương hiệu thì lấy
miễn phí qua Name.com, rồi có thể chuyển sang Cloudflare để gia hạn theo giá gốc. Thời hạn khóa chuyển nhà đăng ký
sau khi mua chưa kiểm tra. Nếu không thì mua `.com` qua Cloudflare, khoảng US$10,46/năm.

#### Ứng viên tên (08/10)

Cách kiểm tra domain: RDAP, tức API tra cứu chính thức của nhà quản lý đuôi (Verisign cho `.com`, Google Registry
cho `.app`). Đã thử công cụ trước khi dùng: `google.com` và `google.app` trả 200 (có chủ), tên ngẫu nhiên trả 404
(chưa có chủ). 404 nghĩa là chưa ai đăng ký. Nó **không** đảm bảo giá thường, vì tên có thể bị registry giữ lại
hoặc xếp loại premium. Phải xem giá ở trang đăng ký.

Đã tra khoảng 70 tên. Gần như mọi `.com` dạng ghép từ tiếng Anh đều đã có chủ. Còn lại:

| Tên | `.com` | `.app` | Trùng sản phẩm (tìm web 08/10) | Nhận xét |
| --- | --- | --- | --- | --- |
| **Gapword** | Có chủ từ 2021, trang trống | Trống | Không thấy app cùng tên. Gần tên: game "WordGap" (Windows, 2012), game "Word Gaps – Ô Trống Tiếng Anh" (iPad) | Chơi chữ hai thứ tiếng: tiếng Anh *gap* là chỗ trống trong bài điền từ, tiếng Việt *gặp* là "từ bạn gặp". Đúng cả hai điểm khác biệt của sản phẩm |
| Vocagap | Trống | Có chủ | Không thấy | "Voca" gợi nhớ VOCA.VN, một nền tảng học tiếng Anh lớn cho người Việt, dễ bị nhầm |
| Wordmet | Trống | Trống | Không thấy | Người Việt dễ đọc *met* thành "mệt". Tiếng Anh "word met" không tự nhiên |
| Seenword | Trống | Trống | **Gần trùng** SeeWord (app từ vựng AI cho trẻ em) | Loại |
| Wordmint | Có chủ | Trống | **Trùng** wordmint.com (công cụ làm câu đố cho giáo viên) | Loại |

Chưa kiểm tra nhãn hiệu tại Cục Sở hữu trí tuệ và chưa tra trực tiếp App Store hay Google Play. Phải làm trước khi
mua domain.

### 10.2 Landing nằm trong `apps/web` hay là site riêng

| Phương án | Được | Mất |
| --- | --- | --- |
| ✅ **A. Trong `apps/web` (Next.js), dựng `apps/web` ngay bây giờ chỉ với landing page** | Một codebase. Phần đổi ngôn ngữ Anh–Việt dùng chung với app (app cũng phải có hai ngôn ngữ theo K4). Lần `deploy` production đầu tiên rủi ro thấp: domain, DNS, hosting và CI deploy được dựng sẵn trước Bước 3 | Landing và app chung một lần build: app build lỗi thì không cập nhật được landing. Phải dựng `apps/web` sớm hơn kế hoạch |
| B. Site riêng (`apps/landing`), app ở `app.<domain>` | Deploy độc lập, làm được ngay | Hai codebase, phần ngôn ngữ và giao diện làm hai lần |
| C. Công cụ dựng web (Framer, Webflow…) | Nhanh nhất, không code | Phí thuê bao, nằm ngoài repo, không đạt mục tiêu đưa hạ tầng của sản phẩm lên production |

Next.js App Router hỗ trợ đa ngôn ngữ bằng thư mục `app/[lang]` và `generateStaticParams` để dựng sẵn trang
cho từng ngôn ngữ (tài liệu Next.js qua context7, 08/10).

**Đề xuất: A.** Landing không cần backend, trừ form đăng ký (xem 10.6). Lưu ý: dựng `apps/web` là việc code nên
vẫn cần design doc và plan được duyệt. Landing cũng nằm ngoài thứ tự Bước 0–8, nên bạn cần chốt chạy song song
hay chen vào trước Bước 2.

**Bố cục subdomain (chủ dự án hỏi 08/10):**

```
<domain>         landing page
app.<domain>     web app cho người học
admin.<domain>   trang quản trị (admin, editor)
api.<domain>     API NestJS
```

Bố cục này **đạt D13**. Cả bốn host chung một tên miền gốc, nên trình duyệt coi là "cùng site" và vẫn gửi cookie
refresh token `SameSite=Strict` (đặt trên `api.<domain>`) khi `app.` hoặc `admin.` gọi API. Cần làm thêm khi
deploy: `CORS_ORIGINS` phải liệt kê cả `https://app.<domain>` và `https://admin.<domain>`.

Cách phục vụ:
- `<domain>` và `app.<domain>` từ cùng `apps/web`. Next.js chọn trang theo host bằng `rewrites` với điều kiện
  `has: [{ type: 'host', … }]` (tài liệu Next.js qua context7, 08/10).
- **Đề xuất:** `admin.<domain>` là một app riêng (`apps/admin`), dựng khi tới giao diện soạn nội dung. Theo K1,
  giao diện admin làm sau. Được: code quản trị không bao giờ nằm trong bundle tải về máy người học, và dễ thêm
  một lớp chặn truy cập riêng. Mất: thêm một project để build và deploy.

Rủi ro cần ghi vào design (When → Then):
- **When** cùng một trình duyệt đăng nhập tài khoản A ở `app.` rồi tài khoản B ở `admin.`, **then** cookie
  refresh của B ghi đè cookie của A, vì chỉ có một cookie `refresh_token` trên `api.<domain>` với
  `Path=/v1/auth`. Lần gia hạn kế tiếp, tab `app.` sẽ nhận phiên của B. Cách tránh đơn giản nhất: staff dùng chính
  tài khoản của mình cho cả hai, vì role nằm trên user (Bước 1). Nếu cần tách tài khoản thì phải đổi tên hoặc path
  cookie theo client. Đây là thay đổi API, phải quyết riêng.
- **When** đã đăng nhập ở `app.`, **then** `admin.` gọi refresh cũng được cấp phiên mà không cần đăng nhập lại,
  vì cùng cookie. Tiện, nhưng cũng có nghĩa là trang admin không có lớp xác thực riêng.

#### Giải pháp chống ghi đè cookie giữa `app.` và `admin.` (phân tích 08/10)

Chủ dự án ghi chú: quyền vẫn được kiểm ở server (`@RequirePermission`), nên ghi đè cookie **không làm lộ quyền**.
Vấn đề là tab `app.` âm thầm chạy dưới tài khoản khác. Ví dụ staff làm bài trong `app.` nhưng kết quả ghi vào tài
khoản staff.

Cơ chế hiện tại (đọc code 08/10, `apps/api/src/identity/sessions/session-transport.ts`): mọi client web nhận cùng
một cookie `refresh_token`, `HttpOnly; Secure; SameSite=Strict; Path=/v1/auth`, **không đặt `Domain`**. Theo MDN,
cookie không có `Domain` là cookie "host-only": chỉ gửi về đúng host đã đặt nó, không gửi sang subdomain khác.

| Phương án | Cách làm | Được | Mất |
| --- | --- | --- | --- |
| ✅ **A. Host API riêng cho admin** | Thêm `admin-api.<domain>` trỏ vào **cùng** API. `admin.` chỉ gọi `admin-api.`, còn `app.` gọi `api.` | Vì cookie là host-only, trình duyệt giữ hai cookie riêng cho hai host, không ghi đè được nhau. **Không đổi một dòng code identity** và không đổi tiêu chí B1#21. Vẫn cùng site nên `SameSite=Strict` vẫn chạy. Về sau có thể chặn truy cập riêng ở tầng mạng cho `admin-api.` | Hai hostname, hai chứng chỉ TLS cho một service. `CORS_ORIGINS` thêm `https://admin.<domain>`. Nếu admin cấu hình nhầm sang `api.` thì lỗi ghi đè quay lại |
| B. Tên cookie theo `Origin` | API đọc header `Origin` (trình duyệt gửi trên mọi request cross-origin, theo MDN), tra bảng cấu hình ra `refresh_token_app` hoặc `refresh_token_admin` | Một host API | Đổi `session-transport.ts`, tiêu chí B1#21 và test. Đọc, ghi và xóa cookie phải khớp tên ở cả ba chỗ |
| C. Path cookie theo client | Endpoint riêng, ví dụ `/v1/admin-auth/refresh`, cookie `Path=/v1/admin-auth` | Không phụ thuộc header | Nhân đôi endpoint auth |
| D. BFF (server Next.js giữ cookie trên host của nó) | `app.` và `admin.` gọi auth qua server của chính mình | Tách hoàn toàn, token không nằm trên host API | Đổi kiến trúc Bước 1. Mọi request auth phải đi qua server Next.js |
| ✅ **E. Frontend phát hiện đổi tài khoản** (dùng kèm) | Sau mỗi lần refresh, so `sub` trong access token mới với người dùng đang hiển thị. Khác thì tải lại trang | Lưới an toàn rẻ, chỉ code ở client. Access token đã có `sub` (`access-token.service.ts`) | Chỉ phát hiện, không ngăn |

**Chốt (08/10): A, tách host `admin-api.<domain>`.** E vẫn là đề xuất dùng kèm, chưa chốt. A tách cookie bằng chính
quy tắc của trình duyệt, chỉ tốn cấu hình deploy. E bắt trường hợp cấu hình nhầm.

Trường hợp biên của A (When → Then, đưa vào design khi làm `apps/admin`):
- **When** `admin.` đăng xuất, **then** chỉ xóa cookie trên `admin-api.`. Phiên ở `app.` giữ nguyên.
- **When** cùng tài khoản đăng nhập cả `app.` và `admin.`, **then** có hai chuỗi phiên, tính là 2 trong giới hạn
  10 thiết bị của Bước 1.
- **When** URL API của `apps/admin` trỏ nhầm sang `api.<domain>`, **then** ghi đè quay lại. Cần một kiểm tra lúc
  build hoặc khởi động để bắt cấu hình sai.
- **When** đổi mật khẩu, **then** Bước 1 xử lý các phiên khác thế nào thì giữ nguyên, vì hai host dùng chung một
  API và một DB.

### 10.3 Ngôn ngữ mặc định khi lần đầu vào trang

Google khuyên **không tự chuyển người dùng sang bản ngôn ngữ đoán từ trình duyệt**, vì như vậy người dùng (và
Google) có thể không thấy được các bản khác. Thay vào đó nên có link để người dùng tự đổi (Google Search
Central, đọc 08/10). Ví dụ i18n chính thức của Next.js lại tự chuyển theo header `Accept-Language`. Không nên
chép phần đó.

| Phương án | Được | Mất |
| --- | --- | --- |
| ✅ **A. `/` là tiếng Việt, `/en` là tiếng Anh, có nút đổi ngôn ngữ** | Đúng người dùng chính. Link gửi người duyệt Claude là `/en`. Đúng khuyến nghị của Google | Người nước ngoài vào `/` sẽ thấy tiếng Việt trước |
| B. Tự chuyển theo ngôn ngữ trình duyệt | Đúng ngôn ngữ cho đa số | Ngược khuyến nghị của Google. Link chia sẻ có thể ra ngôn ngữ khác người gửi |
| C. `/` là tiếng Anh | Hợp người đọc quốc tế | Ngược đối tượng chính |

~~**Đề xuất: A.**~~ Thay bởi đề xuất D bên dưới, sau khi chủ dự án hỏi về chọn ngôn ngữ theo vị trí (08/10).

**D. Chọn theo vị trí, nhưng chỉ ở `/` (đề xuất cập nhật 08/10).** Chủ dự án muốn: người ở Việt Nam thấy tiếng
Việt, nơi khác thấy tiếng Anh. Làm được mà vẫn đúng hướng dẫn của Google nếu tách hai loại URL:

- `/vi` và `/en` là hai trang cố định, **không bao giờ tự chuyển**, mỗi trang có link sang bản kia.
- Chỉ `/` tự chuyển, theo thứ tự: (1) cookie lựa chọn trước đó của người dùng; (2) IP ở Việt Nam → `/vi`;
  (3) trình duyệt có tiếng Việt trong `Accept-Language` → `/vi` (để người Việt ở nước ngoài vẫn thấy tiếng Việt);
  (4) còn lại → `/en`.
- `/` khai báo là `x-default`, còn `/vi` và `/en` gắn `hreflang`. Google viết rằng `x-default` được thiết kế cho
  trang chọn ngôn ngữ và "auto-redirecting home pages".

Vì sao không đổi nội dung ngay tại một URL theo IP: Google cho biết Googlebot thường thu thập từ IP ở Mỹ, nên trang
đổi nội dung theo IP có thể không được index đủ các bản. Google khuyên dùng URL riêng cho từng ngôn ngữ (Google
Search Central, đọc 08/10).

Lấy quốc gia từ đâu: Vercel gửi sẵn header `x-vercel-ip-country`. Cloudflare có `CF-IPCountry` nhưng phải bật
"Add visitor location headers" (Managed Transform), trả `XX` khi không xác định và `T1` khi dùng Tor. Hosting chưa
chọn.

Trường hợp biên (When → Then, đưa vào design):
- **When** không có header quốc gia (chạy local, `XX`, `T1`), **then** bỏ qua bước (2) và xét tiếp bước (3).
- **When** người Việt ở nước ngoài, trình duyệt tiếng Anh, **then** họ vào `/en`. Họ bấm đổi một lần, lần sau đi
  theo cookie.
- **When** người dùng VPN, **then** ngôn ngữ đi theo IP của VPN. Chấp nhận được, vì đổi một lần là nhớ.
- **When** CDN cache phản hồi chuyển trang của `/`, **then** mọi người nhận cùng một bản. Phản hồi của `/` phải
  không được cache hoặc cache tách theo quốc gia (chi tiết để cho design).

Thay đổi so với bản trước: `/` không còn là trang tiếng Việt. Link gửi người duyệt Claude là `/en`.

### 10.4 Phần founder

| Phương án | Được | Mất |
| --- | --- | --- |
| A. Tên, ảnh, câu chuyện | Tin cậy nhất khi chưa có người dùng | Lộ thông tin cá nhân nhiều nhất |
| ✅ **B. Tên và 2–3 câu câu chuyện, không ảnh, liên hệ qua email domain** | Đủ thay testimonial, người duyệt Claude thấy có người thật đứng sau | Vẫn công khai tên |
| C. Ẩn danh ("một người làm độc lập") | Riêng tư | Kém tin cậy. Có thể không giữ được khi bán Pro (xem dưới) |
| D. Bỏ phần này | Gọn | Trang mất bằng chứng duy nhất khi chưa có người dùng |

Khi bắt đầu thu tiền: theo Nghị định 85/2021 (sửa Nghị định 52/2013), website thương mại điện tử bán hàng phải
công bố tên và địa chỉ của chủ sở hữu trên trang chủ. Với cá nhân là tên và địa chỉ thường trú. Nguồn là trang
tổng hợp, chưa đọc văn bản gốc. Cũng chưa kiểm tra quy định này có áp dụng cho gói Pro của app hay đã có văn bản
mới thay thế (`ASSUMPTION`). Cần kiểm tra lại trước khi làm billing.

**Đề xuất: B.** Phần địa chỉ để tới lúc làm billing.

### 10.5 Đo gì và dùng công cụ nào

Chỉ cần ba con số: **lượt xem**, **số đăng ký**, và **tỉ lệ đăng ký** = số đăng ký / lượt xem. Số đăng ký lấy
từ danh sách email thật (10.6), nên không cần đo lượt bấm nút.

| Phương án | Cookie | Sự kiện tùy chỉnh | Chi phí | Ghi chú |
| --- | --- | --- | --- | --- |
| ✅ **Cloudflare Web Analytics** | Không dùng cookie hay localStorage, không fingerprint | Chưa hỗ trợ | Miễn phí | Không cần đưa DNS qua proxy của Cloudflare. Tối đa khoảng 10 site mỗi tài khoản |
| Umami | Không dùng cookie | Có | Tự host miễn phí (cần server và DB) hoặc bản cloud có gói free (giới hạn chưa kiểm tra) | Đáng cân nhắc khi cần đo hành vi trong app |
| Google Analytics 4 | Có (`ASSUMPTION`, chưa đọc tài liệu trong phiên này) | Có | Miễn phí | Cần cookie banner xin đồng ý |
| Không đo | — | — | — | Chỉ biết số đăng ký, không biết tỉ lệ |

**Đề xuất: Cloudflare Web Analytics** và đếm số đăng ký từ danh sách email. Chính sách bảo mật vẫn nên nhắc tới
việc đo này. Luật BVDLCN có coi dữ liệu kỹ thuật như IP là dữ liệu cá nhân hay không thì chưa kiểm tra
(`ASSUMPTION`).

### 10.6 Email: thu đăng ký, gửi thư, hộp thư theo domain

Đây là ba việc khác nhau:

| Việc | Đề xuất | Lý do và dữ kiện |
| --- | --- | --- |
| Gửi thư cho người đăng ký (thư mời, thông báo mở) | ✅ **Resend** gửi từ domain riêng | Gói free: 3.000 email/tháng, 100 email/ngày, 3 domain. Marketing: 1.000 contact (trang giá Resend, 08/10). Gmail yêu cầu **mọi** người gửi có SPF hoặc DKIM; trên 5.000 thư/ngày thì thêm DMARC và hủy đăng ký một chạm (Google, 08/10) |
| Lưu danh sách đăng ký | ✅ Lưu ở contact list của Resend (qua form của landing) cho tới khi API lên production | Không phải `deploy` API và DB chỉ để lưu email. Resend trở thành bên xử lý dữ liệu, phải ghi vào chính sách bảo mật. Cách gọi cụ thể từ Next.js chưa kiểm tra, để cho design doc |
| Hộp thư `founder@<domain>` (nộp Claude Startups, liên hệ) | ✅ **Cloudflare Email Routing**: nhận thư rồi chuyển tiếp về Gmail | Miễn phí. Chỉ nhận và chuyển tiếp, **không gửi được** từ địa chỉ domain. Gửi từ domain là sản phẩm khác (Email Sending, bản beta, cần Workers Paid). Muốn trả lời bằng `founder@<domain>` thì phải thêm cách gửi qua SMTP của Resend hoặc một hộp thư trả phí (chưa kiểm tra cách cài, `ASSUMPTION`) |

**Trạng thái:** chủ dự án **tạm chấp nhận** cả ba (08/10).

Phương án đã loại: dùng SMTP Gmail cá nhân để gửi cho người đăng ký. Giới hạn gửi chưa có nguồn, thư gửi từ
`@gmail.com` không gắn với domain sản phẩm, và trộn với OTP của app.

Hệ quả có lợi: app có sẵn port `Mailer`, nên sau này có thể chuyển cả OTP sang Resend. Việc này đóng luôn điểm mở
"giới hạn SMTP Gmail cá nhân chưa có nguồn" của Bước 1. Cần quyết riêng, không nằm trong landing.

## 11. UX và bố cục mobile: phân tích, chờ thực hiện (08/10/2026)

**Cập nhật 08/10, đã làm trên Figma:** tên Wordmet trên cả 4 trang.

- **Mobile:** bài mẫu nằm ngay dưới tiêu đề; khoảng cách hero là 28px; 3 bước thành dải vuốt ngang có chấm chỉ vị
  trí; chữ 11px nâng lên 13px; nút đáp án cao khoảng 49px; footer gọn lại. VI mobile còn 5.460px (trước 6.540px).
- **Flashcard:** component `Flashcard` lật được bằng cú bấm (Smart Animate 0,45 giây), đặt trong thẻ "Chỉ lưu từ và
  nghĩa". Figma không xoay 3D được, nên prototype chỉ chuyển mặt chứ không lật thật. Lật thật làm khi viết code.
- **Bài mẫu:** component `Cloze demo / VI` và `/ EN`, 4 trạng thái (Unanswered, Wrong, Correct, Done), nối
  prototype. Giới hạn: Figma không cho một variant chuyển sang chính nó, nên ở trạng thái Wrong, bấm một đáp án sai
  khác sẽ không có gì xảy ra. Mới có 1 câu mẫu (`deploy`).
- **Form email:** bảng "States – Email form (VI)" có 2 bản đồng ý chính sách (A: dòng chữ, B: ô tick) với 12
  trạng thái, có prototype. Mới làm bản tiếng Việt.
- **Hiệu ứng khi cuộn:** ghi thành chú thích (annotation) trên từng section.

**Trạng thái ban đầu:** chủ dự án dặn *chưa làm gì*, chỉ thu thập context và phân tích. Sẽ thực hiện sau khi chủ dự án cài
xong skill. File Figma: https://www.figma.com/design/NVyO0njIAcOUTAl85a1Xdx. Trong file có 4 trang: VI desktop
`2:25`, VI mobile `18:27`, EN desktop `20:51`, EN mobile `20:276`. Chủ dự án đã sửa chữ trực tiếp trên Figma, nên
khi làm tiếp phải đọc chữ hiện có trong file, không lấy từ file này.

Chủ dự án yêu cầu bốn việc:
1. Hiệu ứng khi cuộn tới đâu thì phần đó hiện ra tới đó.
2. Hiệu ứng lật cho flashcard.
3. Rà và chỉnh lại bố cục mobile, vì desktop đã ổn còn mobile thì chưa.
4. Trạng thái form email và các bước của bài mẫu.

### 11.1 Bố cục mobile: số đo hiện tại

Đo bằng một lần đọc Figma (chỉ đọc, 08/10). Không phần tử nào tràn khỏi khung 390px.

| Vấn đề | Số đo | Đề xuất |
| --- | --- | --- |
| Trang quá dài | VI 6.540px, EN 6.669px, gấp khoảng 1,5 lần desktop (4.493px). Riêng "How it works" cao 1.683px | Ba card bước chuyển thành dải vuốt ngang, mỗi lần một card và có chấm chỉ vị trí. Hoặc thu khung minh họa từ 250px xuống khoảng 160px |
| Bài mẫu bị đẩy xuống dưới màn hình đầu | Hero cao 1.065px. Bài mẫu bắt đầu sau khoảng 560px chữ và form | Đưa bài mẫu lên ngay dưới tiêu đề, form email để sau. Hoặc rút gọn đoạn mô tả |
| Khoảng cách trong hero quá sát | `itemSpacing` của Hero là 10px. Lỗi này do lần sửa trước bắt nhầm khung cha | Trả về 24–32px |
| Nút đáp án nhỏ hơn mức khuyến nghị | Nút lựa chọn cao 43px | WCAG 2.2 SC 2.5.8 (AA) chỉ yêu cầu tối thiểu 24×24 CSS px, nên hiện đã đạt. Nâng lên 44–48px để dễ bấm bằng ngón tay (đề xuất, không bắt buộc) |
| Chữ quá nhỏ | Nhãn 11px trong khung minh họa bước 1 ("Từ", "Câu có chứa từ…") | Nâng lên ít nhất 12–13px |
| Footer lộn xộn | Các link xuống dòng không đều | Xếp link thành 2 cột, bản quyền đặt cuối |
| Thanh trên cùng không có nút đăng ký | Chỉ còn logo và VI/EN | Chủ dự án không chọn thanh đăng ký dính đáy màn hình, nên giữ như hiện tại |

### 11.2 Trạng thái form email

| Trạng thái | Hiển thị |
| --- | --- |
| Mặc định | Ô email trống, nút "Nhận tin khi ra mắt" |
| Đang nhập | Viền ô email đổi sang màu `primary` |
| Email sai định dạng | Viền đỏ (`danger`), dòng lỗi ngay dưới ô: "Email chưa đúng định dạng". Không xóa chữ đã nhập |
| Đang gửi | Nút bị khóa, hiện vòng quay, chữ "Đang gửi…" |
| Thành công | Form được thay bằng khung: "✓ Đã nhận! Bọn mình sẽ báo khi app mở." |
| Email đã đăng ký | Báo như thành công ("Email này đã có trong danh sách"). Không báo lỗi, để người khác không dò được email nào đã đăng ký (đề xuất) |
| Lỗi mạng hoặc máy chủ | Dòng lỗi: "Chưa gửi được, thử lại nhé". Giữ nguyên email đã nhập |

Ô đồng ý chính sách bảo mật theo mục 8 vẫn phải có. Mockup hiện chỉ có một dòng chữ dưới form, cần quyết dùng ô tick
hay dòng chữ (**Mở**, thuộc phần pháp lý).

### 11.3 Các bước của bài mẫu

Chưa trả lời → chọn sai (nút đỏ, dòng gợi ý, được chọn lại) → chọn đúng (xanh, giải thích và bản dịch) → "Câu
tiếp theo" → … → sau câu 3/3 hiện lời mời: "Thích kiểu luyện này? Nhận tin khi [TÊN] ra mắt" kèm form. Cần 3 câu
mẫu. Hiện mới có câu `deploy`. Câu `assume` và `borrow` có sẵn ở phần "Vấn đề" và có thể dùng lại.

### 11.4 Hiệu ứng chuyển động

- **Hiện dần khi cuộn tới:** mỗi section mờ dần rồi trượt lên một đoạn ngắn khi lọt vào màn hình, chạy một lần.
  Các card trong cùng hàng hiện lệch nhau một chút. CSS `animation-timeline: view()` hiện là "Limited availability",
  chưa đạt Baseline (MDN, đọc 08/10), nên đừng dựa vào nó. Đề xuất dùng IntersectionObserver hoặc thư viện, chốt
  trong design kỹ thuật.
- **Lật flashcard:** trên trang **hiện chưa có flashcard nào**. Chỗ hợp nhất là thẻ trái của phần "Vấn đề" ("Chỉ lưu
  từ và nghĩa"): mặt trước là từ (`deploy`), bấm để lật ra nghĩa. Thẻ này minh họa đúng ý "flashcard giúp nhớ
  nghĩa", rồi đặt cạnh bài điền từ để so sánh. Lật quanh trục dọc khoảng 0,4–0,6 giây.
- **Tôn trọng tùy chọn giảm chuyển động:** `prefers-reduced-motion: reduce` cho biết người dùng đã bật chế độ giảm
  chuyển động không cần thiết trong máy (MDN, đọc 08/10). Khi bật thì tắt trượt và lật, chỉ giữ đổi trạng thái tức
  thì.
- **Thể hiện trên Figma:** hiệu ứng lật và các bước bài mẫu làm được bằng prototype (hai khung trạng thái nối bằng
  Smart Animate). Hiệu ứng khi cuộn không mô phỏng trọn được trên khung tĩnh, nên ghi thành chú thích kèm thông số.
  Cách làm cụ thể phụ thuộc skill chủ dự án sắp cài.

## Nguồn

- NN/g, How long do users stay on web pages: https://www.nngroup.com/articles/how-long-do-users-stay-on-web-pages/
- Clozemaster (đọc trực tiếp): https://www.clozemaster.com/
- Speak (tóm tắt): https://www.speak.com/
- ELSA Speak Việt Nam (đọc trực tiếp): https://vn.elsaspeak.com/
- Phân tích Babbel: https://landingdoctors.com/teardowns/babbel-com
- Phân tích Drops: https://landingdoctors.com/teardowns/drops-com
- Trang waitlist (thứ cấp): https://getlaunchlist.com/blog/waitlist-landing-page-examples-that-convert
- Scannability, trích NN/g (thứ cấp): https://www.uxpin.com/studio/blog/website-design-for-scannability/
- Luật BVDLCN 2025, Nghị định 356/2025 (thứ cấp): https://luatvietnam.vn/dan-su/nghi-dinh-huong-dan-luat-bao-ve-du-lieu-ca-nhan-2025-la-nghi-dinh-nao-568-103658-article.html,
  https://lsvn.vn/06-quyen-cua-chu-the-du-lieu-theo-luat-bao-ve-du-lieu-ca-nhan-tu-01-01-2026-a162604.html
- Claude for Startups: https://claude.com/programs/startups
- Google Search Central, trang đa ngôn ngữ: https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
- Next.js i18n (qua context7): https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/internationalization.mdx
- Cloudflare Web Analytics: https://www.cloudflare.com/web-analytics/, https://developers.cloudflare.com/web-analytics/faq/
- Umami: https://docs.umami.is/docs/
- Cloudflare Email Routing: https://developers.cloudflare.com/email-routing/
- Cloudflare Registrar: https://developers.cloudflare.com/registrar/about/; bảng giá (bên thứ ba): https://cfdomainpricing.com/
- Resend pricing: https://resend.com/pricing
- Yêu cầu người gửi của Gmail: https://support.google.com/a/answer/81126
- GitHub Student Developer Pack: https://education.github.com/pack
- Google, hreflang và x-default: https://developers.google.com/search/docs/specialty/international/localized-versions
- Google, locale-adaptive pages: https://developers.google.com/search/docs/specialty/international/locale-adaptive-pages
- Cloudflare `CF-IPCountry`: https://developers.cloudflare.com/fundamentals/reference/http-headers/
- Vercel `x-vercel-ip-country`: https://vercel.com/docs/headers/request-headers
- MDN Set-Cookie (cookie host-only): https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie
- WCAG 2.2 SC 2.5.8 Target Size (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- MDN prefers-reduced-motion: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- MDN animation-timeline view(): https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline/view
- MDN Origin header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Origin
- Next.js rewrites theo host (qua context7): https://github.com/vercel/next.js/blob/canary/docs/01-app/03-api-reference/05-config/01-next-config-js/rewrites.mdx
- Nghị định 85/2021 (tổng hợp): https://accgroup.vn/nghi-dinh-85-2021-nd-cp/
