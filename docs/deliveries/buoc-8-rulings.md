# Bước 8 — các quyết định tự đưa ra khi thực thi và các câu phát sinh (29/10/2026)

Nguồn: phiên thực thi tuần tự (D33) của Claude. Chủ dự án dặn (29/10/2026): không hỏi lại, ghi lại mọi câu phát sinh vào tài liệu, cứ hoàn thành theo plan. Mỗi mục: quyết định — vì sao —
nếu sai thì tốn gì. Các mục này **không** nằm trong D1–D33; chủ dự án đọc và đảo lại được.

## Quyết định (R)

| # | Task | Quyết định | Vì sao | Nếu sai |
|---|---|---|---|---|
| R1 | 2, 3 (P15) | `AccountState` chỉ có `status`, `authMethod`, `revoked`. `PermissionGuard` giữ truy vấn riêng (nay lấy thêm `authMethod`) | 22 controller spec cũ mock `sessionChain.findUnique` cho `PermissionGuard`; dồn `staffRole`/`mustChangePassword` vào reader mới là viết lại cả 22 file vì một phát hiện mức Thấp | Một lần đọc DB nhỏ thừa trên route staff |
| R2 | 5 | `accountDeletedMail(to, retentionYears)` không có ngày trong thân thư (design §14 nói "đã được xóa ngày …") | Chữ ký trong plan không có ngày; header `Date` của thư đã mang ngày | Thêm tham số thứ ba |
| R3 | (công cụ) | Nhiều file nguồn API là CRLF; sửa nhiều dòng bằng script phải chuẩn hóa xuống dòng | Không ảnh hưởng code | — |
| R4 | 6 | Test "mọi cột có chủ" tìm thấy **54** cột trỏ tới người dùng, không phải 53: `users.deleting_by` (cột mới của Bước này) khớp mẫu `*_by`, khai báo `'erase'` (đi cùng hàng `users`) | Khớp mẫu của chính test | — |
| R5 | 10 (D31) | Cờ D31 do `EntitlementsAccountDeletion.turnOffRenewalForAdminDelete` tự ghi (một `UPDATE` dưới khóa `entitlements.user`) nên kiểm "đang gia hạn" của bộ xóa qua ngay trong cùng request. `renewing()` dùng trạng thái *hiệu lực* (`effectiveStatus` với `graceDays`), giống trang Gói của người học | Một nguồn sự thật về "đang gia hạn" | Hai nơi lệch nhau nếu một nơi đổi |
| R6 | 10 | `erase()` đọc settings (`graceDays`) qua client dùng chung khi transaction đang mở | Gọi chỉ đọc, có cache; ghi để kiểm kích thước pool lúc Deploy | Một kết nối thừa trong lúc xóa |
| R7 | 13 | `AccountDeletionService` đọc vai trò của đích trước transaction (gợi ý) để lấy `identity.staff_role` trước; nếu vai trò đổi giữa chừng thì Tx A chạy lại một lần có khóa | Tránh giữ khóa admin cho mọi lần xóa | Một lần thử lại |
| R8 | 13, 14 | Log lỗi của Tx B đi qua `AppLogger.error` với đối tượng lỗi (thông điệp có thể kèm chữ của lỗi DB); chỉ thêm `user_id` | Cần chẩn đoán xóa hỏng | Thông điệp lỗi có thể nêu một giá trị; xem lại lúc Deploy |
| R9 | 14 | Route admin xóa nằm trong `StaffController` (`roles.manage` cấp lớp) và gọi `AccountDeletionRequests`; constructor `StaffService` không đổi | Spec của nó dựng theo vị trí tham số | — |
| R10 | 18 | `GoogleClient.exchange(code, codeVerifier, nonce)` — plan chỉ nêu hai tham số nhưng cũng buộc kiểm nonce | Cần nonce để kiểm ID token | — |
| R11 | 19 | Trang Google giả hiện form HTML nhỏ khi query không có tài khoản (để kiểm trong trình duyệt); test truyền tài khoản qua query | Phục vụ A1 trong test flow | — |
| R12 | 21 | `POST /v1/auth/google/reauth` trả 404 cho tài khoản không có danh tính Google và 409 `google-unavailable` khi Google tắt (design không nêu) | Phải có câu trả lời cho hai trường hợp này | — |
| R13 | (thứ tự, D32) | Chủ dự án **chưa báo** kết quả lần 1 (Google thật) khi tới M5. M5 làm trước các task không phụ thuộc giả định cookie/PKCE (25 dòng cài đặt, 26 luồng xóa, 27 "Hủy gói", 24 trang hoàn tất đăng ký) và để **Task 23** (nút Google và xử lý khi quay về) làm **cuối**, làm tạm | Chủ dự án dặn cứ làm tiếp và ghi lại; giả định chỉ ảnh hưởng Task 23 (và callback của M3 nếu hỏng) | Nếu lần 1 thất bại: làm lại Task 23 và phương án dự phòng §19 cho callback M3 |
| R14 | 32 | `smoke-buoc-8.mjs` **xóa bảng `rate_limit_counters`** đầu mỗi bước và đầu mỗi chuyến Google; từ chối chạy nếu tên database không chứa `smoke` | Giới hạn 5 đăng ký/giờ/IP (`complete` dùng chung luật đăng ký) và 20 lời gọi Google/phút/IP làm một máy chạy smoke bị 429; chính các giới hạn đã có unit test | Smoke không chứng minh được giới hạn tần suất của Google (không phải mục tiêu của nó) |
| R15 | 33 | Tài liệu as-built (buoc-8.md, test flow, rulings, deploy checklist, CLAUDE.md) nằm trên nhánh riêng `docs/buoc-8-as-built`, cắt từ `docs/buoc-8-brainstorm`, PR vào `dev` **sau** m7 | Các nhánh code (m1–m7) không chứa commit của nhánh docs; sửa `buoc-8.md` và `CLAUDE.md` trên m7 sẽ xung đột add/add khi nhánh docs vào `dev` trước | Một PR docs nữa để duyệt |
| R16 | 33 | **Chưa làm** lượt kiểm bằng trình duyệt trên stack Docker có chụp màn (design §17 "Claude chạy thật") | Chủ dự án dặn: xong implement thì tự kiểm sau; cần build lại ảnh Docker của web và admin | Giao diện chỉ được kiểm bằng unit, e2e mock của web (318 ca, `cf:docker`) và admin (e2e mock + 27 ca real); xem "Chưa kiểm" ở `buoc-8.md` |
| R17 | 29 (M6) | Thêm thuộc tính `focusable` cho `PanelBody` (admin) và dùng ở chi tiết người dùng, sửa ở nhánh m6 (commit `fix(admin): give the user detail a tab stop…`) | Hàng "Đăng nhập bằng" mới làm thân panel tràn ở 390 px mà bên trong không có gì focus được → axe `scrollable-region-focusable` đỏ ở `a11y.spec.ts` (mobile, VI và EN). Đỏ thấy trong lần chạy e2e mock đầu, xanh sau sửa (6/6 ca `a11y.spec.ts` mobile) | Một tab stop thêm trên panel đó; các panel khác không đổi |
| R18 | 33 | Sửa `smoke-buoc-7.mjs` (commit `test(api): update smoke 7 for editors reading report reasons`, nhánh m7): editor đọc `GET /v1/admin/practice/report-reasons` nay mong **200** (trước đây 403) và thêm kiểm editor `POST` bị **403** | Lần chạy lại smoke 7 trên nhánh Bước 8 đỏ ở đúng một bước, và nguyên nhân không phải Bước 8: commit `4c2bfc3` của đợt giao diện admin (28/10) cố ý cho editor đọc danh sách lý do báo lỗi (`@RequirePermission('content.edit')` trên `list()`), smoke vẫn chờ 403 | Không có (chỉ test). Bước 7 không được kiểm lại sau 4c2bfc3 cho tới nay |
| R19 | 33 | Chạy smoke 6 và 7 bằng cách **đổi tên tạm** `apps/api/.env` thành `.env.hold-b8` rồi đổi lại ngay khi xong (script `trap`), thay vì đọc hay sửa file | Hai smoke dừng khi file môi trường cục bộ có khóa AI (`OPENAI_API_KEY`; chủ dự án đã gọi AI thật ngày 28/10); cùng cách đã dùng ở các phiên trước | Nếu tiến trình bị giết giữa chừng, file có thể còn ở tên `.env.hold-b8` — đổi lại thành `.env` |

