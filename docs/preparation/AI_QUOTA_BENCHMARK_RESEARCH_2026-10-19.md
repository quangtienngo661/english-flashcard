# Hạn mức AI ở các app học và app lân cận — desk research (19/10/2026)

Mục đích: cho chủ dự án Wordmet dữ liệu tham chiếu để tự trả lời câu "300 câu luyện AI/tháng và 100 lượt tra AI/tháng
cho Pro có hợp lý không". Tài liệu chỉ mô tả và so sánh, **không chọn con số** (quy tắc dự án: chủ dự án trả lời trước).

Cách làm: chỉ đọc trang công khai ngày 19/10/2026; không đăng ký, không điền form. Một số trang chặn công cụ đọc tự động
(HTTP 403/404) nên được đọc bằng trình duyệt tích hợp; máy đọc ở Việt Nam nên vài trang tự hiện giá VND. Hồ sơ SEC của
Duolingo là văn bản chính công ty viết (thư gửi cổ đông), đọc trên sec.gov, được xếp vào nhãn chính thức.

**Nhãn nguồn (bắt buộc):** **CT** = Đã đọc (chính thức), đọc trên site của chính công ty trong phiên này; lời quảng cáo của
công ty vẫn là CT nhưng không có nghĩa là đã kiểm chứng trong app. **TC** = Thứ cấp: bài bên thứ ba, review, snippet tìm
kiếm, trang App Store VN (danh sách giá không ghi kỳ hạn); chưa đối chiếu chéo. **SL** = Suy luận của người viết.
Mỗi khẳng định trỏ tới một nguồn `[S#]`; danh sách URL ở cuối file.

Số liệu đầu vào của Wordmet lấy từ brief của phiên (chưa phải quyết định): Pro có 300 câu luyện AI/tháng (~10/ngày) và
100 lượt tra AI/tháng (~3/ngày), reset theo ngày bắt đầu gói, không cộng dồn; trial 7 ngày cần thẻ, cùng hạn mức; Free
không có AI; luyện không-AI: Free 3 phiên/ngày, Pro 30 phiên/ngày, tối đa 20 câu/phiên; chi phí ~9đ/đơn vị (Haiku 5.5)
hoặc ~176đ/đơn vị (Sonnet 5.5).

---

## 1. Tóm tắt

1. **Rất ít app học ngôn ngữ công bố con số AI cụ thể.** Duolingo Max, Praktika, ELSA Premium, Knowt, Speak Premium Plus
   chỉ ghi "unlimited" hoặc không ghi gì (CT). Ai công bố số thì dùng đơn vị "lượt" hoặc "credit/token" theo tháng.
2. **Các con số công bố nằm rải rộng:** Grammarly 100 / 1.000 / 2.000 prompt mỗi tháng (Free / Premium / Pro); RemNote
   50 / 500 lượt AI mỗi tháng (Free / Pro); Mochi Cards Pro 1.000 lượt tra từ điển và 500.000 token AI mỗi tháng (CT).
3. **Hai app gần Wordmet nhất giới hạn theo ngày, không theo tháng:** Speak Premium tối đa 3 bài AI "Made For You" mỗi ngày;
   Readlang Free 10 lượt dịch cụm từ và 10 lượt giải thích ngữ cảnh mỗi ngày (CT).
4. **So với các mốc đó, 300 câu/tháng của Wordmet nằm giữa** Grammarly Free (100) và RemNote Pro (500); **100 lượt tra/tháng
   ngang Grammarly Free** và bằng 1/10 số lượt tra từ điển (không AI) của Mochi Pro (SL).
5. **"Unlimited" thường có hàng rào ẩn:** ChatGPT ghi "subject to abuse guardrails"; Quizlet ghi "Daily limits may be
   triggered for security purposes"; Speak hiện popup mời nâng gói khi dùng Tutor quá một ngưỡng không công bố (CT).
6. **Chi phí AI của Wordmet nhỏ hay lớn phụ thuộc vào model nhiều hơn vào con số hạn mức:** dùng hết 400 đơn vị mỗi tháng
   tốn ~3.600đ với Haiku 5.5 hay ~70.400đ với Sonnet 5.5, tức ~1–4% hay ~28–70% giá một gói 100.000–250.000đ/tháng (SL).
