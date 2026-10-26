# Code facts cho design nhóm A của đợt cải thiện (26/10/2026)

Đọc trên nhánh `feat/giao-dien-nguoi-hoc-m5b` (HEAD `d83146d` + thay đổi chưa commit), 26/10/2026, bằng hai agent chỉ đọc; không đọc `.env`. Mọi `path:line` là
của bản đó. Câu hỏi và quyết định: [`../superpowers/reviews/2026-10-26-dot-cai-thien-questions.md`](../superpowers/reviews/2026-10-26-dot-cai-thien-questions.md).

**Phát hiện lề (Claude kiểm lại bằng đọc code, chưa chạy):** web hiện nút "Xem đáp án" cho câu điền từ **trước lần thử đầu**
(`apps/web/src/features/learner/practice/session/PracticeSession.tsx:279-284`, chú thích "K/78a: an AI cloze can be given up before any try"), nhưng API từ chối
bỏ qua khi `item.tries === 0` (`apps/api/src/practice/answers/answers.service.ts:96`, 409 `skip-not-allowed`). Unit test web không bắt được vì mock route skip
(`ai-questions.test.tsx:82-86`).

---

## Phần 1 — Luyện tập, trang nhóm, tấm Thêm từ, phát âm

### A. Điền từ từ câu đã lưu (`cloze_source: own`)

1. **Parse và chặn gói Miễn phí**
   - `apps/api/src/practice/sessions/sessions.controller.ts:25`: `cloze_source: z.enum(['ai', 'own']).optional()`; refine `:27-29` chỉ cho khi `types` có `cloze`, sai thì 400.
   - `sessions.service.ts:103`: `clozeSource = types.includes('cloze') ? input.cloze_source ?? 'ai' : null`; lưu `:150`, trả trong view (`session-views.ts:12,30`).
   - Chặn: `aiPlanner.gate(...)` ở `sessions.service.ts:105`, chạy trước khi đọc từ. `ai-session-planner.service.ts:42-44`: có một trong
     `cloze`, `meaning_in_sentence`, `mcq_sentence` mà `features['ai.practice'].allowed` false → `refusalProblem({ reason: 'plan-required' })` → 403
     `entitlement-required` (`entitlements/refusal.ts:11-12`). **Cloze `own` bị chặn y như cloze AI.** Test `ai-session-planner.service.spec.ts:61-65` (B7E1).
   - Giữa phiên: `sessions.service.ts:483-488` (`ruleTypesOf`) bỏ `cloze` nếu `ai.practice` không còn được phép; test `sessions.ai.spec.ts:325` (B7E123).
2. **Chọn câu `own`**
   - Nguồn: `ContentService.listSentences` (`content/content.service.ts:185`), bảng `contextSentence` theo `userId` + `senseId`, cũ trước (`content/sentences/sentences.service.ts:60-70`).
   - `practice/questions/question-builder.service.ts:89-90,110`: `ownSentence = sentences.some(text => maskExample(...) !== null)`.
   - `practice/questions/question-types.ts:29`: cloze dùng được khi `clozeSource === 'own' ? ownSentence : aiBase`. Chỉ cần một câu đã lưu che được từ
     (`content/practice/mask-example.ts:44`); không cần nghĩa tiếng Việt; bỏ qua kiểm "word not recognized". Test `question-types.spec.ts:56`.
   - Dựng câu: `question-builder.service.ts:131-144` chọn ngẫu nhiên một câu đã che, gọi `ownSentenceQuestion` (`practice/ai/ai-question.ts:94-106`);
     `translation_vi` null; gợi ý: chữ đầu → định nghĩa → nghĩa tiếng Việt.
   - Từ không có câu dùng được: cloze không áp cho từ đó; không kiểu nào hợp thì bỏ từ (`sessions.service.ts:126-131`); không còn từ nào → 409
     `practice-no-words` `reason: 'no-word-fits-types'` (`:133`), web hiện `App.practice.noWords.no-word-fits-types` (`use-practice-starter.tsx:95-97`).
3. **Không tốn lượt AI, không gọi AI:** `practice.types.ts:17-18` `isAiType('cloze','own')` false; `gate` trả ở `ai-session-planner.service.ts:46`; `plan` →
   `aiPlanned: 0` (`:61`); dựng qua đường luật với `source: 'own_sentence'` (`sessions.service.ts:646`). Test `ai-session-planner.service.spec.ts:67`, `:138`
   (B7E4). Câu này không báo lỗi được (`session-views.ts:45-46`; `reports.service.ts:101` 409).
