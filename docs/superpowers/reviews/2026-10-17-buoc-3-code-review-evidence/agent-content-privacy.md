# Review — Content module: private-word privacy, private-word and sentence write paths

Scope: `git diff 4651fbe HEAD -- apps/api` (HEAD = 5aa4085, `dev`). Paths are relative to `apps/api`. Read-only review: nothing run,
no Docker. Every finding was traced by reading the code; "SUSPECTED" means it depends on timing and needs the test to confirm.

**Bottom line:** I found no learner-to-learner leak. On every learner read path, learner B never sees A's private entry, sense,
lemma, meaning or even the fact that it exists, and every staff read is limited to catalog rows. The findings below are one
medium data-retention issue, five low ones, and a list of test gaps.

---

## Findings

### M1 (medium): sentence text stays in `idempotency_keys` after the sentence or the private word is deleted — CONFIRMED-BY-READING

- `src/content/sentences/sentences.controller.ts:41` returns `{ id, text, created_at }`.
- `src/common/idempotency/idempotency.interceptor.ts:62` takes that body, and `src/common/idempotency/idempotency.service.ts:74` stores it as
  `responseBody` (`response_body` jsonb).
- The only place a row is ever deleted is `idempotency.service.ts:38-39`: lazily, when the *same key* comes back after 24 h. Keys are random
  UUIDs, so in practice that never happens. No sweeper exists (grep over `src`: no other `idempotencyKey.delete*`).
- Scenario: `POST /v1/senses/:id/sentences {text: "…private sentence…"}`, then `DELETE /v1/sentences/:id` (or `DELETE /v1/my-words/:id`).
  The `context_sentences` row is gone, but the full text stays in `idempotency_keys.response_body` with no end date. Design 7.4 says
  sentences are deleted with the word or the account (CR23 / B3E17). Only the owner can replay the row (the key is scoped by user), so
  this is retention, not a leak to other learners. It is still a copy of a context sentence that outlives its deletion. No other
  learner write returns private text: quick-add returns ids only and PATCH `/v1/my-words` returns 204.
- Test (`test/content/sentences.e2e-spec.ts`):
  ```ts
  it('7.4/CR23: a deleted sentence leaves no copy in idempotency_keys', async () => {
    const bank = await catalogSense('bank');
    const sentinel = `SENTINEL-${randomUUID()}`;
    const copies = async () => (await ctx.prisma.$queryRaw<Array<{ n: number }>>`
      SELECT count(*)::int AS n FROM idempotency_keys WHERE response_body::text LIKE ${'%' + sentinel + '%'}`)[0].n;
    const added = await add(bank, `The ${sentinel} sentence.`);
    expect(added.status).toBe(201);
    expect(await ctx.prisma.contextSentence.count({ where: { text: { contains: sentinel } } })).toBe(1); // control
    expect((await remove(added.body.id)).status).toBe(204);
    expect(await ctx.prisma.contextSentence.count({ where: { text: { contains: sentinel } } })).toBe(0);
    expect(await copies()).toBe(0); // currently 1
  });
  ```
  Fix options (owner decision): return only `{ id, created_at }` from the add route, or add a TTL sweeper for `idempotency_keys`. The
  account deletion in Bước 8 also has to clear these rows.

### L1 (low): `catalogMatch` (CR13) is computed but never reaches the learner — CONFIRMED-BY-READING

- `src/content/private/private-words.service.ts:158-162` computes `catalogMatch`. The only route that creates a private word, `POST /v1/quick-add`,
  drops it: `src/learning/quick-add/quick-add.service.ts:66-70` keeps only `.senseId`, and the response at `:76-79` has no
  `catalog_match`. That matches the plan's Task 16 response shape. So CR13's "gợi ý dùng bản catalog" can only happen before creation,
  through `/v1/lookup`. The match also ignores visibility: it would point to a catalog entry with no published sense, so if it is ever
  exposed it needs `visibleSenseCondition`.
- Decision for the owner: is the lookup-first suggestion enough for CR13? If yes, delete `catalogMatch`. If not, add `catalog_match` to
  the quick-add response, filtered to entries that have a visible sense.
