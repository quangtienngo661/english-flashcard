# Decisions — Sửa thiếu sót Bước 0–3

Ngày: 20/10/2026. Đi kèm design doc [`../specs/2026-10-20-buoc-0-3-fixes-design.md`](../specs/2026-10-20-buoc-0-3-fixes-design.md).
File này gom **mọi quyết định** của buổi brainstorm 20/10/2026 (bắt đầu từ review
[`../reviews/2026-10-20-buoc-0-3-review.md`](../reviews/2026-10-20-buoc-0-3-review.md)): mỗi quyết định có bối cảnh, **mọi phương án đã đưa ra trong
chat** với trade-off, phương án chọn, và các vòng nếu đổi. Design doc mô tả *cách làm*; file này trả lời *tại sao và đã bỏ gì*.

**Nhãn:** ✅ = phương án được chọn. **Ai chốt:** "Chủ dự án" = chọn trực tiếp trong chat; "Claude, chủ dự án nhờ" = chủ dự án bảo Claude đề xuất;
"Duyệt cùng design" = Claude đề xuất khi trình một phần design, chủ dự án duyệt cả phần. Luật hỏi: chủ dự án trả lời trước, Claude đề xuất sau (giữ từ
Bước 3, D27 Bước 4). Câu hỏi viết trong chat, không dùng hộp chọn. Theo yêu cầu "hỏi một lượt đi rồi mình trả lời một lượt", câu 14–27 được hỏi gộp một
tin.

## Tóm tắt

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| D1 | Chia việc | Một design, một plan (a); plan chia mốc, phần nền trước | Chủ dự án; thứ tự duyệt cùng design |
| D2 | Họ tên | Hai ô "Họ", "Tên" (c), chỉ để nhận diện | Chủ dự án |
| D3 | Ngày sinh | Đầy đủ, bắt buộc (a) | Chủ dự án |
| D4 | Tuổi tối thiểu | 13, không hỏi cha mẹ | Chủ dự án (ba vòng) |
| D5 | Đồng ý điều khoản | Một ô tick, cột trên `users` (a) | Chủ dự án |
| D6 | Khóa tài khoản | `admin` khóa/mở, trễ ≤ 15 phút (a) | Chủ dự án |
| D7 | Tra cứu người học | Danh sách tìm một phần (a) | Chủ dự án |
| D8 | Giao diện | Chỉ API (a) | Chủ dự án |
| D9 | Lưu người thao tác nội dung | Cột, lần gần nhất (a) | Chủ dự án |
| D10 | N6, N7, N8, N9 | Không, không, không cần, Bước 8 | Chủ dự án |
| D11 | Phạm vi lỗi code | Cao + Trung bình (+ CT5/CT6); Thấp để sau | Chủ dự án (hai vòng) |
| D12 | Cách sửa C1 | Giữ chỗ → làm → ghi kết quả (a) | Claude, chủ dự án nhờ |
| D13 | Test | Smoke, xóa 3 file bỏ quên (d) | Chủ dự án |
| D14 | Upload lại dòng đã nhập (T3) | `unchanged` (a) | Chủ dự án |
| D15 | Admin: API lỗi tạm thời (T8) | Giữ người dùng lại (a) | Chủ dự án |
| D16 | Admin: đăng xuất thất bại (T9) | Xóa phiên trên máy, báo "Thử lại" (a) | Chủ dự án |
| D17 | Job publish gặp nghĩa đã gỡ (PL4) | Bỏ qua, ghi lý do (a) | Chủ dự án |
| — | Câu 14–18, 21–24, 26, 27 | **Rút lại, chưa chốt** (thuộc lỗi mức Thấp, D11) | — |

## D1 — Chia việc

Bối cảnh: phạm vi gồm ba cụm khá độc lập: A tài khoản (N1, N2, N4–N7), B nội dung (N3, T1, T2, T4), C lỗi nền (C1, C2, C3, T5, R3, PX4).

