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

## QM8. Câu hỏi khi viết plan M8 (chủ dự án chốt 11/11/2026)

Nguồn: code facts và Figma facts M8 (`docs/preparation/GIAO_DIEN_MOI_PLAN_{CODE,FIGMA}_FACTS_2026-11-11-m8-*.md`). Các phương án được vẽ
cạnh nhau ở trang [Bảy câu hỏi M8](https://claude.ai/artifact/H5V7kY8SrvQpNT47Lnmr67) (`docs/mockups/2026-11-05-redesign-concepts/m8-cau-hoi.html`).
Hỏi theo luật: chủ dự án trả lời trước, không phương án nào được đánh dấu đề xuất; Claude nêu ý của mình sau câu trả lời.

| # | Câu | Phương án đã đưa | Chủ dự án chọn |
|---|---|---|---|
| QM8-1a | Thanh trên: Figma bỏ "Đăng nhập", chỉ có "Dùng thử" | (a) theo Figma, không link Đăng nhập; (b) thêm link chữ "Đăng nhập" | ✅ Bỏ "Dùng thử", thay bằng hai nút **Đăng nhập** và **Đăng ký** |
| QM8-1a′ | Nút nào màu navy | A1 Đăng nhập navy, Đăng ký trắng (chủ dự án nêu trước); A2 Đăng ký navy, Đăng nhập trắng (Claude đề xuất sau) | ✅ A2 ("theo bạn đề xuất") |
| QM8-1b | Nút sáng/tối trên trang công khai | (a) bỏ, theo máy; (b) giữ nút | ✅ (b) |
| QM8-1b′ | Nút sáng/tối trên điện thoại | B1 giữ trên thanh trên (đo cỡ thật ở 390 px: thiếu 51 px); B2 xuống chân trang | ✅ B2 |
| QM8-2 | Bảng giá cho khách chưa đăng nhập | (a) giữ nút mua, đăng ký xong vào Gói học với kỳ đã chọn; (b) chọn kỳ để xem giá, nút "Tạo tài khoản"; (c) chỉ hiện ba giá | ✅ (c), kèm phần trăm giảm |
| QM8-3 | Chuyển động trang chủ | (a) đúng số Figma; (b) theo luật motion; (c) lúc hiện theo Figma, phần lặp chạy một lượt | ✅ (a); bổ sung: hiệu ứng theo landing bản 3 (`landing-mo.html`, artifact `LxqBqZYrXejQt8cci67ucF`), bố cục theo Figma |
| QM8-3′ | Nút dừng chuyển động (WCAG 2.2.2, mức A) | C1 có nút "Dừng chuyển động"; C2 không có | ✅ C2 |
| QM8-3″ | Độ mờ trên điện thoại | Giới hạn 12 px (design §8.1) hoặc theo số Figma (tới 24 px) | ✅ Giới hạn 12 px ("theo điện thoại cũng được") |
| QM8-4 | Văn bản pháp lý đã có tiêu đề, dòng ngày, Mục lục; Figma vẽ chúng thành khung trang | (a) code tự bỏ phần đầu; (b) chủ dự án sửa văn bản trong admin; (c) giữ văn bản, bỏ khung Figma | ✅ (b) |
| QM8-5 | Nhãn "Dùng cho" ở Nguồn dữ liệu (API không có) | (a) thêm trường ở API và admin; (b) API tự suy ra; (c) bỏ nhãn | ✅ (c) |
| QM8-6 | Câu chữ trang chủ (5 câu FAQ chưa có trả lời, câu hoàn tiền, vài câu không khớp app) | (a) chủ dự án viết; (b) Claude viết nháp, chủ dự án duyệt; (c) tạm chỉ hiện câu đã có trả lời | ✅ FAQ do admin quản lý, làm ngay ở M8; Claude viết nháp câu trả lời, chủ dự án kiểm sau |
| QM8-7 | Favicon và ảnh chia sẻ link (không có khung Figma) | (a) giữ hình cũ, chỉ đổi font; (b) vẽ trong Figma trước rồi code; (c) Claude dựng bằng code | ✅ (b) |
| QM8-8 | Các chỗ sửa từ audit giao diện 11/11 (`docs/audit/2026-11-11-ui-audit/`) | Đưa vào M8; tách thành đợt riêng | ✅ Chủ dự án tự polish và sửa lỗi M1–M7 ở phiên khác (cùng phiên với các chỉnh sửa theo khảo sát người dùng) |
| QM8-9 | Dọn `app-ui/` và token cũ (đụng đúng các file M1–M7 sẽ polish) | Để đợt polish; giữ trong M8 (phiên polish chờ M8) | ✅ Để đợt polish (chủ dự án: "vậy cập nhật context và các tài liệu liên quan và mở pr…") |

Ý của Claude sau câu trả lời, chủ dự án đã nghe:
- **QM8-1a′:** đề xuất A2. Trang chủ chủ yếu để kéo người mới, và nút chính của phần đầu trang ("Bắt đầu miễn phí") cũng dẫn tới Đăng ký. Với
  A1, màn hình có hai nút navy dẫn hai nơi.
- **QM8-2:** đồng ý (c). Phần trăm tính từ giá đọc lúc build, làm tròn như trang Gói học; kỳ không rẻ hơn thì không hiện phần trăm.
- **QM8-3:** đồng ý; luật "không lặp" viết cho màn dùng hằng ngày nên không áp cho trang chủ. Claude nêu một lần WCAG 2.2.2 (đọc ở
  `w3c/wcag` `guidelines/sc/20/pause-stop-hide.html`): nội dung tự chuyển động quá 5 giây, chạy song song nội dung khác cần cách để dừng. Chủ dự án
  chọn C2; design §15 ghi rủi ro.
- **QM8-4:** đồng ý; dòng meta hiện cả số phiên bản ("Phiên bản N · Có hiệu lực từ…"), vì chính văn bản hứa số phiên bản ở đầu trang.
- **QM8-5:** đồng ý; dòng ghi công vẫn hiện trên điện thoại vì giấy phép yêu cầu (Figma bỏ dòng này ở bản điện thoại).
- **QM8-6:** chủ dự án hỏi các app khác có cho admin sửa FAQ không. Claude trả lời: sản phẩm có người không viết code cần sửa nội dung thường để FAQ
  trong CMS hoặc công cụ help center; sản phẩm nhỏ thường để trong code. Với Wordmet, trang chủ dựng sẵn lúc build, nên FAQ sửa trong admin chỉ hiện
  sau lần deploy web tiếp theo (như giá), trừ khi trang gọi API mỗi lần mở.
- **QM8-7:** đồng ý; Claude vẽ khung favicon và ảnh chia sẻ 1200 × 630 trong Figma, chủ dự án duyệt trước khi code task đó.

Claude tự quyết khi viết Part 8 (chủ dự án duyệt cùng plan):
- **FAQ đọc lúc build, cùng lượt đọc giá** (QR3): trang chủ vẫn dựng sẵn; đăng FAQ trong admin rồi deploy lại web để trang chủ đổi. Màn admin ghi
  rõ điều này. Cách gọi API mỗi lần mở bỏ vì trang chủ sẽ không còn tĩnh và phụ thuộc API lúc người xem mở trang.
- **Đọc lúc build qua `next.config.ts` dạng hàm async**, đưa dữ liệu vào `env` (Next thay `process.env.X` bằng giá trị lúc build; đã đọc tài liệu
  Next 16.4.5 qua context7). Không cần file sinh ra hay bước build riêng.
- **Biến bắt buộc `LANDING_DATA_REQUIRED`** thay `PRICES_REQUIRED` (giờ gồm cả FAQ). Chưa đặt trong `deploy-web.yml` ở M8, vì workflow đó chưa có
  địa chỉ API: đặt lúc Deploy (`deploy-checklist.md`).
- **404 không có thanh trên** như Figma; card hiện theo cảnh 5.
- **Nút sáng/tối** chuyển từ `app-chrome/` sang `site/layout/`; logo mới (`AppLogo`) chuyển sang `ui/Logo.tsx` để `site/` dùng được.

## QBG. Nền của app (chủ dự án chốt 10/11/2026)

Chủ dự án thấy lưới chấm trên web "không ổn lắm", muốn đổi sang hướng 4 của vòng 8 ("Mesh + hạt + kính"). Hướng đó có hai phần nên
Claude hỏi lại phạm vi, kèm trang so sánh màn Hôm nay ở ba cách (https://claude.ai/artifact/EtQoipSnWvzgWYCbBYXEbv,
`docs/mockups/2026-11-10-gm-nen/so-sanh-nen.html`).

| Cách | Được | Mất | |
|---|---|---|---|
| A · Lưới chấm (giữ) | Không đổi gì | Chủ dự án thấy không ổn trên web | |
| B · Mesh + hạt, khối trắng | Chỉ đổi một component nền dùng chung; nhẹ máy; các đợt đang làm không phải sửa | Khác Figma tới khi đổi component nền trong Figma | ✅ |
| C · Mesh + hạt + khối kính | Cả trang đồng bộ với thanh trên kính mờ | Sửa khối ở mọi màn và trong Figma; mỗi khối thêm một lớp blur, máy yếu có thể giật | |

Chủ dự án chọn: "mesh + hạt, khối trắng". Claude không đưa đề xuất trước câu trả lời.

Claude tự quyết khi làm (10/11/2026): component vẫn tên `DotGridBackground` tới M9, để các nhánh M3–M5 đang làm không vỡ import; lớp hạt ở
chế độ tối tạm dùng `screen` 12%, chỉnh cùng mockup tối ở M9; component Figma `95:315`, `95:321` đổi tên "Nền app/Mesh hạt", 46 instance
đổi theo; panel giới thiệu ở trang đăng nhập (M2) vẽ riêng nên chưa đổi.

## QM9. M9, bản tối và mockup bản chốt (chủ dự án chốt 11–12/11/2026)

Nguồn: facts M9 (`docs/preparation/GIAO_DIEN_MOI_PLAN_{CODE,DESIGN}_FACTS_2026-11-11-m9-*.md`), bảng trả lời
`docs/preparation/GIAO_DIEN_MOI_M9_TRA_LOI_2026-11-11.md`, trang so sánh tối [m9-toi-so-sanh](https://claude.ai/artifact/H3B2PmZ1sdjxo2P9ymSYtW)
(`docs/mockups/2026-11-05-redesign-concepts/m9-toi-so-sanh.html`), trang chọn 25 chỗ lệch (artifact `87DRK6yvkNo6vc9jm571FU`, db `picks`) và
mockup bản chốt [m9-ban-chot](https://claude.ai/artifact/Ccnn3iPkr3srNv7diobFkL) (`docs/mockups/2026-11-05-redesign-concepts/m9-ban-chot.html`).
Câu 1–6 hỏi theo luật (chủ dự án trả lời trước). Ở buổi brainstorm tối 11/11, chủ dự án nhờ Claude đề xuất trước cho mọi câu còn lại.

### Tóm tắt

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| QM9-1 | Đợt polish so với M9 | Chia M9: kiểm thử và phần tối (M9a rồi M9b, một PR), rồi đợt polish, rồi PR cuối vào `dev` | Chủ dự án |
| QM9-2 | Bản tham chiếu cho chế độ tối | Vẽ trong artifact HTML có motion, không vẽ trong Figma; bản chốt là mockup `Ccnn3iPkr3srNv7diobFkL` | Chủ dự án |
| QM9-3 | Chi tiết chế độ tối | Cả 6 câu theo B; nền nhạt tối nâng lên; box "Chưa đúng" tối màu cam san hô, sáng giữ đỏ đậm | Chủ dự án (B theo nghiêng của Claude) |
| QM9-4 | Chế độ tối phủ tới đâu | Mọi màn; chỉ vẽ mẫu dùng chung và màn có phần riêng, mọi màn kiểm bằng ảnh tối | Chủ dự án (phạm vi); Claude (cách vẽ), chủ dự án đồng ý |
| QM9-5 | Bộ ảnh cuối | Mọi màn, 390 / 768 / 1024 / 1440, sáng và tối | Chủ dự án; Claude thêm 768, chủ dự án đồng ý |
| QM9-6 | Các bước kiểm tra chạy tay | Script giữ trong repo; CI chạy khóa chữ không dùng, hình dạng JSON-LD, dung lượng JS | Chủ dự án (script); Claude (bước nào vào CI) |
| QM9-7 | Đo khung hình trên điện thoại thật | Chủ dự án tự đo, điện thoại chung Wi-Fi với máy tính | Chủ dự án |
| QM9-8 | Tách file chữ `messages/{vi,en}.json` | Chưa tách; tách khi chủ dự án chỉnh lại câu chữ | Chủ dự án |
| QM9-9 | Các chỗ sửa cho đợt polish | Theo mockup bản chốt (bảng ở mục QM9-9) | Chủ dự án |

### QM9-1. Đợt polish nằm ở đâu so với M9

Bối cảnh: design ghi đợt polish (25 chỗ lệch của audit 11/11, xóa `app-ui/`, bỏ token cũ) làm "trước M9" (QM8-9). Ràng buộc: M9 chỉ xóa được
`dark.css` sau khi nền trang, viền focus và nền `/app` chuyển sang token mới; §14 cần `app-ui/` đã xóa trước PR cuối; phần tối và polish sửa cùng
các file `ui/` và các màn.

Vòng 1 (11/11):

| Phương án | Được | Mất | |
|---|---|---|---|
| a. Polish trước M9 | Phần tối làm trên giao diện đã polish, xem một lần | M9 chờ polish xong | |
| b. Chia M9: phần tối và kiểm thử, rồi polish, rồi PR cuối | Kiểm thử và phần tối không chờ polish | Sau polish phải xem lại chế độ tối (ảnh cuối chụp sau polish) | ✅ |
| c. Polish sau M9 | — | PR cuối vẫn còn `app-ui/` và token cũ, phải sửa §14 | |

Vòng 2 (brainstorm tối 11/11, chủ dự án muốn làm M9 ngay):

| Phương án | Được | Mất | |
|---|---|---|---|
| Hai PR (M9a script và tải sau; M9b phần tối), Part 9 viết hai nửa (Claude đề xuất) | M9a không chờ bản tối được duyệt | Hai lượt CI, hai lần duyệt plan | |
| Làm tuần tự M9a rồi M9b, mở một PR sau M9b (chủ dự án) | Một lượt CI, một lần duyệt plan | M9a chờ bản tối được duyệt mới viết plan | ✅ |

Claude: phần tối sửa chủ yếu ở token (màu, bóng, nền dùng chung), vì đợt polish ít đụng tới đó; bộ ảnh cuối chụp sau polish kiểm lại cả chế độ tối.

### QM9-2. Chế độ tối sửa theo bản nào

Bối cảnh: 5 mockup tối (artifact `GKfEHX3Yeq4LqXKRF8kuDM`, GM4) chưa được duyệt, chỉ có khổ điện thoại, vẽ nền lưới chấm cũ, đề xuất 3 trong 9 kiểu
bóng, màu nhóm vẫn là màu sáng. Figma không có khung tối. Mockup tối và vòng 9–15 mâu thuẫn ở bóng nút và lớp mờ sau hộp thoại. App đang có lỗi:
quầng sau băng chuyền Nhóm gần như trắng, tên nhóm mất (~1:1).

| Phương án | Được | Mất | |
|---|---|---|---|
| a. Duyệt 5 mockup như hiện có; phần thiếu Claude suy ra, ghi rulings | Nhanh | Phần thiếu (bóng, màu nhóm tối, mesh tối, khổ máy tính) không ai duyệt | |
| b. Vẽ lại mockup tối có mesh, quầng, màu nhóm tối, đủ bóng, khổ máy tính; duyệt rồi mới code | Duyệt đủ trước khi code | Thêm một vòng vẽ | ✅ (vẽ bằng artifact HTML) |
| c. Vẽ khung tối trong Figma, duyệt rồi code | Cùng chỗ với các khung khác | Figma từng lệch nhiều so với artifact đã chốt; không thấy motion | |

Chủ dự án chọn vẽ trong artifact HTML để thấy cả motion. Vòng sau: trang so sánh 6 câu (QM9-3), rồi mockup bản chốt gom mọi quyết định, chủ dự
án duyệt 12/11 ("nhìn sơ sơ thì mình thấy ok hết rồi", "ok rồi đó"). Bản chốt thay 5 mockup của GM4.

### QM9-3. Chi tiết chế độ tối (trang so sánh, câu 6–11)

Mỗi câu có hai bản đặt cạnh nhau; Claude ghi "nghiêng về" B ở cả sáu câu. Chủ dự án chọn B cả sáu ("nghiêng về Claude").

| Câu | A | B | |
|---|---|---|---|
| 6. Bóng nút chính | Ánh xanh dưới nút (`toi-5-man.html`) | Không bóng (vòng 15); chiều sâu từ bậc màu nền | ✅ B |
| 7. Lớp mờ sau hộp thoại | Navy 30% (code hiện tại, R10): làm trang sáng lên | Đen 55% (vòng 9–15) | ✅ B |
| 8. Giấy từ điển ở Tra từ | Giữ giấy sáng (R71, R80) | Giấy tối `#1e2334`, viền `#2e3449`, giữ viền, gáy bo lệch, vạch kẻ | ✅ B |
| 9. Số theo màu nhóm | Màu chính của nhóm (3,3–3,9:1 với tím, hồng, xám) | Bản sáng hơn cho nền tối, từ 4,6:1 trên dòng đang chọn | ✅ B |
| 10. Nền mesh và hạt | Bản tạm: quầng vàng 34%, hạt `screen` 12% | Theo landing bản 3: quầng vàng 12%, hạt `soft-light` 7% | ✅ B |
| 11. Bộ lọc và tab (chỗ 15) | Giữ 6 kiểu đang có | Hai kiểu: tab gạch dưới và chip | ✅ B (làm ở đợt polish) |

Vòng sau, trên mockup bản chốt (11–12/11):
- Chủ dự án: màu ở chế độ tối "bị chìm theo theme". Claude nâng `accent-soft` 20%, `pass-soft` 18%, `fail-soft` 18% màu trên nền card, thay giá trị
  Figma Dark. Chủ dự án duyệt cùng bản chốt.
- Box "Chưa đúng": chủ dự án gửi màu cam san hô của dòng nhóm đang chọn ("box sai thử màu này đi"): nền `#e5603f` 16%, viền 55%, tiêu đề `#e87052`.
  Sau đó: "lên theme sáng thì nó mất cái màu đỏ đậm" → chế độ sáng giữ đỏ đậm `fail` (nền 9%, viền 62%).
- Bóng tối và màu bậc tối là đề xuất của Claude trong bản chốt, chưa có bản nào được duyệt trước đó; chủ dự án duyệt cùng bản chốt.

GM13 (bóng nút navy) giữ cho chế độ sáng; câu 6B chỉ đổi chế độ tối.

### QM9-4. Chế độ tối phủ tới đâu

Bối cảnh: chưa có bản tối cho 8 trang đăng nhập còn lại, pháp lý, Nguồn dữ liệu, 404, `/app/recall`, Báo lỗi của tôi và 11 hộp thoại chưa có khung
Figma; trang chủ chỉ có bản tối trong `landing-mo.html`.

| Phương án | Được | Mất | |
|---|---|---|---|
| a. Mọi màn | Không màn nào lệch tông | Nhiều màn phải kiểm | ✅ |
| b. Chỉ app và đăng nhập; trang công khai để sau | Ít việc hơn | Trang công khai tối chưa ai xem | |

Claude đề xuất sau câu trả lời, chủ dự án đồng ý: chỉ vẽ bản tối cho mẫu dùng chung (nền, card, hộp thoại, nút, màu nhóm, màu bậc) và các màn có
phần riêng; mọi màn kiểm bằng ảnh tối (QM9-5).

### QM9-5. Bộ ảnh cuối chụp tới đâu

| Phương án | Được | Mất | |
|---|---|---|---|
| a. Mọi màn, 390, 1024, 1440, sáng và tối | Đủ bằng chứng | Nhiều ảnh nhất | ✅, cộng 768 |
| b. Như a, chỉ 390 và 1440 | Ít ảnh | Không thấy khoảng 768–1279 | |
| c. Mọi màn sáng; tối chỉ màn chính | Ít ảnh | Lỗi tối ở màn phụ lọt (axe không bắt quầng trắng) | |

Claude đề xuất thêm 768: design §3, §15 ghi kiểm khoảng 768–1279 ở 768 và 1024, và M1 đã có lỗi chỉ hiện ở 768 (`768bccc2`). Chủ dự án: "Thêm 768".

### QM9-6. Các bước kiểm tra chạy tay (design §13)

Câu 5a: so dung lượng JS, tìm khóa chữ không dùng, Lighthouse, Schema Markup Validator nên viết thành script giữ trong repo, hay chạy tay một lần
rồi ghi số. Chủ dự án: script giữ trong repo, chạy lại bằng một lệnh, có thể cho CI chạy trên mỗi PR.

Vòng 2 (brainstorm tối 11/11): Claude đề xuất ba bước vào CI (khóa chữ không dùng, hình dạng JSON-LD, dung lượng JS so với file số gốc); Lighthouse
và Schema Markup Validator chạy tay vì cần server giống production và công cụ ngoài. Chủ dự án không ghi chú; Claude coi là đồng ý, duyệt cùng Part 9.

### QM9-7. Đo khung hình trên điện thoại thật

Câu 5b: chủ dự án có máy và tự đo, qua bản deploy tạm hoặc chung Wi-Fi với máy tính. Claude đề xuất chung Wi-Fi (API chưa deploy; web chạy trên
Cloudflare Workers), web và API nhận IP máy tính (`ASSUMPTION`). Chủ dự án đồng ý: "hình như là làm được, mình có thử rồi".

### QM9-8. Tách file chữ

| Phương án | Được | Mất | |
|---|---|---|---|
| a. Tách trong M9, cùng lúc viết script tìm câu không dùng | Script viết một lần cho cấu trúc mới | Người dùng chưa được lợi gì; thêm việc cho M9 | |
| b. Tách ở đợt polish | — | Như a | |
| c. Để sau launch, khi file thật sự lớn | Không tốn việc bây giờ | Hai phiên cùng sửa một file dễ xung đột | |

Chủ dự án: chưa tách, tách khi chỉnh lại câu chữ. Câu phụ "mỗi trang chỉ gửi phần chữ trang đó cần" (`AppIntl.tsx` gửi cả nhóm `App`, khoảng 59 KB
chưa nén): Claude đề xuất làm cùng lúc với việc tách; **chưa chốt**.

### QM9-9. Các chỗ sửa cho đợt polish (mockup bản chốt, 11–12/11)

Chủ dự án gửi từng tin trên mockup; Claude sửa mockup sau mỗi tin. Đợt polish (plan riêng, sau M9) làm theo bảng này và lựa chọn trong db `picks`.

| Chỗ | Các vòng | Chốt |
|---|---|---|
| 25 chỗ lệch của audit | Trang chọn có ô "Giữ giao diện hiện tại" / "Sửa theo bản đã chốt" và ghi chú cho từng chỗ | Bản đã chốt: 3, 4, 5, 7, 9, 10, 11, 14, 17, 18, 20, 21, 23, thanh trên của 25. Giữ hiện tại: 8, 12, 16, 19, 22, thanh tab của 25. Chỗ 1, 2, 6, 13, 15, 24 theo ghi chú (file trả lời) |
| Góc bo | Chủ dự án: giảm còn khoảng 3–5 px; rồi "theo kích cỡ card và button"; Claude vẽ thang theo kích cỡ (4 / 6 / 8 / 12 / 16); chủ dự án chỉnh card to, rồi tăng nhẹ | Mức C: phím, nhãn 4–5; nút, ô, chip 8; dòng, menu 10; card 14; hộp thoại, thẻ Học 16 |
| Tên mức ôn | "Ngăn" (hiện tại); chủ dự án không muốn gọi "ngăn", nhờ phân tích (`SRS_LEVEL_NAMING_RESEARCH_2026-11-12.md`) | "Mới, Bậc 1 … Bậc 5", chú thích "ôn lại sau N ngày"; cơ chế giữ nguyên |
| Màu mức | Claude đề xuất: ưu tiên đỏ, đến hạn vàng cam, mới xám, Bậc 1→5 xanh lá nhạt → đậm | Theo đề xuất; giá trị tối do Claude đề xuất trong bản chốt |
| Chip lọc ở Một nhóm | Chip có ô màu nhỏ → chữ và số hai dòng, cả chip mang màu → ba cách (nền đặc, dải liền, viền đáy màu) → dropdown → quay lại một dòng | Một dòng, cao 36 px, cả chip mang màu (nền 18%, viền 45%), số trong ô nền card 24 px bo 6, chip chọn nền 40% viền đậm |
| Danh sách chọn nhóm | A: bỏ radio, dòng chọn nhuộm màu nhóm; B: chồng thẻ nhỏ màu nhóm thay ô vuông, nhấc lên khi chọn, ✓ cuối dòng | B, và chọn được **nhiều nhóm** cho một từ ("Lưu vào n nhóm") |
| Font nhãn | JetBrains Mono (hiện tại) | Noto Sans (người dùng không thích JetBrains Mono); Bricolage giữ cho tiêu đề, từ lớn, số lớn |
| Chữ trong phiên (Học, Phiên luyện, Ôn) | Chỉ câu hỏi tiếng Anh → mọi chữ giao diện tiếng Anh | Tiếng Anh; giữ tiếng Việt cho nghĩa, câu dịch, câu hỏi theo nghĩa ở Ôn, tên nhóm (chủ dự án 12/11: "giữ nha") |
| Từ đích trong câu ví dụ | Nền vàng (chỗ 2) → in đậm gạch chân | In đậm gạch chân ở mọi câu, kể cả giấy Tra từ; nền vàng chỉ cho câu lọc của Tra từ |
| Nhóm, Học | Bản mockup tự ước lượng số đo → chủ dự án: không khớp source | Theo đúng source của artifact `6z635GjwYNpctydnMoNHJD` (Vòng cung) và `TrbJBKg6VFE3x6YkjD1XT7` (Chồng thẻ tan mờ) |
| Các chỗ nhỏ khác | Từng tin của chủ dự án | Ghi đủ ở file trả lời, mục "Chỗ bổ sung": card nhóm chỉ ghi số từ; bỏ dòng "Sai: …"; gợi ý "e_______"; ô gợi ý theo lưới; câu điền từ gõ thẳng trong câu; nút Học 40 px, chỉ icon trên điện thoại; viết hoa chữ đầu nhãn; đường kẻ quanh phát âm và dạng chia; panel Đăng ký có motion |

### Đề xuất kỹ thuật duyệt cùng design và Part 9

- **Phần tối sửa ở token**, không ở từng component, trừ box "Chưa đúng" (màu riêng của chế độ tối) và hai lớp mờ đang viết màu thẳng.
- **Không dùng Tailwind `dark:`**: biến thể đó theo cài đặt máy, không theo lựa chọn trong app (`data-theme`).
- **Màu tối viết bằng hex đã tính sẵn**, ghi công thức trong chú thích, để test tính được tương phản (bỏ `color-mix` trong file tối).
- **Dọn `dark.css`, `island.css`, `dark-pastel.css` ở đợt polish**, sau khi các màn bỏ token cũ; M9b chỉ chuyển `color-scheme: dark`.
- **Màu mức có token ở M9b**, đợt polish mới dùng; màu ngăn cũ giữ tới lúc đó.
- **Lưu nhiều nhóm**: thêm trường `group_ids` vào API hay web gọi thêm `POST /v1/groups/:id/items`, chốt ở plan đợt polish.


## QP. Plan đợt polish (chủ dự án chốt 12/11/2026)

Nguồn: Part 10 của plan (`docs/superpowers/plans/2026-11-10-giao-dien-moi.md`), code facts
`docs/preparation/GIAO_DIEN_MOI_PLAN_CODE_FACTS_2026-11-12-polish-{kit,screens}.md`. Chủ dự án trả lời trước, Claude nêu ý kiến sau.

### Tóm tắt

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| QP1 | Lưu một từ vào nhiều nhóm | Thêm `group_ids` vào `POST /v1/quick-add`, một transaction | Chủ dự án; Claude đồng ý |
| QP2 | Đưa đợt polish vào `refactor/giao-dien-moi` | Một PR sau P.18 | Chủ dự án; Claude đồng ý |
| QP3 | Gợi ý chữ cái đầu của câu điền từ | Giữ `e___` (không hiện số chữ) | Chủ dự án; Claude đồng ý |
| QP4 | Màu chữ "Đến hạn" | Thêm token `warn`, làm đậm tới khi đạt 4,5:1 | Chủ dự án |

### QP1. Lưu một từ vào nhiều nhóm

Bối cảnh: mockup bản chốt cho chọn nhiều nhóm ("Lưu vào n nhóm"). Dữ liệu đã cho phép (`group_items` nhiều–nhiều), nhưng `POST /v1/quick-add` chỉ
nhận một `group_id`. Mọi endpoint ghi dùng chung giới hạn `user.write` 30 lần mỗi phút.

| Phương án | Được | Mất | |
|---|---|---|---|
| a. Thêm `group_ids` vào quick-add, lưu mọi nhóm trong transaction đang có | Lưu hết hoặc không lưu gì; một lần ghi | Đổi API (chỉ thêm trường), thêm spec | ✅ |
| b. Không đổi API; web gọi quick-add rồi `POST /v1/groups/:id/items` cho từng nhóm còn lại | Không đổi API | Có thể lưu một phần, phải báo nhóm nào hỏng; mỗi nhóm một lần ghi | |

Claude đồng ý với a: không có trạng thái lưu dở để giải thích, và service đã chạy một transaction. Trần 10 nhóm mỗi lần là đề xuất của Claude
trong plan (design không có con số).

### QP2. Số PR

| Phương án | Được | Mất | |
|---|---|---|---|
| Một PR sau P.18 | Một lượt CI, một lần duyệt | PR lớn | ✅ |
| Mỗi milestone (PL-a, PL-b, PL-c) một PR | PR nhỏ, CI riêng | Ba lượt CI, ba lần duyệt | |

Claude đồng ý; commit theo thứ tự milestone để dễ đọc PR lớn.

### QP3. Gợi ý chữ cái đầu

Bối cảnh: mockup vẽ `e_______` (mỗi chữ còn lại một dấu gạch). Ở Bước 7 chủ dự án đã bỏ số chữ cho câu điền từ (D9 Bước 7: "điền từ thì ba nấc
gợi ý, bỏ số chữ"); API chỉ gửi chữ cái đầu, web hiện `e___` với mọi từ (CS20).

| Phương án | Được | Mất | |
|---|---|---|---|
| Hiện số chữ `e_______` | Khớp mockup | API gửi lại độ dài; đảo D9 Bước 7 và CS20 | |
| Giữ `e___` | Không đổi API; giữ quyết định Bước 7 | Lệch mockup ở chỗ này | ✅ |

Claude đồng ý: mockup vẽ `e_______` khi chưa đối chiếu với quyết định Bước 7. Câu gõ từ không phải AI giữ gợi ý hiện có.

### QP4. Màu chữ "Đến hạn"

Bối cảnh: chưa có token `warn`; màu `#b07a12` của mockup chỉ đạt 3,72:1 trên nền trắng (chữ nhỏ cần 4,5:1). Claude đề xuất làm đậm tới khi đạt và
ghi ruling. Chủ dự án: "vậy thì bổ sung". Giá trị tối `#f0c04a` đạt 10:1 trên nền card tối.

### Đề xuất kỹ thuật duyệt cùng Part 10

- Chữ trong phiên bằng tiếng Anh: provider lồng với `locale="en"` để số nhiều đúng; link và khối chỉ dành cho tiếng Việt đọc ngôn ngữ của địa chỉ
  (`/vi`); khoảng 475 dòng test phiên đổi sang chữ tiếng Anh. Chủ dự án: "ok".
- `--ease-out-strong` (khối token cũ) chuyển thành token `wm-` trước khi xóa khối cũ. Chủ dự án: "ok".
- Các đề xuất còn lại ở mục "Decisions this part makes" cuối Part 10 (góc bo theo vai trò, `text-wm-meta`, `ui/levels.ts`, `TargetWord`, × luôn
  hiện, mũi tên là icon, test helper ở `src/test-utils/`).

## QF. Sửa sau khi test tay đợt polish (chủ dự án chốt 12–13/11/2026)

Chủ dự án test tay Part 10 và gửi từng chỗ cần sửa. Mỗi chỗ được vẽ lại trên trang review có ô chọn
([artifact `TdRauzhidkQBLUss11Y5j2`](https://claude.ai/artifact/TdRauzhidkQBLUss11Y5j2), 10 bản); lựa chọn đọc từ db `picks` ngày 13/11.
"Duyệt" là mục chỉ có một bản vẽ. Mục ghi "sửa thêm" là chủ dự án chọn "Cần sửa thêm" kèm ghi chú, rồi bản vẽ lại được duyệt trong chat.

### Tóm tắt

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| f01 | Quầng màu sau băng chuyền Nhóm | A: quầng tròn tan dần | Chủ dự án |
| f02 | Nút dưới băng chuyền | B: hai tầng | Chủ dự án |
| f03 | Chân hộp thoại | A: "Quay lại" dạng chữ, cách 12 px, có đường kẻ | Chủ dự án |
| f04 | Gợi ý chữ cái đầu | l___, gạch nối liền | Chủ dự án |
| f05 | Panel đúng/sai | C: vé (bản 9: nghĩa là dòng lớn nhất, đáp án nhỏ kèm nút nghe, nền đỏ 12 %) | Chủ dự án |
| f06 | Màu loang ở phần Giá | Quầng trôi đều như khối cuối trang | Chủ dự án (sửa thêm) |
| f07 | "Luyện trong câu" | Phần luyện lên đầu card | Chủ dự án |
| f08 | Hero đổi từ | Như bảng đăng ký, ô đáp án vừa chữ | Chủ dự án |
| f09 | Viên nhãn hero | B: bỏ nhãn | Chủ dự án |
| f10 | Link thanh trên | Chỉ chữ đậm, không kiểu mục đang chọn | Chủ dự án (sửa thêm) |
| f11 | Viên chú thích IELTS | Bỏ hẳn; chữ chỉ-IELTS đổi sang ngữ cảnh chung | Chủ dự án (sửa thêm) |
| f12 | Bảng đăng ký | Giữ đường nhớ, dời card, card hơi nghiêng | Chủ dự án (sửa thêm, bản 6, 7, 10) |
| f13 | Màn thấp | Co theo chiều cao, điện thoại ngang hai cột | Chủ dự án |
| f14 | Ô phím trên nút | Bỏ trên mọi nút trong phiên, giữ hàng chú thích | Chủ dự án (quyết trong chat) |
| f15 | Ô gõ trong câu | Co giãn theo chữ | Chủ dự án |
| f16 | Ô số câu | A: ô 36 px có − / + liền | Chủ dự án |
| f17 | Số ở nút phạm vi | Ô số riêng như chip ở Một nhóm | Chủ dự án |
| f18 | Thẻ nhóm ở Hôm nay | Nâng lên khi rê chuột hoặc Tab | Chủ dự án |
| f19 | Hộp Ngày | Giữ bố cục, bỏ Luyện | Chủ dự án (quyết trong chat) |
| D1–D8 | Đề xuất khi viết plan Part 11 | Như đề xuất | Chủ dự án duyệt plan 13/11 |
| D9 | Việc để sau | Không làm đợt này | Chủ dự án duyệt plan 13/11 |

### Các mục có nhiều phương án

**f01.** Quầng màu bị một khung chữ nhật cắt, thấy rõ cạnh (sáng và tối).

| Phương án | Trade-off |
|---|---|
| ✅ A. Quầng tròn quanh thẻ giữa, mép mờ dần, đổi màu theo nhóm 0,7 s | Có tâm rõ, theo thẻ giữa |
| B. Quầng loang rộng cả khu, nhạt hơn | Không có tâm; dễ thành một mảng màu phẳng |

**f02.** "Thêm từ" rơi một mình xuống dòng; chú thích bậc xuống dòng.

| Phương án | Trade-off |
|---|---|
| A. Một hàng: nút chính, nút phụ, hai link chữ, theo bản chốt | Gọn một hàng nhưng dễ vỡ ở khổ hẹp |
| ✅ B. Hai tầng: hai nút cùng bề rộng, dưới là hai link chữ | Thêm một dòng; luôn thẳng hàng |

**f03.** "Quay lại" dính sát nút chính.

| Phương án | Trade-off |
|---|---|
| ✅ A. "Quay lại" dạng chữ có đệm riêng, cách 12 px; chân hộp có đường kẻ | Nhẹ, nút chính nổi rõ |
| B. "Quay lại" dạng nút viền, hai nút cùng cao | Cân hơn nhưng hai nút tranh nhau |

Kèm theo f03 (D1, khi viết plan): ở Thêm từ, bước chọn nhóm chưa lưu từ, nên nút ở đó ghi "Xong"; nút lưu thật của form ghi "Lưu vào n nhóm".
Một nhóm hiện hai lần trong hộp chọn (dưới "Dùng gần đây" và trong danh sách) là lỗi, sửa trong F.6.

**f05.** Panel hiện tại là hộp xanh lồng trong hộp hồng. Vòng đầu chốt vị trí: trượt ra từ dưới thẻ, đáp án sai và đúng nằm ngay trong câu. Vòng
sau (taste-skill) đưa ba cách:

| Phương án | Trade-off |
|---|---|
| A. So chữ: chữ bạn gõ (phần thừa tô đỏ) và đáp án | Chỉ rõ chỗ sai; lặp lại đáp án đã có trong câu |
| B. Thẻ đáp án nghiêng như thẻ học | Đặc sắc; chiếm chỗ, hai cột khó trên điện thoại |
| ✅ C. Vé: đầu vé "Not quite" và bậc sẽ về, đường đục lỗ, thân vé, nút ở cuối | Riêng, gọn; cần notch khớp màu nền |

Bản 9 (chủ dự án): không nhắc lại đáp án thật to vì đã có trong câu; dòng lớn nhất là nghĩa và định nghĩa, đáp án nhỏ kèm nút nghe; nền đỏ đậm
hơn một chút (7 % → 12 %). D2, D3: panel Right và panel thử lại dùng cùng dáng vé; hộp gợi ý đang mở nằm giữa thẻ và panel.

**f09.** Viên nhãn chỉ ghi IELTS, trong khi app không chỉ cho IELTS.

| Phương án | Trade-off |
|---|---|
| A. Nhãn đổi lần lượt IELTS, TOEIC, Giao tiếp, Công việc, Du lịch | Có chuyển động; IELTS vẫn hiện đầu tiên |
| ✅ B. Bỏ nhãn, chỉ còn câu | Gọn nhất |
| C. Một nhãn chung "Từ vựng" | Giữ hình viên nhưng nhãn thừa ý |

**f16.** Ô tăng giảm hiện tại to và không gõ được.

| Phương án | Trade-off |
|---|---|
| ✅ A. Ô viền mảnh 36 px: nút −, số, nút + | Gõ được và vẫn bấm được |
| B. Chỉ ô số, gõ hoặc dùng ↑ ↓ | Gọn nhất; trên điện thoại khó tăng giảm |

**f19.** Hộp Ngày phải cuộn. Chủ dự án xin 5 cách bố cục, sau đó thêm 5 cách nữa (A–J trên trang review: ba cột, tab theo phiên, chỉ số và chip,
dòng thời gian, danh sách bên trái, hai cột, mục mở từng cái, lưới, bảng theo từ, vòng tròn tỉ lệ). Chủ dự án quyết trong chat: giữ bố cục hiện
tại, chỉ bỏ nút lọc Luyện và khối các phiên luyện.

### Các mục sửa thêm theo ghi chú

- **f06:** chủ dự án chỉ chỗ là `/vi#gia`. Thay hai quầng trôi cùng nhau thành nhiều quầng mờ trôi chậm phủ đều cả khối, như khối cuối trang.
- **f10:** "không cần kiểu mình đã chọn phần nào, nhưng mình muốn cho nó chữ đậm lên thôi": 15 px, đậm 700, màu chữ chính, rê chuột đổi màu nhấn.
- **f11:** "bỏ luôn dòng này thì sao": bỏ viên chú thích. D6 (khi viết plan): viên này nằm dưới 12 thẻ từ của khối Nhóm từ; bốn câu chỉ-IELTS
  đổi: "Đề 12 · Writing" → "Bài báo sáng nay", "Từ của mỗi đề thành một nhóm." → "Từ của mỗi bài thành một nhóm.", "Sau khi làm đề" → "Sau khi
  đọc một bài", "Bắt đầu với đề bạn vừa làm." → "Bắt đầu với bài bạn vừa đọc.".
- **f12:** "đưa card từ ở phía trên bên trái một tí, card hôm nay qua phía bên phải và card bài tập nằm bên dưới". Bản 6: card từ thấp hơn, sang
  phải; bản 7: card bài tập sang trái; bản 10: mỗi card nghiêng một chút. D7: vị trí quy ra cảnh thật 640×868 theo đường cong thật.

### Đề xuất duyệt cùng plan Part 11 (13/11)

- D4: "l___" chỉ là hình; trình đọc màn hình đọc "l… · 4 letters".
- D5: thẻ luyện ở hero thành ô gõ chữ, năm từ mitigate, allocate, viable, deteriorate, coherent; 3/7/3/1/14 ngày, lên Bậc 3/4/3/2/5.
- D8: "1 cards waiting" → "1 card waiting".
- D9, để sau: nút X 32 px trên điện thoại; không có nút Kiểm tra cho ô điền từ trên điện thoại; tên nút đóng khác nhau giữa các phiên; toast góc
  đè thẻ trên điện thoại; viết hoa "Tiếp theo"/"Ôn gần nhất"; khay xám ở Tùy chỉnh phiên; "Lần luyện gần nhất" sang cột phải; audit2.
- Rủi ro ghi nhận: viền ô nhập #c7cad3 ≈1,6:1 trên nền trắng, dưới 3:1 của WCAG 1.4.11; để một đợt a11y riêng.
- Kỹ thuật: ô số dùng `NumberField` của react-aria (đã có trong dự án) thay vì tự viết; ô gõ trong câu co giãn bằng một bản sao ẩn của chữ (chạy
  trên mọi trình duyệt, không dựa vào `field-sizing`); hero và bảng đăng ký dùng chung một bộ máy gõ chữ.
