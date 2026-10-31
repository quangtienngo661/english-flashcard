# Vận hành AI eval trong admin: bộ hướng dẫn (31/10/2026)

**Bộ này là gì.** Hướng dẫn để chủ dự án tự làm, trên trang admin, toàn bộ việc kiểm chất lượng AI: soạn golden set, chạy eval, đọc
kết quả, dựng judge, gắn nhãn, sửa prompt, và tự quyết một cấu hình đã đủ tốt để publish chưa. Không có code mới: mọi thứ làm bằng
các nút đã có, cộng với file JSONL/CSV để "Nhập hàng loạt" và đoạn văn để dán vào nháp ở trang "Cấu hình" và "Judge".

**Cho ai.** Người mới với AI engineering. Mỗi thuật ngữ được giải thích bằng một ví dụ trong app: **Lan**, một người học Việt Nam,
đang luyện từ `rhythm` (nhịp điệu). AI viết cho Lan câu "The drummer kept a steady ___ throughout the song." Lan gõ `beat`, bị chấm
sai, dù `beat` cũng đúng. Cả bộ hướng dẫn xoay quanh việc bắt được những câu như thế trước khi Lan gặp.

**Nguồn.** Mọi điều về cách app chạy (nhãn nút, giới hạn, công thức, luật chặn) lấy từ
[app-facts](../../research/2026-10-31-ai-eval-app-facts.md) (đọc code, chưa chạy app). Mọi lời khuyên chung có link nguồn, lấy từ
[file nghiên cứu](../../research/2026-10-31-ai-eval-best-practices.md). Chỗ nào không có nguồn ghi `ASSUMPTION`.

## Thứ tự đọc

| File | Đọc khi |
|---|---|
| [01-khai-niem.md](01-khai-niem.md) | Trước tiên. Vòng lặp eval, các lớp chấm, app chặn gì và để bạn quyết gì |
| [02-thiet-lap.md](02-thiet-lap.md) | Một lần, trước vòng đầu: key, model, giá, cài đặt, dọn ví dụ cũ, chi phí |
| [03-golden-set.md](03-golden-set.md) | Khi soạn bộ ví dụ cho một thao tác |
| [04-chay-eval-va-doc-ket-qua.md](04-chay-eval-va-doc-ket-qua.md) | Khi chạy và đọc một lần chạy |
| [05-judge-va-gan-nhan.md](05-judge-va-gan-nhan.md) | Khi dựng judge và gắn nhãn |
| [06-prompt.md](06-prompt.md) | Khi sửa prompt, model, effort |
| [07-quyet-dinh-publish.md](07-quyet-dinh-publish.md) | Trước mỗi lần bấm "Publish" (in ra được) |
| [08-tung-thao-tac.md](08-tung-thao-tac.md) | Tra cứu riêng cho từng thao tác |
| [09-vong-dau-tien-generate-cloze.md](09-vong-dau-tien-generate-cloze.md) | Làm theo từng cú bấm cho vòng đầu tiên |

Thứ tự thao tác đề xuất (bạn đổi tùy ý): `generate_cloze` → `generate_sentence_mcq` → `generate_meaning_question` → `lookup_word` →
`check_private_word`. `translate_sentence` không có luồng người học dùng, bỏ qua.

## Vòng đầu tiên trong 10 bước

1. Ghi `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` vào file env mà API đang đọc (chạy bằng `pnpm bootstrap` thì là `.env` ở gốc repo nếu có, không thì `apps/api/.env`), rồi khởi động lại API và worker (với `pnpm bootstrap`: `docker compose --profile app restart api`; xem `docs/deliveries/docker-bootstrap.md`). Trang "Tình trạng" phải ghi cả hai nhà
   cung cấp ở dòng "Nhà cung cấp có key: …". ([02](02-thiet-lap.md))
