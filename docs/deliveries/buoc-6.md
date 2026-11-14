# Bước 6 — plan tóm tắt (20/10/2026)

Ảnh chụp lúc duyệt plan (chủ dự án duyệt 20/10/2026, kèm phụ lục A và con số 16.000); đã cập nhật sau review plan
([`../superpowers/reviews/2026-10-20-buoc-6-plan-review.md`](../superpowers/reviews/2026-10-20-buoc-6-plan-review.md)). Plan đầy đủ:
[`../superpowers/plans/2026-10-20-buoc-6-ai-integration.md`](../superpowers/plans/2026-10-20-buoc-6-ai-integration.md); design:
[`../superpowers/specs/2026-10-20-buoc-6-ai-integration-design.md`](../superpowers/specs/2026-10-20-buoc-6-ai-integration-design.md).
Plan **chỉ có API** (D8); màn hình admin chủ dự án tự làm sau. Không gọi thật nhà cung cấp trong "Xong khi" (D19).

Cách làm: các phiên Claude implement song song, một phiên điều phối (D20); giữ mức **tối đa 4–5 phiên** của chủ dự án (19/10): ba phiên
implement và phiên điều phối, phiên điều phối tự chạy phần kiểm cuối. "Xong khi": xong mọi task, CI xanh trên mọi PR, `pnpm smoke:buoc-6`
chạy qua API và worker thật trên DB mới với bản giả (B6#1–B6#30; B6#19 và B6#26 kiểm bằng unit test).

**Chia phiên:**
- **step-6-A — Nền móng, ba thao tác, model:** task 1, 2, 3 (merge trước tiên vì hai phiên kia chờ nó), rồi 4, 5, 6, rồi 13, 14.
- **step-6-B — Bộ nối nhà cung cấp, rồi bộ ví dụ:** task 7, 8, 9; sau đó 16, 18 khi bộ chạy (task 12) đã merge.
- **step-6-C — Bộ chạy, rồi các API bên trên:** task 10, 11, 12; sau đó 15, 17, 19.
- **step-6-coordinator (phiên điều phối):** merge plan sau khi duyệt; mở step-6-A, rồi step-6-B và step-6-C (khi PR A1 đã merge) thành phiên con;
  merge các PR, báo phiên đang chờ; cuối cùng tự làm task 20 (kiểm cuối).

**Chốt sau review plan** (chủ dự án trả lời trước, Claude đề xuất sau):
- **D26:** plan không chốt ngôn ngữ lời dặn, vì lời dặn sửa được trong admin; bản nạp ban đầu chỉ là điểm khởi đầu, viết tiếng Anh; câu chặn do code giữ viết tiếng Anh.
- **D27:** level không bắt buộc: có level thì dặn câu không khó hơn level đó, không có thì không nhắm trình độ nào.
- **D28:** ô số token vẫn để trống được với model Anthropic không cho biết số tối đa; khi đó gửi 16.000 (chủ dự án xác nhận khi duyệt plan).

**Chọn kỹ thuật trong plan** (design không ghi; ghi vào design khi xong; đánh số như plan):
1. Bộ nối trả về chữ thô; cổng tự đọc JSON.
2. Sổ chi phí ghi kết quả từng lần gọi bằng một bộ chữ cố định; câu trả lời sai khuôn được ghi là "sai khuôn".
3. Lần gọi của chạy thử và bộ ví dụ ghi mã của admin đã bấm.
4. Nhận dạng "hết tiền / chạm giới hạn chi" theo đúng câu lỗi trên trang chính thức của hai nhà cung cấp; 429 khác của Anthropic là "quá nhiều lời gọi".
5. Lệnh thử AI trên máy có thêm lệnh con "xóa dữ liệu AI của một người".
6. Lời dặn ban đầu nằm trong code và trong một migration với cùng chữ; một unit test giữ hai bản khớp nhau.
7. Hàng đợi bộ ví dụ nối Redis có giới hạn thời gian như hàng đợi CSV; worker như hàng đợi nhắc học.
8. `.env.example` bật sẵn bản giả cho máy local; code mặc định vẫn tắt; hai key để trống.
9. Thông tin model lưu thành cột; "chưa biết các mức effort" lưu như "không có mức nào"; "tắt thinking" đổi sang đúng kiểu của model lúc gọi.
10. Mỗi lần chạy bộ ví dụ lưu sẵn tham số đã chốt, bản prompt dùng và danh sách ví dụ lúc bấm; chỉ chạy đúng danh sách đó.
11. Unit test so hằng số với Content cho các hằng số Content có export; giới hạn 2.000 ký tự của nhãn ngữ cảnh chỉ chép kèm ghi chú.
12. Đổi tên trường log có chữ `token`/`code`.
13. Ví dụ thứ 101 của một thao tác bị từ chối bằng lỗi kiểm dữ liệu thường.
14. Kết quả "đang chạy" không kèm lý do.
15. Báo cáo chi phí mặc định là hôm nay; khoảng dài hơn 366 ngày bị từ chối.
16. Tình huống giả "lỗi rồi được" lỗi ở mọi lần gọi lẻ.
17. Kết quả đã quá 24 giờ bị xóa ngay lúc đọc.
18. Trần lời gọi đặt bằng 0 thì báo "chưa dùng được" không kèm giờ thử lại.
19. Mã thao tác hoặc mã người dùng sai dạng là lỗi lập trình của bên gọi (ném lỗi), không phải một kết quả AI.
20. Có chỗ trong hàng đợi mà còn dưới 2 giây thì trả "bận", không gọi.
21. Chạy bộ ví dụ khi chưa có ví dụ nào bị từ chối; đọc lại model trả lỗi như lúc thêm; tra lời gọi của một mã không có thì trả danh sách rỗng; id không có thì trả 404.
22. Thêm vài hằng số cố định (độ dài ghi chú, giá tối đa, dạng mã thao tác, cận trên số token khi không biết, số 16.000 của D28).
23. Dịch vụ AI có thêm hàm "chạy thử một lần" cho lệnh thử AI trên máy.

**Đã duyệt (20/10/2026):** plan, kèm lời dặn + ví dụ ban đầu (phụ lục A của plan) và con số 16.000 của D28.

**M1 — Nền móng (luồng A, B, C)**
1. Thêm nhóm cài đặt `ai` (thời gian chờ, số lời gọi cùng lúc, trần lời gọi mỗi ngày, số ngày giữ nội dung, tỷ giá).
2. Thêm cấu hình key OpenAI/Anthropic và cờ bản giả (chặn khi production), giới hạn `ai.test` 20 lần/giờ, cài hai thư viện chính thức đã chốt phiên bản.
3. Tạo 10 bảng của AI kèm ba dòng lựa chọn ban đầu (chưa có model), các kiểu dữ liệu chung, hằng số cố định và module rỗng.
4. Định nghĩa ba thao tác: luật dữ liệu vào, khuôn JSON gửi nhà cung cấp, cách chuẩn hóa và kiểm câu trả lời.
5. Luật lưu prompt (lời dặn, tối đa 10 ví dụ đúng khuôn), cách ráp lời dặn + ví dụ + câu chặn, dấu vân tay của dữ liệu.
6. Nạp lời dặn ban đầu (đã duyệt) bằng migration và bộ đọc prompt hiện tại / theo lần sửa.
7. Ổ cắm chung cho nhà cung cấp, sổ đăng ký và bản giả với 10 tình huống.
8. Bộ nối OpenAI: ráp lời gọi, quy mọi lỗi theo bảng, đọc thông tin model, không để biến môi trường đổi địa chỉ gửi; kiểm bằng phản hồi mẫu, không gọi mạng.
9. Bộ nối Anthropic: như trên, gồm thinking, effort và đọc khả năng của model.

**M2 — Phần lõi (luồng D, E, F, G)**
10. Luật của bộ chạy: xử lý dòng đã có, thử lại nhanh một lần, quy kết quả và có lưu hay không, chọn số token gửi đi; tính chi phí và ước tính; hàng đợi lời gọi cùng lúc.
11. Đọc lựa chọn của thao tác, kiểm "dùng được không" (công tắc, model, key, trần lời gọi theo ngày giờ Việt Nam), ghi sổ chi phí và nội dung.
12. Bộ chạy đủ 8 bước (chống trùng 24 giờ, giành dòng, thời gian chờ là số nguyên, thử lại, kiểm khuôn trước khi ghi sổ) và dịch vụ cho module khác: kiểm dùng được không, gọi AI, chạy thử một lần, xóa dữ liệu theo người.
13. Danh sách model: thêm (kiểm mã, hỏi nhà cung cấp), sửa giá, đọc lại, xóa (chặn khi đang dùng, 404 khi không có), luật effort/thinking/số token; API admin.
14. Chọn model, effort, thinking, số token cho từng thao tác, có chống ghi đè và lịch sử; API admin.
15. API prompt: xem, lưu (chống ghi đè, lịch sử), xem lịch sử, chạy thử chữ đang sửa trên tối đa 5 ví dụ.
16. Bộ ví dụ: thêm/sửa/xóa ví dụ, chạy cả bộ ở worker qua hàng đợi riêng, ghi từng ví dụ ngay khi xong.
17. API tình trạng (dùng được không, lỗi gần nhất, số lời gọi hôm nay, cảnh báo model sắp ngừng), báo cáo chi phí, các lần gọi của một mã.
18. Bốn việc mỗi giờ: xóa kết quả hết hạn, xóa nội dung hết hạn, đọc lại thông tin model (mỗi dòng một lần), cứu lần chạy bộ ví dụ bị kẹt.
19. Lệnh thử AI trên máy (`pnpm ai:fake-call`, chạy song song, cùng hoặc khác mã, chạy thử, xóa dữ liệu một người) cho smoke.

**M3 — Kiểm cuối (luồng Z)**
20. Script `pnpm smoke:buoc-6` đi đủ B6#1–B6#30 và một cuộc đua 10 lời gọi cùng mã, chạy hai lần trên DB mới; CI xanh; ghi as-built.

# Bước 6 — as-built (20/10/2026)

Design: [`2026-10-20-buoc-6-ai-integration-design.md`](../superpowers/specs/2026-10-20-buoc-6-ai-integration-design.md) (ghi chú as-built ở cuối mục 2);
decisions D1–D29: [`2026-10-20-buoc-6-ai-integration-decisions.md`](../superpowers/decisions/2026-10-20-buoc-6-ai-integration-decisions.md); plan:
[`2026-10-20-buoc-6-ai-integration.md`](../superpowers/plans/2026-10-20-buoc-6-ai-integration.md). **Chỉ API** (D8); màn hình admin chủ dự án tự làm sau.
**Không có lần gọi AI thật nào trong "Xong khi" (D19):** mọi lần chạy dùng bản giả, hai key để trống.

**Trạng thái:** 20 task đã vào `dev`; mỗi PR CI xanh (4/4 job) trước khi merge. Chưa lên `main`. Làm bằng ba phiên Claude song song do chủ dự án tạo
(step-6-A, step-6-B, step-6-C) và phiên điều phối (D20), không dùng Codex.

| PR | Phiên | Nội dung |
|---|---|---|
| [#82](https://github.com/quangtienngo661/english-flashcard/pull/82) | điều phối | Docs: plan, review plan, D26–D28, plan tóm tắt; ghi việc chủ dự án duyệt plan (kèm phụ lục A và 16.000) |
| [#84](https://github.com/quangtienngo661/english-flashcard/pull/84) A1 | A | Task 1–3: nhóm cài đặt `ai`, cấu hình và rule `ai.test`, hai SDK (`openai` 7.39.0, `@anthropic-ai/sdk` 0.135.0), 10 bảng (migration `20261020071131_ai`), kiểu, hằng số, module rỗng |
| [#86](https://github.com/quangtienngo661/english-flashcard/pull/86) D1 | C | Task 10: luật của bộ chạy, thử lại nhanh, chi phí, hàng đợi lời gọi cùng lúc |
| [#85](https://github.com/quangtienngo661/english-flashcard/pull/85) C1 | B | Task 7: ổ cắm `AiAdapter`, sổ đăng ký, bản giả 10 tình huống |
| [#87](https://github.com/quangtienngo661/english-flashcard/pull/87) B1 | A | Task 4–6: ba thao tác, luật prompt và dấu vân tay, lời dặn ban đầu (migration `20261020072259_ai_initial_prompts`) và bộ đọc prompt |
| [#88](https://github.com/quangtienngo661/english-flashcard/pull/88) E1 | A | Task 13–14: danh sách model và lựa chọn cho từng thao tác, API admin |
| [#89](https://github.com/quangtienngo661/english-flashcard/pull/89) D2 | C | Task 11–12: lựa chọn, "dùng được không", sổ chi phí; bộ chạy 8 bước và `AiService` |
| [#90](https://github.com/quangtienngo661/english-flashcard/pull/90) G1 | B | Task 16, 18: bộ ví dụ (hàng đợi `ai-eval`, job worker), bốn việc mỗi giờ |
| [#91](https://github.com/quangtienngo661/english-flashcard/pull/91) F1 | C | Task 15, 17, 19: API prompt và chạy thử, tình trạng, chi phí, các lần gọi; `pnpm ai:fake-call` |
| [#92](https://github.com/quangtienngo661/english-flashcard/pull/92) | điều phối | **Ngoài plan, D29:** ghi vào design và decision record |
| [#93](https://github.com/quangtienngo661/english-flashcard/pull/93) C2 | B | Task 8–9: bộ nối OpenAI và Anthropic; D29 (từ chối khởi động khi đặt `*_CUSTOM_HEADERS`) |
| Z1 | điều phối | Task 20: `pnpm smoke:buoc-6`, output, as-built này, ghi chú as-built trong design |

Thứ tự merge thật: A1, D1, C1, B1, E1, D2, G1, F1, D29 docs, C2. C2 merge sau cùng vì chờ câu D29 của chủ dự án; D2 không cần C2 (chỉ cần C1, B1).
Phiên điều phối tự gỡ xung đột một dòng B1–C1 ở `ai.module.ts` (gộp hai danh sách provider), chạy build và 1514 test trên bản gộp rồi push lên nhánh B1.
Các xung đột `ai.module.ts` sau đó do từng phiên gỡ khi merge `dev` trước khi mở PR.

**Số test:**
- Unit API: **1896** (131 file) trên `dev` @ `0125d63` (sau C2) và trên nhánh Z1; cuối Bước 5 là 1338. Theo PR (trên nhánh hoặc bản gộp với `dev` lúc mở
  PR): A1 1355, C1 1386, B1 1401, D1 1437, E1 1562, D2 1664, G1 1713, F1 1794, C2 1896.
- Không có e2e backend (D38 Bước 4). Lần cuối trên Z1: lint 0 lỗi (1 cảnh báo cũ ở `mail-dispatcher.service.ts`), `tsc --noEmit` 0, build qua.

**"Xong khi" (design §17):**
1. CI xanh trên mọi PR (#82, #84–#93; Z1 khi mở).
2. `pnpm smoke:buoc-6` qua API và worker thật (`pnpm run:dev`), mỗi lần trên database mới `english_learning_smoke_b6`, `JOB_QUEUE_PREFIX=wordmet-b6-smoke`,
   `AI_FAKE_ENABLED=true`, không key:
   - lần 1: **passed**, 32 bước, 134 giây (run id `e8de5343`);
   - lần 2, database tạo lại: **passed**, 32 bước, 133 giây (run id `35cce6c4`).
   Output đầy đủ: [`buoc-6-smoke-output.txt`](buoc-6-smoke-output.txt). Log API của hai lần: 0 dòng mức `error`; không có lời dặn, dữ liệu hay câu trả lời
   nào (tìm `Lan will`, `hoàn thành`, `translation_vi`, `instructions`: 0 dòng). Đối chứng: mỗi lần có 13 dòng `ai_call` (7 dòng chạy thử ở API, 6 dòng bộ ví
   dụ ở worker; lời gọi qua CLI ghi log ở tiến trình CLI). Các dòng `warn` `ECONNREFUSED` chỉ có trong lúc B6#30 cố ý tắt Redis.

Smoke kiểm B6#1–B6#30 theo thứ tự plan, trừ B6#19 và B6#26 (unit test của Task 8–9), đọc lại bằng `psql`:
- **Chạy đua (Review Focus 1):** 10 lời gọi cùng một mã thao tác → đúng 1 dòng `ai_calls`; kết quả `{"in_progress":7,"succeeded":3}` ở lần 1, 6/4 ở lần 2
  (các `succeeded` sau lần đầu là kết quả đã lưu). B6#27: `fake:slow` hai lời gọi cùng mã → một `timeout`, một `in_progress`, đúng 1 dòng.
- **Thời gian:** `fake:slow` → `timeout` sau 10.141 / 10.132 ms, không thử lại (B6#4); hàng đợi 1 chỗ → lời gọi thứ hai `busy` sau 10.134 / 10.175 ms,
  không dòng `ai_calls` (B6#11); `fake:429-then-ok` chờ `retry-after` 1 giây rồi `succeeded` (B6#6).
- **Trần mỗi ngày (B6#28):** trần = số lời gọi hôm nay + 2 → lời gọi thứ ba `daily-call-cap` với `retry_after_seconds` tới 0 giờ Việt Nam; chạy thử vẫn chạy.
- **Redis tắt (B6#30):** `POST /eval/runs` vẫn 202 `queued`; bật lại Redis, lùi `created_at` 11 phút, `maintenance:run` → lần chạy `finished`.
- **Quyền (B6#25):** `editor` nhận 403 ở cả 21 route của §12.1, không thay đổi gì.

Script được sửa một lần trước khi qua, lỗi của script: B6#3 gọi lại cùng mã với dữ liệu khác nên nhận `input-mismatch` (đúng hành vi của cổng, design
§8.1); script giờ gửi lại đúng dữ liệu cũ. Smoke chạy không có `.env` (hook chặn ghi file secret từ script): runner lấy cấu hình không bí mật từ
`.env.example`, sinh secret trong shell và không in ra. Mỗi lần chạy có 7 lần `ECONNRESET` được gửi lại (kết nối keep-alive bị đóng sau 5 giây, như Bước 5).

**Chỗ lệch plan đã chấp nhận** (chi tiết trong body từng PR):
- A1: thêm tay `NOT NULL` cho `effort_levels` và `example_ids` (Prisma không sinh cho cột list; kiểm drift vẫn rỗng); lockfile thêm peer key của
  next/vitest vì SDK kéo `@opentelemetry/api`, không gói nào đổi version.
- B1: ví dụ `lookup_word` 0 câu → `empty`, 3 câu → `too-long` (không có mã riêng cho số câu); thêm `define-operation.ts` để tránh import vòng; `clean()`
  bỏ ký tự điều khiển trước rồi mới trim; seed bỏ `\r` (`core.autocrlf=true`, repo không có `.gitattributes`).
- C1: bản giả gọi với model `fake:*` lạ → `model_rejected` / 404, không throw.
- D1: `RunOutcome` là union theo `kind`, chặt hơn plan. Đã kiểm điều plan ghi "chưa kiểm": fake timers của vitest 4 có đẩy `performance.now()`.
- D2: sổ chi phí ghi `ai_calls` và `ai_call_contents` trong một `$transaction` hai lệnh **sau** lời gọi, giờ lấy từ `Clock`; trần trống thì không đếm; test và
  bộ ví dụ không đọc công tắc và trần (design §8.1 bước 3). Test "hết hạn chót → timeout" viết lại ở lần thử 2, vì plan choice 20 làm lần 1 không thể hết giờ.
  Thêm `ConcurrencyLimit` để `CallQueue` đọc giới hạn mới nhất.
- E1: ước tính "lời gọi đắt nhất" = số tối đa của model, không biết thì 16.000 với Anthropic, `null` ("không biết") với OpenAI (design §6.6); service tự
  kiểm lại body nên B6E96 bị chặn trước `describeModel`; tắt thao tác (`model_ref` null) thì effort và thinking phải null; `PUT` trả dòng đã sửa.
- G1: thêm `eval-runs.repository.ts` (câu SQL có điều kiện của job, test bằng bộ nhớ như Task 12); lỗi job chỉ lưu tên và mã lỗi, không lưu message.
- F1: `OPERATION_ID_PATTERN` export qua `ai/index.ts` để CLI không import vào trong module; `cost_usd` của API calls 8 chữ số thập phân; CLI từ chối
  `--operation-id` cùng `--purpose test`.
- C2: đặt tường minh thêm các tùy chọn SDK tự đọc từ môi trường: OpenAI `adminAPIKey`, `webhookSecret` = `null`; Anthropic `webhookKey` = `null`,
  `openTelemetry: false` (chưa chứng minh được tác dụng, vì app không có tracer). **D29** (ngoài plan, chủ dự án chọn (d)).

**Rủi ro còn mở** (đủ ở design §19):
- **Chưa có lần gọi thật nào** (D19): bộ nối OpenAI và Anthropic chỉ được kiểm bằng phản hồi mẫu; mã lỗi thật của OpenAI khi model không tồn tại lúc gọi vẫn
  là `ASSUMPTION` (404). Nên chạy thử sớm với key thật: điền key vào `.env`, thêm model, bấm chạy thử (`POST /v1/admin/ai/prompts/{op}/test`).
- **D29:** ai đặt `OPENAI_CUSTOM_HEADERS` / `ANTHROPIC_CUSTOM_HEADERS` (khác rỗng) thì API, worker và CLI không khởi động; thông báo nêu tên biến.
- Không có trần tiền (D10), số token trống = không giới hạn (D25), giá gõ tay, hàng đợi đếm theo tiến trình, pool database 10 kết nối, chất lượng tiếng Việt
  chưa đo: như design §19. Việc SDK Anthropic nhận `signal` theo request (§19 ghi "chưa kiểm được") plan đã kiểm trên kiểu của SDK 0.135.0.

**Bước 7 phải làm** (design §4.4, §18):
- Gọi theo luồng §4.4: mã thao tác cố định cho mỗi câu hỏi (id dòng chờ câu), `isReady` trước `reserve` của Bước 5, `in_progress` và `input-mismatch` **không**
  nhả lượt, đọc kết quả `confirm`; không tự thử lại; mã `#2` dùng đúng một lần.
- Tách lời gọi AI ra khỏi transaction của `SessionsService.next()` và `current()`; không gọi `ai.run` từ handler `@Idempotent()`.
- Đổi `AiResult` thành lỗi cho người học (`ai-unavailable` 503 của Bước 5, kèm `retry-after`); đặt mã cho "đang tạo" và "chưa tạo được".
- Lưu câu AI vào `practice_questions` kèm `operation_id` và `meta`; Content lưu gợi ý tra nghĩa chỉ khi người học bấm lưu.
- Bước 8 gọi `ai.deleteUserData(userId)`; màn hình admin của AI (D8) và các việc trước ra mắt ở design §18.
