# Bước 3 — test flow phần hệ thống

> **Trạng thái 18/10/2026:** kịch bản viết 17/10 cho plan Task 22, Step 2; **đã chạy 18/10/2026** trên `dev` `c1f775d` (sau mọi bản sửa
> review, PR #38–#43). Kết quả ở mục 3, phần chưa kiểm ở mục 4. G5 (D45): chủ dự án tự báo Bước 3 xong; file này chỉ giao kết quả,
> không tự tuyên bố xong.

## 1. Gate tự động (Task 22, Step 1)

Chạy **khi phiên điều phối cho lượt chạy toàn bộ trên máy** (máy từng hết RAM khi nhiều luồng chạy cùng lúc).

| Ở đâu | Lệnh (PowerShell) |
|---|---|
| `apps/api` | `pnpm lint; pnpm exec tsc --noEmit -p tsconfig.json; pnpm build; pnpm test; pnpm test:e2e` |
| `apps/api` (riêng) | `pnpm test:e2e:scale` (Review Focus 5: 100 nhóm × 2.000 từ, `GET /v1/groups` < 500 ms — ngưỡng `ASSUMPTION`) |
| `apps/admin` | `pnpm test; pnpm build:e2e; pnpm test:e2e; pnpm test:e2e:real` |

So số test với cuối Bước 2.5 (API 578 unit + 475 e2e; admin 219 unit + 67 mocked e2e + 7 real-stack e2e — `buoc-2-5.md`).

## 2. Chạy tay (Task 22, Step 2)

**Môi trường:** DB mới (đề xuất `english_learning_b3manual` trên Postgres 5434; DB `english_learning` của chủ dự án không bị
đụng), Redis 6380 với `JOB_QUEUE_PREFIX=wordmet-b3run`, Mailpit (`http://localhost:8025`). `.env` của API cần
`LEARNER_APP_URL` (bắt buộc từ PR #30), `REMINDER_TICK_SECONDS=60`; `REMINDER_RETRY_BACKOFF_MS` để mặc định (60 000, PR #38). Chạy `pnpm db:setup`, `pnpm build`, rồi API + worker
(`pnpm run:dev`). Gọi API trực tiếp (không có giao diện người học ở phần hệ thống).

Nếu chạy trên một DB đã có dữ liệu cũ: gọi `POST /v1/admin/content/inflections/backfill` một lần để các entry cũ có dạng chia
(lưu ý của luồng A).

| # | Bước | Gọi | Quan sát cần ghi |
|---|---|---|---|
| 1 | Tạo admin | Đăng ký qua API, OTP từ Mailpit, `pnpm admin:grant <email>` | `granted` |
| 2 | Nạp file CEFR-J 1.5 thật | Đăng ký nguồn có license, `POST /v1/admin/content/uploads` với `docs/preparation/evidence/wordlists_2026-10-02/cefrj-vocabulary-profile-1.5.csv`; theo dõi `GET .../uploads/{id}` | Số dòng tạo mới, bị loại; thời gian. File CEFR-J không có cột `inflections`, nên dạng chia đến từ bước 3 |
| 3 | Sinh dạng chia | `POST /v1/admin/content/inflections/backfill` → `GET .../backfill/{id}` tới khi xong | Trạng thái job, số dạng chia sinh ra; xem một entry bất quy tắc (`go`: `went`, `gone`) có đúng không |
| 4 | Xuất "chưa có nghĩa" (B3#15) | `GET /v1/admin/content/entries/export` | File `entries-without-sense.csv`; số dòng ≈ 7.799 (chưa entry nào có nghĩa) |
| 5 | Điền nghĩa cho vài dòng, **bỏ trống cột topics**, upload lại; trong cùng file: một dòng ô `inflections` = `-`, một dòng ghi dạng chia tay (ví dụ `past:went;past_participle:gone` cho `go`, file FA) | `POST /v1/admin/content/uploads`; rồi file FB chỉ có dòng `go` với `past:goed`; rồi upload lại đúng file FA | Lô hoàn tất, senses tạo mới khớp entry CEFR-J có sẵn. Dòng `-`: entry không còn dạng chia nào, backfill sau đó không điền lại (M3). Sau FB, `go` có `goed`; sau FA lần hai, `go` có lại `went` (H1: dòng có ô `inflections` luôn được xử lý lại) |
| 6 | Publish không chủ đề (B3#14, B3E33) | `POST /v1/admin/content/senses/publish` với `items[{sense_id, revision}]` (hoặc qua admin UI) | `published` = số dòng, `refused` 0 (trước Bước 3 sẽ bị `topic-missing`) |
| 7 | Tạo learner | Đăng ký, xác minh OTP, `PATCH /v1/me` `{ native_language: "vi" }` | Không có `native_language` thì 403 `profile-incomplete` |
| 8 | Tra và thêm nhanh từ catalog (B3#8, B3#10, B3E14) | `GET /v1/lookup?q=went` (đã điền nghĩa cho `go`), rồi một dạng chia của từ **chưa có nghĩa** (ví dụ `q=deployed`); `POST /v1/groups`; `POST /v1/quick-add` `{ group_id, sense_id }` | `went` → `via_inflection` có `go` kèm nghĩa. Dạng chia của từ chưa có nghĩa → `via_inflection` vẫn có từ gốc (`entry_id`, `lemma`, `pos`) với `senses: []` (bản sửa M8 của luồng A), không lộ từ riêng của người khác. Mục học mức 0, hẹn hôm nay |
| 9 | Hàng ôn và ôn (B3#2, B3#4, B3#6) | `GET /v1/groups`, `GET /v1/groups/{id}/queue`, `POST /v1/reviews` (`known` / `review`) | Số "hôm nay" trên `GET /v1/groups` giảm; "Cần ôn tập" đưa từ lên đầu hàng |
| 10 | Danh sách cân nhắc (B3#7) | Chỉnh `due_date` một mục mức ≥ 1 về quá 60 ngày (SQL trên DB thử), `GET /v1/groups/{id}/backlog`, `POST /v1/items/relearn` | Mục ở backlog, không ở queue; relearn về mức 0 |
| 11 | Từ riêng (B3#9, B3E17) | `POST /v1/quick-add` với `new_word` + `sentence`; rồi `DELETE /v1/my-words/{id}` | Tạo cùng nhau; xóa sạch cả entry, nghĩa, câu, mục học |
| 12 | Nhắc học: chuẩn bị | Learner A (đã xác minh, còn một thẻ hôm nay), learner B (chưa xác minh, có thẻ). "Vắng mặt" đọc từ `users.last_seen_at`, ghi khi đăng nhập hoặc làm mới phiên (PR #39): A vừa đăng nhập nên nhận email nhắc thường. `PUT /v1/admin/settings` đặt `send_time` = mốc 15 phút kế tiếp theo giờ địa phương của learner | Lịch sử settings ghi người đổi (B3#19) |
| 13 | Nhắc học: chờ qua `send_time` + 1–2 tick (60 giây) | Mailpit | **Đúng một** email cho A (chủ đề `Tới giờ học từ vựng`, link `<LEARNER_APP_URL>/vi/app/settings`, không có từ nào); **không** email cho B; `reminder_deliveries` một dòng `sent` cho A |
| 14 | Chờ thêm vài tick | Mailpit, log worker | Vẫn một email cho A; log `reminder_skipped` không chứa email |
| 15 | Mailpit tắt giữa chừng (tuỳ chọn) | Đặt `send_time` cho learner C, dừng container Mailpit trước tick, bật lại sau ~2 phút | Lỗi kết nối được phân loại "chắc chắn chưa giao" (PR #38): dòng `sending` bị xoá, job thử lại sau 60 giây, rồi 120 giây; Mailpit bật lại kịp thì C nhận đúng một email |

Lưu output (log, file CSV, ảnh Mailpit) để đính vào PR; không commit dữ liệu người dùng.

## 3. Kết quả (18/10/2026, giờ VN 00:13–00:39; UTC 17/10 17:13–17:39)

**Tóm tắt:** 15/15 bước đã chạy; 14 đạt, bước 4 đạt một phần (P1). Không tìm thấy lỗi code nào của Bước 3; hai phát hiện (P1, P2) là
câu hỏi cho chủ dự án. DB `english_learning_b3manual` và các key Redis `wordmet-b3run:*` để lại làm bằng chứng, không có dữ liệu thật.

**Môi trường thật của lần chạy.** Nhánh `docs/buoc-3-system-as-built` sau khi merge `origin/dev` `c1f775d` (code giống `dev`). DB mới
`english_learning_b3manual` (Postgres 5434, `pnpm db:setup`: 22 migration), Redis 6380 với `JOB_QUEUE_PREFIX=wordmet-b3run`, Mailpit 8025.
`pnpm build`, rồi API + worker bằng `node scripts/run-dev.mjs`, `REMINDER_TICK_SECONDS=60`. Worktree không có `apps/api/.env` và hook của
máy chặn ghi file `.env`, nên như Bước 2.5: một script nhỏ lấy giá trị không bí mật từ `.env.example`, sinh secret trong bộ nhớ, truyền thẳng
cho tiến trình; không secret nào ghi ra đĩa. Gọi API bằng script Node (`fetch`), đọc DB bằng `psql` trong container; script, CSV và log chỉ
lưu local, không commit. Learner A, B, C đặt múi giờ `America/New_York`: lúc chạy, giờ VN là 00:xx, ngoài khoảng `send_time` cho phép
(06:00–22:00), nên không đặt được "mốc 15 phút kế tiếp" cho learner ở `Asia/Ho_Chi_Minh`. "Hôm nay" của họ là 2026-10-17.

| # | Kết quả | Bằng chứng |
|---|---|---|
| 1 | **Đạt** | Đăng ký, OTP từ Mailpit, `admin-grant.js` in `granted` (log `staff_role_changed`, `staff_role: admin`); `GET /v1/me` có `settings.manage`. Lần đầu script của tôi lỗi đường dẫn trước khi lưu mật khẩu, nên đặt lại mật khẩu qua `POST /v1/auth/otp` (`reset_password`) + `POST /v1/auth/password/reset` (204) |
| 2 | **Đạt** | Lô `succeeded` sau **196 giây** (worker `import_batch_finished` 194,8 s): 7.799 dòng, tạo mới 7.799, loại 0, `levels_created` 7.799, `variants_created` 174, `senses_created` 0. Lệch kịch bản: import **đã tự sinh dạng chia library** (9.262 dòng cho 5.227 entry), không phải đợi bước 3 |
| 3 | **Đạt** | Job `succeeded` (0,5 s), không thêm dòng nào (vẫn 9.262, tất cả `library`): entry đã có bộ library từ lúc import. `go/verb`: `goes`, `going`, `went`, `gone`; `child`: `children`. Không có `comparative`/`superlative` nào: tính từ không có bộ library (D46 vòng 3), đúng thiết kế |
| 4 | **Đạt một phần** (P1) | `GET .../entries/export?has_sense=false` → **400 `export-too-large`** ("limited to 5000 entries"): 7.799 > `EXPORT_MAX_ROWS=5000` của `.env.example`. Theo level: A1 1.164, A2 1.411, B1 2.446, B2 2.778, C1 0, C2 0 = **7.799**. Header đúng 14 cột (có `inflections`, `_level`, `_inflections`); dòng `go,verb,…,A1,third_person:goes; present_participle:going; past:went; past_participle:gone` |
| 5 | **Đạt** | FA (6 dòng, `topics` trống): `succeeded`, `senses_created` 6, `entries_created` 0 (khớp entry CEFR-J); `go` có 4 dạng `reviewed`. FB (`go` `past:goed`): `updated` 1, `go` chỉ còn `past:goed`. FA lần hai: `updated` 1, `unchanged` 5, `go` có lại `went`, `gone`, `goes`, `going` (**H1 đạt**). Dòng `-`: `information` vốn không có dạng nào nên không chứng minh được; thêm file FC `computer,noun,…,-`: `computers` (library) mất, backfill sau đó **không điền lại** (**M3 đạt**). Backfill sau FA: `go` giữ bản `reviewed` |
| 6 | **Đạt** | Export `status=open_draft` 7 dòng, `topics` đều trống; `POST .../senses/publish` 7 item → 200, cả 7 `outcome: published` (không `topic-missing`); DB 7/7 sense có `live_revision_id` |
| 7 | **Đạt** | A (đã xác minh) trước khi có `native_language`: `GET /v1/groups` và `GET /v1/lookup` đều **403 `profile-incomplete`**; `PATCH /v1/me {native_language: "vi"}` 200, sau đó `GET /v1/groups` 200 `{"items":[]}`. B tạo không xác minh (`email_verified: false`) |
| 8 | **Đạt** | `lookup?q=went` (20 ms): `senses: []`, `via_inflection` = `past` → `go/verb` kèm nghĩa "đi" (A1). `q=walked`: `walk/verb` (`past`, `past_participle`) với `senses: []` (**M8 đạt**). Kiểm riêng tư: B tạo từ riêng `deploy` (library `deployed`, `deploying`, `deploys`); A tra `deployed` và `deploy` → `senses: []`, `via_inflection: []`; B tra `deployed` thấy từ của mình (`scope: private`). `POST /v1/groups` 201; 5 lần `POST /v1/quick-add {group_id, sense_id}` 201 (`created_item: true`); `GET /v1/items?sense_ids=` (phân tách bằng dấu phẩy): cả 5 mức 0, hẹn `2026-10-17` |
| 9 | **Đạt** | Trước: `today {priority 0, due 0, new 5}`, queue `go → apple → teacher → coffee → run` (mục `new`). `known` cho `apple` → mức 1, hẹn 2026-10-18; gửi lại cùng `review_id` → cùng kết quả; cùng `review_id` khác `answer` → 400. `review` cho `teacher` → mức 1, hẹn hôm nay, `priority: true`. Sau: `today {priority 1, due 0, new 3}`, queue `teacher(ưu tiên) → go → coffee → run` |
| 10 | **Đạt** | SQL đặt `due_date` của `apple` (mức 1) = 2026-08-17 (quá 61 ngày). `GET .../backlog`: có `apple`, `days_overdue: 61`; queue không có `apple`; `GET /v1/groups` `backlog: 1`. `POST /v1/items/relearn` → `{"relearned":1}`, `apple` mức 0, hẹn 2026-10-17; backlog rỗng, `apple` về queue |
| 11 | **Đạt** | `quick-add` `new_word` `onboard` + `sentence` → 201 (`created_word`, `created_item`, có `sentence_id`). Đếm (entry riêng / sense / câu / mục học / `group_items` / log) của A: `0/0/0/5/5/9` → `1/1/1/6/6/10` → sau `DELETE /v1/my-words/{entry}` (204) về `0/0/0/5/5/9`. Xoá lần nữa → 404; A xoá từ riêng của B → **404** `not-found` |
| 12 | **Đạt** | A, B có `last_seen_at` (đăng nhập ngay trước đó). A còn thẻ (`priority 1, new 3`), `GET /v1/me/reminders` `{enabled: true, email_verified: true}`; B còn thẻ (`new 1`), `email_verified: false`. `PUT /v1/admin/settings` (version 0) `send_time` 20:00 → **13:30** → 200, version 1; PUT lại với version 0 → **409 `version-conflict`**; `GET .../history`: `reminders.send_time` 20:00 → 13:30, `changed_by` = admin (B3#19) |
| 13 | **Đạt** | Tick đầu sau 13:30 New York (17:30:23 UTC): log worker `reminder_sent` (`kind: regular`, `channel: email`); Mailpit có **đúng một** email cho A, chủ đề `Tới giờ học từ vựng`, nội dung "Hôm nay bạn còn từ cần ôn. Mở app để học vài phút nhé." + "Tắt nhắc học trong Cài đặt: http://localhost:3001/vi/app/settings" (chỉ bản text, không liệt kê từ). **Không** email nào cho B (chưa xác minh) hay admin (không có thẻ). `reminder_deliveries`: một dòng A, `2026-10-17`, `regular`, `sent` |
| 14 | **Đạt** | Thêm 3 tick (scheduler `every 60000`, đã chạy 22 lần): vẫn một email cho A, vẫn một dòng `sent`. Không có log `reminder_skipped` nào: tick lọc A ra trước khi tạo job (đã có dòng hôm nay), nên không có job để bỏ qua. Kiểm mạnh hơn: **không dòng log nào** của API và worker chứa `@` |
| 15 | **Đạt** (cách làm khác kịch bản) | Không tắt container Mailpit vì nó dùng chung với các phiên khác trên máy. Thay vào đó: tắt API + worker, chạy lại API bình thường và worker riêng với `SMTP_PORT=1026` (không có gì lắng nghe, cùng lỗi `ECONNREFUSED` như khi Mailpit tắt). Learner C (đã xác minh) thêm một thẻ lúc 17:34:15. Job `reminder-<C>-2026-10-17`: lần 1 ~17:34:23 và lần 2 ~17:35:23 lỗi `connect ECONNREFUSED 127.0.0.1:1026` (`atm` 2, `delay` 120000); giữa các lần không còn dòng `reminder_deliveries` nào (dòng `sending` đã xoá). Chạy lại worker với cổng đúng lúc 17:37:12; lần 3 lúc **17:37:23** (đúng +120 s) gửi được: C nhận **đúng một** email, dòng `sent`. Phát hiện P2 |

**Phát hiện**

- **P1 — Xuất "từ chưa có nghĩa" không kèm `level` bị chặn ở dữ liệu thật.** Tái hiện: DB vừa nạp CEFR-J 1.5, gọi
  `GET /v1/admin/content/entries/export?has_sense=false` → 400 `export-too-large`. Nguyên nhân: `streamEntriesWithoutSense` dùng chung
  `EXPORT_MAX_ROWS` (mặc định 5.000) với xuất sense. Code làm đúng giới hạn đã đặt, nên đây là câu hỏi cho chủ dự án hơn là lỗi: giữ giới
  hạn và để màn xuất (plan giao diện) bắt chọn level (level lớn nhất B2 có 2.778 dòng), hay nâng giới hạn riêng cho lựa chọn này. Kịch
  bản bước 4 ("≈ 7.799 dòng trong một file") sai với cấu hình mặc định.
- **P2 — Lỗi SMTP tạm thời không để lại log nào.** Ở bước 15, hai lần thử lỗi `ECONNREFUSED` không sinh dòng log nào ở worker; chỉ thấy
  trong hash job của BullMQ (`failedReason`, `atm`). Nguyên nhân: `reminder-send.service.ts` xoá dòng `sending` rồi ném lỗi để BullMQ thử lại
  mà không ghi log, và `reminder-queue.service.ts` không nghe sự kiện `failed`. Chỉ khi hết lượt (`reminder_failed`) hoặc lỗi "không rõ"
  (`reminder_outcome_unknown`) mới có log. Hệ quả: khi Deploy, SMTP chập chờn sẽ không thấy được qua log. Không phải lỗi theo design 8.3
  (design không đòi log lần thử lại), nên là câu hỏi cho chủ dự án: thêm một log `reminder_retry` (`user_id`, `local_date`, `kind`, số lần
  thử, loại lỗi) hay không.
- **Lệch kịch bản, không phải lỗi:** (1) bước 2 ghi "dạng chia đến từ bước 3", thật ra import đã tự sinh bộ library (PR #37), backfill chỉ
  cần cho entry tạo trước PR #37; (2) bộ library không có dạng so sánh của tính từ (D46 vòng 3); (3) dòng `-` cần một entry đang có dạng
  chia mới kiểm được M3 (`information` không có sẵn dạng nào), nên đã thêm file FC.
- **L18 vẫn thấy trên dữ liệu thật** (việc còn mở, không sửa ở đây): `furniture → furnitures`, `Internet → Internets`, `meat → meats`,
  `pork → porks`, `mother-in-law → mother-in-laws`, `leave → leaved` (cạnh `left`), `lie` gộp `lay` và `lied`.
- Ghi chú khi chạy lại: `POST /v1/auth/register` đã tự gửi mã xác minh; gọi thêm `POST /v1/auth/otp` (như `smoke-buoc-2.mjs`) thì người
  dùng nhận 2 email cùng lúc. `GET /v1/items` nhận `sense_ids` là một chuỗi phân tách bằng dấu phẩy, không phải tham số lặp. Cùng
  `review_id` khác nội dung trả 400 với `type: about:blank`, giống hệt `Idempotency-Key` dùng lại từ Bước 0.

## 4. Chưa kiểm ở lần này

- **Gate §1 không chạy trên máy** (luật chung: máy từng hết RAM khi nhiều phiên chạy cả bộ e2e). Chỉ `pnpm build` và `pnpm db:setup`
  trên DB mới, cả hai xanh. Cổng là CI: số test lấy từ CI của PR #43 (code giống `dev` `c1f775d`): API 681 unit + 688 e2e + phép đo quy mô
  (median 335 ms); admin 290 unit + 138 e2e API giả (53 skipped) + 8 e2e API thật. CI của PR ghi kết quả này chạy lại cùng bộ đó.
- **Giao diện:** B3E32 (app người học bị chặn ở production) và B3E34 (mở link nhắc học khi chưa đăng nhập) thuộc plan giao diện. Lần chạy
  này chỉ gọi API, không mở `apps/admin` hay `apps/web`.
- **Nhắc học theo thời gian dài:** email "Đã lâu rồi bạn chưa vào học" (vắng 7–60 ngày), khoảng cách tối thiểu 2 ngày giữa hai email, dừng
  sau 60 ngày, ngưỡng 80% hạn mức email: không chạy tay (cần ngày trôi qua); chỉ có test (`eligibility.spec.ts`,
  `test/notifications/reminders.e2e-spec.ts`, `provider.e2e-spec.ts`).
- **Múi giờ:** chỉ chạy tay với `America/New_York` (giờ VN lúc chạy ngoài khoảng `send_time`). Các múi giờ biên (`Pacific/Kiritimati`,
  `Etc/GMT+12`, đổi giờ mùa đông) chỉ có test (`local-date.spec.ts`, `schedule.spec.ts`, `eligibility.spec.ts`,
  `reminders.e2e-spec.ts`).
- **Bước 15 không tắt container Mailpit** như kịch bản viết, mà cho worker trỏ tới một cổng không có gì lắng nghe (cùng loại lỗi
  `ECONNREFUSED`). Trường hợp Mailpit tắt khi đang giữa một kết nối (đã kết nối rồi mới mất) không được thử.
- **SMTP:** lỗi 5xx và lỗi "không rõ đã giao chưa" (timeout sau khi đã kết nối) chỉ kiểm bằng e2e với FakeMailer, Mailpit không giả lập
  được; tần suất M9 với SMTP thật chỉ đo được ở bước Deploy.
- **Dung lượng:** ngoài vài nghìn learner chưa đo (tick nhắc học); phép đo quy mô chỉ có 100 nhóm × 2.000 từ của một learner, ngưỡng
  500 ms là `ASSUMPTION`.
- **Review còn mở:** L7 (hash cũ còn link sau khi xoá entry gốc) và L19 (thêm câu đúng lúc xoá từ riêng) không tái hiện ở lần này.
  Độ đúng của bộ library trên toàn CEFR-J chưa chấm; chỉ thấy lại các ca L18.