| R20 | 33 | Review cuối nhánh bởi một reviewer độc lập (file `../superpowers/reviews/2026-10-29-buoc-8-final-review.md`): **1 Critical, 3 Important** đã sửa theo TDD (test đỏ rồi xanh), **8 Minor** để lại | Đúng quy trình thực thi plan: Critical/Important vào một đợt sửa, Minor ghi lại, không sửa | Xem mục "Review cuối" bên dưới |

## Review cuối (29/10/2026)

Đã sửa (mỗi cái có test đỏ trước, rồi xanh; commit ở đúng nhánh, các nhánh sau được rebase lại):

| Mã | Lỗi | Sửa | Nhánh |
|---|---|---|---|
| C1 (Critical) | Giá trị niêm phong của Google dùng chung khóa và cùng dạng `{userId}`: "ticket" 2 phút của `/reauth` mở được như cookie bằng chứng `google_reauth` 5 phút → ai cầm access token của tài khoản chỉ có Google xóa được tài khoản mà không qua Google | `sealJson/openJson` nay có tham số mục đích (`oauth-state`, `signup`, `reauth-ticket`, `reauth-proof`) niêm phong bên trong; mục đích khác → `null` | m3 |
| I1 | Hoàn tất đăng ký Google tạo user mới **với id cũ** nếu tài khoản chưa xác nhận bị dọn/xóa đúng lúc đó; sweep rồi xóa dữ liệu người mới 24 giờ và replay xóa cả tài khoản | Nếu hàng đã mất trong transaction → 409 `email-taken` (như đăng ký mật khẩu), không tạo | m3 |
| I2 | Tài khoản kẹt `deleting` vì gói tự gia hạn lại (B8E52) không bao giờ xong: retry hỏng mỗi giờ, nút admin bỏ qua bước tắt gia hạn | Admin xóa chạy bước tắt gia hạn (D31) cả khi đích đang `deleting` | m2 |
| I3 | Web: người chỉ có Google, bằng chứng 5 phút hết hạn → nút Google vẫn bị khóa (`?reauth=ok` còn trong địa chỉ) | Sau `reauth-required` bằng chứng coi là hết hạn: nút Google mở lại, nút đỏ tắt | m5 |

