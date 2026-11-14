# Bước 4 — plan tóm tắt (18/10/2026)

Ảnh chụp lúc trình plan, chưa duyệt. Plan đầy đủ: [`../superpowers/plans/2026-10-18-buoc-4-practice.md`](../superpowers/plans/2026-10-18-buoc-4-practice.md);
design: [`../superpowers/specs/2026-10-18-buoc-4-practice-design.md`](../superpowers/specs/2026-10-18-buoc-4-practice-design.md).
Plan **chỉ có API** (D24); giao diện làm ở đợt sau.

**Không còn câu chờ chủ dự án.** Cách làm: các phiên Claude implement song song, một phiên điều phối (D29). "Xong khi": xong mọi task,
CI xanh trên mọi PR và `pnpm smoke:buoc-4` chạy qua API thật trên DB mới (D28).

**Luồng làm song song:** A Nền tảng (1–2) · B Learning (3–5) · C Content (6–7) · D Bài luyện (8–17) · E Báo lỗi và dọn dữ liệu
(18–19) · F Kiểm cuối (20). A, B, C và phần đầu của D (8–12) chạy cùng lúc từ ngày đầu, mỗi luồng một database local riêng; D chờ A, B
và C ở task 13; E chạy khi PR đầu của D xong; F chạy sau cùng.

**Sửa sau review plan (18/10):** đã sửa đủ 29 điểm của
[review](../superpowers/reviews/2026-10-18-buoc-4-plan-review.md); số task giữ nguyên. Thay đổi chính: phần "trần từ ôn để trống"
chuyển từ task 1 sang task 5 để PR đầu không vỡ build; thêm luật thứ tự khóa chung để tránh deadlock; xóa từ riêng đang hiện thì phiên
nhớ để lần tải lại báo "Không tìm thấy"; định nghĩa cách lưu đáp án trắc nghiệm, đúng/sai; kiểm cuối dùng database mới riêng, không
xóa dữ liệu local.

**M1 — Nền móng (luồng A, B, C, D)**
1. Thêm 8 cài đặt nhóm `practice`; cho số lần làm lại để trống; số câu mặc định không vượt số câu tối đa.
2. Thêm giới hạn tần suất riêng cho lúc làm câu (120 lần/phút) và module kiểm quyền tạm, luôn "được phép".
3. Learning cho Practice đọc danh sách từ theo 5 nguồn, các từ cùng nhóm và trạng thái một từ.
4. Learning ghi "Cần ôn tập", "Đã biết" từ bài luyện (không gắn nhóm, không tính trần); thêm "cổng" xóa dữ liệu luyện khi xóa từ riêng.
5. Cho trần từ ôn để trống (cài đặt và code Learning cùng một lần sửa); để trống thì không giới hạn (D35).
6. Content cho Practice đọc chi tiết nghĩa: nghĩa, định nghĩa, câu ví dụ, cách viết được chấp nhận, dạng chia, cờ từ chức năng.
7. Hàm che từ trong câu ví dụ (phân biệt hoa thường, chỉ nhận câu mà từ xuất hiện đúng một dạng).
8. Bảng dữ liệu và module Practice, cùng các hằng số cố định.
9. Chuẩn hóa và so khớp đáp án gõ.
10. Chọn đáp án nhiễu, chọn dạng bài, dựng gợi ý.
11. Sắp xếp từ theo 8 cách và xáo các vòng ôn lại.
12. Luật "từ hay sai" (2 sai trong 5 lượt được tính).

**M2 — Luồng bài luyện (luồng D)**
13. Dựng câu hỏi: trắc nghiệm và đúng/sai theo nghĩa, gõ từ theo nghĩa hoặc theo câu (D34).
14. Phiên luyện: mở phiên, tải lại, câu tiếp theo, "Ôn lại thêm không?", Dừng, tự đóng phiên bỏ ngang; xử lý từ bị gỡ/xóa giữa phiên.
15. Chấm đáp án, làm lại khi gõ sai, Bỏ qua, gợi ý.
16. Nút "Cần ôn tập", "Đã biết", trang tổng kết và "Đưa tất cả vào ưu tiên".
17. API "từ hay sai" và lịch sử lọc theo ngày.

