# Sửa thiếu sót Bước 0–3 — plan tóm tắt (20/10/2026)

Plan đầy đủ: [`../superpowers/plans/2026-10-20-buoc-0-3-fixes.md`](../superpowers/plans/2026-10-20-buoc-0-3-fixes.md). Design:
[`../superpowers/specs/2026-10-20-buoc-0-3-fixes-design.md`](../superpowers/specs/2026-10-20-buoc-0-3-fixes-design.md). 27 task, 5 mốc, mỗi mốc
một PR vào `dev`. M1 trước; M2 và M3 song song được; M4 làm lúc nào cũng được; M5 cuối.

**M1 — Nền**
1. Đặt rõ số kết nối DB tối đa và thời gian chờ kết nối qua biến môi trường.
2. Viết lại "chống gửi trùng": giữ chỗ → chạy → ghi kết quả, mỗi request một kết nối mỗi lúc.
3. Ba chỗ đang mượn thêm kết nối trong lúc mở transaction (luyện tập "Cần ôn tập", mở phiên luyện, chụp danh sách publish) đổi sang đọc qua transaction hoặc đọc trước.
4. Ghi log mọi lỗi 500 (có `operation_id`, route mẫu, không có dữ liệu người dùng).
5. Lưu múi giờ theo tên chuẩn, từ chối dạng `+07:00`, giới hạn bộ nhớ đệm; thêm lệnh chuẩn hóa múi giờ đang có.
6. Tra từ chỉ xét từ catalog và từ riêng của chính người xem; thêm index; thêm phép đo tải chạy tay.

**M2 — Tài khoản**
7. Thêm cột họ, tên, ngày sinh, đồng ý điều khoản, khóa tài khoản vào `users`; thêm `TERMS_VERSION`.
8. Luật kiểm họ tên, ngày sinh và mốc 13 tuổi.
9. Đăng ký nhận họ tên, ngày sinh, ô đồng ý; sửa các script smoke và test thật của admin cho khớp.
10. Hồ sơ hiện và sửa được họ tên (không sửa ngày sinh).
11. Tạo tài khoản staff nhận họ tên không bắt buộc.
12. Danh sách người dùng (tìm một phần email/họ/tên, lọc trạng thái) và trang chi tiết cho admin.
13. Khóa / mở khóa tài khoản và chặn người bị khóa ở đăng nhập, làm mới phiên, đổi mật khẩu, OTP, đặt lại mật khẩu.

**M3 — Nội dung**
14. Lưu ai review, ai publish, ai gỡ/retire từng nghĩa; trả về ở API chi tiết nghĩa.
15. Không bao giờ publish bản đã bị bác; nháp mới dựng trên bản chưa bị bác; job publish bỏ qua nghĩa đang gỡ.
16. Revert lô giữ lại từ đang được dùng (dạng chia đã duyệt, `form_of`, level đã xác nhận); khóa dòng để không mất link.
17. Upload lại dòng đã nhập thì báo "không đổi", không đè bản sửa tay.
18. `rejected.csv` vòng 2 trở đi upload lại được.
19. Che từ trong câu ví dụ đúng các ca sở hữu cách, viết tắt, `a.m.`, số; chấm bỏ dấu chấm cuối.
20. Câu luyện chỉ có một đáp án đúng (lọc đáp án nhiễu theo mọi nghĩa của chữ).

**M4 — Admin web**
21. API lỗi tạm thời thì giữ phiên, hiện dải mất kết nối / màn chờ có nút thử lại.
22. Đăng xuất thất bại thì báo "Chưa đăng xuất được khỏi máy chủ — Thử lại".
23. Lỗi lạ hiện mã `operation_id` kèm nút chép.
24. Khóa nút và đếm ngược khi bị 429 ở 5 form còn thiếu.

**M5 — Kiểm và ghi chép**
25. Script `pnpm smoke:buoc-0-3-fixes` chạy qua API thật trên DB mới, mỗi lỗi một ca.
26. Xóa 3 file test cần DB không config nào chạy (ca của chúng đã chuyển sang unit test và smoke).
27. Ghi as-built, trỏ trong `CLAUDE.md`, cập nhật trạng thái trong review 20/10, thêm mục vào checklist Deploy.

# Sửa thiếu sót Bước 0–3 — as-built (21/10/2026)

