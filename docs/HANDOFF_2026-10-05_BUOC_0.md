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

> Trạng thái 07/10/2026: Bước 0 và Bước 1 đã xong và đã merge vào `main` (PR #1, #4, #5). Bước tiếp theo: Bước 2.
> Cập nhật 13/10/2026: Bước 2 đã xong trên `feat/buoc-2-m2-pipeline`/`feat/buoc-2-m3-finish` (chi tiết ở
> `docs/deliveries/buoc-2.md`); PR #16 (M1+M2+M3, gộp thay PR #15) đang mở, CI xanh, chờ chủ dự án duyệt merge.
> **Sửa 13/10/2026 theo design Bước 2 (D1, D9, mục 15):** phạm vi Bước 2 thực tế hẹp hơn dòng cũ của bảng dưới —
> chỉ phía quản trị (nhập CSV, soạn, publish, hoàn tác, xuất) và tìm kiếm/duyệt **chỉ-đọc** cho learner; **từ
> riêng tư, câu ngữ cảnh, chuỗi tra nghĩa dời hết sang Bước 3** (đã chốt từ lúc duyệt design Bước 2, 12/10/2026,
> nhưng bảng dưới và `CLAUDE.md` chưa được sửa theo tới hôm nay). Chủ dự án cũng đã chốt (D9) chèn thêm
> **Bước 2.5 — giao diện web (đăng nhập, trang admin, cấp vai trò) ngay sau Bước 2, trước Bước 3**.
> **Cập nhật 15/10/2026:** Bước 2 (PR #16) và **Bước 2.5 đã xong, nằm trên `dev`** — M1 backend #17, M2 khung admin #18,
> M3 luồng CSV + e2e API thật + sửa giao diện #19, docs #20; đủ 3 tiêu chí "Xong khi" (CI xanh gồm `admin-e2e-real`, chạy
> tay trên DB mới với file CEFR-J thật). As-built: `docs/deliveries/buoc-2-5.md`. Chưa lên `main` (PR `dev` → `main` chỉ mở
> khi chủ dự án yêu cầu). Chủ dự án dự kiến refactor lại toàn bộ giao diện admin sau.
> **Tiếp theo: Bước 3** (Learning, mốc pilot sớm nhất), bắt đầu bằng `superpowers:brainstorming`. Trước pilot Bước 3 cần
> bước "Deploy API + admin"; **chưa chốt** làm trước hay sau Bước 3 — hỏi chủ dự án.

| Bước | Làm gì | Spec |
|---|---|---|
| 0 | Nền: scaffold, Docker + Postgres, Problem Details, phân trang, `Idempotency-Key`, ID, log, khung test | System |
| 1 | Đăng ký, đăng nhập email + mật khẩu, OTP xác minh, phiên (access + refresh), hồ sơ, vai trò `admin`/`editor`, **đổi và quên mật khẩu** (chuyển từ Bước 8, D1) | Identity (lõi) |
| 2 | Catalog (quản trị: nhập CSV, soạn, rà, publish, hoàn tác, xuất), tìm kiếm/duyệt chỉ-đọc cho learner | Content + Pipeline |
| 2.5 *(mới, D9)* | Giao diện web `apps/admin`: đăng nhập, trang admin, cấp vai trò, luồng CSV. **Xong 15/10/2026, trên `dev` (PR #17–#20)** (design `docs/superpowers/specs/2026-10-14-buoc-2-5-admin-web-design.md`, as-built `docs/deliveries/buoc-2-5.md`) | — |
| Giao diện B *(mới, 15/10)* | Làm mới landing và admin theo hướng B (chủ dự án chọn 15/10/2026): token chung `packages/design-tokens`, Lexend, bài luyện một thẻ. **Landing xong, PR #22**; PR #19 đã merge nên plan admin là việc tiếp theo (design `docs/superpowers/specs/2026-10-15-ui-refresh-b-design.md`, delivery `docs/deliveries/ui-refresh-b.md`) | — |
| Deploy *(mới, chưa xếp chỗ)* | Deploy API + `admin-api.` + `admin.`: chọn hosting backend, Postgres/Redis bền, SMTP thật, secret, backup (design 2.5 §14). Phải xong trước pilot Bước 3 | — |
| 3 | Nhóm, trạng thái, lịch ôn, "hôm nay", flashcard, thêm nhanh (catalog + nhập tay); **cộng phần Content dời từ Bước 2:** từ riêng tư, câu ngữ cảnh, chuỗi tra nghĩa (catalog + tự nhập). **Mốc pilot sớm nhất** (cần web) | Learning + Vocabulary Content (phần còn lại) |
| 4 | Trắc nghiệm, đúng/sai, gõ từ, bài từ câu người học, "từ hay sai" | Practice (không AI) |
| 5 | Quyền, trial, giữ chỗ hạn mức | Entitlements |
| 6 | Cổng `AiProvider` (bản giả trước), nhật ký chi phí | AI Integration |
| 7 | Bài điền từ AI, ngân hàng câu, bước AI trong chuỗi tra nghĩa | Practice (AI) + Content |
| 8 | Google login, xóa tài khoản | Identity (còn lại) |

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

## 8. Prompt cho Bước 2.5 (giao diện web — dán vào phiên mới, 13/10/2026) — đã dùng 14/10/2026, giữ làm lịch sử

```
Đọc CLAUDE.md (mục "Current phase"/"Next" và "Architecture & Key Decisions" — dòng Bước 2.5), rồi
docs/HANDOFF_2026-10-05_BUOC_0.md §2, docs/superpowers/decisions/2026-10-12-buoc-2-content-pipeline-decisions.md
(mục D9), và docs/deliveries/buoc-2.md (mục "Open items"). Dùng skill superpowers:brainstorming (không dùng
skill của harness) để thiết kế Bước 2.5 — giao diện web: đăng nhập, trang admin, cấp vai trò. Bước này đã
được chủ dự án chốt (D9) nằm giữa Bước 2 và Bước 3; chưa có design/plan nào cho nó. Chưa viết code, chưa
scaffold, chưa cài dependency; chưa commit.

Bối cảnh đã xác nhận trong phiên trước (đọc lại source thật trước khi dựa vào, đừng tin lại câu này):
- Backend đã có sẵn API cấp vai trò, không cần code backend mới cho việc này — chỉ cần giao diện gọi API có
  sẵn: apps/api/src/identity/staff/staff.controller.ts (GET admin/users tìm theo email, GET admin/staff danh
  sách, PUT admin/users/:id/staff-role), gác bởi @RequirePermission('roles.manage').
- apps/web hiện tại CHỈ là trang landing tiếp thị (Next.js 16.3.8 App Router, next-intl, Cloudflare Workers +
  D1 cho waitlist) — chưa có app shell đăng nhập nào. Đây là câu hỏi kiến trúc cần đặt ra đầu tiên: mở rộng
  app landing này (thêm route có đăng nhập) hay tách một app web riêng.
- Web client dùng cookie httpOnly `refresh_token` + header bắt buộc `X-CSRF-Protection: 1` khi gọi refresh
  (403 csrf-header-required nếu thiếu) — xem apps/api/src/identity/sessions/session-transport.ts.

Hỏi từng câu một, mỗi câu kèm đề xuất và nhãn (chủ dự án chốt / đề xuất / ASSUMPTION), bắt đầu từ câu kiến
trúc apps/web (mở rộng landing app hay tách app riêng). Báo cáo ngắn, tiếng Việt, giữ thuật ngữ tiếng Anh.
```
