# Nghiên cứu model text-to-speech (TTS) mã nguồn mở tự host cho giọng en-GB và en-US — 06/11/2026

Desk research. Chỉ đọc model card trên Hugging Face, README và LICENSE trên GitHub, trang PyPI; **không cài, không chạy model nào**.
Đi kèm báo cáo nhà cung cấp cloud: `docs/preparation/TTS_PROVIDERS_RESEARCH_2026-11-06.md`.

**Nhãn:** (Đ) đọc nguồn chính thức trong phiên này · (T) bên thứ ba (blog, benchmark cộng đồng) · (S) suy luận / tự tính ·
**ASSUMPTION** chưa kiểm được. Nguồn đánh số [L1]… ở §8, tất cả đọc ngày 06/11/2026.

**Cách đọc:** mọi trang được đọc qua WebFetch (một model nhỏ tóm tắt trang). Con số quyết định (license, số giọng, cú pháp
phoneme) đều lấy từ model card, README hoặc LICENSE của chính dự án. Không có con số tốc độ CPU nào do dự án tự đo trên máy này.

---

## §0 Tóm tắt (10 điểm)

1. **Chỉ Kokoro-82M đáp ứng cùng lúc cả bốn yêu cầu:** weights Apache-2.0 (Đ) [L1], có giọng en-GB (8) và en-US (20) (Đ) [L2],
   nhận phoneme do mình đưa vào bằng cú pháp `[word](/phonemes/)` (Đ) [L3][L4], chạy được trên CPU (T) [L30].
2. **Điểm yếu của Kokoro đúng chỗ app cần:** VOICES.md ghi câu ngắn (dưới ~10–20 token) là điểm yếu (Đ) [L2]; một từ đơn là câu
   rất ngắn. Phải nghe thử trước khi quyết. Giọng en-GB cũng yếu hơn: chỉ `bf_emma` đạt B-, 7 giọng còn lại C tới D (Đ) [L2].
3. **Kokoro không còn release mới từ 05/04/2025** (`kokoro` 0.9.4, `misaki` 0.9.4) (Đ) [L5][L6]. Dùng được, nhưng không có ai sửa lỗi.
4. **Phoneme của Kokoro không phải IPA chuẩn.** Bộ âm vị misaki viết nguyên âm đôi bằng chữ hoa (`eɪ`→`A`, `oʊ`→`O`, `əʊ`→`Q`…)
   và dùng `ɹ` thay `r` (Đ) [L7]. IPA của dự án phải qua một bước đổi ký hiệu trước khi đưa vào (S).
5. **Piper có phoneme input tốt nhất** (`[[ … ]]` theo IPA của espeak-ng) (Đ) [L10] và còn được bảo trì (`piper-tts` 1.8.0, 04/09/2026)
   (Đ) [L11], nhưng code là GPL-3.0 (Đ) [L9] và **license giọng rất lộn xộn**: nhiều giọng fine-tune từ giọng `lessac`, mà dữ liệu
   `lessac` cấm dùng thương mại (Đ) [L14][L15]. Giọng en-GB `cori` (LibriVox, public domain, train từ đầu) là giọng sạch duy nhất
   đã kiểm (Đ) [L16]; chưa tìm được giọng en-US sạch tương đương.
6. **Loại vì license không cho thương mại:** Coqui XTTS-v2 (CPML: chỉ non-commercial, kể cả audio sinh ra) (Đ) [L21]; F5-TTS
   (weights CC-BY-NC) (Đ) [L23][L24]. Kitten TTS 2 cho thương mại tới khi doanh thu hoặc vốn vượt 1 triệu USD (Đ) [L19].
7. **Loại vì không hợp bài toán:** Orpheus (3B, chạy bằng vLLM) (Đ) [L27], Dia (1,6B, chưa chạy được trên CPU, giọng ngẫu nhiên)
   (Đ) [L29], Chatterbox (cần clip giọng mẫu, gắn watermark, ngừng bảo trì từ 08/2026) (Đ) [L26], Supertonic (archive 09/09/2026,
   giọng preset dùng thương mại chỉ có qua API trả phí) (Đ) [L36].
8. **Ứng viên phụ:** MeloTTS (MIT, có EN-US và EN-BR, tự nhận real-time trên CPU) (Đ) [L22] nhưng không có tài liệu phoneme input;
   Pocket TTS của Kyutai (weights CC-BY-4.0, ~6x real-time trên CPU M4) (Đ) [L32][L33] nhưng giọng không ghi accent và không có
   phoneme input.
