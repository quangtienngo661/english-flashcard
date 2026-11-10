# Decisions — Giao diện mới cho toàn bộ web

Design: [`../specs/2026-11-09-giao-dien-moi-design.md`](../specs/2026-11-09-giao-dien-moi-design.md). Nguồn: chat brainstorm với chủ dự án ngày
09/11/2026 (session `d98c23ae…`), sau các vòng mockup và Figma ghi ở
[`../../mockups/2026-11-05-redesign-concepts/app-redesign-plan.md`](../../mockups/2026-11-05-redesign-concepts/app-redesign-plan.md).

Cách hỏi theo luật của dự án: chủ dự án trả lời trước, Claude đề xuất sau. Câu GM1 vòng đầu chủ dự án bỏ qua ("tiếp tục đi"), nên Claude đề xuất
trước ở câu đó.

## Tóm tắt

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| GM1 | Phạm vi | Toàn bộ web: trang công khai, đăng nhập và tài khoản, app người học | Chủ dự án |
| GM2 | Cất code giao diện cũ | Tag git tại `dev` trước khi đổi; đẩy tag; file ghi màn → file | Chủ dự án (tag); Claude (đẩy tag, file ghi) |
| GM3 | Đưa lên `dev` | Nhánh dài `refactor/giao-dien-moi`, PR từng đợt vào nhánh đó, cuối cùng một PR vào `dev` | Chủ dự án (cách làm); Claude (tên nhánh) |
| GM4 | Chế độ tối | Giữ; mockup tối 5 màn trước khi chỉnh phần tối | Chủ dự án (giữ, mockup); Claude (5 màn), chủ dự án đồng ý |
| GM5 | Màu nhóm | Tính từ ID nhóm, không thêm API | Chủ dự án (không cần API); Claude (theo ID), chủ dự án đồng ý |
| GM6 | API lịch học | Làm trong đợt này | Chủ dự án |
| GM7 | Thứ tự đợt | M1 nền → M2 đăng nhập → M3 Hôm nay, Nhóm → M4 Tra từ, trang từ, Thêm từ → M5 Luyện tập, Ôn → M6 Lịch học → M7 Cài đặt, gói → M8 trang công khai → M9 chế độ tối, rà soát | Claude đề xuất; chủ dự án "ok" |
| GM8 | Cách render | App, đăng nhập: CSR + React Query; trang công khai dựng sẵn; không Server Actions | Claude đề xuất; chủ dự án duyệt ("Viết design doc") |
| GM9 | Khung app | Trong layout, chia nhóm route | Claude đề xuất; chủ dự án duyệt |
| GM10 | Component | Một bộ `src/ui/` cho cả web, phần trang công khai ở `src/site/` | Claude đề xuất; chủ dự án duyệt |
| GM11 | Chính sách, Điều khoản | Giữ đọc văn bản mỗi lần mở | Chủ dự án; Claude đồng ý |
| GM12 | SEO | Metadata, ảnh OG từng trang, sitemap, JSON-LD (VND, Organization), màu trình duyệt | Claude đề xuất; chủ dự án duyệt |
| GM13 | Bóng nút | Giữ bóng navy (và bóng cùng màu cho nút xanh, đỏ); nút tắt không bóng | Chủ dự án |
| GM14 | Motion lệch giữa cũ và mới | Lấy số của giao diện mới cho cả sáu chỗ | Claude đề xuất; chủ dự án chốt |
| GM15 | Chuyển động hộp thoại | Mọi hộp thoại và tấm trượt dùng chung chuyển động của hộp Lịch | Claude đề xuất; chủ dự án chốt |
| GM16 | Hộp Lịch, Ngày và URL | Ghi trên URL; đổi tháng, đổi ngày chỉ thay địa chỉ | Chủ dự án (URL); Claude (phần đổi tháng, ngày, theo khảo sát) |
| GM19 | Lỗi gõ nhỏ ở màn Ôn | Không nhận: gõ đúng hẳn mới tính đúng | Chủ dự án |
| GM20 | Điều kiện từ khảo sát | Mờ tối đa 12px trên điện thoại; khối tổng kết 400ms; hộp đóng 150ms; tiêu đề xuống dòng line-height ≥ 1,15 | Khảo sát đề xuất; chủ dự án "ok" |
| GM17 | Học và Ôn; màn Ôn nhớ lại | Tên theo code đợt C (Học = lật thẻ, Ôn = chọn hoặc gõ từ); Figma sửa theo. Mockup màn Ôn chưa chốt | Chủ dự án (tên) |
| GM18 | Độ đậm tiêu đề | Giữ Bricolage 800 như Figma; quy tắc thành "400, 600, 700 cho chữ thường; 800 cho tiêu đề và số lớn Bricolage" | Chủ dự án |

