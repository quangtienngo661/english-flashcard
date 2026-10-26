# Sửa ba smoke lệch với code (26/10/2026)

Nhánh `fix/stale-smokes`. Phát hiện khi làm PR 1 đợt cải thiện A (PR #137): ba smoke fail trên `dev` vì code đã đổi theo
quyết định đã chốt mà script chưa theo. Không có lỗi nào là code sai; chỉ sửa script.

| Smoke | Bước fail | Nguyên nhân | Sửa |
|---|---|---|---|
| `smoke:buoc-2` | 6 (export → điền → upload lại) | Export thêm `form_of`, `inflections` (`6652985`), script đọc `sense_id` ở vị trí cố định | Đọc `sense_id`, `revision` theo tên cột trong dòng header |
| `smoke:buoc-7` | AC8 | `939cf0e` (design giao diện người học §8.4) đưa "other" xuống cuối (`position` 1000) | Thứ tự mong đợi có "other" cuối |
| `smoke:buoc-7` | AC12 (không có trong danh sách ban đầu, thấy khi chạy) | Cùng nguyên nhân: lý do mới `position` 8 giờ đứng trước "other" | Kiểm lý do mới ở vị trí áp chót, "other" cuối |
| `smoke:buoc-7` | Review Focus 2 (takeover) | Kiểm `overlap < 9 500 ms` tính từ lúc lượt đầu bắt đầu, gồm cả các lần `docker compose exec psql` của chính script (~0,6 s mỗi lần lúc máy rảnh, lâu hơn nhiều khi máy quá tải). Lượt chạy thử lúc máy rảnh: 2 548 ms, qua | Kiểm trực tiếp: request đầu **chưa trả lời** khi lượt takeover trả lời |
| `smoke:buoc-0-3-fixes` | M2 | `5a2bf53` (design §8.1) cho người học sửa ngày sinh (13+) | Kiểm 12 tuổi → 400 `age-below-minimum`, ngày tương lai → 400 `validation-failed` (DB không đổi), `1999-01-01` → 200 và được lưu |
| `smoke:buoc-0-3-fixes` | C1 FE29 | psql nền giữ khoá đúng 3 s kể từ lúc nó khởi động; khi `docker compose exec` chậm, khoá hết hạn trước khi script thấy nó / gửi request đầu. Lượt chạy thử lúc máy rảnh: qua | Script tự nhả khoá: giữ cho tới khi lần gọi thứ hai có kết quả và request đầu đã chờ ≥ 2 s (transaction của groups có `timeout` 10 s); chờ thấy khoá tối đa 20 s, lỗi thì in output của psql |

## Kiểm

Cả ba smoke qua, mỗi smoke trên một DB mới, chạy trên một bản merge local `638a9e9` = `origin/dev` `5c50c2a` + PR #137 +
nhánh này (PR #137 đổi luồng đăng ký trong các script này; lúc chạy nó chưa merge). Output đầy đủ:
[`stale-smokes-smoke-output.txt`](stale-smokes-smoke-output.txt).

- `smoke:buoc-2`: ALL CHECKS PASSED.
- `smoke:buoc-7`: passed, 30 steps.
- `smoke:buoc-0-3-fixes`: ALL STEPS MATCHED.

Cách chạy: mỗi smoke có DB, cổng API (3190/3191/3192) và `JOB_QUEUE_PREFIX` riêng; không đọc `.env` (cấu hình lấy từ
`.env.example`, secret sinh bằng `scripts/gen-secret.mjs`); `SMTP_HOST=127.0.0.1`.

## Còn chưa kiểm

- Hai cách sửa về thời gian (takeover, FE29) mới chỉ chạy lúc máy rảnh; chưa chạy lại lúc máy quá tải như lần PR #137 thấy lỗi.
  Nếu máy chậm tới mức request đầu của takeover xong trước (provider giả `fake:slow` chờ tới khi hết thời gian), bước đó
  vẫn fail, vì khi đó kịch bản chồng nhau không xảy ra.
