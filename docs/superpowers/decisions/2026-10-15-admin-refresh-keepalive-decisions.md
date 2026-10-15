# Decisions — Admin gửi refresh với `keepalive`

Ngày: 15/10/2026. Đi kèm design doc
[`../specs/2026-10-15-admin-refresh-keepalive-design.md`](../specs/2026-10-15-admin-refresh-keepalive-design.md).
File này gom các quyết định của lần brainstorm cùng ngày: chọn phương án sau báo cáo điều tra, rồi 3 câu hỏi Q1–Q3. Design
doc mô tả *cách làm*; file này trả lời *tại sao chọn vậy và đã bỏ gì*.

Bối cảnh chung: báo cáo [`../../tasks/2026-10-15-refresh-fast-reload/report.md`](../../tasks/2026-10-15-refresh-fast-reload/report.md)
chứng minh rằng tải lại hoặc rời trang admin giữa lúc refresh chạy làm mất câu trả lời (và cookie mới), nên quá 10 giây ân
hạn thì server thu hồi cả chuỗi phiên. Đường 429 của B25E30 luôn rơi vào trường hợp này.

**Nhãn:** ✅ = phương án được chọn. **Ai chốt:** "Chủ dự án" = chọn trực tiếp trong chat; "Duyệt cùng design" = trợ lý đề xuất,
chủ dự án duyệt khi đọc design doc (đã duyệt 15/10/2026: "Duyệt design keepalive (gồm các đề xuất RK2, RK7, RK8)").

## Tóm tắt

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| RK1, RK3 | Cách sửa | A: refresh của admin gửi với `keepalive`; không đổi API (không làm B) | Chủ dự án |
| RK2 | Phạm vi của `keepalive` | Chỉ `POST /v1/auth/refresh` | Duyệt cùng design |
| RK4 | Mức kiểm thử chống tái phát | Unit + một e2e API thật (rời trang, 12 s sau quay lại) | Chủ dự án (Q1) |
| RK5 | Trình duyệt được kiểm | Chỉ Chromium | Chủ dự án (Q2) |
| RK6 | Nhánh và PR | Nhánh `fix/admin-refresh-keepalive` từ `feat/ui-b-admin`, PR riêng xếp trên #23 | Chủ dự án (Q3) |
| RK7 | Cách rời trang trong e2e | `about:blank` ngay khi request refresh rời trình duyệt, chờ 12 s | Duyệt cùng design |
| RK8 | Trình duyệt không hỗ trợ hoặc từ chối `keepalive` | Vòng 1: không feature-detect, không đường dự phòng. **Vòng 2 (16/10):** từ chối (`TypeError`) thì gửi lại một lần không `keepalive` | Vòng 1: duyệt cùng design; vòng 2: chủ dự án (sau review) |

## RK1, RK3 — Cách sửa

Bối cảnh: báo cáo đưa 7 phương án; tin nhắn cuối của phiên điều tra đề xuất "A ngay, B để chủ dự án quyết", kèm hai nút trả
lời "A: keepalive" và "A và B". Chủ dự án trả lời: "Chọn A: gửi refresh của admin với keepalive. Viết design doc nhỏ cho A."

| Phương án | Chữa được | Không chữa được | Trade-off | |
|---|---|---|---|---|
| A. Client: refresh gửi với `keepalive: true` | Tải lại hoặc rời trang giữa lúc refresh, kể cả đường 429 | Mất mạng, tab hoặc trình duyệt bị giết, app Flutter | Sửa 1 chỗ ở `apps/admin`, không nới bảo mật; mới thử trên Chromium | ✅ |
| A và B (A + kéo dài ân hạn lên 120 s, đưa vào config) | Như A, thêm mất mạng ngắn, mọi trình duyệt | Quay lại sau khi hết ân hạn | Token cũ bị trộm dùng được lâu hơn; đổi IR11 và B1#16 | |
| B. Server: chỉ kéo dài ân hạn (≥ 60 s) | Đường 429, mất mạng ngắn | Quay lại muộn | Như trên | |
| C. Server: token kế tiếp chưa ai dùng thì trả lại bất kể thời gian | Mọi trường hợp mất câu trả lời | | Yếu nhất về bảo mật; thay đổi lớn hơn B | |
| D. Server: không tính lần trả qua ân hạn vào rate limit, hoặc nâng trần | Ít gặp 429 hơn | Bản thân việc mất câu trả lời | Nới một lớp chống lạm dụng | |
| E. Client: một tab refresh tại một thời điểm | Refresh song song (ân hạn đã lo) | Lỗi này | Phức tạp mà không giải quyết vấn đề | |
| F. Xoay idempotent theo request id | Tải lại và quay lại trong cùng tab | Đóng tab rồi mở tab mới | Tốn công nhất; không dùng lại được `Idempotency-Key` của Bước 0 (cần `userId`, refresh là `@Public`) | |
| G. Chấp nhận | | | Nhân viên phải đăng nhập lại; còn báo động giả `refresh_reuse_detected` | |

## RK2 — Phạm vi của `keepalive`

Bối cảnh: login và đổi mật khẩu cũng đặt cookie phiên. Trình bày trong bản tóm tắt hiểu biết đầu buổi brainstorm (chủ dự án
không phản đối, duyệt chính thức cùng design).

| Phương án | Trade-off | |
|---|---|---|
| Chỉ `POST /v1/auth/refresh` | Đúng chỗ gây thu hồi oan; mất câu trả lời của login hay đổi mật khẩu chỉ khiến người dùng đăng nhập lại | ✅ |
| Thêm cả login và đổi mật khẩu | Thêm phạm vi và test mà không chữa thu hồi oan nào | |

