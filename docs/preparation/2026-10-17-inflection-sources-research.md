# Nguồn dạng chia tiếng Anh cho Bước 3 (G6) — nghiên cứu 17/10/2026

Viết cho chủ dự án để chọn nguồn dạng chia tự sinh (G6 của plan hệ thống Bước 3). Chỉ nêu dữ kiện và trade-off, **không đề xuất
phương án** (luật Bước 3: chủ dự án trả lời trước). Mỗi dữ kiện có nguồn ở cuối file; chỗ nào chưa kiểm ghi `CHƯA KIỂM`.

## Cần gì

- Dạng chia cho ~8.812 từ CEFR-J + Octanove và cho từ riêng người học tự thêm: động từ (ngôi 3 số ít, V-ing, quá khứ, quá khứ phân từ),
  danh từ số nhiều, tính từ so sánh hơn và nhất.
- Dùng ở ba chỗ: tra "went" ra "go" khi thêm nhanh; dòng dạng chia trên trang từ gốc (người học **nhìn thấy**); dạng chia của từ riêng
  (không ai duyệt). Bản đã duyệt qua CSV luôn thắng bản tự sinh (D29).
- Chạy trong API Node/TypeScript (NestJS). Dữ liệu có thể tính sẵn một lần cho catalog, còn từ riêng thì tính lúc người học thêm.

## Kết quả đã đo (luồng A, 17/10)

`compromise@14.18.0` (MIT): **47/50** ca bất quy tắc (sai V3 của run, come, become) và **~81/100** dòng CEFR-J lấy ngẫu nhiên. Lỗi tập trung ở
tính từ dài bị thêm -er/-est ("transitiver", "thoughtlesser", "optimisticer"…), `redo` → "redid", `self` không có số nhiều. Danh từ và động
từ có quy tắc gần như đúng hết.

## Các nguồn

| Nguồn | Phủ gì | Giấy phép (đã đọc) | Dùng trong Node | Cập nhật | Độ đúng |
|---|---|---|---|---|---|
| `compromise` 14.18.0 | Động từ, danh từ, tính từ (theo luật) | MIT | Thư viện npm | 05/10/2026 | Đã đo: xem trên |
| **AGID** 2016.01.19 (Kevin Atkinson, dự án SCOWL) | Động từ (quá khứ, phân từ, -ing, -s), danh từ số nhiều, tính từ/trạng từ -er/-est; mỗi dạng có "mức" (0 thường, 1 ít dùng, 2 cổ/hiếm) và dấu đánh dấu mục đáng ngờ | Cho phép dùng, sửa, phân phối, bán "for any purpose" miễn giữ thông báo bản quyền trong mọi bản sao. Một phần dữ liệu lấy từ 2of12id và WordNet, "mỗi nguồn theo điều khoản riêng" | Tệp dữ liệu văn bản; phải viết bộ đọc và tạo JSON cho các từ cần | Ngừng bảo trì | `CHƯA KIỂM`. Là bảng tra theo từ có sẵn, nên tính từ không có dạng -er thì không có dòng (`CHƯA KIỂM` cho "transitive") |
| **`en-inflectors`** 1.0.12 (FinNLP) | Động từ (VBD, VBN, VBG, VBZ), danh từ số nhiều/ít, tính từ so sánh | MIT | Thư viện npm | 06/2022 | `CHƯA KIỂM` trên CEFR-J. README: tra danh sách bất quy tắc + "4000 common verbs", rồi luật; tính từ theo **số âm tiết** và đuôi; tự báo qua 9.900 test của họ |
| **RosaeNLG** `english-verbs-irregular`, `english-plurals-list` 3.4.0 | Động từ bất quy tắc (quá khứ, phân từ; không có -ing); danh từ số nhiều bất quy tắc lấy từ WordNet. **Không có tính từ** | Gói npm Apache-2.0; tệp dữ liệu ghi `SPDX: CC-BY-4.0` (phải ghi công); phần WordNet kèm giấy phép WordNet 3.0 | Tệp JSON trong gói npm (~13–20 KB cho danh sách động từ) | 03/2026 | `CHƯA KIỂM`. Chỉ là danh sách bất quy tắc, dạng có quy tắc vẫn phải tự sinh |
| **WordNet 3.0**, danh sách ngoại lệ (`verb.exc`, `noun.exc`, `adj.exc`) | Chỉ dạng **bất quy tắc**, theo chiều dạng chia → từ gốc (đảo lại được), có cả tính từ (good → better) | Princeton: cho dùng, sửa, phân phối "for any purpose and without fee", phải kèm thông báo bản quyền và điều khoản miễn trừ trong mọi bản sao | Tệp văn bản; có gói npm `wordnet-db` (3.1.14) | 2006 | Trang hướng dẫn WordNet ghi danh sách danh từ và động từ được sinh tự động từ một từ điển máy, có nhiều mục cần lưu ý |
| **UniMorph** English | Bộ ba (từ gốc, dạng chia, nhãn) | CC BY-SA 3.0 (ghi công + chia sẻ lại cùng giấy phép) | Tệp TSV | — | `CHƯA KIỂM` |
| **Wiktionary** (bản trích kaikki.org) | Nhiều dạng chia kèm nhãn | Trang kaikki không ghi giấy phép; nội dung Wiktionary thường là CC BY-SA + GFDL — `CHƯA KIỂM` | Bản tiếng Anh thô 23,9 GB (2,8 GB nén); phải lọc trước | Liên tục | `CHƯA KIỂM` |
| LemmInflect (tham khảo) | Dạng chia theo nhãn Penn | MIT; dữ liệu từ NIH SPECIALIST Lexicon (miễn phí, điều khoản mở, yêu cầu ghi công) | **Chỉ Python**; muốn dùng phải trích dữ liệu ra | — | README chỉ công bố độ đúng tìm từ gốc (95,6%, so với AGID); không công bố độ đúng sinh dạng chia |

