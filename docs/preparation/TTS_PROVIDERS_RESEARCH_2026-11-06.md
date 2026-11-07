# Nghiên cứu nhà cung cấp text-to-speech (TTS) cho giọng en-GB và en-US — 06/11/2026

Desk research. Chỉ đọc trang giá, docs và terms chính thức; không đăng ký, không gọi API. Báo cáo này **không đề xuất**
nhà cung cấp nào: chủ dự án quyết trước.

**Nhãn:** (Đ) đọc trang chính thức trong phiên này · (T) bên thứ ba hoặc đoạn trích từ kết quả tìm kiếm · (S) suy luận ·
(?) không tìm thấy hoặc không kiểm được. Nguồn đánh số [V1]… ở §9, tất cả đọc ngày 06/11/2026.

**Cách đọc:** phần lớn trang được đọc qua công cụ WebFetch (một model nhỏ tóm tắt trang). Các con số quyết định đã được
đối chiếu với văn bản gốc: giá Google đọc từ HTML tải bằng `curl` [V1]; giá Azure đọc từ Azure Retail Prices API chính
thức [V13] vì trang giá Azure không hiện số khi tải không có JavaScript [V12]; danh sách giọng Azure đọc từ HTML gốc [V14].

---

## §0 Tóm tắt (10 điểm)

1. **Cả 6 nhóm đều có cả en-GB và en-US**, nhưng chênh nhau nhiều về số giọng en-GB: Google 63 giọng en-GB (30 trong số đó
   là Chirp 3 HD) (Đ) [V2]; Azure 20 (14 neural thường, 2 multilingual, 4 HD) (Đ) [V14]; Polly 4 (Đ) [V22]; Deepgram Aura-2
   qua Cloudflare chỉ 2 (Đ) [V45]; OpenAI không có giọng theo vùng, chỉ chỉnh accent bằng prompt trên `gpt-4o-mini-tts` (Đ) [V28];
   ElevenLabs không nêu số giọng British trong trang đã đọc (?) [V40].
2. **Chi phí của cả ba kịch bản đều nhỏ.** Pre-generate 7.800 từ × 2 accent ≈ 125 nghìn ký tự: từ $0 (nằm trong free tier) tới
   khoảng $10 ở mọi nhà cung cấp (S, tính ở §3). Thêm 2 câu ví dụ/từ ≈ 2,0 triệu ký tự: $0 tới ~$160. On-demand 800 nghìn ký
   tự/tháng: $0 tới ~$64/tháng.
3. **IPA qua `<phoneme alphabet="ipa">`** chạy được trên Google (Standard/WaveNet/Neural2, và Chirp 3 HD khi gọi sync) (Đ) [V3][V5],
   Azure (giọng neural thường và DragonHD; **không** chạy trên DragonHD Omni) (Đ) [V15][V16], Polly (Neural đầy đủ, Generative
   một phần) (Đ) [V23]. ElevenLabs chỉ trên `eleven_flash_v2` (v4 dùng IPA trong dấu `/…/`, không phải thẻ) (Đ) [V38]. OpenAI,
   Gemini TTS và Deepgram Aura không thấy tài liệu nào nói hỗ trợ (?) [V6][V28][V43].
4. **Bộ âm vị IPA của mỗi nhà cung cấp là bộ riêng theo locale.** Google liệt kê bộ en-GB (có ɒ, ɜː, əʊ, eə, iə, ʊə) khác bộ en-US
   (có ɚ, oʊ) (Đ) [V4]; Azure trả HTTP 400 nếu chuỗi IPA chứa âm vị nó không biết (Đ) [V15]. IPA của dự án phải được chuẩn hóa
   về đúng bộ đó trước khi gửi (S).
5. **Cách tính ký tự khác nhau khi dùng SSML.** Google tính mọi thẻ SSML trừ `<mark>` (Đ) [V1]; Azure tính mọi markup trừ `<speak>`
   và `<voice>` (Đ) [V17]; Polly không tính thẻ SSML (Đ) [V24]. Một từ bọc `<phoneme>` tốn ~50–65 ký tự thay vì ~8 (S).
6. **Lưu file và phát lại cho người dùng:** Polly nói rõ được cache và replay không tốn thêm và output thuộc về khách (Đ) [V26];
   ElevenLabs cho dùng thương mại trên gói trả phí, gói Free cấm thương mại và bắt ghi "elevenlabs.io" (Đ) [V35][V36]; Google
   coi Generated Output là Customer Data và chỉ cấm dùng output để huấn luyện model cạnh tranh (Đ) [V10]; OpenAI bắt báo cho
   người dùng cuối rằng giọng là AI (Đ) [V28]. Azure: không đọc được điều khoản riêng về output (?).
7. **Dữ liệu câu của người học:** Azure (real-time) không lưu text và audio (Đ) [V19]; Google không log text và audio TTS (Đ) [V9];
   OpenAI không train, giữ 30 ngày cho abuse monitoring (Đ) [V30]; Polly có thể dùng text để cải thiện dịch vụ trừ khi opt-out
   bằng AWS Organizations policy (Đ) [V26]; ElevenLabs mặc định được dùng nội dung để cải thiện dịch vụ, có opt-out, zero
   retention chỉ cho enterprise (Đ) [V35][V39]; Deepgram Aura trên Cloudflare ghi "Zero data retention: Yes" (Đ) [V43].
8. **Ba mốc thời gian gần:** OpenAI gỡ `tts-1`, `tts-1-hd`, `gpt-4o-mini-tts` khỏi API ngày **06/01/2027** (Đ) [V29]; giọng Default
   của ElevenLabs hết hạn **31/12/2026** (Đ) [V40]; giá Gemini 3.8 Flash TTS của Google **tăng gấp đôi từ 01/01/2027** (Đ) [V1].
