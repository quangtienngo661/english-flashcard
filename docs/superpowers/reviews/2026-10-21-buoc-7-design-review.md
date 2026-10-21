# Bước 7 — Review độc lập design (21/10/2026)

- **Design được review:** [`../specs/2026-10-21-buoc-7-practice-ai-content-ai-design.md`](../specs/2026-10-21-buoc-7-practice-ai-content-ai-design.md) (bản nháp 21/10).
- **Đối chiếu với:** nhật ký hỏi đáp [`2026-10-21-buoc-7-qa-log.md`](2026-10-21-buoc-7-qa-log.md) (vòng 1–4); design Bước 4
  (`2026-10-18-buoc-4-practice-design.md` §6, §7.2, §10, §11, §15), Bước 5 (`2026-10-19-buoc-5-entitlements-design.md` §5, §7.1, §7.2, §18), Bước 6
  (`2026-10-20-buoc-6-ai-integration-design.md` §4.4, §5, §8.1, §8.2, §18), sửa Bước 0–3 (`2026-10-20-buoc-0-3-fixes-design.md` §6.1, D12); code facts
  [`BUOC_7_CODE_FACTS_2026-10-20.md`](../../preparation/BUOC_7_CODE_FACTS_2026-10-20.md) và
  [`BUOC_7_CODE_FACTS_ADDENDUM_2026-10-21.md`](../../preparation/BUOC_7_CODE_FACTS_ADDENDUM_2026-10-21.md); định nghĩa luật trong `docs/specs/*.md` (chỉ để biết
  mỗi mã luật nói gì, không review design theo spec).
- **Code:** `origin/dev` @ `985531bd3245d96a050658b081785dcd584cf170` (fetch 21/10/2026), đọc bằng `git show origin/dev:<path>`; base `apps/api/`. Mọi số dòng dưới
  đây là của commit này. Không build, không chạy gì.
- **Cách làm:** mỗi khẳng định trong design về code được đọc lại trên `origin/dev`; chỗ chưa kiểm được ghi `ASSUMPTION`.
- **Ngày:** 21/10/2026. Người review: Claude (phiên review độc lập, chỉ đọc; file này là file duy nhất được viết).

Ví dụ trong review dùng lại nhân vật của design: **Lan**, Pro, đang học `deploy`.

---

## Tóm tắt

| # | Mức | Mục design | Một dòng | Cần chủ dự án quyết? |
|---|---|---|---|---|
| R1 | **blocker** | 6.3, 6.5, 6.8, 12.1 | Chỗ câu đang chờ AI không được lưu: hai `next` cùng lúc tạo hai lần hỏi, vòng ≥ 2 bốc lại mỗi lần app hỏi lại, `prepare` lỗi thì `next` tự gọi AI lần nữa | Không (kỹ thuật) |
| R2 | major | 9.3, 7.7, B7E74, B7E75 | `refund` của Bước 5 không kiểm câu đó có bị trừ thật không: câu được miễn phí (B7E12, B7E33) vẫn được "trả lại" 1 lượt; B7E74, B7E75 ghi sai kết quả | Có (lượt của chu kỳ trước) |
| R3 | major | 6.5, B7E32, B7E40 | Chạy lại sau khi máy chủ chết dùng cùng mã nhưng dữ liệu gửi AI không được lưu, và hai dạng chọn bốc ngẫu nhiên → `input-mismatch` → yêu cầu kẹt `generating`, từ đó mất dạng AI | Không |
| R4 | major | 6.5 (F), 12.1, CR23 | Bước ghi câu (F) không kiểm yêu cầu còn `generating`: chạy lại song song ra hai câu giống nhau; xóa từ riêng lúc đang tạo câu để lại câu chứa từ đã xóa tới 6 tháng | Không |
| R5 | major | 6.1 bước 3–5 | `ai_planned` có thể lớn hơn số chỗ thật sự làm được câu AI → từ chối nhầm `ai-quota-insufficient`, màn ghi sai "dùng 5 lượt" | Không |
| R6 | major | 6.1, 6.5 (B, C) | Mở phiên không hỏi `ai.isReady` của thao tác; ba thao tác mới seed với `model_ref NULL` → phiên chỉ dạng AI mở được rồi mọi câu `ai_unavailable` | Không |
| R7 | major | 5, 7, 8, 9.2 | Chưa định nghĩa JSON `Prompt` / `AnswerKey` / `Hints` (nấc 3) cho dạng mới; `buildSnapshot` chỉ che từ riêng khi `prompt.kind === 'mcq'` → dạng mới có thể lộ từ riêng cho staff | Không |
| R8 | major | 11.2 | Chủ dự án chốt (câu 21a) Lan sửa cả "định nghĩa" trước khi lưu, nhưng `quick-add` không có ô định nghĩa; người học `vi` mất `definition_en` của AI | Có |
| R9 | minor | 6.3, 6.4 | `r` ("số câu AI đã giao") chưa định nghĩa đủ (lần hỏi `void`, câu tạo sẵn không được gắn); câu "vòng ≥ 2 chỉ khi số từ ít hơn số câu" chưa đúng | Không |
| R10 | minor | 6.1 bước 4–5 | Rải câu AI từ từ thứ 1 làm Lan luôn chờ ở câu đầu; nên ưu tiên đánh dấu từ đã có câu tạo sẵn | Không |
| R11 | minor | 2 (D8), 6.5, 20 | "Câu đã tạo không bao giờ mất lượt" không đúng ở ít nhất 5 trường hợp; dùng lại câu cũ không kiểm nhiễu (từ riêng đã xóa có thể hiện lại) | Không |
| R12 | minor | 11.1, B7E110 | Khe đã chấp nhận ở D12 (chết sau `confirm`, trước khi ghi kết quả) làm tra AI trừ 2 lượt; B7E110 ghi "không trừ hai lượt" là sai | Không |
| R13 | minor | 15, 12.3 | Thêm thao tác vào `INITIAL_PROMPTS` làm hỏng `initial-prompts.spec.ts`; migration bản prompt mới có thể đè prompt admin đã sửa; thiếu mã `OutputProblem` mới | Không |
| R14 | minor | 7.4, 15 | Ngôn ngữ của `other_meanings` chưa ghi (người học `en`, nghĩa sai từ từ riêng không có `gloss_vi`) | Không |
| R15 | minor | 7.2, 7.5 (PRC6) | Không kiểm câu AI có chứa sẵn từ đang hỏi ở chỗ khác (lộ đáp án) | Không |
| R16 | minor | 10 | `practice_unknown_forms` sẽ đầy từ đồng nghĩa (`release` cho `deploy`), không có nút bỏ qua, chưa có khóa unique | Không |
| R17 | minor | 9.1 seed | `graded_wrong` không trả lượt, trong khi mục 20 dùng nó làm đường sửa khi AI bỏ sót dạng đúng | Có |
| R18 | minor | 9.3 | `editor` tự xác nhận báo cáo của chính mình để tự trả lượt | Có |
| R19 | minor | 6.1 | `snapshot` chỉ có `cap_reached` (boolean), không có số giây chờ; trần = 0 bị coi là "chạm trần" | Không |
| R20 | minor | 6.4–6.6 | `prepare` lỗi không đặt `ai_stopped`; kiểm từ riêng (B) chạy trước `isReady` (C) nên "AI tắt" thành "AI lỗi" | Không |
| R21 | minor | 12.1, 9.3 | FK và khóa của bảng mới chưa ghi; báo cáo `refunded = null` bị job xóa sau 6 tháng; xóa từ riêng xóa luôn dấu vết trả lượt | Không |
| R22 | minor | 4, 11.2 | Nhãn "AI gợi ý" mất sau lần sửa đầu tiên; `WordSense` và `PracticeSense` chưa có các trường design cần | Không |
| R23 | minor | 0, 5 | Mục 0 thiếu ba chỗ đổi (mã thao tác của Bước 6 §4.4, luật `next` của Bước 4, thời điểm trừ lượt); bản dịch cho hai dạng chọn là suy rộng từ câu 23; vài số dòng cũ | Có (bản dịch) |