7. **Cách các công ty giữ chi phí AI dưới giá gói:** tách AI lên gói đắt hơn (Duolingo Max, Speak Premium Plus, RemNote Pro
   with AI); tặng một khoản tín dụng xấp xỉ giá gói (Cursor, GitHub); hạ giá vốn AI rồi mới mở rộng (Duolingo) (CT).
   Không tìm thấy công ty nào công bố quy tắc kiểu "người dùng nặng nhất tốn tối đa X% giá gói".
8. **Không có dữ liệu công khai về phân bố sử dụng trong app học từ** (trung vị, người dùng nặng, % chạm giới hạn). Chỉ có
   hãng AI nói: Anthropic ước tính giới hạn tuần chạm dưới 5% người đăng ký (TC); Cursor nói "vast majority" không dùng hết (CT).
9. **Đối thủ Việt Nam đáng chú ý:** Prep ra mắt Prep Vocab (28/08/2026), tự nhận "hoàn toàn miễn phí", có từ điển theo ngữ
   cảnh và bài đặt câu; không công bố hạn mức AI (CT).

---

## 2. Bảng so sánh hạn mức AI

Cột: đơn vị · lượng theo gói · reset · khi chạm giới hạn · giá. "—" = không tìm thấy thông tin công bố.

| App / tính năng | Đơn vị | Lượng theo gói | Reset | Khi chạm giới hạn | Giá |
|---|---|---|---|---|---|
| Duolingo Max: Roleplay, Video Call, Explain My Answer | — | Help center và blog ra mắt không ghi số nào (CT [S1][S2]); blog 2023 ghi "unlimited access to Video Call" chỉ theo snippet tìm kiếm (TC) | — | — | Không có giá trên trang chính thức đã đọc; App Store VN chỉ liệt kê Super 599.000–860.000đ, không có mục "Max" (TC [S7]) |
| Duolingo Video Call (2026) | — | Q4/2025: công ty báo sẽ chuyển Video Call vào gói Super; Q2/2026: "most new Super Duolingo subscribers now have access to Video Call" (CT [S5][S3]) | — | — | Super (giá như trên) |
| Speak Premium / Premium Plus | Bài "Made For You"; bài cá nhân của Speak Tutor | Premium: "Up to 3/day" bài Made For You; Tutor: "Daily limit", không ghi số. Premium Plus: "Unlimited" cả hai (CT [S9], 07/11/2025) | Theo ngày (CT [S9]) | Khi dùng Tutor quá một ngưỡng, app hiện popup mời nâng lên Premium Plus; ngưỡng không công bố (CT [S10]) | Trang chính thức không ghi giá, chỉ "most accurate pricing is always within the app" (CT [S8]). App Store VN: Premium 249.000đ/tháng, 1.299.000đ/năm; Premium Plus 499.000đ/tháng, 2.349.000đ/năm (TC [S11]) |
| ELSA Speak: AI Chats, role-play | — | Site VN: "Trò chuyện cùng AI (AI Chats)" ở Free "Bị giới hạn", Premium không bị giới hạn (CT [S12]). Trang ELSA quốc tế: "AI role-play" Free "Limited", Premium "Unlimited" (CT [S13]). Một trang Nhật ghi Pro "3回" hội thoại AI, chưa rõ nghĩa (TC [S44]) | — | — | Site VN (đang khuyến mãi 20/10): Premium 1 năm 2.745.000đ, Premium trọn đời 6.800.000đ (CT [S12]); quốc tế $159.99/năm (CT [S13]) |
| Praktika (gia sư AI) | — | Gói trả phí: "unlimited speaking practice with AI tutors", "no time limits"; không nêu fair-use (CT [S15]) | — | — | "~$8/ month" (CT [S14]) |
| Memrise (luyện nói AI) | Phiên luyện nói | Free: "limited to one session per day"; Pro: "Unlimited speaking practice" (CT [S22]). App Store ghi Free "2 conversations per day" — mâu thuẫn với trang chính thức (TC [S23]) | Theo ngày | — | 280.000đ/tháng; 1.199.000đ/năm; trọn đời 1.619.700đ (CT [S22], giá VND theo vị trí) |
| Quizlet: Study Guides (AI) | — | Free: "limited access", không ghi số; Plus và Plus Unlimited: "unlimited access" (CT [S17]) | — | — | Plus $35.99/năm, Plus Unlimited $44.99/năm (CT [S16]) |
| Quizlet Plus: Q&A / textbook solutions, practice tests | Lượt | Plus: "3 Q&A or textbook solutions / month", "3 practice tests per month", "20 rounds of Learn questions / month"; Plus Unlimited: không giới hạn (CT [S16]) | Theo tháng | "Daily limits may be triggered for security purposes" (CT [S16]) | Như trên; trial 7 ngày chỉ cho gói năm (CT [S16]) |
| Knowt Ultra (AI summarizer, AI voice tutor…) | — | Không ghi số (CT [S18]) | — | — | $149.99/năm hoặc $24.99/tháng; trial 3 ngày (CT [S18]) |
| RemNote | AI credit (~2 credit mỗi lượt) | Free 250 credits (~50 lượt/tháng); Pro 1.000 credits (~500 lượt); Pro with AI 20.000 credits ("Nearly Unlimited"). Tạo thẻ từ văn bản: 5 / 50 / 1.000 (CT [S19]) | "per month", không ghi ngày reset (CT [S19]) | Không ghi (CT [S19]) | Pro $8/tháng ($96/năm); Pro with AI $18/tháng ($216/năm) (CT [S19]) |
| Mochi Cards | Token AI; lượt tra từ điển; ký tự dịch… | Free / Pro mỗi tháng: AI 5.000 / 500.000 tokens; từ điển 20 / 1.000 lượt; dịch 1.000 / 100.000 ký tự; TTS 200 / 200.000 ký tự (CT [S20]) | Theo tháng lịch, reset ngày 1, không cộng dồn (CT [S20]) | Chỉ dịch vụ đó dừng tới kỳ reset, thẻ đã tạo vẫn còn; "Contact us if you need higher limits" (CT [S20]) | Pro $5/tháng (trả theo năm) (CT [S20]) |
| Brainscape (AI tạo thẻ) | Thẻ | Free: "Use AI to make 100s of flashcards" (không ghi số); Pro: "unlimited flashcards" (CT [S21]) | — | — | Pro $7.99/tháng, kỳ hạn ghi không rõ (CT [S21]) |
| Readlang (đọc và tra từ) | Lượt dịch cụm từ; lượt giải thích ngữ cảnh | Free: dịch từ đơn không giới hạn; "10 phrase translations per day"; "10 context explanations per day". Premium: không giới hạn (CT [S31]) | Theo ngày | — | Premium $6/tháng hoặc $48/năm; Premium Plus $15/tháng ("advanced AI model") (CT [S31]) |
| LingQ (lưu từ khi đọc, không phải AI) | Từ/cụm từ lưu | Free: "Free accounts can only create 20 LingQs" (tổng, không theo ngày) (CT [S32]) | Không reset | "you must upgrade your account in order to create more" (CT [S32]) | Trang giá chính thức không đọc được (404); giá $14.99/tháng chỉ từ snippet (TC) |
| Grammarly | Prompt | Free 100; Premium 1.000; Pro/Plus/Business/Education 2.000 mỗi tháng; Enterprise "Unlimited" (CT [S24][S25]) | Mỗi tháng, theo **ngày tài khoản bắt đầu có AI**, không theo tháng lịch (CT [S25]) | Hiện "0 prompts"; gói trả phí được bảo liên hệ support (CT [S25]). AI Chat riêng: 1.000 prompt/ngày (chỉ snippet, TC [S26]) | Pro $12, kỳ hạn không rõ trong bản đọc được (CT [S24]) |
| Notion AI | "AI response" | Free và Plus: "Trial of Notion AI" (CT [S27]); số lượt trial không công bố; mỗi lần bấm "Try again" tính thêm một response (CT [S28]). Business/Enterprise: "unlimited usage of Notion AI" (CT [S29]) | Không reset trial (CT [S28]) | Hiện thông báo phải nâng lên Business/Enterprise (CT [S28]) | Plus $10, Business $20 mỗi thành viên/tháng; Custom Agents "$10 per 1,000 monthly Notion credits" (CT [S27]) |
| ChatGPT | Tin nhắn | Free: "Unlimited text chats with GPT-6" kèm "subject to abuse guardrails"; upload, ảnh, voice, deep research "Limited". Go/Plus: "More…", "Expanded…", không ghi số (CT [S30]) | — | — | VN: Go 132.000đ/tháng, Plus 522.500đ/tháng, Pro từ 2.849.000đ/tháng (CT [S30]) |
| Prep (VN): Prep Vocab, Teacher Bee AI | — | Prep Vocab: "hoàn toàn miễn phí", có từ điển ngữ cảnh, quét ảnh ra từ, 20 dạng bài kể cả đặt câu; không ghi hạn mức (CT [S33], 28/08/2026). Trang Teacher Bee (02/12/2024) không ghi hạn mức (CT [S34]) | — | — | Không thấy giá trên hai trang đã đọc |
| MochiMochi, eJOY (VN) | — | Không tìm thấy trang công bố hạn mức AI | — | — | — |

