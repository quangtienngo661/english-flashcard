# Trang admin — kiểm kê các mục quản trị và tham khảo Sneat (14/10/2026)

Mục đích: một chỗ để chủ dự án theo dõi **bước nào đã chốt luồng admin**, quyết định **menu/các mục quản lý của toàn hệ
thống**, và soạn **mock data** cho các mục chưa có API. Đây là tài liệu chuẩn bị, không phải quyết định. Phạm vi Bước 2.5 vẫn
theo design `docs/superpowers/specs/2026-10-14-buoc-2-5-admin-web-design.md` cho tới khi chủ dự án đổi.

## 1. Bước nào đã chốt gì về admin

| Bước | Tài liệu | Đã chốt về admin |
|---|---|---|
| 1 — Identity | `decisions/2026-10-07-buoc-1-identity-core-decisions.md` D6; design Bước 1 "Bảng quyền (D6)" | Hai vai trò `admin`, `editor`; bảng 8 quyền (dưới); admin đầu tiên bằng CLI `pnpm admin:grant`; API cấp/thu vai trò; không bao giờ còn 0 admin; chỉ cấp cho email đã xác minh |
| 2 — Content + Pipeline | `decisions/2026-10-12-buoc-2-content-pipeline-decisions.md` D2, D9, D12 | Toàn bộ API quản trị nội dung (nhập CSV, soạn, rà, publish, hoàn tác, xuất); ánh xạ endpoint → quyền; giao diện làm sau (D9) |
| 2.5 — Giao diện admin | `decisions/2026-10-14-buoc-2-5-admin-web-decisions.md` D1–D22, F1–F4 | App `apps/admin`; phạm vi: đăng nhập + vai trò + luồng CSV (D2); admin tạo tài khoản editor, bắt đổi mật khẩu (D18–D21); dashboard và quản lý user đầy đủ **để ngoài** (D22) |
| 4/7 — Practice | `specs/module-spec-practice.md` PRC7, PRC18, PRC25 | Duyệt câu bị báo lỗi (quyền `questions.moderate`); danh sách dạng bất quy tắc — **quyền chưa gán** (CLAUDE.md "Việc phải phân tích") |
| 5 — Entitlements | `specs/module-spec-entitlements-usage.md` ER2, ER9, ER10, ER14 | Cấp quyền/lượt AI có lý do + hạn, sổ cấp, thu hồi (`entitlements.grant`); đổi con số hạn mức — **quyền chưa gán** (đề xuất `ai.settings`); rủi ro editor cấp lượt tốn tiền — **chưa chốt** |
| 6 — AI Integration | `specs/module-spec-ai-integration.md` AR6, AR13; Entitlements ER14 | Công tắc AI + trần chi phí ngày (`ai.settings`, chỉ admin); nhật ký chi phí và đối soát (`ai.settings`, chủ dự án chốt 12/10); bộ ví dụ đánh giá trước khi bật AI |
| 8 — Identity còn lại | `HANDOFF_2026-10-05_BUOC_0.md` §2 | Xóa tài khoản (và xóa lan) |

### Bảng quyền (D6 Bước 1)

| Quyền | Gồm | admin | editor | Code ở bước |
|---|---|:-:|:-:|---|
| `roles.manage` | Cấp/thu vai trò; (2.5) tạo tài khoản staff | ✓ | | 1, 2.5 |
| `content.edit` | Soạn nháp, CSV, đánh dấu đã rà, dạng chấp nhận | ✓ | ✓ | 2 |
| `content.publish` | Publish, bỏ publish, retire | ✓ | ✓ | 2 |
| `content.import` | Đăng ký nguồn, nhập file | ✓ | ✓ | 2 |
| `taxonomy.manage` | Chủ đề, ghi đè cờ từ chức năng | ✓ | ✓ | 2 |
| `questions.moderate` | Xem báo lỗi, ẩn/gỡ/khôi phục câu | ✓ | ✓ | 4/7 |
| `entitlements.grant` | Cấp quyền/lượt AI cho người học | ✓ | ✓ | 5 |
| `ai.settings` | Bật/tắt AI, trần chi phí, xem chi phí/đối soát | ✓ | | 6 |

## 2. Toàn bộ các mục quản trị, theo nhóm menu

Cột **API**: ✅ đã có (đọc từ `apps/api/src`, 14/10/2026), 🟡 đang làm ở nhánh M1 của Bước 2.5, ❌ chưa có (phải dùng mock data).
Cột **2.5**: mục có trong phạm vi Bước 2.5 hiện tại hay không.

