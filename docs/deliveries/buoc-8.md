# Bước 8 — plan tóm tắt (29/10/2026)

Bước 8 = đăng nhập Google + xóa tài khoản (cộng dọn tài khoản chưa xác nhận, admin xóa người dùng, nút "Hủy gói"). Plan đầy đủ:
[`../superpowers/plans/2026-10-29-buoc-8-identity-remainder.md`](../superpowers/plans/2026-10-29-buoc-8-identity-remainder.md); design
[`../superpowers/specs/2026-10-28-buoc-8-identity-remainder-design.md`](../superpowers/specs/2026-10-28-buoc-8-identity-remainder-design.md); quyết định D1–D30
[`../superpowers/decisions/2026-10-28-buoc-8-identity-remainder-decisions.md`](../superpowers/decisions/2026-10-28-buoc-8-identity-remainder-decisions.md).

Thứ tự (D33, 29/10/2026): **tuần tự** trong một phiên, M1 → M2 → M3 → **điểm dừng D32 lần 1** (chủ dự án đăng nhập Google thật) → M4 → M5 → M6 → M7. Plan đã sửa theo review plan 29/10/2026
([`../superpowers/reviews/2026-10-29-buoc-8-plan-review.md`](../superpowers/reviews/2026-10-29-buoc-8-plan-review.md)) và D31–D33. Mỗi mốc một nhánh `feat/buoc-8-m<N>` tách từ nhánh
trước (chưa merge gì vào `dev`); commit trên máy, push và PR vào `dev` (theo thứ tự) chỉ khi chủ dự án bảo. D31: admin xóa người đang tự gia hạn → app tắt gia hạn ở nhà cung cấp, ghi
`cancel_at_period_end` tại chỗ, xóa ngay. D32: Google thật hai lần (sau M3 và ở cuối).

**M1 — API nền**
1. Thêm cột và bảng mới: trạng thái "đang xóa", ảnh đại diện, danh tính Google, cách đăng nhập của phiên, danh sách tài khoản đã xóa.
2. Mỗi request kiểm tài khoản còn dùng được và phiên chưa bị thu hồi (khóa, đang xóa, đã đăng xuất đều bị chặn ngay).
3. Phiên tạo bằng Google không vào được route admin; `/v1/me` trả cách đăng nhập.
4. Đăng nhập, gia hạn phiên và các thao tác admin cũ biết trạng thái "đang xóa".
5. Phần dùng chung: luật "gói đang tự gia hạn" (gồm cả trừ tiền lỗi), giới hạn tần suất mới, hai mẫu thư, biến môi trường.

**M2 — API xóa tài khoản**
6. Cổng cho từng module tự xóa dữ liệu của mình, cộng test bắt buộc mọi cột trỏ tới người dùng phải có cách xử lý.
7. Content xóa từ riêng và câu tự viết.
8. Learning và thư nhắc xóa dữ liệu học, cài đặt nhắc.
9. Practice xóa bài luyện, xóa báo lỗi về từ riêng, ẩn danh các báo lỗi còn lại.
10. Entitlements xóa gói, lần cấp, dấu dùng thử; ẩn danh sổ lượt và giao dịch; webhook tới muộn không giữ id thật.
11. Cổng AI xóa nội dung lời gọi trong cùng transaction.
12. Hai cài đặt mới: số ngày dọn tài khoản chưa xác nhận, số năm giữ giao dịch.
13. Dịch vụ xóa hai bước (đặt "đang xóa", rồi xóa hết) với mã ẩn danh và thư "đã xóa".
14. Route người học tự xóa và admin xóa người khác.
15. Việc định kỳ: thử lại xóa, quét hàng ghi muộn, dọn tài khoản chưa xác nhận, xóa giao dịch quá hạn.
16. Lệnh xuất và chạy lại danh sách đã xóa sau khi khôi phục backup.

**M3 — API đăng nhập Google**
17. Cấu hình Google và cookie mã hóa có hạn.
18. Bộ nối Google thật và Google giả cho test.
19. Bắt đầu đăng nhập và nhận kết quả từ Google (tự liên kết theo email, thư báo liên kết).
20. Hoàn tất đăng ký bằng Google (ngày sinh, đồng ý, tên khi Google thiếu).
21. Xác nhận lại bằng Google trước khi xóa tài khoản chỉ có Google.

**M4 — API hủy gói**
22. Route hủy gia hạn; nhà cung cấp giả báo lại sự kiện hủy ngay (thông tin gói đã có sẵn ngày gia hạn). (Phần tắt gia hạn khi admin xóa — D31 — nằm ở việc 10 và 14.)