2. "Cài đặt hệ thống" → tab "AI": "Trần USD việc admin mỗi ngày" = 2, "Tỉ lệ ví dụ held-out" = 0.3. ([02](02-thiet-lap.md))
3. "Model": kiểm có `gpt-6.1-terra` (giá 1 / 5), `gpt-6.1-sol` (2 / 10) và một model Anthropic cho judge; thiếu cái nào thì "Thêm model". DB local của bạn đã có hai model OpenAI này. ([02](02-thiet-lap.md))
4. "Bộ ví dụ" → chọn `generate_cloze` → xử lý các ví dụ cũ "Chưa có ô mong đợi". ([02](02-thiet-lap.md))
5. Soạn file 30 dòng, "Nhập hàng loạt", rồi "Chốt phiên bản". ([03](03-golden-set.md))
6. "Cấu hình" → `generate_cloze` → "Tạo nháp" → chọn model, điền "Ghi chú", "Lưu nháp", "Chạy thử". ([06](06-prompt.md))
7. "Chạy bộ ví dụ với nháp", đợi worker chạy xong, mở panel lần chạy. ([04](04-chay-eval-va-doc-ket-qua.md))
8. Error analysis: đọc từng kết quả dev, ghi lỗi đầu tiên, đếm theo loại. ([04](04-chay-eval-va-doc-ket-qua.md))
9. "Judge": sửa judge "Chỉ một đáp án", chọn model Anthropic, chấm lần chạy, gắn nhãn bằng phím 1/2/3. ([05](05-judge-va-gan-nhan.md))
10. Đối chiếu ngưỡng, điền nhật ký quyết định, rồi "Publish" hoặc sửa prompt và chạy lại. ([07](07-quyet-dinh-publish.md))

Bản chi tiết từng cú bấm: [09](09-vong-dau-tien-generate-cloze.md).

## Bảng thuật ngữ

| Thuật ngữ | Nghĩa, với ví dụ của Lan |
|---|---|
| eval | Cho AI làm một loạt bài có sẵn rồi chấm, để biết nó tốt tới đâu trước khi Lan gặp. |
| golden set ("Bộ ví dụ") | Danh sách đầu vào cố định để chấm, ví dụ một dòng: từ `rhythm`, nghĩa "nhịp điệu", cấp B2. |
| expected ("ô mong đợi") | Đáp án mẫu của một ví dụ. Với cloze: các dạng được nhận, ví dụ `{"forms": ["rhythm", "rhythms"]}`. |
| dev | Phần ví dụ bạn được xem và dùng để sửa prompt. |
| held-out | Phần ví dụ bị ẩn, như đề thi chưa mở: chỉ thấy con số tổng, để biết prompt có "học tủ" theo dev không. |
| phiên bản đã chốt | Ảnh chụp cố định của bộ ví dụ ("Phiên bản N"). Chỉ hai lần chạy trên cùng phiên bản mới so được. |
| shape ("khuôn") | Đầu ra có đúng hình dạng JSON không, ví dụ câu có đúng một `___`. |
| code rules ("luật") | Kiểm bằng code, ví dụ đáp án phải là một dạng của `rhythm` có trong kho. |
| judge | Một model AI khác (Anthropic) đọc câu và trả lời một câu hỏi, ví dụ "ngoài `rhythm` còn từ nào điền vừa không?". |
| criterion (tiêu chí), rubric | Một câu hỏi judge phải trả lời, kèm định nghĩa thế nào là đạt / không đạt. Rubric là bộ định nghĩa đó. |
| label (nhãn) | Câu trả lời của chính bạn cho tiêu chí đó, gắn bằng phím 1/2/3. Dùng để kiểm judge. |
| agreement ("Độ khớp"), calibrated ("Đã hiệu chỉnh") | Tỉ lệ judge trả lời giống nhãn của bạn; "đã hiệu chỉnh" khi đủ số nhãn và đủ tỉ lệ khớp. |
| prompt ("Lời dặn") | Đoạn hướng dẫn gửi kèm mỗi lần gọi AI. |
| few-shot ("Ví dụ mẫu") | Vài cặp đầu vào/đầu ra mẫu nằm trong prompt để AI bắt chước. |
| nháp, bản đang chạy | Nháp là cấu hình bạn đang sửa; bản đang chạy là cấu hình Lan đang nhận câu. |
| baseline | Lần chạy của bản đang chạy, dùng làm mốc để so nháp. |
| publish, rollback ("Quay về") | Publish: đưa nháp thành bản đang chạy. Rollback: quay lại cấu hình liền trước. |
| error analysis | Đọc từng đầu ra, ghi lỗi đầu tiên, gom thành loại lỗi và đếm. |
| effort, thinking | Mức "suy nghĩ" của model trước khi trả lời. Cao hơn thì chậm và tốn hơn, chưa chắc tốt hơn. |
| token | Đơn vị tính tiền của nhà cung cấp, khoảng một phần của một từ. Giá ghi theo US$ cho 1 triệu token. |

## Quyết định của chủ dự án (trong cuộc trò chuyện, 31/10/2026)