| Phương án | Trade-off |
|---|---|
| ✅ (a) Một design chung cho cả 3 cụm, một plan | Một lần duyệt; design dài, lâu hơn mới tới lúc code |
| (b) Hai đợt: A + B trước, C sau | Hai lượt brainstorm/plan; nền sửa sau nên route mới có thể phải sửa lại |
| (c) Ba đợt riêng | Mỗi đợt nhỏ, nhiều vòng duyệt |
| (d) C trước, rồi A + B | Nền vững trước khi thêm route mới; hai đợt |

✅ Chủ dự án: "a". Claude đồng ý, đề xuất plan chia mốc và **làm C trước** (route mới của A/B đi qua chống gửi trùng và múi giờ); duyệt cùng phần 5 của
design.

## D2 — Họ tên

Bối cảnh: tên có thể dùng ở lời chào trong app, email nhắc học và màn admin. Một ô "Họ và tên" thì app phải đoán tên gọi (đúng với tên Việt, sai với
"John Smith"). Bước 8 sẽ lấy tên từ Google.

| Phương án | Trade-off |
|---|---|
| (a) Một ô "Họ và tên", bắt buộc | Form gọn; đoán tên gọi sai với tên kiểu Anh |
| (b) Một ô "Họ và tên", không bắt buộc | Đăng ký nhanh; admin có thể không nhận diện được người dùng |
| ✅ (c) Hai ô "Họ" và "Tên" | Rõ ràng, không phải đoán; thêm một ô |
| (d) "Họ và tên" + "Tên gọi" | Linh hoạt nhất; nhiều ô nhất |

✅ Chủ dự án: "(c) … tuy nhiên chỉ để hiển thị để biết nhận dạng, không dùng để gửi mail hay để chào". Claude đồng ý, đề xuất (duyệt khi chủ dự án trả
lời câu sau mà không phản đối, và duyệt lại ở phần 1): "Tên" bắt buộc, "Họ" không bắt buộc; 1–50 ký tự; sửa được trong hồ sơ; tài khoản cũ để trống.
Staff phải nhập tên — **đổi ở D8** thành không bắt buộc với staff.

## D3 — Ngày sinh

Bối cảnh: dùng để chặn tuổi tối thiểu và nhận diện thêm khi trùng tên. Giữ càng chi tiết thì trách nhiệm bảo vệ càng nặng (`ASSUMPTION`: chưa đọc luật
về nhóm dữ liệu nhạy cảm).

| Phương án | Trade-off |
|---|---|
| ✅ (a) Ngày sinh đầy đủ, bắt buộc; dưới X tuổi không cho đăng ký | Chặn tuổi chính xác; lưu dữ liệu cá nhân chi tiết nhất |
| (b) Đầy đủ, không bắt buộc + ô tick "Tôi đủ X tuổi" | Ít dữ liệu bắt buộc; ngày sinh có thể thiếu |
| (c) Chỉ năm sinh, bắt buộc | Ít dữ liệu; chặn tuổi theo năm, lệch tới gần một năm |
| (d) Không lưu ngày sinh, chỉ tick "đủ X tuổi" | Ít dữ liệu nhất; không có ngày sinh để nhận diện |

✅ Chủ dự án: "(a) … tìm hiểu mốc tuổi cho app học tiếng Anh, mình đề xuất 13". Mốc tuổi thành D4.

## D4 — Tuổi tối thiểu (ba vòng)

**Vòng 1** — Claude tìm hiểu (nguồn đã đọc 20/10): Luật Trẻ em 2016 Điều 1 (trẻ em dưới 16); Luật BVDLCN 2025 Điều 24 khoản 2 (người đại diện thực hiện
quyền của chủ thể dữ liệu thay trẻ em); Nghị định 356/2025 (đồng ý phải rõ ràng, bên kiểm soát tự chứng minh); Duolingo (13 ở Mỹ); Google Play Families
(nhắm dưới 13 thì chịu chính sách chặt hơn). Claude khác ý một phần:

| Phương án | Trade-off |
|---|---|
| Mốc 16 (Claude nghiêng về) | Không cần luồng cha mẹ; mất nhóm học sinh 13–15 |
| Mốc 13 + cha mẹ xác nhận qua email cho 13–15 | Giữ nhóm 13–15, đúng cách đọc luật của Claude; phạm vi lớn (luồng email, trạng thái chờ) |

