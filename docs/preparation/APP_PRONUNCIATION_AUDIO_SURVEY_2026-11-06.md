# Các app hiện có làm audio phát âm thế nào (khảo sát 06/11/2026)

Câu hỏi của chủ dự án: app học từ vựng muốn có audio UK và US cho từng từ (có thể cả câu ví dụ). Các app đang có
trên thị trường làm việc này ra sao: thu âm người thật hay TTS, vendor nào, có cả UK lẫn US không, file dựng sẵn
hay sinh lúc cần, nội dung người dùng tự tạo được đọc bằng gì, có hiện IPA không.

Tài liệu cùng đợt: `TTS_PROVIDERS_RESEARCH_2026-11-06.md` (so sánh nhà cung cấp cloud TTS) và
`LOCAL_TTS_MODELS_RESEARCH_2026-11-06.md` (TTS tự host). File này chỉ trả lời "các app khác làm thế nào".

## Cách đọc nhãn nguồn

Mọi nguồn dưới đây được mở trong phiên 06/11/2026, trừ chỗ ghi khác.

| Nhãn | Nghĩa |
|---|---|
| **[chính thức]** | Trang help, blog, tài liệu API hoặc trang app store của chính công ty đó |
| **[quan sát]** | Mình mở trang hoặc tải HTML hôm nay và đọc thẳng thẻ `<audio>`, thuộc tính `data-src-mp3`, header HTTP. Đây là bằng chứng về **cách file được phục vụ**, không phải về cách file được làm ra |
| **[bên thứ ba]** | Bài báo, review, công cụ scraper, add-on của người khác |
| **[chưa mở được]** | Chỉ thấy trong đoạn trích của kết quả tìm kiếm, trang gốc bị chặn (403, Cloudflare) hoặc 404. Coi là chưa xác minh |
| **không tìm thấy nguồn** | Đã tìm, không có nguồn công khai. Không đoán |

Một giới hạn chung: nghe một file mp3 không cho biết chắc nó là giọng người hay TTS. Chỗ nào không có nguồn nói rõ
"thu âm" hay "TTS" thì ghi "không tìm thấy nguồn", kể cả khi file được phục vụ như file ghi âm.

## Bảng tóm tắt