## Trade-off chung

- **Luật tự sinh** (compromise, en-inflectors) phủ mọi từ, kể cả từ riêng lạ, nhưng sai ở chỗ luật không đoán được: tính từ dài, bất quy
  tắc hiếm. **Bảng tra** (AGID, WordNet, RosaeNLG, UniMorph, Wiktionary) đúng với từ có trong bảng, còn từ không có thì không có dạng chia
  (từ riêng lạ dễ rơi vào ca này).
- **Ghép** luật + bảng tra là cách phổ biến (tra bảng trước, không có thì dùng luật), nhưng thêm phần phải giữ và phải test.
- **Giấy phép:** MIT/Apache/AGID/WordNet chỉ cần giữ thông báo bản quyền (thêm một tệp ghi nguồn). CC BY 4.0 cần ghi công nơi người dùng
  thấy được. CC BY-SA (UniMorph, Wiktionary) đòi phần dữ liệu đã chỉnh sửa cũng phải chia sẻ theo CC BY-SA.
- **Tính từ** là chỗ compromise sai nhiều nhất. Nguồn có tính từ: AGID (bảng), en-inflectors (luật theo số âm tiết), WordNet `adj.exc`
  (chỉ bất quy tắc). RosaeNLG không có.
- Phương án "không tự sinh" (chỉ bản đã duyệt qua CSV) không có lỗi, nhưng: mọi từ cần dạng chia đều phải được soạn trong CSV, và từ
  riêng không có dạng chia.

## Các app, phần mềm khác ghi nguồn thế nào (tìm 17/10, theo câu hỏi của chủ dự án)

