# Bước 3: context cho phần giao diện (app người học)

Viết 16/10/2026, trong phiên brainstorm Bước 3 (nhánh `docs/buoc-3-design`). Mục đích: một phiên khác làm tiếp **phần giao diện**
mà không cần đọc lại cuộc trò chuyện. Phần hệ thống (API, dữ liệu, edge case) làm tiếp ở phiên brainstorm chính; **Phần 4**
(milestone, test, "Xong khi") của design chỉ làm sau khi phần giao diện (Phần 3) xong (chủ dự án, 16/10/2026).

Nhãn: **Chốt** = chủ dự án chọn; **Đề xuất** = Claude đề xuất, chưa duyệt; `ASSUMPTION` = chưa kiểm chứng.
Luật hỏi vẫn là "chủ dự án trả lời trước, Claude đề xuất sau" (CLAUDE.md, Working Rules), áp dụng cả cho câu hỏi giao diện.

## 1. Cách làm giao diện (Chốt)

1. Mockup HTML bấm được → chủ dự án **chốt style** → **vẽ Figma** → mới code. (Khác Giao diện B, nơi UB11 bỏ Figma.)
2. Thiết kế **mobile-first**, rồi giãn cho màn rộng. Có bản riêng cho web máy tính.
3. Dùng token chung `packages/design-tokens/theme.css` (hướng B: xanh `#2445d6`, vàng miếng dán `#ffd84a`, gờ đặc thay bóng mờ,
   Lexend). Màu chỉ khai báo trong package (UBC1 của design UI-B).

## 2. Ràng buộc kỹ thuật đã chốt (ảnh hưởng giao diện)

| Ràng buộc | Nguồn |
|---|---|
| App người học nằm trong **`apps/web`** (cùng codebase với landing), **cùng domain `wordmet.com`**, dưới một đường dẫn chung (dự kiến `/app`; tên và tiền tố ngôn ngữ chốt trong plan). Không dùng `app.` nữa (đổi L8) | Chốt 16/10 |
| Trang người học **chạy hoàn toàn ở trình duyệt** (client-side): cookie `refresh_token` nằm trên host API (`SameSite=Strict`, `path=/v1/auth`, xem `session-transport.ts`), server của `wordmet.com` không biết ai đang đăng nhập | Chốt 16/10 |
| Landing **không tải script bên thứ ba**; cả domain có Content-Security-Policy (hiện chưa có CSP, đã kiểm) | Chốt 16/10 |
| Trang người học **bị chặn trên production** bằng biến cấu hình cho tới bước Deploy (`deploy-web.yml` deploy `apps/web` mỗi lần push `main`) | Đề xuất, duyệt cùng Phần 1 |
| Phần phiên đăng nhập và gọi API **chép từ `apps/admin`**, chưa tách package | Đề xuất, duyệt cùng Phần 1 |
| Admin (`apps/admin`) thêm trang **"Thông báo & giới hạn"** (quyền mới `settings.manage`, chỉ `admin`) và lựa chọn **"Từ chưa có nghĩa"** ở màn xuất CSV (D26) | Chốt 16/10 |

## 3. Hành vi đã chốt mà giao diện phải thể hiện

**Học và ôn**
- Ôn **theo nhóm** (deck). Màn chính là danh sách nhóm; mỗi nhóm có danh sách cần ôn riêng. Không có "hôm nay" gom chung.
- Mỗi từ có **mức 0–5** (0 = mới thêm) và **cờ ưu tiên**. Thang hẹn: mức 1–5 cách 1, 3, 7, 14, 30 ngày (giữ K21; FSRS xét sau
  khi có dữ liệu). Lịch ôn đi theo **từng từ**: một từ ở hai nhóm có một mức.
- Flashcard có **2 nút**: "Đã biết" (lên một mức, bỏ cờ ưu tiên) và "Cần ôn tập, đưa vào ưu tiên" (về mức 1, lên đầu danh sách của
  nhóm). **Không có nút "Chưa học".** Hệ thống không tự tăng hay giảm mức; chỉ người học bấm.
