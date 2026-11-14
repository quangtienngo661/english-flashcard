# Review plan nhóm B (chất lượng AI) — trước khi thực thi (29/10/2026)

**Đã đọc:** plan [`../plans/2026-10-29-nhom-b.md`](../plans/2026-10-29-nhom-b.md) (2957 dòng, M1–M5; M6 và M2-T13 cố ý chờ chủ dự án nên không tính là thiếu),
hợp đồng [`../plans/2026-10-29-nhom-b-00-contract.md`](../plans/2026-10-29-nhom-b-00-contract.md), design
[`../specs/2026-10-29-nhom-b-chat-luong-ai-design.md`](../specs/2026-10-29-nhom-b-chat-luong-ai-design.md) (470 dòng), decision record
[`../decisions/2026-10-29-nhom-b-chat-luong-ai-decisions.md`](../decisions/2026-10-29-nhom-b-chat-luong-ai-decisions.md) (D1–D36), code facts
[`../../preparation/NHOM_B_CODE_FACTS_2026-10-29.md`](../../preparation/NHOM_B_CODE_FACTS_2026-10-29.md) (F1–F12), review design và bảng xử lý R1–R22
[`2026-10-29-nhom-b-design-review.md`](2026-10-29-nhom-b-design-review.md), skill `writing-plans` 6.4.2, `CLAUDE.md`, `~/.claude/rules/testing-boundaries.md`,
`~/.claude/rules/git-conventions.md`. Mẫu trình bày: review plan Bước 8.

**Code:** nhánh `docs/nhom-b-design` @ `1c9ad9a`; `git diff --stat HEAD origin/dev -- apps .github` → 0 dòng, `origin/dev` = `9b5288f`. Đường dẫn code tính từ
`apps/api/` trừ khi ghi `apps/admin/…`. "Plan dòng N" là số dòng của file plan trên đĩa.

**Đã kiểm thế nào (chỉ đọc):** đọc từng file và symbol plan nêu tên khi task dựa vào nó; grep mọi chỗ gọi hai `PUT` cũ, mọi spec e2e / e2e-real chạm trang Thao tác,
Prompt, menu; đọc `.github/workflows/ci.yml`, `playwright.real.config.ts`, `account-data-map.spec.ts`, `smoke-buoc-6.mjs`, `smoke-buoc-7.mjs`; tính tay các dãy số
plan ghim (luật chia held-out, fixture `runStats`, ngưỡng 5 điểm, 84,9 % / 85 %, ước tính chi phí M4-T5, lịch sử setting M5-T1). Không build, không test, không chạy
smoke, không chạy migration. Code facts chỉ dùng làm đầu mối; bằng chứng dưới đây đọc lại trên code.

**Phạm vi:** khớp tên giữa milestone (sau khi áp X1–X12), độ phủ design, claim về code, task build được không, thứ tự PR và migration, smoke và "Xong khi",
độ dài. Không bàn lại D1–D36.

**Kết quả:** **1 Critical, 8 Important, 12 Minor.** Một câu tùy chọn cho chủ dự án (Q1, cuối file); phần còn lại sửa thẳng vào plan được.

## Bảng tóm tắt

| # | Mức | Task | Điểm |
|---|---|---|---|
| P1 | **Critical** | M1-T17, M2-T10, M2-T12 | `smoke:nhom-b` không ghép được sau M2: `setup()`/`partM1()` chọn model bằng `PUT` đã bỏ, không task nào viết lại; thay bằng `publishModel` thì phá khẳng định của `partM1()` và `partM2()` bước 1–2 |
| P2 | Important | M3-T4, M4-T2, M4-T10, X5 | Không còn judge giả nào chấm "không đạt" câu thật: `partM4()` bước 6, 8 không thể đạt |
| P3 | Important | M3-T5, M5-T6, M5-T9, M5-T11, X2 | Ô "hôm nay" của dashboard làm hai lần (hai ô USD admin, một key đổi chữ hai lần); M5-T9, M5-T11 vẫn dùng `today.learner_calls` mà X2 bỏ |
| P4 | Important | X1–X12, M3/M4/M5 | Bảng X ghi đè nhưng thân task vẫn giữ chỉ dẫn cũ; X3 trỏ tới hàm nhận dữ liệu M5-T3 không có |
| P5 | Important | M3-T17, M4-T9, X6 | Thiếu task: màn "Gắn nhãn" lần lượt cho câu thật (design §5.4, D16) |
| P6 | Important | M5-T11, M3-T7 | `partM5()` bước 5 "lưu bản mới, cùng nội dung" nhưng M3-T7 không tạo bản khi nội dung giống |
| P7 | Important | M2-T5, M2-T12 | B31: request publish thứ hai có thể nhận 404 thay vì 409, smoke chập chờn |
| P8 | Important | M2-T11, M3-T15, M4-T9 | e2e đỏ vì file không có trong task: `shell.spec.ts` đếm 24 mục menu, `m1b.real` chạy trên phiên bản không có ví dụ của nó, `m1a.real` để lại nháp làm `m3.real` throw |
| P9 | Important | M3-T11, M2-T5, M3-T12 | Lần chạy đã "xóa" (ẩn) vẫn được cổng publish chọn làm candidate / baseline |
| P10 | Minor | M1-T3 | Câu SQL thứ hai của migration thiếu điều kiện "run còn queued/running" |
| P11 | Minor | M4-T7 | Kiểm từ riêng bằng `practiceSenses(admin)` không thấy từ riêng của người học → `sense-gone` thay vì `private-word` |
| P12 | Minor | M2-T9, M3-T7 | Chặn xóa model rộng hơn design §6.1 (vì FK RESTRICT); design tự mâu thuẫn §4 / §6.1 |
| P13 | Minor | M2-T10 | `ensureFrozenSet`: "ba ví dụ" từ seed chỉ có 2; `expected` của `check_private_word`; hỏng trên DB đã có ví dụ thiếu `expected` |
| P14 | Minor | nhiều | Danh sách bước CI trên máy thiếu `pnpm build` của admin |
| P15 | Minor | M1/M2/M4/M5 smoke | Ngân sách `ai.test` 20/giờ của admin trong `smoke:nhom-b` chưa được đếm |
| P16 | Minor | cả plan | Thiếu task đóng đợt (smoke cuối, file output, as-built, lần chạy thật D30) |
| P17 | Minor | M3-T5, M3-T14 | Admin: `UnavailableReason` thiếu `admin-usd-cap`; key nhãn `ai.purposes.judge` lệch namespace đang dùng |
| P18 | Minor | M1-T14, M2-T6, M3-T16 | Chữ ký `useStartRun().start` đổi qua ba milestone, không có bản cuối |
| P19 | Minor | M1-T3, M2-T10, M2-T11, M3-T16 | Task quá lớn cho một lượt review |
| P20 | Minor | M3-T8/T9, M4-T1, M5-T11 | Lặt vặt: số dòng sai ở `eval-queue.service.ts`, `total` nullable, "editor" mơ hồ |
| P21 | Minor | cả plan | Độ dài: ~300 dòng ghi chú lặp mỗi milestone, đúng chỗ mâu thuẫn với X1–X12 |

