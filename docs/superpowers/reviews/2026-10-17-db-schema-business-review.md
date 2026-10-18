# Rà nghiệp vụ schema DB — 17/10/2026

**Trạng thái:** để xử lý **sau khi xong Bước 3** (chủ dự án, 17/10/2026). Chưa có quyết định nào được chốt; chưa sửa code.

**Nhãn:** **Ý chủ dự án** = câu trả lời của chủ dự án trong chat. **Đề xuất** = ý của trợ lý, chưa được duyệt. **`ASSUMPTION`** =
chưa kiểm chứng.

## 1. Bối cảnh

Chủ dự án xem sơ đồ các bảng và nêu: `users` chỉ có email, vai trò, múi giờ… mà **thiếu họ tên và ngày sinh**, coi đây là lỗi
thiết kế nghiệp vụ; yêu cầu rà các bảng khác xem có thiếu cột cần thiết không.

Phạm vi đã rà (17/10/2026):

- 26 bảng trong `apps/api/prisma/models/*.prisma`: Identity 7, Content 9, Pipeline 8, dùng chung 2.
- Đối chiếu với spec (`docs/specs/`), design Bước 1 §3 (`docs/superpowers/specs/2026-10-07-buoc-1-identity-core-design.md`),
  design Bước 2 §4 (`docs/superpowers/specs/2026-10-12-buoc-2-content-pipeline-design.md`) và code trong `apps/api/src`.
- DB Postgres local (container `english-learning-postgres-1`): 8/8 migration đã chạy, đúng 26 bảng như schema.

## 2. Kết luận chung

Schema **khớp design Bước 1 §3 và Bước 2 §4 gần như 1:1**: không có cột nào design yêu cầu mà code thiếu. Các điểm dưới đây
là chỗ **design/spec chưa tính tới** so với nghiệp vụ hiện tại, không phải code làm sai design. Sửa chúng là đổi phạm vi, nên
theo Working Rules phải có design + plan được duyệt trước khi code.

| # | Điểm | Loại | Nên xong trước pilot? |
|---|---|---|---|
| DB1 | `users` không có họ tên, ngày sinh | Chủ động giới hạn (IR21), chủ dự án muốn đổi | Tùy quyết định |
| DB2 | Không biết ai đã review / publish / gỡ / retire một nghĩa | Thiếu thật | Có, nếu pilot có hơn một staff soạn nội dung |
| DB3 | Đăng ký tài khoản không lưu việc đồng ý điều khoản, chính sách (và tuổi tối thiểu) | Thiếu thật | Có |

## 3. DB1 — `users` không có họ tên, ngày sinh

**Sự thật đã kiểm:**

- Spec Identity IR21 "Dữ liệu tối thiểu" (`docs/specs/module-spec-identity-access.md:73`): chỉ lưu email, hash mật khẩu, danh
  tính, chuỗi phiên, hash OTP, hồ sơ, vai trò. "Hồ sơ" theo IR16 (dòng 68) chỉ gồm tiếng mẹ đẻ và múi giờ.
- Design Bước 1 §3 (dòng 81–83) liệt kê cột `users` đúng như đang có. `GET /v1/me` trả `id, email, email_verified,
  native_language, timezone, staff_role, permissions` (dòng 263) — không có tên.
- Không spec hay design nào nhắc tới họ tên, tên hiển thị hay ngày sinh (grep `docs/` 17/10/2026).
- Tuổi tối thiểu: `docs/preparation/LEGAL_PAGES_RESEARCH_2026-10-11.md:159` (Q2) đề xuất **16+ cho pilot**, trạng thái
  "đề xuất, cần đối chiếu Điều 24" — **chưa chốt**.

→ Không phải bị sót: spec chủ động giới hạn dữ liệu cá nhân. Thêm cột là đổi phạm vi.

**Ý chủ dự án (17/10/2026):** thiếu họ tên và ngày sinh là lỗi nghiệp vụ; muốn có cả hai.

**Đề xuất của trợ lý (sau khi chủ dự án trả lời):**

- **Đồng ý** thêm **tên hiển thị**, để tùy chọn. Lý do: màn admin hiện chỉ nhận diện người bằng email (danh sách staff, cấp
  vai trò); app học cần tên để chào người dùng.
- **Khác ý** ở **ngày sinh đầy đủ**. Lý do: dữ liệu cá nhân nhạy hơn, chưa có nghiệp vụ nào dùng tới ngoài chặn tuổi tối
  thiểu. Việc đó làm được bằng một ô "tôi đủ 16 tuổi" lúc đăng ký và lưu thời điểm xác nhận (gộp với DB3).
  `ASSUMPTION`: chưa đọc luật để biết cách này đã đủ chưa.

**Câu còn mở:** chủ dự án chọn: (a) thêm họ tên + ngày sinh; (b) tên hiển thị + xác nhận đủ tuổi; (c) hướng khác.

**Chạm tới khi làm:** `users` (Identity), `POST /v1/auth/register`, `GET/PATCH /v1/me`, `IdentityService.getProfile`,
màn admin (danh sách staff, tìm user), IR21/IR16 (spec chỉ là khung ban đầu, không bắt buộc sửa theo — design doc mới là bản
chính thức).

