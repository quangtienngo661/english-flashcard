# Decisions — Giao diện người học trên web (Bước 3–7)

Ngày: 22/10/2026. Đi kèm design doc [`../specs/2026-10-22-giao-dien-nguoi-hoc-design.md`](../specs/2026-10-22-giao-dien-nguoi-hoc-design.md).
File này gom mọi quyết định chốt trong buổi brainstorm 22/10/2026 (cloud session, nhánh `claude/gallant-keller-bwo9dk`): mỗi quyết định có các phương án đã đưa ra trong
chat, trade-off, phương án được chọn và lý do. Đầu vào: mockup và design đợt giao diện (21–22/10), research chữ
[`../../mockups/2026-10-22/ui-copy-research-vi-en.md`](../../mockups/2026-10-22/ui-copy-research-vi-en.md).

**Nhãn:** ✅ = phương án được chọn. **Ai chốt:** "Chủ dự án" = chủ dự án trả lời trước, Claude đề xuất sau, chủ dự án chốt; "Chủ dự án, theo đề xuất" = chủ
dự án nhờ Claude đề xuất (hoặc đồng ý đề xuất sau câu trả lời của mình); "Chủ dự án, tự nêu" = chủ dự án nêu thêm khi xem hình, không có câu hỏi trước.

**Cách hỏi trong buổi này.** Câu 1 hỏi một mình theo luật thường; chủ dự án nhờ Claude đề xuất ("bạn có thể recommend … bạn có thể tự quyết định").
Sau đó chủ dự án yêu cầu: "liệt kê danh sách các câu hỏi ra đi bạn rồi mình trả lời luôn một lượt" → Claude gửi các câu còn lại một lượt (câu 2–9), chỉ bối
cảnh và ràng buộc; rồi 32 câu của research chữ, cũng không đề xuất. Sau mỗi lượt trả lời, Claude đưa đề xuất của mình cho từng câu (đồng ý / khác chỗ nào).

## Tóm tắt

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| D1 | Chia mốc và PR | M1 khung + tài khoản + Cài đặt · M2 học và ôn · M3 tra từ và thêm từ · M4 Luyện tập và Gói học · M5 Bước 7 (2 PR); duyệt hình mỗi mốc trước khi merge | Chủ dự án, theo đề xuất |
| D2 | Việc API nhỏ | Làm cả sáu (a)–(f) | Chủ dự án |
| D3 | Bản tối | Có; từ M1, chỉ trong `/app`, lưu theo thiết bị | Chủ dự án (cách làm theo đề xuất) |
| D4 | "Xong khi" | Chủ dự án tự kiểm bằng tay theo tài liệu kiểm; Claude chạy thử với API thật trước khi giao | Chủ dự án |
| D5 | Co giãn | Bề ngang điện thoại theo page 09; vừa một cột; ≥ 1280px hai cột; Flutter để sau | Chủ dự án (mốc bề ngang theo đề xuất) |
| D6 | Chữ tiếng Anh và tiếng Việt | Research bằng agent → chủ dự án quyết từng câu | Chủ dự án |
| D7 | Chân trang | Trang chưa có để một giai đoạn riêng; chỉ hiện link có trang | Chủ dự án (chỉ hiện link có trang theo đề xuất) |
| D8 | Production khi còn chặn | Chuyển về landing (307) | Chủ dự án (mã 307 theo đề xuất) |
| D9 | CSP | Thêm trong đợt này, kiểu SRI | Chủ dự án |
| D10 | Hộp Tùy chỉnh phiên | Công tắc "Kiểu câu có AI"; bỏ "Câu lấy từ đâu?"; Miễn phí thấy nhưng không bật được; bỏ mô tả | Chủ dự án, tự nêu |
| D11 | Lỗi AI với người học | Báo chung "hệ thống gặp lỗi" | Chủ dự án |
| D12 | Báo lỗi câu AI về từ riêng | Bỏ ô đồng ý; đội Wordmet luôn thấy từ | Chủ dự án, tự nêu |
| D13 | Chữ tiếng Anh | Locale `en`, Mỹ, ngày có tên tháng, 12 giờ, sentence case, "we" khi lỗi do app, "Cancel", không please/sorry, thuật ngữ | Chủ dự án |
| D14 | Sửa chữ tiếng Việt | Giữ "câu", hai tên câu, "ngăn"; nút một động từ, "Xem lại", [Kiểm tra], "chọn"/"nhấn", hoa tên trang, "đã dùng 1/3" | Chủ dự án |
| D15 | Mức sử dụng | Ghi lúc nạp lại ở mọi chỗ | Chủ dự án, tự nêu |
| D16 | Con số admin chỉnh được mà màn cần (builder check) | Việc API (g) | Chủ dự án |
| D17 | Thẻ "Tạo nhóm nhanh theo chủ đề" (builder check) | Việc API (h), đổi ngẫu nhiên mỗi ngày | Chủ dự án |
| D18 | Lịch sử giao dịch | Màn người học + màn admin + API (i); Figma trước; dùng thử và lần cấp chung danh sách | Chủ dự án, tự nêu |
| D19 | Dữ liệu cho chủ dự án kiểm (builder check) | Nội dung thật + CSV mẫu khoảng 300 nghĩa | Chủ dự án (CSV theo đề xuất) |
| D20 | CSP khi SRI chặt không chạy (builder check) | `'unsafe-inline'` cho script, style; giữ chặt phần còn lại | Chủ dự án, theo đề xuất |
| D21 | Worker Cloudflare gói Free (builder check) | Không đưa `/app` vào bản build khi cờ tắt; đo cỡ khi cờ bật | Chủ dự án, theo đề xuất |