9. **Đăng ký từ Việt Nam:** OpenAI có Việt Nam trong danh sách quốc gia hỗ trợ (Đ) [V32]; Google Cloud Billing ở Việt Nam là VND,
   chỉ **credit card** (không ghi debit) (Đ) [V11]; Azure free account có Việt Nam, tính bằng USD (Đ) [V20]; ElevenLabs tính USD cho
   mọi nước ngoài Ấn Độ (Đ) [V41]. AWS và Cloudflare: chưa kiểm phần riêng cho Việt Nam (?).
10. **Không kiểm được:** chất lượng nghe thực tế của từng giọng, độ chính xác IPA thật, latency đo được, và điều khoản output của
    Azure, Cloudflare/Deepgram (§8).

---

## §1 Bảng so sánh

Giá là list price, USD trên 1 triệu ký tự trừ khi ghi khác. "Free/tháng" là free tier hằng tháng.

| Nhà cung cấp, tier | Giọng en-GB | Giọng en-US | Giá /1M ký tự | Free/tháng | `<phoneme>` IPA | Text đầu vào | Lưu và phát lại audio | Việt Nam |
|---|---|---|---|---|---|---|---|---|
| Google Standard | 7 (Đ) [V2] | 10 (Đ) [V2] | $4 (Đ) [V1] | 4M chung SKU với WaveNet (Đ) [V1] | Có (Đ) [V3][V4] | Không log (Đ) [V9] | Không thấy hạn chế (S) [V10] | Credit card, VND (Đ) [V11] |
| Google WaveNet | 7 (Đ) | 10 (Đ) | $4 (Đ) | 4M (Đ) | Có (Đ) | như trên | như trên | như trên |
| Google Neural2 | 7 (Đ) | 9 (Đ) | $16 (Đ) | 1M (Đ) | Có (Đ) | như trên | như trên | như trên |
| Google Chirp 3 HD | 30 (Đ) | 30 (Đ) | $30 (Đ) | 1M (Đ) | Có khi gọi sync, không khi streaming (Đ) [V5] | như trên | như trên | như trên |
| Google Studio | 2 (Đ) | 2 (Đ) | $160 (Đ) | 1M (Đ) | (?) | như trên | như trên | như trên |
| Google Gemini TTS | en-GB là Preview (Đ) [V6] | GA (Đ) [V6] | Theo token: 2.5 Flash $0,50/1M text + $10/1M audio token; 3.8 Flash $9 (tới 31/12/2026) rồi $18 (Đ) [V1] | Không (Đ) [V1] | Không thấy tài liệu (?) [V6] | như trên | Output là Customer Data (Đ) [V10] | như trên |
| Azure Neural (gọi là Standard trong docs) | 14 (Đ) [V14] | 31 (Đ) [V14] | $15 (Đ) [V13] | 0,5M trên tier F0 (Đ) [V12] | Có (Đ/S) [V14][V15] | Không lưu (real-time) (Đ) [V19] | (?) | Free account có VN, USD (Đ) [V20] |
| Azure Multilingual | 2 (Đ) | 29 (Đ) | $15 (S, cùng meter) | như trên | (?) | như trên | (?) | như trên |
| Azure Neural HD (DragonHD) | 4, trong đó 2 Preview (Đ) [V14] | 36 HD + 9 HD Flash + 10 HD Omni (Đ) [V14] | $22 (Đ) [V13] | (?) | DragonHD có, Omni không (Đ) [V16] | như trên | (?) | như trên |
| Amazon Polly Standard | 3 (Đ) [V22] | 7 (Đ) [V22] | $4 (Đ) [V21] | 5M, không ghi thời hạn (Đ) [V21] | Có (Đ) [V23] | Có thể dùng để cải thiện, có opt-out (Đ) [V26] | Được cache, replay, không tốn thêm (Đ) [V26] | (?) |
| Amazon Polly Neural | 4 (Đ) | 13 (Đ) | $16 (Đ) | 1M, 12 tháng đầu (Đ) | Có, đầy đủ (Đ) [V23] | như trên | như trên | (?) |
| Amazon Polly Generative | 2 (Amy, Brian) (Đ) | 9 (Đ) | $30 (Đ) | 100k, 12 tháng đầu (Đ) | Một phần (Đ) [V23] | như trên | như trên | (?) |
| OpenAI `tts-1` / `tts-1-hd` | không có giọng theo vùng (S) | 9 giọng chung (Đ) [V28] | $15 / $30 (Đ) [V27] | (?) | Không thấy (?) [V28] | Không train, 30 ngày abuse log (Đ) [V30] | Phải báo người dùng giọng là AI (Đ) [V28]; khách sở hữu output (T) [V33] | Có VN (Đ) [V32] |
| OpenAI `gpt-4o-mini-tts` | accent bằng prompt (Đ) [V28] | 13 giọng chung (Đ) [V28] | $0,60/1M text token + $12/1M audio token (Đ) [V27] | (?) | Không thấy (?) | như trên | như trên | như trên |
| ElevenLabs Flash/Turbo | (?) | (?) | $40 ($0,04/1K) (Đ) [V34] | 20k nhưng cấm thương mại (Đ) [V34][V36] | Chỉ `eleven_flash_v2` (Đ) [V38] | Mặc định dùng để cải thiện, có opt-out (Đ) [V35] | Trả phí: được dùng thương mại (Đ) [V36] | USD (Đ) [V41] |
| ElevenLabs v2/v3/v4 | (?) | (?) | $80 ($0,08/1K) (Đ) [V34] | 10k, cấm thương mại (Đ) | v2 Multilingual không; v4 IPA trong `/…/` (Đ) [V38] | như trên | như trên | như trên |
| Cloudflare Workers AI, Deepgram Aura-2-en | 2 (draco, pandora) (Đ) [V45] | 36 (Đ) [V45] | $30 (Đ) [V42] | 10.000 neurons/ngày ≈ 3.667 ký tự/ngày (S) [V42] | Không thấy (?) [V43] | Zero data retention: Yes (Đ) [V43] | Terms Deepgram, chưa đọc (?) | (?) |
| Cloudflare Aura-1 | (?) | (?) | $15 (Đ) [V42] | như trên | (?) | (?) | (?) | (?) |
| Cloudflare MeloTTS | không xác nhận (?) [V44] | không xác nhận (?) | $0,0002/phút audio (Đ) [V42] | như trên | (?) | (?) | (?) | (?) |

