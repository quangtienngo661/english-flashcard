# Chính sách bảo mật và Điều khoản soạn trong admin — as-built (03/11/2026)

Nhánh `feat/legal-documents`, một PR vào `dev`. Chủ dự án chọn làm màn soạn trong admin (admin soạn, lưu từng phiên bản, bấm đăng, không cần deploy) cùng việc hỏi lại
đồng ý khi phiên bản đổi. Nội dung hai văn bản nằm ở nhánh `docs/web-launch-research` (`docs/preparation/legal-drafts/`), chưa vào DB.

## Quyết định (Claude đề xuất, chủ dự án duyệt plan 03/11/2026)

| # | Quyết định | Chọn |
|---|---|---|
| L1 | Phiên bản | Một phiên bản chung cho cả hai trang; người học đồng ý cả hai cùng lúc, DB chỉ lưu một `terms_version` |
| L2 | Định dạng | Markdown (`react-markdown` + `remark-gfm`): không HTML thô, không link `javascript:`, không phải nới CSP |
| L3 | Ngôn ngữ | Tiếng Việt bắt buộc, tiếng Anh tùy chọn; `/en` dùng bản Việt khi trống |
| L4 | Ai soạn, đăng | Chỉ `admin` (`settings.manage`) |
| L5 | Quy trình | Nháp → Đăng; một bản đang đăng; bản cũ thành "đã thay"; muốn quay lại thì tạo nháp sao chép từ bản cũ |
| L6 | Trước lần đăng đầu | Trang hiện "bản nháp", phiên bản lấy từ `TERMS_VERSION`; lần đăng đầu hỏi lại mọi người đã đồng ý |
| L7 | Hỏi lại | Chặn vào app tới khi đồng ý, dùng lại màn `complete-profile` kèm câu "Điều khoản đã được cập nhật" |
| L8 | Web lấy nội dung | Ở server, mỗi lần mở trang, không cache; API lỗi hoặc chưa đăng thì dòng "bản nháp" |

## API (`apps/api`)

- Module `legal`, bảng `legal_versions` (migration `20261103120000_legal_versions`): `number`, `status` (`draft` | `published` | `superseded`, CHECK trong SQL), `row_version`
  (khóa lạc quan), bốn văn bản + ngày có hiệu lực, người tạo, sửa, đăng. Partial unique index `legal_versions_one_published_key` chỉ cho một dòng `published`.
- Admin, quyền `settings.manage`, `/v1/admin/legal/versions`: danh sách, xem một bản, tạo nháp (rỗng, hoặc chép bản đang đăng, hoặc `copy_from`), lưu kèm
  `expected_version` (409 `draft-version-conflict`), xóa nháp, đăng (`expected_version`, 409 `publish-stale`; thiếu `privacy_vi`, `terms_vi` hoặc `effective_date` thì 400
  `validation-failed` kèm tên trường). Bản đã đăng không sửa, không xóa (409 `not-a-draft`). Ghi dùng `Idempotency-Key`.
- Công khai `GET /v1/legal/current`: bản đang đăng, 404 khi chưa có.
- Identity không import Legal (D3): cổng `TermsVersion` (`src/identity/profile/terms-version.ts`), Legal đăng ký nguồn lúc khởi động. Đăng ký, Google sign-up và
  `PATCH /v1/me {accept_terms}` ghi phiên bản đang đăng (số bản, ví dụ `"3"`), chưa có thì `TERMS_VERSION`. Nguồn lỗi không bị nuốt: đăng ký không ghi sai phiên bản.
- `/v1/me` thêm `terms_version` và `terms_outdated` (đã đồng ý, nhưng không phải bản hiện hành).
- Ba cột nhân viên của `legal_versions` khai trong `account-data-map.ts` (`keep-id`).

## Admin (`apps/admin`)

Mục menu thứ 26 "Chính sách & điều khoản" (nhóm Hệ thống, `settings.manage`): `/legal` (danh sách) và `/legal/:id` (trình soạn hai tab, ô tiếng Việt và tiếng Anh, xem trước
Markdown, ô ngày; nút Đăng khóa khi còn thay đổi chưa lưu và hỏi xác nhận; bản đã đăng chỉ đọc, có nút "Tạo nháp từ bản này"). Thêm `react-markdown` 10.1.0 và
`remark-gfm` 4.0.1 (cả admin và web, bản cố định).

## Web (`apps/web`)

`/privacy`, `/terms` đọc `GET /v1/legal/current` (`src/lib/legal.ts`, hết 2,5 giây thì bỏ) và vẽ bằng `LegalDocument`. Địa chỉ API phía server là
`serverApiBaseUrl()` (`app-shell/config.ts`): biến chạy lúc chạy `API_INTERNAL_BASE_URL` nếu có, không thì `NEXT_PUBLIC_API_BASE_URL`. Stack Docker cần biến này
(`http://api:3000`), vì trong container web `localhost:3000` không tới được API; bản đầu thiếu nó nên bấm thử thấy hai trang vẫn là "bản nháp" (sửa 03/11/2026). Trang vẫn `noindex` riêng cho `/terms`.
`RequireSession` và `CompleteProfile` xử lý `terms_outdated`.

Bố cục và mục lục (04/11/2026, `lib/legal-outline.ts`, `LegalDocument`): cột chữ rộng 40rem nằm giữa trang; từ `lg` có thêm cột "Mục lục" dính bên phải, tự lập từ các dòng `##`.
Mọi `##` và `###` có `id` (bỏ dấu, `đ` thành `d`, trùng tên thì thêm `-2`). Danh sách `**Mục lục**` viết tay trong chính văn bản được đổi thành link tới mục cùng tên (bỏ số đứng trước); mục nào
không khớp tên hoặc có dấu `[` `]` thì giữ là chữ. Dưới 1024px không có cột bên phải, chỉ có danh sách viết tay đó; văn bản không có danh sách đó thì trên điện thoại không có mục lục.
Khoảng cách cuộn dùng `scroll-padding-top` có sẵn của `globals.css` (từ `md`), chỉ thêm `scroll-mt-4`.

## Kiểm tra

- API 4063, admin 1341, web 755 test; `tsc`, lint sạch; schema drift rỗng.
- Chạy thật (API + worker + Postgres + Mailpit): 23 kiểm tra qua (đăng, thay bản, người học bị hỏi lại, quyền, 409, DB từ chối hai bản đang đăng); `smoke:buoc-0-3-fixes` qua.
- Trình duyệt: admin tạo, xem trước, lưu, đăng; web đổi bản ngay, bản Anh, chữ `<script>` thành chữ trơ, API tắt thì về "bản nháp".
- Build web thật trong container (`pnpm cf:docker --build`): qua, `assert:static` qua (`/vi`, `/en`), hai trang pháp lý là động, Worker 2.424,96 KiB gzip (app tắt).
- Chưa chạy local: e2e Playwright (CI chạy); bấm thử màn đồng ý lại trong trình duyệt.

## Việc còn lại

Xem mục "Chính sách bảo mật và Điều khoản" ở cuối `deploy-checklist.md`: đặt `NEXT_PUBLIC_API_BASE_URL`, dán nội dung vào admin rồi đăng, thử sau deploy, email báo trước 7 ngày khi đổi điều khoản.