9. **Cách A (sinh sẵn trên máy dev, upload R2) khả thi về khối lượng:** khoảng 22 giờ audio cho 7.800 từ × 2 accent × (từ + 1 câu),
   tức vài tới hơn chục giờ CPU (S, §5). Server không chạy model.
10. **Cách B (chạy model trên API host) tốn RAM và CPU của container chung với NestJS** (ASSUMPTION ~0,5–1,5 GB RAM thêm, §6).
    Nên chạy qua worker BullMQ đã có rồi cache file vào R2, không chạy trong request (S).

---

## §1 Yêu cầu đem ra so

| Mã | Yêu cầu | Vì sao |
|---|---|---|
| Y1 | License code **và** weights/giọng cho dùng thương mại | App bán gói Pro |
| Y2 | Có giọng en-GB và en-US | Hai accent cho mỗi từ |
| Y3 | Nhận phoneme/IPA do mình đưa vào | Từ đồng tự khác nghĩa khác âm: `lead` /liːd/ và /led/, `record` danh từ và động từ |
| Y4 | Chạy trên CPU, không GPU | Máy dev Windows không rõ GPU; API host chỉ có CPU |
| Y5 | Đọc tốt một từ đơn | Phần lớn audio là một từ |
| Y6 | Còn được bảo trì | Lỗi không có ai sửa thì tự gánh |

---

## §2 Bảng so sánh