**M5 — Web người học**
23. Nút "Tiếp tục với Google" và xử lý khi quay về.
24. Màn hoàn tất đăng ký Google.
25. Cài đặt: dòng "Đăng nhập bằng", lối vào xóa tài khoản, "Đặt mật khẩu" cho tài khoản chỉ có Google.
26. Luồng xóa tài khoản và trang "Đã xóa".
27. Nút "Hủy gói" ở trang Gói.

**M6 — Admin**
28. Đăng xuất khi gặp phiên Google, mã lỗi mới, chữ "Người dùng đã xóa".
29. Nút xóa tài khoản ở chi tiết người dùng, nhãn cách đăng nhập, nhãn "Đang xóa".
30. Hai ô cài đặt mới.
31. Một ca admin xóa người học trên stack thật.

**M7 — Kiểm thật và tài liệu**
32. Script `pnpm smoke:buoc-8`.
33. Test flow (có bước tạo OAuth client Google), việc trước ra mắt, CLAUDE.md, as-built; chạy mọi smoke, kiểm trên trình duyệt, chủ dự án đăng nhập Google thật.

---

# Bước 8 — as-built (29/10/2026)

Thực thi tuần tự trong một phiên (D33), bảy nhánh nối tiếp, commit local rồi push và mở PR vào `dev` theo thứ tự (chủ dự án 29/10/2026: được tự commit và mở PR, **không merge**; chủ dự án tự kiểm sau).
Mọi quyết định tự đưa ra khi làm, kèm câu phát sinh còn mở: [`buoc-8-rulings.md`](buoc-8-rulings.md). Luồng kiểm tay (Google giả và Google thật): [`buoc-8-test-flow.md`](buoc-8-test-flow.md).
Việc cần làm trước ra mắt: mục "Bước 8" của [`deploy-checklist.md`](deploy-checklist.md).

## Nhánh và PR (thứ tự mở/merge)

