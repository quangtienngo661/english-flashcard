# Danh sách từ A1–C2, chi phí, ràng buộc phát hành và giấy phép — 02/10/2026

Ngày nghiên cứu: **02/10/2026**. Phạm vi: phản hồi các rủi ro người dùng nêu sau
khi rà context; không chọn provider, schema, hosting hay giá. Chưa có code.

Nhãn bằng chứng dùng trong file:

| Nhãn | Nghĩa |
| --- | --- |
| **Đo tại đây** | Chạy/đếm trên file đã tải vào workspace; lệnh và output được lưu. |
| **Tài liệu chính thức** | Đọc trực tiếp trang của bên sở hữu (Apple, Google, Vercel, Creative Commons, Quizlet…). |
| **Nguồn thứ cấp** | Trang tổng hợp/bài viết bên thứ ba; cần đối chiếu lại trước khi dựa vào. |
| **Suy luận** | Áp dụng của trợ lý cho app này; không phải dữ kiện hay tư vấn pháp lý. |
| **Giả định** | Con số đặt ra để ước lượng; phải đo lại khi có prototype. |

## 1. Danh sách từ vựng A1–C2 — đo tại đây

Đã tải file vào [`evidence/wordlists_2026-10-02/`](evidence/wordlists_2026-10-02/) và
chạy [`profile_wordlists.py`](evidence/wordlists_2026-10-02/profile_wordlists.py);
output lưu tại [`profile_output_2026-10-02.txt`](evidence/wordlists_2026-10-02/profile_output_2026-10-02.txt).

| Danh sách | Số dòng | Level | Trường có sẵn | Quyền dùng (tài liệu chính thức) |
| --- | --- | --- | --- | --- |
| CEFR-J Vocabulary Profile 1.5 | 7.799 | A1 1.164 · A2 1.411 · B1 2.446 · B2 2.778 | headword, pos, CEFR, 3 cột phân loại chủ đề | "research and commercial purposes with no charge, provided that you cite the dataset properly" |
| **Octanove Vocabulary Profile C1/C2 1.0** | 2.136 | C1 1.111 · C2 1.025 | headword, pos, CEFR, notes — **không có topic, nghĩa hay ví dụ** | **CC BY-SA 4.0** |
| Oxford 5000 (bản mirror GitHub) | 4.950 (đã gộp từ trùng) | Level chỉ có trong PDF | Chỉ headword | Bản quyền Oxford University Press; mirror mang Apache-2.0 cho repo, **không cấp quyền nội dung OUP** → không dựa vào |