| Model | License code | License weights / giọng | en-GB | en-US | Phoneme input | Kích thước | CPU | Release gần nhất |
|---|---|---|---|---|---|---|---|---|
| **Kokoro-82M** | Apache-2.0 (Đ) [L3] | Apache-2.0 (Đ) [L1] | 8 (4 F, 4 M) (Đ) [L2] | 20 (11 F, 9 M) (Đ) [L2] | Có: `[word](/phonemes/)`, bộ âm vị misaki (Đ) [L3][L4][L7] | 82M params (Đ) [L1]; ONNX 92–326 MB (Đ) [L8] | ~2x real-time trên 4 vCPU EPYC (T) [L30] | `kokoro` 0.9.4, 05/04/2025 (Đ) [L5] |
| **Piper** (piper1-gpl) | GPL-3.0 (Đ) [L9]; repo cũ `rhasspy/piper` MIT, archive 06/10/2025 (Đ) [L12] | Từng giọng một, xem §3.2 (Đ) [L13] | 9 thư mục giọng (Đ) [L17] | 21 thư mục giọng (Đ) [L18] | Có: `[[ … ]]` theo IPA của espeak-ng (Đ) [L10] | `en_GB-cori-high.onnx` 114 MB (Đ) [L37] | README chỉ ghi "fast", không có số (Đ) [L9] | `piper-tts` 1.8.0, 04/09/2026 (Đ) [L11] |
| **Kitten TTS 0.8** (nano/micro/mini) | Apache-2.0 (Đ) [L19] | mini 0.8: Apache-2.0 (Đ) [L20] | Không ghi accent (Đ) [L19][L20] | Không ghi accent | Không có tài liệu (Đ) [L19] | 15M / 40M / 80M params; 25–80 MB (Đ) [L19] | "run on CPU, no GPU required", không có số (Đ) [L19] | Không ghi ngày (Đ) [L19] |
| **Kitten TTS 2** | Apache-2.0 (gói `kittenml`) (Đ) [L38] | Stellon Labs Community License: thương mại tới 1 triệu USD doanh thu hoặc vốn (Đ) [L38] | Không ghi accent; 115 giọng (Đ) [L38] | Không ghi accent | Không có tài liệu (Đ) [L38] | 1,7B params; 492–954 MB (Đ) [L19] | CPU cần ~6 GB RAM (Đ) [L19] | Không ghi ngày |
| **Coqui XTTS-v2** | (không cần xét) | CPML: chỉ non-commercial, áp cả cho output (Đ) [L21] | Clone từ clip 6 giây (Đ) [L39] | Clone | Không có tài liệu | — | — | Không ghi ngày (Đ) [L39] |
| **MeloTTS** | MIT (Đ) [L22] | Model card ghi MIT (Đ) [L40] | EN-BR (Đ) [L22] | EN-US (Đ) [L22] | Không có tài liệu (Đ) [L22] | Không ghi | "Fast enough for CPU real-time inference", không có số (Đ) [L40] | Không ghi; citation năm 2023 (Đ) [L40] |
| **StyleTTS2** | MIT (Đ) [L25] | Model pretrained: phải báo người nghe là giọng tổng hợp nếu không có quyền dùng giọng người nói (Đ) [L25] | Không có giọng GB sẵn (pretrained trên LJSpeech, LibriTTS) (Đ) [L25] | LJSpeech, LibriTTS (Đ) [L25] | Qua phonemizer + espeak-ng (GPL) (Đ) [L25] | Không ghi | Không ghi | Không ghi ngày (Đ) [L25] |
| **F5-TTS** | MIT (Đ) [L23] | CC-BY-NC (dữ liệu Emilia) (Đ) [L23][L24] | Clone từ audio mẫu (Đ) [L23] | Clone | Không có tài liệu | Không ghi | Benchmark chỉ trên GPU L20 (Đ) [L23] | v1 base, 12/03/2025 (Đ) [L23] |
| **Chatterbox** | MIT (Đ) [L26] | MIT (Đ) [L26] | Không có điều khiển accent; dựa vào clip mẫu (Đ) [L26] | Như trên | Không có tài liệu (Đ) [L26] | Nano 110M, Turbo 350M, gốc 500M (Đ) [L26] | Nano 3x real-time trên 8 core CPU (Đ) [L26] | "retired research", ngừng bảo trì từ 08/2026 (Đ) [L26] |
| **Orpheus** | Apache-2.0 (Đ) [L27] | Card ghi apache-2.0, nhưng là fine-tune của Llama-3.2-3B-Instruct (Đ) [L28] | Không ghi accent (Đ) [L27] | 8 giọng tiếng Anh (tara, leah…) (Đ) [L27] | Không có tài liệu (Đ) [L27] | 3B (Đ) [L27] | Chạy bằng vLLM; có đường llama.cpp riêng (Đ) [L27] | Mục mới nhất 5/2025 (Đ) [L27] |
| **Dia** | Apache-2.0 (Đ) [L29] | Apache-2.0 (Đ) [L29] | Không có giọng cố định; giọng đổi mỗi lần chạy (Đ) [L29] | Như trên | Không có tài liệu (Đ) [L29] | 1,6B (Đ) [L29] | Chưa hỗ trợ CPU (Đ) [L29] | Có Dia2 (Đ) [L29] |
| **Pocket TTS** (Kyutai) | MIT (Đ) [L33] | CC-BY-4.0 (Đ) [L32] | Không ghi accent; 21 giọng tag English (Đ) [L33] | Như trên | Không có tài liệu (Đ) [L33] | ~100M; bản English nhỏ 1,9M–18,2M (10/2026) (Đ) [L32][L33] | ~6x real-time trên CPU MacBook Air M4 (2 core); 2,3–2,5x trên VM 4 vCPU (Đ) [L32] | Bản English nhỏ 10/2026 (Đ) [L33] |
| **NeuTTS Air** (Neuphonic) | Không đọc được LICENSE (?) [L34] | Air: Apache-2.0; Nano, 2E: NeuTTS Open License 1.0 (Đ) [L34] | Không ghi accent; Air/Nano phải clone từ audio mẫu 3–15 s (Đ) [L34] | 2E có 4 giọng tiếng Anh cố định (Đ) [L34] | Air và Nano nhận phoneme làm input; không nói tạo phoneme thế nào (Đ) [L34] | Air ~552M, Nano ~229M (Đ) [L34] | Chỉ đo token/s của LM, không đo end-to-end (Đ) [L34] | Không ghi ngày (Đ) [L34] |
| **Supertonic 3** | MIT (code mẫu) (Đ) [L36] | OpenRAIL-M; giọng preset dùng thương mại chỉ qua Supertone Play/API (Đ) [L36] | Không ghi giọng British (Đ) [L36] | Có giọng preset M3–M5, F3–F5 (Đ) [L36] | Không có tài liệu (Đ) [L36] | ~99M (Đ) [L36] | RTF 0,3 trên e-reader Onyx Boox Go 6 (Đ) [L36] | Repo archive 09/09/2026 (Đ) [L36] |

---

## §3 Chi tiết hai ứng viên chính

### §3.1 Kokoro-82M (hexgrad)