---

## 3. Hành vi người học (số dùng để ước hạn mức)

**Số câu/thẻ mỗi ngày**

- Anki: "If you are consistently learning 20 new cards a day, you can expect your daily reviews to be roughly about
  200 cards/day" (CT [S35]). Trang này không ghi giá trị mặc định của "New cards/day" (CT [S35]).
- Speak Premium cho tối đa 3 bài AI "Made For You" mỗi ngày (CT [S9]); Memrise Free cho 1 phiên luyện nói AI mỗi ngày (CT [S22]);
  Readlang Free cho 10 lượt giải thích ngữ cảnh mỗi ngày (CT [S31]). Đây là mức các công ty coi là "đủ để dùng thử / dùng
  vừa", không phải số đo hành vi.
- Không tìm thấy số liệu công khai về số câu luyện trung bình mỗi ngày hay mỗi phiên ở Duolingo, Quizlet hay app từ vựng
  khác. Nghiên cứu Duolingo của Loewen et al. (2019) chỉ có 9 người học và bản đầy đủ bị khoá phí (TC, snippet).
- **SL:** một học viên Pro học 1 phiên 20 câu mỗi ngày, nửa số câu là AI, thì dùng đúng ~300 câu AI/tháng. Hạn mức không-AI
  của Pro (30 phiên × 20 câu = 600 câu/ngày) lớn hơn 60 lần mức 10 câu AI/ngày.

