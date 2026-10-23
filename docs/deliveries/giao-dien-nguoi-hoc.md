# Giao diện người học trên web — plan tóm tắt (22/10/2026)

Plan: [`../superpowers/plans/2026-10-22-giao-dien-nguoi-hoc.md`](../superpowers/plans/2026-10-22-giao-dien-nguoi-hoc.md) (48 task, 7 PR).
Design: [`../superpowers/specs/2026-10-22-giao-dien-nguoi-hoc-design.md`](../superpowers/specs/2026-10-22-giao-dien-nguoi-hoc-design.md) (D1–D22).
Decisions: [`../superpowers/decisions/2026-10-22-giao-dien-nguoi-hoc-decisions.md`](../superpowers/decisions/2026-10-22-giao-dien-nguoi-hoc-decisions.md).
Một session, nhánh `claude/gallant-keller-bwo9dk`, mỗi mốc một PR vào `dev`. Mỗi mốc: CI xanh → Claude chạy với API thật, gửi ảnh (đặt cạnh khung Figma) và tài
liệu kiểm → chủ dự án "ok" phần hình → merge. Chủ dự án kiểm bằng tay trên `dev` theo
[`giao-dien-nguoi-hoc-test-flow.md`](giao-dien-nguoi-hoc-test-flow.md) (viết dần theo mốc).

## M1 — Khung app, tài khoản, Cài đặt (PR 1)

1. Tách layout landing và app; cờ `NEXT_PUBLIC_LEARNER_APP` (tắt: `/app` chuyển về landing, code app không vào bản build).
2. CSP kiểu SRI (dự phòng `'unsafe-inline'` nếu bị chặn), cho phép Cloudflare Web Analytics.
3. Token màu từ biến Figma, bản tối, chọn Sáng / Tối / Theo hệ thống.
4. Phiên đăng nhập và gọi API chép từ admin; chuyển tiền tố ngôn ngữ theo hồ sơ, tự cập nhật múi giờ.
5. Chữ của app (vi/en), định dạng ngày giờ tiền theo múi giờ người học; bản chữ mục 17.
6. Bộ thành phần giao diện và khung app (thanh trên, chân trang, menu avatar, tab dưới điện thoại).
7. API (g): con số cho người học, nghĩa ở Từ hay sai, ngày bắt đầu gói.
8. API (a): sửa ngày sinh (13+).
9. Đăng ký, đăng nhập, mã xác minh, quên mật khẩu, chọn ngôn ngữ.
10. Cài đặt và Tài khoản.
11. Dữ liệu thử (CSV mẫu ~300 nghĩa + script), e2e, tài liệu kiểm M1, chạy thật, gửi duyệt.

## M2 — Hôm nay, nhóm, phiên ôn (PR 2)

12. API (c): thêm theo danh sách từ đã tick. 13. API (h): gợi ý chủ đề đổi mỗi ngày.
14. Dữ liệu nhóm. 15. Hôm nay. 16. Danh sách nhóm, tạo / đổi tên / xóa. 17. Trang nhóm. 18. Từ lâu chưa ôn. 19. Chọn từ theo chủ đề. 20. Phiên ôn.
21. e2e, tài liệu kiểm M2, chạy thật, gửi duyệt.

## M3 — Tra từ, thêm từ (PR 3)

22. API (e): danh sách câu đã gặp, số câu ở trang từ. 23. Tra từ. 24. Trang từ. 25. Tấm Thêm từ. 26. Thêm câu đã gặp, thêm cả loạt.
27. e2e, tài liệu kiểm M3, chạy thật, gửi duyệt.

## M4 — Luyện tập, Gói học (PR 4)

28. API (b): Từ hay sai theo nhóm. 29. API (d): "Khác" cuối, lý do tiếng Anh ngắn. 30. Trang Luyện tập, Tùy chỉnh phiên (bố cục mới), hết phiên.
31. Phiên luyện (không AI). 32. Từ hay sai, Lịch sử, Báo lỗi của tôi. 33. Gói học.
34. e2e, tài liệu kiểm M4, chạy thật, gửi duyệt.

## M4b — Lịch sử giao dịch (PR 5)