4. **Web `CustomizeDialog.tsx`**
   - Công tắc AI: `<AiTypesToggle …/>` (`:199`), định nghĩa `AiTypesToggle.tsx:68-100`: `Switch` + nhãn "Pro", `locked={!allowed}`; bật thì hiện ba `TypeBox`
     cho `AI_TYPES` và dòng lượt (`:88-96`); nhớ trong localStorage `wordmet-web.ai-types` (`:10-27`).
   - Gói Miễn phí: `aiAllowed = features['ai.practice'].allowed && aiProblem?.kind !== 'locked'` (`:81`); không gửi kiểu AI nếu không được (`:106`);
     `Switch locked` dùng `aria-disabled`, vẫn bấm được, hiện `App.ui.lockedLine` (vi.json:287); 403 → `{kind:'locked'}` (`use-practice-starter.tsx:32-33`),
     nạp lại quyền (`:91`), hiện `<LockedFeature/>` (`CustomizeDialog.tsx:200`).
   - Thân request: `start()` (`:139-150`) → `POST /v1/practice/sessions` (`practice-api.ts:139-154`). **Không bao giờ gửi `cloze_source`**: `StartBody` không
     có trường này (`practice-api.ts:34-42`, chú thích `:13` "cloze is always AI-written (D10)"); test ghim `ai-toggle.test.tsx:83-97`.
   - Thứ tự: khối "Thêm tùy chọn" (`:248-272`), dòng tóm tắt `:260` `customize.orderSummary`, `Select` `:264-269`; `SORTS`, `DEFAULT_SORT` ở
     `practice-api.ts:24`, `:29-31`; danh sách API `sessions.controller.ts:13`.
   - Bản chữ: `App.practice.customize.sorts` ở `apps/web/messages/vi.json:1075-1084`, `en.json:1075`; `aiToggle` vi.json:1087.
5. **Không có API cho biết người học có câu đã lưu trong một phạm vi.** Có: `sentence_count` theo nghĩa ở `GET /v1/words/{lemma}`
   (`content/words/words.service.ts:144-148`); `GET /v1/senses/{id}/sentences`; toàn bộ câu trên mỗi thẻ của `GET /v1/groups/{id}/queue?mode=all|due`
   (`content.sentences`, `learning/queue/queue.service.ts:93-104`; web `groups-api.ts:62`). Web chỉ có sẵn cho phạm vi nhóm (`useGroupQueue(id,'all')`,
   `GroupPage.tsx:82`); Hôm nay / tất cả / từ hay sai / ưu tiên: không có. API chỉ đếm câu `maskExample` che được, nên đếm ở trình duyệt có thể dư.

### B. Các nút sau khi trả lời

6. **Phím, lời gọi, trường**
   - Phím `PracticeSession.tsx:47-106`; kết quả cuối (`:82-87`): `1` → `review('needs_review')`; `2` → `review('known')` chỉ khi `show_known`; `Enter` →
     `next()`. Bỏ qua khi có alt/ctrl/meta, đang báo lỗi, trong dialog (`:51-53`), trong ô nhập (`:70`), Enter/Space trên nút hay link đang focus (`:71`).
   - `AnswerFeedback.tsx:42-63`: Cần ôn lại (1), Đã biết (2, chỉ với `show_known`), Câu tiếp (Enter); lưới 3 cột khi có `show_known`, không thì 2. Màu:
     Cần ôn lại `sticker` khi `highlight_needs_review || !show_known`; Đã biết `sticker` trừ khi `highlight_needs_review`; Câu tiếp luôn `quiet`. Ghi chú `:21`
     chọn `noteWrong` / `noteRight` / `noteHint` (khi `hint_level>0`) / `noteRightNoKnow`.
   - Lời gọi (`use-practice-session.ts`): `onReview` (`:281-287`) `POST /v1/practice/items/{item}/review {action}`, xoá cache `groups`, rồi
     `POST /v1/practice/sessions/{id}/next`; `onNext` (`:288-291`) chỉ `POST …/next` (`advanceNow` `:172-197`).
   - Gợi ý: `hint_level` từ kết quả API (`:244`); `HintPanel` `POST /v1/practice/items/{id}/hint {level}` (`HintPanel.tsx:31`).
   - "Xem đáp án": trước lần thử, chỉ cloze (`PracticeSession.tsx:279-284`); sau câu gõ sai: `TryAgainActions` (`TypeWordQuestion.tsx:82-84`, nối ở
     `PracticeSession.tsx:264`); cả hai gọi `POST /v1/practice/items/{id}/skip` (`use-practice-session.ts:274-279`). API chỉ cho skip với `type_word`/`cloze`
     **và** `tries > 0` (`answers.service.ts:96`) → xem phát hiện lề ở đầu file.
   - API (`answers.service.ts:151-152`): `show_known = learningItem !== null && correct && hintLevel === 0 && learningItem.due_now`;
     `highlight_needs_review = learningItem !== null && !correct`; `due_now` = `isDueNow` (`learning/practice/practice-reads.service.ts:109`).
   - 409 `known-not-allowed`: (1) `practice/reviews/practice-reviews.service.ts:46-48` (chưa có hành động, action `known`, `show_known` tính lại false);
     (2) `learning/practice/practice-review.service.ts:64-66` (`known && !wasDue`, map ở `practice-reviews.service.ts:104`). `wasDue = priority || level===0 ||
     dueDate<=today` (`learning/schedule/schedule.ts:31-33`). Lỗi khác: `item-void`, `not-answered`, `review-already-set` (`:43-45`), `not-in-learning` (`:103`);
     bấm cùng hành động hai lần an toàn (`practice-review.service.ts:47-55`).
   - `needs_review`: `schedule.ts:39-40` `{ level: 1, dueDate: today, priority: true }`; log `groupId: null` (không tính vào giới hạn ngày), `origin:'practice'`,
     `rating:'Again'` (`practice-review.service.ts:74-80`). `known` khi đến hạn: level+1, hạn mới hôm nay + `[1,3,7,14,30][level-1]`, bỏ ưu tiên
     (`schedule.ts:41-43`; `learning.constants.ts:2-3`).