**Số từ mới tự thêm**

- Bài tổng quan học thuật về người học EFL ở Thái Lan kết luận "students should learn approximately 10-20 new words per
  week"; trích McCarthy (1996) "approximately 5-15 new words each week" (TC [S36], Liangpanit, 2013). Đây là **mức nên học**,
  không phải số từ người học thực tế gặp hay lưu.
- Một nghiên cứu hành động ở đại học Nhật yêu cầu sổ từ vựng "ten new words each week" (TC [S43], chỉ snippet).
- App đọc-và-lưu-từ đặt mức Free rất thấp: LingQ 20 từ lưu tổng cộng (CT [S32]); Mochi 20 lượt tra từ điển/tháng ở Free,
  1.000 ở Pro (CT [S20]); Readlang 10 cụm từ/ngày ở Free (CT [S31]).
- **SL:** nếu học viên thêm 10–20 từ ngoài danh mục mỗi tuần thì cần ~43–86 lượt tra/tháng; người đọc nhiều tài liệu
  ngoài (kiểu người dùng LingQ/Readlang) có thể vượt xa. Số lượt tra AI thật còn phụ thuộc bao nhiêu từ người học gặp đã có
  sẵn trong danh mục 7.799 mục của Wordmet; chưa ai đo con số này.

**Phân bố sử dụng (trung vị, người dùng nặng, % chạm giới hạn)**

- Không tìm thấy app học ngôn ngữ nào công bố. Bộ dữ liệu log Anki 10k (FSRS) có thể tính được nhưng phải đồng ý điều khoản
  để tải; không làm (TC, snippet).
- Hãng AI: Anthropic "We estimate they'll apply to less than 5% of subscribers based on current usage" về giới hạn tuần
  (28/07/2025, bài X được Simon Willison chép lại, TC [S39]). Cursor: "the vast majority of Pro users do not run out of their
  included usage"; "the hardest requests cost an order of magnitude more than simple ones" (CT [S37], 04/07/2025).