- Ôn sớm (bấm "Đã biết" khi chưa tới hạn, trong phiên "học tất cả"): không đổi gì.
- Trần mỗi nhóm mỗi ngày: **20 từ mới, 100 từ ôn**; từ ưu tiên **không** tính vào trần. Phiên "học tất cả" không bị trần.
- Thứ tự trong nhóm: ưu tiên → đến hạn (quá hạn lâu nhất trước) → mới (thêm sớm nhất trước).
- **Danh sách cân nhắc**: từ **mức ≥ 1** quá hạn hơn **60 ngày** rời khỏi phần cần ôn (từ mức 0 không bao giờ vào, Chốt 17/10); người học chọn "Học lại" (về mức 0, tính như từ mới),
  "Bỏ khỏi việc học", hoặc để đó. Không bao giờ tự xóa.
- **Xóa nhóm**: hộp xác nhận ghi rõ số từ **chỉ có trong nhóm này** sẽ bị bỏ khỏi việc ôn; từ còn ở nhóm khác giữ nguyên. Bỏ từ khỏi
  **nhóm cuối cùng** chứa nó cũng cảnh báo. **Không có nhóm mặc định "Mới thêm"** (Chốt 17/10, D43): nhóm nào cũng đổi tên, xóa được.
- Bước 4 (xem trước): gõ sai thì chỉ **gợi ý** nút "Cần ôn tập, đưa vào ưu tiên"; kết quả bài không tự đổi lịch (đổi K22).

**Thêm từ và tra từ**
- **Hai chỗ riêng**: trang "Tra từ" (xem, duyệt, lọc level/chủ đề/loại từ, "Từ của tôi") và nút **"Thêm nhanh"** (ô từ + ô câu đã gặp).
  Thêm từ qua "Tra từ" không có ô câu; sau đó gắn câu bằng nút "Thêm câu đã gặp".
- Thêm nhanh: **bắt buộc chọn hoặc tạo nhóm** lúc thêm (không có nhóm mặc định, D43); người chưa có nhóm nào được mời tạo nhóm đầu tiên. Tra catalog và từ riêng; không đúng nghĩa thì **tự nhập** (chỉ bắt buộc
  nghĩa). Từ đã đang học thì không tạo trùng, chỉ lưu thêm câu.
- **Dạng chia**: hệ thống tự nhận ra (`went` → quá khứ của `go`) bằng bảng tra (thư viện sinh + duyệt). Dạng chia là **từ độc lập**
  có nghĩa riêng, nối về từ gốc **ở từng nghĩa** (ví dụ `left`: chỉ nghĩa "quá khứ của leave" trỏ về `leave`). Trang từ gốc có một
  dòng các dạng chia (mọi từ có dạng chia), mỗi chữ bấm được nếu có trang riêng. Level của dạng chia mặc định lấy theo từ gốc.
- **Trang từ kiểu Cambridge**: một trang cho mỗi chữ, chia theo loại từ, nút thêm vào nhóm **ở từng nghĩa**. Kết quả tìm kiếm mỗi
  dòng một từ.
- **Thêm cả loạt** theo bộ lọc (ví dụ A2 + Ẩm thực), tự bỏ qua từ chức năng (K11).
- Câu ngữ cảnh: tối đa 300 ký tự, 5 câu **mỗi nghĩa**.

**Tài khoản và nhắc học**
- Lần đầu chỉ hỏi **ngôn ngữ**; múi giờ tự lấy theo thiết bị (không xin quyền vị trí), tự cập nhật khi thiết bị đổi.
  **Múi giờ không hiện ở đâu trên giao diện** (kể cả Cài đặt), vì người học không chỉnh được (Chốt 16/10/2026). Các mockup
  v1–v3.1 và web còn dòng "Múi giờ" trong Cài đặt: bỏ khi làm tiếp.
- Nhắc học qua **email** (Bước 3), tắt **trong app** (Cài đặt); cuối email có link mở thẳng trang Cài đặt. Nội dung chung chung
  ("Tới giờ học từ vựng"), chỉ gửi khi có từ cần ôn. Vắng 7–60 ngày gửi "Đã lâu rồi bạn chưa vào học" mỗi tuần; trên 60 ngày dừng.
  Giờ gửi và các con số do admin chỉnh. Mẫu email cho từng loại thông báo **bàn sau**.
- Trang admin "Thông báo & giới hạn": bật/tắt nhắc toàn hệ thống, giờ gửi mặc định, khoảng cách tối thiểu giữa hai email nhắc của một người (1–7 ngày, mặc định 2; D44), hai
  ngưỡng vắng mặt, trần từ mới và từ ôn, số ngày vào danh sách cân nhắc; mỗi số có khoảng cho phép, mỗi lần đổi được ghi lại.
  **Nội dung email chưa sửa được ở Bước 3** (một mẫu viết sẵn trong code; mẫu theo từng loại thông báo bàn sau, design mục 8.4).

