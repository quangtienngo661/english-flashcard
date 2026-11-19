# Landing theo admin — plan tóm tắt (19/11/2026)

Plan chi tiết: `docs/superpowers/plans/2026-11-19-landing-live-plans.md`.

1. API: `GET /v1/public/prices` trả thêm số phiên luyện mỗi ngày của Free và Pro.
2. Web: dữ liệu landing lúc build và bản dự phòng có thêm số phiên.
3. Web: dòng "N phiên luyện mỗi ngày" trong bảng giá lấy số từ dữ liệu thay vì chữ cố định.
4. Web: sau khi trang tải, trình duyệt đọc lại giá, số phiên và FAQ từ API rồi thay vào; lỗi thì giữ số lúc build.
5. Kiểm: landing vẫn dựng sẵn; đổi trong admin rồi tải lại landing thấy số mới mà không deploy; as-built và PR vào `dev`.