| App | Người thu hay TTS | Vendor TTS | UK + US | File dựng sẵn hay sinh lúc cần | Nội dung người dùng | IPA |
|---|---|---|---|---|---|---|
| Cambridge Dictionary | Chưa xác minh (trang chặn) | — | Có (bên thứ ba) | File mp3/ogg theo từ (bên thứ ba) | — | Có UK và US (bên thứ ba) |
| Oxford Learner's | "Real-voice" (chính thức, app) | — | Có | File mp3 + ogg theo từ, mỗi giọng một file (quan sát) | — | Có UK và US (quan sát) |
| Longman (LDOCE) | không tìm thấy nguồn | — | Có | File mp3 theo từ **và theo từng câu ví dụ** (quan sát) | — | Có (quan sát) |
| Merriam-Webster | không tìm thấy nguồn | — | Chỉ US (audio) | File mp3 tĩnh trên S3, URL đoán được (chính thức + quan sát) | — | Không; dùng ký hiệu riêng của MW |
| Google Search | không tìm thấy nguồn | — | Có, nút chuyển | File mp3 tĩnh theo từ và giọng, cache 1 năm (quan sát) | — | Không; hiện "Sounds like" |
| Google Translate | TTS (chính thức, 2010) | Của Google; eSpeak cho một số ngôn ngữ năm 2010 | không tìm thấy nguồn | Sinh theo văn bản bất kỳ; cơ chế hiện nay chưa xác minh | Có (mọi văn bản nhập) | — |
| Quizlet | TTS + ghi âm tay (Plus) | không tìm thấy nguồn | Danh sách chỉ ghi "English" | không tìm thấy nguồn | Có: TTS theo ngôn ngữ chọn cho từng mặt thẻ, tối đa 300 ký tự | không tìm thấy nguồn |
| Anki (lõi) | TTS của hệ điều hành | Giọng của Windows/macOS/iOS | Tùy mã ngôn ngữ, ví dụ `en_US` | Sinh lúc ôn, trên máy | Có | — |
| Anki + HyperTTS / AwesomeTTS | TTS cloud hoặc lấy file từ điển | Azure, Google, Polly, ElevenLabs, OpenAI, Forvo, Oxford, Collins… | Tùy giọng chọn | Sinh hàng loạt thành file trong bộ thẻ, hoặc phát realtime trên desktop | Có | — |
| Duolingo | TTS | Amazon Polly (2017); Azure Custom Neural Voice cho giọng nhân vật (2023) | không tìm thấy nguồn | Sinh bất đồng bộ (không sinh lúc phát), lưu S3, phát qua CloudFront (2017) | — | — |
| Memrise | Video người thật, không TTS (chính thức) | — | không tìm thấy nguồn | — | — | — |
| ELSA Speak | không tìm thấy nguồn | không tìm thấy nguồn | Có chọn giọng American, British… (app store) | không tìm thấy nguồn | — | Chưa xác minh |
| Babbel | Người bản ngữ đọc (chính thức) | — | không tìm thấy nguồn | — | — | — |
| Busuu | Ghi âm từng từ, câu ví dụ, hội thoại (chính thức) | — | không tìm thấy nguồn | — | — | — |
| Study4 | không tìm thấy nguồn | — | — | — | Tạo flashcard từ highlight (quan sát) | Ô tra từ nhúng Laban (quan sát) |
| Laban Dictionary | không tìm thấy nguồn | — | Có nút UK, US (quan sát) | Gọi API lấy URL file theo từ và giọng; hôm nay API trả lỗi (quan sát) | — | Có UK và US (quan sát) |
| TFlat | không tìm thấy nguồn | — | "phát âm US và UK" (app store) | không tìm thấy nguồn | — | không tìm thấy nguồn |
| Prep (Prep Vocab) | không tìm thấy nguồn | — | không tìm thấy nguồn | — | — | Có phiên âm (chính thức) |
| Monkey Stories | "vocal recording" (app store), không nói người hay máy | — | Chỉ American | — | — | — |
| Eng Breaking | không tìm thấy nguồn | — | American | 264 file audio, hai tốc độ (app store) | — | Dạy 40 âm IPA (app store) |

## Từ điển

### Cambridge Dictionary

- Trang `dictionary.cambridge.org` trả 403 cho `curl` và hiện trang kiểm tra bot của Cloudflare trong trình duyệt
  ("Performing security verification") **[quan sát]**. Mình không vượt qua bước này. Bản lưu trên Wayback Machine trả
  429 (quá nhiều request) trong cả phiên. Vì vậy mọi điều về Cambridge dưới đây là **bên thứ ba**.
- Scraper trên Apify mô tả có URL audio riêng cho UK và US, "single words only", kèm IPA UK và US. Ví dụ URL
  `…/medias/english/uk_pron/…/uk_serendipity_GB_1.mp3` và `…/us_pron/s/ser/seren/serendipity.mp3`
  **[bên thứ ba]**: https://apify.com/alvaraaz/cambridge-dictionary-actor
- Thư viện `camb-dict` trên GitHub ví dụ bốn file cho một từ: mp3 và ogg, mỗi loại một bản UK và một bản US, dưới
  `/media/english/uk_pron/`, `/us_pron/`, `/uk_pron_ogg/`, `/us_pron_ogg/` **[bên thứ ba]**:
  https://github.com/twlite/camb-dict
- Mình thử `curl` hai URL mp3 trong ví dụ trên: cả hai trả 403 HTML, không phải audio **[quan sát]**. Không kết luận
  được file có tồn tại hay không.