---

## Phát hiện

### P1. (Critical) M1-T17, M2-T10, M2-T12 — `smoke:nhom-b` không ghép được sau M2

**Sai ở đâu.** M1-T17 (plan dòng 687-688): `setup()` chọn model cho `generate_cloze` và `check_private_word` bằng `PUT /v1/admin/ai/operations/:op` "— M2 replaces
this when that `PUT` goes". `partM1()` cần model ở bước 4 (chạy `fake:ok` trên phiên bản 1 và bộ đang soạn), bước 5 (`fake:bad-form`), bước 7 (prompt test qua
`POST …/prompts/generate_cloze/test`, endpoint này lấy model từ selection hiện hành, `src/ai/prompts/prompts.service.ts:159-163`) và bước 10 (`check_private_word`) (dòng 699-709).
Không task M2 nào sửa `smoke-nhom-b.mjs` ngoài việc thêm `partM2()`: M2-T10 chỉ liệt kê bốn caller cũ (dòng 1201-1204), M2-T12 chỉ "add `partM2()` after M1's part"
(dòng 1271). Sau PR M2-c, `PUT` trả 404 (M2-T9), nên script dừng ở `setup()`.

Đường thay thế duy nhất M2 để lại là `publishModel`, mà `ensureFrozenSet` (dòng 1210-1212) tạo 3 ví dụ `scripted` và chốt phiên bản 1 của `generate_cloze` **trước**
`partM1()`. Khi đó:
- `partM1()` bước 2 (dòng 693) đòi split `held_out, dev, dev, dev, held_out` tính từ bộ rỗng; bước 3 (dòng 695-696) đòi "201 version 1, `dev_count 3`,
  `held_out_count 2`" — cả hai sai.
- `partM2()` bước 1 (dòng 1276-1277) đòi cả 6 thao tác `live.model` null, `previous` null, `live_version` 0; bước 2 (dòng 1278) "First model (the Q-R1 path)" — sai,
  vì `generate_cloze`, `check_private_word` đã có model.

Design §13 còn đặt "chọn model lần đầu (theo Q-R1)" ở đầu smoke, trước "tạo ví dụ có ô mong đợi".

**Hỏng ở kịch bản nào.** M2-T12 Step 2-3 (chạy `pnpm smoke:nhom-b` hai lần trên DB mới, exit 0) không thể đạt; M3-T20, M4-T11, M5-T12 chạy cùng script nên cũng không.
"Xong khi" của cả đợt (design §13) không đạt được như plan viết.

**Đề xuất sửa plan.** Thêm vào M2-T12 (hoặc một task M2 riêng trong PR M2-c) bước "viết lại `setup()` và `partM1()` cho thế giới sau M2", chọn một trong hai:
- (a) `partM1()` chỉ dùng **nháp**, không publish: `POST …/configs/:op/draft` + `PUT …/draft` với `fake:ok` (bước 5 lưu lại với `fake:bad-form`, version +1), chạy
  `POST …/eval/runs { set_id?, config: 'draft' }`, bước 7 đổi sang `POST …/configs/generate_cloze/draft/test`, `check_private_word` cũng qua nháp; cuối `partM1()`
  xóa hai nháp. Bản đang chạy không đổi, nên `partM2()` bước 1-2 và đường Q-R1 giữ nguyên.
- (b) Chọn model lần đầu trong `setup()` bằng `publishModel` đúng thứ tự design §13, rồi viết `partM1()` theo số tương đối (đếm bộ trước khi thêm, phiên bản = n + 1)
  và bỏ `partM2()` bước 1-2.

Đề xuất: **(a)** — giữ nguyên các khẳng định tuyệt đối của `partM1()` (đúng cạnh R21: bộ rỗng → held-out) và đường Q-R1 ở đúng chỗ M2 đã thiết kế. Ghi thêm vào
M1-T17 rằng `setup()` dùng `PUT` là tạm, M2 thay theo (a).

### P2. (Important) M3-T4, M4-T2, M4-T10, X5 — không còn judge giả nào chấm "không đạt" câu thật

**Sai ở đâu.** X5 (dòng 74) bỏ `fake:judge-fail`; fake judge của M3-T4 chỉ trả `fail_major` khi một `accepted_answers` kết thúc bằng `ment` (dòng 1593-1594). Câu thật của
`partM4()` sinh bằng `fake:ok` (dòng 2461), mà `fake:ok` cho cloze trả `accepted_answers: [word]` (`src/ai/adapters/fake/fake.adapter.ts:17-20`). `fake:bad-form` trả
`<w>ment` nhưng luật Practice loại câu đó (`checkCloze`, `src/practice/ai/ai-checks.ts:29-35`), nên không có câu thật nào mang `ment`. Vậy mà `partM4()` bước 1 vẫn
"the judge saved with the failing fake model" (dòng 2462), bước 6 đòi "3 items of E, each `failed: true`, `can_add_to_examples: true`" (dòng 2472-2473), bước 8 đi từ
"a real-judge row" không đạt (dòng 2476). M4-T2 vẫn còn nhánh "only if added: `fake:judge-fail`" (dòng 2213-2214, 2222).

**Hỏng ở kịch bản nào.** `partM4()` bước 6 luôn thấy `failed: false`; đường "Đưa vào bộ ví dụ" từ câu judge chấm không đạt (D27) không được smoke chứng minh.

**Đề xuất sửa plan.** Cho một model giả **đã có** một kịch bản judge thất bại, ví dụ `fake:bad-form` trả cho `judge_v1` mọi verdict `fail_major` (thêm nhánh `judge_v1`
vào `badFormValue`, `fake.adapter.ts:47-59`). Ghi vào M3-T4 (test trong `fake.adapter.spec.ts`), sửa X5 và M4-T2, `partM4()` bước 1 lưu judge với `fake:bad-form`. Đã
kiểm: `partM3()` không dùng `fake:bad-form` làm model judge (dùng `fake:ok`, `fake:not-recognized`, `fake:refuse`, dòng 2034, 2050, 2056), nên M3 không đổi gì.

### P3. (Important) M3-T5 vs M5-T6, M5-T9, M5-T11 — ô "hôm nay" của dashboard làm hai lần; X2 chưa áp vào M5-T9, M5-T11

**Sai ở đâu.** X2 (dòng 71): M5 không thêm `today.learner_calls`, chỉ dùng `today.calls` (đã là lời gọi người học từ M3) và hai field admin của M3. Nhưng:
- M5-T9 (dòng 2821) cho meter dùng `today.learner_calls`; fixture test `learner_calls: 2` và "shows 2 / 500" (dòng 2830-2831). M5-T11 bước 2-3 (dòng 2897-2900) kiểm
  `today.learner_calls`. Mục "Names M5 defines" (dòng 2583) còn liệt kê nó.
