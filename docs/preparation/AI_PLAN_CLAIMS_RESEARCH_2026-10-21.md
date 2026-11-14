# Lời mô tả gói Pro có AI, và việc dùng lại câu AI đã sinh — desk research (21/10/2026)

Câu hỏi của chủ dự án: Pro ghi "300 lượt luyện AI mỗi tháng" (một câu AI **mới** = 1 lượt; xem lại câu đã sinh cho **chính người
học đó** = 0 lượt). Nếu gói được quảng cáo là "AI viết câu luyện" mà app đôi khi cho xem lại câu cũ thay vì sinh câu mới, thì có bị
coi là quảng cáo gây nhầm lẫn, có bị phạt, có bị store gỡ app không; và nếu có rủi ro thì ghi thế nào cho an toàn.

Đây **không phải tư vấn pháp lý**. Tài liệu chỉ mô tả và đưa phương án; **không chọn phương án** (quy tắc dự án: chủ dự án trả lời
trước, D27 Bước 4). Không lặp lại phần đã có trong `AI_QUOTA_BENCHMARK_RESEARCH_2026-10-19.md` (bảng hạn mức AI các app) và
`SUBSCRIPTION_LIFECYCLE_RESEARCH_2026-10-19.md` (Luật 19/2023 về dịch vụ liên tục, hoàn tiền, Điều 38, 42); chỉ trỏ tới chúng.

**Cách làm:** đọc trang công khai ngày 21/10/2026 bằng công cụ đọc web; không đăng ký, không điền form. Bản PDF chính thức của Nghị
định 87/2026, Nghị định 24/2025 và Luật 134/2025 trên `datafiles.chinhphu.vn` là ảnh scan, không trích được chữ; nên nội dung điều
khoản đọc ở bản chép trên trang tra cứu luật của bên thứ ba, còn số hiệu, ngày ban hành và hiệu lực đọc trên cổng Chính phủ.

**Nhãn nguồn:**
- **[primary]**: văn bản luật, hướng dẫn chính thức của store, trang của chính công ty. **[primary, bản chép]** = văn bản luật đọc
  trên trang tra cứu của bên thứ ba (nội dung là luật, nhưng chưa đối chiếu với bản gốc trên Công báo).
- **[secondary]**: báo, bài tổng hợp, review, diễn đàn, đoạn trích kết quả tìm kiếm.
- **Suy luận**: nhận định của người viết, chưa ai kiểm.

Số liệu Wordmet dùng ở đây: Pro có 300 lượt bài AI mỗi chu kỳ, trần AI toàn hệ thống 1.000 lượt/ngày, có công tắc tắt AI (design
Bước 5, D18 và D2: `docs/superpowers/specs/2026-10-19-buoc-5-entitlements-design.md`); quy tắc "xem lại = 0 lượt" lấy từ brief của
phiên, chưa đọc code.

---

## 1. Tóm tắt

1. **Không tìm thấy quy định nào (luật Việt Nam, Apple, Google Play) cấm việc cho người học xem lại câu AI đã sinh.** Các quy định
   chỉ đòi thông tin "chính xác, đầy đủ" và cấm "lừa dối hoặc gây nhầm lẫn" (Luật 19/2023 Điều 10, 21; Luật Quảng cáo Điều 8 khoản 9,
   Điều 19) [primary, bản chép / primary]. **Suy luận:** rủi ro nằm ở **câu chữ của gói** so với cái app thật sự giao, không nằm ở
   việc dùng lại.
2. **Suy luận:** câu xem lại vẫn là câu do AI viết, và (theo brief) được viết cho chính người học đó, nên các lời "AI viết", "viết
   riêng cho bạn" vẫn đúng. Lời ghi thành sai khi gói hứa điều app không làm: "câu mới mỗi lần", "không bao giờ lặp lại", "không giới
   hạn"; hoặc khi người học **không thể** nhận đủ con số đã ghi. Nếu sau này chia sẻ câu giữa nhiều người học thì "viết riêng cho bạn"
   không còn đúng.
3. **Suy luận:** với cách đếm hiện tại (câu mới = 1 lượt, xem lại = 0), "300 lượt" thực chất là "300 câu mới"; xem lại là phần thêm,
   không trừ vào 300. Rủi ro lớn hơn việc dùng lại là **trần AI toàn hệ thống 1.000 lượt/ngày** và **công tắc tắt AI**: khi một trong
   hai chặn, người Pro không nhận đủ 300 câu mới dù đã trả tiền, và lời ghi "300" không kèm điều kiện có thể bị coi là không đúng cam
   kết (Luật 19/2023 Điều 10 khoản 1 điểm e).
4. **Phạt ở Việt Nam là phạt tiền hành chính, không có điều nào "cấm app" vì lỗi này.** Nghị định 98/2020 (sửa bởi 17/2022, 24/2025):
   cung cấp thông tin không chính xác/không đầy đủ 10–20 triệu; lừa dối hoặc gây nhầm lẫn 20–30 triệu; trong giao dịch từ xa 20–40
   triệu, **gấp đôi** khi làm trên mạng hoặc là dịch vụ liên tục; kèm buộc cải chính [primary, bản chép]. Nghị định 87/2026 (quảng
   cáo, hiệu lực 15/05/2026): nội dung quảng cáo không trung thực hoặc gây hiểu nhầm về tính năng, công dụng 20–40 triệu; trần 100
   triệu (cá nhân) / 200 triệu (tổ chức) mỗi hành vi [primary, bản chép; trần: secondary từ báo Chính phủ].
