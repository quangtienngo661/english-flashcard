# Bước 7 — plan tóm tắt (21/10/2026)

Plan: [`../superpowers/plans/2026-10-21-buoc-7-practice-ai-content-ai.md`](../superpowers/plans/2026-10-21-buoc-7-practice-ai-content-ai.md) (23 task, 8 mốc; phụ lục A là prompt).
Design: [`../superpowers/specs/2026-10-21-buoc-7-practice-ai-content-ai-design.md`](../superpowers/specs/2026-10-21-buoc-7-practice-ai-content-ai-design.md).
Chỉ API; "Xong khi" = CI xanh trên mọi PR + `pnpm smoke:buoc-7` với AI giả trên DB mới (D3). Làm bằng các phiên song song + một phiên điều phối (D4).
Chủ dự án duyệt plan và bốn prompt ở phụ lục A, không đổi gì (21/10/2026).

> Viết trước plan đầy đủ theo yêu cầu của chủ dự án (21/10), rồi đối chiếu lại với plan: khớp, trừ task 4 được gộp vào task 2 (một migration cho cả Practice và
> Content). Số thứ tự dưới đây là số task trong plan.

## Mốc 1 — Nền (cài đặt, dữ liệu, kiểu)

1. Thêm cài đặt "số câu AI tạo trước" (mặc định 2, admin chỉnh 0–20).
2. Thêm bảng và cột của Practice: chỗ đang chờ của phiên, nguồn câu, thông tin lời gọi AI, "đã trừ lượt chưa", yêu cầu tạo câu, lý do báo lỗi (7 lý do ban đầu), dạng chia chưa biết, kết quả kiểm từ riêng.
3. Mở rộng kiểu dữ liệu của câu hỏi cho ba dạng mới, gợi ý nấc 3, bản dịch; các hằng số cố định.
4. (Gộp vào task 2) Thêm nguồn "AI gợi ý" cho từ riêng và bảng dạng chia bổ sung ở Content.

## Mốc 2 — Cổng AI

5. Thêm ba thao tác AI mới (câu chọn nghĩa, trắc nghiệm theo câu, kiểm từ riêng) với khuôn, luật và bản AI giả.
6. Nạp prompt ban đầu cho ba thao tác mới và bản prompt mới của điền từ (không đè bản admin đã sửa); sửa test kiểm prompt nạp sẵn.

## Mốc 3 — Content

7. Cho Practice đọc thêm loại từ, level, bản nội dung, dạng chia của nhiễu, nghĩa khác của cùng từ, nghĩa ngẫu nhiên, dạng chia bổ sung.
8. API cho staff nhận và gỡ dạng chia bổ sung.
9. Lưu gợi ý AI thành từ riêng kèm câu ví dụ và nhãn "AI gợi ý"; cho sửa câu ví dụ của từ riêng.
10. API "Tra bằng AI" (trừ lượt tra nghĩa, trả gợi ý kèm nghĩa catalog nếu có).

## Mốc 4 — Tạo câu AI (Practice)

11. Luật chọn dạng: từ nào làm được dạng nào, đánh dấu câu AI lúc mở phiên, số câu AI của phiên, ngân sách câu AI, xác suất ở vòng sau.
12. Dựng dữ liệu gửi AI và kiểm câu AI trả về (dạng hợp lệ, không lộ từ, nhiễu đúng danh sách), dựng câu hỏi từ kết quả.
13. Bộ tạo câu AI: yêu cầu tạo câu, kiểm sẵn sàng, kiểm từ riêng, giữ lượt, gọi AI, viết lại một lần, ghi câu có khóa, xác nhận lượt, chạy lại sau sự cố.
14. Tìm và dùng lại câu AI chưa từng hiện (cùng nội dung, nhiễu còn thấy được).

## Mốc 5 — Phiên luyện

15. Mở phiên có dạng mới: chặn Free, kiểm AI sẵn sàng, đánh dấu câu AI, kiểm đủ lượt trước.
16. `next` và `current` mới: chỗ đang chờ, "đang chuẩn bị", AI không dùng được, Thử lại, đổi sang dạng không AI, bài từ câu đã lưu.
17. API tạo trước K câu AI.
18. Gợi ý 3 nấc, bản dịch sau khi nộp, đáp án đúng của dạng mới trong lịch sử và kết quả.

