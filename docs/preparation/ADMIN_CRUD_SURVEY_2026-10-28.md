# Khảo sát thao tác Tạo / Đọc / Sửa / Xóa của admin (28/10/2026, cập nhật sau PR #169)

Câu hỏi của chủ dự án: các trang quản lý chỉ thấy tạo và đọc, chưa thấy sửa và xóa. Bản này đối chiếu **từng trang admin** với **API** để biết
thiếu ở đâu: màn hình chưa làm, hay API chưa có.

**Cập nhật 28/10/2026:** bản đầu viết trước [#169](https://github.com/quangtienngo661/english-flashcard/pull/169) (đã merge vào `dev`). #169 làm cả bốn việc đầu của mục 4 cũ:
sửa và xóa Nguồn, dừng và xóa lần chạy Bộ ví dụ, dừng lô xuất bản, xóa từ chưa ai dùng. Bảng ở mục 1 và mục 2, 4 đã sửa theo code trên `dev`.

## Cách khảo sát (và giới hạn)

- Màn nào gọi API ghi nào: `grep` các lời gọi `api.post / put / patch / delete` trong `apps/admin/src/features/*/*-api.ts`, rồi tìm màn dùng từng hàm.
  Tất cả hàm ghi trong admin đều có ít nhất một màn dùng, nên **không có API ghi nào bị admin bỏ quên**, trừ hai route chỉ-đọc/một lần nêu ở mục 3.
- API có gì: liệt kê `@Get / @Post / @Put / @Patch / @Delete` của mọi controller `admin/*` trong `apps/api/src`.
- Chưa làm: mở từng màn trong trình duyệt để xem nút có hiện hay không; không kiểm nút nào bị ẩn theo vai trò (`admin` hay `editor`).
- Lần cập nhật sau #169 chỉ đối chiếu lại các dòng đã đổi (Nguồn, Lần chạy của Bộ ví dụ, Lô xuất bản, Từ, Người dùng), bằng cách đọc `sources.controller.ts`,
  `sources.service.ts`, `admin-ai-eval.controller.ts`, `eval-runs.service.ts`, `publish-jobs.controller.ts`, `publish-jobs.service.ts`, `admin-entries.controller.ts`,
  `entry-delete.service.ts`, `entry-usage.probe.ts` và các màn `apps/admin/src/features/{sources,ai,publish-jobs,words,users}`. Các dòng còn lại giữ như bản đầu.

## 1. Bảng theo trang

Ký hiệu: ✔ có trên màn hình · — không có (kể cả API) · ◐ có dạng "mềm" (không xóa hẳn, chỉ gỡ/lưu trữ/tắt/thu hồi/dừng).

| Trang | Tạo | Đọc | Sửa | Xóa | Ghi chú |
|---|---|---|---|---|---|
| Từ `/words` | ✔ dán danh sách | ✔ | ✔ dạng viết, mức độ, từ chức năng | ✔ "Xóa từ", chỉ từ chưa từng publish và chưa ai dùng | Không sửa được chữ của từ. Bị chặn (409 `entry-in-use`, màn nêu từng lý do): từ nằm trong lô nhập chưa hoàn tác, trong báo cáo của một lô xuất bản (kể cả lô đã xong), có dữ liệu học hoặc luyện tập trỏ tới |
| Nghĩa `/senses` | ✔ thêm nghĩa | ✔ | ✔ sửa bản nháp | ◐ ngừng xuất bản, gỡ (`retire`) | Trạng thái nghĩa: `open`, `unpublished`, `retired` |
| Chủ đề `/topics` | ✔ | ✔ | ✔ kể cả lưu trữ và dùng lại | ◐ lưu trữ | Không có xóa hẳn |
| Lô nhập `/uploads` | ✔ tải CSV | ✔ | — | ◐ hoàn tác (`revert`) | Không sửa lô đã nhập |
| Lô xuất bản `/publish-jobs` | ✔ | ✔ | — | ◐ "Dừng lô", chỉ lô đang xếp hàng hoặc đang chạy | Nghĩa đã publish giữ nguyên, lô đã dừng không chạy tiếp được. Lô đã kết thúc: không dừng, không xóa |
| Xuất CSV `/export` | | ✔ | | | Chỉ tải về |
| Nguồn `/sources` | ✔ | ✔ | ✔ tên, phiên bản, link, giấy phép, ghi công (`attribution`), thứ tự hiển thị | ✔ chỉ khi chưa mức độ từ, lô nhập hay khóa dòng nhập nào dùng nguồn đó | Nguồn `owner` và nguồn AGID có sẵn được bảo vệ (409 `source-protected`, API trả `protected: true`, màn không hiện nút ở dòng đó). Loại nguồn không đổi được |
| Dạng chia lạ `/unknown-forms` | ✔ chấp nhận | ✔ | — | ✔ bỏ qua / hoàn tác | |
| Báo lỗi `/reports` | | ✔ | ✔ xử lý (`resolve`) | — | Người học tạo báo lỗi, admin chỉ xử lý |
| Lý do báo lỗi `/report-reasons` | ✔ | ✔ | ✔ kể cả tắt | ◐ tắt | Code ghi rõ "never deleted, only turned off" |
| Trả lượt `/refunds` | | ✔ | | | Chỉ đọc |
| Người dùng `/users` | ✔ [Tạo người dùng] (cũng tạo được ở trang Nhân sự) | ✔ | ✔ sửa, khóa/mở khóa, đặt lại mật khẩu | — | Xóa tài khoản là Bước 8, chưa làm |
| Cấp gói `/entitlements` | ✔ | ✔ | ✔ sửa ngày | ◐ thu hồi | |
| Giao dịch `/transactions` | | ✔ | | | Chỉ đọc |
| AI › Model `/ai/models` | ✔ | ✔ | ✔ (và làm mới) | ✔ | **Đủ bốn thao tác** |
| AI › Thao tác `/ai/operations` | — | ✔ | ✔ | — | Sáu thao tác AI cố định |
| AI › Prompt `/ai/prompts` | | ✔ | ✔ lưu bản mới | — | Lịch sử bản chỉ thêm, không xóa |
| AI › Bộ ví dụ `/ai/eval` (ví dụ) | ✔ một hoặc hàng loạt | ✔ | ✔ | ✔ | **Đủ bốn thao tác** |
| AI › Bộ ví dụ (lần chạy) | ✔ | ✔ | — | ✔ xóa lần đã xong hoặc lỗi · ◐ "Dừng lần chạy" lần đang xếp hàng hoặc đang chạy | Lần chạy đã dừng hiện "Đã dừng" (lưu là lỗi với `error = 'cancelled'`). Xóa lần chạy không đổi báo cáo chi phí, vì chi phí đọc từ `ai_calls` |
| AI › Tình trạng, Chi phí, Lần gọi | | ✔ | | | Chỉ đọc |
| Dashboard `/dashboard` | | ✔ | | | Chỉ đọc |
| Cài đặt `/settings` | | ✔ | ✔ | | Có lịch sử thay đổi |
| Nhân sự `/staff` | ✔ tạo tài khoản | ✔ | ✔ cấp / bỏ vai trò | — | |

## 2. Nhận xét (sau #169)

- **Màn hình không thiếu nút so với API.** Mỗi chỗ còn "—" ở bảng là chỗ **API chưa có endpoint**, hoặc cố ý làm "mềm" (gỡ, lưu trữ, tắt, thu hồi, dừng).
- **Đã có sau #169:** Nguồn (sửa, xóa), lần chạy của Bộ ví dụ (dừng, xóa), Lô xuất bản (dừng), Từ (xóa). Nguồn, Lô xuất bản và lần chạy không còn nằm trong nhóm "thiếu cả API" của bản đầu.
- **Còn chỉ có tạo và đọc (chưa có API sửa hoặc xóa):** Lô nhập (chỉ hoàn tác, không sửa); Lô xuất bản (chỉ dừng, không sửa, lô đã kết thúc không xóa);
  lần chạy của Bộ ví dụ (không sửa).
- **Còn có sửa nhưng chưa có xóa, và chưa có API xóa:** Báo lỗi (người học tạo, admin chỉ xử lý), Prompt (lịch sử chỉ thêm), Người dùng (Bước 8). Trang Nhân sự cũng
  không xóa, chỉ bỏ vai trò.
- **Trang "mềm":** Nghĩa, Chủ đề, Lý do báo lỗi, Cấp gói, Lô nhập, và từ #169 thêm Lô xuất bản (dừng). Dữ liệu này được người học hoặc
  dữ liệu khác tham chiếu nên không xóa hẳn; cách làm hiện tại là có chủ ý ở ít nhất Lý do báo lỗi (ghi trong code). Với Nghĩa, Chủ đề, Cấp gói, Lô nhập mình thấy dấu hiệu đó
  trong code (trạng thái `retired`, `archived_at`, thu hồi, hoàn tác) nhưng **chưa đọc design để xác nhận lý do**.

## 3. API có nhưng admin không gọi

(Kiểm lại 28/10/2026 sau #169: `grep` `backfill` và `entitlements/users` trong `apps/admin/src` không ra lời gọi nào, nên hai mục vẫn đúng. Đối chứng: cùng kiểu `grep` tìm
`api.post / put / patch / delete` ra 50 lời gọi trong các file `*-api.ts`.)

- `POST /v1/admin/content/inflections/backfill` và `GET .../backfill/:id`: chạy lại bảng dạng chia một lần, chỉ gọi tay.
- `GET /v1/admin/entitlements/users/:user_id`: ảnh chụp gói của một người học; màn Cấp gói dùng `lookup` thay cho nó.

## 4. Đề xuất ở bản đầu và kết quả

| # | Đề xuất (bản đầu) | Kết quả |
|---|---|---|
| 1 | **Sửa Nguồn.** Xóa chỉ cho nguồn chưa ai dùng | ✅ #169: `PATCH` và `DELETE /v1/admin/content/sources/:id`; hộp thoại Sửa và Xóa ở mỗi dòng; nguồn `owner` và AGID được bảo vệ |
| 2 | **Xóa lần chạy Bộ ví dụ** và hủy lần chạy đang xếp hàng | ✅ #169: `POST .../ai/eval/runs/:id/cancel` và `DELETE .../runs/:id`; nút trong panel của lần chạy |
| 3 | **Hủy lô xuất bản đang chạy** (cần chốt xử lý phần đã xuất bản dở) | ✅ #169: `POST .../senses/publish-jobs/:id/cancel`. Cách xử lý đang có trong code: nghĩa đã publish giữ nguyên, không hoàn tác, lô không chạy tiếp được |
| 4 | **Xóa từ** chưa có nghĩa nào đã xuất bản và chưa người học nào dùng | ✅ #169: `DELETE /v1/admin/content/entries/:id`; mục "Xóa từ" ở menu Thao tác của từng từ |
| 5 | **Xóa tài khoản người dùng** | ⬜ Vẫn thuộc Bước 8 (kèm danh sách dữ liệu phải xóa theo, design Bước 7 §19). Không làm riêng |

**Chưa kiểm sau #169** (theo mô tả PR): worker thật dừng gọi AI giữa chừng trên Redis và BullMQ thật; dừng lô đang chạy với worker thật trên DB dev; các hộp thoại mới trong
trình duyệt thật.

Cần chủ dự án quyết: trang nào còn lại thật sự cần **xóa hẳn** (Báo lỗi, Prompt, lô xuất bản đã kết thúc, lô nhập), trang nào chỉ cần "gỡ / lưu trữ / dừng" như hiện nay.