Design: [`2026-10-20-buoc-0-3-fixes-design.md`](../superpowers/specs/2026-10-20-buoc-0-3-fixes-design.md); decisions D1–D17:
[`2026-10-20-buoc-0-3-fixes-decisions.md`](../superpowers/decisions/2026-10-20-buoc-0-3-fixes-decisions.md); plan:
[`2026-10-20-buoc-0-3-fixes.md`](../superpowers/plans/2026-10-20-buoc-0-3-fixes.md). Review gốc và trạng thái từng phát hiện:
[`2026-10-20-buoc-0-3-review.md`](../superpowers/reviews/2026-10-20-buoc-0-3-review.md) (mục 5). **Chỉ API + lớp phiên của admin** (D8): admin web chưa có
màn danh sách người dùng, khóa tài khoản, họ tên. Việc còn phải làm trước launch: [`deploy-checklist.md`](deploy-checklist.md) (file mới, bắt đầu từ đợt này).

**Trạng thái:** 27 task xong. M1–M4 đã merge vào `dev` (mỗi PR CI xanh 4/4 job trước khi merge); M5 (Task 25–27) là PR M5, chưa merge. Chưa lên `main`.
Làm theo `superpowers:subagent-driven-development`: mỗi task một subagent làm, một subagent review; mỗi mốc một lần review cả nhánh và một lần chạy thật
(gate) trước khi mở PR.

