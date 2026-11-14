# Review design Bước 6 (AI Integration, chỉ API) — trước khi viết plan (20/10/2026)

**Đã đọc:** design [`../specs/2026-10-20-buoc-6-ai-integration-design.md`](../specs/2026-10-20-buoc-6-ai-integration-design.md) (744 dòng, D1–D22),
nhật ký [`2026-10-19-buoc-6-brainstorm-log.md`](2026-10-19-buoc-6-brainstorm-log.md) (447 dòng), hai file research
[`OPENAI_API_RESEARCH_2026-10-19.md`](../../preparation/OPENAI_API_RESEARCH_2026-10-19.md) và
[`PROMPTING_OPENAI_ANTHROPIC_RESEARCH_2026-10-19.md`](../../preparation/PROMPTING_OPENAI_ANTHROPIC_RESEARCH_2026-10-19.md); design Bước 5 §7, §12.4, §18, §19 và
`docs/deliveries/buoc-5.md`; review Bước 5 làm mẫu; `CLAUDE.md`, `docs/specs/SPEC_WRITING_CONVENTIONS.md`. Decision record Bước 6 mà design trỏ tới (dòng 6) **chưa có**
trong repo. Code đọc trên nhánh `docs/buoc-6-design` (= `origin/dev` @ `529fde3` cộng 4 file docs chưa commit). "Dòng N" không kèm tên file là dòng của file design;
`path:dòng` của code tính từ `apps/api/`. Tài liệu nhà cung cấp đọc lại trong phiên này (mục 5).

**Phạm vi:** chỗ tự mâu thuẫn trong design; design ↔ nhật ký; design ↔ code trên `dev`; chỗ thiếu khiến người viết plan phải đoán (race, crash, thứ tự ghi);
tiêu chí không kiểm được bằng unit hoặc `pnpm smoke:buoc-6`; dữ kiện về OpenAI và Anthropic; bảo mật và riêng tư. Không bàn lại D1–D22; một quyết định chỉ được nêu
khi nó tự mâu thuẫn hoặc không build được như viết. Chỉ đọc, không chạy build, test hay server.

**Kết quả:** 1 Cao, 7 Trung bình, 9 Thấp. 2 câu cần chủ dự án trả lời (mục 4).

## 1. Kết luận

Kiến trúc (một cổng, bộ nối theo mẫu cổng thanh toán Bước 5, dữ liệu tách khỏi lời dặn, lưu kết quả 24 giờ) build được trên code hiện tại. Settings thêm nhóm `ai`
vừa khít mẫu một dòng `global`; rule `ai.test` thêm được vào `RateLimitRuleName` + `DEFAULT_LIMITS`; kiểu kiểm `AI_FAKE_ENABLED` cùng `BILLING_PRODUCTION` khớp
`superRefine` có sẵn. Chưa nên viết plan nguyên văn. Cần sửa trước:
1. **R1 (Cao)** — luồng Bước 7 ở §4.4 nhả lượt cho mọi kết quả không thành công, kể cả `in-progress`. Lần bấm thứ hai sẽ nhả lượt mà lần bấm đầu đang giữ, nên câu AI
   được tạo mà không trừ lượt, không tính vào trần 1.000/ngày. Lý do chọn `in-progress` (⚠7: "phiên đã khóa nên trùng rất hiếm") cũng mất hiệu lực, vì chính §4.4
   bắt Bước 7 thả khóa phiên trong lúc gọi AI.
2. **R2** — bảng `ai_operations` chưa có cách "giành" dòng nguyên tử. Hai lời gọi cùng mã có thể cùng gọi nhà cung cấp hoặc lỗi 500. Mốc "bỏ dòng `running`" cố
   định 30 giây, trong khi cài đặt cho chờ tới 30 giây.
3. **R3, R4** — chưa có bảng quy lỗi theo từng nhà cung cấp. Ví dụ Anthropic báo chạm giới hạn chi bằng **400** (dữ kiện kiểm trong phiên). Số token ra cố định
   1.200 dễ bị cắt khi admin chọn effort cao, và mỗi lần bị cắt vẫn tốn tiền.
4. **R5** (Q1) — lời gọi lỗi tốn tiền mà không bị đếm ở đâu cả. §19 chưa ghi rủi ro này.
5. **R6, R7, R8** — vòng đời job bộ ví dụ, lệnh `pnpm ai:fake-call` và `describeModel` chưa đủ chi tiết để viết plan và smoke mà không phải đoán.

## 2. Bảng phát hiện