7. **Test đang ghim ba nút**
   - `apps/web/src/features/learner/practice/session/practice-session.test.tsx`: fixture `:45`; `:101-118`, `:135-152`, `:154-174`, `:220-245`, `:314-328`,
     `:341-349`, `:351-362`.
   - `ai-questions.test.tsx`: fixture `:38-42`; `:82-86` Xem đáp án trước lần thử; phím 1 `:93,120,132,158`. `ai-states.test.tsx:169-183`. `ai-toggle.test.tsx:83-97`.
   - `apps/web/e2e/app/m4.spec.ts`: fixture `:34-37`; mock review `:99`; `show_known:false` `:105`; phím 2 `:162`; Enter `:164,:180,:184,:187,:322`; bấm Câu
     tiếp `:170,:189,:325`; phím 1 `:320`; tổng kết `:191-192`; thân start `:150`.
   - `apps/web/e2e/app/m5a.spec.ts`: fixture `:24-25`; types `:86`; Câu tiếp/Next `:191,:195`; Enter `:126,:190`; công tắc khoá gói Miễn phí `:121-129`.

### C. Thêm từ từ trang nhóm

8. **`GroupPage.tsx`**: thẻ trái `:101-137` (tên, dòng phụ, chip ưu tiên / đến hạn / mới, link ôn hoặc "học tất cả" `:113-122`, `DeckMenu` ⋯ Đổi tên / Học tất cả
   / Xoá `:175-197`, biểu đồ ngăn, link "lâu chưa ôn"); tiêu đề "tất cả từ" + `Select` lọc `:141-153`. **Không có nút thêm từ**; `AppShell variant="sub"` không
   `fab` (`:57`), nên thanh trên có Thêm từ và phím N vẫn chạy (`app-chrome/AppShell.tsx:40,68`), nhưng điện thoại không có nút +. Nạp: `useGroup` →
   `GET /v1/groups/{id}`; `useGroupQueue(id,'all')` → `GET /v1/groups/{id}/queue?mode=all`, mọi thẻ trong một lần, không phân trang (`groups-api.ts:117-124`;
   `queue.service.ts:78-79`); `useAllGroupItems` lặp `GET /v1/groups/{id}/items?page_size=100` (`groups-api.ts:127-145`); lọc ở trình duyệt (`GroupPage.tsx:97`).
   Làm mới: `refresh(id)` xoá cache `['groups']`, `['group', id]` (`groups-api.ts:164-167`).
9. **Tấm Thêm từ**
   - Mở: `add-word-context.tsx:6` `{ open: (word?: string) => void }`, `useAddWord().open(word?)` (`:34`); provider gắn `<AddWordSheet initialWord onClose/>`
     (`:29`); phím N (`:14-23`). Nơi gọi: `TopBar.tsx:21`, `AppShell.tsx:112` (FAB), `WordPage.tsx:136`, `QuickAddBox.tsx:10`, `LookupPage.tsx:111,153,163`.
   - **Chưa đặt sẵn / khoá được nhóm**: props chỉ `{ initialWord?, onClose }` (`AddWordSheet.tsx:39`); `chosenDeck` là state trong (`:59`); nhóm =
     `chosenDeck ?? lastGroup` (`:89`), `lastGroup` đọc một lần từ localStorage khi mở (`:60`; `last-group.ts:2-18`, key `wordmet-web.last-group`). Gọi
     `writeLastGroup(id)` trước `open()` thì chọn sẵn được nhưng không khoá. `GroupPicker` controlled: `{ groups, value, onChange, onCreate, onUnmatched?, recentId }`
     (`GroupPicker.tsx:10-19`).
   - Lưu xong: `writeLastGroup`, toast `App.addWord.saved` "Đã lưu từ “{word}” vào nhóm “{group}”." (vi.json:782), xoá cache `groups`, `group`, `items`, `word`,
     `words`, `lookup`, rồi `onClose()` (`AddWordSheet.tsx:155-158`). Lỗi ở lại trong tấm: `private-word-exists`, `group-full`, `private-word-limit-reached`,
     `sentence-limit-reached` (`:160-165`).
   - Endpoint: `GET /v1/lookup?q=` (`add-word-api.ts:36`); `POST /v1/quick-add` (`group_id` + `sense_id` hoặc `new_word`, `sentence` tuỳ chọn;
     `AddWordSheet.tsx:107-125`); `POST /v1/groups` khi gõ tên nhóm mới (`groups-api.ts:171`); `POST /v1/lookup/ai` (`ai-lookup-api.ts:37`).
   - `BulkAddSheet`: props `{ filter: {level?,topic?,pos?}, onClose }` (`BulkAddSheet.tsx:24`); chỉ mở từ trang Tra từ (`LookupPage.tsx:31,44-50`) khi `canBulk`
     (`:34`: có lọc trình độ / chủ đề / loại từ, không có chữ tìm, không phải "của tôi"); gọi `POST /v1/groups/{id}/items/bulk` với `{level?,topic?,pos?}`,
     **không bao giờ gửi `sense_ids`** (`:37,48`); tạo nhóm mới trước nếu chọn (`:42-46`); xong: `writeLastGroup`, toast `bulkResult` + `bulkSkipped`
     (vi.json:829-830), xoá cache, đóng (`:57-64`).
   - `sense_ids` chỉ dùng ở `TopicPickerPage.tsx:105` (lô 100). Schema API `learning/items/items.schemas.ts:15-16` (1–100, không đi cùng bộ lọc); route
     `items.controller.ts:18`.
   - Thêm một nghĩa: `DeckPickerDialog.tsx:47` `POST /v1/groups/{id}/items {sense_id}`, dùng ở trang từ (`SenseBlock.tsx:103`), toast `App.word.added` / `alreadyIn`.

