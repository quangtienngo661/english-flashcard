# Pagination chủ đề

Trang chi tiết dùng cursor, 20 sense mỗi trang. API trả riêng số sense toàn chủ đề, đã học và chưa học. “Chọn tất cả” chỉ đổi lựa chọn của trang hiện tại. Lựa chọn vẫn còn khi chuyển trang. “Thêm tất cả từ chưa học” gửi scope chủ đề và trình độ trong một request. Hôm nay lấy tối đa bốn chủ đề ngẫu nhiên mỗi lượt mở.

## Đo trên môi trường test

Chạy `pnpm --filter api test:scale test/content/topic-pagination.scale.e2e-spec.ts`. Fixture trên PostgreSQL/Redis có 2.694 sense B2, trong đó 2.000 đang học, và một chủ đề đối chứng 8 sense. Bảy test API qua, gồm kiểm tra cursor, summary, sức chứa nhóm, hai request tranh chỗ cuối, replay cùng key, rollback và bốn card.

| HTTP request trên fixture | Trung vị | Response body |
| --- | ---: | ---: |
| Trang đầu | 73,5 ms | 7.694 byte |
| Trang tiếp | 67,5 ms | 7.704 byte |
| Summary | 104,6 ms | 46 byte |
| Gợi ý chủ đề | 345,3 ms | 2.173 byte |

Các trung vị lấy từ năm request sau warm-up. Query mẫu của chủ đề lớn trả 4 dòng, trung vị 82,0 ms. Một lần thêm cả chủ đề ghi 2.000 sense trong 2.185,2 ms, response 128 byte. Đây là phép đo local trên fixture.

Browser probe dùng learner app cổng 3001 và test API cổng 33492. Trên PowerShell, chạy learner app với `$env:NEXT_PUBLIC_API_BASE_URL='http://localhost:33492'` và `pnpm --filter web dev:app`. Sau khi app sẵn sàng, đặt `$env:WORDMET_TOPIC_PROBE=(Resolve-Path 'apps/web/e2e/support/topic-scale-probe.mjs').Path` rồi chạy lại lệnh scale. Lần đầu browser timeout trong khi Next.js đang compile route. Chưa đo VSTEP B2 với code mới trên production.

## Deploy và rollback

Deploy API trước web vì web dùng hai endpoint mới. Khi rollback cả hai, rollback web trước. Thay đổi này dùng schema hiện có.