## D1 — Chia mốc và PR (câu 1)

Bối cảnh: 92 khung người học trên page 08; khung app và phiên đăng nhập phải có trước mọi màn; merge khi CI xanh không cần hỏi nên mốc duyệt bằng mắt là chỗ
duy nhất chủ dự án chặn trước khi vào `dev`. Câu hỏi: chia mốc và PR thế nào, mốc nào chủ dự án duyệt bằng mắt.

**Chủ dự án:** "bạn có thể recommend, chỗ này phụ thuộc vào tiến độ và tuần tự các bước triển khai, nên bạn có thể tự quyết định".
**Claude đề xuất:** ✅ 5 mốc theo Bước (M1 khung + tài khoản + Cài đặt; M2 học và ôn; M3 tra từ và thêm từ; M4 Luyện tập và Gói học; M5 Bước 7, hai PR);
mỗi mốc một PR; duyệt hình ở **mọi** mốc trước khi merge (khung và token của M1 dùng lại ở mọi màn sau); trong lúc chờ duyệt, Claude làm tiếp mốc sau ở
máy, chưa push. Chủ dự án: "ok" (cùng các đề xuất câu 2–7).

## D2 — Việc API nhỏ (câu 2)

Bối cảnh (đối chiếu code 22/10): `PATCH /v1/me` từ chối `birth_date`; `GET /practice/weak-words` chỉ có phân trang; bulk add chỉ nhận bộ lọc; "Khác" thứ
4/7 với câu AI; không có API đọc câu đã gặp kèm `id`. Phương án đưa ra: mỗi việc làm / không làm; không làm thì màn ẩn phần đó, lách ở trình duyệt, hoặc chờ.

**Chủ dự án:** "làm toàn bộ luôn đi". **Claude:** đồng ý; nói thêm (b) gồm ba phần (lọc theo nhóm, số đếm từng nhóm, mở phiên từ hay sai của một nhóm, vì
`POST /practice/sessions` chỉ nhận `group_id` với nguồn nhóm) và (e) gồm hai phần (danh sách câu kèm `id`, số câu ở trang từ); mỗi việc đặt trong mốc đầu tiên
cần nó. ✅ (a)–(e). Việc (f) thêm sau, theo D12.