35. **Vẽ khung Figma** (web, điện thoại, admin) → **chủ dự án duyệt trước khi code**. 36. API (i): lưu giao dịch. 37. API (i): đọc giao dịch (người học,
admin). 38. Màn Lịch sử giao dịch. 39. Màn Giao dịch trong admin. 40. e2e, tài liệu kiểm, chạy thật, gửi duyệt.

## M5a — Luyện tập có câu AI (PR 6)

41. API (f): báo lỗi từ riêng không cần ô đồng ý. 42. Công tắc "Kiểu câu có AI". 43. Đang tạo câu, AI lỗi, thông báo đổi kiểu câu.
44. Ba kiểu câu AI, gợi ý, bản dịch, báo lỗi câu AI. 45. e2e, tài liệu kiểm, chạy thật, gửi duyệt.

## M5b — Tra bằng AI, Từ của tôi (PR 7)

46. Tra bằng AI trong tấm Thêm từ. 47. Sửa trước khi lưu, trang Từ của tôi. 48. e2e, tài liệu kiểm, chạy thật; as-built, UI-CONTEXT, CLAUDE.md; gửi duyệt.

## Điểm dừng hỏi chủ dự án trong lúc làm

- Task 1: cách bỏ code `/app` khỏi bản build không chạy được với Next 16.3.8 + OpenNext.
- Task 2: ghi lại nếu phải dùng dự phòng `'unsafe-inline'` (đã chốt, không hỏi lại).
- Task 35: duyệt khung Figma Lịch sử giao dịch.
- Mỗi mốc: duyệt hình trước khi merge.

# M1 — as-built (23/10/2026)

Nhánh `feat/giao-dien-nguoi-hoc-m1` (cắt từ `origin/dev` @ `87502c0`), thực hiện kiểu Native (`executing-plans`), một commit mỗi task.

**Đã có:** cờ `NEXT_PUBLIC_LEARNER_APP` (tắt: `/…/app/*` → 307 về landing, code app không vào bản build); CSP; màu từ biến Figma + bản tối;
lớp phiên và API chép từ admin; chữ `App` vi/en và định dạng theo múi giờ người học; bộ thành phần và khung app (thanh trên, chân trang, menu
avatar, tab dưới điện thoại); API (g) `GET /v1/me/app-config`, nghĩa ở Từ hay sai, `starts_at` của nguồn gói; API (a) sửa ngày sinh 13+; đăng ký,
đăng nhập, mã xác minh, quên/đặt mật khẩu, chọn ngôn ngữ; Cài đặt, Tài khoản; CSV mẫu 303 nghĩa + `pnpm learner:setup`; e2e M1 (luồng, axe
vi/en × sáng/tối × 1440/390, không cuộn ngang, CSP); `pnpm shots` chụp ảnh trên stack thật. Hôm nay chỉ có khung (M2).

**Đo và kết quả kiểm**
- Cỡ Worker (gzip, `wrangler deploy --dry-run`): landing không app 2.941,92 KiB; bật app (Task 1) 2.943,28 KiB. Gói Free khoảng 3.072 KiB:
  **sát giới hạn** — mỗi mốc sau phải đo lại (checklist Deploy).
- CSP: `'self'` + SRI chặn script nhúng `self.__next_f.push(…)` của Next (68 báo `script-src-elem inline`, không có lỗi style) → bật dự phòng D20
  (`'unsafe-inline'` cho script và style; khi dự phòng bật thì không đưa hash vào, vì hash làm trình duyệt bỏ qua `'unsafe-inline'`).
- Unit: web 289, API (toàn bộ) xanh; e2e app + CSP trên bản build Worker: xem PR.

**Khác plan / cần chủ dự án biết**
- `border-strong` bản tối dùng `#6b7491` thay `#59627d` của Figma: giá trị Figma chỉ 2,33:1 trên nền thẻ tối, dưới mức 3:1 của viền ô nhập.
- Chuyển trang sau form và ở cổng phiên dùng tải trang đầy đủ (`location.replace`): trên bản build Worker, `router.replace` đôi khi không chuyển
  trang (e2e). Rủi ro cần theo dõi ở M2: nếu link thường cũng chập chờn.
