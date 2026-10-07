# Handoff — bắt đầu bước 0 (nền backend)

Ngày: 05/10/2026. Viết để một phiên Claude mới, chạy từ thư mục `english-learning/`, làm tiếp mà không cần
lịch sử chat. Mọi số liệu trong file này đã được đọc hoặc chạy lại trong phiên viết nó; chỗ nào chưa kiểm
thì ghi `ASSUMPTION`.

## 1. Đã có gì

- **8 spec V1** ở [`specs/`](specs/README.md): System + 7 module (Identity, Vocabulary Content, Learning,
  Content Pipeline, Entitlements, AI Integration, Practice). Đã qua một vòng kiểm chứng độc lập (Opus, 58
  phát hiện, đã xử lý) và một vòng tự kiểm. Chưa ai ngoài tác giả đọc lại bản đã sửa. README vẫn ghi
  "chờ bạn duyệt"; chủ dự án đã nói "giữ thứ tự này, bắt đầu bước 0", tức là chấp nhận hướng đi.
- **Quyết định**: [`specs/DECISIONS_2026-10-04.md`](specs/DECISIONS_2026-10-04.md) (K1–K25, N1–N13, mục 9 là chỗ
  spec tinh chỉnh quyết định). Mặc định F1–F44 ở `specs/SPEC_PLAN_AND_DECISIONS_2026-10-04.md`.
- **Dữ liệu chạy của đợt spec**: `tasks/v1-specs/` (research R1–R48, verification, citation-sweep).
- **Chưa có code, chưa có git repo.** Thư mục chỉ có `docs/`.
- **Máy** (đã chạy `-v` trong phiên này): Node 24.11.0, pnpm 11.6.0, Docker client 28.5.1; **không có `psql`**.
  `ASSUMPTION`: Docker daemon đang chạy (mới kiểm client).

## 2. Thứ tự thực hiện (chủ dự án đã chốt "giữ thứ tự này")

| Bước | Làm gì | Spec |
|---|---|---|
| 0 | Nền: scaffold, Docker + Postgres, Problem Details, phân trang, `Idempotency-Key`, ID, log, khung test | System |
| 1 | Đăng ký, đăng nhập email + mật khẩu, OTP xác minh, phiên (access + refresh), hồ sơ, vai trò admin | Identity (lõi) |
| 2 | Catalog, import CEFR-J + Octanove, CSV soạn nội dung, publish, tìm kiếm, từ riêng tư | Content + Pipeline |
| 3 | Nhóm, trạng thái, lịch ôn, "hôm nay", flashcard, thêm nhanh (catalog + nhập tay). **Mốc pilot sớm nhất** (cần web) | Learning |
| 4 | Trắc nghiệm, đúng/sai, gõ từ, bài từ câu người học, "từ hay sai" | Practice (không AI) |
| 5 | Quyền, trial, giữ chỗ hạn mức | Entitlements |
| 6 | Cổng `AiProvider` (bản giả trước), nhật ký chi phí | AI Integration |
| 7 | Bài điền từ AI, ngân hàng câu, bước AI trong chuỗi tra nghĩa | Practice (AI) + Content |
| 8 | Google login, quên mật khẩu, xóa tài khoản | Identity (còn lại) |

K18 (cấu trúc hạn mức AI) chỉ chặn từ bước 5; provider từ điển ngoài (K20) không chặn bước 0–7 nếu chuỗi tra nghĩa
chỉ gồm catalog + nhập tay.

## 3. Cách làm việc chủ dự án muốn

- **Dùng skill của superpowers** (`brainstorming` → `writing-plans` → `test-driven-development`…), **không** dùng
  workflow của harness alsp (`build-feature`, `write-spec`, `fix-request`…).
- **Chưa viết code, chưa scaffold, chưa cài dependency** cho đến khi chủ dự án duyệt design doc và plan. Đọc
  thì được.
- **Không commit, không push** nếu không được yêu cầu. Thư mục chưa là git repo; `git init` là quyết định của
  chủ dự án (xem mục 5). Brainstorming mặc định đòi commit design doc: bỏ qua bước đó, chỉ lưu file.
- Báo cáo **ngắn, đủ để quyết định**; tiếng Việt, **giữ thuật ngữ tiếng Anh** (`endpoint`, `deploy`, `rollback`).
  Gắn nhãn: chủ dự án chốt / đề xuất / `ASSUMPTION`. Hỏi **từng câu một**, kèm đề xuất.
- Trước khi khẳng định một sự thật về thư viện hay phiên bản: đọc docs (context7) hoặc chạy thử trong phiên
  đó. Không dựa vào trí nhớ.

## 4. Bước 0: mục tiêu và phần đã đủ cơ sở

