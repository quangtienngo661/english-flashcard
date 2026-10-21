# Người bản ngữ tiếng Anh trong app học từ vựng: research ngắn

Ngày: 21/10/2026. Câu hỏi: người dùng `en` (chọn nghĩa tiếng Anh thay vì tiếng Việt) quan trọng đến đâu, và bài AI practice nên làm gì cho họ.

**Nhãn nguồn:** [primary] = trang của chính công ty/tổ chức đó. [secondary] = bên thứ ba (báo, Wikipedia, site đo traffic). Mọi nguồn dưới đây đã tra ngày 21/10/2026 qua công cụ web của session. Ghi chú "chỉ thấy trong kết quả tìm kiếm" nghĩa là trang trả 403/404 khi tải trực tiếp, chưa tự đọc được nội dung.

## Tóm tắt

- **Không tìm được con số nào** cho tỷ lệ người bản ngữ trong Vocabulary.com, Membean, Magoosh, Merriam-Webster hay Quizlet. Chỉ có số người dùng tổng, không tách theo ngôn ngữ mẹ đẻ.
- Segment có thật (luyện thi SAT/GRE, từ vựng nâng cao, word-of-the-day) nhưng **không có bằng chứng nó lớn**. Một proxy: bài test từ vựng BRAVE có 4.099 người bản ngữ trên 224.488 người làm (khoảng 1,8%), nhưng đó là một bài test, không phải app.
- Các app monolingual dùng **định nghĩa tiếng Anh làm đề bài** rất phổ biến (Membean "Definition Cloze", Vocabulary.com "Spelling" và "Definition"). Cách dùng định nghĩa tiếng Anh để ra bài là chuẩn, không phải ngoại lệ.
- Không thấy app nào (Vocabulary.com, Membean) công bố việc dùng AI để sinh câu; chưa xác minh được họ có dùng nội bộ hay không.
- App của một thị trường (ELSA, Prep, Monkey, Mikan): **không tìm được** app nào có đường học riêng cho người bản ngữ. Mẫu duy nhất thấy được là ELSA: chọn mother tongue "Others" thì không hiện bản dịch, tức là giao diện tiếng Anh thuần.
- Suy luận: cho `en` dùng định nghĩa tiếng Anh làm đầu vào AI (mục 4), không chặn.

## 1. Ai là người bản ngữ dùng app từ vựng, và segment lớn cỡ nào

| App | Số liệu tìm được | Nguồn |
|---|---|---|
| Vocabulary.com | Hướng tới người học cá nhân, giáo viên, trường; có test prep SAT/PSAT, ACT, GRE, TOEFL với 253.000+ câu hỏi, 17.000+ từ. Câu hỏi đã trả lời "over 9 billion". Không có số người dùng, không tách bản ngữ | [primary] https://www.vocabulary.com/articles/announcements/boost-admission-test-scores-with-vocabulary-com/ ; https://www.vocabulary.com/how-it-works/ |
| Vocabulary.com (trường) | "Hơn 40.000 trường" (năm 2020, lời công ty, chỉ nói dùng trong lớp) | [secondary] https://www.edsurge.com/news/2020-03-10-ixl-learning-makes-its-3rd-acquisition-in-as-many-years-vocabulary-com |
| Membean | Đối tượng nêu là giáo viên và học sinh; trang không có số người dùng | [primary] https://membean.com/how-it-works |
| Magoosh Vocabulary Builder | App iOS miễn phí, 1.200 từ, 7K ratings, ngôn ngữ duy nhất ghi trên listing là English. Listing Android tự nhận "5 triệu học viên" dùng Magoosh cho từ vựng GRE (chỉ thấy trong kết quả tìm kiếm) | [primary] https://apps.apple.com/us/app/vocabulary-builder-by-magoosh/id890252250 ; con số 5 triệu: [secondary, bản sao listing Android] https://cafebazaar.ir/app/com.magoosh.gre.quiz.vocabulary?l=en |
| Merriam-Webster | Không có số chính thức. Ước tính (mô hình, không phải số công ty): app iOS khoảng 1,8 triệu MAU, 25,5 triệu installs; website khoảng 107,5 triệu lượt truy cập/tháng (4/2026, đó là tra từ điển chung, không phải người học từ vựng) | [secondary] https://appgoblin.info/apps/399452287 ; https://www.semrush.com/trending-websites/global/distance-learning |
| Quizlet | "60 triệu learners" trên trang About và media kit (chỉ thấy trong kết quả tìm kiếm, tải trực tiếp bị 403); Wikipedia ghi 60 triệu MAU từ 2021; Latka ghi 50 triệu trở lên, hai số chưa đối chiếu được. Không có tách theo SAT/GRE/từ vựng | [primary] https://quizlet.com/mission ; [secondary] https://en.wikipedia.org/wiki/Quizlet ; https://www.getlatka.com/companies/quizlet |