## RK4 — Mức kiểm thử chống tái phát (Q1)

| Phương án | Trade-off | |
|---|---|---|
| Unit + 1 e2e thật: rời trang giữa lúc refresh, 12 s sau quay lại vẫn đăng nhập | Bắt được cả khi gỡ `keepalive` lẫn khi trình duyệt hay CORS đổi hành vi; CI chậm thêm khoảng 15 s; test này đỏ trên code hôm nay | ✅ |
| Unit + e2e có cả đường 429 (F5 14 lần, chờ `Retry-After`) | Sát sự cố nhất; CI chậm thêm tới ~75 s, phụ thuộc ranh giới phút của rate limit | |
| Chỉ unit + chạy tay một lần | CI không chậm thêm; chỉ bắt được việc gỡ `keepalive` | |

## RK5 — Trình duyệt được kiểm (Q2)

| Phương án | Trade-off | |
|---|---|---|
| Chỉ Chromium | Bộ e2e thật chỉ chạy Desktop Chrome; Chrome và Edge là Chromium; Firefox/Safari ghi `ASSUMPTION` (bỏ qua `keepalive` thì như hôm nay); không tải thêm gì | ✅ |
| Kiểm thêm một lần bằng tay trên Firefox và WebKit | Phải tải hai trình duyệt của Playwright (vài trăm MB, cần cho phép tải); CI vẫn chỉ Chromium | |
| Thêm Firefox và WebKit vào CI | Chắc nhất; CI cài thêm 2 trình duyệt, chậm hơn, phải tách test khỏi câu chuyện chạy theo thứ tự | |

## RK6 — Nhánh và PR (Q3)

| Phương án | Trade-off | |
|---|---|---|
| PR riêng xếp trên #23: nhánh `fix/admin-refresh-keepalive` từ `feat/ui-b-admin`, base `feat/ui-b-admin`, đổi base sang `dev` khi #23 merge | Review nhỏ, không mở lại review của #23; thêm một tầng PR xếp chồng (#22 ← #23 ← PR này) | ✅ |
| Thêm vào PR #23 | Ít PR hơn; #23 đã review xong phải review lại phần mới | |
| Chờ #23 vào `dev` rồi mới cắt nhánh code | Lịch sử gọn nhất; phải chờ | |

Thực hiện ngay: nhánh `docs/refresh-fast-reload` (chưa push, đã có commit báo cáo) được đổi tên thành
`fix/admin-refresh-keepalive`.

## RK8 vòng 2 — Trình duyệt từ chối `keepalive` (16/10/2026, sau review cả nhánh)

Bối cảnh: review cả nhánh (finding I1, `../reviews/2026-10-15-admin-refresh-keepalive-branch-review.md`) chỉ ra tiền đề của
vòng 1 ("không hỗ trợ thì bỏ qua") chỉ đúng với engine hoàn toàn không có `keepalive`. Engine có `keepalive` nhưng từ chối nó
khi request cần preflight CORS (bản Chromium đầu tiên từng như vậy; Firefox/Safari hiện nay chưa kiểm) làm `fetch` ném
`TypeError`, nên admin bị đăng xuất mỗi lần tải trang, tệ hơn trước bản sửa. Câu hỏi trong chat có ba lựa chọn:

| Phương án | Trade-off | |
|---|---|---|
| Thêm đường dự phòng: `TypeError` thì gửi lại ngay một lần không `keepalive` | ~5 dòng + test unit; an toàn với server (lần đầu đã tới server thì lần hai trong 10 s nhận đúng token qua ân hạn); trình duyệt từ chối `keepalive` chạy như trước | ✅ |
| Giữ vòng 1, ghi lại rủi ro, kiểm tay Firefox và WebKit trước deploy | Không sửa code; phải tải hai trình duyệt của Playwright (vài trăm MB) | |
| Giữ vòng 1, chỉ ghi rủi ro | Không sửa, không kiểm; dựa vào việc nhân viên dùng Chrome/Edge | |

## Đề xuất kỹ thuật duyệt cùng design

**Chỉ có trong design doc, chưa trình bày riêng trong chat** (chủ dự án duyệt khi đọc doc):

| Đề xuất | Chọn | Bỏ | Vì sao |
|---|---|---|---|
| RK7 Cách rời trang trong e2e | `page.goto('about:blank')` ngay khi `page.waitForRequest` thấy request refresh, chờ 12 s | Mở một URL khác của admin (Vite preview trả `index.html` cho đường dẫn của app, bộ e2e thật vẫn `goto('/uploads')` được, nên app lại chạy; bản build chỉ có `index.html` và file có tên băm trong `assets/`) | Đã thử: rời sang `about:blank` làm mất phiên 3/3 trên code hôm nay, còn phiên 3/3 khi có `keepalive` giả lập |
| RK8 Không feature-detect | Gửi thẳng `keepalive: true` | Kiểm hỗ trợ rồi chọn đường khác | Trình duyệt không hỗ trợ thì bỏ qua tùy chọn, hành vi như hôm nay (`ASSUMPTION`; tiền đề sai một nửa, xem RK8 vòng 2) |
| Bằng chứng trước khi làm | Giả lập `keepalive` bằng init script của Playwright bọc `window.fetch` | Sửa code admin để thử | Thử được phương án trên admin thật mà không sửa code trước khi design được duyệt |
| RKC4 (đường 429) | Chạy tay một lần bằng script điều tra, ghi vào delivery record | Đưa vào CI | Theo RK4; vẫn kiểm đúng sự cố gốc trên code thật |