- Duolingo Q2/2026: DAU 58,7 triệu, MAU 140,6 triệu, người trả phí 12,7 triệu (CT [S3]). **SL:** ~42% người dùng tháng
  vào app mỗi ngày; ~9% trả phí. Cuối 2024, gói Max (có AI) chiếm 5% người trả phí (CT [S4]).

---

## 4. Cách giữ chi phí AI dưới giá gói

Không công ty nào đã đọc công bố một quy tắc kiểu "người dùng nặng tốn tối đa X% giá gói". Các cách thấy được:

1. **Tách AI lên gói đắt hơn.** Duolingo Max là "a new subscription tier above Super Duolingo" (CT [S2]); Speak Premium Plus
   (Tutor không giới hạn) đắt gần gấp đôi Premium trên App Store VN (TC [S11]); RemNote "Pro with AI" $18 so với Pro $8, cho
   20 lần credit (CT [S19]); Notion chỉ cho dùng thử AI ở Free/Plus, AI đầy đủ nằm trong Business $20 (CT [S27][S29]).
2. **Tặng một khoản tín dụng bằng hoặc hơn giá gói, rồi tính tiền phần vượt.** Cursor Pro gồm "$20 of frontier model usage
   per month at API pricing", vượt thì có "short grace period" rồi trả thêm "at cost" (CT [S37]). GitHub Copilot Pro $10 có
   $10 credit cơ bản + $5 "flex", "1 AI credit = $0.01 USD", reset hằng tháng, hết thì đặt ngân sách trả thêm (CT [S38]).
3. **Hạn mức số lượt theo tháng/ngày.** Grammarly, Mochi, RemNote, Readlang, Speak (bảng mục 2).
4. **"Unlimited" kèm hàng rào chống lạm dụng.** ChatGPT, Quizlet, popup ngưỡng của Speak (bảng mục 2).
5. **Hạ giá vốn mỗi lượt rồi mới mở rộng.** Duolingo Q4/2024: biên lợi nhuận gộp giảm vì "increased generative AI costs due
   to the increased adoption of Duolingo Max", tăng biên chậm lại vì "the variable costs associated with Video Call"
   (CT [S4]). Q1/2026: biên tăng 190 bps lên 73,0% nhờ "continued reductions in per-unit AI costs" (CT [S6]). Rồi công ty
   chuyển Video Call xuống gói Super, cho "about ten times as many learners", và chấp nhận biên gộp giảm về ~69–71%
   (CT [S5][S3]).
6. **Khi tính sai, công ty phải sửa giá hoặc thêm giới hạn.** Sam Altman nói OpenAI lỗ ở gói ChatGPT Pro $200 vì "people use
   it much more than we expected" (01/2025, TC [S40]). Cursor đổi từ tính theo request sang tính theo chi phí API vì request
   khó tốn gấp ~10 lần request dễ (CT [S37]). Anthropic thêm giới hạn tuần nhắm vào người chạy "24/7" (TC [S39]).

**Giá vốn AI tham chiếu (đọc lại 19/10/2026):** Claude Haiku 5.5 $0.10 input / $0.50 output mỗi triệu token (prompt
≤ 100.000 token); Sonnet 5.5 $2 / $10; Batch API giảm 50% cả hai chiều (CT [S41]). **SL:** 600 input + 500 output token
tốn ~$0.00031 với Haiku và ~$0.0062 với Sonnet; con số 9đ và 176đ của brief tương ứng tỷ giá ~28.400đ/USD (tỷ giá chưa kiểm).

---

## 5. Hệ quả cho hai con số của Wordmet

**Đặt cạnh mốc của người khác (quy về mỗi ngày, SL):**

| Mốc | Đơn vị/tháng | ≈ mỗi ngày |
|---|---|---|
| Wordmet nháp: câu luyện AI | 300 | 10 |
| Wordmet nháp: tra AI | 100 | 3,3 |
| Grammarly Free / Premium / Pro (CT [S25]) | 100 / 1.000 / 2.000 | 3 / 33 / 67 |
| RemNote Free / Pro (CT [S19]) | ~50 / ~500 | 1,7 / 17 |
| Mochi Pro: tra từ điển (không AI) (CT [S20]) | 1.000 | 33 |
| Mochi Pro: 500.000 token AI, quy ra ~1.100 token/đơn vị như Wordmet (SL) | ~450 | ~15 |
| Readlang Free: giải thích ngữ cảnh (CT [S31]) | ~300 | 10 |
| Speak Premium: bài Made For You (CT [S9]) | ~90 | 3 |
| Quizlet Plus: Q&A / textbook solutions (CT [S16]) | 3 | 0,1 |
| Praktika, ELSA Premium, Speak Premium Plus, Duolingo (CT) | "unlimited" / không ghi | — |

