# 03. Golden set: soạn, nhập, chốt, giữ held-out

[README](README.md) · trước: [02](02-thiet-lap.md) · tiếp: [04 Chạy eval](04-chay-eval-va-doc-ket-qua.md)

## 1. Bao nhiêu ví dụ

Bắt đầu **30 ví dụ mỗi thao tác** (≈ 21 dev + 9 held-out), lớn dần lên 50–100 sau 2–3 vòng (đề xuất, bạn đổi được).
- Anthropic: "20-50 simple tasks drawn from real failures is a great start"
  ([Anthropic, 01/2026](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)).
- Bộ eval thường "grow to 100 or more examples"; độ phủ quyết định cỡ cuối ([evals FAQ](https://hamel.dev/blog/posts/evals-faq/)).
- 30 đủ để **thấy** lỗi lớn, không đủ để **đo** chênh lệch nhỏ (xem [04 §6](04-chay-eval-va-doc-ket-qua.md)).

Giới hạn app: tối đa 1.000 ví dụ mỗi thao tác ("Ví dụ ({count}/1.000)").

## 2. Thành phần 30 ví dụ

| Nhóm | Số | Nội dung | Ví dụ cho cloze |
|---|---|---|---|
| Thông dụng | ~10 | Rải đều cấp A1–C2 và các từ loại | `water`, `happy`, `arrive`, `decision`, `although`… |
| Ca biên | ~12 | Đa nghĩa; đồng nghĩa gần (`rhythm`/`beat`); cụm động từ ghi `verb`; dạng bất quy tắc (`go`/`went`); từ rất ngắn; từ chuyên ngành | `light` (nhẹ), `begin`, `give up`, `buy`, `ice`, `invoice` |
| Regression | ~4 | Ca từng sai, lấy từ error analysis B1 | `rhythm`, `big`, `run` (điều hành), `subtle` |
| Bạn chọn | ~4 | Từ bạn thấy hay sai hoặc quan trọng với người học | tùy bạn |

Cơ sở: eval nên phản ánh phân bố thật và gồm ca biên, ca mơ hồ
([Anthropic docs](https://platform.claude.com/docs/en/docs/test-and-evaluate/develop-tests)); trộn dữ liệu thật, ví dụ chuyên gia
viết, ca thường, ca biên ([OpenAI](https://developers.openai.com/api/docs/guides/evaluation-best-practices)); sinh dữ liệu theo
chiều (từ loại × cấp × số nghĩa) và viết tay trước ([evals FAQ](https://hamel.dev/blog/posts/evals-faq/)). Danh sách gợi ý cho từng
thao tác ở [08](08-tung-thao-tac.md).

**Năm luật khi chọn từ:**
1. **Từ phải có trong kho** (với cloze, meaning, mcq). Không có thì luật bị bỏ qua ("Bỏ qua: không có trong kho") và bạn mất một lớp
   chấm. Cách kiểm không lưu gì: "Thêm ví dụ" → gõ `word` và `part_of_speech` → rời ô: thấy "Đã điền {count} dạng từ kho." là có;
   thấy "Không thấy từ này trong kho…" là không → bấm hủy.
2. **Không dùng từ đang nằm trong ví dụ mẫu (few-shot) của prompt.** Seed hiện có: cloze `brush`, `attention`; meaning `deploy`,
   `bank`; mcq `deploy`, `borrow`; lookup `went`, `bank`; check_private_word `rizz`, `deplyo`, `bank`. Cấu hình trong DB của bạn có
   thể khác: xem "Ví dụ" trong nháp ở trang "Cấu hình". Lý do: ví dụ golden lọt vào few-shot thì eval đo trí nhớ, không đo năng lực
   (`ASSUMPTION` trong file nghiên cứu §2).
3. **Một từ, một ví dụ** là chính. Nhiều nghĩa của cùng một từ là một cụm, làm kết quả trông chắc hơn thật
   ([Miller, 2024](https://arxiv.org/html/2411.00640v1)).
4. **Đáp án mẫu phải rõ tới mức hai người hiểu biết chấm giống nhau**
   ([Anthropic, 01/2026](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)).
5. Cụm động từ: ghi `part_of_speech` là `verb`. Giá trị `phrasal verb` không hợp lệ (đây là lý do B1 mất một dòng `take off`).

`part_of_speech` hợp lệ: `noun, verb, adjective, adverb, pronoun, preposition, determiner, conjunction, number, modal auxiliary,
be-verb, do-verb, have-verb, infinitive-to, interjection`, và đầu vào còn nhận `unspecified`. `level`: `A1`…`C2` hoặc `null`.

## 3. Ô mong đợi (`expected`) cho từng thao tác

| Thao tác | JSON | Đạt khi |
|---|---|---|
| `generate_cloze` | `{"forms": ["rhythm", "rhythms"]}` | có ≥ 1 đáp án và **mọi** đáp án nằm trong `forms` |
| `generate_meaning_question` | `{"forms": ["light", "lighter", "lightest"]}` | `word_in_sentence` nằm trong `forms` |
| `lookup_word` | `{"lemma": "child", "part_of_speech": "noun"}` | lemma và từ loại trùng (không phân biệt hoa thường). Từ loại không được là `unspecified` |
| `check_private_word` | `{"verdict": "not_recognized"}` | verdict trùng (`ok` hoặc `not_recognized`) |
| `generate_sentence_mcq`, `translate_sentence` | **không có ô này** (có là bị từ chối) | — |

`forms`: 1–50 chuỗi không rỗng; app tự trim và bỏ trùng. Khóa lạ bị từ chối (`expected-invalid`).

**Viết `forms` thế nào.** Ghi **mọi dạng hợp lệ** của từ (gốc, số nhiều, chia thì, so sánh). Thiếu một dạng thì AI trả đúng dạng đó
vẫn bị tính trượt mong đợi. Hộp "Thêm ví dụ" tự điền ô "Các dạng được nhận" từ kho khi bạn rời ô từ / từ loại; hộp "Sửa" cũng tự điền nếu ví dụ chưa có ô mong đợi (đã có thì giữ nguyên chữ bạn ghi).
Khi nhập hàng loạt thì không có gì tự điền, nên hãy tự ghi đủ (mẹo: dùng hộp "Thêm ví dụ" để xem kho điền gì, chép ra, rồi hủy).

Giới hạn: `forms` chứa mọi dạng hợp lệ nên **không bắt được** lỗi "nhận dạng sai ngữ pháp" (B1 gọi là E2: sau "will ___" mà nhận cả
`deployed`). `deployed` vẫn nằm trong `forms`. Lỗi đó cần judge ([08](08-tung-thao-tac.md)).

## 4. Dev và held-out

**App chia thế nào.** Ví dụ mới vào held-out nếu bộ đang trống, hoặc nếu số held-out còn dưới tỉ lệ cài đặt; ngược lại vào dev. Với
0.3 từ bộ trống: `H D D D H D D H D D`. Nếu đã có 10 ví dụ dev cũ thì 5 ví dụ tiếp theo đều vào held-out.

**Đề xuất: tự chọn bằng cột `split`.** Dòng có `split` (`dev` hoặc `held_out`) giữ đúng như vậy. Chọn 9 held-out rải đều: 3 thông
dụng, 4 ca biên, 1 regression, 1 bạn chọn. Như vậy held-out đại diện cho cả bộ.

Ví dụ đi đâu khác:
- "Đưa vào bộ ví dụ" (từ báo lỗi hoặc "Câu AI thật") **luôn vào dev**.
- "Chạy thử" chỉ dùng ví dụ dev.

## 5. File nhập: định dạng

"Bộ ví dụ" → chọn thao tác → "Nhập hàng loạt" → chọn file hoặc dán nội dung.
- CSV, TSV hoặc JSON Lines, tối đa 2 MB, tối đa 1.000 dòng mỗi lần.
- **JSON Lines** (ký tự đầu là `{`): mỗi dòng một object `{"input": {...}, "expected": {...}, "split": "dev", "note": "..."}`.
  `expected`, `split`, `note` luôn là khóa của dòng, không thuộc `input`. "Ghi chú" ≤ 500 ký tự.
- **CSV**: dòng đầu là tên cột = các trường đầu vào + tùy chọn `expected`, `split`, `note`. Tên cột lạ → cả file bị từ chối. Ô rỗng
  = `null`. Ô bắt đầu bằng `[` hoặc `{` được đọc là JSON. Ô có dấu phẩy hoặc ngoặc kép thì bọc trong `"…"` và nhân đôi ngoặc kép
  bên trong.

**JSONL mẫu cho `generate_cloze`** (5 trong 30 dòng):

```jsonl
{"input": {"word": "rhythm", "part_of_speech": "noun", "level": "B2", "meaning_vi": "nhịp điệu (âm nhạc)", "context_label": null}, "expected": {"forms": ["rhythm", "rhythms"]}, "split": "dev", "note": "regression B1: 'kept a steady ___' nhận cả beat"}
{"input": {"word": "big", "part_of_speech": "adjective", "level": "A1", "meaning_vi": "to, lớn", "context_label": null}, "expected": {"forms": ["big", "bigger", "biggest"]}, "split": "dev", "note": "regression B1: large, huge điền vừa"}
{"input": {"word": "go", "part_of_speech": "verb", "level": "A1", "meaning_vi": "đi", "context_label": null}, "expected": {"forms": ["go", "goes", "went", "gone", "going"]}, "split": "held_out", "note": "bất quy tắc"}
{"input": {"word": "give up", "part_of_speech": "verb", "level": "B1", "meaning_vi": "từ bỏ", "context_label": null}, "expected": {"forms": ["give up", "gives up", "gave up", "given up", "giving up"]}, "split": "dev", "note": "cụm động từ ghi verb"}
{"input": {"word": "invoice", "part_of_speech": "noun", "level": null, "meaning_vi": "hóa đơn", "context_label": "kế toán"}, "expected": {"forms": ["invoice", "invoices"]}, "split": "held_out", "note": "chuyên ngành; bill, receipt dễ điền vừa"}
```

**Cùng nội dung ở dạng CSV:**

```csv
word,part_of_speech,level,meaning_vi,context_label,expected,split,note
rhythm,noun,B2,nhịp điệu (âm nhạc),,"{""forms"": [""rhythm"", ""rhythms""]}",dev,"regression B1: 'kept a steady ___' nhận cả beat"
big,adjective,A1,"to, lớn",,"{""forms"": [""big"", ""bigger"", ""biggest""]}",dev,"regression B1: large, huge điền vừa"
go,verb,A1,đi,,"{""forms"": [""go"", ""goes"", ""went"", ""gone"", ""going""]}",held_out,bất quy tắc
give up,verb,B1,từ bỏ,,"{""forms"": [""give up"", ""gives up"", ""gave up"", ""given up"", ""giving up""]}",dev,cụm động từ ghi verb
invoice,noun,,hóa đơn,kế toán,"{""forms"": [""invoice"", ""invoices""]}",held_out,"chuyên ngành; bill, receipt dễ điền vừa"
```

Cấp độ, nghĩa và các dạng ở trên là gợi ý: đối chiếu với kho của bạn trước khi nhập. `give up` và `invoice` chỉ dùng được nếu có trong
kho.

**Sau khi bấm nhập:**
- Dòng sai bị bỏ qua, dòng đúng **vẫn được nhập**, app trả danh sách dòng lỗi theo số dòng. Sửa và nhập lại **chỉ các dòng lỗi**.
  Nhập lại cả file sẽ thêm trùng (app-facts không ghi việc chặn trùng).
- Nếu số dòng đúng vượt chỗ còn lại → cả lần nhập bị từ chối: "Bộ ví dụ chỉ còn chỗ cho {room} ví dụ, bạn đang nhập {sent}."
- Đếm lại: bảng "Ví dụ ({count}/1.000)" phải ra 30; ví dụ held-out hiện nút "Mở ví dụ held-out" thay vì "Sửa".

## 6. Chốt phiên bản

"Chốt phiên bản" chụp toàn bộ bộ đang soạn thành "Phiên bản N+1". Bị từ chối khi còn ví dụ thiếu ô mong đợi, hoặc chưa có ví dụ
held-out nào ("Bộ chưa có ví dụ held-out nào."). Phiên bản đã chốt **không bao giờ đổi**; sửa hay xóa ví dụ sau đó không ảnh hưởng.

Hệ quả cần nhớ: chốt phiên bản mới thì **cả nháp lẫn bản đang chạy phải chạy lại** trên phiên bản mới mới publish được, và chỉ hai
lần chạy trên cùng phiên bản mới so được. Vì vậy: gom thay đổi lại, chốt ít lần (ví dụ một lần mỗi vòng), không chốt sau mỗi ví dụ.

## 7. Mở held-out và "đã bị xem"

"Mở ví dụ held-out" cho bạn xem nội dung, và ví dụ đó **chuyển sang dev**. Mọi phiên bản chứa nó ghi "{count} ví dụ held-out đã bị
xem" (trong hộp phiên bản: "Đã bị xem"). Nghĩa: đề thi đã lộ. Trong các phiên bản cũ nó vẫn tính là held-out.

Khi nào mở: chỉ khi nghi ví dụ đó hỏng (ví dụ held-out trượt mãi mà bạn ngờ `forms` thiếu dạng). Đừng mở để "xem AI sai gì".

Dùng đi dùng lại một held-out để chọn phương án sẽ làm overfit chính nó
([Dwork et al., 2015](https://arxiv.org/abs/1506.02629)). Quy tắc thực hành (`ASSUMPTION`, suy từ nguyên lý đó, file nghiên cứu §2):
- Đã sửa prompt **vì** một ví dụ held-out cụ thể → ví dụ đó coi như dev; thêm một ví dụ held-out mới thay nó.
- Làm mới held-out khi: ≥ 2–3 ví dụ đã bị xem, hoặc sau khoảng 3 vòng chỉnh, hoặc khi bộ lớn lên 50+. Cách làm: nhập thêm các dòng
  `split: held_out` mới, rồi chốt phiên bản mới.

## 8. Thêm ví dụ từ đời thật

- Trang "Câu AI thật": câu có ít nhất một tiêu chí không đạt → "Đưa vào bộ ví dụ".
- Trang "Báo lỗi": báo lỗi đã xác nhận → "Đưa vào bộ ví dụ".
- Ví dụ thêm kiểu này luôn vào dev, ô "Các dạng được nhận" điền sẵn từ kho (cloze, meaning), bạn sửa được. Câu chạm từ riêng của người
  học thì không bao giờ được chép. Nội dung gốc quá 7 ngày thì app dựng lại đầu vào từ kho và báo "Nội dung gốc đã quá 7 ngày…".

Lấy ví dụ mới từ lỗi thật là cách làm được khuyên ([Anthropic, 01/2026](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents);
[evals FAQ](https://hamel.dev/blog/posts/evals-faq/)). Gom chúng lại, chốt cùng lúc ở vòng sau.