- Audio do người bản ngữ thu: chỉ thấy trong đoạn trích kết quả tìm kiếm về các app của Cambridge (Audio Cambridge
  Advanced Learner's Dictionary, English Pronouncing Dictionary). Các trang app store đó trả 404 hôm nay
  **[chưa mở được]**: https://apps.apple.com/app/id728359831, https://apps.apple.com/us/app/id1203628859

### Oxford Learner's Dictionaries

- Trang mục từ `schedule` có 2 file audio cho từ chính, mỗi file có bản mp3 và ogg **[quan sát]**:
  - `https://www.oxfordlearnersdictionaries.com/media/english/uk_pron/s/sch/sched/schedule__gb_1.mp3`
  - `https://www.oxfordlearnersdictionaries.com/media/english/us_pron/s/sch/sched/schedule__us_1_rr.mp3`
  - Đường dẫn chia thư mục theo 1, 3, 5 chữ cái đầu; tên file có hậu tố `_gb_1` / `_us_1`, tức một file cho mỗi
    cách đọc, không phải mỗi từ.
  - Nguồn: https://www.oxfordlearnersdictionaries.com/definition/english/schedule_1
- Header HTTP của file UK: `Content-Type: audio/mpeg`, 20.898 byte, `Cache-Control: public, max-age=14400`, đi qua
  Cloudflare **[quan sát]**.
- IPA hiện cả hai: `/ˈʃedjuːl/` và `/ˈskedʒuːl/` **[quan sát]** (cùng URL trên).
- Câu ví dụ: trang có 21 câu ví dụ nhưng chỉ có 2 URL audio khác nhau (đều là từ chính), nên trên web, mục này
  **không có audio cho câu ví dụ** **[quan sát]**.
- App OALD trên Google Play: "Listen to real-voice pronunciation with both British and American accents"
  **[chính thức]**: https://play.google.com/store/apps/details?id=com.oup.elt.oald10_gp
- Trang FAQ: các trang danh sách từ cho "listen to British English and North American English pronunciations"
  **[chính thức]**: https://www.oxfordlearnersdictionaries.com/faq/

### Longman Dictionary of Contemporary English (LDOCE)

- Trang `schedule` có 14 thuộc tính `data-src-mp3` thuộc ba thư mục **[quan sát]**:
  - `media/english/breProns/schedule_n0205.mp3` (tiêu đề nút: "Play British pronunciation of schedule")
  - `media/english/ameProns/schedule1.mp3` ("Play American pronunciation of schedule")
  - `media/english/exaProns/p008-001581737.mp3` và các file `exaProns` khác: **audio cho từng câu ví dụ**
  - Nguồn: https://www.ldoceonline.com/dictionary/schedule
- File câu ví dụ trả `Content-Type: audio/mpeg`, 13.270 byte **[quan sát]**.
- IPA: British `/ˈʃedjuːl, ˈske-/`, American `/ˈskedʒʊl, -dʒəl/` **[quan sát]** (cùng URL).
- Ai thu âm: **không tìm thấy nguồn** chính thức. Trang `about.html` của LDOCE không có chữ nào về audio
  **[quan sát]**: https://www.ldoceonline.com/about.html

### Merriam-Webster

- Trang mục từ dùng ký hiệu phát âm riêng của MW (`ˈske-(ˌ)jül`, `ˈshe-(ˌ)dyül`), không dùng IPA. Cách đọc Anh chỉ hiện
  bằng chữ ("British usually ˈshe-…"); mọi nút audio có `data-lang="en_us"` **[quan sát]**:
  https://www.merriam-webster.com/dictionary/schedule
- Tài liệu API chính thức cho công thức URL audio:
  `https://media.merriam-webster.com/audio/prons/[language_code]/[country_code]/[format]/[subdirectory]/[base filename].[format]`;
  `country_code` là `us` cho mọi từ điển trừ Tây Ban Nha–Anh; định dạng mp3, wav hoặc ogg **[chính thức]**:
  https://dictionaryapi.com/products/json
- `curl` tới `…/en/us/mp3/s/schedu01.mp3`: 200, `audio/mpeg`, 5.516 byte, `Server: AmazonS3` **[quan sát]**.
- FAQ: khoảng 105.000 audio; nhiều từ có nhiều cách đọc nhưng thường chỉ cách đọc đầu tiên có audio **[chính thức]**:
  https://www.merriam-webster.com/help/faq-audio-pronunciations (trang này còn nhắc tới file WAV và cửa sổ pop-up,
  nên có thể viết từ lâu).
