# Nhóm B — open items (việc cần chủ dự án xem, ghi lại trong lúc thực thi plan)

File này do session thực thi plan (`docs/superpowers/plans/2026-10-29-nhom-b.md`) ghi, **không dừng lại hỏi**. Mỗi mục: milestone / task, chuyện gì, các hướng
có thể chọn, hướng đã tạm làm, vì sao, và chủ dự án cần làm gì. Xếp theo mức cần trả lời gấp nằm ở báo cáo cuối của `docs/deliveries/nhom-b.md`.

---

## OI-1 · M1-T18 / M1-T19 · Smoke từ chối `apps/api/.env` vì file đó có key nhà cung cấp

- **Chuyện gì:** các smoke (`smoke:buoc-6`, `smoke:buoc-7`, `smoke:nhom-b`) đọc `apps/api/.env` và dừng nếu thấy `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`
  ("the smoke runs with the fake provider only"). Trên máy này `apps/api/.env` có một trong hai key đó, nên smoke dừng ngay trước bước 1.
- **Hướng có thể chọn:** (a) xóa key khỏi `.env` mỗi lần chạy smoke; (b) chạy smoke từ một worktree không có `.env`; (c) thêm lối thoát tường minh vào script.
- **Đã tạm làm:** (c) — biến `SMOKE_IGNORE_ENV_FILE=1` làm script bỏ qua việc đọc `.env` (một dòng mỗi script: `smoke-nhom-b.mjs` mới, và `smoke-buoc-6.mjs`,
  `smoke-buoc-7.mjs` cũ). Mặc định không đổi gì. API và worker của smoke khởi động từ biến môi trường export (cấu hình không bí mật lấy từ `.env.example`,
  secret sinh ngẫu nhiên trong shell, `OPENAI_API_KEY` và `ANTHROPIC_API_KEY` để trống), nên **không có lời gọi nhà cung cấp thật nào**; các CLI con của smoke
  cũng nhận key rỗng qua `CHILD_ENV`.
- **Vì sao:** không sửa `.env` của bạn, không dựng worktree mới (cần `pnpm install` + build), thay đổi nhỏ nhất và có thể xem lại.
- **Bạn cần làm:** đọc nhanh ba dòng thêm vào ba script; nếu muốn cách khác (ví dụ xóa key khỏi `.env`), nói lại. Nên kiểm xem key trong `apps/api/.env` có phải key thật
  không (tôi không đọc file này, hook chặn).

## OI-2 · M1-T19 · `smoke:buoc-6` (B6#30) dừng rồi bật lại container Redis dùng chung

- **Chuyện gì:** bước B6#30 của `smoke:buoc-6` chạy `docker compose stop redis` rồi `start`. Redis đó cũng phục vụ stack dev đang chạy của bạn
  (container `english-learning-api-1`, `web-1`, `admin-1` đều đang `Up`).
- **Đã làm:** chạy đúng như plan yêu cầu (smoke cũ phải qua); Redis mất khoảng vài giây rồi `healthy` trở lại. Các smoke chạy API ở cổng **3100** (cổng 3000 là API
  của stack dev của bạn), database `english_learning_smoke_b6` / `_b7` / `_nb` riêng, prefix hàng đợi riêng, nên không đụng dữ liệu `english_learning`.
- **Bạn cần làm:** nếu app dev của bạn có vẻ treo sau lúc đó, `docker compose restart api` là đủ. Không cần quyết định gì.

## OI-3 · M2-T10 · `pnpm learner:setup` trên DB đang có model THẬT: chạy baseline bằng model thật

