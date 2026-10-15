# Giao diện Wordmet đã ra đời thế nào: nghiên cứu, tham khảo và ra quyết định

Viết ngày 15/10/2026 cho chủ dự án. Mục đích: xem lại **quy trình** đã đưa tới giao diện (UI) hiện nay của landing page và
trang admin, để dùng lại hoặc sửa quy trình cho lần sau. Tài liệu này chỉ tổng hợp; mọi con số, ngày và quyết định lấy từ
file trong repo, ghi nguồn trong ngoặc bằng **tên tắt** (bảng tên tắt → file ở mục 6). Chỗ nào repo không ghi thì viết
"không có ghi chép". Ý kiến riêng của người viết được đánh dấu **nhận xét của người tổng hợp**.

Vài từ dùng nhiều lần:
- **landing page**: trang giới thiệu sản phẩm, trang đầu tiên người lạ thấy (`wordmet.com`, code ở `apps/web`).
- **admin**: trang quản trị cho nhân viên soạn nội dung (`apps/admin`).
- **mockup**: bản vẽ mẫu của màn hình, chưa phải code thật. **Figma** là công cụ vẽ giao diện trên web.
- **design doc**: tài liệu thiết kế chính thức để build. **decision record**: file ghi mọi quyết định, các phương án đã đưa ra
  và lý do chọn.
- **token**: một giá trị thiết kế có tên, ví dụ `primary` = màu xanh `#2f5bea`; đổi một chỗ là cả app đổi theo.

---

## 1. Tóm tắt một đoạn

Giao diện hiện nay đến từ ba vòng làm việc trong 9 ngày. Vòng 1 (07–09/10) làm landing: trợ lý gom nguyên tắc về landing page
và đọc trang của đối thủ, dựng mockup trên Figma, chủ dự án sửa trực tiếp trên Figma; các quyết định được chốt từng câu một,
code bám theo Figma, và các luật thiết kế (độ tương phản màu, đơn vị co giãn) được biến thành test tự động. Vòng 2 (14–15/10)
làm admin: hướng giao diện rút ra từ số đo thật của bốn sản phẩm lớn; Figma được duyệt sau 5 vòng sửa, nhưng chủ dự án chưa
ưng nên gửi template Sneat; Figma làm lại và được duyệt lần hai cùng ngày; code bám theo bản mới, và ngày 15/10 chủ dự án coi
phần nhìn của admin là tạm. Vòng 3 (15/10) bắt đầu vì chủ dự án chưa hài lòng với cả hai: trợ lý nghiên cứu chuyển động
(motion) từ nguồn chính thức, đo các site tham khảo, đọc một bản audit landing, rồi dựng bốn mockup HTML bấm được; chủ dự án
chọn hướng B. Buổi brainstorm sau đó (12 câu hỏi và 5 phần trình bày bằng mô phỏng bấm được) cho ra design doc và decision
record UB1–UB19; chưa build. Thay đổi lớn nhất giữa các vòng là **cách duyệt hình**: từ khung Figma tĩnh sang trang HTML bấm
thử được.

## 2. Dòng thời gian

```
07/10  ┐ VÒNG 1 — Landing (apps/web)
       │  Research + quyết định L1–L3 (context landing)
08/10  │  Figma mockup v1 → chủ dự án sửa chữ trên Figma, nhờ Codex sửa trang
       │  → design doc + decisions (W1–W16) → plan 11 task → code (commit deab488)
       │  → 3 bản review (chữ, token, accessibility + design)
09/10  ┘  Deploy lên Cloudflare Workers (commit 9f0cfa5, e0e1254)
11/10     Audit landing (file không ghi ngày; ngày sửa file trên máy là 11/10)
14/10  ┐ VÒNG 2 — Admin (Bước 2.5)
       │  Đo 4 sản phẩm lớn · danh sách site đoạt giải · kiểm kê mục admin · đo template Sneat
       │  Brainstorm D1–D23 → Figma M0, 5 vòng sửa → duyệt lần 1
       │  ⚡ chủ dự án chưa ưng → gửi Sneat (F5, F6) → Figma làm lại → duyệt lần 2
       │  Code theo Figma mới (commit 6e9ba47)
15/10  │  Xong luồng CSV (M3), chạy "Xong khi", rà Web Interface Guidelines
       ┘  ⚡ chủ dự án: phần nhìn của admin là tạm
15/10  ┐ VÒNG 3 — Làm mới theo hướng B
       │  ⚡ chủ dự án chưa hài lòng cả hai → nghiên cứu motion + đo site tham khảo
       │  4 mockup HTML → chọn landing B; admin mặc "áo" B nhưng giữ sidebar của A
       │  Brainstorm Q1–Q12 + 5 phần bằng mô phỏng → design doc + decisions UB1–UB19
       ┘  Chưa build ("khoan hả build")
```

| Vòng | Điều khởi động | Kết quả |
|---|---|---|
| 1 | Chủ dự án muốn một trang giới thiệu sản phẩm dùng lâu dài trên production (L1) và chọn làm trước Bước 2 (W1) (decisions landing) | Landing đã build và deploy; ngày 15/10 trang chạy ở `wordmet.com/vi` (motion §1) |
| 2 | Bước 2 chốt giao diện web quản trị thành Bước 2.5 (D9 của Bước 2, design admin phần mở đầu) | Admin chạy local, kiểu Sneat; chủ dự án ghi là tạm (delivery 2.5) |
| 3 | "Chủ dự án chưa hài lòng với cả hai" (motion, phần mở đầu) | Design doc và decision record, chờ chủ dự án duyệt bản viết; chưa code (design B) |

Chủ dự án không hài lòng ở điểm nào cụ thể, ở vòng 1 lẫn vòng 2: **không có ghi chép**. Vòng 2 chỉ ghi "chưa ưng Figma đã
duyệt" (decisions admin, F5).

---

## 3. Từng vòng

### 3.1 Vòng 1 — Landing (07–09/10/2026)

**Đầu vào nghiên cứu**

