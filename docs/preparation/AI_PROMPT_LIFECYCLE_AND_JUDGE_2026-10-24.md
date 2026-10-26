# Improvement: vòng đời prompt trên admin và vị trí của LLM-as-judge (ghi 24/10/2026)

Trạng thái: **ghi chú context, chưa brainstorm, chưa chốt**; mục C12 của [`IMPROVEMENT_IDEAS_2026-10-23.md`](IMPROVEMENT_IDEAS_2026-10-23.md).
Bổ sung cho [`AI_EVAL_DASHBOARD_2026-10-24.md`](AI_EVAL_DASHBOARD_2026-10-24.md) (C11): C11 lo **chấm và đo** (golden set, grader, dashboard); file này lo **ai được đổi
prompt, đổi thế nào cho an toàn, và judge nằm ở đâu trong hệ thống**. Khi làm thật, đi theo chuỗi `brainstorming` → design → decisions → plan như mọi Bước.

Nguồn: trao đổi của chủ dự án với Claude ngày 24/10/2026 khi học phần Evals (lộ trình AI Engineer, giai đoạn 2), đối chiếu với design Bước 6
(`docs/superpowers/specs/2026-10-20-buoc-6-ai-integration-design.md`) và Bước 7 (`docs/superpowers/specs/2026-10-21-buoc-7-practice-ai-content-ai-design.md`).
Hiện trạng dưới đây đọc từ **design và delivery**, chưa đọc lại code; con số là `ASSUMPTION` trừ chỗ ghi khác.

## 1. Ý tưởng gốc

Chủ dự án là chủ hệ thống: theo dõi dashboard chất lượng AI trên admin, và khi cần thì **sửa prompt ngay trên UI**, không phải sửa code rồi deploy.
Điều kiện để việc này an toàn: mỗi lần sửa vẫn đi qua cùng kỷ luật eval như khi prompt nằm trong repo (golden set, held-out, so với bản đang chạy, bật dần, quay lại được).

## 2. Hiện trạng liên quan

| Chỗ | Hiện trạng | Nguồn |
|---|---|---|
| Sửa prompt | Đã sửa trong admin (D12). Mỗi thao tác một lời dặn + tối đa 10 ví dụ mẫu; dữ liệu đi riêng dạng JSON (D14) | Bước 6 §7.1–7.2 |
| Phiên bản | **Không có phiên bản để bật/tắt** (D15). Lưu = ghi đè `ai_prompts` + thêm một dòng `ai_prompt_revisions`, **có hiệu lực ở lần gọi kế tiếp**. Quay lại = đọc lịch sử rồi lưu lại chữ cũ | Bước 6 §7.3 |
| Chạy thử | `POST /v1/admin/ai/prompts/{op}/test`: chạy ngay bản đang sửa trên tối đa 5 ví dụ, `purpose = test`, không lưu gì | Bước 6 §7.4 |
| Bộ ví dụ | `ai_eval_examples` (không có đáp án mong đợi), `ai_eval_runs` chạy ở worker hàng đợi `ai-eval`, chạy được cả bản nháp; **không ngưỡng, không chặn** (D18); máy chỉ kiểm khuôn, thời gian, chi phí | Bước 6 §10; C11 G1–G2 |
| Tra ngược | Mỗi kết quả AI ghi `prompt_revision`; câu AI trong Practice lưu `ai_meta` (model, effort, `prompt_revision`, `schema_version`) và `call_operation_id` | Bước 6 §5.5; Bước 7 §7.7 |
| Lớp bảo vệ trên đường người học | Khuôn trả về (structured output) + luật Practice sau khi AI trả (dạng hợp lệ của từ, câu không chứa sẵn từ) → sai thì viết lại `#2` → vẫn sai thì đổi sang câu không AI | Bước 7 §7.2 |
| Tạo trước | `POST /v1/practice/sessions/{id}/prepare` tạo trước tối đa K câu AI (`practice.ai_prefetch_count`, mặc định 2) | Bước 7 |
| Phản hồi thực tế | Báo lỗi + trả lượt (`practice_reports`), dạng chia lạ (`practice_unknown_forms`), nội dung lời gọi giữ 7 ngày (`ai_call_contents`) | Bước 7 §9–10; Bước 6 §9 |
| Trần lời gọi | Trần lời gọi mỗi ngày đếm **mọi `purpose`** (cả `test`, `eval`) | Bước 6 §8.5 |

