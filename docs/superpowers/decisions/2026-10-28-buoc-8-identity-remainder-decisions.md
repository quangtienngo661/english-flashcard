# Decisions — Bước 8: đăng nhập Google và xóa tài khoản

Ngày: 28/10/2026. Đi kèm design doc [`../specs/2026-10-28-buoc-8-identity-remainder-design.md`](../specs/2026-10-28-buoc-8-identity-remainder-design.md).
Câu hỏi và câu trả lời gốc: [`../reviews/2026-10-28-buoc-8-questions.md`](../reviews/2026-10-28-buoc-8-questions.md) (câu 1–24). Đề xuất của Claude, giải thích
lại và vòng chốt: [`../reviews/2026-10-28-buoc-8-qa-log.md`](../reviews/2026-10-28-buoc-8-qa-log.md) (câu 25 là câu mới ở vòng 1). Bằng chứng code:
[`../../preparation/BUOC_8_CODE_FACTS_2026-10-28.md`](../../preparation/BUOC_8_CODE_FACTS_2026-10-28.md). Research câu 12, 15:
[`../../preparation/TRIAL_AND_RETENTION_AFTER_DELETION_RESEARCH_2026-10-28.md`](../../preparation/TRIAL_AND_RETENTION_AFTER_DELETION_RESEARCH_2026-10-28.md).

**Nhãn:** ✅ = phương án được chọn. **Ai chốt:** "Chủ dự án" = chủ dự án trả lời trước và Claude đồng ý, hoặc chủ dự án giữ câu trả lời khác đề xuất;
"Chủ dự án (đề xuất của Claude)" = chủ dự án để trống, "bỏ qua", nhờ đề xuất, hoặc ghi "ok" cho đề xuất. Luật hỏi: chủ dự án trả lời trước, Claude đề xuất sau (D1).

