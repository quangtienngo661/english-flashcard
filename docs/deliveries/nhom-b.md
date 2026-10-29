# Nhóm B (chất lượng AI) — plan tóm tắt (29–30/10/2026)

Plan: [`../superpowers/plans/2026-10-29-nhom-b.md`](../superpowers/plans/2026-10-29-nhom-b.md) (một plan, làm tuần tự M1 → M6, rồi phần đóng đợt). Design:
[`../superpowers/specs/2026-10-29-nhom-b-chat-luong-ai-design.md`](../superpowers/specs/2026-10-29-nhom-b-chat-luong-ai-design.md). Mỗi milestone một nhánh từ `dev`, PR vào
`dev` khi CI xanh. Bản này viết lại 30/10/2026 sau review plan (đánh số task mới) và sau các chốt D37–D40.

## M1 — Bộ ví dụ (golden set)

1. Hàm thuần: kiểu dữ liệu, kiểm ô mong đợi, chia dev / held-out, thống kê lần chạy.
2. Setting tỉ lệ held-out (mặc định 30%).
3. Bảng phiên bản bộ ví dụ, bảng kết quả từng ví dụ, migration chuyển dữ liệu cũ (ví dụ cũ vào dev).
4. Kết quả chạy thành dòng có ảnh chụp; bỏ cột Json cũ.
5. Cổng luật cho eval; job eval ghi kết quả luật và ô mong đợi.
6. Content tra dạng từ theo lemma; Practice cung cấp luật cho eval.
7. API ví dụ: split, ô mong đợi, nguồn, che held-out, điền sẵn dạng từ, tạo ví dụ từ module khác.
8. Chốt phiên bản, mở ví dụ held-out (chuyển sang dev), danh sách id bị che.
9. Chạy eval trên phiên bản đã chốt; kết quả chia dev / held-out.
10. So hai lần chạy cùng phiên bản.
11. Che held-out ở trang Các lần gọi và nút chạy thử.
12. Admin: client API và ô mong đợi trong hộp thoại ví dụ.
13. Admin: trang eval có dòng held-out, nút mở, chốt phiên bản, danh sách phiên bản.
14. Admin: nhập hàng loạt có cột ô mong đợi và split.
15. Admin: chạy trên phiên bản; hiện kết quả luật và ô mong đợi.
16. Admin: màn so hai lần chạy.
17. Admin: trang Các lần gọi, ô tỉ lệ held-out, e2e giả lập và e2e thật.
18. Smoke `smoke:nhom-b` phần M1.
19. Kiểm toàn bộ M1.

## M2 — Vòng đời cấu hình

1. Bảng cấu hình, con trỏ bản đang chạy, sự kiện publish / rollback; cờ ẩn của model (D40).
2. Luật cổng publish dạng hàm thuần (bản đang chạy chưa có model thì không cần mốc, D37).
3. Nháp: đọc, tạo, lưu (chặn ví dụ mẫu lệch), xóa, chạy thử.
4. Chạy eval theo cấu hình.
5. Kiểm trước publish, publish, tắt AI một thao tác (D38), rollback, lịch sử.
6. Admin: trang "Cấu hình" — bản đang chạy và nháp; ô chọn model ẩn model bị ẩn hoặc `retired`; nút "Ẩn khỏi ô chọn model" trên trang Models (D40).
7. Admin: trang "Cấu hình" — publish, hộp hỏi khi tắt AI, rollback, lịch sử.
8. Chuyển gateway sang đọc cấu hình đang chạy (migration chép prompt và cài đặt hiện có).
9. Endpoint cũ đọc cấu hình đang chạy; chặn xóa model đã từng dùng; bỏ hai `PUT`.
10. Các script (hai smoke cũ, `learner:setup`) publish theo đường thật.
11. Admin: một mục "Cấu hình" trong menu, bỏ trang cũ, e2e giả lập.
12. E2e thật đi theo đường cấu hình.
13. Smoke phần M1 chạy trên nháp, phần M2, kiểm chạy thật của milestone.

## M3 — Judge