| Nghiên cứu gì | Nguồn và cách đọc | Giới hạn nguồn tự nêu |
|---|---|---|
| Landing hiệu quả cần gì | NN/g: người đọc quyết định ở lại hay rời trang trong khoảng 10 giây đầu (dựa trên nghiên cứu Microsoft Research 2010, 205.873 trang); 79% người dùng lướt, 16% đọc từng chữ (context landing §4) | Con số 79% là nguồn thứ cấp, chưa đọc bài gốc |
| Lời khuyên viết hero, nút bấm | Bài phân tích trang Babbel và Drops (landingdoctors.com); bài về trang trước ra mắt (getlaunchlist.com) (context landing §4) | Ý kiến bên thứ ba / nguồn thứ cấp. Các con số kiểu "tăng conversion 3 lần" không dẫn gốc nên **không dùng** |
| Định vị so với đối thủ | Clozemaster, Quizlet/Anki, Duolingo, ChatGPT; khảo sát cũ: 5/6 người cho rằng AI miễn phí đã đủ (context landing §3) | Phần "Vấn đề" trên trang là giả thuyết, chưa kiểm bằng phỏng vấn (context landing §5) |
| Kỹ thuật | Tài liệu Next.js qua **context7** (công cụ tra tài liệu chính thức mới nhất của thư viện); MDN cho `animation-timeline` và "giảm chuyển động"; WCAG 2.2 cho cỡ vùng bấm (context landing §10–11; design landing §2) | `animation-timeline: view()` chưa đủ hỗ trợ trình duyệt nên không dựa vào |
| Đo chính mockup | Script **chỉ đọc** chạy trên Figma: trang mobile VI dài 6.540px, gấp khoảng 1,5 lần desktop 4.493px; khoảng cách trong hero 10px; nút đáp án 43px; chữ nhỏ nhất 11px (context landing §11.1). Desktop 173/191 phần tử co giãn, mobile 181/189 (design landing §6.4) | — |

**Tham khảo** (context landing §4, bảng "Trang tham khảo")

| Trang | Lấy gì | Không lấy |
|---|---|---|
| Clozemaster (đọc trực tiếp) | Hero ngắn + **một bài điền từ mẫu ngay trong hero**; "How it works" ba bước; nói thẳng "miễn phí" | Testimonial, lời hứa "nhanh nhất" |
| Speak (qua bản tóm tắt WebFetch) | Ba bước có ảnh màn hình; giải thích AI làm gì; FAQ so với đối thủ | Giải thưởng, số lượt tải |
| ELSA Speak VN | Giọng tiếng Việt gần gũi; câu chuyện founder | Trang quá dày, nhiều số tự công bố |
| Quizlet, Duolingo, Lingvist | Khối lợi ích ngắn, xoay quanh "tài liệu của bạn"; chọn ngôn ngữ ở đầu trang | Mascot nhắc học (V1 không có nhắc học), testimonial |

**Bản nháp hình ảnh: Figma**

- File `NVyO0njIAcOUTAl85a1Xdx`, 4 trang: tiếng Việt và tiếng Anh, mỗi thứ tiếng có desktop 1440px và mobile 390px
  (context landing §11). Ai dựng bản v1: không ghi rõ; các chỉnh sửa ở §11 được làm sau khi chủ dự án cài skill.
- Có **prototype** (bản bấm thử trong Figma): bài điền từ 4 trạng thái; flashcard lật bằng Smart Animate 0,45 giây (Figma không
  xoay 3D được nên chỉ chuyển mặt); bảng trạng thái form email với 2 cách đồng ý chính sách và 12 trạng thái. Hiệu ứng khi
  cuộn trang không mô phỏng được nên ghi thành chú thích (context landing §11, §11.4).
- Chủ dự án yêu cầu 4 việc: hiện dần khi cuộn, lật flashcard, sửa bố cục mobile, trạng thái form và các bước bài mẫu
  (context landing §11). Sau khi sửa, trang mobile VI còn 5.460px.