## 3. Nguyên tắc rút ra từ trao đổi 24/10 (context, chưa phải quyết định)

1. **Judge không nằm trên đường trả kết quả cho người học** theo mặc định. Đường đó chỉ có kiểm tra bằng code (khuôn, luật Practice) vì nhanh, rẻ, tất định.
   Judge thêm một lời gọi LLM mỗi câu (chậm, tốn gấp đôi) và tự nó cũng có sai số, nên không đủ tin để chặn từng câu.
2. **Judge là một module backend**, không phải việc chấm thủ công qua app chat. Cùng một module được gọi ở ba nơi:
   - eval offline khi chỉnh prompt (bộ ví dụ, CI nếu có) — nơi dùng nhiều nhất;
   - pipeline batch khi sinh nội dung hàng loạt (nếu sau này có);
   - **online eval**: worker nền lấy mẫu câu AI đã phục vụ người học để chấm, theo dõi chất lượng theo thời gian.
3. **Admin là nơi phát hiện và ra lệnh, không phải nơi bỏ qua eval.** Thấy chất lượng giảm → đọc trace → đưa ca lỗi vào bộ ví dụ → sửa prompt → eval (dev, held-out)
   → bật dần → theo dõi. Sửa thẳng rồi lưu (như D15 hiện nay) có thể sửa được lỗi này mà làm hỏng chỗ khác mà không biết.
4. **Judge cần bộ nhãn riêng để hiệu chỉnh**: mỗi mẫu là một *output đã sinh* + nhãn đạt/không đạt do người chấm cho **một tiêu chí**. Khác với bộ ví dụ của prompt sinh câu
   (đầu vào + tiêu chí mong đợi). Đo riêng tỉ lệ cho qua đúng và tỉ lệ bắt đúng lỗi; chưa đủ khớp thì sửa judge, chưa hiệu chỉnh thì kết quả judge chỉ để tham khảo.
5. **Mỗi tiêu chí chấm đạt/không đạt**, mỗi judge một tiêu chí, có ví dụ đạt/không đạt; tiêu chí rút từ lỗi thật (error analysis).
   Lưu ý: C11 E3 đang ghi "thang điểm 1–5"; hai hướng này cần thống nhất khi brainstorm.
6. **Golden set "cố định" trong một lần so sánh, lớn dần theo phiên bản**; tách held-out (không dùng khi chỉnh prompt, chỉ chạy ở mốc, chỉ xem số tổng).

## 4. Khoảng trống so với hướng "admin configuration an toàn"

| # | Khoảng trống | Hệ quả |
|---|---|---|
| P1 | Lưu prompt = có hiệu lực ngay (D15), không có bản nháp tách khỏi bản đang chạy | Một lần sửa vội đi thẳng tới mọi người học |
| P2 | Không có cổng eval trước khi bản mới chạy (D18) | Không biết bản mới tốt hơn hay tệ hơn bản đang chạy |
| P3 | Không bật dần (canary / % người học) | Không so được hai bản trên traffic thật |
| P4 | Quay lại = lưu lại chữ cũ bằng tay | Chậm khi có sự cố; tạo thêm một revision "giả mới" |
| P5 | Bộ ví dụ không có khái niệm dev / held-out | Dễ chỉnh prompt cho khớp đúng bộ ví dụ (overfit) mà không biết |
| P6 | Không có judge, không có bộ nhãn hiệu chỉnh judge | Tiêu chí ngữ nghĩa (câu tự nhiên, chỉ một đáp án) chỉ đo bằng đọc tay |
| P7 | Không có online eval trên câu AI đã phục vụ | Chất lượng thực tế chỉ thấy qua báo lỗi (ít, lệch) |
| P8 | Prompt của judge (nếu có) cũng cần vòng đời và hiệu chỉnh riêng | Đổi prompt judge mà không đo lại thì số trên dashboard mất ý nghĩa |

## 5. Hướng thiết kế để brainstorm (phác thảo, chưa chốt)

### 5.1 Vòng đời một bản prompt

