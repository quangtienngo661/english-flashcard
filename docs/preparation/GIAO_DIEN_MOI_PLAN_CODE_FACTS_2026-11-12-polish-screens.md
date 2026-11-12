# Code facts cho plan đợt polish: các màn (12/11/2026)

Đọc trên `docs/giao-dien-moi-plan-polish` (cùng cây với `claude/giao-dien-moi-m9-3adf51`). Chỉ đọc code, không sửa. Mọi đường dẫn
web tính từ `apps/web/`, API từ `apps/api/`. Khóa chữ ghi theo đường dẫn JSON trong `messages/vi.json` (en cùng khóa, test
`src/i18n/messages.test.ts:34` bắt hai file cùng khóa). Mockup: `docs/mockups/2026-11-05-redesign-concepts/m9-ban-chot.html`.

## 0. Bất ngờ chính (đọc trước)

1. **Tên gọi ngược:** `/app/review` + `features/learner/review/` là **Học** (chồng thẻ); `/app/recall` + `features/learner/recall/` là **Ôn**,
   và Ôn chỉ là `PracticeSession` với `recall={{ groupId }}` (`src/features/learner/recall/RecallSession.tsx:20`). Panel "Chưa đúng" của Ôn
   và Phiên luyện là cùng một component.
2. **Gợi ý chữ cái đầu "e_______" mâu thuẫn hai quyết định đã có:** API cố ý không gửi số chữ cho câu điền từ AI
   (`src/practice/ai/ai-question.ts:27-34`, "first letter (no letter count)", design §8 Bước 7); web pin "ba gạch dưới bất kể độ dài"
   (`src/features/learner/practice/session/HintPanel.tsx:62`, test `ai-questions.test.tsx:136` "CS20: … three underscores, whatever the
   length of the word"). Câu non-AI có `{first_letter, length}` (`src/practice/questions/hints.ts:32`) và web in "e… · 8 chữ"
   (`App.practice.session.hint.letters`). Làm "e_______" cho câu AI cần API thêm `length` (đổi D/CS20) → câu hỏi cho chủ dự án.
3. **"Hint 1 of 2" mâu thuẫn design §7.1:** en `App.practice.session.hint.progress = "Hint"` (không có tổng), test
   `practice-session.test.tsx:414` "design §7.1: in English the hint shows no total".
4. **Chữ giao diện tiếng Anh trong phiên:** lồng `NextIntlClientProvider` với messages `en` là làm được (next-intl v4: provider lồng
   kế thừa cha, từng prop thay nguyên khối; tài liệu next-intl đọc qua context7 12/11). Nhưng nếu giữ `locale='vi'` thì ICU plural của chuỗi
   en chạy theo luật `vi` (chỉ có `other`) → "1 cards left"; 11 chuỗi en trong `App.review|recall|practice.session` dùng `plural`.
   Nếu đổi `locale='en'` thì mọi `/${locale}/app…` (11 file dùng `useLocale()` trong phiên, xem §6) dẫn sang `/en/app`, khối dịch
   `locale === 'vi'` (`AnswerFeedback.tsx:120`) tắt, `useFormat` đổi định dạng ngày/số. Khoảng 475 dòng test phiên đang assert chữ Việt (§6).
5. **Lưu nhiều nhóm:** `quickAdd` đã chạy trong một transaction với `items.linkInTx` (`src/learning/quick-add/quick-add.service.ts:57-81`);
   thêm `group_ids` chỉ cần lặp `linkInTx` trong cùng tx → nguyên tử (một nhóm đầy thì không lưu gì). Gọi lặp `POST /v1/groups/:id/items`
   thì không nguyên tử và mỗi lần tốn 1 trong 30 lần ghi/phút chung của `user.write` (`src/common/config/app-config.ts:176`).
6. **Không có thư viện motion:** `package.json` web không có `motion`/`framer-motion`. Băng chuyền Nhóm là CSS thuần (`--k`, `data-abs`);
   chồng thẻ Học dùng Web Animations API (`src/lib/stack-motion.ts`). Băng chuyền "Vòng cung" sẽ phải viết bằng CSS/WAAPI.
7. Học đã khớp cơ chế artifact "Chồng thẻ tan mờ" (110 px, phóng 1,22, mờ 18 px); khác chủ yếu ở bố cục, nút, toast.
8. `StreakToast` dùng token landing cũ (`bg-navy`, `text-on-navy`, `shadow-toast`, `text-body`), không phải `wm-`
   (`src/app-ui/StreakToast.tsx:57-63`), gắn toàn app ở `src/app-shell/AppProviders.tsx:55`.

## 1. Nhóm: băng chuyền (`.gcar*`)

- Render: `src/features/learner/groups/GroupCarousel.tsx:22-145` (track, slot, mũi tên, gợi ý), `GroupStack.tsx:21-75` (thẻ nhóm),
  `GroupListPage.tsx:86-195` (Carousel: phím, mở nhóm), `GroupListPage.tsx:197-232` (`Below`: thanh nhịp ôn, Học/Ôn, "Xem nhóm").
  Hàm thuần: `carousel.ts` (`stackDepth`, `stepTo`, `carouselSlots`, `rhythm`, `carouselOrder`).
- Vị trí/chuyển động hiện tại (CSS, `src/app/globals.css:673-770`): `--k` inline (`GroupCarousel.tsx:120`), `data-abs` chọn biến:
  - `transform: translateX(k·--gcar-step) translateY(abs·--gcar-drop) scale(--gcar-s)` (`globals.css:694`); drop **tuyến tính** theo |k|,
    không nghiêng.
  - step 8rem phone / 14.375rem (230 px) từ 48rem; drop 1.3125rem / 1.75rem (`globals.css:675-687`).
  - scale 1 / 0.83 / 0.66 / 0.5; opacity 1 / 0.7 / 0 (0.4 từ 48rem) / 0; blur 0 / 3.6 / 7.2 px (`globals.css:707-713`).
  - Đường cong `--ease-wm-carousel: cubic-bezier(0.3,1.25,0.5,1)` 620 ms (`packages/design-tokens/web.css:271,275`).
  - Ẩn |k|>3 (`GroupCarousel.tsx:109`); thẻ bên `inert` + `aria-hidden` (`:117-118`); bấm thẻ bên tính k từ toạ độ (`:60-84`).
  - Thẻ giữa 290 px desktop (`globals.css:577-582`, `.gstack` 18.125em).
- Quầng: `.gcar-halo` (`globals.css:731-738`, blur 60px, màu `groupTone(...).wash`) render ở `GroupCarousel.tsx:95`; cũng dùng ở
  `GroupPage.tsx:163`.
- Nội dung thẻ: dòng meta `App.stack.words = "{count} từ · {mastered} đã thuộc"` (`GroupStack.tsx:48`), tên, "N thẻ chờ"
  (`App.stack.waiting`), chân "tiếp: word" (`App.stack.next/last`).
- Test: `groups/group-list.test.tsx:40-207` (bấm thẻ bên, ←/→ vòng, mũi tên, ↓ mở sau 170 ms, reduced motion, hai nhóm),
  `groups/carousel.test.ts` (stepTo/carouselSlots/rhythm), `groups/group-pieces.test.tsx:18` pin `'48 từ · 12 đã thuộc'`.
- Gap: mockup "Vòng cung" lệch 193 px/bậc, cong xuống 16·k² px, nghiêng 8° và nhỏ 10% mỗi bậc, `cubic-bezier(.34,1.56,.64,1)` 0,66 s
  (mockup L630); code lệch 230 px, drop tuyến tính, không xoay, scale −17%/bậc. Card bỏ "đã thuộc" (chỉ "48 từ").

## 2. Một nhóm (`GroupPage.tsx`)

- Head: `GroupPage.tsx:162-239`. Ô màu nhóm trước tiêu đề: `:174-177` (`<span … size-3.25 … tone.bg>`) — mockup bỏ (12/11).
  Meta "N từ · tạo ngày … · M đã thuộc": `:167-173` (`App.group.meta|metaMastered|metaNoDate`).
- Chip hôm nay (ưu tiên/đến hạn/mới): `:178-194`, `App.group.chipPriority|chipDue|chipNew`.
- Thanh tiến độ: `StageBar` (`src/ui/StageBar.tsx:19-54`) dùng ở `GroupPage.tsx:195-210` với `rhythm(summary.cells)`; **mọi đoạn cùng
  một màu nhóm** (`tone: tone.bg`), rộng ∝ số từ của ngăn, phần tô ∝ số đến hạn. Nhãn dưới thanh dùng `truncate font-wm-mono`
  (`StageBar.tsx:48`) — đây cũng là nguyên nhân chỗ 5.
- Chip lọc: `GroupPage.tsx:147-153` (danh sách), `:247-267` (render). Nhãn: `App.group.filterAll|filterPriority|filterDue|filterNew`,
  `App.group.filterStage = "Ngăn {stage}"` với `App.stages.s1…s30` ("1 ngày"…). Chip chọn: nền `wm-ink` (`:259`), không màu theo mức.
  Số đếm: `filterCount` (`:43-50`). `WordFilter = 'all'|'priority'|'due'|'new'|'stage-1..5'` (`groups-api.ts:51`).
- Danh sách từ: `<ul>` dạng dòng, `WordRow` (`GroupPage.tsx:353-436`): lemma (link), pos, nghĩa, chấm ngăn + `App.group.stageChip`
  (`:400-403`), trạng thái (`:363-369`, `:404`), nút ×. Không có hàng tên cột.
- Màu ngăn: `STAGE_DOT` lặp ở 7 file (`GroupPage.tsx:53`, `today/TodayPage.tsx:256`, `word/LearningBlock.tsx:16`,
  `add-word/GroupPicker.tsx:120`, `practice/CustomizeDialog.tsx:58`, `practice/session/AnswerFeedback.tsx:14`,
  `practice/WeakWordsPage.tsx:26`); token `--color-wm-stage-{0..5}-{bg,dot,ink}`, `stage-5-solid` ở
  `packages/design-tokens/web.css:213-232` và `web-dark.css:34-` (dark ghi "polish round replaces stage colours with level colours").
  Mockup: `--lv0..lv5`, `--lv-pri`, `--lv-due` sáng/tối (mockup L79-80, L94).
- `level` trong kiểu API: SRS là số (`GroupItem.level`, `Card.level`, `cells[].level` ở `groups-api.ts:18,42,60`); **CEFR cũng tên `level`**
  nhưng là chuỗi (`Card.content.level`, `TopicSuggestion.level`, `BulkBody.level` ở `groups-api.ts:69,83,88`). Nhãn ngăn lấy qua
  `STAGE_KEYS = ['s0','s1','s3','s7','s14','s30']` (`groups/stages.ts`), dùng ở 10 file.
- Mọi chỗ "ngăn" trong `vi.json` (34 khóa): `App.auth.showcase.stage`, `App.today.stagesTitle`, `App.calendar.day.known|again`,
  `App.group.filterStage|stageChip`, `App.backlog.relearned|explain`, `App.review.doneBody|stampReview|stampKnow`, `App.word.stage|stageTag|stageBar`,
  `App.addWord.bulkNote`, `App.practice.sources.group.body`, `App.practice.sources.weak.body`, `App.practice.customize.stageAll|stageMenu|stageName|stageOption|sorts.level_asc`,
  `App.practice.session.noteWrong|noteKnowEnter|stage|noteKnowTap|noteWrongTap`, `App.practice.weak.cols.stage|cardBody`,
  `App.recall.leveledUp|correctKept|wrongKept|noteLeveled|noteKept`. en dùng "stage"/"box" (`App.auth.showcase.stage = "…-day box"`).
  Trong `src` chỉ còn comment (`TodayPage.tsx:255`, `ui/Select.tsx:23`, `site/landing/Hero.tsx:156`).
- Test: `groups/group-page.test.tsx` — `:98` "nhịp ôn: one segment per stage", `:107` "English names the first stage New",
  `:113` "the page head: the stack, the colour title and the three chips", `:152` meta "đã thuộc" (pin regex `:155`),
  `:158` "rows show the part of speech, the stage, the status", `:168` "filter chips show every stage with its count".
- Gap: bảng có tên cột (Từ vựng, Loại từ, Nghĩa, Bậc, Trạng thái), thanh và chip tô theo màu mức, chip 36 px với ô số riêng,
  "Mới, Bậc 1–5", bỏ ô màu trước tiêu đề.

## 3. Hôm nay

- `today/DeckRow.tsx:10-46` chỉ đo cột; chữ "đã thuộc" nằm ở `GroupStack` size `today` (`TodayPage.tsx:245` → `GroupStack.tsx:48`).
  Hero cũng in `App.today.heroLine = "nhóm có {total} từ · {mastered} đã thuộc"` (`TodayPage.tsx:115`); mockup hero ghi "48 từ".
  Test pin: `today/today.test.tsx:57,78` (heroLine), `group-pieces.test.tsx:21`.
- "Lần luyện gần nhất": `TodayPage.tsx:144-197`. Dòng "Sai: …" = `App.today.lastWrong` (`:187`). Test: `today.test.tsx:81`
  ("sessions/last 200: score, wrong words…", pin `:86`), `:109` (không có dòng Sai khi rỗng, `:116`).
- "N từ theo ngăn": `TodayAside` `TodayPage.tsx:259-316`, ô màu `STAGE_SQUARE` (`:256`), khóa `App.today.stagesTitle|stagesHint`,
  nhãn `App.stages.*`. Test: `today.test.tsx:184` "words by stage: due / total per stage".
- Gap: bỏ "đã thuộc" ở card (và có thể hero), bỏ dòng "Sai: …", khối ngăn → "48 từ theo bậc" với màu `lv` và tooltip "ôn lại sau N ngày".

## 4. Học (`features/learner/review/`)

- Màn: `review/ReviewSession.tsx:31-209`; chồng thẻ `CardStack.tsx` (276 dòng; mặt thẻ `FACE` `:173`, gợi ý lật `:212-213`
  `App.review.hintWeb|hintPhone`, dấu kéo `Stamp` `:155-171` với `App.review.stampReview|stampKnow`); kéo `useCardDrag.ts` (ngưỡng 110 px
  `:46`, nghiêng `x·0.055` tối đa 14° `:85`, vuốt nhanh 0,55 px/ms); motion `src/lib/stack-motion.ts` (`dissolve` phóng 1,22 + blur 18/12 px,
  `arrive` từ blur 10 px).
- Hai đống: `review/Pile.tsx:15-44` (nhãn có icon ‹/› `:29-32`, số lớn, 5 chip `WordChip` mới nhất). Bố cục: lưới 3 cột desktop
  `ReviewSession.tsx:121-140` (đống trái/phải `md:pt-10`); **phone: 2 đống ở hàng trên, thẻ ở dưới** (`grid-cols-2`, thẻ `col-span-2`).
- Nút: `ReviewSession.tsx:150-166` + `AnswerButton` `:215-239`. "Cần ôn lại" = secondary chữ đỏ, "Đã biết" = `BUTTON_VARIANT.pass`
  (nền xanh đặc), lật = primary `md:min-w-44`; chưa lật thì `aria-disabled` + `opacity-55`. Kbd chỉ từ md.
- Đóng: nút X `size-11` phone / `md:size-9` (36 px) (`:182-196`), `aria-label` = `App.review.close = "Đóng phiên ôn"`.
- Chú thích phím: `KeyLegend` (`:167-176`), nhãn `App.review.flip|stillLearning|know|stop`.
- Toast chuỗi: `showStreak` từ `use-review-queue.ts:82`; render `src/app-ui/StreakToast.tsx:57` cố định giữa đáy (`bottom-28`, `md:bottom-8`).
- Bề rộng: `max-w-5xl` (1024) `ReviewSession.tsx:187,206` (chỗ 16 giữ).
- Test: `review/card-stack.test.tsx` (`:40-89` ngưỡng 120/80 px, vuốt nhanh, dấu ở nửa ngưỡng; `:121,154` reduced motion),
  `review/learn-stack.test.tsx` (`:44` Space lật, `:55` nhấn 2 khi chưa lật, `:149` đống), `review/review-session.test.tsx`
  (`:234` streak toast, `:123` progress, `:141` focus về [Lật thẻ]).
- Gap: X 32 px; chồng thẻ cao hơn (cách thanh đầu ~20 px); toast góc phải dưới X; ba nút cao 40 px chữ 14 px, "Know" chữ xanh nền
  trắng (bỏ nền xanh đặc); nhãn đống không mũi tên; phone: đống dưới thẻ, hai nút vuông chỉ icon (`aria-label`), không chip rơi vào
  đống, không phím tắt; chữ tiếng Anh (§6).

## 5. Phiên luyện (`practice/session/`) và Ôn

- Khung: `PracticeSession.tsx:41-226`; câu hỏi `Question` `:262-397`. Thanh phiên `:171-201`, X `size-11`/`md:size-9` `:165-179`.
  Bề rộng `max-w-190` (760) / tổng kết `max-w-220` (`:163`, chỗ 16 giữ 760).
- Card câu hỏi: `QuestionCard.tsx:27-58`. Chip loại câu `t('kind.*')` trong `<span className="lowercase">` (`:42-44`, viết thường bằng CSS —
  quyết định mới: viết hoa chữ đầu trong file chữ, không CSS). Chip "câu AI" `App.practice.session.aiChip` (`:45`).
  Dòng hướng dẫn: `:54` `App.practice.session.ask.*` (`ask.cloze`/`ask.type_sentence` = "Gõ từ còn thiếu, đúng dạng trong câu",
  `ask.type_meaning` = "Gõ từ tiếng Anh có nghĩa này"). Test pin `ai-questions.test.tsx:78`.
- Câu: `SentenceQuestions.tsx:23-54`. Trước khi trả lời là một `<p>` có `___`; ô nhập **tách riêng** dưới câu (`TypeWordInput`,
  `TypeWordQuestion.tsx:85-134`, gắn ở `PracticeSession.tsx:340`). Sau kết quả chữ vào chip trong câu (`blankFill` `:251`, `Chip` sai gạch
  ngang nét đứt). Ô nhập giữ chữ đã gõ, `readOnly` khi `final` (`TypeWordQuestion.tsx:92,116`).
- Panel "Chưa đúng": kết quả cuối `AnswerFeedback.tsx:29-133` (đáp án ở `revealLine` "{lemma} · {meaning}" bên phải tiêu đề, `:97-100`;
  nền `bg-wm-wrong-soft border-wm-wrong-line`, `:88`); thử lại `TryAgainPanel` `TypeWordQuestion.tsx:141-178`. Cả hai `-mt-6.5 … pt-11`
  nhét dưới card.
- "AI dịch": trong `AnswerFeedback.tsx:120-129` (sau trả lời, chỉ `locale === 'vi'`), nhãn `App.practice.session.translation`
  ("Bản dịch") + `Tag` `translationAi`. Dữ liệu `result.translation` (`use-practice-session.ts:57`), API chỉ trả sau khi trả lời
  (`src/practice/practice.types.ts:51-52`). Test: `ai-questions.test.tsx:197` ("Bản dịch · AI dịch"), `:206` (en không có khối).
- Gợi ý: `HintPanel.tsx:22-79`, lưới `sm:flex-row` cột nhãn `sm:w-44` (`:55-57`), chấm tiến độ ở phải tiêu đề (`:44-48`), nút
  "Mở gợi ý N" thay chỗ nội dung (`:64-71`). Khóa `App.practice.session.hint.*` (`progress` vi "Gợi ý {opened}/{total}", en "Hint").
  Chữ cái đầu: xem §0 mục 2.
- Ôn: `CompareLine` (`recall/CompareLine.tsx`) hiện **dưới** panel (`PracticeSession.tsx:355-360`), khóa `App.recall.compare.*`.
- Chú thích phím: `KeyLegend` ở cuối cột `mt-auto pt-4` (`PracticeSession.tsx:203-206`, `legendItems` `:228`), nhãn `App.practice.session.legend.*`.
- "Xong N từ": Ôn `App.recall.doneTitle` (`RecallSummary.tsx`), luyện `App.practice.session.summary.title` (`SessionSummary.tsx`).
- Test: `practice-session.test.tsx` (`:377` K/64 try_again, `:399` "H opens the next hint; vi says Gợi ý 1/2", `:414` en no total),
  `ai-questions.test.tsx` (`:123` hint list, `:136` CS20, `:164` CS3 "Chưa đúng"), `session-screen.test.tsx` (`:65-84` chip AI, `:143,164`
  phím và legend), `recall/recall-session.test.tsx` (`:80-122` lịch, `:166` GM19 compare line).
- Gap: bỏ dòng hướng dẫn; ô nhập nằm trong câu (input inline đo bề rộng, Enter thay tại chỗ); "AI dịch" thành khối riêng dưới câu
  trong card; panel "Chưa đúng" đáp án thành dòng lớn dưới tiêu đề, khoảng 16 px; Ôn: "bạn gõ / đáp án" thay ô gõ trong card;
  legend giữa, ngay dưới panel; ô Gợi ý lưới ba cột, "Hint 1 of 2"; chữ cái đầu `e_______`.

## 6. Ngôn ngữ chữ trong phiên

- Locale: route `/[locale]`; `src/i18n/request.ts:7-18` nạp `messages/${locale}.json`; `src/app/[locale]/layout.tsx:54` provider
  `messages={null}`; app bọc `AppIntl` (`src/app-shell/AppIntl.tsx:6-9`, chỉ gửi `App`) ở `src/app/[locale]/app/layout.app.tsx:18`.
  Layout phiên: `src/app/[locale]/app/(member)/(focus)/layout.app.tsx` (server component, chỗ đặt provider lồng nếu chọn).
- Namespace phiên đang dùng: `App.review` (4), `App.recall` (4), `App.recall.compare`, `App.practice.session` (11) và con `.ai` (5), `.hint`,
  `.report`, `.round`, `.summary`, `App.practice`, `App.stages` (2), `App.deck` (3), `App.group`, `App.common` (3), `App` (gốc, 2),
  cộng chung: `App.streak` (`StreakToast`), `App.calendar.fab` (`CalendarBarButton`), lỗi `useErrorMessage`.
- File phiên gọi `useLocale()`: `review/ReviewSession.tsx`, `ReviewSummary.tsx`, `practice/session/{AlternativeFeedback,AnswerFeedback,
  PracticeSession,SessionNotice,SessionSummary}.tsx`, `recall/{RecallSession,RecallSummary}.tsx`, `app-chrome/CalendarBarButton.tsx`,
  `app-shell/format.ts`.
- Hướng làm (để chốt ở plan): (a) provider lồng chỉ thay `messages.App` bằng bản en, giữ `locale` vi — link và khối dịch giữ nguyên nhưng
  plural sai (§0 mục 4), cần `{count, plural, other {…}}` hoặc tách chuỗi số ít; (b) namespace mới (vd `App.session.*`) viết tiếng Anh ở cả
  `vi.json` và `en.json` — không đụng locale, nhưng trùng chữ hai file; (c) provider lồng `locale='en'` + truyền locale route riêng cho link.
  Hộp Lịch mở từ phiên cũng sẽ đổi theo provider. `getMessages({ locale: 'en' })` có trong `next-intl/server` (**ASSUMPTION**: chưa chạy thử).
- Test: ~475 dòng chuỗi tiếng Việt trong test phiên (`review-session` 85, `learn-stack` 11, `recall-session` 50, `practice-session` 152,
  `ai-questions` 71, `ai-states` 51, `session-screen` 55). Script `scripts/check-message-keys.mjs` (+ `message-keys-allow.json`) tìm khóa không dùng.

## 7. Tô từ đích và câu lọc Tra từ

- Ba cách tô đang có:
  - `groups/highlight.tsx:9-22` `highlightWord`: `<mark bg-transparent font-semibold text-primary>` — `text-primary` là token landing cũ, không
    `wm-`. Dùng ở `review/CardStack.tsx:10`, `add-word/AddSentenceSheet.tsx:16`.
  - `lookup/DictionaryPage.tsx:133-150` `marked`: nền vàng `bg-wm-mark text-wm-mark-ink`. Dùng ở Tra từ (`:112`), `LiftedCard.tsx:34`,
    trang từ (`word/WordPage.tsx:311`, `SenseBlock.tsx:68`, `SavedSentencesDialog.tsx:78`).
  - Câu luyện: `SentenceQuestions.tsx:48` `<strong font-extrabold underline decoration-wm-accent>` (gạch navy).
  - Khác: `AiLookupResult.tsx:119-127` `marked` riêng (vàng), `AddWordSheet.tsx:386` (vàng), `AuthShowcase.tsx:81-83` `Mark` (vàng).
  - Mỗi hàm có regex riêng (highlight: `\b(word)[a-z]*\b`; marked: bỏ `e` cuối rồi `\w*`).
- Câu lọc: `lookup/LookupFilters.tsx:14-46` dùng `t.rich('summary', { lv, tp, ps })`; mỗi giá trị là `FilterMenu` (`:50-79`) = nút
  react-aria chữ accent gạch chân, mở `Menu` trong `Popover`. Khóa `App.lookup.summary|level|topic|pos|all`. Test `lookup.test.tsx:62,69`.
- Gap: mọi câu ví dụ (cả Tra từ) in đậm gạch chân, gộp một hàm; nền vàng chỉ còn ở phần bấm được của câu lọc.

## 8. Trang một từ

- Phát âm + dạng chia: `word/WordPage.tsx:166-176` (`PosReading` `:183-212`: nhãn pos `{pos}` thô `:197`, UK/US `md:gap-x-6`;
  `FormsLine` `:173`). Không có đường kẻ bao quanh; tab ngay dưới (`Tabs` `:223-255`, gạch dưới `border-b border-wm-line`).
- "unspecified": hằng `PRIVATE_POS_UNSET = 'unspecified'` (`apps/api/src/content/content.constants.ts:36`), `AI_POS_UNSET`
  (`apps/api/src/ai/ai.constants.ts:78`). Web in thẳng `pos` ở `WordPage.tsx:197`, `LearningBlock.tsx:52`, tiêu đề khối nghĩa
  (`MeaningsOfPos` `WordPage.tsx:257-`), và câu dẫn hộp 2 (theo audit). Không có khóa dịch pos.
- Nhãn ngăn bị cắt: `LearningBlock.tsx:54-59` → `StageBar` nhãn `truncate font-wm-mono` (`ui/StageBar.tsx:48`); tiêu đề khối viết thường
  bằng CSS (`LearningBlock.tsx:47`). Khóa `App.word.learningTitle|stageBar|stageTag|nextReview`.
- Test: `word/word-page.test.tsx`, `word/my-word.test.tsx`.
- Gap: cụm UK/US + dạng chia giữa hai đường kẻ (ink 16%), UK/US gần nhau; pos thật hoặc ẩn khi `unspecified`; nhãn "Mới, Bậc 1…5" đủ chữ
  + "ôn lại sau N ngày".

## 9. Luyện tập và Từ hay sai

- "Gần đây": `practice/PracticePage.tsx:249-289` (`Recent`, `useRecentHistory(3)`, `App.practice.recent.*`), gắn ở aside `:200-203`.
  Test: `practice-home.test.tsx:285` "Recent: an alternative answer says what was typed".
- Dòng nguồn: `practice/SourceCard.tsx:51-` (ô icon 44 px theo tone `:16-21`, chip, [Tùy chỉnh], nút bắt đầu); danh sách ở
  `PracticePage.tsx:84-170`. Tiêu đề mục `other-sources` `:84` (`font-wm-display text-wm-card-title`), `Recent`/`Shortcuts` dùng
  `text-wm-base` (`:257,301`), `UsageCard` dùng `font-wm-sans text-wm-small-strong` (`:233`) — ba kiểu tiêu đề.
- Từ hay sai: `practice/WeakWordsPage.tsx:59-` dùng `PageColumns aside={…thẻ "Luyện từ hay sai"…}`; `app-chrome/PageColumns.tsx:7-9`
  đặt aside **sau** nội dung dưới 1280 px → trên phone nút nằm dưới cả danh sách (chỗ 10, R99). Test `weak-history.test.tsx:69,83`.
- Gap: bỏ "Gần đây"; một kiểu tiêu đề mục/card; phone đưa thẻ luyện lên dưới tiêu đề (đổi thứ tự hoặc `order` trong `PageColumns`/trang).

## 10. Lưu một từ vào nhiều nhóm

- Web: hộp Thêm từ `add-word/AddWordSheet.tsx`; ô "Lưu vào nhóm" `deckField` `:218-238` (nút mở picker, một tên); state một nhóm
  `deck` `:101` (khóa `lockedGroupId` / `chosenDeck` / `lastGroup` localStorage `last-group.ts`); lưu `save` `:106-142` gửi
  `POST /v1/quick-add` với `group_id` (Idempotency-Key `${key}:add`, `useSubmitOnce`); toast + `writeLastGroup` `:170-174`.
- Picker: `add-word/GroupPicker.tsx:31-90`, `DeckList` `:92-` là `role="radiogroup"` + `<input type="radio">` (`:96,108`), dải 6 ngăn
  `STAGE_FILL` (`:120-133`). (Khác `groups/GroupPicker.tsx` = bộ chọn phím F ở trang Nhóm.)
- Trang từ "Thêm vào nhóm khác": `add-word/DeckPickerDialog.tsx:49` gọi `POST /v1/groups/${target}/items` một nhóm.
- API quick-add: `apps/api/src/learning/quick-add/quick-add.controller.ts:18-36` (zod `strictObject`, `group_id: uuid` bắt buộc,
  `sense_id` XOR `new_word`), `@Idempotent` + `IdempotencyInterceptor` + `@RateLimit('user.write')` (`:43-48`). Service
  `quick-add.service.ts:54-84`: một transaction, `withLearnerLock`, `assertOwned`, tạo private sense, `items.linkInTx` (`:74`), câu.
- `POST /v1/groups/:id/items`: `apps/api/src/learning/items/items.controller.ts:31-41`, body `addItemBody = { sense_id }`
  (`items.schemas.ts:9`); `items.service.ts:59-67` → `linkInTx` `:73-85` (đã có → không đổi; nhóm đầy `itemsPerGroup` → 409 `group-full`).
- Giới hạn ghi: `user.write` 30 lần/60 s theo user (`apps/api/src/common/config/app-config.ts:176`), chung cho mọi endpoint ghi.
  Idempotency theo `request.path` (`common/idempotency/idempotency.interceptor.ts:62`) → mỗi nhóm một khóa riêng.
- `ItemState.group_ids[]`: `word/word-api.ts:30`; dùng ở `LearningBlock.tsx:42`, `WordPage.tsx:82`, `lookup/LiftedCard.tsx:24`,
  `LookupPage.tsx:106`, `groups/TopicPickerPage.tsx:32,93`.
- Test: `add-word.test.tsx:51,132,148,179,186,200`; `locked-add-word.test.tsx:111-225`; `m3-review.test.tsx:114,169`;
  `m4-overlays.test.tsx:93` (ô màu + dải 6 ngăn mỗi dòng); API `quick-add.controller.spec.ts`, `quick-add.service.spec.ts`.
- Hai cách (chốt ở plan): `group_ids` (thêm trường, lặp `linkInTx` trong tx, một lần ghi, nguyên tử, cần đổi zod + spec) hay web gọi quick-add
  rồi `POST /groups/:id/items` cho nhóm còn lại (không đổi API, n lần ghi, lỗi giữa chừng để lưu một phần, cần báo nhóm nào lỗi).

## 11. Hộp Thêm từ 4 (Tra bằng AI) hai cột

- `AddWordSheet.tsx:355-356` ô Từ và ô Câu full width; `:369-376` `AiLookupResult`; hộp `size='xl'` khi có kết quả (`:507`).
  Hai cột bắt đầu trong `add-word/AiLookupResult.tsx:24-25` (`md:grid-cols-[minmax(0,1fr)_18.75rem]`), thẻ xem trước `:72-`.
- Test: `ai-lookup.test.tsx`, `m5b-review.test.tsx`, `edit-suggestion.test.tsx`.
- Gap: cột trái = ô nhập + kết quả, cột phải = thẻ xem trước ngang ô Từ ở đầu hộp → lưới phải nâng lên `AddWordSheet` (view `find`).

## 12. Đăng nhập / Đăng ký

- `auth/SplitFrame.tsx:16-34`: panel `AuthShowcase` chỉ từ 1280 px (`hidden w-160 xl:block`), `ngan` (đăng nhập) hoặc `de12` (đăng ký).
- `auth/AuthShowcase.tsx:12-112`: tĩnh, không motion; `aria-hidden`; chip nền `Chip` vị trí tuyệt đối (`:19-21`; "negotiate" `bottom-1/3 left-14`,
  chip nền `bg-wm-bg` + `shadow-wm-row` + chữ đậm `:85-92`) — bị thẻ đè ở 1440 (chỗ 20); đường ôn SVG `ReviewPath` `:95-111`; thẻ
  từ `WordCard` dùng `App.auth.showcase.stage` ("Thẻ từ · ngăn N ngày").
- Ô nhập trên mesh (chỗ 21): `AUTH_CARD` (`app-chrome/CardFrame.tsx:10-11`) bị tắt nền/viền từ xl (`SplitFrame.tsx:25`
  `xl:border-0 xl:bg-transparent`); ô `FIELD_BOX` viền `border-wm-line` (`ui/field-styles.ts:4-7`) = `#e1e5ee` sáng / `#2a3044` tối
  (`packages/design-tokens/web.css:11`, `web-dark.css:11`). Quầng `auth-card-glow` `xl:hidden` (`SplitFrame.tsx:24`, CSS `globals.css:448-453`).
- Test: không có unit test cho `AuthShowcase`; e2e `e2e/auth-layout.spec.ts:5-17` (panel từ 1280, card giữa khi hẹp).
- Gap: panel nền đậm hơn, kể vòng học có motion (5 từ thay nhau, thẻ luyện gõ, "Đúng · lên Bậc n", số đến hạn giảm); chip nền mờ dưới thẻ;
  viền ô rõ, quầng thấy được. Motion mới phải có nhánh reduced motion.

## Ghi chú chung

- Chữ mono: `--font-wm-mono` = JetBrains Mono (`src/app/globals.css:16`), 101 chỗ `font-wm-mono` trong 49 file `.tsx`; quyết định bỏ.
- Viết thường bằng CSS `lowercase`: 7 chỗ (vd `QuestionCard.tsx:42`, `LearningBlock.tsx:47`, `TypeWordQuestion.tsx:125`, `WeakWordsPage.tsx:150`).
- Ảnh chụp M9: `e2e-shots/` + `playwright.shots.config.ts` (`pnpm shots`).
- Chưa kiểm: không chạy app hay test; mọi gap so với mockup đọc từ HTML/JS mockup, không đo bằng ảnh.