### D. Phát âm

10. Chưa có `speechSynthesis`, `Audio` hay `<audio>` trong `apps/web/src` (chỉ có kiểu sinh trong `cloudflare-env.d.ts`). CSP ở `apps/web/src/lib/csp.ts`
    (`CSP_INLINE_FALLBACK = true` `:5-6`), chỉ áp ở production (`next.config.ts:13-19,28-31`); không có `media-src` (mọi URL âm thanh rơi về `default-src 'self'`);
    `speechSynthesis` không tải gì nên CSP không ảnh hưởng; không có header `Permissions-Policy`.
11. Chỗ hiện từ: trang từ `WordPage.tsx:67` (`h1`); `SenseBlock.tsx:74-83` (loại từ, nghĩa, định nghĩa, **chỉ ví dụ đầu** `sense.examples[0]` `:83`), nút số câu
    đã lưu `:48-53`; `LearningBlock.tsx:16,39-43` (câu đã lưu đầu tiên); `SavedSentencesDialog.tsx:38-42,72` (cả danh sách). Thẻ ôn `review/Flashcard.tsx`: mặt
    trước lemma `:40`; mặt sau lemma `:53`, nghĩa `:56`, ví dụ `:68-73`, câu đã lưu `:74-83`; phím trong `ReviewSession.tsx:41-52`. Luyện tập:
    `AnswerFeedback.tsx:28` (`revealLine`); lemma câu đúng/sai `PracticeSession.tsx:215`, `QuestionCard.tsx:50-58`; tổng kết `SessionSummary.tsx:128`. Trang nhóm:
    xem trước thẻ `GroupPage.tsx:272`; dòng từ `:328-330`, ví dụ đầu `:334`.

### E. Bản chữ

`apps/web/messages/vi.json` (65.849 byte, 1.395 dòng), `en.json` (62.631 byte, 1.395 dòng), nạp ở `apps/web/src/i18n/request.ts:17`. Chuỗi app dưới `App`
(dòng 222): `App.groups` 524, `App.group` 571, `App.review` 666, `App.lookup` 689, `App.word` 713, `App.addWord` 759, `App.practice` 924,
`App.practice.customize` 1048, `…sorts` 1075, `App.practice.session` 1097. `apps/web/src/i18n/messages.test.ts:20-45`: hai file cùng key, không giá trị rỗng;
chỉ các thẻ `b, hl, terms, privacy`; không "vui lòng", "please", "sorry"; dấu "…" một ký tự trong `App.*`.

---

## Phần 2 — Identity: đăng ký, đăng nhập, nhập mã

**Điều quan trọng nhất:** hôm nay đăng ký và đăng nhập đều cấp **phiên đầy đủ** cho tài khoản chưa xác nhận; đăng nhập, làm mới phiên, `AuthGuard` và các cổng
của web đều không đọc `emailVerifiedAt`. Đây là chủ ý của **D8 Bước 1** ("Đăng ký xong là đăng nhập luôn (trả token), theo K7") và **K7**
(`docs/specs/DECISIONS_2026-10-04.md:25`: "dùng được tính năng Free khi chưa xác minh; kích hoạt trial yêu cầu email đã xác minh"). Quyết định 7b (B) đảo hai
điều này (và lý do của IR2 trong `module-spec-identity-access.md`).

