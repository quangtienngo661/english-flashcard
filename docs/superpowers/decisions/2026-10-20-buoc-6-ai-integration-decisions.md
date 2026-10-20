# Decisions — Bước 6: AI Integration (cổng gọi AI, OpenAI + Anthropic + bản giả; chỉ API)

Ngày: 19–20/10/2026. Đi kèm design doc [`../specs/2026-10-20-buoc-6-ai-integration-design.md`](../specs/2026-10-20-buoc-6-ai-integration-design.md). File
này gom mọi quyết định trong lúc brainstorm Bước 6, mỗi quyết định kèm các phương án **đã thật sự đưa ra trong chat**, trade-off và lựa chọn. Design doc
mô tả *cách làm*; file này trả lời *tại sao chọn vậy và đã bỏ gì*. Nguồn: nhật ký từng vòng hỏi đáp
[`../reviews/2026-10-19-buoc-6-brainstorm-log.md`](../reviews/2026-10-19-buoc-6-brainstorm-log.md).

> **Trạng thái 20/10/2026:** các câu hỏi đã chốt hết; ba phần design trình trong chat đã duyệt; chủ dự án duyệt bản viết ("Mình duyệt design Bước 6")
> rồi nhờ một agent review độc lập trước ([`../reviews/2026-10-20-buoc-6-design-review.md`](../reviews/2026-10-20-buoc-6-design-review.md)). Hai câu
> sau review đã chốt (D24, D25); phần kỹ thuật sửa theo review ghi ở mục "Đề xuất kỹ thuật sau review" (design §0b). Chủ dự án duyệt bản đã sửa:
> "Mình duyệt bản design Bước 6 đã sửa" (20/10/2026). **Đã chốt toàn bộ.**

**Nhãn:** ✅ = phương án được chọn. **Ai chốt:** "Chủ dự án" = chọn trong chat; "Đề xuất của Claude" = Claude đề xuất sau khi chủ dự án trả lời, hoặc
khi chủ dự án để trống một phần, chủ dự án đồng ý; "Duyệt cùng design" = Claude đề xuất khi trình một phần design, chủ dự án duyệt cả phần.

**Cách hỏi ở Bước 6:** luật "chủ dự án trả lời trước, Claude đề xuất sau" (CLAUDE.md), chủ dự án giữ cho Bước 6 (D1). Câu 1–5 hỏi bằng hộp chọn trong
chat; từ câu 6, theo yêu cầu của chủ dự án, câu hỏi viết thành danh sách trong chat để chủ dự án comment ("bạn đừng đưa câu hỏi qua dạng chọn, cứ liệt
kê ở phần chat rồi mình comment vào phần trả lời, hỏi như bước 4 bước 5 ấy"). Câu cần số liệu có research riêng trong `docs/preparation/` (OpenAI API;
cách viết prompt theo nhà cung cấp và model); research chỉ nêu dữ kiện, không chọn.

## Tóm tắt

| # | Quyết định | Phương án chọn | Ai chốt |
|---|---|---|---|
| D1 | Cách làm việc | Giữ như Bước 4–5: chủ dự án trả lời trước, không có phần lõi tự viết, chỉ review | Chủ dự án |
| D2 | Phạm vi | Cổng + bản giả + nối thật một nhà cung cấp (OpenAI), gọi thật ở máy local | Chủ dự án |
| D3 | Ba thao tác | Bước 6 làm đủ cả 3 (dữ liệu vào, prompt, khuôn) | Chủ dự án |
| D4 | Chờ và thử lại | 10 giây mỗi lần gọi; thử lại nhanh một lần với lỗi tức thì, trong 10 giây | Chủ dự án (thử lại nhanh: đề xuất của Claude) |
| D5 | Quỹ thời gian khi viết lại câu | Mỗi lần gọi 10 giây riêng | Chủ dự án |
| D6 | Chọn model | Admin tự chọn trong admin, không cố định | Chủ dự án (cách khác với các phương án đưa ra) |
| D7 | Một hay ba ô model | Mỗi thao tác một ô | Chủ dự án |
| D8 | Màn hình | Không làm ở Bước 6; chủ dự án tự làm sau | Chủ dự án |
| D9 | Chưa chọn model | Thao tác đó tắt | Chủ dự án |
| D10 | Trần tiền | Không thêm trong app | Chủ dự án |
| D11 | Giữ nội dung gửi đi / nhận về | Giữ N ngày, N = 7 (0–30) | Chủ dự án (N = 7: đề xuất của Claude) |
| D12 | Prompt sửa ở đâu | Trong admin, tùy biến được | Chủ dự án |
| D13 | Nhà cung cấp thứ hai | Nối cả OpenAI và Anthropic ở Bước 6 | Chủ dự án |
| D14 | Cấu trúc prompt | Một lời dặn chung cho hai bên; dữ liệu tách riêng dạng JSON | Đề xuất của Claude theo hướng chủ dự án ("thiết kế placeholder cho phù hợp") |
| D15 | Phiên bản prompt | Không có; chỉ lưu và sửa; lịch sử tự ghi | Chủ dự án (đề xuất của chủ dự án; lịch sử tự ghi: đề xuất của Claude) |
| D16 | Một bên sập | Không tự chuyển; admin đổi tay | Chủ dự án |
| D17 | Lời gọi cùng lúc | Cài đặt admin, mặc định 50 (1–500); đầy thì chờ tới lượt trong 10 giây | Chủ dự án (con số: đề xuất của Claude) |
| D18 | Bộ ví dụ đánh giá | Chỉ là nút, không bắt buộc; chủ dự án tự soạn; làm ở Bước 6 | Chủ dự án (làm ở Bước 6: đề xuất của Claude) |
| D19 | "Xong khi" | Như Bước 4–5, smoke với bản giả, không gọi thật | Chủ dự án |
| D20 | Ai implement | Như Bước 4–5: các phiên song song, một phiên điều phối | Chủ dự án |
| D21 | Danh sách model | Admin gõ mã model; model không tồn tại thì báo lỗi như bình thường | Chủ dự án (sửa đề xuất của Claude) |
| D22 | Nhà cung cấp, effort, danh sách lưu | Dropdown nhà cung cấp; effort theo cách của từng bên (Anthropic đọc từ API); danh sách model lưu, xóa được, đổi không gõ lại | Chủ dự án (sau research của Claude) |
| D23 | Chống gọi trùng | Lưu kết quả mỗi mã thao tác 24 giờ | Chủ dự án |
| D24 | Lời gọi lỗi vẫn tốn tiền (sau review, Q1) | Cổng đếm mọi lời gọi nhà cung cấp trong ngày; vượt con số admin đặt thì AI của người học tạm tắt tới 0 giờ | Chủ dự án (con số 3.000: đề xuất của Claude) |
| D25 | Số token tối đa (sau review, Q2) | Ô riêng cho từng thao tác; mặc định như cũ; để trống = không giới hạn | Chủ dự án |