- Trên Windows, `next dev` không chạy được (SWC bị chặn): `pnpm dev:app` chạy dev server trong container Linux.
- Cài đặt bản điện thoại theo M/90 (Ngôn ngữ, Giao diện là hàng "giá trị ›" mở tấm chọn; Đăng xuất là nút rộng cuối trang); web theo K/50.
- Admin mở bằng `127.0.0.1:5173` phải gọi API bằng `http://127.0.0.1:3000` (cookie `refresh_token` chỉ gửi cùng host).
- `apps/api/.env` cũ thiếu `ADMIN_APP_URL`, `LEARNER_APP_URL`, `TERMS_VERSION` (API không khởi động); tài liệu kiểm ghi cách sửa.
- File CSV mẫu ghi đè nghĩa trùng từ + loại từ: chạy `learner:setup` trên DB riêng nếu DB có nội dung thật (đã làm vậy khi chạy thật).
- Chưa làm ở M1 (để mốc dùng tới): `Tabs`, dải tra từ, `Menu` chung, `useFormat.relativeDays`.

# M2 — as-built (23/10/2026)

Nhánh `feat/giao-dien-nguoi-hoc-m2` (cắt từ `origin/dev` @ `c5e2536`, sau khi M1 merge), PR #124. Task 12–21, một commit mỗi task, cộng
các commit sửa (test trước, sửa sau).

**Đã có:** API (c) `POST /v1/groups/{id}/items/bulk` nhận `sense_ids` (1–100, không kèm bộ lọc; trả thêm `skipped_not_found`); API (h)
`GET /v1/topics/suggestions` (vài cặp chủ đề × trình độ mỗi ngày cho từng người học, ≥10 nghĩa, 3 từ mẫu); Hôm nay (K/10, K/94); Danh sách nhóm,
tạo/đổi tên/xóa nhóm (K/16, K/16b, K/17, K/17b, K/10b, K/14); trang nhóm (K/11–K/13); Từ lâu chưa ôn (K/15); chọn từ theo chủ đề (K/18);
phiên ôn toàn màn (K/20–K/22, M/30–M/32; phím Space, 1, 2, Esc, Enter); e2e M2 (luồng, axe, không cuộn ngang với tên nhóm 60 ký tự và câu 280
ký tự); mục M2 của tài liệu kiểm; `SHOTS_MILESTONE=m2` chụp ảnh trên stack thật.

**Kiểm**
- Unit web 353/353; API (toàn bộ) xanh; e2e Worker (Docker): 153 passed, 15 skipped; CI PR #124 xanh 4/4.
- Cỡ Worker (gzip, `pnpm cf:docker --build`): tắt app (bản landing đang deploy) 2.963,24 KiB; **bật app (hết M2) 3.462,38 KiB, vượt gói Free
  (~3.072 KiB)**. Không chặn M2 (production build tắt app), nhưng trước khi bật `/app` trên production phải nâng gói Paid hoặc giảm cỡ
  (checklist Deploy).
- Chạy thật: API + worker + Postgres (DB riêng) + Redis + Mailpit, người học mới, nhóm tạo từ gợi ý Kinh doanh · B1 (113 từ); 132 ảnh.
- Reviewer mới (cả nhánh): 0 Critical, 8 Important, 15 Minor. Đã sửa cả 8 Important và nhãn trục biểu đồ tiếng Anh (test trước, sửa sau).
  Minor còn lại ghi trong ledger, chưa sửa.

**Khác plan / cần chủ dự án biết**
- Dạng chia ở mặt sau thẻ lấy từ trang từ `GET /v1/words/{lemma}` (hàng đợi không có dạng chia); chưa tải xong thì không hiện.
- K/22 bỏ câu "Ngày mai nhóm này có N thẻ đến hạn" (API không có số này). Câu "Thẻ cần ôn lại quay về ngăn 1 ngày…" chỉ hiện khi có thẻ cần ôn lại.
- Từ được tô trong câu: chữ xanh đậm như K/21, M/31 (ô "Câu bạn đã gặp" đã nền vàng). Áp cho cả xem trước thẻ ở trang nhóm.
- K/18: luôn gửi đúng danh sách nghĩa chưa học theo lô 100 (không dùng bộ lọc chủ đề), nên "Thêm cả N từ" thêm đúng N; ô "Thêm vào" chọn sẵn
  nhóm trùng tên chủ đề nếu đã có.