- Test (if exposed): `test/learning/quick-add.e2e-spec.ts`: new_word `deploy/verb` next to a published catalog `deploy/verb` → 201 with
  `catalog_match.entry_id = <catalog id>`. Next to a catalog `deploy/verb` with no published sense → `catalog_match: null`.

### L2 (low): `addSentence` uses its own visibility rule instead of `visibleSenseCondition` — CONFIRMED-BY-READING

- `src/content/sentences/sentences.service.ts:32-35` (the `findFirst` with `OR`). The private branch is
  `{ entry: { scope: 'private', ownerUserId } }`: it does not check `state = 'open'` or `live_revision_id IS NOT NULL`. The single
  definition at `src/content/learner/visible-senses.ts:9-15` checks both for private senses, and `test/content/visible-senses.e2e-spec.ts:55-57`
  states that a retired private sense is "never shown, even to its owner". The plan (Task 6) says "sense must be visible to the user".
- Scenario: the owner's private sense with `state = 'retired'` or `'unpublished'` (stray data; no API retires a private sense) →
  `POST /v1/senses/:id/sentences` returns 201 instead of 404. No other learner is affected.
- Test (`test/content/sentences.e2e-spec.ts`): `const mine = await privateSense(aId, 'skrrt'); await ctx.prisma.sense.update({ where:
  { id: mine }, data: { state: 'retired' } }); expect((await add(mine, 'Stray.')).status).toBe(404);` (currently 201).
- Fix: use `visibleSenseCondition(Prisma.sql\`${senseId}::uuid\`, userId)`, which `visibleSenseIds` already wraps.

### L3 (low): staff can tell whether any sense id exists, via `replaces_sense_id` — CONFIRMED-BY-READING

- `src/content/senses/senses.service.ts:60-62`: `tx.sense.findUnique({ where: { id: input.replacesSenseId } })` has no catalog filter.
  A private sense id → `sense-entry-mismatch` (mapped to 400 in `admin-senses.controller.ts:28-35`). An unknown id → `not-found` (404).
  The entry itself is checked as catalog first (`admin-senses.controller.ts:41`), so nothing is written and no data comes back. Only the
  status code differs, and the caller must already hold a private sense UUID, which no staff route reveals.
- Test (`test/content/private-boundary.e2e-spec.ts`):
  ```ts
  const post = (replaces: string) => ctx.http().post('/v1/admin/content/senses').set('Authorization', `Bearer ${staffToken}`)
    .send({ entry_id: catalog.entryId, context_label: 'x', replaces_sense_id: replaces });
  const [priv, unknown] = [await post(mine.senseId), await post(randomUUID())];
  expect([priv.status, priv.body.type]).toEqual([unknown.status, unknown.body.type]); // currently 400 vs 404
  ```
  Fix: `findFirst({ where: { id, entry: { scope: 'catalog' } } })`.

### L4 (low): deleting a base entry leaves a half link (`form_kind` set, `form_of_entry_id` NULL) — CONFIRMED-BY-READING

- FK `sense_revisions_form_of_entry_id_fkey … ON DELETE SET NULL` (`prisma/migrations/20261017170000_entry_inflections/migration.sql`).
  There is no pairing CHECK, and adding one would make that SET NULL fail. `deletePrivateEntryContent`
  (`src/content/private/private-words.service.ts:197-203`) deletes the entry, and its own other words that point to it keep
  `form_kind = 'past'` with a NULL base. The readers ignore the half link: `revisionFormOf` (`senses/revision-content.ts:24-27`) and
  `words.service.ts:60-61` both require both columns. But the stored `content_hash` still includes `formOf`, so the next PATCH that
  repeats the same meaning publishes a needless new revision (`private-words.service.ts:188-191`).
  Only the same owner's words can point at a private entry (see "Checked" #4).
- Test (`test/content/private-words.e2e-spec.ts`):
  ```ts
  const base = await create(viId, { lemma: 'yeet' });
  const form = await create(viId, { lemma: 'yeetd', formOf: { entryId: base.entryId, kind: 'past' } });
  await tx((t) => content.deletePrivateEntryContent(t, viId, base.entryId));
  expect((await readEntry(form.entryId)).senses[0].revisions[0]).toMatchObject({ formOfEntryId: null, formKind: null }); // formKind is 'past' today
  ```
  Fix: in `deletePrivateEntryContent`, `updateMany({ where: { formOfEntryId: entryId }, data: { formOfEntryId: null, formKind: null } })`
  before the delete. The same applies to catalog revert.