### 1. Đăng ký (`apps/api/src/identity/auth/auth.service.ts:40-82`, `auth.controller.ts:19-29`)

- Thứ tự: chuẩn hoá email, kiểm mật khẩu / múi giờ / ngày sinh / tuổi (41-52); `budget.assertAvailable()` (53); băm mật khẩu (54); `userId = randomUUID()` (56);
  một transaction (59-69): `withUserLock`, `tx.user.create` (không đặt `emailVerifiedAt`), `passwordCredential.create` (67),
  `sessions.startChain(tx, { userId, client, deviceLabel })` (68). Sau khi trả lời: job gửi mail gọi thẳng `otp.issueInTx(tx, userId, 'verify_email')` (76-80),
  **không qua** `limitEmail`, nên mail đăng ký không tính vào `auth.otp.email.*`.
- 409 (70-75): lỗi unique `P2002` → `email-taken`. Không tra trước; tài khoản chưa xác nhận nhận cùng 409 như đã xác nhận. Budget và Argon2 vẫn chạy trước khi
  gặp lỗi unique. Unique: `apps/api/prisma/models/identity.prisma:3`.
- Controller: `@Post('register') @HttpCode(201) @Public() @RateLimit('auth.register.ip', 'mail.ip.daily')` → `writeSession(...)`.
- Trả về (`identity/sessions/session-transport.ts`): body `{ access_token, token_type: 'Bearer', expires_in, refresh_token? }` (6-11), `refresh_token` trong body
  chỉ cho mobile (27-28); web nhận cookie `refresh_token` `{ httpOnly, secure, sameSite: 'strict', path: '/v1/auth' }` (13-15, 23-26). `startChain`
  (`session.service.ts:44-81`) đặt `lastSeenAt`, giới hạn 10 chuỗi phiên.

### 2. Đăng nhập (`auth.service.ts:84-126`; `auth.controller.ts:31-41`)

- `@Post('login') @HttpCode(200) @Public() @RateLimit('auth.login.ip')` → `writeSession`.
- Mật khẩu NFC > 128 ký tự → 401 chung (88-91); `findUnique` kèm credential (92-94, đã nạp `emailVerifiedAt` nhưng không đọc); không có tài khoản → `verifyDummy`
  rồi 401 `invalid-credentials` (95-99); `hasher.verify` ngoài lock (101); transaction + `decideCredential` (105), `ok` → `startChain` (113-115); `account_locked` →
  403 `account-locked` (chỉ khi đúng mật khẩu), còn lại 401 (117-124).
- `decideCredential` (`credential-decision.ts:13-40`): `loginLockedUntil > now` → locked (22); hash đổi → stale (23); sai mật khẩu tăng `failedLoginCount`, tới 10
  thì khoá 15 phút (24-34); đúng mật khẩu mà `status === 'locked'` → `account_locked` (37), không thì reset đếm, `ok` (38-39).
- Làm mới phiên chỉ kiểm `chain.user.status === 'locked'` (`session.service.ts:145, 152`); `AuthGuard` kiểm JWT không đọc DB (`access-token.service.ts:31-48`).

### 3. OTP (`otp.service.ts`, `otp.controller.ts`, `otp.schemas.ts`)

- `POST /v1/auth/otp` (`otp.controller.ts:14-32`): `@HttpCode(202) @Public() @RateLimit('auth.otp.ip', 'mail.ip.daily')`. Body (`otp.schemas.ts:3-6`): union
  `{ purpose: 'verify_email' }` (strict, **không nhận email**) hoặc `{ purpose: 'reset_password', email }`. `verify_email` cần `req.user`, không có → 401
  `invalid-token`. Luôn trả `{}`.
- Nhánh reset chống dò email: `requestPasswordReset` (88-106) chuẩn hoá, `limitEmail`, `budget.assertAvailable()`, việc tra tài khoản để sau khi trả lời; email lạ
  → null. Test `otp.controller.spec.ts:34-50`.
- `requestVerifyEmail` (66-86): nạp tài khoản, `limitEmail(account.email)` (69), mục đích bị khoá → 429 + `Retry-After` (72), budget, transaction, `issueInTx`, gửi
  sau khi trả lời. `limitEmail` (171-174): `auth.otp.email.cooldown`, `auth.otp.email.hourly`.
- `issueInTx` (41-58): bỏ qua khi không có user / không `active` / `verify_email` mà đã xác nhận (44); cửa sổ khoá → null (47); huỷ mã cũ cùng mục đích (48-51);
  mã 6 số; **hạn 10 phút** (`600_000`, dòng 55, viết thẳng, không là hằng số).
- `POST /v1/auth/verify-email` (`otp.controller.ts:34-44`): `@HttpCode(200) @RateLimit('user.write')`, **không `@Public()`**; body `z.strictObject({ code })`
  (`otp.schemas.ts:7`); `verifyEmail(req.user!, code, res)`.
