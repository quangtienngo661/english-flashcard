# Review: Content Pipeline + inflections (diff 4651fbe..5aa4085, apps/api)

Reviewer scope: upload/normalizer, prefilter, row processor, exports, backfill job, inflect.ts / inflections.service.ts,
revision-content.ts, levels.service.ts derived level, migrations, tests listed in the brief. Paths relative to `apps/api`.

What I ran (no Docker, no e2e):
- `pnpm exec vitest run src/content/inflections/inflect.spec.ts src/content/senses/revision-content.spec.ts src/content-pipeline/upload/row-normalizer.spec.ts src/content-pipeline/upload/columns.spec.ts` → 4 files, 179 tests passed.
- Recomputed the Bước 2 hash by hand (`sha256(JSON.stringify({glossVi,definitionEn,examplesEn,topicCodes sorted,acceptedForms sorted}))`) for the
  test's `go` revision → `75c1824d…24e2`, identical to the fixed hex in `revision-content.spec.ts:16`.
- Called the real `generateInflections` from `src/content/inflections/inflect.ts` with Node 24 type stripping (script in scratchpad
  `probe.mjs`) for ~50 lemmas; outputs quoted below.
- Everything else is from reading the code. Nothing here was exercised against Postgres.

---

## F1 — HIGH — Re-uploading an earlier file after a later file changed the reviewed forms is skipped as "unchanged"

CONFIRMED-BY-READING (full path traced; not run).

Files: `src/content-pipeline/import/prefilter.ts:58-61, 85-86, 101-105`; `src/content-pipeline/import/row-processor.ts:110-113`;
`prisma/migrations/20261012180000_pipeline/migration.sql:75` (unique index).

Scenario (headword,pos,inflections files, no level source):
1. Upload FA: `go,verb,past:went` → batch A sets reviewed `went`, writes import_row_key (inflection, owner, ["owner","go","verb"], H(went)) owned by A.
2. Upload FB: `go,verb,past:goed` → processed (different bytes), reviewed set becomes `goed`, key H(goed) owned by B.
3. Upload FA again (same bytes) to restore `went` → prefilter finds key H(went) owned by batch A, A has the same `fileSha256`, row 2
   of A has outcome `updated` → the row goes to `unchangedRows`, outcome `unchanged`. The entry keeps `goed`. The report tells staff
   nothing changed.

Why: D13's skip ("same file bytes were applied before") was safe for level keys because level writes only add rows. Inflection
writes REPLACE the set, so a later batch can undo what the earlier identical file set. The key is also globally unique on
`(kind, source_id, row_key, content_hash)` (`skipDuplicates`), so the first batch owns H(went) forever.

```ts
// prefilter.ts:85 — only same-bytes batches count
if (key.batchId === batch.batchId || key.batch.fileSha256 !== batch.fileSha256 || key.batch.levelSourceId !== batch.levelSourceId) continue;
// prefilter.ts:102 — all keys matched in an applied earlier batch → skipped
const unchanged = row.normalized.senseId === null && firstMatch !== undefined && [...firstMatch].some((id) =>
  appliedRows.has(JSON.stringify([id, row.normalized.rowNumber])) && keys.every((key) => matches.get(signature(key))?.has(id)));
```

Same happens with a level column present (`go,verb,A1,past:went`): the level key is identity-only, so it also matches batch A.

Test to add (test/pipeline/inflections.e2e-spec.ts):
```ts
it('re-uploading an earlier file after a later one changed the reviewed set restores it', async () => {
  const go = await catalogWord('go', 'verb');
  const fa = csv(['headword', 'pos', 'inflections'], [['go', 'verb', 'past:went']]);
  await importFile(fa);
  await importFile(csv(['headword', 'pos', 'inflections'], [['go', 'verb', 'past:goed']]));
  const again = await importFile(fa);
  expect(again.outcomes).toEqual([expect.objectContaining({ outcome: 'updated' })]);   // today: 'unchanged'
  expect(await forms(go.entryId)).toEqual([{ form: 'went', kind: 'past', source: 'reviewed' }]); // today: goed
});
```
Fix direction: do not let the inflection key decide a skip (the processor's `sameForms` check at row-processor.ts:105 already makes an
unchanged cell cheap), or compare against the entry's current reviewed set at prefilter time.