Chủ dự án: "mình thấy các app được đăng ký ở VN cũng có 12-13 tuổi, bạn xem thử".

**Vòng 2** — Claude đọc điều khoản: Prep (không đặt tuổi tối thiểu; trẻ dưới 16 dùng "thông qua sự đồng ý của cha, mẹ"; người dùng tự khai tuổi), ELSA
Speak (từ 13; dưới 18 "with the involvement of a parent or guardian"); Zalo không đọc được. Claude đồng ý mốc 13:

| Phương án | Trade-off |
|---|---|
| (a) 13 + ô tick "cha mẹ đã đồng ý" cho 13–15 (Claude đề xuất) | Như Prep/ELSA; bằng chứng yếu (trẻ tự tick) |
| (b) 13 + cha mẹ xác nhận qua email | Bằng chứng mạnh; phạm vi lớn |
| (c) 16 | Gọn; mất nhóm 13–15 |

**Vòng 3** — ✅ Chủ dự án: "chỉ cần 13 thôi" → mốc 13, **không** ô tick cha mẹ. Claude đồng ý, ghi rủi ro: không có dấu vết cha mẹ đồng ý cho 13–15
(`ASSUMPTION` về cách đọc luật, cần luật sư trước ra mắt); trang Điều khoản ghi câu "dưới 16 cần cha mẹ đồng ý" như ELSA, không cần code.

## D5 — Đồng ý điều khoản

Bối cảnh: Nghị định 356 yêu cầu đồng ý rõ ràng (tick, không tick sẵn) và bên giữ dữ liệu tự chứng minh. Ví dụ Lan đồng ý bản "2026-10-20", tháng 12 điều
khoản đổi bản "2026-12-01".

| Phương án | Trade-off |
|---|---|
| ✅ (a) Một ô tick bắt buộc; lưu thời điểm + phiên bản trên `users`; đổi phiên bản không bắt đồng ý lại | Gọn; chỉ biết lần đồng ý đầu |
| (b) Hai ô tick (Điều khoản; Chính sách) | Tách bạch; thêm một ô |
| (c) Như (a), bảng lịch sử riêng, bắt đồng ý lại khi đổi phiên bản | Đủ lịch sử; thêm bảng và luồng đồng ý lại |
| (d) Không tick, chỉ dòng chữ "Bằng việc đăng ký…" | Gọn nhất; không phải đồng ý rõ ràng |

✅ Chủ dự án: "a". Claude đề xuất: server ghi phiên bản từ cấu hình `TERMS_VERSION` (client chỉ gửi "đã tick"); staff và tài khoản cũ để trống.

## D6 — Khóa tài khoản

Bối cảnh: `users.status` có nhưng không nơi nào kiểm; admin không chặn được tài khoản lạm dụng. `access token` sống 15 phút, server không tra DB mỗi lần.

| Phương án | Trade-off |
|---|---|
| ✅ (a) Admin khóa/mở; thu hồi mọi phiên, từ chối đăng nhập và refresh, giữ dữ liệu, lưu lý do và người khóa; trễ ≤ 15 phút | Không thêm tải DB; người bị khóa còn dùng route học tối đa 15 phút |
| (b) Như (a), chặn ngay (đọc DB mỗi request) | Chặn tức thì; thêm một lần đọc DB mỗi request |
| (c) Như (a)/(b) + email báo người bị khóa | Minh bạch; thêm email |
| (d) Chưa làm | Không tốn; vẫn không chặn được |

✅ Chủ dự án: "a" (không trả lời phần `editor`). Claude đề xuất: chỉ `admin` (`roles.manage`); không khóa chính mình hay một `admin`; OTP và đặt lại mật
khẩu của người bị khóa không gửi gì, trả như email không tồn tại; trạng thái `active`/`locked`. Phần 1 của design thêm: đăng nhập **đúng** mật khẩu khi bị
khóa → 403 `account-locked` (duyệt cùng phần 1).

## D7 — Tra cứu người học

Bối cảnh: admin chỉ tìm được bằng **đúng** email, và chỉ thấy email, xác minh, vai trò.