| Ai | Dùng dữ liệu gì | Ghi nguồn ở đâu, thế nào |
|---|---|---|
| Firefox (Mozilla) | Từ điển kiểm chính tả en-US lấy từ SCOWL (cùng tác giả, cùng kiểu giấy phép với AGID) | Một tệp `README_en_US.txt` đi kèm các tệp từ điển, chép nguyên dòng "Copyright 2000-2026 by Kevin Atkinson" và lời cho phép. Không hiện trong giao diện |
| WordWeb (app từ điển) | WordNet 3.0, Open English Wordnet | Khối thông báo pháp lý trên website: "WordNet 3.0 Copyright 2006 by Princeton University. All rights reserved." và một dòng cho Open English Wordnet |
| Quick Lookup (app từ điển mã nguồn mở) | Wiktionary | Trang giới thiệu chỉ ghi "powered by Wiktionary™" và câu về nhãn hiệu Wikimedia; không ghi giấy phép (màn hình trong app `CHƯA KIỂM`) |
| Livio (app từ điển Android) | Wiktionary | Trang trên kho ứng dụng không thấy ghi giấy phép (màn hình trong app `CHƯA KIỂM`) |
| Duolingo | — | Không tìm thấy trang ghi nguồn công khai |

Nhận xét từ các mẫu trên: với nguồn giấy phép thoáng (SCOWL/AGID, WordNet), cách làm phổ biến là **một dòng bản quyền và lời cho phép
đặt trong tệp đi kèm hoặc trang pháp lý**, không hiện ở màn hình học. Với Wiktionary (CC BY-SA), các app thấy được chỉ ghi "powered by"
ở mức trang giới thiệu, còn có làm đủ yêu cầu chia sẻ lại hay không thì không kiểm được từ bên ngoài.

**Trong project đã có sẵn chỗ ghi nguồn:** Bước 2 có `GET /v1/sources` công khai, trả tên, phiên bản, giấy phép và dòng ghi công của mọi
nguồn dữ liệu (B2#64; đang dùng cho CEFR-J và Octanove). Nguồn dạng chia, nếu cần ghi công, có thể đăng ký vào cùng chỗ này; ngoài ra
repo cần một tệp ghi nguồn bên thứ ba khi đóng gói dữ liệu đó.

## Chưa biết, đo được bằng bộ đo luồng A đã có

Độ đúng của AGID, en-inflectors, và tổ hợp "compromise + danh sách RosaeNLG/WordNet" trên đúng bộ 50 ca + 100 dòng mà compromise đã trượt.
Đo trong thư mục nháp ngoài repo như Task 4 (cần tải AGID từ SourceForge và cài thử hai gói npm).

## Nguồn

- AGID, trang và README: http://wordlist.aspell.net/other/ , http://wordlist.aspell.net/agid-readme/
- en-inflectors README (npm 1.0.12): https://unpkg.com/en-inflectors@1.0.12/README.md
- RosaeNLG: https://unpkg.com/english-verbs-irregular@3.4.0/README.md , https://unpkg.com/english-plurals-list@3.4.0/README.md (có
  nguyên văn giấy phép WordNet 3.0)
- WordNet, định dạng tệp ngoại lệ: https://research.cs.wisc.edu/zhu/space2/TTP/nlp/data/WordNet-3.0/doc/html/wndb.5WN.html
- UniMorph English: https://github.com/unimorph/eng
- kaikki.org (Wiktextract): https://kaikki.org/dictionary/rawdata.html
- LemmInflect: https://github.com/bjascob/LemmInflect
- SPECIALIST Lexicon: https://www.ncbi.nlm.nih.gov/books/NBK9680/
- Phiên bản và giấy phép gói npm: `npm view <gói> version license time.modified` chạy 17/10/2026.
- Firefox README từ điển en-US: https://searchfox.org/mozilla-central/source/extensions/spellcheck/locales/en-US/hunspell/README_en_US.txt
- WordWeb, thông báo bản quyền: https://wordwebonline.com/copy.php ; https://en.wikipedia.org/wiki/WordWeb
- Quick Lookup: https://community.linuxmint.com/software/view/com.github.johnfactotum.QuickLookup
- Livio: https://play.google.com/store/apps/developer?id=Livio , https://apkcombo.com/online-dictionary/livio.dictionary/
- Giấy phép WordNet (Princeton): https://wordnet.princeton.edu/node/10
