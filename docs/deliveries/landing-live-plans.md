# Landing theo admin — plan tóm tắt (19/11/2026)

Plan chi tiết: `docs/superpowers/plans/2026-11-19-landing-live-plans.md`.

1. API: `GET /v1/public/prices` trả thêm số phiên luyện mỗi ngày của Free và Pro.
2. Web: dữ liệu landing lúc build và bản dự phòng có thêm số phiên.
3. Web: dòng "N phiên luyện mỗi ngày" trong bảng giá lấy số từ dữ liệu thay vì chữ cố định.
4. Web: sau khi trang tải, trình duyệt đọc lại giá, số phiên và FAQ từ API rồi thay vào; lỗi thì giữ số lúc build.
5. Kiểm: landing vẫn dựng sẵn; đổi trong admin rồi tải lại landing thấy số mới mà không deploy; as-built và PR vào `dev`.

# Landing theo admin — as-built (19/11/2026)

Nhánh `feat/landing-live-plans`. Làm đủ 5 task của plan, mỗi thay đổi hành vi có test đỏ commit trước.

- API: `GET /v1/public/prices` trả thêm `practice_sessions_per_day: { free, pro }` (chỉ thêm trường).
- Web: landing vẫn dựng sẵn với số đọc lúc build. Sau khi tải, `LandingLive` (`use-live-landing-data.ts`) đọc lại
  `/v1/public/prices` và (chỉ bản `vi`) `/v1/public/faq`; phần nào lỗi hay sai hình dạng thì giữ số lúc build.
- Dòng "{count} phiên luyện mỗi ngày" của Free và Pro lấy số từ dữ liệu, viết theo locale (1.200 / 1,200).
- `getLandingCopy` chuyển sang `get-landing-copy.ts` (chỉ chạy ở server), để bảng giá render được trong trình duyệt.
- Gộp theo yêu cầu của chủ dự án: bỏ chữ "lịch học" phía trên tiêu đề tháng trong hộp Lịch (`MonthDialog`).

Đã kiểm (bootstrap từ nhánh này, Docker):

- `assert:render-mode` qua: `/vi`, `/en` vẫn prerender.
- Sửa giá Pro 1 tháng thành 89.000 và số phiên Pro thành 45 qua admin API, rồi tải lại `/vi`:
  - HTML dựng sẵn vẫn là 79.000 và 30;
  - trình duyệt hiện 89.000, 45 và mức tiết kiệm tính lại (−25%);
  - không có lỗi console.
  - Sau đó đã trả cài đặt local về 79.000 và 30.

Chưa kiểm:

- Production: cần `CORS_ORIGINS` của API trên VPS có `https://wordmet.com`. File mẫu có; file thật chưa xem.
- Thoáng thấy số cũ trước khi số mới hiện (khi admin vừa đổi) chưa đo trên mạng chậm.
- JSON-LD vẫn mang giá lúc build (Q4), nên chỉ đổi sau lần deploy kế tiếp.