## Tóm tắt

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| D1 | Luật hỏi | Chủ dự án trả lời trước, Claude đề xuất sau, cho mọi câu | Chủ dự án (đề xuất của Claude) |
| D2 | Màn hình nào | API + web người học + admin | Chủ dự án |
| D3 | Một hay hai design | Một design, một plan | Chủ dự án |
| D4 | "Xong khi" có Google thật không; ai implement | Đăng nhập Google thật ngay đợt này; các phiên song song + một phiên điều phối như trước | Chủ dự án |
| D5 | Nút Google ở đâu | Chỉ trang người học; phiên tạo bằng Google không dùng được cho route admin | Chủ dự án (phần thêm: đề xuất của Claude) |
| D6 | Người mới bấm Google | Màn "Bổ sung thông tin" sẵn có (thêm ô tên khi Google không trả tên); chỉ tạo tài khoản khi đã điền ngày sinh và đồng ý | Chủ dự án |
| D7 | Tên và ảnh từ Google | Lấy một lần khi tạo tài khoản; lấy cả link ảnh đại diện (chưa hiện ở đâu) | Chủ dự án |
| D8 | Gắn, gỡ Google trong Cài đặt | Không có nút; chỉ tự liên kết theo email (K8); một dòng chỉ đọc "Đăng nhập bằng"; đăng ký trùng email tài khoản Google báo đã tồn tại | Chủ dự án |
| D9 | Người học xác nhận xóa | Mật khẩu hoặc Google lại (D12 cũ, D25) + tick "Tôi hiểu…" + gõ lại email | Chủ dự án |
| D10 | Tải dữ liệu trước khi xóa | Không có | Chủ dự án |
| D11 | Đang có gói Pro | Đang tự gia hạn thì không cho xóa; thêm nút "Hủy gói" (= hủy gia hạn) cho người học; đã hủy gia hạn thì xóa được, mất ngày còn lại, không hoàn tiền | Chủ dự án |
| D12 | Dấu "đã dùng thử" sau khi xóa | Không giữ gì | Chủ dự án (đề xuất của Claude, sau research) |
| D13 | Thư xác nhận | Một thư "tài khoản đã được xóa" khi xong | Chủ dự án |
| D14 | Báo lỗi người học đã gửi | Giữ, bỏ tên người gửi, xóa ghi chú tự viết; báo lỗi về câu làm từ câu người học tự viết thì xóa hẳn | Chủ dự án (ngoại lệ: đề xuất của Claude) |
| D15 | Giao dịch tiền | Giữ, thay mã người bằng mã ẩn danh, bỏ sự kiện thanh toán thô; giữ N năm, N là cài đặt admin, mặc định 10 | Chủ dự án |
| D16 | Số liệu dashboard | Giữ dòng sổ lượt, thay mã người bằng một mã ẩn danh ngẫu nhiên | Chủ dự án (đề xuất của Claude) |
| D17 | Admin xóa người học | Chỉ admin, gõ lại email, cùng đường xóa; không ô lý do | Chủ dự án |
| D18 | Tài khoản nhân sự | Nhân sự không tự xóa; chỉ admin xóa; admin không tự xóa mình; không xóa admin cuối; chỗ "ai đã làm" hiện "Người dùng đã xóa" | Chủ dự án |
| D19 | Tài khoản chưa xác nhận email | Tự xóa sau N ngày, N là cài đặt admin, mặc định 7 | Chủ dự án |
| D20 | Trang web xin xóa (Google Play) | Để tới khi làm app Android | Chủ dự án |
| D21 | Bản sao lưu | Bước 8 giữ danh sách mã tài khoản đã xóa để xóa lại sau khi khôi phục; thời hạn backup chốt ở Deploy | Chủ dự án (đề xuất của Claude) |
| D22 | Web nói chuyện với Google | Chuyển trang qua API | Chủ dự án |
| D23 | Việc xóa chạy ở đâu | Trong request; lỗi thì để "đang xóa", việc định kỳ thử lại | Chủ dự án |
| D24 | Chặn "đang xóa" | Đọc DB mỗi request, áp cho cả tài khoản bị khóa | Chủ dự án |
| D25 | Tài khoản chỉ có Google xác nhận xóa | Giữ D12 cũ: một lần chọn lại tài khoản Google là đủ | Chủ dự án |
| D26 | Tự liên kết Google khi email không do Google quản lý (sau review) | **Để sau**: Bước 8 giữ K8; rủi ro ghi lại, xem trước khi ra mắt | Chủ dự án |
| D27 | Báo lỗi về từ riêng; câu trả lời trong bản chụp (sau review) | Báo lỗi về từ riêng xóa hẳn; báo lỗi còn lại để trống câu trả lời | Chủ dự án (27b khác đề xuất của Claude) |
| D28 | Gói `grace` / `on_hold` khi xóa (sau review) | Tính là "đang tự gia hạn": phải hủy gói trước | Chủ dự án |
| D29 | Đăng xuất có hiệu lực ngay (sau review, tùy chọn) | Có: guard kiểm cả chuỗi phiên đã thu hồi | Chủ dự án |
| D30 | Vết cấp gói của người bị xóa (sau review, tùy chọn) | Xóa theo ER16 | Chủ dự án |

---

## D1 — Luật hỏi (câu 1)

Bước 3–7 dùng luật "chủ dự án trả lời trước"; đợt cải thiện A và đợt admin dùng luật ngược lại. Phần 7 của bộ câu hỏi có ba câu kỹ thuật.

| Phương án | Trade-off |
|---|---|
| ✅ (a) giữ luật cho mọi câu | Chủ dự án tự nghĩ trước từng câu, kể cả câu kỹ thuật; chậm hơn |
| (b) Claude đề xuất trước mọi câu | Nhanh; chủ dự án dễ chỉ duyệt mà không tự nghĩ |
| (c) giữ cho câu sản phẩm, Claude đề xuất trước câu kỹ thuật | Cân bằng; phải phân loại từng câu |