5. **Rủi ro "bị gỡ app" đến từ store, không phải từ luật Việt Nam.** Apple 2.3.1(a): marketing gây hiểu nhầm là căn cứ gỡ app và
   chấm dứt tài khoản; 5.6 cấm thu tiền cho tính năng không giao; 3.1.2(c) đòi mô tả rõ người dùng nhận được gì với giá đó. Google
   Play: không được làm người dùng hiểu sai về subscription [primary]. Không tìm thấy vụ app nào bị gỡ hay bị phạt vì dùng lại nội dung
   AI.
6. **Ngành không hứa "mới mỗi lần".** Các app ghi "unlimited", "Limited", "Up to 3/day" (bảng ở file 19/10). RemNote công khai dùng
   lại kết quả cũ khi đầu vào giống hệt và không tính credit lần đó; Flashcard Insights chỉ sinh một lần, ôn lại không tốn credit;
   Duolingo sinh bài tập theo lô, chuyên gia duyệt rồi mới đưa vào khoá học [primary].
7. **Cách ghi giữ được độ chính xác (Suy luận, chưa luật sư duyệt):** gọi đúng tên thứ đang đếm ("câu luyện **mới** do AI viết");
   thêm "tối đa" và nói điều kiện (trần hệ thống, AI tạm tắt); ghi rõ "ôn lại câu đã gặp không tính lượt"; trong app gắn nhãn câu ôn
   lại; nếu muốn, để người học tự chọn "Câu mới" hay "Ôn câu cũ". Phương án và trade-off ở mục 5.
8. **Luật Trí tuệ nhân tạo 134/2025/QH15 (hiệu lực 01/03/2026), Điều 11:** văn bản do AI tạo chỉ **bắt buộc** thông báo khi có khả
   năng gây nhầm lẫn về tính xác thực của sự kiện, nhân vật [primary, bản chép]. **Suy luận:** câu luyện từ vựng có vẻ không thuộc
   nhóm này, nhưng nhãn "câu do AI viết" rẻ và khớp với lời quảng cáo. Nghị định hướng dẫn hình thức gắn nhãn: chưa tìm thấy.
9. **Còn mở, cần luật sư (mục 6):** khi bán qua Apple/Google thì ai là "tổ chức kinh doanh" theo luật Việt Nam; màn hình gói trong
   app là "quảng cáo" hay "thông tin bắt buộc"; hệ số gấp đôi có cộng dồn không; Điều 47 / 53 của Nghị định 98 và Điều 53 của Nghị
   định 87 chồng lên nhau thế nào.

---

## 2. Finding 1 — App AI học ngôn ngữ mô tả AI và có dùng lại nội dung đã sinh không

Hạn mức của Duolingo Max, Speak, Praktika, ELSA, Quizlet, Memrise, RemNote, Mochi, Grammarly, Notion, ChatGPT, Prep đã có ở mục 2
của `AI_QUOTA_BENCHMARK_RESEARCH_2026-10-19.md`. Bảng dưới chỉ thêm: **cách gọi tính năng AI trong gói** và **việc dùng lại nội
dung AI đã sinh**.

| App | Cách gọi trong gói / trang chính thức (trích ngắn) | Dùng lại nội dung AI đã sinh? | Nguồn |
|---|---|---|---|
| RemNote (tạo thẻ bằng AI) | Màn cấu hình ghi số thẻ và số credit ước tính cho mỗi mức chi tiết | **Có, và nói rõ:** cùng văn bản, cùng cài đặt thì "RemNote reuses that result rather than running the AI again"; lần đó "the generation is free" | [primary] [S21] |
| RemNote Flashcard Insights | "Like all AI features, Flashcard Insights consumes AI credits" | **Có:** sinh "only once for each card, the first time you see it"; "practicing the card again will not cost any AI credits"; sửa thẻ thì sinh lại. Người dùng chọn tắt, hoặc chỉ hiện khi quên thẻ | [primary] [S22] |
| Duolingo (bài tập trong khoá) | — | **Có, theo lô:** LLM viết một lô bài tập, Learning Designer chọn và sửa "before they go into the app"; "our Spanish teaching experts always have the final say" (blog 22/06/2023). Bài không ghi rõ mỗi bài dùng cho nhiều người, nhưng bài đã duyệt trở thành nội dung khoá học (Suy luận) | [primary] [S23] |
| Duolingo Max (Explain My Answer, Roleplay) | Ra mắt 2023 là gói "powered by GPT-4"; trả lời sinh theo yêu cầu | Không tìm thấy thông tin có cache hay dùng lại câu giải thích. Trang help `duolingo.com/help/what-is-duolingo-max` không đọc được bằng công cụ (chỉ hiện chữ "Duolingo") | [secondary] [S24] |
| Speak (Made For You) | Bài "Based on Course mistakes"; màn Made For You hiện là "a feature available on the Premium Plus plan only" (khác bài help 07/11/2025 mà file 19/10 trích: Premium "Up to 3/day") | Bài help không nói có xem lại bài cũ được không | [primary] [S25] |
| Praktika | "unlimited speaking practice with AI tutors"; "Tutor memory (It remembers your progress!)"; không ghi fair-use | Không nói | [primary] [S26] |
| Prep (Teacher Bee AI) | Trang tiếng Anh của Prep, theo đoạn trích tìm kiếm: "40 question-and-answer opportunities per hour" (trang quá lớn, công cụ không tải được) | Không nói | [secondary] [S27] |
| ELSA, Quizlet, Memrise | Đã có ở file 19/10 ("Limited"/"Unlimited", "unlimited access", "Unlimited speaking practice") | Không tìm thấy | file 19/10 |
| Knowji | App Store mô tả bài học do đội nội dung soạn; không thấy tính năng AI | Không áp dụng | [secondary] [S30] |
| ElevenLabs (lân cận, không phải app học) | Mỗi lần bấm Generate trừ credit | **Một phần:** "you're eligible for two free generations" khi giữ nguyên prompt, giọng, model, trong 2 giờ | [primary] [S28] |
| Notion AI (lân cận) | Mỗi lần "Try again" tính thêm một response | Ngược lại: sinh lại thì tính thêm | file 19/10 [S28 ở đó] |
| Chegg Study (lân cận) | Bài tổng hợp: lời giải có sẵn trong thư viện không giới hạn, câu hỏi mới cho chuyên gia 20/tháng | Mẫu "kho có sẵn thì miễn phí, cái mới thì đếm"; chỉ có nguồn thứ cấp | [secondary] [S29] |