Proxy gián tiếp (không phải số người dùng app):
- GRE: 206.004 người thi năm 2024-25 theo Wikipedia [secondary] https://en.wikipedia.org/wiki/Graduate_Record_Examinations ; báo Careers360 ghi năm 2022-23 có 113.304 người thi từ Ấn Độ so với 97.676 từ Mỹ [secondary] https://news.careers360.com/in-a-first-more-indian-students-take-gre-test-than-americans-study-abroad-ets-data-report. Hai nguồn lệch năm và cách đếm. Người thi GRE đa số không phải công dân Mỹ, nên người bản ngữ chỉ là một phần của segment này. Tỷ lệ cụ thể: không tìm được.
- SAT: chỉ tìm được số theo bang (Illinois 142.400 người thi, lớp 2025; số chỉ thấy trong kết quả tìm kiếm) [primary] https://reports.collegeboard.org/media/pdf/2025-illinois-sat-suite-of-assessments-annual-report%20ADA-v0.2.pdf. Tổng toàn quốc: không tìm được. SAT còn gồm cả học sinh Mỹ dùng tiếng Anh như ngôn ngữ thứ hai, nên không đồng nghĩa "bản ngữ".
- BRAVE (bài test từ vựng online): 4.099 bản ngữ trên 224.488 người làm, tức khoảng 1,8% (tôi tự tính) [primary, nhưng là bài test, không phải app] https://www.myvocab.info/en/results (chỉ thấy trong kết quả tìm kiếm).
- Giai thoại: một người dùng diễn đàn lớn lên ở Mỹ vẫn phải học nhiều từ vựng GRE bằng Barron's và Quizlet vì "không dùng hằng ngày" [secondary, 1 trường hợp] https://quantnet.com/threads/do-native-speakers-need-to-memorize-vocabularies-for-gre.33627/post-220571 . Không dùng để ước lượng quy mô.

**Chưa tìm được:** tỷ lệ bản ngữ trong bất kỳ app nào ở trên; nghiên cứu độc lập về người bản ngữ dùng app từ vựng.

## 2. Dạng bài của app English-English

| App | Dạng bài (đề bài bằng tiếng Anh) | Nguồn |
|---|---|---|
| Vocabulary.com | 10 dạng: Synonym, Antonym, Definition, Image, Fill in the Blank (câu thiếu một từ, chọn từ), Sentence Definition, Sentence Synonym, Polysemous Sentence Synonym, Apply the Meaning, Spelling (hiện định nghĩa, gõ từ) | [primary] https://www.vocabulary.com/help/the-basics/question-types-and-modes |
| Membean | Multiple Choice, Spelling, Constellation, Fill-in-the-Blank, Image Fill-in-the-Blank, Word Sum, Select-All-That-Apply. Cloze có 3 loại: **Definition Cloze** (định nghĩa viết thành câu, hiện chữ cái đầu), Image Cloze, Context Cloze (câu có manh mối) | [primary] https://membean.com/how-it-works ; https://support.membean.com/support/solutions/articles/219185-cloze-fill-in-the-blank-questions |
| Magoosh | Flashcard có định nghĩa và câu ví dụ, ôn lặp lại; luyện Text Completion / Sentence Equivalence ở sản phẩm khác | [primary] https://apps.apple.com/us/app/vocabulary-builder-by-magoosh/id890252250 ; phần Text Completion / Sentence Equivalence chỉ thấy trong kết quả tìm kiếm: https://magoosh.com/gre/gre-vocabulary-flashcards/ |
| Clozemaster | Cloze trên câu Tatoeba, từ bị che là từ hiếm nhất trong câu; có trang khóa học tiếng Anh. Chưa rõ có hiện bản dịch cho khóa tiếng Anh hay không | [primary] https://www.clozemaster.com/faq (chỉ thấy trong kết quả tìm kiếm); https://www.clozemaster.com/languages/expand-english-vocabulary |

**AI sinh câu?** Trang của Vocabulary.com và Membean không nói câu/đề được tạo thế nào và không nhắc AI (đã đọc, không tìm thấy). Townsend Press Vocabulary Plus (3/2026) có "AI Assistant" nhưng chỉ chấm câu do học sinh tự viết, không sinh câu hay đề [primary] https://www.townsendpress.net/articles/2026/03/198/meet-ai-assistant-a-new-feature-in-vocabulary-plus . Duolingo Max dùng GPT-4 để giải thích đáp án và đóng vai hội thoại, không thấy nó sinh bài từ vựng [primary] https://blog.duolingo.com/duolingo-max . Một số app nhỏ trên App Store quảng cáo "3 câu do AI tạo cho mỗi từ" [primary] https://apps.apple.com/us/app/id6563147727 . Quizlet Q-Chat / Magic Notes: không có bằng chứng về cloze hay câu ví dụ do AI sinh.