| Nhóm | Mục | Việc làm được | Quyền | API | 2.5 | Nguồn |
|---|---|---|---|---|:-:|---|
| Tổng quan | Dashboard | Số từ/nghĩa (đã publish, nháp, chưa đủ điều kiện), lô nhập gần đây, job đang chạy, số learner, chi phí AI hôm nay | (đọc) | ❌ | ✗ (D22) | — |
| Nội dung | Lô nhập | Upload CSV, xem báo cáo, tải `rejected.csv`, hoàn tác | `content.import` (+`content.edit`) | ✅ | ✓ | Bước 2 |
| Nội dung | Publish job | Publish theo bộ lọc, lịch sử, báo cáo | `content.publish` | ✅ + 🟡 danh sách | ✓ | Bước 2, 2.5 |
| Nội dung | Xuất CSV | Xuất theo bộ lọc để sửa trong Excel | `content.edit` | ✅ | ✓ | Bước 2 |
| Nội dung | Nguồn dữ liệu | Đăng ký nguồn (tên, phiên bản, license) | `content.import` | ✅ | ✓ | Bước 2 |
| Nội dung | Từ (entries) | Danh sách + lọc (`conflict`, `has_sense`, level, lô); biến thể chính tả; level biên tập; cờ từ chức năng; thêm nhanh nhiều từ | `content.edit`, `taxonomy.manage` | ✅ | ✗ | Bước 2 (CR8, CR10, PR6) |
| Nội dung | Nghĩa (senses) | Danh sách, soạn nháp (gloss, định nghĩa, ví dụ, chủ đề, dạng chấp nhận), đánh dấu đã rà, publish/bỏ publish/retire, publish nhanh, lịch sử revision | `content.edit`, `content.publish` | ✅ | ✗ | Bước 2 (CR17, CR19, CR22) |
| Nội dung | Chủ đề | Thêm, đổi tên vi/en, lưu trữ | `taxonomy.manage` | ✅ + 🟡 danh sách | ✗ | Bước 2 (CR9) |
| Luyện tập | Câu bị báo lỗi | Hàng chờ câu bị báo, lý do, số lần; ẩn/gỡ/khôi phục theo ID, theo sense, theo phiên bản prompt | `questions.moderate` | ❌ | ✗ | Bước 4/7 (PRC18, PRC25) |
| Luyện tập | Dạng bất quy tắc | Danh sách `go → went, gone`… để kiểm câu AI | chưa gán (đề xuất `questions.moderate`) | ❌ | ✗ | Bước 4/7 (PRC7) |
| Người học | Quyền lợi & lượt AI | Cấp quyền/lượt cho một người, lý do, hạn; sổ cấp; thu hồi; trial | `entitlements.grant` | ❌ | ✗ | Bước 5 (ER2, ER10) |
| Người học | Danh sách người dùng | Mọi user gồm learner, trạng thái, khóa/mở, xóa (Bước 8) | chưa có quyền | ❌ | ✗ (D22) | — |
| AI | Cài đặt AI | Công tắc AI toàn hệ thống, trần chi phí ngày, con số hạn mức | `ai.settings` | ❌ | ✗ | Bước 5–6 (ER9, ER14) |
| AI | Chi phí & đối soát | Nhật ký mỗi lời gọi AI, tổng theo ngày/model, đối soát hóa đơn | `ai.settings` | ❌ | ✗ | Bước 6 (AR6) |
| AI | Bộ ví dụ đánh giá | Bộ ví dụ đã duyệt, kết quả chạy trước khi bật AI cho pilot | `ai.settings` | ❌ | ✗ | Bước 6 (AR13) |
| Hệ thống | Vai trò & staff | Danh sách staff, cấp/gỡ vai trò, tạo tài khoản editor | `roles.manage` | ✅ + 🟡 tạo tài khoản | ✓ | Bước 1, 2.5 |
| Hệ thống | Tài khoản của tôi | Đổi mật khẩu bắt buộc (2.5); đổi mật khẩu chủ động, thiết bị/phiên (để sau) | (bản thân) | ✅ | một phần | Bước 1, 2.5 |

## 3. Gợi ý cấu trúc menu (để chủ dự án quyết)

```
TỔNG QUAN        Dashboard                       (mock)
NỘI DUNG         Lô nhập · Publish job · Xuất CSV · Nguồn      (thật, 2.5)
                 Từ · Nghĩa · Chủ đề             (API có, giao diện để sau → có thể mock giao diện trước)
LUYỆN TẬP        Câu bị báo lỗi · Dạng bất quy tắc            (mock, Bước 4/7)
NGƯỜI HỌC        Người dùng · Quyền lợi & lượt AI             (mock, Bước 5/8)
AI               Cài đặt AI · Chi phí & đối soát · Bộ ví dụ   (mock, Bước 5–6; chỉ admin)
HỆ THỐNG         Vai trò & staff                  (thật, 2.5)
```