Ghi chú bảng:
- Google en-US còn 30 giọng "Premium" không tiền tố, cùng tên với Chirp 3 HD (Đ) [V2]; có thể là giọng của Gemini TTS (S).
- Polly en-US có 3 giọng trẻ em (Ivy, Justin, Kevin) (Đ) [V22].
- Azure "Neural" phoneme: footnote ^3^ của bảng giọng ghi "Phonemes, custom lexicon, and visemes aren't supported"; không giọng
  en-GB hay en-US nào mang ^3^ (Đ) [V14], nên giọng en-GB/en-US hỗ trợ phoneme (S).
- Azure en-GB HD: `Ada`, `Ollie` mang footnote 2,4 (multilingual, vùng GA của HD); `Ryan`, `Sonia` HD mang ^1^ (public preview) (Đ) [V14].

---

## §2 Theo từng nhà cung cấp

### 2.1 Google Cloud Text-to-Speech

- **Tier và giá** (Đ) [V1]: Standard $4/1M (free 4M), WaveNet $4/1M (free 4M, cùng SKU `9D01-5995-B545` với Standard), Neural2 $16
  (free 1M), Polyglot $16 (free 1M), Chirp 3 HD $30 (free 1M), Instant custom voice $60 (không free), Studio $160 (free 1M). Trang
  xếp WaveNet, Standard, Neural2, Studio, Polyglot vào "Legacy TTS models". Gemini TTS tính theo token, "25 tokens per second of
  audio"; Gemini 3.8 Flash TTS (Preview) $0,50/1M text + $9/1M audio token tới 31/12/2026, từ 01/01/2027 là $1 + $18; Gemini 2.5
  Flash TTS $0,50 + $10; Gemini 2.5 Pro TTS $1 + $20; không có free tier.
- **Đếm ký tự** (Đ) [V1]: tính cả dấu cách, xuống dòng và mọi thẻ SSML trừ `<mark>`.
- **Giọng** (Đ) [V2]: en-GB 63 giọng (Chirp 3 HD 30, Chirp HD 3, Neural2 7, News 7, Standard 7, Studio 2, WaveNet 7); en-US 99
  (Chirp 3 HD 30, Premium 30, Chirp HD 3, Neural2 9, News 3, Standard 10, Studio 2, WaveNet 10, Polyglot 1, Casual 1). Trang dài
  264 nghìn ký tự, công cụ chỉ đọc 100 nghìn đầu; en-GB và en-US nằm trong đoạn đó (S).
- **SSML/IPA** (Đ) [V3][V4][V5]: `<phoneme>` nhận `ipa` hoặc `x-sampa`, mỗi thẻ cho một từ; bảng âm vị riêng cho en-GB và en-US.
  Chirp 3 HD hỗ trợ `<phoneme>` khi gọi sync, "SSML tags are not currently supported for streaming requests", và có trường
  `custom_pronunciations` (IPA hoặc X-SAMPA). Docs SSML không nói loại giọng nào hỗ trợ `<phoneme>` (?). Gemini TTS: docs không
  nhắc SSML hay phoneme (?) [V6].
- **Định dạng** (Đ) [V8]: `MP3` (32 kbps), `OGG_OPUS`, `LINEAR16` (có header WAV), `PCM`, `MULAW`, `ALAW`, `M4A`.
- **Quota** (Đ) [V7]: 5.000 byte mỗi request; mặc định 1.000 request/phút/project; Chirp 3 200/phút; Studio 500; Neural2 1.000;
  gemini-2.5-flash-tts 150 QPM.
- **Dữ liệu** (Đ) [V9][V10]: "Google does not log any customer Cloud TTS text or audio data." Service Specific Terms §18: Google
  không dùng Customer Data để train model khi chưa được phép. Endpoint vùng của Gemini TTS: `global`, `us`, `eu`,
  `northamerica-northeast1`, không có Asia (Đ) [V6]. Endpoint vùng cho giọng không phải Gemini: chưa kiểm (?).
- **Terms về output** (Đ) [V10] (bản sửa 30/10/2026): §20 "Generated Output is Customer Data", Google không đòi quyền sở hữu; §17
  cấm dùng output để tạo model tương tự model của Google. Hạn chế cache chỉ thấy ở Grounding with Google Search và Google Maps,
  không thấy cho TTS (Đ). TTS có thuộc danh mục "Generative AI Services" hay không chưa kiểm ở `cloud.google.com/terms/services` (?).
- **Việt Nam** (Đ) [V11]: "Vietnam | VND | credit card".

### 2.2 Microsoft Azure AI Speech