- Ai thu âm: **không tìm thấy nguồn**.

### Google Search ("how to pronounce …")

- Hộp phát âm có nút chọn "American pronunciation" / "British pronunciation", nút "Slow", nút "Pronunciation
  animation" và dòng "Sounds like skeh·jool" (US) / "sheh·jool" (UK). Không hiện IPA **[quan sát]**:
  https://www.google.com/search?q=how+to+pronounce+schedule&hl=en
- Bấm phát, thẻ `<audio>` nhận file tĩnh theo từ và giọng **[quan sát]**:
  - `https://ssl.gstatic.com/dictionary/static/pronunciation/2024-04-19/audio/sc/schedule_en_us_1.mp3`
  - `https://ssl.gstatic.com/dictionary/static/pronunciation/2024-04-19/audio/sc/schedule_en_gb_1.mp3`
- Header hai file: `audio/mpeg`, 7.296 và 7.104 byte, `Cache-Control: public, max-age=31536000` (1 năm),
  `Last-Modified: 26/04/2024` **[quan sát]**. Đường dẫn có ngày `2024-04-19`, tức cả bộ file được dựng theo lô và
  đánh phiên bản theo ngày (suy luận từ URL, chưa có nguồn chính thức).
- Blog Google 14/11/2019 giới thiệu tính năng luyện phát âm trong Search, ra trước cho American English; bài không
  nói audio làm bằng người hay máy **[chính thức]**:
  https://blog.google/products-and-platforms/products/search/how-do-you-pronounce-quokka-practice-search/
- Search Engine Journal 19/12/2018: chuyển American/British, nghe chậm, hình môi **[bên thứ ba]**:
  https://www.searchenginejournal.com/new-google-search-feature-teaches-people-how-to-pronounce-words/284105/
- Người thu hay TTS: **không tìm thấy nguồn**.

### Google Translate

- Blog Google 11/05/2010: nút loa đọc bản dịch là "text-to-speech"; tiếng Anh có trước; thêm hơn 20 ngôn ngữ bằng
  bộ tổng hợp mã nguồn mở eSpeak, chất lượng kém hơn **[chính thức]**:
  https://googleblog.blogspot.com/2010/05/giving-voice-to-more-languages-on.html
- Hôm nay, bấm "Listen to source text" thấy trang gửi một request `batchexecute?rpcids=jQ1olc`; mình không đọc được
  nội dung trả về, nên **chưa xác minh** request đó có chứa audio hay không **[quan sát]**:
  https://translate.google.com/?sl=en&tl=vi&text=schedule&op=translate
- Có chọn giọng UK/US không: **không tìm thấy nguồn**.

## App flashcard (nội dung do người dùng tạo)

### Quizlet

- TTS có ở Flashcards, Learn, Test; không có ở Match và Quizlet Live. Văn bản dài hơn 300 ký tự thì không phát TTS.
  Danh sách ngôn ngữ TTS ghi "English" (không tách UK/US); tiếng Việt chỉ dành cho Quizlet Plus **[chính thức]**:
  https://help.quizlet.com/hc/en-us/articles/360030514232-Troubleshooting-audio-playback
- Ngôn ngữ phát audio được chọn cho từng ô thuật ngữ / định nghĩa khi sửa bộ thẻ **[chính thức]**:
  https://help.quizlet.com/hc/en-us/articles/360030212131-Editing-sets
- Người dùng Plus tự ghi âm vào thẻ trên web (giữ phím cách để thu) **[chính thức]**:
  https://help.quizlet.com/hc/en-us/articles/360029769792-Recording-custom-audio
