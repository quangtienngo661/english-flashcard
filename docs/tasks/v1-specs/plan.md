# Plan — v1-specs, đợt 1 (system spec + Vocabulary Content)

> Chỉ gồm việc còn phải làm. Phạm vi, phương án và quyết định đã được bạn duyệt: xem
> `docs/specs/DECISIONS_2026-10-04.md` (K1–K25) và lệnh "Bắt đầu" ngày 04/10/2026. Đây là cổng duy nhất của
> workflow; không dùng `ExitPlanMode` vì thư mục nằm ngoài kho harness và quyết định đã được chốt bằng chat.

**Ngày:** 2026-10-04

## Việc phải làm

| # | Bước | Tệp | Dựa trên |
|---|---|---|---|
| 1 | Viết `system-spec.md` theo mẫu module-spec: phạm vi V1, vai trò, định danh, ngôn ngữ, quy ước API, quyền khác hạn mức, snapshot, xóa tài khoản, điều kiện trước public, bản đồ ghi dữ liệu | `docs/specs/system-spec.md` | `DECISIONS` K2–K4, K22–K25, F1–F5, F36–F37, F44; research R9–R12, R15–R16 |
| 2 | Viết `module-spec-vocabulary-content.md`: mô hình nội dung, vòng đời, điều kiện publish, level/topic/nguồn, từ chức năng, từ riêng tư, tìm kiếm, chuỗi tra nghĩa, câu ngữ cảnh của người học, sửa sau publish, màn nguồn dữ liệu | `docs/specs/module-spec-vocabulary-content.md` | K10, K11, K19, K20, K23; N4, N11–N13; F13–F17; R1–R8, R13–R14 |
| 3 | Viết chỉ mục `docs/specs/README.md` (liệt kê 8 spec, trạng thái, nơi quan sát) | `docs/specs/README.md` | `SPEC_PLAN_AND_DECISIONS` mục 1 |
| 4 | Ghi `decision.md` (kèm *Defence*) và `checkpoint-1.md` | `docs/tasks/v1-specs/` | quy trình `write-spec` |
| 5 | Kiểm kê trích dẫn: mỗi tiêu chí và trường hợp biên đúng một nguồn; báo cáo bảng | báo cáo | `write-spec` mục "Sweep" |

## Ngoài phạm vi đợt này

Identity, Learning, Content Pipeline (đợt 2); Entitlements, AI Integration, Practice (đợt 3).

## Nơi mang các ghi chú hợp đồng giữa module (không có file api-contract)

| Hợp đồng | Spec mang ghi chú |
|---|---|
| Quy ước lỗi, phân trang, idempotency, snapshot, xóa tài khoản lan ra các module | `system-spec.md` |
| Cái gì được coi là "published", từ chức năng bị loại khỏi bộ học, cổng nguồn ngoài, câu ngữ cảnh | `module-spec-vocabulary-content.md` |
| Thêm vào nhóm "Mới thêm" và lịch ôn sau khi thêm nhanh | `module-spec-learning.md` (đợt 2), tham chiếu từ Content |
| Quyền và hạn mức của bước AI tra nghĩa | `module-spec-entitlements-usage.md` (đợt 3), tham chiếu từ Content |

## Material assumptions còn mở

| Assumption | Vì sao quan trọng | Sẽ giải quyết thế nào |
|---|---|---|
| Khớp dạng chia (`deployed` → `deploy`) có nguồn dữ liệu | Quyết định thêm nhanh có tìm ra từ gốc không | Spec ghi hành vi mong muốn và đánh dấu `ASSUMPTION`; chọn nguồn khi build |
| Provider tra cứu ngoài (K20) | Chuỗi tra nghĩa có bước B không | Spec định nghĩa chuỗi để vắng một bước vẫn chạy; chọn provider là điều kiện chặn build |
| Quy tắc khi hai nguồn level khác nhau (R2) | Ảnh hưởng level hiển thị và lọc | `ASSUMPTION`: ưu tiên CEFR-J, giữ cả hai, owner rà |
| Giới hạn số từ riêng tư, độ dài câu, page_size | Tham số, không đổi hành vi | `ASSUMPTION` ghi trong spec |

## Cập nhật đợt 2 và 3 (04/10/2026)

Đã viết thêm sáu spec theo cùng quy trình: `module-spec-identity-access.md`, `module-spec-learning.md`, `module-spec-content-pipeline.md`
(đợt 2) và `module-spec-entitlements-usage.md`, `module-spec-ai-integration.md`, `module-spec-practice.md` (đợt 3). Nguồn mới: R17–R45 trong
`research.md`; quyết định riêng của spec: D12–D22 trong `decision.md`; chỗ lệch hoặc tinh chỉnh quyết định gốc: mục 9 của `DECISIONS_2026-10-04.md`.

Việc còn lại: kiểm chứng độc lập các spec (kết quả ghi ở `verification-opus.md`), sửa theo kết quả, rồi chủ dự án duyệt.

### Material assumptions còn mở (bổ sung)

| Assumption | Vì sao quan trọng | Sẽ giải quyết thế nào |
|---|---|---|
| Cấu trúc hạn mức, đơn vị trừ lượt, trần chi AI (K18) | Entitlements và Practice phụ thuộc | Chủ dự án nghiên cứu; cập nhật ER5–ER14 |
| Cơ chế xoay vòng refresh token: §4.14.2 đã được agent kiểm chứng đọc; khoảng ân hạn 10 giây là lựa chọn riêng của spec | Bảo mật phiên | Chủ dự án quyết giữ hay bỏ ân hạn; tải lại nguyên văn trước khi build |
| Nguồn dữ liệu dạng chia của từ | Kiểm rule câu AI (PRC6, PRC7), khớp thêm nhanh (CR16) | Chọn nguồn hoặc duy trì danh sách bất quy tắc; đo tỉ lệ loại nhầm bằng bộ ví dụ (AR13) |
| Provider AI và điều khoản dữ liệu; provider từ điển ngoài | Quyền gửi dữ liệu, chi phí | Chọn trước khi bật cho người thật |
| Con số: OTP, khóa đăng nhập, TTL, trần nhóm, trần ôn, timeout, trần file | Tham số, không đổi hành vi | `ASSUMPTION` ghi trong từng spec |