### L5 (low): `entriesByForm` returns catalog entries that have no visible sense — CONFIRMED-BY-READING

- `src/content/inflections/inflections.service.ts:38-44` filters `entry: { OR: [{ scope: 'catalog' }, { scope: 'private', ownerUserId }] }`.
  It does not check for a published, open sense. Today the only caller, `/v1/lookup` (`words.service.ts:133-139`), drops a base whose
  visible senses are empty, so no route leaks anything. But `ContentService.entriesByForm` is exported (`content.service.ts:143`), and the plan's
  interface says "(visible entries only)". A future caller would return id, lemma and pos of unpublished catalog entries.
- Test (`test/content/inflections.e2e-spec.ts`): a catalog `deploy/verb` with no sense plus a library form `deployed/past` →
  `expect(await content.entriesByForm('deployed', randomUUID())).toEqual([])` (currently returns deploy). Owner decision: adopt that
  definition of "visible", or rename and document the method as "entries, not senses".

### L6 (low): adding a sentence while the private word is being deleted → 500 instead of 404 — SUSPECTED (timing)

- `POST /v1/senses/:id/sentences` takes only `content.sentences:<user>:<sense>` (`sentences.service.ts:37`). It takes neither the
  learner lock nor the owner lock that `DELETE /v1/my-words` holds (`quick-add.service.ts:86-87`, `private-words.service.ts:198`). If
  the visibility check (`:32`) runs before the delete commits, the insert's FK check waits on the deleted `senses` row and then fails
  with P2003. That error is not a `ContentRuleError`, so it surfaces as 500. It is a race with oneself (two devices); nothing is stored.
- Test (`test/content/sentences.e2e-spec.ts`): open a `$transaction` that calls `deletePrivateEntryContent(t, aId, entryId)` and then
  awaits a gate promise. Wait about 200 ms, fire `add(mine, 'Racing.')`, wait about 200 ms, release the gate. Expect the add to be 404
  (suspected 500).

---

## Answers to the ten questions

1. **Learner read paths: no leak found.** Every learner read goes through `visibleSenseCondition`: catalog and open with a live revision,
   or the caller's own private sense (`visible-senses.ts:9-15`). `senses()`, `wordPage`, `lookup`, `search` and `cardContent` all
   apply it (`words.service.ts:47,94,113,159`), and so do `visibleSenseIds` (`private-words.service.ts:206-212`) and the Learning queue
   and backlog (`queue.queries.ts:35,74`, `backlog.service.ts:53`).
   - `form_of` to another learner's entry: refused with 404, the same answer as a random id. The check runs before any write
     (`private-words.service.ts:126-129`). PATCH cannot set `form_of` (`PrivateWordPatch` has no such field). The CSV path accepts only
     catalog bases (`content-pipeline/import/row-processor.ts:139`), and the admin UI schema has no `form_of`
     (`senses/content-body.ts:10-14`). So the unfiltered `LEFT JOIN entries base` (`words.service.ts:86`) can only reach catalog
     entries, or the viewer's own private entries on the viewer's own senses.
   - `has_page`: the inner EXISTS applies `visible(viewerId)` to the inner `s` (`words.service.ts:111-114`), so another learner's
     private page never makes it true.
   - `has_private`: aggregated only over visible rows (`:179`). `mine=true` adds `scope = 'private'` on top of the visibility rule, so
     only the caller's own rows come back (`:163`).
   - Derived level: read only after the base passed the visibility check (`:153-156`).
   - `catalogMatch`: catalog only (L1).
   - `bulkCandidates`: catalog, open and live only (`:218-219`).
   - `entriesByForm`: catalog plus own private, never another learner's (see L5 for the catalog nuance).
   - Bước 2 routes `/v1/senses*`: `e.scope = 'catalog'` (`learner-content.service.ts:106`).