- **Giá** (Đ) [V13]: Retail Prices API, vùng `southeastasia` và `eastus`: "S1 Neural Text To Speech Characters" $15/1M; "Neural HD
  Text to Speech Characters" $22/1M; "S1 Neural Long Audio Characters" $100/1M; commitment tier từ 80M ký tự/tháng ($960/tháng).
  Docs quota cũng ghi "unit price of $15 per million characters" (Đ) [V18]. Free F0: "0.5 million characters free per month" (Đ) [V12].
- **Đếm ký tự** (Đ) [V17]: mọi markup trong SSML trừ `<speak>` và `<voice>`; mỗi Unicode code point; vẫn tính tiền khi giọng không
  khớp ngôn ngữ và không ra audio.
- **Giọng** (Đ) [V14]: en-GB 14 neural (Sonia, Ryan, Libby, Abbi, Alfie, Bella, Elliot, Ethan, Hollie, Maisie (trẻ em), Noah, Oliver,
  Olivia, Thomas), 2 multilingual, 4 HD. en-US 31 neural, 29 multilingual, 36 HD, 9 HD Flash, 10 HD Omni. Multilingual voice có thể
  đặt accent `en-GB` bằng `<lang xml:lang>` (Đ, footnote ^2^).
- **SSML/IPA** (Đ) [V15][V16]: `alphabet` = `ipa`, `sapi`, `ups`, `x-sampa`; "If the specified string contains unrecognized phones,
  text to speech service will return http 400 error"; với IPA, muốn nhấn một âm tiết phải đánh dấu đủ mọi âm tiết. Custom lexicon
  (file PLS ≤ 100 KB, theo một locale). HD voices: DragonHD hỗ trợ `<phoneme>`; DragonHD Omni **không**; `<lexicon>` trên cả hai chỉ
  nhận alias.
- **Định dạng, latency** (Đ) [V16]: opus, mp3, pcm, truesilk; 8–48 kHz. Latency "Less than 300 ms" cho cả giọng HD và không HD.
- **Quota** (Đ) [V18]: F0 20 transaction/60 giây (không tăng được); S0 30 TPS mặc định, tăng được tới 1.000; tối đa 10 phút audio
  mỗi request.
- **Dữ liệu** (Đ) [V19]: "Microsoft doesn't retain or store the text that you provide with the real-time synthesis text to speech
  API" và không lưu audio của API real-time. Batch synthesis thì lưu trong Azure storage tới khi xóa. Có vùng `southeastasia` (Đ) [V13].
- **Terms về output:** không đọc được Microsoft Product Terms trong phiên này (?). Trang privacy nhắc có nơi luật bắt công bố việc
  dùng giọng tổng hợp (Đ) [V19].
- **Việt Nam** (Đ) [V20]: "Vietnam | United States – Dollar ($) USD" trong danh sách nước của Azure free account.

### 2.3 Amazon Polly

- **Giá** (Đ) [V21]: Standard $4/1M (free 5M/tháng, trang không ghi thời hạn); Neural $16 (free 1M/tháng, 12 tháng đầu); Long-Form
  $100 (free 500k, 12 tháng); Generative $30 (free 100k, 12 tháng).
- **Giọng** (Đ) [V22]: en-GB Amy, Emma, Brian, Arthur (Neural 4, Standard 3, Generative 2: Amy, Brian). en-US 17 giọng: Neural 13,
  Standard 7, Generative 9, Long-Form 4.
- **SSML/IPA** (Đ) [V23][V24]: `<phoneme>` "Full availability" trên Neural và Long-form, "Partial availability" trên Generative;
  Standard hỗ trợ mọi thẻ trừ newscaster. Lexicon tối đa 100/tài khoản, 40.000 ký tự mỗi lexicon, 5 lexicon mỗi request. "SSML tags
  are not counted as billed characters."
- **Định dạng** (Đ) [V25]: `mp3`, `ogg_opus` (48 kHz), `ogg_vorbis`, `pcm`, `mulaw`, `alaw`.
- **Quota** (Đ) [V24]: `SynthesizeSpeech` Standard 80 TPS, Neural 8 TPS (burst 10), Generative 8 TPS; 3.000 ký tự tính tiền (6.000
  tổng) mỗi request.
- **Lưu và phát lại** (Đ) [V26]: "You can cache and replay Amazon Polly's generated speech at no additional cost"; "your Polly output
  belongs to you".
- **Dữ liệu** (Đ) [V26]: "Amazon Polly may store and use text inputs processed by the service solely to provide and maintain the
  service"; "You may opt out of having your content used to improve and develop the quality of Amazon Polly" bằng AWS Organizations
  policy.
- **Việt Nam:** chưa kiểm (?). Phương thức thanh toán AWS phụ thuộc "seller of record" (T) [V46].

### 2.4 OpenAI TTS

- **Model và giá** (Đ) [V27][V31]: `tts-1` $15/1M ký tự; `tts-1-hd` $30/1M; `gpt-4o-mini-tts` $0,60/1M text token và $12/1M audio
  token. Trang giá không ghi chi phí mỗi phút (?).
- **Sắp bị gỡ** (Đ) [V29]: cả ba model "will be removed from the API on January 6, 2027"; thay bằng `gpt-realtime-2.1-mini` qua
  Realtime API, không dùng được ở `/v1/audio/speech` (Đ) [V28].
- **Giọng** (Đ) [V28]: 13 giọng chung (alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer, verse, marin, cedar); `tts-1`
  chỉ có 9. Accent chỉnh bằng prompt ở `gpt-4o-mini-tts`; không có giọng theo locale en-GB (S).