## GM1. Phạm vi

Bối cảnh: file Figma mới có ba phần: trang công khai, đăng nhập và tài khoản, app người học.

**Vòng 1.** Claude hỏi, không đề xuất. Chủ dự án trả lời "tiếp tục đi", tức bỏ qua câu này; Claude đề xuất phương án 2.

| Phương án | Trade-off |
|---|---|
| 1. Chỉ app người học | Gọn nhất; trang đăng nhập và trang công khai giữ giao diện cũ |
| 2. App người học cùng đăng nhập và tài khoản | Hai phần cùng nằm dưới `/app`, dùng chung khung, ô nhập, nút. Claude nói trang công khai đã có style mới từ đợt landing (PR #205, #208); câu này sai, xem vòng 2 |
| 3. Cả ba, gồm trang công khai | Làm một lần cho mọi trang |

**Vòng 2.** Chủ dự án hỏi "làm toàn bộ luôn được không". Claude kiểm code: cả web đang dùng font Lexend và màu `#2445d6` từ bộ token dùng chung với
admin, còn Figma dùng Noto Sans, Bricolage, JetBrains Mono và navy `#1e3a8a`; đổi font và màu là đổi cả web một lần. Claude đồng ý, sửa câu sai ở vòng 1.

✅ Phương án 3.

## GM2. Cất code giao diện cũ

| Phương án | Trade-off |
|---|---|
| ✅ A. Tag git tại `dev` trước khi đổi, xóa dần code cũ khỏi `dev`, cần thì lấy file từ tag | Repo gọn; phải dùng lệnh git để xem code cũ |
| B. Dời code cũ vào `apps/web/src/legacy/` | Mở editor là thấy; lint, typecheck, test vẫn chạy qua hoặc phải loại trừ; dễ import nhầm |
| C. Chạy song song hai giao diện bằng công tắc hoặc đường dẫn riêng | So sánh trực tiếp; giữ hai bản chạy được, test gấp đôi |

Chủ dự án chọn A. Claude thêm: đẩy tag lên GitHub để không mất; một file ghi màn nào ở file nào trong tag.

## GM3. Cách đưa lên `dev`

| Phương án | Trade-off |
|---|---|
| A. Từng nhóm màn, mỗi nhóm một PR vào `dev` | PR nhỏ; trong lúc chuyển, app có cả màn mới lẫn cũ |
| B. Làm hết trên một nhánh dài, gộp một lần | `dev` chỉ một kiểu; PR rất lớn, khó review, dễ xung đột |
| ✅ C (chủ dự án đưa ra). Nhánh riêng; PR từng đợt merge vào nhánh đó; xong hết thì merge một lượt vào `dev` | PR từng đợt vẫn nhỏ và có CI; `dev` không có giao diện nửa mới nửa cũ; PR cuối lớn nhưng từng phần đã review |

Claude thêm: tên `refactor/giao-dien-moi` vì hook chặn tên trơn `refactor`; CI chạy trên PR vào mọi nhánh (`ci.yml` không lọc nhánh đích);
hook hỏi chủ dự án mỗi lần merge vì nhánh đích không phải `dev`; merge `dev` vào nhánh định kỳ.

## GM4. Chế độ tối

Bối cảnh: code có nút đổi sáng/tối; Figma có biến màu Dark nhưng chưa vẽ màn tối.

| Phương án | Trade-off |
|---|---|
| Giữ, màu suy ra từ biến | Chưa ai duyệt bằng mắt |
| Tạm tắt tới khi vẽ | Mất tính năng đang có |
| Vẽ màn tối trong Figma trước khi code | Thêm việc vẽ trước |

✅ Chủ dự án: giữ, nhưng vẽ trước mockup vài trang để xem. Claude đề xuất 5 màn: Hôm nay, Nhóm (băng chuyền), Phiên luyện lúc trả lời sai,
hộp Thêm từ, Đăng nhập. Chủ dự án đồng ý ("ok").

## GM5. Màu nhóm

Bối cảnh: Figma dùng màu riêng cho mỗi nhóm; DB chưa có cột màu.

| Phương án | Trade-off |
|---|---|
| Thêm API và cột lưu màu | Người học có thể chọn màu; thêm migration, endpoint, chỗ chọn màu |
| ✅ Tính màu từ ID nhóm | Không thêm dữ liệu; mỗi nhóm giữ màu cố định trên mọi máy; chưa tự chọn được, hai nhóm có thể trùng màu |
| (giữ như hiện nay) Tính theo vị trí trong danh sách | Đang dùng (`GroupCard.tsx:27`); màu đổi khi thứ tự nhóm đổi, nên không làm dấu nhận ra nhóm được |

Chủ dự án hỏi API có cần không vì giao diện hiện tại vẫn có màu mà không cần dữ liệu. Claude kiểm code, đề xuất tính từ ID. Chủ dự án đồng ý.

## GM6. API lịch học

| Phương án | Trade-off |
|---|---|
| ✅ Làm API trong đợt này | Hai hộp Lịch và Ngày chạy đủ khi gộp |
| Dựng giao diện trước bằng dữ liệu đang có, API đợt sau | Đợt này nhẹ hơn; hộp Ngày thiếu danh sách từ |

Chủ dự án: "làm luôn".

## GM7. Thứ tự đợt

Claude đề xuất chín đợt như bảng tóm tắt; chủ dự án "ok". Không có phương án thứ tự khác được đưa ra.

## QR1–QR5. Chờ chủ dự án (từ review độc lập)

Review: [`../reviews/2026-11-09-giao-dien-moi-design-review.md`](../reviews/2026-11-09-giao-dien-moi-design-review.md). Chủ dự án yêu cầu xem
mockup các cách trước khi chọn: [`../../mockups/2026-11-05-redesign-concepts/review-4-quyet-dinh.html`](../../mockups/2026-11-05-redesign-concepts/review-4-quyet-dinh.html)
(artifact https://claude.ai/artifact/JAZaHRrKFbLUTMavXWVuuB). QR5 (màu nhóm trùng) Claude thêm khi sửa design theo review M6.

### QR1. "Báo lỗi của tôi" (chủ dự án chốt 10/11/2026)

| Phương án | Trade-off |
|---|---|
| A. Link ở chân hộp Lịch (như Figma) | Đúng Figma; phải mở lịch mới thấy |
| ✅ B. Một dòng trong Cài đặt | Cùng chỗ với Lịch sử giao dịch; xa nơi báo lỗi |
| ✅ C. Một mục trong menu ảnh đại diện | Mở được từ mọi màn có thanh trên; menu dài thêm |
| D. Link trên trang Luyện tập | Gần nơi báo lỗi; khung Luyện tập thêm một dòng |

Chủ dự án chọn B và C. Claude tự quyết khi ghi design: trang đích `/app/settings/reports` (cạnh `/app/settings/transactions`), làm ở M6 cùng lúc bỏ
trang Lịch sử; link ở chân hộp Lịch trong Figma bỏ.

### QR2. Dữ liệu Figma cần mà API chưa có (chủ dự án chốt 10/11/2026)

Bốn chỗ, mỗi chỗ ba cách: thêm API / web tự tính / bỏ. ✅ Chủ dự án: "toàn bộ thêm API".

Claude tự quyết khi ghi design: chuỗi ngày qua endpoint nhỏ mới `GET /v1/me/streak` (nút lịch hiện trên mọi màn, không thể chờ API lịch tháng);
nút "Luyện lại từ sai" mở trang Từ hay sai có sẵn thay vì thêm cách mở phiên mới; `sessions/last` chỉ trả `group_id`, tên nhóm web lấy từ
`GET /v1/groups` để Practice không đọc bảng của Learning.

### QR3. Giá trên trang chủ (chủ dự án chốt 10/11/2026)

| Phương án | Trade-off |
|---|---|
| ✅ A. Đọc giá lúc build | Trang vẫn tĩnh, Google đọc được giá; đổi giá phải deploy lại web |
| B. Bảng giá tự gọi API trên trình duyệt | Luôn đúng giá; cần endpoint công khai, mở CSP; giá nháy lúc đầu; Google không thấy giá |
| C. Lưu đệm có làm mới (ISR, R2) | Tự đúng sau tối đa 1 giờ; thêm hạ tầng |
| D. Không ghi giá | Không lệch giá; khách chưa đăng ký không biết giá |

Claude tự quyết khi ghi design: thêm `GET /v1/public/prices`; deploy thật (`PRICES_REQUIRED=1`) mà không đọc được giá thì build fail, CI của PR dùng
giá dự phòng.

### QR4. Quảng cáo tải lại trang (gác lại 10/11/2026)

Vòng 1: chủ dự án hỏi lại vì nhớ quảng cáo hiện "khi chuyển từ section này qua section khác, ví dụ Hôm nay → Nhóm". Claude giải thích cách
đang làm theo DB13, DB38 (vignette hiện khi bấm link trên trang có mã, tức lúc rời Nhóm, Tra từ). Chờ chủ dự án chọn lại.

Vòng 2: chủ dự án hỏi cách khác ngoài AdSense (khảo sát `docs/preparation/AD_ALTERNATIVES_TO_ADSENSE_2026-11-10.md`), rồi xem mô phỏng ba điện
thoại (`docs/mockups/2026-11-05-redesign-concepts/quang-cao-chuyen-trang.html`, artifact https://claude.ai/artifact/V8Yd4w2qDBmR9GVuTdT3Yq) và
trade-off. Cả bốn cách đều cần AdSense duyệt site; quảng cáo chỉ cho gói Miễn phí.

| Phương án | Trade-off |
|---|---|
| A. Giữ DB38 (mã chỉ ở Nhóm, Tra từ) | Code và test đã có; Hôm nay và phiên học không có mã. Rời Nhóm, Tra từ tải lại cả trang, mất hiệu ứng mở nhóm; quảng cáo hiện lúc rời Nhóm, không phải lúc chuyển tab |
| B. AdSense khi chuyển tab | Quảng cáo đúng lúc chuyển tab, không tải lại khi chuyển tab, chỉ cần AdSense. Mã ở mọi trang có thanh tab; mọi link không phải tab phải gắn `data-google-vignette="false"`, sót là bật sai chỗ; vào phiên luyện, Học, Ôn phải tải lại trang; chưa thấy cách đặt tần suất; phải đổi DB38 và sửa `AdsenseLoader.tsx` |
| C. Google Ad Manager (web interstitial) | Google ghi rõ chạy khi chuyển trang trong app; đặt được tần suất (mặc định 1 lần mỗi 10 phút); gắn "không quảng cáo" một lần cho khung phiên; nút Back không bật. Dành cho publisher lớn, có thể không mở cho app nhỏ; thêm ad unit, mã GPT; thêm site vài ngày tới 2–4 tuần; chưa rõ phí và trả tiền về Việt Nam |
| B trước, rồi C khi xin được Ad Manager | Có quảng cáo theo ý chủ dự án sớm, sau đó sang cách Google hỗ trợ chính thức. Viết code hai lần; trong lúc chờ vẫn chịu rủi ro A1 |

Rủi ro chung của A và B (A1): chưa kiểm vignette có hiện khi chuyển trang trong app không; chỉ kiểm được sau khi deploy và AdSense duyệt.

Vòng 3 (chủ dự án 10/11/2026): "vậy phần quảng cáo tạm thời gác lại, mình tính sau". Đợt giao diện mới giữ DB38 như hiện nay; Claude chưa nêu đề
xuất vì chủ dự án chưa chọn.

### QR5. Màu nhóm trùng (chủ dự án chốt 10/11/2026)

Bối cảnh: review M6 tính được với 7 màu, 5 nhóm có 85% khả năng ít nhất một cặp trùng màu.

| Phương án | Trade-off |
|---|---|
| ✅ Giữ màu tính theo ID | Không đổi API; mỗi nhóm giữ màu trên mọi máy; có thể trùng |
| Gán theo thứ tự tạo nhóm | 7 nhóm đầu không trùng; cần `created_at` trong `GET /v1/groups`; xóa nhóm có thể làm màu nhóm khác đổi |

## GM8–GM10, GM12. Cấu trúc FE và SEO

Chủ dự án yêu cầu theo best practice của Next.js (CSR, SSR, Server Actions, component dùng chung, metadata SEO) và xem cấu trúc trước khi viết.
Claude kiểm code và tài liệu Next 16.4:
- Phiên đăng nhập nằm ở trình duyệt (token trong bộ nhớ tab; cookie gia hạn chỉ tới host của API), nên dữ liệu người học phải tải ở trình duyệt
  và Server Actions không biết người gọi.
- Phương án được nhắc nhưng không làm: chuyển sang mô hình BFF (cookie phiên ở `wordmet.com`, Next chuyển lệnh gọi sang API). Lý do: đổi API và
  bảo mật, ngoài phạm vi.
- Đề xuất: khung app vào layout theo nhóm route, `loading`/`error` theo nhóm, tải code hộp nặng khi mở, tải trước dữ liệu, `next/font` cho ba font,
  một bộ `ui/`, các bổ sung SEO.

Chủ dự án yêu cầu Claude đề xuất theo best practice của Next.js, nên ở GM8–GM10, GM12 Claude đề xuất trước (ngoại lệ đã có trong luật dự án:
chủ dự án muốn đề xuất trước thì nói, D27 Bước 4).

| Mục | Phương án đã nêu | Trade-off | Chọn |
|---|---|---|---|
| GM8 | CSR + React Query cho app; trang công khai dựng sẵn; không Server Actions | Hợp với phiên đăng nhập nằm ở trình duyệt; không đổi API | ✅ |
| GM8 | Mô hình BFF (cookie phiên ở `wordmet.com`, Next chuyển lệnh gọi sang API; dùng được Server Actions, SSR dữ liệu người học) | Đổi API và bảo mật, ngoài phạm vi | Không làm đợt này |
| GM9 | Khung app trong layout theo nhóm route | Khung không vẽ lại khi chuyển trang | ✅ |
| GM9 | Giữ như hiện nay: mỗi màn tự vẽ `<AppShell>` | Mất trạng thái khung mỗi lần chuyển trang | Không chọn |
| GM10 | Một bộ `ui/` cho cả web, phần trang công khai ở `site/` | Một nguồn component; phải dời file | ✅ |
| GM12 | Bổ sung metadata, ảnh OG, sitemap, JSON-LD, màu trình duyệt | Thêm việc ở M8 | ✅ |

Chủ dự án bấm "Viết design doc" sau khi xem: duyệt. Lúc viết, Claude thêm nhóm `(onboarding)` cho "Bổ sung hồ sơ" và "Chào mừng" (khung Figma
của hai trang này là card giữa như trang đăng nhập). Sau review độc lập (I5, M8): gộp `(tabs)` và `(sub)` thành `(chrome)` vì Figma vẽ trang phụ
có cùng thanh trên và tab dưới; `(auth)` tách `(split)` và `(card)`.

## GM11. Chính sách và Điều khoản

| Phương án | Trade-off |
|---|---|
| ✅ Giữ như hiện nay: đọc văn bản mỗi lần mở | API sập thì hiện bản nháp; chậm thêm một lượt gọi API; luôn đúng bản app yêu cầu đồng ý; không thêm hạ tầng |
| Lưu đệm 1 giờ (ISR, R2) | API sập vẫn hiện bản cũ; nhanh; có thể lệch tối đa 1 giờ với bản app yêu cầu đồng ý (muốn hết lệch thì thêm bảng D1 và lệnh gọi từ API sang web); thêm bucket R2 và cấu hình |

Chủ dự án hỏi hệ quả và chi phí. Claude kiểm bảng giá R2 (gói miễn phí mỗi tháng: 10 GB, 1 triệu lượt ghi, 10 triệu lượt đọc): chi phí gần như 0;
khác biệt nằm ở độ lệch và việc thêm hạ tầng. Chủ dự án thấy giữ như hiện nay không có vấn đề; Claude đồng ý.

## GM13. Bóng nút

| Phương án | Trade-off |
|---|---|
| Nút không bóng (lượt unslop) | Gọn, đúng luật unslop "không bóng màu"; nút chính bớt nổi |
| ✅ Nút có bóng màu | Nút chính nổi rõ; chủ dự án thấy ổn sau khi so ảnh |

**Vòng 1.** Lượt unslop vòng 15 bỏ bóng mọi nút (mockup và Figma) theo quy tắc "nút không bóng".

**Vòng 2.** Chủ dự án thấy bóng ổn, xem ảnh so sánh có bóng / không bóng, chọn "Trả bóng lại".

✅ Nút chính bóng navy, nút xanh và đỏ bóng cùng màu, nút phụ bóng navy rất nhẹ, nút tắt không bóng.

## GM14–GM18. Đề xuất viết cùng design

Claude đưa năm đề xuất lúc viết design. Chủ dự án yêu cầu khảo sát và mockup trước khi chốt: khảo sát
[`../../preparation/GIAO_DIEN_MOI_GM14_GM18_SURVEY_2026-11-09.md`](../../preparation/GIAO_DIEN_MOI_GM14_GM18_SURVEY_2026-11-09.md), mockup
[`../../mockups/2026-11-05-redesign-concepts/gm14-18-de-xuat.html`](../../mockups/2026-11-05-redesign-concepts/gm14-18-de-xuat.html)
(artifact https://claude.ai/artifact/95DqMB8aZgWzLJHVwmghDi).

| # | Phương án đưa ra | Chủ dự án |
|---|---|---|
| GM14 | Lấy số mới cho cả sáu chỗ / giữ số cũ / chọn từng chỗ | ✅ Lấy số mới cho cả sáu |
| GM15 | Một kiểu chung / mỗi hộp một kiểu | ✅ Một kiểu chung |
| GM16 | Ghi trên URL / chỉ trong trang; nếu ghi URL: đổi tháng, ngày chỉ thay địa chỉ / thêm bước vào lịch sử | Vòng 1 hỏi trade-off; vòng 2 ✅ "url". Phần đổi tháng, ngày chủ dự án không chọn; Claude chọn "chỉ thay địa chỉ" theo khảo sát (Quay lại đóng hộp ngay) |
| GM17 | Học, Ôn theo code đợt C (sửa Figma) / theo Figma (đổi DC3) / cách khác | ✅ Theo code đợt C; rồi "Vẽ trong Figma" |
| GM18 | Giữ 800, sửa quy tắc / đổi Figma về 700 / mức khác | ✅ Giữ 800, sửa quy tắc (đã sửa `ui-best-practices.md` mục 5) |

GM17 sau khi chốt, Claude tự quyết khi vẽ Figma (09/11/2026):
- Nút có việc đang chờ là nút chính navy, nút kia là nút phụ. DC3 ghi "Ôn tô vàng" theo hướng B (màu nhấn vàng); giao diện mới dành vàng cho từ đích
  (`ui-best-practices.md` mục 1), nên vai "nút nổi bật" chuyển sang navy.
- Bỏ số trên nút ("Ôn 24 thẻ" thành "Ôn") theo DC3 "không số".
- Màn Ôn dựng từ khung Phiên luyện; thêm dòng so chữ đã gõ với đáp án theo khảo sát. Dòng này là đề xuất, code chưa có.
- Gõ sai một chữ nhỏ có tính là đúng không: chủ dự án "không" (GM19), giữ luật hiện tại.

Đề xuất ban đầu lúc viết design:

| # | Đề xuất | Lý do | Bỏ gì |
|---|---|---|---|
| GM14 | Sáu chỗ motion lệch (lật thẻ, sang thẻ mới, hộp thoại, tấm trượt, bấm nút, màn tổng kết): lấy số của giao diện mới | Một ngôn ngữ chuyển động (mờ, đường cong chính) | Bỏ `pressed` lún gờ và các keyframe kiểu hướng B ở các chỗ đó |
| GM15 | Mọi hộp thoại và tấm trượt dùng chuyển động của hộp Lịch | Tài liệu motion §6 ghi các hộp khác chưa có hiệu ứng riêng | Không thiết kế chuyển động riêng cho từng hộp |
| GM16 | Hộp Lịch và Ngày theo tham số URL | Nút Quay lại đóng hộp; link và đường dẫn cũ mở thẳng hộp | Intercepting routes của Next (phức tạp hơn khi hộp mở trên mọi màn) |
| GM17 | Vẽ mockup `/app/recall` trước M5 | Màn có trong code (đợt C) nhưng không có khung Figma | Tự dựng không có khung |
| GM18 | Sửa `ui-best-practices.md` cho khớp Bricolage 800 trong Figma | Quy tắc ghi "ba độ đậm 400, 600, 700" | |

## Câu hỏi khi viết plan theo từng đợt

| # | Câu | Phương án đã đưa | Chủ dự án chọn |
|---|---|---|---|
| QM2-1 | Ô chống bot Cloudflare (Turnstile) ở đăng nhập, đăng ký, quên mật khẩu | Luôn hiện (như hiện nay) / Chỉ hiện khi cần (`appearance: 'interaction-only'`) | ✅ Luôn hiện (trả lời trong phiên thực thi M2, 10/11/2026) |
| QM3-1 | Khối "Xem trước thẻ" (lật thẻ, Thẻ trước / Thẻ sau) ở trang Một nhóm, Figma `84:3552` không vẽ | Bỏ như Figma / Giữ, đặt dưới phần đầu trang và trên danh sách từ | ✅ Bỏ như Figma (10/11/2026, sau khi xem ảnh so sánh ở `docs/mockups/2026-11-10-gm-m3/`) |

Hai câu hỏi không kèm đề xuất của Claude, theo luật chủ dự án trả lời trước.