## 4. Nguyên tắc giao diện đã đọc (nguồn đọc trong phiên 16/10/2026)

- Apple HIG, Tab bars: "Use a tab bar to support navigation, not to provide actions"; "Make sure the tab bar is visible when people
  navigate to different sections… The exception is when a modal view covers the tab bar".
- Material 3, Navigation bar: 3–5 đích đến, đặt ở đáy; màn rộng dùng navigation rail. FAB: một nút cho hành động chính, đặt trên
  thanh điều hướng, không dùng cho thao tác phá hủy.
- NN/g, Touch target size: vùng chạm tối thiểu **1cm × 1cm**.
- Skill frontend-design: tránh bộ khung SaaS (thẻ trắng giống hệt nhau, pill khắp nơi, chuỗi "A · B · C", mũi tên "→" sau chữ);
  dồn sự táo bạo vào **một** điểm nhớ được.
- FlipLab (đăng nhập bằng tài khoản chủ dự án): màn lật thẻ chỉ có 2 nút "Chưa biết" / "Đã biết"; changelog 06/2026 ghi họ dùng FSRS.
- Cambridge Dictionary: `went`, `mice` là mục riêng ("past simple of go"); `gone` có nhiều mục, chỉ nghĩa động từ trỏ về `go`;
  trang `go` có dòng "going · went · gone".
- OptiSigns: `www.` (Webflow) và `app.` (React) là hai app riêng. Chủ dự án vẫn chọn **chung domain, một codebase**.

## 5. Các bản mockup (thư mục này)

| File | Nội dung |
|---|---|
| `learner-app.html` (v1) | Hai style: "Năng lượng" (giống landing) và "Tập trung" (nền trắng). Chủ dự án chưa ưng |
| `learner-app-v2.html` | Sửa theo HIG/M3/NN/g: 3 tab, nút nổi "Thêm từ", phiên ôn toàn màn, nút chính ở đáy, vùng chạm ≥ 2,75rem. Chưa ưng |
| `learner-app-v3.html` | Thiết kế lại bằng skill frontend-design: **hộp Leitner 6 ngăn** ở trang nhóm, **xấp thẻ** ở trang chủ và phiên ôn, vàng chỉ cho một thao tác mỗi màn |
| `learner-app-v3-1.html` | v3 + các điểm đúng của `assessment-ui.md`; hai công tắc so sánh (thanh tab ở trang con; mặt trước thẻ) |
| `learner-web.html` | Bản web 1280 × 800: sidebar có danh sách nhóm, bảng từ ở trang nhóm, phiên ôn dùng phím tắt (Space, 1, 2, Esc, N, /) |
| `assessment-ui.md` | Bản đánh giá v3 từ nguồn ngoài (chủ dự án đưa vào). Đã đối chiếu, xem mục 6 |

> **Lịch sử 20/10/2026.** Các đoạn từ đây tới hết mục 5 viết ngày 20/10 ở checkout chính, đưa vào nhánh đợt giao diện ngày 22/10/2026 (chủ dự án chọn
> cách này). Hướng G1 "Bàn học" và page "03 Người học · Web" nói trong các đoạn này **đã được thay** bằng hướng B (bố cục kết hợp) trên page 08 và 09;
> page 03 nay là "(cũ, không dùng) 03". Bản hiện hành: mục 10.

**Web máy tính, cập nhật 20/10/2026.** Research bố cục và 6 hướng gợi ý (G1–G6): `../2026-10-18/research-web-layout.md`, Figma
`7HcPAKLrWu32C27qYMJUOA` page 08 (đã xóa 20/10, ảnh còn ở `../2026-10-18/`). **Chốt (chủ dự án, 20/10):** hướng **G1 "Bàn học"**: sidebar trái luôn hiện (thay quyết định
"ẩn sẵn, bấm ☰" của 16/10), nội dung chính + cột phụ ~30%, thẻ nền nhạt theo màu từng nhóm, tiêu đề có bút dạ quang vàng. Bộ 27 màn
web theo G1, 1920 × 1080: Figma page "03 Người học · Web" (lúc vẽ là page 09); ảnh mẫu ở `../2026-10-20/`. Phiên ôn vẫn toàn màn,
không sidebar. Câu hỏi mục 7.4 (danh sách nhóm ở sidebar và ở Hôm nay) theo G1 là giữ cả hai.

