# Research chữ giao diện app người học: tiếng Anh và tiếng Việt (22/10/2026)

Mục đích: chuẩn bị chữ cho app người học (`apps/web`, `/vi/app/...`, `/en/app/...`) trước khi code. Bản chữ đã duyệt chỉ có tiếng Việt
([`../2026-10-21/ban-chu-giao-dien.md`](../2026-10-21/ban-chu-giao-dien.md), gọi tắt "bản chữ"); file này tìm cách nói tiếng Anh cho từng thuật ngữ và mẫu
câu, rồi rà lại tiếng Việt. Chỉ màn người học (bản chữ §2–§7, §12–§16); bỏ admin (§8). Không làm lại research tiếng Việt 21/10
([`../2026-10-21/vietnamese-ux-writing-research.md`](../2026-10-21/vietnamese-ux-writing-research.md), gọi tắt [R2]); chỗ nào dựa vào nó thì ghi [R2 S#] hoặc [R2 N#].

**Chủ dự án quyết.** File này không đề xuất, không xếp hạng. Trong mỗi ô, phương án xếp theo thứ tự chữ cái (ABC), không theo mức ưu tiên.

Cách đọc nhãn nguồn (danh sách đủ ở mục G):

- [E#] hướng dẫn viết giao diện tiếng Anh; [P#] sản phẩm học từ; [V#] chữ tiếng Việt của sản phẩm thật; [T#] kỹ thuật (CLDR, next-intl, `Intl`);
  [R1] tài liệu và code trong repo; [R2] research 21/10. Tất cả đã mở và đọc trong phiên này (22/10/2026).
- [W#] **chỉ thấy qua kết quả tìm kiếm, không mở được trang** (mạng của phiên chặn): coi như `ASSUMPTION`.
- Mạng của phiên chặn phần lớn trang gốc (Google developer style guide, learn.microsoft.com, NN/g, gov.uk A–Z, material.io, trợ giúp Duolingo,
  Quizlet, Cambridge, Oxford, Wikipedia…). Khi có bản nguồn trên GitHub thì đọc bản đó (Mailchimp, Microsoft Docs, GOV.UK Design System, IBM Carbon,
  Shopify Polaris, Anki, CLDR, W3C, next-intl).

Mục lục: A Tóm tắt · B Bảng thuật ngữ tiếng Anh · C Mẫu câu dùng chung tiếng Anh · D Tiếng Việt có thể cải thiện · E Rủi ro nhất quán, độ dài,
plural, `Intl` cho `en` · F Câu hỏi cho chủ dự án · G Nguồn.

---

## A. Tóm tắt

1. **Nguồn:** 24 trang hoặc tệp nguồn mở được, từ 13 nơi (gồm 3 bộ chữ tiếng Việt thật để đếm từ), + chạy `Intl` trong phiên + tài liệu repo;
   11 nguồn chỉ thấy qua tìm kiếm (`ASSUMPTION`).
2. **"nhóm" không có một chữ tiếng Anh chung:** Anki gọi "deck" [P1], Quizlet "set" [W1], Cambridge "word list" [W10], Duolingo "collections" [W3];
   API của Wordmet đặt tên `groups` [R1].
3. **Một chữ Việt thành nhiều chữ Anh:** "câu" là *question* (Câu 4/10), *answer/attempt* (5 câu gần nhất) và *sentence* (câu đã gặp); "ôn / học /
   luyện" thành *review / learn / practice*, và *study* chồng lên cả ba. Ngược lại, chỗ trùng "gợi ý" / "AI gợi ý" của tiếng Việt tự tách ở tiếng Anh
   (*hint* / *suggestion*).
4. **Hướng dẫn tiếng Anh không thống nhất ở bốn điểm:** app có tự xưng "we" không (Microsoft dùng [E7], Apple tránh [E2], Polaris chỉ khi lỗi do
   mình [E15]); nút hủy của hộp hỏi xóa ("Cancel" luôn [E3] hay nút nói kết quả [R2 S11]); viết hoa (sentence case [E7][E11][E16][E10] hay title
   case cho nút [E3][P2]); "please" (GOV.UK, Carbon tránh [E8][E11]).
5. **Độ dài:** ở nhãn ngắn (nút, tab, chip) tiếng Anh thường dài bằng hoặc hơn tiếng Việt: 21/28 chỗ đo có ít nhất một phương án tiếng Anh dài hơn,
   10/28 chỗ mọi phương án đều dài hơn ("Nộp" 3 ký tự → "Submit" 6; "Tự nhập nghĩa" 13 → 20–22). Giả định của D14 ("chữ tiếng Việt dài hơn nên đã là
   chỗ chật nhất") không đúng với các nhãn này.
6. **`Intl` với locale `en` hiện tại** (route `en`, `apps/web/src/i18n/routing.ts`) ra định dạng Mỹ: "Sunday, 10/18", "11/15", "8:00 PM",
   "12:00 AM", "₫99,000"; `en-GB` ra "Sunday 18/10", "15/11", "20:00", "0:00". next-intl cho giữ đường `/en` mà dùng locale khác [T3].
7. **Plural:** tiếng Anh cần `one` / `other`. Tiếng Việt chỉ có `other` tới CLDR 48, nhưng **CLDR 49 thêm `one` (i = 0 hoặc n = 1) cho `vi`** [T1];
   tin nhắn tiếng Việt viết chỉ với `other` vẫn chạy đúng.
8. **Tiếng Việt:** 15 điểm; 1 điểm đụng quyết định đã chốt (D17 Q1, chữ "câu") và 1 phương án đụng D17 Q3; phần lớn là chỗ bản chữ lệch chính bảng thuật ngữ của nó
   ("Nhân viên" thay "đội Wordmet", "Bài từ câu…", hai tên cho câu đã gặp, hai câu khác nhau cho cùng lỗi `ai-unavailable`, hai cách gọi ngăn).
9. **Landing (cả hai thứ tiếng) và email của API** dùng chữ khác bảng thuật ngữ app: "credit AI" / "AI credits", gói thử "Trải nghiệm AI" / "AI
   Experience", "Flashcard", "Vui lòng", "Wordmet Pro trial".
10. **32 câu hỏi** cho chủ dự án ở mục F.

---

## B. Bảng thuật ngữ tiếng Anh đề cử

### B1. Theo bảng thuật ngữ của bản chữ (§2)

| # | Thuật ngữ VI | Phương án EN (ABC) | Ai dùng (nguồn) | Ghi chú |
|---|---|---|---|---|
| 1 | nhóm | collection · deck · group · list / word list · set | deck: Anki, "A deck is a group of cards" [P1]; Anki tiếng Việt dịch "Bộ thẻ" [P2]. group: tên API `/v1/groups` [R1]. word list: Cambridge Dictionary +Plus [W10]. set, folder: Quizlet [W1][W11]. collections: Duolingo "Your collections" [W3] | Bản chữ tránh "bộ thẻ, deck" vì nhóm chứa từ chứ không chứa thẻ. "deck" gợi một bộ thẻ; "list" dễ lẫn với danh sách nói chung. Tab thanh trên: "Groups" 6 ký tự, "Lists" 5 |
| 2 | từ | word | mọi nguồn | Cần plural ("1 word", "18 words"). "từ vựng" nói chung → "vocabulary" (landing EN [R1]) |
| 3 | nghĩa | definition · meaning · sense | meaning, definition: landing EN ("Tap to reveal meaning", "Recall by definition") [R1]. sense: tên dữ liệu API [R1] | Người học tiếng Anh thấy định nghĩa tiếng Anh làm nghĩa (bản chữ §7.17; E6) nên "meaning" và "definition" có thể chỉ cùng một thứ; gợi ý nấc 2 "Định nghĩa tiếng Anh" khi đó trùng chính nghĩa (E6). "sense" là chữ người làm từ điển (bản chữ tránh "nét nghĩa") |
| 4 | thẻ | card · flashcard | card: Anki [P1]. flashcards: landing EN [R1] | Tiếng Anh cũng có chỗ trùng như "thẻ": landing EN ghi "No credit card required" |
| 5 | ôn, phiên ôn | review · study | review, "To Review", "Study Now", "study session": Anki [P1][P2]. "Review scheduled at %1": KOReader [P3]. "Time to study your words", "words to review": email API [R1] | "study" bao cả ôn lẫn luyện; tiếng Việt tách "ôn" và "luyện". "Ôn 10 thẻ" → "Review 10 cards" (15 ký tự) |
| 6 | luyện tập, luyện, phiên luyện | exercises · practice · quiz | practice: landing EN ("Practice in context", "practice modes") [R1], Duolingo "Practice Hub" [W3]. exercises: landing EN [R1] | Chính tả Anh tách động từ "practise" và danh từ "practice"; chính tả Mỹ dùng "practice" cho cả hai (`ASSUMPTION`, chưa mở từ điển). Tên tab là danh từ nên không bị ảnh hưởng |
| 7 | phiên | lesson · round · session | session: Anki "To start a study session, click the Study Now button" [P1]. round: Quizlet [W1]. lesson: Duolingo (`ASSUMPTION`) | "session" cũng là phiên đăng nhập ("Your session expired"), y như chỗ bản chữ đã tránh "phiên đăng nhập" |
| 8 | phiên luyện mỗi ngày (Miễn phí 3) | daily limit · practice sessions per day · sessions today | "Daily Limits", "New Cards/Day", "Maximum Reviews/Day": Anki [P1] | "1/3" hay "1 of 3"; cần plural ("1 session left", "2 sessions left") |
| 9 | câu (một lần trả lời) | answer · attempt · question | question: Anki, "A question and answer pair is called a card" [P1]. answer: Duolingo "My answer should have been accepted" [W2] | Tiếng Việt "câu" còn là *sentence* (câu đã gặp, câu ví dụ, Điền từ vào câu). Tiếng Anh phải chọn theo chỗ: đếm câu hỏi "Question 4 of 10", Từ hay sai "last 5 answers", câu văn "sentence" (E1) |
| 10 | lượt câu AI | AI credits · AI practice credits · AI question credits · AI questions · uses | AI credits: Microsoft 365, "60 AI credits" mỗi tháng [W7]; landing EN "without consuming AI credits" [R1] | Bản chữ tránh "credit". Nếu đếm thẳng "AI questions" thì "287 AI questions left" và nhãn "AI question" (câu AI) dùng cùng chữ cho hai thứ (E1). "credits" có thể đọc như tiền, lý do bản chữ tránh "hoàn tiền" |
| 11 | lượt tra AI | AI lookup credits · AI lookups | "Dictionary lookup": KOReader [P3]; mã kho `ai_lookup` [R1] | "lookup" (danh từ) khác "look up" (động từ); mục này có trong word list của Microsoft và Google nhưng không mở được (`ASSUMPTION`) |
| 12 | câu AI | AI question · AI-generated question · AI sentence | "AI-generated sentence": landing EN [R1] | Nhãn nhỏ trên đề: "AI question" 11 ký tự, "AI-generated" 12 |
| 13 | kiểu câu | exercise type · mode · practice mode · question type | "practice modes": landing EN [R1] | Tên sáu kiểu ở B3 |
| 14 | dạng chia (went của go) | form · inflected form · inflection · word form | "Verb Forms": past simple went, past participle gone, -ing form going (Oxford Learner's) [W5]; tên API `word-forms`, `inflections` [R1] | "inflection" là chữ ngôn ngữ học (bản chữ tránh "biến tố"). Tên cụ thể: "past tense" hay "past simple" [W5] đi cùng câu hỏi Mỹ / Anh (F3). "Wordmet tự nhận ra dạng chia, như went → go" → "Wordmet recognizes word forms, like went → go" |
| 15 | gói Miễn phí / Dùng thử / Pro | Free, Free plan · Free trial, Pro trial, Trial · Pro | Apple: "free trial" là một loại ưu đãi giới thiệu *của* gói thuê bao [E6]. Landing EN: "Free", gói thử tên "AI Experience", "14-day free trial · Included in Pro" [R1]. Email API: "Your Wordmet Pro trial has started" [R1]. Memrise dùng "Pro" [W4] | Mã API `free`, `trial`, `pro` [R1]. "Free" (gói) và "Free trial" dùng chung chữ Free (E1). Chip: "Trial" 5 ký tự, "Free trial" 10 |
| 16 | Từ của tôi (nhãn) / từ bạn tự thêm (câu) | Added by you · Custom words · My words · Your words | Carbon: nhãn ngôi thứ nhất ("My account", "My usage") rồi câu giải thích chuyển sang "you" [E11]. Apple: dùng từ sở hữu ít ("Favorites" thay "Your Favorites"), không đổi góc nhìn [E2]. Tên API `my-words` [R1] | Bản chữ đang làm đúng kiểu Carbon (nhãn "tôi", câu "bạn"); theo Apple đó là đổi góc nhìn |
| 17 | câu đã gặp / câu bạn gặp | context sentence · saved sentence · sentences you've seen · your sentences | "Save context": KOReader [P3]. Landing EN: "Saved sentence", "Original sentence (optional)", "Save with context" [R1] | Bản chữ đang có hai tên cho cùng thứ (mục TV3); chữ tiếng Anh chọn ở đây phải phủ cả hai |
| 18 | gợi ý | clue · hint | "Hint:": landing EN [R1] | Trong thiết kế, "hint text" còn là chữ mờ trong ô nhập (Apple "Show hints in text fields" [E2]); không lộ ra màn người học |
| 19 | AI gợi ý (nhãn nguồn) | AI suggestion · AI-generated · AI-suggested · Suggested by AI | không thấy nguồn mở được | Tiếng Anh tách sẵn *hint* và *suggestion*, nên chỗ trùng của D17 Q4 không có ở tiếng Anh. "AI-generated" không giữ ý "có thể sai, nên kiểm" mà tiếng Việt chọn "gợi ý" để giữ [R2 N12] |
| 20 | Bản dịch + nhãn AI dịch | AI translation · Machine translation · Translated by AI · Translation | Landing EN đặt dòng dịch sau "VI:" [R1] | Theo design Bước 7, bản dịch chỉ hiện cho người học `vi`; cài đặt ngôn ngữ là một ô chung cho nghĩa và giao diện, nên người dùng giao diện tiếng Anh có thể không bao giờ thấy chuỗi này (E6) |
| 21 | báo lỗi | Flag · Report · Report a problem · Report an issue | "Report an issue with this sentence": landing EN [R1]. Duolingo có danh sách lý do báo theo kiểu câu [W2]. "Flag Card" của Anki là đánh dấu riêng, không gửi đi [P1] | "Flag" trùng nghĩa đánh dấu riêng. "Báo lỗi của tôi" → "My reports" 10 ký tự |
| 22 | trả lại lượt câu AI | credit back · refund · restore · return | không thấy nguồn mở được | Bản chữ tránh "hoàn tiền". "refund" thường gắn với tiền (`ASSUMPTION`) |
| 23 | trình độ | CEFR level · level | "A1–C2 topic library": landing EN [R1] | Mốc 0 đổi "Level" thành "Trình độ" để giữ khung giao diện tiếng Việt; lý do đó không áp cho tiếng Anh. Nếu ngăn cũng gọi "level" thì trùng (E1) |
| 24 | loại từ | part of speech · type · word class | không thấy nguồn mở được | Nhãn noun, verb giữ nguyên ở cả hai thứ tiếng. "Loại từ: tất cả" → "Part of speech: All" 21 ký tự |
| 25 | email | email | Mailchimp: "email (never hyphenate, never capitalize unless it begins a sentence)" [E1] | |
| 26 | mã xác minh, mã 6 số | code · verification code | email API: "Verification codes temporarily locked" [R1] | |
| 27 | ngăn (Leitner) | box · interval · level · stage | boxes: hệ Leitner [W6]. "3 day interval": Anki [P1] | Bản chữ có hai cách gọi ngăn (TV9); tiếng Anh tương ứng "Box 2" (theo số) hay "3-day box" (theo khoảng) |
| 28 | đội Wordmet | Support · the Wordmet team · we · Wordmet | "we" cho phía app: Microsoft [E7]. Tránh "we": Apple [E2]. Chỉ nói "we" khi chính mình gây lỗi: Polaris [E15]. "we" khi giải thích vì sao hỏi dữ liệu: Carbon [E11]. Landing EN: "We'll notify you" [R1] | Luật 1 của bản chữ: app tự gọi "Wordmet", không "chúng tôi" |

### B2. Chữ khung khác (không có ở §2 nhưng có trên nhiều màn)

| Chữ VI | Phương án EN (ABC) | Nguồn | Ghi chú |
|---|---|---|---|
| Hôm nay (tab) | Today | — | |
| Tra từ (tab, dải tra) | Dictionary · Look up · Search | "Dictionary lookup": KOReader [P3]; "Search": Anki [P2] | "Tra trong 7.799 từ" → "Search 7,799 words" |
| Thêm từ, Thêm từ vừa gặp | Add a word · Add word · Quick add · Save word | "Save word": landing EN [R1] | |
| Học (Học tất cả 18 từ, Đang học, Học lại) | Learn · Learning · Study | trạng thái "Learning", nút "Study Now": Anki [P1] | "Study" chồng lên "ôn" nếu chọn "study" cho ôn |
| Bỏ khỏi việc học | Remove from learning · Stop learning · Suspend | "suspended": Anki [P2] | |
| Đến hạn · Mới | Due · New | "New, Learn, and Due (To Review)": Anki [P1]; Anki tiếng Việt cũng dùng "Đến hạn", "Mới" [P2] | |
| Ưu tiên | Flagged · Priority · Starred | "Flag": Anki [P1]; "Starred" của Quizlet `ASSUMPTION` | |
| Cần ôn lại · Đã biết (sau khi lật thẻ) | Again / Good · Forgot / Got it · Still learning / Know | Again/Good: Anki [P1]. Forgot/Got it: KOReader [P3]. Still learning/Know: Quizlet [W1] | KOReader tiếng Việt dịch "Đã quên" / "Đã hiểu" [P3] |
| Từ hay sai | Difficult words · Mistakes · Tricky words · Weak words | Mistakes: Duolingo [W3]. Difficult words: Memrise [W4] | |
| Từ lâu chưa ôn | Overdue words · Words you haven't reviewed in a while | mục "Falling Behind" của Anki [P1] | |
| Phiên đang dở | Resume · Session in progress · Unfinished session | "Resume": KOReader [P3] | |
| Lịch sử luyện tập · tab Câu đã làm | Practice history · Answered questions · Your answers | — | |
| Gói học | Plan · Plans · Pricing | "Pricing plans": landing EN [R1]; "plan": email API [R1] | |
| Cài đặt | Settings | — | |
| Đăng nhập · Đăng xuất · Tạo tài khoản | Log in / Log out · Sign in / Sign out · Create account / Sign up | "Log in", chọn để khác "Sign up": Carbon [E12], Mailchimp word list "log in (verb)" [E1]. "Sign in": GOV.UK [E10] | |
| Câu ví dụ | Example · Example sentence | — | |
| Định nghĩa tiếng Anh (gợi ý nấc 2) | Definition · English definition | — | Trùng "nghĩa" với người học `en` (B1 dòng 3) |
| Chưa mở bán · Sắp có | Coming soon · Not available yet | — | |
| Nhắc học qua email | Email reminders · Study reminders | — | |

### B3. Tên sáu kiểu câu (bản chữ §7.1) và các lựa chọn trong Tùy chỉnh phiên

| VI | Phương án EN (ABC) | Nguồn |
|---|---|---|
| Trắc nghiệm | Multiple choice | chip landing EN [R1] |
| Đúng/sai | True or false · True/False | — |
| Gõ từ | Spelling · Type the word · Typing | — |
| Điền từ vào câu | Cloze · Fill in the blank · Fill-in-the-blank | "Fill-in-the-blank": landing EN [R1]; mã API `cloze` |
| Chọn nghĩa trong câu | Choose the meaning · Meaning in context | — |
| Trắc nghiệm theo câu | Complete the sentence · Multiple choice in context · Sentence multiple choice | — |
| Nguồn câu: AI viết câu mới · Câu bạn đã lưu | New AI sentence · Your saved sentences · Your sentences | — |
| Kiểu đề: Theo nghĩa · Theo câu · Trộn | By meaning · By sentence · Mixed | — |

---

## C. Mẫu câu dùng chung bằng tiếng Anh

### C1. Sáu mẫu của bản chữ §3.1

| Mẫu | VI đã duyệt | Phương án EN (ABC, ví dụ viết cho Wordmet) | Nguồn nói gì |
|---|---|---|---|
| Lỗi | "Không kết nối được. Kiểm tra mạng rồi thử lại." | "Can't connect. Check your connection and try again." · "Couldn't connect. …" · "Unable to connect. …" · "We couldn't connect. …" | Cùng ý: nói chuyện gì xảy ra và cách sửa, không đổ lỗi [E2][E7][E8][E15]; không "oops" [E2][E8]; không "please", "sorry", "valid/invalid" [E8]; Carbon tránh "please", "thank you" [E11]; không "!" trong lỗi [E1]; câu trọn có dấu chấm [E7]. Khác nhau: "we" (Microsoft "We couldn't upload the picture" [E7]; Apple chọn "Unable to load content" thay "We're having trouble…" [E2]; Polaris "Couldn't deposit payout" và chỉ nói "we" khi Shopify gây lỗi [E15]). Lỗi ô nhập dạng lệnh "Enter your first name" [E8], trùng kiểu "Nhập tên của bạn." |
| Hạn mức | "Hết phiên luyện hôm nay. Luyện tiếp từ 0:00 ngày mai. Trong lúc chờ, ôn thẻ không giới hạn." | "Daily practice limit reached. …" · "No practice sessions left today. …" · "You've used today's practice sessions. …"; vế giờ: "after midnight" · "at 12:00 AM" · "at 0:00" (E5); vế cuối: "You can still review cards." · "Reviewing cards has no limit." | Không hướng dẫn nào mở được viết riêng về hạn mức (giống [R2 N10]). Anki gọi nhóm cài đặt là "Daily Limits" và ngừng đưa thẻ khi chạm giới hạn [P1]. Microsoft 365 nói hạn mức AI theo "credits" mỗi tháng [W7] |
| Trống | "Chưa có nhóm nào. Tạo nhóm đầu tiên để lưu từ bạn gặp. [Tạo nhóm đầu tiên]" | Tiêu đề trạng thái: "No groups yet" · tiêu đề hành động: "Create your first group"; nút: "Create group" · "Create your first group" | Apple: màn trống chỉ bước tiếp, kèm nút hoặc link [E2]. Carbon: tiêu đề ngắn, thân nói việc cần làm, nút chính [E13]. Polaris: tiêu đề nghiêng về hành động ("Create orders and send invoices", không "Orders and invoices"), nút động từ + danh từ [E17] |
| Hỏi lại khi mất dữ liệu | "Xóa nhóm “Công nghệ”? … [Xóa nhóm và 12 từ] [Giữ nhóm]" | "[Delete group] [Cancel]" · "[Delete group and 12 words] [Keep group]" | Apple: luôn ghi "Cancel" cho nút hủy, nút hành động là động từ, không "OK" / "Yes" / "No" [E3]. NN/g: nút nói kết quả, "Delete file / Keep file" [R2 S11]. Microsoft: nút phải trả lời câu hỏi ở tiêu đề [E7]. Polaris có ví dụ "Don't: Are you sure you want to…?" [E15]. Carbon tách Delete (hủy hẳn) và Remove (bỏ khỏi chỗ đang ở, vật vẫn còn) [E12]: "Xóa từ" ↔ Delete, "bỏ khỏi nhóm" ↔ Remove |
| Đang chờ | "Đang tạo câu…", "Đang tra…", "Đang lưu…" | "Creating question…" · "Looking up…" · "Saving…" · "Writing a sentence…" | Apple: nút đang chạy đổi chữ "Checkout" → "Checking out…" [E4]. Android: "Loading…" với một ký tự "…" [V1]. Polaris: tránh dấu "…" trong chữ, chỉ dùng khi cắt chữ [E16] (khác Apple) |
| Thành công | "Đã lưu từ “rizz” vào nhóm “Du lịch”." | "Saved “rizz” to Travel." · "“rizz” saved to Travel." · "Added to Travel." | Dấu "!": Mailchimp dùng ít [E1]; Polaris tránh, tối đa một mỗi trang [E16]; Carbon chỉ cho điều tích cực, tối đa một [E11]. Landing EN đang có "You're on the list!", "✓ Correct!" [R1] |

Rút gọn (*can't*, *you've*): bốn nguồn mở được đều cho dùng: Microsoft [E7], Mailchimp [E1], Polaris [E16], Carbon [E11]. GOV.UK A–Z không mở
được nên chưa kiểm được nó nói gì (`ASSUMPTION`).

### C2. Nút dùng chung (bản chữ §3.2)

| VI | Phương án EN (ABC) | Nguồn, ghi chú |
|---|---|---|
| Thử lại | Retry · Try again | Polaris "Button: Retry" [E15]; landing EN "Try again" [R1] |
| Hủy | Cancel | Apple [E3]; Carbon "Stops the current action and closes the dialog" [E12] |
| Lưu · Lưu thay đổi | Save · Save changes | Carbon dùng "Apply" thay "Save changes" cho hộp lưu mà không đóng [E12] |
| Xong | Done · Finish | Apple: "Done" báo hết luồng [E2]; Carbon tách Done và Finish [E12] |
| Quay lại | Back | Carbon "Use instead of Previous" [E12] |
| Đóng | Close | Carbon: không đặt Close cạnh OK hay Cancel [E12] |
| Tiếp tục | Continue · Next | Apple: chọn "Continue" hay "Next" rồi giữ suốt app [E2] |
| Bỏ qua | Skip | Android tiếng Việt dịch "Skip" là "Bỏ qua" [V1] |
| Câu tiếp | Next · Next question | — |
| Nộp | Check · Submit | — ("Check" của Duolingo là `ASSUMPTION`) |
| Gửi báo lỗi | Report · Send report · Submit report | — |
| Làm tiếp | Continue · Resume | "Resume": KOReader [P3] |
| Dừng, để sau | Finish later · Stop for now | — |
| Xem Gói học | See plans · View plans | — |
| (không dùng OK, Có, Không, Đồng ý, Hủy bỏ) | (không dùng OK, Yes, No) | Apple: "OK" chỉ cho hộp báo tin, tránh "Yes" / "No" [E3]; Carbon: "OK" chỉ khi không có nhãn cụ thể hơn [E12] |

Viết hoa nút: sentence case ("Delete group") theo Microsoft [E7], Carbon [E11], Polaris [E16], GOV.UK [E10], Mailchimp (nút) [E1]; title case
("Delete Group") theo Apple (nút của hộp báo [E3], ví dụ "Add to Cart" [E4]) và Anki ("Study Now", "Show Answer") [P2]. Landing EN đang dùng sentence case [R1].

### C3. Khóa AI cho gói Miễn phí (bản chữ §3.3) và chip gói (§3.4)

| VI | Phương án EN (ABC) | Nguồn |
|---|---|---|
| "Dành cho gói Pro. Gói Pro chưa mở bán." + [Xem Gói học] | "Available on Pro. Pro isn't available yet." · "Included in Pro. Coming soon." · "Pro feature. Pro is coming soon." + [See plans] / [View plans] | "Included in Pro": landing EN [R1] |
| Chip "Miễn phí" / "Dùng thử" / "Pro" | "Free" / "Free trial", "Pro trial", "Trial" / "Pro" | B1 dòng 15 |

### C4. Lý do báo lỗi: bản tiếng Anh đã có trong dữ liệu

Bảng `practice_report_reasons` đã seed sẵn `label_en` (migration Bước 7 [R1]); admin sửa được, không nằm trong `messages/*.json`:

| `code` | VI | EN đã seed |
|---|---|---|
| `meaning_wrong` | Nghĩa sai | The meaning is wrong |
| `graded_wrong` | Đáp án đúng mà bị chấm sai | My right answer was marked wrong |
| `hint_wrong` | Gợi ý sai | The hint is wrong |
| `other` | Khác | Other |
| `ai_sentence_unnatural` | Câu sai ngữ pháp hoặc không tự nhiên | The sentence is ungrammatical or unnatural |
| `ai_more_than_one_answer` | Có hơn một đáp án đúng | More than one answer is right |
| `ai_wrong_meaning` | Câu dùng sai nghĩa của từ | The sentence uses the wrong meaning of the word |

Quan sát: bản tiếng Anh là câu trọn, có một câu ngôi thứ nhất ("My right answer…"), còn bản tiếng Việt là cụm ngắn. Duolingo cũng dùng ngôi thứ nhất
("My answer should have been accepted") [W2]. Gợi ý trong ô ghi chú đã có cả hai thứ tiếng ("Từ nào khác cũng đúng?" / "Which other word also fits?").

---

## D. Điểm có thể cải thiện ở tiếng Việt

Mã điểm là TV1–TV15 (không phải mã quyết định D1–D17 của file decisions). Nhãn ở cột cuối:

- **ĐỔI QUYẾT ĐỊNH ĐÃ CHỐT**: đụng D17 hoặc Mốc 0 (Q1, Q2), cần chủ dự án đổi rõ.
- **Đổi bảng thuật ngữ / nguyên tắc**: đụng §1 hoặc §2 của bản chữ (duyệt cùng bản chữ ở mốc 0, không phải câu hỏi riêng của D17).
- **Sửa chữ màn**: chỉ đổi chữ một vài khung cho khớp bảng đã duyệt; vẫn cần chủ dự án đồng ý vì cả bản chữ đã duyệt.

| # | Chỗ (bản chữ) | Quan sát và nguồn | Phương án | Nhãn |
|---|---|---|---|---|
| TV1 | "câu" vừa là câu hỏi vừa là câu văn trên cùng màn: `K/78a` đầu phiên "Câu 4/10", nhãn "Câu AI", đề "Gõ từ còn thiếu, đúng dạng trong câu"; Từ hay sai "5 câu gần nhất" cạnh "câu đã gặp" (§4.6, §7.10) | Quan sát trong bản chữ, không có nguồn ngoài | (a) giữ; (b) "câu hỏi" cho bộ đếm và tên ("Câu hỏi 4/10", "câu hỏi AI"), "câu" cho câu văn; (c) chỉ đổi chỗ trùng trên cùng một màn | **ĐỔI QUYẾT ĐỊNH ĐÃ CHỐT** (D17 Q1 chọn "câu" cho một lần trả lời; §2 tránh "câu hỏi AI") |
| TV2 | Cùng lỗi `ai-unavailable` có hai câu: `K/72` tiêu đề "AI tạm chưa dùng được", thân "Kiểu câu có AI đang tạm dừng"; `K/74d` và `K/75` "AI đang tạm dừng". Câu "AI tạm chưa dùng được" lại dùng cho `ai-failed` ở `K/75` dòng 1 (§7.4, §7.6, §7.7) | Microsoft tiếng Việt: một câu chuẩn cho các lỗi cùng nghĩa [R2 S1 §5.5.2]; Apple: xây mẫu ngôn ngữ nhất quán [E2] | (a) giữ; (b) "AI đang tạm dừng" cho `ai-unavailable`, "AI tạm chưa dùng được" chỉ cho `ai-failed`; (c) một câu cho cả hai | Sửa chữ màn |
| TV3 | Hai tên cho câu người học lưu: §2 "câu đã gặp"; §7.1 nguồn câu "Câu bạn đã lưu", `K/79b` nhãn "Câu bạn đã lưu", `K/70` "câu bạn đã lưu" | Apple: lập danh sách từ chung rồi theo nó [E2] | (a) giữ hai tên; (b) "Câu đã gặp" ở nguồn câu và nhãn; (c) đổi §2 sang "câu đã lưu" | (b) Sửa chữ màn; (c) Đổi bảng thuật ngữ |
| TV4 | `K/81`: "Nhân viên sẽ xem câu này và từ “rizz” bạn tự thêm để kiểm tra." (§7.13) | §2: đội vận hành gọi "đội Wordmet" [R1] | (a) giữ; (b) "Đội Wordmet sẽ xem câu này…" | Sửa chữ màn |
| TV5 | `K/70`: "Bài từ câu bạn đã lưu không dùng lượt câu AI." (§7.2) | "bài" nằm trong cột Tránh của §2 ("bài AI", "dạng bài", "bài tập") [R1] | (a) giữ; (b) "Câu làm từ câu bạn đã lưu không dùng lượt câu AI."; (c) "Dùng câu đã gặp thì không tốn lượt câu AI." | Sửa chữ màn |
| TV6 | Nút có dấu phẩy ghép hai việc: [Dừng, để sau], [Bỏ, mở phiên mới], [Bỏ qua, xem đáp án] (§3.2, §7.6, §7.9, §7.10) | Apple: tên nút một hai chữ nói kết quả [E3]; Microsoft: nút dài nhất vài chữ ngắn [E7]; luật 3 của bản chữ [R1] | (a) giữ; (b) một động từ: [Để sau], [Mở phiên mới], [Xem đáp án]; (c) bỏ dấu phẩy, giữ hai vế ("Dừng để sau") | Sửa chữ màn |
| TV7 | Động từ thao tác: luật 11 chọn "bấm" hoặc "chọn" ("Bấm vào thẻ để lật") | Đếm trong chữ tiếng Việt thật (chuẩn hóa NFC): Android của Google "nhấn" 64, "chạm" 10, "bấm" 0 [V1]; KOReader "nhấn" 34, "chạm" 29, "bấm" 0 [P3]; Anki "nhấn" 8, "bấm" 1, "chạm" 1 [P2]. Research 21/10 chọn "bấm" bằng suy luận [R2 N7] | (a) "bấm"; (b) "chạm" trên điện thoại, "nhấp" hoặc "bấm" trên web; (c) "chọn" mọi nơi; (d) "nhấn" | Đổi bảng thuật ngữ / nguyên tắc (§1 luật 11) |
| TV8 | Viết hoa tên trang trong nút và câu: [Xem Gói học] (§3.2, §3.3, §7.2, §7.16) nhưng [Xem gói học] (§12, `K/50`); "trong Từ của tôi", "Lịch sử → Báo lỗi của tôi" | Carbon: nhắc tới phần tử giao diện thì viết hoa đúng như nhãn trên màn [E11] | (a) hoa chữ đầu tên trang ("Xem Gói học"); (b) hoa khi là tên trang, thường khi là danh từ chung ("gói Pro"); (c) thường ("Xem gói học") | Sửa chữ màn |
| TV9 | Hai cách gọi ngăn: "Mọi ngăn · Ngăn 0 … Ngăn 5" (`M/L54`, §14) và "Mới · Ngăn 1 ngày … Ngăn 30 ngày" (`M/21b`, §14), "ngăn 3 ngày" (§15) | §2 lấy ví dụ "Ngăn 3 ngày" [R1] | (a) giữ; (b) theo khoảng ngày ở mọi chỗ; (c) theo số ở mọi chỗ, khoảng ngày ở dòng phụ | Sửa chữ màn |
| TV10 | Thứ tự chữ đếm: "1/3 đã dùng" (§4.7, §12) và "đã dùng 3/3" (§4.8) | Apple: xây mẫu ngôn ngữ nhất quán [E2] | (a) giữ; (b) "1/3 đã dùng" mọi chỗ; (c) "đã dùng 1/3" mọi chỗ | Sửa chữ màn |
| TV11 | "Kiểm lại" (`K/74a`, `K/76`, `K/86`, `K/88`) | Ba bộ chữ đã đếm không có "kiểm lại" lẫn "kiểm tra lại" [V1][P2][P3]. `ASSUMPTION`: "kiểm lại" là lối nói, "kiểm tra lại" là lối viết | (a) "Kiểm lại"; (b) "Kiểm tra lại"; (c) "Xem lại". §2 tránh "kiểm tra" cho tên hoạt động luyện tập, không cho động từ này | Sửa chữ màn |
| TV12 | Nút [Nộp] cho một câu trả lời (§3.2, `K/78a`) | `ASSUMPTION` (không mở được): Duolingo tiếng Việt ghi "Kiểm tra" cho nút chấm | (a) "Chấm"; (b) "Kiểm tra" (trùng chữ §2 đang tránh cho tên hoạt động); (c) "Nộp"; (d) "Trả lời" | Sửa chữ màn (bảng nút §3.2) |
| TV13 | Dấu thanh: D17 chọn "hòa, thủy, khỏe, xóa" | Android tiếng Việt: "hủy" 11 / "huỷ" 2, "xóa" 65 / "xoá" 8 [V1]; Anki tiếng Việt trộn "Tuỳ chọn" và "Tùy chọn" [P2]; tiêu đề trợ giúp Google Play tiếng Việt viết "Huỷ" [W8] | Không có phương án đổi; chỉ ghi nhận rằng sản phẩm lớn cũng trộn hai kiểu trong cùng một bộ chữ | Không đổi quyết định |
| TV14 | Landing tiếng Việt khác bảng thuật ngữ app: "Flashcard & lịch ôn tập tự động", "Các dạng bài tập cơ bản", "không tốn credit AI", gói thử tên "Trải nghiệm AI", "GÓI DỊCH VỤ" viết hoa hết, "Vui lòng nhập…", "Đăng ký thành công!", "Nhập email của bạn..." (ba dấu chấm) | `apps/web/messages/vi.json` [R1] | (a) giữ landing như giọng marketing riêng; (b) sửa khi làm app; (c) sửa ngay | Ngoài app; không đổi quyết định của app |
| TV15 | Email API tiếng Việt: "Bạn đã bắt đầu dùng thử Wordmet Pro", "Bản dùng thử Wordmet Pro sắp kết thúc" (app gọi "gói Dùng thử"); "Mật khẩu đã được đổi" ("được" bị động [R2 N5]) | `entitlement-mail.ts`, `templates.ts` [R1] | (a) giữ; (b) đổi email theo bảng app; (c) đổi app theo email ("dùng thử Pro") | (c) **ĐỔI QUYẾT ĐỊNH ĐÃ CHỐT** (D17 Q3); (a), (b) ngoài app |

---

## E. Rủi ro nhất quán và độ dài, plural, định dạng `Intl` cho `en`

### E1. Một chữ Việt thành nhiều chữ Anh, và ngược lại

| Chữ | Hướng | Chi tiết |
|---|---|---|
| câu | 1 VI → 3 EN | *question* (Câu 4/10, câu AI, kiểu câu), *answer / attempt* (5 câu gần nhất), *sentence* (câu đã gặp, câu ví dụ, Điền từ vào câu). Khóa trong `messages` cần tách theo nghĩa, không theo chữ tiếng Việt |
| ôn · học · luyện | 3 VI → EN có chữ chồng | *review / learn / practice*; *study* chồng lên cả ba |
| gợi ý · AI gợi ý | 1 VI → 2 EN | *hint* và *suggestion*: tiếng Anh tự tách |
| lượt câu AI · câu AI | 2 VI → có thể 1 EN | Đếm thẳng "AI questions" thì số lượt và nhãn câu hỏi trùng chữ |
| phiên | VI tránh "phiên đăng nhập" | *session* tiếng Anh cũng dùng cho đăng nhập |
| thẻ | 1 VI → *card* | *card* cũng là thẻ thanh toán (landing EN "No credit card required") |
| Free | 1 EN → 2 gói | "Free" (gói Miễn phí) và "Free trial" (gói Dùng thử) |
| level | 1 EN → có thể 2 VI | "trình độ", và "ngăn" nếu chọn *level* cho ngăn |
| Flag | EN có nghĩa riêng | Anki: đánh dấu riêng, không gửi đi [P1]; nếu "báo lỗi" là *Flag* thì lẫn với "Ưu tiên" |
| đăng ký | 1 VI → 2 EN | tạo tài khoản (landing VI dùng cho danh sách chờ) và gói thuê bao (Google Play tiếng Việt gọi "gói đăng ký" [W8]); bản chữ app dùng "Tạo tài khoản" |

### E2. Chữ khác nhau giữa các bề mặt

| Bề mặt | Chữ hiện có | Khác bảng thuật ngữ app ở đâu |
|---|---|---|
| Landing EN (`messages/en.json`) | "AI credits", gói thử "AI Experience", "14-day free trial · Included in Pro", "Flashcards & automated review schedules", "Essential practice modes", "Report an issue with this sentence", "Saved sentence", "Please enter a valid email address…", "You're on the list! We'll notify you…", tiêu đề nhỏ VIẾT HOA ("THE PROBLEM") | credits, tên gói thử, "please", "we", "!", viết hoa hết |
| Landing VI (`messages/vi.json`) | mục TV14 | như TV14 |
| Email API EN | "Time to study your words", "Your Wordmet Pro trial has started", "Your Wordmet Pro plan renews soon", "Verification codes temporarily locked" | gói thử gọi là "Pro trial"; "study" |
| Email API VI | "Bạn đã bắt đầu dùng thử Wordmet Pro", "Mật khẩu đã được đổi" | mục TV15 |
| Dữ liệu seed | `label_en` của lý do báo lỗi (C4) | câu trọn, ngôi thứ nhất |
| Tên trong code | `groups`, `my-words`, `reviews`, `practice`, `word-forms`, `cloze`; gói `free`, `trial`, `pro`; kho `ai_practice`, `ai_lookup` | Không hiện trên màn; quan sát: dễ thành chữ tiếng Anh mặc định nếu chưa chốt thuật ngữ |

### E3. Độ dài ở chỗ chật

Đếm ký tự (code point) của chữ tiếng Việt đã duyệt và các phương án tiếng Anh ở mục B, C (chạy Node trong phiên). Số ký tự chỉ gần đúng với bề rộng
thật trên màn.

| Chỗ (chữ VI) | Ký tự VI | Phương án EN (ký tự) |
|---|---|---|
| Tab: Hôm nay | 7 | "Today" (5) |
| Tab: Nhóm | 4 | "Groups" (6) · "Lists" (5) · "Word lists" (10) · "Decks" (5) |
| Tab: Luyện tập | 9 | "Practice" (8) |
| Tab: Tra từ | 6 | "Look up" (7) · "Dictionary" (10) · "Search" (6) |
| Nút thanh trên: Thêm từ | 7 | "Add word" (8) · "Add a word" (10) |
| Chip: Miễn phí | 8 | "Free" (4) |
| Chip: Dùng thử | 8 | "Trial" (5) · "Free trial" (10) · "Pro trial" (9) |
| Nút: Nộp | 3 | "Submit" (6) · "Check" (5) |
| Nút: Câu tiếp | 8 | "Next" (4) · "Next question" (13) · "Continue" (8) |
| Nút: Cần ôn lại | 10 | "Again" (5) · "Forgot" (6) · "Review again" (12) · "Still learning" (14) |
| Nút: Đã biết | 7 | "Got it" (6) · "Know" (4) · "I know this" (11) |
| Nút: Dừng, để sau | 12 | "Stop for now" (12) · "Later" (5) · "Pause" (5) |
| Nút: Bỏ, mở phiên mới | 16 | "Start new session" (17) · "Discard and start new" (21) |
| Nút: Bỏ kiểu câu có AI | 17 | "Remove AI questions" (19) · "Turn off AI question types" (26) |
| Nút: Tự nhập nghĩa | 13 | "Add meaning yourself" (20) · "Enter meaning manually" (22) · "Write my own meaning" (20) |
| Nút: Tra bằng AI | 11 | "Look up with AI" (15) · "Ask AI" (6) |
| Nút: Bắt đầu 10 câu | 14 | "Start 10 questions" (18) · "Start (10)" (10) |
| Nút: Làm tiếp câu 4 | 14 | "Continue from question 4" (24) · "Resume at question 4" (20) |
| Ô lọc: Mọi trình độ | 12 | "All levels" (10) |
| Tab: Câu đã làm | 10 | "Answered" (8) · "Your answers" (12) · "Question history" (16) |
| Tab: Báo lỗi của tôi | 15 | "My reports" (10) · "Your reports" (12) |
| Trạng thái: Đã xác nhận lỗi | 15 | "Confirmed" (9) · "Error confirmed" (15) · "Problem confirmed" (17) |
| Tiêu đề: Hết phiên luyện hôm nay | 23 | "No practice sessions left today" (31) · "Daily practice limit reached" (28) · "You’ve used today’s practice sessions" (37) |
| Dòng: Lượt câu AI: còn 287/300 | 24 | "AI questions: 287/300 left" (26) · "AI question credits: 287 of 300 left" (36) |
| Nhãn: Từ của tôi | 10 | "My words" (8) · "Your words" (10) · "Added by you" (12) |
| Trang: Từ hay sai | 10 | "Weak words" (10) · "Tricky words" (12) · "Mistakes" (8) · "Words to work on" (16) |
| Nhãn: AI gợi ý | 8 | "AI suggestion" (13) · "Suggested by AI" (15) · "AI-suggested" (12) |
| Lọc: Ngăn 3 ngày | 11 | "3-day box" (9) · "Box: 3 days" (11) · "Box 2" (5) |

Kết quả: 21/28 chỗ có ít nhất một phương án tiếng Anh dài hơn; 10/28 chỗ mọi phương án đều dài hơn; 7/28 chỗ tiếng Anh ngắn hơn hoặc bằng.

- Research 21/10 dẫn AppTweak: bản tiếng Việt thường dài hơn tiếng Anh 30–35% [R2 S23]. Số đó hợp với câu dài; với nhãn ngắn ở trên thì ngược lại.
- W3C: chuỗi càng ngắn thì độ chênh khi dịch càng lớn, và chuỗi ngắn hay nằm ở chỗ hẹp như nút, tab [T2] (W3C đo theo chiều tiếng Anh sang ngôn ngữ khác).
- Chỗ chật nhất theo bản chữ: tấm từ đáy và nút cố định ở đáy trên điện thoại, chip gói, tab dưới bốn mục, nút chọn kiểu đề. D14 để việc kiểm bản
  tiếng Anh tới lúc code.
- `ASSUMPTION`: dấu thanh tiếng Việt làm chữ cao hơn chứ không rộng hơn, nên rủi ro của tiếng Việt là chiều cao dòng, của tiếng Anh là chiều ngang.

### E4. Plural

Sự thật đã kiểm:

- CLDR: `en` có hai dạng `one` (i = 1 và không có phần thập phân) và `other` [T1].
- CLDR: `vi` chỉ có `other` ở các bản 46, 47, 48, 48.1; **từ bản 49 `vi` có `one` (i = 0 hoặc n = 1) và `other`** [T1, đã mở `plurals.xml` ở từng tag].
  Node 22.22.0 trong phiên (ICU 77.1, CLDR 47.0) vẫn cho `vi` chỉ `other` [T4]. Khi nào trình duyệt và Node mang CLDR 49: chưa kiểm (`ASSUMPTION`).
- next-intl dùng `Intl.PluralRules`; cú pháp ICU `{count, plural, =0 {…} =1 {…} other {# …}}`; `=value` khớp đúng số; `other` dùng khi không khớp
  dạng nào [T3]. Thứ tự: `{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}` [T3].
- Anki làm đúng kiểu này: tiếng Anh `{ $cards -> [one] { $cards } card *[other] { $cards } cards }`, tiếng Việt `{ $cards } thẻ` [P2].

Hệ quả cho Wordmet:

- Tin nhắn tiếng Việt viết `{count} từ` hoặc chỉ có `other` thì đúng cả trước và sau CLDR 49. Nếu ai đó thêm nhánh `one` vào tin nhắn tiếng Việt thì
  từ CLDR 49 số 0 cũng rơi vào `one`.
- Chuỗi trong bản chữ cần plural ở tiếng Anh (không đủ hết): "18 từ", "Tất cả nhóm (100)", "3 câu đã gặp", "đã có 1 câu", "Còn 2 phiên", "còn 96
  lượt tra AI", "Đã trả lại 1 lượt câu AI", "Phiên này cần 5 lượt câu AI, bạn còn 2", "5 câu gần nhất", "sai 2 lần", "Đúng 4 lần liền", "40 từ quá hạn
  hơn 60 ngày", "52 từ", "Đã chọn 3 từ", "Còn 44 từ", "100 nhóm · 3.120 từ", "Tối đa 300 ký tự".
- Không cần plural: "Câu 4/10", "Gợi ý 1/3", "12/60". Tính từ ghép tiếng Anh giữ số ít: "Ngăn 3 ngày" → "3-day box".
- Thứ tự: "Câu thứ 2 của nghĩa này" → "2nd sentence…" cần `selectordinal` ở tiếng Anh (`en` có bốn dạng thứ tự: one, two, few, other [T4]).
- Thời lượng: "còn 2 giờ 40 phút" → "2 hours 40 minutes" / "2 h 40 min". `Intl.DurationFormat` không có trong Node 22.22.0 đã chạy [T4]; Node 24.11.0
  của dự án và trình duyệt có hay không: `ASSUMPTION`.
- Liệt kê: `Intl.ListFormat` ra "noun, verb, and adjective" (`en`, có dấu phẩy Oxford), "noun, verb and adjective" (`en-GB`), "noun, verb và adjective" (`vi`) [T4].

### E5. Định dạng `Intl` cho `en`

Hiện trạng: `routing.ts` khai báo `locales: ['vi', 'en']`, nên `Intl` nhận `en`; `en` dùng dữ liệu Mỹ [R1][T4]. `en-VN` (tiếng Anh ở Việt Nam) cũng rơi
về `en` [T4]. Chạy trong phiên, múi giờ `Asia/Ho_Chi_Minh`:

| VI trong bản chữ | `vi-VN` | `en` | `en-GB` | `en-001` | `en-US-u-hc-h23` |
|---|---|---|---|---|---|
| Chủ Nhật, 18/10 | Chủ Nhật, 18/10 | Sunday, 10/18 | Sunday 18/10 | Sunday, 18/10 | Sunday, 10/18 |
| Chủ Nhật, 18 tháng 10 | Chủ Nhật, 18 tháng 10 | Sunday, October 18 | Sunday 18 October | Sunday, 18 October | Sunday, October 18 |
| 15/11 | 15/11 | 11/15 | 15/11 | 15/11 | 11/15 |
| (tháng viết tắt) | 15 thg 11 | Nov 15 | 15 Nov | 15 Nov | Nov 15 |
| 31/12/2026 | 31/12/2026 | 12/31/2026 | 31/12/2026 | 31/12/2026 | 12/31/2026 |
| 14/5/2008 (ngày sinh) | 14/5/2008 | 5/14/2008 | 14/05/2008 | 14/05/2008 | 5/14/2008 |
| 20:00 | 20:00 | 8:00 PM | 20:00 | 8:00 pm | 20:00 |
| 0:00 | 0:00 | 12:00 AM | 0:00 | 12:00 am | 00:00 |
| 21:06 | 21:06 | 9:06 PM | 21:06 | 9:06 pm | 21:06 |
| 7.799 | 7.799 | 7,799 | 7,799 | 7,799 | 7,799 |
| 99.000 ₫ | 99.000 ₫ | ₫99,000 | ₫99,000 | ₫99,000 | ₫99,000 |

Ghi chú:

- Ngày toàn số dễ đọc nhầm: "11/15" (`en`) và "15/11" (`en-GB`) cùng một ngày. Polaris: "Don't write dates with numerals only", dùng tên tháng, viết tắt
  ba chữ khi chật [E16]. Mailchimp: viết đủ thứ và tháng, chỉ viết tắt khi app chật ("Sat., Jan. 24") [E1].
- Giờ: Mailchimp viết "7 am", "7:30 pm", bỏ ":00" khi tròn giờ [E1]; Polaris dùng 12 giờ "12:35 pm" nhưng để `Intl` tự định dạng theo ngôn ngữ [E16].
  "Mở lại lúc 0:00" ở tiếng Anh có ba cách: "12:00 AM" (`en`), "0:00" (`en-GB`), chữ "midnight" (tự viết, không qua `Intl`).
- Ngày sinh: GOV.UK hỏi ngày dễ nhớ (như ngày sinh) bằng ô ngày tách ngày / tháng / năm; ví dụ trong gợi ý dùng ngày ≥ 13 và tháng ≤ 9 để người dùng
  thấy thứ tự và biết không cần số 0 ("27 3 2007") [E9].
- Cấu hình: next-intl cho đặt locale như `en-GB` mà vẫn giữ đường `/en` bằng `localePrefix.prefixes` [T3]; hoặc giữ `en` và đặt `formats` chung
  (ví dụ `hourCycle: 'h23'`, tháng dạng chữ) [T3]. Múi giờ mặc định của next-intl là múi giờ của máy chủ; cần truyền múi giờ IANA của người học (bản
  chữ: "0:00 giờ người học") [T3].
- `ASSUMPTION`: ICU của Node (render phía máy chủ) và của trình duyệt có thể khác bản, nên chuỗi định dạng ở hai phía có thể lệch (ví dụ plural `vi`
  sau CLDR 49).

### E6. Hành vi khác giữa người học `en` và `vi` làm đổi chữ

Theo design Bước 7 [R1]:

- Điền từ vào câu có 3 nấc gợi ý (`d…` → định nghĩa tiếng Anh → nghĩa tiếng Việt); nấc 3 **chỉ cho người học `vi`**, nấc vắng thì lùi lên. Chữ "Gợi ý 1/3",
  "Gợi ý 2/3" của bản chữ có mẫu số cố định; với người học `en` tổng số nấc là 2.
- Bản dịch câu AI (`translation_vi`) chỉ hiện cho người học `vi`; khối "Bản dịch · AI dịch" không xuất hiện ở giao diện tiếng Anh.
- Người học tiếng Anh thấy định nghĩa tiếng Anh làm nghĩa (bản chữ §7.17, dẫn design Bước 7 §11.1, cho kết quả tra AI; câu `meaning_in_sentence` có
  trường `meaning_language`). Nếu câu luyện cũng vậy thì gợi ý "Định nghĩa tiếng Anh" trùng chính nghĩa đang hỏi (`ASSUMPTION` cho phần câu luyện).
- Từ bạn tự thêm chỉ lưu một nghĩa theo ngôn ngữ của người học (người học `vi` → `gloss_vi`, không có `definition_en`).
- Cài đặt "Ngôn ngữ: Nghĩa của từ và giao diện" là một ô chung (bản chữ §5.2), nên người dùng giao diện tiếng Anh cũng là người học nghĩa tiếng Anh. Ai sẽ
  chọn tiếng Anh (người nước ngoài học từ, hay người Việt muốn học bằng tiếng Anh) chưa có dữ liệu (`ASSUMPTION`); điều này liên quan tới câu hỏi
  locale và giọng văn ở mục F.

---

## F. Câu hỏi cho chủ dự án

Mỗi câu một việc; phương án theo ABC hoặc theo thứ tự "giữ / đổi"; "(…) cách khác" luôn được.

**Chung cho bản tiếng Anh**

1. Bản tiếng Anh viết thế nào so với bản tiếng Việt đã duyệt? (a) dịch sát cấu trúc câu tiếng Việt; (b) viết lại theo thói quen tiếng Anh, giữ nghĩa
   và hành vi; (c) cách khác.
2. Locale `Intl` cho đường `/en`? (a) `en` như hiện tại (định dạng Mỹ); (b) `en-001` (tiếng Anh quốc tế: ngày-tháng, 12 giờ); (c) `en-GB`
   (ngày-tháng, 24 giờ); (d) giữ `en` và tự đặt `formats` chung; (e) cách khác.
3. Chính tả và thuật ngữ ngữ pháp theo Anh hay Mỹ ("practise/practice", "past simple/past tense")? (a) Anh; (b) Mỹ; (c) theo locale ở câu 2.
4. Ngày trong tiếng Anh? (a) số theo locale ("11/15" hoặc "15/11"); (b) tháng bằng chữ ("Nov 15" hoặc "15 Nov"); (c) cách khác.
5. Giờ trong tiếng Anh? (a) 12 giờ ("8:00 PM", "12:00 AM"); (b) 24 giờ ("20:00", "0:00"); (c) chữ cho mốc nửa đêm ("midnight"), còn lại theo (a) hoặc (b).
6. Viết hoa trong tiếng Anh? (a) sentence case mọi chỗ (như landing EN); (b) title case cho nút, tab, tiêu đề.
7. App tự xưng thế nào trong tiếng Anh? (a) "Wordmet" (như luật tiếng Việt); (b) "we" mọi chỗ cần; (c) "we" chỉ khi lỗi do app.
8. Nút hủy của hộp hỏi xóa trong tiếng Anh? (a) "Cancel"; (b) nút nói kết quả như bản tiếng Việt ("Keep group").
9. "please" và "sorry" trong tiếng Anh? (a) không dùng; (b) theo luật tiếng Việt (chỉ khi bắt người học làm việc phiền hoặc lỗi do app).

**Thuật ngữ tiếng Anh**

10. "nhóm"? (a) collection; (b) deck; (c) group; (d) list / word list; (e) set.
11. "ôn"? (a) review; (b) study.
12. "luyện tập"? (a) exercises; (b) practice; (c) quiz.
13. "phiên"? (a) lesson; (b) round; (c) session.
14. "câu" (một lần trả lời)? (a) "question" mọi chỗ; (b) tách theo chỗ: "question" cho bộ đếm, "answer" hoặc "attempt" cho Từ hay sai.
15. "lượt câu AI" và "lượt tra AI"? (a) "AI credits" chung, kèm tên kho; (b) "AI question credits" / "AI lookup credits"; (c) đếm thẳng "AI questions" /
    "AI lookups"; (d) "uses".
16. Tên gói? (a) Free / Free trial / Pro; (b) Free / Pro trial / Pro; (c) Free / Trial / Pro.
17. "Từ của tôi"? (a) Added by you; (b) Custom words; (c) My words; (d) Your words.
18. "câu đã gặp"? (a) context sentences; (b) saved sentences; (c) sentences you've seen; (d) your sentences.
19. "dạng chia"? (a) chỉ gọi tên cụ thể (past tense, plural, -ing form); (b) forms / word forms; (c) inflections.
20. "báo lỗi"? (a) Flag; (b) Report; (c) Report a problem; (d) Report an issue.
21. "trả lại lượt câu AI"? (a) credit back; (b) refund; (c) restore; (d) return.
22. "ngăn" và cách gọi? (a) box, theo số ("Box 2"); (b) box, theo khoảng ("3-day box"); (c) level; (d) stage.
23. Cặp nút sau khi lật thẻ ("Cần ôn lại" / "Đã biết")? (a) Again / Good; (b) Forgot / Got it; (c) Still learning / Know; (d) cách khác.
24. Lý do báo lỗi tiếng Anh (dữ liệu seed, C4)? (a) giữ câu trọn đang có; (b) rút thành cụm ngắn như bản tiếng Việt.
25. Gợi ý cho người học `en` (không có nấc nghĩa tiếng Việt)? (a) đếm theo số nấc thật ("Hint 1 of 2"); (b) giữ tổng 3 và thay nấc 3 bằng thứ khác (đổi
    hành vi API); (c) không ghi tổng.

**Tiếng Việt**

26. Chữ "câu" (TV1, đụng D17 Q1)? (a) giữ; (b) "câu hỏi" cho bộ đếm và tên, "câu" cho câu văn; (c) chỉ đổi chỗ trùng trên cùng một màn.
27. Các chỗ bản chữ lệch chính bảng thuật ngữ (TV2, TV3, TV4, TV5, TV8, TV9, TV10)? (a) giữ; (b) sửa hết theo bảng; (c) sửa từng chỗ chủ dự án chọn.
28. Nút có dấu phẩy (TV6)? (a) bỏ dấu phẩy, giữ hai vế; (b) giữ; (c) một động từ.
29. Động từ thao tác (TV7)? (a) bấm; (b) chạm / nhấp theo thiết bị; (c) chọn; (d) nhấn.
30. "Kiểm lại" (TV11) và nút [Nộp] (TV12)? (a) giữ cả hai; (b) đổi theo phương án chủ dự án chọn trong bảng D.
31. Landing và email của API (TV14, TV15, E2) theo bảng thuật ngữ app? (a) giữ; (b) sửa khi làm app; (c) sửa ngay.

**Cách kiểm**

32. Kiểm độ dài bản tiếng Anh (E3)? (a) kiểm khi code, bằng test hoặc ảnh chụp màn (như D14); (b) vẽ thêm vài khung tiếng Anh trong Figma; (c) cả hai.

---

## G. Nguồn đã đọc

Đọc ngày 22/10/2026. "Ngày nguồn" là ngày trang tự ghi, hoặc ngày commit mới nhất của kho nguồn khi đọc qua GitHub.

### Đã mở và đọc

| # | Nguồn | Phần đã đọc | Ngày nguồn | URL |
|---|---|---|---|---|
| E1 | Mailchimp, *Content Style Guide* (bản nguồn) | Grammar and mechanics, Web elements, Voice and tone, Writing for translation, Word list | commit 04/05/2022 | https://github.com/mailchimp/content-style-guide (trang: https://styleguide.mailchimp.com/) |
| E2 | Apple, *Human Interface Guidelines: Writing* | toàn trang (đọc qua JSON của trang) | cập nhật 16/12/2025 | https://developer.apple.com/design/human-interface-guidelines/writing |
| E3 | Apple, *HIG: Alerts* | toàn trang | cập nhật 02/02/2024 | https://developer.apple.com/design/human-interface-guidelines/alerts |
| E4 | Apple, *HIG: Buttons* | phần nhãn nút | không ghi | https://developer.apple.com/design/human-interface-guidelines/buttons |
| E5 | Apple, *HIG: Loading* | toàn trang | cập nhật 09/06/2025 | https://developer.apple.com/design/human-interface-guidelines/loading |
| E6 | Apple, *App Store Connect Help: Set up introductory offers for auto-renewable subscriptions* | phần loại ưu đãi | không ghi | https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions |
| E7 | Microsoft, *Writing style* (Windows apps, Fluent) | toàn trang | ms.date 24/09/2020 | https://learn.microsoft.com/windows/apps/design/style/writing-style (bản nguồn: https://github.com/MicrosoftDocs/windows-dev-docs/blob/docs/hub/apps/design/style/writing-style.md) |
| E8 | GOV.UK Design System, *Error message* | toàn trang | không ghi | https://design-system.service.gov.uk/components/error-message/ (nguồn: https://github.com/alphagov/govuk-design-system) |
| E9 | GOV.UK Design System, *Dates* | toàn trang | không ghi | https://design-system.service.gov.uk/patterns/dates/ |
| E10 | GOV.UK Design System, *Button* | phần chữ trên nút | không ghi | https://design-system.service.gov.uk/components/button/ |
| E11 | IBM Carbon, *Content: Writing style* | capitalization, politeness, contractions, pronouns, UI elements | commit 30/09/2026 | https://carbondesignsystem.com/guidelines/content/writing-style/ (nguồn: https://github.com/carbon-design-system/carbon-website) |
| E12 | IBM Carbon, *Content: Action labels* | dữ liệu `src/data/guidelines/glossary.js` | commit 30/09/2026 | https://carbondesignsystem.com/guidelines/content/action-labels/ |
| E13 | IBM Carbon, *Empty states pattern* | toàn trang | commit 30/09/2026 | https://carbondesignsystem.com/patterns/empty-states-pattern/ |
| E14 | IBM Carbon, *Loading pattern* | toàn trang | commit 30/09/2026 | https://carbondesignsystem.com/patterns/loading-pattern/ |
| E15 | Shopify Polaris, *Error messages* | toàn trang | commit 10/09/2026 | https://polaris.shopify.com/content/error-messages (nguồn: https://github.com/Shopify/polaris) |
| E16 | Shopify Polaris, *Grammar and mechanics* | capitalization, contractions, numbers/dates/time, ellipses, exclamation | commit 10/09/2026 | https://polaris.shopify.com/content/grammar-and-mechanics |
| E17 | Shopify Polaris, *Empty state* | Content guidelines | commit 10/09/2026 | https://polaris.shopify.com/components/layout-and-structure/empty-state |
| P1 | *Anki Manual* (bản nguồn) | Getting started (Cards, Card states, Decks), Studying, Deck options (Daily limits) | commit 06/10/2026 | https://docs.ankiweb.net/ (nguồn: https://github.com/ankitects/anki-manual) |
| P2 | Anki, chuỗi giao diện tiếng Anh và tiếng Việt | `core/templates/*.ftl`, `core/vi/*.ftl` | commit 21/10/2026 | https://github.com/ankitects/anki-core-i18n |
| P3 | KOReader, *Vocabulary builder* và bản dịch tiếng Việt | chuỗi `_()` trong `main.lua`; `vi/koreader.po` | đọc 22/10/2026 | https://github.com/koreader/koreader/blob/master/plugins/vocabbuilder.koplugin/main.lua · https://github.com/koreader/koreader-translations/blob/master/vi/koreader.po |
| V1 | Android (AOSP), chuỗi hệ thống tiếng Anh và tiếng Việt | `values/strings.xml`, `values-vi/strings.xml` (đếm từ) | nhánh `main` | https://github.com/aosp-mirror/platform_frameworks_base/blob/main/core/res/res/values-vi/strings.xml |
| T1 | Unicode CLDR, `plurals.xml` | quy tắc `vi`, `en` ở `main` và các tag `release-46`, `-47`, `-48`, `-48-1`, `-49` (cả `-49-alpha1`, `-49-beta1`) | theo tag | https://github.com/unicode-org/cldr/blob/main/common/supplemental/plurals.xml |
| T2 | W3C Internationalization, *Text size in translation* | toàn bài | đăng lần đầu 03/07/2007 | https://www.w3.org/International/articles/article-text-size (nguồn: https://github.com/w3c/i18n-drafts) |
| T3 | next-intl docs | Translations (Cardinal/Ordinal pluralization), Configuration (Time zone, Formats), Routing configuration (`localePrefix.prefixes`) | commit 02/10/2026 | https://next-intl.dev/docs/usage/translations · https://next-intl.dev/docs/usage/configuration · https://next-intl.dev/docs/routing/configuration (nguồn: https://github.com/amannn/next-intl) |
| T4 | `Intl` của Node.js v22.22.0 (ICU 77.1, CLDR 47.0), chạy trong phiên | DateTimeFormat, NumberFormat, PluralRules, ListFormat, RelativeTimeFormat | chạy 22/10/2026 | https://nodejs.org/ (dự án dùng Node 24.11.0; research 21/10 ghi cùng ICU 77.1, CLDR 47.0) |
| R1 | Repo Wordmet | `docs/mockups/2026-10-21/ban-chu-giao-dien.md`; `docs/superpowers/decisions/2026-10-21-dot-giao-dien-decisions.md` (D14, D17, Mốc 0); `apps/web/messages/en.json`, `vi.json`; `apps/web/src/i18n/routing.ts`; `apps/api/prisma/migrations/20261022090000_buoc7_practice_ai/migration.sql`; `apps/api/src/notifications/provider/reminder-message.ts`; `apps/api/src/entitlements/notices/entitlement-mail.ts`; `apps/api/src/identity/mailer/templates.ts`; `docs/superpowers/specs/2026-10-21-buoc-7-practice-ai-content-ai-design.md` | nhánh `claude/gallant-keller-bwo9dk` | — |
| R2 | Research tiếng Việt 21/10 (S1–S32, N1–N20) | toàn bài | 21/10/2026 | `docs/mockups/2026-10-21/vietnamese-ux-writing-research.md` |

### Chỉ thấy qua kết quả tìm kiếm, không mở được trang (`ASSUMPTION`)

| # | Nguồn | Điều dùng trong file | URL |
|---|---|---|---|
| W1 | Quizlet Help, *Studying with Flashcards* | nhóm "Still learning" / "Know"; "set", "round" | https://help.quizlet.com/hc/en-au/articles/360030988091-Studying-with-Flashcards |
| W2 | Duolingo Blog, *How user reports improve course content* | lý do "My answer should have been accepted"; danh sách lý do theo kiểu câu | https://blog.duolingo.com/how-user-reports-improve-course-content |
| W3 | Duolingo Blog, *Guide to Duolingo Practice Hub* | "Mistakes", "Words", "Your collections" | https://blog.duolingo.com/guide-to-duolingo-practice-hub/ |
| W4 | Memrise Help | "Difficult words", gói "Pro" | https://explore.memrise.com/help |
| W5 | Oxford Learner's Dictionaries, *go* | "Verb Forms": past simple, past participle, -ing form | https://www.oxfordlearnersdictionaries.com/definition/english/go_1 |
| W6 | Hệ Leitner (Wikipedia; University of York) | "boxes" | https://en.wikipedia.org/wiki/Leitner_system · https://subjectguides.york.ac.uk/study-revision/leitner-system |
| W7 | Microsoft Support, *AI credits and limits for Microsoft 365 subscriptions* | "AI credits", 60 mỗi tháng | https://support.microsoft.com/Microsoft-365-Copilot/ai-credits-and-limits-for-microsoft-365-subscriptions |
| W8 | Google Play Help (tiếng Việt) | tiêu đề "Huỷ, tạm dừng hoặc thay đổi một gói đăng ký trên Google Play" | https://support.google.com/googleplay/answer/7018481?hl=vi |
| W9 | Quizlet trên App Store (tiếng Việt) | "học phần", "thẻ ghi nhớ", "bộ thẻ" | https://apps.apple.com/vn/app/quizlet_learn_with_flashcards/id546473125?l=vi |
| W10 | Cambridge Dictionary blog, *Cambridge Dictionary +Plus*; thông báo ngừng word list | "word lists"; word list cá nhân ngừng sau 30/09/2026 | https://dictionaryblog.cambridge.org/2021/12/09/expand-your-vocabulary-with-the-cambridge-dictionary-plus-app · https://dictionarycampaigns.cambridge.org/word-list-retirement-notice |
| W11 | Hướng dẫn Quizlet của Texas Southmost College | "study sets", "folders" | https://www.tsc.edu/assets/documents/academics/educational_technology/canvas/softwareandtechnologyresources/quizlet_creating_study_sets.pdf |

### Định mở nhưng mạng chặn

- Google developer documentation style guide (word list, UI elements, dates and times) và Google Tech Writing *error messages*: `developers.google.com`.
- Microsoft Writing Style Guide (learn.microsoft.com/style-guide) và *Vietnamese Localization Style Guide* (download.microsoft.com); Microsoft được đọc qua E7 và [R2 S1].
- NN/g (nngroup.com); bài về hộp xác nhận và báo lỗi được dẫn qua [R2 S10, S11].
- GOV.UK A to Z style guide (gov.uk, guidance.publishing.service.gov.uk): thời gian, "midnight", rút gọn.
- Material Design (m2.material.io, m3.material.io).
- Trang trợ giúp Duolingo, Quizlet; Cambridge Dictionary, Oxford Learner's Dictionaries; Wikipedia; App Store; support.google.com; support.apple.com; MoMo.
- Chữ giao diện tiếng Việt của Duolingo, ELSA, Monkey, Prep: tìm kiếm không ra chữ cụ thể trên màn; không dùng.
