# Checkpoint 1 — v1-specs

> Cổng duy nhất của `write-spec`. **Ghi trung thực:** cổng này **không** được thực hiện bằng `ExitPlanMode` hay
> `AskUserQuestion`, vì thư mục `english-learning` nằm ngoài kho harness và phiên không ở plan mode. Sự đồng ý của chủ dự án
> được lấy bằng chat, qua hai bước dưới đây.

**Date:** 2026-10-04 · **Stops before:** viết bất kỳ spec nào

## What was put to the human

Danh sách đầy đủ phạm vi và quyết định: `docs/specs/SPEC_PLAN_AND_DECISIONS_2026-10-04.md` (phương án, đề xuất, mặc định) và
`docs/specs/DECISIONS_2026-10-04.md` (quyết định cuối K1–K25, mặc định N1–N13), được trình bày trong chat và sửa qua nhiều vòng.

## What they answered

1. Trả lời từng quyết định K1–K25 qua nhiều lượt chat ngày 04/10/2026 (K18 hoãn: "mình sẽ tự research rồi gửi report").
2. Sau khi mở rộng V1 (K19–K25): **"Bắt đầu"**.
3. Sau đợt 1: **"Viết đợt 2 và đợt 3 luôn đi, xong rồi dùng model opus 5.5 extra effort để kiểm chứng lại các spec"** (không dừng giữa các đợt).
4. Sau kiểm chứng (05/10/2026): **"Chốt hết theo đề xuất, rồi viết bổ sung Defense Analysis"**, rồi **"Bạn tự kiểm chứng đi, không cần gọi agent"**.

## What changed as a result

Phạm vi V1 được mở rộng giữa chừng (thêm nhanh, lịch ôn, từ yếu, câu ngữ cảnh); Content Pipeline bỏ AI soạn nháp; K12 đổi thành chuỗi tra nghĩa.

## State at this checkpoint

| | |
|---|---|
| Suite | Không có (chưa có code) |
| Artefacts complete so far | survey · research · plan · decision (đợt 1) · checkpoint-1; `system-spec.md`, `module-spec-vocabulary-content.md`, `README.md` |
| Known open | K18 (hạn mức AI) hoãn; provider tra cứu ngoài chưa chọn; khớp dạng chia chưa có nguồn; quy tắc ưu tiên level khi hai nguồn khác nhau là `ASSUMPTION` |