| R# | Mức | Mục design | Vấn đề | Đề xuất ngắn | Cần chủ dự án quyết? |
|---|---|---|---|---|---|
| R1 | **Cao** | 4.4, 8.1, ⚠7, B6E15 | Bước 7 nhả lượt ở mọi kết quả không thành công; `in-progress` là kết quả của lần bấm *thứ hai*, nên nó nhả lượt của lần đầu → câu AI miễn phí, vượt trần. Lý do của ⚠7 dựa vào khóa phiên mà §4.4 bỏ | Hợp đồng: `in-progress` (và `input-mismatch`) **không** nhả lượt; mã thao tác cố định theo câu hỏi; Bước 7 kiểm kết quả `confirm` | Không |
| R2 | Trung bình | 8.1, 8.2, 11, 13, B6E15–17 | Không nói bước 4 "ghi `running`" phải nguyên tử; giành lại dòng bỏ dở không có điều kiện; bước 8 ghi đè không kiểm "còn là của mình"; mốc bỏ dòng 30 giây cố định trong khi `call_timeout_seconds` tới 30 và `deadlineMs` tùy bên gọi; bước 1 lưu `bad-input` trước khi tra dòng cũ | `INSERT … ON CONFLICT DO NOTHING RETURNING`; cột `deadline_at` + `attempt_id`; cập nhật/xóa có điều kiện; tra trước rồi mới lưu `bad-input` | Không |
| R3 | Trung bình | 4.3, B6E43, B6#26 | Chưa có bảng quy lỗi theo nhà cung cấp. Anthropic: chạm giới hạn chi → 400; trần chi theo tier → 429 không `retry-after`; billing → 402. OpenAI: hết tiền/chạm giới hạn → 429 với 4 mã riêng. `incomplete_details.reason` còn `content_filter`, `steered`; `stop_reason` còn `model_context_window_exceeded`, `pause_turn` | Bảng quy lỗi riêng cho từng bộ nối (status + `error.type`/`code` + chữ), kèm phản hồi mẫu cho unit | Không |
| R4 | Trung bình | 5.4, 6.2, 6.3, B6E37, B6E51 | Token ra tối đa cố định (1.200/800, gồm cả token nghĩ thầm) trong khi admin chọn effort. Haiku 5.5 bật nghĩ thầm sẵn; OpenAI khuyên chừa ≥ 25.000 → cắt mãi, mỗi lần đều tốn tiền, `truncated` lẫn vào `invalid-shape`. B6E37 chỉ kiểm `disabled.supported`, không kiểm cặp (tắt thinking + `xhigh`/`max`) mà Anthropic từ chối | Lý do riêng `truncated`; kiểm cặp effort + thinking theo tài liệu; Q2 | **Có (Q2)** |
| R5 | Trung bình | 8.5, 9, 19, D10 | Lời gọi lỗi: lượt được nhả nên trần 1.000/ngày không đếm, nhưng app vẫn trả tiền. Chi cho lời gọi lỗi chỉ bị chặn bởi giới hạn chi tháng của nhà cung cấp. §19 không ghi | Ghi rủi ro; Q1 | **Có (Q1)** |
| R6 | Trung bình | 10, 12.1 (14, 15), B6E71–74 | Job bộ ví dụ: dùng hạ tầng hàng đợi nào (cái của content-pipeline gắn với `background_jobs` của Pipeline); thêm job vào hàng đợi lỗi → `queued` mãi; worker chết → `running` mãi; BullMQ chạy lại → gọi lại mọi ví dụ (tốn hai lần); bản nháp lưu ở đâu; khi nào `failed` | Queue riêng trong `ai/eval/` như Notifications; `attempts: 1`; bước dọn `queued`/`running` quá hạn → `failed`; lưu bản nháp vào dòng lần chạy | Không |
| R7 | Trung bình | 17, B6#2–B6#24 | `pnpm ai:fake-call <op> <model>`: tham số `<model>` trái với `run()` (dùng model đã chọn); không có cách truyền dữ liệu vào, `userId`, `purpose`; giới hạn đồng thời đếm theo tiến trình nên B6#11 chỉ đúng trong một lệnh `--parallel`; API không có đồng hồ giả (B6#22, B6#23); B6#20 "chi phí = 0" cần giá 0 trên dòng model; bản giả `*-then-ok` cần trạng thái | Ghi đủ chữ ký lệnh; lùi cột bằng SQL; smoke đặt giá 0; bản giả nhớ theo dấu vân tay dữ liệu, `retry-after` 1 giây | Không |
| R8 | Trung bình | 4.3, 6.1, 6.4, 14 | `describeModel` không có thời gian chờ tối đa → SDK mặc định 10 phút: `POST /models` treo, việc định kỳ chạy tuần tự bị chặn. Mã model đi vào URL nhưng chỉ kiểm độ dài. MaintenanceScheduler chạy cả trong worker (dòng 59 nói "tiến trình API") | Hằng số chờ ~5 giây (như `BILLING_ADAPTER_TIMEOUT_MS`); chỉ nhận ký tự `[A-Za-z0-9._:-]`; quy 403/404 | Không |
| R9 | Thấp | 4.4, 19 | Ràng buộc "không giữ transaction" thiếu hai chỗ: `current()` cũng tạo câu trong transaction; mọi route `@Idempotent()` chạy handler bên trong transaction. "50 lời gọi giữ 50 kết nối" sai cỡ: pool mặc định 10 mỗi tiến trình | Thêm vào §4.4 và §19 | Không |
| R10 | Thấp | 5.1 | `context_label` vào ≤ 100 ký tự, Content cho tới 2.000 → nghĩa có nhãn dài bị `bad-input` (lưu 24 giờ), không bao giờ có câu AI | Theo đúng giới hạn Content hoặc cắt ngắn trước khi gửi | Không |
| R11 | Thấp | 5.4, B6E50, B6E52 | "luôn là chữ thường" dễ bị hiểu là viết thường (lowercase); bỏ ký tự điều khiển trước thì luật "không xuống dòng" không bao giờ chạy; bỏ trùng có phân biệt hoa thường không; Anthropic không bảo đảm hoa thường của giá trị enum | Viết "văn bản thuần (plain text)"; thứ tự kiểm; chuẩn hóa `part_of_speech` | Không |
| R12 | Thấp | 8.4, B6E27, B6E28 | Lần thử lại có giữ chỗ trong hàng đợi không; khi nào đọc lại giới hạn; "tới 2 × giới hạn" thiếu các tiến trình CLI | Ghi rõ | Không |
| R13 | Thấp | 7.5, 11 | `saved_by = 'migration'` không vừa cột UUID; ba dòng `ai_operation_settings` nạp lúc nào, `version` đầu; `NULLS NOT DISTINCT` không viết được trong Prisma schema | Mã UUID hệ thống cố định; migration nạp 3 dòng; index viết bằng SQL như tiền lệ, hoặc không lưu chạy thử/bộ ví dụ vào `ai_operations` | Không |
| R14 | Thấp | 12.2, B6E68 | `ai_call_contents` không có `user_id`; nếu đặt `ai_calls.user_id = null` trước thì không còn tìm được nội dung của người đó để xóa | Xóa nội dung qua join trước, rồi mới đặt null, trong một transaction | Không |
| R15 | Thấp | 9, 12.1 (1, 17), 18 | Nội dung giữ 7 ngày "để tra câu sai", nhưng §18 không bắt Bước 7 lưu `operation_id` cùng câu hỏi → không lần ra được lời gọi. "Lỗi gần nhất" của API tình trạng không có nguồn cho `busy`, `in-progress` | Thêm `operation_id` vào phần `meta` Bước 7 lưu; ghi nguồn của "lỗi gần nhất" | Không |
| R16 | Thấp | 0, 2, 11, 20 | Design ↔ nhật ký: quên "giá ước tính mỗi lượt / 1.000 lượt ≈ X đ" (câu 8) và "đối chiếu sổ lượt với sổ chi phí" (Bước 5 §18); dòng 444 trỏ tới mock data mà nhật ký không có; nhãn "Chốt" của D14 và một phần D18 thật ra là đề xuất được duyệt; decision record chưa viết | Sửa nhãn; thêm hoặc ghi "không làm" | Không |
| R17 | Thấp | nhiều | Sai nhỏ so với code và chữ: `refund` có 4 tham số; `entitlements.ai_enabled` / `aiEnabled` lẫn; B6E70 là việc trước ra mắt, không phải edge case; `OPENAI_API_KEY=` để trống phải coi như không có; lấy `VALID_POS` từ `content/index.ts` tạo vòng import khi Content gọi `ai` ở Bước 7 | Sửa chữ; ghi cách import | Không |

