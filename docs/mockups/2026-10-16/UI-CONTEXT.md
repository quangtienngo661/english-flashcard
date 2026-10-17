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
- Trang admin "Thông báo & giới hạn": bật/tắt nhắc toàn hệ thống, giờ gửi mặc định, số email nhắc tối đa mỗi người mỗi tuần, hai
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
6. Trang admin "Thông báo & giới hạn" chưa có mockup; dựng theo khung admin B hiện có (sidebar + tờ trắng).
7. Sau khi chốt style: bước Figma (file nào, phạm vi màn nào).

## 8. Ngoài phạm vi giao diện Bước 3

Flutter và push (làm sau), bài luyện (Bước 4), AI, đăng nhập Google và xóa tài khoản (Bước 8), dashboard thống kê cho admin.
