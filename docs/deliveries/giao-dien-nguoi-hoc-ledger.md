<!-- Copy of the git-ignored executing-plans ledger .superpowers/sdd/2026-10-22-giao-dien-nguoi-hoc/progress.md, 23/10/2026. Keep appending here. -->

# SDD ledger — plan: docs/superpowers/plans/2026-10-22-giao-dien-nguoi-hoc.md
Executor: executing-plans (native), owner choice 22/10/2026. Branch per milestone (owner): feat/giao-dien-nguoi-hoc-m1 … from origin/dev.
Ruling: plan "Execution model" branch claude/gallant-keller-bwo9dk → feat/giao-dien-nguoi-hoc-<mốc> per owner prompt — cost if wrong: none (owner instruction).
Ruling: Task 11 Step 4 "real-stack run in the cloud" → run on the owner's Windows machine (docker compose, ports 5434/6380/8025) — owner prompt.
Pre-flight (M1):
- T2 buildCsp(scriptHashes) ← T3 THEME_SCRIPT_HASH: T2 lands first with scriptHashes param; T3 wires the hash into next.config. OK.
- T4 useEntitlements/useAppConfig ← T7 GET /v1/me/app-config: T4 hooks only call the path; T10 consumes both. OK.
- T6 ← T3 tokens, T4 useSession, T5 useFormat: order respected.
- T9/T10 ← T6 DateOfBirthField/TextField/Select/Switch: OK.
- T4 assertApiBaseUrl test text "with 'http://localhost:3100' it returns" is ambiguous. Ruling: read as siteUrl='http://localhost:3100' (e2e site) + raw localhost:3000 → returns; prod site https://wordmet.com requires host api.* — matches design §4.2 — cost if wrong: one test case.
Task 1: Ruling: assert:static in CI runs in its own step without the build env → ci.yml step and cf-docker test mode set NEXT_PUBLIC_LEARNER_APP=on (the e2e build has it on) — cost if wrong: one env line.
Task 1: Ruling: cf-docker --build also runs assert:static, copies prerender-manifest to .docker-out and prints the wrangler dry-run size (needed every milestone, design §4.5) — cost if wrong: a few script lines.
Task 1: gate verified: on → /vi/app,/en/app prerendered; off → no app route, "Wordmet app" absent from .open-next. Worker size gzip: on 2943.28 KiB, off 2941.92 KiB (Free ≈ 3072 KiB) — RISK for later milestones.
Task 1: landing e2e (cf:docker) 102 passed, 14 skipped.
Task 1: complete (commits 87502c0..de9e5d0, tests: pnpm --filter web exec vitest run --exclude src/lib/csp.test.ts →    Duration  14.11s (transform 3.77s, setup 22.39s, import 12.91s, tests 8.71s, environment 59.58s))
Task 2: CSP run on the Worker build: with inline:false the browser blocked inline scripts (only directive: script-src-elem inline, Next `self.__next_f.push`; no style violations) → CSP_INLINE_FALLBACK = true (D20, pre-approved); e2e csp.spec 4 passed. Record in PR + as-built.
Task 2: Ruling: buildCsp drops scriptHashes when inline:true — CSP3 ignores 'unsafe-inline' when a hash is present, so THEME_SCRIPT_HASH (Task 3) would re-block Next's inline scripts — cost if wrong: theme script hash unused while fallback is on.
Task 2: Ruling: buildCsp `dev` = site URL not https (local http production build for e2e) since the header is only sent in production — cost if wrong: e2e build allows 'unsafe-eval'.
Task 2: complete (commits de9e5d0..2a035de, tests: pnpm --filter web test →    Duration  7.20s (transform 1.61s, setup 12.79s, import 5.54s, tests 6.86s, environment 22.46s))
Task 3: Ruling: dark border-strong #59627d (Figma) → #6b7491: Figma value is 2.33:1 on dark surface, global constraint needs input borders ≥ 3:1 (now 3.05 surface / 4.00 canvas) — cost if wrong: one hex; tell the owner (Figma not edited, design §14.10).
Task 3: Ruling: dark values in a new packages/design-tokens/dark.css (exported), not inside theme.css — admin tokens.test regex reads every '--color-x: #hex' in theme.css, so a dark block there would overwrite admin's light values; landing/admin never import dark selectors at runtime either — cost if wrong: one extra file.
Task 3: Ruling: ThemeProvider uses useSyncExternalStore (react-hooks/set-state-in-effect lint forbids setState in effect); also removes data-theme on unmount so a client nav to the landing is never themed — cost if wrong: none.
Task 3: complete (commits 2a035de..22ea0a5, tests: bash -c 'pnpm --filter web test && pnpm --filter admin test' →    Duration  37.04s (transform 7.44s, setup 136.22s, import 24.05s, tests 126.81s, environment 79.90s))
Task 4: Ruling: E13 in-progress 409 waits Retry-After up to 3 times with the same key, then throws and keeps the key (plan said 'once'; a stuck in-flight would otherwise loop forever, and dropping the key could double-write) — cost if wrong: retry count.
Task 4: Ruling: Task 6 Step 1 (add react-query, react-aria-components, lucide-react, msw at admin versions) done in Task 4 — AppProviders/queries.ts need QueryClient now — cost if wrong: none.
Task 4: Ruling: KNOWN_ERROR_SLUGS = 36 learner-facing API slugs (grep 22/10), admin-only dropped; the vi/en message check moves to Task 5 (App.errors) — cost if wrong: a slug falls back to the generic text.
Task 4: Ruling: App.errors/App.offline/App.common/App.session copy added in Task 4 (next-intl keys are type-checked against en.json, so use-error-message cannot compile without them); Task 5 adds the rest of App — cost if wrong: none.
Task 4: Ruling: RequireSession also sends a profile with native_language null to /app/welcome directly (not only on a 403), except on /app/welcome and /app/verify-email — the sign-up flow verifies before choosing a language — cost if wrong: one extra redirect rule.
Task 4: complete (commits 22ea0a5..5afafae, tests: pnpm --filter web test →    Duration  11.59s (transform 2.70s, setup 21.78s, import 9.12s, tests 13.89s, environment 50.54s))
Task 5: Ruling: useFormat keeps date styles weekdayDayMonth/dayMonth/full; 'monthDay' and relativeDays left out until a screen needs them (YAGNI; no M1 copy uses them) — cost if wrong: add a style later.
Task 5: complete (commits 5afafae..73570ba, tests: pnpm --filter web test →    Duration  11.19s (transform 2.97s, setup 21.97s, import 8.78s, tests 14.29s, environment 45.53s))
Task 6: Ruling: Tabs, Menu wrapper, Icon and SearchStrip not built in M1 — no M1 screen uses them (Tabs: M4 history; SearchStrip: M3; Icon: lucide imported directly; AvatarMenu uses React Aria Menu directly) — cost if wrong: written in the milestone that needs them.
Task 6: Ruling: Button kit added (Figma variants sticker/primary/quiet/ink/danger/ghost) though not in the plan's file list — every form needs it — cost if wrong: none.
Task 6: Ruling: top-bar "Cài đặt" icon is a sun, as Figma's icon/settings draws it — cost if wrong: one icon.
Task 6: Ruling: displayName = "Họ Tên" in vi (copy §5.1), "Given Family" in en — cost if wrong: name order in English.
Task 6: Worker size measured with Task 11's gate build (cf:docker --build) rather than separately.
Task 6: complete (commits 73570ba..cbfbb72, tests: pnpm --filter web test →    Duration  13.58s (transform 3.91s, setup 21.23s, import 28.97s, tests 16.87s, environment 49.19s))
Task 7: Ruling: SubscriptionSource.currentPeriodStart is optional (read only for starts_at), so the many rule-spec fixtures stay as they are — cost if wrong: none. Weak-word meaning = practiceSenses(...).meaning.text.
Task 7: complete (commits cbfbb72..ac6c1c8, tests: pnpm --filter api test →    Duration  132.02s (transform 53.24s, setup 0ms, import 1069.07s, tests 87.33s, environment 120ms))
Task 8: complete (commits ac6c1c8..5a2bf53, tests: pnpm --filter api test →    Duration  131.25s (transform 54.75s, setup 0ms, import 1063.10s, tests 87.84s, environment 81ms))
Task 9: Ruling: verify-email always ends at /app/welcome when the profile has no language, else /app (test fixture uses native_language null); "Quay lại" = router.back() — cost if wrong: one redirect.
Task 9: Ruling: the Today placeholder moved to app/(member)/page.app.tsx so it sits behind RequireSession (Task 15 replaces it) — cost if wrong: none.
Task 9: Ruling: sign-in notices: expired → "Bạn cần đăng nhập lại.", rate-limited → E4 line, logout-failed → line + [Đăng xuất lần nữa] (admin FE38); reset=1 → "Đã đổi mật khẩu…" — copy written by Claude per copy doc §3.1.
Task 9: auth.test.tsx sets testTimeout 20 s (typing many fields under the parallel suite took >5 s).
Task 9: complete (commits 5a2bf53..2629d0a, tests: pnpm --filter web test →    Duration  45.64s (transform 7.10s, setup 67.22s, import 54.55s, tests 62.22s, environment 166.84s))
Task 10: Ruling: language and theme are segmented radio groups as in K/50 (plan said "theme Select") — frame wins — cost if wrong: control swap.
Task 10: Ruling: birth date and reminder time ("20:00") are calendar values, formatted with zone UTC (not the learner zone) so UTC+14 never shifts them — cost if wrong: none.
Task 10: Ruling: D15 refill shown as clock time when the refill is today/tomorrow in the learner zone, else the date — cost if wrong: wording of one line.
Task 10: test utils now wrap ThemeProvider; vitest.setup stubs window.matchMedia for jsdom.
Task 10: complete (commits 2629d0a..9e4c353, tests: pnpm --filter web test →    Duration  24.92s (transform 5.11s, setup 28.63s, import 33.51s, tests 38.59s, environment 72.70s))
Task 11: Ruling: `next dev` cannot run on this Windows host (SWC native binding blocked, as CLAUDE.md Landing says) → `pnpm dev:app` runs `cf:docker --dev-app` on win32 (Linux container, :3001, app flag on); cf-docker --dev also mounts apps/admin/node_modules as a volume so the container install never overwrites the Windows admin install — cost if wrong: owner's prompt command `pnpm dev --port 3001` replaced by `pnpm dev:app`.
Task 11: Ruling: admin opened at 127.0.0.1:5173 must also call the API at http://127.0.0.1:3000 (VITE_API_BASE_URL) — the refresh cookie is host-only and SameSite=Strict, so 127.0.0.1 → localhost would drop it; .env.example CORS adds http://localhost:3001 and http://127.0.0.1:5173.
Task 11: Owner's apps/api/.env lacks ADMIN_APP_URL, LEARNER_APP_URL, TERMS_VERSION (API refused to start). Not read/edited (.env denied); the local run passes those + CORS + AI/BILLING fake flags + a local fake-billing signing value through the process env (scratchpad run-api.mjs). Tell the owner to update .env.
Task 11: test-results/shots via playwright.shots.config.ts (SHOTS_EMAIL/SHOTS_PASSWORD).
Task 11: Ruling: every navigation after a form or the session gate uses a full page load (hardReplace = location.replace), not router.replace — on the OpenNext Worker build router.replace was dropped intermittently (e2e: register→verify, verify→welcome, login→next stayed put); pages are static shells and the session survives a reload via the refresh cookie — cost if wrong: one extra page load + refresh per auth step. RISK for M2+: if plain client navigation is also flaky on the Worker, Links may need the same look.
Task 11: Ruling: RequireSession reads the router path (usePathname), the address bar only for the query — during a client move the address bar still shows the old page.
Task 11: Ruling: AuthGate redirects only when the session was already signed in at page open.
Task 11: Ruling: phone Settings (M/90): language/theme are "value ›" rows opening a sheet with the same pill switch; sign-out is a full-width button after the account section; web keeps K/50.
Task 11: learner:setup run on a separate DB english_learning_learner_ui + JOB_QUEUE_PREFIX wordmet-learner-ui (subagent warning: the sample CSV overwrites real senses with the same headword+pos on a DB with real content) — 2 accounts, 303 senses published, fake:ok for 6 AI ops.
Task 11: complete (commits 9e4c353..f35325d, tests: pnpm --filter web test →    Duration  28.76s (transform 7.16s, setup 32.25s, import 61.98s, tests 46.33s, environment 64.94s))
Final (M1): fresh reviewer (opus) on 87502c0..f35325d: 0 Critical, 2 Important, 4 Minor.
Final: fixed E3 notice lost on the full reload — RequireSession E3/E4 test + LoginForm reason test RED→GREEN, suite 294/294.
Final: fixed busy ends before the page leaves (second write) — use-submit-once "stays busy while leaving" RED→GREEN, suite 294/294.
Final: fixed (re-graded Minor→Important: every page load PATCHes /v1/me for vi users whose browser says Asia/Ho_Chi_Minh) zone names — timezone-sync test RED→GREEN.
Final: fixed resend double click — VerifyEmailForm test RED→GREEN.
Final: minor (deferred): DateOfBirthField on Account judges "today" by the device zone, API by the profile zone (near midnight only).
Final: minor (deferred): reset-password ?email= lands in browser history (plan's route shape).
Final: e2e app+csp on Worker build after fixes: 30 passed.
M2 start: branch feat/giao-dien-nguoi-hoc-m2 from origin/dev @ c5e2536 (PR #123 merged c5e2536, owner ok 23/10).
Task 12: GC7 (same key + body replays) is the existing IdempotencyInterceptor on the route; not re-tested.
Task 12: complete (commits c5e2536..6f442b6, tests: pnpm --filter api exec vitest run src/learning →    Duration  3.80s (transform 3.65s, setup 0ms, import 17.63s, tests 104ms, environment 1ms))
Task 13: real DB check (english_learning_learner_ui): GET /v1/topics/suggestions → technology B2 15, food A2 12, daily-life A1 15, 4 samples each, vi names. Meaning = gloss (vi) / definition (en).
Task 13: complete (commits 6f442b6..1fd25f7, tests: pnpm --filter api test →    Duration  64.39s (transform 34.24s, setup 0ms, import 486.00s, tests 42.81s, environment 60ms))
Task 14: complete (commits 1fd25f7..a96b6b9, tests: pnpm --filter web test →    Duration  22.75s (transform 4.16s, setup 23.81s, import 31.29s, tests 40.39s, environment 63.90s))
Task 15: Ruling: the deck dialogs (create/rename/delete, plan Task 16 files) land with Task 15, since the Today card menu opens them; Task 16 adds their tests and the deck list — cost if wrong: none. Hero = first deck with cards waiting (priority first); no 'ôn gần nhất' line (GET /groups has no last-review time).
Task 15: complete (commits a96b6b9..e371081, tests: pnpm --filter web test →    Duration  21.76s (transform 3.42s, setup 24.29s, import 31.72s, tests 36.50s, environment 63.60s))
Task 16: complete (commits e371081..5ee7e4e, tests: pnpm --filter web test →    Duration  23.38s (transform 4.08s, setup 24.59s, import 35.03s, tests 50.20s, environment 66.24s))
Task 17: Ruling: word rows, the filter counts and the preview come from GET /groups/{id}/queue?mode=all (every card with content); group_count and sense_changed from GET /groups/{id}/items (all pages of 100). 'Đến hạn' filter = section due (the items API has no due cell). Malformed ?id never reaches the API (E17). 'Thêm từ vào nhóm' and the deck's sentence actions wait for M3 — cost if wrong: a 2000-word deck loads 20 item pages.
Task 17: complete (commits 5ee7e4e..127191d, tests: pnpm --filter web test →    Duration  23.85s (transform 4.36s, setup 22.12s, import 42.79s, tests 58.69s, environment 56.81s))
Task 18: Ruling: relearn-all fetches every backlog page and posts batches of 100 ids, each batch key = '<press key>:<n>' (any non-empty Idempotency-Key is valid); stop-learning deletes the selected items one by one (no bulk endpoint).
Task 18: complete (commits 127191d..484e7da, tests: pnpm --filter web test →    Duration  22.85s (transform 4.69s, setup 20.46s, import 44.15s, tests 54.58s, environment 56.74s))
Task 19: complete (commits 484e7da..685392c, tests: pnpm --dir apps/web test topic-picker →    Duration  6.74s (transform 243ms, setup 205ms, import 1.23s, tests 4.26s, environment 828ms))
Task 20: Ruling: the queue carries no forms; the card back reads them from GET /v1/words/{lemma} (one cached call per lemma, hidden until loaded) — no API change in M2 — cost if wrong: one extra read per card, or forms missing when the word page 404s.
Task 20: Ruling: K/22 "Ngày mai nhóm này có N thẻ đến hạn" dropped; no API gives tomorrow's due count; doneBody keeps the first sentence and shows only when a card was marked Still learning — cost if wrong: one API field + one line later.
Task 20: Ruling: highlightWord now colors the word primary + semibold (no yellow mark) to match K/21/M/31, where the saved-sentence box is already yellow; applies to the deck card preview too — cost if wrong: one class.
Task 20: Ruling: X (and Esc) end the session into the summary; on the summary X and Enter go to Today — cost if wrong: one handler.
Task 20: complete (commits 685392c..279b5c0, tests: pnpm --dir apps/web test review-session →    Duration  4.06s (transform 305ms, setup 257ms, import 1.31s, tests 1.33s, environment 906ms))
Task 21: complete (commits 279b5c0..4097ff8, tests: Docker e2e 153 passed / 15 skipped; e2e caught the K/18 chip overflow at 390 px, fixed test-first)
Final: review M2 by a fresh reviewer (opus): 0 Critical, 8 Important, 15 Minor.
Final: re-grade: Minor 5 (stage axis hard-coded "Mới" in the English UI) → Important (wrong language on screen).
Final: fixed I1 "Thêm cả" after ticking adds only the ticked — topic-picker "after ticking some words" RED→GREEN
Final: fixed I2 >100 ticked → 400 + empty deck — topic-picker "batches of 100" (both buttons, also Minor 6: no topic filter body any more) RED→GREEN
Final: fixed I3 second add re-creates the deck → name-taken — topic-picker "already named like the topic" + "next add goes to that deck" RED→GREEN
Final: fixed I4 offline-band retry refetched the review queue mid-session — review-session "keeps its cards" RED→GREEN
Final: fixed I5 stop-learning stuck after a failure halfway — backlog "failure halfway" RED→GREEN
Final: fixed I6 E18 showed the cached name — group-list "name saved elsewhere" RED→GREEN
Final: fixed I7 deck creation date in UTC — group-page "learner's day" RED→GREEN
Final: fixed I8 links to M3 pages (word page, Tra từ) — group-page + group-list "until M3" RED→GREEN
Final: fixed stage axis in English — group-page "English labels the first stage New" RED→GREEN; suite 353/353 (twice)
Final: Ruling: Minor 1 (changing the answer after a NetworkError sends a new review_id, so a press that did land counts twice) kept — the learner chose another answer; retrying the old one silently would record an answer they took back — cost if wrong: one extra review log row and a level step in a rare offline case.
Final: minor (deferred): 404 on a card removed elsewhere keeps the learner on it (only Esc leaves)
Final: minor (deferred): non-404 errors shown as empty states (review queue 5xx, topic query, backlog spinner) instead of ErrorState (E5)
Final: minor (deferred): unknown but well-formed topic code shows "Chưa có từ nào" instead of NotFound
Final: minor (deferred): WordRow remove uses a new key per press (should use useSubmitOnce)
Final: minor (deferred): delete button disabled without a message when useGroup fails
Final: minor (deferred): an empty new deck loops "Học lại cả nhóm" → empty session → mode=all
Final: minor (deferred): "Đến hạn" filter leaves out backlog cards; backlog rows say "cần ôn hôm nay"
Final: minor (deferred): suggestions SQL count(*) double counts repeated topic codes; no long client staleTime; vi samples have no definition_en fallback
Final: minor (deferred): <dd> before <dt> in Today's backlog box
Final: minor (deferred): Today's stage totals count a word twice when it is in two decks
Final: minor (deferred): overflow e2e does not mock suggestions; SuggestionCard lemma and backlogLine lack break rules
Final: minor (deferred): a long topic name can make "{topic} · {level}" exceed 60 characters
Task 22: real-stack check (verify-ge.mjs, lan.m2c): GE1 3 rows oldest first + count 3, GE2 [] + 0, GE3 404, GE4 204 + count 2; no sentence text in logs.
Task 22: complete (commits da92f9e..855674b, tests: pnpm --dir apps/api exec vitest run src/content/sentences src/content/words →    Duration  1.74s (transform 1.25s, setup 0ms, import 4.42s, tests 23ms, environment 0ms))
Task 23: Ruling: app-chrome/SearchStrip.tsx did not exist (M1 left the strip out); created here, mounted once in AppShell under both headers (main and sub pages, web and phone) inside <Suspense> because it reads useSearchParams on prerendered pages — cost if wrong: the strip shows on pages Figma draws without it.
Task 23: Ruling: no total count from GET /v1/words, so K/30's "40 từ, đã bỏ qua 3 từ chức năng" and "Còn 31 từ" are dropped; "Xem thêm" loads the next page — cost if wrong: an API count field later.
Task 23: Ruling: "Từ gần trong từ điển" (K/30 right column) dropped: no API lists neighbouring lemmas — cost if wrong: one API + one panel.
Task 23: Ruling: the preview card follows the hovered/focused row (first row by default) and reads GET /v1/words/{lemma} for topic and example; its [Thêm vào nhóm] and the row [+] come with the add-word sheet (Task 25), "Thêm cả N từ vào nhóm" with bulk add (Task 26), in the same PR.
Task 23: Ruling: strip placeholder keeps the copy-doc text "Tra trong 7.799 từ" (copy doc §16 lists it unchanged) although the number is not computed — cost if wrong: wrong number shown; flagged to the owner.
Task 23: complete (commits 855674b..1646f6f, tests: pnpm --dir apps/web test lookup →    Duration  5.04s (transform 268ms, setup 269ms, import 1.36s, tests 2.12s, environment 1.04s))
Task 24: Ruling: "Từ gần trong từ điển" dropped on the word page as on K/30 (no API); "Cùng chủ đề: X" kept, read from GET /v1/words?topic=&page_size=8 — cost if wrong: one panel.
Task 24: Ruling: a form_of base gets its own banner line "Là/Cũng là dạng chia của {base}: base · forms", the forms read from the base's word page (one extra GET per base) — cost if wrong: one request.
Task 24: Ruling: [Thêm vào nhóm] on a meaning opens a small deck dialog (POST /groups/{id}/items [I], 409 group-full shown under the deck field); Task 25's sheet with the last-used deck may replace it — cost if wrong: two ways to add one meaning.
Task 24: Ruling: "Thêm câu đã gặp" in the "Bạn đang học" block comes with the add-sentence sheet (Task 26), same PR.
Task 24: minor (noted): after deleting a sentence the focus leaves the dialog, so Esc does not close it until the learner clicks inside; the test closes with [Đóng].
Task 24: complete (commits 1646f6f..f01710d, tests: pnpm --dir apps/web test word-page →    Duration  4.56s (transform 337ms, setup 258ms, import 1.52s, tests 1.39s, environment 1.09s))
Task 25: Ruling: TopBar's Fab, QuickAddBox and an add-word context did not exist; created AddWordProvider (in AppShell main/sub; key N, top bar, phone +, Today box, [Thêm từ này], lookup row +) and today/QuickAddBox.tsx; Thêm từ is on by default (ChromeFeatures.addWord) — cost if wrong: one prop to turn it off per page.
Task 25: Ruling: "Dùng gần đây" lists only the last-used deck (the one key `wordmet-web.last-group` the plan names) instead of three — cost if wrong: a list key later.
Task 25: Ruling: K/42 is one DeckPickerDialog for a known meaning (word page) and a view inside the add-word sheet (deck field); a typed name that matches nothing shows [Tạo nhóm và lưu] (create, then save, one press); "Tạo nhóm “x”" creates and selects — replaces Task 24's interim deck dialog.
Task 25: Ruling: M2 Today test "the quick-add box is not there before M3" turned into "M3: the box opens the sheet with the word" (the M2 assertion was about M2 only).
Task 25: complete (commits f01710d..17c302b, tests: pnpm --dir apps/web test add-word word-page today →    Duration  9.28s (transform 1.20s, setup 1.53s, import 8.11s, tests 8.98s, environment 5.29s))
Task 26: Ruling: K/43 "Thêm cả 40 từ", "Thêm 38 từ" and "Cả 38 từ vào ngăn Mới; nhóm đưa ra tối đa 20 từ mới mỗi ngày" need counts no API gives before adding; the sheet says "Thêm cả loạt vào nhóm", lists the filter, and the result toast gives every count (added, already in, function words, deck full) — cost if wrong: a count endpoint.
Task 26: Ruling: [Thêm cả loạt vào nhóm] shows on the lookup page only with a catalog filter (level/topic/pos) and no search text or "Chỉ từ của tôi": the bulk body takes no q or mine, and an empty body would add the whole catalog — cost if wrong: one condition.
Task 26: Ruling: a new deck from bulk add is named "{topic} · {level} · {pos}" (as K/18's "Kinh doanh · B1"), cut to 60 characters — cost if wrong: a name.
Task 26: complete (commits 17c302b..cf19aca, tests: pnpm --dir apps/web test sentence-bulk →    Duration  5.41s (transform 313ms, setup 250ms, import 1.28s, tests 2.54s, environment 1.04s))
Task 27: complete (commits cf19aca..3b79ef7, tests: pnpm --dir apps/web test →    Duration  36.93s (transform 12.93s, setup 31.39s, import 110.15s, tests 130.19s, environment 89.67s))
Final M3: review M3 by a fresh reviewer (opus): 0 Critical, 7 Important, 14 Minor.
Final M3: re-grade: M-2 (not-found title of a long word scrolls the page at 390 px, Review Focus 2) and M-7 ("Lưu vào X" in the sheet's deck list does not save) → Important. Own finding from the screenshots: an English learner sees the definition twice (meaning = definition_en) → Important.
Final M3: fixed I-1 deck created for a word with no meaning; errors hidden in the deck list — m3-review "no deck is created" + "error … shown there" RED→GREEN
Final M3: fixed I-2 second Enter while a sentence saves showed "Đã lưu câu." and closed — m3-review "sends nothing, says nothing" RED→GREEN (delete sentence given the same guard)
Final M3: fixed I-3 w=. crashed the word page — m3-review "\".\" is not found" RED→GREEN
Final M3: fixed I-4 the deck page stayed stale after Thêm từ — m3-review "deck page cache … invalidated" RED→GREEN
Final M3: fixed I-5 the strip kept a stale level and dropped filters — m3-review "level cleared" + "keeps its topic…" RED→GREEN
Final M3: fixed I-6 sheets with no way out — m3-review "[Hủy] that closes it" ×2 RED→GREEN
Final M3: fixed I-7 one write per press tests for bulk add and the deck picker (already correct, now pinned)
Final M3: fixed M-2 long word title — m3-review "cut to 100 characters … may wrap" RED→GREEN; M-7 — "Chọn …" RED→GREEN; English definition twice — RED→GREEN; suite 399/399 (twice)
Final M3: minor (deferred): M-1 is fixed in passing (meaning field max 300 as the API); M-3 long q → error box; M-4 "/" ignores open dialogs; M-5 deleting an already-deleted sentence shows an error; M-6 sentence list errors look empty; M-8 quick add ignores created_item false; M-9 bulk add rerun → name taken; M-10 preview fetches when hidden; M-11 no lookup debounce; M-12 no busy state on "Tạo nhóm “x”"; M-14 changed form after a lost connection reuses the key (cross-cutting useSubmitOnce)
Final M3: test note: group-page "review button" waits 5 s for the deck summary (1 s was too short when the whole suite runs)
Task 28: complete (commits e99b855..1f99057, tests: pnpm --dir apps/api test → 187 files, 2458 passed; tsc and lint clean). GB8 already held (weak sessions never check the deck); not yet run against a real DB.
Handoff 23/10/2026: owner moves the work to a cloud session; ledger copied to docs/deliveries/giao-dien-nguoi-hoc-ledger.md, handoff docs/deliveries/giao-dien-nguoi-hoc-handoff-2026-10-23.md.
Cloud session 23/10/2026: resumed at Task 29 on feat/giao-dien-nguoi-hoc-m4 (Node 24.11.0, pnpm 11.6.0 installed in /opt/node24; dockerd started by hand, images from mirror.gcr.io). Workspace progress.md symlinks this file.
Task 29: migration named 20261023090000_report_reasons_order_labels (newest on dev 20261022091000). GD1 test reads the Bước 7 seed INSERT and applies the new migration's guarded UPDATEs (a regex applier; every UPDATE must match the guarded shape). Real DB (fresh english_learning_t29): migrate deploy + CI drift diff → "-- This is an empty migration."; table → other at 1000, six short English labels; GD2 by psql: other (updated_by set, position 4) and hint_wrong (admin label) unchanged after re-running the SQL, meaning_wrong (seed label, no editor) updated. GD3 holds by construction (practice_reports not touched).
Task 29: complete (commits 0924be1..939cf0e, tests: pnpm --dir apps/api exec vitest run src/practice/reports →    Duration  6.72s (transform 5.12s, setup 0ms, import 14.76s, tests 1.22s, environment 1ms))
Task 30: Ruling: Problem keeps extension members (`extensions`: resets_at, reason, result) — K/55 needs resets_at from the 403, 409 practice-no-words needs reason, Task 31 needs already-answered's result — cost if wrong: none (additive).
Task 30: Ruling: "Đang ưu tiên" card shows "N từ trong M nhóm" instead of K/51's lemma chips — no API lists priority words across decks (only per-deck queues) — cost if wrong: one read per deck or a new endpoint.
Task 30: Ruling: English name of "Từ hay sai" = "Weak words" (research §B row, shortest; design §7.2 left it open) — cost if wrong: one string.
Task 30: Ruling: K/54's two deck drop-downs ("Cần ôn hôm nay" + "Mọi ngăn") are kept, but exclusive: picking a stage resets the word filter and back, because the API takes one group_filter — cost if wrong: two controls merged into one.
Task 30: Ruling: "Thêm tùy chọn" holds the order drop-down with the 8 sorts (UI-CONTEXT §9 W/54); the start sends `sort` only when changed from the source default — cost if wrong: none.
Task 30: Ruling: side card says "đã dùng 1/3" (copy doc §6 / §17) instead of the frame's "còn 2/3 phiên"; segments for a limit ≤ 5, a bar above — cost if wrong: one string.
Task 30: Ruling: hero counts today = Σ(priority + due) over decks; 0 → "Hôm nay không còn từ nào cần ôn…" and no buttons; [Ôn thẻ] of K/55 goes to Today (/app) — cost if wrong: one link.
Task 30: Ruling: the customise dialog is the shared Dialog (sheet on phones, sticky start) rather than M/L54's full page; Dialog gained titleAside, closeLabel (×) and wide — cost if wrong: phone layout differs a little from M/L54.
Task 30: Ruling: hero frame and art live in an extra file PracticeHero.tsx (OutOfSessions reuses them); "Gần đây" shows the 3 newest answers — cost if wrong: none.
Task 30: complete (commits 939cf0e..10f98bd, tests: pnpm --dir apps/web exec vitest run src/features/learner/practice src/app-shell/api →    Duration  9.98s (transform 1.23s, setup 818ms, import 2.15s, tests 7.41s, environment 3.82s))
Task 31: Ruling: × and Esc end the session (POST finish → summary, as K/51's "Esc Dừng phiên, xem tổng kết"); leaving by navigation keeps it open (E34, pinned) — cost if wrong: one handler.
Task 31: Ruling: K/66's per-reason descriptions dropped (the reasons API has a label and a note placeholder only); K/67's "Đúng nhờ gợi ý" tile and per-word tags (sai / bỏ qua / đúng nhờ gợi ý) dropped (summary API gives correct, wrong and the listed words only) — cost if wrong: two summary fields.
Task 31: Ruling: an unopened hint row is named "Gợi ý N" (its kind is unknown until opened); K/62's "Đã biết: … lên ngăn 3 ngày" dropped (the next stage is not known before pressing) — cost if wrong: one string.
Task 31: Ruling: [Luyện thêm một phiên] starts a session with the ended session's source, deck, filter, order, types and count — cost if wrong: one link to Luyện tập instead.
Task 31: Ruling: progress segments colour only answers seen on this page; earlier ones after a reload are grey "done" — cost if wrong: an API field per item.
Task 31: Ruling: hint texts are read with POST …/hint as queries (the API only raises the level), so a reload shows opened hints again — cost if wrong: one extra request per opened hint after a reload.
Task 31: Ruling: Button carries data-variant (tests read which button is the yellow one) — cost if wrong: none.
Task 31: complete (commits 10f98bd..1b24ed0, tests: pnpm --dir apps/web exec vitest run src/features/learner/practice →    Duration  10.00s (transform 1.10s, setup 284ms, import 2.49s, tests 9.72s, environment 1.33s))
Task 32: Ruling: the start flow (K/77, K/55, practice-no-words, customise dialog) moved from PracticePage into usePracticeStarter, so Từ hay sai starts the same way — cost if wrong: none (Task 30 tests still green).
Task 32: Ruling: K/56 "5 câu gần nhất" shows "sai x/y" without the five dots (the API gives wrong/counted, not the order of the last five) — cost if wrong: an API field.
Task 32: Ruling: K/57's "Lọc theo một từ" dropped (history takes sense_id only, no text); the day filter lists all days, today and the 6 days before, in the learner's zone; "cash, rồi bỏ qua" shows the stored answer and the result chip "Sai · bỏ qua" (earlier tries are not in the API); counts chips only once every page is loaded — cost if wrong: a search field + API.
Task 32: Ruling: my reports have no lemma; each row reads GET /v1/senses/{id} (cached), a sense no longer shown → "—" — cost if wrong: one read per report row (page of 20).
Task 32: Ruling: the tab is kept in ?tab= by history.replaceState (no navigation, the page is a static shell) — cost if wrong: none.
Task 32: complete (commits 1b24ed0..7b73c02, tests: pnpm --dir apps/web exec vitest run src/features/learner/practice →    Duration  10.46s (transform 1.68s, setup 530ms, import 4.33s, tests 12.83s, environment 2.46s))
Task 33: Ruling: "tới hết {date}" shows the day before an end at local midnight (ends_at − 1 ms), so a grant ending at the start of 1/1 reads "31/12" — cost if wrong: one day off for an end at noon (none seen).
Task 33: Ruling: Trial and Pro by subscription (not drawn) get their own title/subtitle: "Bạn đang dùng thử gói Pro" / "Dùng thử tới hết …", "Gói Pro gia hạn vào …" / "… dùng tới hết …, không tự gia hạn" — cost if wrong: two strings.
Task 33: Ruling: the comparison table lists ôn thẻ, nhắc email, nhóm, phiên/ngày, câu AI, tra AI, quảng cáo with the same plan numbers; the year/month switch is a Segmented radio group — cost if wrong: table rows.
Task 33: complete (commits 7b73c02..af88a5f, tests: pnpm --dir apps/web exec vitest run src/features/learner/plans →    Duration  2.70s (transform 428ms, setup 142ms, import 1.06s, tests 629ms, environment 714ms))
Task 34: e2e found: Enter did nothing after a graded typed answer (focus stays in the read-only field) — PracticeSession test RED→GREEN, practice suite 49/49.
Final M4: review M4 by a fresh reviewer (opus): 0 Critical, 3 Important, 11 Minor.
Final M4: re-grade: Minor 6 (Esc in the answer field ends the session, no undo), Minor 7 (a right answer without a hint says "đúng nhờ gợi ý") and Minor 8 (two yellow buttons on K/64, Global Constraint) → Important.
Final M4: fixed I-1 weak words table cells out of their columns from 768 px — m4.spec "weak words by deck" row order RED→GREEN (e2e 24/24)
Final M4: fixed I-2 a changed press after a NetworkError reused the kept Idempotency-Key — use-submit-once "different payload gets a new one" + practice-session "new Idempotency-Key" RED→GREEN
Final M4: fixed I-3 hero ignored today's new words (no start on a new-words-only day) — practice-home "only new words" RED→GREEN; Task 30 ruling on priority + due replaced (hero counts priority + due + new, as the API's today source)
Final M4: fixed Esc in the answer field — practice-session "Esc in the answer field leaves the field first" RED→GREEN
Final M4: fixed note blaming hints — practice-session "does not blame hints" RED→GREEN
Final M4: fixed two yellow buttons on K/64 ([Kiểm tra] quiet while retrying) — practice-session "only [Làm lại] is yellow" RED→GREEN; web suite 461/461
Final M4: minor (deferred): a reload during try_again loses the attempt counter and [Xem đáp án] until another wrong try
Final M4: minor (deferred): a skip whose lost response landed gets already-answered without a result (generic error); item-void the same
Final M4: minor (deferred): hint request failures are silent (row stays "Gợi ý N"), and the POST runs as a query with default retries
Final M4: minor (deferred): a start pressed before GET current has loaded skips the K/77 question
Final M4: minor (deferred): "Gần đây" shows only the clock time for older answers
Final M4: minor (deferred): history day list steps by 24 h, can skip/repeat a local day around DST
Final M4: minor (deferred): the question count field cannot be cleared while typing; role spinbutton without arrow keys
Final M4: minor (deferred): English hint header has no count (design §7.1, kept as designed)

### Task 35 — Figma frames Lịch sử giao dịch (23/10/2026)

- Khung: page 08 section `472:7912` (K/95, K/95b, K/95c, K/95d, K/95 Dark, K/95b Dark), page 09 section `474:5484` (M/95, M/95b, M/95c), page 04 section
  `477:3674` (A/90, A/90b, A/90c). Node id ở `docs/mockups/2026-10-22/figma-node-ids.md`; chữ ở copy doc §17.4.
- figma-checks: 12/12 khung overflow 0, 0 nút vàng thừa, không ledge bị cắt; độ tương phản chữ nhỏ nhất web 6.46 (Dark 5.5), điện thoại 7.25, admin 4.69
  (bằng A/71 đã duyệt, đạt AA).
- Ruling: admin ghi loại "Đội cấp" thay vì "Đội Wordmet cấp" — vì ô Loại của bảng admin hẹp, chữ đủ bị cắt; admin hiểu nghĩa — giá nếu sai: đổi một nhãn
  trong `apps/admin/messages`.
- Ruling: thêm trạng thái "Đang chờ" (chip `primary-soft`) ở một dòng Gia hạn mỗi danh sách — vì plan liệt kê 4 trạng thái mà khung ban đầu thiếu một —
  giá nếu sai: đổi màu chip.
- Cổng duyệt: gửi ảnh ba section cho chủ dự án, chờ "ok" trước Task 36.
- Sửa thêm: chi tiết của dòng Gia hạn (K/95b, K/95b Dark, M/95b, A/90b) ghi "Đang chờ" cho khớp danh sách; figma-checks chạy lại, 12/12 như trên.
- Ruling: chủ dự án (23/10/2026) "kể từ về sau không cần hỏi mình, cứ triển khai mà làm" — cổng "ok" của Task 35 và các cổng xem ảnh sau không dừng
  chờ nữa; ảnh vẫn ghi lại để xem khi rảnh — giá nếu sai: chủ dự án góp ý sau, sửa khung và code ở mốc sau.
- M4 merge (PR #126, CI xanh); nhánh M4b `feat/giao-dien-nguoi-hoc-m4b` cắt từ `origin/dev` @ `dc737a4`.

### Task 36 — API (i) ghi giao dịch (23/10/2026)

- Bảng `billing_transactions` (migration `20261023100000_billing_transactions`, CHECK cho kind/interval/status/environment và "amount_minor null đúng
  khi currency null"); `NormalizedEvent` thêm `amount`, `currency` cho `subscription_started`, `renewed`, `plan_changed`, `refunded`; fake wire nhận
  `amount` (số hữu hạn) và `currency` (`/^[A-Z]{3}$/`), sai dạng thì null chứ không thành "thiếu trường"; `pnpm billing:fake-event --currency`.
- `TransactionsRepository.recordFromEvent` gọi trong transaction của bộ áp sự kiện; `toMinorUnits` theo số chữ số lẻ của `Intl`.
- Test: GI1–GI6, GI10 (repository + fake wire + applier); API unit 2477/2477; drift diff rỗng trên DB local; build xanh.
- Ruling: `plan_changed` tới trễ (stale) vẫn ghi giao dịch — vì đó vẫn là một lần trả tiền, chỉ trạng thái subscription giữ bản mới hơn — giá nếu sai:
  một dòng thừa trong lịch sử, bỏ lời gọi ở nhánh stale.
- Ruling: dòng `refund` chép `interval` và kỳ của dòng gốc; không thấy dòng gốc (giao dịch có trước bảng) thì `interval` null, kỳ bắt đầu lúc hoàn tiền,
  không có ngày cuối — vì `period_start` bắt buộc — giá nếu sai: màn ghi kỳ lạ cho vài dòng hoàn tiền cũ trên local.
- Ruling: tiền chỉ ghi khi có cả `amount` và `currency` (CHECK) — vì không có đơn vị thì không đổi ra đơn vị nhỏ nhất được — giá nếu sai: mất số tiền của
  cổng chỉ gửi số; cổng thật sau này phải gửi tiền tệ.

### Task 37 — API (i) đọc giao dịch (23/10/2026)

- `GET /v1/me/transactions` (đăng nhập, không cần hồ sơ học) và `GET /v1/admin/transactions?email&kind&from&to` (`settings.manage`); `TransactionsService`
  trộn `billing_transactions` với lần cấp gói (`kind: 'grant'`); `IdentityService.findUserIdByEmail`.
- Test: GI7–GI9, email lạ → danh sách rỗng không đọc bảng, `page_token` sai / của bộ lọc khác / của người khác → 400; API unit 2488/2488; lint, build xanh.
- Chạy trên Postgres local (script tạm, xóa dữ liệu sau): mua + gia hạn (gửi hai lần, còn một dòng) + hoàn tiền 4,99 USD (499) + lần cấp bị thu hồi;
  trang 2 dòng một lần đi đủ 4 dòng đúng thứ tự; lọc admin `kind=grant` theo khoảng ngày đúng; CHECK chặn `kind` lạ.
- Ruling: keyset trộn bằng hai truy vấn Prisma (mỗi nguồn lấy một trang sau con trỏ) rồi gộp trong code, thay cho UNION ALL của plan — vì cùng kết quả,
  giữ kiểu của Prisma và không cần TypedSQL mới — giá nếu sai: mỗi trang đọc tối đa 2×(page_size+1) dòng.
- Ruling: chỉ lần cấp `kind = 'plan'` vào lịch sử (cấp số lượt tùy ý không phải "cấp gói"); `occurred_at` của lần cấp là lúc tạo, kỳ là `starts_at` tới
  `ends_at` (hoặc lúc thu hồi nếu sớm hơn) — giá nếu sai: thêm điều kiện.
- Ruling: `from`/`to` của admin là thời điểm có múi giờ (`from` gồm, `to` không gồm); màn admin gửi ranh giới ngày theo giờ Việt Nam — vì API không
  biết múi giờ của admin — giá nếu sai: đổi sang ngày `YYYY-MM-DD` + múi giờ cố định.

### Task 38 — Màn Lịch sử giao dịch của người học (23/10/2026)

- `/app/settings/transactions` (K/95–K/95d, M/95–M/95c): bảng 7 cột từ 768px, ba dòng xếp chồng trên điện thoại, cả dòng bấm mở chi tiết (hộp thoại /
  tấm từ đáy); cột phụ "Gói học" + "Về giao dịch"; "Xem thêm" theo `next_page_token`; trống; lỗi tải + [Thử lại]. Dòng "Lịch sử giao dịch" ở Cài đặt
  bật (`SHOW_TRANSACTIONS = true`) và trỏ tới trang.
- Test: 8 test màn + test Cài đặt sửa; web unit 469/469; lint, typecheck, kiểm Tailwind thô xanh.
- Ruling: ngày cuối của kỳ trả tiền là ngày trước ngày kết thúc (15/10 09:12 – 15/11 09:12 → "15/10 – 14/11/2026", như khung); lần cấp gói kết thúc lúc
  0:00 nên lấy ngày trước 0:00, lần cấp bị thu hồi giữa ngày ghi đúng ngày thu hồi (GI7) — giá nếu sai: lệch một ngày ở cột "Kỳ được dùng".
- Ruling: mỗi dòng là một nút có tên đọc đủ cả dòng; hai bố cục (bảng / ba dòng) chỉ để nhìn (`aria-hidden`) — vì cùng dữ liệu phải hiện theo hai cách mà
  không lặp cho trình đọc màn hình — giá nếu sai: người dùng trình đọc màn hình không duyệt được theo cột.
- Ruling: chữ tiếng Anh tự viết theo luật §17.2 ("Billing change", "Granted by the Wordmet team", "Fake (test)") — chưa ai duyệt — giá nếu sai: sửa chữ.

### Task 39 — Trang admin "Giao dịch" (23/10/2026)

- `/transactions` trong nhóm Người học, chỉ `settings.manage` (admin); `Permission` thêm `settings.manage`, `entitlements.grant`; nav 17 mục (editor vẫn 12);
  bộ lọc email · loại · từ ngày · tới ngày (ngày giờ Việt Nam, cả hai đầu gồm), bảng như A/90, "Tải thêm", hộp chi tiết chỉ xem, trống A/90c, lỗi + Thử lại.
- Test: nav (17/12/17, quyền), 7 test trang; admin unit 336/336; lint, typecheck, Tailwind thô xanh; e2e mock 139 passed (shell 17 mục, a11y thêm
  `/transactions`); `mock-api` `PERMISSIONS` theo API thật (editor có `entitlements.grant`, admin thêm `settings.manage`).
- Ruling: hộp chi tiết không có "Mã subscription" của khung A/90b — vì `TransactionView` của API không trả nó — giá nếu sai: thêm một trường vào API và hộp.
- Ruling: `TextField` của admin nhận `type="date"` (ô ngày của trình duyệt) — vì admin chưa có ô chọn ngày — giá nếu sai: thay bằng ô chọn ngày khi
  refactor admin.
- Ruling: vi-VN in ngày-tháng riêng là "15-10", nên kỳ cùng năm cắt năm khỏi ngày đầy đủ ("15/10 → 14/11/2026"); bản `en` ghi đủ năm hai đầu.

### Task 40 — M4b e2e, tài liệu kiểm, chạy thật (23/10/2026)

- web `e2e/app/m4b.spec.ts` 12 passed (desktop + mobile); admin `e2e/transactions.spec.ts` 4 passed, cả bộ e2e admin 139 passed; `learner:setup
  --transactions` gửi ba sự kiện cổng giả qua webhook thật (mua, gia hạn, hoàn tiền gia hạn) → 4 dòng (cùng lần cấp Pro); chạy lại bỏ qua.
- Bộ ảnh `SHOTS_MILESTONE=m4b` (24 ảnh: danh sách và chi tiết × vi/en × sáng/tối × 390/1024/1440) trên API thật, app `:3001`.
- Minor (để lại): ở 1440 cột "Kỳ được dùng" của dòng cấp gói xuống hai dòng ("23/10 –" / "22/11/2026") vì bảy cột chia đều.

### Final M4b — reviewer (23/10/2026)

- Reviewer mới (opus): 0 Critical, 2 Important, 5 Minor. Sửa một lượt, test trước (`test(api): reproduce the m4b review findings`), rồi sửa:
  - I1: sự kiện lưu trước khi có `amount`/`currency` (không có hai khóa) làm `toMinorUnits` ném lỗi → cả sự kiện thất bại, gói không đổi. Giờ thiếu,
    sai dạng, âm hoặc vượt số nguyên an toàn → không ghi tiền, sự kiện vẫn áp (gộp luôn M1).
  - I2: lần dùng thử bị từ chối (B5E55) hoặc sự kiện bắt đầu dùng thử lặp cho subscription đang chạy vẫn ghi dòng "Dùng thử · Thành công". Giờ chỉ
    ghi khi lần dùng thử thật sự bắt đầu.
- Minor để lại: M2 hoàn tiền nhiều lần / hoàn tiền tới trước giao dịch gốc / hoàn tiền lại sau khi hủy hoàn tiền làm lệch trạng thái; M3 `page_token` tự
  chế với id không phải uuid trả 500 thay vì 400, con trỏ chỉ giữ mili giây; M4 lần cấp bị thu hồi trước ngày bắt đầu hiện kỳ ngược; M5 admin: Từ ngày
  sau Tới ngày báo lỗi chung, bấm Lọc lần hai không tải lại, nhãn gói cố định "Pro", `entitlement_grants` chưa có chỉ mục theo `created_at`.

## M5a (nhánh `feat/giao-dien-nguoi-hoc-m5a`, cắt từ `origin/dev` @ `255e2ee`)

### Task 41 — API (f) báo lỗi câu AI về từ riêng không cần ô đồng ý (23/10/2026)

- Bỏ kiểm `share_private_word` và lỗi `share-consent-required`; body vẫn nhận trường này (zod `optional`) nhưng không truyền vào service. Test GF1, GF2,
  GF4 mới; B7E79 đổi thành GF1, B7E81 ghi thêm GF3; `smoke-buoc-7.mjs` đổi bước B7E79 thành "gửi được không cần đồng ý".
- Ruling: giữ câu báo lỗi `share-consent-required` trong `apps/web` (`problem.ts`, `messages`) — vì API cũ có thể còn trả — giá nếu sai: vài dòng thừa.

### Task 42 — Công tắc "Kiểu câu có AI" trong Tùy chỉnh phiên (23/10/2026)

- `AiTypesToggle` (công tắc + nhãn Pro, ba ô AI cùng cỡ, dòng "Phiên này dùng tối đa N lượt câu AI · còn M"); Miễn phí: công tắc khóa, bấm → dòng D6;
  nhớ bật/tắt ở `localStorage` `wordmet-web.ai-types` (`on`/`off`, đọc ghi bọc try/catch); bắt đầu gửi `types` gồm kiểu AI, không bao giờ `cloze_source`.
  Lỗi khi mở phiên: 403 `ai-quota-insufficient` → K/71 (cần, còn, lúc nạp theo D15), 503 `ai-unavailable` → câu chung D11, cả hai có [Bỏ kiểu câu có AI];
  403 `entitlement-required` → công tắc khóa + dòng D6 + đọc lại `/me/entitlements` (E24).
- Test: 6 test mới (`ai-toggle.test.tsx`); web unit 475/475; lint, typecheck xanh.
- Ruling: N = ceil(số câu × số kiểu AI ÷ tổng số kiểu) như API (Bước 7 §6.1 bước 4), là mức tối đa; số thật (`ai_planned`) ≤ N — giá nếu sai: dòng lượt
  ghi cao hơn số dùng thật.
- Ruling: nhãn Pro cạnh công tắc hiện cả với gói Pro/Dùng thử (khung K/70 có), không có ổ khóa; gói Miễn phí có ổ khóa (ProBadge).
- Ruling: tắt công tắc xóa hộp K/71/K/72 và ghi `off`; bật lại thì cả ba kiểu AI vẫn như lần chọn trước trong hộp.

### Task 43 — Trạng thái AI trong phiên luyện (23/10/2026)

- `preparing` → K/73 "Đang tạo câu…", gọi lại `next` sau `retry_after_seconds`; cộng dồn thời gian chờ ≥ 60 giây → câu chung "Hệ thống đang gặp lỗi."
  (E29). Mỗi câu hiện lên → `POST …/prepare` một lần, không chờ, bỏ qua lỗi (chỉ phiên có kiểu AI). `ai_unavailable`: `ai-failed`/`ai-unavailable` →
  câu chung D11 + [Thử lại] (`{retry_ai:true}`) + [Để sau]; `quota-exhausted` → K/74b "Hết lượt câu AI" + lúc nạp (D15) + [Để sau]; `plan-required` →
  K/74c + [Để sau]; kèm `word-not-recognized` → "AI chưa nhận ra từ “…” bạn tự thêm." + link tới trang từ. Dải trên câu: `ai-fallback` → "Câu này
  chuyển sang kiểu câu thường." (K/75b khi hết lượt, có lúc nạp), `word-not-recognized` → K/76 + link; đóng được.
- Test: 13 test (`session/ai-states.test.tsx`, đồng hồ giả cho 60 giây); web unit 488/488; typecheck, lint xanh.
- Ruling: K/74b, K/74c chỉ có [Để sau] (thử lại không giúp được tới khi có lượt / có gói); K/74a, K/74d có [Thử lại] + [Để sau] — như ghi chú "sửa sau
  review cuối" của bản chữ 7.6.
- Ruling: lemma của từ riêng đọc bằng `GET /v1/senses/{id}` (API không gửi lemma kèm `word-not-recognized`); link tới trang từ `/app/word?w=` vì "Từ của
  tôi" có ở M5b; chưa có lemma thì dải `word-not-recognized` chưa hiện — giá nếu sai: dải hiện trễ một nhịp.
- Ruling: dải thông báo mất khi trả lời câu đó (kết quả thay chỗ) — API chỉ gửi một lần mỗi phiên.