## 4. DB2 — Không biết ai đã review / publish / gỡ / retire một nghĩa

**Sự thật đã kiểm (17/10/2026):**

| Thao tác | Lưu người làm? | Bằng chứng |
|---|---|---|
| Tạo/sửa nháp (UI, CSV) | Có: `sense_revisions.created_by` | `apps/api/src/content/senses/senses.service.ts:43` |
| Publish nhanh (sửa + publish một bước) | Có, gián tiếp: revision mới mang `created_by` | `admin-publish.controller.ts:66` |
| Publish hàng loạt qua job | Có: `background_jobs.created_by` + `publish_job_items` | bảng Pipeline |
| **Publish** (`POST admin/content/senses/publish`) | **Không**: nhận người làm nhưng bỏ đi | `apps/api/src/content/senses/publish.service.ts:48` (`_actorId`) |
| **Review** (đánh dấu `reviewed`) | **Không**: không nhận người làm | `apps/api/src/content/senses/admin-senses.controller.ts:96` |
| **Unpublish, retire** | **Không**: không nhận người làm | `apps/api/src/content/senses/admin-publish.controller.ts:43`, `:51` |

- Thời điểm: `sense_revisions` có `published_at` nhưng **không có thời điểm review**; `senses` không có thời điểm gỡ/retire.
- Log: module Content không có lời gọi `logger.info/warn/error` nào (grep `apps/api/src/content`, bỏ `*.spec.ts`). Đối chiếu:
  đổi vai trò thì có log `staff_role_changed` kèm `actor_id` (`apps/api/src/identity/staff/staff.service.ts:129`).

**Nguyên nhân:** spec Content viết khi chỉ có một owner duyệt (K1), nên "ai publish" luôn là owner. Bước 1 (D6) thêm hai vai
trò `admin` và `editor`, nhưng mô hình dữ liệu Content không được cập nhật theo.

**Hệ quả:** khi có hơn một staff, một nghĩa sai đã publish hoặc bị gỡ không truy được ai làm, lúc nào.

**Hướng có thể (liệt kê, chưa chọn; chủ dự án trả lời trước theo luật Bước 3):** cột người làm + thời điểm trên
`sense_revisions`/`senses`; một bảng lịch sử thao tác riêng; hoặc chỉ ghi log có `actor_id`.

## 5. DB3 — Đăng ký không lưu việc đồng ý điều khoản, chính sách

**Sự thật đã kiểm:**

- Body đăng ký chỉ có `email, password, timezone, client, device_label` (`apps/api/src/identity/auth/auth.schemas.ts:3–10`);
  `users` không có cột đồng ý nào.
- Form waitlist của landing thì có ô tick đồng ý bắt buộc (W4, UB4); thời điểm đăng ký waitlist = thời điểm đồng ý.
- `LEGAL_PAGES_RESEARCH_2026-10-11.md` dòng 117 và 129 cần mục "Trẻ em / tuổi tối thiểu" và "Điều kiện sử dụng" cho app.

`ASSUMPTION`: chưa đọc luật (91/2025/QH15, Nghị định 356/2025) để biết phải lưu bằng chứng đồng ý ở mức nào (thời điểm, phiên
bản văn bản…).

**Hướng có thể (chưa chọn):** cột thời điểm đồng ý + phiên bản văn bản trên `users`; bảng lịch sử đồng ý riêng (khi chính sách
đổi phiên bản); gộp với xác nhận tuổi ở DB1.

## 6. Trông như thiếu nhưng đã hẹn bước sau (không phải lỗi)

| Thiếu | Hẹn ở | Nguồn |
|---|---|---|
| `entries.scope`, `owner_user_id` (từ riêng tư) | Bước 3 | Design Bước 2 §4 dòng 102 |
| Câu ngữ cảnh của người học | Bước 3 | Design Bước 2 §3 |
| Bảng danh tính Google | Bước 8 | Design Bước 1 §3 dòng 85 |
| `users.status = 'deleting'` (xóa tài khoản) | Bước 8 | Design Bước 1 §3 dòng 82 |
| Bảng Learning, Practice, Entitlements, AI | Bước 3–7 | Thứ tự xây dựng, HANDOFF §2 |
| Phát âm, âm thanh | Ngoài V1 | `module-spec-vocabulary-content.md:29` |

## 7. Khi quay lại

- Đọc lại mục 2–5; kiểm lại các dòng code đã dẫn (Bước 3 có thể đã sửa các file đó).
- Hỏi chủ dự án từng câu một (DB1 → DB2 → DB3), chủ dự án trả lời trước, trợ lý đề xuất sau.
- DB2 và DB3 nên xong **trước pilot** nếu pilot có người dùng thật và hơn một staff; thứ tự Bước 3 → Deploy → pilot chưa chốt
  (Q-A trong `docs/preparation/PROJECT_ASSESSMENT_2026-10-15.md`).
- Viết design + plan cho phần đổi, rồi mới code.