| Mốc | PR | Merge commit | Đã làm |
|---|---|---|---|
| M1 Nền | [#98](https://github.com/quangtienngo661/english-flashcard/pull/98) | `123d856` | Task 1–6: `DATABASE_POOL_MAX` / `DATABASE_POOL_TIMEOUT_MS` (mặc định 20 / 5000); chống gửi trùng kiểu "giữ chỗ → chạy handler → ghi kết quả", mỗi request một kết nối mỗi lúc, có hạn giữ chỗ (`timeoutSeconds` nay là hạn giữ chỗ, không còn cắt handler); đọc qua transaction đang mở trên mọi đường từ route HTTP trong practice / learning / content (gồm "Cần ôn tập", PX4); log mọi lỗi 500 (`request_failed`, `operation_id`, route mẫu, ≤ 10 dòng stack, không kèm thông báo lỗi); múi giờ lưu theo tên chuẩn, từ chối `+07:00`, bộ nhớ đệm có trần, lệnh `pnpm db:normalize-timezones`; tra / tìm từ chỉ đọc catalog và từ riêng của chính người xem, thêm 4 index (migration `20261021090000_lookup_indexes`), phép đo trong `pnpm test:scale` |
| M2 Tài khoản | [#99](https://github.com/quangtienngo661/english-flashcard/pull/99) | `8993d26` | Task 7–13: cột họ, tên, ngày sinh, đồng ý điều khoản, `CHECK (status IN ('active','locked'))`; biến bắt buộc `TERMS_VERSION`; đăng ký bắt buộc `given_name`, `birth_date`, `accept_terms: true`, dưới 13 tuổi → 400 `age-below-minimum`; hồ sơ xem / sửa họ tên (không sửa ngày sinh); tạo staff nhận họ tên tùy chọn; `GET /v1/admin/users` (tìm một phần email / họ / tên, lọc trạng thái, phân trang) và trang chi tiết; khóa / mở khóa (thu hồi mọi phiên, vô hiệu OTP còn sống; chặn đăng nhập bằng 403 `account-locked`, chặn refresh, đổi mật khẩu, OTP, đặt lại mật khẩu). Vòng sửa sau review cả nhánh: từ chối ký tự NUL và chuẩn hóa NFC khi tìm, trả đúng trạng thái đã lưu, log lý do khi người bị khóa đăng nhập, không cho nâng vai trò người đang bị khóa |
| M3 Nội dung | [#100](https://github.com/quangtienngo661/english-flashcard/pull/100) | `e465c8a` | Task 14–20: lưu ai review / publish / gỡ / retire từng nghĩa (trả trong API chi tiết nghĩa); không publish bản bị bác, nháp mới dựng trên bản chưa bị bác, job publish bỏ qua nghĩa đang gỡ; revert lô giữ entry / level đang được dùng, khóa dòng chống đua với tạo từ riêng; upload lại dòng đã nhập → `unchanged` (row key loại `content`); `rejected.csv` vòng 2 trở đi upload lại được; che từ đúng ở sở hữu cách, viết tắt, `a.m.`, số; câu luyện chỉ một đáp án đúng. Vòng sửa sau review cả nhánh: revert gỡ sạch entry do chính lô đó tạo; publish lại giữ người publish gốc đi cặp với thời điểm gốc |
| M4 Admin web | [#101](https://github.com/quangtienngo661/english-flashcard/pull/101) | `985531b` | Task 21–24: API lỗi tạm thời (5xx, lỗi mạng) giữ phiên, hiện dải mất kết nối hoặc màn "Không kết nối được máy chủ" có nút Thử lại; đăng xuất thất bại báo "Chưa đăng xuất được khỏi máy chủ — Thử lại" ở mọi tab; lỗi lạ hiện "Mã: `operation_id`" có nút chép; 429 khóa nút và đếm ngược ở 5 form. Vòng sửa sau review cả nhánh: logout bị 429 tính là thất bại, báo thất bại cho tab khác, bỏ qua lần thử lại cũ khi tab đã đăng nhập lại |
| M5 Kiểm và ghi chép | PR M5 | — | Task 25: `pnpm smoke:buoc-0-3-fixes` (+ chặn chạy trên DB không có chữ `smoke`); Task 26: unit test mới cho interceptor chống gửi trùng, xóa 3 file test cần DB không config nào chạy (bảng ánh xạ từng ca nằm trong commit `9eed3f4`); Task 27: as-built này, checklist Deploy, trỏ trong `CLAUDE.md`, trạng thái trong review 20/10 |

**Số test:** unit API **2096** (152 file; trước đợt sửa 1896 / 131 file); unit admin **329** (39 file; trước 290 / 38 file). Không có e2e backend (D38 Bước 4);
`admin-e2e-real` trong CI dùng body đăng ký mới (Task 9).

**`pnpm test:scale` (T5, Task 6, đo trên code M1):** 9.800 từ catalog + 300.000 từ riêng của người khác, trung vị 5 lần gọi, "trước → sau khi nạp 300.000 từ".
Code cũ: `lookup` 31 → 797 ms, `words?q` 53 → 1.334 ms (test đỏ). Code mới (3 lần chạy liền): `lookup` 23/23/16 → 18/16/18 ms, `words?q` 33/28/27 →
20/18/20 ms. Chưa chạy lại sau M3 (đã vào checklist Deploy).

## Gate từng mốc (API + worker thật trên DB mới, không đọc / ghi `.env`)

- **M1:** API pool 1: mọi route HTTP của `smoke:buoc-4`, `smoke:buoc-5` (cả hai chế độ fetchState), `smoke:buoc-6` đều qua. **Worker pool 1: job import CSV
  không xử lý được dòng nào** (mỗi lần thử dừng đúng ở 5 s chờ kết nối); worker pool 20 thì qua. Không coi là lỗi của M1 (ruling bên dưới), ghi vào checklist
  Deploy. Pool 7 dưới 1.000 GET đồng thời: tối đa 7 kết nối. So code cũ / mới trên cùng DB, 60 lần gọi các route tra từ: giống hệt (chỉ khác `operation_id`).
- **M2:** 8/8 qua: thiếu `TERMS_VERSION` thì không khởi động và báo đúng tên biến; `CHECK` chặn trạng thái lạ, schema không lệch; đăng ký, hồ sơ, danh sách
  (tìm có `%`, lọc, đi hết các trang không trùng), khóa / mở khóa trên Postgres thật; log không chứa tên, ngày sinh, email; `smoke:buoc-4/5/6` với body mới
  exit 0. Giới hạn: chưa kiểm việc nâng cấp các dòng `users` có sẵn qua migration mới.
- **M3:** 10/10 qua: ai review / publish / gỡ; bản bị bác; upload lại (FE17); revert lô có dạng chia và `went → go`; đua khóa dòng (FE22; độ trễ do `psql` giữ
  khóa tạo ra); `rejected.csv` vòng 2, 3; che từ và đáp án nhiễu trong phiên luyện thật; `EXPLAIN` dùng index; quyền riêng tư; `smoke:buoc-4`; log sạch.
  Hai điều bất ngờ, đều đã có ruling: upload lại sau hai lần revert theo một thứ tự nhất định tạo một bản nháp; tra từ đọc hết index lemma của catalog.
- **M4:** 7/7 qua bằng Chromium thật với API thật: màn chờ khi API tắt lúc mở trang, dải mất kết nối giữa phiên, đăng xuất thất bại ở hai tab (F5 khi API đã
  lên lại vẫn không tự đăng nhập), mã lỗi có nút chép (**lỗi 500 giả bằng `page.route`**, API không tự sinh), đếm ngược 429 thật ở form đăng nhập và form
  nguồn. Đổi mật khẩu bắt buộc, tạo tài khoản, đổi vai trò chỉ có unit test cho 429.

## Smoke

`pnpm smoke:buoc-0-3-fixes` (từ `apps/api`, sau `pnpm build` và `pnpm run:dev`; API cần `TERMS_VERSION`; script từ chối DB không có chữ `smoke` trong tên).
Mỗi bước có tên theo mã: setup, M2 (FE1, FE5, họ tên trong `/v1/me`, sửa ngày sinh → 400), C2 (FE32), C1 (FE26, FE27, FE29, B0E1, dùng lại key, rate limit),
N4/N5 (+ FE11, tìm, mở khóa), T1 (+ FE19), T2, T3 (FE17), T4, T5. C3 (log 500) và FE28 (handler chạy quá hạn giữ chỗ) chỉ có unit test, theo plan.

- Hai lần, mỗi lần trên DB mới `english_learning_smoke_fixes` (API + worker build từ `2db0a5a`): **cả hai exit 0**, mọi bước PASS, C3 SKIP. Output đầy đủ:
  [`buoc-0-3-fixes-smoke-output.txt`](buoc-0-3-fixes-smoke-output.txt).
- **Chạy trên code cũ** (commit `0db64ae`, trước đợt sửa; worktree tạm ngoài repo, đã xóa; `SMOKE_CONTINUE=1`): exit 1, **8 bước bắt được lỗi cũ**: M2 (body
  đăng ký cũ không nhận trường mới), C2 (lưu nguyên `+07:00`), C1 FE27 (10 × 500 sau ~30 s; code cũ không log lỗi 500 nên nguyên nhân là `ASSUMPTION`: hết
  pool), N4/N5 (chưa có route khóa), T1 (publish được bản bị bác), T2 (revert xóa `go` dù `went` trỏ tới), T3 (upload lại tạo revision mới), T4 (`rejected.csv`
  vòng 2 bị từ chối vì header `_row` lặp). **6 bước cũng qua trên code cũ** (FE26, FE29, B0E1, dùng lại key, rate limit, T5): chúng giữ hành vi đúng nhưng không
  chứng minh bắt được lỗi cũ. Output lần chạy này không lưu trong repo.

## Lệch so với plan

- **Task 25 chạy trên code cũ khác plan:** plan bảo chạy trên `dev` trước khi M1–M3 merge; lúc làm, `dev` đã có M1–M3 nên chạy trên `0db64ae` (ruling).
- **Tài khoản trong smoke tạo bằng `psql`** (trừ Lan, đăng ký qua API), vì đăng ký giới hạn 5 lần / IP / giờ. Hash mật khẩu do script tạo bằng đúng tham số
  argon2id của API, rồi đăng nhập qua `POST /v1/auth/login` thật.
- **Task 26 thêm một spec** (`idempotency.interceptor.spec.ts`, 4 test: thiếu key → 400, `timeoutSeconds` → hạn giữ chỗ, công thức băm payload JSON và
  multipart) cho các ca của file bị xóa chưa có chỗ thay. Ca "nhiều request cùng lúc ngay ranh giới cửa sổ rate limit" bỏ (cần Postgres thật), ghi vào checklist.
- **Luật hai commit cho sửa lỗi (test đỏ trước, sửa sau) chỉ áp dụng từ Task 19** (R5). Task 1–18 mỗi task một commit như plan viết; không viết lại lịch sử.
- **Task 3 rộng hơn brief:** mọi `$transaction` đi từ route HTTP trong practice / learning / content, kể cả qua hàm phụ, không chỉ 3 chỗ brief liệt kê.
- **Task 6 viết lại câu SQL** (CTE `MATERIALIZED` + `LATERAL`) ngoài brief: chỉ thêm điều kiện thì `words?q` vẫn 57 → 1.350 ms.
- **Task 15:** revision `published` mới nhất vẫn publish lại được khi nó là bản đang live (publish lại sau khi gỡ); design ghi "chỉ draft / reviewed" (đã ghi
  trong plan).
- Thứ tự Task 12 (danh sách) trước Task 13 (khóa) đã đổi ngay trong plan, không phải lệch lúc làm.
- Nhánh mốc sau cắt từ đầu nhánh mốc trước khi PR trước còn chạy CI, rồi merge `dev` vào trước khi mở PR (R1 sửa đổi, R1a, R1b).

## Ruling trong lúc làm

- **R1:** các mốc làm lần lượt M1 → M5, không chạy song song; nhánh sau được cắt từ đầu nhánh trước khi PR trước đang chạy CI.
- **R2:** `runIdempotent` nhận thêm `now?: () => Date` để test FE28 bằng đồng hồ giả.
- **R3:** PR của từng mốc tự push, mở và merge khi CI xanh (luật đứng của chủ dự án).
- **R4:** mỗi nhánh mốc một lần review cả nhánh bằng model mạnh nhất trước khi mở PR.
- **R5:** từ Task 19, mỗi task sửa lỗi là hai commit; Task 1–18 không viết lại.
- Task 2: payload khác trên một key còn `in_progress` → 409 (đang chạy / bỏ dở), không phải 400 (khớp SR8).
- Task 3: phạm vi "đọc qua transaction" mở rộng như trên; `start()` của phiên luyện không còn giữ khóa trong lúc đọc nguồn; hạn transaction 30 s → 15 s.
- Task 4: stack trong log chỉ giữ các dòng bắt đầu bằng `at ` (≤ 10), vì thông báo lỗi Prisma kéo dài nhiều dòng.
- Task 5: vòng chuẩn hóa múi giờ nằm trong `IdentityService.normalizeStoredTimeZones` (CLI chỉ gọi), giữ ranh giới module D3.
- Task 6: chấp nhận câu SQL viết lại (mục tiêu §6.4 là bắt buộc).
- M1 gate: job import cần 2 kết nối không phải lỗi của M1 (`ASSUMPTION`: code cũ cũng vậy, chưa chạy lại); đưa "pool worker ≥ 2 × số job đồng thời" vào
  checklist.
- Task 14: các trường người thao tác nằm phẳng trên view nghĩa (view chỉ có revision mới nhất).
- Task 15: bản nền của nháp sau khi bị bác là revision mới nhất chưa bị bác, kể cả khi đó là nháp chưa review đã bị thay.
- Task 17: dòng có ô `form_of` không bao giờ coi là "đã nhập"; row key `content` chỉ ghi khi bước nội dung thật sự ghi nội dung, hoặc khi `unchanged` mà chưa lô
  nào còn hiệu lực giữ key đó (để dòng cũ có key ở lần upload lại đầu); chấp nhận khe hẹp: lô B không ghi key khi lô A đang giữ key giống hệt, revert A thì nội
  dung của B mất key (hậu quả: một bản nháp, như trước khi sửa).
- M3 review cả nhánh: dạng chia đã duyệt chỉ tính "đang được dùng" khi `inflectionsReviewedAt` muộn hơn lúc job của lô xong; bỏ qua `form_of` từ revision
  **chưa publish** của chính lô đó (revision đã publish được giữ nên link của nó giữ entry đích).
- M3 gate: upload lại sau khi revert lô giữ key (trong khi một lô `unchanged` còn lại) tạo một bản **nháp** mang chữ của file cũ: chấp nhận, để sau.
- M3 gate: tra từ đọc hết index lemma của catalog (1,3 ms ở 5.000 từ): chấp nhận; `pnpm test:scale` trước launch vào checklist.
- M4 review cả nhánh: logout bị 429 là thất bại (server chưa làm gì); logout thất bại phát `{type: 'logout', failed: true}` để mọi tab giữ cờ và thông báo.
- Task 25: chạy smoke trên commit cũ `0db64ae` thay vì `dev` trước merge.
- Task 26: thêm unit test cho các ca chưa có chỗ; bỏ ca ranh giới cửa sổ (ghi vào checklist).
- Task 27: chưa có checklist Deploy ở đâu cả, tạo `docs/deliveries/deploy-checklist.md`.

## Thiếu sót đã biết, để sau

Các lỗi mức Thấp của kiểm kê 20/10 (D11), N6, N7, N8 (D10) và N9 (Bước 8) không thuộc đợt này. Các điểm nhỏ dưới đây do review từng task / từng mốc ghi lại,
chưa sửa:

- **Nền (M1):** không test nào ghim `prisma.module.ts` truyền `poolMax` / `poolTimeoutMs` đúng chỗ; lỗi khi nhả key bị nuốt, không để lại dòng log; replay trả
  body nhưng không áp `responseStatus` đã lưu (có từ trước); hai test cùng nhãn FE30; các façade (`LearningService.practice*`, `ContentService.practice*`,
  `AnswersService.skip`) chưa có test ghim việc truyền `db`; phiên luyện đọc items / check tuần tự trên đường không có tx (thêm một lượt gọi DB); các
  `$transaction` trong identity / entitlements / ai / content-pipeline / common chưa rà việc đọc bằng client chung; `instance` của lỗi 500 còn kèm query string
  (có từ trước); chưa có test ghim `configureApp` truyền logger cho filter; luật "dòng bắt đầu `at `" có thể lọt một dòng thông báo; múi giờ `Etc/GMT±13` không
  hợp lệ rơi về UTC ngầm; luật hiển thị từ có hai nguồn văn bản (`words.service` và `visible-senses.ts`); ngoài test riêng tư, chưa có lưới so kết quả cho câu SQL
  tra / tìm viết lại (gate M1 đã so 60 lần gọi); index tạo không `CONCURRENTLY`.
- **Tài khoản (M2):** đổi vai trò không lấy khóa dòng người dùng (nâng vai trò đua với khóa có thể để lại admin bị khóa; mở khóa là sửa được); token trang của
  danh sách cũ trả 400 sau khi cập nhật; test FE5 phụ thuộc thứ tự chạy; `\p{Cf}` trong tên (để lúc làm lại admin UI); comment cũ trong một migration đã chạy
  (sửa sẽ đổi checksum).
- **Nội dung (M3):** khe hẹp của row key khi revert theo thứ tự nhất định (ruling ở trên); câu kết thúc bằng `etc.` / `St.` không còn được coi là hết câu (an
  toàn: trả null); test so mẫu chữ SQL dễ gãy; câu MCQ lọc đáp án nhiễu hơi rộng; `toLowerCase` của JS và `lower` của SQL khác nhau với chữ không phải ASCII;
  báo "entry đang được dùng" cả khi entry đằng nào cũng được giữ; ca có dấu phẩy ("ice, cream") chỉ có unit test.
- **Admin web (M4):** người chưa từng đăng nhập thấy "Phiên đăng nhập đã hết hạn" sau màn chờ → Thử lại; tab 2 còn giữ dải "Chưa đăng xuất được" sau khi tab 1
  thử lại thành công (vẫn đăng xuất, chỉ là thông báo cũ); một lần thử lại logout chậm vẫn có thể thu hồi phiên mà tab khác vừa tạo (khe thời gian hẹp); nút chép
  mã chưa có phản hồi "đã chép"; clipboard chỉ kiểm trong jsdom và ở gate (Chromium); hằng số giây mặc định lặp ở 6 form.
- **Smoke (M5):** bước FE29 nhận mọi advisory lock chứ không riêng khóa Learning; bước rate limit có thể vắt qua hai phút; 6 bước không phân biệt code cũ / mới.

## Việc người dùng cần làm (máy local)

- **Thêm `TERMS_VERSION=2026-10-20` vào mọi `apps/api/.env` đang dùng** (giá trị có sẵn trong `.env.example`). Thiếu biến này thì API và worker không khởi
  động, báo `Missing or invalid configuration variables: TERMS_VERSION`.
- **DB local đã có dữ liệu cũ:** từ `apps/api` chạy `pnpm db:setup` (áp migration mới), `pnpm build`, rồi **`pnpm db:normalize-timezones` một lần** để đổi các
  múi giờ đã lưu sang tên chuẩn.
- Script hay công cụ riêng nào gọi `POST /v1/auth/register` phải gửi thêm `given_name`, `birth_date` (`YYYY-MM-DD`, từ 13 tuổi) và `accept_terms: true`
  (`family_name` tùy chọn). Đây là thay đổi phá vỡ của v1, chấp nhận vì chưa có app người học (design §11.5).
- `DATABASE_POOL_MAX` / `DATABASE_POOL_TIMEOUT_MS` không bắt buộc ở local (mặc định 20 / 5000; dòng mẫu trong `.env.example` để ở dạng comment).
- Chạy lại smoke: tạo DB mới có chữ `smoke` trong tên (vd. `english_learning_smoke_fixes`), chạy API + worker trỏ vào DB đó, rồi `pnpm smoke:buoc-0-3-fixes`.
- Trước launch: làm hết [`deploy-checklist.md`](deploy-checklist.md).