- `verifyEmail` (`otp.service.ts:139-165`): đã xác nhận → 409 `email-already-verified` không kiểm mã (D14); `checkInTx` ok → `emailVerifiedAt: now` (147); khoá →
  429 `rate-limited` + `Retry-After`, mail báo khoá gửi trước (152-155, 160); sai / không có mã sống → 400 `invalid-otp`; đúng → `{ email_verified: true }`.
  **Không cấp phiên.**
- `checkInTx` (109-137): cửa sổ khoá → locked (110-114); mã không khớp `^\d{6}$` → `no_live_code`, không tính (115-116); mã sống = chưa dùng, chưa huỷ, chưa hết
  hạn, `attempts < 5` (117), tức **5 lần thử mỗi mã**; so sánh HMAC timing-safe (120-122); sai thì `recordOtpFailure`
  (`apps/api/prisma/sql/recordOtpFailure.sql`, cửa sổ 24 giờ theo (user, mục đích)); lần sai thứ 21 → khoá 24 giờ, mail báo khoá (130-135).
- Băm: `createHmac('sha256', otpHmacKey)` (167-169); `OTP_HMAC_KEY: secretSchema()` (`app-config.ts:173, 264`).

### 4. Đặt lại mật khẩu: mẫu "email + mã công khai" đang có

- `POST /v1/auth/otp {purpose:'reset_password', email}` → 202 `{}` dù có tài khoản hay không.
- `POST /v1/auth/password/reset` (`password.controller.ts:32-41`): `@HttpCode(204) @Public() @RateLimit('auth.reset.ip')`; body `{ email, code, new_password }`
  (`password.schemas.ts:7-12`); **không trả token**, người dùng đăng nhập lại (design Bước 1 §5).
- `PasswordService.reset` (`password.service.ts:97-129`): kiểm mật khẩu (98); email sai → `invalidOtp()` (100); không có tài khoản → `invalidOtp()` (101-102);
  băm (103); transaction: không `active` → `no_live_code` (108); `checkInTx(..., 'reset_password', code)` (109); ok → upsert credential, `revokeAllForUser`,
  `emailVerifiedAt: current ?? now`, reset đếm sai, bỏ khoá, `mustChangePassword: false` (112-118). **Mọi thất bại → cùng 400 `invalid-otp`** (127).
- Chống dò / đoán: một kiểu lỗi; tra trễ ở bước xin mã; 5 lần mỗi mã; 20 lần sai / 24 giờ / (user, mục đích), lần 21 khoá 24 giờ; `auth.reset.ip` 20/giờ; khi xin
  mã `auth.otp.email.cooldown` 1/60 s, `auth.otp.email.hourly` 5/giờ.
- Hạn chế của mẫu: không có giới hạn theo email ở bước nộp mã; email lạ trả trước bước Argon2 (101-103), nên thời gian trả lời khác nhau.
- Web: `ForgotPasswordForm.tsx:26-27` xin mã rồi sang `/app/reset-password?email=...` (**email nằm trong query string**); `ResetPasswordForm.tsx:26-34` đọc
  `params.get('email')`, gửi `/v1/auth/password/reset`.

### 5. Giới hạn số lần gọi

Định nghĩa ở `apps/api/src/common/config/app-config.ts` (kiểu 6-21, `DEFAULT_LIMITS` 106-125):

| Luật | Theo | Giới hạn | Áp ở |
|---|---|---|---|
| `auth.register.ip` | ip | 5 / 3600 s | đăng ký |
| `auth.login.ip` | ip | 20 / 60 s | đăng nhập |
| `auth.otp.ip` | ip | 20 / 3600 s | `/auth/otp` |
| `auth.otp.email.cooldown` | email | 1 / 60 s | gọi tay trong `OtpService.limitEmail` |
| `auth.otp.email.hourly` | email | 5 / 3600 s | gọi tay trong `OtpService.limitEmail` |
| `auth.refresh.ip` | ip | 60 / 60 s | làm mới phiên |
| `auth.refresh.chain` | chain | 10 / 60 s | `session.service.ts:88` |
| `auth.logout.ip` | ip | 60 / 60 s | đăng xuất |
| `auth.reset.ip` | ip | 20 / 3600 s | đặt lại mật khẩu |
| `mail.ip.daily` | ip | 20 / 86400 s | đăng ký, `/auth/otp` |
| `user.write` | user | 30 / 60 s | verify-email, đổi mật khẩu, … |

- Decorator `common/rate-limit/rate-limit.decorator.ts:7-8`; guard `rate-limit.guard.ts:22-32` lấy chủ thể: `user` → `request.user?.userId`, `ip` → `request.ip`,
  `email` → `normalizeEmail(request.body?.email)`, `chain` → bỏ. Nên khai một luật theo email trên route là đọc thẳng từ body được. **Hệ quả:** `user.write` trên
  route công khai không token thì không làm gì (chủ thể rỗng).