| Phương án | Trade-off |
|---|---|
| ✅ (a) Trang danh sách: tìm một phần email/họ tên, lọc trạng thái, hiện ngày tạo, lần cuối hoạt động… | Đủ cho hỗ trợ người dùng; thêm route và truy vấn tìm kiếm |
| (b) Giữ tìm đúng email, trả thêm thông tin | Nhỏ; phải biết đúng email |
| (c) Chưa làm | Không tốn; hỗ trợ khó |

✅ Chủ dự án: "a". Claude đề xuất: chỉ `admin`; tìm từ 2 ký tự, không phân biệt hoa thường; mới nhất trước, 20/trang; ngày sinh chỉ ở trang chi tiết.

## D8 — Giao diện

Bối cảnh: app người học chưa có (kể cả form đăng ký); admin web có nhưng sẽ làm lại toàn bộ; Bước 4–5 chỉ làm API.

| Phương án | Trade-off |
|---|---|
| ✅ (a) Chỉ API | Nhỏ nhất; chỉ thử được bằng smoke |
| (b) API + màn admin (danh sách, khóa, họ tên) | Admin dùng được ngay; làm giao diện sắp bị làm lại |
| (c) (b) + form đăng ký tạm trong `apps/web` | Thử tay được; thêm giao diện tạm |

✅ Chủ dự án: "a". Claude nêu hệ quả, duyệt cùng phần 1: họ tên của staff tạm **không bắt buộc** (admin web hiện tại không gửi; đổi đề xuất ở D2); đăng
ký người học bắt buộc ngay dù phá vỡ quy ước "v1 chỉ thêm" (SR7), vì chưa có người dùng thật; sửa test thật của admin và 3 script smoke cho khớp.

## D9 — Lưu người thao tác nội dung (N3)

Bối cảnh: chỉ biết ai **viết** bản nháp; publish, review, gỡ, retire không lưu người làm (`publishItem(_actorId)` bỏ đi).

| Phương án | Trade-off |
|---|---|
| ✅ (a) Thêm cột vào bảng có sẵn, chỉ lần gần nhất | Gọn; không có lịch sử nhiều lần |
| (b) Bảng lịch sử riêng + API xem lịch sử | Đủ mọi lần; thêm bảng, API |
| (c) Chỉ log máy chủ có `actor_id` | Không đổi DB; phải lục log |

✅ Chủ dự án: "a". Claude đề xuất các cột (`reviewed_by/at`, `published_by`, `state_changed_by/at`), job publish ghi người tạo job, API chi tiết nghĩa trả
thêm; duyệt cùng phần 2.

## D10 — N6, N7, N8, N9

| Điểm | Phương án đưa ra | Chủ dự án |
|---|---|---|
| N6 Xem/đăng xuất thiết bị | Có / không | ✅ "không" |
| N7 Đổi email | Có / không | ✅ "không" |
| N8 Chuyển lịch ôn khi nghĩa bị thay | Có / không | "thì từ được ôn theo id của nó, thì đổi nghĩa bản chất chỉ là cập nhật lại thôi, sao lại ảnh hưởng lịch" |
| N9 Xóa tài khoản | Kéo lên đợt này / Bước 8 | ✅ "bước 8" |

N8: Claude giải thích hai đường sửa nghĩa: **sửa** (revision mới, cùng id → lịch ôn giữ nguyên, đúng ý chủ dự án) và **thay nghĩa** (CR17, id mới, chỉ
khi nghĩa cũ là khái niệm khác hẳn → nhãn "nghĩa đã đổi"). Ví dụ minh họa ban đầu của Claude ("dịch sai") gây hiểu nhầm vì đó là đường sửa. ✅ Không làm
N8; chủ dự án không phản đối và chuyển sang câu sau.

## D11 — Phạm vi lỗi code (hai vòng)

**Vòng 1:**

| Phương án | Trade-off |
|---|---|
| (a) Chỉ 9 lỗi đã liệt kê (C1, C2, C3, T1, T2, T4, T5, R3, PX4) | Nhỏ |
| (b) (a) + T3 (cần chốt luật) | Thêm một câu hỏi |
| ✅ (c) (b) + khoảng 40 lỗi mức Thấp | Đợt sửa to gấp mấy lần |
| (d) (b) + một số lỗi Thấp chủ dự án chọn | Phải liệt kê để chọn |

