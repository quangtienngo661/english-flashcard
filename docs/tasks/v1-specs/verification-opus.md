# Independent verification — v1-specs

**Date:** 2026-10-04 · **Reviewer:** independent adversarial pass (Opus 5.5) · **Scope:** the 8 specs + README in
`docs/specs/`, `DECISIONS_2026-10-04.md`, `SPEC_PLAN_AND_DECISIONS_2026-10-04.md`, `RESEARCH_AI_QUOTA_MODELS_2026-10-04.md`,
the run artefacts in `docs/tasks/v1-specs/`, the preparation drafts, and the two wordlist CSVs.
Only this file was written. No spec was edited. No git command was run.

**Checks that were run:**

- **A (fidelity):** every K/N/F cited in a spec was read in the decision files (DECISIONS §1, §5, §8, §9; SPEC_PLAN §3, §7) and
  compared with the spec sentence that cites it.
- **B (contracts):** each module's "Cross-module contract notes" was compared with the counterpart module's notes and rules.
  Every number that appears in two or more files was tabulated. The system-spec write map was compared row by row with each
  module's rules.
- **C (logic):** scenarios were traced by hand from the rule text: Leitner schedule, reservation × AI deadline × idempotency,
  refresh rotation, account deletion, pipeline keys and revert, and grading.
- **D1 (data):** three Python scripts were run over the CSVs (paths in §4).
- **D2 (sources):** raw text was downloaded and searched where possible: RFC 9700/9457/8252 `.txt`, the NestJS doc markdown
  source on GitHub, the OWASP Forgot-Password/Authentication/Session HTML, NIST 800-63B-4 and Google OIDC. The other pages
  were read through WebFetch.
- **E (template):** criteria and edge cases were counted per spec, every Cites ID was resolved, criteria were scanned for
  mechanism words, and a Defense Analysis (DA) coverage matrix was built (Appendix C).
- **F (calibration):** every `verified`/`documented` marker and every numeric statement was compared with what was re-run or
  re-read.

Third-party sources below are paraphrased with exact locations (section or line numbers), not quoted at length. Spec text is
quoted verbatim.

---

## 1. Summary

**Findings by severity:** **0 blocker · 19 major · 31 minor · 8 nit** (58 findings). 55 are CONFIRMED (read in the text, re-run
on data, or read in a source this session). 3 are SUSPECTED (F32, F47, plus the impact half of F18 and F29).

**The 5 most important problems**

1. **Four owner decisions are contradicted without being declared, and in two places by criteria that cite those same
   decisions.**
   - K11: browse hides function words by default (CR12, C4), and hand-added function words are studied and practised (LR3,
     L5, LE9, PRC20). This also contradicts CR10.
   - K24: the practice session order puts "others" before "new" (PRC20, Q23).
   - D20 never reached Learning: LR6 still says every correct Practice answer is `remembered` (F01–F04).
2. **Retrying an AI question cannot work as specified.** A retry with the same key after a transient failure gets the stored
   failure back forever (SR8, AR5, ER5). The one-time regeneration in PRC5 reuses an operation_id that AR5 deduplicates (F11,
   F12). Nobody owns the `ai.lookup` reserve/confirm/release cycle (F10).
3. **The Content Pipeline row-key design breaks content integrity.**
   - A CSV row for a second meaning becomes a revision of the existing published sense under the same sense ID (F06).
   - Revert leaves the dedupe keys behind, so re-importing the same file imports nothing, and revert deletes entries that other
     batches use (F07).
   - The 5,000-row cap and the required `lemma` column would refuse the 7,799-row CEFR-J file (F05).
   - The "verified" data survey missed 58 duplicate keys in Octanove, 21 of them with conflicting levels (F09).
4. **Identity security gaps that a test suite built from these criteria would not catch.**
   - Reset OTP has no cumulative failure cap: about 19.7 % per targeted account per year at the permitted rate, while NIST caps
     at 100 consecutive failures (F15).
   - The Google ID-token signature check is absent (F17).
   - Mail can be sent to arbitrary addresses with no global budget, so the 2,000/day quota can be exhausted (F18).
   - Data can be written back after "immediate" account deletion through still-valid access JWTs (F14).
   - The anti-enumeration claim for registration does not hold, because an unverified account can log in immediately (K7-B)
     (F16).
5. **Evidence strength is overstated.**
   - Every spec footer calls K#/N#/F# "quyết định hoặc mặc định đã duyệt", but DECISIONS labels N7–N11 `ASSUMPTION`, N12
     "Mở" and N13 "Đề xuất", and SPEC_PLAN marks F-numbers `ASSUMPTION`. The review schedule and the weakness rule are
     assumptions by the owner's own record (F19).
   - Data counts are wrong in places: R4 should be 10, not 11; D10 should be 154, not 155; R6 overstates what the slash rows
     are (F37, F38).

**Overall judgement:** **Not ready for owner sign-off as written. Ready for owner review only alongside this report.**
- The structure, template compliance, citation hygiene and cross-spec numbers are good (§3).
- The declared divergences D12/D13/D14/D18/D20/D21/D22 are declared honestly.
- F01–F04 and F19 need the owner's call; the specs as written would silently reverse explicit owner choices.
- F05–F18 are logic and security defects that would be built as bugs.
- None is a blocker: each has a local fix. A correction pass on the 19 majors is needed before any module goes to `build-feature`.

---

## 2. Findings

Severity: blocker / major / minor / nit. Status: CONFIRMED (checked) or SUSPECTED (reasoned, not checked).

### Major