Điều **không** tìm thấy:
- Không app học ngôn ngữ nào (kể cả Prep, ELSA VN, MochiMochi, eJOY) ghi trong gói rằng nội dung AI là "mới mỗi lần" hay "không
  lặp lại", và cũng không app nào nói rõ khi nào xem lại nội dung AI cũ, trừ RemNote.
- Không tìm thấy app học nào có nút "câu mới (tốn lượt)" và "ôn câu cũ (miễn phí)" cạnh nhau. Gần nhất là tuỳ chọn của RemNote
  Flashcard Insights (tắt / chỉ khi quên / luôn hiện) và hai lần sinh lại miễn phí của ElevenLabs.
- Không tìm thấy nhãn "AI-generated" trên từng bài tập ở app học ngôn ngữ nào đã đọc.

---

## 3. Finding 2 — Luật Việt Nam

### 3.1 Luật Bảo vệ quyền lợi người tiêu dùng số 19/2023/QH15 (hiệu lực 01/07/2024)

Nguồn: bản chép trên caselaw.vn và hethongphapluat.com [primary, bản chép] [S1][S2][S3].

- **Điều 4 khoản 2 (quyền của người tiêu dùng):** được cung cấp "thông tin kịp thời, chính xác, đầy đủ" về sản phẩm, hàng hóa, dịch
  vụ và nội dung giao dịch.
- **Điều 10 khoản 1 điểm a (hành vi bị cấm):** "Lừa dối hoặc gây nhầm lẫn cho người tiêu dùng" bằng thông tin "sai lệch, không đầy
  đủ, không chính xác" về sản phẩm, dịch vụ, khả năng cung cấp, hoặc về nội dung, đặc điểm giao dịch.
- **Điều 10 khoản 1 điểm e:** cấm không đền bù, không trả lại tiền khi dịch vụ không đúng với "quảng cáo, giới thiệu, giao kết, cam
  kết" của bên bán.
- **Điều 21 khoản 1 điểm a:** bên kinh doanh phải "Cung cấp thông tin chính xác, đầy đủ" về dịch vụ, gồm số lượng, chất lượng, công
  dụng, giá, phí, chi phí, phương thức thanh toán.
- **Điều 37 khoản 1 (giao dịch từ xa, tức bán qua mạng/app):** bên kinh doanh "phải cung cấp chính xác và đầy đủ" các thông tin, trong
  đó có số lượng, chất lượng, công dụng của dịch vụ (điểm c), "cách thức tính phí" (điểm g), chi tiết công dụng và cách sử dụng
  (điểm h).
- **Điều 38 khoản 3–4:** thông tin sai/thiếu trong giao dịch từ xa cho người tiêu dùng quyền chấm dứt trong 30 ngày — đã ghi ở mục
  3.4 của `SUBSCRIPTION_LIFECYCLE_RESEARCH_2026-10-19.md`.

**Suy luận:** "300 lượt luyện AI" là thông tin về "số lượng" và "công dụng" của dịch vụ (Điều 21, 37), và "xem lại không tính lượt"
là một phần "cách thức tính phí" theo nghĩa rộng. Nếu cả hai được ghi rõ trước khi mua thì việc dùng lại câu là đúng với điều đã nói.

### 3.2 Nghị định 55/2024/NĐ-CP (hướng dẫn Luật 19/2023, hiệu lực 01/07/2024)

- Không tìm thấy điều nào về cách mô tả dịch vụ hay hạn mức. Điều 22 (giao dịch từ xa) chỉ đòi công khai quy trình đổi, trả và quy
  trình xử lý khiếu nại [primary, bản chép] [S4].
- Điều 6 (hợp đồng): chữ và nền phải tương phản, bố cục "rõ ràng, dễ theo dõi"; cỡ chữ tối thiểu 12 chỉ áp cho hợp đồng giấy
  [secondary, bài của Bộ Công Thương] [S5].

