# Improvement: AI eval và dashboard theo dõi AI (ghi 24/10/2026)

Trạng thái: **ghi chú, chưa brainstorm, chưa chốt**; mục C11 của [`IMPROVEMENT_IDEAS_2026-10-23.md`](IMPROVEMENT_IDEAS_2026-10-23.md). Khi làm thật, đi theo chuỗi `brainstorming` → design → decisions → plan như mọi Bước.
Mọi con số ngưỡng dưới đây là `ASSUMPTION` để có điểm bắt đầu thảo luận, không phải quyết định.

## 1. Hiện trạng (đọc code ở commit `255e2ee`, 24/10/2026)

Bộ eval của Bước 6 (design `docs/superpowers/specs/2026-10-20-buoc-6-ai-integration-design.md` §10, D18):

- Bảng `ai_eval_examples` (`apps/api/prisma/models/ai.prisma`): mỗi ví dụ có `operation`, `input`, `note` ("mong AI làm gì"). **Không có đáp án mong đợi.**
  Tối đa 100 ví dụ mỗi thao tác; dùng được cho cả 6 thao tác (`apps/api/src/ai/ai.types.ts`: `generate_cloze`, `lookup_word`, `translate_sentence`,
  `generate_meaning_question`, `generate_sentence_mcq`, `check_private_word`).
- `POST /v1/admin/ai/eval/runs` (`apps/api/src/ai/api/admin-ai-eval.controller.ts`) → job trong hàng đợi `ai-eval`, chạy ở worker
  (`apps/api/src/ai/eval/eval-job.ts`): mọi ví dụ qua model/prompt đã chọn (cả prompt nháp), tối đa 3 lời gọi cùng lúc.
- Mỗi lần chạy (`ai_eval_runs`) lưu: model, effort, prompt revision hoặc bản nháp, `valid_count` (số đầu ra **đúng khuôn**), thời gian trung bình, chi phí,
  và đầu ra từng ví dụ trong `items`. Giữ lâu dài để so model.
- Design ghi rõ: "Không có ngưỡng, không chặn gì; máy chỉ kiểm khuôn, thời gian, chi phí; người đọc đầu ra để xét câu tự nhiên, đúng level, dịch ổn."

Thiếu:

| # | Thiếu | Hệ quả |
|---|---|---|
| G1 | Không có đáp án / tiêu chí mong đợi trong ví dụ | Không tự chấm đúng–sai được, chỉ biết "đúng khuôn" |
| G2 | Không có bộ chấm (grader) nào ngoài kiểm khuôn | Đổi prompt hay model không biết tốt lên hay xấu đi, phải đọc tay |
| G3 | Không có màn admin cho eval | Chỉ gọi được qua API |
| G4 | Chưa từng chạy với provider thật (D19 Bước 6, D3 Bước 7) | Chất lượng câu AI và tỉ lệ bị luật loại chưa đo (design Bước 7 §20) |
| G5 | Không có vòng phản hồi từ thực tế về bộ ví dụ | Câu người học báo sai không tự thành ví dụ kiểm thử |

## 2. Các improvement đề xuất cho eval

Thứ tự là thứ tự gợi ý làm; mỗi mục độc lập đủ để thành một PR.

**E1 — Chạy thật lần đầu với key của chủ dự án** (đã nằm trong "Next" của `CLAUDE.md`). Viết 10–20 ví dụ cho mỗi thao tác Bước 7, chạy với 1–2 model, đọc tay
đầu ra. Đây là dữ liệu nền cho E2–E3; chưa cần sửa code.

**E2 — Thêm tiêu chí mong đợi vào ví dụ (golden set).** Thêm một trường kiểu `expected` (JSON, tuỳ thao tác) cạnh `input`. Gợi ý nội dung theo thao tác:

| Thao tác | Tiêu chí máy kiểm được | Tiêu chí cần người hoặc model chấm |
|---|---|---|
| `generate_cloze` | Đáp án = từ mục tiêu (hoặc dạng chia hợp lệ); đúng 1 chỗ trống; qua luật Practice | Câu tự nhiên; đúng level CEFR; ngữ cảnh chỉ ra một đáp án |
| `generate_meaning_question` | Đúng khuôn; đáp án đúng trỏ đúng nghĩa (sense) mục tiêu | Câu rõ nghĩa, không lộ đáp án |
| `generate_sentence_mcq` | Đúng **một** phương án đúng; các phương án nhiễu khác nhau | Phương án nhiễu hợp lý, không cũng đúng |
| `lookup_word` | Lemma, từ loại khớp nhãn | Nghĩa tiếng Việt đúng và tự nhiên |
| `translate_sentence` | — | Dịch đúng ý, tự nhiên |
| `check_private_word` | `verdict` khớp nhãn (`ok` / `not_recognized`) | — |

**E3 — Bộ chấm (grader) ba tầng**, chạy trong cùng job eval, lưu điểm vào `items` và tổng vào `ai_eval_runs`:
1. *Luật (rule)*: dùng lại chính luật Practice đang loại câu AI (`apps/api/src/practice/ai/ai-question-generator.service.ts`), cộng các tiêu chí máy kiểm ở bảng E2.
   Cho ra "tỉ lệ bị luật loại" ngay trong eval, trước khi tới người học.