- **SSML/IPA:** docs không nhắc (?) [V28].
- **Định dạng, latency** (Đ) [V28]: MP3, Opus, AAC, FLAC, WAV, PCM; `tts-1` latency thấp hơn `tts-1-hd`; streaming chunked.
- **Quota** (Đ) [V31]: `gpt-4o-mini-tts` 2.000 RPM ở tier Build.
- **Dữ liệu** (Đ) [V30]: `/v1/audio/speech` không train, abuse monitoring 30 ngày, đủ điều kiện Zero Data Retention (cần duyệt);
  ở Asia (Nhật, Ấn, Singapore, Hàn) chỉ có lưu trữ theo vùng, không xử lý theo vùng.
- **Terms** (Đ) [V28]: phải báo rõ cho người dùng cuối rằng giọng là AI. Quyền sở hữu output: trang Services Agreement trả 403;
  đoạn trích tìm kiếm ghi "Customer ... owns all Output" (T) [V33].
- **Việt Nam** (Đ) [V32]: có trong danh sách quốc gia hỗ trợ.

### 2.5 ElevenLabs

- **Giá** (Đ) [V34]: $0,08/1K ký tự cho v4, v3, v2 Multilingual; $0,04/1K cho v4 Turbo, v3 Conversational, Flash/Turbo. Gói tháng:
  Starter $6 (75k / 150k ký tự), Creator $22 (275k / 550k), Pro $99 (1.238.000 / 2.475.000), Scale $299, Business $990. Trang ghi
  hàng Free là "Free / Pay as you go"; pay-as-you-go có dùng được mà không cần gói hay không thì chưa rõ (S).
- **Free plan** (Đ) [V36]: "The free plan does not include a commercial license and cannot be used for any commercial purpose";
  nội dung Free khi đăng phải có "elevenlabs.io" hoặc "11.ai" trong tiêu đề. Gói trả phí có commercial license (trừ Beta Services).
- **Model** (Đ) [V37]: `eleven_v4`, `eleven_v4_turbo` (~100 ms), `eleven_v3`, `eleven_multilingual_v2`, `eleven_flash_v2_5` (~100 ms),
  `eleven_flash_v2` (~135 ms). Concurrency theo gói: Free 2/4, Starter 3/6, Creator 5/10, Pro 10/20.
- **IPA** (Đ) [V38]: "Phoneme tags are only compatible with the `eleven_flash_v2` model"; Multilingual v2 không hỗ trợ; v4 hiểu IPA khi
  bọc trong `/…/`. Trang tự mâu thuẫn một chỗ ("v2 models" và "only eleven_flash_v2").
- **Giọng** (Đ) [V40]: "All our Default voices will expire on December 31, 2026"; Voice Library không dùng được qua API ở tier Free.
  Số giọng British: không thấy (?).
- **Định dạng** (Đ) [V39]: mp3 (22,05–44,1 kHz, 32–192 kbps), opus 48 kHz, pcm, wav, μ-law, a-law; mp3 192 kbps cần Creator trở lên.
- **Dữ liệu** (Đ) [V35][V39]: Terms §4(d) cấp license dùng Content "to improve the Services"; §4(i) opt-out trong menu "Data use";
  `enable_logging=false` (zero retention) "may only be used by enterprise customers". Data residency: chưa đọc (?).
- **Việt Nam** (Đ) [V41]: ngoài Ấn Độ, tính bằng USD. Danh sách quốc gia được mua: không thấy (?).

### 2.6 Cloudflare Workers AI (thêm vì learner web đã chạy trên Cloudflare Workers)

- **Model và giá** (Đ) [V42]: `@cf/deepgram/aura-2-en` $0,030/1K ký tự; `@cf/deepgram/aura-1` $0,015/1K; `@cf/myshell-ai/melotts`
  $0,0002/phút audio. Free 10.000 Neurons/ngày; vượt thì $0,011/1.000 Neurons trên gói Workers Paid. Aura-2-en = 2.727,27 Neurons/1K
  ký tự, nên free ≈ 3.667 ký tự/ngày nếu không dùng Workers AI cho việc khác (S).
- **Giọng Aura-2** (Đ) [V45]: 41 giọng tiếng Anh: 36 Mỹ, 2 Anh (`draco`, `pandora`), 2 Úc, 1 Philippines. Trang Cloudflare không
  ghi accent từng giọng (Đ) [V43].
- **SSML/IPA:** không nhắc ở trang Cloudflare hay trang model Deepgram đã đọc (?) [V43][V45].
- **Định dạng** (Đ) [V43]: linear16, flac, mulaw, alaw, mp3, opus, aac; container none, wav, ogg.
- **Dữ liệu** (Đ) [V43]: "Zero data retention: Yes", "Cloudflare-hosted"; Terms trỏ tới deepgram.com/terms (chưa đọc, ?).
- **MeloTTS** (Đ) [V44]: chỉ có tham số `lang` (mặc định `en`), output MP3; trang không xác nhận en-GB hay en-US (?).

---

## §3 Ước tính chi phí

**Khối lượng** (S, theo giả định của brief):

| Kịch bản | Cách tính | Ký tự |
|---|---|---|
| (a) Pre-generate từ | 7.800 × 2 accent × 8 | 124.800 |
| (b) (a) + câu ví dụ | 124.800 + 7.800 × 2 câu × 2 accent × 60 | 1.996.800 |
| (c) On-demand | 1.000 người × 20 lần × 40, một accent mỗi lần | 800.000/tháng (gấp đôi nếu sinh cả hai accent) |

Giả định thêm: (a) và (b) chạy trong một tháng, nên free tier của tháng đó trừ một lần; (c) tính riêng một tháng. Chưa cộng phần
ký tự của thẻ `<phoneme>` (xem cuối mục).