### 3.3 Luật Quảng cáo 16/2012/QH13, sửa bởi Luật 75/2025/QH15 (hiệu lực 01/01/2026)

- **Điều 8 khoản 9 (hành vi cấm), không bị Luật 75/2025 sửa:** "Quảng cáo không đúng hoặc gây nhầm lẫn về khả năng kinh doanh", khả
  năng cung cấp dịch vụ, và về "số lượng, chất lượng, giá, công dụng" của dịch vụ đã công bố [primary, bản chép] [S7]. Luật 75/2025
  chỉ sửa khoản 3, 10 và bỏ khoản 13 của Điều 8 [primary] [S6].
- **Điều 19 (sửa mới):** khoản 1: "Nội dung quảng cáo phải trung thực, chính xác, rõ ràng" và "không gây hiểu nhầm về tính năng, chất
  lượng, công dụng, tác dụng"; khoản 2: ghi chú, khuyến cáo phải "thể hiện đầy đủ, rõ ràng, dễ tiếp cận", chữ không nhỏ hơn cỡ chữ
  trong quảng cáo [primary] [S6].
- **Điều 19 khoản 3 điểm b (mới):** không coi là "nội dung quảng cáo" các thông tin mà pháp luật bắt buộc phải công bố, gồm "nội dung
  phải công bố công khai và cung cấp cho khách hàng" [primary] [S6].
- Điều 23 mới (quảng cáo trên mạng, áp cho cả ứng dụng): đã ghi ở mục 5.6 của `ADS_INTEGRATION_RESEARCH_2026-10-19.md`.

**Suy luận:** quảng cáo Wordmet chạy ở landing, mạng xã hội, App Store thuộc Luật Quảng cáo; màn hình gói trong app có thể được coi là
thông tin bắt buộc theo Luật 19/2023 (Điều 19 khoản 3 điểm b) hơn là quảng cáo. Ranh giới này cần luật sư. Cả hai luật đều đòi
cùng một thứ: đúng và không gây hiểu nhầm. Một dòng chú thích kiểu "ôn lại câu cũ không tính lượt" phải đủ to và dễ thấy (Điều 19
khoản 2), không giấu ở chữ nhỏ.

### 3.4 Mức phạt

**a) Nghị định 98/2020/NĐ-CP, sửa bởi 17/2022 và 24/2025** (24/2025 ban hành và có hiệu lực 21/02/2025 theo cổng Chính phủ [primary]
[S8]; nội dung đọc ở bản chép [primary, bản chép] [S9]). Tìm kiếm ngày 21/10/2026 không thấy nghị định năm 2026 nào thay thế; các bài
mới nhất vẫn nói về 24/2025 [secondary] [S33].

| Điều | Hành vi (trích ngắn) | Mức phạt ghi trong điều |
|---|---|---|
| 47 khoản 1 điểm a | "Cung cấp thông tin không chính xác hoặc không đầy đủ cho người tiêu dùng" (theo Điều 21 khoản 1 Luật) | 10–20 triệu "đối với thương nhân" |
| 47 khoản 2 điểm a | Lừa dối hoặc gây nhầm lẫn qua thông tin sai lệch, không đầy đủ (theo Điều 10 khoản 1 điểm a Luật) | 20–30 triệu "đối với thương nhân" |
| 47 khoản 6 | Biện pháp khắc phục: "Buộc cải chính thông tin sai sự thật hoặc gây nhầm lẫn" | — |
| 53 khoản 2 điểm c | Giao dịch từ xa: cung cấp không chính xác hoặc không đầy đủ thông tin theo quy định | 20–40 triệu |
| 53 khoản 3 | Gấp hai lần mức khoản 1–2 khi làm trên mạng hoặc khi "cung cấp dịch vụ liên tục thông qua giao dịch từ xa" | ×2 |
| 4 khoản 4 điểm b | Mức ở Chương II là của cá nhân; "do tổ chức thực hiện thì phạt tiền gấp hai lần" | ×2 cho tổ chức |
| 53a | Hành vi của bên vận hành nền tảng số trung gian, nền tảng lớn (50–400 triệu) | **Suy luận:** chỉ áp cho bên vận hành nền tảng, không phải Wordmet |

**Suy luận:** nếu Wordmet đứng tên doanh nghiệp, bán subscription qua app (vừa trên mạng vừa là dịch vụ liên tục), thì lỗi "thông
tin thiếu hoặc sai trong giao dịch từ xa" có thể bị tính 20–40 triệu ×2, rồi ×2 nữa cho tổ chức. Việc ×2 có cộng dồn không, và câu
"đối với thương nhân" ở Điều 47 có bị nhân đôi cho tổ chức không, chưa rõ.

**b) Nghị định 87/2026/NĐ-CP (văn hóa và quảng cáo)**: ban hành 27/03/2026, hiệu lực 15/05/2026 [primary, Công báo] [S10]. Thay
cho Nghị định 38/2021 và 128/2022 theo trang tra cứu [secondary] [S13]; điều hiệu lực chưa đọc được. Nội dung điều khoản đọc ở bản
chép trên trabico.vn, **chưa đối chiếu được với bản thứ hai** [primary, bản chép] [S11].