- Vendor TTS và audio sinh trước hay lúc cần: **không tìm thấy nguồn**.

### Anki

- Thẻ `{{tts en_US:Front}}` đọc trường Front bằng giọng US English; trên Windows, macOS, iOS Anki dùng giọng có sẵn
  của hệ điều hành; Linux không có, phải cài add-on; cần Anki 2.1.20, AnkiMobile 2.0.56 hoặc AnkiDroid 2.17
  **[chính thức]**: https://docs.ankiweb.net/templates/fields.html
  - Ý nghĩa cho app web: đây là cùng ý tưởng với Web Speech API, giọng phụ thuộc máy người học.
- **HyperTTS** (add-on): dịch vụ trả phí Google Cloud, Microsoft Azure, Amazon Polly, Forvo, Naver, VocalWare, Watson,
  CereProc, FPTAI, ElevenLabs; dịch vụ miễn phí Google Translate, Naver Papago, Collins, Oxford, Lexico, Duden, DWDS,
  SAPI5; dịch vụ trả phí cần API key của người dùng **[chính thức, trang add-on]**:
  https://ankiweb.net/shared/info/111623432
  - Sinh audio cho cả bộ thẻ hoặc một phần, file dùng được trên AnkiMobile và AnkiDroid; hoặc sinh realtime khi ôn trên
    desktop **[chính thức]**: https://www.vocab.ai/hypertts
  - "Oxford", "Collins" ở đây là lấy file ghi âm sẵn của từ điển, "Forvo" là kho ghi âm người thật (trang vocab.ai gọi
    là "online repositories of human-recorded audio files").
- **AwesomeTTS**: tác giả ghi "not supported anymore", khuyên chuyển sang HyperTTS. Một review dán đường dẫn cache
  `…/addons21/1436550454/user_files/cache/google-….mp3`, cho thấy add-on lưu mp3 vào cache; tác giả trả lời rằng dịch vụ
  "Cambridge" vẫn chạy với từ đơn **[chính thức + review]**: https://ankiweb.net/shared/info/1436550454

## App học ngôn ngữ

### Duolingo

- Blog AWS 12/05/2017 (kỹ sư Duolingo viết): chuyển sang TTS vì thu âm người tốn thời gian và chi phí; Amazon Polly
  thắng sáu A/B test, giọng tiếng Anh là "Sally" (bài không nói US hay UK); audio được sinh bất đồng bộ, không phải lúc
  người học bấm; file lưu S3, CloudFront cache; DynamoDB giữ trạng thái để không sinh trùng cùng một câu; dùng SSML để
  sửa lỗi phát âm **[chính thức]**:
  https://aws.amazon.com/blogs/machine-learning/powering-language-learning-on-duolingo-with-amazon-polly
- Blog Duolingo 23/08/2021: diễn viên lồng tiếng thu trước, rồi dựng giọng TTS riêng cho từng nhân vật; giọng này
  "can be used to say any sentence in the course"; chuyên gia ngôn ngữ sửa phát âm khi cần **[chính thức]**:
  https://blog.duolingo.com/character-voices
- Blog Microsoft 23/02/2023: Duolingo dùng Custom Neural Voice của Azure cho giọng nhân vật, thu 6.000 câu để dựng
  giọng **[chính thức, đối tác]**:
  https://www.microsoft.com/en-us/startups/blog/duolingo-makes-learning-language-fun-with-help-from-ai/
- Hai nguồn trên khác thời điểm: 2017 là Polly, 2023 là Azure cho giọng nhân vật. Vendor hiện nay cho toàn bộ khóa học:
  **không tìm thấy nguồn**. UK/US: **không tìm thấy nguồn**.

### Memrise

- "Every lesson on Memrise is built around short videos of real people, rather than robotic voices" **[chính thức]**:
  https://www.memrise.com/about
- File `llms.txt` của Memrise cũng nói video người bản ngữ là tính năng chính, thay cho text-to-speech
  **[chính thức]**: https://www.memrise.com/llms.txt