Menu ẩn mục theo quyền (như hiện tại): editor không thấy "Vai trò & staff" và nhóm "AI".

## 4. Dữ liệu cho mock (trường lấy từ spec, để soạn dữ liệu giả cho đúng hình)

| Mục | Một bản ghi gồm |
|---|---|
| Dashboard | `published_senses`, `draft_senses`, `unpublishable_senses`, `entries`, `learners`, `active_jobs`, `last_uploads[]` (tên file, trạng thái, thời điểm), `ai_cost_today` |
| Câu bị báo lỗi (PRC18) | `question_id`, `sense` (lemma, loại từ), câu, `reason_code`, `note` (≤ 300 ký tự), `report_count`, `status` (`hidden`/`active`/`removed`), `prompt_version`, thời điểm báo |
| Dạng bất quy tắc (PRC7) | `lemma`, `forms[]` (vd `went`, `gone`), người thêm, thời điểm |
| Cấp quyền/lượt (ER2, ER10) | `user_email`, `feature`, `source` (`trial`/`subscription`/`admin_grant`), `units`, `reason`, `starts_at`, `expires_at`, `granted_by`, `revoked_at` |
| Cài đặt AI (ER14, ER9) | `ai_enabled`, `daily_budget_usd`, `spent_today_usd`, hạn mức theo feature |
| Chi phí AI (AR6) | `operation_id`, `type`, `provider`, `model`, `prompt_version`, `tokens_in`, `tokens_out`, `cost`, `latency_ms`, `status`, `attempt` (không lưu prompt/phản hồi) |
| Người dùng | `email`, `email_verified`, `staff_role`, `native_language`, `created_at`, trạng thái |

## 5. Tham khảo phong cách: Sneat (bản free)

Đo bằng DOM thật ngày 14/10/2026 (trình duyệt tích hợp, 1440×900):
https://demos.themeselection.com/sneat-bootstrap-html-admin-template-free/html/

| Thuộc tính | Sneat | Admin hiện tại (Figma đã duyệt) |
|---|---|---|
| Nền trang | `#f5f5f9` (xám tím rất nhạt) | `#faf8f5` (kem ấm của landing) |
| Sidebar | trắng, rộng 260px, đổ bóng nhẹ `0 2px 6px rgba(34,48,62,.08)`, không viền | trắng, `14–16rem`, viền phải |
| Nhóm menu | tiêu đề nhóm IN HOA 13px màu xám ("APPS & PAGES") | không có nhóm |
| Mục menu | cao 42px, chữ 15px, bo 6px; mục đang chọn nền tím nhạt `#e7e7ff` + chữ tím `#696cff` | tương tự (nền primary nhạt) |
| Thanh trên | **tách rời**: một thẻ trắng nổi, cách mép 16px, bo 6px, đổ bóng, cao 64px, có ô tìm kiếm | thanh dính sát mép, cao `3.5rem`, viền dưới |
| Thẻ (card) | không viền, bo 6px, bóng `0 3px 8px rgba(34,48,62,.1)`, padding 24px, tiêu đề thẻ 18px/500 | viền mảnh, bo `0.75rem` |
| Bảng | đầu cột IN HOA 13px/500, hàng cao ~50px, chữ 15px, padding ô 20px ngang | đầu cột chữ thường 14px |
| Badge trạng thái | nền nhạt cùng tông + chữ đậm màu (vd tím nhạt/tím), bo 4px | tương tự |
| Màu chính | `#696cff` (tím) | `#2f5bea` (xanh landing) |
| Font | Public Sans 15px | Be Vietnam Pro 14px (`0.875rem`) |
| Dashboard | lưới thẻ số liệu (KPI) + biểu đồ | chưa có (D22) |

**Lấy ý tưởng được (không chép code/asset):** nền xám nhạt để thẻ trắng nổi lên; sidebar có nhóm menu IN HOA; thanh trên dạng
thẻ nổi; thẻ không viền dùng bóng mềm; đầu cột bảng IN HOA nhỏ; dashboard dạng lưới thẻ số liệu. **Cần chủ dự án quyết:** giữ màu
xanh + font của landing (đồng bộ thương hiệu Wordmet) hay theo tông tím của Sneat; bo góc 6px của Sneat hay giữ bo lớn hơn.