Nguồn: [README repo CEFR-J/Octanove](https://github.com/openlanguageprofiles/olp-en-cefrj),
[Oxford 5000 mirror](https://github.com/ittuann/The-Oxford-5000-Word-Lists).

**Kết quả chính:**

- CEFR-J + Octanove = **8.812 headword duy nhất phủ A1–C2**; 163 từ có trong cả
  hai danh sách, thường khác loại từ (vd. `campaign`: CEFR-J B2 noun, Octanove C1 verb).
  Khoảng trống C1–C2 ở mục 22 của Product Discovery được lấp **ở mức metadata**
  (từ + loại từ + level); nghĩa tiếng Việt, định nghĩa, ví dụ và topic vẫn thiếu.
- Topic của CEFR-J chỉ có ở 1.698/7.799 dòng (CoreInventory 1) và 1.740/7.799
  (Threshold); taxonomy gồm Work and Jobs, Education, Food and drink, Shopping,
  Travel… **không có technology/marketing/business**; chỉ 9 dòng thuộc
  "Technical and legal language". Octanove không có topic.
- Tra 29 từ theo chủ đề người dùng nêu: **algorithm, bandwidth, debug, encrypt,
  API, stakeholder, leverage, cuisine, mitigate, ubiquitous không có trong danh
  sách nào**; `deploy` chỉ có trong Oxford 5000. Có level: revenue B2,
  entrepreneur B2, negotiate B1, recipe B2, invoice C1, resilience C1, meticulous C2.
- Dữ liệu cần làm sạch: Octanove có 2 dòng POS lỗi (`batter` rỗng, `remonstrate` = "vern").

**Suy luận:** từ chuyên ngành không thuộc phạm vi CEFR (CEFR đo năng lực chung);
gói topic chuyên ngành phải tự biên soạn với level `basis = estimated` hoặc để trống.
Topic phải tự gán cho cả hai danh sách.

## 2. Công cụ luyện đặt câu và Quizlet Q-Chat

- **Tài liệu chính thức:** trang Q-Chat của Quizlet ghi "As of June 2025, Q-Chat is
  no longer available." — **không nêu lý do**. [Quizlet blog](https://quizlet.com/blog/meet-q-chat)
- **Tài liệu chính thức:** tính năng hiện có là "Ask Quizlet": giải thích khái niệm,
  tạo flashcard, tìm bộ học, upload file; chỉ mở cho người dùng Mỹ từ 14 tuổi;
  không mô tả chế độ luyện đặt câu.
  [Help Center](https://help.quizlet.com/hc/en-us/articles/42790350723725-Studying-with-Ask-Quizlet)
- **Nguồn thứ cấp, chưa xác minh:** câu "after careful evaluation and customer
  feedback" chỉ thấy ở bài tổng hợp, không mở được nguồn gốc.
  [Quizgecko](https://quizgecko.com/blog/best-q-chat-alternative)
- **Nguồn thứ cấp:** có app ngách cho viết câu với từ + AI phản hồi (SentenceLab,
  Drill, Wordwright.ai), tiếng Anh, không nhắm người Việt.
  [SentenceLab](https://www.chinese-forums.com/forums/topic/64171-new-app-for-intermediate-learners-practice-vocabulary-through-sentence-writing/),
  [Drill](https://cdn.jsdelivr.net/gh/jchaselubitz/drill-app@main/README.md),
  [Wordwright.ai](https://scour.ing/@hello/p/https://github.com/kwakubiney/wordwright.ai)
- **Nguồn thứ cấp:** TFlat chia gói từ theo Oxford 3000, IELTS, TOEIC, thi THPT
  (VIP); không thấy nhãn CEFR C2. Chưa vào được trang chính thức của TFlat.
  [FPT Shop](https://fptshop.com.vn/tin-tuc/giai-tri/tu-dien-tflat-182022),
  [anhletoeic](https://anhletoeic.com/app-hoc-tu-vung-toeic/)

**Suy luận:** Q-Chat là chat tutor tổng quát, luyện câu chỉ là một chế độ; không
suy ra "luyện đặt câu thất bại". Bài tập có cấu trúc + rubric hẹp hơn chat mở.
Pilot cần đo việc quay lại phần đặt câu.

## 3. Chi phí

### 3.1. Giá AI theo token

| Model | Input / Output $/1M token | Nguồn |
| --- | --- | --- |
| Gemini 2.5 Flash-Lite | 0,10 / 0,40 | Nguồn thứ cấp: [morphllm](https://www.morphllm.com/gemini-api-pricing) |
| GPT-5.4 nano | 0,20 / 1,25 | Nguồn thứ cấp: [morphllm](https://www.morphllm.com/openai-api-pricing) |
| Gemini 3.5 Flash-Lite | 0,30 / 2,50 | Nguồn thứ cấp: [morphllm](https://www.morphllm.com/gemini-api-pricing) |
| Claude Haiku 4.5 | 1 / 5 | Bảng giá Anthropic trong skill claude-api (cache 25/09/2026) |
| Claude Sonnet 5.5 | 2 / 10 | Như trên |

**Tài liệu chính thức:** Gemini API có free tier với các model Flash/Flash-Lite;
ở free tier, "Content used to improve our products: Yes"; ở paid tier thì không.
[Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)

**Ước lượng (giả định):** pilot 30 người × 20 buổi/tháng = 600 buổi; mỗi buổi
= 1 lần tạo bài (~800 input / 1.000 output token) + 5 câu chấm (~600 / 150 mỗi câu).

| Model | 600 buổi/tháng |
| --- | --- |
| Gemini 2.5 Flash-Lite | ~$0,65 |
| GPT-5.4 nano | ~$1,8 |
| Gemini 3.5 Flash-Lite | ~$3,3 |
| Claude Haiku 4.5 | ~$7,5 |
| Claude Sonnet 5.5 | ~$15 |

Model có reasoning có thể sinh thêm token output ẩn; số token phải đo khi có
prototype. AI soạn nháp nội dung một lần cho 8.812 từ (~200 input / 300 output
mỗi từ): ~$1 (Flash-Lite) → ~$15 (Haiku) → ~$30 (Sonnet 5.5).

### 3.2. Hạ tầng, store và phí thanh toán

| Hạng mục | Chi phí | Khi phát sinh | Nguồn |
| --- | --- | --- | --- |
| Chạy local (Docker Postgres, NestJS, Next.js, Flutter + Android emulator) | $0 | — | Suy luận |
| Redis + BullMQ worker (phương án B, chọn sau bản research này) | $0 khi chạy local bằng Docker | Chưa ước lượng chi phí trên server; không phát sinh nếu job import chỉ chạy local | Suy luận |
| Backend + Postgres | ~$5–20/tháng | Khi public | Nguồn thứ cấp: [so sánh Railway/Render/Fly](https://sota.io/blog/railway-vs-render-vs-fly-pricing-2026), [Neon/Supabase free tier](https://makerkit.dev/blog/saas/supabase-pricing) |
| Web Next.js trên Vercel | Hobby $0, **chỉ phi thương mại**; Pro $20/người/tháng | Khi thu tiền | Tài liệu chính thức: [Vercel Hobby](https://vercel.com/docs/plans/hobby) |
| Build iOS không cần Mac | Codemagic free 500 phút macOS/tháng; vượt $0,095/phút | Khi build iOS | Nguồn thứ cấp: [Codemagic](https://docs.codemagic.io/getting-started/about-codemagic/) |
| Apple Developer | $99/năm | Khi cần TestFlight/App Store | Nguồn thứ cấp: [choicely](https://www.choicely.com/tutorials/how-much-does-it-cost-to-publish-an-app) |
| Google Play | $25 một lần | Khi publish Android | Như trên |
| Phí IAP Apple | 15% (Small Business Program) | Khi bán Pro trên iOS | Tài liệu chính thức: [Apple Small Business Program](https://developer-mdn.apple.com/app-store/small-business-program/) |
| Phí Google Play subscription | 15% | Khi bán Pro trên Android | Tài liệu chính thức: [Google Play service fees](https://support.google.com/googleplay/android-developer/answer/112622?hl=en) |
| Thanh toán web | Stripe không hỗ trợ Việt Nam; VNPay/MoMo/PayOS — phí chưa tra | Khi bán Pro trên web | Nguồn thứ cấp: [dodopayments](https://dodopayments.com/blogs/merchant-of-record-vietnam) |
| Domain | ~$10–15/năm | Khi public | Giả định, chưa tra |

## 4. Ràng buộc phát hành — tài liệu chính thức

| Ràng buộc | Nội dung | Nguồn |
| --- | --- | --- |
| Google Play, tài khoản cá nhân tạo sau 13/11/2023 | Closed test **≥12 tester opt-in liên tục ≥14 ngày**, rồi xin production access; Google duyệt thường ≤7 ngày | [Play Console Help](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en) |
| Apple 3.1.1 | Mở khóa tính năng/subscription trong app phải dùng In-App Purchase | [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) |
| Apple 3.1.3(b) | Mua trên web được dùng trong app nếu gói đó cũng bán qua IAP trong app | Như trên |
| Apple 4.8 | Dùng Google Sign-In thì phải có thêm login giới hạn dữ liệu ở tên + email, cho ẩn email, không theo dõi quảng cáo khi chưa đồng ý (thực tế: Sign in with Apple) | Như trên |
| Không có Mac | Không chạy iOS Simulator/hot reload trên Windows; iOS build qua cloud macOS (Codemagic) và cài lên iPhone qua TestFlight | Suy luận + nguồn thứ cấp Codemagic |

## 5. Giấy phép dữ liệu và điều khoản người dùng

### 5.1. Nghĩa vụ ghi nguồn dữ liệu — tài liệu chính thức

- CC BY-SA 4.0, mục 3(a): giữ tên tác giả, ghi chú bản quyền, tên + link giấy phép,
  ghi chú nếu đã sửa; "may be satisfied in any reasonable manner based on the
  medium, means, and context". [Legal code](https://creativecommons.org/licenses/by-sa/4.0/legalcode.en)
- CC BY-SA 4.0, mục 2(a)(5)(C): không được đặt thêm điều khoản hạn chế người nhận
  thực hiện quyền theo giấy phép.
- FAQ của Creative Commons: ShareAlike "only applies if a work is modified and if
  the work is shared publicly"; với collection/database, "CC licenses do not
  require the collection or the compilation itself to be made available under an
  SA license", từng phần vẫn giữ giấy phép riêng. [CC FAQ](https://creativecommons.org/faq/)
- Mẫu ghi nguồn TASL (Title, Author, Source, License).
  [CC wiki](https://wiki.creativecommons.org/wiki/Recommended_practices_for_attribution)

**Suy luận, không phải tư vấn pháp lý:** dòng level lấy nguyên từ Octanove vẫn là
CC BY-SA; nghĩa tiếng Việt/ví dụ tự viết ở bảng riêng nhiều khả năng là collection,
không phải chuyển thể. Không sửa trực tiếp dòng Octanove; khi chỉnh level, thêm
`level_assignments` mới với nguồn biên tập riêng. Ghi nguồn ở màn hình
"Cài đặt → Giới thiệu → Nguồn dữ liệu & giấy phép"; người dùng không cần chấp nhận.

### 5.2. Điều khoản người dùng chấp nhận — tài liệu chính thức

| Yêu cầu | Nguồn |
| --- | --- |
| Privacy Policy: dữ liệu thu thập, mục đích, bên thứ ba được chia sẻ (phải bảo vệ tương đương), thời gian lưu, cách xóa/rút lại đồng ý; link trong App Store Connect và trong app | Apple 5.1.1(i) |
| Xóa tài khoản ngay trong app | Apple 5.1.1(v) |
| Xóa tài khoản trong app + link web để yêu cầu xóa | [Google Play](https://support.google.com/googleplay/android-developer/answer/13327111) |
| Mô tả rõ gói được gì trước khi mời mua subscription | Apple 3.1.2(c) |
| Quyền được biết, đồng ý, rút lại, truy cập, sửa, xóa dữ liệu; phạt tối đa 3 tỷ đồng (tổ chức), cá nhân 50% | Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15, hiệu lực 01/01/2026 — [thitruongtaichinhtiente](https://thitruongtaichinhtiente.vn/nhung-diem-chinh-can-luu-y-tai-luat-bao-ve-du-lieu-ca-nhan-chinh-thuc-co-hieu-luc-tu-ngay-1-1-2026-75881.html), [Nghị định 356/2025](https://thuvienphapluat.vn/van-ban/Quyen-dan-su/Nghi-dinh-356-2025-ND-CP-huong-dan-Luat-Bao-ve-du-lieu-ca-nhan-687428.aspx) |

**Đối chiếu app thật:** Điều khoản của Duolingo gồm Acceptable Use, Registration,
In-App Purchases, Automatic Renewal, Refund Policy, No Warranties, Limitation of
Liability, Termination, Proprietary Rights, Privacy, Governing Law (Pennsylvania).
Mục Proprietary Rights cấm sao chép toàn bộ "Service Content".
[Duolingo Terms](https://www.duolingo.com/terms)

**Suy luận:** không sao chép điều khoản cấm sao chép toàn bộ nội dung vì sẽ xung
đột mục 2(a)(5)(C) của CC BY-SA; cần câu ngoại lệ cho dữ liệu theo giấy phép mở.
Privacy Policy phải nêu việc gửi câu trả lời của người học cho nhà cung cấp AI.

## 6. Chưa xác minh

- Phiên bản CEFR-J để import: số liệu ở mục 1 đo trên bản mirror 1.5 (7.799 dòng); research 01/10 khuyên dùng bản chính thức 1.6 (7.801 mục).
- Octanove C1/C2 mới thấy trên repo mirror `openlanguageprofiles`; chưa kiểm tra trang chính thức của CEFR-J hoặc Octanove Labs có phát hành bản này không.
- Lý do chính thức Quizlet bỏ Q-Chat.
- Điều kiện thương mại của Oxford 3000/5000; dữ liệu và license của TFlat.
- Giá Gemini/OpenAI trên trang chính thức (mới có nguồn thứ cấp); số token thực tế mỗi buổi.
- Codemagic có build iOS không ký (`flutter build ios --no-codesign`) mà không cần tài khoản Apple hay không.
- Ranh giới pháp lý "collection" và "chuyển thể" khi thêm nghĩa Việt vào danh sách CC BY-SA.
- Luật Bảo vệ dữ liệu cá nhân: miễn trừ 5 năm cho doanh nghiệp nhỏ/khởi nghiệp gồm những điều nào, có áp dụng cho cá nhân không; hình thức đồng ý cụ thể.
- Thủ tục đăng ký kinh doanh/thuế khi cá nhân thu tiền subscription tại Việt Nam.
- Phí cổng thanh toán VNPay/MoMo/PayOS; giá domain.
