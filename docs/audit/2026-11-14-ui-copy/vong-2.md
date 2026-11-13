# Sửa chữ giao diện vòng 2: report (14/11/2026)

**Nhánh:** `fix/ui-copy-round-2`, tách từ `origin/dev` (`2d858021`). Commit cục bộ, chưa push, chưa mở PR. Các commit:
- `960b3ac0` feat(api): FAQ landing;
- `9ae7c607` fix(web): sửa chữ và bỏ dòng thừa;
- `3e0439da` test(web): pin e2e;
- `a9dd920e` docs;
- `4b209265` test(web): cố định giờ trong 2 test nạp lượt AI;
- commit docs cuối.
**Đầu vào:** `vong-1.md` (mục 2.1–2.16, quyết định Q1–Q14), `faq-de-xuat.md` (bản 2), `danh-gia-gemini.md`. Plan:
`docs/superpowers/plans/2026-11-14-ui-copy-round-2.md`.
**Bảng thay đổi đầy đủ (key | cũ | mới):** `vong-2-thay-doi.md`. Bảng này sinh tự động từ diff nên khớp đúng với file.

## 1. Đã làm gì

| Phần | Kết quả |
|---|---|
| `vi.json` | Đổi 112 chuỗi |
| `en.json` | Đổi 190 chuỗi, không kể landing. Landing EN vẫn là bản sao chữ Việt, chép theo bản VI. |
| Key | 1.507 → 1.498 ở mỗi file. Chỉ xóa 9 key của các dòng thừa (Q14). Không thêm key, không đổi thứ tự. |
| Code web | Bỏ 9 dòng chữ thừa ở 9 component. Ở trang từ, một hàng giữ được bố cục nhờ thêm `md:justify-between`. |
| FAQ landing | Migration dữ liệu mới `apps/api/prisma/migrations/20261114180000_landing_faq_copy`. Bản dự phòng `landing-data.fallback.ts` chép cùng 6 câu. Thêm test bắt hai bản phải giống nhau. Cập nhật danh sách câu hỏi trong `smoke-giao-dien-moi.mjs`. |
| Test | Sửa test web và e2e đang ghi cứng chữ cũ: chỉ đổi giá trị pin, không nới lỏng. Test của dòng đã bỏ đổi sang khẳng định dòng đó không còn. |

## 2. Quyết định đã áp

- **Q1:** EN dùng "deck" ở mọi chỗ (`Nav.groups`, `App.lookup.otherGroup`, `App.deleteAccount.deleted.learning`…). Chữ "chồng" thay bằng "Chọn nhóm để thêm từ".
- **Q2:** "Needs review" / "Known" ở nút, phím tắt, chú giải phím, lịch học, tổng kết và các câu hướng dẫn.
- **Q3:** trình độ trong EN là "CEFR level". Bậc ôn vẫn là "Level".
- **Q4:** VI "câu đã gặp". EN "saved sentence"; bỏ cách nói "meet a word".
- **Q5:** giữ "Miễn phí".
- **Q6:** "Terms of Use", "Privacy Policy" ở mọi chỗ.
- **Q7:** `Metadata.*` EN đã dịch. Landing EN giữ chữ Việt.
- **Q8:** giọng trung tính.
  - VI: "Đúng" / "Chưa đúng", "Luyện tiếp vào ngày mai".
  - EN: "Correct" / "Incorrect", bỏ "Not quite", "a bit fast", "used them all".
- **Q9:** bỏ "hãy" ở 12 câu báo lỗi.
- **Q10:** viết lại `login.rateLimited`, `round.note`, `share-consent-required`, `houseAd.lead` theo nghĩa đã đối chiếu với code.
- **Q11:** các chuỗi gói tự gia hạn chỉ áp quy tắc chung.
- **Q12:** FAQ 6 câu (bản 2).
- **Q13:** giữ khối giá trên landing; chỉ bỏ chữ về thanh toán.
- **Q14:** bỏ 9 dòng và phần thừa ở 7 dòng khác.