- M3-T5 (dòng 1621, 1637-1638) đã sửa `DashboardPage.tsx` (`:199-203`): đổi nhãn `dashboard.today.calls` thành "Lượt gọi AI của người học / giới hạn ngày" và thêm
  stat `dashboard.today.adminSpend` "Chi phí việc admin hôm nay / trần". M5-T9 lại đổi cùng key thành "Lời gọi AI của người học / giới hạn ngày" và thêm meter thứ hai
  `dashboard.today.adminUsd` "USD việc của admin hôm nay / trần". X2 chỉ xử lý phía API.

**Hỏng ở kịch bản nào.** Người làm M5 theo task sẽ thêm field API mà X2 cấm, hoặc test M5-T9 đỏ vì field không có; dashboard có hai ô chi phí admin cho cùng một số.

**Đề xuất sửa plan.** M5-T9 và M5-T11 dùng `today.calls`. Chọn một chủ cho ô USD admin trên dashboard: M3-T5 chỉ sửa trang Tình trạng và nhãn `dashboard.today.calls`;
M5-T9 sở hữu meter USD admin + dòng "Đã chạm trần" (B20). Hoặc M5-T9 ghi rõ "thay stat `adminSpend` của M3 bằng meter, xóa key".

### P4. (Important) X1–X12 ghi đè nhưng thân task vẫn giữ chỉ dẫn cũ

**Sai ở đâu.** Dòng 64-66: "An implementer follows this table". Header (dòng 8) cho phép `subagent-driven-development`, mà skill writing-plans nói người làm một task
chỉ thấy task đó (khối Interfaces là chỗ họ học tên). Thân task vẫn ngược bảng:
- M5-T6 Produces và test `toEqual({ …, learner_calls: 5, admin_cost_usd, admin_usd_cap })` (dòng 2756-2765) — X2.
- M5-T3 `isCalibrated` cùng năm assertion của nó, tên `JudgeRevisionView` (dòng 2666-2683) — X3, X4.
- M4-T2 `fake:judge-fail` (dòng 2213-2214, 2222) — X5 (xem P2).
- Ghi chú M4 "gaps (a)–(g)" (dòng 2160-2166) và `ASSUMPTION` về `subject_id` của M5 (dòng 2586-2587) vẫn viết như câu còn mở dù X7, X9 đã chốt.
- M3 trỏ tới hai file plan không tồn tại, `2026-10-29-nhom-b-p1-golden-set.md` và `…-p3-configs.md` (dòng 1339-1340); thư mục `plans/` chỉ có `nhom-b.md` và
  `nhom-b-00-contract.md`.
- X1 (dòng 70) ghi đổi tên "from the earlier `partM1` / `partM2`" sang chính tên đó.

Riêng **X3**: `agreement(pairs, { labels, ratio })` của M3-T1 nhận **mảng cặp** nhãn / điểm (dòng 1433-1434), còn `judgeRevisions()` của M5-T3 đọc số đã gộp bằng SQL
(`labeled`, `agreed`, dòng 2671-2673) — hàm X3 chỉ định không nhận được dữ liệu M5 đang có. M3-T10 đã có sẵn `JudgeAgreement.forRevisions(revisionIds): Promise<Map<string,
Agreement>>` (dòng 1832-1833) trong cùng module `ai`.

**Đề xuất sửa plan.** Gộp X1–X12 vào thân từng task (Interfaces, test, ghi chú), giữ bảng như nhật ký thay đổi. Với X3: M5-T3 gọi `JudgeAgreement.forRevisions`, bỏ câu SQL
độ khớp riêng, thay năm test `isCalibrated` bằng test "`criteria[].calibrated` lấy từ `forRevisions`". Sửa hai link M3.

### P5. (Important) Thiếu task — màn "Gắn nhãn" lần lượt cho câu thật (design §5.4, D16)

**Sai ở đâu.** Design §5.4: "màn 'Gắn nhãn' (lần lượt từng đầu ra dev **hoặc câu thật**, phím `1` / `2` / `3`)"; D16 "cả trên bảng kết quả và màn riêng". M3-T17 làm màn cho
lần chạy eval (`/ai/judges/label?run=&judge=`, dòng 1991: "M4 adds a source for real questions"); X6 (dòng 75) nói M4 thêm nguồn câu thật vào route này. Không task M4
nào làm: M4-T9 (dòng 2424-2427) tạo `RealQuestionsPage`, `RealPassResults`, sửa nav, routes, settings, e2e; không đụng `LabelQueuePage.tsx`, `label-queue.ts`. Bảng phủ
M4 (dòng 2511) chỉ có "results page, labels" (nhãn trong bảng kết quả).

**Đề xuất sửa plan.** Thêm vào M4-T9 (hoặc task M4 riêng): route `/ai/judges/label?pass=<realPassId>`; `labelTasks` cho `RealPassItem` (item × tiêu chí, theo thứ tự item);
PUT `subject_kind: 'real_question'`; không hiện verdict của judge (như M3-T17); link "Gắn nhãn lần lượt" ở `RealPassResults`; test `label-queue.test.ts`,
`LabelQueuePage.test.tsx` cho nguồn câu thật, và một bước trong `e2e/ai-real-questions.spec.ts`.

### P6. (Important) M5-T11 bước 5 vs M3-T7 — "lưu bản mới, cùng nội dung" không tạo bản mới

**Sai ở đâu.** M5-T11 (dòng 2905-2908): "Save a new revision of the judge (`PUT …/judges/:id`, same fields) and judge the same run again → `judge_scores` has a group … for
each of the two revisions; `judge_revisions` lists both". M3-T7 (dòng 1703-1705, Review focus 4 ở dòng 1393): các trường của bản giống bản mới nhất → chỉ cập nhật
`ai_judges`, **không** tạo bản; `partM3()` bước 2 (dòng 2035) còn khẳng định đúng điều đó.

**Hỏng ở kịch bản nào.** Không có bản thứ hai; chấm lại cùng bản thì mọi đầu ra đã có điểm bị bỏ (B15) → lượt chấm `total: 0`; bước 5 đỏ, và vạch "Bản judge" của D17
không được smoke đọc qua API.

**Đề xuất sửa plan.** Đổi một trường của bản (ví dụ `max_output_tokens`, hoặc chữ `question` của tiêu chí) trước khi chấm lại; khẳng định `latest.revision` tăng 1.

### P7. (Important) M2-T5, M2-T12 bước 9 — B31 có thể ra 404 thay vì 409