- **Chuyện gì:** `learner:setup` nay đi qua đường publish thật (nháp → chạy bộ ví dụ → publish). Khi một thao tác đang chạy model thật, cổng publish đòi baseline: script chạy cấu hình đang chạy trên bộ ví dụ đã chốt (lời gọi thật, tốn tiền) rồi mới chuyển sang `fake:ok`. Script cũ ghi đè lặng lẽ.
- **Hướng có thể chọn:** (a) giữ nguyên (theo plan); (b) thêm cờ xác nhận hoặc từ chối khi thao tác đang có model không phải `fake`; (c) bỏ baseline cho script này.
- **Đã tạm làm:** (a). Đã thử tay trên stack thật: baseline chạy, publish có cảnh báo, rollback được. Hai smoke chỉ đi nhánh không cần baseline.
- **Bạn cần làm:** chỉ quan trọng nếu bạn chạy `learner:setup` trên DB local đang gắn model thật. Nếu muốn có chốt chặn thì nói, là một thay đổi nhỏ ở `apps/api/scripts/ai-config-publish.mjs`.

## OI-4 · M3-T3 · Prompt khởi điểm của judge "Chỉ một đáp án" — chủ dự án cần đọc

- **Chuyện gì:** migration `nhom_b_m3_judge` seed một judge `Chỉ một đáp án` (revision 1, chưa có model) với hướng dẫn khởi điểm bằng tiếng Anh (cách chia `pass` / `fail_major` / `fail_minor`, quy tắc tiêu chí `single_answer`). Nội dung nằm ở `apps/api/src/ai/judge/initial-judges.ts` (cùng chữ trong migration).
- **Hướng có thể chọn:** giữ; sửa chữ rồi lưu thành revision mới trên trang Judge (không cần migration); hoặc yêu cầu đổi chữ seed.
- **Đã tạm làm:** dùng đúng chữ trong plan (D12, D33). Kiểm tra bằng test rằng migration và file TS giống nhau.
- **Bạn cần làm:** **đọc prompt này trước lần chạy thật (C-T3)**; judge chấm sai nghĩa là nhãn bạn gắn sẽ lệch khỏi "đã hiệu chỉnh". Chọn một model Anthropic cho judge trước khi dùng.

## OI-5 · M1–M6 admin · Bản dịch tiếng Anh các chuỗi mới do agent tự dịch

- **Chuyện gì:** mọi chuỗi mới của admin có cả `vi.json` và `en.json` (có test kiểm cùng bộ khóa), nhưng bản en do agent tự dịch, bản vi là theo plan hoặc agent tự viết ở chỗ plan không có.
- **Bạn cần làm:** đọc lại bản vi các chuỗi bổ sung (ví dụ `toast.addedHeldOut`, `freeze.rowMissing`, `compare.*`, `ai.judges.*`, `dashboard.judge.*`, `dashboard.retention.*`); bản en chỉ cần xem nếu bạn dùng giao diện en.

## OI-6 · M3-T5 / T6 · Trần chi USD của admin là trần mềm

- **Chuyện gì:** trần `ai.admin_daily_usd_cap` được kiểm trước mỗi lần gọi; các lời gọi đang bay vẫn có thể vượt trần một chút (trong lần thử: trần cao hơn chi tiêu 0,20 USD, mỗi lời gọi 0,15 USD, ba mục được giữ trước khi dừng).
- **Đã tạm làm:** theo plan (§5.5, R10). `null` là không trần, `0` là chặn hết.
- **Bạn cần làm:** không cần quyết định; nên biết khi đặt trần sát.

## OI-7 · M5-T5 · Nhóm điểm judge của eval có tính cấu hình NHÁP ở phiên bản hiện tại

- **Chuyện gì:** plan nói "cấu hình ở phiên bản hiện tại", không lọc trạng thái, nên điểm của một nháp (chưa publish) cũng hiện trong `judge_scores`.
- **Hướng có thể chọn:** (a) giữ (so được nháp với bản đang chạy); (b) chỉ tính `published` / `retired` (thêm `AND c.status <> 'draft'`).
- **Đã tạm làm:** (a). Không rò dữ liệu; chỉ là câu hỏi sản phẩm.
- **Bạn cần làm:** chọn (a) hay (b) nếu thấy biểu đồ judge lẫn nháp gây rối.

## OI-8 · M4 / M5 · Điểm judge, nhãn và ảnh chụp của câu đã bị xóa vẫn còn

