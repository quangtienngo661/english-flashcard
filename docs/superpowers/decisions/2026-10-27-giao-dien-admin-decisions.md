# Decisions — Đợt giao diện admin

Ngày: 27/10/2026. Đi kèm design doc [`../specs/2026-10-27-giao-dien-admin-design.md`](../specs/2026-10-27-giao-dien-admin-design.md). Câu hỏi, đề xuất và câu
trả lời nguyên văn: [`../reviews/2026-10-27-giao-dien-admin-questions.md`](../reviews/2026-10-27-giao-dien-admin-questions.md) (câu 1–14). Bằng chứng đối chiếu
API từng khung: [`../../preparation/giao-dien-admin-facts/`](../../preparation/giao-dien-admin-facts/).

**Nhãn:** ✅ = phương án được chọn. **Ai chốt:** "Chủ dự án" = chủ dự án tự nêu hoặc chọn khác đề xuất; "Chủ dự án (đề xuất của Claude)" = Claude đề xuất trước
(câu 1), chủ dự án ghi "ok" / chữ cái trùng đề xuất / "theo đề xuất".

## Tóm tắt

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| AD0 | Luật hỏi đợt này | Claude đề xuất trước mọi câu, chủ dự án xác nhận trong file | Chủ dự án |
| AD1 | Làm đợt này để phục vụ gì trước | Thứ tự AI → Cài đặt hệ thống → Báo lỗi → Người học, cấp gói → Nội dung | Chủ dự án (đề xuất của Claude) |
| AD2 | Ghi chú "sẽ làm lại phần nhìn admin" (15/10) | Đã xong qua UI refresh B; màn mới code theo page 04 hướng B; xóa ghi chú "tạm" | Chủ dự án (đề xuất của Claude, vòng 2) |
| AD3 | Hướng làm lại phần nhìn | Bỏ câu (theo AD2) | — |
| AD4 | Code từ Figma hay vẽ lại trước | Code thẳng theo page 04; mỗi milestone đặt ảnh màn thật cạnh khung | Chủ dự án (đề xuất của Claude, vòng 2) |
| AD5 | Màn nào vào đợt | Cả 15 màn (gồm Bộ ví dụ AI) | Chủ dự án (đề xuất của Claude, vòng 2) |
| AD6 | Dashboard | Ngoài đợt, giữ "Sắp có" | Chủ dự án (đề xuất của Claude) |
| AD7 | Email người thao tác | Thêm email người thao tác **và** người học vào API | Chủ dự án (sau mô phỏng) |
| AD8 | Chia đợt | 7 PR: M0 khung chung + 6 milestone theo thứ tự AD1, mỗi PR một nhánh vào `dev` | Chủ dự án (đề xuất của Claude, vòng 2; M0 thêm sau review, chủ dự án chốt 27/10/2026) |
| AD9 | Việc API nhỏ màn cần | Làm luôn trong đợt, liệt kê trong design; việc đổi luật thì hỏi | Chủ dự án (đề xuất của Claude) |
| AD10 | "Xong khi" | CI xanh + mỗi màn có ghi dữ liệu một e2e trên stack thật + Claude chạy thật, chụp màn + test flow cho chủ dự án (không chặn merge) | Chủ dự án (đề xuất của Claude, vòng 2) |
| AD11 | Tiếng Anh | Màn mới đủ vi và en | Chủ dự án (đề xuất của Claude) |
| AD12 | Việc nhỏ thêm | Quyền và menu AI theo `settings.manage`, 7 mục; 3 điểm guideline cho màn mới; sửa ghi chú cũ | Chủ dự án (đề xuất của Claude, vòng 2) |
| AD13 | Editor cấp gói không tìm được người học | Endpoint tra đúng một email cho `entitlements.grant`; lọc theo người bằng email | Chủ dự án (đề xuất của Claude) |
| AD14 | Editor không đọc được lý do báo lỗi | `content.edit` được đọc danh sách lý do; báo lỗi mang cờ `refundable` | Chủ dự án (đề xuất của Claude) |
| AD15 | Thời điểm làm việc API | 9 task API làm ở một phiên riêng, song song với các milestone màn | Chủ dự án (đề xuất của Claude) |
| AD16 | Kết quả từng ví dụ ở chi tiết lần chạy Bộ ví dụ (thêm ngoài design, 27/10/2026) | Thêm bảng kết quả từng ví dụ (tóm tắt đầu vào, trạng thái, lý do, đầu ra, đầu ra gốc xem khi cần) | Chủ dự án ("giữ") |
| AD17 | "Tới ngày" khi cấp / sửa ngày lần cấp | Ngày D tính trọn: còn hiệu lực hết ngày D (giờ Việt Nam); API nhận 00:00 ngày D+1 | Chủ dự án (giữ cách màn M4 đã làm) |
| AD18 | Admin tạo / sửa người dùng (thêm sau M4, 28/10/2026) | `POST /v1/admin/users` nhận thêm vai trò người học; admin sửa email, tên, ngày sinh, múi giờ và đặt lại mật khẩu; editor chỉ đọc; ngày sinh và điều khoản do người học tự bổ sung ở lần đăng nhập đầu | Chủ dự án (6 câu + 4 câu, đề xuất của Claude được duyệt) |