## D3 — Bản tối (câu 3)

| Phương án | Trade-off |
|---|---|
| ✅ Làm trong đợt này | Mọi màn kiểm hai chế độ; `theme.css` chưa có giá trị tối, phải giới hạn trong `/app` |
| Để sau | Ít việc hơn; phải sửa lại mọi màn về sau |

**Chủ dự án:** "có". **Claude đề xuất (chủ dự án "ok"):** làm từ M1 cho mỗi màn làm một lần; giá trị tối chỉ áp trong `/app`; Sáng / Tối / Theo hệ thống lưu
theo thiết bị (giữ D40 Bước 3); kiểm tương phản hai chế độ.

## D4 — "Xong khi" (câu 4)

Bối cảnh: Docker chạy được trong cloud (tự bật `dockerd`, image qua `mirror.gcr.io` vì Docker Hub trả 429). Phương án: Claude tự đi từng màn và chụp ảnh;
thêm e2e với API thật trong CI (như `admin-e2e-real`, CI chậm hơn); chủ dự án tự chạy cuối đợt.

**Chủ dự án:** "cái này mình sẽ tự test từng cái, lập cho mình document các phần cần test rồi sau đó mình sẽ kiểm chứng bằng tay, có lỗi thì mình báo".
**Claude đề xuất (chủ dự án "ok"):** tài liệu kiểm theo mốc (dựng trên Windows, dữ liệu, bước → kết quả → khung Figma, vi/en, sáng/tối); Claude chạy thử với
API thật và gửi ảnh trước khi giao; chủ dự án kiểm trên `dev`, lỗi sửa bằng PR `fix/`. ✅ Không thêm e2e với API thật vào CI.

## D5 — Co giãn (câu 5)

Bối cảnh: page 09 vẽ cho app di động (Flutter để sau); page 08 chỉ có 1920 × 1080; người học có thể mở web bằng điện thoại.

**Chủ dự án:** "flutter để sau, còn lại responsive cứ vẽ bình thường". **Claude đề xuất (chủ dự án "ok"):** không vẽ thêm khung; < 768px theo page 09; 768–1279px
một cột; ≥ 1280px như page 08; ảnh duyệt ở 390, 1024, 1440.

## D6 — Chữ tiếng Anh và tiếng Việt (câu 6)

Bối cảnh: mockup chỉ tiếng Việt (D14 đợt giao diện); chưa có bảng thuật ngữ tiếng Anh. **Chủ dự án:** "cho một agent research skill để cải thiện vốn từ
trong giao diện, kể cả tiếng Anh và tiếng Việt, research xong rồi liệt kê cho mình biết, rồi sau đó mình sẽ quyết tiếp". Agent viết
`docs/mockups/2026-10-22/ui-copy-research-vi-en.md` (24 nguồn đọc được, 32 câu hỏi, không xếp hạng). Các câu trả lời: D13, D14.

## D7 — Chân trang (câu 7)

Bối cảnh: chân trang có Giới thiệu, Gói học, Liên hệ, Trợ giúp, Câu hỏi thường gặp, Gửi góp ý, Điều khoản, Chính sách bảo mật; bốn link chưa có trang.
**Chủ dự án:** "các trang thì để đó vào một giai đoạn riêng, mình sẽ làm việc sau". **Claude đề xuất (chủ dự án "ok"):** ✅ đợt này chỉ hiện link đã có trang.

## D8 — Production khi trang người học còn bị chặn (câu 8)

Chủ dự án hỏi "chặn là sao?"; Claude giải thích (`deploy-web.yml` deploy `apps/web` khi push `main`; API chưa deploy; chặn = biến cấu hình lúc build). Phương án
đưa ra: 404, chuyển về landing, trang "sắp ra mắt". **Chủ dự án:** "nếu đang tắt thì redirect về landing luôn". **Claude:** đồng ý; dùng 307 (tạm), giữ ngôn ngữ,
vì 308 bị trình duyệt nhớ. ✅