2. **Staff reads.**
   - Filtered directly: `catalogWhere` at `admin-catalog.queries.ts:34` covers listEntries `:211`, senseSelection `:250` (list, export
     and the publish snapshot), exportEntriesWithoutSense `:297`, getSense `:384` and latestRevisions `:392`.
   - Filtered by a catalog check before the transaction: writeEntry (`admin-entries.controller.ts:32`, `admin-senses.controller.ts:41`),
     writeSense → writeEntry (`admin-senses.controller.ts:52-54`), publish writeSense (`senses/publish.service.ts:79`, which covers
     publish, unpublish, retire and quick-publish), import sense lookup (`senses/import-content.ts:51`), resolveFormOf
     (`row-processor.ts:139`), revert groups (`catalog/revert.service.ts:52`) and backfill (`inflections-backfill.handler.ts:42`).
   - No filter, but reached only with ids or entries that are already catalog: `entries.service.ts:68,82`, `levels.service.ts:69`,
     `senses.service.ts:55,82,116`, `publish.service.ts:90,121`, `revert.service.ts:27-35`, and `resolveBatchRecordOwners`
     (`admin-catalog.queries.ts:368-376`, ids taken from `batch_records`, which only imports write).
   - The one unfiltered read that changes the answer: `senses.service.ts:60` (L3).
3. **`ON CONFLICT` on entries.** Exactly one, `entries.service.ts:49`, and it names `WHERE scope = 'catalog'`. No other insert into
   `entries` uses ON CONFLICT (private insert: `private-words.service.ts:137`, plain create). The grep also covered `test/` and `prisma/`.
4. **`createPrivateSense`.**
   - Lock: one per owner, `content.private:<ownerId>` (`:78-80`), taken before the existence check and before the COUNT (`:131-137`).
     Two concurrent creates of different lemmas at 999 therefore serialize; under READ COMMITTED the second statement sees the first's
     commit, so it gets the 409 and the total stays at 1,000. This is broader than the plan's per-lemma key, so it is safe.
     `quick-add` also takes `learning.user:<id>` first (`quick-add.service.ts:61`).
   - `p2`/`p3` labels: computed under the same lock (`:143-146`), so there is no race.
   - Text checks: NFC + trim + whitespace collapse first, then the code-point count (`:38-47`). The zod schemas use
     `.refine([...v].length)` after `transform(normalizeText)` and no UTF-16 `.max()` (`my-words.schemas.ts:6-7`,
     `quick-add.controller.ts:14-15`, `words.schemas.ts:6-7,17`).
   - `pos` null → `'unspecified'` (`:48-49`). The DB allows it only for private rows (migration `20261017180000`).
   - `formOf`: the base must be catalog or the caller's own private entry. It does not have to be catalog, and the plan does not require
     that.
   - Derived level: only when no level is given and the entry has none yet.
5. **`updatePrivateWord`.**
   - Ownership: `scope = 'private' AND owner = caller`, else 404 (`:113-117`).
   - A `sense_id` that is not one of this entry's senses → 404 (`:183`). Because the whole PATCH runs in one `$transaction`, an
     earlier lemma change in the same request rolls back.
   - A lemma/pos clash → `private-word-exists` under the owner lock (`:171-172`).
   - Old revision: published → superseded, and the new revision becomes live (`:103-110`).
   - Inflections are regenerated when the lemma or pos changes (`:174-176`).
6. **`deletePrivateEntryContent`.**
   - Cascades: senses, revisions and texts via the sense cascade; levels, variants and inflections via entry FK cascade;
     `context_sentences` via the sense FK cascade. `senses.live_revision_id` has no FK, so the cascade is not blocked, and private
     senses never have `replaces_sense_id`, so its RESTRICT does not apply.
   - It returns `senseIds` read before the delete (`:200`).
   - Other revisions that point at the entry: SET NULL, no failure (L4).
7. **Sentences.**
   - Limit: the advisory lock on (user, sense) is taken before the COUNT (`sentences.service.ts:37-40`), so four existing plus two
     concurrent adds ends at 5. Covered by `sentences.e2e-spec.ts:87-93`.
   - Visibility: L2.
   - Delete: `deleteMany({ id, userId })` (`:60`).
   - Logs: only ids (`:44,61`). The logger serializes errors as name and code only (`common/logging/app-logger.ts:19-27`), and the
     problem filter does not log.
   - Length: code points after NFC (`:29-30`).
   - Storage: M1.