## AD0 — Luật hỏi đợt này (câu 1)

Bước 3–7 dùng luật "chủ dự án trả lời trước, Claude đề xuất sau"; đợt cải thiện A dùng luật ngược lại. Vòng đầu file câu hỏi không có đề xuất.

| Phương án | Trade-off |
|---|---|
| (a) chủ dự án trả lời trước, Claude đề xuất sau | Chủ dự án tự nghĩ trước từng câu; chậm hơn |
| ✅ (b) Claude đề xuất trước mọi câu | Nhanh; chủ dự án đọc đề xuất kèm trade-off rồi xác nhận hoặc đổi |
| (c) chủ dự án trước với câu sản phẩm, Claude trước với câu kỹ thuật | Phải phân loại từng câu |

## AD1 — Thứ tự ưu tiên (câu 2)

Sáu thao tác AI đều được seed không có model (`model_ref NULL`), nên chưa người học nào có câu AI hay tra AI. Ngày 26/10 chủ dự án đã trả lời rằng sẽ làm UI admin
rồi test AI thật trên đó (câu 4 của đợt cải thiện).

| Phương án | Trade-off |
|---|---|
| (a) cấu hình AI trước | Mở đường cho lần gọi AI thật và nhóm B; milestone đầu khó nhất |
| (b) báo lỗi, trả lượt trước | Chỉ cần khi có người học thật |
| (c) người dùng, cấp gói trước | Như (b) |
| (d) nội dung trước | Nội dung đã soạn bằng CSV ngoài app được |
| (e) cài đặt hệ thống trước | Một trang, API đủ |
| (f) đủ hết, thứ tự nào cũng được | Không có thứ tự để chia milestone |
| ✅ thứ tự a → e → b → c → d | Editor (Minh) đợi tới cuối mới có màn của mình |

## AD2 — Ghi chú "sẽ làm lại phần nhìn admin" (câu 3, hai vòng)

**Vòng 1** (trước khi Claude mở Figma; câu hỏi là "làm lại phần nhìn trước, hay dựng màn mới trước"):

| Phương án | Trade-off |
|---|---|
| (a) dựng màn mới trên phần nhìn hiện tại, làm lại sau (đề xuất vòng 1, kèm luật chỉ dùng component chung) | Màn AI có sớm; bố cục từng màn có thể phải chỉnh lại |
| (b) làm lại phần nhìn trước rồi dựng màn mới | Thêm một vòng thiết kế trước khi có màn nào |
| (c) dựng màn mới theo phần nhìn mới, chuyển 6 màn cũ dần | Hai kiểu nhìn cùng tồn tại giữa đợt |

Chủ dự án hỏi "bạn có xem qua lại mockup chưa". Claude chưa xem; mở Figma thì thấy page 04 đã vẽ đủ theo hướng B (A/84, A/10, A/90 cùng kiểu), và ghi chú 15/10
nói về kiểu Sneat, viết cùng ngày chủ dự án chọn hướng B. Vòng 1 dựa trên hai điều sai, nên câu được viết lại.