## D1 — Cách làm việc

Bối cảnh: luật giữ ở Bước 4 (D27) và Bước 5 (D1); Bước 6 có một phần lõi rõ (luật chờ và thử lại), ví dụ "Lan bấm Tạo câu, AI im lặng 20 giây".

| Phương án | Trade-off |
|---|---|
| ✅ (a) Giữ như Bước 4–5: chủ dự án trả lời trước, Claude đề xuất sau; không có phần lõi tự viết, chỉ review, duyệt hành vi qua bảng ví dụ | Chủ dự án hiểu hệ thống qua câu hỏi và mô phỏng; không tốn thời gian viết code |
| (b) Giữ cách hỏi và thêm một phần lõi chủ dự án tự viết (ví dụ luật chờ và thử lại) | Nắm sâu một phần; chậm hơn |
| (c) Bỏ cách hỏi, Claude đề xuất ngay | Nhanh hơn; dễ chỉ duyệt mà không tự nghĩ trước |

Claude đồng ý: luật chờ và thử lại có khung sẵn (AR3); duyệt qua bảng ví dụ và mô phỏng.

## D2 — Phạm vi: có gọi AI thật không

Bối cảnh: HANDOFF ghi "cổng `AiProvider` (bản giả trước), sổ chi phí"; người học chưa dùng AI trước Bước 7, Deploy dời tới cuối nên gọi thật chỉ ở máy chủ
dự án; gọi thật cần key và tốn ít tiền; điều khoản dữ liệu (F30) chỉ bắt buộc trước khi bật cho người thật; trần tiền cần giá thật; prompt chỉ chỉnh được khi
thấy AI thật trả lời.

| Phương án | Trade-off |
|---|---|
| (a) Chỉ cổng + bản giả, chưa chọn nhà cung cấp | Ít việc, không tốn tiền; chưa biết giá thật, chưa thử prompt; Bước 7 phải chọn và viết bộ nối |
| ✅ (b) Cổng + bản giả + nối thật một nhà cung cấp, gọi thật ở máy local bằng key của chủ dự án | Đo được giá và độ trễ thật; nhiều việc hơn, tốn ít tiền test, phải chọn nhà cung cấp sớm |
| (c) Cổng + bản giả, chọn nhà cung cấp và model trên giấy; bộ nối thật ở Bước 7 | Giá là ước tính, chưa đo |

Chủ dự án: "nhà cung cấp là gpt api + b". Claude đồng ý; research OpenAI chạy nền (không chọn model); test và CI dùng bản giả; chủ dự án tự tạo tài khoản và nạp
tiền. Sau đó D13 thêm Anthropic.

## D3 — Ba thao tác làm ở Bước 6 hay Bước 7

Bối cảnh: thao tác = gửi gì + prompt + khuôn; Bước 7 còn mở nhiều câu đụng khuôn (câu người học đã lưu hay AI tự viết; "câu chứa từ rồi chọn"; kiểm đáp án
nhiễu; tránh từ đồng nghĩa).

| Phương án | Trade-off |
|---|---|
| ✅ (a) Bước 6 làm đủ cả 3, chạy thật; Bước 7 chỉ gọi | Đo được giá của bài thật; có thể phải sửa khi Bước 7 chốt dạng bài |
| (b) Cổng chung + 1 thao tác mẫu; Bước 7 thêm các thao tác bài tập | Ít sửa lại; giá đo được chỉ của thao tác mẫu |
| (c) Cổng + chốt dữ liệu vào và khuôn của cả 3; prompt ở Bước 7 | Khuôn vẫn có thể phải sửa; giá thật chỉ đo được khi có prompt |