**Chi phí khi một người Pro dùng hết 400 đơn vị/tháng (SL, từ đơn giá của brief):**

| Model | Hết hạn mức | Nếu mỗi câu luyện phải sinh 2 lần (sinh lại khi câu bị loại) |
|---|---|---|
| Haiku 5.5 | ~3.600đ | ~6.300đ |
| Sonnet 5.5 | ~70.400đ | ~123.200đ |

So với giá các gói có AI tại VN (đã đọc): Memrise ~99.900đ/tháng nếu trả năm, 280.000đ/tháng (CT); Speak Premium
~108.000đ/tháng nếu trả năm, 249.000đ/tháng (TC); ELSA Premium ~228.750đ/tháng nếu trả năm (CT); ChatGPT Go 132.000đ (CT).
Ở giá 100.000–250.000đ/tháng, chi phí dùng hết bằng ~1,4–3,6% giá gói với Haiku, ~28–70% với Sonnet (SL; chưa trừ phí cửa
hàng ứng dụng/cổng thanh toán và thuế — xem `PAYMENT_PROVIDERS_RESEARCH_2026-10-18.md`).

**Trade-off, trình bày trung lập (SL):**

- **Con số cao hơn:** ít người chạm giới hạn và bực (ý 6 phần Tóm tắt của `FREE_PLAN_LIMITS_RESEARCH_2026-10-18.md` ghi các vụ
  phàn nàn khi giới hạn chặn người học hăng); dễ so với các đối thủ ghi "unlimited" và Prep Vocab tự nhận miễn phí. Đổi lại, rủi ro
  chi phí tăng mạnh nếu dùng model cỡ Sonnet, và người dùng nặng chiếm phần lớn chi phí (mẫu Cursor/OpenAI).
- **Con số thấp hơn:** chi phí dễ đoán hơn; nhưng 100 lượt tra/tháng ngang gói Free của Grammarly và thấp hơn Readlang Free
  (~300 lượt giải thích/tháng), có thể bị cảm nhận là ít với người đọc nhiều tài liệu ngoài.
- **Hạn mức tháng hay ngày:** hạn mức tháng cho phép học dồn (người học ôn thi), nhưng người dùng trial 7 ngày có thể dùng hết
  cả 400 đơn vị trong một tuần; hạn mức ngày (Speak, Readlang, Memrise) chặn việc dồn nhưng gây khó chịu cho ngày học nhiều.
  Có nơi dùng cả hai (Grammarly: tháng cho prompt, ngày cho AI Chat — phần ngày chỉ là TC).
- **Đếm cả lượt bị bỏ:** Notion cũng đếm mỗi lần "Try again" là một response (CT [S28]); việc đếm lượt tra dù gợi ý bị bỏ có
  tiền lệ, nhưng làm hạn mức "hết nhanh" hơn cảm nhận của người dùng.
- **Khi chạm giới hạn:** các mẫu đã thấy là chỉ dừng riêng tính năng đó (Mochi), mời nâng gói (Notion, Speak), cho trả thêm
  (Cursor, GitHub), hoặc bảo liên hệ support (Grammarly, Mochi). Wordmet đã có luyện không-AI để người học quay về.
- **Chi phí phụ thuộc model nhiều hơn con số:** chênh Haiku/Sonnet là ~20 lần, lớn hơn mọi chênh lệch hạn mức trong bảng trên.

---

## 6. Câu hỏi còn mở / trang không đọc được

- **Duolingo:** `duolingo.com/max` chuyển về trang chủ, không có nội dung Max; giá Max không có trên trang chính thức đã đọc.
  File PDF thư cổ đông trên `investors.duolingo.com` là file tải xuống, không đọc được (dùng bản trên sec.gov thay thế). Câu
  "higher pricing more than offsets these costs" của Max chỉ thấy trong transcript bên thứ ba, chưa đọc gốc (TC [S45]).