| # | Quyết định | Ghi ở |
|---|---|---|
| 1 | Kết quả của việc này là học bằng cách làm và các file để nhập; không viết code mới. Golden set là file JSONL/CSV, prompt và tiêu chí judge dán vào nháp. | README (đây), [03](03-golden-set.md), [05](05-judge-va-gan-nhan.md), [06](06-prompt.md) |
| 2 | Judge dùng model Anthropic; writer dùng OpenAI (`gpt-6.1-terra` 1/5, `gpt-6.1-sol` 2/10 US$ mỗi 1 triệu token vào/ra). | [02](02-thiet-lap.md), [05](05-judge-va-gan-nhan.md) |
| 3 | Chủ dự án cho rằng ẩn tên model với judge làm thiên vị cùng họ không còn quan trọng; nghiên cứu có quan điểm khác. Hai quan điểm đặt cạnh nhau. | [05](05-judge-va-gan-nhan.md) |
| 4 | "Đủ tốt để publish" do chủ dự án tự quyết khi đọc số; không xây ngưỡng tuyệt đối vào app. App chỉ chặn khi thiếu bằng chứng và cảnh báo khi tụt tương đối. | [01](01-khai-niem.md), [07](07-quyet-dinh-publish.md) |
| 5 | Thứ tự thao tác tự do; thứ tự đề xuất như trên; bỏ `translate_sentence`. | README (đây), [08](08-tung-thao-tac.md) |
| 6 | Cỡ bộ và ngân sách (Claude đề xuất, chủ dự án đổi được): 30 ví dụ (≈21 dev + 9 held-out), lớn dần lên 50–100 sau 2–3 vòng; ≈0,2–0,5 USD một vòng, ≈1–2 USD một thao tác, ≈15 USD cả đợt; trần 2 USD/ngày; ≈1,5–2 giờ công mỗi thao tác. | [02](02-thiet-lap.md), [03](03-golden-set.md) |
| 7 | Thành phần golden set: ~10 từ thông dụng, ~12 ca biên, ~4 ca regression từ B1, ~4 do chủ dự án chọn; từ phải có trong kho. | [03](03-golden-set.md), [08](08-tung-thao-tac.md) |
| 8 | Ngưỡng "đủ tốt" đề xuất, chỉnh sau vòng 1, chủ dự án quyết. | [07](07-quyet-dinh-publish.md) |

## Những điều chưa kiểm

- **Tính năng eval, judge, publish mới chỉ chạy với model Fake** (theo thông tin trong cuộc trò chuyện). Số đo thật duy nhất là B1:
  writer Anthropic trên 14 câu cloze, ở luồng cũ ([B1](../../preparation/b1-eval/generate_cloze-2026-10-29-error-analysis.md)).
  Chưa có lời gọi OpenAI thật nào.
- Mọi ước tính chi phí trong bộ này là `ASSUMPTION` cho tới khi đo trên lần chạy đầu.
- Từ app-facts: chưa nhìn màn hình thật (thứ tự hiển thị suy từ code); nội dung thật của cấu hình đang chạy trong DB của bạn có thể
  khác prompt khởi đầu; chưa biết các ví dụ mẫu seed có qua kiểm few-shot T2 với kho hiện tại không; việc phải khởi động lại API và
  worker sau khi đổi key là suy từ code; chưa biết model OpenAI thật có nhận từng mức effort không; giá cache Anthropic so với hóa
  đơn thật chưa đối chiếu.
- Từ file nghiên cứu: chưa có nguồn nói held-out "hết giá trị" sau bao nhiêu lần xem; chưa có nghiên cứu đo self-preference ở kiểu
  chấm pass/fail từng tiêu chí như app; chưa có nghiên cứu chấm dịch Anh → Việt bằng LLM; các khoảng tin cậy là tính toán, không
  phải số của nguồn; vài nguồn là preprint.
- Tám điểm giao diện người viết chưa chắc đã được kiểm lại trong code và sửa trong bài (nút "Chấm bằng judge" ở panel lần chạy, lần chạy nháp hiện trong bảng "Lần chạy", điểm judge tách dev / held-out, màn "Gắn nhãn" không hiện verdict, trường đầu ra của cloze, hộp "Sửa" tự điền dạng từ, điều kiện tài khoản nhận câu AI). Vẫn chưa nhìn màn hình thật; còn chưa rõ: "Nhập hàng loạt" có chặn ví dụ trùng không.