| ID | Sev | Type | Location | What is wrong | Evidence | Suggested fix | Status |
|---|---|---|---|---|---|---|---|
| F01 | major | contradiction, wrong-citation | content CR12, C4 | CR12: browse "mặc định **loại** entry có cờ từ chức năng (có tham số bao gồm)". C4: "when the learner browses by level, they are not [returned]". K11 says function words are not in the learning set "nhưng **vẫn hiện khi tìm kiếm và duyệt danh sách từ vựng**". DECISIONS §5 amends F16 the same way: "Từ chức năng **vẫn hiện** khi tìm kiếm và duyệt; chỉ bị loại khỏi bộ học". C4 cites K11 for the opposite of K11. This is not declared in §9 or in decision.md | DECISIONS K11 row; §5 F16 row; SPEC_PLAN §7 "Cập nhật lần 2", K11 "(có thể gắn nhãn)" | Browse shows function words by default, with a label. Keep the exclusion only for bulk-add, study sessions and question source. Rewrite C4 | CONFIRMED |
| F02 | major | contradiction | content CR10 vs learning LR3, L5, LE9; practice PRC20/PRC21 | K11 and CR10 exclude function words from "phiên học" and "nguồn câu hỏi". LR3 says "mục học đã thêm tay thì được học bình thường"; L5 says "studied like any other"; LE9 puts them in "today". PRC20's exclusions are only "retired, bị ẩn hoặc bỏ publish", so a hand-added `in` gets flashcards and Practice questions. The Content and Learning specs disagree with each other, and neither declares a divergence | K11; CR10; LR3/L5/LE9; PRC20 text | Owner chooses one: (a) hand-added function words stay in groups but are excluded from sessions, today and Practice (K11 literally), or (b) an explicit hand-add overrides the exclusion, recorded as a new §9 divergence. Then align CR10, LR3/L5/LE9 and PRC20 | CONFIRMED |
| F03 | major | contradiction (cross-module) | learning LR6 vs practice PRC16, PRC17, Q24 | LR6: "Từ Practice: bài làm đúng là `remembered`, sai là `forgotten`", so every correct answer advances. PRC17/Q24 (D20): a correct multiple-choice or true/false answer must not advance. D20 is listed in §9 only against PRC17. A Learning implementer who follows LR6 brings back the guessing inflation that D20 removed, and the contract does not say which module maps exercise result to schedule outcome | LR6; PRC17; DECISIONS §9 D20 row | Make Practice the only mapper (it sends `remembered` only for production types) and rewrite LR6. Add a Learning criterion that Learning applies whatever outcome Practice sends | CONFIRMED |
| F04 | major | contradiction, wrong-citation | practice PRC20, Q23 | K24: "theo thứ tự yếu và đến hạn, rồi đến hạn, rồi từ mới". PRC20/Q23: "weak and due, due, **others**, new". Non-due, non-new words are placed before new words, so in a large group a 5–20-question session rarely reaches new words. Q23 cites K24. Not declared | DECISIONS K24; PRC20; Q23 | Follow K24: new words right after due words; "others" after new words or excluded. Or declare this as a divergence for the owner to confirm | CONFIRMED |
| F05 | major | contradiction | pipeline PR14, PE1, P20, PR1/P1, DA "Phương án thay thế" vs PR2/P2/P3, F25 | PR14: "Tối đa 5.000 dòng và 5 MB mỗi file … thiếu cột bắt buộc (`lemma`, `pos`) thì từ chối cả file". The CEFR-J source has **7,799** data rows and header `headword,pos,CEFR,CoreInventory 1,CoreInventory 2,Threshold` (no `lemma`). Read literally, the primary source import is refused before processing. The DA paragraph repeats "tối đa 5.000 dòng". PR1/P1 likewise require a version and licence "trước khi nhập" without separating owner-authored CSVs from third-party sources | Re-run: 7,799 rows; header printed (Appendix A) | Scope PR14/PE1/P20 (and the licence part of PR1) to authoring CSVs. Give source imports their own limits and columns (`headword,pos,CEFR`) | CONFIRMED |
| F06 | major | logic-bug | pipeline PR5, PR8, PR9, PR3/PE2; violates SR2, SR6, F14 | The row key is `(lemma, POS)`. Take an authoring row for a second meaning: `bank`,`noun`, context_label "địa lý", gloss "bờ sông", no `sense_id`. It matches the published financial sense, so "cùng khóa dòng nhưng nội dung đổi thì ghi revision mới theo PR8" turns it into "revision bản nháp của sense đó (cùng sense ID)". Once published, the financial sense ID carries the river meaning, and learners' progress moves to a different meaning with no warning. The only CSV path to a second sense is `replace_meaning`, which retires the first. PR3/PE2 also reject a second row with the same `(lemma, POS)` in one file even when it carries a different `sense_id` | Trace of PR9 + PR8 + PR5; CR6 says the model allows several senses | Add a sense discriminator: `sense_id` required to edit; an explicit "new sense" column, or `context_label` in the key, to create. Refuse rows that would change an existing sense's meaning without `sense_id` | CONFIRMED (trace) |
| F07 | major | logic-bug | pipeline PR16, PR9, P18; content CR20 | (a) Dedupe keys outlive a revert. Revert a batch, re-import the same file: every key is found, every row is "unchanged", nothing is recreated. The DA plans exactly this test ("Hoàn tác một lô rồi nhập lại") but no rule removes keys. (b) Entries are shared across batches: CR20 makes Octanove rows "cập nhật chứ không tạo entry mới" on CEFR-J entries, and authoring drafts and editorial levels attach later. Reverting the CEFR-J batch therefore deletes entries that carry other batches' level records and drafts, or fails on a foreign key | PR16; PR9 "Cùng khóa thì bỏ qua"; CR20 | Revert also deletes the batch's row keys. Define revert per record (the level records and drafts the batch created). Skip or refuse entries that other batches reference | CONFIRMED (trace) |
| F08 | major | gap (ambiguity) | pipeline PR6, P15 | "hệ thống tạo entry nếu chưa có và một sense draft rỗng cho mỗi từ …; từ đã có thì báo 'đã tồn tại' và không tạo mới" contradicts itself when the entry exists without a sense. That is the normal state of every CEFR-J/Octanove word after PR2, which "không tạo sense". Read literally, the UI half of K1's hybrid cannot start authoring any imported word. `pos` is "tùy chọn" although entry identity requires POS (CR1, CR20), so "từ đã có" is undefined for `bank` (noun + verb) | PR2; PR6; P15 | Define: entry exists and has no sense → create an empty draft; a sense exists → report it. Make POS required, or let the owner pick among POS | CONFIRMED (text) |
| F09 | major | gap, evidence | research R1–R8; pipeline PR3, PE2, PR4; content CR8 | The "verified" data survey missed that Octanove has **58 duplicated (headword, pos) keys** (60 extra rows; `envisage` verb ×3). **21** of them have conflicting levels (C1 vs C2). There is also a `notes` column (45 rows) that separates senses: `cast` verb is "hire actors" / "say or suggest something". PR3 ("giữ dòng đầu và loại dòng sau") fixes the level by file order (C1 for all 21) and drops the notes. The analogous cross-source conflict (PR4) keeps both records and flags them for the owner | Re-run: 58 keys, 37 same level, 21 different (Appendix A) | Add to research.md. Treat conflicting in-file duplicates like PR4 (keep both level records, flag for review). Carry `notes` as an authoring hint | CONFIRMED (data) |
| F10 | major | gap (cross-module) | content CR15, C14; learning LR9; entitlements ER5, ER6, ER15 + notes; ai-integration notes | Only `ai.practice` has an orchestrator that reserves, confirms and releases (Practice). For `ai.lookup` no spec says who reserves, with which operation_id, or when the unit is confirmed (on AI success, or on the learner's confirmation?). AI Integration assumes "bên gọi đã giữ chỗ trước khi gọi". Content's CR15/C14 only check the entitlement. LR9's `Idempotency-Key` covers only the confirmation, not the lookup request. Built as written, AI lookups are either free or charged twice, and repeated lookups (page refresh) each call the provider | Grep: `ai.lookup` appears only in ER1, E2 and the Content/Entitlements notes | Name the orchestrator (Learning for quick-add, or Content). Define reserve → `lookup_word(op_id)` → confirm on success / release on failure, and where the op_id comes from (the client key) | CONFIRMED |
| F11 | major | logic-bug | system SR8; ai-integration AR4, AR5; entitlements ER5, E10; practice PRC5, QE9 | A retry of the same request after a transient failure can never succeed: (1) SR8 returns "kết quả đã lưu", and R12 (Stripe) saves the first result even for errors; (2) AR5 returns the stored `transient_failure` and does "không gọi provider lần hai"; (3) ER5 ("Cùng `operation_id` luôn cho cùng giữ chỗ") returns the hold that was already released. Yet AR4 calls the failure "có thể thử lại sau", and QE9 tells clients to reuse the key on a real retry | Trace. Stripe idempotency page: the first status code and body are saved whether the request succeeded or failed, 500s included | Specify one of: transient failures are not cached under the key; or a user-initiated retry uses a new key. AI operation records cache only successes and permanent failures. Define whether a released reservation can be re-acquired | CONFIRMED (trace + source) |
| F12 | major | logic-bug | practice PRC5 step 4, Q16; ai-integration AR5 | "kiểm rule (PRC6), không đạt thì sinh lại **một lần**". If the regeneration reuses the request's operation_id, AR5 returns the cached invalid output: there is no real regeneration, and Q16 always fires. If it uses a new id, its derivation is unspecified, so a client retry of the whole request can trigger extra provider calls | Trace of PRC5 + AR5 | Define derived ids (e.g. `<key>:gen1`, `<key>:gen2`) stored in the idempotency record | CONFIRMED (trace) |
| F13 | major | logic-bug | practice PRC4, Q19; content CR14, C17, CR22; contrast practice QE4 | PRC4 accepts "dạng đúng như trong câu **cộng** các dạng được chấp nhận của sense (CR22)". CR22's default includes the lemma. So for "We deployed the app yesterday" → "We ___ the app yesterday", typing `deploy` is graded correct, which is the error QE4 calls wrong for AI cloze. CR14 also requires the sentence to "chứa lemma hoặc một dạng đã biết". With no inflection source (CR16), token matching rejects most real sentences (`bought` for `buy`), and substring matching produces broken masks ("We ___ed …"). K19's core flow (save the sentence you met) depends on this | Text trace | Accept only the form found in the sentence plus its spelling variants. Define match and mask as whole-token matching on lemma, variants, accepted forms and PRC7 forms. When nothing matches, store the sentence but mark it unusable for learner_cloze, instead of rejecting it | CONFIRMED (trace) |
| F14 | major | security / logic | identity IR13, IR17, IR18, I23; system SR11, S10, SE1, cross-module note "Identity chạy cuối cùng và thu hồi phiên" | Ordinary requests accept any unexpired access JWT for up to 15 minutes after revocation (IR13). Only admin operations check the session chain (IR17). Scenario: during account deletion, another device holding a valid JWT sends a flashcard mark (LR8 "ghi ngay"). That recreates Learning rows after Learning's purge. Identity deletes the user last, which leaves either orphaned personal data after "xóa ngay" (K3) or a foreign-key failure that IR18 retries forever. SE1 covers only in-flight AI calls and jobs. The ordering also disagrees: the system note revokes sessions last, IR18 revokes them first | Rule text (IR13 accepts the 15-minute lag; IR17 scope) | Reject writes from users in "đang xóa" (per-request user-state check, or a 15-minute deny-list). Run module purges after the access-token TTL, or re-run them at the end. Align the order in system-spec | CONFIRMED (gap; scenario traced) |
| F15 | major | security, calibration | identity IR4, IR7, I5, I6, DA "Đoán OTP" | 5 attempts per code × 5 codes per hour per email = 25 guesses an hour, with no cumulative cap. A correct reset OTP plus a new password is a takeover, and on a Google-only account it also adds a password (IR7). At the permitted rate the success odds are about **0.06 %/day, 1.8 %/30 days, 19.7 %/year** per targeted account. NIST 800-63B-4 subjects issued recovery codes to the §3.2.2 throttling rule (at most 100 consecutive failures per account, then disable); the spec's limits pass 100 in 4 hours. Attempt counters are not required to be atomic, so parallel guesses can exceed 5 per code. The DA states only "5 trên 10^6" per code | Computed (script, §4). NIST 800-63B-4: issued-recovery-code paragraph and §3.2.2 | Add a per-account cumulative failure cap (e.g. at most 100 consecutive, or N per day) that locks reset until a cool-off or owner action. Count attempts atomically. State the cumulative risk in the DA | CONFIRMED |
| F16 | major | security, calibration | identity IR2, I1, I2, DA "Dò email…", IR6, I11 | IR2/I2 claim identical registration responses prevent enumeration. But K7-B makes a new account usable at once ("the Free features can already be used", I1). So "register X with password P, then log in with P" succeeds exactly when X was new. OWASP's enumeration-safe registration pattern assumes activation by email before use. Also unspecified: the response for a locked account (OWASP: generic regardless of locked or disabled), and that OTP/429 limiters key on the email string whether or not an account exists | OWASP Authentication cheat sheet, sections on authentication responses and the account-creation example; I1 | Owner decision: accept enumeration explicitly, or require verification before first login. State the locked-account response and the limiter keying | CONFIRMED |
| F17 | major | security | identity Constraints (Google row), IR8, I13; research R24 | Only `iss`, `aud`, `exp` (plus `email_verified`) are required. Signature verification against Google's keys, the first step in Google's own validation list, is never required. R24 recorded the same incomplete list. A forged token with correct claims passes every criterion | Google OIDC page, "Validating an ID token" list (signature, iss, aud, exp, hd). Grep: no "signature"/"chữ ký" anywhere in specs | Add signature verification (JWKS) to the constraint, IR8 and I13 ("a forged or unsigned token is refused"). Fix R24 | CONFIRMED |
| F18 | major | security (abuse) | identity IR2, IR4, IR7, IR19, IR20; Constraints "Workspace tối đa 2.000 thư/ngày" | Anyone can make the app email arbitrary addresses: registration OTPs, resends (5 per hour per email), "đã có tài khoản" mails, reset OTPs. Limits are per IP and per email only; there is no global daily send budget, even though the Constraint records the 2,000/day cap (the source also caps external recipients at 3,000/day). Rotating addresses exhausts the quota, so all OTP/reset mail fails for the rest of the day while IR19 answers "vẫn như thành công". Unsolicited OTP mail also raises spam complaints, and Google requires a spam rate below 0.3 % | Gmail Workspace sending-limits page; Google sender guidelines; IR19 | Add a global and per-IP daily send budget with an alert below the provider cap. When exhausted, degrade explicitly (e.g. refuse new registrations) instead of reporting silent success | CONFIRMED (gap); impact SUSPECTED (not run) |
| F19 | major | calibration | footers of all 8 specs ("**K#, N#, F#** — quyết định hoặc mặc định đã duyệt"); README; e.g. L8 (N8), L11 & LE1 (N9), Q22 (N10), C16 (N13), CE6 (N12), I11 (F7), A3 (F28), P10 (F24); ER7 | DECISIONS labels N7–N11 `ASSUMPTION`, N12 "Mở", N13 "Đề xuất". SPEC_PLAN §3 says F-numbers are `ASSUMPTION` (F6, F7, F24 and F28 say "(ASSUMPTION số)" themselves). ER7's hard stop comes from K18's undecided option A. Criteria citing these read as decided. The review schedule (N7–N9) and the weakness rule (N10), which make up the retention core, are assumptions by the owner's own record | DECISIONS N-table labels; SPEC_PLAN §3 intro and F rows | Footer: state the label each N/F carries. Tag such rows "(ASSUMPTION per DECISIONS)" so the citation sweep shows them as assumptions | CONFIRMED |

### Minor

| ID | Sev | Type | Location | What is wrong | Evidence | Suggested fix | Status |
|---|---|---|---|---|---|---|---|
| F20 | minor | contradiction | system "Bản đồ ghi dữ liệu" vs content CR4/CR19, pipeline scope & notes; ai AR5/AR10; entitlements ER11/ER14; learning LR9 | The map gives Pipeline "job, bản nháp; chỉ đẩy lên Content qua thao tác publish". The Content and Pipeline specs make draft senses Content's, with Pipeline writing through Content's create, update, level, flag and publish operations. Writers missing from the map: AI Integration's operation-result store (AR5) and budget state (AR10), the Entitlements budget tracker (ER14) and the billing-event inbox (ER11). LR9 says Learning "lưu câu ngữ cảnh"; the map gives context sentences to Content | Text | Update the map row by row | CONFIRMED |
| F21 | minor | gap | entitlements ER14, E16, EE8; ai AR10, A14; practice PRC5 step 2 | Two modules claim the budget cap and kill switch. AI Integration checks them "trước khi gọi provider", but a bank hit never calls AI Integration. So with the switch off, bank questions are still served and charged, which contradicts EE8 ("AI features answer 'temporarily unavailable'") | Trace | One owner for switch and budget, checked at reservation time for every AI feature | CONFIRMED (trace) |
| F22 | minor | security | identity IR11, IE1, DA; N2; D13 | RFC 9700 §4.14 is now readable: any reuse of a rotated token signals a breach and the active token is revoked, with no grace window. The NestJS guide also treats a second use as theft. IR11's 10 s grace lets a thief who replays inside the window receive the same new pair silently. Returning "đúng cặp token đã cấp" means keeping the plaintext successor, which clashes with "lưu dạng hash" (N2). The spec does not say that a logout or password change during the grace window wins | RFC 9700 .txt §4.14.2 (lines 1965–2010); NestJS doc source lines 1071, 3338 | Keep the grace window but store only a short-lived encrypted successor, refuse it once the chain is revoked, and log grace hits. Update D13/N2 now that §4.14 has been read | CONFIRMED |
| F23 | minor | security | identity IR14, I20 | A password change keeps the current chain unchanged. OWASP Session Management requires renewing the session identifier after privilege changes, password changes included. A thief holding the current chain's refresh token keeps access | OWASP Session Management, section on renewing the session ID after privilege changes | Move the current device to a new chain on password change | CONFIRMED |
| F24 | minor | gap (security) | identity IR7, IR9, IR14 | No notification mail is sent when a password is reset or changed, when a password identity is added to a Google-only account, or when Google is linked. OWASP recommends emailing the user after a reset | OWASP Forgot Password cheat sheet, reset-process steps | Add rate-limited notification mails for these events | CONFIRMED |
| F25 | minor | security | identity IR18 ("đăng nhập Google mới trong vòng 5 phút") | A freshly issued ID token (`iat`) does not prove the user re-authenticated, because Google can issue it from an existing session. `auth_time` is present only when requested and enabled | Google OIDC claims table (`auth_time`) | Request re-authentication (prompt/max_age) and check `auth_time`, or accept the risk explicitly | CONFIRMED |
| F26 | minor | contradiction | entitlements ER7 vs EE3; ER5, ER12 | ER7 says "Không có vượt mức", but EE3 counts a confirmation that arrives after expiry. Example with L = 10: R1 expires, R2 reserves and confirms the 10th unit, then R1's late confirmation makes it 11. The reservation state machine is undefined: reserved → confirmed/released/expired; expired → confirmed (EE3); released → ? | Trace | Define the transitions. State the bounded overage explicitly, or refuse late confirmations and deliver the result for free | CONFIRMED |
| F27 | minor | logic | learning LR7, L11, LE1; N9 | If "today" is recomputed per request, after 50 reviews the next request shows the next 50 overdue items, so the daily cap never binds. That contradicts "phần còn lại … chuyển sang ngày sau". No rule says where today's count is kept, or whether group sessions and Practice outcomes count toward it | Trace | Define a per-day counter (e.g. `review_outcome` records from "today" for the local date) and what counts toward it | CONFIRMED (trace) |
| F28 | minor | gap | practice PRC16; identity IR18 | Both require "thử lại cho đến khi xong" across a crash, which needs a durable record (an outbox or a job). SPEC_PLAN K2 lists outbox as signal-only (not V1), and BullMQ is limited to content jobs | Text | Update the schedule in the same transaction as the attempt (possible in a monolith), or name the durable mechanism | CONFIRMED |
| F29 | minor | gap | system SR8; practice PRC5, PRC15 | SR8 does not cover (a) a duplicate that arrives while the first request is still running (Stripe does not save these; it reports a conflict), or (b) key scope per user and endpoint (otherwise a buggy constant key returns another user's stored result). Question creation can take about 90 s (2 × 45 s under AR3), longer than many client or proxy timeouts (an assumption, not verified here), so in-flight duplicates are expected | Stripe idempotency page; AR3 arithmetic | Add an in-flight rule (409 or wait) and key scoping. State an end-to-end time budget for creating a question | CONFIRMED (text); impact SUSPECTED |
| F30 | minor | logic | ai-integration AE4, AE6, AE7; AI DA row "Provider có kết quả nhưng DB chưa ghi" | **AE4:** a 19.9 s first attempt plus a 20 s retry fits inside 45 s unless backoff exceeds 5.1 s, so the stated outcome needs an unstated rule. **AE6/DA:** if the database failed, nothing was stored by operation_id, so asking again "without a second paid call" is impossible; it only works if the AI result was saved before a later write failed. **AE7:** the tokens and cost of a timed-out call are unknown, so the cost log and the ER14 budget undercount | Arithmetic; text | State the retry-fit rule. Split AE6 into its two cases. Log timed-out calls with an estimated cost | CONFIRMED |
| F31 | minor | logic | practice PRC9, Q26, PRC5 | When translation fails for a valid bank question, the unit is released and the learner gets "chưa tạo được" instead of a fallback. The order of translating versus confirming is unspecified, so a charged-then-failed path exists. Two learners can add a translation to the same question at the same time (double cost). The shared translation gets only AR9's shape check, yet every later learner of that language sees it | Text | Translate before confirming; define a fallback; allow one translation in flight per (question, language); give translations a report path | CONFIRMED |
| F32 | minor | logic | practice PRC5, PRC8, Q28 | Two concurrent new-question requests for the same sense (two devices, two keys) can both pick the same unseen bank question. The learner then sees it twice and pays twice, against "không gặp lại câu đã gặp" | Reasoning | Claim the bank question atomically per learner (unique (learner, bank question)) | SUSPECTED |
| F33 | minor | logic | practice PRC18, PRC19, Q20, Q22; N10 | It is unclear whose attempts stop counting after a report: Q20 says "that attempt" (the reporter's), while Q22 and N10 say all attempts on a reported question. Also unspecified: what happens when the owner restores the question, and whether excluded attempts make the 5-attempt window reach further back | Text | Define per N10 (all attempts while the question is reported or hidden), plus the restore rule and the window rule | CONFIRMED |
| F34 | minor | gap (cross-module) | content CR23, C24; learning LE5, LR11; practice (none); content notes | CR23 promises that Learning and Practice remove the items, schedules, questions and attempts of a deleted private word. Practice has no such rule, so snapshots holding the private lemma and gloss survive. LR11 keeps log records "không xóa trừ khi xóa tài khoản", leaving dangling sense IDs. Content's notes promise retire notices only to Learning, not to Practice (PRC26 needs them) | Text | Add a PRC rule and the matching notes; state how the log is handled | CONFIRMED |
| F35 | minor | logic | practice PRC3, Q1, QE2; content CR1, CR13, CR20; pipeline PR5/PR6 | The "same lemma" exclusion becomes case-sensitive under CR1, so `March` (A1 noun) and `march` (B1 noun) can appear together once the band widens to ±2. "Cùng nghĩa" cannot be computed, so a synonym distractor yields two correct options. Private targets may lack POS or level (CR13), leaving "same POS, ±1 level" undefined. Authoring paths do not warn about case-only duplicates: pasting `Software` creates a second entry next to the imported `software` | Text; data (March A1, march B1) | Compare lemmas case-insensitively for exclusions and duplicate warnings. Define a fallback for private targets. Let reports block bad distractor pairs | CONFIRMED |
| F36 | minor | logic | practice PRC7, QE5; D22 | Inflections are generated from the lemma only. For `analyze/analyse`, the British answer "analysed" is invalid (CR22 adds `analyse`, not its inflections), causing false rejections across the 167 slash entries. The unconditioned rules over-generate ("deploies", "deployes"), so invalid forms pass. Adjectives (comparatives) and multi-word lemmas (`look up`) are not covered. D22 describes the risk only as irregular forms | Text | Apply the rules to every spelling variant; condition y→ies on consonant + y; list adjectives and multi-word lemmas as known gaps | CONFIRMED |
| F37 | minor | unverified-claim | research R6; pipeline PR3; content CR1, CR22 | R6 calls all 167 slash rows UK/US spelling variants. Some are aliases or abbreviations: `check-in counter/check-in` and `check-in desk/check-in` (so `check-in` is a variant of two entries), `modal verb/modal`, `doctor/Dr./Dr`, `driver's license/driving licence`, `a.m./A.M./am/AM` (variant `am` vs the be-verb `am`). `emphasize/emphasize` is a data error. Under CR22, `dr` becomes an accepted answer for "bác sĩ" and `modal` for `modal verb`. Octanove also has 46 slash rows, which are not mentioned | Re-run listing (Appendix A) | Record these in research.md. Let the owner mark alias variants as search-only, not accepted answers | CONFIRMED |
| F38 | minor | calibration | research R4, R2; decision D10, D9; content CE5; pipeline P6 | **R4:** Octanove has **10** multi-word headwords, not 11 (`laud ` is one word with a trailing space). So D10's "144 + 11" and "Mất 155 dòng" should be **154**. **R2:** the 95 is right for raw lowercased strings, but under the spec's own entry key (PR3: first slash form) the import meets **97** cross-source pairs (`agonize` and `utilize` added), and CEFR-J `sulfur/sulphur` and Octanove `sulphur` become two entries | Re-run (Appendix A) | Correct the counts and state which key definition was used | CONFIRMED |
| F39 | minor | calibration | research.md markers R1–R8 | The marker is defined as "**verified** — chạy ngay trong lượt này, có lệnh và kết quả", but no 04/10 command, script or output is saved in the task folder. The evidence folder holds only the 02/10 profile script, which does not compute R2–R8. The results reproduce (I re-ran them), but the artefacts alone cannot be re-run | Folder listing | Save the script and its output next to research.md | CONFIRMED |
| F40 | minor | unverified-claim | research R22, R24, R29; DECISIONS §3 and N2; plan "Material assumptions" | R22, N2 and plan.md say §4.14 could not be read; the rfc-editor `.txt` serves it. It confirms the reuse ⇒ revoke rule and has no grace window. R24 omits signature verification (see F17). R29's URL supports only the 2,000/day (500 for trial) limits: smtp.gmail.com, ports 465/587, app passwords and the 01/05/2025 change are not on that page (a search points to Google's less-secure-apps page, which was not fetched) | Fetches (Appendix B) | Update research.md. Drop the §4.14 `ASSUMPTION` from N2/IR11 and keep the grace window as the spec's own choice | CONFIRMED |
| F41 | minor | calibration | identity Constraints (RFC 9700 row); D13 | RFC 9700 governs OAuth authorization servers issuing refresh tokens to OAuth clients. The app's own session refresh token is analogous but not bound by it, as SPEC_PLAN K5 itself noted. Calling it "Yêu cầu của chuẩn" overstates it | SPEC_PLAN K5 note; RFC 9700 scope | Move this to the rationale: it is the owner's choice (K5), informed by the RFC | CONFIRMED |
| F42 | minor | contradiction | content CR7, C21; D3 | K4: a missing translation falls back to English. CR7/C21 end the chain with the Vietnamese gloss marked "chưa có bản dịch" for non-Vietnamese natives who lack English text. D3 declares it `ASSUMPTION`, but it is not in DECISIONS §9 for confirmation, and C21 cites only K4 | Text | Add it to §9, or show the "no translation" state in English | CONFIRMED |
| F43 | minor | contradiction | content C13; CR15 | K20 says the catalog is consulted **first**; C13 forbids any external or AI lookup whenever the catalog has the word. With one sense per (word, POS) at pilot (K10), a learner who met `bank` (river) can only take the financial sense or type the meaning by hand. Undeclared | Text | Allow "not this meaning → continue the chain", as an owner decision | CONFIRMED |
| F44 | minor | contradiction | content CR17 vs pipeline PR8, P12, PR6 | CR17: a typo fix ("Sửa") on a published sense goes "hiện ngay". PR8/P12: edits to published content wait for a publish. PR6: UI edits follow the CSV rules. It is undefined which rule applies to a UI edit of a published sense, and the system cannot tell a typo from a change of meaning | Text | One rule: editing a published sense creates a draft revision; optionally give the owner a "quick publish" | CONFIRMED |
| F45 | minor | gap | DECISIONS §5 F43; ai AR2, A1; practice Constraints | DECISIONS §5 overwrote the original F43 ("Độ khó câu AI bám level của từ mục tiêu, không cao hơn") with an output definition. No rule or criterion now bounds sentence difficulty, although AR2 passes `level` in. This may be a mislabelled amendment | SPEC_PLAN F43 vs DECISIONS §5 F43 | Ask the owner. If kept, add a rule and an evaluation-set check (AR13) | CONFIRMED |
| F46 | minor | logic | pipeline PE5, PR12, PR13, PE6, PR5, PR15 | PE5 marks a slow but still-running job `failed`, and PR12 re-queues `running` jobs. The original worker may still be running, so one source runs twice (against PR13) and the report counts and status flip. PE6's conflict detection needs `revision`, which PR5 makes optional, so rows without it overwrite UI edits. PR15 neutralises cells starting with `= + - @` on export, but nothing reverses it on re-import, so an export/import round trip changes cell content | Text | Give each job a lease with a heartbeat; require `revision` whenever `sense_id` is given; strip the neutralising prefix on import | CONFIRMED (text); impact SUSPECTED |
| F47 | minor | security | identity IR1; entitlements ER3, DA "Lạm dụng trial" | Normalisation only trims and lowercases. One inbox can verify many addresses (plus and dot addressing), so "verified email + one trial per account" does not bound trials per person | Reasoning; Gmail addressing behaviour not re-checked this session | Accept this explicitly for the pilot, or canonicalise addresses at known providers | SUSPECTED |
| F48 | minor | template | DA sections of Pipeline, Identity, Entitlements, AI, Practice | Measured against DECISION_ANALYSIS_TEMPLATE and the PROJECT_CONTEXT checklist, none of the five required DAs has an explicit happy path or invariant list. Identity lacks the idempotency/duplicate and timeout/retry categories. Entitlements and AI do not weigh alternatives in place. Several concurrency and partial-failure cases are missing (Appendix C) | Matrix | Add, per area, a happy path, an invariant list and the missing rows | CONFIRMED |
| F49 | minor | process | survey.md, plan.md, checkpoint-1.md | survey.md and the plan outline cover only batch 1 (đợt 1). Batches 2–3 were written without a recorded survey or an approved outline (plan.md only adds an after-the-fact "Cập nhật"). The per-criterion citation sweep table that write-spec requires is not saved. The gate was not ExitPlanMode; this is declared honestly | Files | Add survey entries for batches 2–3 and save the sweep table | CONFIRMED |
| F50 | minor | wrong-citation | C18, CE5, P6 (R2 for "CEFR-J shown by default"); C21 (K4); I11 (F7 for the Google/reset exemption); I13 (R24 for refusing `email_verified` false); L14 (K19 for atomicity); Q1 (F42 for excluding function words); Q14 (K17 for the unit charge); Q26 (N5 for "same reserved unit"); A15 (K20 for the output fields); A9 (SR8 for in-flight behaviour); SE6 (K3 for staleness) | Each row cites a decision or finding for behaviour that its own rule marks `ASSUMPTION`, or that the cited item does not contain | Text | Re-cite as `ASSUMPTION` or the correct rule | CONFIRMED |

### Nit

| ID | Sev | Type | Location | What is wrong | Evidence | Suggested fix | Status |
|---|---|---|---|---|---|---|---|
| F51 | nit | template | S14; P9; Cites cells of SE2, I2, A4, C10, EE5 | S14 ("none can be skipped silently") is not testable. P9 puts a mechanism in a criterion ("because the uniqueness lives in the database"). Several Cites cells hold two sources, against write-spec's "exactly one citation" | Text | Rephrase | CONFIRMED |
| F52 | nit | wrong-citation | identity Constraint "secure storage — K2"; entitlements Constraint "Apple 3.1.1 (R15)"; entitlements→identity note "(IR5, IR17)"; system Constraint "Ghi nguồn CEFR-J và Octanove (CC BY-SA 4.0…)" | Secure storage is not among K2's 13 items. R15's summary omits 3.1.1 (the source section DATA_COST §4 does have it). IR17 is the admin role, not email verification. The system row reads as if both datasets were CC BY-SA, but CEFR-J's terms are free use including commercial, with citation (local olp README) | Text; local README | Fix the references | CONFIRMED |
| F53 | nit | calibration | P2; CR10 / K11 | P2's example "`analyze/analyse, verb, B2`": the actual CEFR-J row is B1. The "274 dòng" count covers CEFR-J only; Octanove adds 6 function-word rows (5 prepositions, 1 conjunction) | Re-run | Correct both | CONFIRMED |
| F54 | nit | contradiction (small extensions) | system SR2 (F3); identity IR16/I22; learning LR9; entitlements ER10/E14; learning LR1 | F3's ISO 8601 is dropped. IR16/I22 make choosing a native language blocking (K4 only says ask at setup). LR9 adds "(hoặc nhóm được chọn)" to K19. ER10/E14 imply admin grants through the API, while F31 says "qua CLI". The default group name "Mới thêm" is not localised (K4) | Text | Declare or align | CONFIRMED |
| F55 | nit | logic | system SE3; entitlements EE7, ER13; learning LR1 | A time-zone change can move a per-day quota window forward by up to one day: the spec prevents counting a day twice but not skipping ahead. Bulk-adding B1/B2 (2,403 and 2,756 non-function rows) would exceed the 2,000-per-group cap once the catalog grows | Re-run counts | Note both as accepted | CONFIRMED |
| F56 | nit | calibration | practice PRC17; D20 | "1 trên 4 hoặc 1 trên 2" assumes 4 options (an `ASSUMPTION` in PRC2) and uniform random guessing | Text | Label it as illustrative | CONFIRMED |
| F57 | nit | contradiction | N6 vs ai AR2(b), learning LR8, practice PRC13 | N6: displayed English definitions come from reviewed catalog content, "không để AI viết". Private words created from an AI lookup carry an AI-written definition (confirmed by the learner) that flashcards and results display | Text | State that N6 applies to catalog senses only | CONFIRMED |
| F58 | nit | info (decision defence) | decision D14; identity IR9(b) | The NestJS guide (cited elsewhere as R31) handles this exact case the other way: Google sign-in for an unverified password account is refused (403) rather than handed over. D14's "What this does not fix" should mention this alternative | NestJS doc source lines 1410–1413 | Add it to D14 for the owner's choice | CONFIRMED |

---

## 3. Checks that passed

- **Data (Appendix A):** these reproduce exactly:
  - R1: 7,799 / 2,136 rows.
  - R2: 95 overlaps, all with different levels, under the stated raw-string method.
  - R3: `March` A1 / `march` B1.
  - R5: 58 headwords with an uppercase letter.
  - R6: the count of 167.
  - R7: all POS counts (274 function-word rows; `number` 30, `interjection` 9).
  - R8: `batter` (empty POS) and `remonstrate` (`vern`).
  - CE2: `in` is preposition A1 and adverb A2.
- **Numbers agree across specs:**
  - 20 s per call, 45 s overall, 1 retry (AR3, Practice DA).
  - 2-minute reservation (ER5, E8, DA).
  - 10 new + 50 reviews (N9, LR7, L11, LE1).
  - 10 s refresh grace (IR11, IE1, DA, D13, §9).
  - 90/365 days (K6, IR12, I18).
  - 10 chains (IR15, IE3).
  - OTP: 6 digits, 10 min, 5 tries, 60 s, 5 per hour (F6, IR4, I4–I7, DA).
  - Lockout: 10 failures / 15 min (F7, IR6, I11).
  - 1,000 private words (F15, CR13, C10).
  - 300 characters (N11, CR14, C17).
  - 24 h key retention (SR8, AR5, SE2).
  - 15-minute access token (N2, IR10, IR13).
  - 5–20 questions, default 10 (F42, PRC20).
  - 100-character answers (PRC12, Q7).
  - Weak = 2 wrong in the last 5 (N10, PRC19, Q22).
  - 14-day trial (K7, ER3, E2).
  - The worst-case PRC5 duration under AR3 (about 90 s) is below the 120 s reservation expiry.
  - The only cross-file number conflict is F05 (5,000 vs 7,799).
- **Names are consistent wherever they appear:**
  - Feature codes: `ai.practice`, `ai.lookup`, `practice.basic`.
  - Entitlements operations: `kiểm quyền`, `xem còn lại`, `giữ chỗ`, `xác nhận`, `nhả`.
  - AI operations: `generate_cloze`, `lookup_word`, `translate_sentence`.
  - AR4 statuses, and the ER12 / PRC8 / PR10 status sets.
- **Citations:** every ID in every Cites column resolves to an existing K/K1b/N/F/R item or to a rule or criterion in the
  named spec. No cited ID is missing.
- **Template minimums** (≥3 criteria, ≥2 edge cases): System 14/6, Content 24/10, Identity 24/13, Learning 22/10,
  Pipeline 23/10, Entitlements 20/8, AI 20/8, Practice 31/12. Every spec has "Observed on" honestly stating that no reference
  system exists. ASSUMPTIONs are visible inline.
- **decision.md:** D1–D22 each have Mechanism, File (an existing file) and a Defence block (Authorised by / Diverges /
  Answer out loud).
- **K2:** all 13 "chuẩn bị rẻ" items are present: CR2, PRC1, AR1, AR3/PR11, SR2/SR8, ER1/ER12, IR9 identities, IR3,
  IR8/Constraints, PR9, SR7, SR7 pagination, SR8.
- **Decisions faithfully carried** (beyond the findings): K1, K1b, K3 (with D12), K5/N2 (D13), K6, K7, K8 (D14), K9 (D15,
  declared NIST divergence), K10, K13, K14, K15, K16, K17 (method), K19, K21, K22 (D20, except F03), K23 (except F13), K25;
  N1, N3, N4, N5, N11, N13; F2, F4–F15, F17–F25, F27, F29–F42, F44.
- **Declared divergences** D12, D13, D14, D18, D20, D21 and D22 are each listed in DECISIONS §9 and decision.md, with
  honest "neither — our own trade-off" or `ASSUMPTION` labels. Caveats: F03, F22, F58.
- **Leitner schedule traces (LR5):**
  - A due item remembered goes up one level and is due today + interval.
  - An early review that is remembered changes nothing.
  - A forgotten item goes to level 1, due tomorrow, at any time.
  - An overdue item keeps its level until reviewed (LE1).
  - D19's remark is correct: a new item ends at level 1, due tomorrow, whether it was remembered or forgotten.
  - Two devices (LE3): the second result sees "not due" and follows the early-review rule, consistent with LR12.
- **Submission idempotency (PRC15):** same key + same answer, same key + different answer, another key after the question was
  answered, and two devices are all specified consistently with F37 and SR8 (gaps only in F29).
- **Sources re-confirmed** (Appendix B): R10, R11, R12, R17, R18, R19, R20, R21, R23, R25, R26, R27, R28, R31 (verified
  against the raw NestJS doc source, not a summary), R32–R36, R38, R41, R42, and the Stripe facts in
  RESEARCH_AI_QUOTA_MODELS. R22 is fully readable now; R24 and R29 are only partly right (F17, F40).

## 4. Could not verify

- **Runtime behaviour:** no code exists, so every logic finding is a trace of the text, not an execution.
- **Sources not re-fetched** (outside the requested list): R13–R16, R37, R40, R43, R44, R45. R13 and R14 were checked only
  against the local `olp-en-cefrj-README.md` (downloaded 02/10).
- **Gmail:** personal-account SMTP conditions and the 01/05/2025 less-secure-apps change rest on a search result only; the
  page was not fetched. Plus/dot addressing (F47) was not re-checked this session.
- **Mailpit default ports:** not stated on the homepage.
- **Typical client and proxy timeouts** (F29): general knowledge, not verified.
- **Evidence strength of the fetches:**
  - Downloaded raw and searched (strong): RFC 9700, 9457 and 8252 `.txt`; the NestJS doc markdown on GitHub (master,
    `content/security/authentication.md`); the OWASP Forgot-Password, Authentication and Session-Management HTML;
    NIST 800-63B-4 HTML; the Google OIDC HTML.
  - Returned as near-raw markdown: the Stripe pages.
  - Answered by the fetch tool's summariser (weaker): AIP-158, OWASP Password Storage, the four BullMQ pages, Mailpit,
    Gmail sending limits, Google sender guidelines, the Google native-apps page, the AWS backoff article,
    flutter_secure_storage, the Microsoft circuit-breaker page.
- **Author intent:** whether "từ đã có" in PR6 means entry or sense (F08), and whether the §5 F43 row was meant to replace
  F43 (F45), need the author or the owner.
- **Scripts and downloaded sources** are kept in
  `C:\Users\TIENNG~1\AppData\Local\Temp\claude\E--Learnings-Learning-Stuffs-University-HK6-Do-an-1-Main-Project-alsp-ai-harness\4ac9c444-a357-4c7b-8639-78352e61d33e\scratchpad\`
  (`verify_wordlists.py`, `verify_wordlists2.py`, `verify_wordlists3.py`, `nest_auth.md`, `rfc9700.txt`, `rfc9457.txt`,
  `rfc8252.txt`, `nist63b.txt`, `google_oidc.txt`, `owasp_*.html`). This is a temporary session folder; copy what should
  be kept.

---

## Appendix A — Data re-run (D1)

| Claim (research.md) | Stated | Re-run result | Verdict |
|---|---|---|---|
| R1 rows and columns | 7,799 / 2,136; `headword,pos,CEFR,…` | 7,799 / 2,136. CEFR-J extra columns: `CoreInventory 1`, `CoreInventory 2`, `Threshold`. Octanove extra column: `notes` | CONFIRMED |
| R2 cross-source disagreements | 95 | 95 with key (headword.lower(), pos). Every overlap differs, which follows from A1–B2 vs C1–C2 (CEFR-J side: B2 60, B1 23, A2 8, A1 4). Under the spec's own PR3 key (first slash form, trimmed): **97** + one concept split (`sulfur/sulphur` vs `sulphur`) | CONFIRMED for the stated method (F38) |
| R3 `March` / `march` | 1 lowercase collision | `March` noun A1, `march` noun B1, `march` verb B1; no case-sensitive duplicate key in CEFR-J | CONFIRMED |
| R4 multi-word headwords | 144 / 11 | 144 / **10**; trailing-space rows `turn to `, `laud ` (`laud` is one word) | PARTLY (F38) |
| R5 uppercase headwords | 58 | 58 (Octanove 0) | CONFIRMED |
| R6 slash rows | 167 "biến thể Anh/Mỹ" | 167 (+46 in Octanove). Aliases and abbreviations include `check-in counter/check-in`, `check-in desk/check-in`, `modal verb/modal`, `doctor/Dr./Dr`, `driver's license/driving licence`, `a.m./A.M./am/AM`; data error `emphasize/emphasize` | Count CONFIRMED; characterisation PARTLY (F37) |
| R7 POS counts | pronoun 83 … infinitive-to 1; 274; number 30, interjection 9 | Identical. Function-word rows by level: A1 144, A2 65, B1 43, B2 22. Octanove adds 6 (5 prepositions, 1 conjunction) | CONFIRMED |
| R8 invalid POS (Octanove) | `batter` empty, `remonstrate` `vern` | Identical; all levels valid in both files | CONFIRMED |
| **Not reported** | — | Octanove: 58 duplicate (headword, pos) keys, 60 extra rows, 21 with C1 ≠ C2 (e.g. `envisage` C1/C2/C2, `commission` noun and verb, `maneuver/manoeuvre`); 45 rows use `notes` | NEW (F09) |
| OTP arithmetic (Identity DA) | "5 trên 10^6" per code | Per code 5×10⁻⁶; per hour (5 codes) 0.0025 %; per day 0.060 %; per 30 days 1.78 %; per year 19.7 %; 100 consecutive failures after 4 h | Per-code figure CONFIRMED; cumulative risk unstated (F15) |

## Appendix B — Primary sources re-checked (D2)

| Source | Claim relied on | Verdict | What was read (paraphrased; location) |
|---|---|---|---|
| RFC 9700 §2.2.2 | Public-client refresh tokens must be sender-constrained or rotated (R22) | CONFIRMED | §2.2.2, `.txt` lines 384–389 |
| RFC 9700 §4.14 | Reuse detection (N2, IR11 marked `ASSUMPTION` "chưa đọc") | CONFIRMED (now readable) | §4.14.2: the server keeps the relation between rotated tokens; when an invalidated token is presented it cannot tell attacker from client and revokes the active refresh token. **No grace window.** Optional revocation on password change or logout; tokens should expire after inactivity. Lines 1965–2010 |
| RFC 9700 §2.1.1 / §2.1.2 / §2.4 | PKCE required for public clients; implicit discouraged; password grant forbidden (R21) | CONFIRMED | Lines 287–295 (PKCE MUST, S256), 340–356 (implicit SHOULD NOT), 425–427 (resource-owner password credentials MUST NOT) |
| RFC 9457 | Members; clients ignore unknown extensions (R10) | CONFIRMED | §3.1.1–3.1.5; §3.2 (consumers MUST ignore unrecognised extensions); `status` must match the HTTP status |
| Google AIP-158 | Field names; opaque URL-safe tokens (R11) | CONFIRMED | Also: an oversized `page_size` should be coerced to the maximum; changing other arguments between pages → INVALID_ARGUMENT; no specific code for a malformed token (S3's 400 is the spec's own choice) |
| Stripe idempotent requests | Save first result incl. errors; mismatch → error; ≤255 chars; prune after ≥24 h (R12) | CONFIRMED | Also: a key reused after pruning is a new request; results are not saved when validation fails or a concurrent request with the same key is executing; keys apply to POST only |
| OWASP Password Storage | Argon2id m=19456, t=2, p=1 minimum; bcrypt 72-byte, legacy (R17) | CONFIRMED | Equivalent alternative configurations listed (e.g. 46 MiB/t=1) |
| OWASP Forgot Password | Same message and timing; CSPRNG; long enough; single use; expiry; secure storage; PINs 6–12 digits; attempt limits (R18) | CONFIRMED | Also: per-account rate limiting; email the user after a reset (F24); do not log in automatically; ask about or automatically invalidate sessions |
| OWASP Authentication | Generic login error; lockout counter on the account, not the IP (R19) | CONFIRMED | Also: generic response even when the account is locked or disabled; registration response example (F16); without MFA, under 15 characters is weak; no composition rules; maximum ≥64 |
| OWASP Session Management | ≥64-bit entropy; Secure/HttpOnly; SameSite Strict preferred or Lax; renew on login; idle and absolute timeouts (R20) | CONFIRMED | Also: renew the session ID after any privilege change, including password changes (F23) |
| NIST SP 800-63B-4 | Min 15 for single-factor; no composition rules; email not for OOB; verification and recovery codes exempt (R27) | CONFIRMED | Also: blocklist check SHALL; max length ≥64 SHOULD; issued recovery codes ≥6 digits, ≤24 h when emailed, subject to §3.2.2 throttling (≤100 consecutive failures) (F15) |
| Google OpenID Connect | `iss`, `aud`, `exp`; `sub` unique and never reused; email may change; `email_verified` (R24) | PARTLY | All four confirmed. The validation list **starts with verifying the signature** (F17). `auth_time` only when requested and enabled (F25). Email must not be the primary key |
| BullMQ job IDs | Duplicate id ignored; removed jobs are not duplicates (R32) | CONFIRMED | Custom ids must not contain `:` or be all digits |
| BullMQ retrying failing jobs | attempts > 1; `2^(attempts-1)*delay`; jitter; failed set (R33) | CONFIRMED | Jitter is a 0–1 option |
| BullMQ rate limiting | `limiter {max, duration}` is global; limited jobs stay waiting (R34) | CONFIRMED | — |
| BullMQ stalled jobs | Moved back to waiting and reprocessed; failed after the stall limit (R35) | CONFIRMED | The page does not itself say "idempotent"; R35's "có thể chạy nhiều hơn một lần" is a correct inference |
| NestJS authentication guide | Web uses a server session cookie; mobile uses a short-lived JWT + rotating refresh; reuse revokes the family; 15-minute TTL; issued access tokens stay valid (R31, DECISIONS §3) | CONFIRMED (raw source) | `nestjs/docs.nestjs.com` master, `content/security/authentication.md`: line 9 (bearer + rotating refresh for mobile), 364 (`__Host-sid` HttpOnly, Secure, SameSite=Lax), 959, 981 (`ttl: '15m'`), 1071 (each refresh token works once; a spent token coming back revokes the whole family), 1719 (issued access tokens valid until expiry, hence 15 minutes), 3338 (second use = theft), 3731 (default `accessToken.ttl` '15m'). Also 1410–1413: Google linking requires both sides verified and refuses an unverified password account (F58). No grace window (F22) |
| Stripe billing credits | `effective_at`, `expires_at` (no expiry by default); order priority → expiry → promotional; append-only ledger; ≤100 unused grants; metered prices only (R38, RESEARCH_AI_QUOTA) | CONFIRMED | Full order: priority, expiry, category, effective date, created date |
| Stripe Entitlements | Entitlement = access to a feature; unique `lookup_key`; persist internally; no usage quotas (R36) | CONFIRMED | Event `entitlements.active_entitlement_summary.updated` |
| Mailpit | SMTP testing tool with web UI and API; port not stated (R30) | CONFIRMED | No port on the homepage |
| Gmail Workspace sending limits | 2,000/day (R29, Identity Constraint) | PARTLY | 2,000/day (500 for trial accounts), 10,000 recipients/day, 3,000 external and unique recipients/day. **No** SMTP host, ports, app passwords or May-2025 change on this page (F40) |
| Extra: RFC 8252 (R23), Google native apps (R25), flutter_secure_storage (R26), Google sender guidelines (R28), AWS backoff (R41), Microsoft circuit breaker (R42) | As recorded | CONFIRMED | RFC 8252: native apps must not use embedded user-agents; PKCE required. Google: embedded webviews blocked, custom URI schemes unsupported, loopback deprecated on mobile. flutter_secure_storage: RSA OAEP + AES-GCM, SDK 23, auto-backup warning. Sender rules: SPF or DKIM, TLS, spam < 0.3 %, 5,000/day bulk threshold. Full Jitter formula. Circuit breaker unsuitable for message-driven architectures |

## Appendix C — Defense Analysis coverage (E)

✓ present · ◐ partly · ✗ missing. The template's §3 (invariants, happy path), §5 (comparison) and §6 (runbook) are not filled
in any required area; the DAs are case tables only.

| Area (where) | Happy path | Invariants | Edge cases | Failure modes | Concurrency | Idempotency / duplicates | Partial failure | Timeout / retry | Security / abuse | Observability | Recovery / rollback | Alternatives / trade-offs |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pipeline jobs (Pipeline DA) | ✗ | ✗ | ✓ | ✓ | ◐ zombie job / import-vs-publish missing | ✓ | ✓ | ◐ no job time limit; P10 vs PR11 retry unit | ◐ round-trip of neutralisation | ✓ | ◐ revert flawed (F07); no new-version path | ✓ |
| Login / OTP / sessions (Identity DA) | ✗ | ✗ | ✓ | ◐ SMTP only (no Google outage) | ◐ parallel OTP guesses, logout-during-grace missing | ✗ | ✓ | ✗ SMTP and Google timeouts | ◐ F15–F18 missing | ✓ | ✓ | ✗ (only in D13–D16) |
| AI quota / entitlements (Entitlements DA) | ✗ | ✗ | ✓ | ◐ confirm failure missing | ✓ | ◐ retry after release, key scope missing | ✓ | ◐ expiry vs ~90 s flow not analysed | ◐ plus-addressing; op-id scope | ✓ | ◐ no reconciliation procedure | ✗ (only in D21) |
| Grading + AI errors (AI DA, Practice DA) | ✗ | ◐ "never wrong for system errors" only | ✓ | ✓ | ◐ same bank question twice; translation race | ◐ regeneration op-id (F12), transient retry (F11) | ◐ AE6 contradiction; snapshot vs confirm | ◐ no end-to-end budget | ◐ report abuse beyond rate limit | ✓ | ✓ | ✓ Practice / ✗ AI |
| Submission idempotency (Practice DA, PRC15) | ✗ | ✓ one attempt per question | ✓ | ◐ | ✓ | ◐ in-flight same key, key scope (F29) | ◐ no durable mechanism (F28) | ✗ client retry after timeout | ◐ | ✓ | ◐ | ✗ |
