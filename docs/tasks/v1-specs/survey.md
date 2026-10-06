# Survey — v1-specs (đợt 1: system spec + Vocabulary Content)

> Stage 1. Hiện trạng. **Không có hệ thống tham chiếu để quan sát** và `english-learning` chưa có code,
> nên survey này là survey tài liệu. Không dùng `probe-readonly` vì thư mục nằm ngoài kho harness
> (agent chỉ đọc trong kho này); việc đọc do trợ lý thực hiện trực tiếp bằng công cụ đọc file.

**Ngày:** 2026-10-04 · **Khảo sát bởi:** trợ lý (đọc trực tiếp), không phải `probe-readonly`

## Cái đang có

| Thứ | Đường dẫn | Hiện trạng |
|---|---|---|
| Code ứng dụng | `E:\Working\Working project\english-learning\` | Chỉ có `docs/`; không có code, không có git repo |
| Quyết định đã chốt | `docs/specs/DECISIONS_2026-10-04.md` | K1–K25, mặc định N1–N13; phần mặc định F1–F44 ở `SPEC_PLAN_AND_DECISIONS_2026-10-04.md` mục 3 |
| Bối cảnh sản phẩm | `docs/preparation/PROJECT_CONTEXT.md` | Bảng V1, quyết định theo ngày |
| Bản nháp schema | `docs/preparation/V1_DATA_MODEL_DRAFT.md` | Option D đã chốt; bảng và Defense Analysis còn là đề xuất |
| Danh sách từ | `docs/preparation/evidence/wordlists_2026-10-02/` | CEFR-J 1.5 và Octanove C1/C2 1.0 dạng CSV |
| Harness: đường dẫn artefact | `rules/task-artefacts.md` | Dự án chưa khai báo `task-artefacts:`; áp mặc định `docs/tasks/<slug>/` |

## Hành vi quan sát được (đã chạy ngày 04/10/2026)

Các số liệu về dữ liệu nguồn được đo lại bằng script, kết quả ở `research.md` mục R1–R8.

## Tái sử dụng

Các bản nháp trong `docs/preparation/` (schema, rubric, user flow) là đầu vào của spec; spec không chép lại
mà trích dẫn quyết định hoặc finding.

## Câu hỏi survey chưa trả lời được

- Khớp dạng chia (`deployed` → `deploy`): chưa có nguồn dữ liệu dạng chia. Mang vào plan là `ASSUMPTION`/mở.
- Provider tra cứu ngoài (K20): chưa chọn. Mang vào plan là điều kiện chặn khi build, không chặn spec.

## Bổ sung cho đợt 2 và 3 (04/10/2026)

Các đợt 2 và 3 (Identity, Learning, Content Pipeline, Entitlements, AI Integration, Practice) được viết sau đợt 1 mà **không có survey riêng được ghi lại**
(phát hiện F49 của `verification-opus.md`). Phần dưới bổ sung lại những gì đã đọc làm đầu vào, để lần sau không phải suy lại:

| Thứ đã đọc | Dùng cho |
|---|---|
| `docs/specs/DECISIONS_2026-10-04.md`, `SPEC_PLAN_AND_DECISIONS_2026-10-04.md` (mặc định F1–F44) | Mọi spec |
| `docs/preparation/V1_GRADING_RULES_DRAFT.md` (rubric và Defense Analysis chấm bài, bản nháp 02/10) | Practice, AI Integration |
| `docs/preparation/V1_DATA_MODEL_DRAFT.md` mục 4–5 (bảng danh tính, phiên, quyền, Defense Analysis dữ liệu) | Identity, Entitlements, Content |
| `docs/preparation/ARCHITECTURE_PATTERNS_RESEARCH_2026-10-02.md` mục 3–8 | Identity, Pipeline, Entitlements, AI |
| `docs/preparation/DECISION_ANALYSIS_TEMPLATE.md` | Các phần Defense Analysis |
| `docs/specs/RESEARCH_AI_QUOTA_MODELS_2026-10-04.md` | Entitlements |
| Hai file CSV nguồn, chạy lại bằng `evidence/verify_data_2026-10-04.py` | Pipeline, Content |

Kết quả kiểm chứng độc lập: `verification-opus.md`; cách mỗi phát hiện được xử lý: `verification-response.md`.
