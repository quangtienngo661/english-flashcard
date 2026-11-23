# Đo tải burst cục bộ (`load-burst.mjs`, 23/11/2026)

> **Lưu ý quan trọng:** Đây là phép đo trên **máy local** (không phải VPS production 4 vCPU / 8 GB RAM). Kết quả dùng để kiểm chứng công cụ đo tải và phát hiện lỗi kết nối/pool ở concurrency 30, **không** đại diện cho độ trễ hay năng lực phục vụ thực tế trên VPS.

## 1. Môi trường đo

- **Máy chạy:** Windows local, CPU `Intel(R) Core(TM) 5 210H` (12 logical CPUs), RAM `31,6 GB`, Node `v24.11.0`.
- **Stack:** 1 tiến trình API (`apps/api/dist/main.js`, `MAINTENANCE_ENABLED=false`) kết nối Postgres 17 và Redis 7.4 chạy trong Docker cô lập (dữ liệu trống, 1 tài khoản kiểm thử tổng hợp đã xác minh email và hoàn tất hồ sơ).
- **Lệnh chạy:**
  ```bash
  node scripts/load-burst.mjs \
    --base http://127.0.0.1:13099 \
    --token-file <temp-token-file> \
    --concurrency 30 \
    --rounds 3 \
    --paths /v1/me,/v1/groups,/v1/me/entitlements
  ```
  *(Lưu ý: `/v1/practice/today` không tồn tại trong API hiện tại nên thay bằng `/v1/me/entitlements`, endpoint người học được gọi cùng lúc khi mở app.)*

## 2. Kết quả đo được

```text
load-burst: base=http://127.0.0.1:13099 concurrency=30 rounds=3 paths=/v1/me,/v1/groups,/v1/me/entitlements
path	count	errors	p50_ms	p95_ms	max_ms
/v1/me	90	0	94	170.8	172.1
/v1/groups	90	0	121.1	154.2	155.3
/v1/me/entitlements	90	0	267.2	286.4	286.8
OVERALL	270	0	141.4	284.8	286.8
```

- **Tổng số request:** 270 (30 đồng thời × 3 vòng × 3 endpoint).
- **Số lỗi:** 0 (`0%`).
- **Độ trễ tổng thể:** p50 = `141,4 ms`, p95 = `284,8 ms`, max = `286,8 ms`.