- Các vòng sửa: chủ dự án **sửa chữ trực tiếp trên Figma**; một loạt quyết định trên Figma (bỏ phần founder, card cùng hàng cao
  bằng nhau, tiêu đề không chấm cuối…); rồi chủ dự án **nhờ Codex sửa trang** (FAQ còn 4 câu, gói thứ hai đổi tên "Trải nghiệm
  AI", chữ nút "Nhận thông báo ra mắt"). Trợ lý đọc lại Figma và sửa design doc lần 2 (decisions landing "Các quyết định trên
  Figma"; design landing phần đầu). Số vòng duyệt chính xác: **không có ghi chép**.
- Bộ màu và font (xanh `#2F5BEA`, nền kem `#FAF8F5`, Be Vietnam Pro) lấy từ biến `Landing tokens` của Figma (design landing §6.1).
  Các phương án màu/font đã cân nhắc: **không có ghi chép**.

**Cách ra quyết định**

Brainstorm bằng skill `superpowers:brainstorming` (một **skill** là gói hướng dẫn quy trình cho trợ lý) ngày 07–08/10 (design
landing phần đầu). Mỗi ý có nhãn: **Chốt** = chủ dự án nêu rõ; **Đề xuất** = trợ lý đề xuất;
`ASSUMPTION` = chưa kiểm chứng; **Mở** = chưa quyết (context landing phần đầu). Decision record ghi thêm cột "Ai chốt":
chủ dự án chọn / chủ dự án tự yêu cầu / duyệt cùng design (decisions landing).

| # | Câu hỏi | Phương án đã đưa ra | Chọn | Ai chốt, vì sao |
|---|---|---|---|---|
| L1 | Trang để làm gì | Tuyển người thử pilot / chủ yếu nộp Claude for Startups / cả hai | Giới thiệu sản phẩm, dùng lâu dài | Chủ dự án tự nêu: trang là cửa vào lâu dài của sản phẩm |
| W1b | Bài mẫu ở đầu trang | 2–3 bài bấm thử / một bài tĩnh / chỉ chữ và nút | 2–3 bài bấm thử | Chủ dự án: thay được ảnh màn hình khi chưa có app. Vòng sau trên Figma: dải card phóng to card giữa, thêm nút ‹ › |
| W4 | Cách đồng ý chính sách | A. dòng chữ dưới form / B. ô tick bắt buộc (dựng cả hai trên Figma để so) | B | Chủ dự án. Vòng 2: sau khi Codex sửa, Figma bỏ ô tick ở Hero; trợ lý hỏi lại; chủ dự án giữ ô tick ở **cả hai** form và bảo thiết kế thẳng trong code, không sửa Figma |
| W15 | Kích thước: px cố định hay co giãn | Chép px của Figma (ngầm định) / đơn vị `rem` (co theo cỡ chữ người dùng chọn), `clamp()` (co theo bề rộng màn hình), bề rộng tối đa | Co giãn | Chủ dự án hỏi "gán theo tỉ lệ hay fix cứng px", rồi "ok" |
| W16 | Dùng skill thiết kế nào | `ux-copy`, `design-system`, `accessibility-review`, `design-critique` / `design-handoff` / `user-research` | Bốn skill đầu | Chủ dự án "ok". `design-handoff` trùng design doc; `user-research` để dành cho pilot |

Ngoài ra, W13 (thêm 3 màu đậm hơn) là đề xuất duyệt cùng design, vì đo thấy chữ xanh 3,1–3,3:1, chữ đỏ 4,1–4,4:1 và viền ô
nhập 1,28:1, đều dưới chuẩn (decisions landing, bảng W10–W14). Plan còn yêu cầu dùng skill `frontend-design` cho mọi task giao
diện, và khi skill này mâu thuẫn với design hay Figma thì design thắng (plan landing, Global Constraints).

**Kiểm chứng**

- **Test tự động biến luật thiết kế thành lệnh kiểm:** LP12 đọc token màu và đòi độ tương phản (contrast, tỉ lệ sáng giữa chữ và
  nền) ≥ 4,5:1 cho chữ, ≥ 3:1 cho viền ô nhập; nhờ test này màu `success-strong` được chốt `#147A3A` (design landing §6.2). LP31
  kiểm token không dùng px; LP13 chặn giá trị màu/cỡ viết cứng; LP24 không cuộn ngang ở 390px; LP25 chạy **axe** (công cụ tự quét
  lỗi tiếp cận cho người khuyết tật); LP26 tắt chuyển động khi máy bật "giảm chuyển động"; LP27 tắt JavaScript vẫn đọc được
  (design landing §10).
- **Ảnh chụp so với Figma:** test `visual.spec.ts` chụp 4 ảnh (VI/EN × 1440/390) để so từng phần với Figma (plan landing Task 11).
  Nhờ ảnh mà phát hiện trang mobile rộng 467px và card bài mẫu chỉ rộng 64% (review landing, "Đã sửa trong lúc làm").
- **Skill review:** `ux-copy` đổi đáp án nhiễu `presume` → `assure` vì câu có hai đáp án đúng, và nêu 5 đề xuất C1–C5 (review
  ux-copy); `design-system` thấy 12/12 màu của Figma khớp code (review design-system); `accessibility-review` và `design-critique`
  nêu A1–A5, D1–D5, **"chưa áp dụng, chờ chủ dự án chọn"** (review landing).
- Bản chạy e2e trên Worker (**e2e** là test tự động mở trình duyệt thật bấm như người dùng): 91 đạt, 0 lỗi, 1 bỏ qua (deploy-done,
  báo cáo 09/10).

**Kết quả và điều chưa ổn**

- Landing build trong commit `deab488` (08/10), chuyển lên Cloudflare (`9f0cfa5`, `e0e1254`, 09/10). Ngày 09/10, phần domain và
  Cloudflare thật "chưa đủ bằng chứng hoàn thành" (deploy-done); ngày 15/10 trợ lý đã mở được `wordmet.com/vi` (motion §1). Ngày
  chính thức lên mạng: **không có ghi chép**.
- Về sau bị chê (motion §1): trang phẳng, thiếu "điểm nhấn" thương hiệu, widget bài điền từ nhỏ; **800ms là quá dài** cho thứ người
  dùng tự bấm. Audit landing nêu: header thiếu nút đăng ký, form trên mobile nằm sâu hơn 800px, hai thẻ Gói học không có nút
  (audit landing §2). Ý "form trên mobile nằm sâu" đã có trong review ngày 08/10 (D1) nhưng lúc đó chờ chủ dự án quyết.
- **Code lệch design mà không có ghi chép:** design ghi thời lượng hiện dần 400ms, lật thẻ 450ms (design landing §6.1); file
  `globals.css` hiện tại để 800ms cho carousel, hiện dần và lật thẻ. Bản audit token ở Task 3 còn ghi "theo prototype
  0,25–0,45 giây" (review design-system). Tương tự, design mô tả nút chính ở thanh trên desktop (design landing §5), nhưng
  `SiteHeader.tsx` không có nút đó; về sau UB17 ghi chuỗi `Nav.cta` "có sẵn nhưng chưa dùng" (decisions B).

### 3.2 Vòng 2 — Admin (Bước 2.5, 14–15/10/2026)

**Đầu vào nghiên cứu**

| Nghiên cứu gì | Nguồn và cách đọc | Giới hạn nguồn tự nêu |
|---|---|---|
| Admin của các hãng lớn trông thế nào | Chủ dự án yêu cầu tham khảo layout được đánh giá cao hoặc trang của doanh nghiệp lớn "qua DOM" (decisions admin, D15). Trợ lý đo **DOM** (cấu trúc trang mà trình duyệt dựng ra) bằng `getComputedStyle`/`getBoundingClientRect` trong trình duyệt tích hợp, ở 1440×900 và 390×844 (tham khảo admin) | Polaris (Shopify) bị trình duyệt từ chối; Tailwind Plus bắt đăng nhập |
| Site có UX/UI tốt theo chuyên gia và cộng đồng | Webby 2026, Awwwards 2025, Baymard, đọc trực tiếp trang giải ngày 14/10; thử mở cả 33 link (tham khảo giải thưởng) | Tự cảnh báo: giải "đẹp" thường thưởng site nặng 3D, là showcase **"không phải mẫu UX"** cho app học hằng ngày. Không tìm được thread Reddit; chưa đọc định nghĩa nhãn "Top 1%" của Baymard |
| Admin cần những mục nào | Kiểm kê quyết định của Bước 1–8 về admin, 16 mục quản trị, gợi ý menu 6 nhóm, trường dữ liệu cho mock (kiểm kê admin §1–4) | Tài liệu chuẩn bị, không phải quyết định |
| Template Sneat | Đo DOM ở 1440×900 rồi so từng thuộc tính với Figma đã duyệt (kiểm kê admin §5) | Chỉ "lấy ý tưởng, không chép code/asset" |
| Kỹ thuật | context7 cho `use-intl`, TanStack Query, Cloudflare Workers (decisions admin D1, D3, D6; design admin §6.3) | — |

Danh sách site đoạt giải không được design hay decision record của Bước 2.5 trích tới; dùng nó cho quyết định nào: **không có
ghi chép**. Nó được trích lại ở vòng 3 (motion, phần mở đầu).

**Tham khảo**

| Nguồn | Số đo (tham khảo admin; kiểm kê admin §5) | Lấy gì |
|---|---|---|
| shadcn/ui `dashboard-01` | Sidebar 288px, chữ 14px, nút cao 32px bo 8px; mobile: sidebar thành ngăn kéo | **Sidebar** (thanh menu dọc bên trái) 256–288px, chữ nền 14px, nút ~32px, bo 6–8px, ngăn kéo trên mobile |
| GitHub (Primer) | Sidebar 256px, chữ 14px, nút 32px bo 6px | Như trên |
| Atlassian | Thanh trên 56px; sidebar đo cả khung 350px | Thanh trên mỏng (~56px) |
| Stripe (trang đăng nhập) | Thẻ giữa trang rộng 412px, ô nhập cao 44px | Đăng nhập là thẻ giữa trang |
| Sneat (bản free) | Nền `#f5f5f9`; sidebar trắng 260px có bóng; tiêu đề nhóm menu IN HOA 13px; thanh trên là thẻ nổi cách mép 16px; thẻ không viền, bóng mềm; màu tím `#696cff`, font Public Sans | Bố cục và cách bày (F5); **không** lấy màu tím và font (F6) |

**Bản nháp hình ảnh: Figma (M0)**

- Chủ dự án chọn "Figma trước, rồi code" (D7) và trình tự "design doc → Claude dựng Figma → chủ dự án duyệt → code" (D8). Trợ lý
  kiểm trước: **MCP Figma** (kênh để trợ lý đọc và ghi vào Figma) ghi được vào tài khoản chủ dự án, font Be Vietnam Pro có sẵn
  (decisions admin D8). File: `coVHzJwTFgMbooUrty7sOq`.
- Cách vẽ: token khai báo bằng biến Figma; mọi khung dùng **auto layout** (khung tự co giãn); vẽ ở 1440 và 390, kéo thử 1024 và
  768; mỗi màn có trạng thái rỗng, đang tải, lỗi (design admin §9; plan admin M0).
- **Duyệt lần 1 (14/10) sau 5 vòng sửa:** màn chi tiết lô theo API, bỏ tiêu đề trang, icon Lucide, `ListState` (mẫu chung cho
  rỗng/đang tải/lỗi), bỏ đăng ký và OTP, padding hộp thông báo, dialog tạo tài khoản và trang đổi mật khẩu, tương phản chữ
  (design admin §9).
- Lúc duyệt Figma lộ ra một thay đổi về sản phẩm: chủ dự án thấy dòng "chưa có tài khoản? Đăng ký" là sai, vì admin nên **tạo**
  tài khoản cho editor. Từ đó có D18–D21 và D5 bị đảo (decisions admin, D18–D21).
- **Chưa ưng → làm lại theo Sneat:** chủ dự án gửi link Sneat; Figma làm lại đủ menu 6 nhóm / 16 mục và trang "Tính năng chưa có"
  (D23); **duyệt lần 2 cùng ngày 14/10** (design admin §9). Các task 10–12 đã code theo Figma đầu, nên thêm Task 12a để mặc lại theo
  bản mới, giữ nguyên logic (plan admin Task 12a; commit `6e9ba47`).

**Cách ra quyết định**

Nhãn trong decision record: "Chủ dự án" (chọn trực tiếp), "Chủ dự án (ok)" (trợ lý đề xuất, chủ dự án trả lời "ok"), "Chủ dự án
(yêu cầu)" (chủ dự án tự nêu), "khác đề xuất" (chủ dự án chọn phương án trợ lý không đề xuất). Có quyết định đi qua nhiều vòng
giải thích: D1 năm vòng, D3 bốn vòng (decisions admin, tóm tắt).

| # | Câu hỏi | Phương án đã đưa ra | Chọn | Ai chốt, vì sao |
|---|---|---|---|---|
| D7 | Cách thiết kế giao diện | Token landing + bộ component có sẵn, không Figma (đề xuất) / Figma trước rồi code / tự viết component | Figma trước | Chủ dự án, **khác đề xuất**: giống quy trình landing, duyệt từng màn trước khi code; đổi lại thêm một vòng thiết kế |
| D15 | Hướng giao diện | Một đề xuất rút từ số đo 4 sản phẩm | Sidebar trái + thanh trên mỏng; chữ và nút nhỏ hơn landing; ngăn kéo trên mobile; giữ màu và font landing | Chủ dự án "ok" |
| D16 | Đơn vị kích thước | (yêu cầu, không có phương án) | Chỉ đơn vị co giãn (`rem`, `clamp()`, `minmax()`, container query) | Chủ dự án yêu cầu; trợ lý đổi số px của D15 theo luật W15 của landing |
| F5 | Làm lại theo Sneat: tới đâu | Figma đủ menu + màn mẫu bằng dữ liệu giả, code chỉ màn của 2.5 (đề xuất) / cả Figma và code các màn giả / chỉ đổi phong cách màn 2.5 | Phương án đầu | Chủ dự án; bối cảnh: "chưa ưng Figma đã duyệt" |
| F6 | Màu và font khi theo Sneat | Bố cục Sneat, giữ xanh `#2f5bea` + Be Vietnam Pro (đề xuất) / theo hẳn Sneat / màu Sneat + font Wordmet | Phương án đầu | Chủ dự án; giữ nhận diện Wordmet (câu này đã nêu sẵn trong kiểm kê admin §5) |

Các quyết định nhỏ khi duyệt Figma: F1 (bảng đổi thành thẻ khi vùng nội dung hẹp hơn 40rem), F2 (icon `lucide-react`, khác
đề xuất), F3 (`ListState` dùng chung), F4 (bỏ tiêu đề trang trong vùng nội dung) (decisions admin, "Quyết định khi review Figma M0").

**Kiểm chứng**

- Luật tương phản ghi thẳng trong plan: màu xanh lá `#1f9d55` (3,49:1 trên nền trắng) và đỏ `#d64545` chỉ dùng cho icon và viền,
  không dùng cho chữ (plan admin, Global Constraints).
- Test tự động: axe ở 390 và 1440 cho mọi màn (B25#21); e2e với API giả 60/60 ở desktop 1440 và mobile 390; e2e với API thật 7/7
  (test-flow 2.5 §1). Sau bản sửa giao diện: 219 unit + 67 e2e API giả + 7 e2e API thật (delivery 2.5).
- **Chạy "Xong khi" (15/10):** một script Playwright đi đúng các bước, chụp ảnh từng bước; "không phải người bấm tay" (test-flow 2.5
  §2). 6 trang × 4 bề rộng = 24/24 tổ hợp không tràn ngang. Lộ ra D26 (xuất danh sách rỗng) và D27 (refresh bị 429 thì về trang
  đăng nhập không báo).
- **Rà theo Web Interface Guidelines (15/10):** hai lỗi hiển thị thật (danh sách ô chọn bị cắt ở 390×640; chữ bị bẻ giữa từ
  "Chi tiế/t" ở 1024) được sửa theo thứ tự test trước, sửa sau (commit `b5c380e`, `761ccd4`); một số điểm để dành tới lúc làm lại
  giao diện (delivery 2.5).
- Chưa kiểm: CI của hai job admin; trình duyệt ngoài Chromium (delivery 2.5).

**Kết quả và điều chưa ổn**

- M1 và M2 đã merge vào `dev` (PR #17, #18); delivery 2.5 ghi M3 xong trên máy local, chưa push, còn design B (viết sau, cùng ngày)
  nhắc PR #19 của M3 đang chờ CI (UB2). Giao diện hiện tại (code trên nhánh
  `feat/buoc-2-5-m3-csv-flow`): nền `#f5f6fa`, sidebar trắng có bóng, tiêu đề nhóm menu IN HOA, thanh trên là thẻ nổi có bóng,
  bo góc `0.375rem`, Be Vietnam Pro, xanh `#2f5bea` (admin `globals.css`, `Shell.tsx`).
- **Chủ dự án ghi ngày 15/10:** giao diện admin nhiều khả năng sẽ làm lại toàn bộ; coi phần nhìn kiểu Sneat là tạm; giữ luật phiên,
  cách gọi API, edge case B25E1–E29 và bộ test hành vi (delivery 2.5).
- Quan sát của vòng 3 (motion §1): admin gần như không có chuyển động; nhiều lớp bóng chồng nhau (sidebar, thanh trên, mỗi bảng một
  thẻ); link "Details" bị xuống dòng thành "Detail / s" ở 1280px.

### 3.3 Vòng 3 — Làm mới theo hướng B (15/10/2026, mới thiết kế)

**Đầu vào nghiên cứu**

| Nghiên cứu gì | Nguồn và cách đọc | Giới hạn nguồn tự nêu |
|---|---|---|
| Nguyên tắc **motion** (chuyển động: **duration** là thời lượng, **easing** là kiểu tăng/giảm tốc) | Đọc trực tiếp Material 3, IBM Carbon, NN/g, Apple HIG, W3C WCAG, MDN; React Aria qua context7 (motion, "Cách lấy dữ liệu") | Material 3 ghi bộ số này "không còn được duy trì" (đã chuyển sang lò xo), nhưng vẫn dùng được cho CSS |
| Site tham khảo chuyển động thế nào | Mở bằng Chrome, chụp màn hình, chạy một script đếm duration và easing của mọi `transition`/`animation` CSS lúc trang tải xong (motion §3) | Script **không thấy** animation chạy bằng JavaScript, video, canvas; số đếm là số phần tử, không phải số lần người dùng thấy; chỉ số "giảm chuyển động" bị bỏ vì công cụ đo sai (ra 0 ngay trên `wordmet.com`); chưa xem bản mobile (motion, "Giới hạn của phép đo"; §5) |
| Landing hiện tại dở ở đâu | Audit landing: bố cục, màu, tỉ lệ chuyển đổi (audit landing §2) | File không ghi ngày, người viết hay nguồn. Con số "15%–25% bỏ dở" vì ô tick không có nguồn (decisions B, UB4) |
| Kiểm kỹ thuật trong lúc brainstorm | `pnpm-workspace.yaml` có `packages/*`; tài liệu Tailwind v4 qua context7 (UB3); Lexend có trong dữ liệu font của Next 16.3.8 (design B §4.3); đọc mã nguồn `react-aria` 3.53.1 để biết dialog đóng thế nào (design B UBE20–UBE22) | Còn `ASSUMPTION`: `@import` CSS từ package chạy được với Turbopack và Vite; giấy phép Lexend (design B §12) |

Số liệu chính: NN/g nói từ 500ms trở lên "bắt đầu thấy lê thê"; Material 3 chỉ dùng 700–1000ms cho chuyển động nền không do người
dùng bấm; landing Wordmet có 4 phần tử chạy 800ms (motion §1–3).

**Tham khảo** (motion §3)

| Site | Thấy gì | Rút ra |
|---|---|---|
| Linear | Hero là chính giao diện app đang "tự chạy"; hover 100ms | Landing tốt thắng nhờ **cho xem sản phẩm đang làm việc** |
| Brilliant | Mỗi tính năng là một thẻ demo bấm được trên nền màu riêng | Như trên |
| Speak, Duolingo | Một màu thương hiệu mạnh, minh họa hoặc linh vật, chữ đậm | Motion chỉ là lớp phụ |
| shadcn/ui dashboard, Catalyst | Hover 150ms; Catalyst: sidebar phẳng, nội dung trên **một** mặt trắng, bảng không bọc thẻ | Admin tốt gần như không có motion |

Audit landing góp các mục: nút đăng ký ở header, form lên trước trên mobile, đổi thứ tự trong thẻ "Cách hoạt động", nút ở thẻ
Gói học, nhịp màu nền (audit landing §4). Vài đề xuất của audit trái luật dự án và không được lấy: bỏ ô tick (UB4 giữ), màu viết
cứng `bg-[#f5f7fc]` (luật W7 cấm giá trị viết cứng), "Hơn 300+ người học đã đăng ký" (context landing §2 cấm số liệu chưa có;
design B §11 để ngoài).

**Bản nháp hình ảnh: 4 mockup HTML bấm được** (`docs/mockups/2026-10-15/`)

| Mockup | Ý chính (index.html; comment đầu file) | Token gốc (`:root`) |
|---|---|---|
| Landing A "Bút dạ quang" | Câu tiếng Anh to là trung tâm, font đọc sách Literata; vàng dạ quang chỉ ở chỗ một từ được học; motion yên | Xanh `#2f5bea`, vàng `#ffd84a`, Be Vietnam Pro + Literata |
| Landing B "Năng lượng" | Nền xanh thương hiệu, chữ Lexend, đáp án như miếng dán vàng bay vào chỗ trống; "gần cảm giác app học như Duolingo, Speak" | `--field` `#2445d6`, `--sun` `#ffd84a`, Lexend, thêm đường cong "nảy" `--ease-spring` |
| Admin A "Bàn biên tập" | Sidebar nằm trên nền, nội dung trên một tờ giấy trắng, bảng chỉ có đường kẻ mảnh; bấm thử panel, dialog, menu | Nền `#eef1f6`, bo `0.5rem` |
| Admin B | "Áo" B (Lexend, nút dày có gờ, nhãn dán, ô số liệu màu) + sidebar của A; đầu trang trắng; xanh chỉ ở nút chính và thanh trên bản điện thoại | Nền `#f1f3fd`, bo `0.75rem` |

Bốn mockup dùng lại bộ token motion đề xuất ở motion §4: hai landing 100 / 150 / 250 / 400ms, hai admin 100 / 150 / 250ms; easing
lấy từ Material 3, hai bản B thêm một đường "nảy" `--ease-spring` (`:root` của từng file). Tất cả tôn trọng cài đặt "giảm chuyển
động" của hệ điều hành (index.html).

Trong brainstorm, phần 1 (token chung) ban đầu chỉ trình bày bằng chữ. Chủ dự án trả lời: *"mình không phải dân designer, nên bạn
có thể mô phỏng hay giải thích cho mình hiểu được không"*. Trợ lý trình bày lại bằng khung bấm được (đổi một màu thì cả hai app đổi,
bảng màu, ô tìm kiếm trước/sau, bốn tốc độ chuyển động); phần 2–5 sau đó đều có mô phỏng (decisions B, "Phần 1"). Các mô phỏng này
được lưu ở đâu trong repo: **không có ghi chép**; thư mục mockup chỉ có 5 file trên.

**Cách ra quyết định**

12 câu hỏi Q1–Q12, rồi 5 phần design, chủ dự án duyệt từng phần. Nhãn: "Chủ dự án" = chọn trong chat; "Duyệt cùng
design" = trợ lý đề xuất trong lúc trình bày một phần, chủ dự án duyệt cả phần đó (decisions B). Khung chung là **UB1: chỉ đổi phần
nhìn** (token, font, bố cục, motion), giữ stack, route và code hành vi; mọi ngoại lệ phải chốt riêng (UB8, UB9, UB10, UB12).

| # | Câu hỏi | Phương án đã đưa ra | Chọn | Ai chốt, vì sao |
|---|---|---|---|---|
| — | Hướng hình ảnh | Landing A / landing B; admin A / admin B | Landing B; admin mặc áo B nhưng giữ sidebar A, đầu trang trắng, motion nhanh, chỉ nút và **toast** (thông báo nhỏ tự tắt) có độ nảy | Chủ dự án (decisions B, bối cảnh chung). Lý do chọn: **không có ghi chép** |
| UB4 | Ô tick đồng ý của waitlist | Giữ ô tick, vẽ lại theo B / bỏ, dùng dòng chữ / tạm giữ chờ kiểm luật | Giữ ô tick | Chủ dự án. Bối cảnh: W4 đã chốt hai lần; luật đòi đồng ý rõ ràng (bản tóm tắt, chưa đối chiếu văn bản gốc); con số của audit không có nguồn; bỏ ô tick là đổi hành vi server, ngoài UB1 |
| UB8 | Chi tiết lô nhập hiện ở đâu | Giữ trang riêng (**trợ lý đề xuất**) / **panel** (khung bên cạnh bảng), giữ URL | Panel | Chủ dự án, **khác đề xuất**; ngoại lệ đầu tiên của UB1 |
| UB11 | Duyệt hình bằng gì | Mockup HTML + duyệt ảnh chụp / mở rộng mockup trước / vẽ lại Figma | Mockup HTML + ảnh chụp | Chủ dự án. Nhanh nhất; đổi lại màn chưa có trong mockup chỉ thấy khi đã có code. Hai file Figma cũ ghi là lỗi thời |
| UB14 | Miếng dán đang bay mà tab chạy nền | Vòng 1: chỉ dùng hẹn giờ (mô phỏng để miếng dán treo 2,2 giây) / vòng 2: dọn ở mốc sớm nhất, kể cả ngay khi tab hiện lại | Vòng 2 | Chủ dự án **sửa sau khi xem mô phỏng**: *"đừng hold 1-2s"* |

Các đề xuất duyệt cùng design đáng chú ý: UB15 đổi hai màu của mockup để đạt luật tương phản (viền ô nhập `#7d84a8` 3,66:1; chữ gợi ý
`#5f6688` 5,07:1); UB18 mọi chuyển động landing ≤ 400ms (mockup để 600ms, hiện tại 800ms); UB16 header dính khi cuộn; UB17 dùng lại
chuỗi `Nav.cta` có sẵn (decisions B, bảng cuối).

**Kiểm chứng**

- Đã làm trong lúc thiết kế: đo tương phản mọi cặp màu của hai mockup; hai chỗ trượt luật được sửa (UB15); chữ đỏ trên nền vàng chỉ
  đạt 4,24:1 nên lỗi ở form cuối trang dùng ô trắng (design B §4.2, §5.3); đọc mã React Aria và phát hiện lớp phủ có thể kẹt nếu
  animation đóng bị hủy (UBE22).
- Sẽ làm khi build: tiêu chí UBC1–UBC18, trong đó UBC8 đo **mọi** thời lượng CSS **và** Web Animations trên landing ≤ 400ms; chủ dự án
  duyệt ảnh chụp hai lần (landing VI/EN × 1440/390, admin 1440/390) trước khi làm phần còn lại (UB11, UBC18); chạy tay landing và chạy
  lại "Xong khi" của Bước 2.5 (design B §1, §10).

**Kết quả**

Chưa có code. Design doc ở trạng thái "chờ chủ dự án duyệt bản viết"; chủ dự án dặn "khoan hả build" (design B phần đầu; decisions B).
Thứ tự sau khi duyệt: landing trước, admin sau khi PR #19 merge, rồi Deploy API + admin, rồi Bước 3 (UB2).

---

## 4. Quy trình chung rút ra

### 4.1 Đường đi của một vòng

```
[1] Gom context và research ──► [2] Tham khảo có số đo ──► [3] Bản nháp hình
         │                              │                         │ Figma (vòng 1–2)
         │                              │                         │ HTML bấm được (vòng 3)
         ▼                              ▼                         ▼
[4] Chủ dự án chọn / sửa ──► [5] Brainstorm từng câu một ──► [6] Design doc + decision record
                                 (nhãn Chốt/Đề xuất/ASSUMPTION;      (When → Then, edge case)
                                  mô phỏng bấm được ở vòng 3)
                                                                      │
         ┌────────────────────────────────────────────────────────────┘
         ▼
[7] Plan + plan tóm tắt ──► [8] Build theo TDD, so với bản nháp ──► [9] Kiểm chứng ──► [10] Ghi as-built
                                                                                          │
                                                                  chưa ưng → vòng mới ◄───┘
```

| Bước | Dùng gì | Đầu ra | Ví dụ |
|---|---|---|---|
| 1. Context, research | Đọc nguồn chính thức; context7 cho thư viện; trình duyệt cho trang dựng bằng JavaScript | `docs/preparation/*.md` | context landing; motion |
| 2. Tham khảo có số đo | Script đo DOM (`getComputedStyle`), script đếm motion, danh sách giải, audit | Bảng số đo kèm "giới hạn của phép đo" | tham khảo admin; motion §3 |
| 3. Bản nháp hình | Figma qua MCP (`use_figma`, skill `figma-use`, `figma-generate-design`); hoặc file HTML tĩnh | File Figma; `docs/mockups/<ngày>/` | `NVyO0…`, `coVHz…`; 4 mockup HTML |
| 4. Chủ dự án chọn, sửa | Chủ dự án sửa thẳng trên Figma, nhờ Codex sửa, hoặc chọn giữa các mockup | Ghi vào decision record | W4 vòng 2; F5; chọn hướng B |
| 5. Brainstorm | Skill `superpowers:brainstorming`; hỏi một câu một lần, mỗi câu có phương án và nhãn | Câu trả lời trong chat | Q1–Q12 của vòng 3 |
| 6. Design doc + decision record | `docs/superpowers/specs/*-design.md`, `docs/superpowers/decisions/*-decisions.md` | Quyết định có số hiệu; tiêu chí When → Then; edge case | LP1–32/LPE1–12; B25#/B25E#; UBC#/UBE# |
| 7. Plan | Skill `superpowers:writing-plans`; bản tóm tắt ở `docs/deliveries/` | Danh sách task, lệnh kiểm | plan landing 11 task; plan admin 18 task |
| 8. Build | TDD (viết test trước, code sau); skill `frontend-design`; đọc lại Figma lúc code (`get_design_context`, `get_variable_defs`) | Commit theo task | `deab488`; `6e9ba47` |
| 9. Kiểm chứng | Test tương phản, axe, đo không cuộn ngang, ảnh chụp so với bản nháp, skill review (`ux-copy`, `design-system`, `accessibility-review`, `design-critique`), chạy "Xong khi" | `docs/superpowers/reviews/*.md`; test-flow | review landing; test-flow 2.5 |
| 10. As-built | Ghi cái đã làm, cái lệch, cái chưa kiểm | `docs/deliveries/*.md`, `docs/guides/*.md` | delivery 2.5; deploy-done |

### 4.2 Luật của dự án định hình quy trình

- Chưa có design doc và plan được duyệt thì không code, không scaffold; dùng chuỗi skill superpowers (`brainstorming` →
  `writing-plans` → `test-driven-development`); design doc là tài liệu chính thức để build (CLAUDE.md, "Working Rules").
- Sau brainstorm phải viết decision record; hỏi từng câu một, mỗi câu có đề xuất cụ thể và nhãn chốt / đề xuất / `ASSUMPTION`
  (CLAUDE.md).
- Muốn nói gì về một thư viện hay phiên bản thì phải tra tài liệu hiện hành (context7) hoặc chạy thử trong phiên (CLAUDE.md).
- Design doc nào trích luật cấp trên thì phải tự viết edge case dạng When → Then cho cách nó làm (SPEC_WRITING_CONVENTIONS). Vì vậy
  vòng 3 có cả một mục edge case cho chuyển động (UBE1–UBE23), ví dụ "tab chạy nền khi miếng dán đang bay".

### 4.3 Ba vòng khác nhau ở đâu

| | Vòng 1 — Landing | Vòng 2 — Admin | Vòng 3 — Hướng B |
|---|---|---|---|
| Research | Nguyên tắc landing (NN/g, bài phân tích) + đọc trang đối thủ | Đo DOM 4 sản phẩm + danh sách giải + kiểm kê mục + đo Sneat | Nguồn motion chính thức + script đếm motion + audit |
| Bản nháp | Figma, 4 trang + prototype | Figma M0, trợ lý dựng qua MCP | 4 mockup HTML bấm được |
| Cách duyệt | Chủ dự án sửa thẳng trên Figma, nhờ Codex | Duyệt trên Figma: 5 vòng sửa, rồi làm lại theo Sneat | Chọn mockup; mô phỏng bấm được trong brainstorm; sẽ duyệt ảnh chụp app thật |
| Quyết định | L1–L8, W1–W16 | D1–D28, F1–F6 | UB1–UB19 |
| Kiểm chứng | LP1–LP32, 3 bản review, ảnh chụp | B25#, axe, "Xong khi" bằng script, Web Interface Guidelines | UBC1–UBC18 (chưa chạy) |

---

## 5. Điều làm tốt và điều nên đổi lần sau

### Làm tốt (có nguồn)

- **Nói rõ giới hạn của từng nguồn.** Tách đánh giá của chuyên gia với bình chọn của cộng đồng, cảnh báo giải "đẹp" không phải mẫu UX
  (tham khảo giải thưởng); bỏ một chỉ số khi phát hiện chính công cụ đo sai (motion, "Giới hạn của phép đo").
- **Đo thay vì đoán.** Hướng admin (D15) rút từ số đo DOM thật; vấn đề mobile của landing rút từ số đo Figma (context landing §11.1).
- **Biến luật thiết kế thành test.** LP12 bắt được ba cặp màu dưới chuẩn và chọn mã màu thay cho mắt (design landing §6.2); ảnh chụp
  bắt được lỗi tràn ngang 467px (review landing).
- **Giữ lại phương án đã bỏ.** Nhờ decision record ghi W4 qua hai vòng, vòng 3 cân lại ô tick với đủ bối cảnh thay vì làm theo audit
  (decisions B, UB4).
- **Mô phỏng bấm được cho người không làm design.** Sau khi chủ dự án đề nghị, các phần 2–5 đều có mô phỏng, và nhờ xem mô phỏng mà chủ
  dự án sửa được một chi tiết hành vi (UB14) (decisions B).

### Nên đổi lần sau

- **Duyệt trên Figma rồi vẫn không ưng.** Figma admin được duyệt hai lần ngày 14/10, rồi ngày 15/10 bị coi là tạm (design admin §9;
  delivery 2.5). Landing cũng đi qua Figma rồi bị đánh giá lại (motion, phần mở đầu). *Nhận xét của người tổng hợp:* khung tĩnh không
  cho cảm nhận chuyển động và độ "sống" của trang; vòng 3 đã đổi sang mockup HTML bấm được (UB11), nên giữ cách này.
- **Ghi lý do không hài lòng.** Không file nào ghi chủ dự án chưa ưng điều gì ở Figma admin đầu, hay ở cả hai giao diện trước vòng 3.
  *Nhận xét của người tổng hợp:* ghi 2–3 câu lý do giúp vòng sau nhắm đúng chỗ.
- **Code lệch design mà không ai ghi lại.** Motion 400/450ms trong design thành 800ms trong code; nút ở header có trong design mà không
  có trong code (mục 3.1). *Nhận xét của người tổng hợp:* ở bước review nên so token và các phần tử với **design doc**, không chỉ với
  Figma.
- **Phát hiện của review bị treo.** A1–A5, D1–D5 (review landing) và C1–C5 (review ux-copy) đều "chờ chủ dự án chọn", nhưng không có ghi
  chép câu trả lời. D1 (form mobile nằm sâu) xuất hiện lại trong audit và chỉ được xử lý ở vòng 3 (design B §5.1).
- **Audit không ghi nguồn.** Audit landing không có ngày, người viết hay nguồn số liệu, và có đề xuất trái luật dự án (mục 3.3). Vòng 3 đã
  lọc lại (UB4; design B §11). *Nhận xét của người tổng hợp:* audit nhận từ ngoài nên được đối chiếu với decision record trước khi dùng.
- **Công cụ đo mù một phần.** Script đếm motion không thấy animation chạy bằng JavaScript (motion). UBC8 đã thêm Web Animations vào phép
  đo. *Nhận xét của người tổng hợp:* khi đo site tham khảo, nên bổ sung một cách nhìn khác (quay màn hình chẳng hạn).
- **Chưa thử với người dùng thật.** Phần "Vấn đề" của landing là giả thuyết chưa phỏng vấn (context landing §5); skill `user-research` để
  dành cho pilot (W16); chưa thử với trình đọc màn hình thật (review landing A5). Vòng 2 và 3: không có ghi chép về thử với người dùng.
- **"Xong khi" của admin chạy bằng script**, không phải người bấm (test-flow 2.5 §2). *Nhận xét của người tổng hợp:* việc chủ dự án tự nhìn
  app thật mới được đưa vào ở vòng 3 (duyệt ảnh chụp, UB11).
- **Mô phỏng của brainstorm vòng 3 không nằm trong repo.** *Nhận xét của người tổng hợp:* lưu chúng cạnh mockup để lần sau xem lại được.

---

## 6. Bản đồ tài liệu

| Tên tắt | File | Dùng để làm gì |
|---|---|---|
| context landing | [LANDING_PAGE_CONTEXT_2026-10-07.md](../preparation/LANDING_PAGE_CONTEXT_2026-10-07.md) | Research landing, đối thủ, quyết định L1–L6, số đo Figma mobile |
| design landing | [2026-10-08-landing-page-design.md](../superpowers/specs/2026-10-08-landing-page-design.md) | Design doc landing: W1–W16, token, LP1–LP32, LPE1–LPE12 |
| decisions landing | [2026-10-08-landing-page-decisions.md](../superpowers/decisions/2026-10-08-landing-page-decisions.md) | Phương án và ai chốt cho L1–L8, W1–W16, quyết định trên Figma |
| plan landing | [2026-10-08-landing-page.md](../superpowers/plans/2026-10-08-landing-page.md) | 11 task; chỗ gọi skill thiết kế; so ảnh chụp với Figma |
| plan deploy | [2026-10-08-landing-deploy.md](../superpowers/plans/2026-10-08-landing-deploy.md) | Plan đưa landing lên Cloudflare (chỉ lướt) |
| review ux-copy | [2026-10-08-landing-page-ux-copy.md](../superpowers/reviews/2026-10-08-landing-page-ux-copy.md) | Soát chữ, đề xuất C1–C5 |
| review design-system | [2026-10-08-landing-page-design-system.md](../superpowers/reviews/2026-10-08-landing-page-design-system.md) | So token code với biến Figma |
| review landing | [2026-10-08-landing-page-design-review.md](../superpowers/reviews/2026-10-08-landing-page-design-review.md) | Accessibility và design critique, A1–A5, D1–D5 |
| deploy explained | [2026-10-08-landing-deploy-explained.md](2026-10-08-landing-deploy-explained.md) | Giải thích hệ thống landing trên Cloudflare (chỉ lướt) |
| deploy-done | `docs/guides/2026-10-09-landing-deploy-done.md` (chưa commit vào repo lúc viết) | Đã deploy gì, kết quả test 09/10 |
| tham khảo giải thưởng | [UX_UI_REFERENCE_WEBSITES_2026-10-14.md](../preparation/UX_UI_REFERENCE_WEBSITES_2026-10-14.md) | Site đoạt giải Webby, Awwwards, Baymard và cách lấy dữ liệu |
| tham khảo admin | [ADMIN_UI_REFERENCES_2026-10-14.md](../preparation/ADMIN_UI_REFERENCES_2026-10-14.md) | Số đo DOM của shadcn/ui, GitHub, Atlassian, Stripe |
| kiểm kê admin | [ADMIN_SECTIONS_INVENTORY_2026-10-14.md](../preparation/ADMIN_SECTIONS_INVENTORY_2026-10-14.md) | 16 mục quản trị, gợi ý menu, số đo Sneat |
| design admin | [2026-10-14-buoc-2-5-admin-web-design.md](../superpowers/specs/2026-10-14-buoc-2-5-admin-web-design.md) | Design doc Bước 2.5: D1–D23, §9 giao diện và Figma, §12 edge case |
| decisions admin | [2026-10-14-buoc-2-5-admin-web-decisions.md](../superpowers/decisions/2026-10-14-buoc-2-5-admin-web-decisions.md) | Phương án D1–D28, F1–F6 |
| plan admin | [2026-10-14-buoc-2-5-admin-web.md](../superpowers/plans/2026-10-14-buoc-2-5-admin-web.md) | 18 task; M0 Figma; Task 12a mặc lại theo Sneat |
| delivery 2.5 | [buoc-2-5.md](../deliveries/buoc-2-5.md) | Plan tóm tắt, tiến độ, as-built, ghi chú "phần nhìn là tạm" |
| test-flow 2.5 | [buoc-2-5-test-flow.md](../deliveries/buoc-2-5-test-flow.md) | Gate tự động, chạy "Xong khi", hai phát hiện |
| audit landing | [LANDING_PAGE_UI_UX_OPTIMIZATION_CONTEXT.md](../LANDING_PAGE_UI_UX_OPTIMIZATION_CONTEXT.md) | Audit bố cục, màu, chuyển đổi của landing |
| motion | [MOTION_AND_DESIGN_BEST_PRACTICES_2026-10-15.md](../preparation/MOTION_AND_DESIGN_BEST_PRACTICES_2026-10-15.md) | Nguyên tắc motion có nguồn, đo site tham khảo, giới hạn phép đo |
| mockup index | [index.html](../mockups/2026-10-15/index.html) | Mục lục bốn mockup, ghi hướng được chọn |
| mockup landing A | [landing-a.html](../mockups/2026-10-15/landing-a.html) | "Bút dạ quang" (bị loại) |
| mockup landing B | [landing-b.html](../mockups/2026-10-15/landing-b.html) | "Năng lượng" (được chọn) |
| mockup admin A | [admin.html](../mockups/2026-10-15/admin.html) | "Bàn biên tập" (bị loại; sidebar được giữ) |
| mockup admin B | [admin-b.html](../mockups/2026-10-15/admin-b.html) | Áo B + sidebar A (được chọn) |
| design B | [2026-10-15-ui-refresh-b-design.md](../superpowers/specs/2026-10-15-ui-refresh-b-design.md) | Design doc làm mới: token chung, landing, admin, UBE1–35, UBC1–18 |
| decisions B | [2026-10-15-ui-refresh-b-decisions.md](../superpowers/decisions/2026-10-15-ui-refresh-b-decisions.md) | Q1–Q12, UB1–UB19, ghi chú "trình bày lại bằng mô phỏng" |
| CLAUDE.md | [CLAUDE.md](../../CLAUDE.md) | Luật làm việc của repo |
| SPEC_WRITING_CONVENTIONS | [SPEC_WRITING_CONVENTIONS.md](../specs/SPEC_WRITING_CONVENTIONS.md) | Luật viết edge case When → Then |
| landing `globals.css` | [globals.css](../../apps/web/src/app/globals.css) | Token hiện tại của landing (motion 800ms) |
| landing `SiteHeader.tsx` | [SiteHeader.tsx](../../apps/web/src/components/layout/SiteHeader.tsx) | Header hiện tại (không có nút đăng ký) |
| admin `globals.css`, `Shell.tsx` | Nằm ở worktree khác, mở bằng Ctrl+O: `E:\Working\Working project\english-learning-wt-m3\apps\admin\src\styles\globals.css` và `…\src\app\Shell.tsx` (nhánh `feat/buoc-2-5-m3-csv-flow`) | Token và khung admin kiểu Sneat hiện tại |

Figma (`NVyO0njIAcOUTAl85a1Xdx`, `coVHzJwTFgMbooUrty7sOq`) không được mở khi viết tài liệu này; mọi điều về Figma ở trên lấy từ các file
trong repo. Vòng 3 đã ghi hai file Figma này là lỗi thời (UB11).