Chủ dự án để trống hai vòng. Claude đề xuất (a) vì chủ dự án đã tự trả lời câu kỹ thuật 23 và câu mới 25; chủ dự án không phản đối.

## D2 — Màn hình nào (câu 2)

Web người học đang có nút "Đăng nhập bằng Google · Sắp có" và dòng "Xóa tài khoản · Sắp có"; admin chưa có gì; Flutter chưa có.

| Phương án | Trade-off |
|---|---|
| (a) chỉ API | Ít việc; chỉ thử được bằng script |
| (b) API + web người học | Người học dùng được; admin chưa xóa được ai |
| ✅ (c) (b) + admin | Đủ cả hai phía; nhiều việc nhất |

## D3 — Một hay hai design (câu 3)

| Phương án | Trade-off |
|---|---|
| ✅ (a) một design, một plan | Một lần duyệt; plan lớn |
| (b) một design, hai plan | Chia đợt được; hai lần lập plan |
| (c) hai design riêng | Mỗi phần gọn; Google và xóa có chỗ chạm nhau (xác nhận xóa bằng Google) phải nối hai tài liệu |

## D4 — Google thật và cách implement (câu 4)

Thử Google thật cần chủ dự án tạo project và OAuth client "Web" trên Google Cloud (không tốn tiền; `localhost` được làm địa chỉ quay về; chế độ "Testing" tối đa 100 test user).

| Phương án | Trade-off |
|---|---|
| (a) chỉ Google giả | Không cần việc của chủ dự án; luồng thật (cookie, chuyển trang) chưa được kiểm |
| (b) Google giả + một lần chủ dự án đăng nhập thật trước khi xong | Kiểm luồng thật một lần |
| (c) Google thật làm việc riêng sau Bước 8 | Bước 8 xong sớm hơn; rủi ro dồn về sau |
| ✅ Khác: "đăng nhập Google thật ngay đợt này luôn" | Luồng thật được kiểm trong đợt; chủ dự án phải tạo OAuth client trước khi chạy "Xong khi". CI vẫn dùng Google giả |

4b: implement như các đợt trước (phiên song song + phiên điều phối, Claude tự review và chạy kiểm thật): **có**.

## D5 — Nút Google ở trang admin (câu 5)

| Phương án | Trade-off |
|---|---|
| ✅ (a) chỉ người học | An toàn tài khoản nhân sự không phụ thuộc tài khoản Google |
| (b) cả người học và admin | Tiện cho nhân sự; an toàn phụ thuộc Google của họ |
| (c) nhân sự có nút nhưng admin bật cho từng người | Linh hoạt; thêm cờ và màn |

Phần thêm (Claude đề xuất, chủ dự án "ok"): một nhân sự đăng nhập Google ở `/app` vẫn học bình thường, nhưng phiên đó không dùng được cho route admin.

## D6 — Người mới bấm Google (câu 6)

6a — Minh thấy gì tiếp theo:

| Phương án | Trade-off |
|---|---|
| ✅ (a) màn "Bổ sung thông tin" sẵn có, tên lấy từ Google | Dùng lại màn có sẵn; ít bước nhất |
| (b) form đăng ký đầy đủ điền sẵn | Sửa được tên; dài hơn |
| (c) như (a) thêm ô sửa tên | Thêm một ô |

Claude thêm (đồng ý): Google có thể không trả tên, khi đó màn hiện ô tên.

6b — Minh chưa đủ 13 tuổi:

| Phương án | Trade-off |
|---|---|
| (a) xóa ngay tài khoản vừa tạo | Có một tài khoản tồn tại vài phút rồi xóa |
| (b) giữ nhưng không cho vào | Giữ dữ liệu của trẻ dưới 13 tuổi |
| ✅ (c) chỉ tạo tài khoản khi điền xong | Không lưu gì của người chưa đủ tuổi; cần một phiếu tạm ở trình duyệt |