- UK/US, IPA, nội dung người dùng: **không tìm thấy nguồn**.

### ELSA Speak

- App Store: "accent choices: American, British, Australian, and more" **[chính thức]**:
  https://apps.apple.com/us/app/elsa-speak-english-learning/id1083804886
- Các bài help (Freshdesk, elsaspeak.com/faqs) mà kết quả tìm kiếm trích, gồm "chấm điểm theo American English", "IPA
  chỉ theo chuẩn Mỹ", "giọng chọn chỉ áp dụng cho bài sinh bằng AI", "từ điển có audio người bản ngữ", đều trả 404 hoặc
  bắt đăng nhập hôm nay **[chưa mở được]**.
- Vendor TTS và cách sinh audio: **không tìm thấy nguồn**.

### Babbel

- "all 100,000 hours of our content are voiced by native speakers" **[chính thức]**:
  https://support.babbel.com/hc/en-us/articles/205600528-Benefits-of-learning-with-Babbel
- UK/US, TTS cho tính năng AI: **không tìm thấy nguồn**.

### Busuu

- "Audio recordings of each vocabulary item, plus example sentences and dialogues" **[chính thức]**:
  https://www.busuu.com/en/it-works/busuu-methodology
- Blog 19/08/2011: từ điển có "recordings by native speakers" **[chính thức, cũ]**: https://blog.busuu.com/?p=2194
- TTS, UK/US: **không tìm thấy nguồn**.

## App Việt Nam

### Study4

- Trang Flashcards công khai có các bộ từ (văn phòng, giao tiếp, TOEFL, IELTS…) và ghi "Bạn có thể tạo flashcards từ
  highlights"; mở một bộ thì bị chuyển sang trang đăng nhập **[quan sát]**: https://study4.com/flashcards/discover/
- Ô "Từ điển" trên thanh trên cùng có tab "Anh-Việt" trỏ tới `data-href="https://m.dict.laban.vn/"`, tức Study4 nhúng
  từ điển Laban **[quan sát]**: https://study4.com/user-guide/
- Audio trong flashcard (người hay TTS, UK/US): **không tìm thấy nguồn** (cần đăng nhập; mình không tạo tài khoản).

### Laban Dictionary

- Trang tra `schedule` hiện hai IPA `/'s∫edju:l/` và `/'skedʒʊl/`, cùng hai nút "Đọc giọng UK" và "Đọc giọng US" đang
  ẩn (`class="sp_uk hidden"`) **[quan sát]**: https://dict.laban.vn/find?type=1&query=schedule (chuyển hướng sang
  `dict.zlb.zapps.me`)
- Script trên trang gọi `/ajax/getsound?accent=uk&word=schedule` và `accent=us`; nếu `error == "0"` thì lấy URL file
  trong `data`, bỏ ẩn nút và phát bằng thẻ `<audio>`. Tức là **một file dựng sẵn cho mỗi từ và mỗi giọng**
  **[quan sát]**.
- Hôm nay API trả `{"error":-1, "data":""}` cho `schedule`, `hello`, `water` ở cả UK và US, nên nút audio trên web
  không hiện **[quan sát]**.
- Nguồn audio (người hay TTS): **không tìm thấy nguồn**. Trang App Store của app Laban trả 404 hôm nay
  **[chưa mở được]**: https://apps.apple.com/app/id794224034

### TFlat

- App Store: "phát âm US và UK chuẩn", "phát âm giọng Anh Mỹ và Anh Anh chuẩn"; nhà phát triển Thang Le, © KALA
  **[chính thức]**: https://apps.apple.com/be/app/tflat-dictionary/id591049834
- Người hay TTS, file hay sinh lúc cần, IPA: **không tìm thấy nguồn**.

### Prep (Prep Vocab)

- Tin 28/08/2026: mỗi từ có "ví dụ là câu hoàn chỉnh có nút nghe phát âm", có phiên âm, có bài "chấm điểm phát âm"
  **[chính thức]**: https://prepedu.com/vi/news/ra-mat-prep-vocab
