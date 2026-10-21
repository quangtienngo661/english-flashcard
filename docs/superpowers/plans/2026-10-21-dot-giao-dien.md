# UI round (Đợt giao diện) — full mockups Implementation Plan

> **Status 21/10/2026:** written after the owner approved the design ("Mình duyệt bản design đợt giao diện (kèm D17). Viết plan đi."). Waiting for the
> owner to review this plan and choose how it runs. **Mockups only, no code** (D1).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement
> this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every screen the built API (Bước 3–7, Bước 0–3 fixes) needs exists in the Figma file as a mockup, in layout B, with copy that follows the
approved Vietnamese guide, so the later code round builds screens without guessing.

**Architecture:** All work is in one Figma file, drawn by Claude through the Figma MCP (`use_figma`), reusing existing components and variables. Copy is
written first as a document the owner approves, then the screens are drawn area by area (A–G of design §5); each area ends with a check script run in
Figma and the owner's "ok" on screenshots. Docs (copy, plan summary, as-built, UI-CONTEXT, Figma index) are updated on the same branch.

**Tech Stack:** Figma file `7HcPAKLrWu32C27qYMJUOA`; Figma MCP tools `use_figma`, `get_metadata`, `get_screenshot` (load the `figma-use` skill — or the
`skill://figma/figma-use/SKILL.md` MCP resource — before the first `use_figma` call, as the Figma server requires); Markdown docs in the repo.

**Spec:** [`../specs/2026-10-21-dot-giao-dien-design.md`](../specs/2026-10-21-dot-giao-dien-design.md) (D1–D17) and
[`../decisions/2026-10-21-dot-giao-dien-decisions.md`](../decisions/2026-10-21-dot-giao-dien-decisions.md). Inputs: Figma review
[`../../mockups/2026-10-21/figma-review.md`](../../mockups/2026-10-21/figma-review.md) (its "Lệch" rows), Vietnamese research
[`../../mockups/2026-10-21/vietnamese-ux-writing-research.md`](../../mockups/2026-10-21/vietnamese-ux-writing-research.md).