## D7 — Tên và ảnh từ Google (câu 7)

| Phương án | Trade-off |
|---|---|
| ✅ (a) lấy một lần khi tạo tài khoản | Tên người học tự sửa không bị ghi đè |
| (b) cập nhật mỗi lần đăng nhập Google | Luôn theo Google; ghi đè tên tự sửa |
| (c) như (a), liên kết lần đầu không đổi tên | Như (a) cho người đã có tên |

Ảnh đại diện: Claude đề xuất không dùng (app không có chỗ hiện; thêm dữ liệu cá nhân). **Chủ dự án chọn khác:** lấy link ảnh để dành cho tính năng tải ảnh
đại diện sau này.

## D8 — Gắn, gỡ Google trong Cài đặt (câu 8)

Vòng đầu chủ dự án chưa hiểu câu; Claude giải thích lại bằng ví dụ và mô phỏng `buoc8_q8_q17_q24_explainer`.

| Phương án | Trade-off |
|---|---|
| ✅ (a) không có nút; chỉ tự liên kết theo email (K8) | Ít luồng và ít trường hợp khó; ai dùng Google khác email sẽ có hai tài khoản |
| (b) gắn được, không gỡ | Gắn được Google khác email; không thôi được |
| (c) gắn và gỡ | Đủ nhất; phải chặn gỡ cách cuối cùng |

8b (gắn Google khác email) không còn áp dụng. Thêm của Claude: một dòng chỉ đọc "Đăng nhập bằng: Mật khẩu, Google". Thêm của chủ dự án: tài khoản tạo bằng Google là
tài khoản có thật; đăng ký bằng mật khẩu vào email đó thì báo đã tồn tại. Code đã trả 409 `email-taken` cho email đã xác minh (`auth.service.ts:78`), nên không cần sửa.

## D9 — Người học xác nhận xóa (câu 9)

| Phương án | Trade-off |
|---|---|
| (a) chỉ mật khẩu / Google | Nhanh nhất |
| ✅ (b) tick "Tôi hiểu dữ liệu sẽ mất và không khôi phục được" | Thêm một bước nhỏ |
| ✅ (c) gõ lại email | Chống bấm nhầm; vẫn trong mức Apple cho phép |

Chủ dự án chọn cả (b) và (c).

## D10 — Tải dữ liệu (câu 10)

| Phương án | Trade-off |
|---|---|
| ✅ (a) không có | Ít việc; người học không mang dữ liệu đi được |
| (b) nút tải CSV ở màn cảnh báo | Thêm việc |
| (c) ở Cài đặt, dùng cả khi không xóa | Thêm việc nhiều hơn |

Chủ dự án: "xóa tài khoản là mặc định mất dữ liệu".

## D11 — Đang có gói Pro trả tiền (câu 11)

Nhà cung cấp thanh toán hiện chỉ có bản giả; trang Gói của người học chưa có nút mua hay hủy. (Vòng đầu chủ dự án nhắc OpenAI, Anthropic; Claude làm rõ đó là nhà
cung cấp AI.)

| Phương án | Trade-off |
|---|---|
| (a) app tự hủy gia hạn rồi xóa, không hoàn tiền | Một bước cho người học |
| ✅ (b) không cho xóa tới khi người học tự hủy gia hạn | Người học chủ động; cần có chỗ để hủy |
| (c) tự hủy, xóa, hoàn tiền phần còn lại | Công bằng nhất; cần luồng hoàn tiền |

Gói staff cấp (không tự gia hạn): xóa được. Claude đề xuất thêm nút tắt gia hạn; **chủ dự án chốt nút "Hủy gói" = hủy gia hạn** (gói chạy tới hết kỳ). Đã hủy gia hạn
thì xóa được, mất ngày còn lại, không hoàn tiền.