**M3 — Báo lỗi và dọn dữ liệu (luồng E)**
18. Báo lỗi cho người học và màn danh sách cho staff qua API; che từ riêng trong bản sao (D36).
19. Job dọn dữ liệu cũ hơn số tháng lịch sử, đóng phiên bỏ ngang, xóa dữ liệu luyện khi xóa từ riêng.

**M4 — Kiểm cuối**
20. Test xuyên luồng (báo lỗi câu có từ riêng, xóa từ riêng đang hiện), script `smoke:buoc-4` trên database mới riêng, lệnh chạy job
    dọn bằng tay, chạy đủ test, ghi as-built và báo chủ dự án.

# Bước 4 — as-built (19/10/2026)

Design: [`2026-10-18-buoc-4-practice-design.md`](../superpowers/specs/2026-10-18-buoc-4-practice-design.md) (mục 0 có ghi chú as-built);
decisions D1–D42: [`2026-10-18-buoc-4-practice-decisions.md`](../superpowers/decisions/2026-10-18-buoc-4-practice-decisions.md); plan:
[`2026-10-18-buoc-4-practice.md`](../superpowers/plans/2026-10-18-buoc-4-practice.md). **Chỉ API** (D24); giao diện làm ở đợt sau.

**Trạng thái:** 20 task (Task 20 tách 20a/20b theo D38) đã vào `dev` qua các PR dưới đây, mỗi PR CI xanh trước khi merge. Chưa lên `main`.
Làm bằng các phiên Claude song song và một phiên điều phối (D29), không dùng Codex.

| PR | Nội dung |
|---|---|
| #47 | Docs: design, decision record, plan |
| #49 | Luồng A (Task 1–2): 8 cài đặt `practice`, rate limit `practice.answer`, module `entitlements` tạm |
| #51 | Luồng C (Task 6–7): Content đọc cho Practice, che từ trong câu ví dụ |
| #50 | Luồng B1 (Task 3–4): Learning đọc theo 5 nguồn, ghi "Cần ôn tập"/"Đã biết" từ bài luyện, cổng xóa từ riêng |
| #48 | Luồng D1 (Task 8–12): bảng và module Practice, chấm, đáp án nhiễu, dạng bài, gợi ý, sắp xếp, "từ hay sai" |
| #52 | Luồng B2 (Task 5): trần từ ôn để trống = không giới hạn (D35) |
| #53 | Docs: D37 (đúng/sai không hiện nhãn ngữ cảnh) |
| #55 | Luồng E1 (Task 18–19): báo lỗi, danh sách staff (che từ riêng, D36), job dọn, phần xóa dữ liệu luyện khi xóa từ riêng |
| #54 | Luồng D2 (Task 13–17): dựng câu, phiên, trả lời, làm lại, bỏ qua, gợi ý, tổng kết, "từ hay sai", lịch sử |
| #56 | Docs: D38–D42 (bỏ e2e backend, "Xong khi" mới) |
| #57 | PR R (Task 20a): xóa bộ e2e backend, thêm bước kiểm migration khớp schema trên CI |
| PR F | Task 20b: `pnpm smoke:buoc-4`, `pnpm maintenance:run`, as-built này |

