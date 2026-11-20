# Landing và màn luyện tập: sửa theo góp ý thiết kế (design, 19/11/2026)

Nguồn: 8 góp ý trong `Wordmet.pdf` (người góp ý gửi chủ dự án 18/11/2026). Mock-up đã duyệt:
`docs/mockups/2026-11-18-landing-gop-y/index.html` (ảnh "Trước" trong `truoc/`). Quyết định và các vòng sửa:
`docs/superpowers/decisions/2026-11-19-landing-feedback-decisions.md`.

Phạm vi: `apps/web` landing (`src/site/landing/**`). **Cập nhật 20/11/2026:** bản đầu của design còn sửa ô số trong `src/ui/AnswerOption.tsx` của app; mục đó đã bỏ vì `dev` đã bỏ ô số trên dòng đáp án theo quyết định của chủ dự án ngày 18/11. Chỉ còn sửa ô số ở bản minh họa trên landing. Không đụng API,
DB, admin. Không thêm dependency.

## 1. Hero: tiêu đề một màu (góp ý 1)

- Bỏ màu nhấn ở "trong câu" / "in a sentence": tiêu đề `h1` một màu `text-wm-ink`.
- Bỏ key `Landing.hero.accent` ở `vi.json` và `en.json`, bỏ phần tách `before/accent/after` trong `Hero.tsx`.
- Dấu chấm cuối tiêu đề đã bỏ ở commit `81f63d87`, không làm lại.
- Màu vàng (`Marked`) ở câu ví dụ trong thẻ của hero (`HeroCycle`) **giữ nguyên**: vai trò bút dạ quang, không phải trạng thái đúng/sai.

## 2. Bỏ dải chip trượt ngang (góp ý 2)

- Xóa `WordStrip.tsx`, bỏ khỏi `HomePage.tsx`, bỏ key `Landing.strip` hai locale.
- `Marquee` (`src/site/interactive/Marquee.tsx`) chỉ `WordStrip` dùng: xóa cùng test của nó trong `motion.test.tsx` và CSS
  `[data-wm-marquee]` trong `globals.css`.

## 3. Section nhóm: vòng cung nhóm chủ đề (góp ý 3)

Thay `GroupsSection` (lưới 12 thẻ, thẻ `fluctuate` viền nổi; `FlyIn` và CSS `[data-wm-fly]`, `[data-group-card]` chỉ phục vụ nó nên xóa
cùng, key `Landing.groups.cards` bỏ) bằng vòng cung chồng thẻ nhóm **giống trang "Nhóm của bạn" trong app**
(`features/learner/groups/GroupCarousel.tsx`, CSS `.gstack-*`, `.gcar-*`), với các điểm khác:

| | App | Landing |
|---|---|---|
| Nội dung thẻ giữa | số từ, tên, số thẻ chờ, "Tiếp theo …" | số từ, tên, **5 từ** (không nghĩa), ô "+N từ", "Bắt đầu với **từ đầu tiên**" |
| Số thẻ chờ | có | **không** |
| Chuyển nhóm | tay (bấm, vuốt, phím) | **tự chuyển sau 3.500 ms** + tay (mũi tên, bấm thẻ bên, vuốt) |
| Bề ngang | trong cột nội dung | **trải hết bề ngang cửa sổ**, hai bên mờ dần (mask), không cắt cứng |
| Quầng màu phía sau (`.gcar-glow`) | có | không |
| Màu nhóm | theo hash ID nhóm | cố định theo thứ tự thẻ |

**Tiêu đề và câu dẫn mới:** VI "Học theo nhóm chủ đề" / "Chọn chủ đề và trình độ, Wordmet tạo sẵn nhóm từ. Mỗi từ có lịch ôn riêng."
EN "Learn with topic decks" / "Pick a topic and a level, and Wordmet builds the deck. Each word has its own review schedule."
(EN dùng "deck", quy ước UI copy vòng 2; `copy.test.ts` bắt buộc.)

**5 nhóm** (tên tiếng Anh y như `topic_names` của migration `20261114200000_topics_seed`; từ là từ CEFR-J 1.5 B1–B2 mang nhãn chủ đề
đó; số từ = số từ B1–B2 mang nhãn đó trong CEFR-J, chỉ để minh họa):

| # | Tên | Dòng dưới vòng cung (VI / EN) | 5 từ trên thẻ | Số từ | Màu (`group-n`) |
|---|---|---|---|---|---|
| 1 | Travel | Chủ đề có sẵn · B1 / Ready-made topic · B1 | destination, accommodation, departure, baggage, customs | 129 | 6 |
| 2 | Food & Drink | Chủ đề có sẵn · B1 / Ready-made topic · B1 | ingredient, flavour, appetite, nutrition, feast | 73 | 0 |
| 3 | Work & Jobs | Chủ đề có sẵn · B1–B2 / Ready-made topic · B1–B2 | colleague, career, agenda, client, contract | 179 | 2 |
| 4 | Body & Health | Chủ đề có sẵn · B1 / Ready-made topic · B1 | injury, infection, muscle, pharmacy, clinic | 63 | 1 |
| 5 | Education | Chủ đề có sẵn · B1 / Ready-made topic · B1 | assignment, curriculum, deadline, admission, certificate | 157 | 5 |