**Vòng 2** (câu hỏi: "làm lại" ngày 15/10 đã được UI refresh B làm xong chưa). Bằng chứng ủng hộ (a): B25E30 được ghi "sửa khi refactor giao diện admin" và đã sửa
trong UI refresh B; 40 khung admin mới (22/10) vẽ theo hướng B. Bằng chứng ngược chiều: câu 25 của đợt cải thiện (26/10) có câu "đợt làm lại admin chưa có design".

| Phương án | Trade-off |
|---|---|
| ✅ (a) đã xong; code theo page 04; xóa ghi chú "tạm" ở `CLAUDE.md` và memory | Chốt hướng B cho admin; đổi sau này tốn hơn |
| (b) vẫn làm lại sau, đợt này code theo page 04 bằng component chung | Giữ một việc làm lại treo |
| (c) làm lại trước khi dựng màn mới | Thêm một vòng thiết kế |

## AD3 — Hướng làm lại phần nhìn (câu 4)

Câu 4 chỉ áp khi câu 3 chọn (b) hoặc (c). Câu 3 chọn (a), nên bỏ. Các phương án đã nêu: (a) giữ token hướng B và `react-aria-components`; (b) chuyển sang bộ
component admin có sẵn; (c) Claude đưa vài mẫu.

## AD4 — Code từ Figma hay vẽ lại trước (câu 5, hai vòng)

Vòng 1 coi page 04 là wireframe; vòng 2 sửa lại sau khi xem Figma (khung đã có cả phần nhìn).

| Phương án | Trade-off |
|---|---|
| ✅ (a) code thẳng theo page 04; mỗi milestone đặt ảnh màn thật cạnh khung, không dừng chờ duyệt | Chủ dự án chỉ thấy màn sau khi code; các trạng thái chỉ ghi bằng chú thích (A/72 `lock-rule`, A/76 trống, A/86 trống) Claude tự dựng |
| (b) vẽ lại bản hoàn chỉnh hơn trước khi code | Thêm vòng vẽ |
| (c) vẽ trước vài màn mẫu | Thêm vòng vẽ nhỏ |

## AD5 — Phạm vi màn (câu 6, hai vòng)

**Vòng 1:** đề xuất 14 màn, bỏ 6.14 Bộ ví dụ AI, vì nhóm B sẽ làm lại bộ ví dụ (tiêu chí mong đợi, held-out, judge).
**Vòng 2** (sau khi đọc lại câu trả lời nhóm B ngày 26/10: câu 4 test AI thật trên UI admin bằng cách chạy eval; câu 16 test eval trong admin): đề xuất cả 15 màn.
Chủ dự án: "làm all".

| Phương án | Trade-off |
|---|---|
| ✅ cả 15 màn (6.1–6.15) | Đợt dài (~40 khung); 6.13, 6.14 sẽ được nhóm B sửa thêm |
| 14 màn, bỏ 6.14 | Lần eval đầu phải chạy bằng tay qua API |
| cắt theo thứ tự AD1 từ dưới lên | Đợt ngắn hơn; màn của editor để sau |

Kèm theo: nhãn "Người học đồng ý cho xem từ này" ở A/74 là chữ cũ (luật đồng ý đã bỏ, D12 đợt giao diện người học); màn không hiện nhãn đó.

## AD6 — Dashboard (câu 7)

| Phương án | Trade-off |
|---|---|
| ✅ (a) ngoài đợt, giữ "Sắp có" | Không có trang tổng quan; số cần nhất đã có ở A/70d, A/78, A/84; nhóm B làm dashboard AI riêng (câu 24 đợt cải thiện) |
| (b) vài con số đơn giản kèm API mới | Số gần như bằng 0 khi chưa có người học; dễ trùng dashboard nhóm B |
| (c) bỏ mục khỏi menu | Mất chỗ giữ cho sau này |

## AD7 — Email người thao tác (câu 8, hai vòng)