| Điều | Hành vi (trích ngắn) | Mức phạt (cá nhân) |
|---|---|---|
| 53 khoản 2 điểm a | Nội dung quảng cáo "Không trung thực, không chính xác, không rõ ràng" | 20–40 triệu |
| 53 khoản 2 điểm b | "Gây hiểu nhầm về tính năng, chất lượng, công dụng, tác dụng" của dịch vụ | 20–40 triệu |
| 50 khoản 5 điểm c | "Quảng cáo không đúng hoặc gây nhầm lẫn về khả năng kinh doanh" (Điều 8 khoản 9 Luật) | 80–100 triệu |
| 6 khoản 2, 3 | Mức ghi trong điều "là mức phạt tiền áp dụng đối với cá nhân"; tổ chức "gấp 02 lần" | ×2 cho tổ chức |
| 6 khoản 1 | Trần quảng cáo: 100 triệu (cá nhân), 200 triệu (tổ chức) mỗi hành vi | — |

Báo Chính phủ xác nhận trần 100/200 triệu và khung 80–100 triệu cho quảng cáo sai về khả năng kinh doanh [secondary] [S12]. Một bài
báo khác trích hành vi tương tự ở "Điều 50", không phải Điều 53; số điều cần xem lại trên bản gốc.

**Ví dụ thật:** không tìm thấy vụ app học nào ở Việt Nam bị phạt vì mô tả hạn mức AI. Vụ gần nhất tìm được là trung tâm Anh ngữ Palm
River (Đà Nẵng, 2025) bị phạt 35 triệu cho nhiều lỗi, trong đó có quảng cáo gây hiểu nhầm về mô hình hoạt động [secondary] [S32].

### 3.5 Luật Trí tuệ nhân tạo 134/2025/QH15 (ban hành 10/12/2025, hiệu lực 01/03/2026)

Số hiệu và ngày đọc trên cổng Chính phủ [primary] [S14]; nội dung Điều 11 "Trách nhiệm minh bạch" đọc ở bản chép [primary, bản chép] [S15]:
- Khoản 1: nhà cung cấp làm sao cho "người sử dụng nhận biết khi đang tương tác với hệ thống" AI.
- Khoản 2: âm thanh, hình ảnh, video do AI tạo phải được đánh dấu ở định dạng máy đọc (không nói văn bản).
- Khoản 3: bên triển khai thông báo rõ khi đưa ra công cộng văn bản do AI tạo nếu nội dung "có khả năng gây nhầm lẫn về tính xác thực
  của sự kiện, nhân vật".
- Khoản 6: Chính phủ quy định chi tiết hình thức; chưa tìm thấy nghị định này.

**Suy luận:** câu luyện ("She *reluctantly* agreed…") không mô tả sự kiện hay người thật, nên có vẻ không thuộc khoản 3. Khoản 1 đáng
xem nếu Bước 7 có phần hội thoại với AI. Gắn nhãn "câu do AI viết" không bắt buộc theo cách đọc này nhưng khớp với lời "AI viết câu
luyện" trong gói.

---

## 4. Finding 3 — Quy định của Apple và Google Play

**Apple App Review Guidelines** [primary] [S16]:
- **3.1.2(a):** subscription "you must provide ongoing value to the customer".
- **3.1.2(c) Subscription Information:** trước khi mời mua phải "clearly describe what the user will get for the price"; các ví dụ Apple
  đưa ra là đếm được: bao nhiêu số báo mỗi tháng, bao nhiêu dung lượng.
- **2.3 Accurate Metadata:** mô tả, ảnh chụp phải "accurately reflect the app's core experience".
- **2.3.1(a):** "marketing your app in a misleading way", kể cả quảng bá dịch vụ app không có, là "grounds for removal of your app
  from the App Store" và chấm dứt tài khoản developer; áp cả cho marketing bên ngoài App Store.
- **5.6 Developer Code of Conduct:** app không được "charge for features or content that are not delivered".
- **Trang "Auto-renewable subscriptions":** màn đăng ký phải ghi tên, thời hạn và "the content or services provided during the
  subscription period" [primary] [S17] (đã nêu ở `TRIAL_MODELS_RESEARCH_2026-10-18.md` mục về Apple).
- Diễn đàn developer: lỗi 3.1.2(c) thường do thiếu giá, thiếu link Terms/Privacy hoặc paywall không hiện giá; không tìm thấy vụ nào bị
  từ chối vì cách đếm credit AI [secondary] [S20].

**Google Play** [primary]:
- **Subscriptions policy:** "must not mislead users about any subscription services or content"; phải "communicate clearly in any in-app
  promotions" và trên màn chọn gói [S18].
- **Deceptive Behavior — Misleading Claims:** cấm app có "false or misleading information or claims"; metadata "must precisely reflect
  the app's functionality" [S19].

**Suy luận:** với store, câu hỏi là "màn gói có mô tả đúng cái người dùng nhận được không". Dùng lại câu đúng như đã mô tả thì không
vi phạm điều nào ở trên. Điều có thể chạm 5.6 là ghi "300" mà người dùng không lấy được đủ 300 câu mới (trần hệ thống, công tắc AI)
mà không được báo trước.

---

## 5. Finding 4 — Cách giữ lời ghi trong gói đúng khi app vừa sinh câu mới vừa dùng lại câu cũ