## D12 — Đăng ký lại sau khi xóa (câu 12)

Chủ dự án nhờ research. Kết quả: mọi dấu giữ lại vẫn là dữ liệu cá nhân; căn cứ "chống dùng thử lại" chưa rõ (cần luật sư); dấu chỉ có tác dụng trên web vì store tự
quyết dùng thử trên mobile; dễ lách.

| Phương án | Trade-off |
|---|---|
| ✅ (a) không giữ gì, có dùng thử lại | Đúng "xóa ngay"; không thêm mục chính sách riêng tư; người cố ý được thêm 7 ngày trên web |
| (b) giữ mã thẻ | Chặn cùng thẻ trên web (Stripe); Paddle không có mã thẻ; vẫn là dữ liệu cá nhân |
| (c) giữ mã băm email | Chặn cùng email; lách bằng email mới; Apple coi là email |
| (d) cả hai | Chặn nhiều nhất; khó chứng minh "vừa đủ" |

Xem lại khi chọn nhà cung cấp thanh toán thật.

## D13 — Thư xác nhận (câu 13)

| Phương án | Trade-off |
|---|---|
| ✅ (a) một thư khi xong | Đúng yêu cầu Apple "báo khi xong" |
| (b) không gửi thư | Ít việc; không có bằng chứng cho người dùng |
| (c) thư lúc bắt đầu và lúc xong | Hai thư cho một việc thường xong trong vài giây |

## D14 — Báo lỗi người học đã gửi (câu 14)

| Phương án | Trade-off |
|---|---|
| (a) xóa hẳn | Sạch nhất; staff mất dữ liệu sửa prompt |
| ✅ (b) giữ, bỏ tên, xóa ghi chú tự viết | Staff vẫn thấy câu AI bị báo |
| (c) giữ cả ghi chú, bỏ tên | Giữ chữ người học tự viết |

Vòng đầu chủ dự án ghi "cb"; vòng 1 làm rõ là (b). Ngoại lệ do Claude đề xuất và giữ (chủ dự án không phản đối): báo lỗi về câu điền từ làm từ câu người học tự viết thì
xóa hẳn, vì bản chụp câu hỏi chứa chính câu đó.

## D15 — Giao dịch tiền (câu 15)

Research: Luật Kế toán 2015 Điều 41 và Nghị định 174/2016: chứng từ ghi sổ ít nhất 10 năm, chứng từ khác ít nhất 5 năm (đọc qua bản sao, không phải ý kiến luật sư).

| Phương án | Trade-off |
|---|---|
| (a) xóa hết | Đúng "xóa ngay"; có thể trái luật kế toán |
| ✅ (b) giữ, bỏ mọi thứ chỉ ra người, giữ N năm | Đối chiếu được; mã giao dịch vẫn tra ngược qua nhà cung cấp |
| (c) giữ nguyên tới khi có ý kiến luật sư | An toàn pháp lý; giữ cả tên người |

Claude đề xuất N = 10 năm. **Chủ dự án:** N chỉnh được trong admin. Chốt: cài đặt mới, mặc định 10 năm; luật sư xác nhận trước ra mắt.

## D16 — Số liệu dashboard (câu 16)

| Phương án | Trade-off |
|---|---|
| (a) chấp nhận số cũ thấp xuống | Không làm gì; biểu đồ cũ đổi |
| ✅ (b) giữ dòng sổ lượt, bỏ mã người | Biểu đồ giữ nguyên |
| (c) cộng vào bảng tổng hợp theo ngày rồi xóa | Thêm bảng và việc |

Claude đề xuất cách làm (b) bằng **mã ẩn danh ngẫu nhiên** thay vì để trống (giữ đúng "số người mỗi ngày"; cột hiện bắt buộc có giá trị); chủ dự án "ok".

## D17 — Admin xóa người học (câu 17)

Vòng đầu chủ dự án xin ví dụ; Claude giải thích bằng ví dụ Lan mất email và mô phỏng.

