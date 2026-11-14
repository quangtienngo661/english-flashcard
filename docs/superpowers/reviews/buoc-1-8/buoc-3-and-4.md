# Review độc lập Bước 3 (Learning) và Bước 4 (Practice non-AI) — 29/10/2026

Người review: Claude (read-only với code). Nhánh `docs/review-buoc-1-8` @ `867d385` (= `origin/dev` sau PR #182).
Phạm vi: `apps/api/src/{learning,practice (phần non-AI),notifications,settings}/**`, các model Prisma tương ứng, migration,
`scripts/smoke-buoc-4.mjs`; đối chiếu design / decisions / plan / as-built / review cũ của Bước 3 và Bước 4.

**Cách làm và giới hạn.** Đọc code và tài liệu; xác minh CI bằng `gh run view` / `gh pr view`. **Không chạy test nào**: worktree
không có `node_modules` hay `src/generated` (`ls apps/api/node_modules`, `ls apps/api/src/generated` đều rỗng), và cài
dependency nằm ngoài quyền của review này. Không chạy migration, không đụng DB, không gọi AI/Google. Mọi kết luận về hiệu năng
dưới đây là **chưa đo** trừ khi trích số đo đã có.

---

## (a) Bảng "Xong khi"

### Bước 3

"Xong khi" của design §17 là D45: **chủ dự án tự báo**; Task 22 chạy gate, chạy tay, viết as-built. Chủ dự án báo xong phần hệ
thống ngày 18/10 (design Bước 4 mục 0, dòng ⚠9).

| Mục | Bằng chứng | Trạng thái |
|---|---|---|
| CI xanh mọi PR #28–#44 | `gh pr view <n>` cho #28–#44: cả 17 PR `MERGED dev SUCCESSx4` | **Verified** (CI) |
| Gate Task 22 §1 (lint, typecheck, build, unit, e2e) | CI run `39049047148` (PR #43, `049570e`): `conclusion: success` (đã `gh run view`). As-built: 681 unit + 688 e2e | **Verified trên CI** lúc đó. Bộ e2e đã bị xóa ngày 18/10 (D38, `420e93d`), nên không còn gì chạy lại các ca này |
| Phép đo quy mô `GET /v1/groups` < 500 ms | As-built `buoc-3.md`: median 335 ms trên CI; Bước 4 đo lại 227–352 ms | Verified một lần; ngưỡng 500 ms là `ASSUMPTION`; nay là script chạy tay (`pnpm test:scale`), không chạy trên CI (D42) |
| Chạy tay 15 bước trên DB mới với CEFR-J thật | `buoc-3-test-flow.md` §3: 14 đạt, bước 4 đạt một phần (P1) | **Verified** (18/10, `dev` `c1f775d`) |
| B3#1, #2, #4, #6, #7, #8, #9, #10, #12, #14, #16, #17, #19 | Bước 2, 5–15 của chạy tay | Verified bằng chạy tay 18/10 |
| B3#3 (ôn sớm không đổi), B3#11 (trang từ `left`), **B3#13 (xóa nhóm)**, B3#18 (80% hạn mức email), B3#20 (nhật ký đủ cho số đo) | Không có trong 15 bước (`grep -c "DELETE /v1/groups\|B3#13\|B3#18" buoc-3-test-flow.md` = 0). Chỉ có e2e (đã xóa) và, với B3#18, unit `mail-budget.service.spec.ts:101` (chỉ phép làm tròn) | **Không còn bằng chứng tự động**; B3#13 là thao tác xóa dữ liệu |
| Design §14 (5 mục chỉ kiểm được khi deploy) | `deploy-checklist.md` dòng mở đầu chỉ trỏ tới §14; `PRODUCTION_READINESS_2026-10-21.md` G1-9 | **Chưa verified** (đúng thiết kế: chờ Deploy) |

### Bước 4

"Xong khi" (D28 đổi theo D38): CI xanh mọi PR + `pnpm smoke:buoc-4` trên DB mới.

| Mục | Bằng chứng | Trạng thái |
|---|---|---|
| CI xanh mọi PR #47–#58 | `gh pr view`: cả 12 PR `MERGED dev SUCCESSx4`; run `39140676061` (PR #54, e2e 843) và `39141811085` (PR R #57) `success` | **Verified** |
| `smoke:buoc-4` trên DB mới | `docs/deliveries/buoc-4-smoke-output.txt`: `ALL CHECKS PASSED in 37259ms (run id 7b1050af; 20 sessions, 46 answers)`. Chạy lại: `buoc-7.md:103` (21/10, passed), `buoc-8.md:113` (29/10, passed, 43 câu) | **Verified**, lần gần nhất 29/10 |
| Kiểm migration khớp schema (D40) | `.github/workflows/ci.yml:56` (`prisma migrate diff ... --exit-code`) | Verified trên mọi PR sau #57 |
| Đo tải "Ôn tất cả" < 1 s | `buoc-4.md`: trung vị 1.892–2.835 ms; **không đạt**, chấp nhận theo D39 "đo lại trước pilot" | **Không đạt, chưa đo lại** (xem B4-1) |
| Chạy đua / khóa (B4E1, B4E2, B4E28, B4E29), B4#24/B4E41 (20 câu/phút không 429), B4#26/#27 (trần để trống, luyện không tính trần) | Chỉ e2e trước D38 (CI PR #54). Smoke không kiểm chạy đua (`buoc-4.md`, "Rủi ro còn mở"); không smoke nào đặt `reviews_per_group_per_day` (`grep -ln reviews_per_group_per_day scripts/*.mjs` rỗng) | **Configured, không còn kiểm tự động** (rủi ro đã chấp nhận ở D38) |

---

## (b) Mục mở trong as-built / design và nơi theo dõi

| # | Mục (nguồn) | Còn mở? (kiểm hôm nay) | Nơi theo dõi |
|---|---|---|---|
| 1 | Design B3 §14: cookie/CORS/CSP giữa `wordmet.com` và `api.`; định tuyến `/app`; email thật; nhắc đúng giờ khi server UTC; Job Scheduler sống khi Redis restart; múi giờ trên thiết bị thật | Mở (chờ Deploy) | `deploy-checklist.md` (chỉ trỏ tới §14, không chép); `PRODUCTION_READINESS_2026-10-21.md` G1-9 |
| 2 | **P1** xuất "từ chưa có nghĩa" bị `export-too-large` (`buoc-3.md:88`) | Mở: `EXPORT_MAX_ROWS` mặc định 5000 (`app-config.ts:226`), không có giới hạn riêng | Câu 18 trong "Câu đã rút lại (chưa chốt)" của `decisions/2026-10-20-buoc-0-3-fixes-decisions.md`; không ngày, không ai giữ. Xem B3-7 |
| 3 | **P2** thử lại SMTP không log (`buoc-3.md:91-92`) | Mở: `reminder-send.service.ts:81-82` xóa dòng rồi ném lỗi, không log | **Không có nơi theo dõi** ngoài as-built. Xem B3-4 |
| 4 | **L7** hash nội dung còn link cũ sau khi xóa entry gốc (`buoc-3.md:97`) | Không kiểm lại ở review này (Content) | Chỉ as-built Bước 3 |
| 5 | **L18** dạng chia library sai (`furnitures`, `leaved`…) | Mở; cách xử lý là duyệt CSV (việc tay) | as-built Bước 3; `evidence/commercialization-2026-10-19/5_project_inventory.md:151` |
| 6 | **L19** thêm câu đúng lúc xóa từ riêng: 404 nhưng chưa có test | Code có (`sentences.service.ts`, bắt `P2003`), test vẫn không có | Chỉ as-built |
| 7 | Ngưỡng 500 ms, các số mặc định / khoảng của Settings (`ASSUMPTION`) | Mở | Không có nơi theo dõi riêng |
| 8 | M9: tần suất lỗi "không rõ đã giao" với SMTP thật; lỗi 5xx thật | Mở (chờ Deploy) | Design §14 (gián tiếp) |
| 9 | **Test nhắc học chập chờn 18/10** ("two workers … exactly one email" ra 2 email; M7 ra 2 dòng), nguyên nhân chưa kiểm (`buoc-4.md:130-133`) | Mở; bộ test đã xóa; không thấy lần chạy tay hai worker nào trong `docs/deliveries` | Design B4 §16; `PRODUCTION_READINESS` G1-10 (đề xuất). **Không có** trong `deploy-checklist.md` hay `IMPROVEMENT_PLAN_2026-10-28.md` (grep ở mục d). Xem B3-1 |
| 10 | **D39** mở phiên "Ôn tất cả" 1,9–2,8 s, "đo lại trước pilot" | Mở; code gây chậm còn nguyên (`practice-reads.queries.ts:95-98`) | Review 20/10 §5 (T7 "Giữ"); `PRODUCTION_READINESS` G0-16. **Không có** trong deploy-checklist (chỉ có `test:scale` cho tra từ T5). Xem B4-1 |
| 11 | D38: không còn test tự động chạm Postgres/Redis cho `apps/api` | Mở (đã chấp nhận) | Design B4 §16; `deploy-checklist.md` chỉ giữ một ca (rate limit ranh giới cửa sổ) |
| 12 | LN2–LN8, PX3, PX5, PX6 (mức Thấp, review 20/10) | Kiểm lại hôm nay: LN2, LN3, LN4, LN5, LN6, LN7, LN8, PX3, PX5, PX6 **vẫn còn** (dòng code ở mục c) | "Để đợt sau (D11)" ở `reviews/2026-10-20-buoc-0-3-review.md` §5; `launch-completeness.md:233`. Không có kế hoạch hay đợt nào nhận |
| 13 | Quyết định treo: LN4 (câu 21), LN5 (câu 22), P1 (câu 18), PX5 (câu 27) | Chưa chốt | "Câu đã rút lại" trong decisions sửa thiếu sót 0–3, ghi "hỏi lại ở đợt lỗi Thấp" — đợt đó chưa có |
| 14 | Design B3 §17 as-built và header "chưa duyệt toàn bộ… đang implement" | Chưa sửa (design dòng 3–5, 462–472) | `buoc-3.md` ghi "Chưa làm trong PR này" |
| 15 | Rủi ro "người học bỏ qua gợi ý Cần ôn tập" — đếm nhờ `origin = practice` | Có cột (`learning.prisma`, `origin`), chưa có số đo nào | Không có |

---

## (c) Phát hiện

Không có phát hiện mức **Cao**: không tìm thấy kịch bản IDOR, lộ dữ liệu qua log, vượt ranh giới module, hay sai lượt cụ thể
(mục d ghi các lệnh tìm và đối chứng).

<a id="b3-1"></a>
### B3-1 — Vừa — Máy trạng thái gửi nhắc học (D37) không có test nào, và nghi vấn gửi trùng chưa từng được kiểm

- **Mô tả.** Lời hứa B3#16 "đúng một email trong ngày địa phương" và B3E24–B3E27 nằm trọn trong `ReminderSendService` /
  `ReminderTickService`. Từ D38, không unit test, smoke hay e2e nào chạy hai class này. Hai lần test cũ ra 2 email / 2 dòng ngày
  18/10, nguyên nhân chưa kiểm, và lần chạy tay hai worker được đề xuất (G1-10) chưa có.
- **Bằng chứng.**
  - `find src/notifications -name "*.spec.ts"` → chỉ `account-eraser.provider.spec.ts`, `reminder-message.spec.ts`,
    `eligibility.spec.ts`. `grep -rln "ReminderSendService\|ReminderTickService" src --include=*.spec.ts` → rỗng (đối chứng:
    `eligibility` được tìm thấy trong `eligibility.spec.ts`).
  - Không smoke nào đọc `reminder_deliveries` (`grep -l reminder_deliveries scripts/smoke*.mjs` rỗng).
  - Các nhánh không test: `reminder-send.service.ts:45` (bỏ qua khi có dòng), `:49` (ngày cũ), `:57` (ghi `sending`), `:67-82`
    (phân loại lỗi: giữ `sending` / `failed` / xóa rồi thử lại), `:89` (outcome khác `sent`).
  - Nghi vấn: `docs/deliveries/buoc-4.md:130-133`; G1-10 ở `PRODUCTION_READINESS_2026-10-21.md:280`; không có trong
    `deploy-checklist.md` (grep `hai worker|two worker|nhắc học|reminder` = 0).
- **Kịch bản hỏng.** (1) Một lần sửa sau này bỏ dòng `:45` hoặc đổi thứ tự `:81` (xóa `sending` trước khi chắc chắn chưa giao):
  người học nhận 2–3 email nhắc một ngày, CI vẫn xanh. (2) Nếu lần ra 2 email ngày 18/10 là lỗi thật chứ không phải lỗi test,
  nó lên production cùng Deploy mà không ai thấy trước.
- **Đề xuất.** Unit test cho `ReminderSendService.send` với Prisma và provider giả: có dòng → không gửi; ngày cũ; tắt nhắc; lỗi
  `responseCode` 4xx / 5xx / `ETIMEDOUT` sau kết nối → đúng trạng thái dòng và có/không ném lỗi. Thêm G1-10 (chạy tay hai worker)
  vào `deploy-checklist.md`, hoặc thêm bước nhắc học vào một smoke (worker thật, `REMINDER_TICK_SECONDS=60`, Mailpit API).

<a id="b3-2"></a>
### B3-2 — Vừa — Luật trần và các thao tác học quan trọng chỉ nằm trong raw SQL / service không có test, không smoke nào gọi

- **Mô tả.** Trần mỗi nhóm (B3#6, B3E9, B3E10), trần để trống (B4#26, D35), "luyện không tính trần" (B4#27), xóa nhóm (B3#13,
  B3E18), chống gửi trùng lượt ôn theo `review_id` (B3E4) và "Học lại" (B3#7) đều không còn thứ gì fail khi chúng sai.
- **Bằng chứng.**
  - Logic trần ở SQL: `learning/queue/queue.queries.ts:20-64, 70-97`; `learning/practice/practice-reads.queries.ts:27-65`. Unit test
    mock `$queryRaw` nên SQL không chạy: `queue-list.spec.ts:17`, `practice-reads.service.spec.ts:14`.
  - Service không có spec nào nhắc tới: `grep -rl "\bReviewsService\b|\bBacklogService\b|\bQuickAddService\b" src --include=*.spec.ts`
    → rỗng (đối chứng: `GroupsService` có trong 5 spec). `groups.service.spec.ts:28,34` chỉ test trần số nhóm, không test xóa nhóm.
  - Không smoke nào gọi `/queue`, `/v1/reviews`, `/backlog`, `items/relearn` hay `DELETE /v1/groups` (vòng `grep -l` ở mục d).
  - Bằng chứng runtime cuối: e2e CI PR #54 (18/10, đã xóa), chạy tay Bước 3 18/10 (không có xóa nhóm), chạy thật M2 giao diện
    người học 23/10 (`giao-dien-nguoi-hoc.md:106`, không ghi ca trần hay xóa nhóm).
  - Code đã đổi sau các lần đó: `fd2d926` (27/10, `queue.service.ts`, `items.service.ts`), `7ca7175` (18/10, trần để trống).
- **Kịch bản hỏng.** Một lần sửa `removableWhere` (`groups.service.ts:35`) đổi `every` thành `some`: xóa nhóm A làm mất lịch ôn của
  các từ còn ở nhóm B (mất dữ liệu học, không khôi phục được vì `learning_items` bị xóa). Hoặc đổi điều kiện `section = 'due'` ở
  `queue.queries.ts:48`: người học thấy quá nhiều / quá ít thẻ. Cả hai trường hợp CI vẫn xanh.
- **Đề xuất.** Một smoke `smoke:buoc-3` (kiểu `smoke:buoc-4`) cho: hàng ôn và trần (đặt trần 2/1 qua `PUT /v1/admin/settings`),
  `review_id` gửi lại, backlog + relearn (lùi `due_date` bằng `psql` như smoke 4), xóa nhóm khi từ nằm ở hai nhóm. Hoặc dựng lại
  một lệnh Testcontainers riêng cho các truy vấn này (đúng `testing-boundaries.md`: lệnh riêng, chạy trong CI).

<a id="b3-3"></a>
### B3-3 — Thấp — Lỗi DB trong `provider.send` bị coi là "không rõ đã giao": mất email hôm đó và chặn cả những ngày sau (LN2)

- **Bằng chứng.** `email.provider.ts:23` (`verifiedEmails`) và `:26` (`tryConsume`) chạy trong khối `try` của
  `reminder-send.service.ts:64-72` (lời gọi `provider.send` ở `:65`). `mail-error.ts:16-24`: lỗi không có `responseCode` hay `syscall: 'connect'` (lỗi Prisma) → `unknown`
  → giữ `sending`. `eligibility.ts:15-18` + `reminder-tick.service.ts:90`: `sending` của ngày cũ tính như đã gửi cho `min_gap_days`.
- **Kịch bản hỏng.** 20:00, DB chập chờn một giây trong lúc tra email: không email nào được gửi, nhưng người học bị tính là "đã nhắc"
  và mất thêm `min_gap_days` (mặc định 2) ngày không có nhắc.
- **Đề xuất.** Chỉ đưa lời gọi `mailer.send` vào khối phân loại (Bước 5 đã làm vậy: `entitlements/notices/notice-sender.service.ts:106-107`
  chỉ bọc `mailer.send`); lỗi khác → xóa `sending`, ném lỗi để BullMQ thử lại.

<a id="b3-4"></a>
### B3-4 — Thấp — Lần thử lại do SMTP tạm lỗi không để lại dòng log nào (P2), và không ai theo dõi câu hỏi này

- **Bằng chứng.** `reminder-send.service.ts:81-82` (xóa `sending`, ném lỗi, không log); `reminder-queue.service.ts` không nghe sự
  kiện `failed` của Worker (`grep -rn "on('failed'" src/notifications` rỗng; đối chứng: `reminder_failed` có ở
  `reminder-send.service.ts:76`). Câu hỏi cho chủ dự án chỉ nằm ở `buoc-3.md:91-92`.
- **Kịch bản hỏng.** Sau Deploy, SMTP chập chờn vài giờ: log không có dấu vết nào cho tới khi hết lượt thử (`reminder_failed`).
- **Đề xuất.** Log `reminder_retry` (`user_id`, `local_date`, `kind`, `attempt`, tên lỗi) trước khi ném lỗi; hoặc đưa câu P2 vào
  deploy-checklist để chủ dự án quyết.

<a id="b3-5"></a>
### B3-5 — Thấp — Kiểm "được thấy nghĩa này" chạy ngoài transaction và xóa mục học không khóa dòng (LN3, LN7, vẫn còn)

- **Bằng chứng.** `items.service.ts:60` và `quick-add.service.ts:57` gọi `visibleSenseIds` trước `$transaction`. `items.service.ts:134`,
  `:145` gọi `deleteItem` (`:250-251`) mà không gọi `lockItems` (có sẵn ở `learning-lock.ts`); `groups.delete` và `relearn` thì có gọi.
- **Kịch bản hỏng.** Người học xóa từ riêng X trên máy tính đúng lúc điện thoại thêm X vào nhóm: mục học mồ côi trỏ tới nghĩa đã
  xóa, hiện "nghĩa đã đổi" (người học tự bỏ được). Hoặc "Bỏ khỏi việc học" chạy cùng lúc với một lượt ôn: dòng nhật ký
  `item_removed` ghi `level_before` cũ. Chỉ ảnh hưởng dữ liệu của chính người đó.
- **Đề xuất.** Kiểm lại trong transaction sau khóa người học; gọi `lockItems(tx, userId, [itemId])` trước `deleteItem`.

<a id="b3-6"></a>
### B3-6 — Thấp — Design, code và as-built lệch nhau ở 5 chỗ; các quyết định cần chủ dự án bị treo không hạn

| Chỗ | Design | Code / thực tế |
|---|---|---|
| B3E2 (LN5) | `design B3:378`: "Đã biết" 23:59 rồi 00:01 → lần sau là ôn sớm | `schedule.ts:31-32`: từ mức 0 luôn đến hạn, nên từ mới lên **mức 2** sau hai lần bấm qua nửa đêm. `schedule.spec.ts:62-68` chỉ test từ mức 2 |
| §8.3 (LN8) | `design B3:304-305`: `sending` của ngày cũ **không** tính vào `min_gap_days` | `eligibility.ts:15-18,44` + `reminder-tick.service.ts:90`: có tính (khớp D37) |
| §6.3 (LN4) | Một con số "tổng số từ" | `groups.service.ts:79,91` đếm cả nghĩa đã đổi; `queue.queries.ts:38` chỉ đếm nghĩa còn thấy; `queue.queries.ts:24` ngăn 0 vẫn lọc theo ngày (trái M2) |
| §19 | `design B3:493`: "AGID chưa đo" | Đã đo: commit `121be0c` ("fixture 50/50 … 99/100 by hand") |
| Header, §17 | `design B3:3-5`: "chưa duyệt toàn bộ… đang implement"; §17 chưa có as-built | `buoc-3.md`: đã merge PR #29–#43; "§17 as-built… chưa làm" |

LN4, LN5 là câu 21, 22 của "Câu đã rút lại (chưa chốt)" (`decisions/2026-10-20-buoc-0-3-fixes-decisions.md`), chờ một "đợt lỗi
Thấp" chưa có lịch. **Đề xuất:** sửa ba câu design (B3E2, §8.3, §19) và header; đưa LN4/LN5 vào một danh sách có người giữ.

<a id="b3-7"></a>
### B3-7 — Thấp — Màn xuất CSV của admin không có lựa chọn "Từ chưa có nghĩa" (đã chốt 16/10), và P1 chưa chốt

- **Bằng chứng.** `docs/mockups/2026-10-16/UI-CONTEXT.md:26` ("Chốt 16/10"), Figma A/30 (`figma-review.md:45`). API có route
  (`content-pipeline/export/senses-export.controller.ts:18-26`), nhưng admin chỉ gọi `senses/export` (`content-api.ts:129`;
  `grep -rn "entries/export" apps/admin/src` rỗng). P1: `EXPORT_MAX_ROWS` 5000 < 7.799 entry CEFR-J (`buoc-3-test-flow.md:82-83`).
- **Kịch bản hỏng.** Luồng soạn nội dung của Q-B (AI soạn CSV ngoài app, chủ dự án duyệt) cần danh sách ~7.800 từ chưa có nghĩa;
  chủ dự án phải tự gọi API theo từng level bằng tay. Không mất dữ liệu.
- **Đề xuất.** Chốt câu 18, rồi thêm lựa chọn vào ExportPage (bắt chọn level, hoặc nâng giới hạn riêng), hoặc ghi rõ là đã bỏ.

<a id="b3-8"></a>
### B3-8 — Thấp (chưa đo) — Đếm lượt ôn hôm nay dùng index không khớp, trên bảng nhật ký không bao giờ dọn

- **Bằng chứng.** `groupStatsQuery` (`queue.queries.ts:46-52`) và `todayIdsQuery` (`practice-reads.queries.ts:36-42`) lọc
  `learning_log` theo `user_id` + `local_date`, không theo `group_id`; index duy nhất phù hợp là `(user_id, group_id, local_date)`
  (`migrations/20261017210000_learning/migration.sql:71`). `learning_log` chỉ thêm, không có job dọn (K14). Postgres 17
  (`docker-compose.yml:12`). `ASSUMPTION`: planner đọc mọi dòng nhật ký của người đó qua tiền tố `user_id` (chưa chạy `EXPLAIN`).
  Phép đo quy mô hiện tại không có dòng nhật ký nào (LN-TG3, inventory 20/10).
- **Kịch bản hỏng.** Người học dùng hai năm (vài chục nghìn dòng nhật ký): `GET /v1/groups`, mở phiên "Hôm nay" và mỗi tick nhắc học
  chậm dần theo tuổi tài khoản. Chưa có số.
- **Đề xuất.** Thêm dòng nhật ký vào `pnpm test:scale`; nếu chậm thì thêm index `(user_id, local_date)`.

<a id="b4-1"></a>
### B4-1 — Thấp — D39 "đo lại trước pilot" không nằm trong danh sách việc nào sẽ chạy

- **Bằng chứng.** Truy vấn chậm còn nguyên: `practice-reads.queries.ts:95-98` (hai subquery tương quan mỗi dòng). Không có lần đo nào
  sau 18/10 (`buoc-4.md` là số cuối). `deploy-checklist.md` có `test:scale` chỉ cho tra từ (T5) (grep `D39|T7|Ôn tất cả` = 0);
  `IMPROVEMENT_PLAN_2026-10-28.md` cũng 0. Chỉ có G0-16 trong `PRODUCTION_READINESS` (một đề xuất, chưa được nhận).
- **Kịch bản hỏng.** Người học có rất nhiều từ (tới 100 × 2.000) chờ 2–3 s mỗi lần mở "Ôn tất cả". Không tăng theo số người dùng.
- **Đề xuất.** Thêm một dòng vào `deploy-checklist.md` mục "Đo tải trước launch": chạy cả phép đo Practice của `test:scale`.

<a id="b4-2"></a>
### B4-2 — Thấp (chưa đo) — `practice_questions` không có index cho câu không-AI; job dọn mỗi giờ xóa không chia lô

- **Bằng chứng.** Index duy nhất ngoài PK: `practice_questions_ai_user_sense_idx … WHERE source = 'ai'`
  (`migrations/20261022090000_buoc7_practice_ai/migration.sql:144`). Xóa theo `(user_id, sense_id)` trong transaction `deleteMyWord`:
  `private-senses-cleanup.provider.ts:45`; theo `user_id` khi xóa tài khoản: `practice/maintenance/account-eraser.provider.ts:39`. Job
  mỗi giờ: `practice-cleanup.service.ts:38-42` (một `DELETE` không chia lô, anti-join toàn bảng). Mỗi lần hỏi tạo một câu
  (`sessions.service.ts:641`). Đã ghi ở inventory 20/10 ("PX declined … open (perf, S)"), chưa có nơi theo dõi.
- **Kịch bản hỏng.** Bảng lên vài triệu dòng: xóa một từ riêng phải quét cả bảng trong lúc giữ khóa người học (transaction 30 s).
- **Đề xuất.** Index `(user_id, sense_id)` không điều kiện (dùng `CREATE INDEX CONCURRENTLY` theo DB18); chia lô cho job dọn.

<a id="b4-3"></a>
### B4-3 — Thấp (SUSPECTED) — Đáp án gõ chứa U+0000 có thể ra 500 thay vì 400

- **Bằng chứng.** `answers.controller.ts:16` chỉ kiểm độ dài; `normalize.ts:2-16` không bỏ ký tự NUL; `answer_raw` / `answers_tried`
  là `TEXT` (Postgres không nhận `\0`). Đối chiếu: `quick-add.controller.ts:16` có `!value.includes('\0')`. Chưa probe.
- **Kịch bản hỏng.** Client lỗi hoặc người dò gửi `"\u0000"`: 500 kèm dòng log `request_failed`, không ghi lượt (transaction rollback).
- **Đề xuất.** Thêm kiểm NUL vào schema đáp án như quick-add.

<a id="b4-4"></a>
### B4-4 — Thấp — Ba điểm Practice đã hoãn vẫn còn, kèm một quyết định treo

- **Bằng chứng.** PX3: `learning/practice/practice-review.service.ts:47-56` trả `applied` khi đã có `review_id`, không so hành động
  (chỉ Practice chặn ở `practice-reviews.service.ts:45`). PX5: `order.ts:53` `overdue_first` so `due_date` thô nên từ mới (mức 0) đứng như
  "quá hạn nhất"; câu 27 treo. PX6: `migration.sql:9` `"types" TEXT[]` cho phép null; `hint_level` không có CHECK (không migration nào
  sau đó thêm).
- **Đề xuất.** Gom vào cùng danh sách có người giữ như B3-6.

---

## (d) Lệnh tìm "không có", kèm đối chứng

| Kết luận "không có" | Lệnh | Đối chứng (thứ chắc chắn có) |
|---|---|---|
| Learning / Practice / Notifications / Settings không truy cập model của Content / Identity bằng Prisma | `grep -rhoE "\b(tx\|prisma\|db\|client)\.(user\|sessionChain\|entry\|sense\|senseRevision\|contextSentence\|entryInflection\|entryLevel\|topic\|…)\b" src/learning src/practice src/notifications src/settings` → chỉ 4 lần `prisma.sessionChain`, đều trong `*.controller.spec.ts` (mock guard) | Cùng lệnh với model của chính module: `tx.learningItem` 21, `tx.practiceSession` 33, `prisma.reminderDelivery` 7, `tx.appSetting` 3 |
| Raw SQL của các module này không có `FROM/JOIN` bảng của module khác, trừ đoạn SQL Content xuất ra | `grep -rnoE "\b(FROM\|JOIN\|UPDATE\|INTO\|DELETE FROM)\s+[a-z_]+"` → chỉ `practice_*`, `learning_*`, `group_items` và CTE. `senses`/`entries` chỉ đi vào qua `visibleSenseCondition` (`content/learner/visible-senses.ts:9-15`, comment ghi rõ là cách được chọn để Learning không tự query bảng Content) | Cùng lệnh thấy `FROM practice_session_items` 7, `JOIN group_items` 5 |
| Không có `@relation` xuyên module | Đọc hết `prisma/models/{learning,practice,notifications,settings}.prisma`: relation chỉ `GroupItem→LearningGroup/LearningItem`, `PracticeSessionItem→PracticeSession/PracticeQuestion`, `PracticeReport→PracticeSessionItem/PracticeReportReason` | Có relation trong module (ví dụ `group_items_group_id_fkey`, `migration.sql:77`) |
| IDOR: không có truy vấn theo id do client gửi mà thiếu `userId` | Đọc mọi lối vào: `assertOwned` (`groups.service.ts:123-127`) dùng ở groups/items/queue/backlog/practice-reads; `reviews.service.ts:39-48` (khóa theo `user_id`, nhóm có `group: { userId }`); `items.service.ts:131,144`; `backlog.service.ts:81`; `answers.service.ts:173`; `practice-reviews.service.ts:36,92`; `sessions.service.ts:345-349`; `reports.service.ts:101`; `history.service.ts:98-100`; `quick-add.service.ts:89-93` (Content xóa theo owner) | Chạy tay Bước 3 bước 11: A xóa từ riêng của B → 404 (`buoc-3-test-flow.md`) |
| Log của các module này không chứa câu ngữ cảnh, đáp án thô, email | `grep -rn "logger\." src/learning src/practice src/notifications src/settings src/content/sentences …` → chỉ id, ngày, `kind`, `reason`; `error` đi qua `serializeError` chỉ giữ `name`, `code` (`common/logging/app-logger.ts:19-31`); khóa `answer`, `contextSentence` bị che (`:16`) | Cùng lệnh tìm thấy `context_sentence_added` với `sentence_id` (`sentences.service.ts:55`); smoke 4 ghi log API không có chữ nào của từ |
| Không có unit test cho gửi / tick nhắc học | `find src/notifications -name "*.spec.ts"`; `grep -rln "ReminderSendService\|ReminderTickService" src --include=*.spec.ts` → rỗng | `eligibility` có trong `eligibility.spec.ts` |
| Không có spec cho `ReviewsService`, `BacklogService`, `QuickAddService`, `ReminderPrefsService` | `grep -rl "\b<Class>\b" src --include=*.spec.ts` từng tên → rỗng | `GroupsService` → 5 file; `PracticeCleanupService` → `practice-cleanup.spec.ts` |
| Không smoke nào gọi luồng flashcard / nhắc học | vòng `grep -l -- "<path>" scripts/smoke*.mjs` cho `/queue`, `/v1/reviews`, `/backlog`, `items/relearn`, `reminder_deliveries`, `review_id` → rỗng | Cùng vòng: `/v1/quick-add` có ở 4 smoke, `my-words` ở 2, `admin/settings` ở 4 |
| Không smoke nào xóa nhóm | `grep -n "DELETE" scripts/smoke-buoc-4.mjs` → chỉ `DELETE /v1/my-words` (`:496`); `smoke-buoc-0-3-fixes.mjs` chỉ `POST /v1/groups` | Có lệnh xóa từ riêng ở `:496` |
| Không có test / smoke nào đặt trần lượt ôn | `grep -rln "reviews_per_group_per_day\|new_per_group_per_day" scripts src --include=*.spec.ts` → chỉ `settings.definitions.spec.ts` (kiểm khoảng) | File spec đó được tìm thấy |
| Admin không gọi API xuất "từ chưa có nghĩa" | `grep -rn "entries/export" apps/admin/src` → rỗng | `senses/export` có ở `content-api.ts:129` |
| Không có index thường cho `practice_questions` | `grep -rn -i "INDEX.*\(practice_questions\|practice_reports\|learning_log\|practice_sessions\)" prisma/migrations/*/migration.sql` → với `practice_questions` chỉ có index điều kiện `WHERE source = 'ai'` | Cùng lệnh thấy index của `learning_log` và `practice_sessions` |
| Lần chạy tay hai worker (G1-10) chưa có | `grep -rln -i "hai worker\|two workers\|G1-10" docs` → chỉ design / plan / review / research, không file nào trong `docs/deliveries` sau 19/10 | `buoc-4.md` (19/10) được tìm thấy |
| Việc Bước 3/4 không nằm trong `deploy-checklist.md` | `grep -c` lần lượt `hai worker`, `T7`, `D39`, `Ôn tất cả`, `nhắc học`, `reminder`, `EXPORT_MAX` → 0 | `TRUST_PROXY` → 1; `§14` → 1 |
| Việc Bước 3/4 không nằm trong `IMPROVEMENT_PLAN_2026-10-28.md` | `grep -c` `D39`, `T7`, `LN`, `PX`, `D38`, `L18` → 0; các dòng khớp `worker`/`nhắc`/`P1`/`P2` là chuyện khác (eval, PWA, C6, quy trình) | `Docker` → 3 |