## 3. Chi tiết

### R1 (Cao) — `in-progress` làm nhả lượt của lần bấm đầu

**Vấn đề.** Luồng §4.4 (dòng 185-190): "còn lại → `entitlements.release(opId)`", tức mọi kết quả không phải `succeeded` đều nhả lượt. Theo §5.5 (dòng 260)
`in-progress` là một `transient_failure`. Nhưng `in-progress` chỉ xảy ra với lời gọi **thứ hai** cùng mã, trong lúc lời gọi thứ nhất còn chạy (dòng 360,
B6E15). Lượt của mã đó đang thuộc về lời gọi thứ nhất.

Ví dụ cụ thể, đi theo code Bước 5 trên `dev`:
1. 10:00:00 — Lan bấm "Câu tiếp" (bài điền từ AI). Yêu cầu A: Bước 7 chọn từ trong transaction ngắn, mã `q1`. `reserve(Lan, ai_practice, q1)` tạo dòng `reserved`.
   `ai.run(q1)` gọi OpenAI, mất 3 giây.
2. 10:00:01 — app của Lan gửi lại (bấm hai lần, hoặc mạng chập chờn). Yêu cầu B cũng ra mã `q1`. `reserve` trả lại dòng đang giữ (`return-existing`,
   `entitlements/usage/usage-ledger.service.ts:50-61`). `ai.run(q1)` → `in-progress` → Bước 7 gọi `release(q1)` → dòng thành `released`, lý do `caller`
   (`usage-ledger.service.ts:120-134`).
3. 10:00:03 — A nhận câu, lưu câu hỏi, gọi `confirm(q1)`. Dòng mới nhất là `released` với lý do `caller`, nên `decideConfirm` trả `keep-released`
   (`entitlements/usage/ledger-rules.ts:56-59`). Lan có câu AI mà **không bị trừ lượt**, và lần dùng đó không vào trần 1.000/ngày.

Một script bắn hai yêu cầu song song cho mỗi câu sẽ dùng AI không giới hạn: không hết lượt, không chạm trần, app trả tiền. Ngược lại, nếu Bước 7 sinh mã mới mỗi lần
bấm, hai lần bấm thành hai lời gọi và hai lượt, tức Lan bị trừ hai lần cho một câu.

Lý do của ⚠7 (dòng 37) và của câu 7 trong nhật ký (dòng 168-170, 181-182) là "Bước 4–7 đã khóa phiên nên ca này rất hiếm". Nhưng chính §4.4 (dòng 194-196) bắt Bước
7 thả khóa phiên trong lúc gọi AI. Sau khi tách như vậy, hai lần bấm không còn xếp hàng sau nhau nữa, và ca "trùng khi lần đầu còn chạy" trở thành ca thường gặp.

**Đề xuất (kỹ thuật, không đổi D1–D22).** Sửa hợp đồng ở §4.4 và §12.2:
- `in-progress` (và `input-mismatch`) → Bước 7 **không** gọi `release`; trả cho app "đang tạo, thử lại sau giây lát" (Bước 7 đặt mã). Tốt nhất tách `in-progress`
  ra một `status` riêng, để bên gọi không thể xử lý nó như mọi `transient_failure` khác.
- Mã thao tác phải **cố định cho một câu hỏi** (ví dụ id dòng item chờ câu, tạo trong transaction ngắn đầu tiên), không sinh mới mỗi lần bấm. Đây cũng là điều kiện để
  B6E18 đúng.
- Bước 7 đọc kết quả `confirm`: `released` hoặc `not-found` → log, không coi là đã trừ lượt.
- Thêm B6E: "Hai yêu cầu cùng mã song song: yêu cầu hai nhận `in-progress`, không nhả lượt; yêu cầu một `confirm` → `confirmed`".

### R2 (Trung bình) — giành dòng `ai_operations` không nguyên tử, mốc 30 giây cố định

**Vấn đề.** §8.1 tách "tra" (bước 2, dòng 357-361) và "ghi `running`" (bước 4, dòng 364). Khi chưa có dòng, hai lời gọi song song cùng `(user, mã)` cùng thấy
"chưa có", rồi cùng ghi ở bước 4. Lời gọi chậm hơn gặp unique violation: nếu ghi bằng `create` thì thành 500; nếu là "upsert/cập nhật" như chữ "Ghi / cập nhật" ở dòng 364
thì cả hai cùng gọi nhà cung cấp. Ba chỗ khác cũng chưa định nghĩa:
- **Giành lại dòng bỏ dở** (dòng 361, B6E16): hai lời gọi cùng thấy dòng `running` đã quá hạn thì cả hai "đi tiếp như chưa có". Không có điều kiện trên câu cập nhật nào chặn điều đó.
- **Bước 8 ghi kết quả** (dòng 368-369) không kiểm dòng còn là của mình. Lời gọi cũ chạy chậm có thể ghi `succeeded` đè lên lần mới, hoặc xóa dòng `running` của lần mới.
- **Mốc bỏ dòng** là "10 giây + 20 giây đệm" cố định (dòng 360, 512, 530), nhưng `call_timeout_seconds` cho tới 30 giây (dòng 507) và `deadlineMs` do bên gọi đặt. Ví dụ:
  admin đặt 30 giây, lời gọi của Lan đang ở giây 30,5 (vừa hết giờ, đang ghi `ai_calls`). Lần bấm lại thấy dòng "quá 30 giây" nên gọi lần hai, rồi lần một ghi đè kết quả.

Bước 1 (dòng 356) lưu `bad-input` **trước** khi tra dòng cũ. Nếu mã đó đã có kết quả `succeeded` với dữ liệu khác, việc lưu này đụng dòng cũ, trái B6E14 ("không ghi đè dòng cũ").

**Đề xuất.**
- Bước 4 = `INSERT … ON CONFLICT (user_id, operation_id) DO NOTHING RETURNING id`. Không ra dòng nào thì đọc lại và áp lại bước 2. Tiền lệ trong repo:
  `usage-ledger.service.ts:73-76`.
- Thêm cột `deadline_at` (lúc bắt đầu + quỹ thật đã dùng) và `attempt_id` (UUID của lần thực hiện). Dòng bị coi là bỏ khi `now > deadline_at + 20 s`. Giành lại =
  `UPDATE … SET attempt_id = :new … WHERE id = :id AND attempt_id = :old AND status = 'running'`. Bước 8 ghi hoặc xóa đều kèm `WHERE attempt_id = :mine`.