| # | Nhánh | Nội dung | Commit |
|---|---|---|---|
| 0 | `docs/buoc-8-brainstorm` (PR #172) | design, decisions D1–D33, review, plan, plan tóm tắt | d9d9e06 … |
| 1 | `feat/buoc-8-m1` (PR #173) | schema Bước 8; guard kiểm trạng thái và phiên mỗi request; phiên Google không vào route admin; phần dùng chung | e0436e7, f610916, 26d79bd |
| 2 | `feat/buoc-8-m2` (PR #174) | cổng bộ xóa của từng module + bộ xóa; dịch vụ xóa hai transaction, route, việc định kỳ, lệnh export/replay | 50629d3, 5b2808a, 61b1e34 |
| 3 | `feat/buoc-8-m3` (PR #175) | đăng nhập Google (thật và giả), hoàn tất đăng ký, xác nhận lại trước khi xóa; script chuẩn bị tài khoản cho lần 1 | cc8638f, c2243ae, 2bacd3a |
| 4 | `feat/buoc-8-m4` (PR #176) | `POST /v1/me/subscriptions/:id/cancel` | fc69854 |
| 5 | `feat/buoc-8-m5` (PR #177) | web người học: nút Google, hoàn tất đăng ký, Cài đặt, xóa tài khoản, "Hủy gói" | 41324ea, 7e5adb7 |
| 6 | `feat/buoc-8-m6` (PR #178) | admin: xóa người dùng, phiên Google, hai cài đặt mới; sửa a11y chi tiết người dùng (R17) | 31716aa, f46126c |
| 7 | `feat/buoc-8-m7` (PR #179) | `pnpm smoke:buoc-8` + kết quả | 46f4f94, 69a86a0, 4288674 |
| 8 | `docs/buoc-8-as-built` (PR #180) | tài liệu này, test flow, rulings, deploy checklist, CLAUDE.md | — |
| 9 | `fix/buoc-8-minors` (PR #181, cắt từ đỉnh m7, vào `dev`) | 3 trong 8 Minor của review cuối (R21): M4 thư tới địa chỉ chưa xác nhận, M6 nút xóa admin cuối, M8 giới hạn tốc độ của Google quay về app; thêm 2 kiểm vào smoke | xem `git log` |

## Đã có (những gì chạy được)

- **Google:** `GET /v1/auth/google/start|callback`, `GET|POST /v1/auth/google/complete`, `POST /v1/auth/google/reauth`. Cookie `google_oauth` / `google_signup` / `google_reauth` được mã hóa AES-256-GCM
  (`OAUTH_COOKIE_KEY`), PKCE S256, nonce, kiểm ID token bằng `jose`. Tài khoản đã có (email đã xác nhận) tự liên kết (K8) và gửi thư báo; người mới qua màn hoàn tất (ngày sinh ≥ 13,
  điều khoản, tên nếu Google thiếu); email khác `sub` → `google-failed` (P13). Phiên Google không vào route staff (403 `password-login-required`). Google giả (`GOOGLE_FAKE_ENABLED`, trang
  `GET /v1/dev/google/authorize`) cho CI và smoke; cấu hình bị từ chối khi bật cùng `BILLING_PRODUCTION`.
- **Xóa tài khoản:** `POST /v1/me/account/delete` (mật khẩu, hoặc bằng chứng Google cho tài khoản chỉ có Google) và `POST /v1/admin/users/:id/delete` (`roles.manage`). Hai transaction: Tx A đặt `deleting`,
  thu hồi phiên, hủy OTP; Tx B (timeout 120 s) chạy bộ xóa của từng module theo thứ tự practice → learning → content → notifications → entitlements → ai, rồi khóa idempotency, `deleted_accounts`, hàng
  `users`. Mỗi lần một mã ẩn danh. Chặn khi gói đang tự gia hạn (409 `subscription-renewing`, kể cả trừ tiền lỗi); admin cuối bị chặn (`last-admin`); không tự xóa mình (`self-delete`). **D31:** admin xóa người
  đang gia hạn → tắt gia hạn ở nhà cung cấp, ghi `cancel_at_period_end`, xóa ngay; nhà cung cấp quá `BILLING_ADAPTER_TIMEOUT_MS` hoặc lỗi → 409 `renewal-not-cancelled`, không xóa gì.
- **Việc định kỳ (mỗi giờ, chạy lặp vô hại):** thử lại xóa dở (>10 phút), quét hàng ghi muộn của tài khoản đã xóa, dọn tài khoản chưa xác nhận email (cài đặt `identity.unverified_cleanup_days`), xóa giao dịch quá hạn
  (`entitlements.transaction_retention_years`, mặc định 10, khoảng 5–30).
- **Sau khôi phục backup:** `pnpm accounts:export-deletions --out <file>` và `pnpm accounts:replay-deletions --from <file>` (thủ tục ở `deploy-checklist.md`).
- **Hủy gói:** `POST /v1/me/subscriptions/:id/cancel` (202 `requested`; nhà cung cấp giả báo `cancel_scheduled` đồng bộ nên cờ đã bật khi route trả về).
- **Web người học:** nút "Tiếp tục với Google", `/app/google/complete`, dòng "Đăng nhập bằng" và "Đặt mật khẩu" trong Cài đặt, `/app/settings/delete-account`, `/app/account-deleted`, nút "Hủy gói" ở trang Gói.
- **Admin:** nút xóa ở chi tiết người dùng (gõ lại email; ghi chú khi gói sẽ bị tắt gia hạn), nhãn "Đang xóa" và cột "Đăng nhập bằng", tab "Tài khoản" và dòng retention trong Cài đặt hệ thống, đăng xuất khi gặp phiên Google.

## Bằng chứng (chạy trong phiên này, ở nhánh `feat/buoc-8-m7`)

| Việc | Kết quả |
|---|---|
| `apps/api` unit (`pnpm test`) | 246 file, **3129** ca xanh (một lần chạy song song với bộ test web có 2 ca đỏ ở một file; chạy lại riêng và chạy lần nữa đều xanh hết, chưa tìm ra ca nào — nghi do tải máy) |
| `apps/web` unit | 74 file, **722** ca xanh |
| `apps/admin` unit | 82 file, **904** ca xanh |
| web e2e trong container Linux (`pnpm cf:docker`) + `assert:static` | **318** ca xanh, `assert:static` qua |
| admin e2e trên stack thật (`e2e-real`, gồm ca admin xóa người học) | **27** ca xanh |
| admin e2e mock | 265 xanh, 67 bỏ qua; **2 đỏ** (axe `scrollable-region-focusable` ở chi tiết người dùng, mobile VI/EN) → sửa ở R17; chạy lại `a11y.spec.ts` mobile: **6/6 xanh**. Chưa chạy lại cả bộ mock sau sửa |
| `pnpm smoke:buoc-8` lần 1 và 2 (mỗi lần trên DB mới), chạy trên code **sau** các sửa của review cuối | **19/19 bước** mỗi lần; `buoc-8-smoke-output.txt`; log API và worker không có dòng ERROR. (Trước các sửa, cũng 19/19 hai lần.) |
| Quyết định về 8 Minor (R21) và PR #181 | Sửa M4, M6, M8 (mỗi cái test đỏ rồi xanh); để lại M3, M1 trong deploy-checklist; bỏ M2, M5, M7. Sau PR này: API 3134 unit, web 723, admin 905 (khi chạy toàn bộ, 2 ca đỏ ngẫu nhiên do timeout 5 s, xanh khi chạy riêng; chạy toàn bộ trên code chưa sửa cũng đỏ ngẫu nhiên 5 ca khác nhau, nên là nhiễu do tải máy, chưa tìm ra gốc); `pnpm smoke:buoc-8` 20/20 bước (bước M6 trong B8E40, thêm bước "final review M4 M8"); lint, typecheck và build xanh ở cả ba app |
| Review cuối nhánh (reviewer độc lập, đọc code, không chạy) | 1 Critical + 3 Important đã sửa bằng TDD; 8 Minor (3 đã sửa ở PR #181, xem R21); chi tiết ở `buoc-8-rulings.md` mục "Review cuối" và `../superpowers/reviews/2026-10-29-buoc-8-final-review.md` |
| `smoke:buoc-0-3-fixes`, `smoke:buoc-4` | đều qua trên DB mới (`ALL STEPS MATCHED`; `ALL CHECKS PASSED`, 20 phiên, 43 câu trả lời) |
| `smoke:buoc-5` cả hai chế độ fetchState (ON, OFF), mỗi chế độ trên DB mới | đều qua (`ALL CHECKS PASSED`: 431 s ON, 253 s OFF) |
| `smoke:buoc-6` | qua, 32 bước (API chạy không có khóa AI; smoke 6 và 7 từ chối chạy khi file môi trường cục bộ của API có `OPENAI_API_KEY`, nên file đó được tạm đổi tên lúc chạy và trả lại ngay sau) |
| `smoke:buoc-7` | qua, 30 bước, sau khi sửa một khẳng định cũ (R18) |

Smoke Bước 8 chứng minh trên Postgres thật (unit chỉ có Prisma giả): xóa bằng mật khẩu và bằng Google xóa sạch **53 cột** `user_id`/`*_user_id`/`*_by` của mọi bảng (đếm trước/sau), hàng sổ lượt và giao dịch còn lại dưới
mã ẩn danh, báo lỗi bỏ ghi chú và câu trả lời của người học, hàng ghi muộn bị quét, webhook tới muộn không giữ id, xóa lại sau "khôi phục" (kể cả hàng `users` và gói đang gia hạn được dựng lại), hai admin xóa nhau cùng lúc chỉ
một người thành công, dọn tài khoản chưa xác nhận đúng đối tượng, đăng ký lại cùng email được dùng thử lại, và một người học lớn (50 000 dòng log, 2 000 từ riêng) xóa trong 0,3 s (lần 1) và 0,5 s (lần 2), xa dưới giới hạn 120 s. Dữ liệu thử này chỉ là bảng log và từ riêng; chưa phải một người học thật nhiều dữ liệu ở mọi module.

## Chưa kiểm (nói rõ)

- **Google thật, lần 1 và lần 2 (D32)** — chủ dự án chưa báo kết quả. Hai `ASSUMPTION` (cookie `refresh_token` còn sau chuyển trang từ Google; PKCE S256 với client Web có secret) **chưa được xác nhận**; Google giả chỉ chứng minh logic phía API và chuỗi chuyển trang. Task 23 (nút Google ở web) làm tạm trước kết quả này (R13). Hướng dẫn: `buoc-8-test-flow.md` mục B.
- **Kiểm trên trình duyệt thật trên stack Docker có chụp màn** (design §17): chưa làm (R16). Web và admin được kiểm bằng unit và e2e (mock, và real cho admin).
- **Chưa đo ở môi trường thật:** scheduler chạy ở cả API và worker; kích thước pool kết nối khi nhiều người xóa cùng lúc; nơi lưu danh sách đã xóa ngoài DB. Đã đưa vào `deploy-checklist.md`.
- **Chưa có dev → main PR** (chỉ mở khi chủ dự án bảo). Các PR #172–#181 của Bước 8 **đã merge vào `dev`** ngày 29/10/2026 theo lệnh của chủ dự án, mỗi PR có CI xanh trước khi merge; `dev` ở aacd0f4 sau #181. CI không chạy lại trên `dev` sau merge (chỉ chạy trên PR).

## Kết quả kiểm tay của chủ dự án

(chưa có — điền sau khi chạy `buoc-8-test-flow.md`: A1–A12, B2 lần 1, B3 lần 2.)