**Dọn Figma (chủ dự án, 20/10/2026).** G1 thành bản web chính thức: page G1 đổi tên thành "03 Người học · Web", 40 màn xếp theo 8
section (đăng ký, Hôm nay và nhóm, phiên ôn, tra từ, thêm từ, luyện tập, phiên luyện, gói học và cài đặt), flow "Web 1"–"Web 6". Đã xóa
page web cũ (kiểu ☰, 28 màn), bản tối của nó (page 07) và page 08 gợi ý bố cục; bản trước khi xóa còn trong Version history của Figma
(mốc tự lưu ngày 20/10). Chưa có trang bản tối cho G1. Chủ dự án: bố cục G1 mới ổn khoảng 50%, sẽ còn chỉnh.

**Thanh bên thu/mở và chỉnh bố cục (20/10/2026).** Chủ dự án yêu cầu nút ba chấm đóng/mở sidebar và chỉnh bố cục theo best practice,
dùng skill có sẵn để đánh giá. Research (33 nguồn đọc trực tiếp): `../2026-10-20/research-nav-va-bo-cuc-web.md`; đánh giá bằng
`design:design-critique` và `design:accessibility-review`, cùng danh sách việc đã làm: `../2026-10-20/danh-gia-web-g1.md`. Đã làm
(**Đề xuất**, chờ chủ dự án xem): sidebar có thuộc tính `Thu gọn`, nút ở đỉnh thu sidebar về rail 80px và mở lại (màn mẫu W/10b);
khung màn co giãn, nội dung tối đa 1600px; mỗi màn một nút vàng; link đứng riêng có vùng bấm ≥ 24px. **Chốt (chủ dự án, 20/10):** nút
thu/mở dùng **icon panel trái** thay cho ba chấm như yêu cầu ban đầu (research: không hệ thống nào dùng ba chấm cho việc này, và ⋯ trên
Wordmet đã là menu của thẻ nhóm). Icon đổi theo trạng thái: bản mở dùng `icon/panel-left-close`, rail dùng `icon/panel-left-open`
(Lucide). **Còn chờ chủ dự án:** lưu trạng thái thu/mở theo thiết bị hay theo tài khoản; mặc định ở cửa sổ 1024–1439px.