Để lại (Minor, **không sửa**, chủ dự án quyết):
- M1 — `accounts:replay-deletions` không hoàn tất tài khoản khôi phục đang `deleting` với `by=self` (`account-deletion.service.ts:94-96` bỏ qua `mode`); retry hàng giờ xử lý nốt nhưng với `checks: normal`.
- M2 — `next` bị mất ở đường đăng ký Google mới (vé có `next` nhưng `GoogleComplete.tsx` luôn về `/{locale}/app`).
- M3 — Tắt gia hạn D31 từng phần: một gói tắt được, gói kia quá hạn → 409 "chưa xóa" nhưng gói đầu đã bị hủy; và tắt gia hạn xảy ra trước kiểm admin cuối.
- M4 — Admin xóa tài khoản chưa xác nhận email vẫn gửi thư "đã xóa" tới địa chỉ chưa ai xác nhận.
- M5 — `?signed_in=google` bất kỳ trên địa chỉ nào cũng xóa cờ `logout-pending` của FE38.
- M6 — Nút "Xóa tài khoản" vẫn hiện cho admin cuối cùng (API chặn bằng `last-admin`; design §10 nói ẩn).
- M7 — Sweep hàng ghi muộn xử lý cả các lần xóa `by=cleanup` trong 24 giờ (tốn, vô hại).
- M8 — 429 ở `/start` hoặc `/callback` hiện JSON thô thay vì quay về app (20 lần/phút/IP; nhiều người sau cùng một NAT).

Reviewer **không đánh giá được** (cần Deploy hoặc Google thật): cookie sau chuyển trang từ Google và PKCE (N2); `jwtVerify` chưa có `clockTolerance` (thêm vài giây nếu lần chạy thật báo `google-failed` ngẫu nhiên); Google giả là lối vào mọi tài khoản đã xác nhận nếu bật ở môi trường nào nối được ra internet (đã thêm vào `deploy-checklist.md`); yêu cầu xóa kéo dài tới 120 s so với giới hạn của reverse proxy; thứ tự khóa hàng trong các lệnh xóa hàng loạt; `google-round1-account.mjs` không có chốt tên database (chỉ dùng cho DB cục bộ).

## Câu phát sinh còn mở (N)

- **N1** — Hằng cookie Google `reauth` nằm trong `google-auth.controller.ts` và được controller xóa import; nếu có người dùng thứ ba, tách ra một module nhỏ.
- **N2** — Lần 1 và lần 2 Google thật (D32) **chưa chạy**: hai `ASSUMPTION` (cookie `refresh_token` còn sau chuyển trang từ Google; PKCE S256 với client Web có secret) vẫn chưa
  được xác nhận. Smoke đã chứng minh chuỗi chuyển trang với Google giả (callback → cookie → `/refresh` 200) nhưng Google giả không chứng minh được cách trình duyệt thật xử lý cookie
  `SameSite` qua chuyển trang từ `accounts.google.com`. Xem `buoc-8-test-flow.md` mục B2.
- **N3** — Task 23 (nút "Tiếp tục với Google" ở web) làm tạm trước kết quả lần 1 (R13).
- **N4** — Lần chạy đầu của `pnpm cf:docker` (e2e web trong container Linux) chậm ở bước chép repo nhưng cuối cùng xong: 318 ca xanh và `assert:static` qua.