## 3. App một thị trường có hỗ trợ người bản ngữ không

- **ELSA** (app luyện nói tiếng Anh cho người học; trang About nêu 90M+ learners, 31+ ngôn ngữ, không nhắc người bản ngữ). FAQ: bản dịch trong dictionary theo "mother tongue" đặt trong cài đặt, chọn "Others" thì không hiện bản dịch; bộ chuyển ngôn ngữ trang gồm English, Tiếng Việt và vài ngôn ngữ khác [primary] https://elsaspeak.com/en/faqs-en/ ; https://elsaspeak.com/en/about-us . Mẫu này là "không có bản dịch", không phải một sản phẩm riêng.
- **Prep:** trang tiếng Anh (`/en/`), khóa IELTS/TOEIC/HSK, "100.000+ students", testimonials đa quốc tịch. Không thấy trang nói về người bản ngữ [primary] https://prepedu.com .
- **Monkey Junior / Monkey Stories:** listing ghi ngôn ngữ English; dạy trẻ em; không tìm được hỗ trợ cho người bản ngữ (kết quả tìm kiếm không rõ về giao diện tiếng Việt) [primary] https://apps.apple.com/app/id1133076609 .
- **Mikan (Nhật):** nhắm người Nhật học từ vựng thi cử; tự nhận 9 triệu lượt tải; không tìm được hỗ trợ người bản ngữ [primary, chỉ thấy trong kết quả tìm kiếm] https://apps.apple.com/jp/app/id920856839 . App Hàn Quốc: chưa tra, không có kết luận.
- **Duolingo** (so sánh, không phải app một thị trường): các nguồn thứ cấp cho thấy tiếng Anh chỉ là ngôn ngữ đích cho người nói ngôn ngữ khác, không thấy khóa "English for English speakers"; chưa xác nhận trên trang Duolingo [secondary] https://duolingo.fandom.com/wiki/Language_course .

**Kết luận mục 3:** không tìm được app nào có đường riêng cho người bản ngữ. Thông lệ quan sát được: để giao diện tiếng Anh, không hiện bản dịch.

## 4. Suy luận cho app này

Hiện tại phần không-AI đã xử lý `en` tự nhiên: `senseMeaning` trả `definition_en` cho người dùng `en` (và cho người dùng `vi` khi từ chưa có nghĩa tiếng Việt) (`docs/preparation/BUOC_7_CODE_FACTS_2026-10-20.md` mục 10). Chỗ vướng là prompt `generate_cloze`: nó nói "for a Vietnamese learner", đòi `meaning_vi` khác null và đòi `translation_vi` (mục 6.8 và 6.9 cùng file). Từ riêng của người học `en` không có `gloss_vi`, nên bài AI của họ sẽ thiếu đầu vào. Hai hướng: **(A)** đổi đầu vào thành một trường `meaning` kèm nhãn ngôn ngữ, lấy đúng giá trị `senseMeaning` đã trả (định nghĩa tiếng Anh cho `en`), và chỉ đòi bản dịch tiếng Việt khi người học là `vi`; **(B)** không cho `en` dùng bài AI. Hướng A khớp với thực tế các app monolingual (Membean Definition Cloze dùng định nghĩa tiếng Anh làm đề), không thêm ngoại lệ cho người dùng mà chỉ đổi tên trường, và giữ cho gói Pro/trial có giá trị với mọi người dùng; cái giá là phải sửa prompt, schema đầu ra (`translation_vi` thành tùy chọn) và ví dụ trong prompt, cộng thêm chất lượng câu sinh từ định nghĩa tiếng Anh chưa được kiểm (chưa gọi nhà cung cấp thật, D19), cần thử bằng key của chủ dự án trước khi tin. Hướng B không sửa prompt nhưng buộc một nhánh chặn ở API và UI, nghĩa là chính nó mới là special case, và người `en` đang trả tiền Pro sẽ thấy tính năng nằm trong gói mà không dùng được. Khuyến nghị: A; segment này nhỏ và không có số liệu, nên chỉ làm bản tối thiểu (một trường, không tối ưu riêng prompt cho `en`), và nếu chủ dự án chọn B thì ghi rõ lý do là chi phí sửa prompt.

**Chưa xác minh:** quy mô thật của `en` trong app này (không có dữ liệu ngoài); chất lượng câu AI sinh từ định nghĩa tiếng Anh; việc app lớn có dùng AI nội bộ để sinh câu hay không.
