# Critique A — Design Review: mockup 4 "Học thẻ xong vẫn quên"

Ngày 02/11/2026. Đánh giá `4-van-de.html` (+ `app.css`, `practice.js`, `motion.js`) theo rubric critique của impeccable, **không** dùng
`impeccable detect` hay script lint. Chế độ: **Persuade** (landing), mục tiêu duy nhất "Đăng ký miễn phí".

Nguồn đã đọc trong phiên này: mã nguồn 4 file trên; `PRODUCT.md`; các screenshot `m4-1440-full`, `m4-1440-fold`, `m4-1440-card-front`,
`m4-1440-card-back`, `m4-390-fold`, `m4-390-full`; trang chạy thật ở `http://localhost:5190/...` (đo bằng JS, browser pane bị ẩn);
`apps/web/messages/vi.json` (tên kiểu bài, chữ màn Thêm từ, Từ hay sai); design Bước 7 (bảng dạng bài, dòng 200–201); quyết định A11
(`2026-10-26-dot-cai-thien-a-decisions.md`) và D16 Bước 5 (trial 7 ngày, cần thẻ).

---

## 0. Kết luận một đoạn

Mockup giữ đúng design system của app (thanh navy, Lexend, nút sticker, sheet trắng, highlighter) và có một điểm mạnh thật: thẻ luyện tương
tác ngay ở hero. Nhưng trang đang **kể về vấn đề trí nhớ, không giới thiệu sản phẩm**: người đọc xong màn đầu biết "học flashcard dễ quên",
chưa biết Wordmet trông thế nào, có nhóm, tra từ, thêm nhanh hay không. Điểm khác biệt chính trong `PRODUCT.md` ("gặp từ ở đâu cũng thêm
được") nằm ở section thứ 5. Ngoài ra, phần demo và danh sách kiểu bài **không khớp app thật** ở vài chỗ kiểm được (mục 5, P1-2), và chữ
còn nhiều chỗ khẩu ngữ, một chỗ gây hiểu sai ("không cần thẻ").

---

## 1. Design-specificity verdict

**Một nửa được viết riêng cho Wordmet, một nửa thay được bằng bất kỳ app từ vựng nào.**

- Riêng cho Wordmet: hệ màu/nút/thẻ lấy từ app; thẻ luyện có chip nguồn câu ("Câu đã gặp · tin nhắn công việc"); 6 ngăn 1-3-7-14-30;
  khối "Từ hay sai" dùng đúng quy tắc của app ("Sai 2 lần trong 5 câu gần nhất", khớp `vi.json` dòng 1043); nhãn trung thực
  "Minh họa, không phải số đo", "Chưa mở bán".
- Thay được: H1 "Học flashcard xong, vài hôm lại quên?" và đường cong quên (forgetting curve) là câu mở của gần như mọi app spaced
  repetition (Anki, Quizlet, Memrise, các app Việt). Bố cục hero "chữ trái, demo phải với bước 1-2 số tròn đen" cũng là mẫu chung.
- Thiếu hẳn: giao diện app thật (thanh trên có tab **Hôm nay · Nhóm · Luyện tập · Tra từ** và nút **Thêm từ**, `vi.json` dòng 246–252),
  thẻ nhóm, tra từ. Người lạ không hình dung được "vào app thì thấy gì".

---

## 2. Nielsen 10 heuristics (0–4)

| # | Heuristic | Điểm | Lý do ngắn |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Thẻ luyện có thanh tiến độ 3 vạch, feedback đúng/sai, `aria-live`; thẻ lật có `aria-pressed`. |
| 2 | Match between system and real world | 2 | "Không cần thẻ" (thẻ ôn hay thẻ thanh toán?); "lượt luyện" trong khi thuật ngữ cố định là "phiên"; tên kiểu bài khác app. |
| 3 | User control and freedom | 3 | Lật lại thẻ, "Luyện lại", FAQ đóng/mở. |
| 4 | Consistency and standards | 2 | Tên kiểu bài và cách trả lời khác app thật; tab điều hướng mượn kiểu tab app (pill vàng khi active) nhưng là anchor, không bao giờ active; thanh ngăn không theo tỉ lệ. |
| 5 | Error prevention | 3 | Lựa chọn sai bị khóa, không chọn lại được. |
| 6 | Recognition rather than recall | 3 | Chip nguồn câu, gợi ý khi sai; người đọc không phải nhớ gì giữa các section. |
| 7 | Flexibility and efficiency | n/a | Landing. (Có phím 1–4 trong thẻ luyện, là điểm cộng.) |
| 8 | Aesthetic and minimalist design | 3 | Sạch, nhịp section tốt; trừ điểm vì H1 câu hỏi chiếm ~40% màn đầu và section "Dùng từ" là bảng chữ dày. |
| 9 | Help users recognize, diagnose, recover from errors | 3 | "Chưa đúng" + gợi ý; nhưng hành vi này khác app (mục P1-2). |
| 10 | Help and documentation | n/a | Landing (FAQ có, đủ). |

**Tổng: 22/32 → chuẩn hóa 27,5/40.** Mức "ổn, có vấn đề rõ ở khớp thực tế và nhất quán", không phải vấn đề thẩm mỹ.

---

## 3. Cognitive load

- **Thanh trên desktop: 7 lựa chọn** (5 anchor + Đăng nhập + Đăng ký), vượt ngưỡng 4. Các anchor ("Vì sao quên", "Dùng từ", "Ôn lại")
  không giúp người lạ quyết định gì. Đề xuất: còn 3 anchor ("Tính năng", "Gói học", "Hỏi đáp") + 2 nút, hoặc bỏ hẳn anchor.
- Hero: 1 CTA chính + 1 link đăng nhập + 4 lựa chọn trong thẻ luyện. 4 lựa chọn là của bài tập, không phải quyết định điều hướng: chấp nhận.
- Section "Dùng từ": 6 hàng × 3 cột (tên, ví dụ, gói) đọc như bảng thông số; không có điểm quyết định nhưng tải đọc cao.
- Gói học: 2 lựa chọn, một là "Chưa mở bán": tốt, gần như không có quyết định.

---

## 4. Emotional journey (peak-end)

| Đoạn | Cảm xúc người đọc | Ghi chú |
|---|---|---|
| Hero | "Đúng, mình hay quên" (đồng cảm) → tò mò khi bấm thẻ | Mở bằng nỗi đau; chưa có lời hứa cụ thể "Wordmet là gì". |
| Thẻ luyện ở hero | **Đỉnh** nhỏ: chọn đúng, thấy nghĩa và bản dịch | Đỉnh tốt nhưng ngắn, và là từ của người khác, không phải từ của mình. |
| Vì sao quên | Gật gù, hơi giảng bài | Đường cong là minh họa, không có cảm xúc. |
| Dùng từ | Đọc lướt bảng | Đoạn trũng nhất: chữ, không hình. |
| Ôn lại | Trung tính; dữ liệu mẫu "0, 0, 0, 0" cho cảm giác app trống | Bỏ lỡ cơ hội cho thấy tiến bộ. |
| Từ gặp ngoài đời | **Đỉnh thật** của sản phẩm (từ của mình thành bài tập) | Đặt quá muộn, nhiều người không cuộn tới. |
| Kết | "Đừng chỉ nhìn thẻ, hãy dùng từ" | Câu ra lệnh, giọng hơi trách; kết bằng phủ định thay vì lời mời. |

Peak-end: đỉnh mạnh nhất nằm ở section 5, kết thúc là câu khẩu hiệu. Đưa "từ gặp ngoài đời → bài tập" lên hero và kết bằng lời mời tích cực.

---

## 5. Điểm mạnh (giữ lại)

1. **Trung thành với design system của app**: thanh navy, Lexend, nút sticker có ledge, sheet trắng, highlighter dưới tiêu đề, `q-card`
   dựng lại từ màn luyện tập. Landing trông như cửa vào chính app đó, không phải một site marketing khác.
2. **Cho thử trước khi đăng ký**: thẻ luyện 3 câu chạy thật, có phím 1–4, `aria-live`, màn kết thúc dẫn thẳng về "Đăng ký miễn phí".
   Đây là cơ chế thuyết phục tốt nhất trên trang.
3. **Trung thực theo Product Principle 3**: "Pro · Chưa mở bán", "Minh họa, không phải số đo", điều kiện trial ghi rõ (7 ngày, cần thẻ;
   khớp D16 và dòng 129 của quyết định Bước 5). Một CTA duy nhất, nhất quán ở 4 chỗ.

---

## 6. Priority issues

### P1-1 — Màn đầu không giới thiệu sản phẩm (phản hồi 1 của chủ dự án)

**Hiện trạng.** H1 là câu hỏi về trí nhớ; phần phải là "thẻ deploy" + một câu điền từ. Nhóm và Tra từ không xuất hiện ở đâu trên trang
(Tra từ chỉ là một dòng trong bảng gói); Thêm nhanh nằm ở section 5; AI chỉ là chữ.

**Vì sao quan trọng.** Người lạ quyết định ở lại hay đi trong vài giây đầu bằng câu "đây là cái gì, trông ra sao". Câu hỏi về nỗi đau
không trả lời được. Thêm nữa, `PRODUCT.md` định vị Wordmet bằng "gặp từ ở đâu cũng thêm được", không phải "chống quên".

**Cách sửa cụ thể.**
- H1 nói Wordmet là gì (xem mục 9 để chọn câu). Câu về việc quên chuyển xuống làm section 2.
- Bên phải hero (desktop) là **một cửa sổ app** dựng bằng chính chrome của app: thanh navy có tab `Hôm nay · Nhóm · Luyện tập · Tra từ`
  và nút `Thêm từ`. Bên trong là màn Hôm nay với dữ liệu mẫu: 2–3 thẻ nhóm (ví dụ "Công việc · 48 từ · 12 thẻ cần ôn", "B1 · Du lịch"),
  khối "Từ hay sai".
- Ngay dưới hero, một dải **5 phần chính** (thẻ ôn, nhóm, tra từ, thêm nhanh, luyện AI), mỗi phần một mảnh UI nhỏ thật + một dòng chữ.
  Bấm một phần thì cửa sổ app phía trên chuyển sang màn đó (5 lựa chọn: chấp nhận được vì là điều hướng phụ; nếu muốn ≤ 4 thì gộp
  "tra từ" và "thêm nhanh" thành "Gặp từ mới").
- Mobile 390px: cửa sổ app đổi thành khung điện thoại (đã có `.phone` trong `app.css`) với thanh tab dưới; 5 phần là dải cuộn ngang
  có snap, hoặc xếp dọc, mỗi phần một mảnh UI.
- Giữ thẻ luyện tương tác, nhưng đặt nó làm một trong 5 phần ("Luyện tập"), không phải toàn bộ hero.

### P1-2 — Demo và danh sách kiểu bài không khớp app thật (phản hồi 2)

**Hiện trạng, đã kiểm trong phiên này.**
- Thẻ ở hero có chip "Câu đã gặp" nhưng cho **chọn 1 trong 4** và cho chọn lại sau khi sai. Trong app, bài điền từ từ câu đã lưu là
  **gõ từ** (design Bước 7, dòng 201: "Gõ từ"; `vi.json` `ask.cloze`: "Gõ từ còn thiếu, đúng dạng trong câu"). Dạng chọn 4 trong câu là
  `mcq_sentence` ("Trắc nghiệm theo câu", câu AI, gói Pro), và với dạng chọn, sai là hiện đáp án, không làm lại (design Bước 7 dòng 457).
  Người dùng Free đăng ký vì demo này sẽ gặp một kiểu bài khác.
- "Trắc nghiệm nghĩa: *assume* nghĩa là gì?" ngược chiều với prompt của app `ask.mcq`: "Chọn từ có nghĩa này" (cho nghĩa, chọn từ).
  **Cần chủ dự án xác nhận** app có chiều "cho từ, chọn nghĩa" hay không; mình chỉ thấy chiều kia trong `vi.json`.
- Tên kiểu bài khác app: landing "Đúng hay sai" / "Gõ từ theo nghĩa" / "Câu mới để điền từ" so với app "Đúng/sai" / "Gõ từ · theo nghĩa" /
  "Điền từ vào câu". Thiếu hẳn "Trắc nghiệm theo câu" (`mcq_sentence`).
- Nhãn "Miễn phí" cho "Điền từ vào câu bạn đã lưu" là **đúng** (A11, 26/10/2026 đổi D11 Bước 7 thành "mọi gói").

**Cách sửa cụ thể.** Thay 6 hàng chữ bằng **lưới thẻ câu hỏi thu nhỏ**, mỗi thẻ đúng giải phẫu `q-card` của app: đầu thẻ (tên kiểu bài
theo `practice.kind` + chip gói), dòng hỏi theo `practice.ask`, nội dung (câu có chỗ trống, 4 nút lựa chọn, hoặc ô nhập), không cần
tương tác. Chia hai nhóm có tiêu đề: **"Không cần AI · Miễn phí"** (Trắc nghiệm, Đúng/sai, Gõ từ, Điền từ vào câu bạn đã lưu) và
**"Câu do AI soạn · Pro"** (Điền từ vào câu, Chọn nghĩa trong câu, Trắc nghiệm theo câu). Desktop 3 cột, mobile 1 cột hoặc cuộn ngang có
snap. Thẻ ở hero đổi thành đúng một kiểu bài có thật cho gói Free (ví dụ Trắc nghiệm, hoặc Điền từ câu đã lưu với ô gõ).

### P1-3 — Chữ chưa chuyên nghiệp, một chỗ gây hiểu sai (phản hồi 3)

**Hiện trạng.** "Miễn phí, không cần thẻ" trên một trang mà "thẻ" là thẻ ôn từ: người đọc không biết là thẻ nào. "Lượt luyện" va với thuật
ngữ cố định "phiên" (lượt dành cho quota: "lượt câu AI", "lượt tra AI"). Nhiều chữ khẩu ngữ: "vài hôm", "không ra", "giờ dùng nó",
"dán vào luôn", "chọn lại nhé", "lên Pro", "dùng mãi", "làm sau". Câu "không tốn lượt AI" dễ hiểu thành "câu AI không tốn lượt".

**Cách sửa.** Bảng thay chữ từng dòng ở mục 9.

### P2-4 — Dữ liệu mẫu ở "Ôn lại" nói ngược ý section

**Hiện trạng.** Thanh "Mới 410" và "1 ngày 20" cùng đầy 100% (CSS `.bar.on` là toàn thanh, không theo số), 4 ngăn còn lại 0. Người đọc thấy
một tài khoản chưa tiến bộ gì, trong khi section nói về việc từ lên ngăn dần.

**Cách sửa.** Thanh theo tỉ lệ (width = số/tổng) và phân bố kể được câu chuyện, ghi là dữ liệu mẫu, ví dụ 430 từ: Mới 120 · 1 ngày 64 ·
3 ngày 85 · 7 ngày 72 · 14 ngày 51 · 30 ngày 38.

### P2-5 — H1 và demo ở hero bị ẩn chờ animation

**Hiện trạng.** H1 có class `reveal`, nên bắt đầu ở `opacity: 0` và chỉ hiện khi `IntersectionObserver` báo. Failsafe trong `<head>` chỉ
bật khi `motion.js` **không chạy**, không bật khi script chạy mà observer không bắn. Khi đo trong browser pane (bị ẩn), sau ~2,3 giây H1
vẫn `opacity: 0`, 0/19 phần tử `.reveal` có class `in`. **Chưa tách được** nguyên nhân: có thể chỉ do pane ẩn làm trình duyệt hoãn
observer; screenshot headless trước đó thì hiện đủ. Dù sao, hero là phần tử LCP (phần lớn nhất màn đầu) và không nên chờ animation.

**Cách sửa.** Bỏ `reveal` khỏi mọi thứ trong `.hero`; nếu muốn có chuyển động, dùng CSS animation chạy ngay khi tải, không phụ thuộc
observer.

---

## 7. Red flags theo persona

**Người lần đầu, đang bối rối.**
- Đọc H1 xong không biết đây là app, bài blog hay khóa học. Không có câu nào kiểu "Wordmet là ứng dụng học từ vựng tiếng Anh".
- "Không cần thẻ": thẻ nào?
- Chip "Câu đã gặp · tin nhắn công việc" ở hero chưa được giải thích; tới section 5 mới hiểu.
- Hai bước số 1 → 2 gợi ý một quy trình, nhưng không nói đây là demo bấm được (chữ "Chạm để lật" nhỏ, xám).

**Người dùng điện thoại, đang phân tâm (390px).**
- Màn đầu: H1 + lead + CTA, tốt. Thẻ luyện bắt đầu dưới màn đầu, phải cuộn mới thấy app.
- Không có menu: không nhảy tới "Gói học" hay "Hỏi đáp" được (chấp nhận được cho landing, nhưng "Gói học" là câu hỏi hay gặp).
- Đường cong ở 390px: chữ trục 13px trong `viewBox` 600 bị thu còn khoảng 6–7px, gần như không đọc được (thấy rõ ở `m4-390-full`).
- Section "Dùng từ" thành 6 khối chữ xếp dọc, chip Miễn phí/Pro trôi xuống dưới ví dụ: dài, ít hình.

**Người học Việt 16–25 tuổi, đã dùng Quizlet/Anki.**
- H1 trúng nỗi đau của họ: điểm cộng.
- FAQ "Flashcard chỉ cho bạn xem nghĩa" sẽ bị cãi ngay (Quizlet có Learn/Test, Anki có gõ đáp án). Câu so sánh nên nói cái Wordmet **có**,
  không chê cái khác **không có**.
- Họ muốn thấy: kho từ theo trình độ A1–C2 và chủ đề (hiện chỉ là một dòng tick ở section navy), cách tạo nhóm, và "thêm từ gặp trên
  TikTok/Netflix trong vài giây". Cả ba đều không có hình.
- "3 phiên luyện mỗi ngày" ở gói Free: rõ. Pro "nhiều phiên hơn" mơ hồ; nhóm này sẽ hỏi "bao nhiêu, giá bao nhiêu".

---

## 8. Quan sát nhỏ

- Screenshot `m4-1440-fold.png`, `m4-1440-full.png`, `m4-390-fold.png`, `m4-390-full.png` cho thấy thẻ "deploy" sụp chiều cao, chữ đè lên
  nhãn bước 1 và 2. Trang chạy thật hiện giờ đo được thẻ cao 136px (`min-height` 8,5rem đúng), và `m4-1440-card-front.png` cũng hiện đúng,
  nên nhiều khả năng các screenshot đó chụp trước lần sửa CSS cuối. **Nên chụp lại** trước khi đưa chủ dự án xem.
- Trục đường cong: nhãn "Học" (x=40) và "1" (x=58) chồng lên nhau.
- Thẻ lật: `aria-label="Lật thẻ deploy"` ghi đè nội dung nút, nên screen reader không bao giờ đọc nghĩa ở mặt sau.
- "Chạm để lật" trên desktop: nên là "Bấm để lật" hoặc chữ trung tính "Lật thẻ".
- Section "Dùng từ": cột chip gói rộng 7rem nằm xa ví dụ ở 1440px, mắt phải nhảy ngang; h3 "Điền từ vào câu bạn đã lưu" xuống hai dòng.
- Tab điều hướng mượn kiểu tab của app (pill vàng `aria-current`) nhưng không có scroll-spy, nên không bao giờ có tab active: trông như app
  bị lỗi trạng thái.
- Khối Thêm từ ở section navy dùng chữ khác app ("Thêm từ vừa gặp", nút "Thêm") trong khi app là "Bạn vừa gặp từ nào?", nhãn
  "Câu bạn gặp (không bắt buộc)", nút "Lưu {word}", có bước chọn nghĩa và chọn nhóm (`vi.json` dòng 827–850). Dùng đúng chữ app và
  thêm bước "Lưu vào nhóm" là cách tự nhiên để cho thấy **nhóm**.
- Màn kết thúc thẻ luyện: "Trong Wordmet, câu luyện là chính câu bạn đã lưu" nói quá; đó là một trong nhiều kiểu bài.
- Hai section liền nhau có nền trắng/canvas xen kẽ, rồi navy, rồi trắng: nhịp ổn; section navy "Từ gặp ngoài đời" xứng đáng là đỉnh,
  hiện chỉ đang đứng thứ 5.

---

## 9. Chữ tiếng Việt: từng dòng

Quy tắc áp dụng: không "!", không "Vui lòng", gọi "bạn", app tự xưng "Wordmet", không "chúng tôi", dùng thuật ngữ cố định (thẻ, nhóm,
phiên, ngăn, câu đã gặp, Từ của tôi, lượt câu AI).

| Chỗ | Hiện tại | Vấn đề | Đề xuất |
|---|---|---|---|
| H1 | Học flashcard xong, vài hôm lại quên? | Khẩu ngữ ("vài hôm"), trộn tiếng Anh, không nói sản phẩm là gì | Nếu theo phản hồi 1: **"Học từ vựng tiếng Anh để dùng được, không chỉ để nhận ra"** hoặc **"Từ vựng tiếng Anh: học theo nhóm, ôn đúng lúc, luyện trong câu"**. Câu hỏi về việc quên chuyển xuống section 2. |
| Lead hero | Nhìn thẻ thì nhớ nghĩa, nhưng đến lúc cần dùng lại không ra. Wordmet cho bạn dùng từ ngay trong câu, qua bài trắc nghiệm, gõ từ, điền từ, và nhắc ôn lại đúng lúc sắp quên. | "không ra" khẩu ngữ; câu liệt kê dài, dấu phẩy trước "và" | **"Wordmet giúp bạn ghi nhớ và sử dụng từ vựng tiếng Anh: lưu từ theo nhóm, ôn theo lịch tự động và luyện tập với các dạng bài trong câu."** |
| Ghi chú hero | Miễn phí, không cần thẻ. Học trên trình duyệt máy tính và điện thoại. | "thẻ" mơ hồ trên trang về thẻ ôn | **"Miễn phí, không cần thẻ thanh toán. Dùng trên trình duyệt, cả máy tính và điện thoại."** |
| Bước 2 | Giờ dùng nó trong câu | Khẩu ngữ ("giờ", "nó") | **"Dùng từ đó trong câu"** |
| Thẻ lật | Chạm để lật | Sai trên desktop | **"Lật thẻ"** |
| Feedback luyện | Chọn từ hợp với câu. | Thiếu chữ | **"Chọn từ phù hợp với câu."** |
| Feedback luyện | Chưa đúng, chọn lại nhé | "nhé" thân mật; và app thật không cho chọn lại ở dạng chọn | **"Chưa đúng."** + hiện đáp án đúng (theo hành vi app) |
| Feedback luyện | Đúng rồi | Hơi khẩu ngữ | **"Chính xác"** |
| Màn kết thúc | Xong phiên thử | Cụt | **"Bạn đã hoàn thành phiên luyện thử"** |
| Màn kết thúc | Trong Wordmet, câu luyện là chính câu bạn đã lưu. Tạo tài khoản để lưu từ và giữ lịch ôn. | Nói quá | **"Tạo tài khoản để lưu từ của bạn, nhận lịch ôn và luyện với chính những câu bạn đã gặp."** |
| H2 | Vì sao thuộc rồi vẫn quên | Được, hơi khẩu ngữ | **"Vì sao đã học rồi vẫn quên"** |
| Lý do 1 | Nhận ra nghĩa chưa phải là dùng được / Lật thẻ thấy nghĩa là đúng, nhưng tự đặt từ vào câu lại là việc khác. Phải tập dùng thì mới nhớ cách dùng. | Lặp "dùng", "là đúng" mơ hồ | **"Nhận ra nghĩa khác với dùng được từ"** / **"Lật thẻ và nhận ra nghĩa mới là bước đầu. Để dùng được một từ, bạn cần tự đặt nó vào câu, nhiều lần."** |
| Lý do 2 | Không ôn lại thì trí nhớ mờ dần / Một từ chỉ gặp một lần sẽ phai sau vài ngày. Gặp lại đúng lúc sắp quên thì lần sau nhớ lâu hơn. | Khẩu ngữ ("phai", "vài ngày") | **"Không ôn lại, trí nhớ giảm dần"** / **"Từ chỉ gặp một lần thường bị quên sau vài ngày. Mỗi lần ôn lại đúng lúc sắp quên, bạn nhớ từ đó lâu hơn."** |
| Chú thích đồ thị | Minh họa, không phải số đo | Cụt | **"Hình minh họa, không phải số liệu đo được"** |
| H2 | Dùng từ ngay trong câu | Được | Giữ, hoặc **"Luyện từ trong câu"** |
| Lead "Dùng từ" | Mỗi lượt luyện trộn nhiều kiểu bài trên những từ bạn đang học. Gói Pro có thêm câu do AI viết quanh đúng từ đó. | "lượt luyện" sai thuật ngữ; "quanh đúng từ đó" lủng củng | **"Mỗi phiên luyện tập kết hợp nhiều dạng bài với các từ bạn đang học. Gói Pro có thêm câu do AI soạn riêng cho từng từ."** |
| Tên kiểu bài | Trắc nghiệm nghĩa / Đúng hay sai / Gõ từ theo nghĩa / Điền từ vào câu bạn đã lưu / Câu mới để điền từ / Chọn nghĩa trong câu | Khác tên trong app | Dùng đúng `practice.kind`: **Trắc nghiệm · Đúng/sai · Gõ từ · theo nghĩa · Điền từ vào câu (câu bạn đã lưu) · Điền từ vào câu (câu AI) · Chọn nghĩa trong câu · Trắc nghiệm theo câu** |
| Dòng AI | AI chỉ viết câu. Đáp án của bạn luôn chấm bằng quy tắc, nên kết quả rõ ràng và không tốn lượt AI. | "không tốn lượt AI" dễ hiểu sai; thiếu "được" | **"AI chỉ soạn câu hỏi. Câu trả lời của bạn được chấm theo quy tắc cố định, nên kết quả nhất quán. Lượt câu AI chỉ tính khi tạo câu, không tính khi chấm."** |
| H2 | Ôn lại đúng lúc sắp quên | Được | Giữ |
| Lead "Ôn lại" | Mỗi từ nằm trong một ngăn. Nhớ thì lên ngăn sau, lâu hơn mới gặp lại. Từ hay sai được gom riêng để luyện thêm. | Câu cụt, khẩu ngữ | **"Mỗi từ được xếp vào một ngăn. Khi bạn nhớ được, từ lên ngăn tiếp theo và được ôn lại sau khoảng thời gian dài hơn. Những từ bạn hay trả lời sai được gom vào danh sách Từ hay sai để luyện riêng."** |
| Tick | Sáu ngăn: mới, 1, 3, 7, 14, 30 ngày | Thiếu "và" | **"Sáu ngăn: Mới, 1, 3, 7, 14 và 30 ngày"** |
| Tick | Nhắc ôn qua email khi có thẻ đến hạn | Được | **"Email nhắc ôn khi có thẻ đến hạn"** |
| Tick | Ôn thẻ không giới hạn ở gói Miễn phí | Được | Giữ |
| Khối Từ hay sai | Sai 2 lần trong 5 câu gần nhất thì từ vào đây để luyện riêng. | "vào đây" khẩu ngữ | Dùng chữ app: **"Từ bạn sai 2 lần trong 5 câu gần nhất sẽ hiện ở đây."** |
| H2 navy | Từ gặp ngoài đời cũng thành bài tập | "ngoài đời" khẩu ngữ | **"Từ bạn gặp hằng ngày trở thành bài luyện tập"** |
| Lead navy | Gặp từ lạ trong phim, email hay tin nhắn công việc thì thêm vào Wordmet kèm câu đó. Wordmet nhận ra dạng chia, như went → go, và dùng chính câu ấy để bạn luyện. | Cấu trúc "Gặp... thì..." khẩu ngữ | **"Khi gặp một từ mới trong phim, email hay tin nhắn công việc, bạn thêm từ đó vào Wordmet cùng câu chứa nó. Wordmet nhận ra dạng chia (went → go) và dùng chính câu đó để tạo bài điền từ."** |
| Tick navy | Có sẵn từ theo trình độ A1–C2 và chủ đề | Được | **"Kho từ có sẵn theo trình độ A1–C2 và theo chủ đề"** |
| Tick navy | Từ chưa có thì tự thêm thành từ của bạn | Lủng củng, không dùng thuật ngữ | **"Từ chưa có trong kho: tự nhập nghĩa và lưu vào Từ của tôi"** |
| Khối Thêm từ | Thêm từ vừa gặp / Gõ từ bạn vừa gặp. Có câu chứa từ đó thì dán vào luôn. / nút Thêm | "luôn" khẩu ngữ; khác chữ app | Dùng chữ app: **"Bạn vừa gặp từ nào?"**, nhãn **"Từ"**, **"Câu bạn gặp (không bắt buộc)"**, nút **"Lưu borrow"** |
| Mũi tên | trở thành câu luyện | Được | **"thành bài điền từ"** |
| H2 gói | Học đều mỗi ngày, lên Pro khi cần | "lên Pro" khẩu ngữ | **"Bắt đầu miễn phí, nâng cấp khi cần"** |
| Chip Free | Dùng mãi | Khẩu ngữ | **"Không giới hạn thời gian"** |
| Free | Tra từ và thêm nhanh / 3 phiên luyện mỗi ngày | Thiếu chữ | **"Tra từ và thêm từ nhanh"** / **"3 phiên luyện tập mỗi ngày"** |
| Pro | Nhiều phiên luyện hơn mỗi ngày | Mơ hồ | Ghi con số khi đã chốt; tạm **"Thêm phiên luyện tập mỗi ngày"** |
| Pro | Câu AI viết quanh từ của bạn, chấm bằng quy tắc | Lủng củng | **"Câu luyện do AI soạn cho từng từ bạn học"** |
| Pro | Tra từ bằng AI | Được | Giữ |
| Ghi chú Pro | Khi Pro mở bán: dùng thử 7 ngày, cần thẻ, hủy trước khi hết hạn thì không bị trừ tiền. | Chuỗi mệnh đề cụt; "thẻ" mơ hồ | **"Khi gói Pro mở bán, bạn có thể dùng thử 7 ngày (cần thẻ thanh toán). Hủy trước khi hết thời gian dùng thử thì không bị trừ tiền."** |
| FAQ 1 hỏi | Wordmet khác học flashcard thường ở đâu? | "ở đâu" khẩu ngữ | **"Wordmet khác các ứng dụng flashcard ở điểm nào?"** |
| FAQ 1 đáp | Flashcard chỉ cho bạn xem nghĩa. Wordmet thêm bài tập... | Chê đối thủ, dễ bị cãi | **"Ngoài thẻ ôn, Wordmet có các bài tập để bạn tự dùng từ trong câu, và tự xếp lịch ôn lại cho từng từ dựa trên kết quả của bạn."** |
| FAQ 2 đáp | Có. Gói Miễn phí gồm ... Gói Pro thêm câu AI và tra bằng AI, hiện chưa mở bán. | Được | **"Có. Gói Miễn phí gồm ôn thẻ, lịch ôn, email nhắc ôn, tra từ và 3 phiên luyện tập mỗi ngày. Gói Pro có thêm câu luyện do AI soạn và tra từ bằng AI; gói này chưa mở bán."** |
| FAQ 3 | AI có chấm bài của tôi không? / Không. AI chỉ viết câu luyện. Đáp án của bạn được chấm bằng quy tắc, nên không tốn lượt AI. | "tôi" trong câu hỏi chấp nhận được; câu đáp như dòng AI ở trên | **"Không. AI chỉ soạn câu luyện. Câu trả lời của bạn được chấm theo quy tắc cố định; việc chấm không trừ lượt câu AI."** |
| FAQ 4 đáp | Wordmet chạy trên trình duyệt, cả máy tính và điện thoại. App điện thoại làm sau. | "làm sau" khẩu ngữ và hứa lộ trình | **"Hiện Wordmet dùng trên trình duyệt, cả máy tính và điện thoại. Ứng dụng riêng cho điện thoại chưa có."** |
| H2 cuối | Đừng chỉ nhìn thẻ, hãy dùng từ | Câu ra lệnh, giọng trách | **"Bắt đầu học từ vựng với Wordmet"** + dòng phụ **"Miễn phí, không cần thẻ thanh toán."** |
| Thanh trên | Vì sao quên · Dùng từ · Ôn lại · Gói học · Hỏi đáp | 5 anchor, nhãn theo lập luận chứ không theo sản phẩm | **Tính năng · Gói học · Hỏi đáp** |

---

## 10. Ba câu hỏi gợi mở

1. Nếu người đọc chỉ đọc H1, họ có biết Wordmet là **ứng dụng học từ vựng tiếng Anh** không, hay nghĩ đây là bài viết về trí nhớ?
2. Điểm khác biệt mạnh nhất (gặp từ ở ngoài → lưu cùng câu → thành bài luyện) đang nằm ở section thứ 5, trên nền navy. Nếu chỉ được giữ
   một section, có phải nó mới là section cần giữ, và nó có nên là hero không?
3. Hero hiện cho thử 3 từ của người khác. Nếu demo cho người đọc **gõ một từ họ gặp hôm nay** (thêm nhanh + tra từ) rồi thấy nó thành thẻ
   và thành một câu luyện, toàn bộ sản phẩm có được kể trong 20 giây không?

---

## Chưa kiểm / rủi ro còn mở

- Chiều của "Trắc nghiệm" (cho từ chọn nghĩa hay cho nghĩa chọn từ): mình chỉ thấy "Chọn từ có nghĩa này" trong `vi.json`; cần chủ dự án
  hoặc code Practice xác nhận trước khi dựng thẻ mô phỏng.
- Hiện tượng H1 `opacity: 0` (P2-5) chưa tách được khỏi việc browser pane bị ẩn; cần mở trang ở tab hiển thị để xác nhận.
- Không kiểm dark mode, không chạy axe, không kiểm contrast bằng công cụ (ngoài phạm vi Assessment A).
- Số phiên/ngày và giá của Pro chưa chốt; bảng chữ ở mục 9 để trống con số đó.