| Phương án | Trade-off |
|---|---|
| (a) chỉ người học tự xóa | Ít việc; tài khoản rác và người mất email không xóa được |
| ✅ (b) admin xóa được, editor không | Xử lý được yêu cầu qua thư; cùng đường xóa |
| (c) như (b), lý do bắt buộc, gửi thư | Có vết lý do; thêm ô và thư |

## D18 — Tài khoản nhân sự (câu 18)

18a:

| Phương án | Trade-off |
|---|---|
| (a) tự xóa được, vai trò mất theo | Tự do; nhân sự có thể tự rời mà admin không biết |
| (b) phải nhờ admin bỏ vai trò trước | Admin biết; hai bước |
| ✅ (c) nhân sự không tự xóa; chỉ admin xóa | Admin quản lý tài khoản nhân sự |

Chủ dự án: "đã là nhân sự thì admin quản lý ở chỗ tài khoản"; Claude hiểu là (c) và thêm: admin không tự xóa mình, không bao giờ xóa admin cuối; chủ dự án "ok".

18b:

| Phương án | Trade-off |
|---|---|
| ✅ (a) "Người dùng đã xóa", giữ id trơ | Không sửa cấu trúc 13 cột bắt buộc; màn admin đã chịu được id mất tài khoản |
| (b) để trống | Phải sửa cấu trúc bảng |

## D19 — Dọn tài khoản chưa xác nhận email (câu 19)

| Phương án | Trade-off |
|---|---|
| ✅ (a) làm ở Bước 8, sau N ngày | Không giữ dữ liệu của người chưa từng dùng app |
| (b) để tới Deploy | Dồn việc |
| (c) không dọn | Dữ liệu tích lại |

Claude đề xuất N = 7 ngày. **Chủ dự án:** N chỉnh được trong giao diện. Chốt: cài đặt mới, mặc định 7 ngày.

## D20 — Trang web xin xóa cho Google Play (câu 20)

| Phương án | Trade-off |
|---|---|
| (a) trang trên landing dùng chung luồng xóa | Sẵn khi lên Play; làm trước khi cần |
| (b) form gửi yêu cầu, admin xử lý | Cần D17 |
| ✅ (c) để tới khi làm app Android | Chỉ làm khi thật cần; ghi vào việc trước ra mắt |

## D21 — Bản sao lưu (câu 21)

Chủ dự án nghĩ "không cần sao lưu dữ liệu tài khoản đã xóa" và để Claude quyết. Claude giải thích: backup là bản chép cả DB, không chọn được từng người.

| Phương án | Trade-off |
|---|---|
| (a) chốt số ngày backup ở Bước 8 | Chưa có backup để chốt |
| (b) để Deploy chốt cùng cách backup | Đúng thời điểm |
| ✅ Đề xuất của Claude: (b) + Bước 8 giữ danh sách mã tài khoản đã xóa (không email, không tên) để xóa lại sau khi khôi phục | Người đã xóa không "sống lại" khi khôi phục |

## D22 — Web nói chuyện với Google (câu 22)

| Phương án | Trade-off |
|---|---|
| ✅ (a) chuyển trang qua API | Khóa bí mật chỉ ở API; web không nạp script Google, không nới CSP; dùng lại cho bước xác nhận xóa; thêm một lần chuyển trang |
| (b) web nhận mã rồi gửi API | Giống luồng mobile hơn; web giữ mã PKCE |
| (c) nút Google của thư viện Google | Ít code; không có PKCE; phải nới CSP; khó dùng cho bước xác nhận lại |

Vòng đầu chủ dự án để trống (Claude đề xuất (a)); vòng 1 chủ dự án chọn (a).

## D23 — Việc xóa chạy ở đâu (câu 23)