Vòng đầu chỉ nói người cấp gói, người xử lý báo lỗi, người lưu prompt. Vòng kiểm context thấy rộng hơn: cột "Người học" ở Trả lượt và Cấp gói cũng chỉ là uuid; nội
dung, lịch sử cài đặt, khóa tài khoản đã có email. Chủ dự án ghi "mô phỏng chỗ này"; Claude dựng mô phỏng ba màn (Cấp gói, Báo lỗi đã xử lý, Lịch sử prompt) với hai nút
chuyển giữa email và mã, kèm JSON API trước / sau. Chủ dự án chọn (a).

| Phương án | Trade-off |
|---|---|
| ✅ (a) thêm email người thao tác và người học, mỗi chỗ ở milestone của màn đó | Đụng API của AI, Practice, Entitlements; mỗi danh sách thêm một lần tra email qua `IdentityService` (gom theo trang) |
| (b) để sau, tạm hiện mã người dùng | Màn hiện `3f2a…`, không biết ai đã làm gì |

## AD8 — Chia đợt (câu 9, hai vòng)

Vòng 1 đề xuất 5 milestone (AI gộp một). Vòng 2 tách AI làm hai khi 6.14 vào đợt.

| Phương án | Trade-off |
|---|---|
| (a) mỗi nhóm menu một milestone | Không theo thứ tự ưu tiên |
| ✅ (b) theo thứ tự AD1: M1a AI cấu hình, M1b AI đo, M2 Cài đặt, M3 Báo lỗi, M4 Người học, M5 Nội dung; nhánh `feat/giao-dien-admin-<m>` từ `origin/dev`, PR vào `dev` | 6 PR, mỗi PR chờ CI |
| (c) mỗi màn một PR | Quá nhiều PR |
| (d) một nhánh cho cả đợt | PR quá lớn để review |

## AD9 — Việc API nhỏ (câu 10)

| Phương án | Trade-off |
|---|---|
| ✅ (a) làm luôn trong đợt, liệt kê trong design; việc đổi luật thì hỏi như một quyết định; việc lộ ra lúc code thì ghi delivery record và báo trong PR | Có việc API ngoài design |
| (b) hỏi từng việc | Dừng nhiều lần |
| (c) không sửa API, bỏ phần màn thiếu | Một số khung không làm được |

Danh sách đã thấy (10.1–10.9): số lần chạy thử còn lại, câu chặn cố định, cột "Thiếu" ở mọi bộ lọc, trạng thái cấp gói, lần sửa gần nhất của lần cấp, đọc một báo
lỗi theo id, chỉ số lựa chọn người học chọn, giá trị mặc định của cài đặt, mã lỗi client. Cách làm từng việc: design §5.

## AD10 — "Xong khi" (câu 11, hai vòng)

Vòng 1 đề xuất một luồng e2e thật mỗi milestone, lý do "e2e thật làm CI chậm". Vòng 2 sửa theo số đo CI ngày 27/10: `admin-e2e-real` 8 test, ~2 phút, song song job
`web` ~15 phút.

| Phương án | Trade-off |
|---|---|
| (a) CI xanh (unit + e2e mock) | Không chạy thật |
| (b) (a) + e2e trên stack thật cho mỗi màn có ghi dữ liệu | — |
| (c) (b) + Claude chạy thật, chụp màn từng milestone | — |
| ✅ (d) (c) + test flow cho chủ dự án tự chạy, không chặn merge | Dựng dữ liệu cho test thật tốn công; gọi AI thật vẫn ngoài CI |

## AD11 — Tiếng Anh (câu 12)

| Phương án | Trade-off |
|---|---|
| ✅ (a) màn mới đủ vi và en | Thêm công viết chữ; bản en không có bản chữ duyệt trước |
| (b) chỉ vi | Chọn tiếng Anh thì hiện tên khóa thô hoặc trộn hai thứ tiếng |

## AD12 — Việc nhỏ thêm (câu 13, hai vòng)

Vòng 1 đề xuất (13.1) quyền menu AI và (13.2) sửa B25E30. Vòng kiểm context thấy B25E30 đã sửa trong UI refresh B (`4e2c230`, `e7e6e8d`), nên bỏ; thay bằng ba điểm
guideline còn nợ. Chủ dự án: "theo đề xuất".