## D9 — Content-Security-Policy (câu 9)

Chủ dự án hỏi CSP là gì; Claude giải thích (header dặn trình duyệt chỉ chạy script, gọi server từ danh sách cho phép; lớp chặn thứ hai cho XSS) và ba kiểu, đọc
từ tài liệu đi kèm Next 16.3.8:

| Kiểu | Trade-off |
|---|---|
| Nonce | Chặt nhất; mọi trang dựng lại mỗi lượt, landing mất trang tĩnh |
| Không nonce (`'unsafe-inline'`) | Giữ trang tĩnh; không chặn được script chèn vào trang |
| ✅ SRI (băm script lúc build) | Giữ trang tĩnh, chặt hơn; Next ghi "experimental" |

**Chủ dự án:** "thêm luôn, SRI". **Claude:** đồng ý, kèm rủi ro chưa kiểm (script nhúng của App Router với OpenNext); task đầu kiểm trên bản build thật, hỏng thì
báo chủ dự án trước khi đổi cách.

## D10 — Hộp Tùy chỉnh phiên (chủ dự án tự nêu, nhiều vòng)

Chủ dự án gửi ảnh K/70 và góp: (1) bỏ chú thích dưới ô ("mấy cái chú thích như ở dưới số câu bỏ đi … các box chọn cũng không cần description"); (2) gói Miễn
phí ẩn phần AI, mặc định câu đã lưu; Pro hiện; ô cùng cỡ; hỏi "kiểu câu có AI là user có thể làm câu của họ vẫn được đúng không".

Claude trả lời từ code: được, với Dùng thử/Pro (Điền từ vào câu + nguồn "Câu bạn đã lưu", không AI, không tốn lượt, không báo lỗi); và nêu xung đột: D11
Bước 7 chốt gói Miễn phí không có bài điền từ nào. Hỏi lại: ẩn hay tắt; Miễn phí có điền từ không. Chủ dự án hỏi tiếp "3 dạng này có thể không dùng AI mà làm
được không"; Claude trả lời (điền từ: có, đã có hai dạng; trắc nghiệm theo câu: bị bỏ ở Bước 4 vì hai đáp án đúng, D34/D6; chọn nghĩa trong câu: làm được
bằng câu ví dụ nhưng chưa đo độ phủ) và vẽ so sánh hai cách hiểu. Chủ dự án làm rõ: "ý là vẫn giữ nguyên hiện tại nhưng bố cục giao diện khác … 3 cái kiểu câu
mình gửi là sẽ không dùng AI thôi, còn lại thì vẫn dùng bình thường, thì nó sẽ có nút toggle để bật tắt ẩn hiện 3 dạng bài đó"; rồi "CÁI NÀY [Câu lấy từ đâu?]
KHÔNG CẦN DÙNG NỮA … ĐÃ XÁC NHẬN DÙNG AI THÌ KHÔNG CẦN TỚI CÁI ĐÓ NỮA"; với gói Miễn phí: "HIỆN NHƯNG DISABLE NẾU NGƯỜI DÙNG DÙNG FREE PLAN".

| Phương án | Trade-off |
|---|---|
| Giữ mockup K/70 | Đã duyệt; khối AI và "Câu lấy từ đâu?" luôn chiếm chỗ |
| Đổi hành vi: kiểu không AI ra đề bằng câu đã lưu (hai cách hiểu Claude vẽ) | Đổi API, đổi D11 Bước 7, có thể đụng D34/D6 Bước 4 |
| ✅ Chỉ đổi bố cục: công tắc "Kiểu câu có AI"; bỏ "Câu lấy từ đâu?"; Miễn phí thấy nhưng không bật được | Không đổi API, không đổi D11; điền từ từ câu đã lưu không còn đường vào từ giao diện (API giữ) |