- UK/US, vendor: **không tìm thấy nguồn**.

### Monkey Stories (EarlyStart)

- App Store: "Standard American English pronunciation and intonation", "standardized English voices", phụ đề tô từng
  chữ "in time with the vocal recording", 430+ sách nói **[chính thức]**:
  https://apps.apple.com/vn/app/monkey-stories-books-reading/id1236664909
- Không nói rõ người đọc hay máy đọc: **không tìm thấy nguồn**.

### Eng Breaking (GOGA)

- App Store: "264 audio files ranging from easy to difficult, at two speeds", "standard American English pronunciation",
  khóa "40 standard IPA sounds" **[chính thức]**:
  https://apps.apple.com/vn/app/learning-english-eng-breaking/id1603168534
- Người hay TTS: **không tìm thấy nguồn**.

### Laban/Zalo và các app khác

Không tìm thấy thêm app từ vựng Việt Nam nào có nguồn công khai về cách làm audio. Một điểm phụ: danh sách dịch vụ của
HyperTTS có "FPTAI", tức FPT.AI có API TTS mà cộng đồng Anki đã nối vào
(https://ankiweb.net/shared/info/111623432).

## Các mẫu chung

```
Từ điển (Oxford, Longman, MW, Google Search, Laban; Cambridge theo bên thứ ba)
  1 cách đọc × 1 giọng  →  1 file mp3 (thường kèm ogg)
  URL đoán được từ tên từ: /uk_pron/s/sch/sched/schedule__gb_1.mp3
  phục vụ tĩnh qua CDN/S3, cache dài (Google: 1 năm)
  không sinh lúc người dùng bấm

App khóa học (Duolingo)
  TTS, nhưng sinh bất đồng bộ trước lúc phát → lưu S3 → CloudFront; không sinh trùng một câu

App khóa học bán "giọng thật" (Babbel, Busuu, Memrise)
  ghi âm / video người bản ngữ là điểm bán hàng

App flashcard có nội dung người dùng (Quizlet, Anki)
  Quizlet: TTS phía server theo ngôn ngữ của từng ô, giới hạn 300 ký tự; tự ghi âm là tính năng trả phí
  Anki: giọng của hệ điều hành (giống Web Speech API), hoặc add-on sinh file một lần rồi lưu vào bộ thẻ
```

1. **Từ trong catalog = file dựng sẵn, mỗi cách đọc một file.** Không từ điển nào trong mẫu quan sát sinh audio từ
   chính lúc bấm. Tên file gắn với cách đọc (`_1`, `_rr`, `schedule_n0205`), không chỉ với chữ viết, vì một từ có thể
   có nhiều cách đọc (MW có `schedu01`, `sched01m`, `sched02m` cho cùng `schedule`).
2. **UK + US là chuẩn của từ điển học thuật Anh** (Oxford, Longman, Cambridge theo bên thứ ba) và của Google Search,
   Laban, TFlat. Merriam-Webster, Monkey Stories, Eng Breaking chỉ có giọng Mỹ.
3. **Câu ví dụ có audio là ngoại lệ trên web.** Longman có file cho từng câu; Oxford web không có ở mục đã xem; MW không
   thấy. Duolingo sinh audio cho câu bằng TTS.
4. **Nội dung người dùng gần như luôn là TTS**, vì không ai thu âm trước được. Hai cách: server sinh rồi cache
   (Quizlet theo help, Duolingo theo blog AWS cho câu khóa học, HyperTTS sinh file), hoặc giọng trên máy (Anki lõi). Tự
   ghi âm chỉ là tính năng phụ, trả phí (Quizlet Plus).
5. **IPA đi kèm audio ở từ điển học thuật và app Việt** (Oxford, Longman, Laban). MW và Google Search thay IPA bằng
   cách viết "đọc như" riêng.

## Hàm ý cho app nhỏ này

Đây là suy luận từ các mẫu trên, không phải điều đã đo.

- **Từ trong catalog (mục tiêu 8.812 từ, D6 Bước 3): dựng sẵn file UK và US một lần, phục vụ tĩnh.** Đây là cách của
  mọi từ điển trong mẫu. Khóa file nên là *cách đọc* chứ không phải *chữ*: ví dụ `record` danh từ và động từ đọc khác
  nhau, nên cần gắn file với sense hoặc với IPA, giống tên `_1`/`_2` của Oxford, Google. Có ngày hoặc phiên bản trong
  đường dẫn (như `2024-04-19` của Google) để đổi giọng hay sửa lỗi mà không vướng cache dài.
- **Câu ví dụ catalog:** nếu muốn có, cũng dựng sẵn (như Longman cho câu, Duolingo cho câu khóa học). Chi phí theo ký
  tự xem ở `TTS_PROVIDERS_RESEARCH_2026-11-06.md`.
- **Từ riêng của người học:** không thu âm trước được, nên có hai lựa chọn như Quizlet / Anki:
  - sinh TTS ở server lần đầu có người bấm, lưu lại theo khóa `văn bản + giọng`, lần sau phục vụ file (cách Duolingo
    chống sinh trùng); cần giới hạn độ dài (Quizlet: 300 ký tự) và hạn mức;
  - hoặc dùng giọng của trình duyệt (Web Speech API), giống Anki dùng giọng hệ điều hành: không tốn tiền, nhưng giọng và
    việc có giọng `en-GB` hay không phụ thuộc máy người học.
- **Hiện IPA cạnh nút nghe**, theo cách của Oxford, Longman, Laban (cả UK và US).

## Điểm chưa xác minh

1. **Cambridge:** cấu trúc URL mp3/ogg UK, US và IPA chỉ từ bên thứ ba; trang bị Cloudflare chặn, Wayback trả 429, URL
   mp3 thử bằng `curl` trả 403. Câu "thu bởi người bản ngữ" chỉ có trong đoạn trích tìm kiếm, trang app store 404.
2. **Oxford, Longman, Merriam-Webster, Google Search:** cách *phục vụ* file đã quan sát, nhưng file *làm bằng* người hay
   TTS thì không có nguồn (Oxford chỉ có chữ "real-voice" trên trang app).
3. **Oxford app** có audio cho câu ví dụ hay không: chỉ có đoạn trích tìm kiếm, không mở được nguồn.
4. **Google Translate hiện nay:** request `jQ1olc` lúc bấm nghe chưa đọc được nội dung; có chọn UK/US hay không chưa
   rõ.
5. **Quizlet:** vendor TTS, audio sinh trước hay lúc cần, có tách UK/US không (danh sách chỉ ghi "English").
6. **Duolingo:** vendor hiện nay cho toàn khóa học (2017 Polly, 2023 Azure cho giọng nhân vật); giọng tiếng Anh UK hay
   US.
7. **ELSA:** mọi chi tiết ngoài dòng "accent choices" trên App Store (chấm theo chuẩn Mỹ, IPA chỉ chuẩn Mỹ, từ điển có
   audio người bản ngữ) đến từ trang help không mở được.
8. **Babbel, Busuu, Memrise:** có UK/US không; Busuu có dùng TTS cho tính năng mới không. Nguồn Busuu về "người bản ngữ"
   là bài năm 2011.
9. **Laban:** audio app (khác web) có chạy không, nguồn audio là gì; API web hôm nay trả lỗi nhưng không rõ là lỗi tạm
   hay đã bỏ tính năng.
10. **Study4:** audio trong flashcard (cần đăng nhập). **TFlat, Prep, Monkey, Eng Breaking:** người thu hay TTS, file hay
    sinh lúc cần.
11. **Memrise khóa cộng đồng:** đoạn trích tìm kiếm nói khóa cộng đồng đã rời app ngày 31/03/2024; chưa mở nguồn nên
    không dùng trong báo cáo.