**Số test:**
- Unit API: **772** (69 file) sau PR F; 768 trên `dev` trước PR F; cuối Bước 3 là 681.
- E2e API: **đã bỏ theo D38** (PR R #57). Lần CI cuối còn e2e: PR D2 #54, run `39140676061` (`2a6be79`): unit 768 (68 file), e2e
  **843** (81 file), đo tải 2/2. Cuối Bước 3 là 688 e2e.
- CI sau PR R: job `api (lint, typecheck, build, unit, schema drift)` 1 phút 24 giây (run `39141811085`), trước đó ~8,6 phút.
  `web`, `admin`, `admin-e2e-real` giữ nguyên (D41).

**"Xong khi" (D28 đổi theo D38):**
1. CI xanh trên mọi PR.
2. `pnpm smoke:buoc-4` qua API và worker thật trên database mới `english_learning_smoke_b4` (drop rồi tạo lại, `pnpm db:setup`,
   `pnpm build`, `pnpm run:dev`): **ALL CHECKS PASSED**, 13 bước, 20 phiên, 46 câu trả lời, 37 giây (run id `7b1050af`, 19/10/2026).
   Chạy lại lần hai trên cùng database cũng qua (`cd4aaa5e`). Output đầy đủ: [`buoc-4-smoke-output.txt`](buoc-4-smoke-output.txt).
   Log API của lần chạy: không có dòng lỗi, không có chữ hay nghĩa của từ nào (SR9).

Smoke kiểm: 5 nguồn × 3 dạng bài; gõ từ theo câu (chỗ trống là dạng quá khứ: gõ dạng gốc → `try_again`, gõ đúng dạng → đúng, `tries` 2);
"Đã biết", "Cần ôn tập", bấm hành động khác → 409; phiên 2 từ, 4 câu với "Ôn lại"; gõ sai → `try_again` không lộ đáp án, tải lại thấy
`try_again`, Bỏ qua; gợi ý nấc 1 và 2; tổng kết và "đưa tất cả"; "từ hay sai"; lịch sử theo ngày và theo từ; báo lỗi (báo lại → 409), staff
xử lý, learner gọi API staff → 403; từ chỉ nằm trong nhóm 2 từ không có trắc nghiệm. Hai ca xuyên luồng trước là e2e: **B4#28/B4E48** (chọn
đáp án là từ riêng rồi báo lỗi: response staff không có chữ hay nghĩa của từ riêng, có "[từ riêng của người học]"; câu hỏi chính là từ
riêng: `reportable = false`, báo lỗi → 409 `report-not-available`) và **B4E8** (xóa từ riêng khi câu của nó đang hiện: `current` trả
`notice: word-not-found` kèm câu kế; dữ liệu luyện của từ đó bị xóa, đọc lại bằng `psql`). Dọn dữ liệu: lùi ngày bằng `psql`, chạy
`maintenance:run`, đọc lại: lần hỏi và phiên cũ hơn 6 tháng bị xóa, báo cáo đang mở còn với `item_id` null, phiên bỏ ngang 25 giờ →
`abandoned`.

Trước lần chạy chính thức, script được sửa 5 lần, đều là lỗi của script (kiểm từng chỗ với database và design, không phải lỗi sản
phẩm): câu ví dụ của 8 từ giống nhau; báo cáo đang mở làm lượt sai không tính vào "từ hay sai" (đúng mục 8); W7 nằm ở hai nhóm nên có
trắc nghiệm; từ riêng là từ cuối vòng 1 thì kế tiếp là "Ôn lại thêm không?" (đúng 7.2); hai email OTP gửi cách nhau vài ms, phải lấy mã
mới nhất.

**Đo tải (runner CI, trước PR R):**
- Mở phiên "Ôn tất cả", 100 nhóm × 2.000 từ, chỉ trắc nghiệm (Review Focus 2). Lần đầu trung vị 2.671 ms (D39). Run `39139235839`:
  trung vị 2.835 ms, trong đó `practiceItems('all')` của Learning ~2,0 s (≈ 75%), kiểm dạng bài ~0,6 s, `statsFor` ≤ 3 ms, sắp xếp
  ~60 ms. Run `39140676061`: trung vị 1.892 ms (`practiceItems` 1,4–1,6 s, kiểm dạng bài ~0,4 s). Ngưỡng 1 s không đạt; chấp nhận
  theo D39, đo lại bằng `pnpm test:scale` trước pilot.
- Learning `GET /v1/groups` (Review Focus 5): 227–352 ms.
- "Từ hay sai" với 6 tháng dữ liệu (Task 17): 29 ms.