8. **Word search.**
   - LIKE escaping: `%`, `_` and `\` are escaped, with `ESCAPE '\'` (`words.service.ts:153-157`).
   - Page tokens: bound to the route, viewer, q, level, topic, pos and `mine` (`:145-146`), and checked by `decodeBoundToken`.
   - D42 case rules:
     - `GET /v1/words`: one row per exact lemma (`GROUP BY lemma`, `:179-182`), ordered `rank, lemma COLLATE "C"` with a matching
       keyset.
     - `/v1/words/:lemma`: exact match on `e.lemma = $1` (`:107`).
     - Search and lookup ignore case: `lower()` on the lemma and the q, and ILIKE.
   - Length of `q`: 1..100 code points after NFC and lower-casing (`words.schemas.ts:6-7`).
   - Level filter: uses the displayed level, and that level includes `derived` rows (`:36-44`, `:160`).
9. **Migrations.**
   - Tasks 3 and 5: the scope CHECK, the scope↔owner CHECK, both partial unique indexes, and the pos, basis and `draft_source` CHECKs
     all match the plan.
   - Inflections table: kind and source CHECKs, unique `(entry_id, form, kind)`, the `form_key` index and the cascade FK.
     `form_kind` has a CHECK. `context_sentences` has its index and cascade FK.
   - Prisma ↔ SQL: `test/common/schema-drift.e2e-spec.ts` asserts that `migrate diff` is empty.
   - Not present and not required by the plan: a pairing CHECK between `form_of_entry_id` and `form_kind` (see L4), a DB length
     CHECK on `context_sentences.text`, and a DB guard that a catalog revision's `form_of_entry_id` is catalog (only app code
     enforces that).
10. **Test gaps.** Each is low severity, a missing clause rather than a wrong assertion:
    - **B3E12** (`private-words.e2e-spec.ts:91-105`):
      - It is service-only. No test of `POST /v1/quick-add` → 409 `private-word-limit-reached` with nothing stored.
      - No concurrency test: two concurrent new words at 999 → one 201, one 409, and `count = 1000`.
      - "Adding a catalog word still works" is tested as a *staff* `createSense` (`:103`). It should be the learner's quick-add with
        `sense_id` at the limit.
    - **CR13**: service-only (L1).
    - **B3#12 words** (`words.e2e-spec.ts:185-204`):
      - No `has_page` privacy test: catalog `go` with form `went` plus A's private `went` → B's `/v1/words/go` shows went
        `has_page: false`, A's shows `true`.
      - No test of B's page for a lemma that exists both in the catalog and as A's private word: only catalog senses, and no
        `has_private` on the search row. `:182` covers search only.
    - **B3#12 form_of over HTTP**: no quick-add test with `form_of.entry_id` set to another learner's private entry (expect 404 and
      `stored(me)` unchanged). The service test (`private-words.e2e-spec.ts:213-214`) does not read state back.
    - **PATCH with a foreign `sense_id`** (`private-words.e2e-spec.ts:156`): status only. It should read back, and a combined
      `{ lemma, senses: [foreign] }` request should be shown to roll back the lemma.
    - **SR10** (`sentences.e2e-spec.ts:118-129`): success paths only. It does not cover the refused paths (400, 404, 409) or the
      sentence sent through quick-add. It also cannot catch M1, which is DB storage, not a log.
    - **Review Focus 3**:
      - The lemma limit of 100 code points with an emoji is not accepted-tested; only `'a'×101 → 400` is.
      - No NFD input whose raw code-point count is above 300 but whose NFC form is ≤ 300 (it should be accepted).
    - **D42**: `GET /v1/words?q=MARCH` (upper case) is not tested.
    - **B3E13**: it checks base lemma and kind, but not that each `via_inflection` entry carries that base's senses.
    - **B2#69 staff writes on private ids** (`private-boundary.e2e-spec.ts:156-168`): only publish, unpublish and the editorial level
      are tested. Retire, quick-publish, `PUT …/draft`, review, variants and function-word are not. They share writeSense and
      writeEntry, so the risk is low.

---

## Checked, no issue

1. The visibility rule is defined once (`src/content/learner/visible-senses.ts:9-15`). It is used by `words.service.ts:47`,
   `private-words.service.ts:210`, `learning/queue/queue.queries.ts:35,74` and `learning/backlog/backlog.service.ts:53`. Learning
   never queries Content tables itself (grep over `src/learning`, `src/notifications`).
