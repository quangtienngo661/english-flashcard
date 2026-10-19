# Bước 5 — plan tóm tắt (19/10/2026)

Ảnh chụp lúc trình plan, chưa duyệt. Plan đầy đủ: [`../superpowers/plans/2026-10-19-buoc-5-entitlements.md`](../superpowers/plans/2026-10-19-buoc-5-entitlements.md);
design: [`../superpowers/specs/2026-10-19-buoc-5-entitlements-design.md`](../superpowers/specs/2026-10-19-buoc-5-entitlements-design.md).
Plan **chỉ có API** (D2); giao diện làm ở đợt sau.

Cách làm: các phiên Claude implement song song, một phiên điều phối (D27); **tối đa 4–5 phiên** (chủ dự án 19/10): ba phiên
implement và phiên điều phối, phiên điều phối tự chạy phần kiểm cuối. "Xong khi": xong mọi task, CI xanh trên mọi PR,
`pnpm smoke:buoc-5` chạy qua API thật trên DB mới hai lần (có và không có "hỏi lại trạng thái"), và `pnpm smoke:buoc-4` vẫn qua (D26, R5).

**Chia phiên:**
- **step-5-A — Nền móng, rồi Practice:** task 4 (merge trước tiên vì hai phiên kia chờ nó), 1, 2, 3; sau đó task 11 khi step-5-B xong 9–10.
- **step-5-B — Phần lõi:** task 5, 6, 9, 10, 12, 13, 14; bắt đầu khi task 4 đã merge.
- **step-5-C — Thanh toán và email:** task 7, 8, 15, 16, 17, 18, 19; bắt đầu khi task 4 đã merge.
- **step-5-coordinator (phiên điều phối):** commit và merge plan; tự mở step-5-A, rồi step-5-B và step-5-C (khi PR C1 đã merge) thành phiên con;
  merge các PR, báo phiên đang chờ; cuối cùng tự làm task 20–21 (kiểm cuối).
Muốn tách phần kiểm cuối ra một phiên riêng thì thành 5 phiên; không đổi gì khác.

**Cập nhật 19/10/2026 sau review plan** ([`../superpowers/reviews/2026-10-19-buoc-5-plan-review.md`](../superpowers/reviews/2026-10-19-buoc-5-plan-review.md),
21 phát hiện; chủ dự án: "sửa đi"): đã sửa hết phần kỹ thuật trong plan. Câu Q3 đã chốt thành **D35**: chỉ nhận gói tự gia hạn, người dùng
không phải nhớ ngày và tự trả; bỏ kiểu "app tự gia hạn" khỏi lõi (không còn sự kiện "thanh toán một lần", email "báo sắp hết hạn" và cài đặt của
nó). Câu Q4 đã chốt thành **D36**: bỏ email cảnh báo trần AI; API lượt AI của admin trả cờ "đã chạm ngưỡng" để màn admin tô vàng (đợt giao diện).
Câu Q2 đã chốt thành **D37**: bộ nối bắt buộc gửi mã giao dịch mỗi khi có trừ tiền (kể cả khi đổi tháng → năm); vẫn thiếu mã thì hoàn tiền chỉ
ghi lại và log, không cắt Pro. Câu Q1 đã chốt thành **D38**: muốn kéo dài hay dời ngày thì staff sửa ngày của chính lần cấp đó (API mới, có lịch sử
sửa), không tạo lần cấp mới; lần cấp Pro mới bắt đầu ở tương lai không thu hồi lần cũ. **Không còn câu nào chờ chủ dự án**; plan sẵn sàng để duyệt.

**Chọn kỹ thuật trong plan** (design không ghi; ghi vào design khi xong; đánh số như plan):
1. Thêm một cờ cấu hình báo "đây là production" (hiện chưa có), để production bỏ qua sự kiện `sandbox` và không bao giờ bật bộ nối giả.
2. Practice gọi "ghi nhận phiên" ở mọi lần ghi kết quả cuối; lần đầu được lưu, các lần sau bị bỏ qua — đúng nghĩa "câu đầu có kết quả".
3. Thêm ba cột (giao dịch đã trả cho kỳ đang dùng — để biết hoàn tiền có phải của kỳ đang dùng không, D34; mã gói của nhà cung cấp và mã
   người dùng gốc trên sự kiện) và một bảng riêng của bộ nối giả.
4. Endpoint nhận thông báo thanh toán đọc body thô bằng một bộ đọc riêng cho đúng đường đó, đặt trước bộ đọc JSON chung.
5. Lệnh thử lượt AI là một lệnh chạy trên máy (như `maintenance:run`), không mở endpoint test nào.
6. Chuyển hàm phân loại lỗi gửi email từ phần nhắc học sang phần mail chung, để Entitlements dùng được mà không phụ thuộc phần nhắc học.
7. ~~Email cảnh báo trần AI do job mỗi giờ tạo~~ — bỏ theo D36: không còn email cảnh báo; cờ "đã chạm ngưỡng" tính lúc đọc.