**Đầu trang chỉ có tiêu đề (chủ dự án, 20/10/2026).** Bỏ dòng mô tả dưới tiêu đề ở mọi trang của app web (16 màn: Hôm nay, Lâu chưa ôn,
Tra từ, Luyện tập và các trang con, Gói học, Cài đặt, kể cả nền phía sau các hộp thoại). Vẫn giữ: dòng số liệu của trang nhóm ("18 từ · 2 ưu
tiên…"), nghĩa của từ trong phiên ôn/luyện, câu hỏi ở W/65, dòng tóm tắt ở màn kết thúc phiên (W/22, W/67), khẩu hiệu ở màn đăng nhập.

**Luyện tập và Gói học trên web (20/10/2026).** Với 6 câu giao diện còn mở, chủ dự án nhờ Claude đề xuất trước rồi chọn trong 7 phiên
bản (ảnh ở `../2026-10-20/phuong-an/`; ba bản không chọn đã xóa khỏi Figma cùng page 08). **Chốt (chủ dự án, 20/10): A + S1 + G1**, đồng ý
cả mục 6 của đề xuất. Màn trên page "03 Người học · Web", ảnh ở `../2026-10-20/w5*.png`, `w6*.png`:
- **Trang Luyện tập "Bắt đầu ngay" (W/51):** thẻ lớn "Hôm nay · Bắt đầu 10 câu" dùng mặc định; bốn thẻ nguồn khác (Theo nhóm, Từ hay
  sai, Đang ưu tiên, Ôn tất cả), mỗi thẻ có nút luyện và nút "Tùy chỉnh" mở hộp thoại (W/54); 8 cách sắp xếp nằm trong "Thêm tùy chọn".
  Phiên đang dở hiện ở cột phụ.
- **Phiên luyện toàn màn** như phiên ôn (W/60–W/67): thanh tiến độ 10 vạch; phím 1–4 chọn, Enter, H gợi ý, Esc dừng và xem tổng kết.
- **Từ hay sai** là một thẻ nguồn và có trang riêng (W/56); khối "Gần đây" ở đáy trang Luyện tập, nút "Xem lịch sử" mở W/57.
- **Lượt Free:** thẻ "Lượt luyện hôm nay" ở cột phụ. Hết lượt (W/55): nói giờ mở lại, mời ôn flashcard, không mời mua.
- **Gói học** (W/52 Free, W/53 Pro do đội Wordmet cấp): thẻ gói kèm thanh lượt dùng, thẻ Pro "Chưa mở bán" (không giá, không nút), bảng
  so sánh. Trạng thái có thanh toán (trial, gia hạn, ân hạn, hủy) vẽ cùng cổng thanh toán thật.
- Không vẽ quảng cáo (công tắc đang tắt); không có thẻ bài AI ở Luyện tập tới Bước 7. Sidebar: bỏ ổ khóa ở Luyện tập; mục Gói học hiện tên
  gói (thuộc tính `Gói` của component); thêm biến thể `Active=Gói học`.
- Nút sau câu ghi **"Cần ôn lại"**, như phiên ôn (trả lời câu 7.5).

Đã kiểm trên Figma (20/10): 693 chữ đạt ≥ 4,5 (thấp nhất 4,69 chế độ sáng, 5,22 chế độ tối), 280 nét icon đạt ≥ 3, không lớp tràn khung,
link prototype nối sidebar và luồng luyện (flow "Web Bàn học 5: luyện tập", "6: gói học"). Còn từ trước, chưa sửa: bóng đổ của nút
`Ink` (component Button) và của nút "Thêm từ" ở sidebar tô cứng `#0f1a3d` 35%, chưa gắn biến; sửa cần thêm token hoặc đổi kiểu gờ. Chưa
vẽ: trắc nghiệm trả lời đúng, thông báo "Không tìm thấy từ này", bản tối riêng cho các màn này.

## 6. Đối chiếu `assessment-ui.md` (16/10/2026)

| Điểm | Kết luận |
|---|---|
| Thanh nút đáy chồng thanh tab ở trang con (~158px) | Đúng. Cách sửa "ẩn thanh tab" trái HIG → để chủ dự án chọn (công tắc ở v3.1) |
| Trang từ 2 cột làm cột nghĩa còn ~148px | Đúng; v3.1 xếp loại từ thành dòng tiêu đề trên điện thoại (đo lại: 278px) |
| Mép xấp thẻ đè link; bấm IELTS bị đưa vào "Lâu chưa ôn" | Đúng; đã sửa |
| Tiêu đề lặp; ngăn Leitner không lọc; ngăn 0 vẫn có vạch; từ không bấm được | Đúng (tin nhắn trước của Claude đã nói quá rằng ngăn lọc được); đã sửa |
| Mặt sau thẻ nghiêng khó đọc | Đúng; v3.1 cho thẻ đứng thẳng khi lật |
| Mặt trước hiện câu đã gặp | Quyết định sản phẩm → công tắc ở v3.1 và bản web |
| Nút quay lại cố định về Tra từ | Đúng; đã sửa |
| Bóng mờ ở menu; ký tự Unicode thay icon | Bóng mờ trái "gờ đặc" của hướng B → sửa. Trích dẫn "README… stroke 2.2" và `tokens.json` **không có trong repo** (đã grep `packages/design-tokens` và design UI-B); repo chỉ quy định admin dùng icon Lucide (UB13). Đã đổi sang icon SVG nét kiểu Lucide |
| Code v3.1 trong file | Không dùng nguyên: đưa lại chuỗi "A · B", mũi tên "→", pill tròn |

## 7. Câu hỏi giao diện còn mở (hỏi chủ dự án trước, không đề xuất trước)

1. **Style**: v3.1 (hướng "Năng lượng": nền xanh ở phiên ôn, xấp thẻ, hộp Leitner) đã ổn chưa, còn chỗ nào chưa ưng.
2. **Trang con trên điện thoại** (Nhóm, Lâu chưa ôn, Trang từ): giữ hay ẩn thanh tab đáy.
3. **Mặt trước thẻ ôn**: chỉ từ / từ + câu đã gặp (tô chữ) / từ + câu, che chữ bằng `_ _`.
4. **Web**: danh sách nhóm đang ở hai chỗ (sidebar và trang Hôm nay): giữ cả hai hay một.
5. **Chữ trên nút**: "Cần ôn lại" (mockup v3 rút gọn) hay "Cần ôn tập, đưa vào ưu tiên" (câu chủ dự án đưa làm tham khảo).
   **Chốt 20/10:** "Cần ôn lại", cho cả phiên ôn và bài luyện.
6. Trang admin "Thông báo & giới hạn" chưa có mockup; dựng theo khung admin B hiện có (sidebar + tờ trắng).
7. Sau khi chốt style: bước Figma (file nào, phạm vi màn nào).

## 8. Ngoài phạm vi giao diện Bước 3

Flutter và push (làm sau), bài luyện (Bước 4), AI, đăng nhập Google và xóa tài khoản (Bước 8), dashboard thống kê cho admin.

## 9. Ghi chú API cho plan giao diện (cập nhật 17/10/2026, sau khi implement phần hệ thống)

Plan giao diện dựng trên các route ở design §10. Những điểm dưới đây khác hoặc chi tiết hơn design, phát sinh lúc implement và review:

- Đường dẫn app người học: `/vi/app/...`, `/en/app/...` (D39). Email nhắc trỏ tới `<LEARNER_APP_URL>/<native_language>/app/settings`, nên plan
  giao diện phải có đúng đường dẫn đó; người chưa đăng nhập đi qua trang đăng nhập rồi về Cài đặt (B3E34).
- Không có nhóm mặc định (D43): mọi lệnh thêm từ cần `group_id`; người chưa có nhóm phải tạo nhóm trước (`POST /v1/groups`).
- `POST /v1/senses/:id/sentences` chỉ trả `{ id, created_at }`, không trả lại câu (review M1).
- `GET /v1/lookup`: một phần tử `via_inflection` có thể có `senses: []` khi từ gốc catalog chưa có nghĩa; giao diện vẫn gợi ý từ gốc và
  gắn sẵn link "dạng chia của …" khi người học tự nhập (B3E14, review M8).
- Trang từ trả đủ mọi dạng chia của từng loại theo thứ tự (ví dụ quá khứ của `ring`: ringed, rang); tính từ không có dạng so sánh tự
  sinh (D46).
- `GET /v1/groups/:id/queue?mode=all`: thẻ có thể mang `section: 'backlog'` (từ trong danh sách cân nhắc); từ ưu tiên bị bỏ hơn 60 ngày
  nằm ở danh sách cân nhắc, không ở phần ưu tiên (D48).
- `POST /v1/reviews` có giới hạn riêng 120 lượt/phút mỗi người; dùng lại `review_id` với nội dung khác → 400.
- Trang admin "Thông báo & giới hạn": khóa `min_gap_days` (1–7, mặc định 2) thay cho số email mỗi tuần (D44).
- API cần biến môi trường `LEARNER_APP_URL`.

## 10. Đợt giao diện 21–22/10/2026: bố cục B và D2–D17 (bản hiện hành)

Mockup đầy đủ cho mọi thứ API đã làm (Bước 3–7), vẽ thẳng trong Figma `7HcPAKLrWu32C27qYMJUOA`, chủ dự án duyệt từng mốc (0, A+B, C, D-web, D-phone, E,
F+G). Design (D1–D17): `../../superpowers/specs/2026-10-21-dot-giao-dien-design.md`; các phương án và lời duyệt:
`../../superpowers/decisions/2026-10-21-dot-giao-dien-decisions.md`; chữ từng màn: `../2026-10-21/ban-chu-giao-dien.md`; as-built, danh sách khung và kết quả
kiểm: `../../deliveries/dot-giao-dien.md`.

**Page Figma.** `08 Người học · Web` (khung `K/…`, 1920 × 1080), `09 Người học · Điện thoại` (khung `M/…`, 393 × 852), `04 Admin · Web` (khung `A/…`,
mức khung). Page 03, 05, 06 là "(cũ, không dùng)", nằm cuối, chưa xóa vì page 09 còn dùng lại vài tấm và component của page 05.

**Bố cục B (D2), thay G1 của 20/10.**
- Web: thanh trên hai tầng (Hôm nay · Nhóm · Luyện tập · Tra từ, nút Thêm từ, chip gói, avatar; dải tra từ ở mọi trang chính), không có sidebar; nội
  dung tối đa 1440px, cột phụ 360px; Gói học phủ toàn màn; phiên ôn và phiên luyện toàn màn.
- Điện thoại: thanh trên 175px ở màn chính; trang con có nút quay lại ở đầu trang và vẫn giữ tab dưới (Hôm nay · Nhóm · Luyện tập · Tra từ); nút + nổi
  ở Hôm nay, Danh sách nhóm, Tra từ.
- Cài đặt (D16): web mở từ menu avatar (Cài đặt, Gói học, Đăng xuất); điện thoại bấm avatar; trang Cài đặt không có dải tra, chia mục (thông tin cá
  nhân, gói và mức sử dụng, học tập, thông báo, tài khoản). Mức sử dụng chỉ ở Cài đặt, không ở Gói học (chủ dự án, mốc A+B).

**Các quyết định khác của đợt.**
- D3 mặt trước thẻ ôn: từ + loại từ; mặt sau nghĩa + câu đã gặp, tô từ. D4 tấm Thêm từ chọn sẵn nhóm dùng gần nhất; chưa có nhóm thì "Tạo nhóm đầu
  tiên". D5 không ghi giới hạn câu trên màn, báo khi chạm. D7 màn hết lượt không có nút "Xem gói học".
- D6 người dùng gói Miễn phí vẫn thấy tính năng AI, có ổ khóa và nhãn Pro; bấm thì một dòng giải thích + link Gói học. Ba trạng thái gói (Miễn phí,
  Dùng thử, Pro) vẽ giống nhau ở Tùy chỉnh phiên và tấm Tra bằng AI.
- D8 "Báo lỗi của tôi" là tab trong Lịch sử luyện tập. D9 phiên đang dở là thẻ ở cột phụ; chỉ hỏi khi mở phiên mới lúc còn phiên cũ.
- D10, D11 admin: một trang "Cài đặt hệ thống" 6 tab theo nhóm của API (thay trang "Thông báo & giới hạn" ở mục 2 và mục 7.6), không có khối "Mẫu
  email"; các màn admin vẽ mức khung, gồm cả màn AI của Bước 6; email người thao tác hiện ở màn admin (API cần trả thêm email, design đợt §10).
- D12 hồ sơ: Tên, Họ, Ngày sinh sửa ở Cài đặt → Tài khoản, ngày sinh mới vẫn phải đủ 13 tuổi; đăng ký chưa đủ 13 tuổi báo lỗi ngay dưới ô Ngày sinh
  (không có màn riêng). Chọn ngôn ngữ ở màn đầu bằng danh sách thả xuống có cờ.
- D13 bản tối: mọi màu gắn biến, xem bằng chế độ Dark; 4 màn mẫu ở section 11 của page 08.
- D14, D17 chữ: chỉ tiếng Việt trong mockup; "lượt" chỉ dùng cho AI (lượt câu AI, lượt tra AI), "phiên" cho phiên luyện, "câu" cho một lần trả lời;
  "Từ của tôi"; Miễn phí / Dùng thử / Pro; "Trình độ" thay "Level"; ngày, giờ, tiền theo `Intl` vi-VN ("Chủ Nhật, 18/10", "20:00", "99.000 ₫").
- D15 vẽ thẳng trong Figma (bỏ bước mockup HTML của mục 1.1); prototype "Web Bước 7: 1/2/3" trên page 08.
- Mỗi màn tối đa một nút vàng; chữ đạt tương phản ≥ 4,5:1, icon ≥ 3:1, không lớp tràn (script `../2026-10-21/figma-checks.js`).

**Câu ở mục 7 đã trả lời.** 7.2: trang con điện thoại giữ tab dưới, thêm nút quay lại. 7.3: D3. 7.4: bố cục B không có sidebar, danh sách nhóm ở
Hôm nay và trang Nhóm. 7.5: "Cần ôn lại" (chốt 20/10). 7.6: thay bằng "Cài đặt hệ thống" (D10). 7.7: Figma `7HcPAKLrWu32C27qYMJUOA`, phạm vi theo design
đợt §5. Câu 7.1 (style "Năng lượng") không hỏi lại trong đợt; chủ dự án duyệt các màn của mọi mốc theo style hiện tại.

**Việc API mà màn đã giả định** (design đợt §10, làm ở đợt code): trả email người thao tác ở các API admin; `group_id` cho
`GET /v1/practice/weak-words`; `sense_ids[]` cho `POST /v1/groups/{id}/items/bulk`; sửa ngày sinh qua `PATCH /v1/me`.
