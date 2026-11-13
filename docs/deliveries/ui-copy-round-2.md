# Sửa chữ giao diện vòng 2 — plan tóm tắt (14/11/2026)

Plan: `docs/superpowers/plans/2026-11-14-ui-copy-round-2.md`. Audit: `docs/audit/2026-11-14-ui-copy/`.

1. Viết script so key, placeholder và tag của hai file message với bản `dev`.
2. Sửa chữ VI/EN theo audit vòng 1 và các quyết định Q1–Q13.
3. Sửa các test web đang ghi cứng chữ cũ, chạy lại toàn bộ test web.
4. Viết lại FAQ landing thành 6 câu ở bản dự phòng, kèm nội dung để nhập ở admin.
5. Bỏ 10 dòng chữ thừa trên giao diện và phần thừa ở 7 dòng khác.
6. Typecheck, lint, build và xem chữ trên app thật.
7. Viết report vòng 2.

# Sửa chữ giao diện vòng 2 — as-built (14/11/2026)

Nhánh `fix/ui-copy-round-2` từ `origin/dev` `2d858021`. Report đầy đủ: `docs/audit/2026-11-14-ui-copy/vong-2.md`. Bảng key | cũ | mới:
`docs/audit/2026-11-14-ui-copy/vong-2-thay-doi.md`.

- `vi.json` đổi 112 chuỗi, `en.json` đổi 190 chuỗi (không kể landing, vốn là bản sao chữ Việt). Xóa 9 key của dòng thừa ở cả hai file.
- Bỏ 9 dòng chữ thừa trong component web. Giữ `noteHint`, vì dòng đó còn báo trước lúc mở gợi ý.
- FAQ landing 6 câu mới qua migration `20261114180000_landing_faq_copy`. Migration chỉ thay FAQ nạp sẵn khi chưa ai sửa trong admin. Bản dự phòng có test bắt phải giống migration.
- Kiểm tra:
  - script so key, thứ tự, đối số ICU, tag: OK;
  - `check-message-keys`: 0 key thừa;
  - typecheck, lint: qua;
  - vitest web: 1.721 qua, 2 đỏ phụ thuộc giờ máy và cũng đỏ trên `dev`;
  - migration chạy thử trên Postgres tạm ở 3 trạng thái DB;
  - build container web và xem trên `localhost:3001`;
  - e2e (Playwright trong container Linux): lượt toàn bộ đầu bắt được 2 chỗ e2e còn pin chữ cũ, đã sửa. Lượt chạy lại 6 spec: 115 qua, 1 đỏ (`m1` E2, canh giờ hydrate, chưa đối chứng trên `dev`).
- Chưa: màn sau đăng nhập chưa xem bằng trình duyệt, `smoke:giao-dien-moi` chưa chạy, chưa push hay mở PR.