| Việc | Chọn |
|---|---|
| 13.1 | ✅ Nhóm AI dùng `settings.manage`, menu 7 mục AI theo Figma |
| 13.2 | ✅ Màn mới: bộ lọc ghi vào URL; lưu lỗi thì focus ô lỗi đầu tiên; cảnh báo khi rời form đang sửa dở (làm trong `ui/` và `Shell`) |
| 13.3 | ✅ Sửa `CLAUDE.md` và memory: B25E30 đã sửa; xóa ghi chú "phần nhìn tạm" |
| (vòng 1) sửa B25E30 | Bỏ — đã sửa |

## AD13 — Editor tìm người học khi cấp gói (câu 14.1)

`/admin/users` cần `roles.manage`; API cấp gói nhận `user_id`. Editor chỉ biết người nhận là staff hoặc chính mình sau khi bấm [Cấp].

| Phương án | Trade-off |
|---|---|
| ✅ (a) endpoint tra đúng một email cho `entitlements.grant` (trả id, email, cấp được không); lọc theo người ở A/76, A/78 nhận email | Thêm một endpoint; editor dò được email có tài khoản hay không |
| (b) mở `GET /admin/users` cho editor | Editor thấy cả danh sách người dùng, ngày sinh, trạng thái khóa |
| (c) API cấp gói nhận email | Form không báo trước "không cấp được" |

## AD14 — Editor đọc lý do báo lỗi (câu 14.2)

| Phương án | Trade-off |
|---|---|
| ✅ (a) `content.edit` đọc danh sách lý do (sửa vẫn `settings.manage`); báo lỗi mang cờ `refundable` | Đổi quyền một endpoint đọc (design Bước 7 đặt cả nhóm dưới `settings.manage`) |
| (b) bỏ bộ lọc "Lý do" và dòng trả lượt ở màn editor | Editor không biết bấm "Xác nhận lỗi" có trả lượt không |

## Đề xuất kỹ thuật trình cùng design

Các lựa chọn kỹ thuật Claude đưa vào design (§3–§5). **Chủ dự án duyệt cùng design ngày 27/10/2026** (chuyển sang viết plan).

| # | Chọn | Bỏ | Vì sao |
|---|---|---|---|
| T1 | Email thêm thành trường mới `{id, email}` cạnh trường uuid cũ | Đổi trường uuid thành object | v1 chỉ được thêm (SR7) |
| T2 | Đổi admin sang data router (`createBrowserRouter`) để dùng `useBlocker` | Tự chặn click menu + `beforeunload` | `useBlocker` của react-router 8.4.0 chỉ chạy trong data router (kiểm `hooks.js:1254`); tự chặn không bắt được nút Back |
| T3 | Số lần chạy thử còn lại qua `GET /v1/admin/ai/test-quota` | Header trên response; bỏ dòng đếm | Màn cần số ngay khi mở, trước lần chạy đầu |
| T4 | API tính `status` của lần cấp | Client tự suy | Tránh "Bị thay thế" sai khi staff gõ lý do "replaced" |
| T5 | `admin-e2e-real` bật `AI_FAKE_ENABLED=true` | Test AI chỉ trên mock | Màn AI cần provider giả để chạy thật |

Thêm sau review độc lập ngày 27/10/2026 ([`../reviews/2026-10-27-giao-dien-admin-design-review.md`](../reviews/2026-10-27-giao-dien-admin-design-review.md),
các mục I1, I2, I5, I6). Chủ dự án bảo "sửa đi" sau khi đọc review; các dòng dưới là phương án Claude chọn khi sửa. **Chủ dự án duyệt T6–T9 (27/10/2026):**
"Duyệt T6–T9 như đã sửa, chuyển sang viết plan." Ở phiên chính, cùng ngày: "Ok, I2 chọn (a) trang báo không có quyền, tách M0 khung chung. Sửa design theo toàn bộ review."