**M1 — Nền móng (luồng A, B, C, D)**
1. Thêm 15 cài đặt nhóm `entitlements`, nhóm mới `content` (từ riêng, câu ngữ cảnh) và hai giới hạn mới của `learning` (số nhóm, số từ mỗi nhóm).
2. Learning và Content đọc bốn giới hạn từ cài đặt thay cho hằng số; dữ liệu đang vượt mức mới giữ nguyên, chỉ chặn thêm mới.
3. Thêm quyền `entitlements.grant` cho `admin` và `editor`.
4. Bảng dữ liệu của Entitlements (lần cấp, lịch sử sửa ngày lần cấp, gói đăng ký, hộp sự kiện, lịch sử trial, sổ lượt, email cần gửi, bảng của bộ nối giả), các hằng số cố định và khóa.
5. Tính chu kỳ tháng theo mốc (31/01 → 28/02 → 31/03), ngày theo giờ Việt Nam cho trần AI, 0 giờ ngày mai theo giờ người học.
6. Tính "người này đang ở gói nào, mốc chu kỳ nào, mỗi kho được bao nhiêu" từ gói đăng ký và các lần cấp; chuyển trạng thái gói theo thời gian.
7. Máy trạng thái gói đăng ký theo đủ bảng trạng thái × sự kiện; luật thứ tự sự kiện (trạng thái theo thời điểm, cộng thêm luôn áp).
8. Giao diện chung của bộ nối nhà cung cấp, sổ đăng ký bộ nối, chữ ký và cách đọc sự kiện của bộ nối giả.

**M2 — Phần lõi (luồng E, F)**
9. Dịch vụ Entitlements thật: kiểm quyền có lý do, kiểm hạn mức phiên luyện, ghi nhận phiên, bức tranh gói của một người (lượt còn, ngày làm mới, quảng cáo, được trial không).
10. Sổ lượt AI: giữ, xác nhận, nhả, hoàn lượt; trần toàn hệ thống và công tắc AI (chỉ xếp hàng ở khóa chung khi đã qua các bước kiểm theo
    người; không mở thêm kết nối DB khi đang giữ khóa); job đánh dấu lượt giữ quá 2 phút.
11. Practice kiểm hạn mức phiên sau khi đóng phiên cũ, trả `quota-exhausted` kèm giờ làm mới, ghi nhận phiên khi câu đầu có kết quả.
12. Cấp tay: luật admin/editor, cấp gói là gói mới (lần cấp bắt đầu ngay thu hồi lần cũ, bắt đầu ở tương lai thì không; tắt tự gia hạn của gói trả tiền khi staff xác nhận), con số riêng, thu hồi, sửa ngày lần cấp (có lịch sử sửa), lịch sử có lọc.
13. API đọc: người học xem gói của mình; staff xem gói một người; admin xem lượt AI trong ngày so với trần, kèm cờ "đã chạm ngưỡng cảnh báo".
14. Lệnh thử lượt AI trên máy (giữ/xác nhận/nhả/hoàn, chạy song song nhiều lần, cho một hoặc nhiều người dùng cùng lúc) cho smoke.

**M3 — Thanh toán và email (luồng G, H)**
15. Cấu hình thanh toán (cờ production, bật bộ nối giả, khóa ký, tắt "hỏi lại trạng thái") và bộ nối giả có giữ trạng thái.
16. Endpoint nhận thông báo của nhà cung cấp (đọc raw body, tối đa 64 KB, nhận cả GET), lưu vào hộp sự kiện, chống trùng, trả lời ngay; lệnh gửi sự kiện giả.
17. Áp sự kiện vào gói: luật thứ tự, hỏi lại trạng thái khi cần (sau khi đã nhả khóa), luật một trial (tài khoản và thẻ; chỉ khi sự kiện thật
    sự bắt đầu một trial), môi trường, người dùng không nhận ra, hoàn tiền kỳ đang dùng.
18. Job thanh toán: thử áp lại sự kiện lỗi, chuyển trạng thái theo thời gian (kể cả gói quá kỳ chưa có thông báo; không ghi đè thay đổi vừa
    tới), xóa payload gốc sau 90 ngày.
19. Email: bắt đầu trial, nhắc trial, báo trước gia hạn (mặc định tắt); gửi từng email một;
    trần 95% hạn mức email.

**M4 — Kiểm cuối (luồng Z)**
20. Sửa `smoke:buoc-4` để learner của nó được cấp thêm số phiên (sau Bước 5 learner đó là Free, 3 phiên/ngày).
21. Viết `smoke:buoc-5` chạy đủ B5#1–B5#35 và các ca chạy đua với 10 request song song (cả nhiều người dùng cùng lúc); chạy hai lần, có và
    không có "hỏi lại trạng thái"; ghi as-built.