- **Chuyện gì:** ảnh chụp pass, điểm và nhãn chỉ có từ và câu của kho (không có id hay email người học), nên không nằm trong `account-data-map`. Khi một tài khoản bị xóa, điểm của câu đó vẫn ở `ai_judge_scores`; dashboard bỏ qua chúng (không có khóa ngoại).
- **Hướng có thể chọn:** giữ (không có dữ liệu cá nhân); hoặc thêm bước dọn vào luồng xóa tài khoản.
- **Đã tạm làm:** giữ. Chưa đối chiếu lại danh sách Bước 7 §19.
- **Bạn cần làm:** xác nhận rằng điều này phù hợp chính sách xóa tài khoản.

## OI-9 · M4-T8 · Giao diện không chặn thêm cùng một nguồn vào bộ ví dụ hai lần

- **Chuyện gì:** nút "Đưa vào bộ ví dụ" có thể bấm lại trên cùng một báo cáo/câu; chưa kiểm API có khử trùng theo `source_ref` không (cùng `Idempotency-Key` thì trả cùng kết quả, đã kiểm).
- **Bạn cần làm:** nếu hay gặp, nói để thêm kiểm trùng; ví dụ trùng xóa tay được ở trang Bộ ví dụ.

## OI-10 · M4 · Chưa có spec real-stack được commit cho luồng "Câu AI thật"

- **Chuyện gì:** plan không yêu cầu; luồng đã được kiểm bằng smoke (67 bước ở M4) và một spec real-stack dùng một lần rồi xóa (cho thấy trang, lượt chấm, thêm vào bộ ví dụ, phím gắn nhãn chạy đúng). Spec commit được cần tự dựng câu hỏi AI vì `m3.real.spec.ts` chỉ có sẵn câu nhờ hiệu ứng phụ.
- **Bạn cần làm:** nếu muốn khóa luồng này trong CI thì đây là một việc riêng.

## OI-11 · Máy này · Hai tiến trình `python` chạy từ 28 và 29/10 chiếm mỗi cái một core

- **Chuyện gì:** PID 38044 và 26696 (khi ghi nhận), mỗi cái dùng một lõi CPU, không phải của session này (tôi không chạm vào). Có thể là script đọc stdin bị treo từ session cũ.
- **Bạn cần làm:** kiểm tra trong Task Manager và tắt nếu thừa.

## OI-12 · M5-T9 · Nhãn "… / trần" của thẻ chi USD admin hiện cả khi không có trần

- **Chuyện gì:** copy cố định theo plan; khi `admin_usd_cap` là `null`, thẻ chỉ hiện số đã tiêu nhưng nhãn vẫn có "/ trần".
- **Bạn cần làm:** nếu thấy lạ, đổi một dòng copy.

## OI-13 · M4-T11 · Commit `92f5825` (sửa bước M1.3 của smoke bị đua) là commit riêng

- **Chuyện gì:** bước B37 của M1 trong smoke gửi request sau `sleep(500)` trong khi một `psql` nền giữ khóa; khi máy bận, request thua cuộc đua và smoke chết. Nay request chỉ gửi sau khi `pg_stat_activity` cho thấy khóa đang được giữ.
- **Bạn cần làm:** không cần; commit tách riêng nên có thể bỏ nếu không muốn.

## OI-14 · M1 · e2e thật trên CI từng đỏ vì một lần đăng nhập không xử lý 429

- **Chuyện gì:** CI của PR M1 đỏ ở `m2.real.spec` (trang kẹt ở `/login`): spec đó đăng nhập thẳng, không có xử lý `Retry-After` như helper `signIn`, mà cả bộ đăng nhập nhiều hơn giới hạn `auth.login.ip` (20 mỗi phút). Chưa chứng minh trực tiếp là 429 (API không log 429); sau khi sửa, spec đó chạy chậm hơn (~16 s, đúng một lần chờ 429) và CI xanh.
- **Đã làm:** commit `adb669b` ở M1 (dùng `signIn`), đã gộp lên M2 và M3 bằng merge thường (không force-push).
- **Bạn cần làm:** không cần; nếu CI e2e thật còn đỏ ngẫu nhiên, nhớ rằng các spec khác `admin.real` / `m0.real` vẫn đăng nhập thẳng.