**Mẫu đã thấy ở các app:**

| Mẫu | Ai làm | Nguồn |
|---|---|---|
| Chỉ đếm lần sinh mới; lần chạy lại với đầu vào giống hệt thì dùng kết quả cũ, miễn phí, và **ghi ra trong help** | RemNote (tạo thẻ); ElevenLabs (2 lần sinh lại miễn phí) | [primary] [S21][S28] |
| Sinh một lần cho mỗi mục, ôn lại không tốn lượt; người dùng chọn khi nào hiện | RemNote Flashcard Insights | [primary] [S22] |
| Ghi "Up to" / theo ngày, hoặc "unlimited" kèm hàng rào chống lạm dụng | Speak, ChatGPT, Quizlet | file 19/10 |
| Kho có sẵn không giới hạn, cái mới thì đếm | Chegg (chỉ nguồn thứ cấp) | [secondary] [S29] |
| Sinh lại cũng đếm | Notion AI | file 19/10 |

**Phương án câu chữ cho Wordmet (không chọn; chủ dự án trả lời trước). Tất cả là Suy luận, chưa luật sư duyệt:**

| # | Câu chữ trên màn gói (ví dụ) | Trong app | Được | Mất |
|---|---|---|---|---|
| A | "300 lượt luyện AI mỗi tháng" (giữ như hiện tại) | Không đổi | Ngắn | Không nói "lượt" là gì; không nói điều kiện trần/công tắc; người học có thể nghĩ xem lại cũng trừ lượt, hoặc nghĩ mọi câu đều mới |
| B | "Tối đa 300 câu luyện **mới** do AI viết mỗi tháng. Ôn lại câu đã gặp: không tính lượt." | Câu ôn lại có nhãn "Câu bạn đã gặp" | Khớp đúng cách đếm (mục 3.1, Điều 21, 37); "tối đa" chừa chỗ cho trần và công tắc | Dài hơn; phải hiện bộ đếm còn lại để người học kiểm được |
| C | Như B, và thêm một dòng điều kiện: "AI có thể tạm ngừng khi hệ thống quá tải; lượt chưa dùng…" (cách xử lý lượt khi tạm ngừng là quyết định riêng) | Báo khi AI tạm tắt | Che rủi ro số 3 ở Tóm tắt | Phải chốt thêm chuyện bù lượt; câu điều kiện bất lợi cho người tiêu dùng có thể vướng Điều 25 Luật 19/2023 (chưa đọc hết Điều 25) |
| D | Như B | Hai nút: "Câu mới (−1 lượt)" và "Ôn câu cũ (miễn phí)" | Người học tự chọn, không ai thấy bị "đánh tráo" | Thêm một quyết định UI; không thấy app học nào làm vậy (mục 2), chưa có dữ liệu người học thích hay không |
| E | Không ghi số: "Luyện với câu do AI viết, hạn mức hợp lý" | — | Không bị bắt lỗi con số | Apple 3.1.2(c) đòi mô tả rõ người dùng nhận gì; "hạn mức hợp lý" mơ hồ, có thể bị coi là thông tin "không đầy đủ" (Điều 21) |

**Những chữ nên tránh nếu app có dùng lại câu (Suy luận):** "câu mới mỗi lần", "không bao giờ lặp lại", "không giới hạn", "300 câu
khác nhau"; "viết riêng cho bạn" chỉ đúng khi câu không chia sẻ giữa người học.

**Việc kỹ thuật đi kèm (Suy luận):** giữ log mỗi câu là sinh mới hay xem lại, để khi có khiếu nại thì chứng minh được số câu mới đã giao;
bảo đảm khi còn lượt thì người học luôn lấy được câu mới (app không tự chọn câu cũ thay cho câu mới mà người học muốn).

---

## 6. Luật sư cần xác nhận

1. Bán qua Apple/Google (store là bên thu tiền): Wordmet có còn là "tổ chức, cá nhân kinh doanh" theo Luật 19/2023 không; nếu bán
   qua cổng Việt Nam thì chắc chắn là. Wordmet sẽ đứng tên cá nhân, hộ kinh doanh hay doanh nghiệp (ảnh hưởng mức phạt ×2).
2. Màn gói trong app, landing page, mô tả App Store: cái nào là "quảng cáo" (Luật Quảng cáo, Nghị định 87/2026), cái nào là "thông tin
   bắt buộc" (Luật 19/2023 Điều 21, 37; Luật Quảng cáo Điều 19 khoản 3 điểm b).
3. Ghi "300" mà trần hệ thống hoặc công tắc AI làm người học không nhận đủ: có là "không đúng cam kết" (Điều 10 khoản 1 điểm e) không;
   câu điều kiện nào trong điều kiện giao dịch chung là hợp lệ (Điều 25, chưa đọc hết).
4. Hệ số ×2 của Điều 53 khoản 3 và Điều 4 khoản 4 điểm b Nghị định 98 có cộng dồn không; "đối với thương nhân" ở Điều 47 có được nhân đôi
   cho tổ chức không.