**License.** Weights Apache-2.0 (Đ) [L1]; code `kokoro` Apache-2.0 (Đ) [L3]; G2P `misaki` Apache-2.0 (Đ) [L6]. Dữ liệu train gồm
audio public domain, audio license Apache/MIT, hai bộ CC BY (Koniwa, SIWIS) và "synthetic audio from closed TTS providers" (Đ) [L1].
espeak-ng chỉ dùng làm fallback cho từ ngoài từ điển (Đ) [L3][L4]; espeak-ng là GPL-3.0-or-later (Đ) [L31].

**Giọng.** en-US `lang_code='a'`, en-GB `lang_code='b'` (Đ) [L3]. Bảng chấm điểm của tác giả [L2]:

| Accent | Giọng điểm cao nhất | Còn lại |
|---|---|---|
| en-US | `af_heart` (target A), `af_bella` A-, `af_nicole` B- | 4 giọng C+ nữ, 4 giọng C+ nam (`am_fenrir`, `am_michael`, `am_puck`), còn lại C- tới F+ |
| en-GB | `bf_emma` B- (nữ) | `bf_isabella`, `bm_fable`, `bm_george` C; `bm_lewis` D+; `bf_alice`, `bf_lily`, `bm_daniel` D |

Tức là en-GB chỉ có một giọng nữ khá; **giọng nam en-GB tốt nhất chỉ đạt C** (Đ) [L2].

**Phoneme input.** Cú pháp `[Kokoro](/kˈOkəɹO/)` viết ngay trong text (Đ) [L3][L4]. Mã nguồn misaki parse bằng
`LINK_REGEX = \[([^\]]+)\]\(([^)]*)\)` và coi dạng `/…/` là phoneme ghi đè (Đ) [L41]. Kokoro-FastAPI (dự án cộng đồng) còn có
endpoint `POST /dev/generate_from_phonemes` nhận thẳng chuỗi phoneme (T) [L42]. Ví dụ ONNX trên Hugging Face cũng tự đổi phoneme
sang token ID rồi đưa thẳng vào model, không qua G2P (Đ) [L8].

**Bộ âm vị misaki (khác IPA chuẩn)** [L7]:

| IPA dự án | misaki | Ghi chú |
|---|---|---|
| eɪ, aɪ, aʊ, ɔɪ | `A`, `I`, `W`, `Y` | Một token cho mỗi nguyên âm đôi |
| oʊ (en-US) | `O` | Chỉ US |
| əʊ (en-GB) | `Q` | Chỉ GB |
| r | `ɹ` | |
| tʃ, dʒ | `ʧ`, `ʤ` | |
| æ, ɾ, ᵻ | giữ nguyên | Chỉ US |
| ɒ, a, ː | giữ nguyên | Chỉ GB; tác giả dùng `ː` theo cách riêng |

Tác giả tự nói "not a linguist" và có thể đã dùng sai nghĩa một số ký hiệu (Đ) [L7]. Bước đổi IPA → misaki là việc dự án phải viết
và kiểm (S).

**Từ đồng tự khác âm (heteronym).** misaki tra từ điển theo POS tag của spaCy và có luật riêng cho vài từ như `used` (Đ) [L41];
mục TODO vẫn ghi `lead`, `bass`, `bow`, `tear`, `wind` chưa phân biệt được theo ngữ cảnh (Đ) [L4]. Với catalog đã có IPA theo nghĩa,
ghi đè bằng `[word](/…/)` tránh được chuyện này (S).

**Một từ đơn.** VOICES.md: phần lớn giọng tốt nhất ở 100–200 token; câu ngắn dưới khoảng 10–20 token là điểm yếu (Đ) [L2].
Chưa có nguồn nào đo riêng chất lượng một từ (?). Cách vá thường gặp là đọc từ trong một câu đệm rồi cắt riêng đoạn từ: **ASSUMPTION**,
chưa kiểm.

**Kích thước và tốc độ.** File ONNX: fp32 326 MB, fp16 163 MB, q8 92,4 MB (Đ) [L8]. kokoro-onnx tự nhận "near real-time on macOS M1",
gói ~300 MB, bản quantized ~80 MB (Đ) [L43]. Benchmark cộng đồng trên AMD EPYC 7763, 4 vCPU, 16 GB RAM, không GPU: RTF trung bình
0,469 (PyTorch) và 0,509 (ONNX), tức ~2x real-time; ONNX thua PyTorch ở câu rất ngắn vì overhead cố định (T) [L30]. RAM lúc chạy:
không nguồn nào ghi (?).