1. Hàm thuần: kiểu judge, đổi câu trả lời judge thành điểm, đếm, độ khớp, trần admin.
2. Setting trần USD admin, số nhãn tối thiểu, độ khớp tối thiểu.
3. Bảng judge và migration; tạo sẵn judge "Chỉ một đáp án".
4. Thao tác gateway `judge`.
5. Trần lời gọi chỉ đếm người học; kiểm USD admin trước mỗi lần gửi.
6. Việc admin dừng khi chạm trần và cần model có giá.
7. API judge: danh sách, tạo, lưu bản mới, nhân bản, lịch sử; chặn xóa model của judge.
8. Bắt đầu lượt chấm trên lần chạy hoặc trên đối tượng cho sẵn.
9. Job chấm, hàng đợi, bật judge lúc tạo lần chạy, dọn lượt treo.
10. Nhãn người và độ khớp.
11. Điểm judge trên lần chạy, trong màn so sánh; ẩn lần chạy có nhãn thay vì xóa.
12. Tiêu chí judge trong cổng publish.
13. Che lời gọi judge của ví dụ held-out; đọc nội dung lời gọi cho M4.
14. Admin: client, ô setting, mục đích `judge`.
15. Admin: trang "Judge" — danh sách, sửa, nhân bản, lịch sử, độ khớp.
16. Admin: judge trong form tạo lần chạy và bảng lần chạy.
17. Admin: judge trong màn so sánh và màn publish.
18. Admin: màn "Gắn nhãn" với phím 1 / 2 / 3.
19. E2e giả lập, kiểm truy cập, e2e thật.
20. Smoke phần M3.
21. Kiểm toàn bộ M3.

## M4 — Câu AI thật

1. `ai` đọc lượt chấm câu thật.
2. Test ghim luật lượt chấm của M3 cho câu thật.
3. Identity trả danh sách tài khoản staff.
4. Hàm thuần: nhận diện từ riêng, đọc đầu ra gốc, từ cùng phiên.
5. Ước tính và bắt đầu lượt chấm câu thật; setting giới hạn 200 câu.
6. Danh sách lượt chấm và kết quả.
7. "Đưa vào bộ ví dụ" từ báo lỗi đã xác nhận hoặc từ câu thật.
8. Admin: client, hộp thoại đưa vào bộ ví dụ, nút trên trang báo lỗi.
9. Admin: trang "Câu AI thật".
10. Câu thật trong màn "Gắn nhãn".
11. Smoke phần M4.
12. Kiểm toàn bộ M4.

## M5 — Dashboard

1. Settings trả giá trị một setting tại các thời điểm cho trước.
2. Số ngày chạm trần so với trần của chính ngày đó.
3. Đếm điểm judge và các bản judge kèm độ hiệu chỉnh.
4. Eval gần nhất của bản đang chạy mỗi thao tác.
5. Nhóm điểm judge từ eval; điểm câu thật cho Practice.
6. Dashboard AI có các khối mới.
7. Báo cáo chất lượng đếm báo lỗi đã xác nhận (sửa lỗi, hai commit).
8. Điểm câu thật trên dashboard.
9. Admin: khối hôm nay, ngày chạm trần theo trần của ngày, báo lỗi đã xác nhận.
10. Admin: thẻ eval, judge, câu thật; biểu đồ đánh dấu chỗ đổi bản judge.
11. Smoke phần M5.
12. Kiểm toàn bộ M5.

## M6 — D7/D30

1. Bảng `learning_activity_days`, xóa theo tài khoản.
2. Setting số ngày của cửa sổ "đang học" (mặc định 7).
3. Hàm thuần: tuần, cửa sổ, nhóm đăng ký, số hôm nay.
4. Ghi một "lần học" ở mọi chỗ ghi `learning_log` và mỗi câu luyện tập được trả lời.
5. Identity trả danh sách người đăng ký trong khoảng ngày.
6. Báo cáo giữ chân và endpoint `GET /v1/admin/learning/retention`.
7. Admin: thẻ D7/D30 trên dashboard, ô setting trên trang Cài đặt.
8. Smoke phần M6.
9. Kiểm toàn bộ M6.

## Đóng đợt

1. Smoke cuối và các smoke cũ trên DB mới.
2. Ghi as-built.
3. Lần chạy thật của chủ dự án (5 USD, hai model judge Anthropic, 30 nhãn).

---

# Nhóm B — as-built

## M1 — Bộ ví dụ (golden set): as-built 30/10/2026