5. Một lời ghi sai bị xử theo Điều 47, Điều 53 Nghị định 98 hay Điều 53 Nghị định 87/2026, và cơ quan nào xử.
6. Số điều và mức phạt Nghị định 87/2026 trên bản gốc Công báo (bản đã đọc là bản chép; một bài báo ghi số điều khác).
7. Luật 134/2025 Điều 11 và nghị định hướng dẫn: câu luyện do AI viết có phải thông báo hay đánh dấu không; khoản 1 có áp cho phần
   luyện có AI chấm hay hội thoại không.
8. Duyệt câu chữ cuối cùng của màn gói, kể cả bản tiếng Anh trên App Store.

---

## 7. Không tìm thấy / không đọc được

- Bản PDF chính thức của Nghị định 87/2026, 24/2025 và Luật 134/2025 là ảnh scan; Luật 19/2023 trên cổng Bình Phước lỗi chứng chỉ.
  Mọi trích dẫn điều khoản của chúng là từ bản chép.
- Không đối chiếu được Điều 50, 53 Nghị định 87/2026 với bản chép thứ hai (luatvietnam.vn bị cắt trước Điều 50).
- Không tìm thấy nghị định hướng dẫn Điều 11 Luật Trí tuệ nhân tạo.
- Trang FTC "Keep your AI claims in check" (02/2023) trả 404 khi đọc; bài báo thuật lại nói FTC hỏi app có phóng đại AI làm được gì
  và có thật dùng AI không [secondary] [S31]. Không dùng làm căn cứ.
- Trang help Duolingo Max không đọc được bằng công cụ; trang Teacher Bee AI tiếng Anh của Prep quá lớn; giá và hạn mức Chegg chỉ có từ
  bài tổng hợp.
- Không tìm thấy vụ app nào (ở Việt Nam hay trên store) bị phạt hoặc gỡ vì dùng lại nội dung AI đã sinh.

---

## Nguồn

Luật Việt Nam
- [S1] Luật 19/2023/QH15, toàn văn — https://caselaw.vn/van-ban-phap-luat/411464-luat-bao-ve-quyen-loi-nguoi-tieu-dung-so-19-2023-qh15-ngay-20-06-2023-cua-quoc-hoi [primary, bản chép]
- [S2] Luật 19/2023, Điều 21 và Điều 4 — https://hethongphapluat.com/luat-bao-ve-quyen-loi-nguoi-tieu-dung-2023/dieu-21 ; https://hethongphapluat.com/luat-bao-ve-quyen-loi-nguoi-tieu-dung-2023/dieu-4 [primary, bản chép]
- [S3] Luật 19/2023, Điều 10 — https://hethongphapluat.com/luat-bao-ve-quyen-loi-nguoi-tieu-dung-2023/dieu-10 [primary, bản chép]
- [S4] Nghị định 55/2024, Điều 22 — https://hethongphapluat.com/nghi-dinh-55-2024-nd-cp-huong-dan-luat-bao-ve-quyen-loi-nguoi-tieu-dung/dieu-22 [primary, bản chép]
- [S5] Bộ Công Thương, điểm mới Nghị định 55/2024 — https://moit.gov.vn/tin-tuc/bao-chi-voi-nguoi-dan/nhung-diem-moi-cua-nghi-dinh-so-55-2024-nd-cp-quy-dinh-chi-tiet-mot-so-dieu-cua-luat-bao-ve-quyen-loi-nguoi-tieu-dung-20.html [secondary]
- [S6] Luật 75/2025/QH15 sửa Luật Quảng cáo, PDF trên cổng TP Hà Nội (trích chữ bằng pdftotext) — https://storage-vnportal.vnpt.vn/gov-hni/7218/VanBan/2025/7/30/LUẬT SỬA ĐỔI BỔ SUNG LUẬT QUẢNG CÁO.pdf [primary]
- [S7] Luật Quảng cáo 16/2012/QH13, PDF (trích chữ bằng pdftotext) — https://apolatlegal.com/wp-content/uploads/2025/07/Luat-quang-cao-2012.pdf [primary, bản chép]
- [S8] Nghị định 24/2025/NĐ-CP, trang văn bản Chính phủ — https://vanban.chinhphu.vn/?pageid=27160&docid=212837 [primary]
- [S9] Nghị định 24/2025/NĐ-CP, toàn văn — https://hethongphapluat.com/nghi-dinh-24-2025-nd-cp-12e432b4306ea59c299ad3f38bb9b0c9.html [primary, bản chép]
- [S10] Nghị định 87/2026/NĐ-CP, Công báo — https://congbao.chinhphu.vn/van-ban/nghi-dinh-so-87-2026-nd-cp-469359/64268.htm ; https://vanban.chinhphu.vn/?classid=1&docid=217695&orggroupid=2&pageid=27160 [primary]
- [S11] Nghị định 87/2026/NĐ-CP, toàn văn — https://trabico.vn/nghi-dinh-87-2026-nd-cp-quy-dinh-xu-phat-hanh-chinh-trong-linh-vuc-van-hoa-va-quang-cao/ [primary, bản chép]
- [S12] Báo Chính phủ, 07/04/2026 — https://baochinhphu.vn/quy-dinh-moi-ve-xu-phat-vi-pham-hanh-chinh-trong-linh-vuc-van-hoa-quang-cao-102260413165337606.htm [secondary]
- [S13] LuatVietnam, trang Nghị định 87/2026 và kết quả tìm kiếm về việc thay thế 38/2021, 128/2022 — https://luatvietnam.vn/vi-pham-hanh-chinh/nghi-dinh-87-2026-nd-cp-xu-phat-vi-pham-hanh-chinh-trong-van-hoa-va-quang-cao-431418-d1.html [secondary]
- [S14] Luật 134/2025/QH15 (Trí tuệ nhân tạo), trang văn bản Chính phủ — https://vanban.chinhphu.vn/?pageid=27160&docid=216334&classid=1&typegroupid=3 [primary]
- [S15] Luật 134/2025, Điều 11 — https://hethongphapluat.com/luat-tri-tue-nhan-tao-2025/dieu-11 [primary, bản chép]