Claude đồng ý, thêm: mỗi thao tác mang số phiên bản khuôn; `generate_cloze` bản 1 = AI tự viết câu; Bước 7 cần việc mới thì cắm thêm thao tác, không sửa cổng.
(Số phiên bản **prompt** về sau bỏ theo D15; phiên bản **khuôn** `schema_version` giữ.)

## D4 — Chờ và thử lại

Bối cảnh: ba con số (chờ mỗi lần gọi; số lần thử lại; tổng chờ của cả lần bấm). Mô phỏng bấm được 3 núm × 7 tình huống, số mặc định của spec ghi rõ không phải
đề xuất. Chủ dự án nói chưa hiểu mô phỏng → Claude giải thích từng bước, kèm bảng tính sẵn 7 tình huống × 3 bộ số; chỉ ra (b) không kịp thử lại khi AI im lặng
(15 + 1 + 15 = 31 > 30 giây) nếu giữ luật "chỉ thử lại khi còn đủ một lần gọi trọn".

**Vòng 1:**

| Phương án | Trade-off |
|---|---|
| ✅ (a) Ngắn: 10 giây, không thử lại | Nhanh, ít tốn; báo "chưa tạo được" cả khi AI chỉ chập chờn một lần |
| (b) Vừa: 15 giây, thử lại 1, tổng 30 giây | Thử lại khi quá tải hoặc sai khuôn; không kịp thử lại khi AI im lặng |
| (c) Dài: 20 giây, thử lại 1, tổng 45 giây (spec) | Ít báo lỗi; Lan có thể chờ gần một phút |

**Vòng 2** (Claude đề xuất sau khi chủ dự án chọn (a)): lỗi xảy ra gần như ngay (mất kết nối, 5xx sau 0,3 giây, 429 "chờ 1 giây") thì thử lại một lần, chỉ khi
vẫn còn trong 10 giây; AI im lặng trọn 10 giây thì không.

| Phương án | Trade-off |
|---|---|
| Giữ (a) nguyên | Đơn giản nhất; lỗi tức thì cũng báo ngay |
| ✅ (a) + thử lại nhanh trong 10 giây | Lan không chờ quá 10 giây; tốn thêm tối đa một lần gọi ở lỗi tức thì |

Chi tiết (duyệt cùng design phần 2b): "tức thì" = trả về trong 2 giây; còn ≥ 2 giây mới thử; chờ theo `retry-after` hoặc 0,25–0,75 giây; sai khuôn và im lặng
không thử lại. Tắt tự gọi lại của SDK (`maxRetries: 0`); 10 giây là cài đặt.

## D5 — Quỹ thời gian khi Bước 7 nhờ AI viết lại câu

Bối cảnh: ví dụ "deploy": AI trả câu sau 6 giây, Practice thấy đáp án "launch" sai, Bước 7 nhờ viết lại (vẫn 1 lượt, D11 Bước 5); ít gặp.

| Phương án | Trade-off |
|---|---|
| ✅ (i) Mỗi lần gọi 10 giây riêng | Lần viết lại đủ thời gian; xấu nhất ~20 giây |
| (ii) Cả lần bấm 10 giây | Không bao giờ quá 10 giây; viết lại hay không kịp |
| (iii) Cả lần bấm một quỹ chung lớn hơn 10 giây | Cân giữa hai cách; thêm một con số |

Claude đồng ý; cổng vẫn nhận "thời gian còn lại" bên gọi truyền xuống.

## D6 — Chọn model GPT nào

Bối cảnh (research, giá đã tự kiểm): một lượt ≈ 600 token vào + 500 ra; bảng 6 model (~6đ tới ~162đ mỗi lượt); model đời mới có reasoning tính tiền như output;
không có điểm tiếng Việt chính thức; nhiều model rẻ có ngày ngừng chạy.

| Phương án | Trade-off |
|---|---|
| (a) Chọn một model ngay cho cả 3 thao tác | Đơn giản; đổi phải sửa |
| (b) Mỗi thao tác một model | Linh hoạt theo việc |
| (c) Chưa chốt: chạy bộ ví dụ với 2–3 model rồi chọn | Chọn theo số đo; chờ đo |
| ✅ Cách khác — chủ dự án: "model thì mình sẽ tự chọn trong admin, nên đừng cố định một model" | Đổi model không cần sửa code |

Claude đồng ý; đề xuất kèm (danh sách cho phép trong code, effort là ô admin chọn, đổi có hiệu lực ở lần gọi kế tiếp, cảnh báo ngày ngừng, nhà cung cấp và key ở
`.env`, quyền `settings.manage`) — phần "danh sách trong code" về sau bị thay bởi D21, D22.

## D7, D8, D9 — Model trong admin: số ô, màn hình, khi chưa chọn

| Câu | Phương án | Chủ dự án |
|---|---|---|
| 6.1 Một ô hay ba ô | (a) một model chung cho 3 thao tác · ✅ (b) mỗi thao tác một ô | (b) "cái này đi" |
| 6.2 Màn hình lúc nào | (a) Bước 6 làm màn hình trong `apps/admin` · ✅ (b) chỉ API | "màn hình vẫn chưa làm trong bước này, mình sẽ tự làm sau" |
| 6.3 DB mới chưa chọn model | ✅ (a) AI tắt tới khi admin chọn, Lan thấy "AI tạm thời chưa dùng được", không trừ lượt · (b) code có model mặc định | (a) |