**Chỗ lệch plan đã chấp nhận** (chi tiết trong body từng PR):
- A #49: khoảng cho phép của `default_questions_per_session` chưa có gợi ý cho giao diện admin.
- B #50: thêm `isDueNow`; `practiceCheck` coi nghĩa đã retire vẫn "trong việc học".
- C #51: `senseMeaning` dùng chung.
- D1 #48, D2 #54, E1 #55: danh sách trong body PR. Task 14 có test không chạy đỏ trước; Task 13–17 chỉ tự review.
- PR R #57: bước kiểm migration là `prisma migrate diff --from-config-datasource --to-schema prisma --exit-code --script` sau
  `pnpm db:setup` (database CI vừa migrate từ các migration đã commit), không phải `--from-migrations` + shadow database như plan. Prisma 7
  bỏ cờ `--shadow-database-url`; shadow database phải đặt trong `prisma.config.ts`, file plan không cho sửa. So sánh tương đương và đúng
  lệnh của test `schema-drift` e2e cũ; đã chứng minh exit 0 khi khớp, exit 2 khi thêm field không có migration. Phiên điều phối chấp nhận.
- PR F: hai commit (smoke + CLI, rồi docs) thay vì một.

**Bổ sung cho design:** mục 6 thêm 4 mã lỗi plan đặt (`entitlement-required`, `report-not-open`, `item-void`, `session-not-waiting`);
mục 7.7: gợi ý nấc 1 bằng câu ví dụ dùng luật khớp của 7.4b (phân biệt hoa thường); mục 16: số đo. Design Bước 3 mục 9: trần từ ôn để
trống = không giới hạn (D35).

**Rủi ro còn mở** (design mục 16, thêm phần thấy trong lúc làm):
- **Không còn test tự động chạm Postgres/Redis thật cho `apps/api`** (D38): SQL, khóa, chạy đua hai máy (B4E1, B4E2, B4E28, B4E29),
  `Idempotency-Key`, rate limit, kiểm quyền mọi route admin, job nền chỉ còn smoke (một người, dữ liệu nhỏ, chạy tuần tự), chạy tay và
  `admin-e2e-real`. Smoke **không** kiểm chạy đua.
- Mở phiên "Ôn tất cả" ở mức lớn nhất chậm hơn ngưỡng 1 s (D39), chủ yếu ở phần đọc mục học của Learning; chưa thử sửa.
- **Test nhắc học của Bước 3 chập chờn hai lần ngày 18/10, nguyên nhân chưa kiểm:** "two workers … exactly one email" ra 2 email (máy luồng
  C); "M7: a permanent SMTP error is tried once" ở run `39139235839` nhận 2 dòng (dòng đầu `sent`, `localDate` 2026-10-17, `sentAt`
  2026-10-17T13:30Z). Có thể là lỗi thật xử lý trùng của nhắc học. Bộ test này đã bị xóa theo D38, nên cần một lần kiểm riêng (chạy tay
  hai worker) trước pilot.
- Chạy smoke cạnh các phiên khác trên cùng Redis: đặt `JOB_QUEUE_PREFIX` riêng; không đặt thì worker của phiên khác có thể nhận job import
  của database này (lần chạy ở đây dùng `JOB_QUEUE_PREFIX=smoke-b4-f`).

**API mà đợt giao diện dựa vào:** design mục 6 (13 API người học dưới `/v1/practice`, 2 API staff dưới `/v1/admin/practice/reports`) và bảng
mã lỗi; hình dạng response đúng như smoke dùng (`apps/api/scripts/smoke-buoc-4.mjs`): `next` trả `{ state, session, item?, notice? }`,
`current` trả `{ session, item, notice? }`, câu trả lời cuối trả `result`, `correct`, `meaning`, `definition_en`, `show_known`,
`highlight_needs_review`.

**Chưa làm trong PR này:** `CLAUDE.md` (dòng trỏ tới file này, dòng CI/CD đổi theo D38, đoạn Local setup nói tới e2e) và
`docs/HANDOFF_2026-10-05_BUOC_0.md` §2: thuộc PR docs nhỏ của design §17.