```
nháp ──Chạy eval──► đã đánh giá ──Publish──► canary (x% người học) ──Mở 100%──► đang chạy
  ▲                     │ dưới ngưỡng                 │ chỉ số xấu                    │ có bản mới
  └──── sửa tiếp ◄──────┘                            └──► Rollback một cú bấm ◄─────┘──► lưu trữ
```

- Revision vẫn **bất biến** (giữ cách `ai_prompt_revisions` đang làm); thêm trạng thái cho revision, hoặc một bảng triển khai riêng, ví dụ:
  `ai_prompt_deployments(operation, active_revision, canary_revision, canary_percent, updated_by, updated_at)`.
- `ai.run` hỏi "revision nào cho request này": người học thuộc nhóm canary theo **hash ổn định của user id** (không đổi giữa các lần gọi), còn lại dùng `active_revision`.
- Publish chỉ cho revision có lần chạy eval gần nhất đạt ngưỡng (hoặc chỉ cảnh báo — đổi D18 hay không là quyết định mở).
- Rollback = đặt lại `active_revision` / bỏ `canary_revision`, không tạo revision mới.
- Nhật ký: ai publish / rollback, lúc nào, kèm `eval_run_id`.

### 5.2 Bộ ví dụ có dev / held-out

- Thêm `split` (`dev` / `heldout`) và tiêu chí mong đợi (C11 E2) vào `ai_eval_examples`; thêm `version` cho cả bộ để biết hai lần chạy có so được không.
- Màn chạy eval: dev hiện chi tiết từng ví dụ; held-out **chỉ hiện số tổng** theo tiêu chí. Ví dụ held-out đã bị mở ra xem thì chuyển sang dev.

### 5.3 Judge đi qua chính cổng AI

- Mỗi judge là **một thao tác AI** (ví dụ `judge_single_answer`, `judge_natural`) qua cùng gateway Bước 6: có model riêng (nên **khác** model sinh câu, theo research
  ở Bước 7 §20 và bias tự ưu ái), prompt riêng, sổ chi phí riêng. Có thể cần một `purpose` mới (ví dụ `judge`) để tách chi phí.
- Bộ nhãn hiệu chỉnh: bảng mới (ví dụ `ai_judge_labels`: output, tiêu chí, nhãn người chấm, người chấm, thời điểm); màn admin chấm tay; một lần "chạy hiệu chỉnh" tính tỉ lệ
  cho qua đúng / bắt đúng lỗi và gắn với revision của prompt judge.
- Prompt judge dùng chung vòng đời §5.1, nhưng cổng của nó là **độ khớp với nhãn người**, không phải bộ ví dụ.

### 5.4 Online eval

- Worker nền (hàng đợi riêng hoặc job định kỳ) lấy mẫu câu AI trong `practice_questions` (`source = ai`): một phần ngẫu nhiên để có số đại diện, cộng 100% câu bị báo lỗi
  để tìm lỗi (hai nhóm báo riêng, vì nhóm báo lỗi lệch).
- Tăng tỉ lệ lấy mẫu cho revision đang canary để so với `active_revision` nhanh hơn.
- Kết quả lên dashboard C11 theo `prompt_revision`, model, thao tác.
- Phải tính: chỉ đọc được nội dung trong 7 ngày (`ai_call_contents`) → chấm trong cửa sổ đó; câu về **từ riêng** của người học (D26) có thể phải loại khỏi mẫu hoặc
  khỏi việc chép vào bộ ví dụ; lời gọi judge **ăn vào trần lời gọi mỗi ngày** (đếm mọi `purpose`, Bước 6 §8.5) → cần trần riêng hoặc tách đếm.

### 5.5 Một chỗ có thể đặt judge "trên đường" mà người học không phải chờ

Câu AI được **tạo trước** qua `prepare` (K câu). Nếu muốn chặn câu tệ trước khi người học thấy, judge có thể chạy ngay sau luật Practice trong lúc tạo trước:
đạt → câu sẵn sàng; không đạt → viết lại hoặc đổi câu không AI. Đánh đổi: gấp đôi chi phí mỗi câu AI, tăng thời gian của `prepare` (người học có thể gặp "đang chuẩn bị"
nhiều hơn), và sai số của judge có thể loại câu tốt. Đây là lựa chọn, không phải mặc định.