✅ Chủ dự án: "toàn bộ lỗi soát được". Claude hiểu gồm cả admin web và Bước 4, mục chỉ kiểm được khi Deploy đưa vào checklist; chạy 4 agent kiểm kê lại
từng lỗi trên code hiện tại (bảng ở `../reviews/2026-10-20-buoc-0-3-review-evidence/`). Claude kiểm thêm: 3 file test cần DB không được config nào chạy.

**Vòng 2:** chủ dự án hỏi "mấy cái lỗ hỏng bạn tìm ra nó có ảnh hưởng gì không". Claude trả lời theo mức: hiện chưa ảnh hưởng ai (chưa deploy); khoảng 20
lỗi Cao/Trung bình ảnh hưởng thật khi ra mắt; khoảng 60 lỗi Thấp hiếm gặp, để sau không gây hại thật; hỏi giữ "toàn bộ" hay thu hẹp. ✅ Chủ dự án: "vậy các
lỗi nhỏ khoan hả handle" → phạm vi: Cao + Trung bình, cộng CT5/CT6 (đã ảnh hưởng chấm bài Practice), T6; T7 giữ theo D39 Bước 4; T12, AD12 vào checklist
Deploy.

## D12 — Cách sửa C1 (chống gửi trùng)

Bối cảnh: key và handler ở hai connection → ≥ 10 request đồng thời đều 500; handler chậm quá hạn → chạy lần hai (probe 18/10). 22 route dùng (nay 25).

| Phương án | Trade-off |
|---|---|
| ✅ (a) Ghi "đang xử lý" và commit, chạy handler, ghi "đã xong" | Một connection mỗi lúc, sửa một chỗ chung; khe nhỏ: server sập đúng giữa "làm xong" và "ghi đã xong" có thể ra bản trùng khi làm lại với key mới |
| (b) Ghi key và chạy handler trong cùng một transaction | Không bao giờ trùng; sửa cả 22 route; giữ DB suốt thao tác chậm |
| (c) Chỉ tăng pool và đặt thời gian chờ | Nhanh; chỉ đẩy lùi lỗi 500, không chữa chạy hai lần |