- **Speak:** `speak.com/pricing` 404; số "Daily limit" của Tutor ở Premium và ngưỡng popup không công bố.
- **ELSA:** `elsaspeak.com/en/pricing` 404; giới hạn AI của Free/Pro chỉ ghi "Bị giới hạn"/"Limited", không có số.
- **Quizlet:** không có con số cho lượt AI của Free; Q-Chat và Magic Notes không có trên trang giá hiện tại.
- **ChatGPT:** `help.openai.com` 403; trang giá không ghi số tin nhắn của Go/Plus.
- **Notion:** trang help về đổi giá 2025 404; số lượt trial AI không công bố.
- **LingQ:** trang giá 404 (giá chỉ từ snippet). **Grammarly:** giới hạn 1.000 prompt/ngày của AI Chat chỉ từ snippet.
- **Memrise:** trang chính thức ghi 1 phiên/ngày, App Store ghi 2 hội thoại/ngày; chưa rõ bên nào mới hơn.
- **App Việt Nam:** không tìm thấy trang hạn mức AI của MochiMochi và eJOY; Prep không công bố hạn mức cho Prep Vocab và
  Teacher Bee AI; chưa đọc giá Prep Vocab trên App Store.
- **Hành vi người học:** chưa có số đo công khai về trung vị câu luyện/ngày, số từ tự thêm/ngày hay % người chạm giới hạn trong
  app học từ; bài Prichard (2008) về tra từ khi đọc chưa đọc được số liệu; Loewen et al. (2019) bị khoá phí.
- **Wordmet tự đo được:** tỷ lệ từ người học gặp đã có trong danh mục (quyết định số lượt tra AI thật), tỷ lệ câu AI bị loại
  phải sinh lại (quyết định chi phí thật mỗi câu giao được), và phân bố sử dụng trong pilot.
- **Chưa kiểm:** tỷ giá ~28.400đ/USD ngầm trong đơn giá của brief; phí cửa hàng ứng dụng/cổng thanh toán.

---

## Nguồn