### 5.6 Quy trình khi dashboard báo chất lượng giảm (đích đến của thiết kế)

1. Xác định nguyên nhân bằng cách đọc trace: judge chấm sai / đầu vào đổi / model nhà cung cấp đổi / prompt yếu ở một kiểu trường hợp.
2. Lỗi nặng → rollback hoặc tắt dạng AI (công tắc đã có) trong lúc sửa.
3. Đưa 15–20 ca lỗi tiêu biểu vào bộ ví dụ (tăng version, chia một phần vào held-out), chạy lại bản đang chạy để có mốc mới.
4. Sửa prompt (bản nháp) → eval dev → held-out; kiểm cả nhóm lỗi mới lẫn các nhóm cũ (không tụt).
5. Publish canary → so trên online eval → mở 100%.
6. Ghi decision record / ghi chú ngắn: thấy gì, sửa gì, số trước và sau.

## 6. Edge cases cần viết When → Then khi lên design (gợi ý danh sách, theo `SPEC_WRITING_CONVENTIONS.md`)

- Publish revision mới khi người học đang trong phiên và đã có câu tạo trước bằng revision cũ: câu cũ vẫn dùng (đã ghi `prompt_revision`) hay bỏ?
- Chống trùng 24 giờ theo dấu vân tay không gồm prompt (B6E23): cùng mã thao tác trả lại kết quả của revision cũ → online eval phải gán theo `prompt_revision` thật của kết quả, không theo revision đang active.
- Canary đổi % giữa chừng: người học đổi nhóm → hash ổn định nghĩa là chỉ người ở rìa đổi nhóm; có chấp nhận không.
- Rollback khi một lần chạy eval của revision đó còn đang chạy.
- Hai admin publish cùng lúc (giống `expected_revision` của §7.3).
- Model của thao tác đổi trong lúc canary: so sánh revision bị lẫn với so sánh model.
- Lần chạy eval bị lỗi một phần (Bước 6 §10 giữ ví dụ đã xong): có được dùng làm cổng publish không.
- Prompt judge đổi sau khi đã có số trên dashboard: đánh dấu điểm gãy trên biểu đồ.
- Công tắc AI tắt hoặc chạm trần trong lúc online eval chạy.

## 7. Câu hỏi mở cho chủ dự án (chủ dự án trả lời trước, Claude đề xuất sau, theo quy tắc của repo)

1. Prompt nên tiếp tục sửa trên admin có vòng đời (§5.1), quay về file trong repo đi qua CI, hay kết hợp (repo là nguồn, admin chỉ publish / rollback)?
2. Cổng eval khi publish: chặn hay chỉ cảnh báo (đụng D18 Bước 6)? Ngưỡng theo tiêu chí là bao nhiêu?
3. Có bật dần theo % người học không, hay publish thẳng sau eval?
4. Judge: có dùng không, cho những tiêu chí nào, model nào, trần chi phí riêng ra sao (và có tách khỏi trần lời gọi mỗi ngày không)?
5. Thang chấm: đạt/không đạt theo từng tiêu chí, hay thang điểm như C11 E3?
6. Online eval: tỉ lệ lấy mẫu, có chấm câu về từ riêng không, chạy liên tục hay theo ngày?
7. Có đặt judge trong `prepare` (§5.5) cho dạng AI nào không?
8. Làm trước hay sau ra mắt; phụ thuộc gì vào lần gọi AI thật đầu tiên (C10, C11 E1) và đợt làm lại admin UI?

## 8. Phụ thuộc và thứ tự hợp lý (gợi ý để bàn)

- Trước hết cần dữ liệu thật: C11 E1 (gọi AI thật, đọc tay đầu ra) → error analysis → tiêu chí.
- C11 E2–E3 (bộ ví dụ có tiêu chí, grader) là nền cho cổng eval ở §5.1.
- Judge (§5.3) cần bộ nhãn người trước khi được dùng làm cổng.
- Vòng đời prompt (§5.1) và online eval (§5.4) có ý nghĩa nhất khi đã có người học thật.

Tài liệu học liên quan ngoài repo (máy của chủ dự án, không bắt buộc): `E:\Working\ai-engineer\02-evals\` (`kien-thuc.md`, `golden-set.md`, `quy-trinh-eval.md`, `cac-loai-eval.md`).