Ngoài bảng: mục "Đã kiểm, đúng" (những khẳng định của design đã đối chiếu code và thấy đúng), "Độ phủ edge case" (mỗi mã luật design dẫn, cộng 20 ca thiếu) và
"Có thể đơn giản hóa".

---

## R1 — blocker — Chỗ câu đang chờ AI không được lưu

**Mục:** 6.3, 6.5 (A, G), 6.8, 12.1.

**Vấn đề.** Ở Bước 4, `next` khóa dòng phiên suốt một transaction, nên hai lần gọi cùng lúc luôn xếp hàng: lần sau thấy lần hỏi đang chờ (`result = null`) và trả lại
đúng lần hỏi đó. Bước 7 cắt `next` thành ba đoạn và thả khóa trong lúc AI chạy, nhưng **không lưu lại quyết định "vị trí kế tiếp là từ X, dạng AI"**. Lần hỏi chỉ được
tạo ở G, sau khi AI xong. Trong khoảng 10–30 giây đó, mỗi lần gọi `next`/`current` đều tính lại kế hoạch từ đầu. Bốn hậu quả:

1. **Hai lần hỏi cho một câu.** Lan bấm Tiếp (lần N1). N1 tạo yêu cầu, thả khóa, gọi AI. Lan bấm lần nữa (N2) → thấy `generating` → `preparing`; app hỏi lại sau 2 giây.
   Khi câu đã ghi xong, lần hỏi lại thấy "câu AI chưa từng hiện" (bước A) và gắn nó vào một lần hỏi mới. Rồi N1 tới G và gắn **cùng câu đó** vào lần hỏi thứ hai. Kết quả:
   hoặc trùng `(session_id, position)` (`practice.prisma:79`, vị trí = `last.position + 1`, `sessions.service.ts:305`) → lỗi 500; hoặc hai lần hỏi đang chờ, Lan làm
   cùng một câu hai lần (`pending` = lần hỏi chưa có kết quả đầu tiên, `sessions.service.ts:245, 255-256`). Design không bắt G kiểm lại gì (6.5 G chỉ ghi "khóa phiên, tạo lần
   hỏi").
2. **Vòng ≥ 2 bốc lại mỗi lần gọi.** Thứ tự vòng ≥ 2 xáo lại mỗi lần gọi (`sessions.service.ts:276-283`), và xác suất `r ÷ q` cũng được tung lại. Hai tab: N1 chọn X (câu AI)
   và đang chờ AI; N2 xáo lại, chọn Y (không AI) và tạo lần hỏi ngay. N1 tới G: tạo lần hỏi thứ hai (hai lần hỏi chờ cùng lúc), hoặc nếu G có kiểm thì câu X thành câu
   "chưa từng hiện", **đã trừ 1 lượt** mà Lan không thấy trong phiên này.
3. **`prepare` lỗi thì `next` tự gọi AI lần nữa.** Khi `prepare` tạo câu cho từ #3 và AI lỗi, yêu cầu thành `failed`. Lần `next` sau đó, ở bước A: không có câu sẵn, không có
   yêu cầu đang chạy → tạo yêu cầu mới và **gọi AI ngay**, Lan chờ thêm tới 10 giây. Như vậy ngược với 6.6 ("câu đó đổi sang dạng không AI") và B7E31 ("Practice không tự thử
   lại").
4. **Phiên chỉ có dạng AI không phân biệt được "lần đầu" với [Thử lại].** API không lưu "câu này vừa lỗi", nên `next` sau `ai_unavailable` (app tải lại, hoặc Lan bấm Thử lại)
   đều gọi AI lại như nhau. App lỗi gọi `next` liên tục thì mỗi lần là một lần gọi AI mới (giới hạn 120/phút của `practice.answer`; mỗi lần có thể tốn 2 lời gọi nhà cung cấp).

Bước 6 §4.4 bước 0 đã tính đúng chỗ này: "tạo dòng câu-hỏi-chờ (item) → mã thao tác opId = id của dòng đó". Bước 7 chuyển mã sang `practice_ai_requests` nhưng không giữ
lại "dòng chờ" (và mục 0 không ghi việc đổi này, R23).

**Bằng chứng:** `sessions.service.ts:242-245` (tìm lần hỏi chờ), `:255-256`, `:276-283` (xáo mỗi lần gọi), `:303-310` (tạo lần hỏi ở cuối `advance`);
`practice.prisma:79` `@@unique([sessionId, position])`; design Bước 4 §6 API 3 ("Tự nhiên": trả lại lần hỏi chưa có kết quả); design Bước 6 §4.4 bước 0.

**Đề xuất.** Lưu "chỗ đang chờ" ở bước A, trong cùng transaction có khóa phiên. Hai cách (plan chọn một):
- (i) `practice_sessions.pending_ai_request_id` (cùng `round`, `sense_id`, `type` trên dòng yêu cầu). Mọi `next`/`current`/`prepare` đọc nó **trước** khi lập kế hoạch:
  `generating` → `preparing`; `ready` → gắn câu vào lần hỏi và xóa cờ; `failed` → áp 6.6 **đúng một lần** (đổi dạng hoặc `ai_unavailable`), ghi lại đã áp, xóa cờ. [Thử lại]
  là một API rõ ràng (hoặc `next` có body `retry: true`) chứ không phải mọi `next`.
- (ii) Như Bước 6 §4.4: tạo lần hỏi ngay ở bước A với `question_id` null + `ai_request_id`; lần hỏi đó là "lần hỏi chờ" của Bước 4, nên luật cũ (trả lại lần hỏi chờ)
  tự lo phần còn lại. Cần đổi `question_id` thành nullable và `itemView` / `answer` / `hint` từ chối lần hỏi chưa có câu.

Với cả hai cách: G là lệnh có điều kiện (`… WHERE pending_ai_request_id = :id` hoặc `WHERE question_id IS NULL`), không có thì không tạo gì. Ở vòng ≥ 2, quyết định (từ, dạng,
có AI không) được ghi cùng lúc với chỗ chờ, nên lần hỏi lại không tung lại xác suất. Thêm các ca M1–M3 ở mục "Độ phủ edge case".

---

## R2 — major — `refund` không biết câu có bị trừ thật hay không

**Mục:** 9.3, 7.7, B7E74, B7E75.

**Vấn đề.** Design viết "`refund` trả false khi lượt đó không còn trong chu kỳ hiện tại hoặc chưa từng bị trừ (Bước 5 §7.2, R21)". Code và design Bước 5 nói khác:
`refund` chỉ đếm cả **chu kỳ**. Nếu số dòng `use` đã xác nhận trong chu kỳ hiện tại trừ số `credit` > 0 thì nó ghi một `credit`. Nó **không** tìm dòng `use` của mã thao tác
đó. Hệ quả:
- **B7E75 sai:** câu giao miễn phí (`confirm` trả `released` do xác nhận muộn, B7E12; máy chủ chết trước `confirm`, B7E33; `confirm` `not-found`) vẫn được trả 1 lượt, miễn là
  trong chu kỳ Lan đã dùng ít nhất một lượt khác. Lan được câu miễn phí **và** thêm một lượt: đây là đường "giao miễn phí" ngoài ca đã chấp nhận B7E33.
- **B7E74 sai:** lượt bị trừ ở chu kỳ trước vẫn được trả vào chu kỳ này nếu chu kỳ này Lan đã dùng ≥ 1 lượt (R21 cố ý làm vậy: `credit` thuộc chu kỳ lúc trả).
- 7.7 ghi `ai_request_id` "lần viết lại ghi thêm `#2`", và báo cáo chụp `ai_operation_id` từ đó. Gọi `refund(…, 'X#2', …)` sẽ ghi `credit` với mã khác mã của dòng `use`
  (`X`). Trừ một lượt vẫn đúng (vì `refund` không đọc dòng `use`), nhưng việc đối chiếu sổ lượt với sổ chi phí theo `operation_id` (Bước 5 §18, Bước 6 §18) bị lệch.

**Bằng chứng:** `src/entitlements/usage/usage-ledger.service.ts:140-160` (credit đã có → true; không có anchor → false; `confirmed - credits <= 0` → false; còn lại ghi
`credit`); `usage.queries.ts:24-32` (đếm theo `confirmedAt` / `creditedAt` trong chu kỳ, không theo mã thao tác); design Bước 5 §7.2 ("Điều kiện (R21): số dòng `use` đã xác
nhận trong chu kỳ hiện tại − số `credit` trong chu kỳ > 0").

**Đề xuất.**
- Lưu trên **`practice_questions`** (không phải `practice_ai_requests`, vì bảng đó bị xóa sau 7 ngày) cột `ai_charged boolean`. Cột này là `true` chỉ khi `confirm` trả
  `confirmed`. `resolve` chỉ gọi `refund` khi `ai_charged = true`; còn lại `refunded = false` (B7E75 đúng nhờ Practice tự kiểm, không nhờ Bước 5).
- Tách hai mã: `ai_request_id` (mã gốc, mã của sổ lượt, dùng cho `refund`) và `ai_call_operation_id` (mã của lần gọi thật, có `#2`, để tra `ai_calls`).
- **Câu hỏi cho chủ dự án** (theo luật "chủ dự án trả lời trước"): lượt bị trừ ở chu kỳ trước, xác nhận lỗi ở chu kỳ này, có trả không? Bước 5 R21 hiện cho trả (vào chu kỳ
  này). Muốn "không" thì Practice phải lưu thời điểm `confirm` và hỏi Entitlements mốc chu kỳ (cần thêm một hàm đọc ở Bước 5). Dù chọn gì, sửa chữ của B7E74 cho khớp.
- Cân nhắc thêm (giảm ca B7E33): ở G, nếu `ai_charged` còn `false` thì gọi lại `confirm(opId)`. Luật xác nhận muộn của Bước 5 (R7) trừ lượt nếu còn lượt, không thì để
  miễn phí. Như vậy câu bị máy chủ chết giữa chừng vẫn thường được tính đúng.

---

## R3 — major — Chạy lại sau sự cố cần đúng dữ liệu cũ, mà dữ liệu không được lưu

**Mục:** 6.5 ("Máy chủ chết giữa chừng"), F (`input-mismatch`), B7E32, B7E40.

**Vấn đề.** Design: yêu cầu `generating` quá 2 phút → "lần gọi sau chạy lại với **cùng** mã thao tác". Cổng AI so dấu vân tay của `{operation, schema_version, data}`,
mảng giữ nguyên thứ tự. Khác dấu vân tay → `permanent_failure` / `input-mismatch`. Nhưng:
- `generate_sentence_mcq`: dạng đáp án "bốc ngẫu nhiên", ứng viên là "tối đa 6" trong nhóm (7.5); `generate_meaning_question`: nghĩa sai bước 3 là "nghĩa catalog ngẫu
  nhiên", thứ tự tùy lần bốc (7.4). Lần chạy lại bốc lại → dữ liệu khác → `input-mismatch` gần như chắc chắn.
- Kể cả `generate_cloze`: Lan sửa từ riêng, hoặc staff sửa nghĩa catalog, giữa lúc chết và lúc chạy lại → dữ liệu khác.
- F với `input-mismatch`: "không release; log (lỗi lập trình)", và **không đổi trạng thái yêu cầu**. Yêu cầu vẫn `generating`. Index unique một phần
  `(user_id, sense_id) WHERE state = 'generating'` chặn mọi yêu cầu mới cho (Lan, từ đó). Cứ mỗi 2 phút lần gọi sau lại chạy lại và lại `input-mismatch`, cho tới khi job xóa
  dòng sau 7 ngày. Trong 7 ngày đó từ đó không có câu AI. Lượt không bị trừ (giữ chỗ hết hạn), nên đây là lỗi kẹt, không phải lỗi tiền.
- Hai lần gọi cùng thấy "quá 2 phút" thì cùng chạy lại. Design không nói việc giành quyền chạy lại có phải một lệnh nguyên tử không.

**Bằng chứng:** `src/ai/runner/fingerprint.ts:6-17` (mảng giữ thứ tự), `run-rules.ts:37-44` (`input-mismatch` trước mọi thứ), design 6.5 F và 12.1.

**Đề xuất.**
- Ghi **đúng dữ liệu gửi AI** (`ai_input jsonb`) vào `practice_ai_requests` ở lần chạy đầu, trước `reserve`. Lần chạy lại dùng lại nó, không tính lại. Dòng bị xóa sau 7 ngày
  nên cột này không làm phình DB. Nội dung chỉ là nội dung học (AR7); ghi vào chính sách giữ dữ liệu nếu cần.
- `input-mismatch` → yêu cầu `failed` (lý do `input-mismatch`), áp 6.6, log; không bao giờ để `generating`.
- Giành quyền chạy lại bằng một lệnh: `UPDATE practice_ai_requests SET updated_at = now() WHERE id = :id AND state = 'generating' AND updated_at < now() - interval '2 minutes'`;
  0 dòng → `preparing`.
- Thêm ca M4 (mục "Độ phủ edge case").

---

## R4 — major — Bước ghi câu (F) không có điều kiện: câu trùng và rò rỉ từ riêng đã xóa

**Mục:** 6.5 F, 12.1 ("Xóa từ riêng"), 16.4 B7E83; luật CR23.

**Vấn đề.**
1. **Hai câu cho một yêu cầu.** Lần chạy lại (R3) có thể chạy song song với lần đầu "tưởng đã chết" (ví dụ máy chủ chậm chứ không chết). Cả hai tới F và cùng ghi
   `practice_questions` cho cùng một yêu cầu. Lượt chỉ trừ 1 (cùng mã), nhưng câu thứ hai là câu "chưa từng hiện", giống hệt câu đầu, và sẽ được đưa cho Lan ở lần sau. Như vậy
   ngược với câu 11 ("Pro luôn câu AI mới").
2. **Xóa từ riêng trong lúc đang tạo câu.** Cổng xóa của Practice chạy trong transaction của `deleteMyWord`. Nó khóa phiên và lần hỏi, rồi xóa báo cáo, lần hỏi, câu hỏi
   (`private-senses-cleanup.provider.ts:12-34`). Bước 7 thêm "xóa `practice_ai_requests`, `practice_word_checks`" nhưng không nói thứ tự hay khóa. Nếu F của một lần tạo câu
   đang chạy ghi câu **sau** khi cổng xóa xong, thì câu mới có chữ và nghĩa của từ riêng đã xóa. `practice_questions` không có FK sang Content (cột UUID thường), nên lệnh ghi
   vẫn thành công. Luật dọn mới còn **giữ** câu AI không có lần hỏi tới `history_months` (6 tháng). Từ Lan đã xóa nằm lại 6 tháng: vi phạm CR23 và quyết định "từ riêng chỉ
   chủ thấy, xóa là xóa".

**Bằng chứng:** `practice.prisma:30-48` (không FK sang Content); `private-senses-cleanup.provider.ts:30-33`; design 12.1 dòng "Job dọn dữ liệu" (giữ câu `source = 'ai'`
không có lần hỏi).

**Đề xuất.**
- F là một transaction: `SELECT … FROM practice_ai_requests WHERE id = :id AND state = 'generating' FOR UPDATE`. Không có dòng → không ghi câu, gọi `release`, kết thúc
  (log `ai_request_gone`). Có → ghi câu và đổi `state = 'ready'` trong cùng transaction.
- Cổng xóa từ riêng: khóa rồi xóa `practice_ai_requests` của các nghĩa đó **trước** khi xóa câu hỏi (sau bước khóa phiên, theo thứ tự khóa đã có). Nếu F đang giữ dòng
  thì cổng chờ F commit, và lệnh xóa câu hỏi chạy sau sẽ thấy câu F vừa ghi. Làm tương tự với `practice_word_checks`.
- Thêm ca M5, M6.

---

## R5 — major — `ai_planned` có thể lớn hơn số chỗ làm được câu AI

**Mục:** 6.1 bước 3–5, B7E2, B7E45.

**Vấn đề.** `ai_planned = ceil(count × số dạng AI ÷ số dạng)` được tính trước khi biết bao nhiêu từ làm được dạng AI. Ví dụ: Lan chọn "gõ từ + điền từ AI", 10 câu, nhóm
10 từ, chỉ 2 từ có nghĩa tiếng Việt (các từ còn lại là từ riêng của một người học `en`, hoặc từ chức năng). `start` giữ đủ 10 từ (gõ từ luôn làm được,
`sessions.service.ts:84-93`). Vòng 1 phủ cả 10 câu, nên cả phiên **tối đa 2** câu AI. Nhưng `ai_planned = 5`, `needed = 5`: Lan còn 3 lượt bị từ chối
`ai-quota-insufficient`, và màn hiện "Phiên này dùng 5 lượt AI". D7 hứa "số lượt cần = số câu AI của phiên" (con số chính xác). Công thức hiện tại chỉ là chặn trên.

**Bằng chứng:** vòng ≥ 2 chỉ có khi vòng 1 hết mà chưa đủ số câu (`sessions.service.ts:263-267, 313-316`); `kept` ≤ `count`.

**Đề xuất.** Tính sau khi đánh dấu: `ai_planned = min(ceil(count × aiTypes ÷ types), số từ đánh dấu + max(0, count − kept.length))`. Vị trí vòng ≥ 2 chỉ có khi
`kept.length < count` (cộng thêm các từ bị bỏ ở vòng 1; con số này không biết trước, nên lệch về phía ít, an toàn cho Lan). Sửa B7E46 theo công thức mới và thêm ví dụ ở trên
thành một ca B7E.

---

## R6 — major — Mở phiên không hỏi `ai.isReady`; ba thao tác mới mặc định chưa có model

**Mục:** 6.1 bước 2, 6.5 B–C, 12.3, 15.

**Vấn đề.** Bước 6 §4.4 bước 1 hỏi `ai.isReady(op)` trước khi giữ lượt. Bước 7 chỉ hỏi ở từng câu (C). Lúc mở phiên chỉ đọc `entitlements.snapshot` (công tắc AI, trần
lượt). Migration seed ba thao tác mới với `model_ref NULL` (như ba thao tác cũ), nên cho tới khi admin chọn model, `isReady` trả `model-not-set`. Khi đó phiên chỉ dạng AI vẫn
mở được, qua cả bước kiểm lượt, rồi **mọi câu** trả `ai_unavailable`. Còn `check_private_word` chưa có model thì mọi từ riêng thành "AI lỗi" (B7E99) và đổi dạng. Đây là trạng
thái thật ngay sau khi deploy Bước 7 (admin phải tự chọn model cho thao tác mới, Bước 6 D9). `provider-not-configured`, `daily-call-cap` cũng rơi vào đúng chỗ này.

**Bằng chứng:** `src/ai/runner/readiness.service.ts:26-37` (thứ tự: `ai-disabled` → `model-not-set` → `provider-not-configured` → `daily-call-cap`); `selection.ts:61-65`
(không có model → null); migration `20261020071131_ai/migration.sql:235` (seed `model_ref` NULL); code facts 6.7 bước 5.

**Đề xuất.** Ở 6.1 bước 2: với mỗi thao tác của dạng AI đã chọn (và `check_private_word` nếu có từ đánh dấu là từ riêng chưa kiểm), gọi `ai.isReady`; chưa sẵn sàng →
`503 ai-unavailable` kèm `reason` (và `retry_after_seconds` nếu có), chưa tạo phiên. Ở 6.5 đổi thứ tự: C (sẵn sàng của thao tác chính) chạy **trước** B. Thêm ca M7.
Script smoke phải chọn model giả cho ba thao tác mới trước khi chạy.

---

## R7 — major — Chưa có JSON của dạng mới; chỗ che từ riêng trong báo cáo có thể hở

**Mục:** 5, 7.2–7.5, 8 (gợi ý 3 nấc), 9.2 (bản sao báo cáo), 13 (API 5, 6).

**Vấn đề.** Design mô tả dạng mới bằng lời nhưng không có hình dạng dữ liệu. Code hiện tại chỉ biết bốn `Prompt.kind`, ba `AnswerKey.kind` và hai nấc gợi ý:
- `Hints` chỉ có `level1`, `level2`; `level2` chỉ cho `type_word` (`hints.ts:31-34`); API gợi ý nhận `level: 1 | 2` (`answers.service.ts:102`); `ItemView.hints_available` chỉ có
  hai nấc (`session-views.ts:15`); bản sao báo cáo chỉ chụp hai nấc (`snapshot.ts:34-37`).
- `buildSnapshot` chỉ che từ riêng trong lựa chọn khi `prompt.kind === 'mcq' && key.kind === 'mcq'` (`snapshot.ts:18-23`). Nếu `mcq_sentence` dùng một `kind` mới (ví dụ
  `'mcq_sentence'`) mà plan quên nhánh này, thì từ riêng của Lan nằm trong lựa chọn sẽ tới tay staff **không che**. Như vậy phá D36 mà design nói vẫn giữ (9.2). Nghĩa sai
  lấy từ từ riêng của Lan trong `meaning_in_sentence` phải che bằng `PRIVATE_MEANING_MASK`, không phải `PRIVATE_WORD_MASK`.
- Lịch sử (`history.service.ts:78-81`) dùng `correctOf`. Hàm đó chỉ lấy lựa chọn đúng khi `prompt.kind === 'mcq'` (`answers.service.ts:28-34`), còn lại trả nghĩa. Trang Lịch
  sử của dạng mới vì vậy chưa định nghĩa.

**Đề xuất.** Thêm một mục "Hình dạng dữ liệu" (Đề xuất, duyệt cùng design), mỗi dạng một dòng: `prompt` (câu, token in đậm, lựa chọn), `answer_key` (đáp án,
`correct_index`, `option_private`, `translation_vi`, `reveal`), `hints` (`level1..3`). Thêm luật: **mọi** `kind` có lựa chọn đều che theo `option_private`, và lựa chọn là
nghĩa thì dùng `PRIVATE_MEANING_MASK`. `translation_vi` chỉ nằm trong `answer_key` (PRC22). Lịch sử hiện câu, lựa chọn, đáp án, có bản dịch hay không (ca M14).

---

## R8 — major — Không lưu được định nghĩa của gợi ý AI (ngược câu 21a)

**Mục:** 11.2; D22; nhật ký hỏi đáp câu 21 (vòng 1: "21a có: Lan sửa mọi ô trước khi lưu (loại từ, từ gốc, nghĩa, định nghĩa, câu ví dụ)"; vòng 3: chốt "21a, 21b, 21c đều
có").

**Vấn đề.** `POST /v1/quick-add` `new_word` chỉ có `lemma`, `pos`, `meaning`, `level`, `topics`, `form_of` (`quick-add.controller.ts:17-29`). Từ riêng lưu **một** nghĩa
theo ngôn ngữ của người học: người học `vi` → `gloss_vi`, `definition_en = null` (`private-words.service.ts:55-58`). Design chỉ thêm `examples` và `ai_suggestion`. Vì vậy với
Lan (người học `vi`), `definition_en` AI trả về hiện trên màn nhưng không lưu được. Mục 11.2 lại viết "Nhờ đó từ riêng có gợi ý **định nghĩa** / câu": sai. Từ riêng của
người học `vi` vẫn không có nấc gợi ý "định nghĩa tiếng Anh" (mục 8 phải lùi nấc).

**Đề xuất (cần chủ dự án quyết):** hoặc thêm `new_word.definition_en` (0–300, tùy chọn; chỉ cho người học `vi`, vì nghĩa của người học `en` đã là định nghĩa) và `PATCH
/v1/my-words/{id}` nhận `definition_en`; hoặc ghi rõ ở 11.2 rằng định nghĩa không lưu và câu 21a chỉ còn bốn ô. Đề xuất của reviewer: thêm ô, vì chi phí nhỏ (một dòng
`sense_revision_texts` `en`/`definition`, cùng khuôn với catalog) và từ riêng có thêm nấc gợi ý.

---

## R9 — minor — `r` chưa định nghĩa đủ; câu về vòng ≥ 2 chưa đúng

**Mục:** 6.3, 6.4.

- "`r = ai_planned − số câu AI đã giao trong phiên`": chưa nói lần hỏi AI bị `void` (Lan bỏ từ khỏi việc học khi câu đang hiện; đã trừ lượt, lần hỏi không tính vào số câu)
  có tính là "đã giao" không, và câu tạo sẵn của phiên mà không được gắn vào lần hỏi nào (từ bị bỏ qua lúc tới lượt) có tính không. Không tính thì phiên tạo **hơn**
  `ai_planned` câu AI có trừ lượt. Đề xuất: `r = ai_planned − (lần hỏi có câu AI của phiên, kể cả `void`) − (yêu cầu `generating` / `ready` chưa gắn của phiên)`.
- "Vòng ≥ 2 (chỉ có khi số từ ít hơn số câu)": còn xảy ra khi từ ở vòng 1 bị bỏ qua (`skip`) hoặc lần hỏi bị `void` làm thiếu số câu (`sessions.service.ts:263-267, 313-316`).
  Sửa câu chữ; luật `r ÷ q` vẫn giữ được chặn trên.

## R10 — minor — Nên rải câu AI từ vị trí 2, và ưu tiên từ có câu tạo sẵn

**Mục:** 6.1 bước 4–5, B7E45.

- Đánh dấu từ thứ 1, 3, 5… làm câu đầu tiên luôn là câu AI. `prepare` chỉ chạy sau khi mở phiên, nên Lan **luôn** chờ ở câu 1 (vài giây, xấu nhất ~20 giây). Đánh dấu 2, 4, 6…
  cho `prepare` một câu không AI để che thời gian chờ, mà số câu AI không đổi.
- Đánh dấu "rải đều" không nhìn câu tạo sẵn. Từ có câu tạo sẵn mà không được đánh dấu thì câu đó không được dùng, còn Lan bị trừ lượt mới. Đề xuất: ưu tiên đánh dấu các từ có câu
  tạo sẵn dùng được, rồi mới rải đều phần còn lại; `needed` trừ **tối đa một** câu tạo sẵn cho mỗi từ đánh dấu (vòng 1 mỗi từ một câu).

## R11 — minor — "Câu đã tạo không bao giờ mất lượt" không đúng; dùng lại câu không kiểm nhiễu

**Mục:** 2 (D8), 6.5 ("Câu chưa từng hiện"), 6.7, 20.

- Câu tạo sẵn mất lượt khi: (a) nội dung đổi (design có ghi); (b) Lan không bao giờ chọn lại đúng dạng đó cho từ đó; (c) quá `history_months` (job xóa); (d) Lan xóa từ riêng;
  (e) nhóm bị xóa giữa phiên. Ca (e) chưa có ở đâu; (b), (c) chưa có ở mục 20. Sửa dòng D8 ở mục 2 thành "câu đã tạo được giữ và dùng ở lần sau từ đó được hỏi bằng dạng đó",
  rồi liệt kê đủ (a)–(e) ở mục 20. Bỏ từ khỏi việc học (không xóa) **không** xóa câu (không có cổng nào làm việc đó; chỉ có cổng xóa từ riêng,
  `quick-add.service.ts:91`), nên Lan thêm lại từ thì câu vẫn dùng được. Nhật ký câu 7 ghi ngược lại; nên ghi đúng theo code.
- Dùng lại chỉ khớp `sense_revision_id` / `content_key` **của từ đang hỏi**. Câu `mcq_sentence` / `meaning_in_sentence` tạo sẵn còn chứa chữ và nghĩa của nhiễu. Nếu nhiễu là từ
  riêng Lan đã xóa, cổng xóa giữ câu của từ khác (`private-senses-cleanup.provider.ts:32`), nên từ đã xóa **hiện lại** trong câu mới. Đề xuất: lúc dùng lại, kiểm mọi
  `distractor_sense_ids` còn thấy được; không thì bỏ câu (thêm ca M11).

## R12 — minor — Tra AI: khe của D12 làm trừ 2 lượt; B7E110 ghi sai

**Mục:** 11.1, B7E110.

Cơ chế D12 trên `dev` đúng như design nói (xem mục "Đã kiểm, đúng"). Nhưng chính design D12 đã chấp nhận một khe: máy chủ chết **sau** khi handler xong và **trước** khi ghi kết
quả → dòng còn `in_progress` → quá hạn → `409 idempotency-key-abandoned` "Start over with a new Idempotency-Key" (`idempotency.interceptor.ts:75-82`; design 0–3 §6.1). Với tra
AI: handler đã `confirm` (đã trừ), Lan không nhận được gợi ý, app làm theo lời server dùng key mới → mã thao tác mới (`lookup:` + băm của key mới) → trừ lượt thứ hai. B7E110
viết "mã thao tác cố định nên không trừ hai lượt": sai cho đúng ca này. Đề xuất: ghi thành rủi ro đã chấp nhận (hiếm, 1 lượt), sửa B7E110, thêm ca M9.

## R13 — minor — Seed prompt và test của Bước 6

**Mục:** 15, 12.3.

- `initial-prompts.spec.ts:9` chỉ tìm **một** thư mục migration có đuôi `_ai_initial_prompts`, rồi đòi chữ của **mọi** thao tác trong `AI_OPERATIONS` nằm trong file đó và đúng
  12 lần `$p$` (`:22-29`). Thêm thao tác vào `AI_OPERATIONS` / `INITIAL_PROMPTS` mà seed ở migration mới thì test này hỏng. Plan phải sửa test (quét mọi migration seed prompt,
  đếm theo số thao tác).
- "Một bản prompt mới cho `generate_cloze` (revision kế tiếp)" giao qua migration thì không được đè prompt admin đã sửa (`ai_prompts.revision` có thể đã > 1 trên DB của chủ dự
  án). Đề xuất: migration chỉ thêm revision mới và đổi `ai_prompts` khi revision hiện tại vẫn là 1 (chưa ai sửa); nếu đã sửa thì chỉ thêm vào lịch sử revision để admin tự chọn.
  Ghi rõ `INITIAL_PROMPTS.generate_cloze` giữ chữ cũ hay đổi, vì test so nó với migration cũ.
- `OutputProblem` là union cố định (`define-operation.ts:5`); luật mới ("`distractors` đúng 3 mục, khác nhau", "`verdict` ∈ {…}") cần mã mới (ví dụ `distractors`, `verdict`)
  hoặc dùng lại `shape`. Ghi ra để plan không phải tự chọn.

## R14 — minor — Ngôn ngữ của `other_meanings`

**Mục:** 7.4, 15.

`generate_meaning_question` nhận `meaning_vi` và `other_meanings` (3 mục) nhưng không nói `other_meanings` là tiếng gì. Người học `en` thấy lựa chọn là định nghĩa tiếng Anh
(6.2). Nghĩa sai lấy từ **từ riêng** của một người học `en` (bước 2 của D17) không có `gloss_vi`. Đề xuất: đặt tên `other_meanings_vi`, nghĩa sai phải có `gloss_vi` để
gửi (D16 "dạng AI cần nghĩa tiếng Việt"). Hiển thị theo `senseMeaning` như design đã ghi.

## R15 — minor — Câu AI có chứa sẵn từ đang hỏi (PRC6)

**Mục:** 7.2, 7.5.

PRC6 (luật design dẫn) đòi "câu điền đáp án đầu tiên vào chỗ trống chứa dạng đó **đúng một lần**". Luật kiểm của 7.2 và 7.5 chỉ kiểm đáp án là dạng hợp lệ, không kiểm phần còn
lại của câu có chứa từ đó không (ví dụ "Deploy is easy: we ___ the app daily." lộ đáp án). Đề xuất: chạy `maskExample` trên câu (bỏ chỗ trống) với lemma, biến thể, dạng chia;
khớp → loại câu, viết lại `#2`. Thêm ca M10. `meaning_in_sentence` đã có luật "đúng một lần" (7.4).

## R16 — minor — Danh sách "dạng chưa biết" sẽ đầy rác

**Mục:** 10, 7.2.

Mọi đáp án AI bị luật 7.2 loại đều được ghi. Như vậy gồm cả từ đồng nghĩa (`release`, `launch` cho `deploy`), cụm nhiều chữ (`has deployed`) và lỗi chính tả, chứ không chỉ dạng
chia thật. Bảng không tự xóa, staff chỉ có "nhận dạng này", không có "bỏ qua". Đề xuất: `DELETE /v1/admin/practice/unknown-forms/{id}` (bỏ qua, quyền `content.edit`); unique
`(lemma_key, form_key)` và tăng `rejected_count` bằng `ON CONFLICT`; cân nhắc chỉ ghi đáp án có cùng 3 chữ cái đầu với lemma hoặc biến thể (`ASSUMPTION`, để staff đỡ phải lọc).

## R17 — minor — `graded_wrong` không trả lượt (cần chủ dự án quyết)

**Mục:** 9.1 (seed), 20 (rủi ro "AI bỏ sót dạng đúng").

Mục 20 nói khi AI bỏ sót một dạng đúng thì Lan bị chấm "Chưa đúng", và đường sửa là báo `graded_wrong`. Nhưng seed đặt `graded_wrong` `refundable = false`, nên câu AI chấm sai do
AI vẫn không được trả lượt. Đó đúng là ca câu 25 muốn tránh ("Lan trả lượt cho câu xấu mà không bao giờ được trả lại"). Vì `refundable` chỉ có tác dụng với câu AI (9.1), đặt
`graded_wrong` = `true` không ảnh hưởng câu không AI. Để chủ dự án chọn (admin cũng sửa được sau).

## R18 — minor — `editor` tự trả lượt cho mình (cần chủ dự án quyết)

**Mục:** 9.3, D27.

Tài khoản staff cũng học được. `editor` báo câu AI của chính mình rồi tự `confirmed` → tự được trả lượt. Bước 5 đã chặn kiểu này với cấp gói ("editor chỉ cấp và thu hồi
cho người học thường", D8 Bước 5). Đề xuất: `resolve` một báo cáo có `user_id` = người xử lý → `403`; hoặc chỉ ghi và hiện rõ ở danh sách của `admin`. Hỏi chủ dự án.

## R19 — minor — Số giây chờ khi chạm trần

**Mục:** 6.1 bước 2, B7E6.

`snapshot` chỉ trả `ai_available.cap_reached` (boolean), không có số giây (`entitlements.service.ts:169`). Hàm tính "0 giờ giờ Việt Nam" (`nextAiDayStart`) không được export
(`entitlements/index.ts`). Thêm nữa: trần = 0 cho ra `cap_reached = true` (`0 >= 0`), trong khi Bước 5 coi trần = 0 như **tắt công tắc**, không có giờ chờ
(`ledger-rules.ts:31`). Đề xuất: thêm `retry_after_seconds` vào `ai_available` (thay đổi nhỏ, chỉ thêm, ở Bước 5; liệt kê ở mục 0), hoặc ghi rằng Practice tự tính; trần = 0 →
`ai-unavailable` không có giờ chờ.

## R20 — minor — `prepare` lỗi và thứ tự B/C

**Mục:** 6.4, 6.5, 6.6.

- `prepare` gặp `quota-exhausted` / `plan-required` / `ai-unavailable` chỉ đánh dấu yêu cầu `failed`. `ai_stopped` chỉ được đặt khi chính `next` gặp lỗi, nên `next` gọi
  thêm một lần thừa. Đề xuất: `prepare` cũng đặt `ai_stopped`, và không làm gì khi `ai_stopped` đã có.
- B (kiểm từ riêng) chạy trước C (`isReady`). Khi admin tắt AI, B trả `unavailable`, và 7.6 xếp nó vào "AI lỗi" (dòng 1 của 6.6) thay vì "AI tắt" (dòng 3, `ai_stopped`). Đổi C
  lên trước B (cùng với R6).

## R21 — minor — Khóa, FK và việc giữ dấu vết trả lượt

**Mục:** 12.1, 9.3.

- Chưa ghi `practice_ai_requests.session_id` / `question_id` là FK hay UUID thường. FK `Restrict` sẽ làm job xóa phiên (`practice-cleanup.service.ts:37-39`) và cổng xóa từ riêng
  hỏng nếu sai thứ tự. Đề xuất: UUID thường, hoặc FK `SetNull`. Chưa ghi unique của `practice_unknown_forms` (R16). `practice_report_reasons.code` nên được FK từ
  `practice_reports.reason` (`ON DELETE RESTRICT`), vì lý do không bao giờ xóa.
- Job xóa báo cáo đã xử lý cũ hơn `history_months` (`practice-cleanup.service.ts:41-43`). Báo cáo `confirmed`, `refunded = null` (B7E77) cũ quá mốc thì bị xóa trước khi thử lại
  được: hiếm, nên ghi. Danh sách trả lượt của `admin` (9.3) đọc từ báo cáo, nên mất dòng sau 6 tháng, và mất ngay khi Lan xóa từ riêng (cổng xóa báo cáo của nghĩa đó, B7E83).
  Dòng `credit` ở sổ lượt vẫn còn (`note` = id báo cáo). Ghi vào mục 20 nếu chủ dự án cần lịch sử lâu hơn.

## R22 — minor — Nhãn "AI gợi ý" và các trường Content còn thiếu

**Mục:** 4 (bảng module), 11.2.

- `publishRevision` của từ riêng luôn ghi `draftSource: 'user'` (`private-words.service.ts:108`), và `PATCH /v1/my-words` tạo revision mới. Vì vậy nhãn "Nguồn: AI gợi ý" mất ngay
  lần sửa đầu tiên. Ghi rõ đó là ý muốn ("Lan sửa thì thành của Lan"), hay giữ nhãn ở mức entry.
- `WordSense` chưa có `draft_source` để trang từ hiện nhãn; `PracticeSense` chưa có id revision đang dùng (design cần `sense_revision_id`) và chưa có `pos`, level (design có
  ghi hai trường này). Thêm vào bảng mục 4.
- Sửa lemma của từ riêng là sửa ở `entries`, không tạo revision mới, nên chỉ `content_key` bắt được. Design đã có `content_key`, nhưng chưa nói cách chuẩn hóa (lemma chữ thường
  NFC? `pos` chưa đặt = `unspecified`?).

## R23 — minor — Mục 0 thiếu vài chỗ đổi; chỗ suy rộng; số dòng cũ

**Mục:** 0, 5, 11.2.

- Mục 0 chưa ghi: (a) mã thao tác đổi từ "id của lần hỏi chờ" (Bước 6 §4.4 bước 0) sang id của `practice_ai_requests`; (b) `next` không còn là "Tự nhiên" như API 3 của Bước 4:
  có trạng thái `preparing` và có thể không trả lại lần hỏi chờ (liên quan R1); (c) câu tạo sẵn bị trừ lượt lúc **tạo**, không phải lúc **giao** (ER6 nói "phục vụ thành công";
  chủ dự án đã chấp nhận ở câu 7b, chỉ cần ghi lại để truy nguồn).
- Mục 5 / D24: bản dịch sau khi nộp cho cả `meaning_in_sentence` và `mcq_sentence`. Câu 23 chỉ hỏi về **câu điền từ AI**, và chủ dự án trả lời "ok" cho đúng ý đó. Ghi phần mở
  rộng là **Đề xuất**, hoặc hỏi lại.
- Số dòng ở 11.2 (`private-words.service.ts:107,152`) là của `47ca600`; trên `985531b` là `:108` (`draftSource`) và `:157` (`examplesEn: []`).

---

## Đã kiểm, đúng (không cần sửa)

- **D12 đã lên `dev` và đúng như mục 0 nói.** Tx ngắn giữ khóa (`idempotency.service.ts:35-55`, chỉ `maxWait`), handler chạy ngoài mọi transaction (`:72`), handler lỗi
  thì xóa dòng giữ khóa (`:76`), ghi kết quả bằng lệnh riêng (`:81-89`); `claim-decision.ts:20-23` coi hạn là thời gian giữ chỗ. `@Idempotent({ timeoutSeconds: 60 })` hợp lệ: không có
  chặn trên (`idempotent.decorator.ts:13-14`), interceptor truyền nó làm `leaseSeconds` (`idempotency.interceptor.ts:65`). 60 giây vẫn lớn hơn thời gian xấu nhất kể cả khi admin
  đặt `call_timeout_seconds` = 30. B7E20, B7E21 đúng.
- **Mã thao tác:** UUID 36 ký tự + `#2` = 38, + `:wc` = 39, `lookup:` + 32 hex = 39; đều khớp `^[A-Za-z0-9._:#-]{1,100}$` (`ai.constants.ts:46`). `ai_operations` unique theo
  `(user_id, operation_id)` cho mọi thao tác, nên hậu tố tách được các lần gọi.
- **`define()` hợp với ba thao tác mới:** khóa ra là chuỗi hoặc danh sách chuỗi (`define-operation.ts:29-41`); `verdict` thu hẹp bằng enum trong JSON Schema như `part_of_speech`
  của `lookup_word`; khóa vào là mảng (`other_meanings`, `candidates`) thì zod `strictObject` nhận được.
- **Giành lại dòng của Bước 6:** dòng `running` giành lại được sau `deadline_at + 20 giây` (`run-rules.ts:42`, `ai.constants.ts:9`), sớm hơn mốc 2 phút của Practice; giữ chỗ
  quá 2 phút được nhả rồi giữ lại (`ledger-rules.ts:24-30`). B7E32 đúng **nếu** sửa R3.
- **"Thử lại" bằng yêu cầu mới** sau hai lần bị luật loại thật sự cho câu mới: mã mới chưa có dòng `ai_operations`, nên không có kết quả 24 giờ để trả lại.
- **Sổ lượt:** mọi lần gọi AI trong 6.5 và 11.1 nằm giữa hai transaction ngắn; mỗi `reserve` / `confirm` / `release` là một transaction riêng; mỗi transaction tối đa một
  `reserve` (R6 Bước 5). `#2` chỉ một lượt (chỉ `reserve` / `confirm` với mã gốc). Câu tạo sẵn dùng lại không gọi `reserve`.
- **"Từ hay sai" bỏ lượt bị báo `open` / `confirmed`:** tự có, vì `practice-stats.ts:35` chỉ tính `report IS NULL OR report = 'no_error'`.
- **`snapshot`** có đúng các trường 6.1 dùng: `features['ai.practice'].allowed`, `pools.ai_practice.remaining`, `ai_available.enabled/cap_reached`
  (`entitlements.service.ts:25-37, 164-170`). Free → `allowed = false` → `403 entitlement-required` (B7E1).
- **Con số tra nghĩa** 0–5.000 (`settings.definitions.ts`, `pro_ai_lookup_per_cycle` / `trial_ai_lookup_per_cycle`: `{ min: 0, max: 5000 }`); D29 không cần sửa code.
- **Job dọn** (`practice-cleanup.service.ts:35-36`): xóa lần hỏi rồi xóa câu không còn lần hỏi, đúng như mục 0. Luật mới không gặp FK `Restrict` (lần hỏi → câu hỏi,
  `practice.prisma:76`), vì chỉ xóa câu không còn lần hỏi. Câu AI đã hiện luôn có `created_at ≤ asked_at`, nên không bao giờ bị nhầm thành "chưa từng hiện" sau khi lần
  hỏi bị dọn.
- **Đối chiếu nhật ký hỏi đáp:** câu 10 (Free không có bài điền từ nào: B7E1), câu 11 (không ôn câu AI cũ; chỉ câu chưa từng hiện), câu 13 (không có lời gọi kiểm riêng;
  `check_private_word` là của câu 25), câu 8 (3 nấc, bỏ số chữ; hai dạng chọn 1 nấc định nghĩa), câu 18 (chỉ khi bấm), câu 24 (`settings.manage` cho lý do), câu 26
  (`editor` trả ngay, `admin` xem lại), D29 / (ii) (không đổi code): design khớp. Chỗ lệch: R8 (câu 21a), R23 (câu 23), R11 (câu 7).

---

## Độ phủ edge case

Mỗi mã luật design dẫn, đã có ít nhất một When → Then cho cách làm của chính design chưa:

| Luật | Ca có | Ghi chú |
|---|---|---|
| ER4 | B7E14, 6.6 cuối | Thiếu: bài từ câu đã lưu khi gói hết giữa phiên (M13) |
| ER5 | B7E7–B7E12, B7E32, B7E33 | B7E32 chỉ đúng khi sửa R3 |
| ER6 | B7E19, AC9 | Thiếu: câu tạo sẵn bị trừ lúc tạo (R23) |
| ER7 | B7E2, B7E13 | |
| ER14 | B7E5, B7E6 | Thiếu: trần = 0 (R19) |
| ER15 | B7E16, B7E20 | |
| ER17 | B7E20, B7E21 | B7E110 sai một nửa (R12) |
| AR3 | B7E31 | Mâu thuẫn với R1 (3) |
| AR4 | B7E30 | |
| AR5 | B7E32, B7E40 | B7E40 phải đổi theo R3 |
| AR7, AR8, AR9, AR12 | B7E38, B7E37, B7E34–B7E36, B7E39 | |
| PRC4 | B7E4, B7E18, B7E52 | |
| PRC6, PRC7 | B7E34–B7E36 | Thiếu: từ đang hỏi có sẵn trong câu (M10, R15) |
| PRC10, PRC11, PRC13 | B7E56, B7E50, B7E51 | |
| PRC18, PRC19 | B7E70–B7E84 | B7E74, B7E75 sai (R2) |
| PRC21, PRC22 | 6.2, B7E47, B7E63, B7E55 | |
| CR13, CR15, CR16, CR22 | B7E94, B7E90–B7E92, B7E96, 7.2 | |
| CR23 | B7E83 | Thiếu: xóa từ riêng khi đang tạo câu (M5) |
| SR2, SR8, SR9, SR10, SR13, SR14 | B7E105, B7E20/21/110, B7E106, B7E107, B7E109, B7E108 | |

**Ca thiếu đáng thêm** (When → Then đề xuất):

| # | When | Then (đề xuất) |
|---|---|---|
| M1 | Hai tab cùng gọi `next` ở vòng ≥ 2, một tab đang chờ AI | Tab sau nhận `preparing` cho **cùng** chỗ (R1), không có lần hỏi thứ hai |
| M2 | Lần `next` đang gọi AI và một lần hỏi lại cùng tới lúc gắn câu | Đúng một lần hỏi; lần kia trả lại lần hỏi đó |
| M3 | `prepare` tạo câu cho từ #3 lỗi, rồi Lan bấm Tiếp | Phiên trộn: đổi dạng ngay, không gọi AI lại; phiên chỉ AI: `ai_unavailable` |
| M4 | Máy chủ chết khi đang tạo `mcq_sentence`; lần sau chạy lại | Dùng `ai_input` đã lưu; `input-mismatch` → `failed`, không kẹt (R3) |
| M5 | Lan xóa từ riêng trong lúc câu AI của nó đang tạo | Không còn câu nào chứa từ đó; giữ chỗ được nhả (R4) |
| M6 | Hai lần chạy lại cùng một yêu cầu cùng tới F | Một câu; lần sau không ghi |
| M7 | Thao tác mới chưa chọn model; Lan mở phiên có dạng đó | `503 ai-unavailable`, `reason: model-not-set`; chưa tạo phiên (R6) |
| M8 | Staff xác nhận câu đã giao miễn phí (B7E12, B7E33) | `refunded = false`, không ghi `credit` (R2) |
| M9 | Tra AI: chết sau `confirm`, trước khi ghi kết quả chống trùng; app dùng key mới | Trừ thêm 1 lượt; rủi ro đã chấp nhận (R12) |
| M10 | Câu AI có từ đang hỏi ở ngoài chỗ trống | Loại, viết lại `#2` (R15) |
| M11 | Câu tạo sẵn có nhiễu là từ riêng Lan đã xóa | Không dùng lại câu đó (R11) |
| M12 | Nhóm bị xóa giữa phiên khi có 2 câu tạo sẵn | Phiên `finished` (`group-not-found`); hai câu thành câu tạo sẵn, đã trừ lượt |
| M13 | Gói hết giữa phiên có bài từ câu đã lưu | Ghi rõ: làm tiếp tới hết phiên (không có `reserve` để phát hiện), hay kiểm `ai.practice` ở mỗi câu |
| M14 | Lan mở Lịch sử có câu AI | Hiện câu, lựa chọn, đáp án đúng (đúng lựa chọn, không phải nghĩa), bản dịch nếu là người học `vi` (R7) |
| M15 | Người học `en`, `meaning_in_sentence`, nhóm có từ riêng không có `gloss_vi` | Từ riêng đó không làm nghĩa sai (R14) |
| M16 | Phiên bị đóng (Dừng, quá `idle_session_close_hours`) khi `prepare` đang chạy | Câu ghi xong thành câu tạo sẵn; G không chạy; không lỗi |
| M17 | Phiên chỉ AI, câu 1 `ai_unavailable`, Lan bấm [Dừng, để sau] | Phiên vẫn mở; chưa tính là một phiên của ngày (Bước 5 tính ở câu đầu có kết quả) |
| M18 | Admin tắt AI trong lúc `prepare` chạy | `ai_stopped = ai-unavailable` ngay (R20); câu đã tạo vẫn làm được |
| M19 | `editor` xác nhận báo cáo của chính mình | Theo quyết định ở R18 |
| M20 | Tài khoản bị xóa (Bước 8) khi đang tạo câu | Ghi sang Bước 8: F phải thấy yêu cầu đã mất (R4) và không ghi gì |

---

## Có thể đơn giản hóa (không phạm quyết định nào của chủ dự án)

- `GET /v1/practice/items/{id}/report-reasons` → `GET /v1/practice/report-reasons?kind=ai|non_ai`. Danh sách chỉ phụ thuộc loại câu, app tải một lần cho cả phiên.
- Vòng ≥ 2: nếu sửa R1 bằng cách lưu thứ tự vòng khi vòng bắt đầu (một cột `round_order uuid[]`), thì `prepare` chạy được cả ở vòng ≥ 2, và bỏ được rủi ro "vòng ≥ 2 không tạo
  trước" ở mục 20. Luật `r ÷ q` vẫn dùng được trên thứ tự đã lưu.
- Lọc `source = own_sentence` ở danh sách báo cáo của staff (9.3) là thừa: câu từ câu đã lưu không báo được (`report-not-available`).

## Ghi chú

- Mọi số liệu về code ở trên đã đọc trên `origin/dev` @ `985531b`. Chưa kiểm (`ASSUMPTION`): hành vi lúc chạy của race trong R1, R4 (suy ra từ code và thứ tự lệnh, chưa
  chạy thử); cách plan sẽ đặt tên `kind` mới (R7).
- Review không xét chất lượng chữ prompt (để ở plan, như design ghi) và không xét `docs/specs/` (luật dự án 12/10/2026).
