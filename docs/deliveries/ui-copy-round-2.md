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
  - vitest web: 1.723/1.723 qua, sau khi cố định giờ trong 2 test nạp lượt AI (hai test này đỏ cả trên `dev` từ 14/11);
  - migration chạy thử trên Postgres tạm ở 3 trạng thái DB;
  - build container web và xem trên `localhost:3001`;
  - e2e (Playwright trong container Linux): lượt toàn bộ cuối cùng 485 qua, 0 đỏ, 0 flaky, sau khi sửa 2 chỗ e2e pin chữ cũ và test flaky `m1` E2 (test này flaky có từ trước, đỏ 2/6 trên `dev`; sau sửa qua 10/10);
  - `smoke:giao-dien-moi` trên API của nhánh với DB mới: ALL OK, 16 bước (`docs/deliveries/ui-copy-round-2-smoke-output.txt`); smoke đã được sửa để gửi `turnstile_token` khi xác minh email;
  - xem bằng trình duyệt các màn sau đăng nhập (VI và EN) trên stack Docker riêng dựng từ nhánh, kể cả FAQ mới trên landing.
- Chưa: một số màn cần dữ liệu đặc biệt (câu AI, gói Pro đang dùng, xóa tài khoản) chỉ kiểm qua test.