| # | Chọn | Bỏ | Vì sao |
|---|---|---|---|
| T6 | Một `useBlocker` duy nhất ở `Shell`; form báo "đang bẩn" qua context; chỉ chặn khi đổi `pathname`; lưu xong bỏ "bẩn" trước khi điều hướng; hộp thoại tự hỏi khi Hủy / Esc | Mỗi form tự gọi `useBlocker` | Mỗi router chỉ một blocker (`router.js:1221`); đổi tab / bộ lọc là đổi `search`; hộp thoại là route con nên đóng hộp cũng là điều hướng |
| T7 | "Bị thay thế" suy từ lần cấp Pro mới của cùng người học có `created_at = revoked_at` và `granted_by = revoked_by` | (a) thêm cột đánh dấu (migration); (b) chặn staff gõ lý do `replaced` (đổi luật) | Lần thay thế và lần cấp mới ghi cùng `now` trong một transaction (`grants.service.ts:124-137`); không migration, không đổi luật. Chưa kiểm trên Postgres thật (R3) |
| T8 | Thêm PR M0 "khung chung" (router, blocker, menu, quyền, component `ui/`, mã lỗi client, tài khoản test, `AI_FAKE_ENABLED`) trước M1a; đợt thành 7 PR | Gộp phần chung vào M1a (AD8 bản đầu) | M1a gộp phần rủi ro nhất (đổi router đụng mọi màn cũ) với phần quan trọng nhất (màn AI); tách ra thì chạy lại test cũ trên router mới trước khi có màn mới. Đổi số PR của AD8 |
| T9 | Mở thẳng đường dẫn không đủ quyền: trang "Bạn không có quyền xem trang này." [Về trang chủ] theo khung A/71e và bản chữ §8.0; áp cả màn cũ | Giữ chuyển hướng im lặng (`Shell.tsx:132`) và sửa khung A/71e, bản chữ §8.0 | Khung và bản chữ đã duyệt vẽ trang báo không có quyền; design bản đầu ghi ngược lại. Đổi hành vi của màn cũ (sửa `e2e/shell.spec.ts`) |

## AD15 — Làm song song (chat 27/10/2026, sau khi M0 xong)

Chủ dự án hỏi còn bao nhiêu task và làm song song được không. Claude đưa 3 cách; chủ dự án: "cách 2 đi để tối ưu về mặt thời gian".

| Phương án | Trade-off |
|---|---|
| (1) giữ nối tiếp như design §3, §5 | Không xung đột; chậm nhất |
| ✅ (2) 9 task API (Task 9, 10, 17, 21, 24, 25, 31, 32, 37) ở một phiên riêng song song; màn vẫn nối tiếp | Bỏ luật "API nằm trong PR của milestone dùng nó"; Task 9 (`UserRef`) phải làm trước; vài spec dùng chung |
| (3) mỗi milestone một phiên chạy cùng lúc | Nhanh nhất; 6 nhánh cùng sửa `nav.ts`, `routes.tsx`, `messages/*.json`, `ui/` |

## AD16 — Kết quả từng ví dụ ở chi tiết lần chạy Bộ ví dụ (27/10/2026, khi làm M1b; thêm ngoài design)

Design §6.5 và bản chữ A/83 chỉ có phần tóm tắt của một lần chạy (tiến độ, hợp lệ, thời gian trung bình, chi phí, model, bản prompt, người chạy). API trả thêm
`items[]` (kết quả từng ví dụ). Màn M1b đã thêm bảng này; Claude báo lại là việc thêm ngoài design. Chủ dự án: "giữ".

| Phương án | Trade-off |
|---|---|
| (a) Chỉ các trường tóm tắt của design §6.5 / bản chữ A/83 | Đúng khung đã duyệt, ít màn hơn; lần chạy thật đầu tiên nuôi nhóm B (đo chất lượng prompt) mà tóm tắt không cho thấy ví dụ nào lỗi |
| ✅ (b) Thêm bảng từng ví dụ: tóm tắt đầu vào, trạng thái, lý do, đầu ra, đầu ra gốc xem khi cần | Thêm bản chữ tự viết (đã ghi ở as-built); nhìn được ví dụ nào lỗi và vì sao ngay sau lần chạy thật đầu tiên |