| Phương án | Trade-off |
|---|---|
| ✅ (a) trong request, một transaction; lỗi thì "đang xóa" + việc định kỳ thử lại | Đơn giản, xong ngay khi được |
| (b) request đặt "đang xóa", worker xóa | Không giữ request lâu; thêm hàng đợi |

## D24 — Chặn tài khoản "đang xóa" (câu 24)

Vòng đầu chủ dự án hỏi "là sao"; Claude giải thích bằng ví dụ điện thoại còn "vé vào" 15 phút và mô phỏng.

| Phương án | Trade-off |
|---|---|
| ✅ (a) đọc DB mỗi request | Đúng ngay; một lần đọc nhỏ mỗi request; bịt luôn kẽ hở của tài khoản bị khóa |
| (b) nhớ tạm vài giây | Ít đọc hơn; kẽ hở vài giây |
| (c) chỉ chặn lệnh ghi | Đọc vẫn được 15 phút; mọi chỗ ghi phải tự kiểm |

## D25 — Tài khoản chỉ có Google xác nhận xóa (câu 25, mới ở vòng 1)

Tài liệu Google (đọc 28/10/2026): `prompt` không có `login`; `auth_time` chỉ có khi app đã xác minh, "In production" và bật thêm cài đặt.

| Phương án | Trade-off |
|---|---|
| ✅ (a) giữ D12 cũ: chọn lại tài khoản Google | Không cần OTP; chỉ chứng minh người bấm giữ phiên Google, không hỏi mật khẩu |
| (b) mã gửi qua email | Mạnh hơn; mở lại D12 |
| (c) cả hai | Mạnh nhất; nặng nhất |

Hỏi không kèm đề xuất (luật D1).

---

Các quyết định D26–D30 đến từ review độc lập ([`../reviews/2026-10-28-buoc-8-design-review.md`](../reviews/2026-10-28-buoc-8-design-review.md)), hỏi ở vòng 2 của nhật ký
hỏi đáp (câu 26–30), theo luật D1.

## D26 — Tự liên kết Google khi email không do Google quản lý (câu 26, review R2)

Trang Google `verify-google-id-token`: email không có đuôi `@gmail.com` và token không có `hd` thì Google "not authoritative", nên khuyên hỏi mật khẩu hoặc cách khác. Ví dụ
(đã sửa ở vòng 2): Tuấn từng giữ `ketoan@congty.vn` và tạo tài khoản Google bằng email đó; nay hộp thư là của Lan; Tuấn bấm Google thì theo K8 vào tài khoản Lan. Chủ dự án hỏi
thêm: có webhook báo không (không: RISC chỉ có bảy sự kiện bảo mật, không có đổi email), có tra được tài khoản Google còn tồn tại không (không có API; và tài khoản của Tuấn vẫn
còn, chỉ hộp thư đổi chủ).

| Phương án | Trade-off |
|---|---|
| (a) giữ K8 | Không thêm bước; còn lỗ "người giữ hộp thư cũ" |
| (b) chỉ tự liên kết với Gmail hoặc `hd`; email khác hỏi mật khẩu Wordmet một lần | Đóng lỗ; thêm một màn cho nhóm hiếm |
| (c) như (b) nhưng bằng mã qua email | Đóng lỗ; mở lại D12 cũ |
| ✅ Khác: **để sau** | Bước 8 giữ (a) và ghi rủi ro; chủ dự án thấy (b) "chưa hợp lý", chưa có hướng khác |

Chủ dự án để trống lần đầu ("tạm để đó, hoặc Claude đề xuất"); Claude đề xuất (b); chủ dự án không đồng ý và để sau.

## D27 — Báo lỗi về từ riêng và câu trả lời trong bản chụp (câu 27, review R5)

Review: ngoại lệ của D14 (câu làm từ câu tự viết) không có hàng nào vì những câu đó không báo lỗi được; bản chụp của báo lỗi câu AI về từ riêng giữ chính từ và nghĩa người học
tự viết; hôm nay xóa một từ riêng thì báo lỗi của nó bị xóa theo.

