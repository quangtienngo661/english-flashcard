# Đợt giao diện admin: bộ câu hỏi cho chủ dự án (27/10/2026)

Mục tiêu đợt: thay các mục "Sắp có" của `apps/admin` bằng màn thật. Chủ dự án muốn trả lời **một lượt** trong file này (chat 27/10/2026).

**Cách trả lời**
- Ghi câu trả lời dưới dòng **Trả lời:** của mỗi câu. Có thể chọn chữ cái ("b"), ghi "b, nhưng…", hoặc viết ý của bạn.
- Không biết hoặc muốn Claude đề xuất trước cho một câu nào: ghi "bỏ qua" hoặc "đề xuất trước".
- Câu 1: bạn chọn (b) (27/10/2026). Vì vậy từ câu 2 trở đi, mỗi câu có **Đề xuất của Claude** (chọn gì, vì sao, đánh đổi gì). Đồng ý thì ghi **ok**; khác thì
  ghi hướng của bạn. Các hướng khác vẫn liệt kê trong câu để bạn chọn lại nếu muốn.
- Các đề xuất phụ thuộc nhau theo chuỗi 2 → 3 → 9: đổi câu 2 hoặc câu 3 thì Claude sửa lại đề xuất của câu 9.
- 27/10/2026: câu 3–5 viết lại sau khi Claude mở Figma page 04 (bản trước dựa trên tài liệu, chưa xem khung).
- 27/10/2026, vòng kiểm context: Claude đối chiếu từng khung với API trên `origin/dev` (`6e72bb3`) và đọc lại câu trả lời nhóm B của bạn (26/10). Đã sửa câu
  6, 8, 9, 10, 11, 13; thêm câu 14. Bằng chứng từng khung (`path:line`): [`giao-dien-admin-facts/`](../../preparation/giao-dien-admin-facts/) gồm
  [`content.md`](../../preparation/giao-dien-admin-facts/content.md), [`users-reports-grants-settings.md`](../../preparation/giao-dien-admin-facts/users-reports-grants-settings.md),
  [`ai.md`](../../preparation/giao-dien-admin-facts/ai.md). Chỉ đọc code, chưa gọi API.
- Trả lời xong: Claude ghi decision record, rồi trình bày design từng phần.

Ví dụ xuyên suốt: **Minh** là `editor`, **bạn** là `admin`. Người học **Lan** gói Pro, báo lỗi một câu AI sai.

---

## 0. Đã có, không hỏi lại