- Bộ đếm (`rate-limiter.service.ts:17-42`): cửa sổ cố định; ip và email được HMAC bằng `rateLimitHmacKey`; vượt → 429 `rate-limited` + `retryAfterSeconds`.
- Theo email hiện **chỉ có** ở bước xin mã OTP; không có ở verify-email, đặt lại mật khẩu, đăng nhập (đăng nhập dựa vào khoá `failedLoginCount`).
- `AuthGuard` toàn cục chạy trước guard của route như `RateLimitGuard` (design Bước 1 dòng 134).

### 6. `AuthGuard` và `@Public()`

`identity/sessions/auth.guard.ts:15-27` (đọc `IS_PUBLIC_KEY`, parse `Bearer`, `request.user = verify(...) ?? undefined`; không public mà không có user → 401
`invalid-token`; route public có token hợp lệ vẫn gắn `req.user`). Đăng ký toàn cục ở `identity.module.ts:28`. `public.decorator.ts:3-4`. Route auth công khai
hiện có: register, login, `/auth/otp`, `/auth/password/reset`, refresh, logout.

### 7. `GET /v1/me` và những chỗ phụ thuộc `emailVerifiedAt`

- `profile.controller.ts:12-14`; `Profile` (`identity.service.ts:16-28`) có `email_verified: row.emailVerifiedAt !== null` (41).
- API: `IdentityService.isEmailVerified` (75-78), `listReminderCandidates` (81-94), `verifiedEmails` (97-104); dùng ở `notifications/prefs/reminder-prefs.service.ts:24,33`,
  `notifications/scheduler/reminder-tick.service.ts:53`, `notifications/provider/email.provider.ts:23`, `entitlements/notices/notice-sender.service.ts:90`;
  `entitlements/entitlements.service.ts:176` (`trial_eligible: profile.email_verified && !trialUsed`); trial từ cổng thanh toán không xét xác nhận
  (`event-applier.service.spec.ts:458`, B5E90).
- Staff (`identity/staff/staff.service.ts`): tạo tài khoản đặt `emailVerifiedAt: now` (115); `setStaffRole` từ chối người chưa xác nhận (255);
  `grantAdminByEmail` trả `'unverified'` (272); CLI `admin-grant.ts:22-25` chỉ exit 0 khi `'granted'`.
- Không chỗ nào đặt lại `emailVerifiedAt` về null. `identity/maintenance/identity-cleanup.service.ts` xoá OTP và chuỗi phiên hết hạn, **không xoá tài khoản chưa xác nhận**.
- Script (`apps/api/scripts/`; "token đăng ký" = `access_token` trả về từ `POST /v1/auth/register`):

| Script | Tài khoản đã xác nhận | Tài khoản chưa xác nhận (sẽ gãy) |
|---|---|---|
| `learner-test-setup.mjs` | `ensureAccount` (156-178): đăng ký; 201 thì verify bằng token đăng ký + mã đầu ở Mailpit (164), hỏng thì `/auth/otp` + `/verify-email` (148-153); 409 thì `loginToken` (167); rồi `GET /v1/me`, chưa xác nhận thì verify lại (172-176). Admin: `admin-grant.js` rồi `loginToken` (234-236); `api()` đăng nhập lại khi 401 (88-91) | — |
| `smoke-buoc-0-3-fixes.mjs` | admin và người học chèn bằng psql với `email_verified_at now()` (136-145), đăng nhập qua API (147-150, 197-202) | M2 (215-229): đăng ký Lan, rồi `/auth/otp`, `/verify-email`, `GET /v1/me` bằng token đăng ký |
| `smoke-buoc-2.mjs` | `registerAdmin` (57-89) | `registerLearner` (91-107): đăng ký rồi `PATCH /v1/me` bằng token đăng ký |
| `smoke-buoc-4.mjs` | `registerAdmin` (104-116) | `registerLearner` (118-125): như trên |
| `smoke-buoc-5.mjs` | `registerVerified` (173-180) trả token đăng ký; admin (207-209); người học P (219-220); editor qua `POST /v1/admin/users` rồi đăng nhập (215); `sqlUser` (186-192) | — |
| `smoke-buoc-6.mjs` | `registerVerified` (174-181); admin (203-205); editor | — |
| `smoke-buoc-7.mjs` | `registerVerified` (190-200); admin (368-370) | `registerLearner` (202-208), L1–L3 (376-378); `api()` đăng nhập lại khi 401 (105-108) |

### 8. Admin

- Đăng nhập admin cùng `/v1/auth/login` (`apps/admin/src/auth/session-store.ts:118-125`). Cổng không xét `email_verified` (`apps/admin/src/auth/gate.ts:4-7`;
  `gate.test.ts:22`).
- Staff luôn đã xác nhận (tạo bởi admin thì được đặt xác nhận; chỉ cấp vai trò cho người đã xác nhận), nên (B) không ảnh hưởng đường thường của admin.
  `StaffPage.tsx:26-33` hiện "chưa xác nhận" và khoá nút vai trò.