27a:

| Phương án | Trade-off |
|---|---|
| (a) giữ như D14 | Staff còn ví dụ; giữ chữ người học tự viết |
| ✅ (b) xóa hẳn | Giống khi xóa một từ riêng; staff mất ví dụ đó |

27b:

| Phương án | Trade-off |
|---|---|
| (a) giữ câu trả lời trong bản chụp | Staff sửa được luật chấm từ báo lỗi "chấm sai" (đề xuất của Claude) |
| ✅ (b) để trống | Không còn chữ người học gõ; báo lỗi "chấm sai" khó dùng hơn |

Chủ dự án trả lời "27b" (Claude hiểu là (b) ở cả hai câu nhỏ); Claude đồng ý 27a, đề xuất khác ở 27b; chủ dự án không đổi, nên giữ (b).

## D28 — Gói `grace` / `on_hold` khi xóa (câu 28, review R7)

| Phương án | Trade-off |
|---|---|
| ✅ (a) tính là "đang tự gia hạn": hủy gói trước | Không bị trừ tiền sau khi xóa; thêm một bước cho người đang trừ tiền lỗi |
| (b) không tính: xóa ngay | Nhanh; lần thử trừ tiền sau có thể thành công cho tài khoản không còn |

## D29 — Đăng xuất có hiệu lực ngay (câu 29, review R13, tùy chọn)

| Phương án | Trade-off |
|---|---|
| (a) chỉ kiểm trạng thái tài khoản | Như design trước; đăng xuất trễ tối đa 15 phút (IR13) |
| ✅ (b) kiểm cả chuỗi phiên đã thu hồi | Cùng một lần đọc; đăng xuất, đổi mật khẩu có hiệu lực ngay |

## D30 — Vết cấp gói của người bị xóa (câu 30, review R17, tùy chọn)

| Phương án | Trade-off |
|---|---|
| ✅ (a) xóa theo ER16 | Đúng "xóa"; mất vết editor đã cấp gói cho người đó |
| (b) giữ, thay mã người bằng mã ẩn danh | Còn vết cấp gói; thêm một bảng giữ lại |

---

## Đề xuất kỹ thuật duyệt cùng design

Các đề xuất dưới đây nằm trong design và được duyệt cùng design (chưa duyệt lúc viết file này). Chọn, bỏ và lý do ghi ở design §21.

- Bảng `user_identities` (Identity) cho danh tính Google; `session_chains.auth_method` để chặn phiên Google ở route admin (D5).
- Phiếu tạm đăng ký Google và trạng thái OAuth giữ trong cookie mã hóa ở API, không lưu DB (D6, D22).
- Registry "xóa theo người" fail closed: module bắt buộc thiếu bộ xóa thì lỗi, không bỏ qua lặng lẽ (D23).
- Một mã ẩn danh mỗi lần xóa, dùng chung cho sổ lượt, giao dịch, báo lỗi; không lưu nối mã đó với người (D14–D16).
- Bảng `deleted_accounts` và lệnh chạy lại việc xóa sau khi khôi phục (D21).
- Admin xóa người học đang có gói tự gia hạn: app tự tắt gia hạn như khi cấp Pro (khác D11, vốn chỉ nói người học tự xóa).
- Thêm sau review độc lập (28/10/2026, design §0b): bộ xóa idempotent + quét lại 24 giờ cho hàng ghi muộn; port điều kiện của Entitlements và port đọc cài đặt thay cho
  import ngược; guard đọc một hàng chuỗi phiên nối người dùng; tài khoản chưa xác minh trùng email Google đi màn D6 và dùng lại `id` lúc hoàn tất; mốc dọn tài khoản chưa xác minh
  là `terms_accepted_at`. Năm câu mới (26–30) đã chốt ở vòng 2 (D26–D30 ở trên).