---

## F2 — MEDIUM — No durable way to say "this entry has no forms"; the backfill brings wrong library forms back

CONFIRMED-BY-READING.

Files: `src/content-pipeline/upload/row-normalizer.ts:31-44, 132`; `src/content-pipeline/import/row-processor.ts:100-109`;
`src/content/inflections/inflections.service.ts:26,34`; `src/content-pipeline/inflections/inflections-backfill.handler.ts:42,51-54`.

D47 says wrong library plurals that `pluralize` misses ("porks", also "furnitures", "Internets", see F10) stay "until the reviewed CSV
fixes them". For an uncountable noun the correct reviewed set is empty, and there is no supported way to write it:
- `-` → `parseInflections('-')`: no colon → `invalid-inflection` (the message does not mention any clear option).
- empty cell → `null` → keeps the library forms.
- `;` → `contentCells.inflections.trim()` is `";"` (truthy) → `splitList` gives `[]` → reviewed `[]` → `replaceInflections(…, 'reviewed', [])`
  deletes every row and inserts none. The entry now has **zero** inflection rows, so the next backfill run
  (`inflections: { none: {} }`, line 42) picks it up and writes `library plural:porks` again. Re-runs are expected ("re-runs skip done
  entries").

Test:
```ts
it('a reviewed "no forms" survives a backfill run', async () => {
  await importFile(csv(['headword', 'pos', 'inflections'], [['pork', 'noun', '']]));      // library porks
  const r = await importFile(csv(['headword', 'pos', 'inflections'], [['pork', 'noun', '-']]));
  expect(r.outcomes[0].outcome).not.toBe('rejected');                                     // today: invalid-inflection
  await runBackfill();
  expect(await forms(porkId)).toEqual([]);                                                // today with ';': [library porks]
});
```
Needs an owner decision on the notation (`-` like `form_of`, or a stored "reviewed: none" marker the backfill respects).

---

## F3 — MEDIUM — A derived level and an editorial level share one unique key; confirming the derived value keeps it "derived"

CONFIRMED-BY-READING.

Files: `src/content/catalog/levels.service.ts:58-65` (derived row), `:67-78` (`setEditorialLevel` upsert);
`src/content/catalog/admin-catalog.queries.ts:84-94` (`levelState`); `src/content-pipeline/import/row-processor.ts:83-86`.

Derived rows are `(entryId, OWNER_SOURCE_ID, level, basis 'derived')`. `setEditorialLevel` upserts on `entryId_sourceId_level` with
`update: { createdAt }` only, so staff choosing the same level hits the derived row and leaves `basis = 'derived'`.

Scenario: `went` gets derived A1 from `go`; a later third-party import adds B1 → `levelState` reports `conflict: true` (no editorial row,
two distinct levels). Staff opens the entry and confirms A1 → upsert updates `createdAt` of the derived row → still no editorial row →
conflict stays true; only picking B1 clears it. Second effect: the derived row's id is in the import batch's `level` records, so
reverting that batch deletes the level staff just confirmed (revert.service.ts:137-145).

```ts
await tx.entryLevel.upsert({
  where: { entryId_sourceId_level: { entryId, sourceId: OWNER_SOURCE_ID, level } },
  create: { …, basis: 'editorial', … },
  update: { createdAt: this.clock.now() },   // basis not touched
});
```
Test: import `went` with `form_of go/verb:past` (go A1) → `setEditorialLevel(went, 'A1')` → expect `entryLevel` basis `'editorial'`;
then add a B1 third-party level and expect the admin entry view `conflict: false`. Today: basis `'derived'`, conflict `true`.
Fix direction: `update: { createdAt, basis: 'editorial' }`, or give derived levels their own source id.

---

## F4 — MEDIUM — `form_of` = `-` on a row with no matching sense creates an empty draft sense

CONFIRMED-BY-READING.

Files: `src/content-pipeline/upload/row-normalizer.ts:205`; `src/content/senses/import-content.ts:72-77`;
`src/content/senses/senses.service.ts:54-79` (line 72).

`content: content ?? (link !== null ? {} : null)` — `'clear'` is not null, so a row whose only non-empty cell is `form_of = -` becomes a
content row `{}`. With no sense_id and no existing sense for (entry, context_label), `importContent` calls `createSense` with
`{ formOf: null }` → a sense with no gloss, no example, no link. Bước 2 never created a sense from a row without content.
Consequence for D34: that entry now has a non-retired sense and disappears from `entries/export?has_sense=false`, the list staff use
to know what still needs writing. A reviewer typing `-` as "none" in the entries-without-sense file triggers it on every row.

Test:
```ts
it("form_of '-' on an entry without a sense creates nothing", async () => {
  await catalogWord('quiet', 'adjective', { level: 'A2' });
  const { outcomes } = await importFile(csv(['headword', 'pos', 'gloss_vi', 'form_of'], [['quiet', 'adjective', '', '-']]));
  expect(outcomes[0].outcome).toBe('unchanged');           // today: 'created'
  expect(await ctx.prisma.sense.count()).toBe(0);           // today: 1
});
```
(Only the `-` case is flagged; a `form_of` naming a base with no gloss creating a draft looks intended by the D29 test.)

---

## F5 — MEDIUM (narrow) — Deleting a base entry half-clears the link and breaks "unchanged re-upload stays unchanged"

CONFIRMED-BY-READING. The SET NULL itself is intentional (`test/content/inflections.e2e-spec.ts:128-130`); the side effects are not covered.

Files: `prisma/migrations/20261017170000_entry_inflections/migration.sql:24` (`ON DELETE SET NULL` on `form_of_entry_id` only);
`src/content/catalog/revert.service.ts:148-153`; `src/content/senses/revision-content.ts:24-27`; `src/content/senses/import-content.ts:81-84`.

Scenario: batch A imports level-only `go,verb,A1`; batch B uploads `went,verb,…,go/verb:past` (went revision hash includes formOf).
Revert A: go's level is removed (no live sense), go then has no senses/levels/variants → deleted. Revert does not check `formsOf`.
Postgres sets `form_of_entry_id = NULL` on went's revisions, **including published ones**, but `form_kind` stays `'past'`, and the stored
`content_hash` still includes formOf. `revisionFormOf` needs both columns, so `readContent` now has no formOf; re-uploading B's exact row
(or an export of it, which now prints `form_of` empty) computes a different hash → `saveDraft` writes a new revision → outcome `updated`
for an unchanged file. The revert report lists nothing about the lost link.

Test: the scenario above, then `expect(await importFile(fileB)).outcomes[0].outcome === 'unchanged'` and
`expect(went revision).toMatchObject({ formOfEntryId: null, formKind: null })` (or revert skips `go` with a reason). Today: `updated`,
`formKind: 'past'`.

---

## F6 — MEDIUM, SUSPECTED design gap — Revert does not undo the inflections a batch set

CONFIRMED-BY-READING for the behaviour; whether revert should cover it is not stated in design/plan (grep "revert" finds nothing).

Files: `src/content-pipeline/import/row-processor.ts:100-114` (no `recordBatchRecord` for inflections);
`src/content/catalog/revert.service.ts:4` (`RevertRecordType` has no inflection type).

A batch whose `inflections` cell replaced library forms with a reviewed set: revert removes its entries/levels/senses/revisions but the
reviewed set stays and the deleted library rows are not restored. Together with F1 this means a bad inflections upload can only be
undone by uploading a new, different file. Test: import `go,verb,past:goed` over library forms, revert the batch, expect the library
forms back (today: reviewed `goed` remains). Owner decision.

---

## F7 — LOW — `form_of` accepts a self-link and a kind that does not fit the base

CONFIRMED-BY-READING. `src/content-pipeline/import/row-processor.ts:135-143`, `src/content-pipeline/upload/row-normalizer.ts:51-65`.

`go,verb,…,form_of=go/verb:past` resolves to the row's own entry → sense "go is the past of go"; `addDerivedLevel(go, go)` is a no-op.
`go/verb:plural` or `book/noun:past` are also accepted. Test: row `go,verb,đi,We go.,go/verb:past` → expect rejected (today: created
with `formOfEntryId = own id`).

---

## F8 — LOW — `form_of` skips the NUL and cell-length checks every other content cell gets

CONFIRMED-BY-READING for the missing check; the Postgres error was not run here.

`src/content-pipeline/upload/row-normalizer.ts:134-138` deletes `form_of` and `inflections` from `contentCells` before the 2,000-character
check (lines 140-146) and the NUL handling (165-173); `parseFormOf` checks neither. A `form_of` like `go\u0000/verb:past` reaches
`tx.entry.findFirst({ lemma: 'go\u0000' })` (row-processor.ts:139); Postgres rejects NUL in text, the error is not `RowRejected` and not
transient, so the whole import attempt fails instead of one row being rejected. (A NUL in the headword already behaves this way in Bước 2;
`inflections` does check NUL per form.) Test: that row → expect `invalid-form-of` and batch status `partial`.

---

## F9 — LOW, SUSPECTED intent — Entries created by `POST /v1/admin/content/entries/batch` get no library forms

CONFIRMED-BY-READING. `src/content/senses/admin-senses.controller.ts:134-136` calls `ensureEntry` only; library forms are written only by
the CSV processor (row-processor.ts:96-99), private words, and the backfill. Entries added through this route after the one-time backfill
have no forms until someone re-runs it. `apps/admin/src` does not call this route today (grep), so impact is small.

---

## F10 — LOW — Data observations from the real generator (for the owner's CSV review list, not code bugs)

Output of `generateInflections` on CEFR-J lemmas (all present in `cefrj-vocabulary-profile-1.5.csv`):
`furniture` → `furnitures`; `Internet` → `Internets` (AGID lacks it, compromise fallback); `mother-in-law` → `mother-in-laws` (should be
mothers-in-law); `lie` verb → past `lied, lay`, past participle `lain` only (AGID merges the two verbs); `cut`/`put`/`set` show no past
forms because a form equal to the lemma is dropped (plan rule, so the word page row reads "cuts · cutting" only). Case: a capitalised
lemma missing from AGID falls back to the lower-case line, so `Bank` → `banks` (inflect.ts:41,46).

---

## F11 — LOW — Test gaps (each test passes but proves less than its name)

- `test/pipeline/inflections.e2e-spec.ts:220-230` "…is prefiltered as unchanged": outcome `unchanged` is also what the processor returns,
  so the test cannot tell a prefilter skip from a full re-process. Add
  `expect(await ctx.prisma.importRowKey.count({ where: { batchId: second.id } })).toBe(0)` (the processor would write 2 keys). It also does
  not cover F1.
- D29 import (`:100-119`): no case for "base has no level → no derived row", "entry already has a level → no derived row", or "revert
  removes the derived level". `-` is only tested with a `sense_id` (F4 untested).
- `form-of-not-found` (`:179-184`): asserts `sense.count() === 0` but not that the new `went` entry and its library forms were rolled
  back (the "same transaction" claim for library forms is unproven on the reject path). No case for `form_of` naming a **private** entry
  (the `scope: 'catalog'` filter at row-processor.ts:139 is untested).
- Backfill (`test/pipeline/inflections-backfill.e2e-spec.ts`): no case for the in-transaction re-check (an entry filled by an import between
  the chunk read and the lock, handler.ts:50-51); no case for F2.
- B2#10 / hash stability / B3#14 / B3E33 / B3#15 / export-too-large / has_sense validation / route permission + Idempotency-Key:
  assertions cover every clause I checked (B3E33 bulk side is in `test/learning/items.e2e-spec.ts:214`, private exclusion of the entries
  export in `test/content/private-boundary.e2e-spec.ts:143-148`).

---

## Checked, no issue

- Q1 hash: `src/content/senses/revision-content.ts:75-81` — formOf joins the hashed object only when truthy, appended last; null and
  undefined both omit it; other keys and order unchanged from `git show 4651fbe:…/revision-content.ts:64-69`. Recomputed hex matches the
  test's fixed value. `revisionData` (senses.service.ts:46) writes both columns from the merged content. Rows created before the
  migration have null form columns, so `readContent` adds nothing and stored hashes still match → unchanged re-uploads stay unchanged
  (also tested end to end at inflections.e2e-spec.ts:196-212).
- Q2 parsing: `row-normalizer.ts:31-44` — each piece trimmed/NFC/whitespace-collapsed via `normalizeText`, kind lower-cased, exact
  duplicates removed, empty form / NUL / >100 code points → `invalid-inflection`, multi-word forms kept, form equal to lemma kept
  (correct for reviewed `sheep`, `cut`). Message lists all 7 kinds (`kindList`, line 27; tested at inflections.e2e-spec.ts:173).
  Whitespace-only cell → `null` = keeps (line 132). Differ-in-file is a per-entry map, not adjacency, and empty cells are skipped
  (prefilter.ts:26-41; tested non-adjacent with an empty middle row, :186-194); duplicates are recorded before processing so a crash
  retry cannot lose the rejection.
- Q3: base lookup restricted to `scope: 'catalog'` (row-processor.ts:139); `-` clears through a new draft (tested :114-118);
  `form-of-not-found` is a `RowRejected` (row tx rolled back). Derived level only when the entry has no level of any source and the base
  has a displayed level; base without level → no row, no error (levels.service.ts:58-65). `displayedLevel` SQL orders the same way as
  `levelState` for catalog rows.
- Q4: form_of turns a row into a content row; content keys are never written, so such rows are never prefilter-skipped; changed bytes
  never match anyway (prefilter.ts:85).
- Q5: `replaceInflections` (inflections.service.ts:22-35): reviewed deletes all rows; library returns early when reviewed rows exist and
  deletes only library rows. Callers: row-processor (library only when `entryCreated && inflections === null`), private-words (private
  entries only), backfill (re-checks under the entry lock). No path writes library over reviewed.
- Q6: `admin-catalog.queries.ts:98-105` reviewed → `inflections`, library → `_inflections`; entries export uses `catalogWhere` (scope
  catalog), `senses: { none: { state: { not: 'retired' } } }`, and returns `tooMany` before pushing row limit+1 (lines 294-319, check at 311);
  `export.service.ts:50-54` throws before any header is set. `has_sense` is `z.literal('false')` in a strict object (sense-filters.ts:18-21).
  `csvCell` guards every cell (csv-writer.ts:2-5) and the normalizer strips the guard from `form_of`/`inflections` (row-normalizer.ts:126-131),
  so a lemma like `-ism` round-trips.
- Q7: backfill (`inflections-backfill.handler.ts:40-60`) uses keyset `id > after`, so entries whose generator returns `[]` (multi-word,
  uncountable) are re-checked on each run but the loop always ends; adjectives are excluded by `pos in (verb, noun)`; scope catalog; 500 per
  `ctx.tx` (30 s timeout, lease-fenced); crash between chunks resumes by skipping filled entries. Controller: `content.import`,
  `@Idempotent()` + interceptor, `user.write` rate limit, `exclusiveKey 'content-inflections'` (controller.ts:19,29-35); queue added to the
  reconciler list and the `background_jobs_queue_check` constraint. Blocking `pg_advisory_xact_lock` and one lock per import row, so no
  lock-order cycle with the backfill's 500 locks.
- Q8: `inflect.ts:15-18` resolves `./agid-inflections.json` from `import.meta.url`; `nest-cli.json` assets `content/inflections/*.json` are
  copied relative to `sourceRoot` (Nest CLI 12.0.8 `assets-manager.js:37-55`, strips sourceRoot) to `dist/content/inflections/`, beside the
  compiled `inflect.js` (`tsconfig.build.json` rootDir `./src`, worker at `dist/worker.js`). Not verified by an actual build. Adjectives,
  prepositions, multi-word → `[]` (inflect.ts:37); `pluralize` filter only inside `generateInflections` (line 45), never on reviewed forms;
  form equal to lemma dropped (line 49); `March` uses AGID's own `Marches` line.
- Q9: no `topic-missing`, `hasActiveTopic` or `activeTopics` left in `apps/api/src`, `apps/api/test`, `apps/admin/src`; archived/unknown
  topics are still refused when given on save (`senses.service.ts:29-36, 95-97`, unchanged).