**Sai ở đâu.** `publish` kiểm theo thứ tự bắt đầu bằng "no draft → 404" (dòng 1006); `publish-stale` chỉ đến từ con trỏ lệch trong transaction (dòng 1008-1009).
`partM2()` bước 9 (dòng 1290) đòi `[200, 409]`. Hai request "cùng lúc" từ script không bảo đảm chen nhau: mỗi request đọc nhiều lần trước transaction (nháp, phiên bản,
hai lần chạy và item, từ M3 thêm điểm judge). Nếu request thứ hai đọc sau khi request đầu commit, nó thấy nháp đã thành `published` → 404 `not-found`. Design B31: "người
kia 409 theo `version` của con trỏ".

**Hỏng ở kịch bản nào.** Smoke đỏ ngẫu nhiên ở bước 9, trong khi "Xong khi" đòi hai lần chạy liền exit 0.

**Đề xuất sửa plan.** Trong `publish`, khi không còn nháp mà body có `expected_version` → 409 `publish-stale` (đúng design §6.3 bước 4 "lệch bất kỳ cái nào → 409, màn tải
lại"); thêm test unit "nháp vừa được publish → 409 `publish-stale`". Nếu muốn giữ 404 cho "chưa từng có nháp" thì smoke chấp nhận `{404, 409}` và ghi lệch design. Đề xuất
cách đầu.

### P8. (Important) PR M2-c, M3-c, M4-B — e2e đỏ vì file không nằm trong task

1. **Đếm menu.** `apps/admin/e2e/shell.spec.ts:37,45` khẳng định menu có đúng 24 mục (`toHaveCount(24)`). Sau M2-T11 còn 23 (dòng 1251), M3-T15 lại 24 (dòng 1952), M4-T9
   lên 25 (dòng 2430-2431). Không task nào trong ba task đó liệt kê file này (M5-T10 chỉ sửa `:58-68` cho dashboard). Job `admin` (mocked e2e) đỏ ở PR M2-c và M4-B.
2. **m1b chạy trên phiên bản không có ví dụ của nó.** `e2e-real/m1b.real.spec.ts:29-32` gọi `chooseClozeModel(…, 'fake:ok')` trong `beforeAll`; test 2 (`:51-58`) bấm
   "Chạy bộ ví dụ" với "Bộ chạy" mặc định = **phiên bản mới nhất** (M1-T14, dòng 622). Sau M2-c, `chooseClozeModel` = `publishModel` → `ensureFrozenSet` chốt phiên bản 1
   **trước** khi test 1 thêm ví dụ `word` → lần chạy không có `word` → `panel.getByText(word)` (`:57`) fail. Ở M1-B chưa có phiên bản nào nên còn xanh.
3. **m1a để lại nháp.** Test 2 mới của `m1a.real.spec.ts` (M2-T11, dòng 1260-1261) lưu nháp và chạy thử, để lại nháp không có ghi chú `scripted:`. File chạy theo thứ tự tên
   (`playwright.real.config.ts`: `workers: 1`, `fullyParallel: false`), nên sau đó `m3.real.spec.ts:26` → `seedAiReport` → `chooseClozeModel('fake:bad-form')`
   (`support/ai-report.ts:138`) → `publishModel` gặp "any other draft → throw" (dòng 1215) → job `admin-e2e-real` đỏ.

Bước Verify của M2-T11 (dòng 1264-1265) sẽ bắt được cả ba, nhưng task không nói sửa gì. **Đề xuất:** thêm `e2e/shell.spec.ts` (số mục và tên test) vào M2-T11, M3-T15, M4-T9;
m1b chọn "Bộ đang soạn …" trước khi chạy (hoặc chỉ chốt sau khi thêm ví dụ); test 2 của m1a xóa nháp ở cuối bằng "Xóa nháp".

### P9. (Important) M3-T11 vs M2-T5, M3-T12 — lần chạy đã ẩn vẫn được cổng publish chọn

**Sai ở đâu.** M3-T11 (dòng 1856-1858) đặt `hidden_at`, cho `list` bỏ qua và `get` / `items` / `compare` trả 404; X8 chỉ nhắc M5. `PublishService.check` chọn candidate và
baseline là "newest complete run" theo config, version, set (dòng 1001-1003), không lọc `hidden_at`; M3-T12 sửa cùng file mà cũng không thêm điều kiện.

**Hỏng ở kịch bản nào.** Admin "xóa" một lần chạy baseline có nhãn vì thấy kết quả lạ → `publish-check` vẫn lấy nó làm baseline; `ai_config_events.baseline_run_id` trỏ tới
lần chạy mở ra 404, và link trong panel publish (M2-T7) không mở được.

**Đề xuất sửa plan.** M3-T11 thêm `hidden_at IS NULL` vào lựa chọn candidate / baseline của `PublishService` (test: lần chạy trọn mới nhất bị ẩn → dùng lần trước nó, không
còn lần nào → blocker tương ứng).

### P10. (Minor) M1-T3 — câu SQL thứ hai của migration thiếu điều kiện

Dòng 317-321: comment "ids of a run still queued or running at deploy time" nhưng `WHERE` chỉ có `NOT EXISTS (…)`. Một run `failed` (hủy, `stalled`) có ví dụ chưa chạy cũng
được chèn dòng `pending`: stats của run cũ báo `pending > 0` cho run đã kết thúc, và bước Verify "`count(*)` = `sum(jsonb_array_length(items))`" (dòng 328-329) sai trên DB có
run bị hủy giữa chừng (DB local của chủ dự án). Sửa: thêm `AND r.status IN ('queued', 'running')`.

### P11. (Minor) M4-T7 — kiểm từ riêng bằng `practiceSenses(admin)`

`visibleSenseCondition` (`src/content/learner/visible-senses.ts:9-15`) chỉ cho người xem thấy từ riêng **của chính mình**. Preview dựng lại (dòng 2363-2364) gọi
`practiceSenses(actorId, [senseId])` với `actorId` = admin → từ riêng của Lan trả rỗng → 409 `sense-gone`, không phải `private-word`. Test "question gone, sense private →
`private-word`" (dòng 2381) dùng `ContentService` giả nên xanh. Không lộ dữ liệu, nhưng màn báo lỗi hiện "Nghĩa … không còn trong kho" thay cho câu từ riêng (B39). Sửa: một
hàm Content trả `scope` của sense không theo người xem, hoặc gộp hai lý do thành một thông báo.

### P12. (Minor; có thể cần chủ dự án) M2-T9, M3-T7 — chặn xóa model rộng hơn design §6.1

Design §6.1: 409 khi model ở nháp, bản đang chạy, bản `previous_config_id`, hay bản mới nhất của một judge `active`. Plan (dòng 1182-1183, 1706, 1400): bất kỳ `ai_configs`
nào (kể cả `retired`) và bất kỳ `ai_judge_revisions` nào → 409, đúng với FK `RESTRICT` mà design §4 và R12 đã chọn. Hệ quả: model đã từng publish hay từng gắn vào một bản
judge không bao giờ xóa được. Plan nhất quán với §4; chính design tự mâu thuẫn giữa §4 và §6.1. Cần sửa câu §6.1 cho khớp, hoặc chủ dự án chọn cách khác (Q1).

### P13. (Minor) M2-T10 — `ensureFrozenSet`

(a) Dòng 1210-1212: "three examples … built from the operation's seeded few-shot inputs", nhưng prompt seed của 5/6 thao tác chỉ có 2 few-shot
(`src/ai/prompts/initial-prompts.ts:35-40, 63-68, 84-89, 119-124, 155-160`); `check_private_word` có 3 nhưng hai cái ra `not_recognized` (`:181-190`) trong khi plan cho
`expected: { verdict: 'ok' }`. Ghi rõ: 2 ví dụ là đủ (held_out, dev), `expected` lấy từ `output` của seed. (b) Trên DB có ví dụ cũ thiếu `expected` (14 ví dụ B1 sau migration
M1) mà chưa có phiên bản, `POST …/sets` → 422 `eval-set-incomplete` → `publishModel` throw → `learner:setup` hỏng trên DB local của chủ dự án. Ghi giới hạn "DB mới" trong
helper, hoặc cho nó báo lỗi kèm hướng dẫn.

### P14. (Minor) Bước CI trên máy thiếu `pnpm build` của admin

Job `admin` có bước "Build (production host guard)" `pnpm build` (`.github/workflows/ci.yml:144-145`). Các danh sách "Before each push" / Verification (dòng 141-142,
716-719, 799-801, 2070-2073, 2491-2494, 2925-2928) chỉ có `build:e2e`. Thêm `pnpm --filter admin build`.

### P15. (Minor) Ngân sách `ai.test` 20/giờ trong `smoke:nhom-b`

`ai.test` đếm 1 cho mỗi eval run và mỗi lần chạy thử (`src/ai/eval/eval-runs.service.ts:89`, `src/common/config/app-config.ts:142`). M3 tạo admin riêng vì lý do này
(dòng 2028-2029), M2 dùng admin thứ hai cho smoke cũ (dòng 802-804); nhưng `partM1()`, `partM2()`, `partM4()` (`publishModel` cho các thao tác Practice) và `partM5()`
(2 lần chạy) dùng admin của `setup()`. Ước lượng tay 16–20 lượt, sát trần (chưa chạy để đếm). Đề xuất: mỗi part từ M4 dùng một admin mới như `partM3()`, ghi vào header
script.

### P16. (Minor) Thiếu task đóng đợt

Contract §7 và M1-T18 (dòng 724: "the final run of the round replaces it") nói có một lần chạy smoke cuối đợt thay file output; design §13 gồm lần chạy thật 5 USD của chủ dự
án (D30); `CLAUDE.md` giữ as-built mỗi đợt ở `docs/deliveries/`. Không task nào làm các việc này. Có thể để M6, nhưng ghi rõ ở đâu.

### P17. (Minor) M3-T5, M3-T14 — admin

API thêm `admin-usd-cap` vào `UnavailableReason` (M3-T5, X10), nhưng type admin (`apps/admin/src/features/ai/ai-api.ts:20`) và nhãn lý do không có task nào thêm (panel chạy thử
và panel lần chạy hiện lý do `unavailable`). M3-T14 (dòng 1919) đặt key `ai.purposes.judge`, trong khi trang Các lần gọi và Chi phí đọc `ai.status.purposes.${purpose}`
(`AiCallsPage.tsx:69`, `AiCostsPage.tsx:97`). Sửa: thêm `admin-usd-cap` vào type và messages; dùng `ai.status.purposes.judge`.

### P18. (Minor) Chữ ký `useStartRun().start`

M1-T14 `start(prompt, setId?)` (dòng 620); M2-T6 dùng `config: 'draft'` (dòng 1058-1059) mà không ghi chữ ký mới; M3-T16 thêm `judgeId` (dòng 1962). Ghi một chữ ký ở M2-T6,
ví dụ `start(body: Omit<StartRunBody, 'operation'>)`, để M3 chỉ thêm field.

### P19. (Minor) Task quá lớn cho một lượt review

M1-T3 (schema + migration có chuyển dữ liệu + repository + service + job, dòng 265-331), M2-T10 (helper + hai smoke + `learner:setup` + e2e support, dòng 1198-1236), M2-T11 (nav,
redirect, xóa hai trang, viết lại bốn e2e và m1a, dòng 1238-1266), M3-T16 (ba panel, dòng 1957-1985). Đề xuất tách migration của M1-T3 khỏi việc viết lại job; tách M2-T10 theo
caller; tách M3-T16 thành panel lần chạy / so sánh + publish.

### P20. (Minor) Lặt vặt

- `src/ai/eval/eval-queue.service.ts` chỉ có 95 dòng; M3-T8, M3-T9 trỏ `:166-175`, `:154-175`, `:169` (dòng 1726, 1733, 1774). Đúng là `enqueue` `:48-57` (options `:51`),
  Worker `:36-45`.
- `RealPassView.total: number` (dòng 2185) trong khi X10 cho `total` nullable; ghi rõ pass `real` luôn có `total` lúc tạo.
- M5-T11 bước 7 (dòng 2912): "an AI item the `editor` was asked" — editor của `setup()` không luyện; editor E của `partM4()` thì có. Ghi rõ dùng E.

### P21. (Minor) Độ dài

Plan 2957 dòng cho design 470 dòng (~6,3 lần). Phần lớn là quyết định (interface, assertion, chữ tiếng Việt do plan chọn) và hai khối code đáng có (SQL chuyển dữ liệu
M1-T3, prompt judge D33 chủ dự án duyệt). Nhưng mỗi milestone lặp lại tech stack, global constraints, nhánh / PR (dòng 101-155, 759-822, 1344-1403, 2111-2170, 2529-2587),
khoảng 300 dòng trùng, và chính các đoạn trùng này là nơi mâu thuẫn với X1–X12 (P4). Gộp về header chung khi sửa P4.

---

## Độ phủ design (đối chiếu)

- B1–B28, B30–B44: mỗi case có task và test (unit, smoke hoặc cả hai). Ngoại lệ: phần "màn Gắn nhãn cho câu thật" của §5.4 (P5); B31 có test nhưng smoke chập chờn (P7).
  B29 chờ Q-R1 (M2-T13); B45–B47 thuộc M6, riêng B47 phần "tài khoản test theo vai trò hiện tại" của K4 đã có ở `partM4()` bước 4.
- §4, §5.1–5.5, §6.1–6.6, §7.1–7.2, §8, §9 hàng P1–P5, §12: có task. E1–E8, E10–E17, E19: có task; E9, E18 thuộc M6.
- Phần plan thêm ngoài design, đều là chi tiết hợp lý và đã ghi trong mục "Choices": `GET …/sets/:id`, `GET …/eval-examples/from-source` (preview), `ai_eval_runs.hidden_at`,
  `legacy`, `price_cached_input`, `ai_judge_passes.operation`, `ai_live_configs.last_number`, `expected_live_version` của rollback, PATCH ví dụ held-out → 409, lượt chấm được
  bắt đầu trên lần chạy `failed`, màn Gắn nhãn không hiện verdict. Không thấy phần thêm nào trái design hay D1–D36.

## Đã kiểm, không có vấn đề

- **Tiền lệ đăng ký port:** `PracticeEntryUsageProbe.onModuleInit` → `content.registerEntryUsageProbe(this)` (`src/practice/entry-usage.probe.ts:16-18`), registry
  `src/content/catalog/entry-usage.ts:34-36`. Worker eval chỉ dựng `Worker` ở `onApplicationBootstrap` (`src/ai/eval/eval-queue.service.ts:36-45`), process worker dựng cả
  `AppModule` (`src/worker.ts`), nên Practice đăng ký luật trước khi job đầu tiên chạy.
- **`define-operation`:** đầu ra chỉ nhận chuỗi / mảng chuỗi (`src/ai/operations/define-operation.ts:24, 32-43`); `OutputProblem` có sẵn `shape`, `empty`, `verdict`,
  `too-long`; `toViolations` ghi khóa thừa thành `context.model: Unrecognized key` (`text-rules.ts:17-21`) — đúng chuỗi M3-T4 ghim. Đầu ra ba mảng của `judge` vừa khung.
- **Runner / ledger / readiness:** vòng thử (`runner.service.ts:213-254`) ghi `ai_calls` trước khi quyết định thử lại, nên kiểm trần trước `adapter.call` mỗi lần là khả thi;
  `CallLedger.record` trả id (`call-ledger.service.ts:56, 118`) cho `call_id`; `countToday` đếm mọi purpose (`:44-48`), readiness chỉ dùng nó cho learner (`readiness.service.ts:26-39`);
  `toResult` lấy `meta.operation` từ selection (`:267-279`).
- **Eval hiện tại:** job đọc input lúc chạy và giá hiện tại (`eval-job.ts:68-72, 107-117`), queue job tên `run`, `jobId` = run id, `attempts: 1` (`eval-queue.service.ts:51`);
  `createRunSchema` `:21-24`, hit `ai.test` `:89`, selection lưu `:91-96`, `cancel` `:142-149`, `remove` `:152-155` khớp plan; `run-active` đã có.
- **Fake:** `FAKE_MODELS` có `fake:bad-form` (`<w>ment`), `fake:not-recognized`, `fake:refuse`, `fake:slow`, `fake:two-blanks`; `FAKE_USAGE` 100 / 50 → 0,15 USD ở giá 1000 / 1000
  (đúng con số `partM3()`); `ModelsService.add` ép giá `fake` về 0 (`models.service.ts:103-106`), `update` thì không (`:118-133`) nên PATCH giá `fake` trong smoke chạy được;
  `PRICE_MAX = 1000`.
- **Practice / Content:** `ai_meta = {...meta, call_operation_id}` (`ai-question-generator.service.ts:139`); `StoredAiInput` có `form.senses[]` và `wrong[]` mang `scope`
  (`:31-35`, `ai-checks.ts:76`, `practice-senses.ts:16-20`); `practice_ai_requests.session_id`, `ai_input`, `practice_sessions.sense_ids` có thật; trạng thái báo lỗi có
  `confirmed`, `ai-quality` thiếu nó (`ai-quality.service.ts:62-68`, F11); `normalizeAnswer` đổi nháy cong (Review focus 2 của M1 đúng); `s.state = 'open'` và index
  `entries_catalog_lower_lemma_idx` có thật; `learner-sample.csv:37` có `deploy` với `deployed` (Review focus 5 của M2 đúng).
- **`account-data-map.spec.ts`:** mẫu `/^(user_id|.*_user_id|.*_by)$/` bắt `frozen_by`, `created_by`, `published_by`, `started_by`, `saved_by`, `labeled_by`, nên các bước
  "test đỏ" của M1-T3, M2-T1, M3-T3 đúng; `ai_config_events.actor_id` không khớp mẫu nhưng plan vẫn khai báo (hợp lệ, cột có thật).
- **Settings:** số dòng `settings.definitions.ts` đúng; `withDefaults` điền khóa mới cho dòng lưu cũ; `changedFields` ghi `old_value` = giá trị đang hiệu lực (gồm mặc định), nên
  "trước lần lưu đầu dùng mặc định" (B44) đúng với cách M5-T1 đọc; `settings.service.spec.ts` chưa có (M5-T1 "Create" đúng); spec `ai-usage-days` stub `aiUsage`
  (`:13-19`) nên M5-T2 thêm stub `valuesAt` được.
- **Admin:** cấu trúc `features/ai/*` phẳng, thư mục con mới hợp lệ; `NAV` 24 mục; `canAccess` trả true cho đường dẫn ngoài `NAV` (`nav.ts:63-66`), nên M2-b đúng; link cũ ở
  `EvalRunPanel.tsx:131`, `TestRunPanel.tsx:151`, `AiStatusPage.tsx:59`.
- **Bốn chỗ gọi `PUT` cũ:** `learner-test-setup.mjs:327-338`, `smoke-buoc-6.mjs:228-237, 389-409, 505-507`, `smoke-buoc-7.mjs:333-341`, `e2e-real/support/ai-report.ts:37-48`;
  `m1a.real.spec.ts:49-68` dùng trang, M2-T11 có. `smoke-buoc-7` chỉ chọn model cho `generate_meaning_question` một lần trước B7E117 (`:394`, `:1120`), nên `previous.model
  === null` ở M2-T10 đúng.
- **CI:** job `api` (db:setup, drift, lint, tsc, build, test), `admin`, `admin-e2e-real` (`AI_FAKE_ENABLED=true`, `MAINTENANCE_ENABLED=false`, fresh Postgres) đúng như plan mô tả
  (trừ P14). Index partial / CHECK chỉ trong migration là mẫu đã dùng (`practice.prisma:2`, `entitlements.prisma:2`).
- **Rate limit** lưu trong Postgres (`rate-limiter.service.ts`), nên chạy smoke hai lần trên hai DB mới không cộng dồn; `OPERATION_ID_PATTERN` nhận `judge-<uuid>-<uuid>`
  (79 ký tự).
- **Khớp tên giữa milestone (sau X1–X12):** `isComplete(status, items)`, `compareRuns(a, b).regressions.{dev, held_out}`, `runStats().held_out.failing`,
  `EvalSetsService.latest(op)`, `RunItemView` + `item_id` (M3), `PublishWarning` / `publishWarnings` mở rộng ở M3-T12, `Tally`; `startJudgePass`, `judgedSubjects`,
  `callContents`, `latestJudgeRevision` đúng chữ ký contract §4; `JudgeSubject`; `subject_id` của `eval_item` = id item (X9); tên field Prisma của M3 khớp giả định (c) của M4.
- **Số plan ghim, tính tay:** dãy `tenFromEmpty`, `sevenAfter14Migrated`, fixture `runStats` (dev / held-out), ngưỡng 5 điểm ở 19/20 và 18/20, 849 / 850 trên 1000, `isCalibrated(40,
  34)`, ước tính M4-T5 (2 câu, bỏ qua 1/3/1, 0,0008 USD), `settingValueAt` lúc 00:00, `days_at_cap` [1000, 3, 7], công thức k của m1b.
- **Migration:** thứ tự M1 → M2-T1 → M2-T8 → M3, M4 và M5 không có; CHECK `ai_eval_runs_prompt_check` mới (`num_nonnulls = 1`) đúng với run cũ; M2-T8 chép đúng số
  `revision` và có bước so md5 trước / sau; người học không thấy gì đổi trước publish.
- **Ranh giới test:** lệnh `test` mặc định chỉ unit với Prisma giả, không cần Docker; khóa song song kiểm trong smoke (E19).
- **Q-R1b** plan tự nêu là thật: sau M2 một nháp không model không eval được (409 `model-not-set`), nên không publish được; đáp án A/C của Q-R1 không giải quyết nó.

## ASSUMPTION (chưa kiểm được)

- Không chạy gì: mọi kết luận về CI, smoke, migration là đọc code. P8 (ba chỗ e2e đỏ) và P7 (chập chờn) suy ra từ thứ tự chạy và luồng code, chưa thấy tận mắt.
- Thứ tự microtask trong test B18 của M3-T6 ("runner called 3 times") hợp với `inPool` (`eval-job.ts:42-47`) nhưng chưa chạy.
- B37 trong `partM1()` bước 3 dựa vào transaction của API chờ `pg_sleep(3)`; chưa kiểm `transactionOptions` (timeout) của `EvalSetsService.freeze`.
- Cú pháp `pnpm test -- <đường dẫn>` (M2) với pnpm 11.6 có chuyển đúng đường dẫn cho Vitest không: chưa chạy. M1 dùng `pnpm --filter api test <đường dẫn>`.
- Định dạng "1,50 US$" của `format.usd` ở `vi-VN` (M3-T5): chưa chạy.
- Số lượt `ai.test` của P15 là ước lượng tay.
- Hai lần chạy B31 chen nhau hay nối tiếp phụ thuộc thời gian thật; P7 nói "có thể", không đo.

## Kết luận

Chưa nên thực thi nguyên văn. **P1** phải sửa trước M2-c (không thì `smoke:nhom-b` không chạy được từ M2 trở đi). **P2–P9** sửa thẳng vào plan, không cần quyết định mới;
P4 nên làm cùng lúc với P3 vì cùng là việc gộp bảng X vào thân task. P10–P21 sửa trong lúc làm task tương ứng cũng được. Không phát hiện nào đòi mở lại D1–D36.

## Câu cần chủ dự án quyết (tùy chọn)

Theo luật repo: chủ dự án trả lời trước, Claude đề xuất sau. Các cách không xếp theo ưu tiên.

**Q1. Model đã từng dùng có xóa được không (P12)?** Bối cảnh: design §4 cho `ai_configs.model_ref` và `ai_judge_revisions.model_ref` FK `RESTRICT`; §6.1 lại liệt kê chỉ bốn
trường hợp chặn. Plan theo FK: model nằm trong bất kỳ cấu hình nào (kể cả bản `retired`) hay bất kỳ bản judge nào thì không xóa được, mãi mãi.
- (a) Giữ như plan; sửa câu §6.1 cho khớp. Danh sách model chỉ dài thêm; lịch sử cấu hình luôn còn tên model.
- (b) Chỉ chặn đúng bốn trường hợp của §6.1: bỏ FK trên bản cũ (cột uuid thường, kiểm trong code). Xóa được model cũ; lịch sử cấu hình cũ hiện "model đã xóa".
- (c) Không xóa mà ẩn model (cờ ẩn khỏi danh sách chọn). Giữ lịch sử và FK; thêm một cột và một nút.

## Cách xử lý (29/10/2026)

Sửa thẳng vào plan và contract; không đổi code, design, decision record; chưa commit. Plan 2957 → 2920 dòng dù thêm 7 task (4 do tách hay thiếu, 3 task đóng đợt).
**Số task sau khi tách (P19):** M1-T4…T18 cũ → M1-T5…T19 (M1-T3 tách thành T3 + T4); M2-T12, T13 cũ → M2-T13, T14 (thêm M2-T12); M3-T17…T20 cũ → M3-T18…T21 (M3-T16
tách thành T16 + T17); M4-T10, T11 cũ → M4-T11, T12 (thêm M4-T10); M5 giữ số; thêm C-T1…C-T3. Thân review ở trên vẫn dùng số cũ; bảng dưới dùng số mới.

| # | Đã đổi gì | Ở đâu (số mới) |
|---|---|---|
| P1 | Theo đề xuất (a). `setup()` thôi chọn model. `partM1()` chạy trên nháp cấu hình: tạo nháp `generate_cloze`, lưu `fake:ok`, chạy `config: 'draft'`; bước 5 lưu `fake:bad-form`; bước 7 dùng `…/draft/test`; bước 10 một nháp riêng cho `check_private_word`; cuối part xóa hai nháp. Mọi bản đang chạy vẫn chưa có model khi `partM2()` bắt đầu, nên khẳng định tuyệt đối của `partM1()` và đường Q-R1 ở `partM2()` bước 1–2 giữ nguyên. Ghi rõ vì sao "chọn model lần đầu" đứng sau việc chốt bộ (cổng publish cần phiên bản chốt và một lần chạy trọn). M1-T18 ghi `PUT` trong `setup()` là tạm. | M1-T18, M2-T13 |
| P2 | Theo đề xuất: `badFormValue('judge_v1')` của `fake:bad-form` trả `fail_major` cho mọi tiêu chí, có test trong `fake.adapter.spec.ts`; `partM4()` bước 1 lưu judge với `fake:bad-form`; bỏ `fake:judge-fail` khỏi M4-T2. Đã đọc lại `fake.adapter.ts:17-20, 47-59`. | M3-T4, M4-T2, M4-T11 |
| P3 | M3-T5 làm phần API của `today` và chỉ đổi nhãn `dashboard.today.calls` (bỏ stat `adminSpend` trên dashboard); M5-T9 sở hữu meter USD admin và dòng "Đã chạm trần", meter lời gọi dùng `today.calls`; M5-T6 không thêm field nào vào `today`; `partM5()` đọc `today.calls`. | M3-T5, M5-T6, M5-T9, M5-T11 |
| P4, P21 | X1–X12 gộp vào thân task: X2 → M5-T6, M5-T9; X3, X4 → M5-T3 gọi `JudgeAgreement.forRevisions`, bỏ `isCalibrated` và câu SQL độ khớp riêng, kiểu `DashboardJudgeRevision`; X5 → M3-T4, M4-T2; X6 → M4-T9, M4-T10; X7 → `createReal` của M3-T8; X8 → M3-T11, M5-T4; X9 → bỏ `ASSUMPTION` của M5; X1 (đổi tên vòng) bỏ; X10–X12 đã có trong task. Bảng X thu thành "Merge notes" sáu dòng. Phần "notes for the merged header" của từng milestone thu về Goal, ràng buộc riêng, Review focus, Choices; bỏ tech stack và ràng buộc lặp, "gaps (a)–(g)", "Names … the contract lacks", hai link tới file không tồn tại. Bước CI và cách chạy smoke viết một lần ở Global Constraints. Contract thêm `hidden_at` (§3) và §4d (tên M3 mà M4, M5 dùng). | header, đầu M1–M5, contract §3, §4d |
| P5 | Task mới: route `/ai/judges/label?pass=`, `realLabelTasks`, PUT `subject_kind: 'real_question'`, không hiện verdict, link "Gắn nhãn lần lượt" ở `RealPassResults`, test và một bước trong `e2e/ai-real-questions.spec.ts`. `LabelTask` của M3 đổi sang `subjectId` để hai nguồn dùng chung. | M4-T10, M3-T18 |
| P6 | Bước 5 đổi `max_output_tokens` trước khi chấm lại, khẳng định `latest.revision` + 1. | M5-T11 |
| P7 | Theo cách đầu: `publish` không còn nháp → 409 `publish-stale` (`check` giữ 404); thêm test; smoke bước 9 giữ `[200, 409]`. | M2-T5, M2-T13 |
| P8 | `e2e/shell.spec.ts` vào ba task (23, 24, 25 mục, kèm tên test); m1b chọn "Bộ đang soạn …" trước khi chạy; test 2 của m1a kết thúc bằng "Xóa nháp". Đã đọc lại `shell.spec.ts:37, 45`, `m1b.real.spec.ts:29-32, 51-58`, `playwright.real.config.ts`. | M2-T11, M2-T12, M3-T15, M4-T9 |
| P9 | `PublishService.check` / `publish` chọn candidate và baseline trong các lần chạy `hidden_at IS NULL`; thêm test (lần trọn mới nhất bị ẩn → dùng lần trước; không còn → blocker). | M3-T11 |
| P10 | INSERT thứ hai thêm `WHERE r.status IN ('queued', 'running')`; bước Verify ghi rõ run `failed` không sinh dòng `pending`. | M1-T3 |
| P11 | Khác đề xuất: không thêm hàm Content mới. Khi dựng lại đầu vào, đọc sense với người xem là người học được hỏi (`SourceRow.ownerId` = `user_id` của báo lỗi hoặc câu), nên từ riêng → `private-word`, không còn thấy → `sense-gone`; test kiểm `practiceSenses` nhận đúng id đó. Đã đọc lại `visible-senses.ts:9-15` và `PracticeReport.userId` (`practice.prisma`). | M4-T7 |
| P12 | Không đổi cách chặn xóa model; thêm Q1 vào "Open owner questions" với lời của review, không ưu tiên cách nào. | header |
| P13 | `ensureFrozenSet` tạo một ví dụ cho mỗi few-shot của prompt seed (2; 3 với `check_private_word`), `expected` lấy từ `output`; DB có ví dụ thiếu `expected` → throw kèm hướng dẫn, không sửa ví dụ cũ. Đã đọc lại `initial-prompts.ts`. | M2-T10 |
| P14 | Bước CI gom một chỗ, có `pnpm --filter admin build` với `VITE_API_BASE_URL=https://admin-api.wordmet.com` (như `ci.yml:144-147`). | Global Constraints |
| P15 | Ràng buộc "`ai.test` budget": `setup()`, `partM1()`, `partM2()` dùng admin đầu; mỗi part từ M3 là một admin mới; header của script ghi điều này. | Global Constraints, M4-T11, M5-T11 |
| P16 | Mục "Closing — after M6": smoke cuối thay file output, smoke cũ và `learner:setup`, as-built trong `docs/deliveries/nhom-b.md` (thêm một dòng trỏ trong `CLAUDE.md`), lần chạy thật 5 USD của chủ dự án (hai model Anthropic, 30 nhãn) là bước của chủ dự án. M2 cũng nối output vào file theo "M2" như các milestone khác. | C-T1…C-T3, M2-T13 |
| P17 | Admin `UnavailableReason` thêm `'admin-usd-cap'`, nhãn `ai.reasons.admin-usd-cap`, thêm một dòng vào test bảng lý do; key mục đích đổi thành `ai.status.purposes.judge`. | M3-T5, M3-T14 |
| P18 | Một chữ ký cho cả đợt `start(body: Omit<StartRunBody, 'operation'>)`, đặt ngay ở M1 (sớm hơn đề xuất M2-T6) để M2, M3 chỉ thêm field. | M1-T15, M2-T6, M3-T16 |
| P19 | Tách M1-T3 (schema + migration chuyển dữ liệu, cột Json còn giữ) / M1-T4 (code chuyển sang dòng + migration thứ hai bỏ cột Json); M2-T10 (helper + hai smoke + `learner:setup`, cùng một helper nên để chung) / M2-T12 (e2e-real: support, m1a, m1b), M2-T11 còn menu và e2e giả lập; M3-T16 (form + panel lần chạy) / M3-T17 (so sánh + publish). Cập nhật mọi tham chiếu, gồm hai chỗ trong contract (§4b, §4c). | M1-T3, M1-T4, M2-T10…T12, M3-T16, M3-T17 |
| P20 | `eval-queue.service.ts`: `enqueue :48-57`, options `:51`, Worker `:36-45`; `RealPassView.total` ghi rõ không NULL với lượt `real`; `partM5()` bước 7 dùng E của `partM4()`. | M3-T8, M3-T9, M4-T1, M5-T11 |

**Phát hiện bị đánh giá sai:** không có. Bằng chứng code đọc lại (P1, P2, P8, P11, P13, P14, P17, P20) đều đúng; P15 vẫn là ước lượng tay.

**Còn mở:** Q1 chờ chủ dự án; bản tóm tắt plan ở `docs/deliveries/nhom-b.md` còn số task cũ (ví dụ "task M2-T13"), file này ngoài phạm vi lần sửa này; các `ASSUMPTION` ở mục
trên (cú pháp `pnpm test -- <path>`, `pg_sleep` của B37, định dạng `vi-VN`) chưa kiểm.
