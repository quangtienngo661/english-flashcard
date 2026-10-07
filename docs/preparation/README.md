# Tài liệu chuẩn bị trước khi phát triển

Thư mục này chứa context, research và bản nháp thiết kế được làm **trước khi có
code**. Đây là tài liệu làm việc, chưa phải Product Spec hay Architecture Spec đã
chốt. Mỗi file tự ghi trạng thái: người dùng xác nhận, đề xuất hay bằng chứng.

**Nguồn gốc:** copy ngày 02/10/2026 từ workspace Codex
`Documents/Codex/2026-09-29/referenced-chatgpt-conversation-this-is-an/outputs/`
(bỏ qua gói ZIP export trùng lặp). Trong các file cũ, những chỗ nhắc `outputs/`,
`work/` hay "workspace này" dưới dạng chữ là đường dẫn của workspace đó. Bằng
chứng danh sách từ được chuyển vào `evidence/` và link trong
`DATA_COST_LICENSE_RESEARCH_2026-10-02.md` đã trỏ sang đó.

## Đọc theo thứ tự

1. [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) — mục tiêu, trạng thái, quyết định và bước tiếp theo. **Đọc đầu tiên.**
2. [V1_IMPLEMENTATION_PLAN.md](V1_IMPLEMENTATION_PLAN.md) — phạm vi V1, readiness, thứ tự xây dựng, V1.5 có điều kiện.
3. [V1_USER_FLOW_DRAFT.md](V1_USER_FLOW_DRAFT.md) — vòng sử dụng V1 giả định.
4. [DATA_COST_LICENSE_RESEARCH_2026-10-02.md](DATA_COST_LICENSE_RESEARCH_2026-10-02.md) — danh sách từ A1–C2, chi phí, ràng buộc store, giấy phép.
5. [DECISION_ANALYSIS_TEMPLATE.md](DECISION_ANALYSIS_TEMPLATE.md) — checklist Defense Analysis dùng khi viết spec/ADR.

## Danh mục

| Nhóm | File |
| --- | --- |
| Context và trạng thái | [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md), [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) (snapshot xuất trước các quyết định cuối ngày 02/10, không cập nhật theo), [PROJECT_STATUS_2026-09-30.md](PROJECT_STATUS_2026-09-30.md) (lịch sử) |
| Product discovery | [PRODUCT_DISCOVERY.md](PRODUCT_DISCOVERY.md), [SURVEY_QUESTIONNAIRE.md](SURVEY_QUESTIONNAIRE.md), [SURVEY_ANALYSIS_2026-09-30.md](SURVEY_ANALYSIS_2026-09-30.md), [QUALITATIVE_FEEDBACK_2026-09-30.md](QUALITATIVE_FEEDBACK_2026-09-30.md), [COMMUNITY_RESEARCH_ENGLISH_AI_2026-09-30.md](COMMUNITY_RESEARCH_ENGLISH_AI_2026-09-30.md), [COMPETITOR_ANALYSIS_AI_ENGLISH_APPS_2026-09-30.md](COMPETITOR_ANALYSIS_AI_ENGLISH_APPS_2026-09-30.md) |
| Kế hoạch và bản nháp V1 | [V1_IMPLEMENTATION_PLAN.md](V1_IMPLEMENTATION_PLAN.md), [V1_USER_FLOW_DRAFT.md](V1_USER_FLOW_DRAFT.md), [V1_DATA_MODEL_DRAFT.md](V1_DATA_MODEL_DRAFT.md), [V1_GRADING_RULES_DRAFT.md](V1_GRADING_RULES_DRAFT.md) |
| Kiến trúc và tiến hóa | [SYSTEM_EVOLUTION_OPTIONS_2026-10-02.md](SYSTEM_EVOLUTION_OPTIONS_2026-10-02.md), [SYSTEM_DESIGN_BEGINNER_GUIDE_2026-10-02.md](SYSTEM_DESIGN_BEGINNER_GUIDE_2026-10-02.md) |
| Pattern tái sử dụng/mở rộng | [ARCHITECTURE_PATTERNS_RESEARCH_2026-10-02.md](ARCHITECTURE_PATTERNS_RESEARCH_2026-10-02.md) |
| Dữ liệu từ vựng | [VOCABULARY_DATA_RESEARCH_2026-10-01.md](VOCABULARY_DATA_RESEARCH_2026-10-01.md), [DATA_COST_LICENSE_RESEARCH_2026-10-02.md](DATA_COST_LICENSE_RESEARCH_2026-10-02.md), [DICTIONARY_API_SESSION_SUMMARY_2026-10-02.md](DICTIONARY_API_SESSION_SUMMARY_2026-10-02.md), [NETWORK_INSPECTION_2026-10-02.md](NETWORK_INSPECTION_2026-10-02.md) |
| Mẫu và nguyên tắc | [DECISION_ANALYSIS_TEMPLATE.md](DECISION_ANALYSIS_TEMPLATE.md), [WORKSPACE_INSTRUCTIONS_FROM_CODEX.md](WORKSPACE_INSTRUCTIONS_FROM_CODEX.md) (bản `AGENTS.md` của workspace Codex, đổi tên để không bị agent tự nạp làm hướng dẫn) |
| Bằng chứng | [evidence/wordlists_2026-10-02/](evidence/wordlists_2026-10-02/) (danh sách từ, script và output thống kê), [NETWORK_OBSERVATIONS_2026-10-02.json](NETWORK_OBSERVATIONS_2026-10-02.json), [LONGMAN_INTERACTIONS_2026-10-02.json](LONGMAN_INTERACTIONS_2026-10-02.json), [SURVEY_FORM_PREVIEW.png](SURVEY_FORM_PREVIEW.png), [SURVEY_FORM_UPDATED.png](SURVEY_FORM_UPDATED.png) |

## Còn lệch giữa các file

Ngày 02/10 đã rà mâu thuẫn và đồng bộ `PROJECT_CONTEXT.md` (viết lại đầy đủ cuối ngày),
`V1_IMPLEMENTATION_PLAN.md`, `PRODUCT_DISCOVERY.md` (mục 28 và 29),
`DATA_COST_LICENSE_RESEARCH_2026-10-02.md` và `ARCHITECTURE_PATTERNS_RESEARCH_2026-10-02.md`. Các file sau cố ý giữ nguyên làm lịch
sử: `PROJECT_DOCUMENTATION.md` (snapshot trước rà), `PROJECT_STATUS_2026-09-30.md`,
các mục cũ trong `PRODUCT_DISCOVERY.md`, và `WORKSPACE_INSTRUCTIONS_FROM_CODEX.md`
(đường dẫn `outputs/`, `work/` là của workspace Codex). Khi hai nơi khác nhau, ưu
tiên `PROJECT_CONTEXT.md`.