**Node.js.** Có `kokoro-js` chạy qua Transformers.js với `dtype` fp32/fp16/q8/q4/q4f16 (Đ) [L8]. Trang npm trả 403, nên chưa kiểm được
nó có giọng en-GB không, dùng phonemizer nào và license phonemizer đó ra sao (?).

**Bảo trì.** `kokoro` 0.9.4 và `misaki` 0.9.4 cùng ngày 05/04/2025; repo không có mục Releases (Đ) [L3][L5][L6]. Cách hôm nay hơn 19 tháng (S).

### §3.2 Piper (OHF-Voice/piper1-gpl)

**License code.** `piper1-gpl` là GPL-3.0; nó nhúng espeak-ng để phonemize (Đ) [L9]. Repo cũ `rhasspy/piper` (MIT) đã archive ngày
06/10/2025 và chuyển sang `piper1-gpl` (Đ) [L12]. GPL-3 ràng buộc khi **phân phối** phần mềm; chạy trên máy mình hoặc server để sinh
file không phải phân phối (S, không phải tư vấn pháp lý; nói một lần).

**License giọng.** Tài liệu Piper: mỗi giọng có `MODEL_CARD` chứa license, "Some voices may have restrictive licenses" (Đ) [L13].
Các giọng đã đọc:

| Giọng | Dữ liệu và license | Train | Dùng thương mại? |
|---|---|---|---|
| en_GB `cori` | LibriVox, public domain (Đ) [L16] | Từ đầu (Đ) [L16] | Có vẻ được (S) |
| en_GB `alba` | Đại học Edinburgh, CC BY 4.0 (Đ) [L44] | Fine-tune từ `lessac` medium (Đ) [L44] | Rủi ro, xem dưới |
| en_GB `jenny_dioco` | Jenny dataset: "Commercial use is permitted", phải ghi "Jenny (Dioco)"; người đọc là người **Ireland** (Đ) [L45] | Fine-tune từ `lessac` (Đ) [L46] | Rủi ro; và không phải giọng Anh |
| en_GB `southern_english_female` | OpenSLR 83, CC-BY-SA 4.0 (Đ) [L47] | Fine-tune từ `ryan` low (Đ) [L47] | Rủi ro, `ryan` là NC |
| en_GB `northern_english_male` | OpenSLR 83, CC-BY-SA 4.0 (Đ) [L48] | Fine-tune từ `lessac` (Đ) [L48] | Rủi ro |
| en_GB `alan` | Mimic3 voices, "See URL" (Đ) [L49] | Fine-tune từ `lessac` (Đ) [L49] | Chưa rõ |
| en_US `lessac` | Blizzard 2013 Lessac: **cấm mọi mục đích thương mại**, gồm phát triển, bán sản phẩm voice synthesis (Đ) [L14][L15] | Từ đầu | Không |
| en_US `ryan` | RyanSpeech, CC BY-NC-SA 4.0 (Đ) [L50] | Từ đầu | Không |
| en_US `hfc_female` | Hi-Fi-CAPTAIN, CC BY-NC-SA 4.0 (Đ) [L51] | Fine-tune từ `lessac` | Không |
| en_US `amy` | Mimic3 voices, "See URL" (Đ) [L52] | Fine-tune từ `lessac` | Chưa rõ |
| en_US `libritts_r` | LibriTTS-R, CC BY 4.0, 904 speaker (Đ) [L53] | Fine-tune từ `lessac` | Rủi ro |

"Rủi ro" nghĩa là: license Blizzard 2013 không nói rõ về model dẫn xuất (Đ) [L15], nên giọng fine-tune từ `lessac` có thừa hưởng điều
cấm thương mại hay không là câu hỏi mở (S). 15 giọng en-US còn lại chưa đọc MODEL_CARD (?).