**Các nhóm sửa khác:**
- Câu báo lỗi VI theo mẫu "Không … được. [việc cần làm]."; EN theo mẫu "Couldn’t …".
- Số nhiều ICU trong EN ("Added 1 words" đã hết).
- Tiêu đề không chấm cuối, không có dấu phẩy trước "và"/"hoặc", "02" → "2".
- Một kiểu dấu nháy ’ trong EN, một chính tả kiểu Mỹ ("practice").
- "câu mẫu" → "câu ví dụ", "Về trang chủ" → "Về Hôm nay" (nút đó dẫn tới `/app`).

## 3. Chỗ làm khác với đề xuất, và lý do

1. **Giữ dòng `noteHint`** (đề xuất Q14 là bỏ). Trong code, dòng này còn hiện **trước** khi trả lời, ngay lúc người học mở gợi ý (`PracticeSession.tsx:413`), để báo trước rằng câu đúng nhờ gợi ý không có nút Known. Đó là thông tin cần cho quyết định, nên chỉ đổi "Know" thành "Known".
2. **`Landing.plans.aiList.0` là "AI soạn câu và tra từ"**, không phải "AI trong gói Pro" như bản nháp đầu. Test `copy.test.ts` LA3#16 cấm landing nói AI chỉ có ở Pro, vì gói Miễn phí cũng có lượt AI (đợt A, M3).
3. **`App.practice.hero.words` EN là "Words to practice: <b>N</b> in M decks".** Dạng số nhiều "N word/words" làm test "mọi placeholder số phải định dạng số" báo nhầm chữ `{words}` trong nhánh plural.
4. **FAQ qua migration, không nhập tay ở admin.** Bản dự phòng phải giống hệt bản migration nạp sẵn (ghi chú trong code; nay có test bắt). DB chưa deploy, nên migration là cách duy nhất để lần deploy đầu có FAQ mới.
   - Migration chỉ thay các dòng nạp sẵn khi chưa ai sửa dòng nào trong admin.
   - Đã chạy thử trên Postgres 17 tạm với ba trạng thái DB (mục 4).
5. **Q14 không tách commit riêng.** Phần bỏ dòng và phần sửa chữ cùng đụng các file test và file message.
6. **Thêm vài sửa đi kèm Q2** mà bảng đề xuất chưa liệt kê:
   - legend Esc của màn ôn: "Stop" → "Stop session";
   - nút X của màn ôn: "Stop" → "Close review";
   - `noteHint` nhắc "Known button".

## 4. Kiểm tra