| Nhà cung cấp, tier | (a) list | (a) sau free | (b) list | (b) sau free | (c)/tháng list | (c) sau free |
|---|---|---|---|---|---|---|
| Google Standard / WaveNet ($4) | $0,50 | $0 | $7,99 | $0 | $3,20 | $0 |
| Google Neural2 ($16) | $2,00 | $0 | $31,95 | $15,95 | $12,80 | $0 |
| Google Chirp 3 HD ($30) | $3,74 | $0 | $59,90 | $29,90 | $24,00 | $0 |
| Google Gemini 2.5 Flash TTS (S) | ≈ $4 | không free | ≈ $35 | không free | ≈ $13,5 | không free |
| Google Gemini 3.8 Flash TTS từ 2027 (S) | ≈ $7 | không free | ≈ $63 | không free | ≈ $24 | không free |
| Azure Neural ($15) | $1,87 | $0 trên F0 | $29,95 | (S) xem ghi chú | $12,00 | $12,00 trên S0 |
| Azure Neural HD ($22) | $2,75 | (?) | $43,93 | (?) | $17,60 | (?) |
| Polly Standard ($4) | $0,50 | $0 | $7,99 | $0 | $3,20 | $0 |
| Polly Neural ($16) | $2,00 | $0 | $31,95 | $15,95 (năm đầu) | $12,80 | $0 năm đầu, $12,80 sau đó |
| Polly Generative ($30) | $3,74 | $0,74 | $59,90 | $56,90 | $24,00 | $21,00 năm đầu |
| OpenAI `tts-1` ($15) | $1,87 | (?) | $29,95 | (?) | $12,00 | (?) |
| OpenAI `tts-1-hd` ($30) | $3,74 | (?) | $59,90 | (?) | $24,00 | (?) |
| OpenAI `gpt-4o-mini-tts` | không ước được (?) | | | | | |
| ElevenLabs Flash ($40) | $4,99 (hoặc Starter $6) | Free cấm thương mại | $79,87 (hoặc Pro $99 một tháng) | như trên | $32,00 | như trên |
| ElevenLabs v2/v3/v4 ($80) | $9,98 (hoặc Creator $22) | như trên | $159,74 | như trên | $64,00 | như trên |
| Cloudflare Aura-2-en ($30) | $3,74 | ≈ $0 nếu chia ra ~34 ngày (S) | $59,90 | ≈ $56 (S) | $24,00 | ≈ $20,7 (S) |
| Cloudflare Aura-1 ($15) | $1,87 | (S) | $29,95 | (S) | $12,00 | (S) |

Ghi chú tính toán:
- **Gemini TTS** (S): giả định một từ ≈ 1 giây audio (25 audio token), một câu 60 ký tự ≈ 4 giây (100 token), một lookup 40 ký tự
  ≈ 2,7 giây (~67 token), theo tỷ lệ "25 tokens per second of audio" [V1]. Phần text token không đáng kể. Sai số giả định độ dài
  audio kéo theo sai số cùng tỷ lệ.
- **Azure F0** (S): F0 có 0,5M ký tự/tháng và 20 request/60 giây [V12][V18]. (a) cần 15.600 request ≈ 13 giờ trên F0. (b) có
  46.800 request và 2M ký tự, tức phải chia ra ~4 tháng và ~39 giờ chạy trên F0, hoặc trả $29,95 trên S0. F0 không đủ cho (c).
- **Polly Neural năm đầu**: free 1M/tháng chỉ áp dụng 12 tháng đầu [V21].
- **ElevenLabs**: giá theo ký tự là mức pay-as-you-go trên trang [V34]; có trả được kiểu này ngoài gói tháng hay không chưa rõ (S).
- **Cloudflare free** (S): 10.000 Neurons/ngày dùng chung cho mọi model Workers AI của tài khoản.
- **Chi phí lưu và phát file** (R2, băng thông) không tính ở đây (?).
- **Khi bọc IPA**: một từ trong `<phoneme alphabet="ipa" ph="liːd">lead</phoneme>` tốn ~50 ký tự ở Azure, ~65 ký tự ở Google (thêm
  `<speak>`), 8 ký tự ở Polly (S) [V1][V17][V24]. Nếu bọc mọi từ, (a) lên ~0,8–1,0M ký tự: Google Chirp 3 HD ≈ $31 list (gần như
  nằm trong 1M free), Azure Neural ≈ $12. Nếu chỉ bọc các từ có cách đọc mơ hồ, phần tăng thêm nhỏ hơn nhiều (S).

---

## §4 IPA và từ đồng hình khác âm (`lead`, `record`)

- **Google** (Đ) [V3][V4][V5]: mỗi `<phoneme>` cho một từ; IPA phải ở dạng phonemic "broad"; mỗi âm tiết đúng một nguyên âm. Bộ âm
  vị en-US có ɚ, oʊ; en-GB có ɒ, ɜː, əʊ, eə, iə, ʊə. Chirp 3 HD có thêm `custom_pronunciations`.
- **Azure** (Đ) [V15]: âm vị lạ thì trả 400, nên sai IPA lộ ra ngay thay vì đọc sai im lặng (S). Lexicon chỉ nhận dạng Unicode
  "decomposed" (Đ).
- **Polly** (Đ) [V23]: `<phoneme>` đầy đủ trên Neural; Generative chỉ một phần. Polly cũng có thẻ `<w>` chọn cách đọc theo từ loại
  (Đ) [V23], hữu ích cho cặp noun/verb như `record` (S).