## AD17 — "Tới ngày" của lần cấp (27/10/2026, khi làm M4)

API coi `ends_at` là mốc đã hết hạn (`endsAt <= now` là hết hạn, `grants.service.ts`); design và bản chữ không nói "Tới ngày" tính trọn ngày hay không. Màn M4
(Task 34–35) chọn cách như màn Giao dịch; Claude báo lại kèm hệ quả nếu hiểu khác (lần cấp dài thêm một ngày). Chủ dự án (qua phiên điều phối): giữ cách hiện có.

| Phương án | Trade-off |
|---|---|
| ✅ (a) Ngày D tính trọn: còn hiệu lực hết ngày D, API nhận 00:00 ngày D+1 (+07:00); màn hiện lại ngày của `ends_at − 1ms` | Khớp cách đọc "tới ngày 30"; cùng quy ước với bộ lọc Giao dịch |
| (b) Ngày D là mốc hết hạn: API nhận 00:00 ngày D | Khớp nguyên nghĩa `ends_at` của API; cấp "tới ngày 30" thì ngày 30 đã hết hiệu lực |

## AD18 — Admin tạo / sửa người dùng (28/10/2026, thêm sau M4; chủ dự án yêu cầu "làm trực tiếp")

Trước đợt này admin chỉ tạo được tài khoản nhân sự (`admin`, `editor`); không có cách nào tạo hay sửa một người học. Chủ dự án trả lời trước, Claude đề xuất sau.

| Câu | Phương án đã đưa ra | Chốt |
|---|---|---|
| 1. Route | ✅ (a) mở rộng `POST /v1/admin/users` nhận vai trò người học (`staff_role: null`); (b) route riêng | (a) |
| 2. Mật khẩu | (a) admin gõ; (b) hệ thống sinh rồi gửi mail; ✅ (c) admin chọn một trong hai như hộp nhân sự | (c) |
| 3. Bắt đổi mật khẩu lần đầu | có / không / ✅ để admin chọn | để admin chọn |
| 4. Ngày sinh, điều khoản | (a) admin nhập ngày sinh; ✅ (b) để trống, người học tự bổ sung ở lần đăng nhập đầu; (c) để trống luôn | (b) |
| 5. Email đã xác minh ngay | ✅ có (như tài khoản nhân sự); không (phải nhập OTP) | có |
| 6. Ai tạo | admin / editor → **đổi sau câu 9: chỉ admin** | admin |
| 7. Sửa những gì | (a) tên, ngày sinh, múi giờ; (b) thêm đổi email; ✅ (c) thêm đặt lại mật khẩu | (c) |
| 8. Xóa | (a) xóa thật; (b) xóa mềm; (c) không cần; ✅ để Bước 8 làm | Bước 8 |
| 9. Editor làm gì | tạo / sửa / xóa → ✅ **chỉ admin sửa, editor chỉ đọc** (chủ dự án nhầm ở câu 6) | editor đọc |
| 10. Màn hỏi ngày sinh, điều khoản | (a) chỉ người học do admin tạo; ✅ (b) mọi tài khoản thiếu ngày sinh hoặc chưa đồng ý, kể cả cũ | (b) |

Đề xuất kỹ thuật được duyệt cùng: đặt lại mật khẩu đăng xuất mọi thiết bị (như quên mật khẩu); email mới do admin sửa coi là đã xác minh, không đăng xuất, thư báo
tới email cũ; quyền mới `users.read` cho danh sách và chi tiết (admin và editor), mọi thao tác ghi vẫn `roles.manage`; `PATCH /v1/me` nhận `accept_terms: true`;
`GET /v1/me` trả thêm `terms_accepted_at`; chi tiết người dùng của admin trả thêm `timezone`; màn người học `/app/complete-profile` chỉ nằm ở app người học
(nhân sự vào app admin không bị hỏi). Bị bỏ: route riêng cho người học (thêm route mà dữ liệu và luật giống hệt); admin nhập ngày sinh hộ (không biết thật).