- Đổi thứ tự: tra dòng (bước 2) trước, rồi mới kiểm và lưu `bad-input`.
- Thêm B6E: "hai lời gọi cùng mã cùng tới khi chưa có dòng → đúng một lời gọi nhà cung cấp; lời gọi kia `in-progress`".

### R3 (Trung bình) — chưa có bảng quy lỗi theo từng nhà cung cấp

**Vấn đề.** Bảng §4.3 (dòng 169-178) quy theo nhóm chung (`rate_limited` (429), `server` (5xx), `bad_request`, `provider_quota`) mà không nói mỗi nhà cung cấp báo
từng loại bằng gì. Tài liệu đọc lại trong phiên (mục 5) cho thấy cách quy thẳng theo status sẽ sai:
- **Anthropic**: chạm giới hạn chi do mình đặt (chính là lớp bảo vệ mà D10 dựa vào) trả **400 `invalid_request_error`**. Quy thẳng theo status thì thành
  `bad_request` → `model-rejected`, và API tình trạng báo admin "model bị từ chối" thay vì "hết hạn mức chi". Trần chi theo tier trả **429 không có `retry-after`** và
  "keeps failing", nên quy thành `rate_limited` sẽ thử lại vô ích. Lỗi thanh toán là **402 `billing_error`**, mà SDK không có lớp lỗi riêng cho 402.
- **OpenAI**: hết tiền hoặc chạm giới hạn trả **429** với `error.code` `credit_balance_exhausted`, `organization_spend_limit_exceeded`, `project_spend_limit_exceeded`,
  `organization_usage_limit_exceeded`. Không đọc `code` thì những lỗi này thành `rate-limited`. Model không tồn tại: trang lỗi không ghi status (không kiểm được).
- **Phản hồi bị dừng**: OpenAI `incomplete_details.reason` còn `content_filter`, `steered`, `max_messages`, design chỉ nói `max_output_tokens`. Anthropic
  `stop_reason` còn `model_context_window_exceeded`, `pause_turn`, `tool_use`, `stop_sequence`, design chỉ nói `refusal`, `max_tokens`.