2. *Model chấm (LLM-as-judge)*: một model **khác** model sinh câu chấm theo thang điểm cố định (ví dụ 1–5 cho "tự nhiên", "đúng level", "chỉ một đáp án").
   Research trong design Bước 7 §20: tự chấm trong cùng lời gọi yếu hơn lời gọi kiểm riêng, nên tách model và tách lời gọi. Tốn tiền, cần trần riêng.
3. *Người*: màn đọc nhanh, gắn nhãn đạt / không đạt + lý do; nhãn người dùng để kiểm lại độ tin của tầng 2.

**E4 — So sánh lần chạy và chặn hồi quy (regression gate).** Màn so 2 lần chạy cùng bộ ví dụ (model A vs B, prompt rev 3 vs 4): tỉ lệ đạt từng tiêu chí,
chi phí, thời gian, và danh sách ví dụ đổi kết quả. Khi đổi model hoặc lưu prompt mới: cảnh báo nếu tỉ lệ đạt giảm quá ngưỡng (`ASSUMPTION`: 5 điểm %).
Design Bước 6 hiện chốt "không chặn gì" (D18), nên chặn hay chỉ cảnh báo là một quyết định cần chủ dự án chốt lại.

**E5 — Màn admin cho eval**: soạn ví dụ, chạy, xem kết quả từng ví dụ, so lần chạy (E4). Gắn với đợt làm lại admin UI (ghi chú 15/10/2026).

**E6 — Vòng phản hồi từ thực tế (online → offline).** Câu bị người học báo lỗi và được nhân viên xác nhận (`practice_reports`), câu bị luật loại, và dạng
chia lạ (`practice_unknown_forms`) → nút "đưa vào bộ ví dụ" (kèm tiêu chí mong đợi). Lưu ý riêng tư: câu về **từ riêng** của người học không được tự chép
sang bộ ví dụ (design Bước 7 §20, D26).

## 3. Hướng phân tích để thiết kế dashboard theo dõi AI

### 3.1 Dashboard cần trả lời câu hỏi gì

Viết câu hỏi trước, chọn biểu đồ sau. Năm nhóm câu hỏi, theo thứ tự quan trọng khi mới ra mắt:

1. **AI có đang chạy không?** Tỉ lệ lời gọi lỗi, timeout, bị giới hạn tốc độ; có thao tác nào chưa chọn model (người học đang gặp 503).
2. **Câu AI có tốt không?** Tỉ lệ bị luật loại, tỉ lệ bị báo lỗi, tỉ lệ người học làm đúng, so với câu không AI.
3. **Người học có bị ảnh hưởng không?** Tỉ lệ đổi sang câu không AI, số lần phải chờ "đang chuẩn bị", phiên AI không mở được.
4. **Tốn bao nhiêu?** Chi phí theo ngày, thao tác, model; chi phí trên mỗi câu được lưu; chi phí trên mỗi người dùng Pro so với doanh thu.
5. **Hạn mức có hợp lý không?** Bao nhiêu ngày chạm trần hệ thống `ai_daily_cap`; người Pro dùng hết bao nhiêu % lượt; ai hết lượt sớm.

### 3.2 Chỉ số và nguồn dữ liệu đã có

| Nhóm | Chỉ số | Nguồn (đã có) | Ghi chú |
|---|---|---|---|
| Sức khoẻ | Tỉ lệ `outcome ≠ succeeded`, tách theo `outcome` (timeout, rate-limited, invalid-shape, truncated…) | `ai_calls.outcome` | Lọc `purpose = learner`, bỏ `test` / `eval` |
| Sức khoẻ | Thời gian p50 / p95 theo thao tác, model | `ai_calls.latency_ms` | |
| Sức khoẻ | Thao tác chưa sẵn sàng | `GET /v1/admin/ai/status` | Đã có endpoint |
| Chi phí | USD theo ngày / thao tác / model / purpose / outcome | `GET /v1/admin/ai/costs?group_by=…`, `ai_calls.cost_usd`, token | Đã có endpoint; `cost_known = false` phải hiện riêng |
| Chất lượng | Tỉ lệ bị luật loại lần đầu | Ước lượng: lời gọi có `operation_id` kết thúc `#2` / tổng lời gọi lần đầu | **Suy ra**, chưa kiểm bằng dữ liệu thật; xem G-D1 |
| Chất lượng | Tỉ lệ bị loại cả hai lần | `practice_ai_requests.failure = 'rejected'` | |
| Chất lượng | Báo lỗi trên 1.000 câu AI, theo lý do | `practice_reports` + `practice_questions.source = 'ai'` | Tách lý do hoàn lượt được / không |
| Chất lượng | Tỉ lệ hoàn lượt (báo lỗi được xác nhận) | `practice_reports.status` (`open` / `no_error` / `fixed`) | |
| Chất lượng | Tỉ lệ làm đúng, số gợi ý dùng, tỉ lệ bỏ qua: câu AI vs câu luật | `practice_session_items` join `practice_questions.source` | Quá dễ hoặc quá khó đều là tín hiệu |
| Chất lượng | Dạng chia lạ: số dạng mới, số lần bị loại | `practice_unknown_forms.rejected_count` | |
| Chất lượng | Phân bố `verdict` của kiểm từ riêng | `practice_word_checks.verdict` | Nhiều `not_recognized` = prompt quá khắt khe hoặc người học nhập sai |
| Trải nghiệm | Lý do câu AI thất bại (`ai-failed`, `quota-exhausted`, `ai-unavailable`…) | `practice_ai_requests.state = 'failed'`, `failure` | |
| Hạn mức | Lượt AI dùng theo gói, theo chu kỳ | `usage_records` (Entitlements) | Cần đọc kỹ khi thiết kế |
| Eval | Tỉ lệ đạt theo lần chạy, model, prompt | `ai_eval_runs` (sau E2–E3) | |