| Kiểm | Kết quả |
|---|---|
| Script so key, thứ tự, đối số ICU và tag (parser `@formatjs/icu-messageformat-parser`) với `origin/dev` | `OK: keys, order, ICU arguments and tags match the base`. 1.507 → 1.498 key mỗi file, 9 key được phép xóa. Đã thử cố ý phá: bỏ một placeholder, đổi tag `<b>`→`<i>`, xóa một key. Script báo đủ 3 lỗi. |
| `node scripts/check-message-keys.mjs` | `message keys: 1350 used, 0 unused` |
| `pnpm typecheck`, `pnpm lint` (web) | Qua |
| `vitest run` (web, 160 file), lần chạy cuối | **1.723/1.723 qua.** Trước đó có 2 test đỏ (`ai-states.test.tsx` E31, K/75b), và chúng **đỏ y như vậy trên bản `origin/dev`** (đã đối chứng bằng chính file của `dev`, rồi khôi phục và kiểm sha1). Nguyên nhân là "bom hẹn giờ": `refillKind` chỉ ghi "15/11" khi mốc nạp lượt (0:00 15/11 giờ VN) còn cách hơn một ngày, nên từ 14/11 hai test này đỏ mãi. Commit `4b209265` cố định giờ trong hai test về 12/11, chỉ giả lập `Date`. Kiểm ngược: đẩy giờ cố định sang 14/11 thì hai test đỏ lại, nên chúng vẫn kiểm đúng cách ghi ngày. |
| Test mới: bản dự phòng FAQ = migration | Qua. Cố ý sửa một câu trong bản dự phòng thì test đỏ; hoàn lại thì xanh. |
| Migration FAQ trên Postgres 17 tạm | (A) FAQ nạp sẵn chưa sửa → 6 câu mới. (B) admin đã sửa câu 30 → FAQ giữ nguyên 6 câu cũ. (C) admin xóa 2 câu và thêm câu riêng → câu của admin giữ, thêm 6 câu mới. Lần chạy đầu bắt được lỗi ở (B): xóa 5 câu mà không thêm gì. Đã sửa rồi chạy lại. |
| Build container web từ nhánh (`docker compose -p el-copy build web`, gồm `next build` và type check) | Qua |
| Xem trên app thật (`localhost:3001`, bản build của nhánh) | Landing VI hiện chữ mới (tiêu đề không chấm, "Hai gói, khác nhau ở mức luyện tập và AI", "Miễn phí để bắt đầu."). Đăng ký EN: "Terms of Use", "Privacy Policy", "Sign in". Đăng nhập VI với mật khẩu sai, đi qua API thật: "Email hoặc mật khẩu không đúng. Thử lại." Trang Nguồn dữ liệu không còn dòng "tự cập nhật". |
| E2E web (`pnpm cf:docker`, Playwright trong container Linux, như job `web` của CI) | **Lượt 1, toàn bộ:** 477 qua, 6 đỏ, 2 flaky. 6 test đỏ là `m4.spec.ts` "a default session" và "M4 pages with long content", do e2e còn pin chữ cũ: "You've" và chip Weak words kết thúc bằng "wrong". Đã sửa hai chỗ pin đó. **Lượt 2**, 6 spec đã đụng (`m1`, `m2`, `m4`, `m5a`, `m7a`, `recall`): **115 qua, 1 đỏ.** Test đỏ là `m1` E2 (đăng nhập với `?next`) trên desktop. Ảnh chụp trang lúc lỗi cho thấy hai ô email và mật khẩu bị xóa trắng trước khi bấm "Đăng nhập", nên form báo "Nhập email." Đây là rủi ro canh giờ lúc trang hydrate mà comment trong test đã ghi. Các chuỗi test dùng không đổi; ở lượt 1 test này qua khi chạy lại, và qua trên mobile. **Đối chứng trên `dev`:** dựng một worktree tạm của `origin/dev`, chạy riêng test này 6 lần trên desktop, không cho chạy lại: **2/6 đỏ, cùng kiểu lỗi** (vẫn ở `/vi/app/login?next=…`). Vậy đây là test flaky có từ trước trên `dev`, không do việc sửa chữ. Trên CI, Playwright được chạy lại một lần nên thường qua. |

## 5. Chưa kiểm, rủi ro

- **Màn trong app sau đăng nhập chưa xem bằng trình duyệt.** Để xem phải tạo một tài khoản thử, và mình không tạo. Các màn này được kiểm bằng 1.700+ test component, vốn render đúng file message thật.
- **FAQ trên landing ở máy bạn vẫn là bản cũ** cho tới khi API chạy migration mới (container API chạy `db:setup` mỗi lần khởi động) và web build lại. Nếu bạn đã sửa FAQ trong admin, migration không đụng tới FAQ đó (trường hợp B).
- **`pnpm smoke:giao-dien-moi` chưa chạy lại.** Mình chỉ đổi danh sách câu hỏi nạp sẵn mà smoke so khớp.
- **`dev` hiện đỏ 2 unit test** (E31, K/75b) cho tới khi nhánh này vào `dev`, vì bản sửa nằm ở commit `4b209265` của nhánh này.
- **Test e2e `m1` E2 flaky có từ trước trên `dev`** (đỏ 2/6 khi chạy đối chứng). Nên sửa trong một việc riêng: cách điền ô trước khi trang hydrate xong.
- **Container web ở cổng 3001 đang là bản của nhánh này** (`el-copy-web`). Container cũ `english-learning-web-1` chỉ bị dừng, chưa xóa. Muốn trả lại thì chạy `docker rm -f el-copy-web` rồi `docker start english-learning-web-1`.
- Văn bản pháp lý, email và trang admin không nằm trong hai file message nên chưa rà.