**Đề xuất.** Thêm vào §4.3 hai bảng, mỗi bộ nối một bảng: (status, `error.type`/`code`, chữ nhận dạng nếu cần) → loại lỗi của ổ cắm. Ví dụ Anthropic 400 có chữ
"spend limit" → `provider_quota`; 429 không có `retry-after` → `provider_quota`; 402 → `provider_quota`. OpenAI `content_filter` → `refused`, `steered` →
`invalid-shape`. Mỗi dòng có một phản hồi mẫu cho unit test (B6#26). Ca nào chưa kiểm chứng được thì ghi `ASSUMPTION`.

### R4 (Trung bình) — token ra tối đa cố định trong khi effort do admin chọn

**Vấn đề.** Dòng 246-247 cố định số token ra tối đa (1.200 / 1.200 / 800), **gồm cả token nghĩ thầm**. Còn §6.2 cho admin chọn mọi mức effort, kể cả `xhigh`, `max`.
Theo tài liệu, OpenAI khuyên "reserving at least 25,000 tokens for reasoning and outputs" khi mới thử. Token nghĩ thầm của Anthropic tính vào `max_tokens`, và Haiku
5.5 bật nghĩ thầm (adaptive) sẵn.

Ví dụ: admin chọn `claude-haiku-5-5` effort `high` cho "Tạo câu". Model nghĩ hết khoảng 1.100 token rồi bị cắt ở 1.200 → `truncated` → `invalid-shape` (dòng 173) →
Lan thấy "chưa tạo được", lượt được nhả. Lần bấm sau lại bị cắt y như vậy, và mỗi lần app trả tiền cho cả 1.200 token. Vì `truncated` bị gộp vào `invalid-shape`, API tình
trạng chỉ hiện "sai khuôn", admin không biết nguyên nhân là thiếu token.

B6E37 (dòng 598) nói "tắt thinking" bị chặn lúc lưu dựa vào `thinking.types.disabled.supported`. Tài liệu Anthropic ghi rõ cờ đó đúng mà request vẫn có thể bị từ chối "for
another reason, such as an effort level the model does not allow with thinking off". Cụ thể: Haiku 5.5 với `disabled` + `xhigh`/`max` → 400. Sonnet 5.5 không nhận
`disabled`, chỉ nhận `between_tools`. Ngoài ra `capabilities` có thể là `null`, và `capabilities.structured_outputs` (mà cổng bắt buộc cần) không được lưu cũng không được kiểm (dòng 273).

**Đề xuất.** Thêm lý do riêng `truncated` (vẫn là lỗi tạm) để API tình trạng và nút chạy thử chỉ ra đúng nguyên nhân. Lúc lưu lựa chọn: kiểm cặp (thinking tắt + effort
`xhigh`/`max`) theo tài liệu; từ chối model Anthropic có `structured_outputs.supported = false`; `capabilities = null` thì chỉ cho "mặc định". Ai đặt số token tối đa là câu hỏi sản phẩm: **Q2**.

### R5 (Trung bình) — lời gọi lỗi tốn tiền nhưng không bị đếm ở đâu

**Vấn đề.** §8.5 (dòng 399) và D10 dựa vào "trần lượt Bước 5 + giới hạn chi tháng của nhà cung cấp". Trần Bước 5 chỉ đếm dòng `reserved` chưa quá hạn và `confirmed`.
Lời gọi lỗi thì Bước 7 nhả lượt (§4.4), nên không bị đếm, nhưng nhà cung cấp vẫn tính tiền: Anthropic tính cả request bị hủy và request bị từ chối; với bài bị cắt
(R4), token đã sinh vẫn bị tính. Khi mọi lời gọi đều lỗi (model cấu hình sai, effort sai, nhà cung cấp trả rác), Lan và mọi người khác bấm lại liên tục. Rate limit
`practice.answer` là 120 lần/phút mỗi người (`common/config/app-config.ts:110`). Thứ duy nhất chặn tiền lúc đó là giới hạn chi tháng của nhà cung cấp, mà research
ghi là "not instantaneous". Chi cho lời gọi lỗi không có trong §19.

**Đề xuất.** Tối thiểu: ghi vào §19, và cho API tình trạng hiện số lời gọi lỗi cùng chi phí của chúng trong ngày. Có chặn hay không là câu sản phẩm: **Q1**.

### R6 (Trung bình) — vòng đời job bộ ví dụ chưa đủ để build

**Vấn đề.** §10 (dòng 418-424) và B6E71 nói "job worker", trạng thái `queued`/`running`/`finished`/`failed`, nhưng thiếu:
- **Hạ tầng hàng đợi.** Hàng đợi có sẵn của content-pipeline gắn với tên hàng đợi của Content (`content-pipeline/jobs/job-types.ts:3`) và bảng `background_jobs` của
  Pipeline. Dùng lại thì `ai` ghi vào bảng của module khác (trái D3). Notifications tự dựng hàng đợi riêng (`notifications/scheduler/reminder-queue.service.ts:27-29`),
  nhưng hàng đợi đó chỉ chạy trong worker, còn ở đây API phải là bên thêm job.
- **Thêm job lỗi** (Redis tắt): `enqueue` có sẵn trả `false` (`content-pipeline/jobs/job-queue.service.ts:62-75`). Content-pipeline có bộ đối soát chạy lại job,
  `ai` thì không → lần chạy nằm ở `queued` mãi. B6E71 ("chạy khi worker lên") chỉ đúng nếu job đã vào Redis.
- **Worker chết giữa lần chạy** → `running` mãi; không ai chuyển nó sang `failed`.
- **BullMQ thử lại job** → chạy lại **mọi** ví dụ, tức tốn tiền hai lần.
- **Bản nháp** (`prompt: { instructions, examples }`, dòng 418) lưu ở đâu để worker đọc được và để so sánh sau này; dòng 420 chỉ ghi `prompt_revision` "(hoặc `draft`)".

**Đề xuất.** Hàng đợi riêng `ai-eval` trong `ai/eval/` (theo mẫu Notifications, thêm phía thêm job cho API), `attempts: 1`. Lưu bản nháp vào dòng `ai_eval_runs`.
Việc định kỳ: `queued` quá 10 phút thì thêm lại vào hàng đợi; `running` không cập nhật quá N phút → `failed` (giữ các ví dụ đã xong). Mỗi ví dụ xong ghi ngay vào
`items` để lần chạy dở vẫn đọc được.

### R7 (Trung bình) — `pnpm ai:fake-call` và các tiêu chí smoke

**Vấn đề.** Dòng 693: `pnpm ai:fake-call <op> <model> [--operation-id] [--parallel N]`.
- `<model>` không khớp `run()` (dòng 478): `run` dùng model đã chọn cho thao tác, không nhận model. Lệnh sẽ phải hoặc ghi đè `ai_operation_settings` (một đường ghi
  thứ hai ngoài API), hoặc có một tham số ẩn mà Bước 7 không có.
- Thiếu `--user` (bắt buộc với `purpose = learner`), thiếu cách truyền dữ liệu vào (B6#18 cần `word` 150 ký tự), thiếu `--purpose`.
- Giới hạn đồng thời đếm theo tiến trình (dòng 390), và lệnh này là một tiến trình riêng, nên B6#11 chỉ đúng khi hai lời gọi nằm trong **một** lệnh `--parallel 2`.
- B6#22 "đồng hồ +8 ngày", B6#23 "+25 giờ": API không có đồng hồ giả (`scripts/smoke-buoc-5.mjs:8`). Smoke phải lùi `expires_at` bằng SQL.
- B6#20 "chi phí model giả = 0": giá nằm trên dòng `ai_models` do admin gõ (dòng 274, 406), còn dòng 164 nói bản giả "kèm giá 0". Không gõ giá thì `cost_known = false`,
  không phải 0.
- Bản giả `fake:503-then-ok`, `fake:429-then-ok` cần nhớ "đây là lần thứ hai", nhưng ổ cắm không nhận mã thao tác hay số lần thử (dòng 149). Giá trị `retry-after`
  của `429-then-ok` chưa có (B6#6). `describeModel` của bản giả trả gì cũng chưa có.

**Đề xuất.** Ghi chữ ký lệnh: `pnpm ai:fake-call <op> --user <uuid> --data <json|@file> [--operation-id] [--parallel N] [--purpose learner|test]`, dùng model đã chọn.
Smoke chọn model qua API admin. Bản giả nhớ số lần gọi theo `(model, dấu vân tay dữ liệu)`, `retry-after` 1 giây; `describeModel('fake:*')` có thật với 9 tình huống
đã kể, giá đề xuất 0 khi thêm. Viết lại B6#22, B6#23 thành "lùi `expires_at` bằng SQL rồi `pnpm maintenance:run`".

### R8 (Trung bình) — `describeModel` không có thời gian chờ tối đa; mã model vào URL

**Vấn đề.** §4.3 (dòng 153-154) chỉ truyền `timeout` cho `call`. `describeModel` dùng mặc định của SDK là **10 phút** (cả hai SDK, kiểm trong phiên). Hệ quả: khi
nhà cung cấp treo, `POST /v1/admin/ai/models` cũng treo theo. `ai.models-refresh` chạy trong `runAll`, mà `runAll` chạy từng việc lần lượt
(`common/maintenance/maintenance.scheduler.ts:39-50`), nên mỗi model treo chặn các việc dọn dẹp khác tới 10 phút. `setInterval` không chờ lần trước xong, nên các lần chạy
có thể chồng lên nhau. Tiền lệ trong repo: `BILLING_ADAPTER_TIMEOUT_MS = 5_000` (`entitlements/entitlements.constants.ts:28`).
- Mã model admin gõ đi thẳng vào đường dẫn `GET /v1/models/{id}` có kèm key, mà dòng 271-276 không giới hạn ký tự.
- 401/403 (sai key, vùng không được hỗ trợ) lúc thêm model quy về mã lỗi nào thì chưa có.
- Dòng 59 nói MaintenanceScheduler chạy "trong tiến trình API". Thật ra worker cũng dựng toàn bộ `AppModule` (`src/worker.ts:11-13`), và hook bootstrap chạy trong worker
  (`content-pipeline/jobs/job-runner.service.ts:35-36` dựa vào đó). Nên việc định kỳ chạy ở cả hai tiến trình, và `models-refresh` gọi nhà cung cấp hai lần.

**Đề xuất.** Hằng số `AI_DESCRIBE_TIMEOUT_MS` (5 giây, `ASSUMPTION`), `maxRetries: 0`. Mã model chỉ nhận `^[A-Za-z0-9._:-]{1,100}$`. 401 → 409 `provider-not-configured`
(key sai), 403 → 503 `provider-unavailable`. Sửa dòng 59.

### R9 (Thấp) — ràng buộc "không giữ transaction" cho Bước 7 thiếu hai chỗ; số kết nối

- `SessionsService.current()` (route GET câu hiện tại) cũng gọi `advance()` trong transaction có `lockOpen` (`practice/sessions/sessions.service.ts:114-126`). Hàm này
  tạo câu mới khi câu đang chờ bị bỏ. §4.4 và §18 chỉ nhắc `next`.
- Mọi route có `@Idempotent()` chạy handler **bên trong** một transaction (`common/idempotency/idempotency.service.ts:30`, `:68`, `:80`). Nếu Bước 7 gọi AI từ một route
  như vậy (ví dụ lưu từ riêng sau khi tra nghĩa AI), lời gọi giữ một kết nối suốt 10–20 giây.
- Dòng 194 "50 lời gọi cùng lúc giữ 50 kết nối sẽ cạn pool": `PrismaPg` chỉ nhận `connectionString` (`common/db/prisma.module.ts:21`), và pool của node-postgres mặc
  định **10** kết nối (kiểm trong phiên). `ASSUMPTION`: adapter không đổi mặc định này. Ở mức 50 lời gọi cùng lúc, chính các transaction ngắn của Bước 5 (`maxWait` 5 giây)
  và các lần ghi của cổng đã tranh nhau 10 kết nối. Nên ghi vào §19 và mục Deploy.

### R10 (Thấp) — giới hạn `context_label` không khớp Content

Dòng 203 nói các con số "khớp giới hạn Content hiện có", nhưng `context_label` vào là ≤ 100 ký tự (dòng 213). Content nhận tới 2.000 ký tự
(`content/senses/senses.service.ts:58`; CSV `content-pipeline/upload/row-normalizer.ts:85`). Một nghĩa có nhãn 150 ký tự sẽ nhận `bad-input`, kết quả này được lưu 24 giờ,
và Lan không bao giờ có câu AI cho nghĩa đó. Đề xuất: lấy đúng 2.000, hoặc cổng tự cắt ngắn rồi gửi.

### R11 (Thấp) — luật chuẩn hóa chữ trả về

- Dòng 244 "luôn là chữ thường, không bao giờ diễn giải như HTML": ý là văn bản thuần (plain text), nhưng người implement có thể đọc thành "viết thường hết" (lowercase).
  Khi đó "The team will ___…" thành "the team will ___…". Nên viết "văn bản thuần (plain text), không phải HTML".
- Chuẩn hóa "bỏ ký tự điều khiển" chạy trước luật "không xuống dòng" (dòng 214) thì luật sau không bao giờ bắt được gì, vì ký tự xuống dòng là ký tự điều khiển. Cần nói thứ tự.
- Bỏ đáp án trùng (dòng 215, B6E49): có phân biệt `Deploy` và `deploy` không?
- Anthropic: "Structured outputs don't guarantee the capitalization of string `enum` … values" (kiểm trong phiên). `part_of_speech` = `Noun` sẽ thành `invalid-shape` (B6E52)
  dù đúng nghĩa. Nên đổi về chữ thường trước khi kiểm enum.

### R12 (Thấp) — chi tiết hàng đợi lời gọi

Dòng 388-392 chưa nói: lần thử lại nhanh **giữ** chỗ đang có hay xin chỗ mới (xin mới thì có thể chờ thêm trong quỹ); giới hạn đọc lại lúc nào (mỗi lần xin chỗ, B6E27).
B6E28 "tới 2 × giới hạn" thiếu các tiến trình CLI (`ai:fake-call`, `maintenance:run`) và nút chạy thử trong API. Đề xuất: giữ chỗ suốt cả hai lần thử; đọc giới hạn mỗi
lần xin chỗ và mỗi lần có chỗ trống.

### R13 (Thấp) — dữ liệu nạp sẵn và index

- Dòng 343: `saved_by` = "mã hệ thống `migration`", trong khi dòng 428 nói mọi `updated_by` là UUID. Nên dùng một UUID hệ thống cố định (repo có tiền lệ dạng
  `00000000-0000-4000-8000-000000000001`, `content/content.constants.ts:19`).
- Ba dòng `ai_operation_settings` (dòng 289): migration nạp sẵn với `model_ref = null`, `version = 0`? `PUT` lần đầu dùng `expected_version` nào?
- Dòng 438 `NULLS NOT DISTINCT`: Prisma schema không có cú pháp này. Repo đã có index unique viết bằng SQL trong migration mà không có trong schema (ví dụ
  `usage_records_live_use_key`, `prisma/migrations/20261019094400_entitlements/migration.sql:234`, không có trong `prisma/models/entitlements.prisma:128-153`) và CI kiểm
  lệch schema vẫn xanh. Nhưng một index unique *thường* (không có `WHERE`) trùng tên với `@@unique` thì chưa biết Prisma có báo lệch không (`ASSUMPTION`, chưa chạy). Cách
  an toàn: hai index một phần (`WHERE user_id IS NOT NULL` và `WHERE user_id IS NULL`), hoặc không lưu chạy thử và bộ ví dụ vào `ai_operations`, vì chúng không cần
  chống trùng.

### R14 (Thấp) — `deleteUserData` xóa nội dung theo thứ tự nào

`ai_call_contents` chỉ có khóa `call_id` (dòng 440), không có `user_id`. Muốn tìm nội dung của Lan phải đi qua `ai_calls.user_id`. Nếu hàm đặt `ai_calls.user_id = null`
trước (dòng 479, B6E68), nội dung không còn tìm được và chỉ mất khi hết hạn (tới 30 ngày). Như vậy B6#24 "không còn `ai_call_contents` của `u`" không kiểm được. Đề xuất: trong
một transaction, xóa nội dung qua join, rồi xóa `ai_operations`, cuối cùng đặt `user_id = null`. Hoặc thêm cột `user_id` vào `ai_call_contents`.

### R15 (Thấp) — lần ra lời gọi từ một câu bị báo sai

D11 giữ nội dung 7 ngày "để tra câu sai". Nhưng §18 (dòng 702-703) chỉ bắt Bước 7 lưu `meta` gồm model, effort, `prompt_revision`, `schema_version`, không có
`operation_id`. Khi Lan báo câu sai, admin không có mã để gọi `GET /v1/admin/ai/calls?operation_id=`. Đề xuất: thêm `operation_id` vào phần Bước 7 lưu. Riêng API tình
trạng (dòng 453), "lỗi gần nhất" lấy từ `ai_calls`. Các lý do không tạo dòng `ai_calls` (`busy`, `in-progress`, `ai-disabled`, `bad-input`) thì không hiện ở đó; nên ghi rõ
như vậy, hoặc đếm chúng riêng trong bộ nhớ.

### R16 (Thấp) — design ↔ nhật ký: còn quên, nhãn, tham chiếu chết

- **Quên.** Câu 8, phần "Claude sau đó" (nhật ký dòng 203-205): "khi đọc cài đặt model, API trả kèm giá ước tính mỗi lượt và '1.000 lượt/ngày ≈ X đ'". §12.1 API 2 và
  API 7 không có. Đây là cách để admin thấy tác động khi không có trần tiền (D10). Design Bước 5 §18 (dòng 940-941 của file đó) giao Bước 6 "đối chiếu sổ lượt với sổ chi phí
  theo `operation_id`"; design Bước 6 không làm cũng không ghi là không làm.
- **Tham chiếu chết.** Dòng 444-445 trỏ tới mock data ở mục "Design phần 2b" của nhật ký, nhưng nhật ký chỉ có một câu tóm tắt (dòng 428-430) và còn nói "8 bảng" trong khi
  design có 10. Dòng 6 trỏ tới decision record chưa có; theo `~/.claude/rules/decision-records.md`, file này phải viết trước khi sang `writing-plans`.
- **Nhãn.** D14 ghi "Chốt", nhưng chủ dự án giao cho Claude ("research xem cấu trúc … thì thiết kế placeholder cho phù hợp thôi", nhật ký dòng 254) và không bình luận phần
  cấu trúc. Chính nhật ký ghi "coi như duyệt cùng đề xuất" (dòng 268-269). Nên ghi "Đề xuất, đã duyệt". D18 ghi "làm luôn ở Bước 6" là Chốt, nhưng câu của chủ dự án có
  điều kiện ("Nếu có làm thì mình chọn phương án này", dòng 315); phần "làm luôn" là đề xuất của Claude (dòng 317), được duyệt cùng phần 3. ⚠7 ghi "đã duyệt 20/10
  (câu 7)", nhưng câu 7 hỏi ngày 19/10.

### R17 (Thấp) — sai nhỏ so với code và chữ

- Dòng 54: `refund(userId, pool, operationId, reportId)` có 4 tham số (`entitlements/entitlements.service.ts:73`).
- B6#10 dùng `entitlements.ai_enabled` (tên trong API), chỗ khác dùng `entitlements.aiEnabled` (tên lưu). Nên chọn một cách viết và nói rõ.
- B6E70 là việc phải làm trước ra mắt, không phải ca When → Then kiểm được; nên chuyển sang §18.
- `OPENAI_API_KEY=` để trống trong `.env` phải coi như không có key (theo mẫu `SMTP_USER || undefined`, `common/config/app-config.ts:235`). Nếu không, client được tạo
  với key rỗng và mọi lời gọi thành `auth-failed` thay cho `provider-not-configured`.
- `AI_FAKE_ENABLED` được chặn bằng một cờ tên "billing" (`BILLING_PRODUCTION`). Vẫn chạy được, nhưng nên ghi trong `.env.example` rằng cờ này là cờ "production" chung.
- `VALID_POS`, `MEANING_MAX`… có export ở `content/index.ts:1-5`. Nhưng khi Content (Bước 7) import `ai/index.ts` thì hai module import vòng lẫn nhau. Với `@Inject(AiService)`,
  lúc khai báo class có thể nhận `undefined`. Nên ghi cách import: chỉ hằng số, hoặc `ai` giữ bản sao kèm một unit test so khớp.

## 4. Câu hỏi cho chủ dự án

Theo luật "chủ dự án trả lời trước": mỗi câu chỉ có bối cảnh, ràng buộc và các phương án; không phương án nào được đánh dấu đề xuất. Claude đề xuất sau khi có câu trả lời.

### Q1 (R5) — lời gọi AI lỗi vẫn tốn tiền: có cần đếm hay chặn không?

**Bối cảnh.** Lan bấm "Câu tiếp", AI trả câu sai khuôn. Lan thấy "chưa tạo được", lượt được trả lại, nhưng app vẫn trả tiền cho lời gọi đó (khoảng 8đ với model rẻ,
khoảng 160đ với model tầm giữa). Trần 1.000 lượt/ngày của Bước 5 chỉ đếm lượt đang giữ hoặc đã dùng; lượt đã trả lại không tính. Nếu một cấu hình sai làm **mọi** lời
gọi lỗi (ví dụ R4) và người học cứ bấm lại, tiền chỉ dừng khi chạm giới hạn chi tháng trên trang nhà cung cấp, mà research ghi là "not instantaneous".

**Ràng buộc.** D10: không có trần tiền trong app. §4.1: `ai` không gọi Entitlements. §3: không làm circuit breaker.

**Phương án.**
- (a) Chấp nhận. Ghi vào §19; API tình trạng hiện số lời gọi lỗi và chi phí lỗi trong ngày để admin tự theo dõi.
- (b) Cổng đếm số lời gọi nhà cung cấp trong ngày (giờ Việt Nam, thành công hay lỗi). Vượt một cài đặt mới (ví dụ `ai.daily_provider_calls`) thì lời gọi của người học
  nhận "chưa dùng được", như khi công tắc tắt.
- (c) Chỉ cảnh báo: API tình trạng bật cờ khi số lời gọi lỗi trong ngày vượt một ngưỡng, không chặn gì.

### Q2 (R4) — số token ra tối đa của mỗi thao tác do ai đặt?

**Bối cảnh.** Số này là trần độ dài của một câu trả lời, **gồm cả phần model nghĩ thầm**. Nó cũng là trần tiền của một lời gọi: số càng lớn thì lời gọi đắt nhất càng đắt.
Design cố định trong code: 1.200 cho tạo câu và tra nghĩa, 800 cho dịch câu. Ví dụ: admin chọn `claude-haiku-5-5` effort `high` cho "Tạo câu"; model nghĩ khoảng 1.100
token rồi bị cắt ở 1.200. Lan thấy "chưa tạo được" lần này qua lần khác, và mỗi lần app vẫn trả tiền. OpenAI khuyên chừa ít nhất 25.000 token khi mới thử model có nghĩ
thầm. Với effort thấp hoặc tắt nghĩ thầm, 1.200 là đủ.

**Ràng buộc.** D6, D22: model và effort do admin chọn cho từng thao tác. Chưa có màn hình (D8); mọi ô mới đều qua API.

**Phương án.**
- (a) Giữ cố định trong code như design, thêm lý do riêng "bị cắt vì hết token" để nút chạy thử và trang tình trạng chỉ ra.
- (b) Thêm ô "số token ra tối đa" vào lựa chọn của từng thao tác (cạnh model và effort). Admin chỉnh trong một khoảng cho phép, mặc định như hiện tại.
- (c) Code tự chọn theo effort bằng một bảng cố định (ví dụ tắt nghĩ thầm → 1.200, `low` → một số lớn hơn, …), admin không chỉnh.

## 5. Kiểm chứng tài liệu nhà cung cấp

Đọc trong phiên ngày 20/10/2026. "OK" = khớp design; "Lệch" = khác hoặc thiếu so với design; "Chưa kiểm được" = trang không nói.

| # | Dữ kiện design dựa vào | Kết quả | Nguồn |
|---|---|---|---|
| 1 | OpenAI Responses: `instructions` là lời dặn hệ thống; `input` nhận message `role: user` | OK ("A system (or developer) message inserted into the model's context") | https://developers.openai.com/api/reference/resources/responses/methods/create |
| 2 | `text.format` = `{ type: "json_schema", name, strict: true, schema }` | OK (guide có `name` trong ví dụ) | https://developers.openai.com/api/docs/guides/structured-outputs |
| 3 | `reasoning.effort`: `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`; mỗi model một phần | OK ("model-dependent… Some models support only a subset") | https://developers.openai.com/api/docs/guides/reasoning |
| 4 | `max_output_tokens` gồm token nghĩ thầm; bị cắt → `status: incomplete`, `reason: max_output_tokens` | OK; tài liệu còn khuyên chừa ≥ 25.000 token (R4) | như #3 |
| 5 | `incomplete_details.reason` chỉ có `max_output_tokens` | **Lệch**: còn `max_messages`, `content_filter`, `steered` (R3) | như #1 |
| 6 | `store` mặc định `true`, phải gửi `false` | OK ("Defaults to true when omitted") | như #1 |
| 7 | Từ chối = phần content `type: "refusal"` | OK | như #1, #2 |
| 8 | `safety_identifier` là tham số có sẵn (design không gửi) | OK | như #1 |
| 9 | Lỗi OpenAI: hết tiền / giới hạn chi = `provider_quota`, 429 = thử lại | **Lệch / thiếu**: hết tiền và giới hạn chi cũng là 429, phân biệt bằng `error.code` (`credit_balance_exhausted`, `organization_spend_limit_exceeded`, `project_spend_limit_exceeded`, `organization_usage_limit_exceeded`); 503 `server_is_overloaded` (R3) | https://developers.openai.com/api/docs/guides/error-codes |
| 10 | OpenAI: model không tồn tại → lỗi lúc gọi | **Chưa kiểm được**: trang lỗi không có mục 404 | như #9 |
| 11 | OpenAI `GET /v1/models/{model}` chỉ có `id`, `created`, `object`, `owned_by`, `shutdown_date` | OK; không có trường effort hay khả năng | https://developers.openai.com/api/reference/resources/models/methods/retrieve |
| 12 | Anthropic Messages: `system`, `messages[0]` user, `max_tokens` bắt buộc | OK (`max_tokens` là tham số duy nhất không có `optional`) | https://platform.claude.com/docs/en/api/messages/create |
| 13 | `output_config.format` = `{ type: "json_schema", schema }`; `output_config.effort` `low`…`max` | OK | như #12; https://platform.claude.com/docs/en/build-with-claude/structured-outputs |
| 14 | `thinking: { type: "disabled" }` tắt nghĩ thầm; chặn lúc lưu theo `disabled.supported` là đủ | **Lệch một phần**: Haiku 5.5 `disabled` + `xhigh`/`max` → 400; Sonnet 5.5 cần `between_tools`; Opus 5.5 không tắt được (R4) | https://platform.claude.com/docs/en/api/errors; https://platform.claude.com/docs/en/api/models/retrieve |
| 15 | `stop_reason` `refusal`, `max_tokens` | OK; còn `end_turn`, `stop_sequence`, `tool_use`, `pause_turn`, `model_context_window_exceeded` chưa được quy (R3) | như #12 |
| 16 | Token: vào / cache / ra / nghĩ thầm | OK: `input_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`, `output_tokens`, `output_tokens_details.thinking_tokens` | như #12 |
| 17 | `metadata.user_id` có sẵn (design không gửi) | OK | như #12 |
| 18 | Anthropic `GET /v1/models/{id}`: `capabilities.effort`, `capabilities.thinking.types`, `max_tokens`, `lifecycle`, `retires_at` | OK; thêm: `capabilities` có thể `null`; `xhigh` có thể `null`; có `structured_outputs`, `deprecated_at`, `max_input_tokens` (R4) | https://platform.claude.com/docs/en/api/models/retrieve |
| 19 | Lỗi Anthropic quy theo status | **Lệch**: giới hạn chi tự đặt → 400 `invalid_request_error`; trần chi theo tier → 429 không `retry-after`; billing → 402 `billing_error`; 404 `not_found_error`; 504 `timeout_error`; 529 `overloaded_error` (R3) | https://platform.claude.com/docs/en/api/errors |
| 20 | Khuôn: không `minLength`/`maxLength`, không ràng buộc số, `minItems` chỉ 0/1, `additionalProperties: false` | OK; thêm: hoa thường của enum không bảo đảm (R11) | https://platform.claude.com/docs/en/build-with-claude/structured-outputs |
| 21 | SDK `openai`: `maxRetries` mặc định 2, `0` tắt (chung hoặc từng request); `timeout` mặc định 10 phút, chỉnh từng request; `signal` hủy request | OK | https://github.com/openai/openai-node |
| 22 | SDK `@anthropic-ai/sdk`: `maxRetries` mặc định 2, `0` tắt; `timeout` mặc định 10 phút (tăng theo `max_tokens`), chỉnh từng request | OK; không có lớp lỗi riêng cho 402 | https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript |
| 23 | SDK Anthropic nhận `signal` từng request | **Chưa kiểm được** trên trang chính thức (README và trang SDK không nói; có `fetchOptions` theo từng request). Plan nên kiểm kiểu `RequestOptions` sau khi cài, hoặc chỉ dựa vào `timeout` | như #22; https://github.com/anthropics/anthropic-sdk-typescript |
| 24 | Phiên bản: `openai` 7.39.0, `@anthropic-ai/sdk` 0.135.0 | OK (bản `latest` trên npm hôm nay) | https://registry.npmjs.org/openai/latest; https://registry.npmjs.org/@anthropic-ai%2Fsdk/latest |
| 25 | (R9) pool của node-postgres mặc định 10 kết nối | OK ("By default this is set to 10") | https://node-postgres.com/apis/pool |