Store
- [S16] Apple App Review Guidelines (3.1.2, 2.3, 2.3.1, 5.6) — https://developer.apple.com/app-store/review/guidelines/ [primary]
- [S17] Apple, Auto-renewable subscriptions — https://developer.apple.com/app-store/subscriptions/ [primary]
- [S18] Google Play, Subscriptions policy — https://support.google.com/googleplay/android-developer/answer/9900533 [primary]
- [S19] Google Play, Deceptive Behavior — https://support.google.com/googleplay/android-developer/answer/9888077?hl=en [primary]
- [S20] Thread về lỗi 3.1.2 — https://developer.apple.com/forums/thread/768364 ; https://community.revenuecat.com/tips-discussion-56/app-rejection-due-3-1-2-business-payment-subscriptions-5405 [secondary]

App
- [S21] RemNote Help, Generating flashcards with AI — https://help.remnote.com/en/articles/10102901-generating-flashcards-with-ai [primary]
- [S22] RemNote Help, Flashcard Insights — https://help.remnote.com/en/articles/10103365-flashcard-insights [primary]
- [S23] Duolingo Blog, LLM viết bài học, 22/06/2023 — https://blog.duolingo.com/large-language-model-duolingo-lessons [primary]
- [S24] Bài về ra mắt Duolingo Max (TechCrunch 14/03/2023 và kết quả tìm kiếm) — https://techcrunch.com/2023/03/14/duolingo-launches-new-subscription-tier-with-access-to-ai-tutor-powered-by-gpt-4 [secondary]
- [S25] Speak Help, Made For You — https://help.speak.com/en/articles/11565779-what-are-made-for-you-custom-lessons [primary]
- [S26] Praktika Help, gói trả phí — https://intercom.help/praktika-ai/en/articles/11684862-what-subscription-plans-does-praktika-offer-and-what-is-included-in-the-paid-plan [primary]
- [S27] Prep, Teacher Bee AI (đoạn trích tìm kiếm; trang không tải được) — https://prepedu.com/en/news/teacher-bee-ai-by-prep [secondary]
- [S28] ElevenLabs Help, quota mỗi lần sinh — https://elevenlabs.io/docs/help-center/account/general/do-i-use-quota-on-every-generation [primary]
- [S29] Bài tổng hợp về gói Chegg Study — https://www.thepricer.org/how-much-does-chegg-cost/ [secondary]
- [S30] Knowji trên App Store (qua kết quả tìm kiếm) — https://appfollow.io/ios/knowji-vocab-6-audio-visual-vocabulary-flashcards-with-spaced-repetition/580342893?country=us [secondary]
- [S31] Bài thuật lại blog FTC 02/2023 — https://www.marketingdive.com/news/ftc-AI-warning-OpenAI-ChatGPT-advertising/643739/ [secondary]

Khác
- [S32] Giáo dục Việt Nam, Sở GD&ĐT Đà Nẵng phạt Palm River Academy — https://giaoduc.net.vn/so-gddt-da-nang-xu-phat-trung-tam-anh-ngu-palm-river-academy-post255458.gd [secondary, chỉ đoạn trích tìm kiếm]
- [S33] Cổng Nghệ An, bài về Nghị định 24/2025 (đại diện cho kết quả tìm kiếm "nghị định 2026 thay thế 98/2020") — https://hcc.nghean.gov.vn/tin-tong-hop/nghi-dinh-24-2025-nd-cp-sua-doi-bo-sung-quy-dinh-xu-phat-vi-pham-hanh-chinh-bao-ve-quyen-loi-nguoi-tieu-dung-2084.html [secondary]

Tài liệu trong repo
- `docs/preparation/AI_QUOTA_BENCHMARK_RESEARCH_2026-10-19.md` — bảng hạn mức AI các app (Speak, Quizlet, ChatGPT, Notion, Memrise, ELSA, Prep…).
- `docs/preparation/SUBSCRIPTION_LIFECYCLE_RESEARCH_2026-10-19.md` mục 3.4 — Luật 19/2023 Điều 38, 41, 42 (dịch vụ liên tục, chấm dứt, hoàn tiền).
- `docs/preparation/ADS_INTEGRATION_RESEARCH_2026-10-19.md` mục 5.6 — Luật 75/2025 Điều 23 (quảng cáo trên mạng).
- `docs/preparation/TRIAL_MODELS_RESEARCH_2026-10-18.md` — công bố bắt buộc trên màn đăng ký của Apple.
- `docs/superpowers/specs/2026-10-19-buoc-5-entitlements-design.md` (D2, D18) — 300 lượt bài AI, trần 1.000 lượt/ngày, công tắc AI.
