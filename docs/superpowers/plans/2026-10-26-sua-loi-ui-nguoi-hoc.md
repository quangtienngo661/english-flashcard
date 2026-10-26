# Sửa 12 lỗi major của audit giao diện người học — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sửa đúng 12 lỗi major #1–#12 của `docs/audit/2026-10-26-ui-nguoi-hoc-audit.md` trong `apps/web`, mỗi lỗi có test fail trước.

**Architecture:** Chỉ sửa tại chỗ trong các component sẵn có của `apps/web/src`, dùng token đã có (`packages/design-tokens`, `apps/web/src/app/globals.css`). Không thêm thư viện, không đổi API. Mỗi lỗi hai commit: `test(web): …` (test fail) rồi `fix(web): …`.

**Tech Stack:** Next 16.3.8, next-intl 4.14.9 (ICU qua intl-messageformat), React Aria Components, Tailwind v4, Vitest 4.1.11 + Testing Library (`renderApp` ở `app-ui/test-utils.tsx`), Playwright 1.63.0 (e2e chạy trong Docker trên Windows: `pnpm cf:docker` ở `apps/web`).

**Spec:** `docs/audit/2026-10-26-ui-nguoi-hoc-audit.md` (dòng #1–#12), đối chiếu design `docs/superpowers/specs/2026-10-22-giao-dien-nguoi-hoc-design.md` và bản chữ `docs/mockups/2026-10-21/ban-chu-giao-dien.md`.

## Global Constraints

- Chỉ sửa 12 lỗi đã chọn; không động vào 41 dòng minor, không "tiện tay" sửa chỗ khác.
- Màu chỉ từ token; không thêm token màu mới. Lint web cấm giá trị Tailwind tùy ý `-[...]` (`scripts/check-tailwind-raw.mjs`); `style` inline cần `// raw-ok:` (handoff §4).
- Chữ ở `apps/web/messages/{vi,en}.json` namespace `App`, hai file cùng khóa (có test so khớp). Luật chữ: bản chữ §1, §17.
- Không thêm thư viện, không đổi phong cách tổng thể.
- Nhánh `fix/ui-nguoi-hoc-major` cắt từ `origin/dev` mới nhất (hiện `6e72bb3`), PR vào `dev`. Một lỗi = hai commit (test fail, rồi sửa). Conventional Commits, chữ thường, không dấu chấm cuối.
- React Compiler: không setState trong effect, không đọc ref lúc render (handoff §4).
- Số dòng trong plan tính trên `0a075ea`; `origin/dev` chỉ đổi auth/settings/verify-email, nên tìm theo tên hàm/khóa nếu lệch dòng.

## Review Focus

1. Tên rất dài **không có khoảng trắng** ở mọi chỗ in tên nhóm trong một hàng flex/grid (không chỉ trang nhóm và Từ hay sai): sau khi sửa, `noSideScroll` ở 390px. Test ở Task 1.
2. Bản sáng không được đổi rõ khi đổi lớp phủ hộp thoại (#3): ảnh after bản sáng phải gần như giống before. Kiểm bằng ảnh ở Task 12.
3. Số nhỏ không đổi chữ khi thêm `{…, number}` (#9): "0", "3", "1/3" vẫn y nguyên; tiếng Anh "1,250". Test ở Task 4.
4. Tra từ điển lỗi rồi **thử lại thành công** (#4): tấm về luồng bình thường, không còn khối lỗi. Test ở Task 5.
5. Focus không bị cướp khi người học đang gõ (#8): ở câu gõ từ, focus vào nút chính chỉ xảy ra **sau** khi có kết quả cuối, không lúc `try_again` (ô gõ giữ focus như hiện nay). Test ở Task 8.

---

### Task 0: Nhánh và ảnh "before" cho các lỗi chưa có ảnh

**Files:** `apps/web/e2e-audit/audit.spec.ts` (script tạm của audit, không commit)

- [ ] **Step 1:** `git fetch origin && git switch -c fix/ui-nguoi-hoc-major origin/dev`.
- [ ] **Step 2:** Thêm vào script tạm một test `before-after` nhận `SHOTS_DIR` (mặc định `shots-before`) chụp 375/1280 × sáng/tối:
  - #2: không chụp được (lỗi nằm ở body request), bằng chứng là test.
  - #4: tấm Thêm từ với `GET /v1/lookup` trả 500.
  - #5: trang nhóm với `GET /v1/groups/{id}/queue` trả 500.
  - #7, #11: trước đó chạy một phiên luyện bằng `audit-pro` vào nhóm có tên dài liền, trả lời sai hết, để có Lịch sử và Từ hay sai.
  - #8: không chụp (hành vi bàn phím, bằng chứng là test).
  - #1, #3, #6, #9, #10, #12: đã có ảnh audit, chép sang `shots-before` theo cùng tên.
- [ ] **Step 3:** Chạy `pnpm exec playwright test -c e2e-audit/playwright.audit.config.ts -g before-after` (app :3001, API :3000 đang chạy). Kỳ vọng: ảnh ở `docs/audit/2026-10-26-ui-nguoi-hoc/shots-before/`.

### Task 1: #1 trang nhóm và #11 nút Từ hay sai không tràn ngang

**Files:**
- Modify: `apps/web/src/features/learner/groups/GroupPage.tsx` (khối `section` đầu trang, `h1`)
- Modify: `apps/web/src/features/learner/practice/WeakWordsPage.tsx` (nút `startGroup`)
- Modify: `apps/web/e2e/support/fixtures.ts`, `apps/web/e2e/app/overflow.spec.ts`

**Interfaces:** Produces `LONG.unbrokenDeckName: string` trong `e2e/support/fixtures.ts` (60 ký tự, không khoảng trắng: `'Supercalifragilisticexpialidociousantidisestablishmentarianism'.slice(0, 60)`).

- [ ] **Step 1:** Thêm `LONG.unbrokenDeckName`. Trong `overflow.spec.ts` thêm test `no horizontal scroll on the deck page with an unbroken 60-character name (vi)`: `signedInAs(page, 'pro', handlers)` với handler nhóm/queue/items như `e2e/app/m2.spec.ts` nhưng `name: LONG.unbrokenDeckName`; `goto('/vi/app/group?id=g1')`; chờ `h1`; `noSideScroll(page)`.
- [ ] **Step 2:** Chạy `pnpm cf:docker` với filter `-g "unbroken"` (project mobile). Kỳ vọng: FAIL (scrollWidth > 390). Commit `test(web): reproduce the deck page overflow with an unbroken name`.
- [ ] **Step 3:** `GroupPage.tsx`: thêm `min-w-0` cho `section` đầu trang; `h1` đổi `break-words` thành `wrap-anywhere`. Chạy lại: PASS. Commit `fix(web): wrap an unbroken deck name on the deck page`.
- [ ] **Step 4:** Thêm test `no horizontal scroll on weak words with an unbroken deck name (vi)`: handler `GET /v1/practice/weak-words/groups` trả một nhóm `name: LONG.unbrokenDeckName` có 3 từ, `GET /v1/practice/weak-words` trả 3 từ; `goto('/vi/app/practice/weak?group=g1')` (hoặc chọn nhóm trong ô); `noSideScroll`. Chạy: FAIL. Commit `test(web): reproduce the weak words start button overflow`.
- [ ] **Step 5:** `WeakWordsPage.tsx`: nút `startGroup` theo mẫu `SourceCard.tsx` — `className="w-full"` và chữ bọc trong `<span className="truncate">`. Chạy lại: PASS. Commit `fix(web): truncate the deck name in the weak words start button`.

### Task 2: #3 lớp phủ hộp thoại tối đi ở bản tối

**Files:** Modify `apps/web/src/app-ui/Dialog.tsx` (`ModalOverlay` className); Test `apps/web/src/app-ui/ui-kit.test.tsx`

- [ ] **Step 1:** Test `Dialog overlay dims with navy, not ink (ink is light in dark mode)`: render `Dialog` mở; lấy phần tử overlay (cha gần nhất của `role="dialog"` có class `fixed inset-0`); `expect(cls).toContain('bg-navy/45')` và `not.toMatch(/\bbg-ink\//)`. Chạy `pnpm vitest run src/app-ui/ui-kit.test.tsx`: FAIL. Commit `test(web): reproduce the dialog overlay lightening the dark theme`.
- [ ] **Step 2:** Đổi `bg-ink/45` thành `bg-navy/45` (navy sáng `#1b2444` gần ink `#0f1a3d` nên bản sáng gần như không đổi; tối `#171b27`). PASS. Commit `fix(web): dim dialogs with navy so dark mode darkens the page`.

### Task 3: #6 class chữ không có token

**Files:** Create `apps/web/src/styles/text-classes.test.ts`; Modify `features/learner/plans/PlansPage.tsx`, `features/learner/practice/session/SessionSummary.tsx`

- [ ] **Step 1:** Test `every text-* class names a colour token, a type token or a Tailwind text utility`: đọc mọi `src/**/*.tsx` (trừ `*.test.tsx`), lấy các class `text-([a-z0-9-]+)` (bỏ phần sau `/`); tập cho phép = tên `--color-*` trong `packages/design-tokens/theme.css` + tên `--text-*` (bỏ `--…--line-height`, `--…--letter-spacing`) trong `src/app/globals.css` + `left right center justify start end wrap nowrap balance pretty ellipsis clip transparent current inherit`. Kỳ vọng danh sách lạ rỗng. Chạy: FAIL, liệt kê ít nhất `h1` (nếu hiện thêm tên lạ khác, ghi vào ledger và hỏi trước khi sửa — ngoài phạm vi). Commit `test(web): reproduce text classes without a type token`.
- [ ] **Step 2:** `PlansPage.tsx`: `h1` dùng `text-display`, giá dùng `text-h2`. `SessionSummary.tsx`: `h1` dùng `text-display` (như "Xong N thẻ." ở `review/ReviewSummary.tsx`). PASS. Commit `fix(web): size the plans and summary titles with type tokens`.

### Task 4: #9 số theo `Intl` vi-VN

**Files:** Modify `apps/web/messages/vi.json`, `apps/web/messages/en.json`; Test: thêm vào test so khớp hai file chữ (tìm file test đang so khóa `vi`/`en`, ví dụ `grep -rl "en.json" src/**/*.test.ts`), và `features/learner/today/*.test.tsx`

**Interfaces:** Đã kiểm trong phiên (next-intl 4.14.9): `"{count} từ"` → "262962 từ"; `"{count, number} từ"` → "262.962 từ" (vi), "262,962 words" (en).

- [ ] **Step 1:** Test `every numeric placeholder in App is formatted as a number`: duyệt chuỗi của `App` ở cả hai file; với mỗi placeholder đơn `{x}` mà `x` thuộc `count total used limit remaining waiting groups words shown done n needed target left opened max days`, báo lỗi. (`{x, plural, …}` và `{x, number}` là hợp lệ.) Thêm test hiển thị: Hôm nay với nhóm `today.due = 262962` hiện "262.962". Chạy: FAIL. Commit `test(web): reproduce counts shown without thousands separators`.
- [ ] **Step 2:** Đổi các placeholder đó thành `{x, number}` trong cả hai file; giữ nguyên câu chữ. PASS; chạy cả bộ `pnpm test` (số nhỏ không đổi chữ — Review Focus 3). Commit `fix(web): format counts with the learner's locale`.

### Task 5: #4 tấm Thêm từ và #5 trang nhóm khi tải lỗi

**Files:** Modify `features/learner/add-word/AddWordSheet.tsx`, `features/learner/groups/GroupPage.tsx`; Test `features/learner/add-word/add-word.test.tsx`, `features/learner/groups/group-page.test.tsx`

**Interfaces:** Consumes `ErrorState({ message, onRetry })` (`app-ui/States.tsx`), `useErrorMessage()` (`app-shell/api/use-error-message.ts`).

- [ ] **Step 1:** Test `E5: a failed dictionary lookup shows the error with [Thử lại] and keeps [Tự nhập nghĩa]`: route `GET /v1/lookup?q=rizz` trả 500 lần đầu, 200 `{ senses: [], bases: [] }` lần hai; gõ "rizz"; kỳ vọng `role="alert"` + nút "Thử lại" + nút "Tự nhập nghĩa"; bấm Thử lại → khối lỗi biến mất, hiện dòng `noMatch` (Review Focus 4). FAIL. Commit `test(web): reproduce the add word sheet stuck on a failed lookup`.
- [ ] **Step 2:** `AddWordSheet.tsx` ở màn tìm: `lemma && lookup.isError` → `<ErrorState message={errorText(lookup.error)} onRetry={() => void lookup.refetch()} />` và nút [Tự nhập nghĩa] (`setView('manual')`, khóa chữ `manualButton` có sẵn) ở chân khi `lookup.isError`. PASS. Commit `fix(web): show the lookup error and keep manual entry in the add word sheet`.
- [ ] **Step 3:** Test `E5: a failed card list shows the error with [Thử lại], not "Nhóm chưa có từ nào."`: `GET /v1/groups/g1/queue?mode=all` trả 500; kỳ vọng không có chữ `group.empty`, có `role="alert"` + "Thử lại". FAIL. Commit `test(web): reproduce the deck page claiming no words on a failed load`.
- [ ] **Step 4:** `GroupPage.tsx`: nhánh `queue.isError` trước nhánh `cards.length === 0` → `ErrorState` với `onRetry={() => void queue.refetch()}`. PASS. Commit `fix(web): show an error on the deck page when its cards fail to load`.

### Task 6: #2 [Luyện thêm một phiên] giữ nguồn câu điền từ

**Files:** Modify `features/learner/practice/session/SessionSummary.tsx`; Test `features/learner/practice/session/practice-session.test.tsx`

**Interfaces:** Produces `export const againBody(s: PracticeSessionView): StartBody` (đang là `const` nội bộ; export để test).

- [ ] **Step 1:** Test `[Luyện thêm một phiên] after an own-sentence session sends cloze_source: 'own'`: `againBody({ …session, types: ['cloze'], cloze_source: 'own' })` có `cloze_source: 'own'`; với `cloze_source: 'ai'` hoặc `null` thì **không** có khóa `cloze_source`. FAIL. Commit `test(web): reproduce practice again dropping the own-sentence source`.
- [ ] **Step 2:** `againBody` thêm `...(s.cloze_source === 'own' ? { cloze_source: 'own' } : {})`. PASS. Commit `fix(web): keep the own-sentence source when practicing again`.

### Task 7: #7 nhãn ô trả lời / đáp án ở Lịch sử

**Files:** Modify `features/learner/practice/HistoryPage.tsx` (hàng `li` của tab "Câu đã làm"); Test `features/learner/practice/weak-history.test.tsx`

- [ ] **Step 1:** Test `K/57: each answered row labels "Bạn trả lời" and "Đáp án" for every width and screen readers`: một dòng lịch sử sai (`answer: 'cash'`, `correct.text: 'deploy'`); trong `li` có chữ "Bạn trả lời" và "Đáp án" (khóa `cols.answer`, `cols.correct`) đứng ngay trước giá trị tương ứng (ví dụ `within(li).getByText('cash').previousSibling` hoặc cùng phần tử cha). FAIL. Commit `test(web): reproduce unlabeled answer cells in practice history`.
- [ ] **Step 2:** Mỗi ô answer/correct thêm nhãn `<span className="text-caption text-muted lg:sr-only">{t('cols.answer')}</span>` (và `cols.correct`) trước giá trị; tiêu đề cột `aria-hidden` giữ nguyên cho người nhìn ở ≥1024. PASS. Commit `fix(web): label the answer and correct cells in practice history`.

### Task 8: #8 thông báo kết quả và focus sau khi trả lời

**Files:** Modify `features/learner/practice/session/PracticeSession.tsx`, `AnswerFeedback.tsx`, `features/learner/review/ReviewSession.tsx`; Test `practice-session.test.tsx`, `review/review-session.test.tsx`

**Interfaces:** Một phần tử `<p aria-live="polite" aria-atomic="true" className="sr-only" data-live="result">` render **từ đầu phiên** ở `PracticeSession` và `ReviewSession`.

- [ ] **Step 1:** Test practice `answer result goes to a live region present before answering; focus moves to the primary action`: trước khi trả lời có `[data-live="result"]` rỗng; trả lời MCQ đúng → nội dung chứa "Đúng rồi" và `revealLine`; `document.activeElement` là nút chính (nút có `kbd` Enter của trường hợp đó). Thêm `try_again keeps focus in the word box` (Review Focus 5). FAIL. Commit `test(web): reproduce lost focus and silent results after answering`.
- [ ] **Step 2:** `PracticeSession.tsx`: render vùng live luôn có; nội dung = `final` → `${right ? t('right') : t('wrong')}. ${t('revealLine', …)}`, `try_again` → `t('wrong')`, còn lại rỗng. Bỏ `role="status"` ở `AnswerFeedback.tsx` và khối try_again (tránh đọc hai lần). Nút chính của `AnswerFeedback` nhận `autoFocus`. PASS. Commit `fix(web): announce practice results and focus the next action`.
- [ ] **Step 3:** Test review `after answering, the live region says the new card position and focus is on [Lật thẻ]`: bấm [Đã biết] → `[data-live="result"]` chứa `t('review.card', { n: 2, total })`; `activeElement` là nút Lật thẻ. FAIL. Commit `test(web): reproduce lost focus after answering a review card`.
- [ ] **Step 4:** `ReviewSession.tsx`: vùng live luôn có, nội dung đặt khi chỉ số thẻ đổi sau một lần trả lời (không phải lúc mở phiên); nút Lật thẻ nhận `autoFocus`. PASS. Commit `fix(web): announce the next review card and focus flip`.

### Task 9: #10 cả hàng Cài đặt là vùng bấm

**Files:** Modify `features/learner/settings/SettingsPage.tsx` (`Row`, hàng `transactions`, hàng `currentPlan`); Test `features/learner/settings/settings.test.tsx`

**Interfaces:** `Row` thêm prop `href?: string`; khi có `href`, phần tử bọc cả hàng là `Link` (hàng không còn `action` riêng cho cùng đích).

- [ ] **Step 1:** Test `the transactions and current plan rows are links over the whole row`: `getByRole('link', { name: /Lịch sử giao dịch/ })` chứa phần tử chữ "Lịch sử giao dịch"; `getByRole('link', { name: /Gói hiện tại/ })` chứa chữ tên gói. FAIL. Commit `test(web): reproduce settings rows where only the chevron is a link`.
- [ ] **Step 2:** `Row` với `href`: `<li>` chứa `<Link href className="flex min-h-control-touch … focus-visible:ring-2 focus-visible:ring-primary">` bọc tiêu đề, dòng phụ và mũi tên (`ChevronRight aria-hidden`); trên web hàng Gói hiện tại giữ chữ "Xem gói học" trong link. PASS. Commit `fix(web): make settings rows with one destination fully tappable`.

### Task 10: #12 tên nút loa chứa chữ nhìn thấy

**Files:** Modify `apps/web/messages/vi.json`, `en.json` (`App.speak.uk`, `App.speak.us`); Test `apps/web/src/app-ui/SpeakButtons.test.tsx`

- [ ] **Step 1:** Test `WCAG 2.5.3: the accessible name starts with the visible "UK" / "US"`: `getByRole('button', { name: /^UK\b/ })`, `/^US\b/`. FAIL. Commit `test(web): reproduce speak buttons whose names omit the visible label`.
- [ ] **Step 2:** Chữ (**đề xuất**, chủ dự án duyệt khi duyệt plan): vi `"UK, nghe giọng Anh"`, `"US, nghe giọng Mỹ"`; en `"UK, British voice"`, `"US, American voice"`. PASS. Commit `fix(web): start speak button names with their visible label`.

### Task 11: Kiểm toàn bộ, CI, PR

- [ ] **Step 1:** Ở `apps/web`: `pnpm lint`, `pnpm typecheck` (hoặc lệnh tương ứng trong `package.json`), `pnpm test` — tất cả xanh.
- [ ] **Step 2:** `pnpm cf:docker` (cả bộ e2e, có axe + overflow) — xanh.
- [ ] **Step 3:** Quét secret, push nhánh, mở PR vào `dev` (mô tả liệt kê #1–#12 và link audit). Chờ CI xanh.

### Task 12: Ảnh after, polish, cập nhật audit

- [ ] **Step 1:** Chạy test `before-after` với `SHOTS_DIR=shots-after` trên nhánh đã sửa (app dev :3001 phải chạy code của nhánh: tắt và xóa volume `wordmet-dev-app-next` nếu container không thấy file mới, handoff §6). Kỳ vọng: cặp ảnh before/after cho #1, #3, #4, #5, #6, #7, #9, #10, #11, #12 ở 375/1280 × sáng/tối; #2, #8 bằng chứng là test.
- [ ] **Step 2:** Chạy `/impeccable polish` (reference `polish.md`) trên các màn đã sửa; chỉ sửa điểm nằm trong 12 lỗi, điểm khác ghi vào audit như dòng mới, không sửa.
- [ ] **Step 3:** Cột **Trạng thái** của audit: #1–#12 → "đã sửa (PR …)" kèm link ảnh after. Mục as-built ở `docs/deliveries/sua-loi-ui-nguoi-hoc.md`. Xóa `apps/web/e2e-audit/`. Merge PR khi CI xanh.