Claude tự quyết thêm (ghi ở design §14): công tắc nhớ lần chọn trên thiết bị; bấm công tắc bị khóa hiện dòng D6; các chỗ AI khác giữ D6.

## D11 — Lỗi AI hiện với người học (TV2)

Bối cảnh: cùng lỗi `ai-unavailable` có hai câu; "AI tạm chưa dùng được" dùng cho cả `ai-failed`. Phương án: giữ; tách câu theo lỗi; một câu cho cả hai.
**Chủ dự án:** "Chỗ này thì ghi là lỗi hệ thống đi, không cho người dùng biết chỗ này". Claude ghi lại cách hiểu (K/72, K/74a, K/74d, K/75; giữ K/74b hết lượt,
K/74c cần gói); chủ dự án "ok". ✅

## D12 — Báo lỗi câu AI về từ riêng (TV4)

Bối cảnh: câu hỏi ban đầu chỉ là chữ "Nhân viên" hay "Đội Wordmet" ở K/81. Claude giải thích trường hợp (báo lỗi câu AI hỏi về từ tự thêm phải tick "Cho đội
Wordmet thấy từ này"). **Chủ dự án:** "cái cho đội wordmet thấy từ này bỏ đi mà là mặc định họ sẽ thấy luôn, bởi vì khi report thì staff của app phải biết là
người dùng họ đang báo cái gì, nên buộc phải cho họ biết, không phải optional". Claude nêu hệ quả: phải đổi API (bỏ `400 share-consent-required`) và đổi luật
riêng tư của design Bước 7 (D26). ✅ Thêm việc API (f). Câu chữ dòng báo ở K/81: Claude tự quyết ("Đội Wordmet sẽ thấy từ … bạn tự thêm để kiểm tra.").

## D13 — Chữ tiếng Anh (research §F câu 1–25, 32)

| Câu | Phương án (ABC, không xếp hạng) | Chọn | Ghi chú |
|---|---|---|---|
| 1 Cách viết | dịch sát / viết lại theo thói quen tiếng Anh | ✅ viết lại, ngắn | Chủ dự án: "tới đây thôi được rồi" (với ví dụ "You've used today's practice sessions.") |
| 2 Locale | `en` / `en-001` / `en-GB` / tự đặt định dạng | ✅ `en` | |
| 3 Chính tả | Anh / Mỹ | ✅ Mỹ | |
| 4 Ngày | số / tháng bằng chữ | ✅ tháng bằng chữ ("Sunday, Oct 18") | |
| 5 Giờ | 12 / 24 / "midnight" | ✅ 12 giờ | |
| 6 Viết hoa | sentence case / title case | ✅ sentence case | |
| 7 App tự xưng | Wordmet / we / we khi lỗi do app | ✅ "we" khi lỗi do app | |
| 8 Nút hủy hộp xóa | Cancel / nói kết quả | ✅ Cancel | Bản tiếng Việt vẫn [Giữ nhóm] |
| 9 please, sorry | không dùng / theo luật tiếng Việt | ✅ không dùng | |
| 10 nhóm | collection, deck, group, list, set | ✅ deck | |
| 11 ôn | review / study | ✅ review | |
| 12 luyện tập | exercises / practice / quiz | ✅ practice | |
| 13 phiên | lesson / round / session | ✅ session | Claude lưu ý "round" trùng "vòng" trong phiên |
| 14 câu | question mọi chỗ / tách theo chỗ | ✅ question | |
| 15 lượt AI | AI credits kèm tên kho / … | ✅ AI credits kèm tên kho | |
| 16 tên gói | Free trial / Pro trial / Trial | ✅ Free / Trial / Pro | |
| 17 Từ của tôi | Added by you / Custom words / My words / Your words | ✅ My words | |
| 18 câu đã gặp | context / saved / seen / your sentences | ✅ saved sentences | |
| 19 dạng chia | tên cụ thể / forms / inflections | ✅ forms | |
| 20 báo lỗi | Flag / Report / Report a problem / Report an issue | ✅ Report | |
| 21 trả lượt | credit back / refund / restore / return | ✅ return | |
| 22 ngăn | Box 2 / 3-day box / level / stage | ✅ stage | |
| 23 hai nút lật thẻ | Again/Good / Forgot/Got it / Still learning/Know | ✅ Still learning / Know | Claude đề xuất "Know it"; chủ dự án: "know là được rồi" |
| 24 lý do báo lỗi | giữ câu đầy đủ / rút gọn | ✅ rút gọn | Chủ dự án xem bảng ví dụ trước khi chọn |
| 25 gợi ý cho `en` | đếm nấc thật / giữ 3 nấc / không ghi tổng | ✅ không ghi tổng | |
| 32 kiểm độ dài | khi code / vẽ khung tiếng Anh / cả hai | ✅ khi code | |

## D14 — Sửa chữ tiếng Việt (research §F câu 26–31, TV1–TV15)

| Câu | Chọn | Ghi chú |
|---|---|---|
| 26 Chữ "câu" (TV1) | ✅ giữ | |
| TV2 | ✅ lỗi hệ thống chung | D11 |
| TV3 hai tên câu đã lưu | ✅ giữ hai tên | Chủ dự án hỏi "Đã lưu thì sao"; Claude giải thích được / mất của "câu đã lưu" |
| TV4 | → D12 | |
| TV5 dòng phụ "Bài từ câu bạn đã lưu…" | Chủ dự án: "Ngắn gọn là không tốn lượt gọi AI"; sau đó ô "Câu lấy từ đâu?" bị bỏ (D10), nên dòng này không còn | |
| 28 Nút có dấu phẩy (TV6) | ✅ một động từ: [Để sau], [Mở phiên mới], [Xem đáp án] | |
| 29 Động từ thao tác (TV7) | ✅ "chọn" cho thứ trên màn, "nhấn" cho phím | Chủ dự án chọn "chọn"; Claude nêu phím không "chọn" được; chủ dự án "ok theo hướng này" |
| TV8 Viết hoa tên trang | ✅ hoa khi là tên trang, thường khi là danh từ chung | |
| TV9 Cách gọi ngăn | ✅ giữ như hiện tại (theo số ở Tùy chỉnh phiên, theo ngày ở chỗ khác), giữ chữ "ngăn" | Chủ dự án hỏi có chữ nào hay hơn "ngăn"; Claude đưa mức, cấp, chặng, bậc, không đặt tên; chủ dự án: "vậy giữ nguyên đi" |
| TV10 Số đếm | ✅ "đã dùng 1/3" | |
| 30 TV11 "Kiểm lại" | ✅ "Xem lại" | |
| 30 TV12 [Nộp] | ✅ [Kiểm tra] | |
| 31 Landing và email API | ✅ giữ nguyên | |

## D15 — Mức sử dụng (chủ dự án tự nêu)

Chủ dự án gửi ảnh "Current session · Resets at 7:20 PM" (Claude): "ở trong giao diện session usage thì có thể để mốc reset là khi nào giống như usage của
claude". ✅ Mọi chỗ hiện mức đã dùng ghi lúc nạp lại theo `resets_at`.

## Builder check (22/10/2026)

Một agent mới đọc design như người viết plan, nêu 6 điểm. Màu lấy ở đâu: Claude tự trả lời (session đọc được biến Figma, design §4.4). Năm điểm còn lại
đưa chủ dự án một lượt, mỗi câu chỉ bối cảnh và phương án (không ưu tiên):

| Câu | Phương án | Chủ dự án | Claude sau đó |
|---|---|---|---|
| 1 Con số admin chỉnh được (số câu tối đa, giờ nhắc, 60 ngày, 100 nhóm, số của các gói), nghĩa ở Từ hay sai, ngày bắt đầu gói | ghi cứng · bỏ chữ · ✅ thêm việc API (g) · trộn | "cái này" (g) | Đề xuất chi tiết (một `endpoint` các con số, `meaning`, `starts_at`); chủ dự án "đồng ý" |
| 1b Ngày bắt đầu gói | — | Tự nêu: "làm thêm một màn lịch sử billing và ngày thanh toán mà learner đã mua gói" | → D18 |
| 2 Thẻ chủ đề | cố định trong code · app tự chọn (chậm) · ✅ API (h) | "cái này"; luật chọn ✅ "đổi ngẫu nhiên mỗi ngày" (các cách khác: nhiều từ nhất A2–B1, bỏ cặp đã học gần hết, theo bộ lọc trình độ, danh sách cố định) | Ngưỡng 10 nghĩa, hạt giống (người học, ngày): Claude tự quyết |
| 3 CSP dự phòng | `'unsafe-inline'` · nonce · hash sau build · Report-Only | "bạn đề xuất" | ✅ `'unsafe-inline'` cho script/style, giữ chặt phần còn lại (nonce: trang động, tốn CPU Worker gói Free; hash: dễ hỏng; Report-Only: không chặn gì); chủ dự án "đồng ý" |
| 4 Dữ liệu kiểm | nội dung thật · CSV mẫu · ✅ cả hai | "(c)" | CSV khoảng 300 nghĩa nạp qua luồng nhập của admin; chủ dự án "đồng ý" |
| 5 Gói Worker | Free · Paid | "đang là gói free" | ✅ không đưa `/app` vào bản build khi cờ tắt; đo cỡ; checklist Deploy; chủ dự án "đồng ý" |

## D18 — Lịch sử giao dịch (chủ dự án tự nêu)

Claude kiểm code: có lần cấp, dùng thử, subscription, sự kiện thanh toán có ngày; **không** lưu số tiền (trừ hoàn tiền); chưa có cổng thật. Câu hỏi: mỗi dòng
gồm gì; màn ở đâu; có khung Figma trước không. Chủ dự án: "làm luôn giao diện cho phần này và để riêng trong figma, làm sẵn api trả về đầy đủ thông tin của
một giao dịch để admin và learner có thể xem"; chỗ: "cài đặt => lịch sử giao dịch"; Figma trước: "có". Claude nêu hệ quả (mở rộng sự kiện thanh toán Bước 5,
bảng mới, việc (i) cỡ vừa) và đề xuất PR M4b. Chủ dự án duyệt danh sách trường (loại, gói và kỳ, số tiền và đơn vị, ngày, kỳ được dùng, trạng thái, cổng, mã
giao dịch: "ok được"); dùng thử và lần cấp chung danh sách: "có"; phía admin làm màn và API: "cả 2".

## Cloudflare Web Analytics (chờ chủ dự án)

Chủ dự án gửi HTML thật của landing: có beacon `static.cloudflareinsights.com` (Web Analytics bật), không có Rocket Loader, Email Obfuscation. Phương án: (a) tắt
(giữ ràng buộc "không script bên thứ ba" của UI-CONTEXT §2); (b) giữ, cho phép trong CSP (đổi ràng buộc). Chủ dự án hỏi hệ quả; chưa chọn.

## Đề xuất kỹ thuật trong design (Claude tự quyết, chủ dự án xem khi duyệt design)

Danh sách đầy đủ ở design §14: trang tĩnh + query string; tiền tố theo hồ sơ; `must_change_password`; thư viện cùng phiên bản admin; cổng 3001; công tắc
nhớ lựa chọn; chỗ AI khác giữ D6; dòng báo K/81; chân trang trong `/app` không đổi ngôn ngữ; không sửa Figma; không dựng K/79b; script dựng dữ liệu thử;
429 khi refresh có dòng báo; `preparing` quá 60 giây; thêm theo `sense_ids` không bỏ từ chức năng; K/18 gửi `sense_ids` cho "Thêm cả"; hàm façade mới của
Learning; tên công tắc "Kiểu câu có AI".