- Admin real-stack e2e: `apps/admin/e2e-real/support/api.ts:36-43` `registerVerified` dùng `registered.access_token` để gọi `/v1/auth/verify-email` (sẽ phải đổi);
  dùng ở `e2e-real/global-setup.ts:30-32`; `loginToken` (50-53). Mock: `e2e/account.spec.ts:14,36`, `e2e/support/mock-api.ts:90`.

### 9. Web người học

- `RegisterForm.tsx`: `store.register(...)` (33-41) → `hardReplace('/{locale}/app/verify-email?sent=1')` (42); 409 `email-taken` hiện dưới ô email (57).
- `LoginForm.tsx`: `store.login(...)` → `hardReplace(safeNext(next))` (38-41); `account-locked` hiện hộp K/93 (50); không xét `email_verified`.
- `app-shell/session/session-store.ts`: `login`, `register` cùng qua `startSession` (124-142; chú thích 128 "register answers like login … signed in at once");
  token chỉ giữ trong bộ nhớ, refresh trong cookie HttpOnly; `recheck()` (`GET /v1/me`) → `signed-in` / `change-password` (186-191); phát `{type:'login'}` trên
  BroadcastChannel `wordmet-web-auth`; khởi động bằng `POST /v1/auth/refresh` (210-235, 281-289).
- `VerifyEmailForm.tsx`: **cần phiên** (client gắn phiên, 38); email lấy từ `state.me.email` (105); không có `?sent=1` thì tự gọi `/v1/auth/otp` một lần (41-45);
  nộp (53-58) `/v1/auth/verify-email {code}` → `recheck()` → `/app` hoặc `/app/welcome`. 409 `email-already-verified` **không** được coi là thành công (66;
  vi.json:891), trái với D14 Bước 1. Gửi lại: đếm ngược 60 s (17, 32, 51), `/v1/auth/otp`, toast.
- Routing: `/app/verify-email` ở `(member)` (`app/[locale]/app/(member)/verify-email/page.app.tsx`), bọc trong `RequireSession`; `RequireSession.tsx:57-75` chặn
  signed-out, change-password, tiền tố ngôn ngữ, chưa chọn ngôn ngữ (trừ `welcome|verify-email`, 16); **không có cổng `email_verified`**. Trang `(auth)` dùng
  `AuthGate.tsx:15-29`. Cài đặt mời xác nhận: `SettingsPage.tsx:91-97`.

### 10. Test đang ghim hành vi hiện tại

- API: `auth/auth.service.spec.ts` 57-76 (B1#1/B1#38 đăng ký trả phiên), 124-128 (B1#2), 134-144 (B1#11 đăng nhập không kiểm xác nhận); `auth/auth.controller.spec.ts`
  33-44, 59-67; `auth/otp.controller.spec.ts` 52-57, 78-82 (B1#7 verify-email cần đăng nhập), 84-92; `auth/otp.service.spec.ts` (các hàm nhận `RequestUser`)
  104-116, 161-167, 169-184, 186-192, 194-198, 200-207, 222-227; `profile/*.spec.ts`; `apps/api/test/support/auth-helpers.ts` (`seedUser` mặc định chưa xác nhận,
  `startSession` gọi thẳng `startChain`).
- Web unit: `session-store.test.ts` 219-228 ("learner login: an unverified email still enters the app (D36 Bước 3 …)"), 230-258, 260-266; `AuthGate.test.tsx:23-44`;
  `auth.test.tsx` 46-58, 153-206; `RequireSession.test.tsx:105-118`.
- Web e2e: `apps/web/e2e/app/m1.spec.ts` 10-48 ("sign-up → code → language → Today" với phiên từ đăng ký), 94-117 (`verify-email?sent=1` trong `MEMBER_PAGES`);
  `e2e/support/mock-api.ts:90,117`.
- Admin: `e2e-real/support/api.ts:36-43`, `src/auth/gate.test.ts:22`. Script: sáu smoke và `learner-test-setup.mjs` (mục 7).

### 11. Tài liệu Bước 1 (`docs/superpowers/specs/2026-10-07-buoc-1-identity-core-design.md`)

Không có quyết định riêng "chưa xác nhận được đăng nhập"; điều đó suy từ **D8** (dòng 37) và **B1#1** (352). Liên quan: D7 (36, một endpoint OTP dùng bất cứ lúc
nào), D14 (461; 216-217: 409 đã xác nhận, "app coi 409 này là thành công"), §5 đăng ký (207-209 "Trả token"), §5 OTP (211-215, `verify_email` "cần đăng nhập"),
§5 verify (216), guard (134-139), B1#4, B1#7, B1#23 (đặt lại mật khẩu thì đặt `email_verified_at`), B1#27, B1#29. Gốc: **K7**; `module-spec-identity-access.md`
IR2 (54), IR5 (57), I1 (80), dòng phòng thủ 142; **D36 Bước 3** (`2026-10-16-buoc-3-learning-decisions.md:56, 405-409`); design giao diện người học dòng 200.