## Mốc 6 — Báo lỗi và trả lượt

19. Danh sách lý do báo lỗi: API admin quản lý, API người học đọc theo loại câu.
20. Báo lỗi theo lý do: kiểm lý do và ghi chú bắt buộc, che từ riêng cho mọi dạng có lựa chọn, đồng ý khi báo câu AI của từ riêng; API "Báo lỗi của tôi".
21. Xác nhận lỗi câu AI và trả lượt (chỉ khi câu đã bị trừ), ghi vai trò người xử lý; danh sách trả lượt cho admin.
22. API cho staff xem và bỏ qua dạng chia chưa biết.

## Mốc 7 — Dọn dữ liệu

23. Job mỗi giờ giữ câu AI chưa từng hiện, xóa yêu cầu cũ, thử lại trả lượt; xóa từ riêng xóa yêu cầu và kết quả kiểm trước.

## Mốc 8 — Cổng "Xong khi"

24. Script `pnpm smoke:buoc-7` (chọn model giả cho các thao tác), chạy lại smoke Bước 4–6, ghi bản as-built.

# Bước 7 — as-built (21/10/2026)

Design: [`2026-10-21-buoc-7-practice-ai-content-ai-design.md`](../superpowers/specs/2026-10-21-buoc-7-practice-ai-content-ai-design.md) (ghi chú as-built ở cuối mục 2);
decisions D1–D34: [`2026-10-21-buoc-7-practice-ai-content-ai-decisions.md`](../superpowers/decisions/2026-10-21-buoc-7-practice-ai-content-ai-decisions.md); plan:
[`2026-10-21-buoc-7-practice-ai-content-ai.md`](../superpowers/plans/2026-10-21-buoc-7-practice-ai-content-ai.md). **Chỉ API** (D2). **Không có lần gọi AI thật nào
trong "Xong khi" (D3):** mọi lần chạy dùng bản giả, hai key để trống.

**Trạng thái:** 23 task đã vào `dev` (task 4 gộp vào task 2), cùng một PR sửa lỗi do smoke tìm ra; mỗi PR CI xanh (4/4 job) trước khi merge. Chưa lên `main`.
Làm bằng ba phiên Claude song song do chủ dự án tạo (step-7-A, step-7-B, step-7-C) và phiên điều phối (D4). Chủ dự án duyệt plan và bốn prompt ở phụ lục A,
không đổi gì (21/10/2026).