2. Word page `src/content/words/words.service.ts:106-127`:
   - Senses are visibility-filtered with an exact lemma match.
   - Inflections come only from entries that have visible senses (`:109-116`).
   - `has_page` is visibility-filtered (`:111-114`).
   - 404 when nothing is visible, the same answer for another learner's private lemma as for an unknown one.
   - Private `context_label` values are hidden (`:56`).
3. Lookup `words.service.ts:130-141`: the lemma or variant match is parenthesized inside the visibility AND. `via_inflection` keeps
   only bases that have visible senses.
4. Every path that sets `form_of`: `private-words.service.ts:126-129` (catalog or own), `row-processor.ts:135-143` (catalog only),
   `senses/content-body.ts:10-24` (the admin API cannot set it), and revert only restores existing revisions.
5. Search `words.service.ts:144-195`: visibility filter, `mine`, `has_private`, escaping, bound tokens, case rules and the
   displayed-level filter.
6. `visibleSenseIds` (`private-words.service.ts:206-212`) and `bulkCandidates` (`:215-243`) are catalog or own only, and catalog only,
   with the K11 count. The `sense_ids` input is validated as uuids (`learning/items/items.schemas.ts:16`).
7. Ownership: `ownedEntry` (`private-words.service.ts:113-117`) for PATCH and delete. `deleteSentence` checks `userId`
   (`sentences.service.ts:60`). Every miss maps to 404 `not-found`, never 403 (`my-words.controller.ts:19-27`,
   `sentences.controller.ts:43-49`, `quick-add.service.ts:28-36`).
8. Quick-add: `sense_id` visibility is checked, and the group is checked to be the caller's, before the 404
   (`quick-add.service.ts:55-58`). Everything else runs in one transaction with the lock order learner → owner → sentence, the same
   order as `deleteMyWord`, so the two cannot deadlock.
9. 1,000 cap: the per-owner lock covers the COUNT (`private-words.service.ts:124,131-137`). The DB backstop is `entries_private_key`.
10. The sentence cap of 5 per (user, sense) holds under concurrency (`sentences.service.ts:37-40`), and the test covers it.
11. Staff catalog boundary: see answer 2. Covered by tests `private-boundary.e2e-spec.ts:129-168,184-192`.
12. `ensureEntry` ON CONFLICT predicate and `findFirstOrThrow({ scope: 'catalog' })` (`catalog/entries.service.ts:46-52`), including
    the race test without the lock (`private-boundary.e2e-spec.ts:204-207`).
13. Migrations `20261017160000`, `20261017170000`, `20261017180000` and `20261017190000` match plan Tasks 3, 4, 5 and 6. Schema
    tests: `test/content/schema.e2e-spec.ts` (scope, owner and key CHECKs, with a read-back) and `inflections.e2e-spec.ts:111-132`.
14. No UTF-16 `.max()` on any learner text field. The code-point count runs after NFC everywhere (answer 4). The NFD fixtures in the
    tests really are NFD: checked bytes `cc 83`, `cc 81` in `private-words.e2e-spec.ts:193-194` and `sentences.e2e-spec.ts:139`.
15. Learner guard: `@LearnerContent()` on the words, my-words and sentences controllers. Every new write route has
    `@Idempotent()`, `IdempotencyInterceptor` and `@RateLimit('user.write')`.

## Open questions (design, not defects)

- **B3E14 for the pilot catalog:** `/v1/lookup` suggests a base only if that base has a visible sense (`words.service.ts:139`). Most of
  the 7,799 CEFR-J entries have no sense yet. So typing `deployed` while `deploy` has no published sense gives no suggestion and no
  pre-filled "quá khứ của deploy" link, and it behaves like B3E15. Should a base with forms but no page still be suggested, with the
  link only and no senses to pick? Today `createPrivateSense` would accept such a base.
- **Senses per private entry have no cap.** The 1,000 limit counts entries (design 5.2). The same lemma/pos can take any number of
  meanings (`p2 … pN`, `private-words.service.ts:143-147`), bounded only by `user.write` 30/60 s. Should there be a per-entry limit
  for Bước 5's quotas?