Mock-up vẽ nhóm thứ 5 là **IELTS**; chủ dự án chốt **Education** (D17, 19/11/2026) để giữ quyết định F.22 cũ ("landing đọc như tiếng Anh chung, không chữ IELTS";
`landing.test.tsx` kiểm `/IELTS/` không xuất hiện). Nếu sau này đổi sang IELTS thì đổi hàng 5 thành IELTS · "Bộ theo kỳ thi · B2–C1" / "Exam set · B2–C1" · approach, sustainable, contribute, interpret, consequence · 150 · 5 và bỏ
`IELTS` khỏi regex của test F.22.

**Hành vi:**
- Thẻ giữa đọc được (không `aria-hidden`); các thẻ bên `inert` + `aria-hidden`, như app.
- 5 từ của thẻ giữa nổi lên lần lượt mỗi khi một nhóm vào giữa (rise 460 ms, cách nhau 70 ms, bắt đầu sau 220 ms); thẻ bên không hiện từ.
- Tự chuyển 3.500 ms chỉ khi: `motionAllowed()` (có class `js`, không giảm chuyển động), section đang trong khung nhìn (`whileInView`),
  tab đang hiện, chuột không nằm trên vòng cung, focus không nằm trong vòng cung. Người dùng tự chuyển (mũi tên, bấm thẻ bên, vuốt)
  thì **dừng tự chuyển hẳn** cho tới khi tải lại trang.
- Giảm chuyển động: không tự chuyển, không chuyển động vòng cung, từ hiện sẵn.
- Không JS: thẻ 1 ở giữa, từ hiện sẵn, mũi tên không làm gì.
- Khoảng cách giữa các thẻ (px của bản 290 px) = `topicStep(vw)`: dưới 768 px là 128 (như app trên điện thoại); từ 768 px trở lên
  `clamp(150, (vw/2 − min(0,09·vw, 120) − 230) / 1,68, 230)`. Ở 1440 và 1280 px cả 5 thẻ nằm ngoài vùng mờ; ở 1024 px hai thẻ ngoài cùng
  nằm một phần trong vùng mờ (mờ dần, không cắt).
- Vùng mờ hai bên: `mask-image` ngang, rộng `min(9vw, 120px)` (điện thoại 28 px).

## 4–7. Câu luyện minh họa (`LearnSection` → `PracticeDemo`)

- **4. Ô số 1–4** ở dòng đúng/sai: nền `bg-wm-surface`, chữ và viền 1 px cùng màu dòng (`wm-pass` / `wm-fail`). Dòng chưa trả lời giữ
  `bg-wm-accent-soft text-wm-accent`. **Sửa cả** `ChoiceRow` (landing) **và** `AnswerOption` (app, `state` `correct` / `wrong`).
- **5. Dòng tiến độ:** bỏ hàng 4 chip (`scores`). Một dòng: loại câu ở trái; phải là "7/20", `Tag tone="pass"` ✓ 5, `Tag tone="fail"` ✕ 1
  (giống thanh phiên của app, `PracticeSession.tsx`). Dưới là thanh tiến độ. Hai `Tag` có tên đọc được: "5 câu đúng" / "1 câu sai"
  (EN "5 correct" / "1 incorrect").
- **6. Câu hỏi nổi bật:** font display, 22 px trên điện thoại và 26 px từ `md`, line-height 1.4; cách dòng tiến độ và các đáp án rõ hơn
  (`py-4 md:py-5`).
- **7. Từ điền vào chỗ trống:** ô viền 1,5 px `wm-pass`, nền `wm-pass-soft`, chữ `wm-ink` (như ô điền đáp án trong app), thay cho nền
  vàng `Marked`.
- **Bỏ chữ "Đúng" / "Sai"** (và dấu ✓ ✕ đi kèm) trên hai dòng đáp án; màu dòng đủ cho biết. Bỏ key `practice.right`, `practice.wrong`.
- Màn luyện tập thật trong app chỉ đổi ô số (mục 4). Câu hỏi trong app đã nằm ở thẻ riêng chữ lớn, không sửa.

## 8. "Từ lúc gặp đến lúc dùng được": các bước theo thứ tự

- Thay lưới 3 cột bằng `<ol>` 4 bước từ trên xuống: **1 Lưu từ** (note) → **2 Nghe** (listen) → **3 Luyện** (practice) → **4 Ôn** (review).
- Mỗi bước: số trong hình tròn `bg-wm-accent` bên trái, đường nối dọc giữa các số; từ `lg` chữ (eyebrow, h3, mô tả) bên trái cột 300 px,
  minh họa bên phải; dưới `lg` minh họa nằm dưới chữ.
- Bước "Nghe" **hiện cả trên điện thoại** (hiện đang `hidden md:flex`), để số bước liền mạch.
- Ô ôn ("Những ngày sau") và vòng lặp `DemoLoops` giữ nguyên hành vi.

## 9. Kiểm

- Unit/component (Vitest, `pnpm test` trong `apps/web`): test landing cập nhật theo nội dung mới; test mới cho `topicStep` và cho
  `TopicCarousel` (tự chuyển, dừng khi người dùng tự chuyển, giảm chuyển động).
- `pnpm lint` (có `check-tailwind-raw`: mọi giá trị Tailwind tùy ý cần chú thích `raw-ok`), `pnpm typecheck`.
- E2E landing và a11y (axe) trên Linux container: `pnpm cf:docker` (Windows).
- Xem bằng mắt ở 1440, 1280, 1024, 390 px, sáng và tối, so với mock-up.

## 10. Ngoài phạm vi

Hero stage (thẻ trôi, `HeroCycle`), Pricing, FAQ, Final CTA; dữ liệu chủ đề thật trong DB (catalog chưa gắn chủ đề); quầng màu của app.