| PR | Phiên | Nội dung |
|---|---|---|
| [#104](https://github.com/quangtienngo661/english-flashcard/pull/104) | điều phối | Docs: plan, plan tóm tắt, code facts; ghi việc chủ dự án duyệt plan và phụ lục A |
| [#105](https://github.com/quangtienngo661/english-flashcard/pull/105) A1 | A | Task 1–3: cài đặt `practice.ai_prefetch_count`, bảng và cột của Practice và Content (migration `20261022090000_buoc7_practice_ai`, 7 lý do báo lỗi), kiểu và hằng số |
| [#106](https://github.com/quangtienngo661/english-flashcard/pull/106) B1 | B | Task 5–6: ba thao tác AI mới, bản giả, prompt ban đầu và `generate_cloze` bản 2 (migration `20261022091000_buoc7_ai_operations`); `smoke:buoc-6` đọc revision hiện tại |
| [#107](https://github.com/quangtienngo661/english-flashcard/pull/107) C1 | B | Task 7–8: Content đọc thêm cho Practice; bảng dạng chia bổ sung và API staff |
| [#108](https://github.com/quangtienngo661/english-flashcard/pull/108) D1 | A | Task 11–12: luật chọn dạng, ngân sách câu AI; dữ liệu gửi AI, kiểm câu AI trả về, dựng câu hỏi |
| [#109](https://github.com/quangtienngo661/english-flashcard/pull/109) C2 | B | Task 9–10: lưu gợi ý AI thành từ riêng kèm câu ví dụ; `POST /v1/lookup/ai` |
| [#110](https://github.com/quangtienngo661/english-flashcard/pull/110) F1 | C | Task 19–21: lý do báo lỗi, báo lỗi theo lý do (che từ riêng, đồng ý), xác nhận lỗi và trả lượt, danh sách trả lượt |
| [#111](https://github.com/quangtienngo661/english-flashcard/pull/111) D2 | A | Task 13–14: bộ tạo câu AI, ba repository, câu AI chưa từng hiện |
| [#112](https://github.com/quangtienngo661/english-flashcard/pull/112) G1 | C | Task 22–23: danh sách dạng chia chưa biết; job mỗi giờ; xóa từ riêng khóa và xóa yêu cầu trước |
| [#113](https://github.com/quangtienngo661/english-flashcard/pull/113) E1 | A | Task 15–16: mở phiên có dạng AI (`AiSessionPlanner`), `next`/`current` với chỗ đang chờ |
| [#114](https://github.com/quangtienngo661/english-flashcard/pull/114) E2 | A | Task 17–18: `POST /v1/practice/sessions/:id/prepare`; gợi ý 3 nấc, bản dịch, đáp án của dạng mới |
| [#115](https://github.com/quangtienngo661/english-flashcard/pull/115) | A | **Ngoài plan:** sửa lỗi smoke tìm ra (thông báo đổi dạng khi `prepare` đã lỗi) và chỉ trả lý do công khai (2 commit: test trước, sửa sau) |
| Z1 | điều phối | Task 24: `pnpm smoke:buoc-7`, output, as-built này, ghi chú as-built trong design |

Thứ tự merge thật: #104, A1, B1, C1, D1, C2, F1, D2, E1, G1, E2, #115. Task 22 chuyển từ F1 sang G1 (phiên điều phối, 21/10): nó cần repository của Task 13 (D2) và
`knownWordForms` của Task 8 (C1); D2 đã cần C1 nên G1 không phải chờ thêm. G1 xanh trước E1 nhưng được merge sau E1, để E1 (nằm trên đường găng) khỏi phải
chạy CI lại. Phiên điều phối tự gỡ hai xung đột `practice.module.ts` (D2 với F1; G1 với E1: giữ provider của cả hai bên), chạy lint, `tsc`, build và toàn bộ unit
test trên bản gộp (2335 và 2382 test) rồi push lên nhánh của PR.

**Số test:**
- Unit API: **2402** (178 file) trên `dev` @ `c1d5feb` (sau #115) và trên nhánh Z1; trên `dev` trước Bước 7 (@ `669f10e`) là 2092 (151 file). Theo PR
  (trên nhánh, hoặc bản gộp với `dev` lúc mở PR): A1 2100, B1 2134, C1 2157, D1 2209, C2 2186, F1 2283, D2 2233, G1 2348, E1 2369, E2 2381, #115 2402.
- Không có e2e backend (D38 Bước 4). Lần cuối trên Z1: lint 0 lỗi (1 cảnh báo cũ ở `mail-dispatcher.service.ts`), `tsc --noEmit` 0, build qua.

**"Xong khi" (design §18):**
1. CI xanh trên mọi PR (#104–#115; Z1 khi mở).
2. `pnpm smoke:buoc-7` qua API và worker thật (`pnpm run:dev`), mỗi lần trên database mới `english_learning_smoke_b7`, `JOB_QUEUE_PREFIX=wordmet-b7-smoke`,
   `AI_FAKE_ENABLED=true`, không key:
   - lần 1 (head của #115, cây giống hệt `c1d5feb`): **passed**, 30 bước, 139 giây;
   - lần 2, database tạo lại, `dev` @ `c1d5feb`: **passed**, 30 bước, 138 giây.
   Output đầy đủ: [`buoc-7-smoke-output.txt`](buoc-7-smoke-output.txt).
3. Smoke các bước trước trên `dev` @ `c1d5feb`, mỗi cái trên database mới, API và worker khởi động lại: `smoke:buoc-4` **passed** (20 phiên, 44 câu trả lời,
   29 giây); `smoke:buoc-5` **passed** ở cả hai chế độ (fetchState ON 218 giây, OFF 232 giây); `smoke:buoc-6` **passed** (32 bước, 123 giây; B6#1 thấy
   `generate_cloze` ở revision 2).

Log API của lần chạy thứ hai: 1 dòng mức `error` là bước B7E117 cố ý (503 `ai-unavailable` / `model-not-set` khi mở phiên), 1 dòng `warn`
`ai_operation_lost` là bước Review Focus 2 cố ý (lần chạy đầu bị chiếm chỗ). Không có câu, nghĩa hay bản dịch nào trong log (tìm chữ của bản giả `Lan will`,
`Lan sẽ`, `Hôm nay Lan`, `nghĩa giả`, và `meaning_vi`, `translation_vi`, `rizz`, nghĩa của từ riêng: 0 dòng). Đối chứng: 50 dòng `ai_call`, 12 dòng mang
`ai_request` / `ai_state`.

Smoke đi AC1–AC12 theo thứ tự, rồi Review Focus 1–5, B7E57, B7E60, B7E117, B7E98, đọc lại bằng `psql`:
- **AC1:** `ai_planned` 5, câu AI ở vị trí 2, 4, 6, 8, 10, mỗi câu AI do `prepare` tạo xong trước khi bấm Tiếp; 87 → 82 lượt; 5 dòng `use` đã xác nhận.
- **AC2:** phiên thứ hai dừng ở câu 4 rồi bị bỏ; phiên thứ ba dùng lại 2 câu AI chưa hiện (0 lượt) và tạo 3 câu mới.
- **AC4:** AI lỗi trong phiên trộn, có và không có `prepare` → câu đổi sang gõ từ, `ai-fallback` (`ai_reason: ai-failed`) đúng một lần, 0 lượt, không gọi AI lại.
- **AC5, AC6:** phiên chỉ AI → `ai_unavailable` / `ai-failed`; `next` không cờ không gọi AI; `retry_ai` → câu AI. Dạng sai (`fake:bad-form`) bị loại hai lần,
  ghi `practice_unknown_forms` (2 lần); editor nhận dạng → danh sách ẩn nó, câu sau qua.
- **Review Focus 1:** 5 lần `next` cùng lúc trên một chỗ → 1 câu, 1 yêu cầu, 1 dòng `use` (kết quả `{"question":1,"preparing":4}`).
- **Review Focus 2:** máy chủ chết giữa lần tạo được giả lập: lần `next` đầu treo ở lời gọi AI (`fake:slow`) với input đã lưu và lượt đã giữ; lùi `updated_at`
  3 phút → lần `next` sau chiếm chỗ với đúng mã yêu cầu và `ai_input` cũ; 1 dòng `use`.
- **Review Focus 3:** xóa từ riêng giữa `prepare` và `next` → `psql` không còn câu, yêu cầu, kết quả kiểm hay lần hỏi nào của từ đó.
- **Review Focus 4, 5:** câu được giao miễn phí (`ai_charged = false`, đặt bằng `psql` vì bản giả không tạo được ca này) bị xác nhận lỗi → không có dòng `credit`;
  staff thấy từ riêng trong lựa chọn chỉ dưới dạng che, từ riêng được hỏi chỉ khi người học đồng ý.

Script được sửa trước khi qua: lần chạy đầu (của subagent, trên bản gộp `dev` + E2 + G1) có 28/30 bước; hai bước fail là **lỗi thật**: khi `prepare` đã lỗi cho
một từ, `next` đổi dạng nhưng không gửi `ai-fallback` / `word-not-recognized` (design §6.5 A, §6.6, B7E113). Sửa ở #115, cùng việc chỉ trả lý do công khai
(`rejected` → `ai-failed`, design §6.6). Sau đó script siết lại: AC6 đòi `reason: ai-failed`. Smoke chạy không có `.env` (hook chặn ghi file secret từ script):
runner lấy cấu hình không bí mật từ `.env.example`, sinh secret trong shell và không in ra. Mỗi lần chạy có 2 lần `ECONNRESET` được gửi lại (như Bước 5–6).

**Chỗ lệch plan đã chấp nhận** (chi tiết trong body từng PR):
- A1: `reports.service.ts` (của track C) sửa tạm để compile vì `reason_label` bắt buộc; `label_en` của 7 lý do do Claude viết (design chỉ có tiếng Việt, admin sửa
  được); thêm CHECK `practice_reports.question_source IN ('rule','ai','own_sentence')`.
- D1: `availableTypes` nhận thêm `extra?` có `clozeSource`; `aiQuestion` nhận input có tag; `pickMcqForm` trả thêm `senses`; `checkMeaning` trả `unknownForms`;
  `revealsWord` dò từng dạng một.
- D2: repository có thêm `get`, `stopSessionAi`; `findUnseen(db, content, args)`; `pickUnseen` chọn câu cũ nhất (không ngẫu nhiên); `ai_input` lưu
  `{senseRevisionId, contentKey, type, data, wrong | form}`.
- E1: phần AI của mở phiên tách thành `AiSessionPlanner`; `check_private_word` chỉ cần sẵn sàng khi có từ riêng đã đánh dấu mà chưa kiểm với nội dung hiện tại;
  `formKey` của Practice chuẩn hóa như `inflectionFormKey` của Content (trim, gộp khoảng trắng, NFC, chữ thường).
- E2: `prepare` chỉ xét K từ AI kế tiếp ở vòng 1 khi còn ngân sách, đếm từ đã có câu (chưa hiện, đang tạo, đã có yêu cầu) vào `already_ready`, không đặt
  chỗ đang chờ.
- C2: `PATCH /v1/my-words` cho `senses[].meaning` thành tùy chọn (mỗi mục cần `meaning` hoặc `examples`); `POST /v1/lookup/ai` trả 200.
- F1: `AdminReportsController` đổi gốc thành `admin/practice` (URL cũ giữ nguyên); `weak-words.ts` bỏ cả báo cáo `confirmed` (design §8); `reason_label` lưu
  theo ngôn ngữ của người học (`ASSUMPTION`: người học `en` → staff thấy nhãn tiếng Anh; staff vẫn có mã `reason`); danh sách trả lượt phân trang theo
  `resolved_at` giảm dần.
- G1: đọc và bỏ qua dạng chưa biết ở service riêng; dòng đã nhận bị **ẩn** chứ không xóa (plan Task 8; design §10/B7E96 ghi "xóa"), nên một trang có thể ít
  dòng hơn `page_size`; `deleteForSenses` khóa phiên → yêu cầu (`FOR UPDATE`) → lần hỏi.

**Rủi ro và việc còn mở** (design §20 vẫn đúng; thêm):
- **Chưa gọi AI thật** (D3): chất lượng câu và tỉ lệ bị luật loại chưa đo; chủ dự án tự chạy với key của mình (design Bước 6 §19).
- **Hiệu năng mở phiên:** chọn `meaning_in_sentence` tốn một query `practiceOtherSenses` cho mỗi từ (tối đa 50). Chưa đo.
- **Smoke chưa đi qua:** B7E5/B7E6 (AI tắt, chạm trần), B7E11, B7E12/B7E33 (xác nhận muộn ở G), B7E13/B7E14 (`ai_stopped` giữa phiên), B7E20, B7E40,
  B7E61/B7E125 (người học `en`), B7E74, B7E77 (job thử lại `refund`), B7E106/B7E108, B7E110/B7E119, B7E122, B7E126–B7E129. Các ca này có unit test; chạy
  thật thì chưa.
- **Review Focus 2 là giả lập**, không tắt tiến trình thật; cuộc đua khác ngoài Review Focus 1 và 3 chỉ có unit test.
- **Khoảng hở refund đã đóng:** từ lúc F1 merge tới lúc G1 merge, `refund` lỗi chưa có job thử lại; G1 đã vào.
- Chưa có giao diện (D2); `dev` → `main` chỉ mở khi chủ dự án yêu cầu.
