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