**Phoneme input.** Bọc phoneme espeak-ng trong `[[ ]]` ngay trong text, ví dụ `I am the [[ bˈætmæn ]]`; lấy chuỗi bằng
`espeak-ng -v en-us --ipa=3 -q <TEXT>` (Đ) [L10]. espeak-ng có giọng `en-gb` và `en-us`: **ASSUMPTION** (README chỉ ghi "more than 100
languages and accents") [L31].

**Kích thước, tốc độ.** `en_GB-cori-high.onnx` 114 MB (Đ) [L37]. Không có số RTF chính thức (Đ) [L9][L12].

**Bảo trì.** `piper-tts` 1.5.0 (17/07/2026) tới 1.8.0 (04/09/2026), có wheel `win_amd64` (Đ) [L11]. Đang được bảo trì.

---

## §4 Từng model còn lại (vì sao loại hoặc để dự phòng)

- **Kitten TTS.** Bản 0.8 (15M/40M/80M) Apache-2.0, chạy CPU, 8 giọng tên Bella, Jasper, Luna… (Đ) [L19][L20]; không nguồn nào ghi
  accent hay phoneme input. Bản nano 0.2 còn ghi "developer preview" (Đ) [L54]. Kitten TTS 2 (1,7B, 115 giọng) dùng Stellon Labs Community
  License, thương mại miễn phí tới 1 triệu USD doanh thu hoặc vốn, quá mức đó phải mua license (Đ) [L38]. Không đáp ứng Y2, Y3.
- **Coqui XTTS-v2.** CPML: "allows only non-commercial use of a machine learning model and its outputs" (Đ) [L21]. Loại (Y1).
- **MeloTTS.** MIT, có EN-US, EN-BR, EN_INDIA, EN-AU (Đ) [L22][L40]. Không ghi số speaker, không có phoneme input, không thấy ngày
  release (Đ) [L22]. Là dự phòng nếu Kokoro en-GB nghe không được.
- **StyleTTS2.** Code MIT; model pretrained bắt báo người nghe là giọng tổng hợp khi không có quyền dùng giọng; phonemizer phụ thuộc
  gói GPL nên không đi kèm repo (Đ) [L25]. Là kiến trúc gốc của Kokoro (Đ) [L1]. Không có giọng en-GB pretrained; muốn có phải tự train (S).
- **F5-TTS.** Weights CC-BY-NC vì dữ liệu Emilia (Đ) [L23][L24]. Loại (Y1).
- **Chatterbox.** MIT, có Nano 110M chạy 3x real-time trên 8 core CPU, nhưng Turbo và Nano cần clip giọng mẫu, mọi file có watermark Perth,
  và "As of August 2026, Chatterbox is retired research" (Đ) [L26]. Loại (Y6).
- **Orpheus.** 3B, nền Llama-3b, inference bằng vLLM (Đ) [L27]; model card ghi 4B params trong metadata (Đ) [L28]. Quá nặng cho CPU (S).
- **Dia.** 1,6B, chỉ tiếng Anh, chưa chạy CPU, giọng đổi mỗi lần trừ khi cố định seed hoặc audio prompt (Đ) [L29]. Loại (Y4).
- **Pocket TTS (Kyutai).** Mới và nhanh trên CPU (Đ) [L32][L33]. Danh sách giọng có tên như `george`, `jane`, `stuart_bell` nhưng không gắn
  accent (Đ) [L33]; điều khoản cấm "voice impersonation or cloning without explicit and lawful consent" (Đ) [L32]. Không có phoneme input.
- **NeuTTS Air.** Apache-2.0, nhận phoneme làm input, nhưng Air phải clone từ audio mẫu kèm transcript và mặc định gắn watermark Perth (Đ) [L34].
  Muốn có giọng en-GB thì phải tự có clip giọng Anh được phép dùng (S).
- **Supertonic 3.** Weights OpenRAIL-M; "commercially usable preset voices" chỉ có qua Supertone Play và API; repo archive 09/09/2026 (Đ) [L36].

---

## §5 Cách A: sinh sẵn audio catalog trên máy dev, upload lên object storage

```
Máy dev (Windows 11, CPU)                      Cloudflare R2                  Trình duyệt
 catalog: từ + IPA theo nghĩa  ──► model ──►  mp3/ogg theo (sense, accent) ──► <audio src=...>
 (IPA → misaki hoặc espeak)                   (API chỉ trả URL)
```

**Khối lượng (S, tự tính, mọi giả định ghi rõ):**

| Mục | Giả định | Kết quả |
|---|---|---|
| Số file | 7.800 từ × 2 accent × (1 từ + 1 câu ví dụ) — **ASSUMPTION** 1 câu/từ, chưa tính sense nhiều cách đọc | ~31.200 file |
| Độ dài audio | **ASSUMPTION** từ ~1 s, câu ~4 s | 7.800 × 2 × 5 s = 78.000 s ≈ 21,7 giờ audio |
| Thời gian CPU | RTF 0,5 (4 vCPU EPYC, Kokoro) (T) [L30] | ~11 giờ; máy dev nhanh hơn hay chậm hơn: **ASSUMPTION** |
| Dung lượng | **ASSUMPTION** mp3 mono 32 kbps ≈ 4 KB/s | ~310 MB |

**Ưu:** server không chạy model, không thêm RAM/CPU; nghe và loại file hỏng một lần trước khi đưa lên; GPL của espeak-ng/Piper không
chạm tới server (S). **Nhược:** phải viết script sinh, đổi IPA, convert sang mp3/ogg (cần một encoder như ffmpeg: **ASSUMPTION**, chưa
kiểm license/cài đặt); sửa IPA một từ thì phải sinh lại file đó; máy dev Windows chưa rõ có GPU không, nên tính theo CPU.

**Cần kiểm trước:** Kokoro có cài và chạy được trên Windows 11 không. README ghi cài espeak-ng trên Windows qua trang release của espeak-ng (Đ) [L3]; phần còn lại chưa thử (?).

---

## §6 Cách B: chạy model trên API host cho từ riêng của người học

```
Người học thêm từ riêng ─► API ghi job ─► worker (BullMQ) chạy TTS ─► upload R2 ─► lưu URL
                                           (không chạy trong request)
```

**Nhu cầu tài nguyên (phần lớn là ASSUMPTION, không nguồn nào ghi RAM CPU của Kokoro hay Piper):**

| Thành phần | Số có nguồn | Ước lượng |
|---|---|---|
| Kokoro ONNX q8 | File 92,4 MB (Đ) [L8] | **ASSUMPTION** RAM lúc chạy 0,3–0,6 GB |
| Kokoro PyTorch (Python) | — | **ASSUMPTION** RAM 1–1,5 GB vì có PyTorch và spaCy; cần một service Python riêng cạnh NestJS |
| Piper giọng high | File 114 MB (Đ) [L37] | **ASSUMPTION** RAM 0,2–0,4 GB |
| Thời gian một từ (~1 s audio) | RTF ~0,5 trên 4 vCPU (T) [L30] | **ASSUMPTION** 0,5–2 s trên container 1–2 vCPU, cộng thời gian nạp model lần đầu |

**Ưu:** từ riêng có audio cùng giọng với catalog; không phụ thuộc nhà cung cấp cloud. **Nhược:** container API/worker phải lớn hơn và đắt
hơn (giá Railway/Render chưa kiểm: **ASSUMPTION**); NestJS là Node, còn `kokoro` là Python, nên hoặc thêm service Python, hoặc dùng
`kokoro-js` chưa kiểm được (§3.1); từ riêng **không có IPA soạn sẵn**, nên phải dựa vào G2P của misaki (POS + từ điển) và espeak-ng
fallback (GPL-3) cho từ lạ (Đ) [L4][L41][L31]; nhiều người thêm từ cùng lúc thì job xếp hàng (S).

**Phương án thay cho B (S):** cách A cho catalog, còn từ riêng gọi một nhà cung cấp cloud (khối lượng nhỏ, xem báo cáo cloud §0 điểm 2)
hoặc dùng `speechSynthesis` của trình duyệt. Chi phí và chất lượng của hai đường này chưa so trong báo cáo này.

---

## §7 Điểm chưa kiểm được

1. Chất lượng Kokoro khi đọc **một từ đơn**: chỉ có câu "short utterances are a weakness" [L2]; chưa nghe thử.
2. RAM lúc chạy và RTF trên CPU của Kokoro và Piper: chỉ có một benchmark cộng đồng [L30]; không có số chính thức.
3. Máy dev có GPU hay không, và tốc độ thật trên máy đó.
4. `kokoro-js`: có giọng en-GB không, phonemizer nào, license phonemizer (trang npm trả 403).
5. Bảng đổi IPA của dự án sang ký hiệu misaki có đủ và đúng không (tác giả misaki tự nhận có thể dùng sai ký hiệu [L7]).
6. Giọng Piper fine-tune từ `lessac` có thừa hưởng điều cấm thương mại của Blizzard 2013 không [L15]; 15 giọng en-US Piper chưa đọc MODEL_CARD.
7. Có giọng en-US Piper nào dữ liệu sạch và train từ đầu không.
8. espeak-ng có giọng `en-gb` và `en-us` (README không liệt kê) [L31].
9. Orpheus: license thật của nền Llama-3.2 áp lên weights fine-tune [L28].
10. NeuTTS: license code (không đọc được LICENSE) [L34]; Kitten 0.8 nano/micro license riêng [L19].
11. Accent của giọng Kitten, Pocket TTS, Kitten TTS 2: nguồn không ghi.
12. Ngày release MeloTTS, StyleTTS2, Dia, NeuTTS, Kitten: nguồn không ghi.
13. Encoder mp3/ogg, giá container Railway/Render theo RAM, free tier R2: không đọc trong phiên này.
14. Kokoro train một phần trên "synthetic audio from closed TTS providers" [L1]: điều khoản của các nhà cung cấp đó có ảnh hưởng gì tới
    người dùng Kokoro không, chưa xét.

---

## §8 Nguồn (đọc 06/11/2026)

- [L1] https://huggingface.co/hexgrad/Kokoro-82M
- [L2] https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md
- [L3] https://github.com/hexgrad/kokoro
- [L4] https://github.com/hexgrad/misaki
- [L5] https://pypi.org/project/kokoro/
- [L6] https://pypi.org/project/misaki/
- [L7] https://github.com/hexgrad/misaki/blob/main/EN_PHONES.md
- [L8] https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX
- [L9] https://github.com/OHF-Voice/piper1-gpl
- [L10] https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/CLI.md
- [L11] https://pypi.org/project/piper-tts/
- [L12] https://github.com/rhasspy/piper
- [L13] https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/VOICES.md
- [L14] https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/lessac/high/MODEL_CARD
- [L15] https://www.cstr.ed.ac.uk/projects/blizzard/2013/lessac_blizzard2013/license.html
- [L16] https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_GB/cori/high/MODEL_CARD
- [L17] https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_GB
- [L18] https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_US
- [L19] https://github.com/KittenML/KittenTTS
- [L20] https://huggingface.co/KittenML/kitten-tts-mini-0.8
- [L21] https://huggingface.co/coqui/XTTS-v2/blob/main/LICENSE.txt
- [L22] https://github.com/myshell-ai/MeloTTS
- [L23] https://github.com/SWivid/F5-TTS
- [L24] https://huggingface.co/SWivid/F5-TTS
- [L25] https://github.com/yl4579/StyleTTS2
- [L26] https://github.com/resemble-ai/chatterbox
- [L27] https://github.com/canopyai/Orpheus-TTS
- [L28] https://huggingface.co/canopylabs/orpheus-3b-0.1-ft
- [L29] https://github.com/nari-labs/dia
- [L30] (T) https://bittide.aicompass.dev/article/213f0a6c-be96-402b-8672-c2d9d3cb6029 — benchmark Kokoro 82M và Supertonic 3 trên CPU
- [L31] https://github.com/espeak-ng/espeak-ng
- [L32] https://huggingface.co/kyutai/pocket-tts
- [L33] https://github.com/kyutai-labs/pocket-tts
- [L34] https://github.com/neuphonic/neutts-air
- [L36] https://github.com/supertone-inc/supertonic
- [L37] https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_GB/cori/high
- [L38] https://huggingface.co/KittenML/kitten-tts-2
- [L39] https://huggingface.co/coqui/XTTS-v2
- [L40] https://huggingface.co/myshell-ai/MeloTTS-English
- [L41] https://github.com/hexgrad/misaki/blob/main/misaki/en.py
- [L42] (T) https://github.com/remsky/Kokoro-FastAPI
- [L43] (T) https://github.com/thewh1teagle/kokoro-onnx
- [L44] https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_GB/alba/medium/MODEL_CARD
- [L45] https://github.com/dioco-group/jenny-tts-dataset
- [L46] https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_GB/jenny_dioco/medium/MODEL_CARD
- [L47] https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_GB/southern_english_female/low/MODEL_CARD
- [L48] https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_GB/northern_english_male/medium/MODEL_CARD
- [L49] https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_GB/alan/medium/MODEL_CARD
- [L50] https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/ryan/high/MODEL_CARD
- [L51] https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/hfc_female/medium/MODEL_CARD
- [L52] https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/amy/medium/MODEL_CARD
- [L53] https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/libritts_r/medium/MODEL_CARD
- [L54] https://huggingface.co/KittenML/kitten-tts-nano-0.2