✅ Chủ dự án: "bạn đề xuất chỗ này đi". Claude chọn (a): Bước 7 gọi AI trong request (vài giây), (b) sẽ giữ connection suốt lúc chờ AI và cạn pool lại; (b)
phải sửa 22 route. Lệch design Bước 0 (B0#2) có lý do này. Kèm: đặt rõ pool, giữ chỗ có hạn, đọc trong transaction qua `tx` (PX4).

## D13 — Test

Bối cảnh: D38 Bước 4 bỏ e2e backend (RAM máy dev, CI ~8,6 phút). Nhiều lỗi đợt này (C1, T1, T2) chỉ chứng minh được trên DB thật.

| Phương án | Trade-off |
|---|---|
| (a) Bộ test nhỏ với Postgres thật trên CI | Bắt lỗi quay lại; CI chậm thêm vài phút (`ASSUMPTION`) |
| (b) Bộ test như (a), chạy tay | CI không chậm; phải nhớ chạy |
| (c) Không thêm test DB; smoke trên DB mới | Như Bước 4–5; không có lưới trên CI |
| ✅ (d) (c) + xóa 3 file test bỏ quên | Gọn; như (c) |

✅ Chủ dự án: "d". Claude bổ sung: unit test cho phần logic; một smoke riêng mỗi lỗi một ca có tên, gồm cả ca của 3 file sắp xóa. Rủi ro ghi lại: smoke
không chạy trên CI.

## D14 — Upload lại dòng đã nhập (T3, PL2)

Bối cảnh: nhập `tu-moi.csv`, An sửa ví dụ trên admin, upload lại đúng file → code tạo nháp mang nội dung cũ, "Publish lô này" xóa bản sửa của An. Design
B2E6 nói báo "không đổi". Sửa kiểu "bỏ qua theo key" đơn giản có thể mở lại H1 (dạng chia không khôi phục).

| Phương án | Trade-off |
|---|---|
| ✅ (a) Báo `unchanged`, không đụng nội dung; đưa nội dung lên bằng file export có `revision` | Đúng design; muốn đè phải dùng file export |
| (b) Giữ như hiện tại | Không đổi code; mất bản sửa tay âm thầm |
| (c) Loại dòng đó với lý do "đã sửa tay" | An toàn, rõ; báo "bị loại" cho file không đổi |
| (d) Tạo nháp có cảnh báo, "Publish lô này" bỏ qua | Giữ nháp để xem; thêm trạng thái cảnh báo |

✅ Chủ dự án: "a". Claude đề xuất cách làm (row key `content` có hash, như D13 Bước 2), dạng chia giữ luật H1; duyệt cùng phần 2 (chủ dự án xác nhận hai
luật ngược nhau: nội dung giữ bản mới hơn, dạng chia khôi phục theo file).

## Câu 14–27 (hỏi gộp một tin)

Sau khi phạm vi thu hẹp (D11 vòng 2), Claude rút 11 câu thuộc lỗi mức Thấp; chỉ còn câu 19, 20, 25.

### D15 — Admin: API lỗi tạm thời (câu 19, T8 = AD1)

| Phương án | Trade-off |
|---|---|
| ✅ (a) Giữ người dùng lại: dải "Mất kết nối máy chủ — Thử lại"; chỉ đá ra khi server nói rõ phiên hết hạn; mở trang lúc API lỗi → màn chờ có nút thử lại | Không mất phiên khi deploy; đổi design 2.5 §5 |
| (b) Giữ như hiện tại | Không đổi; mọi tab bị đá ra mỗi lần API khởi động lại |

✅ Chủ dự án: "a". Claude đồng ý.

### D16 — Admin: đăng xuất thất bại (câu 20, T9 = AD2)

| Phương án | Trade-off |
|---|---|
| ✅ (a) Vẫn xóa phiên trên máy, báo "Chưa đăng xuất được khỏi máy chủ — Thử lại" | Người dùng biết và tự xử lý |
| (b) Như (a) + tự thử lại vài lần | Ít thao tác tay; thêm logic thử lại |
| (c) Không cho rời trang tới khi đăng xuất thành công | Chắc chắn nhất; kẹt khi server lỗi lâu |

✅ Chủ dự án chọn (a). Claude đồng ý.

### D17 — Job publish gặp nghĩa vừa bị gỡ (câu 25, PL4)

| Phương án | Trade-off |
|---|---|
| ✅ (a) Bỏ qua nghĩa đó, ghi lý do trong báo cáo | Không mở lại thứ staff vừa gỡ; muốn hiện lại phải publish tay |
| (b) Vẫn publish (mở lại) | Không đổi code; mở lại nghĩa vừa gỡ |

✅ Chủ dự án chọn (a). Claude đồng ý; design làm rõ: bỏ qua mọi nghĩa đang `unpublished`, không phân biệt trước hay sau lúc chụp (FE21).

### Câu đã rút lại (chưa chốt; hỏi lại ở đợt lỗi Thấp)

| Câu | Mã | Phương án đã đưa ra |
|---|---|---|
| 14 | ID4 khóa đăng nhập bị giữ liên tục | (a) chấp nhận, sửa câu B1E3; (b) khóa theo (tài khoản, IP); (c) đặt lại mật khẩu thành công thì vào thẳng app; (d) thời gian chờ tăng dần |
| 15 | FD8 gửi lại sau lỗi do dữ liệu | (a) giữ code (nhả key), sửa SR8; (b) lưu lỗi 4xx và trả lại |
| 16 | CT9 giới hạn từ riêng | (a) đếm theo từ + trần nghĩa mỗi từ; (b) đếm tổng nghĩa; (c) giữ nguyên |
| 17 | L11 gợi ý "dùng bản catalog" | (a) API trả gợi ý; (b) không gợi ý |
| 18 | P1 xuất "từ chưa có nghĩa" | (a) nâng giới hạn riêng; (b) bắt chọn level + "không có level"; (c) cả hai |
| 21 | LN4 đếm từ của nhóm | (a) cả hai chỗ đếm từ còn học được + dòng "nghĩa đã đổi"; (b) cả hai đếm mọi từ; (c) giữ như hiện tại |
| 22 | LN5 "Đã biết" hai lần qua nửa đêm | (a) sửa câu design; (b) bấm lại trong vài phút coi là ôn sớm |
| 23 | ID8 token đăng nhập cũ | (a) chỉ thêm index; (b) xóa token cũ sau N ngày |
| 24 | DB12 Pipeline đọc bảng Content | (a) ngoại lệ ghi vào design; (b) chuyển sang `ContentService` |
| 26 | AD-403 không gửi lại request | (a) gửi lại một lần sau khi làm mới phiên; (b) không gửi lại |
| 27 | PX5 thứ tự "quá hạn trước" | (a) đã học trước, từ mới sau; (b) từ mới trước; (c) giữ như hiện tại |

## Đề xuất kỹ thuật duyệt cùng design

Chủ dự án duyệt năm phần trong chat ("ok phần 1 được" … "ok phần 5 được, viết design đi").

| Phần | Chọn | Bỏ | Vì sao |
|---|---|---|---|
| 1 | Tuổi tính theo múi giờ của request; sinh 29/02 đủ tuổi từ 01/03 | Giờ VN cố định; 28/02 | Khớp "hôm nay" của người dùng; chọn mốc muộn cho chắc |
| 1 | Ngày sinh không sửa qua API | Cho sửa | Mốc tuổi không bị lách |
| 1 | Người bị khóa, đúng mật khẩu → 403 `account-locked` | 401 như sai mật khẩu | Người dùng thật biết lý do; kẻ dò email không thấy |
| 1 | Danh sách người dùng cùng path `GET /v1/admin/users`, nhánh `email` cũ giữ | Path mới | Admin web hiện tại không hỏng |
| 2 | Nháp mới dựng trên bản gần nhất chưa bị bác | Dựng trên bản mới nhất | Không mang theo nội dung bị bác |
| 2 | Revert giữ entry đang dùng (dạng chia đã duyệt, `form_of`, level đã xác nhận) | Xóa như cũ | Không mất dữ liệu người học |
| 2 | Lọc đáp án nhiễu theo chữ trên mọi nghĩa thấy được | Theo từng nghĩa trong nhóm | Đề chỉ hiện chữ |
| 2 | Chấm câu điền từ bỏ dấu chấm cuối | So nguyên văn | `a.m` và `a.m.` cùng đúng |
| 3 | Giữ chỗ có hạn, bỏ `Promise.race`; pool qua biến môi trường | Giữ race | Không còn chạy lần hai khi chậm |
| 3 | Múi giờ lưu tên chuẩn; từ chối `+07:00`; bộ nhớ đệm có trần; script chuẩn hóa | Lưu nguyên văn | C2 |
| 3 | Log 500: tên, mã, route mẫu, stack không kèm thông báo | Cả thông báo | SR10 |
| 3 | Điều kiện thấy được đặt lên `entries` + index `lower(lemma)`, `senses(entry_id)` | Giữ truy vấn | T5 |
| 4 | Dùng lại dải offline và khóa nút `Retry-After` có sẵn | Viết mới | Ít code, cùng hành vi |
| 4 | Lỗi lạ hiện `operation_id` có nút chép; test kiểm chữ hiển thị | Kiểm key | T10, test B25#19 xanh giả |
| 5 | Thứ tự M1 nền → M2 tài khoản, M3 nội dung (song song được) → M4 admin → M5 kiểm | Tài khoản trước | Route mới dựa trên nền đã sửa |

Bốn đề xuất thêm khi viết design (revision bị bác luôn tạo revision mới; khóa dòng khi revert chạy đua với tạo từ riêng; khóa tài khoản vô hiệu OTP;
`CHECK` cho `users.status`) nằm ở design §12; chủ dự án duyệt khi đọc bản viết ("ok duyệt, chọn a, commit rồi viết plan", 20/10).