- [S1] Duolingo Help, "What is Duolingo Max?" — https://www.duolingo.com/help/what-is-duolingo-max (CT, trình duyệt)
- [S2] Duolingo Blog, ra mắt Duolingo Max, 14/03/2023 — https://blog.duolingo.com/duolingo-max/ (CT)
- [S3] Duolingo, thư cổ đông Q2/2026 (SEC 8-K) — https://www.sec.gov/Archives/edgar/data/0001562088/000162828026053299/q2fy26duolingo6-30x26share.htm (CT)
- [S4] Duolingo, thư cổ đông Q4/FY2024 — https://www.sec.gov/Archives/edgar/data/1562088/000156208825000039/q4fy24duolingo12-31x24shar.htm (CT)
- [S5] Duolingo, thư cổ đông Q4/FY2025 — https://www.sec.gov/Archives/edgar/data/1562088/000162828026012246/q4fy25duolingo12-31x25shar.htm (CT)
- [S6] Duolingo, thư cổ đông Q1/2026 (04/05/2026) — https://www.sec.gov/Archives/edgar/data/1562088/000162828026029790/q1fy26duolingo3-31x26share.htm (CT)
- [S7] App Store VN, Duolingo — https://apps.apple.com/vn/app/duolingo-language-lessons/id570060128 (TC)
- [S8] Speak, trang chủ và FAQ — https://www.speak.com/ (CT)
- [S9] Speak Help, Premium vs Premium Plus — https://help.speak.com/en/articles/5358417-what-s-the-difference-between-premium-and-premium-plus (CT)
- [S10] Speak Help, nâng gói — https://help.speak.com/en/articles/6853161-how-can-i-upgrade-my-subscription (CT)
- [S11] App Store VN, Speak — https://apps.apple.com/vn/app/speak-language-learning/id1286609883 (TC)
- [S12] ELSA Speak VN, trang Premium — https://vn.elsaspeak.com/nova/ (CT, trình duyệt)
- [S13] ELSA, trang sản phẩm (footer "© 2026 ELSA") — https://elsanow.io/en/product (CT)
- [S14] Praktika, trang chủ — https://praktika.ai/ (CT)
- [S15] Praktika Help, gói đăng ký — https://intercom.help/praktika-ai/en/articles/11684862-what-subscription-plans-does-praktika-offer-and-what-is-included-in-the-paid-plan (CT)
- [S16] Quizlet, trang nâng cấp — https://quizlet.com/upgrade (CT, trình duyệt)
- [S17] Quizlet Help, Study Guides — https://help.quizlet.com/hc/en-us/articles/18312306436365-Studying-with-Study-Guides (CT, trình duyệt)
- [S18] Knowt, gói — https://knowt.com/plans (CT)
- [S19] RemNote, giá — https://www.remnote.com/pricing (CT)
- [S20] Mochi Cards, giá — https://mochi.cards/pricing (CT)
- [S21] Brainscape, giá — https://www.brainscape.com/pricing (CT)
- [S22] Memrise, gói (giá VND) — https://app.memrise.com/payment/plans (CT, trình duyệt)
- [S23] Bản sao mô tả App Store của Memrise — https://appfollow.io/ios/memrise-easy-language-learning/635966718?country=us (TC, snippet)
- [S24] Grammarly, gói — https://www.grammarly.com/plans (CT)
- [S25] Grammarly Support, "You're out of prompts" — https://support.grammarly.com/hc/en-us/articles/17776038294285-Error-message-You-re-out-of-prompts (CT)
- [S26] Grammarly Support, AI Chat — https://support.grammarly.com/hc/en-us/articles/32955241736973-Introducing-AI-Chat (TC, chỉ snippet)
- [S27] Notion, giá — https://www.notion.com/pricing (CT)
- [S28] Notion Help, complimentary AI responses — https://www.notion.com/help/complimentary-ai-responses (CT)
- [S29] Notion Releases, 13/05/2025 — https://www.notion.com/releases/2025-05-13 (CT)
- [S30] ChatGPT, giá (hiện VND) — https://chatgpt.com/pricing (CT, trình duyệt)
- [S31] Readlang, giá — https://readlang.com/pricing (CT)
- [S32] LingQ Support, giới hạn LingQ — https://lingq-support.groovehq.com/help/what-is-the-lingqs-limit (CT)
- [S33] Prep, ra mắt Prep Vocab, 28/08/2026 — https://prepedu.com/vi/news/ra-mat-prep-vocab (CT, trình duyệt)
- [S34] Prep, Teacher Bee AI, 02/12/2024 — https://prepedu.com/vi/news/teacher-bee-ai-giao-vien-ai (CT, trình duyệt)
- [S35] Anki Manual, Deck Options — https://docs.ankiweb.net/deck-options.html (CT)
- [S36] Liangpanit (2013), "Integrating Vocabulary into an English Course in the Thai Context for Thai EFL Learners" — https://so06.tci-thaijo.org/index.php/edujournal_nu/article/download/9232/8352/19276 (TC, bài tổng quan học thuật)
- [S37] Cursor Blog, "Clarifying our pricing", 04/07/2025 — https://cursor.com/blog/june-2025-pricing (CT)
- [S38] GitHub Copilot, gói — https://github.com/features/copilot/plans (CT)
- [S39] Simon Willison chép bài X của Anthropic, 28/07/2025 — https://simonwillison.net/2025/Jul/28/anthropic/ (TC)
- [S40] Fortune, Altman về ChatGPT Pro lỗ, 07/01/2025 — https://fortune.com/2025/01/07/sam-altman-openai-chatgpt-pro-subscription-losing-money-tech (TC, snippet)
- [S41] Claude API, Pricing — https://platform.claude.com/docs/en/about-claude/pricing (CT)
- [S43] Nghiên cứu sổ từ vựng ở đại học Nhật — https://lir.byuh.edu/index.php/Issue1/article/download/23/18/35 (TC, chỉ snippet)
- [S44] Miralab, giá ELSA ở Nhật — https://miralab.co.jp/media/elsa-speak/ (TC, snippet)
- [S45] Transcript cuộc gọi Q4/2024 của Duolingo (Motley Fool) — https://www.fool.com/earnings/call-transcripts/2025/02/27/duolingo-duol-q4-2024-earnings-call-transcript/ (TC, snippet)