- **ElevenLabs** (Đ) [V38]: tài liệu khuyên dùng CMU Arpabet thay vì IPA cho v2, vì kết quả ổn định hơn.
- **OpenAI, Gemini TTS, Aura**: không có cơ chế IPA trong tài liệu đã đọc (?).
- **Chung** (S): IPA của dự án (Cambridge-style, ví dụ US dùng ɝ) có thể chứa ký hiệu không có trong bộ âm vị của nhà cung cấp; cần
  một bước ánh xạ và một bộ kiểm tra từng âm vị trước khi gửi. Chưa ai đo nhà cung cấp nào đọc IPA của dự án đúng hơn.

---

## §5 Lưu file, phát lại, ghi công

| Nhà cung cấp | Được lưu và phát lại vô thời hạn? | Ghi công |
|---|---|---|
| Google | Không thấy điều khoản cấm; output là Customer Data (với Generative AI Services) (Đ) [V10] → (S) được | Không thấy (?) |
| Azure | (?) chưa đọc Product Terms | (?); có nơi luật bắt công bố giọng tổng hợp (Đ) [V19] |
| Polly | Có, "cache and replay ... at no additional cost" (Đ) [V26] | Không thấy (?) |
| OpenAI | Khách sở hữu output (T) [V33] | Phải báo người dùng giọng là AI (Đ) [V28] |
| ElevenLabs | Gói trả phí: dùng thương mại, giữ quyền với Output (Đ) [V35][V36] | Free: "elevenlabs.io" hoặc "11.ai" trong tiêu đề, và cấm thương mại (Đ) [V36] |
| Cloudflare/Deepgram | (?) chưa đọc deepgram.com/terms | (?) |

---

## §6 Dữ liệu khi gửi câu của người học

Câu người học tự lưu có thể chứa dữ liệu cá nhân. Điểm khác nhau chính:

| Nhà cung cấp | Giữ text? | Dùng để train/cải thiện? | Vùng xử lý |
|---|---|---|---|
| Google | Không log (Đ) [V9] | Không, trừ khi khách cho phép (Đ) [V10] | Gemini TTS: global/us/eu/northamerica, không Asia (Đ) [V6]; giọng khác (?) |
| Azure (real-time) | Không lưu text và audio (Đ) [V19] | (?) với giọng prebuilt; trang chỉ nói rõ cho custom voice | Có `southeastasia` (Đ) [V13] |
| Polly | "may store and use ... to provide and maintain" (Đ) [V26] | Có thể, trừ khi opt-out bằng AWS Organizations policy (Đ) [V26] | (?) |
| OpenAI | 30 ngày abuse monitoring; ZDR nếu được duyệt (Đ) [V30] | Không (Đ) [V30] | Asia: chỉ lưu trữ theo vùng, không xử lý theo vùng (Đ) [V30] |
| ElevenLabs | Mặc định có history; zero retention chỉ enterprise (Đ) [V39] | Có, trừ khi opt-out (Đ) [V35] | (?) |
| Cloudflare Aura | "Zero data retention: Yes" (Đ) [V43] | (?) | (?) |

(S) Gửi câu của người học sang dịch vụ ở nước ngoài là một lần chuyển dữ liệu ra nước ngoài; cần đối chiếu với văn bản pháp lý và
chính sách bảo mật hiện có của dự án. Phần này nằm ngoài phạm vi báo cáo.

---

## §7 Trade-off chính (không xếp hạng)

- **Nhiều giọng en-GB để chọn** ↔ **đơn giản**: Google và Azure có nhiều giọng en-GB nhất; Polly có 4; Aura-2 có 2; OpenAI không có
  giọng theo vùng.
- **Kiểm soát cách đọc bằng IPA** ↔ **giọng "tự nhiên" kiểu LLM**: các dòng mới (Gemini TTS, DragonHD Omni, OpenAI, ElevenLabs
  v3/v4) bỏ hoặc hạn chế `<phoneme>`; các dòng neural cũ hơn (Google Neural2/WaveNet, Azure Neural, Polly Neural) hỗ trợ đầy đủ.
- **Free tier lớn và bền** ↔ **chất lượng cao nhất**: Google Standard/WaveNet (4M) và Polly Standard (5M) gần như phủ cả ba kịch
  bản miễn phí nhưng là dòng "legacy"/standard; tier HD có free nhỏ hoặc không có.
- **Ít nhà cung cấp mới** ↔ **dùng đồ sẵn có**: Cloudflare Workers AI chạy trên nền tảng web đã dùng, nhưng chỉ 2 giọng en-GB và
  không thấy IPA. OpenAI đã có trong dự án (gateway `ai`) nhưng ba model TTS bị gỡ ngày 06/01/2027.
- **Dữ liệu người học** ↔ **giá**: Azure real-time và Google không lưu text; Polly và ElevenLabs mặc định có thể dùng nội dung để
  cải thiện dịch vụ cho tới khi opt-out.
- **Pre-generate** làm cho latency, rate limit và giá on-demand ít quan trọng với catalog; chúng chỉ còn quan trọng cho (c).

---

## §8 Chưa kiểm được

- Chất lượng nghe thực tế, độ tự nhiên khi đọc **một từ đứng riêng** (khác với đọc câu), và độ chính xác khi nhận IPA của dự án: cần
  nghe mẫu thật, không làm được khi không gọi API.
- Latency đo được của Google, Polly, Cloudflare (chỉ có con số công bố của Azure < 300 ms và ElevenLabs Flash ~100 ms).
- Điều khoản output của Azure (Microsoft Product Terms) và của Deepgram (deepgram.com/terms); văn bản đầy đủ Services Agreement của
  OpenAI (403, chỉ có đoạn trích).