Claude thêm: API đọc danh sách model để màn hình sau này có dữ liệu; chưa chọn model chỉ tắt riêng thao tác đó; `isReady` để Bước 7 kiểm trước khi giữ lượt; bản
giả cũng theo luật này.

## D23 — Chống gọi trùng (câu 7)

Bối cảnh: (1) bấm hai lần nhanh — Bước 4 đã khóa phiên; (2) lỗi tạm — không có kết quả để giữ; (3) AI trả xong, máy chủ sập trước khi lưu — Bước 5 không trừ lượt
hai lần; câu hỏi là có gọi nhà cung cấp lần hai không.

| Phương án | Trade-off |
|---|---|
| ✅ (a) Lưu kết quả mỗi lần gọi 24 giờ theo mã thao tác; gọi lại thì trả câu đã có | Không tốn lần hai; thêm bảng và việc dọn; giữ nội dung AI trả 24 giờ |
| (b) Không lưu gì; ca sập hiếm thì tốn thêm một lần (~8đ) | Đơn giản nhất |
| (c) Chỉ ghi "đang gọi" để chặn hai lời gọi song song, không giữ kết quả | Ca sập vẫn gọi lại |

Claude đồng ý; khác spec AR5 một điểm: lời gọi trùng khi lần đầu còn chạy trả ngay "đang xử lý" thay vì chờ. (Đánh số D23 vì bổ sung khi rà bản viết; về thời
gian, quyết định này có trước D10.)

## D10 — Trần chi bằng tiền (câu 8)