Mục tiêu: dựng nền để bước 1–8 cắm vào mà không phải sửa quy ước chung. Xong khi có một endpoint mẫu chạy đủ
các quy ước dưới đây và test chạy được trên Postgres thật bằng một lệnh.

Đã chốt trong [`specs/system-spec.md`](specs/system-spec.md): NestJS modular monolith + PostgreSQL (K2/PROJECT_CONTEXT);
UUID mờ, ID sense không tái dùng (SR2); tiền tố `/v1`, chỉ thêm không đổi nghĩa (SR7); Problem Details RFC 9457
với `type, status, title, detail, instance, operation_id` (SR7, S1); phân trang `page_size` mặc định 20 tối đa 100
và `page_token` mờ, token hỏng trả 400 (SR7, S2, S3); `Idempotency-Key` theo user + endpoint, lưu ≥ 24 h, thành
công/lỗi vĩnh viễn → trả kết quả cũ, lỗi tạm → giải phóng key, đang chạy → 409, khác nội dung → từ chối
(SR8, S4, S5, S15, S16, SE2); log có `operation_id`, không chứa mật khẩu/OTP/token/đáp án thô/câu ngữ cảnh
(SR10, S13); thời gian lưu UTC (SR13); rate limit ghi theo user, 429 kèm thời gian chờ (SR14).

## 5. Quyết định còn mở của bước 0 (từng câu một; mình đề xuất, chưa ai chốt)

1. **Repo layout.** (a) Một repo, pnpm workspace: `apps/api` giờ, sau này `apps/web`, `packages/*`, Flutter ở
   `apps/mobile` ngoài workspace; `docs/` ở gốc. (b) Nhiều repo. (c) Chỉ repo backend bây giờ.
   Đề xuất: **(a)** vì solo dev, một chỗ chạy test, một lịch sử, spec cùng repo. Kèm câu hỏi: `git init` ở gốc?
2. **ORM / DB access** (NestJS + Postgres). Cần: transaction, khóa dòng (`FOR UPDATE`, `SKIP LOCKED` cho SR8,
   PR12, sổ lượt ER5), ràng buộc unique, migration, keyset pagination. Chưa so sánh Prisma / Drizzle / Kysely /
   TypeORM / MikroORM. `ASSUMPTION`: thiên về lớp gần SQL vì các rule trên dựa vào khóa dòng và ràng buộc — cần
   đọc docs hiện hành trước khi đề xuất thật.
3. **Chiến lược test.** Jest (mặc định của Nest) hay Vitest; DB test là Postgres thật (Testcontainers hay
   `docker compose`) hay mock. Đề xuất `ASSUMPTION`: **Postgres thật**, vì các tiêu chí S4, S5, S15, S16 phụ
   thuộc hành vi khóa và unique của DB, mock sẽ chứng minh sai thứ.
4. **Ranh giới bước 0 và bước 1.** Idempotency và rate limit gắn theo **user** (SR8, SR14), mà user tới từ
   Identity ở bước 1. Hướng: bước 0 có một seam `RequestUser` (bản giả để test), bước 1 thay bằng JWT thật.
   Đề xuất: bước 0 làm S1–S5, S13, S15, S16, SE2 và SR14 trên seam; S6–S10, S17, SE5 để bước 1+.

Sau 4 câu: trình bày design theo từng phần → ghi design doc (nên là `docs/superpowers/specs/2026-10-05-buoc-0-design.md`) →
tự soát → chủ dự án duyệt → `writing-plans`.

## 6. Còn mở ngoài bước 0 (không chặn bước 0)

K18 (hạn mức AI, chủ dự án đang research); provider từ điển ngoài (K20); nguồn dữ liệu biến cách/lemma (CR16,
PRC7); Gmail cá nhân làm SMTP chưa xác minh; mọi con số năng lực/chi phí là ước tính.

## 7. Prompt để dán vào terminal

```
Đọc docs/HANDOFF_2026-10-05_BUOC_0.md, rồi docs/specs/README.md và docs/specs/system-spec.md.
Dùng skill superpowers:brainstorming (không dùng skill của harness alsp) để thiết kế bước 0 (nền backend)
theo mục 4–5 của handoff. Chưa viết code, chưa scaffold, chưa cài dependency; chưa commit.
Hỏi từng câu một, mỗi câu kèm đề xuất và nhãn (chủ dự án chốt / đề xuất / ASSUMPTION), bắt đầu từ
câu 1 (repo layout + git init). Câu 2 và 3 thì đọc docs hiện hành (context7) trước khi đề xuất.
Báo cáo ngắn, tiếng Việt, giữ thuật ngữ tiếng Anh.
```