- TTS của Google có thuộc "Generative AI Services" theo `cloud.google.com/terms/services` hay không.
- OpenAI có free tier cho TTS không; cách quy đổi audio token của `gpt-4o-mini-tts` ra giây.
- ElevenLabs: số giọng British dùng được qua API, data residency, pay-as-you-go có dùng được ngoài gói tháng không.
- Cloudflare: accent và IPA của Aura-1 và MeloTTS; có cần gói Workers Paid cho phần vượt free không; điều khoản cho khách Việt Nam.
- AWS: seller of record và phương thức thanh toán cho tài khoản Việt Nam.
- Thẻ debit Việt Nam có dùng được cho Google Cloud không (trang chỉ ghi credit card).
- Endpoint vùng (Asia) cho giọng Google không phải Gemini; vùng xử lý của Polly.
- Free tier của Azure Neural HD.

---

## §9 Nguồn (đọc 06/11/2026)

- [V1] Google Cloud TTS pricing — https://cloud.google.com/text-to-speech/pricing (HTML tải bằng `curl`, `?hl=en`)
- [V2] Google voices list — https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types
- [V3] Google SSML — https://docs.cloud.google.com/text-to-speech/docs/ssml
- [V4] Google phonemes — https://docs.cloud.google.com/text-to-speech/docs/phonemes
- [V5] Google Chirp 3 HD — https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd
- [V6] Google Gemini TTS — https://docs.cloud.google.com/text-to-speech/docs/gemini-tts
- [V7] Google TTS quotas — https://docs.cloud.google.com/text-to-speech/quotas
- [V8] Google AudioEncoding — https://docs.cloud.google.com/text-to-speech/docs/reference/rest/Shared.Types/AudioEncoding
- [V9] Google TTS data logging — https://docs.cloud.google.com/text-to-speech/docs/data-logging
- [V10] Google Cloud Service Specific Terms (last modified 30/10/2026) — https://cloud.google.com/terms/service-terms
- [V11] Google Cloud Billing currency and payment methods — https://docs.cloud.google.com/billing/docs/resources/currency
- [V12] Azure Speech pricing page — https://azure.microsoft.com/en-us/pricing/details/speech/ (chỉ đọc được free tier; giá hiện "$-")
- [V13] Azure Retail Prices API — https://prices.azure.com/api/retail/prices (meter "S1 Neural Text To Speech Characters", "Neural HD Text to Speech Characters", vùng southeastasia, eastus)
- [V14] Azure language and voice support (TTS) — https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts
- [V15] Azure SSML pronunciation — https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-pronunciation
- [V16] Azure HD voices — https://learn.microsoft.com/en-us/azure/ai-services/speech-service/high-definition-voices
- [V17] Azure TTS overview (billable characters) — https://learn.microsoft.com/en-us/azure/ai-services/speech-service/text-to-speech
- [V18] Azure Speech quotas and limits — https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-services-quotas-and-limits
- [V19] Azure TTS data, privacy, security — https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/speech-service/text-to-speech/data-privacy-security
- [V20] Azure free account terms — https://azure.microsoft.com/en-us/pricing/offers/ms-azr-0044p/
- [V21] Amazon Polly pricing — https://aws.amazon.com/polly/pricing/
- [V22] Polly available voices — https://docs.aws.amazon.com/polly/latest/dg/available-voices.html
- [V23] Polly supported SSML tags — https://docs.aws.amazon.com/polly/latest/dg/supportedtags.html
- [V24] Polly quotas — https://docs.aws.amazon.com/polly/latest/dg/limits.html
- [V25] Polly SynthesizeSpeech API — https://docs.aws.amazon.com/polly/latest/APIReference/API_SynthesizeSpeech.html
- [V26] Polly FAQ — https://aws.amazon.com/polly/faqs/
- [V27] OpenAI API pricing — https://developers.openai.com/api/docs/pricing
- [V28] OpenAI text-to-speech guide — https://developers.openai.com/api/docs/guides/text-to-speech
- [V29] OpenAI deprecations — https://developers.openai.com/api/docs/deprecations
- [V30] OpenAI "Your data" — https://developers.openai.com/api/docs/guides/your-data
- [V31] OpenAI `gpt-4o-mini-tts` model page — https://developers.openai.com/api/docs/models/gpt-4o-mini-tts
- [V32] OpenAI supported countries — https://developers.openai.com/api/docs/supported-countries
- [V33] OpenAI Services Agreement — https://openai.com/policies/services-agreement/ (403; chỉ có đoạn trích tìm kiếm → T)
- [V34] ElevenLabs API pricing — https://elevenlabs.io/pricing/api
- [V35] ElevenLabs Terms of Use — https://elevenlabs.io/terms-of-use
- [V36] ElevenLabs help: publishing generated content — https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform.md
- [V37] ElevenLabs models — https://elevenlabs.io/docs/overview/models
- [V38] ElevenLabs TTS best practices — https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices
- [V39] ElevenLabs TTS API (convert) — https://elevenlabs.io/docs/api-reference/text-to-speech/convert
- [V40] ElevenLabs voices — https://elevenlabs.io/docs/overview/capabilities/voices
- [V41] ElevenLabs help: paying in INR — https://elevenlabs.io/docs/help-center/account/payment-billing/can-i-pay-for-my-eleven-labs-subscription-in-inr.md
- [V42] Cloudflare Workers AI pricing — https://developers.cloudflare.com/workers-ai/platform/pricing/
- [V43] Cloudflare `aura-2-en` model — https://developers.cloudflare.com/workers-ai/models/aura-2-en/
- [V44] Cloudflare `melotts` model — https://developers.cloudflare.com/workers-ai/models/melotts/
- [V45] Deepgram TTS models (Aura-2 voices) — https://developers.deepgram.com/docs/tts-models
- [V46] AWS accepted payment methods (đoạn trích tìm kiếm, T) — https://repost.aws/knowledge-center/accepted-payment-methods