| Điều | Nguồn |
|---|---|
| Admin đã có 6 màn chạy được: Lô nhập, Publish, Xuất, Nguồn, Giao dịch, Nhân sự | `apps/admin/src/app/nav.ts` |
| Menu còn 11 mục "Sắp có": Dashboard, Từ, Nghĩa, Chủ đề, Báo lỗi, Dạng chia, Người dùng, Cấp gói, Cài đặt AI, Chi phí AI, Bộ ví dụ AI. Màn "Cài đặt hệ thống" chưa có mục trên menu | `nav.ts` |
| API cho gần hết các màn đó đã có (Bước 3–7, đợt sửa Bước 0–3): `admin/settings`, `admin/users` (danh sách, chi tiết, khóa, mở khóa), báo lỗi, lý do báo lỗi, danh sách trả lượt, dạng chia chưa biết, cấp gói, model / thao tác / prompt / bộ ví dụ AI, tình trạng, chi phí, các lần gọi AI. Riêng Dashboard thì **chưa có API** | `apps/api/src/**/admin-*.controller.ts` |
| Khung Figma đã có trên page `04 Admin · Web` (file `7HcPAKLrWu32C27qYMJUOA`), section E1–E4, khung A/70–A/89. Tài liệu gọi là "mức khung", nhưng khi mở ra (Claude xem 27/10/2026 các khung A/84, A/10, A/90) thì các khung đã vẽ **đầy đủ theo hướng B**: menu trái có mục chọn tô vàng, thẻ trắng bo góc trên nền xanh nhạt, badge màu, font Lexend. Các màn cũ (A/10 Lô nhập) và màn đã code (A/90 Giao dịch) cũng cùng kiểu đó | `docs/deliveries/dot-giao-dien.md`, Figma |
| Luật từng màn (ai thấy, lọc gì, xử lý thế nào) đã ghi | design đợt giao diện §6.4 |
| Chữ trên từng màn đã viết | `docs/mockups/2026-10-21/ban-chu-giao-dien.md` |
| Email người thao tác (design đợt giao diện §10). **Đã có email:** nghĩa (`reviewed_by`, `published_by`, `state_changed_by`), lịch sử cài đặt (`changed_by`), khóa tài khoản (`locked_by`). **Chỉ có uuid:** báo lỗi (`resolved_by`), trả lượt (`resolved_by` và cả người học), cấp gói (`granted_by`, `revoked_by`, `changes[].changed_by` và cả người học), lý do báo lỗi (`updated_by`), prompt (`saved_by`), bộ ví dụ (`created_by`, `started_by`). Prompt seed do `AI_SYSTEM_ACTOR_ID` lưu, không phải người thật | `giao-dien-admin-facts/*.md` |
| Lần gọi AI thật đầu tiên: bạn trả lời 26/10 "implement UI cho admin rồi mình sẽ test trực tiếp trên đó luôn"; muốn test prompt, eval và judge trong admin (câu 16); tỉ lệ held-out chỉnh trên giao diện (câu 21); dashboard AI là trang mới trong admin, xem thư viện vẽ biểu đồ (câu 24); màn eval và prompt làm theo admin hiện tại (câu 25). Design nhóm B **chưa có**, Postman collection cũng chưa có | `2026-10-26-dot-cai-thien-questions.md` câu 4, 15, 16, 21, 24, 25 |
| Ngày 15/10/2026 bạn ghi phần nhìn admin lúc đó (kiểu Sneat, Figma duyệt 14/10) là **tạm**, sẽ làm lại cả khối. **Cùng ngày** bạn chọn hướng B, và đợt UI refresh B đã làm lại admin theo hướng B (PR #23–#24, 15–16/10). Câu 3 hỏi ghi chú 15/10 còn hiệu lực hay không | ghi chú 15/10/2026, `docs/deliveries/ui-refresh-b.md` |
| B25E30 (refresh trả 429 thì về `/login` không báo gì) **đã sửa** trong UI refresh B (`4e2c230`, `e7e6e8d`; `session-store.ts:232`), dù `CLAUDE.md` vẫn ghi "để khi refactor". Trong các điểm guideline còn nợ (`buoc-2-5.md:80`): nút điều hướng đã thành link (`NavLink`); còn chưa làm là bộ lọc chưa vào URL, chưa focus ô lỗi đầu tiên, chưa cảnh báo khi rời form đang nhập | `ui-refresh-b.md:123`, `apps/admin/src` |
| Không cần dừng để duyệt ảnh hay Figma giữa chừng ("cứ triển khai mà làm") | chủ dự án 23/10/2026 |
| Admin có hai ngôn ngữ vi / en; stack React 19, React Router, TanStack Query, react-aria-components, Tailwind 4 | `apps/admin/src/i18n/locale.ts`, `package.json` |

---

## Phần 1 — Cách làm

### Câu 1. Luật hỏi ở đợt này

Bước 3–7 dùng luật "bạn trả lời trước, Claude đề xuất sau". Đợt cải thiện A thì bạn chọn "Claude đề xuất trước mọi câu, bạn confirm".

Các hướng: (a) bạn trả lời trước, Claude đề xuất sau · (b) Claude đề xuất trước mọi câu · (c) bạn trả lời trước với câu sản phẩm, Claude đề xuất trước với câu kỹ thuật · (d) khác.

**Trả lời:** b

### Câu 2. Làm đợt này để phục vụ việc gì trước nhất

Ví dụ: (a) cấu hình AI (chọn model cho từng thao tác, sửa prompt), để chuẩn bị lần gọi AI thật đầu tiên · (b) xử lý báo lỗi và trả lượt, khi đã có người học
(Lan báo lỗi thì có người xem) · (c) quản lý người dùng và cấp gói · (d) sửa từ, nghĩa, chủ đề ngay trên admin · (e) cài đặt hệ thống (nhắc học, hạn mức…) ·
(f) làm đủ hết, thứ tự nào cũng được · (g) khác.

Có thể xếp nhiều mục theo thứ tự, ví dụ "a, e, b".

**Đề xuất của Claude:** thứ tự **a → e → b → c → d**.
- *Vì sao a đầu tiên:* AI hiện chưa chạy được cho ai. Sáu thao tác AI đều được seed với **không có model** (`model_ref NULL`), nên admin phải chọn model cho từng
  thao tác thì người học mới có câu AI và tra AI (Bước 7). "Gọi AI thật lần đầu" là việc `CLAUDE.md` ghi nên làm sớm, và nhóm B của đợt cải thiện (eval,
  judge) cũng đang chờ việc đó. Không có màn thì phải tự gọi API bằng tay. Ngày 26/10 bạn cũng đã trả lời rằng sẽ làm UI admin rồi test AI thật trên đó
  (câu 4 của đợt cải thiện).
- *Vì sao e kế tiếp:* Cài đặt hệ thống là một trang, API đã đủ, và bật/tắt AI, trần lượt AI mỗi ngày, hạn mức nằm ở đó. Đi cùng lần gọi AI thật thì có chỗ chỉnh.
- *b rồi c:* báo lỗi, trả lượt và cấp gói chỉ cần khi đã có người học thật. Hiện chưa có (tới trước khi launch).
- *d cuối cùng:* nội dung hiện soạn bằng CSV ngoài app rồi nhập (D5 Bước 3), luồng đó đã chạy được. Sửa từng nghĩa trên admin là tiện thêm, không chặn việc gì.
- *Trade-off:* editor (Minh) phải đợi tới cuối đợt mới có màn của mình (báo lỗi, dạng chia, nội dung). Màn AI lại là phần khó nhất (prompt, chạy thử, chi phí),
  nên milestone đầu sẽ dài nhất.

**Trả lời:** ok

### Câu 3. Ghi chú "sẽ làm lại phần nhìn admin" (15/10) còn hiệu lực không

*Sửa 27/10/2026, sau khi Claude mở Figma xem lại.* Bản trước của câu này dựa trên hai điều sai: (1) "Figma chỉ có khung, chưa có hướng nhìn nào được duyệt".
Thật ra page 04 đã vẽ đủ theo hướng B. (2) "Phần nhìn hiện tại là tạm". Ghi chú đó viết về kiểu Sneat, và chính ngày đó bạn chọn hướng B, rồi UI refresh B đã
làm lại admin. Ảnh ba khung Claude đã xem:

```
A/10 Lô nhập (màn cũ, đã code)   A/90 Giao dịch (đã code ở M4b)   A/84 Tình trạng AI (màn mới)
┌──────────┬──────────────┐      ┌──────────┬──────────────┐      ┌──────────┬──────────────┐
│ menu trái│ thẻ trắng,   │      │ menu trái│ bộ lọc + bảng│      │ menu trái│ 5 ô số + bảng│
│ mục chọn │ bảng, badge  │  =   │ mục chọn │ badge màu    │  =   │ mục chọn │ badge màu    │
│ tô vàng  │ nút vàng     │      │ tô vàng  │              │      │ tô vàng  │              │
└──────────┴──────────────┘      └──────────┴──────────────┘      └──────────┴──────────────┘
```

Câu hỏi thật sự bây giờ là: "làm lại" ở ngày 15/10 đã được UI refresh B làm xong chưa, hay bạn vẫn muốn một đợt làm lại nữa sau hướng B.

Các hướng:
- (a) Đã xong. UI refresh B chính là đợt làm lại. Màn mới code đúng theo page 04, và ghi chú "tạm" được xóa khỏi `CLAUDE.md` và memory.
- (b) Vẫn muốn làm lại sau, nhưng đợt này cứ code theo page 04. Màn mới chỉ dùng component chung trong `ui/`, để lần làm lại sau chủ yếu sửa `ui/` và `Shell`.
- (c) Vẫn muốn làm lại, và làm trước khi dựng màn mới. Cần một vòng thiết kế hướng mới trước.
- (d) Khác.

**Đề xuất của Claude:** **(a)**, nếu bạn xác nhận là ý bạn lúc đó. Điều này chỉ bạn biết, nên Claude không tự kết luận.
- *Vì sao:* bằng chứng nghiêng về (a). Ghi chú nói về kiểu Sneat. Hướng B được chọn cùng ngày và đã code vào admin. Đợt giao diện (22/10) vẽ 40 khung admin
  mới theo đúng hướng B. Nếu vẫn định làm lại thì lẽ ra 40 khung đó đã không được vẽ theo kiểu sắp bỏ. Thêm nữa, B25E30 được ghi "sửa khi refactor giao diện
  admin" (`buoc-2-5-test-flow.md:78`), và nó đã được sửa đúng trong UI refresh B.
- *Bằng chứng ngược chiều:* ở câu 25 của đợt cải thiện (26/10), đề xuất của Claude viết "đợt làm lại admin chưa có design", và bạn trả lời "ok". Có thể bạn
  vẫn nghĩ sẽ có một đợt làm lại, hoặc bạn chỉ đồng ý phần "làm màn theo admin hiện tại". Vì vậy câu này cần bạn nói rõ.
- *Trade-off:* chọn (a) là chốt hướng B cho admin. Nếu sau này bạn vẫn muốn đổi, phải sửa nhiều màn hơn. Dù chọn (a) hay (b), Claude vẫn giữ luật "chỉ dùng
  component chung", vì luật đó rẻ và giúp cả hai trường hợp.
- *Chưa kiểm:* Claude chưa chụp admin đang chạy để so từng pixel với Figma, vì cổng 5173 đang bị container của một session khác chiếm. Việc giống nhau suy từ
  as-built (UI refresh B đã cập nhật lại các khung A/01–A/51 theo app; A/90 được code theo khung) và từ ảnh Figma. Sẽ chụp màn thật khi bắt đầu M1.

**Trả lời:** a

### Câu 4. Nếu làm lại phần nhìn (câu 3 chọn b hoặc c): đi theo hướng nào

*Câu 3 chọn (a) thì bỏ câu này.*

Hiện admin tự dựng component trên `react-aria-components`, màu và chữ lấy từ `packages/design-tokens` (hướng B, landing và người học cũng dùng).

Các hướng: (a) giữ token hướng B và `react-aria-components`, chỉ vẽ lại component và bố cục · (b) chuyển sang một bộ component admin có sẵn (tên thư viện
cụ thể sẽ kiểm khi design; `ASSUMPTION`: có bộ hợp với React 19 và Tailwind 4) · (c) chưa biết, cần Claude đưa vài mẫu để xem · (d) khác.

**Đề xuất của Claude:** nếu câu 3 là (b) thì câu này **để tới đợt làm lại phần nhìn**. Nếu là (c), Claude nghiêng về (a): giữ token hướng B và
`react-aria-components`.
- *Vì sao:* landing, app người học và admin đang dùng chung một bộ token. Phần bàn phím, focus và trình đọc màn hình đã nằm trong `react-aria-components`,
  và bộ e2e `a11y.spec.ts` đang kiểm phần đó. Đổi sang thư viện khác (b) nghĩa là viết lại cả `ui/` lẫn các test này, chỉ để có một phần nhìn khác.
- *Trade-off:* phải tự vẽ component thay vì lấy sẵn, nên tốn công vẽ hơn. Nếu bạn muốn admin trông khác hẳn người học, (b) hoặc (c) hợp hơn.

**Trả lời:**

### Câu 5. Code từ khung wireframe, hay vẽ bản hoàn chỉnh trước

*Sửa 27/10/2026:* page 04 không chỉ là khung. Các khung đã có cấu trúc, trường, trường hợp biên **và** phần nhìn hướng B (xem câu 3).

Các hướng: (a) code thẳng theo page 04 · (b) vẽ lại bản hoàn chỉnh hơn trong Figma trước khi code · (c) chỉ vẽ trước vài màn mẫu (ví dụ một danh sách, một
form, một trang chi tiết), các màn khác code theo mẫu đó · (d) khác.

**Đề xuất của Claude:** **(a)** code thẳng theo page 04. Mỗi milestone Claude chụp màn chạy thật, đặt cạnh khung Figma tương ứng để bạn xem lại sau, không
dừng chờ duyệt.
- *Vì sao:* khung đã đủ để code: cột, nút, chữ (bản chữ §8), trạng thái trống, lỗi và phần nhìn. Ngày 23/10/2026 bạn cũng đã bỏ bước dừng chờ duyệt ảnh hay Figma.
- *Trade-off:* các chỗ design đợt giao diện ghi "vòng code vẽ riêng" (trạng thái chỉ ghi bằng dòng chú thích mờ, ví dụ lỗi `lock-rule` ở A/72, danh sách
  trống ở A/76, A/86) chưa có khung. Claude dựng các chỗ đó bằng component đang có, và bạn chỉ thấy chúng sau khi đã code.

**Trả lời:** a

---

## Phần 2 — Phạm vi

### Câu 6. Màn nào vào đợt này

Đánh dấu `x` vào cột **Vào đợt** (để trống là không làm đợt này). Cột "Ai dùng" theo design §6.4.

| # | Màn | Ai dùng | Vào đợt |
|---|---|---|---|
| 6.1 | Từ (danh sách, chi tiết) | admin, editor | |
| 6.2 | Nghĩa (kèm người review / publish / gỡ gần nhất) | admin, editor | |
| 6.3 | Chủ đề | người có `taxonomy.manage` | |
| 6.4 | Cài đặt hệ thống (6 tab: Nhắc học, Học và ôn, Luyện tập, Gói và lượt, Nội dung, AI) | admin | |
| 6.5 | Người dùng (danh sách, chi tiết, khóa / mở) | admin | |
| 6.6 | Báo lỗi (lọc, xử lý, xác nhận lỗi và trả lượt) | admin, editor | |
| 6.7 | Lý do báo lỗi | admin | |
| 6.8 | Danh sách trả lượt | admin | |
| 6.9 | Dạng chia chưa biết + dạng chia bổ sung | admin, editor | |
| 6.10 | Cấp gói và lượt (danh sách, cấp mới, lịch sử) | admin, editor (luật Bước 5) | |
| 6.11 | AI: model | admin | |
| 6.12 | AI: lựa chọn từng thao tác (model, effort, thinking, token tối đa) | admin | |
| 6.13 | AI: prompt (lịch sử, chạy thử) | admin | |
| 6.14 | AI: bộ ví dụ và các lần chạy | admin | |
| 6.15 | AI: tình trạng, chi phí, các lần gọi | admin | |

**Đề xuất của Claude:** làm **cả 15 màn**, gồm cả 6.14 Bộ ví dụ AI. *Sửa 27/10/2026:* bản trước đề xuất bỏ 6.14.
- *Vì sao đổi:* câu 4 của đợt cải thiện đề xuất lần gọi thật đầu tiên bằng cách thêm ví dụ rồi bấm chạy eval (khoảng 15 ví dụ × 6 thao tác × vài model), và
  bạn trả lời sẽ test việc đó ngay trên UI admin. Bỏ 6.14 thì lần chạy đó lại phải làm bằng tay qua API. Câu 16 bạn cũng muốn test eval trong admin.
- *Liên quan nhóm B:* nhóm B sẽ đổi cả 6.13 lẫn 6.14: thêm bản nháp / publish / rollback cho prompt (đổi D15 Bước 6), thêm tiêu chí mong đợi, held-out, judge
  cho bộ ví dụ. Đợt này dựng hai màn đúng theo API hiện có. Lớp gọi API và trạng thái tách khỏi phần hiển thị, để nhóm B thêm vào chứ không viết lại.
- *Vì sao giữ nhóm nội dung 6.1–6.3:* khi bạn xử lý báo lỗi và chọn "Đã sửa" (6.6), phải có chỗ để sửa nghĩa. Hiện chỉ sửa được bằng cách xuất CSV, sửa rồi
  nhập lại.
- *Trade-off:* đợt dài (15 màn, khoảng 40 khung). Một phần của 6.13 và 6.14 sẽ phải sửa lại khi nhóm B xong. Muốn ngắn hơn thì cắt theo thứ tự ở câu 2, từ
  dưới lên (d, rồi c).
- *Chữ cũ phải sửa khi code:* A/74 có nhãn "Người học đồng ý cho xem từ này". Luật đồng ý đó đã bỏ (D12 đợt giao diện người học: báo lỗi thì đội Wordmet luôn
  thấy từ), và API không có cờ nào cho nhãn này. Màn sẽ không hiện nhãn đó.

**Trả lời:** (đánh dấu trong bảng, ghi chú thêm ở đây nếu có) làm all

### Câu 7. Dashboard

Dashboard chưa có API, chưa có khung (chỉ giữ chỗ `A/D01`).

Các hướng: (a) để ngoài đợt, giữ "Sắp có" · (b) làm vài con số đơn giản, kèm API mới (ví dụ số người học mới, số báo lỗi đang chờ, lời gọi AI hôm nay;
cụ thể chọn ở design) · (c) bỏ mục khỏi menu tới khi có ý tưởng · (d) khác.

**Đề xuất của Claude:** **(a)** để ngoài đợt, giữ "Sắp có".
- *Vì sao:* chưa có người học thật, nên số liệu nào cũng gần như bằng 0. Hai con số cần nhất đã có chỗ: lượt AI hôm nay (khối đầu A/70d, A/78) và tình trạng
  AI hôm nay (A/84). Nhóm B cũng định làm một dashboard AI riêng: theo câu 24 của đợt cải thiện, đó là trang mới trong admin, có xem thư viện vẽ biểu đồ.
  Chọn số cho Dashboard lúc này dễ trùng hoặc lệch với trang đó.
- *Trade-off:* sau khi đăng nhập, admin vẫn vào "Lô nhập" như hiện nay, không có trang tổng quan.

**Trả lời:** a

### Câu 8. Email người thao tác (nợ API §10)

Ví dụ: màn Cấp gói hiện chỉ hiện được "Người cấp: 3f2a…" thay vì "minh@…". Muốn hiện email thì API phải thêm trường.

Các hướng: (a) làm trong đợt, trước các màn cần nó · (b) để sau, tạm hiện mã người dùng · (c) khác.

**Đề xuất của Claude:** **(a)**. Mỗi màn thêm email đúng lúc tới milestone của nó. *Sửa 27/10/2026:* phạm vi rộng hơn bản trước, vì cột "Người học" cũng
đang là uuid. Danh sách đã kiểm:

| Milestone | Chỗ cần thêm email |
|---|---|
| AI | prompt `saved_by`; bộ ví dụ `created_by`, `started_by`. Prompt seed (`AI_SYSTEM_ACTOR_ID`) hiện "Hệ thống" |
| Báo lỗi | báo lỗi `resolved_by`; trả lượt `resolved_by` và người học; lý do báo lỗi `updated_by` |
| Người học | cấp gói `granted_by`, `revoked_by`, `changes[].changed_by` và người học |

Nội dung, cài đặt và khóa tài khoản đã có email, không phải làm.
- *Vì sao:* chỉ thêm trường vào response, không đổi trường cũ. `locked_by` và `reviewed_by` đã làm đúng kiểu này (`{id, email}`). Màn hiện "3f2a…" thì bạn
  không biết ai đã làm gì, mà đó là lý do có cột "Người cấp", "Người xử lý".
- *Trade-off:* đụng API của ba module (AI, Practice, Entitlements). Theo luật ranh giới module, mỗi module phải gọi `IdentityService` để lấy email, không đọc
  thẳng bảng của Identity, nên mỗi danh sách có thêm một lần tra (gom theo trang, không tra từng dòng).

**Trả lời:** mô phỏng chỗ này → sau khi xem mô phỏng (chat 27/10/2026): **(a)**, thêm email người thao tác và người học.

### Câu 9. Chia đợt thành bao nhiêu phần

Các hướng: (a) mỗi nhóm menu một milestone (Nội dung, Luyện tập, Người học, AI, Hệ thống), mỗi milestone một nhánh và PR như đợt người học · (b) theo thứ tự
ưu tiên ở câu 2, mỗi milestone vài màn · (c) mỗi màn một PR · (d) một nhánh cho cả đợt · (e) khác.

**Đề xuất của Claude:** **(b)**. Mỗi milestone một nhánh `feat/giao-dien-admin-<m1|m2|…>` tách từ `origin/dev` và một PR vào `dev`, giống đợt giao diện người học.
Nếu câu 2 và câu 6 giữ theo đề xuất:

| Milestone | Màn | Kèm |
|---|---|---|
| M1a — AI, cấu hình | 6.15 Tình trạng, 6.11 Model, 6.12 Thao tác, 6.13 Prompt (kèm chạy thử) | menu AI 7 mục theo Figma; quyền `settings.manage` (13.1); email người lưu prompt; component còn thiếu trong `ui/` |
| M1b — AI, đo | 6.14 Bộ ví dụ, chi phí và các lần gọi (phần còn lại của 6.15) | email người tạo / chạy bộ ví dụ |
| M2 — Cài đặt hệ thống | 6.4 (6 tab) | mục menu mới, tab |
| M3 — Báo lỗi | 6.6 Báo lỗi, 6.7 Lý do, 6.8 Trả lượt, 6.9 Dạng chia | email người xử lý |
| M4 — Người học | 6.5 Người dùng, 6.10 Cấp gói | email người cấp |
| M5 — Nội dung | 6.1 Từ, 6.2 Nghĩa, 6.3 Chủ đề | |

- *Vì sao:* mỗi PR nhỏ đủ để review và đủ để dùng được ngay sau khi merge. Xong M1a là bạn đã chọn model và chạy thử AI thật được qua màn. Xong M1b là chạy
  được lần eval đầu tiên theo câu 4 của đợt cải thiện, và đó là đầu vào cho design nhóm B.
- *Trade-off:* 6 PR, mỗi PR đều phải chờ CI (lần chạy 27/10: job `web` khoảng 15 phút, admin khoảng 4 phút). AI bị tách làm hai vì 6.15 và 6.14 cộng lại
  quá lớn cho một PR.

**Trả lời:** b

### Câu 10. Việc API khác nếu màn cần

Khi viết design có thể lộ ra chỗ API còn thiếu cho màn (ví dụ một bộ lọc, một trường). Đợt người học đã gặp 9 việc như vậy, (a)–(i).

Các hướng: (a) việc API nhỏ làm luôn trong đợt, ghi rõ trong design · (b) mỗi việc API hỏi bạn trước · (c) đợt này không sửa API, màn nào thiếu thì bỏ phần
đó · (d) khác.

**Đề xuất của Claude:** **(a)**, với ranh giới rõ. "Nhỏ" là chỉ thêm (một trường, một bộ lọc, một endpoint đọc) và không đổi hành vi đã chốt. Mọi việc như vậy
được liệt kê trong design để bạn thấy trước khi duyệt. Việc nào đổi luật đã chốt (ví dụ đổi ai được làm gì, đổi cách trừ lượt) thì hỏi bạn như một quyết định.
- *Vì sao:* đợt người học làm 9 việc (a)–(i) theo cách này và không bị chặn giữa đường. Hỏi từng việc (b) thì phải dừng nhiều lần. Không sửa API (c) thì một số
  khung đã vẽ không làm được, ví dụ cột email.
- *Trade-off:* có việc API lộ ra lúc code mà design chưa liệt kê. Khi đó Claude ghi vào delivery record và báo trong PR, không dừng, trừ khi việc đó đổi luật.

*Thêm 27/10/2026:* các việc API nhỏ **đã thấy** khi đối chiếu (ngoài email ở câu 8 và hai việc đổi quyền ở câu 14). Mỗi việc chỉ thêm, không đổi luật. Bằng
chứng ở các file `giao-dien-admin-facts/*.md`.

| # | Màn | Thiếu | Hướng sửa dự kiến |
|---|---|---|---|
| 10.1 | A/82 | Không biết còn bao nhiêu lần chạy thử ("Còn 17/20 trong giờ này"); chỉ biết khi bị 429 | thêm số còn lại vào response chạy thử, hoặc màn bỏ dòng đếm và chỉ báo khi 429 |
| 10.2 | A/82 | Câu chặn cố định nằm cứng trong code, GET prompt không trả | thêm trường chỉ đọc |
| 10.3 | A/88 | Cột "Thiếu" chỉ có khi lọc "Thiếu nội dung" | thêm `missing[]` cho mọi bộ lọc, hoặc chỉ hiện cột khi lọc đó |
| 10.4 | A/78 | Cấp gói không có trường trạng thái. "Bị thay thế" phải suy từ lý do thu hồi `'replaced'`, nên trùng được nếu staff tự gõ chữ đó | thêm `status` do API tính |
| 10.5 | A/78d | Danh sách cấp gói không kèm lần sửa trước | thêm lần sửa gần nhất vào mỗi dòng |
| 10.6 | A/74 | Không có `GET` một báo lỗi theo id, nên không mở thẳng bằng link được | thêm endpoint đọc |
| 10.7 | A/74b | Không biết người học chọn lựa chọn nào khi hai lựa chọn cùng bị che | thêm chỉ số lựa chọn vào snapshot của báo lỗi mới (báo lỗi cũ thì ghi "không rõ") |
| 10.8 | A/70 | API không trả giá trị mặc định của cài đặt | thêm `default` vào `bounds`, hoặc client chép cứng |
| 10.9 | nhiều màn | 7 mã lỗi chưa có câu trong client admin (`version-conflict`, `lock-rule`, `report-not-open`, `resolve-status-not-allowed`, `report-reason-exists`, `grant-not-allowed`, `grant-not-active`); vài lỗi AI chưa có câu trong bản chữ | việc client, không đụng API |

**Trả lời:** a

---

## Phần 3 — Cách kiểm và khi nào "xong"

### Câu 11. "Xong khi"

Các màn admin hiện có kiểm bằng: unit test, e2e trên API giả (mock), e2e trên stack thật (`admin-e2e-real`: API, Postgres, Redis, Mailpit), một test flow
bạn tự chạy tay.

Các hướng: (a) CI xanh mỗi PR (unit + e2e mock) · (b) như (a), thêm e2e trên stack thật cho mỗi màn có ghi dữ liệu · (c) như (b), thêm Claude chạy thật
trên máy và chụp màn từng milestone · (d) như (c), thêm test flow cho bạn tự chạy · (e) khác.

**Đề xuất của Claude:** **(d)**, với hai điểm cụ thể. *Sửa 27/10/2026:* bản trước chỉ đề xuất một luồng e2e thật mỗi milestone.
- e2e trên stack thật: **mỗi màn có ghi dữ liệu một test**, đi đúng luồng chính của màn đó. Ví dụ ở Thao tác: chọn model cho `generate_cloze`, lưu, rồi thấy
  thao tác "Sẵn sàng" ở Tình trạng. Ở đây dùng nhà cung cấp giả, không gọi AI thật. Các trường hợp biên kiểm bằng e2e mock.
- Test flow cho bạn tự chạy được ghi vào tài liệu, nhưng **không chặn merge**. Merge khi CI xanh và Claude đã chạy thật, chụp màn.
- *Vì sao đổi:* lý do cũ ("e2e thật làm CI chậm") không đúng. Đo trên lần chạy CI 27/10/2026: `admin-e2e-real` hiện có 8 test, chạy khoảng 2 phút, song song
  với job `web` khoảng 15 phút. Thêm khoảng 12 test thì vẫn xong trước `web` (`ASSUMPTION`: mỗi test vài giây, chưa đo). Có nhiều chỗ mock dễ lệch API thật:
  hai lỗi thinking cùng là `validation-failed` và chỉ khác chuỗi, các trạng thái cấp gói phải tự suy. Test thật bắt được những chỗ đó.
- *Trade-off:* test thật cần dữ liệu đầu vào (người học, báo lỗi, lần cấp) dựng qua API trong global setup, nên viết test lâu hơn. Gọi AI thật vẫn không có
  trong CI. Phần đó chỉ thấy khi bạn tự chạy với key của bạn.

**Trả lời:** d

### Câu 12. Tiếng Anh

Admin có vi / en. Design đợt giao diện chỉ viết chữ tiếng Việt; bản tiếng Anh kiểm khi code (D14 của đợt giao diện).

Các hướng: (a) màn mới đủ cả vi và en như các màn đang có · (b) chỉ vi, en để sau · (c) khác.

**Đề xuất của Claude:** **(a)**.
- *Vì sao:* admin đang có nút đổi ngôn ngữ, và mọi chữ đã nằm trong `messages/vi.json` và `messages/en.json`. Màn mới chỉ có tiếng Việt thì khi chọn tiếng Anh
  sẽ hiện tên khóa thô (ví dụ `nav.aiSettings`) hoặc trộn hai thứ tiếng. Viết bản en cùng lúc rẻ hơn quay lại sau.
- *Trade-off:* mỗi màn thêm khoảng một phần ba công viết chữ. Bản en không có bản chữ được duyệt trước, nên Claude viết và bạn xem khi chạy.

**Trả lời:** a

### Câu 13. Còn gì bạn muốn thêm hoặc bỏ

Ví dụ: màn nào bạn muốn khác khung đã vẽ, việc nào ngoài danh sách trên.

**Đề xuất của Claude:** thêm các việc nhỏ dưới đây, đều nằm sẵn trong code mà đợt này đụng tới. *Sửa 27/10/2026:* bỏ đề xuất cũ "sửa B25E30", vì lỗi đó
đã sửa trong UI refresh B (xem mục 0).
- **13.1 Quyền và menu AI.** `nav.ts` đang dùng `roles.manage` cho nhóm AI, kèm ghi chú "session chưa có quyền AI". Ghi chú đó đã cũ: trang Giao dịch đã dùng
  `settings.manage`, và cả 5 controller AI đều đòi đúng quyền này (đã kiểm). Menu hiện chỉ có 3 mục AI, trong khi Figma có 7 (Tình trạng, Model, Thao tác,
  Prompt, Bộ ví dụ, Chi phí, Các lần gọi). Đề xuất: ở M1a đổi sang `settings.manage` và dựng menu theo thanh bên Figma. Hiện chỉ `admin` có cả hai quyền, nên
  không ai thấy khác.
- **13.2 Ba điểm guideline còn nợ, áp cho màn mới:** bộ lọc ghi vào URL (để tải lại hay gửi link vẫn giữ bộ lọc); khi lưu lỗi thì focus vào ô lỗi đầu tiên;
  cảnh báo khi rời form đang sửa dở. Điểm cuối quan trọng nhất ở Cài đặt hệ thống (6 tab, nhiều ô) và Prompt (lời dặn tới 8.000 ký tự). Làm trong `ui/` và
  `Shell` để mọi màn dùng chung. Các màn cũ có muốn áp theo không là câu riêng, đợt này không đụng.
- **13.3 Sửa ghi chú cũ** trong `CLAUDE.md` và memory: B25E30 đã sửa. Ghi chú "phần nhìn admin là tạm" sửa theo câu trả lời câu 3.
- *Trade-off:* thêm việc ngoài danh sách màn. 13.2 làm mỗi form tốn thêm chút công, đổi lại không mất dữ liệu đang nhập.

**Trả lời:** theo đề xuất

### Câu 14. Quyền của editor ở các màn của mình (thêm 27/10/2026)

Khi đối chiếu, Claude thấy có hai chỗ editor (Minh) không làm được việc mà khung đã vẽ cho editor. Cả hai đều là đổi quyền đọc, nên là quyết định của bạn,
không phải việc API nhỏ.

**14.1 Cấp gói (A/79, A/79e): Minh không tìm được người học theo email.** Mọi endpoint `/admin/users` đòi `roles.manage` (chỉ admin), còn API cấp gói nhận
`user_id` dạng uuid. Ô lọc "Người học" và "Người cấp" ở A/78, "Người xử lý" ở A/76 cũng chỉ nhận uuid. Minh chỉ biết người nhận là staff hoặc là chính mình
sau khi bấm [Cấp] và nhận lỗi `409 grant-not-allowed`.

Các hướng: (a) thêm một endpoint tra **đúng một email** cho người có `entitlements.grant`. Endpoint trả id, email và việc có cấp được không; không có danh
sách, không có tìm một phần · (b) mở `GET /admin/users` cho editor · (c) API cấp gói nhận email thay cho uuid · (d) khác.

**Đề xuất của Claude:** **(a)**, và ô lọc theo người ở A/76, A/78 nhận email (API tự tra ra id).
- *Vì sao:* Minh chỉ cần cấp cho người mình đã biết email, ví dụ học viên lớp IELTS. (b) cho Minh xem toàn bộ danh sách người dùng, kèm ngày sinh và trạng thái
  khóa, nhiều hơn việc cần. Ở (c), form không báo trước được "tài khoản staff, không cấp được".
- *Trade-off:* thêm một endpoint. Dù chỉ tra đúng một email, Minh vẫn thử được xem một email có tài khoản hay không. Đổi lại, đây là người bạn đã cấp quyền editor.

**14.2 Báo lỗi (A/73e): Minh không đọc được danh sách lý do.** Endpoint lý do đòi `settings.manage`, nên bộ lọc "Lý do" ở màn của editor không có dữ liệu.
Báo lỗi cũng không mang cờ "có trả lượt", nên Minh không thấy dòng "Xác nhận lỗi sẽ trả lại 1 lượt câu AI".

Các hướng: (a) cho `content.edit` **đọc** danh sách lý do (sửa vẫn chỉ admin), và mỗi báo lỗi mang cờ `refundable` · (b) bỏ bộ lọc "Lý do" và dòng trả lượt ở
màn của editor · (c) khác.

**Đề xuất của Claude:** **(a)**.
- *Vì sao:* lý do báo lỗi không phải dữ liệu nhạy cảm (người học nào cũng thấy khi gửi báo lỗi). Và Minh nên biết trước bấm "Xác nhận lỗi" sẽ trả lượt.
- *Trade-off:* đổi quyền của một endpoint đọc. Cần ghi vào design như một quyết định, vì design Bước 7 đặt cả nhóm lý do dưới `settings.manage`.

**Trả lời:** toàn bộ theo đề xuất