### 3.3 Khoảng trống dữ liệu (cần quyết định trước khi vẽ)

- **G-D1 — Lần bị luật loại đầu tiên chỉ có trong log** (`ai_question_rejected`, `apps/api/src/practice/ai/ai-question-generator.service.ts` dòng 186),
  không có trong bảng. Ước lượng qua `#2` có thể lẫn với trường hợp khác (`ASSUMPTION`, chưa kiểm). Cần một cột hoặc một bảng đếm nếu muốn số chính xác.
- **G-D2 — Thời gian người học thật sự phải chờ** (từ lúc bấm tới lúc thấy câu) không được đo; `latency_ms` chỉ là thời gian một lời gọi provider.
- **G-D3 — Nội dung lời gọi chỉ giữ 7 ngày** (`ai_call_contents`): xem được *bao nhiêu* lỗi lâu dài, nhưng chỉ đọc được *câu nào* lỗi trong 7 ngày.
- **G-D4 — Tỉ lệ fallback trong phiên** (đổi sang câu không AI) không có bảng riêng; phải suy từ `practice_ai_requests` và câu `source = 'rule'` trong phiên
  có chọn dạng AI. Cần kiểm lại khi thiết kế.

### 3.4 Các quyết định thiết kế dashboard (để brainstorm)

- **Ai xem:** chỉ `admin` (`settings.manage`, giống mọi API AI hiện có), hay `editor` xem phần chất lượng.
- **Tính số thế nào:** truy vấn thẳng bảng gốc mỗi lần mở (đơn giản, chậm khi nhiều dữ liệu) hay một job hằng ngày ghi bảng tổng hợp (nhanh, thêm việc
  bảo trì). Với lượng người dùng lúc ra mắt, truy vấn thẳng có lẽ đủ (`ASSUMPTION`).
- **Cảnh báo:** chỉ hiện trên dashboard hay gửi email khi vượt ngưỡng. Ví dụ ngưỡng để bàn: lỗi > 5% trong 1 giờ, bị luật loại > 15% trong ngày,
  chi phí ngày > 80% trần, chạm `ai_daily_cap` (`ASSUMPTION` cả bốn).
- **Đặt ở đâu:** trang mới trong `apps/admin` (gắn với đợt làm lại admin UI) hay công cụ ngoài (Metabase, Grafana) đọc thẳng Postgres — nhanh hơn nhưng phải
  tính quyền truy cập DB và riêng tư.
- **Riêng tư:** dashboard chỉ hiện số tổng; màn chi tiết hiện nội dung câu thì tuân theo giới hạn 7 ngày và không hiện từ riêng ra ngoài người có quyền.
- **Mốc so sánh:** câu không AI (`source = 'rule'`) là nhóm đối chứng tự nhiên cho tỉ lệ làm đúng và tỉ lệ báo lỗi.

### 3.5 Bố cục gợi ý (để có cái mà bàn, chưa chốt)

1. Hàng đầu: 4 ô số — lỗi gọi AI 24 giờ, tỉ lệ bị luật loại hôm nay, chi phí hôm nay / trần, thao tác chưa sẵn sàng.
2. Biểu đồ đường theo ngày: chi phí, số lời gọi, tỉ lệ lỗi — chọn thao tác và model.
3. Bảng chất lượng theo thao tác: bị loại, báo lỗi / 1.000 câu, hoàn lượt, tỉ lệ làm đúng (AI vs không AI).
4. Danh sách việc cần xử lý: báo lỗi chưa xử lý, dạng chia lạ mới, lần chạy eval gần nhất và kết quả so với lần trước.

## 4. Câu hỏi mở cho chủ dự án

1. Eval có được phép **chặn** đổi model / prompt khi tỉ lệ đạt giảm (sửa D18 Bước 6), hay chỉ cảnh báo?
2. Có dùng model chấm (LLM-as-judge) không, và trần chi phí cho việc chấm là bao nhiêu?
3. Dashboard làm trong `apps/admin` hay dùng công cụ ngoài?
4. Làm trước hay sau khi ra mắt? Gợi ý tối thiểu trước ra mắt: E1 + nhóm câu hỏi 1, 4 ở mục 3.1 (đã gần như có sẵn endpoint).