**Branch:** `docs/dot-giao-dien-design` (PR #118, draft) carries the design, this plan and every doc of the round; PR into `dev`, merged when the owner
approves this plan, and again at the end with the as-built (or one PR per milestone if the owner prefers).

## Global Constraints

- No code, no change under `apps/**` or `packages/**`; no API change (the birth-date API change is a separate later task, design §10).
- Figma pages: web `254:8` (page 08), phone `284:8` (page 09), admin `2:5` (page 04), index `0:1`, Foundations `2:2`. Old pages `193:8` (03), `43:8` (05),
  `120:8` (06) are renamed "(cũ, không dùng) …" and moved last, **never deleted** in this round.
- Frame sizes: web 1920 × 1080 frame, content max 1440px, side column 360px; phone 393 × 852 (iPhone 16), top bar 175px on main screens.
- New frame names (fixed here so the copy doc and prototype links can refer to them): web `K/70`–`K/79` AI practice, `K/80`–`K/84` reports,
  `K/85`–`K/89` AI lookup and private words, `K/90`–`K/94` account; phone the same numbers with `M/`; phone practice `M/L51`–`M/L57`, `M/L60`–`M/L67`
  (mirroring `K/51`–`K/57`, `K/60`–`K/67`), phone plan Pro granted `M/62b` (`M/62` stays Miễn phí); admin `A/70`–`A/79` (settings, users, reports,
  reasons, refunds, unknown forms, grants), `A/80`–`A/86` (AI of Bước 6), `A/87`–`A/89` (content: Từ, Nghĩa, Chủ đề). Exact per-frame names come from Task 1.
- Colours only through existing variables (direction B tokens); icons Lucide; font Lexend; one yellow (Sticker) button per frame.
- Checks per area: text contrast ≥ 4.5:1, icon stroke contrast ≥ 3:1, 0 text layers overflowing their frame, ≤ 1 yellow button per frame.
- Copy: Vietnamese only, following `ban-chu-giao-dien.md` (Task 1) and D17: "lượt câu AI", "lượt tra AI" (never "lượt" alone), "phiên luyện", "câu";
  "Từ của tôi"; gói "Miễn phí", "Dùng thử", "Pro"; "gợi ý" and "AI gợi ý"; tone marks "hòa, thủy, khỏe"; dates/times/money as `Intl` vi-VN
  ("Chủ Nhật, 18/10", "20:00", "99.000 ₫"); sentence case; no "Vui lòng" on buttons; app calls itself "Wordmet", the learner "bạn".
- Admin screens are wireframe level (structure, columns, filters, states, `admin`/`editor` differences), not polished (D11).
- Each area ends at a review gate: screenshots saved under `docs/mockups/2026-10-21/duyet/<area>/` and sent to the owner; the next area starts after "ok".
- Git: commit docs after every task (`docs(ui): …`, ending `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`); push and PR into `dev` without asking;
  never `main`.

## Review Focus

1. **Long Vietnamese text on the phone** (long meanings, long word names like "underestimate", long report reasons) must wrap without overlapping or
   pushing the main button off-screen — Tasks 3, 6, 8 draw one frame each with the longest copy from Task 1 and the check script must report 0 overflow.
2. **The three plan states** (Miễn phí, Dùng thử, Pro) must look the same wherever AI appears (session setup, AI lookup, plans page) — Task 7 and Task 8
   draw the session setup and the lookup sheet for all three states.
3. **Private words** in AI questions and reports (masked options for staff, the consent tick, no report button for own-sentence cloze) — Task 7 draws
   the report sheet for a private-word AI question; Task 9 draws the staff report detail with a masked option.
4. **Empty states** (no group yet, no report yet, no history, no unknown form, no grant) must invite the next step, not apologise — Tasks 4, 7, 9 draw them.
5. **Error states from the API** (403 `ai-quota-insufficient`, 503 `ai-unavailable` model-not-set, 403 `account-locked`, under 13, sentence limit
   reached) each have a frame with the copy of Task 1 — Tasks 3, 4, 7 own them; Task 12's final check lists them.

---

### Task 1: Copy document (bản chữ giao diện) — review gate 0

**Files:**
- Create: `docs/mockups/2026-10-21/ban-chu-giao-dien.md`

**Interfaces:**
- Consumes: design §5, §6, §7 (D17); research file (principles N1–N20, glossary).
- Produces: the final glossary (one term per concept, with terms to avoid) and, per frame name of Global Constraints, every string on that frame
  (title, labels, buttons, notices, errors, empty states), plus the longest-copy sample used by Review Focus 1. Later tasks copy strings from it verbatim.

- [ ] **Step 1:** Write the glossary section from the research draft with D17 applied (lượt câu AI / lượt tra AI, phiên luyện, câu, Từ của tôi, Miễn phí /
  Dùng thử / Pro, gợi ý / AI gợi ý, kiểu câu vs dạng chia).
- [ ] **Step 2:** Write the strings for every frame of areas A–E (one table per frame: element → string), including every row of design §6.2 and
  the four public `ai_unavailable` reasons (`ai-failed`, `quota-exhausted`, `plan-required`, `ai-unavailable`).
- [ ] **Step 3:** List the existing strings on pages 08 and 09 that the glossary changes (old → new), for Task 5.
- [ ] **Step 4: Check** — every row of design §5 and §6.2 maps to at least one frame in the document (`grep` the frame list against §5); no string uses
  "lượt" without "câu AI"/"tra AI"; no "Vui lòng" in a button.
- [ ] **Step 5: Commit** `docs(ui): add the copy of the ui round`; send the file to the owner → **gate 0**.

### Task 2: Figma housekeeping and the check script

**Files:**
- Create: `docs/mockups/2026-10-21/figma-checks.js` (the plugin script run through `use_figma`)
- Modify (Figma): page order and names; the two hard-coded shadows

**Interfaces:**
- Produces: `figma-checks.js` exporting a script body that, given a list of frame ids, returns
  `{ frame, minTextContrast, minIconContrast, overflowCount, yellowButtonCount }[]`. Later tasks run it on their frames.

- [ ] **Step 1:** Rename pages `193:8`, `43:8`, `120:8` to "(cũ, không dùng) 03 …", "(cũ, không dùng) 05 …", "(cũ, không dùng) 06 …" and move them after
  page 04; `get_metadata` (no node id) lists them last.
- [ ] **Step 2:** List the main components used by instances on page 09 whose main component sits on an old page; record them in the commit message
  (move none in this round unless a new frame needs to edit one — then move that one to Foundations first).
- [ ] **Step 3:** Bind the two hard-coded shadows (`#0f1a3d` at 35% on the `Ink` button variant and the sidebar/top-bar "Thêm từ" button) to a variable
  (new variable if none fits, both modes).
- [ ] **Step 4:** Write `figma-checks.js`; run it on the existing frames `K/10` and `M/10` → it reports `minTextContrast ≥ 4.5` (as on 20/10) and
  `overflowCount 0`; run it on a scratch frame with grey-on-grey text → it reports a value < 4.5 (the control).
- [ ] **Step 5: Commit** `docs(ui): add the figma check script and tidy the pages`.

### Task 3: Area A — fix the mismatches (pages 08, 09)

**Interfaces:** Consumes Task 1 strings, Task 2 script.

- [ ] **Step 1:** Sign-up `K/01`, `M/01`: fields Tên (bắt buộc), Họ, Ngày sinh (bắt buộc), email, mật khẩu, tick Điều khoản + Chính sách bảo mật (links
  `/terms`, `/privacy`); add the under-13 state frame (`K/01b`, `M/01b`).
- [ ] **Step 2:** Add-word sheet: no preselected "Mới thêm"; field shows the last-used group; a variant with no group shows "Tạo nhóm đầu tiên" (D4).
- [ ] **Step 3:** Remove "tối đa 5 câu"; word page shows "N câu đã gặp"; add the limit-reached message state (D5).
- [ ] **Step 4:** "Tất cả nhóm (101)" → at most 100; card front per D3 on every review/word frame; Từ hay sai page text covers pending, fixed and confirmed
  reports; "300 câu AI mới mỗi tháng" with its condition (trần toàn hệ thống, công tắc AI); quota-exhausted screen without "Xem gói học" (D7); every
  "Thứ Bảy, 18 tháng 10" → `Intl` form of a real date.
- [ ] **Step 5:** Review Focus 1 frame: one phone frame with the longest copy sample from Task 1.
- [ ] **Step 6: Check** — run `figma-checks.js` on every frame touched → thresholds of Global Constraints met; the Figma review's "Lệch" rows for pages
  08/09 are each fixed (tick them in the commit message).
- [ ] **Step 7: Commit**, screenshots to `duyet/A/` → with Task 4, **gate A+B**.

### Task 4: Area B — account

- [ ] **Step 1:** Web avatar dropdown (`K/90`): Cài đặt, Gói học, Đăng xuất (D16). Phone: avatar opens Cài đặt (`M/90`) as page 09 does.
- [ ] **Step 2:** Cài đặt → Tài khoản (`K/91`, `M/91`): Tên, Họ, Ngày sinh editable; under-13 error on the birth-date field (`K/92`, `M/92`). No search
  strip on any settings frame (D16).
- [ ] **Step 3:** Login with a locked account (`K/93`, `M/93`): "Tài khoản đang bị khóa" per Task 1; Review Focus 4: empty state "chưa có nhóm" on Hôm nay
  (`K/94`, `M/94`) if not already drawn.
- [ ] **Step 4: Check** — script on the new frames; every settings frame has no search strip (`get_metadata` shows no search-strip instance).
- [ ] **Step 5: Commit**, screenshots to `duyet/B/` → **gate A+B**.

### Task 5: Apply the glossary to existing screens (pages 08, 09)

- [ ] **Step 1:** Replace every old → new string listed in Task 1 Step 3 on pages 08 and 09 (text only, no layout change).
- [ ] **Step 2: Check** — a `use_figma` text search on both pages finds no "lượt" without "câu AI"/"tra AI", no "Free"/"Trial" as plan names, no
  "Thứ Bảy, 18"; the script reports 0 overflow on every changed frame.
- [ ] **Step 3: Commit** `docs(ui): apply the glossary to pages 08 and 09` (no separate gate; shown at gate C).

### Task 6: Area C — phone practice and plans (page 09)

- [ ] **Step 1:** `M/L51`–`M/L57`, `M/L60`–`M/L67` from `K/51`–`K/57`, `K/60`–`K/67` (practice home, customise, the three Bước 4 types right/wrong/hint,
  end of session, Từ hay sai, history, quota exhausted), phone layout and top bar; remove the placeholder `M/61` (replaced by `M/L51`).
- [ ] **Step 2:** `M/62b` plans page with Pro granted (from `K/53`); `M/62` stays Miễn phí; the "Gói học" row of `M/60` loses its "Đang phát triển" badge.
- [ ] **Step 3:** Prototype links: tab Luyện tập → `M/L51`; practice flow `M/L51` → `M/L60`… → `M/L67`; chip gói → `M/62`/`M/62b`.
- [ ] **Step 4: Check** — script on all new frames; Review Focus 1 on the longest practice question.
- [ ] **Step 5: Commit**, screenshots to `duyet/C/` → **gate C** (with Task 5).

### Task 7: Area D, web — Bước 7 for learners (page 08)

**Interfaces:** Produces the web frames Task 8 mirrors and Task 11 links.

- [ ] **Step 1:** Session setup `K/70`: AI types with Pro tag; three plan-state variants (`K/70` Pro/Dùng thử, `K/70b` Miễn phí locked with the one-line
  sheet and link to Gói học, D6); cloze source choice; "Phiên này dùng N lượt câu AI"; `K/71` 403 `ai-quota-insufficient` (còn, cần, lúc nạp lại);
  `K/72` 503 model not set.
- [ ] **Step 2:** `K/73` preparing ("Đang tạo câu…", no button); `K/74` AI-only `ai_unavailable` with the four reasons (variants) and [Thử lại] [Dừng, để sau];
  `K/75` mixed-session fallback notice (once); `K/76` word-not-recognized notice with link to Từ của tôi; `K/77` "Bạn có phiên đang dở" asked when
  starting a new session (D9).
- [ ] **Step 3:** `K/78` the three AI types in session (asking; hints — cloze 3 levels, the two choice types 1 level; cloze skip); `K/79` answered with the
  translation (vi learner) and the own-sentence cloze variant (no translation, no report button).
- [ ] **Step 4:** `K/80` report sheet by reason (note required variant); `K/81` AI question about a private word with the consent tick (Review Focus 3);
  `K/82` history tab "Báo lỗi của tôi" with the four statuses and "trả 1 lượt câu AI"; `K/83` its empty state (Review Focus 4).
- [ ] **Step 5:** `K/85` add-word sheet with "Tra bằng AI" (Miễn phí locked variant `K/85b`); `K/86` result: catalog meanings first, then "AI gợi ý",
  tick "Gửi kèm câu đã gặp cho AI", "trừ 1 lượt tra AI"; `K/87` edit form before saving (meaning, part of speech, level, up to 2 examples); `K/88` private
  word page with the "AI gợi ý" label.
- [ ] **Step 6: Check** — script on every K/7x–K/8x frame; every row of design §6.2 and §6.3 has a frame (tick them in the commit message).
- [ ] **Step 7: Commit**, screenshots to `duyet/D-web/` → **gate D-web**.

### Task 8: Area D, phone — Bước 7 for learners (page 09)

- [ ] **Step 1:** `M/70`–`M/88` mirroring Task 7's frames in the phone layout (sheets from the bottom, top bar on main screens, full screen for the session).
- [ ] **Step 2:** Review Focus 1 and 2: one frame with the longest AI question copy; the lookup sheet in the three plan states.
- [ ] **Step 3: Check** — script on every new frame; each Task 7 frame has its `M/` twin.
- [ ] **Step 4: Commit**, screenshots to `duyet/D-phone/` → **gate D-phone**.

### Task 9: Area E — admin, product screens (page 04, wireframe)

- [ ] **Step 1:** `A/87`–`A/89` content: Từ, Nghĩa (with last reviewer / publisher / hider), Chủ đề (replacing `A/D02`–`A/D04`).
- [ ] **Step 2:** `A/70` "Cài đặt hệ thống" with six tabs (Nhắc học, Học và ôn, Luyện tập, Gói và lượt, Nội dung, AI), each field with its range; no
  "Mẫu email" block (D10); replaces `A/60`'s content.
- [ ] **Step 3:** `A/71` users list (admin only; search from 2 characters; newest first; 20 per page) and `A/72` user detail (names, birth date, lock/unlock).
- [ ] **Step 4:** `A/73` reports list (filters reason, source) and `A/74` report detail/resolve (rule: Không có lỗi / Đã sửa; AI: Không có lỗi / Xác nhận lỗi;
  refund shown; resolver and role; a masked private option, Review Focus 3); `A/75` report reasons (add, edit, turn off; no delete); `A/76` refunds list
  (admin only; filters resolver, dates; self-resolved flag); `A/77` unknown forms (sorted by rejections; accept or dismiss; empty state).
- [ ] **Step 5:** `A/78` grants list/history and `A/79` new grant, with the `editor` limits of Bước 5 shown as a variant.
- [ ] **Step 6: Check** — script; each replaced placeholder is gone; `admin`-only frames show the `editor` variant (no menu item) where it differs.
- [ ] **Step 7: Commit**, screenshots to `duyet/E/` → with Task 10, **gate E**.

### Task 10: Area E — admin, AI screens of Bước 6 (page 04, wireframe)

- [ ] **Step 1:** `A/80` models (add, provider, price); `A/81` operations (model, effort, thinking, max output tokens per operation); `A/82` prompt with history
  and a test run; `A/83` example sets and runs; `A/84` status; `A/85` costs; `A/86` calls (replacing `A/D09`–`A/D11`). All admin only.
- [ ] **Step 2: Check** — script; frames list every field of design Bước 6 §12.1 for these screens.
- [ ] **Step 3: Commit**, screenshots to `duyet/E/` → **gate E**.

### Task 11: Areas F and G — dark samples and prototypes

- [ ] **Step 1:** Duplicate Hôm nay (`K/10`), a practice question (`K/78`), Gói học (`K/52`) and the add-word sheet (`K/50`) into a "Dark samples" section with
  the variable mode set to Dark; run the script (thresholds hold in Dark).
- [ ] **Step 2:** Prototype flows on page 08: (1) `K/70` → `K/73` → `K/78` (hints) → `K/79`; (2) `K/74` → [Thử lại] → `K/73` → `K/78`; (3) `K/85` → `K/86` →
  `K/87` → `K/88`. Name them "Web Bước 7: 1/2/3".
- [ ] **Step 3: Check** — click through each flow in presentation mode (screenshots of each step).
- [ ] **Step 4: Commit**, screenshots to `duyet/FG/` → **gate F+G**.

### Task 12: Close the round

**Files:** Modify `docs/mockups/2026-10-16/UI-CONTEXT.md`, `docs/deliveries/dot-giao-dien.md` (as-built), `CLAUDE.md` (one pointer line); Figma page 00.

- [ ] **Step 1:** Figma index (page 00): pages 08, 09 as the main pages, old pages marked, the frame ranges of this round, the new prototype flows.
- [ ] **Step 2:** UI-CONTEXT: layout B and D2–D17. **Before editing**, the main checkout holds uncommitted edits to this file (seen 21/10): ask the owner
  to commit them to `dev` first, or bring them into this branch, so nothing is lost.
- [ ] **Step 3:** Final check: every row of design §5, every row of §6.2/§6.3, every Review Focus line and every "Lệch" row of the Figma review ticks to a frame;
  a list of the frames drawn (counts per area) goes into the as-built.
- [ ] **Step 4:** As-built in `docs/deliveries/dot-giao-dien.md`; CLAUDE.md pointer; commit; PR into `dev`.