- Cho tới M3: tên từ ở trang nhóm là chữ thường (chưa có trang từ), và không có link "Xem mọi chủ đề trong Tra từ".
- Đổi câu trả lời sau khi mất mạng là một lần bấm mới (`review_id` mới): nếu lần trước thật ra đã tới API thì thẻ được ghi hai lần (hiếm).
- Dev server trong container đôi khi không thấy file vừa sửa hoặc giữ cache cũ (cả trang trả 404): tắt, `docker volume rm wordmet-dev-app-next`,
  chạy lại `pnpm dev:app`.

# M3 — as-built (23/10/2026)

Nhánh `feat/giao-dien-nguoi-hoc-m3` (cắt từ `origin/dev` @ `da92f9e`, sau khi M2 merge), PR #125. Task 22–27, cộng các commit sửa (test trước,
sửa sau).

**Đã có:** API (e) `GET /v1/senses/{id}/sentences` và `sentence_count` ở trang từ (GE1–GE5); dải tra dưới thanh trên ở mọi trang chính và trang
con (phím `/`); Tra từ (K/30, M/40) với bộ lọc trong đường dẫn, nút + mỗi dòng, thẻ xem trước; trang từ (K/31–K/33, M/41): dạng chia, "Là dạng chia
của …", định nghĩa, "Đang học", "Bạn đang học", "Cùng chủ đề", danh sách câu đã gặp; tấm Thêm từ (phím N, thanh trên, nút + điện thoại, ô "Thêm từ
vừa gặp" ở Hôm nay, [Thêm từ này]) với went → go, tự nhập nghĩa, nhóm dùng gần nhất, bộ chọn nhóm K/42–K/42c; thêm câu đã gặp (K/44, K/44b);
thêm cả loạt theo bộ lọc (K/43); link tên từ ở trang nhóm và "Xem mọi chủ đề trong Tra từ" bật lại; e2e M3; mục M3 của tài liệu kiểm.

**Kiểm**
- Unit web 399/399 (hai lần liền); API toàn bộ xanh; e2e Worker (Docker): 171 passed, 15 skipped, 2 flaky (hai test M1 chạy đầu lúc Worker
  còn khởi động nguội, chạy lại thì qua; các lần chạy trước không gặp).
- Cỡ Worker bật app (gzip): **3.706,34 KiB** (hết M2: 3.462,38), vượt gói Free thêm khoảng 634 KiB; bản tắt app không đổi đáng kể.
- API (e) chạy thật trên DB riêng: GE1 3 câu cũ trước và `sentence_count` 3, GE2 rỗng và 0, GE3 404, GE4 204 và số câu giảm; log không có chữ của câu.
- Reviewer mới: 0 Critical, 7 Important, 14 Minor. Đã sửa cả 7 Important, cộng 2 Minor nâng lên (tiêu đề từ dài làm trang cuộn ngang; nút
  "Lưu vào …" trong tấm không lưu) và một lỗi tự thấy khi xem ảnh (người học tiếng Anh thấy định nghĩa hai lần). Minor còn lại ghi trong ledger.

**Khác plan / cần chủ dự án biết**
- Không có API cho tổng số kết quả và cho từ gần nhau trong từ điển: Tra từ và trang từ bỏ "40 từ, đã bỏ qua 3 từ chức năng", "Còn 31 từ", khối
  "Từ gần trong từ điển"; "Thêm cả loạt" chỉ biết số từ sau khi thêm (thông báo đủ các số).
- "Thêm cả loạt" chỉ hiện khi có bộ lọc trình độ / chủ đề / loại từ và không có chữ tra hay "Chỉ từ của tôi" (body không nhận hai thứ đó; body rỗng
  sẽ thêm cả từ điển).
- "Dùng gần đây" chỉ có nhóm dùng gần nhất (một khóa `wordmet-web.last-group` như plan).
- Chữ "Tra trong 7.799 từ" giữ như bản chữ dù con số không được tính.
- Dev server trong container có lúc ghi hỏng `prerender-manifest.json` khi hai trang biên dịch cùng lúc (mọi trang 500); tài liệu kiểm mục 0.5 ghi
  cách xử lý.