**Nhánh / PR:** `feat/nhom-b-m1-golden-set`, 22 commit từ `docs/nhom-b-design`; PR "[nhóm B 1/6]" vào `docs/nhom-b-design` (merge đầu tiên của đợt, rồi PR #191 docs).
**Đã làm:** tất cả 19 task của M1 (T1–T19). API: kiểu và hàm thuần (chia dev/held-out, ô mong đợi, thống kê lần chạy, so hai lần chạy), setting `ai.eval_held_out_ratio` (30%),
bảng `ai_eval_sets` / `ai_eval_set_items` / `ai_eval_run_items` và migration chuyển dữ liệu cũ (ví dụ cũ vào dev, lần chạy cũ đánh dấu `legacy`), job eval ghi kết quả luật + ô mong đợi
theo từng ví dụ, cổng luật `EvalRules` (Practice đăng ký, `ai` không import Practice), tra dạng từ theo lemma ở Content, API ví dụ che held-out, chốt phiên bản, mở held-out (chuyển sang dev),
chạy trên phiên bản đã chốt, so hai lần chạy, che held-out ở trang Các lần gọi và nút chạy thử. Admin: hộp thoại ví dụ có ô mong đợi (điền sẵn dạng từ từ kho), trang eval có hàng held-out ẩn + [Chốt phiên bản]
+ danh sách phiên bản, nhập hàng loạt có cột `expected` và `split`, chạy trên phiên bản, cột Luật / Mong đợi, màn so hai lần chạy, ô "Tỉ lệ ví dụ held-out" ở Cài đặt, trang Các lần gọi ẩn nội dung held-out.
**Kiểm:** api: drift sạch, `oxlint` (chỉ cảnh báo có từ trước), `tsc` sạch, 256 file / 3332 unit test pass; admin: `eslint`, `tsc`, 84 file / 1009 test pass, `build` (VITE_API_BASE_URL=https://admin-api.wordmet.com), `build:e2e`, e2e giả lập 277 pass + 67 skip (skip chỉ-desktop có từ trước), `test:e2e:real` pass trên API + worker thật. Lưu ý: `vitest` admin với số worker mặc định có thể rớt 1–5 test đầu mỗi file khi máy đang bận (hết hạn 1 s của `findBy`, cũng xảy ra ở baseline); chạy `--maxWorkers=3` thì xanh.
**Smoke:** `pnpm smoke:nhom-b` (15 bước) pass hai lần, mỗi lần trên DB mới; `smoke:buoc-6` (32 bước) và `smoke:buoc-7` (30 bước) pass trên DB mới; output ở [`nhom-b-smoke-output.txt`](nhom-b-smoke-output.txt) (mục M1). Smoke phải chạy với
`SMOKE_IGNORE_ENV_FILE=1` khi `apps/api/.env` có key thật (xem `nhom-b-open-items.md`, OI-1).
**e2e thật:** `m1b.real.spec.ts` viết lại: hạt giống ví dụ held-out bằng bulk, thêm ví dụ qua hộp thoại (gõ dạng được nhận), chốt phiên bản, chạy phiên bản đó, Chi phí, và trang Các lần gọi (nội dung ví dụ dev hiện; nội dung held-out ẩn).
Chạy trên API + worker thật (:3200, fake AI, Postgres mới): m1b 5/5 hai lần liên tiếp trên cùng DB (lần hai chốt phiên bản 2), cả bộ `e2e-real` 28 spec pass.
**Quyết định đã tự chốt (ruling):** ví dụ held-out chỉ trả `{id, split}` khi tạo/liệt kê (không lộ nội dung); `GET …/runs/:id` chỉ trả dòng dev có kết quả; một lần chạy rỗng hoặc có dòng `in_progress` không tính là "đủ" (không làm bằng chứng publish);
migration chuyển dữ liệu dùng `ON CONFLICT DO NOTHING`; admin: thêm prop `onBlur` cho `TextField`, toast riêng khi ví dụ mới vào held-out, thêm slug lỗi `eval-set-*`/`expected-invalid`, danh sách so sánh gồm cả lần chạy chưa xong (20 lần gần nhất).
**Chưa kiểm / còn lại:** bản dịch tiếng Anh các chuỗi mới do agent tự dịch (chủ dự án nên đọc lại vi: `toast.addedHeldOut`, `freeze.rowMissing`, `compare.*`); `build` production chưa chạy trên CI thật (chỉ chạy cục bộ); chưa có gì chạy với model AI thật (đúng thiết kế, D30).

## M3 — Judge: as-built 30/10/2026

**Nhánh / PR:** `feat/nhom-b-m3-judge`, 24 commit từ `feat/nhom-b-m2-configs`; PR "[nhóm B 3/6]" vào nhánh M2 (merge sau M2).
**Đã làm:** 21 task của M3 (T1–T21). API: kiểu và hàm thuần của judge (điểm từ đầu ra judge, thống kê, độ khớp với nhãn, trần chi tiêu admin), ba setting (`admin_daily_usd_cap` 2 USD, `judge_label_min` 30, `judge_agreement_min` 85%),
sáu bảng judge (judge, revision, pass, mục của pass, điểm, nhãn) + judge mẫu "Chỉ một đáp án" (chưa có model), thao tác gateway `judge` (mù: chỉ nhận `target_operation`, `input`, `output`, `criteria`, `context`; chỉ model Anthropic, hoặc `fake` khi bật fake),
trần gọi AI của người học chỉ đếm người học; chi USD của admin (chạy thử, bộ ví dụ, judge) có trần riêng kiểm trước mỗi lần gọi; model chưa có giá thì không chạy được; CRUD judge có revision (chỉ đổi tên / thao tác / bật-tắt thì không sinh revision mới); pass chấm trên lần chạy hoặc trên danh sách subject,
job `judge` trong worker, gắn nhãn, độ khớp và cờ "Đã hiệu chỉnh", điểm judge trong kết quả / so sánh lần chạy, cảnh báo `judge-rate-drop` khi publish, xóa lần chạy đã có nhãn thì chỉ ẩn, ẩn nội dung lời gọi judge của ví dụ held-out, hàm đọc nội dung lời gọi cho M4.
Admin: trang "Judge" (`/ai/judges`: danh sách, sửa, nhân bản, revision, độ khớp), "Chấm bằng judge" ở form chạy bộ ví dụ, khối Judge + cột Judge / Nhãn trong kết quả lần chạy, hàng judge trong màn so sánh và cảnh báo khi publish, màn "Gắn nhãn" (phím 1 / 2 / 3), ba ô cài đặt mới, "Lời gọi của người học hôm nay" và "Việc của admin hôm nay" ở Tình trạng.
**Kiểm:** api: drift sạch, `oxlint` (chỉ cảnh báo cũ), `tsc` sạch, 276 file / 3677 test pass; admin: `eslint`, `tsc`, 90 file / 1138 test pass (`--maxWorkers=3`), `build` (VITE_API_BASE_URL=https://admin-api.wordmet.com), e2e giả lập 281 pass + 67 skip, `test:e2e:real` 29 pass trên API + worker thật, DB mới (gồm `judge.real.spec.ts`).
**Smoke:** `pnpm smoke:nhom-b` (46 bước: M1 12 + M2 13 + M3 17, cộng bước setup) pass hai lần, mỗi lần trên DB mới; `smoke:buoc-6` (32 bước, B6#28 nay đếm lời gọi của người học) và `smoke:buoc-7` (30 bước) pass trên DB mới; `pnpm learner:setup` pass hai lần liên tiếp (lần hai không đổi gì); log API và worker của smoke không chứa nội dung prompt, few-shot hay câu trả lời của judge (có đối chứng). Output: [`nhom-b-smoke-output.txt`](nhom-b-smoke-output.txt) (mục M3).
**Quyết định đã tự chốt (ruling):** đường dẫn controller là `admin/ai` (judge, `judge-passes/:id`, `labels` cùng một controller); lời gọi judge của lần chạy đã bị xóa hẳn thì ẩn nội dung (an toàn, "fail closed"); điểm và nhãn chỉ thêm vào `GET …/runs/:id/items`; gắn nhãn cho ô không có đầu vào/đầu ra → 400; trần chi USD là trần mềm (lời gọi đang bay có thể vượt); khi bắt đầu pass/chạy thử thì kiểm giá model rồi mới tới trần; editor judge là khung nội tuyến (không phải hộp thoại); "Tải bản mới" thay nội dung đang soạn bằng revision mới hơn; "Chấm cả hai bằng …" bắt đầu pass cho lần chạy thiếu điểm hoặc chấm bằng revision khác.
**Chưa kiểm / còn lại:** chưa chạy với judge Anthropic thật (chỉ fake); job khôi phục pass bị treo chỉ có unit test (`MAINTENANCE_ENABLED=false` ở các stack thử); chưa xem ảnh chụp màn hình trang Judge và màn Gắn nhãn (chỉ axe + kiểm không tràn 375 px + test hành vi); judge mẫu "Chỉ một đáp án" chưa có model và prompt khởi điểm cần chủ dự án đọc (OI-4).