Bối cảnh: sổ chi phí là ước tính (token × giá); Bước 5 có trần **lượt** 1.000/ngày; model chênh giá 20 lần nên cùng 1.000 lượt ≈ 8.000đ hay ≈ 162.000đ/ngày;
OpenAI có giới hạn chi tháng cho project nhưng "not instantaneous". Chủ dự án hỏi "câu 8 bạn đang hỏi về vấn đề gì" → viết lại bằng lời thường ("phanh tự
động chặn AI khi tiền vượt số đặt trước"); hỏi "cái này là phanh theo tài khoản?" → không, cho cả app (bảng ba lớp phanh).

| Phương án | Trade-off |
|---|---|
| ✅ (a) Không thêm trong app; trần lượt Bước 5 + giới hạn chi tháng trên trang nhà cung cấp | Không thêm việc; phanh tháng chặn chậm, có thể lố |
| (b) Trần tiền mỗi ngày trong app, chạm thì AI tắt tới 0 giờ, có email cảnh báo | Chặn nhanh; thêm việc |
| (c) Như (b) theo tháng | Như trên, theo tháng |
| (d) Không chặn, chỉ email khi chi trong ngày vượt một số | Biết sớm; không chặn |

Claude đồng ý; thêm (không chặn gì): giá ước tính mỗi lượt khi xem model, API báo cáo chi phí; việc chủ dự án tự làm: đặt giới hạn chi tháng, tắt hoặc giới hạn tự nạp.

## D11 — Giữ nội dung gửi đi và nhận về (câu 8.1)

| Phương án | Trade-off |
|---|---|
| (i) Không giữ, chỉ số liệu | Riêng tư hơn; khó tra vì sao câu sai |
| ✅ (ii) Giữ N ngày rồi xóa | Dễ tra lỗi; trong N ngày giữ từ riêng và câu người học |

Chủ dự án chọn (ii), không ghi N → Claude đề xuất N = 7 (cài đặt 0–30), chỉ `admin` xem, không vào log, xóa theo tài khoản, gửi OpenAI `store: false`; chủ dự án
"ok".

## D12 — Prompt sửa ở đâu (câu 9)

| Phương án | Trade-off |
|---|---|
| (a) Prompt trong code, sửa bằng PR (review, CI, chạy bộ ví dụ trước khi merge); admin chỉ chọn bản đang dùng | An toàn; chậm, cần PR |
| (b) Sửa thẳng trong admin, mỗi lần lưu là bản mới | Nhanh; sai một chữ ảnh hưởng ngay, không ai review |
| (c) Khuôn và câu chặn chèn lệnh trong code, câu hướng dẫn bằng chữ sửa trong admin | Cân giữa hai |
| ✅ Chủ dự án: "prompt nằm trong giao diện admin có thể tùy biến để dễ quản lý, coi cho mình cách prompt của từng model của từng provider: openAI và Anthropic" | Gần (b)/(c) |

Claude: chạy research cách viết prompt; đề xuất an toàn (admin sửa chữ hướng dẫn; code giữ khuôn và cách bọc dữ liệu; lưu ≠ bật; chạy thử; kiểm khi lưu; chỉ
`admin`; lịch sử) — phần "lưu ≠ bật" về sau bị thay bởi D15. Chủ dự án nhờ mô phỏng → mô phỏng bấm được trang prompt (bản 1).

## D13 — Có thêm Anthropic không (câu 9.1)

| Phương án | Trade-off |
|---|---|
| (a) Chỉ OpenAI, cổng chừa chỗ | Ít việc; một nhà cung cấp |
| ✅ (b) Nối cả OpenAI và Anthropic; admin chọn nhà cung cấp + model cho từng thao tác | Thêm một bộ nối, một tài khoản, chạy bộ ví dụ trên cả hai |
| (c) Chỉ đọc research, chưa quyết | — |

Chủ dự án: "cái này nhé". Claude đồng ý (cổng vốn chia mỗi nhà cung cấp một bộ nối).

## D14 — Mỗi thao tác mấy bản prompt, cấu trúc (câu 9.2)

| Phương án | Trade-off |
|---|---|
| (a) Một bản chung cho mọi nhà cung cấp và model (3 bản) | Ít bản; chất lượng có thể khác giữa hai bên |
| (b) Một bản cho mỗi nhà cung cấp (6 bản) | Theo cách mỗi bên khuyên; gấp đôi việc |
| (c) Một bản cho mỗi model | Sát nhất; đổi model phải viết prompt mới |
| (d) Bản chung + bản riêng cho model khi cần | Linh hoạt; phức tạp hơn |
| ✅ Chủ dự án: "thì research xem cấu trúc của 2 prompt như thế nào thì thiết kế placeholder cho phù hợp thôi" | — |

Claude (đọc research mục 9, 11): hai bên cùng có bốn phần (lời dặn, dữ liệu, khuôn, tham số); cả hai khuyên không chèn chữ không tin cậy vào lời dặn → **đổi đề xuất
cũ** (bỏ `{word}` trong lời dặn): dữ liệu luôn đi riêng dạng JSON ở phần `user`, lời dặn chỉ gọi tên ô; **một lời dặn chung** cho cả hai bên, code ráp vào chỗ
của từng bên; ô ví dụ mẫu tùy chọn. Chủ dự án không comment phần này khi trả lời tin đó → duyệt cùng đề xuất. (Ý "lời dặn cố định thì được giảm giá cache" Claude
nói trong chat được sửa lại ở design §7.6: lời dặn ngắn có thể không tới ngưỡng cache.)

## D15 — Phiên bản prompt

Bối cảnh: đề xuất của Claude ở D12 có "lưu khác bật" (mỗi lần lưu là phiên bản mới, chạy thử, bật, quay về).

| Phương án | Trade-off |
|---|---|
| Có phiên bản: lưu ≠ bật, chọn bản đang dùng, quay về bằng chọn bản cũ (đề xuất của Claude) | Quay về nhanh; thêm khái niệm "bản đang dùng" |
| ✅ Chủ dự án: "nếu thiết kế theo hướng này rồi đặt trường hợp mình không muốn dùng bản prompt đó nữa thì sao, mình đề xuất chỉ thực hiện thao tác lưu và chỉnh sửa, không dùng prompt version cho phần này" | Đơn giản: một prompt mỗi thao tác, lưu là có hiệu lực |

Claude đồng ý, khác một điểm: hệ thống tự ghi lịch sử mỗi lần lưu (chữ cũ, ai, lúc nào) và mỗi câu AI ghi "lần sửa thứ mấy"; giữ nút "chạy thử chữ đang sửa"
trước khi lưu. Chủ dự án: "lưu log hoạt động lại cũng được, để không bị miss nếu vô tình sửa sai". Mô phỏng trang prompt bản 2 khi chủ dự án nhờ "cho mình xem lại
thao tác của prompt"; API lưu (`expected_revision`, 409 khi xung đột) khi chủ dự án hỏi "ý mình là lúc nhập và lưu prompt".

## D16 — Một nhà cung cấp sập (câu 9.3)

Hỏi không kèm phương án: "khi OpenAI đang sập, có tự chuyển sang Anthropic không". Chủ dự án: "không, admin sẽ handle bằng tay". Claude đồng ý: admin đổi
nhà cung cấp / model của thao tác, có hiệu lực ở lần gọi kế tiếp; không circuit breaker (AR14); lời dặn chung nên đổi bên không phải viết lại.

## D17 — Giới hạn lời gọi cùng lúc (câu 10)

Bối cảnh: 8 người bấm cùng giây; spec mặc định 5; giới hạn nhà cung cấp cao hơn nhiều; trần 1.000 lượt/ngày không chặn dồn trong một giây.

| Phương án | Trade-off |
|---|---|
| ✅ (a) Chờ tới lượt trong 10 giây, hết thì "AI đang bận" | Ít báo bận; người chờ có thể đợi vài giây |
| (b) Báo bận ngay | Không chờ; báo bận nhiều hơn |
| (c) Không giới hạn phía mình | Đơn giản; không chặn được đợt dồn |

Chủ dự án hỏi "thông thường với quy mô lớn thì concurrency được setup ở đây là bao nhiêu" → Claude (dữ kiện): tính bằng định luật Little; Wordmet hiện ~1 cùng lúc;
quy mô lớn do giới hạn nhà cung cấp quyết (OpenAI Build ~90, Anthropic Start ~40, theo research). Chủ dự án: "phần giới hạn này có thể setup không, và vì mục tiêu
mình là có real user nên phải có quy mô concurrency cao" → Claude: cài đặt admin, mặc định 50 (1–500); rủi ro khóa chung của trần AI Bước 5. Chủ dự án: (a).

## D18 — Bộ ví dụ đánh giá (câu 11)

Chủ dự án: "mình chưa hiểu bối cảnh cũng như mục đích của câu này" → viết lại: "thử AI trước khi cho người học thật dùng", ví dụ thuê gia sư làm bài thử, bảng kết
quả mẫu.

| Câu | Phương án | Chủ dự án |
|---|---|---|
| 11.1 Dùng để làm gì | ✅ (a) chỉ là một nút, không bắt buộc · (b) bắt buộc một lần trước khi ra mắt · (c) bắt buộc mỗi lần đổi model hoặc sửa prompt | "Nếu có làm thì mình chọn phương án này" (a) |
| 11.2 Ai soạn | (i) Claude soạn, chủ dự án duyệt · ✅ (ii) chủ dự án tự soạn · (iii) nhờ người giỏi tiếng Anh | "mình tự soạn" |

Claude đề xuất làm luôn ở Bước 6 (dùng chung máy với nút chạy thử); Bước 6 chỉ kiểm khuôn; lệch AR13 (không cổng bắt buộc), ghi rủi ro. Chủ dự án duyệt cùng design
phần 3 (API bộ ví dụ).

## D19, D20 — "Xong khi" và ai implement (câu 12)

| Câu | Phương án | Chủ dự án |
|---|---|---|
| 12.1 "Xong khi" | ✅ (a) như Bước 4–5, smoke dùng bản giả · (b) (a) + một lần gọi thật mỗi thao tác trên mỗi bên · (c) (b) + chạy bộ ví dụ của chủ dự án trên cả hai | (a) |
| 12.2 Ai implement | ✅ (a) như Bước 4–5: các phiên song song, một phiên điều phối · (b) một phiên làm hết · (c) cách khác | (a) |

Claude ghi rủi ro: bộ nối thật chỉ kiểm bằng phản hồi mẫu; lần gọi thật đầu tiên khi chủ dự án bỏ key vào `.env`.

## D21 — Danh sách model gõ tay (design phần 2a, vòng 1)

| Phương án | Trade-off |
|---|---|
| Danh sách model cho phép nằm trong code (giá, effort hợp lệ, ngày ngừng), thêm model = PR nhỏ (đề xuất của Claude ở D6 và phần 2a) | Không gõ sai được; model mới phải chờ PR |
| ✅ Chủ dự án: "theo thời gian thì model sẽ càng ngày càng được nâng cấp lên, nên thay vì cố định danh sách thì để cho admin thêm model bằng tay bằng cách nhập text, nếu model không tồn tại khi gọi api thì cứ báo lỗi như bình thường" | Dùng model mới ngay; gõ sai chỉ lộ khi gọi |

Claude: admin thêm dòng model (nhà cung cấp, mã, effort, giá tùy chọn, ghi chú); gõ sai → nhà cung cấp báo lỗi → lỗi vĩnh viễn, tình trạng hiện lỗi gần nhất; mất
cảnh báo ngày ngừng tự động (sau đó có lại ở D22).

## D22 — Nhà cung cấp, effort, danh sách lưu (design phần 2a, vòng 2)

Chủ dự án: "2 provider có 2 cách triển khai effort khác nhau, bạn thử research chỗ này xem có thể điền effort với api không, nếu có thiết kế như sau: Mỗi
provider là một mục dropdown (hoặc checkbox etc. tùy bạn recommend) và mỗi mục sẽ có cách triển khai effort. Danh sách model thì sẽ được nhập và thêm bằng tay
vào danh sách đó có thể xóa được, và có thể đổi qua model khác mà không cần phải nhập tay lại". Hỏi thêm "là sao" về việc mất cảnh báo ngày ngừng.

Claude kiểm tài liệu API trong phiên: Anthropic `GET /v1/models/{id}` trả `capabilities.effort`, `capabilities.thinking.types`, `lifecycle`, `retires_at`;
OpenAI `GET /v1/models/{model}` chỉ trả `id`, `created`, `owned_by`, `shutdown_date`.

| Phần | Chốt |
|---|---|
| Chọn nhà cung cấp | Dropdown (Claude chọn vì mỗi lần một bên; chủ dự án để Claude chọn) |
| Thêm model | Gõ mã → hỏi API "xem một model" của bên đó; không có thì báo, không lưu; giá admin tự gõ |
| Danh sách | Lưu, xóa được (trừ khi đang dùng), đổi model bằng chọn, không gõ lại |
| Effort | Anthropic: chỉ các mức API nói model nhận + "tắt thinking" nếu được; OpenAI: danh sách trong tài liệu + "để OpenAI tự chọn", chọn sai thì bị từ chối lúc gọi |
| Cảnh báo ngày ngừng | Có lại: đọc lại thông tin model mỗi ngày, báo trước 30 ngày |

Chủ dự án "ok" (cùng JSON dữ liệu trả về và API lưu prompt).

## D24 — Lời gọi AI lỗi vẫn tốn tiền (sau review, Q1 ← R5)

Bối cảnh (review R5): AI trả câu sai khuôn, Lan thấy "chưa tạo được", được trả lượt, nhưng app vẫn trả tiền (~8đ model rẻ, ~160đ tầm giữa); trần 1.000 lượt/ngày
của Bước 5 không đếm lượt đã trả lại; một cấu hình sai làm mọi lời gọi lỗi thì tiền chỉ dừng ở giới hạn chi tháng của nhà cung cấp (chặn chậm). Ràng buộc: D10 không trần
tiền; `ai` không gọi Entitlements; không circuit breaker.

| Phương án | Trade-off |
|---|---|
| (a) Chấp nhận; trang tình trạng hiện số lời gọi lỗi và tiền trong ngày | Không thêm luật; admin phải tự theo dõi |
| ✅ (b) Cổng đếm mọi lời gọi nhà cung cấp trong ngày (thành công hay lỗi); vượt con số admin đặt thì AI của người học tạm tắt tới 0 giờ | Chặn được vòng lỗi tốn tiền; thêm một cài đặt |
| (c) Chỉ bật cờ cảnh báo khi số lời gọi lỗi vượt ngưỡng | Biết sớm; không chặn |

Chủ dự án: "hướng này". Claude đề xuất chi tiết: cài đặt `ai.daily_provider_calls_cap` mặc định 3.000 (≈ 3 × trần 1.000 lượt; trống = không giới hạn; 0 = chặn như công
tắc); đếm mọi `purpose`, chỉ chặn người học (theo chữ "AI của người học"); ngày giờ Việt Nam; `isReady` trả `daily-call-cap`; đếm không khóa nên có thể lố tối đa bằng số
lời gọi đang chạy (ghi rủi ro); trang tình trạng hiện số đã dùng / trần, số lời gọi lỗi và tiền.

## D25 — Số token tối đa mỗi lần gọi (sau review, Q2 ← R4)

Bối cảnh (review R4): số này giới hạn độ dài câu trả lời, gồm cả phần nghĩ thầm, và là trần tiền của một lời gọi; design cố định 1.200 / 1.200 / 800; ví dụ
`claude-haiku-5-5` effort `high` bị cắt ở 1.200 lần này qua lần khác và lần nào cũng tốn tiền; OpenAI khuyên chừa ≥ 25.000 token khi mới thử model có nghĩ thầm.

| Phương án | Trade-off |
|---|---|
| (a) Cố định trong code + lý do riêng "bị cắt vì hết token" | Đơn giản; không chỉnh được khi đổi effort |
| ✅ (b) Ô "số token tối đa" cho từng thao tác, cạnh model và effort; mặc định như cũ | Chỉnh theo model và effort; thêm một ô |
| (c) Code tự chọn theo effort bằng bảng cố định | Không phải chỉnh; bảng có thể sai với model mới |

Chủ dự án: (b), "để trống thì không giới hạn". Claude đồng ý; chi tiết: trống thì OpenAI không gửi `max_output_tokens`, Anthropic (bắt buộc `max_tokens`) gửi số tối đa của
model đọc lúc thêm; lý do riêng `truncated` vẫn thêm. Rủi ro ghi rõ: để trống thì lời gọi đắt nhất bằng số token tối đa của model (ví dụ ≈ 33.000đ với model tầng giữa ở
128.000 token ra); API hiện "lời gọi đắt nhất ≈ X đ".

## Đề xuất kỹ thuật sau review (design §0b)

Chủ dự án không trả lời riêng câu "có được sửa phần kỹ thuật như review đề xuất không" (chỉ trả lời Q1, Q2); Claude sửa và liệt kê từng chỗ ở design §0b để chủ dự án đọc lại
khi duyệt. Chọn (theo đề xuất của review, có chỉnh):
- R1: `in_progress` là trạng thái riêng, bên gọi không nhả lượt; mã thao tác cố định theo câu hỏi; Bước 7 đọc kết quả `confirm`. `input-mismatch` cũng không nhả lượt.
- R2: giành dòng `ai_operations` bằng `INSERT … ON CONFLICT DO NOTHING`; `deadline_at`, `attempt_id`; cập nhật / xóa có điều kiện; tra dòng trước khi kiểm dữ liệu. Thêm
  (khác review): chạy thử và bộ ví dụ không dùng `ai_operations`, nên `user_id` luôn có và index unique thường là đủ (bỏ được `NULLS NOT DISTINCT`, R13).
- R3: hai bảng quy lỗi theo từng nhà cung cấp; thêm loại `stopped`.
- R4: lý do riêng `truncated`; kiểm cặp "tắt thinking" + effort ≤ `high` với Anthropic; `between_tools` khi model không nhận `disabled`; từ chối model Anthropic không có
  `structured_outputs` (mã mới `model-not-supported`).
- R6: hàng đợi riêng `ai-eval`, `attempts: 1`, bản nháp và lựa chọn lưu trong dòng lần chạy, heartbeat, việc định kỳ cứu lần chạy kẹt.
- R7: chữ ký `pnpm ai:fake-call`, bản giả nhớ số lần gọi, giá 0 tự điền cho model giả, smoke lùi giờ bằng SQL + `pnpm maintenance:run`.
- R8: `describeModel` chờ tối đa 5 giây; mã model chỉ nhận `[A-Za-z0-9._:-]`; việc định kỳ chạy ở cả API và worker, giành dòng trước khi làm mới.
- R9–R17: các sửa nhỏ (pool 10, `current()`, `@Idempotent()`, `context_label` 2.000, văn bản thuần, thứ tự chuẩn hóa, hàng đợi giữ chỗ suốt lần thử lại, UUID hệ thống,
  thứ tự xóa khi xóa tài khoản, `operation_id` trong câu hỏi của Bước 7, ước tính chi phí trong API, đối chiếu sổ lượt ↔ sổ chi phí ghi "không làm", key rỗng = không có
  key, `ai` giữ bản sao hằng số Content).

## Đề xuất kỹ thuật được duyệt cùng design

**Chọn** (phần 1, 2a, 2b, 3 trình trong chat; chủ dự án: "ok" (phần 1, sau khi hỏi "bạn sẽ thiết kế chỗ này như thế nào"), "ok" (2a, sau hai vòng sửa), "ok
được, duyệt 2b" (sau khi xem dữ liệu mẫu và giải thích dọn dẹp), "ok" (phần 3)):
- Module `ai` theo mẫu cổng thanh toán Bước 5: ổ cắm `AiAdapter` + registry + bộ nối `openai`, `anthropic`, `fake`; bộ nối không thử lại, không log nội dung,
  không đụng DB; SDK chính thức với `maxRetries: 0`, `timeout` = thời gian còn lại, `signal` hủy.
- Bảng quy lỗi nhà cung cấp → tạm / vĩnh viễn / chưa dùng được; hết tiền hoặc chạm giới hạn chi tháng = "chưa dùng được".
- Khuôn chỉ dùng phần JSON Schema cả hai bên hiểu; độ dài và "đúng một ___" cổng kiểm sau; số khớp giới hạn Content.
- Không gửi định danh người dùng kể cả dạng băm; `store: false` với OpenAI; Privacy Policy trước ra mắt.
- Prompt ban đầu Claude viết trong plan, nạp bằng migration; lời dặn ≤ 8.000 ký tự, ≤ 10 ví dụ, ví dụ phải đúng khuôn; `expected_revision` chống ghi đè.
- 8 bảng (sau phần 3 thành 10, thêm `ai_operation_settings` + lịch sử); luật thử lại cụ thể; việc dọn mỗi giờ; dòng `running` bị bỏ kiểm ngay lúc gọi lại (10 + 20
  giây); API "tình trạng AI".
- Lựa chọn model + effort mỗi thao tác ở bảng riêng của AI thay vì Settings (tinh chỉnh ở phần 3); các con số khác ở nhóm cài đặt `ai`.
- 17 API admin (`settings.manage`); mã lỗi; chạy thử ngay ≤ 5 ví dụ, bộ ví dụ chạy ở worker; luồng Bước 7 (`isReady` → `reserve` → `run` → `confirm`/`release`)
  và ràng buộc không giữ transaction trong lúc chờ AI.
- Kiểm thử: unit theo bảng, `pnpm smoke:buoc-6` với bản giả, lệnh `pnpm ai:fake-call`.
- Chữ "effort" thay "mức nghĩ thầm" (chủ dự án: "cứ dịch chỗ này thành effort giúp mình").

**Thêm khi viết design** (Claude báo từng điểm khi gửi bản viết; chủ dự án duyệt cả bản): lỗi cấu hình (`model-rejected`, `auth-failed`) không lưu làm kết quả
cuối; công tắc AI chỉ chặn người học, chạy thử và bộ ví dụ vẫn chạy; số token ra tối đa 1.200 / 1.200 / 800; rule `ai.test` 20 lần/giờ, 100 ví dụ mỗi thao tác,
job tối đa 3 lời gọi cùng lúc; sửa ý giảm giá cache; hạ số ngày giữ không đổi hạn dòng cũ; "hôm nay" theo giờ Việt Nam; chạy thử khi không có ví dụ nào → 400.

**Bỏ (và vì sao):**
- Danh sách model cố định trong code: chủ dự án muốn tự gõ để dùng model mới (D21).
- Ba ô "mức nghĩ thầm" riêng ở Settings: gộp vào lựa chọn của thao tác, cách điền theo nhà cung cấp (D22).
- Phiên bản prompt, "lưu khác bật": chủ dự án chọn chỉ lưu và sửa (D15).
- Chèn `{word}`, `{level}` vào lời dặn: hai nhà cung cấp khuyên không đặt chữ không tin cậy trong lời dặn (D14).
- Trần tiền trong app (D10); tự chuyển nhà cung cấp (D16); cổng chất lượng bắt buộc (D18); lần gọi thật trong "Xong khi" (D19).

## Chỗ Claude đề xuất trước khi chủ dự án trả lời

- Trước câu 1: một đoạn "Claude hiểu Bước 6 như sau" (cổng làm gì, không làm gì, `ASSUMPTION` chỉ API) để chủ dự án sửa; chủ dự án không sửa.
- Câu 4 vòng 2, câu 6 (đề xuất kỹ thuật), câu 9 (lớp an toàn), câu 10 (con số 50): đều đưa ra **sau** câu trả lời của chủ dự án cho câu đó, đúng luật.
- N = 7 ở D11 và cách làm cấu trúc prompt ở D14: chủ dự án để trống phần đó, Claude đề xuất, chủ dự án đồng ý.
- Không câu nào có phương án đánh dấu "Recommended".
